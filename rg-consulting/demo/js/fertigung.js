// Fertigung: Verschnittoptimierung, DXF für CAM/CNC, Etiketten mit Barcode, Bestellliste.
// Reine Rechen- und Zeichenfunktionen ohne Oberfläche; app.js ruft sie auf. Masse in mm.
(function (global) {
  function P(n) { return Math.round(n * 100) / 100; }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function matName(key) {
    const w = global.SchreinerMaterials && global.SchreinerMaterials.WOODS && global.SchreinerMaterials.WOODS[key];
    return w ? w.name : String(key || "");
  }

  // ---------------------------------------------------------------- Verschnitt
  // Regalverfahren (Guillotine): Teile nach Höhe sortiert in Streifen legen, Reststreifen auffüllen.
  // Faserrichtung «L» = Faser entlang der Teilelänge; die Platte hat die Faser entlang ihrer Länge.
  // Teile ohne Faserbindung (grain «-») dürfen gedreht werden.
  function verschnitt(model, opt) {
    opt = opt || {};
    const SL = opt.plateL || 2800, SB = opt.plateB || 2070, KERF = opt.kerf == null ? 4 : opt.kerf, TRIM = opt.trim == null ? 10 : opt.trim;
    const groups = {};
    (model.parts || []).forEach(function (p) {
      if (!p.cut) return;
      const key = p.material + "|" + Math.round(p.cut[2]);
      if (!groups[key]) groups[key] = { material: p.material, name: matName(p.material), t: Math.round(p.cut[2]), items: [] };
      groups[key].items.push({ id: p.id, name: p.name, L: Math.round(p.cut[0]), B: Math.round(p.cut[1]), grain: p.grain || "-", qty: 1 });
    });
    const result = { plateL: SL, plateB: SB, kerf: KERF, trim: TRIM, groups: [] };
    Object.keys(groups).forEach(function (k) {
      const g = groups[k];
      const sheets = packGroup(g.items, SL - 2 * TRIM, SB - 2 * TRIM, KERF);
      let used = 0, count = 0;
      sheets.forEach(function (s) { s.placed.forEach(function (q) { used += q.w * q.h; count++; }); });
      const gross = sheets.length * SL * SB;
      result.groups.push({ material: g.material, name: g.name, t: g.t, parts: count, sheets: sheets, nSheets: sheets.length,
        usedArea: used / 1e6, grossArea: gross / 1e6, utilization: gross ? used / gross : 0 });
    });
    result.nSheets = result.groups.reduce(function (a, g) { return a + g.nSheets; }, 0);
    return result;
  }
  function packGroup(items, W, H, kerf) {
    // Orientierung: Faser «L» → Länge bleibt entlang der Platte (w = L, h = B); sonst die für die Streifenhöhe günstigere Lage
    const list = items.map(function (it) {
      const fixed = it.grain === "L";
      let w = it.L, h = it.B;
      if (!fixed && it.B > it.L) { w = it.B; h = it.L; }
      return { it: it, w: w, h: h, rot: !fixed, placed: false };
    }).sort(function (a, b) { return b.h - a.h || b.w - a.w; });
    const sheets = [];
    list.forEach(function (r) {
      for (let s = 0; s < sheets.length; s++) { if (placeOnSheet(sheets[s], r, W, H, kerf)) return; }
      const sh = { shelves: [], placed: [], W: W, H: H };
      sheets.push(sh);
      if (!placeOnSheet(sh, r, W, H, kerf)) {
        // Teil grösser als die Platte: trotzdem eintragen, als Hinweis markiert
        sh.placed.push({ it: r.it, x: 0, y: 0, w: Math.min(r.w, W), h: Math.min(r.h, H), oversize: true });
      }
    });
    return sheets;
  }
  function placeOnSheet(sh, r, W, H, kerf) {
    // in bestehenden Streifen (auch gedreht, wenn erlaubt)
    for (let i = 0; i < sh.shelves.length; i++) {
      const s = sh.shelves[i];
      const fit = tryShelf(s, r, W, kerf);
      if (fit) { sh.placed.push({ it: r.it, x: fit.x, y: s.y, w: fit.w, h: fit.h }); s.x = fit.x + fit.w + kerf; return true; }
    }
    // neuer Streifen
    const y = sh.shelves.length ? sh.shelves[sh.shelves.length - 1].y + sh.shelves[sh.shelves.length - 1].h + kerf : 0;
    let w = r.w, h = r.h;
    if (w > W && r.rot && r.h <= W) { w = r.h; h = r.w; }
    if (w <= W && y + h <= H) {
      sh.shelves.push({ y: y, h: h, x: w + kerf });
      sh.placed.push({ it: r.it, x: 0, y: y, w: w, h: h });
      return true;
    }
    return false;
  }
  function tryShelf(s, r, W, kerf) {
    if (r.h <= s.h && s.x + r.w <= W) return { x: s.x, w: r.w, h: r.h };
    if (r.rot && r.w <= s.h && s.x + r.h <= W) return { x: s.x, w: r.h, h: r.w };
    return null;
  }
  function verschnittSVG(sheet, res, label) {
    const SL = res.plateL, SB = res.plateB, T = res.trim;
    const sc = 180 / SL;  // Zeichnungsbreite 180 mm auf Papier
    const W = SL * sc, H = SB * sc;
    let g = '<rect x="0" y="0" width="' + P(W) + '" height="' + P(H) + '" fill="#f6f2eb" stroke="#1b2733" stroke-width="0.5"/>';
    g += '<rect x="' + P(T * sc) + '" y="' + P(T * sc) + '" width="' + P((SL - 2 * T) * sc) + '" height="' + P((SB - 2 * T) * sc) + '" fill="none" stroke="#9aa3ad" stroke-width="0.2" stroke-dasharray="1.2 1"/>';
    sheet.placed.forEach(function (q) {
      const x = (T + q.x) * sc, y = (T + q.y) * sc, w = q.w * sc, h = q.h * sc;
      g += '<rect x="' + P(x) + '" y="' + P(y) + '" width="' + P(w) + '" height="' + P(h) + '" fill="' + (q.oversize ? "#fde8e5" : "#fff") + '" stroke="#1b2733" stroke-width="0.35"/>';
      if (w > 14 && h > 5) {
        g += '<text x="' + P(x + w / 2) + '" y="' + P(y + h / 2 - 0.6) + '" font-size="2.6" font-weight="700" text-anchor="middle" fill="#1b2733" font-family="Arial, Helvetica, sans-serif">' + esc(q.it.name) + "</text>";
        g += '<text x="' + P(x + w / 2) + '" y="' + P(y + h / 2 + 2.4) + '" font-size="2.3" text-anchor="middle" fill="#55606c" font-family="Arial, Helvetica, sans-serif">' + q.w + " × " + q.h + "</text>";
      } else if (w > 6 && h > 3) {
        g += '<text x="' + P(x + w / 2) + '" y="' + P(y + h / 2 + 0.9) + '" font-size="2" text-anchor="middle" fill="#1b2733" font-family="Arial, Helvetica, sans-serif">' + q.it.id + "</text>";
      }
    });
    g += '<text x="0" y="-2" font-size="3.4" font-weight="700" fill="#1b3a5b" font-family="Arial, Helvetica, sans-serif">' + esc(label) + "</text>";
    g += '<text x="' + P(W) + '" y="-2" font-size="2.6" text-anchor="end" fill="#55606c" font-family="Arial, Helvetica, sans-serif">' + SL + " × " + SB + " mm · Faser längs · Schnittfuge " + res.kerf + " mm</text>";
    return '<svg viewBox="-1 -7 ' + P(W + 2) + ' ' + P(H + 9) + '" width="' + P(W + 2) + 'mm" height="' + P(H + 9) + 'mm" xmlns="http://www.w3.org/2000/svg">' + g + "</svg>";
  }

  // ---------------------------------------------------------------- DXF (R12, mm)
  // Je Bauteil: Kontur auf Layer KONTUR, Bohrungen auf BOHR_<Ø>, Nuten auf NUT, Beschriftung auf TEXT.
  // Die Teile liegen mit Abstand nebeneinander; der Ursprung jedes Teils steht als Text dabei.
  function dxf(model, opt) {
    opt = opt || {};
    const gap = 60;
    const layers = {};
    const ents = [];
    function L(layer) { layers[layer] = 1; return layer; }
    function line(x1, y1, x2, y2, layer) { ents.push("0\nLINE\n8\n" + L(layer) + "\n10\n" + P(x1) + "\n20\n" + P(y1) + "\n30\n0\n11\n" + P(x2) + "\n21\n" + P(y2) + "\n31\n0"); }
    function circle(x, y, r, layer) { ents.push("0\nCIRCLE\n8\n" + L(layer) + "\n10\n" + P(x) + "\n20\n" + P(y) + "\n30\n0\n40\n" + P(r)); }
    function text(x, y, h, s, layer) { ents.push("0\nTEXT\n8\n" + L(layer) + "\n10\n" + P(x) + "\n20\n" + P(y) + "\n30\n0\n40\n" + P(h) + "\n1\n" + s.replace(/[\r\n]+/g, " ")); }
    const parts = (model.parts || []).filter(function (p) { return p.cut && (!opt.ids || opt.ids.indexOf(p.id) >= 0); });
    let ox = 0, oy = 0, rowH = 0, rowW = 0;
    const maxRow = 3000;
    parts.forEach(function (p) {
      const Lm = p.cut[0], B = p.cut[1], T = p.cut[2];
      if (rowW + Lm > maxRow && rowW > 0) { oy += rowH + gap; ox = 0; rowW = 0; rowH = 0; }
      // Kontur
      line(ox, oy, ox + Lm, oy, "KONTUR"); line(ox + Lm, oy, ox + Lm, oy + B, "KONTUR");
      line(ox + Lm, oy + B, ox, oy + B, "KONTUR"); line(ox, oy + B, ox, oy, "KONTUR");
      const f = p.features || { holes: [], rows: [], grooves: [] };
      (f.holes || []).forEach(function (h) { circle(ox + h.x, oy + h.y, h.d / 2, "BOHR_" + Math.round(h.d)); });
      (f.rows || []).forEach(function (r) { for (let x = r.x0; x <= r.x1 + 0.1; x += r.pitch) circle(ox + x, oy + r.y, r.d / 2, "BOHR_" + Math.round(r.d)); });
      (f.grooves || []).forEach(function (g) {
        const y0 = g.y1 - g.width / 2, y1 = g.y1 + g.width / 2;
        line(ox + g.x1, oy + y0, ox + g.x2, oy + y0, "NUT"); line(ox + g.x2, oy + y0, ox + g.x2, oy + y1, "NUT");
        line(ox + g.x2, oy + y1, ox + g.x1, oy + y1, "NUT"); line(ox + g.x1, oy + y1, ox + g.x1, oy + y0, "NUT");
        text(ox + g.x1 + 5, oy + y1 + 3, 8, "NUT " + g.width + "x" + g.depth, "TEXT");
      });
      text(ox, oy - 14, 10, "P" + p.id + " " + p.name + " " + Math.round(Lm) + "x" + Math.round(B) + "x" + Math.round(T) + " " + matName(p.material) + (p.grain === "L" ? " Faser L" : ""), "TEXT");
      ox += Lm + gap; rowW += Lm + gap; rowH = Math.max(rowH, B);
    });
    const layerTable = Object.keys(layers).map(function (n, i) { return "0\nLAYER\n2\n" + n + "\n70\n0\n62\n" + ((i % 7) + 1) + "\n6\nCONTINUOUS"; }).join("\n");
    return "0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1009\n9\n$INSUNITS\n70\n4\n0\nENDSEC\n" +
      "0\nSECTION\n2\nTABLES\n0\nTABLE\n2\nLAYER\n70\n" + Object.keys(layers).length + "\n" + layerTable + "\n0\nENDTAB\n0\nENDSEC\n" +
      "0\nSECTION\n2\nENTITIES\n" + ents.join("\n") + "\n0\nENDSEC\n0\nEOF\n";
  }

  // ---------------------------------------------------------------- Code 39 (Barcode ohne Fremdbibliothek)
  const C39 = { "0": "nnnwwnwnn", "1": "wnnwnnnnw", "2": "nnwwnnnnw", "3": "wnwwnnnnn", "4": "nnnwwnnnw", "5": "wnnwwnnnn", "6": "nnwwwnnnn", "7": "nnnwnnwnw",
    "8": "wnnwnnwnn", "9": "nnwwnnwnn", "A": "wnnnnwnnw", "B": "nnwnnwnnw", "C": "wnwnnwnnn", "D": "nnnnwwnnw", "E": "wnnnwwnnn", "F": "nnwnwwnnn",
    "G": "nnnnnwwnw", "H": "wnnnnwwnn", "I": "nnwnnwwnn", "J": "nnnnwwwnn", "K": "wnnnnnnww", "L": "nnwnnnnww", "M": "wnwnnnnwn", "N": "nnnnwnnww",
    "O": "wnnnwnnwn", "P": "nnwnwnnwn", "Q": "nnnnnnwww", "R": "wnnnnnwwn", "S": "nnwnnnwwn", "T": "nnnnwnwwn", "U": "wwnnnnnnw", "V": "nwwnnnnnw",
    "W": "wwwnnnnnn", "X": "nwnnwnnnw", "Y": "wwnnwnnnn", "Z": "nwwnwnnnn", "-": "nwnnnnwnw", ".": "wwnnnnwnn", " ": "nwwnnnwnn", "*": "nwnnwnwnn" };
  function code39(text, h) {
    const s = "*" + String(text).toUpperCase().replace(/[^0-9A-Z\-\. ]/g, "-") + "*";
    let x = 0, g = "";
    const n = 0.33, w = 0.85;   // Strichbreiten in mm
    for (let i = 0; i < s.length; i++) {
      const pat = C39[s[i]] || C39["-"];
      for (let j = 0; j < 9; j++) {
        const bw = pat[j] === "w" ? w : n;
        if (j % 2 === 0) g += '<rect x="' + P(x) + '" y="0" width="' + P(bw) + '" height="' + h + '" fill="#000"/>';
        x += bw;
      }
      x += n;
    }
    return { svg: '<svg viewBox="0 0 ' + P(x) + ' ' + h + '" width="' + P(x) + 'mm" height="' + h + 'mm" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">' + g + "</svg>", width: x };
  }

  // ---------------------------------------------------------------- Etiketten (A4, 2 × 6 à 105 × 48 mm)
  function etikettenHTML(model, info) {
    info = info || {};
    const items = [];
    (model.parts || []).forEach(function (p) { if (p.cut) items.push(p); });
    const total = items.length;
    let cells = "";
    items.forEach(function (p, i) {
      const code = (info.code || "RG") + "-" + String(p.id).padStart(3, "0");
      const bc = code39(code, 9);
      cells += "<div class='lb'>" +
        "<div class='lb-top'><b>" + esc(info.firma || "RG CAD") + "</b><span>" + esc(info.projekt || "") + "</span></div>" +
        "<div class='lb-name'>" + esc(p.name) + " <small>P" + p.id + " · " + (i + 1) + "/" + total + "</small></div>" +
        "<div class='lb-mass'>" + Math.round(p.cut[0]) + " × " + Math.round(p.cut[1]) + " × " + Math.round(p.cut[2]) + " mm</div>" +
        "<div class='lb-mat'>" + esc(matName(p.material)) + (p.edgeNote ? " · Kante " + esc(p.edgeNote) : "") + (p.grain === "L" ? " · Faser ⟶" : "") + "</div>" +
        "<div class='lb-bc'>" + bc.svg + "<span>" + esc(code) + "</span></div>" +
        "</div>";
    });
    const css = "@page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0;font-family:'Segoe UI',Arial,sans-serif;color:#111}" +
      ".sheet{width:210mm;min-height:297mm;padding:4.5mm 0 0 0;display:grid;grid-template-columns:105mm 105mm;grid-auto-rows:48mm;page-break-after:always}" +
      ".lb{padding:4mm 5mm 3mm;border:0.2mm dashed #cfcfcf;display:flex;flex-direction:column;overflow:hidden}" +
      ".lb-top{display:flex;justify-content:space-between;font-size:8pt;color:#555}.lb-top b{color:#1b3a5b}" +
      ".lb-name{font-size:12pt;font-weight:800;margin-top:1mm;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.lb-name small{font-weight:600;color:#777;font-size:8pt}" +
      ".lb-mass{font-size:15pt;font-weight:800;letter-spacing:-.01em;margin-top:.5mm}.lb-mat{font-size:8.5pt;color:#333;margin-top:.5mm}" +
      ".lb-bc{margin-top:auto;display:flex;align-items:flex-end;gap:3mm}.lb-bc svg{height:9mm;width:auto}.lb-bc span{font-family:Consolas,monospace;font-size:8pt;color:#333}" +
      "@media print{.lb{border-color:transparent}}";
    let sheets = "";
    for (let i = 0; i < cells.length; i += 1) break;
    const perSheet = 12; const parts = cells.split("<div class='lb'>").slice(1).map(function (c) { return "<div class='lb'>" + c; });
    for (let i = 0; i < parts.length; i += perSheet) sheets += "<div class='sheet'>" + parts.slice(i, i + perSheet).join("") + "</div>";
    return "<!DOCTYPE html><html lang='de'><head><meta charset='utf-8'><title>Etiketten " + esc(info.projekt || "") + "</title><style>" + css + "</style></head><body>" + sheets + "</body></html>";
  }

  // ---------------------------------------------------------------- Bestellliste
  // Positionen für Warenkorb und Bestellliste. preise: { platte(material) -> CHF/Stk., kanteM -> CHF/m }
  function bestellung(model, verschnittRes, hardwareRows, edgeByMat, preise) {
    preise = preise || {};
    const rows = [];
    (verschnittRes.groups || []).forEach(function (g) {
      rows.push({ key: "platte|" + g.material + "|" + g.t, gruppe: "Platten", artikel: g.name + " " + g.t + " mm, " + verschnittRes.plateL + " × " + verschnittRes.plateB, menge: g.nSheets, einheit: "Stk.",
        preis: preise.platte ? Math.round(preise.platte(g.material, g.t) * 100) / 100 : 0, hinweis: g.parts + " Teile, Nutzung " + Math.round(g.utilization * 100) + " %" });
    });
    Object.keys(edgeByMat || {}).forEach(function (m) {
      const mm = edgeByMat[m]; if (mm > 0) rows.push({ key: "kante|" + m, gruppe: "Kanten", artikel: "Kantenumleimer " + matName(m), menge: Math.ceil(mm / 1000 * 1.1 * 10) / 10, einheit: "m", preis: preise.kanteM || 0, hinweis: "inkl. 10 % Zugabe" });
    });
    (hardwareRows || []).forEach(function (h) { rows.push({ key: "hw|" + h.artikel + "|" + (h.art || ""), gruppe: "Beschläge", artikel: h.artikel, art: h.art || "", menge: h.menge, einheit: "Stk.", preis: h.preis || 0, hinweis: h.art ? "Art. " + h.art : "" }); });
    return rows;
  }
  function chf(x) { return (Math.round(x * 100) / 100).toFixed(2); }
  function bestellungCSV(rows) {
    const esc2 = function (v) { return '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"'; };
    return "Gruppe;Artikel;Menge;Einheit;Preis CHF;Total CHF;Hinweis\n" + rows.map(function (r) {
      return [r.gruppe, r.artikel, r.menge, r.einheit, chf(r.preis || 0), chf((r.preis || 0) * r.menge), r.hinweis].map(esc2).join(";");
    }).join("\n") + "\n";
  }
  // Summen mit Schweizer MwSt (8,1 %)
  function korbSumme(rows, mwst) {
    const netto = rows.reduce(function (a, r) { return a + (r.preis || 0) * (r.menge || 0); }, 0);
    const satz = mwst == null ? 0.081 : mwst;
    const steuer = Math.round(netto * satz * 20) / 20;   // auf 5 Rappen
    return { netto: netto, mwst: steuer, brutto: netto + steuer, satz: satz };
  }
  // Text für die Bestell-E-Mail an den Händler
  function bestellText(rows, info) {
    info = info || {};
    const s = korbSumme(rows);
    const z = ["Guten Tag", "", "Ich bestelle für das Projekt «" + (info.projekt || "") + "» folgende Artikel:", ""];
    rows.forEach(function (r) { z.push("- " + r.menge + " " + r.einheit + "  " + r.artikel + (r.art ? "  (Art. " + r.art + ")" : "") + (r.preis ? "  à CHF " + chf(r.preis) : "")); });
    z.push("", "Richtwert gemäss RG CAD: CHF " + chf(s.netto) + " netto, CHF " + chf(s.brutto) + " inkl. MwSt.", "Bitte bestätigen Sie Preise und Liefertermin.", "");
    if (info.lieferung) z.push("Lieferung: " + info.lieferung);
    if (info.absender) z.push("", info.absender);
    z.push("", "Freundliche Grüsse");
    return z.join("\n");
  }

  global.RGFertigung = { verschnitt: verschnitt, verschnittSVG: verschnittSVG, dxf: dxf, code39: code39, etikettenHTML: etikettenHTML, bestellung: bestellung, bestellungCSV: bestellungCSV, korbSumme: korbSumme, bestellText: bestellText };
})(window);
