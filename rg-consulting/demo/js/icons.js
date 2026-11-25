// Einheitliche Strichsymbole für RG CAD (statt Emoji, die je nach Gerät anders aussehen).
// RGICON("name") liefert ein <svg class="rgi">, das die Schriftfarbe übernimmt.
(function () {
  const P = {
    folder: '<path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4l2 2h8A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-14A1.5 1.5 0 0 1 3 17.5z"/>',
    axes: '<path d="M4 20V5M4 20h15M4 20l6-6"/><path d="M2.5 7 4 4l1.5 3M16 18.5 19 20l-1.5-3M8.5 13 10 14l-1-1.5"/>',
    cube: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/>',
    part: '<rect x="5" y="5" width="14" height="14" rx="1.5"/>',
    bodies: '<path d="M4 8l8-4 8 4-8 4z"/><path d="M4 12l8 4 8-4M4 16l8 4 8-4"/>',
    box: '<path d="M4 9l8-4 8 4v8l-8 4-8-4z"/><path d="M12 13V21M4 9l8 4 8-4"/>',
    cut: '<circle cx="7" cy="7" r="2.5"/><circle cx="7" cy="17" r="2.5"/><path d="M9 8.5 20 18M9 15.5 20 6M14.5 12l-5.5 3.5"/>',
    eye: '<path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"/><circle cx="12" cy="12" r="2.5"/>',
    pencil: '<path d="M4 20l4-1 10.5-10.5a2 2 0 0 0-3-3L5 16z"/><path d="M13.5 6.5l3 3"/>',
    trash: '<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/><path d="M10 11v5M14 11v5"/>',
    height: '<path d="M12 3v18M8.5 6.5 12 3l3.5 3.5M8.5 17.5 12 21l3.5-3.5"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    print: '<path d="M7 9V4h10v5M7 18H4.5A1.5 1.5 0 0 1 3 16.5v-6A1.5 1.5 0 0 1 4.5 9h15A1.5 1.5 0 0 1 21 10.5v6a1.5 1.5 0 0 1-1.5 1.5H17"/><path d="M7 14h10v7H7z"/>',
    download: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M4 19h16"/>',
    upload: '<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M4 19h16"/>',
    folderopen: '<path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h4l2 2h7.5A1.5 1.5 0 0 1 19.5 9.5V11"/><path d="M3 11h18.5l-2.3 7.2a1.5 1.5 0 0 1-1.4 1H4.5A1.5 1.5 0 0 1 3 17.7z"/>',
    building: '<path d="M4 21V5.5A1.5 1.5 0 0 1 5.5 4h8A1.5 1.5 0 0 1 15 5.5V21M15 10h3.5A1.5 1.5 0 0 1 20 11.5V21M3 21h18"/><path d="M7.5 8h2M7.5 12h2M7.5 16h2"/>',
    database: '<ellipse cx="12" cy="6" rx="7" ry="2.5"/><path d="M5 6v12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6"/><path d="M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5"/>',
    droplet: '<path d="M12 3.5s6 6.3 6 10.5a6 6 0 0 1-12 0c0-4.2 6-10.5 6-10.5z"/>',
    search: '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5"/>',
    ruler: '<path d="M3.5 15.5 15.5 3.5l5 5-12 12z"/><path d="M8 11l2 2M11 8l2 2M14 5l2 2M5 14l2 2"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    cart: '<path d="M3 4h2.5l2.2 11h10.6l2.2-8H7"/><circle cx="9.5" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/>',
    wood: '<path d="M4 7h16v10H4z"/><path d="M4 10.5c3 0 3 3 6 3s3-3 6-3 3 3 4 3M4 14.5c2 0 2-2 4-2"/>',
    handle: '<path d="M5 12h14"/><path d="M5 9v6M19 9v6"/>',
    drawer: '<path d="M4 5h16v6H4zM4 13h16v6H4z"/><path d="M10 8h4M10 16h4"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    reset: '<path d="M4 12a8 8 0 1 0 2.3-5.7"/><path d="M4 4v5h5"/>'
  };
  function icon(name, size) {
    const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("class", "rgi rgi-" + name); s.setAttribute("aria-hidden", "true");
    s.setAttribute("fill", "none"); s.setAttribute("stroke", "currentColor"); s.setAttribute("stroke-width", "1.7");
    s.setAttribute("stroke-linecap", "round"); s.setAttribute("stroke-linejoin", "round");
    if (size) { s.setAttribute("width", size); s.setAttribute("height", size); }
    s.innerHTML = P[name] || P.part;
    return s;
  }
  icon.has = function (name) { return !!P[name]; };
  window.RGICON = icon;
})();
