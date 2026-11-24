// ===== faecher/politik.js · Politik (Klasse 5–10) =====
// Aufbau eines Fachs: siehe faecher/index.js. Themen ohne Aufgaben (geplant: true) erscheinen auf dem Laptop als „bald“.
import { L2 } from "le/core.js";

export default {
  id: "politik", name: L2("Politik", "Politics"), kurz: "Po", farbe: "#8E918F",
  // Spielarten, die für dieses Fach geplant sind (neben Multiple Choice und Eingabe)
  spiele: [{ id: "gesetzgebung", name: L2("Weg eines Gesetzes", "Path of a law") }, { id: "begriffe", name: L2("Begriffe zuordnen", "Match the terms") }],
  themen: [
    { id: "kinderrechte", name: L2("Kinderrechte", "Children's rights"), klasse: 7, geplant: true },
    { id: "demokratie-und-wahlen", name: L2("Demokratie und Wahlen", "Democracy and elections"), klasse: 8, geplant: true },
    { id: "grundgesetz", name: L2("Grundgesetz", "Basic Law"), klasse: 9, geplant: true },
    { id: "europaeische-union", name: L2("Europäische Union", "European Union"), klasse: 10, geplant: true }
  ]
};
