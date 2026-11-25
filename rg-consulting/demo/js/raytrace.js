// RG CAD Foto-Modus mit echtem Raytracing (Pfadverfolgung) im Browser.
// Die Szene (alle sichtbaren Bauteile, Griffe, Auszüge) wird als Dreiecke gesammelt, in einer
// Hüllkörper-Hierarchie (BVH) abgelegt und in mehreren Web-Workern Bild für Bild verfeinert:
// weiche Schatten, Licht, das zwischen den Flächen hin und her springt, Glanz auf Lack und Metall.
// Kein Server nötig; das Bild wird mit jedem Durchgang ruhiger.
(function (global) {
  "use strict";

  // ---------- Worker: läuft in eigenen Threads ----------
  function workerMain() {
    let T = null;          // Dreiecke (BVH-Reihenfolge)
    let N = null;          // Knoten
    let M = null, TX = null, C = null, L = null;
    let W = 0, H = 0, rows = null, seed = 1;

    function rnd() { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; }

    function build(pos, nrm, uv, mat) {
      const n = mat.length;
      const cx = new Float32Array(n), cy = new Float32Array(n), cz = new Float32Array(n);
      const bb = new Float32Array(n * 6);
      for (let i = 0; i < n; i++) {
        const o = i * 9;
        let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
        for (let k = 0; k < 3; k++) {
          const x = pos[o + k * 3], y = pos[o + k * 3 + 1], z = pos[o + k * 3 + 2];
          if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; if (z < z0) z0 = z; if (z > z1) z1 = z;
        }
        bb.set([x0, y0, z0, x1, y1, z1], i * 6);
        cx[i] = (x0 + x1) / 2; cy[i] = (y0 + y1) / 2; cz[i] = (z0 + z1) / 2;
      }
      const idx = new Int32Array(n); for (let i = 0; i < n; i++) idx[i] = i;
      const maxN = Math.max(1, 2 * n);
      const nb = new Float32Array(maxN * 6), nl = new Int32Array(maxN), nc = new Int32Array(maxN), nr = new Int32Array(maxN);
      let cnt = 0;
      const stack = [[0, n, cnt++]];
      while (stack.length) {
        const s = stack.pop(), a = s[0], b = s[1], ni = s[2];
        let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
        let mx0 = Infinity, my0 = Infinity, mz0 = Infinity, mx1 = -Infinity, my1 = -Infinity, mz1 = -Infinity;
        for (let i = a; i < b; i++) {
          const t = idx[i], o = t * 6;
          if (bb[o] < x0) x0 = bb[o]; if (bb[o + 1] < y0) y0 = bb[o + 1]; if (bb[o + 2] < z0) z0 = bb[o + 2];
          if (bb[o + 3] > x1) x1 = bb[o + 3]; if (bb[o + 4] > y1) y1 = bb[o + 4]; if (bb[o + 5] > z1) z1 = bb[o + 5];
          if (cx[t] < mx0) mx0 = cx[t]; if (cx[t] > mx1) mx1 = cx[t];
          if (cy[t] < my0) my0 = cy[t]; if (cy[t] > my1) my1 = cy[t];
          if (cz[t] < mz0) mz0 = cz[t]; if (cz[t] > mz1) mz1 = cz[t];
        }
        nb.set([x0, y0, z0, x1, y1, z1], ni * 6);
        const count = b - a;
        if (count <= 4) { nl[ni] = a; nc[ni] = count; continue; }
        const ex = mx1 - mx0, ey = my1 - my0, ez = mz1 - mz0;
        const C2 = ex >= ey && ex >= ez ? cx : (ey >= ez ? cy : cz);
        const mid = ex >= ey && ex >= ez ? (mx0 + mx1) / 2 : (ey >= ez ? (my0 + my1) / 2 : (mz0 + mz1) / 2);
        let i = a, j = b - 1;
        while (i <= j) { if (C2[idx[i]] < mid) i++; else { const t = idx[i]; idx[i] = idx[j]; idx[j] = t; j--; } }
        let m = i;
        if (m === a || m === b) {   // alle Mittelpunkte gleich: nach Median teilen
          const part = Array.prototype.slice.call(idx, a, b).sort(function (p, q) { return C2[p] - C2[q]; });
          for (let k = 0; k < part.length; k++) idx[a + k] = part[k];
          m = (a + b) >> 1;
        }
        const l = cnt++, r = cnt++;
        nl[ni] = l; nr[ni] = r; nc[ni] = 0;
        stack.push([a, m, l]); stack.push([m, b, r]);
      }
      // Dreiecke in BVH-Reihenfolge: v0, e1, e2, Normalen, UV, Material
      const v = new Float32Array(n * 9), nn = new Float32Array(n * 9), uu = new Float32Array(n * 6), mm = new Uint16Array(n);
      for (let k = 0; k < n; k++) {
        const t = idx[k], o = t * 9, q = k * 9;
        v[q] = pos[o]; v[q + 1] = pos[o + 1]; v[q + 2] = pos[o + 2];
        v[q + 3] = pos[o + 3] - pos[o]; v[q + 4] = pos[o + 4] - pos[o + 1]; v[q + 5] = pos[o + 5] - pos[o + 2];
        v[q + 6] = pos[o + 6] - pos[o]; v[q + 7] = pos[o + 7] - pos[o + 1]; v[q + 8] = pos[o + 8] - pos[o + 2];
        for (let c = 0; c < 9; c++) nn[q + c] = nrm[o + c];
        for (let c = 0; c < 6; c++) uu[k * 6 + c] = uv[t * 6 + c];
        mm[k] = mat[t];
      }
      T = { v: v, n: nn, uv: uu, m: mm };
      N = { b: nb, l: nl, c: nc, r: nr };
    }

    const stk = new Int32Array(128);
    let hT = 0, hU = 0, hV = 0, hI = -1;
    function intersect(ox, oy, oz, dx, dy, dz, tmax, any) {
      const ix = 1 / dx, iy = 1 / dy, iz = 1 / dz;
      const v = T.v, nb = N.b, nl = N.l, nc = N.c, nr = N.r;
      let sp = 0; stk[sp++] = 0; hI = -1; hT = tmax;
      while (sp) {
        const ni = stk[--sp], o = ni * 6;
        let t0 = (nb[o] - ox) * ix, t1 = (nb[o + 3] - ox) * ix;
        let tmin = t0 < t1 ? t0 : t1, tmx = t0 < t1 ? t1 : t0;
        t0 = (nb[o + 1] - oy) * iy; t1 = (nb[o + 4] - oy) * iy;
        let a = t0 < t1 ? t0 : t1, b = t0 < t1 ? t1 : t0; if (a > tmin) tmin = a; if (b < tmx) tmx = b;
        t0 = (nb[o + 2] - oz) * iz; t1 = (nb[o + 5] - oz) * iz;
        a = t0 < t1 ? t0 : t1; b = t0 < t1 ? t1 : t0; if (a > tmin) tmin = a; if (b < tmx) tmx = b;
        if (tmx < 0 || tmin > tmx || tmin > hT) continue;
        const c = nc[ni];
        if (c === 0) { stk[sp++] = nl[ni]; stk[sp++] = nr[ni]; continue; }
        for (let k = nl[ni], e = nl[ni] + c; k < e; k++) {
          const q = k * 9;
          const e1x = v[q + 3], e1y = v[q + 4], e1z = v[q + 5], e2x = v[q + 6], e2y = v[q + 7], e2z = v[q + 8];
          const px = dy * e2z - dz * e2y, py = dz * e2x - dx * e2z, pz = dx * e2y - dy * e2x;
          const det = e1x * px + e1y * py + e1z * pz;
          if (det > -1e-12 && det < 1e-12) continue;
          const inv = 1 / det;
          const sx = ox - v[q], sy = oy - v[q + 1], sz = oz - v[q + 2];
          const u = (sx * px + sy * py + sz * pz) * inv; if (u < 0 || u > 1) continue;
          const qx = sy * e1z - sz * e1y, qy = sz * e1x - sx * e1z, qz = sx * e1y - sy * e1x;
          const w = (dx * qx + dy * qy + dz * qz) * inv; if (w < 0 || u + w > 1) continue;
          const t = (e2x * qx + e2y * qy + e2z * qz) * inv;
          if (t > 1e-5 && t < hT) { hT = t; hU = u; hV = w; hI = k; if (any) return true; }
        }
      }
      return hI >= 0;
    }

    // Textur lesen (bilinear, Wiederholung wie in three.js, Bild mit flipY)
    function tex(ti, u, v, out) {
      const t = TX[ti], w = t.w, h = t.h, d = t.lin;
      function wrap(x, mode) {
        if (mode === 1002) { const f = x - 2 * Math.floor(x / 2); return f > 1 ? 2 - f : f; }
        if (mode === 1001) return x < 0 ? 0 : (x > 1 ? 1 : x);
        return x - Math.floor(x);
      }
      const fx = wrap(u, t.ws) * w - 0.5, fy = (1 - wrap(v, t.wt)) * h - 0.5;
      let x0 = Math.floor(fx), y0 = Math.floor(fy); const ax = fx - x0, ay = fy - y0;
      let x1 = x0 + 1, y1 = y0 + 1;
      x0 = (x0 % w + w) % w; x1 = (x1 % w + w) % w; y0 = (y0 % h + h) % h; y1 = (y1 % h + h) % h;
      const i00 = (y0 * w + x0) * 3, i10 = (y0 * w + x1) * 3, i01 = (y1 * w + x0) * 3, i11 = (y1 * w + x1) * 3;
      for (let c = 0; c < 3; c++) {
        out[c] = (d[i00 + c] * (1 - ax) + d[i10 + c] * ax) * (1 - ay) + (d[i01 + c] * (1 - ax) + d[i11 + c] * ax) * ay;
      }
    }

    function env(dx, dy, dz) {
      const y = dy > 0 ? dy : 0;
      const k = L.sky * (0.62 + 0.38 * y);
      return k;
    }

    const base = [0, 0, 0];
    // Ein Pfad ab der Kamera; liefert Farbe in rgb (linear)
    function trace(ox, oy, oz, dx, dy, dz, rgb) {
      let tr = 1, tg = 1, tb = 1, lr = 0, lg = 0, lb = 0, spec = true;
      const sx = L.sun[0], sy = L.sun[1], sz = L.sun[2];
      for (let depth = 0; depth < 5; depth++) {
        const hit = intersect(ox, oy, oz, dx, dy, dz, 1e9, false);
        let tg0 = dy < 0 ? -oy / dy : Infinity;
        if (tg0 < 1e-5) tg0 = Infinity;
        if (!hit && tg0 === Infinity) {
          if (depth === 0) { rgb[0] = L.bg[0]; rgb[1] = L.bg[1]; rgb[2] = L.bg[2]; return 1; }
          let e = env(dx, dy, dz);
          let sr = e, sg = e * 0.985, sb = e * 0.96;
          if (spec && dx * sx + dy * sy + dz * sz > L.cosSun) { sr += L.sunRad; sg += L.sunRad * 0.97; sb += L.sunRad * 0.92; }
          lr += tr * sr; lg += tg * sg; lb += tb * sb; break;
        }
        if (!hit || tg0 < hT) {
          // Boden
          const px = ox + dx * tg0, pz = oz + dz * tg0;
          if (depth === 0) {
            // Schattenfänger: Bodenfarbe = Hintergrund mal Anteil des Lichts, das ankommt
            const jx = (rnd() * 2 - 1) * L.sunSpread, jz = (rnd() * 2 - 1) * L.sunSpread;
            let qx = sx + jx, qy = sy, qz = sz + jz; const ql = Math.hypot(qx, qy, qz); qx /= ql; qy /= ql; qz /= ql;
            const visS = intersect(px, 1e-4, pz, qx, qy, qz, 1e9, true) ? 0 : 1;
            const r1 = rnd(), r2 = rnd(), rr = Math.sqrt(r1), ph = 6.2831853 * r2;
            const wx = rr * Math.cos(ph), wz = rr * Math.sin(ph), wy = Math.sqrt(1 - r1);
            const visK = intersect(px, 1e-4, pz, wx, wy, wz, 1e9, true) ? 0 : 1;
            const dS = L.sunE * qy, dK = Math.PI * env(wx, wy, wz);
            const f = (dS * visS + dK * visK) / (dS + dK);
            rgb[0] = L.bg[0] * f; rgb[1] = L.bg[1] * f; rgb[2] = L.bg[2] * f; return 1;
          }
          const visS = intersect(px, 1e-4, pz, sx, sy, sz, 1e9, true) ? 0 : 1;
          const g = L.ground * (L.sunE * sy * visS / Math.PI + L.sky * 0.8);
          lr += tr * g * L.bg[0]; lg += tg * g * L.bg[1]; lb += tb * g * L.bg[2]; break;
        }
        // Bauteil getroffen
        const k = hI, q = k * 9, u = hU, v = hV, w0 = 1 - u - v;
        const nn = T.n;
        let nx = nn[q] * w0 + nn[q + 3] * u + nn[q + 6] * v;
        let ny = nn[q + 1] * w0 + nn[q + 4] * u + nn[q + 7] * v;
        let nz = nn[q + 2] * w0 + nn[q + 5] * u + nn[q + 8] * v;
        let nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
        if (nx * dx + ny * dy + nz * dz > 0) { nx = -nx; ny = -ny; nz = -nz; }
        const hx = ox + dx * hT + nx * 2e-5, hy = oy + dy * hT + ny * 2e-5, hz = oz + dz * hT + nz * 2e-5;
        const mat = M[T.m[k]];
        base[0] = mat.c[0]; base[1] = mat.c[1]; base[2] = mat.c[2];
        if (mat.t >= 0) {
          const o6 = k * 6, uv = T.uv;
          const tu = uv[o6] * w0 + uv[o6 + 2] * u + uv[o6 + 4] * v;
          const tv = uv[o6 + 1] * w0 + uv[o6 + 3] * u + uv[o6 + 5] * v;
          const e = mat.m3;   // three.js uvTransform (spaltenweise)
          const uu = e[0] * tu + e[3] * tv + e[6], vv = e[1] * tu + e[4] * tv + e[7];
          const tc = [0, 0, 0]; tex(mat.t, uu, vv, tc);
          base[0] *= tc[0]; base[1] *= tc[1]; base[2] *= tc[2];
        }
        const cosI = -(nx * dx + ny * dy + nz * dz);
        let rx = dx + 2 * cosI * nx, ry = dy + 2 * cosI * ny, rz = dz + 2 * cosI * nz;
        if (mat.metal > 0.5) {
          // Metall: unscharfe Spiegelung in Materialfarbe
          const r = mat.rough * mat.rough;
          rx += (rnd() * 2 - 1) * r; ry += (rnd() * 2 - 1) * r; rz += (rnd() * 2 - 1) * r;
          const l2 = Math.hypot(rx, ry, rz); rx /= l2; ry /= l2; rz /= l2;
          if (rx * nx + ry * ny + rz * nz <= 0) { rx = dx + 2 * cosI * nx; ry = dy + 2 * cosI * ny; rz = dz + 2 * cosI * nz; }
          tr *= base[0]; tg *= base[1]; tb *= base[2];
          ox = hx; oy = hy; oz = hz; dx = rx; dy = ry; dz = rz; spec = true;
          continue;
        }
        // Holz / Lack: Glanzschicht (Fresnel) über diffuser Farbe
        const fr = mat.coat * (0.04 + 0.96 * Math.pow(1 - Math.max(0, cosI), 5));
        if (rnd() < fr) {
          const r = mat.gloss;
          rx += (rnd() * 2 - 1) * r; ry += (rnd() * 2 - 1) * r; rz += (rnd() * 2 - 1) * r;
          const l2 = Math.hypot(rx, ry, rz); rx /= l2; ry /= l2; rz /= l2;
          if (rx * nx + ry * ny + rz * nz <= 0) break;
          ox = hx; oy = hy; oz = hz; dx = rx; dy = ry; dz = rz; spec = true;
          continue;
        }
        // Direktes Sonnenlicht mit weichem Schatten
        const ndl0 = nx * sx + ny * sy + nz * sz;
        if (ndl0 > 0) {
          const jx = (rnd() * 2 - 1) * L.sunSpread, jy = (rnd() * 2 - 1) * L.sunSpread, jz = (rnd() * 2 - 1) * L.sunSpread;
          let qx = sx + jx, qy = sy + jy, qz = sz + jz; const ql = Math.hypot(qx, qy, qz); qx /= ql; qy /= ql; qz /= ql;
          const ndl = nx * qx + ny * qy + nz * qz;
          if (ndl > 0 && !intersect(hx, hy, hz, qx, qy, qz, 1e9, true)) {
            const e = L.sunE * ndl / Math.PI;
            lr += tr * base[0] * e; lg += tg * base[1] * e * 0.98; lb += tb * base[2] * e * 0.94;
          }
        }
        // Weiter in zufällige Richtung (kosinusgewichtet)
        tr *= base[0]; tg *= base[1]; tb *= base[2];
        if (depth >= 2) { const p = Math.max(tr, tg, tb); if (rnd() > p) break; tr /= p; tg /= p; tb /= p; }
        const r1 = rnd(), r2 = rnd(), rr = Math.sqrt(r1), ph = 6.2831853 * r2;
        const lx = rr * Math.cos(ph), ly = rr * Math.sin(ph), lz = Math.sqrt(1 - r1);
        // Basis um die Normale
        let ax = Math.abs(nx) > 0.9 ? 0 : 1, ay = Math.abs(nx) > 0.9 ? 1 : 0, az = 0;
        let bx = ay * nz - az * ny, by = az * nx - ax * nz, bz = ax * ny - ay * nx;
        const bl = Math.hypot(bx, by, bz); bx /= bl; by /= bl; bz /= bl;
        const cx2 = ny * bz - nz * by, cy2 = nz * bx - nx * bz, cz2 = nx * by - ny * bx;
        dx = bx * lx + cx2 * ly + nx * lz; dy = by * lx + cy2 * ly + ny * lz; dz = bz * lx + cz2 * ly + nz * lz;
        ox = hx; oy = hy; oz = hz; spec = false;
      }
      rgb[0] = lr; rgb[1] = lg; rgb[2] = lb; return 0;
    }

    self.onmessage = function (e) {
      const m = e.data;
      if (m.type === "init") {
        M = m.mats; TX = m.texs; C = m.cam; L = m.light; W = m.W; H = m.H; rows = m.rows; seed = (m.seed | 0) || 7;
        TX.forEach(function (t) {
          const lin = new Float32Array(t.w * t.h * 3), lut = new Float32Array(256);
          for (let i = 0; i < 256; i++) { const c = i / 255; lut[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
          for (let i = 0, j = 0; i < t.w * t.h; i++, j += 4) { lin[i * 3] = lut[t.d[j]]; lin[i * 3 + 1] = lut[t.d[j + 1]]; lin[i * 3 + 2] = lut[t.d[j + 2]]; }
          t.lin = lin; t.d = null;
        });
        build(m.pos, m.nrm, m.uv, m.mat);
        self.postMessage({ type: "ready" });
        return;
      }
      if (m.type === "pass") {
        const out = new Float32Array(rows.length * W * 3), rgb = [0, 0, 0];
        const cp = C.pos, cr = C.right, cu = C.up, cf = C.fwd;
        for (let ri = 0; ri < rows.length; ri++) {
          const y = rows[ri];
          for (let x = 0; x < W; x++) {
            const sx = ((x + rnd()) / W * 2 - 1) * C.tx, sy = (1 - (y + rnd()) / H * 2) * C.ty;
            let dx = cf[0] + cr[0] * sx + cu[0] * sy, dy = cf[1] + cr[1] * sx + cu[1] * sy, dz = cf[2] + cr[2] * sx + cu[2] * sy;
            const l = Math.hypot(dx, dy, dz); dx /= l; dy /= l; dz /= l;
            trace(cp[0], cp[1], cp[2], dx, dy, dz, rgb);
            const o = (ri * W + x) * 3;
            // Ausreisser dämpfen (einzelne helle Pixel)
            const mx = Math.max(rgb[0], rgb[1], rgb[2]); const f = mx > 6 ? 6 / mx : 1;
            out[o] = rgb[0] * f; out[o + 1] = rgb[1] * f; out[o + 2] = rgb[2] * f;
          }
        }
        self.postMessage({ type: "pass", data: out }, [out.buffer]);
      }
    };
  }

  // ---------- Hauptthread: Szene sammeln ----------
  function texData(img, cache) {
    if (cache.has(img)) return cache.get(img);
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    if (!iw || !ih) { cache.set(img, -1); return -1; }
    const s = Math.min(1, 1024 / Math.max(iw, ih));
    const w = Math.max(1, Math.round(iw * s)), h = Math.max(1, Math.round(ih * s));
    const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    const cx = cv.getContext("2d"); cx.drawImage(img, 0, 0, w, h);
    let d;
    try { d = cx.getImageData(0, 0, w, h).data; } catch (e) { cache.set(img, -1); return -1; }
    const entry = { w: w, h: h, d: d };
    cache.list.push(entry);
    const id = cache.list.length - 1; cache.set(img, id);
    return id;
  }

  function collect(viewer) {
    const THREE = viewer.THREE || global.THREE;
    viewer.render();
    viewer.scene.updateMatrixWorld(true);
    const pos = [], nrm = [], uvs = [], mid = [], mats = [];
    const texCache = new Map(); texCache.list = [];
    const matIndex = new Map();
    const v = new THREE.Vector3(), nm = new THREE.Matrix3();
    function visible(o) { for (let p = o; p; p = p.parent) { if (!p.visible) return false; } return true; }
    function matId(mat, mesh) {
      if (matIndex.has(mat)) return matIndex.get(mat);
      const c = mat.color ? [mat.color.r, mat.color.g, mat.color.b] : [0.8, 0.8, 0.8];
      let t = -1, m3 = [1, 0, 0, 0, 1, 0, 0, 0, 1], ws = 1000, wt = 1000;
      if (mat.map && mat.map.image) {
        const id = texData(mat.map.image, texCache);
        if (id >= 0) {
          t = id; mat.map.updateMatrix(); m3 = Array.from(mat.map.matrix.elements);
          ws = mat.map.wrapS; wt = mat.map.wrapT;
          texCache.list[id].ws = ws; texCache.list[id].wt = wt;
        }
      }
      const metal = mat.metalness || 0, rough = mat.roughness == null ? 0.6 : mat.roughness;
      const entry = { c: c, t: t, m3: m3, metal: metal, rough: Math.max(0.05, rough),
        coat: metal > 0.5 ? 0 : (rough < 0.5 ? 1 : 0.6), gloss: 0.08 + rough * 0.35 };
      mats.push(entry); const id = mats.length - 1; matIndex.set(mat, id); return id;
    }
    function addMesh(mesh) {
      const g = mesh.geometry; if (!g || !g.attributes || !g.attributes.position) return;
      const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      if (!mat || mat.visible === false || mat.isShadowMaterial || (mat.transparent && mat.opacity < 0.5)) return;
      const P = g.attributes.position, Nn = g.attributes.normal, U = g.attributes.uv, I = g.index;
      const mw = mesh.matrixWorld; nm.getNormalMatrix(mw);
      const id = matId(mat, mesh);
      const cnt = I ? I.count : P.count;
      for (let i = 0; i < cnt; i += 3) {
        for (let k = 0; k < 3; k++) {
          const vi = I ? I.getX(i + k) : i + k;
          v.set(P.getX(vi), P.getY(vi), P.getZ(vi)).applyMatrix4(mw); pos.push(v.x, v.y, v.z);
          if (Nn) { v.set(Nn.getX(vi), Nn.getY(vi), Nn.getZ(vi)).applyMatrix3(nm).normalize(); nrm.push(v.x, v.y, v.z); } else nrm.push(0, 0, 0);
          if (U) uvs.push(U.getX(vi), U.getY(vi)); else uvs.push(0, 0);
        }
        if (!Nn) {   // flache Normale nachtragen
          const o = pos.length - 9;
          const ax = pos[o + 3] - pos[o], ay = pos[o + 4] - pos[o + 1], az = pos[o + 5] - pos[o + 2];
          const bx = pos[o + 6] - pos[o], by = pos[o + 7] - pos[o + 1], bz = pos[o + 8] - pos[o + 2];
          let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx; const l = Math.hypot(nx, ny, nz) || 1;
          for (let k = 0; k < 3; k++) { nrm[o + k * 3] = nx / l; nrm[o + k * 3 + 1] = ny / l; nrm[o + k * 3 + 2] = nz / l; }
        }
        mid.push(id);
      }
    }
    [viewer.modelGroup, viewer.bodyGroup].forEach(function (grp) {
      if (!grp) return;
      grp.traverse(function (o) { if (o.isMesh && visible(o)) addMesh(o); });
    });
    return { pos: new Float32Array(pos), nrm: new Float32Array(nrm), uv: new Float32Array(uvs), mat: new Uint16Array(mid), mats: mats, texs: texCache.list };
  }

  function cameraData(viewer, W, H) {
    const cam = viewer.camera, e = cam.matrixWorld.elements;
    const ty = Math.tan(cam.fov * Math.PI / 360), tx = ty * W / H;
    return { pos: [e[12], e[13], e[14]], right: [e[0], e[1], e[2]], up: [e[4], e[5], e[6]], fwd: [-e[8], -e[9], -e[10]], tx: tx, ty: ty };
  }

  function lightData(cam) {
    // Sonne von vorne links oben, aus Sicht der Kamera: Schatten fällt nach hinten rechts
    const r = cam.right, f = cam.fwd;
    let sx = -r[0] * 0.55 - f[0] * 0.75, sz = -r[2] * 0.55 - f[2] * 0.75;
    const hl = Math.hypot(sx, sz) || 1; sx /= hl; sz /= hl;
    const el = 0.95;   // Höhe
    let s = [sx * Math.cos(el), Math.sin(el), sz * Math.cos(el)];
    const cone = 0.035;
    function lin(c) { return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
    return { sun: s, sunE: 2.6, sunSpread: 0.06, cosSun: Math.cos(cone), sunRad: 30, sky: 0.62, ground: 0.85,
      bg: [lin(0xf7 / 255), lin(0xf4 / 255), lin(0xee / 255)] };
  }

  function tone(x) { const k = 0.95; if (x > k) x = k + (1 - k) * (1 - Math.exp(-(x - k) / (1 - k))); return x <= 0.0031308 ? x * 12.92 : 1.055 * Math.pow(x, 1 / 2.4) - 0.055; }

  // Startet die Berechnung. opts: { width, passes, onProgress(pass, total, canvas), onDone(canvas) }
  function render(viewer, opts) {
    opts = opts || {};
    const dom = viewer.renderer.domElement;
    const vw = dom.clientWidth || dom.width, vh = dom.clientHeight || dom.height;
    const W = Math.max(320, Math.round(opts.width || 1600)), H = Math.round(W * vh / Math.max(1, vw));
    const passes = opts.passes || 128;
    const scene = collect(viewer), cam = cameraData(viewer, W, H), light = lightData(cam);
    const canvas = opts.canvas || document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d"), img = ctx.createImageData(W, H);
    const acc = new Float32Array(W * H * 3), cntRow = new Int32Array(H);
    const nW = Math.max(1, Math.min(8, (navigator.hardwareConcurrency || 4) - 1));
    const src = "(" + workerMain.toString() + ")();";
    const url = URL.createObjectURL(new Blob([src], { type: "text/javascript" }));
    const workers = []; let stopped = false, done = 0;
    const t0 = performance.now();
    function draw(rowsList) {
      const d = img.data;
      rowsList.forEach(function (y) {
        const n = cntRow[y] || 1;
        for (let x = 0; x < W; x++) {
          const o = (y * W + x) * 3, p = (y * W + x) * 4;
          d[p] = 255 * tone(acc[o] / n); d[p + 1] = 255 * tone(acc[o + 1] / n); d[p + 2] = 255 * tone(acc[o + 2] / n); d[p + 3] = 255;
        }
      });
      ctx.putImageData(img, 0, 0);
    }
    for (let w = 0; w < nW; w++) {
      const rows = []; for (let y = w; y < H; y += nW) rows.push(y);
      const wk = new Worker(url);
      let passCount = 0;
      wk.onmessage = function (e) {
        if (stopped) return;
        const m = e.data;
        if (m.type === "pass") {
          const d = m.data;
          for (let ri = 0; ri < rows.length; ri++) {
            const y = rows[ri]; cntRow[y]++;
            const off = y * W * 3, so = ri * W * 3;
            for (let i = 0; i < W * 3; i++) acc[off + i] += d[so + i];
          }
          draw(rows);
          passCount++;
          wk.pc = passCount;
          if (opts.onProgress) opts.onProgress(Math.min.apply(null, workers.map(function (x) { return x.pc; })), passes, (performance.now() - t0) / 1000);
          if (passCount >= passes) { done++; wk.terminate(); if (done === nW && opts.onDone) { URL.revokeObjectURL(url); opts.onDone(canvas); } return; }
        }
        wk.postMessage({ type: "pass" });
      };
      wk.onerror = function (err) { if (opts.onError) opts.onError(err); };
      wk.pc = 0;
      wk.postMessage({ type: "init", pos: scene.pos, nrm: scene.nrm, uv: scene.uv, mat: scene.mat, mats: scene.mats,
        texs: scene.texs.map(function (t) { return { w: t.w, h: t.h, d: t.d, ws: t.ws || 1000, wt: t.wt || 1000 }; }),
        cam: cam, light: light, W: W, H: H, rows: rows, seed: 1234567 + w * 7919 });
      workers.push(wk);
    }
    return {
      canvas: canvas, width: W, height: H, triangles: scene.mat.length,
      stop: function () { stopped = true; workers.forEach(function (w) { w.terminate(); }); URL.revokeObjectURL(url); }
    };
  }

  global.RGRaytrace = { render: render, _collect: collect };
})(window);
