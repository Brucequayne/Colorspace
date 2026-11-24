// ===== faecher/englisch.js · Englisch (Klasse 5–10) =====
// Aufbau eines Fachs: siehe faecher/index.js. Themen ohne Aufgaben (geplant: true) erscheinen auf dem Laptop als „bald“.
import { L2 } from "le/core.js";

export default {
  id: "englisch", name: L2("Englisch", "English"), kurz: "E", farbe: "#DF6256",
  // Spielarten, die für dieses Fach geplant sind (neben Multiple Choice und Eingabe)
  spiele: [{ id: "vokabelsprint", name: L2("Vokabel-Sprint", "Vocabulary sprint") }, { id: "zeitformen", name: L2("Zeitformen-Maschine", "Tense machine") }, { id: "hoeren", name: L2("Hörverstehen", "Listening") }],
  themen: [
    { id: "simple-present", name: L2("Simple Present", "Simple present"), klasse: 5, geplant: true },
    { id: "simple-past", name: L2("Simple Past", "Simple past"), klasse: 6, geplant: true },
    { id: "present-perfect", name: L2("Present Perfect", "Present perfect"), klasse: 7, geplant: true },
    { id: "if-saetze", name: L2("If-Sätze", "Conditionals"), klasse: 8, geplant: true },
    { id: "passiv", name: L2("Passiv", "Passive voice"), klasse: 9, geplant: true },
    { id: "indirekte-rede", name: L2("Indirekte Rede", "Reported speech"), klasse: 10, geplant: true }
  ]
};
