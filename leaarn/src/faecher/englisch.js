// ===== faecher/englisch.js · Englisch (Klasse 5–10) =====
// Aufbau eines Fachs: siehe faecher/index.js. Themen ohne Aufgaben (geplant: true) erscheinen auf dem Laptop als „bald“.
import { L2 } from "le/core.js";
import { ziehen, vokWertung } from "le/faecher/vokabeln.js";

// Vokabeltest (seit v0.15): 5 Wörter je Durchgang, Themengebiet und Schwierigkeit wählt man vor dem Start (setup).
// Regeln, Punkte und Belohnung: faecher/vokabeln.js, Wörter: faecher/wortliste.js
function vokabeln(richtung, name, info) {
  return {
    id: "vokabeln-" + richtung, name: name, klasse: 5, stufe: "alle", art: "vokabel", richtung: richtung, anzahl: 5, maxPunkte: 10, setup: true, info: info,
    erzeugen(R, opt) { return ziehen(R, opt || { kat: "alle", lvl: 0 }, richtung, 5); },
    wertung(scores, opt) { return vokWertung(scores, opt); }
  };
}

export default {
  id: "englisch", name: L2("Englisch", "English"), kurz: "E", farbe: "#DF6256",
  // Spielarten, die für dieses Fach geplant sind (neben Multiple Choice und Eingabe)
  spiele: [{ id: "vokabelsprint", name: L2("Vokabel-Sprint", "Vocabulary sprint") }, { id: "zeitformen", name: L2("Zeitformen-Maschine", "Tense machine") }, { id: "hoeren", name: L2("Hörverstehen", "Listening") }],
  themen: [
    vokabeln("de", L2("Vokabeln: Deutsch → Englisch", "Vocabulary: German → English"), L2("Du siehst 5 deutsche Wörter und schreibst sie auf Englisch.", "You see 5 German words and write them in English.")),
    vokabeln("en", L2("Vokabeln: Englisch → Deutsch", "Vocabulary: English → German"), L2("Du siehst 5 englische Wörter und schreibst sie auf Deutsch.", "You see 5 English words and write them in German.")),
    { id: "simple-present", name: L2("Simple Present", "Simple present"), klasse: 5, geplant: true },
    { id: "simple-past", name: L2("Simple Past", "Simple past"), klasse: 6, geplant: true },
    { id: "present-perfect", name: L2("Present Perfect", "Present perfect"), klasse: 7, geplant: true },
    { id: "if-saetze", name: L2("If-Sätze", "Conditionals"), klasse: 8, geplant: true },
    { id: "passiv", name: L2("Passiv", "Passive voice"), klasse: 9, geplant: true },
    { id: "indirekte-rede", name: L2("Indirekte Rede", "Reported speech"), klasse: 10, geplant: true }
  ]
};
