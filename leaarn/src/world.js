// ===== world.js · Welt = Gelände + Straßen + Vegetation + Häuser + Umgebung (aus Poly Racer, Häuser seit Leaarn v0.1) =====
// Seit v0.13 mehrere Straßen (roads). Die Hauptstrecke (road) ist der erste Rundkurs, sonst die längste Straße.
import * as THREE from "three";
import { fbm, rng, clamp, lerp } from "le/core.js";
import { Terrain } from "le/terrain.js";
import { Road } from "le/road.js";
import { Vegetation, TYPES } from "le/vegetation.js";
import { HouseInst } from "le/houses.js";
import { houseDef } from "le/haeuser.js";

// Haftung (mu) und Rollwiderstand je Untergrund. Reihenfolge wie LAYERS in terrain.js
const SURF = [[0.62, 0.05], [0.58, 0.05], [0.55, 0.06], [0.58, 0.06], [0.6, 0.04], [0.45, 0.09], [0.85, 0.02], [0.35, 0.05]];

export class World {
  constructor(engine) {
    this.engine = engine;
    this.terrain = new Terrain();
    this.roads = []; this.roadGroup = new THREE.Group();
    this.veg = new Vegetation(this);
    this.env = { time: 14, fog: 30, view: 1400, wind: 35, windDir: 40 };
    this.name = "Hub";
    this.houses = []; this.houseGroup = new THREE.Group();
    this.terrain.carve = (x, z, b) => this.carve(x, z, b);
    this.addRoad();
    engine.scene.add(this.terrain.group); engine.scene.add(this.roadGroup); engine.scene.add(this.veg.group); engine.scene.add(this.houseGroup);
    this.n = new THREE.Vector3();
  }
  // ---------- Häuser (Leaarn) ----------
  // Eintrag: { k: "starter" | "lokal", d: Hausdaten (nur lokal), x, z, y (Bodenhöhe), a (Drehung in Grad), home (Spielstart) }
  addHouse(e) { const h = new HouseInst(e, houseDef(e)); this.houses.push(h); this.houseGroup.add(h.root); return h; }
  removeHouse(h) { const i = this.houses.indexOf(h); if (i < 0) return; this.houses.splice(i, 1); h.dispose(); }
  setHouses(list) { this.houses.slice().forEach((h) => this.removeHouse(h)); (list || []).forEach((e) => this.addHouse(Object.assign({}, e))); }
  houseAt(x, z, m) { for (const h of this.houses) if (h.contains(x, z, m || 0)) return h; return null; }
  inHouse(x, z, m) { return !!this.houseAt(x, z, m); }
  home() { return this.houses.find((h) => h.e.home) || this.houses[0] || null; }
  // nach Verschieben/Setzen: Gelände darunter ebnen, Pflanzen im Haus entfernen
  housesChanged() { this.terrain.recalc(); this.terrain.rebuild(); this.veg.clearRoad(); this.veg.refresh(true); }
  // ---------- Straßen ----------
  addRoad(o) {
    const r = new Road(); r.world = this; r.base = (x, z) => this.terrain.heightAt(x, z, true);
    if (o) r.fromJSON(o); else { r.closed = false; }
    this.roads.push(r); this.roadGroup.add(r.mesh); this.roadGroup.add(r.bmesh); return r;
  }
  removeRoad(r) {
    const i = this.roads.indexOf(r); if (i < 0) return;
    this.roads.splice(i, 1); this.roadGroup.remove(r.mesh); this.roadGroup.remove(r.bmesh); r.mesh.geometry.dispose(); r.bmesh.geometry.dispose();
  }
  setRoads(list) { this.roads.slice().forEach((r) => this.removeRoad(r)); (list && list.length ? list : [{ pts: [], closed: false }]).forEach((o) => this.addRoad(o)); }
  // Hauptstrecke (Start der Testfahrt): erster Rundkurs, sonst die längste Straße
  get road() {
    let best = null; for (const r of this.roads) if (r.pts.length > 1 && r.closed) return r;
    for (const r of this.roads) if (!best || r.len > best.len) best = r;
    return best || this.roads[0];
  }
  // Abzweigungen: Enden mit j bekommen die Höhe der Straße, in die sie münden
  snapJoins() {
    let ch = false;
    for (const r of this.roads) {
      const n = r.pts.length; if (n < 2 || r.closed) continue;
      [0, n - 1].forEach((k) => {
        const p = r.pts[k]; if (!p.j) return;
        for (const o of this.roads) { if (o === r || o.S.length < 2) continue; const q = o.query(p.x, p.z); if (q && Math.abs(q.h - p.y) < 3) { if (Math.abs(q.h - p.y) > 0.01) { p.y = q.h; ch = true; } break; } }
      });
    }
    return ch;
  }
  buildRoads() {
    this.roads.forEach((r) => r.sample());
    if (this.snapJoins()) this.roads.forEach((r) => r.sample());
    const main = this.road; this.roads.forEach((r) => { r.main = r === main; r.markBridges(); });
    this.roads.forEach((r) => r.buildMesh());
  }
  // Gelände unter allen Straßen: Aufschütten/Abtragen der Straße mit dem größten Einfluss, danach alles Abtragen (Brücken, ohne Anpassung)
  carve(x, z, b) {
    let best = null, lo = Infinity;
    for (const r of this.roads) {
      if (r.S.length < 2) continue; const c = r.carve(x, z); if (!c) continue;
      if (c.lo) { if (c.h < lo) lo = c.h; } else if (!best || c.w > best.w || (c.w === best.w && c.h > best.h)) best = c;
    }
    let h = b; if (best) h = best.w >= 1 ? best.h : lerp(b, best.h, best.w);
    h = Math.min(h, lo);
    // Häuser: Grundfläche eben auf Haushöhe, weicher Übergang (stärkster Einfluss gewinnt)
    let hb = null; for (const hs of this.houses) { const c = hs.carve(x, z); if (c && (!hb || c.w > hb.w)) hb = c; }
    if (hb) h = lerp(h, hb.h, hb.w);
    return h;
  }
  // Abstand zur nächsten Fahrbahnkante (negativ = auf der Fahrbahn), Infinity wenn keine Straße in der Nähe
  roadDist(x, z) { let d = Infinity; for (const r of this.roads) { if (r.S.length < 2) continue; const q = r.nearest(x, z); if (q) d = Math.min(d, Math.abs(q.d) - q.w / 2); } return d; }
  // Boden unter (x, z) für die Physik: Fahrbahn hat Vorrang, sonst Gelände mit seiner Bodenart
  // y (seit v0.12): Höhe des abfragenden Punkts – wer unter einer Brücke fährt, bekommt das Gelände, nicht die Brücke
  // Mehrere Straßen übereinander: die höchste Fahrbahn, die nicht über dem abfragenden Punkt liegt
  ground(x, z, out, y) {
    const o = out || {}, th = this.terrain.heightAt(x, z); let r = null;
    for (const rd of this.roads) {
      if (rd.S.length < 2) continue; const q = rd.query(x, z); if (!q || q.h <= th - 0.6) continue;
      if (y != null && y < q.h - 1.6) continue;   // Fahrbahn liegt deutlich über dem Punkt (Brücke darüber)
      if (!r || q.h > r.h) r = Object.assign({}, q);
    }
    if (r) { o.h = r.h; o.n = r.n; o.mu = r.kind === "curb" ? 1.22 : 1.35; o.rr = 0.013; o.kind = r.kind; return o; }   // Asphalt seit v0.11 35 % griffiger
    o.h = th; o.n = this.terrain.normalAt(x, z, this.n); const L = this.terrain.layerAt(x, z); o.mu = SURF[L][0]; o.rr = SURF[L][1]; o.kind = "terrain"; return o;
  }
  setEnv(o) { Object.assign(this.env, o || {}); this.engine.setEnv({ time: this.env.time, fog: this.env.fog, view: this.env.view }); }
  // Nach Änderungen an der Straße: Netz, Gelände-Einbettung, Pflanzen auf der Straße entfernen
  roadChanged() { this.buildRoads(); this.terrain.recalc(); this.terrain.rebuild(); this.veg.clearRoad(); this.veg.refresh(true); }
  terrainChanged(box) {
    if (box) { this.terrain.recalc(box[0], box[1], box[2], box[3]); this.terrain.rebuild(box[0], box[1], box[2], box[3]); }
    else { this.terrain.recalc(); this.terrain.rebuild(); }
  }
  rebuildAll() { this.buildRoads(); this.terrain.recalc(); this.terrain.rebuild(); this.veg.rebuildGrid(); this.veg.refresh(true); this.setEnv(); }
  update(dt) { this.veg.update(dt, this.env.wind / 100, this.env.windDir); this.houses.forEach((h) => h.update(dt)); }
  // road = Hauptstrecke (für ältere Versionen), roads = alle Straßen
  toJSON() { const rs = this.roads.filter((r) => r.pts.length > 1); return { v: 1, name: this.name, env: this.env, terrain: this.terrain.toJSON(), road: this.road.toJSON(), roads: rs.map((r) => r.toJSON()), veg: this.veg.toJSON(), houses: this.houses.map((h) => houseOut(h.e)) }; }
  fromJSON(o) {
    if (!o || !o.terrain) return false;
    if (!this.terrain.fromJSON(o.terrain)) return false;
    this.name = o.name || "Map"; Object.assign(this.env, o.env || {});
    this.setHouses(o.houses || []);
    this.setRoads(o.roads && o.roads.length ? o.roads : [o.road || { pts: [] }]);
    this.veg.fromJSON(o.veg); this.rebuildAll(); return true;
  }
  // Leere Fläche
  blank() {
    this.terrain.h.fill(0); this.terrain.paint.fill(0); this.setRoads([]); this.setHouses([]); this.veg.fromJSON({}); this.name = "Neue Map"; this.rebuildAll();
  }
  // Standard-Hub (Leaarn): sanfte Hügel, Rundstraße, Zuhause (Starterhaus) mit Zufahrt auf einer kleinen Ebene, Wald und Wiese
  standard() {
    const T = this.terrain, n = T.n, R = rng(4242), HX = 0, HZ = 92;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const x = T.org + i * T.cell, z = T.org + j * T.cell, d = Math.hypot(x, z) / (T.size / 2);
      let h = (fbm(x / 260, z / 260, 11, 4) - 0.5) * 30 + (fbm(x / 70, z / 70, 21, 3) - 0.5) * 4 + Math.max(0, d - 0.8) * 220;
      const dh = Math.hypot(x - HX, z - HZ), k = clamp((dh - 22) / 50, 0, 1);   // Ebene ums Zuhause
      h = lerp(0, h, k * k * (3 - 2 * k));
      T.h[j * n + i] = h;
      const f = fbm(x / 120, z / 120, 31, 3);
      T.paint[j * n + i] = d > 0.92 ? 6 : f > 0.6 ? 2 : f < 0.36 ? 1 : 0;
    }
    const pts = [], N = 16;
    for (let k = 0; k < N; k++) {
      const a = (k / N) * Math.PI * 2, rx = 250 + Math.sin(a * 3) * 45, rz = 160 + Math.cos(a * 2) * 35, x = Math.cos(a) * rx, z = Math.sin(a) * rz;
      pts.push({ x: x, z: z, y: 0, w: 11, bank: 0, cl: false, cr: false });
    }
    pts.forEach((p) => { let s = 0, c = 0; for (let a = -20; a <= 20; a += 10) for (let b = -20; b <= 20; b += 10) { s += T.heightAt(p.x + a, p.z + b, true); c++; } p.y = s / c + 0.4; });
    for (let k = 0; k < N; k++) { const a = pts[(k + N - 1) % N].y, b = pts[(k + 1) % N].y; pts[k].y = (pts[k].y * 2 + a + b) / 4; }
    const loopY = pts[4].y;   // Punkt 4 liegt bei (0, 125): dort mündet die Zufahrt
    this.setHouses([{ k: "starter", x: HX, z: HZ, y: 0, a: 0, home: true }]);
    const drive = [{ x: 0, z: 94.4, y: 0.1, w: 4, bank: 0, cl: false, cr: false, t: 1, a: 0 }, { x: 0, z: 108, y: lerp(0.12, loopY, 0.4), w: 4, bank: 0, cl: false, cr: false, t: 1, a: 1 }, { x: 0, z: 125, y: loopY, w: 4, bank: 0, cl: false, cr: false, t: 1, a: 0, j: 1 }];
    this.setRoads([{ pts: pts, closed: true, fall: 10 }, { pts: drive, closed: false, fall: 6 }]);
    this.name = "Hub"; this.env = { time: 15, fog: 30, view: 1400, wind: 30, windDir: 40 };
    this.buildRoads(); this.terrain.recalc(); this.veg.fromJSON({});
    const G = this.veg.groups, V = this.veg, span = T.size - 60, far = (x, z, r) => Math.hypot(x - HX, z - HZ) > r;
    for (let k = 0; k < 18000; k++) {
      const x = (R() - 0.5) * span, z = (R() - 0.5) * span, f = fbm(x / 120, z / 120, 31, 3);
      const gf = G.find((x) => x.id === "g4"), g = f > 0.58 ? G[0] : f > 0.52 ? G[1] : f < 0.3 ? gf : null; if (!g || !far(x, z, 18)) continue;
      if (g === gf && R() > 0.15) continue;
      const t = V.pick(g, R); if (t && V.ok(g, x, z) && V.free(x, z, 2.6)) V.add(t, x, z, R() * 6.28, g.smin + R() * (g.smax - g.smin));
    }
    const gw = G.find((g) => g.id === "g3"), g2 = G[1];
    for (let k = 0; k < 14000; k++) {   // Wiese an der Straße
      const s = this.road.S[Math.floor(R() * this.road.S.length)], side = R() < 0.5 ? -1 : 1, off = s.w / 2 + 4 + Math.pow(R(), 1.5) * 22;
      const x = s.p.x + s.r.x * off * side, z = s.p.z + s.r.z * off * side, t = V.pick(gw, R);
      if (t && V.ok(gw, x, z) && V.free(x, z, 0.35)) V.add(t, x, z, R() * 6.28, 0.8 + R() * 0.5);
    }
    for (let k = 0; k < 3000; k++) {   // Garten: Wiese ums Haus, ein paar Laubbäume
      const a = R() * 6.28, r = 4 + Math.sqrt(R()) * 22, x = HX + Math.cos(a) * r, z = HZ + Math.sin(a) * r;
      if (Math.abs(x) < 3.5 && z > HZ && z < 126) continue;   // Weg zur Tür frei lassen
      const t = V.pick(gw, R); if (t && V.ok(gw, x, z) && V.free(x, z, 0.35)) V.add(t, x, z, R() * 6.28, 0.7 + R() * 0.4);
    }
    [[-11, 84], [10, 82], [-14, 100], [13, 101], [-6, 72]].forEach((q) => { const t = V.pick(g2, R); if (t) V.add(t === "bush" ? "oak" : t, HX + q[0], HZ + q[1] - 92 + 0, R() * 6.28, 1 + R() * 0.2); });
    this.rebuildAll();
  }
}
// Map-Eintrag eines Hauses für den Export (lokale Häuser tragen ihre Daten mit)
function houseOut(e) {
  const o = { k: e.k, x: Math.round(e.x * 100) / 100, z: Math.round(e.z * 100) / 100, y: Math.round(e.y * 100) / 100, a: Math.round((e.a || 0) * 10) / 10 };
  if (e.home) o.home = true; if (e.d) o.d = e.d; return o;
}
