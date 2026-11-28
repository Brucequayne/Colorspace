// ===== move.js · Bewegung und Parkour =====
// Laufen mit Gewicht, Springen, Stufen, Klettern (Kante greifen, hängen, hangeln, hochziehen), Wallrun, Wandsprung,
// Hüft-Slide (Q links, E rechts), Abrollen (Leertaste kurz vor/bei der Landung), Fallhöhen bis zum Beinbruch.
// Feste Physik-Schritte (120 pro Sekunde). Figur = Kapsel aus Kugeln (Radius R) gegen Boden und Prismen (world.collideSphere).
import * as THREE from "three";
import { clamp, lerp, dampAngle, damp } from "pru/core.js";

export const TUNE = {
  run: 6.6, sprint: 9.6, crouch: 2.6, air: 11,
  // Schwere: Antritt wie ein Sprinter (Kraft lässt mit dem Tempo nach), Bremsen, Kurven
  push: 6.2, friction: 7.5, brake: 11, bleed: 6, gripLow: 17.5, gripLoss: 0.95, gripMin: 7.5,
  side: 0.74, sprintCone: 0.9,
  gravity: 23, jump: 6.3, coyote: 0.12, buffer: 0.13,
  slideMin: 5.0, slideBoost: 1.4, slideFric: 3.0, slideMax: 1.3,
  wallMin: 4.2, wallTime: 1.35, wallGrav: 0.32, wallKick: 5.6, wallUp: 7.0,
  kick: 6.4,
  // Wand hochlaufen: Schritte je nach Anlauf (ab wallStep1 einer, ab wallStep2 zwei), Schub je Schritt
  wallStep1: 3.5, wallStep2: 7.5, wallStepV: 4.3, wallStepK: 0.25, wallStepT: 0.26,
  // Stufen und Klettern (Höhen über den Füßen)
  step: 0.45, vaultHands: 1.3, reach: 2.3, hangDrop: 1.78, shimmy: 1.3,
  // Fallhöhen in Metern: bis safe nichts, bis stumble Stolpern ohne Abrollen, darüber Beinbruch ohne Abrollen, ab deadly hilft auch Abrollen nicht
  safe: 3.0, stumble: 5.5, deadly: 10, rollWin: 0.35, lateRoll: 0.13
};
export const TUNE_DEF = Object.assign({}, TUNE);
// Welt im Maßstab der Bewegung: Die Bewegung rechnet in 1,8-m-Einheiten, die Figur ist k-mal so groß (k = Größe / 1,8).
// Alle Abfragen an die Welt werden umgerechnet (Punkte × k hin, ÷ k zurück), Richtungen bleiben gleich.
export class ScaledWorld {
  constructor(world, k) { this.w = world; this.k = k; this.map = world.map; }
  collideSphere(c, r, contacts) {
    const k = this.k, n0 = contacts ? contacts.length : 0; c.multiplyScalar(k);
    const hit = this.w.collideSphere(c, r * k, contacts); c.multiplyScalar(1 / k);
    if (contacts) for (let i = n0; i < contacts.length; i++) contacts[i].d /= k;
    return hit;
  }
  ray(o, dir, far, ig) { const h = this.w.ray(o.clone().multiplyScalar(this.k), dir, (far || 100) * this.k, ig); if (!h) return null; return { point: h.point.clone().multiplyScalar(1 / this.k), distance: h.distance / this.k, face: h.face, object: h.object }; }
}
const R = 0.32, H_STAND = 1.8, H_LOW = 1.0, STEP = 1 / 120;
const DOWN = new THREE.Vector3(0, -1, 0);

export class Mover {
  constructor(world) {
    this.world = world;
    this.pos = new THREE.Vector3(); this.prev = new THREE.Vector3(); this.view = new THREE.Vector3(); this.vel = new THREE.Vector3();
    this.reset();
  }
  reset() {
    this.yaw = 0; this.mode = "normal"; this.low = false;
    this.grounded = false; this.groundN = new THREE.Vector3(0, 1, 0);
    this.wallN = new THREE.Vector3(); this.wallT = 9; this.wallId = null;
    this.coyote = 0; this.jumpBuf = 0; this.rollBuf = 0; this.slideBuf = null; this.acc = 0;
    this.land = 0; this.wallJump = 0; this.lastKick = null; this.kickT = 9; this.slideCd = 0; this.regrab = 0;
    this.climbing = null; this.hang = null; this.roll = null; this.getup = null; this.impact = null;
    this.anim = "idle"; this.events = []; this.airT = 0; this.apex = 0; this.smooth = new THREE.Vector3();
    this.accL = 0; this.accT = 0; this.back = false; this.turning = false; this.turnLeft = 0; this.braking = false;
    this.breakVel = new THREE.Vector3(); this.fallH = 0; this.groundY = this.pos.y;
    this.preVel = new THREE.Vector3(); this.jumpId = 0; this.jumpBoth = false; this.bothBuf = 0; this.brush = null; this.climbSteps = 0; this.climbStep = 0;
  }
  spawn(p, yaw) {
    this.reset();
    this.pos.set(p[0], p[1] + 0.02, p[2]); this.vel.set(0, 0, 0); this.yaw = yaw || 0;
    this.resolve(); this.apex = this.pos.y; this.prev.copy(this.pos); this.view.copy(this.pos); this.acc = 0; this._tv = null;
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
  free(p, h, r) {   // Platz für die Kapsel an Stelle p?
    const c = new THREE.Vector3(), rr = r || R - 0.02;
    for (const o of this.offs(h)) { c.set(p.x, p.y + o, p.z); const b = c.clone(); this.world.collideSphere(c, rr, null); if (c.distanceToSquared(b) > 1e-6) return false; }
    return true;
  }
  fwd() { return new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw)); }
  // Kante vor der Figur: Oberfläche zwischen minUp und maxUp über den Füßen, dazu die Wandkante und ihre Normale
  probe(dir, minUp, maxUp) {
    for (const d of [R + 0.16, R + 0.36]) {
      const o = new THREE.Vector3(this.pos.x + dir.x * d, this.pos.y + maxUp + 0.25, this.pos.z + dir.z * d);
      const hit = this.world.ray(o, DOWN, maxUp + 0.25 - minUp + 0.02, true);
      if (!hit || !hit.face) continue;
      const n = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
      if (n.y < 0.75) continue;
      const top = hit.point.y, up = top - this.pos.y; if (up < minUp || up > maxUp) continue;
      // Wandfläche knapp unter der Kante suchen
      const wo = new THREE.Vector3(this.pos.x, top - 0.08, this.pos.z), wh = this.world.ray(wo, dir, R + 0.7, true);
      let edge, wn;
      if (wh && wh.face) { wn = wh.face.normal.clone().transformDirection(wh.object.matrixWorld); wn.y = 0; if (wn.lengthSq() < 0.3) wn = dir.clone().negate(); wn.normalize(); edge = new THREE.Vector3(wh.point.x, top, wh.point.z); }
      else { wn = dir.clone().negate(); edge = new THREE.Vector3(this.pos.x + dir.x * R, top, this.pos.z + dir.z * R); }
      return { top: top, up: up, edge: edge, n: wn };
    }
    return null;
  }
  // Kante an einer Stelle weiterverfolgen (Hangeln): Wand vorhanden und Oberkante etwa auf gleicher Höhe?
  edgeAt(p, n, top) {
    const wo = new THREE.Vector3(p.x + n.x * 0.6, top - 0.12, p.z + n.z * 0.6), wh = this.world.ray(wo, n.clone().negate(), 1.0, true);
    if (!wh || !wh.face) return null;
    const wn = wh.face.normal.clone().transformDirection(wh.object.matrixWorld); if (Math.abs(wn.y) > 0.3) return null; wn.y = 0; wn.normalize();
    const to = new THREE.Vector3(wh.point.x - wn.x * 0.08, top + 0.35, wh.point.z - wn.z * 0.08), th = this.world.ray(to, DOWN, 0.6, true);
    if (!th || !th.face) return null;
    const tn = th.face.normal.clone().transformDirection(th.object.matrixWorld); if (tn.y < 0.75 || Math.abs(th.point.y - top) > 0.25) return null;
    return { edge: new THREE.Vector3(wh.point.x, th.point.y, wh.point.z), n: wn, top: th.point.y };
  }
  // in: { wish (Welt), aim (Blick-Yaw), jump, crouch, crouchHeld, sprint, slide ('L'/'R' gedrückt), slideHeld }
  update(dt, inp) {
    if (inp.jump) {
      // In der Luft und schon tief gefallen: Leertaste heißt Abrollen (außer an einer Wand: Wandsprung)
      if (this.mode === "impact") this.impact.roll = true;
      else if (!this.grounded && this.mode === "normal" && this.wallT > 0.1 && (this.apex - this.pos.y > 1.2 || this.vel.y < -7)) this.rollBuf = TUNE.rollWin;
      else this.jumpBuf = TUNE.buffer;
    }
    if (inp.slide) this.slideBuf = { side: inp.slide, t: 0 };
    if (inp.both) this.bothBuf = 0.3;
    this.acc += dt; let n = 0;
    while (this.acc >= STEP && n < 12) { this.prev.copy(this.pos); this.step(STEP, inp); this.acc -= STEP; n++; inp.jump = false; inp.crouch = false; inp.slide = null; }
    if (n >= 12) this.acc = 0;
    // Anzeige zwischen den Physik-Schritten glätten, Stufen weich ausgleichen
    if (this.prev.distanceToSquared(this.pos) > 4) this.prev.copy(this.pos);
    const kd = Math.exp(-13 * dt); this.smooth.multiplyScalar(kd);
    this.view.copy(this.prev).lerp(this.pos, clamp(this.acc / STEP, 0, 1)).add(this.smooth);
    return this.animState(inp);
  }
  step(dt, inp) {
    const T = TUNE, wish = inp.wish, wl = wish.length(), vh = new THREE.Vector3(this.vel.x, 0, this.vel.z), sp = vh.length();
    this.wallT += dt; this.kickT += dt; this.slideCd -= dt; this.regrab -= dt; this.rollBuf -= dt; this.bothBuf -= dt;
    if (this.slideBuf) { this.slideBuf.t += dt; if (this.slideBuf.t > 0.15) this.slideBuf = null; }
    this.jumpBuf -= dt; this.land = Math.max(0, this.land - dt * 3.2); this.wallJump = Math.max(0, this.wallJump - dt);
    const wasG = this.grounded; let jumped = false;
    this.track(dt);
    if (wasG) { this.coyote = T.coyote; this.groundY = this.pos.y; } else this.coyote -= dt;
    // Höchster Punkt seit dem letzten Bodenkontakt (für die Fallhöhe)
    if (wasG || this.mode === "hang" || this.mode === "wallrun" || this.mode === "climb" || this.mode === "vault") { this.apex = this.pos.y; this.airT = 0; }
    else { this.apex = Math.max(this.apex, this.pos.y); this.airT += dt; }
    const m = this.mode;

    // --- Sonderbewegungen, die die Steuerung übernehmen ---
    if (m === "broken") { this.vel.set(0, 0, 0); return; }
    if (m === "vault") return this.stepVault(dt);
    if (m === "hang") return this.stepHang(dt, inp);
    if (m === "roll") {
      const Ro = this.roll; Ro.t += dt;
      const s = Math.max(Ro.speed - Ro.t * Ro.loss, 3.5);
      this.vel.x = Math.sin(this.yaw) * s; this.vel.z = Math.cos(this.yaw) * s; this.vel.y -= T.gravity * dt;
      this.pos.addScaledVector(this.vel, dt); this.resolve(); this.snap(wasG);
      if (Ro.t >= Ro.dur) { this.mode = "normal"; this.low = !this.free(this.pos, H_STAND); }
      return;
    }
    if (m === "impact") {
      // ganz kurzes Zeitfenster nach dem Aufprall: Leertaste rollt noch ab
      const I = this.impact; I.t += dt; vh.multiplyScalar(Math.exp(-6 * dt)); this.vel.x = vh.x; this.vel.z = vh.z;
      this.pos.addScaledVector(this.vel, dt); this.resolve();
      if (I.roll) { this.startRoll(I.fall, I.speed); this.events.push("lateroll"); }
      else if (I.t >= T.lateRoll) { if (I.fall > T.stumble) this.breakLegs(I.vel); else { this.mode = "stun"; this.stunT = 0.5 + (I.fall - T.safe) * 0.12; this.land = 1; this.events.push("hard"); } }
      return;
    }
    if (m === "stun") {
      this.stunT -= dt; vh.multiplyScalar(Math.exp(-8 * dt)); this.vel.x = vh.x; this.vel.z = vh.z; this.vel.y -= T.gravity * dt;
      this.pos.addScaledVector(this.vel, dt); this.resolve(); this.snap(wasG);
      if (this.stunT <= 0) this.mode = "normal";
      return;
    }
    if (m === "getup") {
      // Aufstehen aus dem Slide: zur Hüftseite schnell, zur anderen Seite langsam
      const G = this.getup; G.t += dt; const k = clamp(G.t / G.dur, 0, 1);
      this.yaw = dampAngle(this.yaw, Math.atan2(G.dir.x, G.dir.z), 14, dt);
      const s = lerp(G.s0, G.s1, k);
      this.vel.x = G.dir.x * s; this.vel.z = G.dir.z * s; this.vel.y -= T.gravity * dt;
      this.pos.addScaledVector(this.vel, dt); this.resolve(); this.snap(wasG);
      if (k >= 1) { this.mode = "normal"; this.low = !this.free(this.pos, H_STAND); }
      return;
    }

    // --- Boden ---
    if (this.mode === "normal" && wasG && this.slideBuf && sp > T.slideMin && this.slideCd <= 0 && !this.low) {
      // Hüft-Slide: Q = linke Hüfte, E = rechte Hüfte
      this.mode = "slide"; this.low = true; this.slideT = 0; this.slideSide = this.slideBuf.side === "R" ? -1 : 1; this.slideBuf = null;
      const d = vh.clone().normalize(); this.slideDir = d.clone(); vh.copy(d).multiplyScalar(Math.min(sp + T.slideBoost, T.sprint + 1.5));
      this.vel.x = vh.x; this.vel.z = vh.z; this.yaw = Math.atan2(d.x, d.z); this.events.push("slide");
    }
    if (this.mode === "slide") {
      this.slideT += dt;
      const s = Math.max(0, sp - T.slideFric * dt * (1 + this.slideT));
      if (sp > 0.01) vh.multiplyScalar(s / sp);
      if (wl > 0.1 && sp > 0.5) { const d = vh.clone().normalize(), tgt = wish.clone().normalize(); d.lerp(tgt, clamp(dt * 1.1, 0, 1)).normalize(); vh.copy(d).multiplyScalar(s); }
      this.vel.x = vh.x; this.vel.z = vh.z;
      if (vh.lengthSq() > 0.25) this.yaw = dampAngle(this.yaw, Math.atan2(vh.x, vh.z), 8, dt);
      if (!wasG) { this.mode = "normal"; this.slideCd = 0.4; }
      else if (s < 2.4 || (this.slideT > 0.3 && !inp.slideHeld) || this.slideT > T.slideMax) this.startGetup(wish, vh);
    }
    if (this.mode === "normal") {
      const wantLow = inp.crouchHeld && wasG;
      if (wantLow) this.low = true;
      else if (this.low && this.free(this.pos, H_STAND)) this.low = false;
      if (wasG) this.groundMove(dt, inp, vh, sp);
      else if (wl > 0.1) {
        // Luft: etwas Kontrolle, Tempo bleibt erhalten
        const cap = Math.max(sp, T.run * 0.75), target = wish.clone().multiplyScalar(cap);
        approach(vh, target, T.air * dt);
        if (vh.length() > cap) vh.setLength(cap);
        this.vel.x = vh.x; this.vel.z = vh.z;
      }
    }

    // --- Springen ---
    if (this.jumpBuf > 0 && (this.mode === "normal" || this.mode === "slide")) {
      if (this.coyote > 0) {
        // Wand direkt davor und Anlauf: die Wand hochlaufen (ein oder zwei Schritte je nach Tempo)
        const wf = wl > 0.1 ? wish.clone().normalize() : this.fwd();
        const side = this.sideWall(vh, sp);
        if (this.wallT < 0.08 && this.wallN.dot(wf) < -0.7 && sp > T.wallStep1 && !this.low) {
          this.vel.y = T.jump; this.startWallUp(sp);
        } else if (side && this.mode === "normal") {
          // seitlich an der Wand und flacher Winkel: Wallrun beginnt direkt mit dem Absprung
          this.vel.y = T.jump; this.startWallrun(side.t, side.ts); this.events.push("jump");
        } else {
          this.jumpBoth = this.bothBuf > 0 || sp < 1.2; this.bothBuf = 0;
          this.vel.y = T.jump * (this.jumpBoth ? 1.06 : 1) + (sp > T.run + 0.5 ? 0.25 : 0); if (this.mode === "slide") this.mode = "normal";
          if (this.jumpBoth) { this.vel.x *= 0.9; this.vel.z *= 0.9; }
          this.jumpId++; this.events.push(this.jumpBoth ? "jump2" : "jump");
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
    if (this.mode === "climb" && this.jumpBuf > 0 && this.climbT > 0.12) {
      this.vel.set(this.wallN.x * T.kick, T.wallUp, this.wallN.z * T.kick);
      this.yaw = Math.atan2(this.wallN.x, this.wallN.z); this.mode = "normal"; this.lastKick = this.wallId; this.kickT = 0; this.wallJump = 0.3; this.jumpBuf = 0; jumped = true; this.events.push("walljump");
    }

    // --- Wallrun ---
    if (this.mode === "normal" && !wasG && !jumped && this.vel.y > -7 && wl > 0.1) {
      // Wallrun: bei Kontakt oder schon kurz davor (Wand bis 25 cm neben der Kapsel), wenn der Winkel zur Wand flacher als ~50° ist
      const side = this.wallT < 0.06 ? this.sideFromContact(vh, sp) : this.sideWall(vh, sp, 0.25);
      if (side && wish.dot(this.wallN) < 0.35 && !(this.lastKick === this.wallId && this.kickT < 0.35)) { this.startWallrun(side.t, side.ts); this.vel.y = Math.max(this.vel.y, 2.6); }
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
      // Wand hochlaufen: jeder Schritt drückt nach oben, dazwischen volle Schwerkraft
      this.climbT += dt;
      const idx = Math.floor(this.climbT / T.wallStepT);
      if (idx > this.climbStep && idx < this.climbSteps) { this.climbStep = idx; this.vel.y = Math.max(this.vel.y, (T.wallStepV + T.wallStepK * this.climbSpeed) * (idx > 0 ? 0.88 : 1)); this.events.push("wallstep"); }
      this.vel.y -= T.gravity * dt; this.vel.x = -this.wallN.x * 1.0; this.vel.z = -this.wallN.z * 1.0;
      if (this.climbT > this.climbSteps * T.wallStepT || this.wallT > 0.12) { this.mode = "normal"; this.lastKick = this.wallId; this.kickT = 0.3; }
    } else this.vel.y -= T.gravity * dt;
    if (wasG && !jumped && this.mode !== "climb") this.vel.y = Math.min(this.vel.y, 0);

    // --- In der Luft an einer Kante: drauf, mit Händen hoch oder festhalten ---
    if ((this.mode === "normal" || this.mode === "climb") && !wasG && !jumped && this.regrab <= 0 && this.wallT < 0.1 && !this.low) {
      const dir = this.wallN.clone().negate();
      const toward = this.mode === "climb" || (wl > 0.1 && wish.clone().normalize().dot(dir) > 0.35);
      if (toward && this.grabLedge(dir)) return;
    }

    // --- Bewegen und Kollision ---
    const vy0 = this.vel.y, vhBefore = new THREE.Vector3(this.vel.x, 0, this.vel.z); this.preVel.copy(this.vel);
    this.pos.addScaledVector(this.vel, dt);
    this.resolve();
    if (!jumped) this.snap(wasG);
    // kleine Stufen: einfach draufsteigen
    if ((this.mode === "normal" || this.mode === "slide") && (wasG || this.grounded) && vhBefore.lengthSq() > 0.04 && Math.hypot(this.vel.x, this.vel.z) < vhBefore.length() * 0.9) this.stepUp(vhBefore);
    // frontal in der Luft an die Wand (kurz nach dem Absprung, mit Anlauf): die Wand hochlaufen
    if (this.mode === "normal" && !this.grounded && this.wallT === 0 && this.airT < 0.5 && this.vel.y > -1.5 && this.regrab <= 0) {
      const into = vhBefore.dot(this.wallN.clone().negate()), f = wl > 0.1 ? wish.clone().normalize().dot(this.wallN) : 0;
      if (into > T.wallStep1 && f < -0.6 && vhBefore.length() * 0.75 < into + 0.5) this.startWallUp(vhBefore.length());
    }
    // am Boden an der Wand entlang (flacher Winkel): für die Animation (Hand an der Wand)
    this.brush = null;
    if (this.mode === "normal" && this.grounded && this.wallT < 0.12) {
      const sp2 = Math.hypot(this.vel.x, this.vel.z);
      if (sp2 > 2) { const d = new THREE.Vector3(this.vel.x, 0, this.vel.z).normalize(); if (Math.abs(d.dot(this.wallN)) < 0.71) this.brush = { n: this.wallN.clone(), side: Math.sign(d.x * this.wallN.z - d.z * this.wallN.x) || 1 }; }
    }
    if (this.grounded && !wasG) this.landed(vy0);
    if (this.grounded && (this.mode === "wallrun" || this.mode === "climb")) this.mode = "normal";
    if (this.mode === "normal") this.face(dt, inp);
  }
  startWallUp(sp) {
    const T = TUNE, n = sp >= T.wallStep2 ? 2 : sp >= T.wallStep1 ? 1 : 0; if (!n) return;
    this.mode = "climb"; this.climbT = 0; this.climbStep = -1; this.climbSteps = n; this.climbSpeed = sp;
    this.vel.x = -this.wallN.x * 1.0; this.vel.z = -this.wallN.z * 1.0; this.yaw = Math.atan2(-this.wallN.x, -this.wallN.z); this.events.push("climb");
  }
  startWallrun(t, ts) {
    this.mode = "wallrun"; this.wallRunT = 0; this.wallDir = t.clone().normalize(); this.wallSpeed = Math.max(ts, TUNE.run + 0.4);
    this.wallSide = Math.sign(this.wallDir.x * this.wallN.z - this.wallDir.z * this.wallN.x) || 1; this.wallT = 0;
    this.events.push("wallrun");
  }
  // Wand neben der Figur bei flachem Winkel (≤ 50°): aus dem Kontakt
  sideFromContact(vh, sp) {
    const t = vh.clone().addScaledVector(this.wallN, -vh.dot(this.wallN)), ts = t.length();
    if (ts > TUNE.wallMin && ts > sp * 0.64 && this.wallN.dot(this.fwd()) > -0.55) return { t: t, ts: ts };
    return null;
  }
  // … oder per Strahl zur Seite (Wand bis gap Meter neben der Kapsel), dann wird die Figur herangezogen
  sideWall(vh, sp, gap) {
    if (sp < TUNE.wallMin) return null;
    if (this.wallT < 0.08) return this.sideFromContact(vh, sp);
    const d = vh.clone().multiplyScalar(1 / sp), left = new THREE.Vector3(d.z, 0, -d.x), o = new THREE.Vector3(this.pos.x, this.pos.y + 1.0, this.pos.z);
    for (const sg of [1, -1]) {
      for (const a of [0, 0.5]) {   // quer und schräg nach vorne
        const dir = left.clone().multiplyScalar(sg).addScaledVector(d, a).normalize();
        const hit = this.world.ray(o, dir, R + (gap == null ? 0.25 : gap) + 0.15, true);
        if (!hit || !hit.face) continue;
        const n = hit.face.normal.clone().transformDirection(hit.object.matrixWorld); if (Math.abs(n.y) > 0.3) continue; n.y = 0; n.normalize();
        const t = vh.clone().addScaledVector(n, -vh.dot(n)), ts = t.length();
        if (ts > TUNE.wallMin && ts > sp * 0.64) {
          this.wallN.copy(n); this.wallId = hit.object.userData.item || null;
          const dist = hit.distance * Math.abs(dir.dot(n)) - R; if (dist > 0.02) this.pos.addScaledVector(n, -Math.min(dist - 0.01, 0.3));
          return { t: t, ts: ts };
        }
      }
    }
    return null;
  }
  stepUp(vh) {
    const dir = vh.clone().normalize();
    const L = this.probe(dir, 0.04, TUNE.step); if (!L) return;
    // so weit vor, dass die Figur wirklich auf der Stufe steht (Kante + ein paar cm), Sprung optisch weich
    const toEdge = Math.max(0, L.edge.clone().sub(this.pos).dot(dir));
    const tgt = this.pos.clone().addScaledVector(dir, toEdge + 0.08); tgt.y = L.top + 0.01;
    if (!this.free(tgt, this.height())) return;
    this.smooth.sub(tgt.clone().sub(this.pos)); this.pos.copy(tgt); this.vel.x = vh.x; this.vel.z = vh.z; this.vel.y = 0; this.grounded = true;
    this.events.push("step");
  }
  // Kante greifen: niedrig → drauf, bis Brust → mit den Händen hoch, höher → festhalten
  grabLedge(dir) {
    const T = TUNE, L = this.probe(dir, 0.3, T.reach); if (!L) return false;
    const onTop = L.edge.clone().addScaledVector(L.n, -0.45); onTop.y = L.top + 0.01;
    const yaw = Math.atan2(-L.n.x, -L.n.z);
    // Höhe der Kante über dem Absprungboden entscheidet: bis Kniehöhe Füße, bis Brusthöhe Hände, darüber richtig hochziehen
    const rel = Math.max(L.up, L.top - this.groundY);
    if (rel <= T.vaultHands && L.up <= T.vaultHands) {
      if (L.up <= 0.55 && this.vel.y > 1.5) return false;   // steigt noch: einfach weiterfliegen und landen
      if (!this.free(onTop, H_LOW)) return false;
      const hands = rel > 0.55;
      this.startVault(hands ? "hands" : "step", onTop, L, hands ? 0.36 + L.up * 0.14 : 0.2, Math.hypot(this.vel.x, this.vel.z) * (hands ? 0.55 : 0.85));
      this.yaw = yaw; return true;
    }
    // festhalten: Körper hängt unter der Kante
    const hp = L.edge.clone().addScaledVector(L.n, R + 0.1); hp.y = L.top - T.hangDrop;
    const g = this.world.ray(new THREE.Vector3(hp.x, L.top - 0.3, hp.z), DOWN, T.hangDrop, false);
    let feetFree = true;
    if (g && g.point.y > hp.y - 0.05) { hp.y = Math.max(hp.y, g.point.y + 0.01); feetFree = false; }
    if (!this.free(hp, 1.4, R - 0.06)) return false;
    this.mode = "hang"; this.hang = { edge: L.edge.clone(), n: L.n.clone(), top: L.top, t: 0, from: this.pos.clone(), to: hp, move: 0, phase: 0, swing: Math.min(1, Math.hypot(this.vel.x, this.vel.z) / 6), v0: this.preVel.clone(), feetFree: feetFree, id: (this.hang ? this.hang.id || 0 : 0) + 1 };
    this.vel.set(0, 0, 0); this.yaw = yaw; this.low = false; this.events.push("grab");
    return true;
  }
  startVault(kind, target, L, dur, keep) {
    this.mode = "vault";
    this.climbing = { kind: kind, t: 0, dur: dur, a: this.pos.clone(), b: target, edge: L.edge.clone(), n: L.n.clone(), top: L.top, keep: clamp(keep, kind === "pullup" ? 0 : 1.5, TUNE.run) };
    this.vel.set(0, 0, 0); this.events.push(kind);
  }
  stepVault(dt) {
    const C = this.climbing; C.t += dt; const k = clamp(C.t / C.dur, 0, 1);
    // erst hoch (Körper an der Wand), dann nach vorne auf die Kante
    const up = C.kind === "pullup" ? 0.62 : C.kind === "hands" ? 0.55 : 0.45;
    const ku = clamp(k / up, 0, 1), kf = clamp((k - up * 0.7) / (1 - up * 0.7), 0, 1);
    const eu = C.kind === "pullup" ? ku * ku * (3 - 2 * ku) : 1 - (1 - ku) * (1 - ku), ef = kf * kf * (3 - 2 * kf);
    this.pos.set(lerp(C.a.x, C.b.x, ef), lerp(C.a.y, C.b.y, eu), lerp(C.a.z, C.b.z, ef));
    this.vel.set(0, 0, 0);
    if (k >= 1) {
      this.mode = "normal"; this.low = !this.free(this.pos, H_STAND);
      const d = C.n.clone().negate(); this.vel.copy(d).multiplyScalar(C.keep); this.grounded = true; this.coyote = TUNE.coyote; this.resolve(); this.apex = this.pos.y;
    }
  }
  // Hängen an der Kante: hangeln (links/rechts), hochziehen (Leertaste oder vorwärts), loslassen (Strg/C oder rückwärts), Rücksprung (rückwärts + Leertaste)
  stepHang(dt, inp) {
    const T = TUNE, H = this.hang; H.t += dt;
    const right = new THREE.Vector3(H.n.z, 0, -H.n.x), wish = inp.wish, wl = wish.length();
    const toWall = wl > 0.1 ? wish.dot(H.n.clone().negate()) / wl : 0, side = wl > 0.1 ? wish.dot(right) / wl : 0;
    H.swing = damp(H.swing, 0, 2.5, dt);
    // hineingreifen: weich zur Hängeposition
    const kg = clamp(H.t / 0.16, 0, 1), base = H.to;
    H.move = 0;
    if (kg >= 1 && Math.abs(side) > 0.45 && Math.abs(toWall) < 0.7) {
      const sg = Math.sign(side), ne = H.edge.clone().addScaledVector(right, sg * T.shimmy * dt), E = this.edgeAt(ne, H.n, H.top);
      const look = E && this.edgeAt(H.edge.clone().addScaledVector(right, sg * 0.35), H.n, H.top);
      if (E && look) {
        const np = E.edge.clone().addScaledVector(E.n, R + 0.1); np.y = base.y + (E.top - H.top);
        if (this.free(np, 1.4, R - 0.06)) {
          H.edge.copy(E.edge); H.n.copy(E.n); H.top = E.top; H.to = np; H.move = sg; H.phase += T.shimmy * dt / 0.55; this.yaw = Math.atan2(-E.n.x, -E.n.z);
          const g = this.world.ray(new THREE.Vector3(np.x, H.top - 0.3, np.z), DOWN, T.hangDrop + 0.2, false); H.feetFree = !(g && g.point.y > np.y - 0.05);
        }
      }
    }
    this.pos.copy(H.from).lerp(H.to, kg * kg * (3 - 2 * kg));
    if (kg >= 1) H.from.copy(H.to);
    this.vel.set(0, 0, 0);
    if (kg < 1) return;
    const onTop = H.edge.clone().addScaledVector(H.n, -0.45); onTop.y = H.top + 0.01;
    if (this.jumpBuf > 0 && toWall < -0.5) {
      // Rücksprung von der Wand
      this.mode = "normal"; this.vel.set(H.n.x * 5.2, 6.4, H.n.z * 5.2); this.yaw = Math.atan2(H.n.x, H.n.z); this.regrab = 0.5; this.jumpBuf = 0; this.wallJump = 0.3; this.events.push("walljump");
    } else if (this.jumpBuf > 0 && H.t > 0.25) {
      if (this.free(onTop, H_LOW)) { this.jumpBuf = 0; this.startVault("pullup", onTop, { edge: H.edge, n: H.n, top: H.top }, 0.95 + Math.max(0, H.top - this.pos.y - 1.6) * 0.15, 0); }
    } else if (inp.crouchHeld || toWall < -0.6) {
      this.mode = "normal"; this.vel.set(H.n.x * 1.0, 0, H.n.z * 1.0); this.regrab = 0.45; this.events.push("drop");
    }
  }
  startRoll(fall, speed) {
    const vh = new THREE.Vector3(this.vel.x, 0, this.vel.z);
    if (vh.lengthSq() > 1) this.yaw = Math.atan2(vh.x, vh.z);
    const big = clamp((fall - TUNE.safe) / (TUNE.deadly - TUNE.safe), 0, 1);
    this.mode = "roll"; this.low = true; this.rollBuf = 0;
    this.roll = { t: 0, dur: 0.62 + big * 0.18, speed: Math.max(speed || vh.length(), 4.5) * (1 - big * 0.35), loss: 2.5 + big * 3 };
    this.events.push("roll");
  }
  startGetup(wish, vh) {
    // Aufstehen: in Richtung der Hüftseite schnell und mit Drehung, zur anderen Seite langsam
    const s0 = vh.length(), d = s0 > 0.1 ? vh.clone().normalize() : this.fwd();
    let a = 0; if (wish.length() > 0.1) { const w = wish.clone().normalize(); a = Math.atan2(d.x * w.z - d.z * w.x, d.dot(w)) * -1; }
    // a > 0: Wunsch nach links (+X lokal, aus Laufrichtung gesehen)
    const toSide = a * this.slideSide;
    let dur = 0.3, keep = 0.85, turn = clamp(a, -0.35, 0.35);
    if (toSide > 0.25) { dur = 0.15; keep = 0.97; turn = clamp(a, -1.3, 1.3); this.events.push("getup-fast"); }
    else if (toSide < -0.25) { dur = 0.45; keep = 0.55; turn = clamp(a, -0.5, 0.5); this.events.push("getup-slow"); }
    const c = Math.cos(turn), sn = Math.sin(turn), dir = new THREE.Vector3(d.x * c + d.z * sn, 0, -d.x * sn + d.z * c).normalize();
    this.mode = "getup"; this.low = false; this.slideCd = 0.35;
    this.getup = { t: 0, dur: dur, dir: dir, s0: s0 * keep, s1: Math.max(s0 * keep, 2.5), side: this.slideSide, fast: toSide > 0.25 };
  }
  breakLegs(vel) {
    this.mode = "broken"; this.breakVel.copy(vel || this.vel); this.vel.set(0, 0, 0); this.events.push("broken");
  }
  // Laufen mit Masse: Tempo und Richtung getrennt. Antritt baut sich langsam auf, je schneller, desto träger in Kurven.
  groundMove(dt, inp, vh, sp) {
    const T = TUNE, wish = inp.wish, wl = Math.min(1, wish.length()), aim = inp.aim != null ? inp.aim : this.yaw;
    let dir = sp > 1e-4 ? vh.clone().multiplyScalar(1 / sp) : new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    let s = sp, target = 0, top = T.run;
    if (wl > 0.1) {
      const w = wish.clone().normalize(), wy = Math.atan2(w.x, w.z), psi = Math.abs(wrap(wy - aim));
      const dirK = T.side + (1 - T.side) * Math.cos(psi);
      top = this.low ? T.crouch : (inp.sprint && psi < T.sprintCone ? T.sprint : T.run * dirK);
      const th = s > 0.4 ? Math.acos(clamp(dir.dot(w), -1, 1)) : 0;
      if (s < 0.4) dir.copy(w);
      else if (th > 2.4 && s > 1.6) { /* Kehrtwende: erst die Füße stemmen und abbremsen */ }
      else {
        const grip = clamp(T.gripLow - T.gripLoss * s, T.gripMin, T.gripLow), om = grip / Math.max(s, 1.2);
        const ang = Math.min(th, om * dt), sg = Math.sign(dir.x * w.z - dir.z * w.x) || 1;
        const c = Math.cos(ang), sn = Math.sin(ang) * sg;
        dir.set(dir.x * c - dir.z * sn, 0, dir.x * sn + dir.z * c).normalize();
      }
      const tf = th > 2.4 ? 0 : clamp(1 - Math.max(0, th - 0.5) / 2.2, 0.3, 1);
      target = top * wl * tf;
      this.braking = th > 2.0 && s > 1.6;
    } else this.braking = false;
    if (s < target) { const k = clamp(1 - (s / Math.max(top, 0.1)) ** 2, 0.12, 1); s = Math.min(target, s + T.push * k * dt); }
    else { const d = wl < 0.1 ? T.friction : this.braking ? T.brake : T.bleed; s = Math.max(target, s - d * dt); }
    this.vel.x = dir.x * s; this.vel.z = dir.z * s;
  }
  // Ausrichtung: Hüfte folgt der Laufrichtung (begrenzt), der Oberkörper bleibt zur Blickrichtung
  face(dt, inp) {
    const aim = inp.aim != null ? inp.aim : this.yaw, sp = Math.hypot(this.vel.x, this.vel.z);
    this.turning = false;
    if (sp > 0.5) {
      const rel = wrap(Math.atan2(this.vel.x, this.vel.z) - aim);
      if (this.back ? Math.abs(rel) < 1.8 : Math.abs(rel) > 2.05) this.back = !this.back;
      const off = this.back ? clamp(wrap(rel - Math.PI), -1.0, 1.0) : clamp(rel, -1.2, 1.2);
      this.yaw = dampAngle(this.yaw, aim + off, this.grounded ? clamp(16 - sp, 6, 14) : 3, dt);
    } else if (this.grounded) {
      this.back = false;
      const d = wrap(aim - this.yaw);
      if (Math.abs(d) > 0.85 || this.turnLeft > 0) { this.turnLeft = Math.abs(d) > 0.08 ? 1 : 0; this.yaw = dampAngle(this.yaw, aim, 4.5, dt); this.turning = this.turnLeft > 0; }
    }
  }
  // auf dem Boden kleben bleiben (Rampen abwärts, Stufen hinunter), weich ausgeglichen
  snap(wasG) {
    if (!wasG || this.grounded || this.vel.y > 0.1) return;
    const save = this.pos.clone(), sv = this.vel.clone();
    this.pos.y -= TUNE.step; this.resolve();
    if (!this.grounded) { this.pos.copy(save); this.vel.copy(sv); this.grounded = false; }
    else this.smooth.y += save.y - this.pos.y;
  }
  landed(vy) {
    const T = TUNE, fall = Math.max(0, this.apex - this.pos.y), vh = new THREE.Vector3(this.vel.x, 0, this.vel.z), speed = vh.length();
    this.fallH = fall; this.apex = this.pos.y;
    if (this.mode === "slide" || this.mode === "roll") return;
    if (fall > T.deadly) { this.breakLegs(new THREE.Vector3(this.vel.x, vy, this.vel.z)); return; }
    if (fall > T.safe) {
      if (this.rollBuf > 0) this.startRoll(fall, speed);
      else { this.mode = "impact"; this.impact = { t: 0, fall: fall, speed: speed, roll: false, vel: new THREE.Vector3(this.vel.x, vy, this.vel.z) }; this.land = 1; this.events.push("impact"); }
      return;
    }
    if (this.rollBuf > 0 && speed > 4) { this.startRoll(fall, speed); return; }
    if (fall > 0.7) { this.land = clamp((fall - 0.7) / 2.6, 0.12, 0.85); this.events.push("land"); }
  }
  // Längs- und Querbeschleunigung für die Animation (geglättet)
  track(dt) {
    const vx = this.vel.x, vz = this.vel.z, sp = Math.hypot(vx, vz);
    if (this._tv) {
      const ax = (vx - this._tv.x) / dt, az = (vz - this._tv.z) / dt;
      const d = sp > 0.3 ? [vx / sp, vz / sp] : [Math.sin(this.yaw), Math.cos(this.yaw)];
      let lo = ax * d[0] + az * d[1], la = ax * d[1] - az * d[0];   // la > 0: nach links (+X lokal)
      if (!this.grounded || this.mode !== "normal") { lo = 0; la = 0; }
      const k = 1 - Math.exp(-7 * dt);
      this.accL += (clamp(lo, -14, 10) - this.accL) * k; this.accT += (clamp(la, -12, 12) - this.accT) * k;
    } else this._tv = { x: 0, z: 0 };
    this._tv.x = vx; this._tv.z = vz;
  }
  // Zustand für die Animation
  animState(inp) {
    const sp = Math.hypot(this.vel.x, this.vel.z), md = this.mode;
    let a = "air";
    if (md === "slide" || md === "wallrun" || md === "climb" || md === "roll" || md === "stun" || md === "hang" || md === "getup" || md === "impact" || md === "broken") a = md;
    else if (md === "vault") a = this.climbing.kind === "pullup" ? "pullup" : "vault";
    else if (this.grounded) a = this.low ? "crouch" : sp > 0.6 ? "run" : "idle";
    this.anim = a;
    const aim = inp && inp.aim != null ? inp.aim : this.yaw, vy0 = Math.atan2(this.vel.x, this.vel.z);
    const twist = md === "normal" ? clamp(wrap(aim - this.yaw), -1.35, 1.35) : 0;
    const C = this.climbing, H = this.hang;
    return { mode: a, speed: a === "wallrun" ? this.wallSpeed : a === "climb" ? 5 : sp, vy: this.vel.y,
      acc: this.accL, lat: this.accT, twist: twist, back: this.back, turning: this.turning, braking: this.braking,
      moveRel: sp > 0.3 ? wrap(vy0 - this.yaw) : 0, sprint: !!(inp && inp.sprint), wallSide: this.wallSide || 1, land: this.land, wallJump: this.wallJump,
      airT: this.airT, fall: Math.max(0, this.apex - this.pos.y),
      rollK: this.roll ? clamp(this.roll.t / this.roll.dur, 0, 1) : 0,
      slideSide: this.slideSide || 1, slideT: this.slideT || 0,
      getup: md === "getup" ? { k: clamp(this.getup.t / this.getup.dur, 0, 1), side: this.getup.side, fast: this.getup.fast } : null,
      climb: md === "vault" ? { kind: C.kind, k: clamp(C.t / C.dur, 0, 1), edge: C.edge, n: C.n, top: C.top } : null,
      hang: md === "hang" ? { edge: H.edge, n: H.n, top: H.top, move: H.move, phase: H.phase, grab: clamp(H.t / 0.16, 0, 1), swing: H.swing, t: H.t, v0: H.v0, feetFree: H.feetFree, id: H.id } : null,
      impactK: md === "impact" ? 1 : 0, breakVel: this.breakVel,
      jumpId: this.jumpId, jumpBoth: this.jumpBoth, brush: this.brush, grounded: this.grounded,
      climbUp: md === "climb" ? { t: this.climbT, step: Math.max(0, this.climbStep), steps: this.climbSteps, n: this.wallN } : null };
  }
}
function wrap(a) { return ((a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; }
function approach(v, target, maxD) {
  const dx = target.x - v.x, dz = target.z - v.z, L = Math.hypot(dx, dz);
  if (L <= maxD || L < 1e-6) { v.x = target.x; v.z = target.z; } else { v.x += dx / L * maxD; v.z += dz / L * maxD; }
}
export { R as RADIUS, H_STAND, H_LOW };
