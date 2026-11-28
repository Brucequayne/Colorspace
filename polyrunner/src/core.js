// ===== core.js · Namensraum, Texte, Speicher, Mathe, DOM-Hilfen =====
export const PRU = { lang: "de", VERSION: "0.18", stamp: "" };
export const KEYS = { map: "polyrunner-map-v1", settings: "polyrunner-settings-v1", dev: "polyrunner-dev", best: "polyrunner-best-v1", ui: "polyrunner-ui-v1", char: "polyrunner-char-v1", kleider: "polyrunner-kleider-v1", tune: "polyrunner-tune-v1", tunePre: "polyrunner-tune-presets-v1" };
export const DEV_CODE = "282828";

const TX = {};
export function L2(de, en) { return { de: de, en: en }; }
export function addTexts(o) { Object.assign(TX, o); }
export function t(k) { const v = TX[k]; return v ? (v[PRU.lang] || v.de) : k; }
export function fmt(s, o) { return String(s).replace(/\{(\w+)\}/g, (m, k) => (o[k] != null ? o[k] : m)); }

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
// gedämpftes Annähern, unabhängig von der Bildrate (k = Geschwindigkeit pro Sekunde)
export const damp = (a, b, k, dt) => b + (a - b) * Math.exp(-k * dt);
export function dampAngle(a, b, k, dt) { let d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return a + d * (1 - Math.exp(-k * dt)); }
export const r3 = (v) => Math.round(v * 1000) / 1000;
export function uid() { return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4); }

// Zeit als 0:12.345
export function ftime(s) {
  if (s == null || !isFinite(s)) return "–:––.–––";
  const m = Math.floor(s / 60), r = s - m * 60;
  return m + ":" + (r < 10 ? "0" : "") + r.toFixed(3);
}

export function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
export function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
export function download(name, text) {
  const a = document.createElement("a"), url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
}
