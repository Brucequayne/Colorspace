// Anarchy Frankfurt – zentrale Einstellungen, Projektion, Kamera, Geo-Umrechnung
export const CFG = {
  VERSION: '0.29-editor',
  MODEL_V: '27',           // Cache-Stempel für models/*.png|json
  THETA_DEG: 48,          // Kameraneigung
  PPM: 12,                // Pixel pro Meter (nativ)
  WORLD_HALF: 12500,      // 25 x 25 km Karte -> +-12,5 km um den Mittelpunkt
  CENTER: { lat: 50.1210, lon: 8.6360 }, // Mitte von Frankfurt (Stadtgebiet passt komplett rein)
  ROT_STEPS: 24,          // 15°-Schritte
  TILE_PX: 256,           // Render-Kacheln (nativ)
  TILE_CACHE: 280,
  OSM_TILE_M: 1000,       // OSM-Ladekacheln 1 x 1 km
  SUN: [-0.35, 0.55, 0.75],
  ZOOMS: [1 / 32, 1 / 16, 1 / 8, 1 / 4, 1 / 2, 1, 2, 3, 4, 6],
  START_ZOOM: 2,
  OVERPASS: [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
  ],
  PLACES: [
    ['Römer', 50.1106, 8.6821],
    ['Hauptwache', 50.1141, 8.6789],
    ['Konstablerwache', 50.1148, 8.6866],
    ['Hauptbahnhof', 50.1070, 8.6633],
    ['Alt-Sachsenhausen', 50.1037, 8.6903],
    ['Bornheim (Berger Str.)', 50.1262, 8.7090],
    ['Nordend', 50.1250, 8.6900],
    ['Westend', 50.1190, 8.6620],
    ['Messe', 50.1118, 8.6455],
    ['Zoo', 50.1163, 8.6990],
    ['Osthafen', 50.1105, 8.7230],
    ['Höchst', 50.1000, 8.5430],
    ['Stadtwald', 50.0750, 8.6400],
    ['Flughafen', 50.0379, 8.5622]
  ]
};

// Projektion (45° gedreht, 48° geneigt), Kamera und Umrechnung Geo <-> Weltmeter

const S2 = Math.SQRT1_2;
export const TH = CFG.THETA_DEG * Math.PI / 180, SN = Math.sin(TH), CS = Math.cos(TH), PPM = CFG.PPM;
export const VIEW = [S2 * CS, S2 * CS, SN]; // Richtung zum Betrachter

// Welt (m) -> nativer Bildschirm (px) + Tiefe (größer = näher an der Kamera)
export function proj(x, y, z) {
  const d = (x + y) * S2;
  return [(x - y) * S2 * PPM, (d * SN - z * CS) * PPM, d * CS + z * SN];
}
export const groundDepth = (x, y) => (x + y) * S2 * CS;
// nativer Bildschirm -> Bodenpunkt (z = 0)
export function unprojGround(sx, sy) {
  const A = sx / (S2 * PPM), B = sy / (S2 * SN * PPM);
  return [(A + B) / 2, (B - A) / 2];
}
// Matrix Boden -> nativ (für Canvas setTransform)
export const GM = [S2 * PPM, S2 * SN * PPM, -S2 * PPM, S2 * SN * PPM];

export function groundBBox(nx0, ny0, nx1, ny1) {
  let a = 1e9, b = -1e9, c = 1e9, d = -1e9;
  for (const [sx, sy] of [[nx0, ny0], [nx1, ny0], [nx0, ny1], [nx1, ny1]]) {
    const [x, y] = unprojGround(sx, sy);
    a = Math.min(a, x); b = Math.max(b, x); c = Math.min(c, y); d = Math.max(d, y);
  }
  return [a, c, b, d];
}

export class Camera {
  constructor() { this.x = 0; this.y = 0; this.zoom = CFG.START_ZOOM; this.w = 1; this.h = 1; this.dpr = 1; }
  get scale() { return this.zoom * this.dpr; }
  origin() {
    const c = proj(this.x, this.y, 0), s = this.scale;
    return [Math.round(this.w / 2 - c[0] * s), Math.round(this.h / 2 - c[1] * s)];
  }
  toNative(dx, dy) { const o = this.origin(), s = this.scale; return [(dx - o[0]) / s, (dy - o[1]) / s]; }
  toDevice(nx, ny) { const o = this.origin(), s = this.scale; return [o[0] + nx * s, o[1] + ny * s]; }
  screenToGround(dx, dy) { const n = this.toNative(dx, dy); return unprojGround(n[0], n[1]); }
  visibleNative() { const a = this.toNative(0, 0), b = this.toNative(this.w, this.h); return [a[0], a[1], b[0], b[1]]; }
  visibleGround() { const v = this.visibleNative(); return groundBBox(v[0], v[1], v[2], v[3]); }
  // Matrix Boden -> Gerätepixel
  groundMatrix() { const o = this.origin(), s = this.scale; return [GM[0] * s, GM[1] * s, GM[2] * s, GM[3] * s, o[0], o[1]]; }
  zoomAt(z, dx, dy) {
    const g = this.screenToGround(dx, dy); this.zoom = z;
    const g2 = this.screenToGround(dx, dy); this.x += g[0] - g2[0]; this.y += g[1] - g2[1]; this.clamp();
  }
  panDevice(ddx, ddy) {
    const s = this.scale, c = proj(this.x, this.y, 0);
    const g = unprojGround(c[0] - ddx / s, c[1] - ddy / s); this.x = g[0]; this.y = g[1]; this.clamp();
  }
  clamp() { const H = CFG.WORLD_HALF; this.x = Math.max(-H, Math.min(H, this.x)); this.y = Math.max(-H, Math.min(H, this.y)); }
}

// ---------- Längen-/Breitengrad <-> Weltmeter (x = Osten, y = Süden) ----------

const LAT0 = CFG.CENTER.lat, LON0 = CFG.CENTER.lon, R = Math.PI / 180;
// Meter pro Grad an der Kartenmitte (WGS84-Näherung)
export const KY = 111132.92 - 559.82 * Math.cos(2 * LAT0 * R) + 1.175 * Math.cos(4 * LAT0 * R);
export const KX = 111412.84 * Math.cos(LAT0 * R) - 93.5 * Math.cos(3 * LAT0 * R) + 0.118 * Math.cos(5 * LAT0 * R);

export const toWorld = (lat, lon) => [(lon - LON0) * KX, (LAT0 - lat) * KY];
export const toLatLon = (x, y) => [LAT0 - y / KY, LON0 + x / KX];

const H = CFG.WORLD_HALF, T = CFG.OSM_TILE_M;
export const OSM_N = Math.round((2 * H) / T);

export function osmTileOf(x, y) { return [Math.floor((x + H) / T), Math.floor((y + H) / T)]; }

// Bounding Box (s,w,n,e) einer OSM-Kachel bzw. der ganzen Welt
export function llBBox(x0, y0, x1, y1) {
  const [n, w] = toLatLon(x0, y0), [s, e] = toLatLon(x1, y1);
  return `${s.toFixed(6)},${w.toFixed(6)},${n.toFixed(6)},${e.toFixed(6)}`;
}
export function osmTileBBox(i, j) { return llBBox(-H + i * T, -H + j * T, -H + (i + 1) * T, -H + (j + 1) * T); }
export function worldBBox() { return llBBox(-H, -H, H, H); }
export const inWorld = (x, y) => Math.abs(x) <= H && Math.abs(y) <= H;
