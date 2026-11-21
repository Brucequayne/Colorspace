// Projektion (45° gedreht, 48° geneigt), Kamera und Umrechnung Geo <-> Weltmeter
import { CFG } from './config.js';

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
