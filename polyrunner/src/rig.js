// ===== rig.js · Rig der Spielfigur (seit v0.21): Gelenke + Gewichte, im Browser berechnet =====
// Das Rig = Lage der Gelenke (linke Seite + Mitte, rechts gespiegelt) und ein paar Regeln für die Gewichte.
// Gewichte wie im Bau-Werkzeug (werkzeuge/figur_bauen.js): jeder Hautpunkt gehört zuerst dem nächsten Knochen-Segment,
// dann wird über die Oberfläche geglättet (Weichheit = Anzahl Glättungs-Runden). Augen/Zähne/Zunge hängen am Kopf.
// Gespeichert unter KEYS.rig; ohne gespeichertes Rig gilt RIG_DEFAULT (= das Rig in figur.bin).
import * as THREE from "three";
import { BONES } from "pru/runner.js";

// Standard = Werte aus figur_bauen.js (v0.14). Neues Rig von Noah → hier eintragen (und figur.bin neu bauen).
export const RIG_DEFAULT = {
  format: "polyrunner-rig", v: 1,
  joints: {
    _HipsLow: [0, 0.62, -0.03], Hips: [0, 0.69, -0.03], Spine: [0, 0.78, -0.03], Chest: [0, 0.92, -0.035], Neck: [0, 1.1, -0.035], Head: [0, 1.165, -0.02], _HeadEnd: [0, 1.4, -0.02],
    LeftShoulder: [0.025, 1.05, -0.035], LeftUpperArm: [0.125, 1.045, -0.04], LeftLowerArm: [0.216, 0.93, -0.028], LeftHand: [0.311, 0.811, 0.0], _LeftHandEnd: [0.36, 0.712, 0.03],
    LeftUpperLeg: [0.075, 0.69, -0.03], LeftLowerLeg: [0.078, 0.375, -0.045], LeftFoot: [0.08, 0.065, -0.065], LeftToes: [0.08, 0.015, 0.03], _LeftToesEnd: [0.08, 0.01, 0.07]
  },
  soft: 14,        // Glättungs-Runden der Gewichte (weichere Übergänge an den Gelenken)
  armY: 0.66,      // Arme/Hände/Schultern bekommen nur Punkte oberhalb dieser Höhe
  legY: 0.76,      // Beine/Füße bekommen nur Punkte unterhalb dieser Höhe
  spread: 0.12     // Arme im Spiel etwas vom Körper weg (Bogenmaß), sonst streifen die Hände die Oberschenkel
};
// Reihenfolge und Namen fürs Editor-Feld
export const RIG_JOINTS = [
  ["_HeadEnd", "Kopf oben", "Head top"], ["Head", "Kopf (Nicken)", "Head (nod)"], ["Neck", "Hals", "Neck"], ["Chest", "Brust", "Chest"], ["Spine", "Bauch", "Belly"], ["Hips", "Becken", "Pelvis"], ["_HipsLow", "Becken unten", "Pelvis bottom"],
  ["LeftShoulder", "Schlüsselbein", "Collarbone"], ["LeftUpperArm", "Schulter", "Shoulder"], ["LeftLowerArm", "Ellbogen", "Elbow"], ["LeftHand", "Handgelenk", "Wrist"], ["_LeftHandEnd", "Fingerspitzen", "Fingertips"],
  ["LeftUpperLeg", "Hüftgelenk", "Hip joint"], ["LeftLowerLeg", "Knie", "Knee"], ["LeftFoot", "Sprunggelenk", "Ankle"], ["LeftToes", "Zehenballen", "Ball of foot"], ["_LeftToesEnd", "Zehenspitzen", "Toe tips"]
];
// welcher Knochen gehört zu welchem Gelenk (für die Gewichte-Ansicht)
export function jointBone(k) { return k === "_HipsLow" ? "Hips" : k === "_HeadEnd" ? "Head" : k === "_LeftHandEnd" ? "LeftHand" : k === "_LeftToesEnd" ? "LeftToes" : k; }

export function cloneRig(r) {
  const d = RIG_DEFAULT, o = r || {}, J = {};
  for (const k in d.joints) J[k] = (o.joints && Array.isArray(o.joints[k]) && o.joints[k].length === 3 ? o.joints[k] : d.joints[k]).map(Number);
  ["Hips", "Spine", "Chest", "Neck", "Head", "_HeadEnd", "_HipsLow"].forEach((k) => { J[k][0] = 0; });   // Mitte bleibt auf x = 0
  const num = (k, lo, hi) => Math.min(hi, Math.max(lo, o[k] == null ? d[k] : +o[k]));
  return { format: "polyrunner-rig", v: 1, joints: J, soft: Math.round(num("soft", 0, 40)), armY: num("armY", 0.4, 1), legY: num("legY", 0.5, 1), spread: num("spread", -0.3, 0.5) };
}
export function sameRig(a, b) { return JSON.stringify(cloneRig(a)) === JSON.stringify(cloneRig(b)); }
// alle Gelenke mit rechter Seite
export function fullJoints(rig) {
  const J = {}; for (const k in rig.joints) J[k] = rig.joints[k].slice();
  Object.keys(rig.joints).forEach((k) => { if (/Left/.test(k)) { const v = rig.joints[k]; J[k.replace("Left", "Right")] = [-v[0], v[1], v[2]]; } });
  return J;
}

// ---------- Gewichte berechnen ----------
function segDist(p, a, b) {
  const abx = b[0] - a[0], aby = b[1] - a[1], abz = b[2] - a[2], apx = p[0] - a[0], apy = p[1] - a[1], apz = p[2] - a[2];
  const l = abx * abx + aby * aby + abz * abz; let t = l > 0 ? (apx * abx + apy * aby + apz * abz) / l : 0; t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(apx - abx * t, apy - aby * t, apz - abz * t);
}
const NBR = new WeakMap();   // Nachbarlisten je Grund-Geometrie (einmal)
function neighbours(geo) {
  let r = NBR.get(geo); if (r) return r;
  const n = geo.attributes.position.count, idx = geo.index.array, sets = Array.from({ length: n }, () => new Set());
  for (let t = 0; t < idx.length; t += 3) for (let k = 0; k < 3; k++) { const a = idx[t + k], b = idx[t + (k + 1) % 3]; sets[a].add(b); sets[b].add(a); }
  const off = new Uint32Array(n + 1); sets.forEach((s, i) => { off[i + 1] = off[i] + s.size; });
  const list = new Uint32Array(off[n]); sets.forEach((s, i) => { let o = off[i]; s.forEach((j) => { list[o++] = j; }); });
  r = { off: off, list: list }; NBR.set(geo, r); return r;
}
// → { si: Uint16Array(n*4) in BONES-Reihenfolge (runner.js), sw: Float32Array(n*4) }
export function computeWeights(geo, rig) {
  const P = geo.attributes.position.array, part = geo.attributes.aPart.array, n = P.length / 3, J = fullJoints(rig), NB = BONES.length;
  const names = BONES.map((b) => b[0]), SEG = {};
  SEG.Hips = [J._HipsLow, J.Spine]; SEG.Spine = [J.Spine, J.Chest]; SEG.Chest = [J.Chest, J.Neck]; SEG.Neck = [J.Neck, J.Head]; SEG.Head = [J.Head, J._HeadEnd];
  ["Left", "Right"].forEach((s) => {
    SEG[s + "Shoulder"] = [J[s + "Shoulder"], J[s + "UpperArm"]]; SEG[s + "UpperArm"] = [J[s + "UpperArm"], J[s + "LowerArm"]]; SEG[s + "LowerArm"] = [J[s + "LowerArm"], J[s + "Hand"]]; SEG[s + "Hand"] = [J[s + "Hand"], J["_" + s + "HandEnd"]];
    SEG[s + "UpperLeg"] = [J[s + "UpperLeg"], J[s + "LowerLeg"]]; SEG[s + "LowerLeg"] = [J[s + "LowerLeg"], J[s + "Foot"]]; SEG[s + "Foot"] = [J[s + "Foot"], J[s + "Toes"]]; SEG[s + "Toes"] = [J[s + "Toes"], J["_" + s + "ToesEnd"]];
  });
  const info = names.map((bn) => ({ seg: SEG[bn], side: /^Left/.test(bn) ? 1 : /^Right/.test(bn) ? -1 : 0, arm: /Arm|Hand|Shoulder/.test(bn), leg: /Leg|Foot|Toes/.test(bn), hand: /Hand/.test(bn), foot: /Foot|Toes/.test(bn) }));
  const head = names.indexOf("Head"); const W = new Float32Array(n * NB); let W2 = new Float32Array(n * NB); const p = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    p[0] = P[i * 3]; p[1] = P[i * 3 + 1]; p[2] = P[i * 3 + 2]; let best = head, bd = 1e9;
    if (part[i] < 1.5) for (let b = 0; b < NB; b++) {
      const I = info[b];
      if (I.side && p[0] * I.side < -0.004) continue;              // nur die eigene Körperseite
      if (I.arm && p[1] < rig.armY) continue;
      if (I.leg && p[1] > rig.legY) continue;
      let d = segDist(p, I.seg[0], I.seg[1]);
      if (I.hand && part[i] > 0.5) d *= 0.5;                         // Hautteil „Hand“ gehört sicher zur Hand
      if (I.foot && part[i] < 0.5 && p[1] > 0.12) d *= 2;
      if (d < bd) { bd = d; best = b; }
    }
    W[i * NB + best] = 1;
  }
  // über die Oberfläche glätten (nur zusammenhängende Haut)
  const N = neighbours(geo);
  for (let it = 0; it < rig.soft; it++) {
    for (let i = 0; i < n; i++) {
      const o = i * NB;
      if (part[i] > 1.5) { for (let b = 0; b < NB; b++) W2[o + b] = W[o + b]; continue; }
      const a = N.off[i], e = N.off[i + 1], c = e - a;
      for (let b = 0; b < NB; b++) { let s = 0; for (let k = a; k < e; k++) s += W[N.list[k] * NB + b]; W2[o + b] = 0.5 * W[o + b] + (c ? 0.5 * s / c : 0.5 * W[o + b]); }
    }
    if (W2 !== W) { W.set(W2); W2 = W; }   // wie im Bau-Werkzeug: ab Runde 2 wird an Ort und Stelle geglättet (gleiches Ergebnis wie figur.bin)
  }
  // beste vier Knochen je Punkt (wie in figur.bin auf 1/255 gerundet)
  const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4), top = [];
  for (let i = 0; i < n; i++) {
    top.length = 0; for (let b = 0; b < NB; b++) { const w = W[i * NB + b]; if (w > 0.004) top.push([b, w]); }
    top.sort((x, y) => y[1] - x[1]); if (top.length > 4) top.length = 4; const sum = top.reduce((a, x) => a + x[1], 0);
    let rest = 255; top.forEach((x, k) => { const q = k === top.length - 1 ? rest : Math.round(x[1] / sum * 255); si[i * 4 + k] = x[0]; sw[i * 4 + k] = q / 255; rest -= q; });
  }
  return { si: si, sw: sw };
}
// neue Figur-Daten (head + geo) mit diesem Rig; Grund-Daten (aus figur.bin) bleiben unverändert
export function rigData(base, rig) {
  const r = cloneRig(rig), J = fullJoints(r), w = computeWeights(base.geo, r), g = base.geo.clone();
  g.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(w.si, 4)); g.setAttribute("skinWeight", new THREE.BufferAttribute(w.sw, 4));
  const joints = {}; BONES.forEach(([b]) => { joints[b] = J[b]; });
  return { head: Object.assign({}, base.head, { joints: joints }), geo: g, rig: r, base: base };
}
