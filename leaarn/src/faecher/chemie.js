// ===== faecher/chemie.js · Chemie (Klasse 5–10) =====
// Aufbau eines Fachs: siehe faecher/index.js. Themen ohne Aufgaben (geplant: true) erscheinen auf dem Laptop als „bald“.
import { L2 } from "le/core.js";
import { pseZiehen, pseWertung, schaleZiehen } from "le/faecher/elemente.js";

export default {
  id: "chemie", name: L2("Chemie", "Chemistry"), kurz: "Ch", farbe: "#5A8B97",
  // Spielarten, die für dieses Fach geplant sind (neben Multiple Choice und Eingabe)
  spiele: [{ id: "periodensystem", name: L2("Periodensystem-Puzzle", "Periodic table puzzle") }, { id: "gleichungen", name: L2("Reaktionsgleichungen ausgleichen", "Balance equations") }],
  themen: [
    { id: "stoffe-und-eigenschaften", name: L2("Stoffe und Eigenschaften", "Substances and properties"), klasse: 7, geplant: true },
    // Spiel 2 (seit v0.19.2): Schalenmodell für 2 Elemente bauen (Kern, Schalen, Elektronen), 5 Teilpunkte je Element, Periodensystem zum Ausklappen
    { id: "schalenmodell", name: L2("Atombau: Schalenmodelle bauen", "Atomic structure: build shell models"), klasse: 8, art: "schale", setup: true, anzahl: 2, maxPunkte: 10,
      info: L2("Baue das Schalenmodell eines Elements: Protonen, Neutronen, Schalen und Elektronen.", "Build an element's shell model: protons, neutrons, shells and electrons."),
      erzeugen(R, opt) { return schaleZiehen(R, opt, 2); }, wertung(scores, opt) { return pseWertung(scores, opt); } },
    { id: "atombau", name: L2("Atombau", "Atomic structure"), klasse: 8, geplant: true },
    // Spiel 1 (seit v0.19.1): Periodensystem erkunden (Elemente anklicken), dann 5 Runden Symbol → Name. Daten und Regeln: faecher/elemente.js
    { id: "periodensystem", name: L2("Periodensystem: Elemente erkennen", "Periodic table: name the element"), klasse: 8, art: "pse", setup: true, anzahl: 5, maxPunkte: 10,
      info: L2("Erst das Periodensystem erkunden, dann 5 Elemente am Symbol erkennen.", "Explore the periodic table first, then name 5 elements from their symbol."),
      erzeugen(R, opt) { return pseZiehen(R, opt, 5); }, wertung(scores, opt) { return pseWertung(scores, opt); } },
    { id: "saeuren-und-basen", name: L2("Säuren und Basen", "Acids and bases"), klasse: 9, geplant: true },
    { id: "organische-chemie", name: L2("Organische Chemie", "Organic chemistry"), klasse: 10, geplant: true }
  ]
};
