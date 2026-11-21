// Editor-Werkzeuge: Auswählen/Verschieben, Platzieren, Vegetationspinsel, Radierer
import { proj, groundDepth, groundBBox, PPM } from './camera.js';
import { inWorld } from './geo.js';
import { ASSETS, VEG } from './assets.js';
import { ROAD_DEFAULT, layout } from './roads.js';

export const MODES = ['select', 'place', 'brush', 'erase', 'road'];
const STEP = Math.PI / 12;

export class Tools {
  constructor(app) {
    this.app = app; this.mode = 'select';
    this.asset = 'haus_siedlung'; this.rot = 0; this.variant = 0; this.randVar = true;
    this.brush = { r: 6, d: 4, set: { linde: true, platane: false, obstbaum: true, busch: true, gras: true, blumen: true } };
    this.eraser = { r: 4, vegOnly: true };
    this.road = { p: { ...ROAD_DEFAULT }, start: null }; this.selRoad = null;
    this.sel = null; this.drag = null; this.paint = null; this.cursor = null; this.shift = false;
  }
  setMode(m) { this.mode = m; this.drag = null; this.paint = null; this.road.start = null; if (m !== 'select') { this.sel = null; this.selRoad = null; } this.app.ui.sync(); this.app.dirty(); }
  setAsset(k) { this.asset = k; const d = ASSETS[k]; this.rot = Math.round(this.rot / d.rot) * d.rot; this.variant = 0; this.setMode('place'); }
  snap(x, y) {
    const G = this.app.grid; if (!G.snap) return [x, y];
    const a = G.angle * Math.PI / 12, c = Math.cos(a), s = Math.sin(a);
    const u = Math.round((x * c + y * s) / G.step) * G.step, v = Math.round((-x * s + y * c) / G.step) * G.step;
    return [u * c - v * s, u * s + v * c];
  }
  // pixelgenaues Anklicken über die Sprite-Masken
  pick(dx, dy) {
    const { cam, world, sprites } = this.app, n = cam.toNative(dx, dy), nx = Math.floor(n[0]), ny = Math.floor(n[1]);
    const bb = groundBBox(nx - 240, ny - 340, nx + 240, ny + 340);
    let best = null, bd = -1e18;
    for (const o of world.query(bb[0], bb[1], bb[2], bb[3])) {
      const s = sprites.get(o.a, o.r, o.v), p = proj(o.x, o.y, 0);
      const lx = nx - (Math.round(p[0]) - s.ox), ly = ny - (Math.round(p[1]) - s.oy);
      if (lx < 0 || ly < 0 || lx >= s.w || ly >= s.h) continue;
      const si = ly * s.w + lx; if (!s.rgba[si * 4 + 3]) continue;
      const d = s.depth[si] + groundDepth(o.x, o.y);
      if (d > bd) { bd = d; best = o; }
    }
    return best;
  }
  down(dx, dy, e) {
    const { cam, world } = this.app, g = cam.screenToGround(dx, dy);
    this.shift = e.shiftKey;
    if (this.mode === 'select') {
      const o = this.pick(dx, dy);
      this.sel = o ? o.id : null;
      const rs = o ? null : this.app.roads.segNear(g[0], g[1], 0, true);
      this.selRoad = rs ? rs.id : null; this.app.ui.sync();
      if (o) { this.drag = { id: o.id, b: { ...o }, off: [o.x - g[0], o.y - g[1]] }; this.app.dirty(); return true; }
      this.app.dirty(); return false; // leere Fläche -> Kamera ziehen
    }
    if (this.mode === 'place') {
      const [x, y] = this.snap(g[0], g[1]);
      if (!inWorld(x, y)) return true;
      const d = ASSETS[this.asset];
      world.add({ a: this.asset, x, y, r: this.rot, v: this.variant % d.variants });
      if (this.randVar) this.variant = Math.floor(Math.random() * d.variants);
      return true;
    }
    if (this.mode === 'road') {
      if (e.button === 2) { this.roadFinish(); return true; }
      const pt = this.roadPoint(g);
      if (!this.road.start) { this.road.start = pt; }
      else if (Math.hypot(pt[0] - this.road.start[0], pt[1] - this.road.start[1]) >= 1) {
        const R = this.app.roads; R.begin(); const n = R.draw(this.road.start, pt, this.road.p); R.commit();
        this.road.start = [n.x, n.y];
      }
      this.app.dirty(); return true;
    }
    if (this.mode === 'brush' || this.mode === 'erase') {
      world.begin(); this.paint = { last: g, t: 0 }; this.stroke(g); return true;
    }
    return false;
  }
  move(dx, dy, e) {
    const { cam, world } = this.app, g = cam.screenToGround(dx, dy);
    this.cursor = g; this.shift = e.shiftKey;
    if (this.drag) {
      const [x, y] = this.snap(g[0] + this.drag.off[0], g[1] + this.drag.off[1]);
      if (inWorld(x, y)) world.move(this.drag.id, { x, y });
    } else if (this.paint) {
      const r = this.mode === 'erase' || this.shift ? this.eraser.r : this.brush.r;
      const now = performance.now();
      if (Math.hypot(g[0] - this.paint.last[0], g[1] - this.paint.last[1]) > r * 0.3 || now - this.paint.t > 160) { this.paint.last = g; this.stroke(g); }
    }
    this.app.dirty();
  }
  up() {
    if (this.drag) { this.app.world.logMod(this.drag.b); this.drag = null; }
    if (this.paint) { this.app.world.commit(); this.paint = null; }
    this.app.ui.sync();
  }
  stroke(g) {
    this.paint.t = performance.now();
    if (this.mode === 'erase' || this.shift) this.erase(g); else this.stamp(g);
    this.app.ui.sync();
  }
  stamp(g) {
    const { world } = this.app, B = this.brush, types = VEG.filter(k => B.set[k]);
    if (!types.length) return;
    const tw = types.reduce((s, k) => s + ASSETS[k].w, 0), area = Math.PI * B.r * B.r;
    const n = Math.max(1, Math.round(area * B.d / 100 * 1.5));
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.2832, rr = B.r * Math.sqrt(Math.random()), x = g[0] + Math.cos(a) * rr, y = g[1] + Math.sin(a) * rr;
      if (!inWorld(x, y)) continue;
      let w = Math.random() * tw, k = types[0];
      for (const t of types) { w -= ASSETS[t].w; if (w <= 0) { k = t; break; } }
      const d = ASSETS[k];
      if (this.blocked(x, y, d)) continue;
      world.add({ a: k, x, y, r: d.rot * Math.floor(Math.random() * 24 / d.rot), v: Math.floor(Math.random() * d.variants) });
    }
  }
  blocked(x, y, d) {
    for (const o of this.app.world.near(x, y, d.sp + 6)) {
      const od = ASSETS[o.a], dist = Math.hypot(o.x - x, o.y - y);
      if (od.layer === 3) { if (dist < od.sp + d.sp * 0.5) return true; continue; }
      if (od.layer === d.layer) { if (dist < (od.sp + d.sp) * 0.85) return true; }
      else if (dist < (Math.max(od.layer, d.layer) === 2 ? 0.6 : 0.35)) return true;
    }
    return false;
  }
  erase(g) {
    const { world } = this.app;
    for (const o of world.near(g[0], g[1], this.eraser.r)) if (!this.eraser.vegOnly || ASSETS[o.a].veg) world.del(o.id);
  }
  rotate(dir) {
    if (this.mode === 'select' && this.sel) {
      const o = this.app.world.objs.get(this.sel); if (!o) return;
      const st = ASSETS[o.a].rot; this.app.world.set(o.id, { r: ((o.r + dir * st) % 24 + 24) % 24 });
    } else { const st = ASSETS[this.asset].rot; this.rot = ((this.rot + dir * st) % 24 + 24) % 24; }
    this.app.ui.sync(); this.app.dirty();
  }
  nextVariant() {
    if (this.mode === 'select' && this.sel) { const o = this.app.world.objs.get(this.sel); if (o) this.app.world.set(o.id, { v: (o.v + 1) % ASSETS[o.a].variants }); }
    else { this.randVar = false; this.variant = (this.variant + 1) % ASSETS[this.asset].variants; }
    this.app.ui.sync(); this.app.dirty();
  }
  deleteSel() {
    if (this.sel) { this.app.world.del(this.sel); this.sel = null; }
    else if (this.selRoad) { const R = this.app.roads; R.begin(); R.delSeg(this.selRoad); R.commit(); this.selRoad = null; }
    this.app.ui.sync();
  }
  // Fangradius in Metern (ca. 14 Bildschirmpixel)
  tol() { return Math.max(1.5, 14 / (12 * this.app.cam.scale * 0.75)); }
  // Straßenpunkt: Knoten > Kreuzung mit vorhandener Straße > 15°-Richtung mit Rasterlänge
  roadPoint(g) {
    const R = this.app.roads, r = this.tol(), st = this.road.start;
    const n = R.nodeNear(g[0], g[1], r); if (n) return [n.x, n.y];
    if (!st) {
      const s = R.segNear(g[0], g[1], r, false);
      if (s) { const q = s.g, k = (g[0] - q.ax) * q.ux + (g[1] - q.ay) * q.uy, L = Math.max(0, Math.min(q.L, Math.round(k / this.app.grid.step) * this.app.grid.step)); return [q.ax + q.ux * L, q.ay + q.uy * L]; }
      return this.snap(g[0], g[1]);
    }
    const a = Math.round(Math.atan2(g[1] - st[1], g[0] - st[0]) / STEP) * STEP, ux = Math.cos(a), uy = Math.sin(a);
    const len = Math.max(0, Math.round(((g[0] - st[0]) * ux + (g[1] - st[1]) * uy) / this.app.grid.step) * this.app.grid.step);
    const e = [st[0] + ux * len, st[1] + uy * len];
    // Schnittpunkt mit vorhandener Mittellinie in der Nähe?
    let best = null, bd = r * 1.5;
    for (const s of R.query(e[0] - 40, e[1] - 40, e[0] + 40, e[1] + 40).segs) {
      const q = s.g, den = ux * q.uy - uy * q.ux; if (Math.abs(den) < 1e-6) continue;
      const t = ((q.ax - st[0]) * q.uy - (q.ay - st[1]) * q.ux) / den, u = ((q.ax - st[0]) * uy - (q.ay - st[1]) * ux) / den;
      if (t <= 0.5 || u < 0 || u > q.L) continue;
      const P = [st[0] + ux * t, st[1] + uy * t], d = Math.hypot(P[0] - g[0], P[1] - g[1]);
      if (d < bd) { bd = d; best = P; }
    }
    return best || e;
  }
  roadFinish() { this.road.start = null; this.app.dirty(); }
  key(e) {
    const k = e.key.toLowerCase();
    if (k === 'q') this.rotate(-1); else if (k === 'e') this.rotate(1);
    else if (k === 'v') this.nextVariant();
    else if (k === 'delete' || k === 'backspace') this.deleteSel();
    else if (k === 'escape' || k === 'enter') { if (this.mode === 'road' && this.road.start) this.roadFinish(); else { this.sel = null; this.selRoad = null; this.setMode('select'); } }
    else if (k >= '1' && k <= '5') this.setMode(MODES[+k - 1]);
    else return false;
    return true;
  }
  overlay(ctx) {
    const { cam, sprites, world } = this.app, sc = cam.scale;
    const ring = (x, y, r, col, w) => {
      ctx.save(); ctx.setTransform(...cam.groundMatrix());
      ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.lineWidth = w / (PPM * sc * 0.75); ctx.strokeStyle = col; ctx.stroke(); ctx.restore();
    };
    const band = (ax, ay, bx, by, h, fill, stroke) => {
      const L = Math.hypot(bx - ax, by - ay) || 1, nx = -(by - ay) / L * h, ny = (bx - ax) / L * h;
      ctx.save(); ctx.setTransform(...cam.groundMatrix()); ctx.beginPath();
      ctx.moveTo(ax + nx, ay + ny); ctx.lineTo(bx + nx, by + ny); ctx.lineTo(bx - nx, by - ny); ctx.lineTo(ax - nx, ay - ny); ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2 / (12 * sc * 0.75); ctx.stroke(); }
      ctx.restore();
    };
    if (this.sel) { const o = world.objs.get(this.sel); if (o) ring(o.x, o.y, ASSETS[o.a].sp + 0.3, '#ffd34a', 2); }
    if (this.selRoad) {
      const ids = this.app.roads.segs.has(this.selRoad) ? [this.selRoad] : [];
      for (const id of ids) { const g = this.app.roads.segs.get(id).g; band(g.ax, g.ay, g.bx, g.by, g.lay.H, 'rgba(255,211,74,.18)', '#ffd34a'); }
    }
    if (this.mode === 'road' && this.cursor) {
      const p = this.roadPoint(this.cursor), st = this.road.start, lay = layout(this.road.p);
      if (st) {
        band(st[0], st[1], p[0], p[1], lay.H, 'rgba(190,186,176,.55)', null);
        band(st[0], st[1], p[0], p[1], lay.h, 'rgba(60,62,70,.7)', lay.ok ? '#b6f07a' : '#ff6a5a');
        const L = Math.hypot(p[0] - st[0], p[1] - st[1]), ang = ((Math.round(Math.atan2(p[1] - st[1], p[0] - st[0]) * 12 / Math.PI) * 15) % 360 + 360) % 360;
        const d = cam.toDevice(...proj(p[0], p[1], 0).slice(0, 2));
        ctx.save(); ctx.font = `${12 * cam.dpr}px ui-monospace, monospace`; ctx.fillStyle = '#000a'; const txt = `${L.toFixed(1)} m · ${ang}°`;
        const tw = ctx.measureText(txt).width; ctx.fillRect(d[0] + 12 * cam.dpr, d[1] - 22 * cam.dpr, tw + 10 * cam.dpr, 18 * cam.dpr);
        ctx.fillStyle = '#ffd34a'; ctx.fillText(txt, d[0] + 17 * cam.dpr, d[1] - 9 * cam.dpr); ctx.restore();
      }
      ring(p[0], p[1], 0.6, '#ffd34a', 2);
      return;
    }
    if (!this.cursor) return;
    const [gx, gy] = this.cursor;
    if (this.mode === 'place') {
      const [x, y] = this.snap(gx, gy), s = sprites.get(this.asset, this.rot, this.variant), p = proj(x, y, 0);
      const d = cam.toDevice(Math.round(p[0]) - s.ox, Math.round(p[1]) - s.oy);
      ctx.save(); ctx.imageSmoothingEnabled = false; ctx.globalAlpha = inWorld(x, y) ? 0.72 : 0.3;
      ctx.drawImage(s.canvas, Math.round(d[0]), Math.round(d[1]), s.w * sc, s.h * sc); ctx.restore();
      ring(x, y, 0.25, '#ffd34a', 2);
    } else if (this.mode === 'brush' || this.mode === 'erase') {
      const er = this.mode === 'erase' || this.shift;
      ring(gx, gy, er ? this.eraser.r : this.brush.r, er ? '#ff6a5a' : '#b6f07a', 2);
    }
  }
}
