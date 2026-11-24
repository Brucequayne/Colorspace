// ===== faecher/kunst.js · Kunst (Klasse 5–10) =====
// Aufbau eines Fachs: siehe faecher/index.js. Themen ohne Aufgaben (geplant: true) erscheinen auf dem Laptop als „bald“.
import { L2 } from "le/core.js";

export default {
  id: "kunst", name: L2("Kunst", "Art"), kurz: "Ku", farbe: "#E8A04A",
  // Spielarten, die für dieses Fach geplant sind (neben Multiple Choice und Eingabe)
  spiele: [{ id: "farbkreis", name: L2("Farbkreis mischen", "Colour wheel mixing") }, { id: "epochen", name: L2("Bilder Epochen zuordnen", "Match paintings to periods") }],
  themen: [
    { id: "farbenlehre", name: L2("Farbenlehre", "Colour theory"), klasse: 5, geplant: true },
    { id: "perspektive", name: L2("Perspektive", "Perspective"), klasse: 7, geplant: true },
    { id: "kunstepochen", name: L2("Kunstepochen", "Art periods"), klasse: 9, geplant: true }
  ]
};
