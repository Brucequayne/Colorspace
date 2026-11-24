// ===== faecher/biologie.js · Biologie (Klasse 5–10) =====
// Aufbau eines Fachs: siehe faecher/index.js. Themen ohne Aufgaben (geplant: true) erscheinen auf dem Laptop als „bald“.
import { L2 } from "le/core.js";

export default {
  id: "biologie", name: L2("Biologie", "Biology"), kurz: "Bi", farbe: "#62929E",
  // Spielarten, die für dieses Fach geplant sind (neben Multiple Choice und Eingabe)
  spiele: [{ id: "zelle", name: L2("Zelle beschriften", "Label the cell") }, { id: "nahrungsnetz", name: L2("Nahrungsnetz bauen", "Build a food web") }],
  themen: [
    { id: "wirbeltiere", name: L2("Wirbeltiere", "Vertebrates"), klasse: 5, geplant: true },
    { id: "pflanzen-und-blueten", name: L2("Pflanzen und Blüten", "Plants and flowers"), klasse: 6, geplant: true },
    { id: "oekosystem-wald", name: L2("Ökosystem Wald", "Forest ecosystem"), klasse: 7, geplant: true },
    { id: "zelle", name: L2("Zelle", "The cell"), klasse: 8, geplant: true },
    { id: "genetik", name: L2("Genetik", "Genetics"), klasse: 9, geplant: true },
    { id: "evolution", name: L2("Evolution", "Evolution"), klasse: 10, geplant: true }
  ]
};
