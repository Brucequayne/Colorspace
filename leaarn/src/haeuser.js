// ===== haeuser.js · Fertige Häuser für den Map-Editor =====
// Noah baut Häuser im Haus-Editor und exportiert sie als "Leaarn_Haus_<Name>.txt". Claude trägt sie hier ein,
// dann stehen sie im Map-Editor (Werkzeug „Häuser“) als Assets bereit. Format siehe houses.js.
// Häuser aus dem Haus-Editor, die nur im Browser gespeichert sind, erscheinen im Map-Editor als „lokal“
// und werden beim Platzieren mit in die Map geschrieben (Export bleibt vollständig).
import { L2 } from "le/core.js";

const P = [];
// Starterhaus: 4 × 3 m, Holzboden, Putz, Tür nach Süden, zwei Fenster, Satteldach (First Nord–Süd), Schreibtisch mit Laptop + Stuhl
for (let x = 0; x < 4; x++) for (let z = 0; z < 3; z++) P.push(["boden-holz", x, z, 0, 0]);
for (let x = 0; x < 4; x++) { P.push([x === 2 ? "fenster-putz" : "wand-putz", x, 0, 0, 0]); P.push([x === 1 ? "tuer-putz" : x === 3 ? "fenster-putz" : "wand-putz", x, 2, 2, 0]); }
for (let z = 0; z < 3; z++) { P.push(["wand-putz", 0, z, 3, 0]); P.push([z === 1 ? "fenster-putz" : "wand-putz", 3, z, 1, 0]); }
P.push(["boden-platten", 1, 3, 0, 0], ["boden-platten", 2, 3, 0, 0]);
for (let z = 0; z < 3; z++) { P.push(["dach-schiefer", 0, z, 1, 1, 0], ["dach-schiefer", 1, z, 1, 1, 1], ["dach-schiefer", 2, z, 3, 1, 1], ["dach-schiefer", 3, z, 3, 1, 0]); }
[[0, 0, 0], [1, 1, 0], [2, 1, 1], [3, 0, 1]].forEach((g) => { P.push(["giebel-putz", g[0], 0, 0, 1, g[1], g[2]]); P.push(["giebel-putz", g[0], 2, 2, 1, g[1], 1 - g[2]]); });
P.push(["schreibtisch", 2, 0, 0, 0], ["stuhl", 2, 1, 0, 0]);

export const HOUSES = {
  starter: { n: L2("Starterhaus", "Starter house"), d: { v: 1, name: "Starterhaus", parts: P } }
};
// Hausdaten zu einem Map-Eintrag
export function houseDef(e) { if (e.d) return e.d; const h = HOUSES[e.k]; return h ? h.d : { v: 1, name: "?", parts: [] }; }
