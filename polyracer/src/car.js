// ===== car.js · Fahrzeug: Starrkörper, 4 Räder mit Federung, Reifenmodell, Motor, Getriebe, Antrieb =====
// Grundlage für die spätere Simulation: Jedes Rad hat eigene Federung, Last, Drehzahl und Schlupf (längs und quer).
// Reifenkraft nach vereinfachter Pacejka-Formel mit Reibungsellipse. Motor mit Drehmomentkurve (nicht linear),
// Getriebe automatisch, Antrieb vorne, hinten oder Allrad (offene Differentiale: Kraft je Seite gleich verteilt).
// Raddrehzahl wird halb-implizit gerechnet, damit es auch bei großer Reifensteifigkeit stabil bleibt. Fester Takt 240 Hz.
import * as THREE from "three";
import { clamp, lerp, DEG } from "pr/core.js";
import { carModel } from "pr/models.js";

export const CAR_DEF = {
  name: "Testwagen", color: "#D8452A",
  mass: 1180, size: [1.8, 1.2, 4.2],                       // Breite, Höhe, Länge (für Trägheit und Karosserie-Kontakt)
  cgY: -0.12,                                              // Schwerpunkt unter Karosserie-Mitte
  wheels: [[0.8, 1.32], [-0.8, 1.32], [0.82, -1.3], [-0.82, -1.3]],   // [x, z] (vorne links/rechts, hinten links/rechts)
  mountY: -0.05, R: 0.33, rest: 0.34, k: 42000, c: 3600, Iw: 1.4,
  drive: "rwd", awdFront: 0.4,
  engine: { idle: 950, red: 7400, torque: [[0, 120], [1000, 160], [2500, 215], [4000, 255], [5500, 265], [6500, 248], [7400, 220], [8000, 150]], brakeTq: 45 },
  gears: [3.35, 2.25, 1.65, 1.3, 1.06, 0.88], rev: 3.1, final: 3.8, eff: 0.88, shiftTime: 0.22,
  brake: 2600, bias: 0.62, hand: 2400,
  tire: { mu: 1.08, B: 9.5, C: 1.75, Bx: 11, Cx: 1.6 },
  steer: 31, cd: 0.33, area: 2.05, down: 0.35
};
const G = 9.81, DT = 1 / 240;

function curve(tab, rpm) {
  if (rpm <= tab[0][0]) return tab[0][1];
  for (let i = 1; i < tab.length; i++) if (rpm <= tab[i][0]) { const a = tab[i - 1], b = tab[i]; return lerp(a[1], b[1], (rpm - a[0]) / (b[0] - a[0])); }
  return tab[tab.length - 1][1];
}

export class Car {
  constructor(world, def) {
    this.world = world; this.def = Object.assign({}, CAR_DEF, def || {});
    const d = this.def, [W, H, L] = d.size, m = d.mass;
    this.I = new THREE.Vector3(m * (H * H + L * L) / 12 * 1.25, m * (W * W + L * L) / 12 * 1.2, m * (W * W + H * H) / 12 * 1.25);
    this.p = new THREE.Vector3(); this.v = new THREE.Vector3(); this.q = new THREE.Quaternion(); this.w = new THREE.Vector3();
    this.wh = d.wheels.map((xz, i) => ({ x: xz[0], z: xz[1], front: i < 2, om: 0, comp: 0, prevComp: 0, spin: 0, steer: 0, contact: false, load: 0, slip: 0, sr: 0, kind: "" }));
    this.gear = 1; this.rpm = d.engine.idle; this.shiftT = 0; this.steerA = 0; this.revT = 0; this.acc = 0;
    this.ctl = { throttle: 0, brake: 0, steer: 0, hand: false };
    const mdl = carModel(d.color); this.group = mdl.group; this.wheelMeshes = mdl.wheels; world.engine.scene.add(this.group);
    this.gr = {}; this._v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
    this.F = new THREE.Vector3(); this.T = new THREE.Vector3();
  }
  dispose() { this.world.engine.scene.remove(this.group); this.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); }
  place(p, dir) {
    const g = this.world.ground(p.x, p.z, {});
    this.p.set(p.x, g.h + this.def.R + this.def.rest * 0.75 - this.def.mountY + 0.1, p.z);
    this.q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(dir.x, dir.z));
    this.v.set(0, 0, 0); this.w.set(0, 0, 0); this.wh.forEach((w) => { w.om = 0; w.comp = 0; w.prevComp = 0; });
    this.gear = 1; this.rpm = this.def.engine.idle; this.sync();
  }
  speed() { return this.v.length(); }
  fwdSpeed() { return this.v.dot(this._fwd || new THREE.Vector3(0, 0, 1).applyQuaternion(this.q)); }
  ratio() { const d = this.def; return this.gear === -1 ? -d.rev * d.final : this.gear === 0 ? 0 : d.gears[this.gear - 1] * d.final; }
  update(dt, ctl) {
    this.ctl = ctl;
    this.acc += Math.min(dt, 0.1);
    while (this.acc >= DT) { this.step(DT); this.acc -= DT; }
    this.sync(dt);
  }
  step(dt) {
    const d = this.def, wld = this.world, q = this.q, p = this.p, ctl = this.ctl;
    const up = this._v[0].set(0, 1, 0).applyQuaternion(q), fwd = this._v[1].set(0, 0, 1).applyQuaternion(q);
    this._fwd = fwd;
    const F = this.F.set(0, -d.mass * G, 0), T = this.T.set(0, 0, 0);
    const vf = this.v.dot(fwd), spd = this.v.length();
    // Lenkung: geschwindigkeitsabhängig, + = rechts
    const maxA = d.steer * DEG / (1 + Math.max(0, Math.abs(vf) - 8) / 22), tgt = -ctl.steer * maxA;
    this.steerA += clamp(tgt - this.steerA, -2.2 * dt, 2.2 * dt);
    // Gangwahl und Rückwärts
    this.autoShift(dt, vf, ctl);
    const rev = this.gear === -1, thr = rev ? ctl.brake : ctl.throttle, brk = rev ? ctl.throttle : ctl.brake;
    // Motor: Drehzahl aus den angetriebenen Rädern, darunter rutscht die Kupplung (Anfahren)
    const drv = this.wh.filter((w) => d.drive === "awd" || (d.drive === "fwd" ? w.front : !w.front));
    const ratio = this.ratio(), omD = drv.reduce((s, w) => s + w.om, 0) / drv.length;
    let rpmW = Math.abs(omD * ratio) * 60 / (2 * Math.PI);
    const launch = d.engine.idle + thr * 2600;
    this.rpm = lerp(this.rpm, ratio ? Math.max(rpmW, thr > 0.05 ? Math.min(launch, d.engine.red) : d.engine.idle) : d.engine.idle + thr * (d.engine.red - d.engine.idle), 1 - Math.exp(-dt * 18));
    let te = curve(d.engine.torque, this.rpm) * thr;
    if (this.rpm > d.engine.red) te = 0;                                  // Begrenzer
    if (thr < 0.05 && ratio) te = -d.engine.brakeTq * clamp(this.rpm / d.engine.red, 0, 1);   // Motorbremse
    if (this.shiftT > 0) { this.shiftT -= dt; te = 0; }
    const wheelTq = te * ratio * d.eff;
    // Radkräfte
    const contact = this._v[2], vc = this._v[3], wf = this._v[4], lat = this._v[5], rel = this._v[6], tmp = this._v[7], g = this.gr;
    this.wh.forEach((w, i) => {
      const mount = rel.set(w.x, d.mountY, w.z).applyQuaternion(q).add(p);
      wld.ground(mount.x, mount.z, g);
      const n = g.n, nu = Math.max(0.25, n.dot(up)), s = n.y * (mount.y - g.h) / nu;
      // s = Abstand Aufhängung → Boden entlang der Federachse
      let comp = d.rest + d.R - s; w.kind = g.kind;
      // Antriebs- und Bremsmoment für dieses Rad
      let tq = 0;
      if (drv.indexOf(w) >= 0) tq = wheelTq * (d.drive === "awd" ? (w.front ? d.awdFront : 1 - d.awdFront) : 1) / 2;
      let bt = brk * d.brake * (w.front ? d.bias : 1 - d.bias) * 2; if (ctl.hand && !w.front) bt += d.hand;
      w.steer = w.front ? this.steerA : 0;
      if (comp <= 0) {   // Rad in der Luft: dreht frei weiter
        w.contact = false; w.load = 0; w.comp = 0; w.prevComp = 0;
        w.om += tq / d.Iw * dt; w.om = this.brakeOm(w.om, bt, dt); w.slip = 0; return;
      }
      w.contact = true;
      if (comp > d.rest) comp = d.rest + (comp - d.rest) * 0.3;
      const cv = (comp - w.prevComp) / dt; w.prevComp = comp; w.comp = comp;
      let fs = d.k * comp + d.c * cv; if (comp >= d.rest) fs += (comp - d.rest) * d.k * 6;
      fs = Math.max(0, fs); w.load = fs;
      contact.copy(mount).addScaledVector(up, -s);
      // Radrichtung auf der Bodenebene
      wf.copy(fwd).applyAxisAngle(up, w.steer); wf.addScaledVector(n, -wf.dot(n)).normalize();
      lat.crossVectors(n, wf).normalize();                  // zeigt nach links
      vc.copy(this.w).cross(tmp.subVectors(contact, p)).add(this.v);
      const vl = vc.dot(wf), vy = vc.dot(lat), mu = d.tire.mu * g.mu, Fz = fs;
      // Raddrehzahl halb-implizit: Längskraft wirkt linearisiert zurück aufs Rad
      const den = Math.max(Math.abs(vl), 3), Kx = mu * Fz * d.tire.Bx * d.tire.Cx;     // Steigung der Längskraft am Nullpunkt
      const a = dt / d.Iw;
      w.om = (w.om + a * (tq + Kx * d.R * vl / den)) / (1 + a * Kx * d.R * d.R / den);
      w.om = this.brakeOm(w.om, bt, dt);
      const sr = (w.om * d.R - vl) / den;
      let fx = mu * Fz * Math.sin(d.tire.Cx * Math.atan(d.tire.Bx * sr));
      const sa = Math.atan2(vy, Math.max(Math.abs(vl), 2.5));
      let fy = -mu * Fz * Math.sin(d.tire.C * Math.atan(d.tire.B * sa));
      const lim = mu * Fz, tot = Math.hypot(fx, fy);
      if (tot > lim) { fx *= lim / tot; fy *= lim / tot; }
      // Rollwiderstand
      fx -= Math.sign(vl) * Math.min(1, Math.abs(vl) / 0.5) * g.rr * Fz;
      w.sr = sr; w.slip = Math.hypot(sr, sa);
      tmp.copy(up).multiplyScalar(fs).addScaledVector(wf, fx).addScaledVector(lat, fy);
      F.add(tmp); T.add(rel.subVectors(contact, p).cross(tmp));
    });
    // Luftwiderstand und Abtrieb
    const drag = 0.5 * 1.2 * d.cd * d.area * spd;
    F.addScaledVector(this.v, -drag); F.addScaledVector(up, -0.5 * 1.2 * d.down * d.area * vf * vf);
    // Karosserie-Kontakt (Unfall, Überschlag): Ecken, die im Boden stecken, werden herausgedrückt
    this.bodyContact(F, T, up);
    // Integration
    this.v.addScaledVector(F, dt / d.mass);
    const qinv = this._qi || (this._qi = new THREE.Quaternion());
    qinv.copy(q).invert();
    const tb = T.clone().applyQuaternion(qinv), wb = this.w.clone().applyQuaternion(qinv);
    wb.x += tb.x / this.I.x * dt; wb.y += tb.y / this.I.y * dt; wb.z += tb.z / this.I.z * dt;
    wb.multiplyScalar(1 - 0.3 * dt);
    this.w.copy(wb).applyQuaternion(q);
    p.addScaledVector(this.v, dt);
    const wq = new THREE.Quaternion(this.w.x * dt * 0.5, this.w.y * dt * 0.5, this.w.z * dt * 0.5, 0).multiply(q);
    q.set(q.x + wq.x, q.y + wq.y, q.z + wq.z, q.w + wq.w).normalize();
  }
  brakeOm(om, bt, dt) { if (bt <= 0) return om; const dv = bt / this.def.Iw * dt; return Math.abs(om) <= dv ? 0 : om - Math.sign(om) * dv; }
  bodyContact(F, T, up) {
    const d = this.def, [W, H, L] = d.size, q = this.q, p = this.p, c = this._v[6], g = this.gr, f = this._v[7];
    for (let ix = -1; ix <= 1; ix += 2) for (let iy = -1; iy <= 1; iy += 2) for (let iz = -1; iz <= 1; iz += 2) {
      c.set(ix * W / 2, iy * H / 2 * (iy > 0 ? 1 : 0.5) + 0.1, iz * L / 2).applyQuaternion(q).add(p);
      this.world.ground(c.x, c.z, g);
      const pen = g.h - c.y; if (pen <= 0) continue;
      const r = c.clone().sub(p), vp = this.w.clone().cross(r).add(this.v), vn = vp.dot(g.n);
      const fn = Math.max(0, 120000 * pen - 9000 * vn);
      f.copy(g.n).multiplyScalar(fn);
      const vt = vp.clone().addScaledVector(g.n, -vn), vtl = vt.length();
      if (vtl > 0.01) f.addScaledVector(vt, -Math.min(fn * 0.6, vtl * d.mass * 4) / vtl);
      F.add(f); T.add(r.cross(f));
      this.scrape = Math.max(this.scrape || 0, Math.min(1, pen * 4));
    }
  }
  autoShift(dt, vf, ctl) {
    const d = this.def;
    if (this.gear === -1) { if (ctl.throttle > 0.1 && vf > -1.5) this.gear = 1; return; }
    if (ctl.brake > 0.1 && ctl.throttle < 0.05 && vf < 0.6) { this.revT += dt; if (this.revT > 0.35) { this.gear = -1; this.revT = 0; } return; }
    this.revT = 0;
    if (this.shiftT > 0 || this.gear < 1) return;
    const red = d.engine.red;
    if (this.rpm > red * 0.94 && this.gear < d.gears.length && this.wh.some((w) => w.contact)) { this.gear++; this.shiftT = d.shiftTime; }
    else if (this.gear > 1) { const lower = this.rpm * d.gears[this.gear - 2] / d.gears[this.gear - 1]; if (lower < red * 0.7 && this.rpm < red * 0.42) { this.gear--; this.shiftT = d.shiftTime * 0.7; } }
  }
  // Modell an die Physik angleichen (Karosserie, Räder mit Federweg, Lenkung, Drehung)
  sync(dt) {
    const d = this.def; dt = dt || 0;
    this.group.position.copy(this.p); this.group.quaternion.copy(this.q);
    this.wheelMeshes.forEach((m, i) => {
      const w = this.wh[i], dist = d.rest - clamp(w.comp, 0, d.rest);
      m.pivot.position.set(w.x, d.mountY - dist, w.z); m.pivot.rotation.set(0, w.steer, 0);
      w.spin = (w.spin + w.om * dt) % (Math.PI * 2); m.mesh.rotation.set(w.spin, 0, 0);
    });
  }
}
