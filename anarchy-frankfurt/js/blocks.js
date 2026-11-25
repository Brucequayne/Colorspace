// Häuserblock-Tool: Blockrand-Bebauung (Gründerzeit-Altbau) prozedural aus einem gezeichneten Vieleck
// Der Block wird nach innen um die Haustiefe versetzt (Rest = Innenhof), jede Straßenseite in Parzellen geteilt,
// jede Parzelle wird ein eigenes Haus (Etagen, Farben, Dach, Balkone, Gauben) und als Pixel-Sprite gerendert.
import { proj, groundDepth } from './camera.js';
import { Mesh, rng, nrm, cross, sub, dot } from './geometry.js';
import { renderSprite, spriteToBlob, blobToSprite } from './renderer.js';
import { dbGet, dbSet, dbCount } from './world.js';
import { CFG } from './camera.js';

// Häuser: Schattenkarte gröber (50 statt 35 mm je Pixel), kein Vorschau-Canvas nötig
const HOUSE_OPT = { sres: 0.05, noCanvas: true };
export const BLOCK_DEFAULT = { style: 'altbau', fmin: 4, fmax: 5, dens: 0.5, width: 15, pal: 'mix', roof: 'slate', gates: 1, mix: 0, seed: 1 };
export const STYLES = { altbau: { name: 'Gründerzeit-Altbau', fmin: 4, fmax: 5, width: 15 }, fachwerk: { name: 'Fachwerk (Altstadt)', fmin: 2, fmax: 4, width: 8 } };
// Fachwerk: Gefachfarben (Putz) und Balkenfarben
const FW_WALL = [[[236, 232, 220], 5], [[232, 220, 186], 3], [[226, 206, 160], 2], [[224, 196, 180], 1.5], [[214, 212, 204], 1.5], [[210, 196, 150], 1]];
// Läden im Erdgeschoss (Mixed Use): Schilderfarben und Markisen
const SIGN = [[[34, 64, 48], 3], [[104, 30, 40], 3], [[28, 38, 66], 3], [[30, 30, 32], 3], [[150, 120, 60], 1], [[236, 232, 220], 2]];
const AWN = [[[176, 46, 42], 3], [[40, 84, 60], 3], [[34, 48, 86], 2], [[214, 196, 150], 2], [[96, 34, 44], 2], [[60, 60, 62], 1]];
const FW_BEAM = [[[70, 46, 34], 5], [[42, 36, 34], 3], [[112, 44, 36], 2], [[96, 70, 46], 1.5]];

// Fassadenfarben [Name, Farbe, Gewicht] – typisch: beige, weiß, gelb, ochsenblut/maronenbraun; blau/grün selten
const FAC = [
  ['beige', [222, 206, 170], 5], ['creme', [234, 226, 204], 4], ['weiß', [240, 237, 228], 3], ['hellgelb', [236, 216, 152], 3],
  ['ocker', [214, 182, 112], 2], ['ochsenblut', [146, 66, 54], 2], ['maronenbraun', [122, 78, 62], 2], ['terrakotta', [178, 104, 78], 1.4],
  ['rosé', [222, 188, 172], 1], ['taubenblau', [152, 170, 186], 0.5], ['salbeigrün', [160, 178, 142], 0.5]
];
export const PAL_MODES = {
  mix: { name: 'Gemischt (typisch)', k: {} },
  light: { name: 'Hell (beige/weiß/gelb)', k: { beige: 2, creme: 2, 'weiß': 2, hellgelb: 2, ochsenblut: 0.15, maronenbraun: 0.15, terrakotta: 0.2, taubenblau: 0.2, 'salbeigrün': 0.2 } },
  red: { name: 'Rot/Braun', k: { ochsenblut: 5, maronenbraun: 5, terrakotta: 4, 'weiß': 0.5, creme: 0.5 } },
  color: { name: 'Bunt', k: { taubenblau: 8, 'salbeigrün': 8, ocker: 2, 'rosé': 3, hellgelb: 2 } }
};
const ROOFS = { slate: [62, 64, 72], slateBlue: [76, 82, 96], tile: [150, 66, 48], tileDark: [118, 58, 44] };
export const ROOF_MODES = {
  slate: { name: 'Schiefer (typisch)', w: { slate: 6, slateBlue: 3, tile: 0.8, tileDark: 0.4 } },
  mix: { name: 'Gemischt', w: { slate: 4, slateBlue: 2, tile: 2.5, tileDark: 1 } },
  tile: { name: 'Rote Ziegel', w: { slate: 1, slateBlue: 0.5, tile: 5, tileDark: 2 } }
};
const SAND = [156, 82, 68], STONE = [180, 172, 156], STUCCO = [238, 234, 224], LSTONE = [214, 204, 182];

function pickW(r, items) { const t = items.reduce((s, q) => s + q[1], 0); let p = r() * t; for (const q of items) { p -= q[1]; if (p <= 0) return q[0]; } return items[0][0]; }
const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const area = P => { let a = 0; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; };

// Vieleck nach innen versetzen (Schnitt der verschobenen Kanten)
function inset(P, d) {
  const n = P.length, E = [];
  for (let i = 0; i < n; i++) {
    const a = P[i], b = P[(i + 1) % n], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, u = [(b[0] - a[0]) / L, (b[1] - a[1]) / L], nn = [-u[1], u[0]];
    E.push({ a, u, n: nn, L, o: [a[0] + nn[0] * d, a[1] + nn[1] * d] });
  }
  const Q = [];
  for (let i = 0; i < n; i++) {
    const A = E[(i + n - 1) % n], B = E[i], den = A.u[0] * B.u[1] - A.u[1] * B.u[0];
    if (Math.abs(den) < 1e-6) { Q.push(B.o.slice()); continue; }
    const t = ((B.o[0] - A.o[0]) * B.u[1] - (B.o[1] - A.o[1]) * B.u[0]) / den;
    Q.push([A.o[0] + A.u[0] * t, A.o[1] + A.u[1] * t]);
  }
  return { E, Q };
}
function insetOk(P, Q) {
  if (area(Q) <= 0.5) return false;
  for (let i = 0; i < P.length; i++) {
    const a = P[i], b = P[(i + 1) % P.length], c = Q[i], e = Q[(i + 1) % Q.length];
    if ((b[0] - a[0]) * (e[0] - c[0]) + (b[1] - a[1]) * (e[1] - c[1]) <= 0) return false;
  }
  return true;
}
export function normPoly(pts) { const P = pts.map(p => [Math.round(p[0] * 100) / 100, Math.round(p[1] * 100) / 100]);  /* auf cm gerundet: stabiler Haus-Schlüssel auch nach Speichern und Laden */ return area(P) < 0 ? P.reverse() : P; }

// ---------- Parzellen ----------
export function generate(b) {
  const P = normPoly(b.pts), p = { ...BLOCK_DEFAULT, ...b.p }, r = rng(b.id * 7919 + p.seed * 104729);
  // maximale Tiefe, bei der noch ein Hof übrig bleibt
  let lo = 0, hi = 80;
  for (let k = 0; k < 24; k++) { const m = (lo + hi) / 2; if (insetOk(P, inset(P, m).Q)) lo = m; else hi = m; }
  // Dichte 0 % = schmale Häuser (9 m) mit großem Hof, 100 % = Hof fast zu: die Haustiefe wächst mit der Blockgröße
  const full = Math.max(9, lo * 0.95), d = Math.max(4, Math.min(lo * 0.95, 9 + p.dens * (full - 9)));
  const { E, Q } = inset(P, d), out = [], rs = rng(b.id * 1543 + p.seed * 7717 + 91);  // eigener Würfel für Läden, damit alte Blöcke gleich bleiben
  const facW = FAC.map(f => [f, f[2] * (PAL_MODES[p.pal] ? (PAL_MODES[p.pal].k[f[0]] ?? 1) : 1)]);
  const roofW = Object.entries((ROOF_MODES[p.roof] || ROOF_MODES.slate).w).map(([k, w]) => [k, w]);
  // Eigenschaften eines Hauses würfeln und anhängen
  const addParcel = (q, e, i, j, first, last, side) => {
      const corner = first || last, fw = p.style === 'fachwerk';
      let F = p.fmin + Math.floor(r() * (p.fmax - p.fmin + 1));
      if (corner && r() < 0.5) F = Math.min(p.fmax, F + 1);
      const fac = pickW(r, facW), dark = fac[1][0] + fac[1][1] + fac[1][2] < 420;
      const trim = dark ? LSTONE : r() < 0.5 ? STUCCO : SAND;
      const roofKey = pickW(r, roofW);
      const isShop = rs() < (p.mix || 0) * (corner ? 1.35 : 1), shop = { sign: pickW(rs, SIGN), awn: rs() < 0.65 ? pickW(rs, AWN) : null, stripe: rs() < 0.45, g: (rs() * 1e5) | 0 };
      out.push({ side, shop: isShop ? shop : null,
        style: fw ? 'fachwerk' : 'altbau', fwWall: pickW(r, FW_WALL), fwBeam: pickW(r, FW_BEAM), edge: i,
        key: `${b.id}:${i}:${j}:${p.style}:${p.gates}:${p.seed}:${p.fmin}:${p.fmax}:${p.dens}:${p.width}:${p.pal}:${p.roof}:${p.mix || 0}:${b.pts.map(q2 => q2.join(',')).join(';')}`,
        q, n: e.n, u: e.u, F, wall: fac[1].map(c => c + (r() - 0.5) * 10), trim, plinth: r() < 0.65 ? SAND : STONE,
        roof: ROOFS[roofKey].map(c => c + (r() - 0.5) * 8), mansard: corner || d > 16 || r() < 0.75, balcony: r() < 0.55, dormEvery: r() < 0.5 ? 1 : 2, seed: (r() * 1e6) | 0
      });
  };
  if (p.style === 'fachwerk') fachwerkParcels(P, E, d, p, r, addParcel);
  else E.forEach((e, i) => {
    const A2 = Q[i], B2 = Q[(i + 1) % Q.length], tA = (A2[0] - e.a[0]) * e.u[0] + (A2[1] - e.a[1]) * e.u[1], tB = (B2[0] - e.a[0]) * e.u[0] + (B2[1] - e.a[1]) * e.u[1];
    const loT = Math.max(0, tA) + 3, hiT = Math.min(e.L, tB) - 3, k = Math.max(1, Math.round(e.L / p.width));
    const cuts = [];
    if (hiT > loT) for (let j = 1; j < k; j++) {
      const t = Math.max(loT, Math.min(hiT, e.L * j / k + (r() - 0.5) * p.width * 0.4));
      if (!cuts.length || t - cuts[cuts.length - 1] > 5) cuts.push(t);
    }
    const ts = [0, ...cuts, e.L];
    for (let j = 0; j < ts.length - 1; j++) {
      const first = j === 0, last = j === ts.length - 2, P0 = [e.a[0] + e.u[0] * ts[j], e.a[1] + e.u[1] * ts[j]], P1 = [e.a[0] + e.u[0] * ts[j + 1], e.a[1] + e.u[1] * ts[j + 1]];
      const q = [first ? e.a.slice() : P0, last ? [e.a[0] + e.u[0] * e.L, e.a[1] + e.u[1] * e.L] : P1,
        last ? B2.slice() : [P1[0] + e.n[0] * d, P1[1] + e.n[1] * d], first ? A2.slice() : [P0[0] + e.n[0] * d, P0[1] + e.n[1] * d]];
      addParcel(q, e, i, j, first, last, null);
    }
  });
  // Hofzugänge: Tordurchfahrten (Gang durchs Erdgeschoss) oder schmale Lücken zwischen zwei Häusern
  const cand = out.map((q, k) => k).filter(k => { const q = out[k].q, L = Math.hypot(q[1][0] - q[0][0], q[1][1] - q[0][1]); return L >= 6 && !isCornerIdx(out, k); });
  const nG = Math.min(cand.length, Math.max(1, p.gates | 0));
  for (let g = 0; g < nG; g++) {
    const par = out[cand[Math.floor((g + 0.25 + r() * 0.5) * cand.length / nG)]]; if (!par || par.gate) continue;
    const [q0, q1, q2, q3] = par.q, L = Math.hypot(q1[0] - q0[0], q1[1] - q0[1]);
    if (L >= 8 && r() < 0.35) {          // Lücke am Anfang der Parzelle
      const w = 3.4; par.q = [[q0[0] + par.u[0] * w, q0[1] + par.u[1] * w], q1, q2, [q3[0] + par.u[0] * w, q3[1] + par.u[1] * w]];
      par.gate = { type: 'gap' };
    } else par.gate = { type: 'arch', c: L / 2, w: 3.2 };
    par.key += ':g' + g;
  }
  // Tür (Hauseingang) je Parzelle: nur die Lage (door) als Angebot für das Türen-Werkzeug; betretbar wird ein Haus erst, wenn dort eine Tür markiert ist
  for (const par of out) {
    const [q0, q1] = par.q, L = Math.hypot(q1[0] - q0[0], q1[1] - q0[1]), fw = par.style === 'fachwerk';
    par.axes = fw ? Math.max(1, Math.round(L / 2.4)) : Math.max(2, Math.round(L / 2.9));
    let ax = Math.min(par.axes - 1, Math.max(0, Math.floor(par.axes / 2) + (par.seed % 2 ? 0 : -1)));
    if (par.gate && par.gate.type === 'arch') { const ga = Math.floor(par.gate.c / (L / par.axes)); if (ax === ga) ax = ga > 0 ? ga - 1 : Math.min(par.axes - 1, ga + 1); if (ax === ga) ax = -1; }
    par.doorAx = ax;
    if (ax >= 0) { const t = (ax + 0.5) * L / par.axes; par.door = { x: q0[0] + par.u[0] * t - par.n[0] * 0.8, y: q0[1] + par.u[1] * t - par.n[1] * 0.8, F: par.F, style: par.style, w: L, d }; }
  }
  return { parcels: out, inner: Q, depth: d, P };
}

// Fachwerk: nur rechteckige Häuser. Jede Ecke gehört dem Haus der vorherigen Straßenseite (mit Seitenfassade zur Ecke),
// die nächste Seite beginnt erst dahinter. Spitze Ecken bleiben frei statt verzerrte Häuser hineinzuquetschen.
function fachwerkParcels(P, E, d, p, r, add) {
  const n = E.length, t0 = new Array(n).fill(0), t1 = E.map(e => e.L);
  for (let i = 0; i < n; i++) {
    const e = E[i], f = E[(i + 1) % n], cosT = -(e.u[0] * f.u[0] + e.u[1] * f.u[1]);      // cos des Innenwinkels
    const sinT = Math.abs(e.u[0] * f.u[1] - e.u[1] * f.u[0]), ang = Math.atan2(sinT, cosT); // Innenwinkel
    if (ang < Math.PI / 2 - 0.05) t1[i] = Math.max(0, e.L - d / Math.tan(ang));            // spitz: Ecke frei lassen
    const end = [e.a[0] + e.u[0] * t1[i], e.a[1] + e.u[1] * t1[i]], C = [end[0] + e.n[0] * d, end[1] + e.n[1] * d], B = f.a;
    t0[(i + 1) % n] = Math.max(0, Math.max((end[0] - B[0]) * f.u[0] + (end[1] - B[1]) * f.u[1], (C[0] - B[0]) * f.u[0] + (C[1] - B[1]) * f.u[1])) + 0.05;
  }
  for (let i = 0; i < n; i++) {
    const e = E[i], a = t0[i], b = t1[i], L = b - a; if (L < 3) continue;
    const k = Math.max(1, Math.round(L / p.width)), ts = [a];
    for (let j = 1; j < k; j++) ts.push(a + L * j / k + (r() - 0.5) * p.width * 0.3);
    ts.push(b);
    for (let j = 0; j < ts.length - 1; j++) {
      const P0 = [e.a[0] + e.u[0] * ts[j], e.a[1] + e.u[1] * ts[j]], P1 = [e.a[0] + e.u[0] * ts[j + 1], e.a[1] + e.u[1] * ts[j + 1]];
      const q = [P0, P1, [P1[0] + e.n[0] * d, P1[1] + e.n[1] * d], [P0[0] + e.n[0] * d, P0[1] + e.n[1] * d]];
      const first = j === 0, last = j === ts.length - 2;
      // freiliegende Seiten bekommen eine Fassade statt Brandwand
      add(q, e, i, j, first, last, { end: last, start: first && t0[i] > 0.5 && t1[(i + n - 1) % n] < E[(i + n - 1) % n].L - 0.5 });
    }
  }
}
function isCornerIdx(out, k) { const a = out[k - 1], b = out[k + 1]; return !a || !b || a.edge !== out[k].edge || b.edge !== out[k].edge; }

// ---------- 3D-Modell einer Parzelle ----------
function prism(m, pts, z0, z1, top, sides, id, ex) {
  const c = pts.reduce((s, q) => [s[0] + q[0] / pts.length, s[1] + q[1] / pts.length], [0, 0]);
  for (let k = 0; k < pts.length; k++) {
    const a = pts[k], b = pts[(k + 1) % pts.length], mid = [(a[0] + b[0]) / 2 - c[0], (a[1] + b[1]) / 2 - c[1], 0];
    m.quad([a[0], a[1], z0], [b[0], b[1], z0], [b[0], b[1], z1], [a[0], a[1], z1], sides[k % sides.length], id, mid, ex);
  }
  if (top) { m.tri3([pts[0][0], pts[0][1], z1], [pts[1][0], pts[1][1], z1], [pts[2][0], pts[2][1], z1], top, id, [0, 0, 1], ex); if (pts.length > 3) m.tri3([pts[0][0], pts[0][1], z1], [pts[2][0], pts[2][1], z1], [pts[3][0], pts[3][1], z1], top, id, [0, 0, 1], ex); }
}
export function buildParcel(par, cx, cy) {
  if (par.style === 'fachwerk') return buildFachwerk(par, cx, cy);
  const m = new Mesh(), L = p => [p[0] - cx, p[1] - cy], [Q0, Q1, Q2, Q3] = par.q.map(L), n = par.n, u = par.u;
  const gh = 4.2, fh = 3.4, F = par.F, E = gh + (F - 1) * fh + 1.0, len = Math.hypot(Q1[0] - Q0[0], Q1[1] - Q0[1]);
  const axes = par.axes, door = par.doorAx;
  const arch = par.gate && par.gate.type === 'arch' ? { u0: par.gate.c - par.gate.w / 2, u1: par.gate.c + par.gate.w / 2 } : null;
  const base = { gh, fh, E, F, wall: par.wall, trim: par.trim, plinth: par.plinth, seed: par.seed % 9973, axes, door, arch };
  const hid = m.part(), out = [-n[0], -n[1], 0];
  const Z = (p, z) => [p[0], p[1], z];
  m.quad(Z(Q0, 0), Z(Q1, 0), Z(Q1, E), Z(Q0, E), 'altbau', hid, out, { ...base, kind: 'front', len, shop: par.shop });
  awnings(m, par, Q0, u, n, len, axes, door, arch, 3.2, 2.55, 1.2);
  const blen = Math.hypot(Q3[0] - Q2[0], Q3[1] - Q2[1]);
  let barch = null;
  if (arch) { const c = [Q0[0] + u[0] * par.gate.c + n[0] * 1, Q0[1] + u[1] * par.gate.c + n[1] * 1], bc = (c[0] - Q2[0]) * (Q3[0] - Q2[0]) / blen + (c[1] - Q2[1]) * (Q3[1] - Q2[1]) / blen; barch = { u0: bc - par.gate.w / 2, u1: bc + par.gate.w / 2 }; }
  m.quad(Z(Q2, 0), Z(Q3, 0), Z(Q3, E), Z(Q2, E), 'altbau', hid, [n[0], n[1], 0], { ...base, kind: 'court', len: blen, arch: barch, axes: Math.max(1, Math.round(blen / 3.2)), wall: par.wall.map(c => c * 0.55 + 200 * 0.45) });
  const cen = [(Q0[0] + Q1[0] + Q2[0] + Q3[0]) / 4, (Q0[1] + Q1[1] + Q2[1] + Q3[1]) / 4];
  for (const [a, b] of [[Q1, Q2], [Q3, Q0]]) m.quad(Z(a, 0), Z(b, 0), Z(b, E), Z(a, E), 'firewall', hid, [(a[0] + b[0]) / 2 - cen[0], (a[1] + b[1]) / 2 - cen[1], 0]);
  // Gesimse als kleine Vorsprünge
  const T = { trim: par.trim }, off = (p, s) => [p[0] + n[0] * s, p[1] + n[1] * s];
  prism(m, [off(Q0, -0.32), off(Q1, -0.32), Q1, Q0], E - 0.32, E, 'trim', ['trim'], m.part(), T);
  prism(m, [off(Q0, -0.12), off(Q1, -0.12), Q1, Q0], gh, gh + 0.22, 'trim', ['trim'], hid, T);
  // Dach
  const R0 = lerp2(Q0, Q3, 0.5), R1 = lerp2(Q1, Q2, 0.5), rid = m.part(), roofMat = par.roof[0] > 120 ? 'roof' : 'slate';
  const RX = roofMat === 'roof' ? { pal: { roof: par.roof } } : { roof: par.roof };
  const depthF = Math.hypot(R0[0] - Q0[0], R0[1] - Q0[1]);
  if (par.mansard) {
    const k = Math.min(0.45, 1.15 / Math.max(depthF, 0.1)), zb = E + 2.9, zr = E + 3.8;
    const F0 = lerp2(Q0, R0, k), F1 = lerp2(Q1, R1, k), B0 = lerp2(Q3, R0, k), B1 = lerp2(Q2, R1, k);
    m.quad(Z(Q0, E), Z(Q1, E), Z(F1, zb), Z(F0, zb), roofMat, rid, [-n[0], -n[1], 0.4], RX);
    m.quad(Z(Q2, E), Z(Q3, E), Z(B0, zb), Z(B1, zb), roofMat, rid, [n[0], n[1], 0.4], RX);
    const k2 = Math.min(1, 4.6 / Math.max(depthF, 0.1));
    if (k2 < 1) { // tiefes Haus: oben nur ein Streifen Schiefer, in der Mitte Flachdach (Dachpappe)
      const G0 = lerp2(Q0, R0, k2), G1 = lerp2(Q1, R1, k2), H0 = lerp2(Q3, R0, k2), H1 = lerp2(Q2, R1, k2);
      m.quad(Z(F0, zb), Z(F1, zb), Z(G1, zr), Z(G0, zr), roofMat, rid, [-n[0], -n[1], 1], RX);
      m.quad(Z(B1, zb), Z(B0, zb), Z(H0, zr), Z(H1, zr), roofMat, rid, [n[0], n[1], 1], RX);
      m.quad(Z(G0, zr), Z(G1, zr), Z(H1, zr), Z(H0, zr), 'tar', rid, [0, 0, 1]);
      for (const [a, f, g2, h2, b2, q] of [[Q0, F0, G0, H0, B0, Q3], [Q1, F1, G1, H1, B1, Q2]]) {
        const sOut = [(a[0] + q[0]) / 2 - cen[0], (a[1] + q[1]) / 2 - cen[1], 0];
        m.tri3(Z(a, E), Z(f, zb), Z(q, E), 'firewall', rid, sOut); m.tri3(Z(f, zb), Z(b2, zb), Z(q, E), 'firewall', rid, sOut);
        m.tri3(Z(f, zb), Z(g2, zr), Z(b2, zb), 'firewall', rid, sOut); m.tri3(Z(g2, zr), Z(h2, zr), Z(b2, zb), 'firewall', rid, sOut);
      }
    } else {
      m.quad(Z(F0, zb), Z(F1, zb), Z(R1, zr), Z(R0, zr), roofMat, rid, [-n[0], -n[1], 1], RX);
      m.quad(Z(B1, zb), Z(B0, zb), Z(R0, zr), Z(R1, zr), roofMat, rid, [n[0], n[1], 1], RX);
      for (const [a, f, r2, b2, q] of [[Q0, F0, R0, B0, Q3], [Q1, F1, R1, B1, Q2]]) {
        const sOut = [(a[0] + q[0]) / 2 - cen[0], (a[1] + q[1]) / 2 - cen[1], 0];
        m.tri3(Z(a, E), Z(f, zb), Z(q, E), 'firewall', rid, sOut); m.tri3(Z(f, zb), Z(b2, zb), Z(q, E), 'firewall', rid, sOut); m.tri3(Z(f, zb), Z(r2, zr), Z(b2, zb), 'firewall', rid, sOut);
      }
    }
    // Gauben auf der Straßenseite
    const aw = len / axes;
    for (let j = 0; j < axes; j += par.dormEvery) {
      const t = (j + 0.5) * aw, P = (tt, s) => [Q0[0] + u[0] * tt + n[0] * s, Q0[1] + u[1] * tt + n[1] * s], did = m.part();
      prism(m, [P(t - 0.6, 0.3), P(t + 0.6, 0.3), P(t + 0.6, 1.05), P(t - 0.6, 1.05)], E + 0.25, E + 2.35, 'zinc', ['dormer', 'zinc', 'zinc', 'zinc'], did);
    }
  } else {
    const zr = E + Math.min(4.5, depthF * 0.7);
    m.quad(Z(Q0, E), Z(Q1, E), Z(R1, zr), Z(R0, zr), roofMat, rid, [-n[0], -n[1], 1], RX);
    m.quad(Z(Q2, E), Z(Q3, E), Z(R0, zr), Z(R1, zr), roofMat, rid, [n[0], n[1], 1], RX);
    for (const [a, r2, q] of [[Q0, R0, Q3], [Q1, R1, Q2]]) m.tri3(Z(a, E), Z(r2, zr), Z(q, E), 'firewall', rid, [(a[0] + q[0]) / 2 - cen[0], (a[1] + q[1]) / 2 - cen[1], 0]);
  }
  // Balkone (schmiedeeisern) in der mittleren Achse
  if (par.balcony && F > 2) {
    const t = (Math.floor(axes / 2) + 0.5) * (len / axes), P = (tt, s) => [Q0[0] + u[0] * tt + n[0] * s, Q0[1] + u[1] * tt + n[1] * s];
    for (let f = 1; f < F; f++) {
      const z = gh + (f - 1) * fh, bid = m.part(), a = P(t - 0.95, -0.95), b = P(t + 0.95, -0.95), c = P(t + 0.95, 0), d = P(t - 0.95, 0);
      prism(m, [a, b, c, d], z - 0.06, z + 0.12, 'trim', ['trim'], bid, T);
      m.quad(Z(a, z + 0.12), Z(b, z + 0.12), Z(b, z + 1.1), Z(a, z + 1.1), 'iron', bid, [-n[0], -n[1], 0]);
      m.quad(Z(d, z + 0.12), Z(a, z + 0.12), Z(a, z + 1.1), Z(d, z + 1.1), 'iron', bid, [-u[0], -u[1], 0]);
      m.quad(Z(b, z + 0.12), Z(c, z + 0.12), Z(c, z + 1.1), Z(b, z + 1.1), 'iron', bid, [u[0], u[1], 0]);
    }
  }
  return m;
}

// ---------- Blöcke verwalten ----------
export class Blocks {
  constructor() { this.list = new Map(); this.nid = 1; this.U = []; this.R = []; this.onLog = null; this.onChange = null; this.geo = new Map(); this.spr = new Map(); this.cap = 400;
    this.blobs = new Map(); this.dec = new Set(); this.wait = new Set(); this.onSprite = null; this.baking = 0; }
  get size() { return this.list.size; }
  snap() { return JSON.stringify(this.serialize()); }
  begin() { this._b = this.snap(); this._d = null; }
  commit() { const a = this.snap(); if (a !== this._b) { this.U.push(this._b); if (this.U.length > 100) this.U.shift(); this.R = []; this.onLog && this.onLog(); } this._b = null; this.onChange && this.onChange(this._d); this._d = null; }
  undo() { const s = this.U.pop(); if (!s) return false; this.R.push(this.snap()); this.load(JSON.parse(s), true); this.onChange && this.onChange(null); return true; }
  redo() { const s = this.R.pop(); if (!s) return false; this.U.push(this.snap()); this.load(JSON.parse(s), true); this.onChange && this.onChange(null); return true; }
  touch(b) { const bb = this.bbox(b); const d = this._d; this._d = d ? [Math.min(d[0], bb[0]), Math.min(d[1], bb[1]), Math.max(d[2], bb[2]), Math.max(d[3], bb[3])] : bb; }
  add(pts, p) { const b = { id: this.nid++, pts: normPoly(pts), p: { ...p } }; this.list.set(b.id, b); this.touch(b); return b; }
  set(id, patch) { const b = this.list.get(id); if (!b) return; this.touch(b); Object.assign(b, patch); if (patch.pts) b.pts = normPoly(patch.pts); this.geo.delete(id); this.touch(b); }
  del(id) { const b = this.list.get(id); if (!b) return; this.touch(b); this.list.delete(id); this.geo.delete(id); }
  bbox(b) { const xs = b.pts.map(p => p[0]), ys = b.pts.map(p => p[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; }
  gen(b) {
    const key = JSON.stringify([b.pts, b.p]); let g = this.geo.get(b.id);
    if (!g || g.key !== key) { g = generate(b); g.key = key; for (const par of g.parcels) { par.bid = b.id; par.cx = par.q.reduce((s, q) => s + q[0], 0) / 4; par.cy = par.q.reduce((s, q) => s + q[1], 0) / 4; } this.geo.set(b.id, g); }
    return g;
  }
  // Parzellen in einem Weltbereich
  parcels(bb) {
    const out = [];
    for (const b of this.list.values()) { const x = this.bbox(b); if (x[2] < bb[0] || x[0] > bb[2] || x[3] < bb[1] || x[1] > bb[3]) continue; for (const par of this.gen(b).parcels) out.push(par); }
    return out;
  }
  // Sprite einer Parzelle (begrenzter Zwischenspeicher). Mit budget: Haus wird im Hintergrund (Worker-Pool) gerendert,
  // bis dahin null. Ohne budget (z. B. Spieltest): sofort, im Hauptstrang.
  // Eingebrannte Blöcke: fertige Hausbilder kommen als PNG aus dem Speicher (schnell entpackt statt neu gerendert)
  sprite(par, budget) {
    let s = this.spr.get(par.key);
    if (s) { this.spr.delete(par.key); this.spr.set(par.key, s); return s; }
    if (this.wait.has(par.bid)) return null;                  // Bilder des Blocks werden gerade geladen
    const bl = this.blobs.get(par.key);
    if (bl) {
      if (!this.dec.has(par.key)) { this.dec.add(par.key); blobToSprite(bl).then(sp => { this.dec.delete(par.key); this._put(par.key, sp); this.onSprite && this.onSprite(); }, () => { this.dec.delete(par.key); this.blobs.delete(par.key); }); }
      return null;
    }
    if (budget && this.hcOn()) {                                // Haus-Speicher im Browser: erst nachsehen, ob es schon einmal gerendert wurde
      if (!this.miss.has(par.key)) { this.probeHouse(par); return null; }
    }
    if (budget && this.pool()) { this.want(par); return null; }
    if (budget && budget.n <= 0) return null;
    if (budget) budget.n--;
    const sp = this._put(par.key, renderSprite(buildParcel(par, par.cx, par.cy), 0, HOUSE_OPT));
    if (budget) this.saveHouse(par.key, sp);
    return sp;
  }
  // ---------- Dauerhafter Haus-Speicher (IndexedDB): einmal gerendert, beim nächsten Öffnen sofort da ----------
  hcOn() {
    if (this._hc === undefined) {
      this._hc = !/[?&]nocache/.test(location.search) && typeof indexedDB !== 'undefined';
      this.miss = new Set(); this.probing = new Set(); this.saveQ = []; this.saving = false; this.stored = 0;
      if (this._hc) dbCount('bake').then(n => { this.stored = n; }, () => {});
    }
    return this._hc;
  }
  hkey(par) { return 'h' + CFG.HOUSE_V + '|' + par.key; }
  probeHouse(par) {
    if (this.probing.has(par.key)) return; this.probing.add(par.key);
    dbGet('bake', this.hkey(par)).then(rec => {
      if (rec && rec.blob) return blobToSprite(rec).then(sp => { this.probing.delete(par.key); sp.canvas = null; this._put(par.key, sp); }, () => { this.probing.delete(par.key); this.miss.add(par.key); });
      this.probing.delete(par.key); this.miss.add(par.key);
    }, () => { this.probing.delete(par.key); this._hc = false; }).finally(() => { this.onSprite && this.onSprite(); });
  }
  saveHouse(key, s) {
    if (!this.hcOn() || this.stored >= CFG.HOUSE_MAX) return;
    this.saveQ.push([key, s]); if (this.saveQ.length > 300) this.saveQ.shift();
    if (!this.saving) { this.saving = true; setTimeout(() => this._saveStep(), 60); }
  }
  async _saveStep() {
    const it = this.saveQ.shift(); if (!it) { this.saving = false; return; }
    try {
      const r = await spriteToBlob(it[1]);
      await dbSet('bake', 'h' + CFG.HOUSE_V + '|' + it[0], r); this.stored++;
    } catch (e) { /* Speicher voll oder gesperrt: egal, dann wird eben neu gerendert */ }
    setTimeout(() => this._saveStep(), 15);
  }
  // ---------- Worker-Pool: Häuser parallel auf mehreren Kernen rendern ----------
  pool() {
    if (this._pool !== undefined) return this._pool;
    this._pool = null;
    try {
      if (typeof Worker === 'undefined' || /[?&]noworker/.test(location.search)) return null;
      const base = new URL('./', import.meta.url).href;
      const src = `import { buildParcel } from '${base}blocks.js'; import { renderSprite } from '${base}renderer.js';
        onmessage = e => { const { id, par } = e.data; try { const s = renderSprite(buildParcel(par, par.cx, par.cy), 0, ${JSON.stringify(HOUSE_OPT)});
          postMessage({ id, s: { w: s.w, h: s.h, ox: s.ox, oy: s.oy, rgba: s.rgba, depth: s.depth, sh: s.sh } }, [s.rgba.buffer, s.depth.buffer, s.sh.buffer]); } catch (err) { postMessage({ id, err: String(err) }); } };
        postMessage({ ready: 1 });`;
      const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
      const n = Math.max(2, Math.min(8, (navigator.hardwareConcurrency || 4) - 1)), ws = [];
      for (let i = 0; i < n; i++) {
        const w = new Worker(url, { type: 'module' }); w.busy = null; w.ok = false;
        w.onmessage = e => this._done(w, e.data);
        w.onerror = () => { if (!w.ok) this._poolFail(); else this._jobFail(w); };
        ws.push(w);
      }
      this._pool = ws; this.need = new Map(); this.focus = [0, 0];
    } catch (e) { this._pool = null; }
    return this._pool;
  }
  _poolFail() { if (!this._pool) return; for (const w of this._pool) w.terminate(); this._pool = null; this.need = null; this.onSprite && this.onSprite(); }
  _jobFail(w) { w.busy = null; this._pump(); }
  // Haus anfordern: wer zuletzt angefragt wurde (= gerade sichtbar) und nah an der Bildmitte liegt, kommt zuerst dran
  want(par) {
    const j = this.need.get(par.key), t = performance.now();
    if (j) j.t = t; else if (!this.inflight(par.key)) this.need.set(par.key, { par, t });
    this._pump();
  }
  inflight(k) { return this._pool.some(w => w.busy && w.busy.key === k); }
  _pump() {
    if (!this._pool) return;
    const now = performance.now(), [fx, fy] = this.focus;
    for (const w of this._pool) {
      if (w.busy || !this.need.size) continue;
      let best = null, bd = 1e18;
      for (const [k, j] of this.need) {
        if (now - j.t > 1500) { this.need.delete(k); continue; }     // nicht mehr sichtbar -> vergessen
        const d = (j.par.cx - fx) ** 2 + (j.par.cy - fy) ** 2; if (d < bd) { bd = d; best = j; }
      }
      if (!best) break;
      this.need.delete(best.par.key); w.busy = { key: best.par.key, bid: best.par.bid };
      w.postMessage({ id: best.par.key, par: best.par });
    }
  }
  _done(w, m) {
    if (m.ready) { w.ok = true; this._pump(); return; }
    const job = w.busy; w.busy = null;
    if (m.s && job) { const s = m.s; s.canvas = null; this._put(job.key, s); this.saveHouse(job.key, s); this.onSprite && this.onSprite(); }
    this._pump();
  }
  _put(k, s) { this.spr.set(k, s); while (this.spr.size > this.cap) this.spr.delete(this.spr.keys().next().value); return s; }
  // Block bestätigen: alle Häuser einmal rendern und als Bilder speichern; danach nur noch auswählen/löschen
  async bake(id) {
    const b = this.list.get(id); if (!b || b.baked) return;
    this.begin(); b.baked = true; b.bakeId = b.id + '-' + Date.now().toString(36); this.commit();
    this.baking++;
    try {
      const recs = [];
      for (const par of this.gen(b).parcels) {
        const s = this.spr.get(par.key) || this._put(par.key, renderSprite(buildParcel(par, par.cx, par.cy), 0, HOUSE_OPT));
        const r = await spriteToBlob(s); recs.push(r); this.blobs.set(par.key, r);
        await new Promise(res => setTimeout(res, 0));
      }
      await dbSet('bake', b.bakeId, recs).catch(() => {});
    } finally { this.baking--; this.onSprite && this.onSprite(); }
  }
  // nach dem Laden einer Karte: gespeicherte Hausbilder der eingebrannten Blöcke holen (fehlen sie, wird neu gebrannt)
  loadBakes() {
    for (const b of this.list.values()) {
      if (!b.baked || !b.bakeId) continue;
      this.wait.add(b.id);
      dbGet('bake', b.bakeId).then(recs => {
        const ps = this.gen(b).parcels;
        if (Array.isArray(recs) && recs.length === ps.length) ps.forEach((par, i) => this.blobs.set(par.key, recs[i]));
        else this._rebake(b);
      }, () => {}).finally(() => { this.wait.delete(b.id); this.onSprite && this.onSprite(); });
    }
  }
  async _rebake(b) {
    const recs = [];
    for (const par of this.gen(b).parcels) {
      const s = this.spr.get(par.key) || this._put(par.key, renderSprite(buildParcel(par, par.cx, par.cy), 0, HOUSE_OPT));
      const r = await spriteToBlob(s); recs.push(r); this.blobs.set(par.key, r); await new Promise(res => setTimeout(res, 0));
    }
    dbSet('bake', b.bakeId, recs).catch(() => {});
  }
  containing(x, y) {
    for (const b of this.list.values()) {
      const P = b.pts; let ins = false;
      for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > y) !== (P[j][1] > y) && x < (P[j][0] - P[i][0]) * (y - P[i][1]) / (P[j][1] - P[i][1]) + P[i][0]) ins = !ins;
      if (ins) return b;
    }
    return null;
  }
  // pixelgenau über bereits gerenderte Hausbilder
  pick(nx, ny, bb) {
    let best = null, bd = -1e18;
    for (const b of this.list.values()) {
      const x = this.bbox(b); if (x[2] < bb[0] || x[0] > bb[2] || x[3] < bb[1] || x[1] > bb[3]) continue;
      for (const par of this.gen(b).parcels) {
        const s = this.spr.get(par.key); if (!s) continue;
        const p = proj(par.cx, par.cy, 0), lx = Math.floor(nx) - (Math.round(p[0]) - s.ox), ly = Math.floor(ny) - (Math.round(p[1]) - s.oy);
        if (lx < 0 || ly < 0 || lx >= s.w || ly >= s.h || !s.rgba[(ly * s.w + lx) * 4 + 3]) continue;
        const d = s.depth[ly * s.w + lx] + groundDepth(par.cx, par.cy); if (d > bd) { bd = d; best = b; }
      }
    }
    return best;
  }
  serialize() { return [...this.list.values()].map(b => ({ id: b.id, pts: b.pts.map(p => [Math.round(p[0] * 100) / 100, Math.round(p[1] * 100) / 100]), p: b.p, ...(b.baked ? { baked: 1, bakeId: b.bakeId } : {}) })); }
  load(d, quiet) {
    this.list.clear(); this.geo.clear(); this.nid = 1; if (!quiet) { this.U = []; this.R = []; }
    for (const b of Array.isArray(d) ? d : []) { this.list.set(b.id, { id: b.id, pts: b.pts, p: { ...BLOCK_DEFAULT, ...b.p }, baked: !!b.baked, bakeId: b.bakeId }); this.nid = Math.max(this.nid, b.id + 1); }
  }
}

// ---------- Fachwerkhaus (Frankfurter Altstadt): Erdgeschoss aus Sandstein, Obergeschosse vorkragend, Giebel zur Straße ----------
function buildFachwerk(par, cx, cy) {
  const m = new Mesh(), L = p => [p[0] - cx, p[1] - cy], [Q0, Q1, Q2, Q3] = par.q.map(L), n = par.n, u = par.u, Z = (p, z) => [p[0], p[1], z];
  const gh = 3.2, fh = 2.9, F = par.F, len = Math.hypot(Q1[0] - Q0[0], Q1[1] - Q0[1]), hid = m.part(), out = [-n[0], -n[1], 0];
  const arch = par.gate && par.gate.type === 'arch' ? { u0: par.gate.c - 1.3, u1: par.gate.c + 1.3 } : null;
  const ex = { len, fh, gh, wall: par.fwWall, beam: par.fwBeam, axes: par.axes, door: par.doorAx, seed: par.seed % 9973, arch };
  const cen = [(Q0[0] + Q1[0] + Q2[0] + Q3[0]) / 4, (Q0[1] + Q1[1] + Q2[1] + Q3[1]) / 4];
  const sOut = (a, b) => [(a[0] + b[0]) / 2 - cen[0], (a[1] + b[1]) / 2 - cen[1], 0];
  const off = f => (f <= 0 ? 0 : 0.28 * f), O = (p, s) => [p[0] - n[0] * s, p[1] - n[1] * s];
  let z = 0;
  for (let f = 0; f < F; f++) {
    const h = f === 0 ? gh : fh, A = O(Q0, off(f)), B = O(Q1, off(f));
    m.quad(Z(A, z), Z(B, z), Z(B, z + h), Z(A, z + h), 'fachwerk', hid, out, { ...ex, kind: f === 0 ? 'ground' : 'floor', fi: f, shop: f === 0 ? par.shop : null });
    m.quad(Z(Q2, z), Z(Q3, z), Z(Q3, z + h), Z(Q2, z + h), 'fachwerk', hid, [n[0], n[1], 0], { ...ex, kind: f === 0 ? 'back0' : 'floor', fi: f, len: Math.hypot(Q3[0] - Q2[0], Q3[1] - Q2[1]), door: -1, arch: arch ? { u0: len - arch.u1, u1: len - arch.u0 } : null });
    // freiliegende Seite an der Ecke: echte Fassade (Fachwerk bzw. Sandstein-Erdgeschoss) statt Brandwand
    const sideEx = len2 => ({ ...ex, kind: f === 0 ? 'back0' : 'floor', fi: f, len: len2, door: -1, arch: null });
    const sd = par.side || {};
    m.quad(Z(B, z), Z(Q2, z), Z(Q2, z + h), Z(B, z + h), sd.end ? 'fachwerk' : 'firewall', hid, sOut(B, Q2), sd.end ? sideEx(Math.hypot(Q2[0] - B[0], Q2[1] - B[1])) : undefined);
    m.quad(Z(Q3, z), Z(A, z), Z(A, z + h), Z(Q3, z + h), sd.start ? 'fachwerk' : 'firewall', hid, sOut(Q3, A), sd.start ? sideEx(Math.hypot(A[0] - Q3[0], A[1] - Q3[1])) : undefined);
    z += h;
  }
  awnings(m, par, Q0, u, n, len, par.axes, par.doorAx, arch, 2.7, 2.2, 0.95);
  // Giebeldach, First senkrecht zur Straße
  const E = z, A = O(Q0, off(F - 1) + 0.15), B = O(Q1, off(F - 1) + 0.15), M0 = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2], M1 = [(Q2[0] + Q3[0]) / 2, (Q2[1] + Q3[1]) / 2];
  const zr = E + Math.min(9, Math.max(3, len * 0.95)), rid = m.part(), roofMat = par.roof[0] > 120 ? 'roof' : 'slate', RX = roofMat === 'roof' ? { pal: { roof: par.roof } } : { roof: par.roof };
  const sl = [-u[0], -u[1], 0.7], sr = [u[0], u[1], 0.7];
  m.quad(Z(Q3, E), Z(A, E), Z(M0, zr), Z(M1, zr), roofMat, rid, sl, RX);
  m.quad(Z(B, E), Z(Q2, E), Z(M1, zr), Z(M0, zr), roofMat, rid, sr, RX);
  const gl = Math.hypot(B[0] - A[0], B[1] - A[1]);
  m.tri([A[0], A[1], E], [B[0], B[1], E], [M0[0], M0[1], zr], [0, 0], [gl, 0], [gl / 2, zr - E], 'fachwerk', nrmOut(A, B, M0, E, zr, out), hid, { ...ex, kind: 'gable', len: gl });
  m.tri3(Z(Q2, E), Z(Q3, E), Z(M1, zr), 'firewall', rid, [n[0], n[1], 0]);
  return m;
}
// Markisen über den Schaufenstern (nur Läden mit Markise)
function awnings(m, par, Q0, u, n, len, axes, door, arch, z0, z1, depth) {
  const S = par.shop; if (!S || !S.awn) return;
  const aw = len / axes, Z = (p, z) => [p[0], p[1], z], P = (t, s) => [Q0[0] + u[0] * t - n[0] * s, Q0[1] + u[1] * t - n[1] * s];
  for (let j = 0; j < axes; j++) {
    const c = (j + 0.5) * aw; if (j === door || (arch && c > arch.u0 - 0.6 && c < arch.u1 + 0.6)) continue;
    const w = Math.min(aw - 0.36, 2.8) / 2, id = m.part(), X = { c: S.awn, st: S.stripe };
    const a = P(c - w, 0.02), b = P(c + w, 0.02), b2 = P(c + w, depth), a2 = P(c - w, depth);
    m.quad(Z(a, z0), Z(b, z0), Z(b2, z1), Z(a2, z1), 'awning', id, [-n[0] * (z0 - z1), -n[1] * (z0 - z1), depth], X);
    m.quad(Z(a2, z1), Z(b2, z1), Z(b2, z1 - 0.26), Z(a2, z1 - 0.26), 'awning', id, [-n[0], -n[1], 0], { ...X, val: 1 });
  }
}
function nrmOut(A, B, M0, E, zr, out) { let nn = nrm(cross(sub([B[0], B[1], E], [A[0], A[1], E]), sub([M0[0], M0[1], zr], [A[0], A[1], E]))); if (dot(nn, out) < 0) nn = nn.map(q => -q); return nn; }
