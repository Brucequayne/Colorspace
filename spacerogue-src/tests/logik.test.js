/* Tests für Daten und Schiffslogik. Laufen ohne Browser und ohne Installation:  node spacerogue-src/tests/logik.test.js */
"use strict";
const assert = require("assert");
const G = require("./laden.js").loadLogic();
const { T, CATS, TX, TIPS, NPC } = G;
let ok = 0, fail = 0;
function test(name, fn) { try { fn(); ok++; console.log("  ok   " + name); } catch (e) { fail++; console.log("  FEHLER " + name + "\n         " + e.message); } }
const blk = (t, x, y, r, f) => ({ t, x, y, r: r || 0, f: f || 0 });
const kindCount = (bl, k) => bl.filter(b => T[b.t].kind === k).length;

console.log("Daten");
test("jedes Bauteil hat Masse, HP, Kosten, Namen (de/en) und eine bekannte Kategorie", () => {
  const ids = Object.keys(T); assert(ids.length >= 30, "zu wenige Bauteile: " + ids.length);
  ids.forEach(id => { const ty = T[id];
    assert(ty.mass > 0, id + ": Masse"); assert(ty.hp > 0, id + ": HP"); assert(ty.cost > 0, id + ": Kosten");
    assert(ty.w >= 1 && ty.h >= 1, id + ": Größe"); assert(ty.n && ty.n.de && ty.n.en, id + ": Name"); assert(CATS.indexOf(ty.cat) >= 0, id + ": Kategorie " + ty.cat); });
});
test("alle Texte sind zweisprachig", () => {
  Object.keys(TX).forEach(k => assert(typeof TX[k].de === "string" && typeof TX[k].en === "string" && TX[k].de && TX[k].en, "Text " + k));
  assert.strictEqual(TIPS.de.length, TIPS.en.length, "Spieltipps de/en ungleich viele");
});
test("Kategorien haben Texte", () => CATS.forEach(c => assert(TX[c], "Kategorie " + c)));

console.log("Werte (stats)");
test("Beispielschiff: Cockpit, Gyroskop, Schub in alle vier Richtungen, Energie", () => {
  const bl = G.starter(), s = G.stats(bl);
  assert.strictEqual(s.cock, 1); assert(s.gyro >= 1); assert(s.torque > 0);
  [0, 1, 2, 3].forEach(d => assert(s.thr[d] > 0, "kein Schub in Richtung " + d));
  assert(s.cap > 0 && s.prod > 0, "Energie"); assert(s.mg > 0 && s.rg > 0 && s.ms > 0, "Waffen");
});
test("Masse ist die Summe der Blockmassen, Schwerpunkt liegt im Schiff", () => {
  const bl = G.starter(), s = G.stats(bl), sum = bl.reduce((a, b) => a + T[b.t].mass, 0), bb = G.bounds(bl);
  assert(Math.abs(s.mass - sum) < 1e-9); assert.strictEqual(s.n, bl.length);
  assert(s.com[0] > bb.x0 && s.com[0] < bb.x1 && s.com[1] > bb.y0 && s.com[1] < bb.y1, "Schwerpunkt außerhalb");
  assert(s.I > 0, "Trägheitsmoment");
});
test("ein zusätzlicher Block verschiebt Masse und Schwerpunkt in seine Richtung", () => {
  const bl = G.starter(), s0 = G.stats(bl), s1 = G.stats(bl.concat([blk("hblk", 30, 0)]));
  assert(Math.abs(s1.mass - s0.mass - T.hblk.mass) < 1e-9); assert(s1.com[0] > s0.com[0]);
});
test("Schub zeigt in Montagerichtung: ein nach rechts gedrehtes Triebwerk schiebt nach rechts", () => {
  assert(G.stats([blk("ths", 0, 0, 0)]).thr[0] > 0); assert(G.stats([blk("ths", 0, 0, 1)]).thr[1] > 0);
  assert(G.stats([blk("ths", 0, 0, 2)]).thr[2] > 0); assert(G.stats([blk("ths", 0, 0, 3)]).thr[3] > 0);
});
test("Perk-Haken: Batterien ohne Gewicht und leichtere schwere Panzerung wirken auf die Masse", () => {
  const bl = [blk("bat", 0, 0), blk("hblk", 1, 0)];
  assert(Math.abs(G.stats(bl, { batW: true, heavyW: 0 }).mass - T.hblk.mass) < 1e-9);
  assert(Math.abs(G.stats(bl, { batW: false, heavyW: 0.5 }).mass - (T.bat.mass + T.hblk.mass * 0.5)) < 1e-9);
});

console.log("Räume und Luftdichtheit (rooms)");
test("Beispielschiff und Beispielstation sind luftdicht", () => {
  [G.starter(), G.starterStation()].forEach(bl => { const R = G.rooms(bl); assert(R.length >= 1, "kein Raum"); R.forEach(r => assert(r.ok, "Raum undicht: " + JSON.stringify(r.leaks))); });
});
test("fehlt ein Wandblock neben dem Boden, ist der Raum undicht", () => {
  const bl = G.starter(), M = G.buildMap(bl), floor = bl.filter(b => T[b.t].kind === "floor");
  let wall = null;
  floor.some(f => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(d => { const o = M.get(G.key(f.x + d[0], f.y + d[1])); if (o && T[o.b.t].kind === "armor") { wall = o.b; return true; } return false; }));
  assert(wall, "kein Wandblock am Boden gefunden");
  const R = G.rooms(bl.filter(b => b !== wall)); assert(R.some(r => !r.ok && r.leaks.length), "Leck nicht erkannt");
});
test("eine offene Luke ist ein Leck, eine geschlossene nicht", () => {
  const bl = G.starter(), hat = bl.filter(b => T[b.t].kind === "hatch")[0]; assert(hat, "keine Luke");
  hat.open = true; assert(G.rooms(bl).some(r => !r.ok)); hat.open = false; assert(G.rooms(bl).every(r => r.ok));
});
test("ein einzelnes Bodenfeld im All ist ein undichter Raum mit vier Lecks", () => {
  const R = G.rooms([blk("flo", 0, 0)]); assert.strictEqual(R.length, 1); assert.strictEqual(R[0].leaks.length, 4);
});

console.log("Zusammenhang (components)");
test("Beispielschiff ist ein Stück; ein entfernter Block wird als lose erkannt", () => {
  const bl = G.starter(); assert.strictEqual(G.components(bl).length, 1);
  const c2 = G.components(bl.concat([blk("lblk", 40, 40)])); assert.strictEqual(c2.length, 2);
  const main = c2.reduce((a, b) => G.mainScore(b) > G.mainScore(a) ? b : a); assert.strictEqual(main.length, bl.length);
});
test("die Düse eines Triebwerks verbindet nicht, die Montageseite schon", () => {
  assert.strictEqual(G.components([blk("ths", 0, 0), blk("lblk", 0, 2)]).length, 2, "Block hinter der Düse hängt fest");
  assert.strictEqual(G.components([blk("ths", 0, 0), blk("lblk", 0, -1)]).length, 1, "Block vor dem Triebwerk hängt nicht");
});
test("Rampen verbinden nur an ihren geraden Seiten", () => {
  assert.strictEqual(G.components([blk("lrmp", 0, 0), blk("lblk", 0, 1)]).length, 1);
  assert.strictEqual(G.components([blk("lrmp", 0, 0), blk("lblk", 0, -1)]).length, 2);
});

console.log("Kühlung");
test("Kühlblöcke kühlen anliegende Teile, ein Netz zählt gemeinsam", () => {
  const mg = blk("mgn", 0, 0), bl = [mg, blk("col", 1, 1), blk("col", 2, 1)], cm = G.coolMap(bl);
  assert.strictEqual(cm.get(mg), 2); assert.strictEqual(G.coolMap([mg, blk("col", 5, 5)]).get(mg), undefined);
});
test("Overcharge dauert ohne Kühlung 3 s und mit Kühlung am Triebwerk länger", () => {
  const th = blk("ths", 0, 0), a = [th], b = [th, blk("col", 1, 0)];
  assert.strictEqual(G.ocMaxOf(a, G.coolMap(a)), 3); assert(G.ocMaxOf(b, G.coolMap(b)) > 3);
});

console.log("Schiffscode (Export/Import)");
const code = bl => JSON.stringify({ sr: 1, color: "#C8473A", b: bl.map(b => { const a = [b.t, b.x, b.y, b.r, b.f]; if (b.c) a.push(b.c); return a; }) });
test("Export und Import ergeben dasselbe Schiff", () => {
  const bl = G.starter().map(G.strip), back = G.parseShip(code(bl));
  assert.deepStrictEqual(JSON.parse(JSON.stringify(back)), JSON.parse(JSON.stringify(bl)));
});
test("ungültiger Code wird abgelehnt, unbekannte Bauteile werden übersprungen", () => {
  assert.strictEqual(G.parseShip("kein json"), null); assert.strictEqual(G.parseShip("{}"), null); assert.strictEqual(G.parseShip('{"sr":1,"b":[]}'), null);
  const p = G.parseShip('{"sr":1,"b":[["gibtsnicht",0,0,0,0],["lblk",1,2,5,1]]}'); assert.strictEqual(p.length, 1); assert.strictEqual(p[0].r, 1, "Drehung wird auf 0–3 begrenzt");
});

console.log("NPC-Schiffe");
NPC.forEach(sh => test("#" + sh.id + " " + sh.n.de + ": lädt, fliegt, kämpft, hängt zusammen", () => {
  const bl = G.npcBlocks(sh), s = G.stats(bl);
  assert.strictEqual(bl.length, sh.code.b.length, "nicht alle Blöcke geladen");
  assert(s.cock >= 1, "Cockpit"); assert(s.gyro >= 1, "Gyroskop"); assert(s.thr[0] > 0, "Vortrieb");
  assert(s.mg + s.rg + s.ms > 0, "Waffe"); assert(s.cap > 0 || s.prod > 0, "Energie");
  assert.strictEqual(G.components(bl).length, 1, "lose Blöcke");
  const seen = new Set(); bl.forEach(b => G.cellsOf(b).forEach(q => { const k = G.key(q.c[0], q.c[1]); assert(!seen.has(k), "Blöcke überlappen bei " + k); seen.add(k); }));
}));

console.log("\n" + ok + " bestanden, " + fail + " fehlgeschlagen");
process.exit(fail ? 1 : 0);
