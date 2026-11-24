// ===== faecher/physik.js · Physik (Klasse 5–10) =====
// Aufbau eines Fachs: siehe faecher/index.js. Themen ohne Aufgaben (geplant: true) erscheinen auf dem Laptop als „bald“.
import { L2 } from "le/core.js";

export default {
  id: "physik", name: L2("Physik", "Physics"), kurz: "Ph", farbe: "#4A6D7C",
  // Spielarten, die für dieses Fach geplant sind (neben Multiple Choice und Eingabe)
  spiele: [{ id: "schaltkreis", name: L2("Schaltkreis-Baukasten", "Circuit kit") }, { id: "einheiten", name: L2("Einheiten umrechnen", "Convert units") }],
  themen: [
    { id: "licht-und-schatten", name: L2("Licht und Schatten", "Light and shadow"), klasse: 6, geplant: true },
    { id: "mechanik-kraefte", name: L2("Mechanik: Kräfte", "Mechanics: forces"), klasse: 7, geplant: true },
    { id: "elektrischer-stromkreis", name: L2("Elektrischer Stromkreis", "Electric circuits"), klasse: 8, geplant: true },
    { id: "energie", name: L2("Energie", "Energy"), klasse: 9, geplant: true },
    { id: "radioaktivitaet", name: L2("Radioaktivität", "Radioactivity"), klasse: 10, geplant: true }
  ]
};
