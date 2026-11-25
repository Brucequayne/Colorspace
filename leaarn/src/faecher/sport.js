// ===== faecher/sport.js · Sport (Klasse 5–10, seit v0.20.1) =====
// Aufbau eines Fachs: siehe faecher/index.js. Themen ohne Aufgaben (geplant: true) erscheinen auf dem Laptop als „bald“.
import { L2 } from "le/core.js";

export default {
  id: "sport", name: L2("Sport", "Sports"), kurz: "Sp", farbe: "#4A6D7C",
  spiele: [],
  themen: [
    { id: "regeln-und-sportarten", name: L2("Regeln und Sportarten", "Rules and sports"), klasse: 5, geplant: true },
    { id: "koerper-und-training", name: L2("Körper und Training", "Body and training"), klasse: 7, geplant: true },
    { id: "ernaehrung-und-gesundheit", name: L2("Ernährung und Gesundheit", "Nutrition and health"), klasse: 9, geplant: true }
  ]
};
