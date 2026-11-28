// ===== chared.js · Charakter-Editor (seit v0.14, vorerst nur aus dem Map Editor): Haut, Augen, Brauen, Kleidung; Vorschau mit Lauf-Animation =====
// Die Animation kommt vom unsichtbaren Runner (dieselbe wie im Testlauf), die Figur übernimmt die Pose (Figur.follow).
// Aussehen = „Look“ (siehe LOOK_DEFAULT in figur.js), gespeichert unter KEYS.char, Export/Import als .json.
import * as THREE from "three";
import { t, addTexts, L2, el, esc, store, KEYS, clamp, damp, download } from "pru/core.js";
import { Runner } from "pru/runner.js";
import { Figur, loadFigur, cloneLook, LOOK_DEFAULT, SKINS, IRIS, BROWC, EYE_TYPES, BROW_TYPES } from "pru/figur.js";

addTexts({
  cTitle: L2("Charakter", "Character"), cLoading: L2("Figur wird geladen …", "Loading the character …"), cFail: L2("Figur konnte nicht geladen werden", "Could not load the character"),
  cSkin: L2("Haut", "Skin"), cEyes: L2("Augen", "Eyes"), cBrows: L2("Brauen", "Brows"), cClothes: L2("Kleidung", "Clothes"), cHair: L2("Haare", "Hair"),
  cSkinCol: L2("Hautfarbe", "Skin colour"), cCustom: L2("Eigene Farbe", "Custom colour"),
  cPupil: L2("Pupillen-Art", "Pupil style"), cIris: L2("Augenfarbe", "Eye colour"), cISize: L2("Iris-Größe", "Iris size"), cPSize: L2("Pupillen-Größe", "Pupil size"), cShine: L2("Glanzpunkte", "Highlights"),
  e_glanz: L2("Anime", "Anime"), e_rund: L2("Rund", "Round"), e_schlitz: L2("Schlitz", "Slit"), e_stern: L2("Stern", "Star"), e_ring: L2("Ring", "Ring"), e_raute: L2("Raute", "Diamond"), e_leer: L2("Ohne", "None"),
  cBShape: L2("Form", "Shape"), cBCol: L2("Farbe", "Colour"), cBSize: L2("Länge", "Length"), cBThick: L2("Dicke", "Thickness"), cBY: L2("Höhe", "Height"), cBGap: L2("Abstand", "Spacing"), cBTilt: L2("Winkel", "Angle"),
  b_bogen: L2("Bogen", "Arched"), b_gerade: L2("Gerade", "Straight"), b_duenn: L2("Dünn", "Thin"), b_kraeftig: L2("Kräftig", "Bold"), b_wuetend: L2("Wütend", "Angry"), b_besorgt: L2("Besorgt", "Worried"), b_kurz: L2("Kurz", "Short"),
  cBottom: L2("Unten", "Bottom"), cSpeedo: L2("Badehose (Standard)", "Swim briefs (default)"),
  cClothNote: L2("Weitere Kleidung (Tanktop, Shirts, Crop Top, Baggy-Hose, Shorts, Leggings) mit Stoffphysik folgt in v0.16.", "More clothes (tank top, shirts, crop top, baggy trousers, shorts, leggings) with cloth physics follow in v0.16."),
  cHairNote: L2("Haarpinsel mit Gruppen, Haartypen und Haarphysik folgt in v0.15.", "Hair brush with groups, hair types and hair physics follows in v0.15."),
  cAnim: L2("Vorschau", "Preview"), aIdle: L2("Stehen", "Stand"), aWalk: L2("Gehen", "Walk"), aRun: L2("Laufen", "Run"), aSprint: L2("Sprinten", "Sprint"),
  cView: L2("Ansicht", "View"), vBody: L2("Ganz", "Full"), vFace: L2("Gesicht", "Face"), cSpin: L2("Drehen", "Turn"),
  cExport: L2("Exportieren", "Export"), cImport: L2("Importieren …", "Import …"), cReset: L2("Zurücksetzen", "Reset"), cBack: L2("Zum Editor", "To the editor"),
  cResetQ: L2("Aussehen auf den Standard zurücksetzen?", "Reset the look to the default?"), cBad: L2("Das ist keine PolyRunner-Figur.", "This is not a PolyRunner character."), cLoaded: L2("Figur geladen", "Character loaded"),
  cHint: L2("Linke Maus: drehen · Rechte Maus: hoch/runter · Rad: zoomen · Esc: zurück", "Left mouse: orbit · right mouse: up/down · wheel: zoom · Esc: back")
});

const CSS = `
.pru-ce{position:absolute;inset:0}
.pru-cp{position:absolute;right:14px;top:62px;bottom:62px;width:300px;display:flex;flex-direction:column;background:rgba(20,21,24,.92);border:1px solid #3A3D42;backdrop-filter:blur(8px)}
.pru-ctab{display:flex;border-bottom:1px solid #3A3D42}.pru-ctab button{flex:1;border:0!important;background:transparent!important;color:#A9ACB2!important;padding:10px 2px!important;border-bottom:2px solid transparent!important}
.pru-ctab button[aria-pressed=true]{color:#fff!important;border-bottom-color:#E2621B!important}
.pru-cbody{flex:1;overflow:auto;padding:12px 14px 16px}
.pru-cbody h4{margin:14px 0 7px;color:#A9ACB2;font-size:12px;font-weight:700;display:flex;justify-content:space-between}.pru-cbody h4:first-child{margin-top:2px}.pru-cbody h4 em{color:#ECEAE4}
.pru-cbody p{color:#8A8E96;line-height:1.45;margin:10px 0 0}
.pru-sws{display:flex;flex-wrap:wrap;gap:5px}
.pru-opts{display:grid;grid-template-columns:repeat(4,1fr);gap:4px}.pru-opts button{padding:7px 2px!important;font-size:11.5px!important}
.pru-opts canvas{display:block;width:100%;height:auto;margin:0 0 3px;background:#F6F4EF}
.pru-cbl{position:absolute;left:14px;bottom:14px;display:flex;flex-direction:column;gap:6px}
.pru-cbl .pru-seg button{padding:8px 12px!important}.pru-cbl b{align-self:flex-start;background:rgba(20,21,24,.86);color:#C6C5B9;font-size:11px;font-weight:700;padding:3px 7px;letter-spacing:.03em}
.pru-cload{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:rgba(20,21,24,.86);padding:10px 16px;font-weight:700}.pru-cload[hidden]{display:none}
.pru-chint{position:absolute;left:14px;top:52px;color:#ECEAE4;opacity:.75;font-size:11.5px;text-shadow:0 1px 5px rgba(0,0,0,.6);pointer-events:none!important}
`;
const ANIMS = { idle: 0, walk: 1.4, run: 4.2, sprint: 7.2 };
const VIEWS = { body: { ty: 0.72, dist: 2.7, pitch: 0.1 }, face: { ty: 1.27, dist: 0.62, pitch: 0.02 } };
const FAKEWORLD = { ray: (o) => (o.y >= 0 && o.y < 1.25 ? { point: new THREE.Vector3(o.x, 0, o.z) } : null) };

export class CharEd {
  constructor(app) {
    this.app = app; this.engine = app.engine; this.world = app.world; this.cv = app.engine.renderer.domElement;
    if (!document.getElementById("pru-css-char")) { const s = document.createElement("style"); s.id = "pru-css-char"; s.textContent = CSS; document.head.appendChild(s); }
    // Map ausblenden, feste Tageszeit
    this.world.group.visible = false; this.markVis = Object.values(this.world.markers).map((m) => { const v = m.visible; m.visible = false; return [m, v]; });
    this.envOld = Object.assign({}, this.engine.env); this.engine.setEnv({ time: 15.2, cycle: false });
    const ui = store.get(KEYS.ui, {});
    this.tab = ui.ctab || "skin"; this.anim = "idle"; this.spin = false; this.view = "body";
    this.cam = { yaw: 0.45, pitch: 0.1, dist: 2.7, ty: 0.72 }; this.camT = Object.assign({}, this.cam);
    this.look = cloneLook(store.get(KEYS.char, null));
    this.runner = new Runner(this.engine.scene); this.runner.setVisible(false); this.runner.world = FAKEWORLD;
    this.state = { mode: "idle", speed: 0, acc: 0, lat: 0, land: 0, moveRel: 0, turning: false, back: false, jumpId: 0, jumpBoth: false, twist: 0, vy: 0, airT: 0 };
    this.buildUI();
    this.bind();
    loadFigur().then((d) => { if (this.dead) return; this.fig = new Figur(this.engine.scene, d, this.look); this.$("#pru-cload").hidden = true; })
      .catch((e) => { this.$("#pru-cload").textContent = t("cFail") + " (" + (e && e.message) + ")"; });
  }
  // ---------- Oberfläche ----------
  buildUI() {
    this.root = el("div", "pru-ce",
      '<div class="pru-brand">POLY<b>RUNNER</b><span>' + t("cTitle") + "</span></div>" +
      '<div class="pru-chint">' + esc(t("cHint")) + "</div>" +
      '<div class="pru-right"><button class="pru-tb" data-c="export">' + t("cExport") + '</button><button class="pru-tb" data-c="import">' + t("cImport") + '</button>' +
        '<button class="pru-tb" data-c="reset">' + t("cReset") + '</button><button class="pru-tb pru-pri" data-c="back">' + t("cBack") + "</button></div>" +
      '<div class="pru-cp"><div class="pru-ctab">' + ["skin", "eyes", "brows", "clothes", "hair"].map((k) => '<button data-tab="' + k + '">' + t("c" + k[0].toUpperCase() + k.slice(1)) + "</button>").join("") + '</div><div class="pru-cbody" id="pru-cbody"></div></div>' +
      '<div class="pru-cbl"><b>' + t("cAnim") + '</b><div class="pru-seg" id="pru-anim">' + Object.keys(ANIMS).map((k) => '<button data-anim="' + k + '">' + t("a" + k[0].toUpperCase() + k.slice(1)) + "</button>").join("") + "</div>" +
        '<b>' + t("cView") + '</b><div class="pru-seg"><button data-view="body">' + t("vBody") + '</button><button data-view="face">' + t("vFace") + '</button><button data-spin="1">' + t("cSpin") + "</button></div></div>" +
      '<div class="pru-cload" id="pru-cload">' + t("cLoading") + "</div>" +
      '<input type="file" accept=".json,application/json" id="pru-cfile" hidden>');
    this.app.ui.appendChild(this.root);
    this.$ = (q) => this.root.querySelector(q);
    this.renderTab(); this.syncButtons();
  }
  syncButtons() {
    this.root.querySelectorAll("[data-tab]").forEach((b) => b.setAttribute("aria-pressed", String(b.getAttribute("data-tab") === this.tab)));
    this.root.querySelectorAll("[data-anim]").forEach((b) => b.setAttribute("aria-pressed", String(b.getAttribute("data-anim") === this.anim)));
    this.root.querySelectorAll("[data-view]").forEach((b) => b.setAttribute("aria-pressed", String(b.getAttribute("data-view") === this.view)));
    this.$("[data-spin]").setAttribute("aria-pressed", String(this.spin));
  }
  renderTab() {
    const L = this.look, sw = (list, cur, key) => '<div class="pru-sws">' + list.map((c) => '<button class="pru-sw" style="background:' + c + '" data-set="' + key + '" data-v="' + c + '" aria-pressed="' + (c.toLowerCase() === String(cur).toLowerCase()) + '" title="' + c + '"></button>').join("") +
      '<label class="pru-sw pru-cust" title="' + t("cCustom") + '"><input type="color" data-set="' + key + '" value="' + cur + '"></label></div>';
    const rng = (key, lab, min, max, step, val, unit, f) => '<h4>' + t(lab) + ' <em data-out="' + key + '">' + (f ? f(val) : val) + (unit || "") + '</em></h4><input type="range" data-set="' + key + '" data-num="1" min="' + min + '" max="' + max + '" step="' + step + '" value="' + val + '">';
    const opts = (key, list, cur, pre, icon) => '<div class="pru-opts">' + list.map((k) => '<button data-set="' + key + '" data-v="' + k + '" aria-pressed="' + (k === cur) + '">' + (icon ? '<canvas data-icon="' + k + '" width="64" height="40"></canvas>' : "") + t(pre + k) + "</button>").join("") + "</div>";
    const pct = (v) => Math.round(v * 100);
    let h = "";
    if (this.tab === "skin") h = "<h4>" + t("cSkinCol") + "</h4>" + sw(SKINS, L.skin, "skin");
    else if (this.tab === "eyes") h = "<h4>" + t("cPupil") + "</h4>" + opts("eyes.type", EYE_TYPES, L.eyes.type, "e_", true) + "<h4>" + t("cIris") + "</h4>" + sw(IRIS, L.eyes.iris, "eyes.iris") +
      rng("eyes.size", "cISize", 0.7, 1.3, 0.01, L.eyes.size, " %", pct) + rng("eyes.pupil", "cPSize", 0.4, 1.6, 0.01, L.eyes.pupil, " %", pct) +
      '<label class="pru-chk"><input type="checkbox" data-set="eyes.shine"' + (L.eyes.shine ? " checked" : "") + "> " + t("cShine") + "</label>";
    else if (this.tab === "brows") h = "<h4>" + t("cBShape") + "</h4>" + opts("brows.type", BROW_TYPES, L.brows.type, "b_", false) + "<h4>" + t("cBCol") + "</h4>" + sw(BROWC, L.brows.color, "brows.color") +
      rng("brows.size", "cBSize", 0.7, 1.35, 0.01, L.brows.size, " %", pct) + rng("brows.thick", "cBThick", 0.5, 1.8, 0.01, L.brows.thick, " %", pct) +
      rng("brows.y", "cBY", -4, 6, 0.1, L.brows.y, " mm") + rng("brows.gap", "cBGap", -4, 6, 0.1, L.brows.gap, " mm") + rng("brows.tilt", "cBTilt", -18, 18, 0.5, L.brows.tilt, "°");
    else if (this.tab === "clothes") h = "<h4>" + t("cBottom") + '</h4><div class="pru-col"><button aria-pressed="true">' + t("cSpeedo") + "</button></div><p>" + t("cClothNote") + "</p>";
    else h = "<p>" + t("cHairNote") + "</p>";
    this.$("#pru-cbody").innerHTML = h;
    if (this.tab === "eyes") this.drawIcons();
  }
  // kleine Vorschaubilder der Pupillen-Arten
  drawIcons() {
    this.root.querySelectorAll("canvas[data-icon]").forEach((c) => {
      const x = c.getContext("2d"), k = c.getAttribute("data-icon"), cx = 32, cy = 20, s = 15;
      x.fillStyle = "#F6F4EF"; x.fillRect(0, 0, 64, 40); x.fillStyle = this.look.eyes.iris; x.beginPath(); x.ellipse(cx, cy, s * 0.75, s, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = "#111"; x.beginPath(); const p = s * 0.42;
      if (k === "rund" || k === "glanz") x.ellipse(cx, cy, p, p, 0, 0, Math.PI * 2);
      else if (k === "schlitz") x.ellipse(cx, cy, p * 0.26, p * 1.7, 0, 0, Math.PI * 2);
      else if (k === "stern") { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = (i % 2 ? 0.45 : 1.15) * p; x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } x.closePath(); }
      else if (k === "raute") { x.moveTo(cx, cy - p * 1.25); x.lineTo(cx + p * 0.75, cy); x.lineTo(cx, cy + p * 1.25); x.lineTo(cx - p * 0.75, cy); x.closePath(); }
      else if (k === "ring") { x.ellipse(cx, cy, p * 1.05, p * 1.1, 0, 0, Math.PI * 2); x.ellipse(cx, cy, p * 0.6, p * 0.66, 0, 0, Math.PI * 2, true); }
      if (k !== "leer") x.fill("evenodd");
      if (k === "glanz") { x.fillStyle = "#fff"; x.beginPath(); x.ellipse(cx - 4, cy - 6, 3.4, 2.8, -0.4, 0, Math.PI * 2); x.fill(); }
    });
  }
  set(key, v) {
    const p = key.split("."), o = p.length > 1 ? this.look[p[0]] : this.look; o[p[p.length - 1]] = v;
    if (this.fig) this.fig.setLook(this.look);
    clearTimeout(this.saveT); this.saveT = setTimeout(() => store.set(KEYS.char, this.look), 250);
  }
  bind() {
    this.root.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.tab) { this.tab = b.dataset.tab; const u = store.get(KEYS.ui, {}); u.ctab = this.tab; store.set(KEYS.ui, u); this.renderTab(); this.syncButtons(); }
      else if (b.dataset.anim) { this.anim = b.dataset.anim; this.syncButtons(); }
      else if (b.dataset.view) { this.view = b.dataset.view; Object.assign(this.camT, VIEWS[this.view]); this.syncButtons(); }
      else if (b.dataset.spin) { this.spin = !this.spin; this.syncButtons(); }
      else if (b.dataset.set && b.dataset.v != null) { this.set(b.dataset.set, b.dataset.v); this.renderTab(); }
      else if (b.dataset.c) this.action(b.dataset.c);
    });
    this.root.addEventListener("input", (e) => {
      const i = e.target; if (!i.dataset || !i.dataset.set) return;
      if (i.type === "checkbox") this.set(i.dataset.set, i.checked);
      else if (i.dataset.num) { const v = +i.value; this.set(i.dataset.set, v); const o = this.root.querySelector('[data-out="' + i.dataset.set + '"]'); if (o) { const pct = /size|pupil|thick/.test(i.dataset.set); o.textContent = (pct ? Math.round(v * 100) + " %" : v + (/tilt/.test(i.dataset.set) ? "°" : " mm")); } }
      else if (i.type === "color") { this.set(i.dataset.set, i.value); if (/eyes\.iris/.test(i.dataset.set)) this.drawIcons(); this.root.querySelectorAll('.pru-sw[data-set="' + i.dataset.set + '"]').forEach((s) => s.setAttribute("aria-pressed", "false")); }
    });
    this.root.addEventListener("change", (e) => { if (e.target.id === "pru-cfile") this.importFile(e.target.files[0]); });
    this.h = {
      down: (e) => { this.drag = { b: e.button, x: e.clientX, y: e.clientY }; e.preventDefault(); },
      move: (e) => {
        if (!this.drag) return; const dx = e.clientX - this.drag.x, dy = e.clientY - this.drag.y; this.drag.x = e.clientX; this.drag.y = e.clientY;
        if (this.drag.b === 0) { this.camT.yaw -= dx * 0.008; this.camT.pitch = clamp(this.camT.pitch + dy * 0.006, -0.6, 1.2); }
        else this.camT.ty = clamp(this.camT.ty + dy * 0.002 * this.camT.dist, 0.1, 1.6);
      },
      up: () => { this.drag = null; },
      wheel: (e) => { e.preventDefault(); this.camT.dist = clamp(this.camT.dist * Math.exp(e.deltaY * 0.0012), 0.35, 6); },
      ctx: (e) => e.preventDefault()
    };
    this.cv.addEventListener("mousedown", this.h.down); window.addEventListener("mousemove", this.h.move); window.addEventListener("mouseup", this.h.up);
    this.cv.addEventListener("wheel", this.h.wheel, { passive: false }); this.cv.addEventListener("contextmenu", this.h.ctx);
  }
  action(a) {
    if (a === "back") this.app.go("editor");
    else if (a === "reset") { if (confirm(t("cResetQ"))) { this.look = cloneLook(LOOK_DEFAULT); if (this.fig) this.fig.setLook(this.look); store.set(KEYS.char, this.look); this.renderTab(); } }
    else if (a === "export") download("PolyRunner_Figur.json", JSON.stringify(Object.assign({ format: "polyrunner-look" }, this.look), null, 1));
    else if (a === "import") this.$("#pru-cfile").click();
  }
  importFile(f) {
    if (!f) return;
    f.text().then((s) => {
      let o = null; try { o = JSON.parse(s); } catch (e) {}
      if (!o || o.format !== "polyrunner-look") { this.app.toast(t("cBad")); return; }
      this.look = cloneLook(o); if (this.fig) this.fig.setLook(this.look); store.set(KEYS.char, this.look); this.renderTab(); this.app.toast(t("cLoaded"));
    });
    this.$("#pru-cfile").value = "";
  }
  key(e) {
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName) && e.target.type !== "range" && e.target.type !== "checkbox") return false;
    if (e.key === "Escape") { this.app.go("editor"); return true; }
    return false;
  }
  update(dt) {
    // Animation: Runner auf der Stelle (Laufband), Tempo weich angleichen
    const S = this.state, v = ANIMS[this.anim];
    S.speed = damp(S.speed, v, 3.5, dt); S.mode = S.speed > 0.05 || v > 0 ? "run" : "idle";
    this.runner.place(new THREE.Vector3(0, 0, 0), 0); this.runner.update(dt, S);
    if (this.fig) this.fig.follow(this.runner);
    // Kamera
    if (this.spin && !this.drag) this.camT.yaw += dt * 0.5;
    const c = this.cam, T = this.camT;
    c.yaw = damp(c.yaw, T.yaw, 10, dt); c.pitch = damp(c.pitch, T.pitch, 10, dt); c.dist = damp(c.dist, T.dist, 8, dt); c.ty = damp(c.ty, T.ty, 8, dt);
    const cam = this.engine.camera, cp = Math.cos(c.pitch);
    cam.fov = 35; cam.near = 0.02; cam.updateProjectionMatrix();
    // Ziel leicht nach links verschieben, damit die Figur nicht hinter dem Feld rechts steht
    const off = 0.18 * c.dist, ox = Math.cos(c.yaw) * off, oz = -Math.sin(c.yaw) * off;
    cam.position.set(Math.sin(c.yaw) * cp * c.dist + ox, c.ty + Math.sin(c.pitch) * c.dist, Math.cos(c.yaw) * cp * c.dist + oz);
    cam.lookAt(ox, c.ty, oz);
    this.engine.focus(new THREE.Vector3(0, 0.7, 0));
  }
  dispose() {
    this.dead = true; clearTimeout(this.saveT); store.set(KEYS.char, this.look);
    this.cv.removeEventListener("mousedown", this.h.down); window.removeEventListener("mousemove", this.h.move); window.removeEventListener("mouseup", this.h.up);
    this.cv.removeEventListener("wheel", this.h.wheel); this.cv.removeEventListener("contextmenu", this.h.ctx);
    if (this.fig) this.fig.dispose(); this.runner.dispose(); this.root.remove();
    this.world.group.visible = true; this.markVis.forEach(([m, v]) => { m.visible = v; });
    this.engine.setEnv({ time: this.envOld.time, cycle: this.envOld.cycle, speed: this.envOld.speed });
    const cam = this.engine.camera; cam.fov = 60; cam.near = 0.08; cam.updateProjectionMatrix();
  }
}
