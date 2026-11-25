/* =====================================================================
   RG CAD – 3D Viewer (Three.js)
   ===================================================================== */
(function (global) {
  "use strict";

  const SCALE = 0.001; // mm -> m

  // Montage-Klassifizierung eines Bauteils
  function classifyStep(part) {
    const n = part.name, r = part.role, g = part.group;
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

  function Viewer(container) {
    const THREE = global.THREE;
    SchreinerMaterials.init(THREE);
    this.THREE = THREE;
    this.container = container;
    this.exploded = false;
    this.showDims = true;
    this.wireframe = false;
    this.explodeFactor = 0;
    this.openFactor = 0;
    this.drawerAnim = false;
    this.drawerTravel = 0;
    this._drawerPhase = 0;
    this.partMeshes = [];
    this.selected = null;
    this.onSelect = null;
    this.materialMode = false;

    const scene = new THREE.Scene();
    this.scene = scene;

    const cam = new THREE.PerspectiveCamera(40, 1, 0.01, 100);
    cam.position.set(2.2, 1.8, 2.6);
    this.camera = cam;

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.74;
    container.appendChild(renderer.domElement);
    this.renderer = renderer;
    SchreinerMaterials.setRenderer(renderer);   // Anisotropie der Fototexturen
    // Sobald ein Furnier-Foto geladen ist: Texturen der Bauteile tauschen und einmal neu zeichnen (kein Flackern)
    const self0 = this;
    SchreinerMaterials.onPhotoLoaded(function () { self0._refreshTextures(); });

    // Heller Studio-Hintergrund. Als Farbe statt Textur gesetzt, weil das Tone-Mapping
    // eine Textur abdunkelt (Weiss würde grau); so bleibt der Grund auch im Screenshot hell.
    scene.background = new THREE.Color(0xf6f2eb);   // Papierton wie die Oberfläche (Version 60)

    // Environment / IBL fuer realistische Reflexionen
    try {
      const pmrem = new THREE.PMREMGenerator(renderer);
      const envScene = new THREE.RoomEnvironment();
      scene.environment = pmrem.fromScene(envScene, 0.04).texture;
      pmrem.dispose();
    } catch (e) { /* fallback ohne IBL */ }

    const controls = new THREE.OrbitControls(cam, renderer.domElement);
    controls.enableDamping = false;
    controls.minDistance = 0.2;
    controls.maxDistance = 80;            // viel weiter herauszoombar
    controls.zoomSpeed = 1.2;
    controls.maxPolarAngle = Math.PI * 0.96;
    controls.target.set(0, 0.4, 0);
    this.controls = controls;

    // Licht (IBL liefert das Grundlicht, Direktlicht fuer Schatten & Glanz)
    const hemi = new THREE.HemisphereLight(0xffffff, 0x8b9099, 0.6);
    scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffffff, 0.5);
    key.position.set(4.5, 7, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 25;
    const sc = 3.2;
    key.shadow.camera.left = -sc; key.shadow.camera.right = sc;
    key.shadow.camera.top = sc; key.shadow.camera.bottom = -sc;
    key.shadow.bias = -0.00018;
    key.shadow.normalBias = 0.02;
    key.shadow.radius = 7;
    scene.add(key);
    this.key = key; this.hemi = hemi;
    const rim = new THREE.DirectionalLight(0xfff4e6, 0.25);
    rim.position.set(-5, 3.5, -4);
    scene.add(rim);

    // Boden (Schattenfaenger) + sehr feines Raster
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.ShadowMaterial({ opacity: 0.17, color: 0x2a2420 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    scene.add(ground);
    const grid = new THREE.GridHelper(24, 96, 0xc9bda9, 0xe3dbcf);   // feines Raster in Sand auf Papier
    grid.material.opacity = 0.55;
    grid.material.transparent = true;
    grid.position.y = 0.0005;
    scene.add(grid);
    this.grid = grid; this.helperLines = [];
    // Achsenlinien wie in Fusion (X rot, Z grün)
    const helperLines = this.helperLines;
    function axisLine(p0, p1, color) {
      const g = new THREE.BufferGeometry().setFromPoints([p0, p1]);
      const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: 0.65 }));
      scene.add(l); helperLines.push(l);
    }
    axisLine(new THREE.Vector3(-12, 0.0012, 0), new THREE.Vector3(12, 0.0012, 0), 0xc0392b);
    axisLine(new THREE.Vector3(0, 0.0012, -12), new THREE.Vector3(0, 0.0012, 12), 0x3a8f4f);

    this.modelGroup = new THREE.Group();
    scene.add(this.modelGroup);
    this.bodyGroup = new THREE.Group();   // frei modellierte Volumenkörper (Skizze→Extrudieren)
    scene.add(this.bodyGroup);
    this.bodyMeshes = [];
    this.sketchMode = null;
    this.dimGroup = new THREE.Group();
    scene.add(this.dimGroup);

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    const self = this;
    renderer.domElement.addEventListener("pointerdown", function (e) { self._down = { x: e.clientX, y: e.clientY }; });
    renderer.domElement.addEventListener("pointerup", function (e) {
      if (!self._down) return;
      const dx = Math.abs(e.clientX - self._down.x), dy = Math.abs(e.clientY - self._down.y);
      if (dx < 4 && dy < 4) self._pick(e);
    });

    controls.addEventListener("change", function () { self.render(); });
    window.addEventListener("resize", function () { self.resize(); });
    this.resize();
    this.render();
  }

  Viewer.prototype.resize = function () {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  Viewer.prototype.setModel = function (model) {
    const THREE = this.THREE;
    this.model = model;
    // clear
    while (this.modelGroup.children.length) this.modelGroup.remove(this.modelGroup.children[0]);
    this.partMeshes = [];
    this.selected = null;
    this.drawerOpen = {};
    this.drawerTarget = {};
    this._drawerIds = [];
    this.doorOpen = {};
    this.doorTarget = {};
    this._doorIds = [];
    this.flapOpen = {};
    this.flapTarget = {};
    this._flapIds = [];
    const doorMeta = {}, flapMeta = {};

    const W = model.bbox.w, H = model.bbox.h, D = model.bbox.d;
    const cx = W / 2, cz = D / 2;
    this.center = { x: cx, y: H / 2, z: cz };
    this.drawerTravel = 0.72 * D * SCALE;

    model.parts.forEach((part) => {
      const gx = part.dim[0] * SCALE, gy = part.dim[1] * SCALE, gz = part.dim[2] * SCALE;
      const mind = Math.min(gx, gy, gz);
      const rad = Math.min(0.0012, mind * 0.24);   // ~1.2 mm gebrochene Kante
      let geo;
      if (THREE.RoundedBoxGeometry && rad > 0.00006) {
        geo = new THREE.RoundedBoxGeometry(gx, gy, gz, 2, rad);
      } else {
        geo = new THREE.BoxGeometry(gx, gy, gz);
      }
      const baseMat = SchreinerMaterials.getMaterial(part.material);
      const mat = baseMat.clone();
      // Farbkarte je Bauteil: Foto (sobald geladen) oder gerechnet; Wiederholung nach Groesse,
      // Faser laengs (hochkante Teile 90° gedreht), eigener Ausschnitt je Bauteil (Hash aus Index/Name)
      if (baseMat.map) SchreinerMaterials.applyPart(mat, part.material, part);
      mat.wireframe = this.wireframe;
      const mesh = new THREE.Mesh(geo, mat);
      const px = (part.pos[0] + part.dim[0] / 2 - cx) * SCALE;
      const py = (part.pos[1] + part.dim[1] / 2) * SCALE;
      const pz = (part.pos[2] + part.dim[2] / 2 - cz) * SCALE;
      mesh.position.set(px, py, pz);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.part = part;
      mesh.userData.stepKey = classifyStep(part);
      mesh.userData.isDrawer = (part.role === "drawerfront" || part.group === "Schublade");
      if (part.drawerId != null) { mesh.userData.drawerId = part.drawerId; if (this._drawerIds.indexOf(part.drawerId) < 0) this._drawerIds.push(part.drawerId); }
      if (part.role === "door" && part.doorId != null) {
        const hx = (part.hinge === "left" ? part.pos[0] : part.pos[0] + part.dim[0]);
        const hpv = { x: (hx - cx) * SCALE, z: pz };
        const ang = part.hinge === "left" ? 1.7 : -1.7;
        mesh.userData.isDoor = true; mesh.userData.doorId = part.doorId;
        mesh.userData.hingePivot = hpv; mesh.userData.doorAngle = ang;
        doorMeta[part.doorId] = { hingePivot: hpv, doorAngle: ang };
        if (this._doorIds.indexOf(part.doorId) < 0) this._doorIds.push(part.doorId);
      }
      if (part.role === "flap" && part.flapId != null) {
        const fpv = { y: (part.pos[1] + part.dim[1]) * SCALE, z: pz };
        mesh.userData.isFlap = true; mesh.userData.flapId = part.flapId;
        mesh.userData.flapPivot = fpv; mesh.userData.flapAngle = 1.5;
        flapMeta[part.flapId] = { flapPivot: fpv, flapAngle: 1.5 };
        if (this._flapIds.indexOf(part.flapId) < 0) this._flapIds.push(part.flapId);
      }
      mesh.userData.home = { x: px, y: py, z: pz };
      // Explosionsrichtung
      const ex = part.pos[0] + part.dim[0] / 2 - cx;
      const ey = part.pos[1] + part.dim[1] / 2 - H / 2;
      const ez = part.pos[2] + part.dim[2] / 2 - cz;
      const len = Math.sqrt(ex * ex + ey * ey + ez * ez) || 1;
      mesh.userData.dir = { x: ex / len, y: ey / len, z: ez / len };
      this.modelGroup.add(mesh);
      this.partMeshes.push(mesh);
    });

    // Griffe / Beschlaege
    (model.handles || []).forEach((h) => {
      const grp = this._makeHandle(h, cx, cz);
      if (!grp) return;
      grp.userData.stepKey = "handle";
      if (h.drawerId != null) { grp.userData.isDrawer = true; grp.userData.drawerId = h.drawerId; }
      if (h.doorId != null && doorMeta[h.doorId]) {
        grp.userData.isDoor = true; grp.userData.doorId = h.doorId;
        grp.userData.hingePivot = doorMeta[h.doorId].hingePivot;
        grp.userData.doorAngle = doorMeta[h.doorId].doorAngle;
      }
      if (h.flapId != null && flapMeta[h.flapId]) {
        grp.userData.isFlap = true; grp.userData.flapId = h.flapId;
        grp.userData.flapPivot = flapMeta[h.flapId].flapPivot;
        grp.userData.flapAngle = flapMeta[h.flapId].flapAngle;
      }
      this.modelGroup.add(grp);
    });

    // Auszuege / Stahlzargen (metallisch)
    const metal = SchreinerMaterials.getMetal();
    const zargeMat = metal.clone(); zargeMat.color = new THREE.Color(0x6b7177); zargeMat.roughness = 0.4; zargeMat.metalness = 0.9;
    (model.runners || []).forEach((r) => {
      const rgeo = new THREE.BoxGeometry(r.dx * SCALE, r.dy * SCALE, r.dz * SCALE);
      const rmat = r.kind === "rail" ? metal : (r.kind === "boden" ? metal : zargeMat);
      const rm = new THREE.Mesh(rgeo, rmat);
      const rpx = (r.x + r.dx / 2 - cx) * SCALE;
      const rpy = (r.y + r.dy / 2) * SCALE;
      const rpz = (r.z + r.dz / 2 - cz) * SCALE;
      rm.position.set(rpx, rpy, rpz);
      rm.castShadow = true;
      rm.userData.stepKey = "runner";
      rm.userData.isDrawer = true;
      if (r.drawerId != null) { rm.userData.drawerId = r.drawerId; if (this._drawerIds.indexOf(r.drawerId) < 0) this._drawerIds.push(r.drawerId); }
      rm.userData.home = { x: rpx, y: rpy, z: rpz };
      const dx2 = r.x + r.dx / 2 - cx, dy2 = r.y + r.dy / 2 - H / 2, dz2 = r.z + r.dz / 2 - cz;
      const l2 = Math.sqrt(dx2 * dx2 + dy2 * dy2 + dz2 * dz2) || 1;
      rm.userData.dir = { x: dx2 / l2, y: dy2 / l2, z: dz2 / l2 };
      this.modelGroup.add(rm);
    });

    this._buildDimensions(W, H, D);

    // Kamera einpassen
    const maxd = Math.max(W, H, D) * SCALE;
    this.controls.target.set(0, H / 2 * SCALE, 0);
    if (!this._fitted || this._lastMax === undefined || Math.abs(this._lastMax - maxd) > maxd * 0.4) {
      const dist = maxd * 1.9 + 0.6;
      this.camera.position.set(dist * 0.7, H * SCALE * 0.75 + 0.3, -dist);   // Front (-Z): Türen/Schubladen zur Kamera
      this._fitted = true;
      this._lastMax = maxd;
    }
    this.controls.update();
    this.render();
  };

  Viewer.prototype._makeHandle = function (h, cx, cz) {
    const THREE = this.THREE;
    const metal = SchreinerMaterials.getMetal();
    const grp = new THREE.Group();
    const type = h.type || "buegel";
    const len = h.len * SCALE;
    const alongY = h.axis === "y";   // Griffstange-Achse

    if (type === "knopf") {
      // Knopf / Knauf: Stiel (in die Front) + runder Kopf vorne
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.014, 14), metal);
      stem.rotation.x = Math.PI / 2; stem.position.set(0, 0, 0.007);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.012, 20, 14), metal);
      head.position.set(0, 0, -0.004);
      head.castShadow = true;
      grp.add(stem); grp.add(head);
    } else if (type === "tgriff") {
      // T-Griff: Stiel nach vorne + Querbalken an der Spitze
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.024, 12), metal);
      stem.rotation.x = Math.PI / 2; stem.position.set(0, 0, -0.005);
      const cl = Math.min(0.06, Math.max(0.03, len));
      const cross = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, cl, 12), metal);
      if (!alongY) cross.rotation.z = Math.PI / 2;
      cross.position.set(0, 0, -0.017); cross.castShadow = true;
      grp.add(stem); grp.add(cross);
    } else if (type === "bogen") {
      // Bogengriff: gebogene Stange, ragt nach vorne
      const half = len / 2;
      const pa = alongY ? new THREE.Vector3(0, -half, 0) : new THREE.Vector3(-half, 0, 0);
      const pb = alongY ? new THREE.Vector3(0, half, 0) : new THREE.Vector3(half, 0, 0);
      const curve = new THREE.QuadraticBezierCurve3(pa, new THREE.Vector3(0, 0, -0.028), pb);
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 18, 0.006, 9), metal);
      tube.castShadow = true;
      grp.add(tube);
    } else if (type === "profil") {
      // Profilgriff: schmale Griffleiste an der Kante, bündig
      const w = Math.max(0.05, len * 0.95);
      const dim = alongY ? [0.013, w, 0.012] : [w, 0.013, 0.012];
      const rail = new THREE.Mesh(new THREE.BoxGeometry(dim[0], dim[1], dim[2]), metal);
      rail.position.set(0, 0, -0.002); rail.castShadow = true;
      grp.add(rail);
    } else if (type === "muschel") {
      // Muschelgriff: flache Griffleiste / Schale knapp vor der Front
      const w = Math.max(0.05, len * 0.7);
      const dim = alongY ? [0.018, w, 0.010] : [w, 0.018, 0.010];
      const shell = new THREE.Mesh(new THREE.BoxGeometry(dim[0], dim[1], dim[2]), metal);
      shell.position.set(0, 0, 0.001); shell.castShadow = true;
      grp.add(shell);
      const lip = new THREE.Mesh(new THREE.BoxGeometry(dim[0] * (alongY ? 1 : 0.96), dim[1] * (alongY ? 0.96 : 1), 0.004), metal);
      lip.position.set(0, alongY ? 0 : -0.009, -0.006);
      if (alongY) lip.position.set(-0.009, 0, -0.006);
      grp.add(lip);
    } else {
      // Bügelgriff (Standard) / Stangengriff: Stange auf zwei Füssen, ragt nach vorne
      const isRail = type === "stange";
      const rad = isRail ? 0.0085 : 0.006;
      const footLen = isRail ? 0.030 : 0.022;
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, len, 16), metal);
      if (!alongY) bar.rotation.z = Math.PI / 2;
      bar.castShadow = true;
      grp.add(bar);
      for (let s = -1; s <= 1; s += 2) {
        const foot = new THREE.Mesh(new THREE.CylinderGeometry(rad * 0.6, rad * 0.6, footLen, 10), metal);
        foot.rotation.x = Math.PI / 2;
        const a = s * (len / 2 - rad * 1.6);
        if (alongY) foot.position.set(0, a, footLen / 2); else foot.position.set(a, 0, footLen / 2);
        grp.add(foot);
      }
    }

    grp.position.set((h.x - cx) * SCALE, h.y * SCALE, (h.z - cz) * SCALE);
    grp.userData.isHandle = true;
    grp.userData.home = { x: grp.position.x, y: grp.position.y, z: grp.position.z };
    grp.userData.dir = { x: 0, y: 0, z: -1 };
    return grp;
  };

  Viewer.prototype._buildDimensions = function (W, H, D) {
    const THREE = this.THREE;
    while (this.dimGroup.children.length) this.dimGroup.remove(this.dimGroup.children[0]);
    const off = 0.08;
    const x0 = -W / 2 * SCALE, x1 = W / 2 * SCALE;
    const z0 = D / 2 * SCALE, z1 = -D / 2 * SCALE;
    const col = 0xd9480f;
    const self = this;
    function line(a, b) {
      const g = new THREE.BufferGeometry().setFromPoints([a, b]);
      return new THREE.Line(g, new THREE.LineBasicMaterial({ color: col }));
    }
    // Breite (unten vorne)
    this.dimGroup.add(line(new THREE.Vector3(x0, -off, z0 + off), new THREE.Vector3(x1, -off, z0 + off)));
    this.dimGroup.add(this._label(W + " mm", new THREE.Vector3(0, -off - 0.03, z0 + off), col));
    // Hoehe (links vorne)
    this.dimGroup.add(line(new THREE.Vector3(x0 - off, 0, z0 + off), new THREE.Vector3(x0 - off, H * SCALE, z0 + off)));
    this.dimGroup.add(this._label(H + " mm", new THREE.Vector3(x0 - off - 0.03, H * SCALE / 2, z0 + off), 0x1864ab));
    // Tiefe (rechts unten)
    this.dimGroup.add(line(new THREE.Vector3(x1 + off, -off, z0), new THREE.Vector3(x1 + off, -off, z1)));
    this.dimGroup.add(this._label(D + " mm", new THREE.Vector3(x1 + off + 0.04, -off, 0), 0x2b8a3e));
    this.dimGroup.visible = this.showDims;
  };

  Viewer.prototype._label = function (text, pos, color) {
    const THREE = this.THREE;
    const c = document.createElement("canvas");
    c.width = 256; c.height = 64;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "rgba(255,255,255,0.94)";
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = "#" + color.toString(16).padStart(6, "0");
    ctx.font = "bold 34px Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 128, 34);
    const tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;   // sonst wirkt die Schrift ausgewaschen
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, toneMapped: false }));
    spr.scale.set(0.22, 0.055, 1);
    spr.position.copy(pos);
    return spr;
  };

  Viewer.prototype._pick = function (e) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    // Skizzen-Modus: Klick setzt Eckpunkt auf der Bodenebene
    if (this.sketchMode === "rect") {
      const gp = this._groundPointMM();
      if (gp) this.addSketchPointMM(gp.x, gp.z);
      return;
    }
    const hits = this.raycaster.intersectObjects(this.partMeshes, false);
    const obj = hits.length ? hits[0].object : null;
    // Material-Modus: Klick wählt das Bauteil (kein Öffnen/Schliessen) → Holzart-Auswahl
    if (this.materialMode) {
      this.select(obj);
      if (this.onSelect) this.onSelect(obj ? obj.userData.part : null);
      return;
    }
    if (obj && obj.userData.drawerId != null) { this.toggleDrawer(obj.userData.drawerId); return; }
    if (obj && obj.userData.doorId != null) { this.toggleDoor(obj.userData.doorId); return; }
    if (obj && obj.userData.flapId != null) { this.toggleFlap(obj.userData.flapId); return; }
    this.select(obj);
    if (this.onSelect) this.onSelect(this.selected ? this.selected.userData.part : null);
  };

  Viewer.prototype.select = function (mesh) {
    if (this.selected && this.selected.material.emissive) {
      this.selected.material.emissive.setHex(0x000000);
    }
    this.selected = mesh;
    if (mesh && mesh.material.emissive) mesh.material.emissive.setHex(0x2d6cdf);
    this.render();
  };

  Viewer.prototype.selectById = function (id) {
    const m = this.partMeshes.find((x) => x.userData.part.id === id);
    this.select(m || null);
  };

  Viewer.prototype.setWireframe = function (on) {
    this.wireframe = on;
    this.partMeshes.forEach((m) => { m.material.wireframe = on; });
    this.render();
  };
  Viewer.prototype.setExploded = function (on) { this.exploded = on; this._explodeAnim(); };

  // Auszüge einzeln oder alle auf/zu (sanfte Animation)
  Viewer.prototype.toggleDrawer = function (id) {
    const cur = (this.drawerTarget[id] != null) ? this.drawerTarget[id] : (this.drawerOpen[id] || 0);
    this.drawerTarget[id] = (cur > 0.5) ? 0 : 1;
    this._animTickStart();
  };
  Viewer.prototype.toggleDoor = function (id) {
    const cur = (this.doorTarget[id] != null) ? this.doorTarget[id] : (this.doorOpen[id] || 0);
    this.doorTarget[id] = (cur > 0.5) ? 0 : 1;
    this._animTickStart();
  };
  Viewer.prototype.toggleFlap = function (id) {
    const cur = (this.flapTarget[id] != null) ? this.flapTarget[id] : (this.flapOpen[id] || 0);
    this.flapTarget[id] = (cur > 0.5) ? 0 : 1;
    this._animTickStart();
  };
  Viewer.prototype.openAllDrawers = function (open) { const t = open ? 1 : 0; (this._drawerIds || []).forEach((id) => { this.drawerTarget[id] = t; }); this._animTickStart(); };
  Viewer.prototype.openAllDoors = function (open) { const t = open ? 1 : 0; (this._doorIds || []).forEach((id) => { this.doorTarget[id] = t; }); this._animTickStart(); };
  Viewer.prototype.openAllFlaps = function (open) { const t = open ? 1 : 0; (this._flapIds || []).forEach((id) => { this.flapTarget[id] = t; }); this._animTickStart(); };
  Viewer.prototype.anyDrawerOpen = function () { return (this._drawerIds || []).some((id) => (this.drawerTarget[id] || this.drawerOpen[id] || 0) > 0.5); };
  Viewer.prototype.anyDoorOpen = function () { return (this._doorIds || []).some((id) => (this.doorTarget[id] || this.doorOpen[id] || 0) > 0.5); };
  Viewer.prototype.anyFlapOpen = function () { return (this._flapIds || []).some((id) => (this.flapTarget[id] || this.flapOpen[id] || 0) > 0.5); };
  Viewer.prototype._animTickStart = function () { if (this._dTicking) return; this._dTicking = true; this._animTick(); };
  Viewer.prototype._animTick = function () {
    const self = this; let moving = false;
    function ease(openMap, targetMap, ids) {
      (ids || []).forEach((id) => {
        const t = (targetMap[id] != null) ? targetMap[id] : 0;
        const c = openMap[id] || 0;
        const nc = c + (t - c) * 0.16;
        openMap[id] = (Math.abs(t - nc) < 0.003) ? t : nc;
        if (openMap[id] !== t) moving = true;
      });
    }
    ease(this.drawerOpen, this.drawerTarget, this._drawerIds);
    ease(this.doorOpen, this.doorTarget, this._doorIds);
    ease(this.flapOpen, this.flapTarget, this._flapIds);
    this.render();
    if (moving) requestAnimationFrame(function () { self._animTick(); });
    else this._dTicking = false;
  };
  Viewer.prototype.setDims = function (on) { this.showDims = on; this.dimGroup.visible = on; this.render(); };

  Viewer.prototype.resetView = function () {
    if (this.sketchMode) this.cancelSketch();   // evtl. hängenden Skizzen-Modus lösen
    this.controls.enabled = true;                // Maus immer wieder freigeben
    const H = this.model ? this.model.bbox.h : 800;
    const maxd = Math.max(this.model.bbox.w, this.model.bbox.h, this.model.bbox.d) * SCALE;
    const dist = maxd * 1.9 + 0.6;
    this.camera.position.set(dist * 0.7, H * SCALE * 0.75 + 0.3, -dist);   // Front (-Z): Türen/Schubladen zur Kamera
    this.controls.target.set(0, H / 2 * SCALE, 0);
    this.controls.update();
    this.render();
  };

  // Foto-Modus: hochaufgelöstes Bild mit Studio-Hintergrund, ohne Raster, Achsen und Masse.
  // Mehr Licht und schärfere Schatten; danach wird alles zurückgestellt.
  Viewer.prototype.fotoRender = function (width) {
    const r = this.renderer, cam = this.camera;
    const w0 = r.domElement.clientWidth || r.domElement.width, h0 = r.domElement.clientHeight || r.domElement.height;
    const pr0 = r.getPixelRatio(), bg0 = this.scene.background, exp0 = r.toneMappingExposure;
    const key0 = this.key ? this.key.intensity : 0, hemi0 = this.hemi ? this.hemi.intensity : 0;
    const dims0 = this.dimGroup.visible, grid0 = this.grid ? this.grid.visible : true;
    const W = Math.max(640, width || 3200), H = Math.round(W * h0 / Math.max(1, w0));
    try {
      if (this.grid) this.grid.visible = false;
      (this.helperLines || []).forEach(function (l) { l.visible = false; });
      this.dimGroup.visible = false;
      this.scene.background = new THREE.Color(0xf7f4ee);
      r.toneMappingExposure = 0.92;
      if (this.key) { this.key.intensity = key0 * 1.25; if (this.key.shadow.map) { this.key.shadow.map.dispose(); this.key.shadow.map = null; } this.key.shadow.mapSize.set(4096, 4096); this.key.shadow.radius = 4; }
      if (this.hemi) this.hemi.intensity = hemi0 * 1.1;
      r.setPixelRatio(1); r.setSize(W, H, false); cam.aspect = W / H; cam.updateProjectionMatrix();
      this._applyExplode(); r.render(this.scene, cam);
      return r.domElement.toDataURL("image/png");
    } finally {
      if (this.grid) this.grid.visible = grid0;
      (this.helperLines || []).forEach(function (l) { l.visible = true; });
      this.dimGroup.visible = dims0; this.scene.background = bg0; r.toneMappingExposure = exp0;
      if (this.key) { this.key.intensity = key0; if (this.key.shadow.map) { this.key.shadow.map.dispose(); this.key.shadow.map = null; } this.key.shadow.mapSize.set(2048, 2048); this.key.shadow.radius = 7; }
      if (this.hemi) this.hemi.intensity = hemi0;
      r.setPixelRatio(pr0); r.setSize(w0, h0, false); cam.aspect = w0 / Math.max(1, h0); cam.updateProjectionMatrix(); this.render();
    }
  };

  Viewer.prototype.snapshot = function () {
    this.render();
    return this.renderer.domElement.toDataURL("image/png");
  };

  Viewer.prototype.presentStepKeys = function () {
    const s = {};
    this.modelGroup.children.forEach((m) => { if (m.userData.stepKey) s[m.userData.stepKey] = true; });
    return s;
  };

  // Montage-Schnappschuss: nur fertige + aktuelle Teile sichtbar, aktuelle hervorgehoben
  Viewer.prototype.snapshotAssembly = function (doneArr, curArr) {
    const done = {}; doneArr.forEach((k) => done[k] = 1);
    const cur = {}; curArr.forEach((k) => cur[k] = 1);
    const all = this.modelGroup.children, tinted = [];
    all.forEach((m) => {
      const k = m.userData.stepKey;
      m.visible = !!(done[k] || cur[k]);
      if (cur[k] && m.material && m.material.emissive) {
        m.userData._em = m.material.emissive.getHex();
        m.material.emissive.setHex(0xd9620a);
        tinted.push(m);
      }
    });
    this.renderer.render(this.scene, this.camera);
    const url = this.renderer.domElement.toDataURL("image/png");
    all.forEach((m) => { m.visible = true; });
    tinted.forEach((m) => { m.material.emissive.setHex(m.userData._em || 0); });
    this.renderer.render(this.scene, this.camera);
    return url;
  };

  Viewer.prototype._applyExplode = function () {
    const amt = this.explodeFactor * 0.18;
    const travel = this.drawerTravel || 0;
    const dopen = this.drawerOpen || {}, dropen = this.doorOpen || {}, flopen = this.flapOpen || {};
    const all = this.modelGroup.children;
    for (let i = 0; i < all.length; i++) {
      const m = all[i], u = m.userData;
      if (!u.home) continue;
      const ex = u.dir.x * amt, ey = u.dir.y * amt, ez = u.dir.z * amt;
      if (u.isDoor && u.hingePivot) {
        const ang = (dropen[u.doorId] || 0) * u.doorAngle;
        const ca = Math.cos(ang), sa = Math.sin(ang);
        const ox = u.home.x - u.hingePivot.x, oz = u.home.z - u.hingePivot.z;
        m.position.x = u.hingePivot.x + (ox * ca + oz * sa) + ex;
        m.position.y = u.home.y + ey;
        m.position.z = u.hingePivot.z + (-ox * sa + oz * ca) + ez;
        m.rotation.y = ang;
      } else if (u.isFlap && u.flapPivot) {
        const ang = (flopen[u.flapId] || 0) * u.flapAngle;
        const ca = Math.cos(ang), sa = Math.sin(ang);
        const oy = u.home.y - u.flapPivot.y, oz = u.home.z - u.flapPivot.z;
        m.position.x = u.home.x + ex;
        m.position.y = u.flapPivot.y + (oy * ca - oz * sa) + ey;
        m.position.z = u.flapPivot.z + (oy * sa + oz * ca) + ez;
        m.rotation.x = ang;
      } else {
        let ds = 0;
        if (u.isDrawer) { const f = (u.drawerId != null) ? (dopen[u.drawerId] || 0) : (this.openFactor || 0); ds = f * travel; }
        m.position.x = u.home.x + ex;
        m.position.y = u.home.y + ey;
        m.position.z = u.home.z + ez - ds;
        if (m.rotation.y) m.rotation.y = 0;
      }
    }
  };

  // Nach dem Laden eines Furnier-Fotos: Texturen aller Bauteile neu setzen, ein Bild zeichnen
  Viewer.prototype._refreshTextures = function () {
    (this.partMeshes || []).forEach((m) => {
      const part = m.userData.part;
      if (part && m.material && m.material.map) SchreinerMaterials.applyPart(m.material, part.material, part);
    });
    (this.bodyMeshes || []).forEach((m) => {
      if (m.userData.matKey && m.material && m.material.map) {
        m.material.map = SchreinerMaterials.currentMap(m.userData.matKey);
        m.material.bumpMap = m.material.map; m.material.needsUpdate = true;
      }
    });
    this.render();
  };

  // Bedarfsgesteuertes Rendern (kein Dauer-Loop)
  Viewer.prototype.render = function () {
    this._applyExplode();
    this.renderer.render(this.scene, this.camera);
    if (this.onRender) this.onRender();   // z.B. ViewCube an Kamera angleichen
  };

  // Standardansichten wie in Fusion (ViewCube): front/back/left/right/top/bottom/iso
  Viewer.prototype.setStandardView = function (name) {
    if (!this.model) return;
    const H = this.model.bbox.h;
    const maxd = Math.max(this.model.bbox.w, this.model.bbox.h, this.model.bbox.d) * SCALE;
    const dist = maxd * 1.9 + 0.6;
    const ty = H / 2 * SCALE;
    const e = 0.0001;
    let p;
    switch (name) {
      case "front":  p = [0, ty, -dist]; break;          // Front = -Z (Türen/Fronten)
      case "back":   p = [0, ty, dist]; break;
      case "left":   p = [-dist, ty, e]; break;
      case "right":  p = [dist, ty, e]; break;
      case "top":    p = [e, ty + dist, e]; break;
      case "bottom": p = [e, ty - dist, e]; break;
      default:       p = [dist * 0.7, ty + maxd * 0.5, -dist]; break;   // iso / home
    }
    this.camera.position.set(p[0], p[1], p[2]);
    this.controls.target.set(0, ty, 0);
    this.controls.update();
    this.render();
  };

  // Sichtbarkeit eines Bauteils schalten (Browser-Augensymbol)
  Viewer.prototype.setPartVisible = function (id, vis) {
    const m = this.partMeshes.find((x) => x.userData.part && x.userData.part.id === id);
    if (m) { m.visible = vis; this.render(); }
  };

  // ---- CSG-Adapter: THREE-Geometrie <-> CSG (für Bohren/Nuten) ----
  function geomToCSG(geom, ox, oy, oz) {
    const pos = geom.attributes.position, nrm = geom.attributes.normal, idx = geom.index;
    const polys = [];
    function V(i) {
      return new window.CSG.Vertex(
        new window.CSG.Vector(pos.getX(i) + ox, pos.getY(i) + oy, pos.getZ(i) + oz),
        new window.CSG.Vector(nrm ? nrm.getX(i) : 0, nrm ? nrm.getY(i) : 0, nrm ? nrm.getZ(i) : 1));
    }
    function addPoly(a, b, c) {
      // degenerierte (flächenlose) Dreiecke überspringen -> kein NaN im BSP
      const ux = b.pos.x - a.pos.x, uy = b.pos.y - a.pos.y, uz = b.pos.z - a.pos.z;
      const vx = c.pos.x - a.pos.x, vy = c.pos.y - a.pos.y, vz = c.pos.z - a.pos.z;
      const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
      if (cx * cx + cy * cy + cz * cz < 1e-20) return;
      polys.push(new window.CSG.Polygon([a, b, c]));
    }
    if (idx) { for (let i = 0; i < idx.count; i += 3) addPoly(V(idx.getX(i)), V(idx.getX(i + 1)), V(idx.getX(i + 2))); }
    else { for (let i = 0; i < pos.count; i += 3) addPoly(V(i), V(i + 1), V(i + 2)); }
    return window.CSG.fromPolygons(polys);
  }
  function csgToGeom(THREE, csg) {
    const P = [], N = [], U = [], polys = csg.toPolygons();
    for (let p = 0; p < polys.length; p++) {
      const vs = polys[p].vertices, n = polys[p].plane.normal;
      const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z);
      for (let i = 2; i < vs.length; i++) {
        const tri = [vs[0], vs[i - 1], vs[i]];
        for (let t = 0; t < 3; t++) {
          const v = tri[t];
          P.push(v.pos.x, v.pos.y, v.pos.z);
          N.push(v.normal.x, v.normal.y, v.normal.z);
          let u, w;
          if (ax >= ay && ax >= az) { u = v.pos.z; w = v.pos.y; }
          else if (ay >= ax && ay >= az) { u = v.pos.x; w = v.pos.z; }
          else { u = v.pos.x; w = v.pos.y; }
          U.push(u / 0.34, w / 0.34);   // planare UV -> Holz kachelt ~340 mm
        }
      }
    }
    // Normalen normieren (Lerp an Schnittkanten erzeugt nicht-Einheitsvektoren -> sonst Licht-Artefakte)
    for (let i = 0; i < N.length; i += 3) {
      const l = Math.sqrt(N[i] * N[i] + N[i + 1] * N[i + 1] + N[i + 2] * N[i + 2]);
      if (l > 1e-9) { N[i] /= l; N[i + 1] /= l; N[i + 2] /= l; }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(U, 2));
    return g;
  }

  // ---- Frei modellierte Volumenkörper (echte Solids, Welt-mm) inkl. Schnitte ----
  Viewer.prototype.setBodies = function (bodies) {
    const THREE = this.THREE;
    while (this.bodyGroup.children.length) this.bodyGroup.remove(this.bodyGroup.children[0]);
    this.bodyMeshes = [];
    (bodies || []).forEach((b) => {
      if (b.kind !== "box") return;
      const w = b.w * SCALE, h = b.h * SCALE, d = b.d * SCALE;
      if (w <= 0 || h <= 0 || d <= 0) return;
      const bcx = (b.x + b.w / 2) * SCALE, bcy = (b.y + b.h / 2) * SCALE, bcz = (b.z + b.d / 2) * SCALE;
      const cuts = b.cuts || [];
      this._cutErrors = this._cutErrors || {};
      delete this._cutErrors[b.id];
      let geo;
      if (cuts.length && window.CSG) {
        try {
          let base = geomToCSG(new THREE.BoxGeometry(w, h, d), 0, 0, 0);
          cuts.forEach((c) => {
            let cg, ox, oy, oz;
            if (c.kind === "cyl") {
              const r = c.r * SCALE, chh = (c.h != null ? c.h : (b.h + 40)) * SCALE;
              cg = new THREE.CylinderGeometry(r, r, chh, 28);   // Achse Y (senkrechte Bohrung)
              const cwx = (b.x + c.x) * SCALE, cwz = (b.z + c.z) * SCALE, cwy = (b.y + (c.y != null ? c.y : b.h / 2)) * SCALE;
              ox = cwx - bcx; oy = cwy - bcy; oz = cwz - bcz;
            } else {
              const cw = c.w * SCALE, chh = c.h * SCALE, cd = c.d * SCALE;
              cg = new THREE.BoxGeometry(cw, chh, cd);
              const cwx = (b.x + c.x + c.w / 2) * SCALE, cwy = (b.y + c.y + c.h / 2) * SCALE, cwz = (b.z + c.z + c.d / 2) * SCALE;
              ox = cwx - bcx; oy = cwy - bcy; oz = cwz - bcz;
            }
            try {
              const after = base.subtract(geomToCSG(cg, ox, oy, oz));
              if (after.polygons.length) base = after; else this._cutErrors[b.id] = true;   // leeres Ergebnis -> Schnitt verwerfen, Körper bleibt sichtbar
            } catch (e2) { this._cutErrors[b.id] = true; }
          });
          geo = base.polygons.length ? csgToGeom(THREE, base) : new THREE.BoxGeometry(w, h, d);
        } catch (e) { console.warn("CSG", e); this._cutErrors[b.id] = true; geo = new THREE.BoxGeometry(w, h, d); }
      } else {
        geo = THREE.RoundedBoxGeometry ? new THREE.RoundedBoxGeometry(w, h, d, 2, Math.min(0.001, w * 0.05)) : new THREE.BoxGeometry(w, h, d);
      }
      const mat = SchreinerMaterials.getMaterial(b.material || "eiche").clone();
      const m = new THREE.Mesh(geo, mat);
      m.position.set(bcx, bcy, bcz);
      m.castShadow = true; m.receiveShadow = true;
      m.userData.bodyId = b.id;
      m.userData.matKey = b.material || "eiche";
      this.bodyGroup.add(m); this.bodyMeshes.push(m);
    });
    this.render();
  };
  Viewer.prototype.selectBody = function (id) {
    this.bodyMeshes.forEach((m) => { if (m.material.emissive) m.material.emissive.setHex(m.userData.bodyId === id ? 0x2d6cdf : 0x000000); });
    this.render();
  };

  // ---- Skizze: Grundriss-Rechteck auf der Bodenebene (y=0) ----
  Viewer.prototype.startGroundRect = function (onDone) {
    this.sketchMode = "rect"; this._sketchPts = []; this._sketchDone = onDone;
    this.controls.enabled = false;
    this.setStandardView("top");
  };
  Viewer.prototype.cancelSketch = function () {
    this.sketchMode = null; this._sketchPts = []; this._sketchDone = null; this.controls.enabled = true;
  };
  Viewer.prototype.addSketchPointMM = function (mmx, mmz) {
    if (this.sketchMode !== "rect") return;
    this._sketchPts.push([mmx, mmz]);
    if (this._sketchPts.length >= 2) {
      const a = this._sketchPts[0], b = this._sketchPts[1];
      const rect = { x: Math.min(a[0], b[0]), z: Math.min(a[1], b[1]), w: Math.abs(b[0] - a[0]), d: Math.abs(b[1] - a[1]) };
      const cb = this._sketchDone;
      this.cancelSketch();
      if (cb && rect.w > 1 && rect.d > 1) cb(rect);
    }
  };
  Viewer.prototype._groundPointMM = function () {
    const r = this.raycaster.ray;
    if (Math.abs(r.direction.y) < 1e-6) return null;
    const t = -r.origin.y / r.direction.y;
    return { x: (r.origin.x + r.direction.x * t) / SCALE, z: (r.origin.z + r.direction.z * t) / SCALE };
  };

  // Kurzer Loop nur fuer die Explosions-Animation
  Viewer.prototype._explodeAnim = function () {
    const self = this;
    if (this._exA) cancelAnimationFrame(this._exA);
    const target = this.exploded ? 1 : 0;
    function step() {
      self.explodeFactor += (target - self.explodeFactor) * 0.2;
      if (Math.abs(target - self.explodeFactor) < 0.003) {
        self.explodeFactor = target;
        self.render();
        self._exA = null;
        return;
      }
      self.render();
      self._exA = requestAnimationFrame(step);
    }
    step();
  };

  global.SchreinerViewer = Viewer;
})(window);
