// ===== wind.js · Wind sichtbar machen: feine Linien, die mit Windstärke und -richtung über das Gelände ziehen =====
// Die Linien leben in einem Bereich um den Blickpunkt (wächst mit dem Kameraabstand), tauchen weich auf und wieder ab.
import * as THREE from "three";
import { clamp, DEG } from "pr/core.js";

const N = 320;
export class WindLines {
  constructor(world) {
    this.world = world;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 6), 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(N * 6), 3));
    this.mesh = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: true }));
    this.mesh.frustumCulled = false; this.mesh.renderOrder = 5;
    this.p = []; for (let i = 0; i < N; i++) this.p.push({ x: 0, z: 0, h: 1, life: 0, max: 0, sp: 1, ph: 0 });
    this.visible = true; this.R = 60; this.c = new THREE.Vector3();
  }
  spawn(q, fresh) {
    const R = this.R, a = this.world.env.windDir * DEG, dx = Math.sin(a), dz = Math.cos(a);
    // neue Linien bevorzugt auf der Luv-Seite, damit sie durch den Bereich ziehen
    let ox = (Math.random() - 0.5) * 2 * R, oz = (Math.random() - 0.5) * 2 * R;
    if (!fresh) { const up = -R * (0.3 + Math.random() * 0.7); ox = dx * up + -dz * (Math.random() - 0.5) * 2 * R; oz = dz * up + dx * (Math.random() - 0.5) * 2 * R; }
    q.x = this.c.x + ox; q.z = this.c.z + oz; q.h = 0.4 + Math.pow(Math.random(), 1.6) * R * 0.12;
    q.max = 1.6 + Math.random() * 2.4; q.life = fresh ? Math.random() * q.max : 0; q.sp = 0.75 + Math.random() * 0.5; q.ph = Math.random() * 6.28;
  }
  update(dt, cam, focus) {
    const env = this.world.env, k = env.wind / 100, on = this.visible && k > 0.01;
    this.mesh.visible = on; if (!on) return;
    const dist = cam.position.distanceTo(focus), R = clamp(dist * 0.75, 35, 320), first = Math.abs(R - this.R) > this.R * 0.5 || !this.init;
    this.R = R; this.c.copy(focus);
    const a = env.windDir * DEG, dx = Math.sin(a), dz = Math.cos(a), v = 3 + k * 16, len = (1.2 + k * 5) * (R / 60), T = this.world.terrain;
    const P = this.mesh.geometry.attributes.position.array, C = this.mesh.geometry.attributes.color.array, t = performance.now() / 1000;
    for (let i = 0; i < N; i++) {
      const q = this.p[i];
      if (first) this.spawn(q, true);
      q.life += dt; q.x += dx * v * q.sp * dt * (R / 60); q.z += dz * v * q.sp * dt * (R / 60);
      if (q.life > q.max || Math.abs(q.x - this.c.x) > R * 1.2 || Math.abs(q.z - this.c.z) > R * 1.2) this.spawn(q, false);
      const wob = Math.sin(t * 2.3 + q.ph) * 0.25 * len * 0.2, x0 = q.x - dx * len - dz * wob, z0 = q.z - dz * len + dx * wob;
      const y1 = T.heightAt(q.x, q.z) + q.h, y0 = T.heightAt(x0, z0) + q.h;
      P.set([x0, y0, z0, q.x, y1, q.z], i * 6);
      const f = Math.sin(Math.PI * clamp(q.life / q.max, 0, 1)), al = f * (0.16 + 0.3 * k);
      C.set([0, 0, 0, al, al, al * 1.05], i * 6);   // hinten unsichtbar, vorne hell: wirkt wie ein Strich in Bewegungsrichtung
    }
    this.init = true;
    this.mesh.geometry.attributes.position.needsUpdate = true; this.mesh.geometry.attributes.color.needsUpdate = true;
  }
}
