// ===== faecher/erdkunde.js · Erdkunde (Klasse 5–10) =====
// Aufbau eines Fachs: siehe faecher/index.js. Themen ohne Aufgaben (geplant: true) erscheinen auf dem Laptop als „bald“.
import { L2 } from "le/core.js";
import { laenderZiehen, laenderWertung } from "le/faecher/laenderraten.js";

export default {
  id: "erdkunde", name: L2("Erdkunde", "Geography"), kurz: "Ek", farbe: "#7FA36E",
  // Spielarten, die für dieses Fach geplant sind (neben Multiple Choice und Eingabe)
  spiele: [{ id: "karte", name: L2("Karten-Quiz (Länder, Hauptstädte)", "Map quiz") }, { id: "klima", name: L2("Klimadiagramme lesen", "Read climate charts") }],
  themen: [
    // Spiel 1 (seit v0.19.5): Länder raten – Deutschland (Bundesländer), ein Kontinent oder die Welt; ersetzt die geplanten Themen „Bundesländer“ und „Europa“
    { id: "laender-raten", name: L2("Länder raten", "Guess the country"), klasse: 5, stufe: "alle", art: "karte", setup: true, anzahl: 10, maxPunkte: 10,
      info: L2("Ein Land auf der Karte leuchtet auf – klick es an und schreib seinen Namen. Deutschland, Kontinente oder die ganze Welt.", "A country lights up on the map – click it and type its name. Germany, a continent or the whole world."),
      erzeugen(R, opt) { return laenderZiehen(R, opt); }, wertung(scores, opt) { return laenderWertung(scores, opt); } },
    { id: "klimazonen", name: L2("Klimazonen", "Climate zones"), klasse: 7, geplant: true },
    { id: "plattentektonik", name: L2("Plattentektonik", "Plate tectonics"), klasse: 8, geplant: true },
    { id: "stadtentwicklung", name: L2("Stadtentwicklung", "Urban development"), klasse: 9, geplant: true },
    { id: "globalisierung", name: L2("Globalisierung", "Globalisation"), klasse: 10, geplant: true }
  ]
};
