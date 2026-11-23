// ===== editor.js · Developer Tool: Gelände, Malen, Straße, Vegetation, Umgebung, Datei =====
// Kamera: rechte Maustaste drehen, mittlere Maustaste (oder Umschalt + rechte) verschieben, Mausrad zoomen, WASD bewegen.
import * as THREE from "three";
import { t, addTexts, L2, tl, clamp, lerp, el, esc, fmt, store, KEYS } from "pr/core.js";
import { LAYERS } from "pr/terrain.js";
import { TYPES } from "pr/vegetation.js";
import { Road } from "pr/road.js";
import { CheckpointMarkers } from "pr/race.js";
import { download, loadText, autosave } from "pr/sceneio.js";

addTexts({
  eTitle: L2("Developer Tool", "Developer tool"), eDrive: L2("Testfahrt", "Test drive"), eRace: L2("Test-Rennen", "Test race"), eMenu: L2("Hauptmenü", "Main menu"),
  tTerrain: L2("Gelände", "Terrain"), tPaint: L2("Boden malen", "Paint ground"), tRoad: L2("Straße", "Road"), tVeg: L2("Vegetation", "Vegetation"), tEnv: L2("Umgebung", "Environment"), tFile: L2("Datei", "File"),
  mRaise: L2("Anheben", "Raise"), mLower: L2("Absenken", "Lower"), mSmooth: L2("Glätten", "Smooth"), mFlatten: L2("Ebnen", "Flatten"), mNoise: L2("Aufrauen", "Roughen"), mErode: L2("Erosion", "Erosion"),
  hErode: L2("Erosion: Regen läuft an Hängen ab etwa 18° bergab, gräbt Rinnen und lagert das Material unten wieder ab. Flache Stellen bleiben unverändert. Länger halten = tiefere Rinnen, Stärke regelt das Tempo.", "Erosion: rain runs down slopes from about 18°, carves gullies and deposits the material further down. Flat ground stays as it is. Hold longer for deeper gullies, strength sets the speed."),
  radius: L2("Pinselgröße", "Brush size"), strength: L2("Stärke", "Strength"),
  hTerrain: L2("Linke Maus formt. Umschalt kehrt Anheben/Absenken um. Ebnen nimmt die Höhe beim Klick. Die Straße bleibt immer auf ihrer Höhe, das Gelände wird darunter weggedrückt.", "Left mouse shapes. Shift inverts raise/lower. Flatten takes the height at the click. The road always keeps its height, the terrain is pushed away below it."),
  hPaint: L2("Linke Maus malt die Bodenart. Steile Hänge werden automatisch zu Fels. Die Bodenart bestimmt später die Haftung neben der Strecke.", "Left mouse paints the ground type. Steep slopes turn to rock automatically. The ground type later sets the grip next to the track."),
  hRoad: L2("Gerade/Kurve: Klick ins Freie beginnt eine neue Straße, jeder weitere Klick setzt ein Stück (bei Kurve erst Bogenpunkt, dann Ende). Esc oder Rechtsklick beendet die Straße – danach baust du wieder frei. Abzweigung: in einem Platzier-Modus auf einen Punkt einer Straße klicken (oder auf die Fahrbahn) und von dort bauen. Einmündung: auf einer anderen Straße oder ihrem Punkt enden. Brücke über eine Straße: mit V mindestens 3 m höher bauen, die Überführung entsteht automatisch. C/V Höhe (Umschalt = 5 m). Bearbeiten: Punkte ziehen, Umschalt+Ziehen = Höhe, Strg+Klick fügt ein, Entf löscht.", "Straight/curve: clicking empty ground starts a new road, every further click places a piece (for curves first the bend point, then the end). Esc or right click finishes the road – after that you build freely again. Branch: in a placement mode click a point of a road (or its surface) and build from there. Merge: end on another road or one of its points. Bridge over a road: build at least 3 m higher with V, the overpass is created automatically. C/V height (Shift = 5 m). Edit: drag points, Shift+drag = height, Ctrl+click inserts, Del deletes."),
  rEdit: L2("Bearbeiten", "Edit"), rStraight: L2("Gerade", "Straight"), rCurve: L2("Kurve", "Curve"),
  rTerr: L2("Straßen-Terrain", "Road terrain"), rOn: L2("An", "On"), rOff: L2("Aus", "Off"),
  rTerrOn: L2("An: Die Straße formt das Gelände unter sich (aufschütten und abtragen).", "On: the road shapes the terrain below it (fill and cut)."),
  rTerrOff: L2("Aus: Die Straße liegt auf dem vorhandenen Gelände, nur Hervorstehendes wird abgetragen. Wo sie höher als 1,4 m über dem Boden liegt, entsteht automatisch eine Betonbrücke.", "Off: the road sits on the existing terrain, only what sticks out is cut away. Where it runs more than 1.4 m above the ground, a concrete bridge is built automatically."),
  rH: L2("Platzierhöhe über Gelände (C/V)", "Placement height above terrain (C/V)"), pTerr: L2("Gelände anpassen (ab diesem Punkt)", "Shape terrain (from this point)"),
  rStat: L2("Höhe {h} m · Straßen-Terrain {t} · Länge {l} m", "Height {h} m · road terrain {t} · length {l} m"), rCtrl: L2("Bogenpunkt gesetzt – jetzt das Ende klicken", "Bend point set – now click the end"),
  rBridge: L2("{n} m Brücke", "{n} m bridge"), rRoads: L2("{n} Straßen · {l} m", "{n} roads · {l} m"), rRoad: L2("Straße {i} von {n}", "Road {i} of {n}"),
  pCp: L2("Checkpoint (Taste K)", "Checkpoint (key K)"), pCpMain: L2("Checkpoints zählen nur auf der Hauptstrecke (erster Rundkurs).", "Checkpoints only count on the main road (first circuit)."),
  rDelRoad: L2("Diese Straße löschen", "Delete this road"), pBr: L2("Brücke erzwingen (ab diesem Punkt)", "Force bridge (from this point)"),
  rFree: L2("Keine Straße gewählt – der nächste Klick beginnt eine neue.", "No road selected – the next click starts a new one."),
  lgOn: L2("auf dem Gelände", "on the terrain"), lgUp: L2("aufgeschüttet / schwebt", "raised / floating"), lgDown: L2("im Boden (wird abgetragen)", "in the ground (gets cut)"), lgBr: L2("Brücke", "bridge"), lgX: L2("kreuzt Straße zu niedrig", "crosses a road too low"),
  rsStart: L2("Klick setzt den Startpunkt einer neuen Straße", "Click sets the start of a new road"), rsBranch: L2("Abzweigung von dieser Straße", "Branch from this road"), rsJoin: L2("mündet in die Straße", "joins the road"),
  rsEnd: L2("Ende {h} m über Gelände", "End {h} m above terrain"), rsCross: L2("Achtung: kreuzt eine Straße zu niedrig – mit V höher bauen (Brücke) oder auf ihr enden (Einmündung)", "Note: crosses a road too low – build higher with V (bridge) or end on it (junction)"), vSp: L2("Abstand (klein = dichter)", "Spacing (small = denser)"),
  hVeg: L2("Linke Maus pinselt die gewählte Gruppe. Jede Pflanze wird nach den Wahrscheinlichkeiten gewählt. Abstand zur Straße und maximale Hangneigung gelten je Gruppe.", "Left mouse paints the selected group. Each plant is picked by the probabilities. Distance to the road and maximum slope apply per group."),
  hCam: L2("Kamera: rechte Maus drehen · mittlere Maus oder Umschalt+rechte verschieben · Rad zoomen · WASD bewegen · 1–6 Werkzeuge · Strg+Z/Y", "Camera: right mouse rotate · middle mouse or Shift+right pan · wheel zoom · WASD move · 1–6 tools · Ctrl+Z/Y"),
  pPoint: L2("Punkt {i} von {n}", "Point {i} of {n}"), pNone: L2("Kein Punkt gewählt", "No point selected"), height: L2("Höhe", "Height"), width: L2("Breite", "Width"), bank: L2("Neigung (+ links höher)", "Banking (+ left higher)"),
  curbL: L2("Kerbs links", "Curbs left"), curbR: L2("Kerbs rechts", "Curbs right"), snap: L2("Auf Gelände setzen", "Snap to terrain"), del: L2("Punkt löschen", "Delete point"),
  closed: L2("Rundkurs (geschlossen)", "Circuit (closed)"), fall: L2("Böschung", "Embankment"), snapAll: L2("Alle Punkte auf Gelände", "All points to terrain"), smoothH: L2("Höhenverlauf glätten", "Smooth height profile"),
  roadDel: L2("Straße löschen", "Delete road"), roadLen: L2("Länge {l} m · {n} Punkte", "Length {l} m · {n} points"),
  vPaint: L2("Pinseln", "Paint"), vErase: L2("Radieren", "Erase"), vOnly: L2("Radierer nur für diese Gruppe", "Eraser only for this group"), vGroups: L2("Pinsel-Gruppen", "Brush groups"),
  vNew: L2("Neue Gruppe", "New group"), vDelG: L2("Gruppe löschen", "Delete group"), vAdd: L2("+ Typ hinzufügen", "+ Add type"), vDens: L2("Dichte (je 100 m²)", "Density (per 100 m²)"),
  slMin: L2("Hangneigung von", "Slope from"), slMax: L2("Hangneigung bis", "Slope to"), vSlopeMin: L2("Min. Hangneigung", "Min. slope"),
  hSlope: L2("Mit „Hangneigung von/bis“ malst du nur Gelände in diesem Neigungsbereich, z. B. 25–90° für alle Hänge.", "With “slope from/to” you only paint terrain within that slope range, e.g. 25–90° for all slopes."),
  vSmin: L2("Größe min", "Size min"), vSmax: L2("Größe max", "Size max"), vSlope: L2("Max. Hangneigung", "Max. slope"), vRoad: L2("Abstand zur Straße", "Distance to road"), vCount: L2("{n} Pflanzen in der Szene", "{n} plants in the scene"),
  vName: L2("Name", "Name"), vProb: L2("Wahrscheinlichkeit", "Probability"),
  envTime: L2("Uhrzeit", "Time of day"), envFog: L2("Dunst/Nebel", "Haze/fog"), envView: L2("Sichtweite", "View distance"), envWind: L2("Wind", "Wind"), envWindDir: L2("Windrichtung", "Wind direction"),
  envNote: L2("Wetter, Wolken mit Wolkenschatten und Lichtquellen folgen in den nächsten Updates.", "Weather, clouds with cloud shadows and light sources follow in the next updates."),
  fName: L2("Streckenname", "Track name"), fExport: L2("Exportieren (.txt)", "Export (.txt)"), fImport: L2("Importieren (.txt)", "Import (.txt)"), fNew: L2("Neue leere Fläche", "New blank area"), fStd: L2("Standard-Teststrecke", "Standard test track"),
  fNote: L2("Die Szene wird automatisch im Browser gespeichert. Für das Spiel: exportieren und mir die .txt schicken bzw. in polyracer/strecken/ hochladen.", "The scene is saved automatically in the browser. For the game: export and send me the .txt or upload it to polyracer/strecken/."),
  fSure: L2("Aktuelle Szene verwerfen? (Rückgängig geht)", "Discard the current scene? (Undo works)"), fDone: L2("Exportiert: {f}", "Exported: {f}"), fBad: L2("Datei konnte nicht gelesen werden.", "The file could not be read."), fLoaded: L2("Geladen: {n}", "Loaded: {n}")
});

// Vorschau-Farben (Palette): Stein = auf dem Gelände, Stahlblau = aufgeschüttet/schwebt, Koralle = im Boden, Petrol = Brücke, Gelb = kreuzt zu niedrig
const GC = { on: "#C6C5B9", up: "#4A6D7C", down: "#ED6A5E", br: "#62929E", x: "#F2C14E" };
const GCc = {}; Object.keys(GC).forEach((k) => { GCc[k] = new THREE.Color(GC[k]); });
const TOOLS = [["terrain", "tTerrain"], ["paint", "tPaint"], ["road", "tRoad"], ["veg", "tVeg"], ["env", "tEnv"], ["file", "tFile"]];

export class Editor {
  constructor(app) {
    this.app = app; this.world = app.world; this.eng = app.engine;
    const u = store.get(KEYS.ui, {});
    this.s = Object.assign({ tool: "terrain", tmode: "raise", tr: 22, ts: 0.5, layer: 0, pr: 12, psmin: 0, psmax: 90, vg: 0, vmode: "paint", vr: 18, vonly: false, rmode: "straight", rterr: 1, rh: 0 }, u.ed || {});
    this.cam = Object.assign({ x: 0, y: 0, z: 0, dist: 420, yaw: 0.6, pitch: 0.85 }, u.cam || {});
    this.sel = -1; this.sr = -1; this.undo = []; this.redo = []; this.mouse = new THREE.Vector2(); this.hit = null; this.btn = -1; this.drag = null;
    this.ray = new THREE.Raycaster();
    // Pinsel-Kreis
    const lg = new THREE.BufferGeometry(); lg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(65 * 3), 3));
    this.ring = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: 0xFFE08A, depthTest: false, transparent: true })); this.ring.renderOrder = 10; this.eng.scene.add(this.ring);
    this.handles = new THREE.Group(); this.eng.scene.add(this.handles);
    this.hGeo = new THREE.SphereGeometry(1.4, 10, 6); this.hMat = new THREE.MeshBasicMaterial({ color: 0xFFD34A, depthTest: false }); this.hSel = new THREE.MeshBasicMaterial({ color: 0xFF5A2A, depthTest: false }); this.hOff = new THREE.MeshBasicMaterial({ color: 0x8FD3E0, depthTest: false });
    this.hOff2 = this.hOff; this.hBr = new THREE.MeshBasicMaterial({ color: 0x62929E, depthTest: false }); this.hCp = new THREE.MeshBasicMaterial({ color: 0xFFFFFF, depthTest: false });
    this.cpm = new CheckpointMarkers(this.world, false);
    // Vorschau: farbiges Band in Straßenbreite (Farbe = Lage zum Gelände), Lote zum Boden, Endmarke
    this.ghost = new Road(); this.ghost.world = this.world; this.ghost.base = (x, z) => this.world.terrain.heightAt(x, z, true);
    this.gm = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.6, depthTest: false, side: THREE.DoubleSide })); this.gm.renderOrder = 12; this.gm.frustumCulled = false;
    this.gl = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ vertexColors: true, depthTest: false, transparent: true, opacity: 0.9 })); this.gl.renderOrder = 12; this.gl.frustumCulled = false;
    this.mk = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ color: 0xFFFFFF, depthTest: false, transparent: true, opacity: 0.9 })); this.mk.renderOrder = 13;
    this.eng.scene.add(this.gm); this.eng.scene.add(this.gl); this.eng.scene.add(this.mk); this.gm.visible = this.gl.visible = this.mk.visible = false;
    this.pv = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xFF5A2A, depthTest: false, transparent: true, opacity: 0.95 })); this.pv.renderOrder = 12; this.pv.frustumCulled = false; this.eng.scene.add(this.pv); this.place = null;
    this.lMat = new THREE.LineBasicMaterial({ color: 0xFFD34A, transparent: true, opacity: 0.6, depthTest: false });
    this.buildUI();
    const c = this.eng.renderer.domElement;
    this.onDown = (e) => this.down(e); this.onMove = (e) => this.move(e); this.onUp = (e) => this.up(e); this.onWheel = (e) => this.wheel(e); this.onCtx = (e) => e.preventDefault();
    c.addEventListener("pointerdown", this.onDown); window.addEventListener("pointermove", this.onMove); window.addEventListener("pointerup", this.onUp);
    c.addEventListener("wheel", this.onWheel, { passive: false }); c.addEventListener("contextmenu", this.onCtx);
    this.rebuildHandles();
  }
  dispose() {
    const c = this.eng.renderer.domElement;
    c.removeEventListener("pointerdown", this.onDown); window.removeEventListener("pointermove", this.onMove); window.removeEventListener("pointerup", this.onUp);
    c.removeEventListener("wheel", this.onWheel); c.removeEventListener("contextmenu", this.onCtx);
    this.eng.scene.remove(this.ring); this.eng.scene.remove(this.handles); this.eng.scene.remove(this.pv); this.eng.scene.remove(this.gm); this.eng.scene.remove(this.gl); this.eng.scene.remove(this.mk); this.cpm.dispose(); this.root.remove(); this.saveUI();
  }
  saveUI() { const u = store.get(KEYS.ui, {}); u.ed = this.s; u.cam = this.cam; store.set(KEYS.ui, u); }
  // ---------- Oberfläche ----------
  buildUI() {
    const r = this.root = el("div", "pr-ed");
    r.innerHTML = '<div class="pr-top"><b>' + t("eTitle") + '</b><span class="pr-name" id="pr-ename"></span><span class="pr-sp"></span>' +
      '<button data-e="undo" title="Strg+Z">↶</button><button data-e="redo" title="Strg+Y">↷</button><button data-e="drive" class="pr-pri">▶ ' + t("eDrive") + '</button><button data-e="race">⚑ ' + t("eRace") + '</button><button data-e="menu">' + t("eMenu") + "</button></div>" +
      '<div class="pr-tools">' + TOOLS.map((x, i) => '<button data-tool="' + x[0] + '"><i>' + (i + 1) + "</i>" + t(x[1]) + "</button>").join("") + "</div>" +
      '<div class="pr-panel" id="pr-panel"></div><div class="pr-status"><span id="pr-st"></span><span>' + t("hCam") + "</span></div>" +
      '<input type="file" id="pr-file" accept=".txt,.json,text/plain" hidden>';
    this.app.ui.appendChild(r);
    r.addEventListener("click", (e) => this.click(e)); r.addEventListener("input", (e) => this.input(e)); r.addEventListener("change", (e) => this.change(e));
    this.panel();
  }
  panel() {
    const s = this.s, w = this.world, P = this.root.querySelector("#pr-panel");
    this.root.querySelectorAll("[data-tool]").forEach((b) => b.setAttribute("aria-pressed", String(b.getAttribute("data-tool") === s.tool)));
    this.root.querySelector("#pr-ename").textContent = w.name;
    const sl = (k, lab, min, max, step, v, unit) => '<label class="pr-row"><span>' + lab + ' <em id="pv-' + k + '">' + fmtv(v, step) + (unit || "") + '</em></span><input type="range" data-k="' + k + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + v + '" data-u="' + (unit || "") + '"></label>';
    const seg = (k, opts, cur) => '<div class="pr-seg">' + opts.map((o) => '<button data-seg="' + k + '" data-v="' + o[0] + '" aria-pressed="' + (String(cur) === String(o[0])) + '">' + o[1] + "</button>").join("") + "</div>";
    const chk = (k, lab, v) => '<label class="pr-chk"><input type="checkbox" data-k="' + k + '"' + (v ? " checked" : "") + "> " + lab + "</label>";
    let h = "";
    if (s.tool === "terrain") h = "<h3>" + t("tTerrain") + "</h3>" + seg("tmode", [["raise", t("mRaise")], ["lower", t("mLower")], ["smooth", t("mSmooth")], ["flatten", t("mFlatten")], ["noise", t("mNoise")], ["erode", t("mErode")]], s.tmode) +
      sl("tr", t("radius"), 3, 120, 1, s.tr, " m") + sl("ts", t("strength"), 0.05, 1, 0.05, s.ts) + (s.tmode === "erode" ? "<p>" + t("hErode") + "</p>" : "") + "<p>" + t("hTerrain") + "</p>";
    else if (s.tool === "paint") h = "<h3>" + t("tPaint") + '</h3><div class="pr-layers">' + LAYERS.map((L, i) => '<button data-seg="layer" data-v="' + i + '" aria-pressed="' + (s.layer === i) + '"><i style="background:' + L.c + '"></i>' + tl(L.n) + "</button>").join("") + "</div>" +
      sl("pr", t("radius"), 2, 80, 1, s.pr, " m") + sl("psmin", t("slMin"), 0, 90, 1, s.psmin, "°") + sl("psmax", t("slMax"), 0, 90, 1, s.psmax, "°") + "<p>" + t("hPaint") + " " + t("hSlope") + "</p>";
    else if (s.tool === "road") {
      const R = this.rd(), p = this.pt(), RS = w.roads.filter((r) => r.pts.length > 1);
      let bl = 0, tl2 = 0; RS.forEach((r) => { tl2 += r.len; for (let i = 0; i < r.segCount(); i++) { const a = r.S[i], b = r.S[(i + 1) % r.S.length]; if (a.br && b.br) bl += a.p.distanceTo(b.p); } });
      const lg = (c, k) => '<span class="pr-lg"><i style="background:' + c + '"></i>' + t(k) + "</span>";
      h = "<h3>" + t("tRoad") + '</h3><p class="pr-dim">' + fmt(t("rRoads"), { n: RS.length, l: Math.round(tl2) }) + (bl > 0 ? " · " + fmt(t("rBridge"), { n: Math.round(bl) }) : "") + "</p>" +
        seg("rmode", [["edit", t("rEdit")], ["straight", t("rStraight")], ["curve", t("rCurve")]], s.rmode) +
        '<div class="pr-row"><span>' + t("rTerr") + "</span></div>" + seg("rterr", [[1, t("rOn")], [0, t("rOff")]], s.rterr) + '<p class="pr-dim">' + t(s.rterr ? "rTerrOn" : "rTerrOff") + "</p>" +
        sl("rh", t("rH"), -30, 80, 0.5, s.rh, " m") +
        '<div class="pr-legend">' + lg(GC.on, "lgOn") + lg(GC.up, "lgUp") + lg(GC.down, "lgDown") + lg(GC.br, "lgBr") + lg(GC.x, "lgX") + "</div>";
      if (R) {
        h += '<div class="pr-box"><b>' + fmt(t("rRoad"), { i: w.roads.indexOf(R) + 1, n: w.roads.length }) + '</b> <span class="pr-dim">' + fmt(t("roadLen"), { l: Math.round(R.len), n: R.pts.length }) + "</span>" +
          chk("closed", t("closed"), R.closed) + sl("fall", t("fall"), 2, 40, 1, R.fall, " m") +
          '<div class="pr-btns"><button data-e="snapall">' + t("snapAll") + '</button><button data-e="smoothh">' + t("smoothH") + '</button><button data-e="rdel">' + t("rDelRoad") + "</button></div></div>";
        if (p) h += '<div class="pr-box"><b>' + fmt(t("pPoint"), { i: this.sel + 1, n: R.pts.length }) + "</b>" + sl("py", t("height"), -150, 250, 0.1, p.y, " m") +
          '<div class="pr-btns"><button data-e="py-5">−5</button><button data-e="py-1">−1</button><button data-e="py+1">+1</button><button data-e="py+5">+5</button></div>' +
          sl("pw", t("width"), 4, 30, 0.5, p.w, " m") + sl("pb", t("bank"), -30, 30, 0.5, p.bank, "°") + chk("pcl", t("curbL"), p.cl) + chk("pcr", t("curbR"), p.cr) + chk("pt", t("pTerr"), p.t !== 0) + chk("pbr", t("pBr"), !!p.b) + chk("pcp", t("pCp"), !!p.cp) + (p.cp && R !== w.road ? '<p class="pr-dim">' + t("pCpMain") + "</p>" : "") +
          '<div class="pr-btns"><button data-e="snap">' + t("snap") + '</button><button data-e="pdel">' + t("del") + "</button></div></div>";
      } else h += '<p class="pr-dim">' + t("rFree") + "</p>";
      h += "<p>" + t("hRoad") + "</p>";
    } else if (s.tool === "veg") {
      const V = w.veg, G = V.groups, g = G[clamp(s.vg, 0, G.length - 1)];
      h = "<h3>" + t("tVeg") + "</h3>" + seg("vmode", [["paint", t("vPaint")], ["erase", t("vErase")]], s.vmode) + sl("vr", t("radius"), 2, 80, 1, s.vr, " m") + chk("vonly", t("vOnly"), s.vonly) +
        '<h4>' + t("vGroups") + '</h4><div class="pr-groups">' + G.map((x, i) => '<button data-seg="vg" data-v="' + i + '" aria-pressed="' + (i === s.vg) + '">' + esc(x.n) + "</button>").join("") + '<button data-e="gnew">+ ' + t("vNew") + "</button></div>";
      if (g) {
        h += '<div class="pr-box"><label class="pr-row"><span>' + t("vName") + '</span><input type="text" data-k="gname" value="' + esc(g.n) + '"></label>' +
          g.items.map((it, i) => '<div class="pr-item"><span>' + (TYPES[it.t] ? tl(TYPES[it.t].n) : it.t) + ' <em id="pv-gi' + i + '">' + it.p + ' %</em></span><input type="range" data-k="gi' + i + '" min="0" max="100" step="1" value="' + it.p + '"><button data-e="gix' + i + '" title="×">×</button></div>').join("") +
          '<select data-k="gadd"><option value="">' + t("vAdd") + "</option>" + Object.keys(TYPES).filter((k) => !g.items.some((it) => it.t === k)).map((k) => '<option value="' + k + '">' + tl(TYPES[k].n) + "</option>").join("") + "</select>" +
          sl("gdens", t("vDens"), 0.2, 150, 0.1, g.dens) + sl("gsp", t("vSp"), 0.25, 1.5, 0.05, g.sp == null ? 1 : g.sp) + sl("gsmin", t("vSmin"), 0.3, 3, 0.05, g.smin) + sl("gsmax", t("vSmax"), 0.3, 3, 0.05, g.smax) + sl("gslopeMin", t("vSlopeMin"), 0, 80, 1, g.slopeMin || 0, "°") + sl("gslope", t("vSlope"), 5, 90, 1, g.slope, "°") + sl("groad", t("vRoad"), 0, 30, 0.5, g.road, " m") +
          '<div class="pr-btns"><button data-e="gdel">' + t("vDelG") + "</button></div></div>";
      }
      h += '<p class="pr-dim">' + fmt(t("vCount"), { n: V.count() }) + "</p><p>" + t("hVeg") + "</p>";
    } else if (s.tool === "env") {
      const E = w.env;
      h = "<h3>" + t("tEnv") + "</h3>" + sl("etime", t("envTime"), 0, 24, 0.25, E.time, " h") + sl("efog", t("envFog"), 0, 100, 1, E.fog, " %") + sl("eview", t("envView"), 400, 3000, 50, E.view, " m") +
        sl("ewind", t("envWind"), 0, 100, 1, E.wind, " %") + sl("ewdir", t("envWindDir"), 0, 359, 1, E.windDir, "°") + '<p class="pr-dim">' + t("envNote") + "</p>";
    } else if (s.tool === "file") {
      h = "<h3>" + t("tFile") + '</h3><label class="pr-row"><span>' + t("fName") + '</span><input type="text" data-k="fname" value="' + esc(w.name) + '"></label>' +
        '<div class="pr-btns pr-col"><button data-e="export" class="pr-pri">' + t("fExport") + '</button><button data-e="import">' + t("fImport") + '</button><button data-e="std">' + t("fStd") + '</button><button data-e="blank">' + t("fNew") + "</button></div><p>" + t("fNote") + "</p>";
    }
    P.innerHTML = h;
    this.ring.visible = s.tool === "terrain" || s.tool === "paint" || s.tool === "veg";
    this.handles.visible = s.tool === "road";
    function fmtv(v, st) { return st < 1 ? (+v).toFixed(st < 0.1 ? 2 : 1) : v; }
  }
  status(msg) { const e = this.root.querySelector("#pr-st"); if (e) e.textContent = msg || ""; }
  click(e) {
    const tb = e.target.closest("[data-tool]"); if (tb) { this.setTool(tb.getAttribute("data-tool")); return; }
    const sg = e.target.closest("[data-seg]");
    if (sg) { const k = sg.getAttribute("data-seg"), v = sg.getAttribute("data-v"); this.s[k] = /^(layer|vg|rterr)$/.test(k) ? +v : v; if (k === "rmode") this.place = null; this.panel(); this.preview(); return; }
    const b = e.target.closest("[data-e]"); if (!b) return;
    const a = b.getAttribute("data-e"), w = this.world, R = this.rd(), p = this.pt();
    if (a === "undo") this.doUndo(); else if (a === "redo") this.doRedo();
    else if (a === "drive" || a === "race") { autosave(w, true); this.app.go("drive", { fromEditor: true, race: a === "race" }); }
    else if (a === "menu") { autosave(w, true); this.app.go("menu"); }
    else if (/^py[+-]\d$/.test(a) && p) { this.push(); p.y += +a.slice(2); this.roadEdit(true); }
    else if (a === "snap" && p) { this.push(); p.y = w.terrain.heightAt(p.x, p.z, true) + 0.15; this.roadEdit(true); }
    else if (a === "pdel" && p) this.delPoint();
    else if (a === "snapall" && R) { this.push(); R.pts.forEach((q) => { q.y = w.terrain.heightAt(q.x, q.z, true) + 0.15; }); this.roadEdit(true); }
    else if (a === "smoothh" && R) { this.push(); const n = R.pts.length, y = R.pts.map((q) => q.y); R.pts.forEach((q, i) => { const pa = R.closed ? y[(i - 1 + n) % n] : y[Math.max(0, i - 1)], pb = R.closed ? y[(i + 1) % n] : y[Math.min(n - 1, i + 1)]; q.y = (y[i] * 2 + pa + pb) / 4; }); this.roadEdit(true); }
    else if (a === "rdel" && R) { this.push(); w.removeRoad(R); if (!w.roads.length) w.addRoad(); this.selNone(); this.roadEdit(true); }
    else if (a === "gnew") { const G = w.veg.groups; G.push({ id: "g" + Date.now(), n: t("vNew") + " " + (G.length + 1), items: [{ t: "bush", p: 100 }], dens: 3, smin: 0.8, smax: 1.2, slope: 35, road: 2 }); this.s.vg = G.length - 1; this.panel(); autosave(w); }
    else if (a === "gdel") { const G = w.veg.groups; if (G.length > 1) { G.splice(this.s.vg, 1); this.s.vg = 0; this.panel(); autosave(w); } }
    else if (/^gix\d+$/.test(a)) { const g = w.veg.groups[this.s.vg]; g.items.splice(+a.slice(3), 1); this.panel(); autosave(w); }
    else if (a === "export") { const f = download(w, w.name); this.app.toast(fmt(t("fDone"), { f: f })); }
    else if (a === "import") this.root.querySelector("#pr-file").click();
    else if (a === "std" || a === "blank") { if (!confirmLite(t("fSure"))) return; this.push(); if (a === "std") w.standard(); else w.blank(); this.selNone(); this.rebuildHandles(); this.panel(); autosave(w); }
  }
  input(e) {
    const k = e.target.getAttribute("data-k"); if (!k) return;
    const w = this.world, R = this.rd(), p = this.pt(), v = e.target.type === "checkbox" ? e.target.checked : e.target.type === "range" ? +e.target.value : e.target.value, g = w.veg.groups[this.s.vg];
    const lab = this.root.querySelector("#pv-" + k); if (lab && e.target.type === "range") lab.textContent = (e.target.step < 1 ? (+v).toFixed(e.target.step < 0.1 ? 2 : 1) : v) + (e.target.getAttribute("data-u") || "");
    if (k in this.s) { this.s[k] = v; if (k === "rh") this.preview(); return; }
    if (k === "py" || k === "pw" || k === "pb") { if (!p) return; if (!this.sliding) { this.push(); this.sliding = true; } p[k === "py" ? "y" : k === "pw" ? "w" : "bank"] = v; this.roadEdit(false); return; }
    if (k === "fall") { if (!R) return; if (!this.sliding) { this.push(); this.sliding = true; } R.fall = v; return; }
    if (k === "gname" && g) { g.n = v; return; }
    if (/^gi\d+$/.test(k) && g) { g.items[+k.slice(2)].p = v; lab.textContent = v + " %"; return; }
    if (g && /^g(dens|sp|smin|smax|slope|slopeMin|road)$/.test(k)) { g[k.slice(1)] = v; return; }
    if (/^e(time|fog|view|wind|wdir)$/.test(k)) { const m = { etime: "time", efog: "fog", eview: "view", ewind: "wind", ewdir: "windDir" }; w.setEnv({ [m[k]]: v }); return; }
    if (k === "fname") { w.name = v; this.root.querySelector("#pr-ename").textContent = v; }
  }
  change(e) {
    const w = this.world, k = e.target.getAttribute("data-k");
    if (e.target.id === "pr-file" && e.target.files[0]) {
      const f = e.target.files[0]; e.target.value = "";
      f.text().then((txt) => { this.push(); if (loadText(w, txt)) { this.selNone(); this.rebuildHandles(); this.panel(); autosave(w); this.app.toast(fmt(t("fLoaded"), { n: w.name })); } else { this.undo.pop(); this.app.toast(t("fBad")); } });
      return;
    }
    if (k === "pcl" || k === "pcr" || k === "pt" || k === "pbr" || k === "pcp" || k === "closed") {
      const R = this.rd(), p = this.pt(); if (!R) return; this.push();
      if (k === "closed") R.closed = e.target.checked && R.pts.length >= 3; else if (k === "pt" && p) p.t = e.target.checked ? 1 : 0; else if (k === "pbr" && p) p.b = e.target.checked ? 1 : 0; else if (k === "pcp" && p) { p.cp = e.target.checked ? 1 : 0; if (p.cp) p.a = 0; } else if (p) p[k === "pcl" ? "cl" : "cr"] = e.target.checked;
      this.roadEdit(true); return;
    }
    if (k === "gadd" && e.target.value) { const g = w.veg.groups[this.s.vg]; g.items.push({ t: e.target.value, p: 50 }); this.panel(); autosave(w); return; }
    if (this.sliding) { this.sliding = false; if (k === "py" || k === "pw" || k === "pb" || k === "fall") this.roadEdit(true); }
    if (k === "fname" || /^g/.test(k || "") || /^e/.test(k || "")) autosave(w);
    this.saveUI();
  }
  setTool(tool) { this.s.tool = tool; this.panel(); this.saveUI(); }
  // ---------- Rückgängig ----------
  push() { this.undo.push(JSON.stringify(this.world.toJSON())); if (this.undo.length > 25) this.undo.shift(); this.redo = []; }
  doUndo() { if (!this.undo.length) return; this.redo.push(JSON.stringify(this.world.toJSON())); this.world.fromJSON(JSON.parse(this.undo.pop())); this.after(); }
  doRedo() { if (!this.redo.length) return; this.undo.push(JSON.stringify(this.world.toJSON())); this.world.fromJSON(JSON.parse(this.redo.pop())); this.after(); }
  after() { if (!this.rd()) this.selNone(); else if (this.sel >= this.rd().pts.length) this.sel = -1; this.rebuildHandles(); this.panel(); autosave(this.world); }
  // ---------- Straße ----------
  // Auswahl: Straße sr, Punkt sel. Im Platzier-Modus ist der gewählte Punkt der Anker, von dem aus gebaut wird.
  rd() { return this.world.roads[this.sr] || null; }
  pt() { const r = this.rd(); return r ? r.pts[this.sel] || null : null; }
  selNone() { this.sr = -1; this.sel = -1; this.place = null; }
  roadEdit(full) {
    const w = this.world;
    if (full) { this.prune(); w.roadChanged(); } else { const r = this.rd(); if (r) { r.sample(); r.markBridges(); r.buildMesh(); } }
    this.rebuildHandles(); if (full) { this.panel(); autosave(w); }
  }
  // Straßen mit weniger als 2 Punkten entfernen (außer der gerade begonnenen)
  prune() {
    const w = this.world, keep = this.rd();
    w.roads.slice().forEach((r) => { if (r.pts.length < 2 && r !== keep) w.removeRoad(r); });
    if (!w.roads.length) w.addRoad();
    this.sr = keep ? w.roads.indexOf(keep) : -1; if (this.sr < 0) this.sel = -1;
  }
  rebuildHandles() {
    const H = this.handles; while (H.children.length) { const c = H.children.pop(); if (c.isLine) c.geometry.dispose(); }
    const T = this.world.terrain; this.hm = []; this.cpm.build();
    this.world.roads.forEach((R, ri) => R.pts.forEach((p, i) => {
      const on = ri === this.sr && i === this.sel, end = !R.closed && (i === 0 || i === R.pts.length - 1);
      const m = new THREE.Mesh(this.hGeo, on ? this.hSel : p.cp ? this.hCp : p.b ? this.hBr : p.t === 0 ? this.hOff : this.hMat); m.position.set(p.x, p.y + 1.2, p.z); m.renderOrder = 11;
      m.userData.k = on ? 1.1 : end ? 1.15 : p.a ? 0.55 : 0.9; H.add(m); this.hm.push({ m: m, r: ri, i: i });
      const gy = T.heightAt(p.x, p.z, true), lg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(p.x, p.y, p.z), new THREE.Vector3(p.x, gy, p.z)]);
      const l = new THREE.Line(lg, this.lMat); l.renderOrder = 11; H.add(l);
    }));
  }
  delPoint() {
    const w = this.world, R = this.rd(); if (!R || !R.pts[this.sel]) return; this.push();
    R.pts.splice(this.sel, 1);
    if (R.pts.length < 2) { w.removeRoad(R); if (!w.roads.length) w.addRoad(); this.selNone(); } else { this.sel = Math.min(this.sel, R.pts.length - 1); if (R.pts.length < 3) R.closed = false; }
    this.roadEdit(true);
  }
  // Griff unter der Maus: Fangradius = Größe des Griffs auf dem Bildschirm + 10 px. Gewählter Punkt gewinnt bei Gleichstand.
  pickHandle(cx, cy) {
    const r = this.eng.renderer.domElement.getBoundingClientRect(), cam = this.eng.camera, v = new THREE.Vector3(), th = Math.tan(cam.fov * Math.PI / 360) * 2; let best = null, bd = 1e9;
    (this.hm || []).forEach((h) => {
      v.copy(h.m.position); const dist = v.distanceTo(cam.position); v.project(cam); if (v.z > 1) return;
      const sx = (v.x + 1) / 2 * r.width + r.left, sy = (1 - v.y) / 2 * r.height + r.top, d = Math.hypot(sx - cx, sy - cy);
      const rad = 1.4 * h.m.scale.x / (dist * th) * r.height, lim = Math.max(14, rad + 10), sc = d - (h.r === this.sr && h.i === this.sel ? 4 : 0);
      if (d < lim && sc < bd) { bd = sc; best = h; }
    });
    return best;
  }
  // ---------- Straße platzieren (Gerade / Kurve) ----------
  // Endpunkt unter der Maus. Liegt er auf einer anderen Straße (etwa gleiche Höhe), rastet er auf deren Mitte ein (Einmündung, j)
  endAt(g) {
    const w = this.world, E = { x: g.x, z: g.z, y: w.terrain.heightAt(g.x, g.z, true) + 0.15 + this.s.rh }, A = this.pt(), AR = this.rd();
    for (const r of w.roads) {
      if (r.S.length < 2) continue; const q = r.nearest(g.x, g.z); if (!q || Math.abs(q.d) > q.w / 2) continue;
      const sy = q.y - q.d * q.tan; if (Math.abs(sy - E.y) > (this.s.rh === 0 ? 4 : 2.5)) continue;   // deutlich höher/tiefer: Brücke darüber statt Einmündung
      if (r === AR && A) { const qa = r.nearest(A.x, A.z); if (qa) { let dd = Math.abs(qa.dist - q.dist); if (r.closed) dd = Math.min(dd, r.len - dd); if (dd < 25) continue; } }
      return { x: q.cx, z: q.cz, y: q.y, j: 1, road: r };
    }
    return E;
  }
  // Punkte für ein neues Stück von A bis E (Gerade oder Bogen über C), etwa alle 11 m ein Hilfspunkt
  plan(A, E, C) {
    const T = this.world.terrain, s = this.s;
    const pos = (f) => C ? { x: (1 - f) * (1 - f) * A.x + 2 * f * (1 - f) * C.x + f * f * E.x, z: (1 - f) * (1 - f) * A.z + 2 * f * (1 - f) * C.z + f * f * E.z } : { x: lerp(A.x, E.x, f), z: lerp(A.z, E.z, f) };
    let L = 0, q = pos(0); for (let k = 1; k <= 24; k++) { const r2 = pos(k / 24); L += Math.hypot(r2.x - q.x, r2.z - q.z); q = r2; }
    const base = (x, z) => T.heightAt(x, z, true);
    const follow = s.rh === 0 && !E.j && Math.abs(A.y - (base(A.x, A.z) + 0.15)) < 0.6;   // auf Bodenhöhe: dem Gelände entlang der Linie folgen (dichtere Punkte)
    const n = Math.max(1, Math.ceil(L / (follow ? 5 : 11)));
    const out = [];
    for (let k = 1; k <= n; k++) {
      const f = k / n, c = pos(f); let y;
      if (k === n) y = E.y;
      else if (follow) { const p0 = pos(Math.max(0, f - 1.5 / L)), p1 = pos(Math.min(1, f + 1.5 / L)); y = (base(c.x, c.z) * 2 + base(p0.x, p0.z) + base(p1.x, p1.z)) / 4 + 0.15; }
      else y = lerp(A.y, E.y, f);
      out.push({ x: k === n ? E.x : c.x, z: k === n ? E.z : c.z, y: y, w: A.w || 12, bank: 0, cl: false, cr: false, t: s.rterr, a: k < n ? 1 : 0, j: k === n && E.j ? 1 : 0 });
    }
    return out;
  }
  isEnd(R, i) { return !R.closed && (i === 0 || i === R.pts.length - 1); }
  closing(h) { const R = this.rd(), n = R ? R.pts.length : 0; return !!R && h.r === this.sr && h.i === 0 && !R.closed && n >= 3 && this.sel === n - 1; }
  commitPlace(E, close) {
    const w = this.world, s = this.s, C = s.rmode === "curve" && this.place ? this.place.ctrl : null, A = this.pt(); let R = this.rd();
    this.push(); this.place = null;
    if (!A) {   // neue Straße: Startpunkt (auf einer anderen Straße = Abzweigung)
      const nr = w.addRoad(); nr.pts.push({ x: E.x, z: E.z, y: E.y, w: 12, bank: 0, cl: false, cr: false, t: s.rterr, a: 0, j: E.j ? 1 : 0 });
      this.sr = w.roads.indexOf(nr); this.sel = 0; this.roadEdit(true); this.preview(); return;
    }
    const pts = this.plan(A, E, C);
    if (close) { pts.pop(); A.t = s.rterr; R.pts.splice(this.sel + 1, 0, ...pts); R.closed = true; this.selNone(); }
    else if (this.isEnd(R, this.sel)) {
      A.t = s.rterr;
      if (this.sel === 0 && R.pts.length > 1) { pts.forEach((q) => { q.t = s.rterr; }); R.pts.unshift(...pts.reverse()); this.sel = 0; }   // am Anfang weiterbauen
      else { R.pts.push(...pts); this.sel = R.pts.length - 1; }
    } else {   // von einem Punkt mitten in der Straße: Abzweigung als neue Straße
      const nr = w.addRoad(); nr.pts.push({ x: A.x, z: A.z, y: A.y, w: A.w, bank: 0, cl: false, cr: false, t: s.rterr, a: 0, j: 1 }, ...pts);
      R = nr; this.sr = w.roads.indexOf(nr); this.sel = nr.pts.length - 1;
    }
    if (E.j) this.selNone();   // auf einer Straße geendet: Einmündung, die Straße ist fertig
    this.roadEdit(true); this.preview();
  }
  // Vorschau: farbiges Band in Straßenbreite, Lote zum Boden, Endmarke, Hinweise in der Statuszeile
  preview() {
    const s = this.s, w = this.world, on = s.tool === "road" && s.rmode !== "edit" && this.btn < 0, g = on ? this.groundHit(this.cx || 0, this.cy || 0) : null;
    this.gm.visible = this.gl.visible = this.mk.visible = this.pv.visible = false;
    if (!g) return;
    const E = this.endAt(g), A = this.pt(), C = s.rmode === "curve" && this.place ? this.place.ctrl : null;
    this.mk.position.set(E.x, E.y + 0.6, E.z); this.mk.scale.setScalar(Math.max(0.8, this.cam.dist * 0.008)); this.mk.material.color.set(E.j ? 0xFFFFFF : 0xED6A5E); this.mk.visible = true;
    const hgt = (v) => (v > 0 ? "+" : "") + v.toFixed(1);
    if (!A) { this.status((E.j ? t("rsBranch") : t("rsStart")) + " · " + t("rTerr") + " " + t(s.rterr ? "rOn" : "rOff")); return; }
    const P = [A].concat(this.plan(A, E, C)), G = this.ghost;
    G.pts = P.map((q) => Object.assign({}, q)); G.closed = false; G.sample(); G.markBridges();
    const S = G.S, T = w.terrain, pos = [], col = [], lp = [], lc = []; let cross = false, mBr = 0, mDown = 0;
    const cst = S.map((q, i) => {
      const gy = T.heightAt(q.p.x, q.p.z), dy = q.p.y - gy;
      if (!q.br && q.d > 15 && q.d < G.len - 15) for (const r of w.roads) { if (r.S.length < 2) continue; const o = r.query(q.p.x, q.p.z); if (o && Math.abs(o.h - q.p.y) < 3) { cross = true; return GCc.x; } }
      if (q.br) { if (i) mBr += q.p.distanceTo(S[i - 1].p); return GCc.br; }
      if (dy < -0.6) { if (i) mDown += q.p.distanceTo(S[i - 1].p); return GCc.down; }
      return dy > 0.6 ? GCc.up : GCc.on;
    });
    for (let i = 0; i < S.length - 1; i++) {
      const a = S[i], b = S[i + 1], ca = cst[i], cb = cst[i + 1];
      [a.L, a.R, b.R, a.L, b.R, b.L].forEach((v, k) => { pos.push(v.x, v.y + 0.25, v.z); const c = k === 0 || k === 1 || k === 3 ? ca : cb; col.push(c.r, c.g, c.b); });
    }
    S.forEach((q, i) => { if (i % 3 && i !== S.length - 1) return; const gy = T.heightAt(q.p.x, q.p.z), c = cst[i]; [q.L, q.R].forEach((v) => { lp.push(v.x, v.y, v.z, v.x, gy, v.z); lc.push(c.r, c.g, c.b, c.r, c.g, c.b); }); });
    const set = (m, p2, c2) => { m.geometry.dispose(); const gg = new THREE.BufferGeometry(); gg.setAttribute("position", new THREE.Float32BufferAttribute(p2, 3)); gg.setAttribute("color", new THREE.Float32BufferAttribute(c2, 3)); m.geometry = gg; m.visible = p2.length > 0; };
    set(this.gm, pos, col); set(this.gl, lp, lc);
    if (C) { this.pv.geometry.dispose(); this.pv.geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(A.x, A.y + 0.6, A.z), new THREE.Vector3(C.x, T.heightAt(C.x, C.z) + 0.6, C.z), new THREE.Vector3(E.x, E.y + 0.6, E.z)]); this.pv.visible = true; }
    const eh = E.y - T.heightAt(E.x, E.z);
    let msg = Math.round(G.len) + " m · " + fmt(t("rsEnd"), { h: hgt(eh) }) + " · " + t("rTerr") + " " + t(s.rterr ? "rOn" : "rOff");
    if (s.rmode === "curve" && !C) msg = fmt(t("rStat"), { h: hgt(s.rh), t: t(s.rterr ? "rOn" : "rOff"), l: Math.round(G.len) });
    else if (C) msg = t("rCtrl") + " · " + msg;
    if (mBr > 0) msg += " · " + fmt(t("rBridge"), { n: Math.round(mBr) });
    if (mDown > 0) msg += " · " + Math.round(mDown) + " m " + t("lgDown");
    if (E.j) msg += " · " + t("rsJoin");
    if (cross) msg += " · " + t("rsCross");
    this.status(msg);
  }
  // ---------- Maus ----------
  rayAt(cx, cy) {
    const r = this.eng.renderer.domElement.getBoundingClientRect();
    this.mouse.set((cx - r.left) / r.width * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(this.mouse, this.eng.camera); return this.ray.ray;
  }
  groundHit(cx, cy) { const ry = this.rayAt(cx, cy); return this.world.terrain.raycast(ry.origin, ry.direction); }
  down(e) {
    this.btn = e.button; this.last = [e.clientX, e.clientY]; this.d0 = [e.clientX, e.clientY]; this.cx = e.clientX; this.cy = e.clientY;
    const ae = document.activeElement; if (ae && ae !== document.body && ae.blur) ae.blur();
    if (e.button !== 0) return;
    const s = this.s, w = this.world;
    if (s.tool === "road") {
      const h = this.pickHandle(e.clientX, e.clientY), place = s.rmode !== "edit";
      if (h) {
        const R = w.roads[h.r], P = R.pts[h.i];
        if (place && this.closing(h)) { this.commitPlace({ x: P.x, z: P.z, y: P.y }, true); return; }
        // Platzieren mit Anker: Klick auf einen Punkt einer Straße = dort enden (Einmündung)
        if (place && this.pt() && !(h.r === this.sr && h.i === this.sel)) { this.commitPlace({ x: P.x, z: P.z, y: P.y, j: 1 }, false); return; }
        this.sr = h.r; this.sel = h.i; this.place = null; this.push(); this.drag = { r: h.r, i: h.i, y0: e.clientY, py: P.y, moved: false }; this.rebuildHandles(); this.panel(); return;
      }
      const g = this.groundHit(e.clientX, e.clientY); if (!g) return;
      if (e.ctrlKey || e.metaKey) {   // Punkt in die nächste Straße einfügen (alle Modi)
        let best = null, bd = 1e9; w.roads.forEach((r, ri) => { if (r.S.length < 2) return; const q = r.nearest(g.x, g.z); if (q && Math.abs(q.d) < bd) { bd = Math.abs(q.d); best = { r: r, ri: ri, q: q }; } });
        if (!best) return; this.push();
        const r = best.r, src = r.pts[best.q.a.seg] || r.pts[0], np = { x: g.x, z: g.z, y: best.q.y, w: src.w, bank: 0, cl: false, cr: false, t: src.t === 0 ? 0 : 1, a: 0 };
        const at = best.q.a.seg + 1; r.pts.splice(at, 0, np); this.sr = best.ri; this.sel = at; this.roadEdit(true); return;
      }
      if (!place) { if (this.sr >= 0) { this.selNone(); this.roadEdit(true); } return; }
      if (s.rmode === "curve" && this.pt() && !this.place) { this.place = { ctrl: { x: g.x, z: g.z } }; this.preview(); return; }
      this.commitPlace(this.endAt(g), false); return;
    }
    if (s.tool === "terrain" || s.tool === "paint" || s.tool === "veg") {
      this.push(); this.painting = true; this.hit = this.groundHit(e.clientX, e.clientY);
      if (this.hit && s.tool === "terrain") this.flatY = w.terrain.heightAt(this.hit.x, this.hit.z, true);
    }
  }
  move(e) {
    this.cx = e.clientX; this.cy = e.clientY;
    if (this.btn === 2 || this.btn === 1) {
      const dx = e.clientX - this.last[0], dy = e.clientY - this.last[1]; this.last = [e.clientX, e.clientY]; const c = this.cam;
      if (this.btn === 1 || e.shiftKey) { const k = c.dist * 0.0016, co = Math.cos(c.yaw), si = Math.sin(c.yaw); c.x += (-co * dx - si * dy) * k; c.z += (si * dx - co * dy) * k; }
      else { c.yaw -= dx * 0.005; c.pitch = clamp(c.pitch + dy * 0.004, 0.08, 1.5); }
      return;
    }
    if (this.drag && this.btn === 0) {
      const p = this.world.roads[this.drag.r].pts[this.drag.i]; this.drag.moved = true;
      if (e.shiftKey) p.y = this.drag.py - (e.clientY - this.drag.y0) * 0.12 * Math.max(0.3, this.cam.dist / 300);
      else { const g = this.groundHit(e.clientX, e.clientY); if (g) { p.x = g.x; p.z = g.z; } }
      this.roadEdit(false); this.panelPoint(); return;
    }
    if (this.painting) this.hit = this.groundHit(e.clientX, e.clientY);
    if (this.s.tool === "road" && this.btn < 0) this.preview();
  }
  panelPoint() { const p = this.pt(), i = this.root.querySelector('[data-k="py"]'), v = this.root.querySelector("#pv-py"); if (p && i) { i.value = p.y; v.textContent = p.y.toFixed(1) + " m"; } }
  up(e) {
    if (this.drag) { if (this.drag.moved) this.roadEdit(true); else this.undo.pop(); this.drag = null; this.place = null; }
    // Rechtsklick ohne Ziehen beendet die Straße (wie Esc)
    if (this.btn === 2 && this.s.tool === "road" && this.d0 && Math.hypot(e.clientX - this.d0[0], e.clientY - this.d0[1]) < 5) this.endRoad();
    if (this.painting) { this.painting = false; const w = this.world; if (this.s.tool === "terrain") { w.veg.refresh(true); } autosave(w); }
    this.btn = -1; this.saveUI();
    if (this.s.tool === "road") this.preview();
  }
  endRoad() { if (this.place) { this.place = null; this.preview(); return; } if (this.sr < 0) return; this.selNone(); this.prune(); this.world.roadChanged(); this.rebuildHandles(); this.panel(); this.preview(); }
  wheel(e) { e.preventDefault(); this.cam.dist = clamp(this.cam.dist * Math.exp(e.deltaY * 0.0012), 8, 1600); }
  key(e) {
    if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return false;
    if ((e.ctrlKey || e.metaKey) && e.code === "KeyZ") { e.shiftKey ? this.doRedo() : this.doUndo(); return true; }
    if ((e.ctrlKey || e.metaKey) && e.code === "KeyY") { this.doRedo(); return true; }
    const n = parseInt(e.key, 10); if (n >= 1 && n <= TOOLS.length && !e.ctrlKey) { this.setTool(TOOLS[n - 1][0]); return true; }
    if ((e.code === "Delete" || e.code === "Backspace") && this.s.tool === "road") { this.delPoint(); return true; }
    if (this.s.tool === "road" && (e.code === "KeyC" || e.code === "KeyV") && !e.ctrlKey && !e.metaKey) {
      const st = (e.shiftKey ? 5 : 1) * (e.code === "KeyV" ? 1 : -1), p = this.pt();
      if (this.s.rmode === "edit") { if (p) { this.push(); p.y += st; this.roadEdit(true); this.status(t("height") + " " + p.y.toFixed(1) + " m"); } }
      else { this.s.rh = clamp(this.s.rh + st, -30, 80); const i = this.root.querySelector('[data-k="rh"]'), v = this.root.querySelector("#pv-rh"); if (i) { i.value = this.s.rh; v.textContent = this.s.rh.toFixed(1) + " m"; } this.preview(); this.saveUI(); }
      return true;
    }
    if (e.code === "KeyK" && this.s.tool === "road" && this.pt()) { this.push(); const p = this.pt(); p.cp = p.cp ? 0 : 1; if (p.cp) p.a = 0; this.roadEdit(true); return true; }
    if (e.code === "Escape" && this.place) { this.place = null; this.preview(); return true; }
    if (e.code === "Escape" && this.sr >= 0) { this.endRoad(); return true; }
    return false;
  }
  // ---------- jedes Bild ----------
  update(dt) {
    const s0 = this.s, c = this.cam, inp = this.app.input, sp = (inp.k("ShiftLeft", "ShiftRight") ? 3 : 1) * c.dist * 0.9 * dt;
    const ae = document.activeElement;
    if (!ae || !/INPUT|TEXTAREA|SELECT/.test(ae.tagName) || ae.type === "range" || ae.type === "checkbox") {
      const f = (inp.k("KeyW") ? 1 : 0) - (inp.k("KeyS") ? 1 : 0), s = (inp.k("KeyD") ? 1 : 0) - (inp.k("KeyA") ? 1 : 0);
      if (f || s) { const sx = Math.sin(c.yaw), sz = Math.cos(c.yaw); c.x += (-sx * f + sz * s) * sp; c.z += (-sz * f - sx * s) * sp; }
    }
    const lim = this.world.terrain.size / 2 + 20; c.x = clamp(c.x, -lim, lim); c.z = clamp(c.z, -lim, lim);
    const T = this.world.terrain; c.y = lerp(c.y, T.heightAt(c.x, c.z), 1 - Math.exp(-dt * 4));
    const cam = this.eng.camera, cp = Math.cos(c.pitch);
    cam.position.set(c.x + Math.sin(c.yaw) * cp * c.dist, c.y + Math.sin(c.pitch) * c.dist, c.z + Math.cos(c.yaw) * cp * c.dist);
    const gy = T.heightAt(cam.position.x, cam.position.z) + 2; if (cam.position.y < gy) cam.position.y = gy;
    cam.lookAt(c.x, c.y, c.z); if (cam.fov !== 55) { cam.fov = 55; cam.updateProjectionMatrix(); }
    this.eng.focus(new THREE.Vector3(c.x, c.y, c.z));
    if (this.handles.visible && this.hm) for (const h of this.hm) { const m = h.m, k = clamp(m.position.distanceTo(cam.position) * 0.011, 0.5, 30) * m.userData.k; m.scale.setScalar(k); }
    if (!(s0.tool === "road" && s0.rmode !== "edit")) this.gm.visible = this.gl.visible = this.mk.visible = this.pv.visible = false;
    // Pinsel-Kreis
    const s = this.s, rad = s.tool === "terrain" ? s.tr : s.tool === "paint" ? s.pr : s.vr, h = this.btn < 0 || this.btn === 0 ? this.groundHit(this.cx || 0, this.cy || 0) : null;
    if (this.ring.visible && h) {
      const a = this.ring.geometry.attributes.position;
      for (let i = 0; i <= 64; i++) { const an = i / 64 * Math.PI * 2, x = h.x + Math.cos(an) * rad, z = h.z + Math.sin(an) * rad; a.setXYZ(i, x, T.heightAt(x, z) + 0.4, z); }
      a.needsUpdate = true; this.ring.geometry.computeBoundingSphere();
    }
    // Pinseln, solange die linke Maustaste gehalten wird
    if (this.painting && this.hit) {
      const w = this.world, hp = this.hit;
      if (s.tool === "terrain") {
        let mode = s.tmode; if (inp.k("ShiftLeft", "ShiftRight")) mode = mode === "raise" ? "lower" : mode === "lower" ? "raise" : mode;
        const box = mode === "erode" ? T.erode(hp.x, hp.z, s.tr, s.ts, Math.min(dt, 0.05), Math.random) : T.sculpt(mode, hp.x, hp.z, s.tr, s.ts, Math.min(dt, 0.05), this.flatY);
        if (box) w.terrainChanged(box);
      } else if (s.tool === "paint") { const box = T.paintAt(s.layer, hp.x, hp.z, s.pr, Math.min(s.psmin, s.psmax), Math.max(s.psmin, s.psmax)); T.rebuild(box[0], box[1], box[2], box[3]); }
      else if (s.tool === "veg") {
        const g = w.veg.groups[s.vg]; if (!g) return;
        if (s.vmode === "erase") w.veg.erase(hp.x, hp.z, s.vr, s.vonly ? g.items.map((it) => it.t) : null);
        else w.veg.paint(g, hp.x, hp.z, s.vr, Math.min(dt, 0.05), Math.random);
        this.status(fmt(t("vCount"), { n: w.veg.count() }));
      }
    }
  }
}
function confirmLite(msg) { try { return window.confirm(msg); } catch (e) { return true; } }
