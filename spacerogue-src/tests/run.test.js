/* Tests für den Rogue-like-Run. Spielen den Ablauf ohne Bildschirm durch:  node spacerogue-src/tests/run.test.js
   Braucht einmalig:  npm install  (im Ordner spacerogue-src) */
"use strict";
const assert = require("assert"), { boot } = require("./attrappe.js");
let ok = 0, fail = 0;
function test(name, fn) { try { fn(); ok++; console.log("  ok   " + name); } catch (e) { fail++; console.log("  FEHLER " + name + "\n         " + (e.stack || e.message).split("\n").slice(0, 3).join("\n         ")); } }
const enemies = FL => FL.bodies.filter(b => b.enemy);
const cockpit = (T, bd) => bd.blocks.filter(b => T.T[b.t].kind === "cock")[0];
// alle Gegner ausschalten: Cockpit zerstören (am Schild vorbei), dann einen Moment simulieren, damit das Spiel es verbucht
function killAll(E) { const { T } = E; enemies(E.st().FL).slice().forEach(bd => { const c = cockpit(T, bd); if (c) T.damage(bd, c, 1e6, 0, 0, true); }); E.fly(0.1); }
function clearStage(E) { killAll(E); assert.strictEqual(E.st().RUN.phase, "repair", "nach dem letzten Gegner beginnt die Reparaturzeit"); E.fly(E.T.RUNCFG.repairTime + 1); }

console.log("Stage-Planung");
test("Stage 1 ist ein einzelner kleiner Gegner, das Budget wächst mit jeder Stage", () => {
  const E = boot(), T = E.T;
  assert(T.runBudget(2) > T.runBudget(1) && T.runBudget(9) > T.runBudget(8));
  for (let i = 0; i < 20; i++) { const ids = T.runEnemies(1); assert.strictEqual(ids.length, 1); assert(T.runValue(ids[0]) <= T.runBudget(1) * T.RUNCFG.over); }
});
test("jede 4. Stage ist eine Boss-Stage und beginnt mit dem Boss; nie mehr Gegner als erlaubt", () => {
  const E = boot(), T = E.T;
  [4, 8, 12, 40].forEach(n => { assert(T.runIsBoss(n)); assert.strictEqual(T.runEnemies(n)[0], T.RUNCFG.bossId); });
  [1, 2, 3, 5].forEach(n => { assert(!T.runIsBoss(n)); assert(T.runEnemies(n).indexOf(T.RUNCFG.bossId) < 0, "Boss in früher normaler Stage " + n); });
  for (let n = 1; n <= 60; n++) { const ids = T.runEnemies(n); assert(ids.length >= 1 && ids.length <= T.RUNCFG.maxEnemies, "Stage " + n + ": " + ids.length + " Gegner"); }
});
test("Startschiff und Boss existieren als Baupläne; alle Perks zeigen auf einen vorhandenen Perk-Haken", () => {
  const E = boot(), T = E.T; assert(T.NPC.some(q => q.id === T.RUNCFG.startShip)); assert(T.NPC.some(q => q.id === T.RUNCFG.bossId));
  const ids = new Set(); T.PERKS.forEach(p => { assert(p.k in T.PM, "Perk " + p.id + ": Haken " + p.k + " fehlt"); assert(p.n.de && p.n.en && p.d.de && p.d.en, "Perk " + p.id + ": Text"); assert(!ids.has(p.id)); ids.add(p.id); assert(p.v === true ? T.PM[p.k] === false : typeof T.PM[p.k] === "number", "Perk " + p.id + ": Werttyp"); });
});

console.log("Ablauf");
test("Run starten: Flug mit dem Startschiff, Stage 1, Gegner greifen sofort an, Editor-Entwurf bleibt unberührt", () => {
  const E = boot(), T = E.T; T.save(); const before = JSON.stringify(E.st().S.ship.map(T.strip)), saved = E.w.localStorage.getItem("spacerogue-ship-v1");
  E.click('[data-act="run-start"]');
  const { S, FL, RUN } = E.st();
  assert.strictEqual(S.mode, "fly"); assert.strictEqual(RUN.stage, 1); assert.strictEqual(RUN.phase, "fight");
  assert.strictEqual(FL.me.blocks.length, T.npcBlocks(T.NPC.filter(q => q.id === T.RUNCFG.startShip)[0]).length);
  assert.strictEqual(enemies(FL).length, 1); assert.strictEqual(enemies(FL)[0].ai.state, "combat");
  assert(!FL.bodies.some(b => b.target), "Übungsziele im Run");
  assert(E.q(".sr-root").classList.contains("run"));
  assert.strictEqual(JSON.stringify(S.ship.map(T.strip)), before); assert.strictEqual(E.w.localStorage.getItem("spacerogue-ship-v1"), saved);
});
test("Abschuss bringt Credits nach Schiffswert; danach 30 s Reparaturzeit, dann Werft mit Stage 2", () => {
  const E = boot(), T = E.T; T.runStart();
  const val = T.runValue(enemies(E.st().FL)[0].npc.id);
  killAll(E);
  let R = E.st().RUN; assert.strictEqual(R.phase, "repair"); assert.strictEqual(R.kills, 1); assert.strictEqual(R.credits, Math.round(val * T.RUNCFG.rewardK));
  assert(Math.abs(R.t - T.RUNCFG.repairTime) < 0.2);
  E.fly(T.RUNCFG.repairTime - 2); assert.strictEqual(E.st().RUN.phase, "repair", "Reparaturzeit endet zu früh");
  E.fly(3);
  const { S, FL, RUN } = E.st(); assert.strictEqual(FL, null); assert.strictEqual(S.mode, "edit"); assert.strictEqual(RUN.phase, "shop"); assert.strictEqual(RUN.stage, 2);
  assert.strictEqual(S.blocks, RUN.blocks);
});
test("Reparaturzeit lässt sich mit Enter überspringen; Esc führt im Run nicht in den Editor", () => {
  const E = boot(), T = E.T; T.runStart(); E.key("Escape"); assert.strictEqual(E.st().S.mode, "fly");
  E.key("Enter"); assert.strictEqual(E.st().RUN.phase, "fight", "Enter darf den Kampf nicht überspringen");
  killAll(E); E.key("Enter"); assert.strictEqual(E.st().RUN.phase, "shop");
});
test("ein fliehender Gegner gilt ab der Fluchtdistanz als entkommen und bringt nichts", () => {
  const E = boot(), T = E.T; T.runStart(); const { FL } = E.st(), bd = enemies(FL)[0];
  bd.ai.state = "flee"; bd.x = FL.me.x + T.RUNCFG.escape + 50; bd.y = FL.me.y; E.fly(0.05);
  const R = E.st().RUN; assert.strictEqual(R.phase, "repair"); assert.strictEqual(R.credits, 0); assert.strictEqual(R.escaped, 1);
});

console.log("Schaden und Werft");
test("Schaden bleibt: beschädigte Blöcke kommen beschädigt in die Werft und in die nächste Stage, zerstörte fehlen", () => {
  const E = boot(), T = E.T; T.runStart();
  const me = E.st().FL.me, n0 = me.blocks.length, hurt = me.blocks.filter(b => T.T[b.t].kind === "armor")[0], gone = me.blocks.filter(b => T.T[b.t].kind === "gyro")[0];
  const hx = hurt.x, hy = hurt.y; T.damage(me, hurt, T.T[hurt.t].hp * 0.5, 0, 0, true); T.damage(me, gone, 1e6, 0, 0, true);
  clearStage(E);
  let { S, RUN } = E.st(); assert.strictEqual(S.blocks.length, n0 - 1);
  const hb = S.blocks.filter(b => b.x === hx && b.y === hy)[0]; assert(Math.abs(hb.hp - T.T[hb.t].hp * 0.5) < 1e-6, "HP in der Werft");
  assert.strictEqual(S.blocks.filter(b => b.hp !== undefined).length, 1, "nur der beschädigte Block trägt HP");
  T.runNext(); const me2 = E.st().FL.me, hb2 = me2.blocks.filter(b => b.x === hx && b.y === hy)[0];
  assert(Math.abs(hb2.hp - T.T[hb2.t].hp * 0.5) < 1e-6, "HP in der nächsten Stage"); assert.strictEqual(E.st().RUN.stage, 2);
});
test("in der Reparaturzeit lässt sich kostenlos schweißen: zerstörte Blöcke stehen als Hologramm bereit", () => {
  const E = boot(), T = E.T; T.runStart(); const me = E.st().FL.me, b = me.blocks.filter(q => T.T[q.t].kind === "armor")[0];
  T.damage(me, b, 1e6, 0, 0, true); killAll(E);
  assert.strictEqual(E.st().RUN.phase, "repair"); assert.strictEqual(me.lost.length, 1);
});
test("Werft: Bauen kostet, zu wenig Credits wird abgelehnt, Abreißen erstattet, Rückgängig stellt auch das Guthaben wieder her", () => {
  const E = boot(), T = E.T; T.runStart(); clearStage(E);
  const { S, RUN } = E.st(), c0 = RUN.credits, n0 = S.blocks.length; assert(c0 > 0);
  // freies Feld mit Anschluss suchen
  const M = T.buildMap(S.blocks); let spot = null;
  S.blocks.some(b => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(d => { const g = T.ghostAt(b.x + d[0], b.y + d[1], "lblk", 0, 0); if (!M.has(T.key(g.x, g.y)) && T.components(S.blocks.concat([g])).length === 1) { spot = g; return true; } return false; }));
  assert(spot, "kein freier Bauplatz");
  assert.strictEqual(T.tryPlace(spot), true); let s = E.st();
  assert.strictEqual(s.RUN.credits, c0 - T.T.lblk.cost); assert.strictEqual(s.S.blocks.length, n0 + 1); assert.strictEqual(s.RUN.blocks, s.S.blocks);
  T.undo(); s = E.st(); assert.strictEqual(s.RUN.credits, c0); assert.strictEqual(s.S.blocks.length, n0);
  s.RUN.credits = T.T.lblk.cost - 1; assert.strictEqual(T.tryPlace(spot), false); assert.strictEqual(E.st().S.blocks.length, n0); assert.strictEqual(E.st().RUN.credits, T.T.lblk.cost - 1);
  s.RUN.credits = 5000; T.tryPlace(spot); T.eraseAt(spot.x, spot.y); assert.strictEqual(E.st().RUN.credits, 5000, "neuer Block: volle Erstattung");
  const v = E.st().S.blocks.filter(b => T.T[b.t].kind === "armor")[0]; v.hp = T.T[v.t].hp * 0.25; const cb = E.st().RUN.credits;
  T.eraseAt(v.x, v.y); assert.strictEqual(E.st().RUN.credits, cb + Math.round(T.T[v.t].cost * 0.25), "beschädigter Block: Erstattung nach Zustand");
});
test("Werft: Reparieren kostet den halben Anteil, mit zu wenig Credits wird anteilig repariert", () => {
  const E = boot(), T = E.T; T.runStart(); clearStage(E);
  let { S, RUN } = E.st(); const a = S.blocks.filter(b => T.T[b.t].kind === "thr")[0]; a.hp = T.T[a.t].hp * 0.5;
  const want = Math.round(T.T[a.t].cost * 0.5 * T.RUNCFG.repairK); assert.strictEqual(T.runRepairCost(), want);
  RUN.credits = want + 100; T.runRepair(); assert.strictEqual(a.hp, undefined); assert.strictEqual(E.st().RUN.credits, 100); assert.strictEqual(T.runRepairCost(), 0);
  T.undo(); const a2 = E.st().S.blocks.filter(b => b.x === a.x && b.y === a.y)[0]; assert(Math.abs(a2.hp - T.T[a2.t].hp * 0.5) < 1e-6); assert.strictEqual(E.st().RUN.credits, want + 100);
  E.st().RUN.credits = Math.floor(want / 2); T.runRepair(); const a3 = E.st().S.blocks.filter(b => b.x === a.x && b.y === a.y)[0];
  assert(a3.hp > T.T[a3.t].hp * 0.5 && a3.hp < T.T[a3.t].hp, "anteilig repariert"); assert.strictEqual(E.st().RUN.credits, 0);
});
test("im Run sind Import, Leeren, Beispielschiff, Hangar, Stations-Editor und Testflug gesperrt", () => {
  const E = boot(), T = E.T; T.runStart(); clearStage(E); const n = E.st().S.blocks.length;
  ['[data-act="clear"]', '[data-act="starter"]', '[data-act="ed-st"]', '[data-act="test"]', '[data-act="npc"]', '[data-act="imp"]'].forEach(s => E.click(s));
  const { S, RUN } = E.st(); assert.strictEqual(S.blocks.length, n); assert.strictEqual(S.ed, "ship"); assert.strictEqual(S.mode, "edit"); assert.strictEqual(RUN.phase, "shop");
  assert(E.q(".sr-npc").hidden && E.q(".sr-exio").hidden);
});
test("ohne Cockpit startet die nächste Stage nicht", () => {
  const E = boot(), T = E.T; T.runStart(); clearStage(E); const { S } = E.st(), c = cockpit(T, { blocks: S.blocks });
  T.eraseAt(c.x, c.y); T.runNext(); assert.strictEqual(E.st().S.mode, "edit"); assert.strictEqual(E.st().RUN.phase, "shop"); assert.strictEqual(E.st().RUN.stage, 2);
});

console.log("Boss und Perks");
test("nach der Boss-Stage gibt es drei Perks zur Wahl; die Wahl wirkt und die Werft öffnet sich", () => {
  const E = boot(), T = E.T; T.runStart(); clearStage(E); E.st().RUN.stage = 4; T.runNext();
  assert.strictEqual(enemies(E.st().FL)[0].npc.id, T.RUNCFG.bossId);
  clearStage(E);
  let R = E.st().RUN; assert.strictEqual(R.phase, "perk"); assert.strictEqual(R.offer.length, 3); assert.strictEqual(new Set(R.offer).size, 3);
  assert(!E.q(".sr-perk").hidden); assert.strictEqual(E.root.querySelectorAll("[data-perk]").length, 3);
  const id = R.offer[0], p = T.PERKS.filter(q => q.id === id)[0], was = T.PM[p.k];
  E.click('[data-perk="' + id + '"]'); R = E.st().RUN;
  assert.strictEqual(R.phase, "shop"); assert.strictEqual(JSON.stringify(R.perks), JSON.stringify([id])); assert(E.q(".sr-perk").hidden);
  if (p.v === true) assert.strictEqual(T.PM[p.k], true); else assert(Math.abs(T.PM[p.k] - was - p.v) < 1e-9);
  assert.strictEqual(R.stage, 5);
});
test("Perk „Verstärkte Struktur“: neue und heile Blöcke starten mit vollen (erhöhten) HP", () => {
  const E = boot(), T = E.T; T.runStart(); clearStage(E); const R = E.st().RUN; R.phase = "perk"; R.offer = ["hp"]; T.runPerk("hp"); T.runNext();
  E.st().FL.me.blocks.forEach(b => assert(Math.abs(b.hp - T.T[b.t].hp * 1.1) < 1e-6, b.t + " hat " + b.hp));
});

console.log("Tod und Ende");
test("Cockpit zerstört: nach kurzer Verzögerung Game Over, das Spiel hält an", () => {
  const E = boot(), T = E.T; T.runStart(); const me = E.st().FL.me; T.damage(me, cockpit(T, me), 1e6, 0, 0, true);
  E.fly(1); assert.strictEqual(E.st().RUN.phase, "fight"); E.fly(3);
  const { FL, RUN } = E.st(); assert.strictEqual(RUN.phase, "over"); assert.strictEqual(FL.paused, true); assert(!E.q(".sr-over").hidden);
  assert.strictEqual(E.q("#sr-ov-st").textContent, "1");
});
test("Anzugluft aufgebraucht: Game Over statt Neustart im Cockpit", () => {
  const E = boot(), T = E.T; T.runStart(); const FL = E.st().FL; FL.seated = false; FL.out = true; FL.eva = { x: 500, y: 500, vx: 0, vy: 0, face: 0, ph: 0, thr: false }; FL.suit = 0.5;
  E.fly(5); assert.strictEqual(E.st().RUN.phase, "over");
});
test("Schiff speichern: der Entwurf der letzten Stage landet im Schiffs-Editor, Rückgängig holt den alten zurück, Perks sind zurückgesetzt", () => {
  const E = boot(), T = E.T, old = JSON.stringify(E.st().S.ship.map(T.strip)); T.runStart();
  const design = JSON.stringify(E.st().RUN.design); T.PM.hp = 0.3; T.runOver("quit"); E.click('[data-act="run-save"]');
  let { S, RUN, FL } = E.st(); assert.strictEqual(RUN, null); assert.strictEqual(FL, null); assert.strictEqual(S.mode, "edit"); assert.strictEqual(T.PM.hp, 0);
  assert.strictEqual(JSON.stringify(S.blocks.map(T.strip)), design); assert(!E.q(".sr-root").classList.contains("run")); assert(E.q(".sr-over").hidden);
  assert.strictEqual(JSON.stringify(JSON.parse(E.w.localStorage.getItem("spacerogue-ship-v1")).blocks), design);
  T.undo(); assert.strictEqual(JSON.stringify(E.st().S.blocks.map(T.strip)), old);
});
test("Zurück zum Editor: Run weg, alter Entwurf da, Testflug funktioniert wie vorher; Neuer Run beginnt wieder bei Stage 1", () => {
  const E = boot(), T = E.T, old = JSON.stringify(E.st().S.ship.map(T.strip)); T.runStart(); clearStage(E); T.runOver("quit"); E.click('[data-act="run-new"]');
  let s = E.st(); assert.strictEqual(s.RUN.stage, 1); assert.strictEqual(s.RUN.credits, T.RUNCFG.startCredits); assert.strictEqual(s.S.mode, "fly");
  T.runOver("quit"); E.click('[data-act="run-exit"]'); s = E.st();
  assert.strictEqual(s.RUN, null); assert.strictEqual(JSON.stringify(s.S.blocks.map(T.strip)), old);
  E.click('[data-act="test"]'); s = E.st(); assert.strictEqual(s.S.mode, "fly"); assert.strictEqual(s.FL.bodies.filter(b => b.target).length, 3, "Übungsziele im freien Testflug");
  E.key("Escape"); assert.strictEqual(E.st().S.mode, "edit");
});
test("Bestwert wird gespeichert", () => {
  const E = boot(), T = E.T; T.runStart(); clearStage(E); T.runNext(); T.runOver("quit");
  assert.strictEqual(E.w.localStorage.getItem("spacerogue-run-best"), "2"); assert.strictEqual(E.q("#sr-ov-best").textContent, "2");
});
test("ein ganzer Run über 5 Stages läuft ohne Fehlermeldung durch", () => {
  const E = boot(), T = E.T; T.runStart();
  for (let i = 0; i < 5; i++) { E.fly(3, FL => { FL.keys.w = true; FL.fire = true; }); clearStage(E); const R = E.st().RUN; if (R.phase === "perk") T.runPerk(R.offer[0]); T.runRepair(); T.runNext(); assert.strictEqual(E.st().S.mode, "fly", "Stage " + (i + 2) + " startet nicht"); }
  assert.strictEqual(E.st().RUN.stage, 6); assert.strictEqual(E.errs.length, 0, E.errs.join("; "));
});

console.log("\n" + ok + " bestanden, " + fail + " fehlgeschlagen");
process.exit(fail ? 1 : 0);
