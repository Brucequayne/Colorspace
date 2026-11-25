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

export const HOUSES = {
  starter: { n: L2("Starterhaus", "Starter house"), d: { v: 1, name: "Starterhaus", parts: STARTER.parts, plot: STARTER.plot } }
};
// Hausdaten zu einem Map-Eintrag
export function houseDef(e) { if (e.d) return e.d; const h = HOUSES[e.k]; return h ? h.d : { v: 1, name: "?", parts: [] }; }
