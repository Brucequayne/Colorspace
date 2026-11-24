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
