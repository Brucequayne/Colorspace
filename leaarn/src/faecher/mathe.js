// ===== faecher/mathe.js · Mathe (Klasse 5–10) =====
// Aufbau eines Fachs: siehe faecher/index.js. Themen ohne Aufgaben (geplant: true) erscheinen auf dem Laptop als „bald“.
import { L2 } from "le/core.js";
import { shuffle } from "le/faecher/werkzeug.js";

export default {
  id: "mathe", name: L2("Mathe", "Maths"), kurz: "M", farbe: "#ED6A5E",
  // Spielarten, die für dieses Fach geplant sind (neben Multiple Choice und Eingabe)
  spiele: [{ id: "zahlenstrahl", name: L2("Zahlenstrahl", "Number line") }, { id: "rechenrennen", name: L2("Rechen-Rennen (Kopfrechnen auf Zeit)", "Mental maths race") }, { id: "geometrie", name: L2("Geometrie-Baukasten (Winkel, Flächen)", "Geometry kit") }],
  themen: [
    // Test für v0.1: kleines Einmaleins, 10 Aufgaben, Ergebnis eintippen. Keine Aufgabe doppelt, ×1 nur selten.
    {
      id: "einmaleins", name: L2("Kleines 1×1", "Times tables"), klasse: 5, art: "eingabe", anzahl: 10,
      info: L2("Zehn Malaufgaben bis 10 · 10. Ergebnis eintippen, Enter.", "Ten multiplications up to 10 · 10. Type the result, press Enter."),
      erzeugen(R) {
        const all = [];
        for (let a = 1; a <= 10; a++) for (let b = 1; b <= 10; b++) if ((a > 1 && b > 1) || R() < 0.12) all.push([a, b]);
        return shuffle(all, R).slice(0, 10).map((q) => ({ frage: q[0] + " · " + q[1], antwort: q[0] * q[1] }));
      }
    },
    { id: "brueche", name: L2("Brüche", "Fractions"), klasse: 6, geplant: true },
    { id: "prozent", name: L2("Prozentrechnung", "Percentages"), klasse: 7, geplant: true },
    { id: "gleichungen", name: L2("Lineare Gleichungen", "Linear equations"), klasse: 8, geplant: true },
    { id: "pythagoras", name: L2("Satz des Pythagoras", "Pythagorean theorem"), klasse: 9, geplant: true },
    { id: "quadratisch", name: L2("Quadratische Funktionen", "Quadratic functions"), klasse: 10, geplant: true }
  ]
};
