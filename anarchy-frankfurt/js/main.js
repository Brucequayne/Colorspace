// Anarchy Frankfurt – Map-Editor: Start, Eingabe, Zeichenschleife
import { CFG } from './config.js';
import { Camera, proj, PPM } from './camera.js';
import { toWorld, osmTileOf } from './camera.js';
import { OSM } from './osm.js';
import { drawRef, LAYERS, COL } from './refmap.js';
import { Sprites } from './renderer.js';
import { Tiles } from './tiles.js';
import { World } from './world.js';
import { Roads } from './roads.js';
import { VegLayer } from './veg.js';
import { Blocks } from './blocks.js';
import { Tools } from './tools.js';
import { UI } from './ui.js';
import { ASSETS } from './assets.js';
import { dbGet, dbSet, downloadJSON, pickFile } from './world.js';

const T = CFG.TILE_PX, H = CFG.WORLD_HALF;

class App {
  constructor() {
    this.cv = document.getElementById('view'); this.ctx = this.cv.getContext('2d');
    this.cam = new Camera(); this.layers = { ...LAYERS }; this.mapAlpha = 1; this.autoLoad = true;
    this.grid = { angle: 0, step: 1, snap: true, show: true };
    this.sprites = new Sprites(); this.world = new World(); this.roads = new Roads(); this.veg = new VegLayer(); this.blocks = new Blocks(); this.hist = []; this.redoH = []; this.tiles = new Tiles(this);
    this.osm = new OSM(feats => this.onOsm(feats));
    this.tools = new Tools(this); this.ui = new UI(this);
    this._dirty = true; this.keys = new Set(); this.pointers = new Map(); this.pan = null;
  }
  async start() {
    this.ui.init(); this.resize();
    addEventListener('resize', () => this.resize());
    this.world.on(o => this.onObj(o));
    this.world.onLog = () => { this.hist.push('w'); this.redoH = []; };
    this.roads.onLog = () => { this.hist.push('r'); this.redoH = []; };
    this.veg.onLog = () => { this.hist.push('v'); this.redoH = []; };
    this.veg.onChange = bb => {
      const ps = [proj(bb[0], bb[1], 0), proj(bb[2], bb[1], 0), proj(bb[0], bb[3], 0), proj(bb[2], bb[3], 0)], xs = ps.map(p => p[0]), ys = ps.map(p => p[1]);
      this.tiles.dropObjects(Math.min(...xs) - 16, Math.min(...ys) - 16, Math.max(...xs) + 16, Math.max(...ys) + 8); this.dirty(); this.saveSoon();
    };
    this.blocks.onLog = () => { this.hist.push('b'); this.redoH = []; };
    this.blocks.onChange = bb => {
      if (!bb) this.tiles.O.clear(); else {
        const ps = [proj(bb[0], bb[1], 0), proj(bb[2], bb[1], 0), proj(bb[0], bb[3], 0), proj(bb[2], bb[3], 0)], xs = ps.map(p => p[0]), ys = ps.map(p => p[1]);
        this.tiles.dropObjects(Math.min(...xs) - 420, Math.min(...ys) - 520, Math.max(...xs) + 420, Math.max(...ys) + 40);
      }
      this.dirty(); this.saveSoon(); this.ui.sync();
    };
    this.roads.onChange = bb => { this.tiles.dropRoads(bb); this.dirty(); this.saveSoon(); this.ui.sync(); };
    const p = CFG.PLACES[0]; [this.cam.x, this.cam.y] = toWorld(p[1], p[2]);
    try { const m = await dbGet('maps', 'current'); if (m) { this.world.load(m, ASSETS); this.roads.load(m.roads); this.veg.load(m.veg); this.blocks.load(m.blocks); this.tiles.clearAll(); } } catch (e) { /* neu */ }
    this.ui.sync(); this.bindInput(); this.osm.init(); this.loadVisible();
    const loop = () => { this.frame(); requestAnimationFrame(loop); }; loop();
  }
  dirty() { this._dirty = true; }
  resize() {
    const d = devicePixelRatio || 1; this.cam.dpr = d;
    this.cv.width = Math.round(innerWidth * d); this.cv.height = Math.round(innerHeight * d);
    this.cam.w = this.cv.width; this.cam.h = this.cv.height; this.dirty();
  }
  onOsm(feats) {
    if (feats && feats.length) {
      let a = 1e9, b = 1e9, c = -1e9, d = -1e9;
      for (const f of feats) { a = Math.min(a, f.bb[0]); b = Math.min(b, f.bb[1]); c = Math.max(c, f.bb[2]); d = Math.max(d, f.bb[3]); }
      this.tiles.dropGround([a, b, c, d]);
    }
    this.dirty();
  }
  onObj(o) {
    const s = this.sprites.get(o.a, o.r, o.v), p = proj(o.x, o.y, 0), x = Math.round(p[0]) - s.ox, y = Math.round(p[1]) - s.oy;
    this.tiles.dropObjects(x, y, x + s.w, y + s.h); this.dirty(); this.saveSoon();
  }
  serialize() { return { ...this.world.serialize(), format: 4, roads: this.roads.serialize(), veg: this.veg.serialize(), blocks: this.blocks.serialize() }; }
  saveSoon() { clearTimeout(this._st); this._st = setTimeout(() => dbSet('maps', 'current', this.serialize()).catch(() => {}), 1200); }
  undo() { const k = this.hist.pop(); if (!k) return; ({ w: this.world, r: this.roads, v: this.veg, b: this.blocks })[k].undo(); this.tools.selBlock = null; this.redoH.push(k); this.tools.sel = null; this.tools.selRoad = null; this.ui.sync(); this.dirty(); }
  redo() { const k = this.redoH.pop(); if (!k) return; ({ w: this.world, r: this.roads, v: this.veg, b: this.blocks })[k].redo(); this.hist.push(k); this.ui.sync(); this.dirty(); }
  exportMap() { downloadJSON(this.serialize(), 'anarchy_frankfurt_map.json'); }
  async importMap() {
    const f = await pickFile('.json,application/json'); if (!f) return;
    try { const d = JSON.parse(await f.text()); if (d.game !== 'anarchy-frankfurt') throw new Error(); this.world.load(d, ASSETS); this.roads.load(d.roads); this.veg.load(d.veg); this.blocks.load(d.blocks); this.hist = []; this.redoH = []; this.tiles.clearAll(); this.saveSoon(); this.ui.sync(); this.dirty(); }
    catch (e) { alert('Das ist keine gültige Anarchy-Frankfurt-Karte.'); }
  }
  newMap() { this.world.load({ objects: [] }); this.roads.load(null); this.veg.load(null); this.blocks.load(null); this.tools.selBlock = null; this.hist = []; this.redoH = []; this.tools.sel = null; this.tools.selRoad = null; this.tiles.clearAll(); this.saveSoon(); this.ui.sync(); this.dirty(); }
  goTo(w, z) { this.cam.x = w[0]; this.cam.y = w[1]; if (z) this.cam.zoom = z; this.cam.clamp(); this.dirty(); this.viewChanged(); }
  zoomStep(dir, dx = this.cam.w / 2, dy = this.cam.h / 2) {
    const Z = CFG.ZOOMS; let i = Z.findIndex(z => z >= this.cam.zoom - 1e-9); if (i < 0) i = Z.length - 1;
    const n = Math.max(0, Math.min(Z.length - 1, i + dir)); if (Z[n] === this.cam.zoom) return;
    this.cam.zoomAt(Z[n], dx, dy); this.dirty(); this.viewChanged();
  }
  viewChanged() { clearTimeout(this._vt); this._vt = setTimeout(() => this.loadVisible(), 350); }
  // OSM-Kacheln im Sichtbereich anfordern (nah zuerst)
  loadVisible(force) {
    if (!force && (!this.autoLoad || this.cam.zoom < 1 / 8)) return;
    const bb = this.cam.visibleGround(), [i0, j0] = osmTileOf(Math.max(-H, bb[0]), Math.max(-H, bb[1])), [i1, j1] = osmTileOf(Math.min(H - 1, bb[2]), Math.min(H - 1, bb[3]));
    const [ci, cj] = osmTileOf(this.cam.x, this.cam.y), keys = [];
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) keys.push([i, j]);
    if (keys.length > 80 && !force) return;
    keys.sort((a, b) => Math.hypot(a[0] - ci, a[1] - cj) - Math.hypot(b[0] - ci, b[1] - cj));
    this.osm.want(keys.slice(0, 60).map(k => k[0] + '_' + k[1]));
  }

  bindInput() {
    const cv = this.cv, dev = e => { const r = cv.getBoundingClientRect(), d = this.cam.dpr; return [(e.clientX - r.left) * d, (e.clientY - r.top) * d]; };
    cv.addEventListener('contextmenu', e => e.preventDefault());
    cv.addEventListener('pointerdown', e => {
      cv.setPointerCapture(e.pointerId); this.pointers.set(e.pointerId, dev(e));
      if (this.pointers.size === 2) { this.tools.up(); this.pan = { pinch: this.pinchState() }; return; }
      const p = dev(e);
      const roadEnd = e.button === 2 && ((this.tools.mode === 'road' && this.tools.road.start) || (this.tools.mode === 'block' && this.tools.block.pts.length));
      if (!roadEnd && (e.button === 1 || e.button === 2 || this.keys.has(' '))) { this.pan = { last: p }; return; }
      if (!this.tools.down(p[0], p[1], e)) this.pan = { last: p };
    });
    cv.addEventListener('pointermove', e => {
      const p = dev(e); if (this.pointers.has(e.pointerId)) this.pointers.set(e.pointerId, p);
      if (this.pan && this.pan.pinch && this.pointers.size === 2) {
        const n = this.pinchState(), o = this.pan.pinch;
        this.cam.panDevice(n.cx - o.cx, n.cy - o.cy);
        const ratio = n.d / o.d;
        if (ratio > 1.35) { this.zoomStep(1, n.cx, n.cy); this.pan.pinch = this.pinchState(); }
        else if (ratio < 0.74) { this.zoomStep(-1, n.cx, n.cy); this.pan.pinch = this.pinchState(); }
        else { o.cx = n.cx; o.cy = n.cy; }
        this.dirty(); this.viewChanged(); return;
      }
      if (this.pan && this.pan.last) { this.cam.panDevice(p[0] - this.pan.last[0], p[1] - this.pan.last[1]); this.pan.last = p; this.viewChanged(); }
      this.tools.move(p[0], p[1], e); this.ui.status();
    });
    const end = e => { this.pointers.delete(e.pointerId); if (this.pointers.size === 0) { this.pan = null; this.tools.up(); } };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
    cv.addEventListener('pointerleave', () => { if (!this.pointers.size) { this.tools.cursor = null; this.dirty(); } });
    cv.addEventListener('wheel', e => { e.preventDefault(); const p = dev(e); this.zoomStep(e.deltaY < 0 ? 1 : -1, p[0], p[1]); }, { passive: false });
    addEventListener('keydown', e => {
      const inField = /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName);
      if (inField && e.key !== 'Escape') return;
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); e.shiftKey ? this.redo() : this.undo(); return; }
      if ((e.ctrlKey || e.metaKey) && k === 'y') { e.preventDefault(); this.redo(); return; }
      if (e.ctrlKey || e.metaKey) return;
      if (k === '+' || k === '=') return this.zoomStep(1);
      if (k === '-') return this.zoomStep(-1);
      if (k === 'g') { this.grid.show = !this.grid.show; document.getElementById('gShow').checked = this.grid.show; return this.dirty(); }
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) { this.keys.add(k); e.preventDefault(); return; }
      if (this.tools.key(e)) e.preventDefault();
    });
    addEventListener('keyup', e => this.keys.delete(e.key.toLowerCase()));
    addEventListener('blur', () => this.keys.clear());
  }
  pinchState() { const [a, b] = [...this.pointers.values()]; return { cx: (a[0] + b[0]) / 2, cy: (a[1] + b[1]) / 2, d: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1 }; }

  frame() {
    const now = performance.now(), dt = Math.min(0.1, (now - (this._ft || now)) / 1000); this._ft = now;
    if (this.tools.paint) this.tools.paintTick(dt);
    let vx = 0, vy = 0; const K = this.keys;
    if (K.has('w') || K.has('arrowup')) vy += 1; if (K.has('s') || K.has('arrowdown')) vy -= 1;
    if (K.has('a') || K.has('arrowleft')) vx += 1; if (K.has('d') || K.has('arrowright')) vx -= 1;
    if (vx || vy) { const sp = 14 * this.cam.dpr; this.cam.panDevice(vx * sp, vy * sp); this.dirty(); this.viewChanged(); }
    if (!this._dirty) return;
    this._dirty = false; this.draw(); this.ui.status();
  }
  draw() {
    const { ctx, cam } = this, s = cam.scale, o = cam.origin(), v = cam.visibleNative(), GMx = cam.groundMatrix();
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
    ctx.fillStyle = COL.outside; ctx.fillRect(0, 0, cam.w, cam.h);
    ctx.save(); ctx.setTransform(...GMx); ctx.fillStyle = '#5c7848'; ctx.fillRect(-H, -H, 2 * H, 2 * H); ctx.restore();
    let pending = false;
    if (cam.zoom >= 0.5) {
      const tx0 = Math.floor(v[0] / T), tx1 = Math.floor(v[2] / T), ty0 = Math.floor(v[1] / T), ty1 = Math.floor(v[3] / T);
      const put = (c, tx, ty) => {
        const x = Math.round(o[0] + tx * T * s), y = Math.round(o[1] + ty * T * s);
        ctx.drawImage(c, x, y, Math.round(o[0] + (tx + 1) * T * s) - x, Math.round(o[1] + (ty + 1) * T * s) - y);
      };
      ctx.imageSmoothingEnabled = false;
      const b1 = { n: 12 }; ctx.globalAlpha = this.mapAlpha;
      if (this.mapAlpha > 0) for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) { const c = this.tiles.ground(tx, ty, b1); if (c === undefined) pending = true; else put(c, tx, ty); }
      ctx.globalAlpha = 1;
      const b3 = { n: 10 };
      for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) { const c = this.tiles.roads(tx, ty, b3); if (c === undefined) pending = true; else if (c) put(c, tx, ty); }
      this.drawGrid();
      const b2 = { n: 16, spr: { n: 3 } };
      for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) { const c = this.tiles.objects(tx, ty, b2); if (c === undefined) pending = true; else if (c) put(c, tx, ty); }
    } else {
      // Übersicht: Boden aus verkleinerten Kacheln (schnell, auch mit vielen Gebäuden)
      const f = Math.max(1 / 32, Math.pow(2, Math.ceil(Math.log2(cam.zoom)))), S = T / f;
      const tx0 = Math.floor(v[0] / S), tx1 = Math.floor(v[2] / S), ty0 = Math.floor(v[1] / S), ty1 = Math.floor(v[3] / S), b0 = { n: 10 };
      ctx.imageSmoothingEnabled = true; ctx.globalAlpha = this.mapAlpha;
      if (this.mapAlpha > 0) for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
        const c = this.tiles.ground(tx, ty, b0, f); if (c === undefined) { pending = true; continue; }
        const x = Math.round(o[0] + tx * S * s), y = Math.round(o[1] + ty * S * s);
        ctx.drawImage(c, x, y, Math.round(o[0] + (tx + 1) * S * s) - x, Math.round(o[1] + (ty + 1) * S * s) - y);
      }
      ctx.globalAlpha = 1;
      this.roads.drawVector(ctx, GMx, cam.visibleGround(), 1 / (PPM * s * 0.75));
      this.drawBlocksFlat();
      const bb = cam.visibleGround(), list = this.world.query(bb[0], bb[1], bb[2], bb[3]);
      const r = Math.max(1, Math.round(2 * cam.dpr));
      for (const ob of list.length < 150000 ? list : []) {
        const p = proj(ob.x, ob.y, 0); ctx.fillStyle = ASSETS[ob.a].dot;
        ctx.fillRect(Math.round(o[0] + p[0] * s) - r, Math.round(o[1] + p[1] * s) - r, r * 2, r * 2);
      }
    }
    this.drawOsmState();
    // Kartenrand
    ctx.save(); ctx.setTransform(...GMx); ctx.strokeStyle = '#e0483a'; ctx.lineWidth = 3 / (PPM * s * 0.75); ctx.strokeRect(-H, -H, 2 * H, 2 * H); ctx.restore();
    this.tools.overlay(ctx);
    if (pending) this._dirty = true;
  }
  // Übersicht: Häuser von oben als Dachflächen
  drawBlocksFlat() {
    const { ctx, cam } = this; if (!this.blocks.size) return;
    const pars = this.blocks.parcels(cam.visibleGround()); if (!pars.length) return;
    ctx.save(); ctx.setTransform(...cam.groundMatrix()); ctx.lineWidth = 1 / (PPM * cam.scale * 0.75); ctx.strokeStyle = 'rgba(20,20,24,.6)';
    for (const p of pars) { ctx.fillStyle = `rgb(${p.roof.map(Math.round).join(',')})`; ctx.beginPath(); p.q.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    ctx.restore();
  }
  drawGrid() {
    const { ctx, cam, grid } = this;
    if (!grid.show || cam.zoom < 0.5) return;
    const st = Math.max(grid.step, cam.zoom >= 2 ? 1 : cam.zoom >= 1 ? 2 : 5), a = grid.angle * Math.PI / 12, c = Math.cos(a), sn = Math.sin(a);
    const bb = cam.visibleGround(); let u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9;
    for (const [x, y] of [[bb[0], bb[1]], [bb[2], bb[1]], [bb[0], bb[3]], [bb[2], bb[3]]]) {
      const u = x * c + y * sn, v = -x * sn + y * c; u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v);
    }
    u0 = Math.floor(u0 / st) * st; v0 = Math.floor(v0 / st) * st;
    if ((u1 - u0) / st + (v1 - v0) / st > 1400) return;
    const M = cam.groundMatrix();
    ctx.save(); ctx.setTransform(M[0] * c + M[2] * sn, M[1] * c + M[3] * sn, -M[0] * sn + M[2] * c, -M[1] * sn + M[3] * c, M[4], M[5]);
    const lw = 1 / (PPM * cam.scale * 0.75);
    for (const major of [false, true]) {
      ctx.beginPath();
      for (let u = u0; u <= u1; u += st) if ((Math.round(u / st) % 5 === 0) === major) { ctx.moveTo(u, v0); ctx.lineTo(u, v1); }
      for (let v = v0; v <= v1; v += st) if ((Math.round(v / st) % 5 === 0) === major) { ctx.moveTo(u0, v); ctx.lineTo(u1, v); }
      ctx.strokeStyle = major ? 'rgba(20,24,30,.32)' : 'rgba(20,24,30,.14)'; ctx.lineWidth = lw; ctx.stroke();
    }
    ctx.restore();
  }
  // In der Übersicht: Ladezustand der 1-km-Bereiche zeigen
  drawOsmState() {
    const { ctx, cam } = this, M = cam.groundMatrix(), K = CFG.OSM_TILE_M;
    ctx.save(); ctx.setTransform(...M);
    for (const [k, st] of this.osm.state) {
      if (k === 'base' || st === 'done' || st === 'check') continue;
      const [i, j] = k.split('_').map(Number);
      ctx.fillStyle = st === 'error' ? 'rgba(224,72,58,.22)' : 'rgba(255,211,74,.16)';
      ctx.fillRect(-H + i * K, -H + j * K, K, K);
    }
    ctx.restore();
  }
}

// Zugang vorerst nur mit Code (wie der Rap-Streets-Editor); gespeichert wird nur der Hash
const HASH = 'ed3a3254';
function fnv(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16); }
function boot() { document.getElementById('lock').remove(); const app = new App(); window.AF = app; app.start(); }
let unlocked = false; try { unlocked = sessionStorage.getItem('anarchyfrankfurt.dev') === '1'; } catch (e) { /* privat */ }
if (unlocked) boot();
else {
  const f = document.getElementById('lockForm'), inp = document.getElementById('lockCode'), err = document.getElementById('lockErr');
  inp.focus();
  inp.oninput = () => { err.hidden = true; };
  f.onsubmit = e => {
    e.preventDefault();
    if (fnv('anarchyfrankfurt:' + inp.value) === HASH) { try { sessionStorage.setItem('anarchyfrankfurt.dev', '1'); } catch (er) { /* egal */ } boot(); }
    else { err.hidden = false; inp.value = ''; inp.focus(); }
  };
}
