  // ===== 56-run.js · Rogue-like-Run: Ablauf Stage → Reparaturzeit → (Perk) → Werft → nächste Stage, Tod und Game Over =====
  // RUN ist nur während eines Runs gesetzt. Ohne Run (RUN === null) verhält sich das Spiel exakt wie der bisherige Editor mit Testflug.
  // Phasen: "fight" Kampf · "repair" freie Reparaturzeit · "perk" Perk-Wahl nach dem Boss · "shop" Werft · "over" Game Over
  var RUN = null, PM0 = JSON.parse(JSON.stringify(PM)), RUN_BEST = "spacerogue-run-best", RUNVAL = {};
  var RUNBLOCK = { starter: 1, clear: 1, imp: 1, npc: 1, "ed-ship": 1, "ed-st": 1, test: 1, edit: 1, targets: 1, "io-load": 1 };   // im Run gesperrte Knöpfe
  function pmReset() { Object.keys(PM0).forEach(function (k) { PM[k] = PM0[k]; }); }
  function runHpMax(b) { return hpMax({ player: true }, b); }
  function runHpK(b) { return b.hp === undefined ? 1 : Math.max(0, Math.min(1, b.hp / runHpMax(b))); }
  // Block für die Werft: wie strip, aber mit HP, wenn er beschädigt ist
  function runStrip(b) { var o = strip(b); if (b.hp !== undefined && b.hp < runHpMax(b) - 0.01) o.hp = Math.max(0.01, b.hp); return o; }
  function runSnap() { return JSON.stringify({ run: 1, cr: RUN.credits, b: S.blocks.map(runStrip) }); }
  function runIsBoss(n) { return n % RUNCFG.bossEvery === 0; }
  function runBudget(n) { return RUNCFG.budget0 * Math.pow(RUNCFG.growth, n - 1); }
  function runNpc(id) { return NPC.filter(function (q) { return q.id === id; })[0] || null; }
  function runValue(id) { if (RUNVAL[id] === undefined) { var sh = runNpc(id); RUNVAL[id] = sh ? stats(npcBlocks(sh)).cost : 0; } return RUNVAL[id]; }
  // Gegner einer Stage: zufällig ziehen, bis das Budget (Summe der Schiffswerte) aufgebraucht ist. Boss-Stages beginnen mit dem Boss.
  function runEnemies(n) {
    var left = runBudget(n), out = [];
    var pool = NPC.filter(function (q) { return q.id !== RUNCFG.bossId || n > RUNCFG.bossEvery * 2; }).map(function (q) { return { id: q.id, v: runValue(q.id) }; }).sort(function (a, b) { return a.v - b.v; });
    if (runIsBoss(n)) { out.push(RUNCFG.bossId); left -= runValue(RUNCFG.bossId); }
    while (out.length < RUNCFG.maxEnemies) {
      var fit = pool.filter(function (q) { return q.v <= left * RUNCFG.over; });
      if (!fit.length) break;
      var p = fit[Math.floor(Math.random() * fit.length)]; out.push(p.id); left -= p.v;
    }
    if (!out.length && pool.length) out.push(pool[0].id);
    return out;
  }

  // ---------- Start, Stage, Übergänge ----------
  function runStart() {
    if (RUN || !V || S.mode !== "edit") return;
    var sh = runNpc(RUNCFG.startShip); if (!sh) return;
    save();
    RUN = { stage: 1, reached: 0, credits: RUNCFG.startCredits, blocks: npcBlocks(sh), design: null, kills: 0, earned: 0, escaped: 0, perks: [], offer: [], phase: "shop", t: 0, deadT: 0, alive: 0, spawned: 0, edWas: S.ed };
    pmReset();
    S.ed = "ship"; S.blocks = RUN.blocks; S.undo = []; S.tool = "build";
    runNext();
  }
  function runNext() {
    if (!RUN || RUN.phase !== "shop") return;
    if (!stats(S.blocks).cock) { note(t("noCockTest")); return; }
    RUN.blocks = S.blocks; RUN.design = S.blocks.map(strip);
    RUN.phase = "fight"; RUN.deadT = 0;
    startTest();
    if (S.mode !== "fly") { RUN.phase = "shop"; return; }
    RUN.reached = RUN.stage;
    showPlace(fmt(t(runIsBoss(RUN.stage) ? "runBoss" : "runStage"), { n: RUN.stage }));
  }
  // wird von startTest anstelle der Übungsziele aufgerufen
  function runSpawn() {
    var ids = runEnemies(RUN.stage), me = FL.me, n = ids.length, a0 = me.a + (Math.random() - 0.5) * 0.8;
    ids.forEach(function (id, i) {
      spawnEnemy(id); var bd = FL.bodies[FL.bodies.length - 1]; if (!bd || !bd.enemy) return;
      var d = Math.hypot(bd.x - me.x, bd.y - me.y), dir = a0 + (i - (n - 1) / 2) * 0.55;   // als Fächer vor dem Spieler verteilen
      bd.x = me.x + Math.sin(dir) * d; bd.y = me.y - Math.cos(dir) * d; bd.ai.home = { x: bd.x, y: bd.y };
      bd.value = stats(bd.blocks).cost;
    });
    RUN.spawned = RUN.alive = n;
  }
  function runKill(bd) {
    var c = Math.round((bd.value || 0) * RUNCFG.rewardK); RUN.credits += c; RUN.earned += c; RUN.kills++;
    if (c) floatTxt("+" + cr(c), "242,193,78");
  }
  // läuft am Ende jedes Simulationsschritts (flTick)
  function runTick(dt) {
    var R = RUN, me = FL.me; if (R.phase !== "fight" && R.phase !== "repair") return;
    if (!me.seat || FL.bodies.indexOf(me) < 0) { R.deadT += dt; if (R.deadT > RUNCFG.deadDelay) runOver("cock"); return; }
    if (R.phase === "fight") {
      var alive = 0;
      FL.bodies.slice().forEach(function (bd) {
        if (!bd.enemy || bd.dead || bd.disarmed) return;
        if (bd.ai && bd.ai.state === "flee" && Math.hypot(bd.x - me.x, bd.y - me.y) > RUNCFG.escape) { FL.bodies.splice(FL.bodies.indexOf(bd), 1); R.escaped++; return; }
        alive++;
      });
      R.alive = alive;
      if (!alive) { R.phase = "repair"; R.t = RUNCFG.repairTime; showPlace(fmt(t("runClear"), { n: R.stage })); }
    } else { R.t -= dt; if (R.t <= 0) runToShop(); }
  }
  function runSkip() { if (RUN && RUN.phase === "repair" && FL) runToShop(); }
  function runToShop() {
    var R = RUN, boss = runIsBoss(R.stage);
    R.blocks = FL.me.blocks.map(runStrip);   // was übrig ist, mit Schaden; zerstörte Blöcke sind weg
    R.stage++; R.phase = boss ? "perk" : "shop";
    S.blocks = R.blocks; S.undo = [];
    closeInv(); stopTest(); fitCam();
    var pl = V.root.querySelector(".sr-place"), kb = V.root.querySelector(".sr-kill"); if (pl) pl.classList.remove("go"); if (kb) kb.hidden = true;   // Einblendungen aus dem Flug nicht in die Werft mitnehmen
    if (boss) runPerkOpen();
    syncUI();
  }

  // ---------- Perks ----------
  function runPerkOpen() {
    var pool = PERKS.filter(function (p) { return !(p.v === true && RUN.perks.indexOf(p.id) >= 0); }), pick = [];
    while (pick.length < RUNCFG.perkChoices && pool.length) pick.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    if (!pick.length) { RUN.phase = "shop"; return; }
    RUN.offer = pick.map(function (p) { return p.id; });
    var el = V.root.querySelector(".sr-perk");
    el.querySelector(".sr-perk-list").innerHTML = pick.map(function (p) { return '<button type="button" data-perk="' + p.id + '"><b>' + p.n[lang] + "</b><span>" + p.d[lang] + "</span></button>"; }).join("");
    el.hidden = false;
  }
  function runPerk(id) {
    if (!RUN || RUN.phase !== "perk" || RUN.offer.indexOf(id) < 0) return;
    var p = PERKS.filter(function (q) { return q.id === id; })[0]; if (!p) return;
    if (p.v === true) PM[p.k] = true; else PM[p.k] += p.v;
    RUN.perks.push(id); RUN.offer = []; RUN.phase = "shop";
    V.root.querySelector(".sr-perk").hidden = true; syncUI();
  }

  // ---------- Werft: Bauen kostet, Abreißen erstattet nach Zustand, Reparieren kostet einen Anteil ----------
  function runPrice(list, okB) { return T[list[0].t].cost + (list[1] && okB ? T[list[1].t].cost : 0); }
  function runRefund(b) { return Math.round(T[b.t].cost * runHpK(b)); }
  function runPoor() { RUN.poorT = performance.now(); note(t("runPoor")); }
  function runRepairOf(b) { var k = runHpK(b); return k < 1 ? Math.max(1, Math.round(T[b.t].cost * (1 - k) * RUNCFG.repairK)) : 0; }
  function runRepairCost() { return S.blocks.reduce(function (a, b) { return a + runRepairOf(b); }, 0); }
  function runRepair() {
    if (!RUN || RUN.phase !== "shop") return;
    var list = S.blocks.filter(function (b) { return runHpK(b) < 1; }).map(function (b) { return { b: b, c: runRepairOf(b) }; }).sort(function (a, q) { return a.c - q.c; });
    if (!list.length) return;
    if (RUN.credits < 1) { runPoor(); return; }
    pushUndo();
    list.forEach(function (q) {   // günstigste Schäden zuerst; reicht das Geld nicht, wird der letzte Block anteilig repariert
      if (RUN.credits < 1) return;
      if (q.c <= RUN.credits) { RUN.credits -= q.c; delete q.b.hp; }
      else { var mx = runHpMax(q.b); q.b.hp += (mx - q.b.hp) * (RUN.credits / q.c); RUN.credits = 0; }
    });
    syncUI();
  }

  // ---------- Game Over und Ende ----------
  function runOver(why) {
    if (!RUN || RUN.phase === "over") return;
    RUN.phase = "over"; if (FL) { FL.paused = true; FL.fire = false; }
    var best = 0; try { best = +localStorage.getItem(RUN_BEST) || 0; if (RUN.reached > best) { best = RUN.reached; localStorage.setItem(RUN_BEST, String(best)); } } catch (e) {}
    closeInv(); V.root.querySelector(".sr-perk").hidden = true;
    var el = V.root.querySelector(".sr-over");
    set("sr-ov-why", t(why === "air" ? "runWhyAir" : why === "quit" ? "runWhyQuit" : "runWhyCock"));
    set("sr-ov-st", String(RUN.reached)); set("sr-ov-k", String(RUN.kills)); set("sr-ov-cr", cr(RUN.earned)); set("sr-ov-best", String(Math.max(best, RUN.reached)));
    set("sr-ov-pk", RUN.perks.length ? RUN.perks.map(function (id) { var p = PERKS.filter(function (q) { return q.id === id; })[0]; return p ? p.n[lang] : id; }).join(" · ") : "–");
    el.querySelector('[data-act="run-save"]').disabled = !RUN.design;
    el.hidden = false;
  }
  // Run verwerfen und in den freien Editor zurück; dessen Entwürfe wurden während des Runs nie angefasst
  function runExit() {
    if (!RUN) return;
    var edWas = RUN.edWas; RUN = null; pmReset();
    V.root.querySelector(".sr-over").hidden = true; V.root.querySelector(".sr-perk").hidden = true;
    stopTest();
    S.ed = edWas; S.blocks = edWas === "station" ? S.station : S.ship; S.undo = [];
    fitCam(); syncUI();
  }
  // Schiff aus dem Run behalten: der Entwurf vom Beginn der letzten Stage kommt in den Schiffs-Editor (Rückgängig holt den alten zurück)
  function runSave() {
    if (!RUN || !RUN.design) return;
    var d = RUN.design; runExit();
    if (S.ed !== "ship") setEd("ship");
    pushUndo(); S.blocks = d; save(); fitCam(); syncUI(); note(t("runSaved"));
  }
  function runAct(act) {
    if (act === "run-start") runStart();
    else if (act === "run-next") runNext();
    else if (act === "run-repair") runRepair();
    else if (act === "run-skip") runSkip();
    else if (act === "run-quit") runOver("quit");
    else if (act === "run-save") runSave();
    else if (act === "run-new") { runExit(); runStart(); }
    else if (act === "run-exit") runExit();
  }

  // ---------- Anzeige ----------
  // Werft-Leiste oben (aus syncUI)
  function runSync() {
    set("sr-run-st", fmt(t("runNextSt"), { n: RUN.stage }) + (runIsBoss(RUN.stage) ? " · Boss" : ""));
    set("sr-run-cr", cr(RUN.credits));
    var rc = runRepairCost(), rb = V.root.querySelector('[data-act="run-repair"]');
    if (rb) { rb.textContent = rc ? fmt(t("runRep"), { c: cr(rc) }) : t("runRepNone"); rb.disabled = !rc; }
  }
  // Run-Anzeige im Flug (jedes Bild, aus flHud)
  function runHud() {
    set("sr-rh-st", fmt(t(runIsBoss(RUN.stage) ? "runBoss" : "runStage"), { n: RUN.stage }));
    set("sr-rh-cr", cr(RUN.credits));
    set("sr-rh-en", RUN.phase === "repair" ? fmt(t("runRepT"), { s: mmss(RUN.t) }) : fmt(t("runEnemies"), { n: RUN.alive }));
    var sk = V.root.querySelector('[data-act="run-skip"]'); if (sk && sk.hidden !== (RUN.phase !== "repair")) sk.hidden = RUN.phase !== "repair";
  }
  // Run-Bedienelemente in die Oberfläche einsetzen (aus mount, direkt nach html())
  function runMountUI(el) {
    var top = el.querySelector(".sr-top"), tb = el.querySelector('[data-act="test"]');
    tb.insertAdjacentHTML("beforebegin", '<button type="button" class="sr-go sr-ed-only sr-rungo" data-act="run-start">' + t("runStart") + " ▸</button>");
    top.insertAdjacentHTML("beforeend", '<div class="sr-runbar"><span id="sr-run-st"></span><b id="sr-run-cr"></b><button type="button" data-act="run-repair"></button><button type="button" class="sr-go" data-act="run-next">' + t("runNextBtn") + ' ▸</button><button type="button" data-act="run-quit">' + t("runQuit") + "</button></div>");
    el.querySelector(".sr-root").insertAdjacentHTML("beforeend",
      '<div class="sr-runhud"><small id="sr-rh-st"></small><b id="sr-rh-cr"></b><span id="sr-rh-en"></span><button type="button" class="sr-go" data-act="run-skip" hidden>' + t("runSkip") + '</button><button type="button" data-act="run-quit">' + t("runQuit") + "</button></div>" +
      '<div class="sr-ov sr-perk" hidden><div class="sr-ov-box"><h3>' + t("runPerkT") + '</h3><div class="sr-perk-list"></div></div></div>' +
      '<div class="sr-ov sr-over" hidden><div class="sr-ov-box"><h3>' + t("runOverT") + '</h3><p id="sr-ov-why"></p><dl><dt>' + t("runReached") + '</dt><dd id="sr-ov-st"></dd><dt>' + t("runBest") + '</dt><dd id="sr-ov-best"></dd><dt>' + t("kills") + '</dt><dd id="sr-ov-k"></dd><dt>' + t("runEarned") + '</dt><dd id="sr-ov-cr"></dd><dt>' + t("runPerks") + '</dt><dd id="sr-ov-pk"></dd></dl>' +
      '<div class="sr-ov-btn"><button type="button" data-act="run-save">' + t("runSave") + '</button><button type="button" class="sr-go" data-act="run-new">' + t("runNew") + '</button><button type="button" data-act="run-exit">' + t("runExit") + "</button></div></div></div>");
  }
  var RUNCSS = ".sr-root .sr-rungo{background:#8A5A14;border-color:#E3B83F}.sr-root .sr-rungo:hover{background:#A56C18}" +
    ".sr-runbar{display:none;align-items:center;gap:8px;flex-wrap:wrap}.sr-root.run:not(.fly) .sr-runbar{display:flex}.sr-runbar span{font-size:.82rem;color:#B9C4D4}.sr-runbar b{font-size:1rem;color:#F2C14E;font-variant-numeric:tabular-nums;margin-right:4px}" +
    ".sr-root button:disabled{opacity:.45;cursor:default}" +
    ".sr-root.run [data-act=run-start],.sr-root.run [data-act=test],.sr-root.run [data-act=edit],.sr-root.run [data-act=starter],.sr-root.run [data-act=clear],.sr-root.run [data-act=imp],.sr-root.run [data-act=npc],.sr-root.run [data-act=ed-ship],.sr-root.run [data-act=ed-st],.sr-root.run #sr-name,.sr-root.run [data-act=targets],.sr-root.run .sr-spawn{display:none!important}" +
    ".sr-runhud{display:none;position:absolute;right:12px;top:108px;z-index:3;flex-direction:column;align-items:flex-end;gap:5px;background:rgba(14,19,28,.6);border:1px solid rgba(38,49,66,.8);padding:8px 12px;min-width:170px}.sr-root.run.fly .sr-runhud{display:flex}" +
    ".sr-runhud small{font-size:.7rem;letter-spacing:.1em;text-transform:uppercase;color:#8FA0B8}.sr-runhud b{font-size:1.1rem;color:#F2C14E;font-variant-numeric:tabular-nums}.sr-runhud span{font-size:.8rem;color:#DDE3EA;font-variant-numeric:tabular-nums}.sr-runhud button{font-size:.74rem;padding:4px 8px}" +
    ".sr-ov{position:absolute;inset:0;background:rgba(6,9,14,.72);display:flex;align-items:center;justify-content:center;z-index:8;padding:16px}.sr-ov[hidden]{display:none}" +
    ".sr-ov-box{background:rgba(18,23,32,.97);border:1px solid #33405A;padding:20px 22px;width:min(640px,100%);max-height:calc(100% - 32px);overflow:auto;display:flex;flex-direction:column;gap:12px}.sr-ov-box h3{margin:0;font:600 1.35rem var(--f-display,inherit);color:#EEF2F5}.sr-ov-box p{margin:0;color:#F08A78;font-weight:600}" +
    ".sr-ov-box dl{display:grid;grid-template-columns:auto 1fr;gap:6px 16px;margin:0;font-size:.92rem}.sr-ov-box dt{color:#8FA0B8}.sr-ov-box dd{margin:0;color:#EEF2F5;font-weight:600;font-variant-numeric:tabular-nums}.sr-ov-btn{display:flex;gap:8px;flex-wrap:wrap;margin-top:4px}" +
    ".sr-perk-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px}.sr-root .sr-perk-list button{display:flex;flex-direction:column;gap:8px;align-items:flex-start;text-align:left;padding:14px;min-height:110px;background:#141B27}.sr-root .sr-perk-list button:hover{border-color:#E3B83F;background:#1C2536}.sr-perk-list b{font-size:1rem;color:#F2C14E}.sr-perk-list span{font-size:.84rem;color:#C9D1D9;font-weight:400;line-height:1.35}";
