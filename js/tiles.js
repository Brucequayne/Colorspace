// Kachel-Cache: Boden (Stadtkarte) und Objekte werden in 256-px-Kacheln vorgerendert
import { CFG } from './config.js';
import { proj, groundDepth, groundBBox, GM, PPM } from './camera.js';
import { drawRef } from './refmap.js';
import { SHADOW_RGBA } from './renderer.js';

const T = CFG.TILE_PX;
// Wie weit Objekte über ihre Kachel hinausragen können (native px)
const M_TOP = 220, M_BOTTOM = 340, M_SIDE = 240;

export class Tiles {
  constructor(app) { this.app = app; this.G = new Map(); this.O = new Map(); this.cap = CFG.TILE_CACHE; }
  _get(map, k) { if (!map.has(k)) return undefined; const v = map.get(k); map.delete(k); map.set(k, v); return v; }
  _put(map, k, v) { map.set(k, v); while (map.size > this.cap) map.delete(map.keys().next().value); return v; }
  // budget = Objekt mit .n (wie viele neue Kacheln dürfen in diesem Frame gebaut werden)
  ground(tx, ty, budget) {
    const k = tx + ',' + ty; let c = this._get(this.G, k);
    if (c !== undefined || budget.n <= 0) return c;
    budget.n--;
    c = document.createElement('canvas'); c.width = c.height = T;
    const x0 = tx * T, y0 = ty * T;
    drawRef(c.getContext('2d'), this.app.osm, groundBBox(x0, y0, x0 + T, y0 + T), [GM[0], GM[1], GM[2], GM[3], -x0, -y0], 1 / PPM, this.app.layers);
    return this._put(this.G, k, c);
  }
  objects(tx, ty, budget) {
    const k = tx + ',' + ty; let c = this._get(this.O, k);
    if (c !== undefined || budget.n <= 0) return c;
    budget.n--;
    return this._put(this.O, k, this.composite(tx, ty));
  }
  composite(tx, ty) {
    const { world, sprites } = this.app, x0 = tx * T, y0 = ty * T;
    const bb = groundBBox(x0 - M_SIDE, y0 - M_TOP, x0 + T + M_SIDE, y0 + T + M_BOTTOM);
    const list = [];
    for (const o of world.query(bb[0], bb[1], bb[2], bb[3])) {
      const s = sprites.get(o.a, o.r, o.v); if (!s) continue;
      const p = proj(o.x, o.y, 0), sx = Math.round(p[0]) - s.ox - x0, sy = Math.round(p[1]) - s.oy - y0;
      if (sx >= T || sy >= T || sx + s.w <= 0 || sy + s.h <= 0) continue;
      list.push([s, sx, sy, groundDepth(o.x, o.y)]);
    }
    if (!list.length) return null;
    const N = T * T, zb = new Float32Array(N).fill(-1e9), shb = new Uint8Array(N), img = new ImageData(T, T), D = img.data;
    for (const [s, sx, sy] of list) {
      const xa = Math.max(0, sx), xb = Math.min(T, sx + s.w), ya = Math.max(0, sy), yb = Math.min(T, sy + s.h);
      for (let y = ya; y < yb; y++) { const r = (y - sy) * s.w - sx; for (let x = xa; x < xb; x++) if (s.sh[r + x]) shb[y * T + x] = 1; }
    }
    for (const [s, sx, sy, gd] of list) {
      const xa = Math.max(0, sx), xb = Math.min(T, sx + s.w), ya = Math.max(0, sy), yb = Math.min(T, sy + s.h);
      for (let y = ya; y < yb; y++) {
        const r = (y - sy) * s.w - sx;
        for (let x = xa; x < xb; x++) {
          const si = r + x; if (!s.rgba[si * 4 + 3]) continue;
          const d = s.depth[si] + gd, i = y * T + x;
          if (d <= zb[i]) continue;
          zb[i] = d; D[i * 4] = s.rgba[si * 4]; D[i * 4 + 1] = s.rgba[si * 4 + 1]; D[i * 4 + 2] = s.rgba[si * 4 + 2]; D[i * 4 + 3] = 255;
        }
      }
    }
    for (let i = 0; i < N; i++) if (zb[i] < -1e8 && shb[i]) D.set(SHADOW_RGBA, i * 4);
    const c = document.createElement('canvas'); c.width = c.height = T;
    c.getContext('2d').putImageData(img, 0, 0);
    return c;
  }
  clearGround() { this.G.clear(); }
  clearAll() { this.G.clear(); this.O.clear(); }
  // Objekt-Kacheln in einem nativen Rechteck verwerfen
  dropObjects(nx0, ny0, nx1, ny1) {
    for (let ty = Math.floor(ny0 / T); ty <= Math.floor(ny1 / T); ty++)
      for (let tx = Math.floor(nx0 / T); tx <= Math.floor(nx1 / T); tx++) this.O.delete(tx + ',' + ty);
  }
  // Boden-Kacheln in einem Weltbereich verwerfen
  dropGround(bb) {
    const pts = [proj(bb[0], bb[1], 0), proj(bb[2], bb[1], 0), proj(bb[0], bb[3], 0), proj(bb[2], bb[3], 0)];
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const a = Math.floor(Math.min(...xs) / T), b = Math.floor(Math.max(...xs) / T), c = Math.floor(Math.min(...ys) / T), d = Math.floor(Math.max(...ys) / T);
    if ((b - a) * (d - c) > 4000) { this.G.clear(); return; }
    for (const k of [...this.G.keys()]) { const [x, y] = k.split(',').map(Number); if (x >= a && x <= b && y >= c && y <= d) this.G.delete(k); }
  }
}
