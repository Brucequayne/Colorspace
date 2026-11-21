// Vegetation wie in Rap Streets / Shizuku: kleine Pixel-Pflanzen, mit dem Pinsel dicht gestreut.
// Maßstab angepasst: 1,80-m-Figur ≈ 16 px hoch, also Gras ≈ 3–5 px, hohes Gras ≈ 9–11 px.
// Jede Pflanze ist ein Sprite mit Tiefe pro Pixelzeile, damit hohes Gras korrekt vor/hinter Häusern und Figuren liegt.
import { CS, SN, PPM, groundDepth } from './camera.js';
import { rng } from './geometry.js';

function painter(c) {
  return {
    px(x, y, col) { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), 1, 1); },
    rect(x, y, w, h, col) { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, h); }
  };
}
// Halme: n Stück zwischen x0..x1, Fuß bei base, Höhe hmin..hmax, 3 Farben von unten nach oben
function blades(p, r, n, x0, x1, base, hmin, hmax, cols, spread) {
  for (let i = 0; i < n; i++) {
    const x = x0 + r() * (x1 - x0), h = hmin + r() * (hmax - hmin), lean = (r() - 0.5) * (spread || 2);
    for (let k = 0; k < h; k++) { const t = k / h; p.px(x + lean * t * t, base - k, cols[t < 0.35 ? 0 : t < 0.75 ? 1 : 2]); }
  }
}
const pick = (r, a) => a[(r() * a.length) | 0];

// Farben: Park (satt, wie Shizuku) und Stadt (staubig, wie Rap Streets) gemischt
const GRASS = [["#3E6430", "#5A8A3E", "#7FAE52"], ["#4E6A2E", "#73923E", "#A0B65A"], ["#3A5C34", "#557E44", "#7AA05C"], ["#5A6034", "#7E864A", "#A8A466"]];
const TALL = [["#2E5228", "#4A7E3A", "#7AAE52"], ["#3A5A2A", "#628A3A", "#9AB85A"], ["#2A4C2E", "#467A42", "#74A45C"], ["#4A5A2A", "#7A8A3A", "#B0B060"]];

export const VEG = {
  short: { name: 'Rasen kurz', w: 7, h: 4, ax: 3, ay: 3, variants: 4, gap: 0.3,
    draw: (p, r, v) => blades(p, r, 6, 0, 6, 3, 1, 3, GRASS[v], 1) },
  grass: { name: 'Gras', w: 7, h: 6, ax: 3, ay: 5, variants: 4, gap: 0.32,
    draw: (p, r, v) => blades(p, r, 4 + ((r() * 3) | 0), 1, 6, 5, 2, 5, GRASS[v], 2) },
  tallgrass: { name: 'Hohes Gras', w: 11, h: 12, ax: 5, ay: 11, variants: 4, gap: 0.42, tall: true,
    draw: (p, r, v) => {
      blades(p, r, 9 + ((r() * 5) | 0), 1, 10, 11, 5, 11, TALL[v], 4);
      for (let s = 0; s < 2; s++) { const x = 2 + r() * 7, y = 1 + r() * 3; p.px(x, y, '#C8C080'); p.px(x, y + 1, '#A8A060'); }
    } },
  wildflower: { name: 'Wildblumen', w: 8, h: 9, ax: 4, ay: 8, variants: 4, gap: 0.42, tall: true,
    draw: (p, r, v) => {
      blades(p, r, 4, 1, 7, 8, 3, 6, ['#2E5228', '#4A7E3A', '#6A9E4A'], 2);
      const fc = [['#8A5ABE', '#B48AE0'], ['#E8C030', '#F6E070'], ['#F0ECE4', '#FFFFFF'], ['#D8506A', '#F088A0']][v];
      for (let i = 0; i < 2; i++) {
        const x = 2 + r() * 4, h = 4 + r() * 4;
        for (let k = 0; k < h; k++) p.px(x, 8 - k, '#4A7A36');
        const y = 8 - h; p.px(x, y, fc[0]); p.px(x - 1, y, fc[0]); p.px(x + 1, y, fc[0]); p.px(x, y - 1, fc[1]);
      }
    } },
  dandelion: { name: 'Löwenzahn', w: 6, h: 5, ax: 3, ay: 4, variants: 3, gap: 0.45,
    draw: (p, r, v) => {
      for (let i = 0; i < 3; i++) { const a = r() * 6.28, l = 1 + r() * 2; for (let k = 0; k < l; k++) p.px(3 + Math.cos(a) * k, 4 + Math.sin(a) * k * 0.4, k < 1 ? '#3E5A2C' : '#5A7E3A'); }
      const x = 2 + r() * 2, h = 2 + r() * 2; for (let y = 0; y < h; y++) p.px(x, 4 - y, '#5A7A36');
      const cy = 4 - h; if (v === 2) { p.px(x, cy, '#ECEAE2'); p.px(x - 1, cy, '#D8D6CC'); p.px(x + 1, cy, '#D8D6CC'); }
      else { p.px(x, cy, '#F2C230'); p.px(x - 1, cy, '#E0A820'); p.px(x + 1, cy, '#E0A820'); }
    } },
  clover: { name: 'Klee', w: 7, h: 3, ax: 3, ay: 2, variants: 3, gap: 0.4, flat: true,
    draw: (p, r) => { for (let i = 0; i < 5; i++) { const x = r() * 6, y = 1 + r() * 2; p.px(x, y, '#4E7A3A'); p.px(x + 1, y, '#5E8C44'); p.px(x, y - 1, '#6A9A4C'); if (r() < 0.2) p.px(x, y - 1, '#E8E4E0'); } } },
  weeds: { name: 'Unkraut', w: 9, h: 9, ax: 4, ay: 8, variants: 4, gap: 0.5, tall: true,
    draw: (p, r, v) => {
      const cols = [['#4E5A2E', '#6E7E3A', '#8EA04A'], ['#5A5A30', '#7E7A3E', '#A49C56'], ['#3E5430', '#5A7442', '#7C9A54'], ['#5E5234', '#80703E', '#A89058']][v];
      for (let s = 0; s < 2 + ((r() * 2) | 0); s++) {
        const x = 2 + r() * 5, h = 4 + r() * 5, lean = (r() - 0.5) * 3;
        for (let k = 0; k < h; k++) { const t = k / h, xx = x + lean * t; p.px(xx, 8 - k, cols[0]); if (k > 1 && k % 2 === 0) { const sd = r() < 0.5 ? -1 : 1; p.px(xx + sd, 8 - k, cols[t > 0.6 ? 2 : 1]); } }
        if (v === 3 || r() < 0.3) p.px(x + lean, 7 - h, '#C8B070');
      }
    } },
  shrub: { name: 'Gestrüpp', w: 13, h: 11, ax: 6, ay: 10, variants: 3, gap: 0.9, tall: true,
    draw: (p, r, v) => {
      const cols = [['#24402A', '#36583A', '#4E7448', '#6E9256'], ['#2E4228', '#465E34', '#627A40', '#8A9A54'], ['#3A3A26', '#52502E', '#6E6A3A', '#8E8650']][v];
      for (let b = 0; b < 4; b++) {
        let x = 6, y = 10; const a = -Math.PI / 2 + (r() - 0.5) * 2.2, l = 3 + r() * 5;
        for (let k = 0; k < l; k++) { x += Math.cos(a); y += Math.sin(a) * 0.9; p.px(x, y, '#3A2E22'); }
        for (let q = 0; q < 11; q++) { const lx = x + (r() - 0.5) * 5, ly = y + (r() - 0.5) * 4, lv = (ly - y) / 3 - (lx - x) / 6 + (r() - 0.5); p.px(lx, ly, cols[lv > 0.6 ? 0 : lv > 0 ? 1 : lv > -0.6 ? 2 : 3]); }
      }
    } },
  fern: { name: 'Farn', w: 11, h: 6, ax: 5, ay: 5, variants: 3, gap: 0.6,
    draw: (p, r) => {
      for (let f = 0; f < 5; f++) {
        const a = Math.PI + (f / 4) * Math.PI + (r() - 0.5) * 0.3, len = 3 + r() * 3;
        for (let k = 0; k < len; k++) { const x = 5 + Math.cos(a) * k, y = 5 + Math.sin(a) * k * 0.8 + k * k * 0.05; p.px(x, y, k < 2 ? '#2E5228' : '#4C7A38'); if (k % 2 === 1) p.px(x + Math.cos(a + 1.4), y + Math.sin(a + 1.4), '#6A9A48'); }
      }
    } },
  reed: { name: 'Schilf', w: 7, h: 12, ax: 3, ay: 11, variants: 3, gap: 0.4, tall: true,
    draw: (p, r) => {
      for (let s = 0; s < 4; s++) {
        const x = 1 + r() * 5, h = 6 + r() * 5, lean = (r() - 0.5) * 2;
        for (let k = 0; k < h; k++) p.px(x + lean * k / h, 11 - k, k < h * 0.5 ? '#5A6E34' : '#8A9450');
        if (r() < 0.5) { const tx = x + lean, ty = 11 - h; p.px(tx, ty, '#6A4428'); p.px(tx, ty + 1, '#7E5430'); }
      }
    } },
  wheat: { name: 'Korn', w: 8, h: 12, ax: 4, ay: 11, variants: 3, gap: 0.35, tall: true,
    draw: (p, r) => {
      const cols = ['#8A6A28', '#C09A3A', '#E2C25A', '#F6E08E'];
      for (let i = 0; i < 5; i++) {
        const x = 1 + r() * 6, h = 7 + r() * 4, lean = (r() - 0.5) * 2;
        for (let k = 0; k < h; k++) { const t = k / h; p.px(x + lean * t * t, 11 - k, cols[t < 0.4 ? 0 : 1]); }
        const tx = x + lean, ty = 11 - h; for (let e = 0; e < 3; e++) p.px(tx + (e % 2 ? 1 : 0), ty + e, cols[e < 1 ? 3 : 2]);
      }
    } },
  leaves: { name: 'Laub', w: 7, h: 4, ax: 3, ay: 2, variants: 4, gap: 0.45, flat: true,
    draw: (p, r, v) => {
      const c = [['#8A5A2A', '#B07A34', '#6E4824'], ['#A84A22', '#D06A2C', '#7E3A1E'], ['#B08E3A', '#D4B04A', '#806A2E'], ['#6E5A3A', '#8E7448', '#54462E']][v];
      for (let i = 0; i < 3; i++) { const x = r() * 5, y = r() * 3, col = pick(r, c); p.px(x, y, col); p.px(x + 1, y, col); }
    } },
  ivy: { name: 'Efeu', w: 9, h: 4, ax: 4, ay: 2, variants: 3, gap: 0.45, flat: true,
    draw: (p, r) => { for (let i = 0; i < 12; i++) { const x = r() * 8, y = r() * 3, c = r(); p.px(x, y, c < 0.3 ? '#1E3A24' : c < 0.75 ? '#2E5232' : '#4A7244'); } } },
  litter: { name: 'Müll', w: 8, h: 4, ax: 4, ay: 2, variants: 5, gap: 0.7, flat: true,
    draw: (p, r, v) => {
      const n = 1 + ((r() * 3) | 0);
      for (let i = 0; i < n; i++) {
        const x = r() * 6, y = r() * 3, k = (v + i) % 5;
        if (k === 0) { p.rect(x, y, 2, 1, '#D8D4C8'); } else if (k === 1) { p.px(x, y, '#C83A2E'); p.px(x + 1, y, '#B8BCC0'); }
        else if (k === 2) { p.px(x, y, '#ECE8DC'); p.px(x + 1, y, '#3A6AB0'); } else if (k === 3) { p.px(x, y, '#E8E2D0'); p.px(x + 1, y, '#C89A60'); }
        else { p.px(x, y, '#6A9A6A'); p.px(x + 1, y, '#8ABA8A'); }
      }
    } }
};
Object.keys(VEG).forEach(k => { VEG[k].id = k; });

// Pinsel-Mischungen [Art, Anteil]; tree = streut 3D-Bäume/Büsche aus der Asset-Bibliothek
export const BRUSHES = [
  { id: 'meadow', name: 'Wiese', mix: [['grass', 6], ['clover', 1], ['wildflower', 1], ['dandelion', 1]] },
  { id: 'lawn', name: 'Rasen', mix: [['short', 6], ['clover', 2], ['dandelion', 1]] },
  { id: 'tallmeadow', name: 'Hohe Wiese', mix: [['tallgrass', 4], ['wildflower', 2], ['grass', 1]] },
  { id: 'grass', name: 'Gras', mix: [['grass', 1]] },
  { id: 'tallgrass', name: 'Hohes Gras', mix: [['tallgrass', 1]] },
  { id: 'wildflower', name: 'Wildblumen', mix: [['wildflower', 1]] },
  { id: 'dandelion', name: 'Löwenzahn', mix: [['dandelion', 1]] },
  { id: 'clover', name: 'Klee', mix: [['clover', 1]] },
  { id: 'lot', name: 'Brache', mix: [['weeds', 4], ['tallgrass', 3], ['grass', 4], ['dandelion', 1], ['litter', 1]] },
  { id: 'cracks', name: 'Fugen-Unkraut', mix: [['grass', 3], ['weeds', 1], ['dandelion', 1]], dens: 0.35, sidewalk: true },
  { id: 'shrub', name: 'Gestrüpp', mix: [['shrub', 1]], dens: 0.4 },
  { id: 'fern', name: 'Farn', mix: [['fern', 1]] },
  { id: 'reed', name: 'Schilf (Mainufer)', mix: [['reed', 1]] },
  { id: 'wheat', name: 'Kornfeld', mix: [['wheat', 1]], dens: 2 },
  { id: 'leaves', name: 'Laub', mix: [['leaves', 1]], sidewalk: true },
  { id: 'ivy', name: 'Efeu am Boden', mix: [['ivy', 1]] },
  { id: 'litter', name: 'Müll', mix: [['litter', 1]], dens: 0.6, sidewalk: true, road: true },
  { id: 'trees', name: 'Laubbäume (3D)', tree: true, mix: [['linde', 3], ['platane', 1], ['obstbaum', 1]], dens: 0.15 },
  { id: 'bushes', name: 'Büsche (3D)', tree: true, mix: [['busch', 1]], dens: 0.4 }
];

// ---------- Sprites (mit Tiefe pro Pixel) ----------
const CACHE = new Map();
export function vegSprite(t, v) {
  const k = t + ':' + v; let s = CACHE.get(k); if (s) return s;
  const d = VEG[t], cv = document.createElement('canvas'); cv.width = d.w; cv.height = d.h;
  const c = cv.getContext('2d'); d.draw(painter(c), rng(v * 977 + t.length * 131 + t.charCodeAt(0) * 7 + 7), v);
  const rgba = c.getImageData(0, 0, d.w, d.h).data, depth = new Float32Array(d.w * d.h);
  for (let y = 0; y < d.h; y++) for (let x = 0; x < d.w; x++) {
    const z = d.flat ? 0.01 : Math.max(0.01, (d.ay - y) / (CS * PPM)); // Höhe über dem Boden in Metern
    depth[y * d.w + x] = z * SN + 0.005;
  }
  s = { w: d.w, h: d.h, ox: d.ax, oy: d.ay, rgba, depth, sh: new Uint8Array(d.w * d.h), canvas: cv, veg: 1 };
  CACHE.set(k, s); return s;
}
export function brushThumb(b, ASSETS, sprites) {
  const cv = document.createElement('canvas'); cv.width = 40; cv.height = 22; const c = cv.getContext('2d'), r = rng(b.id.length * 31 + b.id.charCodeAt(0));
  const tot = b.mix.reduce((s, q) => s + q[1], 0), L = [];
  for (let i = 0; i < (b.tree ? 3 : 14); i++) {
    let pk = r() * tot, t = b.mix[0][0]; for (const q of b.mix) { pk -= q[1]; if (pk <= 0) { t = q[0]; break; } }
    L.push([t, 5 + r() * 30, 8 + r() * 13]);
  }
  L.sort((a, q) => a[2] - q[2]);
  for (const [t, x, y] of L) {
    if (b.tree) { const s = sprites.get(t, 0, 0), k = 0.25; c.drawImage(s.canvas, Math.round(x - s.ox * k), Math.round(y - s.oy * k), s.w * k, s.h * k); }
    else { const s = vegSprite(t, (r() * VEG[t].variants) | 0); c.drawImage(s.canvas, Math.round(x - s.ox), Math.round(y - s.oy)); }
  }
  return cv;
}

// ---------- Speicher mit räumlicher Suche ----------
const CELL = 8, ck = (x, y) => Math.floor(x / CELL) + ',' + Math.floor(y / CELL);
export class VegLayer {
  constructor() { this.cells = new Map(); this.n = 0; this.U = []; this.R = []; this.tx = null; this.onLog = null; this.onChange = null; }
  get size() { return this.n; }
  _ins(q) { const k = ck(q[1], q[2]); let c = this.cells.get(k); if (!c) this.cells.set(k, c = []); c.push(q); this.n++; }
  _rem(q) { const k = ck(q[1], q[2]), c = this.cells.get(k); if (!c) return; const i = c.indexOf(q); if (i >= 0) { c.splice(i, 1); this.n--; if (!c.length) this.cells.delete(k); } }
  query(x0, y0, x1, y1) {
    const out = [];
    for (let cx = Math.floor(x0 / CELL); cx <= Math.floor(x1 / CELL); cx++) for (let cy = Math.floor(y0 / CELL); cy <= Math.floor(y1 / CELL); cy++) {
      const c = this.cells.get(cx + ',' + cy); if (c) for (const q of c) if (q[1] >= x0 && q[1] <= x1 && q[2] >= y0 && q[2] <= y1) out.push(q);
    }
    return out;
  }
  // gleiche Art zu nah?
  crowded(t, x, y) { const g = VEG[t].gap; for (const q of this.query(x - g, y - g, x + g, y + g)) if (q[0] === t && Math.abs(q[1] - x) < g && Math.abs(q[2] - y) < g) return true; return false; }
  begin() { this.tx = { add: [], del: [] }; }
  add(t, x, y, v) { const q = [t, Math.round(x * 100) / 100, Math.round(y * 100) / 100, v]; this._ins(q); if (this.tx) this.tx.add.push(q); this.change(q); return q; }
  eraseCircle(x, y, r, types) {
    let n = 0;
    for (const q of this.query(x - r, y - r, x + r, y + r)) {
      if (types && !types.includes(q[0])) continue;
      if (Math.hypot(q[1] - x, q[2] - y) > r) continue;
      this._rem(q); if (this.tx) this.tx.del.push(q); this.change(q); n++;
    }
    return n;
  }
  commit() { const t = this.tx; this.tx = null; if (t && (t.add.length || t.del.length)) { this.U.push(t); if (this.U.length > 100) this.U.shift(); this.R = []; this.onLog && this.onLog(); } this.flush(); }
  undo() { const t = this.U.pop(); if (!t) return false; for (const q of t.add) { this._rem(q); this.change(q); } for (const q of t.del) { this._ins(q); this.change(q); } this.R.push(t); this.flush(); return true; }
  redo() { const t = this.R.pop(); if (!t) return false; for (const q of t.del) { this._rem(q); this.change(q); } for (const q of t.add) { this._ins(q); this.change(q); } this.U.push(t); this.flush(); return true; }
  // geänderten Bereich sammeln und gebündelt melden
  change(q) { const d = this._d, x = q[1], y = q[2]; this._d = d ? [Math.min(d[0], x), Math.min(d[1], y), Math.max(d[2], x), Math.max(d[3], y)] : [x, y, x, y]; }
  flush() { if (this._d && this.onChange) this.onChange(this._d); this._d = null; }
  serialize() {
    const types = Object.keys(VEG), ti = new Map(types.map((t, i) => [t, i])), items = [];
    for (const c of this.cells.values()) for (const q of c) items.push(ti.get(q[0]), q[1], q[2], q[3]);
    return { types, items };
  }
  load(d) {
    this.cells.clear(); this.n = 0; this.U = []; this.R = [];
    if (!d || !d.items) return;
    for (let i = 0; i + 3 < d.items.length; i += 4) { const t = d.types[d.items[i]]; if (VEG[t]) this._ins([t, d.items[i + 1], d.items[i + 2], d.items[i + 3] % VEG[t].variants]); }
  }
}
export const vegDepth = (q) => groundDepth(q[1], q[2]);
