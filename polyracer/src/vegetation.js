// ===== vegetation.js · Vegetation: Typen, Pinsel-Gruppen mit Wahrscheinlichkeiten, Instanzen, Wind =====
// Eine Pinsel-Gruppe ist eine Auswahl von Typen, jeder mit Wahrscheinlichkeit (Gewicht). Beim Pinseln wird pro Pflanze
// zufällig nach Gewicht gewählt. Später kommen hier die FBX-Assets als weitere Typen dazu, die Gruppen funktionieren gleich.
import * as THREE from "three";
import { L2, tl, clamp, DEG } from "pr/core.js";
import { MODELS } from "pr/models.js";

export const TYPES = {
  pine: { n: L2("Kiefer", "Pine"), s: [0.8, 1.3], sp: 2.6, shadow: true, sway: 1 },
  fir: { n: L2("Tanne", "Fir"), s: [0.8, 1.4], sp: 2.4, shadow: true, sway: 0.8 },
  oak: { n: L2("Laubbaum", "Broadleaf"), s: [0.8, 1.3], sp: 3.2, shadow: true, sway: 1 },
  birch: { n: L2("Birke", "Birch"), s: [0.8, 1.2], sp: 2.2, shadow: true, sway: 1.3 },
  bush: { n: L2("Busch", "Bush"), s: [0.7, 1.4], sp: 1.4, shadow: true, sway: 0.6 },
  rock: { n: L2("Stein", "Rock"), s: [0.5, 2.2], sp: 1.8, shadow: true, sway: 0 },
  slab: { n: L2("Felsplatte", "Rock slab"), s: [0.7, 2.0], sp: 2.5, shadow: true, sway: 0 },
  grass: { n: L2("Gras", "Grass"), s: [0.7, 1.4], sp: 0.45, shadow: false, sway: 2.2 },
  flowers: { n: L2("Blumen", "Flowers"), s: [0.8, 1.3], sp: 0.5, shadow: false, sway: 2 }
};
export const DEFAULT_GROUPS = [
  { id: "g1", n: "Nadelwald", items: [{ t: "pine", p: 55 }, { t: "fir", p: 30 }, { t: "bush", p: 10 }, { t: "rock", p: 5 }], dens: 3, smin: 0.85, smax: 1.25, slope: 38, road: 3 },
  { id: "g2", n: "Laubwald", items: [{ t: "oak", p: 50 }, { t: "birch", p: 25 }, { t: "bush", p: 25 }], dens: 2.5, smin: 0.85, smax: 1.2, slope: 32, road: 3 },
  { id: "g3", n: "Wiese", items: [{ t: "grass", p: 75 }, { t: "flowers", p: 20 }, { t: "bush", p: 5 }], dens: 30, smin: 0.8, smax: 1.3, slope: 35, road: 1 },
  { id: "g4", n: "Felsen", items: [{ t: "rock", p: 60 }, { t: "slab", p: 40 }], dens: 1.5, smin: 0.7, smax: 1.6, slope: 70, road: 2 }
];

export class Vegetation {
  constructor(world) {
    this.world = world; this.group = new THREE.Group();
    this.inst = {}; this.meshes = {}; this.dirty = {}; this.grid = new Map();
    this.groups = JSON.parse(JSON.stringify(DEFAULT_GROUPS));
    this.time = { value: 0 }; this.wind = { value: 0.4 };
    this.geo = {}; this.mat = {};
    Object.keys(TYPES).forEach((t) => { this.inst[t] = []; });
  }
  name(t) { return tl(TYPES[t].n); }
  geoOf(t) { if (!this.geo[t]) this.geo[t] = MODELS[t](); return this.geo[t]; }
  matOf(t) {
    if (this.mat[t]) return this.mat[t];
    const m = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), sway = TYPES[t].sway, U = this;
    if (sway) m.onBeforeCompile = (sh) => {   // Wind: Höhe × Windstärke × Typ, Phase je Pflanze aus ihrer Lage
      sh.uniforms.uTime = U.time; sh.uniforms.uWind = U.wind;
      sh.vertexShader = "uniform float uTime;uniform float uWind;\n" + sh.vertexShader.replace("#include <begin_vertex>",
        "#include <begin_vertex>\n#ifdef USE_INSTANCING\nfloat wph = instanceMatrix[3].x * 0.17 + instanceMatrix[3].z * 0.13;\nfloat wk = max(0.0, position.y) * uWind * " + sway.toFixed(2) + ";\n" +
        "transformed.x += (sin(uTime * 1.6 + wph) * 0.05 + sin(uTime * 3.7 + wph * 2.1) * 0.015) * wk;\ntransformed.z += cos(uTime * 1.3 + wph) * 0.035 * wk;\n#endif");
    };
    return (this.mat[t] = m);
  }
  key(x, z) { return Math.floor(x / 2) + "," + Math.floor(z / 2); }
  addGrid(t, k) { const a = this.inst[t], gk = this.key(a[k], a[k + 1]); let l = this.grid.get(gk); if (!l) this.grid.set(gk, (l = [])); l.push(t, a[k], a[k + 1]); }
  rebuildGrid() { this.grid.clear(); Object.keys(this.inst).forEach((t) => { const a = this.inst[t]; for (let k = 0; k < a.length; k += 4) this.addGrid(t, k); }); }
  // Platz frei? Abstand je Typ (größerer der beiden)
  free(x, z, sp) {
    const r = Math.ceil((sp + 3) / 2), gx = Math.floor(x / 2), gz = Math.floor(z / 2);
    for (let b = -r; b <= r; b++) for (let a = -r; a <= r; a++) {
      const l = this.grid.get((gx + a) + "," + (gz + b)); if (!l) continue;
      for (let i = 0; i < l.length; i += 3) { const s = Math.max(sp, TYPES[l[i]].sp), dx = l[i + 1] - x, dz = l[i + 2] - z; if (dx * dx + dz * dz < s * s) return false; }
    }
    return true;
  }
  pick(g, R) {
    let sum = 0; g.items.forEach((it) => { if (TYPES[it.t]) sum += Math.max(0, it.p); });
    if (sum <= 0) return null; let v = R() * sum;
    for (const it of g.items) { if (!TYPES[it.t]) continue; v -= Math.max(0, it.p); if (v <= 0) return it.t; }
    return g.items[g.items.length - 1].t;
  }
  // Gilt der Platz? Gelände vorhanden, Hang nicht zu steil, Abstand zur Straße
  ok(g, x, z) {
    const w = this.world, T = w.terrain;
    if (!T.inside(x, z)) return false;
    if (T.normalAt(x, z).y < Math.cos(g.slope * DEG)) return false;
    const q = w.road.nearest(x, z); if (q && Math.abs(q.d) < q.w / 2 + 1.3 + g.road) return false;
    return true;
  }
  // Pinseln: Anzahl aus Dichte (je 100 m²) × Fläche × Zeit
  paint(g, x, z, r, dt, R) {
    this.acc = (this.acc || 0) + g.dens / 100 * Math.PI * r * r * dt * 1.4;
    let n = Math.floor(this.acc); this.acc -= n; n = Math.min(n, 400);
    for (let i = 0; i < n; i++) {
      const a = R() * Math.PI * 2, d = Math.sqrt(R()) * r, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d, t = this.pick(g, R);
      if (!t || !this.ok(g, px, pz) || !this.free(px, pz, TYPES[t].sp)) continue;
      this.add(t, px, pz, R() * Math.PI * 2, g.smin + R() * (g.smax - g.smin));
    }
  }
  add(t, x, z, rot, s) { const a = this.inst[t]; a.push(x, z, rot, s); this.addGrid(t, a.length - 4); this.dirty[t] = true; }
  erase(x, z, r, only) {
    let hit = false;
    Object.keys(this.inst).forEach((t) => {
      if (only && only.indexOf(t) < 0) return;
      const a = this.inst[t], o = []; for (let k = 0; k < a.length; k += 4) { const dx = a[k] - x, dz = a[k + 1] - z; if (dx * dx + dz * dz > r * r) o.push(a[k], a[k + 1], a[k + 2], a[k + 3]); }
      if (o.length !== a.length) { this.inst[t] = o; this.dirty[t] = true; hit = true; }
    });
    if (hit) this.rebuildGrid();
  }
  // Pflanzen, die jetzt auf der Straße stehen, entfernen
  clearRoad() {
    const w = this.world; let hit = false;
    Object.keys(this.inst).forEach((t) => {
      const a = this.inst[t], o = [];
      for (let k = 0; k < a.length; k += 4) { const q = w.road.nearest(a[k], a[k + 1]); if (q && Math.abs(q.d) < q.w / 2 + 1.5) continue; o.push(a[k], a[k + 1], a[k + 2], a[k + 3]); }
      if (o.length !== a.length) { this.inst[t] = o; this.dirty[t] = true; hit = true; }
    });
    if (hit) this.rebuildGrid();
  }
  count() { let n = 0; Object.keys(this.inst).forEach((t) => { n += this.inst[t].length / 4; }); return n; }
  refresh(all) { Object.keys(this.inst).forEach((t) => { if (all || this.dirty[t]) this.build(t); }); }
  build(t) {
    this.dirty[t] = false;
    const a = this.inst[t], n = a.length / 4, old = this.meshes[t];
    if (old) { this.group.remove(old); old.dispose(); }
    if (!n) { this.meshes[t] = null; return; }
    const m = new THREE.InstancedMesh(this.geoOf(t), this.matOf(t), n), T = this.world.terrain, mx = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), sc = new THREE.Vector3(), p = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      const k = i * 4; q.setFromAxisAngle(up, a[k + 2]); sc.setScalar(a[k + 3]);
      p.set(a[k], T.heightAt(a[k], a[k + 1]) - 0.08 * a[k + 3], a[k + 1]); mx.compose(p, q, sc); m.setMatrixAt(i, mx);
    }
    m.castShadow = TYPES[t].shadow; m.receiveShadow = true; m.computeBoundingSphere();
    this.group.add(m); this.meshes[t] = m;
  }
  update(dt, wind) { this.time.value += dt; this.wind.value = wind; this.refresh(false); }
  toJSON() { const o = {}; Object.keys(this.inst).forEach((t) => { if (this.inst[t].length) o[t] = this.inst[t].map((v, i) => (i % 4 < 2 ? Math.round(v * 10) / 10 : Math.round(v * 100) / 100)); }); return { inst: o, groups: this.groups }; }
  fromJSON(o) {
    Object.keys(this.inst).forEach((t) => { this.inst[t] = []; });
    if (o && o.inst) Object.keys(o.inst).forEach((t) => { if (this.inst[t]) this.inst[t] = o.inst[t].slice(); });
    if (o && o.groups && o.groups.length) this.groups = o.groups;
    this.rebuildGrid(); this.refresh(true);
  }
}
