// ===== malen.js · Stoffpinsel im Kleidungs-Editor (seit v0.20) =====
// Auf den Stoff malen, ohne Pixel: jeder Strich ist eine Form (Element) auf der Ruheform des Stoffs und wird im Shader gezeichnet
// (kleidung.js, PAINT_GLSL). Dadurch bleibt alles scharf, egal wie nah man herangeht, und wandert beim Laufen mit dem Stoff mit.
// Werkzeuge: Pinsel rund/eckig und Radierer (frei malen), Linie, Streifen, Zickzack, Punkte, Pfeil (ziehen von A nach B),
// Kreis, Ring, Quadrat, Dreieck, Stern, Raute (Stempel, Klick), Fülleimer (ganzer Stoff: Farbe, Roughness, Metallic).
// Je Strich: Farbe, Größe, Weichheit, Roughness, Metallic; Symmetrie spiegelt jeden Strich auf die andere Seite.
// Gemalt wird wie im Punkt-Editor in der Bind-Pose (A-Pose), der Stoff ruht.
import * as THREE from "three";
import { t, addTexts, L2, esc } from "pru/core.js";
import { PAINT_T, CLOTHC } from "pru/kleidung.js";

addTexts({
  mTitle: L2("Malen", "Paint"), mTool: L2("Werkzeug", "Tool"), mColor: L2("Farbe", "Colour"), mSize: L2("Größe", "Size"), mRot: L2("Drehung (Stempel)", "Rotation (stamps)"),
  mSoft: L2("Weichheit (Kante)", "Softness (edge)"), mRough: L2("Roughness (matt ↔ glänzend: 100 % = matt)", "Roughness (100 % = matt)"), mMetal: L2("Metallic", "Metallic"),
  mN: L2("Anzahl Streifen", "Number of stripes"), mSym: L2("Symmetrie (links = rechts)", "Symmetry (left = right)"),
  mUndo: L2("Rückgängig", "Undo"), mClear: L2("Alles abmalen", "Clear paint"), mClearQ: L2("Alle Striche auf diesem Teil entfernen?", "Remove all paint from this piece?"),
  mCount: L2("{n} Striche", "{n} strokes"), mFull: L2("Zu viele Striche – größere Formen nehmen oder etwas abmalen.", "Too many strokes – use bigger shapes or clear some."),
  mHint: L2("Pinsel/Radierer: auf dem Stoff ziehen · Linie, Streifen, Zickzack, Punkte, Pfeil: von A nach B ziehen · Stempel: klicken · Fülleimer: Stoff anklicken = ganzer Stoff · daneben ziehen: drehen · Strg+Z: rückgängig",
    "Brush/eraser: drag on the fabric · line, stripes, zigzag, dots, arrow: drag from A to B · stamps: click · bucket: click the fabric = whole fabric · drag beside: orbit · Ctrl+Z: undo"),
  mt_rund: L2("Pinsel rund", "Round brush"), mt_eckig: L2("Pinsel eckig", "Square brush"), mt_radierer: L2("Radierer", "Eraser"),
  mt_linie: L2("Linie", "Line"), mt_streifen: L2("Streifen", "Stripes"), mt_zickzack: L2("Zickzack", "Zigzag"), mt_punkte: L2("Punkte", "Dots"), mt_pfeil: L2("Pfeil", "Arrow"),
  mt_kreis: L2("Kreis", "Circle"), mt_ring: L2("Ring", "Ring"), mt_quadrat: L2("Quadrat", "Square"), mt_dreieck: L2("Dreieck", "Triangle"), mt_stern: L2("Stern", "Star"), mt_raute: L2("Raute", "Diamond"),
  mt_eimer: L2("Fülleimer", "Bucket")
});

const TOOLS = { rund: "brush", eckig: "brush", radierer: "brush", linie: "drag", streifen: "drag", zickzack: "drag", punkte: "drag", pfeil: "drag",
  kreis: "stamp", ring: "stamp", quadrat: "stamp", dreieck: "stamp", stern: "stamp", raute: "stamp", eimer: "fill" };
// kleine Symbole für die Werkzeug-Knöpfe (24 × 24)
const ICO = {
  rund: '<path d="M4 18c4-9 8 3 16-10" stroke-width="4" stroke-linecap="round" fill="none"/>', eckig: '<path d="M4 18c4-9 8 3 16-10" stroke-width="4" stroke-linecap="square" stroke-linejoin="miter" fill="none"/>',
  radierer: '<path d="M5 15l8-8 6 6-5 5H8z" fill="none" stroke-width="2"/><path d="M9 19h11" stroke-width="2"/>',
  linie: '<path d="M4 19L20 5" stroke-width="3" stroke-linecap="round"/>', streifen: '<path d="M3 8h18M3 12h18M3 16h18" stroke-width="2.2"/>',
  zickzack: '<path d="M3 15l4-6 4 6 4-6 4 6" fill="none" stroke-width="2.2"/>', punkte: '<circle cx="5" cy="12" r="2.2"/><circle cx="12" cy="12" r="2.2"/><circle cx="19" cy="12" r="2.2"/>',
  pfeil: '<path d="M3 12h12" stroke-width="3"/><path d="M14 6l7 6-7 6z"/>', kreis: '<circle cx="12" cy="12" r="8"/>', ring: '<circle cx="12" cy="12" r="7" fill="none" stroke-width="3"/>',
  quadrat: '<rect x="5" y="5" width="14" height="14"/>', dreieck: '<path d="M12 4l8.5 15h-17z"/>', stern: '<path d="M12 3l2.6 6 6.4.6-4.9 4.2 1.5 6.3L12 16.8 6.4 20.1l1.5-6.3L3 9.6l6.4-.6z"/>',
  raute: '<path d="M12 3l7 9-7 9-7-9z"/>', eimer: '<path d="M5 9l7-5 7 7-7 6z" fill="none" stroke-width="2"/><path d="M19 13c1.5 2.5 2 4 0 5s-2-2.5 0-5z"/>'
};
const MAX = 2000, r4 = (v) => Math.round(v * 1e4) / 1e4, Y = new THREE.Vector3(0, 1, 0), XV = new THREE.Vector3(1, 0, 0);

export class MalEd {
  constructor(ed) { this.ed = ed; this.undo = []; this.o = { tool: "rund", color: "#ED6A5E", size: 0.012, rot: 0, soft: 0, rough: 0.86, metal: 0, n: 3, sym: true }; this.prev = []; }
  D() { return this.ed.cur; }
  active() { return this.ed.mode === "malen" && !!this.D() && !!this.ed.fig; }
  // ---------- Panel ----------
  html() {
    const D = this.D(); if (!D) return ""; const o = this.o, pct = (v) => Math.round(v * 100) + " %";
    const rng = (k, lab, min, max, step, val, out) => "<h4>" + lab + ' <em data-mout="' + k + '">' + out + '</em></h4><input type="range" data-mo="' + k + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + val + '">';
    const ty = TOOLS[o.tool];
    return "<h4>" + t("mTool") + '</h4><div class="pru-mtools">' + Object.keys(TOOLS).map((k) => '<button data-mt="' + k + '" title="' + esc(t("mt_" + k)) + '" aria-pressed="' + (k === o.tool) + '"><svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="0">' + ICO[k] + "</svg><span>" + esc(t("mt_" + k)) + "</span></button>").join("") + "</div>" +
      "<h4>" + t("mColor") + '</h4><div class="pru-sws">' + CLOTHC.map((c) => '<button class="pru-sw" style="background:' + c + '" data-mc="' + c + '" aria-pressed="' + (c.toLowerCase() === o.color.toLowerCase()) + '"></button>').join("") + '<label class="pru-sw pru-cust" title="' + t("cCustom") + '"><input type="color" data-mo="color" value="' + o.color + '"></label></div>' +
      (ty !== "fill" ? rng("size", t("mSize"), 0.002, 0.12, 0.001, o.size, Math.round(o.size * 1000) + " mm") : "") +
      (ty === "stamp" ? rng("rot", t("mRot"), 0, 360, 1, o.rot, Math.round(o.rot) + "°") : "") +
      (o.tool === "streifen" ? rng("n", t("mN"), 1, 6, 1, o.n, String(o.n)) : "") +
      (ty !== "fill" ? rng("soft", t("mSoft"), 0, 1, 0.01, o.soft, pct(o.soft)) : "") +
      (o.tool !== "radierer" ? rng("rough", t("mRough"), 0.05, 1, 0.01, o.rough, pct(o.rough)) + rng("metal", t("mMetal"), 0, 1, 0.01, o.metal, pct(o.metal)) : "") +
      '<label class="pru-chk"><input type="checkbox" data-mo="sym"' + (o.sym ? " checked" : "") + "> " + t("mSym") + "</label>" +
      "<p>" + t("mCount").replace("{n}", (D.paint || []).length) + "</p>" +
      '<div class="pru-hrow"><button data-ma="undo"' + (this.undo.length ? "" : " disabled") + ">" + t("mUndo") + '</button><button data-ma="clear"' + ((D.paint || []).length ? "" : " disabled") + ">" + t("mClear") + "</button></div><p>" + t("mHint") + "</p>";
  }
  cmd(a) {
    const D = this.D(); if (!D) return;
    if (a === "undo") return this.popUndo();
    if (a === "clear") { if (!(D.paint || []).length || !confirm(t("mClearQ"))) return; this.push(); D.paint = []; this.commit(); }
  }
  tool(k) { this.o.tool = k; this.prev = []; this.show(); this.ed.render(); }
  colorPick(c) { this.o.color = c; this.ed.render(); }
  input(i) {
    const k = i.dataset.mo, o = this.o;
    if (k === "sym") o.sym = i.checked; else if (k === "color") o.color = i.value; else o[k] = +i.value;
    const out = this.ed.root.querySelector('[data-mout="' + k + '"]');
    if (out) out.textContent = k === "size" ? Math.round(o.size * 1000) + " mm" : k === "rot" ? Math.round(o.rot) + "°" : k === "n" ? String(o.n) : Math.round(o[k] * 100) + " %";
  }
  // ---------- Striche ----------
  push() { const D = this.D(); this.undo.push(JSON.stringify({ p: D.paint || [], c: D.color, r: D.rough, m: D.metal })); if (this.undo.length > 60) this.undo.shift(); }
  popUndo() { const D = this.D(); if (!D || !this.undo.length) return; const u = JSON.parse(this.undo.pop()); D.paint = u.p; D.color = u.c; D.rough = u.r; D.metal = u.m; this.commit(); }
  // Richtung auf dem Stoff: waagrecht (von vorne gesehen nach rechts), gedreht um die Normale
  frameU(n, rot) { const u = Math.abs(n.y) > 0.95 ? XV.clone().addScaledVector(n, -n.x) : new THREE.Vector3().crossVectors(Y, n); u.normalize(); return rot ? u.applyAxisAngle(n, rot * Math.PI / 180) : u; }
  elem(ty, c, u, n, L, s, erase) {
    const o = this.o;
    return [ty, r4(c.x), r4(c.y), r4(c.z), r4(u.x), r4(u.y), r4(u.z), r4(n.x), r4(n.y), r4(n.z), r4(L), r4(s), Math.round(o.soft * 100) / 100, o.n, 1, erase ? null : o.color, Math.round(o.rough * 100) / 100, Math.round(o.metal * 100) / 100];
  }
  // Spiegelbild (x ↔ −x): Mitte, Richtung, Normale gespiegelt, Spiegel-Vorzeichen dreht die Form mit
  mirror(e) { const m = e.slice(); m[1] = -m[1]; m[4] = -m[4]; m[7] = -m[7]; m[14] = -e[14]; return m; }
  withSym(e, stamp) { if (!this.o.sym) return [e]; const centred = Math.abs(e[1]) < 0.003 && (stamp || Math.abs(e[4]) > 0.98 || Math.abs(e[4]) < 0.03 || e[10] < 1e-4); return centred ? [e] : [e, this.mirror(e)]; }
  // Strich von a nach b (Linie, Pinsel-Stück): Mitte, Richtung in der Tangentenebene, halbe Länge
  span(ty, a, na, b, nb, erase) {
    const n = na.clone().add(nb); if (n.lengthSq() < 1e-6) n.copy(na); n.normalize();
    const d = b.clone().sub(a); d.addScaledVector(n, -d.dot(n)); const L = d.length() / 2;
    const u = L > 1e-5 ? d.normalize() : this.frameU(n, this.o.rot);
    return this.elem(ty, a.clone().add(b).multiplyScalar(0.5), u, n, L, this.o.size / 2, erase);
  }
  add(list) {
    const D = this.D(); D.paint = D.paint || [];
    if (D.paint.length + list.length > MAX) { if (!this.fullT) { this.fullT = 1; this.ed.app.toast(t("mFull")); setTimeout(() => { this.fullT = 0; }, 3000); } return false; }
    D.paint.push(...list); return true;
  }
  // Vorschau ohne Speichern (Stempel unter der Maus, Linie beim Ziehen, Pinselstrich)
  show() { const C = this.ed.cloth(), D = this.D(); if (C && D) C.previewPaint((D.paint || []).concat(this.prev)); }
  commit() { this.prev = []; this.ed.save(); if (this.ed.fig) this.ed.fig.setLook(this.ed.figLook()); this.show(); this.ed.render(); }
  frame() {
    const on = this.active(); if (!on) return;
    const f = this.ed.fig; f.bindPose();
    const C = this.ed.cloth(); if (C && (C.first || C !== this.lc)) { C.showRest(); this.lc = C; this.show(); }
  }
  // ---------- Maus ----------
  hit(e) { const C = this.ed.cloth(); return C ? C.pick(this.ed.ray(e), true) : null; }
  down(e) {
    if (!this.active() || e.button !== 0) return false;
    const h = this.hit(e); if (!h) return false;
    const o = this.o, ty = TOOLS[o.tool], D = this.D();
    if (ty === "fill") { this.push(); D.color = o.color; D.rough = o.rough; D.metal = o.metal; this.commit(); return true; }
    if (ty === "stamp") { this.push(); const e2 = this.elem(PAINT_T[o.tool], h.point, this.frameU(h.normal, o.rot), h.normal, 0, o.size / 2, false); this.add(this.withSym(e2, true)); this.commit(); return true; }
    if (ty === "brush") {
      this.push(); this.stroke = { p: h.point, n: h.normal }; this.prev = [];
      this.add(this.withSym(this.span(o.tool === "eckig" ? PAINT_T.eckig : PAINT_T.rund, h.point, h.normal, h.point, h.normal, o.tool === "radierer"), false)); this.show(); return true;
    }
    this.dragS = { p: h.point, n: h.normal }; this.prev = this.withSym(this.span(PAINT_T[o.tool], h.point, h.normal, h.point, h.normal, false), false); this.show(); return true;
  }
  move(e) {
    if (!this.active()) return false;
    const o = this.o;
    if (this.stroke) {
      const h = this.hit(e); if (!h) { this.stroke.p = null; return true; }
      const S = this.stroke, ty = o.tool === "eckig" ? PAINT_T.eckig : PAINT_T.rund, er = o.tool === "radierer";
      if (!S.p) { S.p = h.point; S.n = h.normal; this.add(this.withSym(this.span(ty, h.point, h.normal, h.point, h.normal, er), false)); this.show(); return true; }
      const d = S.p.distanceTo(h.point); if (d < Math.max(o.size * 0.35, 0.0012)) return true;
      if (d > 0.08) { S.p = h.point; S.n = h.normal; return true; }   // Sprung (über eine Kante): neu ansetzen
      this.add(this.withSym(this.span(ty, S.p, S.n, h.point, h.normal, er), false)); S.p = h.point; S.n = h.normal; this.show(); return true;
    }
    if (this.dragS) { const h = this.hit(e); if (h) { this.prev = this.withSym(this.span(PAINT_T[o.tool], this.dragS.p, this.dragS.n, h.point, h.normal, false), false); this.show(); } return true; }
    // Stempel-Vorschau unter der Maus
    if (TOOLS[o.tool] === "stamp" && !e.buttons) { const h = this.hit(e); this.prev = h ? this.withSym(this.elem(PAINT_T[o.tool], h.point, this.frameU(h.normal, o.rot), h.normal, 0, o.size / 2, false), true) : []; this.show(); }
    return false;
  }
  up() {
    if (this.stroke) { this.stroke = null; this.commit(); return true; }
    if (this.dragS) { this.dragS = null; if (this.prev.length) { this.push(); this.add(this.prev); } this.commit(); return true; }
    return false;
  }
  key(e) {
    if (!this.active()) return false;
    if ((e.ctrlKey || e.metaKey) && e.code === "KeyZ") { this.popUndo(); return true; }
    return false;
  }
  leave() { this.prev = []; this.stroke = null; this.dragS = null; this.lc = null; }
}
