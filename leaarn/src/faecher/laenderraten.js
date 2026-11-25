// ===== faecher/laenderraten.js · Erdkunde-Spiel „Länder raten“ (seit v0.19.5) =====
// Karte wählen (Deutschland, ein Kontinent oder die Welt), 10 Runden: ein Land pulsiert, anklicken, Namen ins Fenster schreiben.
// Richtig = 1 Punkt, kleiner Tippfehler = ½ Punkt. Belohnung wie die anderen 10-Punkte-Spiele (0 = 5 €, 1–5 = 25 €, 6–9 = 75 €, 10 = 150 €).
// Kartendaten: faecher/karte_*.js (aus Natural Earth erzeugt, werden erst beim Spielen geladen), Namen und Schwierigkeits-Gruppen: faecher/laender.js
import { L2 } from "le/core.js";
import { shuffle } from "le/faecher/werkzeug.js";
import { LAND, BUNDESLAND, GRUPPEN } from "le/faecher/laender.js";
import { PSE_LOHN } from "le/faecher/elemente.js";

// stufen: false = keine Schwierigkeits-Auswahl (zu wenige Länder für drei getrennte Stufen)
export const KARTEN = [
  { id: "deutschland", name: L2("Deutschland", "Germany"), was: L2("Bundesländer", "states"), stufen: false },
  { id: "europa", name: L2("Europa", "Europe"), was: L2("Länder", "countries"), stufen: true },
  { id: "afrika", name: L2("Afrika", "Africa"), was: L2("Länder", "countries"), stufen: true },
  { id: "asien", name: L2("Asien", "Asia"), was: L2("Länder", "countries"), stufen: true },
  { id: "nordamerika", name: L2("Nord- und Mittelamerika", "North and Central America"), was: L2("Länder", "countries"), stufen: true },
  { id: "suedamerika", name: L2("Südamerika", "South America"), was: L2("Länder", "countries"), stufen: false },
  { id: "ozeanien", name: L2("Ozeanien", "Oceania"), was: L2("Länder", "countries"), stufen: false },
  { id: "welt", name: L2("Weltkarte", "World map"), was: L2("Länder", "countries"), stufen: true }
];
export const STUFEN_KARTE = [
  { id: 0, name: L2("Leicht", "Easy"), faktor: 1, info: L2("bekannte, große Länder", "well-known, large countries") },
  { id: 1, name: L2("Mittel", "Medium"), faktor: 1.3, info: L2("vor allem mittlere Länder, dazu ein paar bekannte", "mostly medium countries plus a few well-known ones") },
  { id: 2, name: L2("Schwer", "Hard"), faktor: 1.6, info: L2("vor allem kleine und unbekanntere Länder", "mostly small and lesser-known countries") }
];
export const karte = (id) => KARTEN.find((k) => k.id === id) || KARTEN[0];
export const ladeKarte = (id) => import("le/faecher/karte_" + id + ".js").then((m) => m.default);
// Name eines Landes / Bundeslandes in der aktuellen Sprache (lang "de" | "en")
export function landName(id, lang) { const x = LAND[id] || BUNDESLAND[id]; return x ? (lang === "en" ? x[1] : x[0]) : id; }
export function anzahl(id) { return id === "deutschland" ? 16 : GRUPPEN[id].reduce((s, g) => s + g.length, 0); }

// Auswahl der 10 Länder: Leicht = Gruppe 1; Mittel = 7 aus Gruppe 2, Rest aus Gruppe 1; Schwer = 6 aus Gruppe 3, Rest aus Gruppe 2 (dann 1).
// Karten ohne Stufen: alle Länder gemischt.
export function laenderZiehen(R, opt) {
  const k = karte(opt && opt.karte), lvl = k.stufen ? (opt.lvl | 0) : -1, n = 10;
  if (k.id === "deutschland") return shuffle(Object.keys(BUNDESLAND), R).slice(0, n).map((id) => ({ art: "karte", id: id }));
  const G = GRUPPEN[k.id].map((g) => shuffle(g, R)); let out = [];
  const take = (g, m) => { for (const id of g) { if (out.length >= m) break; if (!out.includes(id)) out.push(id); } };
  if (lvl < 0) take(shuffle([].concat(G[0], G[1], G[2]), R), n);
  else if (lvl === 0) { take(G[0], n); take(G[1], n); }
  else if (lvl === 1) { take(G[1], Math.min(7, G[1].length)); take(G[0], n); take(G[2], n); }
  else { take(G[2], Math.min(6, G[2].length)); take(G[1], n); take(G[0], n); }
  return shuffle(out, R).slice(0, n).map((id) => ({ art: "karte", id: id }));
}

// ---------- Prüfen ----------
const UML = { "ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss" }, UML2 = { "ä": "a", "ö": "o", "ü": "u", "ß": "ss" };
const norm = (s, m) => String(s).toLowerCase().replace(/[äöüß]/g, (c) => m[c]).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/^(the|die|der|das)\s+/, "").replace(/[^a-z]/g, "");
const formen = (x) => { const a = [x[0], x[1]].concat(x[2] ? x[2].split("|") : []); const s = new Set(); a.forEach((n) => { s.add(norm(n, UML)); s.add(norm(n, UML2)); }); return s; };
const FORM = {}; Object.keys(LAND).forEach((id) => { FORM[id] = formen(LAND[id]); }); Object.keys(BUNDESLAND).forEach((id) => { FORM[id] = formen(BUNDESLAND[id]); });
function dist(a, b) {
  const m = a.length, n = b.length, d = [];
  for (let i = 0; i <= m; i++) { d[i] = [i]; for (let j = 1; j <= n; j++) d[i][j] = i ? 0 : j; }
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
  }
  return d[m][n];
}
// 2 = richtig, 1 = kleiner Tippfehler (bis 6 Buchstaben einer, ab 7 zwei; kurze Namen/Kürzel nur exakt; nie, wenn die Eingabe genau ein anderes Land ist), 0 = falsch
export function landBewerte(id, eingabe) {
  const e1 = norm(eingabe, UML), e2 = norm(eingabe, UML2); if (!e1) return 0;
  const F = FORM[id]; if (!F) return 0;
  if (F.has(e1) || F.has(e2)) return 2;
  for (const k in FORM) if (k !== id && (FORM[k].has(e1) || FORM[k].has(e2))) return 0;
  for (const t of F) { const tol = t.length <= 4 ? 0 : t.length <= 6 ? 1 : 2; if (tol && Math.min(dist(e1, t), dist(e2, t)) <= tol) return 1; }
  return 0;
}
export function laenderWertung(scores, opt) {
  const summe = scores.reduce((s, x) => s + (x || 0), 0), k = karte(opt && opt.karte), st = k.stufen ? STUFEN_KARTE[(opt && opt.lvl) | 0] || STUFEN_KARTE[0] : STUFEN_KARTE[0];
  let basis = 5; for (const l of PSE_LOHN) if (summe >= l.ab) { basis = l.euro; break; }
  return { summe: summe, basis: basis, faktor: st.faktor, euro: Math.ceil(basis * st.faktor - 1e-9) };
}
