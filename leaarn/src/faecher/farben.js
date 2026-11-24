// ===== faecher/farben.js · Farbmischen wie mit Malfarben (subtraktiv, Farbkreis nach Itten: Rot, Gelb, Blau) =====
// Eine Farbe = Anteile der Pigmente [Rot, Gelb, Blau, Weiß, Schwarz] (Summe 1). Mischen = gleiche Teile → Durchschnitt.
// Darstellung: Rot/Gelb/Blau über den RYB-Würfel (Gossett & Chen) in RGB, danach Weiß und Schwarz beimischen.
import { L2 } from "le/core.js";

// Malfarben im Kasten (Namen zum Lernen, p = Pigment-Anteile)
export const PAINTS = [
  { id: "rot", n: L2("Rot", "Red"), p: [1, 0, 0, 0, 0], g: 1 },
  { id: "gelb", n: L2("Gelb", "Yellow"), p: [0, 1, 0, 0, 0], g: 1 },
  { id: "blau", n: L2("Blau", "Blue"), p: [0, 0, 1, 0, 0], g: 1 },
  { id: "weiss", n: L2("Weiß", "White"), p: [0, 0, 0, 1, 0], g: 1 },
  { id: "schwarz", n: L2("Schwarz", "Black"), p: [0, 0, 0, 0, 1], g: 1 },
  { id: "orange", n: L2("Orange", "Orange"), p: [0.5, 0.5, 0, 0, 0], g: 2 },
  { id: "gruen", n: L2("Grün", "Green"), p: [0, 0.5, 0.5, 0, 0], g: 2 },
  { id: "violett", n: L2("Violett", "Violet"), p: [0.5, 0, 0.5, 0, 0], g: 2 },
  { id: "rosa", n: L2("Rosa", "Pink"), p: [0.5, 0, 0, 0.5, 0], g: 3 },
  { id: "hellblau", n: L2("Hellblau", "Light blue"), p: [0, 0, 0.5, 0.5, 0], g: 3 },
  { id: "grau", n: L2("Grau", "Grey"), p: [0, 0, 0, 0.5, 0.5], g: 3 },
  { id: "hellgruen", n: L2("Hellgrün", "Light green"), p: [0, 0.25, 0.25, 0.5, 0], g: 3 },
  { id: "braun", n: L2("Braun", "Brown"), p: [0.4, 0.3, 0.2, 0, 0.1], g: 3 },
  { id: "dunkelblau", n: L2("Dunkelblau", "Dark blue"), p: [0, 0, 0.6, 0, 0.4], g: 3 }
];
export const paint = (id) => PAINTS.find((x) => x.id === id);
export function mix(a, b) { return a.map((v, i) => (v + b[i]) / 2); }

// RYB-Würfel: Ecken (r, y, b) → RGB
const C = { "000": [1, 1, 1], "100": [1, 0, 0], "010": [1, 1, 0], "001": [0.163, 0.373, 0.6], "110": [1, 0.5, 0], "101": [0.5, 0, 0.5], "011": [0, 0.66, 0.2], "111": [0.2, 0.094, 0] };
function ryb(r, y, b) {
  const out = [0, 0, 0];
  for (const k in C) { const w = (k[0] === "1" ? r : 1 - r) * (k[1] === "1" ? y : 1 - y) * (k[2] === "1" ? b : 1 - b); for (let i = 0; i < 3; i++) out[i] += C[k][i] * w; }
  return out;
}
export function rgb(p) {
  const c = p[0] + p[1] + p[2], mx = Math.max(p[0], p[1], p[2]);
  const base = mx > 0 ? ryb(p[0] / mx, p[1] / mx, p[2] / mx) : [0, 0, 0];
  const k = [0.09, 0.09, 0.1];
  return base.map((v, i) => Math.max(0, Math.min(1, v * c + p[3] * 1 + p[4] * k[i])));
}
export function hex(p) { return "#" + rgb(p).map((v) => ("0" + Math.round(v * 255).toString(16)).slice(-2)).join(""); }
// Abstand zweier Farben (wie stark sie sich fürs Auge unterscheiden, grob gewichtet)
export function dist(p, q) { const a = rgb(p), b = rgb(q), w = [0.3, 0.59, 0.11]; let s = 0; for (let i = 0; i < 3; i++) { const d = a[i] - b[i]; s += d * d * (w[i] + 0.25); } return Math.sqrt(s); }

// ---------- Color Guesser (seit v0.12): Farbton/Sättigung/Helligkeit, Farbabstand, Bewertung 0–10 ----------
// HSB (h 0–360, s/b 0–100) → RGB 0…1
export function hsb(h, s, b) {
  s /= 100; b /= 100; const f = (n) => { const k = (n + h / 60) % 6; return b - b * s * Math.max(0, Math.min(k, 4 - k, 1)); };
  return [f(5), f(3), f(1)];
}
export const rgbHex = (c) => "#" + c.map((v) => ("0" + Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16)).slice(-2)).join("");
function lab(c) {
  const lin = c.map((v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  const X = (lin[0] * 0.4124 + lin[1] * 0.3576 + lin[2] * 0.1805) / 0.95047, Y = lin[0] * 0.2126 + lin[1] * 0.7152 + lin[2] * 0.0722, Z = (lin[0] * 0.0193 + lin[1] * 0.1192 + lin[2] * 0.9505) / 1.08883;
  const g = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116), fx = g(X), fy = g(Y), fz = g(Z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
// Farbabstand nach CIEDE2000 (wie stark sich zwei Farben fürs Auge unterscheiden; ~1 = kaum sichtbar)
export function de2000(c1, c2) {
  const [L1, a1, b1] = lab(c1), [L2_, a2, b2] = lab(c2), R = Math.PI / 180;
  const C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2), Cm = (C1 + C2) / 2, G = 0.5 * (1 - Math.sqrt(Math.pow(Cm, 7) / (Math.pow(Cm, 7) + Math.pow(25, 7))));
  const a1p = a1 * (1 + G), a2p = a2 * (1 + G), C1p = Math.hypot(a1p, b1), C2p = Math.hypot(a2p, b2);
  const hp = (a, b) => { if (a === 0 && b === 0) return 0; const h = Math.atan2(b, a) / R; return h < 0 ? h + 360 : h; };
  const h1 = hp(a1p, b1), h2 = hp(a2p, b2), dL = L2_ - L1, dC = C2p - C1p;
  let dh = 0; if (C1p * C2p !== 0) { dh = h2 - h1; if (dh > 180) dh -= 360; else if (dh < -180) dh += 360; }
  const dH = 2 * Math.sqrt(C1p * C2p) * Math.sin(dh * R / 2), Lm = (L1 + L2_) / 2, Cmp = (C1p + C2p) / 2;
  let hm = h1 + h2; if (C1p * C2p !== 0) { if (Math.abs(h1 - h2) > 180) hm += h1 + h2 < 360 ? 360 : -360; hm /= 2; }
  const T = 1 - 0.17 * Math.cos((hm - 30) * R) + 0.24 * Math.cos(2 * hm * R) + 0.32 * Math.cos((3 * hm + 6) * R) - 0.2 * Math.cos((4 * hm - 63) * R);
  const SL = 1 + 0.015 * (Lm - 50) * (Lm - 50) / Math.sqrt(20 + (Lm - 50) * (Lm - 50)), SC = 1 + 0.045 * Cmp, SH = 1 + 0.015 * Cmp * T;
  const RT = -2 * Math.sqrt(Math.pow(Cmp, 7) / (Math.pow(Cmp, 7) + Math.pow(25, 7))) * Math.sin(60 * Math.exp(-Math.pow((hm - 275) / 25, 2)) * R);
  return Math.sqrt(Math.pow(dL / SL, 2) + Math.pow(dC / SC, 2) + Math.pow(dH / SH, 2) + RT * (dC / SC) * (dH / SH));
}
// Bewertung 0–10 aus dem Farbabstand: ~1 → 9,8 · 5 → 8,8 · 10 → 7,4 · 20 → 4,7 · 40 → 1,6
export function rating(dE) { return Math.round(1000 * Math.exp(-Math.pow(dE / 25, 1.3))) / 100; }
