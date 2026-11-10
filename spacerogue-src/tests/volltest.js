/* Volltest: spielt ein festes Szenario komplett durch (Editor, 45 s Kampf gegen alle vier NPC-Schiffe, zu Fuß, Luke,
   Station mit Andockversuch) – mit festem Zufall, ohne Bildschirm. Prüft: keine Fehler, und der Endzustand ist
   exakt derselbe wie beim gemerkten Referenzlauf.

   Aufruf:            node spacerogue-src/tests/volltest.js
   Referenz merken:   node spacerogue-src/tests/volltest.js --merken
   Braucht einmalig:  npm install   (im Ordner spacerogue-src; lädt jsdom)

   Wann welche Erwartung gilt:
   - Umbau OHNE Funktionsänderung (Aufräumen, Dateien verschieben): Der Fingerabdruck MUSS gleich bleiben.
   - Gewollte Änderung am Spiel (Balance, neue Features): Der Fingerabdruck ändert sich. Dann prüfen, dass keine
     Fehler gemeldet werden, und mit --merken die neue Referenz speichern. */
"use strict";
const fs = require("fs"), path = require("path"), crypto = require("crypto");
let JSDOM; try { JSDOM = require("jsdom").JSDOM; } catch (e) { console.error("jsdom fehlt. Bitte einmal im Ordner spacerogue-src ausführen:  npm install"); process.exit(2); }
const { hooked } = require("./laden.js");
const REF = path.join(__dirname, "referenz.json");
function run(code) {
  const dom = new JSDOM('<!doctype html><html><head></head><body><div id="app"></div></body></html>', { url: "http://localhost/", runScripts: "outside-only", pretendToBeVisual: false });
  const w = dom.window; let clock = 1000, seed = 12345;
  w.Math.random = function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  w.performance.now = () => clock;
  w.requestAnimationFrame = () => 1; w.cancelAnimationFrame = () => {};
  let calls = 0;
  const grad = { addColorStop() {} };
  const ctx = new Proxy({}, { get(t, k) { if (k in t) return t[k]; if (k === "measureText") return s => ({ width: String(s).length * 6 }); if (k === "createLinearGradient" || k === "createRadialGradient") return () => grad; return () => { calls++; }; }, set(t, k, v) { t[k] = v; return true; } });
  w.HTMLCanvasElement.prototype.getContext = () => ctx; w.HTMLCanvasElement.prototype.toDataURL = () => "data:,";
  w.HTMLCanvasElement.prototype.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1280, height: 800 });
  const errs = []; w.addEventListener("error", e => errs.push(e.message));
  w.eval(code);
  const T = w.__SRT, SR = w.SpaceRogue, log = [];
  SR.mount(w.document.getElementById("app"), "de");
  function snap(tag) {
    const { S, FL } = T.st(), o = { tag, mode: S.mode, ed: S.ed, nb: S.blocks.length, calls };
    if (FL) { o.t = FL.t; o.bodies = FL.bodies.map(b => [b.x, b.y, b.a, b.vx, b.vy, b.w, b.energy, b.shE || 0, b.blocks.length, b.blocks.reduce((a, q) => a + q.hp, 0), !!b.dead, !!b.disarmed, b.ai ? b.ai.state + ":" + b.ai.man + ":" + b.ai.mor : ""]); o.n = [FL.parts.length, FL.shots.length, FL.missiles.length, FL.kills, FL.suit, FL.seated, FL.out, FL.pilot.x, FL.pilot.y]; }
    log.push(o);
  }
  const key = (k, down, extra) => (down ? T.onKey : T.onKeyUp)(Object.assign({ key: k, target: w.document.body, preventDefault() {}, stopPropagation() {}, repeat: false }, extra || {}));
  // --- Editor ---
  T.edDraw(); snap("ed0");
  let S = T.st().S;
  S.sel = "lblk"; T.tryPlace(T.ghostAt(5, 0, "lblk", 0, 0)); T.cycleSym(); T.tryPlace(T.ghostAt(6, 0, "hblk", 0, 0)); T.paintAt(5, 0); T.eraseAt(6, 0); T.undo(); T.undo();
  T.st().V.mouse = { x: 2, y: 2, sx: 700, sy: 420 }; T.edDraw(); T.info(); T.openHangar(); snap("ed1");
  // --- Testflug mit Gegnern ---
  function fly(seconds, script) {
    const n = Math.round(seconds * 120);
    for (let i = 0; i < n; i++) { const FL = T.st().FL; if (!FL) break; if (script) script(i / 120, FL, i); T.flTick(1 / 120); clock += 1000 / 120; if (i % 2 === 0) T.flDraw(); }
  }
  T.startTest(); snap("fl0");
  [1, 2, 3, 4].forEach(id => T.spawnEnemy(id));
  key("w", true); key("x", true);
  fly(45, (t, FL, i) => {
    T.st().V.mouse = { x: 0, y: 0, sx: 640 + 300 * Math.sin(t), sy: 200 + 100 * Math.cos(t * 0.7) };
    FL.fire = t > 3;
    if (i === 600) { key("w", false); key("e", true); } if (i === 720) { key("e", false); key("s", true); } if (i === 900) { key("s", false); key("d", true); key("r", true); }
    if (i === 1500) { key("d", false); key("w", true); key("Shift", true); key("c", true); } if (i === 2400) key("r", true); if (i === 3000) { key("c", true); key("z", true); key("w", false); }
    if (i === 3600) { key("z", true); key("q", true); } if (i === 3700) key("q", false);
    if (i % 1200 === 0) snap("fl@" + i);
  });
  snap("fl1");
  // zu Fuß: aufstehen, laufen, schweißen, Pistole, durch die Luke
  key("f", true); key("s", true); fly(3, (t, FL) => { FL.fire = true; }); key("2", true); key("a", true); fly(3, (t, FL, i) => { FL.fire = i % 30 === 0; }); key("s", false); key("a", false); key("f", true); fly(4, (t, FL) => { FL.fire = false; }); key("i", true); key("i", true); snap("fl2");
  key("Escape", true); snap("ed2");
  // --- Station ---
  T.setEd("station"); T.edDraw(); snap("st0"); T.startTest(); key("w", true); fly(8); key("w", false); key("p", true); fly(6); snap("st1"); key("Escape", true); T.setEd("ship"); snap("end");
  SR.unmount();
  return { hash: crypto.createHash("sha256").update(JSON.stringify(log)).digest("hex"), log, errs, calls };
}
module.exports = run;
if (require.main === module) {
  const file = process.argv.find(a => a.endsWith(".js") && a !== __filename && !a.endsWith("volltest.js"));
  const r = run(hooked(file ? fs.readFileSync(file, "utf8") : undefined)), ver = (hooked().match(/var VERSION = "([^"]+)"/) || [])[1];
  const fl = r.log.find(o => o.tag === "fl1");
  console.log("Szenario durchgespielt · " + r.calls + " Zeichenaufrufe · Kampfende: " + fl.bodies.length + " Körper, " + fl.n[3] + " Abschuss/Abschüsse");
  console.log("Fingerabdruck: " + r.hash);
  if (r.errs.length) { console.log("FEHLER im Spielcode:\n  " + r.errs.join("\n  ")); process.exit(1); }
  if (process.argv.indexOf("--merken") >= 0) { fs.writeFileSync(REF, JSON.stringify({ version: ver, hash: r.hash }, null, 2) + "\n"); console.log("Als Referenz gemerkt (Version " + ver + ")."); process.exit(0); }
  let ref = null; try { ref = JSON.parse(fs.readFileSync(REF, "utf8")); } catch (e) {}
  if (!ref) { console.log("Keine Referenz vorhanden. Mit --merken anlegen."); process.exit(0); }
  if (ref.hash === r.hash) { console.log("GLEICH wie Referenz (Version " + ref.version + "): Das Spiel verhält sich unverändert."); process.exit(0); }
  console.log("ANDERS als Referenz (Version " + ref.version + "). Bei einem reinen Umbau ist das ein Fehler; bei einer gewollten Spieländerung mit --merken bestätigen."); process.exit(3);
}
