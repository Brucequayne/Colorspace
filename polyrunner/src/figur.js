// ===== figur.js · Spielfigur: Modell (model/figur.bin) als SkinnedMesh auf dem Runner-Skelett, Haut, Augen, Brauen, enge Kleidung =====
// Das Modell selbst wird nie verändert. Alles Aussehen entsteht im Shader auf der Ruhe-Position der Punkte (position vor dem Skinning):
//  - Augen: die Augäpfel sind eigene Teile im Modell; Iris/Pupille/Glanz kommen aus einer Leinwand-Textur, projiziert in Blickrichtung.
//  - Brauen: zweite Leinwand, von vorne aufs Gesicht projiziert.
//  - Enge Kleidung (Speedo): Bereiche aus Feldern der Ruhe-Position → liegt exakt auf der Haut, bewegt sich mit, keine Durchdringung.
// Animation: Die Knochen haben dieselben Namen wie im Runner (runner.js). In Ruhe (alle Drehungen 0) hängen Arme und Beine gerade nach unten,
// das Modell steht in A-Pose → follow(runner) kopiert einfach die lokalen Drehungen, die Beckenhöhe wird mit der Körpergröße skaliert.
import * as THREE from "three";
import { PRU } from "pru/core.js";
import { BONES, HIP_H } from "pru/runner.js";
import { Hair, cloneHair } from "pru/haare.js";

export const LOOK_DEFAULT = {
  v: 1,
  skin: "#F2CBAE",
  eyes: { type: "glanz", iris: "#3F7CAC", size: 1, pupil: 1, shine: true },
  brows: { type: "bogen", color: "#3B2A22", size: 1, thick: 1, y: 0, gap: 0, tilt: 0 },
  bottom: "speedo",
  hair: { groups: [{ id: 1, len: 0.14, type: "glatt", color: "#3B2A22", thick: 1 }], roots: [] }
};
export const SKINS = ["#FBE6D6", "#F2CBAE", "#E6B38E", "#CF9670", "#A86E4C", "#7A4D33", "#4E3122"];
export const IRIS = ["#3F7CAC", "#5FC2CF", "#4E8F5A", "#7A9E7E", "#8A5A35", "#3A2A22", "#8E6C8A", "#C24A3A", "#E8C547", "#9EA1A5"];
export const BROWC = ["#1E1A18", "#3B2A22", "#6B4630", "#A0703F", "#D9B36A", "#E9E5DC", "#C24A3A", "#3F7CAC"];
export const EYE_TYPES = ["glanz", "rund", "schlitz", "stern", "ring", "raute", "leer"];
export const BROW_TYPES = ["bogen", "gerade", "duenn", "kraeftig", "wuetend", "besorgt", "kurz"];
export function cloneLook(l) {
  const d = LOOK_DEFAULT, o = l || {};
  return { v: 1, skin: o.skin || d.skin, eyes: Object.assign({}, d.eyes, o.eyes || {}), brows: Object.assign({}, d.brows, o.brows || {}), bottom: o.bottom || d.bottom, hair: cloneHair(o.hair || d.hair) };
}

// ---------- Modelldatei laden (einmal, dann zwischengespeichert) ----------
let DATA = null, LOADING = null;
export function loadFigur() {
  if (DATA) return Promise.resolve(DATA);
  if (LOADING) return LOADING;
  LOADING = fetch("./polyrunner/model/figur.bin" + (PRU.stamp ? "?v=" + PRU.stamp : "")).then((r) => { if (!r.ok) throw new Error("figur.bin " + r.status); return r.arrayBuffer(); }).then((buf) => {
    const dv = new DataView(buf), hl = dv.getUint32(4, true);
    const head = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 8, hl)));
    let o = 8 + hl; const n = head.n, T = head.tris;
    const q = new Uint16Array(buf, o, n * 3); o += n * 6;
    const idx = new Uint16Array(buf, o, T * 3); o += T * 6; o = (o + 3) & ~3;
    const si = new Uint8Array(buf, o, n * 4); o += n * 4;
    const sw = new Uint8Array(buf, o, n * 4); o += n * 4;
    const part = new Uint8Array(buf, o, n);
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) pos[i * 3 + k] = head.min[k] + q[i * 3 + k] / 65535 * (head.max[k] - head.min[k]);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setIndex(new THREE.BufferAttribute(new Uint16Array(idx), 1));
    g.computeVertexNormals();
    // Knochen-Reihenfolge der Datei → Reihenfolge von BONES (runner.js)
    const map = head.bones.map((b) => BONES.findIndex((x) => x[0] === b));
    const si2 = new Uint16Array(n * 4); for (let i = 0; i < n * 4; i++) si2[i] = map[si[i]];
    g.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(si2, 4));
    g.setAttribute("skinWeight", new THREE.BufferAttribute(new Float32Array(Array.from(sw, (v) => v / 255)), 4));
    g.setAttribute("aPart", new THREE.BufferAttribute(new Float32Array(part), 1));
    g.computeBoundingSphere();
    DATA = { head: head, geo: g };
    return DATA;
  });
  LOADING.catch(() => { LOADING = null; });
  return LOADING;
}

// ---------- Augen-Textur: Lederhaut, Iris, Pupille, Glanz (Koordinaten: -1…1 in Augapfel-Radien, Mitte = Blickachse) ----------
function eyeCanvas(E) {
  const S = 256, c = document.createElement("canvas"); c.width = c.height = S;
  const x = c.getContext("2d"), P = (u) => (u * 0.5 + 0.5) * S;   // -1…1 → Pixel
  x.fillStyle = "#F6F4EF"; x.fillRect(0, 0, S, S);
  // Schatten des Oberlids (Anime: oben grau-bläulich)
  let g = x.createLinearGradient(0, P(-0.62), 0, P(-0.1)); g.addColorStop(0, "rgba(120,128,150,0.85)"); g.addColorStop(1, "rgba(120,128,150,0)"); x.fillStyle = g; x.fillRect(0, 0, S, S);
  const sz = E.size || 1, rx = 0.36 * sz, ry = 0.5 * sz, col = new THREE.Color(E.iris || "#3F7CAC");
  const dk = col.clone().multiplyScalar(0.55), lt = col.clone().lerp(new THREE.Color("#FFFFFF"), 0.35), mid = col.clone();
  const cs = (c3, a) => "rgba(" + Math.round(c3.r * 255) + "," + Math.round(c3.g * 255) + "," + Math.round(c3.b * 255) + "," + (a == null ? 1 : a) + ")";
  x.save(); x.translate(P(0), P(0)); x.scale(rx * S / 2, ry * S / 2);   // Einheitskreis = Iris
  if (E.type !== "leer" || true) {
    g = x.createLinearGradient(0, -1, 0, 1); g.addColorStop(0, cs(dk)); g.addColorStop(0.45, cs(mid)); g.addColorStop(1, cs(lt));
    x.fillStyle = g; x.beginPath(); x.arc(0, 0, 1, 0, Math.PI * 2); x.fill();
    // feiner Rand und leichte Strahlen
    x.lineWidth = 0.09; x.strokeStyle = cs(dk.clone().multiplyScalar(0.7)); x.stroke();
    x.globalAlpha = 0.18; x.strokeStyle = cs(lt); x.lineWidth = 0.035;
    for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; x.beginPath(); x.moveTo(Math.cos(a) * 0.38, Math.sin(a) * 0.38); x.lineTo(Math.cos(a) * 0.86, Math.sin(a) * 0.86); x.stroke(); }
    x.globalAlpha = 1;
  }
  // Pupille
  const ps = (E.pupil || 1) * 0.42; x.fillStyle = cs(dk.clone().multiplyScalar(0.25)); x.strokeStyle = x.fillStyle;
  x.beginPath();
  if (E.type === "rund" || E.type === "glanz") x.ellipse(0, 0.04, ps, ps * 1.05, 0, 0, Math.PI * 2);
  else if (E.type === "schlitz") x.ellipse(0, 0, ps * 0.26, ps * 1.7, 0, 0, Math.PI * 2);
  else if (E.type === "stern") { for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = (i % 2 ? 0.45 : 1.15) * ps; x.lineTo(Math.cos(a) * r, Math.sin(a) * r); } x.closePath(); }
  else if (E.type === "raute") { x.moveTo(0, -ps * 1.25); x.lineTo(ps * 0.75, 0); x.lineTo(0, ps * 1.25); x.lineTo(-ps * 0.75, 0); x.closePath(); }
  else if (E.type === "ring") { x.ellipse(0, 0, ps * 1.05, ps * 1.1, 0, 0, Math.PI * 2); x.ellipse(0, 0, ps * 0.6, ps * 0.66, 0, 0, Math.PI * 2, true); }
  if (E.type !== "leer") x.fill("evenodd");
  // Glanzpunkte (oben links groß, unten rechts klein)
  if (E.shine !== false) {
    x.fillStyle = "rgba(255,255,255,0.95)";
    x.beginPath(); x.ellipse(-0.36, -0.42, 0.26, 0.21, -0.4, 0, Math.PI * 2); x.fill();
    x.beginPath(); x.ellipse(0.38, 0.4, 0.11, 0.09, 0, 0, Math.PI * 2); x.fill();
    if (E.type === "glanz") { x.fillStyle = "rgba(255,255,255,0.35)"; x.beginPath(); x.ellipse(0, 0.62, 0.55, 0.16, 0, 0, Math.PI * 2); x.fill(); }
  }
  x.restore();
  return c;
}

// ---------- Brauen-Textur: Gesicht von vorne, Ausschnitt FACE (x links→rechts in Figur-Koordinaten, y oben) ----------
const FACE = { x0: -0.1, x1: 0.1, y0: 1.2, y1: 1.34 };
// Mittellinie (u von innen 0 nach außen 1, v hoch, in Metern) und Dicke je Brauen-Art
const BROWS = {
  bogen: { pts: [[0, 0], [0.4, 0.006], [0.75, 0.0055], [1, 0.0005]], th: [0.0042, 0.0036, 0.0022, 0.0009] },
  gerade: { pts: [[0, 0], [0.5, 0.001], [1, 0.0005]], th: [0.0036, 0.0034, 0.002] },
  duenn: { pts: [[0, 0], [0.45, 0.0065], [1, 0.001]], th: [0.0018, 0.0016, 0.0007] },
  kraeftig: { pts: [[0, 0], [0.45, 0.004], [1, 0.001]], th: [0.0066, 0.0058, 0.0032] },
  wuetend: { pts: [[0, -0.003], [0.5, 0.002], [1, 0.0045]], th: [0.0048, 0.004, 0.0018] },
  besorgt: { pts: [[0, 0.0055], [0.45, 0.003], [1, -0.002]], th: [0.0036, 0.003, 0.0014] },
  kurz: { pts: [[0.12, 0], [0.42, 0.0012]], th: [0.0062, 0.0062], round: true }
};
function browCanvas(B) {
  const W = 512, H = Math.round(W * (FACE.y1 - FACE.y0) / (FACE.x1 - FACE.x0)), c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d"), sx = W / (FACE.x1 - FACE.x0), px = (X) => (X - FACE.x0) * sx, py = (Y) => (FACE.y1 - Y) * sx;
  const D = BROWS[B.type] || BROWS.bogen, len = 0.046 * (B.size || 1), th = B.thick || 1, tilt = (B.tilt || 0) * Math.PI / 180;
  x.fillStyle = B.color || "#3B2A22";
  [1, -1].forEach((side) => {
    // Brauenansatz innen, Höhe über dem Auge
    const x0 = side * (0.019 + (B.gap || 0) * 0.001), y0 = 1.2905 + (B.y || 0) * 0.001;
    const pts = D.pts.map(([u, v]) => { const a = tilt; const lx = u * len, ly = v * (B.size || 1); return [x0 + side * (lx * Math.cos(a) - ly * Math.sin(a)), y0 + lx * Math.sin(a) + ly * Math.cos(a)]; });
    // fein abtasten: Catmull-Rom über die Stützpunkte
    const N = 40, cl = [];
    for (let i = 0; i <= N; i++) {
      const tt = i / N * (pts.length - 1), k = Math.min(pts.length - 2, Math.floor(tt)), f = tt - k;
      const p0 = pts[Math.max(0, k - 1)], p1 = pts[k], p2 = pts[k + 1], p3 = pts[Math.min(pts.length - 1, k + 2)];
      const cr = (a, b, c2, d) => 0.5 * (2 * b + (-a + c2) * f + (2 * a - 5 * b + 4 * c2 - d) * f * f + (-a + 3 * b - 3 * c2 + d) * f * f * f);
      const tk = tt / (pts.length - 1) * (D.th.length - 1), j = Math.min(D.th.length - 2, Math.floor(tk)), h = D.th[j] + (D.th[j + 1] - D.th[j]) * (tk - j);
      cl.push([cr(p0[0], p1[0], p2[0], p3[0]), cr(p0[1], p1[1], p2[1], p3[1]), h * th]);
    }
    const up = [], dn = [];
    cl.forEach((p, i) => { const q = cl[Math.min(cl.length - 1, i + 1)], r = cl[Math.max(0, i - 1)]; let tx = q[0] - r[0], ty = q[1] - r[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l; const nx = -ty * side, ny = tx * side; up.push([p[0] + nx * p[2] * 0.55, p[1] + Math.abs(ny) * p[2] * 0.55]); dn.push([p[0] - nx * p[2] * 0.45, p[1] - Math.abs(ny) * p[2] * 0.45]); });
    x.beginPath(); up.forEach((p, i) => (i ? x.lineTo(px(p[0]), py(p[1])) : x.moveTo(px(p[0]), py(p[1])))); dn.reverse().forEach((p) => x.lineTo(px(p[0]), py(p[1]))); x.closePath();
    if (D.round) { x.lineJoin = "round"; x.lineWidth = cl[0][2] * sx * 0.9; x.strokeStyle = x.fillStyle; x.stroke(); }
    x.fill();
  });
  return c;
}

// ---------- Material: Haut + Kleidung + Brauen, Augen, Zähne/Zunge in einem Shader ----------
function makeMaterial(head) {
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.62, metalness: 0 });
  const eL = head.eyes.L, eR = head.eyes.R;
  const axes = (e) => {   // Blickachse durch die Mitte der Lidöffnung
    const c = new THREE.Vector3().fromArray(e.c), dx = e.open[0] - e.c[0], dy = e.open[1] - e.c[1];
    const g = new THREE.Vector3(dx, dy, Math.sqrt(Math.max(1e-6, e.r * e.r - dx * dx - dy * dy))).normalize();
    const r = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), g).normalize(), u = new THREE.Vector3().crossVectors(g, r);
    return { c: c, g: g, r: r, u: u, rad: e.r };
  };
  const A = axes(eL), B = axes(eR);
  const U = m.userData.U = {
    uSkin: { value: new THREE.Color() }, uEye: { value: null }, uBrow: { value: null },
    uEcL: { value: A.c }, uErL: { value: A.r }, uEuL: { value: A.u }, uEgL: { value: A.g },
    uEcR: { value: B.c }, uErR: { value: B.r }, uEuR: { value: B.u }, uEgR: { value: B.g }, uErad: { value: A.rad },
    uFace: { value: new THREE.Vector4(FACE.x0, FACE.y0, FACE.x1 - FACE.x0, FACE.y1 - FACE.y0) }, uBottom: { value: 1 }
  };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = "attribute float aPart;\nattribute vec4 aHair;\nvarying vec3 vRP;\nvarying vec3 vRN;\nvarying float vPart;\nvarying vec4 vHair;\n" +
      sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\n vRP = position; vRN = normal; vPart = aPart; vHair = aHair;");
    sh.fragmentShader = "varying vec3 vRP;\nvarying vec3 vRN;\nvarying float vPart;\nvarying vec4 vHair;\nuniform vec3 uSkin;\nuniform sampler2D uEye;\nuniform sampler2D uBrow;\n" +
      "uniform vec3 uEcL, uErL, uEuL, uEgL, uEcR, uErR, uEuR, uEgR;\nuniform float uErad;\nuniform vec4 uFace;\nuniform float uBottom;\n" +
      "float pruRough = -1.0;\n" +
      // Speedo nach Noahs Skizze: blau, dunkler Bund, türkise Kanten, seitlich Rot/Orange/Gelb (schräg)
      "vec4 pruSpeedo(vec3 p){\n" +
      " if (abs(p.x) > 0.17 || p.y > 0.76 || p.y < 0.55) return vec4(0.0);\n" +
      " float yTop = 0.733 + 0.004 * smoothstep(0.0, 0.12, abs(p.x));\n" +
      " float sg = p.x >= 0.0 ? 1.0 : -1.0; vec2 q = vec2((p.x - sg * 0.075) * sg, p.z + 0.035);\n" +
      " float th = atan(q.y, q.x); float w = (1.0 - cos(th)) * 0.5;\n" +
      " float yOpen = (yTop - 0.046) - ((yTop - 0.046) - 0.612) * pow(w, q.y > 0.0 ? 1.45 : 0.85);\n" +
      " float dTop = yTop - p.y, dOpen = p.y - yOpen, d = min(dTop, dOpen);\n" +
      " float aa = max(fwidth(d), 1e-5);\n" +
      " float inside = smoothstep(-aa, aa, d);\n" +
      " if (inside <= 0.0) { float sh = 1.0 - 0.22 * (1.0 - smoothstep(0.0, 0.004, -d)); return vec4(sh, sh, sh, -1.0); }\n" +
      " vec3 blue = vec3(0.016, 0.13, 0.30), band = vec3(0.008, 0.06, 0.15), trim = vec3(0.02, 0.38, 0.72);\n" +
      " vec3 red = vec3(0.78, 0.016, 0.02), ora = vec3(0.92, 0.24, 0.012), yel = vec3(0.95, 0.62, 0.012);\n" +
      " vec3 col = blue;\n" +
      " float phi = degrees(abs(atan(p.x, p.z + 0.03))); float s = clamp(dTop / 0.046, 0.0, 1.2); float rr = 0.13 * 0.01745;\n" +
      " float b1 = 64.0 - 12.0 * s, b2 = 72.0 - 12.0 * s, b3 = 85.0 - 5.0 * s, b4 = 104.0;\n" +
      " if (dTop > 0.011 && abs(p.x) > 0.06 && phi > b1 && phi < b4) { col = phi < b2 ? yel : phi < b3 ? ora : red;\n" +
      "   float e = min(min(abs(phi - b1), abs(phi - b2)), min(abs(phi - b3), abs(phi - b4))) * rr; float ea = max(fwidth(e), 1e-5); col = mix(trim, col, smoothstep(0.0011 - ea, 0.0011 + ea, e)); }\n" +
      " if (dTop < 0.011) col = band;\n" +
      " float t1 = abs(dTop - 0.011); col = mix(trim, col, smoothstep(0.0009 - aa, 0.0009 + aa, t1));\n" +
      " col = mix(trim, col, smoothstep(0.0018 - aa, 0.0018 + aa, d));\n" +
      " return vec4(col, inside);\n}\n" +
      sh.fragmentShader
        .replace("#include <color_fragment>", "#include <color_fragment>\n" +
          " if (vPart > 1.5 && vPart < 3.5) {\n" +
          "   bool L = vPart < 2.5; vec3 c = L ? uEcL : uEcR; vec3 dd = normalize(vRP - c);\n" +
          "   vec2 e = vec2(dot(dd, L ? uErL : uErR), dot(dd, L ? uEuL : uEuR));\n" +
          "   vec3 ec = texture2D(uEye, vec2(e.x * 0.5 + 0.5, e.y * 0.5 + 0.5)).rgb;\n" +
          "   diffuseColor.rgb = dot(dd, L ? uEgL : uEgR) > 0.0 ? ec : vec3(0.9); pruRough = 0.18;\n" +
          " } else if (vPart > 3.5) { diffuseColor.rgb = vPart < 4.5 ? vec3(0.86, 0.84, 0.8) : vec3(0.45, 0.14, 0.16); pruRough = 0.4; }\n" +
          " else {\n" +
          "   vec3 sk = uSkin;\n" +
          "   vec2 fu = (vRP.xy - uFace.xy) / uFace.zw;\n" +
          "   if (fu.x > 0.0 && fu.x < 1.0 && fu.y > 0.0 && fu.y < 1.0 && vRN.z > 0.2 && vRP.z > 0.0) { vec4 br = texture2D(uBrow, fu); sk = mix(sk, br.rgb, br.a * smoothstep(0.2, 0.45, vRN.z)); }\n" +
          "   diffuseColor.rgb = mix(sk, vHair.rgb, vHair.a);\n" +
          "   if (uBottom > 0.5) { vec4 sp = pruSpeedo(vRP); if (sp.a < 0.0) diffuseColor.rgb *= sp.r; else if (sp.a > 0.0) { diffuseColor.rgb = mix(diffuseColor.rgb, sp.rgb, sp.a); pruRough = mix(0.62, 0.38, sp.a); } }\n" +
          " }")
        .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\n if (pruRough >= 0.0) roughnessFactor = pruRough;");
  };
  m.customProgramCacheKey = () => "pru-figur";
  return m;
}

// ---------- Figur ----------
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), DN = new THREE.Vector3(0, -1, 0);
export class Figur {
  constructor(scene, data, look) {
    const H = data.head, J = H.joints;
    this.scene = scene; this.data = data;
    this.root = new THREE.Group(); this.root.name = "figur";
    this.pivot = new THREE.Group(); this.pivot.position.y = J.Hips[1]; this.root.add(this.pivot);
    this.k = J.Hips[1] / HIP_H;   // Größenverhältnis zum Runner (Beckenhöhe)
    // Knochen: Weltposition = Gelenk, Weltdrehung so, dass die Ruherichtung (-Y) aufs nächste Gelenk zeigt (Arme/Beine), sonst 0
    const next = { LeftUpperArm: "LeftLowerArm", LeftLowerArm: "LeftHand", RightUpperArm: "RightLowerArm", RightLowerArm: "RightHand",
      LeftUpperLeg: "LeftLowerLeg", LeftLowerLeg: "LeftFoot", RightUpperLeg: "RightLowerLeg", RightLowerLeg: "RightFoot" };
    this.b = {}; const wq = {}, wp = {};
    BONES.forEach(([n, p]) => {
      const bone = new THREE.Bone(); bone.name = n; this.b[n] = bone;
      const P = new THREE.Vector3().fromArray(J[n]); wp[n] = P;
      const Q = new THREE.Quaternion();
      if (next[n]) Q.setFromUnitVectors(DN, new THREE.Vector3().fromArray(J[next[n]]).sub(P).normalize());
      else if (/Hand/.test(n)) Q.copy(wq[p]);
      wq[n] = Q;
      const pq = p ? wq[p] : new THREE.Quaternion(), pp = p ? wp[p] : new THREE.Vector3(0, J.Hips[1], 0), iq = pq.clone().invert();
      bone.position.copy(P.clone().sub(pp).applyQuaternion(iq));
      bone.quaternion.copy(iq.multiply(Q));
      (p ? this.b[p] : this.pivot).add(bone);
    });
    this.mat = makeMaterial(H);
    const geo = data.geo.clone(); geo.setAttribute("aHair", new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 4), 4));   // Kopfhaut-Tönung unter den Haaren
    this.mesh = new THREE.SkinnedMesh(geo, this.mat);
    this.mesh.castShadow = true; this.mesh.receiveShadow = true; this.mesh.frustumCulled = false;
    this.root.add(this.mesh);
    this.root.updateMatrixWorld(true);
    this.skeleton = new THREE.Skeleton(BONES.map(([n]) => this.b[n]));
    this.mesh.bind(this.skeleton);
    this.rest();
    scene.add(this.root);
    this.hair = new Hair(this);
    this.look = null; this.setLook(look);
  }
  // Ruhe wie der Runner: alle Drehungen 0 → Arme und Beine gerade nach unten
  rest() { for (const n in this.b) this.b[n].quaternion.identity(); this.pivot.position.set(0, HIP_H * this.k, 0); this.pivot.rotation.set(0, 0, 0); }
  setLook(look) {
    const L = this.look = cloneLook(look), U = this.mat.userData.U;
    U.uSkin.value.set(L.skin);
    const tx = (cv, old) => { if (old) old.dispose(); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t; };
    const ke = JSON.stringify(L.eyes), kb = JSON.stringify(L.brows);   // Leinwände nur neu zeichnen, wenn sich etwas geändert hat
    if (ke !== this.ke) { this.ke = ke; U.uEye.value = tx(eyeCanvas(L.eyes), U.uEye.value); }
    if (kb !== this.kb) { this.kb = kb; U.uBrow.value = tx(browCanvas(L.brows), U.uBrow.value); }
    U.uBottom.value = L.bottom === "speedo" ? 1 : 0;
    this.hair.setData(L.hair);
  }
  // Pose vom (unsichtbaren) Runner übernehmen: lokale Drehungen 1:1, Becken skaliert
  follow(r) {
    for (const n in this.b) this.b[n].quaternion.copy(r.b[n].quaternion);
    // Arme etwas weiter vom Körper (breitere Hüfte als beim Runner), sonst streifen die Hände die Oberschenkel
    this.b.LeftUpperArm.quaternion.premultiply(_q.setFromAxisAngle(_v.set(0, 0, 1), 0.12));
    this.b.RightUpperArm.quaternion.premultiply(_q.setFromAxisAngle(_v.set(0, 0, 1), -0.12));
    this.pivot.position.copy(r.pivot.position).multiplyScalar(this.k);
    this.pivot.quaternion.copy(r.pivot.quaternion);
    this.root.position.copy(r.root.position); this.root.quaternion.copy(r.root.quaternion);
  }
  setVisible(v) { this.root.visible = v; }
  dispose() {
    this.hair.dispose(); this.scene.remove(this.root); this.mesh.geometry.dispose();
    const U = this.mat.userData.U; if (U.uEye.value) U.uEye.value.dispose(); if (U.uBrow.value) U.uBrow.value.dispose(); this.mat.dispose();
  }
}
