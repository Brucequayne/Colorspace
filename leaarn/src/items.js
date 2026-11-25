// ===== items.js · Gegenstände (seit v0.14): Katalog, Symbole, Inventar im Spielstand =====
// Inventar = 36 Plätze: 0–8 Schnellauswahl (Tasten 1–9), 9–35 Rucksack (Taste I). Platz = null oder { id, n }.
// Musik kommt später als CDs (kind: "cd", src: Datei, artist): im Supermarkt kaufen, im Ghettoblaster abspielen.
// Arten (kind, seit v0.16): "kleidung" (Kleiderschrank), "essen" (Kühlschrank), "cd", "buch" – ohne kind = sonstiger Gegenstand.
// Möbel-Lager (seit v0.16): Kleiderschrank, Regal und Kühlschrank haben je 64 Plätze (8 × 8), gespeichert in save.lager[Schlüssel].
import { L2, tl } from "le/core.js";
import { save, persist } from "le/save.js";

const svg = (b) => '<svg viewBox="0 0 32 32" aria-hidden="true">' + b + "</svg>";
export const ITEMS = {
  schluessel: { n: L2("Hausschlüssel", "House key"), d: L2("Der Schlüssel zu deinem Zuhause.", "The key to your home."), max: 1,
    ico: svg('<circle cx="10" cy="16" r="6" fill="none" stroke="#E8C66A" stroke-width="3"/><path d="M16 16h12M24 16v5M28 16v4" stroke="#E8C66A" stroke-width="3" fill="none"/>') },
  // Muster für die kommenden Kleidungsstücke und Lebensmittel (noch nirgends erhältlich, zeigen die Lager-Regeln)
  muetze: { kind: "kleidung", n: L2("Mütze", "Beanie"), d: L2("Kleidungsstück – gehört in den Kleiderschrank.", "Clothing – belongs in the wardrobe."), max: 1,
    ico: svg('<path d="M6 22a10 10 0 0 1 20 0z" fill="#ED6A5E"/><rect x="5" y="21" width="22" height="5" fill="#C6C5B9"/><circle cx="16" cy="9" r="3" fill="#C6C5B9"/>') },
  apfel: { kind: "essen", n: L2("Apfel", "Apple"), d: L2("Lebensmittel – gehört in den Kühlschrank.", "Food – belongs in the fridge."), max: 20,
    ico: svg('<path d="M16 10c-5-3-11 0-10 7 1 6 5 10 10 8 5 2 9-2 10-8 1-7-5-10-10-7z" fill="#C9483C"/><path d="M16 10c0-3 1-5 3-6" stroke="#5E4330" stroke-width="2" fill="none"/><path d="M17 7c2-2 5-2 6 0-2 1-4 1-6 0z" fill="#5D8A4E"/>') }
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

// ---------- Möbel-Lager (seit v0.16) ----------
// art: welche Gegenstände hinein dürfen. kinds = null → alles
export const LAGER_SLOTS = 64;
export const LAGER = {
  kleidung: { kinds: ["kleidung"], n: L2("Kleiderschrank", "Wardrobe"), hint: L2("Hier passen nur Kleidungsstücke hinein.", "Only clothing fits in here."), no: L2("Nur Kleidungsstücke passen in den Kleiderschrank.", "Only clothing fits in the wardrobe.") },
  regal: { kinds: null, n: L2("Regal", "Shelf"), hint: L2("Für CDs, Bücher und andere Gegenstände.", "For CDs, books and other items."), no: L2("Passt nicht ins Regal.", "Doesn't fit on the shelf.") },
  essen: { kinds: ["essen"], n: L2("Kühlschrank", "Fridge"), hint: L2("Hier passen nur Lebensmittel hinein.", "Only food fits in here."), no: L2("Nur Lebensmittel passen in den Kühlschrank.", "Only food fits in the fridge.") }
};
export function lager(key) {
  const S = save(); S.lager = S.lager || {};
  let a = S.lager[key];
  if (!Array.isArray(a) || a.length !== LAGER_SLOTS) { const old = Array.isArray(a) ? a : []; a = []; for (let i = 0; i < LAGER_SLOTS; i++) a.push(old[i] || null); S.lager[key] = a; }
  return a;
}
// darf Gegenstand id in einen Behälter der Art art? (art null = Inventar, dort passt alles)
export function passt(id, art) { const it = ITEMS[id]; if (!it) return false; const L = art && LAGER[art]; return !L || !L.kinds || L.kinds.indexOf(it.kind) >= 0; }
// Ziehen zwischen zwei Behältern ({ a: Array, art }): stapeln, sonst tauschen – nur wenn beide Seiten passen. false = passt nicht
export function moveX(A, ai, B, bi) {
  const s = A.a[ai], d = B.a[bi]; if (!s || (A.a === B.a && ai === bi)) return true;
  if (!passt(s.id, B.art)) return false;
  const mx = (ITEMS[s.id] && ITEMS[s.id].max) || 99;
  if (d && d.id === s.id && d.n < mx) { const k = Math.min(s.n, mx - d.n); d.n += k; s.n -= k; if (!s.n) A.a[ai] = null; }
  else { if (d && !passt(d.id, A.art)) return false; A.a[ai] = d; B.a[bi] = s; }
  persist(); return true;
}
// Umschalt-Klick: ganzer Stapel in den anderen Behälter (erst auf passende Stapel, dann auf freie Plätze). Gibt false zurück, wenn er nicht hineinpasst
export function quickX(A, ai, B, from, to) {
  const s = A.a[ai]; if (!s) return true; if (!passt(s.id, B.art)) return false;
  const mx = (ITEMS[s.id] && ITEMS[s.id].max) || 99, lo = from || 0, hi = to || B.a.length;
  for (let i = lo; i < hi && s.n > 0; i++) { const d = B.a[i]; if (d && d.id === s.id && d.n < mx) { const k = Math.min(s.n, mx - d.n); d.n += k; s.n -= k; } }
  for (let i = lo; i < hi && s.n > 0; i++) if (!B.a[i]) { B.a[i] = { id: s.id, n: s.n }; s.n = 0; }
  if (!s.n) A.a[ai] = null; persist(); return true;
}
