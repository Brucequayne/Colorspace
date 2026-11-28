// ===== kleidung.js · Kleidung (seit v0.16) =====
// Enge Kleidung (Tanktop, Crop Top, Leggings kurz) liegt im Haut-Shader (figur.js, wie die Badehose).
// Weite Kleidung (Shirt, Shirt lang, Baggy-Hose, Baggy-Shorts) = eigenes Stoffnetz:
//  - Schnitt: Dreiecke der Haut im Bereich des Kleidungsstücks werden kopiert (passt exakt zum Körper, Ränder auf die Schnittlinie gelegt),
//    dann locker gemacht: Shirt fällt ab der Brust senkrecht (Hülle je Richtung), Hosenbeine fallen ab dem Oberschenkel weit, Ärmel weiter;
//    Saum wird bei Bedarf nach unten verlängert (Shirt lang).
//  - Anker: jeder Stoffpunkt hängt mit den Knochengewichten seines Hautpunkts am Skelett (Skinning auf der CPU).
//  - Physik: Punkte schwingen frei (Trägheit, Schwerkraft, Fahrtwind), werden je nach Lage verschieden stark zum Anker gezogen
//    (oben/Bund fest, Saum lose), Stofflängen bleiben erhalten, nie unter die Haut (Abstand zur gehäuteten Hautstelle) und
//    Kapseln für Beine/Arme (Saum stößt an die Beine).
import * as THREE from "three";
import { BONES } from "pru/runner.js";

export const TOPS = ["none", "tanktop", "croptop", "shirt", "longshirt"];
export const LEGS = ["none", "baggy", "shorts", "leggings"];
export const CLOTHC = ["#E9E5DC", "#C6C5B9", "#9EA1A5", "#3A3C40", "#1E1F22", "#ED6A5E", "#E2621B", "#E8C547", "#7A9E7E", "#2F5D50", "#62929E", "#4A6D7C", "#3F7CAC", "#8E6C8A", "#C97B84", "#B5835A"];
export const TIGHT_TOP = { tanktop: 1, croptop: 2 }, TIGHT_LEG = { leggings: 1 };
export function cloneClothes(c) { return Object.assign({ top: "none", topCol: "#E9E5DC", legs: "none", legsCol: "#3A3C40" }, c || {}); }

const BI = {}; BONES.forEach(([n], i) => { BI[n] = i; });
const ARM = new Set(["LeftUpperArm", "LeftLowerArm", "LeftHand", "RightUpperArm", "RightLowerArm", "RightHand"].map((n) => BI[n]));
const LEG = new Set(["LeftUpperLeg", "LeftLowerLeg", "LeftFoot", "LeftToes", "RightUpperLeg", "RightLowerLeg", "RightFoot", "RightToes"].map((n) => BI[n]));
const V3 = (a) => new THREE.Vector3().fromArray(a);

// ---------- Schnitt eines weiten Kleidungsstücks (Ruhe-Koordinaten) ----------
function cut(data, kind) {
  const g = data.geo, P = g.attributes.position.array, Nn = g.attributes.normal.array, part = g.attributes.aPart.array, SI = g.attributes.skinIndex.array, SW = g.attributes.skinWeight.array;
  const n = P.length / 3, J = data.head.joints, idx = g.index.array;
  const dom = (i) => { let b = SI[i * 4], w = SW[i * 4]; for (let k = 1; k < 4; k++) if (SW[i * 4 + k] > w) { w = SW[i * 4 + k]; b = SI[i * 4 + k]; } return b; };
  const shirt = kind === "shirt" || kind === "longshirt", pants = kind === "baggy" || kind === "shorts";
  // Feld f: > 0 innen, Wert ≈ Abstand zur Schnittlinie in Metern
  const f = new Float32Array(n), armT = new Float32Array(n), side = new Int8Array(n);
  const shL = V3(J.LeftUpperArm), elL = V3(J.LeftLowerArm), shR = V3(J.RightUpperArm), elR = V3(J.RightLowerArm), p = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    p.fromArray(P, i * 3); const y = p.y, b = dom(i), pa = part[i];
    side[i] = ARM.has(b) ? 1 : LEG.has(b) ? 2 : 0;
    if (pa > 1.5) { f[i] = -1; continue; }
    if (shirt) {
      if (pa > 0.5) { f[i] = -1; continue; }                                   // Hände nie
      const yNeck = (p.z > -0.03 ? 1.058 : 1.082) + 25 * p.x * p.x;
      let d = Math.min(y - 0.7, yNeck - y);
      if (side[i] === 1) {
        const a = p.x > 0 ? shL : shR, e = p.x > 0 ? elL : elR, ax = e.clone().sub(a), t = p.clone().sub(a).dot(ax.normalize()); armT[i] = t;
        if (kind === "shirt") d = Math.min(d, 0.085 - t);                        // kurzer Ärmel bis Mitte Oberarm
      }
      if (side[i] === 2 && y < 0.72) d = Math.min(d, -0.01);
      f[i] = d;
    } else if (pants) {
      if (side[i] === 1) { f[i] = -1; continue; }
      if (pa > 0.5 && y < 0.1) { f[i] = -1; continue; }
      const fr = p.z > -0.03 ? 1 : 0, yTop = (fr ? 0.778 : 0.79) + 0.01 * Math.min(1, Math.abs(p.x) / 0.12);
      f[i] = Math.min(yTop - y, y - (kind === "baggy" ? 0.105 : 0.43));
    }
  }
  // Dreiecke mit mindestens einem inneren Punkt
  const tri = [];
  for (let t = 0; t < idx.length; t += 3) { const a = idx[t], b = idx[t + 1], c = idx[t + 2]; if ((f[a] > 0 || f[b] > 0 || f[c] > 0) && f[a] > -0.5 && f[b] > -0.5 && f[c] > -0.5) tri.push(a, b, c); }
  // Punkte neu nummerieren; äußere Punkte auf die Schnittlinie schieben (saubere Kante statt Zacken)
  const map = new Int32Array(n).fill(-1), src = [];
  tri.forEach((v) => { if (map[v] < 0) { map[v] = src.length; src.push(v); } });
  const nb = src.map(() => new Set()); for (let t = 0; t < tri.length; t += 3) for (let k = 0; k < 3; k++) { const a = map[tri[t + k]], b = map[tri[t + (k + 1) % 3]]; nb[a].add(b); nb[b].add(a); }
  const m = src.length, pos = new Float32Array(m * 3), nor = new Float32Array(m * 3);
  for (let j = 0; j < m; j++) {
    const i = src[j]; let x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
    if (f[i] <= 0) {
      let sx = 0, sy = 0, sz = 0, k = 0;
      nb[j].forEach((o) => { const u = src[o]; if (f[u] > 0) { const t = f[i] / (f[i] - f[u]); sx += x + (P[u * 3] - x) * t; sy += y + (P[u * 3 + 1] - y) * t; sz += z + (P[u * 3 + 2] - z) * t; k++; } });
      if (k) { x = sx / k; y = sy / k; z = sz / k; }
    }
    pos[j * 3] = x; pos[j * 3 + 1] = y; pos[j * 3 + 2] = z;
    nor[j * 3] = Nn[i * 3]; nor[j * 3 + 1] = Nn[i * 3 + 1]; nor[j * 3 + 2] = Nn[i * 3 + 2];
  }
  const tris = tri.map((v) => map[v]);
  return { src: src, pos: pos, nor: nor, tris: tris, side: src.map((i) => side[i]), armT: src.map((i) => armT[i]), body: P };
}

// Hülle: größter Abstand von einer senkrechten Achse je Richtung, von oben nach unten aufaddiert (Stoff fällt von der breitesten Stelle)
function hull(pts, cx, cz, y0, y1, NA, NY) {
  const H = new Float32Array(NA * NY);
  pts.forEach(([x, y, z]) => { if (y < y0 || y > y1) return; const a = Math.min(NA - 1, Math.floor((Math.atan2(x - cx, z - cz) + Math.PI) / (Math.PI * 2) * NA)), j = Math.min(NY - 1, Math.floor((y1 - y) / (y1 - y0) * NY)); H[j * NA + a] = Math.max(H[j * NA + a], Math.hypot(x - cx, z - cz)); });
  for (let a = 0; a < NA; a++) for (let j = 1; j < NY; j++) H[j * NA + a] = Math.max(H[j * NA + a], H[(j - 1) * NA + a]);
  // leere Richtungen mit Nachbarn füllen
  for (let j = 0; j < NY; j++) for (let a = 0; a < NA; a++) if (!H[j * NA + a]) H[j * NA + a] = Math.max(H[j * NA + (a + 1) % NA], H[j * NA + (a + NA - 1) % NA]);
  return (x, y, z) => { const a = Math.min(NA - 1, Math.floor((Math.atan2(x - cx, z - cz) + Math.PI) / (Math.PI * 2) * NA)), j = Math.max(0, Math.min(NY - 1, Math.floor((y1 - y) / (y1 - y0) * NY))); return H[j * NA + a]; };
}

// ---------- Weites Kleidungsstück bauen: Schnitt + Lockerheit + Saum ----------
export function buildLoose(data, kind) {
  const C = cut(data, kind), m = C.src.length, J = data.head.joints, P = C.pos, BP = C.body;
  const shirt = kind === "shirt" || kind === "longshirt";
  const out = new Float32Array(m * 3), pin = new Float32Array(m), v = new THREE.Vector3(), nn = new THREE.Vector3();
  let H = null, HL = null, HR = null;
  if (shirt) {
    const pts = []; for (let i = 0; i < BP.length / 3; i++) { const y = BP[i * 3 + 1], x = BP[i * 3]; if (y > 0.66 && y < 0.98 && Math.abs(x) < 0.13) pts.push([x, y, BP[i * 3 + 2]]); }
    H = hull(pts, 0, -0.02, 0.6, 0.96, 48, 36);
  } else {
    const mk = (s) => { const pts = []; for (let i = 0; i < BP.length / 3; i++) { const x = BP[i * 3], y = BP[i * 3 + 1]; if (y < 0.66 && y > 0.05 && x * s > 0 && Math.abs(x) < 0.17) pts.push([x, y, BP[i * 3 + 2]]); } return hull(pts, s * 0.077, -0.045, 0.05, 0.64, 40, 60); };
    HL = mk(1); HR = mk(-1);
  }
  for (let j = 0; j < m; j++) {
    v.fromArray(P, j * 3); nn.fromArray(C.nor, j * 3); const y = v.y, sd = C.side[j];
    if (shirt) {
      if (sd === 1) {   // Ärmel: weiter, zum Ende hin mehr
        const ease = kind === "shirt" ? 0.012 + 0.008 * Math.max(0, C.armT[j]) / 0.085 : 0.008 + 0.022 * Math.min(1, Math.max(0, C.armT[j]) / 0.3);
        v.addScaledVector(nn, ease); pin[j] = kind === "shirt" ? 0.7 : 0.75 - 0.4 * Math.min(1, Math.max(0, C.armT[j]) / 0.3);
      } else {
        const k = 1 - Math.min(1, Math.max(0, (y - 0.9) / 0.07));   // ab der Brust abwärts senkrecht fallen
        const dx = v.x, dz = v.z + 0.02, r = Math.hypot(dx, dz), R = Math.max(r, H(v.x, y, v.z)) + 0.011;
        const flat = v.clone().addScaledVector(nn, 0.008), drop = new THREE.Vector3(dx / r * R, y, dz / r * R - 0.02);
        v.copy(flat.lerp(drop, k * (r > 1e-4 ? 1 : 0)));
        pin[j] = 0.25 + 0.65 * Math.min(1, Math.max(0, (y - 0.7) / 0.28));
      }
    } else {
      if (y < 0.66) {
        const s = v.x >= 0 ? 1 : -1, cx = s * 0.077, cz = -0.045, dx = v.x - cx, dz = v.z - cz, r = Math.hypot(dx, dz);
        const ease = 0.012 + 0.03 * Math.min(1, (0.64 - y) / 0.5), R = Math.max(r, (s > 0 ? HL : HR)(v.x, y, v.z)) + ease;
        const k = Math.min(1, (0.66 - y) / 0.06);
        let nx = cx + dx / r * R, nz = cz + dz / r * R; if (nx * s < 0.006) nx = s * 0.006;   // nicht über die Mitte ins andere Bein
        v.lerp(new THREE.Vector3(nx, y, nz), k).addScaledVector(nn, 0.006 * (1 - k));
      } else v.addScaledVector(nn, 0.008);
      pin[j] = 0.18 + 0.75 * Math.min(1, Math.max(0, (y - 0.12) / 0.6)) ** 1.6;
    }
    out[j * 3] = v.x; out[j * 3 + 1] = v.y; out[j * 3 + 2] = v.z;
  }
  // Saum nach unten verlängern (Shirt lang bis über den Po, lange Hose etwas über den Fuß)
  const ext = kind === "longshirt" ? { rows: 4, to: 0.575 } : kind === "baggy" ? { rows: 1, to: 0.075 } : null;
  let tris = C.tris.slice(), src = C.src.slice(), pins = Array.from(pin), pos = Array.from(out), extra = [];
  if (ext) {
    const E = new Map(); for (let t = 0; t < tris.length; t += 3) for (let k = 0; k < 3; k++) { const a = tris[t + k], b = tris[t + (k + 1) % 3], key = a + "_" + b; E.set(key, [a, b]); }
    const hem = []; E.forEach(([a, b]) => { if (!E.has(b + "_" + a) && pos[a * 3 + 1] < (shirt ? 0.73 : 0.13) && pos[b * 3 + 1] < (shirt ? 0.73 : 0.13)) hem.push([a, b]); });
    const copy = new Map(); const rowOf = (a, r) => {
      const key = a + "_" + r; if (copy.has(key)) return copy.get(key);
      const y0 = pos[a * 3 + 1], t = r / ext.rows, ny = y0 + (ext.to - y0) * t, id = pos.length / 3;
      let x = pos[a * 3], z = pos[a * 3 + 2];
      if (!shirt) { const s = x >= 0 ? 1 : -1, cx = s * 0.077, cz = -0.045, f = 1 + 0.12 * t; x = cx + (x - cx) * f; z = cz + (z - cz) * f; }
      else { const f = 1 + 0.05 * t; x *= f; z = -0.02 + (z + 0.02) * f; }
      pos.push(x, ny, z); src.push(src[a]); pins.push(Math.max(0.05, pins[a] * (1 - 0.8 * t))); extra.push(id); copy.set(key, id); return id;
    };
    hem.forEach(([a, b]) => {
      let pa = a, pb = b;
      for (let r = 1; r <= ext.rows; r++) { const na = rowOf(a, r), nb2 = rowOf(b, r); tris.push(pa, nb2, pb, pa, na, nb2); pa = na; pb = nb2; }
    });
  }
  return { kind: kind, pos: new Float32Array(pos), src: Int32Array.from(src), pin: Float32Array.from(pins), tris: tris, isExtra: new Set(extra), bodyCount: C.src.length };
}

// ---------- Stoff mit Physik ----------
export class Cloth {
  constructor(fig, kind, color) {
    this.fig = fig; const data = fig.data;
    const D = data.cloth || (data.cloth = {}), B = D[kind] || (D[kind] = buildLoose(data, kind));
    this.B = B; const m = B.pos.length / 3; this.m = m;
    const g = data.geo, SI = g.attributes.skinIndex.array, SW = g.attributes.skinWeight.array, BPos = g.attributes.position.array, BN = g.attributes.normal.array;
    // Gewichte und Hautpunkt je Stoffpunkt
    this.si = new Uint8Array(m * 4); this.sw = new Float32Array(m * 4); this.bp = new Float32Array(m * 3); this.bn = new Float32Array(m * 3);
    for (let j = 0; j < m; j++) { const s = B.src[j]; for (let k = 0; k < 4; k++) { this.si[j * 4 + k] = SI[s * 4 + k]; this.sw[j * 4 + k] = SW[s * 4 + k]; } for (let k = 0; k < 3; k++) { this.bp[j * 3 + k] = BPos[s * 3 + k]; this.bn[j * 3 + k] = BN[s * 3 + k]; } }
    // Kanten (Stofflängen)
    const E = new Map(), T = B.tris; for (let t = 0; t < T.length; t += 3) for (let k = 0; k < 3; k++) { let a = T[t + k], b = T[t + (k + 1) % 3]; if (a > b) { const x = a; a = b; b = x; } E.set(a * 1e6 + b, [a, b]); }
    this.ea = new Int32Array(E.size); this.eb = new Int32Array(E.size); this.el = new Float32Array(E.size); let e = 0;
    E.forEach(([a, b]) => { this.ea[e] = a; this.eb[e] = b; this.el[e] = Math.hypot(B.pos[a * 3] - B.pos[b * 3], B.pos[a * 3 + 1] - B.pos[b * 3 + 1], B.pos[a * 3 + 2] - B.pos[b * 3 + 2]); e++; });
    this.p = new Float32Array(m * 3); this.q = new Float32Array(m * 3); this.anc = new Float32Array(m * 3); this.hb = new Float32Array(m * 3); this.hn = new Float32Array(m * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this.p, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(m * 3), 3).setUsage(THREE.DynamicDrawUsage));
    geo.setIndex(B.tris);
    this.mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.86, metalness: 0, side: THREE.DoubleSide });
    this.mat.shadowSide = THREE.FrontSide;
    this.mesh = new THREE.Mesh(geo, this.mat); this.mesh.frustumCulled = false; this.mesh.castShadow = true; this.mesh.receiveShadow = true;
    fig.scene.add(this.mesh);
    this.M = BONES.map(() => new THREE.Matrix4()); this.first = true;
    // Mindestabstand zur Haut: Shirt-Saum hängt weiter weg (fällt sonst in den Hosenbund), sonst 4 mm
    const sh = kind === "shirt" || kind === "longshirt"; this.mn = new Float32Array(m);
    for (let j = 0; j < m; j++) this.mn[j] = sh && B.pos[j * 3 + 1] < 0.84 ? 0.017 : 0.004;
    this.caps = [["LeftUpperLeg", "LeftLowerLeg", 0.055], ["RightUpperLeg", "RightLowerLeg", 0.055], ["LeftLowerLeg", "LeftFoot", 0.042], ["RightLowerLeg", "RightFoot", 0.042],
      ["LeftLowerArm", "LeftHand", 0.03], ["RightLowerArm", "RightHand", 0.03]].map(([a, b, r]) => ({ a: BI[a], b: BI[b], r: r, A: new THREE.Vector3(), B: new THREE.Vector3() }));
  }
  setColor(c) { this.mat.color.set(c); }
  // Anker und Hautstelle in der aktuellen Pose (Linear Blend Skinning auf der CPU)
  skin() {
    const sk = this.fig.mesh.skeleton, M = this.M, e = M.map((x) => x.elements);
    for (let i = 0; i < M.length; i++) M[i].multiplyMatrices(sk.bones[i].matrixWorld, sk.boneInverses[i]);
    const B = this.B.pos, bp = this.bp, bn = this.bn, si = this.si, sw = this.sw, A = this.anc, HB = this.hb, HN = this.hn;
    for (let j = 0; j < this.m; j++) {
      let ax = 0, ay = 0, az = 0, bx = 0, by = 0, bz = 0, nx = 0, ny = 0, nz = 0;
      const x = B[j * 3], y = B[j * 3 + 1], z = B[j * 3 + 2], X = bp[j * 3], Y = bp[j * 3 + 1], Z = bp[j * 3 + 2], u = bn[j * 3], v = bn[j * 3 + 1], w = bn[j * 3 + 2];
      for (let k = 0; k < 4; k++) {
        const wt = sw[j * 4 + k]; if (wt <= 0) continue; const m = e[si[j * 4 + k]];
        ax += wt * (m[0] * x + m[4] * y + m[8] * z + m[12]); ay += wt * (m[1] * x + m[5] * y + m[9] * z + m[13]); az += wt * (m[2] * x + m[6] * y + m[10] * z + m[14]);
        bx += wt * (m[0] * X + m[4] * Y + m[8] * Z + m[12]); by += wt * (m[1] * X + m[5] * Y + m[9] * Z + m[13]); bz += wt * (m[2] * X + m[6] * Y + m[10] * Z + m[14]);
        nx += wt * (m[0] * u + m[4] * v + m[8] * w); ny += wt * (m[1] * u + m[5] * v + m[9] * w); nz += wt * (m[2] * u + m[6] * v + m[10] * w);
      }
      const nl = Math.hypot(nx, ny, nz) || 1;
      A[j * 3] = ax; A[j * 3 + 1] = ay; A[j * 3 + 2] = az; HB[j * 3] = bx; HB[j * 3 + 1] = by; HB[j * 3 + 2] = bz; HN[j * 3] = nx / nl; HN[j * 3 + 1] = ny / nl; HN[j * 3 + 2] = nz / nl;
    }
    const tmp = new THREE.Vector3();
    this.caps.forEach((c) => { c.A.setFromMatrixPosition(sk.bones[c.a].matrixWorld); c.B.setFromMatrixPosition(sk.bones[c.b].matrixWorld); });
    return tmp;
  }
  reset() { this.fig.root.updateMatrixWorld(true); this.skin(); this.p.set(this.anc); this.q.set(this.anc); this.normals(); }
  update(dt, wind) {
    this.fig.root.updateMatrixWorld(true); this.skin();
    if (this.first) { this.first = false; this.p.set(this.anc); this.q.set(this.anc); }
    const steps = Math.max(1, Math.min(3, Math.ceil(dt / (1 / 75)))), h = dt / steps, m = this.m, p = this.p, q = this.q, A = this.anc, pin = this.B.pin;
    const g = -9.81 * h * h, wx = (wind ? wind.x : 0) * 0.06 * h, wz = (wind ? wind.z : 0) * 0.06 * h, damp = 0.95;
    const kk = new Float32Array(m); for (let j = 0; j < m; j++) kk[j] = 1 - Math.pow(1 - Math.min(0.95, pin[j] * pin[j] * 0.55 + 0.02), h * 60);
    for (let s = 0; s < steps; s++) {
      for (let j = 0; j < m; j++) {
        const i = j * 3;
        for (let c = 0; c < 3; c++) { const vel = (p[i + c] - q[i + c]) * damp; q[i + c] = p[i + c]; p[i + c] += vel; }
        p[i + 1] += g; p[i] += wx; p[i + 2] += wz;
        const k = kk[j]; p[i] += (A[i] - p[i]) * k; p[i + 1] += (A[i + 1] - p[i + 1]) * k; p[i + 2] += (A[i + 2] - p[i + 2]) * k;
      }
      // Stofflängen (nur gegen Dehnen, Stauchen erlaubt: Stoff wirft Falten statt zu federn)
      for (let it = 0; it < 3; it++) for (let e = 0; e < this.el.length; e++) {
        const a = this.ea[e] * 3, b = this.eb[e] * 3, dx = p[b] - p[a], dy = p[b + 1] - p[a + 1], dz = p[b + 2] - p[a + 2], l = Math.hypot(dx, dy, dz), L = this.el[e];
        if (l <= L * 1.02 || l < 1e-7) continue; const c = (l - L * 1.02) / l * 0.5, wa = pin[this.ea[e]], wb = pin[this.eb[e]], s2 = wa + wb + 1e-3, fa = (1 - wa / s2) * 2, fb = (1 - wb / s2) * 2;
        p[a] += dx * c * fa * 0.5; p[a + 1] += dy * c * fa * 0.5; p[a + 2] += dz * c * fa * 0.5; p[b] -= dx * c * fb * 0.5; p[b + 1] -= dy * c * fb * 0.5; p[b + 2] -= dz * c * fb * 0.5;
      }
      // nie unter die Haut: Abstand zur gehäuteten Hautstelle entlang ihrer Normale
      const HB = this.hb, HN = this.hn;
      for (let j = 0; j < m; j++) {
        const i = j * 3, d = (p[i] - HB[i]) * HN[i] + (p[i + 1] - HB[i + 1]) * HN[i + 1] + (p[i + 2] - HB[i + 2]) * HN[i + 2], mn = this.mn[j];
        if (d < mn && (d > -0.06 || this.B.isExtra.has(j) === false)) { const c = mn - d; p[i] += HN[i] * c; p[i + 1] += HN[i + 1] * c; p[i + 2] += HN[i + 2] * c; }
      }
      // Beine und Unterarme schieben den losen Stoff weg
      for (const C of this.caps) {
        const ax = C.A.x, ay = C.A.y, az = C.A.z, bx = C.B.x - ax, by = C.B.y - ay, bz = C.B.z - az, ll = bx * bx + by * by + bz * bz;
        for (let j = 0; j < m; j++) {
          if (pin[j] > 0.55) continue; const i = j * 3;
          let t = ((p[i] - ax) * bx + (p[i + 1] - ay) * by + (p[i + 2] - az) * bz) / ll; t = t < 0 ? 0 : t > 1 ? 1 : t;
          const cx = p[i] - (ax + bx * t), cy = p[i + 1] - (ay + by * t), cz = p[i + 2] - (az + bz * t), l = Math.hypot(cx, cy, cz);
          if (l < C.r && l > 1e-6) { const f = (C.r - l) / l; p[i] += cx * f; p[i + 1] += cy * f; p[i + 2] += cz * f; }
        }
      }
    }
    this.normals();
  }
  normals() { const g = this.mesh.geometry; g.attributes.position.needsUpdate = true; g.computeVertexNormals(); }
  dispose() { this.fig.scene.remove(this.mesh); this.mesh.geometry.dispose(); this.mat.dispose(); }
}
