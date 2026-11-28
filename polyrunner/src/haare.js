// ===== haare.js · Haare (seit v0.15): Strähnen im Anime-Stil mit leichter Physik =====
// Daten (im Look): hair = { groups: [{ id, len (m), type, color, thick }], roots: [[x, y, z, nx, ny, nz, gruppe], …] }
// Wurzeln liegen in Ruhe-Koordinaten der Figur (wie position im Modell). Jede Wurzel = eine breite, spitz zulaufende Strähne (keine Einzelhaare).
// Ruheform: vom Scheitel aus der Schwerkraft folgend am Kopf entlang gekämmt, dann fallend; Typ verformt (Wellen, Locken, wild, Braids, Dreads).
// Physik je Strähne: Punktkette (Verlet), Wurzel fest am Kopf, Rückzug zur Ruheform (an der Wurzel stark, an der Spitze schwach),
// Kollision mit Kopf (radiale Höhenkarte aus dem Modell), Hals, Oberkörper und Schultern. Fahrtwind über wind (m/s).
import * as THREE from "three";
import { BONES } from "pru/runner.js";

export const HAIR_TYPES = ["glatt", "wellen", "locken", "wild", "braids", "dreads", "dreadsdick"];
export const HAIRC = ["#1E1A18", "#3B2A22", "#6B4630", "#A0703F", "#D9B36A", "#F1E6C8", "#E9E5DC", "#C24A3A", "#E2621B", "#E58FB0", "#8E6C8A", "#3F7CAC", "#5FC2CF", "#4E8F5A"];
export function newGroup(id, color) { return { id: id, len: 0.14, type: "glatt", color: color || "#3B2A22", thick: 1 }; }
export function cloneHair(h) {
  const o = h || {}, g = (o.groups && o.groups.length ? o.groups : [newGroup(1)]).map((x) => Object.assign(newGroup(x.id), x));
  return { groups: g, roots: (o.roots || []).filter((r) => r && r.length >= 7).map((r) => r.slice(0, 7)) };
}

// ---------- Kopf-Höhenkarte: größter Abstand der Haut vom Kopfmittelpunkt je Richtung ----------
const NA = 64, NB = 40, HC = new THREE.Vector3(0, 1.285, -0.012);
function headMap(data) {
  if (data.hmap) return data.hmap;
  const g = data.geo, P = g.attributes.position.array, part = g.attributes.aPart.array, n = P.length / 3;
  const m = new Float32Array(NA * NB).fill(-1);
  for (let i = 0; i < n; i++) {
    if (P[i * 3 + 1] < 1.1 || part[i] > 3.5) continue;
    const dx = P[i * 3] - HC.x, dy = P[i * 3 + 1] - HC.y, dz = P[i * 3 + 2] - HC.z, r = Math.hypot(dx, dy, dz);
    const a = Math.min(NA - 1, Math.floor((Math.atan2(dx, dz) + Math.PI) / (Math.PI * 2) * NA)), b = Math.min(NB - 1, Math.floor(Math.acos(dy / r) / Math.PI * NB));
    if (r > m[b * NA + a]) m[b * NA + a] = r;
  }
  // Lücken füllen (Nachbarn mitteln), dann leicht glätten (nur nach oben, nie in den Kopf)
  for (let it = 0; it < 60; it++) {
    let left = 0; const c = m.slice();
    for (let b = 0; b < NB; b++) for (let a = 0; a < NA; a++) {
      if (m[b * NA + a] >= 0) continue; let s = 0, k = 0;
      [[a - 1, b], [a + 1, b], [a, b - 1], [a, b + 1]].forEach(([x, y]) => { if (y < 0 || y >= NB) return; const v = m[y * NA + ((x + NA) % NA)]; if (v >= 0) { s += v; k++; } });
      if (k) c[b * NA + a] = s / k; else left++;
    }
    m.set(c); if (!left) break;
  }
  for (let i = 0; i < m.length; i++) if (m[i] < 0) m[i] = 0.05;
  const s = m.slice();
  for (let b = 0; b < NB; b++) for (let a = 0; a < NA; a++) { let mx = m[b * NA + a]; [[a - 1, b], [a + 1, b], [a, b - 1], [a, b + 1]].forEach(([x, y]) => { if (y >= 0 && y < NB) mx = Math.max(mx, m[y * NA + ((x + NA) % NA)] * 0.98); }); s[b * NA + a] = mx; }
  // Kopf-Teilnetz (nur Haut über dem Hals) zum Malen: Strahlen werden in Ruhe-Koordinaten getestet
  const idx = g.index.array, tri = [];
  for (let t = 0; t < idx.length; t += 3) { const a = idx[t], b = idx[t + 1], c = idx[t + 2]; if (part[a] < 1.5 && part[b] < 1.5 && part[c] < 1.5 && P[a * 3 + 1] > 1.13 && P[b * 3 + 1] > 1.13 && P[c * 3 + 1] > 1.13) tri.push(a, b, c); }
  const hg = new THREE.BufferGeometry(); hg.setAttribute("position", g.attributes.position); hg.setIndex(tri); hg.computeBoundingSphere();
  data.hmap = { m: s, mesh: new THREE.Mesh(hg, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })) };
  data.hmap.mesh.updateMatrixWorld(true);
  return data.hmap;
}
function surfR(H, d) {   // Hautabstand in Richtung d (normiert, vom Kopfmittelpunkt), bilinear
  const fa = (Math.atan2(d.x, d.z) + Math.PI) / (Math.PI * 2) * NA - 0.5, fb = Math.acos(Math.max(-1, Math.min(1, d.y))) / Math.PI * NB - 0.5;
  const a0 = Math.floor(fa), b0 = Math.max(0, Math.min(NB - 2, Math.floor(fb))), ta = fa - a0, tb = Math.max(0, Math.min(1, fb - b0));
  const g = (a, b) => H.m[b * NA + ((a % NA) + NA) % NA];
  return (g(a0, b0) * (1 - ta) + g(a0 + 1, b0) * ta) * (1 - tb) + (g(a0, b0 + 1) * (1 - ta) + g(a0 + 1, b0 + 1) * ta) * tb;
}
const _d = new THREE.Vector3();
// Punkt (Ruhe-Koordinaten) aus dem Kopf schieben: mindestens shell über der Haut
function pushHead(H, p, shell) {
  _d.copy(p).sub(HC); const r = _d.length(); if (r < 1e-5) return false; _d.multiplyScalar(1 / r);
  const R = surfR(H, _d) + shell; if (r >= R) return false;
  p.copy(HC).addScaledVector(_d, R); return true;
}
// Kapsel (Ruhe-Koordinaten): Punkt aus Strecke a–b mit Radius rad schieben
function pushCaps(p, a, b, rad) {
  const ab = _d.copy(b).sub(a), t = Math.max(0, Math.min(1, p.clone().sub(a).dot(ab) / ab.lengthSq())), c = a.clone().addScaledVector(ab, t), v = p.clone().sub(c), l = v.length();
  if (l >= rad || l < 1e-6) return false; p.copy(c).addScaledVector(v, rad / l); return true;
}
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const DOWN = new THREE.Vector3(0, -1, 0), BACK = new THREE.Vector3(0, 0, -1);
// Kollisionskörper außer dem Kopf: [Knochen, a, b, Radius] in Ruhe-Koordinaten
const COLL = [
  ["Neck", [0, 1.07, -0.03], [0, 1.17, -0.02], 0.048],
  ["Chest", [0, 0.86, -0.035], [0, 1.03, -0.035], 0.118],
  ["Chest", [0.12, 1.035, -0.04], [0.15, 1.02, -0.04], 0.052], ["Chest", [-0.12, 1.035, -0.04], [-0.15, 1.02, -0.04], 0.052],
  ["Spine", [0, 0.7, -0.03], [0, 0.86, -0.03], 0.115]
];

export class Hair {
  constructor(fig) {
    this.fig = fig; this.H = headMap(fig.data);
    this.bi = {}; BONES.forEach(([n], i) => { this.bi[n] = i; });
    this.colls = COLL.map(([bn, a, b, r]) => ({ bi: this.bi[bn], a: new THREE.Vector3().fromArray(a), b: new THREE.Vector3().fromArray(b), r: r }));
    this.mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.52, metalness: 0, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), this.mat); this.mesh.frustumCulled = false; this.mesh.castShadow = true; this.mesh.receiveShadow = true;
    fig.scene.add(this.mesh);
    this.M = new THREE.Matrix4(); this.Mi = new THREE.Matrix4(); this.CM = this.colls.map(() => ({ m: new THREE.Matrix4(), mi: new THREE.Matrix4() }));
    this.strands = []; this.key = ""; this.wind = new THREE.Vector3();
  }
  // Ruhe → Welt für einen Knochen (wie im Skinning): Knochen-Weltmatrix × Bind-Inverse
  boneM(i, out) { const sk = this.fig.mesh.skeleton; return out.multiplyMatrices(sk.bones[i].matrixWorld, sk.boneInverses[i]); }
  setData(h) {
    const k = JSON.stringify(h); if (k === this.key) return; this.key = k;
    this.h = cloneHair(h); this.rebuild();
  }
  // ---------- Strähnen aus den Wurzeln bauen ----------
  rebuild() {
    const G = {}; this.h.groups.forEach((g) => { G[g.id] = g; });
    this.strands = [];
    this.h.roots.forEach((r) => {
      const g = G[r[6]] || this.h.groups[0]; if (!g) return;
      const root = new THREE.Vector3(r[0], r[1], r[2]), n = new THREE.Vector3(r[3], r[4], r[5]).normalize();
      this.strands.push(this.makeStrand(root, n, g, (Math.round(r[0] * 1e4) * 73856093) ^ (Math.round(r[1] * 1e4) * 19349663) ^ (Math.round(r[2] * 1e4) * 83492791)));
    });
    this.alloc(); this.reset(); this.tint();
  }
  makeStrand(root, n, g, seed) {
    const R = rng(seed), type = g.type, len = Math.max(0.02, g.len), th = g.thick || 1;
    const round = type === "braids" || type === "dreads" || type === "dreadsdick";
    const N = Math.max(5, Math.min(18, Math.round(len / 0.022) + 3)), seg = len / (N - 1);
    const shell = (round ? (type === "dreadsdick" ? 0.007 : type === "braids" ? 0.006 : 0.004) * th : 0.005 * th) + 0.004 + R() * 0.008;
    const lift = type === "wild" ? 0.42 + R() * 0.25 : 0.18 + R() * 0.1;
    let gt = DOWN.clone().addScaledVector(n, -DOWN.dot(n)); if (gt.length() < 0.25) gt = BACK.clone().addScaledVector(n, -BACK.dot(n)); gt.normalize();
    let dir = gt.clone().addScaledVector(n, lift).normalize();
    const pts = [root.clone().addScaledVector(n, shell * 0.4)], jit = new THREE.Vector3();
    for (let i = 1; i < N; i++) {
      const p = pts[i - 1], q = p.clone().addScaledVector(dir, seg);
      pushHead(this.H, q, shell + i * 0.0003);
      dir = q.clone().sub(p).normalize();
      if (type === "wild") { jit.set(R() - 0.5, R() - 0.5, R() - 0.5).multiplyScalar(0.2); dir.addScaledVector(DOWN, 0.13).add(jit).normalize(); }
      else dir.addScaledVector(DOWN, 0.3).normalize();
      pts.push(q);
    }
    // Typ-Verformung quer zur Strähne
    if (type === "wellen" || type === "locken" || type === "wild") {
      const ph = R() * Math.PI * 2;
      for (let i = 1; i < N; i++) {
        const t = i / (N - 1), T = pts[Math.min(N - 1, i + 1)].clone().sub(pts[i - 1]).normalize(), S = new THREE.Vector3().crossVectors(T, n).normalize(), U = new THREE.Vector3().crossVectors(S, T);
        const s = t * len;
        if (type === "wellen") pts[i].addScaledVector(S, Math.sin(s / 0.075 * Math.PI * 2 + ph) * 0.011 * Math.min(1, t * 3));
        else if (type === "locken") { const a = s / 0.032 * Math.PI * 2 + ph, k = 0.013 * Math.min(1, t * 2.5); pts[i].addScaledVector(S, Math.cos(a) * k).addScaledVector(U, Math.sin(a) * k); }
        else pts[i].addScaledVector(S, (R() - 0.5) * 0.012 * t).addScaledVector(U, (R() - 0.5) * 0.012 * t);
        pushHead(this.H, pts[i], shell + i * 0.0003);
      }
    }
    // Querschnitt je Ring: halbe Breite w, halbe Tiefe d (flache Anime-Strähne oder runde Braids/Dreads)
    const prof = (t, s) => {
      if (type === "braids") { const r = 0.0062 * th; return t > 0.94 ? [r * 0.6, r * 0.6] : [r * (0.78 + 0.32 * Math.abs(Math.sin(s / 0.021 * Math.PI))), r * (0.78 + 0.32 * Math.abs(Math.sin(s / 0.021 * Math.PI + 1.57)))]; }
      if (type === "dreads" || type === "dreadsdick") { const r = (type === "dreadsdick" ? 0.0068 : 0.0036) * th * (0.92 + 0.12 * Math.sin(s / 0.012 * 2.3)); return t > 0.97 ? [r * 0.55, r * 0.55] : [r, r]; }
      // breite Anime-Strähne: an der Wurzel etwas schmaler, Mitte voll, letztes Drittel läuft spitz zu
      const w = 0.017 * th * (0.72 + 0.28 * Math.min(1, t * 5)) * (t < 0.45 ? 1 : 1 - 0.94 * Math.pow((t - 0.45) / 0.55, 1.3)) * (type === "locken" ? 0.75 : 1);
      return [w, Math.max(0.0008, w * 0.34)];
    };
    const col = new THREE.Color(g.color);
    return { rest: pts, n: n, N: N, seg: seg, shell: shell, prof: prof, round: round, col: col, type: type, len: len,
      p: pts.map((v) => v.clone()), q: pts.map((v) => v.clone()), stiff: type === "dreadsdick" || type === "braids" ? 0.75 : type === "wild" ? 1.4 : 1 };
  }
  // ---------- Netz: je Strähne Ringe (zwischen den Punkten verfeinert) × 6 Seiten + Spitze ----------
  alloc() {
    const K = 6; let nv = 0, ni = 0;
    this.strands.forEach((s) => { s.rings = (s.N - 1) * 2 + 1; s.v0 = nv; nv += s.rings * K + 1; ni += (s.rings - 1) * K * 6 + K * 3; });
    const g = new THREE.BufferGeometry(), idx = new Uint32Array(ni);
    const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), col = new Float32Array(nv * 3);
    let o = 0;
    this.strands.forEach((s) => {
      for (let r = 0; r < s.rings - 1; r++) for (let k = 0; k < K; k++) { const a = s.v0 + r * K + k, b = s.v0 + r * K + (k + 1) % K, c = a + K, d = b + K; idx[o++] = a; idx[o++] = c; idx[o++] = b; idx[o++] = b; idx[o++] = c; idx[o++] = d; }
      const tip = s.v0 + s.rings * K, last = s.v0 + (s.rings - 1) * K;
      for (let k = 0; k < K; k++) { idx[o++] = last + k; idx[o++] = tip; idx[o++] = last + (k + 1) % K; }
      // Farbe: Ansatz dunkler, Spitze etwas heller, Braids mit Schatten zwischen den Gliedern
      for (let r = 0; r <= s.rings; r++) {
        const t = Math.min(1, r / (s.rings - 1)), f = 0.62 + 0.46 * Math.pow(t, 0.7);
        for (let k = 0; k < (r === s.rings ? 1 : K); k++) { const i = s.v0 + r * K + k, sh = s.round ? 1 : (k === 1 || k === 2 ? 1.08 : k === 4 || k === 5 ? 0.82 : 1); col[i * 3] = s.col.r * f * sh; col[i * 3 + 1] = s.col.g * f * sh; col[i * 3 + 2] = s.col.b * f * sh; }
      }
    });
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("normal", new THREE.BufferAttribute(nor, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    this.mesh.geometry.dispose(); this.mesh.geometry = g; this.mesh.visible = this.strands.length > 0;
  }
  // Punkte auf die Ruheform in der aktuellen Pose setzen
  reset() {
    if (!this.fig.mesh.skeleton) return;
    this.fig.root.updateMatrixWorld(true); this.boneM(this.bi.Head, this.M);
    this.strands.forEach((s) => { for (let i = 0; i < s.N; i++) { s.p[i].copy(s.rest[i]).applyMatrix4(this.M); s.q[i].copy(s.p[i]); } });
    this.write();
  }
  // Kopfhaut unter dem Haar in Haarfarbe tönen (keine kahlen Lücken zwischen den Strähnen)
  tint() {
    const geo = this.fig.mesh.geometry, P = geo.attributes.position.array, n = P.length / 3;
    let a = geo.getAttribute("aHair"); if (!a) { a = new THREE.BufferAttribute(new Float32Array(n * 4), 4); geo.setAttribute("aHair", a); }
    const A = a.array; A.fill(0);
    const G = {}; this.h.groups.forEach((g) => { G[g.id] = g; });
    const roots = this.h.roots.map((r) => ({ x: r[0], y: r[1], z: r[2], c: new THREE.Color((G[r[6]] || this.h.groups[0]).color), w: 0.02 * ((G[r[6]] || {}).thick || 1) + 0.012 }));
    if (roots.length) for (let i = 0; i < n; i++) {
      const y = P[i * 3 + 1]; if (y < 1.12) continue;
      let best = 0, bc = null;
      for (const r of roots) { const d = Math.hypot(P[i * 3] - r.x, y - r.y, P[i * 3 + 2] - r.z); if (d < r.w) { const k = 1 - d / r.w; if (k > best) { best = k; bc = r.c; } } }
      if (bc) { const k = Math.min(1, best * 3); A[i * 4] = bc.r * 0.55; A[i * 4 + 1] = bc.g * 0.55; A[i * 4 + 2] = bc.b * 0.55; A[i * 4 + 3] = k; }
    }
    a.needsUpdate = true;
  }
  // ---------- Physik ----------
  update(dt, wind) {
    if (!this.strands.length) return;
    if (wind) this.wind.copy(wind); else this.wind.set(0, 0, 0);
    this.fig.root.updateMatrixWorld(true);
    this.boneM(this.bi.Head, this.M); this.Mi.copy(this.M).invert();
    this.colls.forEach((c, i) => { this.boneM(c.bi, this.CM[i].m); this.CM[i].mi.copy(this.CM[i].m).invert(); });
    // Federkette wie Anime-„Spring Bones“: jedes Glied wird zur Ruherichtung (mit dem Kopf gedreht) gezogen, Trägheit mit Dämpfung,
    // Schwerkraft und Fahrtwind, dann Länge zum Vorgänger exakt halten (stabil, kein Zittern), danach Kollision.
    const steps = Math.max(1, Math.min(3, Math.ceil(dt / (1 / 75)))), h = dt / steps;
    const rd = new THREE.Vector3(), nx = new THREE.Vector3(), loc = new THREE.Vector3(), wv = this.wind.clone().multiplyScalar(0.11 * h);
    for (let st = 0; st < steps; st++) for (const s of this.strands) {
      const N = s.N;
      s.p[0].copy(s.rest[0]).applyMatrix4(this.M); s.q[0].copy(s.p[0]);
      for (let i = 1; i < N; i++) {
        const P = s.p[i], Q = s.q[i], A = s.p[i - 1], t = i / (N - 1);
        rd.copy(s.rest[i]).sub(s.rest[i - 1]).transformDirection(this.M);
        const stiff = (5.5 * Math.pow(1 - t, 1.2) + 1.1) * s.stiff, drag = 0.32;
        nx.copy(P).sub(Q).multiplyScalar(1 - drag).add(P).addScaledVector(rd, stiff * h).add(wv); nx.y -= 0.45 * h;
        nx.sub(A); const l = nx.length() || 1e-6; nx.multiplyScalar(s.seg / l).add(A);
        // Kollision: Kopf (Höhenkarte) und Körper, danach Länge wieder herstellen
        loc.copy(nx).applyMatrix4(this.Mi); if (pushHead(this.H, loc, s.shell * 0.85)) nx.copy(loc).applyMatrix4(this.M);
        for (let c = 0; c < this.colls.length; c++) { const C = this.colls[c]; loc.copy(nx).applyMatrix4(this.CM[c].mi); if (pushCaps(loc, C.a, C.b, C.r + s.shell)) nx.copy(loc).applyMatrix4(this.CM[c].m); }
        nx.sub(A); const l2 = nx.length() || 1e-6; nx.multiplyScalar(s.seg / l2).add(A);
        Q.copy(P); P.copy(nx);
      }
    }
    this.write();
  }
  // ---------- Netz aus den Punkten schreiben ----------
  write() {
    const g = this.mesh.geometry; if (!g.attributes.position) return;
    const pos = g.attributes.position.array, nor = g.attributes.normal.array, K = 6;
    const c = new THREE.Vector3(), T = new THREE.Vector3(), S = new THREE.Vector3(), U = new THREE.Vector3(), Nr = new THREE.Vector3(), tmp = new THREE.Vector3();
    const cr = (p0, p1, p2, p3, f, out) => out.set(
      0.5 * (2 * p1.x + (-p0.x + p2.x) * f + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * f * f + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * f * f * f),
      0.5 * (2 * p1.y + (-p0.y + p2.y) * f + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * f * f + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * f * f * f),
      0.5 * (2 * p1.z + (-p0.z + p2.z) * f + (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * f * f + (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * f * f * f));
    const prev = new THREE.Vector3(), next = new THREE.Vector3();
    for (const s of this.strands) {
      Nr.copy(s.n).transformDirection(this.M);
      const P = s.p, N = s.N, at = (r, out) => { const tt = r / 2, k = Math.min(N - 2, Math.floor(tt)), f = tt - k; return cr(P[Math.max(0, k - 1)], P[k], P[k + 1], P[Math.min(N - 1, k + 2)], f, out); };
      let Sp = null;
      for (let r = 0; r < s.rings; r++) {
        at(r, c); at(Math.max(0, r - 1), prev); at(Math.min(s.rings - 1, r + 1), next);
        T.copy(next).sub(prev); if (T.lengthSq() < 1e-12) T.set(0, -1, 0); T.normalize();
        S.crossVectors(T, Nr); if (S.lengthSq() < 1e-8) S.copy(Sp || tmp.set(1, 0, 0)); S.normalize(); if (Sp && S.dot(Sp) < 0) S.negate(); Sp = S.clone();
        U.crossVectors(S, T).normalize();
        const t = r / (s.rings - 1), wd = s.prof(t, t * s.len);
        for (let k = 0; k < K; k++) {
          const a = k / K * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a), i = (s.v0 + r * K + k) * 3;
          pos[i] = c.x + S.x * ca * wd[0] + U.x * sa * wd[1]; pos[i + 1] = c.y + S.y * ca * wd[0] + U.y * sa * wd[1]; pos[i + 2] = c.z + S.z * ca * wd[0] + U.z * sa * wd[1];
          tmp.copy(S).multiplyScalar(ca / Math.max(wd[0], 1e-4)).addScaledVector(U, sa / Math.max(wd[1], 1e-4)).normalize();
          if (!s.round) tmp.lerp(U.clone().multiplyScalar(sa >= 0 ? 1 : -1), 0.55).normalize();
          nor[i] = tmp.x; nor[i + 1] = tmp.y; nor[i + 2] = tmp.z;
        }
      }
      // Spitze
      const ti = (s.v0 + s.rings * K) * 3; c.copy(P[N - 1]).addScaledVector(T, s.round ? 0.003 : 0.008);
      pos[ti] = c.x; pos[ti + 1] = c.y; pos[ti + 2] = c.z; nor[ti] = T.x; nor[ti + 1] = T.y; nor[ti + 2] = T.z;
    }
    g.attributes.position.needsUpdate = true; g.attributes.normal.needsUpdate = true;
  }
  // ---------- Malen ----------
  // Strahl (Welt) → Treffer auf der Kopfhaut in Ruhe-Koordinaten { p, n } oder null
  pick(ray) {
    this.fig.root.updateMatrixWorld(true); this.boneM(this.bi.Head, this.M); this.Mi.copy(this.M).invert();
    const rc = new THREE.Raycaster(); rc.ray.copy(ray).applyMatrix4(this.Mi); rc.ray.direction.normalize();
    const hit = rc.intersectObject(this.H.mesh, false)[0]; if (!hit) return null;
    const n = hit.face.normal.clone(); if (n.dot(rc.ray.direction) > 0) n.negate();
    const rad = hit.point.clone().sub(HC).normalize(); n.lerp(rad, 0.35).normalize();
    return { p: hit.point.clone(), n: n };
  }
  // Ruhe-Punkt auf die Kopfhaut legen (für zusätzliche Wurzeln im Pinsel)
  onSkin(p) { const d = p.clone().sub(HC).normalize(); return HC.clone().addScaledVector(d, surfR(this.H, d)); }
  headMatrix() { return this.M; }
  dispose() { this.fig.scene.remove(this.mesh); this.mesh.geometry.dispose(); this.mat.dispose(); }
}
