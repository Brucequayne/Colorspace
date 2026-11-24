// ===== faecher/wirtschaft.js · Wirtschaft (Klasse 5–10) =====
// Aufbau eines Fachs: siehe faecher/index.js. Themen ohne Aufgaben (geplant: true) erscheinen auf dem Laptop als „bald“.
import { L2 } from "le/core.js";

export default {
  id: "wirtschaft", name: L2("Wirtschaft", "Economics"), kurz: "Wi", farbe: "#B39A62",
  // Spielarten, die für dieses Fach geplant sind (neben Multiple Choice und Eingabe)
  spiele: [{ id: "haushaltsbuch", name: L2("Haushaltsbuch führen", "Keep a budget") }, { id: "markt", name: L2("Angebot und Nachfrage", "Supply and demand") }],
  themen: [
    { id: "taschengeld-und-konsum", name: L2("Taschengeld und Konsum", "Pocket money and consumption"), klasse: 7, geplant: true },
    { id: "markt-und-preis", name: L2("Markt und Preis", "Market and price"), klasse: 8, geplant: true },
    { id: "berufswahl", name: L2("Berufswahl", "Career choice"), klasse: 9, geplant: true },
    { id: "soziale-marktwirtschaft", name: L2("Soziale Marktwirtschaft", "Social market economy"), klasse: 10, geplant: true }
  ]
};
