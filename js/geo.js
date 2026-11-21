// Umrechnung Längen-/Breitengrad <-> Weltmeter (x = Osten, y = Süden)
import { CFG } from './config.js';

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
