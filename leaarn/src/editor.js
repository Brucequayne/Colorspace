// ===== editor.js · Map-Editor (aus dem Developer Tool von Poly Racer): Gelände, Malen, Straße, Vegetation, Häuser, Umgebung, Datei =====
// Kamera: rechte Maustaste drehen, mittlere Maustaste (oder Umschalt + rechte) verschieben, Mausrad zoomen, WASD bewegen.
import * as THREE from "three";
import { t, addTexts, L2, tl, clamp, lerp, el, esc, fmt, store, KEYS } from "le/core.js";
import { LAYERS } from "le/terrain.js";
import { TYPES } from "le/vegetation.js";
import { Road, TYPEN } from "le/road.js";
import { OBJEKTE, objName } from "le/objekte.js";
import { CheckpointMarkers } from "le/race.js";
import { download, loadText, autosave } from "le/sceneio.js";
import { HOUSES } from "le/haeuser.js";
import { HouseInst, MAT } from "le/houses.js";

addTexts({
  eTitle: L2("Map-Editor", "Map editor"), eDrive: L2("Auto-Test", "Car test"), ePlay: L2("Spielen", "Play"), eHouseEd: L2("Haus-Editor", "House editor"), eMenu: L2("Hauptmenü", "Main menu"),
  tTerrain: L2("Gelände", "Terrain"), tPaint: L2("Boden malen", "Paint ground"), tRoad: L2("Straße", "Road"), tVeg: L2("Vegetation", "Vegetation"), tHouse: L2("Häuser", "Houses"), tEnv: L2("Umgebung", "Environment"), tFile: L2("Datei", "File"),
  mRaise: L2("Anheben", "Raise"), mLower: L2("Absenken", "Lower"), mSmooth: L2("Glätten", "Smooth"), mFlatten: L2("Ebnen", "Flatten"), mNoise: L2("Aufrauen", "Roughen"), mErode: L2("Erosion", "Erosion"),
  hErode: L2("Erosion: Regen läuft an Hängen ab etwa 18° bergab, gräbt Rinnen und lagert das Material unten wieder ab. Flache Stellen bleiben unverändert. Länger halten = tiefere Rinnen, Stärke regelt das Tempo.", "Erosion: rain runs down slopes from about 18°, carves gullies and deposits the material further down. Flat ground stays as it is. Hold longer for deeper gullies, strength sets the speed."),
  radius: L2("Pinselgröße", "Brush size"), strength: L2("Stärke", "Strength"),
  hTerrain: L2("Linke Maus formt. Umschalt kehrt Anheben/Absenken um. Ebnen nimmt die Höhe beim Klick. Die Straße bleibt immer auf ihrer Höhe, das Gelände wird darunter weggedrückt.", "Left mouse shapes. Shift inverts raise/lower. Flatten takes the height at the click. The road always keeps its height, the terrain is pushed away below it."),
  hPaint: L2("Linke Maus malt die Bodenart. Steile Hänge werden automatisch zu Fels. Die Bodenart bestimmt später die Haftung neben der Strecke.", "Left mouse paints the ground type. Steep slopes turn to rock automatically. The ground type later sets the grip next to the track."),
  hRoad: L2("Straßentyp wählen, dann Gerade oder Kurve: Klick setzt den Anfang, jeder weitere Klick ein Stück (Kurve: erst Bogenpunkt, dann Ende). Esc oder Rechtsklick beendet die Straße. Verbinden: am Ende einer Straße anfangen oder aufhören (rastet ein; gleicher Typ wird zu einer Straße). Abzweigung: auf einer Straße anfangen oder aufhören. Kreuzung: einfach über eine Straße bauen. C/V: Höhe für Brücken. Auswählen: Straße anklicken, Entf löscht.", "Pick a road type, then straight or curve: click sets the start, every further click adds a piece (curve: bend point first, then end). Esc or right click ends the road. Connect: start or stop at the end of a road (snaps; same type becomes one road). Junction: start or stop on a road. Crossing: just build across a road. C/V: height for bridges. Select: click a road, Del deletes it."),
  hRoadOld: L2("Gerade/Kurve: Klick ins Freie beginnt eine neue Straße, jeder weitere Klick setzt ein Stück (bei Kurve erst Bogenpunkt, dann Ende). Esc oder Rechtsklick beendet die Straße – danach baust du wieder frei. Abzweigung: in einem Platzier-Modus auf einen Punkt einer Straße klicken (oder auf die Fahrbahn) und von dort bauen. Einmündung: auf einer anderen Straße oder ihrem Punkt enden. Brücke über eine Straße: mit V mindestens 3 m höher bauen, die Überführung entsteht automatisch. C/V Höhe (Umschalt = 5 m). Bearbeiten: Punkte ziehen, Umschalt+Ziehen = Höhe, Strg+Klick fügt ein, Entf löscht.", "Straight/curve: clicking empty ground starts a new road, every further click places a piece (for curves first the bend point, then the end). Esc or right click finishes the road – after that you build freely again. Branch: in a placement mode click a point of a road (or its surface) and build from there. Merge: end on another road or one of its points. Bridge over a road: build at least 3 m higher with V, the overpass is created automatically. C/V height (Shift = 5 m). Edit: drag points, Shift+drag = height, Ctrl+click inserts, Del deletes."),
  rEdit: L2("Auswählen", "Select"), rStraight: L2("Gerade", "Straight"), rCurve: L2("Kurve", "Curve"),
  rTyp: L2("Straßentyp", "Road type"), ty_zwei: L2("2-spurig", "Two-lane"), "ty_zwei-gw": L2("2-spurig + Gehweg", "Two-lane + sidewalk"), ty_ein: L2("Einbahnstraße", "One-way"), "ty_ein-gw": L2("Einbahnstraße + Gehweg", "One-way + sidewalk"), ty_rad: L2("Radweg", "Bike path"), ty_alt: L2("Alte Straße (frei eingestellt)", "Old road (custom)"),
  rSelRoad: L2("Gewählte Straße", "Selected road"), rSetTyp: L2("Gewählten Typ übernehmen", "Apply selected type"), rFlip: L2("Fahrtrichtung umdrehen", "Reverse direction"),
  rsCont: L2("Klick: diese Straße weiterbauen", "Click: continue this road"), rsMerge: L2("verbindet die beiden Straßen", "connects both roads"), rsEndAt: L2("endet am Straßenende", "ends at the road end"),
  rsSel: L2("Klick auf eine Straße wählt sie aus · Entf löscht sie", "Click a road to select it · Del deletes it"), rsX: L2("Kreuzung – die Höhe wird angeglichen", "Crossing – height will be matched"),
  rTerr: L2("Straßen-Terrain", "Road terrain"), rOn: L2("An", "On"), rOff: L2("Aus", "Off"),
  rTerrOn: L2("An: Die Straße formt das Gelände unter sich (aufschütten und abtragen).", "On: the road shapes the terrain below it (fill and cut)."),
  rTerrOff: L2("Aus: Die Straße liegt auf dem vorhandenen Gelände, nur Hervorstehendes wird abgetragen. Wo sie höher als 1,4 m über dem Boden liegt, entsteht automatisch eine Betonbrücke.", "Off: the road sits on the existing terrain, only what sticks out is cut away. Where it runs more than 1.4 m above the ground, a concrete bridge is built automatically."),
  rH: L2("Platzierhöhe über Gelände (C/V)", "Placement height above terrain (C/V)"), pTerr: L2("Gelände anpassen (ab diesem Punkt)", "Shape terrain (from this point)"),
  rStat: L2("Höhe {h} m · Straßen-Terrain {t} · Länge {l} m", "Height {h} m · road terrain {t} · length {l} m"), rCtrl: L2("Bogenpunkt gesetzt – jetzt das Ende klicken", "Bend point set – now click the end"),
  rBridge: L2("{n} m Brücke", "{n} m bridge"), rRoads: L2("{n} Straßen · {l} m", "{n} roads · {l} m"), rRoad: L2("Straße {i} von {n}", "Road {i} of {n}"),
  rHard: L2("Härte (Neigung, Höhe, Anschluss)", "Hardness (banking, height, joins)"),
  hHard: L2("100 % = Änderungen an Neigung und Höhe wirken nur auf den gewählten Punkt, neue Stücke schließen nur knickfrei an. Weniger = die Nachbarpunkte werden weich mitgenommen (bis ca. 120 m) und neue Stücke werden über einen längeren Bereich geglättet.", "100% = banking and height changes only affect the selected point, new pieces only join without a kink. Less = neighbouring points follow softly (up to about 120 m) and new pieces are smoothed over a longer stretch."),
  pCp: L2("Checkpoint (Taste K)", "Checkpoint (key K)"), pCpMain: L2("Checkpoints zählen nur auf der Hauptstrecke (erster Rundkurs).", "Checkpoints only count on the main road (first circuit)."),
  rDelRoad: L2("Diese Straße löschen", "Delete this road"), pBr: L2("Brücke erzwingen (ab diesem Punkt)", "Force bridge (from this point)"),
  rFree: L2("Keine Straße gewählt – der nächste Klick beginnt eine neue.", "No road selected – the next click starts a new one."),
  lgOn: L2("auf dem Gelände", "on the terrain"), lgUp: L2("aufgeschüttet / schwebt", "raised / floating"), lgDown: L2("im Boden (wird abgetragen)", "in the ground (gets cut)"), lgBr: L2("Brücke", "bridge"), lgX: L2("Kreuzung (Höhe wird angeglichen)", "crossing (height gets matched)"),
  rsStart: L2("Klick setzt den Startpunkt einer neuen Straße", "Click sets the start of a new road"), rsBranch: L2("Abzweigung von dieser Straße", "Branch from this road"), rsJoin: L2("mündet in die Straße", "joins the road"),
  rsEnd: L2("Ende {h} m über Gelände", "End {h} m above terrain"), rsCross: L2("Kreuzung – die Höhe wird angeglichen (für eine Brücke mit V höher bauen)", "Crossing – height will be matched (build higher with V for a bridge)"), vSp: L2("Abstand (klein = dichter)", "Spacing (small = denser)"),
  hVeg: L2("Linke Maus pinselt die gewählte Gruppe. Jede Pflanze wird nach den Wahrscheinlichkeiten gewählt. Abstand zur Straße und maximale Hangneigung gelten je Gruppe.", "Left mouse paints the selected group. Each plant is picked by the probabilities. Distance to the road and maximum slope apply per group."),
  hCam: L2("Kamera: rechte Maus oder Q/E halten drehen · mittlere Maus oder Umschalt+rechte verschieben · Rad zoomen · WASD bewegen · 1–6 Werkzeuge · Strg+Z/Y", "Camera: right mouse or hold Q/E rotate · middle mouse or Shift+right pan · wheel zoom · WASD move · 1–6 tools · Ctrl+Z/Y"),
  pPoint: L2("Punkt {i} von {n}", "Point {i} of {n}"), pNone: L2("Kein Punkt gewählt", "No point selected"), height: L2("Höhe", "Height"), width: L2("Breite", "Width"), bank: L2("Neigung (+ links höher)", "Banking (+ left higher)"),
  curbL: L2("Kerbs links", "Curbs left"), curbR: L2("Kerbs rechts", "Curbs right"),
  walkL: L2("Gehweg links", "Sidewalk left"), walkR: L2("Gehweg rechts", "Sidewalk right"), walkSt: L2("Gehweg-Stil", "Sidewalk style"),
  walkEU: L2("Europäisch (Backstein)", "European (brick)"), walkAM: L2("Amerikanisch (Betonplatten)", "American (concrete slabs)"),
  walkAll: L2("Gehweg-Einstellung auf alle Punkte übertragen", "Apply sidewalk settings to all points"), snap: L2("Auf Gelände setzen", "Snap to terrain"), del: L2("Punkt löschen", "Delete point"),
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
  fNote: L2("Die Map wird automatisch im Browser gespeichert. Für das Spiel: exportieren und mir die .txt schicken.", "The map is saved automatically in the browser. For the game: export and send me the .txt."),
  hsFix: L2("Fertige Häuser", "Finished houses"), hsLocal: L2("Aus dem Haus-Editor (lokal)", "From the house editor (local)"), hsNoLocal: L2("Noch keine – im Haus-Editor bauen.", "None yet – build some in the house editor."),
  tObj: L2("Objekte", "Objects"), oAssets: L2("Assets", "Assets"), oRot: L2("Drehung (R)", "Rotation (R)"), oAuto: L2("Zur Straße ausrichten", "Face the road"),
  oCount: L2("{n} Objekte auf der Map", "{n} objects on the map"), oSel: L2("Gewähltes Objekt", "Selected object"), oDel: L2("Objekt löschen", "Delete object"),
  oHelp: L2("Klick ins Freie setzt das gewählte Asset (auf Straße und Gehweg in deren Höhe). Klick auf ein Objekt wählt es, Ziehen verschiebt es. R dreht um 15° (Umschalt: 90°), Entf löscht, Esc hebt die Auswahl auf. Laternen drehen ihren Ausleger automatisch zur nächsten Straße.", "Click on free ground places the selected asset (on roads and sidewalks at their height). Click an object to select it, drag to move it. R rotates by 15° (Shift: 90°), Del deletes, Esc deselects. Lamps turn their arm towards the nearest road automatically."),
  hsList: L2("Platzierte Häuser", "Placed houses"), hsMove: L2("Verschieben (M)", "Move (M)"), hsMoving: L2("Haus hängt an der Maus: Klick setzt es ab, Esc bricht ab.", "House follows the mouse: click to drop it, Esc cancels."),
  hsGo: L2("Kamera hin", "Go to"), hsHomeTag: L2("Zuhause", "Home"),
  hsSel: L2("Gewähltes Haus", "Selected house"), hsRot: L2("Drehung", "Rotation"), hsY: L2("Höhe", "Height"), hsHome: L2("Zuhause (Spielstart)", "Home (game start)"), hsDel: L2("Haus löschen", "Delete house"), hsNone: L2("Kein Haus gewählt", "No house selected"),
  hsHelp: L2("Klick ins Freie setzt das gewählte Haus (Gelände wird darunter geebnet, Pflanzen verschwinden). Klick auf ein Haus (oder in der Liste) wählt es, Ziehen oder M verschiebt es. R dreht um 15° (Umschalt: 90°), Entf löscht. Esc hebt die Auswahl auf.", "Click on free ground places the selected house (terrain is levelled, plants are removed). Click a house (or pick it in the list) to select it, drag or press M to move it. R rotates by 15° (Shift: 90°), Del deletes. Esc deselects."),
  hsCount: L2("{n} Häuser in der Map", "{n} houses in the map"),
  fSure: L2("Aktuelle Szene verwerfen? (Rückgängig geht)", "Discard the current scene? (Undo works)"), fDone: L2("Exportiert: {f}", "Exported: {f}"), fBad: L2("Datei konnte nicht gelesen werden.", "The file could not be read."), fLoaded: L2("Geladen: {n}", "Loaded: {n}")
});

// Vorschau-Farben (Palette): Stein = auf dem Gelände, Stahlblau = aufgeschüttet/schwebt, Koralle = im Boden, Petrol = Brücke, Gelb = kreuzt zu niedrig
const GC = { on: "#C6C5B9", up: "#4A6D7C", down: "#ED6A5E", br: "#62929E", x: "#F2C14E" };
const GCc = {}; Object.keys(GC).forEach((k) => { GCc[k] = new THREE.Color(GC[k]); });
const TOOLS = [["terrain", "tTerrain"], ["paint", "tPaint"], ["road", "tRoad"], ["veg", "tVeg"], ["house", "tHouse"], ["obj", "tObj"], ["env", "tEnv"], ["file", "tFile"]];

export class Editor {
  constructor(app) {
    this.app = app; this.world = app.world; this.eng = app.engine;
    const u = store.get(KEYS.ui, {});
    this.s = Object.assign({ tool: "terrain", tmode: "raise", tr: 22, ts: 0.5, layer: 0, pr: 12, psmin: 0, psmax: 90, vg: 0, vmode: "paint", vr: 18, vonly: false, rmode: "straight", rtyp: "zwei-gw", ok: "laterne", oa: 0, oauto: true, rterr: 1, rh: 0, rhard: 60, hk: "starter", ha: 0 }, u.ed || {});
    this.hsel = null; this.hghost = null; this.hgk = "";
    this.cam = Object.assign({ x: 0, y: 0, z: 0, dist: 420, yaw: 0.6, pitch: 0.85 }, u.cam || {});
    this.sel = -1; this.sr = -1; this.undo = []; this.redo = []; this.mouse = new THREE.Vector2(); this.hit = null; this.btn = -1; this.drag = null;
    this.ray = new THREE.Raycaster();
    // Pinsel-Kreis
    const lg = new THREE.BufferGeometry(); lg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(65 * 3), 3));
    this.ring = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: 0xFFE08A, depthTest: false, transparent: true })); this.ring.renderOrder = 10; this.eng.scene.add(this.ring);
    this.handles = new THREE.Group(); this.eng.scene.add(this.handles);
    this.world.veg.limit = false;   // im Map-Editor alles Gras zeigen (Gras-Sichtweite gilt nur im Spiel)
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
    this.setGhost(null);
    this.world.veg.limit = true; if (this.selM) { this.eng.scene.remove(this.selM); this.selM.geometry.dispose(); }
    this.eng.scene.remove(this.ring); this.eng.scene.remove(this.handles); this.eng.scene.remove(this.pv); this.eng.scene.remove(this.gm); this.eng.scene.remove(this.gl); this.eng.scene.remove(this.mk); this.cpm.dispose(); this.root.remove(); this.saveUI();
  }
  saveUI() { const u = store.get(KEYS.ui, {}); u.ed = this.s; u.cam = this.cam; store.set(KEYS.ui, u); }
  // ---------- Oberfläche ----------
  buildUI() {
    const r = this.root = el("div", "le-ed");
    r.innerHTML = '<div class="le-top"><b>' + t("eTitle") + '</b><span class="le-name" id="le-ename"></span><span class="le-sp"></span>' +
      '<button data-e="undo" title="Strg+Z">↶</button><button data-e="redo" title="Strg+Y">↷</button><button data-e="play" class="le-pri">▶ ' + t("ePlay") + '</button><button data-e="drive">' + t("eDrive") + '</button><button data-e="house">' + t("eHouseEd") + '</button><button data-e="menu">' + t("eMenu") + "</button></div>" +
      '<div class="le-tools">' + TOOLS.map((x, i) => '<button data-tool="' + x[0] + '"><i>' + (i + 1) + "</i>" + t(x[1]) + "</button>").join("") + "</div>" +
      '<div class="le-panel" id="le-panel"></div><div class="le-status"><span id="le-st"></span><span>' + t("hCam") + "</span></div>" +
      '<input type="file" id="le-file" accept=".txt,.json,text/plain" hidden>';
    this.app.ui.appendChild(r);
    r.addEventListener("click", (e) => this.click(e)); r.addEventListener("input", (e) => this.input(e)); r.addEventListener("change", (e) => this.change(e));
    this.panel();
  }
  panel() { if (this.selM) this.selShow();
    const s = this.s, w = this.world, P = this.root.querySelector("#le-panel");
    this.root.querySelectorAll("[data-tool]").forEach((b) => b.setAttribute("aria-pressed", String(b.getAttribute("data-tool") === s.tool)));
    this.root.querySelector("#le-ename").textContent = w.name;
    const sl = (k, lab, min, max, step, v, unit) => '<label class="le-row"><span>' + lab + ' <em id="pv-' + k + '">' + fmtv(v, step) + (unit || "") + '</em></span><input type="range" data-k="' + k + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + v + '" data-u="' + (unit || "") + '"></label>';
    const seg = (k, opts, cur) => '<div class="le-seg">' + opts.map((o) => '<button data-seg="' + k + '" data-v="' + o[0] + '" aria-pressed="' + (String(cur) === String(o[0])) + '">' + o[1] + "</button>").join("") + "</div>";
    const chk = (k, lab, v) => '<label class="le-chk"><input type="checkbox" data-k="' + k + '"' + (v ? " checked" : "") + "> " + lab + "</label>";
    let h = "";
    if (s.tool === "terrain") h = "<h3>" + t("tTerrain") + "</h3>" + seg("tmode", [["raise", t("mRaise")], ["lower", t("mLower")], ["smooth", t("mSmooth")], ["flatten", t("mFlatten")], ["noise", t("mNoise")], ["erode", t("mErode")]], s.tmode) +
      sl("tr", t("radius"), 3, 120, 1, s.tr, " m") + sl("ts", t("strength"), 0.05, 1, 0.05, s.ts) + (s.tmode === "erode" ? "<p>" + t("hErode") + "</p>" : "") + "<p>" + t("hTerrain") + "</p>";
    else if (s.tool === "paint") h = "<h3>" + t("tPaint") + '</h3><div class="le-layers">' + LAYERS.map((L, i) => '<button data-seg="layer" data-v="' + i + '" aria-pressed="' + (s.layer === i) + '"><i style="background:' + L.c + '"></i>' + tl(L.n) + "</button>").join("") + "</div>" +
      sl("pr", t("radius"), 2, 80, 1, s.pr, " m") + sl("psmin", t("slMin"), 0, 90, 1, s.psmin, "°") + sl("psmax", t("slMax"), 0, 90, 1, s.psmax, "°") + "<p>" + t("hPaint") + " " + t("hSlope") + "</p>";
    else if (s.tool === "road") {
      // Straßenwerkzeug (seit v0.19): fertige Straßentypen, keine Ankerpunkte mehr
      const R = this.rd(), RS = w.roads.filter((r) => r.pts.length > 1);
      let bl = 0, tl2 = 0; RS.forEach((r) => { tl2 += r.len; for (let i = 0; i < r.segCount(); i++) { const a = r.S[i], b = r.S[(i + 1) % r.S.length]; if (a.br && b.br) bl += a.p.distanceTo(b.p); } });
      const lg = (c, k) => '<span class="le-lg"><i style="background:' + c + '"></i>' + t(k) + "</span>";
      h = "<h3>" + t("tRoad") + '</h3><p class="le-dim">' + fmt(t("rRoads"), { n: RS.length, l: Math.round(tl2) }) + (bl > 0 ? " · " + fmt(t("rBridge"), { n: Math.round(bl) }) : "") + "</p>" +
        '<div class="le-row"><span>' + t("rTyp") + '</span></div><div class="le-groups le-rtyp">' + Object.keys(TYPEN).map((k) => '<button data-seg="rtyp" data-v="' + k + '" aria-pressed="' + (s.rtyp === k) + '">' + t("ty_" + k) + "</button>").join("") + "</div>" +
        seg("rmode", [["edit", t("rEdit")], ["straight", t("rStraight")], ["curve", t("rCurve")]], s.rmode) +
        sl("rh", t("rH"), -30, 80, 0.5, s.rh, " m") +
        '<div class="le-row"><span>' + t("rTerr") + "</span></div>" + seg("rterr", [[1, t("rOn")], [0, t("rOff")]], s.rterr) +
        '<div class="le-legend">' + lg(GC.on, "lgOn") + lg(GC.up, "lgUp") + lg(GC.down, "lgDown") + lg(GC.br, "lgBr") + lg(GC.x, "lgX") + "</div>";
      if (R && R.pts.length > 1 && !this.pt()) {
        h += '<div class="le-box"><b>' + t("rSelRoad") + '</b> <span class="le-dim">' + t("ty_" + (R.typ || "alt")) + " · " + Math.round(R.len) + " m</span>" +
          '<div class="le-btns">' + (R.typ !== s.rtyp ? '<button data-e="rtypset">' + t("rSetTyp") + "</button>" : "") + (R.typ && TYPEN[R.typ].one ? '<button data-e="rflip">' + t("rFlip") + "</button>" : "") + '<button data-e="rdel">' + t("rDelRoad") + "</button></div></div>";
      }
      h += "<p>" + t("hRoad") + "</p>";
    } else if (s.tool === "obj") {
      const O = this.osel;
      h = "<h3>" + t("tObj") + '</h3><p class="le-dim">' + fmt(t("oCount"), { n: w.objs.list.length }) + "</p><h4>" + t("oAssets") + '</h4><div class="le-groups">' +
        Object.keys(OBJEKTE).map((k) => '<button data-seg="ok" data-v="' + k + '" aria-pressed="' + (s.ok === k) + '">' + esc(objName(k)) + "</button>").join("") + "</div>" +
        chk("oauto", t("oAuto"), s.oauto) + sl("oa", t("oRot"), 0, 345, 15, s.oa, "°");
      if (O) h += '<div class="le-box"><b>' + t("oSel") + '</b> <span class="le-dim">' + esc(objName(O.e.k)) + '</span><div class="le-btns"><button data-e="odel">' + t("oDel") + "</button></div></div>";
      h += "<p>" + t("oHelp") + "</p>";
    } else if (s.tool === "veg") {
      const V = w.veg, G = V.groups, g = G[clamp(s.vg, 0, G.length - 1)];
      h = "<h3>" + t("tVeg") + "</h3>" + seg("vmode", [["paint", t("vPaint")], ["erase", t("vErase")]], s.vmode) + sl("vr", t("radius"), 2, 80, 1, s.vr, " m") + chk("vonly", t("vOnly"), s.vonly) +
        '<h4>' + t("vGroups") + '</h4><div class="le-groups">' + G.map((x, i) => '<button data-seg="vg" data-v="' + i + '" aria-pressed="' + (i === s.vg) + '">' + esc(x.n) + "</button>").join("") + '<button data-e="gnew">+ ' + t("vNew") + "</button></div>";
      if (g) {
        h += '<div class="le-box"><label class="le-row"><span>' + t("vName") + '</span><input type="text" data-k="gname" value="' + esc(g.n) + '"></label>' +
          g.items.map((it, i) => '<div class="le-item"><span>' + (TYPES[it.t] ? tl(TYPES[it.t].n) : it.t) + ' <em id="pv-gi' + i + '">' + it.p + ' %</em></span><input type="range" data-k="gi' + i + '" min="0" max="100" step="1" value="' + it.p + '"><button data-e="gix' + i + '" title="×">×</button></div>').join("") +
          '<select data-k="gadd"><option value="">' + t("vAdd") + "</option>" + Object.keys(TYPES).filter((k) => !g.items.some((it) => it.t === k)).map((k) => '<option value="' + k + '">' + tl(TYPES[k].n) + "</option>").join("") + "</select>" +
          sl("gdens", t("vDens"), 0.2, 150, 0.1, g.dens) + sl("gsp", t("vSp"), 0.25, 1.5, 0.05, g.sp == null ? 1 : g.sp) + sl("gsmin", t("vSmin"), 0.3, 3, 0.05, g.smin) + sl("gsmax", t("vSmax"), 0.3, 3, 0.05, g.smax) + sl("gslopeMin", t("vSlopeMin"), 0, 80, 1, g.slopeMin || 0, "°") + sl("gslope", t("vSlope"), 5, 90, 1, g.slope, "°") + sl("groad", t("vRoad"), 0, 30, 0.5, g.road, " m") +
          '<div class="le-btns"><button data-e="gdel">' + t("vDelG") + "</button></div></div>";
      }
      h += '<p class="le-dim">' + fmt(t("vCount"), { n: V.count() }) + "</p><p>" + t("hVeg") + "</p>";
    } else if (s.tool === "house") {
      const loc = store.get(KEYS.houses, []), hb = (k, n) => '<button data-hk="' + esc(k) + '" aria-pressed="' + (s.hk === k) + '">' + esc(n) + "</button>";
      h = "<h3>" + t("tHouse") + '</h3><p class="le-dim">' + fmt(t("hsCount"), { n: w.houses.length }) + "</p><h4>" + t("hsFix") + '</h4><div class="le-groups">' + Object.keys(HOUSES).map((k) => hb(k, tl(HOUSES[k].n))).join("") + "</div>" +
        "<h4>" + t("hsLocal") + "</h4>" + (Array.isArray(loc) && loc.length ? '<div class="le-groups">' + loc.map((d, i) => hb("lokal:" + i, d.name || "?")).join("") + "</div>" : '<p class="le-dim">' + t("hsNoLocal") + "</p>") +
        sl("ha", t("hsRot"), 0, 345, 15, s.ha, "°");
      const H = this.hsel;
      // Liste der platzierten Häuser (seit v0.18): Klick wählt das Haus und fährt die Kamera hin
      h += "<h4>" + t("hsList") + " (" + w.houses.length + ')</h4><div class="le-groups">' + w.houses.map((x, i) => '<button data-hs="' + i + '" aria-pressed="' + (x === H) + '">' + esc(x.def.name || x.e.k) + (x.e.home ? " · " + t("hsHomeTag") : "") + "</button>").join("") + "</div>";
      if (H) h += '<div class="le-box"><b>' + t("hsSel") + '</b> <span class="le-dim">' + esc(H.def.name || H.e.k) + "</span>" + sl("hrot", t("hsRot"), 0, 359, 1, Math.round(H.e.a || 0), "°") + sl("hy", t("hsY"), -50, 150, 0.05, H.e.y, " m") +
        chk("hhome", t("hsHome"), !!H.e.home) + (this.hmove ? '<p class="le-good">' + t("hsMoving") + "</p>" : "") + '<div class="le-btns"><button data-e="hmove"' + (this.hmove ? ' aria-pressed="true"' : "") + ">" + t("hsMove") + '</button><button data-e="hgo">' + t("hsGo") + '</button><button data-e="hdel">' + t("hsDel") + "</button></div></div>";
      else h += '<p class="le-dim">' + t("hsNone") + "</p>";
      h += "<p>" + t("hsHelp") + "</p>";
    } else if (s.tool === "env") {
      const E = w.env;
      h = "<h3>" + t("tEnv") + "</h3>" + sl("etime", t("envTime"), 0, 24, 0.25, E.time, " h") + sl("efog", t("envFog"), 0, 100, 1, E.fog, " %") + sl("eview", t("envView"), 400, 3000, 50, E.view, " m") +
        sl("ewind", t("envWind"), 0, 100, 1, E.wind, " %") + sl("ewdir", t("envWindDir"), 0, 359, 1, E.windDir, "°") + '<p class="le-dim">' + t("envNote") + "</p>";
    } else if (s.tool === "file") {
      h = "<h3>" + t("tFile") + '</h3><label class="le-row"><span>' + t("fName") + '</span><input type="text" data-k="fname" value="' + esc(w.name) + '"></label>' +
        '<div class="le-btns le-col"><button data-e="export" class="le-pri">' + t("fExport") + '</button><button data-e="import">' + t("fImport") + '</button><button data-e="std">' + t("fStd") + '</button><button data-e="blank">' + t("fNew") + "</button></div><p>" + t("fNote") + "</p>";
    }
    P.innerHTML = h;
    this.ring.visible = s.tool === "terrain" || s.tool === "paint" || s.tool === "veg";
    this.handles.visible = s.tool === "road";
    if (s.tool !== "house") this.setGhost(null);
    function fmtv(v, st) { return st < 1 ? (+v).toFixed(st < 0.1 ? 2 : 1) : v; }
  }
  status(msg) { const e = this.root.querySelector("#le-st"); if (e) e.textContent = msg || ""; }
  click(e) {
    const tb = e.target.closest("[data-tool]"); if (tb) { this.setTool(tb.getAttribute("data-tool")); return; }
    const hs = e.target.closest("[data-hs]"); if (hs) { const H = this.world.houses[+hs.getAttribute("data-hs")]; if (H) { if (this.hmove) this.moveCancel(); this.hsel = H; this.cam.x = H.e.x; this.cam.z = H.e.z; this.cam.dist = Math.min(this.cam.dist, 60); this.panel(); this.saveUI(); } return; }
    const hk = e.target.closest("[data-hk]"); if (hk) { this.s.hk = hk.getAttribute("data-hk"); this.hgk = ""; this.panel(); this.saveUI(); return; }
    const sg = e.target.closest("[data-seg]");
    if (sg) { const k = sg.getAttribute("data-seg"), v = sg.getAttribute("data-v"); this.s[k] = /^(layer|vg|rterr)$/.test(k) ? +v : v;
      if (k === "rmode") { this.place = null; this.sel = -1; this.rebuildHandles(); }
      if (k === "rtyp" && this.pt() && this.rd() && this.rd().typ !== v) { this.selNone(); this.rebuildHandles(); }   // anderer Typ: nächster Klick beginnt eine neue Straße
      this.panel(); this.preview(); this.saveUI(); return; }
    const b = e.target.closest("[data-e]"); if (!b) return;
    const a = b.getAttribute("data-e"), w = this.world, R = this.rd(), p = this.pt();
    if (a === "undo") this.doUndo(); else if (a === "redo") this.doRedo();
    else if (a === "drive") { autosave(w, true); this.app.go("drive", { fromEditor: true }); }
    else if (a === "play") { autosave(w, true); this.app.go("play", { fromEditor: true }); }
    else if (a === "house") { autosave(w, true); this.app.go("house"); }
    else if (a === "odel" && this.osel) { this.push(); w.objs.remove(this.osel); this.osel = null; this.panel(); autosave(w); }
    else if (a === "hmove" && this.hsel) { if (this.hmove) this.moveCancel(); else this.moveStart(); }
    else if (a === "hgo" && this.hsel) { this.cam.x = this.hsel.e.x; this.cam.z = this.hsel.e.z; this.cam.dist = Math.min(this.cam.dist, 60); this.saveUI(); }
    else if (a === "hdel" && this.hsel) { this.hmove = null; this.push(); w.removeHouse(this.hsel); this.hsel = null; w.housesChanged(); this.panel(); autosave(w); }
    else if (a === "menu") { autosave(w, true); this.app.go("menu"); }
    else if (/^py[+-]\d$/.test(a) && p) { this.push(); this.soft("y", +a.slice(2)); this.roadEdit(true); }
    else if (a === "snap" && p) { this.push(); p.y = w.terrain.heightAt(p.x, p.z, true) + 0.15; this.roadEdit(true); }
    else if (a === "pdel" && p) this.delPoint();
    else if ((a === "pgs0" || a === "pgs1") && p) { this.push(); p.gs = a === "pgs1" ? 1 : 0; this.roadEdit(true); this.panel(); }
    else if (a === "walkall" && R && p) { this.push(); R.pts.forEach((q) => { q.sl = !!p.sl; q.sr = !!p.sr; q.gs = p.gs ? 1 : 0; }); this.roadEdit(true); this.panel(); }
    else if (a === "snapall" && R) { this.push(); R.pts.forEach((q) => { q.y = w.terrain.heightAt(q.x, q.z, true) + 0.15; }); this.roadEdit(true); }
    else if (a === "smoothh" && R) { this.push(); const n = R.pts.length, y = R.pts.map((q) => q.y); R.pts.forEach((q, i) => { const pa = R.closed ? y[(i - 1 + n) % n] : y[Math.max(0, i - 1)], pb = R.closed ? y[(i + 1) % n] : y[Math.min(n - 1, i + 1)]; q.y = (y[i] * 2 + pa + pb) / 4; }); this.roadEdit(true); }
    else if (a === "rtypset" && R) { this.push(); R.typ = this.s.rtyp; R.pts.forEach((q) => { q.w = TYPEN[R.typ].w; q.cl = q.cr = false; q.a = 0; }); this.roadEdit(true); this.selShow(); }
    else if (a === "rflip" && R) { this.push(); R.pts.reverse(); this.roadEdit(true); this.selShow(); }
    else if (a === "rdel" && R) { this.push(); w.removeRoad(R); if (!w.roads.length) w.addRoad(); this.selNone(); this.roadEdit(true); }
    else if (a === "gnew") { const G = w.veg.groups; G.push({ id: "g" + Date.now(), n: t("vNew") + " " + (G.length + 1), items: [{ t: "bush", p: 100 }], dens: 3, smin: 0.8, smax: 1.2, slope: 35, road: 2 }); this.s.vg = G.length - 1; this.panel(); autosave(w); }
    else if (a === "gdel") { const G = w.veg.groups; if (G.length > 1) { G.splice(this.s.vg, 1); this.s.vg = 0; this.panel(); autosave(w); } }
    else if (/^gix\d+$/.test(a)) { const g = w.veg.groups[this.s.vg]; g.items.splice(+a.slice(3), 1); this.panel(); autosave(w); }
    else if (a === "export") { const f = download(w, w.name); this.app.toast(fmt(t("fDone"), { f: f })); }
    else if (a === "import") this.root.querySelector("#le-file").click();
    else if (a === "std" || a === "blank") { if (!confirmLite(t("fSure"))) return; this.push(); if (a === "std") w.standard(); else w.blank(); this.selNone(); this.rebuildHandles(); this.panel(); autosave(w); }
  }
  input(e) {
    const k = e.target.getAttribute("data-k"); if (!k) return;
    const w = this.world, R = this.rd(), p = this.pt(), v = e.target.type === "checkbox" ? e.target.checked : e.target.type === "range" ? +e.target.value : e.target.value, g = w.veg.groups[this.s.vg];
    const lab = this.root.querySelector("#pv-" + k); if (lab && e.target.type === "range") lab.textContent = (e.target.step < 1 ? (+v).toFixed(e.target.step < 0.1 ? 2 : 1) : v) + (e.target.getAttribute("data-u") || "");
    if (k in this.s) { this.s[k] = v; if (k === "rh") this.preview(); if (k === "ha") this.hgk = ""; return; }
    if ((k === "hrot" || k === "hy") && this.hsel) { if (!this.sliding) { this.push(); this.sliding = true; } if (k === "hrot") this.hsel.e.a = v; else this.hsel.e.y = v; this.hsel.place(); return; }
    if (k === "py" || k === "pw" || k === "pb") {
      if (!p) return; if (!this.sliding) { this.push(); this.sliding = true; }
      if (k === "pw") p.w = v; else { const key = k === "py" ? "y" : "bank"; this.soft(key, v - p[key]); }   // Höhe und Neigung mit Härte
      this.roadEdit(false); return;
    }
    if (k === "fall") { if (!R) return; if (!this.sliding) { this.push(); this.sliding = true; } R.fall = v; return; }
    if (k === "gname" && g) { g.n = v; return; }
    if (/^gi\d+$/.test(k) && g) { g.items[+k.slice(2)].p = v; lab.textContent = v + " %"; return; }
    if (g && /^g(dens|sp|smin|smax|slope|slopeMin|road)$/.test(k)) { g[k.slice(1)] = v; return; }
    if (/^e(time|fog|view|wind|wdir)$/.test(k)) { const m = { etime: "time", efog: "fog", eview: "view", ewind: "wind", ewdir: "windDir" }; w.setEnv({ [m[k]]: v }); return; }
    if (k === "fname") { w.name = v; this.root.querySelector("#le-ename").textContent = v; }
  }
  change(e) {
    const w = this.world, k = e.target.getAttribute("data-k");
    if (e.target.id === "le-file" && e.target.files[0]) {
      const f = e.target.files[0]; e.target.value = "";
      f.text().then((txt) => { this.push(); if (loadText(w, txt)) { this.selNone(); this.rebuildHandles(); this.panel(); autosave(w); this.app.toast(fmt(t("fLoaded"), { n: w.name })); } else { this.undo.pop(); this.app.toast(t("fBad")); } });
      return;
    }
    if (k === "psl" || k === "psr") { const R = this.rd(), p = this.pt(); if (!R || !p) return; this.push(); p[k === "psl" ? "sl" : "sr"] = e.target.checked; this.roadEdit(true); this.panel(); return; }
    if (k === "pcl" || k === "pcr" || k === "pt" || k === "pbr" || k === "pcp" || k === "closed") {
      const R = this.rd(), p = this.pt(); if (!R) return; this.push();
      if (k === "closed") R.closed = e.target.checked && R.pts.length >= 3; else if (k === "pt" && p) p.t = e.target.checked ? 1 : 0; else if (k === "pbr" && p) p.b = e.target.checked ? 1 : 0; else if (k === "pcp" && p) { p.cp = e.target.checked ? 1 : 0; if (p.cp) p.a = 0; } else if (p) p[k === "pcl" ? "cl" : "cr"] = e.target.checked;
      this.roadEdit(true); return;
    }
    if (k === "gadd" && e.target.value) { const g = w.veg.groups[this.s.vg]; g.items.push({ t: e.target.value, p: 50 }); this.panel(); autosave(w); return; }
    if (k === "hhome" && this.hsel) { this.push(); w.houses.forEach((h) => { delete h.e.home; }); if (e.target.checked) this.hsel.e.home = true; autosave(w); return; }
    if (this.sliding) { this.sliding = false; if (k === "py" || k === "pw" || k === "pb" || k === "fall") this.roadEdit(true); if (k === "hrot" || k === "hy") { w.housesChanged(); autosave(w); } }
    if (k === "fname" || /^g/.test(k || "") || /^e/.test(k || "")) autosave(w);
    this.saveUI();
  }
  setTool(tool) { this.s.tool = tool; this.panel(); this.saveUI(); }
  // ---------- Rückgängig ----------
  push() { this.undo.push(JSON.stringify(this.world.toJSON())); if (this.undo.length > 25) this.undo.shift(); this.redo = []; }
  doUndo() { if (!this.undo.length) return; this.redo.push(JSON.stringify(this.world.toJSON())); this.world.fromJSON(JSON.parse(this.undo.pop())); this.after(); }
  doRedo() { if (!this.redo.length) return; this.undo.push(JSON.stringify(this.world.toJSON())); this.world.fromJSON(JSON.parse(this.redo.pop())); this.after(); }
  after() { this.hsel = null; this.hdrag = null; this.hmove = null; this.osel = null; this.odrag = null; if (!this.rd()) this.selNone(); else if (this.sel >= this.rd().pts.length) this.sel = -1; this.rebuildHandles(); this.panel(); autosave(this.world); }
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
  // Griffe (seit v0.19): nur noch die offenen Enden der Straßen – dort weiterbauen oder andocken. Keine Zwischen-/Ankerpunkte mehr
  rebuildHandles() {
    const H = this.handles; while (H.children.length) { const c = H.children.pop(); if (c.isLine) c.geometry.dispose(); }
    const T = this.world.terrain; this.hm = []; this.cpm.build();
    this.world.roads.forEach((R, ri) => { if (R.closed || R.pts.length < 1) return; [0, R.pts.length - 1].forEach((i, k) => {
      if (k && R.pts.length < 2) return; const p = R.pts[i];
      const on = ri === this.sr && i === this.sel, m = new THREE.Mesh(this.hGeo, on ? this.hSel : this.hMat); m.position.set(p.x, p.y + 1.2, p.z); m.renderOrder = 11;
      m.userData.k = on ? 1.1 : 0.9; H.add(m); this.hm.push({ m: m, r: ri, i: i });
      const gy = T.heightAt(p.x, p.z, true), lg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(p.x, p.y, p.z), new THREE.Vector3(p.x, gy, p.z)]);
      const l = new THREE.Line(lg, this.lMat); l.renderOrder = 11; H.add(l);
    }); });
    this.selShow();
  }
  // gewählte Straße im Modus Auswählen hervorheben
  selShow() {
    if (!this.selM) { this.selM = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: 0xED6A5E, transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide })); this.selM.renderOrder = 10; this.eng.scene.add(this.selM); }
    const R = this.rd(), on = this.s.tool === "road" && this.s.rmode === "edit" && R && R.S.length > 1; this.selM.visible = !!on; if (!on) return;
    const P = [], S = R.S, n = R.segCount(); for (let i = 0; i < n; i++) { const a = S[i], b = S[(i + 1) % S.length]; [a.L, a.R, b.R, a.L, b.R, b.L].forEach((v) => P.push(v.x, v.y + 0.3, v.z)); }
    this.selM.geometry.dispose(); const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); this.selM.geometry = g;
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
  // Einrasten (seit v0.19): 1. offenes Ende einer Straße (Verbinden), 2. auf einer Straße (Einmündung/Abzweigung, j), 3. frei
  endAt(g) {
    const w = this.world, E = { x: g.x, z: g.z, y: w.terrain.heightAt(g.x, g.z, true) + 0.15 + this.s.rh }, A = this.pt(), AR = this.rd();
    let best = null, bd = 1e9; const rad = Math.max(4, this.cam.dist * 0.02);
    w.roads.forEach((r, ri) => { if (r.closed || r.pts.length < 2) return; [0, r.pts.length - 1].forEach((i) => {
      if (r === AR && i === this.sel) return; const p = r.pts[i], d = Math.hypot(p.x - g.x, p.z - g.z); if (d < rad && d < bd) { bd = d; best = { x: p.x, z: p.z, y: p.y, j: 1, end: { r: r, ri: ri, i: i } }; }
    }); });
    if (best) return best;
    for (const r of w.roads) {
      if (r.S.length < 2) continue; const q = r.nearest(g.x, g.z); if (!q || Math.abs(q.d) > q.w / 2 + q.walk + 0.5) continue;
      const sy = q.y; if (Math.abs(sy - E.y) > (this.s.rh === 0 ? 4 : 2.5)) continue;   // deutlich höher/tiefer: Brücke darüber statt Einmündung
      if (r === AR && A) { const qa = r.nearest(A.x, A.z); if (qa) { let dd = Math.abs(qa.dist - q.dist); if (r.closed) dd = Math.min(dd, r.len - dd); if (dd < 25) continue; } }
      return { x: q.cx, z: q.cz, y: q.y, j: 1, road: r };
    }
    return E;
  }
  // Punkte für ein neues Stück von A bis E (Gerade oder Bogen über C), etwa alle 11 m ein Hilfspunkt
  // Weg entlang der Straße (waagrecht) bis zu jedem Punkt
  cum(R) { const s = [0]; for (let i = 1; i < R.pts.length; i++) s.push(s[i - 1] + Math.hypot(R.pts[i].x - R.pts[i - 1].x, R.pts[i].z - R.pts[i - 1].z)); const n = R.pts.length; const tot = s[n - 1] + (R.closed && n > 1 ? Math.hypot(R.pts[0].x - R.pts[n - 1].x, R.pts[0].z - R.pts[n - 1].z) : 0); return { s: s, tot: tot }; }
  // Änderung am gewählten Punkt mit Härte: 100 % = nur dieser Punkt, weniger = Nachbarn weich mit (Kosinus-Abfall bis 120 m)
  soft(key, delta) {
    const R = this.rd(), i = this.sel; if (!R || !R.pts[i] || !delta) return;
    const rad = (1 - this.s.rhard / 100) * 120, c = this.cum(R);
    R.pts.forEach((p, j) => {
      let d = Math.abs(c.s[j] - c.s[i]); if (R.closed) d = Math.min(d, c.tot - d);
      const w = j === i ? 1 : rad <= 0 || d >= rad ? 0 : 0.5 + 0.5 * Math.cos(Math.PI * d / rad);
      if (w > 0) { p[key] += delta * w; if (key === "bank") p.bank = clamp(p.bank, -30, 30); }
    });
  }
  // Neues Stück mit weichem Höhenverlauf: erst knickfrei (Hermite, Steigung des vorigen Stücks), dann über einen
  // Bereich vor und hinter dem Anschluss geglättet (Breite nach Härte). Gibt { pts, prev: [[index, y]], ay } zurück.
  placePlan(A, E, C) {
    const R = this.rd(), pts = this.plan(A, E, C), out = { pts: pts, prev: [], ay: A.y };
    if (!R) return out;
    const back = [], i = this.sel, rev = this.isEnd(R, i) && i === 0 && R.pts.length > 1, along = this.isEnd(R, i);
    if (along) for (let k = 1; k < R.pts.length && k < 40; k++) { const j = rev ? k : i - k; if (j < 0 || j >= R.pts.length) break; back.push(j); }
    const rad = 10 + (1 - this.s.rhard / 100) * 60, sig = rad / 2.5;
    const follow = this.s.rh === 0 && !E.j;   // Ende auf Bodenhöhe darf mitgeglättet werden, eine gewählte Höhe bleibt fest
    // Kette: ältere Punkte … A, neue Punkte; Lage s entlang der Kette (A = 0)
    const ch = [], P = R.pts;
    let sAcc = 0, prv = A;
    for (const j of back) { sAcc -= Math.hypot(P[j].x - prv.x, P[j].z - prv.z); prv = P[j]; if (-sAcc > rad * 1.6) break; ch.unshift({ y: P[j].y, s: sAcc, j: j, fix: !!P[j].j || -sAcc >= rad, b: Math.max(0, 1 + sAcc / rad) }); }
    ch.push({ y: A.y, s: 0, a: true, fix: !!A.j || !along, b: 1 });
    sAcc = 0; prv = A; pts.forEach((q, k) => { sAcc += Math.hypot(q.x - prv.x, q.z - prv.z); prv = q; ch.push({ y: q.y, s: sAcc, q: q, fix: k === pts.length - 1 && (!!E.j || !follow), b: 1 }); });
    const endFix = ch[ch.length - 1].fix, sEnd = sAcc;
    if (endFix) ch.forEach((e) => { if (e.q) e.b = clamp((sEnd - e.s) / (rad * 0.8), 0, 1); });   // vor einem festen Ende sanft in den knickfreien Verlauf zurück
    for (let it = 0; it < 2; it++) {
      const ny = ch.map((e) => { if (e.fix) return e.y; let sw = 0, sy = 0; for (const f of ch) { const d = f.s - e.s; if (Math.abs(d) > sig * 2.5) continue; const g = Math.exp(-d * d / (2 * sig * sig)); sw += g; sy += g * f.y; } return sy / sw; });
      ch.forEach((e, k) => { e.y = lerp(e.y, ny[k], e.b); });
    }
    ch.forEach((e) => { if (e.q) e.q.y = e.y; else if (e.a) out.ay = e.y; else out.prev.push([e.j, e.y]); });
    return out;
  }
  plan(A, E, C) {
    const T = this.world.terrain, s = this.s;
    const pos = (f) => C ? { x: (1 - f) * (1 - f) * A.x + 2 * f * (1 - f) * C.x + f * f * E.x, z: (1 - f) * (1 - f) * A.z + 2 * f * (1 - f) * C.z + f * f * E.z } : { x: lerp(A.x, E.x, f), z: lerp(A.z, E.z, f) };
    let L = 0, q = pos(0); for (let k = 1; k <= 24; k++) { const r2 = pos(k / 24); L += Math.hypot(r2.x - q.x, r2.z - q.z); q = r2; }
    const base = (x, z) => T.heightAt(x, z, true);
    const follow = s.rh === 0 && !E.j && Math.abs(A.y - (base(A.x, A.z) + 0.15)) < 0.6;   // auf Bodenhöhe: dem Gelände entlang der Linie folgen (dichtere Punkte)
    const n = Math.max(1, Math.ceil(L / (follow ? 5 : 11)));
    // Steigung am Anschluss = Steigung des vorigen Stücks (wenn am Ende weitergebaut wird), am Ende = mittlere Steigung
    const R = this.rd(), m1 = (E.y - A.y) / Math.max(1, L); let m0 = m1;
    if (R && this.isEnd(R, this.sel) && R.pts.length > 1 && R.pts[this.sel] === A) { const P0 = R.pts[this.sel === 0 ? 1 : this.sel - 1], dd = Math.hypot(A.x - P0.x, A.z - P0.z); if (dd > 0.5) m0 = clamp((A.y - P0.y) / dd, -0.35, 0.35); }
    const out = [];
    for (let k = 1; k <= n; k++) {
      const f = k / n, c = pos(f); let y;
      if (k === n) y = E.y;
      else if (follow) y = base(c.x, c.z) + 0.15;   // Gelände; geglättet wird danach in placePlan
      else { const h00 = 2 * f * f * f - 3 * f * f + 1, h10 = f * f * f - 2 * f * f + f, h01 = -2 * f * f * f + 3 * f * f, h11 = f * f * f - f * f; y = h00 * A.y + h10 * L * m0 + h01 * E.y + h11 * L * m1; }   // knickfrei
      out.push({ x: k === n ? E.x : c.x, z: k === n ? E.z : c.z, y: y, w: (TYPEN[this.curTyp()] || {}).w || A.w || 12, bank: 0, cl: false, cr: false, t: s.rterr, a: 0, j: k === n && E.j ? 1 : 0 });
    }
    return out;
  }
  isEnd(R, i) { return !R.closed && (i === 0 || i === R.pts.length - 1); }
  closing(h) { const R = this.rd(), n = R ? R.pts.length : 0; return !!R && h.r === this.sr && h.i === 0 && !R.closed && n >= 3 && this.sel === n - 1; }
  curTyp() { const R = this.rd(); return R && this.pt() ? R.typ || null : this.s.rtyp; }
  newRoad(p0) { const w = this.world, nr = w.addRoad(); nr.typ = this.s.rtyp; nr.closed = false; nr.pts.push(Object.assign({ w: TYPEN[nr.typ].w, bank: 0, cl: false, cr: false, t: this.s.rterr, a: 0 }, p0)); return nr; }
  // Platzieren (seit v0.19): Start (frei, am Straßenende = weiterbauen, auf einer Straße = Abzweigung), Stück anhängen, Ende einrasten,
  // gleicher Typ am fremden Ende = beide Straßen werden eine. Kreuzungen auf gleicher Höhe werden in der Höhe angeglichen.
  commitPlace(E, close) {
    const w = this.world, s = this.s, C = s.rmode === "curve" && this.place ? this.place.ctrl : null, A = this.pt(); let R = this.rd();
    this.push(); this.place = null;
    if (!A) {
      if (E.end && E.end.r.typ === s.rtyp) { this.sr = E.end.ri; this.sel = E.end.i; this.roadEdit(true); this.preview(); return; }   // gleicher Typ: weiterbauen
      const nr = this.newRoad({ x: E.x, z: E.z, y: E.y, j: E.j ? 1 : 0 });
      this.sr = w.roads.indexOf(nr); this.sel = 0; this.roadEdit(true); this.preview(); return;
    }
    const pp = this.placePlan(A, E, C), pts = pp.pts;
    pp.prev.forEach((e) => { R.pts[e[0]].y = e[1]; }); A.y = pp.ay;
    if (close) { pts.pop(); A.t = s.rterr; R.pts.splice(this.sel + 1, 0, ...pts); R.closed = true; this.selNone(); }
    else {
      A.t = s.rterr;
      if (this.sel === 0 && R.pts.length > 1) { pts.forEach((q) => { q.t = s.rterr; }); R.pts.unshift(...pts.reverse()); this.sel = 0; }   // am Anfang weiterbauen
      else { R.pts.push(...pts); this.sel = R.pts.length - 1; }
    }
    // am Ende einer anderen Straße gleichen Typs angedockt: zu einer Straße verbinden
    if (E.end && E.end.r !== R && E.end.r.typ && E.end.r.typ === R.typ) {
      const O = E.end.r, op = O.pts.slice(); if (E.end.i !== 0) op.reverse(); op.shift();   // gemeinsamen Punkt nicht doppelt
      (this.sel === 0 ? R.pts[0] : R.pts[R.pts.length - 1]).j = 0;   // Verbindungsstelle ist keine Einmündung
      if (this.sel === 0) R.pts.unshift(...op.reverse()); else R.pts.push(...op);
      w.removeRoad(O); this.sr = w.roads.indexOf(R); this.selNone(); this.matchCross(R); this.roadEdit(true); this.preview(); return;
    }
    if (E.end && E.end.r === R) { R.closed = R.pts.length >= 3; if (R.closed) R.pts.pop(); this.selNone(); }   // eigenes Ende getroffen: Rundkurs
    else if (E.j) this.selNone();   // auf einer Straße geendet: Einmündung, die Straße ist fertig
    this.matchCross(R); this.roadEdit(true); this.preview();
  }
  // Kreuzungen auf etwa gleicher Höhe: Schnittpunkt als Punkt einfügen und die Höhe sanft an die andere Straße angleichen
  matchCross(R) {
    const w = this.world, P = R.pts; if (P.length < 2) return;
    for (const o of w.roads) {
      if (o === R || o.S.length < 2) continue;
      for (let i = 0; i < P.length - 1; i++) {
        const a = P[i], b = P[i + 1], qa = o.nearest(a.x, a.z), qb = o.nearest(b.x, b.z); if (!qa || !qb || Math.sign(qa.d) === Math.sign(qb.d)) continue;
        if (Math.abs(qa.d) > o.maxHalf() * 3 || Math.abs(qb.d) > o.maxHalf() * 3) continue;
        const f = Math.abs(qa.d) / (Math.abs(qa.d) + Math.abs(qb.d)), x = lerp(a.x, b.x, f), z = lerp(a.z, b.z, f), q = o.nearest(x, z); if (!q) continue;
        const y0 = lerp(a.y, b.y, f); if (Math.abs(q.y - y0) > 2.5 || q.br) continue;   // deutlich höher: Brücke, nicht angleichen
        if (a.j || b.j) continue;
        const np = Object.assign({}, a, { x: x, z: z, y: q.y, j: 0, a: 0 }); P.splice(i + 1, 0, np); i++;
        const c = this.cum(R), si = c.s[i];   // Nachbarn bis 14 m weich mitnehmen
        P.forEach((p, k) => { const d = Math.abs(c.s[k] - si); if (k !== i && d < 14 && !p.j) { const wgt = 0.5 + 0.5 * Math.cos(Math.PI * d / 14); p.y = lerp(p.y, q.y, wgt); } });
      }
    }
  }
  // Vorschau: farbiges Band in Straßenbreite, Lote zum Boden, Endmarke, Hinweise in der Statuszeile
  preview() {
    const s = this.s, w = this.world, on = s.tool === "road" && s.rmode !== "edit" && this.btn < 0, g = on ? this.groundHit(this.cx || 0, this.cy || 0) : null;
    this.gm.visible = this.gl.visible = this.mk.visible = this.pv.visible = false;
    if (s.tool === "road" && s.rmode === "edit") this.status(t("rsSel"));
    if (!g) return;
    const E = this.endAt(g), A = this.pt(), C = s.rmode === "curve" && this.place ? this.place.ctrl : null;
    this.mk.position.set(E.x, E.y + 0.6, E.z); this.mk.scale.setScalar(Math.max(0.8, this.cam.dist * 0.008)); this.mk.material.color.set(E.end ? 0x7FC8D4 : E.j ? 0xFFFFFF : 0xED6A5E); this.mk.visible = true;
    const hgt = (v) => (v > 0 ? "+" : "") + v.toFixed(1);
    if (!A) { this.status(t("ty_" + s.rtyp) + " · " + (E.end ? (E.end.r.typ === s.rtyp ? t("rsCont") : t("rsBranch")) : E.j ? t("rsBranch") : t("rsStart"))); return; }
    const pp = this.placePlan(A, E, C), P = [Object.assign({}, A, { y: pp.ay })].concat(pp.pts), G = this.ghost;
    G.pts = P.map((q) => Object.assign({}, q)); G.closed = false; G.typ = this.curTyp(); G.sample(); G.markBridges();
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
    if (E.end) msg += " · " + (E.end.r.typ && E.end.r.typ === this.curTyp() && E.end.r !== this.rd() ? t("rsMerge") : t("rsEndAt")); else if (E.j) msg += " · " + t("rsJoin");
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
      const g = this.groundHit(e.clientX, e.clientY);
      if (s.rmode === "edit") {   // Auswählen: Straße unter der Maus wählen
        let best = null, bd = 1e9; if (g) w.roads.forEach((r, ri) => { if (r.S.length < 2) return; const q = r.nearest(g.x, g.z); if (q && Math.abs(q.d) < q.w / 2 + q.walk + 1 && Math.abs(q.d) < bd) { bd = Math.abs(q.d); best = ri; } });
        this.sr = best == null ? -1 : best; this.sel = -1; this.rebuildHandles(); this.panel(); return;
      }
      const h = this.pickHandle(e.clientX, e.clientY);
      if (h) {   // Klick auf ein Straßenende: dort anfangen oder dort enden
        const R = w.roads[h.r], P = R.pts[h.i], E = { x: P.x, z: P.z, y: P.y, j: 1, end: { r: R, ri: h.r, i: h.i } };
        if (this.pt() && h.r === this.sr && h.i === this.sel) return;
        if (s.rmode === "curve" && this.pt() && !this.place) { this.place = { ctrl: { x: P.x, z: P.z } }; this.preview(); return; }
        this.commitPlace(E, false); return;
      }
      if (!g) return;
      if (s.rmode === "curve" && this.pt() && !this.place) { this.place = { ctrl: { x: g.x, z: g.z } }; this.preview(); return; }
      this.commitPlace(this.endAt(g), false); return;
    }
    if (s.tool === "obj") {   // Objekte (seit v0.19): wählen/ziehen oder neu setzen
      const g = this.groundHit(e.clientX, e.clientY); if (!g) return;
      const hit = w.objs.at(g.x, g.z, Math.max(1, this.cam.dist * 0.012));
      if (hit) { this.osel = hit; this.push(); this.odrag = { o: hit, moved: false }; this.panel(); return; }
      const A = OBJEKTE[s.ok]; if (!A) return; this.push();
      const fa = s.oauto ? w.objs.faceRoad(g.x, g.z) : null, en = { k: s.ok, x: g.x, z: g.z, y: w.objs.groundY(g.x, g.z), a: fa != null ? fa : s.oa };
      this.osel = w.objs.add(en); this.panel(); autosave(w); return;
    }
    if (s.tool === "house") {
      if (this.hmove) { this.moveDrop(); return; }
      const g = this.groundHit(e.clientX, e.clientY); if (!g) return;
      const hit = w.houseAt(g.x, g.z, 0.5);
      if (hit) { this.hsel = hit; this.push(); this.hdrag = { h: hit, dx: hit.e.x - g.x, dz: hit.e.z - g.z, moved: false }; this.panel(); return; }
      const def = this.houseDefSel(); if (!def) return;
      this.push();
      const en = { k: this.s.hk.indexOf("lokal:") === 0 ? "lokal" : this.s.hk, x: g.x, z: g.z, y: w.terrain.heightAt(g.x, g.z, true), a: this.s.ha };
      if (en.k === "lokal") en.d = JSON.parse(JSON.stringify(def));
      if (!w.houses.some((h) => h.e.home)) en.home = true;
      this.hsel = w.addHouse(en); w.housesChanged(); this.panel(); autosave(w); return;
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
      if (e.shiftKey) { this.sr = this.drag.r; this.sel = this.drag.i; this.soft("y", this.drag.py - (e.clientY - this.drag.y0) * 0.12 * Math.max(0.3, this.cam.dist / 300) - p.y); }
      else { const g = this.groundHit(e.clientX, e.clientY); if (g) { p.x = g.x; p.z = g.z; } }
      this.roadEdit(false); this.panelPoint(); return;
    }
    if (this.odrag && this.btn === 0) {
      const g = this.groundHit(e.clientX, e.clientY); if (g) { const o = this.odrag.o, W = this.world; o.e.x = g.x; o.e.z = g.z; o.e.y = W.objs.groundY(g.x, g.z); if (this.s.oauto) { const fa = W.objs.faceRoad(g.x, g.z); if (fa != null) o.e.a = fa; } W.objs.place(o); this.odrag.moved = true; }
      return;
    }
    if (this.hmove && this.btn < 0) {   // Verschieben (seit v0.18): Haus folgt der Maus
      const g = this.groundHit(e.clientX, e.clientY); if (g) { const H = this.hmove.h; H.e.x = g.x; H.e.z = g.z; H.e.y = this.world.terrain.heightAt(g.x, g.z, true); H.place(); this.hmove.moved = true; }
      return;
    }
    if (this.hdrag && this.btn === 0) {
      const g = this.groundHit(e.clientX, e.clientY); if (g) { const H = this.hdrag.h; H.e.x = g.x + this.hdrag.dx; H.e.z = g.z + this.hdrag.dz; H.e.y = this.world.terrain.heightAt(H.e.x, H.e.z, true); H.place(); this.hdrag.moved = true; }
      return;
    }
    if (this.painting) this.hit = this.groundHit(e.clientX, e.clientY);
    if (this.s.tool === "road" && this.btn < 0) this.preview();
  }
  panelPoint() { const p = this.pt(), i = this.root.querySelector('[data-k="py"]'), v = this.root.querySelector("#pv-py"); if (p && i) { i.value = p.y; v.textContent = p.y.toFixed(1) + " m"; } }
  up(e) {
    if (this.odrag) { if (this.odrag.moved) autosave(this.world); else this.undo.pop(); this.odrag = null; }
    if (this.hdrag) { if (this.hdrag.moved) { this.world.housesChanged(); autosave(this.world); } else this.undo.pop(); this.hdrag = null; this.panel(); }
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
    if ((e.code === "KeyQ" || e.code === "KeyE") && !e.ctrlKey && !e.metaKey) return true;   // Kamera drehen (gehalten, siehe update)
    if ((e.code === "Delete" || e.code === "Backspace") && this.s.tool === "road") { const R = this.rd(); if (R && !this.pt()) { this.push(); this.world.removeRoad(R); if (!this.world.roads.length) this.world.addRoad(); this.selNone(); this.roadEdit(true); } return true; }
    if (this.s.tool === "obj") {
      if ((e.code === "Delete" || e.code === "Backspace") && this.osel) { this.push(); this.world.objs.remove(this.osel); this.osel = null; this.panel(); autosave(this.world); return true; }
      if (e.code === "KeyR") { const st = e.shiftKey ? 90 : 15; if (this.osel) { this.push(); this.osel.e.a = ((this.osel.e.a || 0) + st) % 360; this.world.objs.place(this.osel); autosave(this.world); } else { this.s.oa = (this.s.oa + st) % 360; } this.panel(); this.saveUI(); return true; }
      if (e.code === "Escape" && this.osel) { this.osel = null; this.panel(); return true; }
    }
    if (this.s.tool === "house") {
      if ((e.code === "Delete" || e.code === "Backspace") && this.hsel) { this.hmove = null; this.push(); this.world.removeHouse(this.hsel); this.hsel = null; this.world.housesChanged(); this.panel(); autosave(this.world); return true; }
      if (e.code === "KeyR") {
        const st = e.shiftKey ? 90 : 15;
        if (this.hsel) { this.push(); this.hsel.e.a = ((this.hsel.e.a || 0) + st) % 360; this.hsel.place(); this.world.housesChanged(); autosave(this.world); }
        else { this.s.ha = (this.s.ha + st) % 360; this.hgk = ""; }
        this.panel(); this.saveUI(); return true;
      }
      if (e.code === "Escape" && this.hmove) { this.moveCancel(); return true; }
      if (e.code === "KeyM" && this.hsel && !e.ctrlKey) { if (this.hmove) this.moveCancel(); else this.moveStart(); return true; }
      if (e.code === "Escape" && this.hsel) { this.hsel = null; this.panel(); return true; }
    }
    if (this.s.tool === "road" && (e.code === "KeyC" || e.code === "KeyV") && !e.ctrlKey && !e.metaKey) {
      const st = (e.shiftKey ? 5 : 1) * (e.code === "KeyV" ? 1 : -1), p = this.pt();
      { this.s.rh = clamp(this.s.rh + st, -30, 80); const i = this.root.querySelector('[data-k="rh"]'), v = this.root.querySelector("#pv-rh"); if (i) { i.value = this.s.rh; v.textContent = this.s.rh.toFixed(1) + " m"; } this.preview(); this.saveUI(); }
      return true;
    }
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
      const rot = (inp.k("KeyQ") ? 1 : 0) - (inp.k("KeyE") ? 1 : 0); if (rot) c.yaw += rot * 1.9 * dt;   // Q/E halten: Kamera drehen (seit v0.17)
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
    if (s0.tool === "house") this.houseGhost();
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
// Häuser: Vorschau des gewählten Hauses unter der Maus (halb durchsichtig), Auswahl-Hilfen
Editor.prototype.houseDefSel = function () {
  const k = this.s.hk; if (HOUSES[k]) return HOUSES[k].d;
  if (k.indexOf("lokal:") === 0) { const l = store.get(KEYS.houses, []); return (Array.isArray(l) && l[+k.slice(6)]) || null; }
  return null;
};
Editor.prototype.setGhost = function (def) {
  if (this.hghost) { this.hghost.dispose(); this.hghost = null; }
  if (!def) { this.hgk = ""; return; }
  const en = { k: "ghost", d: def, x: 0, z: 0, y: 0, a: this.s.ha }; this.hghost = new HouseInst(en, def);
  if (!this.gmat) this.gmat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, transparent: true, opacity: 0.5, depthWrite: false });
  this.hghost.root.traverse((o) => { if (o.isMesh) { o.material = this.gmat; o.castShadow = false; } });
  this.eng.scene.add(this.hghost.root);
};
// Haus verschieben (seit v0.18): aufnehmen → folgt der Maus → Klick setzt ab (Gelände wird neu geebnet), Esc stellt es zurück
Editor.prototype.moveStart = function () {
  const H = this.hsel; if (!H) return; this.push();
  this.hmove = { h: H, x: H.e.x, z: H.e.z, y: H.e.y, moved: false }; this.panel();
};
Editor.prototype.moveDrop = function () {
  const M = this.hmove; if (!M) return; this.hmove = null;
  if (M.moved) { this.world.housesChanged(); autosave(this.world); } else this.undo.pop();
  this.panel();
};
Editor.prototype.moveCancel = function () {
  const M = this.hmove; if (!M) return; this.hmove = null;
  M.h.e.x = M.x; M.h.e.z = M.z; M.h.e.y = M.y; M.h.place(); this.undo.pop(); this.panel();
};
Editor.prototype.houseGhost = function () {
  const key = this.s.hk + "|" + this.s.ha;
  if (key !== this.hgk) { this.setGhost(this.houseDefSel()); this.hgk = key; }
  const G = this.hghost; if (!G) return;
  const g = this.btn < 0 ? this.groundHit(this.cx || 0, this.cy || 0) : null, over = g && this.world.houseAt(g.x, g.z, 0.5);
  G.root.visible = !!g && !over && !this.hmove;
  if (g && !over) { G.e.x = g.x; G.e.z = g.z; G.e.y = this.world.terrain.heightAt(g.x, g.z); G.e.a = this.s.ha; G.place(); }
};
function confirmLite(msg) { try { return window.confirm(msg); } catch (e) { return true; } }
