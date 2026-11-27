// ===== move.js · Bewegung und Parkour: Laufen, Sprinten, Springen, Rutschen, Wallrun, Wandsprung, Wand hoch, Hochziehen, Abrollen =====
// Feste Physik-Schritte (120 pro Sekunde). Figur = Kapsel aus Kugeln (Radius R) gegen Boden und Prismen (world.collideSphere).
import * as THREE from "three";
import { clamp, lerp, dampAngle } from "pru/core.js";

export const TUNE = {
  run: 6.6, sprint: 9.6, crouch: 2.6, accel: 34, sprintAccel: 7, decel: 30, air: 11,
  gravity: 23, jump: 7.4, coyote: 0.12, buffer: 0.13,
  slideMin: 5.2, slideBoost: 1.6, slideFric: 3.2, slideMax: 1.25,
  wallMin: 4.2, wallTime: 1.35, wallGrav: 0.32, wallKick: 5.6, wallUp: 7.0,
  climbV: 6.4, climbTime: 0.5, kick: 6.4,
  reach: 2.15, vault: 1.25,
  roll: 10.5, stun: 15, rollWin: 0.35
};
const R = 0.32, H_STAND = 1.8, H_LOW = 1.0, STEP = 1 / 120;
const UP = new THREE.Vector3(0, 1, 0);

export class Mover {
  constructor(world) {
    this.world = world;
    this.pos = new THREE.Vector3(); this.prev = new THREE.Vector3(); this.view = new THREE.Vector3(); this.vel = new THREE.Vector3();
    this.yaw = 0; this.mode = "normal"; this.low = false;
    this.grounded = false; this.groundN = new THREE.Vector3(0, 1, 0);
    this.wallN = new THREE.Vector3(); this.wallT = 9; this.wallId = null;
    this.coyote = 0; this.jumpBuf = 0; this.crouchBuf = 9; this.acc = 0;
    this.timer = 0; this.land = 0; this.wallJump = 0; this.lastKick = null; this.kickT = 9; this.slideCd = 0;
    this.mantle = null; this.anim = "idle"; this.events = [];
  }
  spawn(p, yaw) {
    this.pos.set(p[0], p[1] + 0.02, p[2]); this.vel.set(0, 0, 0); this.yaw = yaw || 0;
    this.mode = "normal"; this.low = false; this.grounded = false; this.mantle = null; this.timer = 0; this.land = 0;
    this.resolve(); this.prev.copy(this.pos); this.view.copy(this.pos); this.acc = 0;
  }
  height() { return this.low ? H_LOW : H_STAND; }
  offs(h) { const o = [R], n = Math.max(1, Math.ceil((h - 2 * R) / (R * 1.1))); for (let i = 1; i <= n; i++) o.push(R + (h - 2 * R) * i / n); return o; }
  // Kapsel auflösen, Kontakte auswerten
  resolve() {
    const contacts = [], c = new THREE.Vector3(), offs = this.offs(this.height());
    for (let it = 0; it < 3; it++) {
      let any = false;
      for (const o of offs) { c.set(this.pos.x, this.pos.y + o, this.pos.z); const before = c.clone(); if (this.world.collideSphere(c, R, contacts)) { this.pos.add(c.sub(before)); any = true; } }
      if (!any) break;
    }
    this.grounded = false; let wall = null;
    for (const k of contacts) {
      const vn = this.vel.x * k.x + this.vel.y * k.y + this.vel.z * k.z;
      if (vn < 0) { this.vel.x -= k.x * vn; this.vel.y -= k.y * vn; this.vel.z -= k.z * vn; }
      if (k.y > 0.62) { this.grounded = true; this.groundN.set(k.x, k.y, k.z); }
      else if (Math.abs(k.y) < 0.42 && k.id) { if (!wall || k.d > wall.d) wall = k; }
    }
    if (wall) { this.wallN.set(wall.x, 0, wall.z).normalize(); this.wallT = 0; this.wallId = wall.id; }
    return contacts;
  }
  free(p, h) {   // Platz für die Kapsel an Stelle p?
    const c = new THREE.Vector3();
    for (const o of this.offs(h)) { c.set(p.x, p.y + o, p.z); const b = c.clone(); this.world.collideSphere(c, R - 0.02, null); if (c.distanceToSquared(b) > 1e-6) return false; }
    return true;
  }
  fwd() { return new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw)); }
  // Kante zum Hochziehen vor der Figur suchen: liefert Zielpunkt oder null
  ledge(dir, maxUp) {
    const top = this.pos.y + maxUp + 0.15;
    for (const d of [R + 0.22, R + 0.45]) {
      const o = new THREE.Vector3(this.pos.x + dir.x * d, top, this.pos.z + dir.z * d);
      const hit = this.world.ray(o, new THREE.Vector3(0, -1, 0), maxUp + 0.15, true);
      if (!hit || !hit.face) continue;
      const n = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
      if (n.y < 0.75) continue;
      const up = hit.point.y - this.pos.y; if (up < 0.28 || up > maxUp) continue;
      const tgt = new THREE.Vector3(this.pos.x + dir.x * (d + 0.12), hit.point.y + 0.02, this.pos.z + dir.z * (d + 0.12));
      // Kopffreiheit über der Kante und auf dem Weg nach oben
      if (!this.free(tgt, H_LOW)) continue;
      const lift = new THREE.Vector3(this.pos.x, hit.point.y + 0.05, this.pos.z);
      if (!this.free(lift, 0.7)) continue;
      return { p: tgt, up: up };
    }
    return null;
  }
  // in: { x, z (Eingabe -1..1, kamerabezogen schon in Welt umgerechnet: wish), jump (gedrückt), jumpHeld, crouch, crouchHeld, sprint }
  update(dt, inp) {
    if (inp.jump) this.jumpBuf = TUNE.buffer;
    if (inp.crouch) this.crouchBuf = 0;
    this.acc += dt; let n = 0;
    while (this.acc >= STEP && n < 12) { this.prev.copy(this.pos); this.step(STEP, inp); this.acc -= STEP; n++; inp.jump = false; inp.crouch = false; }
    if (n >= 12) this.acc = 0;
    // Anzeige zwischen den Physik-Schritten glätten
    if (this.prev.distanceToSquared(this.pos) > 4) this.prev.copy(this.pos);
    this.view.copy(this.prev).lerp(this.pos, clamp(this.acc / STEP, 0, 1));
    return this.animState(inp);
  }
  step(dt, inp) {
    const T = TUNE, wish = inp.wish, wl = wish.length(), vh = new THREE.Vector3(this.vel.x, 0, this.vel.z), sp = vh.length();
    this.timer += dt; this.wallT += dt; this.kickT += dt; this.crouchBuf += dt; this.slideCd -= dt;
    this.jumpBuf -= dt; this.land = Math.max(0, this.land - dt * 3.2); this.wallJump = Math.max(0, this.wallJump - dt);
    const wasG = this.grounded; let jumped = false;
    if (wasG) this.coyote = T.coyote; else this.coyote -= dt;
    const m = this.mode;

    // --- Sonderbewegungen, die die Steuerung übernehmen ---
    if (m === "mantle") {
      const M = this.mantle; M.t += dt; const k = clamp(M.t / M.dur, 0, 1);
      const ku = clamp(k / 0.65, 0, 1), kf = clamp((k - 0.35) / 0.65, 0, 1);
      this.pos.set(lerp(M.a.x, M.b.x, kf * kf * (3 - 2 * kf)), lerp(M.a.y, M.b.y, 1 - (1 - ku) * (1 - ku)), lerp(M.a.z, M.b.z, kf * kf * (3 - 2 * kf)));
      this.vel.set(0, 0, 0);
      if (k >= 1) { this.mode = "normal"; this.low = !this.free(this.pos, H_STAND); this.vel.copy(M.dir).multiplyScalar(M.keep); this.grounded = true; this.coyote = T.coyote; this.resolve(); }
      return;
    }
    if (m === "roll") {
      const Ro = this.roll; Ro.t += dt;
      const s = Math.max(Ro.speed - Ro.t * 2.5, 4.5);
      const want = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw)).multiplyScalar(s);
      this.vel.x = want.x; this.vel.z = want.z; this.vel.y -= T.gravity * dt;
      this.pos.addScaledVector(this.vel, dt); this.resolve(); this.snap(wasG);
      if (Ro.t >= Ro.dur) { this.mode = "normal"; this.low = !this.free(this.pos, H_STAND); }
      return;
    }
    if (m === "stun") {
      this.stunT -= dt; vh.multiplyScalar(Math.exp(-10 * dt)); this.vel.x = vh.x; this.vel.z = vh.z; this.vel.y -= T.gravity * dt;
      this.pos.addScaledVector(this.vel, dt); this.resolve(); this.snap(wasG);
      if (this.stunT <= 0) this.mode = "normal";
      return;
    }

    // --- Boden ---
    if (this.mode === "normal" && wasG) {
      // Rutschen starten
      if (this.crouchBuf < 0.12 && sp > T.slideMin && this.slideCd <= 0) {
        this.mode = "slide"; this.low = true; this.slideT = 0; this.crouchBuf = 9;
        const d = sp > 0.1 ? vh.clone().normalize() : this.fwd(); vh.copy(d).multiplyScalar(Math.min(sp + T.slideBoost, T.sprint + 2));
        this.vel.x = vh.x; this.vel.z = vh.z; this.events.push("slide");
      }
    }
    if (this.mode === "slide") {
      this.slideT += dt;
      const s = Math.max(0, sp - T.slideFric * dt * (1 + this.slideT));
      if (sp > 0.01) { vh.multiplyScalar(s / sp); }
      // leicht lenken
      if (wl > 0.1 && sp > 0.5) { const d = vh.clone().normalize(), tgt = wish.clone().normalize(); d.lerp(tgt, clamp(dt * 1.4, 0, 1)).normalize(); vh.copy(d).multiplyScalar(s); }
      this.vel.x = vh.x; this.vel.z = vh.z;
      const end = s < 2.4 || (this.slideT > 0.35 && !inp.crouchHeld) || this.slideT > T.slideMax || !wasG;
      if (end) { this.mode = "normal"; this.slideCd = 0.45; }
    }
    if (this.mode === "normal") {
      const wantLow = inp.crouchHeld && wasG;
      if (wantLow) this.low = true;
      else if (this.low && this.free(this.pos, H_STAND)) this.low = false;
      if (wasG) {
        const top = this.low ? T.crouch : inp.sprint ? T.sprint : T.run;
        const target = wish.clone().multiplyScalar(top * Math.min(1, wl));
        // Sprint baut sich langsam auf, Richtungswechsel gehen schnell
        let a = wl > 0.1 ? T.accel : T.decel;
        if (wl > 0.1 && sp > T.run - 0.2 && target.length() > sp && vh.dot(target) > 0) a = T.sprintAccel;
        approach(vh, target, a * dt);
        this.vel.x = vh.x; this.vel.z = vh.z;
      } else {
        // Luft: etwas Kontrolle, Tempo bleibt erhalten
        if (wl > 0.1) {
          const cap = Math.max(sp, T.run * 0.75), target = wish.clone().multiplyScalar(cap);
          approach(vh, target, T.air * dt);
          if (vh.length() > cap) vh.setLength(cap);
          this.vel.x = vh.x; this.vel.z = vh.z;
        }
      }
    }

    // --- Springen ---
    if (this.jumpBuf > 0 && (this.mode === "normal" || this.mode === "slide")) {
      if (this.coyote > 0) {
        // Wand direkt davor und Anlauf: die Wand hochlaufen
        const wf = wish.length() > 0.1 ? wish.clone().normalize() : this.fwd();
        if (this.wallT < 0.08 && this.wallN.dot(wf) < -0.7 && sp > 2.5 && !this.low) {
          this.mode = "climb"; this.climbT = 0; this.vel.set(-this.wallN.x * 1.2, T.climbV, -this.wallN.z * 1.2); this.yaw = Math.atan2(-this.wallN.x, -this.wallN.z); this.events.push("climb");
        } else {
          this.vel.y = T.jump + (sp > T.run + 0.5 ? 0.3 : 0); if (this.mode === "slide") { this.mode = "normal"; }
          this.events.push("jump");
        }
        this.low = !this.free(this.pos, H_STAND) && this.low;
        this.jumpBuf = 0; this.coyote = 0; jumped = true; this.grounded = false;
      } else if (this.wallT < 0.1 && !(this.lastKick === this.wallId && this.kickT < 0.6)) {
        // Wandsprung: von der Wand abstoßen (auch hin und her zwischen zwei Wänden)
        const along = vh.clone().addScaledVector(this.wallN, -vh.dot(this.wallN)).multiplyScalar(0.6);
        this.vel.set(this.wallN.x * T.kick + along.x, T.wallUp, this.wallN.z * T.kick + along.z);
        this.yaw = Math.atan2(this.vel.x, this.vel.z); this.lastKick = this.wallId; this.kickT = 0; this.wallJump = 0.3;
        this.jumpBuf = 0; jumped = true; this.events.push("walljump");
      }
    }
    if (this.mode === "wallrun" && this.jumpBuf > 0) {
      const t = this.wallDir.clone().multiplyScalar(Math.max(this.wallSpeed * 0.9, T.run));
      this.vel.set(t.x + this.wallN.x * T.wallKick, T.wallUp, t.z + this.wallN.z * T.wallKick);
      this.yaw = Math.atan2(this.vel.x, this.vel.z); this.mode = "normal"; this.lastKick = this.wallId; this.kickT = 0; this.wallJump = 0.25; this.jumpBuf = 0; jumped = true; this.events.push("walljump");
    }
    if (this.mode === "climb" && this.jumpBuf > 0 && this.climbT > 0.08) {
      // vom Wand-Hochlaufen nach hinten abspringen
      this.vel.set(this.wallN.x * T.kick, T.wallUp, this.wallN.z * T.kick);
      this.yaw = Math.atan2(this.wallN.x, this.wallN.z); this.mode = "normal"; this.lastKick = this.wallId; this.kickT = 0; this.wallJump = 0.3; this.jumpBuf = 0; jumped = true; this.events.push("walljump");
    }

    // --- Wallrun ---
    if (this.mode === "normal" && !wasG && !jumped && this.wallT < 0.06 && this.vel.y > -7 && !(this.lastKick === this.wallId && this.kickT < 0.35)) {
      const t = vh.clone().addScaledVector(this.wallN, -vh.dot(this.wallN)), ts = t.length();
      const intoOk = wl > 0.1 && wish.dot(this.wallN) < 0.35;   // nicht von der Wand weg drücken
      if (ts > T.wallMin && ts > sp * 0.6 && intoOk && this.wallN.dot(this.fwd()) > -0.55) {
        this.mode = "wallrun"; this.wallRunT = 0; this.wallDir = t.normalize(); this.wallSpeed = Math.max(ts, T.run + 0.4);
        this.vel.y = Math.max(this.vel.y, 2.6); this.wallSide = Math.sign(this.wallDir.x * this.wallN.z - this.wallDir.z * this.wallN.x) || 1;
        this.events.push("wallrun");
      }
    }
    if (this.mode === "wallrun") {
      this.wallRunT += dt;
      this.wallDir.addScaledVector(this.wallN, -this.wallDir.dot(this.wallN)).normalize();
      this.wallSpeed = Math.max(T.run, this.wallSpeed - dt * 1.2);
      this.vel.x = this.wallDir.x * this.wallSpeed - this.wallN.x * 1.6; this.vel.z = this.wallDir.z * this.wallSpeed - this.wallN.z * 1.6;
      this.vel.y -= T.gravity * T.wallGrav * (this.wallRunT > 0.4 ? 1.8 : 1) * dt;
      this.yaw = Math.atan2(this.wallDir.x, this.wallDir.z);
      const away = wl < 0.1 || wish.dot(this.wallN) > 0.5;
      if (this.wallT > 0.09 || this.wallRunT > T.wallTime || away || inp.crouchHeld) { this.mode = "normal"; this.lastKick = this.wallId; this.kickT = 0.1; }
    } else if (this.mode === "climb") {
      this.climbT += dt;
      this.vel.y -= T.gravity * 0.45 * dt; this.vel.x = -this.wallN.x * 1.2; this.vel.z = -this.wallN.z * 1.2;
      if (this.climbT > T.climbTime || this.wallT > 0.12) { this.mode = "normal"; this.lastKick = this.wallId; this.kickT = 0.3; }
    } else {
      this.vel.y -= T.gravity * dt;
    }
    if (wasG && !jumped && this.mode !== "climb") this.vel.y = Math.min(this.vel.y, 0);

    // --- Hochziehen / Drüberklettern ---
    if ((this.mode === "normal" || this.mode === "climb") && !this.low) {
      const dir = this.wallT < 0.1 ? this.wallN.clone().negate() : (wl > 0.1 ? wish.clone().normalize() : null);
      const pushing = dir && wl > 0.1 && wish.clone().normalize().dot(dir) > 0.6;
      if (dir && pushing && this.wallT < 0.1 && this.wallN.dot(dir) < -0.6) {
        const maxUp = wasG ? T.vault : T.reach - Math.max(0, -this.vel.y) * 0.05;
        if (!wasG || sp > 1.2 || this.mode === "climb") {
          const L = this.ledge(dir, maxUp);
          if (L && (!wasG || L.up < T.vault)) {
            const keep = clamp(sp * (L.up < 0.9 ? 0.85 : 0.5), 2, T.run);
            this.mode = "mantle"; this.mantle = { t: 0, dur: 0.12 + L.up * 0.16, a: this.pos.clone(), b: L.p, dir: dir.clone(), keep: keep };
            this.yaw = Math.atan2(dir.x, dir.z); this.vel.set(0, 0, 0); this.events.push("mantle");
            return;
          }
        }
      }
    }

    // --- Bewegen und Kollision ---
    const vy0 = this.vel.y;
    this.pos.addScaledVector(this.vel, dt);
    this.resolve();
    if (!jumped) this.snap(wasG);
    if (this.grounded && !wasG) this.landed(vy0, inp);
    if (this.grounded && (this.mode === "wallrun" || this.mode === "climb")) this.mode = "normal";

    // Blickrichtung
    const vh2 = new THREE.Vector3(this.vel.x, 0, this.vel.z);
    if (this.mode === "normal" && vh2.lengthSq() > 0.25) this.yaw = dampAngle(this.yaw, Math.atan2(vh2.x, vh2.z), this.grounded ? 16 : 4, dt);
    if (this.mode === "slide" && vh2.lengthSq() > 0.25) this.yaw = dampAngle(this.yaw, Math.atan2(vh2.x, vh2.z), 8, dt);
  }
  // auf dem Boden kleben bleiben (Rampen abwärts, kleine Kanten)
  snap(wasG) {
    if (!wasG || this.grounded || this.vel.y > 0.1) return;
    const save = this.pos.clone(), sv = this.vel.clone();
    this.pos.y -= 0.32; this.resolve();
    if (!this.grounded) { this.pos.copy(save); this.vel.copy(sv); this.grounded = false; }
  }
  landed(vy, inp) {
    const T = TUNE, fall = -vy;
    if (this.mode === "slide" || this.mode === "roll") return;
    if (fall > T.roll && this.crouchBuf < T.rollWin) {
      const vh = new THREE.Vector3(this.vel.x, 0, this.vel.z);
      if (vh.lengthSq() > 1) this.yaw = Math.atan2(vh.x, vh.z);
      this.mode = "roll"; this.low = true; this.roll = { t: 0, dur: 0.62, speed: Math.max(vh.length(), 5.5) }; this.crouchBuf = 9; this.events.push("roll");
    } else if (fall > T.stun) {
      this.mode = "stun"; this.stunT = 0.55; this.land = 1; this.events.push("hard");
    } else if (fall > 4) { this.land = clamp((fall - 4) / 8, 0.15, 0.8); this.events.push("land"); }
  }
  // Zustand für die Animation
  animState(inp) {
    const sp = Math.hypot(this.vel.x, this.vel.z);
    let a = "air";
    if (this.mode === "slide") a = "slide"; else if (this.mode === "wallrun") a = "wallrun"; else if (this.mode === "climb") a = "climb";
    else if (this.mode === "mantle") a = "mantle"; else if (this.mode === "roll") a = "roll"; else if (this.mode === "stun") a = "stun";
    else if (this.grounded) a = this.low ? "crouch" : sp > 0.6 ? "run" : "idle";
    this.anim = a;
    return { mode: a, speed: a === "wallrun" ? this.wallSpeed : a === "climb" ? 5 : sp, vy: this.vel.y, wallSide: this.wallSide || 1, land: this.land, wallJump: this.wallJump,
      mantleK: this.mantle ? clamp(this.mantle.t / this.mantle.dur, 0, 1) : 0, rollK: this.roll ? clamp(this.roll.t / this.roll.dur, 0, 1) : 0 };
  }
}
function approach(v, target, maxD) {
  const dx = target.x - v.x, dz = target.z - v.z, L = Math.hypot(dx, dz);
  if (L <= maxD || L < 1e-6) { v.x = target.x; v.z = target.z; } else { v.x += dx / L * maxD; v.z += dz / L * maxD; }
}
export { R as RADIUS, H_STAND, H_LOW };
