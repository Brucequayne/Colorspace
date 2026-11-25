// ===== faecher/vokabeln.js · Vokabeltest Englisch (seit v0.15) =====
// Daten: faecher/wortliste.js (2500 Wörter nach Häufigkeit). Hier: Einlesen, Themengebiete, Schwierigkeit, Prüfen, Belohnung.
//
// Regeln (Noah, v0.15):
//   5 Wörter je Durchgang, alle gleichzeitig sichtbar, jedes einzeln bestätigen.
//   Richtiges Wort + richtige Rechtschreibung = 2 Punkte, richtiges Wort mit Tippfehler = 1 Punkt → 10 Punkte je Durchgang.
//   Synonym-Bonus: ein zweites, anderes richtiges Wort mit Komma dahinter = +2 (bzw. +1 mit Tippfehler). Nur, wenn das erste Wort zählt.
//   Belohnung: 0 = 5 € · 1–5 = 25 € · 6–9 = 75 € · 10 = 150 € · über 10 = 250 €. Schwierigkeit mittel +30 %, schwer +60 % (aufgerundet).
// Schwierigkeit = Position in der Häufigkeitsliste: leicht = häufigstes Drittel des gewählten Bereichs, mittel = mittleres, schwer = seltenstes.
import { L2 } from "le/core.js";
import { RAW } from "le/faecher/wortliste.js";
import { shuffle } from "le/faecher/werkzeug.js";

export const KAT = [
  { id: "A", name: L2("Alltag & Zuhause", "Everyday life & home") }, { id: "E", name: L2("Essen & Trinken", "Food & drink") },
  { id: "M", name: L2("Menschen & Familie", "People & family") }, { id: "K", name: L2("Körper & Gesundheit", "Body & health") },
  { id: "S", name: L2("Schule & Arbeit", "School & work") }, { id: "N", name: L2("Natur & Tiere", "Nature & animals") },
  { id: "R", name: L2("Stadt, Reisen & Verkehr", "Town, travel & traffic") }, { id: "T", name: L2("Technik & Medien", "Technology & media") },
  { id: "P", name: L2("Politik & Gesellschaft", "Politics & society") }, { id: "G", name: L2("Wirtschaft & Geld", "Business & money") },
  { id: "F", name: L2("Freizeit, Sport & Kultur", "Free time, sport & culture") }, { id: "Z", name: L2("Zeit & Zahlen", "Time & numbers") },
  { id: "O", name: L2("Gefühle & Charakter", "Feelings & character") }
];
export const WORTARTEN = [
  { id: "n", name: L2("Nomen", "Nouns"), kurz: L2("Nomen", "noun") }, { id: "v", name: L2("Verben", "Verbs"), kurz: L2("Verb", "verb") },
  { id: "a", name: L2("Adjektive", "Adjectives"), kurz: L2("Adjektiv", "adjective") }, { id: "dx", name: L2("Adverbien & kleine Wörter", "Adverbs & small words"), kurz: null }
];
export const ART_KURZ = { n: L2("Nomen", "noun"), v: L2("Verb", "verb"), a: L2("Adjektiv", "adjective"), d: L2("Adverb", "adverb"), x: null };
export const STUFEN = [{ id: 0, name: L2("Leicht", "Easy"), faktor: 1 }, { id: 1, name: L2("Mittel", "Medium"), faktor: 1.3 }, { id: 2, name: L2("Schwer", "Hard"), faktor: 1.6 }];
export const VOK_LOHN = [{ ab: 11, euro: 250 }, { ab: 10, euro: 150 }, { ab: 6, euro: 75 }, { ab: 1, euro: 25 }, { ab: 0, euro: 5 }];

// ---------- Einlesen ----------
// Wort: { r: Rang (1 = häufigstes), en: [[Variante, …], …] (Synonym-Gruppen), de: [Übersetzung, …], k: Thema, p: Wortart }
export const WORTE = RAW.trim().split("\n").map((l, i) => {
  const [e, d, k, p] = l.split("=");
  return { r: i + 1, en: e.split(";").map((g) => g.split("|").map((v) => v.trim())), de: d.split(";").map((v) => v.trim()), k: k, p: p };
});

// Vergleichsform: klein, Umlaute als ae/oe/ue/ss (wer keine Umlaute tippen kann, verliert nichts), Bindestriche und Satzzeichen weg
const UML = { "ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss", "é": "e", "è": "e", "à": "a" };
function base(s) {
  return String(s).toLowerCase().replace(/[äöüßéèà]/g, (c) => UML[c]).replace(/[’`´]/g, "'").replace(/-/g, "").replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim();
}
// Artikel, „to“ und „sich“ am Anfang sind egal (nur wenn danach noch etwas kommt)
const LEAD = { en: /^(to|a|an|the) (?=.)/, de: /^(der|die|das|ein|eine|einen|sich) (?=.)/ };
export function norm(s, lang) { let n = base(s); for (let k = 0; k < 2; k++) n = n.replace(LEAD[lang], ""); return n; }

// alle bekannten Wörter je Sprache (ein Tippfehler zählt nicht, wenn er selbst ein anderes echtes Wort ist, z. B. horse statt house)
const KNOWN = { en: new Set(), de: new Set() };
const BY_DE = new Map();   // deutsche Vergleichsform → Wörter (für Deutsch → Englisch: alle passenden englischen Wörter zählen)
for (const w of WORTE) {
  for (const g of w.en) for (const v of g) KNOWN.en.add(norm(v, "en"));
  for (const v of w.de) { const n = norm(v, "de"); KNOWN.de.add(n); if (!BY_DE.has(n)) BY_DE.set(n, []); BY_DE.get(n).push(w); }
}

// ---------- Bereiche (Themengebiete, Wortarten) ----------
export function bereich(id) {
  if (!id || id === "alle") return WORTE;
  if (id.startsWith("k:")) return WORTE.filter((w) => w.k === id.slice(2));
  if (id === "w:dx") return WORTE.filter((w) => w.p === "d" || w.p === "x");
  if (id.startsWith("w:")) return WORTE.filter((w) => w.p === id.slice(2));
  return WORTE;
}
// Ausschnitt nach Schwierigkeit (Drittel des Bereichs, nach Häufigkeit sortiert)
export function stufenPool(list, lvl) {
  const n = list.length, a = Math.floor(n * lvl / 3), b = Math.floor(n * (lvl + 1) / 3);
  return { list: list.slice(a, b), von: a + 1, bis: b };
}

// ---------- Aufgaben ----------
// Antwort-Gruppen: jede Gruppe = ein eigenes Wort (Synonym), darin Schreibvarianten
function gruppenEN(prompt) {
  const out = [], seen = new Set();
  for (const w of BY_DE.get(norm(prompt, "de")) || []) for (const g of w.en) { const k = norm(g[0], "en"); if (!seen.has(k)) { seen.add(k); out.push(g); } }
  return out;
}
function gruppenDE(w) {
  // männliche und weibliche Form (Lehrer/Lehrerin) zählen als dasselbe Wort
  const out = [];
  for (const v of w.de) {
    const n = norm(v, "de"), g = out.find((x) => x.some((m) => { const o = norm(m, "de"); return o === n || o + "in" === n || n + "in" === o; }));
    if (g) g.push(v); else out.push([v]);
  }
  return out;
}
export function aufgabe(w, richtung) {
  if (richtung === "de") return { art: "vokabel", w: w, frage: w.de[0], p: w.p, lang: "en", gruppen: gruppenEN(w.de[0]) };
  return { art: "vokabel", w: w, frage: w.en[0][0], p: w.p, lang: "de", gruppen: gruppenDE(w) };
}
// Wörter, die auf Deutsch und Englisch gleich sind (Hotel, Hand, Internet …): höchstens eins je Durchgang, sonst gibt es geschenkte Punkte
export function gleich(w) { const p = norm(w.de[0], "de"); return gruppenEN(w.de[0]).some((g) => g.some((v) => norm(v, "en") === p)); }
export function ziehen(R, opt, richtung, anzahl) {
  const pool = stufenPool(bereich(opt.kat), opt.lvl | 0).list, out = [], seen = new Set(), rest = [];
  let gl = 0;
  for (const w of shuffle(pool, R)) {
    if (gleich(w)) { if (gl >= 1) { rest.push(w); continue; } gl++; }
    const a = aufgabe(w, richtung), k = norm(a.frage, richtung === "de" ? "de" : "en");
    if (seen.has(k)) continue; seen.add(k); out.push(a); if (out.length >= anzahl) return out;
  }
  for (const w of rest) { const a = aufgabe(w, richtung), k = norm(a.frage, richtung === "de" ? "de" : "en"); if (!seen.has(k)) { seen.add(k); out.push(a); if (out.length >= anzahl) break; } }
  return out;
}

// ---------- Prüfen ----------
// Tippfehler-Abstand (Damerau-Levenshtein: vertauschte Buchstaben = 1 Fehler)
function dist(a, b) {
  const m = a.length, n = b.length, d = [];
  for (let i = 0; i <= m; i++) { d[i] = [i]; for (let j = 1; j <= n; j++) d[i][j] = i ? 0 : j; }
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
    const c = a[i - 1] === b[j - 1] ? 0 : 1;
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
  }
  return d[m][n];
}
// erlaubte Tippfehler: bis 3 Buchstaben keiner, 4–6 Buchstaben einer, ab 7 Buchstaben zwei
const TOL = (len) => (len <= 3 ? 0 : len <= 6 ? 1 : 2);
// ein Wort gegen die Gruppen prüfen → { g: Gruppe, p: 2 (richtig) | 1 (Tippfehler), v: getroffene Variante } oder null
function treffer(s, gruppen, lang, skip) {
  const n = norm(s, lang); if (!n) return null;
  for (let gi = 0; gi < gruppen.length; gi++) { if (gi === skip) continue; for (const v of gruppen[gi]) if (norm(v, lang) === n) return { g: gi, p: 2, v: v }; }
  if (KNOWN[lang].has(n)) return null;
  let best = null;
  for (let gi = 0; gi < gruppen.length; gi++) {
    if (gi === skip) continue;
    for (const v of gruppen[gi]) { const t = norm(v, lang), d = dist(n, t); if (d > 0 && d <= TOL(t.length) && (!best || d < best.d)) best = { g: gi, p: 1, v: v, d: d }; }
  }
  return best;
}
// Eingabe eines Feldes: erstes Wort = Antwort, zweites (nach Komma, Semikolon oder Schrägstrich) = Synonym-Bonus
export function bewerte(a, eingabe) {
  const teile = String(eingabe).split(/[,;/]+/).map((x) => x.trim()).filter(Boolean).slice(0, 2);
  const haupt = teile[0] ? treffer(teile[0], a.gruppen, a.lang, -1) : null;
  const bonus = haupt && teile[1] ? treffer(teile[1], a.gruppen, a.lang, haupt.g) : null;
  return { haupt: haupt, bonus: bonus, punkte: (haupt ? haupt.p : 0) + (bonus ? bonus.p : 0), teile: teile };
}

// ---------- Belohnung ----------
export function stufeLohn(punkte) { for (const l of VOK_LOHN) if (punkte >= l.ab) return l.euro; return 0; }
export function vokWertung(scores, opt) {
  const summe = scores.reduce((s, x) => s + (x || 0), 0), basis = stufeLohn(summe), st = STUFEN[(opt && opt.lvl) | 0] || STUFEN[0];
  return { summe: summe, basis: basis, faktor: st.faktor, euro: Math.ceil(basis * st.faktor - 1e-9) };
}
