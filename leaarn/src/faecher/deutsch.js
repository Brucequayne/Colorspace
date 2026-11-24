// ===== faecher/deutsch.js · Deutsch (Klasse 5–10) =====
// Aufbau eines Fachs: siehe faecher/index.js. Themen ohne Aufgaben (geplant: true) erscheinen auf dem Laptop als „bald“.
import { L2 } from "le/core.js";

export default {
  id: "deutsch", name: L2("Deutsch", "German"), kurz: "D", farbe: "#E26458",
  // Spielarten, die für dieses Fach geplant sind (neben Multiple Choice und Eingabe)
  spiele: [{ id: "wortarten", name: L2("Wortarten sortieren", "Sort word classes") }, { id: "diktat", name: L2("Hör-Diktat", "Listening dictation") }, { id: "satzbau", name: L2("Satzglieder umstellen", "Rearrange clauses") }],
  themen: [
    { id: "wortarten", name: L2("Wortarten", "Word classes"), klasse: 5, geplant: true },
    { id: "satzglieder", name: L2("Satzglieder", "Clauses"), klasse: 6, geplant: true },
    { id: "kommasetzung", name: L2("Kommasetzung", "Commas"), klasse: 7, geplant: true },
    { id: "eroerterung", name: L2("Erörterung", "Argumentative essay"), klasse: 8, geplant: true },
    { id: "gedichtanalyse", name: L2("Gedichtanalyse", "Poem analysis"), klasse: 9, geplant: true },
    { id: "epochen-der-literatur", name: L2("Epochen der Literatur", "Literary periods"), klasse: 10, geplant: true }
  ]
};
