// Asset-Bibliothek: jedes Asset baut sich als 3D-Modell (Ursprung = Mitte der Grundfläche, Vorderseite = +y / Süden)
import { rng } from './geometry.js';

// Frankfurter Siedlungshaus: Putz + roter Mainsandstein, Varianten für Putz/Dach/Läden
const PALS = [
  { wall: [232, 216, 180], roof: [166, 68, 48], sh: [64, 112, 78] },
  { wall: [236, 214, 150], roof: [120, 66, 48], sh: [86, 104, 124] },
  { wall: [214, 212, 204], roof: [78, 78, 84], sh: null },
  { wall: [226, 186, 160], roof: [166, 68, 48], sh: [238, 234, 224] }
];

function siedlungshaus(m, v) {
  const pal = PALS[v % PALS.length], hid = m.part();
  const row = (v0, v1) => [{ u0: 1.3, u1: 2.5, v0, v1, sh: 1 }, { u0: 4.4, u1: 5.6, v0, v1, sh: 1 }, { u0: 7.5, u1: 8.7, v0, v1, sh: 1 }];
  const fw = [{ u0: 1.3, u1: 2.5, v0: 0.95, v1: 2.4, sh: 1 }, { u0: 7.5, u1: 8.7, v0: 0.95, v1: 2.4, sh: 1 }, { u0: 4.4, u1: 5.6, v0: 0.6, v1: 2.75, t: 'door' }, ...row(3.6, 5.1)];
  const sw = [{ u0: 1.4, u1: 2.6, v0: 0.95, v1: 2.4, sh: 1 }, { u0: 5.4, u1: 6.6, v0: 0.95, v1: 2.4, sh: 1 }, { u0: 1.4, u1: 2.6, v0: 3.6, v1: 5.1, sh: 1 }, { u0: 5.4, u1: 6.6, v0: 3.6, v1: 5.1, sh: 1 }, { u0: 3.55, u1: 4.45, v0: 6.4, v1: 7.3, t: 'round' }];
  const F = { ax: 'x', o: -5, len: 10, win: fw, pal }, S = { ax: 'y', o: 4, len: 8, win: sw, pal }, B = { ax: 'x', o: -5, len: 10, win: [...row(0.95, 2.4), ...row(3.6, 5.1)], pal };
  m.quad([-5, 4, 0], [5, 4, 0], [5, 4, 5.8], [-5, 4, 5.8], 'wall', hid, [0, 1, 0], F);
  m.quad([5, 4, 0], [5, -4, 0], [5, -4, 5.8], [5, 4, 5.8], 'wall', hid, [1, 0, 0], S);
  m.quad([5, -4, 0], [-5, -4, 0], [-5, -4, 5.8], [5, -4, 5.8], 'wall', hid, [0, -1, 0], B);
  m.quad([-5, -4, 0], [-5, 4, 0], [-5, 4, 5.8], [-5, -4, 5.8], 'wall', hid, [-1, 0, 0], S);
  m.tri3([5, 4, 5.8], [5, -4, 5.8], [5, 0, 9.3], 'wall', hid, [1, 0, 0], S);
  m.tri3([-5, -4, 5.8], [-5, 4, 5.8], [-5, 0, 9.3], 'wall', hid, [-1, 0, 0], S);
  const o = 0.45, ze = 5.55, zr = 9.3, rid = m.part(), R = { pal };
  m.quad([-5 - o, 4 + o, ze], [5 + o, 4 + o, ze], [5 + o, 0, zr], [-5 - o, 0, zr], 'roof', rid, [0, 1, 1], R);
  m.quad([5 + o, -4 - o, ze], [-5 - o, -4 - o, ze], [-5 - o, 0, zr], [5 + o, 0, zr], 'roof', rid, [0, -1, 1], R);
  for (const sx of [1, -1]) {
    const X = sx * (5 + o);
    m.quad([X, 4 + o, ze - 0.25], [X, 0, zr - 0.25], [X, 0, zr], [X, 4 + o, ze], 'fascia', rid, [sx, 0, 0]);
    m.quad([X, 0, zr - 0.25], [X, -4 - o, ze - 0.25], [X, -4 - o, ze], [X, 0, zr], 'fascia', rid, [sx, 0, 0]);
  }
  for (const sy of [1, -1]) { const Y = sy * (4 + o); m.quad([-5 - o, Y, ze - 0.25], [5 + o, Y, ze - 0.25], [5 + o, Y, ze], [-5 - o, Y, ze], 'fascia', rid, [0, sy, 0]); }
  m.box(-5 - o, -0.12, zr - 0.05, 5 + o, 0.12, zr + 0.12, 'ridge', rid, R);
  const cid = m.part(), cx = v % 2 ? -2.2 : 1;
  m.box(cx, -2, 7, cx + 0.7, -1.3, 10.3, { top: 'cap', side: 'brick' }, cid);
  m.box(cx - 0.08, -2.08, 10.3, cx + 0.78, -1.22, 10.42, 'cap', cid);
  const sid = m.part();
  m.box(-0.8, 4, 0, 0.8, 4.9, 0.2, 'sand', sid); m.box(-0.8, 4, 0.2, 0.8, 4.6, 0.4, 'sand', sid); m.box(-0.8, 4, 0.4, 0.8, 4.3, 0.6, 'sand', sid);
  m.box(-1, 4, 2.95, 1, 4.9, 3.05, 'metal', m.part());
}

function laubbaum(m, v, o) {
  const r = rng(v * 7919 + o.seed), h = o.trunk + r() * 0.6;
  m.box(-o.tw, -o.tw, 0, o.tw, o.tw, h + 0.8, o.bark, m.part());
  const rx = o.rx + r() * 0.6, rz = o.rz + r() * 0.5;
  m.blob((r() - 0.5) * 0.4, (r() - 0.5) * 0.4, h + rz * 0.9, rx, rz, o.s, o.leaf, v * 13 + o.seed);
}

function gras(m, v, flowers) {
  const r = rng(v * 131 + (flowers ? 7 : 3)), id = m.part(), n = flowers ? 7 : 11;
  const cols = [[214, 70, 70], [236, 200, 70], [150, 90, 200], [240, 240, 240]];
  for (let i = 0; i < n; i++) {
    const a = r() * 6.283, d = r() * 0.32, x = Math.cos(a) * d, y = Math.sin(a) * d, h = 0.18 + r() * 0.28;
    m.box(x - 0.025, y - 0.025, 0, x + 0.025, y + 0.025, h, 'blade', id);
    if (flowers && r() < 0.8) m.box(x - 0.05, y - 0.05, h, x + 0.05, y + 0.05, h + 0.07, 'petal', id, { c: cols[(v + i) % 4] });
  }
}

function person(m) {
  const id = m.part();
  m.box(-0.2, -0.1, 0, -0.03, 0.1, 0.1, 'shoe', id); m.box(0.03, -0.1, 0, 0.2, 0.1, 0.1, 'shoe', id);
  m.box(-0.2, -0.09, 0.1, -0.03, 0.09, 0.86, 'jeans', id); m.box(0.03, -0.09, 0.1, 0.2, 0.09, 0.86, 'jeans', id);
  m.box(-0.25, -0.13, 0.86, 0.25, 0.13, 1.46, 'jacket', id); m.box(-0.07, -0.06, 1.46, 0.07, 0.06, 1.52, 'skin', id);
  m.box(-0.13, -0.13, 1.52, 0.13, 0.13, 1.8, 'skin', id); m.box(-0.14, -0.14, 1.74, 0.14, 0.14, 1.84, 'hair', id);
  m.box(-0.37, -0.07, 0.92, -0.25, 0.07, 1.42, 'jacket', id); m.box(0.25, -0.07, 1.18, 0.37, 0.4, 1.3, 'jacket', id);
  m.box(0.27, 0.3, 1.2, 0.35, 0.72, 1.3, 'gun', id);
}

// layer: 0 Bodendecker, 1 Busch, 2 Baum, 3 Bauwerk  |  rot in 5°-Schritten: 1 = 5°, 3 = 15°, 18 = 90°
export const ASSET_LIST = [
  { key: 'haus_siedlung', name: 'Siedlungshaus', cat: 'Gebäude', variants: 4, rot: 3, sp: 5.6, layer: 3, col: [5.05, 4.05], door: [0, 5.5], floors: 2, dot: '#b0563f',
    build: siedlungshaus },
  { key: 'zaun_holz', name: 'Holzzaun 2,2 m', cat: 'Garten', variants: 1, rot: 3, sp: 1.1, layer: 3, col: [1.15, 0.08], dot: '#ece6d6',
    build: m => { const id = m.part(); m.quad([-1.1, 0, 0], [1.1, 0, 0], [1.1, 0, 1.05], [-1.1, 0, 1.05], 'fence', id, [0, 1, 0]); for (const x of [-1.1, 1.1]) m.box(x - 0.07, -0.07, 0, x + 0.07, 0.07, 1.15, 'post', id); } },
  { key: 'zaun_tor', name: 'Gartentor', cat: 'Garten', variants: 1, rot: 3, sp: 0.8, layer: 3, col: [0.8, 0.08], dot: '#ece6d6',
    build: m => { const id = m.part(); for (const x of [-0.72, 0.72]) m.box(x - 0.08, -0.08, 0, x + 0.08, 0.08, 1.25, 'post', id); m.quad([-0.6, 0, 0.05], [0.6, 0, 0.05], [0.6, 0, 1.08], [-0.6, 0, 1.08], 'fence', id, [0, 1, 0]); } },
  { key: 'hecke', name: 'Hecke 2 m', cat: 'Garten', variants: 2, rot: 3, sp: 1, layer: 3, col: [1, 0.4], dot: '#4c7a3c',
    build: (m, v) => { m.box(-1, -0.4, 0, 1, 0.4, 1.5 + v * 0.3, 'hedge', m.part()); } },
  { key: 'weg', name: 'Gartenweg 1,4 × 2 m', cat: 'Garten', variants: 1, rot: 3, sp: 1, layer: 0, dot: '#9a9080',
    build: m => m.quad([-0.7, 1, 0.02], [0.7, 1, 0.02], [0.7, -1, 0.02], [-0.7, -1, 0.02], 'path', m.part(), [0, 0, 1]) },
  { key: 'tonnen', name: 'Mülltonnen (4er)', cat: 'Garten', variants: 1, rot: 3, sp: 1.4, layer: 3, col: [1.35, 0.4], dot: '#56606c',
    build: m => { ['binG', 'binY', 'binB', 'binW'].forEach((t, i) => { const id = m.part(), x = -1.3 + i * 0.66; m.box(x, -0.35, 0, x + 0.58, 0.35, 1.0, t, id); m.box(x - 0.03, -0.39, 1.0, x + 0.61, 0.39, 1.06, t, id); }); } },
  { key: 'linde', name: 'Linde', cat: 'Vegetation', variants: 4, rot: 18, sp: 2.7, layer: 2, col: [0.25, 0.25], dot: '#3d7a35', veg: 1, w: 1,
    build: (m, v) => laubbaum(m, v, { seed: 3, trunk: 3, tw: 0.22, rx: 2.3, rz: 2.0, s: 0.55, bark: 'bark', leaf: 'leaf' }) },
  { key: 'platane', name: 'Platane', cat: 'Vegetation', variants: 4, rot: 18, sp: 3.3, layer: 2, col: [0.28, 0.28], dot: '#5a8a3e', veg: 1, w: 0.7,
    build: (m, v) => laubbaum(m, v, { seed: 5, trunk: 3.6, tw: 0.26, rx: 2.9, rz: 2.1, s: 0.6, bark: 'barkP', leaf: 'leafL' }) },
  { key: 'obstbaum', name: 'Apfelbaum', cat: 'Vegetation', variants: 4, rot: 18, sp: 1.9, layer: 2, col: [0.18, 0.18], dot: '#6f8f3a', veg: 1, w: 1,
    build: (m, v) => laubbaum(m, v, { seed: 9, trunk: 1.5, tw: 0.15, rx: 1.6, rz: 1.3, s: 0.45, bark: 'bark', leaf: 'leafA' }) },
  { key: 'busch', name: 'Busch', cat: 'Vegetation', variants: 4, rot: 18, sp: 0.8, layer: 1, dot: '#4f8a40', veg: 1, w: 2.5,
    build: (m, v) => { const r = rng(v * 37 + 1); m.blob(0, 0, 0.45, 0.6 + r() * 0.3, 0.45 + r() * 0.2, 0.3, 'leaf', v * 7 + 2); } },
  { key: 'gras', name: 'Grasbüschel', cat: 'Vegetation', variants: 4, rot: 18, sp: 0.3, layer: 0, dot: '#79a64e', veg: 1, w: 6,
    build: (m, v) => gras(m, v, false) },
  { key: 'blumen', name: 'Wildblumen', cat: 'Vegetation', variants: 4, rot: 18, sp: 0.3, layer: 0, dot: '#d8b040', veg: 1, w: 3,
    build: (m, v) => gras(m, v, true) },
  { key: 'laterne', name: 'Straßenlaterne', cat: 'Straße', variants: 1, rot: 3, sp: 0.5, layer: 3, col: [0.1, 0.1], dot: '#40464e',
    build: m => { const id = m.part(); m.box(-0.07, -0.07, 0, 0.07, 0.07, 4.6, 'lampgreen', id); m.box(-0.06, -0.06, 4.5, 0.06, 1.2, 4.6, 'lampgreen', id); m.box(-0.15, 0.9, 4.36, 0.15, 1.4, 4.5, 'lampgreen', id); m.box(-0.12, 0.93, 4.32, 0.12, 1.37, 4.36, 'glow', id); } },
  { key: 'bank', name: 'Parkbank', cat: 'Straße', variants: 1, rot: 3, sp: 1, layer: 3, col: [0.9, 0.25], dot: '#8a6040',
    build: m => { const id = m.part(); for (const x of [-0.75, 0.75]) { m.box(x - 0.04, -0.2, 0, x + 0.04, 0.2, 0.45, 'metal', id); m.box(x - 0.04, -0.24, 0.45, x + 0.04, -0.18, 0.85, 'metal', id); }
      for (let i = 0; i < 3; i++) m.box(-0.9, -0.2 + i * 0.14, 0.45, 0.9, -0.1 + i * 0.14, 0.5, 'wood', id);
      for (let i = 0; i < 2; i++) m.box(-0.9, -0.24, 0.58 + i * 0.16, 0.9, -0.2, 0.7 + i * 0.16, 'wood', id); } },
  // Möbel und Deko aus dem Low-Poly-Pack: fertig gerenderte Sprites in 72 Drehungen (models/), kein 3D-Modell im Repo
  { key: 'sessel_modern', name: 'Sessel modern', cat: 'Möbel & Deko', variants: 1, rot: 1, sp: 0.7, layer: 3, col: [0.56, 0.44], dot: '#6c6a6a', model: 'sessel_modern' },
  { key: 'bett_doppel', name: 'Doppelbett', cat: 'Möbel & Deko', variants: 1, rot: 1, sp: 1.3, layer: 3, col: [0.82, 1.1], dot: '#ece2ce', model: 'bett_doppel' },
  { key: 'tasche_kleidung', name: 'Tasche mit Kleidung', cat: 'Möbel & Deko', variants: 1, rot: 1, sp: 0.35, layer: 3, col: [0.24, 0.24], dot: '#a67640', model: 'tasche_kleidung' },
  { key: 'tasche_klein', name: 'Tasche klein', cat: 'Möbel & Deko', variants: 1, rot: 1, sp: 0.3, layer: 3, col: [0.24, 0.19], dot: '#dcc09a', model: 'tasche_klein' },
  { key: 'figur', name: 'Maßstabsfigur 1,80 m', cat: 'Sonstiges', variants: 1, rot: 3, sp: 0.3, layer: 3, dot: '#c84030',
    build: person }
];
export const ASSETS = Object.fromEntries(ASSET_LIST.map(a => [a.key, a]));
export const VEG = ASSET_LIST.filter(a => a.veg).map(a => a.key);
