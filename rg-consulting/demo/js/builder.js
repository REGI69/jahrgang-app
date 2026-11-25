/* =====================================================================
   RG CAD – Parametrischer Bauteil-Generator
   Origin: vorne-unten-links (0,0,0). +X rechts, +Y oben, +Z nach hinten.
   Alle Masse in mm. Liefert Plattenliste -> 3D + Stueckliste.
   ===================================================================== */
(function (global) {
  "use strict";

  // Material-Overrides je Bauteil (pro Möbel frei wählbare Holzart):
  //   _matOv     – pro Einzel-Element (Schlüssel: name + "#" + Vorkommen)
  //   _matOvName – pro Bauteil-Typ/Name (gilt für alle gleichnamigen)
  let _matOv = {}, _matOvName = {}, _matCount = {};
  let _handleType = "buegel";   // Griff-/Knopf-Typ des aktiven Möbels: buegel|stange|knopf|muschel|grifflos

  function panel(parts, o) {
    // o: {name, group, material, x,y,z, dx,dy,dz, cut:[L,W,T], edgeMM, edgeNote, grain}
    const occ = (_matCount[o.name] = (_matCount[o.name] || 0) + 1) - 1;
    const matKey = o.name + "#" + occ;
    const material = _matOv[matKey] || _matOvName[o.name] || o.material;
    const obj = {
      id: parts.length + 1,
      name: o.name,
      group: o.group,
      material: material,
      matKey: matKey,
      baseMaterial: o.material,
      role: o.role || "",
      pos: [o.x, o.y, o.z],
      dim: [o.dx, o.dy, o.dz],
      cut: o.cut,
      edgeMM: o.edgeMM || 0,
      edgeNote: o.edgeNote || "",
      grain: o.grain || "-",
    };
    parts.push(obj);
    return obj;
  }

  function hingeCount(h) {
    if (h <= 900) return 2;
    if (h <= 1600) return 3;
    if (h <= 2000) return 4;
    return 5;
  }

  function addShelves(parts, col, count, ctx, depthInset, fixed) {
    if (count <= 0) return;
    const t = ctx.t;
    const spacing = ctx.IH / (count + 1);
    const sd = ctx.ID - depthInset;
    const air = fixed ? 0 : 2;
    for (let i = 1; i <= count; i++) {
      const y = ctx.IY0 + spacing * i - t / 2;
      panel(parts, {
        name: fixed ? "Konstruktionsboden" : "Einlegeboden",
        group: "Innenausbau", material: ctx.material,
        x: col.x + air / 2, y: y, z: 5,
        dx: col.w - air, dy: t, dz: sd,
        cut: [col.w - air, sd, t], edgeMM: col.w - air, edgeNote: "vorne", grain: "L",
      });
      if (!fixed) {
        ctx.hardware.bodentraeger += 4;
        if (ctx.shelfMounts) ctx.shelfMounts.push({ y: ctx.IY0 + spacing * i, leftWallX: col.x - t, rightWallX: col.x + col.w });
      }
    }
  }

  function buildCabinet(cfg) {
    const parts = [], handles = [], warnings = [];
    const hardware = { topfband: 0, griff: 0, auszug: 0, bodentraeger: 0, sockelfuss: 0 };
    const t = cfg.thickness;
    const W = cfg.width, H = cfg.height, D = cfg.depth;
    const isBase = cfg.type === "base";
    const P = isBase ? (cfg.plinthHeight || 100) : 0;
    const tb = cfg.backType === "none" ? 0 : (cfg.backThickness || 8);
    const frontT = cfg.frontThickness || 19;
    const r = 2;   // Aussenfuge / Reveal
    const g = 3;   // Fuge zwischen Fronten
    const mat = cfg.material;
    const backMat = cfg.backMaterial || "hdf";
    const blumParts = [], runners = [], runnerInfos = [], runnerMounts = [], dctr = { n: 0 }, dctr2 = { n: 0 }, dctr3 = { n: 0 };

    if (W < 100 || H < 100 || D < 100) warnings.push("Masse sehr klein.");
    const cBot = P, cTop = H, cH = cTop - cBot;
    if (cH < 3 * t) warnings.push("Hoehe zu klein fuer Korpus.");

    // ---- Seiten ----
    panel(parts, { name: "Seite links", group: "Korpus", material: mat,
      x: 0, y: cBot, z: 0, dx: t, dy: cH, dz: D,
      cut: [cH, D, t], edgeMM: cH, edgeNote: "vorne", grain: "L" });
    panel(parts, { name: "Seite rechts", group: "Korpus", material: mat,
      x: W - t, y: cBot, z: 0, dx: t, dy: cH, dz: D,
      cut: [cH, D, t], edgeMM: cH, edgeNote: "vorne", grain: "L" });

    // ---- Boden ----
    panel(parts, { name: "Boden", group: "Korpus", material: mat,
      x: t, y: cBot, z: 0, dx: W - 2 * t, dy: t, dz: D,
      cut: [W - 2 * t, D, t], edgeMM: W - 2 * t, edgeNote: "vorne", grain: "L" });

    // ---- Deckel / Traversen ----
    if (isBase && cfg.topType === "rails") {
      panel(parts, { name: "Traverse vorne", group: "Korpus", material: mat,
        x: t, y: H - t, z: 0, dx: W - 2 * t, dy: t, dz: 80,
        cut: [W - 2 * t, 80, t], edgeMM: W - 2 * t, edgeNote: "vorne", grain: "L" });
      panel(parts, { name: "Traverse hinten", group: "Korpus", material: mat,
        x: t, y: H - t, z: D - 80, dx: W - 2 * t, dy: t, dz: 80,
        cut: [W - 2 * t, 80, t], edgeMM: 0, grain: "L" });
    } else {
      panel(parts, { name: "Deckel", group: "Korpus", material: mat,
        x: t, y: H - t, z: 0, dx: W - 2 * t, dy: t, dz: D,
        cut: [W - 2 * t, D, t], edgeMM: W - 2 * t, edgeNote: "vorne", grain: "L" });
    }

    // ---- Rueckwand ----
    if (cfg.backType === "inset") {
      panel(parts, { name: "Rueckwand", group: "Korpus", material: backMat,
        x: t, y: cBot + t, z: D - tb, dx: W - 2 * t, dy: cH - 2 * t, dz: tb,
        cut: [Math.max(W - 2 * t, cH - 2 * t), Math.min(W - 2 * t, cH - 2 * t), tb], grain: "-" });
    } else if (cfg.backType === "overlay") {
      panel(parts, { name: "Rueckwand", group: "Korpus", material: backMat,
        x: 0, y: cBot, z: D - tb, dx: W, dy: cH, dz: tb,
        cut: [Math.max(W, cH), Math.min(W, cH), tb], grain: "-" });
    }

    // ---- Sockel (Base) ----
    if (isBase && P > 0) {
      const rec = 50;
      panel(parts, { name: "Sockelblende vorne", group: "Sockel", material: mat,
        x: 0, y: 0, z: rec, dx: W, dy: P, dz: t,
        cut: [W, P, t], edgeMM: W, edgeNote: "oben", grain: "L" });
      panel(parts, { name: "Sockel hinten", group: "Sockel", material: mat,
        x: t, y: 0, z: D - t, dx: W - 2 * t, dy: P, dz: t,
        cut: [W - 2 * t, P, t], grain: "L" });
      panel(parts, { name: "Sockel seite L", group: "Sockel", material: mat,
        x: 0, y: 0, z: rec + t, dx: t, dy: P, dz: D - rec - 2 * t,
        cut: [D - rec - 2 * t, P, t], grain: "L" });
      panel(parts, { name: "Sockel seite R", group: "Sockel", material: mat,
        x: W - t, y: 0, z: rec + t, dx: t, dy: P, dz: D - rec - 2 * t,
        cut: [D - rec - 2 * t, P, t], grain: "L" });
      hardware.sockelfuss += 4;
    }

    // ---- Interior ----
    const IX0 = t, IW = W - 2 * t;
    const IY0 = cBot + t, IH = cH - 2 * t;
    const ID = D - tb;
    const shelfMounts = [];
    const ctx = { t, IW, IH, ID, IX0, IY0, material: mat, hardware, shelfMounts: shelfMounts };

    const colsCfg = (cfg.columns && cfg.columns.length) ? cfg.columns : [{ w: 1, type: "shelves", count: 2 }];
    const nCol = colsCfg.length;
    const sumW = colsCfg.reduce((s, c) => s + (c.w || 1), 0);
    const usable = IW - (nCol - 1) * t;
    if (usable < nCol * 30) warnings.push("Zu viele Spalten fuer Breite.");

    const cols = [];
    let cx = IX0;
    const divCenters = [];
    for (let i = 0; i < nCol; i++) {
      const colW = usable * (colsCfg[i].w || 1) / sumW;
      cols.push({ x: cx, w: colW, cfg: colsCfg[i] });
      cx += colW;
      if (i < nCol - 1) {
        panel(parts, { name: "Mittelseite", group: "Korpus", material: mat,
          x: cx, y: IY0, z: 0, dx: t, dy: IH, dz: ID,
          cut: [IH, ID, t], edgeMM: IH, edgeNote: "vorne", grain: "L" });
        divCenters.push(cx + t / 2);
        cx += t;
      }
    }

    const faceBottom = cBot + r;
    const faceTop = H - r;

    for (let i = 0; i < nCol; i++) {
      const col = cols[i];
      const type = col.cfg.type || "shelves";
      const count = col.cfg.count != null ? col.cfg.count : 2;
      const colCtx = Object.assign({}, ctx, { IX0: col.x });

      const faceLeft = (i === 0) ? r : (divCenters[i - 1] + g / 2);
      const faceRight = (i === nCol - 1) ? (W - r) : (divCenters[i] - g / 2);
      const faceW = faceRight - faceLeft;
      const faceH = faceTop - faceBottom;

      // Griff pro Spalte (Fallback: Möbel-Standard cfg.handleType)
      _handleType = (col.cfg && col.cfg.handleType) || (cfg.handleType || "buegel");

      if (type === "shelves") {
        addShelves(parts, col, count, ctx, 18, false);
      } else if (type === "open") {
        /* nichts */
      } else if (type === "drawers") {
        addDrawers(parts, handles, hardware, col, count, faceLeft, faceW, faceBottom, faceH, frontT, g, mat, cfg, ID, blumParts, runners, runnerInfos, runnerMounts, dctr);
      } else if (type === "door_l" || type === "door_r" || type === "door_double") {
        addShelves(parts, col, count, ctx, 25, false);
        addDoors(parts, handles, hardware, type, faceLeft, faceW, faceBottom, faceH, frontT, g, mat, dctr2);
      } else if (type === "klappe") {
        addShelves(parts, col, count, ctx, 25, false);
        addFlap(parts, handles, hardware, faceLeft, faceW, faceBottom, faceH, frontT, mat, col, blumParts, dctr3);
      }
    }

    const geo = { t: t, W: W, H: H, D: D, cH: cH, cBot: cBot, P: P, tb: tb,
      backType: cfg.backType, frontT: frontT, IH: IH, ID: ID, runnerInfos: runnerInfos, runnerMounts: runnerMounts,
      type: cfg.type, shelfMounts: shelfMounts };
    return finalize(parts, handles, hardware, warnings, W, H, D, cfg, geo, runners, blumParts);
  }

  function addDoors(parts, handles, hardware, type, fx, fw, fy, fh, frontT, g, mat, dctr2) {
    const z = -frontT;
    function leaf(x, w, hingeSide, name) {
      const did = dctr2 ? dctr2.n++ : 0;
      const lf = panel(parts, { name: name, group: "Front", material: mat, role: "door",
        x: x, y: fy, z: z, dx: w, dy: fh, dz: frontT,
        cut: [fh, w, frontT], edgeMM: 2 * (w + fh), edgeNote: "umlaufend", grain: "L" });
      lf.hinge = hingeSide;
      lf.doorId = did;
      lf.handleType = _handleType; lf.handleBohr = stdBohr(Math.min(192, fh * 0.4));
      hardware.topfband += hingeCount(fh);
      const hx = hingeSide === "left" ? (x + w - 40) : (x + 40);
      if (_handleType !== "grifflos") {
        hardware.griff += 1;
        handles.push({ kind: "bar", type: _handleType, axis: "y", x: hx, y: fy + fh / 2, z: z - 16, len: Math.min(192, fh * 0.4), doorId: did });
      }
    }
    if (type === "door_double") {
      const w = (fw - g) / 2;
      leaf(fx, w, "left", "Tuer links");
      leaf(fx + w + g, w, "right", "Tuer rechts");
    } else {
      leaf(fx, fw, type === "door_l" ? "left" : "right", "Tuer");
    }
  }

  function addFlap(parts, handles, hardware, fx, fw, fy, fh, frontT, mat, col, blumParts, dctr3) {
    const z = -frontT;
    const did = dctr3 ? dctr3.n++ : 0;
    const fl = panel(parts, { name: "Klappe", group: "Front", material: mat, role: "flap",
      x: fx, y: fy, z: z, dx: fw, dy: fh, dz: frontT,
      cut: [fw, fh, frontT], edgeMM: 2 * (fw + fh), edgeNote: "umlaufend", grain: "L" });
    fl.flapId = did;
    fl.handleType = _handleType; fl.handleBohr = stdBohr(Math.min(fw * 0.5, 224));
    if (_handleType !== "grifflos") {
      hardware.griff += 1;
      handles.push({ kind: "bar", type: _handleType, axis: "x", x: fx + fw / 2, y: fy + 45, z: z - 16, len: Math.min(fw * 0.5, 224), flapId: did });
    }
    const av = (col.cfg && col.cfg.aventos) || "hks";
    if (global.Blum && global.Blum.aventos) {
      const a = global.Blum.aventos(av);
      blumParts.push({ name: a.name, art: a.art, price: a.price, qty: 1, verify: true });
    } else { hardware.topfband += 2; }
  }

  function addDrawers(parts, handles, hardware, col, count, fx, fw, fy, fh, frontT, g, mat, cfg, ID, blumParts, runners, runnerInfos, runnerMounts, dctr) {
    if (count <= 0) count = 1;
    const z = -frontT;
    const frontH = (fh - (count - 1) * g) / count;
    const drawMat = cfg.drawerMaterial || "multiplex";
    const t = cfg.thickness || 19;

    const rcfg = (col.cfg && col.cfg.runner) || { system: "tandem560" };
    let spec = null;
    if (global.Blum) {
      spec = global.Blum.spec(rcfg.system, { height: rcfg.height, nl: rcfg.nl }, { innerW: col.w, innerDepth: ID });
      runnerInfos.push({ x: col.x, w: col.w, count: count, system: spec.system, nl: spec.nl, kind: spec.kind, fixings: spec.drilling.fixings });
    }
    const nl = spec ? spec.nl : Math.max(150, ID - 30);
    const isBox = spec && spec.kind === "box";
    const fixings = (spec && spec.drilling && spec.drilling.fixings) ? spec.drilling.fixings : [37, Math.round(nl / 2), nl - 32];
    const dst = 16, bt = 16;

    for (let j = 0; j < count; j++) {
      const did = dctr ? dctr.n++ : j;
      const yb = fy + j * (frontH + g);
      if (runnerMounts) runnerMounts.push({ y: yb + 8, nl: nl, fixings: fixings, leftWallX: col.x - t, rightWallX: col.x + col.w });
      const fr = panel(parts, { name: "Schubladenfront", group: "Front", material: mat, role: "drawerfront",
        x: fx, y: yb, z: z, dx: fw, dy: frontH, dz: frontT,
        cut: [fw, frontH, frontT], edgeMM: 2 * (fw + frontH), edgeNote: "umlaufend", grain: "L" });
      fr.drawerId = did;
      fr.handleType = _handleType; fr.handleBohr = stdBohr(Math.min(fw * 0.5, 224));
      if (_handleType !== "grifflos") {
        hardware.griff += 1;
        handles.push({ kind: "bar", type: _handleType, axis: "x", x: fx + fw / 2, y: yb + frontH - 45, z: z - 16, len: Math.min(fw * 0.5, 224), drawerId: did });
      }

      if (spec) spec.parts.forEach((p) => blumParts.push(Object.assign({}, p)));
      else hardware.auszug += 1;

      if (isBox) {
        const zh = spec.drawer.zargeH || 100;
        const by = yb + 6, zt = 13, clr = 13;
        const bxL = col.x + clr, bxR = col.x + col.w - clr - zt;
        runners.push({ x: bxL, y: by, z: 8, dx: zt, dy: zh, dz: nl, kind: "zarge", drawerId: did });
        runners.push({ x: bxR, y: by, z: 8, dx: zt, dy: zh, dz: nl, kind: "zarge", drawerId: did });
        runners.push({ x: bxL, y: by, z: 8 + nl - zt, dx: (bxR - bxL) + zt, dy: zh, dz: zt, kind: "zarge", drawerId: did });
        runners.push({ x: bxL + zt, y: by, z: 8, dx: (bxR - bxL) - zt, dy: 16, dz: nl, kind: "boden", drawerId: did });
      } else {
        const boxW = spec ? spec.drawer.widthOuter : col.w - 42;
        const boxH = Math.max(60, frontH - 50);
        const bx = col.x + (col.w - boxW) / 2, by = yb + 12, bz = 8;
        panel(parts, { name: "Schublade Seite", group: "Schublade", material: drawMat, x: bx, y: by, z: bz, dx: dst, dy: boxH, dz: nl, cut: [nl, boxH, dst], grain: "L" }).drawerId = did;
        panel(parts, { name: "Schublade Seite", group: "Schublade", material: drawMat, x: bx + boxW - dst, y: by, z: bz, dx: dst, dy: boxH, dz: nl, cut: [nl, boxH, dst], grain: "L" }).drawerId = did;
        panel(parts, { name: "Schublade vorne", group: "Schublade", material: drawMat, x: bx + dst, y: by, z: bz, dx: boxW - 2 * dst, dy: boxH, dz: dst, cut: [boxW - 2 * dst, boxH, dst], grain: "L" }).drawerId = did;
        panel(parts, { name: "Schublade hinten", group: "Schublade", material: drawMat, x: bx + dst, y: by, z: bz + nl - dst, dx: boxW - 2 * dst, dy: boxH, dz: dst, cut: [boxW - 2 * dst, boxH, dst], grain: "L" }).drawerId = did;
        panel(parts, { name: "Schublade Boden", group: "Schublade", material: drawMat, x: bx + dst, y: by, z: bz, dx: boxW - 2 * dst, dy: bt, dz: nl, cut: [boxW - 2 * dst, nl, bt], grain: "L" }).drawerId = did;
        // Unterflur-Laufschienen (Metall) – sichtbar, fahren mit
        runners.push({ x: bx - 5, y: by - 7, z: 6, dx: 6, dy: 16, dz: nl, kind: "rail", drawerId: did });
        runners.push({ x: bx + boxW - 1, y: by - 7, z: 6, dx: 6, dy: 16, dz: nl, kind: "rail", drawerId: did });
      }
    }
  }

  function buildTable(cfg) {
    const parts = [], handles = [], warnings = [];
    const hardware = { verbinder: 0 };
    const W = cfg.width, H = cfg.height, D = cfg.depth;
    const topT = cfg.topThickness || 27;
    const legS = cfg.legSize || 70;
    const apronH = cfg.apronHeight || 90;
    const apronT = cfg.apronThickness || 25;
    const inset = cfg.legInset != null ? cfg.legInset : 60;
    const mat = cfg.material;
    const legH = H - topT;

    panel(parts, { name: "Tischplatte", group: "Platte", material: mat,
      x: 0, y: H - topT, z: 0, dx: W, dy: topT, dz: D,
      cut: [W, D, topT], edgeMM: 2 * (W + D), edgeNote: "umlaufend", grain: "L" });

    const legPos = [
      [inset, inset], [W - inset - legS, inset],
      [inset, D - inset - legS], [W - inset - legS, D - inset - legS],
    ];
    legPos.forEach(function (p) {
      panel(parts, { name: "Tischbein", group: "Gestell", material: mat,
        x: p[0], y: 0, z: p[1], dx: legS, dy: legH, dz: legS,
        cut: [legH, legS, legS], grain: "L" });
    });

    const ay = legH - apronH - 10;
    const aInL = inset + legS;
    panel(parts, { name: "Zarge vorne", group: "Gestell", material: mat,
      x: aInL, y: ay, z: inset, dx: W - 2 * aInL, dy: apronH, dz: apronT,
      cut: [W - 2 * aInL, apronH, apronT], edgeMM: 0, grain: "L" });
    panel(parts, { name: "Zarge hinten", group: "Gestell", material: mat,
      x: aInL, y: ay, z: D - inset - apronT, dx: W - 2 * aInL, dy: apronH, dz: apronT,
      cut: [W - 2 * aInL, apronH, apronT], grain: "L" });
    panel(parts, { name: "Zarge seite L", group: "Gestell", material: mat,
      x: inset, y: ay, z: aInL, dx: apronT, dy: apronH, dz: D - 2 * aInL,
      cut: [D - 2 * aInL, apronH, apronT], grain: "L" });
    panel(parts, { name: "Zarge seite R", group: "Gestell", material: mat,
      x: W - inset - apronT, y: ay, z: aInL, dx: apronT, dy: apronH, dz: D - 2 * aInL,
      cut: [D - 2 * aInL, apronH, apronT], grain: "L" });
    hardware.verbinder = 8;

    return finalize(parts, handles, hardware, warnings, W, H, D, cfg, { type: "table" });
  }

  function deriveEdges(note) {
    // [oben, rechts, unten, links] bezogen auf L(horizontal) x B(vertikal)
    switch (note) {
      case "umlaufend": return [1, 1, 1, 1];
      case "vorne": return [0, 0, 1, 0];
      case "oben": return [1, 0, 0, 0];
      default: return [0, 0, 0, 0];
    }
  }

  function inferRole(name) {
    if (name === "Boden") return "bottom";
    if (name === "Deckel") return "top";
    if (name === "Mittelseite") return "divider";
    if (name.indexOf("Seite ") === 0) return "side";
    return "";
  }

  function hingePositions(h) {
    const n = hingeCount(h);
    const first = 100, last = h - 100;
    if (n <= 1) return [Math.round(h / 2)];
    const arr = [];
    for (let i = 0; i < n; i++) arr.push(Math.round(first + (last - first) * i / (n - 1)));
    return arr;
  }

  function connectorDepths(far, off, n) {
    if (n === 2) return [off, far - off];
    if (n === 3) return [off, Math.round(far / 2), far - off];
    return (far >= 450) ? [off, Math.round(far / 2), far - off] : [off, far - off];
  }
  function connectorHolesFor(connector, far, off, n) {
    const ds = connectorDepths(far, off, n), res = [];
    if (connector === "dowel") ds.forEach(function (d) { res.push({ y: d, d: 8, type: "dowel" }); });
    else if (connector === "confirmat") ds.forEach(function (d) { res.push({ y: d, d: 7, type: "confirmat" }); });
    else if (connector === "lamello") [ds[0], ds[ds.length - 1]].forEach(function (d) { res.push({ y: d, d: 0, type: "lamello" }); });
    else { res.push({ y: ds[0], d: 15, type: "minifix" }); res.push({ y: ds[ds.length - 1], d: 15, type: "minifix" }); for (let i = 1; i < ds.length - 1; i++) res.push({ y: ds[i], d: 8, type: "dowel" }); }
    return { holes: res, depths: ds };
  }
  function connectorLabel(c) {
    return c === "dowel" ? "Dübel Ø8" : c === "confirmat" ? "Confirmat Ø7" : c === "lamello" ? "Lamello Clamex" : "Minifix Ø15 + Dübel";
  }

  // Bohr-/Nutbild pro Bauteil (Features in Bauteil-Koordinaten: x entlang L, y entlang B, Ursprung unten-links)
  // Standard-Griff-Bohrabstände (mm) – nächster Wert, der in die Front passt
  const STD_BOHR = [96, 128, 160, 192, 224, 256, 288, 320, 384, 448];
  function stdBohr(maxSpan) {
    let best = STD_BOHR[0];
    for (let i = 0; i < STD_BOHR.length; i++) if (STD_BOHR[i] <= maxSpan) best = STD_BOHR[i];
    return best;
  }
  // Griff-Bohrbild auf eine Front legen (für Werkstattzeichnung / CNC)
  function addHandleHoles(f, center, off, type, bohr) {
    type = type || "buegel";
    if (type === "profil") { f.notes.push("Profilgriff (Kante) – keine Griffbohrung"); return; }
    if (type === "grifflos") { f.notes.push("Grifflos – keine Griffbohrung"); return; }
    if (type === "knopf" || type === "tgriff") {
      f.holes.push({ x: Math.round(center), y: Math.round(off), d: 5, type: "handle" });
      f.notes.push((type === "knopf" ? "Knopf/Knauf" : "T-Griff") + " – 1 Bohrung Ø5 mittig");
      return;
    }
    const h = bohr / 2;
    f.holes.push({ x: Math.round(center - h), y: Math.round(off), d: 5, type: "handle" });
    f.holes.push({ x: Math.round(center + h), y: Math.round(off), d: 5, type: "handle" });
    f.handleBohr = bohr;
    f.notes.push("Griffbohrung Ø5 · Bohrabstand " + bohr + " mm");
  }

  function featForPart(p, cfg, geo) {
    const f = { holes: [], rows: [], grooves: [], notes: [] };
    const role = p.role || inferRole(p.name);
    const L = p.cut[0], B = p.cut[1];
    const t = geo.t || cfg.thickness || 19;

    if (role === "side") {
      const D = geo.D || B, tb = geo.tb || 8;
      if (geo.backType === "inset") {
        const gy = D - 15 - tb / 2;
        f.grooves.push({ x1: 0, y1: gy, x2: L, y2: gy, width: tb, depth: 10, offset: 15, label: "Nut " + tb + "×10" });
        f.notes.push("Nut " + tb + "×10 mm f. Rückwand, 15 mm v. HK");
      }
      if (geo.type === "shelf") {
        f.rows.push({ y: 37, x0: t + 16, x1: L - t - 16, pitch: 32, d: 5 });
        f.rows.push({ y: D - 37, x0: t + 16, x1: L - t - 16, pitch: 32, d: 5 });
        f.notes.push("Systemlochung Ø5 · Raster 32 mm (Regal)");
        f.notes.push("Reihen 37 mm v. Vorder-/Hinterkante");
      }
      // Korpusverbinder (Typ waehlbar) je Verbindung Boden/Deckel
      const connS = cfg.connector || "minifix", offS = cfg.connectorOffset || 37, cnS = cfg.connectorN || "auto";
      const chS = connectorHolesFor(connS, D, offS, cnS);
      [Math.round(t / 2), L - Math.round(t / 2)].forEach(function (jx) {
        chS.holes.forEach(function (h) { f.holes.push({ x: jx, y: h.y, d: h.d, type: h.type }); });
      });
      f.connDepths = chS.depths; f.connEdge = Math.round(t / 2);
      f.notes.push("Korpusverbinder Boden/Deckel: " + connectorLabel(connS) + " · Tiefen " + chS.depths.join(" / ") + " · Randabstand " + Math.round(t / 2) + " mm");
      if (geo.runnerInfos && geo.runnerInfos.length) {
        geo.runnerInfos.forEach(function (ri) {
          f.notes.push("Auszug " + String(ri.system).split(" ")[0] + " NL " + ri.nl + " · Bohr " + ri.fixings.join("/") + " mm ab VK");
        });
      }
    } else if (role === "bottom" || role === "top") {
      const D2 = geo.D || B, tb2 = geo.tb || 8;
      if (geo.backType === "inset") {
        const gy2 = D2 - 15 - tb2 / 2;
        f.grooves.push({ x1: 0, y1: gy2, x2: L, y2: gy2, width: tb2, depth: 10, offset: 15, label: "Nut " + tb2 + "×10" });
        f.notes.push("Nut " + tb2 + "×10 mm f. Rückwand, 15 mm v. HK");
      }
      const connB = cfg.connector || "minifix", offB = cfg.connectorOffset || 37, cnB = cfg.connectorN || "auto";
      const dsB = connectorDepths(D2, offB, cnB);
      const tyB = connB === "lamello" ? "lamello" : "dowel";
      const diaB = connB === "lamello" ? 0 : 8;
      dsB.forEach(function (yy) {
        f.holes.push({ x: 10, y: yy, d: diaB, type: tyB });
        f.holes.push({ x: L - 10, y: yy, d: diaB, type: tyB });
      });
      f.connDepths = dsB; f.connEdge = 10;
      f.notes.push("Stirnseitig: " + connectorLabel(connB) + "-Aufnahme · Tiefen " + dsB.join(" / "));
    } else if (role === "divider") {
      const ID = geo.ID || B;
      if (geo.type === "shelf") {
        f.rows.push({ y: 37, x0: 16, x1: L - 16, pitch: 32, d: 5 });
        f.rows.push({ y: ID - 37, x0: 16, x1: L - 16, pitch: 32, d: 5 });
        f.notes.push("Systemlochung bds. Ø5 · Raster 32 (Regal)");
      }
      const connV = cfg.connector || "minifix", offV = cfg.connectorOffset || 37, cnV = cfg.connectorN || "auto";
      const chV = connectorHolesFor(connV, ID, offV, cnV);
      [8, L - 8].forEach(function (jx) {
        chV.holes.forEach(function (h) { f.holes.push({ x: jx, y: h.y, d: h.d, type: h.type }); });
      });
      f.connDepths = chV.depths; f.connEdge = 8;
      f.notes.push("Verbinder oben & unten: " + connectorLabel(connV) + " · Tiefen " + chV.depths.join(" / "));
    } else if (role === "door") {
      const w = B, fh = L, hinge = p.hinge || "left";
      const cy = hinge === "left" ? 22 : w - 22;
      const xs = hingePositions(fh);
      xs.forEach(function (xx) { f.holes.push({ x: xx, y: cy, d: 35, type: "cup" }); });
      f.notes.push("Topfband Ø35, 22 mm v. Anschlag (" + xs.length + "×)");
      f.notes.push("Bandpositionen x: " + xs.join(" / "));
      const hy = hinge === "left" ? w - 30 : 30;
      addHandleHoles(f, fh / 2, hy, p.handleType, p.handleBohr || stdBohr(fh - 80));
    } else if (role === "drawerfront") {
      const fw = L, fhB = B;
      addHandleHoles(f, fw / 2, fhB - 45, p.handleType, p.handleBohr || stdBohr(fw - 80));
    } else if (role === "flap") {
      const fwF = L, fhF = B;
      addHandleHoles(f, fwF / 2, fhF - 45, p.handleType, p.handleBohr || stdBohr(fwF - 80));
    }

    // Auszugschienen-Montageorte (Schienenkontur + Befestigungsbohrungen) auf seitlichen Waenden
    if ((role === "side" || role === "divider") && geo.runnerMounts && geo.runnerMounts.length) {
      const px = p.pos[0], y0 = p.pos[1];
      let added = false;
      geo.runnerMounts.forEach(function (mt) {
        if (!(Math.abs(px - mt.leftWallX) < t * 0.6 || Math.abs(px - mt.rightWallX) < t * 0.6)) return;
        const lx = mt.y - y0;
        if (lx < 0 || lx > L) return;
        f.rails = f.rails || [];
        f.rails.push({ x: lx, y0: 0, y1: Math.min(mt.nl, B) });
        (mt.fixings || []).forEach(function (d) {
          if (d >= 0 && d <= B) f.holes.push({ x: lx, y: d, d: 4, type: "runner" });
        });
        added = true;
      });
      if (added) f.notes.push("Auszugschiene: Schienenlauf + Bohrungen Ø4 (Tiefe ab Vorderkante)");
    }

    // Bodentraeger-Aufnahmen je Boden (Kabinett – keine durchgehende Systemlochung)
    if ((role === "side" || role === "divider") && geo.type !== "shelf" && geo.shelfMounts && geo.shelfMounts.length) {
      const px = p.pos[0], y0 = p.pos[1];
      let added = false;
      geo.shelfMounts.forEach(function (mt) {
        if (!(Math.abs(px - mt.leftWallX) < t * 0.6 || Math.abs(px - mt.rightWallX) < t * 0.6)) return;
        const lx = mt.y - y0;
        if (lx < 0 || lx > L) return;
        f.holes.push({ x: lx, y: 40, d: 5, type: "dowel" });
        f.holes.push({ x: lx, y: B - 40, d: 5, type: "dowel" });
        added = true;
      });
      if (added) f.notes.push("Bodenträger Ø5 je Boden (40 mm v. Vorder-/Hinterkante)");
    }
    return f;
  }

  function computeFeatures(parts, cfg, geo) {
    parts.forEach(function (p) { p.features = featForPart(p, cfg, geo || {}); });
  }

  function finalize(parts, handles, hardware, warnings, W, H, D, cfg, geo, runners, blumParts) {
    parts.forEach(function (p) { p.edges = deriveEdges(p.edgeNote); });
    computeFeatures(parts, cfg || {}, geo || {});
    return { parts: parts, handles: handles, hardware: hardware, warnings: warnings,
      bbox: { w: W, h: H, d: D }, runners: runners || [], blumParts: blumParts || [] };
  }

  function buildFurniture(cfg) {
    _handleType = (cfg && cfg.handleType) || "buegel";
    _matOv = (cfg && cfg.matOv) || {};
    _matOvName = (cfg && cfg.matOvName) || {};
    _matCount = {};
    if (cfg.type === "table") return buildTable(cfg);
    return buildCabinet(cfg);
  }

  global.SchreinerBuilder = { build: buildFurniture, hingeCount: hingeCount };
})(window);
