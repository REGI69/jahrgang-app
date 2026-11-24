/* RG Ing. Consulting – Tagesrätsel: gemeinsames Grundgerüst.
   Eigenentwicklung, keine fremden Bibliotheken, keine Schriften oder Skripte von Dritten,
   keine Cookies, kein Tracking. Spielstand und Statistik bleiben im localStorage des Geräts. */
(function () {
  'use strict';

  var SPENDEN_URL = 'https://jahrgang.payrexx.com/pay?cid=57aa4706';   // TWINT und Apple Pay, Betrag frei wählbar
  var KARTEN_URL = 'https://pay.sumup.com/b2c/QYY7QR8X';              // SumUp: CHF 1 mit Karte
  var SEITE = 'https://regi69.github.io/jahrgang-app/raetsel/';
  var START = '2026-11-01';            // Rätsel Nr. 1
  var SPIELE = [
    { id: 'tageswort',  titel: 'Tageswort',  datei: 'tageswort.html',  kurz: 'Das Wort des Tages in sechs Versuchen.' },
    { id: 'dazwischen', titel: 'Dazwischen', datei: 'dazwischen.html', kurz: 'Welches Wort liegt im Alphabet dazwischen?' },
    { id: 'rasterweg',  titel: 'Rasterweg',  datei: 'rasterweg.html',  kurz: 'Ein Weg durch alle Felder, in der richtigen Reihenfolge.' },
    { id: 'leitungen',  titel: 'Leitungen',  datei: 'leitungen.html',  kurz: 'Klemmen mit gleichem Buchstaben verbinden, ohne dass sich Leitungen kreuzen.' }
  ];

  /* ---------- Datum (Europe/Zurich), Testdatum über ?tag=JJJJ-MM-TT ---------- */
  function zuerichDatum(d) {
    try {
      return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Zurich', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
    } catch (e) {
      return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
    }
  }
  function tagNr(datum) {
    var a = datum.split('-'), s = START.split('-');
    return Math.round((Date.UTC(+a[0], a[1] - 1, +a[2]) - Date.UTC(+s[0], s[1] - 1, +s[2])) / 864e5) + 1;
  }
  function heute() {
    var q = null;
    try { q = new URLSearchParams(location.search).get('tag'); } catch (e) {}
    var test = /^\d{4}-\d{2}-\d{2}$/.test(q || '');
    var datum = test ? q : zuerichDatum(new Date());
    var t = datum.split('-');
    return { datum: datum, nr: tagNr(datum), test: test, anzeige: t[2] + '.' + t[1] + '.' + t[0], wochentag: new Date(Date.UTC(+t[0], t[1] - 1, +t[2])).getUTCDay() };
  }
  function sekundenBisMitternacht() {
    try {
      var p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Zurich', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date()).split(':');
      return 86400 - ((+p[0] % 24) * 3600 + (+p[1]) * 60 + (+p[2]));
    } catch (e) { return 0; }
  }

  /* ---------- Zufall mit Startwert: gleiche Aufgabe für alle am selben Tag ---------- */
  function zufall(startwert) {
    var h = 1779033703 ^ String(startwert).length;
    for (var i = 0; i < String(startwert).length; i++) { h = Math.imul(h ^ String(startwert).charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; }
    h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); var a = (h ^= h >>> 16) >>> 0;
    function r() { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
    r.ganz = function (n) { return Math.floor(r() * n); };                       // 0 … n-1
    r.wahl = function (liste) { return liste[Math.floor(r() * liste.length)]; };
    r.misch = function (liste) { var k = liste.slice(); for (var j = k.length - 1; j > 0; j--) { var z = Math.floor(r() * (j + 1)); var x = k[j]; k[j] = k[z]; k[z] = x; } return k; };
    return r;
  }

  /* ---------- Speicher ---------- */
  function lies(schluessel) { try { return JSON.parse(localStorage.getItem(schluessel)) || null; } catch (e) { return null; } }
  function schreib(schluessel, wert) { try { localStorage.setItem(schluessel, JSON.stringify(wert)); } catch (e) {} }
  function leereStatistik() { return { gespielt: 0, gewonnen: 0, serie: 0, maxSerie: 0, letzterSieg: null, verteilung: {} }; }
  /* Neuladen genau einmal: Kehrt jemand in den Tab zurück, melden sich oft mehrere Ereignisse zugleich (sichtbar, Fokus,
     Seite aus dem Zwischenspeicher) und dazu die eigene Prüfung eines Spiels. Zwei Aufrufe hintereinander würden die
     erste Anfrage abbrechen und die Seite doppelt laden. */
  var laedtNeu = false;
  function neuLaden() { if (laedtNeu) return; laedtNeu = true; location.reload(); }
  function vortag(datum) { var t = datum.split('-'); return new Date(Date.UTC(+t[0], t[1] - 1, +t[2]) - 864e5).toISOString().slice(0, 10); }

  /* ---------- Kleine Helfer ---------- */
  function el(tag, attrs, inhalt) {
    var e = document.createElement(tag), k;
    for (k in (attrs || {})) { if (k === 'class') e.className = attrs[k]; else if (k === 'html') e.innerHTML = attrs[k]; else e.setAttribute(k, attrs[k]); }
    if (inhalt != null) e.textContent = inhalt;
    return e;
  }
  var toastEl, toastZeit;
  function toast(text, ms) {
    if (!toastEl) toastEl = el('div', { class: 'rg-toast', role: 'status', 'aria-live': 'polite' });
    var ziel = document.querySelector('dialog[open]') || document.body;   // offenes Fenster liegt über der Seite
    if (toastEl.parentNode !== ziel) ziel.appendChild(toastEl);
    toastEl.textContent = text; toastEl.classList.add('an');
    clearTimeout(toastZeit); toastZeit = setTimeout(function () { toastEl.classList.remove('an'); }, ms || 1800);
  }
  function teilen(text) {
    var voll = text + '\n' + SEITE;
    if (navigator.share) { navigator.share({ text: voll }).catch(function () {}); return; }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(voll).then(function () { toast('Ergebnis kopiert – jetzt einfügen und teilen'); }, function () { toast('Kopieren nicht möglich'); });
    } else { toast('Teilen auf diesem Gerät nicht möglich'); }
  }
  function facebookLink(datei) { return 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(SEITE + (datei || '')); }
  function dialog(id, titel, inhaltHtml) {
    var d = document.getElementById(id);
    if (!d) {
      d = el('dialog', { id: id, class: 'rg-dialog', 'aria-labelledby': id + '-t' });
      d.innerHTML = '<form method="dialog" class="rg-dialog-kopf"><h2 id="' + id + '-t"></h2><button class="rg-x" aria-label="Schliessen">✕</button></form><div class="rg-dialog-inhalt"></div>';
      d.addEventListener('click', function (ev) { if (ev.target === d) d.close(); });
      d.addEventListener('close', function () {
        if (toastEl && toastEl.parentNode === d) document.body.appendChild(toastEl);
        setTimeout(function () { var a = document.activeElement; if (a && a.classList && a.classList.contains('rg-rund') && !a.matches(':focus-visible')) a.blur(); }, 0);
      });
      document.body.appendChild(d);
    }
    d.querySelector('h2').textContent = titel;
    d.querySelector('.rg-dialog-inhalt').innerHTML = inhaltHtml;
    if (d.showModal) { if (!d.open) d.showModal(); } else d.setAttribute('open', '');
    return d;
  }

  /* ---------- Ein Spiel ---------- */
  function spiel(id) {
    var info = SPIELE.filter(function (s) { return s.id === id; })[0];
    if (!info) throw new Error('Unbekanntes Spiel: ' + id);
    var h = heute();
    var schluessel = 'rg-spiele-v1:' + id + (h.test ? ':test' : '');
    var daten = lies(schluessel);
    if (!daten || typeof daten !== 'object' || Array.isArray(daten)) daten = {};
    var st0 = daten.statistik, leer = leereStatistik();
    if (!st0 || typeof st0 !== 'object' || Array.isArray(st0)) daten.statistik = leer;
    else {
      ['gespielt', 'gewonnen', 'serie', 'maxSerie'].forEach(function (k) { if (typeof st0[k] !== 'number' || !isFinite(st0[k]) || st0[k] < 0) st0[k] = 0; });
      if (!st0.verteilung || typeof st0.verteilung !== 'object' || Array.isArray(st0.verteilung)) st0.verteilung = {};
      if (typeof st0.letzterSieg !== 'string') st0.letzterSieg = null;
    }
    if (!daten.stand || typeof daten.stand !== 'object' || daten.stand.datum !== h.datum) daten.stand = { datum: h.datum, daten: null, fertig: null };
    if (daten.stand.fertig && typeof daten.stand.fertig !== 'object') daten.stand.fertig = null;
    var letztes = null;

    var api = {
      id: id, info: info, heute: h,
      zufall: zufall(id + ':' + h.datum),
      /** Gespeicherter Zwischenstand von heute oder null. */
      ladeStand: function () { return daten.stand.daten; },
      sichereStand: function (d) { daten.stand.daten = d; schreib(schluessel, daten); },
      /** Ergebnis von heute ({gewonnen, wert, teilenText, detailHtml}) oder null. */
      ergebnis: function () { return daten.stand.fertig; },
      statistik: function () { return daten.statistik; },
      /** Einmal pro Tag aufrufen, wenn das Rätsel gelöst oder verloren ist.
          o = { gewonnen: true|false, wert: Zahl oder Text für die Verteilung (z. B. Anzahl Versuche),
                teilenText: Text ohne Lösung, detailHtml: optionaler Zusatz im Ergebnisfenster } */
      fertig: function (o) {
        if (!daten.stand.fertig) {
          var st = daten.statistik;
          st.gespielt++;
          if (o.gewonnen) {
            st.gewonnen++;
            st.serie = (st.letzterSieg === vortag(h.datum)) ? st.serie + 1 : 1;
            st.maxSerie = Math.max(st.maxSerie, st.serie);
            st.letzterSieg = h.datum;
            if (o.wert != null) st.verteilung[o.wert] = (st.verteilung[o.wert] || 0) + 1;
          } else { st.serie = 0; }
          daten.stand.fertig = { gewonnen: !!o.gewonnen, wert: o.wert == null ? null : o.wert, teilenText: o.teilenText || '', detailHtml: o.detailHtml || '' };
          schreib(schluessel, daten);
        }
        letztes = daten.stand.fertig;
        setTimeout(api.zeigeErgebnis, o.verzoegerung == null ? 900 : o.verzoegerung);
      },
      zeigeErgebnis: function () {
        var e = daten.stand.fertig, st = daten.statistik;
        var quote = st.gespielt ? Math.round(100 * st.gewonnen / st.gespielt) : 0;
        var andere = SPIELE.filter(function (s) { return s.id !== id; }).map(function (s) {
          var d = lies('rg-spiele-v1:' + s.id + (h.test ? ':test' : ''));
          var f = d && d.stand && d.stand.datum === h.datum && d.stand.fertig && typeof d.stand.fertig === 'object' ? d.stand.fertig : null;
          // wie in der Übersicht: ✓ nur für gelöste Rätsel, ein gespieltes, aber nicht gelöstes bekommt ✕
          return '<a class="rg-chip' + (f ? (f.gewonnen ? ' erledigt' : ' gespielt') : '') + '" href="' + s.datei + (h.test ? '?tag=' + h.datum : '') + '"' +
            (f ? ' aria-label="' + s.titel + (f.gewonnen ? ': gelöst' : ': gespielt, nicht gelöst') + '"' : '') + '>' + (f ? (f.gewonnen ? '✓ ' : '✕ ') : '') + s.titel + '</a>';
        }).join('');
        var html = '';
        if (e) {
          html += '<p class="rg-urteil ' + (e.gewonnen ? 'gut' : 'schade') + '">' + (e.gewonnen ? 'Gelöst!' : 'Heute nicht – morgen wieder.') + '</p>';
          if (e.detailHtml) html += '<div class="rg-detail">' + e.detailHtml + '</div>';
        } else { html += '<p class="rg-hinweis">Das heutige Rätsel ist noch offen.</p>'; }
        html += '<div class="rg-zahlen"><div><b>' + st.gespielt + '</b><span>gespielt</span></div><div><b>' + quote + ' %</b><span>gelöst</span></div><div><b>' + st.serie + '</b><span>Serie</span></div><div><b>' + st.maxSerie + '</b><span>beste Serie</span></div></div>';
        if (e) {
          html += '<div class="rg-reihe"><button type="button" class="rg-knopf haupt" data-rg="teilen">Ergebnis teilen</button>' +
                  '<a class="rg-knopf" href="' + facebookLink(info.datei) + '" target="_blank" rel="noopener">Auf Facebook teilen</a></div>';
          html += '<p class="rg-hinweis">Nächstes Rätsel in <b data-rg="countdown">–</b></p>';
        }
        html += '<p class="rg-zwischentitel">Weitere Rätsel von heute</p><div class="rg-reihe">' + andere + '</div>';
        html += '<div class="rg-spende"><p>Die Rätsel bleiben gratis und ohne Werbung. Wer mag, spendiert mir einen Kaffee (freiwilliger Beitrag).</p><span class="rg-zahlwege"><a class="rg-spenden" href="' + SPENDEN_URL + '" target="_blank" rel="noopener"><span aria-hidden="true">☕</span> Kaffee spendieren</a><span class="rg-zahlinfo">mit TWINT oder Apple Pay · <a href="' + KARTEN_URL + '" target="_blank" rel="noopener">oder CHF 1 mit Karte</a></span></span></div>';
        var d = dialog('rg-ergebnis', info.titel + ' Nr. ' + h.nr, html);
        var kn = d.querySelector('[data-rg="teilen"]');
        if (kn) kn.addEventListener('click', function () { teilen(e.teilenText || info.titel + ' Nr. ' + h.nr); });
        var cd = d.querySelector('[data-rg="countdown"]');
        if (cd) {
          var iv = null, zeile = cd.parentNode;
          var tick = function () {
            if (!h.test && zuerichDatum(new Date()) !== h.datum) {   // Fenster über Mitternacht offen oder Seite vom Vortag: nicht bei 24 Stunden neu anfangen
              zeile.innerHTML = 'Das neue Rätsel ist da. <a href="' + info.datei + '">Jetzt spielen</a>';
              clearInterval(iv); return false;
            }
            var s = sekundenBisMitternacht(); cd.textContent = ('0' + Math.floor(s / 3600)).slice(-2) + ':' + ('0' + Math.floor(s % 3600 / 60)).slice(-2) + ':' + ('0' + s % 60).slice(-2);
            return true;
          };
          if (tick()) iv = setInterval(function () { if (!d.open) { clearInterval(iv); return; } tick(); }, 1000);
        }
      },
      zeigeRegeln: function (regelnHtml) {
        dialog('rg-regeln', 'So geht ' + info.titel, regelnHtml +
          '<p class="rg-hinweis">Jeden Tag ein neues Rätsel, für alle dasselbe. Dein Spielstand bleibt nur auf diesem Gerät, es gibt keine Anmeldung und kein Tracking.</p>');
      }
    };
    return api;
  }

  /* ---------- Seitenrahmen: Kopf, Fuss, Spende ----------
     Erwartet <main id="spiel"> in der Seite. opts = { id, regelnHtml, tageswechsel } */
  function rahmen(opts) {
    var s = spiel(opts.id), h = s.heute;
    var main = document.getElementById('spiel');
    document.body.classList.add('rg-seite');
    var kopf = el('header', { class: 'rg-kopf' });
    kopf.innerHTML =
      '<a class="rg-zurueck" href="index.html' + (h.test ? '?tag=' + h.datum : '') + '" aria-label="Alle Rätsel">←<span> Alle Rätsel</span></a>' +
      '<div class="rg-titel"><h1>' + s.info.titel + '</h1><p>Nr. ' + h.nr + ' · ' + h.anzeige + '</p></div>' +
      '<div class="rg-kopf-knoepfe"><button type="button" class="rg-rund" data-rg="regeln" aria-label="Regeln">?</button>' +
      '<button type="button" class="rg-rund" data-rg="statistik" aria-label="Statistik und Ergebnis">▮▮▮</button></div>';
    main.parentNode.insertBefore(kopf, main);
    var fuss = el('footer', { class: 'rg-fuss' });
    fuss.innerHTML =
      '<div class="rg-spende"><p>Gratis, ohne Werbung, ohne Anmeldung. Gefällt dir das Rätsel? Dann spendier mir einen Kaffee (freiwilliger Beitrag).</p><span class="rg-zahlwege"><a class="rg-spenden" href="' + SPENDEN_URL + '" target="_blank" rel="noopener"><span aria-hidden="true">☕</span> Kaffee spendieren</a><span class="rg-zahlinfo">mit TWINT oder Apple Pay · <a href="' + KARTEN_URL + '" target="_blank" rel="noopener">oder CHF 1 mit Karte</a></span></span></div>' +
      '<p class="rg-werbung">Selbst programmiert von Remo Gilardoni. <a href="https://rg-ing-consulting.ch/software.html">Solche Apps baue ich auch für Ihren Betrieb.</a></p>' +
      '<p class="rg-klein"><a href="https://rg-ing-consulting.ch/">RG Ing. Consulting</a> · <a href="https://rg-ing-consulting.ch/impressum.html">Impressum</a> · <a href="datenschutz.html">Datenschutz</a></p>';
    main.parentNode.insertBefore(fuss, main.nextSibling);
    kopf.querySelector('[data-rg="regeln"]').addEventListener('click', function () { s.zeigeRegeln(opts.regelnHtml || ''); });
    kopf.querySelector('[data-rg="statistik"]').addEventListener('click', function () { s.zeigeErgebnis(); });
    // Nur auf Wunsch (opts.tageswechsel): Spiele mit eigener Behandlung lassen es weg, sonst lüde die Seite doppelt neu.
    if (opts.tageswechsel && !h.test) {
      var neuerTag = function () {
        if (document.visibilityState !== 'visible' || zuerichDatum(new Date()) === h.datum) return;
        if (s.ergebnis() || !s.ladeStand()) neuLaden();   // eine angefangene Partie darf fertig gespielt werden
      };
      document.addEventListener('visibilitychange', neuerTag);
      window.addEventListener('focus', neuerTag);                                            // Fenster blieb sichtbar (Desktop über Nacht)
      window.addEventListener('pageshow', function (ev) { if (ev.persisted) neuerTag(); });  // «Zurück» holt die Seite aus dem Zwischenspeicher
    }
    var erstes = !lies('rg-spiele-v1:gesehen:' + opts.id);
    if (erstes && !h.test) { schreib('rg-spiele-v1:gesehen:' + opts.id, 1); setTimeout(function () { s.zeigeRegeln(opts.regelnHtml || ''); }, 350); }
    return s;
  }

  window.RG = { SPIELE: SPIELE, SPENDEN_URL: SPENDEN_URL, KARTEN_URL: KARTEN_URL, SEITE: SEITE, heute: heute, zufall: zufall, spiel: spiel, rahmen: rahmen,
                toast: toast, teilen: teilen, dialog: dialog, el: el, facebookLink: facebookLink, lies: lies, neuLaden: neuLaden };
})();
