// ===== faecher/geschichte.js · Geschichte (Klasse 5–10) =====
// Aufbau eines Fachs: siehe faecher/index.js. Themen ohne Aufgaben (geplant: true) erscheinen auf dem Laptop als „bald“.
import { L2 } from "le/core.js";

export default {
  id: "geschichte", name: L2("Geschichte", "History"), kurz: "G", farbe: "#C6C5B9",
  // Spielarten, die für dieses Fach geplant sind (neben Multiple Choice und Eingabe)
  spiele: [{ id: "zeitleiste", name: L2("Zeitleiste sortieren", "Sort the timeline") }, { id: "quellen", name: L2("Quellen zuordnen", "Match the sources") }],
  themen: [
    { id: "steinzeit", name: L2("Steinzeit", "Stone Age"), klasse: 5, geplant: true },
    { id: "antikes-rom", name: L2("Antikes Rom", "Ancient Rome"), klasse: 6, geplant: true },
    { id: "mittelalter", name: L2("Mittelalter", "Middle Ages"), klasse: 7, geplant: true },
    { id: "franzoesische-revolution", name: L2("Französische Revolution", "French Revolution"), klasse: 8, geplant: true },
    { id: "erster-weltkrieg-und-weimar", name: L2("Erster Weltkrieg und Weimar", "WW1 and Weimar"), klasse: 9, geplant: true },
    { id: "nationalsozialismus-und-nachkriegszeit", name: L2("Nationalsozialismus und Nachkriegszeit", "Nazi era and post-war"), klasse: 10, geplant: true }
  ]
};
