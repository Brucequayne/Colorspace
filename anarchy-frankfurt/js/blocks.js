// Häuserblock-Tool: Blockrand-Bebauung (Gründerzeit-Altbau) prozedural aus einem gezeichneten Vieleck
// Der Block wird nach innen um die Haustiefe versetzt (Rest = Innenhof), jede Straßenseite in Parzellen geteilt,
// jede Parzelle wird ein eigenes Haus (Etagen, Farben, Dach, Balkone, Gauben) und als Pixel-Sprite gerendert.
import { proj, groundDepth } from './camera.js';
import { Mesh, rng, nrm, cross, sub, dot } from './geometry.js';
import { renderSprite } from './renderer.js';

export const BLOCK_DEFAULT = { style: 'altbau', fmin: 4, fmax: 5, dens: 0.5, width: 15, pal: 'mix', roof: 'slate', gates: 1, seed: 1 };
export const STYLES = { altbau: { name: 'Gründerzeit-Altbau', fmin: 4, fmax: 5, width: 15 }, fachwerk: { name: 'Fachwerk (Altstadt)', fmin: 2, fmax: 4, width: 8 } };
// Fachwerk: Gefachfarben (Putz) und Balkenfarben
const FW_WALL = [[[236, 232, 220], 5], [[232, 220, 186], 3], [[226, 206, 160], 2], [[224, 196, 180], 1.5], [[214, 212, 204], 1.5], [[210, 196, 150], 1]];
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
export function normPoly(pts) { const P = pts.map(p => [p[0], p[1]]); return area(P) < 0 ? P.reverse() : P; }

// ---------- Parzellen ----------
export function generate(b) {
  const P = normPoly(b.pts), p = { ...BLOCK_DEFAULT, ...b.p }, r = rng(b.id * 7919 + p.seed * 104729);
  // maximale Tiefe, bei der noch ein Hof übrig bleibt
  let lo = 0, hi = 80;
  for (let k = 0; k < 24; k++) { const m = (lo + hi) / 2; if (insetOk(P, inset(P, m).Q)) lo = m; else hi = m; }
  // Dichte 0 % = schmale Häuser (9 m) mit großem Hof, 100 % = Hof fast zu: die Haustiefe wächst mit der Blockgröße
  const full = Math.max(9, lo * 0.95), d = Math.max(4, Math.min(lo * 0.95, 9 + p.dens * (full - 9)));
  const { E, Q } = inset(P, d), out = [];
  const facW = FAC.map(f => [f, f[2] * (PAL_MODES[p.pal] ? (PAL_MODES[p.pal].k[f[0]] ?? 1) : 1)]);
  const roofW = Object.entries((ROOF_MODES[p.roof] || ROOF_MODES.slate).w).map(([k, w]) => [k, w]);
  E.forEach((e, i) => {
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
      const corner = first || last, fw = p.style === 'fachwerk';
      let F = p.fmin + Math.floor(r() * (p.fmax - p.fmin + 1));
      if (corner && r() < 0.5) F = Math.min(p.fmax, F + 1);
      const fac = pickW(r, facW), dark = fac[1][0] + fac[1][1] + fac[1][2] < 420;
      const trim = dark ? LSTONE : r() < 0.5 ? STUCCO : SAND;
      const roofKey = pickW(r, roofW);
      out.push({
        style: fw ? 'fachwerk' : 'altbau', fwWall: pickW(r, FW_WALL), fwBeam: pickW(r, FW_BEAM), edge: i,
        key: `${b.id}:${i}:${j}:${p.style}:${p.gates}:${p.seed}:${p.fmin}:${p.fmax}:${p.dens}:${p.width}:${p.pal}:${p.roof}:${b.pts.map(q2 => q2.join(',')).join(';')}`,
        q, n: e.n, u: e.u, F, wall: fac[1].map(c => c + (r() - 0.5) * 10), trim, plinth: r() < 0.65 ? SAND : STONE,
        roof: ROOFS[roofKey].map(c => c + (r() - 0.5) * 8), mansard: corner || d > 16 || r() < 0.75, balcony: r() < 0.55, dormEvery: r() < 0.5 ? 1 : 2, seed: (r() * 1e6) | 0
      });
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
  // Tür (Hauseingang) je Parzelle – für das spätere Betreten
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
  m.quad(Z(Q0, 0), Z(Q1, 0), Z(Q1, E), Z(Q0, E), 'altbau', hid, out, { ...base, kind: 'front', len });
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
  constructor() { this.list = new Map(); this.nid = 1; this.U = []; this.R = []; this.onLog = null; this.onChange = null; this.geo = new Map(); this.spr = new Map(); this.cap = 260; }
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
    if (!g || g.key !== key) { g = generate(b); g.key = key; for (const par of g.parcels) { par.cx = par.q.reduce((s, q) => s + q[0], 0) / 4; par.cy = par.q.reduce((s, q) => s + q[1], 0) / 4; } this.geo.set(b.id, g); }
    return g;
  }
  // Parzellen in einem Weltbereich
  parcels(bb) {
    const out = [];
    for (const b of this.list.values()) { const x = this.bbox(b); if (x[2] < bb[0] || x[0] > bb[2] || x[3] < bb[1] || x[1] > bb[3]) continue; for (const par of this.gen(b).parcels) out.push(par); }
    return out;
  }
  // Sprite einer Parzelle (begrenzter Zwischenspeicher); budget.n = wie viele neu gerendert werden dürfen
  sprite(par, budget) {
    let s = this.spr.get(par.key);
    if (s) { this.spr.delete(par.key); this.spr.set(par.key, s); return s; }
    if (budget && budget.n <= 0) return null;
    if (budget) budget.n--;
    s = renderSprite(buildParcel(par, par.cx, par.cy), 0);
    this.spr.set(par.key, s); while (this.spr.size > this.cap) this.spr.delete(this.spr.keys().next().value);
    return s;
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
  serialize() { return [...this.list.values()].map(b => ({ id: b.id, pts: b.pts.map(p => [Math.round(p[0] * 100) / 100, Math.round(p[1] * 100) / 100]), p: b.p })); }
  load(d, quiet) {
    this.list.clear(); this.geo.clear(); this.nid = 1; if (!quiet) { this.U = []; this.R = []; }
    for (const b of Array.isArray(d) ? d : []) { this.list.set(b.id, { id: b.id, pts: b.pts, p: { ...BLOCK_DEFAULT, ...b.p } }); this.nid = Math.max(this.nid, b.id + 1); }
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
    m.quad(Z(A, z), Z(B, z), Z(B, z + h), Z(A, z + h), 'fachwerk', hid, out, { ...ex, kind: f === 0 ? 'ground' : 'floor', fi: f });
    m.quad(Z(Q2, z), Z(Q3, z), Z(Q3, z + h), Z(Q2, z + h), 'fachwerk', hid, [n[0], n[1], 0], { ...ex, kind: f === 0 ? 'back0' : 'floor', fi: f, len: Math.hypot(Q3[0] - Q2[0], Q3[1] - Q2[1]), door: -1, arch: arch ? { u0: len - arch.u1, u1: len - arch.u0 } : null });
    m.quad(Z(B, z), Z(Q2, z), Z(Q2, z + h), Z(B, z + h), 'firewall', hid, sOut(B, Q2));
    m.quad(Z(Q3, z), Z(A, z), Z(A, z + h), Z(Q3, z + h), 'firewall', hid, sOut(Q3, A));
    z += h;
  }
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
function nrmOut(A, B, M0, E, zr, out) { let nn = nrm(cross(sub([B[0], B[1], E], [A[0], A[1], E]), sub([M0[0], M0[1], zr], [A[0], A[1], E]))); if (dot(nn, out) < 0) nn = nn.map(q => -q); return nn; }
