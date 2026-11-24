// ===== faecher/informatik.js · Informatik (Klasse 5–10) =====
// Aufbau eines Fachs: siehe faecher/index.js. Themen ohne Aufgaben (geplant: true) erscheinen auf dem Laptop als „bald“.
import { L2 } from "le/core.js";

export default {
  id: "informatik", name: L2("Informatik", "Computer science"), kurz: "If", farbe: "#7FC8D4",
  // Spielarten, die für dieses Fach geplant sind (neben Multiple Choice und Eingabe)
  spiele: [{ id: "blockcode", name: L2("Block-Code-Puzzle", "Block code puzzle") }, { id: "binaer", name: L2("Binärzahlen-Schalter", "Binary switches") }],
  themen: [
    { id: "daten-und-codierung", name: L2("Daten und Codierung", "Data and encoding"), klasse: 5, geplant: true },
    { id: "algorithmen", name: L2("Algorithmen", "Algorithms"), klasse: 7, geplant: true },
    { id: "binaerzahlen", name: L2("Binärzahlen", "Binary numbers"), klasse: 8, geplant: true },
    { id: "programmieren", name: L2("Programmieren", "Programming"), klasse: 9, geplant: true },
    { id: "netzwerke-und-datenschutz", name: L2("Netzwerke und Datenschutz", "Networks and privacy"), klasse: 10, geplant: true }
  ]
};
