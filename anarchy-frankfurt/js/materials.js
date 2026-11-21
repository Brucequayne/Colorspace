// Pixel-Texturen: jede Funktion liefert eine Farbe für einen Punkt auf einer Fläche (oder null = durchsichtig)
import { fr, hash, tx, jit, mul } from './geometry.js';

const JOINT = [118, 58, 50];
const plain = (c, a, k) => ({ f: (u, v, P) => jit(c, tx(P, 0.125, k), a) });

function winPix(u, v, w, pal) {
  const f = 0.12;
  if (w.sh && pal.sh && v >= w.v0 && v <= w.v1) {
    const a = u >= w.u0 - 0.62 && u < w.u0 - 0.08, b = u > w.u1 + 0.08 && u <= w.u1 + 0.62;
    if (a || b) {
      if (fr((v - w.v0) / 0.11) < 0.25) return mul(pal.sh, 0.62);
      const e = a ? (u < w.u0 - 0.57 || u > w.u0 - 0.13) : (u < w.u1 + 0.13 || u > w.u1 + 0.57);
      return e ? mul(pal.sh, 0.72) : pal.sh;
    }
  }
  if (w.t === 'round') {
    const cu = (w.u0 + w.u1) / 2, cv = (w.v0 + w.v1) / 2, r = (w.u1 - w.u0) / 2, d = Math.hypot(u - cu, v - cv);
    if (d < r) {
      if (Math.abs(u - cu) < 0.04 || Math.abs(v - cv) < 0.04) return [236, 234, 226];
      const k = u - cu + v - cv; return k > 0.05 && k < 0.2 ? [96, 124, 156] : [46, 62, 84];
    }
    return d < r + f ? [176, 92, 76] : null;
  }
  if (w.t !== 'door' && u >= w.u0 - f - 0.08 && u <= w.u1 + f + 0.08 && v >= w.v0 - f - 0.1 && v < w.v0 - f)
    return v > w.v0 - f - 0.04 ? [196, 116, 98] : [150, 74, 62];
  if (u < w.u0 - f || u > w.u1 + f || v < w.v0 - (w.t === 'door' ? 0 : f) || v > w.v1 + f) return null;
  if (u < w.u0 || u > w.u1 || v < w.v0 || v > w.v1) return [176, 92, 76];
  const W = w.u1 - w.u0, H = w.v1 - w.v0, lu = (u - w.u0) / W, lv = (v - w.v0) / H;
  if (w.t === 'door') {
    if (lv > 0.84) { if (Math.abs(lu - 0.5) * W < 0.03) return [92, 52, 32]; return lu + lv > 1.3 && lu + lv < 1.5 ? [96, 124, 156] : [46, 62, 84]; }
    if (Math.abs(lu - 0.82) < 0.05 && Math.abs(lv - 0.47) < 0.02) return [226, 194, 96];
    const pu = (lu > 0.12 && lu < 0.44) || (lu > 0.56 && lu < 0.88), pv = (lv > 0.1 && lv < 0.45) || (lv > 0.52 && lv < 0.78);
    if (pu && pv) { const e = lu < 0.15 || (lu > 0.41 && lu < 0.6) || lu > 0.85 || lv < 0.13 || (lv > 0.42 && lv < 0.55) || lv > 0.75; return e ? [80, 44, 28] : [100, 56, 36]; }
    return jit([118, 68, 42], hash(Math.floor(u * 20), 0, 40), 10);
  }
  if (lu < 0.05 || lu > 0.95 || lv < 0.05 || lv > 0.95 || Math.abs(lu - 0.5) * W < 0.04 || Math.abs(lv - 0.62) * H < 0.04) return [236, 234, 226];
  if (lv > 0.66 && (lu < 0.16 || lu > 0.84)) return [214, 204, 184];
  const k = lu + lv * 0.7; return k > 0.5 && k < 0.72 ? [96, 124, 156] : lv > 0.8 ? [40, 54, 74] : [50, 68, 92];
}

function facade(u, v, ex) {
  for (const w of ex.win) { const r = winPix(u, v, w, ex.pal); if (r) return r; }
  if (v < 0.6) {
    const row = Math.floor(v / 0.3), x = u / 0.6 + (row % 2) * 0.5;
    if (fr(x) < 0.06 || fr(v / 0.3) < 0.1) return JOINT;
    return jit([158, 78, 64], hash(Math.floor(x), row, 11), 18);
  }
  if (v > 2.95 && v < 3.12) return v < 3 ? [120, 60, 50] : [176, 92, 76];
  if (v < 5.8 && (u < 0.34 || u > ex.len - 0.34)) {
    const row = Math.floor((v - 0.6) / 0.34), wd = (row % 2) ? 0.34 : 0.2, inn = u < 0.34 ? u : ex.len - u;
    if (inn < wd) { if (fr((v - 0.6) / 0.34) < 0.09) return JOINT; return jit([164, 82, 68], hash(row, u < 0.34 ? 0 : 1, 12), 14); }
  }
  return jit(ex.pal.wall, hash(Math.floor(u * 8), Math.floor(v * 8), 13), 9);
}

function leafC(P, d, k) {
  const h = tx(P, 0.16, k || 17);
  const c = h < 0.28 ? [42, 84, 40] : h < 0.72 ? [58, 108, 48] : h < 0.94 ? [78, 132, 58] : [104, 156, 72];
  return mul(c, d);
}
const binF = c => ({ f: (u, v, P) => jit(fr((P[0] + P[1]) / 0.12) < 0.18 ? mul(c, 0.82) : c, tx(P, 0.125, 30), 8) });

export const M = {
  wall: { f: (u, v, P, ex) => facade(ex.ax === 'x' ? P[0] - ex.o : ex.o - P[1], P[2], ex) },
  roof: { f: (u, v, P, ex) => {
    const base = ex.pal.roof;
    if (v < 0.12) return mul(base, 0.58);
    const row = Math.floor(v / 0.3), fv = fr(v / 0.3), x = u / 0.26 + (row % 2) * 0.5, fu = fr(x), h = hash(Math.floor(x), row, 14);
    let c = jit(base, h, 26); if (h > 0.93) c = mul(base, 0.85);
    if (fv > 0.84) return mul(c, 0.62); if (fu < 0.07) return mul(c, 0.8); if (fv < 0.18) return mul(c, 1.08); return c;
  } },
  ridge: { f: (u, v, P, ex) => jit(mul(ex.pal.roof, 0.75), tx(P, 0.125, 19), 14) },
  fascia: plain([96, 62, 44], 8, 20),
  brick: { f: (u, v, P) => {
    const z = P[2], row = Math.floor(z / 0.12), a = (P[0] + P[1]) / 0.25 + (row % 2) * 0.5;
    if (fr(z / 0.12) < 0.2 || fr(a) < 0.1) return [170, 160, 150];
    return jit([146, 66, 52], hash(Math.floor(a), row, 15), 20);
  } },
  cap: plain([64, 58, 56], 6, 21), sand: plain([170, 88, 72], 14, 16), metal: plain([64, 68, 76], 8, 22),
  lampgreen: plain([52, 66, 60], 8, 22), post: plain([226, 220, 206], 10, 23), wood: plain([150, 104, 66], 16, 34),
  fence: { alpha: 1, f: (u, v) => {
    const fu = fr(u / 0.15), rail = (v > 0.22 && v < 0.32) || (v > 0.68 && v < 0.78);
    if (fu > 0.62) return rail ? [192, 186, 172] : null;
    const c = fu / 0.62; if (v > 0.9 + 0.12 * (1 - Math.abs(2 * c - 1))) return null;
    return fu < 0.08 || fu > 0.54 ? [206, 200, 186] : [238, 234, 222];
  } },
  leaf: { f: (u, v, P) => leafC(P, 1) },
  leafL: { f: (u, v, P) => mul(leafC(P, 1, 41), 1.08) },
  leafA: { f: (u, v, P) => (tx(P, 0.14, 43) > 0.965 ? [196, 44, 38] : leafC(P, 0.96, 42)) },
  hedge: { f: (u, v, P) => leafC(P, 0.88) },
  bark: { f: (u, v, P) => jit([94, 68, 48], hash(Math.floor((P[0] + P[1]) * 12), Math.floor(P[2] * 4), 18), 22) },
  barkP: { f: (u, v, P) => { const h = tx(P, 0.18, 44); return h < 0.4 ? [178, 170, 142] : h < 0.75 ? [142, 136, 112] : [204, 198, 172]; } },
  blade: { f: (u, v, P) => { const h = hash(Math.floor(P[0] * 40), Math.floor(P[1] * 40), 45); return mul(h < 0.4 ? [70, 120, 48] : h < 0.8 ? [92, 144, 60] : [120, 168, 76], 0.75 + 0.35 * Math.min(1, P[2] / 0.4)); } },
  petal: { f: (u, v, P, ex) => jit(ex.c, tx(P, 0.05, 46), 30) },
  path: { f: (u, v, P) => {
    const r = Math.floor(P[1] / 0.45), x = P[0] / 0.55 + (r % 2) * 0.5;
    if (fr(x) < 0.12 || fr(P[1] / 0.45) < 0.12) return [72, 98, 52];
    return jit([158, 148, 132], hash(Math.floor(x), r, 8), 30);
  } },
  binG: binF([86, 90, 96]), binB: binF([52, 88, 152]), binW: binF([112, 74, 46]), binY: binF([212, 180, 52]),
  skin: plain([222, 176, 140], 6, 24), jacket: plain([168, 60, 44], 10, 25), jeans: plain([58, 78, 120], 8, 26),
  shoe: plain([38, 36, 36], 4, 27), hair: plain([62, 42, 30], 6, 28), gun: plain([42, 42, 46], 4, 29),
  glow: { emit: 1, f: () => [255, 238, 176] }
};
