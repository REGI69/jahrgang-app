/* =====================================================================
   RG CAD – Werkstattzeichnung (mm-basiert, massstabsgetreu)
   Bauteil-Koordinaten: x entlang L, y entlang B, Ursprung unten-links.
   viewBox-Einheit = Papier-mm  ->  Druck massstabsgetreu.
   ===================================================================== */
(function (global) {
  "use strict";

  const EDGE_COL = "#2b8a3e";
  const DIM = "#3a4654";
  const EXT = "#aab2bb";
  const PANEL_FILL = "#f3ede1";
  const PANEL_STROKE = "#7a6b50";
  const HOLE_COL = "#c92a2a";
  const CUP_COL = "#e8590c";
  const GROOVE_COL = "#1c7ed6";
  const MINIFIX = "#7048e8";
  const CONFIRMAT = "#a61e4d";
  const LAMELLO = "#9c36b5";

  // Layout in Papier-mm
  const PADT = 10;      // Titel
  const DIMB_IN = 6, DIMB_OUT = 15;   // untere Masslinien (innen Kette, aussen Gesamt)
  const DIML_IN = 6, DIML_OUT = 16;   // linke Masslinien
  const PADR = 9, PADTOP = 5;
  const A4W = 186, A4H = 273;          // nutzbare A4-Flaeche (mm)

  function P(n) { return Math.round(n * 100) / 100; }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  function mergePos(arr, tol) {
    const a = arr.slice().sort(function (x, y) { return x - y; });
    const out = [];
    a.forEach(function (v) {
      if (!out.length || (v - out[out.length - 1]) > tol) out.push(v);
    });
    return out;
  }

  // Text in mm
  function tx(x, y, s, label, anchor, color) {
    const w = String(label).length * s * 0.6 + 1.5;
    const a = anchor || "middle";
    const dx = a === "middle" ? w / 2 : (a === "end" ? w : 0);
    return '<rect x="' + P(x - dx) + '" y="' + P(y - s * 0.62) + '" width="' + P(w) + '" height="' + P(s + 1) +
      '" fill="#fff" opacity="0.88"/>' +
      '<text x="' + P(x) + '" y="' + P(y + s * 0.34) + '" text-anchor="' + a + '" font-size="' + s +
      '" font-weight="600" fill="' + (color || DIM) + '">' + label + "</text>";
  }
  function txR(x, y, s, label, color) {
    return '<g transform="translate(' + P(x) + ',' + P(y) + ') rotate(-90)">' + tx(0, 0, s, label, "middle", color) + "</g>";
  }

  function dimLine(x1, y1, x2, y2) {
    return '<line x1="' + P(x1) + '" y1="' + P(y1) + '" x2="' + P(x2) + '" y2="' + P(y2) +
      '" stroke="' + DIM + '" stroke-width="0.3" marker-start="url(#ah)" marker-end="url(#ah)"/>';
  }

  function partSVG(part, pos, qty, scaleOpt, fit) {
    const FW = (fit && fit.w) || A4W, FH = (fit && fit.h) || A4H;
    const L = part.cut[0], B = part.cut[1], T = part.cut[2];

    // Massstab bestimmen
    let S, sf, autoMode = (scaleOpt === "auto" || !scaleOpt);
    if (autoMode) {
      sf = Math.min(150 / L, 95 / B);
      sf = Math.min(sf, 1);
      S = 1 / sf;
    } else {
      S = scaleOpt;
      sf = 1 / S;
    }
    const rW = L * sf, rH = B * sf;

    const drawX = DIML_OUT + DIML_IN;
    const drawY = PADT + PADTOP;
    const drawBottom = drawY + rH;
    const vbDrawW = drawX + rW + PADR;
    const vbDrawH = drawBottom + DIMB_IN + DIMB_OUT;

    const f = part.features || { holes: [], rows: [], grooves: [], notes: [] };
    const sx = (x) => drawX + x * sf;
    const sy = (y) => drawY + rH - y * sf;

    // ---- Bohrplan-Text (unter Zeichnung) vorbereiten ----
    const matName = (global.SchreinerMaterials.WOODS[part.material] || {}).name || part.material;
    const noteLines = [];
    (f.notes || []).forEach(function (n) { wrapInto(noteLines, "• " + n, Math.max(40, vbDrawW / 1.7)); });
    const notesH = f.notes && f.notes.length ? (7 + noteLines.length * 4.2 + 3) : 2;

    const vbW = Math.max(vbDrawW, 132);
    const vbH = vbDrawH + notesH;

    const fits = (vbW <= FW && vbH <= FH);

    let svg = '<svg width="' + P(vbW) + 'mm" height="' + P(vbH) + 'mm" viewBox="0 0 ' + P(vbW) + ' ' + P(vbH) +
      '" xmlns="http://www.w3.org/2000/svg" class="part-svg">';
    svg += '<defs><marker id="ah" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto-start-reverse">' +
      '<path d="M0.4,0.7 L6.2,3 L0.4,5.3 Z" fill="' + DIM + '"/></marker></defs>';

    // Titel + Massstab
    svg += '<text x="2" y="6.6" font-size="4.2" font-weight="800" fill="#1b2733">' + esc("#" + pos + "  " + part.name) + "</text>";
    svg += '<text x="' + P(vbW - 2) + '" y="6.6" text-anchor="end" font-size="4" font-weight="800" fill="#1b6ec2">' + qty + "x</text>";
    svg += '<text x="' + P(vbW - 2) + '" y="' + P(vbH - 1.5) + '" text-anchor="end" font-size="3.1" fill="#8a94a0">M 1:' +
      (autoMode ? Math.round(S) : S) + (autoMode ? " (Auto)" : "") + "</text>";

    // Platte
    svg += '<rect x="' + P(drawX) + '" y="' + P(drawY) + '" width="' + P(rW) + '" height="' + P(rH) +
      '" fill="' + PANEL_FILL + '" stroke="' + PANEL_STROKE + '" stroke-width="0.5"/>';

    // Faser
    if (part.grain === "L" && rW > 16) {
      const gy = drawY + rH / 2;
      svg += '<line x1="' + P(sx(L * 0.32)) + '" y1="' + P(gy) + '" x2="' + P(sx(L * 0.68)) + '" y2="' + P(gy) +
        '" stroke="#cabfa3" stroke-width="0.4" marker-start="url(#ah)" marker-end="url(#ah)" opacity="0.6"/>';
    }

    // Nuten + eigenes Abstandsmass (v. Hinterkante)
    f.grooves.forEach(function (g) {
      const yC = sy(g.y1), half = (g.width * sf) / 2;
      svg += '<rect x="' + P(sx(g.x1)) + '" y="' + P(yC - half) + '" width="' + P((g.x2 - g.x1) * sf) + '" height="' + P(half * 2) +
        '" fill="rgba(28,126,214,0.16)" stroke="' + GROOVE_COL + '" stroke-width="0.3" stroke-dasharray="2 1.4"/>';
      const gEdge = g.y1 + g.width / 2;           // Nutkante Richtung Hinterkante
      const dxg = sx(g.x2) - 8;
      svg += '<line x1="' + P(dxg) + '" y1="' + P(sy(B)) + '" x2="' + P(dxg) + '" y2="' + P(sy(gEdge)) +
        '" stroke="' + GROOVE_COL + '" stroke-width="0.28" marker-start="url(#ah)" marker-end="url(#ah)"/>';
      svg += tx(dxg, (sy(B) + sy(gEdge)) / 2, 2.5, g.offset, "middle", GROOVE_COL);
    });

    // Kantenumleimer
    const e = part.edges || [0, 0, 0, 0], ins = 0.6;
    function edln(x1, y1, x2, y2) {
      return '<line x1="' + P(x1) + '" y1="' + P(y1) + '" x2="' + P(x2) + '" y2="' + P(y2) +
        '" stroke="' + EDGE_COL + '" stroke-width="1.1" stroke-linecap="round"/>';
    }
    if (e[0]) svg += edln(drawX, drawY + ins, drawX + rW, drawY + ins);
    if (e[2]) svg += edln(drawX, drawBottom - ins, drawX + rW, drawBottom - ins);
    if (e[3]) svg += edln(drawX + ins, drawY, drawX + ins, drawBottom);
    if (e[1]) svg += edln(drawX + rW - ins, drawY, drawX + rW - ins, drawBottom);

    // Auszugschienen-Kontur (Strichpunktlinie entlang der Tiefe)
    const RAIL = "#0b7285";
    (f.rails || []).forEach(function (rl) {
      const x = sx(rl.x);
      svg += '<line x1="' + P(x) + '" y1="' + P(sy(rl.y0)) + '" x2="' + P(x) + '" y2="' + P(sy(rl.y1)) +
        '" stroke="' + RAIL + '" stroke-width="0.9" stroke-dasharray="3 1.2 0.6 1.2"/>';
    });
    // Eigene Masskette der Schienen-Bohrtiefen (an der ersten Schiene)
    if (f.rails && f.rails.length) {
      const rd = Array.from(new Set((f.holes || []).filter(function (h) { return h.type === "runner"; }).map(function (h) { return Math.round(h.y); }))).sort(function (a, b) { return a - b; });
      if (rd.length) svg += chain([0].concat(rd), false, sx(f.rails[0].x) + 4, sx, sy);
    }

    // Sammeln der Masspositionen (Nut hat eigenes Mass, nicht in Hauptkette)
    const xs = [0, L], ys = [0, B];

    // Reihen (Systemlochung) zeichnen + Raster
    f.rows.forEach(function (row, ri) {
      const r = Math.max(0.55, (row.d / 2) * sf);
      let cnt = 0;
      for (let x = row.x0; x <= row.x1 + 0.1; x += row.pitch) {
        svg += '<circle cx="' + P(sx(x)) + '" cy="' + P(sy(row.y)) + '" r="' + P(r) + '" fill="#fff" stroke="' + HOLE_COL + '" stroke-width="0.3"/>';
        cnt++;
      }
      ys.push(row.y);
      xs.push(row.x0); xs.push(row.x1);
      if (ri === 0) {
        // Raster-Mass zwischen ersten zwei Loechern
        const yL = sy(row.y) - 3.5;
        svg += dimLine(sx(row.x0), yL, sx(row.x0 + row.pitch), yL);
        svg += tx((sx(row.x0) + sx(row.x0 + row.pitch)) / 2, yL - 0.6, 2.6, row.pitch, "middle");
      }
    });

    // Bohrungen + Topfband
    let cupRep = null, dowelRep = null, handleRep = null, runnerRep = null, minifixRep = null, confRep = null, lamRep = null;
    f.holes.forEach(function (h) {
      const cx = sx(h.x), cy = sy(h.y);
      if (h.type === "cup") {
        const r = (h.d / 2) * sf;
        svg += '<circle cx="' + P(cx) + '" cy="' + P(cy) + '" r="' + P(r) + '" fill="rgba(232,89,12,0.14)" stroke="' + CUP_COL + '" stroke-width="0.5"/>';
        svg += '<line x1="' + P(cx - r) + '" y1="' + P(cy) + '" x2="' + P(cx + r) + '" y2="' + P(cy) + '" stroke="' + CUP_COL + '" stroke-width="0.25"/>';
        svg += '<line x1="' + P(cx) + '" y1="' + P(cy - r) + '" x2="' + P(cx) + '" y2="' + P(cy + r) + '" stroke="' + CUP_COL + '" stroke-width="0.25"/>';
        cupRep = h;
      } else if (h.type === "minifix") {
        const r = (h.d / 2) * sf;
        svg += '<circle cx="' + P(cx) + '" cy="' + P(cy) + '" r="' + P(r) + '" fill="rgba(112,72,232,0.12)" stroke="' + MINIFIX + '" stroke-width="0.5"/>';
        svg += '<line x1="' + P(cx - r) + '" y1="' + P(cy) + '" x2="' + P(cx + r) + '" y2="' + P(cy) + '" stroke="' + MINIFIX + '" stroke-width="0.25"/>';
        svg += '<line x1="' + P(cx) + '" y1="' + P(cy - r) + '" x2="' + P(cx) + '" y2="' + P(cy + r) + '" stroke="' + MINIFIX + '" stroke-width="0.25"/>';
        minifixRep = h;
      } else if (h.type === "confirmat") {
        const r = Math.max(0.8, (h.d / 2) * sf);
        svg += '<circle cx="' + P(cx) + '" cy="' + P(cy) + '" r="' + P(r) + '" fill="#fff" stroke="' + CONFIRMAT + '" stroke-width="0.4"/>';
        svg += '<line x1="' + P(cx - r * 0.7) + '" y1="' + P(cy) + '" x2="' + P(cx + r * 0.7) + '" y2="' + P(cy) + '" stroke="' + CONFIRMAT + '" stroke-width="0.25"/>';
        svg += '<line x1="' + P(cx) + '" y1="' + P(cy - r * 0.7) + '" x2="' + P(cx) + '" y2="' + P(cy + r * 0.7) + '" stroke="' + CONFIRMAT + '" stroke-width="0.25"/>';
        confRep = h;
      } else if (h.type === "lamello") {
        const w = 4 * sf, hh = 12 * sf;
        svg += '<rect x="' + P(cx - w / 2) + '" y="' + P(cy - hh / 2) + '" width="' + P(w) + '" height="' + P(hh) + '" rx="' + P(Math.min(w, 1)) + '" fill="rgba(156,54,181,0.14)" stroke="' + LAMELLO + '" stroke-width="0.45"/>';
        lamRep = h;
      } else {
        const hc = h.type === "runner" ? RAIL : HOLE_COL;
        const r = Math.max(0.8, (h.d / 2) * sf);
        svg += '<circle cx="' + P(cx) + '" cy="' + P(cy) + '" r="' + P(r) + '" fill="#fff" stroke="' + hc + '" stroke-width="0.35"/>';
        svg += '<line x1="' + P(cx - r * 0.7) + '" y1="' + P(cy) + '" x2="' + P(cx + r * 0.7) + '" y2="' + P(cy) + '" stroke="' + hc + '" stroke-width="0.25"/>';
        svg += '<line x1="' + P(cx) + '" y1="' + P(cy - r * 0.7) + '" x2="' + P(cx) + '" y2="' + P(cy + r * 0.7) + '" stroke="' + hc + '" stroke-width="0.25"/>';
        if (h.type === "dowel") dowelRep = h; else if (h.type === "runner") runnerRep = h; else handleRep = h;
      }
      xs.push(h.x); ys.push(h.y);
    });

    // Durchmesser-Leader
    function leader(h, label, col) {
      if (!h) return "";
      const cx = sx(h.x), cy = sy(h.y);
      return tx(cx, cy - (h.d / 2) * sf - 1.6, 2.6, label, "middle", col);
    }
    svg += leader(cupRep, "Ø35", CUP_COL);
    svg += leader(dowelRep, "Ø8", HOLE_COL);
    svg += leader(handleRep, "Ø5", HOLE_COL);
    svg += leader(runnerRep, "Ø4 Schiene", RAIL);
    svg += leader(minifixRep, "Ø15 Minifix", MINIFIX);
    svg += leader(confRep, "Ø7 Confirmat", CONFIRMAT);
    svg += leader(lamRep, "Clamex", LAMELLO);

    // Griff-Bohrabstand explizit bemassen (CNC)
    const hHoles = (f.holes || []).filter(function (h) { return h.type === "handle"; });
    if (hHoles.length === 2) {
      const xa = sx(Math.min(hHoles[0].x, hHoles[1].x)), xb = sx(Math.max(hHoles[0].x, hHoles[1].x));
      const ba = Math.round(Math.abs(hHoles[0].x - hHoles[1].x));
      const yL = sy(hHoles[0].y) + 7;
      svg += dimLine(xa, yL, xb, yL);
      svg += tx((xa + xb) / 2, yL + 2.6, 2.8, "Bohrabstand " + ba, "middle", HOLE_COL);
    }

    // ---- Massketten ----
    const xPos = mergePos(xs.map(Math.round), 5);
    const yPos = mergePos(ys.map(Math.round), 5);

    // X-Kette (innen) + Gesamt (aussen) unten
    const yChain = drawBottom + DIMB_IN;
    const yTot = drawBottom + DIMB_IN + DIMB_OUT - 4;
    svg += chain(xPos, true, yChain, sx, sy, drawY, drawBottom, drawX, drawX + rW);
    // Gesamtmass
    svg += dimLine(sx(0), yTot, sx(L), yTot);
    svg += tx((sx(0) + sx(L)) / 2, yTot - 0.8, 3.4, Math.round(L), "middle");

    // Y-Kette (innen) + Gesamt (aussen) links
    const xChain = drawX - DIML_IN;
    const xTot = DIML_OUT - 4;
    svg += chain(yPos, false, xChain, sx, sy, drawX, drawX + rW, drawY, drawBottom);
    svg += '<line x1="' + P(xTot) + '" y1="' + P(sy(0)) + '" x2="' + P(xTot) + '" y2="' + P(sy(B)) +
      '" stroke="' + DIM + '" stroke-width="0.3" marker-start="url(#ah)" marker-end="url(#ah)"/>';
    svg += txR(xTot, (sy(0) + sy(B)) / 2, 3.4, Math.round(B));

    // Staerke
    svg += '<text x="2" y="' + P(drawBottom + DIMB_IN + DIMB_OUT - 1) + '" font-size="3.1" fill="#566270">St. <tspan font-weight="700" fill="#1b2733">' + T + '</tspan> · ' + esc(matName) + "</text>";

    // ---- Bohrplan unter Zeichnung ----
    if (f.notes && f.notes.length) {
      let ny = vbDrawH + 5;
      svg += '<line x1="2" y1="' + P(vbDrawH + 1.5) + '" x2="' + P(vbW - 2) + '" y2="' + P(vbDrawH + 1.5) + '" stroke="' + EXT + '" stroke-width="0.3"/>';
      svg += '<text x="2" y="' + P(ny) + '" font-size="3.2" font-weight="800" fill="#1b2733">Bohr- / Nutplan</text>';
      ny += 4.4;
      noteLines.forEach(function (ln) {
        svg += '<text x="2" y="' + P(ny) + '" font-size="3" fill="#3a4654">' + esc(ln) + "</text>";
        ny += 4.2;
      });
    }

    if (!fits) {
      svg += '<text x="' + P(vbW / 2) + '" y="3.4" text-anchor="middle" font-size="3" fill="#c92a2a">⚠ grösser als A4 – kleineren Massstab wählen</text>';
    }

    svg += "</svg>";
    return svg;
  }

  // Masskette: positions (real mm) sortiert. isX=true horizontal unten, sonst vertikal links.
  function chain(positions, isX, lineCoord, sx, sy, aMin, aMax, bMin, bMax) {
    let s = "";
    // Grundlinie
    if (isX) s += '<line x1="' + P(sx(positions[0])) + '" y1="' + P(lineCoord) + '" x2="' + P(sx(positions[positions.length - 1])) + '" y2="' + P(lineCoord) + '" stroke="' + EXT + '" stroke-width="0.25"/>';
    else s += '<line x1="' + P(lineCoord) + '" y1="' + P(sy(positions[0])) + '" x2="' + P(lineCoord) + '" y2="' + P(sy(positions[positions.length - 1])) + '" stroke="' + EXT + '" stroke-width="0.25"/>';

    for (let i = 0; i < positions.length; i++) {
      const c = isX ? sx(positions[i]) : sy(positions[i]);
      // Tick
      if (isX) s += '<line x1="' + P(c) + '" y1="' + P(lineCoord - 1.3) + '" x2="' + P(c) + '" y2="' + P(lineCoord + 1.3) + '" stroke="' + DIM + '" stroke-width="0.3"/>';
      else s += '<line x1="' + P(lineCoord - 1.3) + '" y1="' + P(c) + '" x2="' + P(lineCoord + 1.3) + '" y2="' + P(c) + '" stroke="' + DIM + '" stroke-width="0.3"/>';
      // Segmentmass
      if (i > 0) {
        const delta = positions[i] - positions[i - 1];
        const cPrev = isX ? sx(positions[i - 1]) : sy(positions[i - 1]);
        const mid = (c + cPrev) / 2;
        const alt = (i % 2) ? 1 : -1;
        if (isX) {
          s += '<line x1="' + P(cPrev) + '" y1="' + P(lineCoord) + '" x2="' + P(c) + '" y2="' + P(lineCoord) + '" stroke="' + DIM + '" stroke-width="0.28" marker-start="url(#ah)" marker-end="url(#ah)"/>';
          s += tx(mid, lineCoord + 2.4, 2.5, delta, "middle");
        } else {
          s += '<line x1="' + P(lineCoord) + '" y1="' + P(cPrev) + '" x2="' + P(lineCoord) + '" y2="' + P(c) + '" stroke="' + DIM + '" stroke-width="0.28" marker-start="url(#ah)" marker-end="url(#ah)"/>';
          s += txR(lineCoord - 2.4, mid, 2.5, delta);
        }
      }
    }
    return s;
  }

  function wrapInto(arr, text, maxChars) {
    const words = String(text).split(" ");
    let cur = "";
    words.forEach(function (w) {
      if ((cur + " " + w).trim().length > maxChars) { if (cur) arr.push(cur); cur = w; }
      else cur = (cur ? cur + " " : "") + w;
    });
    if (cur) arr.push(cur);
  }

  function groupParts(model) {
    const groups = {};
    model.parts.forEach(function (p) {
      const key = [p.name, p.material, p.cut[0], p.cut[1], p.cut[2], p.hinge || ""].join("|");
      if (!groups[key]) groups[key] = { p: p, qty: 0 };
      groups[key].qty++;
    });
    return Object.values(groups).sort(function (a, b) {
      return a.p.group.localeCompare(b.p.group) || a.p.name.localeCompare(b.p.name);
    });
  }

  function buildCards(model, scaleOpt, fit) {
    const groups = groupParts(model);
    let html = '<div class="shop-grid">';
    let pos = 1;
    groups.forEach(function (g) {
      html += '<div class="shop-card">' + partSVG(g.p, pos++, g.qty, scaleOpt || "auto", fit) + "</div>";
    });
    html += "</div>";
    return html;
  }

  const CONS_DEFS = '<defs><marker id="ah" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto-start-reverse">' +
    '<path d="M0.4,0.7 L6.2,3 L0.4,5.3 Z" fill="' + DIM + '"/></marker></defs>';
  function consRect(x, y, w, h, mode) {
    const sw = mode === "bold" ? 0.5 : (mode === "cut" ? 0.32 : 0.22);
    const da = mode === "hidden" ? ' stroke-dasharray="1.3 1"' : "";
    const col = mode === "hidden" ? "#6b7682" : "#1b2733";
    const fill = mode === "cut" ? "rgba(27,39,51,0.07)" : "none";
    return '<rect x="' + P(x) + '" y="' + P(y) + '" width="' + P(w) + '" height="' + P(h) + '" fill="' + fill + '" stroke="' + col + '" stroke-width="' + sw + '"' + da + "/>";
  }
  function cDimH(x1, x2, y, l) { return dimLine(x1, y, x2, y) + tx((x1 + x2) / 2, y - 1.4, 2.8, Math.round(l), "middle"); }
  function cDimV(y1, y2, x, l) { return dimLine(x, y1, x, y2) + txR(x - 1.4, (y1 + y2) / 2, 2.6, Math.round(l)); }
  function cLabel(x, y, t) { return '<text x="' + P(x) + '" y="' + P(y) + '" font-size="3.4" font-weight="700" fill="#1b3a5b">' + t + "</text>"; }

  function interiorYs(model, H) {
    const boden = model.parts.find(function (p) { return p.name === "Boden"; });
    const P0 = boden ? Math.round(boden.pos[1]) : 0;
    const ys = [0]; if (P0 > 4) ys.push(P0);
    model.parts.forEach(function (p) {
      if (p.group === "Innenausbau") ys.push(Math.round(p.pos[1] + p.dim[1] / 2));
      if (p.role === "drawerfront") { ys.push(Math.round(p.pos[1])); ys.push(Math.round(p.pos[1] + p.dim[1])); }
    });
    ys.push(Math.round(H));
    return Array.from(new Set(ys)).sort(function (a, b) { return a - b; }).filter(function (v, i, a) { return i === 0 || v - a[i - 1] > 6; });
  }

  // ---- Konstruktionszeichnung: orthografische Ansichten aus dem 3D-Modell (Fusion-Stil) ----
  function constructionSVG(model, areaW, areaH) {
    const parts = (model.parts || []).filter(function (p) { return p.group !== "Schublade"; });
    const W = model.bbox.w, H = model.bbox.h, D = model.bbox.d;
    let zmin = 0, zmax = D;
    parts.forEach(function (p) { zmin = Math.min(zmin, p.pos[2]); zmax = Math.max(zmax, p.pos[2] + p.dim[2]); });
    const Dr = zmax - zmin;
    const fronts = parts.filter(function (p) { return p.role === "door" || p.role === "drawerfront"; });
    function covered(x0, x1) { return fronts.some(function (fp) { return fp.pos[0] < x1 - 1 && fp.pos[0] + fp.dim[0] > x0 + 1; }); }
    function modeOf(p) { return ((p.group === "Innenausbau" || p.name === "Rueckwand") && covered(p.pos[0], p.pos[0] + p.dim[0])) ? "hidden" : undefined; }

    const GAP = 18, MT = 9, ML = 28, MB = 12;
    let s = Math.min((areaW - ML - GAP - 10) / (W + Dr), (areaH - MT - GAP - MB - 8) / (H + Dr));
    s = Math.max(0.005, s);
    const fW = W * s, fH = H * s, tH = Dr * s, sW = Dr * s;
    const ox = ML, frontY = MT + tH + GAP, topY = MT, sideX = ML + fW + GAP;

    let g = CONS_DEFS;
    parts.forEach(function (p) { g += consRect(ox + p.pos[0] * s, frontY + (H - (p.pos[1] + p.dim[1])) * s, p.dim[0] * s, p.dim[1] * s, modeOf(p)); });
    g += consRect(ox, frontY, fW, fH, "bold");
    parts.forEach(function (p) { g += consRect(ox + p.pos[0] * s, topY + (p.pos[2] - zmin) * s, p.dim[0] * s, p.dim[2] * s, modeOf(p)); });
    g += consRect(ox, topY, fW, tH, "bold");
    parts.forEach(function (p) { g += consRect(sideX + (p.pos[2] - zmin) * s, frontY + (H - (p.pos[1] + p.dim[1])) * s, p.dim[2] * s, p.dim[1] * s, modeOf(p)); });
    g += consRect(sideX, frontY, sW, fH, "bold");

    // Schnittlinie A–A (Möbelmitte) in der Vorderansicht
    const ax = ox + fW / 2;
    g += '<line x1="' + P(ax) + '" y1="' + P(frontY - 4) + '" x2="' + P(ax) + '" y2="' + P(frontY + fH + 4) + '" stroke="#1b2733" stroke-width="0.45" stroke-dasharray="3 1 0.6 1"/>';
    [frontY - 4, frontY + fH + 4].forEach(function (yy, i) {
      g += '<path d="M' + P(ax - 2.2) + ',' + P(yy) + ' L' + P(ax) + ',' + P(yy) + '" stroke="#1b2733" stroke-width="0.6"/>';
      g += '<text x="' + P(ax + 1.2) + '" y="' + P(yy + (i ? 2.6 : -0.6)) + '" font-size="3.2" font-weight="700" fill="#1b2733" font-family="Arial, Helvetica, sans-serif">A</text>';
    });
    g += cLabel(ox, frontY + fH + 6, "Vorderansicht");
    g += cLabel(ox, topY - 1.5, "Draufsicht");
    g += cLabel(sideX, topY - 1.5, "Seitenansicht");

    g += cDimH(ox, ox + fW, frontY + fH + 11, W);
    g += cDimV(frontY, frontY + fH, ox - 7, H);
    const dA = sideX + (0 - zmin) * s, dB = sideX + (D - zmin) * s;
    g += cDimH(dA, dB, frontY + fH + 11, D);
    // Innenmasse (Fach-/Sockelhoehen) – linke Innenkette
    const ys = interiorYs(model, H);
    for (let i = 1; i < ys.length; i++) {
      g += cDimV(frontY + (H - ys[i]) * s, frontY + (H - ys[i - 1]) * s, ox - 16, ys[i] - ys[i - 1]);
    }

    const vbW = Math.max(sideX + sW + 8, areaW), vbH = Math.max(frontY + fH + 18, areaH);
    return '<svg viewBox="0 0 ' + P(vbW) + ' ' + P(vbH) + '" width="' + P(vbW) + 'mm" height="' + P(vbH) +
      'mm" xmlns="http://www.w3.org/2000/svg" class="cons-svg">' + g + "</svg>";
  }

  // ---- Schnitt A–A: vertikaler Schnitt durch die Möbelmitte, wie eine Werkstatt-Schnittzeichnung ----
  // Geschnittene Teile sind schraffiert (Platten) oder als Massivholz gezeichnet, mit Materialkürzel und Stärke.
  // Massketten: links Gesamthöhe und Fachhöhen, rechts Plattenstärken und Zwischenmasse, unten Tiefe und Rückwand.
  const SECTION_DEFS =
    '<defs>' +
    '<marker id="ah" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto-start-reverse"><path d="M0.4,0.7 L6.2,3 L0.4,5.3 Z" fill="' + DIM + '"/></marker>' +
    '<pattern id="hPl" width="2.2" height="2.2" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="2.2" stroke="#55606c" stroke-width="0.28"/></pattern>' +
    '<pattern id="hHo" width="3" height="1.6" patternUnits="userSpaceOnUse"><rect width="3" height="1.6" fill="#f1dfbf"/><path d="M0 0.8 Q0.75 0.3 1.5 0.8 T3 0.8" fill="none" stroke="#b78a4e" stroke-width="0.22"/></pattern>' +
    '<pattern id="hMp" width="2" height="1.2" patternUnits="userSpaceOnUse"><rect width="2" height="1.2" fill="#f3e6cb"/><line x1="0" y1="0.6" x2="2" y2="0.6" stroke="#a88750" stroke-width="0.22"/></pattern>' +
    '</defs>';
  const MAT_KURZ = { weiss: "KF", grau: "KF", anthrazit: "KF", schwarz: "KF", eiche: "EI", eicheNatur: "KF-EI", buche: "BU", nussbaum: "NB",
    esche: "ES", ahorn: "AH", kirschbaum: "KB", multiplex: "MPX", hdf: "HDF" };
  function matInfo(key) {
    const woods = (global.SchreinerMaterials && global.SchreinerMaterials.WOODS) || {};
    const w = woods[key];
    const name = w ? w.name : String(key || "");
    let kurz = MAT_KURZ[key];
    if (!kurz) kurz = /spanplatte|dekor|beschichtet/i.test(name) ? "KF" : /hdf|rueck/i.test(name) ? "HDF" : /multiplex/i.test(name) ? "MPX" : name.slice(0, 2).toUpperCase();
    const art = kurz === "KF" || kurz === "KF-EI" || kurz === "HDF" ? "platte" : (kurz === "MPX" ? "multiplex" : "holz");
    return { kurz: kurz, name: name, art: art };
  }
  function cutRect(x, y, w, h, art) {
    const fill = art === "platte" ? "url(#hPl)" : (art === "multiplex" ? "url(#hMp)" : "url(#hHo)");
    return '<rect x="' + P(x) + '" y="' + P(y) + '" width="' + P(w) + '" height="' + P(h) + '" fill="' + fill + '" stroke="#1b2733" stroke-width="0.42"/>';
  }
  function secLabel(x, y, t, anchor) {
    return '<text x="' + P(x) + '" y="' + P(y) + '" font-size="2.7" font-weight="700" fill="#1b2733" text-anchor="' + (anchor || "middle") + '" font-family="Arial, Helvetica, sans-serif">' + esc(t) + "</text>";
  }
  function uniqSorted(arr, tol) {
    const out = [];
    arr.slice().sort(function (a, b) { return a - b; }).forEach(function (v) { if (!out.length || v - out[out.length - 1] > tol) out.push(v); });
    return out;
  }
  function sectionSVG(model, areaW, areaH) {
    const W = model.bbox.w, H = model.bbox.h, D = model.bbox.d;
    let zmin = 0, zmax = D;
    model.parts.forEach(function (p) { zmin = Math.min(zmin, p.pos[2]); zmax = Math.max(zmax, p.pos[2] + p.dim[2]); });
    const Dr = zmax - zmin;
    const cut = W / 2;
    const cutParts = model.parts.filter(function (p) { return p.group !== "Schublade" && p.pos[0] <= cut + 1 && p.pos[0] + p.dim[0] >= cut - 1; });
    const behind = model.parts.filter(function (p) { return p.group !== "Schublade" && cutParts.indexOf(p) < 0 && p.pos[0] > cut; });

    const ML = 34, MR = 26, MT = 12, MB = 20;
    let s = Math.min((areaW - ML - MR) / Dr, (areaH - MT - MB) / H);
    s = Math.max(0.01, s);
    const vW = Dr * s, vH = H * s, ox = ML, oy = MT;
    const X = function (z) { return ox + (z - zmin) * s; };
    const Y = function (y) { return oy + (H - y) * s; };

    let g = SECTION_DEFS;
    // Teile hinter der Schnittebene (z. B. rechte Seite, Traversen) grau als Hintergrund
    behind.forEach(function (p) {
      g += '<rect x="' + P(X(p.pos[2])) + '" y="' + P(Y(p.pos[1] + p.dim[1])) + '" width="' + P(p.dim[2] * s) + '" height="' + P(p.dim[1] * s) + '" fill="#e6e9ee" stroke="#9aa3ad" stroke-width="0.2"/>';
    });
    // Geschnittene Teile mit Schraffur und Beschriftung
    const labels = [];
    cutParts.forEach(function (p) {
      const x = X(p.pos[2]), y = Y(p.pos[1] + p.dim[1]), w = p.dim[2] * s, h = p.dim[1] * s;
      const mi = matInfo(p.material);
      g += cutRect(x, y, w, h, mi.art);
      const st = p.cut ? Math.round(p.cut[2]) : Math.round(Math.min(p.dim[0], p.dim[1], p.dim[2]));
      const breit = p.dim[1] >= p.dim[2] ? Math.round(p.dim[2]) : Math.round(p.dim[1]);
      const text = mi.kurz + " " + (mi.art === "holz" && breit !== st ? breit + "/" + st : st);
      labels.push({ x: x, y: y, w: w, h: h, text: text, vertical: h > w * 1.6 });
    });
    labels.forEach(function (l) {
      const fits = l.vertical ? (l.h > 14 && l.w > 3.2) : (l.w > 14 && l.h > 3.2);
      const cx = l.x + l.w / 2, cy = l.y + l.h / 2;
      if (fits) {
        const bw = l.text.length * 1.7 + 2, bh = 3.4;
        if (l.vertical) {
          g += '<rect x="' + P(cx - bh / 2) + '" y="' + P(cy - bw / 2) + '" width="' + P(bh) + '" height="' + P(bw) + '" fill="#fff" stroke="#1b2733" stroke-width="0.25"/>';
          g += '<text transform="translate(' + P(cx + 0.95) + ' ' + P(cy) + ') rotate(-90)" font-size="2.6" font-weight="700" fill="#1b2733" text-anchor="middle" font-family="Arial, Helvetica, sans-serif">' + esc(l.text) + "</text>";
        } else {
          g += '<rect x="' + P(cx - bw / 2) + '" y="' + P(cy - bh / 2) + '" width="' + P(bw) + '" height="' + P(bh) + '" fill="#fff" stroke="#1b2733" stroke-width="0.25"/>';
          g += secLabel(cx, cy + 0.95, l.text);
        }
      } else {
        // zu schmal: Hinweislinie nach rechts aus dem Möbel heraus
        const lx = ox + vW + 4, ly = cy;
        g += '<line x1="' + P(l.x + l.w) + '" y1="' + P(cy) + '" x2="' + P(lx) + '" y2="' + P(ly) + '" stroke="#1b2733" stroke-width="0.22"/>';
        g += secLabel(lx + 0.8, ly + 0.9, l.text, "start");
      }
    });
    // Fachbodenträger an Einlegeböden
    const boeden = cutParts.filter(function (p) { return /einlegeboden/i.test(p.name); });
    boeden.forEach(function (p, i) {
      const y = Y(p.pos[1]) - 1.1, x1 = X(p.pos[2]) + 2.2, x2 = X(p.pos[2] + p.dim[2]) - 2.2;
      [x1, x2].forEach(function (x) { g += '<circle cx="' + P(x) + '" cy="' + P(y) + '" r="0.9" fill="#fff" stroke="#1b2733" stroke-width="0.3"/>'; });
      if (i === boeden.length - 1) {
        g += '<line x1="' + P(x2) + '" y1="' + P(y) + '" x2="' + P(ox + vW + 4) + '" y2="' + P(y + 11) + '" stroke="#1b2733" stroke-width="0.22"/>';
        g += secLabel(ox + vW + 4.8, y + 11.9, "Fachbodenträger Ø 5", "start");
      }
    });
    g += '<rect x="' + P(ox) + '" y="' + P(oy) + '" width="' + P(vW) + '" height="' + P(vH) + '" fill="none" stroke="#1b2733" stroke-width="0.55"/>';
    g += cLabel(ox, oy - 3, "Schnitt A–A");
    g += '<text x="' + P(ox + 26) + '" y="' + P(oy - 3) + '" font-size="2.6" fill="#55606c" font-family="Arial, Helvetica, sans-serif">Möbelmitte, Blick nach rechts · Masse in mm</text>';

    // Links: Gesamthöhe und Fachhöhen
    g += cDimV(oy, oy + vH, ox - 9, H);
    const ys = interiorYs(model, H);
    for (let i = 1; i < ys.length; i++) g += cDimV(Y(ys[i]), Y(ys[i - 1]), ox - 18, ys[i] - ys[i - 1]);
    // Rechts: alle Kanten der geschnittenen Teile als Kette (Stärken und Zwischenmasse)
    const edges = [];
    cutParts.forEach(function (p) { if (p.role === "door" || p.role === "drawerfront" || p.role === "flap") return; edges.push(Math.round(p.pos[1])); edges.push(Math.round(p.pos[1] + p.dim[1])); });
    edges.push(0); edges.push(Math.round(H));
    const ye = uniqSorted(edges, 2);
    const rx = ox + vW + 16;
    for (let i = 1; i < ye.length; i++) {
      const d = ye[i] - ye[i - 1];
      if (d < 3) continue;
      g += dimLine(rx, Y(ye[i]), rx, Y(ye[i - 1]));
      g += '<text x="' + P(rx + 1.4) + '" y="' + P((Y(ye[i]) + Y(ye[i - 1])) / 2 + 0.9) + '" font-size="2.5" fill="' + DIM + '" font-family="Arial, Helvetica, sans-serif">' + d + "</text>";
    }
    // Unten: Tiefe gesamt und Kette der Tiefenkanten (Rückwand, Überstand, Sockel-Rücksprung)
    const zs = [];
    cutParts.forEach(function (p) { zs.push(Math.round(p.pos[2])); zs.push(Math.round(p.pos[2] + p.dim[2])); });
    const ze = uniqSorted(zs, 2);
    let reihe = 0;
    for (let i = 1; i < ze.length; i++) {
      const d = ze[i] - ze[i - 1];
      if (d < 3) continue;
      const breit = d * s;
      if (breit >= 9) { g += cDimH(X(ze[i - 1]), X(ze[i]), oy + vH + 7, d); reihe = 0; continue; }
      // kurzes Mass: Pfeile aussen, Zahl abwechselnd oberhalb / unterhalb der Masslinie
      const x1 = X(ze[i - 1]), x2 = X(ze[i]), yl = oy + vH + 7;
      g += '<line x1="' + P(x1) + '" y1="' + P(yl) + '" x2="' + P(x2) + '" y2="' + P(yl) + '" stroke="' + DIM + '" stroke-width="0.25"/>';
      g += '<line x1="' + P(x1) + '" y1="' + P(yl - 2) + '" x2="' + P(x1) + '" y2="' + P(yl + 2) + '" stroke="' + DIM + '" stroke-width="0.25"/>';
      g += '<line x1="' + P(x2) + '" y1="' + P(yl - 2) + '" x2="' + P(x2) + '" y2="' + P(yl + 2) + '" stroke="' + DIM + '" stroke-width="0.25"/>';
      g += tx((x1 + x2) / 2, reihe ? yl + 4.2 : yl - 1.4, 2.4, Math.round(d), "middle");
      reihe = reihe ? 0 : 1;
    }
    g += cDimH(X(0), X(D), oy + vH + 14, D);
    if (Dr - D > 2) g += '<text x="' + P(X(zmax) + 1.5) + '" y="' + P(oy + vH + 13) + '" font-size="2.3" fill="' + DIM + '" font-family="Arial, Helvetica, sans-serif">' + Math.round(Dr) + ' mit Front</text>';
    // Legende
    const ly = oy + vH + 19;
    g += '<rect x="' + P(ox) + '" y="' + P(ly) + '" width="6" height="3" fill="url(#hPl)" stroke="#1b2733" stroke-width="0.25"/>' + secLabel(ox + 7, ly + 2.4, "KF beschichtete Platte", "start");
    g += '<rect x="' + P(ox + 44) + '" y="' + P(ly) + '" width="6" height="3" fill="url(#hHo)" stroke="#1b2733" stroke-width="0.25"/>' + secLabel(ox + 51, ly + 2.4, "Massivholz / Furnier", "start");
    g += '<rect x="' + P(ox + 86) + '" y="' + P(ly) + '" width="6" height="3" fill="#e6e9ee" stroke="#9aa3ad" stroke-width="0.2"/>' + secLabel(ox + 93, ly + 2.4, "hinter der Schnittebene", "start");

    const vbW = Math.max(ox + vW + 44, areaW), vbH = Math.max(ly + 6, areaH);
    return '<svg viewBox="0 0 ' + P(vbW) + ' ' + P(vbH) + '" width="' + P(vbW) + 'mm" height="' + P(vbH) +
      'mm" xmlns="http://www.w3.org/2000/svg" class="cons-svg">' + g + "</svg>";
  }

  global.SchreinerDrawing = { partSVG: partSVG, buildCards: buildCards, groupParts: groupParts, constructionSVG: constructionSVG, sectionSVG: sectionSVG };
})(window);
