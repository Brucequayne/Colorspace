// ===== player.js · Spielfigur: Low-Poly-Modell, Laufen, Springen, Kollision mit Häusern, Möbeln und Bäumen =====
import * as THREE from "three";
import { clamp, lerp } from "le/core.js";
import { merge } from "le/models.js";
import { koerper } from "le/kleidung.js";
import { LH, FLOOR, WT } from "le/houses.js";

// Aussehen und Kleidung (seit v0.21): Körperteile kommen aus kleidung.js (koerper), hier werden daraus die beweglichen Glieder
export { LOOK } from "le/kleidung.js";
export const RADIUS = 0.28, HEIGHT = 1.78;

// Figur aus einzelnen Gliedern (Drehpunkte an Hüfte und Schultern), vorne = +z
export function figure(look) {
  const S = koerper(look);
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const mk = (parts) => { const m = new THREE.Mesh(merge(parts), mat); m.castShadow = true; m.receiveShadow = true; return m; };
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  body.add(mk(S.torso));
  const head = new THREE.Group(); head.position.set(0, 1.55, 0); body.add(head); head.add(mk(S.head));
  const limb = (x, y, parts) => { const pv = new THREE.Group(); pv.position.set(x, y, 0); pv.add(mk(parts)); body.add(pv); return pv; };
  const armL = limb(-0.26, 1.42, S.armL), armR = limb(0.26, 1.42, S.armR);
  // Beine mit Kniegelenk (seit v0.16, fürs Sitzen): Oberschenkel am Hüft-Drehpunkt, Unterschenkel + Schuh am Knie
  const leg = (x, th, sh) => { const pv = limb(x, 0.92, th), knee = new THREE.Group(); knee.position.set(0, -0.42, 0); knee.add(mk(sh)); pv.add(knee); pv.userData.knee = knee; return pv; };
  const legL = leg(-0.1, S.thighL, S.shinL), legR = leg(0.1, S.thighR, S.shinR);
  return { group: g, body: body, head: head, armL: armL, armR: armR, legL: legL, legR: legR, kneeL: legL.userData.knee, kneeR: legR.userData.knee };
}

export class Player {
  constructor(world, look) {
    this.world = world; this.m = figure(look); world.engine.scene.add(this.m.group);
    this.p = new THREE.Vector3(); this.v = new THREE.Vector3(); this.face = 0; this.vy = 0; this.onGround = true;
    this.phase = 0; this.speed = 0; this.house = null; this.level = 0; this.frozen = false; this.g = {};
    this.sit = null;   // Sitzen (seit v0.16): { dy: Höhe der Figur über dem Boden, pose: "rest" | "lap" }
  }
  // hinsetzen: Figur auf den Sitzplatz (x, z, Boden y), Blick face, Sitzhöhe h über dem Boden
  sitDown(x, z, y, face, h, pose) { this.p.set(x, y, z); this.face = face; this.v.set(0, 0, 0); this.vy = 0; this.speed = 0; this.onGround = true; this.sit = { dy: h + 0.08 - 0.92, pose: pose || "rest", t: 0 }; this.frozen = true; this.sync(0); }
  standUp(x, z, y) { this.sit = null; this.frozen = false; this.p.set(x, y, z); this.v.set(0, 0, 0); this.vy = 0; this.onGround = true; this.sync(0); }
  dispose() { this.m.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); this.m.group.removeFromParent(); }
  // neues Aussehen (Outfit gewechselt, seit v0.21): Figur neu bauen, Stellung bleibt
  relook(look) { const sc = this.m.group.parent; this.dispose(); this.m = figure(look); if (sc) sc.add(this.m.group); if (this.sit) this.sit.t = 1; this.sync(0); }
  place(x, z, face) { this.p.set(x, 0, z); this.p.y = this.groundAt(x, z, 1e3); this.face = face || 0; this.v.set(0, 0, 0); this.vy = 0; this.sync(0); }
  // Boden unter der Figur: Hausboden (wenn auf einer Bodenzelle), sonst Straße/Gelände
  groundAt(x, z, y) {
    let h = this.world.ground(x, z, this.g, y).h;
    for (const hs of this.world.houses) {
      if (!hs.contains(x, z, 0.5)) continue;
      for (let l = 0; l < 4; l++) { const fy = hs.e.y + l * LH + FLOOR; if (fy > y + 0.45) break; if (hs.floorAt(x, z, l)) h = Math.max(h, fy); }
    }
    return h;
  }
  // inp: { x, z } Richtung (Welt, Länge ≤ 1), run, jump
  update(dt, inp) {
    if (this.sit) { this.speed = 0; this.sync(dt); return; }   // sitzt: keine Bewegung, Haus/Etage bleiben
    const W = this.world, want = new THREE.Vector3(inp.x, 0, inp.z), sp = this.frozen ? 0 : (inp.run ? 6.2 : 3.6);
    if (want.lengthSq() > 1) want.normalize();
    const acc = this.onGround ? 14 : 4;
    this.v.x += clamp(want.x * sp - this.v.x, -acc * dt, acc * dt); this.v.z += clamp(want.z * sp - this.v.z, -acc * dt, acc * dt);
    if (this.frozen) { this.v.x = 0; this.v.z = 0; }
    const np = this.p.clone(); np.x += this.v.x * dt; np.z += this.v.z * dt;
    this.collide(np);
    // Höhe: am Boden kleben (Stufen bis 0,45 m), sonst fallen
    const gh = this.groundAt(np.x, np.z, this.p.y);
    if (gh > this.p.y + 0.45) { np.x = this.p.x; np.z = this.p.z; }   // zu hoch: nicht drübersteigen
    const g2 = this.groundAt(np.x, np.z, this.p.y);
    if (inp.jump && this.onGround && !this.frozen) { this.vy = 4.6; this.onGround = false; }
    this.vy -= 13 * dt; np.y = this.p.y + this.vy * dt;
    if (np.y <= g2 || (this.onGround && np.y - g2 < 0.3 && this.vy <= 0)) { np.y = this.onGround ? lerp(this.p.y, g2, 1 - Math.exp(-dt * 22)) : g2; if (Math.abs(np.y - g2) < 0.02) np.y = g2; this.vy = 0; this.onGround = true; }
    else this.onGround = false;
    // echte Geschwindigkeit (nach Kollision) für die Animation
    const real = Math.hypot(np.x - this.p.x, np.z - this.p.z) / Math.max(dt, 1e-4);
    this.p.copy(np);
    const T = W.terrain, lim = T.size / 2 - 4; this.p.x = clamp(this.p.x, -lim, lim); this.p.z = clamp(this.p.z, -lim, lim);
    if (want.lengthSq() > 0.01 && !this.frozen) { const a = Math.atan2(want.x, want.z); let d = a - this.face; d = Math.atan2(Math.sin(d), Math.cos(d)); this.face += d * (1 - Math.exp(-dt * 12)); }
    this.speed = lerp(this.speed, Math.min(real, 7), 1 - Math.exp(-dt * 10));
    // in welchem Haus, auf welcher Etage
    this.house = null; this.level = 0;
    // drinnen = auf einer überdachten Zelle (Terrasse zählt nicht)
    for (const hs of W.houses) { if (!hs.contains(this.p.x, this.p.z, 0.5)) continue; const l = Math.max(0, Math.floor((this.p.y - hs.e.y + 0.5) / LH)); if (hs.coveredAt(this.p.x, this.p.z, l)) { this.house = hs; this.level = l; break; } }
    this.sync(dt);
  }
  // Kreis gegen Wände (Strecken), Möbel (Kästen) und Baumstämme
  collide(p) {
    const W = this.world, r = RADIUS;
    for (let it = 0; it < 3; it++) {
      for (const hs of W.houses) {
        if (!hs.reach(p.x, p.z, 1.5)) continue;
        const q = hs.toLocal(p.x, p.z), py = p.y - hs.e.y; let moved = false;
        for (const s of hs.b.segs) {
          const l0 = s.l * LH; if (py + HEIGHT < l0 || py > s.y1 - 0.3) continue;   // s.y1 ist im Haus gemessen
          if (s.door && s.door.open > 0.45) continue;
          if (pushSeg(q, s.ax, s.az, s.bx, s.bz, r + (s.th != null ? s.th : s.rail ? 0.04 : WT / 2))) moved = true;   // th: halbe Dicke (Hecke)
        }
        for (const b of hs.b.boxes) { const l0 = b.l * LH; if (py + 0.3 < l0 || py > l0 + LH - 0.2) continue; if (pushBox(q, b, r)) moved = true; }
        if (moved) { const w = hs.toWorld(q.x, q.z); p.x = w.x; p.z = w.z; }
      }
      if (W.objs) W.objs.near(p.x, p.z, 2, (x, z, cr) => { const dx = p.x - x, dz = p.z - z, d = Math.hypot(dx, dz), R = cr + r; if (d < R && d > 1e-5) { p.x = x + dx / d * R; p.z = z + dz / d * R; } });   // Laternen usw. (seit v0.19)
      W.veg.near(p.x, p.z, 3, (x, z, cr) => { const dx = p.x - x, dz = p.z - z, d = Math.hypot(dx, dz), R = cr + r; if (d < R && d > 1e-5) { p.x = x + dx / d * R; p.z = z + dz / d * R; } });
    }
  }
  sync(dt) {
    const m = this.m, k = clamp(this.speed / 3.6, 0, 1.6);
    m.group.position.copy(this.p); m.group.rotation.y = this.face;
    if (this.sit) {   // Sitzhaltung: Oberschenkel nach vorn, Unterschenkel nach unten; am Laptop Hände auf der Tastatur
      const S = this.sit; S.t = Math.min(1, S.t + (dt || 0) * 5); const e = S.t * S.t * (3 - 2 * S.t);
      m.group.position.y = this.p.y + S.dy * e;
      m.legL.rotation.x = m.legR.rotation.x = -1.5 * e; m.kneeL.rotation.x = m.kneeR.rotation.x = 1.5 * e;
      m.legL.rotation.z = 0.04; m.legR.rotation.z = -0.04;
      const ax = S.pose === "lap" ? -1.05 : -0.55; m.armL.rotation.x = m.armR.rotation.x = ax * e; m.armL.rotation.z = -0.12; m.armR.rotation.z = 0.12;
      m.body.position.y = 0; m.body.rotation.x = S.pose === "lap" ? 0.08 : -0.04;
      return;
    }
    m.legL.rotation.z = 0; m.legR.rotation.z = 0;
    this.phase += dt * (2.2 + this.speed * 1.55);
    { const n = Math.floor((this.phase + 1.5708) / Math.PI); if (n !== this._sn) { this._sn = n; if (this.onStep && this.onGround && k > 0.25 && !this.frozen) this.onStep(this.speed); } }   // Fuß setzt auf (seit v0.20.1)
    const s = Math.sin(this.phase) * 0.62 * Math.min(1, k), air = this.onGround ? 0 : 1;
    m.legL.rotation.x = air ? -0.5 : s; m.legR.rotation.x = air ? 0.3 : -s;
    m.kneeL.rotation.x = air ? 0.7 : Math.max(0, s) * 0.9; m.kneeR.rotation.x = air ? 0.35 : Math.max(0, -s) * 0.9;   // Knie beugt sich, wenn das Bein hinten ist
    m.armL.rotation.x = air ? -0.9 : -s * 0.85; m.armR.rotation.x = air ? -0.9 : s * 0.85;
    m.armL.rotation.z = -0.06; m.armR.rotation.z = 0.06;
    m.body.position.y = this.onGround ? Math.abs(Math.cos(this.phase)) * 0.045 * Math.min(1, k) : 0;
    m.body.rotation.x = Math.min(0.12, this.speed * 0.018);
  }
}
function pushSeg(q, ax, az, bx, bz, R) {
  const dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz; let t = L > 0 ? ((q.x - ax) * dx + (q.z - az) * dz) / L : 0; t = clamp(t, 0, 1);
  const cx = ax + dx * t, cz = az + dz * t; let ox = q.x - cx, oz = q.z - cz, d = Math.hypot(ox, oz);
  if (d >= R) return false;
  if (d < 1e-6) { ox = -dz; oz = dx; d = Math.hypot(ox, oz) || 1; }
  q.x = cx + ox / d * R; q.z = cz + oz / d * R; return true;
}
function pushBox(q, b, r) {
  const cx = clamp(q.x, b.cx - b.hw, b.cx + b.hw), cz = clamp(q.z, b.cz - b.hd, b.cz + b.hd); let ox = q.x - cx, oz = q.z - cz, d = Math.hypot(ox, oz);
  if (d >= r) return false;
  if (d < 1e-6) {   // Mitte im Kasten: zur nächsten Seite hinaus
    const l = q.x - (b.cx - b.hw), rr = b.cx + b.hw - q.x, u = q.z - (b.cz - b.hd), dn = b.cz + b.hd - q.z, mn = Math.min(l, rr, u, dn);
    if (mn === l) q.x = b.cx - b.hw - r; else if (mn === rr) q.x = b.cx + b.hw + r; else if (mn === u) q.z = b.cz - b.hd - r; else q.z = b.cz + b.hd + r; return true;
  }
  q.x = cx + ox / d * r; q.z = cz + oz / d * r; return true;
}
// Kamera-Strahl gegen Hauswände: Anteil t (0…1) bis zum ersten Treffer zwischen a und b (Welt), sonst 1
export function camHit(world, a, b) {
  let tb = 1;
  for (const hs of world.houses) {
    if (!hs.reach(a.x, a.z, 12) && !hs.reach(b.x, b.z, 2)) continue;
    const qa = hs.toLocal(a.x, a.z), qb = hs.toLocal(b.x, b.z), ya = a.y - hs.e.y, yb = b.y - hs.e.y;
    for (const s of hs.b.segs) {
      if (s.door && s.door.open > 0.45) continue;
      if (!hs.b.levels[s.l] || hs.b.levels[s.l].userData.cut) continue;
      const t = segX(qa.x, qa.z, qb.x, qb.z, s.ax, s.az, s.bx, s.bz); if (t < 0 || t >= tb) continue;
      const y = ya + (yb - ya) * t, top = s.y1 + 0.05, bot = s.l * LH - 0.1; if (y > top || y < bot) continue;
      tb = t;
    }
  }
  return tb;
}
function segX(ax, az, bx, bz, cx, cz, dx, dz) {
  const rx = bx - ax, rz = bz - az, sx = dx - cx, sz = dz - cz, den = rx * sz - rz * sx; if (Math.abs(den) < 1e-9) return -1;
  const t = ((cx - ax) * sz - (cz - az) * sx) / den, u = ((cx - ax) * rz - (cz - az) * rx) / den;
  return t >= 0 && t <= 1 && u >= -0.08 && u <= 1.08 ? t : -1;
}
