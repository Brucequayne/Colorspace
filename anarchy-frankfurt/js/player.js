// Spieltest: Figur mit Pistole (zielt mit der Maus, 16 Blickrichtungen), zwei Laufmodi, Kollision,
// Durchsicht um die Figur (Häuser davor werden gerastert ausgeblendet), Sichtfeld mit Fog of War
// (Strahlen bis 50 m, tote Winkel hinter Häusern und hohen Objekten), Türen mit „E Betreten“ (Zeit hält draußen an).
import { proj, groundDepth, groundBBox, unprojGround, SN, CS, PPM, GM, inWorld } from './camera.js';
import { Mesh } from './geometry.js';
import { renderSprite, SHADOW_RGBA } from './renderer.js';
import { ASSETS } from './assets.js';
import { vegSprite } from './veg.js';

const WALK = 2.8, SPRINT = 5.6, JUMP_V = 4.2, GRAV = 14, R = 0.3;
const SIGHT = 50, RAYS = 720, EYE_BLOCK = 1.4;        // Sichtweite (m), Strahlen, ab dieser Höhe blockiert ein Objekt die Sicht
const XR = 86;                                         // Radius der Durchsicht um die Figur (native px ≈ 7 m)
const GUN_Z = 1.38, BULLET_V = 380, FIRE_GAP = 0.14, RANGE = 120;
const S2 = Math.SQRT1_2;

// ---------- Figur als Modell (Blickrichtung lokal +y), rechte Hand hält die Pistole nach vorn ----------
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
  m.box(-0.37, -0.07 - arm * 0.6, 0.92, -0.25, 0.07 - arm * 0.6, 1.42, 'jacket', id);   // linker Arm schwingt
  m.box(-0.36, -0.06 - arm * 0.7, 0.86, -0.26, 0.06 - arm * 0.7, 0.94, 'skin', id);
  const g = m.part();                                                         // rechter Arm gestreckt + Pistole
  m.box(0.22, -0.02, 1.27, 0.34, 0.46, 1.39, 'jacket', g);
  m.box(0.23, 0.44, 1.27, 0.33, 0.56, 1.37, 'skin', g);
  m.box(0.25, 0.5, 1.35, 0.31, 0.8, 1.43, 'gun', g);
  m.box(0.25, 0.5, 1.24, 0.31, 0.58, 1.36, 'gun', g);
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
  if (!s) { s = renderSprite(hero(POSES[anim][f]), k * Math.PI / 8); SPR.set(key, s); }
  return s;
}
// Blickrichtung (0..15): lokal +y zeigt nach (-sin a, cos a)
const dirOf = (dx, dy) => ((Math.round(Math.atan2(-dx, dy) / (Math.PI / 8)) % 16) + 16) % 16;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

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
    this.app = app; this.active = false; this.p = null; this.inside = null; this.keys = new Set(); this.near = null;
    this.fog = true; try { this.fog = localStorage.getItem('anarchyfrankfurt.fog') !== '0'; } catch (e) { /* egal */ }
    this.aimRel = false; this.mouse = null; this.shots = []; this.sparks = []; this.cool = 0; this.flash = 0;
    this.xr = document.createElement('canvas'); this.me = document.createElement('canvas'); this.oc = document.createElement('canvas');
    this.F = document.createElement('canvas'); this.G = document.createElement('canvas'); this.T = document.createElement('canvas');
  }
  setFog(on) { this.fog = on; try { localStorage.setItem('anarchyfrankfurt.fog', on ? '1' : '0'); } catch (e) { /* egal */ } this.hint(); this.app.ui.sync(); this.app.dirty(); }
  start() {
    const cam = this.app.cam;
    let [x, y] = [cam.x, cam.y];
    for (let r = 0, a = 0; this.blocked(x, y) && r < 60; a += 0.7, r += 0.15) { x = cam.x + Math.cos(a) * r; y = cam.y + Math.sin(a) * r; }
    this.p = { x, y, z: 0, vz: 0, k: 0, ang: 0, anim: 'idle', t: 0 };
    this.active = true; this.inside = null; this.keys.clear(); this.prevZoom = cam.zoom; cam.zoom = Math.max(cam.zoom, 3);
    this.shots = []; this.sparks = []; this.vis = null; this.chunks = new Map(); this.seenP = new Set(); this.seenO = new Set();
    this.app.tools.setMode('select'); document.body.classList.add('playing'); this.hint(); this.app.ui.sync(); this.app.dirty();
  }
  stop() { this.active = false; this.inside = null; this.keys.clear(); this.app.cam.zoom = this.prevZoom || this.app.cam.zoom; document.body.classList.remove('playing'); this.hideInside(); this.app.ui.sync(); this.app.dirty(); }
  hint() {
    const h = document.getElementById('playHint'); if (!h) return;
    h.innerHTML = `Spieltest · WASD laufen · Shift sprinten · Leertaste springen · Maus zielen · Klick schießen (Pistole ∞) · `
      + `<b>Alt</b> Laufmodus: <b>${this.aimRel ? 'Blickrichtung' : 'Bildschirm'}</b> · <b>F</b> Sicht: <b>${this.fog ? 'an' : 'aus'}</b> · E Tür · Esc beenden`;
  }
  key(e, down) {
    const k = e.key.toLowerCase();
    if (!down) { this.keys.delete(k); return true; }
    if (this.inside) { if (k === 'e' || k === 'escape') this.leave(); return true; }
    if (k === 'escape' || k === 'p') { this.stop(); return true; }
    if (k === 'e') { if (this.near) this.enter(this.near); return true; }
    if (k === 'alt') { if (!e.repeat) { this.aimRel = !this.aimRel; this.hint(); } return true; }
    if (k === 'f') { if (!e.repeat) this.setFog(!this.fog); return true; }
    this.keys.add(k); return true;
  }
  mouseDown(p, e) { this.mouse = p; if (e.button === 0 && !this.inside) this.fire(); }
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
      const a = -o.r * Math.PI / 36, c = Math.cos(a), s = Math.sin(a), lx = (x - o.x) * c - (y - o.y) * s, ly = (x - o.x) * s + (y - o.y) * c;
      if (Math.abs(lx) < d.col[0] + R && Math.abs(ly) < d.col[1] + R) return true;
    }
    return false;
  }
  // ---------- Türen ----------
  // nur im Editor markierte Türen sind begehbar
  doors(x, y, r) { return this.app.doors.near(x, y, r); }
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

  // ---------- Zielen ----------
  aimPoint() {
    const P = this.p; if (!this.mouse) return null;
    const n = this.app.cam.toNative(this.mouse[0], this.mouse[1]);
    return unprojGround(n[0], n[1] + GUN_Z * CS * PPM);      // Maus zeigt auf Brusthöhe, nicht auf den Boden
  }
  // ---------- Bewegung ----------
  update(dt) {
    if (!this.active || this.inside) return;          // drinnen: Außenwelt steht still
    const P = this.p, K = this.keys;
    const ap = this.aimPoint();
    if (ap && Math.hypot(ap[0] - P.x, ap[1] - P.y) > 0.3) P.ang = Math.atan2(ap[1] - P.y, ap[0] - P.x);
    const fx = Math.cos(P.ang), fy = Math.sin(P.ang);
    P.k = dirOf(fx, fy);
    let mx = 0, my = 0;
    const W = K.has('w') || K.has('arrowup'), S = K.has('s') || K.has('arrowdown'), A = K.has('a') || K.has('arrowleft'), D = K.has('d') || K.has('arrowright');
    if (this.aimRel) {                                // Laufmodus Blickrichtung: W = zum Ziel, S zurück, A/D seitlich
      if (W) { mx += fx; my += fy; } if (S) { mx -= fx; my -= fy; }
      if (A) { mx += fy; my -= fx; } if (D) { mx -= fy; my += fx; }
    } else {                                          // Laufmodus Bildschirm: W = nach oben
      if (W) { mx -= 1; my -= 1; } if (S) { mx += 1; my += 1; }
      if (A) { mx -= 1; my += 1; } if (D) { mx += 1; my -= 1; }
    }
    const l = Math.hypot(mx, my), sprint = K.has('shift');
    if (l > 1e-6) {
      const back = (mx * fx + my * fy) / l < -0.3 ? 0.72 : 1;   // rückwärts etwas langsamer
      const sp = (sprint ? SPRINT : WALK) * back * dt, dx = mx / l * sp, dy = my / l * sp;
      if (!this.blocked(P.x + dx, P.y + dy)) { P.x += dx; P.y += dy; }
      else if (!this.blocked(P.x + dx, P.y)) P.x += dx;
      else if (!this.blocked(P.x, P.y + dy)) P.y += dy;
      P.t += dt * back;
    }
    if (K.has(' ') && P.z === 0) P.vz = JUMP_V;
    if (P.z > 0 || P.vz > 0) { P.vz -= GRAV * dt; P.z = Math.max(0, P.z + P.vz * dt); if (P.z === 0) P.vz = 0; }
    P.anim = P.z > 0 ? 'jump' : l > 1e-6 ? (sprint ? 'run' : 'walk') : 'idle';
    let best = null, bd = 1.4;
    for (const d of this.doors(P.x, P.y, 25)) { const dd = Math.hypot(d.x - P.x, d.y - P.y); if (dd < bd) { bd = dd; best = d; } }
    this.near = best;
    // Schüsse und Funken
    this.cool = Math.max(0, this.cool - dt); this.flash = Math.max(0, this.flash - dt);
    for (const b of this.shots) b.t += dt;
    this.shots = this.shots.filter(b => b.t * BULLET_V < b.len + 4);
    for (const s of this.sparks) { s.t += dt; s.x += s.vx * dt; s.y += s.vy * dt; s.z = Math.max(0, s.z + s.vz * dt); s.vz -= 9 * dt; }
    this.sparks = this.sparks.filter(s => s.t < 0.35);
    this.app.cam.x = P.x; this.app.cam.y = P.y;
    if (!this.vis || Math.hypot(this.vis.x - P.x, this.vis.y - P.y) > 0.15) this.vision();
  }

  // ---------- Sichtblocker: Hauskanten (Tordurchfahrten bleiben offen) und hohe Objekte ----------
  segments(x, y, r) {
    const segs = [], A = this.app, bb = [x - r, y - r, x + r, y + r];
    const add = (a, b, ref, x0, x1) => { if (x1 - x0 < 0.05) return; const L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L; segs.push([a[0] + ux * x0, a[1] + uy * x0, a[0] + ux * x1, a[1] + uy * x1, ref]); };
    for (const par of A.blocks.parcels(bb)) {
      const q = par.q, ref = 'p' + par.key, arch = par.gate && par.gate.type === 'arch' ? par.gate : null;
      for (let i = 0; i < 4; i++) {
        const a = q[i], b = q[(i + 1) % 4], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (arch && (i === 0 || i === 2)) {            // Front und Hofseite mit Lücke für die Durchfahrt
          const c = i === 0 ? arch.c : L - arch.c, h = arch.w / 2 - 0.25;
          add(a, b, ref, 0, c - h); add(a, b, ref, c + h, L);
        } else add(a, b, ref, 0, L);
      }
    }
    for (const o of A.world.query(bb[0], bb[1], bb[2], bb[3])) {
      const d = ASSETS[o.a]; if (!d || !d.col || (d.h || 0) < EYE_BLOCK) continue;
      const a = o.r * Math.PI / 36, c = Math.cos(a), s = Math.sin(a), [hx, hy] = d.col;
      const pts = [[-hx, -hy], [hx, -hy], [hx, hy], [-hx, hy]].map(([u, v]) => [o.x + u * c - v * s, o.y + u * s + v * c]);
      for (let i = 0; i < 4; i++) { const p0 = pts[i], p1 = pts[(i + 1) % 4]; segs.push([p0[0], p0[1], p1[0], p1[1], 'o' + o.id]); }
    }
    return segs;
  }
  // Strahl gegen Kanten: Abstand bis zum ersten Treffer
  cast(segs, x, y, dx, dy, max) {
    let t = max, hit = null;
    for (const s of segs) {
      const ex = s[2] - s[0], ey = s[3] - s[1], den = dx * ey - dy * ex; if (Math.abs(den) < 1e-12) continue;
      const wx = s[0] - x, wy = s[1] - y, tt = (wx * ey - wy * ex) / den, u = (wx * dy - wy * dx) / den;
      if (tt > 1e-4 && tt < t && u >= 0 && u <= 1) { t = tt; hit = s[4]; }
    }
    return [t, hit];
  }
  // ---------- Sichtfeld: Polygon aus Strahlen, entdeckte Fläche wächst mit ----------
  vision() {
    const P = this.p, segs = this.segments(P.x, P.y, SIGHT + 2), poly = new Float32Array(RAYS * 2), hits = new Set();
    for (let i = 0; i < RAYS; i++) {
      const a = i / RAYS * Math.PI * 2, dx = Math.cos(a), dy = Math.sin(a), [t, h] = this.cast(segs, P.x, P.y, dx, dy, SIGHT);
      poly[i * 2] = P.x + dx * t; poly[i * 2 + 1] = P.y + dy * t; if (h) hits.add(h);
    }
    // Objekte im Sichtfeld (Mittelpunkt sichtbar) zählen auch als gesehen
    const bb = [P.x - SIGHT, P.y - SIGHT, P.x + SIGHT, P.y + SIGHT];
    for (const o of this.app.world.query(bb[0], bb[1], bb[2], bb[3])) if (Math.hypot(o.x - P.x, o.y - P.y) < SIGHT && inPoly(poly, o.x, o.y)) hits.add('o' + o.id);
    this.vis = { x: P.x, y: P.y, poly, hits };
    for (const h of hits) (h[0] === 'p' ? this.seenP : this.seenO).add(h.slice(1));
    // entdeckte Fläche in 32-m-Kacheln (2 px pro Meter)
    const C = 32, K = 2;
    for (let cy = Math.floor(bb[1] / C); cy <= Math.floor(bb[3] / C); cy++) for (let cx = Math.floor(bb[0] / C); cx <= Math.floor(bb[2] / C); cx++) {
      const key = cx + ',' + cy; let ch = this.chunks.get(key);
      if (!ch) { ch = document.createElement('canvas'); ch.width = ch.height = C * K; this.chunks.set(key, ch); }
      const g = ch.getContext('2d'); g.setTransform(K, 0, 0, K, -cx * C * K, -cy * C * K); g.fillStyle = '#fff'; g.beginPath();
      for (let i = 0; i < RAYS; i++) g.lineTo(poly[i * 2], poly[i * 2 + 1]);
      g.closePath(); g.fill();
    }
  }
  // Für spätere NPCs/Zombies: ist dieser Punkt gerade sichtbar?
  sees(x, y) { if (!this.fog) return true; const v = this.vis; return !!v && Math.hypot(x - v.x, y - v.y) < SIGHT && inPoly(v.poly, x, y); }

  // ---------- Schießen ----------
  fire() {
    if (this.cool > 0 || !this.active) return;
    this.cool = FIRE_GAP; this.flash = 0.06;
    const P = this.p, fx = Math.cos(P.ang), fy = Math.sin(P.ang), sx = P.x + fx * 0.7 - fy * 0.28, sy = P.y + fy * 0.7 + fx * 0.28;
    const segs = this.segments(P.x, P.y, RANGE + 2);
    // auch niedrige Objekte stoppen Kugeln
    for (const o of this.app.world.query(P.x - RANGE, P.y - RANGE, P.x + RANGE, P.y + RANGE)) {
      const d = ASSETS[o.a]; if (!d || !d.col || (d.h || 0) >= EYE_BLOCK || (d.h || 0) < 0.6) continue;
      const a = o.r * Math.PI / 36, c = Math.cos(a), s = Math.sin(a), [hx, hy] = d.col;
      const pts = [[-hx, -hy], [hx, -hy], [hx, hy], [-hx, hy]].map(([u, v]) => [o.x + u * c - v * s, o.y + u * s + v * c]);
      for (let i = 0; i < 4; i++) { const p0 = pts[i], p1 = pts[(i + 1) % 4]; segs.push([p0[0], p0[1], p1[0], p1[1], 'o' + o.id]); }
    }
    const sp = (Math.random() - 0.5) * 0.02, dx = Math.cos(P.ang + sp), dy = Math.sin(P.ang + sp), [t, hit] = this.cast(segs, sx, sy, dx, dy, RANGE);
    this.shots.push({ x: sx, y: sy, dx, dy, len: t, t: 0, hit: !!hit });
    if (hit) for (let i = 0; i < 7; i++) {
      const a = Math.atan2(-dy, -dx) + (Math.random() - 0.5) * 2.2, v = 2 + Math.random() * 4;
      this.sparks.push({ x: sx + dx * (t - 0.05), y: sy + dy * (t - 0.05), z: GUN_Z, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: Math.random() * 3, t: -t / BULLET_V });
    }
    this.sound();
  }
  // kurzer Pistolenknall per WebAudio (Rauschen + tiefer Punch)
  sound() {
    try {
      const ac = this.ac || (this.ac = new (window.AudioContext || window.webkitAudioContext)()), t = ac.currentTime;
      const n = ac.createBuffer(1, ac.sampleRate * 0.25, ac.sampleRate), d = n.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
      const src = ac.createBufferSource(); src.buffer = n;
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1800; bp.Q.value = 0.7;
      const g = ac.createGain(); g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      src.connect(bp).connect(g).connect(ac.destination); src.start(t);
      const o = ac.createOscillator(), og = ac.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
      og.gain.setValueAtTime(0.5, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.14); o.connect(og).connect(ac.destination); o.start(t); o.stop(t + 0.15);
    } catch (e) { /* kein Ton */ }
  }

  // ---------- Zeichnen ----------
  draw(ctx) {
    if (!this.active) return;
    const A = this.app, cam = A.cam, P = this.p, sc = cam.scale;
    const fr = P.anim === 'idle' || P.anim === 'jump' ? 0 : Math.floor(P.t * (P.anim === 'run' ? 11 : 7)) % 4;
    const hs = heroSprite(P.anim, fr, P.k);
    this.drawXray(ctx, hs);
    if (this.fog) this.drawFog(ctx);
    // Figur (nur ihre sichtbaren Pixel) über dem Nebel
    const dm = cam.toDevice(this.meX, this.meY);
    ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(this.me, Math.round(dm[0]), Math.round(dm[1]), this.me.width * sc, this.me.height * sc); ctx.restore();
    this.drawShots(ctx);
    // Fadenkreuz
    if (this.mouse && !this.inside) {
      const [mx, my] = this.mouse, d = cam.dpr, r = 7 * d;
      ctx.save(); ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 3 * d;
      const cross = () => { ctx.beginPath(); ctx.moveTo(mx - r * 1.6, my); ctx.lineTo(mx - r * 0.5, my); ctx.moveTo(mx + r * 0.5, my); ctx.lineTo(mx + r * 1.6, my); ctx.moveTo(mx, my - r * 1.6); ctx.lineTo(mx, my - r * 0.5); ctx.moveTo(mx, my + r * 0.5); ctx.lineTo(mx, my + r * 1.6); ctx.stroke(); };
      cross(); ctx.strokeStyle = this.cool > 0.05 ? '#ffd34a' : '#f4f1ea'; ctx.lineWidth = 1.5 * d; cross(); ctx.restore();
    }
    // Tür-Hinweis
    if (this.near && !this.inside) {
      const pr = proj(P.x, P.y, P.z), hp = cam.toDevice(pr[0], pr[1] - 2.3 * CS * PPM), d = cam.dpr, txt = 'Betreten';
      ctx.save(); ctx.font = `${13 * d}px ui-monospace, monospace`; const tw = ctx.measureText(txt).width, bw = tw + 38 * d, bh = 24 * d, x = hp[0] - bw / 2, y = hp[1] - bh;
      ctx.fillStyle = 'rgba(16,18,22,.88)'; ctx.fillRect(x, y, bw, bh); ctx.strokeStyle = '#ffd34a'; ctx.lineWidth = d; ctx.strokeRect(x + 0.5, y + 0.5, bw - 1, bh - 1);
      ctx.fillStyle = '#ffd34a'; ctx.fillRect(x + 5 * d, y + 4 * d, 16 * d, 16 * d); ctx.fillStyle = '#15171c'; ctx.fillText('E', x + 8.5 * d, y + 17 * d);
      ctx.fillStyle = '#e9e6de'; ctx.fillText(txt, x + 27 * d, y + 17 * d); ctx.restore();
    }
  }
  // Durchsicht: im Kreis um die Figur werden Häuser/Objekte, die VOR ihr stehen, gerastert ausgeblendet
  drawXray(ctx, hs) {
    const A = this.app, cam = A.cam, P = this.p, sc = cam.scale, T = 256;
    const pc = proj(P.x, P.y, 0.9), cx = Math.round(pc[0]), cy = Math.round(pc[1]), x0 = cx - XR, y0 = cy - XR, N = XR * 2;
    const cv = this.xr; if (cv.width !== N) { cv.width = cv.height = N; this.me.width = this.me.height = N; this.oc.width = this.oc.height = N; }
    const g = cv.getContext('2d', { willReadFrequently: true }); g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#5c7848'; g.fillRect(0, 0, N, N); g.imageSmoothingEnabled = false;
    // Boden darunter (Stadtkarte, gemalter Boden, Straßen) aus dem Kachel-Cache
    const big = { n: 99 };
    for (let ty = Math.floor(y0 / T); ty <= Math.floor((y0 + N) / T); ty++) for (let tx = Math.floor(x0 / T); tx <= Math.floor((x0 + N) / T); tx++) {
      if (A.mapAlpha > 0) { const c = A.tiles.ground(tx, ty, big); if (c) { g.globalAlpha = A.mapAlpha; g.drawImage(c, tx * T - x0, ty * T - y0); g.globalAlpha = 1; } }
      const p = A.tiles.paint(tx, ty, big); if (p) g.drawImage(p, tx * T - x0, ty * T - y0);
      const r = A.tiles.roads(tx, ty, big); if (r) g.drawImage(r, tx * T - x0, ty * T - y0);
    }
    const bg = g.getImageData(0, 0, N, N), D = bg.data;
    // alle Bilder, die in den Ausschnitt ragen
    const list = [], gb = groundBBox(x0 - 40, y0 - 10, x0 + N + 40, y0 + N + 340);
    const add = (s, x, y, veg) => { if (!s) return; const p = proj(x, y, 0), sx = Math.round(p[0]) - s.ox - x0, sy = Math.round(p[1]) - s.oy - y0; if (sx >= N || sy >= N || sx + s.w <= 0 || sy + s.h <= 0) return; list.push([s, sx, sy, groundDepth(x, y), veg]); };
    for (const par of A.blocks.parcels(gb)) add(A.blocks.sprite(par), par.cx, par.cy);
    for (const o of A.world.query(gb[0], gb[1], gb[2], gb[3])) add(A.sprites.get(o.a, o.r, o.v), o.x, o.y);
    for (const q of A.veg.query(gb[0], gb[1], gb[2], gb[3])) add(vegSprite(q[0], q[3]), q[1], q[2], 1);
    // bebaute Grundfläche im Ausschnitt: dahinter liegt kein freier Boden, dort wird nichts ausgeblendet
    const o = this.oc.getContext('2d', { willReadFrequently: true }); o.setTransform(1, 0, 0, 1, 0, 0); o.clearRect(0, 0, N, N);
    o.setTransform(GM[0], GM[1], GM[2], GM[3], -x0, -y0); o.fillStyle = '#000'; o.beginPath();
    for (const par of A.blocks.parcels(gb)) { const q = par.q; o.moveTo(q[0][0], q[0][1]); for (let k = 1; k < 4; k++) o.lineTo(q[k][0], q[k][1]); o.closePath(); }
    for (const ob of A.world.query(gb[0], gb[1], gb[2], gb[3])) {
      const d = ASSETS[ob.a]; if (!d || !d.col || (d.h || 0) < EYE_BLOCK) continue;
      const a = ob.r * Math.PI / 36, c = Math.cos(a), sn = Math.sin(a), [ex, ey] = d.col;
      [[-ex, -ey], [ex, -ey], [ex, ey], [-ex, ey]].forEach(([u, v], k) => { const X = ob.x + u * c - v * sn, Y = ob.y + u * sn + v * c; k ? o.lineTo(X, Y) : o.moveTo(X, Y); }); o.closePath();
    }
    o.fill(); const OC = o.getImageData(0, 0, N, N).data;
    const pp = proj(P.x, P.y, P.z), hx = Math.round(pp[0]) - hs.ox - x0, hy = Math.round(pp[1]) - hs.oy - y0;
    const aP = (P.x + P.y) * S2, zbB = new Float32Array(N * N).fill(-1e9), zbF = new Float32Array(N * N).fill(-1e9);
    const colB = new Uint8ClampedArray(N * N * 4), colF = new Uint8ClampedArray(N * N * 4), sh = new Uint8Array(N * N), vegB = new Uint8Array(N * N), meB = new Uint8Array(N * N);
    const put = (s, sx, sy, gd, veg, me) => {
      const xa = Math.max(0, sx), xb = Math.min(N, sx + s.w), ya = Math.max(0, sy), yb = Math.min(N, sy + s.h);
      for (let y = ya; y < yb; y++) {
        const r = (y - sy) * s.w - sx, syN = (y + y0) / PPM;
        for (let x = xa; x < xb; x++) {
          const si = r + x, i = y * N + x;
          if (s.sh && s.sh[si] && !me) sh[i] = 1;
          if (!s.rgba[si * 4 + 3]) continue;
          const d = s.depth[si] + gd;
          // Weltpunkt dieses Pixels: liegt er auf dem Boden näher zur Kamera als die Figur und über Kniehöhe -> „davor“
          const a = syN * SN + d * CS, z = d * SN - syN * CS, front = !me && a > aP + 0.25 && z > 0.6 && !OC[i * 4 + 3];
          if (front) { if (d > zbF[i]) { zbF[i] = d; colF.set(s.rgba.subarray(si * 4, si * 4 + 3), i * 4); } }
          else if (d > zbB[i]) { zbB[i] = d; colB.set(s.rgba.subarray(si * 4, si * 4 + 3), i * 4); vegB[i] = veg ? 1 : 0; meB[i] = me ? 1 : 0; }
        }
      }
    };
    for (const [s, sx, sy, gd, veg] of list) put(s, sx, sy, gd, veg, 0);
    put(hs, hx, hy, groundDepth(P.x, P.y) + P.z * SN, 0, 1);
    const me = this.me.getContext('2d'), mi = me.createImageData(N, N), M = mi.data;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = y * N + x, dx = x - XR, dy = y - XR, rr = Math.sqrt(dx * dx + dy * dy) / XR;
      if (rr > 1) { D[i * 4 + 3] = 0; continue; }
      // vorderer Pixel: zur Mitte hin immer weniger (Raster statt Halbtransparenz, passt zum Pixel-Look)
      const keep = 0.22 + 0.78 * smooth(0.5, 1, rr), showF = zbF[i] > zbB[i] && zbF[i] > -1e8 && BAYER[(y & 3) * 4 + (x & 3)] < keep;
      if (showF) { D[i * 4] = colF[i * 4]; D[i * 4 + 1] = colF[i * 4 + 1]; D[i * 4 + 2] = colF[i * 4 + 2]; D[i * 4 + 3] = 255; continue; }
      if (zbB[i] > -1e8) {
        D[i * 4] = colB[i * 4]; D[i * 4 + 1] = colB[i * 4 + 1]; D[i * 4 + 2] = colB[i * 4 + 2]; D[i * 4 + 3] = 255;
        if (sh[i] && vegB[i]) { D[i * 4] *= 0.66; D[i * 4 + 1] *= 0.7; D[i * 4 + 2] *= 0.8; }
        if (meB[i]) { M[i * 4] = colB[i * 4]; M[i * 4 + 1] = colB[i * 4 + 1]; M[i * 4 + 2] = colB[i * 4 + 2]; M[i * 4 + 3] = 255; }
      } else if (sh[i]) {                                   // Schatten auf dem Boden
        const a = SHADOW_RGBA[3] / 255;
        for (let c = 0; c < 3; c++) D[i * 4 + c] = D[i * 4 + c] * (1 - a) + SHADOW_RGBA[c] * a;
      }
    }
    g.putImageData(bg, 0, 0); me.putImageData(mi, 0, 0);
    this.meX = x0; this.meY = y0;
    const dv = cam.toDevice(x0, y0);
    ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(cv, Math.round(dv[0]), Math.round(dv[1]), N * sc, N * sc); ctx.restore();
  }
  // Fog of War: unentdeckt schwarz, entdeckt aber außer Sicht grau (Welt sichtbar, keine NPCs), in Sicht normal
  drawFog(ctx) {
    const A = this.app, cam = A.cam, Q = 0.5, W = Math.ceil(cam.w * Q), H = Math.ceil(cam.h * Q), GMx = cam.groundMatrix().map(q => q * Q), v = this.vis; if (!v) return;  // halbe Auflösung reicht
    const F = this.F, G = this.G; for (const c of [F, G, this.T]) if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
    const f = F.getContext('2d'), g = G.getContext('2d');
    f.setTransform(1, 0, 0, 1, 0, 0); f.globalCompositeOperation = 'source-over'; f.clearRect(0, 0, W, H); f.fillStyle = '#000'; f.fillRect(0, 0, W, H);
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, W, H); g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    // entdeckte Fläche aus dem Schwarz schneiden
    f.globalCompositeOperation = 'destination-out'; f.setTransform(...GMx); f.imageSmoothingEnabled = false;
    for (const [k, ch] of this.chunks) { const [cx, cy] = k.split(',').map(Number); f.drawImage(ch, cx * 32, cy * 32, 32, 32); }
    // aktuelles Sichtfeld aus dem Grau schneiden
    g.globalCompositeOperation = 'destination-out'; g.setTransform(...GMx); g.beginPath();
    for (let i = 0; i < RAYS; i++) g.lineTo(v.poly[i * 2], v.poly[i * 2 + 1]);
    g.closePath(); g.fill();
    // Häuser und Objekte als Ganzes: gesehen = sichtbar/grau, nie gesehen = schwarz (von hinten nach vorn)
    const vn = cam.visibleNative(), gb = groundBBox(vn[0] - 300, vn[1] - 40, vn[2] + 300, vn[3] + 400), items = [];
    for (const par of A.blocks.parcels(gb)) { const s = A.blocks.spr.get(par.key); if (s) items.push([s, par.cx, par.cy, 'p' + par.key, this.seenP.has(par.key)]); }
    for (const o of A.world.query(gb[0], gb[1], gb[2], gb[3])) { const d = ASSETS[o.a]; if (!d || d.veg || (d.h || 0) < 0.5) continue; const s = A.sprites.get(o.a, o.r, o.v); if (s) items.push([s, o.x, o.y, 'o' + o.id, this.seenO.has(String(o.id))]); }
    items.sort((a, b) => groundDepth(a[1], a[2]) - groundDepth(b[1], b[2]));
    f.setTransform(1, 0, 0, 1, 0, 0); g.setTransform(1, 0, 0, 1, 0, 0); f.imageSmoothingEnabled = g.imageSmoothingEnabled = false;
    const sc = cam.scale * Q;
    for (const [s, x, y, ref, seen] of items) {
      const m = maskOf(s), p = proj(x, y, 0), dv = cam.toDevice(Math.round(p[0]) - s.ox, Math.round(p[1]) - s.oy), X = Math.round(dv[0] * Q), Y = Math.round(dv[1] * Q), w = s.w * sc, h = s.h * sc;
      if (X > W || Y > H || X + w < 0 || Y + h < 0) continue;
      const now = v.hits.has(ref);
      f.globalCompositeOperation = seen || now ? 'destination-out' : 'source-over'; f.drawImage(m, X, Y, w, h);
      g.globalCompositeOperation = now ? 'destination-out' : 'source-over'; g.drawImage(m, X, Y, w, h);
    }
    // direktes Umfeld (Durchsicht-Kreis) bleibt frei
    { const P = this.p, pc = proj(P.x, P.y, 0.9), d = cam.toDevice(pc[0], pc[1]), r = XR * cam.scale * Q, gr = f.createRadialGradient(d[0] * Q, d[1] * Q, r * 0.45, d[0] * Q, d[1] * Q, r);
      gr.addColorStop(0, '#000'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      for (const c of [f, g]) { c.globalCompositeOperation = 'destination-out'; c.fillStyle = gr; c.beginPath(); c.arc(d[0] * Q, d[1] * Q, r, 0, 6.2832); c.fill(); } }
    // Grau: entsättigen + abdunkeln, dann Schwarz darüber
    const t = this.T.getContext('2d'); t.setTransform(1, 0, 0, 1, 0, 0); t.globalCompositeOperation = 'copy'; t.drawImage(G, 0, 0);
    t.globalCompositeOperation = 'source-in'; t.fillStyle = '#808080'; t.fillRect(0, 0, W, H);
    const CW = cam.w, CH = cam.h;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false;
    ctx.globalCompositeOperation = 'saturation'; ctx.drawImage(this.T, 0, 0, W, H, 0, 0, CW, CH);
    t.globalCompositeOperation = 'copy'; t.drawImage(G, 0, 0); t.globalCompositeOperation = 'source-in'; t.fillStyle = 'rgb(14,16,24)'; t.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.42; ctx.drawImage(this.T, 0, 0, W, H, 0, 0, CW, CH);
    ctx.globalAlpha = 1; ctx.drawImage(F, 0, 0, W, H, 0, 0, CW, CH);
    ctx.restore();
  }
  drawShots(ctx) {
    const cam = this.app.cam, d = cam.dpr, P = this.p;
    ctx.save(); ctx.lineCap = 'square';
    for (const b of this.shots) {
      const head = Math.min(b.len, b.t * BULLET_V), tail = Math.max(0, head - 3.5); if (head <= tail) continue;
      if (this.fog && !this.sees(b.x + b.dx * head, b.y + b.dy * head) && !this.sees(b.x + b.dx * tail, b.y + b.dy * tail)) continue;
      const p0 = proj(b.x + b.dx * tail, b.y + b.dy * tail, GUN_Z), p1 = proj(b.x + b.dx * head, b.y + b.dy * head, GUN_Z), a = cam.toDevice(p0[0], p0[1]), c = cam.toDevice(p1[0], p1[1]);
      ctx.strokeStyle = 'rgba(255,214,120,.45)'; ctx.lineWidth = 3 * d; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(c[0], c[1]); ctx.stroke();
      ctx.strokeStyle = '#fff6d8'; ctx.lineWidth = 1.2 * d; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(c[0], c[1]); ctx.stroke();
    }
    for (const s of this.sparks) {
      if (s.t < 0) continue; const p = proj(s.x, s.y, s.z), q = cam.toDevice(p[0], p[1]), k = Math.max(1, Math.round(2 * d * cam.scale / 3));
      ctx.fillStyle = s.t < 0.12 ? '#fff2c0' : '#ffb040'; ctx.fillRect(Math.round(q[0]), Math.round(q[1]), k, k);
    }
    if (this.flash > 0) {                                   // Mündungsfeuer
      const fx = Math.cos(P.ang), fy = Math.sin(P.ang), p = proj(P.x + fx * 0.86 - fy * 0.28, P.y + fy * 0.86 + fx * 0.28, P.z + GUN_Z + 0.02), q = cam.toDevice(p[0], p[1]), r = 2.2 * cam.scale;
      ctx.fillStyle = 'rgba(255,200,90,.85)'; ctx.fillRect(Math.round(q[0] - r), Math.round(q[1] - r), Math.round(r * 2), Math.round(r * 2));
      ctx.fillStyle = '#fff8e0'; ctx.fillRect(Math.round(q[0] - r / 2), Math.round(q[1] - r / 2), Math.round(r), Math.round(r));
    }
    ctx.restore();
  }
}
// Deckmaske eines Bildes (nur Objektpixel, ohne Schatten) – einmal pro Bild erzeugt
function maskOf(s) {
  if (s.mask) return s.mask;
  const c = document.createElement('canvas'); c.width = s.w; c.height = s.h;
  const x = c.getContext('2d'), im = x.createImageData(s.w, s.h);
  for (let i = 0; i < s.w * s.h; i++) if (s.rgba[i * 4 + 3]) im.data[i * 4 + 3] = 255;
  x.putImageData(im, 0, 0); s.mask = c; return c;
}
function inPoly(P, x, y) {
  let ins = false; const n = P.length / 2;
  for (let i = 0, j = n - 1; i < n; j = i++) { const xi = P[i * 2], yi = P[i * 2 + 1], xj = P[j * 2], yj = P[j * 2 + 1]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) ins = !ins; }
  return ins;
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
