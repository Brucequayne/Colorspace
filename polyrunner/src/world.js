// ===== world.js · Map-Daten, Strukturen (Prismen aus Formen), Kollision, Start/Ziel/Test-Start-Marker =====
// Jede Struktur ist ein gerades Prisma: ein konvexes Vieleck auf einer Ebene (Boden, Dach oder Wand einer anderen Struktur),
// entlang der Ebenen-Normale um h Meter herausgezogen. Daten: { id, s, o:[x,y,z], n:[…], u:[…], pts:[[a,b],…], h, c }
//   o = Ursprung auf der Ebene, n = Zugrichtung, u = erste Achse in der Ebene, v = n × u, pts = Ecken in (u, v), gegen den Uhrzeiger.
import * as THREE from "three";
import { concrete } from "pru/engine.js";
import { uid, r3 } from "pru/core.js";

export const DEFAULT_COLOR = "#9EA1A5";
export const MAP_FORMAT = "polyrunner-map";

const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);

// Vieleck gegen den Uhrzeiger sortieren (positive Fläche)
export function ccw(pts) {
  let A = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; A += p[0] * q[1] - q[0] * p[1]; }
  return A < 0 ? pts.slice().reverse() : pts;
}
export function area(pts) { let A = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; A += p[0] * q[1] - q[0] * p[1]; } return Math.abs(A) / 2; }

// ---------- Prisma: Geometrie, Flächen fürs Anklicken, Kollision ----------
export class Prism {
  constructor(d) {
    this.d = d;
    this.o = V(d.o); this.n = V(d.n).normalize(); this.u = V(d.u).normalize();
    this.v = new THREE.Vector3().crossVectors(this.n, this.u).normalize();
    this.pts = ccw(d.pts); this.h = d.h;
    // Kanten: nach außen zeigende 2D-Normale und Abstand
    this.edges = this.pts.map((p, i) => {
      const q = this.pts[(i + 1) % this.pts.length], ea = q[0] - p[0], eb = q[1] - p[1], L = Math.hypot(ea, eb) || 1;
      const nx = eb / L, ny = -ea / L; return { p: p, q: q, nx: nx, ny: ny, d: nx * p[0] + ny * p[1], L: L };
    });
    let cx = 0, cy = 0; this.pts.forEach((p) => { cx += p[0]; cy += p[1]; }); this.c2 = [cx / this.pts.length, cy / this.pts.length];
    this.box = new THREE.Box3();
    this.pts.forEach((p) => { this.box.expandByPoint(this.at(p[0], p[1], 0)); this.box.expandByPoint(this.at(p[0], p[1], this.h)); });
  }
  at(a, b, s, out) { return (out || new THREE.Vector3()).copy(this.o).addScaledVector(this.u, a).addScaledVector(this.v, b).addScaledVector(this.n, s); }
  // Netz: flach schattiert, Kreise mit runden Seiten. faceOf[Dreieck] = Fläche (0 oben, 1 unten, 2+i Seite i)
  geometry(h) {
    h = h == null ? this.h : h;
    const P = this.pts, N = P.length, pos = [], nor = [], faceOf = [], round = this.d.s === "circle";
    const push = (p, n) => { pos.push(p.x, p.y, p.z); nor.push(n.x, n.y, n.z); };
    const top = P.map((p) => this.at(p[0], p[1], h)), bot = P.map((p) => this.at(p[0], p[1], 0));
    const nn = this.n.clone().negate();
    for (let i = 1; i < N - 1; i++) { push(top[0], this.n); push(top[i], this.n); push(top[i + 1], this.n); faceOf.push(0); }
    for (let i = 1; i < N - 1; i++) { push(bot[0], nn); push(bot[i + 1], nn); push(bot[i], nn); faceOf.push(1); }
    const rad = (p) => this.u.clone().multiplyScalar(p[0] - this.c2[0]).addScaledVector(this.v, p[1] - this.c2[1]).normalize();
    this.edges.forEach((e, i) => {
      const j = (i + 1) % N, fn = this.u.clone().multiplyScalar(e.nx).addScaledVector(this.v, e.ny);
      const ni = round ? rad(P[i]) : fn, nj = round ? rad(P[j]) : fn;
      push(bot[i], ni); push(bot[j], nj); push(top[j], nj); push(bot[i], ni); push(top[j], nj); push(top[i], ni);
      faceOf.push(2 + i, 2 + i);
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
    g.userData.faceOf = faceOf; g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  }
  // Kanten als feine Linien (oben, unten, senkrecht – bei Kreisen keine senkrechten)
  lines(h) {
    h = h == null ? this.h : h;
    const P = this.pts, N = P.length, a = [];
    for (let i = 0; i < N; i++) {
      const p = P[i], q = P[(i + 1) % N];
      [0, h].forEach((s) => { const A = this.at(p[0], p[1], s), B = this.at(q[0], q[1], s); a.push(A.x, A.y, A.z, B.x, B.y, B.z); });
      if (this.d.s !== "circle") { const A = this.at(p[0], p[1], 0), B = this.at(p[0], p[1], h); a.push(A.x, A.y, A.z, B.x, B.y, B.z); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(a, 3)); return g;
  }
  // Ebene einer Fläche zum Weiterbauen: Ursprung, Normale, Achse u, Umriss in 3D
  face(fi) {
    const P = this.pts, N = P.length;
    if (fi === 0 || fi === 1) {
      const s = fi === 0 ? this.h : 0, n = fi === 0 ? this.n.clone() : this.n.clone().negate();
      return { o: this.at(0, 0, s), n: n, u: this.u.clone(), outline: P.map((p) => this.at(p[0], p[1], s)), cap: true };
    }
    const i = fi - 2, e = this.edges[i], A = this.at(e.p[0], e.p[1], 0), B = this.at(e.q[0], e.q[1], 0);
    const n = this.u.clone().multiplyScalar(e.nx).addScaledVector(this.v, e.ny).normalize();
    const u = B.clone().sub(A).normalize();
    return { o: A, n: n, u: u, outline: [A, B, this.at(e.q[0], e.q[1], this.h), this.at(e.p[0], e.p[1], this.h)], cap: false };
  }
  // Kugel gegen Prisma: liefert Schubvektor (Normale * Tiefe) oder null
  sphere(p, r, out) {
    if (p.x < this.box.min.x - r || p.x > this.box.max.x + r || p.y < this.box.min.y - r || p.y > this.box.max.y + r || p.z < this.box.min.z - r || p.z > this.box.max.z + r) return null;
    const rx = p.x - this.o.x, ry = p.y - this.o.y, rz = p.z - this.o.z;
    const a = rx * this.u.x + ry * this.u.y + rz * this.u.z, b = rx * this.v.x + ry * this.v.y + rz * this.v.z, s = rx * this.n.x + ry * this.n.y + rz * this.n.z;
    let inside2 = true, worst = -Infinity, wi = -1;
    for (let i = 0; i < this.edges.length; i++) { const e = this.edges[i], dd = e.nx * a + e.ny * b - e.d; if (dd > 0) inside2 = false; if (dd > worst) { worst = dd; wi = i; } }
    const inS = s > 0 && s < this.h;
    if (inside2 && inS) {
      // drinnen: auf kürzestem Weg hinaus
      let best = s, nrm = this.n.clone().negate();
      if (this.h - s < best) { best = this.h - s; nrm = this.n.clone(); }
      for (let i = 0; i < this.edges.length; i++) { const e = this.edges[i], dd = e.d - (e.nx * a + e.ny * b); if (dd < best) { best = dd; nrm = this.u.clone().multiplyScalar(e.nx).addScaledVector(this.v, e.ny); } }
      return (out || new THREE.Vector3()).copy(nrm).multiplyScalar(best + r);
    }
    // nächster Punkt auf dem Prisma
    let ca = a, cb = b;
    if (!inside2) {
      let bd = Infinity;
      for (let i = 0; i < this.edges.length; i++) {
        const e = this.edges[i], ex = e.q[0] - e.p[0], ey = e.q[1] - e.p[1];
        let k = ((a - e.p[0]) * ex + (b - e.p[1]) * ey) / (e.L * e.L); k = k < 0 ? 0 : k > 1 ? 1 : k;
        const qa = e.p[0] + ex * k, qb = e.p[1] + ey * k, dd = (a - qa) * (a - qa) + (b - qb) * (b - qb);
        if (dd < bd) { bd = dd; ca = qa; cb = qb; }
      }
    }
    const cs = s < 0 ? 0 : s > this.h ? this.h : s;
    const da = a - ca, db = b - cb, ds = s - cs, d2 = da * da + db * db + ds * ds;
    if (d2 >= r * r) return null;
    const d = Math.sqrt(d2);
    if (d < 1e-6) return (out || new THREE.Vector3()).copy(this.n).multiplyScalar(r);
    const k = (r - d) / d;
    return (out || new THREE.Vector3()).set(0, 0, 0).addScaledVector(this.u, da * k).addScaledVector(this.v, db * k).addScaledVector(this.n, ds * k);
  }
}

// ---------- Marker ----------
function ringMesh(r0, r1, color, op) {
  const g = new THREE.RingGeometry(r0, r1, 48); g.rotateX(-Math.PI / 2);
  return new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: op == null ? 0.95 : op, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
}
function arrowMesh(color) {
  const s = new THREE.Shape(); s.moveTo(0, 1.25); s.lineTo(0.32, 0.88); s.lineTo(0.13, 0.88); s.lineTo(0.13, 0.5); s.lineTo(-0.13, 0.5); s.lineTo(-0.13, 0.88); s.lineTo(-0.32, 0.88); s.closePath();
  const g = new THREE.ShapeGeometry(s); g.rotateX(-Math.PI / 2); g.rotateY(Math.PI);
  return new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.95, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
}
function beam(color, r, hgt, op) {
  const g = new THREE.CylinderGeometry(r, r, hgt, 40, 1, true); g.translate(0, hgt / 2, 0);
  const m = new THREE.ShaderMaterial({
    uniforms: { uC: { value: new THREE.Color(color) }, uO: { value: op } }, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: "varying float vY; void main(){ vY = uv.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: "uniform vec3 uC; uniform float uO; varying float vY; void main(){ gl_FragColor = vec4(uC, uO * pow(1.0 - vY, 1.6));\n#include <colorspace_fragment>\n}"
  });
  const b = new THREE.Mesh(g, m); b.renderOrder = 5; return b;
}
export const MARK = { start: "#5FC2CF", finish: "#E2621B", test: "#E8C547" };
export const FINISH_R = 1.4;

function makeMarker(kind) {
  const g = new THREE.Group(), col = MARK[kind];
  if (kind === "finish") { g.add(ringMesh(FINISH_R - 0.12, FINISH_R, col)); g.add(ringMesh(0, FINISH_R - 0.12, col, 0.16)); g.add(beam(col, FINISH_R, 5, 0.42)); }
  else {
    g.add(ringMesh(0.62, 0.74, col)); g.add(ringMesh(0, 0.62, col, kind === "test" ? 0.12 : 0.18)); g.add(arrowMesh(col));
    g.add(beam(col, 0.74, 2.2, kind === "test" ? 0.22 : 0.3));
  }
  g.traverse((o) => { o.userData.marker = kind; });
  g.name = "marker-" + kind;
  return g;
}

// ---------- Welt ----------
export class World {
  constructor(engine) {
    this.engine = engine;
    this.group = new THREE.Group(); engine.scene.add(this.group);
    this.lineMat = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.14 });
    this.items = [];          // { d, prism, mesh, lines }
    this.markers = { start: makeMarker("start"), finish: makeMarker("finish"), test: makeMarker("test") };
    Object.values(this.markers).forEach((m) => { m.visible = false; engine.scene.add(m); });
    this.map = World.empty();
    this.onChange = null;
  }
  static empty() { return { format: MAP_FORMAT, v: 1, id: uid(), name: "Neue Map", sky: { time: 15, cycle: true, speed: 1 }, start: null, finish: null, test: null, structs: [] }; }
  meshes() { return this.items.map((it) => it.mesh); }
  load(map) {
    this.items.forEach((it) => this.dropItem(it)); this.items = [];
    const m = Object.assign(World.empty(), map || {});
    if (!m.id) m.id = uid();
    m.structs = (m.structs || []).filter((d) => d && d.pts && d.pts.length >= 3 && d.h > 0);
    this.map = m;
    m.structs.forEach((d) => this.items.push(this.makeItem(d)));
    this.syncMarkers();
    this.engine.setEnv({ time: m.sky.time, cycle: m.sky.cycle, speed: m.sky.speed });
  }
  makeItem(d) {
    if (!d.id) d.id = uid();
    if (!d.c) d.c = DEFAULT_COLOR;
    const prism = new Prism(d), mesh = new THREE.Mesh(prism.geometry(), concrete(d.c));
    mesh.castShadow = mesh.receiveShadow = true; mesh.userData.item = d.id;
    const lines = new THREE.LineSegments(prism.lines(), this.lineMat); lines.raycast = () => {};
    this.group.add(mesh); this.group.add(lines);
    return { d: d, prism: prism, mesh: mesh, lines: lines };
  }
  dropItem(it) { this.group.remove(it.mesh); this.group.remove(it.lines); it.mesh.geometry.dispose(); it.lines.geometry.dispose(); }
  byId(id) { return this.items.find((it) => it.d.id === id); }
  itemOf(mesh) { return mesh && mesh.userData.item ? this.byId(mesh.userData.item) : null; }
  add(d) {
    d.o = d.o.map(r3); d.n = d.n.map(r3); d.u = d.u.map(r3); d.pts = ccw(d.pts).map((p) => [r3(p[0]), r3(p[1])]); d.h = r3(d.h);
    this.map.structs.push(d); const it = this.makeItem(d); this.items.push(it); this.changed(); return it;
  }
  remove(id) {
    const i = this.items.findIndex((it) => it.d.id === id); if (i < 0) return;
    this.dropItem(this.items[i]); this.items.splice(i, 1); this.map.structs = this.map.structs.filter((d) => d.id !== id); this.changed();
  }
  paint(id, hex) { const it = this.byId(id); if (!it) return; it.d.c = hex; it.mesh.material = concrete(hex); this.changed(); }
  setMarker(kind, v) { this.map[kind] = v; this.syncMarkers(); this.changed(); }
  syncMarkers() {
    ["start", "finish", "test"].forEach((k) => {
      const mk = this.markers[k], v = this.map[k];
      mk.visible = !!v && (k !== "test" || this.showTest !== false);
      if (v) { mk.position.set(v.p[0], v.p[1] + 0.02, v.p[2]); mk.rotation.y = v.yaw || 0; }
    });
  }
  setShowTest(b) { this.showTest = b; this.syncMarkers(); }
  changed() { if (this.onChange) this.onChange(); }
  snapshot() { return JSON.stringify(this.map); }
  restore(s) { this.load(JSON.parse(s)); }
  toJSON() { return Object.assign({}, this.map, { format: MAP_FORMAT, v: 1 }); }

  // Mitte und Ausdehnung der Map (für die Menü-Kamera)
  bounds() {
    const b = new THREE.Box3(); this.items.forEach((it) => b.union(it.prism.box));
    ["start", "finish", "test"].forEach((k) => { const m = this.map[k]; if (m) b.expandByPoint(new THREE.Vector3(m.p[0], m.p[1], m.p[2])); });
    if (b.isEmpty()) return { c: new THREE.Vector3(0, 2, 0), r: 12 };
    const c = b.getCenter(new THREE.Vector3()), sz = b.getSize(new THREE.Vector3());
    return { c: c, r: Math.max(12, Math.hypot(sz.x, sz.z) * 0.55) };
  }
  // Kugel gegen alles (Boden + Strukturen). Schiebt p hinaus, sammelt Kontakte
  collideSphere(p, r, contacts) {
    const tmp = new THREE.Vector3(); let hit = false;
    if (p.y < r) { const d = r - p.y; p.y = r; contacts && contacts.push({ x: 0, y: 1, z: 0, d: d, id: null }); hit = true; }
    for (let i = 0; i < this.items.length; i++) {
      const push = this.items[i].prism.sphere(p, r, tmp);
      if (push) { const L = push.length(); if (L > 1e-7) { p.add(push); contacts && contacts.push({ x: push.x / L, y: push.y / L, z: push.z / L, d: L, id: this.items[i].d.id }); hit = true; } }
    }
    return hit;
  }
  // Strahl gegen Boden + Strukturen. Senkrechte Strahlen (Füße, seit v0.22 sehr viele) prüfen nur Strukturen, deren Box darunter liegt.
  ray(origin, dir, far, ignoreGround) {
    if (!this._rc) this._rc = new THREE.Raycaster();
    const rc = this._rc; rc.set(origin, dir); rc.far = far || 100;
    let objs;
    if (Math.abs(dir.y) > 0.999) {
      objs = this._ro || (this._ro = []); objs.length = 0; const x = origin.x, z = origin.z, e = 0.01;
      for (let i = 0; i < this.items.length; i++) { const b = this.items[i].prism.box; if (x >= b.min.x - e && x <= b.max.x + e && z >= b.min.z - e && z <= b.max.z + e) objs.push(this.items[i].mesh); }
      if (!ignoreGround) objs.push(this.engine.ground);
    } else objs = ignoreGround ? this.meshes() : this.meshes().concat([this.engine.ground]);
    const h = rc.intersectObjects(objs, false); return h.length ? h[0] : null;
  }
  dispose() {
    this.items.forEach((it) => this.dropItem(it)); this.items = [];
    this.engine.scene.remove(this.group);
    Object.values(this.markers).forEach((m) => this.engine.scene.remove(m));
  }
}
