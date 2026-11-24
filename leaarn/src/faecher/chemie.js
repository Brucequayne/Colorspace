// ===== faecher/chemie.js · Chemie (Klasse 5–10) =====
// Aufbau eines Fachs: siehe faecher/index.js. Themen ohne Aufgaben (geplant: true) erscheinen auf dem Laptop als „bald“.
import { L2 } from "le/core.js";

export default {
  id: "chemie", name: L2("Chemie", "Chemistry"), kurz: "Ch", farbe: "#5A8B97",
  // Spielarten, die für dieses Fach geplant sind (neben Multiple Choice und Eingabe)
  spiele: [{ id: "periodensystem", name: L2("Periodensystem-Puzzle", "Periodic table puzzle") }, { id: "gleichungen", name: L2("Reaktionsgleichungen ausgleichen", "Balance equations") }],
  themen: [
    { id: "stoffe-und-eigenschaften", name: L2("Stoffe und Eigenschaften", "Substances and properties"), klasse: 7, geplant: true },
    { id: "atombau", name: L2("Atombau", "Atomic structure"), klasse: 8, geplant: true },
    { id: "periodensystem", name: L2("Periodensystem", "Periodic table"), klasse: 8, geplant: true },
    { id: "saeuren-und-basen", name: L2("Säuren und Basen", "Acids and bases"), klasse: 9, geplant: true },
    { id: "organische-chemie", name: L2("Organische Chemie", "Organic chemistry"), klasse: 10, geplant: true }
  ]
};
