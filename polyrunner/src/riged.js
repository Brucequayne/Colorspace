// ===== riged.js · Reiter „Rig“ im Charakter-Editor (seit v0.21) =====
// Gelenke der Spielfigur genauer setzen: Kugeln anklicken und ziehen (in der Bildebene; drehen = andere Richtung) oder per Zahl in mm.
// Links und rechts sind immer gleich (gespiegelt), die Mitte bleibt auf x = 0. Nach jeder Änderung werden die Gewichte neu berechnet (rig.js).
// Prüfen: Röntgen, Gewichte des gewählten Gelenks (blau wenig → rot voll), Posen A-Pose / Animation (Vorschau unten links) / Beugetest.
// Export PolyRunner_Rig.json → Claude baut es als festes Rig ein.
import * as THREE from "three";
import { t, addTexts, L2, esc, store, KEYS, download, PRU } from "pru/core.js";
import { RIG_JOINTS, RIG_DEFAULT, cloneRig, fullJoints, jointBone } from "pru/rig.js";
import { Figur, setRig } from "pru/figur.js";

addTexts({
  cRig: L2("Rig", "Rig"), rJoints: L2("Gelenke (links = rechts)", "Joints (left = right)"), rPos: L2("Lage in mm (x seitlich, y Höhe, z vorne)", "Position in mm (x side, y height, z front)"),
  rPose: L2("Pose", "Pose"), rpA: L2("A-Pose", "A pose"), rpAnim: L2("Animation", "Animation"), rpBend: L2("Beugetest", "Bend test"),
  rShow: L2("Anzeige", "Display"), rXray: L2("Röntgen (Körper durchsichtig)", "X-ray (see-through body)"), rW: L2("Gewichte des gewählten Gelenks", "Weights of the selected joint"),
  rSoft: L2("Weichheit der Übergänge", "Softness of transitions"), rArmY: L2("Arme nehmen Haut erst ab Höhe", "Arms take skin only above"), rLegY: L2("Beine nehmen Haut nur bis Höhe", "Legs take skin only below"),
  rSpread: L2("Arme im Spiel vom Körper weg", "Arms away from the body in game"), rRules: L2("Regeln für die Gewichte", "Rules for the weights"),
  rUndo: L2("Rückgängig", "Undo"), rReset: L2("Standard-Rig", "Default rig"), rResetQ: L2("Rig auf den Standard zurücksetzen?", "Reset the rig to the default?"),
  rExport: L2("Rig exportieren", "Export rig"), rImport: L2("Rig importieren …", "Import rig …"), rBad: L2("Das ist kein PolyRunner-Rig.", "This is not a PolyRunner rig."), rLoaded: L2("Rig geladen", "Rig loaded"),
  rBusy: L2("Gewichte werden berechnet …", "Computing weights …"), rOwn: L2("Eigenes Rig aktiv (gilt auch im Testlauf).", "Own rig active (also used in the test run)."),
  rHint: L2("Kugel anklicken und ziehen: Gelenk verschieben (in der Bildebene – für die Tiefe die Ansicht drehen) · daneben ziehen: drehen · Strg+Z: rückgängig. Gezogen wird in der A-Pose. Danach mit Beugetest und Animation prüfen, wo sich die Haut falsch verzieht.",
    "Click and drag a ball: move the joint (in the view plane – orbit for depth) · drag beside: orbit · Ctrl+Z: undo. Dragging works in the A pose. Then check with bend test and animation where the skin deforms badly.")
});
const MID = { Hips: 1, Spine: 1, Chest: 1, Neck: 1, Head: 1, _HeadEnd: 1, _HipsLow: 1 };
const LINES = [["_HipsLow", "Hips"], ["Hips", "Spine"], ["Spine", "Chest"], ["Chest", "Neck"], ["Neck", "Head"], ["Head", "_HeadEnd"],
  ["Chest", "LeftShoulder"], ["LeftShoulder", "LeftUpperArm"], ["LeftUpperArm", "LeftLowerArm"], ["LeftLowerArm", "LeftHand"], ["LeftHand", "_LeftHandEnd"],
  ["Hips", "LeftUpperLeg"], ["LeftUpperLeg", "LeftLowerLeg"], ["LeftLowerLeg", "LeftFoot"], ["LeftFoot", "LeftToes"], ["LeftToes", "_LeftToesEnd"]];
const mir = (k) => k.replace("Left", "Right");

export class RigEd {
  constructor(ed) {
    this.ed = ed; const u = store.get(KEYS.ui, {}) || {};
    this.o = Object.assign({ sel: "LeftLowerLeg", pose: "a", xray: true, w: true }, u.rig || {});
    this.rig = cloneRig(store.get(KEYS.rig, null)); this.undo = []; this.t = 0;
    this.g = new THREE.Group(); this.g.visible = false; this.g.renderOrder = 40; ed.engine.scene.add(this.g);
    this.balls = {};
    const keys = Object.keys(fullJoints(this.rig));
    keys.forEach((k) => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false, transparent: true })); m.renderOrder = 41; this.balls[k] = m; this.g.add(m); });
    this.lines = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xECEAE4, depthTest: false, transparent: true, opacity: 0.85 })); this.lines.renderOrder = 40; this.g.add(this.lines);
  }
  saveUI() { const u = store.get(KEYS.ui, {}) || {}; u.rig = this.o; store.set(KEYS.ui, u); }
  active() { return this.ed.tab === "rig"; }
  // ---------- Panel ----------
  html() {
    const o = this.o, R = this.rig, J = R.joints[o.sel] || [0, 0, 0], de = PRU.lang !== "en", mm = (v) => Math.round(v * 1000);
    const rng = (k, lab, min, max, step, val, out) => "<h4>" + lab + ' <em data-rout="' + k + '">' + out + '</em></h4><input type="range" data-rs="' + k + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + val + '">';
    const own = JSON.stringify(R) !== JSON.stringify(cloneRig(RIG_DEFAULT));
    return "<h4>" + t("rPose") + '</h4><div class="pru-seg">' + [["a", "rpA"], ["anim", "rpAnim"], ["bend", "rpBend"]].map(([k, l]) => '<button data-rp="' + k + '" aria-pressed="' + (o.pose === k) + '">' + t(l) + "</button>").join("") + "</div>" +
      "<h4>" + t("rJoints") + '</h4><div class="pru-opts" style="grid-template-columns:repeat(2,1fr)">' + RIG_JOINTS.map(([k, d, e]) => '<button data-rj="' + k + '" aria-pressed="' + (k === o.sel) + '">' + esc(de ? d : e) + "</button>").join("") + "</div>" +
      "<h4>" + t("rPos") + '</h4><div class="pru-hrow">' + [0, 1, 2].map((i) => '<input type="number" step="1" data-ri="' + i + '" value="' + mm(J[i]) + '"' + (i === 0 && MID[o.sel] ? " disabled" : "") + ' style="width:33%;background:#1B1C1F;color:#ECEAE4;border:1px solid #3A3D42;padding:5px">').join("") + "</div>" +
      "<h4>" + t("rShow") + '</h4><label class="pru-chk"><input type="checkbox" data-ro="xray"' + (o.xray ? " checked" : "") + "> " + t("rXray") + '</label><label class="pru-chk"><input type="checkbox" data-ro="w"' + (o.w ? " checked" : "") + "> " + t("rW") + "</label>" +
      "<h4>" + t("rRules") + "</h4>" +
      rng("soft", t("rSoft"), 0, 40, 1, R.soft, String(R.soft)) + rng("armY", t("rArmY"), 0.4, 1, 0.005, R.armY, mm(R.armY) + " mm") + rng("legY", t("rLegY"), 0.5, 1, 0.005, R.legY, mm(R.legY) + " mm") +
      rng("spread", t("rSpread"), -0.3, 0.5, 0.01, R.spread, Math.round(R.spread * 180 / Math.PI) + "°") +
      '<div class="pru-hrow"><button data-rc="undo"' + (this.undo.length ? "" : " disabled") + ">" + t("rUndo") + '</button><button data-rc="reset">' + t("rReset") + "</button></div>" +
      '<div class="pru-hrow"><button data-rc="export">' + t("rExport") + '</button><button data-rc="import">' + t("rImport") + "</button></div>" +
      '<input type="file" accept=".json,application/json" id="pru-rfile" hidden>' + (own ? "<p>" + t("rOwn") + "</p>" : "") + "<p>" + t("rHint") + "</p>";
  }
  click(b) {
    const d = b.dataset;
    if (d.rj) { this.o.sel = d.rj; this.saveUI(); this.look(); this.ed.renderTab(); return true; }
    if (d.rp) { this.o.pose = d.rp; this.saveUI(); this.ed.renderTab(); return true; }
    if (d.rc) { this.cmd(d.rc); return true; }
    return false;
  }
  input(i, type) {
    const d = i.dataset;
    if (d.ro) { this.o[d.ro] = i.checked; this.saveUI(); this.look(); return true; }
    if (d.rs) {
      const k = d.rs, v = +i.value, out = this.ed.root.querySelector('[data-rout="' + k + '"]');
      if (out) out.textContent = k === "soft" ? String(v) : k === "spread" ? Math.round(v * 180 / Math.PI) + "°" : Math.round(v * 1000) + " mm";
      if (type === "change") { this.push(); this.rig[k] = k === "soft" ? Math.round(v) : v; this.changed(k !== "spread"); }
      return true;
    }
    if (d.ri != null) { if (type !== "change") return true; const v = +i.value / 1000; if (!isFinite(v)) return true; this.push(); this.rig.joints[this.o.sel][+d.ri] = v; this.changed(true); this.ed.renderTab(); return true; }
    if (i.id === "pru-rfile") { if (type === "change") this.importFile(i.files[0]); return true; }
    return false;
  }
  cmd(c) {
    if (c === "undo") return this.popUndo();
    if (c === "reset") { if (!confirm(t("rResetQ"))) return; this.push(); this.rig = cloneRig(RIG_DEFAULT); this.changed(true); this.ed.renderTab(); }
    if (c === "export") download("PolyRunner_Rig.json", JSON.stringify(cloneRig(this.rig), null, 1));
    if (c === "import") this.ed.$("#pru-rfile").click();
  }
  importFile(f) {
    if (!f) return;
    f.text().then((s) => {
      let o = null; try { o = JSON.parse(s); } catch (e) {}
      if (!o || o.format !== "polyrunner-rig") { this.ed.app.toast(t("rBad")); return; }
      this.push(); this.rig = cloneRig(o); this.changed(true); this.ed.renderTab(); this.ed.app.toast(t("rLoaded"));
    });
  }
  push() { this.undo.push(JSON.stringify(this.rig)); if (this.undo.length > 60) this.undo.shift(); }
  popUndo() { if (!this.undo.length) return; this.rig = cloneRig(JSON.parse(this.undo.pop())); this.changed(true); this.ed.renderTab(); }
  // Rig speichern; Gewichte neu (kurz verzögert, beim Ziehen erst am Ende)
  changed(weights) {
    store.set(KEYS.rig, this.rig); this.place();
    clearTimeout(this.tm); this.tm = setTimeout(() => this.rebuild(), weights ? 60 : 0);
  }
  rebuild() {
    const E = this.ed; if (!E.fig || E.dead) return;
    const t0 = performance.now(), data = setRig(this.rig); if (!data) return;
    const old = E.fig; E.fig = new Figur(E.engine.scene, data, E.figLook()); old.dispose(); this.look();
    this.ms = Math.round(performance.now() - t0);
  }
  // Darstellung der Figur im Rig-Reiter
  look() { const f = this.ed.fig; if (!f) return; const on = this.active(); f.xray(on && this.o.xray); f.showWeights(on && this.o.w ? jointBone(this.o.sel) : null); }
  enter() { this.look(); this.place(); }
  leave() { this.g.visible = false; this.drag = null; this.look(); }
  // Kugeln und Linien an die Gelenke (A-Pose = Rig-Koordinaten)
  place() {
    const J = fullJoints(this.rig), sel = this.o.sel, d = this.ed.cam.dist, r = Math.max(0.004, Math.min(0.012, d * 0.0055));
    for (const k in this.balls) {
      const b = this.balls[k], p = J[k]; if (!p) { b.visible = false; continue; }
      b.position.fromArray(p); const isSel = k === sel || k === mir(sel), end = k[0] === "_";
      b.scale.setScalar(isSel ? r * 1.45 : end ? r * 0.75 : r); b.material.color.set(isSel ? 0xE2621B : end ? 0x9EA1A5 : 0xffffff); b.material.opacity = k === sel || !isSel ? 1 : 0.7;
    }
    const pts = []; LINES.forEach(([a, b]) => { pts.push(...J[a], ...J[b]); if (/Left/.test(a + b)) pts.push(...J[/Left/.test(a) ? mir(a) : a], ...J[mir(b)]); });
    this.lines.geometry.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3)); this.lines.geometry.computeBoundingSphere();
  }
  // ---------- jedes Bild ----------
  frame(dt) {
    const f = this.ed.fig; this.g.visible = this.active() && this.o.pose === "a" && !!f; if (!f || !this.active()) return false;
    if (this.o.pose === "anim") return false;                       // Animation wie Vorschau unten links
    this.t += dt;
    if (this.o.pose === "a") { f.bindPose(); this.place(); return true; }
    // Beugetest: Knie/Hüfte, Ellbogen/Schulter, Rumpf und Kopf im Wechsel bis an die Grenzen
    const s = (ph) => 0.5 - 0.5 * Math.cos(this.t * 1.7 + ph), B = f.b, q = (n, x, y, z) => B[n].quaternion.setFromEuler(new THREE.Euler(x, y, z));
    f.rest(); f.root.position.set(0, 0, 0); f.root.quaternion.identity();
    const a = s(0), b = s(Math.PI), c = s(Math.PI / 2);
    q("LeftUpperLeg", -1.6 * a, 0, 0.12 * c); q("LeftLowerLeg", 2.2 * a, 0, 0); q("LeftFoot", -0.5 * a + 0.4 * c, 0, 0);
    q("RightUpperLeg", -1.6 * b, 0, -0.12 * c); q("RightLowerLeg", 2.2 * b, 0, 0); q("RightFoot", -0.5 * b + 0.4 * c, 0, 0);
    q("LeftUpperArm", -1.5 * b, 0, 1.4 * a); q("LeftLowerArm", -2.2 * c, 0, 0); q("LeftHand", 0.7 * (a - b), 0, 0);
    q("RightUpperArm", -1.5 * a, 0, -1.4 * b); q("RightLowerArm", -2.2 * (1 - c), 0, 0); q("RightHand", 0.7 * (b - a), 0, 0);
    q("LeftShoulder", 0, 0, 0.25 * a); q("RightShoulder", 0, 0, -0.25 * b);
    q("Spine", 0.45 * (a - b), 0.5 * (c - 0.5), 0); q("Chest", 0.3 * (a - b), 0, 0.2 * (c - 0.5)); q("Neck", 0.4 * (c - 0.5), 0, 0); q("Head", 0.5 * (c - 0.5), 0.8 * (a - b), 0);
    return true;
  }
  // ---------- Maus ----------
  pick(e) {
    const cam = this.ed.engine.camera, r = this.ed.cv.getBoundingClientRect(), J = fullJoints(this.rig), v = new THREE.Vector3(); let best = null, bd = 14 * 14;
    for (const k in J) { v.fromArray(J[k]).project(cam); const x = (v.x + 1) / 2 * r.width + r.left, y = (1 - v.y) / 2 * r.height + r.top, d = (x - e.clientX) ** 2 + (y - e.clientY) ** 2; if (d < bd || (best && d <= bd + 4 && k === this.o.sel)) { bd = d; best = k; } }
    return best;
  }
  down(e) {
    if (!this.active() || e.button !== 0 || this.o.pose !== "a" || !this.ed.fig) return false;
    const k = this.pick(e); if (!k) return false;
    const right = /Right/.test(k), key = right ? k.replace("Right", "Left") : k;
    if (this.o.sel !== key) { this.o.sel = key; this.saveUI(); this.look(); this.ed.renderTab(); }
    const cam = this.ed.engine.camera, p = new THREE.Vector3().fromArray(fullJoints(this.rig)[k]), n = cam.getWorldDirection(new THREE.Vector3());
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(n, p), hit = this.ed.ray(e).intersectPlane(plane, new THREE.Vector3());
    this.drag = { key: key, right: right, plane: plane, off: hit ? p.clone().sub(hit) : new THREE.Vector3(), moved: false }; this.push();
    return true;
  }
  move(e) {
    if (!this.drag) return false;
    const D = this.drag, hit = this.ed.ray(e).intersectPlane(D.plane, new THREE.Vector3()); if (!hit) return true;
    hit.add(D.off); if (D.right) hit.x = -hit.x; if (MID[D.key]) hit.x = 0;
    const r5 = (v) => Math.round(v * 1e4) / 1e4; this.rig.joints[D.key] = [r5(hit.x), r5(hit.y), r5(hit.z)]; D.moved = true; this.place();
    const box = this.ed.root.querySelectorAll("[data-ri]"); box.forEach((i) => { i.value = Math.round(this.rig.joints[D.key][+i.dataset.ri] * 1000); });
    return true;
  }
  up() { if (!this.drag) return false; const m = this.drag.moved; this.drag = null; if (m) this.changed(true); else this.undo.pop(); this.ed.renderTab(); return true; }
  key(e) { if (!this.active()) return false; if ((e.ctrlKey || e.metaKey) && e.code === "KeyZ") { this.popUndo(); return true; } return false; }
  dispose() { clearTimeout(this.tm); this.ed.engine.scene.remove(this.g); for (const k in this.balls) { this.balls[k].geometry.dispose(); this.balls[k].material.dispose(); } this.lines.geometry.dispose(); this.lines.material.dispose(); }
}
