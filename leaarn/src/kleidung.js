// ===== kleidung.js · Kleidung und Figur-Aufbau (seit v0.21) =====
// Kleidungsstücke: 48 Formen (Mützen, Kappen, Schals, Pullis, Mäntel, kurze, lange und Baggy-Hosen, Schuhe), jede Form in 2 Farb-/Mustervarianten.
// Jede Variante ist ein eigener Artikel (eigene Item-ID kl_<form>_<n>, kind "kleidung"), im Klamottenladen einzeln zu kaufen.
// Getragen wird über den Kleiderschrank (F): save.char.outfit = { kopf, hals, ober, jacke, hose, schuhe } (Item-IDs).
// koerper(look) baut die Teile der Spielfigur je Glied (Rumpf, Kopf, Arme, Ober-/Unterschenkel) – player.js macht daraus die Figur,
// houses.js daraus die Schaufensterpuppen. Item-IDs nie umbenennen (Spielstände)!
import * as THREE from "three";
import { L2, hash2 } from "le/core.js";
import { part, M } from "le/models.js";
import { ITEMS, inv, lager } from "le/items.js";
import { save } from "le/save.js";

// Aussehen ohne Kleidung (seit v0.13 aus dem Charakter-Editor): Oberteil, Hose, Schuhe, Haare
export const LOOK = { top: "#62929E", pants: "#4A6D7C", shoes: "#2B2E30", hair: "#3A2A20" };
export const SKIN = "#E3B38E";
const ACC = "#ED6A5E", EYE = "#2B2E30", WEISS = "#F2F0EA", METALL = "#B8B6AE", DUNKEL = "#2B2E30";

export const KL_SLOTS = ["kopf", "hals", "ober", "jacke", "hose", "schuhe"];
export const KL_SLOT_N = { kopf: L2("Kopf", "Head"), hals: L2("Hals", "Neck"), ober: L2("Oberteil", "Top"), jacke: L2("Jacke & Mantel", "Jacket & coat"), hose: L2("Hose", "Trousers"), schuhe: L2("Schuhe", "Shoes") };

function shade(c, k) { const x = new THREE.Color(c); x.multiplyScalar(k); return "#" + x.getHexString(); }
function mix(a, b, k) { const x = new THREE.Color(a); x.lerp(new THREE.Color(b), k); return "#" + x.getHexString(); }

// ---------- Kästen mit Muster ----------
// c = Farbe oder Muster { m: "streifen" | "karo" | "tarn" | "block", a, b, c }. Das Muster wird als kleine Teilkästen gebaut (Low-Poly, ohne Textur).
function pb(list, w, h, d, x, y, z, c, rx, rz, seed) {
  const base = new THREE.Matrix4().makeTranslation(x, y, z);
  if (rx) base.multiply(new THREE.Matrix4().makeRotationX(rx));
  if (rz) base.multiply(new THREE.Matrix4().makeRotationZ(rz));
  const sub = (sw, sh, ox, oy, col) => list.push(part(new THREE.BoxGeometry(sw, sh, d), col, base.clone().multiply(new THREE.Matrix4().makeTranslation(ox, oy, 0)), 0, (seed || 0) + list.length));
  if (!c || typeof c === "string") { sub(w, h, 0, 0, c || "#888888"); return; }
  if (c.m === "streifen") {
    const n = Math.max(2, Math.round(h / 0.055)), sh = h / n;
    for (let i = 0; i < n; i++) sub(w, sh, 0, -h / 2 + sh * (i + 0.5), i & 1 ? c.b : c.a);
  } else if (c.m === "karo" || c.m === "tarn") {
    const st = c.m === "karo" ? 0.06 : 0.075, nx = Math.max(2, Math.round(w / st)), ny = Math.max(2, Math.round(h / st)), sw = w / nx, sh = h / ny, cols = [c.a, c.b, c.c || shade(c.a, 0.7)];
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
      const col = c.m === "karo" ? ((i + j) & 1 ? c.b : c.a) : cols[Math.floor(hash2(i + Math.round(x * 97), j + Math.round(y * 89), 31) * 3)];
      sub(sw, sh, -w / 2 + sw * (i + 0.5), -h / 2 + sh * (j + 0.5), col);
    }
  } else if (c.m === "block") {
    sub(w, h * 0.55, 0, h * 0.225, c.a); sub(w, h * 0.45, 0, -h * 0.275, c.b);
  } else sub(w, h, 0, 0, c.a);
}
const flat = (c) => (c && typeof c === "object" ? c.a : c);

// ---------- Bausatz je Glied ----------
// Rumpf und Kopf in Körperkoordinaten (Kopf relativ zum Kopf-Drehpunkt y 1,55), Arme relativ zur Schulter, Beine relativ zu Hüfte bzw. Knie.
// s = Seite (−1 links, +1 rechts)
export function kit() {
  const S = { torso: [], head: [], armL: [], armR: [], thighL: [], thighR: [], shinL: [], shinR: [] }, f = {};
  const add = (L) => (w, h, d, x, y, z, c, rx, rz) => pb(L, w, h, d, x, y, z, c, rx, rz);
  return {
    S: S, f: f, t: add(S.torso), h: add(S.head),
    arm(fn) { fn(add(S.armL), -1); fn(add(S.armR), 1); },
    thigh(fn) { fn(add(S.thighL), -1); fn(add(S.thighR), 1); },
    shin(fn) { fn(add(S.shinL), -1); fn(add(S.shinR), 1); }
  };
}

// ---------- Formen ----------
// g = Stoff (Farbe oder Muster), b = Akzentfarbe. preis in €, laden = Ladenregal (shop.js)
const OB = (K, g, b) => {   // Grundform Pulli: Rumpf, Ärmel, Bündchen
  K.f.noTop = true; const r = shade(flat(g), 0.85);
  K.t(0.41, 0.5, 0.23, 0, 1.22, 0, g); K.t(0.412, 0.06, 0.234, 0, 1.0, 0, b || r); K.t(0.16, 0.03, 0.15, 0, 1.475, 0, b || r);
  K.arm((B) => { B(0.116, 0.4, 0.126, 0, -0.19, 0, g); B(0.12, 0.05, 0.13, 0, -0.39, 0, b || r); });
};
const HOOD = (K, g) => K.t(0.3, 0.13, 0.13, 0, 1.5, -0.085, g);
const JA = (K, g, len) => {   // Grundform Jacke/Mantel über allem: Rumpf, Ärmel, Saum bis len (Höhe der Unterkante)
  K.t(0.45, 0.54, 0.27, 0, 1.21, 0, g);
  if (len < 0.94) K.t(0.45, 0.94 - len, 0.27, 0, (0.94 + len) / 2, 0, g);
  K.arm((B) => B(0.136, 0.43, 0.146, 0, -0.2, 0, g));
};
const BTN = (K, x, y0, n, step, col) => { for (let i = 0; i < n; i++) K.t(0.025, 0.025, 0.012, x, y0 - i * step, 0.141, col); };
const HO = (K, g, o) => {   // Grundform Hose: Bund, Ober- und Unterschenkel. o: w Breite, low Unterkante, belt Gürtelfarbe
  K.f.noPants = true; const w = o.w || 0.155;
  K.t(o.w > 0.17 ? 0.4 : 0.37, 0.1, 0.21, 0, 0.95, 0, g); if (o.belt) K.t(0.375, 0.03, 0.215, 0, 0.985, 0, o.belt);
  K.thigh((B) => B(w, 0.44, w + 0.01, 0, -0.21, 0, g));
  K.shin((B) => B(w, 0.42 + (o.low || 0), w + 0.01, 0, -0.21 - (o.low || 0) / 2, 0, g));
};
const KURZ = (K, g, o) => {   // kurze Hose: endet bei y (relativ zur Hüfte), Rest Haut
  K.f.noPants = true; const w = o.w || 0.16, end = o.end;
  K.t(0.37, 0.1, 0.21, 0, 0.95, 0, g); if (o.belt) K.t(0.375, 0.03, 0.215, 0, 0.985, 0, o.belt);
  K.thigh((B) => { B(w, -end, w + 0.01, 0, end / 2, 0, g); if (end > -0.42) B(0.14, 0.42 + end, 0.15, 0, (end - 0.42) / 2, 0, SKIN); });
  K.shin((B) => { if (end < -0.42) B(w, -end - 0.42, w + 0.01, 0, -(-end - 0.42) / 2, 0, g); B(0.14, 0.42, 0.15, 0, -0.21, 0, SKIN); });
};
const SOHLE = (K, col, h) => K.shin((B) => B(0.16, h || 0.035, 0.27, 0, -0.49, 0.045, col));
const SCHAL_RING = (K, g, th) => { const t2 = th || 0.05, hh = th ? 0.1 : 0.08; K.t(0.2, hh, t2, 0, 1.5, 0.055 + t2 / 2, g); K.t(0.2, hh, t2, 0, 1.5, -0.055 - t2 / 2, g); K.t(t2, hh, 0.11 + 2 * t2, 0.055 + t2 / 2, 1.5, 0, g); K.t(t2, hh, 0.11 + 2 * t2, -0.055 - t2 / 2, 1.5, 0, g); };

export const FORMEN = {
  // ----- Mützen -----
  beanie: { slot: "kopf", n: L2("Beanie", "Beanie"), preis: 60, laden: "kl-acc", b(K, g, b) { K.h(0.29, 0.12, 0.31, 0, 0.33, 0, g); K.h(0.3, 0.06, 0.32, 0, 0.27, 0, b); } },
  bommel: { slot: "kopf", n: L2("Bommelmütze", "Bobble hat"), preis: 75, laden: "kl-acc", b(K, g, b) { K.h(0.29, 0.12, 0.31, 0, 0.33, 0, g); K.h(0.3, 0.06, 0.32, 0, 0.27, 0, g); K.h(0.09, 0.09, 0.09, 0, 0.42, 0, b); K.h(0.07, 0.07, 0.07, 0, 0.42, 0, b, 0.6, 0.6); } },
  zipfel: { slot: "kopf", n: L2("Zipfelmütze", "Pointed beanie"), preis: 70, laden: "kl-acc", b(K, g, b) { K.h(0.29, 0.12, 0.31, 0, 0.33, 0, g); K.h(0.3, 0.06, 0.32, 0, 0.27, 0, b); K.h(0.19, 0.12, 0.2, 0, 0.42, -0.04, g, -0.45); K.h(0.09, 0.09, 0.09, 0, 0.47, -0.12, b, -0.7); } },
  docker: { slot: "kopf", n: L2("Fischermütze", "Docker beanie"), preis: 55, laden: "kl-acc", b(K, g, b) { K.h(0.29, 0.07, 0.31, 0, 0.36, 0, g); K.h(0.302, 0.07, 0.322, 0, 0.305, 0, b); } },
  // ----- Kappen -----
  basecap: { slot: "kopf", n: L2("Basecap", "Baseball cap"), preis: 80, laden: "kl-acc", b(K, g, b) { K.h(0.28, 0.1, 0.3, 0, 0.33, -0.005, g); K.h(0.03, 0.02, 0.03, 0, 0.39, 0, b); K.h(0.2, 0.018, 0.14, 0, 0.29, 0.21, b, 0.12); } },
  caprueck: { slot: "kopf", n: L2("Cap (verkehrt herum)", "Backwards cap"), preis: 80, laden: "kl-acc", b(K, g, b) { K.h(0.28, 0.1, 0.3, 0, 0.33, 0.005, g); K.h(0.03, 0.02, 0.03, 0, 0.39, 0, b); K.h(0.2, 0.018, 0.14, 0, 0.3, -0.21, b, -0.12); } },
  snapback: { slot: "kopf", n: L2("Snapback", "Snapback"), preis: 95, laden: "kl-acc", b(K, g, b) { K.h(0.29, 0.13, 0.3, 0, 0.335, 0, g); K.h(0.24, 0.11, 0.02, 0, 0.335, 0.152, b); K.h(0.24, 0.015, 0.15, 0, 0.28, 0.22, g); } },
  trucker: { slot: "kopf", n: L2("Trucker-Cap", "Trucker cap"), preis: 85, laden: "kl-acc", b(K, g, b) { K.h(0.28, 0.11, 0.15, 0, 0.33, 0.075, g); K.h(0.28, 0.11, 0.15, 0, 0.33, -0.075, b); K.h(0.22, 0.016, 0.14, 0, 0.285, 0.21, g, 0.1); } },
  bucket: { slot: "kopf", n: L2("Fischerhut", "Bucket hat"), preis: 90, laden: "kl-acc", b(K, g, b) { K.h(0.27, 0.12, 0.29, 0, 0.34, 0, g); K.h(0.275, 0.025, 0.295, 0, 0.3, 0, b); K.h(0.42, 0.02, 0.44, 0, 0.28, 0, g); } },
  army: { slot: "kopf", n: L2("Army-Cap", "Army cap"), preis: 90, laden: "kl-acc", b(K, g, b) { K.h(0.29, 0.11, 0.3, 0, 0.335, 0, g); K.h(0.3, 0.02, 0.31, 0, 0.395, 0, g); K.h(0.18, 0.02, 0.1, 0, 0.29, 0.19, b, 0.15); } },
  // ----- Schals -----
  schal: { slot: "hals", n: L2("Schal", "Scarf"), preis: 55, laden: "kl-acc", b(K, g) { SCHAL_RING(K, g); K.t(0.07, 0.18, 0.03, 0.05, 1.39, 0.14, g, 0, 0.1); } },
  schallang: { slot: "hals", n: L2("Langer Schal", "Long scarf"), preis: 70, laden: "kl-acc", b(K, g) { SCHAL_RING(K, g); K.t(0.07, 0.42, 0.03, -0.05, 1.26, 0.15, g); K.t(0.07, 0.36, 0.03, 0.05, 1.29, 0.155, g); } },
  loop: { slot: "hals", n: L2("Loop-Schal", "Loop scarf"), preis: 65, laden: "kl-acc", b(K, g) { SCHAL_RING(K, g, 0.07); K.t(0.24, 0.07, 0.06, 0, 1.43, 0.12, g); } },
  wollschal: { slot: "hals", n: L2("Dicker Wollschal", "Chunky wool scarf"), preis: 80, laden: "kl-acc", b(K, g) { SCHAL_RING(K, g, 0.065); K.t(0.09, 0.36, 0.035, -0.08, 1.3, -0.16, g); K.t(0.09, 0.2, 0.035, 0.05, 1.37, 0.15, g); } },
  halstuch: { slot: "hals", n: L2("Halstuch", "Bandana"), preis: 35, laden: "kl-acc", b(K, g) { K.t(0.18, 0.03, 0.03, 0, 1.49, 0.07, g); K.t(0.18, 0.03, 0.03, 0, 1.49, -0.07, g); K.t(0.03, 0.03, 0.17, 0.085, 1.49, 0, g); K.t(0.03, 0.03, 0.17, -0.085, 1.49, 0, g); K.t(0.12, 0.12, 0.02, 0, 1.41, 0.122, g, 0, Math.PI / 4); } },
  // ----- Pullis -----
  sweat: { slot: "ober", n: L2("Sweatshirt", "Sweatshirt"), preis: 150, laden: "kl-pulli", b(K, g, b) { OB(K, g, b); } },
  hoodie: { slot: "ober", n: L2("Kapuzenpulli", "Hoodie"), preis: 190, laden: "kl-pulli", b(K, g, b) { OB(K, g, b); HOOD(K, g); K.t(0.24, 0.1, 0.02, 0, 1.08, 0.122, shade(flat(g), 0.88)); K.t(0.012, 0.1, 0.012, -0.04, 1.4, 0.122, b); K.t(0.012, 0.1, 0.012, 0.04, 1.4, 0.122, b); } },
  ziphoodie: { slot: "ober", n: L2("Zip-Hoodie", "Zip hoodie"), preis: 210, laden: "kl-pulli", b(K, g, b) { OB(K, g, b); HOOD(K, g); K.t(0.014, 0.48, 0.01, 0, 1.23, 0.121, METALL); K.t(0.09, 0.08, 0.02, -0.1, 1.08, 0.122, shade(flat(g), 0.88)); K.t(0.09, 0.08, 0.02, 0.1, 1.08, 0.122, shade(flat(g), 0.88)); } },
  rolli: { slot: "ober", n: L2("Rollkragenpulli", "Turtleneck"), preis: 170, laden: "kl-pulli", b(K, g, b) { OB(K, g, b); K.t(0.16, 0.11, 0.16, 0, 1.53, 0, g); } },
  strick: { slot: "ober", n: L2("Strickpulli", "Knit jumper"), preis: 220, laden: "kl-pulli", b(K, g, b) { OB(K, g, b); K.t(0.2, 0.05, 0.17, 0, 1.49, 0, b); } },
  troyer: { slot: "ober", n: L2("Troyer", "Half-zip jumper"), preis: 200, laden: "kl-pulli", b(K, g, b) { OB(K, g, b); K.t(0.2, 0.07, 0.17, 0, 1.5, 0, b); K.t(0.012, 0.14, 0.01, 0, 1.41, 0.121, METALL); K.t(0.08, 0.07, 0.015, 0.11, 1.33, 0.122, b); } },
  // ----- Mäntel und Jacken -----
  wollmantel: { slot: "jacke", n: L2("Wollmantel", "Wool coat"), preis: 650, laden: "kl-mantel", b(K, g, b) { JA(K, g, 0.56); K.t(0.08, 0.17, 0.02, -0.065, 1.39, 0.142, shade(flat(g), 0.85)); K.t(0.08, 0.17, 0.02, 0.065, 1.39, 0.142, shade(flat(g), 0.85)); BTN(K, 0.03, 1.25, 4, 0.11, b); } },
  trench: { slot: "jacke", n: L2("Trenchcoat", "Trench coat"), preis: 720, laden: "kl-mantel", b(K, g, b) { JA(K, g, 0.58); K.t(0.46, 0.05, 0.28, 0, 1.0, 0, shade(flat(g), 0.85)); K.t(0.05, 0.05, 0.02, 0, 1.0, 0.142, b); BTN(K, -0.06, 1.3, 3, 0.1, b); BTN(K, 0.06, 1.3, 3, 0.1, b); K.t(0.1, 0.02, 0.14, -0.17, 1.485, 0, shade(flat(g), 0.85)); K.t(0.1, 0.02, 0.14, 0.17, 1.485, 0, shade(flat(g), 0.85)); } },
  parka: { slot: "jacke", n: L2("Parka", "Parka"), preis: 580, laden: "kl-mantel", b(K, g, b) { JA(K, g, 0.7); K.t(0.32, 0.14, 0.15, 0, 1.52, -0.1, g); K.t(0.34, 0.04, 0.17, 0, 1.6, -0.09, b); K.t(0.12, 0.1, 0.02, -0.12, 0.88, 0.142, shade(flat(g), 0.85)); K.t(0.12, 0.1, 0.02, 0.12, 0.88, 0.142, shade(flat(g), 0.85)); K.t(0.014, 0.6, 0.01, 0, 1.12, 0.141, METALL); } },
  daune: { slot: "jacke", n: L2("Daunenjacke", "Puffer jacket"), preis: 450, laden: "kl-mantel", b(K, g, b) {
    const q = { m: "streifen", a: flat(g), b: shade(flat(g), 0.82) }; K.t(0.47, 0.54, 0.29, 0, 1.21, 0, g.m ? g : q); K.arm((B) => B(0.15, 0.42, 0.16, 0, -0.2, 0, g.m ? g : q)); K.t(0.22, 0.08, 0.2, 0, 1.5, 0, b); K.t(0.014, 0.52, 0.01, 0, 1.2, 0.151, METALL); } },
  caban: { slot: "jacke", n: L2("Caban-Jacke", "Pea coat"), preis: 520, laden: "kl-mantel", b(K, g, b) { JA(K, g, 0.82); K.t(0.28, 0.08, 0.2, 0, 1.5, -0.02, g); BTN(K, -0.07, 1.3, 3, 0.11, b); BTN(K, 0.07, 1.3, 3, 0.11, b); } },
  regenjacke: { slot: "jacke", n: L2("Regenjacke", "Rain jacket"), preis: 260, laden: "kl-mantel", b(K, g, b) { JA(K, g, 0.85); HOOD(K, g); K.t(0.014, 0.6, 0.01, 0, 1.15, 0.141, b); K.t(0.1, 0.02, 0.01, -0.11, 1.05, 0.141, b); K.t(0.1, 0.02, 0.01, 0.11, 1.05, 0.141, b); } },
  // ----- kurze Hosen -----
  shorts: { slot: "hose", n: L2("Shorts", "Shorts"), preis: 90, laden: "kl-hose", b(K, g, b) { KURZ(K, g, { end: -0.3, belt: b }); } },
  cargoshorts: { slot: "hose", n: L2("Cargo-Shorts", "Cargo shorts"), preis: 110, laden: "kl-hose", b(K, g, b) { KURZ(K, g, { end: -0.36, w: 0.165 }); K.thigh((B, s) => B(0.03, 0.12, 0.12, s * 0.09, -0.22, 0, b)); } },
  sportshorts: { slot: "hose", n: L2("Sporthose kurz", "Sports shorts"), preis: 70, laden: "kl-hose", b(K, g, b) { KURZ(K, g, { end: -0.22 }); K.thigh((B, s) => B(0.012, 0.22, 0.04, s * 0.083, -0.11, 0, b)); } },
  bermuda: { slot: "hose", n: L2("Bermudas", "Bermuda shorts"), preis: 100, laden: "kl-hose", b(K, g, b) { KURZ(K, g, { end: -0.4, w: 0.172, belt: b }); } },
  // ----- lange Hosen -----
  jeans: { slot: "hose", n: L2("Jeans", "Jeans"), preis: 180, laden: "kl-hose", b(K, g, b) { HO(K, g, { belt: DUNKEL }); K.shin((B) => B(0.162, 0.04, 0.172, 0, -0.4, 0, b)); } },
  chino: { slot: "hose", n: L2("Chino", "Chinos"), preis: 160, laden: "kl-hose", b(K, g, b) { HO(K, g, { belt: b }); } },
  jogger: { slot: "hose", n: L2("Jogginghose", "Joggers"), preis: 120, laden: "kl-hose", b(K, g, b) { HO(K, g, {}); K.shin((B) => B(0.14, 0.06, 0.15, 0, -0.39, 0, shade(flat(g), 0.8))); K.thigh((B, s) => B(0.012, 0.44, 0.035, s * 0.08, -0.21, 0, b)); K.shin((B, s) => B(0.012, 0.36, 0.035, s * 0.08, -0.18, 0, b)); } },
  cargo: { slot: "hose", n: L2("Cargohose", "Cargo trousers"), preis: 190, laden: "kl-hose", b(K, g, b) { HO(K, g, { belt: DUNKEL }); K.thigh((B, s) => B(0.03, 0.14, 0.12, s * 0.088, -0.26, 0, b)); } },
  skinny: { slot: "hose", n: L2("Skinny-Jeans", "Skinny jeans"), preis: 170, laden: "kl-hose", b(K, g, b) { HO(K, g, { w: 0.14, belt: b }); } },
  // ----- Baggy-Hosen -----
  baggyjeans: { slot: "hose", n: L2("Baggy-Jeans", "Baggy jeans"), preis: 210, laden: "kl-hose", b(K, g, b) { HO(K, g, { w: 0.19, low: 0.05, belt: DUNKEL }); K.shin((B) => B(0.195, 0.04, 0.205, 0, -0.44, 0, b)); } },
  baggycargo: { slot: "hose", n: L2("Baggy-Cargo", "Baggy cargo"), preis: 230, laden: "kl-hose", b(K, g, b) { HO(K, g, { w: 0.19, low: 0.05 }); K.thigh((B, s) => B(0.03, 0.15, 0.13, s * 0.108, -0.27, 0, b)); K.shin((B, s) => B(0.03, 0.12, 0.11, s * 0.108, -0.14, 0, b)); } },
  baggyjogger: { slot: "hose", n: L2("Baggy-Jogger", "Baggy joggers"), preis: 160, laden: "kl-hose", b(K, g, b) { HO(K, g, { w: 0.19, low: 0.02 }); K.shin((B) => B(0.15, 0.07, 0.16, 0, -0.41, 0, b)); } },
  skaterbaggy: { slot: "hose", n: L2("Skater-Baggy", "Skater baggy"), preis: 220, laden: "kl-hose", b(K, g, b) { HO(K, g, { w: 0.2, low: 0.06, belt: b }); K.shin((B) => B(0.205, 0.12, 0.012, 0, -0.06, 0.106, b)); } },
  // ----- Schuhe -----
  sneaker: { slot: "schuhe", n: L2("Sneaker", "Sneakers"), preis: 250, laden: "kl-schuhe", b(K, g, b) { K.f.noShoes = true; K.shin((B) => { B(0.155, 0.08, 0.26, 0, -0.44, 0.04, g); B(0.06, 0.012, 0.1, 0, -0.397, 0.1, WEISS); }); SOHLE(K, b); } },
  hightop: { slot: "schuhe", n: L2("High-Top-Sneaker", "High-top sneakers"), preis: 290, laden: "kl-schuhe", b(K, g, b) { K.f.noShoes = true; K.shin((B) => { B(0.165, 0.16, 0.175, 0, -0.39, 0, g); B(0.16, 0.08, 0.27, 0, -0.44, 0.045, g); B(0.06, 0.012, 0.1, 0, -0.397, 0.12, WEISS); }); SOHLE(K, b); } },
  laufschuh: { slot: "schuhe", n: L2("Laufschuhe", "Running shoes"), preis: 320, laden: "kl-schuhe", b(K, g, b) { K.f.noShoes = true; K.shin((B, s) => { B(0.155, 0.08, 0.26, 0, -0.44, 0.04, g); B(0.01, 0.03, 0.14, s * 0.079, -0.44, 0.05, b, 0.3); }); SOHLE(K, b, 0.045); } },
  winterstiefel: { slot: "schuhe", n: L2("Winterstiefel", "Winter boots"), preis: 380, laden: "kl-schuhe", b(K, g, b) { K.f.noShoes = true; K.shin((B) => { B(0.175, 0.26, 0.185, 0, -0.33, 0, g); B(0.165, 0.09, 0.28, 0, -0.45, 0.045, g); B(0.185, 0.05, 0.195, 0, -0.2, 0, b); }); SOHLE(K, DUNKEL, 0.04); } },
  chelsea: { slot: "schuhe", n: L2("Chelsea-Boots", "Chelsea boots"), preis: 340, laden: "kl-schuhe", b(K, g, b) { K.f.noShoes = true; K.shin((B, s) => { B(0.17, 0.17, 0.18, 0, -0.38, 0, g); B(0.16, 0.08, 0.27, 0, -0.45, 0.045, g); B(0.01, 0.1, 0.07, s * 0.086, -0.36, 0, b); B(0.15, 0.05, 0.08, 0, -0.49, -0.04, DUNKEL); }); SOHLE(K, DUNKEL, 0.025); } },
  halbschuh: { slot: "schuhe", n: L2("Halbschuhe", "Oxford shoes"), preis: 280, laden: "kl-schuhe", b(K, g, b) { K.f.noShoes = true; K.shin((B) => { B(0.15, 0.07, 0.26, 0, -0.445, 0.04, g); B(0.07, 0.01, 0.08, 0, -0.405, 0.1, b); }); SOHLE(K, DUNKEL, 0.025); } },
  sandalen: { slot: "schuhe", n: L2("Sandalen", "Sandals"), preis: 120, laden: "kl-schuhe", b(K, g, b) { K.f.noShoes = true; K.shin((B) => { B(0.13, 0.05, 0.24, 0, -0.455, 0.04, SKIN); B(0.155, 0.035, 0.27, 0, -0.49, 0.045, g); B(0.14, 0.02, 0.035, 0, -0.43, 0.1, b); B(0.14, 0.02, 0.035, 0, -0.43, -0.02, b); }); } },
  gummistiefel: { slot: "schuhe", n: L2("Gummistiefel", "Rain boots"), preis: 150, laden: "kl-schuhe", b(K, g, b) { K.f.noShoes = true; K.shin((B) => { B(0.175, 0.38, 0.185, 0, -0.27, 0, g); B(0.165, 0.09, 0.28, 0, -0.45, 0.045, g); B(0.18, 0.03, 0.19, 0, -0.08, 0, b); }); SOHLE(K, b, 0.04); } }
};

// ---------- Varianten: je Form zwei Artikel (gleiche Form, andere Farben oder Muster) ----------
// [deutsch, englisch, Farbe a, Akzent b, Muster (optional), dritte Musterfarbe (optional)]
const C = { koralle: "#ED6A5E", petrol: "#62929E", stahl: "#4A6D7C", stein: "#C6C5B9", schiefer: "#475657", schwarz: "#2B2E30", weiss: "#F2F0EA", senf: "#E0A43C", gruen: "#5D8A4E", oliv: "#6B6E3E", bordeaux: "#7A2E35", navy: "#26385A", sand: "#C9B48A", braun: "#6B4A2E", grau: "#8E918F", rosa: "#E3A3A6", lila: "#7A6898", denim: "#3F5F86", hellblau: "#8DB3CF", gelb: "#E8C66A", orange: "#E07B39", rot: "#B8383A" };
const V = {
  beanie: [["Koralle", "Coral", C.koralle, C.koralle], ["gestreift", "striped", C.navy, C.weiss, "streifen"]],
  bommel: [["Weiß-Rot", "White & red", C.weiss, C.rot], ["Karo", "check", C.bordeaux, C.stein, "karo"]],
  zipfel: [["Senf", "Mustard", C.senf, C.braun], ["geringelt", "striped", C.gruen, C.weiss, "streifen"]],
  docker: [["Schwarz", "Black", C.schwarz, C.schwarz], ["Oliv", "Olive", C.oliv, C.oliv]],
  basecap: [["Petrol", "Teal", C.petrol, C.weiss], ["Schwarz", "Black", C.schwarz, C.koralle]],
  caprueck: [["Rot", "Red", C.rot, C.schwarz], ["Stein", "Stone", C.stein, C.stahl]],
  snapback: [["Navy", "Navy", C.navy, C.senf], ["Camouflage", "camo", C.oliv, C.sand, "tarn", C.braun]],
  trucker: [["Weiß-Blau", "White & blue", C.weiss, C.stahl], ["Orange-Schwarz", "Orange & black", C.orange, C.schwarz]],
  bucket: [["Sand", "Sand", C.sand, C.braun], ["Karo", "check", C.schwarz, C.weiss, "karo"]],
  army: [["Camouflage", "camo", C.oliv, C.sand, "tarn", C.braun], ["Schwarz", "Black", C.schwarz, C.grau]],
  schal: [["Bordeaux", "Burgundy", C.bordeaux, C.bordeaux], ["Karo", "tartan", C.rot, C.navy, "karo"]],
  schallang: [["gestreift", "striped", C.koralle, C.stein, "streifen"], ["Grau", "Grey", C.grau, C.grau]],
  loop: [["Petrol", "Teal", C.petrol, C.petrol], ["Senf", "Mustard", C.senf, C.senf]],
  wollschal: [["Creme", "Cream", C.weiss, C.weiss], ["Karo", "check", C.braun, C.sand, "karo"]],
  halstuch: [["Rot", "Red", C.rot, C.rot], ["Navy", "Navy", C.navy, C.navy]],
  sweat: [["Grau", "Grey", C.grau, C.grau], ["Colorblock", "colour block", C.petrol, C.koralle, "block"]],
  hoodie: [["Schwarz", "Black", C.schwarz, C.weiss], ["Koralle", "Coral", C.koralle, C.weiss]],
  ziphoodie: [["Navy", "Navy", C.navy, C.weiss], ["Camouflage", "camo", C.oliv, C.sand, "tarn", C.braun]],
  rolli: [["Creme", "Cream", C.weiss, C.weiss], ["Bordeaux", "Burgundy", C.bordeaux, C.bordeaux]],
  strick: [["Ringel Petrol", "striped teal", C.petrol, C.stein, "streifen"], ["Karo Rot", "red check", C.rot, C.weiss, "karo"]],
  troyer: [["Oliv", "Olive", C.oliv, C.sand], ["Stahlblau", "Steel blue", C.stahl, C.stein]],
  wollmantel: [["Kamel", "Camel", C.sand, C.braun], ["Anthrazit", "Charcoal", C.schiefer, C.schwarz]],
  trench: [["Beige", "Beige", "#BFA77A", C.braun], ["Navy", "Navy", C.navy, C.stein]],
  parka: [["Oliv", "Olive", C.oliv, C.sand], ["Schwarz", "Black", C.schwarz, C.grau]],
  daune: [["Rot", "Red", C.rot, C.schwarz], ["Silber", "Silver", C.stein, C.schiefer]],
  caban: [["Navy", "Navy", C.navy, C.metall || METALL], ["Karo", "check", C.schiefer, C.grau, "karo"]],
  regenjacke: [["Gelb", "Yellow", C.gelb, C.schwarz], ["Koralle", "Coral", C.koralle, C.weiss]],
  shorts: [["Sand", "Sand", C.sand, C.braun], ["Karo", "check", C.navy, C.hellblau, "karo"]],
  cargoshorts: [["Oliv", "Olive", C.oliv, shade(C.oliv, 0.85)], ["Camouflage", "camo", C.oliv, C.sand, "tarn", C.braun]],
  sportshorts: [["Schwarz", "Black", C.schwarz, C.weiss], ["Petrol", "Teal", C.petrol, C.weiss]],
  bermuda: [["Hellblau", "Light blue", C.hellblau, C.braun], ["Stein", "Stone", C.stein, C.schwarz]],
  jeans: [["Blau", "Blue", C.denim, "#6E8DB3"], ["Schwarz", "Black", C.schwarz, C.schiefer]],
  chino: [["Sand", "Sand", C.sand, C.braun], ["Navy", "Navy", C.navy, C.braun]],
  jogger: [["Grau", "Grey", C.grau, C.weiss], ["Schwarz", "Black", C.schwarz, C.koralle]],
  cargo: [["Oliv", "Olive", C.oliv, shade(C.oliv, 0.85)], ["Camouflage", "camo", C.oliv, C.sand, "tarn", C.braun]],
  skinny: [["Hellblau", "Light blue", C.hellblau, C.braun], ["Schwarz", "Black", C.schwarz, C.schwarz]],
  baggyjeans: [["Blau", "Blue", C.denim, "#6E8DB3"], ["Hellblau", "Light blue", C.hellblau, "#B5CCE0"]],
  baggycargo: [["Sand", "Sand", C.sand, shade(C.sand, 0.85)], ["Schwarz", "Black", C.schwarz, C.schiefer]],
  baggyjogger: [["Petrol", "Teal", C.petrol, shade(C.petrol, 0.8)], ["Grau", "Grey", C.grau, shade(C.grau, 0.8)]],
  skaterbaggy: [["Braun", "Brown", C.braun, C.senf], ["Karo", "check", C.schwarz, C.grau, "karo"]],
  sneaker: [["Weiß", "White", C.weiss, C.weiss], ["Koralle", "Coral", C.koralle, C.weiss]],
  hightop: [["Schwarz", "Black", C.schwarz, C.weiss], ["Rot", "Red", C.rot, C.weiss]],
  laufschuh: [["Petrol", "Teal", C.petrol, C.gelb], ["Grau", "Grey", C.grau, C.koralle]],
  winterstiefel: [["Braun", "Brown", C.braun, C.weiss], ["Schwarz", "Black", C.schwarz, C.stein]],
  chelsea: [["Braun", "Brown", "#7B5236", C.schwarz], ["Schwarz", "Black", C.schwarz, C.schiefer]],
  halbschuh: [["Schwarz", "Black", C.schwarz, C.schwarz], ["Cognac", "Cognac", "#9A5B2E", "#6B3E1E"]],
  sandalen: [["Braun", "Brown", C.braun, C.braun], ["Schwarz", "Black", C.schwarz, C.koralle]],
  gummistiefel: [["Gelb", "Yellow", C.gelb, C.schwarz], ["Grün", "Green", C.gruen, C.schiefer]]
};
const ART = { kopf: L2("Kopfbedeckung", "Headwear"), hals: L2("Schal", "Scarf"), ober: L2("Pulli", "Jumper"), jacke: L2("Jacke/Mantel", "Jacket/coat"), hose: L2("Hose", "Trousers"), schuhe: L2("Schuhe", "Shoes") };
const stoff = (v) => (v[4] ? { m: v[4], a: v[2], b: v[3], c: v[5] } : v[2]);

// ---------- Symbole (SVG) ----------
function fillDef(id, v) {
  if (!v[4] || v[4] === "block") return "";
  if (v[4] === "streifen") return '<pattern id="' + id + '" width="32" height="5" patternUnits="userSpaceOnUse"><rect width="32" height="5" fill="' + v[2] + '"/><rect width="32" height="2.5" fill="' + v[3] + '"/></pattern>';
  if (v[4] === "karo") return '<pattern id="' + id + '" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="' + v[2] + '"/><rect width="3" height="3" fill="' + v[3] + '"/><rect x="3" y="3" width="3" height="3" fill="' + v[3] + '"/></pattern>';
  return '<pattern id="' + id + '" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="' + v[2] + '"/><rect x="1" y="2" width="4" height="3" fill="' + v[3] + '"/><rect x="6" y="6" width="3" height="3" fill="' + (v[5] || v[3]) + '"/></pattern>';
}
const ICO = {
  kopf: (f, b, id) => id === "basecap" || id === "caprueck" || id === "snapback" || id === "trucker" || id === "army"
    ? '<path d="M7 20a9 9 0 0 1 18 0z" fill="' + f + '"/><rect x="' + (id === "caprueck" ? 2 : 18) + '" y="19" width="12" height="3" fill="' + b + '"/>'
    : id === "bucket" ? '<path d="M9 19l2-9h10l2 9z" fill="' + f + '"/><rect x="4" y="19" width="24" height="3" fill="' + f + '"/><rect x="10" y="16" width="12" height="2" fill="' + b + '"/>'
      : '<path d="M7 22a9 9 0 0 1 18 0z" fill="' + f + '"/><rect x="6" y="21" width="20" height="5" fill="' + b + '"/>' + (id === "bommel" ? '<circle cx="16" cy="9" r="3.2" fill="' + b + '"/>' : id === "zipfel" ? '<path d="M14 13l8-8 1 7z" fill="' + f + '"/>' : ""),
  hals: (f) => '<rect x="8" y="7" width="16" height="6" fill="' + f + '"/><rect x="18" y="12" width="5" height="15" fill="' + f + '"/><rect x="12" y="12" width="5" height="11" fill="' + f + '"/>',
  ober: (f, b, id) => '<path d="M10 7h12l6 5-3 5-3-2v12H10V15l-3 2-3-5z" fill="' + f + '"/><rect x="10" y="25" width="12" height="2" fill="' + b + '"/>' + (id === "hoodie" || id === "ziphoodie" ? '<path d="M12 7a4 4 0 0 0 8 0z" fill="' + b + '"/>' : id === "rolli" || id === "troyer" ? '<rect x="13" y="4" width="6" height="4" fill="' + f + '"/>' : ""),
  jacke: (f, b, id) => '<path d="M10 6h12l6 5-2 6-3-2v' + (id === "daune" || id === "regenjacke" ? 11 : 15) + 'H9V15l-3 2-2-6z" fill="' + f + '"/><path d="M16 6v20" stroke="' + b + '" stroke-width="1.4"/>',
  hose: (f, b, id) => { const k = FORMEN[id], short = /shorts|bermuda/.test(id), wide = /baggy/.test(id); return '<path d="M' + (wide ? 7 : 9) + ' 5h' + (wide ? 18 : 14) + 'l' + (wide ? 1 : 0) + ' ' + (short ? 13 : 22) + 'h-' + (wide ? 8 : 6) + 'l-2-' + (short ? 8 : 14) + '-2 ' + (short ? 8 : 14) + 'h-' + (wide ? 8 : 6) + 'z" fill="' + f + '"/><rect x="' + (wide ? 7 : 9) + '" y="5" width="' + (wide ? 18 : 14) + '" height="2.5" fill="' + b + '"/>' + (k ? "" : ""); },
  schuhe: (f, b, id) => /stiefel|chelsea/.test(id) ? '<path d="M9 6h8v14l9 3v4H9z" fill="' + f + '"/><rect x="9" y="25" width="17" height="3" fill="' + b + '"/>' : '<path d="M5 18l8-4 5 3 9 2v6H5z" fill="' + f + '"/><rect x="5" y="23" width="22" height="3" fill="' + b + '"/>'
};
function icon(id, form, v) {
  const pid = "klp-" + id, def = fillDef(pid, v), f = v[4] === "block" ? "url(#" + pid + ")" : def ? "url(#" + pid + ")" : v[2];
  const blk = v[4] === "block" ? '<linearGradient id="' + pid + '" x1="0" y1="0" x2="0" y2="1"><stop offset="55%" stop-color="' + v[2] + '"/><stop offset="55%" stop-color="' + v[3] + '"/></linearGradient>' : "";
  return '<svg viewBox="0 0 32 32" aria-hidden="true"><defs>' + def + blk + '</defs><g stroke="#D9D6CC" stroke-width="0.9" stroke-linejoin="miter">' + ICO[form.slot](f, v[3], form.id) + "</g></svg>";   // helle Kontur: auch dunkle Stücke sind auf dunklem Grund zu sehen
}

// ---------- Artikel anlegen ----------
export const KL_IDS = [];
for (const fid of Object.keys(FORMEN)) {
  const F = FORMEN[fid]; F.id = fid;
  (V[fid] || []).forEach((v, i) => {
    const id = "kl_" + fid + "_" + (i + 1);
    ITEMS[id] = { kind: "kleidung", n: L2(F.n.de + " " + v[0], F.n.en + " (" + v[1].toLowerCase() + ")"), d: L2(ART[F.slot].de + " – im Kleiderschrank mit F anziehen.", ART[F.slot].en + " – put it on at the wardrobe with F."),
      max: 5, preis: F.preis + (v[4] ? 20 : 0), laden: F.laden, kl: { f: fid, v: i, slot: F.slot }, ico: icon(id, F, v) };
    KL_IDS.push(id);
  });
}
export const kleidSlot = (id) => (ITEMS[id] && ITEMS[id].kl ? ITEMS[id].kl.slot : null);

// Kleidung anwenden: Reihenfolge innen → außen
function anziehen(K, outfit) {
  if (!outfit) return;
  for (const slot of ["ober", "hose", "schuhe", "jacke", "hals", "kopf"]) {
    const it = ITEMS[outfit[slot]]; if (!it || !it.kl || it.kl.slot !== slot) continue;
    const F = FORMEN[it.kl.f], v = V[it.kl.f][it.kl.v]; if (F && v) F.b(K, stoff(v), v[3]);
  }
}

// ---------- Körper ----------
// look: Farben (top, pants, shoes, hair) + outfit. opt.puppe = Schaufensterpuppe (hell, ohne Gesicht und Haare)
export function koerper(look, opt) {
  const L = Object.assign({}, LOOK, look || {}), P = opt && opt.puppe, SK = P ? "#E8E6DF" : SKIN, K = kit();
  anziehen(K, L.outfit);
  const TOP = L.top, PANTS = L.pants, SHOE = L.shoes, HAIR = L.hair, f = K.f;
  if (!f.noTop && !P) { K.t(0.4, 0.5, 0.22, 0, 1.22, 0, TOP); K.t(0.22, 0.08, 0.04, 0, 1.3, 0.115, ACC); K.t(0.3, 0.12, 0.12, 0, 1.5, -0.08, TOP); }
  if (P && !f.noTop) K.t(0.4, 0.5, 0.22, 0, 1.22, 0, SK);
  if (!f.noPants) K.t(0.36, 0.1, 0.2, 0, 0.95, 0, P ? SK : PANTS);
  K.t(0.11, 0.16, 0.11, 0, 1.53, 0, SK);   // Hals (reicht bis in den Kopf, keine Lücke)
  K.h(0.25, 0.27, 0.25, 0, 0.15, 0, SK);
  if (!P) {
    K.h(0.27, 0.1, 0.29, 0, 0.3, 0, HAIR);   // Haardecke steht vorn über die Stirn (seit v0.20.2: kein Clipping)
    K.h(0.27, 0.16, 0.06, 0, 0.2, -0.12, HAIR);
    K.h(0.04, 0.04, 0.02, -0.06, 0.17, 0.126, EYE); K.h(0.04, 0.04, 0.02, 0.06, 0.17, 0.126, EYE); K.h(0.05, 0.05, 0.04, 0, 0.11, 0.135, "#D9A07E");
  }
  K.arm((B) => { if (!f.noTop) B(0.11, 0.42, 0.12, 0, -0.2, 0, P ? SK : TOP); else B(0.1, 0.06, 0.11, 0, -0.04, 0, SK); B(0.09, 0.2, 0.1, 0, -0.5, 0, SK); });
  if (!f.noPants) { K.thigh((B) => B(0.15, 0.44, 0.16, 0, -0.21, 0, P ? SK : PANTS)); K.shin((B) => B(0.15, 0.42, 0.16, 0, -0.21, 0, P ? SK : PANTS)); }
  if (!f.noShoes) K.shin((B) => B(0.15, 0.09, 0.26, 0, -0.455, 0.04, P ? SK : SHOE));
  return K.S;
}

// Schaufensterpuppe als feste Teile (Möbelkoordinaten, vorne = +z): Figur auf einem Sockel mit Stange
export function puppeParts(outfit, seed) {
  const S = koerper({ outfit: outfit }, { puppe: true }), out = [], y0 = 0.06;
  const SC = new THREE.Matrix4().makeScale(0.9, 0.9, 0.9);   // wie die Spielfigur 10 % kleiner (seit v0.21.1)
  const put = (list, m) => list.forEach((g) => { const c = g.clone(); c.applyMatrix4(m); c.applyMatrix4(SC); out.push(c); });
  const T = (x, y, z, rz) => { const m = new THREE.Matrix4().makeTranslation(x, y + y0, z); if (rz) m.multiply(new THREE.Matrix4().makeRotationZ(rz)); return m; };
  put(S.torso, T(0, 0, 0)); put(S.head, T(0, 1.55, 0));
  put(S.armL, T(-0.26, 1.42, 0, -0.1)); put(S.armR, T(0.26, 1.42, 0, 0.1));
  put(S.thighL, T(-0.1, 0.92, 0)); put(S.thighR, T(0.1, 0.92, 0)); put(S.shinL, T(-0.1, 0.5, 0)); put(S.shinR, T(0.1, 0.5, 0));
  out.push(part(new THREE.CylinderGeometry(0.28, 0.3, 0.06, 14), DUNKEL, M(0, 0.03, 0, 1), 0, (seed || 0) + 900));
  out.push(part(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 6), METALL, M(0, 0.36, -0.14, 1), 0, (seed || 0) + 901));
  return out;
}

// ---------- Besitz ----------
// besitzt der Spieler das Stück? (Rucksack oder irgendein Möbel-Lager)
export function besitzt(id) {
  if (inv().some((s) => s && s.id === id)) return true;
  const L = save().lager || {}; return Object.keys(L).some((k) => Array.isArray(L[k]) && L[k].some((s) => s && s.id === id));
}
// Kleidung aus einem Lager (Schlüssel) und dem Rucksack, ohne doppelte
export function kleidungBei(key) {
  const ids = [], add = (s) => { if (s && ITEMS[s.id] && ITEMS[s.id].kl && ids.indexOf(s.id) < 0) ids.push(s.id); };
  if (key) lager(key).forEach(add); inv().forEach(add); return ids;
}
// Outfit ohne Stücke, die der Spieler nicht mehr besitzt
export function outfitPruefen(o) { const r = {}; if (o) KL_SLOTS.forEach((k) => { if (o[k] && kleidSlot(o[k]) === k && besitzt(o[k])) r[k] = o[k]; }); return r; }
