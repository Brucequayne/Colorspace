// ===== punkte.js · Punkt-Editor im Kleidungs-Editor (seit v0.19) =====
// Das Kleidungsstück wird als eigenes Netz übernommen (mesh im Entwurf, siehe kleidung.js) und Punkt für Punkt bearbeitet:
// auswählen (Klick, Shift+Klick, Shift+Ziehen = Rahmen), verschieben mit X/Y/Z-Pfeilen oder Zahlen, Symmetrie (x ↔ −x),
// „auf die Haut legen“ (Punkt gleitet über die Körperoberfläche, hält seinen Stoffabstand), weiche Auswahl (Radius),
// löschen, unterteilen (feinere Kanten), rückgängig. Bearbeitet wird in der Bind-Pose (A-Pose), ohne Physik.
import * as THREE from "three";
import { t, addTexts, L2, el, clamp } from "pru/core.js";
import { bakeMesh, bodySearch } from "pru/kleidung.js";

addTexts({
  pTitle: L2("Punkte", "Points"), pRings: L2("Ringe", "Rings"), pTake: L2("Netz übernehmen und Punkte bearbeiten", "Take over the mesh and edit points"),
  pTakeQ: L2("Das Kleidungsstück wird als eigenes Netz übernommen. Danach gelten die Ringe für dieses Teil nicht mehr (zurück mit „Netz verwerfen“). Weiter?", "The garment becomes its own mesh. The rings no longer apply to this piece afterwards (go back with “Discard mesh”). Continue?"),
  pOwn: L2("Dieses Teil hat ein eigenes Netz (Punkte). Die Ringe gelten nicht mehr.", "This piece has its own mesh (points). The rings no longer apply."),
  pDiscard: L2("Netz verwerfen (zurück zu Ringen)", "Discard mesh (back to rings)"), pDiscardQ: L2("Eigenes Netz verwerfen? Alle Punkt-Änderungen gehen verloren.", "Discard the own mesh? All point edits are lost."),
  pSel: L2("{n} Punkte gewählt", "{n} points selected"), pPos: L2("Position (Mitte der Auswahl, mm)", "Position (centre of selection, mm)"),
  pSym: L2("Symmetrie (links = rechts)", "Symmetry (left = right)"), pSkin: L2("Auf die Haut legen", "Stick to the skin"), pSoft: L2("Weiche Auswahl", "Soft selection"),
  pNone: L2("Alles abwählen", "Select none"), pAll: L2("Alles wählen", "Select all"), pDel: L2("Löschen", "Delete"), pSub: L2("Unterteilen", "Subdivide"), pUndo: L2("Rückgängig", "Undo"),
  pGrow: L2("Auswahl erweitern", "Grow selection"),
  pHint: L2("Klick: Punkt wählen · Shift+Klick: dazu/weg · Shift+Ziehen: Rahmen · Pfeile ziehen: verschieben (rot X, grün Y, blau Z) · Entf: löschen · Strg+Z: rückgängig · daneben ziehen: drehen",
    "Click: select point · Shift+click: add/remove · Shift+drag: box · drag arrows: move (red X, green Y, blue Z) · Del: delete · Ctrl+Z: undo · drag beside: orbit"),
  pCount: L2("{n} Punkte, {t} Dreiecke", "{n} points, {t} triangles")
});

const AX = [[1, 0, 0, 0xE5484D], [0, 1, 0, 0x46A758], [0, 0, 1, 0x3E8EF7]];
export class PunktEd {
  constructor(ed) {
    this.ed = ed; this.sel = new Set(); this.undo = []; this.o = { sym: true, skin: true, soft: 0 };
    this.g = new THREE.Group(); this.g.visible = false; ed.engine.scene.add(this.g);
    this.pts = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ size: 6, sizeAttenuation: false, vertexColors: true, depthTest: true }));
    this.wire = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xECEAE4, transparent: true, opacity: 0.35 }));
    this.pts.renderOrder = 41; this.wire.renderOrder = 40; this.g.add(this.wire); this.g.add(this.pts);
    // Pfeile (Gizmo) mit dicken unsichtbaren Griffen zum Anklicken
    this.giz = new THREE.Group(); this.g.add(this.giz); this.handles = [];
    AX.forEach(([x, y, z, c], i) => {
      const d = new THREE.Vector3(x, y, z), m = new THREE.MeshBasicMaterial({ color: c, depthTest: false });
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0012, 0.05, 6), m); shaft.position.copy(d).multiplyScalar(0.025);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.004, 0.012, 10), m); tip.position.copy(d).multiplyScalar(0.056);
      const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.065, 6), new THREE.MeshBasicMaterial({ visible: false })); hit.position.copy(d).multiplyScalar(0.032); hit.userData.ax = i;
      [shaft, tip, hit].forEach((o) => { o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d); o.renderOrder = 45; this.giz.add(o); });
      this.handles.push(hit);
    });
    this.box = el("div", ""); this.box.style.cssText = "position:absolute;border:1px solid #E2621B;background:rgba(226,98,27,.12);pointer-events:none;display:none;z-index:9"; ed.app.ui.appendChild(this.box);
  }
  D() { return this.ed.cur; }
  data() { return this.ed.fig && this.ed.fig.data; }
  active() { return this.ed.mode === "punkte" && !!this.D() && !!this.D().mesh && !!this.ed.fig; }
  // ---------- Netz übernehmen ----------
  take() {
    const D = this.D(), data = this.data(); if (!D || !data) return;
    if (!D.mesh) { if (!confirm(t("pTakeQ"))) return false; D.mesh = bakeMesh(data, D); }
    this.prep(); return true;
  }
  // Spiegelpartner und Hautabstand je Punkt
  prep() {
    const M = this.D().mesh, P = M.pos, n = P.length / 3, S = bodySearch(this.data()), v = new THREE.Vector3();
    const grid = new Map(), C = 0.004, key = (x, y, z) => Math.round(x / C) + "," + Math.round(y / C) + "," + Math.round(z / C);
    for (let i = 0; i < n; i++) { const k = key(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]); (grid.get(k) || grid.set(k, []).get(k)).push(i); }
    this.mir = new Int32Array(n).fill(-1);
    for (let i = 0; i < n; i++) {
      const x = -P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2]; if (Math.abs(x) < 0.0015) { this.mir[i] = i; continue; }
      let best = -1, bd = 0.003 * 0.003;
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) { const L = grid.get((Math.round(x / C) + a) + "," + (Math.round(y / C) + b) + "," + (Math.round(z / C) + c)); if (L) for (const j of L) { const d = (P[j * 3] - x) ** 2 + (P[j * 3 + 1] - y) ** 2 + (P[j * 3 + 2] - z) ** 2; if (d < bd) { bd = d; best = j; } } }
      this.mir[i] = best;
    }
    this.off = new Float32Array(n);
    for (let i = 0; i < n; i++) { const r = S.project(v.fromArray(P, i * 3), 0); this.off[i] = r ? Math.max(0.0015, r.p.distanceTo(v)) : 0.003; }
    this.sel = new Set([...this.sel].filter((i) => i < n));
  }
  discard() { const D = this.D(); if (!D || !D.mesh || !confirm(t("pDiscardQ"))) return; D.mesh = null; this.sel.clear(); this.undo = []; this.ed.mode = "ringe"; this.ed.changed(true); this.ed.apply(); }
  // ---------- Panel ----------
  html() {
    const D = this.D(); if (!D) return "";
    if (!D.mesh) return '<div class="pru-col"><button class="pru-pri" data-pe="take">' + t("pTake") + "</button></div><p>" + t("pHint") + "</p>";
    const c = this.center(), M = D.mesh, mm = (v) => Math.round(v * 1000);
    return "<p>" + t("pOwn") + " " + t("pCount").replace("{n}", M.pos.length / 3).replace("{t}", M.tris.length / 3) + "</p>" +
      "<h4>" + t("pSel").replace("{n}", this.sel.size) + "</h4>" +
      (this.sel.size ? "<h4>" + t("pPos") + '</h4><div class="pru-hrow">' + ["x", "y", "z"].map((k, i) => '<input type="number" step="1" data-pi="' + k + '" value="' + mm(c.getComponent(i)) + '" style="width:33%;background:#1B1C1F;color:#ECEAE4;border:1px solid #3A3D42;padding:5px">').join("") + "</div>" : "") +
      '<label class="pru-chk"><input type="checkbox" data-po="sym"' + (this.o.sym ? " checked" : "") + "> " + t("pSym") + "</label>" +
      '<label class="pru-chk"><input type="checkbox" data-po="skin"' + (this.o.skin ? " checked" : "") + "> " + t("pSkin") + "</label>" +
      "<h4>" + t("pSoft") + ' <em data-pout="soft">' + Math.round(this.o.soft * 1000) + ' mm</em></h4><input type="range" data-po="soft" min="0" max="0.08" step="0.001" value="' + this.o.soft + '">' +
      '<div class="pru-hrow"><button data-pe="none">' + t("pNone") + '</button><button data-pe="all">' + t("pAll") + '</button></div><div class="pru-hrow"><button data-pe="grow">' + t("pGrow") + '</button><button data-pe="sub"' + (this.sel.size ? "" : " disabled") + ">" + t("pSub") + "</button></div>" +
      '<div class="pru-hrow"><button data-pe="del"' + (this.sel.size ? "" : " disabled") + ">" + t("pDel") + '</button><button data-pe="undo"' + (this.undo.length ? "" : " disabled") + ">" + t("pUndo") + "</button></div>" +
      '<div class="pru-col"><button data-pe="discard">' + t("pDiscard") + "</button></div><p>" + t("pHint") + "</p>";
  }
  cmd(a) {
    if (a === "take") { if (this.take()) this.commit(true); return; }
    if (a === "discard") return this.discard();
    const M = this.D() && this.D().mesh; if (!M) return;
    if (a === "none") this.sel.clear();
    else if (a === "all") this.sel = new Set(Array.from({ length: M.pos.length / 3 }, (_, i) => i));
    else if (a === "grow") { const add = []; for (let t2 = 0; t2 < M.tris.length; t2 += 3) { const tr = [M.tris[t2], M.tris[t2 + 1], M.tris[t2 + 2]]; if (tr.some((i) => this.sel.has(i))) add.push(...tr); } add.forEach((i) => this.sel.add(i)); }
    else if (a === "del") { this.push(); this.del(); }
    else if (a === "sub") { this.push(); this.subdivide(); }
    else if (a === "undo") { this.popUndo(); return; }
    this.commit(true);
  }
  input(i) {
    if (i.dataset.po) { this.o[i.dataset.po] = i.type === "checkbox" ? i.checked : +i.value; const o = this.ed.root.querySelector('[data-pout="' + i.dataset.po + '"]'); if (o) o.textContent = Math.round(this.o.soft * 1000) + " mm"; this.colors(); return; }
    if (i.dataset.pi && this.sel.size) {
      const k = "xyz".indexOf(i.dataset.pi), c = this.center(), d = new THREE.Vector3(); d.setComponent(k, (+i.value) / 1000 - c.getComponent(k));
      this.push(); this.beginMove(); this.moveBy(d); this.endMove();
    }
  }
  // ---------- Bearbeiten ----------
  push() { const M = this.D().mesh; this.undo.push(JSON.stringify(M)); if (this.undo.length > 40) this.undo.shift(); }
  popUndo() { if (!this.undo.length) return; this.D().mesh = JSON.parse(this.undo.pop()); this.D().mesh.rev = (this.D().mesh.rev || 0) + 1000 + this.undo.length; this.prep(); this.commit(true); }
  center() { const P = this.D().mesh.pos, c = new THREE.Vector3(); if (!this.sel.size) return c; this.sel.forEach((i) => c.add(new THREE.Vector3(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]))); return c.multiplyScalar(1 / this.sel.size); }
  // Gewichte beim Start einer Bewegung: Auswahl = 1, weiche Auswahl nach Abstand, Spiegelpartner mit gespiegelter Bewegung
  beginMove() {
    const P = this.D().mesh.pos, n = P.length / 3, R = this.o.soft, w = new Float32Array(n), sel = [...this.sel];
    sel.forEach((i) => { w[i] = 1; });
    if (R > 0) for (let j = 0; j < n; j++) { if (w[j] >= 1) continue; let md = 1e9; for (const i of sel) { const d = Math.hypot(P[j * 3] - P[i * 3], P[j * 3 + 1] - P[i * 3 + 1], P[j * 3 + 2] - P[i * 3 + 2]); if (d < md) md = d; } if (md < R) w[j] = Math.pow(1 - md / R, 2); }
    const wm = new Float32Array(n); if (this.o.sym) for (let j = 0; j < n; j++) if (w[j] > 0) { const m = this.mir[j]; if (m >= 0 && m !== j && w[m] < w[j]) wm[m] = Math.max(wm[m], w[j]); }
    this.mv = { start: Float32Array.from(P), w: w, wm: wm, acc: new THREE.Vector3() };
  }
  moveBy(d) {
    const M = this.D().mesh, P = M.pos, n = P.length / 3, mv = this.mv; mv.acc.add(d);
    const S = bodySearch(this.data()), v = new THREE.Vector3(), a = mv.acc;
    for (let j = 0; j < n; j++) {
      let w = mv.w[j], sx = 1; if (w <= 0 && mv.wm[j] > 0) { w = mv.wm[j]; sx = -1; } if (w <= 0) continue;
      const self = this.o.sym && this.mir[j] === j;
      v.set(mv.start[j * 3] + (self ? 0 : a.x * sx * w), mv.start[j * 3 + 1] + a.y * w, mv.start[j * 3 + 2] + a.z * w);
      if (this.o.skin) { const r = S.project(v, this.off[j]); if (r) { v.copy(r.p); M.src[j] = r.i; } }
      else { const i = S.nearest(v.x, v.y, v.z); if (i >= 0) M.src[j] = i; }
      if (self) v.x = 0;
      P[j * 3] = Math.round(v.x * 1e5) / 1e5; P[j * 3 + 1] = Math.round(v.y * 1e5) / 1e5; P[j * 3 + 2] = Math.round(v.z * 1e5) / 1e5;
    }
    M.rev = (M.rev || 0) + 1; this.dirty = true;
  }
  endMove() { this.mv = null; this.commit(true); }
  del() {
    const M = this.D().mesh, n = M.pos.length / 3, kill = new Set(this.sel);
    if (this.o.sym) [...kill].forEach((i) => { const m = this.mir[i]; if (m >= 0) kill.add(m); });
    const map = new Int32Array(n).fill(-1), pos = [], src = [], pin = []; let k = 0;
    for (let i = 0; i < n; i++) if (!kill.has(i)) { map[i] = k++; pos.push(M.pos[i * 3], M.pos[i * 3 + 1], M.pos[i * 3 + 2]); src.push(M.src[i]); pin.push(M.pin[i]); }
    const tris = []; for (let t2 = 0; t2 < M.tris.length; t2 += 3) { const a = map[M.tris[t2]], b = map[M.tris[t2 + 1]], c = map[M.tris[t2 + 2]]; if (a >= 0 && b >= 0 && c >= 0) tris.push(a, b, c); }
    // Punkte ohne Dreieck fallen weg
    const used = new Set(tris), map2 = new Int32Array(k).fill(-1), pos2 = [], src2 = [], pin2 = []; let k2 = 0;
    for (let i = 0; i < k; i++) if (used.has(i)) { map2[i] = k2++; pos2.push(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]); src2.push(src[i]); pin2.push(pin[i]); }
    M.pos = pos2; M.src = src2; M.pin = pin2; M.tris = tris.map((i) => map2[i]);
    M.extra = (M.extra || []).map((i) => (map[i] >= 0 ? map2[map[i]] : -1)).filter((i) => i >= 0);
    M.rev = (M.rev || 0) + 1; this.sel.clear(); this.prep();
  }
  // Dreiecke, deren Kanten zwischen gewählten Punkten liegen, teilen (Kantenmitten, ohne Lücken zu den Nachbarn)
  subdivide() {
    const M = this.D().mesh, sel = new Set(this.sel); if (this.o.sym) [...sel].forEach((i) => { const m = this.mir[i]; if (m >= 0) sel.add(m); });
    const mid = new Map(), S = bodySearch(this.data()), v = new THREE.Vector3();
    const midOf = (a, b) => {
      if (!(sel.has(a) && sel.has(b))) return -1; const k = a < b ? a + "_" + b : b + "_" + a; if (mid.has(k)) return mid.get(k);
      const id = M.pos.length / 3; v.set((M.pos[a * 3] + M.pos[b * 3]) / 2, (M.pos[a * 3 + 1] + M.pos[b * 3 + 1]) / 2, (M.pos[a * 3 + 2] + M.pos[b * 3 + 2]) / 2);
      const off = (this.off[a] + this.off[b]) / 2, r = this.o.skin ? S.project(v, off) : null; if (r) v.copy(r.p);
      M.pos.push(Math.round(v.x * 1e5) / 1e5, Math.round(v.y * 1e5) / 1e5, Math.round(v.z * 1e5) / 1e5); M.src.push(r ? r.i : S.nearest(v.x, v.y, v.z)); M.pin.push((M.pin[a] + M.pin[b]) / 2);
      mid.set(k, id); this.sel.add(id); return id;
    };
    const T = M.tris, out = [];
    for (let t2 = 0; t2 < T.length; t2 += 3) {
      const a = T[t2], b = T[t2 + 1], c = T[t2 + 2], ab = midOf(a, b), bc = midOf(b, c), ca = midOf(c, a), k = (ab >= 0) + (bc >= 0) + (ca >= 0);
      if (k === 0) out.push(a, b, c);
      else if (k === 3) out.push(a, ab, ca, ab, b, bc, ca, bc, c, ab, bc, ca);
      else if (k === 1) { if (ab >= 0) out.push(a, ab, c, ab, b, c); else if (bc >= 0) out.push(a, b, bc, a, bc, c); else out.push(a, b, ca, ca, b, c); }
      else { if (ab < 0) out.push(a, b, bc, a, bc, ca, ca, bc, c); else if (bc < 0) out.push(a, ab, ca, ab, b, c, ca, ab, c); else out.push(a, ab, bc, a, bc, c, ab, b, bc); }
    }
    M.tris = out; M.rev = (M.rev || 0) + 1; this.prep();
  }
  // ---------- Anzeige ----------
  commit(full) {
    this.ed.save(); if (this.ed.fig) this.ed.fig.setLook(this.ed.figLook()); this.dirty = false; this.rest(); this.geo(); if (full) this.ed.render();
  }
  rest() { const C = this.ed.cloth(); if (C) C.showRest(); }
  geo() {
    const M = this.D() && this.D().mesh; if (!M) { this.g.visible = false; return; }
    const P = new Float32Array(M.pos), n = P.length / 3, gp = new THREE.BufferGeometry(); gp.setAttribute("position", new THREE.BufferAttribute(P, 3)); gp.setAttribute("color", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    this.pts.geometry.dispose(); this.pts.geometry = gp;
    const E = new Set(), L = []; for (let t2 = 0; t2 < M.tris.length; t2 += 3) for (let k = 0; k < 3; k++) { const a = M.tris[t2 + k], b = M.tris[t2 + (k + 1) % 3], key = a < b ? a * 1e6 + b : b * 1e6 + a; if (!E.has(key)) { E.add(key); L.push(a, b); } }
    const gw = new THREE.BufferGeometry(); gw.setAttribute("position", new THREE.BufferAttribute(P, 3)); gw.setIndex(L); this.wire.geometry.dispose(); this.wire.geometry = gw;
    this.colors();
  }
  colors() {
    const M = this.D() && this.D().mesh; if (!M || !this.pts.geometry.attributes.color) return;
    const col = this.pts.geometry.attributes.color.array, n = M.pos.length / 3, P = M.pos, R = this.o.soft, sel = [...this.sel];
    for (let j = 0; j < n; j++) {
      let w = this.sel.has(j) ? 1 : 0;
      if (!w && R > 0 && sel.length < 400) { let md = 1e9; for (const i of sel) { const d = Math.hypot(P[j * 3] - P[i * 3], P[j * 3 + 1] - P[i * 3 + 1], P[j * 3 + 2] - P[i * 3 + 2]); if (d < md) md = d; } if (md < R) w = Math.pow(1 - md / R, 2) * 0.8; }
      col[j * 3] = 0.85 + 0.03 * w; col[j * 3 + 1] = 0.85 - 0.45 * w; col[j * 3 + 2] = 0.82 - 0.7 * w;
    }
    this.pts.geometry.attributes.color.needsUpdate = true;
    this.giz.visible = this.sel.size > 0; if (this.sel.size) this.giz.position.copy(this.center());
  }
  // Bild: Figur in der Bind-Pose, Stoff in Ruheform, Pfeile in gleicher Bildschirmgröße
  frame() {
    const on = this.active(); this.g.visible = on; if (!on) return;
    const f = this.ed.fig; f.bindPose();
    if (this.dirty && (!this.lastC || performance.now() - this.lastC > 60)) { this.lastC = performance.now(); if (f) f.setLook(this.ed.figLook()); this.rest(); this.geo(); this.dirty = false; }
    const cam = this.ed.engine.camera; this.giz.scale.setScalar(Math.max(0.3, cam.position.distanceTo(this.giz.position) / 0.8));
  }
  // ---------- Maus ----------
  scr(i, out) { const M = this.D().mesh, cam = this.ed.engine.camera, r = this.ed.cv.getBoundingClientRect(); out.set(M.pos[i * 3], M.pos[i * 3 + 1], M.pos[i * 3 + 2]).project(cam); return [(out.x + 1) / 2 * r.width + r.left, (1 - out.y) / 2 * r.height + r.top, out.z]; }
  facing(i) { const C = this.ed.cloth(); if (!C || !C.outer.attributes.normal) return true; const N = C.outer.attributes.normal.array, P = this.D().mesh.pos, cam = this.ed.engine.camera.position; return (cam.x - P[i * 3]) * N[i * 3] + (cam.y - P[i * 3 + 1]) * N[i * 3 + 1] + (cam.z - P[i * 3 + 2]) * N[i * 3 + 2] > -0.002; }
  pickPoint(e) { const M = this.D().mesh, n = M.pos.length / 3, v = new THREE.Vector3(); let best = -1, bz = 9; for (let i = 0; i < n; i++) { const s = this.scr(i, v); if (Math.hypot(s[0] - e.clientX, s[1] - e.clientY) < 9 && s[2] < bz && this.facing(i)) { bz = s[2]; best = i; } } return best; }
  down(e) {
    if (!this.active() || e.button !== 0) return false;
    // Pfeil?
    if (this.sel.size) { const rc = new THREE.Raycaster(); rc.ray.copy(this.ed.ray(e)); const h = rc.intersectObjects(this.handles, false)[0]; if (h) { this.push(); this.beginMove(); this.axDrag = { ax: h.object.userData.ax, x: e.clientX, y: e.clientY }; return true; } }
    const i = this.pickPoint(e);
    if (i >= 0) { if (e.shiftKey) { if (this.sel.has(i)) this.sel.delete(i); else this.sel.add(i); } else { this.sel = new Set([i]); } this.colors(); this.ed.render(); return true; }
    if (e.shiftKey) { this.boxS = { x: e.clientX, y: e.clientY }; return true; }
    if (!e.shiftKey && this.sel.size && !e.altKey) { /* Klick ins Leere: Drehen, Auswahl bleibt */ }
    return false;
  }
  move(e) {
    if (this.axDrag) {
      const A = this.axDrag, dx = e.clientX - A.x, dy = e.clientY - A.y; A.x = e.clientX; A.y = e.clientY;
      const c = this.center(), d = new THREE.Vector3(AX[A.ax][0], AX[A.ax][1], AX[A.ax][2]), v = new THREE.Vector3(), r = this.ed.cv.getBoundingClientRect(), cam = this.ed.engine.camera;
      const p0 = v.copy(c).project(cam), x0 = p0.x, y0 = p0.y, p1 = new THREE.Vector3().copy(c).addScaledVector(d, 0.05).project(cam);
      const sx = (p1.x - x0) / 2 * r.width, sy = -(p1.y - y0) / 2 * r.height, l2 = sx * sx + sy * sy; if (l2 < 1e-6) return true;
      this.moveBy(d.multiplyScalar(0.05 * (dx * sx + dy * sy) / l2)); this.giz.position.copy(this.center()); return true;
    }
    if (this.boxS) { const b = this.box.style, x0 = Math.min(this.boxS.x, e.clientX), y0 = Math.min(this.boxS.y, e.clientY), R = this.ed.app.ui.getBoundingClientRect(); b.display = "block"; b.left = x0 - R.left + "px"; b.top = y0 - R.top + "px"; b.width = Math.abs(e.clientX - this.boxS.x) + "px"; b.height = Math.abs(e.clientY - this.boxS.y) + "px"; this.boxE = { x: e.clientX, y: e.clientY }; return true; }
    return false;
  }
  up() {
    if (this.axDrag) { this.axDrag = null; this.endMove(); return true; }
    if (this.boxS) {
      const E = this.boxE || this.boxS, x0 = Math.min(this.boxS.x, E.x), x1 = Math.max(this.boxS.x, E.x), y0 = Math.min(this.boxS.y, E.y), y1 = Math.max(this.boxS.y, E.y), n = this.D().mesh.pos.length / 3, v = new THREE.Vector3();
      for (let i = 0; i < n; i++) { const s = this.scr(i, v); if (s[0] >= x0 && s[0] <= x1 && s[1] >= y0 && s[1] <= y1 && s[2] < 1 && this.facing(i)) this.sel.add(i); }
      this.boxS = null; this.boxE = null; this.box.style.display = "none"; this.colors(); this.ed.render(); return true;
    }
    return false;
  }
  key(e) {
    if (!this.active()) return false;
    if (e.key === "Delete" || e.key === "Backspace") { if (this.sel.size) this.cmd("del"); return true; }
    if ((e.ctrlKey || e.metaKey) && e.code === "KeyZ") { this.popUndo(); return true; }
    return false;
  }
  dispose() { this.ed.engine.scene.remove(this.g); this.pts.geometry.dispose(); this.wire.geometry.dispose(); this.box.remove(); }
}
