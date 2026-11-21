// Kachel-Cache: Boden (Stadtkarte) und Objekte werden in 256-px-Kacheln vorgerendert
import { CFG } from './camera.js';
import { proj, groundDepth, groundBBox, GM, PPM } from './camera.js';
import { drawRef } from './osm.js';
import { SHADOW_RGBA } from './renderer.js';
import { vegSprite } from './veg.js';

const T = CFG.TILE_PX;
// Wie weit Objekte über ihre Kachel hinausragen können (native px)
const M_TOP = 220, M_BOTTOM = 340, M_SIDE = 240;

export class Tiles {
  constructor(app) { this.app = app; this.G = new Map(); this.O = new Map(); this.Rd = new Map(); this.Pt = new Map(); this.cap = CFG.TILE_CACHE; }
  _get(map, k) { if (!map.has(k)) return undefined; const v = map.get(k); map.delete(k); map.set(k, v); return v; }
  _put(map, k, v) { map.set(k, v); while (map.size > this.cap) map.delete(map.keys().next().value); return v; }
  // budget = Objekt mit .n (wie viele neue Kacheln dürfen in diesem Frame gebaut werden)
  // Boden-Kachel; f = Maßstab (1 = nativ, 1/2, 1/4 … für die Übersicht)
  ground(tx, ty, budget, f = 1) {
    const k = f + '|' + tx + ',' + ty; let c = this._get(this.G, k);
    if (c !== undefined || budget.n <= 0) return c;
    budget.n--;
    c = document.createElement('canvas'); c.width = c.height = T;
    const S = T / f, x0 = tx * S, y0 = ty * S;
    drawRef(c.getContext('2d'), this.app.osm, groundBBox(x0, y0, x0 + S, y0 + S), [GM[0] * f, GM[1] * f, GM[2] * f, GM[3] * f, -tx * T, -ty * T], 1 / (PPM * f), this.app.layers);
    return this._put(this.G, k, c);
  }
  roads(tx, ty, budget) {
    const k = tx + ',' + ty; let c = this._get(this.Rd, k);
    if (c !== undefined || budget.n <= 0) return c;
    budget.n--;
    const img = this.app.roads.renderTile(tx * T, ty * T, T);
    if (img) { c = document.createElement('canvas'); c.width = c.height = T; c.getContext('2d').putImageData(img, 0, 0); } else c = null;
    return this._put(this.Rd, k, c);
  }
  // gemalter Boden (Bodenpinsel), auch verkleinert für die Übersicht
  paint(tx, ty, budget, f = 1) {
    const k = f + '|' + tx + ',' + ty; let c = this._get(this.Pt, k);
    if (c !== undefined || budget.n <= 0) return c;
    budget.n--;
    const img = this.app.paint.renderTile(tx, ty, T, f);
    if (img) { c = document.createElement('canvas'); c.width = c.height = T; c.getContext('2d').putImageData(img, 0, 0); } else c = null;
    return this._put(this.Pt, k, c);
  }
  dropPaint(bb) { if (!bb) { this.Pt.clear(); return; } this._drop(this.Pt, bb); }
  dropRoads(bb) { if (!bb) { this.Rd.clear(); return; } this._drop(this.Rd, bb); }
  objects(tx, ty, budget) {
    const k = tx + ',' + ty; let c = this._get(this.O, k);
    if (c !== undefined || budget.n <= 0) return c;
    budget.n--;
    c = this.composite(tx, ty, budget);
    if (c === undefined) return undefined; // Hausbilder noch nicht fertig -> nächstes Bild weiter
    return this._put(this.O, k, c);
  }
  composite(tx, ty, budget) {
    const { world, sprites } = this.app, x0 = tx * T, y0 = ty * T;
    const bb = groundBBox(x0 - M_SIDE, y0 - M_TOP, x0 + T + M_SIDE, y0 + T + M_BOTTOM);
    const list = [];
    for (const o of world.query(bb[0], bb[1], bb[2], bb[3])) {
      const s = sprites.get(o.a, o.r, o.v); if (!s) { if (sprites.loading(o.a)) return undefined; continue; }
      const p = proj(o.x, o.y, 0), sx = Math.round(p[0]) - s.ox - x0, sy = Math.round(p[1]) - s.oy - y0;
      if (sx >= T || sy >= T || sx + s.w <= 0 || sy + s.h <= 0) continue;
      list.push([s, sx, sy, groundDepth(o.x, o.y)]);
    }
    // Häuserblöcke (jede Parzelle ein eigenes Hausbild)
    for (const par of this.app.blocks.parcels(bb)) {
      if (!par.nb) { // grobe Bildgrenzen ohne zu rendern (Höhe + Schattenlänge)
        const H = 4.2 + (par.F - 1) * 3.4 + 6, ps = par.q.flatMap(q => [proj(q[0], q[1], 0), proj(q[0], q[1], H)]);
        const xs = ps.map(v => v[0]), ys = ps.map(v => v[1]), sh = H * 12;
        par.nb = [Math.min(...xs) - sh, Math.min(...ys) - sh, Math.max(...xs) + sh, Math.max(...ys) + 4];
      }
      if (par.nb[0] > x0 + T || par.nb[2] < x0 || par.nb[1] > y0 + T || par.nb[3] < y0) continue;
      const p = proj(par.cx, par.cy, 0);
      const s = this.app.blocks.sprite(par, budget && budget.spr);
      if (!s) return undefined;
      const sx = Math.round(p[0]) - s.ox - x0, sy = Math.round(p[1]) - s.oy - y0;
      if (sx >= T || sy >= T || sx + s.w <= 0 || sy + s.h <= 0) continue;
      list.push([s, sx, sy, groundDepth(par.cx, par.cy)]);
    }
    // Vegetation (kleine Sprites, ragen kaum über ihre Kachel hinaus)
    const vb = groundBBox(x0 - 16, y0 - 4, x0 + T + 16, y0 + T + 16);
    for (const q of this.app.veg.query(vb[0], vb[1], vb[2], vb[3])) {
      const s = vegSprite(q[0], q[3]), p = proj(q[1], q[2], 0), sx = Math.round(p[0]) - s.ox - x0, sy = Math.round(p[1]) - s.oy - y0;
      if (sx >= T || sy >= T || sx + s.w <= 0 || sy + s.h <= 0) continue;
      list.push([s, sx, sy, groundDepth(q[1], q[2])]);
    }
    if (!list.length) return null;
    const N = T * T, zb = new Float32Array(N).fill(-1e9), shb = new Uint8Array(N), vpx = new Uint8Array(N), img = new ImageData(T, T), D = img.data;
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
          zb[i] = d; vpx[i] = s.veg ? 1 : 0; D[i * 4] = s.rgba[si * 4]; D[i * 4 + 1] = s.rgba[si * 4 + 1]; D[i * 4 + 2] = s.rgba[si * 4 + 2]; D[i * 4 + 3] = 255;
        }
      }
    }
    for (let i = 0; i < N; i++) {
      if (!shb[i]) continue;
      if (zb[i] < -1e8) D.set(SHADOW_RGBA, i * 4);
      else if (vpx[i]) { D[i * 4] *= 0.66; D[i * 4 + 1] *= 0.7; D[i * 4 + 2] *= 0.8; } // Schatten auf Gras
    }
    const c = document.createElement('canvas'); c.width = c.height = T;
    c.getContext('2d').putImageData(img, 0, 0);
    return c;
  }
  clearGround() { this.G.clear(); }
  clearAll() { this.G.clear(); this.O.clear(); this.Rd.clear(); this.Pt.clear(); }
  // Objekt-Kacheln in einem nativen Rechteck verwerfen
  dropObjects(nx0, ny0, nx1, ny1) {
    for (let ty = Math.floor(ny0 / T); ty <= Math.floor(ny1 / T); ty++)
      for (let tx = Math.floor(nx0 / T); tx <= Math.floor(nx1 / T); tx++) this.O.delete(tx + ',' + ty);
  }
  // Boden-Kacheln in einem Weltbereich verwerfen
  dropGround(bb) { this._drop(this.G, bb); }
  _drop(map, bb) {
    const pts = [proj(bb[0], bb[1], 0), proj(bb[2], bb[1], 0), proj(bb[0], bb[3], 0), proj(bb[2], bb[3], 0)];
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const a = Math.floor(Math.min(...xs) / T), b = Math.floor(Math.max(...xs) / T), c = Math.floor(Math.min(...ys) / T), d = Math.floor(Math.max(...ys) / T);
    for (const k of [...map.keys()]) {
      let f = 1, rest = k; if (k.includes('|')) { const p = k.split('|'); f = +p[0]; rest = p[1]; }
      const [x, y] = rest.split(',').map(Number), S = T / f;
      if ((x + 1) * S >= a * T && x * S <= (b + 1) * T && (y + 1) * S >= c * T && y * S <= (d + 1) * T) map.delete(k);
    }
  }
}
