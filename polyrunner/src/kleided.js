// ===== kleided.js · Kleidungs-Editor (seit v0.17, aus dem Charakter-Editor) =====
// Entwürfe (Oberteile, Hosen) aus Ringen bauen wie einen Rumpf in Flyout: Ring anklicken und ziehen (hoch/runter = Länge, links/rechts = Weite),
// „+ Ring“ setzt einen Zwischenring mit eigener Weite. Stoff anklicken und ziehen = dehnen (zeigt die Straffheit). Export als .json für Claude.
import * as THREE from "three";
import { t, addTexts, L2, el, esc, store, KEYS, clamp, damp, download } from "pru/core.js";
import { Runner } from "pru/runner.js";
import { Figur, loadFigur, cloneLook } from "pru/figur.js";
import { newDesign, cloneDesign, CLOTHC } from "pru/kleidung.js";
import { charCSS } from "pru/chared.js";
import { PunktEd } from "pru/punkte.js";

addTexts({
  kTitle: L2("Kleidungs-Editor", "Clothing editor"), kBack: L2("Zum Charakter", "To the character"), kExport: L2("Exportieren", "Export"), kImport: L2("Importieren …", "Import …"),
  kDesigns: L2("Entwürfe", "Designs"), kNewTop: L2("+ Oberteil", "+ Top"), kNewBottom: L2("+ Hose", "+ Bottoms"), kDup: L2("Duplizieren", "Duplicate"), kDel: L2("Löschen", "Delete"),
  kDelQ: L2("Diesen Entwurf löschen?", "Delete this design?"), kName: L2("Name", "Name"), kTop: L2("Oberteil", "Top"), kBottom: L2("Hose", "Bottoms"),
  kFabric: L2("Stoff", "Fabric"), kColor: L2("Farbe", "Colour"), kThick: L2("Stoffdicke", "Fabric thickness"), kStiff: L2("Straffheit", "Firmness"),
  kStiffLo: L2("dehnbar", "stretchy"), kStiffHi: L2("straff", "firm"),
  kRings: L2("Ringe", "Rings"), kSel: L2("Gewählter Ring", "Selected ring"), kAdd: L2("+ Ring", "+ Ring"), kRem: L2("Ring entfernen", "Remove ring"),
  kLen: L2("Position / Länge", "Position / length"), kEase: L2("Weite (eng ↔ locker)", "Width (tight ↔ loose)"), kDepth: L2("Ausschnitt-Tiefe (− = Kragen)", "Neckline depth (− = collar)"), kNW: L2("Ausschnitt-Breite", "Neckline width"),
  kArm: L2("Armausschnitt", "Armhole"),
  r_neck: L2("Hals", "Neck"), r_hem: L2("Saum (Hüfte)", "Hem (hips)"), r_torso: L2("Rumpf-Ring {n}", "Body ring {n}"), r_sleeve: L2("Ärmel-Ring {n}", "Sleeve ring {n}"), r_send: L2("Ärmelende", "Sleeve end"),
  r_waist: L2("Bund", "Waistband"), r_leg: L2("Bein-Ring {n}", "Leg ring {n}"), r_lend: L2("Beinöffnung", "Leg opening"),
  kOther: L2("Restliche Kleidung zeigen", "Show the other clothes"), kHair: L2("Haare zeigen", "Show hair"), kRingsShow: L2("Ringe zeigen", "Show rings"),
  kHint: L2("Ring anklicken und ziehen: hoch/runter = Länge, links/rechts = Weite · Stoff anklicken und ziehen = dehnen · daneben: drehen · Rad: zoomen · Esc: zurück",
    "Click a ring and drag: up/down = length, left/right = width · click the fabric and drag = stretch · beside it: orbit · wheel: zoom · Esc: back"),
  kStretch: L2("Dehnung {n} %", "Stretch {n} %"), kBad: L2("Das ist kein PolyRunner-Kleidungsstück.", "This is not a PolyRunner garment."), kLoaded: L2("Kleidungsstück geladen", "Garment loaded"),
  kNone: L2("Noch kein Entwurf – leg oben ein Oberteil oder eine Hose an.", "No design yet – create a top or bottoms above."),
  kExportNote: L2("Exportierte Teile (.json) schickst du an Claude, er baut sie als feste Kleidung ins Spiel ein.", "Send exported pieces (.json) to Claude, he adds them to the game as fixed clothing.")
});

const CSS = `
.pru-ke .pru-cbody input[type=text]{margin-bottom:4px}
.pru-klist{display:flex;flex-direction:column;gap:3px;max-height:150px;overflow:auto}.pru-klist button{display:flex!important;align-items:center;gap:8px;text-align:left}.pru-klist i{width:14px;height:14px;border:1px solid rgba(0,0,0,.4);flex:none}.pru-klist small{margin-left:auto;opacity:.6;font-weight:500}
.pru-rl{display:flex;flex-direction:column;gap:3px}.pru-rl button{text-align:left}
.pru-lr{display:flex;justify-content:space-between;color:#8A8E96;font-size:11px;margin-top:-4px}
.pru-kinfo{position:absolute;left:50%;top:14px;transform:translateX(-50%);background:rgba(20,21,24,.86);padding:7px 12px;font-weight:700;font-variant-numeric:tabular-nums;pointer-events:none!important}.pru-kinfo[hidden]{display:none}
`;
const ANIMS = { idle: 0, walk: 1.4, run: 4.2, sprint: 7.2 };
const VIEWS = { body: { ty: 0.75, dist: 2.5, pitch: 0.1 }, top: { ty: 0.92, dist: 1.35, pitch: 0.06 }, legs: { ty: 0.45, dist: 1.8, pitch: 0.12 } };
const FAKEWORLD = { ray: (o) => (o.y >= 0 && o.y < 1.25 ? { point: new THREE.Vector3(o.x, 0, o.z) } : null) };

export class KleidEd {
  constructor(app) {
    this.app = app; this.engine = app.engine; this.world = app.world; this.cv = app.engine.renderer.domElement;
    charCSS();
    if (!document.getElementById("pru-css-kleid")) { const s = document.createElement("style"); s.id = "pru-css-kleid"; s.textContent = CSS; document.head.appendChild(s); }
    this.world.group.visible = false; this.markVis = Object.values(this.world.markers).map((m) => { const v = m.visible; m.visible = false; return [m, v]; });
    this.envOld = Object.assign({}, this.engine.env); this.engine.setEnv({ time: 15.2, cycle: false });
    const ui = store.get(KEYS.ui, {});
    this.designs = (store.get(KEYS.kleider, []) || []).map(cloneDesign);
    this.cur = this.designs.find((d) => d.id === ui.kid) || this.designs[0] || null;
    this.mode = "ringe"; this.sel = null; this.anim = "idle"; this.view = "top"; this.opt = Object.assign({ other: true, hair: true, rings: true }, ui.kopt || {});
    this.cam = Object.assign({ yaw: 0.45 }, VIEWS.top); this.camT = Object.assign({}, this.cam);
    this.look = cloneLook(store.get(KEYS.char, null));
    this.runner = new Runner(this.engine.scene); this.runner.setVisible(false); this.runner.world = FAKEWORLD;
    this.state = { mode: "idle", speed: 0, acc: 0, lat: 0, land: 0, moveRel: 0, turning: false, back: false, jumpId: 0, jumpBoth: false, twist: 0, vy: 0, airT: 0 };
    this.wind = new THREE.Vector3(); this.rings = new THREE.Group(); this.engine.scene.add(this.rings); this.ringObjs = [];
    this.pe = new PunktEd(this);
    this.buildUI(); this.bind();
    loadFigur().then((d) => { if (this.dead) return; this.fig = new Figur(this.engine.scene, d, this.figLook()); this.$("#pru-cload").hidden = true; }).catch((e) => { this.$("#pru-cload").textContent = String(e && e.message); });
  }
  // Figur trägt den aktuellen Entwurf (+ auf Wunsch das andere getragene Teil), Haare auf Wunsch
  figLook() {
    const pm = this.mode === "punkte", L = cloneLook(this.look); if (!this.opt.hair || pm) L.hair = { groups: L.hair.groups, roots: [] };
    const w = { top: this.opt.other && !pm ? L.wear.top : null, bottom: this.opt.other && !pm ? L.wear.bottom : null };
    if (this.cur) w[this.cur.kind === "bottom" ? "bottom" : "top"] = this.cur;
    L.wear = w; return L;
  }
  cloth() { return this.fig && this.cur ? this.fig.cloth[this.cur.kind === "bottom" ? "bottom" : "top"] : null; }
  // ---------- Oberfläche ----------
  buildUI() {
    this.root = el("div", "pru-ce pru-ke",
      '<div class="pru-brand">POLY<b>RUNNER</b><span>' + t("kTitle") + "</span></div>" +
      '<div class="pru-chint">' + esc(t("kHint")) + "</div><div class=\"pru-kinfo\" id=\"pru-kinfo\" hidden></div>" +
      '<div class="pru-right"><button class="pru-tb" data-k="export">' + t("kExport") + '</button><button class="pru-tb" data-k="import">' + t("kImport") + '</button><button class="pru-tb pru-pri" data-k="back">' + t("kBack") + "</button></div>" +
      '<div class="pru-cp"><div class="pru-cbody" id="pru-kbody"></div></div>' +
      '<div class="pru-cbl"><b>' + t("cAnim") + '</b><div class="pru-seg">' + Object.keys(ANIMS).map((k) => '<button data-anim="' + k + '">' + t("a" + k[0].toUpperCase() + k.slice(1)) + "</button>").join("") + "</div>" +
        '<b>' + t("cView") + '</b><div class="pru-seg"><button data-view="body">' + t("vBody") + '</button><button data-view="top">' + t("kTop") + '</button><button data-view="legs">' + t("kBottom") + "</button></div></div>" +
      '<div class="pru-cload" id="pru-cload">' + t("cLoading") + "</div><input type=\"file\" accept=\".json,application/json\" id=\"pru-kfile\" hidden>");
    this.app.ui.appendChild(this.root);
    this.$ = (q) => this.root.querySelector(q);
    this.render(); this.syncButtons();
  }
  syncButtons() {
    this.root.querySelectorAll("[data-anim]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.anim === this.anim)));
    this.root.querySelectorAll("[data-view]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === this.view)));
  }
  ringList() {
    const D = this.cur, out = []; if (!D) return out;
    if (D.kind === "bottom") { out.push({ k: "waist", lab: t("r_waist") }); D.leg.forEach((r, i) => out.push({ k: "leg", i: i, lab: i === D.leg.length - 1 ? t("r_lend") : t("r_leg").replace("{n}", i + 1) })); }
    else { out.push({ k: "neck", lab: t("r_neck") }); for (let i = D.torso.length - 1; i >= 0; i--) out.push({ k: "torso", i: i, lab: i === 0 ? t("r_hem") : t("r_torso").replace("{n}", i) }); D.sleeve.forEach((r, i) => out.push({ k: "sleeve", i: i, lab: i === D.sleeve.length - 1 ? t("r_send") : t("r_sleeve").replace("{n}", i + 1) })); }
    return out;
  }
  same(a, b) { return a && b && a.k === b.k && (a.i || 0) === (b.i || 0); }
  render() {
    const D = this.cur, pct = (v) => Math.round(v * 100);
    let h = "<h4>" + t("kDesigns") + '</h4><div class="pru-klist">' + this.designs.map((d) => '<button data-kd="' + d.id + '" aria-pressed="' + (D && d.id === D.id) + '"><i style="background:' + d.color + '"></i>' + esc(d.name) + "<small>" + t(d.kind === "bottom" ? "kBottom" : "kTop") + "</small></button>").join("") + "</div>" +
      '<div class="pru-hrow"><button data-k="newtop">' + t("kNewTop") + '</button><button data-k="newbottom">' + t("kNewBottom") + "</button></div>";
    if (!D) { this.$("#pru-kbody").innerHTML = h + "<p>" + t("kNone") + "</p>"; return; }
    h += '<div class="pru-hrow"><button data-k="dup">' + t("kDup") + '</button><button data-k="del">' + t("kDel") + "</button></div>" +
      "<h4>" + t("kName") + '</h4><input type="text" data-kn="1" maxlength="40" value="' + esc(D.name) + '">' +
      "<h4>" + t("kFabric") + '</h4><div class="pru-sws">' + CLOTHC.map((c) => '<button class="pru-sw" style="background:' + c + '" data-kc="' + c + '" aria-pressed="' + (c.toLowerCase() === D.color.toLowerCase()) + '"></button>').join("") + '<label class="pru-sw pru-cust" title="' + t("cCustom") + '"><input type="color" data-kci="1" value="' + D.color + '"></label></div>' +
      rng("thick", t("kThick"), 0.3, 8, 0.1, D.thick, (v) => v.toFixed(1) + " mm") +
      rng("stiff", t("kStiff"), 0, 1, 0.01, D.stiff, (v) => pct(v) + " %") + '<div class="pru-lr"><span>' + t("kStiffLo") + "</span><span>" + t("kStiffHi") + "</span></div>";
    if (D.kind !== "bottom") h += rng("arm", t("kArm"), 0, 0.06, 0.001, D.arm, (v) => Math.round(v * 1000) + " mm");
    h += '<h4>' + t("kRings") + " / " + t("pTitle") + '</h4><div class="pru-seg"><button data-km="ringe" aria-pressed="' + (this.mode !== "punkte") + '">' + t("pRings") + '</button><button data-km="punkte" aria-pressed="' + (this.mode === "punkte") + '">' + t("pTitle") + "</button></div>";
    if (this.mode === "punkte") { this.$("#pru-kbody").innerHTML = h + this.pe.html(); return; }
    if (D.mesh) { this.$("#pru-kbody").innerHTML = h + "<p>" + t("pOwn") + '</p><div class="pru-col"><button data-pe="discard">' + t("pDiscard") + "</button></div>"; return; }
    h += '<div class="pru-rl" style="margin-top:6px">' + this.ringList().map((r) => '<button data-kr="' + r.k + "|" + (r.i || 0) + '" aria-pressed="' + this.same(r, this.sel) + '">' + r.lab + "</button>").join("") + "</div>";
    const S = this.sel && this.ringRef(this.sel);
    if (S) {
      h += "<h4>" + t("kSel") + "</h4>";
      if (this.sel.k === "neck") h += rng("r.d", t("kDepth"), -0.08, 0.14, 0.001, S.d, (v) => Math.round(v * 1000) + " mm") + rng("r.w", t("kNW"), 0, 1, 0.01, S.w, (v) => pct(v) + " %") + rng("r.ease", t("kEase"), 0, 0.06, 0.0005, S.ease, (v) => (v * 1000).toFixed(1) + " mm");
      else {
        const k = this.coordKey(this.sel), lim = this.limits(this.sel);
        h += rng("r." + k, t("kLen"), lim[0], lim[1], 0.001, S[k], (v) => (k === "y" ? Math.round(v * 100) + " cm" : Math.round(v * 100) + " cm")) + rng("r.ease", t("kEase"), 0, 0.12, 0.0005, S.ease, (v) => (v * 1000).toFixed(1) + " mm");
      }
      h += '<div class="pru-hrow"><button data-k="addring">' + t("kAdd") + '</button><button data-k="remring"' + (this.removable(this.sel) ? "" : " disabled") + ">" + t("kRem") + "</button></div>";
    }
    h += '<label class="pru-chk"><input type="checkbox" data-ko="rings"' + (this.opt.rings ? " checked" : "") + "> " + t("kRingsShow") + "</label>" +
      '<label class="pru-chk"><input type="checkbox" data-ko="other"' + (this.opt.other ? " checked" : "") + "> " + t("kOther") + "</label>" +
      '<label class="pru-chk"><input type="checkbox" data-ko="hair"' + (this.opt.hair ? " checked" : "") + "> " + t("kHair") + "</label><p>" + t("kExportNote") + "</p>";
    this.$("#pru-kbody").innerHTML = h;
    function rng(key, lab, min, max, step, val, f) { return "<h4>" + lab + ' <em data-kout="' + key + '">' + f(val) + '</em></h4><input type="range" data-ks="' + key + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + val + '">'; }
  }
  fmtOut(key, v) { return key === "thick" ? v.toFixed(1) + " mm" : key === "stiff" || key === "r.w" ? Math.round(v * 100) + " %" : key === "arm" || key === "r.d" ? Math.round(v * 1000) + " mm" : key === "r.ease" ? (v * 1000).toFixed(1) + " mm" : Math.round(v * 100) + " cm"; }
  ringRef(s) { const D = this.cur; if (!D || !s) return null; if (s.k === "neck") return D.neck; if (s.k === "waist") return D.waist; const L = D[s.k]; return L ? L[s.i] : null; }
  coordKey(s) { return s.k === "torso" || s.k === "waist" ? "y" : s.k === "sleeve" ? "t" : s.k === "leg" ? "L" : "d"; }
  limits(s) {
    const D = this.cur, gap = 0.015;
    if (s.k === "waist") return [0.66, 0.98];
    if (s.k === "torso") { const L = D.torso; return [s.i === 0 ? 0.42 : L[s.i - 1].y + gap, s.i === L.length - 1 ? 1.02 : L[s.i + 1].y - gap]; }
    if (s.k === "sleeve") { const L = D.sleeve; return [s.i === 0 ? 0 : L[s.i - 1].t + gap, s.i === L.length - 1 ? 0.4 : L[s.i + 1].t - gap]; }
    if (s.k === "leg") { const L = D.leg; return [s.i === 0 ? 0 : L[s.i - 1].L + gap, s.i === L.length - 1 ? 0.78 : L[s.i + 1].L - gap]; }
    return [-0.08, 0.14];
  }
  removable(s) { const D = this.cur; if (!s || s.k === "neck" || s.k === "waist") return false; const L = D[s.k]; if (L.length < 2) return false; if (s.k === "torso") return s.i !== 0; return s.i !== L.length - 1; }
  // ---------- Änderungen ----------
  changed(full) {
    if (!this.cur) return;
    this.dirty = true;
    clearTimeout(this.saveT); this.saveT = setTimeout(() => this.save(), 300);
    if (full) this.render();
  }
  save() { store.set(KEYS.kleider, this.designs); const u = store.get(KEYS.ui, {}); u.kid = this.cur && this.cur.id; u.kopt = this.opt; store.set(KEYS.ui, u); }
  apply() { if (this.fig) { this.fig.setLook(this.figLook()); } this.dirty = false; this.lastApply = performance.now(); }
  select(d) { this.cur = d; this.sel = null; this.mode = "ringe"; this.pe.sel.clear(); this.pe.undo = []; this.pe.g.visible = false; this.save(); this.render(); if (this.fig) this.fig.setLook(this.figLook()); if (d) { this.view = d.kind === "bottom" ? "legs" : "top"; Object.assign(this.camT, VIEWS[this.view]); this.syncButtons(); } }
  addRing() {
    const D = this.cur, s = this.sel; if (!s || s.k === "neck" || s.k === "waist") return;
    const L = D[s.k], key = this.coordKey(s), i = s.i, r = L[i];
    let j = s.k === "torso" ? (i + 1 < L.length ? i + 1 : i - 1) : (i - 1 >= 0 ? i - 1 : i + 1);
    let c; if (j >= 0 && j < L.length) c = (r[key] + L[j][key]) / 2; else c = s.k === "torso" ? Math.min(1.0, r[key] + 0.06) : Math.max(0, r[key] - 0.06);
    if (Math.abs(c - r[key]) < 0.012) return;
    const nr = { ease: r.ease }; nr[key] = Math.round(c * 1000) / 1000; L.push(nr); L.sort((a, b) => a[key] - b[key]);
    this.sel = { k: s.k, i: L.indexOf(nr) }; this.changed(true);
  }
  remRing() { const s = this.sel; if (!this.removable(s)) return; this.cur[s.k].splice(s.i, 1); this.sel = null; this.changed(true); }
  bind() {
    this.root.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.anim) { this.anim = b.dataset.anim; this.syncButtons(); }
      else if (b.dataset.view) { this.view = b.dataset.view; Object.assign(this.camT, VIEWS[this.view]); this.syncButtons(); }
      else if (b.dataset.kd) this.select(this.designs.find((d) => d.id === b.dataset.kd));
      else if (b.dataset.kc) { this.cur.color = b.dataset.kc; this.changed(true); }
      else if (b.dataset.kr) { const [k, i] = b.dataset.kr.split("|"); this.sel = { k: k, i: +i }; this.render(); }
      else if (b.dataset.k) this.action(b.dataset.k);
      else if (b.dataset.km) this.setMode(b.dataset.km);
      else if (b.dataset.pe) this.pe.cmd(b.dataset.pe);
    });
    this.root.addEventListener("input", (e) => {
      const i = e.target, D = this.cur; if (!D) return;
      if (i.dataset.po || i.dataset.pi) { if (i.dataset.pi && e.type === "input") return; this.pe.input(i); return; }
      if (i.dataset.kn) { D.name = i.value || "?"; clearTimeout(this.saveT); this.saveT = setTimeout(() => { this.save(); this.render(); }, 600); return; }
      if (i.dataset.kci) { D.color = i.value; this.changed(false); return; }
      if (i.dataset.ko) { this.opt[i.dataset.ko] = i.checked; this.save(); this.apply(); return; }
      if (i.dataset.ks) {
        const k = i.dataset.ks, v = +i.value;
        if (k.startsWith("r.")) { const R = this.ringRef(this.sel); if (R) R[k.slice(2)] = v; } else D[k] = v;
        const o = this.root.querySelector('[data-kout="' + k + '"]'); if (o) o.textContent = this.fmtOut(k, v);
        this.changed(false);
      }
    });
    this.root.addEventListener("change", (e) => { if (e.target.id === "pru-kfile") this.importFile(e.target.files[0]); if (e.target.dataset && e.target.dataset.ks) this.render(); if (e.target.dataset && e.target.dataset.pi) this.pe.input(e.target); });
    const rc = new THREE.Raycaster();
    this.h = {
      down: (e) => {
        e.preventDefault(); const ray = this.ray(e);
        if (this.mode === "punkte") { if (this.pe.down(e)) return; this.drag = { b: e.button, x: e.clientX, y: e.clientY }; return; }
        if (e.button === 0 && this.cur && this.fig) {
          // 1. Ring getroffen? → Ring ziehen
          if (this.opt.rings && this.ringObjs.length) { rc.ray.copy(ray); rc.params.Line.threshold = 0.012 * (this.cam.dist / 1.2); const h = rc.intersectObjects(this.ringObjs, false)[0]; if (h) { this.sel = h.object.userData.ref; this.render(); this.ringDrag = { x: e.clientX, y: e.clientY, dist: h.distance }; return; } }
          // 2. Stoff getroffen? → greifen und dehnen
          const C = this.cloth(), hit = C && C.pick(ray);
          if (hit) { this.grab = { C: C, plane: new THREE.Plane().setFromNormalAndCoplanarPoint(this.engine.camera.getWorldDirection(new THREE.Vector3()).negate(), hit.point) }; C.grab(hit.i, hit.point); return; }
        }
        this.drag = { b: e.button, x: e.clientX, y: e.clientY };
      },
      move: (e) => {
        if (this.mode === "punkte" && this.pe.move(e)) return;
        if (this.ringDrag) {
          const dx = e.clientX - this.ringDrag.x, dy = e.clientY - this.ringDrag.y; this.ringDrag.x = e.clientX; this.ringDrag.y = e.clientY;
          const cam = this.engine.camera, wpp = 2 * this.ringDrag.dist * Math.tan(cam.fov * Math.PI / 360) / Math.max(1, this.cv.clientHeight);
          const R = this.ringRef(this.sel); if (!R) return;
          if (this.sel.k === "neck") { R.d = clamp(R.d + dy * wpp, -0.08, 0.14); R.ease = clamp(R.ease + dx * wpp * 0.3, 0, 0.06); }
          else {
            const k = this.coordKey(this.sel), lim = this.limits(this.sel), sg = k === "y" ? -1 : 1;
            R[k] = clamp(R[k] + sg * dy * wpp, lim[0], lim[1]); R.ease = clamp(R.ease + dx * wpp * 0.35, 0, 0.12);
          }
          this.changed(false); this.liveOut(); return;
        }
        if (this.grab) { const p = new THREE.Vector3(); if (this.ray(e) && new THREE.Ray().copy(this.ray(e)).intersectPlane(this.grab.plane, p)) this.grab.C.drag(p); return; }
        if (!this.drag) return; const dx = e.clientX - this.drag.x, dy = e.clientY - this.drag.y; this.drag.x = e.clientX; this.drag.y = e.clientY;
        if (this.drag.b === 0) { this.camT.yaw -= dx * 0.008; this.camT.pitch = clamp(this.camT.pitch + dy * 0.006, -0.6, 1.2); }
        else this.camT.ty = clamp(this.camT.ty + dy * 0.002 * this.camT.dist, 0.1, 1.6);
      },
      up: () => { if (this.mode === "punkte" && this.pe.up()) { this.drag = null; return; } this.drag = null; if (this.ringDrag) { this.ringDrag = null; this.render(); } if (this.grab) { this.grab.C.release(); this.grab = null; this.$("#pru-kinfo").hidden = true; } },
      wheel: (e) => { e.preventDefault(); this.camT.dist = clamp(this.camT.dist * Math.exp(e.deltaY * 0.0012), 0.35, 6); },
      ctx: (e) => e.preventDefault()
    };
    this.cv.addEventListener("mousedown", this.h.down); window.addEventListener("mousemove", this.h.move); window.addEventListener("mouseup", this.h.up);
    this.cv.addEventListener("wheel", this.h.wheel, { passive: false }); this.cv.addEventListener("contextmenu", this.h.ctx);
  }
  // Werte im Feld mitlaufen lassen, während man im Bild zieht
  liveOut() { const R = this.ringRef(this.sel); if (!R) return; Object.keys(R).forEach((k) => { const key = "r." + k, o = this.root.querySelector('[data-kout="' + key + '"]'), i = this.root.querySelector('[data-ks="' + key + '"]'); if (o) o.textContent = this.fmtOut(key, R[k]); if (i) i.value = R[k]; }); }
  ray(e) { const r = this.cv.getBoundingClientRect(), m = new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1), rc = new THREE.Raycaster(); rc.setFromCamera(m, this.engine.camera); return rc.ray; }
  action(a) {
    const D = this.cur;
    if (a === "back") this.app.go("char");
    else if (a === "newtop" || a === "newbottom") { const d = newDesign(a === "newtop" ? "top" : "bottom", t(a === "newtop" ? "kTop" : "kBottom") + " " + (this.designs.length + 1)); this.designs.push(d); this.select(d); this.save(); }
    else if (a === "dup" && D) { const d = cloneDesign(D); d.id = newDesign(D.kind).id; d.name = D.name + " 2"; this.designs.push(d); this.select(d); this.save(); }
    else if (a === "del" && D) { if (!confirm(t("kDelQ"))) return; this.designs = this.designs.filter((x) => x !== D); this.select(this.designs[0] || null); this.save(); }
    else if (a === "addring") this.addRing();
    else if (a === "remring") this.remRing();
    else if (a === "export" && D) download("PolyRunner_Kleid_" + D.name.replace(/[^\wäöüÄÖÜß-]+/g, "_") + ".json", JSON.stringify(D, null, 1));
    else if (a === "import") this.$("#pru-kfile").click();
  }
  importFile(f) {
    if (!f) return;
    f.text().then((s) => {
      let o = null; try { o = JSON.parse(s); } catch (e) {}
      if (!o || o.format !== "polyrunner-kleid") { this.app.toast(t("kBad")); return; }
      const d = cloneDesign(o); if (this.designs.some((x) => x.id === d.id)) d.id = newDesign(d.kind).id; this.designs.push(d); this.select(d); this.save(); this.app.toast(t("kLoaded"));
    });
    this.$("#pru-kfile").value = "";
  }
  key(e) {
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName) && e.target.type !== "range" && e.target.type !== "checkbox") return false;
    if (this.mode === "punkte" && this.pe.key(e)) return true;
    if (e.key === "Escape") { this.app.go("char"); return true; }
    if ((e.key === "+" || e.code === "NumpadAdd") && this.sel) { this.addRing(); return true; }
    if ((e.key === "Delete" || e.key === "Backspace") && this.sel) { this.remRing(); return true; }
    return false;
  }
  // ---------- Ringe im Bild: Öffnungen = Ränder des Stoffs, Zwischenringe = Stoffpunkte auf dieser Höhe ----------
  drawRings() {
    const C = this.cloth(); this.ringObjs.forEach((o) => { this.rings.remove(o); o.geometry.dispose(); }); this.ringObjs = [];
    this.rings.visible = this.opt.rings && !!C && !this.cur.mesh; if (!C || !this.opt.rings || this.cur.mesh) return;
    if (!this.ringMat) { this.ringMat = new THREE.LineBasicMaterial({ color: 0xECEAE4, transparent: true, opacity: 0.9 }); this.ringSel = new THREE.LineBasicMaterial({ color: 0xE2621B }); }
    const B = C.B, K = C.fig.data.kinfo, P = C.p, D = this.cur, rest = B.pos;
    const add = (ids, ref) => {
      if (ids.length < 3) return; const g = new THREE.BufferGeometry(), a = new Float32Array(ids.length * 3), N = C.outer.attributes.normal ? C.outer.attributes.normal.array : null;
      ids.forEach((v, i) => { for (let k = 0; k < 3; k++) a[i * 3 + k] = P[v * 3 + k] + (N ? N[v * 3 + k] * 0.003 : 0); });   // knapp über dem Stoff
      g.setAttribute("position", new THREE.BufferAttribute(a, 3)); const L = new THREE.LineLoop(g, this.same(ref, this.sel) ? this.ringSel : this.ringMat); L.renderOrder = 40; L.userData.ref = ref; this.rings.add(L); this.ringObjs.push(L);
    };
    // Randschleifen
    const nxt = new Map(); for (let r = 0; r < C.rim.length; r += 2) nxt.set(C.rim[r], C.rim[r + 1]);
    const seen = new Set(), loops = [];
    nxt.forEach((b, a) => { if (seen.has(a)) return; const L = []; let c = a, n = 0; while (c != null && !seen.has(c) && n < 5000) { seen.add(c); L.push(c); c = nxt.get(c); n++; } if (L.length > 5) loops.push(L); });
    const ctr = (L) => { let x = 0, y = 0; L.forEach((v) => { x += rest[v * 3]; y += rest[v * 3 + 1]; }); return [x / L.length, y / L.length]; };
    loops.forEach((L) => {
      const [x, y] = ctr(L); let ref;
      if (D.kind === "bottom") ref = y > 0.7 ? { k: "waist" } : { k: "leg", i: D.leg.length - 1 };
      else if (Math.abs(x) > 0.1) ref = { k: "sleeve", i: D.sleeve.length - 1 };
      else ref = y > 0.95 ? { k: "neck" } : { k: "torso", i: 0 };
      add(L, ref);
    });
    // Zwischenringe
    // Zwischenring: je Richtung (36) der äußerste Stoffpunkt im schmalen Band → ruhige Schleife
    const band = (pred, cx, cz, ref) => {
      const NB = 36, best = new Array(NB).fill(-1), br = new Float32Array(NB);
      for (let j = 0; j < B.m0; j++) { if (!pred(j)) continue; const dx = rest[j * 3] - cx(j), dz = rest[j * 3 + 2] - cz(j), a = Math.min(NB - 1, Math.floor((Math.atan2(dx, dz) + Math.PI) / (Math.PI * 2) * NB)), r = Math.hypot(dx, dz); if (r > br[a]) { br[a] = r; best[a] = j; } }
      add(best.filter((j) => j >= 0), ref);
    };
    const src = B.src;
    if (D.kind === "bottom") D.leg.forEach((r, i) => { if (i === D.leg.length - 1 || r.L <= 0.16) return; const y = 0.622 - (r.L - 0.15); [1, -1].forEach((s) => band((j) => K.cls[src[j]] !== 1 && Math.abs(rest[j * 3 + 1] - y) < 0.007 && rest[j * 3] * s > 0, () => s * 0.077, () => -0.045, { k: "leg", i: i })); });
    else {
      D.torso.forEach((r, i) => { if (i === 0) return; band((j) => K.cls[src[j]] === 0 && Math.abs(B.pos[j * 3 + 1] - r.y) < 0.006 && Math.abs(rest[j * 3]) < 0.16, () => 0, () => -0.02, { k: "torso", i: i }); });
      D.sleeve.forEach((r, i) => { if (i === D.sleeve.length - 1) return; [1, -1].forEach((s) => { const A = s > 0 ? K.arm.L : K.arm.R; band((j) => K.cls[src[j]] === 1 && rest[j * 3] * s > 0 && Math.abs(K.armT[src[j]] - (r.t + K.t0)) < 0.007, () => A.s.x, () => A.s.z, { k: "sleeve", i: i }); }); });
    }
  }
  update(dt) {
    const S = this.state, v = ANIMS[this.anim];
    S.speed = damp(S.speed, v, 3.5, dt); S.mode = S.speed > 0.05 || v > 0 ? "run" : "idle";
    this.runner.place(new THREE.Vector3(0, 0, 0), 0); this.runner.update(dt, S);
    if (this.dirty && (!this.lastApply || performance.now() - this.lastApply > 110)) this.apply();
    if (this.fig && this.mode === "punkte") { this.ringObjs.forEach((o) => { this.rings.remove(o); o.geometry.dispose(); }); this.ringObjs = []; this.pe.frame(); }
    else if (this.fig) {
      this.fig.follow(this.runner); this.wind.set(0, 0, -S.speed); this.fig.simulate(dt, this.wind);
      // Ringe neu (Ruhezustand: Schleifen folgen dem Stoff)
      this.ringT = (this.ringT || 0) + dt; if (this.ringT > 0.06 || this.ringDrag) { this.ringT = 0; this.drawRings(); }
      if (this.grab) { const C = this.grab.C, s = C.strain(), i = this.$("#pru-kinfo"); i.hidden = false; i.textContent = t("kStretch").replace("{n}", Math.max(0, Math.round((s - 1) * 100))); }
    }
    const c = this.cam, T = this.camT;
    c.yaw = damp(c.yaw, T.yaw, 10, dt); c.pitch = damp(c.pitch, T.pitch, 10, dt); c.dist = damp(c.dist, T.dist, 8, dt); c.ty = damp(c.ty, T.ty, 8, dt);
    const cam = this.engine.camera, cp = Math.cos(c.pitch); cam.fov = 35; cam.near = 0.02; cam.updateProjectionMatrix();
    const off = 0.18 * c.dist, ox = Math.cos(c.yaw) * off, oz = -Math.sin(c.yaw) * off;
    cam.position.set(Math.sin(c.yaw) * cp * c.dist + ox, c.ty + Math.sin(c.pitch) * c.dist, Math.cos(c.yaw) * cp * c.dist + oz); cam.lookAt(ox, c.ty, oz);
    this.engine.focus(new THREE.Vector3(0, 0.7, 0));
  }
  // Ringe ↔ Punkte
  setMode(m) {
    if (m === "punkte" && this.cur && !this.cur.mesh && this.fig) { this.mode = "punkte"; if (!this.pe.take()) { this.mode = "ringe"; this.render(); return; } }
    this.mode = m === "punkte" && this.cur ? "punkte" : "ringe";
    if (this.mode === "punkte") { this.pe.prep(); this.anim = "idle"; this.syncButtons(); this.pe.commit(false); } else { this.pe.g.visible = false; if (this.fig) this.fig.setLook(this.figLook()); }
    this.render();
  }
  dispose() {
    this.dead = true; this.pe.dispose(); clearTimeout(this.saveT); this.save();
    this.cv.removeEventListener("mousedown", this.h.down); window.removeEventListener("mousemove", this.h.move); window.removeEventListener("mouseup", this.h.up);
    this.cv.removeEventListener("wheel", this.h.wheel); this.cv.removeEventListener("contextmenu", this.h.ctx);
    this.ringObjs.forEach((o) => o.geometry.dispose()); this.engine.scene.remove(this.rings); if (this.ringMat) { this.ringMat.dispose(); this.ringSel.dispose(); }
    if (this.fig) this.fig.dispose(); this.runner.dispose(); this.root.remove();
    this.world.group.visible = true; this.markVis.forEach(([m, v]) => { m.visible = v; });
    this.engine.setEnv({ time: this.envOld.time, cycle: this.envOld.cycle, speed: this.envOld.speed });
    const cam = this.engine.camera; cam.fov = 60; cam.near = 0.08; cam.updateProjectionMatrix();
  }
}
