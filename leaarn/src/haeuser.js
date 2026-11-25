// ===== haeuser.js · Fertige Häuser für den Map-Editor =====
// Noah baut Häuser im Haus-Editor und exportiert sie als "Leaarn_Haus_<Name>.txt". Claude trägt sie hier ein,
// dann stehen sie im Map-Editor (Werkzeug „Häuser“) als Assets bereit. Format siehe houses.js.
// Häuser aus dem Haus-Editor, die nur im Browser gespeichert sind, erscheinen im Map-Editor als „lokal“
// und werden beim Platzieren mit in die Map geschrieben (Export bleibt vollständig).
import { L2 } from "le/core.js";
import { gardenParts } from "le/houses.js";

// Starterhaus (seit v0.18 Noahs Version aus dem Haus-Editor, Leaarn_Haus_Starterhaus.txt): 4 × 3 m, Holzboden, Putz, Tür nach Süden,
// drei Fenster, Satteldach, Schreibtisch mit Laptop + Stuhl, Regal, Bett, Teppich, Stehlampe. Grundstück 10 × 9 m mit Hecke rundherum
// (automatisch wie im Haus-Editor, Eingang vor der Tür frei).
const STARTER_PARTS = [["boden-holz",0,0,0,0],["boden-holz",0,1,0,0],["boden-holz",0,2,0,0],["boden-holz",1,0,0,0],["boden-holz",1,1,0,0],["boden-holz",1,2,0,0],["boden-holz",2,0,0,0],["boden-holz",2,1,0,0],["boden-holz",2,2,0,0],["boden-holz",3,0,0,0],["boden-holz",3,1,0,0],["boden-holz",3,2,0,0],["wand-putz",0,0,0,0],["wand-putz",0,2,2,0],["wand-putz",1,0,0,0],["tuer-putz",1,2,2,0],["fenster-putz",2,0,0,0],["wand-putz",2,2,2,0],["wand-putz",3,0,0,0],["fenster-putz",3,2,2,0],["wand-putz",0,0,3,0],["wand-putz",3,0,1,0],["wand-putz",0,1,3,0],["fenster-putz",3,1,1,0],["wand-putz",0,2,3,0],["wand-putz",3,2,1,0],["boden-platten",1,3,0,0],["boden-platten",2,3,0,0],["dach-schiefer",0,0,1,1,0],["dach-schiefer",1,0,1,1,1],["dach-schiefer",2,0,3,1,1],["dach-schiefer",3,0,3,1,0],["dach-schiefer",0,1,1,1,0],["dach-schiefer",1,1,1,1,1],["dach-schiefer",2,1,3,1,1],["dach-schiefer",3,1,3,1,0],["dach-schiefer",0,2,1,1,0],["dach-schiefer",1,2,1,1,1],["dach-schiefer",2,2,3,1,1],["dach-schiefer",3,2,3,1,0],["giebel-putz",0,0,0,1,0,0],["giebel-putz",0,2,2,1,0,1],["giebel-putz",1,0,0,1,1,0],["giebel-putz",1,2,2,1,1,1],["giebel-putz",2,0,0,1,1,1],["giebel-putz",2,2,2,1,1,0],["giebel-putz",3,0,0,1,0,1],["giebel-putz",3,2,2,1,0,0],["schreibtisch",2,0,0,0],["stuhl",2,1,0,0],["regal",3,0,0,0],["bett",0,1,0,0],["teppich",1,1,0,0],["lampe",1,0,0,0]];
const STARTER_PLOT = [[-2,-2],[-2,-1],[-2,0],[-2,1],[-2,2],[-2,3],[-2,4],[-1,-2],[-1,-1],[-1,0],[-1,1],[-1,2],[-1,3],[-1,4],[0,-2],[0,0],[0,1],[0,2],[0,3],[0,4],[1,-2],[1,-1],[1,0],[1,1],[1,2],[1,3],[1,4],[2,-2],[2,-1],[2,0],[2,1],[2,2],[2,3],[2,4],[3,-2],[3,-1],[3,0],[3,2],[3,3],[3,4],[4,-2],[4,-1],[4,0],[4,1],[4,3],[4,4],[5,-2],[5,-1],[5,0],[5,1],[5,2],[5,3],[5,4],[-3,-3],[-3,-2],[-3,-1],[-3,0],[-3,1],[-3,2],[-3,3],[-3,4],[-3,5],[-2,-3],[-2,5],[-1,-3],[-1,5],[0,-3],[0,5],[1,-3],[1,5],[2,-3],[2,5],[3,-3],[3,5],[4,-3],[4,5],[5,-3],[5,5],[6,-3],[6,-2],[6,-1],[6,0],[6,1],[6,2],[6,3],[6,4],[6,5],[4,2]];
const STARTER = gardenParts({ parts: STARTER_PARTS, plot: STARTER_PLOT }, "hecke");

// Supermarkt (seit v0.19.9): 12 × 8 m, ein Stockwerk, Fliesenboden, Flachdach. Vorne (Süden) Schaufenster mit gestreiften Markisen,
// links Eingang und rechts Ausgang als Automatik-Schiebetüren. Innen: Obst- und Gemüseregale an der linken Wand, Gefriertruhen und
// Warenregale an der Rückwand, zwei Regal-Inseln (Rücken an Rücken), zwei Kassen mit Laufband vor dem Ausgang.
// Vor dem Laden ein gepflasterter Vorplatz mit Einkaufswagen. Regale, Truhen und Obststände sind Shop-Objekte (E: einkaufen).
function supermarkt() {
  const P = [], W = 12, D = 8;
  for (let x = 0; x < W; x++) for (let z = 0; z < D; z++) { P.push(["boden-fliese", x, z, 0, 0]); P.push(["dach-flach", x, z, 0, 1]); }
  for (let x = 0; x < W; x++) { P.push(["wand-putz", x, 0, 0, 0]); P.push(["boden-platten", x, D, 0, 0]); P.push(["boden-platten", x, D + 1, 0, 0]); }
  for (let z = 0; z < D; z++) { P.push(["wand-putz", 0, z, 3, 0]); P.push(["wand-putz", W - 1, z, 1, 0]); }
  // Front: Eingang x = 2, Ausgang x = 10, sonst Schaufenster (Ecken Wand)
  const front = ["wand-putz", "schaufenster-markt", "tuer-schiebe", "schaufenster-markt", "schaufenster-markt", "schaufenster-markt", "schaufenster-markt", "schaufenster-markt", "schaufenster-markt", "schaufenster-markt", "tuer-schiebe", "wand-putz"];
  front.forEach((id, x) => { P.push([id, x, D - 1, 2, 0]); if (id === "schaufenster-markt") P.push(["markise-streifen", x, D, 0, 0, 0, 0]); });
  // Obst und Gemüse an der linken Wand (Vorderseite nach innen)
  [1, 3, 5].forEach((z) => P.push(["obstregal", 0, z, 3, 0]));
  // Rückwand: Gefriertruhen und Warenregale
  [2, 4].forEach((x) => P.push(["kuehltruhe", x, 0, 0, 0])); [7, 9].forEach((x) => P.push(["warenregal", x, 0, 0, 0]));
  // Regal-Inseln: je zwei Regale Rücken an Rücken
  [3, 5, 8, 10].forEach((x) => { P.push(["warenregal", x, 2, 2, 0]); P.push(["warenregal", x, 3, 0, 0]); });
  // Kassen (Laufband längs, Kassierer-Seite nach rechts), Gänge zum Ausgang
  [7, 9].forEach((x) => P.push(["kasse", x, 5, 1, 0]));
  P.push(["pflanze", 11, 7, 0, 0]);
  // Vorplatz: Einkaufswagen neben dem Eingang, Pflanzen
  P.push(["einkaufswagen", 0, 8, 1, 0]); P.push(["einkaufswagen", 0, 9, 1, 0]); P.push(["pflanze", 11, 9, 0, 0]);
  const plot = []; for (let x = -1; x <= W; x++) for (let z = -1; z <= D + 2; z++) plot.push([x, z]);
  return { v: 1, name: "Supermarkt", parts: P, plot: plot };
}

export const HOUSES = {
  starter: { n: L2("Starterhaus", "Starter house"), d: { v: 1, name: "Starterhaus", parts: STARTER.parts, plot: STARTER.plot } },
  supermarkt: { n: L2("Supermarkt", "Supermarket"), d: supermarkt() }
};
// Hausdaten zu einem Map-Eintrag
export function houseDef(e) { if (e.d) return e.d; const h = HOUSES[e.k]; return h ? h.d : { v: 1, name: "?", parts: [] }; }
