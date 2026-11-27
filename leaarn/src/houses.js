// ===== houses.js · Haus-Bauteile, Hausbau aus Bauteilen, Kollision, Türen, Interaktionen =====
// Ein Haus ist eine Liste von Bauteilen auf einem Raster (1 Zelle = 1 m, eine Etage = 2,8 m):
//   { v: 1, name: "Starterhaus", parts: [[id, x, z, r, etage, stufe, spiegeln], …] }
// Zellen-Teile (Boden, Dach, Möbel) liegen in Zelle (x, z), r = Drehung in 90°-Schritten.
// Kanten-Teile (Wände, Fenster, Türen, Giebel) liegen auf einer Kante der Zelle: r 0 = Norden (z klein), 1 = Osten, 2 = Süden, 3 = Westen.
// stufe: Höhe von Dachschrägen und Giebeln (je Stufe eine Zelle Steigung: 1 m bei 45°, 0,41 m bei 22,5°). spiegeln: Giebel steigt in die andere Richtung, 2 = Giebelspitze (seit v0.21.1).
// farbe (seit v0.21.1, Index 7 bei Wänden): [Seite außen entlang der Kanten-Normale, andere Seite], je null oder [Farbe, Stil] – Stil siehe WSTIL
// Etage: Teile auf Etage 1 liegen auf den Wänden der Etage 0 (Decke/Dach). Wer im Haus steht, sieht alles darüber nicht.
import * as THREE from "three";
import { L2, tl, hash2 } from "le/core.js";
import { part as part0, merge, M } from "le/models.js";
import { puppeParts } from "le/kleidung.js";
// Haus-Teile einfarbig (ohne Farbrauschen je Dreieck), damit Wände und Böden sauber wirken (seit v0.14)
function part(geo, color, m, jit, seed) {
  const g = part0(geo, color, m, jit, seed), c = new THREE.Color(color), a = g.attributes.color;
  for (let i = 0; i < a.count; i++) a.setXYZ(i, c.r, c.g, c.b);
  return g;
}

export const CELL = 1, LH = 2.8, FLOOR = 0.12, WT = 0.14;   // Zelle, Etagenhöhe, Bodendicke, Wanddicke
const R22 = Math.tan(Math.PI / 8);   // Steigung je Zelle bei 22,5° (seit v0.21.1)

// Farben (Palette: Stein, Petrol, Stahlblau, Koralle, Schiefer + Holz/Ziegel)
const COL = { putz: "#D9D6CC", ziegel: "#A9533F", holz: "#8A6142", holzd: "#5E4330", rahmen: "#ECEAE4", glas: "#7FB4C4", schiefer: "#475657", terra: "#B4583F",
  boden: "#9C7552", fliese: "#C6C5B9", beton: "#8E918F", teppich: "#4A6D7C", platten: "#A3A49C", metall: "#5A5F63", dunkel: "#2B2E30", stoff: "#62929E", koralle: "#ED6A5E", weiss: "#F2F0EA", gruen: "#5D8A4E",
  hecke: "#4E7A3E", eis: "#BFE3EC", stahl: "#A9AEB1", kiste: "#9C7552" };

// Bauteil-Katalog. kind: floor (Zelle), wall (Kante), roof (Zelle, Stufe), gable (Kante, Stufe), obj (Zelle, Drehung), deco (Kante, Anbau an der Wand wie eine Markise; Platz neben der Wand, ersetzt sie nicht)
// box: Kollision [Breite, Tiefe] in m (lokal, vor der Drehung), act: Interaktion
// sit (seit v0.16): Sitzplätze [x, z, Blickrichtung x, Blickrichtung z, Sitzhöhe] lokal um die Zellmitte (Taste E)
// lager (seit v0.16): Möbel mit Inventar (8 × 8), Art siehe LAGER in items.js
// fence / hedge (seit v0.17): Zaun und Hecke auf Zellkanten (Grundstücksgrenze), laden (seit v0.17): Supermarkt-Regal, Art siehe LADEN in shop.js
export const PARTS = {
  // Böden
  "boden-holz": { kind: "floor", cat: "floor", n: L2("Holzboden", "Wooden floor"), c: COL.boden, plank: true },
  "boden-fliese": { kind: "floor", cat: "floor", n: L2("Fliesen", "Tiles"), c: COL.fliese, tile: true },
  "boden-beton": { kind: "floor", cat: "floor", n: L2("Beton", "Concrete"), c: COL.beton },
  "boden-teppich": { kind: "floor", cat: "floor", n: L2("Teppichboden", "Carpet"), c: COL.teppich },
  "boden-platten": { kind: "floor", cat: "floor", n: L2("Steinplatten (Terrasse)", "Paving (terrace)"), c: COL.platten, tile: true },
  "pool": { kind: "floor", cat: "floor", n: L2("Pool (1 m tief)", "Pool (1 m deep)"), c: "#3FA7C9", pool: true },   // seit v0.21.1: Zellen nebeneinander werden ein Becken
  // Wände (Putz, Ziegel, Holz) mit Fenster und Tür
  "wand-putz": { kind: "wall", cat: "wall", n: L2("Wand Putz", "Wall plaster"), c: COL.putz },
  "fenster-putz": { kind: "wall", cat: "wall", n: L2("Fenster Putz", "Window plaster"), c: COL.putz, win: true },
  "tuer-putz": { kind: "wall", cat: "wall", n: L2("Tür Putz", "Door plaster"), c: COL.putz, door: true },
  "wand-ziegel": { kind: "wall", cat: "wall", n: L2("Wand Ziegel", "Wall brick"), c: COL.ziegel, brick: true },
  "fenster-ziegel": { kind: "wall", cat: "wall", n: L2("Fenster Ziegel", "Window brick"), c: COL.ziegel, brick: true, win: true },
  "tuer-ziegel": { kind: "wall", cat: "wall", n: L2("Tür Ziegel", "Door brick"), c: COL.ziegel, brick: true, door: true },
  "wand-holz": { kind: "wall", cat: "wall", n: L2("Wand Holz", "Wall wood"), c: COL.holz, plank: true },
  "fenster-holz": { kind: "wall", cat: "wall", n: L2("Fenster Holz", "Window wood"), c: COL.holz, plank: true, win: true },
  "tuer-holz": { kind: "wall", cat: "wall", n: L2("Tür Holz", "Door wood"), c: COL.holz, plank: true, door: true },
  "gelaender": { kind: "wall", cat: "wall", n: L2("Geländer", "Railing"), c: COL.holzd, rail: true },
  // seit v0.21.1: Wand in 1/4 Höhe (0,7 m, z. B. Brüstung, Theke, Schaufenster-Podest) und Säulen (stehen in der Zellmitte, reichen bis zur Decke)
  "wand-viertel-putz": { kind: "wall", cat: "wall", n: L2("Wand 1/4 Höhe Putz", "Wall 1/4 height plaster"), c: COL.putz, quarter: true },
  "wand-viertel-ziegel": { kind: "wall", cat: "wall", n: L2("Wand 1/4 Höhe Ziegel", "Wall 1/4 height brick"), c: COL.ziegel, quarter: true, brick: true },
  "wand-viertel-holz": { kind: "wall", cat: "wall", n: L2("Wand 1/4 Höhe Holz", "Wall 1/4 height wood"), c: COL.holz, quarter: true, plank: true },
  "saeule-rund": { kind: "obj", cat: "wall", n: L2("Säule rund (klassisch)", "Column round (classic)"), c: COL.weiss, box: [0.4, 0.4], col: 1 },
  "saeule-eckig": { kind: "obj", cat: "wall", n: L2("Säule eckig (Putz)", "Column square (plaster)"), c: COL.putz, box: [0.38, 0.38], col: 2 },
  "saeule-holz": { kind: "obj", cat: "wall", n: L2("Holzpfosten", "Wooden post"), c: COL.holz, box: [0.22, 0.22], col: 3 },
  // Dach
  "dach-flach": { kind: "roof", cat: "roof", n: L2("Flachdach / Decke", "Flat roof / ceiling"), c: COL.beton, flat: true },
  "dach-schiefer": { kind: "roof", cat: "roof", n: L2("Dachschräge Schiefer 45°", "Roof slope slate 45°"), c: COL.schiefer },
  "dach-rot": { kind: "roof", cat: "roof", n: L2("Dachschräge Ziegelrot 45°", "Roof slope red 45°"), c: COL.terra },
  // seit v0.21.1: flache Neigung 22,5° (je Zelle 0,41 m) und Firststück (Dachspitze in der Zellmitte, für ungerade Hausbreiten; R dreht den First)
  "dach-schiefer-22": { kind: "roof", cat: "roof", n: L2("Dachschräge Schiefer 22,5°", "Roof slope slate 22.5°"), c: COL.schiefer, rise: R22 },
  "dach-rot-22": { kind: "roof", cat: "roof", n: L2("Dachschräge Ziegelrot 22,5°", "Roof slope red 22.5°"), c: COL.terra, rise: R22 },
  "first-schiefer": { kind: "roof", cat: "roof", n: L2("Dachspitze Schiefer 45°", "Ridge slate 45°"), c: COL.schiefer, ridge: true },
  "first-rot": { kind: "roof", cat: "roof", n: L2("Dachspitze Ziegelrot 45°", "Ridge red 45°"), c: COL.terra, ridge: true },
  "first-schiefer-22": { kind: "roof", cat: "roof", n: L2("Dachspitze Schiefer 22,5°", "Ridge slate 22.5°"), c: COL.schiefer, ridge: true, rise: R22 },
  "first-rot-22": { kind: "roof", cat: "roof", n: L2("Dachspitze Ziegelrot 22,5°", "Ridge red 22.5°"), c: COL.terra, ridge: true, rise: R22 },
  "giebel-putz": { kind: "gable", cat: "roof", n: L2("Giebel Putz 45°", "Gable plaster 45°"), c: COL.putz },
  "giebel-ziegel": { kind: "gable", cat: "roof", n: L2("Giebel Ziegel 45°", "Gable brick 45°"), c: COL.ziegel },
  "giebel-holz": { kind: "gable", cat: "roof", n: L2("Giebel Holz 45°", "Gable wood 45°"), c: COL.holz },
  "giebel-putz-22": { kind: "gable", cat: "roof", n: L2("Giebel Putz 22,5°", "Gable plaster 22.5°"), c: COL.putz, rise: R22 },
  "giebel-ziegel-22": { kind: "gable", cat: "roof", n: L2("Giebel Ziegel 22,5°", "Gable brick 22.5°"), c: COL.ziegel, rise: R22 },
  "giebel-holz-22": { kind: "gable", cat: "roof", n: L2("Giebel Holz 22,5°", "Gable wood 22.5°"), c: COL.holz, rise: R22 },
  // Möbel
  "schreibtisch": { kind: "obj", cat: "obj", n: L2("Schreibtisch mit Laptop (Lernen)", "Desk with laptop (learning)"), box: [1.2, 0.62], act: "lernen" },
  "stuhl": { kind: "obj", cat: "obj", n: L2("Stuhl", "Chair"), box: null, sit: [[0, 0.02, 0, -1, 0.49]] },
  "bett": { kind: "obj", cat: "obj", n: L2("Bett", "Bed"), box: [0.95, 2.0], sit: [[0.28, 0.35, 1, 0, 0.5]] },
  "regal": { kind: "obj", cat: "obj", n: L2("Regal (Lager, E)", "Shelf (storage, E)"), box: [0.9, 0.35], act: "lager", lager: "regal" },
  "schrank": { kind: "obj", cat: "obj", n: L2("Kleiderschrank (Lager, E)", "Wardrobe (storage, E)"), box: [0.95, 0.55], act: "lager", lager: "kleidung" },
  "sofa": { kind: "obj", cat: "obj", n: L2("Sofa", "Sofa"), box: [1.8, 0.85], sit: [[-0.42, 0.06, 0, 1, 0.52], [0.42, 0.06, 0, 1, 0.52]] },
  "tisch": { kind: "obj", cat: "obj", n: L2("Tisch", "Table"), box: [1.2, 0.8] },
  "kuehlschrank": { kind: "obj", cat: "obj", n: L2("Kühlschrank (Lager, E)", "Fridge (storage, E)"), box: [0.6, 0.6], act: "lager", lager: "essen" },
  "lampe": { kind: "obj", cat: "obj", n: L2("Stehlampe", "Floor lamp"), box: null },
  "pflanze": { kind: "obj", cat: "obj", n: L2("Zimmerpflanze", "House plant"), box: null },
  "teppich": { kind: "obj", cat: "obj", n: L2("Teppich", "Rug"), box: null },
  "ghettoblaster": { kind: "obj", cat: "obj", n: L2("Ghettoblaster (Musik, E)", "Boombox (music, E)"), box: [0.66, 0.26], act: "musik" },
  // Garten (seit v0.17): Grundstücksgrenze, auf Zellkanten wie Wände
  "zaun": { kind: "wall", cat: "garden", n: L2("Holzzaun", "Wooden fence"), c: COL.holz, fence: true },
  "hecke": { kind: "wall", cat: "garden", n: L2("Hecke", "Hedge"), c: COL.hecke, hedge: true },
  // Schaufenster (seit v0.19.7): Wandteile mit großer Glasfläche, drei Varianten
  "schaufenster-markt": { kind: "wall", cat: "wall", n: L2("Schaufenster Supermarkt", "Shop window supermarket"), c: COL.stahl, shopwin: 1 },
  "schaufenster-boutique": { kind: "wall", cat: "wall", n: L2("Schaufenster Boutique", "Shop window boutique"), c: COL.schiefer, shopwin: 2 },
  "schaufenster-laden": { kind: "wall", cat: "wall", n: L2("Schaufenster Laden", "Shop window store"), c: COL.fliese, shopwin: 3 },
  "schaufenster-glas": { kind: "wall", cat: "wall", n: L2("Schaufenster Ganzglas (schlicht)", "Shop window full glass (plain)"), c: COL.putz, shopwin: 4 },   // seit v0.21.1, Wandteile färbbar
  // Automatik-Schiebetür (seit v0.19.7): zwei Glasflügel, öffnet nach beiden Seiten, sobald der Spieler vor der Tür steht
  "tuer-schiebe": { kind: "wall", cat: "wall", n: L2("Automatik-Schiebetür (Supermarkt)", "Automatic sliding door (supermarket)"), c: COL.stahl, door: true, auto: true },
  // Objekte (seit v0.19.7): Markisen hängen an der Hauswand (Kante, wie Wände; ragen in die angeklickte Zelle), dazu Supermarkt-Ausstattung
  "markise-streifen": { kind: "deco", cat: "objekte", n: L2("Markise gestreift (Koralle/Weiß)", "Awning striped (coral/white)"), c: COL.koralle, awn: 1 },
  "markise-blau": { kind: "deco", cat: "objekte", n: L2("Markise Stahlblau mit Seitenteilen", "Awning steel blue with side panels"), c: "#4A6D7C", awn: 2 },
  "markise-kassette": { kind: "deco", cat: "objekte", n: L2("Kassettenmarkise (Stein/Schiefer)", "Cassette awning (stone/slate)"), c: COL.fliese, awn: 3 },
  "einkaufswagen": { kind: "obj", cat: "objekte", n: L2("Einkaufswagen (gestapelt)", "Shopping carts (nested)"), c: COL.stahl, box: [0.5, 1.15] },
  "kasse": { kind: "obj", cat: "objekte", n: L2("Kasse mit Laufband", "Checkout with conveyor belt"), c: "#4A6D7C", box: [1.8, 0.9] },
  // Supermarkt (seit v0.17): Regale, an denen man später Waren kauft (E); seit v0.19.7 in der Kategorie Objekte
  "kuehltruhe": { kind: "obj", cat: "objekte", n: L2("Gefriertruhe (Einkaufen, E)", "Chest freezer (shop, E)"), c: COL.eis, box: [1.8, 0.85], act: "laden", laden: "tiefkuehl" },
  "obstregal": { kind: "obj", cat: "objekte", n: L2("Obst- und Gemüseregal (Einkaufen, E)", "Fruit & veg stand (shop, E)"), c: "#C9483C", box: [1.8, 0.9], act: "laden", laden: "obst" },
  "warenregal": { kind: "obj", cat: "objekte", n: L2("Supermarktregal (Einkaufen, E)", "Supermarket shelf (shop, E)"), c: COL.stahl, box: [1.8, 0.6], act: "laden", laden: "allg" },
  // Klamottenladen (seit v0.21): Regale und Ständer verkaufen Kleidung (shop.js, Ware aus kleidung.js), Puppen und Kabine sind Deko
  "kleiderstaender": { kind: "obj", cat: "objekte", n: L2("Kleiderstange mit Pullis (Einkaufen, E)", "Clothes rail with jumpers (shop, E)"), c: "#E07B39", box: [1.8, 0.6], act: "laden", laden: "kl-pulli" },
  "rundstaender": { kind: "obj", cat: "objekte", n: L2("Runder Ständer mit Mänteln (Einkaufen, E)", "Round rack with coats (shop, E)"), c: "#6B6E3E", box: [1.1, 1.1], act: "laden", laden: "kl-mantel" },
  "kleiderregal": { kind: "obj", cat: "objekte", n: L2("Hosenregal (Einkaufen, E)", "Trouser shelf (shop, E)"), c: "#3F5F86", box: [1.8, 0.5], act: "laden", laden: "kl-hose" },
  "schuhregal": { kind: "obj", cat: "objekte", n: L2("Schuhregal (Einkaufen, E)", "Shoe shelf (shop, E)"), c: "#6B4A2E", box: [1.4, 0.45], act: "laden", laden: "kl-schuhe" },
  "accessoires": { kind: "obj", cat: "objekte", n: L2("Mützen- und Schaltisch (Einkaufen, E)", "Hat & scarf table (shop, E)"), c: "#E8C66A", box: [1.0, 0.8], act: "laden", laden: "kl-acc" },
  "puppe-winter": { kind: "obj", cat: "objekte", n: L2("Schaufensterpuppe Winter", "Mannequin winter"), c: "#C9B48A", box: [0.6, 0.6] },
  "puppe-street": { kind: "obj", cat: "objekte", n: L2("Schaufensterpuppe Streetwear", "Mannequin streetwear"), c: "#2B2E30", box: [0.6, 0.6] },
  "puppe-sommer": { kind: "obj", cat: "objekte", n: L2("Schaufensterpuppe Sommer", "Mannequin summer"), c: "#8DB3CF", box: [0.6, 0.6] },
  "umkleide": { kind: "obj", cat: "objekte", n: L2("Umkleidekabine", "Changing cubicle"), c: "#62929E", box: [1.0, 1.0] },
  "standspiegel": { kind: "obj", cat: "objekte", n: L2("Standspiegel", "Standing mirror"), c: "#BFE3EC", box: [0.6, 0.3] }
};
export const CATS = [["floor", L2("Böden", "Floors")], ["wall", L2("Wände", "Walls")], ["roof", L2("Dach", "Roof")], ["obj", L2("Möbel", "Furniture")], ["garden", L2("Garten", "Garden")], ["objekte", L2("Objekte", "Objects")]];
export const partName = (id) => (PARTS[id] ? tl(PARTS[id].n) : id);

// Kante als Strecke: Startpunkt a, Richtung u, Normale n (nach außen aus der Zelle)
const EDGE = [
  { a: [0, 0], u: [1, 0], n: [0, -1] },
  { a: [1, 0], u: [0, 1], n: [1, 0] },
  { a: [1, 1], u: [-1, 0], n: [0, 1] },
  { a: [0, 1], u: [0, -1], n: [-1, 0] }
];
export function edgeOf(x, z, r) { const e = EDGE[r & 3]; return { ax: x + e.a[0], az: z + e.a[1], ux: e.u[0], uz: e.u[1], nx: e.n[0], nz: e.n[1] }; }
// Schlüssel einer Kante unabhängig von der Seite (Süd von (x,z) = Nord von (x,z+1))
export function edgeKey(x, z, r, l) { r &= 3; if (r === 2) { z += 1; r = 0; } else if (r === 1) { x += 1; r = 3; } return x + "," + z + "," + r + "," + l; }
export function cellKey(x, z, l) { return x + "," + z + "," + l; }

// ---------- Geometrie eines Bauteils (lokal: Zelle (x,z) ab Ecke, Etage l) ----------
// Matrix für ein Kasten-Stück auf einer Kante: entlang u von u0 bis u1, Höhe y0 bis y1, Dicke d, Versatz o entlang n
function edgeBox(E, u0, u1, y0, y1, d, o) {
  const cx = E.ax + E.ux * (u0 + u1) / 2 + E.nx * (o || 0), cz = E.az + E.uz * (u0 + u1) / 2 + E.nz * (o || 0);
  const ang = Math.atan2(-E.uz, E.ux);   // Kasten liegt entlang x, dann um y gedreht
  return { g: new THREE.BoxGeometry(u1 - u0, y1 - y0, d), m: M(cx, (y0 + y1) / 2, cz, 1, 1, 1, ang) };
}
function bx(list, E, u0, u1, y0, y1, d, col, o, seed) { const b = edgeBox(E, u0, u1, y0, y1, d, o); list.push(part(b.g, col, b.m, 0, seed)); }
function shade(c, k) { const x = new THREE.Color(c); x.multiplyScalar(k); return "#" + x.getHexString(); }

// Wandfarben (seit v0.21.1): Stile je Wandseite
export const WSTIL = [L2("Einfarbig", "Plain"), L2("Weißer Absatz unten", "White dado below"), L2("Zweifarbig dezent", "Subtle two-tone"), L2("Dunkler Sockel", "Dark plinth")];
// Farbschicht auf einer Wandseite: dünne Platte vor dem Wandstück, nach Stil in Bänder geteilt. Reicht an den Wandenden über den Eckpfosten.
function paintOver(out, E, u0, u1, ya, yb, y0, paint, seed) {
  const t = WT, a = t / 2, b = 1 - t / 2, e0 = u0 <= a + 1e-4 ? -t / 2 - 0.012 : u0, e1 = u1 >= b - 1e-4 ? 1 + t / 2 + 0.012 : u1;
  [0, 1].forEach((si) => {
    const P = paint[si]; if (!P) return; const col = P[0], st = P[1] | 0, o = (si ? -1 : 1) * (t / 2 + 0.006);
    const box = (ua, ub, q0, q1, cc, dd) => bx(out, E, ua, ub, q0, q1, dd, cc, o + (si ? -1 : 1) * (dd - 0.012) / 2, seed + 90 + si);
    // Mitte in voller Stärke, Verlängerung über den Eckpfosten etwas flacher → keine flimmernden Überlappungen mit der Nachbarwand
    const band = (lo, hi, cc, d) => { const q0 = Math.max(ya, y0 + lo), q1 = Math.min(yb, y0 + hi), dd = d || 0.012; if (q1 - q0 <= 0.002) return; box(u0, u1, q0, q1, cc, dd); if (e0 < u0) box(e0, u0, q0, q1, cc, dd - 0.003); if (e1 > u1) box(u1, e1, q0, q1, cc, dd - 0.006); };   // verschiedene Tiefen: zwei Verlängerungen auf demselben Pfosten flimmern nicht
    if (st === 1) { band(-1, 0.95, "#F2F0EA"); band(0.95, 0.99, "#E4E0D6", 0.026); band(0.99, 99, col); }
    else if (st === 2) { band(-1, 1.0, shade(col, 0.86)); band(1.0, 1.025, shade(col, 0.72), 0.02); band(1.025, 99, col); }
    else if (st === 3) { band(-1, 0.35, shade(col, 0.55)); band(0.35, 99, col); }
    else band(-1, 99, col);
  });
}
// Wand mit Fenster/Tür/Geländer. Wandstücke laufen von t/2 bis 1 - t/2, die Ecken füllen Pfosten.
function wallParts(def, E, y0, seed, out, paint) {
  const t = WT, H = def.quarter ? LH / 4 : LH, a = t / 2, b = 1 - t / 2, c = def.c;
  // Wandstück mit Farbschicht (seit v0.21.1)
  const W = (u0, u1, ya, yb, sd) => { bx(out, E, u0, u1, ya, yb, t, c, 0, sd); if (paint) paintOver(out, E, u0, u1, ya, yb, y0, paint, sd); };
  if (def.fence) {   // Holzzaun: zwei Pfosten, zwei Querlatten, senkrechte Latten (1 m hoch)
    bx(out, E, 0, 0.09, y0, y0 + 1.05, 0.09, shade(c, 0.85), 0, seed); bx(out, E, 0.91, 1, y0, y0 + 1.05, 0.09, shade(c, 0.85), 0, seed + 1);
    bx(out, E, 0, 1, y0 + 0.28, y0 + 0.34, 0.04, shade(c, 0.78), -0.035, seed + 2); bx(out, E, 0, 1, y0 + 0.72, y0 + 0.78, 0.04, shade(c, 0.78), -0.035, seed + 3);
    for (let k = 0; k < 7; k++) { const u = 0.12 + k * 0.127; bx(out, E, u, u + 0.08, y0 + 0.04, y0 + 0.92 + (k & 1 ? 0.03 : 0), 0.02, c, 0.01, seed + 4 + k); }
    return;
  }
  if (def.hedge) {   // Hecke: dichter Block mit unregelmäßiger Oberkante, zwei Grüntöne
    bx(out, E, -0.03, 1.03, y0, y0 + 1.15, 0.55, c, 0, seed);
    for (let k = 0; k < 3; k++) { const u = k / 3, hh = 1.15 + 0.06 + hash2(seed, k, 3) * 0.1; bx(out, E, u + 0.02, u + 0.31, y0 + 1.0, y0 + hh, 0.46 + hash2(k, seed, 5) * 0.06, shade(c, 1.06 + hash2(seed, k, 9) * 0.1), 0, seed + 1 + k); }
    bx(out, E, 0.1, 0.9, y0 + 0.35, y0 + 0.75, 0.58, shade(c, 0.9), 0, seed + 5);
    return;
  }
  if (def.rail) {   // seit v0.21.1: Handlauf über die ganze Kante, an den Enden Pfosten (buildHouse) → Geländer schließen bündig an
    bx(out, E, 0, 1, y0 + 0.92, y0 + 1.0, 0.07, c, 0, seed);
    for (let k = 0; k < 4; k++) { const u = a + 0.08 + k * (b - a - 0.16) / 3; bx(out, E, u - 0.025, u + 0.025, y0, y0 + 0.92, 0.05, c, 0, seed + k); }
    return;
  }
  if (def.auto) {   // Automatik-Schiebetür (seit v0.19.7): feste Teile; die zwei Glasflügel baut buildHouse (beweglich)
    const d0 = 0.1, d1 = 0.9, top = 2.2;
    W(a, d0, y0, y0 + H, seed); W(d1, b, y0, y0 + H, seed + 1); W(d0, d1, y0 + top, y0 + H, seed + 2);
    bx(out, E, d0, d0 + 0.04, y0, y0 + top, t + 0.03, COL.stahl, 0, seed + 3); bx(out, E, d1 - 0.04, d1, y0, y0 + top, t + 0.03, COL.stahl, 0, seed + 4);
    bx(out, E, -0.3, 1.3, y0 + top - 0.14, y0 + top, 0.26, COL.stahl, 0, seed + 5);   // Laufschiene über der Tür, ragt zu beiden Seiten, damit die offenen Flügel darunter laufen
    bx(out, E, 0.44, 0.56, y0 + top + 0.02, y0 + top + 0.1, 0.1, COL.dunkel, 0, seed + 6);   // Bewegungsmelder
    return;
  }
  if (def.shopwin) {   // Schaufenster (seit v0.19.7)
    const kind = def.shopwin, sc = shade(c, 0.8), hh = (k) => hash2(k, seed, 11);
    const glass = (u0, u1, ya, yb) => { bx(out, E, u0, u1, y0 + ya, y0 + yb, 0.02, COL.glas, 0, seed + 30); out[out.length - 1].userData.glass = true; };
    const stick = (u0, u1, ya, yb, col) => { bx(out, E, u0, u1, y0 + ya, y0 + yb, 0.004, col, 0.013, seed + 40); bx(out, E, u0, u1, y0 + ya, y0 + yb, 0.004, col, -0.013, seed + 41); };
    const cx = E.ax + E.ux * 0.5, cz = E.az + E.uz * 0.5, cyl = (r0, r1, h, yc, col, n) => out.push(part(new THREE.CylinderGeometry(r0, r1, h, n || 6), col, M(cx, y0 + yc, cz, 1), 0, seed + 50));
    if (kind === 4) {   // Ganzglas (seit v0.21.1): dunkler Sockel, schmaler Rahmen, Wand oben und an den Seiten färbbar
      W(a, 0.05, y0, y0 + H, seed); W(0.95, b, y0, y0 + H, seed + 1); W(0.05, 0.95, y0 + 2.42, y0 + H, seed + 2);
      bx(out, E, 0.05, 0.95, y0, y0 + 0.3, t, COL.dunkel, 0, seed + 3); glass(0.08, 0.92, 0.33, 2.39);
      bx(out, E, 0.05, 0.95, y0 + 0.3, y0 + 0.33, t + 0.02, COL.dunkel, 0, seed + 4); bx(out, E, 0.05, 0.95, y0 + 2.39, y0 + 2.42, t + 0.02, COL.dunkel, 0, seed + 5);
      bx(out, E, 0.05, 0.08, y0 + 0.33, y0 + 2.39, t + 0.02, COL.dunkel, 0, seed + 6); bx(out, E, 0.92, 0.95, y0 + 0.33, y0 + 2.39, t + 0.02, COL.dunkel, 0, seed + 7);
    } else if (kind === 1) {   // Supermarkt: Sockel, große Scheibe mit Aluminiumrahmen, Angebots-Folien, Schild oben
      bx(out, E, a, 0.05, y0, y0 + H, t, c, 0, seed); bx(out, E, 0.95, b, y0, y0 + H, t, c, 0, seed + 1);
      bx(out, E, 0.05, 0.95, y0, y0 + 0.4, t, COL.schiefer, 0, seed + 2); bx(out, E, 0.05, 0.95, y0 + 2.3, y0 + H, t, COL.schiefer, 0, seed + 3);
      glass(0.07, 0.93, 0.45, 2.25);
      bx(out, E, 0.05, 0.95, y0 + 0.4, y0 + 0.45, t + 0.02, COL.stahl, 0, seed + 4); bx(out, E, 0.05, 0.95, y0 + 2.25, y0 + 2.3, t + 0.02, COL.stahl, 0, seed + 5);
      bx(out, E, 0.05, 0.07, y0 + 0.45, y0 + 2.25, t + 0.02, COL.stahl, 0, seed + 6); bx(out, E, 0.93, 0.95, y0 + 0.45, y0 + 2.25, t + 0.02, COL.stahl, 0, seed + 7); bx(out, E, 0.485, 0.515, y0 + 0.45, y0 + 2.25, t + 0.02, COL.stahl, 0, seed + 8);
      bx(out, E, 0.08, 0.92, y0 + 2.38, y0 + 2.72, t + 0.04, COL.koralle, 0, seed + 9); bx(out, E, 0.08, 0.92, y0 + 2.5, y0 + 2.6, t + 0.05, COL.weiss, 0, seed + 10);
      stick(0.1, 0.45, 1.0, 1.32, COL.weiss); stick(0.55, 0.9, 0.62, 0.95, COL.koralle); stick(0.55, 0.9, 1.5, 1.72, COL.weiss); stick(0.12, 0.3, 1.55, 1.8, COL.koralle);
    } else if (kind === 2) {   // Boutique: dunkler Sockel, schlanker Rahmen, Podest mit Schaufensterpuppe und Geschenkboxen
      bx(out, E, a, 0.06, y0, y0 + H, t, c, 0, seed); bx(out, E, 0.94, b, y0, y0 + H, t, c, 0, seed + 1);
      bx(out, E, 0.06, 0.94, y0, y0 + 0.5, t, c, 0, seed + 2); bx(out, E, 0.06, 0.94, y0 + 2.3, y0 + H, t, c, 0, seed + 3);
      bx(out, E, 0.06, 0.94, y0 + 0.5, y0 + 0.54, t + 0.03, COL.fliese, 0, seed + 4); bx(out, E, 0.06, 0.94, y0 + 2.3, y0 + 2.34, t + 0.03, COL.fliese, 0, seed + 5);
      glass(0.08, 0.92, 0.54, 2.3);
      bx(out, E, 0.06, 0.08, y0 + 0.54, y0 + 2.3, t + 0.02, COL.dunkel, 0, seed + 6); bx(out, E, 0.92, 0.94, y0 + 0.54, y0 + 2.3, t + 0.02, COL.dunkel, 0, seed + 7);
      bx(out, E, 0.2, 0.8, y0 + 0.54, y0 + 0.62, 0.38, COL.fliese, 0, seed + 8);   // Podest
      cyl(0.05, 0.15, 0.55, 0.62 + 0.275, COL.koralle, 8); cyl(0.12, 0.06, 0.34, 1.17 + 0.17, shade(COL.koralle, 0.88), 8); cyl(0.03, 0.03, 0.1, 1.56, COL.fliese, 6); cyl(0.06, 0.05, 0.14, 1.68, COL.fliese, 6);
      bx(out, E, 0.22, 0.34, y0 + 0.62, y0 + 0.8, 0.14, COL.stoff, 0, seed + 11); bx(out, E, 0.68, 0.78, y0 + 0.62, y0 + 0.74, 0.12, COL.teppich, 0, seed + 12); bx(out, E, 0.7, 0.76, y0 + 0.74, y0 + 0.78, 0.13, COL.koralle, 0, seed + 13);
    } else {   // Laden: Holz-/Farbsockel, Sprossen, Regalbrett mit Waren, bunt gestreifter Fries
      bx(out, E, a, 0.05, y0, y0 + H, t, c, 0, seed); bx(out, E, 0.95, b, y0, y0 + H, t, c, 0, seed + 1);
      bx(out, E, 0.05, 0.95, y0, y0 + 0.85, t, COL.stoff, 0, seed + 2); bx(out, E, 0.05, 0.95, y0 + 2.3, y0 + H, t, c, 0, seed + 3);
      for (let k = 1; k < 3; k++) bx(out, E, 0.05, 0.95, y0 + k * 0.28 - 0.01, y0 + k * 0.28 + 0.01, t + 0.012, shade(COL.stoff, 0.8), 0, seed + 20 + k);
      bx(out, E, 0.05, 0.95, y0 + 0.85, y0 + 0.9, t + 0.04, COL.weiss, 0, seed + 4);
      glass(0.07, 0.93, 0.9, 2.3);
      bx(out, E, 0.485, 0.515, y0 + 0.9, y0 + 2.3, t + 0.02, COL.schiefer, 0, seed + 5); bx(out, E, 0.07, 0.93, y0 + 1.57, y0 + 1.61, t + 0.02, COL.schiefer, 0, seed + 6);
      bx(out, E, 0.07, 0.93, y0 + 1.2, y0 + 1.24, 0.3, COL.holz, 0, seed + 7);   // Regalbrett
      const wc = [COL.koralle, "#E8C66A", COL.teppich, COL.weiss, "#5D8A4E", "#E8873C"];
      for (let k = 0; k < 6; k++) { const u = 0.1 + k * 0.13; bx(out, E, u, u + 0.09, y0 + 1.24, y0 + 1.24 + 0.08 + hh(k) * 0.12, 0.12, wc[k], 0, seed + 60 + k); }
      for (let k = 0; k < 6; k++) bx(out, E, 0.05 + k * 0.15, 0.05 + (k + 1) * 0.15, y0 + 2.42, y0 + 2.7, t + 0.04, k & 1 ? COL.weiss : COL.koralle, 0, seed + 70 + k);
    }
    return;
  }
  if (def.door) {
    const d0 = 0.12, d1 = 0.88, top = 2.12;
    W(a, d0, y0, y0 + H, seed); W(d1, b, y0, y0 + H, seed + 1); W(d0, d1, y0 + top, y0 + H, seed + 2);
    // Zarge
    bx(out, E, d0, d0 + 0.04, y0, y0 + top, t + 0.03, COL.rahmen, 0, seed + 3); bx(out, E, d1 - 0.04, d1, y0, y0 + top, t + 0.03, COL.rahmen, 0, seed + 4); bx(out, E, d0, d1, y0 + top - 0.04, y0 + top, t + 0.03, COL.rahmen, 0, seed + 5);
    return;
  }
  if (def.win) {
    const w0 = 0.2, w1 = 0.8, lo = 0.95, hi = 2.05;
    W(a, w0, y0, y0 + H, seed); W(w1, b, y0, y0 + H, seed + 1);
    W(w0, w1, y0, y0 + lo, seed + 2); W(w0, w1, y0 + hi, y0 + H, seed + 3);
    bx(out, E, w0, w1, y0 + lo - 0.05, y0 + lo, t + 0.1, COL.rahmen, 0, seed + 4);   // Fensterbank
    bx(out, E, w0, w0 + 0.04, y0 + lo, y0 + hi, t * 0.6, COL.rahmen, 0, seed + 5); bx(out, E, w1 - 0.04, w1, y0 + lo, y0 + hi, t * 0.6, COL.rahmen, 0, seed + 6);
    bx(out, E, w0, w1, y0 + hi - 0.04, y0 + hi, t * 0.6, COL.rahmen, 0, seed + 7); bx(out, E, 0.48, 0.52, y0 + lo, y0 + hi, t * 0.5, COL.rahmen, 0, seed + 8);
    bx(out, E, w0 + 0.04, w1 - 0.04, y0 + lo, y0 + hi - 0.04, 0.02, COL.glas, 0, seed + 9); out[out.length - 1].userData.glass = true;   // Glas: eigenes Netz, lässt Sonnenlicht durch
    return;
  }
  W(a, b, y0, y0 + H, seed);
  if (def.brick || def.plank) {   // leichte Fugen: zwei dunklere Streifen auf beiden Seiten
    const sc = shade(c, 0.82), n = def.quarter ? 2 : def.brick ? 6 : 4;
    for (let k = 1; k <= n; k++) { const yy = y0 + k * H / (n + 1); bx(out, E, a, b, yy - 0.012, yy + 0.012, t + 0.012, sc, 0, seed + 10 + k); }
  }
  if (def.quarter) bx(out, E, a - 0.02, b + 0.02, y0 + H, y0 + H + 0.04, t + 0.06, shade(c, 0.9), 0, seed + 30);   // Abdeckung oben (1/4-Wand)
}
function floorParts(def, x, z, y0, seed, out) {
  out.push(part(new THREE.BoxGeometry(1, FLOOR, 1), def.c, M(x + 0.5, y0 + FLOOR / 2, z + 0.5, 1), 0, seed));
  if (def.plank) for (let k = 1; k < 5; k++) out.push(part(new THREE.BoxGeometry(1, 0.006, 0.012), shade(def.c, 0.78), M(x + 0.5, y0 + FLOOR + 0.002, z + k / 5, 1), 0, seed + k));
  if (def.tile) { out.push(part(new THREE.BoxGeometry(1, 0.006, 0.014), shade(def.c, 0.8), M(x + 0.5, y0 + FLOOR + 0.002, z + 0.5, 1), 0, seed + 1)); out.push(part(new THREE.BoxGeometry(0.014, 0.006, 1), shade(def.c, 0.8), M(x + 0.5, y0 + FLOOR + 0.002, z + 0.5, 1), 0, seed + 2)); }
}
// Dachschräge: steigt in Richtung r (0 = nach Norden, 1 = Osten, 2 = Süden, 3 = Westen) um eine Stufe je Zelle (45°: 1 m, 22,5°: 0,41 m)
// Firststück (seit v0.21.1): zwei halbe Schrägen steigen von beiden Seiten zur Zellmitte, r gerade = First läuft Ost–West, ungerade = Nord–Süd
const RISE = [[0, -1], [1, 0], [0, 1], [-1, 0]];
function roofPlate(def, out, seed, hl, R, dir, cx, cy, cz) {   // Dachplatte: horizontale Länge hl in Richtung dir, Mitte (cx, cy, cz) auf der Dachfläche
  const th = 0.12, ang = Math.atan(R), L = Math.hypot(hl, hl * R), rotY = Math.atan2(dir[0], dir[1]), lift = th / 2 / Math.cos(ang);
  const base = () => new THREE.Matrix4().makeTranslation(cx, cy + lift, cz).multiply(new THREE.Matrix4().makeRotationY(rotY)).multiply(new THREE.Matrix4().makeRotationX(-ang));
  out.push(part(new THREE.BoxGeometry(1.02, th, L + 0.04), def.c, base(), 0, seed));
  const n = Math.max(1, Math.round(L / 0.47));   // Ziegelreihen
  for (let k = 0; k < n; k++) out.push(part(new THREE.BoxGeometry(1.02, 0.03, 0.05), shade(def.c, 0.8), base().multiply(new THREE.Matrix4().makeTranslation(0, th / 2 + 0.01, ((k + 0.5) / n - 0.5) * L)), 0, seed + k + 1));
}
function roofParts(def, x, z, y0, r, s, seed, out) {
  if (def.flat) { out.push(part(new THREE.BoxGeometry(1, 0.16, 1), def.c, M(x + 0.5, y0 + 0.08, z + 0.5, 1), 0, seed)); return; }
  const R = def.rise || 1, y = y0 + s * R;
  if (def.ridge) {
    const ax = r & 1, d = ax ? [1, 0] : [0, 1];   // Richtung quer zum First
    [-1, 1].forEach((sg) => roofPlate(def, out, seed + 10 * (sg + 1), 0.5, R, [-sg * d[0], -sg * d[1]], x + 0.5 + sg * 0.25 * d[0], y + R / 4, z + 0.5 + sg * 0.25 * d[1]));
    const cap = ax ? new THREE.BoxGeometry(0.14, 0.08, 1.04) : new THREE.BoxGeometry(1.04, 0.08, 0.14);
    out.push(part(cap, shade(def.c, 0.72), M(x + 0.5, y + R / 2 + 0.12 / Math.cos(Math.atan(R)) + 0.01, z + 0.5, 1), 0, seed + 30));   // Firstziegel
    return;
  }
  roofPlate(def, out, seed, 1, R, RISE[r & 3], x + 0.5, y + R / 2, z + 0.5);
}
// Giebel: Fläche unter einer Dachschräge, auf einer Kante. Steigt entlang der Kante (f = 1: in die andere Richtung, f = 2: Giebelspitze in der Mitte, seit v0.21.1)
function gableParts(def, E, y0, s, f, seed, out) {
  const sh = new THREE.Shape(), R = def.rise || 1, lo = s * R, hi = (s + 1) * R;
  if (f === 2) { sh.moveTo(0, 0); sh.lineTo(1, 0); sh.lineTo(1, lo); sh.lineTo(0.5, lo + R / 2); sh.lineTo(0, lo); }
  else if (!f) { sh.moveTo(0, 0); sh.lineTo(1, 0); sh.lineTo(1, hi); sh.lineTo(0, lo); }
  else { sh.moveTo(0, 0); sh.lineTo(1, 0); sh.lineTo(1, lo); sh.lineTo(0, hi); }
  sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: WT, bevelEnabled: false });
  g.translate(0, 0, -WT / 2);
  const ang = Math.atan2(-E.uz, E.ux), m = M(E.ax, y0, E.az, 1, 1, 1, ang);
  out.push(part(g, def.c, m, 0, seed));
}
// Markise (seit v0.19.7): hängt an der Wand-Kante, lokal x entlang der Kante (0…1), z von der Wand weg in die angeklickte Zelle (f = 1: auf die andere Seite)
function awningParts(def, E, y0, f, seed, out) {
  const k = def.awn, ang = Math.atan2(-E.uz, E.ux), W = 0.9, T = 2.3, F = 2.0, L = Math.hypot(W, T - F), sl = Math.atan2(T - F, W);
  let base = M(E.ax, y0, E.az, 1, 1, 1, ang);
  if (f) base = base.multiply(new THREE.Matrix4().makeTranslation(0.5, 0, 0)).multiply(new THREE.Matrix4().makeRotationY(Math.PI)).multiply(new THREE.Matrix4().makeTranslation(-0.5, 0, 0));
  const B = (w, h, d, x, y, z, col, rx) => { let m = new THREE.Matrix4().makeTranslation(x, y, z); if (rx) m = m.multiply(new THREE.Matrix4().makeRotationX(rx)); out.push(part(new THREE.BoxGeometry(w, h, d), col, base.clone().multiply(m), 0, seed + out.length)); };
  const cloth = (x0, x1, col) => B(x1 - x0, 0.025, L, (x0 + x1) / 2, (T + F) / 2, W / 2, col, sl);
  if (k === 1) {   // gestreift: vier Streifen Koralle/Weiß, Volant mit Zacken
    const cs = [COL.koralle, COL.weiss, COL.koralle, COL.weiss];
    for (let i = 0; i < 4; i++) { cloth(i * 0.25, (i + 1) * 0.25, cs[i]); const hh = i & 1 ? 0.11 : 0.17; B(0.25, hh, 0.02, i * 0.25 + 0.125, F - hh / 2, W, cs[i]); }
    B(1, 0.1, 0.1, 0.5, T, 0.05, COL.metall);
  } else if (k === 2) {   // Stahlblau mit Petrol-Volant und dreieckigen Seitenteilen
    cloth(0, 1, "#4A6D7C"); B(1, 0.15, 0.02, 0.5, F - 0.075, W, COL.stoff); B(1, 0.1, 0.1, 0.5, T, 0.05, COL.metall);
    const sh = new THREE.Shape(); sh.moveTo(0, T); sh.lineTo(W, F); sh.lineTo(W, F - 0.16); sh.lineTo(0, F - 0.16); sh.closePath();
    [0.02, 1.0].forEach((x) => out.push(part(new THREE.ExtrudeGeometry(sh, { depth: 0.02, bevelEnabled: false }), shade("#4A6D7C", 0.88), base.clone().multiply(new THREE.Matrix4().makeTranslation(x, 0, 0)).multiply(new THREE.Matrix4().makeRotationY(-Math.PI / 2)), 0, seed + 90 + out.length)));
  } else {   // Kassettenmarkise: Stein mit Schiefer-Mittelstreifen, Rollbalken vorn, zwei Gelenkarme darunter
    cloth(0, 0.34, COL.fliese); cloth(0.34, 0.66, COL.schiefer); cloth(0.66, 1, COL.fliese);
    B(1, 0.14, 0.14, 0.5, T, 0.07, shade(COL.fliese, 0.8)); B(1, 0.06, 0.06, 0.5, F - 0.02, W + 0.01, COL.metall);
    [0.2, 0.8].forEach((x) => B(0.025, 0.025, L, x, (T + F) / 2 - 0.035, W / 2, COL.metall, sl));
  }
}
// Möbel (lokal um die Zellmitte, vorne = +z)
function objParts(id, seed) {
  const P = [], B = (w, h, d, x, y, z, c, ry) => P.push(part(new THREE.BoxGeometry(w, h, d), c, M(x, y, z, 1, 1, 1, ry || 0), 0, seed + P.length));
  const Cy = (r0, r1, h, x, y, z, c, n) => P.push(part(new THREE.CylinderGeometry(r0, r1, h, n || 8), c, M(x, y, z, 1), 0, seed + P.length));
  const col = PARTS[id] && PARTS[id].col;
  if (col) {   // Säulen (seit v0.21.1): vom Boden bis unter die Decke (2,68 m)
    const c = PARTS[id].c, sc = shade(c, 0.9), H = LH - FLOOR;
    if (col === 1) { B(0.44, 0.1, 0.44, 0, 0.05, 0, sc); Cy(0.19, 0.21, 0.08, 0, 0.14, 0, c, 14); Cy(0.15, 0.165, H - 0.38, 0, 0.18 + (H - 0.38) / 2, 0, c, 14); Cy(0.2, 0.15, 0.1, 0, H - 0.15, 0, c, 14); B(0.46, 0.1, 0.46, 0, H - 0.05, 0, sc); }
    else if (col === 2) { B(0.38, 0.12, 0.38, 0, 0.06, 0, sc); B(0.3, H - 0.24, 0.3, 0, H / 2, 0, c); B(0.38, 0.12, 0.38, 0, H - 0.06, 0, sc); }
    else { B(0.18, H, 0.18, 0, H / 2, 0, c); B(0.22, 0.08, 0.22, 0, 0.04, 0, COL.beton); B(0.5, 0.12, 0.14, 0, H - 0.06, 0, sc); }
  } else if (id === "schreibtisch") {
    B(1.2, 0.05, 0.62, 0, 0.75, 0, COL.holz);
    [[-0.56, -0.27], [0.56, -0.27], [-0.56, 0.27], [0.56, 0.27]].forEach((q) => B(0.05, 0.73, 0.05, q[0], 0.365, q[1], COL.dunkel));
    B(0.4, 0.5, 0.55, -0.37, 0.48, 0, shade(COL.holz, 0.9));   // Schubladen
    B(0.36, 0.02, 0.06, -0.37, 0.62, 0.28, COL.dunkel); B(0.36, 0.02, 0.06, -0.37, 0.42, 0.28, COL.dunkel);
    // Laptop (Bildschirm zeigt nach vorne, Tastatur davor)
    B(0.36, 0.02, 0.25, 0.12, 0.785, 0.05, COL.metall);
    B(0.3, 0.004, 0.12, 0.12, 0.797, 0.08, COL.dunkel);
    P.push(part(new THREE.BoxGeometry(0.36, 0.24, 0.015), COL.metall, new THREE.Matrix4().makeTranslation(0.12, 0.775, -0.075).multiply(new THREE.Matrix4().makeRotationX(-0.25)).multiply(new THREE.Matrix4().makeTranslation(0, 0.12, 0)), 0, seed + 50));
    P.push(part(new THREE.BoxGeometry(0.32, 0.2, 0.004), "#9FD6E2", new THREE.Matrix4().makeTranslation(0.12, 0.775, -0.075).multiply(new THREE.Matrix4().makeRotationX(-0.25)).multiply(new THREE.Matrix4().makeTranslation(0, 0.12, 0.009)), 0, seed + 51));
    B(0.08, 0.1, 0.08, 0.5, 0.825, -0.18, COL.koralle);   // Stiftebecher
  } else if (id === "stuhl") {
    B(0.44, 0.05, 0.44, 0, 0.46, 0, COL.stoff);
    [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]].forEach((q) => B(0.04, 0.44, 0.04, q[0], 0.22, q[1], COL.dunkel));
    B(0.44, 0.42, 0.05, 0, 0.72, 0.2, COL.stoff); B(0.04, 0.3, 0.04, -0.19, 0.6, 0.2, COL.dunkel); B(0.04, 0.3, 0.04, 0.19, 0.6, 0.2, COL.dunkel);
  } else if (id === "bett") {
    B(0.95, 0.28, 2.0, 0, 0.2, 0, COL.holz); B(0.88, 0.16, 1.92, 0, 0.42, 0.02, COL.weiss); B(0.9, 0.06, 1.3, 0, 0.51, 0.3, COL.stoff);
    B(0.6, 0.1, 0.32, 0, 0.55, -0.72, COL.weiss); B(0.95, 0.7, 0.06, 0, 0.45, -0.98, COL.holzd);
  } else if (id === "regal") {
    B(0.9, 1.8, 0.04, 0, 0.9, -0.15, COL.holzd); B(0.04, 1.8, 0.35, -0.43, 0.9, 0, COL.holz); B(0.04, 1.8, 0.35, 0.43, 0.9, 0, COL.holz);
    for (let k = 0; k < 5; k++) B(0.86, 0.03, 0.33, 0, 0.02 + k * 0.44, 0, COL.holz);
    const bc = [COL.koralle, COL.stoff, COL.teppich, COL.putz, COL.schiefer];
    for (let k = 0; k < 4; k++) for (let b = 0; b < 5; b++) if (hash2(k, b, seed) > 0.3) B(0.06 + hash2(b, k, 3) * 0.05, 0.22 + hash2(b, k, 4) * 0.1, 0.24, -0.34 + b * 0.15, 0.17 + k * 0.44, 0.02, bc[(k + b) % 5]);
  } else if (id === "schrank") {
    B(0.95, 2.0, 0.55, 0, 1.0, 0, COL.holz); B(0.006, 1.9, 0.01, 0, 1.0, 0.276, COL.holzd); B(0.03, 0.18, 0.03, -0.06, 1.05, 0.29, COL.metall); B(0.03, 0.18, 0.03, 0.06, 1.05, 0.29, COL.metall);
  } else if (id === "sofa") {
    B(1.8, 0.4, 0.85, 0, 0.22, 0, COL.stoff); B(1.8, 0.45, 0.2, 0, 0.62, -0.33, shade(COL.stoff, 0.85)); B(0.18, 0.25, 0.85, -0.81, 0.52, 0, shade(COL.stoff, 0.85)); B(0.18, 0.25, 0.85, 0.81, 0.52, 0, shade(COL.stoff, 0.85));
    B(0.7, 0.1, 0.6, -0.36, 0.47, 0.06, shade(COL.stoff, 1.08)); B(0.7, 0.1, 0.6, 0.36, 0.47, 0.06, shade(COL.stoff, 1.08));
  } else if (id === "tisch") {
    B(1.2, 0.05, 0.8, 0, 0.74, 0, COL.holz); [[-0.54, -0.34], [0.54, -0.34], [-0.54, 0.34], [0.54, 0.34]].forEach((q) => B(0.06, 0.72, 0.06, q[0], 0.36, q[1], COL.holzd));
  } else if (id === "kuehlschrank") {
    B(0.6, 1.75, 0.6, 0, 0.875, 0, COL.weiss); B(0.58, 0.01, 0.01, 0, 1.2, 0.301, "#B8B6AE"); B(0.03, 0.3, 0.03, 0.22, 1.4, 0.31, COL.metall); B(0.03, 0.3, 0.03, 0.22, 0.95, 0.31, COL.metall);
  } else if (id === "lampe") {
    Cy(0.16, 0.18, 0.04, 0, 0.02, 0, COL.dunkel, 10); Cy(0.015, 0.015, 1.4, 0, 0.72, 0, COL.dunkel, 6); Cy(0.14, 0.22, 0.26, 0, 1.5, 0, "#F3E3B4", 10);
  } else if (id === "pflanze") {
    Cy(0.16, 0.12, 0.32, 0, 0.16, 0, COL.koralle, 8);
    for (let k = 0; k < 7; k++) { const a = k / 7 * 6.28, l = 0.25 + hash2(k, 1, 7) * 0.2; P.push(part(new THREE.BoxGeometry(0.1, 0.02, l), COL.gruen, new THREE.Matrix4().makeTranslation(0, 0.36, 0).multiply(new THREE.Matrix4().makeRotationY(a)).multiply(new THREE.Matrix4().makeRotationX(-0.7)).multiply(new THREE.Matrix4().makeTranslation(0, 0, l / 2)), 0, seed + 60 + k)); }
    Cy(0.02, 0.02, 0.4, 0, 0.5, 0, shade(COL.gruen, 0.8), 5);
  } else if (id === "ghettoblaster") {
    // Gehäuse, zwei Lautsprecher, Kassettenfach, Tasten, Griff und Antenne (vorne = +z)
    B(0.64, 0.34, 0.2, 0, 0.17, 0, "#2E3134"); B(0.6, 0.05, 0.19, 0, 0.36, 0, "#3B3F43");
    const spk = (x) => { P.push(part(new THREE.CylinderGeometry(0.115, 0.115, 0.03, 14), "#C6C5B9", new THREE.Matrix4().makeTranslation(x, 0.16, 0.1).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)), 0, seed + 70)); P.push(part(new THREE.CylinderGeometry(0.095, 0.095, 0.04, 14), "#1B1C1F", new THREE.Matrix4().makeTranslation(x, 0.16, 0.105).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)), 0, seed + 71)); P.push(part(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 8), "#5A5F63", new THREE.Matrix4().makeTranslation(x, 0.16, 0.11).multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2)), 0, seed + 72)); };
    spk(-0.19); spk(0.19);
    B(0.14, 0.09, 0.02, 0, 0.19, 0.1, "#7FB4C4"); B(0.12, 0.05, 0.022, 0, 0.19, 0.101, "#475657");
    for (let k = 0; k < 4; k++) B(0.025, 0.02, 0.03, -0.045 + k * 0.03, 0.29, 0.08, k === 0 ? COL.koralle : "#8E918F");
    B(0.04, 0.12, 0.04, -0.2, 0.44, 0, "#5A5F63"); B(0.04, 0.12, 0.04, 0.2, 0.44, 0, "#5A5F63"); B(0.44, 0.03, 0.05, 0, 0.5, 0, "#5A5F63");
    P.push(part(new THREE.CylinderGeometry(0.006, 0.008, 0.55, 5), "#B8B6AE", new THREE.Matrix4().makeTranslation(0.27, 0.6, -0.05).multiply(new THREE.Matrix4().makeRotationZ(-0.45)), 0, seed + 80));
  } else if (id === "kuehltruhe") {
    // offene Gefriertruhe: weiße Wanne, eisblauer Innenraum, Tiefkühl-Packungen, blaue Blende, Glasschiebedeckel-Rahmen
    B(1.8, 0.1, 0.85, 0, 0.05, 0, COL.dunkel); B(1.8, 0.78, 0.07, 0, 0.47, 0.39, COL.weiss); B(1.8, 0.78, 0.07, 0, 0.47, -0.39, COL.weiss);
    B(0.07, 0.78, 0.85, -0.865, 0.47, 0, COL.weiss); B(0.07, 0.78, 0.85, 0.865, 0.47, 0, COL.weiss); B(1.66, 0.04, 0.71, 0, 0.55, 0, COL.eis);
    B(1.8, 0.1, 0.02, 0, 0.72, 0.43, COL.teppich); B(1.8, 0.03, 0.09, 0, 0.87, 0.39, COL.stahl); B(1.8, 0.03, 0.09, 0, 0.87, -0.39, COL.stahl); B(0.03, 0.03, 0.7, 0, 0.87, 0, COL.stahl);
    const tk = [COL.koralle, "#E8C66A", COL.teppich, "#7FB4C4", COL.weiss, "#5D8A4E"];
    for (let k = 0; k < 14; k++) { const x = -0.74 + (k % 7) * 0.245, z = k < 7 ? -0.17 : 0.17, h = 0.08 + hash2(k, 2, seed) * 0.1; B(0.2, h, 0.26, x, 0.57 + h / 2, z, tk[Math.floor(hash2(k, 5, seed) * tk.length)], (hash2(k, 7, seed) - 0.5) * 0.4); }
  } else if (id === "obstregal") {
    // Obst- und Gemüsestand: Unterschrank, drei schräge Kistenreihen mit Obst/Gemüse, grüne Rückwand
    B(1.8, 0.32, 0.9, 0, 0.16, 0, COL.holzd); B(1.8, 1.0, 0.05, 0, 0.95, -0.43, COL.gruen); B(1.8, 0.14, 0.06, 0, 1.38, -0.42, COL.weiss);
    const fc = ["#C9483C", "#E8C66A", "#E8873C", "#6FA84E", "#7A4E8C", "#8A6142", "#F0D85A", "#4E8A3E"];
    for (let row = 0; row < 3; row++) for (let k = 0; k < 4; k++) {
      const x = -0.66 + k * 0.44, z = 0.24 - row * 0.25, y = 0.42 + row * 0.22, tilt = 0.25;
      const M2 = (w, h, d, ox, oy, oz, col) => P.push(part(new THREE.BoxGeometry(w, h, d), col, new THREE.Matrix4().makeTranslation(x, y, z).multiply(new THREE.Matrix4().makeRotationX(tilt)).multiply(new THREE.Matrix4().makeTranslation(ox, oy, oz)), 0, seed + P.length));
      const col = fc[Math.floor(hash2(row, k, seed + 3) * fc.length)];
      M2(0.42, 0.12, 0.26, 0, 0, 0, COL.kiste); M2(0.38, 0.05, 0.22, 0, 0.07, 0, col);
      for (let f = 0; f < 4; f++) M2(0.07, 0.06, 0.07, -0.13 + f * 0.085, 0.11, -0.04 + (f & 1) * 0.08, shade(col, 0.9 + hash2(f, k, row) * 0.25));
    }
    for (let k = 0; k < 4; k++) B(0.16, 0.05, 0.01, -0.66 + k * 0.44, 0.42, 0.37, COL.weiss);   // Preisschilder
  } else if (id === "kleiderstaender") {
    // Kleiderstange: zwei Pfosten mit Füßen, Stange, neun Pullis auf Holzbügeln
    const st = COL.stahl, pc = ["#E07B39", COL.stoff, COL.koralle, "#8E918F", "#26385A", "#F2F0EA", "#7A2E35", "#6B6E3E", "#E8C66A"];
    B(0.04, 1.6, 0.04, -0.84, 0.8, 0, st); B(0.04, 1.6, 0.04, 0.84, 0.8, 0, st); B(1.72, 0.03, 0.03, 0, 1.6, 0, st);
    B(0.05, 0.04, 0.56, -0.84, 0.02, 0, COL.dunkel); B(0.05, 0.04, 0.56, 0.84, 0.02, 0, COL.dunkel);
    for (let k = 0; k < 9; k++) { const x = -0.7 + k * 0.175, c = pc[k]; B(0.01, 0.05, 0.01, x, 1.58, 0, st); B(0.015, 0.02, 0.4, x, 1.54, 0, COL.holz);
      B(0.05, 0.6, 0.38, x, 1.22, 0, c); B(0.04, 0.42, 0.07, x, 1.28, 0.22, shade(c, 0.9)); B(0.04, 0.42, 0.07, x, 1.28, -0.22, shade(c, 0.9)); B(0.052, 0.05, 0.382, x, 0.94, 0, shade(c, 0.85)); }
  } else if (id === "rundstaender") {
    // runder Ständer: Mittelstange, Ring, zehn Mäntel rundherum
    const st = COL.stahl, mc = ["#6B6E3E", "#C9B48A", "#26385A", "#2B2E30", "#B8383A", "#475657", "#BFA77A", "#E8C66A", "#C6C5B9", "#7B5236"];
    Cy(0.3, 0.32, 0.04, 0, 0.02, 0, COL.dunkel, 14); Cy(0.025, 0.025, 1.55, 0, 0.78, 0, st, 6);
    for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2, cx = Math.cos(a) * 0.42, cz = Math.sin(a) * 0.42, c = mc[k];
      B(0.03, 0.03, 0.28, Math.cos(a) * 0.45, 1.55, Math.sin(a) * 0.45, st, -a); B(0.02, 0.03, 0.03, Math.cos(a) * 0.2, 1.55, Math.sin(a) * 0.2, st, -a);
      B(0.07, 0.95, 0.36, cx, 1.04, cz, c, -a); B(0.075, 0.12, 0.2, cx, 1.47, cz, shade(c, 0.85), -a); }
    for (let k = 0; k < 4; k++) B(0.9, 0.025, 0.025, 0, 1.55, 0, st, k * Math.PI / 4);
  } else if (id === "kleiderregal") {
    // Wandregal mit gefalteten Hosen und Pullis in Stapeln
    const fc = ["#3F5F86", "#2B2E30", "#C9B48A", "#6B6E3E", "#8DB3CF", "#8E918F", "#26385A", "#6B4A2E", "#62929E", "#ED6A5E"];
    B(1.8, 1.9, 0.04, 0, 0.95, -0.23, COL.holzd); B(0.04, 1.9, 0.5, -0.88, 0.95, 0, COL.holz); B(0.04, 1.9, 0.5, 0.88, 0.95, 0, COL.holz); B(1.8, 0.12, 0.05, 0, 1.84, 0.22, COL.koralle);
    for (let sh = 0; sh < 4; sh++) { const y = 0.06 + sh * 0.44; B(1.72, 0.03, 0.46, 0, y, 0, COL.holz);
      for (let k = 0; k < 4; k++) { const x = -0.63 + k * 0.42, n = 3 + Math.floor(hash2(sh, k, seed) * 3); for (let i = 0; i < n; i++) { const c = fc[Math.floor(hash2(sh * 7 + k, i, seed + 5) * fc.length)]; B(0.34, 0.055, 0.3, x, y + 0.045 + i * 0.058, 0.02, c); } } }
  } else if (id === "schuhregal") {
    // Schuhregal: vier Böden mit je vier Paar Schuhen
    const sc = ["#F2F0EA", "#2B2E30", "#ED6A5E", "#6B4A2E", "#62929E", "#B8383A", "#E8C66A", "#8E918F"];
    B(1.4, 1.5, 0.04, 0, 0.75, -0.2, COL.holzd); B(0.04, 1.5, 0.45, -0.68, 0.75, 0, COL.holz); B(0.04, 1.5, 0.45, 0.68, 0.75, 0, COL.holz);
    for (let sh = 0; sh < 4; sh++) { const y = 0.06 + sh * 0.38; B(1.32, 0.03, 0.42, 0, y, 0, COL.holz);
      for (let k = 0; k < 4; k++) { const x = -0.48 + k * 0.32, c = sc[Math.floor(hash2(sh, k, seed + 9) * sc.length)], hi = hash2(k, sh, seed) > 0.6 ? 0.08 : 0;
        for (const o of [-0.055, 0.055]) { B(0.09, 0.07 + hi, 0.22, x + o, y + 0.05 + hi / 2, 0.02, c); B(0.095, 0.02, 0.23, x + o, y + 0.025, 0.02, COL.weiss); } } }
  } else if (id === "accessoires") {
    // Tisch mit Kappen und Mützen, dahinter ein Ständer mit hängenden Schals
    B(1.0, 0.05, 0.6, 0, 0.75, 0.08, COL.holz); [[-0.45, -0.18], [0.45, -0.18], [-0.45, 0.34], [0.45, 0.34]].forEach((q) => B(0.05, 0.73, 0.05, q[0], 0.365, q[1], COL.holzd));
    const hc = ["#ED6A5E", "#26385A", "#E8C66A", "#62929E", "#2B2E30", "#5D8A4E"];
    for (let k = 0; k < 3; k++) { const x = -0.3 + k * 0.3, c = hc[k]; B(0.2, 0.08, 0.22, x, 0.82, 0.18, c); B(0.15, 0.012, 0.1, x, 0.785, 0.33, shade(c, 0.8)); }
    for (let k = 0; k < 3; k++) { const x = -0.3 + k * 0.3, c = hc[k + 3]; B(0.2, 0.12, 0.2, x, 0.84, -0.06, c); B(0.21, 0.05, 0.21, x, 0.8, -0.06, shade(c, 0.8)); }
    B(0.04, 1.6, 0.04, -0.45, 0.8, -0.34, COL.stahl); B(0.04, 1.6, 0.04, 0.45, 0.8, -0.34, COL.stahl); B(0.94, 0.03, 0.03, 0, 1.58, -0.34, COL.stahl);
    const scf = ["#7A2E35", "#C6C5B9", "#E8C66A", "#62929E", "#B8383A", "#8E918F"];
    for (let k = 0; k < 6; k++) { const x = -0.36 + k * 0.145, c = scf[k]; B(0.1, 0.03, 0.05, x, 1.57, -0.34, c); B(0.08, 0.5, 0.02, x - 0.02, 1.32, -0.32, c); B(0.08, 0.42, 0.02, x + 0.02, 1.36, -0.36, shade(c, 0.85)); }
  } else if (id === "puppe-winter" || id === "puppe-street" || id === "puppe-sommer") {
    // Schaufensterpuppen mit fertigem Outfit (dieselbe Kleidung wie im Laden, kleidung.js)
    const O = { "puppe-winter": { kopf: "kl_bommel_1", hals: "kl_schallang_1", ober: "kl_rolli_1", jacke: "kl_wollmantel_1", hose: "kl_jeans_1", schuhe: "kl_winterstiefel_1" },
      "puppe-street": { kopf: "kl_snapback_1", ober: "kl_hoodie_1", hose: "kl_baggyjeans_1", schuhe: "kl_hightop_2" },
      "puppe-sommer": { kopf: "kl_bucket_1", hals: "kl_halstuch_1", ober: "kl_sweat_2", hose: "kl_bermuda_1", schuhe: "kl_sandalen_1" } }[id];
    puppeParts(O, seed).forEach((g) => P.push(g));
  } else if (id === "umkleide") {
    // Umkleidekabine: Rück- und Seitenwände, Spiegel, Hocker, Vorhang halb offen
    B(1.0, 2.1, 0.04, 0, 1.05, -0.48, COL.putz); B(0.04, 2.1, 1.0, -0.48, 1.05, 0, COL.putz); B(0.04, 2.1, 1.0, 0.48, 1.05, 0, COL.putz);
    B(0.96, 0.03, 0.03, 0, 2.05, 0.46, COL.stahl); B(0.42, 1.85, 0.03, -0.25, 1.1, 0.46, COL.stoff); B(0.14, 1.85, 0.07, 0.38, 1.1, 0.46, shade(COL.stoff, 0.85));
    B(0.46, 1.25, 0.03, 0, 1.25, -0.455, COL.holz); B(0.4, 1.18, 0.012, 0, 1.25, -0.437, "#BFE0E8"); Cy(0.15, 0.15, 0.04, -0.2, 0.45, -0.15, COL.koralle, 10); Cy(0.02, 0.02, 0.43, -0.2, 0.215, -0.15, COL.metall, 5);
  } else if (id === "standspiegel") {
    B(0.6, 1.7, 0.05, 0, 0.95, 0, COL.holz); B(0.5, 1.6, 0.012, 0, 0.95, 0.03, "#BFE0E8"); B(0.06, 0.04, 0.35, -0.25, 0.02, 0, COL.holzd); B(0.06, 0.04, 0.35, 0.25, 0.02, 0, COL.holzd);
  } else if (id === "warenregal") {
    // Supermarktregal: Sockel, Rückwand, Seitenteile, vier Böden mit bunten Packungen, Preisleisten
    B(1.8, 0.12, 0.6, 0, 0.06, 0, COL.dunkel); B(1.8, 1.8, 0.05, 0, 0.95, -0.27, COL.stahl); B(0.04, 1.85, 0.6, -0.88, 0.925, 0, shade(COL.stahl, 0.85)); B(0.04, 1.85, 0.6, 0.88, 0.925, 0, shade(COL.stahl, 0.85));
    const pc = [COL.koralle, "#E8C66A", COL.teppich, "#7FB4C4", COL.weiss, "#5D8A4E", "#E8873C", COL.schiefer, "#C9483C"];
    for (let sh = 0; sh < 4; sh++) {
      const y = 0.14 + sh * 0.42; B(1.72, 0.03, 0.52, 0, y, 0.02, shade(COL.stahl, 1.08)); B(1.72, 0.05, 0.015, 0, y - 0.005, 0.285, COL.koralle);
      let x = -0.82; let k = 0;
      while (x < 0.78) { const w = 0.1 + hash2(sh, k, seed) * 0.12, h = 0.14 + hash2(k, sh, seed + 1) * 0.18; if (x + w > 0.84) break; B(w - 0.015, h, 0.34, x + w / 2, y + 0.015 + h / 2, 0.04, pc[Math.floor(hash2(k, sh, seed + 2) * pc.length)]); x += w; k++; }
    }
  } else if (id === "einkaufswagen") {
    // fünf ineinander geschobene Einkaufswagen (Drahtkorb, Koralle-Griff, Rollen): jeder hängt 10 cm weiter hinten und etwas höher auf der Rampe des Vordermanns
    const wire = COL.stahl, wireD = shade(COL.stahl, 0.8);
    for (let i = 0; i < 5; i++) {
      const oz = 0.2 - i * 0.1, oy = i * 0.035, b = (w, h, d, x, y, z, c) => B(w, h, d, x, y + oy, z + oz, c);
      // Fahrgestell: zwei Längsstreben, zwei Querstreben, vier Rollen
      b(0.025, 0.025, 0.7, -0.17, 0.12, 0, wireD); b(0.025, 0.025, 0.7, 0.17, 0.12, 0, wireD); b(0.36, 0.025, 0.025, 0, 0.12, 0.33, wireD); b(0.36, 0.025, 0.025, 0, 0.12, -0.3, wireD);
      [[-0.17, 0.3], [0.17, 0.3], [-0.17, -0.28], [0.17, -0.28]].forEach((q) => P.push(part(new THREE.CylinderGeometry(0.04, 0.04, 0.025, 8), COL.dunkel, new THREE.Matrix4().makeTranslation(q[0], 0.04 + oy, q[1] + oz).multiply(new THREE.Matrix4().makeRotationZ(Math.PI / 2)), 0, seed + P.length)));
      b(0.02, 0.1, 0.02, -0.17, 0.075, 0.3, wireD); b(0.02, 0.1, 0.02, 0.17, 0.075, 0.3, wireD); b(0.02, 0.1, 0.02, -0.17, 0.075, -0.28, wireD); b(0.02, 0.1, 0.02, 0.17, 0.075, -0.28, wireD);
      // Korb: Boden, oberer Rand rundum, Mittelstreben, senkrechte Stäbe an den Seiten
      b(0.36, 0.012, 0.62, 0, 0.27, 0.02, wire);
      b(0.015, 0.015, 0.7, -0.215, 0.52, 0, wire); b(0.015, 0.015, 0.7, 0.215, 0.52, 0, wire); b(0.43, 0.015, 0.015, 0, 0.52, 0.34, wire); b(0.43, 0.015, 0.015, 0, 0.52, -0.34, wire);
      b(0.012, 0.012, 0.66, -0.19, 0.4, 0, wireD); b(0.012, 0.012, 0.66, 0.19, 0.4, 0, wireD);
      for (let k = 0; k < 5; k++) { const z = -0.3 + k * 0.15; b(0.012, 0.25, 0.012, -0.2, 0.395, z, wire); b(0.012, 0.25, 0.012, 0.2, 0.395, z, wire); }
      b(0.012, 0.25, 0.012, -0.1, 0.395, 0.34, wire); b(0.012, 0.25, 0.012, 0.1, 0.395, 0.34, wire);
      // Griff hinten (Koralle) und Kassenmünz-Schloss
      b(0.02, 0.42, 0.02, -0.2, 0.7, -0.34, wire); b(0.02, 0.42, 0.02, 0.2, 0.7, -0.34, wire); b(0.46, 0.035, 0.035, 0, 0.92, -0.35, COL.koralle);
    }
  } else if (id === "kasse") {
    // Kassenplatz (vorne = +z ist die Seite der Kassiererin): Laufband-Korpus, Scanner-Theke, Kassenblock mit Display, Kassenlicht
    const kb = "#4A6D7C";
    B(1.25, 0.72, 0.46, -0.275, 0.36, -0.22, kb); B(1.25, 0.05, 0.03, -0.275, 0.745, -0.435, COL.stahl); B(1.25, 0.05, 0.03, -0.275, 0.745, -0.005, COL.stahl);
    B(1.2, 0.03, 0.4, -0.275, 0.755, -0.22, "#1B1C1F");   // Laufband
    for (let k = 0; k < 12; k++) B(0.014, 0.004, 0.4, -0.82 + k * 0.1, 0.772, -0.22, "#33373A");
    B(0.04, 0.05, 0.42, -0.9, 0.76, -0.22, COL.metall); B(0.04, 0.05, 0.42, 0.33, 0.76, -0.22, COL.metall);   // Umlenkrollen
    B(0.05, 0.07, 0.36, -0.1, 0.8, -0.22, COL.koralle);   // Warentrenner
    B(1.25, 0.9, 0.45, -0.275, 0.45, 0.225, kb); B(1.27, 0.035, 0.47, -0.275, 0.9175, 0.225, COL.fliese);   // Scan-Theke
    B(0.32, 0.012, 0.22, -0.2, 0.942, 0.22, COL.dunkel); B(0.28, 0.008, 0.18, -0.2, 0.95, 0.22, "#9FD6E2");   // Scanner-Glas
    B(0.02, 0.38, 0.02, 0.22, 1.12, 0.38, COL.metall); B(0.24, 0.2, 0.01, 0.22, 1.32, 0.385, COL.koralle);   // Tütenhalter mit Tüten
    B(0.52, 0.95, 0.9, 0.64, 0.475, 0, kb); B(0.54, 0.035, 0.92, 0.64, 0.9675, 0, COL.fliese);   // Kassenblock
    B(0.04, 0.2, 0.04, 0.62, 1.085, 0.12, COL.metall); B(0.3, 0.2, 0.03, 0.62, 1.3, 0.12, COL.dunkel); B(0.26, 0.16, 0.012, 0.62, 1.3, 0.136, "#9FD6E2");   // Display
    B(0.1, 0.04, 0.14, 0.5, 1.005, -0.12, COL.dunkel); B(0.07, 0.01, 0.06, 0.5, 1.028, -0.13, "#9FD6E2");   // Kartenleser
    B(0.14, 0.1, 0.14, 0.78, 1.04, 0.15, COL.weiss);   // Bondrucker
    B(0.4, 0.1, 0.01, 0.64, 0.8, 0.455, COL.stahl);   // Geldschublade
    B(0.04, 0.8, 0.04, 0.86, 1.4, -0.4, COL.metall); B(0.34, 0.26, 0.05, 0.86, 1.95, -0.4, COL.koralle); B(0.22, 0.16, 0.052, 0.86, 1.95, -0.4, COL.weiss); B(0.04, 0.11, 0.054, 0.86, 1.95, -0.4, COL.dunkel);   // Kassenlicht mit Nummer
  } else if (id === "teppich") {
    B(1.6, 0.012, 1.1, 0, 0.006, 0, COL.koralle); B(1.4, 0.014, 0.9, 0, 0.007, 0, shade(COL.koralle, 0.82));
  }
  return P;
}

// ---------- Pool (seit v0.21.1) ----------
// Becken 1 m tief unter dem Boden. Der Boden der Welt liegt darüber, deshalb: Öffnung in den Stencil schreiben, dort die Tiefe auf „ganz hinten“
// zurücksetzen und erst dann das Becken-Innere und das Wasser zeichnen. Rand (Beckenkopf) aus Stein auf den Seiten ohne Nachbar-Pool.
const POOL_M = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, stencilWrite: true, stencilRef: 1, stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp });
const POOL_F = new THREE.ShaderMaterial({ vertexShader: "void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position.z = gl_Position.w * 0.99999; }", fragmentShader: "void main(){ gl_FragColor = vec4(0.0); }",
  colorWrite: false, depthWrite: true, depthFunc: THREE.AlwaysDepth, stencilWrite: true, stencilRef: 1, stencilFunc: THREE.EqualStencilFunc, stencilFail: THREE.KeepStencilOp, stencilZFail: THREE.KeepStencilOp, stencilZPass: THREE.KeepStencilOp });
const POOL_I = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, stencilWrite: true, stencilRef: 1, stencilFunc: THREE.EqualStencilFunc, stencilFail: THREE.KeepStencilOp, stencilZFail: THREE.KeepStencilOp, stencilZPass: THREE.KeepStencilOp });
const POOL_W = new THREE.MeshLambertMaterial({ color: 0x3FA7C9, transparent: true, opacity: 0.5, depthWrite: false });
function poolParts(pools, L) {
  const has = new Set(pools.map((p) => p.x + "," + p.z + "," + p.l)), byL = {}, RIM = 0.22, D = 1.0, top = FLOOR;
  pools.forEach((p) => {
    const y0 = p.l * LH, nb = [[0, -1], [1, 0], [0, 1], [-1, 0]].map((d) => has.has((p.x + d[0]) + "," + (p.z + d[1]) + "," + p.l));
    const x0 = p.x + (nb[3] ? 0 : RIM), x1 = p.x + 1 - (nb[1] ? 0 : RIM), z0 = p.z + (nb[0] ? 0 : RIM), z1 = p.z + 1 - (nb[2] ? 0 : RIM), w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const B = byL[p.l] || (byL[p.l] = { mask: [], inner: [], water: [] }), tag = (g) => { g.userData.pi = p.pi; return g; }, seed = p.x * 31 + p.z * 17;
    // Rand aus Stein (normales Hausnetz)
    const rim = (bw, bd, rx, rz) => L(p.l).push(tag(part(new THREE.BoxGeometry(bw, top + 0.05, bd), COL.weiss, M(rx, y0 + (top + 0.05) / 2, rz, 1), 0, seed)));
    if (!nb[0]) rim(1, RIM, p.x + 0.5, p.z + RIM / 2); if (!nb[2]) rim(1, RIM, p.x + 0.5, p.z + 1 - RIM / 2);
    if (!nb[3]) rim(RIM, 1, p.x + RIM / 2, p.z + 0.5); if (!nb[1]) rim(RIM, 1, p.x + 1 - RIM / 2, p.z + 0.5);
    // Öffnung (Maske), Inneres (Boden hellblau mit Fugen, Wände), Wasser
    B.mask.push(tag(part(new THREE.PlaneGeometry(w, d), "#000000", M(cx, y0 + top, cz, 1).multiply(new THREE.Matrix4().makeRotationX(-Math.PI / 2)), 0, 0)));
    const yb = y0 + top - D;
    B.inner.push(tag(part(new THREE.BoxGeometry(w, 0.05, d), "#9FD3E0", M(cx, yb - 0.025, cz, 1), 0, seed)));
    B.inner.push(tag(part(new THREE.BoxGeometry(w, 0.006, 0.02), "#7DBCCB", M(cx, yb + 0.003, cz, 1), 0, seed)));
    B.inner.push(tag(part(new THREE.BoxGeometry(0.02, 0.006, d), "#7DBCCB", M(cx, yb + 0.003, cz, 1), 0, seed)));
    const wall = (bw, bd, wx, wz) => B.inner.push(tag(part(new THREE.BoxGeometry(bw, D, bd), "#C9E8EF", M(wx, yb + D / 2, wz, 1), 0, seed)));
    if (!nb[0]) wall(w, 0.04, cx, z0 - 0.02); if (!nb[2]) wall(w, 0.04, cx, z1 + 0.02); if (!nb[3]) wall(0.04, d, x0 - 0.02, cz); if (!nb[1]) wall(0.04, d, x1 + 0.02, cz);
    B.water.push(tag(part(new THREE.PlaneGeometry(w, d), "#3FA7C9", M(cx, y0 + top - 0.14, cz, 1).multiply(new THREE.Matrix4().makeRotationX(-Math.PI / 2)), 0, 0)));
  });
  const res = {};
  Object.keys(byL).forEach((l) => {
    const B = byL[l], mk = (arr, mat, ro) => { const m = new THREE.Mesh(mergeAny(arr), mat); m.renderOrder = ro; m.castShadow = false; m.receiveShadow = false; m.userData.ranges = ranges(arr); return m; };
    const mask = mk(B.mask, POOL_M, 5), far = new THREE.Mesh(mask.geometry, POOL_F); far.renderOrder = 6; far.castShadow = false; far.userData.ranges = mask.userData.ranges; far.raycast = () => {};
    res[l] = [mask, far, mk(B.inner, POOL_I, 7), mk(B.water, POOL_W, 9)];
  });
  return res;
}

// ---------- Haus aus Bauteilen bauen ----------
// Ergebnis: group (Etagen-Gruppen levels[l]), Türen, Kollisions-Strecken, Kästen, Interaktionen, Bodenzellen, Grundfläche
export const MAT = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
export function buildHouse(def, opts) {
  const o = opts || {}, parts = (def && def.parts) || [];
  const per = {}, posts = {}, rposts = {}, pools = [], out = { group: new THREE.Group(), levels: {}, doors: [], segs: [], boxes: [], acts: [], cells: new Set(), cover: new Set(), min: [1e9, 1e9], max: [-1e9, -1e9], top: 0 };
  const L = (l) => per[l] || (per[l] = []);
  const ext = (x, z) => { out.min[0] = Math.min(out.min[0], x); out.min[1] = Math.min(out.min[1], z); out.max[0] = Math.max(out.max[0], x); out.max[1] = Math.max(out.max[1], z); ext2(x, z); };
  out.min2 = [1e9, 1e9]; out.max2 = [-1e9, -1e9];   // alles inkl. Zaun/Hecke (Kollision)
  const ext2 = (x, z) => { out.min2[0] = Math.min(out.min2[0], x); out.min2[1] = Math.min(out.min2[1], z); out.max2[0] = Math.max(out.max2[0], x); out.max2[1] = Math.max(out.max2[1], z); };
  parts.forEach((p, i) => {
    const id = p[0], def2 = PARTS[id]; if (!def2) return;
    const x = p[1] | 0, z = p[2] | 0, r = (p[3] | 0) & 3, l = p[4] | 0, s = p[5] | 0, f = p[6] | 0, y0 = l * LH, seed = (x * 73 + z * 151 + l * 37 + i) | 0, list = L(l), n0 = list.length;
    if (def2.kind === "floor" && def2.pool) { pools.push({ x: x, z: z, l: l, pi: i }); out.boxes.push({ cx: x + 0.5, cz: z + 0.5, hw: 0.5, hd: 0.5, l: l, y1: y0 + 1, pool: true }); for (let k = 0; k < l; k++) out.cover.add(cellKey(x, z, k)); ext(x, z); ext(x + 1, z + 1); }   // Pool (seit v0.21.1): Becken nach der Schleife, nicht begehbar
    else if (def2.kind === "floor") { floorParts(def2, x, z, y0, seed, list); out.cells.add(cellKey(x, z, l)); for (let k = 0; k < l; k++) out.cover.add(cellKey(x, z, k)); ext(x, z); ext(x + 1, z + 1); }
    else if (def2.kind === "wall") {
      const E = edgeOf(x, z, r), gard = def2.fence || def2.hedge; wallParts(def2, E, y0, seed, list, Array.isArray(p[7]) ? p[7] : null);
      if (!gard) { ext(E.ax, E.az); ext(E.ax + E.ux, E.az + E.uz); }   // Zaun/Hecke zählen nicht zur Grundfläche des Hauses (Drehpunkt bleibt gleich)
      ext2(E.ax, E.az); ext2(E.ax + E.ux, E.az + E.uz);
      if (!def2.rail && !gard) { const ph = def2.quarter ? LH / 4 : LH; [[E.ax, E.az], [E.ax + E.ux, E.az + E.uz]].forEach((v) => { const k = v[0] + "," + v[1] + "," + l; if (!posts[k]) posts[k] = { c: def2.c, h: ph }; else posts[k].h = Math.max(posts[k].h, ph); }); }
      if (def2.rail) [[E.ax, E.az], [E.ax + E.ux, E.az + E.uz]].forEach((v) => { rposts[v[0] + "," + v[1] + "," + l] = def2.c; });   // Geländer-Pfosten an den Enden (seit v0.21.1)
      if (def2.auto) {
        // Automatik-Schiebetür (seit v0.19.7): zwei Glasflügel auf einer Schiene, laufen nach außen auseinander (weg von der Mitte, vor der Nachbarwand)
        const pv = new THREE.Group(); pv.position.set(E.ax, y0, E.az); pv.rotation.y = Math.atan2(-E.uz, E.ux);
        const fr = [], gl = [], zc = 0.09, lw = 0.395, h = 2.04;
        [[0.1, 0.495], [0.505, 0.9]].forEach((q, j) => {
          const u0 = q[0], u1 = q[1], w = u1 - u0, fb = (ww, hh, xx, yy) => fr.push(part(new THREE.BoxGeometry(ww, hh, 0.045), COL.stahl, M(xx, yy, zc, 1), 0, seed + 20 + j * 8 + fr.length));
          fb(w, 0.05, (u0 + u1) / 2, 0.045); fb(w, 0.05, (u0 + u1) / 2, h + 0.015); fb(0.04, h, u0 + 0.02, h / 2 + 0.02); fb(0.04, h, u1 - 0.02, h / 2 + 0.02);
          fb(w - 0.08, 0.03, (u0 + u1) / 2, 1.0);   // Querholm in Griffhöhe
          const g = part(new THREE.BoxGeometry(w - 0.08, h - 0.08, 0.012), COL.glas, M((u0 + u1) / 2, h / 2 + 0.02, zc, 1), 0, seed + 40 + j); gl.push(g);
        });
        const mk = (arr, mat, j, glass) => { const m = new THREE.Mesh(merge(arr), mat); m.userData.pi = i; m.castShadow = !glass; m.receiveShadow = !glass; if (glass) m.renderOrder = 2; return m; };
        // je Flügel eine Gruppe (Rahmen + Glas), damit sie sich getrennt verschieben lassen
        const leaves = [0, 1].map((j) => { const grp = new THREE.Group(), n = fr.length / 2; grp.add(mk(fr.slice(j * n, (j + 1) * n), MAT, j, false)); grp.add(mk([gl[j]], GLASS, j, true)); pv.add(grp); return grp; });
        out.group.add(pv);
        const door = { pivot: pv, auto: true, leaves: leaves, open: 0, want: 0, l: l, ax: E.ax + E.ux * 0.1, az: E.az + E.uz * 0.1, bx: E.ax + E.ux * 0.9, bz: E.az + E.uz * 0.9, ux: E.ux, uz: E.uz, nx: E.nx, nz: E.nz, cx: E.ax + E.ux * 0.5, cz: E.az + E.uz * 0.5 };
        out.doors.push(door);
        out.segs.push({ ax: E.ax, az: E.az, bx: E.ax + E.ux * 0.1, bz: E.az + E.uz * 0.1, l: l, y1: y0 + LH });
        out.segs.push({ ax: E.ax + E.ux * 0.9, az: E.az + E.uz * 0.9, bx: E.ax + E.ux, bz: E.az + E.uz, l: l, y1: y0 + LH });
        out.segs.push({ ax: door.ax, az: door.az, bx: door.bx, bz: door.bz, l: l, y1: y0 + LH, door: door });
      } else if (def2.door) {
        const pv = new THREE.Group(); pv.position.set(E.ax + E.ux * 0.12, y0, E.az + E.uz * 0.12); pv.rotation.y = Math.atan2(-E.uz, E.ux);
        const leaf = merge([part(new THREE.BoxGeometry(0.76, 2.08, 0.045), def2.plank ? COL.holzd : COL.holz, M(0.38, 1.04, 0, 1), 0, seed + 7),
          part(new THREE.BoxGeometry(0.03, 0.03, 0.12), COL.metall, M(0.66, 1.0, 0, 1), 0, seed + 8)]);
        const lm = new THREE.Mesh(leaf, MAT); lm.userData.pi = i; lm.castShadow = true; lm.receiveShadow = true; pv.add(lm); out.group.add(pv);
        const door = { pivot: pv, open: 0, want: 0, l: l, ax: E.ax + E.ux * 0.12, az: E.az + E.uz * 0.12, bx: E.ax + E.ux * 0.88, bz: E.az + E.uz * 0.88, ux: E.ux, uz: E.uz, nx: E.nx, nz: E.nz, cx: E.ax + E.ux * 0.5, cz: E.az + E.uz * 0.5 };
        out.doors.push(door); out.acts.push({ type: "tuer", x: door.cx, z: door.cz, l: l, door: door });
        out.segs.push({ ax: E.ax, az: E.az, bx: E.ax + E.ux * 0.12, bz: E.az + E.uz * 0.12, l: l, y1: y0 + LH });
        out.segs.push({ ax: E.ax + E.ux * 0.88, az: E.az + E.uz * 0.88, bx: E.ax + E.ux, bz: E.az + E.uz, l: l, y1: y0 + LH });
        out.segs.push({ ax: door.ax, az: door.az, bx: door.bx, bz: door.bz, l: l, y1: y0 + LH, door: door });
      } else out.segs.push({ ax: E.ax, az: E.az, bx: E.ax + E.ux, bz: E.az + E.uz, l: l, y1: y0 + (def2.rail || def2.fence ? 1 : def2.hedge ? 1.3 : def2.quarter ? LH / 4 + 0.04 : LH), rail: !!(def2.rail || def2.fence), th: def2.hedge ? 0.28 : def2.fence ? 0.05 : undefined, win: !!def2.win, garden: !!gard });
    } else if (def2.kind === "roof") { roofParts(def2, x, z, y0, r, s, seed, list); for (let k = 0; k < l; k++) out.cover.add(cellKey(x, z, k)); ext(x, z); ext(x + 1, z + 1); out.top = Math.max(out.top, y0 + (s + 1) * (def2.rise || 1) + 0.2); if (def2.flat) out.cells.add(cellKey(x, z, l)); }
    else if (def2.kind === "deco") { awningParts(def2, edgeOf(x, z, r), y0, f, seed, list); }
    else if (def2.kind === "gable") { const E = edgeOf(x, z, r); gableParts(def2, E, y0, s, f, seed, list); out.top = Math.max(out.top, y0 + (s + 1) * (def2.rise || 1)); }
    else if (def2.kind === "obj") {
      const ps = objParts(id, seed), g = merge(ps), m = new THREE.Matrix4().makeTranslation(x + 0.5, y0 + FLOOR, z + 0.5).multiply(new THREE.Matrix4().makeRotationY(-r * Math.PI / 2));
      g.applyMatrix4(m); g.deleteAttribute("normal"); list.push(g);
      if (def2.box) { const w = r & 1 ? def2.box[1] : def2.box[0], d = r & 1 ? def2.box[0] : def2.box[1]; out.boxes.push({ cx: x + 0.5, cz: z + 0.5, hw: w / 2, hd: d / 2, l: l, y1: y0 + 1 }); }
      if (def2.act) { const fx = [0, -1, 0, 1][r], fz = [1, 0, -1, 0][r]; out.acts.push({ type: def2.act, x: x + 0.5 + fx * 0.75, z: z + 0.5 + fz * 0.75, l: l, cx: x + 0.5, cz: z + 0.5, fx: fx, fz: fz, y: y0 + FLOOR, pi: i, lager: def2.lager || null, laden: def2.laden || null, id: id }); }   // Stelle vor dem Möbel (vorne = Seite des Nutzers)
      // Sitzplätze (seit v0.16): Platz (sx, sz), Blickrichtung (fx, fz), Sitzhöhe h (im Haus). Ansprechen etwas vor dem Platz
      if (def2.sit) def2.sit.forEach((q) => {
        const ro = (vx, vz) => { const a = -r * Math.PI / 2, c = Math.cos(a), sn = Math.sin(a); return [vx * c + vz * sn, -vx * sn + vz * c]; };
        const ps = ro(q[0], q[1]), f = ro(q[2], q[3]), sx = x + 0.5 + ps[0], sz = z + 0.5 + ps[1];
        out.acts.push({ type: "sitzen", x: sx + f[0] * 0.35, z: sz + f[1] * 0.35, l: l, sx: sx, sz: sz, fx: Math.round(f[0] * 1e6) / 1e6, fz: Math.round(f[1] * 1e6) / 1e6, y: y0 + FLOOR, h: y0 + FLOOR + q[4], pi: i, id: id });
      });
    }
    out.top = Math.max(out.top, y0 + LH);
    for (let k = n0; k < list.length; k++) list[k].userData.pi = i;   // Bauteil-Nummer je Netzstück (Bulldozer im Haus-Editor)
  });
  // Stuhl am Schreibtisch (seit v0.16): gehört zum Laptop – beim Öffnen setzt sich die Figur automatisch darauf, mit E nicht einzeln benutzbar
  out.acts.filter((a) => a.type === "lernen").forEach((a) => {
    let best = null, bd = 1.0;
    out.acts.forEach((s) => { if (s.type !== "sitzen" || s.l !== a.l || s.desk) return; const d = Math.hypot(s.sx - a.x, s.sz - a.z); if (d < bd) { bd = d; best = s; } });
    if (best) { best.desk = true; a.seat = best; }
  });
  // Eckpfosten
  Object.keys(posts).forEach((k) => { const v = k.split(",").map(Number), P = posts[k]; L(v[2]).push(part(new THREE.BoxGeometry(WT, P.h, WT), P.c, M(v[0], v[2] * LH + P.h / 2, v[1], 1), 0, v[0] * 7 + v[1] * 3)); });
  Object.keys(rposts).forEach((k) => { if (posts[k]) return; const v = k.split(",").map(Number); L(v[2]).push(part(new THREE.BoxGeometry(0.08, 1.02, 0.08), rposts[k], M(v[0], v[2] * LH + 0.51, v[1], 1), 0, v[0] * 5 + v[1] * 11)); });
  const poolMesh = pools.length ? poolParts(pools, L) : null;   // Pool-Becken (seit v0.21.1)
  Object.keys(per).forEach((l) => {
    const all = per[l], arr = all.filter((g) => !g.userData.glass), gl = all.filter((g) => g.userData.glass); if (!all.length) return;
    const grp = new THREE.Group(); grp.userData.l = +l;
    if (arr.length) { const mesh = new THREE.Mesh(mergeAny(arr), o.mat || MAT); mesh.castShadow = true; mesh.receiveShadow = true; mesh.userData.ranges = ranges(arr); grp.add(mesh); }
    // Fensterglas: halb durchsichtig, wirft keinen Schatten → Sonnenlicht fällt durchs Fenster ins Zimmer
    if (gl.length) { const gm = new THREE.Mesh(mergeAny(gl), o.mat || GLASS); gm.castShadow = false; gm.receiveShadow = false; gm.renderOrder = 2; gm.userData.ranges = ranges(gl); grp.add(gm); }
    if (poolMesh && poolMesh[l]) poolMesh[l].forEach((m) => grp.add(m));
    out.levels[l] = grp; out.group.add(grp);
  });
  if (out.min[0] > out.max[0]) { out.min = [0, 0]; out.max = [1, 1]; }
  if (out.min2[0] > out.max2[0]) { out.min2 = out.min.slice(); out.max2 = out.max.slice(); }
  return out;
}
// Grundstück als Rechteck [x0, z0, x1, z1] (lokal): alle Grundstücks-Zellen + das Haus; ohne Grundstück: Haus + 2 m
export function plotRect(def, b) {
  const P = (def && def.plot) || [];
  if (!P.length) return [b.min[0] - 2, b.min[1] - 2, b.max[0] + 2, b.max[1] + 2];
  let x0 = b.min[0], z0 = b.min[1], x1 = b.max[0], z1 = b.max[1];
  P.forEach((c) => { x0 = Math.min(x0, c[0]); z0 = Math.min(z0, c[1]); x1 = Math.max(x1, c[0] + 1); z1 = Math.max(z1, c[1] + 1); });
  return [x0, z0, x1, z1];
}
// Welche Ecken (Vertex-Bereiche) zu welchem Bauteil gehören: [[erster Vertex, Bauteil-Nummer], …]
function ranges(arr) { const r = []; let v = 0; arr.forEach((g) => { r.push([v, g.userData.pi == null ? -1 : g.userData.pi]); v += g.attributes.position.count; }); return r; }
export function partAt(mesh, face) { const R = mesh.userData.ranges; if (!R) return -1; const v = face * 3; let pi = -1; for (const q of R) { if (q[0] <= v) pi = q[1]; else break; } return pi; }
const INVIS = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }), INVIS_GLASS = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
export const GLASS = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide });
// merge() aus models.js erwartet Teile ohne Normalen; vorbereitete Möbel-Netze haben schon Position + Farbe
function mergeAny(arr) { return merge(arr.map((g) => { if (g.attributes.normal) g.deleteAttribute("normal"); return g; })); }

// ---------- Zaun / Hecke ums Grundstück (seit v0.17, ausgelagert v0.18) ----------
// Gibt { parts, plot, n } zurück: alte Zäune/Hecken entfernt, neue auf dem Grundstücksrand (Etage 0), Kanten mit Hauswand ausgelassen,
// vor der ersten Tür 2 m Eingang frei. Ohne Grundstück: erst ums Haus +2 m. Benutzt vom Haus-Editor und für das Starterhaus (haeuser.js).
export function gardenParts(def, id) {
    const d = { parts: (def.parts || []).slice(), plot: (def.plot || []).map((c) => [c[0], c[1]]) }, PS = d.parts;
    if (!(d.plot || []).length) { const b = buildHouse(d), R = [Math.floor(b.min[0]) - 2, Math.floor(b.min[1]) - 2, Math.ceil(b.max[0]) + 1, Math.ceil(b.max[1]) + 1]; d.plot = []; for (let x = R[0]; x <= R[2]; x++) for (let z = R[1]; z <= R[3]; z++) d.plot.push([x, z]); }
    // Löcher im Grundstück auffüllen (einzelne fehlende Zellen innen), sonst wächst die Hecke um sie herum ins Haus
    { const S = new Set(d.plot.map((c) => c[0] + "," + c[1])), xs = d.plot.map((c) => c[0]), zs = d.plot.map((c) => c[1]);
      const x0 = Math.min(...xs) - 1, x1 = Math.max(...xs) + 1, z0 = Math.min(...zs) - 1, z1 = Math.max(...zs) + 1, out = new Set(), st = [[x0, z0]];
      while (st.length) { const [x, z] = st.pop(), k = x + "," + z; if (x < x0 || x > x1 || z < z0 || z > z1 || out.has(k) || S.has(k)) continue; out.add(k); st.push([x + 1, z], [x - 1, z], [x, z + 1], [x, z - 1]); }
      for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) { const k = x + "," + z; if (!S.has(k) && !out.has(k)) d.plot.push([x, z]); } }
    d.parts = PS.filter((p) => !(PARTS[p[0]] && (PARTS[p[0]].fence || PARTS[p[0]].hedge)));
    const plot = new Set(d.plot.map((c) => c[0] + "," + c[1])), walls = new Set(), floors = new Set();
    d.parts.forEach((p) => { const k = PARTS[p[0]]; if (!k || (p[4] | 0) !== 0) return; if (k.kind === "wall") walls.add(edgeKey(p[1], p[2], p[3], 0)); if (k.kind === "floor") floors.add(p[1] + "," + p[2]); });
    const NB = [[0, -1], [1, 0], [0, 1], [-1, 0]], edges = [];
    d.plot.forEach((c) => { for (let r = 0; r < 4; r++) { if (plot.has((c[0] + NB[r][0]) + "," + (c[1] + NB[r][1]))) continue; const k = edgeKey(c[0], c[1], r, 0); if (!walls.has(k)) edges.push([c[0], c[1], r]); } });
    // Eingang: Haustür (erste Tür auf Etage 0) → nach außen zeigende Seite, dort die Randkante(n) direkt davor freilassen
    const door = d.parts.find((p) => PARTS[p[0]] && PARTS[p[0]].door && (p[4] | 0) === 0);
    let r0 = 2, cx = null;
    if (door) { const inC = floors.has(door[1] + "," + door[2]); r0 = inC ? door[3] & 3 : (door[3] + 2) & 3; const E = [[0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5]][door[3] & 3]; cx = [door[1] + E[0], door[2] + E[1]]; }
    const side = edges.filter((e) => e[2] === r0);
    if (side.length) {
      if (!cx) { const xs = side.map((e) => (r0 & 1 ? e[1] : e[0])); const mid = (Math.min(...xs) + Math.max(...xs) + 1) / 2; cx = r0 & 1 ? [0, mid] : [mid, 0]; }
      const lat = (e) => (r0 & 1 ? Math.abs(e[1] + 0.5 - cx[1]) : Math.abs(e[0] + 0.5 - cx[0])), dist = (e) => (r0 & 1 ? Math.abs(e[0] - cx[0]) : Math.abs(e[2] === 0 ? e[1] - cx[1] : e[1] + 1 - cx[1]));
      const front = side.filter((e) => lat(e) < 1.6).sort((a, b) => dist(a) - dist(b) || lat(a) - lat(b));
      const g1 = front[0]; if (g1) { const line = side.filter((e) => (r0 & 1 ? e[0] === g1[0] : e[1] === g1[1])).sort((a, b) => lat(a) - lat(b)); const gap = new Set(line.slice(0, 2).map((e) => e.join(","))); for (let i = edges.length - 1; i >= 0; i--) if (gap.has(edges[i].join(","))) edges.splice(i, 1); }
    }
    edges.forEach((e) => d.parts.push([id, e[0], e[1], e[2], 0]));
    return { parts: d.parts, plot: d.plot, n: edges.length };
  }

// ---------- Haus in der Welt ----------
// Eintrag in der Szene: { k: "starter" (fest) oder "lokal:<name>", d: Hausdaten (bei lokalen Häusern), x, z, y, a (Grad), home }
export class HouseInst {
  constructor(entry, def) {
    this.e = entry; this.def = def; this.b = buildHouse(def);
    // Mitte der Grundfläche = Drehpunkt
    this.ox = (this.b.min[0] + this.b.max[0]) / 2; this.oz = (this.b.min[1] + this.b.max[1]) / 2;
    this.hw = (this.b.max[0] - this.b.min[0]) / 2; this.hd = (this.b.max[1] - this.b.min[1]) / 2;
    this.pr = plotRect(def, this.b);
    this.root = new THREE.Group(); this.inner = this.b.group; this.inner.position.set(-this.ox, 0, -this.oz); this.root.add(this.inner);
    this.place();
  }
  place() { const e = this.e; this.root.position.set(e.x, e.y, e.z); this.root.rotation.y = -(e.a || 0) * Math.PI / 180; this.root.updateMatrixWorld(true); this.ca = Math.cos((e.a || 0) * Math.PI / 180); this.sa = Math.sin((e.a || 0) * Math.PI / 180); }
  // Welt → Haus-Raster (lokal) und zurück
  // passend zur Drehung des Modells (rotation.y = −a): Welt = (x·cos a − z·sin a, x·sin a + z·cos a). Bis v0.17 lief die Umrechnung andersherum,
  // dadurch lagen Kollision, Türen und Möbel-Interaktionen bei gedrehten Häusern (außer 0°/180°) gespiegelt (Hotfix v0.18)
  toLocal(x, z) { const dx = x - this.e.x, dz = z - this.e.z; return { x: dx * this.ca + dz * this.sa + this.ox, z: -dx * this.sa + dz * this.ca + this.oz }; }
  toWorld(x, z) { const dx = x - this.ox, dz = z - this.oz; return { x: this.e.x + dx * this.ca - dz * this.sa, z: this.e.z + dx * this.sa + dz * this.ca }; }
  dirToWorld(x, z) { return { x: x * this.ca - z * this.sa, z: x * this.sa + z * this.ca }; }
  dirToLocal(x, z) { return { x: x * this.ca + z * this.sa, z: -x * this.sa + z * this.ca }; }
  // Bodenzelle unter (Welt-)Punkt auf Etage l?
  floorAt(x, z, l) { const p = this.toLocal(x, z); return this.b.cells.has(cellKey(Math.floor(p.x), Math.floor(p.z), l || 0)); }
  // auf dem Grundstück? (Pflanzen wachsen dort nicht)
  onPlot(x, z, m) { const p = this.toLocal(x, z), R = this.pr, r = m || 0; return p.x > R[0] - r && p.x < R[2] + r && p.z > R[1] - r && p.z < R[3] + r; }
  // überdachte Zelle (drinnen) auf Etage l?
  coveredAt(x, z, l) { const p = this.toLocal(x, z); return this.b.cover.has(cellKey(Math.floor(p.x), Math.floor(p.z), l || 0)); }
  // Haus inkl. Zaun und Hecke (+ Rand) enthält Punkt? (Kollision, Kamera)
  reach(x, z, m) { const p = this.toLocal(x, z), r = m || 0, b = this.b; return p.x > b.min2[0] - r && p.x < b.max2[0] + r && p.z > b.min2[1] - r && p.z < b.max2[1] + r; }
  // Grundfläche (+ Rand) enthält Punkt?
  contains(x, z, m) { const p = this.toLocal(x, z), r = m || 0; return p.x > this.b.min[0] - r && p.x < this.b.max[0] + r && p.z > this.b.min[1] - r && p.z < this.b.max[1] + r; }
  // Gelände-Einbettung: in der Grundfläche + 1,5 m flach auf Haushöhe, danach 7 m weicher Übergang
  // seit v0.14: das ganze Grundstück (Rechteck um alle Grundstücks-Zellen und das Haus) + 0,5 m ist flach
  carve(x, z) {
    const p = this.toLocal(x, z), R = this.pr, dx = Math.max(R[0] - 0.5 - p.x, 0, p.x - R[2] - 0.5), dz = Math.max(R[1] - 0.5 - p.z, 0, p.z - R[3] - 0.5), d = Math.hypot(dx, dz);
    if (d >= 7) return null; const k = d / 7; return { h: this.e.y - 0.04, w: 1 - k * k * (3 - 2 * k) };
  }
  // Etagen ab l+1 ausblenden (wer drin steht, sieht ins Haus)
  // Ausgeblendete Etagen bleiben als „Schattenwerfer“ da (unsichtbares Material, wirft aber Schatten):
  // so liegt das Zimmer im Schatten des Dachs und nur durch die Fenster fällt Sonnenlicht (seit v0.13)
  cutAbove(l) {
    if (this.cutL === l) return; this.cutL = l;
    const set = (o, cut) => o.traverse((m) => { if (!m.isMesh) return; if (!m.userData.mat0) m.userData.mat0 = m.material; m.material = cut ? (m.userData.mat0 === GLASS ? INVIS_GLASS : INVIS) : m.userData.mat0; });
    Object.keys(this.b.levels).forEach((k) => { const cut = l != null && +k > l; this.b.levels[k].userData.cut = cut; set(this.b.levels[k], cut); });
    this.b.doors.forEach((d) => set(d.pivot, l != null && d.l > l));
  }
  update(dt, pl) {
    // Automatik-Schiebetür (seit v0.19.7): öffnet, wenn der Spieler (pl, Welt-Position) in 1,7 m vor oder hinter der Tür und auf gleicher Etage steht; zwei Flügel laufen auseinander
    this.b.doors.forEach((d) => {
      if (!d.auto) return;
      let want = 0;
      if (pl && this.reach(pl.x, pl.z, 3)) { const q = this.toLocal(pl.x, pl.z), dx = q.x - d.cx, dz = q.z - d.cz, py = pl.y - this.e.y; if (Math.abs(dx * d.ux + dz * d.uz) < 0.95 && Math.abs(dx * d.nx + dz * d.nz) < 1.7 && py > d.l * LH - 0.7 && py < d.l * LH + LH - 0.6) want = 1; }
      d.want = want; d.open += Math.max(-dt * 1.8, Math.min(dt * 1.8, want - d.open));
      d.leaves[0].position.x = -0.4 * d.open; d.leaves[1].position.x = 0.4 * d.open;
    });
    // Tür schwingt in die Zelle hinein, an der sie gesetzt wurde (weg von der Normalen n)
    this.b.doors.forEach((d) => { if (d.auto) return; d.open += Math.max(-dt * 2.6, Math.min(dt * 2.6, d.want - d.open)); const ph = d.open * 1.75, c = Math.cos(ph), s = Math.sin(ph), dx = d.ux * c - d.nx * s, dz = d.uz * c - d.nz * s; d.pivot.rotation.y = Math.atan2(-dz, dx); });
  }
  dispose() { this.root.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); if (this.root.parent) this.root.parent.remove(this.root); }
}
