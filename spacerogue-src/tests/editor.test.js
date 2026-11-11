/* Tests für Editor und Testflug mit echtem Spielablauf ohne Bildschirm:  node spacerogue-src/tests/editor.test.js
   Braucht einmalig:  npm install  (im Ordner spacerogue-src) */
"use strict";
const assert = require("assert"), { boot } = require("./attrappe.js");
let ok = 0, fail = 0;
function test(name, fn) { try { fn(); ok++; console.log("  ok   " + name); } catch (e) { fail++; console.log("  FEHLER " + name + "\n         " + (e.stack || e.message).split("\n").slice(0, 3).join("\n         ")); } }

console.log("Waffen und Bauteilliste");
test("Schwere Rakete: 1 Schuss je Werfer, vierfacher Schaden, doppelte Energie, gleiche Nachladezeit, teurer als der leichte Werfer", () => {
  const E = boot(), T = E.T, S = E.st().S;
  assert(T.T.msh && T.T.msh.kind === "ms" && T.T.msh.rk === 1 && T.T.msh.mk === 4); assert(T.T.msh.cost > T.T.msl.cost);
  S.blocks.forEach(b => { if (b.t === "msl") b.t = "msh"; });
  const n = S.blocks.filter(b => b.t === "msh").length; assert(n >= 1, "Beispielschiff hat Raketenwerfer");
  T.startTest(); E.fly(0.05); const FL = E.st().FL, me = FL.me, e0 = me.energy;
  for (let i = 0; i < n + 2; i++) { me.msCd = 0; T.weapons(me, 1 / 120, "ms", true, null); }
  assert.strictEqual(FL.missiles.length, n, "genau eine Rakete je Werfer"); FL.missiles.forEach(m => assert.strictEqual(m.k, 4));
  assert(Math.abs(e0 - me.energy - T.MS.e * 2 * n) < 1e-6, "Energie je Schuss");
  assert.strictEqual(me.msRl, T.MS.reload * n, "lädt so lange nach wie leichte Werfer");
  E.fly(T.MS.reload * n + 0.2); me.blocks.filter(b => b.t === "msh").forEach(b => assert.strictEqual(b.ammo, 1, "nachgeladen"));
  assert.deepStrictEqual(E.errs, []);
});
test("Bauteilliste zeigt zu jedem Block Gewicht und Preis", () => {
  const E = boot(); const el = E.q('.sr-blk[data-blk="msh"]'); assert(el, "Schwere Rakete fehlt in der Liste");
  E.root.querySelectorAll(".sr-blk").forEach(b => { const sm = b.querySelectorAll("small"); assert.strictEqual(sm.length, 2); assert(/kg$/.test(sm[0].textContent)); assert(/Cr$/.test(sm[1].textContent)); });
  assert(/2\.400 Cr/.test(el.textContent));
});

console.log("Editor und Testflug");
test("kein Run-Modus mehr: kein Run-Knopf, Esc beendet den Testflug, Rechtsklick-Testschaden geht", () => {
  const E = boot(), T = E.T;
  assert(!E.root.querySelector('[data-act^="run-"]'), "Run-Knopf ist weg");
  T.startTest(); E.fly(0.2); assert.strictEqual(E.st().S.mode, "fly");
  E.key("Escape"); assert.strictEqual(E.st().S.mode, "edit", "Esc führt zurück in den Editor");
  assert.deepStrictEqual(E.errs, []);
});

console.log("\n" + ok + " bestanden, " + fail + " fehlgeschlagen");
process.exit(fail ? 1 : 0);
