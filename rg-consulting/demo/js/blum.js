/* =====================================================================
   RG CAD – Blum Auszugs-Katalog
   Artikelnummern systematisch, Masse nach Blum-Standard.
   WICHTIG: Preise = Richtpreise (CHF), Bohr-/Detailmasse vor Fertigung
   gegen aktuelle Blum-Montageanleitung / E-Services pruefen.
   ===================================================================== */
(function (global) {
  "use strict";

  const DISCLAIMER = "Preise = Amazon.de-Richtpreise (ca., EUR≈CHF, je Paar/Satz) – schwanken je Händler & Länge, editierbar. Artikelnummern & Bohrmasse nach Blum-Standard, vor Bestellung/Fertigung mit Blum E-Services / Montageanleitung prüfen.";

  function pad(nl) { return String(nl) + "0"; }          // 500 -> "5000"

  function priceAt(table, nl) {
    const k = Object.keys(table).map(Number).sort((a, b) => a - b);
    if (nl <= k[0]) return table[k[0]];
    if (nl >= k[k.length - 1]) return table[k[k.length - 1]];
    for (let i = 1; i < k.length; i++) {
      if (nl <= k[i]) { const a = k[i - 1], b = k[i]; return table[a] + (table[b] - table[a]) * (nl - a) / (b - a); }
    }
    return table[k[k.length - 1]];
  }

  // ---- Systemkatalog ----
  const SYSTEMS = {
    tandem550: {
      name: "TANDEM 550H Teilauszug",
      kind: "undermount", ext: "Teilauszug (3/4)", load: 30, verify: false,
      nls: [250, 270, 300, 350, 400, 450, 500, 550],
      heights: null,
      art: (nl) => "550H" + pad(nl),
      price: { 250: 8.5, 350: 9.5, 450: 11, 550: 12.5 },
      extras: () => [{ name: "Kupplung TANDEM (Satz)", art: "T51.1700.04", price: 2.8, qty: 1 }],
    },
    tandem560: {
      name: "TANDEM 560H Vollauszug + BLUMOTION",
      kind: "undermount", ext: "Vollauszug + BLUMOTION", load: 30, verify: false,
      nls: [250, 270, 300, 350, 400, 450, 500, 550, 600, 650],
      heights: null,
      art: (nl) => "560H" + pad(nl) + "B",
      price: { 250: 10, 350: 11.5, 450: 13, 550: 15, 650: 17 },
      extras: () => [{ name: "Kupplung TANDEM (Satz)", art: "T51.1700.04", price: 3.2, qty: 1 }],
    },
    movento760: {
      name: "MOVENTO 760H Vollauszug + BLUMOTION",
      kind: "undermount", ext: "Vollauszug + BLUMOTION", load: 40, verify: false,
      nls: [250, 270, 300, 350, 400, 450, 500, 550, 600, 650],
      heights: null,
      art: (nl) => "760H" + pad(nl) + "S",
      price: { 250: 30, 350: 34, 450: 38, 550: 42, 650: 47 },
      extras: () => [{ name: "Kupplung MOVENTO BLUMOTION (Satz)", art: "T60L7140", price: 6.5, qty: 1 }],
    },
    movento766: {
      name: "MOVENTO 766H Schwerlast",
      kind: "undermount", ext: "Vollauszug, 60 kg", load: 60, verify: true,
      nls: [350, 400, 450, 500, 550, 600, 650],
      heights: null,
      art: (nl) => "766H" + pad(nl) + "S",
      price: { 350: 42, 450: 48, 550: 55, 650: 62 },
      extras: () => [{ name: "Kupplung MOVENTO BLUMOTION (Satz)", art: "T60L7140", price: 6.5, qty: 1 }],
    },
    legrabox: {
      name: "LEGRABOX pure",
      kind: "box", ext: "Vollauszug + BLUMOTION", load: 40, verify: true,
      nls: [270, 300, 350, 400, 450, 500, 550, 600, 650],
      heights: { N: 66.5, M: 90.5, K: 128.5, C: 177, F: 241 },
      art: (nl, h) => "770" + h + pad(nl) + "S",
      runnerArt: (nl) => "753." + pad(nl).slice(0, 2) + "01S",
      price: { 270: 46, 350: 52, 450: 60, 550: 68, 650: 78 },
      extras: () => [
        { name: "Laufschiene-Garnitur (Vollauszug)", art: "753.*S — Ausf. prüfen", price: 22, qty: 1 },
        { name: "Frontbefestigung (Paar)", art: "ZF7M70S2", price: 4.5, qty: 1 },
      ],
    },
    tandembox: {
      name: "TANDEMBOX antaro",
      kind: "box", ext: "Vollauszug + BLUMOTION", load: 30, verify: true,
      nls: [270, 300, 350, 400, 450, 500, 550, 600, 650],
      heights: { M: 83, K: 115, D: 224 },
      art: (nl, h) => "378" + h + pad(nl) + "SA",
      runnerArt: (nl) => "578." + pad(nl).slice(0, 2) + "01B",
      price: { 270: 34, 350: 39, 450: 45, 550: 51, 650: 58 },
      extras: () => [
        { name: "Laufschiene-Garnitur (Vollauszug, BLUMOTION)", art: "578.*B — Ausf. prüfen", price: 18, qty: 1 },
        { name: "Frontbefestigung (Paar)", art: "ZSF.3502", price: 3.8, qty: 1 },
      ],
    },
  };

  const ORDER = ["tandem550", "tandem560", "movento760", "movento766", "legrabox", "tandembox"];

  function nlForDepth(sys, innerDepth) {
    // groesste Nennlaenge, die in die Korpustiefe passt (NL <= Innentiefe - 5)
    const fit = sys.nls.filter((n) => n <= innerDepth - 5);
    return fit.length ? fit[fit.length - 1] : sys.nls[0];
  }

  // Liefert komplette Spezifikation fuer eine Schublade
  // cab: { innerW, innerDepth }   opt: { height }
  function spec(sysId, opt, cab) {
    const sys = SYSTEMS[sysId] || SYSTEMS.tandem560;
    opt = opt || {};
    const innerDepth = cab.innerDepth;
    const recommendedNl = nlForDepth(sys, innerDepth);
    const nl = (opt.nl && sys.nls.indexOf(opt.nl) >= 0) ? opt.nl : recommendedNl;
    const fits = nl <= innerDepth - 5;
    const h = sys.heights ? (opt.height || Object.keys(sys.heights)[1] || Object.keys(sys.heights)[0]) : null;
    const artNo = sys.art(nl, h);
    let price = priceAt(sys.price, nl);
    const ov = global.Blum && global.Blum.overrides && global.Blum.overrides[sysId];
    if (ov && ov[nl] != null) price = ov[nl];
    const parts = [{ name: sys.name + (h ? " Höhe " + h : "") + " · NL " + nl, art: artNo, price: Math.round(price * 10) / 10, qty: 1, verify: sys.verify }];
    sys.extras().forEach((e) => parts.push(e));

    let drawer;
    if (sys.kind === "undermount") {
      drawer = {
        kind: "wood",
        widthOuter: cab.innerW - 42,
        length: nl,
        sideTh: 16, bottomTh: 16,
        note: "Holzschubkasten: Aussenbreite = Korpus-Innenbreite − 42 mm, Länge = NL " + nl,
        zargeH: 0,
      };
    } else {
      const zh = sys.heights[h];
      drawer = {
        kind: "box",
        zargeH: zh,
        innerWidth: cab.innerW - 100,       // Richtwert lichte Breite Stahlzarge
        length: nl,
        note: "Stahlzarge " + sys.name + " Höhe " + h + " (" + zh + " mm), NL " + nl + " – nur Holzfront fertigen",
      };
    }

    return {
      sysId: sysId, system: sys.name, kind: sys.kind, ext: sys.ext, load: sys.load,
      nl: nl, recommendedNl: recommendedNl, fits: fits, height: h, artNo: artNo, price: Math.round(price * 10) / 10,
      parts: parts, drawer: drawer, verify: sys.verify,
      drilling: drillingSpec(sys, nl, cab),
    };
  }

  // Bohr-/Montagemasse der Fuehrung (Standardwerte, editierbar/prüfen)
  function drillingSpec(sys, nl, cab) {
    if (sys.kind === "undermount") {
      return {
        title: "Führung " + sys.name,
        railLength: nl,
        // Befestigungspunkte entlang der Tiefe (ab Vorderkante), auf Schubkastenboden-Höhe
        fixings: [37, Math.round(nl / 2), nl - 32],
        sysHoles: "System-32 (Ø5 / Raster 32) an Korpusseite",
        notes: [
          "Unterflur-Führung am Korpusboden/-seite",
          "Befestigung Ø ~4 mm (Spanplattenschraube) bei " + [37, Math.round(nl / 2), nl - 32].join(" / ") + " mm ab VK",
          "Schubkasten-Aussenbreite = Innenbreite − 42 mm",
          "Korpus-Innentiefe ≥ NL (" + nl + " mm)",
        ],
      };
    }
    return {
      title: "Führung " + sys.name,
      railLength: nl,
      fixings: [37, nl - 32],
      sysHoles: "Frontbefestigung + Laufschiene am Korpusboden",
      notes: [
        "Stahlzarge: Laufschiene am Korpusboden, Frontkupplung lt. Montageanleitung",
        "Frontbefestigung-Bohrung lt. Blum (Höhe je Zarge)",
        "Korpus-Innentiefe ≥ NL (" + nl + " mm)",
      ],
    };
  }

  function list() { return ORDER.map((id) => Object.assign({ id: id }, SYSTEMS[id])); }

  // AVENTOS Hochklappen (Lift-Systeme) – Richtpreise CHF, Set je Klappe
  const AVENTOS = {
    hktop: { name: "AVENTOS HK top", art: "20K2…", price: 30, ext: "Hochklappe (schwenkt nach oben)" },
    hks:   { name: "AVENTOS HK-S", art: "20K1…", price: 38, ext: "kompakte Hochklappe" },
    hf:    { name: "AVENTOS HF top (Faltklappe)", art: "22F…", price: 118, ext: "2-teilige Faltklappe" },
    hs:    { name: "AVENTOS HS top (Schwenkklappe)", art: "20S…", price: 142, ext: "grosse Klappe nach oben-hinten" },
    hl:    { name: "AVENTOS HL top (Liftklappe)", art: "20L…", price: 165, ext: "Klappe hebt parallel hoch" },
  };
  const AV_ORDER = ["hktop", "hks", "hf", "hs", "hl"];

  global.Blum = {
    SYSTEMS: SYSTEMS, ORDER: ORDER, DISCLAIMER: DISCLAIMER, overrides: {},
    AVENTOS: AVENTOS,
    spec: spec, list: list, nlForDepth: nlForDepth, priceAt: priceAt,
    aventos: function (id) { return AVENTOS[id] || AVENTOS.hks; },
    aventosList: function () { return AV_ORDER.map((id) => Object.assign({ id: id }, AVENTOS[id])); },
    priceFor: function (sysId, nl) {
      const sys = SYSTEMS[sysId]; if (!sys) return 0;
      const ov = global.Blum.overrides[sysId];
      if (ov && ov[nl] != null) return ov[nl];
      return Math.round(priceAt(sys.price, nl) * 10) / 10;
    },
  };
})(window);
