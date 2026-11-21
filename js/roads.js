// Straßennetz: Knoten + Abschnitte, Kreuzungsgeometrie, Pixel-Rendering mit Markierungen
import { unprojGround, groundBBox } from './camera.js';
import { hash, fr } from './geometry.js';

export const ROAD_DEFAULT = { w: 14, sw: 2.5, lanes: 2, oneway: false, bike: false, bus: false, zebra: true };
export const PRESETS = [
  ['Wohnstraße', { w: 12, sw: 2.5, lanes: 2, oneway: false, bike: false, bus: false, zebra: false }],
  ['Einbahnstraße', { w: 9, sw: 2, lanes: 1, oneway: true, bike: false, bus: false, zebra: false }],
  ['Hauptstraße', { w: 20, sw: 3, lanes: 2, oneway: false, bike: true, bus: false, zebra: true }],
  ['Große Achse', { w: 30, sw: 3.5, lanes: 4, oneway: false, bike: true, bus: true, zebra: true }]
];
const BIKE = 1.85, BUS = 3.25, CELL = 32;
export const ACUTE = Math.cos(25 * Math.PI / 180);
const pkey = p => [p.w, p.sw, p.lanes, p.oneway ? 1 : 0, p.bike ? 1 : 0, p.bus ? 1 : 0, p.zebra ? 1 : 0].join('|');

// Querschnitt: Elemente von rechter Kante (t = -h) bis linker Kante (t = +h) aus Sicht a->b (Rechtsverkehr)
const LAYOUTS = new Map();
export function layout(p) {
  const k = pkey(p); if (LAYOUTS.has(k)) return LAYOUTS.get(k);
  const cw = Math.max(2.5, p.w - 2 * p.sw), n = Math.max(1, p.lanes | 0);
  const bikes = p.bike ? 2 : 0, buses = p.bus ? (p.oneway ? 1 : 2) : 0;
  const carW = (cw - bikes * BIKE - buses * BUS) / n;
  const els = [], add = (k2, w, d) => els.push({ k: k2, w, d });
  if (p.bike) add('bike', BIKE, 1);
  if (p.bus) add('bus', BUS, 1);
  if (p.oneway) { for (let i = 0; i < n; i++) add('car', carW, 1); if (p.bike) add('bike', BIKE, 1); }
  else {
    const nf = Math.ceil(n / 2), nb = n - nf;
    for (let i = 0; i < nf; i++) add('car', carW, 1);
    for (let i = 0; i < nb; i++) add('car', carW, -1);
    if (p.bus) add('bus', BUS, -1);
    if (p.bike) add('bike', BIKE, -1);
  }
  let t = -cw / 2; for (const e of els) { e.t0 = t; t += e.w; e.t1 = t; }
  const lines = [];
  for (let i = 1; i < els.length; i++) {
    const A = els[i - 1], B = els[i];
    let type = 'dash';
    if (A.k !== 'car' || B.k !== 'car') type = 'broad';
    else if (A.d !== B.d) type = n >= 4 ? 'double' : n === 3 ? 'solid' : 'dash';
    lines.push({ t: A.t1, type });
  }
  const L = { cw, h: cw / 2, H: p.w / 2, els, lines, carW, ok: carW >= 2.5 && p.w - 2 * p.sw >= 2.5 };
  LAYOUTS.set(k, L); return L;
}

// --- kleine Geometrie-Helfer ---
function hull(pts) {
  const P = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of P) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
function inConvex(poly, x, y) {
  for (let i = 0, n = poly.length; i < n; i++) {
    const a = poly[i], b = poly[(i + 1) % n];
    if ((b[0] - a[0]) * (y - a[1]) - (b[1] - a[1]) * (x - a[0]) < 0) return false;
  }
  return true;
}

// Bitmaps für Fahrbahn-Schrift (Zeilen = Fahrtrichtung, oben = vorne)
const FONT = {
  B: ['##.', '#.#', '##.', '#.#', '##.'], U: ['#.#', '#.#', '#.#', '#.#', '###'], S: ['###', '#..', '###', '..#', '###']
};
function busGlyph(a, b) { // a: quer 0..2.2 m (links->rechts), b: längs 0..2 m (hinten->vorne)
  const li = Math.floor(a / 0.8), ca = a - li * 0.8; if (li > 2 || ca >= 0.6) return false;
  const col = Math.floor(ca / 0.2), row = 4 - Math.floor(b / 0.4);
  if (row < 0 || row > 4) return false;
  return FONT['BUS'[li]][row][col] === '#';
}
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy, t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l));
  return Math.hypot(px - ax - dx * t, py - ay - dy * t);
}
const BIKE_STROKES = [[0.3, 0.3, 0.62, 0.3], [0.62, 0.3, 0.5, 0.62], [0.5, 0.62, 0.92, 0.62], [0.92, 0.62, 1.1, 0.3], [0.62, 0.3, 0.92, 0.62], [0.92, 0.62, 0.98, 0.78], [0.42, 0.68, 0.58, 0.68]];
function bikeGlyph(a, b) { // a: quer 0..1.4, b: längs 0..0.95
  for (const [cx] of [[0.3], [1.1]]) { const d = Math.hypot(a - cx, b - 0.3); if (d > 0.17 && d < 0.27) return true; }
  for (const s of BIKE_STROKES) if (segDist(a, b, s[0], s[1], s[2], s[3]) < 0.055) return true;
  return false;
}

const ASPH = [70, 72, 78], WHITE = [226, 226, 218];
function asphalt(x, y) {
  const h = hash(Math.floor(x * 8), Math.floor(y * 8), 51), k = (h - 0.5) * 12 + (h > 0.97 ? 14 : 0);
  return [ASPH[0] + k, ASPH[1] + k, ASPH[2] + k];
}

export class Roads {
  constructor() {
    this.nodes = new Map(); this.segs = new Map(); this.nid = 1; this.sid = 1;
    this.U = []; this.R = []; this.onLog = null; this.onChange = null; this._dirty = null;
    this.grid = new Map(); this.rebuild();
  }
  // ---------- Bearbeiten ----------
  begin() { this._before = JSON.stringify(this.serialize()); this._dirty = null; }
  commit() {
    const after = JSON.stringify(this.serialize());
    this.rebuild();
    if (after !== this._before) { this.U.push(this._before); if (this.U.length > 150) this.U.shift(); this.R = []; this.onLog && this.onLog(); }
    this._before = null; this.onChange && this.onChange(this._dirty); this._dirty = null;
  }
  undo() { const s = this.U.pop(); if (!s) return false; this.R.push(JSON.stringify(this.serialize())); this.load(JSON.parse(s), true); this.onChange && this.onChange(null); return true; }
  redo() { const s = this.R.pop(); if (!s) return false; this.U.push(JSON.stringify(this.serialize())); this.load(JSON.parse(s), true); this.onChange && this.onChange(null); return true; }
  touch(x0, y0, x1, y1) {
    const m = 45, b = [Math.min(x0, x1) - m, Math.min(y0, y1) - m, Math.max(x0, x1) + m, Math.max(y0, y1) + m];
    const d = this._dirty; this._dirty = d ? [Math.min(d[0], b[0]), Math.min(d[1], b[1]), Math.max(d[2], b[2]), Math.max(d[3], b[3])] : b;
  }
  addNode(x, y) { const n = { id: this.nid++, x, y, segs: new Set() }; this.nodes.set(n.id, n); return n; }
  addSeg(a, b, p) {
    if (a === b) return null;
    for (const id of this.nodes.get(a).segs) { const s = this.segs.get(id); if ((s.a === a && s.b === b) || (s.a === b && s.b === a)) return s; }
    const s = { id: this.sid++, a, b, p: { ...p } }; this.segs.set(s.id, s);
    this.nodes.get(a).segs.add(s.id); this.nodes.get(b).segs.add(s.id);
    const A = this.nodes.get(a), B = this.nodes.get(b); this.touch(A.x, A.y, B.x, B.y);
    return s;
  }
  delSeg(id) {
    const s = this.segs.get(id); if (!s) return;
    const A = this.nodes.get(s.a), B = this.nodes.get(s.b); this.touch(A.x, A.y, B.x, B.y);
    this.segs.delete(id); A.segs.delete(id); B.segs.delete(id);
    if (!A.segs.size) this.nodes.delete(A.id); if (!B.segs.size) this.nodes.delete(B.id);
  }
  splitSeg(id, x, y) {
    const s = this.segs.get(id), A = this.nodes.get(s.a), B = this.nodes.get(s.b);
    const dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy), t = ((x - A.x) * dx + (y - A.y) * dy) / (L * L);
    const n = this.addNode(A.x + dx * t, A.y + dy * t), p = s.p;
    this.delSegKeep(id); this.addSeg(A.id, n.id, p); this.addSeg(n.id, B.id, p);
    return n;
  }
  delSegKeep(id) { const s = this.segs.get(id); this.segs.delete(id); this.nodes.get(s.a).segs.delete(id); this.nodes.get(s.b).segs.delete(id); }
  setProfile(ids, p) { for (const id of ids) { const s = this.segs.get(id); if (!s) continue; s.p = { ...p }; const A = this.nodes.get(s.a), B = this.nodes.get(s.b); this.touch(A.x, A.y, B.x, B.y); } }
  nodeNear(x, y, r) { let best = null, bd = r; for (const n of this.nodes.values()) { const d = Math.hypot(n.x - x, n.y - y); if (d <= bd) { bd = d; best = n; } } return best; }
  // nächster Abschnitt (Mittellinie) zu einem Punkt
  segNear(x, y, r, useWidth) {
    let best = null, bd = 1e9;
    for (const s of this.query(x - 40, y - 40, x + 40, y + 40).segs) {
      const g = s.g, d = segDist(x, y, g.ax, g.ay, g.bx, g.by), lim = useWidth ? g.lay.H : r;
      if (d <= lim && d < bd) { bd = d; best = s; }
    }
    return best;
  }
  // Punkt auflösen: vorhandener Knoten, Abschnitt teilen oder neuer Knoten
  resolve(x, y) {
    const n = this.nodeNear(x, y, 0.4); if (n) return n;
    for (const s of this.segs.values()) {
      const A = this.nodes.get(s.a), B = this.nodes.get(s.b);
      if (segDist(x, y, A.x, A.y, B.x, B.y) < 0.15 && Math.hypot(x - A.x, y - A.y) > 0.4 && Math.hypot(x - B.x, y - B.y) > 0.4) return this.splitSeg(s.id, x, y);
    }
    return this.addNode(x, y);
  }
  // Straße von P nach Q ziehen, Kreuzungen mit bestehenden Straßen automatisch anlegen
  draw(P, Q, p) {
    const na = this.resolve(P[0], P[1]), nb = this.resolve(Q[0], Q[1]);
    if (na === nb) return nb;
    const ax = na.x, ay = na.y, dx = nb.x - ax, dy = nb.y - ay, cuts = [];
    for (const s of [...this.segs.values()]) {
      if (s.a === na.id || s.b === na.id || s.a === nb.id || s.b === nb.id) continue;
      const A = this.nodes.get(s.a), B = this.nodes.get(s.b), ex = B.x - A.x, ey = B.y - A.y, den = dx * ey - dy * ex;
      if (Math.abs(den) < 1e-9) continue;
      // zu spitze Kreuzungen (< 25°) nicht verbinden: die Straßen laufen dann übereinander
      if (Math.abs(dx * ex + dy * ey) / (Math.hypot(dx, dy) * Math.hypot(ex, ey)) > ACUTE) continue;
      const t = ((A.x - ax) * ey - (A.y - ay) * ex) / den, u = ((A.x - ax) * dy - (A.y - ay) * dx) / den;
      if (t > 0.001 && t < 0.999 && u > -0.001 && u < 1.001) cuts.push([t, s.id, ax + dx * t, ay + dy * t]);
    }
    cuts.sort((a, b) => a[0] - b[0]);
    let prev = na;
    for (const [, sid, x, y] of cuts) {
      let n = this.nodeNear(x, y, 0.4);
      if (!n) n = this.segs.has(sid) ? this.splitSeg(sid, x, y) : this.resolve(x, y);
      if (n !== prev) { this.addSeg(prev.id, n.id, p); prev = n; }
    }
    this.addSeg(prev.id, nb.id, p);
    return nb;
  }
  // zusammenhängende Straße (über Knoten mit genau 2 Abschnitten)
  chainOf(id) {
    const out = new Set([id]), st = [id];
    while (st.length) {
      const s = this.segs.get(st.pop());
      for (const nid of [s.a, s.b]) { const n = this.nodes.get(nid); if (n.segs.size !== 2) continue; for (const o of n.segs) if (!out.has(o)) { out.add(o); st.push(o); } }
    }
    return [...out];
  }

  // ---------- Geometrie ----------
  rebuild() {
    this.grid = new Map();
    for (const s of this.segs.values()) {
      const A = this.nodes.get(s.a), B = this.nodes.get(s.b), L = Math.hypot(B.x - A.x, B.y - A.y) || 1e-6;
      const ux = (B.x - A.x) / L, uy = (B.y - A.y) / L;
      s.g = { ax: A.x, ay: A.y, bx: B.x, by: B.y, ux, uy, nx: -uy, ny: ux, L, lay: layout(s.p), ea: { type: 'flat', c: 0 }, eb: { type: 'flat', c: 0 }, d0: 0, ds: 1 };
    }
    for (const n of this.nodes.values()) this.junction(n);
    this.chains();
    for (const s of this.segs.values()) {
      const g = s.g, H = g.lay.H + 1;
      this.ins(Math.min(g.ax, g.bx) - H, Math.min(g.ay, g.by) - H, Math.max(g.ax, g.bx) + H, Math.max(g.ay, g.by) + H, 's', s);
    }
    for (const n of this.nodes.values()) if (n.hull) {
      const xs = n.hull.map(p => p[0]), ys = n.hull.map(p => p[1]);
      this.ins(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys), 'n', n);
    }
  }
  ins(x0, y0, x1, y1, kind, o) {
    for (let cx = Math.floor(x0 / CELL); cx <= Math.floor(x1 / CELL); cx++) for (let cy = Math.floor(y0 / CELL); cy <= Math.floor(y1 / CELL); cy++) {
      const k = cx + ',' + cy; let c = this.grid.get(k); if (!c) this.grid.set(k, c = { segs: [], nodes: [] });
      (kind === 's' ? c.segs : c.nodes).push(o);
    }
  }
  query(x0, y0, x1, y1) {
    const segs = new Set(), nodes = new Set();
    for (let cx = Math.floor(x0 / CELL); cx <= Math.floor(x1 / CELL); cx++) for (let cy = Math.floor(y0 / CELL); cy <= Math.floor(y1 / CELL); cy++) {
      const c = this.grid.get(cx + ',' + cy); if (!c) continue;
      for (const s of c.segs) segs.add(s); for (const n of c.nodes) nodes.add(n);
    }
    return { segs: [...segs], nodes: [...nodes] };
  }
  junction(n) {
    n.hull = null; n.deg = n.segs.size;
    const arms = [...n.segs].map(id => {
      const s = this.segs.get(id), g = s.g, atA = s.a === n.id, ux = atA ? g.ux : -g.ux, uy = atA ? g.uy : -g.uy;
      return { s, atA, ux, uy, ang: Math.atan2(uy, ux), h: g.lay.h, end: atA ? 'ea' : 'eb' };
    });
    if (arms.length === 1) { arms[0].s.g[arms[0].end] = { type: 'flat', c: 0 }; return; }
    if (arms.length === 2) {
      const [A, B] = arms, cosA = A.ux * B.ux + A.uy * B.uy;
      const sameDir = A.atA !== B.atA; // a->b läuft durch
      const sym = !A.s.p.oneway && A.s.p.lanes % 2 === 0;
      if (pkey(A.s.p) === pkey(B.s.p) && cosA <= 0.01 && (sameDir || sym)) {
        A.s.g[A.end] = { type: 'miter', mx: A.ux - B.ux, my: A.uy - B.uy, nx: n.x, ny: n.y, other: B.s.id };
        B.s.g[B.end] = { type: 'miter', mx: B.ux - A.ux, my: B.uy - A.uy, nx: n.x, ny: n.y, other: A.s.id };
        return;
      }
    }
    arms.sort((a, b) => a.ang - b.ang);
    const k = arms.length, cut = arms.map(a => a.h * 0.5);
    for (let i = 0; i < k; i++) {
      const A = arms[i], B = arms[(i + 1) % k];
      let al = B.ang - A.ang; while (al <= 0) al += Math.PI * 2;
      if (k === 2 && i === 1) { /* zweites Paar bei 2 Armen */ }
      if (al < Math.PI - 0.03) {
        const sa = Math.sin(Math.max(al, 0.25)), ca = Math.cos(al), lim = 2.5 * Math.max(A.h, B.h);
        cut[i] = Math.max(cut[i], Math.min(lim, (B.h + A.h * ca) / sa));
        cut[(i + 1) % k] = Math.max(cut[(i + 1) % k], Math.min(lim, (A.h + B.h * ca) / sa));
      }
    }
    const pts = [];
    arms.forEach((a, i) => {
      const c = Math.min(35, cut[i] + 0.6), nx = -a.uy, ny = a.ux;
      a.s.g[a.end] = { type: 'cut', c, stop: k >= 3 };
      for (const d of [0, c]) { pts.push([n.x + a.ux * d + nx * a.h, n.y + a.uy * d + ny * a.h]); pts.push([n.x + a.ux * d - nx * a.h, n.y + a.uy * d - ny * a.h]); }
    });
    n.hull = hull(pts);
  }
  // Strichphase über Knicke hinweg fortsetzen
  chains() {
    const seen = new Set();
    for (const s0 of this.segs.values()) {
      if (seen.has(s0.id)) continue;
      // rückwärts zum Anfang laufen
      let cur = s0, end = 'ea', guard = 0;
      while (cur.g[end].type === 'miter' && guard++ < 10000) {
        const nx = this.segs.get(cur.g[end].other); if (!nx || nx === s0) break;
        const nodeId = end === 'ea' ? cur.a : cur.b, far = nx.a === nodeId ? 'eb' : 'ea';
        cur = nx; end = far;
      }
      let d = 0; guard = 0;
      while (cur && !seen.has(cur.id) && guard++ < 10000) {
        seen.add(cur.id);
        const g = cur.g;
        if (end === 'ea') { g.d0 = d; g.ds = 1; } else { g.d0 = d + g.L; g.ds = -1; }
        d += g.L;
        const out = end === 'ea' ? 'eb' : 'ea';
        if (g[out].type !== 'miter') break;
        const nx = this.segs.get(g[out].other), nodeId = out === 'ea' ? cur.a : cur.b;
        if (!nx) break; end = nx.a === nodeId ? 'ea' : 'eb'; cur = nx;
      }
    }
  }
  // liegt Punkt innerhalb der Abschnitts-Enden?
  static inEnds(g, x, y, s) {
    const e1 = g.ea, e2 = g.eb;
    if (e1.type === 'miter') { if ((x - e1.nx) * e1.mx + (y - e1.ny) * e1.my < 0) return false; } else if (s < e1.c) return false;
    if (e2.type === 'miter') { if ((x - e2.nx) * e2.mx + (y - e2.ny) * e2.my < 0) return false; } else if (s > g.L - e2.c) return false;
    return true;
  }

  // ---------- Pixel-Rendering einer Kachel ----------
  renderTile(x0, y0, T) {
    const bb = groundBBox(x0 - 3, y0 - 3, x0 + T + 3, y0 + T + 3), Q = this.query(bb[0], bb[1], bb[2], bb[3]);
    if (!Q.segs.length) return null;
    const P = T + 4, N = P * P, cls = new Uint8Array(N), sid = new Array(N), sA = new Float32Array(N), tA = new Float32Array(N);
    for (let py = 0; py < P; py++) for (let px = 0; px < P; px++) {
      const [x, y] = unprojGround(x0 - 2 + px + 0.5, y0 - 2 + py + 0.5), i = py * P + px;
      let hit = 0;
      for (const n of Q.nodes) if (inConvex(n.hull, x, y)) { hit = 3; break; }
      if (hit) { cls[i] = 3; continue; }
      let best = null, bs = 0, bt = 0, sc = 1e9, side = null, ss = 0, st = 0, sd = 1e9;
      for (const sg of Q.segs) {
        const g = sg.g, rx = x - g.ax, ry = y - g.ay, s = rx * g.ux + ry * g.uy, t = rx * g.nx + ry * g.ny, at = Math.abs(t);
        if (at <= g.lay.h && Roads.inEnds(g, x, y, s)) { const q = at / g.lay.h; if (q < sc) { sc = q; best = sg; bs = s; bt = t; } }
        else if (!best) {
          const d = s < 0 ? Math.hypot(rx, ry) : s > g.L ? Math.hypot(x - g.bx, y - g.by) : at;
          if (d <= g.lay.H && d < sd) { sd = d; side = sg; ss = s; st = t; }
        }
      }
      if (best) { cls[i] = 2; sid[i] = best; sA[i] = bs; tA[i] = bt; }
      else if (side) { cls[i] = 1; sid[i] = side; sA[i] = ss; tA[i] = st; }
    }
    const img = new ImageData(T, T), D = img.data; let any = false;
    const road = c => c === 2 || c === 3;
    for (let py = 2; py < P - 2; py++) for (let px = 2; px < P - 2; px++) {
      const i = py * P + px, c = cls[i]; if (!c) continue;
      const [x, y] = unprojGround(x0 - 2 + px + 0.5, y0 - 2 + py + 0.5);
      let col;
      if (c === 1) {
        const near = road(cls[i - 1]) || road(cls[i + 1]) || road(cls[i - P]) || road(cls[i + P]);
        const near2 = road(cls[i - 2]) || road(cls[i + 2]) || road(cls[i - 2 * P]) || road(cls[i + 2 * P]);
        if (near) col = [206, 204, 196]; else if (near2) col = [188, 186, 178];
        else {
          // Gehwegplatten 0,6 m: Fuge, wo sich die Platte zum Nachbarpixel ändert (immer genau 1 px)
          const S = 0.6, cs = Math.floor(sA[i] / S), ct = Math.floor(tA[i] / S), me = sid[i];
          let joint = false;
          for (const j of [i - 1, i - P]) if (cls[j] === 1 && sid[j] === me && (Math.floor(sA[j] / S) !== cs || Math.floor(tA[j] / S) !== ct)) joint = true;
          const k = (hash(cs, ct, me.id) - 0.5) * 10;
          col = joint ? [140, 136, 130] : [174 + k, 170 + k, 162 + k];
        }
      } else {
        col = c === 2 ? this.lane(sid[i], sA[i], tA[i], x, y) : asphalt(x, y);
        if (cls[i - P] === 1 || cls[i - 1] === 1 || cls[i + 1] === 1) col = [col[0] * 0.72, col[1] * 0.72, col[2] * 0.74];
      }
      const o = ((py - 2) * T + (px - 2)) * 4;
      D[o] = Math.round(col[0] / 6) * 6; D[o + 1] = Math.round(col[1] / 6) * 6; D[o + 2] = Math.round(col[2] / 6) * 6; D[o + 3] = 255; any = true;
    }
    return any ? img : null;
  }
  // Farbe auf der Fahrbahn (Spuren, Linien, Symbole, Haltlinien, Zebrastreifen)
  lane(sg, s, tw, x, y) {
    // y zeigt nach Süden: der Normalenvektor zeigt zur rechten Fahrerseite -> spiegeln, damit +t = links (Rechtsverkehr)
    const t = -tw;
    const g = sg.g, lay = g.lay, ds = g.d0 + g.ds * s;
    let mouth = 1e9, inDir = 0;
    if (g.ea.type === 'cut' && g.ea.stop) { mouth = s - g.ea.c; inDir = -1; }
    if (g.eb.type === 'cut' && g.eb.stop && g.L - g.eb.c - s < mouth) { mouth = g.L - g.eb.c - s; inDir = 1; }
    const zebra = sg.p.zebra, stop0 = zebra ? 5.2 : 0.4;
    if (mouth < stop0 + 0.55) {
      if (zebra && mouth >= 0.6 && mouth < 4.6) return fr((t + lay.h) / 1.0) < 0.5 ? WHITE : asphalt(x, y);
      if (mouth >= stop0) for (const e of lay.els) if (e.d === inDir && t >= e.t0 && t <= e.t1) return WHITE;
      if (mouth < stop0) return asphalt(x, y);
    }
    for (const L of lay.lines) {
      const dt = Math.abs(t - L.t);
      if (L.type === 'double') { if (Math.abs(dt - 0.16) < 0.09) return WHITE; continue; }
      const w = L.type === 'broad' ? 0.16 : 0.09;
      if (dt < w) { if (L.type === 'dash' && fr(ds / 9) > 0.34) break; return WHITE; }
    }
    for (const e of lay.els) {
      if (t < e.t0 || t > e.t1) continue;
      if (e.k === 'bike') {
        const ph = fr((e.d > 0 ? ds : -ds) / 25) * 25, a = e.d > 0 ? e.t1 - t - 0.22 : t - e.t0 - 0.22;
        if (ph < 0.95 && a >= 0 && a < 1.4 && bikeGlyph(a, ph)) return WHITE;
        const h = hash(Math.floor(x * 8), Math.floor(y * 8), 52); return [128 + (h - 0.5) * 12, 66 + (h - 0.5) * 8, 60 + (h - 0.5) * 8];
      }
      if (e.k === 'bus') {
        const ph = fr((e.d > 0 ? ds : -ds) / 40) * 40, a = e.d > 0 ? e.t1 - t - (e.w - 2.2) / 2 : t - e.t0 - (e.w - 2.2) / 2;
        if (ph < 2 && a >= 0 && a < 2.2 && busGlyph(a, ph)) return WHITE;
      }
      break;
    }
    return asphalt(x, y);
  }

  // ---------- Übersicht (vektoriell) ----------
  drawVector(ctx, M, bb, mpp) {
    const Q = this.query(bb[0], bb[1], bb[2], bb[3]);
    ctx.save(); ctx.setTransform(M[0], M[1], M[2], M[3], M[4], M[5]); ctx.lineCap = 'butt';
    for (const [w, col] of [['H', '#aaa69c'], ['h', '#4a4c52']]) {
      for (const s of Q.segs) { const g = s.g; ctx.strokeStyle = col; ctx.lineWidth = Math.max(g.lay[w] * 2, (w === 'H' ? 2.5 : 1.5) * mpp); ctx.beginPath(); ctx.moveTo(g.ax, g.ay); ctx.lineTo(g.bx, g.by); ctx.stroke(); }
    }
    ctx.fillStyle = '#4a4c52';
    for (const n of Q.nodes) { ctx.beginPath(); n.hull.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.fill(); }
    ctx.restore();
  }

  // ---------- Speichern ----------
  serialize() {
    const prof = [], pi = new Map();
    const segs = [...this.segs.values()].map(s => { const k = pkey(s.p); if (!pi.has(k)) { pi.set(k, prof.length); prof.push(s.p); } return [s.id, s.a, s.b, pi.get(k)]; });
    return { nodes: [...this.nodes.values()].map(n => [n.id, Math.round(n.x * 100) / 100, Math.round(n.y * 100) / 100]), segs, profiles: prof };
  }
  load(d, quiet) {
    this.nodes.clear(); this.segs.clear(); this.nid = 1; this.sid = 1;
    if (!quiet) { this.U = []; this.R = []; }
    if (d) {
      for (const [id, x, y] of d.nodes || []) { this.nodes.set(id, { id, x, y, segs: new Set() }); this.nid = Math.max(this.nid, id + 1); }
      for (const [id, a, b, p] of d.segs || []) {
        if (!this.nodes.has(a) || !this.nodes.has(b)) continue;
        this.segs.set(id, { id, a, b, p: { ...ROAD_DEFAULT, ...(d.profiles || [])[p] } }); this.sid = Math.max(this.sid, id + 1);
        this.nodes.get(a).segs.add(id); this.nodes.get(b).segs.add(id);
      }
    }
    this.rebuild();
  }
}
