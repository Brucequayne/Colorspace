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
  flat: { f: (u, v, P, ex) => ex.c }, flatE: { emit: 1, f: (u, v, P, ex) => ex.c },
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

// ---------- Gründerzeit-Altbau ----------
// Fenster mit Kämpfer und Mittelpfosten (lu, lv = 0..1 innerhalb der Öffnung)
function glass(lu, lv, W, H) {
  if (lu < 0.07 || lu > 0.93 || lv < 0.05 || lv > 0.95 || Math.abs(lu - 0.5) * W < 0.04 || Math.abs(lv - 0.72) * H < 0.04) return [232, 230, 222];
  if (lv < 0.72 && (lu < 0.15 || lu > 0.85) && lv > 0.3) return [208, 198, 178]; // Vorhang
  const k = lu + lv * 0.6; return k > 0.55 && k < 0.75 ? [98, 124, 152] : lv > 0.8 ? [38, 50, 70] : [50, 66, 90];
}
// Tordurchfahrt: Rundbogen-Öffnung (dunkel) mit Steinrahmen; null = nicht getroffen
function archPix(u, v, a, frame, top) {
  if (!a) return null;
  const c = (a.u0 + a.u1) / 2, r = (a.u1 - a.u0) / 2, h = top - r, du = Math.abs(u - c);
  const inside = du < r && (v < h || Math.hypot(u - c, v - h) < r);
  if (inside) return v < 0.15 ? [58, 54, 52] : [26, 24, 28];
  const ring = du < r + 0.3 && (v < h || Math.hypot(u - c, v - h) < r + 0.3) && v < top + 0.3;
  return ring ? frame : null;
}
// Laden im Erdgeschoss (Mixed Use): große Schaufenster mit Auslage, Ladentür, Schild mit Schrift
const GOODS = [[200, 80, 70], [230, 200, 120], [90, 120, 170], [240, 236, 226], [120, 160, 100], [196, 120, 160], [60, 58, 60]];
function shopWin(du, v, hw, v0, v1, S, u) {
  if (Math.abs(du) > hw - 0.08 || v < v0 + 0.08 || v > v1 - 0.08 || Math.abs(du) < 0.035) return [46, 46, 50];   // Rahmen + Mittelpfosten
  if (v < v0 + 0.9) {                                                                                       // Auslage
    const h = hash(Math.floor(u / 0.2), Math.floor(v / 0.16), S.g);
    return h < 0.55 ? GOODS[Math.floor(h * 100) % GOODS.length] : [74, 64, 58];
  }
  return glass((du + hw) / (2 * hw), (v - v0) / (v1 - v0), 2 * hw, v1 - v0);
}
const signText = c => (c[0] + c[1] + c[2] < 330 ? [238, 222, 168] : [44, 40, 38]);
function altbau(u, v, P, ex) {
  const { len, gh, fh, E, wall, trim, plinth } = ex;
  const ap = archPix(u, v, ex.arch, mul(plinth, 1.1), 3.5); if (ap) return ap;
  const ax = ex.axes, aw = len / ax, ai = Math.min(ax - 1, Math.max(0, Math.floor(u / aw))), du = u - (ai + 0.5) * aw;
  const n = hash(Math.floor(u * 8), Math.floor(v * 8), ex.seed);
  if (ex.kind === 'court') {                       // Hofseite: schlicht
    const cw = mul(wall, 0.9);
    if (v < 0.4) return jit(mul(plinth, 0.85), n, 10);
    const fi = v < gh ? -1 : Math.floor((v - gh) / fh), fv = fi < 0 ? v : v - gh - fi * fh;
    if (v < E - 0.6 && Math.abs(du) < 0.5 && fv > (fi < 0 ? 1.3 : 0.9) && fv < (fi < 0 ? 3.0 : 2.5)) return glass((du + 0.5), (fv - (fi < 0 ? 1.3 : 0.9)) / (fi < 0 ? 1.7 : 1.6), 1, 1.6);
    if (v < E - 0.6 && Math.abs(du) < 0.6 && fv > (fi < 0 ? 1.2 : 0.8) && fv < (fi < 0 ? 1.3 : 0.9)) return mul(trim, 0.9);
    return jit(cw, n, 10);
  }
  if (v > E - 0.35) return jit(trim, n, 8);                                   // Traufgesims
  if (v > E - 1.0) {                                                         // Fries mit Konsolen
    if (fr(u / 0.7) < 0.22 && v < E - 0.45) return mul(trim, 0.92);
    return jit(mul(wall, 0.93), n, 8);
  }
  if (ex.shop && ex.kind === 'front' && v < gh) {                           // Laden
    const S = ex.shop;
    if (v > 3.28 && v < 3.98) {                                              // Ladenschild über die ganze Breite
      if (v < 3.34 || v > 3.92) return mul(S.sign, 0.65);
      const c = len / 2, half = Math.min(len * 0.32, 3.4);
      if (Math.abs(u - c) < half && v > 3.5 && v < 3.78) { const lu = Math.floor((u - c + half) / 0.14), lv = Math.floor((v - 3.5) / 0.07); if (lu % 5 !== 4 && hash(lu, lv, S.g) < 0.5) return signText(S.sign); }
      return jit(S.sign, n, 5);
    }
    if (ai !== ex.door && v < 3.28) {
      const hw = aw / 2 - 0.28;
      if (ai === (ex.door + 1) % ex.axes && Math.abs(du) < 0.6 && v < 2.7) return Math.abs(du) > 0.52 || v > 2.62 ? [46, 46, 50] : glass((du + 0.52) / 1.04, v / 2.62, 1.04, 2.62); // Ladentür
      if (Math.abs(du) < hw && v > 0.42 && v < 3.12) return shopWin(du, v, hw, 0.42, 3.12, S, u);
    }
  }
  if (v < gh) {                                                              // Erdgeschoss aus Sandstein
    if (ai === ex.door && Math.abs(du) < 0.95 && v > 0.25 && v < 3.55) {
      if (Math.abs(du) > 0.75 || v > 3.3) return mul(plinth, 1.12);
      if (v > 2.6) return glass((du + 0.75) / 1.5, (v - 2.6) / 0.7, 1.5, 0.7);
      const pu = Math.abs(du) < 0.68 && Math.abs(Math.abs(du) - 0.35) < 0.25 && ((v > 0.5 && v < 1.4) || (v > 1.6 && v < 2.45));
      return pu ? [86, 52, 34] : jit([108, 64, 40], n, 10);
    }
    if (Math.abs(du) < 0.6 && v > 1.25 && v < 3.15) return glass((du + 0.6) / 1.2, (v - 1.25) / 1.9, 1.2, 1.9);
    if (Math.abs(du) < 0.74 && v > 1.1 && v < 3.3) return mul(plinth, 1.14);
    if (v < 0.5) return jit(mul(plinth, 0.82), n, 10);
    if (fr(v / 0.45) < 0.12) return mul(plinth, 0.78);                       // Bossenfugen
    return jit(plinth, hash(Math.floor(u / 0.9 + (Math.floor(v / 0.45) % 2) * 0.5), Math.floor(v / 0.45), ex.seed), 14);
  }
  if (v < gh + 0.22) return jit(trim, n, 8);                                 // Gurtgesims
  const fi = Math.floor((v - gh) / fh), fv = v - gh - fi * fh;
  if (Math.abs(du) < 0.575 && fv > 0.85 && fv < 2.75) return glass((du + 0.575) / 1.15, (fv - 0.85) / 1.9, 1.15, 1.9);
  if (Math.abs(du) < 0.86 && fv > 0.7 && fv < 0.85) return mul(trim, 0.86);  // Sohlbank
  if (Math.abs(du) < 0.74 && fv > 0.85 && fv < 2.9) return jit(trim, n, 6);  // Fensterfasche
  if (fi === 0 && Math.abs(du) < 0.86 && fv > 2.9 && fv < 3.15) return fv > 3.08 ? mul(trim, 1.06) : mul(trim, 0.9); // Verdachung
  if (fi === 0 && Math.abs(du) < 0.74 && fv > 2.9 && fv < 3.25) return mul(wall, 0.85);
  return jit(wall, n, 9);
}
Object.assign(M, {
  awning: { f: (u, v, P, ex) => {
    let c = ex.c;
    if (ex.st && fr(u / 0.56) < 0.5) c = [234, 230, 220];
    if (ex.val && v > 0.17 && fr(u / 0.28) > 0.5) return null;                // gezackter Volant
    return jit(mul(c, ex.val ? 0.9 : 1), tx(P, 0.125, 70), 6);
  }, alpha: 1 },
  altbau: { f: (u, v, P, ex) => altbau(u, v, P, ex) },
  trim: { f: (u, v, P, ex) => jit(ex.trim, tx(P, 0.125, 60), 8) },
  firewall: { f: (u, v, P) => { const h = tx(P, 0.5, 61), n = tx(P, 0.125, 62); return jit(h < 0.15 ? [160, 154, 146] : [184, 178, 168], n, 10); } },
  slate: { f: (u, v, P, ex) => {
    const base = ex.roof, row = Math.floor(v / 0.22), fv = fr(v / 0.22), x = u / 0.2 + (row % 2) * 0.5, h = hash(Math.floor(x), row, 63);
    let c = jit(base, h, 16);
    if (fv > 0.82) return mul(c, 0.7); if (fr(x) < 0.08) return mul(c, 0.85); if (fv < 0.15) return mul(c, 1.12); return c;
  } },
  zinc: plain([122, 126, 132], 8, 64),
  tar: { f: (u, v, P) => { const h = tx(P, 0.25, 65); return jit(h < 0.1 ? [92, 92, 90] : [112, 112, 108], tx(P, 0.125, 66), 8); } },
  dormer: { f: (u, v) => (u > 0.22 && u < 0.98 && v > 0.35 && v < 1.75 ? glass((u - 0.22) / 0.76, (v - 0.35) / 1.4, 0.76, 1.4) : [126, 130, 136]) },
  iron: { alpha: 1, f: (u, v) => { if (v > 0.92 || (v > 0.04 && v < 0.12)) return [44, 44, 48]; if (v > 0.12 && fr(u / 0.13) < 0.28) return [52, 52, 58]; return null; } }
});

// ---------- Fachwerk ----------
function fachwerk(u, v, P, ex) {
  const { len, fh, wall, beam } = ex, n = hash(Math.floor(u * 8), Math.floor(v * 8), ex.seed + 7), bw = 0.17;
  if (ex.kind === 'ground' || ex.kind === 'back0') {           // Erdgeschoss: roter Sandstein, Tür, Ladenfenster
    const ap = archPix(u, v, ex.arch, [186, 110, 92], 2.8); if (ap) return ap;
    const ax = ex.axes, aw = len / ax, ai = Math.min(ax - 1, Math.floor(u / aw)), du = u - (ai + 0.5) * aw;
    if (v > ex.gh - 0.25) return mul(beam, 1.05);                // Schwelle des 1. OG
    if (ex.shop && ex.kind === 'ground' && ai !== ex.door) {     // Laden: breites Schaufenster
      const hw = aw / 2 - 0.22;
      if (Math.abs(du) < hw && v > 0.4 && v < 2.5) return shopWin(du, v, hw, 0.4, 2.5, ex.shop, u);
      if (Math.abs(du) < hw + 0.1 && v > 0.3 && v < 2.6) return [186, 110, 92];
    }
    if (ex.kind === 'ground' && ai === ex.door && Math.abs(du) < 0.55 && v < 2.3) return Math.abs(du) > 0.45 || v > 2.15 ? [186, 110, 92] : jit([96, 58, 36], n, 10);
    if (Math.abs(du) < 0.5 && v > 0.9 && v < 2.3) return glass((du + 0.5), (v - 0.9) / 1.4, 1, 1.4);
    if (Math.abs(du) < 0.62 && v > 0.8 && v < 2.42) return [186, 110, 92];
    const row = Math.floor(v / 0.38), x = u / 0.7 + (row % 2) * 0.5;
    if (fr(v / 0.38) < 0.1 || fr(x) < 0.05) return [118, 62, 52];
    return jit([160, 86, 70], hash(Math.floor(x), row, 88), 16);
  }
  const bays = Math.max(1, Math.round(len / 1.15)), bwid = len / bays, bi = Math.min(bays - 1, Math.floor(u / bwid)), lu = u - bi * bwid;
  if (ex.kind === 'gable') {                                    // Giebel: Riegel alle 1,3 m, Ständer
    const rv = v % 1.3;
    if (rv < bw || lu < bw * 0.6 || lu > bwid - bw * 0.6) return jit(beam, n, 10);
    if (bi % 2 === 1 && v < 2.6 && rv > 0.35 && rv < 1.1 && lu > 0.22 && lu < bwid - 0.22) return glass((lu - 0.22) / (bwid - 0.44), (rv - 0.35) / 0.75, 0.6, 0.75);
    return jit(wall, n, 8);
  }
  if (v < bw || v > fh - bw) return jit(mul(beam, v < bw ? 0.85 : 1), n, 10);   // Schwelle / Rähm
  if (lu < bw * 0.6 || lu > bwid - bw * 0.6) return jit(beam, n, 10);           // Ständer
  const win = (bi % 2 === 1) || bays <= 2 && bi === 0;
  if (win) {
    if (v > 0.95 && v < 2.35 && lu > 0.2 && lu < bwid - 0.2) return glass((lu - 0.2) / (bwid - 0.4), (v - 0.95) / 1.4, bwid - 0.4, 1.4);
    if (Math.abs(v - 0.88) < 0.08 || Math.abs(v - 2.42) < 0.08) return jit(beam, n, 10);      // Brust- und Sturzriegel
    if (v < 0.8) { const a = lu / bwid, b = v / 0.8; if (Math.abs(a - b) < 0.12 || Math.abs(a - (1 - b)) < 0.12) return jit(beam, n, 10); } // Andreaskreuz
    return jit(wall, n, 8);
  }
  const a = lu / bwid, b = v / fh;                                // Strebe (Mann-Figur)
  if ((bi % 4 === 0 && Math.abs(a - b) < 0.09) || (bi % 4 === 2 && Math.abs(a - (1 - b)) < 0.09) || Math.abs(v - fh * 0.5) < bw * 0.5) return jit(beam, n, 10);
  return jit(wall, n, 8);
}
M.fachwerk = { f: (u, v, P, ex) => fachwerk(u, v, P, ex) };
