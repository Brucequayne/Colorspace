// ===== animed.js · Animations-Editor (seit v0.22): alle Animationen ansehen und die Körperhaltung je Animation einstellen =====
// Vorschau: Laufband (Stehen, Gehen, Laufen, Sprinten, Ducken) oder Prüfstrecke (eigene kleine Welt mit Stämmen, Stufen, Treppen, Kasten, Wand, Kante),
// auf der ein Bot die gewählte Animation in Schleife vorführt – mit derselben Bewegung (move.js) und Animation (runner.js) wie im Testlauf.
// Einstellbar je Animation: Vorneigung, Hüfthöhe und je Körperteil eine Zusatz-Drehung (vor/zurück, drehen, seitlich), Paare gespiegelt.
// Dazu die allgemeinen Animations-Faktoren (wie im Tweaker). Gespeichert unter KEYS.pose, Export PolyRunner_Animationen.json → Claude macht es zum Standard.
import * as THREE from "three";
import { t, addTexts, L2, el, esc, store, KEYS, clamp, damp, download, PRU } from "pru/core.js";
import { Runner, ANIM, ANIM_DEF, POSE, POSE_DEF, POSE_PARTS, setPose, clonePose } from "pru/runner.js";
import { Mover, ScaledWorld, TUNE } from "pru/move.js";
import { loadTune, saveTune, kOf, TW } from "pru/tweak.js";
import { Figur, loadFigur, cloneLook } from "pru/figur.js";
import { World } from "pru/world.js";
import { charCSS } from "pru/chared.js";

addTexts({
  aTitle: L2("Animationen", "Animations"), aHint: L2("Linke Maus: drehen · Rad: zoomen · Leertaste: Pause · Esc: zurück", "Left mouse: orbit · wheel: zoom · Space: pause · Esc: back"),
  aBack: L2("Zurück", "Back"), aExport: L2("Exportieren", "Export"), aImport: L2("Importieren …", "Import …"), aBad: L2("Das sind keine PolyRunner-Animationen.", "These are not PolyRunner animations."),
  aLoaded: L2("Animationen geladen", "Animations loaded"), aActive: L2("läuft gerade zu {p} %", "currently at {p} %"),
  aPose: L2("Haltung", "Posture"), aLean: L2("Vorneigung ganzer Körper", "Forward lean, whole body"), aHip: L2("Hüfthöhe", "Hip height"), aPart: L2("Körperteil", "Body part"),
  aX: L2("vor / zurück", "forward / back"), aY: L2("drehen", "twist"), aZ: L2("seitlich", "sideways"), aPair: L2("Paare: links eingestellt, rechts gespiegelt", "Pairs: set on the left, mirrored on the right"),
  aResetOne: L2("Diese Animation zurücksetzen", "Reset this animation"), aResetAll: L2("Alles auf Standard", "Everything to default"), aResetQ: L2("Alle Haltungen und Faktoren auf Standard zurücksetzen?", "Reset all postures and factors to default?"),
  aGeneral: L2("Allgemein (alle Animationen)", "General (all animations)"), aSlow: L2("Tempo", "Speed"), aFig: L2("Figur", "Figure"), aDummy: L2("Dummy", "Dummy"), aChar: L2("Charakter", "Character"),
  aRestart: L2("Neu starten", "Restart"), aPause: L2("Pause", "Pause"), aChanged: L2("geändert", "changed"),
  aNote: L2("Exportierte Animationen (.json) an Claude schicken, dann werden sie der Standard im Spiel. Im Testlauf gelten sie sofort.", "Send exported animations (.json) to Claude, then they become the game's default. They apply in the test run right away."),
  ag_loco: L2("Laufen", "Locomotion"), ag_terrain: L2("Gelände", "Terrain"), ag_air: L2("Luft", "Air"), ag_parkour: L2("Parkour", "Parkour"),
  an_idle: L2("Stehen", "Stand"), an_walk: L2("Gehen", "Walk"), an_run: L2("Laufen", "Run"), an_sprint: L2("Sprinten", "Sprint"), an_crouch: L2("Ducken", "Crouch"),
  an_rough: L2("Korrekturschritte", "Correction steps"), an_stairsUp: L2("Treppe hoch", "Stairs up"), an_stairsDown: L2("Treppe runter", "Stairs down"), an_hop: L2("Mini-Hüpfer", "Mini hop"), an_swing: L2("Schwung-Klettern", "Swing vault"), an_flank: L2("Mauer-Flanke", "Wall side vault"),
  an_jump: L2("Sprung", "Jump"), an_fall: L2("Fallen", "Fall"), an_land: L2("Landen", "Landing"), an_roll: L2("Abrollen", "Roll"), an_stun: L2("Stolpern", "Stumble"),
  an_slide: L2("Slide", "Slide"), an_getup: L2("Aufstehen", "Get up"), an_wallrun: L2("Wallrun", "Wallrun"), an_climb: L2("Wand hoch", "Wall climb"), an_hang: L2("Hängen", "Hang"),
  an_pullup: L2("Hochziehen", "Pull up"), an_pullover: L2("Hochziehen über Mauer", "Pull over wall"), an_vaultHands: L2("Überklettern (Hände)", "Vault (hands)"), an_vaultStep: L2("Aufsteigen (Fuß)", "Step up (foot)"),
  ap_hips: L2("Becken", "Pelvis"), ap_spine: L2("Bauch", "Belly"), ap_chest: L2("Brust", "Chest"), ap_neck: L2("Hals", "Neck"), ap_head: L2("Kopf", "Head"),
  ap_shoulder: L2("Schultern", "Shoulders"), ap_uarm: L2("Oberarme", "Upper arms"), ap_larm: L2("Unterarme", "Forearms"), ap_hand: L2("Hände", "Hands"),
  ap_uleg: L2("Oberschenkel", "Thighs"), ap_lleg: L2("Unterschenkel", "Shins"), ap_foot: L2("Füße", "Feet"),
  af_stride: L2("Schrittlänge", "Stride length"), af_lift: L2("Fuß anheben", "Foot lift"), af_bob: L2("Auf und Ab", "Bounce"), af_lean: L2("Vorneigung (Laufen)", "Lean (running)"), af_roll: L2("Kurvenlage", "Banking"),
  af_arms: L2("Armschwung", "Arm swing"), af_elbow: L2("Ellbogen beugen", "Elbow bend"), af_sway: L2("Hüftschwung", "Hip sway"), af_twist: L2("Oberkörper zum Blick", "Torso to view"), af_spring: L2("Gelenk-Tempo", "Joint speed"), af_damp: L2("Gelenk-Dämpfung", "Joint damping")
});

const GROUPS = { loco: ["idle", "walk", "run", "sprint", "crouch"], terrain: ["rough", "stairsUp", "stairsDown", "hop", "swing", "flank"], air: ["jump", "fall", "land", "roll", "stun"], parkour: ["slide", "getup", "wallrun", "climb", "hang", "pullup", "pullover", "vaultHands"] };
const FACT = [["stride", 0.6, 1.6], ["lift", 0, 2.5], ["bob", 0, 3], ["lean", 0, 3], ["roll", 0, 2.5], ["arms", 0, 2.5], ["elbow", 0, 2], ["sway", 0, 3], ["twist", 0, 2], ["spring", 0.3, 2], ["damp", 0.3, 1.5]];

// ---------- Prüfstrecke (echte Meter): Bahnen entlang +x ----------
const box = (x0, x1, z0, z1, y0, h) => ({ s: "rect", o: [x0, y0, z1], n: [0, 1, 0], u: [1, 0, 0], pts: [[0, 0], [x1 - x0, 0], [x1 - x0, z1 - z0], [0, z1 - z0]], h: h });
const log = (x, r, z0, z1, sink) => { const pts = []; for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; pts.push([Math.cos(a) * r, Math.sin(a) * r]); } return { s: "circle", o: [x, r * (1 - (sink || 0.35)), z0], n: [0, 0, 1], u: [1, 0, 0], pts: pts, h: z1 - z0 }; };
function course() {
  const S = [], A = (d, c) => { d.c = c || "#9EA1A5"; S.push(d); };
  // Bahn A (z 0): Stämme, kleine Stufen, Kasten bis Knie, Kasten bis Hüfte, Treppe hoch und runter
  [[6, 0.1], [6.42, 0.14], [6.9, 0.17], [7.45, 0.12], [7.9, 0.16], [8.45, 0.13]].forEach(([x, r]) => A(log(x, r, -1.4, 1.4), "#8C7B68"));
  A(box(10, 11, -1.4, 1.4, 0, 0.12)); A(box(11.6, 12.4, -1.4, 1.4, 0, 0.18));
  A(box(14.5, 15.7, -1.4, 1.4, 0, 0.38), "#B0A59A"); A(box(19, 20.6, -1.4, 1.4, 0, 0.74), "#B0A59A");
  for (let i = 0; i < 6; i++) A(box(23 + i * 0.3, 27.2, -1.4, 1.4, 0, 0.17 * (i + 1)), "#A8ACB0");
  for (let i = 0; i < 6; i++) A(box(27.2, 29.2 + (5 - i) * 0.3, -1.4, 1.4, 0, 0.17 * (i + 1)), "#A8ACB0");
  // Bahn B (z 7): Sprung auf der Fläche, hoher Block zum Runterfallen (3,6 m), niedriger Block zum Landen (1,6 m)
  A(box(12, 16, 5.6, 8.4, 0, 3.6), "#9AA0A6"); A(box(22, 25, 5.6, 8.4, 0, 1.6), "#9AA0A6");
  // Bahn C (z 14): Wand für den Wallrun (links), Wand frontal zum Hochlaufen
  A(box(4, 22, 15.2, 15.6, 0, 3.2), "#A3A7AB"); A(box(30, 31, 12.4, 15.6, 0, 3.4), "#A3A7AB");
  // Bahn D (z 21): Kante zum Greifen (2 m), Kasten 1 m (Hände)
  A(box(9, 11, 19.6, 22.4, 0, 2.0), "#A3A7AB"); A(box(19, 20.4, 19.6, 22.4, 0, 1.0), "#B0A59A");
  // Bahn E (z 28, seit v0.23): dünne Mauern – niedrig (Flanke) und hoch (hängen, drüberziehen)
  A(box(12, 12.08, 26.6, 29.4, 0, 0.84), "#9EA1A5"); A(box(24, 24.18, 26.6, 29.4, 0, 2.0), "#9EA1A5");
  return { format: "polyrunner-map", v: 1, id: "pruefstrecke", name: "Prüfstrecke", sky: { time: 15.2, cycle: false, speed: 1 }, start: null, finish: null, test: null, structs: S };
}
// Vorführung je Animation: Laufband (tm = Tempo in 1,8-m-Einheiten) oder Bahn (z), Start (x, y), Ende x, Tasten
const DEMO = {
  idle: { tm: 0 }, walk: { tm: 1.6 }, run: { tm: "run" }, sprint: { tm: "sprint" }, crouch: { tm: 1.6, crouch: true },
  rough: { z: 0, x: 3, end: 10.2 }, stairsUp: { z: 0, x: 21, end: 25.8 }, stairsDown: { z: 0, x: 25.6, y: 1.03, end: 32.5 },
  hop: { z: 0, x: 12.6, end: 17, lmb: true }, swing: { z: 0, x: 16, end: 21.8, lmb: true },
  jump: { z: 7, x: 0, end: 9, jumpX: 3.2 }, land: { z: 7, x: 22.5, y: 1.6, end: 30 }, fall: { z: 7, x: 12.5, y: 3.6, end: 21 },
  roll: { z: 7, x: 12.5, y: 3.6, end: 22, roll: 0.42 }, stun: { z: 7, x: 12.5, y: 3.6, end: 21 },
  slide: { z: 7, x: -8, end: 6, sprint: true, slideX: -1 }, getup: { z: 7, x: -8, end: 6, sprint: true, slideX: -1 },
  wallrun: { far: 1, z: 14.85, x: 0, end: 23, sprint: true, jumpX: 3.6 }, climb: { far: 1, z: 14, x: 22.5, end: 31, sprint: true, jumpX: 28.6 },
  hang: { far: 1, z: 21, x: 3, end: 12, sprint: false, jumpX: 7.9, pullT: 2.2 }, pullup: { far: 1, z: 21, x: 3, end: 12, jumpX: 7.9, pullT: 0.9 },
  vaultHands: { far: 1, z: 21, x: 13.5, end: 22, jumpX: 18.1 },
  flank: { z: 28.2, x: 6, end: 16.5, lmb: true }, pullover: { far: 1, z: 28, x: 18, end: 28, jumpX: 22.9, pullT: 0.9 }
};

export class AnimEd {
  constructor(app) {
    this.app = app; this.engine = app.engine; this.cv = app.engine.renderer.domElement;
    charCSS();
    if (!document.getElementById("pru-css-anim")) { const s = document.createElement("style"); s.id = "pru-css-anim"; s.textContent = CSS; document.head.appendChild(s); }
    app.world.group.visible = false; this.markVis = Object.values(app.world.markers).map((m) => { const v = m.visible; m.visible = false; return [m, v]; });
    this.envOld = Object.assign({}, this.engine.env); this.engine.setEnv({ time: 15.2, cycle: false });
    loadTune(); setPose(store.get(KEYS.pose, null) || POSE_DEF);
    const u = store.get(KEYS.ui, {}) || {};
    this.sel = u.anSel && DEMO[u.anSel] ? u.anSel : "sprint"; this.part = u.anPart || "spine"; this.slow = 1; this.paused = false; this.figMode = u.fig === "dummy" ? "dummy" : "char";
    // far: Kamera von der anderen Seite (sonst steht die Wand im Bild)
    this.cam = { yaw: DEMO[this.sel].far ? Math.PI - 0.45 : 0.45, pitch: 0.1, dist: 3.3 }; this.camT = Object.assign({}, this.cam); this.camP = null;
    // eigene kleine Welt
    this.mw = new World(this.engine); this.mw.load(course()); Object.values(this.mw.markers).forEach((m) => { m.visible = false; });
    this.k = kOf(); this.sw = new ScaledWorld(this.mw, this.k);
    this.rg = new THREE.Group(); this.rg.scale.setScalar(this.k); this.engine.scene.add(this.rg);
    this.runner = new Runner(this.engine.scene); this.runner.world = this.sw; this.runner.ws = this.k; this.rg.add(this.runner.root);
    this.mover = new Mover(this.sw); this.wind = new THREE.Vector3(); this.inp = { wish: new THREE.Vector3(), jump: false, crouch: false, crouchHeld: false, sprint: false, slide: null, slideHeld: false, lmb: false };
    this.tm = { mode: "idle", speed: 0, acc: 0, lat: 0, land: 0, moveRel: 0, turning: false, back: false, jumpId: 0, jumpBoth: false, twist: 0, vy: 0, airT: 0, up: 0, down: 0, rough: 0 };
    this.buildUI(); this.bind();
    this.restart();
    loadFigur().then((d) => { if (this.dead) return; this.fig = new Figur(this.engine.scene, d, cloneLook(store.get(KEYS.char, null))); this.fig.root.scale.setScalar(TW.size / 1.4); this.syncFig(); }).catch(() => {});
    this.syncFig();
  }
  syncFig() { const c = this.figMode === "char" && !!this.fig; this.runner.setVisible(!c); if (this.fig) this.fig.setVisible(c); }
  saveUI() { const u = store.get(KEYS.ui, {}) || {}; u.anSel = this.sel; u.anPart = this.part; u.fig = this.figMode; store.set(KEYS.ui, u); }
  // ---------- Oberfläche ----------
  buildUI() {
    this.root = el("div", "pru-ce pru-ae",
      '<div class="pru-brand">POLY<b>RUNNER</b><span>' + t("aTitle") + "</span></div>" +
      '<div class="pru-chint">' + esc(t("aHint")) + "</div>" +
      '<div class="pru-right"><button class="pru-tb" data-a="export">' + t("aExport") + '</button><button class="pru-tb" data-a="import">' + t("aImport") + '</button><button class="pru-tb pru-pri" data-a="back">' + t("aBack") + "</button></div>" +
      '<div class="pru-alist" id="pru-alist"></div>' +
      '<div class="pru-cp"><div class="pru-cbody" id="pru-abody"></div></div>' +
      '<div class="pru-cbl"><b>' + t("aSlow") + '</b><div class="pru-seg" id="pru-aslow"></div><b>' + t("aFig") + '</b><div class="pru-seg" id="pru-afig"></div></div>' +
      '<div class="pru-aact" id="pru-aact"></div>' +
      '<input type="file" accept=".json,application/json" id="pru-afile" hidden>');
    this.app.ui.appendChild(this.root);
    this.$ = (q) => this.root.querySelector(q);
    this.render();
  }
  changed(k) { const a = POSE[k]; return !!a && JSON.stringify(a) !== JSON.stringify(clonePose(POSE_DEF)[k] || null); }
  render() {
    const L = this.$("#pru-alist");
    L.innerHTML = Object.keys(GROUPS).map((g) => "<b>" + t("ag_" + g) + "</b>" + GROUPS[g].map((k) => '<button data-an="' + k + '" aria-pressed="' + (k === this.sel) + '">' + esc(t("an_" + k)) + (this.changed(k) ? ' <i title="' + t("aChanged") + '">•</i>' : "") + "</button>").join("")).join("");
    const A = POSE[this.sel] || { lean: 0, hip: 0, parts: {} }, pv = A.parts[this.part] || [0, 0, 0];
    const rng = (key, lab, min, max, step, val, unit) => "<h4>" + lab + ' <em data-aout="' + key + '">' + fmt(val) + unit + '</em></h4><input type="range" data-av="' + key + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + val + '">';
    const pair = (POSE_PARTS.find((p) => p[0] === this.part) || [])[2];
    let h = "<h4 class=\"pru-atit\">" + esc(t("an_" + this.sel)) + "</h4>" +
      "<h4>" + t("aPose") + "</h4>" + rng("lean", t("aLean"), -40, 40, 0.5, A.lean, "°") + rng("hip", t("aHip"), -25, 15, 0.5, A.hip, " cm") +
      "<h4>" + t("aPart") + '</h4><div class="pru-opts pru-aparts">' + POSE_PARTS.map(([p]) => '<button data-ap="' + p + '" aria-pressed="' + (p === this.part) + '">' + esc(t("ap_" + p)) + (A.parts[p] ? " •" : "") + "</button>").join("") + "</div>" +
      rng("x", t("aX"), -90, 90, 0.5, pv[0], "°") + rng("y", t("aY"), -90, 90, 0.5, pv[1], "°") + rng("z", t("aZ"), -90, 90, 0.5, pv[2], "°") + (pair ? "<p>" + t("aPair") + "</p>" : "") +
      '<div class="pru-col"><button data-a="resetone">' + t("aResetOne") + "</button></div>" +
      '<details class="pru-agen"' + (this.genOpen ? " open" : "") + "><summary>" + t("aGeneral") + "</summary>" + FACT.map(([k, mn, mx]) => "<h4>" + t("af_" + k) + ' <em data-aout="f_' + k + '">×' + fmt(ANIM[k], 2) + '</em></h4><input type="range" data-af="' + k + '" min="' + mn + '" max="' + mx + '" step="0.01" value="' + ANIM[k] + '">').join("") + "</details>" +
      '<div class="pru-col"><button data-a="resetall">' + t("aResetAll") + "</button></div><p>" + t("aNote") + "</p>";
    this.$("#pru-abody").innerHTML = h;
    this.$("#pru-aslow").innerHTML = [[1, "1×"], [0.5, "½×"], [0.25, "¼×"], [0.1, "⅒×"]].map(([v, l]) => '<button data-slow="' + v + '" aria-pressed="' + (this.slow === v) + '">' + l + "</button>").join("") + '<button data-a="pause" aria-pressed="' + this.paused + '">' + t("aPause") + '</button><button data-a="restart">' + t("aRestart") + "</button>";
    this.$("#pru-afig").innerHTML = '<button data-fig="dummy" aria-pressed="' + (this.figMode !== "char") + '">' + t("aDummy") + '</button><button data-fig="char" aria-pressed="' + (this.figMode === "char") + '">' + t("aChar") + "</button>";
  }
  save() { clearTimeout(this.st); this.st = setTimeout(() => store.set(KEYS.pose, clonePose(POSE)), 200); }
  setVal(key, v) {
    const k = this.sel, A = POSE[k] || (POSE[k] = { lean: 0, hip: 0, parts: {} });
    if (key === "lean" || key === "hip") A[key] = v;
    else { const p = A.parts[this.part] || (A.parts[this.part] = [0, 0, 0]); p["xyz".indexOf(key)] = v; if (!p.some((x) => x)) delete A.parts[this.part]; }
    if (!A.lean && !A.hip && !Object.keys(A.parts).length) delete POSE[k];
    this.save();
  }
  bind() {
    this.root.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return; const d = b.dataset;
      if (d.an) { const was = DEMO[this.sel]; this.sel = d.an; this.saveUI(); this.render(); this.restart(); const D = DEMO[this.sel]; if (!!D.far !== !!(was && was.far)) this.camT.yaw = D.far ? Math.PI - 0.45 : 0.45; }
      else if (d.ap) { this.part = d.ap; this.saveUI(); this.render(); }
      else if (d.slow) { this.slow = +d.slow; this.render(); }
      else if (d.fig) { this.figMode = d.fig; this.saveUI(); this.syncFig(); this.render(); }
      else if (d.a === "pause") { this.paused = !this.paused; this.render(); }
      else if (d.a === "restart") this.restart();
      else if (d.a === "resetone") { const def = clonePose(POSE_DEF)[this.sel]; if (def) POSE[this.sel] = def; else delete POSE[this.sel]; this.save(); this.render(); }
      else if (d.a === "resetall") { if (confirm(t("aResetQ"))) { setPose(POSE_DEF); Object.assign(ANIM, ANIM_DEF); saveTune(); this.save(); this.render(); } }
      else if (d.a === "export") download("PolyRunner_Animationen.json", JSON.stringify({ format: "polyrunner-anim", v: 1, pose: clonePose(POSE), faktoren: Object.assign({}, ANIM) }, null, 1));
      else if (d.a === "import") this.$("#pru-afile").click();
      else if (d.a === "back") this.back();
    });
    this.root.addEventListener("input", (e) => {
      const i = e.target;
      if (i.dataset.av) { const v = +i.value; this.setVal(i.dataset.av, v); const o = this.root.querySelector('[data-aout="' + i.dataset.av + '"]'); if (o) o.textContent = fmt(v) + (i.dataset.av === "hip" ? " cm" : "°"); }
      else if (i.dataset.af) { const k = i.dataset.af; ANIM[k] = +i.value; saveTune(); const o = this.root.querySelector('[data-aout="f_' + k + '"]'); if (o) o.textContent = "×" + fmt(ANIM[k], 2); }
    });
    this.root.addEventListener("change", (e) => {
      const i = e.target;
      if (i.dataset.av) this.render();   // Punkte (•) in den Listen nachziehen
      if (i.id === "pru-afile") { const f = i.files[0]; if (f) f.text().then((s) => { let o = null; try { o = JSON.parse(s); } catch (x) {} if (!o || o.format !== "polyrunner-anim") { this.app.toast(t("aBad")); return; } setPose(o.pose || {}); if (o.faktoren) { for (const k in o.faktoren) if (k in ANIM && isFinite(o.faktoren[k])) ANIM[k] = +o.faktoren[k]; saveTune(); } store.set(KEYS.pose, clonePose(POSE)); this.render(); this.app.toast(t("aLoaded")); }); i.value = ""; }
    });
    this.root.addEventListener("toggle", (e) => { if (e.target.classList && e.target.classList.contains("pru-agen")) this.genOpen = e.target.open; }, true);
    this.h = {
      down: (e) => { e.preventDefault(); this.drag = { x: e.clientX, y: e.clientY }; },
      move: (e) => { if (!this.drag) return; const dx = e.clientX - this.drag.x, dy = e.clientY - this.drag.y; this.drag.x = e.clientX; this.drag.y = e.clientY; this.camT.yaw -= dx * 0.008; this.camT.pitch = clamp(this.camT.pitch + dy * 0.006, -0.5, 1.2); },
      up: () => { this.drag = null; },
      wheel: (e) => { e.preventDefault(); this.camT.dist = clamp(this.camT.dist * Math.exp(e.deltaY * 0.0012), 1.2, 9); },
      ctx: (e) => e.preventDefault()
    };
    this.cv.addEventListener("mousedown", this.h.down); window.addEventListener("mousemove", this.h.move); window.addEventListener("mouseup", this.h.up);
    this.cv.addEventListener("wheel", this.h.wheel, { passive: false }); this.cv.addEventListener("contextmenu", this.h.ctx);
  }
  back() { this.app.go(this.app.animFrom || "char"); }
  key(e) {
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName) && e.target.type !== "range" && e.target.type !== "checkbox") return false;
    if (e.key === "Escape") { this.back(); return true; }
    if (e.code === "Space") { this.paused = !this.paused; this.render(); return true; }
    return false;
  }
  // ---------- Vorführung ----------
  restart() {
    const D = DEMO[this.sel]; this.dt0 = 0; this.camP = null; this.wait = 0; this.didJump = false; this.didRoll = false; this.didSlide = false; this.pullAt = null;
    if (D.tm != null) { this.mover.spawn([-30 / this.k, 0, -6 / this.k], Math.PI / 2); this.tread = true; return; }
    this.tread = false;
    this.mover.spawn([D.x / this.k, (D.y || 0) / this.k, D.z / this.k], Math.PI / 2);
    this.runner.rag = null;
  }
  update(dt) {
    const step = this.paused ? 0 : dt * this.slow, D = DEMO[this.sel], K = this.k;
    if (this.tread) {
      // Laufband: Runner auf der Stelle, Tempo wie im Spiel
      const v = D.tm === "run" ? TUNE.run : D.tm === "sprint" ? TUNE.sprint : D.tm, S = this.tm;
      S.speed = damp(S.speed, v, 3.5, step); S.mode = D.crouch ? "crouch" : S.speed > 0.05 || v > 0 ? "run" : "idle"; S.sprint = D.tm === "sprint";
      const pos = new THREE.Vector3(-30 / K, 0, -6 / K);
      this.runner.place(pos, Math.PI / 2); if (step > 0) this.runner.update(step, S);
      this.camFollow(pos.clone().multiplyScalar(K), dt);
      if (this.fig && this.figMode === "char") { this.fig.follow(this.runner, K); this.wind.set(-S.speed * K, 0, 0); if (step > 0) this.fig.simulate(step, this.wind); }
    } else {
      const mv = this.mover, inp = this.inp;
      if (step > 0) {
        const x = mv.pos.x * K;
        // geradeaus, dabei die Spur halten
        const dz = D.z - mv.pos.z * K; inp.wish.set(1, 0, clamp(dz * 0.8, -0.5, 0.5)).normalize();
        inp.aim = Math.PI / 2; inp.sprint = !!D.sprint; inp.lmb = !!D.lmb; inp.crouchHeld = false;
        if (this.sel === "hang" || this.sel === "pullup" || this.sel === "pullover") { if (mv.mode === "hang") { inp.wish.set(0, 0, 0); this.pullAt = this.pullAt == null ? 0 : this.pullAt + step; if (this.pullAt > D.pullT) { inp.jump = true; this.pullAt = -9; } } }
        if (D.jumpX != null && !this.didJump && x > D.jumpX) { inp.jump = true; this.didJump = true; }
        if (D.slideX != null && !this.didSlide && x > D.slideX) { inp.slide = "L"; this.didSlide = true; }
        inp.slideHeld = this.didSlide && x < D.slideX + 2.2;
        if (D.roll && !this.didRoll && !mv.grounded && mv.airT > D.roll) { inp.jump = true; this.didRoll = true; }
        const s = mv.update(step, inp); inp.jump = false; inp.slide = null;
        mv.events.length = 0;
        this.runner.place(mv.view, mv.yaw); this.runner.update(step, s);
        if (this.fig && this.figMode === "char") { this.fig.follow(this.runner, K); this.wind.copy(mv.vel).multiplyScalar(-K); this.fig.simulate(step, this.wind); }
        // Ende der Bahn, Beinbruch oder zu lange: kurz warten, neu
        this.dt0 += step;
        if (x > D.end || mv.mode === "broken" || this.dt0 > 14) { this.wait += step; if (this.wait > (mv.mode === "broken" ? 1.6 : 0.5)) this.restart(); }
      }
      this.camFollow(mv.view.clone().multiplyScalar(K), dt);
    }
    // wie stark läuft die gewählte Animation gerade?
    const w = this.runner.pw ? this.runner.pw[this.sel] || 0 : 0;
    this.actW = damp(this.actW || 0, w, 6, dt);
    const act = this.$("#pru-aact"); const txt = t("aActive").replace("{p}", Math.round(this.actW * 100)); if (act.textContent !== txt) act.textContent = txt;
    act.style.setProperty("--w", Math.round(this.actW * 100) + "%");
    this.engine.tick(dt);
  }
  camFollow(p, dt) {
    const c = this.cam, T = this.camT; c.yaw = damp(c.yaw, T.yaw, 10, dt); c.pitch = damp(c.pitch, T.pitch, 10, dt); c.dist = damp(c.dist, T.dist, 8, dt);
    if (!this.camP) this.camP = p.clone(); else { this.camP.x = damp(this.camP.x, p.x, 30, dt); this.camP.y = damp(this.camP.y, p.y, 6, dt); this.camP.z = damp(this.camP.z, p.z, 30, dt); }
    const cam = this.engine.camera, cp = Math.cos(c.pitch), tgt = this.camP.clone(); tgt.y += 0.75;
    cam.fov = 40; cam.near = 0.02; cam.updateProjectionMatrix();
    // Ziel nach links schieben (Feld rechts)
    const off = 0.16 * c.dist, ox = Math.cos(c.yaw) * off, oz = -Math.sin(c.yaw) * off;
    cam.position.set(tgt.x + Math.sin(c.yaw) * cp * c.dist + ox, tgt.y + Math.sin(c.pitch) * c.dist, tgt.z + Math.cos(c.yaw) * cp * c.dist + oz);
    cam.lookAt(tgt.x + ox, tgt.y, tgt.z + oz);
    this.engine.focus(this.camP);
  }
  dispose() {
    this.dead = true; clearTimeout(this.st); store.set(KEYS.pose, clonePose(POSE));
    this.cv.removeEventListener("mousedown", this.h.down); window.removeEventListener("mousemove", this.h.move); window.removeEventListener("mouseup", this.h.up);
    this.cv.removeEventListener("wheel", this.h.wheel); this.cv.removeEventListener("contextmenu", this.h.ctx);
    if (this.fig) this.fig.dispose(); this.runner.dispose(); this.engine.scene.remove(this.rg); this.mw.dispose(); this.root.remove();
    this.app.world.group.visible = true; this.markVis.forEach(([m, v]) => { m.visible = v; });
    this.engine.setEnv({ time: this.envOld.time, cycle: this.envOld.cycle, speed: this.envOld.speed });
    const cam = this.engine.camera; cam.fov = 60; cam.near = 0.08; cam.updateProjectionMatrix();
  }
}
function fmt(v, d) { return (+v).toFixed(d == null ? 1 : d).replace(".", ","); }
const CSS = `
.pru-alist{position:absolute;left:14px;top:76px;bottom:168px;width:168px;overflow:auto;display:flex;flex-direction:column;gap:3px;background:rgba(20,21,24,.88);border:1px solid #3A3D42;padding:8px}
.pru-alist b{color:#A9ACB2;font-size:11px;margin:8px 0 2px;letter-spacing:.03em}.pru-alist b:first-child{margin-top:0}
.pru-alist button{text-align:left;padding:6px 8px!important;font-size:12px!important}.pru-alist i{color:#E2621B;font-style:normal}
.pru-ae .pru-chint{left:196px}
.pru-aact{position:absolute;left:50%;top:14px;transform:translateX(-50%);background:rgba(20,21,24,.86);padding:6px 12px;font-weight:700;color:#ECEAE4;font-variant-numeric:tabular-nums;pointer-events:none!important;background-image:linear-gradient(90deg,rgba(226,98,27,.55) var(--w,0%),transparent var(--w,0%))}
.pru-aparts{grid-template-columns:repeat(3,1fr)!important}.pru-aparts button{font-size:11px!important}
.pru-atit{color:#ECEAE4!important;font-size:15px!important}
.pru-agen{margin-top:12px;border-top:1px solid #3A3D42;padding-top:6px}.pru-agen summary{cursor:pointer;font-weight:700;color:#C6C5B9}
`;
