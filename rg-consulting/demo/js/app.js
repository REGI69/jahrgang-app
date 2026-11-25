/* =====================================================================
   RG CAD – App: UI, Konfiguration, Stueckliste, Export
   ===================================================================== */
(function () {
  "use strict";

  const WOODS = SchreinerMaterials.WOODS;
  const PLATE_L = 2800, PLATE_B = 2070;
  const PLATE_AREA = (PLATE_L * PLATE_B) / 1e6;
  const VERSCHNITT = 0.12;

  const HW = {
    topfband:   { name: "Topfband / Scharnier", price: 3.5 },
    griff:      { name: "Griff", price: 6.0 },
    auszug:     { name: "Schubladenauszug (Paar)", price: 28.0 },
    bodentraeger: { name: "Bodentraeger", price: 0.3 },
    sockelfuss: { name: "Sockelfuss verstellbar", price: 2.5 },
    verbinder:  { name: "Verbinder / Beschlag", price: 1.2 },
  };

  const TYPE_LABELS = {
    base: "Unterschrank", wall: "Oberschrank", tall: "Hochschrank",
    shelf: "Regal", table: "Tisch",
  };

  const CONTENT_OPTIONS = [
    { v: "shelves", t: "Einlegeboeden" },
    { v: "drawers", t: "Schubladen" },
    { v: "door_l", t: "Tuer (Anschlag links)" },
    { v: "door_r", t: "Tuer (Anschlag rechts)" },
    { v: "door_double", t: "Doppeltuer" },
    { v: "klappe", t: "Klappe (Aventos)" },
    { v: "open", t: "Offen" },
  ];

  // Griffe & Knöpfe – Auswahl
  const HANDLE_TYPES = [
    { v: "buegel", t: "Bügelgriff", ic: "⊓", price: 6.0 },
    { v: "bogen", t: "Bogengriff", ic: "⌒", price: 7.5 },
    { v: "stange", t: "Stangengriff / Reling", ic: "▬", price: 9.0 },
    { v: "tgriff", t: "T-Griff", ic: "⊤", price: 5.5 },
    { v: "knopf", t: "Knopf / Knauf", ic: "●", price: 3.5 },
    { v: "muschel", t: "Muschelgriff", ic: "◗", price: 7.0 },
    { v: "profil", t: "Profilgriff (Kante)", ic: "⌐", price: 4.0 },
    { v: "grifflos", t: "Grifflos", ic: "∅", price: 0 },
  ];
  function handleLabel(v) { const o = HANDLE_TYPES.find((x) => x.v === v); return o ? o.t : "Griff"; }
  // Direkter Händler-Link (öffnet Verkäufer-Suche im Browser)
  function shopLink(q) { return "https://www.google.com/search?tbm=shop&q=" + encodeURIComponent(q); }
  function shopA(q, label) { return el("a", { class: "shop-ln", href: shopLink(q), target: "_blank", rel: "noopener noreferrer", title: "Beim Händler suchen / kaufen" }, [label || "↗"]); }

  // Farbige Flat-Icons (eigene Designs im Fusion-Stil) für den Ribbon
  const RIBBON_ICONS = {
    "btn-verschnitt": '<rect x="3" y="4" width="18" height="16" rx="1.5" fill="#e8d9bf" stroke="#9a7a4a" stroke-width="1"/><rect x="4.5" y="5.5" width="8" height="6" fill="#fff" stroke="#3b82d6" stroke-width="1"/><rect x="13.5" y="5.5" width="6" height="13" fill="#fff" stroke="#3b82d6" stroke-width="1"/><rect x="4.5" y="12.5" width="8" height="6" fill="#fff" stroke="#3b82d6" stroke-width="1"/>',
    "btn-etiketten": '<rect x="3" y="5" width="18" height="14" rx="2" fill="#fff" stroke="#3b82d6" stroke-width="1.2"/><path d="M6 9h8M6 12h5" stroke="#1b2733" stroke-width="1.2" stroke-linecap="round"/><path d="M6 16h1M8 16h.5M10 16h1.5M13 16h.5M15 16h1M17 16h1" stroke="#1b2733" stroke-width="1.6"/>',
    "btn-dxf": '<path d="M4 18h16" stroke="#9aa3ac" stroke-width="1.5" stroke-linecap="round"/><path d="M12 4v8" stroke="#e8843a" stroke-width="2" stroke-linecap="round"/><path d="M8 12h8l-4 5z" fill="#e8843a"/><circle cx="6" cy="7" r="1.5" fill="#3b82d6"/><circle cx="18" cy="7" r="1.5" fill="#3b82d6"/>',
    "btn-bestellung": '<path d="M3 5h2.5l2 10h10l2-7H7" fill="none" stroke="#1b2733" stroke-width="1.5" stroke-linejoin="round"/><circle cx="9.5" cy="19" r="1.6" fill="#1b2733"/><circle cx="16.5" cy="19" r="1.6" fill="#1b2733"/><path d="M10 11l2 2 3.5-4" stroke="#34a767" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    "btn-foto": '<rect x="3" y="7" width="18" height="12" rx="2.5" fill="#1b2733"/><circle cx="12" cy="13" r="3.6" fill="#fff"/><circle cx="12" cy="13" r="2" fill="#3b82d6"/><rect x="8" y="4.5" width="8" height="3" rx="1" fill="#1b2733"/><circle cx="18" cy="10" r="1" fill="#f5a623"/>',
    "btn-quader": '<path d="M11 3l7 4-7 4-7-4z" fill="#7db4e6"/><path d="M4 7l7 4v8l-7-4z" fill="#3b82d6"/><path d="M18 7l-7 4v8l7-4z" fill="#2c5f9e"/><circle cx="19" cy="18" r="4.6" fill="#3aa75a"/><path d="M19 15.7v4.6M16.7 18h4.6" stroke="#fff" stroke-width="1.3" stroke-linecap="round"/>',
    "btn-grundriss": '<path d="M3.5 13l4.5-7h11l-4.5 7z" fill="#9cc3ea"/><path d="M3.5 13l4.5-7h11l-4.5 7z" stroke="#3b82d6" stroke-width="0.7"/><path d="M7 10.4c2-1.5 4-1.5 6 0" stroke="#2c5f9e" stroke-width="0.9" stroke-linecap="round"/><circle cx="18.5" cy="17.5" r="4.6" fill="#3aa75a"/><path d="M18.5 15.2v4.6M16.2 17.5h4.6" stroke="#fff" stroke-width="1.3" stroke-linecap="round"/>',
    "btn-moebel-add": '<rect x="3.5" y="4" width="12" height="15" rx="1" fill="#cdaa78"/><path d="M9.5 4v15" stroke="#8a6b45" stroke-width="0.9"/><circle cx="18" cy="18" r="5" fill="#34a767"/><path d="M18 15.4v5.2M15.4 18h5.2" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>',
    "btn-bohrung": '<rect x="3" y="3" width="18" height="18" rx="2.5" fill="#cdaa78"/><circle cx="12" cy="12" r="4.2" fill="#2e3540"/><circle cx="12" cy="12" r="4.2" stroke="#e8843a" stroke-width="1"/>',
    "btn-nut": '<rect x="3" y="6" width="18" height="12" rx="1.5" fill="#cdaa78"/><rect x="7" y="6" width="6" height="6" fill="#6e5536"/>',
    "btn-mat": '<circle cx="12" cy="12" r="9" fill="#e0c08a"/><circle cx="9" cy="8.6" r="1.7" fill="#7e63cf"/><circle cx="15.4" cy="9.4" r="1.7" fill="#d9534f"/><circle cx="9.2" cy="15.4" r="1.7" fill="#34a767"/><circle cx="15.2" cy="15.2" r="1.7" fill="#3b82d6"/>',
    "btn-griffe": '<rect x="3" y="4" width="18" height="16" rx="2" fill="#cdaa78"/><rect x="6.4" y="9" width="2" height="6" rx="1" fill="#8a929b"/><rect x="15.6" y="9" width="2" height="6" rx="1" fill="#8a929b"/><rect x="6" y="10.4" width="12" height="2.6" rx="1.3" fill="#aeb6be"/>',
    "btn-explode": '<rect x="9" y="9" width="6" height="6" rx="1" fill="#3b82d6"/><path d="M12 2.4l1.7 3.2h-3.4zM12 21.6l-1.7-3.2h3.4zM2.4 12l3.2-1.7v3.4zM21.6 12l-3.2 1.7v-3.4z" fill="#e8843a"/>',
    "btn-dims": '<rect x="3" y="8.5" width="18" height="7" rx="1" fill="#e8b84a"/><path d="M7 8.5v3M11 8.5v3.6M15 8.5v3M19 8.5v3.6" stroke="#7a5a1a" stroke-width="1"/>',
    "btn-wire": '<path d="M5 8h11v11H5z" stroke="#6ea8e0" stroke-width="1.3"/><path d="M9 4h11v11M16 8l4-4M16 19l4-4" stroke="#3b82d6" stroke-width="1.3"/>',
    "btn-shot": '<rect x="3" y="7" width="18" height="12" rx="2.5" fill="#5c656e"/><rect x="8" y="4.4" width="6" height="3.2" rx="1" fill="#5c656e"/><circle cx="12" cy="13" r="3.6" fill="#3b82d6"/><circle cx="12" cy="13" r="1.6" fill="#cfe0f5"/>',
    "btn-drawers": '<rect x="3.5" y="4" width="17" height="16" rx="1.5" fill="#cdaa78"/><path d="M3.5 12h17" stroke="#8a6b45" stroke-width="0.9"/><rect x="10" y="7.4" width="4" height="1.8" rx="0.9" fill="#8a929b"/><rect x="10" y="14.4" width="4" height="1.8" rx="0.9" fill="#8a929b"/>',
    "btn-doors": '<rect x="6" y="3.5" width="12" height="17" rx="1" fill="#cdaa78"/><path d="M6 3.5h12v17H6z" stroke="#8a6b45" stroke-width="0.8"/><circle cx="14.6" cy="12" r="1.1" fill="#8a929b"/>',
    "btn-flaps": '<rect x="4" y="13" width="16" height="6" rx="1" fill="#cdaa78"/><path d="M12 4l6 7H6z" fill="#6ea8e0"/>',
    "btn-shop": '<rect x="5" y="3" width="14" height="18" rx="1.5" fill="#2c5f9e"/><path d="M8 8h8M8 12h8M8 16h5" stroke="#bcd4f0" stroke-width="1.2"/>',
    "btn-cons": '<rect x="3.5" y="3.5" width="7" height="7" rx="1" fill="#3b82d6"/><rect x="13.5" y="3.5" width="7" height="7" rx="1" fill="#34a767"/><rect x="3.5" y="13.5" width="7" height="7" rx="1" fill="#e8843a"/><rect x="13.5" y="13.5" width="7" height="7" rx="1" fill="#9aa3ac"/>',
    "btn-montage": '<rect x="10.4" y="3" width="3.2" height="9" rx="1" fill="#e8843a"/><path d="M10.4 12h3.2l-1.6 8z" fill="#9aa3ac"/>',
    "btn-print": '<path d="M6 3h12v5H6z" fill="#9aa3ac"/><rect x="3.5" y="8.5" width="17" height="7" rx="1.5" fill="#5c656e"/><rect x="6.5" y="13" width="11" height="7.5" fill="#e8eef4"/><circle cx="17" cy="11.5" r="1" fill="#34a767"/>',
    "btn-csv": '<rect x="5" y="3" width="11" height="14" rx="1.5" fill="#e8eef4"/><path d="M8 6h5M8 9h5M8 12h3" stroke="#9aa3ac" stroke-width="1"/><path d="M17 12v6M14 15.5l3 3 3-3" stroke="#34a767" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    "btn-blum": '<rect x="3" y="9" width="18" height="6" rx="1.5" fill="#aeb6be"/><rect x="3" y="9" width="18" height="2" rx="1" fill="#cfd6dd"/><circle cx="7" cy="12.4" r="1.3" fill="#5c656e"/><circle cx="17" cy="12.4" r="1.3" fill="#5c656e"/>',
    "btn-holz": '<rect x="3" y="6.5" width="18" height="11" rx="1.5" fill="#c79a6b"/><path d="M3 10.5h18M3 13.5h18" stroke="#a07c50" stroke-width="0.9"/>',
    "btn-profi": '<path d="M9.5 13.5a3.2 3.2 0 0 1 0-4.6l1.8-1.8a3.2 3.2 0 0 1 4.6 4.6l-1 1" stroke="#3b82d6" stroke-width="1.8" stroke-linecap="round"/><path d="M14.5 10.5a3.2 3.2 0 0 1 0 4.6l-1.8 1.8a3.2 3.2 0 0 1-4.6-4.6l1-1" stroke="#34a767" stroke-width="1.8" stroke-linecap="round"/>',
    "btn-fusion": '<path d="M12 3l8 4.6-8 4.6-8-4.6z" fill="#f2a868"/><path d="M4 7.6l8 4.6V21l-8-4.6z" fill="#e8843a"/><path d="M20 7.6l-8 4.6V21l8-4.6z" fill="#c96a28"/>',
  };
  const APPBAR_ICONS = {
    "btn-reset": '<path d="M3 11l9-7 9 7"/><path d="M5 9.5V20h14V9.5"/>',
    "btn-load": '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
    "btn-save": '<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v5h7"/><rect x="8" y="13" width="8" height="6"/>',
    "btn-firma": '<rect x="5" y="3" width="14" height="18"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/>',
    "ab-undo": '<path d="M9 7L4 12l5 5"/><path d="M4 12h10a5 5 0 0 1 0 10"/>',
    "ab-redo": '<path d="M15 7l5 5-5 5"/><path d="M20 12H10a5 5 0 0 0 0 10"/>',
  };
  // Hover-Popups (Titel + Erklärung) wie in Fusion
  const TOOL_TIPS = {
    "btn-quader": { t: "Quader", d: "Erstellt einen rechteckigen Volumenkörper (Breite × Tiefe × Höhe) als frei modellierbaren Körper." },
    "btn-grundriss": { t: "Skizze → Extrudieren", d: "Zeichne einen Grundriss auf der Bodenebene und ziehe ihn zu einem Volumenkörper hoch. (Esc = Abbrechen)" },
    "btn-moebel-add": { t: "Möbel hinzufügen", d: "Fügt dem Projekt ein weiteres Möbel hinzu – z. B. für eine ganze Küche oder einen Raum." },
    "btn-bohrung": { t: "Bohrung", d: "Senkrechte Bohrung (Ø und Position) in den gewählten Körper – echter CSG-Schnitt." },
    "btn-nut": { t: "Nut / Ausschnitt", d: "Schneidet eine Nut oder einen Ausschnitt (B × H × T) in den gewählten Körper." },
    "btn-mat": { t: "Holzart", d: "Material-Modus: Bauteil im 3D anklicken und die Holzart frei wählen – pro Platte einzeln." },
    "btn-griffe": { t: "Griffe & Knöpfe", d: "Grifftyp wählen: Bügel, Bogen, Reling, T-Griff, Knopf, Muschel, Profil oder grifflos – inkl. Bohrbild für die CNC." },
    "btn-explode": { t: "Explosionsansicht", d: "Zieht die Bauteile auseinander, um den Aufbau zu zeigen." },
    "btn-dims": { t: "Bemassung", d: "Blendet die Hauptmasse (Breite, Höhe, Tiefe) im 3D ein und aus." },
    "btn-wire": { t: "Drahtgitter", d: "Zeigt das Modell als Drahtgitter (nur Kanten) statt gefüllt." },
    "btn-shot": { t: "Screenshot", d: "Speichert das aktuelle 3D-Bild als PNG-Datei." },
    "btn-drawers": { t: "Auszüge", d: "Öffnet/schliesst alle Schubladen – oder einzeln per Klick auf die Schublade." },
    "btn-doors": { t: "Türen", d: "Öffnet/schliesst alle Türen – oder einzeln per Klick auf die Tür." },
    "btn-flaps": { t: "Klappen", d: "Öffnet/schliesst alle Aventos-Hochklappen." },
    "btn-shop": { t: "Werkstattzeichnung", d: "Bemasste Zeichnung jeder Platte mit Bohr- und Nutplan – druckbar als A3/A4." },
    "btn-cons": { t: "Konstruktionszeichnung", d: "Vorder-, Seiten- und Draufsicht mit Schnittlinie, dazu Schnitt A–A mit Schraffur, Materialkürzeln und Massketten." },
    "btn-montage": { t: "Montageanleitung", d: "Schritt-für-Schritt-Aufbau im IKEA-Stil mit Bildern und Teileliste je Schritt." },
    "btn-print": { t: "Übersicht", d: "3D-Ansicht zusammen mit der kompletten Stückliste zum Ausdrucken." },
    "btn-csv": { t: "Zuschnitt-CSV", d: "Exportiert die Zuschnittliste als CSV-Datei (für Tabellen/Optimierer)." },
    "btn-verschnitt": { t: "Verschnittoptimierung", d: "Legt alle Teile je Material und Stärke auf Platten (Standard 2800 × 2070, Schnittfuge 4 mm, Faser beachtet) und zeigt Plattenzahl, Nutzung und Schnittplan." },
    "btn-etiketten": { t: "Etiketten", d: "Druckt je Bauteil ein Etikett mit Mass, Material, Kante, Faser und Barcode (Code 39). A4, 2 × 6 Etiketten à 105 × 48 mm." },
    "btn-dxf": { t: "DXF für CAM / CNC", d: "Alle Teile mit Kontur, Bohrungen (Layer BOHR_Ø), Nuten (NUT) und Beschriftung als DXF, Masse in mm. Für WoodWOP, Maestro, BiesseWorks, Fusion oder jedes CAM mit DXF-Import." },
    "btn-bestellung": { t: "Warenkorb", d: "Platten aus der Verschnittoptimierung, Kantenumleimer und Beschläge mit Preisen. Mengen und Preise anpassen, Positionen abwählen, Summe mit MwSt. Bestellung per E-Mail an den Händler, als PDF oder CSV." },
    "btn-foto": { t: "Foto-Modus", d: "Echtes Raytracing der aktuellen Ansicht: weiche Schatten, Licht zwischen den Flächen, Glanz auf Lack und Metall. Bis 2560 Pixel, als PNG für Offerte und Präsentation." },
    "btn-blum": { t: "Blum-Katalog", d: "Auszug-Schienen mit Artikelnummern, Richtpreisen und Bohrmassen." },
    "btn-holz": { t: "Holzhändler & Preise", d: "Materialpreise vom Holzhändler importieren und Shop-Link öffnen." },
    "btn-profi": { t: "SchreinerProfi", d: "Übergibt das aktive Möbel an SchreinerProfi (Projekt / Offerte)." },
    "btn-fusion": { t: "Fusion 360 Export", d: "Exportiert das ganze Projekt als parametrisches Fusion-360-Modell – jede Platte als Solid." },
    "btn-reset": { t: "Ansicht zurücksetzen", d: "Passt das Möbel wieder sauber ins Bild ein und gibt die Maus frei." },
    "btn-load": { t: "Projekte", d: "Gespeicherte Projekte laden oder löschen (SQL-Datenbank)." },
    "btn-save": { t: "Projekt speichern", d: "Speichert das aktuelle Projekt in der SQL-Datenbank." },
    "btn-firma": { t: "Firma", d: "Firmendaten & Logo für die Werkstatt-/Konstruktionszeichnung." },
  };
  // Tastenkürzel je Werkzeug (Anzeige im Popup + echte Funktion)
  const SHORTCUTS = { "btn-grundriss": "S", "btn-quader": "Q", "btn-bohrung": "B", "btn-nut": "N",
    "btn-mat": "M", "btn-dims": "D", "btn-explode": "X", "btn-reset": "H", "btn-shop": "W" };
  // Kleine eigene Vorschau-Illustrationen (120×80) je Werkzeug
  const TIP_IMG = {
    "btn-quader": '<path d="M60 18l26 14-26 14-26-14z" fill="#7db4e6"/><path d="M34 32l26 14v22l-26-14z" fill="#3b82d6"/><path d="M86 32l-26 14v22l26-14z" fill="#2c5f9e"/>',
    "btn-grundriss": '<path d="M22 60l28-9 30 6-28 9z" fill="none" stroke="#9cc3ea" stroke-width="2"/><path d="M64 40V22M59 27l5-5 5 5" stroke="#3aa75a" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M74 26l20 7-20 7-20-7z" fill="#7db4e6"/>',
    "btn-bohrung": '<rect x="22" y="38" width="76" height="28" rx="3" fill="#cdaa78"/><circle cx="60" cy="52" r="7" fill="#2e3540"/><rect x="57" y="12" width="6" height="22" rx="2" fill="#9aa3ac"/><path d="M57 34h6l-3 6z" fill="#cfd6dd"/>',
    "btn-nut": '<rect x="20" y="30" width="80" height="34" rx="3" fill="#cdaa78"/><rect x="42" y="30" width="18" height="20" fill="#6e5536"/>',
    "btn-mat": '<rect x="24" y="22" width="72" height="36" rx="3" fill="#cdaa78"/><path d="M24 34h72M24 44h72" stroke="#a07c50" stroke-width="1.5"/><circle cx="42" cy="66" r="5" fill="#7e63cf"/><circle cx="58" cy="66" r="5" fill="#d9534f"/><circle cx="74" cy="66" r="5" fill="#3aa75a"/>',
    "btn-griffe": '<rect x="36" y="14" width="48" height="52" rx="4" fill="#cdaa78"/><rect x="46" y="34" width="3" height="12" rx="1.5" fill="#8a929b"/><rect x="71" y="34" width="3" height="12" rx="1.5" fill="#8a929b"/><rect x="46" y="37" width="28" height="4" rx="2" fill="#aeb6be"/>',
    "btn-explode": '<rect x="50" y="33" width="20" height="14" fill="#3b82d6"/><rect x="22" y="33" width="14" height="14" fill="#7db4e6"/><rect x="84" y="33" width="14" height="14" fill="#2c5f9e"/><path d="M40 40h7M73 40h7" stroke="#e8843a" stroke-width="2"/>',
    "btn-dims": '<rect x="34" y="22" width="52" height="34" fill="none" stroke="#d3dbe2" stroke-width="2"/><path d="M34 64h52" stroke="#e8b84a" stroke-width="1.5"/><text x="60" y="73" fill="#e8b84a" font-size="9" text-anchor="middle" font-family="sans-serif">600 mm</text>',
    "btn-drawers": '<rect x="34" y="16" width="52" height="48" rx="3" fill="#cdaa78"/><rect x="28" y="40" width="64" height="18" rx="2" fill="#b88f5e"/><rect x="55" y="47" width="10" height="3" rx="1.5" fill="#8a929b"/>',
    "btn-doors": '<rect x="46" y="16" width="34" height="48" rx="2" fill="#cdaa78"/><path d="M46 16l-16 8v40l16 8z" fill="#b88f5e"/><circle cx="74" cy="40" r="2" fill="#8a929b"/>',
    "btn-shop": '<rect x="40" y="14" width="40" height="52" rx="2" fill="#2c5f9e"/><path d="M48 26h24M48 34h24M48 42h16" stroke="#bcd4f0" stroke-width="2"/>',
    "btn-fusion": '<path d="M60 18l26 14-26 14-26-14z" fill="#f2a868"/><path d="M34 32l26 14v22l-26-14z" fill="#e8843a"/><path d="M86 32l-26 14v22l26-14z" fill="#c96a28"/>',
  };
  function wireRibbonTips() {
    let tip = document.getElementById("ri-tip");
    if (!tip) { tip = el("div", { id: "ri-tip" }); document.body.appendChild(tip); }
    let timer = null;
    function show(btn) {
      const t = TOOL_TIPS[btn.id]; if (!t) return;
      const imgInner = TIP_IMG[btn.id];
      const preview = imgInner
        ? '<svg viewBox="0 0 120 80" width="100%" height="100%" fill="none">' + imgInner + "</svg>"
        : '<svg viewBox="0 0 24 24" width="44" height="44" fill="none">' + (RIBBON_ICONS[btn.id] || APPBAR_ICONS[btn.id] || "") + "</svg>";
      const key = SHORTCUTS[btn.id] ? '<span class="rt-key">' + SHORTCUTS[btn.id] + "</span>" : "";
      tip.innerHTML = '<div class="rt-img">' + preview + '</div>'
        + '<div class="rt-head"><span class="rt-title"></span>' + key + "</div>"
        + '<div class="rt-desc"></div>';
      tip.querySelector(".rt-title").textContent = t.t;
      tip.querySelector(".rt-desc").textContent = t.d;
      tip.style.display = "block"; tip.style.left = "0px"; tip.style.top = "-999px";
      const r = btn.getBoundingClientRect();
      const tw = tip.offsetWidth;
      let x = Math.min(r.left, window.innerWidth - tw - 10);
      tip.style.left = Math.max(8, x) + "px";
      tip.style.top = (r.bottom + 8) + "px";
    }
    function hide() { clearTimeout(timer); tip.style.display = "none"; }
    document.querySelectorAll("#ribbon .ri, .appbar .ab-ic").forEach(function (btn) {
      if (btn.id && TOOL_TIPS[btn.id]) btn.removeAttribute("title");
      btn.addEventListener("mouseenter", function () { clearTimeout(timer); timer = setTimeout(function () { show(btn); }, 350); });
      btn.addEventListener("mouseleave", hide);
      btn.addEventListener("click", hide);
    });
  }
  function applyRibbonIcons() {
    // Ribbon: farbige Flat-Icons (Form-eigene Fills/Strokes)
    Object.keys(RIBBON_ICONS).forEach((id) => {
      const b = document.getElementById(id); if (!b) return;
      const ic = b.querySelector(".ri-ic"); if (!ic) return;
      ic.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26" fill="none">' + RIBBON_ICONS[id] + "</svg>";
    });
    // App-Bar: schlichte Linien-Icons in currentColor
    Object.keys(APPBAR_ICONS).forEach((id) => {
      const b = document.getElementById(id);
      if (b) b.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' + APPBAR_ICONS[id] + "</svg>";
    });
  }

  function defaults(type) {
    const common = { thickness: 19, backType: "inset", backThickness: 8, frontThickness: 19,
      material: "eiche", backMaterial: "hdf", drawerMaterial: "multiplex",
      connector: "minifix", connectorOffset: 37, connectorN: "auto", handleType: "buegel" };
    switch (type) {
      case "wall": return Object.assign({ type: "wall", width: 600, height: 720, depth: 330,
        material: "weiss", columns: [{ w: 1, type: "door_double", count: 1 }] }, common);
      case "tall": return Object.assign({ type: "tall", width: 600, height: 2000, depth: 580,
        columns: [{ w: 1, type: "door_l", count: 4 }] }, common);
      case "shelf": return Object.assign({ type: "shelf", width: 800, height: 1100, depth: 320,
        backType: "none", material: "buche", columns: [{ w: 1, type: "shelves", count: 3 }] }, common);
      case "table": return { type: "table", width: 1600, height: 750, depth: 900, thickness: 27,
        topThickness: 40, legSize: 80, apronHeight: 100, apronThickness: 25, legInset: 70, material: "eiche" };
      default: return Object.assign({ type: "base", width: 600, height: 720, depth: 560,
        plinthHeight: 100, topType: "full", columns: [{ w: 1, type: "door_l", count: 1 }] }, common);
    }
  }

  const PRESETS = [
    { name: "US Doppeltuer", cfg: () => Object.assign(defaults("base"), { columns: [{ w: 1, type: "door_double", count: 1 }] }) },
    { name: "Kommode 4 SK", cfg: () => Object.assign(defaults("base"), { width: 800, height: 820, columns: [{ w: 1, type: "drawers", count: 4 }] }) },
    { name: "Hochschrank", cfg: () => defaults("tall") },
    { name: "Buecherregal", cfg: () => Object.assign(defaults("shelf"), { width: 900, height: 1800, columns: [{ w: 1, type: "shelves", count: 5 }, { w: 1, type: "shelves", count: 5 }] }) },
    { name: "Sideboard", cfg: () => Object.assign(defaults("base"), { width: 1800, height: 720, depth: 450, columns: [{ w: 1.2, type: "door_l", count: 1 }, { w: 1, type: "drawers", count: 3 }, { w: 1.2, type: "door_r", count: 1 }] }) },
    { name: "Esstisch", cfg: () => defaults("table") },
  ];

  let project = null;        // { name, moebel:[cfg...], active } – ein Projekt enthält mehrere Möbel
  let lastVerschnitt = null; // Ergebnis der Verschnittoptimierung (für Bestellliste)
  let cfg = null;            // Live-Referenz auf das aktive Möbel (project.moebel[project.active])
  let viewer = null;
  let lastModel = null;
  let materialMode = false;
  let mpScope = "element";   // "element" = nur dieses Teil, "name" = alle gleichnamigen
  let _plateSig = "";        // Signatur der aktuellen Platten (Holzart-Liste nur bei Änderung neu aufbauen)
  let _bodiesSig = "";       // Signatur der freien Körper (CSG nur bei Änderung neu rechnen, nicht bei Möbel-Maß-Schiebern)
  let selectedBodyId = null; // zuletzt gewählter freier Körper (Ziel für Bohrung/Nut aus dem Ribbon)

  // ---------- Projekt / Mehr-Möbel ----------
  function activeCfg() { return project.moebel[project.active]; }
  function setActiveCfg(newCfg) {
    if (project.active < 0 || project.active >= project.moebel.length) project.active = Math.max(0, project.moebel.length - 1);
    project.moebel[project.active] = newCfg; cfg = newCfg;
  }

  function moebelLabel(c, i) {
    if (c && c._name) return c._name;
    const t = c ? (TYPE_LABELS[c.type] || c.type) : "Möbel";
    return (i != null ? (i + 1) + " · " : "") + t;
  }
  // Kontext-Zusatz für Export/Druck, wenn das Projekt mehrere Möbel hat
  function moebelTag() {
    return (project && project.moebel.length > 1) ? "  [Möbel " + (project.active + 1) + "/" + project.moebel.length + "]" : "";
  }

  // akzeptiert altes Einzelmöbel-cfg ODER neues Projekt-Objekt und liefert immer ein Projekt
  function migrateToProject(obj) {
    if (!obj) return null;
    if (Array.isArray(obj.moebel)) {
      if (typeof obj.active !== "number" || obj.active < 0 || obj.active >= obj.moebel.length) obj.active = 0;
      if (!obj.name) obj.name = "Projekt";
      if (!Array.isArray(obj.bodies)) obj.bodies = [];
      return obj;
    }
    return { name: "Projekt", moebel: [obj], active: 0, bodies: [] };   // altes Einzelmöbel einpacken
  }

  function loadProjectObj(p) {
    project = migrateToProject(p);
    cfg = activeCfg();
    if (cfg && !cfg.columns && cfg.type !== "table") cfg.columns = [{ w: 1, type: "door_l", count: 1 }];
    _plateSig = "";
    buildControls();
    rebuild();
  }

  function switchMoebel(i) {
    if (i === project.active) return;
    project.active = i; cfg = activeCfg(); _plateSig = "";
    buildControls(); rebuild();
  }
  function addMoebel() {
    const c = defaults("base"); c.columns = [{ w: 1, type: "door_l", count: 1 }];
    project.moebel.push(c); project.active = project.moebel.length - 1; cfg = activeCfg(); _plateSig = "";
    buildControls(); rebuild();
  }
  function dupMoebel(i) {
    const c = JSON.parse(JSON.stringify(project.moebel[i]));
    delete c._total; delete c._sig;
    c._name = (c._name || (TYPE_LABELS[c.type] || c.type)) + " (Kopie)";
    project.moebel.splice(i + 1, 0, c); project.active = i + 1; cfg = activeCfg(); _plateSig = "";
    buildControls(); rebuild();
  }
  function delMoebel(i) {
    if (project.moebel.length <= 1) return;
    if (!confirm("Möbel '" + moebelLabel(project.moebel[i], i) + "' aus dem Projekt löschen?")) return;
    project.moebel.splice(i, 1);
    if (project.active >= project.moebel.length) project.active = project.moebel.length - 1;
    cfg = activeCfg(); _plateSig = "";
    buildControls(); rebuild();
  }
  function renameMoebel(i) {
    const cur = project.moebel[i]._name || moebelLabel(project.moebel[i], i);
    const n = prompt("Name für dieses Möbel:", cur);
    if (n == null) return;
    const t = n.trim();
    if (t) project.moebel[i]._name = t; else delete project.moebel[i]._name;
    buildControls(); saveLocal();
  }

  function moebelBar() {
    const box = el("div", { class: "moebel-bar" });
    const head = el("div", { class: "sec-title with-actions" });
    head.appendChild(el("span", {}, ["Möbel im Projekt"]));
    head.appendChild(el("button", { class: "tb-mini", title: "Möbel hinzufügen", onclick: addMoebel }, ["+ Möbel"]));
    box.appendChild(head);
    const chips = el("div", { class: "moebel-chips" });
    project.moebel.forEach((c, i) => {
      const on = i === project.active;
      const chip = el("div", { class: "moebel-chip" + (on ? " on" : "") });
      chip.appendChild(el("span", { class: "mc-label", title: "Dieses Möbel bearbeiten", onclick: () => switchMoebel(i) }, [moebelLabel(c, i)]));
      if (on) {
        chip.appendChild(el("button", { class: "mc-act", title: "Umbenennen", onclick: () => renameMoebel(i) }, [RGICON("pencil")]));
        chip.appendChild(el("button", { class: "mc-act", title: "Duplizieren", onclick: () => dupMoebel(i) }, ["⧉"]));
        if (project.moebel.length > 1)
          chip.appendChild(el("button", { class: "mc-act danger", title: "Löschen", onclick: () => delMoebel(i) }, [RGICON("trash")]));
      }
      chips.appendChild(chip);
    });
    box.appendChild(chips);
    return box;
  }

  // ---------- Holzart je Platte (Liste) ----------
  function renderPlateMaterials(model) {
    const host = document.getElementById("plate-mat-body");
    if (!host) return;
    // Signatur enthält die EFFEKTIVE Holzart je Platte -> Liste aktualisiert auch bei
    // globalem Material-Wechsel oder Namens-Override, nicht nur bei geänderter Platten-Anzahl.
    const sig = model.parts.map((p) => p.matKey + ":" + p.material).join("|");
    if (sig === _plateSig && host.childNodes.length) return;   // unverändert -> DOM behalten (kein Ruckeln beim Schieben)
    _plateSig = sig;
    host.innerHTML = "";
    const woods = Object.keys(WOODS);   // inkl. HDF, damit auch die Rückwand korrekt angezeigt/wählbar ist
    let lastGroup = null;
    model.parts.forEach((p) => {
      if (p.group !== lastGroup) { host.appendChild(el("div", { class: "pm-group" }, [p.group])); lastGroup = p.group; }
      const row = el("div", { class: "pm-row", "data-id": String(p.id) });
      row.appendChild(el("span", { class: "pm-name", title: p.name }, [p.name]));
      row.appendChild(el("span", { class: "pm-dim" }, [Math.round(p.cut[0]) + "×" + Math.round(p.cut[1])]));
      const sel = el("select", { class: "pm-sel" });
      const cur = (cfg.matOv && cfg.matOv[p.matKey]) || (cfg.matOvName && cfg.matOvName[p.name]) || p.baseMaterial || p.material;
      woods.forEach((k) => { const o = el("option", { value: k }, [WOODS[k].name]); if (k === cur) o.selected = true; sel.appendChild(o); });
      const mk = p.matKey;
      sel.addEventListener("change", () => { cfg.matOv = cfg.matOv || {}; cfg.matOv[mk] = sel.value; rebuild(); });
      row.appendChild(sel);
      host.appendChild(row);
    });
  }

  // Materialkosten + Beschläge eines gebauten Modells (für Projekt-Summe)
  function costOf(model) {
    let mat = 0, hw = 0; const area = {};
    model.parts.forEach((p) => { area[p.material] = (area[p.material] || 0) + (p.cut[0] * p.cut[1]) / 1e6; });
    Object.keys(area).forEach((m) => { mat += area[m] * (1 + VERSCHNITT) * matPrice(m); });
    Object.keys(model.hardware || {}).forEach((k) => { if (HW[k]) hw += (model.hardware[k] || 0) * HW[k].price; });
    (model.blumParts || []).forEach((p) => { hw += (p.qty || 1) * (p.price || 0); });
    return mat + hw;
  }
  function moebelTotal(c, isActive, activeModel) {
    const sig = JSON.stringify(c, (k, v) => (k === "_total" || k === "_sig") ? undefined : v);
    if (isActive) { c._total = costOf(activeModel); c._sig = sig; return c._total; }
    if (c._sig === sig && typeof c._total === "number") return c._total;
    try { c._total = costOf(SchreinerBuilder.build(c)); c._sig = sig; return c._total; }
    catch (e) { return c._total || 0; }
  }

  // ---------- Fusion-Look: Browser-Baum ----------
  function fbNode(level, icon, label, opts) {
    opts = opts || {};
    const n = el("div", { class: "fb-node lvl" + level + (opts.comp ? " comp" : "") + (opts.sel ? " sel" : "") });
    n.appendChild(el("span", { class: "fb-twisty" }, [opts.twisty || ""]));
    const eye = el("span", { class: "fb-eye" + (opts.hidden ? " off" : ""), title: "Ein-/ausblenden" }, [RGICON("eye")]);
    if (opts.partId != null) {
      eye.addEventListener("click", (e) => { e.stopPropagation(); const off = eye.classList.toggle("off"); viewer.setPartVisible(opts.partId, !off); });
    }
    n.appendChild(eye);
    const FB_ICONS = { "📁": "folder", "📐": "axes", "🧊": "cube", "▫": "part", "🧩": "bodies", "▢": "box", "✂": "cut" };
    n.appendChild(el("span", { class: "fb-ic" }, [FB_ICONS[icon] ? RGICON(FB_ICONS[icon]) : icon]));
    const lb = el("span", { class: "fb-lb", title: label }, [label]);
    if (opts.onClick) lb.addEventListener("click", opts.onClick);
    n.appendChild(lb);
    if (opts.onClick) n.style.cursor = "pointer";
    return n;
  }

  function renderBrowser() {
    const host = document.getElementById("fbrowser-host");
    if (!host) return;
    host.innerHTML = "";
    const box = el("div", { class: "fbrowser" });
    box.appendChild(el("div", { class: "fb-head" }, ["BROWSER"]));
    const body = el("div", { class: "fb-body" });
    body.appendChild(fbNode(1, "📁", "Projekt: " + (project.name || "Projekt"), { comp: true, twisty: "▾" }));
    const orig = fbNode(2, "📐", "Ursprung", { twisty: "▸" });
    body.appendChild(orig);
    project.moebel.forEach((c, i) => {
      const active = i === project.active;
      body.appendChild(fbNode(2, "🧊", moebelLabel(c, i), {
        comp: true, sel: active, twisty: active ? "▾" : "▸",
        onClick: () => switchMoebel(i),
      }));
      if (active && lastModel) {
        lastModel.parts.forEach((p) => {
          body.appendChild(fbNode(3, "▫", p.name, {
            partId: p.id,
            onClick: () => { viewer.selectById(p.id); selectionInfo(p); },
          }));
        });
      }
    });
    if ((project.bodies || []).length) {
      body.appendChild(fbNode(2, "🧩", "Körper (frei)", { comp: true, twisty: "▾" }));
      project.bodies.forEach((b) => {
        body.appendChild(fbNode(3, "▢", b.name, { onClick: () => pickBody(b.id) }));
        (b.cuts || []).forEach((c) => {
          body.appendChild(fbNode(3, "✂", c.kind === "cyl" ? ("Bohrung ⌀" + (c.r * 2)) : ("Nut " + c.w + "×" + c.h), {}));
        });
      });
    }
    box.appendChild(body);
    host.appendChild(box);
  }

  // ---------- Fusion-Look: Timeline (Verlauf) ----------
  const TL_STEPS = [
    ["plinth", "Sockel", "▭"], ["carcass", "Korpus", "△"], ["back", "Rückwand", "▤"],
    ["divider", "Mittelseite", "▫"], ["shelf", "Böden", "≡"], ["runner", "Auszüge", "⇿"],
    ["drawerbox", "Schubkasten", "▥"], ["drawerfront", "Fronten", "▢"], ["door", "Türen", "❚"],
    ["handle", "Griffe", "•"],
  ];
  function renderTimeline(model) {
    const tl = document.getElementById("timeline");
    if (!tl) return;
    tl.innerHTML = "";
    const present = {};
    model.parts.forEach((p) => { const k = partKey(p); present[k] = (present[k] || 0) + 1; });
    if ((model.handles || []).length) present.handle = (present.handle || 0) + model.handles.length;
    let first = true;
    TL_STEPS.forEach((s) => {
      if (!present[s[0]]) return;
      if (!first) tl.appendChild(el("div", { class: "tl-sep" }));
      first = false;
      const node = el("div", { class: "tl-node" });
      node.appendChild(el("div", { class: "tl-ic" }, [s[2]]));
      node.appendChild(el("div", { class: "tl-lb" }, [s[1]]));
      node.addEventListener("click", () => {
        document.querySelectorAll("#timeline .tl-node").forEach((x) => x.classList.remove("on"));
        node.classList.add("on");
        const part = model.parts.find((p) => partKey(p) === s[0]);
        if (part) { viewer.selectById(part.id); selectionInfo(part); }
      });
      tl.appendChild(node);
    });
    // frei modellierte Körper als eigene Verlaufseinträge
    (project.bodies || []).forEach((b) => {
      if (!first) tl.appendChild(el("div", { class: "tl-sep" }));
      first = false;
      const node = el("div", { class: "tl-node" });
      node.appendChild(el("div", { class: "tl-ic" }, ["⬚"]));
      node.appendChild(el("div", { class: "tl-lb" }, [b.name]));
      node.addEventListener("click", () => {
        document.querySelectorAll("#timeline .tl-node").forEach((x) => x.classList.remove("on"));
        node.classList.add("on"); pickBody(b.id);
      });
      tl.appendChild(node);
    });
  }

  // ---------- Fusion-Look: ViewCube + Ribbon-Tabs ----------
  function updateViewCube() {
    const cube = document.querySelector("#viewcube .vc-cube");
    if (!cube || !viewer || !viewer.controls || !viewer.controls.getAzimuthalAngle) return;
    const az = viewer.controls.getAzimuthalAngle();
    const pol = viewer.controls.getPolarAngle();
    const rx = (pol * 180 / Math.PI) - 90;
    const ry = (az * 180 / Math.PI) - 180;   // Front = -Z zur Kamera, Links/Rechts seitenrichtig
    cube.style.transform = "rotateX(" + rx.toFixed(1) + "deg) rotateY(" + ry.toFixed(1) + "deg)";
  }
  function wireViewCube() {
    const vc = document.getElementById("viewcube");
    if (!vc) return;
    vc.addEventListener("click", (e) => {
      const t = e.target.closest("[data-view]");
      if (t && viewer) viewer.setStandardView(t.getAttribute("data-view"));
    });
  }
  const TAB_GROUPS = {
    solid:   ["ERSTELLEN", "ÄNDERN", "ANSICHT", "ANIMATION"],
    sketch:  ["ERSTELLEN", "ÄNDERN", "ANSICHT"],
    surface: ["ÄNDERN", "ANSICHT"],
    sheet:   ["ÄNDERN", "ANSICHT"],
    assemble:["ERSTELLEN", "ANSICHT", "EINFÜGEN"],
    drawing: ["DOKUMENTE", "ANSICHT"],
    utility: ["EINFÜGEN", "DOKUMENTE", "ANSICHT"],
  };
  function applyRibbonTab(tab) {
    const allow = TAB_GROUPS[tab] || TAB_GROUPS.solid;
    document.querySelectorAll("#ribbon .rb-group").forEach((g) => {
      const lbl = (g.querySelector(".rb-glabel") || {}).textContent || "";
      const key = lbl.replace(/[▾\s]/g, "");
      g.classList.toggle("hide", !allow.some((a) => key === a));
    });
    // Trenner ausblenden, wenn die folgende Gruppe versteckt ist
    document.querySelectorAll("#ribbon .rb-sep").forEach((s) => {
      let n = s.nextElementSibling;
      while (n && n.classList.contains("rb-sep")) n = n.nextElementSibling;
      s.style.display = (n && n.classList.contains("rb-group") && n.classList.contains("hide")) ? "none" : "";
    });
  }
  function wireRibbonTabs() {
    const bar = document.getElementById("ribbon-tabs");
    if (!bar) return;
    bar.addEventListener("click", (e) => {
      const t = e.target.closest(".rt");
      if (!t) return;
      bar.querySelectorAll(".rt").forEach((x) => x.classList.toggle("on", x === t));
      applyRibbonTab(t.getAttribute("data-tab"));
    });
    applyRibbonTab("solid");
  }

  // ---------- Echtes Modellieren: Volumenkörper (Skizze→Extrudieren) ----------
  let _bodyCtr = 0;
  function nextBodyId() { _bodyCtr++; return "B" + _bodyCtr + "_" + (project.bodies ? project.bodies.length : 0); }
  function showHint(text) {
    let h = document.getElementById("matmode-hint");
    if (!h) { h = el("div", { id: "matmode-hint", class: "matmode-hint" }); document.getElementById("viewport").appendChild(h); }
    h.textContent = text; h.style.display = "block";
  }
  function hideHint() { const h = document.getElementById("matmode-hint"); if (h) h.style.display = "none"; }

  function addBody(b) {
    project.bodies = project.bodies || [];
    b.id = nextBodyId();
    b.name = b.name || ("Körper " + (project.bodies.length + 1));
    project.bodies.push(b);
    saveLocal(); buildControls(); rebuild();
  }
  function addBoxNumeric() {
    const s = prompt("Quader  Breite × Tiefe × Höhe (mm)\nz. B. 600x400x200:", "600x400x200");
    if (!s) return;
    const m = s.split(/[x×,\s]+/).map(Number).filter((n) => !isNaN(n) && n > 0);
    if (m.length < 3) { alert("Bitte Breite x Tiefe x Höhe angeben."); return; }
    addBody({ kind: "box", material: cfg.material || "eiche", x: 0, y: 0, z: 0, w: m[0], d: m[1], h: m[2] });
  }
  function cancelSketchUI() {
    if (viewer && viewer.sketchMode) { viewer.cancelSketch(); viewer.render(); }
    hideHint();
  }
  function startGroundRectSketch() {
    if (!viewer) return;
    showHint("Grundriss: zwei gegenüberliegende Eckpunkte auf dem Boden anklicken (Draufsicht)  ·  Esc = Abbrechen");
    viewer.startGroundRect(function (rect) {
      hideHint();
      const hs = prompt("Höhe extrudieren (mm):", "100");
      const h = parseFloat(hs);
      if (isNaN(h) || h <= 0) { rebuild(); return; }
      addBody({ kind: "box", material: cfg.material || "eiche",
        x: Math.round(rect.x), y: 0, z: Math.round(rect.z), w: Math.round(rect.w), d: Math.round(rect.d), h: Math.round(h) });
    });
  }
  function editBodyHeight(id) {
    const b = (project.bodies || []).find((x) => x.id === id); if (!b) return;
    const s = prompt("Höhe (mm):", String(b.h)); const h = parseFloat(s);
    if (!isNaN(h) && h > 0) { b.h = Math.round(h); saveLocal(); buildControls(); rebuild(); }
  }
  function delBody(id) {
    project.bodies = (project.bodies || []).filter((b) => b.id !== id);
    saveLocal(); buildControls(); rebuild();
  }
  function clearAllBodies() {
    const n = (project.bodies || []).length;
    if (n && !confirm("Alle " + n + " freien Volumenkörper entfernen? (Das Möbel bleibt erhalten.)")) return;
    project.bodies = []; selectedBodyId = null;
    saveLocal(); buildControls(); rebuild();
  }
  function delCut(bodyId, idx) {
    const b = (project.bodies || []).find((x) => x.id === bodyId);
    if (!b || !b.cuts) return;
    b.cuts.splice(idx, 1); saveLocal(); buildControls(); rebuild();
  }
  function openCutDialog(bodyId, kind) {
    const b = (project.bodies || []).find((x) => x.id === bodyId); if (!b) return;
    if (!window.CSG) { alert("CSG-Modul nicht geladen."); return; }
    let m = document.getElementById("cut-modal");
    if (!m) { m = el("div", { id: "cut-modal", class: "firma-modal" }); document.body.appendChild(m); m.addEventListener("click", (e) => { if (e.target === m) m.style.display = "none"; }); }
    m.innerHTML = "";
    const card = el("div", { class: "firma-card" });
    card.appendChild(el("div", { class: "firma-h" }, [RGICON("cut"), " " + (kind === "cyl" ? "Bohrung" : "Nut / Ausschnitt") + " – " + b.name]));
    card.appendChild(el("div", { class: "hint" }, [kind === "cyl"
      ? "Senkrechte Bohrung (Achse Y). Position ab Körper-Ursprung (vordere-untere-linke Ecke), in mm."
      : "Nut-Ecke ab Körper-Ursprung (vordere-untere-linke Ecke); Grösse B×H×T, in mm."]));
    const f = {};
    function row(label, key, def) {
      const r = el("div", { class: "ctrl-row" });
      r.appendChild(el("label", {}, [label]));
      const inp = el("input", { type: "number", value: String(def), step: "1" });
      f[key] = inp; r.appendChild(inp); card.appendChild(r);
    }
    if (kind === "cyl") {
      row("Ø (mm)", "d", 10);
      row("X (mm)", "x", Math.round(b.w / 2));
      row("Z (mm)", "z", Math.round(b.d / 2));
      row("Y Mitte (mm)", "y", Math.round(b.h / 2));
    } else {
      row("Breite X (mm)", "w", Math.round(b.w));
      row("Höhe Y (mm)", "h", 20);
      row("Tiefe Z (mm)", "d", 40);
      row("Pos X (mm)", "x", 0);
      row("Pos Y (mm)", "y", Math.max(0, Math.round(b.h - 20)));
      row("Pos Z (mm)", "z", 0);
    }
    const btns = el("div", { class: "firma-btns" });
    btns.appendChild(el("button", { class: "btn-primary", onclick: () => {
      b.cuts = b.cuts || [];
      if (kind === "cyl") {
        const dd = +f.d.value || 10;
        b.cuts.push({ kind: "cyl", r: Math.max(0.5, dd / 2), x: +f.x.value || 0, z: +f.z.value || 0, y: +f.y.value || Math.round(b.h / 2) });
      } else {
        b.cuts.push({ kind: "box", w: Math.max(1, +f.w.value || 1), h: Math.max(1, +f.h.value || 1), d: Math.max(1, +f.d.value || 1),
          x: +f.x.value || 0, y: +f.y.value || 0, z: +f.z.value || 0 });
      }
      saveLocal(); m.style.display = "none"; buildControls(); rebuild();
      if (viewer && viewer._cutErrors && viewer._cutErrors[b.id]) {
        showHint("⚠ Schnitt nicht anwendbar (liegt ausserhalb oder zu gross) – ignoriert.");
        setTimeout(hideHint, 3500);
      }
    } }, ["Anwenden"]));
    btns.appendChild(el("button", { class: "btn-sec", onclick: () => { m.style.display = "none"; } }, ["Abbrechen"]));
    card.appendChild(btns); m.appendChild(card); m.style.display = "flex";
  }
  function openHandlePicker() {
    let m = document.getElementById("handle-modal");
    if (!m) { m = el("div", { id: "handle-modal", class: "firma-modal" }); document.body.appendChild(m); m.addEventListener("click", (e) => { if (e.target === m) m.style.display = "none"; }); }
    m.innerHTML = "";
    const card = el("div", { class: "firma-card matpick-card" });
    const head = el("div", { class: "detail-head" });
    head.appendChild(el("span", { class: "detail-title" }, [RGICON("handle"), " Griffe & Knöpfe"]));
    head.appendChild(el("div", { class: "shop-spacer" }));
    head.appendChild(el("button", { class: "btn-sec", onclick: () => { m.style.display = "none"; } }, [RGICON("x")]));
    card.appendChild(head);
    card.appendChild(el("div", { class: "mp-sub" }, ["Gilt für alle Türen, Schubladen und Klappen dieses Möbels."]));
    const grid = el("div", { class: "mp-grid" });
    HANDLE_TYPES.forEach((o) => {
      const sel = (cfg.handleType || "buegel") === o.v;
      const tile = el("button", { class: "mp-swatch" + (sel ? " sel" : ""), onclick: () => {
        cfg.handleType = o.v; saveLocal(); buildControls(); rebuild(); openHandlePicker();
      } });
      tile.appendChild(el("span", { class: "mp-chip handle-ic" }, [o.ic]));
      tile.appendChild(el("span", { class: "mp-name" }, [o.t]));
      tile.appendChild(el("span", { class: "mp-price" }, [o.price ? o.price.toFixed(2) + " CHF" : "—"]));
      grid.appendChild(tile);
    });
    card.appendChild(grid);
    m.appendChild(card); m.style.display = "flex";
  }

  function pickBody(id) { selectedBodyId = id; if (viewer) viewer.selectBody(id); }
  function cutSelectedOrLast(kind) {
    const bs = project.bodies || [];
    if (!bs.length) { showHint("Erst einen Körper anlegen (Quader oder Skizze)."); setTimeout(hideHint, 3000); return; }
    const id = (selectedBodyId && bs.some((b) => b.id === selectedBodyId)) ? selectedBodyId : bs[bs.length - 1].id;
    openCutDialog(id, kind);
  }
  function bodyMatRow(b) {
    const sel = el("select", { class: "pm-sel" });
    Object.keys(WOODS).forEach((k) => { const o = el("option", { value: k }, [WOODS[k].name]); if (k === b.material) o.selected = true; sel.appendChild(o); });
    sel.addEventListener("change", () => { b.material = sel.value; saveLocal(); rebuild(); });
    return sel;
  }
  function modelingSection() {
    const box = el("div", {});
    box.appendChild(sectionTitle("Modellieren (Volumenkörper)"));
    const row = el("div", { class: "model-tools" });
    row.appendChild(el("button", { class: "preset-btn", onclick: startGroundRectSketch }, [RGICON("pencil"), " Grundriss → Extrudieren"]));
    row.appendChild(el("button", { class: "preset-btn", onclick: addBoxNumeric }, ["+ Quader (B×T×H)"]));
    box.appendChild(row);
    if ((project.bodies || []).length) {
      box.appendChild(el("button", { class: "clear-bodies-btn", title: "Entfernt alle freien Körper – nur das Möbel bleibt",
        onclick: clearAllBodies }, [RGICON("trash"), " Alle Körper entfernen (" + project.bodies.length + ")"]));
    }
    (project.bodies || []).forEach((b) => {
      const r = el("div", { class: "body-row" });
      const nm = el("span", { class: "body-nm", title: "Auswählen", onclick: () => pickBody(b.id) },
        [b.name + "  " + b.w + "×" + b.d + "×" + b.h]);
      r.appendChild(nm);
      r.appendChild(bodyMatRow(b));
      r.appendChild(el("button", { class: "body-act", title: "Höhe ändern", onclick: () => editBodyHeight(b.id) }, [RGICON("height")]));
      r.appendChild(el("button", { class: "body-act danger", title: "Löschen", onclick: () => delBody(b.id) }, [RGICON("trash")]));
      box.appendChild(r);
      // Schnitte (Bohren / Nuten)
      const cr = el("div", { class: "cut-row" });
      cr.appendChild(el("button", { class: "cut-btn", title: "Senkrechte Bohrung", onclick: () => openCutDialog(b.id, "cyl") }, ["⌀ Bohrung"]));
      cr.appendChild(el("button", { class: "cut-btn", title: "Nut / Ausschnitt", onclick: () => openCutDialog(b.id, "box") }, ["▭ Nut"]));
      box.appendChild(cr);
      (b.cuts || []).forEach((c, ci) => {
        const cl = el("div", { class: "cut-item" });
        const lbl = c.kind === "cyl"
          ? ("⌀" + (c.r * 2) + " @ X" + c.x + " Z" + c.z + (c.y != null ? " Y" + c.y : ""))
          : ("Nut " + c.w + "×" + c.h + "×" + c.d + " @ " + c.x + "," + c.y + "," + c.z);
        cl.appendChild(el("span", {}, [lbl]));
        cl.appendChild(el("button", { class: "body-act danger", title: "Schnitt löschen", onclick: () => delCut(b.id, ci) }, [RGICON("trash")]));
        box.appendChild(cl);
      });
    });
    return box;
  }

  function el(tag, attrs, kids) {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === "class") e.className = attrs[k];
      else if (k === "html") e.innerHTML = attrs[k];
      else if (k.slice(0, 2) === "on") e.addEventListener(k.slice(2), attrs[k]);
      else e.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach((c) => e.appendChild(typeof c === "string" ? document.createTextNode(c) : c));
    return e;
  }

  function rebuild() {
    try {
      if (!cfg.matOv) cfg.matOv = {};
      if (!cfg.matOvName) cfg.matOvName = {};
      lastModel = SchreinerBuilder.build(cfg);
      // verwaiste Holzart-Overrides entfernen: ändert sich die Platten-Anzahl/Reihenfolge
      // (Spalten/Schubladen geändert), verschieben sich die matKey-Indizes -> alte Keys wegräumen,
      // damit sie sich nicht still auf falsche Platten legen oder als Müll mitgespeichert werden.
      const okKey = {}, okName = {};
      lastModel.parts.forEach((p) => { okKey[p.matKey] = 1; okName[p.name] = 1; });
      Object.keys(cfg.matOv).forEach((k) => { if (!okKey[k]) delete cfg.matOv[k]; });
      Object.keys(cfg.matOvName).forEach((n) => { if (!okName[n]) delete cfg.matOvName[n]; });
      viewer.setModel(lastModel);
      if (!project.bodies) project.bodies = [];
      // CSG nur neu rechnen, wenn sich die Körper geändert haben (nicht bei jedem Möbel-Schieber-Tick)
      const bsig = JSON.stringify(project.bodies);
      if (bsig !== _bodiesSig) { _bodiesSig = bsig; viewer.setBodies(project.bodies); }
      renderCutList(lastModel);
      renderPlateMaterials(lastModel);
      renderBrowser();
      renderTimeline(lastModel);
      const docEl = document.getElementById("ab-doc");
      if (docEl) docEl.textContent = "RG CAD – " + (project.name || "Projekt") + "  ·  " + moebelLabel(activeCfg(), project.active);
      saveLocal();
    } catch (err) {
      console.error(err);
    }
  }

  // ---------- Linke Steuerung ----------
  function buildControls() {
    const p = document.getElementById("panel-left");
    p.innerHTML = "";

    // Fusion-Look: Browser-Baum (wird in rebuild() befüllt)
    p.appendChild(el("div", { id: "fbrowser-host" }));

    // Möbel im Projekt (mehrere Möbel pro Projekt)
    p.appendChild(moebelBar());

    // Vorlagen
    p.appendChild(sectionTitle("Vorlagen"));
    const pr = el("div", { class: "preset-grid" });
    PRESETS.forEach((preset) => {
      pr.appendChild(el("button", { class: "preset-btn", onclick: () => { setActiveCfg(preset.cfg()); buildControls(); rebuild(); } }, [preset.name]));
    });
    p.appendChild(pr);

    // Moebeltyp
    p.appendChild(sectionTitle("Moebeltyp"));
    const tg = el("div", { class: "type-grid" });
    ["base", "wall", "tall", "shelf", "table"].forEach((tp) => {
      const active = cfg.type === tp ? " active" : "";
      tg.appendChild(el("button", { class: "type-btn" + active, onclick: () => {
        const keepMat = cfg.material;
        const nc = defaults(tp);
        nc.material = keepMat;
        setActiveCfg(nc);
        buildControls(); rebuild();
      } }, [TYPE_LABELS[tp]]));
    });
    p.appendChild(tg);

    // Abmessungen
    p.appendChild(sectionTitle("Abmessungen (mm)"));
    p.appendChild(dimRow("Breite", "width", 200, 3000));
    p.appendChild(dimRow("Hoehe", "height", 200, 2600));
    p.appendChild(dimRow("Tiefe", "depth", 150, 1200));

    if (cfg.type === "table") {
      p.appendChild(sectionTitle("Tisch-Konstruktion"));
      p.appendChild(numRow("Plattenstaerke", "topThickness", 18, 80));
      p.appendChild(numRow("Beinquerschnitt", "legSize", 40, 140));
      p.appendChild(numRow("Zargenhoehe", "apronHeight", 50, 200));
      p.appendChild(numRow("Bein-Einzug", "legInset", 20, 300));
      p.appendChild(matRow("Material", "material"));
    } else {
      p.appendChild(sectionTitle("Korpus"));
      p.appendChild(selRow("Plattenstaerke", "thickness", [[16, "16 mm"], [18, "18 mm"], [19, "19 mm"], [25, "25 mm"]]));
      p.appendChild(selRow("Rueckwand", "backType", [["inset", "eingenutet"], ["overlay", "aufgesetzt"], ["none", "keine"]]));
      if (cfg.type === "base") {
        p.appendChild(numRow("Sockelhoehe", "plinthHeight", 0, 250));
        p.appendChild(selRow("Oberseite", "topType", [["full", "Deckel"], ["rails", "Traversen"]]));
      }
      p.appendChild(matRow("Korpus-Material", "material"));
      p.appendChild(sectionTitle("Korpusverbinder"));
      p.appendChild(selRow("Typ", "connector", [["minifix", "Minifix + Dübel"], ["dowel", "nur Dübel"], ["confirmat", "Confirmat"], ["lamello", "Lamello Clamex"]]));
      p.appendChild(numRow("Randabstand", "connectorOffset", 10, 150));
      p.appendChild(selRow("Anzahl/Verb.", "connectorN", [["auto", "Auto (Tiefe)"], ["2", "2"], ["3", "3"]]));
      p.appendChild(sectionTitle("Griffe & Knöpfe"));
      p.appendChild(selRow("Typ", "handleType", HANDLE_TYPES.map((o) => [o.v, o.t])));
      p.appendChild(el("button", { class: "preset-btn", style: "width:100%;margin-top:4px", onclick: openHandlePicker }, [RGICON("handle"), " Griff-Auswahl öffnen"]));
      p.appendChild(buildColumnsEditor());
    }

    // Echtes Modellieren (frei) – unabhängig vom Möbeltyp
    p.appendChild(modelingSection());
  }

  function sectionTitle(t) { return el("div", { class: "sec-title" }, [t]); }

  function dimRow(label, key, min, max) {
    const wrap = el("div", { class: "ctrl-row" });
    wrap.appendChild(el("label", {}, [label]));
    const box = el("div", { class: "dim-box" });
    const num = el("input", { type: "number", value: cfg[key], min: min, max: max, step: 1 });
    const rng = el("input", { type: "range", value: cfg[key], min: min, max: max, step: 1, class: "rng" });
    function set(v) { v = Math.max(min, Math.min(max, +v || min)); cfg[key] = v; num.value = v; rng.value = v; rebuild(); }
    num.addEventListener("input", () => set(num.value));
    rng.addEventListener("input", () => set(rng.value));
    box.appendChild(num); box.appendChild(rng);
    wrap.appendChild(box);
    return wrap;
  }

  function numRow(label, key, min, max) {
    const wrap = el("div", { class: "ctrl-row" });
    wrap.appendChild(el("label", {}, [label]));
    const num = el("input", { type: "number", value: cfg[key], min: min, max: max, step: 1, class: "num-only" });
    num.addEventListener("input", () => { cfg[key] = Math.max(min, Math.min(max, +num.value || min)); rebuild(); });
    wrap.appendChild(num);
    return wrap;
  }

  function selRow(label, key, opts) {
    const wrap = el("div", { class: "ctrl-row" });
    wrap.appendChild(el("label", {}, [label]));
    const sel = el("select", {});
    opts.forEach((o) => {
      const opt = el("option", { value: o[0] }, [o[1]]);
      if (String(cfg[key]) === String(o[0])) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.addEventListener("change", () => {
      const v = sel.value;
      cfg[key] = isNaN(+v) ? v : +v;
      rebuild();
    });
    wrap.appendChild(sel);
    return wrap;
  }

  function matRow(label, key) {
    const wrap = el("div", { class: "ctrl-row" });
    wrap.appendChild(el("label", {}, [label]));
    const sel = el("select", {});
    Object.keys(WOODS).forEach((k) => {
      if (k === "hdf") return;
      const opt = el("option", { value: k }, [WOODS[k].name]);
      if (cfg[key] === k) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.addEventListener("change", () => { cfg[key] = sel.value; _plateSig = ""; rebuild(); });   // globale Holzart -> Platten-Liste neu
    wrap.appendChild(sel);
    return wrap;
  }

  function buildColumnsEditor() {
    const box = el("div", {});
    const head = el("div", { class: "sec-title with-actions" });
    head.appendChild(el("span", {}, ["Spalten / Faecher"]));
    const ctr = el("div", { class: "counter" });
    ctr.appendChild(el("button", { class: "mini", onclick: () => {
      if (cfg.columns.length > 1) { cfg.columns.pop(); buildControls(); rebuild(); }
    } }, ["−"]));
    ctr.appendChild(el("span", { class: "cnt" }, [String(cfg.columns.length)]));
    ctr.appendChild(el("button", { class: "mini", onclick: () => {
      if (cfg.columns.length < 6) { cfg.columns.push({ w: 1, type: "shelves", count: 2 }); buildControls(); rebuild(); }
    } }, ["+"]));
    head.appendChild(ctr);
    box.appendChild(head);

    cfg.columns.forEach((col, i) => {
      const card = el("div", { class: "col-card" });
      card.appendChild(el("div", { class: "col-card-head" }, ["Spalte " + (i + 1)]));

      const r1 = el("div", { class: "col-row" });
      r1.appendChild(el("span", { class: "col-lbl" }, ["Inhalt"]));
      const sel = el("select", {});
      CONTENT_OPTIONS.forEach((o) => {
        const opt = el("option", { value: o.v }, [o.t]);
        if (col.type === o.v) opt.selected = true;
        sel.appendChild(opt);
      });
      sel.addEventListener("change", () => { col.type = sel.value; buildControls(); rebuild(); });
      r1.appendChild(sel);
      card.appendChild(r1);

      if (col.type !== "open") {
        const r2 = el("div", { class: "col-row" });
        const lbl = col.type === "drawers" ? "Schubladen" : "Boeden";
        r2.appendChild(el("span", { class: "col-lbl" }, [lbl]));
        const n = el("input", { type: "number", value: col.count, min: 0, max: 12, step: 1 });
        n.addEventListener("input", () => { col.count = Math.max(0, Math.min(12, +n.value || 0)); rebuild(); });
        r2.appendChild(n);
        card.appendChild(r2);
      }

      if (["drawers", "door_l", "door_r", "door_double", "klappe"].indexOf(col.type) >= 0) {
        const rg = el("div", { class: "col-row" });
        rg.appendChild(el("span", { class: "col-lbl" }, ["Griff"]));
        const gs = el("select", {});
        gs.appendChild(el("option", { value: "" }, ["(Möbel-Standard)"]));
        HANDLE_TYPES.forEach((o) => { const opt = el("option", { value: o.v }, [o.t]); if (col.handleType === o.v) opt.selected = true; gs.appendChild(opt); });
        gs.addEventListener("change", () => { if (gs.value) col.handleType = gs.value; else delete col.handleType; rebuild(); });
        rg.appendChild(gs);
        card.appendChild(rg);
      }

      if (col.type === "drawers" && window.Blum) {
        if (!col.runner) col.runner = { system: "tandem560" };
        const sysDef = Blum.SYSTEMS[col.runner.system];
        const innerDepth = cfg.depth - (cfg.backType === "none" ? 0 : (cfg.backThickness || 8));

        const rr = el("div", { class: "col-row" });
        rr.appendChild(el("span", { class: "col-lbl" }, ["Auszug"]));
        const rs = el("select", {});
        Blum.list().forEach((s) => {
          const opt = el("option", { value: s.id }, [s.name + " · " + s.load + "kg"]);
          if (col.runner.system === s.id) opt.selected = true;
          rs.appendChild(opt);
        });
        rs.addEventListener("change", () => { col.runner.system = rs.value; col.runner.height = null; col.runner.nl = null; buildControls(); rebuild(); });
        rr.appendChild(rs);
        card.appendChild(rr);

        if (sysDef && sysDef.heights) {
          const rh = el("div", { class: "col-row" });
          rh.appendChild(el("span", { class: "col-lbl" }, ["Zargenhöhe"]));
          const hs = el("select", {});
          Object.keys(sysDef.heights).forEach((hk) => {
            const opt = el("option", { value: hk }, ["Höhe " + hk + " · " + sysDef.heights[hk] + " mm"]);
            if ((col.runner.height || "M") === hk) opt.selected = true;
            hs.appendChild(opt);
          });
          hs.addEventListener("change", () => { col.runner.height = hs.value; rebuild(); });
          rh.appendChild(hs);
          card.appendChild(rh);
        }

        // Nennlänge nach Tiefe wählbar
        const recNl = Blum.nlForDepth(sysDef, innerDepth);
        const rn = el("div", { class: "col-row" });
        rn.appendChild(el("span", { class: "col-lbl" }, ["Länge NL"]));
        const ns = el("select", {});
        const autoOpt = el("option", { value: "auto" }, ["Auto → " + recNl + " mm"]);
        if (!col.runner.nl) autoOpt.selected = true;
        ns.appendChild(autoOpt);
        sysDef.nls.forEach((nl) => {
          const ok = nl <= innerDepth - 5;
          const opt = el("option", { value: String(nl) }, [nl + " mm" + (ok ? "" : "  ✗ zu tief")]);
          if (col.runner.nl === nl) opt.selected = true;
          ns.appendChild(opt);
        });
        ns.addEventListener("change", () => { col.runner.nl = ns.value === "auto" ? null : parseInt(ns.value, 10); buildControls(); rebuild(); });
        rn.appendChild(ns);
        card.appendChild(rn);

        const useNl = col.runner.nl || recNl;
        const fits = useNl <= innerDepth - 5;
        const fixings = [37, Math.round(useNl / 2), useNl - 32];
        const info = el("div", { class: "col-info" + (fits ? "" : " warn") });
        info.textContent = fits
          ? "Schiene NL " + useNl + " mm · Bohrungen " + fixings.join(" / ") + " mm ab VK"
          : "⚠ NL " + useNl + " > Innentiefe " + innerDepth + " mm – kürzere Länge wählen";
        card.appendChild(info);
      }

      if (col.type === "klappe" && window.Blum && Blum.aventosList) {
        if (!col.aventos) col.aventos = "hks";
        const ar = el("div", { class: "col-row" });
        ar.appendChild(el("span", { class: "col-lbl" }, ["Aventos"]));
        const as = el("select", {});
        Blum.aventosList().forEach((a) => {
          const opt = el("option", { value: a.id }, [a.name]);
          if (col.aventos === a.id) opt.selected = true;
          as.appendChild(opt);
        });
        as.addEventListener("change", () => { col.aventos = as.value; rebuild(); });
        ar.appendChild(as);
        card.appendChild(ar);
        const av = Blum.aventos(col.aventos);
        card.appendChild(el("div", { class: "col-info" }, [av.ext + " · oben angeschlagen, hebt nach oben"]));
      }

      const r3 = el("div", { class: "col-row" });
      r3.appendChild(el("span", { class: "col-lbl" }, ["Breite-Anteil"]));
      const wv = el("input", { type: "number", value: col.w, min: 0.2, max: 5, step: 0.1 });
      wv.addEventListener("input", () => { col.w = Math.max(0.2, +wv.value || 1); rebuild(); });
      r3.appendChild(wv);
      card.appendChild(r3);

      box.appendChild(card);
    });
    return box;
  }

  // ---------- Stueckliste ----------
  function renderCutList(model) {
    const groups = {};
    model.parts.forEach((p) => {
      const key = [p.name, p.material, p.cut[0], p.cut[1], p.cut[2]].join("|");
      if (!groups[key]) groups[key] = { p: p, qty: 0, ids: [] };
      groups[key].qty++;
      groups[key].ids.push(p.id);
    });
    const rows = Object.values(groups).sort((a, b) =>
      a.p.group.localeCompare(b.p.group) || a.p.name.localeCompare(b.p.name));

    const tb = document.getElementById("cutlist-body");
    tb.innerHTML = "";
    let pos = 1;
    const matArea = {};
    let edgeTotal = 0;
    rows.forEach((g) => {
      const p = g.p;
      const area = (p.cut[0] * p.cut[1]) / 1e6 * g.qty;
      matArea[p.material] = (matArea[p.material] || 0) + area;
      edgeTotal += (p.edgeMM || 0) * g.qty;
      const tr = el("tr", { "data-ids": g.ids.join(","), onclick: () => viewer.selectById(g.ids[0]) });
      tr.appendChild(el("td", {}, [String(pos++)]));
      tr.appendChild(el("td", { class: "nm" }, [p.name]));
      tr.appendChild(el("td", {}, [WOODS[p.material] ? WOODS[p.material].name : p.material]));
      tr.appendChild(el("td", { class: "num" }, [String(Math.round(p.cut[0]))]));
      tr.appendChild(el("td", { class: "num" }, [String(Math.round(p.cut[1]))]));
      tr.appendChild(el("td", { class: "num" }, [String(p.cut[2])]));
      tr.appendChild(el("td", { class: "num strong" }, [String(g.qty)]));
      tr.appendChild(el("td", {}, [p.edgeNote || "-"]));
      tr.appendChild(el("td", { class: "grp" }, [p.group]));
      tb.appendChild(tr);
    });

    // Beschlaege
    const hb = document.getElementById("hardware-body");
    hb.innerHTML = "";
    let hwCost = 0;
    Object.keys(model.hardware).forEach((k) => {
      const qty = model.hardware[k];
      if (!qty || !HW[k]) return;
      const cost = qty * HW[k].price;
      hwCost += cost;
      const nm = k === "griff" ? handleLabel(cfg.handleType) : HW[k].name;
      const tr = el("tr", {});
      tr.appendChild(el("td", { class: "nm" }, [nm, " ", shopA(nm + " Möbelbeschlag")]));
      tr.appendChild(el("td", { class: "num strong" }, [String(qty)]));
      tr.appendChild(el("td", { class: "num" }, [HW[k].price.toFixed(2)]));
      tr.appendChild(el("td", { class: "num" }, [cost.toFixed(2)]));
      hb.appendChild(tr);
    });
    // Blum-Auszüge (Artikelnummern + Richtpreise)
    const bAgg = {};
    (model.blumParts || []).forEach((p) => {
      const key = p.name + "|" + p.art;
      if (!bAgg[key]) bAgg[key] = { p: p, qty: 0 };
      bAgg[key].qty += (p.qty || 1);
    });
    Object.values(bAgg).forEach((gp) => {
      const p = gp.p, cost = gp.qty * (p.price || 0); hwCost += cost;
      const tr = el("tr", { class: "blum-row" });
      tr.appendChild(el("td", { class: "nm" }, [p.name + (p.verify ? "  (prüfen)" : "")]));
      tr.appendChild(el("td", { class: "num strong" }, [String(gp.qty)]));
      tr.appendChild(el("td", { class: "num" }, [(p.price || 0).toFixed(2)]));
      tr.appendChild(el("td", { class: "num" }, [cost.toFixed(2)]));
      hb.appendChild(tr);
      const tr2 = el("tr", { class: "blum-art" });
      tr2.appendChild(el("td", { colspan: "4" }, ["Art. " + p.art + "  ", shopA("Blum " + p.art, "Händler ↗")]));
      hb.appendChild(tr2);
    });

    // Zusammenfassung
    let totalParts = model.parts.length;
    let totalArea = 0, matCost = 0, plates = 0;
    const matLines = [];
    Object.keys(matArea).forEach((m) => {
      const a = matArea[m];
      totalArea += a;
      const price = matPrice(m);
      const c = a * (1 + VERSCHNITT) * price;
      matCost += c;
      const pl = Math.max(1, Math.ceil(a * (1 + VERSCHNITT) / PLATE_AREA));
      plates += pl;
      matLines.push((WOODS[m] ? WOODS[m].name : m) + ": " + a.toFixed(2) + " m² · " + pl + " Pl.");
    });

    const sum = document.getElementById("summary");
    sum.innerHTML = "";
    sum.appendChild(kv("Bauteile", totalParts + " Stk."));
    sum.appendChild(kv("Plattenflaeche", totalArea.toFixed(2) + " m²"));
    let plattenOpt = null;
    try { plattenOpt = window.RGFertigung ? RGFertigung.verschnitt(model, { plateL: PLATE_L, plateB: PLATE_B }) : null; } catch (e) { plattenOpt = null; }
    lastVerschnitt = plattenOpt;
    sum.appendChild(kv("Platten (" + PLATE_L + "×" + PLATE_B + ")", (plattenOpt ? plattenOpt.nSheets : plates) + " Stk." + (plattenOpt && plattenOpt.nSheets ? " · " + Math.round(100 * plattenOpt.groups.reduce((a, g) => a + g.usedArea, 0) / plattenOpt.groups.reduce((a, g) => a + g.grossArea, 0)) + " % genutzt" : "")));
    sum.appendChild(kv("Kantenumleimer", (edgeTotal / 1000).toFixed(1) + " m"));
    sum.appendChild(el("div", { class: "kv-sep" }));
    sum.appendChild(kv("Materialkosten*", "CHF " + matCost.toFixed(2)));
    sum.appendChild(kv("Beschlaege", "CHF " + hwCost.toFixed(2)));
    sum.appendChild(kv("Total Material", "CHF " + (matCost + hwCost).toFixed(2), true));
    if (project && project.moebel.length > 1) {
      let projTotal = 0;
      project.moebel.forEach((c, i) => { projTotal += moebelTotal(c, i === project.active, model); });
      sum.appendChild(el("div", { class: "kv-sep" }));
      sum.appendChild(kv("Projekt · " + project.moebel.length + " Möbel", "CHF " + projTotal.toFixed(2), true));
    }
    sum.appendChild(el("div", { class: "hint" }, ["* inkl. " + (VERSCHNITT * 100) + "% Verschnitt, ohne Arbeit"]));

    const warn = document.getElementById("warnings");
    warn.innerHTML = "";
    (model.warnings || []).forEach((w) => warn.appendChild(el("div", { class: "warn" }, ["⚠ " + w])));
  }

  function kv(k, v, strong) {
    const d = el("div", { class: "kv" + (strong ? " strong" : "") });
    d.appendChild(el("span", {}, [k]));
    d.appendChild(el("span", {}, [v]));
    return d;
  }

  // ---------- Persistenz / Export ----------
  function saveLocal() {
    try {
      localStorage.setItem("schreinercad",
        JSON.stringify(project, (k, v) => (k === "_total" || k === "_sig") ? undefined : v));
    } catch (e) {}
  }
  function loadLocal() {
    try {
      const s = localStorage.getItem("schreinercad");
      if (s) return JSON.parse(s);
    } catch (e) {}
    return null;
  }

  function downloadFile(name, content, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = el("a", { href: url, download: name });
    document.body.appendChild(a); a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
  }

  function exportCSV() {
    const rows = [["Pos", "Bezeichnung", "Material", "Laenge", "Breite", "Staerke", "Anzahl", "Kante", "Gruppe"]];
    const groups = {};
    lastModel.parts.forEach((p) => {
      const key = [p.name, p.material, p.cut[0], p.cut[1], p.cut[2]].join("|");
      if (!groups[key]) groups[key] = { p: p, qty: 0 };
      groups[key].qty++;
    });
    let pos = 1;
    Object.values(groups).forEach((g) => {
      const p = g.p;
      rows.push([pos++, p.name, WOODS[p.material] ? WOODS[p.material].name : p.material,
        Math.round(p.cut[0]), Math.round(p.cut[1]), p.cut[2], g.qty, p.edgeNote || "", p.group]);
    });
    const csv = rows.map((r) => r.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(";")).join("\r\n");
    downloadFile("zuschnittliste.csv", "﻿" + csv, "text/csv;charset=utf-8");
  }

  function exportHTML() {
    const img = viewer.snapshot();
    const groups = {};
    lastModel.parts.forEach((p) => {
      const key = [p.name, p.material, p.cut[0], p.cut[1], p.cut[2]].join("|");
      if (!groups[key]) groups[key] = { p: p, qty: 0 };
      groups[key].qty++;
    });
    let rowsHtml = "", pos = 1;
    Object.values(groups).sort((a, b) => a.p.group.localeCompare(b.p.group)).forEach((g) => {
      const p = g.p;
      rowsHtml += "<tr><td>" + (pos++) + "</td><td>" + p.name + "</td><td>" + (WOODS[p.material] ? WOODS[p.material].name : p.material) +
        "</td><td class=n>" + Math.round(p.cut[0]) + "</td><td class=n>" + Math.round(p.cut[1]) + "</td><td class=n>" + p.cut[2] +
        "</td><td class=n>" + g.qty + "</td><td>" + (p.edgeNote || "-") + "</td><td>" + p.group + "</td></tr>";
    });
    let hwHtml = "";
    Object.keys(lastModel.hardware).forEach((k) => {
      const q = lastModel.hardware[k];
      if (!q || !HW[k]) return;
      hwHtml += "<tr><td>" + HW[k].name + "</td><td class=n>" + q + "</td></tr>";
    });
    const w = window.open("", "_blank");
    w.document.write(
      "<html><head><meta charset='utf-8'><title>Werkstattzeichnung</title><style>" +
      "body{font-family:Segoe UI,sans-serif;margin:30px;color:#222}h1{color:#1b3a5b}" +
      "img{max-width:100%;border:1px solid #ccc;border-radius:8px;margin:10px 0}" +
      "table{border-collapse:collapse;width:100%;margin:14px 0;font-size:13px}" +
      "th,td{border:1px solid #d0d0d0;padding:5px 8px;text-align:left}th{background:#1b3a5b;color:#fff}" +
      "td.n{text-align:right}tr:nth-child(even){background:#f6f8fa}h2{color:#1b3a5b;margin-top:22px}" +
      "</style></head><body>" +
      "<h1>RG CAD – Werkstattzeichnung</h1>" +
      "<p>" + TYPE_LABELS[cfg.type] + " · " + cfg.width + "×" + cfg.height + "×" + cfg.depth + " mm · " +
      (WOODS[cfg.material] ? WOODS[cfg.material].name : cfg.material) + moebelTag() + "</p>" +
      "<img src='" + img + "'>" +
      "<h2>Stueckliste / Zuschnitt</h2><table><tr><th>Pos</th><th>Bezeichnung</th><th>Material</th><th>L</th><th>B</th><th>St.</th><th>Anz</th><th>Kante</th><th>Gruppe</th></tr>" +
      rowsHtml + "</table>" +
      "<h2>Beschlaege</h2><table><tr><th>Artikel</th><th>Anzahl</th></tr>" + hwHtml + "</table>" +
      "<p style='color:#888;margin-top:30px'>Erstellt mit RG CAD</p></body></html>");
    w.document.close();
  }

  function exportToProfi() {
    if (!lastModel) return;
    const groups = SchreinerDrawing.groupParts(lastModel);
    const komponenten = groups.map((g) => ({
      name: g.p.name, laenge: Math.round(g.p.cut[0]), breite: Math.round(g.p.cut[1]),
      dicke: g.p.cut[2], anzahl: g.qty,
      material: WOODS[g.p.material] ? WOODS[g.p.material].name : g.p.material,
      kantenband: g.p.edgeNote || "",
    }));
    const beschlaege = [];
    Object.keys(lastModel.hardware).forEach((k) => { const q = lastModel.hardware[k]; if (q && HW[k]) beschlaege.push({ name: HW[k].name, anzahl: q, preis: HW[k].price }); });
    const bAgg = {};
    (lastModel.blumParts || []).forEach((p) => { const key = p.name + "|" + p.art; if (!bAgg[key]) bAgg[key] = { p: p, qty: 0 }; bAgg[key].qty += (p.qty || 1); });
    Object.values(bAgg).forEach((g) => beschlaege.push({ name: g.p.name, art: g.p.art, anzahl: g.qty, preis: g.p.price || 0 }));
    const data = {
      source: "RG CAD", version: 1,
      moebel: {
        name: (cfg._name || (TYPE_LABELS[cfg.type] || "Möbel") + " " + cfg.width + "×" + cfg.height + "×" + cfg.depth) + moebelTag(),
        typ: TYPE_LABELS[cfg.type] || cfg.type,
        breite: cfg.width, hoehe: cfg.height, tiefe: cfg.depth,
        beschreibung: "Aus RG CAD (" + (WOODS[cfg.material] ? WOODS[cfg.material].name : cfg.material) + ")"
          + (project.moebel.length > 1 ? " – exportiert wird nur das aktive Möbel" : ""),
      },
      komponenten: komponenten, beschlaege: beschlaege,
    };
    downloadFile("rgcad_moebel.json", JSON.stringify(data, null, 2), "application/json");
    alert("Datei 'rgcad_moebel.json' gespeichert.\nIn SchreinerProfi: Projekte → '↓ RG CAD Import' → diese Datei wählen.");
  }

  // ---------- Fusion 360 Export (ganzes Projekt als parametrische Solids) ----------
  function exportFusion() {
    const moebel = project.moebel.map((c, i) => {
      const m = SchreinerBuilder.build(c);
      return {
        index: i,
        name: (c._name || ((TYPE_LABELS[c.type] || "Moebel") + " " + c.width + "x" + c.height)),
        type: c.type,
        bbox: m.bbox,   // {w,h,d} in mm
        parts: m.parts.map((p) => ({
          name: p.name, group: p.group, material: p.material,
          pos: p.pos, dim: p.dim, grain: p.grain,
        })),
        runners: (m.runners || []).map((r) => ({ kind: r.kind, x: r.x, y: r.y, z: r.z, dx: r.dx, dy: r.dy, dz: r.dz })),
      };
    });
    const woods = {};
    Object.keys(WOODS).forEach((k) => { woods[k] = { name: WOODS[k].name, base: WOODS[k].base }; });
    const data = {
      source: "RG CAD", version: 1, unit: "mm",
      note: "Origin vorne-unten-links; +X rechts, +Y oben, +Z hinten.",
      project: { name: project.name || "Projekt", moebel: moebel },
      woods: woods,
    };
    downloadFile("rgcad_fusion.json", JSON.stringify(data, null, 2), "application/json");
    alert("Datei 'rgcad_fusion.json' gespeichert (" + moebel.length + " Möbel).\n\n"
      + "In Fusion 360: Dienstprogramme → Add-Ins → Skripts und Add-Ins → 'RG_CAD_Fusion' → Ausführen,\n"
      + "dann diese Datei wählen. Jedes Möbel wird als eigene Komponente, jede Platte als benannter Körper aufgebaut.");
  }

  function saveProject() {
    downloadFile("projekt.scad.json",
      JSON.stringify(project, (k, v) => (k === "_total" || k === "_sig") ? undefined : v, 2), "application/json");
  }

  function loadProjectFile() {
    const inp = el("input", { type: "file", accept: ".json,application/json" });
    inp.addEventListener("change", () => {
      const f = inp.files[0]; if (!f) return;
      const rd = new FileReader();
      rd.onload = () => { try { loadProjectObj(JSON.parse(rd.result)); } catch (e) { alert("Ungueltige Datei"); } };
      rd.readAsText(f);
    });
    inp.click();
  }

  // ---------- Projekte (SQL-Datenbank) ----------
  function saveCurrentToDB(refresh) {
    if (window.RGDB && !RGDB.ready) RGDB.init();
    if (!window.RGDB || !RGDB.ready) { saveProject(); return; }
    const def = (project.name && project.name !== "Projekt") ? project.name
      : (TYPE_LABELS[cfg.type] || "Möbel") + (project.moebel.length > 1 ? " +" + (project.moebel.length - 1) : "");
    const name = prompt("Projektname (wird in der SQL-Datenbank gespeichert):", def);
    if (!name) return;
    project.name = name; saveLocal();
    const typeLabel = project.moebel.length > 1 ? (project.moebel.length + " Möbel") : (TYPE_LABELS[cfg.type] || cfg.type);
    RGDB.saveProject(name, typeLabel, project);
    if (refresh) openProjects(); else alert("In SQL-Datenbank gespeichert: " + name);
  }

  function openProjects() {
    if (window.RGDB && !RGDB.ready) RGDB.init();
    let m = document.getElementById("proj-modal");
    if (!m) {
      m = el("div", { id: "proj-modal", class: "firma-modal" });
      document.body.appendChild(m);
      m.addEventListener("click", (e) => { if (e.target === m) m.style.display = "none"; });
    }
    m.innerHTML = "";
    const card = el("div", { class: "firma-card" });
    card.appendChild(el("div", { class: "firma-h" }, [RGICON("database"), " Projekte"]));
    const rows = (window.RGDB && RGDB.ready) ? RGDB.listProjects() : [];
    if (!rows.length) card.appendChild(el("div", { class: "hint" }, ["Noch keine Projekte gespeichert. Unten mit '+ Aktuelles speichern' anlegen."]));
    else {
      const tbl = el("table", { class: "proj-tbl" });
      rows.forEach((r) => {
        const tr = el("tr", {});
        tr.appendChild(el("td", { class: "nm" }, [r.name]));
        tr.appendChild(el("td", {}, [TYPE_LABELS[r.type] || r.type || "-"]));
        tr.appendChild(el("td", { class: "dt" }, [String(r.created || "").slice(0, 10)]));
        const tdA = el("td", { class: "pa" });
        tdA.appendChild(el("button", { class: "tb-mini", onclick: () => { const c = RGDB.loadProject(r.id); if (c) { loadProjectObj(c); m.style.display = "none"; } } }, ["Laden"]));
        tdA.appendChild(el("button", { class: "tb-mini", onclick: () => { if (confirm("Projekt '" + r.name + "' löschen?")) { RGDB.deleteProject(r.id); openProjects(); } } }, ["🗑"]));
        tr.appendChild(tdA);
        tbl.appendChild(tr);
      });
      card.appendChild(tbl);
    }
    const btns = el("div", { class: "firma-btns" });
    btns.appendChild(el("button", { class: "btn-primary", onclick: () => saveCurrentToDB(true) }, ["+ Aktuelles speichern"]));
    btns.appendChild(el("button", { class: "btn-sec", onclick: saveProject }, [RGICON("download"), " Datei"]));
    btns.appendChild(el("button", { class: "btn-sec", onclick: loadProjectFile }, [RGICON("folderopen"), " Datei laden"]));
    btns.appendChild(el("button", { class: "btn-sec", onclick: () => { m.style.display = "none"; } }, ["Schliessen"]));
    card.appendChild(btns);
    m.appendChild(card);
    m.style.display = "flex";
  }

  // ---------- Firma ----------
  function escapeHtml(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  function loadFirma() {
    try { const s = localStorage.getItem("schreinercad_firma"); if (s) return JSON.parse(s); } catch (e) {}
    return { name: "", adresse: "", tel: "", email: "", web: "", logo: "" };
  }
  let firma = loadFirma();
  function saveFirma() {
    try { localStorage.setItem("schreinercad_firma", JSON.stringify(firma)); return true; }
    catch (e) { alert("Speichern fehlgeschlagen – Logo evtl. zu gross. Bitte kleineres Bild (< 300 KB) verwenden."); return false; }
  }

  function firmHeadHTML() {
    const logo = firma.logo ? "<img class='fh-logo' src='" + firma.logo + "'>" : "";
    const name = "<div class='fh-name'>" + (firma.name ? escapeHtml(firma.name) : "RG CAD") + "</div>";
    const adr = firma.adresse ? "<div class='fh-adr'>" + escapeHtml(firma.adresse).replace(/\n/g, "<br>") + "</div>" : "";
    const extra = [];
    if (firma.tel) extra.push("Tel " + escapeHtml(firma.tel));
    if (firma.email) extra.push(escapeHtml(firma.email));
    if (firma.web) extra.push(escapeHtml(firma.web));
    const ex = extra.length ? "<div class='fh-adr'>" + extra.join(" · ") + "</div>" : "";
    return "<div class='firmhead'>" + logo + "<div>" + name + adr + ex + "</div></div>";
  }

  function openFirma() {
    let m = document.getElementById("firma-modal");
    if (!m) {
      m = el("div", { id: "firma-modal", class: "firma-modal" });
      document.body.appendChild(m);
      m.addEventListener("click", (e) => { if (e.target === m) m.style.display = "none"; });
    }
    m.innerHTML = "";
    const card = el("div", { class: "firma-card" });
    card.appendChild(el("div", { class: "firma-h" }, [RGICON("building"), " Firmendaten für die Werkstattzeichnung"]));

    const fields = [["Firmenname", "name", "text"], ["Adresse", "adresse", "area"], ["Telefon", "tel", "text"], ["E-Mail", "email", "text"], ["Web", "web", "text"]];
    const inputs = {};
    fields.forEach((f) => {
      const row = el("div", { class: "firma-row" });
      row.appendChild(el("label", {}, [f[0]]));
      const inp = f[2] === "area" ? el("textarea", { rows: "3", placeholder: "Strasse Nr.\nPLZ Ort" }) : el("input", { type: "text" });
      inp.value = firma[f[1]] || "";
      row.appendChild(inp); inputs[f[1]] = inp; card.appendChild(row);
    });

    const logoRow = el("div", { class: "firma-row" });
    logoRow.appendChild(el("label", {}, ["Logo"]));
    const wrap = el("div", { class: "firma-logo-wrap" });
    const prev = el("img", { class: "firma-logo-prev" });
    if (firma.logo) prev.src = firma.logo; else prev.style.display = "none";
    const file = el("input", { type: "file", accept: "image/*" });
    file.addEventListener("change", () => {
      const fl = file.files[0]; if (!fl) return;
      if (fl.size > 1500000) { alert("Bild zu gross (> 1.5 MB). Bitte kleineres Logo verwenden."); return; }
      const rd = new FileReader();
      rd.onload = () => { firma.logo = rd.result; prev.src = rd.result; prev.style.display = "block"; };
      rd.readAsDataURL(fl);
    });
    const del = el("button", { class: "tb-mini", onclick: () => { firma.logo = ""; prev.src = ""; prev.style.display = "none"; } }, ["Logo entfernen"]);
    wrap.appendChild(prev); wrap.appendChild(file); wrap.appendChild(del);
    logoRow.appendChild(wrap); card.appendChild(logoRow);

    const btns = el("div", { class: "firma-btns" });
    btns.appendChild(el("button", { class: "btn-primary", onclick: () => {
      fields.forEach((f) => { firma[f[1]] = inputs[f[1]].value.trim(); });
      if (saveFirma()) m.style.display = "none";
    } }, ["Speichern"]));
    btns.appendChild(el("button", { class: "btn-sec", onclick: () => { firma = loadFirma(); m.style.display = "none"; } }, ["Abbrechen"]));
    card.appendChild(btns);

    m.appendChild(card);
    m.style.display = "flex";
  }

  // ---------- Werkstattzeichnung ----------
  function buildStueckHTML(model) {
    const groups = SchreinerDrawing.groupParts(model);
    let rows = "", pos = 1;
    groups.forEach((g) => {
      const p = g.p;
      rows += "<tr><td>" + (pos++) + "</td><td>" + p.name + "</td><td>" +
        (WOODS[p.material] ? WOODS[p.material].name : p.material) +
        "</td><td class='n'>" + Math.round(p.cut[0]) + "</td><td class='n'>" + Math.round(p.cut[1]) +
        "</td><td class='n'>" + p.cut[2] + "</td><td class='n'>" + g.qty +
        "</td><td>" + (p.edgeNote || "-") + "</td><td>" + p.group + "</td></tr>";
    });
    return "<table class='shop-table'><thead><tr><th>#</th><th>Bezeichnung</th><th>Material</th>" +
      "<th>L</th><th>B</th><th>St</th><th>Anz</th><th>Kante</th><th>Gruppe</th></tr></thead><tbody>" +
      rows + "</tbody></table>";
  }

  let shopScale = "auto";
  let shopPaper = "A3";

  function paperFit(paper) {
    // nutzbare Flaeche pro Bauteil (Querformat) abzgl. Rahmen + Schriftfeld
    return paper === "A3" ? { w: 392, h: 248 } : { w: 270, h: 162 };
  }

  function renderShopDoc() {
    const img = viewer.snapshot();
    const dateStr = new Date().toLocaleDateString("de-CH");
    const matName = WOODS[cfg.material] ? WOODS[cfg.material].name : cfg.material;
    const scaleTxt = shopScale === "auto" ? "Auto (pro Teil eingepasst)" : "1:" + shopScale + " (massstabsgetreu)";
    const logoHtml = firma.logo ? "<img class='shop-logo' src='" + firma.logo + "'>" : "";
    const firmName = firma.name ? escapeHtml(firma.name) : "RG CAD";
    const adrLine = firma.adresse ? escapeHtml(firma.adresse).replace(/\n/g, " · ") + " &middot; " : "";
    const head =
      "<div class='shop-headblock'><div class='shop-head-left'>" + logoHtml + "<div>" +
      "<div class='shop-h1'>" + firmName + "</div>" +
      "<div class='shop-meta'>" + adrLine + "Werkstattzeichnung</div>" +
      "<div class='shop-meta'>" + TYPE_LABELS[cfg.type] + " &middot; " + cfg.width + " × " + cfg.height + " × " + cfg.depth + " mm &middot; " + matName + escapeHtml(moebelTag()) + "</div>" +
      "</div></div>" +
      "<div class='shop-date'>Datum: " + dateStr + "<br>Format: <b>" + shopPaper + " quer</b> &middot; Massstab: <b>" + scaleTxt + "</b></div></div>";
    const overview =
      "<div class='shop-overview'><img class='shop-3d' src='" + img + "'>" +
      "<div class='shop-sumbox'>" + document.getElementById("summary").innerHTML + "</div></div>";
    const liste = "<div class='shop-section'>Stückliste / Zuschnitt</div>" + buildStueckHTML(lastModel);
    const teile = "<div class='shop-section'>Teilezeichnungen — alle Bretter (vollständig bemasst)</div>" +
      "<div class='shop-legend'><span class='lg-edge'></span> Kantenumleimer &nbsp; " +
      "<span class='lg-hole'></span> Bohrung &nbsp; <span class='lg-cup'></span> Topfband &nbsp; " +
      "<span class='lg-nut'></span> Nut &nbsp; <span class='lg-grain'>→</span> Faser &nbsp; alle Masse in mm</div>" +
      SchreinerDrawing.buildCards(lastModel, shopScale, paperFit(shopPaper));
    document.getElementById("shop-doc").innerHTML = head + overview + liste + teile;
  }

  function openWorkshop() {
    if (!lastModel) return;
    let modal = document.getElementById("shop-modal");
    if (!modal) {
      modal = el("div", { id: "shop-modal", class: "shop-modal" });
      const bar = el("div", { class: "shop-actions" });
      bar.appendChild(el("span", { class: "shop-title" }, [RGICON("ruler"), " Werkstattzeichnung"]));
      bar.appendChild(el("div", { class: "shop-spacer" }));
      bar.appendChild(el("span", { class: "shop-scale-lbl" }, ["Format:"]));
      const pap = el("select", { id: "shop-paper", class: "shop-scale" });
      [["A3", "A3"], ["A4", "A4"]].forEach((o) => {
        const opt = el("option", { value: o[0] }, [o[1]]);
        if (o[0] === shopPaper) opt.selected = true;
        pap.appendChild(opt);
      });
      pap.addEventListener("change", () => { shopPaper = pap.value; renderShopDoc(); });
      bar.appendChild(pap);
      bar.appendChild(el("span", { class: "shop-scale-lbl" }, ["Massstab:"]));
      const sel = el("select", { id: "shop-scale", class: "shop-scale" });
      [["auto", "Auto"], ["5", "1:5"], ["10", "1:10"], ["15", "1:15"], ["20", "1:20"], ["25", "1:25"], ["50", "1:50"]].forEach((o) => {
        const opt = el("option", { value: o[0] }, [o[1]]);
        if (o[0] === shopScale) opt.selected = true;
        sel.appendChild(opt);
      });
      sel.addEventListener("change", () => { shopScale = sel.value === "auto" ? "auto" : parseInt(sel.value, 10); renderShopDoc(); });
      bar.appendChild(sel);
      bar.appendChild(el("button", { class: "tb tb-print", onclick: printWorkshop }, [RGICON("print"), " Drucken / PDF"]));
      bar.appendChild(el("button", { class: "tb", onclick: closeWorkshop }, [RGICON("x"), " Schliessen"]));
      modal.appendChild(bar);
      modal.appendChild(el("div", { id: "shop-doc", class: "shop-doc" }));
      document.body.appendChild(modal);
      modal.addEventListener("click", (e) => { if (e.target === modal) closeWorkshop(); });
    }
    renderShopDoc();
    modal.style.display = "flex";
  }

  function closeWorkshop() {
    const m = document.getElementById("shop-modal");
    if (m) m.style.display = "none";
  }

  function titleBlock(o) {
    const logoCell = firma.logo ? "<img src='" + firma.logo + "'>" : (firma.name ? escapeHtml(firma.name) : "RG<br>CAD");
    const firmLine = (firma.name ? "<b>" + escapeHtml(firma.name) + "</b>" : "RG CAD") +
      (firma.adresse ? " &middot; " + escapeHtml(firma.adresse).replace(/\n/g, ", ") : "");
    return "<div class='tb'><table>" +
      "<tr><td class='lg' rowspan='6'>" + logoCell + "</td><td class='firm' colspan='4'>" + firmLine + "</td></tr>" +
      "<tr><td class='k'>Projekt</td><td class='v' colspan='3'>" + o.proj + "</td></tr>" +
      "<tr><td class='k'>Benennung</td><td class='v' colspan='3'>" + o.benennung + "</td></tr>" +
      "<tr><td class='k'>Werkstoff</td><td class='v'>" + o.mat + "</td><td class='k'>Stärke</td><td class='v'>" + o.st + "</td></tr>" +
      "<tr><td class='k'>Massstab</td><td class='v'>" + o.scale + "</td><td class='k'>Stück</td><td class='v'>" + o.qty + "</td></tr>" +
      "<tr><td class='k'>Datum</td><td class='v'>" + o.date + "</td><td class='k'>Blatt</td><td class='v'>" + o.sheet + "</td></tr>" +
      "</table></div>";
  }

  function printWorkshop() {
    if (!lastModel) return;
    const groups = SchreinerDrawing.groupParts(lastModel);
    const img = viewer.snapshot();
    const dateStr = new Date().toLocaleDateString("de-CH");
    const proj = TYPE_LABELS[cfg.type] + " " + cfg.width + "×" + cfg.height + "×" + cfg.depth + " mm" + moebelTag();
    const fit = paperFit(shopPaper);
    const total = groups.length + 1;
    const minH = shopPaper === "A3" ? "275mm" : "188mm";
    const scaleLabel = shopScale === "auto" ? "Auto" : "1:" + shopScale;

    let sheets = "<section class='sheet'>" + firmHeadHTML() + "<div class='draw-area overview'>" +
      "<div class='ov-left'><img src='" + img + "'></div>" +
      "<div class='ov-right'><h2>Übersicht &amp; Stückliste</h2>" + buildStueckHTML(lastModel) + "</div></div>" +
      titleBlock({ proj: proj, benennung: "Übersicht / Stückliste", mat: (WOODS[cfg.material] ? WOODS[cfg.material].name : cfg.material), st: (cfg.thickness || "-") + " mm", scale: scaleLabel, qty: "-", date: dateStr, sheet: "1/" + total }) +
      "</section>";

    let n = 2;
    groups.forEach((g) => {
      const svg = SchreinerDrawing.partSVG(g.p, n - 1, g.qty, shopScale, fit);
      sheets += "<section class='sheet'><div class='draw-area'>" + svg + "</div>" +
        titleBlock({ proj: proj, benennung: g.p.name, mat: (WOODS[g.p.material] ? WOODS[g.p.material].name : g.p.material), st: g.p.cut[2] + " mm", scale: scaleLabel, qty: g.qty + "x", date: dateStr, sheet: n + "/" + total }) +
        "</section>";
      n++;
    });

    const css =
      "@page{ size:" + shopPaper + " landscape; margin:8mm; }" +
      "*{box-sizing:border-box;} body{margin:0;font-family:'Segoe UI',Arial,sans-serif;color:#1b2733;}" +
      ".sheet{border:0.6mm solid #222;padding:6mm;page-break-after:always;display:flex;flex-direction:column;min-height:" + minH + ";}" +
      ".sheet:last-child{page-break-after:auto;}" +
      ".draw-area{flex:1;display:flex;align-items:center;justify-content:center;overflow:hidden;}" +
      ".draw-area.overview{align-items:flex-start;gap:8mm;}" +
      ".ov-left{flex:0 0 46%;} .ov-left img{width:100%;border:0.3mm solid #bbb;border-radius:1mm;}" +
      ".ov-right{flex:1;} .ov-right h2{margin:0 0 3mm;font-size:13pt;color:#1b3a5b;}" +
      ".part-svg{max-width:100%;max-height:100%;height:auto;}" +
      "table{border-collapse:collapse;width:100%;font-size:8.5pt;} th,td{border:0.3mm solid #999;padding:1mm 2mm;text-align:left;} th{background:#eee;}" +
      ".tb{align-self:flex-end;margin-top:4mm;} .tb table{width:auto;border:0.5mm solid #222;} .tb td{border:0.3mm solid #555;padding:1mm 3mm;font-size:9pt;white-space:nowrap;}" +
      ".tb .k{color:#555;font-size:8pt;} .tb .v{font-weight:700;} .tb .lg{font-weight:800;font-size:11pt;color:#16624f;text-align:center;background:#f0f4f3;line-height:1.1;}" +
      ".tb .lg img{max-width:24mm;max-height:14mm;display:block;margin:auto;} .tb .firm{font-weight:700;font-size:8.5pt;color:#1b3a5b;background:#f7faf9;}" +
      ".firmhead{display:flex;gap:6mm;align-items:center;border-bottom:0.5mm solid #222;padding-bottom:2.5mm;margin-bottom:3mm;}" +
      ".fh-logo{max-height:18mm;max-width:55mm;object-fit:contain;} .fh-name{font-size:14pt;font-weight:800;color:#1b3a5b;} .fh-adr{font-size:9pt;color:#444;line-height:1.3;}";

    const html = "<!DOCTYPE html><html lang='de'><head><meta charset='utf-8'><title>Werkstattzeichnung " + proj +
      "</title><style>" + css + "</style></head><body>" + sheets + "</body></html>";

    const w = window.open("", "_blank");
    if (!w) { alert("Bitte Popups für diese Seite erlauben, dann erneut auf 'Drucken / PDF' klicken."); return; }
    w.document.open(); w.document.write(html); w.document.close();
    setTimeout(() => { try { w.focus(); w.print(); } catch (e) {} }, 500);
  }

  // ---------- Blum-Katalog ----------
  function loadBlumOverrides() { try { const s = localStorage.getItem("rgcad_blum_ov"); if (s && window.Blum) window.Blum.overrides = JSON.parse(s) || {}; } catch (e) {} }
  function saveBlumOverrides() { try { localStorage.setItem("rgcad_blum_ov", JSON.stringify(window.Blum.overrides || {})); } catch (e) {} }

  function blumTemplate() {
    let csv = "Artikelnummer;Richtpreis CHF;System;NL\r\n";
    Blum.list().forEach((s) => {
      const hk = s.heights ? Object.keys(s.heights)[1] : null;
      s.nls.forEach((nl) => { csv += s.art(nl, hk) + ";" + Blum.priceFor(s.id, nl) + ";" + s.name + ";" + nl + "\r\n"; });
    });
    downloadFile("blum_preisliste_vorlage.csv", "﻿" + csv, "text/csv;charset=utf-8");
  }

  function importBlumCSV() {
    if (window.RGDB && !RGDB.ready) RGDB.init();
    const inp = el("input", { type: "file", accept: ".csv,text/csv" });
    inp.addEventListener("change", () => {
      const f = inp.files[0]; if (!f) return;
      const rd = new FileReader();
      rd.onload = () => {
        const lines = String(rd.result || "").split(/\r?\n/).filter((l) => l.trim());
        let matched = 0, unmatched = 0;
        lines.forEach((ln, idx) => {
          const sep = ln.indexOf(";") >= 0 ? ";" : ",";
          const cols = ln.split(sep).map((c) => c.trim().replace(/^"|"$/g, ""));
          if (idx === 0 && /art|preis|price/i.test(ln) && !/^[\d.,]+$/.test(cols[1] || "")) return;
          const art = cols[0];
          const price = parseFloat((cols[1] || "").replace(",", ".").replace(/[^\d.]/g, ""));
          if (!art || isNaN(price)) return;
          const rows = (window.RGDB && RGDB.ready) ? alasql("SELECT system, nl FROM blum_lengths WHERE art=?", [art]) : [];
          if (rows.length) {
            rows.forEach((r) => {
              Blum.overrides[r.system] = Blum.overrides[r.system] || {};
              Blum.overrides[r.system][r.nl] = price;
              RGDB.blumSetPrice(r.system, r.nl, price);
            });
            matched++;
          } else unmatched++;
        });
        saveBlumOverrides(); rebuild(); openBlum();
        alert("Import abgeschlossen: " + matched + " Preise übernommen" + (unmatched ? (", " + unmatched + " Artikel nicht zugeordnet") : "") + ".");
      };
      rd.readAsText(f);
    });
    inp.click();
  }

  function openBlum() {
    if (!window.Blum) return;
    if (window.RGDB && !RGDB.ready) RGDB.init();
    let m = document.getElementById("blum-modal");
    if (!m) {
      m = el("div", { id: "blum-modal", class: "blum-modal" });
      document.body.appendChild(m);
      m.addEventListener("click", (e) => { if (e.target === m) m.style.display = "none"; });
    }
    m.innerHTML = "";
    const card = el("div", { class: "blum-card" });
    const head = el("div", { class: "blum-head" });
    head.appendChild(el("span", { class: "blum-title" }, [RGICON("drawer"), " Blum Auszug-Katalog"]));
    head.appendChild(el("div", { class: "shop-spacer" }));
    head.appendChild(el("button", { class: "btn-sec", onclick: blumTemplate }, [RGICON("download"), " Vorlage"]));
    head.appendChild(el("button", { class: "btn-sec", onclick: importBlumCSV }, [RGICON("upload"), " Preise importieren"]));
    head.appendChild(el("button", { class: "btn-sec", onclick: () => { m.style.display = "none"; } }, [RGICON("x"), " Schliessen"]));
    card.appendChild(head);
    card.appendChild(el("div", { class: "blum-disc" }, [Blum.DISCLAIMER]));

    Blum.list().forEach((s) => {
      card.appendChild(el("div", { class: "blum-sys" }, [s.name + " — " + s.ext + " · " + s.load + " kg" + (s.verify ? "   ⚠ Art.-Nr./Ausführung prüfen" : "")]));
      const tbl = el("table", { class: "blum-tbl" });
      const hk = s.heights ? Object.keys(s.heights)[1] : null;
      const thr = el("tr", {});
      ["NL mm", "Art.-Nr." + (hk ? " (Höhe " + hk + ")" : ""), "Last", "Richtpreis CHF"].forEach((h) => thr.appendChild(el("th", {}, [h])));
      tbl.appendChild(thr);
      const rows = (window.RGDB && RGDB.ready) ? RGDB.blumRows(s.id)
        : s.nls.map((nl) => ({ nl: nl, art: s.art(nl, hk), tk: s.load, price: Blum.priceFor(s.id, nl) }));
      rows.forEach((r) => {
        const tr = el("tr", {});
        tr.appendChild(el("td", {}, [String(r.nl)]));
        tr.appendChild(el("td", { class: "mono" }, [r.art]));
        tr.appendChild(el("td", {}, [r.tk + " kg"]));
        const td = el("td", {});
        const inp = el("input", { type: "number", step: "0.5", min: "0", class: "blum-price", value: String(r.price) });
        inp.addEventListener("change", () => {
          const v = parseFloat(inp.value);
          Blum.overrides[s.id] = Blum.overrides[s.id] || {};
          if (isNaN(v)) delete Blum.overrides[s.id][r.nl]; else Blum.overrides[s.id][r.nl] = v;
          if (window.RGDB && RGDB.ready && !isNaN(v)) RGDB.blumSetPrice(s.id, r.nl, v);
          saveBlumOverrides(); rebuild();
        });
        td.appendChild(inp); tr.appendChild(td);
        tbl.appendChild(tr);
      });
      card.appendChild(tbl);
    });
    card.appendChild(el("div", { class: "blum-src" }, ["Preisquelle: Amazon.de (Richtwerte, EUR≈CHF). Verbindliche Artikelnummern, Preise und Bohrmasse über Blum E-Services / Montageanleitung."]));
    m.appendChild(card);
    m.style.display = "flex";
  }

  // ---------- Klick -> Detailansicht ----------
  function onPartClick(part) {
    selectionInfo(part);
    if (materialMode) { if (part) openMaterialPicker(part); return; }
    if (part) openPartDetail(part);
  }

  // ---------- Holzart je Bauteil (Material-Modus) ----------
  function setMatModeUI(on) {
    let h = document.getElementById("matmode-hint");
    if (!h) {
      h = el("div", { id: "matmode-hint", class: "matmode-hint" },
        ["Material-Modus aktiv: Bauteil im 3D anklicken, dann Holzart wählen. Nochmals «Holzart» zum Beenden."]);
      document.getElementById("viewport").appendChild(h);
    }
    h.style.display = on ? "block" : "none";
  }

  function openMaterialPicker(part) {
    if (!part || !cfg) return;
    cfg.matOv = cfg.matOv || {};
    cfg.matOvName = cfg.matOvName || {};

    let m = document.getElementById("matpick-modal");
    if (!m) {
      m = el("div", { id: "matpick-modal", class: "firma-modal" });
      document.body.appendChild(m);
      m.addEventListener("click", (e) => { if (e.target === m) m.style.display = "none"; });
    }

    function curMat() {
      return (mpScope === "name")
        ? (cfg.matOvName[part.name] || part.baseMaterial || part.material)
        : (cfg.matOv[part.matKey] || cfg.matOvName[part.name] || part.baseMaterial || part.material);
    }

    function apply(key) {
      if (mpScope === "name") {
        if (key == null) delete cfg.matOvName[part.name];
        else cfg.matOvName[part.name] = key;
        // Einzel-Overrides gleichen Namens entfernen, damit der Typ-Wert greift
        Object.keys(cfg.matOv).forEach((mk) => { if (mk.indexOf(part.name + "#") === 0) delete cfg.matOv[mk]; });
      } else {
        if (key == null) delete cfg.matOv[part.matKey];
        else cfg.matOv[part.matKey] = key;
      }
      _plateSig = "";   // Holzart-Liste rechts mit der 3D-Auswahl synchronisieren
      rebuild();
      render();
    }

    function render() {
      m.innerHTML = "";
      const card = el("div", { class: "firma-card matpick-card" });

      const head = el("div", { class: "detail-head" });
      head.appendChild(el("span", { class: "detail-title" }, [RGICON("droplet"), " Holzart wählen"]));
      head.appendChild(el("div", { class: "shop-spacer" }));
      head.appendChild(el("button", { class: "btn-sec", onclick: () => { m.style.display = "none"; } }, [RGICON("x")]));
      card.appendChild(head);

      card.appendChild(el("div", { class: "mp-sub" },
        [part.name + "  ·  " + Math.round(part.cut[0]) + " × " + Math.round(part.cut[1]) + " × " + part.cut[2] + " mm"]));

      const scope = el("div", { class: "mp-scope" });
      [["element", "nur diese Platte"], ["name", "alle „" + part.name + "“"]].forEach((o) => {
        scope.appendChild(el("button", { class: "mp-scope-btn" + (mpScope === o[0] ? " on" : ""),
          onclick: () => { mpScope = o[0]; render(); } }, [o[1]]));
      });
      card.appendChild(scope);

      const cm = curMat();
      card.appendChild(el("div", { class: "mp-cur" },
        ["Aktuell: " + (WOODS[cm] ? WOODS[cm].name : cm)]));

      const grid = el("div", { class: "mp-grid" });
      const reset = el("button", { class: "mp-swatch mp-reset", onclick: () => apply(null) });
      reset.appendChild(el("span", { class: "mp-chip mp-chip-reset" }, [RGICON("reset")]));
      reset.appendChild(el("span", { class: "mp-name" }, ["Standard"]));
      reset.appendChild(el("span", { class: "mp-price" },
        [WOODS[part.baseMaterial] ? WOODS[part.baseMaterial].name : (part.baseMaterial || "")]));
      grid.appendChild(reset);

      Object.keys(WOODS).forEach((k) => {
        if (k === "hdf") return;
        const w = WOODS[k];
        const tile = el("button", { class: "mp-swatch" + (cm === k ? " sel" : ""), onclick: () => apply(k) });
        const chip = el("span", { class: "mp-chip" });
        chip.style.background = w.base;
        chip.style.borderColor = w.grain;
        tile.appendChild(chip);
        tile.appendChild(el("span", { class: "mp-name" }, [w.name]));
        tile.appendChild(el("span", { class: "mp-price" }, [matPrice(k) + " CHF/m²"]));
        grid.appendChild(tile);
      });
      card.appendChild(grid);

      m.appendChild(card);
      m.style.display = "flex";
    }

    render();
  }

  function openPartDetail(part) {
    if (!part || !lastModel) return;
    const groups = SchreinerDrawing.groupParts(lastModel);
    let pos = 1, qty = 1;
    groups.forEach((g, i) => {
      if (g.p.name === part.name && g.p.material === part.material &&
        g.p.cut[0] === part.cut[0] && g.p.cut[1] === part.cut[1] && g.p.cut[2] === part.cut[2]) { pos = i + 1; qty = g.qty; }
    });
    let m = document.getElementById("detail-modal");
    if (!m) {
      m = el("div", { id: "detail-modal", class: "detail-modal" });
      document.body.appendChild(m);
      m.addEventListener("click", (e) => { if (e.target === m) m.style.display = "none"; });
    }
    m.innerHTML = "";
    const card = el("div", { class: "detail-card" });
    const head = el("div", { class: "detail-head" });
    head.appendChild(el("span", { class: "detail-title" }, [RGICON("search"), " Detail: " + part.name]));
    head.appendChild(el("div", { class: "shop-spacer" }));
    head.appendChild(el("button", { class: "tb", onclick: () => { m.style.display = "none"; openWorkshop(); } }, [RGICON("ruler"), " Werkstattplan"]));
    head.appendChild(el("button", { class: "btn-sec", onclick: () => { m.style.display = "none"; } }, [RGICON("x")]));
    card.appendChild(head);
    card.appendChild(el("div", { class: "detail-svg", html: SchreinerDrawing.partSVG(part, pos, qty, "auto") }));
    m.appendChild(card);
    m.style.display = "flex";
  }

  // ---------- Montageplan (IKEA-Stil) ----------
  function partKey(p) {
    const n = p.name, r = p.role, g = p.group;
    if (g === "Sockel") return "plinth";
    if (n === "Rueckwand") return "back";
    if (n === "Mittelseite") return "divider";
    if (r === "side" || n === "Boden" || n === "Deckel" || n.indexOf("Traverse") === 0) return "carcass";
    if (g === "Innenausbau") return "shelf";
    if (g === "Schublade") return "drawerbox";
    if (r === "drawerfront") return "drawerfront";
    if (r === "door") return "door";
    if (g === "Gestell" || g === "Platte") return "carcass";
    return "carcass";
  }

  const MONTAGE_STEPS = [
    { roles: ["plinth"], title: "Sockel montieren", text: "Sockelblende, Seiten und hinten verschrauben/verdübeln und ausrichten." },
    { roles: ["carcass"], title: "Korpus zusammenbauen", text: "Seiten mit Boden und Deckel über Dübel Ø8 verbinden, verleimen und mit Zwingen rechtwinklig fixieren." },
    { roles: ["back"], title: "Rückwand einsetzen", text: "Rückwand in die Nut (15 mm v. Hinterkante) einschieben – richtet den Korpus rechtwinklig aus." },
    { roles: ["divider"], title: "Mittelseiten einbauen", text: "Mittelseiten über Dübel einsetzen und verschrauben." },
    { roles: ["shelf"], title: "Einlegeböden einsetzen", text: "Bodenträger in die Systemlochung Ø5 (Raster 32) stecken, Böden auflegen." },
    { roles: ["runner", "drawerbox"], title: "Auszüge & Schubkästen montieren", text: "Blum-Führungen am Korpus befestigen (Bohrmaße lt. Werkstattzeichnung), Schubkästen einkuppeln und Lauf prüfen." },
    { roles: ["drawerfront", "door"], title: "Fronten & Türen montieren", text: "Schubladenfronten anschrauben, Türen mit Topfbändern Ø35 einhängen und in 3D justieren." },
    { roles: ["handle"], title: "Griffe & Feinjustage", text: "Griffe bohren/montieren, Fugen gleichmässig (3 mm) einstellen." },
  ];

  function stepItems(roles) {
    const items = [], grp = {};
    lastModel.parts.forEach((p) => { if (roles.indexOf(partKey(p)) >= 0) { grp[p.name] = (grp[p.name] || 0) + 1; } });
    Object.keys(grp).forEach((k) => items.push(grp[k] + "× " + k));
    if (roles.indexOf("runner") >= 0) {
      const b = {};
      (lastModel.blumParts || []).forEach((p) => { const key = p.name + " · " + p.art; b[key] = (b[key] || 0) + (p.qty || 1); });
      Object.keys(b).forEach((k) => items.push(b[k] + "× " + k));
    }
    if (roles.indexOf("door") >= 0 && lastModel.hardware.topfband) items.push(lastModel.hardware.topfband + "× Topfband Ø35");
    if (roles.indexOf("handle") >= 0 && lastModel.hardware.griff) items.push(lastModel.hardware.griff + "× Griff");
    if (roles.indexOf("shelf") >= 0 && lastModel.hardware.bodentraeger) items.push(lastModel.hardware.bodentraeger + "× Bodenträger");
    if (roles.indexOf("plinth") >= 0 && lastModel.hardware.sockelfuss) items.push(lastModel.hardware.sockelfuss + "× Sockelfuss");
    return items;
  }

  function generateMontage() {
    if (!lastModel) return;
    const present = {};
    lastModel.parts.forEach((p) => { present[partKey(p)] = 1; });
    if ((lastModel.runners || []).length) present.runner = 1;
    if ((lastModel.handles || []).length) present.handle = 1;
    const steps = MONTAGE_STEPS.filter((s) => s.roles.some((r) => present[r]));

    const cam = viewer.camera, ctrl = viewer.controls;
    const sp = cam.position.clone(), stg = ctrl.target.clone();
    const W = lastModel.bbox.w * 0.001, H = lastModel.bbox.h * 0.001, D = lastModel.bbox.d * 0.001;
    const maxd = Math.max(W, H, D), dist = maxd * 1.95 + 0.5;
    cam.position.set(dist * 0.82, H * 0.6 + 0.4, dist); ctrl.target.set(0, H / 2, 0); ctrl.update();

    const cover = viewer.snapshot();
    const done = [], data = [];
    steps.forEach((s, i) => {
      const img = viewer.snapshotAssembly(done.slice(), s.roles);
      s.roles.forEach((r) => done.push(r));
      data.push({ n: i + 1, title: s.title, text: s.text, img: img, items: stepItems(s.roles) });
    });
    cam.position.copy(sp); ctrl.target.copy(stg); ctrl.update(); viewer.render();
    openMontageDoc(cover, data);
  }

  function openMontageDoc(cover, steps) {
    const proj = TYPE_LABELS[cfg.type] + " " + cfg.width + "×" + cfg.height + "×" + cfg.depth + " mm" + moebelTag();
    let body = "<div class='cover'>" + firmHeadHTML() + "<h1>Montageanleitung</h1><div class='psub'>" + proj + "</div><img class='cimg' src='" + cover + "'></div>";
    steps.forEach((s) => {
      body += "<section class='mstep'><div class='mnum'>" + s.n + "</div><div class='mbody'><h2>" + s.title + "</h2><p>" + s.text + "</p>" +
        (s.items.length ? "<ul>" + s.items.map((i) => "<li>" + i + "</li>").join("") + "</ul>" : "") +
        "</div><img class='mimg' src='" + s.img + "'></section>";
    });
    const css = "@page{size:A4;margin:12mm;} *{box-sizing:border-box;} body{font-family:'Segoe UI',Arial,sans-serif;color:#1b2733;margin:0;}" +
      ".cover{text-align:center;page-break-after:always;padding:8mm;} .cover h1{font-size:30pt;margin:6mm 0 2mm;color:#1b3a5b;} .psub{color:#666;margin-bottom:6mm;font-size:12pt;} .cimg{max-width:78%;border:1px solid #ddd;border-radius:8px;}" +
      ".firmhead{display:flex;gap:6mm;align-items:center;justify-content:center;margin-bottom:5mm;} .fh-logo{max-height:18mm;max-width:55mm;object-fit:contain;} .fh-name{font-size:16pt;font-weight:800;color:#1b3a5b;} .fh-adr{font-size:9pt;color:#555;}" +
      ".mstep{display:flex;gap:8mm;align-items:flex-start;border:1px solid #e2e6eb;border-radius:10px;padding:7mm;margin:0 0 7mm;break-inside:avoid;}" +
      ".mnum{flex:0 0 auto;width:15mm;height:15mm;border-radius:50%;background:#1b3a5b;color:#fff;font-size:19pt;font-weight:800;display:flex;align-items:center;justify-content:center;}" +
      ".mbody{flex:1;} .mbody h2{margin:0 0 2mm;font-size:15pt;color:#1b3a5b;} .mbody p{margin:0 0 3mm;font-size:11pt;line-height:1.4;} .mbody ul{margin:0;padding-left:5mm;font-size:10pt;color:#444;} .mbody li{margin-bottom:1mm;}" +
      ".mimg{flex:0 0 44%;max-width:44%;border:1px solid #e2e6eb;border-radius:8px;background:#f4f6f9;}";
    const w = window.open("", "_blank");
    if (!w) { alert("Bitte Popups erlauben, dann erneut auf 'Montageplan' klicken."); return; }
    w.document.open();
    w.document.write("<!DOCTYPE html><html lang='de'><head><meta charset='utf-8'><title>Montageanleitung " + proj + "</title><style>" + css + "</style></head><body>" + body + "</body></html>");
    w.document.close();
  }

  // ---------- Holzhändler & Materialpreise ----------
  const HOLZ_DEALERS = [
    { name: "HM-Holzshop (Zuschnitt online)", url: "https://www.hm-holzshop.ch/shop/holzplatten-2814c1.html" },
    { name: "HORNBACH Schweiz", url: "https://www.hornbach.ch/de/c/holz-fenster-tueren/holzplatten-moebelbau/S6941/" },
    { name: "Bauhaus Schweiz", url: "https://www.bauhaus.ch/de/mdf-platten-spanplatten/c/10001475" },
    { name: "Coop Bau+Hobby", url: "https://www.bauundhobby.ch/bauen-renovieren/holz/holzplatten--holzzuschnitt/" },
    { name: "HolzLand Schweiz", url: "https://www.holzland.ch/holzplatten/" },
    { name: "Pickawood Schweiz", url: "https://www.pickawood.com/ch/tische/tischplatten/holzplatten" },
  ];
  let matOverrides = {};
  let holz = { name: HOLZ_DEALERS[0].name, url: HOLZ_DEALERS[0].url };

  function matPrice(key) { return (matOverrides[key] != null) ? matOverrides[key] : (WOODS[key] ? WOODS[key].price : 25); }
  function loadMatOverrides() { try { const s = localStorage.getItem("rgcad_mat_ov"); if (s) matOverrides = JSON.parse(s) || {}; } catch (e) {} }
  function saveMatOverrides() { try { localStorage.setItem("rgcad_mat_ov", JSON.stringify(matOverrides)); } catch (e) {} }
  function loadHolz() { try { const s = localStorage.getItem("rgcad_holz"); if (s) holz = JSON.parse(s); } catch (e) {} }
  function saveHolz() { try { localStorage.setItem("rgcad_holz", JSON.stringify(holz)); } catch (e) {} }

  function matTemplate() {
    let csv = "Material;Preis CHF/m2\r\n";
    Object.keys(WOODS).forEach((k) => { csv += WOODS[k].name + ";" + matPrice(k) + "\r\n"; });
    downloadFile("holz_preisliste_vorlage.csv", "﻿" + csv, "text/csv;charset=utf-8");
  }

  function importMatCSV() {
    const inp = el("input", { type: "file", accept: ".csv,text/csv" });
    inp.addEventListener("change", () => {
      const f = inp.files[0]; if (!f) return;
      const rd = new FileReader();
      rd.onload = () => {
        const lines = String(rd.result || "").split(/\r?\n/).filter((l) => l.trim());
        let matched = 0, unmatched = 0;
        lines.forEach((ln, idx) => {
          const sep = ln.indexOf(";") >= 0 ? ";" : ",";
          const cols = ln.split(sep).map((c) => c.trim().replace(/^"|"$/g, ""));
          if (idx === 0 && /material|preis|price/i.test(ln) && !/^[\d.,]+$/.test(cols[1] || "")) return;
          const nm = (cols[0] || "").toLowerCase();
          const price = parseFloat((cols[1] || "").replace(",", ".").replace(/[^\d.]/g, ""));
          if (!nm || isNaN(price)) return;
          let key = Object.keys(WOODS).find((k) => WOODS[k].name.toLowerCase() === nm);
          if (!key) key = Object.keys(WOODS).find((k) => WOODS[k].name.toLowerCase().indexOf(nm) >= 0 || nm.indexOf(WOODS[k].name.toLowerCase()) >= 0);
          if (key) { matOverrides[key] = price; matched++; } else unmatched++;
        });
        saveMatOverrides(); rebuild(); openHolz();
        alert("Import: " + matched + " Materialpreise übernommen" + (unmatched ? (", " + unmatched + " nicht zugeordnet") : "") + ".");
      };
      rd.readAsText(f);
    });
    inp.click();
  }

  function openHolz() {
    let m = document.getElementById("holz-modal");
    if (!m) {
      m = el("div", { id: "holz-modal", class: "blum-modal" });
      document.body.appendChild(m);
      m.addEventListener("click", (e) => { if (e.target === m) m.style.display = "none"; });
    }
    m.innerHTML = "";
    const card = el("div", { class: "blum-card" });
    const head = el("div", { class: "blum-head" });
    head.appendChild(el("span", { class: "blum-title" }, [RGICON("wood"), " Holzhändler & Materialpreise"]));
    head.appendChild(el("div", { class: "shop-spacer" }));
    head.appendChild(el("button", { class: "btn-sec", onclick: matTemplate }, [RGICON("download"), " Vorlage"]));
    head.appendChild(el("button", { class: "btn-sec", onclick: importMatCSV }, [RGICON("upload"), " Preisliste importieren"]));
    head.appendChild(el("button", { class: "btn-sec", onclick: () => { m.style.display = "none"; } }, [RGICON("x"), " Schliessen"]));
    card.appendChild(head);
    card.appendChild(el("div", { class: "blum-disc" }, ["Kein Live-Abruf möglich (Händler haben keine offene Preis-API). Hier Händlerpreise eintragen/importieren — sie fliessen in Stückliste & Kalkulation. Shop-Link öffnet den Bestell-Shop (CH, Zuschnitt + Lieferung)."]));

    const drow = el("div", { class: "holz-dealer" });
    drow.appendChild(el("span", { class: "holz-lbl" }, ["Händler:"]));
    const sel = el("select", { class: "shop-scale" });
    let curIdx = HOLZ_DEALERS.findIndex((d) => d.url === holz.url);
    HOLZ_DEALERS.forEach((d, i) => { const o = el("option", { value: String(i) }, [d.name]); if (i === curIdx) o.selected = true; sel.appendChild(o); });
    const urlInp = el("input", { type: "text", class: "holz-url", value: holz.url || "" });
    sel.addEventListener("change", () => { const d = HOLZ_DEALERS[+sel.value]; holz = { name: d.name, url: d.url }; urlInp.value = d.url; saveHolz(); });
    urlInp.addEventListener("change", () => { holz.url = urlInp.value.trim(); saveHolz(); });
    drow.appendChild(sel);
    drow.appendChild(urlInp);
    drow.appendChild(el("button", { class: "btn-primary", onclick: () => { if (holz.url) window.open(holz.url, "_blank"); } }, [RGICON("cart"), " Shop öffnen"]));
    card.appendChild(drow);

    const tbl = el("table", { class: "blum-tbl" });
    const thr = el("tr", {}); ["Material", "Stärke", "Preis CHF/m²"].forEach((h) => thr.appendChild(el("th", {}, [h]))); tbl.appendChild(thr);
    Object.keys(WOODS).forEach((k) => {
      const w = WOODS[k]; const tr = el("tr", {});
      tr.appendChild(el("td", {}, [w.name]));
      tr.appendChild(el("td", {}, [(w.t || "-") + " mm"]));
      const td = el("td", {});
      const inp = el("input", { type: "number", step: "0.5", min: "0", class: "blum-price", value: String(matPrice(k)) });
      inp.addEventListener("change", () => { const v = parseFloat(inp.value); if (isNaN(v)) delete matOverrides[k]; else matOverrides[k] = v; saveMatOverrides(); rebuild(); });
      td.appendChild(inp); tr.appendChild(td); tbl.appendChild(tr);
    });
    card.appendChild(tbl);
    card.appendChild(el("div", { class: "blum-src" }, ["Tipp: Preisliste deines Händlers als CSV (Material;Preis) importieren — oder Preise direkt eintragen. Werte bleiben gespeichert."]));
    m.appendChild(card);
    m.style.display = "flex";
  }

  // ---------- Konstruktionszeichnung (Fusion-Stil) ----------
  function openConstruction() {
    if (!lastModel) return;
    const iso = viewer.snapshot();
    const dateStr = new Date().toLocaleDateString("de-CH");
    const proj = TYPE_LABELS[cfg.type] + " " + cfg.width + "×" + cfg.height + "×" + cfg.depth + " mm" + moebelTag();
    const cons = SchreinerDrawing.constructionSVG(lastModel, 372, 232);
    const sec = SchreinerDrawing.sectionSVG(lastModel, 360, 232);
    const matName = WOODS[cfg.material] ? WOODS[cfg.material].name : cfg.material;
    const sheet = "<section class='sheet'>" + firmHeadHTML() +
      "<div class='cons-wrap'><div class='cons-main'>" + cons + "</div>" +
      "<div class='cons-iso'><img src='" + iso + "'><div class='iso-cap'>Isometrie</div>" +
      "<div class='leg'>— sichtbare Kante &nbsp; - - - verdeckt</div></div></div>" +
      titleBlock({ proj: proj, benennung: "Konstruktion – Ansichten", mat: matName, st: (cfg.thickness || "-") + " mm", scale: "A3 eingepasst", qty: "1", date: dateStr, sheet: "1/2" }) +
      "</section>" +
      "<section class='sheet'>" + firmHeadHTML() +
      "<div class='cons-wrap'><div class='cons-main'>" + sec + "</div></div>" +
      titleBlock({ proj: proj, benennung: "Schnitt A–A + Innenmasse", mat: matName, st: (cfg.thickness || "-") + " mm", scale: "A3 eingepasst", qty: "1", date: dateStr, sheet: "2/2" }) +
      "</section>";
    const css =
      "@page{ size:A3 landscape; margin:8mm; }" +
      "*{box-sizing:border-box;} body{font-family:'Segoe UI',Arial,sans-serif;color:#1b2733;margin:0;}" +
      ".sheet{border:0.6mm solid #222;padding:6mm;display:flex;flex-direction:column;min-height:275mm;page-break-after:always;}" +
      ".sheet:last-child{page-break-after:auto;}" +
      ".leg{font-size:8pt;color:#555;margin-top:3mm;}" +
      ".cons-wrap{flex:1;display:flex;gap:6mm;align-items:flex-start;}" +
      ".cons-main{flex:1;min-width:0;} .cons-main svg{width:100%;height:auto;}" +
      ".cons-iso{flex:0 0 68mm;text-align:center;} .cons-iso img{width:100%;border:0.3mm solid #ccc;border-radius:2mm;background:#f4f6f9;} .iso-cap{font-size:9pt;color:#1b3a5b;margin-top:2mm;font-weight:700;}" +
      ".firmhead{display:flex;gap:6mm;align-items:center;border-bottom:0.5mm solid #222;padding-bottom:2.5mm;margin-bottom:3mm;} .fh-logo{max-height:16mm;max-width:50mm;object-fit:contain;} .fh-name{font-size:14pt;font-weight:800;color:#1b3a5b;} .fh-adr{font-size:9pt;color:#555;}" +
      ".tb{align-self:flex-end;margin-top:4mm;} .tb table{border-collapse:collapse;border:0.5mm solid #222;} .tb td{border:0.3mm solid #555;padding:1mm 3mm;font-size:9pt;white-space:nowrap;}" +
      ".tb .k{color:#555;font-size:8pt;} .tb .v{font-weight:700;} .tb .lg{font-weight:800;font-size:11pt;color:#16624f;text-align:center;background:#f0f4f3;line-height:1.1;} .tb .lg img{max-width:24mm;max-height:14mm;display:block;margin:auto;} .tb .firm{font-weight:700;font-size:8.5pt;color:#1b3a5b;background:#f7faf9;}";
    const w = window.open("", "_blank");
    if (!w) { alert("Bitte Popups erlauben, dann erneut auf 'Konstruktion' klicken."); return; }
    w.document.open();
    w.document.write("<!DOCTYPE html><html lang='de'><head><meta charset='utf-8'><title>Konstruktionszeichnung " + proj + "</title><style>" + css + "</style></head><body>" + sheet + "</body></html>");
    w.document.close();
  }

  // ---------- Fertigung: Verschnitt, Etiketten, DXF, Bestellung, Foto ----------
  function projTitle() { return TYPE_LABELS[cfg.type] + " " + cfg.width + "×" + cfg.height + "×" + cfg.depth + " mm" + moebelTag(); }
  function docCSS() {
    return "@page{size:A4;margin:10mm}*{box-sizing:border-box}body{font-family:'Segoe UI',Arial,sans-serif;color:#1b2733;margin:0;padding:8mm}" +
      "h1{font-size:18pt;margin:0 0 2mm}h2{font-size:12pt;margin:8mm 0 2mm;color:#1b3a5b}.meta{color:#555;font-size:10pt;margin-bottom:6mm}" +
      "table{border-collapse:collapse;width:100%;font-size:10pt}th,td{border:0.3mm solid #999;padding:1.5mm 3mm;text-align:left}th{background:#f3eee7}td.n{text-align:right}" +
      ".plate{page-break-inside:avoid;margin:4mm 0 8mm}.plate svg{width:100%;height:auto}.note{color:#555;font-size:9pt;margin-top:6mm}";
  }
  function openDoc(title, body) {
    const w = window.open("", "_blank");
    if (!w) { alert("Bitte Popups erlauben, dann erneut klicken."); return null; }
    w.document.open(); w.document.write("<!DOCTYPE html><html lang='de'><head><meta charset='utf-8'><title>" + escapeHtml(title) + "</title><style>" + docCSS() + "</style></head><body>" + body + "</body></html>"); w.document.close();
    return w;
  }
  function openVerschnitt() {
    if (!lastModel || !window.RGFertigung) return;
    const res = RGFertigung.verschnitt(lastModel, { plateL: PLATE_L, plateB: PLATE_B });
    let body = "<h1>Schnittplan – " + escapeHtml(projTitle()) + "</h1><div class='meta'>" + (firma.name ? escapeHtml(firma.name) + " · " : "") + new Date().toLocaleDateString("de-CH") +
      " · Platte " + PLATE_L + " × " + PLATE_B + " mm · Schnittfuge " + res.kerf + " mm · Besäumen " + res.trim + " mm je Seite · Faser längs</div>";
    body += "<table><tr><th>Material</th><th>Stärke</th><th class='n'>Teile</th><th class='n'>Platten</th><th class='n'>Nutzung</th><th class='n'>Rest</th></tr>";
    res.groups.forEach((g) => { body += "<tr><td>" + escapeHtml(g.name) + "</td><td>" + g.t + " mm</td><td class='n'>" + g.parts + "</td><td class='n'>" + g.nSheets + "</td><td class='n'>" + Math.round(g.utilization * 100) + " %</td><td class='n'>" + (g.grossArea - g.usedArea).toFixed(2) + " m²</td></tr>"; });
    body += "<tr><th colspan='3'>Total</th><th class='n'>" + res.nSheets + "</th><th></th><th></th></tr></table>";
    res.groups.forEach((g) => {
      g.sheets.forEach((sh, i) => { body += "<div class='plate'>" + RGFertigung.verschnittSVG(sh, res, escapeHtml(g.name) + " " + g.t + " mm · Platte " + (i + 1) + "/" + g.sheets.length) + "</div>"; });
    });
    body += "<div class='note'>Regalverfahren (Guillotine-Schnitte, waagrecht zuerst). Teile mit Faser längs werden nicht gedreht. Reststücke stehen rechts und unten. Für die Plattensäge: Streifen von oben nach unten, dann Teile von links nach rechts.</div>";
    openDoc("Schnittplan " + projTitle(), body);
  }
  function printEtiketten() {
    if (!lastModel || !window.RGFertigung) return;
    const html = RGFertigung.etikettenHTML(lastModel, { firma: firma.name || "RG CAD", projekt: (project && project.name) || projTitle(), code: ((project && project.name) || "RG").replace(/[^0-9A-Za-z]/g, "").slice(0, 6).toUpperCase() || "RG" });
    const w = window.open("", "_blank");
    if (!w) { alert("Bitte Popups erlauben, dann erneut klicken."); return; }
    w.document.open(); w.document.write(html); w.document.close();
  }
  function exportDXF(ids) {
    if (!lastModel || !window.RGFertigung) return;
    const name = ("rgcad_" + projTitle()).replace(/[^0-9A-Za-z_]+/g, "_").replace(/_+$/, "") + (ids ? "_P" + ids.join("-") : "") + ".dxf";
    downloadFile(name, RGFertigung.dxf(lastModel, { ids: ids }), "application/dxf");
  }
  // ---------- Warenkorb ----------
  // Positionen aus Verschnitt, Kanten und Beschlägen mit Preisen. Mengen, Preise und Auswahl
  // bleiben je Projekt gespeichert. Bestellt wird per E-Mail an den Händler (keine Zahlung im Programm).
  const KANTE_CHF_M = 1.2;
  function korbKey() { return "rgcad_korb_" + projTitle(); }
  function loadKorb() { try { return JSON.parse(localStorage.getItem(korbKey()) || "{}"); } catch (e) { return {}; } }
  function saveKorb(k) { try { localStorage.setItem(korbKey(), JSON.stringify(k)); } catch (e) {} }
  function korbPositionen() {
    const res = lastVerschnitt || RGFertigung.verschnitt(lastModel, { plateL: PLATE_L, plateB: PLATE_B });
    const hw = [];
    Object.keys(lastModel.hardware || {}).forEach((k) => { const n = lastModel.hardware[k]; if (n > 0 && HW[k]) hw.push({ artikel: HW[k].name, menge: n, preis: HW[k].price }); });
    const bAgg = {};
    (lastModel.blumParts || []).forEach((p) => { const key = p.name + "|" + p.art; if (!bAgg[key]) bAgg[key] = { artikel: p.name, art: p.art, menge: 0, preis: p.price || 0 }; bAgg[key].menge += (p.qty || 1); });
    Object.values(bAgg).forEach((b) => hw.push(b));
    const edgeByMat = {};
    (lastModel.parts || []).forEach((p) => { edgeByMat[p.material] = (edgeByMat[p.material] || 0) + (p.edgeMM || 0); });
    return RGFertigung.bestellung(lastModel, res, hw, edgeByMat, {
      platte: (mat) => ((WOODS[mat] && WOODS[mat].price) || 0) * PLATE_AREA, kanteM: KANTE_CHF_M
    });
  }
  function openBestellung() {
    if (!lastModel || !window.RGFertigung) return;
    const korb = loadKorb(); korb.pos = korb.pos || {};
    const rows = korbPositionen().map((r) => {
      const k = korb.pos[r.key];
      return Object.assign({}, r, { an: k ? k.an !== false : true, menge: k && k.menge != null ? k.menge : r.menge, preis: k && k.preis != null ? k.preis : r.preis, mengeVorschlag: r.menge });
    });
    const old = document.getElementById("bestell-modal"); if (old) old.remove();
    const m = el("div", { class: "firma-modal", id: "bestell-modal" });
    const card = el("div", { class: "firma-card korb-card" });
    card.appendChild(el("div", { class: "firma-h" }, [RGICON("cart"), " Warenkorb – " + projTitle()]));
    const tbl = el("table", { class: "proj-tbl korb-tbl" });
    const sumBox = el("div", { class: "korb-summe" });
    const fmt = (x) => "CHF " + (Math.round(x * 100) / 100).toLocaleString("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    function aktiv() { return rows.filter((r) => r.an && r.menge > 0); }
    function persist() {
      const pos = {};
      rows.forEach((r) => { pos[r.key] = { an: r.an, menge: r.menge, preis: r.preis }; });
      korb.pos = pos; saveKorb(korb);
    }
    function summe() {
      const s = RGFertigung.korbSumme(aktiv());
      sumBox.innerHTML = "";
      sumBox.appendChild(el("div", {}, [el("span", {}, [aktiv().length + " Positionen · Netto"]), el("b", {}, [fmt(s.netto)])]));
      sumBox.appendChild(el("div", {}, [el("span", {}, ["MwSt 8,1 %"]), el("b", {}, [fmt(s.mwst)])]));
      sumBox.appendChild(el("div", { class: "korb-total" }, [el("span", {}, ["Total"]), el("b", {}, [fmt(s.brutto)])]));
    }
    function zeile(r) {
      const tr = el("tr", { class: r.an ? "" : "aus" });
      const cb = el("input", { type: "checkbox" }); cb.checked = r.an;
      cb.addEventListener("change", () => { r.an = cb.checked; tr.className = r.an ? "" : "aus"; persist(); summe(); });
      const qn = el("input", { type: "number", min: "0", step: r.einheit === "m" ? "0.1" : "1", value: String(r.menge), class: "korb-num" });
      const pr = el("input", { type: "number", min: "0", step: "0.05", value: (r.preis || 0).toFixed(2), class: "korb-num" });
      const tot = el("td", { class: "pa" }, [fmt(r.preis * r.menge)]);
      const upd = () => { r.menge = Math.max(0, parseFloat(qn.value) || 0); r.preis = Math.max(0, parseFloat(pr.value) || 0); tot.textContent = fmt(r.preis * r.menge); persist(); summe(); };
      qn.addEventListener("input", upd); pr.addEventListener("input", upd);
      const name = el("td", { class: "nm" }, [r.artikel]);
      if (r.art) { name.appendChild(el("div", { class: "dt" }, ["Art. " + r.art + "  "])); name.lastChild.appendChild(shopA(r.artikel + " " + r.art, "Händler ↗")); }
      else if (r.hinweis) name.appendChild(el("div", { class: "dt" }, [r.hinweis]));
      tr.appendChild(el("td", {}, [cb])); tr.appendChild(name);
      tr.appendChild(el("td", { class: "pa" }, [qn, " " + r.einheit]));
      tr.appendChild(el("td", { class: "pa" }, [pr])); tr.appendChild(tot);
      return tr;
    }
    tbl.appendChild(el("tr", {}, [el("th", {}, [""]), el("th", { style: "text-align:left" }, ["Artikel"]), el("th", { style: "text-align:right" }, ["Menge"]), el("th", { style: "text-align:right" }, ["Preis CHF"]), el("th", { style: "text-align:right" }, ["Total"])]));
    let grp = "";
    rows.forEach((r) => {
      if (r.gruppe !== grp) { grp = r.gruppe; tbl.appendChild(el("tr", { class: "korb-grp" }, [el("td", { colspan: "5" }, [grp])])); }
      tbl.appendChild(zeile(r));
    });
    const wrap = el("div", { class: "korb-wrap" }); wrap.appendChild(tbl); card.appendChild(wrap);
    card.appendChild(sumBox); summe();
    // Händler und Lieferung
    const form = el("div", { class: "korb-form" });
    const mail = el("input", { type: "email", placeholder: "E-Mail des Händlers", value: korb.mail || "" });
    const lief = el("input", { type: "text", placeholder: "Lieferadresse oder «Abholung»", value: korb.lieferung || "" });
    mail.addEventListener("change", () => { korb.mail = mail.value.trim(); saveKorb(korb); });
    lief.addEventListener("change", () => { korb.lieferung = lief.value.trim(); saveKorb(korb); });
    form.appendChild(el("label", {}, ["Händler (" + (holz.name || "Holzhändler") + ")", mail]));
    form.appendChild(el("label", {}, ["Lieferung", lief]));
    card.appendChild(form);
    card.appendChild(el("div", { class: "hint" }, ["Platten aus der Verschnittoptimierung (Plattenpreis = CHF/m² × " + PLATE_AREA.toFixed(2) + " m²), Kanten CHF " + KANTE_CHF_M.toFixed(2) + "/m mit 10 % Zugabe, Beschläge aus dem Modell. Preise sind Richtwerte und hier anpassbar. Die Bestellung geht per E-Mail an den Händler; bezahlt wird beim Händler."]));
    const btns = el("div", { class: "firma-btns" });
    const absender = () => [firma.name, firma.adresse, firma.tel, firma.email].filter(Boolean).join("\n");
    btns.appendChild(el("button", { class: "btn-primary", onclick: () => {
      const a = aktiv(); if (!a.length) { alert("Der Warenkorb ist leer."); return; }
      const body = RGFertigung.bestellText(a, { projekt: projTitle(), lieferung: lief.value.trim(), absender: absender() });
      window.location.href = "mailto:" + encodeURIComponent(mail.value.trim()) + "?subject=" + encodeURIComponent("Bestellung " + projTitle()) + "&body=" + encodeURIComponent(body);
    } }, [RGICON("cart"), " Bestellung senden"]));
    btns.appendChild(el("button", { class: "btn-sec", onclick: () => {
      const a = aktiv(), s = RGFertigung.korbSumme(a);
      const b = "<h1>Bestellung – " + escapeHtml(projTitle()) + "</h1><div class='meta'>" + new Date().toLocaleDateString("de-CH") + (firma.name ? " · " + escapeHtml(firma.name) : "") + (lief.value.trim() ? " · Lieferung: " + escapeHtml(lief.value.trim()) : "") + "</div><table><tr><th>Gruppe</th><th>Artikel</th><th class='n'>Menge</th><th class='n'>Preis CHF</th><th class='n'>Total CHF</th></tr>" +
        a.map((r) => "<tr><td>" + escapeHtml(r.gruppe) + "</td><td>" + escapeHtml(r.artikel) + (r.art ? " <small>Art. " + escapeHtml(r.art) + "</small>" : "") + "</td><td class='n'>" + r.menge + " " + r.einheit + "</td><td class='n'>" + r.preis.toFixed(2) + "</td><td class='n'>" + (r.preis * r.menge).toFixed(2) + "</td></tr>").join("") +
        "<tr><td colspan='4' class='n'>Netto</td><td class='n'>" + s.netto.toFixed(2) + "</td></tr><tr><td colspan='4' class='n'>MwSt 8,1 %</td><td class='n'>" + s.mwst.toFixed(2) + "</td></tr><tr><td colspan='4' class='n'><b>Total</b></td><td class='n'><b>" + s.brutto.toFixed(2) + "</b></td></tr></table>";
      openDoc("Bestellung", b);
    } }, [RGICON("print"), " PDF"]));
    btns.appendChild(el("button", { class: "btn-sec", onclick: () => downloadFile("warenkorb.csv", RGFertigung.bestellungCSV(aktiv()), "text/csv;charset=utf-8") }, [RGICON("download"), " CSV"]));
    btns.appendChild(el("button", { class: "btn-sec", onclick: () => { if (holz.url) window.open(holz.url, "_blank"); else openHolz(); } }, [RGICON("link"), " Shop " + (holz.name || "Händler")]));
    btns.appendChild(el("button", { class: "btn-sec", title: "Mengen und Preise aus dem Modell neu übernehmen", onclick: () => { korb.pos = {}; saveKorb(korb); openBestellung(); } }, [RGICON("reset"), " Zurücksetzen"]));
    btns.appendChild(el("button", { class: "btn-sec", onclick: () => { m.remove(); } }, [RGICON("x"), " Schliessen"]));
    card.appendChild(btns);
    m.appendChild(card); document.body.appendChild(m); m.style.display = "flex";
  }

  // Foto-Modus: echtes Raytracing (js/raytrace.js), Bild wird Durchgang für Durchgang ruhiger.
  let fotoJob = null, fotoTimer = 0;
  function fotoName() { return ("rgcad_foto_" + projTitle()).replace(/[^0-9A-Za-z_]+/g, "_").replace(/_+$/, "") + ".png"; }
  function fotoExport() {
    if (!viewer) return;
    if (!window.RGRaytrace || !window.Worker) {   // Rückfall: schnelles Bild ohne Raytracing
      const a = el("a", { href: viewer.fotoRender(3200), download: fotoName() }); document.body.appendChild(a); a.click(); a.remove(); return;
    }
    const old = document.getElementById("foto-modal"); if (old) old.remove();
    const m = el("div", { class: "firma-modal", id: "foto-modal" });
    const card = el("div", { class: "firma-card foto-card" });
    card.appendChild(el("div", { class: "firma-h" }, [RGICON("eye"), " Foto-Modus · Raytracing"]));
    const stage = el("div", { class: "foto-stage" });
    const canvas = el("canvas", { class: "foto-canvas" });
    stage.appendChild(canvas); card.appendChild(stage);
    const bar = el("div", { class: "foto-bar" }, [el("span", { style: "width:0%" })]);
    const status = el("div", { class: "foto-status" }, ["Szene wird vorbereitet …"]);
    card.appendChild(bar); card.appendChild(status);
    const ctl = el("div", { class: "foto-ctl" });
    const size = el("select", { class: "foto-sel", title: "Bildbreite in Pixel" });
    [["1280", "1280 px · schnell"], ["1920", "1920 px · Standard"], ["2560", "2560 px · Druck"]].forEach((o) => size.appendChild(el("option", { value: o[0] }, [o[1]])));
    size.value = "1920";
    const qual = el("select", { class: "foto-sel", title: "Durchgänge: mehr = ruhigeres Bild" });
    [["48", "Entwurf (48)"], ["128", "Gut (128)"], ["320", "Sehr gut (320)"]].forEach((o) => qual.appendChild(el("option", { value: o[0] }, [o[1]])));
    qual.value = "128";
    ctl.appendChild(el("label", {}, ["Grösse ", size])); ctl.appendChild(el("label", {}, ["Qualität ", qual]));
    card.appendChild(ctl);
    card.appendChild(el("div", { class: "hint" }, ["Gerechnet wird die aktuelle Ansicht mit Pfadverfolgung: weiche Schatten, Licht zwischen den Flächen, Glanz auf Lack und Metall. Alles läuft auf deinem Gerät, nichts wird hochgeladen."]));
    const btns = el("div", { class: "firma-btns" });
    const save = el("button", { class: "btn-primary", onclick: () => { canvas.toBlob((b) => { const a = el("a", { href: URL.createObjectURL(b), download: fotoName() }); document.body.appendChild(a); a.click(); a.remove(); }, "image/png"); } }, [RGICON("download"), " PNG speichern"]);
    const again = el("button", { class: "btn-sec", onclick: () => start() }, [RGICON("reset"), " Neu rechnen"]);
    const close = el("button", { class: "btn-sec", onclick: () => { clearTimeout(fotoTimer); if (fotoJob) fotoJob.stop(); fotoJob = null; m.remove(); } }, [RGICON("x"), " Schliessen"]);
    btns.appendChild(save); btns.appendChild(again); btns.appendChild(close); card.appendChild(btns);
    m.appendChild(card); document.body.appendChild(m); m.style.display = "flex";
    function start() {
      clearTimeout(fotoTimer);
      if (fotoJob) { fotoJob.stop(); fotoJob = null; }
      m.classList.remove("foto-fertig");
      const passes = +qual.value;
      bar.firstChild.style.width = "0%";
      fotoTimer = setTimeout(() => {
        fotoJob = RGRaytrace.render(viewer, {
          width: +size.value, passes: passes, canvas: canvas,
          onProgress: (n, total, sec) => {
            bar.firstChild.style.width = Math.round(100 * n / total) + "%";
            const rest = n ? Math.max(0, Math.round(sec / n * (total - n))) : 0;
            status.textContent = "Durchgang " + n + " von " + total + " · " + Math.round(sec) + " s" + (n < total && n ? " · noch etwa " + rest + " s" : "");
          },
          onDone: () => { status.textContent = "Fertig: " + canvas.width + " × " + canvas.height + " px, " + passes + " Durchgänge. Du kannst das Bild speichern."; m.classList.add("foto-fertig"); },
          onError: () => { status.textContent = "Raytracing ist auf diesem Gerät nicht verfügbar."; }
        });
        status.textContent = "Rechne " + fotoJob.triangles.toLocaleString("de-CH") + " Dreiecke in " + fotoJob.width + " × " + fotoJob.height + " px …";
      }, 30);
    }
    start();
  }

  // ---------- Toolbar ----------
  function wireToolbar() {
    const t = (id, fn) => { const e = document.getElementById(id); if (e) e.addEventListener("click", fn); };
    t("btn-reset", () => viewer.resetView());
    t("btn-wire", (e) => { const on = !viewer.wireframe; viewer.setWireframe(on); e.currentTarget.classList.toggle("on", on); });
    t("btn-explode", (e) => { const on = !viewer.exploded; viewer.setExploded(on); e.currentTarget.classList.toggle("on", on); });
    t("btn-drawers", (e) => { const open = !viewer.anyDrawerOpen(); viewer.openAllDrawers(open); e.currentTarget.classList.toggle("on", open); });
    t("btn-doors", (e) => { const open = !viewer.anyDoorOpen(); viewer.openAllDoors(open); e.currentTarget.classList.toggle("on", open); });
    t("btn-flaps", (e) => { const open = !viewer.anyFlapOpen(); viewer.openAllFlaps(open); e.currentTarget.classList.toggle("on", open); });
    t("btn-mat", (e) => {
      materialMode = !materialMode;
      viewer.materialMode = materialMode;
      e.currentTarget.classList.toggle("on", materialMode);
      setMatModeUI(materialMode);
      if (!materialMode) { const mm = document.getElementById("matpick-modal"); if (mm) mm.style.display = "none"; }
    });
    t("btn-dims", (e) => { const on = !viewer.showDims; viewer.setDims(on); e.currentTarget.classList.toggle("on", on); });
    t("btn-shot", () => { const a = el("a", { href: viewer.snapshot(), download: "moebel.png" }); document.body.appendChild(a); a.click(); a.remove(); });
    t("btn-shop", openWorkshop);
    t("btn-verschnitt", openVerschnitt);
    t("btn-etiketten", printEtiketten);
    t("btn-dxf", () => exportDXF());
    t("btn-bestellung", openBestellung);
    t("btn-foto", fotoExport);
    t("btn-cons", openConstruction);
    t("btn-montage", generateMontage);
    t("btn-blum", openBlum);
    t("btn-firma", openFirma);
    t("btn-print", exportHTML);
    t("btn-csv", exportCSV);
    t("btn-holz", openHolz);
    t("btn-profi", exportToProfi);
    t("btn-fusion", exportFusion);
    t("btn-save", () => saveCurrentToDB(false));
    t("btn-load", openProjects);
    t("btn-quader", addBoxNumeric);
    t("btn-grundriss", startGroundRectSketch);
    t("btn-moebel-add", addMoebel);
    t("btn-bohrung", () => cutSelectedOrLast("cyl"));
    t("btn-nut", () => cutSelectedOrLast("box"));
    t("btn-griffe", openHandlePicker);
  }

  function selectionInfo(part) {
    const box = document.getElementById("sel-info");
    if (!part) { box.style.display = "none"; return; }
    box.style.display = "block";
    box.innerHTML = "<b>" + part.name + "</b><br>" +
      Math.round(part.cut[0]) + " × " + Math.round(part.cut[1]) + " × " + part.cut[2] + " mm<br>" +
      "<span class='si-mat'>" + (WOODS[part.material] ? WOODS[part.material].name : part.material) + "</span>";
    document.querySelectorAll("#cutlist-body tr").forEach((tr) => {
      const ids = (tr.getAttribute("data-ids") || "").split(",").map(Number);
      tr.classList.toggle("hl", ids.indexOf(part.id) >= 0);
    });
  }

  function start() {
    SchreinerMaterials.init(window.THREE);
    viewer = new SchreinerViewer(document.getElementById("viewport"));
    window.__viewer = viewer;
    viewer.onSelect = onPartClick;
    viewer.onRender = updateViewCube;
    wireViewCube();
    wireRibbonTabs();
    applyRibbonIcons();
    wireRibbonTips();
    window.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { cancelSketchUI(); if (materialMode) { document.getElementById("btn-mat").click(); } return; }
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      const ae = document.activeElement;
      if (ae && /^(INPUT|SELECT|TEXTAREA)$/.test(ae.tagName)) return;
      const modalOpen = Array.prototype.some.call(document.querySelectorAll('[id$="-modal"]'),
        function (m) { return m.style.display === "flex" || m.style.display === "block"; });
      if (modalOpen) return;
      const k = e.key.toUpperCase();
      for (const id in SHORTCUTS) {
        if (SHORTCUTS[id] === k) { const b = document.getElementById(id); if (b) { b.click(); e.preventDefault(); } break; }
      }
    });
    loadBlumOverrides();
    loadMatOverrides();
    loadHolz();
    if (window.RGDB) setTimeout(function () { RGDB.init(); }, 0);
    project = migrateToProject(loadLocal()) || { name: "Projekt", moebel: [defaults("base")], active: 0, bodies: [] };
    cfg = activeCfg();
    if (!cfg.columns && cfg.type !== "table") cfg.columns = [{ w: 1, type: "door_l", count: 1 }];
    wireToolbar();
    buildControls();
    rebuild();
  }

  if (document.readyState === "loading") window.addEventListener("DOMContentLoaded", start);
  else start();
})();
