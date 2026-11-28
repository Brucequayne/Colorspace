// ===== figur_bauen.js · macht aus dem FBX-Modell die Spieldatei polyrunner/model/figur.bin =====
// Ablauf (Node, im Repo-Hauptordner):
//   1. node polyrunner/werkzeuge/figur_bauen.js dump     → lädt das FBX per Three.js im Browser (Playwright), schreibt figur_roh.json
//   2. node polyrunner/werkzeuge/figur_bauen.js          → Auto-Rig (Gelenke unten in J), Gewichte, schreibt polyrunner/model/figur.bin
// Das Modell selbst wird nicht verändert: nur auf 1,40 m skaliert, Füße auf y = 0, gleiche Punkte zusammengelegt.
const fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "../.."), FBX = "polyrunner/model/quelle/Charakter_Polyrunner.fbx";
const RAW = path.join(__dirname, "figur_roh.json"), OUT = path.join(ROOT, "polyrunner/model/figur.bin");
const HEIGHT = 1.4;

if (process.argv[2] === "dump") {
  const { chromium } = require("playwright"), http = require("http");
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split("?")[0])); fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { "Content-Type": f.endsWith(".js") ? "text/javascript" : f.endsWith(".html") ? "text/html" : "application/octet-stream" }); r.end(d); }); }).listen(8799);
  const html = '<!doctype html><script type="importmap">{"imports":{"three":"/polyracer/lib/three.module.min.js","three/addons/":"/polyracer/lib/addons/"}}</script><script type="module">' +
    'import { FBXLoader } from "three/addons/loaders/FBXLoader.js"; new FBXLoader().load("/' + FBX + '", (g) => { g.updateMatrixWorld(true); const m = g.children.find((o) => o.isMesh);' +
    ' const geo = m.geometry.clone(); geo.applyMatrix4(m.matrixWorld); const tm = new Uint8Array(geo.attributes.position.count / 3); geo.groups.forEach((gr) => { for (let i = gr.start / 3; i < (gr.start + gr.count) / 3; i++) tm[i] = gr.materialIndex; });' +
    ' window.OUT = { pos: Array.from(geo.attributes.position.array), tm: Array.from(tm) }; });</script>';
  fs.writeFileSync(path.join(ROOT, "_figur_dump.html"), html);
  (async () => {
    const b = await chromium.launch(), pg = await b.newPage();
    await pg.goto("http://localhost:8799/_figur_dump.html"); await pg.waitForFunction(() => window.OUT, null, { timeout: 120000 });
    fs.writeFileSync(RAW, JSON.stringify(await pg.evaluate(() => window.OUT))); await b.close(); srv.close(); fs.unlinkSync(path.join(ROOT, "_figur_dump.html"));
    console.log("geschrieben:", RAW);
  })();
  return;
}

// ---------- Punkte zusammenlegen, skalieren ----------
const R = JSON.parse(fs.readFileSync(RAW)), P = R.pos;
let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
for (let i = 0; i < P.length; i += 3) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], P[i + k]); mx[k] = Math.max(mx[k], P[i + k]); }
const S = HEIGHT / (mx[1] - mn[1]), cx = (mn[0] + mx[0]) / 2;
const key = new Map(), V = [], I = [], triMat = R.tm;
for (let i = 0; i < P.length; i += 3) {
  const x = (P[i] - cx) * S, y = (P[i + 1] - mn[1]) * S, z = P[i + 2] * S, k = Math.round(x * 1e5) + "," + Math.round(y * 1e5) + "," + Math.round(z * 1e5);
  let id = key.get(k); if (id == null) { id = V.length / 3; V.push(x, y, z); key.set(k, id); } I.push(id);
}
const n = V.length / 3, T = I.length / 3, pv = (i) => [V[i * 3], V[i * 3 + 1], V[i * 3 + 2]];
// Nachbarn und zusammenhängende Teile
const nb = Array.from({ length: n }, () => new Set());
for (let t = 0; t < T; t++) for (let k = 0; k < 3; k++) { const a = I[t * 3 + k], b = I[t * 3 + (k + 1) % 3]; nb[a].add(b); nb[b].add(a); }
const comp = new Int32Array(n).fill(-1); let nc = 0; const csize = [];
for (let i = 0; i < n; i++) if (comp[i] < 0) { const st = [i]; comp[i] = nc; let c = 0; while (st.length) { const a = st.pop(); c++; nb[a].forEach((b) => { if (comp[b] < 0) { comp[b] = nc; st.push(b); } }); } csize.push(c); nc++; }
const body = csize.indexOf(Math.max(...csize));
// Teile: 0 Haut, 1 Haut Hände/Füße, 2 Auge links (+x), 3 Auge rechts, 4 Zähne, 5 Zunge
const part = new Uint8Array(n);
for (let t = 0; t < T; t++) if (triMat[t] === 1) for (let k = 0; k < 3; k++) part[I[t * 3 + k]] = 1;
const pieces = {};
for (let i = 0; i < n; i++) if (comp[i] !== body) (pieces[comp[i]] = pieces[comp[i]] || []).push(i);
const eyes = {};
Object.values(pieces).forEach((ids) => {
  const c = [0, 0, 0]; ids.forEach((i) => { for (let k = 0; k < 3; k++) c[k] += V[i * 3 + k] / ids.length; });
  const mnz = Math.min(...ids.map((i) => V[i * 3 + 2])), mxz = Math.max(...ids.map((i) => V[i * 3 + 2]));
  let p;
  if (c[1] > 1.22 && Math.abs(c[0]) > 0.02) p = c[0] > 0 ? 2 : 3; else p = ids.length < 150 ? 5 : 4;
  ids.forEach((i) => { part[i] = p; });
  if (p === 2 || p === 3) {
    // Kugel anpassen (Mittelpunkt, Radius)
    const Q = ids.map(pv); let cc = c.slice(), r = 0;
    for (let it = 0; it < 300; it++) { r = Q.reduce((a, q) => a + Math.hypot(q[0] - cc[0], q[1] - cc[1], q[2] - cc[2]), 0) / Q.length; const g = [0, 0, 0]; Q.forEach((q) => { const d = Math.hypot(q[0] - cc[0], q[1] - cc[1], q[2] - cc[2]); for (let k = 0; k < 3; k++) g[k] += (d - r) * (cc[k] - q[k]) / d; }); for (let k = 0; k < 3; k++) cc[k] -= g[k] / Q.length; }
    // sichtbare Öffnung: Hautpunkte, die die Kugel berühren
    const rim = []; for (let i = 0; i < n; i++) { if (comp[i] !== body) continue; const q = pv(i); if (Math.sign(q[0]) !== Math.sign(cc[0]) || q[1] < cc[1] - 0.05 || q[1] > cc[1] + 0.05) continue; let md = 9; for (const e of Q) { const d = Math.hypot(q[0] - e[0], q[1] - e[1], q[2] - e[2]); if (d < md) md = d; } if (md < 0.003) rim.push(q); }
    const rmn = [0, 1, 2].map((k) => Math.min(...rim.map((q) => q[k]))), rmx = [0, 1, 2].map((k) => Math.max(...rim.map((q) => q[k])));
    eyes[p === 2 ? "L" : "R"] = { c: cc.map(r5), r: r5(r), open: [r5((rmn[0] + rmx[0]) / 2), r5((rmn[1] + rmx[1]) / 2)], w: r5(rmx[0] - rmn[0]), h: r5(rmx[1] - rmn[1]) };
  }
});
function r5(v) { return Math.round(v * 1e5) / 1e5; }

// ---------- Gelenke (linke Seite, rechte gespiegelt) ----------
const J = {
  Hips: [0, 0.69, -0.03], Spine: [0, 0.78, -0.03], Chest: [0, 0.92, -0.035], Neck: [0, 1.1, -0.035], Head: [0, 1.165, -0.02], _HeadEnd: [0, 1.4, -0.02],
  LeftShoulder: [0.025, 1.05, -0.035], LeftUpperArm: [0.125, 1.045, -0.04], LeftLowerArm: [0.216, 0.93, -0.028], LeftHand: [0.311, 0.811, 0.0], _LeftHandEnd: [0.36, 0.712, 0.03],
  LeftUpperLeg: [0.075, 0.69, -0.03], LeftLowerLeg: [0.078, 0.375, -0.045], LeftFoot: [0.08, 0.065, -0.065], LeftToes: [0.08, 0.015, 0.03], _LeftToesEnd: [0.08, 0.01, 0.07]
};
Object.keys(J).forEach((k) => { if (/Left/.test(k)) { const v = J[k]; J[k.replace("Left", "Right")] = [-v[0], v[1], v[2]]; } });
const BONES = ["Hips", "Spine", "Chest", "Neck", "Head", "LeftShoulder", "LeftUpperArm", "LeftLowerArm", "LeftHand", "RightShoulder", "RightUpperArm", "RightLowerArm", "RightHand",
  "LeftUpperLeg", "LeftLowerLeg", "LeftFoot", "LeftToes", "RightUpperLeg", "RightLowerLeg", "RightFoot", "RightToes"];
// Segment je Knochen: Gelenk → nächstes Gelenk
const SEG = {
  Hips: [[0, 0.62, -0.03], J.Spine], Spine: [J.Spine, J.Chest], Chest: [J.Chest, J.Neck], Neck: [J.Neck, J.Head], Head: [J.Head, J._HeadEnd]
};
["Left", "Right"].forEach((s) => {
  SEG[s + "Shoulder"] = [J[s + "Shoulder"], J[s + "UpperArm"]]; SEG[s + "UpperArm"] = [J[s + "UpperArm"], J[s + "LowerArm"]]; SEG[s + "LowerArm"] = [J[s + "LowerArm"], J[s + "Hand"]]; SEG[s + "Hand"] = [J[s + "Hand"], J["_" + s + "HandEnd"]];
  SEG[s + "UpperLeg"] = [J[s + "UpperLeg"], J[s + "LowerLeg"]]; SEG[s + "LowerLeg"] = [J[s + "LowerLeg"], J[s + "Foot"]]; SEG[s + "Foot"] = [J[s + "Foot"], J[s + "Toes"]]; SEG[s + "Toes"] = [J[s + "Toes"], J["_" + s + "ToesEnd"]];
});
function segDist(p, a, b) { const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], ap = [p[0] - a[0], p[1] - a[1], p[2] - a[2]]; const l = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2; let t = (ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / l; t = Math.max(0, Math.min(1, t)); return Math.hypot(ap[0] - ab[0] * t, ap[1] - ab[1] * t, ap[2] - ab[2] * t); }
const NB = BONES.length, W = new Float32Array(n * NB);
for (let i = 0; i < n; i++) {
  const p = pv(i); let best = -1, bd = 1e9;
  if (part[i] >= 2) best = BONES.indexOf("Head");
  else BONES.forEach((bn, bi) => {
    const side = /^Left/.test(bn) ? 1 : /^Right/.test(bn) ? -1 : 0;
    if (side && p[0] * side < -0.004) return;                       // nur die eigene Körperseite
    if (/Arm|Hand|Shoulder/.test(bn) && p[1] < 0.66) return;
    if (/Leg|Foot|Toes/.test(bn) && p[1] > 0.76) return;
    let d = segDist(p, SEG[bn][0], SEG[bn][1]);
    if (/Hand/.test(bn) && part[i] === 1) d *= 0.5;                  // Hautteil „Hand“ gehört sicher zur Hand
    if (/Foot|Toes/.test(bn) && part[i] !== 1 && p[1] > 0.12) d *= 2;
    if (d < bd) { bd = d; best = bi; }
  });
  W[i * NB + best] = 1;
}
// Gewichte über die Oberfläche glätten (weiche Übergänge an den Gelenken, nur innerhalb zusammenhängender Haut)
const nbA = nb.map((s) => Array.from(s)); let W2 = new Float32Array(W.length);
for (let it = 0; it < 14; it++) {
  for (let i = 0; i < n; i++) {
    const o = i * NB;
    if (part[i] >= 2) { for (let b = 0; b < NB; b++) W2[o + b] = W[o + b]; continue; }
    const ns = nbA[i]; for (let b = 0; b < NB; b++) { let s = 0; for (const j of ns) s += W[j * NB + b]; W2[o + b] = 0.5 * W[o + b] + 0.5 * s / ns.length; }
  }
  const tmp = W; W.set(W2); W2 = tmp;
}
// beste vier Knochen je Punkt, als Bytes
const SI = new Uint8Array(n * 4), SW = new Uint8Array(n * 4);
for (let i = 0; i < n; i++) {
  const arr = []; for (let b = 0; b < NB; b++) if (W[i * NB + b] > 0.004) arr.push([b, W[i * NB + b]]);
  arr.sort((a, b) => b[1] - a[1]); const top = arr.slice(0, 4), sum = top.reduce((a, x) => a + x[1], 0);
  let rest = 255; top.forEach((x, k) => { const q = k === top.length - 1 ? rest : Math.round(x[1] / sum * 255); SI[i * 4 + k] = x[0]; SW[i * 4 + k] = q; rest -= q; });
}
// ---------- schreiben ----------
mn = [1e9, 1e9, 1e9]; mx = [-1e9, -1e9, -1e9];
for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], V[i * 3 + k]); mx[k] = Math.max(mx[k], V[i * 3 + k]); }
const joints = {}; BONES.forEach((b) => { joints[b] = J[b]; });
const head = { format: "polyrunner-figur", v: 1, n: n, tris: T, min: mn.map(r5), max: mx.map(r5), bones: BONES, joints: joints, eyes: eyes, height: HEIGHT };
let hj = Buffer.from(JSON.stringify(head)); const pad = (4 - (hj.length % 4)) % 4; hj = Buffer.concat([hj, Buffer.alloc(pad, 32)]);
const q = new Uint16Array(n * 3); for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) q[i * 3 + k] = Math.round((V[i * 3 + k] - mn[k]) / (mx[k] - mn[k]) * 65535);
const idx = new Uint16Array(I);
const parts = [Buffer.from("PRF1"), Buffer.from(new Uint32Array([hj.length]).buffer), hj, Buffer.from(q.buffer), Buffer.from(idx.buffer)];
let len = parts.reduce((a, b) => a + b.length, 0); if (len % 4) parts.push(Buffer.alloc(4 - (len % 4)));
parts.push(Buffer.from(SI.buffer), Buffer.from(SW.buffer), Buffer.from(part.buffer));
fs.writeFileSync(OUT, Buffer.concat(parts));
console.log("figur.bin:", n, "Punkte,", T, "Dreiecke,", Math.round(fs.statSync(OUT).size / 1024), "KB · Augen", JSON.stringify(eyes));
