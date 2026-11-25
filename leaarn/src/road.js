// ===== road.js · Straße: Spline-Punkte, Netz, Abfrage für Physik, Einbettung ins Gelände =====
// Punkte: { x, z, y (Höhe), w (Breite m), bank (Neigung in Grad, + = linke Seite höher), cl, cr (Kerbs links/rechts ab diesem Punkt) }.
// t (seit v0.12): 1 = Gelände anpassen ab diesem Punkt, 0 = Straße liegt aufs vorhandene Gelände (nur Hervorstehendes wird abgetragen).
// sl, sr (seit v0.16): Gehweg links/rechts ab diesem Punkt (zusätzlich oder statt Kerbs, liegt außen neben den Kerbs),
// gs: Gehweg-Stil 0 = europäisch (kleine Backsteine), 1 = amerikanisch (große Betonplatten). Gehweg: Bordstein 15 cm hoch, 2,4 m breit.
// a = Hilfspunkt (beim Platzieren erzeugt, kleiner Griff). j = Ende mündet in eine andere Straße (Abzweigung/Einmündung,
// Höhe wird an die andere Straße angeglichen). b = Brücke ab diesem Punkt erzwingen (seit v0.13).
// Seit v0.13 gibt es mehrere Straßen (world.roads). Kreuzt eine Straße eine andere mindestens 3 m höher, wird sie dort
// automatisch zur Brücke (Überführung).
// Die Straße folgt nur ihren eigenen Punkten (Catmull-Rom), nicht dem Gelände. Mit Gelände-Anpassung wird das Gelände unter ihr
// weggedrückt und läuft mit einer Böschung (fall) wieder in die Grundhöhe über. Ohne Anpassung entsteht über Senken
// automatisch eine Betonbrücke (Fahrbahnplatte, Brüstungen, Pfeiler).
import * as THREE from "three";
import { clamp, lerp, smooth, DEG, hash2 } from "le/core.js";

const COL = { asphalt: new THREE.Color("#3D3E41"), line: new THREE.Color("#E9E7E1"), red: new THREE.Color("#C42F26"), white: new THREE.Color("#EDEDEA"), skirt: new THREE.Color("#55524D"), dark: new THREE.Color("#1C1C1E") };
const STEP = 2;    // Abstand der Querschnitte in Metern
const CW = 1.3;    // Kerb-Breite
const GRID = 16;   // Raster für die Abfrage
const BR = 1.4;    // ab dieser Höhe über dem Gelände wird (ohne Gelände-Anpassung) eine Brücke gebaut
const DECK = 1.0;  // Dicke der Brückenplatte
const PW = 0.4, PT = 0.35, PH = 0.9;   // Brücke: Randstreifen bis zur Brüstung, Brüstungsdicke, Brüstungshöhe
const GW = 2.2, KH = 0.15, KB = 0.18;   // Gehweg: Breite (mit Bordstein), Bordstein-Höhe, Bordstein-Breite oben
// Straßentypen (seit v0.19): fertige Straßen, Spur = 2,6 m (Auto 1,8 m breit). w = Fahrbahnbreite, gw = Gehweg auf beiden Seiten (amerikanisch)
export const TYPEN = {
  zwei: { w: 5.8, lanes: 2, gw: false }, "zwei-gw": { w: 5.8, lanes: 2, gw: true },
  ein: { w: 3.4, lanes: 1, one: true, gw: false }, "ein-gw": { w: 3.4, lanes: 1, one: true, gw: true },
  rad: { w: 1.8, bike: true, gw: false }
};
const BIKE = new THREE.Color("#8E4C44");
const CURB = new THREE.Color("#9C9A93"), CURB2 = new THREE.Color("#B4B2AB");
const CON = { a: new THREE.Color("#A3A19B"), b: new THREE.Color("#8A8882"), c: new THREE.Color("#B9B7B0"), d: new THREE.Color("#74726D") };

// Gehweg-Texturen (seit v0.16), im Browser gezeichnet: europäisch = kleine Backsteine im Läuferverband (1 m Kachel),
// amerikanisch = Betonplatte 1,5 m mit Fugen (eine Platte über die ganze Gehwegbreite)
let WTEX = null;
function walkTex() {
  if (WTEX) return WTEX;
  const mk = (draw) => { const c = document.createElement("canvas"); c.width = c.height = 256; draw(c.getContext("2d")); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
  let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const eu = mk((g) => {
    g.fillStyle = "#6F6259"; g.fillRect(0, 0, 256, 256);
    const cols = ["#9E4E3A", "#A85A43", "#93473A", "#B0644A", "#8C4A3C", "#A2533F"], bw = 256 / 5, bh = 256 / 10;
    for (let r = 0; r < 10; r++) for (let k = -1; k < 6; k++) {
      const x = k * bw + (r & 1 ? bw / 2 : 0), y = r * bh; g.fillStyle = cols[Math.floor(rnd() * cols.length)];
      g.fillRect(x + 2, y + 2, bw - 4, bh - 4); g.fillStyle = "rgba(0,0,0,0.08)"; g.fillRect(x + 2, y + bh - 6, bw - 4, 4);
    }
  });
  const am = mk((g) => {
    g.fillStyle = "#B9B7B0"; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2600; i++) { const v = 150 + Math.floor(rnd() * 60); g.fillStyle = "rgba(" + v + "," + v + "," + (v - 4) + ",0.35)"; g.fillRect(rnd() * 256, rnd() * 256, 2, 2); }
    g.fillStyle = "#7F7D77"; g.fillRect(0, 0, 4, 256); g.fillRect(252, 0, 4, 256);   // Querfuge zwischen den Platten
    g.fillStyle = "rgba(90,88,84,0.55)"; g.fillRect(0, 0, 256, 3); g.fillRect(0, 253, 256, 3);
  });
  const mat = (t) => new THREE.MeshLambertMaterial({ map: t, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  WTEX = [mat(eu), mat(am)]; return WTEX;
}

function cr(p0, p1, p2, p3, t) { const t2 = t * t, t3 = t2 * t; return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3); }

export class Road {
  constructor() {
    this.pts = []; this.closed = true; this.fall = 10;
    this.S = []; this.grid = new Map(); this.len = 0;
    this.mat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), this.mat); this.mesh.receiveShadow = true; this.mesh.userData.road = true;
    this.bmat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, emissive: new THREE.Color(0x26282A) });   // Beton: Unterseite im Schatten nicht schwarz
    this.bmesh = new THREE.Mesh(new THREE.BufferGeometry(), this.bmat); this.bmesh.castShadow = true; this.bmesh.receiveShadow = false;
    this.wmesh = new THREE.Mesh(new THREE.BufferGeometry(), typeof document !== "undefined" ? walkTex() : []); this.wmesh.receiveShadow = true;   // Gehweg-Pflaster (texturiert)
    this.base = null;      // (x, z) => Grundhöhe des Geländes (setzt die Welt)
    this.pillars = [];     // [x, z, r] Brückenpfeiler für die Kollision
    this.anyBridge = false;
    this.world = null;     // Welt (für die anderen Straßen)
    this.main = false;     // Hauptstrecke: bekommt Start/Ziel
    this.typ = null;       // Straßentyp (seit v0.19, TYPEN), null = alte, frei eingestellte Straße
  }
  others() { return this.world ? this.world.roads.filter((r) => r !== this && r.S.length > 1) : []; }
  P(i) { const n = this.pts.length; return this.closed ? this.pts[((i % n) + n) % n] : this.pts[clamp(i, 0, n - 1)]; }
  // Querschnitte entlang der Spline berechnen
  sample() {
    const S = this.S = [], n = this.pts.length; this.len = 0;
    if (n < 2) return;
    const segs = this.closed ? n : n - 1, up = new THREE.Vector3(0, 1, 0), TY = this.typ ? TYPEN[this.typ] : null;
    for (let i = 0; i < segs; i++) {
      const a = this.P(i - 1), b = this.P(i), c = this.P(i + 1), d = this.P(i + 2);
      const L = Math.hypot(c.x - b.x, c.z - b.z, c.y - b.y), steps = Math.max(2, Math.ceil(L / STEP));
      for (let s = 0; s < steps; s++) {
        const k = s / steps;
        S.push({ p: new THREE.Vector3(cr(a.x, b.x, c.x, d.x, k), cr(a.y, b.y, c.y, d.y, k), cr(a.z, b.z, c.z, d.z, k)),
          w: TY ? TY.w : Math.max(3, cr(a.w, b.w, c.w, d.w, k)), bank: cr(a.bank, b.bank, c.bank, d.bank, k), cl: TY ? false : !!b.cl, cr: TY ? false : !!b.cr, sl: TY ? TY.gw : !!b.sl, sr: TY ? TY.gw : !!b.sr, gs: 1, seg: i, terr: b.t !== 0 && !b.b, forced: !!b.b });
      }
    }
    if (!this.closed) { const e = this.pts[n - 1]; S.push({ p: new THREE.Vector3(e.x, e.y, e.z), w: TY ? TY.w : e.w, bank: e.bank, cl: false, cr: false, sl: TY ? TY.gw : false, sr: TY ? TY.gw : false, gs: 1, seg: n - 2, terr: this.pts[n - 2].t !== 0 && !this.pts[n - 2].b, forced: !!this.pts[n - 2].b }); }
    const m = S.length;
    for (let i = 0; i < m; i++) {
      const pa = S[this.closed ? (i - 1 + m) % m : Math.max(0, i - 1)].p, pb = S[this.closed ? (i + 1) % m : Math.min(m - 1, i + 1)].p;
      const tg = new THREE.Vector3().subVectors(pb, pa).normalize(), th = new THREE.Vector3(tg.x, 0, tg.z).normalize();
      const r = new THREE.Vector3().crossVectors(th, up).normalize(), b = S[i].bank * DEG, hw = S[i].w / 2;
      S[i].t = tg; S[i].r = r; S[i].tan = Math.tan(b);
      S[i].L = S[i].p.clone().addScaledVector(r, -hw).setY(S[i].p.y + hw * Math.tan(b));
      S[i].R = S[i].p.clone().addScaledVector(r, hw).setY(S[i].p.y - hw * Math.tan(b));
      S[i].d = this.len; if (i > 0) this.len += S[i].p.distanceTo(S[i - 1].p), S[i].d = this.len;
    }
    if (this.closed && m > 1) this.len += S[m - 1].p.distanceTo(S[0].p);
    this.buildGrid();
  }
  // Höchste Stelle dieser Straße unter (x, z), die mindestens 3 m tiefer als y liegt (für Überführungen).
  // excl = Streckenposition, deren Umgebung (±40 m) ignoriert wird (eigene Straße), margin = zusätzlicher seitlicher Abstand
  lowerAt(x, z, y, margin, excl) {
    const l = this.grid.get(Math.floor(x / GRID) + "," + Math.floor(z / GRID)); if (!l) return -Infinity;
    const S = this.S, m = S.length; let best = -Infinity;
    for (let q = 0; q < l.length; q++) {
      const i = l[q], a = S[i], b = S[(i + 1) % m];
      if (excl != null) { let dd = Math.abs(a.d - excl); if (this.closed) dd = Math.min(dd, this.len - dd); if (dd < 40) continue; }
      const abx = b.p.x - a.p.x, abz = b.p.z - a.p.z, L2 = abx * abx + abz * abz || 1, u = clamp(((x - a.p.x) * abx + (z - a.p.z) * abz) / L2, 0, 1);
      const dd = Math.hypot(x - a.p.x - abx * u, z - a.p.z - abz * u), yy = lerp(a.p.y, b.p.y, u);
      if (dd < lerp(a.w, b.w, u) / 2 + margin && yy < y - 3 && yy > best) best = yy;
    }
    return best;
  }
  // Brücken: ohne Gelände-Anpassung und mehr als BR über dem Gelände (Mitte oder ein Rand). Kurze Lücken werden geschlossen,
  // einzelne Brückenstücke entfernt, damit keine Mini-Brücken entstehen.
  markBridges() {
    const S = this.S, m = S.length, B = this.base; this.anyBridge = false;
    for (let i = 0; i < m; i++) {
      const s = S[i]; s.br = false; s.gap = 0; s.gnd = s.p.y;
      if (!B) continue;
      const hc = B(s.p.x, s.p.z), hl = B(s.L.x, s.L.z), hr = B(s.R.x, s.R.z);
      s.gnd = Math.min(hc, hl, hr); s.gap = Math.max(s.p.y - hc, s.L.y - hl, s.R.y - hr);
      // über einer anderen (oder der eigenen, weiter entfernten) Straße: Überführung
      s.cross = false;
      if (this.world) for (const o of this.world.roads) { if (o.S.length < 2) continue; if (o.lowerAt(s.p.x, s.p.z, s.p.y, CW + 6.5 + s.w / 4, o === this ? s.d : null) > -Infinity) { s.cross = true; break; } }
      s.br = s.forced || s.cross || (!s.terr && s.gap > BR);
    }
    const at = (i) => this.closed ? S[(i + m) % m] : S[clamp(i, 0, m - 1)];
    const f = S.map((s) => s.br);
    for (let i = 0; i < m; i++) if (!f[i] && (!S[i].terr || S[i].cross) && at(i - 1).br && (at(i + 1).br || at(i + 2).br)) f[i] = true;   // Lücken schließen
    for (let i = 0; i < m; i++) S[i].br = f[i];
    for (let i = 0; i < m; i++) { const s = S[i]; if (s.br && !s.forced && !s.cross && !at(i - 1).br && !at(i + 1).br) s.br = false; }   // Einzelstücke weg
    for (let i = 0; i < m; i++) if (S[i].br) this.anyBridge = true;
  }
  roadBelow(x, z, top) { if (!this.world) return false; for (const o of this.world.roads) if (o.S.length > 1 && o.lowerAt(x, z, top + 3, CW + 2, o === this ? -1e9 : null) > -Infinity) return true; return false; }
  // Innenseite der Brüstung (Abstand von der Mittellinie). Mit Gehweg rückt die Brüstung an dessen Außenkante (seit v0.16)
  face(q, sd) { const w = sd < 0 ? q.sl : sd > 0 ? q.sr : false; return w ? q.w / 2 + ((sd < 0 ? q.cl : q.cr) ? CW : 0) + GW : q.w / 2 + CW + PW; }
  // Breite neben der Fahrbahn auf einer Seite (sd -1 links, +1 rechts): Kerb und Gehweg
  side(q, sd) { return ((sd < 0 ? q.cl : q.cr) ? CW : 0) + ((sd < 0 ? q.sl : q.sr) ? GW : 0); }
  segCount() { return this.closed ? this.S.length : this.S.length - 1; }
  buildGrid() {
    const g = this.grid = new Map(), S = this.S, m = S.length, ext = this.maxHalf() + CW + 2.5 + Math.max(this.fall, 7) + 2;
    for (let i = 0; i < this.segCount(); i++) {
      const a = S[i].p, b = S[(i + 1) % m].p;
      const x0 = Math.floor((Math.min(a.x, b.x) - ext) / GRID), x1 = Math.floor((Math.max(a.x, b.x) + ext) / GRID), z0 = Math.floor((Math.min(a.z, b.z) - ext) / GRID), z1 = Math.floor((Math.max(a.z, b.z) + ext) / GRID);
      for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) { const k = x + "," + z; let l = g.get(k); if (!l) g.set(k, (l = [])); l.push(i); }
    }
  }
  maxHalf() { const TY = this.typ && TYPEN[this.typ]; if (TY) return Math.max(3, TY.w / 2 + (TY.gw ? GW : 0)); let w = 3; this.pts.forEach((p) => { w = Math.max(w, p.w / 2 + (p.sl || p.sr ? GW : 0)); }); return w; }
  // Vorrang an Kreuzungen: breitere Straße (mit Gehweg) gewinnt, bei Gleichstand die ältere. Die andere lässt dort ihren Belag weg (kein Flackern)
  prio() { const TY = this.typ && TYPEN[this.typ], w = TY ? TY.w + (TY.gw ? 1 : 0) : this.maxHalf() * 2; return w * 1000 - (this.world ? this.world.roads.indexOf(this) : 0); }
  // Nächster Straßenabschnitt zu (x, z): Lage entlang (i, u), seitlicher Abstand d (+ = rechts), Höhe der Mittellinie usw.
  nearest(x, z) {
    const l = this.grid.get(Math.floor(x / GRID) + "," + Math.floor(z / GRID)); if (!l) return null;
    const S = this.S, m = S.length; let best = null, bd = 1e9;
    for (let q = 0; q < l.length; q++) {
      const i = l[q], a = S[i], b = S[(i + 1) % m], abx = b.p.x - a.p.x, abz = b.p.z - a.p.z, L2 = abx * abx + abz * abz || 1;
      const u = clamp(((x - a.p.x) * abx + (z - a.p.z) * abz) / L2, 0, 1), cx = a.p.x + abx * u, cz = a.p.z + abz * u, dd = Math.hypot(x - cx, z - cz);
      if (dd < bd) { bd = dd; best = { i: i, u: u, a: a, b: b, cx: cx, cz: cz }; }
    }
    if (!best) return null;
    const a = best.a, b = best.b, u = best.u, r = new THREE.Vector3().lerpVectors(a.r, b.r, u).normalize();
    best.d = (x - best.cx) * r.x + (z - best.cz) * r.z; best.y = lerp(a.p.y, b.p.y, u); best.w = lerp(a.w, b.w, u); best.tan = lerp(a.tan, b.tan, u); best.r = r;
    best.t = new THREE.Vector3().lerpVectors(a.t, b.t, u).normalize(); best.curb = best.d < 0 ? a.cl : a.cr; best.dist = a.d + u * a.p.distanceTo(b.p);
    best.cl = a.cl; best.cr = a.cr; best.sl = a.sl; best.sr = a.sr; best.sw = best.d < 0 ? a.sl : a.sr; best.walk = best.sw ? GW + (best.curb ? CW : 0) : 0;
    best.br = u < 0.5 ? a.br : b.br; best.terr = a.terr && !best.br;
    return best;
  }
  // Physik: Fahrbahn unter (x, z)? → { h, n, kind: "road" | "curb" }
  query(x, z) {
    const q = this.nearest(x, z); if (!q) return null;
    const hw = q.w / 2, ad = Math.abs(q.d), sd = q.d < 0 ? -1 : 1, kw = q.curb ? CW : 0;
    if (ad > (q.br ? this.face(q, sd) + 0.05 : hw + kw + (q.sw ? GW : q.curb ? 0 : 0.15))) return null;
    let h = q.y - q.d * q.tan; const kind = q.sw && ad > hw + kw ? "walk" : ad > hw && q.curb && ad <= hw + CW ? "curb" : "road";
    if (kind === "curb") h += 0.05 * (ad - hw) / CW;
    if (kind === "walk") h += KH;   // Gehweg: 15 cm über der Fahrbahn
    const lat = new THREE.Vector3(q.r.x, -q.tan, q.r.z).normalize(), n = new THREE.Vector3().crossVectors(lat, q.t).normalize();
    if (n.y < 0) n.negate();
    return { h: h, n: n, kind: kind, dist: q.dist, d: q.d, br: q.br };
  }
  // Gelände-Einbettung (seit v0.11 bündig): unter der Fahrbahn knapp darunter versteckt, neben der Straße ein 2,5 m breiter
  // Randstreifen genau auf Kantenhöhe (man kommt leicht wieder auf die Straße), danach Böschung über fall Meter zur Grundhöhe
  carve(x, z) {
    if (!this.S.length) return null;
    const q = this.nearest(x, z); if (!q) return null;
    const hw = q.w / 2, edge = hw + (q.curb ? CW : 0) + (q.sw ? GW : 0), shoulder = edge + 2.5, ad = Math.abs(q.d), up = q.sw ? KH : 0;
    if (!q.terr || q.br) {   // ohne Gelände-Anpassung: nur abtragen, was über die Fahrbahn (bzw. Brückenplatte) ragt, mit 45°-Kante
      const e2 = (q.br ? this.face(q, q.d < 0 ? -1 : 1) + PT : edge) + 0.3; if (ad > e2 + 6) return null;
      const top = q.y - Math.sign(q.d) * Math.min(ad, edge) * q.tan - (q.br ? DECK + 0.3 : 0.15);
      return { h: top + Math.max(0, ad - e2), w: 1, lo: true };
    }
    if (ad > shoulder + this.fall) return null;
    if (ad <= edge) return { h: q.y - q.d * q.tan - 0.15, w: 1 };
    const he = q.y - Math.sign(q.d) * edge * q.tan - 0.03 + up;   // mit Gehweg: Randstreifen bündig mit dem Gehweg
    return { h: he, w: ad <= shoulder ? 1 : 1 - smooth((ad - shoulder) / this.fall) };
  }
  // Netz bauen (Fahrbahn, weiße Randlinien, rot-weiße Kerbs, Seitenwände, Start/Ziel)
  build() { this.sample(); this.markBridges(); this.buildMesh(); }
  // Liegt (x, z) auf der Fahrbahn einer anderen Straße auf etwa Höhe y? (Abzweigungen: dort keine Randlinien/Kerbs)
  covered(x, z, y) { for (const o of this.others()) { const q = o.query(x, z); if (q && Math.abs(q.h - y) < 0.8) return true; } return false; }
  // liegt (x, z) auf der Fahrbahn (nicht dem Gehweg) einer anderen Straße? hi = nur Straßen mit Vorrang
  onRoad(x, z, y, hi) { const me = hi ? this.prio() : 0; for (const o of this.others()) { if (hi && o.prio() <= me) continue; const q = o.query(x, z); if (q && q.kind !== "walk" && Math.abs(q.h - y) < 0.9) return true; } return false; }
  buildMesh() {
    const S = this.S, m = S.length, P = [], Co = [], WP = [[], []], WU = [[], []];
    const g = this.mesh.geometry; this.cov = this.others().length > 0;
    if (m < 2) { g.setAttribute("position", new THREE.Float32BufferAttribute([], 3)); g.setAttribute("color", new THREE.Float32BufferAttribute([], 3)); this.anyBridge = false; this.buildWalk(WP, WU); this.buildBridges(); return; }
    const pushTri = (a, b, c, col) => { P.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z); for (let k = 0; k < 3; k++) Co.push(col.r, col.g, col.b); };
    const quad = (a, b, c, d, col) => { pushTri(a, b, d, col); pushTri(b, c, d, col); };
    const lift = (v, y) => new THREE.Vector3(v.x, v.y + y, v.z);
    const at = (s, off, y) => new THREE.Vector3(s.p.x + s.r.x * off, s.p.y - off * s.tan + (y || 0), s.p.z + s.r.z * off);   // Punkt quer zur Fahrbahn
    const col = new THREE.Color(), TY = this.typ ? TYPEN[this.typ] : null;
    // Gehweg je Abschnitt und Seite: weglassen, wo er auf der Fahrbahn einer anderen Straße läge (Kreuzung, Einmündung)
    const wcut = S.map((a, i) => { const b = S[(i + 1) % m]; return [-1, 1].map((sd) => { if (!(sd < 0 ? a.sl : a.sr) || !this.cov) return false; const e = a.w / 2 + ((sd < 0 ? a.cl : a.cr) ? CW : 0); return [e + 0.3, e + GW * 0.5, e + GW - 0.2].some((o) => { const pa = at(a, sd * o, KH), pb = at(b, sd * o, KH), p2 = pa.lerp(pb, 0.5); return this.onRoad(p2.x, p2.z, p2.y - KH); }); }); });
    for (let i = 0; i < this.segCount(); i++) {
      const a = S[i], b = S[(i + 1) % m], ha = a.w / 2, hb = b.w / 2, db0 = a.d + a.p.distanceTo(b.p);
      col.copy(TY && TY.bike ? BIKE : COL.asphalt).multiplyScalar(0.94 + hash2(i, 0, 5) * 0.1);
      // Kreuzung (seit v0.19): ganz auf der Fahrbahn einer Straße mit Vorrang → eigenen Belag weglassen
      const under = this.cov && [a.L, a.R, b.R, b.L].every((v) => this.onRoad(v.x, v.z, v.y, true));
      if (!under) quad(a.L, a.R, b.R, b.L, col);
      const cvL = this.cov && this.covered((a.L.x + b.L.x) / 2, (a.L.z + b.L.z) / 2, (a.L.y + b.L.y) / 2), cvR = this.cov && this.covered((a.R.x + b.R.x) / 2, (a.R.z + b.R.z) / 2, (a.R.y + b.R.y) / 2);
      const mid = (o) => { const p = at(a, o, 0).lerp(at(b, o, 0), 0.5); return !(this.cov && this.onRoad(p.x, p.z, p.y)); };
      if (!TY) {   // alte Straßen: weiße Randlinien (0,35 m vom Rand, 0,25 m breit)
        if (!cvL) quad(at(a, -ha + 0.35, 0.015), at(a, -ha + 0.6, 0.015), at(b, -hb + 0.6, 0.015), at(b, -hb + 0.35, 0.015), COL.line);
        if (!cvR) quad(at(a, ha - 0.6, 0.015), at(a, ha - 0.35, 0.015), at(b, hb - 0.35, 0.015), at(b, hb - 0.6, 0.015), COL.line);
      } else if (!TY.bike) {
        // Randlinien (12 cm, 20 cm vom Rand), Mittellinie gestrichelt (2-spurig), Pfeile (Einbahnstraße, alle 30 m in Fahrtrichtung)
        if (!cvL && mid(-ha + 0.26)) quad(at(a, -ha + 0.2, 0.015), at(a, -ha + 0.32, 0.015), at(b, -hb + 0.32, 0.015), at(b, -hb + 0.2, 0.015), COL.line);
        if (!cvR && mid(ha - 0.26)) quad(at(a, ha - 0.32, 0.015), at(a, ha - 0.2, 0.015), at(b, hb - 0.2, 0.015), at(b, hb - 0.32, 0.015), COL.line);
        if (TY.lanes === 2 && Math.floor(a.d / 3) % 2 === 0 && mid(0)) quad(at(a, -0.06, 0.016), at(a, 0.06, 0.016), at(b, 0.06, 0.016), at(b, -0.06, 0.016), COL.line);
        if (TY.one && Math.floor(db0 / 30) > Math.floor(a.d / 30) && mid(0)) {
          const c = a.p.clone().lerp(b.p, 0.5), tt = a.t, rr = a.r, y = c.y + 0.017, V = (f, sd) => new THREE.Vector3(c.x + tt.x * f + rr.x * sd, y, c.z + tt.z * f + rr.z * sd);
          quad(V(-1.1, -0.09), V(-1.1, 0.09), V(0.25, 0.09), V(0.25, -0.09), COL.line); pushTri(V(0.25, -0.38), V(0.25, 0.38), V(1.0, 0), COL.line); pushTri(V(0.25, 0.38), V(0.25, -0.38), V(1.0, 0), COL.line);
        }
      }
      // Kerbs: abwechselnd rot/weiß je Querschnitt (2 m)
      const kc = (Math.floor(a.d / 2.2) & 1) ? COL.white : COL.red;
      let lo = a.L, lob = b.L, ro = a.R, rob = b.R;
      if (a.cl && !cvL) { lo = at(a, -ha - CW, 0.06); lob = at(b, -hb - CW, 0.06); quad(lo, at(a, -ha, 0.01), at(b, -hb, 0.01), lob, kc); }
      if (a.cr && !cvR) { ro = at(a, ha + CW, 0.06); rob = at(b, hb + CW, 0.06); quad(at(a, ha, 0.01), ro, rob, at(b, hb, 0.01), kc); }
      // Gehweg (seit v0.16): Bordstein (Kante + Oberseite), Pflaster bis zur Außenkante, Abschluss an Anfang und Ende
      const db = db0, pv = this.closed ? S[(i - 1 + m) % m] : S[i - 1], nx = S[(i + 1) % m];
      for (const sd of [-1, 1]) {
        const on = (sd < 0 ? a.sl && !cvL : a.sr && !cvR) && !wcut[i][sd < 0 ? 0 : 1]; if (!on) continue;
        const kerb = (sd < 0 ? a.cl && !cvL : a.cr && !cvR), y0 = kerb ? 0.06 : 0.01, ea = ha + (kerb ? CW : 0), eb = hb + (kerb ? CW : 0);
        const A = (o, y) => at(a, sd * o, y), B2 = (o, y) => at(b, sd * o, y);
        quad(A(ea, y0), A(ea, KH), B2(eb, KH), B2(eb, y0), CURB);                       // Bordstein-Kante
        quad(A(ea, KH), A(ea + KB, KH), B2(eb + KB, KH), B2(eb, KH), CURB2);            // Bordstein oben
        const st = a.gs ? 1 : 0, L = st ? 1.5 : 1, wv = st ? GW - KB : 1, wp = WP[st], wu = WU[st];
        const vtx = (v, u, vv) => { wp.push(v.x, v.y, v.z); wu.push(u, vv); };
        const a0 = A(ea + KB, KH), a1 = A(ea + GW, KH), b1 = B2(eb + GW, KH), b0 = B2(eb + KB, KH), ua = a.d / L, ub = db / L, v1 = (GW - KB) / wv;
        vtx(a0, ua, 0); vtx(a1, ua, v1); vtx(b0, ub, 0); vtx(a1, ua, v1); vtx(b1, ub, v1); vtx(b0, ub, 0);
        if (sd < 0) { lo = a1; lob = b1; } else { ro = a1; rob = b1; }
        // Stirnseiten, wo der Gehweg beginnt oder endet
        const has = (s2) => { if (!s2) return false; const k = S.indexOf(s2); return (sd < 0 ? s2.sl : s2.sr) && !(k >= 0 && wcut[k] && wcut[k][sd < 0 ? 0 : 1]); };
        if (!has(pv)) quad(A(ea, y0), A(ea + GW, y0 - 0.2), A(ea + GW, KH), A(ea, KH), CURB);
        if (!has(nx) || (!this.closed && i === this.segCount() - 1)) quad(B2(eb, y0), B2(eb, KH), B2(eb + GW, KH), B2(eb + GW, y0 - 0.2), CURB);
      }
      // Seitenwände nach unten, damit die Straße nie in der Luft hängt (auf Brücken übernimmt das die Brückenplatte)
      if (!(a.br && b.br)) {
        const sk = a.terr ? 1.2 : clamp(Math.max(a.gap, b.gap) + 0.4, 1.2, BR + 0.6);
        quad(lo, lob, lift(lob, -sk), lift(lo, -sk), COL.skirt);
        quad(ro, lift(ro, -sk), lift(rob, -sk), rob, COL.skirt);
      }
    }
    // Start/Ziel: Schachbrett am ersten Querschnitt (nur Hauptstrecke)
    const s0 = S[0], s1 = S[1], cols = 10, rows = this.main ? 2 : 0;
    for (let rr = 0; rr < rows; rr++) for (let c = 0; c < cols; c++) {
      const o0 = -s0.w / 2 + (c / cols) * s0.w, o1 = -s0.w / 2 + ((c + 1) / cols) * s0.w, f0 = rr / rows, f1 = (rr + 1) / rows;
      const A = at(s0, o0, 0.02).lerp(at(s1, o0, 0.02), f0), B = at(s0, o1, 0.02).lerp(at(s1, o1, 0.02), f0), Cc = at(s0, o1, 0.02).lerp(at(s1, o1, 0.02), f1), D = at(s0, o0, 0.02).lerp(at(s1, o0, 0.02), f1);
      quad(A, B, Cc, D, (c + rr) & 1 ? COL.white : COL.dark);
    }
    g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(Co, 3));
    g.deleteAttribute("normal"); g.computeVertexNormals(); g.computeBoundingSphere();   // altes Normalen-Feld nicht wiederverwenden (andere Länge)
    this.buildWalk(WP, WU);
    this.buildBridges(at);
  }
  // Gehweg-Pflaster: ein Netz mit zwei Materialien (europäisch / amerikanisch)
  buildWalk(WP, WU) {
    const g = this.wmesh.geometry, P = WP[0].concat(WP[1]), U = WU[0].concat(WU[1]), n0 = WP[0].length / 3;
    g.clearGroups(); g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(U, 2));
    if (g.attributes.normal) g.deleteAttribute("normal");
    if (P.length) { g.addGroup(0, n0, 0); g.addGroup(n0, P.length / 3 - n0, 1); g.computeVertexNormals(); }
    g.computeBoundingSphere(); this.wmesh.visible = P.length > 0;
  }
  // Betonbrücken: Randstreifen, Brüstungen, Fahrbahnplatte, Pfeiler etwa alle 22 m, Widerlager an den Enden
  buildBridges(at) {
    const S = this.S, m = S.length, P = [], Co = [], g = this.bmesh.geometry; this.pillars = [];
    const pushTri = (a, b, c, col) => { P.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z); for (let k = 0; k < 3; k++) Co.push(col.r, col.g, col.b); };
    const quad = (a, b, c, d, col) => { pushTri(a, b, d, col); pushTri(b, c, d, col); };
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const box = (cx, cz, tx, tz, hl, hw2, y0, y1) => {   // Quader längs (tx, tz), halbe Länge hl, halbe Breite hw2
      const rx = tz, rz = -tx, c = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map((k) => [cx + tx * hl * k[0] + rx * hw2 * k[1], cz + tz * hl * k[0] + rz * hw2 * k[1]]);
      for (let k = 0; k < 4; k++) { const A = c[k], B2 = c[(k + 1) % 4]; quad(V(A[0], y1, A[1]), V(B2[0], y1, B2[1]), V(B2[0], y0, B2[1]), V(A[0], y0, A[1]), k & 1 ? CON.b : CON.a); }
    };
    if (this.anyBridge) {
      let lastP = -1e9;
      for (let i = 0; i < this.segCount(); i++) {
        const a = S[i], b = S[(i + 1) % m]; if (!a.br || !b.br) continue;
        for (const sd of [-1, 1]) {
          const wk = sd < 0 ? a.sl : a.sr, ea = a.w / 2 + ((sd < 0 ? a.cl : a.cr) ? CW : 0), eb = b.w / 2 + ((sd < 0 ? a.cl : a.cr) ? CW : 0);
          const fa = this.face(a, sd), fb = this.face(Object.assign({}, b, { cl: a.cl, cr: a.cr, sl: a.sl, sr: a.sr }), sd), oa = fa + PT, ob = fb + PT, y0 = wk ? KH : 0.02;
          const A = (o, y) => at(a, sd * o, y), B2 = (o, y) => at(b, sd * o, y);
          if (!wk) quad(A(ea, 0.02), A(fa, 0.02), B2(fb, 0.02), B2(eb, 0.02), CON.c);   // Randstreifen (mit Gehweg liegt dort das Pflaster)
          quad(A(fa, y0), A(fa, PH), B2(fb, PH), B2(fb, y0), CON.a);                     // Brüstung innen
          quad(A(fa, PH), A(oa, PH), B2(ob, PH), B2(fb, PH), CON.c);                     // Brüstung oben
          quad(A(oa, PH), A(oa, -DECK), B2(ob, -DECK), B2(ob, PH), CON.b);               // Außenwand bis Unterkante Platte
        }
        const fb2 = Object.assign({}, b, { cl: a.cl, cr: a.cr, sl: a.sl, sr: a.sr }), oaL = this.face(a, -1) + PT, oaR = this.face(a, 1) + PT, obL = this.face(fb2, -1) + PT, obR = this.face(fb2, 1) + PT;
        quad(at(a, -oaL, -DECK), at(a, oaR, -DECK), at(b, obR, -DECK), at(b, -obL, -DECK), CON.d);   // Unterseite
        // Pfeiler
        if (a.d - lastP >= 22 && a.gap > BR) {
          lastP = a.d;
          const top = a.p.y - DECK, bot = a.gnd - 1.5, two = a.w > 15, hl = 0.8, hw2 = two ? 0.7 : 1.1;
          if (top - bot > 0.6) {
            const offs = two ? [-a.w * 0.3, a.w * 0.3] : [0];
            offs.forEach((o) => { const x = a.p.x + a.r.x * o, z = a.p.z + a.r.z * o; if (this.roadBelow(x, z, top)) return; box(x, z, a.t.x, a.t.z, hl, hw2, bot, top - o * a.tan); this.pillars.push([x, z, Math.max(hl, hw2) + 0.1, top - 0.5]); });
          }
        }
      }
      // Widerlager: Querwand an Anfang und Ende jeder Brücke
      for (let i = 0; i < m; i++) {
        const s = S[i]; if (!s.br) continue;
        const pv = this.closed ? S[(i - 1 + m) % m] : S[i - 1], nx = this.closed ? S[(i + 1) % m] : S[i + 1];
        if (pv && nx && pv.br && nx.br) continue;
        const o1 = this.face(s, -1) + PT, o2 = this.face(s, 1) + PT, bot = s.gnd - 1;
        const A = at(s, -o1, -DECK), B2 = at(s, o2, -DECK);
        quad(A, B2, V(B2.x, bot, B2.z), V(A.x, bot, A.z), CON.b);
      }
    }
    g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(Co, 3));
    g.deleteAttribute("normal"); if (P.length) g.computeVertexNormals(); g.computeBoundingSphere();
    this.bmesh.visible = P.length > 0;
  }
  // Startposition: am ersten Querschnitt, in Fahrtrichtung
  start(back = 6) {
    if (this.S.length < 2) return null;
    const s = this.S[0]; return { p: s.p.clone().addScaledVector(s.t, -back), t: s.t.clone() };
  }
  // Steuerpunkt-Abschnitt, der (x, z) am nächsten liegt (zum Einfügen)
  segAt(x, z) { const q = this.nearest(x, z); return q ? { seg: q.a.seg, d: Math.abs(q.d) } : null; }
  toJSON() { return { pts: this.pts.map((p) => ({ x: +p.x.toFixed(2), z: +p.z.toFixed(2), y: +p.y.toFixed(2), w: +p.w.toFixed(2), bank: +p.bank.toFixed(1), cl: p.cl ? 1 : 0, cr: p.cr ? 1 : 0, sl: p.sl ? 1 : 0, sr: p.sr ? 1 : 0, gs: p.gs ? 1 : 0, t: p.t === 0 ? 0 : 1, a: p.a ? 1 : 0, j: p.j ? 1 : 0, b: p.b ? 1 : 0, cp: p.cp ? 1 : 0 })), closed: this.closed, fall: this.fall, typ: this.typ || undefined }; }
  fromJSON(o) { this.pts = (o && o.pts || []).map((p) => ({ x: p.x, z: p.z, y: p.y, w: p.w || 12, bank: p.bank || 0, cl: !!p.cl, cr: !!p.cr, sl: !!p.sl, sr: !!p.sr, gs: p.gs ? 1 : 0, t: p.t === 0 ? 0 : 1, a: p.a ? 1 : 0, j: p.j ? 1 : 0, b: p.b ? 1 : 0, cp: p.cp ? 1 : 0 })); this.closed = o ? o.closed !== false : true; this.fall = o && o.fall != null ? o.fall : 10; this.typ = o && TYPEN[o.typ] ? o.typ : null; }
}
