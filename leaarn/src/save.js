// ===== save.js · Spielstand: Geld, Zwischenkonto im Laptop, Lernstatistik (Browser-Speicher leaarn-save-v1) =====
// Seit v0.12: Belohnungen aus den Lernspielen landen erst auf dem Zwischenkonto (offen) und kommen beim
// Einsammeln (Knopf im Laptop oder Aufstehen) aufs Spielerkonto (geld).
import { KEYS, store } from "le/core.js";

const DEF = { geld: 0, offen: 0, lern: {}, runden: 0 };
let S = null;
export function save() { if (!S) S = Object.assign({}, DEF, store.get(KEYS.save, {})); return S; }
export function persist() { store.set(KEYS.save, save()); }
export function geld() { return save().geld; }
export function addGeld(n) { const s = save(); s.geld = Math.max(0, Math.round(s.geld + n)); persist(); return s.geld; }
export function offen() { return save().offen || 0; }
export function addOffen(n) { const s = save(); s.offen = Math.max(0, Math.round((s.offen || 0) + n)); persist(); return s.offen; }
// Zwischenkonto aufs Spielerkonto, gibt den Betrag zurück
export function einsammeln() { const s = save(), n = s.offen || 0; if (!n) return 0; s.offen = 0; s.geld = Math.round(s.geld + n); persist(); return n; }
// Ergebnis einer Lernrunde speichern: je Fach/Thema Anzahl Runden, beste Punktzahl, Summe richtig/gesamt
export function addRunde(fach, thema, richtig, gesamt, lohn) {
  const s = save(), k = fach + "/" + thema, o = s.lern[k] || (s.lern[k] = { n: 0, best: 0, ok: 0, all: 0, geld: 0 });
  o.n++; o.best = Math.max(o.best, richtig); o.ok += richtig; o.all += gesamt; o.geld += lohn; s.runden++; persist(); return o;
}
// Charakter (seit v0.13): { name, alter, top, pants, shoes, hair } – fehlt er, startet der Charakter-Editor
export function charakter() { return save().char || null; }
export function setCharakter(c) { save().char = c; persist(); }
// Ganzen Spielstand löschen (Geld, Zwischenkonto, Lernstatistik, Charakter). Maps und Häuser aus den Editoren bleiben.
export function reset() { try { localStorage.removeItem(KEYS.save); } catch (e) {} S = null; }
export function stat(fach, thema) { return save().lern[fach + "/" + thema] || null; }
export const euro = (n) => Math.round(n).toLocaleString("de-DE") + " €";
