// ===== faecher/erdkunde.js · Erdkunde (Klasse 5–10) =====
// Aufbau eines Fachs: siehe faecher/index.js. Themen ohne Aufgaben (geplant: true) erscheinen auf dem Laptop als „bald“.
import { L2 } from "le/core.js";

export default {
  id: "erdkunde", name: L2("Erdkunde", "Geography"), kurz: "Ek", farbe: "#7FA36E",
  // Spielarten, die für dieses Fach geplant sind (neben Multiple Choice und Eingabe)
  spiele: [{ id: "karte", name: L2("Karten-Quiz (Länder, Hauptstädte)", "Map quiz") }, { id: "klima", name: L2("Klimadiagramme lesen", "Read climate charts") }],
  themen: [
    { id: "deutschland-bundeslaender", name: L2("Deutschland: Bundesländer", "Germany: states"), klasse: 5, geplant: true },
    { id: "europa", name: L2("Europa", "Europe"), klasse: 6, geplant: true },
    { id: "klimazonen", name: L2("Klimazonen", "Climate zones"), klasse: 7, geplant: true },
    { id: "plattentektonik", name: L2("Plattentektonik", "Plate tectonics"), klasse: 8, geplant: true },
    { id: "stadtentwicklung", name: L2("Stadtentwicklung", "Urban development"), klasse: 9, geplant: true },
    { id: "globalisierung", name: L2("Globalisierung", "Globalisation"), klasse: 10, geplant: true }
  ]
};
