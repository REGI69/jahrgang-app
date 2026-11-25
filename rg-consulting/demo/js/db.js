/* =====================================================================
   RG CAD – SQL-Datenschicht (AlaSQL, reines JavaScript, offline)
   - blum_lengths : Blum-Katalog (in-memory, aus Blum-Daten)
   - projects     : gespeicherte Möbel (persistent via localStorage-JSON)
   Alle Zugriffe laufen über echte SQL-Statements (CREATE/INSERT/SELECT/UPDATE/DELETE).
   ===================================================================== */
(function (global) {
  "use strict";
  const RGDB = { ready: false };
  const PKEY = "rgcad_projects_db";

  RGDB.init = function () {
    if (RGDB.ready) return true;
    if (!global.alasql || !global.Blum) return false;
    try {
      // ---- Projekte ----
      alasql("CREATE TABLE IF NOT EXISTS projects (id INT, name STRING, type STRING, created STRING, cfg STRING)");
      try {
        const s = localStorage.getItem(PKEY);
        if (s) JSON.parse(s).forEach((r) => alasql("INSERT INTO projects VALUES (?,?,?,?,?)", [r.id, r.name, r.type, r.created, r.cfg]));
      } catch (e) {}

      // ---- Blum-Katalog ----
      alasql("CREATE TABLE IF NOT EXISTS blum_lengths (system STRING, sysname STRING, ext STRING, kind STRING, tk INT, nl INT, art STRING, price NUMBER)");
      alasql("DELETE FROM blum_lengths");
      Blum.list().forEach((s) => {
        const hk = s.heights ? Object.keys(s.heights)[1] : null;
        s.nls.forEach((nl) => {
          alasql("INSERT INTO blum_lengths VALUES (?,?,?,?,?,?,?,?)",
            [s.id, s.name, s.ext, s.kind, s.load, nl, s.art(nl, hk), Blum.priceFor(s.id, nl)]);
        });
      });
      RGDB.ready = true;
      return true;
    } catch (e) { console.error("RGDB.init", e); return false; }
  };

  RGDB.query = function (sql, params) { return alasql(sql, params || []); };

  // ---- Blum (SQL) ----
  RGDB.blumRows = function (sysId) { return alasql("SELECT nl, art, tk, price FROM blum_lengths WHERE system=? ORDER BY nl", [sysId]); };
  RGDB.blumSetPrice = function (sysId, nl, price) { alasql("UPDATE blum_lengths SET price=? WHERE system=? AND nl=?", [price, sysId, nl]); };
  RGDB.blumFind = function (term) {
    return alasql("SELECT sysname, ext, tk, nl, art, price FROM blum_lengths WHERE art LIKE ? OR sysname LIKE ? ORDER BY sysname, nl",
      ["%" + term + "%", "%" + term + "%"]);
  };

  // ---- Projekte (SQL) ----
  function persist() { try { localStorage.setItem(PKEY, JSON.stringify(alasql("SELECT * FROM projects"))); } catch (e) {} }
  RGDB.saveProject = function (name, type, cfg, id) {
    const pid = id || Date.now();
    alasql("DELETE FROM projects WHERE name=?", [name]);
    // Cache-Felder (_total/_sig der Kostenberechnung) nicht persistieren -> Neuberechnung beim Laden
    const json = JSON.stringify(cfg, (k, v) => (k === "_total" || k === "_sig") ? undefined : v);
    alasql("INSERT INTO projects VALUES (?,?,?,?,?)", [pid, name, type, (new Date()).toISOString(), json]);
    persist(); return pid;
  };
  RGDB.listProjects = function () { return alasql("SELECT id, name, type, created FROM projects ORDER BY created DESC"); };
  RGDB.loadProject = function (id) { const r = alasql("SELECT cfg FROM projects WHERE id=?", [id]); return r.length ? JSON.parse(r[0].cfg) : null; };
  RGDB.deleteProject = function (id) { alasql("DELETE FROM projects WHERE id=?", [id]); persist(); };
  RGDB.countProjects = function () { const r = alasql("SELECT COUNT(*) AS n FROM projects"); return r.length ? r[0].n : 0; };

  global.RGDB = RGDB;
})(window);
