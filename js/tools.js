// Editor-Werkzeuge: Auswählen/Verschieben, Platzieren, Vegetationspinsel, Radierer
import { proj, groundDepth, groundBBox, PPM } from './camera.js';
import { inWorld } from './camera.js';
import { ASSETS } from './assets.js';
import { VEG, BRUSHES } from './veg.js';
import { BLOCK_DEFAULT, normPoly } from './blocks.js';
import { ROAD_DEFAULT, layout, ACUTE } from './roads.js';

export const MODES = ['select', 'place', 'brush', 'erase', 'road', 'block', 'ground'];
const STEP = Math.PI / 36; // Straßen in 5°-Schritten

export class Tools {
  constructor(app) {
    this.app = app; this.mode = 'select';
    this.asset = 'haus_siedlung'; this.rot = 0; this.variant = 0; this.randVar = true;
    this.brush = { r: 3, d: 6, id: 'meadow', acc: 0 };
    this.eraser = { r: 4, vegOnly: true };
    this.ground = { code: 2, r: 3, erase: false };
    this.road = { p: { ...ROAD_DEFAULT }, start: null }; this.selRoad = null;
    this.block = { p: { ...BLOCK_DEFAULT }, pts: [], vdrag: null }; this.selBlock = null;
    this.sel = null; this.drag = null; this.paint = null; this.cursor = null; this.shift = false;
  }
  setMode(m) { this.mode = m; this.drag = null; this.paint = null; this.road.start = null; this.block.pts = []; this.block.vdrag = null; if (m !== 'select') { this.sel = null; this.selRoad = null; } if (m !== 'select' && m !== 'block') this.selBlock = null; this.app.ui.sync(); this.app.dirty(); }
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
      const s = sprites.get(o.a, o.r, o.v), p = proj(o.x, o.y, 0); if (!s) continue;
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
      const n0 = this.app.cam.toNative(dx, dy), bl = o ? null : (this.app.blocks.pick(n0[0], n0[1], groundBBox(n0[0] - 300, n0[1] - 400, n0[0] + 300, n0[1] + 400)) || this.app.blocks.containing(g[0], g[1]));
      this.selBlock = bl ? bl.id : null;
      const rs = o || bl ? null : this.app.roads.segNear(g[0], g[1], 0, true);
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
    if (this.mode === 'block') { this.blockDown(g, e, dx, dy); this.app.dirty(); return true; }
    if (this.mode === 'ground') { this.app.paint.begin(); this.paint = { g, last: performance.now() }; this.cursor = g; this.paintTick(0.05); return true; }
    if (this.mode === 'brush' || this.mode === 'erase') {
      world.begin(); this.app.veg.begin(); this.paint = { g, last: performance.now() }; this.cursor = g; this.paintTick(0.05); return true;
    }
    return false;
  }
  move(dx, dy, e) {
    const { cam, world } = this.app, g = cam.screenToGround(dx, dy);
    this.cursor = g; this.shift = e.shiftKey;
    if (this.block.vdrag) { this.block.vdrag.p = this.blockSnap(g, this.block.vdrag); }
    if (this.drag) {
      const [x, y] = this.snap(g[0] + this.drag.off[0], g[1] + this.drag.off[1]);
      if (inWorld(x, y)) world.move(this.drag.id, { x, y });
    } else if (this.paint) { this.paint.g = g; }
    this.app.dirty();
  }
  up() {
    if (this.block.vdrag) { const v = this.block.vdrag, b = this.app.blocks.list.get(v.id); if (b && v.p) { const pts = b.pts.map(q => q.slice()); pts[v.i] = v.p; const B = this.app.blocks; B.begin(); B.set(v.id, { pts }); B.commit(); } this.block.vdrag = null; }
    if (this.drag) { this.app.world.logMod(this.drag.b); this.drag = null; }
    if (this.paint) { if (this.mode === 'ground') this.app.paint.commit(); else { this.app.world.commit(); this.app.veg.commit(); } this.paint = null; }
    this.app.ui.sync();
  }
  // wird jedes Bild aufgerufen, solange gemalt wird (wie in Rap Streets: Menge pro Zeit)
  paintTick(dt) {
    if (!this.paint) return;
    const g = this.paint.g, now = performance.now(); dt = Math.min(0.1, dt || (now - this.paint.last) / 1000); this.paint.last = now;
    if (this.mode === 'ground') { const G = this.ground; this.app.paint.circle(g[0], g[1], G.r, this.shift || G.erase ? 0 : G.code); this.app.paint.flush(); return; }
    if (this.mode === 'erase' || this.shift) this.erase(g); else this.vegPaint(g, dt);
    this.app.veg.flush(); this.app.ui.sync();
  }
  brushDef() { return BRUSHES.find(b => b.id === this.brush.id) || BRUSHES[0]; }
  vegPaint(g, dt) {
    const B = this.brush, b = this.brushDef(), R = B.r, tot = b.mix.reduce((a, q) => a + q[1], 0);
    B.acc += (B.d / 5) * dt * (6 + Math.PI * R * R * 9) * (b.dens || 1);
    for (let guard = 0; B.acc >= 1 && guard < 400; B.acc--, guard++) {
      const a = Math.random() * 6.2832, rr = Math.sqrt(Math.random()) * R, x = g[0] + Math.cos(a) * rr, y = g[1] + Math.sin(a) * rr;
      if (!inWorld(x, y)) continue;
      let pk = Math.random() * tot, t = b.mix[0][0];
      for (const q of b.mix) { pk -= q[1]; if (pk <= 0) { t = q[0]; break; } }
      if (b.tree) { const d = ASSETS[t]; if (!this.blocked(x, y, d) && !this.onRoad(x, y, true)) this.app.world.add({ a: t, x, y, r: d.rot * Math.floor(Math.random() * 72 / d.rot), v: Math.floor(Math.random() * d.variants) }); continue; }
      if (this.onRoad(x, y, !b.sidewalk) && !b.road) continue;
      if (!VEG[t].flat && this.inBuilding(x, y)) continue;
      if (this.app.veg.crowded(t, x, y)) continue;
      this.app.veg.add(t, x, y, (Math.random() * VEG[t].variants) | 0);
    }
    if (B.acc > 1) B.acc = 1;
  }
  // liegt der Punkt auf einer Straße? (wide = inkl. Gehweg)
  onRoad(x, y, wide) {
    const R = this.app.roads; if (!R.segs.size) return false;
    for (const s of R.query(x - 1, y - 1, x + 1, y + 1).segs) {
      const q = s.g, rx = x - q.ax, ry = y - q.ay, sl = rx * q.ux + ry * q.uy, t = Math.abs(rx * q.nx + ry * q.ny);
      if (sl >= -q.lay.h && sl <= q.L + q.lay.h && t <= (wide ? q.lay.H : q.lay.h)) return true;
    }
    for (const n of R.query(x - 1, y - 1, x + 1, y + 1).nodes) { let ins = true; const h = n.hull; for (let i = 0; i < h.length; i++) { const A = h[i], Bq = h[(i + 1) % h.length]; if ((Bq[0] - A[0]) * (y - A[1]) - (Bq[1] - A[1]) * (x - A[0]) < 0) { ins = false; break; } } if (ins) return true; }
    return false;
  }
  inBuilding(x, y) { for (const o of this.app.world.near(x, y, 7)) if (ASSETS[o.a].cat === 'Gebäude' && Math.hypot(o.x - x, o.y - y) < ASSETS[o.a].sp - 0.8) return true; return false; }
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
    const r = this.mode === 'erase' ? this.eraser.r : this.brush.r;
    this.app.veg.eraseCircle(g[0], g[1], r);
    if (this.mode === 'erase') for (const o of this.app.world.near(g[0], g[1], r)) if (!this.eraser.vegOnly || ASSETS[o.a].veg) this.app.world.del(o.id);
  }
  rotate(dir) {
    if (this.mode === 'select' && this.sel) {
      const o = this.app.world.objs.get(this.sel); if (!o) return;
      const st = ASSETS[o.a].rot; this.app.world.set(o.id, { r: ((o.r + dir * st) % 72 + 72) % 72 });
    } else { const st = ASSETS[this.asset].rot; this.rot = ((this.rot + dir * st) % 72 + 72) % 72; }
    this.app.ui.sync(); this.app.dirty();
  }
  nextVariant() {
    if (this.mode === 'select' && this.sel) { const o = this.app.world.objs.get(this.sel); if (o) this.app.world.set(o.id, { v: (o.v + 1) % ASSETS[o.a].variants }); }
    else { this.randVar = false; this.variant = (this.variant + 1) % ASSETS[this.asset].variants; }
    this.app.ui.sync(); this.app.dirty();
  }
  deleteSel() {
    if (this.sel) { this.app.world.del(this.sel); this.sel = null; }
    else if (this.selBlock) { const B = this.app.blocks; B.begin(); B.del(this.selBlock); B.commit(); this.selBlock = null; }
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
      const q = s.g, den = ux * q.uy - uy * q.ux; if (Math.abs(den) < 1e-6 || Math.abs(ux * q.ux + uy * q.uy) > ACUTE) continue;
      const t = ((q.ax - st[0]) * q.uy - (q.ay - st[1]) * q.ux) / den, u = ((q.ax - st[0]) * uy - (q.ay - st[1]) * ux) / den;
      if (t <= 0.5 || u < 0 || u > q.L) continue;
      const P = [st[0] + ux * t, st[1] + uy * t], d = Math.hypot(P[0] - g[0], P[1] - g[1]);
      if (d < bd) { bd = d; best = P; }
    }
    return best || e;
  }
  // ---------- Häuserblock zeichnen / bearbeiten ----------
  // Ecke einrasten: an vorhandene Blockecken, sonst ans Raster
  blockSnap(g, ignore) {
    const r = this.tol(); let best = null, bd = r;
    for (const b of this.app.blocks.list.values()) b.pts.forEach((q, i) => {
      if (ignore && ignore.id === b.id && ignore.i === i) return;
      const d = Math.hypot(q[0] - g[0], q[1] - g[1]); if (d < bd) { bd = d; best = [q[0], q[1]]; }
    });
    return best || this.snap(g[0], g[1]);
  }
  // Block unter dem Mauszeiger: erst pixelgenau über die Hausbilder, dann über die Grundfläche
  blockAt(g, dx, dy) {
    const n0 = this.app.cam.toNative(dx, dy);
    return this.app.blocks.pick(n0[0], n0[1], groundBBox(n0[0] - 300, n0[1] - 400, n0[0] + 300, n0[1] + 400)) || this.app.blocks.containing(g[0], g[1]);
  }
  blockDown(g, e, dx, dy) {
    const B = this.block, r = this.tol();
    if (e.button === 2) { this.blockFinish(); return; }
    if (!B.pts.length && this.selBlock) {           // Eckpunkt des gewählten Blocks ziehen?
      const b = this.app.blocks.list.get(this.selBlock);
      if (b && !b.baked) for (let i = 0; i < b.pts.length; i++) if (Math.hypot(b.pts[i][0] - g[0], b.pts[i][1] - g[1]) < r) { B.vdrag = { id: b.id, i, p: b.pts[i].slice() }; return; }
    }
    if (!B.pts.length) { const hit = this.blockAt(g, dx, dy); if (hit) { this.selBlock = hit.id; this.app.ui.sync(); this.app.ui.blockForm(); return; } }
    if (B.pts.length >= 3 && Math.hypot(B.pts[0][0] - g[0], B.pts[0][1] - g[1]) < r) { this.blockFinish(); return; }
    B.pts.push(this.blockSnap(g)); this.selBlock = null;
    if (B.pts.length >= 8) this.blockFinish();
    this.app.ui.sync();
  }
  blockFinish() {
    const B = this.block;
    if (B.pts.length >= 3) { const A = this.app.blocks; A.begin(); const b = A.add(B.pts, B.p); A.commit(); this.selBlock = b.id; B.p = { ...B.p, seed: B.p.seed + 1 }; }
    B.pts = []; this.app.ui.sync(); this.app.ui.blockForm(); this.app.dirty();
  }
  roadFinish() { this.road.start = null; this.app.dirty(); }
  key(e) {
    const k = e.key.toLowerCase();
    if (k === 'q') this.rotate(-1); else if (k === 'e') this.rotate(1);
    else if (k === 'v') this.nextVariant();
    else if (k === 'delete' || k === 'backspace') this.deleteSel();
    else if (k === 'escape' || k === 'enter') { if (this.mode === 'block' && this.block.pts.length) { if (k === 'enter') this.blockFinish(); else { this.block.pts = []; this.app.dirty(); } } else if (this.mode === 'road' && this.road.start) this.roadFinish(); else { this.sel = null; this.selRoad = null; this.setMode('select'); } }
    else if (k >= '1' && k <= '7') this.setMode(MODES[+k - 1]);
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
    const poly = (pts, close, col, w, fill, dash) => {
      ctx.save(); ctx.setTransform(...cam.groundMatrix()); ctx.beginPath(); pts.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); if (close) ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); } ctx.setLineDash(dash ? dash.map(d => d / (12 * sc * 0.75)) : []); ctx.lineWidth = w / (12 * sc * 0.75); ctx.strokeStyle = col; ctx.stroke(); ctx.restore();
    };
    if (this.selBlock && (this.mode === 'select' || this.mode === 'block')) {
      const b = this.app.blocks.list.get(this.selBlock);
      if (b) {
        let pts = b.pts; const v = this.block.vdrag; if (v && v.id === b.id && v.p) { pts = pts.map(q => q.slice()); pts[v.i] = v.p; }
        poly(pts, true, '#ffd34a', 2, null);
        if (!v) poly(this.app.blocks.gen(b).inner, true, 'rgba(255,211,74,.7)', 1.5, null, [6, 4]);
        if (this.mode === 'block') for (const q of pts) ring(q[0], q[1], this.tol() * 0.5, '#ffd34a', 2);
      }
    }
    if (this.mode === 'block' && this.cursor) {
      const B = this.block, c = this.blockSnap(this.cursor);
      if (B.pts.length) { poly([...B.pts, c], B.pts.length >= 2, '#b6f07a', 2, 'rgba(182,240,122,.12)'); for (const q of B.pts) ring(q[0], q[1], this.tol() * 0.4, '#b6f07a', 2); }
      ring(c[0], c[1], this.tol() * 0.4, '#ffd34a', 2);
      return;
    }
    if (this.mode === 'road' && this.cursor) {
      const p = this.roadPoint(this.cursor), st = this.road.start, lay = layout(this.road.p);
      if (st) {
        band(st[0], st[1], p[0], p[1], lay.H, 'rgba(190,186,176,.55)', null);
        band(st[0], st[1], p[0], p[1], lay.h, 'rgba(60,62,70,.7)', lay.ok ? '#b6f07a' : '#ff6a5a');
        const L = Math.hypot(p[0] - st[0], p[1] - st[1]), ang = ((Math.round(Math.atan2(p[1] - st[1], p[0] - st[0]) * 36 / Math.PI) * 5) % 360 + 360) % 360;
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
      if (s) {
        const d = cam.toDevice(Math.round(p[0]) - s.ox, Math.round(p[1]) - s.oy);
        ctx.save(); ctx.imageSmoothingEnabled = false; ctx.globalAlpha = inWorld(x, y) ? 0.72 : 0.3;
        ctx.drawImage(s.canvas, Math.round(d[0]), Math.round(d[1]), s.w * sc, s.h * sc); ctx.restore();
      }
      ring(x, y, 0.25, '#ffd34a', 2);
    } else if (this.mode === 'ground') {
      ring(gx, gy, this.ground.r, this.shift || this.ground.erase ? '#ff6a5a' : '#ffd34a', 2);
    } else if (this.mode === 'brush' || this.mode === 'erase') {
      const er = this.mode === 'erase' || this.shift;
      ring(gx, gy, this.mode === 'erase' ? this.eraser.r : this.brush.r, er ? '#ff6a5a' : '#b6f07a', 2);
    }
  }
}
