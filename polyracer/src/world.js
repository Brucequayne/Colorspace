// ===== world.js · Welt = Gelände + Straße + Vegetation + Umgebung =====
import * as THREE from "three";
import { fbm, rng, clamp, lerp } from "pr/core.js";
import { Terrain } from "pr/terrain.js";
import { Road } from "pr/road.js";
import { Vegetation, TYPES } from "pr/vegetation.js";
import { WindLines } from "pr/wind.js";

// Haftung (mu) und Rollwiderstand je Untergrund. Reihenfolge wie LAYERS in terrain.js
const SURF = [[0.62, 0.05], [0.58, 0.05], [0.55, 0.06], [0.58, 0.06], [0.6, 0.04], [0.45, 0.09], [0.85, 0.02], [0.35, 0.05]];

export class World {
  constructor(engine) {
    this.engine = engine;
    this.terrain = new Terrain();
    this.road = new Road();
    this.veg = new Vegetation(this);
    this.env = { time: 14, fog: 30, view: 1400, wind: 35, windDir: 40 };
    this.name = "Teststrecke";
    this.terrain.carve = (x, z) => this.road.carve(x, z);
    this.windFx = new WindLines(this);
    engine.scene.add(this.terrain.group); engine.scene.add(this.road.mesh); engine.scene.add(this.veg.group); engine.scene.add(this.windFx.mesh);
    this.n = new THREE.Vector3();
  }
  // Boden unter (x, z) für die Physik: Fahrbahn hat Vorrang, sonst Gelände mit seiner Bodenart
  ground(x, z, out) {
    const o = out || {}; const r = this.road.query(x, z), th = this.terrain.heightAt(x, z);
    if (r && r.h > th - 0.6) { o.h = r.h; o.n = r.n; o.mu = r.kind === "curb" ? 1.22 : 1.35; o.rr = 0.013; o.kind = r.kind; return o; }   // Asphalt seit v0.11 35 % griffiger
    o.h = th; o.n = this.terrain.normalAt(x, z, this.n); const L = this.terrain.layerAt(x, z); o.mu = SURF[L][0]; o.rr = SURF[L][1]; o.kind = "terrain"; return o;
  }
  setEnv(o) { Object.assign(this.env, o || {}); this.engine.setEnv({ time: this.env.time, fog: this.env.fog, view: this.env.view }); }
  // Nach Änderungen an der Straße: Netz, Gelände-Einbettung, Pflanzen auf der Straße entfernen
  roadChanged() { this.road.build(); this.terrain.recalc(); this.terrain.rebuild(); this.veg.clearRoad(); this.veg.refresh(true); }
  terrainChanged(box) {
    if (box) { this.terrain.recalc(box[0], box[1], box[2], box[3]); this.terrain.rebuild(box[0], box[1], box[2], box[3]); }
    else { this.terrain.recalc(); this.terrain.rebuild(); }
  }
  rebuildAll() { this.road.build(); this.terrain.recalc(); this.terrain.rebuild(); this.veg.rebuildGrid(); this.veg.refresh(true); this.setEnv(); }
  update(dt) { this.veg.update(dt, this.env.wind / 100, this.env.windDir); this.windFx.update(dt, this.engine.camera, this.engine.focusAt); }
  toJSON() { return { v: 1, name: this.name, env: this.env, terrain: this.terrain.toJSON(), road: this.road.toJSON(), veg: this.veg.toJSON() }; }
  fromJSON(o) {
    if (!o || !o.terrain) return false;
    if (!this.terrain.fromJSON(o.terrain)) return false;
    this.name = o.name || "Strecke"; Object.assign(this.env, o.env || {});
    this.road.fromJSON(o.road); this.road.sample();
    this.veg.fromJSON(o.veg); this.rebuildAll(); return true;
  }
  // Leere Fläche
  blank() {
    this.terrain.h.fill(0); this.terrain.paint.fill(0); this.road.fromJSON({ pts: [] }); this.veg.fromJSON({}); this.name = "Neue Strecke"; this.rebuildAll();
  }
  // Standard-Teststrecke: sanfte Hügel, ein Rundkurs mit Kuppe, Senke, Steilkurve und Kerbs, Wald und Wiese
  standard() {
    const T = this.terrain, n = T.n, R = rng(4242);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const x = T.org + i * T.cell, z = T.org + j * T.cell, d = Math.hypot(x, z) / (T.size / 2);
      T.h[j * n + i] = (fbm(x / 260, z / 260, 11, 4) - 0.5) * 55 + (fbm(x / 70, z / 70, 21, 3) - 0.5) * 6 + Math.max(0, d - 0.8) * 220;
      const f = fbm(x / 120, z / 120, 31, 3);
      T.paint[j * n + i] = d > 0.92 ? 6 : f > 0.6 ? 2 : f < 0.36 ? 1 : 0;
    }
    const pts = [], N = 16;
    for (let k = 0; k < N; k++) {
      const a = (k / N) * Math.PI * 2, rx = 250 + Math.sin(a * 3) * 45, rz = 160 + Math.cos(a * 2) * 35, x = Math.cos(a) * rx, z = Math.sin(a) * rz;
      pts.push({ x: x, z: z, y: 0, w: 13, bank: 0, cl: false, cr: false });
    }
    // Höhen: geglättetes Gelände, damit die Straße weich über die Hügel läuft
    pts.forEach((p) => { let s = 0, c = 0; for (let a = -20; a <= 20; a += 10) for (let b = -20; b <= 20; b += 10) { s += T.heightAt(p.x + a, p.z + b, true); c++; } p.y = s / c + 0.5; });
    for (let k = 0; k < N; k++) { const a = pts[(k + N - 1) % N].y, b = pts[(k + 1) % N].y; pts[k].y = (pts[k].y * 2 + a + b) / 4; }
    [3, 4, 11, 12].forEach((k) => { pts[k].cl = true; pts[k].cr = true; });
    pts[7].bank = 9; pts[8].bank = 9;
    this.road.pts = pts; this.road.closed = true; this.road.fall = 10;
    this.name = "Teststrecke"; this.env = { time: 15, fog: 30, view: 1400, wind: 35, windDir: 40 };
    this.road.sample(); this.terrain.recalc(); this.veg.fromJSON({});
    // Bepflanzung nach Rauschen: Wald, Wiese, Felsen
    const G = this.veg.groups, V = this.veg;
    const span = T.size - 60;
    for (let k = 0; k < 18000; k++) {
      const x = (R() - 0.5) * span, z = (R() - 0.5) * span, f = fbm(x / 120, z / 120, 31, 3);
      const gf = G.find((x) => x.id === "g4"), g = f > 0.58 ? G[0] : f > 0.52 ? G[1] : f < 0.3 ? gf : null; if (!g) continue;
      if (g === gf && R() > 0.15) continue;
      const t = V.pick(g, R); if (t && V.ok(g, x, z) && V.free(x, z, 2.6)) V.add(t, x, z, R() * 6.28, g.smin + R() * (g.smax - g.smin));
    }
    const gw = G.find((g) => g.id === "g3"), gs = G.find((g) => g.id === "g6");
    for (let k = 0; k < 14000; k++) {   // Wiese am Streckenrand
      const s = this.road.S[Math.floor(R() * this.road.S.length)], side = R() < 0.5 ? -1 : 1, off = s.w / 2 + 4 + Math.pow(R(), 1.5) * 22;
      const x = s.p.x + s.r.x * off * side, z = s.p.z + s.r.z * off * side, t = V.pick(gw, R);
      if (t && V.ok(gw, x, z) && V.free(x, z, 0.35)) V.add(t, x, z, R() * 6.28, 0.8 + R() * 0.5);
    }
    for (let k = 0; k < 900; k++) {   // ein paar Steinfelder
      const x = (R() - 0.5) * span, z = (R() - 0.5) * span; if (fbm(x / 90, z / 90, 41, 2) < 0.62) continue;
      const t = V.pick(gs, R); if (t && V.ok(gs, x, z) && V.free(x, z, TYPES[t].sp)) V.add(t, x, z, R() * 6.28, gs.smin + R() * (gs.smax - gs.smin));
    }
    this.rebuildAll();
  }
}
