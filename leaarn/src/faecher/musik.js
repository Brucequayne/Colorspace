// ===== faecher/musik.js · Musik (Klasse 5–10) =====
// Aufbau eines Fachs: siehe faecher/index.js. Themen ohne Aufgaben (geplant: true) erscheinen auf dem Laptop als „bald“.
import { L2 } from "le/core.js";

export default {
  id: "musik", name: L2("Musik", "Music"), kurz: "Mu", farbe: "#D4B34A",
  // Spielarten, die für dieses Fach geplant sind (neben Multiple Choice und Eingabe)
  spiele: [{ id: "noten", name: L2("Noten lesen", "Read notes") }, { id: "rhythmus", name: L2("Rhythmus-Spiel", "Rhythm game") }, { id: "gehoer", name: L2("Intervalle hören", "Hear intervals") }],
  themen: [
    { id: "notenwerte", name: L2("Notenwerte", "Note values"), klasse: 5, geplant: true },
    { id: "instrumente", name: L2("Instrumente", "Instruments"), klasse: 6, geplant: true },
    { id: "tonleitern", name: L2("Tonleitern", "Scales"), klasse: 8, geplant: true },
    { id: "musikgeschichte", name: L2("Musikgeschichte", "Music history"), klasse: 10, geplant: true }
  ]
};
