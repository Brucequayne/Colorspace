// ===== houses.js · Haus-Bauteile, Hausbau aus Bauteilen, Kollision, Türen, Interaktionen =====
// Ein Haus ist eine Liste von Bauteilen auf einem Raster (1 Zelle = 1 m, eine Etage = 2,8 m):
//   { v: 1, name: "Starterhaus", parts: [[id, x, z, r, etage, stufe, spiegeln], …] }
// Zellen-Teile (Boden, Dach, Möbel) liegen in Zelle (x, z), r = Drehung in 90°-Schritten.
// Kanten-Teile (Wände, Fenster, Türen, Giebel) liegen auf einer Kante der Zelle: r 0 = Norden (z klein), 1 = Osten, 2 = Süden, 3 = Westen.
// stufe: Höhe von Dachschrägen und Giebeln (je Stufe 1 m höher). spiegeln: Giebel steigt in die andere Richtung.
// Etage: Teile auf Etage 1 liegen auf den Wänden der Etage 0 (Decke/Dach). Wer im Haus steht, sieht alles darüber nicht.
import * as THREE from "three";
import { L2, tl, hash2 } from "le/core.js";
import { part, merge, M } from "le/models.js";

export const CELL = 1, LH = 2.8, FLOOR = 0.12, WT = 0.14;   // Zelle, Etagenhöhe, Bodendicke, Wanddicke

// Farben (Palette: Stein, Petrol, Stahlblau, Koralle, Schiefer + Holz/Ziegel)
const COL = { putz: "#D9D6CC", ziegel: "#A9533F", holz: "#8A6142", holzd: "#5E4330", rahmen: "#ECEAE4", glas: "#7FB4C4", schiefer: "#475657", terra: "#B4583F",
  boden: "#9C7552", fliese: "#C6C5B9", beton: "#8E918F", teppich: "#4A6D7C", platten: "#A3A49C", metall: "#5A5F63", dunkel: "#2B2E30", stoff: "#62929E", koralle: "#ED6A5E", weiss: "#F2F0EA", gruen: "#5D8A4E" };

// Bauteil-Katalog. kind: floor (Zelle), wall (Kante), roof (Zelle, Stufe), gable (Kante, Stufe), obj (Zelle, Drehung)
// box: Kollision [Breite, Tiefe] in m (lokal, vor der Drehung), act: Interaktion
export const PARTS = {
  // Böden
  "boden-holz": { kind: "floor", cat: "floor", n: L2("Holzboden", "Wooden floor"), c: COL.boden, plank: true },
  "boden-fliese": { kind: "floor", cat: "floor", n: L2("Fliesen", "Tiles"), c: COL.fliese, tile: true },
  "boden-beton": { kind: "floor", cat: "floor", n: L2("Beton", "Concrete"), c: COL.beton },
  "boden-teppich": { kind: "floor", cat: "floor", n: L2("Teppichboden", "Carpet"), c: COL.teppich },
  "boden-platten": { kind: "floor", cat: "floor", n: L2("Steinplatten (Terrasse)", "Paving (terrace)"), c: COL.platten, tile: true },
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
  // Dach
  "dach-flach": { kind: "roof", cat: "roof", n: L2("Flachdach / Decke", "Flat roof / ceiling"), c: COL.beton, flat: true },
  "dach-schiefer": { kind: "roof", cat: "roof", n: L2("Dachschräge Schiefer", "Roof slope slate"), c: COL.schiefer },
  "dach-rot": { kind: "roof", cat: "roof", n: L2("Dachschräge Ziegelrot", "Roof slope red"), c: COL.terra },
  "giebel-putz": { kind: "gable", cat: "roof", n: L2("Giebel Putz", "Gable plaster"), c: COL.putz },
  "giebel-ziegel": { kind: "gable", cat: "roof", n: L2("Giebel Ziegel", "Gable brick"), c: COL.ziegel },
  "giebel-holz": { kind: "gable", cat: "roof", n: L2("Giebel Holz", "Gable wood"), c: COL.holz },
  // Möbel
  "schreibtisch": { kind: "obj", cat: "obj", n: L2("Schreibtisch mit Laptop (Lernen)", "Desk with laptop (learning)"), box: [1.2, 0.62], act: "lernen" },
  "stuhl": { kind: "obj", cat: "obj", n: L2("Stuhl", "Chair"), box: null },
  "bett": { kind: "obj", cat: "obj", n: L2("Bett", "Bed"), box: [0.95, 2.0] },
  "regal": { kind: "obj", cat: "obj", n: L2("Regal", "Shelf"), box: [0.9, 0.35] },
  "schrank": { kind: "obj", cat: "obj", n: L2("Kleiderschrank", "Wardrobe"), box: [0.95, 0.55] },
  "sofa": { kind: "obj", cat: "obj", n: L2("Sofa", "Sofa"), box: [1.8, 0.85] },
  "tisch": { kind: "obj", cat: "obj", n: L2("Tisch", "Table"), box: [1.2, 0.8] },
  "kuehlschrank": { kind: "obj", cat: "obj", n: L2("Kühlschrank", "Fridge"), box: [0.6, 0.6] },
  "lampe": { kind: "obj", cat: "obj", n: L2("Stehlampe", "Floor lamp"), box: null },
  "pflanze": { kind: "obj", cat: "obj", n: L2("Zimmerpflanze", "House plant"), box: null },
  "teppich": { kind: "obj", cat: "obj", n: L2("Teppich", "Rug"), box: null }
};
export const CATS = [["floor", L2("Böden", "Floors")], ["wall", L2("Wände", "Walls")], ["roof", L2("Dach", "Roof")], ["obj", L2("Möbel", "Furniture")]];
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

// Wand mit Fenster/Tür/Geländer. Wandstücke laufen von t/2 bis 1 - t/2, die Ecken füllen Pfosten.
function wallParts(def, E, y0, seed, out) {
  const t = WT, H = LH, a = t / 2, b = 1 - t / 2, c = def.c;
  if (def.rail) {
    bx(out, E, a, b, y0 + 0.92, y0 + 1.0, 0.07, c, 0, seed);
    for (let k = 0; k < 4; k++) { const u = a + 0.08 + k * (b - a - 0.16) / 3; bx(out, E, u - 0.025, u + 0.025, y0, y0 + 0.92, 0.05, c, 0, seed + k); }
    return;
  }
  if (def.door) {
    const d0 = 0.12, d1 = 0.88, top = 2.12;
    bx(out, E, a, d0, y0, y0 + H, t, c, 0, seed); bx(out, E, d1, b, y0, y0 + H, t, c, 0, seed + 1); bx(out, E, d0, d1, y0 + top, y0 + H, t, c, 0, seed + 2);
    // Zarge
    bx(out, E, d0, d0 + 0.04, y0, y0 + top, t + 0.03, COL.rahmen, 0, seed + 3); bx(out, E, d1 - 0.04, d1, y0, y0 + top, t + 0.03, COL.rahmen, 0, seed + 4); bx(out, E, d0, d1, y0 + top - 0.04, y0 + top, t + 0.03, COL.rahmen, 0, seed + 5);
    return;
  }
  if (def.win) {
    const w0 = 0.2, w1 = 0.8, lo = 0.95, hi = 2.05;
    bx(out, E, a, w0, y0, y0 + H, t, c, 0, seed); bx(out, E, w1, b, y0, y0 + H, t, c, 0, seed + 1);
    bx(out, E, w0, w1, y0, y0 + lo, t, c, 0, seed + 2); bx(out, E, w0, w1, y0 + hi, y0 + H, t, c, 0, seed + 3);
    bx(out, E, w0, w1, y0 + lo - 0.05, y0 + lo, t + 0.1, COL.rahmen, 0, seed + 4);   // Fensterbank
    bx(out, E, w0, w0 + 0.04, y0 + lo, y0 + hi, t * 0.6, COL.rahmen, 0, seed + 5); bx(out, E, w1 - 0.04, w1, y0 + lo, y0 + hi, t * 0.6, COL.rahmen, 0, seed + 6);
    bx(out, E, w0, w1, y0 + hi - 0.04, y0 + hi, t * 0.6, COL.rahmen, 0, seed + 7); bx(out, E, 0.48, 0.52, y0 + lo, y0 + hi, t * 0.5, COL.rahmen, 0, seed + 8);
    bx(out, E, w0 + 0.04, w1 - 0.04, y0 + lo, y0 + hi - 0.04, 0.02, COL.glas, 0, seed + 9); out[out.length - 1].userData.glass = true;   // Glas: eigenes Netz, lässt Sonnenlicht durch
    return;
  }
  bx(out, E, a, b, y0, y0 + H, t, c, 0, seed);
  if (def.brick || def.plank) {   // leichte Fugen: zwei dunklere Streifen auf beiden Seiten
    const sc = shade(c, 0.82);
    for (let k = 1; k <= (def.brick ? 6 : 4); k++) { const yy = y0 + k * H / (def.brick ? 7 : 5); bx(out, E, a, b, yy - 0.012, yy + 0.012, t + 0.012, sc, 0, seed + 10 + k); }
  }
}
function floorParts(def, x, z, y0, seed, out) {
  out.push(part(new THREE.BoxGeometry(1, FLOOR, 1), def.c, M(x + 0.5, y0 + FLOOR / 2, z + 0.5, 1), 0, seed));
  if (def.plank) for (let k = 1; k < 5; k++) out.push(part(new THREE.BoxGeometry(1, 0.006, 0.012), shade(def.c, 0.78), M(x + 0.5, y0 + FLOOR + 0.002, z + k / 5, 1), 0, seed + k));
  if (def.tile) { out.push(part(new THREE.BoxGeometry(1, 0.006, 0.014), shade(def.c, 0.8), M(x + 0.5, y0 + FLOOR + 0.002, z + 0.5, 1), 0, seed + 1)); out.push(part(new THREE.BoxGeometry(0.014, 0.006, 1), shade(def.c, 0.8), M(x + 0.5, y0 + FLOOR + 0.002, z + 0.5, 1), 0, seed + 2)); }
}
// Dachschräge: steigt in Richtung r (0 = nach Norden, 1 = Osten, 2 = Süden, 3 = Westen) um 1 m je Zelle
const RISE = [[0, -1], [1, 0], [0, 1], [-1, 0]];
function roofParts(def, x, z, y0, r, s, seed, out) {
  if (def.flat) { out.push(part(new THREE.BoxGeometry(1, 0.16, 1), def.c, M(x + 0.5, y0 + 0.08, z + 0.5, 1), 0, seed)); return; }
  const d = RISE[r & 3], th = 0.12, L = Math.SQRT2;
  const g = new THREE.BoxGeometry(1.02, th, L + 0.04);
  const m = new THREE.Matrix4().makeRotationX(-Math.PI / 4);   // kippt die lange Seite (z): steigt in +z
  const rot = new THREE.Matrix4().makeRotationY(Math.atan2(d[0], d[1]));   // +z zeigt in Steigrichtung
  const tr = new THREE.Matrix4().makeTranslation(x + 0.5, y0 + s + 0.5 + th * 0.7, z + 0.5);
  out.push(part(g, def.c, tr.multiply(rot).multiply(m), 0, seed));
  // Ziegelreihen
  for (let k = 0; k < 3; k++) {
    const g2 = new THREE.BoxGeometry(1.02, 0.03, 0.05), f = (k + 0.5) / 3 - 0.5;
    const m2 = new THREE.Matrix4().makeTranslation(0, th / 2 + 0.01, f * L).premultiply(new THREE.Matrix4().makeRotationX(-Math.PI / 4));
    const tr2 = new THREE.Matrix4().makeTranslation(x + 0.5, y0 + s + 0.5 + th * 0.7, z + 0.5).multiply(new THREE.Matrix4().makeRotationY(Math.atan2(d[0], d[1]))).multiply(m2);
    out.push(part(g2, shade(def.c, 0.8), tr2, 0, seed + k + 1));
  }
}
// Giebel: Fläche unter einer Dachschräge, auf einer Kante. Steigt entlang der Kante (f = 1: in die andere Richtung)
function gableParts(def, E, y0, s, f, seed, out) {
  const sh = new THREE.Shape(), lo = s, hi = s + 1;
  if (!f) { sh.moveTo(0, 0); sh.lineTo(1, 0); sh.lineTo(1, hi); sh.lineTo(0, lo); }
  else { sh.moveTo(0, 0); sh.lineTo(1, 0); sh.lineTo(1, lo); sh.lineTo(0, hi); }
  sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: WT, bevelEnabled: false });
  g.translate(0, 0, -WT / 2);
  const ang = Math.atan2(-E.uz, E.ux), m = M(E.ax, y0, E.az, 1, 1, 1, ang);
  out.push(part(g, def.c, m, 0, seed));
}
// Möbel (lokal um die Zellmitte, vorne = +z)
function objParts(id, seed) {
  const P = [], B = (w, h, d, x, y, z, c, ry) => P.push(part(new THREE.BoxGeometry(w, h, d), c, M(x, y, z, 1, 1, 1, ry || 0), 0, seed + P.length));
  const Cy = (r0, r1, h, x, y, z, c, n) => P.push(part(new THREE.CylinderGeometry(r0, r1, h, n || 8), c, M(x, y, z, 1), 0, seed + P.length));
  if (id === "schreibtisch") {
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
  } else if (id === "teppich") {
    B(1.6, 0.012, 1.1, 0, 0.006, 0, COL.koralle); B(1.4, 0.014, 0.9, 0, 0.007, 0, shade(COL.koralle, 0.82));
  }
  return P;
}

// ---------- Haus aus Bauteilen bauen ----------
// Ergebnis: group (Etagen-Gruppen levels[l]), Türen, Kollisions-Strecken, Kästen, Interaktionen, Bodenzellen, Grundfläche
export const MAT = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
export function buildHouse(def, opts) {
  const o = opts || {}, parts = (def && def.parts) || [];
  const per = {}, posts = {}, out = { group: new THREE.Group(), levels: {}, doors: [], segs: [], boxes: [], acts: [], cells: new Set(), cover: new Set(), min: [1e9, 1e9], max: [-1e9, -1e9], top: 0 };
  const L = (l) => per[l] || (per[l] = []);
  const ext = (x, z) => { out.min[0] = Math.min(out.min[0], x); out.min[1] = Math.min(out.min[1], z); out.max[0] = Math.max(out.max[0], x); out.max[1] = Math.max(out.max[1], z); };
  parts.forEach((p, i) => {
    const id = p[0], def2 = PARTS[id]; if (!def2) return;
    const x = p[1] | 0, z = p[2] | 0, r = (p[3] | 0) & 3, l = p[4] | 0, s = p[5] | 0, f = p[6] | 0, y0 = l * LH, seed = (x * 73 + z * 151 + l * 37 + i) | 0, list = L(l), n0 = list.length;
    if (def2.kind === "floor") { floorParts(def2, x, z, y0, seed, list); out.cells.add(cellKey(x, z, l)); for (let k = 0; k < l; k++) out.cover.add(cellKey(x, z, k)); ext(x, z); ext(x + 1, z + 1); }
    else if (def2.kind === "wall") {
      const E = edgeOf(x, z, r); wallParts(def2, E, y0, seed, list); ext(E.ax, E.az); ext(E.ax + E.ux, E.az + E.uz);
      if (!def2.rail) { [[E.ax, E.az], [E.ax + E.ux, E.az + E.uz]].forEach((v) => { const k = v[0] + "," + v[1] + "," + l; if (!posts[k]) posts[k] = def2.c; }); }
      if (def2.door) {
        const pv = new THREE.Group(); pv.position.set(E.ax + E.ux * 0.12, y0, E.az + E.uz * 0.12); pv.rotation.y = Math.atan2(-E.uz, E.ux);
        const leaf = merge([part(new THREE.BoxGeometry(0.76, 2.08, 0.045), def2.plank ? COL.holzd : COL.holz, M(0.38, 1.04, 0, 1), 0, seed + 7),
          part(new THREE.BoxGeometry(0.03, 0.03, 0.12), COL.metall, M(0.66, 1.0, 0, 1), 0, seed + 8)]);
        const lm = new THREE.Mesh(leaf, MAT); lm.userData.pi = i; lm.castShadow = true; lm.receiveShadow = true; pv.add(lm); out.group.add(pv);
        const door = { pivot: pv, open: 0, want: 0, l: l, ax: E.ax + E.ux * 0.12, az: E.az + E.uz * 0.12, bx: E.ax + E.ux * 0.88, bz: E.az + E.uz * 0.88, ux: E.ux, uz: E.uz, nx: E.nx, nz: E.nz, cx: E.ax + E.ux * 0.5, cz: E.az + E.uz * 0.5 };
        out.doors.push(door); out.acts.push({ type: "tuer", x: door.cx, z: door.cz, l: l, door: door });
        out.segs.push({ ax: E.ax, az: E.az, bx: E.ax + E.ux * 0.12, bz: E.az + E.uz * 0.12, l: l, y1: y0 + LH });
        out.segs.push({ ax: E.ax + E.ux * 0.88, az: E.az + E.uz * 0.88, bx: E.ax + E.ux, bz: E.az + E.uz, l: l, y1: y0 + LH });
        out.segs.push({ ax: door.ax, az: door.az, bx: door.bx, bz: door.bz, l: l, y1: y0 + LH, door: door });
      } else out.segs.push({ ax: E.ax, az: E.az, bx: E.ax + E.ux, bz: E.az + E.uz, l: l, y1: y0 + (def2.rail ? 1 : LH), rail: !!def2.rail, win: !!def2.win });
    } else if (def2.kind === "roof") { roofParts(def2, x, z, y0, r, s, seed, list); for (let k = 0; k < l; k++) out.cover.add(cellKey(x, z, k)); ext(x, z); ext(x + 1, z + 1); out.top = Math.max(out.top, y0 + s + 1.2); if (def2.flat) out.cells.add(cellKey(x, z, l)); }
    else if (def2.kind === "gable") { const E = edgeOf(x, z, r); gableParts(def2, E, y0, s, f, seed, list); out.top = Math.max(out.top, y0 + s + 1); }
    else if (def2.kind === "obj") {
      const ps = objParts(id, seed), g = merge(ps), m = new THREE.Matrix4().makeTranslation(x + 0.5, y0 + FLOOR, z + 0.5).multiply(new THREE.Matrix4().makeRotationY(-r * Math.PI / 2));
      g.applyMatrix4(m); g.deleteAttribute("normal"); list.push(g);
      if (def2.box) { const w = r & 1 ? def2.box[1] : def2.box[0], d = r & 1 ? def2.box[0] : def2.box[1]; out.boxes.push({ cx: x + 0.5, cz: z + 0.5, hw: w / 2, hd: d / 2, l: l, y1: y0 + 1 }); }
      if (def2.act) { const fx = [0, -1, 0, 1][r], fz = [1, 0, -1, 0][r]; out.acts.push({ type: def2.act, x: x + 0.5 + fx * 0.75, z: z + 0.5 + fz * 0.75, l: l, cx: x + 0.5, cz: z + 0.5, fx: fx, fz: fz, y: y0 + FLOOR }); }   // Stelle vor dem Möbel (vorne = Seite des Nutzers)
    }
    out.top = Math.max(out.top, y0 + LH);
    for (let k = n0; k < list.length; k++) list[k].userData.pi = i;   // Bauteil-Nummer je Netzstück (Bulldozer im Haus-Editor)
  });
  // Eckpfosten
  Object.keys(posts).forEach((k) => { const v = k.split(",").map(Number); L(v[2]).push(part(new THREE.BoxGeometry(WT, LH, WT), posts[k], M(v[0], v[2] * LH + LH / 2, v[1], 1), 0, v[0] * 7 + v[1] * 3)); });
  Object.keys(per).forEach((l) => {
    const all = per[l], arr = all.filter((g) => !g.userData.glass), gl = all.filter((g) => g.userData.glass); if (!all.length) return;
    const grp = new THREE.Group(); grp.userData.l = +l;
    if (arr.length) { const mesh = new THREE.Mesh(mergeAny(arr), o.mat || MAT); mesh.castShadow = true; mesh.receiveShadow = true; mesh.userData.ranges = ranges(arr); grp.add(mesh); }
    // Fensterglas: halb durchsichtig, wirft keinen Schatten → Sonnenlicht fällt durchs Fenster ins Zimmer
    if (gl.length) { const gm = new THREE.Mesh(mergeAny(gl), o.mat || GLASS); gm.castShadow = false; gm.receiveShadow = false; gm.renderOrder = 2; gm.userData.ranges = ranges(gl); grp.add(gm); }
    out.levels[l] = grp; out.group.add(grp);
  });
  if (out.min[0] > out.max[0]) { out.min = [0, 0]; out.max = [1, 1]; }
  return out;
}
// Welche Ecken (Vertex-Bereiche) zu welchem Bauteil gehören: [[erster Vertex, Bauteil-Nummer], …]
function ranges(arr) { const r = []; let v = 0; arr.forEach((g) => { r.push([v, g.userData.pi == null ? -1 : g.userData.pi]); v += g.attributes.position.count; }); return r; }
export function partAt(mesh, face) { const R = mesh.userData.ranges; if (!R) return -1; const v = face * 3; let pi = -1; for (const q of R) { if (q[0] <= v) pi = q[1]; else break; } return pi; }
const INVIS = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false }), INVIS_GLASS = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
export const GLASS = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide });
// merge() aus models.js erwartet Teile ohne Normalen; vorbereitete Möbel-Netze haben schon Position + Farbe
function mergeAny(arr) { return merge(arr.map((g) => { if (g.attributes.normal) g.deleteAttribute("normal"); return g; })); }

// ---------- Haus in der Welt ----------
// Eintrag in der Szene: { k: "starter" (fest) oder "lokal:<name>", d: Hausdaten (bei lokalen Häusern), x, z, y, a (Grad), home }
export class HouseInst {
  constructor(entry, def) {
    this.e = entry; this.def = def; this.b = buildHouse(def);
    // Mitte der Grundfläche = Drehpunkt
    this.ox = (this.b.min[0] + this.b.max[0]) / 2; this.oz = (this.b.min[1] + this.b.max[1]) / 2;
    this.hw = (this.b.max[0] - this.b.min[0]) / 2; this.hd = (this.b.max[1] - this.b.min[1]) / 2;
    this.root = new THREE.Group(); this.inner = this.b.group; this.inner.position.set(-this.ox, 0, -this.oz); this.root.add(this.inner);
    this.place();
  }
  place() { const e = this.e; this.root.position.set(e.x, e.y, e.z); this.root.rotation.y = -(e.a || 0) * Math.PI / 180; this.root.updateMatrixWorld(true); this.ca = Math.cos((e.a || 0) * Math.PI / 180); this.sa = Math.sin((e.a || 0) * Math.PI / 180); }
  // Welt → Haus-Raster (lokal) und zurück
  toLocal(x, z) { const dx = x - this.e.x, dz = z - this.e.z; return { x: dx * this.ca - dz * this.sa + this.ox, z: dx * this.sa + dz * this.ca + this.oz }; }
  toWorld(x, z) { const dx = x - this.ox, dz = z - this.oz; return { x: this.e.x + dx * this.ca + dz * this.sa, z: this.e.z - dx * this.sa + dz * this.ca }; }
  dirToWorld(x, z) { return { x: x * this.ca + z * this.sa, z: -x * this.sa + z * this.ca }; }
  dirToLocal(x, z) { return { x: x * this.ca - z * this.sa, z: x * this.sa + z * this.ca }; }
  // Bodenzelle unter (Welt-)Punkt auf Etage l?
  floorAt(x, z, l) { const p = this.toLocal(x, z); return this.b.cells.has(cellKey(Math.floor(p.x), Math.floor(p.z), l || 0)); }
  // überdachte Zelle (drinnen) auf Etage l?
  coveredAt(x, z, l) { const p = this.toLocal(x, z); return this.b.cover.has(cellKey(Math.floor(p.x), Math.floor(p.z), l || 0)); }
  // Grundfläche (+ Rand) enthält Punkt?
  contains(x, z, m) { const p = this.toLocal(x, z), r = m || 0; return p.x > this.b.min[0] - r && p.x < this.b.max[0] + r && p.z > this.b.min[1] - r && p.z < this.b.max[1] + r; }
  // Gelände-Einbettung: in der Grundfläche + 1,5 m flach auf Haushöhe, danach 7 m weicher Übergang
  carve(x, z) {
    const p = this.toLocal(x, z), dx = Math.max(this.b.min[0] - 1.5 - p.x, 0, p.x - this.b.max[0] - 1.5), dz = Math.max(this.b.min[1] - 1.5 - p.z, 0, p.z - this.b.max[1] - 1.5), d = Math.hypot(dx, dz);
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
  update(dt) {
    // Tür schwingt in die Zelle hinein, an der sie gesetzt wurde (weg von der Normalen n)
    this.b.doors.forEach((d) => { d.open += Math.max(-dt * 2.6, Math.min(dt * 2.6, d.want - d.open)); const ph = d.open * 1.75, c = Math.cos(ph), s = Math.sin(ph), dx = d.ux * c - d.nx * s, dz = d.uz * c - d.nz * s; d.pivot.rotation.y = Math.atan2(-dz, dx); });
  }
  dispose() { this.root.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); if (this.root.parent) this.root.parent.remove(this.root); }
}
