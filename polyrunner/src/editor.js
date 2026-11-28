// ===== editor.js · Map-Editor: Bauwerkzeug (Formen markieren und herausziehen), Start/Ziel/Test-Start, Farbe, Löschen, Himmel, Datei =====
import * as THREE from "three";
import { t, addTexts, L2, el, esc, store, KEYS, PRU, clamp, r3, uid, download, DEG } from "pru/core.js";
import { concrete } from "pru/engine.js";
import { Prism, ccw, area, DEFAULT_COLOR, MAP_FORMAT, MARK } from "pru/world.js";
import { TESTMAPS } from "pru/testmaps.js";

addTexts({
  tBuild: L2("Bauen", "Build"), tStart: L2("Start", "Start"), tFinish: L2("Ziel", "Finish"), tTest: L2("Test-Start", "Test start"), tPaint: L2("Farbe", "Paint"), tErase: L2("Löschen", "Erase"),
  sRect: L2("Viereck", "Rectangle"), sTri: L2("Dreieck", "Triangle"), sCircle: L2("Kreis", "Circle"), sHex: L2("Hexagon", "Hexagon"),
  eTestS: L2("Testen", "Test"), eTestFrom: L2("ab Test-Start", "from test start"), eTestStart: L2("ab Start", "from start"),
  eSky: L2("Himmel", "Sky"), eChar: L2("Charakter", "Character"), eAnim: L2("Animationen", "Animations"), eFile: L2("Datei", "File"), eMenu: L2("Menü", "Menu"),
  eTime: L2("Tageszeit", "Time of day"), eCycle: L2("Tageszyklus läuft", "Day cycle running"), eSpeed: L2("Tempo", "Speed"),
  eTestMaps: L2("Testgelände laden", "Load test course"), eTestQ: L2("Testgelände laden? Die aktuelle Map wird ersetzt (Strg+Z macht es rückgängig, vorher exportieren schadet nicht).", "Load the test course? The current map is replaced (Ctrl+Z undoes it; exporting first doesn't hurt)."),
  eName: L2("Name der Map", "Map name"), eNew: L2("Neue Map", "New map"), eOpen: L2("Öffnen …", "Open …"), eExport: L2("Exportieren", "Export"),
  eNewQ: L2("Neue, leere Map anfangen? Die aktuelle Map wird verworfen (vorher exportieren!).", "Start a new, empty map? The current map will be discarded (export it first!)."),
  eBadFile: L2("Das ist keine PolyRunner-Map.", "This is not a PolyRunner map."), eLoaded: L2("Map geladen", "Map loaded"), eExported: L2("Map exportiert", "Map exported"),
  eStructs: L2("{n} Strukturen", "{n} structures"), eRot: L2("Drehung {a}° (Q/E)", "Rotation {a}° (Q/E)"),
  eNoStart: L2("Erst einen Start setzen", "Place a start first"), eFlat: L2("Nur auf ebenen Flächen", "Only on flat surfaces"),
  eUndo: L2("Rückgängig", "Undo"), eRedo: L2("Wiederholen", "Redo"), eCustom: L2("Eigene Farbe", "Custom colour"),
  hBuild: L2("Ziehen: Form markieren · loslassen, Maus bewegen: hochziehen · Klick: fertig · Zahl tippen: genaue Höhe · Strg: 0,25-m-Schritte · Alt: ohne Einrasten · Shift: Quadrat / rechtwinklig", "Drag: mark a shape · release, move the mouse: pull it out · click: done · type a number: exact height · Ctrl: 0.25 m steps · Alt: no snapping · Shift: square / right angle"),
  hMark: L2("Klicken: setzen · ziehen: Blickrichtung", "Click: place · drag: facing direction"), hFinish: L2("Klicken: Ziel setzen", "Click: place the finish"),
  hPaint: L2("Klick: Struktur füllen · Alt+Klick: Farbe aufnehmen", "Click: fill a structure · Alt+click: pick its colour"), hErase: L2("Klick: Struktur oder Marker löschen", "Click: delete a structure or marker"),
  hCam: L2("Rechte Maus: drehen · Mitte / Shift+Rechts: schieben · Rad: zoomen · WASD: fahren", "Right mouse: orbit · middle / Shift+right: pan · wheel: zoom · WASD: move")
});

const ICO = {
  build: '<path d="M3 17h14M5.5 17V10h9v7M10 2.5v5M7.6 4.8 10 2.5l2.4 2.3"/>',
  start: '<path d="M5 18V3M5 3.5h10l-2.5 3.2L15 10H5"/>',
  finish: '<circle cx="10" cy="10" r="6.5"/><circle cx="10" cy="10" r="2.6"/>',
  test: '<circle cx="10" cy="8" r="4.2"/><path d="M10 12.2V18M7 18h6"/>',
  paint: '<path d="M10 2.8c3.2 4.2 5 6.8 5 9.3a5 5 0 0 1-10 0c0-2.5 1.8-5.1 5-9.3z"/>',
  erase: '<path d="M5 5l10 10M15 5 5 15"/>',
  rect: '<rect x="3.5" y="5" width="13" height="10"/>', tri: '<path d="M10 3.5 17 16H3z"/>', circle: '<circle cx="10" cy="10" r="6.6"/>', hex: '<path d="M6.3 3.8h7.4L17.4 10l-3.7 6.2H6.3L2.6 10z"/>',
  sky: '<circle cx="10" cy="10" r="3.6"/><path d="M10 2v2.2M10 15.8V18M2 10h2.2M15.8 10H18M4.3 4.3l1.6 1.6M14.1 14.1l1.6 1.6M4.3 15.7l1.6-1.6M14.1 5.9l1.6-1.6"/>',
  file: '<path d="M5 2.5h7l3 3v12H5z"/><path d="M12 2.5v3h3"/>', play: '<path d="M6 4l10 6-10 6z"/>',
  undo: '<path d="M7 5 3.5 8.5 7 12"/><path d="M4 8.5h8a4.5 4.5 0 0 1 0 9H9"/>', redo: '<path d="M13 5l3.5 3.5L13 12"/><path d="M16 8.5H8a4.5 4.5 0 0 0 0 9h3"/>'
};
const svg = (k) => '<svg viewBox="0 0 20 20" aria-hidden="true">' + ICO[k] + "</svg>";
export const PALETTE = ["#9EA1A5", "#C9C7C1", "#E9E5DC", "#6E7176", "#3A3C40", "#E2621B", "#E8C547", "#B5835A", "#C97B84", "#8E6C8A", "#3F7CAC", "#5FC2CF", "#7A9E7E", "#2F5D50"];
const ACC = 0xE2621B;

export class Editor {
  constructor(app) {
    this.app = app; this.world = app.world; this.engine = app.engine; this.cv = app.engine.renderer.domElement;
    const ui = store.get(KEYS.ui, {});
    this.tool = ui.tool || "build"; this.shape = ui.shape || "rect"; this.color = ui.color || PALETTE[5]; this.rot = ui.rot || 0;
    this.cam = app.editorCam || { tx: 0, ty: 2, tz: 0, yaw: 0.38, pitch: 0.42, dist: 32 };
    this.undo = []; this.redo = []; this.keys = {}; this.draw = null; this.drag = null; this.numBuf = "";
    this.world.setShowTest(true);
    this.helpers = new THREE.Group(); this.engine.scene.add(this.helpers);
    this.lineAcc = new THREE.LineBasicMaterial({ color: ACC, depthTest: false, transparent: true });
    this.lineCut = new THREE.LineBasicMaterial({ color: 0x1A1B1E, transparent: true, opacity: 0.75 });
    this.fillAcc = new THREE.MeshBasicMaterial({ color: ACC, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4 });
    this.cursor = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.2, 24), new THREE.MeshBasicMaterial({ color: ACC, depthTest: false, transparent: true, side: THREE.DoubleSide }));
    this.cursor.renderOrder = 20; this.helpers.add(this.cursor);
    this.hoverLines = new THREE.LineSegments(new THREE.BufferGeometry(), this.lineAcc); this.hoverLines.renderOrder = 19; this.helpers.add(this.hoverLines);
    this.buildUI();
    this.bind();
    this.world.onChange = () => { this.dirty = true; this.refreshInfo(); };
    this.setTool(this.tool);
    this.refreshInfo();
  }
  // ---------- Oberfläche ----------
  buildUI() {
    const T = (k) => t(k);
    const tool = (k, key) => '<button class="pru-ib" data-tool="' + k + '" title="' + T("t" + k[0].toUpperCase() + k.slice(1)) + (key ? " (" + key + ")" : "") + '">' + svg(k) + "</button>";
    const shp = (k, lab, key) => '<button class="pru-ib" data-shape="' + k + '" title="' + T(lab) + " (" + key + ')">' + svg(k) + "</button>";
    const env = this.engine.env;
    this.root = el("div", "pru-ed",
      '<div class="pru-brand">POLY<b>RUNNER</b><span id="pru-mname"></span></div>' +
      '<div class="pru-tools">' + tool("build", "B") + tool("start") + tool("finish") + tool("test") + tool("paint", "F") + tool("erase", "X") +
        '<i class="pru-sep"></i><button class="pru-ib" data-a="undo" title="' + T("eUndo") + ' (Strg+Z)">' + svg("undo") + '</button><button class="pru-ib" data-a="redo" title="' + T("eRedo") + ' (Strg+Y)">' + svg("redo") + "</button></div>" +
      '<div class="pru-right">' +
        '<button class="pru-ib" data-pop="sky" title="' + T("eSky") + '">' + svg("sky") + "</button>" +
        '<button class="pru-ib" data-pop="file" title="' + T("eFile") + '">' + svg("file") + "</button>" +
        '<button class="pru-tb" data-a="char" title="' + T("eChar") + '">' + T("eChar") + "</button>" +
        '<button class="pru-tb" data-a="anim" title="' + T("eAnim") + '">' + T("eAnim") + "</button>" +
        '<button class="pru-tb" data-a="test0" id="pru-test0" title="Shift+Enter" hidden>' + svg("play") + "<span>" + T("eTestStart") + "</span></button>" +
        '<button class="pru-tb pru-pri" data-a="test" title="Enter">' + svg("play") + "<span>" + T("eTestS") + '</span><small id="pru-tfrom"></small></button>' +
        '<button class="pru-tb" data-a="menu">' + T("eMenu") + "</button></div>" +
      '<div class="pru-pop" id="pru-pop-sky" hidden><label>' + T("eTime") + ' <em id="pru-tv"></em></label><input type="range" min="0" max="24" step="0.05" id="pru-time" value="' + env.time + '">' +
        '<label class="pru-chk"><input type="checkbox" id="pru-cycle"' + (env.cycle ? " checked" : "") + "> " + T("eCycle") + "</label>" +
        '<label>' + T("eSpeed") + '</label><div class="pru-seg" id="pru-speed">' + [[1, "1×"], [5, "5×"], [30, "30×"]].map((o) => '<button data-sp="' + o[0] + '">' + o[1] + "</button>").join("") + "</div></div>" +
      '<div class="pru-pop" id="pru-pop-file" hidden><label>' + T("eName") + '</label><input type="text" id="pru-name" maxlength="40">' +
        '<div class="pru-col"><button data-a="new">' + T("eNew") + '</button><button data-a="open">' + T("eOpen") + '</button><button data-a="export" class="pru-pri">' + T("eExport") + "</button></div>" +
        "<label>" + T("eTestMaps") + '</label><div class="pru-col">' + TESTMAPS.map((m, i) => '<button data-tm="' + i + '" title="' + esc(PRU.lang === "en" ? m.note.en : m.note.de) + '">' + esc(PRU.lang === "en" ? m.en : m.de) + "</button>").join("") + "</div>" +
        '<p id="pru-count"></p><input type="file" id="pru-file" accept=".json,.txt,application/json" hidden></div>' +
      '<div class="pru-ctx" id="pru-ctx-build">' + shp("rect", "sRect", 1) + shp("tri", "sTri", 2) + shp("circle", "sCircle", 3) + shp("hex", "sHex", 4) + '<span class="pru-rot" id="pru-rot"></span></div>' +
      '<div class="pru-ctx" id="pru-ctx-paint">' + PALETTE.map((c) => '<button class="pru-sw" data-col="' + c + '" style="background:' + c + '"></button>').join("") +
        '<label class="pru-sw pru-cust" title="' + T("eCustom") + '"><input type="color" id="pru-cust"></label></div>' +
      '<div class="pru-hint" id="pru-hint"></div><div class="pru-dim" id="pru-dim" hidden></div>');
    this.app.ui.appendChild(this.root);
    const $ = (s) => this.root.querySelector(s);
    this.$ = $;
    this.root.addEventListener("click", (e) => this.click(e));
    $("#pru-time").addEventListener("input", (e) => { this.engine.setEnv({ time: +e.target.value }); this.saveSky(); });
    $("#pru-cycle").addEventListener("change", (e) => { this.engine.setEnv({ cycle: e.target.checked }); this.saveSky(); });
    $("#pru-name").addEventListener("input", (e) => { this.world.map.name = e.target.value || "Map"; this.dirty = true; this.refreshInfo(); });
    $("#pru-file").addEventListener("change", (e) => this.importFile(e.target.files && e.target.files[0]));
    $("#pru-cust").addEventListener("input", (e) => { this.color = e.target.value; this.refreshPalette(); this.saveUI(); });
    this.markSpeed();
  }
  saveSky() { const e = this.engine.env; this.world.map.sky = { time: r3(e.time), cycle: e.cycle, speed: e.speed }; this.dirty = true; }
  markSpeed() { this.root.querySelectorAll("[data-sp]").forEach((b) => b.setAttribute("aria-pressed", String(+b.getAttribute("data-sp") === this.engine.env.speed))); }
  saveUI() { store.set(KEYS.ui, { tool: this.tool, shape: this.shape, color: this.color, rot: this.rot }); }
  click(e) {
    const b = e.target.closest("button,[data-col]"); if (!b) return;
    if (b.hasAttribute("data-tool")) return this.setTool(b.getAttribute("data-tool"));
    if (b.hasAttribute("data-shape")) { this.shape = b.getAttribute("data-shape"); this.setTool("build"); return; }
    if (b.hasAttribute("data-col")) { this.color = b.getAttribute("data-col"); this.refreshPalette(); this.saveUI(); return; }
    if (b.hasAttribute("data-sp")) { this.engine.setEnv({ speed: +b.getAttribute("data-sp") }); this.markSpeed(); this.saveSky(); return; }
    if (b.hasAttribute("data-tm")) { const m = TESTMAPS[+b.getAttribute("data-tm")]; if (m && confirm(t("eTestQ"))) { this.commit(() => { this.world.load(JSON.parse(JSON.stringify(m.map))); }); this.world.setShowTest(true); this.refreshInfo(); } return; }
    if (b.hasAttribute("data-pop")) { const id = b.getAttribute("data-pop"); ["sky", "file"].forEach((k) => { const p = this.$("#pru-pop-" + k); p.hidden = k !== id ? true : !p.hidden; }); this.refreshInfo(); return; }
    const a = b.getAttribute("data-a");
    if (a === "test") this.test(this.world.map.test && !e.shiftKey ? "test" : "start");
    else if (a === "test0") this.test("start");
    else if (a === "menu") { this.save(); this.app.go("menu"); }
    else if (a === "char") { this.save(); this.app.editorCam = this.cam; this.app.go("char"); }
    else if (a === "anim") { this.save(); this.app.editorCam = this.cam; this.app.animFrom = "editor"; this.app.go("anim"); }
    else if (a === "undo") this.doUndo(); else if (a === "redo") this.doRedo();
    else if (a === "new") { if (confirm(t("eNewQ"))) { this.commit(() => { this.world.load(null); }); this.world.map.name = "Neue Map"; this.refreshInfo(); } }
    else if (a === "open") this.$("#pru-file").click();
    else if (a === "export") this.exportMap();
  }
  setTool(k) {
    this.cancel(); this.tool = k;
    this.root.querySelectorAll("[data-tool]").forEach((b) => b.setAttribute("aria-pressed", String(b.getAttribute("data-tool") === k)));
    this.root.querySelectorAll("[data-shape]").forEach((b) => b.setAttribute("aria-pressed", String(b.getAttribute("data-shape") === this.shape)));
    this.$("#pru-ctx-build").hidden = k !== "build"; this.$("#pru-ctx-paint").hidden = k !== "paint";
    this.refreshPalette(); this.refreshRot(); this.saveUI();
    const h = { build: "hBuild", start: "hMark", test: "hMark", finish: "hFinish", paint: "hPaint", erase: "hErase" }[k];
    this.$("#pru-hint").innerHTML = "<b>" + esc(t(h)) + "</b><span>" + esc(t("hCam")) + "</span>";
  }
  refreshPalette() { this.root.querySelectorAll("[data-col]").forEach((b) => b.setAttribute("aria-pressed", String(b.getAttribute("data-col") === this.color))); const c = this.$("#pru-cust"); if (c && PALETTE.indexOf(this.color) < 0) c.value = this.color; c.parentNode.style.background = PALETTE.indexOf(this.color) < 0 ? this.color : ""; c.parentNode.setAttribute("aria-pressed", String(PALETTE.indexOf(this.color) < 0)); }
  refreshRot() { this.$("#pru-rot").textContent = t("eRot").replace("{a}", String(Math.round(this.rot))); }
  refreshInfo() {
    const m = this.world.map;
    this.$("#pru-mname").textContent = m.name;
    const n = this.$("#pru-name"); if (document.activeElement !== n) n.value = m.name;
    this.$("#pru-count").textContent = t("eStructs").replace("{n}", m.structs.length);
    this.$("#pru-tv").textContent = fmtClock(this.engine.env.time);
    this.$("#pru-tfrom").textContent = m.test ? t("eTestFrom") : t("eTestStart");
    this.$("#pru-test0").hidden = !m.test;
  }
  toast(s) { this.app.toast(s); }

  // ---------- Verlauf ----------
  commit(fn) {
    const before = this.world.snapshot(); fn();
    this.undo.push(before); if (this.undo.length > 120) this.undo.shift(); this.redo = []; this.dirty = true;
  }
  doUndo() { if (!this.undo.length) return; this.cancel(); this.redo.push(this.world.snapshot()); this.world.restore(this.undo.pop()); this.world.setShowTest(true); this.dirty = true; this.refreshInfo(); }
  doRedo() { if (!this.redo.length) return; this.cancel(); this.undo.push(this.world.snapshot()); this.world.restore(this.redo.pop()); this.world.setShowTest(true); this.dirty = true; this.refreshInfo(); }
  save() { store.set(KEYS.map, this.world.toJSON()); this.dirty = false; }

  // ---------- Datei ----------
  exportMap() {
    const m = this.world.toJSON(), name = (m.name || "Map").replace(/[^A-Za-z0-9ÄÖÜäöüß_-]+/g, "_").replace(/^_+|_+$/g, "") || "Map";
    download("PolyRunner_" + name + ".json", JSON.stringify(m)); this.toast(t("eExported"));
  }
  importFile(f) {
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      let m = null; try { m = JSON.parse(String(r.result)); } catch (e) { m = null; }
      if (!m || m.format !== MAP_FORMAT || !Array.isArray(m.structs)) { this.toast(t("eBadFile")); return; }
      this.commit(() => this.world.load(m)); this.world.setShowTest(true);
      this.$("#pru-time").value = this.engine.env.time; this.$("#pru-cycle").checked = this.engine.env.cycle; this.markSpeed();
      this.refreshInfo(); this.toast(t("eLoaded"));
    };
    r.readAsText(f); this.$("#pru-file").value = "";
  }

  // ---------- Testen ----------
  test(from) {
    const m = this.world.map;
    if (!m.start && !(from === "test" && m.test)) { this.toast(t("eNoStart")); return; }
    this.save(); this.app.editorCam = this.cam; this.app.go("test", { from: from });
  }

  // ---------- Eingabe ----------
  bind() {
    const cv = this.cv;
    this.h = {
      down: (e) => this.pdown(e), move: (e) => this.pmove(e), up: (e) => this.pup(e),
      wheel: (e) => { e.preventDefault(); this.zoom(e); }, ctx: (e) => e.preventDefault(),
      kup: (e) => { this.keys[e.code] = false; }, blur: () => { this.keys = {}; }
    };
    cv.addEventListener("pointerdown", this.h.down); window.addEventListener("pointermove", this.h.move); window.addEventListener("pointerup", this.h.up);
    cv.addEventListener("wheel", this.h.wheel, { passive: false }); cv.addEventListener("contextmenu", this.h.ctx);
    window.addEventListener("keyup", this.h.kup); window.addEventListener("blur", this.h.blur);
  }
  ndc(e) { const r = this.cv.getBoundingClientRect(); return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); }
  rayOf(e) { const rc = this.rc || (this.rc = new THREE.Raycaster()); rc.setFromCamera(this.ndc(e), this.engine.camera); return rc.ray; }
  // Treffer: Struktur-Fläche oder Boden
  pick(e, withMarkers) {
    const rc = this.rc || (this.rc = new THREE.Raycaster()); rc.setFromCamera(this.ndc(e), this.engine.camera); rc.far = 3000;
    const objs = this.world.meshes().concat([this.engine.ground]);
    if (withMarkers) Object.values(this.world.markers).forEach((m) => { if (m.visible) objs.push(m); });
    const hits = rc.intersectObjects(objs, true); if (!hits.length) return null;
    const h = hits[0];
    if (h.object.userData.marker) return { marker: h.object.userData.marker, point: h.point };
    if (h.object === this.engine.ground) return { ground: true, point: h.point, n: new THREE.Vector3(0, 1, 0) };
    const it = this.world.itemOf(h.object); if (!it) return null;
    const fi = h.object.geometry.userData.faceOf[h.faceIndex];
    return { item: it, fi: fi, point: h.point, n: it.prism.face(fi).n };
  }
  wpp(p) { const c = this.engine.camera, d = c.position.distanceTo(p); return 2 * d * Math.tan(c.fov * DEG / 2) / Math.max(1, this.cv.clientHeight); }
  keydown(e) {
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return false;
    const c = e.code, ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && c === "KeyZ") { if (e.shiftKey) this.doRedo(); else this.doUndo(); return true; }
    if (ctrl && c === "KeyY") { this.doRedo(); return true; }
    if (ctrl && c === "KeyS") { this.save(); this.exportMap(); return true; }
    if (ctrl) return false;
    // Höhe tippen beim Hochziehen
    if (this.draw && this.draw.phase === "pull") {
      if (/^(Digit|Numpad)[0-9]$/.test(c) || c === "Period" || c === "Comma" || c === "NumpadDecimal") { this.numBuf += (c === "Period" || c === "Comma" || c === "NumpadDecimal") ? "." : c.slice(-1); this.updatePull(); return true; }
      if (c === "Backspace") { this.numBuf = this.numBuf.slice(0, -1); this.updatePull(); return true; }
      if (c === "Enter" || c === "NumpadEnter") { this.finishPull(); return true; }
    }
    if (c === "Escape") { if (this.draw || this.drag) { this.cancel(); return true; } this.root.querySelectorAll(".pru-pop").forEach((p) => { p.hidden = true; }); return true; }
    if (c === "Enter" || c === "NumpadEnter") { this.test(e.shiftKey || !this.world.map.test ? "start" : "test"); return true; }
    if (c === "KeyB") { this.setTool("build"); return true; }
    if (c === "KeyF") { this.setTool("paint"); return true; }
    if (c === "KeyX" || c === "Delete") { this.setTool("erase"); return true; }
    const sh = { Digit1: "rect", Digit2: "tri", Digit3: "circle", Digit4: "hex" }[c];
    if (sh) { this.shape = sh; this.setTool("build"); return true; }
    if ((c === "KeyQ" || c === "KeyE") && this.tool === "build") { this.rot = ((this.rot + (c === "KeyE" ? 1 : -1) * (e.shiftKey ? 1 : 15)) % 360 + 360) % 360; this.refreshRot(); this.saveUI(); if (this.draw) this.updateDraw(); return true; }
    if (/^Key[WASD]$/.test(c)) { this.keys[c] = true; return true; }
    return false;
  }
  key(e) { return this.keydown(e); }

  pdown(e) {
    this.cv.focus();
    this.root.querySelectorAll(".pru-pop").forEach((p) => { p.hidden = true; });
    if (e.button === 2 || e.button === 1) {
      if (this.draw && e.button === 2) { this.cancel(); return; }
      this.drag = { kind: e.button === 1 || e.shiftKey ? "pan" : "orbit", x: e.clientX, y: e.clientY, moved: 0 }; this.cv.setPointerCapture && this.cv.setPointerCapture(e.pointerId); return;
    }
    if (e.button !== 0) return;
    this.lastE = e;
    if (this.tool === "build") {
      if (this.draw && this.draw.phase === "pull") { this.finishPull(); return; }
      const h = this.pick(e); if (!h) return;
      this.startDraw(h, e);
    } else if (this.tool === "start" || this.tool === "test" || this.tool === "finish") {
      const h = this.pick(e); if (!h || h.marker) return;
      if (h.n.y < 0.7) { this.toast(t("eFlat")); return; }
      this.markDrag = { kind: this.tool, p: h.point.clone(), yaw: this.tool === "finish" ? 0 : (this.world.map[this.tool] ? this.world.map[this.tool].yaw : this.cam.yaw + Math.PI), before: this.world.snapshot() };
      this.applyMark();
    } else if (this.tool === "paint") {
      const h = this.pick(e); if (!h || !h.item) return;
      if (e.altKey) { this.color = h.item.d.c || DEFAULT_COLOR; this.refreshPalette(); this.saveUI(); return; }
      if (h.item.d.c === this.color) return;
      this.commit(() => this.world.paint(h.item.d.id, this.color));
    } else if (this.tool === "erase") {
      const h = this.pick(e, true); if (!h) return;
      if (h.marker) this.commit(() => this.world.setMarker(h.marker, null));
      else if (h.item) this.commit(() => this.world.remove(h.item.d.id));
      this.hover(e);
    }
  }
  pmove(e) {
    this.lastE = e;
    if (this.drag) {
      const dx = e.clientX - this.drag.x, dy = e.clientY - this.drag.y; this.drag.x = e.clientX; this.drag.y = e.clientY; this.drag.moved += Math.abs(dx) + Math.abs(dy);
      const c = this.cam;
      if (this.drag.kind === "orbit") { c.yaw -= dx * 0.006; c.pitch = clamp(c.pitch + dy * 0.005, -0.15, 1.52); }
      else {
        // Greifen: der Boden folgt der Maus
        const k = this.wpp(new THREE.Vector3(c.tx, c.ty, c.tz)) / Math.max(0.35, Math.sin(Math.max(0.05, c.pitch))) * 0.9;
        const f = new THREE.Vector3(-Math.sin(c.yaw), 0, -Math.cos(c.yaw)), r = new THREE.Vector3(-f.z, 0, f.x), kx = this.wpp(new THREE.Vector3(c.tx, c.ty, c.tz));
        c.tx += -r.x * dx * kx + f.x * dy * k; c.tz += -r.z * dx * kx + f.z * dy * k;
      }
      return;
    }
    if (e.target !== this.cv && !this.draw && !this.markDrag) return;
    if (this.draw) { if (this.draw.phase === "draw") this.updateDraw(e); else this.updatePull(e); return; }
    if (this.markDrag) { this.dragMark(e); return; }
    this.hover(e);
  }
  pup(e) {
    if (this.drag && (e.button === 2 || e.button === 1)) { this.drag = null; return; }
    if (e.button !== 0) return;
    if (this.draw && this.draw.phase === "draw") this.endDraw(e);
    if (this.markDrag) { const M = this.markDrag; this.markDrag = null; this.undo.push(M.before); this.redo = []; this.save(); this.refreshInfo(); }
  }
  zoom(e) {
    const c = this.cam, k = Math.exp(e.deltaY * 0.0012 * (e.deltaMode === 1 ? 30 : 1));
    const nd = clamp(c.dist * k, 2, 600);
    // zum Mauszeiger hin zoomen
    const h = this.pick(e);
    if (h && !h.marker && nd < c.dist) { const f = 1 - nd / c.dist; c.tx += (h.point.x - c.tx) * f; c.ty += (h.point.y - c.ty) * f; c.tz += (h.point.z - c.tz) * f; }
    c.dist = nd;
  }

  // ---------- Hover ----------
  hover(e) {
    const h = this.pick(e, this.tool === "erase");
    this.cursor.visible = false; this.hoverLines.visible = false;
    if (!h) return;
    if (this.tool === "build" || this.tool === "start" || this.tool === "test" || this.tool === "finish") {
      if (h.marker) return;
      this.cursor.visible = true; this.cursor.position.copy(h.point).addScaledVector(h.n, 0.01);
      this.cursor.lookAt(h.point.clone().add(h.n)); this.cursor.scale.setScalar(this.wpp(h.point) * 40);
      if (this.tool === "build" && h.item) this.showOutline(h.item.prism.face(h.fi).outline);
    } else if ((this.tool === "paint" || this.tool === "erase") && h.item) {
      this.hoverLines.geometry.dispose(); this.hoverLines.geometry = h.item.prism.lines(); this.hoverLines.visible = true;
    }
  }
  showOutline(pts) {
    const a = []; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a.push(p.x, p.y, p.z, q.x, q.y, q.z); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(a, 3));
    this.hoverLines.geometry.dispose(); this.hoverLines.geometry = g; this.hoverLines.visible = true;
  }

  // ---------- Bauen: Ebene, Form zeichnen ----------
  startDraw(h, e) {
    let o, n, u;
    if (h.ground) { n = new THREE.Vector3(0, 1, 0); o = new THREE.Vector3(h.point.x, 0, h.point.z); const a = this.rot * DEG; u = new THREE.Vector3(Math.cos(a), 0, -Math.sin(a)); }
    else { const f = h.item.prism.face(h.fi); n = f.n.clone(); u = f.u.clone(); o = h.point.clone().addScaledVector(n, n.dot(f.o.clone().sub(h.point))); }
    u.addScaledVector(n, -u.dot(n)).normalize();
    const v = new THREE.Vector3().crossVectors(n, u).normalize();
    const pl = { o: o, n: n, u: u, v: v, ground: !!h.ground, item: h.item ? h.item.d.id : null };
    this.collectSnaps(pl, h);
    const s2 = this.snap2(pl, this.to2(pl, h.point), h.point, e.altKey);
    this.draw = { phase: "draw", pl: pl, s: s2, c: s2.slice(), pts: null };
    this.cursor.visible = false; this.hoverLines.visible = false;
    this.updateDraw(e);
  }
  to2(pl, P) { const d = P.clone().sub(pl.o); return [d.dot(pl.u), d.dot(pl.v)]; }
  from2(pl, a, b, s) { return pl.o.clone().addScaledVector(pl.u, a).addScaledVector(pl.v, b).addScaledVector(pl.n, s || 0); }
  planeHit(pl, e) {
    const r = this.rayOf(e), den = r.direction.dot(pl.n); if (Math.abs(den) < 1e-5) return null;
    const tt = pl.o.clone().sub(r.origin).dot(pl.n) / den; if (tt < 0) return null;
    return r.origin.clone().addScaledVector(r.direction, tt);
  }
  // Einrastpunkte: Ecken und Kanten, die in dieser Ebene liegen (Fläche selbst, Nachbarn)
  collectSnaps(pl, h) {
    const pts = [], segs = [], on = (P) => Math.abs(P.clone().sub(pl.o).dot(pl.n)) < 0.012;
    this.world.items.forEach((it) => {
      const pr = it.prism, N = pr.pts.length, round = it.d.s === "circle";
      [0, pr.h].forEach((s) => {
        const ring = pr.pts.map((p) => pr.at(p[0], p[1], s));
        ring.forEach((P, i) => { const Q = ring[(i + 1) % N]; if (on(P)) { if (!round) pts.push(this.to2(pl, P)); if (on(Q)) segs.push([this.to2(pl, P), this.to2(pl, Q)]); } });
      });
      if (!round) pr.pts.forEach((p) => { const A = pr.at(p[0], p[1], 0), B = pr.at(p[0], p[1], pr.h); if (on(A) && on(B)) segs.push([this.to2(pl, A), this.to2(pl, B)]); });
      if (round) { const c0 = pr.at(pr.c2[0], pr.c2[1], 0), c1 = pr.at(pr.c2[0], pr.c2[1], pr.h); if (on(c0)) pts.push(this.to2(pl, c0)); if (on(c1)) pts.push(this.to2(pl, c1)); }
    });
    // Start, Ziel als Punkte
    ["start", "finish", "test"].forEach((k) => { const m = this.world.map[k]; if (m) { const P = new THREE.Vector3(m.p[0], m.p[1], m.p[2]); if (on(P)) pts.push(this.to2(pl, P)); } });
    pl.snapPts = pts; pl.snapSegs = segs;
  }
  snap2(pl, q, P, noSnap) {
    if (noSnap) { this.snapHit = null; return q; }
    const thr = this.wpp(P) * 11;
    let best = null, bd = thr * thr;
    pl.snapPts.forEach((p) => { const d = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2; if (d < bd) { bd = d; best = p; } });
    if (best) { this.snapHit = "pt"; return best.slice(); }
    let bs = null; bd = (thr * 0.75) ** 2;
    pl.snapSegs.forEach((sg) => {
      const a = sg[0], b = sg[1], ex = b[0] - a[0], ey = b[1] - a[1], L2v = ex * ex + ey * ey; if (L2v < 1e-8) return;
      const k = clamp(((q[0] - a[0]) * ex + (q[1] - a[1]) * ey) / L2v, 0, 1), p = [a[0] + ex * k, a[1] + ey * k], d = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2;
      if (d < bd) { bd = d; bs = p; }
    });
    this.snapHit = bs ? "edge" : null;
    return bs || q;
  }
  shapePts(s, c, shift) {
    const sh = this.shape, a0 = s[0], b0 = s[1]; let a1 = c[0], b1 = c[1];
    if (sh === "rect" || sh === "tri") {
      if (shift && sh === "rect") { const m = Math.max(Math.abs(a1 - a0), Math.abs(b1 - b0)); a1 = a0 + Math.sign(a1 - a0 || 1) * m; b1 = b0 + Math.sign(b1 - b0 || 1) * m; }
      if (sh === "rect") return [[a0, b0], [a1, b0], [a1, b1], [a0, b1]];
      return shift ? [[a0, b0], [a1, b0], [a0, b1]] : [[a0, b0], [a1, b0], [(a0 + a1) / 2, b1]];
    }
    const r = Math.hypot(a1 - a0, b1 - b0); let ph = Math.atan2(b1 - b0, a1 - a0);
    const N = sh === "circle" ? 40 : 6; if (sh === "hex" && shift) ph = Math.round(ph / (Math.PI / 6)) * (Math.PI / 6);
    const out = []; for (let i = 0; i < N; i++) { const w = ph + i * Math.PI * 2 / N; out.push([a0 + Math.cos(w) * r, b0 + Math.sin(w) * r]); }
    return out;
  }
  updateDraw(e) {
    const D = this.draw; e = e || this.lastE; if (!D || !e) return;
    if (D.pl.ground && D.pl.u) { const a = this.rot * DEG, u = new THREE.Vector3(Math.cos(a), 0, -Math.sin(a)); if (u.distanceTo(D.pl.u) > 1e-6) { const P0 = this.from2(D.pl, D.s[0], D.s[1]); D.pl.u = u; D.pl.v = new THREE.Vector3().crossVectors(D.pl.n, u).normalize(); this.collectSnaps(D.pl); D.s = this.to2(D.pl, P0); } }
    const P = this.planeHit(D.pl, e); if (!P) return;
    D.c = this.snap2(D.pl, this.to2(D.pl, P), P, e.altKey);
    D.pts = this.shapePts(D.s, D.c, e.shiftKey);
    this.drawPreview(D.pl, D.pts, 0);
    // Maße
    const s = D.s, c = D.c, sh = this.shape;
    const txt = sh === "rect" || sh === "tri" ? fmtM(Math.abs(c[0] - s[0])) + " × " + fmtM(Math.abs(c[1] - s[1])) + " m" : "r " + fmtM(Math.hypot(c[0] - s[0], c[1] - s[1])) + " m";
    this.label(e, txt + (this.snapHit ? "  ◆" : ""));
  }
  endDraw(e) {
    const D = this.draw; if (!D || !D.pts) { this.cancel(); return; }
    if (area(D.pts) < 0.0025) { this.cancel(); return; }
    // Ziehen beginnt: Achse durch die Mitte der Form, entlang der Normale
    let cx = 0, cy = 0; D.pts.forEach((p) => { cx += p[0]; cy += p[1]; }); cx /= D.pts.length; cy /= D.pts.length;
    D.phase = "pull"; D.anchor = this.from2(D.pl, cx, cy); D.h = 0.02; this.numBuf = "";
    D.s0 = this.lineParam(D, e); D.y0 = e.clientY;
    // Höhen-Einrastwerte: Ebenen aller Ecken entlang der Normale
    const lv = new Set();
    this.world.items.forEach((it) => { const pr = it.prism; pr.pts.forEach((p) => { [0, pr.h].forEach((s) => { const L = pr.at(p[0], p[1], s).sub(D.pl.o).dot(D.pl.n); if (L > 0.05) lv.add(Math.round(L * 1000) / 1000); }); }); });
    ["start", "finish", "test"].forEach((k) => { const m = this.world.map[k]; if (m) { const L = new THREE.Vector3(m.p[0], m.p[1], m.p[2]).sub(D.pl.o).dot(D.pl.n); if (L > 0.05) lv.add(Math.round(L * 1000) / 1000); } });
    D.levels = Array.from(lv);
    this.updatePull(e);
  }
  lineParam(D, e) {
    const r = this.rayOf(e), A = D.anchor, n = D.pl.n, w0 = r.origin.clone().sub(A), b = r.direction.dot(n), d = r.direction.dot(w0), ee = n.dot(w0), den = 1 - b * b;
    if (den < 0.004) return null;
    return (ee - b * d) / den;
  }
  updatePull(e) {
    const D = this.draw; e = e || this.lastE; if (!D || !e) return;
    let h;
    if (this.numBuf) { h = parseFloat(this.numBuf); if (!isFinite(h)) h = D.h; }
    else {
      const s = this.lineParam(D, e);
      if (s == null || D.s0 == null) h = (D.y0 - e.clientY) * this.wpp(D.anchor) * 1.2;
      else h = s - D.s0;
      const snapH = this.wpp(D.anchor.clone().addScaledVector(D.pl.n, Math.max(0, h))) * 9;
      if (e.ctrlKey) h = Math.round(h * 4) / 4;
      else if (!e.altKey) { let best = null, bd = snapH; D.levels.forEach((L) => { const d = Math.abs(L - h); if (d < bd) { bd = d; best = L; } }); if (best != null) h = best; D.snapped = best != null; }
    }
    h = clamp(h, 0.02, 400); D.h = h;
    this.drawPreview(D.pl, D.pts, h);
    this.label(e, (this.numBuf ? this.numBuf + " ▏" : "h " + fmtM(h)) + " m" + (D.snapped && !this.numBuf ? "  ◆" : ""));
  }
  finishPull() {
    const D = this.draw; if (!D || D.phase !== "pull") return;
    const d = { id: uid(), s: this.shape, o: D.pl.o.toArray(), n: D.pl.n.toArray(), u: D.pl.u.toArray(), pts: ccw(D.pts), h: D.h, c: DEFAULT_COLOR };
    this.cancel();
    this.commit(() => this.world.add(d));
    this.save();
  }
  drawPreview(pl, pts, h) {
    this.clearPreview();
    const pr = new Prism({ s: this.shape, o: pl.o.toArray(), n: pl.n.toArray(), u: pl.u.toArray(), pts: pts, h: Math.max(h, 0.001) });
    const g = this.helpers;
    if (h > 0.0015) {
      const m = new THREE.Mesh(pr.geometry(), concrete(DEFAULT_COLOR)); m.castShadow = m.receiveShadow = true; g.add(m); this.prev = [m];
      // Schnitt im Boden (dunkle Fuge) und Oberkante in Akzentfarbe
      const lo = new THREE.Line(loopGeo(pr, 0.004), this.lineCut), hi = new THREE.LineSegments(pr.lines(), this.lineAcc);
      hi.renderOrder = 18; g.add(lo); g.add(hi); this.prev.push(lo, hi);
    } else {
      const fill = new THREE.Mesh(capGeo(pr, 0.004), this.fillAcc), ln = new THREE.Line(loopGeo(pr, 0.006), this.lineAcc); ln.renderOrder = 18;
      g.add(fill); g.add(ln); this.prev = [fill, ln];
    }
  }
  clearPreview() { (this.prev || []).forEach((o) => { this.helpers.remove(o); o.geometry.dispose(); }); this.prev = null; }
  label(e, s) { const d = this.$("#pru-dim"); d.hidden = false; d.textContent = s; const r = this.app.root.getBoundingClientRect(); d.style.left = (e.clientX - r.left + 16) + "px"; d.style.top = (e.clientY - r.top + 14) + "px"; }
  cancel() { this.draw = null; this.clearPreview(); this.numBuf = ""; const d = this.$ && this.$("#pru-dim"); if (d) d.hidden = true; }

  // ---------- Start / Ziel / Test-Start ----------
  applyMark() {
    const M = this.markDrag; const v = { p: [r3(M.p.x), r3(M.p.y), r3(M.p.z)] };
    if (M.kind !== "finish") v.yaw = r3(M.yaw);
    this.world.setMarker(M.kind, v); this.world.setShowTest(true); this.refreshInfo();
  }
  dragMark(e) {
    const M = this.markDrag; if (M.kind === "finish") return;
    const r = this.rayOf(e), den = r.direction.y; if (Math.abs(den) < 1e-5) return;
    const tt = (M.p.y - r.origin.y) / den; if (tt < 0) return;
    const P = r.origin.clone().addScaledVector(r.direction, tt), dx = P.x - M.p.x, dz = P.z - M.p.z;
    if (dx * dx + dz * dz > 0.09) { M.yaw = Math.atan2(dx, dz); this.applyMark(); }
  }

  // ---------- Schleife ----------
  update(dt) {
    const c = this.cam, k = this.keys, sp = c.dist * 1.1 * dt;
    const f = new THREE.Vector3(-Math.sin(c.yaw), 0, -Math.cos(c.yaw)), r = new THREE.Vector3(-f.z, 0, f.x);
    if (k.KeyW) { c.tx += f.x * sp; c.tz += f.z * sp; } if (k.KeyS) { c.tx -= f.x * sp; c.tz -= f.z * sp; }
    if (k.KeyD) { c.tx += r.x * sp; c.tz += r.z * sp; } if (k.KeyA) { c.tx -= r.x * sp; c.tz -= r.z * sp; }
    const cam = this.engine.camera, cp = Math.cos(c.pitch);
    cam.position.set(c.tx + Math.sin(c.yaw) * cp * c.dist, c.ty + Math.sin(c.pitch) * c.dist, c.tz + Math.cos(c.yaw) * cp * c.dist);
    if (cam.position.y < 0.3) cam.position.y = 0.3;
    cam.lookAt(c.tx, c.ty, c.tz);
    if (cam.fov !== 50) { cam.fov = 50; cam.updateProjectionMatrix(); }
    this.engine.focus(new THREE.Vector3(c.tx, c.ty, c.tz));
    this.engine.tick(dt);
    if (this.engine.env.cycle) { this.skyT = (this.skyT || 0) + dt; if (this.skyT > 0.5) { this.skyT = 0; const tv = this.$("#pru-time"); if (tv && document.activeElement !== tv) tv.value = this.engine.env.time; this.$("#pru-tv").textContent = fmtClock(this.engine.env.time); this.world.map.sky.time = r3(this.engine.env.time); } }
    this.saveT = (this.saveT || 0) + dt; if (this.dirty && this.saveT > 1.5) { this.saveT = 0; this.save(); }
  }
  dispose() {
    this.save();
    const cv = this.cv;
    cv.removeEventListener("pointerdown", this.h.down); window.removeEventListener("pointermove", this.h.move); window.removeEventListener("pointerup", this.h.up);
    cv.removeEventListener("wheel", this.h.wheel); cv.removeEventListener("contextmenu", this.h.ctx);
    window.removeEventListener("keyup", this.h.kup); window.removeEventListener("blur", this.h.blur);
    this.clearPreview(); this.engine.scene.remove(this.helpers);
    this.helpers.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    this.world.onChange = null; this.root.remove();
  }
}
function capGeo(pr, off) {
  const a = [], P = pr.pts.map((p) => pr.at(p[0], p[1], off));
  for (let i = 1; i < P.length - 1; i++) a.push(P[0].x, P[0].y, P[0].z, P[i].x, P[i].y, P[i].z, P[i + 1].x, P[i + 1].y, P[i + 1].z);
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(a, 3)); return g;
}
function loopGeo(pr, off) {
  const a = []; pr.pts.concat([pr.pts[0]]).forEach((p) => { const P = pr.at(p[0], p[1], off); a.push(P.x, P.y, P.z); });
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(a, 3)); return g;
}
function fmtM(v) { return (Math.round(v * 100) / 100).toFixed(2).replace(".", PRU.lang === "de" ? "," : "."); }
function fmtClock(h) { h = ((h % 24) + 24) % 24; const H = Math.floor(h), M = Math.floor((h - H) * 60); return (H < 10 ? "0" : "") + H + ":" + (M < 10 ? "0" : "") + M; }
