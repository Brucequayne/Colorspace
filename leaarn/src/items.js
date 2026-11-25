// ===== items.js · Gegenstände (seit v0.14): Katalog, Symbole, Inventar im Spielstand =====
// Inventar = 36 Plätze: 0–8 Schnellauswahl (Tasten 1–9), 9–35 Rucksack (Taste I). Platz = null oder { id, n }.
// Musik kommt später als CDs (kind: "cd", src: Datei, artist): im Supermarkt kaufen, im Ghettoblaster abspielen.
import { L2, tl } from "le/core.js";
import { save, persist } from "le/save.js";

const svg = (b) => '<svg viewBox="0 0 32 32" aria-hidden="true">' + b + "</svg>";
export const ITEMS = {
  schluessel: { n: L2("Hausschlüssel", "House key"), d: L2("Der Schlüssel zu deinem Zuhause.", "The key to your home."), max: 1,
    ico: svg('<circle cx="10" cy="16" r="6" fill="none" stroke="#E8C66A" stroke-width="3"/><path d="M16 16h12M24 16v5M28 16v4" stroke="#E8C66A" stroke-width="3" fill="none"/>') }
  // Beispiel für später:
  // cd_beispiel: { kind: "cd", n: L2("Titel", "Title"), artist: "Noah", src: "leaarn/musik/titel.mp3", max: 1, ico: CD_ICO("#ED6A5E") }
};
export const CD_ICO = (c) => svg('<circle cx="16" cy="16" r="12" fill="#C6C5B9"/><circle cx="16" cy="16" r="12" fill="none" stroke="' + c + '" stroke-width="3"/><circle cx="16" cy="16" r="3.5" fill="#1B1C1F"/>');
export const SLOTS = 36, HOT = 9;
export const itemName = (id) => (ITEMS[id] ? tl(ITEMS[id].n) : id);

export function inv() {
  const S = save();
  if (!Array.isArray(S.inv) || S.inv.length !== SLOTS) { const old = Array.isArray(S.inv) ? S.inv : []; S.inv = []; for (let i = 0; i < SLOTS; i++) S.inv.push(old[i] || null); }
  if (!S.invStart) { S.invStart = 1; give("schluessel", 1); }   // Startausstattung (einmal)
  return S.inv;
}
export function give(id, n) {
  const I = save().inv || inv(), it = ITEMS[id]; if (!it) return 0; let left = n || 1;
  for (let i = 0; i < SLOTS && left > 0; i++) { const s = I[i]; if (s && s.id === id && s.n < (it.max || 99)) { const k = Math.min(left, (it.max || 99) - s.n); s.n += k; left -= k; } }
  for (let i = 0; i < SLOTS && left > 0; i++) if (!I[i]) { const k = Math.min(left, it.max || 99); I[i] = { id: id, n: k }; left -= k; }
  persist(); return (n || 1) - left;
}
export function has(kind) { return inv().filter((s) => s && ITEMS[s.id] && ITEMS[s.id].kind === kind); }
// Ziehen und Ablegen: gleicher Gegenstand = stapeln, sonst tauschen
export function move(a, b) {
  const I = inv(); if (a === b || !I[a]) return;
  const A = I[a], B = I[b], mx = (ITEMS[A.id] && ITEMS[A.id].max) || 99;
  if (B && B.id === A.id && B.n < mx) { const k = Math.min(A.n, mx - B.n); B.n += k; A.n -= k; if (!A.n) I[a] = null; }
  else { I[a] = B; I[b] = A; }
  persist();
}
export function sel(i) { const S = save(); if (i != null) { S.sel = i; persist(); } return S.sel || 0; }
