/* Browser-Attrappe für Tests: lädt das Spiel in jsdom, mit festem Zufall, stehender Uhr und einer Zeichenfläche, die nichts malt. */
"use strict";
let JSDOM; try { JSDOM = require("jsdom").JSDOM; } catch (e) { console.error("jsdom fehlt. Bitte einmal im Ordner spacerogue-src ausführen:  npm install"); process.exit(2); }
const { hooked } = require("./laden.js");
function boot(lang) {
  const dom = new JSDOM('<!doctype html><html><head></head><body><div id="app"></div></body></html>', { url: "http://localhost/", runScripts: "outside-only" });
  const w = dom.window; let seed = 4711; const env = { w, clock: 1000, errs: [] };
  w.Math.random = function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  w.performance.now = () => env.clock; w.requestAnimationFrame = () => 1; w.cancelAnimationFrame = () => {};
  const grad = { addColorStop() {} };
  const ctx = new Proxy({}, { get(t, k) { if (k in t) return t[k]; if (k === "measureText") return s => ({ width: String(s).length * 6 }); if (k === "createLinearGradient" || k === "createRadialGradient") return () => grad; return () => {}; }, set(t, k, v) { t[k] = v; return true; } });
  w.HTMLCanvasElement.prototype.getContext = () => ctx; w.HTMLCanvasElement.prototype.toDataURL = () => "data:,";
  w.HTMLCanvasElement.prototype.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1280, height: 800 });
  w.addEventListener("error", e => env.errs.push(e.message));
  w.eval(hooked());
  env.T = w.__SRT; env.SR = w.SpaceRogue; env.root = w.document.getElementById("app");
  env.SR.mount(env.root, lang || "de");
  env.st = () => env.T.st();
  // seconds Sekunden Flug simulieren; bricht ab, sobald der Flug endet
  env.fly = (seconds, each) => { const n = Math.round(seconds * 120); for (let i = 0; i < n; i++) { const FL = env.T.st().FL; if (!FL || FL.paused) return i / 120; if (each) each(FL, i); env.T.flTick(1 / 120); env.clock += 1000 / 120; if (i % 4 === 0) env.T.flDraw(); } return seconds; };
  env.key = (k, down) => (down === false ? env.T.onKeyUp : env.T.onKey)({ key: k, target: w.document.body, preventDefault() {}, stopPropagation() {}, repeat: false });
  env.click = sel => { const el = env.root.querySelector(sel); if (!el) throw new Error("Element fehlt: " + sel); el.click(); };
  env.q = sel => env.root.querySelector(sel);
  return env;
}
module.exports = { boot };
