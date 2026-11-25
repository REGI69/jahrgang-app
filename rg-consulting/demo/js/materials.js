/* =====================================================================
   RG CAD – Materialien: Holzarten, fotografierte Furniere + gerechnete Maserung
   Die acht Echthoelzer laden tex/<key>.jpg (CC0, Quellen in tex/QUELLEN.md) als Farbkarte.
   Bis das Foto da ist – oder wenn es fehlt (Einzeldatei, Fehler) – gilt die gerechnete Textur.
   ===================================================================== */
(function (global) {
  "use strict";

  // Holz-Palette: Basisfarbe, Maserungsfarbe, Preis CHF/m2, Standardstaerke
  // tex: Fototextur unter tex/ (kachelbar), texMM: Kantenlaenge des Fotos in mm,
  // texUp: Faser laeuft im Foto senkrecht (wird um 90° gedreht, damit sie wie gerechnet entlang U liegt)
  const WOODS = {
    weiss:      { name: "Spanplatte weiss",   base: "#ECEAE4", grain: "#DAD7CE", grainStrength: 0.04, rough: 0.75, price: 22, t: 19 },
    grau:       { name: "Spanplatte grau",    base: "#9AA0A6", grain: "#868C92", grainStrength: 0.05, rough: 0.78, price: 24, t: 19 },
    anthrazit:  { name: "Spanplatte anthrazit", base: "#3A3F44", grain: "#2E3236", grainStrength: 0.05, rough: 0.8, price: 26, t: 19 },
    schwarz:    { name: "Spanplatte schwarz", base: "#222528", grain: "#15171A", grainStrength: 0.05, rough: 0.6, price: 28, t: 19 },
    eiche:      { name: "Eiche",              base: "#C49A6C", grain: "#9C7444", grainStrength: 0.5, rough: 0.62, price: 120, t: 27, tex: "eiche.jpg", texMM: 1000, texUp: true },
    eicheNatur: { name: "Eiche natur Dekor",  base: "#CDA877", grain: "#A8814E", grainStrength: 0.38, rough: 0.68, price: 30, t: 19, tex: "eicheNatur.jpg", texMM: 1000 },
    buche:      { name: "Buche",              base: "#D8B486", grain: "#BC9462", grainStrength: 0.3, rough: 0.6, price: 85, t: 27, tex: "buche.jpg", texMM: 1000 },
    nussbaum:   { name: "Nussbaum",           base: "#6E4B2E", grain: "#4E3018", grainStrength: 0.55, rough: 0.55, price: 180, t: 27, tex: "nussbaum.jpg", texMM: 1000, texUp: true },
    esche:      { name: "Esche",              base: "#D9C3A0", grain: "#B79E76", grainStrength: 0.4, rough: 0.62, price: 95, t: 27, tex: "esche.jpg", texMM: 1000 },
    ahorn:      { name: "Ahorn",              base: "#E5D2B0", grain: "#CBB389", grainStrength: 0.28, rough: 0.6, price: 90, t: 27, tex: "ahorn.jpg", texMM: 1000 },
    kirschbaum: { name: "Kirschbaum",         base: "#9C5A3C", grain: "#763E26", grainStrength: 0.45, rough: 0.55, price: 140, t: 27, tex: "kirschbaum.jpg", texMM: 1000 },
    multiplex:  { name: "Multiplex Birke",    base: "#E0C58E", grain: "#C49E5E", grainStrength: 0.35, rough: 0.55, price: 45, t: 18, tex: "multiplex.jpg", texMM: 1000 },
    hdf:        { name: "HDF / Rueckwand",    base: "#B89A6E", grain: "#A0824F", grainStrength: 0.15, rough: 0.85, price: 8, t: 3 },
  };

  let THREEref = null;
  let rendererRef = null;          // fuer die maximale Anisotropie (setRenderer)
  const texCache = {};             // gerechnete Texturen je Holz
  const photoTex = {};             // geladene Fototexturen je Holz
  const photoState = {};           // "laden" | "ok" | "fehlt"
  const matCache = {};
  const listeners = [];            // werden nach dem Laden eines Fotos gerufen (Viewer rendert neu)
  let metalMat = null;
  const TEX_DIR = "tex/";          // relativ zu demo/index.html

  function makeWoodTexture(key) {
    if (texCache[key]) return texCache[key];
    const w = WOODS[key] || WOODS.weiss;
    const size = 1024;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d");
    const img = ctx.createImageData(size, size);
    const d = img.data;

    const gs = w.grainStrength;
    const base = hexToRgb(w.base), late = hexToRgb(w.grain);
    const earlyR = base.r, earlyG = base.g, earlyB = base.b;   // Fruehholz = Basisfarbe (nicht aufhellen)
    const porous = (key === "eiche" || key === "esche" || key === "eicheNatur");   // ringporig -> scharfe Spaetholzlinie
    const rays = (key === "eiche" || key === "eicheNatur" || key === "buche");     // Spiegel / Markstrahlen

    // schnelle Integer-Hash Value-Noise
    function hash2(ix, iy) {
      let h = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263)) | 0;
      h = Math.imul(h ^ (h >>> 13), 1274126177);
      return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
    }
    function vnoise(x, y) {
      const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
      const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
      const a = hash2(ix, iy), b = hash2(ix + 1, iy), cc = hash2(ix, iy + 1), e = hash2(ix + 1, iy + 1);
      return a + (b - a) * ux + (cc - a) * uy + (a - b - cc + e) * ux * uy;
    }
    function fbm(x, y, oct) { let s = 0, a = 0.5, f = 1; for (let o = 0; o < oct; o++) { s += a * vnoise(x * f, y * f); f *= 2; a *= 0.5; } return s; }
    const sq = (x) => x * x;

    // Brett flat-sawn: Faser laeuft entlang U (X). Mark knapp unter der Unterkante ->
    // sichtbare Cathedral-Boegen unten, oben flacher (typisches Riftbild).
    const pithX = size * (0.5 + (Math.random() - 0.5) * 0.8);
    const pithY = size * (1.06 + Math.random() * 0.45);
    const ringSpacing = size / (16 + Math.random() * 7);   // mehr, deutlich sichtbare Jahrringe
    const ellip = 0.24 + Math.random() * 0.06;             // X-Stauchung -> breite Boegen, aber gewoelbt

    let idx = 0;
    for (let v = 0; v < size; v++) {
      for (let u = 0; u < size; u++) {
        // grosse, ruhige Verformung des Ringfeldes (organisch, nicht perfekt)
        const wU = fbm(u * 0.006, v * 0.020, 4) - 0.5;
        const wV = fbm(u * 0.030, v * 0.050, 3) - 0.5;
        const dx = (u - pithX) + wU * 170;
        const dy = (v - pithY) + wV * 42;
        const dist = Math.sqrt(sq(dx) * ellip + sq(dy));
        // Ringabstand variiert langsam -> natuerlich unterschiedlich breite Ringe
        const rs = ringSpacing * (0.82 + 0.34 * fbm(dist * 0.012, 7.3, 2));
        const frac = (dist / rs) - Math.floor(dist / rs);
        // Spaetholz: schmale, klare dunkle Linie laengs der Ringe
        const bw = porous ? 0.05 : 0.11;
        const lateLine = Math.exp(-sq(frac - 0.88) / (2 * bw * bw));
        // laengs verlaufende Tonbaender (entlang U) -> wichtigster echter Holzeindruck
        const streak = fbm(u * 0.010, v * 0.150, 4) - 0.5;
        // feine Fasern entlang der Faser
        const fiber = vnoise(u * 0.4, v * 7.0) - 0.5;
        // Spiegel/Markstrahlen (nur Eiche/Buche): sparsame helle Linsen
        let fleck = 0;
        if (rays) {
          const band = vnoise(u * 0.10, v * 0.55);
          const spot = vnoise(u * 0.6 + 19.3, v * 0.13 + 4.7);
          fleck = Math.max(0, spot - 0.74) * Math.max(0, band - 0.35) * 7.0;
        }
        // weiche Abdunklung zwischen den Linien -> Tiefe statt flacher Flaeche
        const midBand = Math.exp(-sq(frac - 0.45) / (2 * 0.22 * 0.22)) * 0.18;
        let m = lateLine * (porous ? 0.95 : 0.80) + midBand + Math.max(0, streak) * 0.22 + fiber * 0.10;
        m += (vnoise(u * 0.8, v * 0.8) - 0.5) * 0.05;   // Mikro-Pore
        m *= gs * 2.1;
        if (m < 0) m = 0; else if (m > 1) m = 1;
        const tone = streak * gs * 60;   // helle/dunkle Laengszonen im Fruehholz
        let r = earlyR + (late.r - earlyR) * m + tone * 0.55;
        let g = earlyG + (late.g - earlyG) * m + tone * 0.48;
        let b = earlyB + (late.b - earlyB) * m + tone * 0.38;
        if (fleck > 0) {
          const fl = Math.min(1, fleck) * (porous ? 0.45 : 0.28);
          r += (255 - r) * 0.22 * fl; g += (245 - g) * 0.20 * fl; b += (225 - b) * 0.16 * fl;
        }
        d[idx] = r < 0 ? 0 : r > 255 ? 255 : r;
        d[idx + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
        d[idx + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
        d[idx + 3] = 255;
        idx += 4;
      }
    }
    ctx.putImageData(img, 0, 0);

    const tex = new THREEref.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREEref.MirroredRepeatWrapping;   // Spiegeln -> keine sichtbaren Kacheln
    tex.anisotropy = 16;
    tex.encoding = THREEref.sRGBEncoding;
    texCache[key] = tex;
    return tex;
  }

  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a.toFixed(3) + ")";
  }

  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  // Fototextur eines Holzes anstossen. Rueckfall: bleibt die Datei aus, gilt die gerechnete Textur.
  function loadPhoto(key) {
    const w = WOODS[key];
    if (!w || !w.tex || photoState[key] || !THREEref.TextureLoader) return;
    photoState[key] = "laden";
    try {
      new THREEref.TextureLoader().load(TEX_DIR + w.tex, function (tex) {
        tex.encoding = THREEref.sRGBEncoding;
        tex.wrapS = tex.wrapT = THREEref.RepeatWrapping;   // Fotos sind kachelbar -> kein Spiegeln noetig
        tex.anisotropy = maxAniso();
        tex.needsUpdate = true;
        photoTex[key] = tex;
        photoState[key] = "ok";
        if (matCache[key]) { matCache[key].map = tex; matCache[key].bumpMap = tex; matCache[key].bumpScale = 0.03; matCache[key].needsUpdate = true; }
        listeners.forEach(function (fn) { try { fn(key); } catch (e) { /* still */ } });
      }, undefined, function () {
        photoState[key] = "fehlt";   // z. B. in der verkauften Einzeldatei ohne tex/ -> gerechnete Maserung bleibt
      });
    } catch (e) { photoState[key] = "fehlt"; }
  }

  function maxAniso() {
    try { if (rendererRef && rendererRef.capabilities) return rendererRef.capabilities.getMaxAnisotropy() || 8; } catch (e) { /* still */ }
    return 8;
  }

  // Aktuelle Farbkarte eines Holzes: Foto, sobald geladen, sonst gerechnet
  function currentMap(key) {
    return photoTex[key] || makeWoodTexture(key);
  }

  // 32-Bit-Hash (FNV-1a) aus Bauteil-Index und -Name -> deterministischer Versatz je Bauteil
  function partHash(part) {
    let h = 2166136261;
    const str = String(part.id || 0) + "|" + (part.name || "") + "|" + (part.matKey || "");
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^ (h >>> 16)) >>> 0;
  }

  // Textur fuer ein Bauteil (Quader dim = [x, y, z] in mm): Wiederholung nach echter Groesse,
  // Faser laengs (hochkante Teile werden 90° gedreht), eigener Ausschnitt je Bauteil.
  function partTexture(key, part) {
    const w = WOODS[key] || WOODS.weiss;
    const d = part.dim || [100, 100, 100];
    const photo = photoTex[key];
    const base = photo || makeWoodTexture(key);
    const tx = base.clone(); tx.needsUpdate = true;
    const upright = (d[1] >= d[0] && d[1] >= d[2]);   // Faser senkrecht: Tueren, Seiten (wie bisher)
    const h = partHash(part);
    tx.offset.set((h & 1023) / 1024, ((h >>> 10) & 1023) / 1024);
    tx.center.set(0.5, 0.5);
    if (photo) {
      // Hauptflaeche = die beiden groessten Kanten; Box-UV: duenn in Y -> u=x, v=z; duenn in Z -> u=x, v=y; duenn in X -> u=z, v=y
      let fu, fv;
      if (d[1] <= d[0] && d[1] <= d[2]) { fu = d[0]; fv = d[2]; }
      else if (d[2] <= d[0] && d[2] <= d[1]) { fu = d[0]; fv = d[1]; }
      else { fu = d[2]; fv = d[1]; }
      const mm = w.texMM || 1000;
      // Drehung: Faser im Foto senkrecht (texUp) und/oder Bauteil hochkant -> je 90°
      let rot = (w.texUp ? 1 : 0) + (upright ? 1 : 0);
      tx.rotation = (rot % 2) * Math.PI / 2;
      // Bei 90° laeuft die Textur-U-Achse entlang der Flaechen-V-Achse -> Wiederholung tauschen, sonst verzerrt
      if (rot % 2) tx.repeat.set(fv / mm, fu / mm); else tx.repeat.set(fu / mm, fv / mm);
    } else {
      // gerechnete Textur wie bisher: ~380 mm je Kachel, gespiegelt gekachelt
      const rx = Math.max(1, Math.min(4, Math.round(d[0] / 380)));
      const ry = Math.max(1, Math.min(4, Math.round(d[1] / 380)));
      tx.repeat.set(rx, ry);
      if (upright) tx.rotation = Math.PI / 2;
    }
    return tx;
  }

  // Farb- und Reliefkarte eines Bauteil-Materials setzen (auch nachtraeglich, wenn das Foto geladen ist)
  function applyPart(mat, key, part) {
    const tx = partTexture(key, part);
    const old = mat.map;
    if (old && old !== texCache[key] && old !== photoTex[key] && old.dispose) old.dispose();   // nur eigene Klone freigeben
    mat.map = tx;
    mat.bumpMap = tx;
    mat.bumpScale = photoTex[key] ? 0.03 : ((WOODS[key] || WOODS.weiss).grainStrength < 0.2 ? 0.018 : 0.06);
    mat.needsUpdate = true;
    return mat;
  }

  function onPhotoLoaded(fn) { if (listeners.indexOf(fn) < 0) listeners.push(fn); }
  function hasPhoto(key) { return !!photoTex[key]; }
  function photoStatus(key) { return photoState[key] || (WOODS[key] && WOODS[key].tex ? "offen" : "keins"); }

  function getMaterial(key) {
    if (matCache[key]) return matCache[key];
    const w = WOODS[key] || WOODS.weiss;
    loadPhoto(key);
    const tex = currentMap(key);
    const painted = w.grainStrength < 0.2;   // Dekor / lackiert
    const m = new THREEref.MeshPhysicalMaterial({
      map: tex,
      bumpMap: tex,
      bumpScale: photoTex[key] ? 0.03 : (painted ? 0.018 : 0.06),   // dezente Pore statt fusseliger Relief-Noise
      color: 0xffffff,
      roughness: painted ? w.rough : Math.max(0.62, w.rough),   // matt geoelt -> keine breite Spiegelung
      metalness: 0.0,
      clearcoat: painted ? 0.4 : 0.0,            // Massivholz geoelt, kein Klarlack -> Albedo bleibt erhalten
      clearcoatRoughness: painted ? 0.4 : 0.8,
      envMapIntensity: painted ? 0.7 : 0.13,     // dezentes IBL -> Echtholz bleibt farbsatt, waescht nicht aus, nicht speckig
    });
    matCache[key] = m;
    return m;
  }

  function getMetal() {
    if (metalMat) return metalMat;
    metalMat = new THREEref.MeshPhysicalMaterial({ color: 0xd2d6da, roughness: 0.25, metalness: 1.0, envMapIntensity: 1.0, clearcoat: 0.3, clearcoatRoughness: 0.2 });
    return metalMat;
  }

  function init(THREE, renderer) {
    THREEref = THREE;
    if (renderer) rendererRef = renderer;
  }
  function setRenderer(renderer) { rendererRef = renderer; }

  global.SchreinerMaterials = {
    init: init,
    setRenderer: setRenderer,
    WOODS: WOODS,
    getMaterial: getMaterial,
    getMetal: getMetal,
    partTexture: partTexture,
    applyPart: applyPart,
    currentMap: currentMap,
    onPhotoLoaded: onPhotoLoaded,
    hasPhoto: hasPhoto,
    photoStatus: photoStatus,
  };
})(window);
