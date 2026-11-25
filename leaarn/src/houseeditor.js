// ===== houseeditor.js · Haus-Editor: Häuser aus Bauteilen bauen (getrennt vom Map-Editor) =====
// Raster 1 m, Etagen à 2,8 m. Böden, Dach und Möbel sitzen in Zellen, Wände/Fenster/Türen/Giebel auf Zellkanten
// (die Kante unter der Maus wird automatisch gewählt). Häuser werden im Browser gespeichert (Liste) und als
// "Leaarn_Haus_<Name>.txt" exportiert. Lokale Häuser kann der Map-Editor sofort platzieren.
import * as THREE from "three";
import { t, addTexts, L2, tl, clamp, lerp, el, esc, fmt, store, KEYS } from "le/core.js";
import { PARTS, CATS, buildHouse, edgeKey, cellKey, LH, partName, partAt } from "le/houses.js";
import { HOUSES } from "le/haeuser.js";

addTexts({
  hTitle: L2("Haus-Editor", "House editor"), hMenu: L2("Hauptmenü", "Main menu"), hMap: L2("Zum Map-Editor", "To map editor"),
  hName: L2("Name des Hauses", "House name"), hLevel: L2("Etage", "Floor"), hStage: L2("Dachstufe (Höhe der Schräge/des Giebels)", "Roof step (height of slope/gable)"),
  hAbove: L2("Etagen darüber zeigen", "Show floors above"), hList: L2("Meine Häuser (im Browser)", "My houses (in this browser)"),
  hNew: L2("Neues Haus", "New house"), hCopy: L2("Kopie", "Copy"), hDel: L2("Löschen", "Delete"), hExport: L2("Exportieren (.txt)", "Export (.txt)"), hImport: L2("Importieren (.txt)", "Import (.txt)"),
  hStarter: L2("Starterhaus als Vorlage", "Starter house as template"), hSure: L2("Dieses Haus löschen?", "Delete this house?"),
  hInfo: L2("{n} Bauteile · Grundfläche {w} × {d} m · {l} Etage(n)", "{n} parts · footprint {w} × {d} m · {l} floor(s)"),
  hHelp: L2("Linke Maus setzt (Ziehen malt), Rechtsklick oder Umschalt+Links entfernt. Wände: die Kante unter der Maus wird gewählt. R dreht (Giebel: spiegeln). Bild↑/↓ Etage, ,/. Dachstufe, 1–6 Kategorie, 7 Grundstück, Strg+Z/Y.", "Left mouse places (drag paints), right click or Shift+left removes. Walls: the edge under the mouse is used. R rotates (gable: mirror). PgUp/PgDn floor, ,/. roof step, 1–6 category, 7 plot, Ctrl+Z/Y."),
  hCam: L2("Kamera: Q/E halten oder rechte Maus ziehen drehen · mittlere Maus oder Umschalt+rechte verschieben · Rad zoomen · WASD bewegen", "Camera: hold Q/E or right drag rotate · middle mouse or Shift+right pan · wheel zoom · WASD move"),
  hBull: L2("Bulldozer", "Bulldozer"), hPlot: L2("Grundstück", "Plot"),
  hPlotHelp: L2("Linke Maus ziehen: Rechteck zum Grundstück hinzufügen · Umschalt+Ziehen oder Rechtsklick: entfernen. Auf der Map wird das ganze Grundstück flach gemacht, dort wachsen keine Pflanzen.", "Left drag: add a rectangle to the plot · Shift+drag or right click: remove. On the map the whole plot is levelled and no plants grow there."),
  hPlotAuto: L2("Grundstück ums Haus (+2 m)", "Plot around the house (+2 m)"), hPlotClear: L2("Grundstück löschen", "Clear plot"), hPlotSize: L2("{n} m² Grundstück", "{n} m² plot"), hBullOn: L2("Bulldozer: angeklicktes Teil wird abgerissen (Ziehen reißt mehrere ab) · B oder Esc zum Bauen", "Bulldozer: the clicked part is demolished (drag to demolish several) · B or Esc to build"),
  hNote: L2("Für das Spiel: exportieren und mir die .txt schicken – ich mache daraus ein fertiges Haus für den Map-Editor. Häuser aus dieser Liste kannst du im Map-Editor (Werkzeug Häuser) schon jetzt als „lokal“ platzieren und testen.", "For the game: export and send me the .txt – I turn it into a finished house for the map editor. Houses from this list can already be placed in the map editor (houses tool) as “local” for testing."),
  hDone: L2("Exportiert: {f}", "Exported: {f}"), hBad: L2("Datei konnte nicht gelesen werden.", "The file could not be read."), hLoaded: L2("Geladen: {n}", "Loaded: {n}"),
  hFence: L2("Zaun ums Grundstück", "Fence around the plot"), hHedge: L2("Hecke ums Grundstück", "Hedge around the plot"), hGClear: L2("Zaun und Hecke entfernen", "Remove fence and hedge"),
  hGNote: L2("Baut Zaun oder Hecke automatisch auf den Rand des Grundstücks (ohne Grundstück: erst ums Haus +2 m). Vor der Haustür bleiben 2 m als Eingang frei.", "Builds a fence or hedge along the plot edge (no plot yet: around the house +2 m first). 2 m in front of the front door stay open as an entrance."),
  hGDone: L2("{n} m gebaut, Eingang vor der Tür frei", "{n} m built, entrance in front of the door left open"),
  hRot: L2("Drehung", "Rotation"), hMirror: L2("gespiegelt", "mirrored"), hPart: L2("Bauteil", "Part")
});

const DEF_HOUSE = () => ({ v: 1, name: "Neues Haus", parts: [] });
// Platz eines Bauteils (ein Teil je Platz, Neues ersetzt Altes)
function slot(p) {
  const d = PARTS[p[0]]; if (!d) return "?";
  if (d.kind === "wall") return "w" + edgeKey(p[1], p[2], p[3], p[4]);
  if (d.kind === "gable") return "g" + edgeKey(p[1], p[2], p[3], p[4]) + "," + (p[5] | 0);
  if (d.kind === "roof") return "r" + cellKey(p[1], p[2], p[4]) + "," + (d.flat ? "f" : p[5] | 0);
  if (d.kind === "floor") return "f" + cellKey(p[1], p[2], p[4]);
  return "o" + cellKey(p[1], p[2], p[4]);
}

export class HouseEditor {
  constructor(app) {
    this.app = app; this.eng = app.engine; this.world = app.world;
    const u = store.get(KEYS.ui, {});
    this.s = Object.assign({ cat: "wall", part: "wand-putz", lv: 0, st: 0, rot: 0, mir: 0, above: false, cur: 0, bull: false }, u.he || {});
    this.cam = Object.assign({ x: 2, y: 0, z: 1.5, dist: 13, yaw: 0.7, pitch: 0.85 }, u.hcam || {});
    this.list = store.get(KEYS.houses, []); if (!Array.isArray(this.list) || !this.list.length) this.list = [JSON.parse(JSON.stringify(HOUSES.starter.d))];
    this.s.cur = clamp(this.s.cur, 0, this.list.length - 1);
    this.undo = []; this.redo = []; this.btn = -1; this.ray = new THREE.Raycaster(); this.mouse = new THREE.Vector2(); this.hov = null;
    // Welt ausblenden, eigene Bühne
    this.hid = [this.world.terrain.group, this.world.roadGroup, this.world.veg.group, this.world.houseGroup].map((g) => [g, g.visible]); this.hid.forEach((h) => { h[0].visible = false; });
    this.stage = new THREE.Group(); this.eng.scene.add(this.stage);
    const gp = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshLambertMaterial({ color: 0x6F7C5C })); gp.rotation.x = -Math.PI / 2; gp.position.y = -0.02; gp.receiveShadow = true; this.stage.add(gp);
    this.grid = new THREE.GridHelper(40, 40, 0xC6C5B9, 0x8E9A7C); this.grid.material.transparent = true; this.grid.material.opacity = 0.55; this.stage.add(this.grid);
    this.lvGrid = new THREE.GridHelper(40, 40, 0xED6A5E, 0x62929E); this.lvGrid.material.transparent = true; this.lvGrid.material.opacity = 0.45; this.stage.add(this.lvGrid);
    this.houseG = new THREE.Group(); this.stage.add(this.houseG);
    this.gmat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, transparent: true, opacity: 0.55, depthWrite: false });
    this.ghost = null; this.gkey = "";
    const sq = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0), new THREE.Vector3(1, 0, 1), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0)]);
    this.cellM = new THREE.Line(sq, new THREE.LineBasicMaterial({ color: 0xFFE08A, depthTest: false })); this.cellM.renderOrder = 10; this.stage.add(this.cellM);
    this.edgeM = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(1, 0, 0)]), new THREE.LineBasicMaterial({ color: 0xED6A5E, depthTest: false })); this.edgeM.renderOrder = 11; this.stage.add(this.edgeM);
    this.buildUI(); this.rebuild();
    const c = this.eng.renderer.domElement;
    this.onDown = (e) => this.down(e); this.onMove = (e) => this.move(e); this.onUp = (e) => this.up(e); this.onWheel = (e) => { e.preventDefault(); this.cam.dist = clamp(this.cam.dist * Math.exp(e.deltaY * 0.0012), 3, 80); }; this.onCtx = (e) => e.preventDefault();
    c.addEventListener("pointerdown", this.onDown); window.addEventListener("pointermove", this.onMove); window.addEventListener("pointerup", this.onUp);
    c.addEventListener("wheel", this.onWheel, { passive: false }); c.addEventListener("contextmenu", this.onCtx);
  }
  get def() { return this.list[this.s.cur]; }
  dispose() {
    const c = this.eng.renderer.domElement;
    c.removeEventListener("pointerdown", this.onDown); window.removeEventListener("pointermove", this.onMove); window.removeEventListener("pointerup", this.onUp);
    c.removeEventListener("wheel", this.onWheel); c.removeEventListener("contextmenu", this.onCtx);
    this.stage.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); this.eng.scene.remove(this.stage);
    this.hid.forEach((h) => { h[0].visible = h[1]; }); this.root.remove(); this.saveUI(); this.save();
  }
  saveUI() { const u = store.get(KEYS.ui, {}); u.he = this.s; u.hcam = this.cam; store.set(KEYS.ui, u); }
  save() { store.set(KEYS.houses, this.list); }
  // ---------- Oberfläche ----------
  buildUI() {
    const r = this.root = el("div", "le-ed");
    r.innerHTML = '<div class="le-top"><b>' + t("hTitle") + '</b><span class="le-name" id="le-hname"></span><span class="le-sp"></span>' +
      '<button data-e="undo" title="Strg+Z">↶</button><button data-e="redo" title="Strg+Y">↷</button><button data-e="map">' + t("hMap") + '</button><button data-e="menu">' + t("hMenu") + "</button></div>" +
      '<div class="le-hparts" id="le-hparts"></div><div class="le-panel" id="le-panel"></div>' +
      '<div class="le-status"><span id="le-st"></span><span>' + t("hCam") + "</span></div>" +
      '<input type="file" id="le-hfile" accept=".txt,.json,text/plain" hidden>';
    this.app.ui.appendChild(r);
    r.addEventListener("click", (e) => this.click(e)); r.addEventListener("input", (e) => this.input(e)); r.addEventListener("change", (e) => this.change(e));
    this.panel();
  }
  panel() {
    const s = this.s, d = this.def, P = this.root.querySelector("#le-panel"), L = this.root.querySelector("#le-hparts");
    const seg = (k, opts, cur) => '<div class="le-seg">' + opts.map((o) => '<button data-seg="' + k + '" data-v="' + o[0] + '" aria-pressed="' + (String(cur) === String(o[0])) + '">' + o[1] + "</button>").join("") + "</div>";
    L.innerHTML = '<button class="le-bull" data-e="bull" aria-pressed="' + !!s.bull + '"><i>B</i>' + t("hBull") + "</button>" + '<div class="le-seg le-cats">' + CATS.map((c, i) => '<button data-cat="' + c[0] + '" aria-pressed="' + (s.cat === c[0]) + '"><i>' + (i + 1) + "</i>" + tl(c[1]) + "</button>").join("") + '<button data-cat="plot" class="le-plotb" aria-pressed="' + (s.cat === "plot") + '"><i>' + (CATS.length + 1) + "</i>" + t("hPlot") + "</button></div>" +
      (s.cat === "plot" ? '<div class="le-plist le-plotp"><p>' + t("hPlotHelp") + '</p><p class="le-dim">' + fmt(t("hPlotSize"), { n: (this.def.plot || []).length }) + '</p><button data-e="plotauto">' + t("hPlotAuto") + '</button><button data-e="plotclear">' + t("hPlotClear") + '</button><h4>' + tl(CATS.find((c) => c[0] === "garden")[1]) + '</h4><p class="le-dim">' + t("hGNote") + '</p><button data-e="plotfence">' + t("hFence") + '</button><button data-e="plothedge">' + t("hHedge") + '</button><button data-e="plotgclear">' + t("hGClear") + "</button></div>" :
      '<div class="le-plist">' + Object.keys(PARTS).filter((k) => PARTS[k].cat === s.cat).map((k) => '<button data-part="' + k + '" aria-pressed="' + (s.part === k) + '"><i style="background:' + swatch(k) + '"></i>' + partName(k) + "</button>").join("") + "</div>");
    const b = this.bounds(), lv = new Set(d.parts.map((p) => p[4] | 0));
    let h = "<h3>" + t("hTitle") + '</h3><label class="le-row"><span>' + t("hName") + '</span><input type="text" data-k="name" value="' + esc(d.name || "") + '"></label>' +
      '<div class="le-row"><span>' + t("hLevel") + "</span></div>" + seg("lv", [[0, "0"], [1, "1"], [2, "2"], [3, "3"]], s.lv) +
      '<div class="le-row"><span>' + t("hStage") + "</span></div>" + seg("st", [[0, "0"], [1, "1"], [2, "2"], [3, "3"], [4, "4"]], s.st) +
      '<label class="le-chk"><input type="checkbox" data-k="above"' + (s.above ? " checked" : "") + "> " + t("hAbove") + "</label>" +
      '<p class="le-dim">' + fmt(t("hInfo"), { n: d.parts.length, w: b ? b.w : 0, d: b ? b.d : 0, l: lv.size || 0 }) + "</p>" +
      "<h4>" + t("hList") + '</h4><div class="le-hl">' + this.list.map((x, i) => '<button data-house="' + i + '" aria-pressed="' + (i === s.cur) + '">' + esc(x.name || "?") + "</button>").join("") + "</div>" +
      '<div class="le-btns"><button data-e="new">+ ' + t("hNew") + '</button><button data-e="copy">' + t("hCopy") + '</button><button data-e="del">' + t("hDel") + "</button></div>" +
      '<div class="le-btns le-col"><button data-e="export" class="le-pri">' + t("hExport") + '</button><button data-e="import">' + t("hImport") + '</button><button data-e="starter">' + t("hStarter") + "</button></div>" +
      "<p>" + t("hNote") + "</p><p>" + t("hHelp") + "</p>";
    P.innerHTML = h;
    this.root.querySelector("#le-hname").textContent = d.name || "";
    this.lvGrid.position.y = s.lv * LH + 0.01; this.lvGrid.visible = s.lv > 0;
  }
  status(m) { const e = this.root.querySelector("#le-st"); if (e) e.textContent = m || ""; }
  bounds() {
    const c = this.def.parts.filter((p) => PARTS[p[0]] && PARTS[p[0]].kind === "floor"); if (!c.length) return null;
    let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; c.forEach((p) => { x0 = Math.min(x0, p[1]); z0 = Math.min(z0, p[2]); x1 = Math.max(x1, p[1] + 1); z1 = Math.max(z1, p[2] + 1); });
    return { w: x1 - x0, d: z1 - z0 };
  }
  click(e) {
    const cb = e.target.closest("[data-cat]"); if (cb) { this.setCat(cb.getAttribute("data-cat")); return; }
    const pb = e.target.closest("[data-part]"); if (pb) { this.s.part = pb.getAttribute("data-part"); this.s.bull = false; this.root.classList.remove("le-bullon"); this.panel(); this.saveUI(); return; }
    const hb = e.target.closest("[data-house]"); if (hb) { this.s.cur = +hb.getAttribute("data-house"); this.undo = []; this.redo = []; this.rebuild(); this.panel(); this.saveUI(); return; }
    const sg = e.target.closest("[data-seg]"); if (sg) { this.s[sg.getAttribute("data-seg")] = +sg.getAttribute("data-v"); this.rebuild(); this.panel(); this.saveUI(); return; }
    const b = e.target.closest("[data-e]"); if (!b) return; const a = b.getAttribute("data-e");
    if (a === "bull") { this.setBull(!this.s.bull); return; }
    if (a === "plotfence" || a === "plothedge") { this.push(); const n = this.autoGarden(a === "plotfence" ? "zaun" : "hecke"); this.after2(); this.app.toast(fmt(t("hGDone"), { n: n })); return; }
    if (a === "plotgclear") { this.push(); this.def.parts = this.def.parts.filter((p) => !(PARTS[p[0]] && (PARTS[p[0]].fence || PARTS[p[0]].hedge))); this.after2(); return; }
    if (a === "plotclear") { this.push(); this.def.plot = []; this.plotMesh(); this.save(); this.panel(); return; }
    if (a === "plotauto") { const b = buildHouse(this.def); this.push(); this.def.plot = []; this.plotApply([Math.floor(b.min[0]) - 2, Math.floor(b.min[1]) - 2, Math.ceil(b.max[0]) + 1, Math.ceil(b.max[1]) + 1], false); return; }
    if (a === "undo") this.doUndo(); else if (a === "redo") this.doRedo();
    else if (a === "menu") this.app.go("menu");
    else if (a === "map") this.app.go("editor");
    else if (a === "new") { this.list.push(DEF_HOUSE()); this.s.cur = this.list.length - 1; this.after(); }
    else if (a === "copy") { const c = JSON.parse(JSON.stringify(this.def)); c.name = (c.name || "Haus") + " 2"; this.list.push(c); this.s.cur = this.list.length - 1; this.after(); }
    else if (a === "del") { if (!confirmLite(t("hSure"))) return; this.list.splice(this.s.cur, 1); if (!this.list.length) this.list.push(DEF_HOUSE()); this.s.cur = Math.min(this.s.cur, this.list.length - 1); this.after(); }
    else if (a === "starter") { this.push(); this.def.parts = JSON.parse(JSON.stringify(HOUSES.starter.d.parts)); this.def.plot = JSON.parse(JSON.stringify(HOUSES.starter.d.plot || [])); this.after(); }
    else if (a === "export") { const f = exportHouse(this.def); this.app.toast(fmt(t("hDone"), { f: f })); }
    else if (a === "import") this.root.querySelector("#le-hfile").click();
  }
  input(e) {
    const k = e.target.getAttribute("data-k"); if (!k) return;
    if (k === "name") { this.def.name = e.target.value; this.root.querySelector("#le-hname").textContent = e.target.value; const hb = this.root.querySelector('[data-house="' + this.s.cur + '"]'); if (hb) hb.textContent = e.target.value; this.save(); }
  }
  change(e) {
    const k = e.target.getAttribute("data-k");
    if (k === "above") { this.s.above = e.target.checked; this.rebuild(); this.saveUI(); return; }
    if (e.target.id === "le-hfile" && e.target.files[0]) {
      const f = e.target.files[0]; e.target.value = "";
      f.text().then((txt) => { const d = parseHouse(txt); if (!d) { this.app.toast(t("hBad")); return; } this.list.push(d); this.s.cur = this.list.length - 1; this.after(); this.app.toast(fmt(t("hLoaded"), { n: d.name })); });
    }
  }
  // nach automatischen Änderungen: neu bauen, speichern, Liste aktualisieren
  after2() { this.rebuild(); this.plotMesh(); this.save(); this.panel(); }
  // Zaun/Hecke automatisch auf den Grundstücksrand (Etage 0). Kanten mit Hauswand werden ausgelassen,
  // vor der Haustür bleibt ein 2 m breiter Eingang frei. Gibt die gebauten Meter zurück.
  autoGarden(id) {
    const d = this.def, PS = d.parts;
    if (!(d.plot || []).length) { const b = buildHouse(d), R = [Math.floor(b.min[0]) - 2, Math.floor(b.min[1]) - 2, Math.ceil(b.max[0]) + 1, Math.ceil(b.max[1]) + 1]; d.plot = []; for (let x = R[0]; x <= R[2]; x++) for (let z = R[1]; z <= R[3]; z++) d.plot.push([x, z]); }
    d.parts = PS.filter((p) => !(PARTS[p[0]] && (PARTS[p[0]].fence || PARTS[p[0]].hedge)));
    const plot = new Set(d.plot.map((c) => c[0] + "," + c[1])), walls = new Set(), floors = new Set();
    d.parts.forEach((p) => { const k = PARTS[p[0]]; if (!k || (p[4] | 0) !== 0) return; if (k.kind === "wall") walls.add(edgeKey(p[1], p[2], p[3], 0)); if (k.kind === "floor") floors.add(p[1] + "," + p[2]); });
    const NB = [[0, -1], [1, 0], [0, 1], [-1, 0]], edges = [];
    d.plot.forEach((c) => { for (let r = 0; r < 4; r++) { if (plot.has((c[0] + NB[r][0]) + "," + (c[1] + NB[r][1]))) continue; const k = edgeKey(c[0], c[1], r, 0); if (!walls.has(k)) edges.push([c[0], c[1], r]); } });
    // Eingang: Haustür (erste Tür auf Etage 0) → nach außen zeigende Seite, dort die Randkante(n) direkt davor freilassen
    const door = d.parts.find((p) => PARTS[p[0]] && PARTS[p[0]].door && (p[4] | 0) === 0);
    let r0 = 2, cx = null;
    if (door) { const inC = floors.has(door[1] + "," + door[2]); r0 = inC ? door[3] & 3 : (door[3] + 2) & 3; const E = [[0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5]][door[3] & 3]; cx = [door[1] + E[0], door[2] + E[1]]; }
    const side = edges.filter((e) => e[2] === r0);
    if (side.length) {
      if (!cx) { const xs = side.map((e) => (r0 & 1 ? e[1] : e[0])); const mid = (Math.min(...xs) + Math.max(...xs) + 1) / 2; cx = r0 & 1 ? [0, mid] : [mid, 0]; }
      const lat = (e) => (r0 & 1 ? Math.abs(e[1] + 0.5 - cx[1]) : Math.abs(e[0] + 0.5 - cx[0])), dist = (e) => (r0 & 1 ? Math.abs(e[0] - cx[0]) : Math.abs(e[2] === 0 ? e[1] - cx[1] : e[1] + 1 - cx[1]));
      const front = side.filter((e) => lat(e) < 1.6).sort((a, b) => dist(a) - dist(b) || lat(a) - lat(b));
      const g1 = front[0]; if (g1) { const line = side.filter((e) => (r0 & 1 ? e[0] === g1[0] : e[1] === g1[1])).sort((a, b) => lat(a) - lat(b)); const gap = new Set(line.slice(0, 2).map((e) => e.join(","))); for (let i = edges.length - 1; i >= 0; i--) if (gap.has(edges[i].join(","))) edges.splice(i, 1); }
    }
    edges.forEach((e) => d.parts.push([id, e[0], e[1], e[2], 0]));
    return edges.length;
  }
  setCat(c) { this.s.cat = c; this.s.bull = false; this.root.classList.remove("le-bullon"); if (c !== "plot" && (!PARTS[this.s.part] || PARTS[this.s.part].cat !== c)) this.s.part = Object.keys(PARTS).find((k) => PARTS[k].cat === c); this.panel(); this.saveUI(); this.gkey = ""; }
  after() { this.undo = []; this.redo = []; this.save(); this.rebuild(); this.panel(); this.saveUI(); }
  // ---------- Rückgängig ----------
  snap() { return JSON.stringify({ p: this.def.parts, pl: this.def.plot || [] }); }
  unsnap(j) { const o = JSON.parse(j); this.def.parts = o.p; this.def.plot = o.pl; }
  push() { this.undo.push(this.snap()); if (this.undo.length > 60) this.undo.shift(); this.redo = []; }
  doUndo() { if (!this.undo.length) return; this.redo.push(this.snap()); this.unsnap(this.undo.pop()); this.save(); this.rebuild(); this.panel(); }
  doRedo() { if (!this.redo.length) return; this.undo.push(this.snap()); this.unsnap(this.redo.pop()); this.save(); this.rebuild(); this.panel(); }
  // ---------- Haus neu bauen ----------
  rebuild() {
    while (this.houseG.children.length) { const c = this.houseG.children.pop(); c.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); }
    const b = buildHouse(this.def); this.houseG.add(b.group);
    Object.keys(b.levels).forEach((l) => { b.levels[l].visible = this.s.above || +l <= this.s.lv; });
    b.doors.forEach((d) => { d.pivot.visible = this.s.above || d.l <= this.s.lv; });
    this.plotMesh();
  }
  // Grundstück als halb durchsichtige Fläche am Boden (+ Rand), Vorschau-Rechteck beim Ziehen
  plotMesh(prev) {
    if (!this.plotG) { this.plotG = new THREE.Group(); this.stage.add(this.plotG); }
    while (this.plotG.children.length) { const c = this.plotG.children.pop(); c.geometry.dispose(); }
    const cells = (this.def.plot || []).map((c) => [c[0], c[1]]), on = this.s.cat === "plot";
    const add = (list, col, op, y) => {
      if (!list.length) return; const P = [];
      list.forEach((c) => { const x = c[0], z = c[1]; P.push(x, y, z, x, y, z + 1, x + 1, y, z, x + 1, y, z, x, y, z + 1, x + 1, y, z + 1); });
      const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3));
      const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide })); m.renderOrder = 3; this.plotG.add(m);
    };
    add(cells, 0x62929E, on ? 0.45 : 0.22, 0.012);
    if (prev) { const L = []; for (let x = prev[0]; x <= prev[2]; x++) for (let z = prev[1]; z <= prev[3]; z++) L.push([x, z]); add(L, prev[4] ? 0xED6A5E : 0xC6C5B9, 0.5, 0.02); }
  }
  plotRect(a, b) { return [Math.min(a.x, b.x), Math.min(a.z, b.z), Math.max(a.x, b.x), Math.max(a.z, b.z)]; }
  plotApply(R, del) {
    const set = new Map((this.def.plot || []).map((c) => [c[0] + "," + c[1], c]));
    for (let x = R[0]; x <= R[2]; x++) for (let z = R[1]; z <= R[3]; z++) { const k = x + "," + z; if (del) set.delete(k); else set.set(k, [x, z]); }
    this.def.plot = Array.from(set.values()); this.plotMesh(); this.save(); this.panel();
  }
  // ---------- Maus ----------
  hoverAt(cx, cy) {
    const r = this.eng.renderer.domElement.getBoundingClientRect();
    this.mouse.set((cx - r.left) / r.width * 2 - 1, -((cy - r.top) / r.height) * 2 + 1); this.ray.setFromCamera(this.mouse, this.eng.camera);
    const y0 = this.s.cat === "plot" ? 0 : this.s.lv * LH, o = this.ray.ray.origin, d = this.ray.ray.direction; if (Math.abs(d.y) < 1e-4) return null;
    const k = (y0 - o.y) / d.y; if (k < 0) return null;
    const px = o.x + d.x * k, pz = o.z + d.z * k; if (Math.abs(px) > 20 || Math.abs(pz) > 20) return null;
    const x = Math.floor(px), z = Math.floor(pz), fx = px - x, fz = pz - z, dd = [fz, 1 - fx, 1 - fz, fx], m = Math.min(...dd);
    return { x: x, z: z, px: px, pz: pz, edge: dd.indexOf(m) };
  }
  cand(h) {
    const s = this.s, d = PARTS[s.part]; if (!h || !d) return null;
    if (d.kind === "wall") return [s.part, h.x, h.z, h.edge, s.lv];
    if (d.kind === "gable") return [s.part, h.x, h.z, h.edge, s.lv, s.st, s.mir];
    if (d.kind === "roof") return d.flat ? [s.part, h.x, h.z, 0, s.lv] : [s.part, h.x, h.z, s.rot & 3, s.lv, s.st];
    if (d.kind === "floor") return [s.part, h.x, h.z, 0, s.lv];
    return [s.part, h.x, h.z, s.rot & 3, s.lv];
  }
  place(c) {
    if (!c) return false; const k = slot(c), P = this.def.parts, i = P.findIndex((p) => slot(p) === k);
    if (i >= 0 && JSON.stringify(P[i]) === JSON.stringify(c)) return false;
    if (i >= 0) P.splice(i, 1); P.push(c); return true;
  }
  remove(h) {
    if (!h) return false; const s = this.s, P = this.def.parts, cat = s.cat;
    // in der gewählten Kategorie das Teil an dieser Stelle (Wände: Kante unter der Maus)
    const ek = edgeKey(h.x, h.z, h.edge, s.lv), ck = cellKey(h.x, h.z, s.lv);
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i], d = PARTS[p[0]]; if (!d || d.cat !== cat || (p[4] | 0) !== s.lv) continue;
      const hit = d.kind === "wall" || d.kind === "gable" ? edgeKey(p[1], p[2], p[3], p[4]) === ek : cellKey(p[1], p[2], p[4]) === ck;
      if (hit) { P.splice(i, 1); return true; }
    }
    return false;
  }
  // ---------- Bulldozer: Teil unter der Maus finden (echte Treffer auf den Netzen) und abreißen ----------
  setBull(on) { this.s.bull = on; this.gkey = ""; this.panel(); this.saveUI(); this.root.classList.toggle("le-bullon", on); if (on) this.status(t("hBullOn")); }
  pick(cx, cy) {
    const r = this.eng.renderer.domElement.getBoundingClientRect();
    this.mouse.set((cx - r.left) / r.width * 2 - 1, -((cy - r.top) / r.height) * 2 + 1); this.ray.setFromCamera(this.mouse, this.eng.camera);
    const meshes = []; this.houseG.traverseVisible((o) => { if (o.isMesh) meshes.push(o); });
    for (const hit of this.ray.intersectObjects(meshes, false)) {
      const pi = hit.object.userData.pi != null ? hit.object.userData.pi : partAt(hit.object, hit.faceIndex);
      if (pi >= 0 && this.def.parts[pi]) return pi;
    }
    return -1;
  }
  bulldoze(cx, cy) { const pi = this.pick(cx, cy); if (pi < 0) return false; this.def.parts.splice(pi, 1); this.rebuild(); this.gkey = ""; return true; }
  down(e) {
    this.btn = e.button; this.last = [e.clientX, e.clientY]; this.d0 = [e.clientX, e.clientY];
    const ae = document.activeElement; if (ae && ae !== document.body && ae.blur) ae.blur();
    if (e.button !== 0) return;
    if (this.s.bull) { this.push(); this.painted = this.bulldoze(e.clientX, e.clientY); return; }
    if (this.s.cat === "plot") { const h = this.hoverAt(e.clientX, e.clientY); if (h) { this.push(); this.pdrag = { a: h, del: e.shiftKey }; this.plotMesh(this.plotRect(h, h).concat([e.shiftKey ? 1 : 0])); } return; }
    const h = this.hoverAt(e.clientX, e.clientY); this.push(); this.painted = false;
    this.erase = e.shiftKey;
    if (this.apply(h)) this.painted = true;
  }
  apply(h) {
    const ok = this.erase ? this.remove(h) : this.place(this.cand(h));
    if (ok) { this.rebuild(); this.dirty = true; }
    return ok;
  }
  move(e) {
    this.cx = e.clientX; this.cy = e.clientY;
    if (this.btn === 2 || this.btn === 1) {
      const dx = e.clientX - this.last[0], dy = e.clientY - this.last[1]; this.last = [e.clientX, e.clientY]; const c = this.cam;
      if (this.btn === 1 || e.shiftKey) { const k = c.dist * 0.0016, co = Math.cos(c.yaw), si = Math.sin(c.yaw); c.x += (-co * dx - si * dy) * k; c.z += (si * dx - co * dy) * k; }
      else { c.yaw -= dx * 0.005; c.pitch = clamp(c.pitch + dy * 0.004, 0.08, 1.5); }
      return;
    }
    if (this.btn === 0 && this.pdrag) { const h = this.hoverAt(e.clientX, e.clientY); if (h) { this.pdrag.b = h; this.plotMesh(this.plotRect(this.pdrag.a, h).concat([this.pdrag.del ? 1 : 0])); } return; }
    if (this.btn === 0 && this.s.bull) { if (this.bulldoze(e.clientX, e.clientY)) this.painted = true; return; }
    if (this.btn === 0) { const h = this.hoverAt(e.clientX, e.clientY); if (this.apply(h)) this.painted = true; }
  }
  up(e) {
    if (this.btn === 0 && this.pdrag) { this.plotApply(this.plotRect(this.pdrag.a, this.pdrag.b || this.pdrag.a), this.pdrag.del); this.pdrag = null; this.btn = -1; return; }
    if (this.btn === 2 && this.s.cat === "plot" && this.d0 && Math.hypot(e.clientX - this.d0[0], e.clientY - this.d0[1]) < 5) { const h = this.hoverAt(e.clientX, e.clientY); if (h) { this.push(); this.plotApply([h.x, h.z, h.x, h.z], true); } this.btn = -1; return; }
    if (this.btn === 0) { if (!this.painted) this.undo.pop(); else { this.save(); this.panel(); } }
    if (this.btn === 2 && this.d0 && Math.hypot(e.clientX - this.d0[0], e.clientY - this.d0[1]) < 5) {   // Rechtsklick ohne Ziehen: entfernen
      const h = this.hoverAt(e.clientX, e.clientY); this.push(); if (this.remove(h)) { this.rebuild(); this.save(); this.panel(); } else this.undo.pop();
    }
    this.btn = -1; this.saveUI();
  }
  key(e) {
    if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return false;
    if ((e.ctrlKey || e.metaKey) && e.code === "KeyZ") { e.shiftKey ? this.doRedo() : this.doUndo(); return true; }
    if ((e.ctrlKey || e.metaKey) && e.code === "KeyY") { this.doRedo(); return true; }
    const n = parseInt(e.key, 10); if (n >= 1 && n <= CATS.length && !e.ctrlKey) { this.setCat(CATS[n - 1][0]); return true; }
    if (n === CATS.length + 1 && !e.ctrlKey) { this.setCat("plot"); return true; }
    if (e.code === "KeyB" && !e.ctrlKey) { this.setBull(!this.s.bull); return true; }
    if (e.code === "Escape" && this.s.bull) { this.setBull(false); return true; }
    if (e.code === "KeyQ" || e.code === "KeyE") return true;   // Kamera drehen (gehalten, siehe update)
    if (e.code === "KeyR") { const d = PARTS[this.s.part]; if (d && d.kind === "gable") this.s.mir = this.s.mir ? 0 : 1; else this.s.rot = (this.s.rot + (e.shiftKey ? 3 : 1)) & 3; this.gkey = ""; this.saveUI(); return true; }
    if (e.code === "PageUp" || e.code === "PageDown") { this.s.lv = clamp(this.s.lv + (e.code === "PageUp" ? 1 : -1), 0, 3); this.rebuild(); this.panel(); this.saveUI(); return true; }
    if (e.code === "Comma" || e.code === "Period") { this.s.st = clamp(this.s.st + (e.code === "Period" ? 1 : -1), 0, 4); this.panel(); this.gkey = ""; this.saveUI(); return true; }
    if (e.code === "Escape") { this.app.go("menu"); return true; }
    return false;
  }
  update(dt) {
    const c = this.cam, inp = this.app.input, sp = (inp.k("ShiftLeft", "ShiftRight") ? 3 : 1) * c.dist * 0.9 * dt, ae = document.activeElement;
    if (!ae || !/INPUT|TEXTAREA|SELECT/.test(ae.tagName) || ae.type === "range" || ae.type === "checkbox") {
      const f = (inp.k("KeyW") ? 1 : 0) - (inp.k("KeyS") ? 1 : 0), s = (inp.k("KeyD") ? 1 : 0) - (inp.k("KeyA") ? 1 : 0);
      if (f || s) { const sx = Math.sin(c.yaw), sz = Math.cos(c.yaw); c.x += (-sx * f + sz * s) * sp; c.z += (-sz * f - sx * s) * sp; }
      const rot = (inp.k("KeyQ") ? 1 : 0) - (inp.k("KeyE") ? 1 : 0); if (rot) c.yaw += rot * 1.9 * dt;   // Q/E halten: Kamera um den Blickpunkt drehen
    }
    c.x = clamp(c.x, -20, 20); c.z = clamp(c.z, -20, 20); c.y = lerp(c.y, this.s.lv * LH, 1 - Math.exp(-dt * 6));
    const cam = this.eng.camera, cp = Math.cos(c.pitch);
    cam.position.set(c.x + Math.sin(c.yaw) * cp * c.dist, c.y + Math.sin(c.pitch) * c.dist, c.z + Math.cos(c.yaw) * cp * c.dist);
    if (cam.position.y < 0.3) cam.position.y = 0.3;
    cam.lookAt(c.x, c.y, c.z); if (cam.fov !== 50) { cam.fov = 50; cam.updateProjectionMatrix(); }
    this.eng.focus(new THREE.Vector3(c.x, 0, c.z));
    if (this.s.bull) { this.bullHover(); return; }
    if (this.s.cat === "plot") { const hh = this.btn < 0 ? this.hoverAt(this.cx || -9999, this.cy || -9999) : null; this.edgeM.visible = false; this.cellM.visible = !!hh; if (hh) this.cellM.position.set(hh.x, 0.03, hh.z); if (this.ghost && this.gkey !== "plot") { this.ghost.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); this.stage.remove(this.ghost); this.ghost = null; } this.gkey = "plot"; return; }
    // Vorschau des Bauteils unter der Maus
    const h = this.btn < 0 || this.btn === 0 ? this.hoverAt(this.cx || -9999, this.cy || -9999) : null, cd = this.cand(h), y0 = this.s.lv * LH;
    this.cellM.visible = this.edgeM.visible = !!h;
    if (h) {
      this.cellM.position.set(h.x, y0 + 0.02, h.z);
      const E = [[0, 0, 1, 0], [1, 0, 1, 1], [0, 1, 1, 1], [0, 0, 0, 1]][h.edge], d = PARTS[this.s.part], isE = d && (d.kind === "wall" || d.kind === "gable");
      this.edgeM.visible = isE; if (isE) { const a = this.edgeM.geometry.attributes.position; a.setXYZ(0, h.x + E[0], y0 + 0.04, h.z + E[1]); a.setXYZ(1, h.x + E[2], y0 + 0.04, h.z + E[3]); a.needsUpdate = true; this.edgeM.geometry.computeBoundingSphere(); }
    }
    const key = cd && !this.erase ? JSON.stringify(cd) : "";
    if (key !== this.gkey) {
      this.gkey = key; if (this.ghost) { this.ghost.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); this.stage.remove(this.ghost); this.ghost = null; }
      if (cd) { const b = buildHouse({ parts: [cd] }, { mat: this.gmat }); this.ghost = b.group; this.ghost.traverse((o) => { if (o.isMesh) { o.material = this.gmat; o.castShadow = false; } }); this.stage.add(this.ghost); }
      if (cd) { const d = PARTS[cd[0]]; this.status(t("hPart") + ": " + partName(cd[0]) + " · " + t("hLevel") + " " + this.s.lv + (d.kind === "roof" && !d.flat || d.kind === "gable" ? " · " + t("hStage").split(" (")[0] + " " + this.s.st : "") + (d.kind === "obj" || (d.kind === "roof" && !d.flat) ? " · " + t("hRot") + " " + (this.s.rot & 3) * 90 + "°" : "") + (d.kind === "gable" && this.s.mir ? " · " + t("hMirror") : "")); }
    }
  }
}
// Bulldozer-Vorschau: das Teil unter der Maus rot hervorheben
HouseEditor.prototype.bullHover = function () {
  this.cellM.visible = this.edgeM.visible = false;
  const pi = this.btn <= 0 && this.cx != null ? this.pick(this.cx, this.cy) : -1, p = this.def.parts[pi], key = p ? "bull" + pi + JSON.stringify(p) + this.def.parts.length : "bull";
  if (key === this.gkey) return; this.gkey = key;
  if (this.ghost) { this.ghost.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); this.stage.remove(this.ghost); this.ghost = null; }
  if (!this.rmat) this.rmat = new THREE.MeshBasicMaterial({ color: 0xED6A5E, transparent: true, opacity: 0.55, depthTest: false });
  if (p) {
    const b = buildHouse({ parts: [p] }); this.ghost = b.group; this.ghost.traverse((o) => { if (o.isMesh) { o.material = this.rmat; o.renderOrder = 20; o.castShadow = false; } }); this.stage.add(this.ghost);
    this.status(t("hBull") + ": " + partName(p[0]) + " · " + t("hLevel") + " " + (p[4] | 0));
  } else this.status(t("hBullOn"));
};
// Farbmuster für die Bauteil-Liste
function swatch(k) { const d = PARTS[k]; return d.c || ({ schreibtisch: "#8A6142", stuhl: "#62929E", bett: "#F2F0EA", regal: "#5E4330", schrank: "#8A6142", sofa: "#62929E", tisch: "#8A6142", kuehlschrank: "#F2F0EA", lampe: "#F3E3B4", pflanze: "#5D8A4E", teppich: "#ED6A5E" })[k] || "#888"; }
export function exportHouse(d) {
  const fn = (d.name || "Haus").replace(/[^\wäöüÄÖÜß\- ]+/g, "").replace(/\s+/g, "_");
  const blob = new Blob([JSON.stringify({ v: 1, name: d.name, parts: d.parts, plot: d.plot || [] })], { type: "text/plain" }), url = URL.createObjectURL(blob), a = document.createElement("a");
  a.href = url; a.download = "Leaarn_Haus_" + fn + ".txt"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 15000);
  return a.download;
}
export function parseHouse(txt) {
  try { const o = JSON.parse(txt); if (!o || !Array.isArray(o.parts)) return null; return { v: 1, name: String(o.name || "Haus"), parts: o.parts.filter((p) => Array.isArray(p) && PARTS[p[0]]), plot: Array.isArray(o.plot) ? o.plot.filter((c) => Array.isArray(c) && c.length >= 2) : [] }; } catch (e) { return null; }
}
function confirmLite(msg) { try { return window.confirm(msg); } catch (e) { return true; } }
