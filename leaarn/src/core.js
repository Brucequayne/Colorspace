// ===== core.js · Namensraum, Texte, Speicher, Mathe, Zufall, Rauschen (aus Poly Racer übernommen) =====
export const PR = { lang: "de", VERSION: "0.1", stamp: "" };
export const KEYS = { scene: "leaarn-scene-v1", settings: "leaarn-settings-v1", dev: "leaarn-dev", ui: "leaarn-ui-v1", save: "leaarn-save-v1", houses: "leaarn-houses-v1", house: "leaarn-house-edit-v1" };
export const DEV_CODE = "616161";

const TX = {};
export function L2(de, en) { return { de: de, en: en }; }
export function addTexts(o) { Object.assign(TX, o); }
export function t(k) { const v = TX[k]; return v ? (v[PR.lang] || v.de) : k; }
export function fmt(s, o) { return String(s).replace(/\{(\w+)\}/g, (m, k) => (o[k] != null ? o[k] : m)); }
export function tl(v) { return v && typeof v === "object" ? (v[PR.lang] || v.de) : v; }   // L2-Objekt oder Text

export const store = {
  get(k, def) { try { const v = localStorage.getItem(k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  raw(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  setRaw(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
};

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, k) => a + (b - a) * k;
export const smooth = (k) => k * k * (3 - 2 * k);
export const DEG = Math.PI / 180;

// Zufall mit Startwert (für alles, was wiederholbar sein soll)
export function rng(seed) {
  let a = (seed >>> 0) || 1;
  return function () { a = (a + 0x6D2B79F5) >>> 0; let x = a; x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
}
export function hash2(x, y, s) {
  let h = Math.imul((x | 0) * 374761393 + (y | 0) * 668265263 + (s | 0) * 2147483647, 1274126177) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1103515245) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
// Wertrauschen mit Oktaven (Gelände-Hügel, Farbvariation)
export function vnoise(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = smooth(x - xi), fy = smooth(y - yi);
  const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
  return lerp(lerp(a, b, fx), lerp(c, d, fx), fy);
}
export function fbm(x, y, s, oct) {
  let t2 = 0, a = 0.5, n = 0;
  for (let i = 0; i < oct; i++) { t2 += a * vnoise(x, y, s + i * 31); n += a; x *= 2; y *= 2; a *= 0.5; }
  return t2 / n;
}

// Base64 für Zahlenfelder (Szenen-Export)
export function b64(u8) { let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }
export function unb64(s) { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }

// kleine DOM-Hilfe
export function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
export function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
