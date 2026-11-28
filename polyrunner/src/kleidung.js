// ===== kleidung.js · Kleidung als echte Stoffnetze (seit v0.17, ersetzt die aufgemalte Kleidung) =====
// Ein Kleidungsstück („Entwurf“) besteht aus Ringen wie ein Rumpf in Flyout:
//   Oberteil: Hals (Tiefe, Breite, Weite), Rumpf-Ringe (unterster = Saum), Ärmel-Ringe (letzter = Ärmelende, 0 = ärmellos), Armausschnitt.
//   Hose:     Bund (Höhe, Weite), Bein-Ringe (letzter = Beinöffnung; Länge 0 = T-Badehose, dann Panty, dann Shorts bis lange Hose).
//   Stoff:    Farbe, Dicke (mm), Straffheit (0 = sehr dehnbar, 1 = straff).
// Netz: Hautdreiecke im Bereich werden kopiert (passt exakt), Ränder auf die Schnittlinie gelegt, dann um die Weite des nächsten Rings
// vom Körper weg geschoben; weite Teile fallen von der breitesten Stelle darüber (Hülle). Saum/Ärmel/Hose über das Körperende hinaus
// werden angesetzt. Dicke = zweite, innere Haut + Rand an jeder Öffnung.
// Physik: Anker = gehäutete Ruheform (Gewichte der Hautstelle), Verlet, Zug zum Anker (eng = fest, weit = lose), Stofflängen mit Straffheit,
// nie unter die Haut, Beine/Arme schieben losen Stoff weg. Mit grab()/drag()/release() kann man den Stoff mit der Maus ziehen.
import * as THREE from "three";
import { BONES } from "pru/runner.js";
import { store, KEYS } from "pru/core.js";
import { BASE_BOTTOM } from "pru/kleider_basis.js";

export const CLOTHC = ["#E9E5DC", "#C6C5B9", "#9EA1A5", "#3A3C40", "#1E1F22", "#ED6A5E", "#E2621B", "#E8C547", "#7A9E7E", "#2F5D50", "#62929E", "#4A6D7C", "#3F7CAC", "#14457A", "#8E6C8A", "#C97B84", "#B5835A"];
let NEXT = 1;
export function newDesign(kind, name) {
  const id = "k" + Date.now().toString(36) + (NEXT++);
  // Hosen starten seit v0.20 als Noahs Badehosen-Netz (kleider_basis.js); „Netz verwerfen“ führt zurück zu den Ringen
  if (kind === "bottom") return Object.assign(cloneDesign(BASE_BOTTOM), { id: id, name: name || "Hose" });
  return { format: "polyrunner-kleid", v: 1, id: id, name: name || "Oberteil", kind: "top", color: "#E9E5DC", thick: 1.5, stiff: 0.5,
    neck: { d: 0.02, w: 0.5, ease: 0.004 }, arm: 0.015, torso: [{ y: 0.865, ease: 0.008 }, { y: 0.97, ease: 0.004 }], sleeve: [{ t: 0, ease: 0.008 }] };
}
export function cloneDesign(d) {
  const o = JSON.parse(JSON.stringify(d || newDesign("top")));
  if (o.kind === "bottom") { o.leg = (o.leg && o.leg.length ? o.leg : [{ L: 0, ease: 0 }]).sort((a, b) => a.L - b.L); o.waist = Object.assign({ y: 0.786, ease: 0 }, o.waist); }
  else { o.torso = (o.torso && o.torso.length ? o.torso : [{ y: 0.865, ease: 0.008 }]).sort((a, b) => a.y - b.y); o.sleeve = (o.sleeve && o.sleeve.length ? o.sleeve : [{ t: 0, ease: 0.008 }]).sort((a, b) => a.t - b.t); o.neck = Object.assign({ d: 0.02, w: 0.5, ease: 0.004 }, o.neck); if (o.arm == null) o.arm = 0.015; }
  o.thick = o.thick == null ? 1.5 : o.thick; o.stiff = o.stiff == null ? 0.5 : o.stiff; o.color = o.color || "#E9E5DC";
  if (o.rough == null) o.rough = 0.86; if (o.metal == null) o.metal = 0; if (!Array.isArray(o.paint)) o.paint = [];
  return o;
}
// Entwurfsliste aus dem Speicher; beim allerersten Mal kommt die Badehose dazu (danach nicht wieder, auch wenn man sie löscht)
export function designList() {
  let L = store.get(KEYS.kleider, null); const u = store.get(KEYS.ui, {}) || {};
  if (!u.kbase) { L = L || []; if (!L.some((d) => d.id === BASE_BOTTOM.id)) L.unshift(cloneDesign(BASE_BOTTOM)); store.set(KEYS.kleider, L); u.kbase = 1; store.set(KEYS.ui, u); }
  return (L || []).map(cloneDesign);
}
export { BASE_BOTTOM };

// ---------- Stoffpinsel (seit v0.20): Striche als Formen auf der Ruheform des Stoffs ----------
// Ein Element: [art, cx, cy, cz, ux, uy, uz, nx, ny, nz, L, s, weich, wert, spiegel, farbe|null (= Radierer), rough, metal]
//   c = Mitte auf dem Stoff, u = Richtung, n = Normale (Projektion), L = halbe Länge (Linien), s = halbe Größe, wert = Streifen-Anzahl.
export const PAINT_T = { kreis: 0, ring: 1, quadrat: 2, raute: 3, dreieck: 4, stern: 5, rund: 10, eckig: 11, linie: 10, streifen: 12, zickzack: 13, pfeil: 14, punkte: 15 };
const PAINT_MAX = 2048;
const PAINT_GLSL = `
uniform sampler2D uPaint; uniform int uPaintN; uniform vec3 uBaseC;
varying vec3 vRest; varying vec3 vRestN;
float pBox(vec2 p, vec2 b) { vec2 d = abs(p) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
float pSeg(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-10), 0.0, 1.0); return length(pa - ba * h); }
float pTri(vec2 p, vec2 p0, vec2 p1, vec2 p2) {
  vec2 e0 = p1 - p0, e1 = p2 - p1, e2 = p0 - p2, v0 = p - p0, v1 = p - p1, v2 = p - p2;
  vec2 pq0 = v0 - e0 * clamp(dot(v0, e0) / dot(e0, e0), 0.0, 1.0), pq1 = v1 - e1 * clamp(dot(v1, e1) / dot(e1, e1), 0.0, 1.0), pq2 = v2 - e2 * clamp(dot(v2, e2) / dot(e2, e2), 0.0, 1.0);
  float s = sign(e0.x * e2.y - e0.y * e2.x);
  vec2 d = min(min(vec2(dot(pq0, pq0), s * (v0.x * e0.y - v0.y * e0.x)), vec2(dot(pq1, pq1), s * (v1.x * e1.y - v1.y * e1.x))), vec2(dot(pq2, pq2), s * (v2.x * e2.y - v2.y * e2.x)));
  return -sqrt(d.x) * sign(d.y);
}
float pStar(vec2 p, float r) {
  const vec2 k1 = vec2(0.809016994375, -0.587785252292), k2 = vec2(-0.809016994375, -0.587785252292);
  p.x = abs(p.x); p -= 2.0 * max(dot(k1, p), 0.0) * k1; p -= 2.0 * max(dot(k2, p), 0.0) * k2; p.x = abs(p.x); p.y -= r;
  vec2 ba = 0.45 * vec2(-k1.y, k1.x) - vec2(0.0, 1.0); float h = clamp(dot(p, ba) / dot(ba, ba), 0.0, r);
  return length(p - ba * h) * sign(p.y * ba.x - p.x * ba.y);
}
float pShape(int ty, vec2 q, float L, float s, float w) {
  if (ty == 0) return length(q) - s;
  if (ty == 1) return abs(length(q) - s * 0.8) - s * 0.2;
  if (ty == 2) return pBox(q, vec2(s));
  if (ty == 3) return (abs(q.x) + abs(q.y) * 1.35 - s) * 0.6;
  if (ty == 4) return pTri(q, vec2(0.0, s), vec2(-s * 0.95, -s * 0.72), vec2(s * 0.95, -s * 0.72));
  if (ty == 5) return pStar(q, s);
  if (ty == 10) return pSeg(q, vec2(-L, 0.0), vec2(L, 0.0)) - s;
  if (ty == 11) return pBox(q, vec2(L + s * 0.7, s));
  if (ty == 12) { int n = int(w + 0.5); float g = s * 3.2, d = 1e5; for (int k = 0; k < 6; k++) { if (k >= n) break; d = min(d, pBox(q - vec2(0.0, (float(k) - float(n - 1) * 0.5) * g), vec2(L, s))); } return d; }
  if (ty == 13) { float A = s * 2.2, P = s * 5.0, tw = A * (4.0 * abs(fract(q.x / P - 0.25) - 0.5) - 1.0); return max(abs(q.y - tw) * 0.52 - s * 0.45, abs(q.x) - L); }
  if (ty == 14) { float H = min(s * 3.5, L * 1.6), W = s * 2.6; float sh = pBox(q - vec2(-H * 0.5, 0.0), vec2(max(0.0, L - H * 0.5), s * 0.6)); return min(sh, pTri(q, vec2(L, 0.0), vec2(L - H, W), vec2(L - H, -W))); }
  if (ty == 15) { float sp = s * 3.0, m = floor(L / sp + 0.5) * sp, cx = clamp(floor(q.x / sp + 0.5) * sp, -m, m); return length(vec2(q.x - cx, q.y)) - s; }
  return 1.0;
}
void paintApply(vec3 base, out vec3 pc, out float pr, out float pm) {
  pc = base; pr = roughness; pm = metalness;
  for (int i = 0; i < ${PAINT_MAX}; i++) {
    if (i >= uPaintN) break;
    vec4 t0 = texelFetch(uPaint, ivec2(0, i), 0), t2 = texelFetch(uPaint, ivec2(2, i), 0);
    vec3 dp = vRest - t0.xyz; float dep = dot(dp, t2.xyz);
    vec4 t1 = texelFetch(uPaint, ivec2(1, i), 0); float L = t1.w, s = t2.w;
    if (abs(dep) > max(L, s) * 0.7 + 0.012 || dot(vRestN, t2.xyz) < 0.08) continue;
    vec4 t3 = texelFetch(uPaint, ivec2(3, i), 0), t4 = texelFetch(uPaint, ivec2(4, i), 0), t5 = texelFetch(uPaint, ivec2(5, i), 0);
    vec3 v = cross(t2.xyz, t1.xyz) * t5.y; vec2 q = vec2(dot(dp, t1.xyz), dot(dp, v));
    float d = pShape(int(t0.w + 0.5), q, L, s, t5.x), aw = max(fwidth(d) * 0.8, t4.z * s + 1e-5);
    float a = 1.0 - smoothstep(-aw, aw, d); if (a <= 0.0) continue;
    bool er = t3.a < 0.0;
    pc = mix(pc, er ? uBaseC : t3.rgb, a); pr = mix(pr, er ? roughness : t4.x, a); pm = mix(pm, er ? metalness : t4.y, a);
  }
}
`;
const _pc = new THREE.Color();
// kleine Umgebung (Himmel oben, Boden unten), damit Metallic-Stoff etwas spiegelt statt schwarz zu wirken
let ENV = null;
function envTex() {
  if (ENV) return ENV;
  const c = document.createElement("canvas"); c.width = 64; c.height = 32; const g = c.getContext("2d"), gr = g.createLinearGradient(0, 0, 0, 32);
  gr.addColorStop(0, "#9DBBD8"); gr.addColorStop(0.45, "#DCE6EE"); gr.addColorStop(0.52, "#B4B2AC"); gr.addColorStop(1, "#5E5D5A"); g.fillStyle = gr; g.fillRect(0, 0, 64, 32);
  ENV = new THREE.CanvasTexture(c); ENV.mapping = THREE.EquirectangularReflectionMapping; ENV.colorSpace = THREE.SRGBColorSpace; return ENV;
}
function paintMaterial() {
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.86, metalness: 0, side: THREE.FrontSide, envMap: envTex(), envMapIntensity: 0.45 });
  const tex = new THREE.DataTexture(new Float32Array(6 * 4), 6, 1, THREE.RGBAFormat, THREE.FloatType); tex.minFilter = tex.magFilter = THREE.NearestFilter; tex.needsUpdate = true;
  const U = mat.userData.U = { uPaint: { value: tex }, uPaintN: { value: 0 }, uBaseC: { value: mat.color } };
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute vec3 aRest; attribute vec3 aRestN; varying vec3 vRest; varying vec3 vRestN;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvRest = aRest; vRestN = aRestN;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\n" + PAINT_GLSL)
      .replace("#include <color_fragment>", "#include <color_fragment>\nvec3 pCol; float pRgh, pMet; paintApply(diffuseColor.rgb, pCol, pRgh, pMet); diffuseColor.rgb = pCol;")
      .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = pRgh;")
      .replace("#include <metalnessmap_fragment>", "#include <metalnessmap_fragment>\nmetalnessFactor = pMet;");
  };
  mat.customProgramCacheKey = () => "pru-paint-1";
  return mat;
}
// Striche in die Datentextur schreiben (6 Texel je Element)
function paintUpload(mat, list) {
  const U = mat.userData.U, n = Math.min(PAINT_MAX, list.length), cap = Math.max(1, Math.pow(2, Math.ceil(Math.log2(Math.max(1, n)))));
  let tex = U.uPaint.value;
  if (tex.image.height !== cap) { tex.dispose(); tex = new THREE.DataTexture(new Float32Array(6 * 4 * cap), 6, cap, THREE.RGBAFormat, THREE.FloatType); tex.minFilter = tex.magFilter = THREE.NearestFilter; U.uPaint.value = tex; }
  const A = tex.image.data;
  for (let i = 0; i < n; i++) {
    const e = list[i], o = i * 24; _pc.set(e[15] || "#000000");
    A.set([e[1], e[2], e[3], e[0], e[4], e[5], e[6], e[10], e[7], e[8], e[9], e[11], _pc.r, _pc.g, _pc.b, e[15] ? 1 : -1, e[16], e[17], e[12], 0, e[13], e[14], 0, 0], o);
  }
  tex.needsUpdate = true; U.uPaintN.value = n;
}
// stückweise linear über Ringe (k = Koordinate, e = Weite)
function interp(list, key, x) {
  if (!list.length) return 0; if (x <= list[0][key]) return list[0].ease; const l = list[list.length - 1]; if (x >= l[key]) return l.ease;
  for (let i = 1; i < list.length; i++) if (x <= list[i][key]) { const a = list[i - 1], b = list[i], t = (x - a[key]) / Math.max(1e-6, b[key] - a[key]); return a.ease + (b.ease - a.ease) * t; }
  return l.ease;
}

const BI = {}; BONES.forEach(([n], i) => { BI[n] = i; });
const CL_ARM = new Set(["LeftUpperArm", "LeftLowerArm", "LeftHand", "RightUpperArm", "RightLowerArm", "RightHand"].map((n) => BI[n]));
const CL_LEG = new Set(["LeftUpperLeg", "LeftLowerLeg", "LeftFoot", "LeftToes", "RightUpperLeg", "RightLowerLeg", "RightFoot", "RightToes"].map((n) => BI[n]));
const CL_HEAD = BI.Head;
const TAX = [0, -0.02], LEGX = 0.077, LEGZ = -0.045, CROTCH = 0.622;
// Brief-Beinausschnitt: Höhe der Öffnung bei x/z (Seite hoch, Schritt schmal, hinten mehr Stoff), yS = Höhe an der Seite
// Brief-Beinausschnitt (T-Form): schmaler Steg zwischen den Beinen, vorne steil entlang der Leiste zur Seite hoch, hinten etwas mehr Stoff
const GUSSET = 0.643;
function briefOpen(x, z, yS) { const ax = Math.abs(x), fr = Math.max(0, Math.min(1, (z + 0.08) / 0.05)), tt = Math.max(0, Math.min(1, (ax - 0.011) / 0.11)); return GUSSET + (yS - GUSSET) * (Math.pow(tt, 0.95) * (1 - fr) + Math.pow(tt, 0.5) * fr); }
export function waistTop(W, x, z) { const fr = Math.max(0, Math.min(1, (z + 0.08) / 0.05)), c = W.y + (1 - fr) * 0.011 - fr * 0.004; return c + (W.y + 0.011 - c) * Math.max(0, Math.min(1, (Math.abs(x) - 0.02) / 0.1)); }
export function neckLine(N, x, z) { const base = z > -0.03 ? 1.072 : 1.094; return base - N.d + (30 - 22 * N.w) * x * x; }

// ---------- Körper-Daten einmal je Modell: Klassen, Koordinaten, Radien ----------
function bodyInfo(data) {
  if (data.kinfo) return data.kinfo;
  const g = data.geo, P = g.attributes.position.array, SI = g.attributes.skinIndex.array, SW = g.attributes.skinWeight.array, part = g.attributes.aPart.array, n = P.length / 3, J = data.head.joints;
  const cls = new Uint8Array(n);   // 0 Rumpf, 1 Arm, 2 Bein, 3 Kopf, 9 nicht (Augen, Zähne)
  const arm = { L: { s: new THREE.Vector3().fromArray(J.LeftUpperArm), e: new THREE.Vector3().fromArray(J.LeftLowerArm), w: new THREE.Vector3().fromArray(J.LeftHand) }, R: { s: new THREE.Vector3().fromArray(J.RightUpperArm), e: new THREE.Vector3().fromArray(J.RightLowerArm), w: new THREE.Vector3().fromArray(J.RightHand) } };
  ["L", "R"].forEach((k) => { const A = arm[k]; A.l1 = A.e.distanceTo(A.s); A.l2 = A.w.distanceTo(A.e); A.d1 = A.e.clone().sub(A.s).normalize(); A.d2 = A.w.clone().sub(A.e).normalize(); });
  const armT = new Float32Array(n);
  const v = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    if (part[i] > 1.5) { cls[i] = 9; continue; }
    let b = SI[i * 4], w = SW[i * 4]; for (let k = 1; k < 4; k++) if (SW[i * 4 + k] > w) { w = SW[i * 4 + k]; b = SI[i * 4 + k]; }
    cls[i] = CL_ARM.has(b) ? 1 : CL_LEG.has(b) ? 2 : b === CL_HEAD ? 3 : 0;
    if (cls[i] === 1) { const A = P[i * 3] > 0 ? arm.L : arm.R; v.fromArray(P, i * 3); const t1 = v.clone().sub(A.s).dot(A.d1); armT[i] = t1 <= A.l1 ? t1 : A.l1 + v.clone().sub(A.e).dot(A.d2); }
  }
  // Radien je Richtung und Höhe: Rumpf (Achse senkrecht), Beine (Achse senkrecht je Bein)
  const NT = 48, TY0 = 0.55, TY1 = 1.14, TR = Math.round((TY1 - TY0) / 0.01) + 1, tor = new Float32Array(NT * TR);
  const NL = 40, LY1 = 0.66, LR = 67, legs = [new Float32Array(NL * LR), new Float32Array(NL * LR)];
  for (let i = 0; i < n; i++) {
    const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
    if (cls[i] === 0 && y >= TY0 && y <= TY1) { const a = binA(x - TAX[0], z - TAX[1], NT), r = Math.round((y - TY0) / 0.01); tor[r * NT + a] = Math.max(tor[r * NT + a], Math.hypot(x - TAX[0], z - TAX[1])); }
    if ((cls[i] === 2 || (cls[i] === 0 && y < LY1)) && y <= LY1) { const s = x >= 0 ? 0 : 1, cx = s ? -LEGX : LEGX, a = binA(x - cx, z - LEGZ, NL), r = Math.max(0, Math.round(y / 0.01)); if (r < LR) legs[s][r * NL + a] = Math.max(legs[s][r * NL + a], Math.hypot(x - cx, z - LEGZ)); }
  }
  fillBins(tor, NT, TR); fillBins(legs[0], NL, LR); fillBins(legs[1], NL, LR);
  // Achsel: wie tief der Arm am Rumpf ansetzt (größtes armT eines Armpunkts neben einem Rumpfpunkt) → Ärmellänge wird ab dort gemessen
  const idx = g.index.array; let t0 = 0;
  for (let t = 0; t < idx.length; t += 3) { const a = idx[t], b = idx[t + 1], c = idx[t + 2], tri = [a, b, c]; if (!tri.some((q) => cls[q] === 0) || !tri.some((q) => cls[q] === 1)) continue; tri.forEach((q) => { if (cls[q] === 1) t0 = Math.max(t0, armT[q]); }); }
  return data.kinfo = { t0: t0, cls: cls, armT: armT, arm: arm, tor: tor, NT: NT, TY0: TY0, TR: TR, legs: legs, NL: NL, LR: LR };
}
function binA(dx, dz, N) { return Math.min(N - 1, Math.floor((Math.atan2(dx, dz) + Math.PI) / (Math.PI * 2) * N)); }
function fillBins(A, N, R) { for (let it = 0; it < 8; it++) for (let r = 0; r < R; r++) for (let a = 0; a < N; a++) if (!A[r * N + a]) { const l = A[r * N + (a + N - 1) % N], rr = A[r * N + (a + 1) % N]; A[r * N + a] = Math.max(l, rr); } }

// ---------- Netz eines Entwurfs bauen (Ruhe-Koordinaten) ----------
// ---------- eigenes Punktnetz (seit v0.19, Punkt-Editor): mesh = { rev, pos: [x,y,z…], tris: [a,b,c…], src: [Hautpunkt…], pin: […], extra: [Index…] } ----------
const r5 = (v) => Math.round(v * 1e5) / 1e5;
export function bakeMesh(data, D) {
  const B = buildGarment(data, Object.assign({}, D, { mesh: null }));
  return { rev: 1, pos: Array.from(B.pos, r5), tris: B.tris.slice(), src: Array.from(B.src), pin: Array.from(B.pin, (v) => Math.round(v * 1000) / 1000), extra: Array.from(B.extra) };
}
function meshGarment(M) {
  const n = M.pos.length / 3;
  return { pos: Float32Array.from(M.pos), src: Int32Array.from(M.src), pin: Float32Array.from(M.pin), tris: M.tris.slice(), extra: new Set(M.extra || []), m0: n, ease: new Float32Array(n), own: true };
}
// Suche auf der Haut: nächster Hautpunkt (Raster) und nächster Punkt auf der Hautoberfläche (+ Normale)
export function bodySearch(data) {
  if (data.ksearch) return data.ksearch;
  const g = data.geo, P = g.attributes.position.array, N = g.attributes.normal.array, part = g.attributes.aPart.array, idx = g.index.array, n = P.length / 3, C = 0.02, grid = new Map();
  const key = (x, y, z) => Math.floor(x / C) + "," + Math.floor(y / C) + "," + Math.floor(z / C);
  for (let i = 0; i < n; i++) { if (part[i] > 1.5) continue; const kk = key(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]); let L = grid.get(kk); if (!L) grid.set(kk, (L = [])); L.push(i); }
  const vt = Array.from({ length: n }, () => []); for (let t = 0; t < idx.length; t += 3) for (let q = 0; q < 3; q++) vt[idx[t + q]].push(t);
  const nearest = (x, y, z) => {
    let best = -1, bd = 1e9;
    for (let r = 1; r <= 4 && best < 0; r++) for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) for (let c = -r; c <= r; c++) {
      const L = grid.get((Math.floor(x / C) + a) + "," + (Math.floor(y / C) + b) + "," + (Math.floor(z / C) + c)); if (!L) continue;
      for (const i of L) { const d = (P[i * 3] - x) ** 2 + (P[i * 3 + 1] - y) ** 2 + (P[i * 3 + 2] - z) ** 2; if (d < bd) { bd = d; best = i; } }
    }
    return best;
  };
  const A = new THREE.Vector3(), Bv = new THREE.Vector3(), Cv = new THREE.Vector3(), q = new THREE.Vector3(), tri = new THREE.Triangle(), out = new THREE.Vector3();
  // Punkt auf die Hautoberfläche legen, mit Abstand off entlang der Hautnormale
  const project = (p, off) => {
    const i = nearest(p.x, p.y, p.z); if (i < 0) return null;
    let bd = 1e9, bp = null, bt = -1;
    for (const t of vt[i]) { A.fromArray(P, idx[t] * 3); Bv.fromArray(P, idx[t + 1] * 3); Cv.fromArray(P, idx[t + 2] * 3); tri.set(A, Bv, Cv); tri.closestPointToPoint(p, q); const d = q.distanceToSquared(p); if (d < bd) { bd = d; bp = q.clone(); bt = t; } }
    const nn = new THREE.Vector3(); for (let k = 0; k < 3; k++) nn.add(out.fromArray(N, idx[bt + k] * 3)); nn.normalize();
    return { p: bp.clone().addScaledVector(nn, off), n: nn, i: i, skin: bp };
  };
  return data.ksearch = { nearest: nearest, project: project };
}

export function buildGarment(data, D) {
  if (D.mesh && D.mesh.pos && D.mesh.pos.length) return meshGarment(D.mesh);
  const K = bodyInfo(data), g = data.geo, P = g.attributes.position.array, Nn = g.attributes.normal.array, part = g.attributes.aPart.array, n = P.length / 3, idx = g.index.array;
  const top = D.kind !== "bottom", th = Math.max(0.3, D.thick) / 1000, base = th * 0.5 + 0.0015;
  const f = new Float32Array(n).fill(-1);
  // Bereich: Feld > 0 innen (≈ Meter bis zur Schnittlinie)
  const hem = top ? D.torso[0].y : 0, sEnd = top ? D.sleeve[D.sleeve.length - 1].t : 0, Lend = top ? 0 : D.leg[D.leg.length - 1].L;
  const yS = (W) => waistTop(W, 0.12, -0.03) - 0.026;
  // Beinöffnung als Feld (> 0 = Stoff): bis Länge 0,15 eine schräge Ebene je Bein durch den Steg (Leistenlinie, Seite hoch, hinten tiefer),
  // die mit der Länge flacher wird (Panty); darüber waagrecht um das Bein, Höhe sinkt mit der Länge.
  const legField = (x, y, z) => {
    const sx = x >= 0 ? 1 : -1;
    if (Lend <= 0.15) {
      const k = Lend / 0.15, yS = waistTop(D.waist, sx * 0.125, -0.03) - 0.026 - k * 0.02, ta = Math.max(0, (yS - GUSSET) / 0.114) * (1 - k), al = Math.atan(ta);
      let nx = -sx * Math.sin(al), ny = Math.cos(al), nz = -0.3 * (1 - k); const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
      return (x - sx * 0.011) * nx + (y - GUSSET) * ny + (z - 0.03) * nz;   // Neigung um die Vorderseite: vorne Leistenlinie, hinten mehr Stoff
    }
    return y - Math.max(0.075, GUSSET - (Lend - 0.15));
  };
  const hasSleeve = sEnd > 0.004, armCut = hasSleeve ? 0 : D.arm || 0, T0 = K.t0;   // Armausschnitt nur ohne Ärmel; Ärmellänge ab der Achsel (T0)
  for (let i = 0; i < n; i++) {
    const c = K.cls[i]; if (c === 9) continue;
    const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
    if (top) {
      if (part[i] > 0.5 || (c === 2 && y < 0.7)) continue;
      if (c === 0 || c === 3 || c === 2) {
        let d = Math.min(y - Math.max(hem, 0.7), neckLine(D.neck, x, z) - y);
        if (c === 3 && y > 1.16) d = Math.min(d, -0.01);
        if (!hasSleeve) { const A = x > 0 ? K.arm.L : K.arm.R; d = Math.min(d, Math.hypot(x - A.s.x, (y - A.s.y) * 1.25, z - A.s.z) - (0.05 + armCut)); }
        f[i] = d;
      } else if (c === 1) {
        if (sEnd <= 0.004) continue;
        let d = Math.min(T0 + sEnd, 0.315) - K.armT[i];
        f[i] = d;
      }
    } else {
      if (c === 1 || c === 3) continue; if (part[i] > 0.5 && y < 0.1) continue;
      f[i] = Math.min(waistTop(D.waist, x, z) - y, legField(x, y, z));
    }
  }
  // Dreiecke mit mindestens einem inneren Punkt, äußere Punkte auf die Schnittlinie
  const tri = [];
  for (let t = 0; t < idx.length; t += 3) { const a = idx[t], b = idx[t + 1], c = idx[t + 2]; if ((f[a] > 0 || f[b] > 0 || f[c] > 0) && K.cls[a] !== 9 && K.cls[b] !== 9 && K.cls[c] !== 9) tri.push(a, b, c); }
  const map = new Int32Array(n).fill(-1), src = [];
  tri.forEach((v) => { if (map[v] < 0) { map[v] = src.length; src.push(v); } });
  const m0 = src.length, nb = src.map(() => []);
  for (let t = 0; t < tri.length; t += 3) for (let k = 0; k < 3; k++) { const a = map[tri[t + k]], b = map[tri[t + (k + 1) % 3]]; nb[a].push(b); nb[b].push(a); }
  const rest = new Float32Array(m0 * 3), nor = new Float32Array(m0 * 3);
  for (let j = 0; j < m0; j++) {
    const i = src[j]; let x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
    if (f[i] <= 0) { let sx = 0, sy = 0, sz = 0, k = 0; nb[j].forEach((o) => { const u = src[o]; if (f[u] > 0) { const t = f[i] / (f[i] - f[u]); sx += x + (P[u * 3] - x) * t; sy += y + (P[u * 3 + 1] - y) * t; sz += z + (P[u * 3 + 2] - z) * t; k++; } }); if (k) { x = sx / k; y = sy / k; z = sz / k; } }
    rest[j * 3] = x; rest[j * 3 + 1] = y; rest[j * 3 + 2] = z; nor[j * 3] = Nn[i * 3]; nor[j * 3 + 1] = Nn[i * 3 + 1]; nor[j * 3 + 2] = Nn[i * 3 + 2];
  }
  // Weite: vom Körper weg; weite Teile fallen von der breitesten Stelle darüber
  const pos = new Float32Array(m0 * 3), pin = new Float32Array(m0), easeOf = new Float32Array(m0), v = new THREE.Vector3(), nn = new THREE.Vector3();
  const torE = (y) => y > 1.0 ? interp(D.torso, "y", 1.0) + (D.neck.ease - interp(D.torso, "y", 1.0)) * Math.min(1, (y - 1.0) / 0.07) : interp(D.torso, "y", y);
  const legE = (y) => { if (y >= CROTCH) return D.waist.ease + (interp(D.leg, "L", 0) - D.waist.ease) * Math.max(0, Math.min(1, (D.waist.y - y) / (D.waist.y - CROTCH))); return interp(D.leg, "L", 0.15 + CROTCH - y); };
  for (let j = 0; j < m0; j++) {
    v.fromArray(rest, j * 3); nn.fromArray(nor, j * 3); const i = src[j], c = K.cls[i], y = v.y;
    let e;
    if (top) {
      if (c === 1) {
        const t = K.armT[i]; e = interp(D.sleeve, "t", t - T0);
        v.addScaledVector(nn, base + e);
        pin[j] = 0.98 - 0.55 * Math.min(1, e / 0.03) * Math.min(1, Math.max(0, t) / 0.12);
      } else {
        e = torE(y);
        const tx = v.x - TAX[0], tz = v.z - TAX[1], r = Math.hypot(tx, tz), a = binA(tx, tz, K.NT);
        let R = r + base + e;
        if (y < 0.97 && r > 1e-4) {   // Fall: größter Radius innerhalb der Falllänge darüber (+ dortige Weite)
          const drop = Math.max(0, Math.min(0.32, e * 8)), r0 = Math.round((y - K.TY0) / 0.01), r1 = Math.min(Math.round((Math.min(0.97, y + drop) - K.TY0) / 0.01), K.TR - 1);
          for (let rr = Math.max(0, r0); rr <= r1; rr++) R = Math.max(R, K.tor[rr * K.NT + a] + base + torE(K.TY0 + rr * 0.01));
          const k = Math.max(0, Math.min(1, (0.97 - y) / 0.03)), drp = new THREE.Vector3(TAX[0] + tx / r * R, y, TAX[1] + tz / r * R);
          v.addScaledVector(nn, base + e).lerp(drp, k);
        } else v.addScaledVector(nn, base + e);
        const tight = 1 - Math.min(1, e / 0.028), up = Math.max(0, Math.min(1, (y - Math.max(hem, 0.7)) / Math.max(0.05, 0.98 - Math.max(hem, 0.7))));
        pin[j] = Math.min(0.98, 0.2 + 0.78 * Math.max(tight, Math.pow(up, 1.5)));
      }
    } else {
      e = legE(y);
      if (y < CROTCH + 0.03) {
        const s = v.x >= 0 ? 0 : 1, cx = s ? -LEGX : LEGX, dx = v.x - cx, dz = v.z - LEGZ, r = Math.hypot(dx, dz), a = binA(dx, dz, K.NL);
        let R = r + base + e;
        const drop = Math.max(0, Math.min(0.4, e * 9)), r0 = Math.max(0, Math.round(y / 0.01)), r1 = Math.min(K.LR - 1, Math.round(Math.min(CROTCH, y + drop) / 0.01));
        for (let rr = r0; rr <= r1; rr++) R = Math.max(R, K.legs[s][rr * K.NL + a] + base + legE(rr * 0.01));
        const k = Math.max(0, Math.min(1, (CROTCH + 0.03 - y) / 0.04)); let nx = cx + dx / r * R; if ((nx > 0) !== (cx > 0) || Math.abs(nx) < 0.006) nx = Math.sign(cx) * 0.006;
        v.addScaledVector(nn, base + e).lerp(new THREE.Vector3(nx, y, LEGZ + dz / r * R), r > 1e-4 ? k : 0);
      } else v.addScaledVector(nn, base + e);
      const tight = 1 - Math.min(1, e / 0.028), up = Math.max(0, Math.min(1, (y - 0.1) / 0.6));
      pin[j] = Math.min(0.98, 0.2 + 0.78 * Math.max(tight, Math.pow(up, 2)));
    }
    easeOf[j] = e; pos[j * 3] = v.x; pos[j * 3 + 1] = v.y; pos[j * 3 + 2] = v.z;
  }
  // ---------- Ansetzen über das Körperende hinaus (Saum unter dem Po, Ärmel über die Hand, Hose über den Fuß) ----------
  let P2 = Array.from(pos), S2 = src.slice(), PIN = Array.from(pin), T2 = tri.map((x) => map[x]), EX = [];
  const E = new Map(); for (let t = 0; t < T2.length; t += 3) for (let k = 0; k < 3; k++) { const a = T2[t + k], b = T2[t + (k + 1) % 3]; E.set(a + "_" + b, [a, b]); }
  const bnd = []; E.forEach(([a, b]) => { if (!E.has(b + "_" + a)) bnd.push([a, b]); });
  // len: Zahl oder Funktion je Randpunkt (Saum soll waagrecht enden)
  const extend = (sel, len, dirOf, flare) => {
    const lenOf = typeof len === "function" ? len : () => len, rows = Math.max(1, Math.ceil(Math.max(...bnd.filter(sel).map(([a]) => lenOf(a)), 0.01) / 0.025)), copy = new Map();
    const row = (a, r) => { const key = a + "_" + r; if (copy.has(key)) return copy.get(key); const d = dirOf(a), t = r / rows, id = P2.length / 3, fl = flare(a, t), ln = lenOf(a); P2.push(P2[a * 3] + d.x * ln * t + fl.x, P2[a * 3 + 1] + d.y * ln * t + fl.y, P2[a * 3 + 2] + d.z * ln * t + fl.z); S2.push(S2[a]); PIN.push(Math.max(0.04, PIN[a] * (1 - 0.85 * t))); EX.push(id); copy.set(key, id); return id; };
    bnd.filter(sel).forEach(([a, b]) => { let pa = a, pb = b; for (let r = 1; r <= rows; r++) { const na = row(a, r), nb2 = row(b, r); T2.push(pa, nb2, pb, pa, na, nb2); pa = na; pb = nb2; } });
  };
  const yOf = (a) => P2[a * 3 + 1], down = new THREE.Vector3(0, -1, 0);
  if (top && hem < 0.7) {
    const eh = D.torso[0].ease;
    extend(([a, b]) => yOf(a) < 0.78 && yOf(b) < 0.78 && K.cls[S2[a]] !== 1 && K.cls[S2[b]] !== 1, (a) => Math.max(0.005, yOf(a) - hem), () => down, (a, t) => { const x = P2[a * 3] - TAX[0], z = P2[a * 3 + 2] - TAX[1], r = Math.hypot(x, z) || 1, k = eh * 0.6 * t; return new THREE.Vector3(x / r * k, 0, z / r * k); });
  }
  if (top && T0 + sEnd > 0.315) {
    extend(([a, b]) => K.cls[S2[a]] === 1 && K.armT[S2[a]] > 0.28 && K.cls[S2[b]] === 1 && K.armT[S2[b]] > 0.28, T0 + sEnd - 0.315, (a) => (P2[a * 3] > 0 ? K.arm.L.d2 : K.arm.R.d2), () => new THREE.Vector3());
  }
  if (!top && Lend > 0.15 + CROTCH - 0.075) {
    const el = D.leg[D.leg.length - 1].ease;
    const yEnd = 0.075 - Math.min(0.07, Lend - (0.15 + CROTCH - 0.075));
    extend(([a, b]) => yOf(a) < 0.1 && yOf(b) < 0.1, (a) => Math.max(0.005, yOf(a) - yEnd), () => down, (a, t) => { const cx = P2[a * 3] > 0 ? LEGX : -LEGX, x = P2[a * 3] - cx, z = P2[a * 3 + 2] - LEGZ, r = Math.hypot(x, z) || 1, k = el * 0.4 * t; return new THREE.Vector3(x / r * k, 0, z / r * k); });
  }
  return { pos: new Float32Array(P2), src: Int32Array.from(S2), pin: Float32Array.from(PIN), tris: T2, extra: new Set(EX), m0: m0, ease: easeOf };
}

// ---------- Stoff mit Physik, Dicke und Greifen ----------
const _v = new THREE.Vector3();
export class Cloth {
  constructor(fig, design) {
    this.fig = fig;
    this.mat = paintMaterial();
    this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), this.mat); this.mesh.frustumCulled = false; this.mesh.castShadow = true; this.mesh.receiveShadow = true;
    fig.scene.add(this.mesh);
    this.M = BONES.map(() => new THREE.Matrix4()); this.grabbed = -1; this.grabAt = new THREE.Vector3(); this.key = "";
    this.caps = [["LeftUpperLeg", "LeftLowerLeg", 0.055], ["RightUpperLeg", "RightLowerLeg", 0.055], ["LeftLowerLeg", "LeftFoot", 0.042], ["RightLowerLeg", "RightFoot", 0.042],
      ["LeftLowerArm", "LeftHand", 0.03], ["RightLowerArm", "RightHand", 0.03]].map(([a, b, r]) => ({ a: BI[a], b: BI[b], r: r, A: new THREE.Vector3(), B: new THREE.Vector3() }));
    this.setDesign(design);
  }
  setDesign(d) {
    const D = d.mesh ? Object.assign({}, d, { mesh: d.mesh }) : cloneDesign(d), k = JSON.stringify([D.kind, D.waist, D.leg, D.neck, D.arm, D.torso, D.sleeve, D.thick, D.mesh ? D.mesh.rev + "/" + D.mesh.pos.length : 0]);
    this.D = D; this.mat.color.set(D.color); this.mat.roughness = D.rough == null ? 0.86 : D.rough; this.mat.metalness = D.metal == null ? 0 : D.metal;
    const pk = JSON.stringify(D.paint || []); if (pk !== this.pk) { this.pk = pk; paintUpload(this.mat, D.paint || []); }
    if (k === this.key) return; this.key = k;
    const data = this.fig.data, B = this.B = buildGarment(data, D), m = this.m = B.pos.length / 3;
    const g = data.geo, SI = g.attributes.skinIndex.array, SW = g.attributes.skinWeight.array, BP = g.attributes.position.array, BN = g.attributes.normal.array;
    this.si = new Uint8Array(m * 4); this.sw = new Float32Array(m * 4); this.bp = new Float32Array(m * 3); this.bn = new Float32Array(m * 3);
    for (let j = 0; j < m; j++) { const s = B.src[j]; for (let k2 = 0; k2 < 4; k2++) { this.si[j * 4 + k2] = SI[s * 4 + k2]; this.sw[j * 4 + k2] = SW[s * 4 + k2]; } for (let k2 = 0; k2 < 3; k2++) { this.bp[j * 3 + k2] = BP[s * 3 + k2]; this.bn[j * 3 + k2] = BN[s * 3 + k2]; } }
    const E = new Map(), T = B.tris; for (let t = 0; t < T.length; t += 3) for (let k2 = 0; k2 < 3; k2++) { let a = T[t + k2], b = T[t + (k2 + 1) % 3]; if (a > b) { const x = a; a = b; b = x; } E.set(a * 1e6 + b, [a, b]); }
    this.ea = new Int32Array(E.size); this.eb = new Int32Array(E.size); this.el = new Float32Array(E.size); let e = 0;
    E.forEach(([a, b]) => { this.ea[e] = a; this.eb[e] = b; this.el[e] = Math.hypot(B.pos[a * 3] - B.pos[b * 3], B.pos[a * 3 + 1] - B.pos[b * 3 + 1], B.pos[a * 3 + 2] - B.pos[b * 3 + 2]); e++; });
    // Ränder (Öffnungen) für die Stoffdicke
    const EO = new Map(); for (let t = 0; t < T.length; t += 3) for (let k2 = 0; k2 < 3; k2++) EO.set(T[t + k2] + "_" + T[t + (k2 + 1) % 3], 1);
    const rim = []; for (let t = 0; t < T.length; t += 3) for (let k2 = 0; k2 < 3; k2++) { const a = T[t + k2], b = T[t + (k2 + 1) % 3]; if (!EO.has(b + "_" + a)) rim.push(a, b); }
    this.rim = rim;
    this.mn = new Float32Array(m); this.setLayer(this.layer || 0);
    this.p = new Float32Array(m * 3); this.q = new Float32Array(m * 3); this.anc = new Float32Array(m * 3); this.hb = new Float32Array(m * 3); this.hn = new Float32Array(m * 3);
    // Geometrie: außen (m), innen (m), Rand
    const geo = new THREE.BufferGeometry(), gp = new Float32Array(m * 6);
    const ix = []; for (let t = 0; t < T.length; t += 3) { ix.push(T[t], T[t + 1], T[t + 2]); ix.push(T[t] + m, T[t + 2] + m, T[t + 1] + m); }
    for (let r = 0; r < rim.length; r += 2) { const a = rim[r], b = rim[r + 1]; ix.push(b, a, a + m, b, a + m, b + m); }
    geo.setAttribute("position", new THREE.BufferAttribute(gp, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(m * 6), 3).setUsage(THREE.DynamicDrawUsage));
    // Ruheform (für den Stoffpinsel): Position und Normale vor jeder Bewegung, außen und innen gleich
    const rg = new THREE.BufferGeometry(); rg.setAttribute("position", new THREE.BufferAttribute(Float32Array.from(B.pos), 3)); rg.setIndex(Array.from(T)); rg.computeVertexNormals();
    this.rn = rg.attributes.normal.array; rg.dispose();
    const ar = new Float32Array(m * 6), an = new Float32Array(m * 6); ar.set(B.pos); ar.set(B.pos, m * 3); an.set(this.rn); an.set(this.rn, m * 3);
    geo.setAttribute("aRest", new THREE.BufferAttribute(ar, 3)); geo.setAttribute("aRestN", new THREE.BufferAttribute(an, 3));
    geo.setIndex(ix);
    this.mesh.geometry.dispose(); this.mesh.geometry = geo; this.first = true; this.grabbed = -1;
    this.outer = new THREE.BufferGeometry(); this.outer.setAttribute("position", new THREE.BufferAttribute(this.p, 3)); this.outer.setIndex(Array.from(T));
  }
  // Lage: liegt eine Hose darunter, hält das Oberteil unten (Ruhe-y < Bund + 5 cm) zusätzlich Abstand
  setLayer(extra, yTop) {
    this.layer = extra; this.layerY = yTop || 0.84; if (!this.B) return;
    const base = Math.max(0.0035, this.D.thick / 2000 + 0.0015), P = this.B.pos;
    for (let j = 0; j < this.m; j++) this.mn[j] = base + (extra && P[j * 3 + 1] < this.layerY ? extra : 0);
  }
  // Anker und Hautstelle in der aktuellen Pose (Linear Blend Skinning auf der CPU)
  skin() {
    const sk = this.fig.mesh.skeleton, M = this.M; for (let i = 0; i < M.length; i++) M[i].multiplyMatrices(sk.bones[i].matrixWorld, sk.boneInverses[i]);
    const e = M.map((x) => x.elements), B = this.B.pos, bp = this.bp, bn = this.bn, si = this.si, sw = this.sw, A = this.anc, HB = this.hb, HN = this.hn;
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
    this.caps.forEach((c) => { c.A.setFromMatrixPosition(sk.bones[c.a].matrixWorld); c.B.setFromMatrixPosition(sk.bones[c.b].matrixWorld); });
  }
  update(dt, wind) {
    this.fig.root.updateMatrixWorld(true); this.skin();
    if (this.first) { this.first = false; this.p.set(this.anc); this.q.set(this.anc); }
    const steps = Math.max(1, Math.min(3, Math.ceil(dt / (1 / 75)))), h = dt / steps, m = this.m, p = this.p, q = this.q, A = this.anc, pin = this.B.pin, st = this.D.stiff;
    const g = -9.81 * h * h, wx = (wind ? wind.x : 0) * 0.06 * h, wz = (wind ? wind.z : 0) * 0.06 * h, damp = 0.95;
    const hold = this.grabbed >= 0 ? 0.35 : 1;   // beim Ziehen gibt der Stoff mehr nach, damit man die Straffheit spürt
    if (!this.kk || this.kk.length !== m) this.kk = new Float32Array(m);
    for (let j = 0; j < m; j++) this.kk[j] = 1 - Math.pow(1 - Math.min(0.95, (pin[j] * pin[j] * 0.55 + 0.02) * hold), h * 60);
    const slack = 1 + (1 - st) * 0.35, corr = 0.25 + 0.75 * st, iters = 2 + Math.round(st * 3), G = this.grabbed;
    for (let s = 0; s < steps; s++) {
      for (let j = 0; j < m; j++) {
        const i = j * 3;
        for (let c = 0; c < 3; c++) { const vel = (p[i + c] - q[i + c]) * damp; q[i + c] = p[i + c]; p[i + c] += vel; }
        p[i + 1] += g; p[i] += wx; p[i + 2] += wz;
        const k = this.kk[j]; p[i] += (A[i] - p[i]) * k; p[i + 1] += (A[i + 1] - p[i + 1]) * k; p[i + 2] += (A[i + 2] - p[i + 2]) * k;
      }
      if (G >= 0) for (const H of this.hand) { const i = H.j * 3, w = H.w; p[i] += (this.grabAt.x + H.o.x - p[i]) * w; p[i + 1] += (this.grabAt.y + H.o.y - p[i + 1]) * w; p[i + 2] += (this.grabAt.z + H.o.z - p[i + 2]) * w; }
      // Stofflängen: Dehnen bis slack erlaubt (dehnbarer Stoff), Stauchen frei (Falten)
      for (let it = 0; it < iters; it++) for (let e = 0; e < this.el.length; e++) {
        const ia = this.ea[e], ib = this.eb[e], a = ia * 3, b = ib * 3, dx = p[b] - p[a], dy = p[b + 1] - p[a + 1], dz = p[b + 2] - p[a + 2], l = Math.hypot(dx, dy, dz), L = this.el[e] * slack;
        if (l <= L || l < 1e-7) continue; const c = (l - L) / l * corr;
        let wa = 1 - pin[ia] * 0.7, wb = 1 - pin[ib] * 0.7; if (G >= 0) { wa *= 1 - (this.hw[ia] || 0); wb *= 1 - (this.hw[ib] || 0); } const sw = wa + wb; if (sw <= 0) continue;
        const fa = wa / sw, fb = wb / sw;
        p[a] += dx * c * fa; p[a + 1] += dy * c * fa; p[a + 2] += dz * c * fa; p[b] -= dx * c * fb; p[b + 1] -= dy * c * fb; p[b + 2] -= dz * c * fb;
      }
      // nie unter die Haut
      const HB = this.hb, HN = this.hn;
      for (let j = 0; j < m; j++) {
        const i = j * 3, d = (p[i] - HB[i]) * HN[i] + (p[i + 1] - HB[i + 1]) * HN[i + 1] + (p[i + 2] - HB[i + 2]) * HN[i + 2], mn = this.mn[j];
        if (d < mn && (d > -0.06 || !this.B.extra.has(j))) { const c = mn - d; p[i] += HN[i] * c; p[i + 1] += HN[i + 1] * c; p[i + 2] += HN[i + 2] * c; }
      }
      // Beine/Unterarme schieben losen Stoff weg
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
    this.write();
  }
  // Außen- und Innenhaut schreiben (innen = außen − Normale × Dicke)
  // Ruheform zeigen (Punkt-Editor: Figur steht in der Bind-Pose, keine Physik)
  showRest() { this.p.set(this.B.pos); this.q.set(this.B.pos); this.first = false; this.write(); }
  write() {
    const m = this.m, g = this.mesh.geometry, gp = g.attributes.position.array, p = this.p;
    this.outer.attributes.position.needsUpdate = true; this.outer.computeVertexNormals();
    const on = this.outer.attributes.normal.array, th = Math.max(0.3, this.D.thick) / 1000;
    for (let i = 0; i < m * 3; i++) { gp[i] = p[i]; gp[m * 3 + i] = p[i] - on[i] * th; }
    g.attributes.position.needsUpdate = true; g.computeVertexNormals();
  }
  // ---------- Greifen mit der Maus ----------
  pick(ray, front) {
    const rc = new THREE.Raycaster(); rc.ray.copy(ray);
    if (!this._pm) this._pm = new THREE.Mesh(this.outer, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
    this._pm.geometry = this.outer; this.outer.computeBoundingSphere();
    const hs = rc.intersectObject(this._pm, false), h = front ? hs.find((x) => x.face.normal.dot(ray.direction) < 0) : hs[0]; if (!h) return null;
    const f = h.face, P = this.p; let best = f.a, bd = 1e9;
    [f.a, f.b, f.c].forEach((i) => { const d = _v.set(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]).distanceToSquared(h.point); if (d < bd) { bd = d; best = i; } });
    const RN = this.rn, nr = new THREE.Vector3(); [f.a, f.b, f.c].forEach((i) => nr.add(_v.set(RN[i * 3], RN[i * 3 + 1], RN[i * 3 + 2]))); nr.normalize();
    return { i: best, point: h.point.clone(), dist: h.distance, normal: nr };
  }
  // eine Handvoll Stoff greifen: Punkte bis 3 cm um den Griff gehen mit (nach außen schwächer)
  grab(i, at) {
    const p = this.p, R = 0.03; this.grabbed = i; this.grabAt.copy(at); this.hand = []; this.hw = new Float32Array(this.m);
    const g = new THREE.Vector3(p[i * 3], p[i * 3 + 1], p[i * 3 + 2]);
    for (let j = 0; j < this.m; j++) { const d = _v.set(p[j * 3], p[j * 3 + 1], p[j * 3 + 2]).distanceTo(g); if (d < R) { const w = Math.pow(1 - d / R, 1.5); this.hand.push({ j: j, w: w, o: _v.clone().sub(g) }); this.hw[j] = w; } }
    this.near = []; for (let e = 0; e < this.el.length; e++) { const a = this.ea[e] * 3; if (_v.set(p[a], p[a + 1], p[a + 2]).distanceTo(g) < 0.07) this.near.push(e); }
  }
  drag(at) { this.grabAt.copy(at); }
  // Stoffpinsel: Striche sofort zeigen (ohne neuen Entwurf), beim nächsten setDesign wird wieder der Entwurf geladen
  previewPaint(list) { paintUpload(this.mat, list); this.pk = null; }
  release() { this.grabbed = -1; this.hand = []; }
  // Dehnung rund um den Griff (Mittel der Kanten bis 7 cm), 1 = ungedehnt
  strain() { if (!this.near || !this.near.length) return 1; const p = this.p; let s = 0; for (const e of this.near) { const a = this.ea[e] * 3, b = this.eb[e] * 3; s += Math.hypot(p[b] - p[a], p[b + 1] - p[a + 1], p[b + 2] - p[a + 2]) / this.el[e]; } return s / this.near.length; }
  dispose() { this.fig.scene.remove(this.mesh); this.mesh.geometry.dispose(); this.outer.dispose(); this.mat.dispose(); }
}
