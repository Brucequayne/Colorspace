// ===== faecher/index.js · Alle Schulfächer (Klasse 5–10, ohne Sport) und das gemeinsame Aufgabenformat =====
//
// Ein Fach (eigene Datei faecher/<id>.js) exportiert:
//   { id, name: L2(de, en), kurz, farbe, spiele: [geplante Spielarten], themen: [Thema, …] }
// Ein Thema:
//   { id, name: L2(…), klasse: 5–10, art, anzahl: 10, info: L2(…),
//     aufgaben: [Aufgabe, …]      // feste Liste – davon werden "anzahl" zufällig gezogen
//     erzeugen(R) { return [Aufgabe, …]; }   // oder: Aufgaben berechnen (R = Zufall 0…1)
//     geplant: true }             // noch ohne Aufgaben → auf dem Laptop „bald“
// Aufgabenarten (art, je Aufgabe überschreibbar mit aufgabe.art):
//   "eingabe"    { frage, antwort }                       Zahl oder Text eintippen (antwort darf eine Liste erlaubter Antworten sein)
//   "mc"         { frage, optionen: [ … ], richtig: 0 }   Multiple Choice, richtig = Index der richtigen Option
//   "wahrfalsch" { frage, richtig: true/false }           Aussage stimmt / stimmt nicht
//   "farbe"      Farb-Spiel aus kunst.js (Farbe auf Farbe ziehen), richtig = Index der richtigen Option
//   "vokabel"    Vokabeltest aus vokabeln.js (5 Wörter gleichzeitig, Punkte 0–2 je Wort + Synonym-Bonus), Thema mit setup: true
//                (vor dem Start Themengebiet und Schwierigkeit wählen, opt = { kat, lvl } geht an erzeugen(R, opt) und wertung(scores, opt))
// Stufe in der Themenliste: klasse 5–6 = Basics, 7–8 = Fortgeschritten, 9–10 = Experte; stufe: "alle" = für alle Stufen (Schwierigkeit im Spiel)
// Eigene Belohnung je Thema: lohn: [{ ab: 5, euro: 100 }, { ab: 1, euro: 25 }, { ab: 0, euro: 5 }] (ab = mindestens so viele richtig)
// Geplant: "zuordnen" (Paare), "lueckentext", "reihenfolge" und je Fach eigene Spiele (siehe spiele in den Fach-Dateien).
// Noah liefert Themen als Text (Fach, Klasse, Inhalt) – Claude macht daraus Aufgaben in diesem Format.
import mathe from "le/faecher/mathe.js";
import deutsch from "le/faecher/deutsch.js";
import englisch from "le/faecher/englisch.js";
import fremdsprache from "le/faecher/fremdsprache.js";
import biologie from "le/faecher/biologie.js";
import chemie from "le/faecher/chemie.js";
import physik from "le/faecher/physik.js";
import geschichte from "le/faecher/geschichte.js";
import erdkunde from "le/faecher/erdkunde.js";
import politik from "le/faecher/politik.js";
import wirtschaft from "le/faecher/wirtschaft.js";
import religion from "le/faecher/religion.js";
import kunst from "le/faecher/kunst.js";
import musik from "le/faecher/musik.js";
import informatik from "le/faecher/informatik.js";
import { shuffle } from "le/faecher/werkzeug.js";

export const FAECHER = [mathe, deutsch, englisch, fremdsprache, biologie, chemie, physik, geschichte, erdkunde, politik, wirtschaft, religion, kunst, musik, informatik];
export const fach = (id) => FAECHER.find((f) => f.id === id) || null;
export const spielbar = (th) => !th.geplant && (typeof th.erzeugen === "function" || (th.aufgaben && th.aufgaben.length > 0));
export const fachAktiv = (f) => f.themen.some(spielbar);

export const STANDARD_LOHN = [{ ab: 10, euro: 150 }, { ab: 5, euro: 75 }, { ab: 1, euro: 25 }, { ab: 0, euro: 5 }];
// Belohnung je Runde (Standard, 10 Aufgaben): 10 richtig = 150 €, 5–9 = 75 €, 1–4 = 25 €, 0 = 5 €. Themen mit lohn: eigene Stufen
export function belohnung(richtig, gesamt, th) {
  if (th && th.lohn) { for (const l of th.lohn) if (richtig >= l.ab) return l.euro; return 0; }
  const q = gesamt ? richtig / gesamt : 0;
  if (richtig >= gesamt && gesamt > 0) return 150;
  if (q >= 0.5) return 75;
  if (richtig >= 1) return 25;
  return 5;
}
// Aufgaben einer Runde
export function runde(th, R, opt) {
  const n = th.anzahl || 10;
  const list = typeof th.erzeugen === "function" ? th.erzeugen(R, opt) : shuffle(th.aufgaben || [], R).slice(0, n);
  return list.slice(0, n).map((a) => Object.assign({ art: th.art || "eingabe" }, a));
}
// Antwort prüfen (Text: ohne Groß/Klein, Leerzeichen; Zahlen: Komma oder Punkt)
export function pruefe(a, eingabe) {
  if (a.art === "mc" || a.art === "farbe") return eingabe === a.richtig;
  if (a.art === "wahrfalsch") return eingabe === a.richtig;
  const norm = (v) => String(v).trim().toLowerCase().replace(/\s+/g, " ").replace(",", ".");
  const ok = [].concat(a.antwort).map(norm), e = norm(eingabe);
  if (e === "") return false;
  return ok.some((o) => o === e || (!isNaN(+o) && !isNaN(+e) && Math.abs(+o - +e) < 1e-9));
}
