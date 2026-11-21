// Bodenpinsel: Bodentexturen auf ein feines Raster (0,25 m) malen. Die Stadtkarte bleibt darunter nur als Vorlage.
// Gespeichert in 32-m-Stücken (128 × 128 Zellen, 1 Byte = Bodenart, 0 = nichts gemalt).
import { unprojGround, groundBBox } from './camera.js';
import { hash, fr, jit } from './geometry.js';

const CELL = 0.25, CH = 32, N = CH / CELL; // 128 Zellen je Stück
const h2 = (x, y, k) => hash(Math.floor(x), Math.floor(y), k);
const n8 = (x, y, k) => h2(x * 8, y * 8, k);

// Bodenarten: Farbe pro Weltpunkt (x, y in Metern)
export const GROUNDS = [
  null,
  { id: 'asphalt', name: 'Asphalt', sw: '#4a4c52', f: (x, y) => { const h = n8(x, y, 71); return h > 0.97 ? [90, 92, 98] : jit([68, 70, 76], h, 12); } },
  { id: 'rasen', name: 'Rasen', sw: '#5f8f3e', f: (x, y) => { const h = n8(x, y, 72), b = h2(x / 1.4, y / 1.4, 73); const c = h < 0.3 ? [76, 124, 50] : h > 0.88 ? [112, 160, 70] : [92, 140, 58]; const t = (b - 0.5) * 12; return [c[0] + t, c[1] + t, c[2] + t * 0.5]; } },
  { id: 'wiese', name: 'Wiese (satt)', sw: '#4b7a34', f: (x, y) => { const h = n8(x, y, 74), b = h2(x / 2, y / 2, 75); let c = h < 0.35 ? [56, 98, 40] : h > 0.9 ? [96, 140, 58] : [70, 114, 48]; if (h > 0.993) c = [226, 214, 120]; const t = (b - 0.5) * 16; return [c[0] + t, c[1] + t, c[2]]; } },
  { id: 'trocken', name: 'Gras (trocken)', sw: '#8e9450', f: (x, y) => { const h = n8(x, y, 76), b = h2(x / 1.8, y / 1.8, 77); const c = h < 0.3 ? [118, 120, 66] : h > 0.85 ? [160, 156, 92] : [138, 140, 78]; const t = (b - 0.5) * 18; return [c[0] + t, c[1] + t, c[2] + t * 0.6]; } },
  { id: 'dirt', name: 'Trampelpfad', sw: '#9a7e5a', f: (x, y) => { const h = n8(x, y, 78); return h > 0.95 ? [176, 160, 132] : h < 0.08 ? [112, 92, 66] : jit([150, 124, 90], h, 16); } },
  { id: 'erde', name: 'Erde', sw: '#5e4430', f: (x, y) => { const h = n8(x, y, 79); return h > 0.93 ? [120, 96, 70] : jit([92, 66, 46], h, 18); } },
  { id: 'kies', name: 'Kies', sw: '#b0aa9c', f: (x, y) => { const h = n8(x, y, 80); return h < 0.2 ? [140, 134, 124] : h > 0.8 ? [206, 200, 186] : jit([176, 170, 158], h, 20); } },
  { id: 'pflaster', name: 'Pflasterstein', sw: '#7c766e', f: (x, y) => {
    const r = Math.floor(y / 0.34), xx = x / 0.36 + (r % 2) * 0.5;
    if (fr(xx) < 0.12 || fr(y / 0.34) < 0.14) return [72, 68, 64];
    const h = h2(xx, r, 81); return fr(y / 0.34) > 0.8 ? jit([108, 102, 96], h, 20) : jit([140, 134, 124], h, 30);
  } },
  { id: 'gehweg', name: 'Gehweg', sw: '#aaa69c', f: (x, y) => {
    if (fr(x / 0.5) < 0.1 || fr(y / 0.5) < 0.1) return [126, 122, 116];
    return jit([172, 168, 160], h2(x / 0.5, y / 0.5, 82) * 0.6 + n8(x, y, 83) * 0.4, 18);
  } },
  { id: 'plaza', name: 'Plaza', sw: '#d2c8b6', f: (x, y) => {
    const a = fr(x / 1.2), b = fr(y / 0.8);
    if (a < 0.05 || b < 0.07) return [168, 160, 146];
    return jit([214, 206, 190], h2(x / 1.2, y / 0.8, 84) * 0.7 + n8(x, y, 85) * 0.3, 14);
  } }
];

export class Paint {
  constructor() { this.ch = new Map(); this.U = []; this.R = []; this.tx = null; this.onLog = null; this.onChange = null; }
  get size() { return this.ch.size; }
  key(cx, cy) { return cx + ',' + cy; }
  // Bodenart an einem Weltpunkt
  at(x, y) {
    const cx = Math.floor(x / CH), cy = Math.floor(y / CH), c = this.ch.get(cx + ',' + cy);
    if (!c) return 0;
    return c[Math.floor((y - cy * CH) / CELL) * N + Math.floor((x - cx * CH) / CELL)];
  }
  begin() { this.tx = new Map(); this._d = null; }
  // Kreis malen (code 0 = radieren)
  circle(x, y, r, code) {
    const x0 = Math.floor((x - r) / CELL), x1 = Math.floor((x + r) / CELL), y0 = Math.floor((y - r) / CELL), y1 = Math.floor((y + r) / CELL);
    for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++) {
      const px = (gx + 0.5) * CELL, py = (gy + 0.5) * CELL;
      if ((px - x) ** 2 + (py - y) ** 2 > r * r) continue;
      const cx = Math.floor(gx / N), cy = Math.floor(gy / N), k = cx + ',' + cy;
      let c = this.ch.get(k);
      if (!c) { if (!code) continue; c = new Uint8Array(N * N); this.ch.set(k, c); }
      if (this.tx && !this.tx.has(k)) this.tx.set(k, this.ch.has(k) && c.some(v => v) ? c.slice() : null);
      c[(gy - cy * N) * N + (gx - cx * N)] = code;
    }
    const d = this._d, b = [x - r, y - r, x + r, y + r];
    this._d = d ? [Math.min(d[0], b[0]), Math.min(d[1], b[1]), Math.max(d[2], b[2]), Math.max(d[3], b[3])] : b;
  }
  flush() { if (this._d && this.onChange) this.onChange(this._d); this._d = null; }
  commit() {
    const t = this.tx; this.tx = null; this.flush();
    if (t && t.size) { this.U.push(t); if (this.U.length > 60) this.U.shift(); this.R = []; this.onLog && this.onLog(); }
  }
  _swap(t) {
    const back = new Map();
    for (const [k, v] of t) { const cur = this.ch.get(k); back.set(k, cur ? cur.slice() : null); if (v) this.ch.set(k, v.slice()); else this.ch.delete(k); }
    return back;
  }
  undo() { const t = this.U.pop(); if (!t) return false; this.R.push(this._swap(t)); this.onChange && this.onChange(null); return true; }
  redo() { const t = this.R.pop(); if (!t) return false; this.U.push(this._swap(t)); this.onChange && this.onChange(null); return true; }

  // Kachel rendern: f = Maßstab (1 = nativ); leicht verrauschte Kanten, damit es nicht nach Raster aussieht
  renderTile(tx, ty, T, f) {
    if (!this.ch.size) return null;
    const S = T / f, bb = groundBBox(tx * S, ty * S, (tx + 1) * S, (ty + 1) * S);
    let any = false;
    for (let cx = Math.floor(bb[0] / CH); cx <= Math.floor(bb[2] / CH) && !any; cx++) for (let cy = Math.floor(bb[1] / CH); cy <= Math.floor(bb[3] / CH); cy++) if (this.ch.has(cx + ',' + cy)) { any = true; break; }
    if (!any) return null;
    const img = new ImageData(T, T), D = img.data; let hit = false;
    for (let py = 0; py < T; py++) for (let px = 0; px < T; px++) {
      const [x, y] = unprojGround((tx * T + px + 0.5) / f, (ty * T + py + 0.5) / f);
      const j = f >= 1 ? (hash(Math.floor(x * 12), Math.floor(y * 12), 86) - 0.5) * 0.22 : 0;
      const code = this.at(x + j, y - j); if (!code) continue;
      const c = GROUNDS[code].f(x, y), o = (py * T + px) * 4;
      D[o] = Math.round(c[0] / 6) * 6; D[o + 1] = Math.round(c[1] / 6) * 6; D[o + 2] = Math.round(c[2] / 6) * 6; D[o + 3] = 255; hit = true;
    }
    return hit ? img : null;
  }
  // Speichern: je Stück Lauflängen-kodiert als Base64
  serialize() {
    const out = {};
    for (const [k, c] of this.ch) {
      const b = []; for (let i = 0; i < c.length;) { const v = c[i]; let n = 1; while (i + n < c.length && c[i + n] === v && n < 255) n++; b.push(n, v); i += n; }
      if (b.length === 2 && b[1] === 0) continue;
      let s = ''; for (const v of b) s += String.fromCharCode(v); out[k] = btoa(s);
    }
    return { cell: CELL, chunk: CH, types: GROUNDS.map(g => g && g.id), data: out };
  }
  load(d) {
    this.ch.clear(); this.U = []; this.R = [];
    if (!d || !d.data) return;
    const map = (d.types || []).map(id => GROUNDS.findIndex(g => g && g.id === id));
    for (const [k, s] of Object.entries(d.data)) {
      const raw = atob(s), c = new Uint8Array(N * N); let i = 0;
      for (let p = 0; p + 1 < raw.length; p += 2) { const n = raw.charCodeAt(p), v = map[raw.charCodeAt(p + 1)] > 0 ? map[raw.charCodeAt(p + 1)] : 0; c.fill(v, i, i + n); i += n; }
      this.ch.set(k, c);
    }
  }
}
