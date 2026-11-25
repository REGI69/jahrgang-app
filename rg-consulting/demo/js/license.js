/* =====================================================================
   RG CAD – Lizenz & Demo   (Offline-Schluessel, 30-Tage-Demo)
   ---------------------------------------------------------------------
   - Ohne gueltigen Schluessel: 30 Tage voll nutzbar, danach gesperrt.
   - Mit Schluessel (Firmenname + Schluessel): Dauerlizenz, laeuft nie ab.
   - Schluessel werden mit "Schluessel-Generator.html" erzeugt.
     >> Diese Generator-Datei NICHT an Kunden weitergeben! <<
   - SALT und Algorithmus muessen im Generator identisch sein.
   ===================================================================== */
(function () {
  "use strict";

  // ---- Einstellungen -------------------------------------------------
  var DEMO_DAYS = 30;
  // <<< Bestellung: oeffnet eine vorausgefuellte E-Mail an dich.
  //     (Spaeter auf eine echte Webseite umstellbar: einfach BUY_URL
  //      auf "https://www.deineseite.ch" setzen.)
  var SALES_EMAIL = "rgilardoni@hispeed.ch";
  var BUY_URL = "mailto:" + SALES_EMAIL +
    "?subject=" + encodeURIComponent("RG CAD – Vollversion bestellen") +
    "&body=" + encodeURIComponent(
      "Guten Tag\n\nIch moechte die Vollversion von RG CAD freischalten.\n\n" +
      "Firmenname (genau so fuer die Lizenz): \nKontakt / Telefon: \n\n" +
      "Freundliche Gruesse");
  // Fuer sicheres Einsetzen in HTML-Attribute (& -> &amp;):
  var BUY_ATTR = BUY_URL.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  // Geheimer Bestandteil – steckt im Code. Im Generator IDENTISCH halten.
  var SALT      = "RGCAD-2026::RGconsulting::Gilardoni::a7f39c1e5b";
  var ALPH      = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 32 Zeichen, ohne 0 O 1 I

  var LIC_KEY   = "rgcad_license";     // localStorage: {firma, key}
  var DEMO_KEY  = "rgcad_demo_start";  // localStorage: Startzeit (ms)

  // ---- Schluessel-Algorithmus ---------------------------------------
  function norm(s) { return String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, ""); }
  function hash32(str) {
    var h = 0x811c9dc5 >>> 0;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d) >>> 0;
    h ^= h >>> 13; h = Math.imul(h, 0x297a2d39) >>> 0;
    h ^= h >>> 15;
    return h >>> 0;
  }
  function block(h) { var o = "", x = h >>> 0; for (var i = 0; i < 4; i++) { o += ALPH.charAt(x & 31); x = x >>> 5; } return o; }
  function makeKey(firma) {
    var b = norm(firma);
    return "RGCAD-" + block(hash32(SALT + "|" + b + "|A")) +
           "-" + block(hash32(SALT + "|" + b + "|B")) +
           "-" + block(hash32(b + "|" + SALT + "|C"));
  }
  function keyClean(k) { return String(k || "").toUpperCase().replace(/\s+/g, ""); }
  function checkKey(firma, key) { return !!firma && !!key && keyClean(key) === makeKey(firma); }

  // ---- Status --------------------------------------------------------
  function getLicense() {
    try {
      var s = localStorage.getItem(LIC_KEY);
      if (s) { var o = JSON.parse(s); if (o && checkKey(o.firma, o.key)) return o; }
    } catch (e) {}
    return null;
  }
  function setLicense(firma, key) {
    try { localStorage.setItem(LIC_KEY, JSON.stringify({ firma: firma, key: keyClean(key) })); } catch (e) {}
  }
  function demoStart() {
    var v = null; try { v = localStorage.getItem(DEMO_KEY); } catch (e) {}
    if (!v) { v = String(Date.now()); try { localStorage.setItem(DEMO_KEY, v); } catch (e) {} }
    var n = parseInt(v, 10); if (!n || isNaN(n)) { n = Date.now(); }
    return n;
  }
  function daysLeft() {
    var used = Math.floor((Date.now() - demoStart()) / 86400000);
    return DEMO_DAYS - used;
  }

  // ---- Styles --------------------------------------------------------
  function injectStyles() {
    if (document.getElementById("rglic-style")) return;
    var css =
      ".rglic-badge{display:inline-flex;align-items:center;gap:6px;font:600 12px/1 system-ui,sans-serif;color:#2e7d32;background:#e6f4ea;border:1px solid #b6e0c2;padding:5px 9px;border-radius:20px;margin-right:8px}" +
      ".rglic-banner{position:fixed;right:14px;bottom:14px;z-index:99998;max-width:330px;background:#fff;border:1px solid #e3b341;border-left:5px solid #e3a014;border-radius:10px;box-shadow:0 8px 28px rgba(0,0,0,.18);padding:12px 30px 12px 14px;font:13px/1.45 system-ui,sans-serif;color:#3a2f12}" +
      ".rglic-banner b{color:#b26a00}" +
      ".rglic-banner .rglic-row{margin-top:9px;display:flex;gap:8px;align-items:center}" +
      ".rglic-x{position:absolute;top:5px;right:8px;cursor:pointer;color:#9a8a5a;font-size:18px;line-height:1;border:none;background:none}" +
      ".rglic-ov{position:fixed;inset:0;z-index:99999;background:rgba(22,26,32,.80);display:flex;align-items:center;justify-content:center;padding:20px}" +
      ".rglic-card{background:#fff;border-radius:14px;max-width:430px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.45);padding:24px 26px;font:14px/1.5 system-ui,sans-serif;color:#222;box-sizing:border-box}" +
      ".rglic-card h2{margin:0 0 6px;font-size:20px}" +
      ".rglic-card p{margin:0 0 6px;color:#555}" +
      ".rglic-card label{display:block;font-weight:600;font-size:12px;margin:12px 0 4px;color:#444}" +
      ".rglic-card input{width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #ccd2da;border-radius:8px;font-size:15px}" +
      ".rglic-card input:focus{outline:none;border-color:#3b82d6;box-shadow:0 0 0 3px rgba(59,130,214,.18)}" +
      ".rglic-err{color:#c0392b;font-size:13px;margin-top:8px;min-height:18px}" +
      ".rglic-btns{display:flex;gap:10px;margin-top:14px;flex-wrap:wrap}" +
      ".rglic-btn{appearance:none;border:none;border-radius:8px;padding:11px 18px;font-size:14px;font-weight:600;cursor:pointer}" +
      ".rglic-btn.primary{background:#2e7d32;color:#fff}.rglic-btn.primary:hover{background:#27682b}" +
      ".rglic-btn.ghost{background:#eef1f5;color:#333}" +
      ".rglic-btn.buy{background:#3b82d6;color:#fff;text-decoration:none;display:inline-flex;align-items:center}.rglic-btn.buy:hover{background:#2f6fc0}" +
      ".rglic-mini{font-size:12px;color:#8a8f97;margin-top:14px}";
    var st = document.createElement("style");
    st.id = "rglic-style"; st.textContent = css;
    document.head.appendChild(st);
  }

  // ---- Toast ---------------------------------------------------------
  function toast(msg) {
    var t = document.createElement("div");
    t.textContent = msg;
    t.style.cssText = "position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:100000;" +
      "background:#2e7d32;color:#fff;padding:12px 18px;border-radius:24px;font:600 14px system-ui,sans-serif;" +
      "box-shadow:0 8px 24px rgba(0,0,0,.25)";
    document.body.appendChild(t);
    setTimeout(function () {
      t.style.transition = "opacity .4s"; t.style.opacity = "0";
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 400);
    }, 2600);
  }

  // ---- Freischalt-Dialog --------------------------------------------
  function openActivation(blocking) {
    if (document.getElementById("rglic-ov")) return;
    injectStyles();
    var ov = document.createElement("div");
    ov.className = "rglic-ov"; ov.id = "rglic-ov";
    var heading = blocking ? "Demo abgelaufen" : "RG CAD freischalten";
    var sub = blocking
      ? "Deine 30-Tage-Demo ist abgelaufen. Mit deinem Schluessel von RG Consulting schaltest du die Vollversion dauerhaft frei."
      : "Schluessel von RG Consulting erhalten? Firmenname und Schluessel genau wie auf der Rechnung eingeben.";
    ov.innerHTML =
      '<div class="rglic-card" role="dialog" aria-modal="true">' +
        '<h2>' + heading + '</h2>' +
        '<p>' + sub + '</p>' +
        '<label>Firmenname</label>' +
        '<input id="rglic-firma" type="text" autocomplete="organization" placeholder="z.B. Schreinerei Muster AG">' +
        '<label>Schluessel</label>' +
        '<input id="rglic-key" type="text" spellcheck="false" placeholder="RGCAD-XXXX-XXXX-XXXX">' +
        '<div class="rglic-err" id="rglic-err"></div>' +
        '<div class="rglic-btns">' +
          '<button class="rglic-btn primary" id="rglic-go">Freischalten</button>' +
          (blocking
            ? '<a class="rglic-btn buy" href="' + BUY_ATTR + '" target="_blank" rel="noopener">Vollversion bestellen</a>'
            : '<button class="rglic-btn ghost" id="rglic-later">Spaeter</button>') +
        '</div>' +
        '<div class="rglic-mini">Offline-Lizenz · einmal freischalten, laeuft nie ab.</div>' +
      '</div>';
    document.body.appendChild(ov);

    var fi = document.getElementById("rglic-firma");
    var ke = document.getElementById("rglic-key");
    var er = document.getElementById("rglic-err");
    try { var prev = JSON.parse(localStorage.getItem(LIC_KEY) || "null"); if (prev && prev.firma) fi.value = prev.firma; } catch (e) {}
    ke.addEventListener("input", function () { ke.value = ke.value.toUpperCase(); });

    function attempt() {
      var f = fi.value.trim(), k = ke.value.trim();
      if (checkKey(f, k)) {
        setLicense(f, k);
        if (ov.parentNode) ov.parentNode.removeChild(ov);
        removeBanner(); markLicensed();
        toast("✓ Freigeschaltet – vielen Dank! Vollversion aktiv.");
      } else {
        er.textContent = "Schluessel oder Firmenname stimmt nicht. Bitte genau wie auf der Rechnung eingeben.";
        ke.focus(); ke.select();
      }
    }
    document.getElementById("rglic-go").addEventListener("click", attempt);
    ke.addEventListener("keydown", function (e) { if (e.key === "Enter") attempt(); });
    fi.addEventListener("keydown", function (e) { if (e.key === "Enter") ke.focus(); });

    if (!blocking) {
      document.getElementById("rglic-later").addEventListener("click", function () { if (ov.parentNode) ov.parentNode.removeChild(ov); });
      ov.addEventListener("click", function (e) { if (e.target === ov && ov.parentNode) ov.parentNode.removeChild(ov); });
    }
    setTimeout(function () { (fi.value ? ke : fi).focus(); }, 30);
  }

  // ---- Demo-Banner ---------------------------------------------------
  function showBanner(d) {
    injectStyles();
    if (document.getElementById("rglic-banner")) return;
    var noun = (d === 1) ? "Tag" : "Tage";
    var b = document.createElement("div");
    b.className = "rglic-banner"; b.id = "rglic-banner";
    b.innerHTML =
      '<button class="rglic-x" title="Ausblenden">×</button>' +
      '<div>🔒 <b>Demoversion</b> – noch <b>' + d + ' ' + noun + '</b> voll nutzbar.</div>' +
      '<div class="rglic-row">' +
        '<button class="rglic-btn primary" id="rglic-bopen" style="padding:8px 14px">Freischalten</button>' +
        '<a class="rglic-btn buy" href="' + BUY_ATTR + '" target="_blank" rel="noopener" style="padding:8px 14px">Bestellen</a>' +
      '</div>';
    document.body.appendChild(b);
    b.querySelector(".rglic-x").addEventListener("click", removeBanner);
    document.getElementById("rglic-bopen").addEventListener("click", function () { openActivation(false); });
  }
  function removeBanner() { var b = document.getElementById("rglic-banner"); if (b && b.parentNode) b.parentNode.removeChild(b); }

  // ---- Lizenz-Badge im Kopf -----------------------------------------
  function markLicensed() {
    injectStyles(); removeBanner();
    if (document.getElementById("rglic-badge")) return;
    var host = document.querySelector(".ab-right") || document.querySelector(".appbar");
    if (!host) return;
    var lic = getLicense();
    var span = document.createElement("span");
    span.className = "rglic-badge"; span.id = "rglic-badge";
    span.title = lic ? ("Lizenziert fuer: " + lic.firma) : "Vollversion";
    span.textContent = "● Vollversion";
    host.insertBefore(span, host.firstChild);
  }

  // ---- Start ---------------------------------------------------------
  function start() {
    if (getLicense()) { markLicensed(); return; }
    var d = daysLeft();
    if (d > 0) showBanner(d);
    else openActivation(true);
  }

  // Oeffentliche Mini-API (z.B. fuer einen spaeteren Menue-Knopf)
  window.RGLicense = {
    isLicensed: function () { return !!getLicense(); },
    openActivation: function () { openActivation(false); },
    daysLeft: daysLeft
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
