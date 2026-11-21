// Spieltest: Anfangsfigur mit 8 Blickrichtungen (laufen, sprinten, springen), Kollision mit Häusern,
// Verdeckung durch Häuser/Bäume/Gras, Türen mit „E Betreten“ und Innenraum-Konzept (Zeit hält draußen an).
import { proj, groundDepth, groundBBox, SN, CS, PPM, inWorld } from './camera.js';
import { Mesh } from './geometry.js';
import { renderSprite } from './renderer.js';
import { ASSETS } from './assets.js';
import { vegSprite } from './veg.js';

const WALK = 2.8, SPRINT = 5.6, JUMP_V = 4.2, GRAV = 14, R = 0.3;

// ---------- Figur als Modell in verschiedenen Posen (Blickrichtung lokal +y) ----------
function hero(pose) {
  const m = new Mesh(), id = m.part(), { leg = 0, arm = 0, tuck = 0 } = pose;
  const L = (x0, x1, d, lift) => {
    const z0 = 0.1 + lift;
    m.box(x0, -0.1 + d, lift, x1, 0.12 + d, z0, 'shoe', id);
    m.box(x0, -0.09 + d * 0.7, z0, x1, 0.09 + d * 0.7, 0.86, 'jeans', id);
  };
  L(-0.2, -0.03, leg, tuck + Math.max(0, leg) * 0.12);
  L(0.03, 0.2, -leg, tuck + Math.max(0, -leg) * 0.12);
  m.box(-0.25, -0.13, 0.86, 0.25, 0.14, 1.46, 'jacket', id);                 // Oberkörper
  m.box(-0.24, -0.2, 1.0, 0.24, -0.13, 1.4, 'gun', id);                    // Rucksack
  m.box(-0.07, -0.06, 1.46, 0.07, 0.06, 1.52, 'skin', id);
  m.box(-0.13, -0.13, 1.52, 0.13, 0.13, 1.8, 'skin', id);
  m.box(-0.14, -0.14, 1.72, 0.14, 0.14, 1.86, 'hair', id);                 // Mütze
  m.box(-0.37, -0.07 - arm * 0.6, 0.92, -0.25, 0.07 - arm * 0.6, 1.42, 'jacket', id);
  m.box(0.25, -0.07 + arm * 0.6, 0.92, 0.37, 0.07 + arm * 0.6, 1.42, 'jacket', id);
  m.box(-0.36, -0.06 - arm * 0.7, 0.86, -0.26, 0.06 - arm * 0.7, 0.94, 'skin', id);
  m.box(0.26, -0.06 + arm * 0.7, 0.86, 0.36, 0.06 + arm * 0.7, 0.94, 'skin', id);
  return m;
}
const POSES = {
  idle: [{}],
  walk: [{ leg: 0.16, arm: 0.12 }, {}, { leg: -0.16, arm: -0.12 }, {}],
  run: [{ leg: 0.28, arm: 0.22 }, { leg: 0.08, arm: 0.05 }, { leg: -0.28, arm: -0.22 }, { leg: -0.08, arm: -0.05 }],
  jump: [{ leg: 0.12, arm: 0.25, tuck: 0.12 }]
};
const SPR = new Map();
function heroSprite(anim, f, k) {
  const key = anim + f + '|' + k; let s = SPR.get(key);
  if (!s) { s = renderSprite(hero(POSES[anim][f]), k * Math.PI / 4); SPR.set(key, s); }
  return s;
}
// Blickrichtung (0..7) aus Bewegungsrichtung: lokal +y zeigt nach (-sin a, cos a)
const dirOf = (dx, dy) => ((Math.round(Math.atan2(-dx, dy) / (Math.PI / 4)) % 8) + 8) % 8;

// ---------- Innenraum-Konzept ----------
// Jedes Haus bekommt beim Betreten eine eigene kleine Szene (wie ein Dungeon), draußen steht die Zeit still.
export function interiorOf(door) {
  const F = door.F, w = Math.max(5, Math.min(30, door.w || 10)), d = Math.max(6, Math.min(30, door.d || 10));
  const floors = [];
  for (let i = 0; i < F; i++) floors.push({ name: i === 0 ? 'Erdgeschoss' : i + '. Obergeschoss', flats: w >= 10 ? 2 : 1 });
  floors.push({ name: 'Dachgeschoss', flats: 1 });
  return { w, d, floors, stairs: { x: w / 2, y: d - 2.5, w: 2.6, h: 4.2 }, style: door.style };
}

export class Play {
  constructor(app) {
    this.app = app; this.active = false; this.p = null; this.inside = null; this.keys = new Set(); this.near = null; this.msg = null;
    this.patch = document.createElement('canvas');
  }
  start() {
    const cam = this.app.cam;
    let [x, y] = [cam.x, cam.y];
    for (let r = 0, a = 0; this.blocked(x, y) && r < 60; a += 0.7, r += 0.15) { x = cam.x + Math.cos(a) * r; y = cam.y + Math.sin(a) * r; }
    this.p = { x, y, z: 0, vz: 0, k: 0, anim: 'idle', t: 0 };
    this.active = true; this.inside = null; this.keys.clear(); this.prevZoom = cam.zoom; cam.zoom = Math.max(cam.zoom, 3);
    this.app.tools.setMode('select'); document.body.classList.add('playing'); this.app.ui.sync(); this.app.dirty();
  }
  stop() { this.active = false; this.inside = null; this.keys.clear(); this.app.cam.zoom = this.prevZoom || this.app.cam.zoom; document.body.classList.remove('playing'); this.hideInside(); this.app.ui.sync(); this.app.dirty(); }
  key(e, down) {
    const k = e.key.toLowerCase();
    if (!down) { this.keys.delete(k); return true; }
    if (this.inside) { if (k === 'e' || k === 'escape') this.leave(); return true; }
    if (k === 'escape' || k === 'p') { this.stop(); return true; }
    if (k === 'e') { if (this.near) this.enter(this.near); return true; }
    this.keys.add(k); return true;
  }
  // ---------- Kollision ----------
  blocked(x, y) {
    if (!inWorld(x, y)) return true;
    const A = this.app, bb = [x - 2, y - 2, x + 2, y + 2];
    for (const par of A.blocks.parcels(bb)) {
      const q = par.q;
      if (par.gate && par.gate.type === 'arch') { const s = (x - q[0][0]) * par.u[0] + (y - q[0][1]) * par.u[1]; if (Math.abs(s - par.gate.c) < par.gate.w / 2 - 0.35) continue; }
      if (polyHit(q, x, y, R)) return true;
    }
    for (const o of A.world.near(x, y, 8)) {
      const d = ASSETS[o.a]; if (!d || !d.col) continue;
      const a = -o.r * Math.PI / 12, c = Math.cos(a), s = Math.sin(a), lx = (x - o.x) * c - (y - o.y) * s, ly = (x - o.x) * s + (y - o.y) * c;
      if (Math.abs(lx) < d.col[0] + R && Math.abs(ly) < d.col[1] + R) return true;
    }
    return false;
  }
  // ---------- Türen ----------
  doors(x, y, r) {
    const out = [], A = this.app;
    for (const par of A.blocks.parcels([x - r, y - r, x + r, y + r])) if (par.door) out.push(par.door);
    for (const o of A.world.near(x, y, 12)) {
      const d = ASSETS[o.a]; if (!d || !d.door) continue;
      const a = o.r * Math.PI / 12, c = Math.cos(a), s = Math.sin(a);
      out.push({ x: o.x + d.door[0] * c - d.door[1] * s, y: o.y + d.door[0] * s + d.door[1] * c, F: d.floors || 1, style: 'haus', w: 10, d: 8 });
    }
    return out;
  }
  enter(door) { this.inside = { door, info: interiorOf(door), from: { x: this.p.x, y: this.p.y } }; this.keys.clear(); this.showInside(); }
  leave() { this.inside = null; this.hideInside(); this.app.dirty(); }
  showInside() {
    const I = this.inside.info, box = document.getElementById('inside');
    box.querySelector('.ttl').textContent = (I.style === 'fachwerk' ? 'Fachwerkhaus' : I.style === 'haus' ? 'Siedlungshaus' : 'Altbau') + ` · ${I.floors.length - 1} Etage${I.floors.length > 2 ? 'n' : ''} + Dach`;
    box.querySelector('.fl').innerHTML = I.floors.slice().reverse().map(f => `<li>${f.name}: Treppenhaus, ${f.flats} Wohnung${f.flats > 1 ? 'en' : ''}</li>`).join('');
    const cv = box.querySelector('canvas'), c = cv.getContext('2d'), k = Math.min(200 / I.w, 140 / I.d);
    cv.width = Math.round(I.w * k) + 20; cv.height = Math.round(I.d * k) + 20; c.fillStyle = '#2a2e36'; c.fillRect(0, 0, cv.width, cv.height);
    c.strokeStyle = '#e9e6de'; c.lineWidth = 3; c.strokeRect(10, 10, I.w * k, I.d * k);
    c.fillStyle = '#ffd34a'; c.fillRect(10 + (I.stairs.x - I.stairs.w / 2) * k, 10 + (I.stairs.y - I.stairs.h / 2) * k, I.stairs.w * k, I.stairs.h * k);
    c.lineWidth = 2; c.beginPath(); c.moveTo(10 + I.w / 2 * k, 10); c.lineTo(10 + I.w / 2 * k, 10 + (I.stairs.y - I.stairs.h / 2) * k); if (I.floors[0].flats > 1) c.stroke();
    c.fillStyle = '#e0483a'; c.fillRect(10 + I.w / 2 * k - 6, 10 + I.d * k - 3, 12, 6);
    box.hidden = false;
  }
  hideInside() { const box = document.getElementById('inside'); if (box) box.hidden = true; }

  // ---------- Bewegung ----------
  update(dt) {
    if (!this.active || this.inside) return;          // drinnen: Außenwelt steht still
    const P = this.p, K = this.keys;
    let mx = 0, my = 0;
    if (K.has('w') || K.has('arrowup')) { mx -= 1; my -= 1; }
    if (K.has('s') || K.has('arrowdown')) { mx += 1; my += 1; }
    if (K.has('a') || K.has('arrowleft')) { mx -= 1; my += 1; }
    if (K.has('d') || K.has('arrowright')) { mx += 1; my -= 1; }
    const l = Math.hypot(mx, my), sprint = K.has('shift');
    if (l) {
      const sp = (sprint ? SPRINT : WALK) * dt, dx = mx / l * sp, dy = my / l * sp;
      P.k = dirOf(dx, dy);
      if (!this.blocked(P.x + dx, P.y + dy)) { P.x += dx; P.y += dy; }
      else if (!this.blocked(P.x + dx, P.y)) P.x += dx;
      else if (!this.blocked(P.x, P.y + dy)) P.y += dy;
      P.t += dt;
    }
    if (K.has(' ') && P.z === 0) P.vz = JUMP_V;
    if (P.z > 0 || P.vz > 0) { P.vz -= GRAV * dt; P.z = Math.max(0, P.z + P.vz * dt); if (P.z === 0) P.vz = 0; }
    P.anim = P.z > 0 ? 'jump' : l ? (sprint ? 'run' : 'walk') : 'idle';
    let best = null, bd = 1.4;
    for (const d of this.doors(P.x, P.y, 25)) { const dd = Math.hypot(d.x - P.x, d.y - P.y); if (dd < bd) { bd = dd; best = d; } }
    this.near = best;
    this.app.cam.x = P.x; this.app.cam.y = P.y;
  }
  // ---------- Zeichnen mit Verdeckung ----------
  draw(ctx) {
    if (!this.active) return;
    const A = this.app, cam = A.cam, P = this.p, sc = cam.scale;
    const fr = P.anim === 'idle' || P.anim === 'jump' ? 0 : Math.floor(P.t * (P.anim === 'run' ? 11 : 7)) % 4;
    const s = heroSprite(P.anim, fr, P.k), pr = proj(P.x, P.y, P.z), ax = Math.round(pr[0]) - s.ox, ay = Math.round(pr[1]) - s.oy;
    // Schatten am Boden
    ctx.save(); ctx.setTransform(...cam.groundMatrix()); ctx.fillStyle = 'rgba(16,22,46,.35)'; ctx.beginPath(); ctx.ellipse(P.x + 0.05, P.y - 0.05, 0.32 - P.z * 0.1, 0.32 - P.z * 0.1, 0, 0, 6.2832); ctx.fill(); ctx.restore();
    // Verdecker sammeln (Häuser, Objekte, hohe Pflanzen), die über der Figur liegen
    const occ = [], gb = groundBBox(ax - 40, ay - 10, ax + s.w + 40, ay + s.h + 300);
    const add = (sp, x, y) => { if (!sp) return; const p = proj(x, y, 0), sx = Math.round(p[0]) - sp.ox, sy = Math.round(p[1]) - sp.oy; if (sx > ax + s.w || sy > ay + s.h || sx + sp.w < ax || sy + sp.h < ay) return; occ.push([sp, sx, sy, groundDepth(x, y)]); };
    for (const par of A.blocks.parcels(gb)) add(A.blocks.sprite(par), par.cx, par.cy);
    for (const o of A.world.query(gb[0], gb[1], gb[2], gb[3])) add(A.sprites.get(o.a, o.r, o.v), o.x, o.y);
    for (const q of A.veg.query(P.x - 2, P.y - 2, P.x + 2, P.y + 2)) add(vegSprite(q[0], q[3]), q[1], q[2]);
    const W = s.w, H = s.h, cv = this.patch; cv.width = W; cv.height = H;
    const c2 = cv.getContext('2d'), img = c2.createImageData(W, H), D = img.data, base = groundDepth(P.x, P.y) + P.z * SN;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; if (!s.rgba[i * 4 + 3]) continue;
      const dp = s.depth[i] + base; let best = null, bd = dp;
      for (const [sp, sx, sy, gd] of occ) {
        const lx = ax + x - sx, ly = ay + y - sy; if (lx < 0 || ly < 0 || lx >= sp.w || ly >= sp.h) continue;
        const j = ly * sp.w + lx; if (!sp.rgba[j * 4 + 3]) continue;
        const d = sp.depth[j] + gd; if (d > bd) { bd = d; best = [sp.rgba, j]; }
      }
      if (best) { // verdeckt: Umriss der Figur durchscheinen lassen
        const o = best[0], k = best[1] * 4; D[i * 4] = o[k] * 0.62 + 255 * 0.38; D[i * 4 + 1] = o[k + 1] * 0.62 + 220 * 0.38; D[i * 4 + 2] = o[k + 2] * 0.62 + 140 * 0.38;
      } else { D[i * 4] = s.rgba[i * 4]; D[i * 4 + 1] = s.rgba[i * 4 + 1]; D[i * 4 + 2] = s.rgba[i * 4 + 2]; }
      D[i * 4 + 3] = 255;
    }
    c2.putImageData(img, 0, 0);
    const dv = cam.toDevice(ax, ay);
    ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(cv, Math.round(dv[0]), Math.round(dv[1]), W * sc, H * sc); ctx.restore();
    // Tür-Hinweis
    if (this.near && !this.inside) {
      const hp = cam.toDevice(pr[0], pr[1] - 2.3 * CS * PPM), d = cam.dpr, txt = 'Betreten';
      ctx.save(); ctx.font = `${13 * d}px ui-monospace, monospace`; const tw = ctx.measureText(txt).width, bw = tw + 38 * d, bh = 24 * d, x = hp[0] - bw / 2, y = hp[1] - bh;
      ctx.fillStyle = 'rgba(16,18,22,.88)'; ctx.fillRect(x, y, bw, bh); ctx.strokeStyle = '#ffd34a'; ctx.lineWidth = d; ctx.strokeRect(x + 0.5, y + 0.5, bw - 1, bh - 1);
      ctx.fillStyle = '#ffd34a'; ctx.fillRect(x + 5 * d, y + 4 * d, 16 * d, 16 * d); ctx.fillStyle = '#15171c'; ctx.fillText('E', x + 8.5 * d, y + 17 * d);
      ctx.fillStyle = '#e9e6de'; ctx.fillText(txt, x + 27 * d, y + 17 * d); ctx.restore();
    }
  }
}
function polyHit(q, x, y, r) {
  let ins = false;
  for (let i = 0, j = q.length - 1; i < q.length; j = i++) if ((q[i][1] > y) !== (q[j][1] > y) && x < (q[j][0] - q[i][0]) * (y - q[i][1]) / (q[j][1] - q[i][1]) + q[i][0]) ins = !ins;
  if (ins) return true;
  for (let i = 0; i < q.length; i++) {
    const a = q[i], b = q[(i + 1) % q.length], dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / l));
    if (Math.hypot(x - a[0] - dx * t, y - a[1] - dy * t) < r) return true;
  }
  return false;
}
