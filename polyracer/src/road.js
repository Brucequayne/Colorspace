// ===== road.js · Straße: Spline-Punkte, Netz, Abfrage für Physik, Einbettung ins Gelände =====
// Punkte: { x, z, y (Höhe), w (Breite m), bank (Neigung in Grad, + = linke Seite höher), cl, cr (Kerbs links/rechts ab diesem Punkt) }.
// Die Straße folgt nur ihren eigenen Punkten (Catmull-Rom), nicht dem Gelände. Das Gelände wird unter ihr weggedrückt
// und läuft mit einer Böschung (fall) wieder in die Grundhöhe über.
import * as THREE from "three";
import { clamp, lerp, smooth, DEG, hash2 } from "pr/core.js";

const COL = { asphalt: new THREE.Color("#3D3E41"), line: new THREE.Color("#E9E7E1"), red: new THREE.Color("#C42F26"), white: new THREE.Color("#EDEDEA"), skirt: new THREE.Color("#55524D"), dark: new THREE.Color("#1C1C1E") };
const STEP = 2;    // Abstand der Querschnitte in Metern
const CW = 1.3;    // Kerb-Breite
const GRID = 16;   // Raster für die Abfrage

function cr(p0, p1, p2, p3, t) { const t2 = t * t, t3 = t2 * t; return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3); }

export class Road {
  constructor() {
    this.pts = []; this.closed = true; this.fall = 10;
    this.S = []; this.grid = new Map(); this.len = 0;
    this.mat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), this.mat); this.mesh.receiveShadow = true; this.mesh.userData.road = true;
  }
  P(i) { const n = this.pts.length; return this.closed ? this.pts[((i % n) + n) % n] : this.pts[clamp(i, 0, n - 1)]; }
  // Querschnitte entlang der Spline berechnen
  sample() {
    const S = this.S = [], n = this.pts.length; this.len = 0;
    if (n < 2) return;
    const segs = this.closed ? n : n - 1, up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < segs; i++) {
      const a = this.P(i - 1), b = this.P(i), c = this.P(i + 1), d = this.P(i + 2);
      const L = Math.hypot(c.x - b.x, c.z - b.z, c.y - b.y), steps = Math.max(2, Math.ceil(L / STEP));
      for (let s = 0; s < steps; s++) {
        const k = s / steps;
        S.push({ p: new THREE.Vector3(cr(a.x, b.x, c.x, d.x, k), cr(a.y, b.y, c.y, d.y, k), cr(a.z, b.z, c.z, d.z, k)),
          w: Math.max(3, cr(a.w, b.w, c.w, d.w, k)), bank: cr(a.bank, b.bank, c.bank, d.bank, k), cl: !!b.cl, cr: !!b.cr, seg: i });
      }
    }
    if (!this.closed) { const e = this.pts[n - 1]; S.push({ p: new THREE.Vector3(e.x, e.y, e.z), w: e.w, bank: e.bank, cl: false, cr: false, seg: n - 2 }); }
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
  segCount() { return this.closed ? this.S.length : this.S.length - 1; }
  buildGrid() {
    const g = this.grid = new Map(), S = this.S, m = S.length, ext = this.maxHalf() + CW + 2.5 + this.fall + 2;
    for (let i = 0; i < this.segCount(); i++) {
      const a = S[i].p, b = S[(i + 1) % m].p;
      const x0 = Math.floor((Math.min(a.x, b.x) - ext) / GRID), x1 = Math.floor((Math.max(a.x, b.x) + ext) / GRID), z0 = Math.floor((Math.min(a.z, b.z) - ext) / GRID), z1 = Math.floor((Math.max(a.z, b.z) + ext) / GRID);
      for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) { const k = x + "," + z; let l = g.get(k); if (!l) g.set(k, (l = [])); l.push(i); }
    }
  }
  maxHalf() { let w = 3; this.pts.forEach((p) => { w = Math.max(w, p.w / 2); }); return w; }
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
    return best;
  }
  // Physik: Fahrbahn unter (x, z)? → { h, n, kind: "road" | "curb" }
  query(x, z) {
    const q = this.nearest(x, z); if (!q) return null;
    const hw = q.w / 2, ad = Math.abs(q.d);
    if (ad > hw + (q.curb ? CW : 0.15)) return null;
    let h = q.y - q.d * q.tan; const kind = ad > hw ? "curb" : "road";
    if (kind === "curb") h += 0.05 * (ad - hw) / CW;
    const lat = new THREE.Vector3(q.r.x, -q.tan, q.r.z).normalize(), n = new THREE.Vector3().crossVectors(lat, q.t).normalize();
    if (n.y < 0) n.negate();
    return { h: h, n: n, kind: kind, dist: q.dist, d: q.d };
  }
  // Gelände-Einbettung (seit v0.11 bündig): unter der Fahrbahn knapp darunter versteckt, neben der Straße ein 2,5 m breiter
  // Randstreifen genau auf Kantenhöhe (man kommt leicht wieder auf die Straße), danach Böschung über fall Meter zur Grundhöhe
  carve(x, z) {
    if (!this.S.length) return null;
    const q = this.nearest(x, z); if (!q) return null;
    const hw = q.w / 2, edge = hw + (q.curb ? CW : 0), shoulder = edge + 2.5, ad = Math.abs(q.d);
    if (ad > shoulder + this.fall) return null;
    if (ad <= edge) return { h: q.y - q.d * q.tan - 0.15, w: 1 };
    const he = q.y - Math.sign(q.d) * edge * q.tan - 0.03;
    return { h: he, w: ad <= shoulder ? 1 : 1 - smooth((ad - shoulder) / this.fall) };
  }
  // Netz bauen (Fahrbahn, weiße Randlinien, rot-weiße Kerbs, Seitenwände, Start/Ziel)
  build() {
    this.sample();
    const S = this.S, m = S.length, P = [], Co = [];
    const g = this.mesh.geometry;
    if (m < 2) { g.setAttribute("position", new THREE.Float32BufferAttribute([], 3)); g.setAttribute("color", new THREE.Float32BufferAttribute([], 3)); return; }
    const pushTri = (a, b, c, col) => { P.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z); for (let k = 0; k < 3; k++) Co.push(col.r, col.g, col.b); };
    const quad = (a, b, c, d, col) => { pushTri(a, b, d, col); pushTri(b, c, d, col); };
    const lift = (v, y) => new THREE.Vector3(v.x, v.y + y, v.z);
    const at = (s, off, y) => new THREE.Vector3(s.p.x + s.r.x * off, s.p.y - off * s.tan + (y || 0), s.p.z + s.r.z * off);   // Punkt quer zur Fahrbahn
    const col = new THREE.Color();
    for (let i = 0; i < this.segCount(); i++) {
      const a = S[i], b = S[(i + 1) % m], ha = a.w / 2, hb = b.w / 2;
      col.copy(COL.asphalt).multiplyScalar(0.94 + hash2(i, 0, 5) * 0.1);
      quad(a.L, a.R, b.R, b.L, col);
      // weiße Randlinien (0,35 m vom Rand, 0,25 m breit)
      quad(at(a, -ha + 0.35, 0.015), at(a, -ha + 0.6, 0.015), at(b, -hb + 0.6, 0.015), at(b, -hb + 0.35, 0.015), COL.line);
      quad(at(a, ha - 0.6, 0.015), at(a, ha - 0.35, 0.015), at(b, hb - 0.35, 0.015), at(b, hb - 0.6, 0.015), COL.line);
      // Kerbs: abwechselnd rot/weiß je Querschnitt (2 m)
      const kc = (Math.floor(a.d / 2.2) & 1) ? COL.white : COL.red;
      let lo = a.L, lob = b.L, ro = a.R, rob = b.R;
      if (a.cl) { lo = at(a, -ha - CW, 0.06); lob = at(b, -hb - CW, 0.06); quad(lo, at(a, -ha, 0.01), at(b, -hb, 0.01), lob, kc); }
      if (a.cr) { ro = at(a, ha + CW, 0.06); rob = at(b, hb + CW, 0.06); quad(at(a, ha, 0.01), ro, rob, at(b, hb, 0.01), kc); }
      // Seitenwände nach unten, damit die Straße nie in der Luft hängt
      quad(lo, lob, lift(lob, -1.2), lift(lo, -1.2), COL.skirt);
      quad(ro, lift(ro, -1.2), lift(rob, -1.2), rob, COL.skirt);
    }
    // Start/Ziel: Schachbrett am ersten Querschnitt
    const s0 = S[0], s1 = S[1], cols = 10, rows = 2;
    for (let rr = 0; rr < rows; rr++) for (let c = 0; c < cols; c++) {
      const o0 = -s0.w / 2 + (c / cols) * s0.w, o1 = -s0.w / 2 + ((c + 1) / cols) * s0.w, f0 = rr / rows, f1 = (rr + 1) / rows;
      const A = at(s0, o0, 0.02).lerp(at(s1, o0, 0.02), f0), B = at(s0, o1, 0.02).lerp(at(s1, o1, 0.02), f0), Cc = at(s0, o1, 0.02).lerp(at(s1, o1, 0.02), f1), D = at(s0, o0, 0.02).lerp(at(s1, o0, 0.02), f1);
      quad(A, B, Cc, D, (c + rr) & 1 ? COL.white : COL.dark);
    }
    g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(Co, 3));
    g.deleteAttribute("normal"); g.computeVertexNormals(); g.computeBoundingSphere();   // altes Normalen-Feld nicht wiederverwenden (andere Länge)
  }
  // Startposition: am ersten Querschnitt, in Fahrtrichtung
  start(back = 6) {
    if (this.S.length < 2) return null;
    const s = this.S[0]; return { p: s.p.clone().addScaledVector(s.t, -back), t: s.t.clone() };
  }
  // Steuerpunkt-Abschnitt, der (x, z) am nächsten liegt (zum Einfügen)
  segAt(x, z) { const q = this.nearest(x, z); return q ? { seg: q.a.seg, d: Math.abs(q.d) } : null; }
  toJSON() { return { pts: this.pts.map((p) => ({ x: +p.x.toFixed(2), z: +p.z.toFixed(2), y: +p.y.toFixed(2), w: +p.w.toFixed(2), bank: +p.bank.toFixed(1), cl: p.cl ? 1 : 0, cr: p.cr ? 1 : 0 })), closed: this.closed, fall: this.fall }; }
  fromJSON(o) { this.pts = (o && o.pts || []).map((p) => ({ x: p.x, z: p.z, y: p.y, w: p.w || 12, bank: p.bank || 0, cl: !!p.cl, cr: !!p.cr })); this.closed = o ? o.closed !== false : true; this.fall = o && o.fall != null ? o.fall : 10; }
}
