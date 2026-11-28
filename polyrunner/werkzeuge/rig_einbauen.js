// ===== rig_einbauen.js · baut das Standard-Rig (RIG_DEFAULT in src/rig.js) fest in polyrunner/model/figur.bin ein (seit v0.22) =====
// Ablauf (Node, im Repo-Hauptordner):  node polyrunner/werkzeuge/rig_einbauen.js
// Lädt rig.js im Browser (Playwright), rechnet die Gewichte mit genau derselben Funktion wie das Spiel (computeWeights)
// auf den Punkten aus figur.bin und schreibt Gelenke + Gewichte zurück. Punkte, Dreiecke und Teile bleiben unverändert.
// Dadurch ist das Standard-Rig im Spiel identisch zu dem, was der Rig-Reiter für dieselben Werte rechnet.
const fs = require("fs"), path = require("path"), http = require("http");
const ROOT = path.resolve(__dirname, "../.."), BIN = path.join(ROOT, "polyrunner/model/figur.bin");

const buf = fs.readFileSync(BIN), hl = buf.readUInt32LE(4), head = JSON.parse(buf.slice(8, 8 + hl).toString());
let o = 8 + hl; const n = head.n, T = head.tris;
const qOff = o; o += n * 6; const iOff = o; o += T * 6; o = (o + 3) & ~3;
const siOff = o; o += n * 4; const swOff = o; o += n * 4; const pOff = o;

const { chromium } = require("playwright");
const srv = http.createServer((q, r) => {
  const f = path.join(ROOT, decodeURIComponent(q.url.split("?")[0]));
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { "Content-Type": f.endsWith(".js") ? "text/javascript" : f.endsWith(".html") ? "text/html" : "application/octet-stream" }); r.end(d); });
}).listen(8798);
const html = '<!doctype html><script type="importmap">{"imports":{"three":"/polyracer/lib/three.module.min.js","pru/":"/polyrunner/src/"}}</script>' +
  '<script type="module">import * as THREE from "three"; import { computeWeights, cloneRig, RIG_DEFAULT, fullJoints } from "pru/rig.js"; import { BONES } from "pru/runner.js";' +
  'const b = await (await fetch("/polyrunner/model/figur.bin?" + Date.now())).arrayBuffer(); const dv = new DataView(b), hl = dv.getUint32(4, true), head = JSON.parse(new TextDecoder().decode(new Uint8Array(b, 8, hl)));' +
  'let o = 8 + hl; const n = head.n, T = head.tris, q = new Uint16Array(b, o, n * 3); o += n * 6; const idx = new Uint16Array(b, o, T * 3); o += T * 6; o = (o + 3) & ~3; o += n * 8; const part = new Uint8Array(b, o, n);' +
  'const pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) pos[i * 3 + k] = head.min[k] + q[i * 3 + k] / 65535 * (head.max[k] - head.min[k]);' +
  'const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setIndex(new THREE.BufferAttribute(new Uint16Array(idx), 1)); g.setAttribute("aPart", new THREE.BufferAttribute(new Float32Array(part), 1));' +
  'const r = cloneRig(RIG_DEFAULT), w = computeWeights(g, r), J = fullJoints(r), joints = {}; BONES.forEach(([nm]) => { joints[nm] = J[nm]; });' +
  'window.OUT = { si: Array.from(w.si), sw: Array.from(w.sw, (v) => Math.round(v * 255)), joints: joints, bones: BONES.map((x) => x[0]) };</script>';
fs.writeFileSync(path.join(ROOT, "_rig_einbauen.html"), html);
(async () => {
  const b = await chromium.launch(), pg = await b.newPage();
  pg.on("pageerror", (e) => console.log("Fehler:", e.message));
  await pg.goto("http://localhost:8798/_rig_einbauen.html"); await pg.waitForFunction(() => window.OUT, null, { timeout: 120000 });
  const R = await pg.evaluate(() => window.OUT); await b.close(); srv.close(); fs.unlinkSync(path.join(ROOT, "_rig_einbauen.html"));
  // neuer Kopf (gleiche Länge auffüllen, falls kürzer; sonst Datei neu zusammensetzen)
  const h2 = Object.assign({}, head, { bones: R.bones, joints: R.joints, rig: "RIG_DEFAULT" });
  let hj = Buffer.from(JSON.stringify(h2)); const pad = (4 - (hj.length % 4)) % 4; hj = Buffer.concat([hj, Buffer.alloc(pad, 32)]);
  const body = Buffer.from(buf.slice(qOff, siOff)), si = Buffer.from(Uint8Array.from(R.si)), sw = Buffer.from(Uint8Array.from(R.sw)), part = buf.slice(pOff, pOff + n);
  // Abstand zwischen Index und Gewichten wie beim Bauen (auf 4 Bytes ausrichten)
  const parts = [Buffer.from("PRF1"), Buffer.from(new Uint32Array([hj.length]).buffer), hj, buf.slice(qOff, iOff + T * 6)];
  let len = parts.reduce((a, x) => a + x.length, 0); if (len % 4) parts.push(Buffer.alloc(4 - (len % 4)));
  parts.push(si, sw, Buffer.from(part));
  fs.writeFileSync(BIN, Buffer.concat(parts));
  console.log("figur.bin: Rig eingebaut,", n, "Punkte,", Math.round(fs.statSync(BIN).size / 1024), "KB");
})();
