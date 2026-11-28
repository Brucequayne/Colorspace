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

export const CLOTHC = ["#E9E5DC", "#C6C5B9", "#9EA1A5", "#3A3C40", "#1E1F22", "#ED6A5E", "#E2621B", "#E8C547", "#7A9E7E", "#2F5D50", "#62929E", "#4A6D7C", "#3F7CAC", "#14457A", "#8E6C8A", "#C97B84", "#B5835A"];
let NEXT = 1;
export function newDesign(kind, name) {
  const id = "k" + Date.now().toString(36) + (NEXT++);
  if (kind === "bottom") return { format: "polyrunner-kleid", v: 1, id: id, name: name || "Hose", kind: "bottom", color: "#14457A", thick: 1.2, stiff: 0.35,
    waist: { y: 0.786, ease: 0 }, leg: [{ L: 0, ease: 0 }] };
  return { format: "polyrunner-kleid", v: 1, id: id, name: name || "Oberteil", kind: "top", color: "#E9E5DC", thick: 1.5, stiff: 0.5,
    neck: { d: 0.02, w: 0.5, ease: 0.004 }, arm: 0.015, torso: [{ y: 0.865, ease: 0.008 }, { y: 0.97, ease: 0.004 }], sleeve: [{ t: 0, ease: 0.008 }] };
}
export function cloneDesign(d) {
  const o = JSON.parse(JSON.stringify(d || newDesign("top")));
  if (o.kind === "bottom") { o.leg = (o.leg && o.leg.length ? o.leg : [{ L: 0, ease: 0 }]).sort((a, b) => a.L - b.L); o.waist = Object.assign({ y: 0.786, ease: 0 }, o.waist); }
  else { o.torso = (o.torso && o.torso.length ? o.torso : [{ y: 0.865, ease: 0.008 }]).sort((a, b) => a.y - b.y); o.sleeve = (o.sleeve && o.sleeve.length ? o.sleeve : [{ t: 0, ease: 0.008 }]).sort((a, b) => a.t - b.t); o.neck = Object.assign({ d: 0.02, w: 0.5, ease: 0.004 }, o.neck); if (o.arm == null) o.arm = 0.015; }
  o.thick = o.thick == null ? 1.5 : o.thick; o.stiff = o.stiff == null ? 0.5 : o.stiff; o.color = o.color || "#E9E5DC";
  return o;
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
function briefOpen(x, z, yS) { const ax = Math.abs(x), fr = Math.max(0, Math.min(1, (z + 0.08) / 0.05)), tt = Math.max(0, Math.min(1, (ax - 0.014) / 0.109)); return CROTCH + (yS - CROTCH) * (Math.pow(tt, 1.2) * (1 - fr) + Math.pow(tt, 0.8) * fr); }
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
  return data.kinfo = { cls: cls, armT: armT, arm: arm, tor: tor, NT: NT, TY0: TY0, TR: TR, legs: legs, NL: NL, LR: LR };
}
function binA(dx, dz, N) { return Math.min(N - 1, Math.floor((Math.atan2(dx, dz) + Math.PI) / (Math.PI * 2) * N)); }
function fillBins(A, N, R) { for (let it = 0; it < 8; it++) for (let r = 0; r < R; r++) for (let a = 0; a < N; a++) if (!A[r * N + a]) { const l = A[r * N + (a + N - 1) % N], rr = A[r * N + (a + 1) % N]; A[r * N + a] = Math.max(l, rr); } }

// ---------- Netz eines Entwurfs bauen (Ruhe-Koordinaten) ----------
export function buildGarment(data, D) {
  const K = bodyInfo(data), g = data.geo, P = g.attributes.position.array, Nn = g.attributes.normal.array, part = g.attributes.aPart.array, n = P.length / 3, idx = g.index.array;
  const top = D.kind !== "bottom", th = Math.max(0.3, D.thick) / 1000, base = th * 0.5 + 0.0015;
  const f = new Float32Array(n).fill(-1);
  // Bereich: Feld > 0 innen (≈ Meter bis zur Schnittlinie)
  const hem = top ? D.torso[0].y : 0, sEnd = top ? D.sleeve[D.sleeve.length - 1].t : 0, Lend = top ? 0 : D.leg[D.leg.length - 1].L;
  const yS = (W) => waistTop(W, 0.12, -0.03) - 0.026;
  const legOpen = (x, z) => {   // Höhe der Beinöffnung
    if (Lend <= 0.15) { const ys = yS(D.waist) + (CROTCH + 0.01 - yS(D.waist)) * (Lend / 0.15); return briefOpen(x, z, ys); }
    return Math.max(0.075, CROTCH - (Lend - 0.15));
  };
  const armCut = D.arm ? D.arm * (1 - Math.max(0, Math.min(1, sEnd / 0.03))) : 0;   // Armausschnitt nur ohne Ärmel
  for (let i = 0; i < n; i++) {
    const c = K.cls[i]; if (c === 9) continue;
    const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
    if (top) {
      if (part[i] > 0.5 || (c === 2 && y < 0.7)) continue;
      if (c === 0 || c === 3 || c === 2) {
        let d = Math.min(y - Math.max(hem, 0.7), neckLine(D.neck, x, z) - y);
        if (c === 3 && y > 1.16) d = Math.min(d, -0.01);
        if (armCut > 0 || sEnd <= 0.004) { const A = x > 0 ? K.arm.L : K.arm.R; d = Math.min(d, Math.hypot(x - A.s.x, (y - A.s.y) * 1.25, z - A.s.z) - (0.05 + armCut)); }
        f[i] = d;
      } else if (c === 1) {
        if (sEnd <= 0.004) continue;
        let d = Math.min(sEnd, 0.315) - K.armT[i];
        f[i] = d;
      }
    } else {
      if (c === 1 || c === 3) continue; if (part[i] > 0.5 && y < 0.1) continue;
      f[i] = Math.min(waistTop(D.waist, x, z) - y, y - legOpen(x, z));
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
        const t = K.armT[i]; e = interp(D.sleeve, "t", t);
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
  if (top && sEnd > 0.315) {
    extend(([a, b]) => K.cls[S2[a]] === 1 && K.armT[S2[a]] > 0.28 && K.cls[S2[b]] === 1 && K.armT[S2[b]] > 0.28, sEnd - 0.315, (a) => (P2[a * 3] > 0 ? K.arm.L.d2 : K.arm.R.d2), () => new THREE.Vector3());
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
    this.mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.86, metalness: 0, side: THREE.FrontSide });
    this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), this.mat); this.mesh.frustumCulled = false; this.mesh.castShadow = true; this.mesh.receiveShadow = true;
    fig.scene.add(this.mesh);
    this.M = BONES.map(() => new THREE.Matrix4()); this.grabbed = -1; this.grabAt = new THREE.Vector3(); this.key = "";
    this.caps = [["LeftUpperLeg", "LeftLowerLeg", 0.055], ["RightUpperLeg", "RightLowerLeg", 0.055], ["LeftLowerLeg", "LeftFoot", 0.042], ["RightLowerLeg", "RightFoot", 0.042],
      ["LeftLowerArm", "LeftHand", 0.03], ["RightLowerArm", "RightHand", 0.03]].map(([a, b, r]) => ({ a: BI[a], b: BI[b], r: r, A: new THREE.Vector3(), B: new THREE.Vector3() }));
    this.setDesign(design);
  }
  setDesign(d) {
    const D = cloneDesign(d), k = JSON.stringify([D.kind, D.waist, D.leg, D.neck, D.arm, D.torso, D.sleeve, D.thick]);
    this.D = D; this.mat.color.set(D.color);
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
  write() {
    const m = this.m, g = this.mesh.geometry, gp = g.attributes.position.array, p = this.p;
    this.outer.attributes.position.needsUpdate = true; this.outer.computeVertexNormals();
    const on = this.outer.attributes.normal.array, th = Math.max(0.3, this.D.thick) / 1000;
    for (let i = 0; i < m * 3; i++) { gp[i] = p[i]; gp[m * 3 + i] = p[i] - on[i] * th; }
    g.attributes.position.needsUpdate = true; g.computeVertexNormals();
  }
  // ---------- Greifen mit der Maus ----------
  pick(ray) {
    const rc = new THREE.Raycaster(); rc.ray.copy(ray);
    if (!this._pm) this._pm = new THREE.Mesh(this.outer, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
    this._pm.geometry = this.outer; this.outer.computeBoundingSphere();
    const h = rc.intersectObject(this._pm, false)[0]; if (!h) return null;
    const f = h.face, P = this.p; let best = f.a, bd = 1e9;
    [f.a, f.b, f.c].forEach((i) => { const d = _v.set(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]).distanceToSquared(h.point); if (d < bd) { bd = d; best = i; } });
    return { i: best, point: h.point.clone(), dist: h.distance };
  }
  // eine Handvoll Stoff greifen: Punkte bis 3 cm um den Griff gehen mit (nach außen schwächer)
  grab(i, at) {
    const p = this.p, R = 0.03; this.grabbed = i; this.grabAt.copy(at); this.hand = []; this.hw = new Float32Array(this.m);
    const g = new THREE.Vector3(p[i * 3], p[i * 3 + 1], p[i * 3 + 2]);
    for (let j = 0; j < this.m; j++) { const d = _v.set(p[j * 3], p[j * 3 + 1], p[j * 3 + 2]).distanceTo(g); if (d < R) { const w = Math.pow(1 - d / R, 1.5); this.hand.push({ j: j, w: w, o: _v.clone().sub(g) }); this.hw[j] = w; } }
    this.near = []; for (let e = 0; e < this.el.length; e++) { const a = this.ea[e] * 3; if (_v.set(p[a], p[a + 1], p[a + 2]).distanceTo(g) < 0.07) this.near.push(e); }
  }
  drag(at) { this.grabAt.copy(at); }
  release() { this.grabbed = -1; this.hand = []; }
  // Dehnung rund um den Griff (Mittel der Kanten bis 7 cm), 1 = ungedehnt
  strain() { if (!this.near || !this.near.length) return 1; const p = this.p; let s = 0; for (const e of this.near) { const a = this.ea[e] * 3, b = this.eb[e] * 3; s += Math.hypot(p[b] - p[a], p[b + 1] - p[a + 1], p[b + 2] - p[a + 2]) / this.el[e]; } return s / this.near.length; }
  dispose() { this.fig.scene.remove(this.mesh); this.mesh.geometry.dispose(); this.outer.dispose(); this.mat.dispose(); }
}
