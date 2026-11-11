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
  for (let i = 0; i < n + 2; i++) { if (me.mst && me.mst.msh) me.mst.msh.cd = 0; T.weapons(me, 1 / 120, "msh", true, null); }
  assert.strictEqual(FL.missiles.length, n, "genau eine Rakete je Werfer"); FL.missiles.forEach(m => assert.strictEqual(m.k, 4));
  assert(Math.abs(e0 - me.energy - T.MS.e * 2 * n) < 1e-6, "Energie je Schuss");
  assert.strictEqual(me.mst.msh.rl, T.MS.reload * n, "lädt so lange nach wie leichte Werfer");
  E.fly(T.MS.reload * n + 0.2); me.blocks.filter(b => b.t === "msh").forEach(b => assert.strictEqual(b.ammo, 1, "nachgeladen"));
  assert.deepStrictEqual(E.errs, []);
});
test("Bauteilliste zeigt zu jedem Block Gewicht und Preis", () => {
  const E = boot(); const el = E.q('.sr-blk[data-blk="msh"]'); assert(el, "Schwere Rakete fehlt in der Liste");
  E.root.querySelectorAll(".sr-blk").forEach(b => { const sm = b.querySelectorAll("small"); assert.strictEqual(sm.length, 2); assert(/kg$/.test(sm[0].textContent)); assert(/Cr$/.test(sm[1].textContent)); });
  assert(/2\.400 Cr/.test(el.textContent));
});

test("v0.51: leichte und schwere Raketen, 25-mm- und 120-mm-Geschütz sind eigene Waffengruppen", () => {
  const E = boot(), T = E.T, S = E.st().S;
  const ms = S.blocks.filter(b => b.t === "msl"); assert(ms.length >= 2, "Beispielschiff hat zwei leichte Werfer");
  ms[0].t = "msh"; const mg = S.blocks.filter(b => b.t === "mgn"); assert(mg.length >= 2); mg[0].t = "g25"; mg[1].t = "g25";
  T.startTest(); E.fly(0.05); const FL = E.st().FL;
  assert.strictEqual(JSON.stringify(FL.groups), JSON.stringify(["mg", "g25", "msl", "msh", "rg"].filter(g => FL.groups.indexOf(g) >= 0)), "Reihenfolge");
  assert(FL.groups.indexOf("msl") >= 0 && FL.groups.indexOf("msh") >= 0 && FL.groups.indexOf("g25") >= 0);
  assert.deepStrictEqual(E.errs, []);
});
test("25-mm-Geschütz: 100 Schuss/min je Rohr, Projektil 50 % schneller als Minigun, trifft mit vollem Schaden", () => {
  const E = boot(), T = E.T, S = E.st().S;
  S.blocks.filter(b => b.t === "mgn").forEach(b => b.t = "g25");
  const n = S.blocks.filter(b => b.t === "g25").length;
  T.startTest(); E.fly(0.05); const FL = E.st().FL, me = FL.me; me.energy = me.cap;
  FL.shots.length = 0;
  for (let i = 0; i < 120 * 6; i++) { T.weapons(me, 1 / 120, "g25", true, null); me.blocks.forEach(b => { if (b.t === "g25" && b.gcd > 0) b.gcd -= 1 / 120; }); me.energy = me.cap; }
  const fired = FL.shots.filter(p => p.k === "g25");
  assert(Math.abs(fired.length - n * 10) <= n, "in 6 s etwa 10 Schuss je Rohr, waren " + fired.length);
  const v = Math.hypot(fired[0].vx - me.vx, fired[0].vy - me.vy); assert(Math.abs(v - T.MG.speed * 1.5) < 1, "Tempo");
  assert(fired[0].dmg > T.MG.dmg * 4, "deutlich mehr Schaden als die Minigun");
  assert.deepStrictEqual(E.errs, []);
});
test("120-mm-Geschütz: 20 Schuss/min, schneller Flug, kleine Explosion beim Treffer", () => {
  const E = boot(), T = E.T; const G = T.GUN.g120;
  assert.strictEqual(G.rpm, 20); assert(Math.abs(G.speed - T.MG.speed * 1.5) < 1e-9); assert(G.splash > 0 && G.dmg > T.GUN.g25.dmg * 3);
  const w = T.wStats("g120"); assert(Math.abs(w.dps - G.dmg * 20 / 60) < 1e-9);
});
test("Waffenwerte (Schaden, RPM, DPS) stehen im Tooltip und im Infofeld", () => {
  const E = boot(), T = E.T;
  const tip = E.q('.sr-blk[data-blk="mgn"]').getAttribute("title"); assert(/RPM/.test(tip) && /DPS/.test(tip) && /Schaden/.test(tip), tip);
  assert(!/RPM/.test(E.q('.sr-blk[data-blk="flo"]').getAttribute("title")), "nur bei Waffen");
  T.info(); const inf = E.w.document.getElementById("sr-info").textContent; assert(/DPS/.test(inf) && /RPM/.test(inf), "Infofeld");
});
test("Panzerung 1×2: so schwer wie zwei Einzelblöcke, aber günstiger", () => {
  const E = boot(), T = E.T;
  ["l", "h"].forEach(p => { const a = T.T[p + "blk"], b = T.T[p + "bl2"]; assert(b && b.h === 2); assert(Math.abs(b.mass - 2 * a.mass) < 0.002, p + " Masse"); assert(b.cost < 2 * a.cost, p + " Preis"); });
});
test("Einrichtung gehört zum Raum, hält die Luft und ist nicht begehbar", () => {
  const E = boot(), T = E.T;
  ["stu", "tis", "bet", "dbt", "toi", "dus"].forEach(id => assert(T.T[id] && T.T[id].kind === "deco" && E.q('.sr-blk[data-blk="' + id + '"]'), id));
  const S = E.st().S, f = S.blocks.filter(b => b.t === "flo"); const r0 = T.rooms(S.blocks).filter(r => r.ok).length;
  f[0].t = "toi"; const r1 = T.rooms(S.blocks); assert.strictEqual(r1.filter(r => r.ok).length, r0, "Raum bleibt dicht");
  assert(r1.some(r => r.cells.some(c => c[0] === f[0].x && c[1] === f[0].y)), "Toilette liegt im Raum");
});
test("Maschinenpistole (Slot 3): Dauerfeuer bei gehaltener Maustaste, schneller als die Pistole", () => {
  const E = boot(), T = E.T; T.startTest(); E.fly(0.05); const FL = E.st().FL;
  T.toggleSeat(); E.fly(0.1); E.key("3"); assert.strictEqual(FL.slot, 3);
  E.st().V.mouse = { sx: 640, sy: 100 }; FL.fire = true; let n = 0, last = FL.pcd;
  E.fly(1, F => { if (F.pcd !== last) { n++; last = F.pcd; } }); FL.fire = false;   // Schüsse zählen (sie treffen sofort die eigene Wand) assert(n >= 9 && n <= 12, "etwa 11 Schuss pro Sekunde, waren " + n);
  assert.deepStrictEqual(E.errs, []);
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
