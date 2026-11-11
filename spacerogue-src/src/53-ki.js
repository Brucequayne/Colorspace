  // ===== 53-ki.js · Gegner-KI: Erkennung, Kampfstile, Moral, Manöver, Ausweichen, Abschüsse =====
  // ---------- Gegner (Kampf-KI) ----------
  function angTo(vx, vy) { return Math.atan2(vx, -vy); }   // Schiffswinkel, dessen Vorderseite (−y) in Richtung (vx, vy) zeigt
  function angDiff(a, b) { return Math.atan2(Math.sin(a - b), Math.cos(a - b)); }
  function minView() { var ppm = PX * ZMIN_FL / CELL_M; return { hw: V.W / 2 / ppm, hh: V.H / 2 / ppm }; }
  function spawnEnemy(id) {
    var sh = NPC.filter(function (q) { return q.id === id; })[0]; if (!sh || !FL) return;
    var bl = npcBlocks(sh), bd = makeBody(bl, false), me = FL.me, mv = minView();
    var dist = Math.max(320, Math.min(700, Math.max(mv.hw, mv.hh) * 1.25)), dir = me.a + (Math.random() - 0.5) * 1.4;
    bd.x = me.x + Math.sin(dir) * dist; bd.y = me.y - Math.cos(dir) * dist; bd.a = Math.random() * Math.PI * 2;
    bd.enemy = true; bd.npc = sh; bd.offT = 0; bd.seen = false;
    var sty = AISTY[Math.floor(Math.random() * AISTY.length)];
    bd.ai = { state: "patrol", home: { x: bd.x, y: bd.y }, r: 70 + Math.random() * 50, ang: Math.random() * 6.28, dir: Math.random() < 0.5 ? 1 : -1, strafe: 1, st: 3, alert: 0,
      sty: sty, mor: Math.min(1, sty.mor + (Math.random() - 0.5) * 0.2), n0: bd.blocks.length, fleeRoll: false };
    if (bd.shGen) bd.shE = Math.min(bd.cap * 0.5, bd.energy), bd.energy -= bd.shE;   // Gegner mit Generator reservieren die Hälfte fürs Schild
    FL.bodies.push(bd);
    if (RUN) { bd.ai.state = "combat"; bd.ai.alert = 1.6; }
    else note(fmt(t("spawned"), { n: sh.n[lang] }) + " · " + sty.n[lang]);
  }
  // Moral (0–1): sinkt mit jedem Treffer und mit verlorenen Blöcken, erholt sich langsam. Niedrige Moral hält mehr Abstand und flieht eher
  function aiMorale(bd, dt) {
    var A = bd.ai, loss = 1 - bd.blocks.length / A.n0, cap = Math.max(0.05, A.sty.mor * (1 - loss * 1.2));
    A.mor = Math.min(cap, A.mor + dt * 0.01);
    if (A.hitN) { A.mor = Math.max(0, A.mor - A.hitN * 0.006); A.hitN = 0; }
    A.mor = Math.min(A.mor, cap);
  }
  function aiFleeCheck(bd) {
    var A = bd.ai, ck = bd.seat; if (!ck || A.fleeRoll || A.state === "flee") return;
    if (ck.hp / hpMax(bd, ck) < 0.3) {   // Cockpit kurz vor der Zerstörung: im Schnitt 25 % Fluchtversuche, bei schlechter Moral öfter
      A.fleeRoll = true;
      var pf = Math.max(0.1, Math.min(0.45, 0.25 + (0.5 - A.mor) * 0.3));
      if (Math.random() < pf) { A.state = "flee"; FL.bannerN = bd.npc.n[lang]; showBanner(t("fleeT"), "flee"); }
    }
  }
  // Manöver im Kampf: Verfolgen (seitlich versetzt), Vorbeiflug (Angriff von der anderen Seite), Angriff (Abstand halten, kreisen) und Ausbrechen.
  // Nur beim Angriff zielt die Nase dauerhaft auf dich; bei Vorbeiflug und Ausbrechen fliegt sie in Bewegungsrichtung.
  function pickMan(A) {
    var w = A.sty.man, x = Math.random(), k;
    for (k in w) { x -= w[k]; if (x <= 0) break; }
    if (k === A.man && Math.random() < 0.6) return pickMan(A);   // selten zweimal dasselbe
    A.man = k; A.side = Math.random() < 0.5 ? -1 : 1; A.passed = false; A.passU = null;
    A.manT = MANT[k][0] + Math.random() * (MANT[k][1] - MANT[k][0]);
  }
  // Kollisionsvermeidung, jeden Frame mit deinem echten Tempo (nicht der verzögerten Schätzung):
  // Annäherung nur so schnell, dass die KI vor dir noch bremsen kann; ab etwa 45 m Abstand zur Hülle kein weiteres Aufschließen mehr
  // und ein kräftiger Schwenk zur Seite.
  function aiAvoid(bd, A, vDes, me) {
    var dx = me.x - bd.x, dy = me.y - bd.y, dist = Math.hypot(dx, dy) || 1, ux = dx / dist, uy = dy / dist;
    var ds = Math.max(0, dist - 0.5 * (me.rad + bd.rad)); if (ds > AVOID + 120) return vDes;
    var v = { x: vDes.x, y: vDes.y }, rel = (v.x - me.vx) * ux + (v.y - me.vy) * uy;   // gewünschte Annäherung relativ zu dir
    var aB = Math.max(2, bd.thrSum / 4 / bd.mass * 0.5);   // vorsichtig angesetzte Bremsverzögerung
    var maxC = ds > AVOID ? Math.sqrt(2 * aB * (ds - AVOID)) : (ds - AVOID) * 0.5;
    if (rel > maxC) { v.x -= ux * (rel - maxC); v.y -= uy * (rel - maxC); }
    if (ds < AVOID) { var sd = A.side || 1, k = 1 - ds / AVOID; v.x += -uy * sd * 35 * k; v.y += ux * sd * 35 * k; }
    // Vorausschau: Bleibt der aktuelle Kurs so, wie nah kommen wir uns in den nächsten 3 s? Zu nah: kräftig seitlich und abbremsen
    var rx = bd.x - me.x, ry = bd.y - me.y, wx = bd.vx - me.vx, wy = bd.vy - me.vy, w2 = wx * wx + wy * wy;
    if (w2 > 1) {
      var tca = -(rx * wx + ry * wy) / w2;
      if (tca > 0 && tca < 3) {
        var mx = rx + wx * tca, my = ry + wy * tca, miss = Math.hypot(mx, my), safe = 0.5 * (me.rad + bd.rad) + 20;
        if (miss < safe) {
          var ml = miss || 1, ex = miss > 0.5 ? mx / ml : -uy * (A.side || 1), ey = miss > 0.5 ? my / ml : ux * (A.side || 1), urg = (1 - miss / safe) * (1 - tca / 3);
          v.x += ex * 45 * urg - wx * 0.6 * urg; v.y += ey * 45 * urg - wy * 0.6 * urg;
        }
      }
    }
    return v;
  }
  function aiTick(bd, dt) {
    var A = bd.ai, me = FL.me; if (bd.dead) return;
    var alive = FL.bodies.indexOf(me) >= 0 && me.blocks.length;
    var dx = me.x - bd.x, dy = me.y - bd.y, dist = Math.hypot(dx, dy) || 1, ds = Math.max(0, dist - 0.5 * (me.rad + bd.rad));
    var fw = dirWorld(bd, 0), cosA = (fw.x * dx + fw.y * dy) / dist, al = Math.acos(Math.max(-1, Math.min(1, cosA)));
    var range = (AI.glide + AI.loud * FL.sig) * (al < 0.14 ? 2 : al < 0.35 ? 2 - (al - 0.14) / 0.21 : 1);
    A.range = range; A.alert = Math.max(0, A.alert - dt);
    if (A.state === "patrol" && alive && (ds < range || A.hurt)) { A.state = "combat"; A.alert = 1.6; }
    if (A.state === "combat" && (!alive || dist > AI.lose)) { A.state = "patrol"; A.home = { x: bd.x, y: bd.y }; }
    A.hurt = false;
    aiMorale(bd, dt); aiFleeCheck(bd);
    // Wahrnehmung mit Verzögerung: Die KI sieht deine Position, schätzt dein Tempo aber nur geglättet (~0,8 s),
    // und plant ihre Wunschbewegung nur alle 0,35–0,6 s neu. So reagiert sie träger auf deine Manöver.
    var pk = 1 - Math.exp(-dt / 0.8);
    if (A.pvx === undefined) { A.pvx = me.vx; A.pvy = me.vy; }
    A.pvx += (me.vx - A.pvx) * pk; A.pvy += (me.vy - A.pvy) * pk;
    var PV = { x: A.pvx, y: A.pvy };
    A.plan = (A.plan || 0) - dt; var replan = A.plan <= 0; if (replan) A.plan = 0.35 + Math.random() * 0.25;
    var vDes, head, fire = false, aim = null, Y = A.sty;
    if (A.state === "flee") {
      // Flucht: Nase weg vom Spieler, volle Fahrt, kein Feuer
      var fx = -dx / dist, fy = -dy / dist; head = angTo(fx, fy);
      A.fleeT = (A.fleeT || 0) + dt;
      vDes = { x: bd.vx + fx * 60, y: bd.vy + fy * 60 };
      var vcap = (A.fleeT < 5 ? VHI - 1 : VMAX) * AI.vk, vm = Math.hypot(vDes.x, vDes.y);   // erst bis 120 m/s, frühestens nach 5 s Hochgeschwindigkeit
      if (vm > vcap) { vDes.x *= vcap / vm; vDes.y *= vcap / vm; }
    } else if (A.state === "combat") {
      var R = bd.blocks.some(function (b) { return T[b.t].kind === "mg"; }) ? 75 : bd.blocks.some(function (b) { return T[b.t].kind === "ms"; }) ? 130 : 170;
      R *= Y.rk * (1 + Math.max(0, 0.6 - A.mor) * 1.2);   // Stil und Moral bestimmen den Wunschabstand
      var tl = dist / MG.speed; aim = { x: me.x + (PV.x - bd.vx) * tl, y: me.y + (PV.y - bd.vy) * tl };
      var aimHead = angTo(aim.x - bd.x, aim.y - bd.y);
      if (!A.man) pickMan(A); A.manT -= dt; if (A.manT <= 0) pickMan(A);
      var ux = dx / dist, uy = dy / dist, qx = -uy * A.side, qy = ux * A.side, gap = Math.max(22, (me.rad + bd.rad) * 0.7), m = A.man;
      head = aimHead;
      if (m === "chase") {
        // Verfolgen: Zielpunkt hinter dir, aber seitlich versetzt, damit ein Bremsmanöver nicht zum Rammen führt
        var tx = me.x - ux * R * 0.6 + qx * gap, ty = me.y - uy * R * 0.6 + qy * gap, ex = tx - bd.x, ey = ty - bd.y, el = Math.hypot(ex, ey) || 1, sp = Math.min(Y.push, el * 0.5);
        vDes = { x: PV.x + ex / el * sp, y: PV.y + ey / el * sp };
      } else if (m === "pass") {
        // Vorbeiflug: schräg an dir vorbei auf die andere Seite, dort umdrehen und angreifen
        if (!A.passU) A.passU = { x: ux, y: uy };
        var beyond = (A.passU.x * ux + A.passU.y * uy) < 0;
        if (beyond && !A.passed) { A.passed = true; A.manT = Math.min(A.manT, 1.2); }
        var px2 = me.x + A.passU.x * (R * 0.9 + 40) + qx * gap * 1.3, py2 = me.y + A.passU.y * (R * 0.9 + 40) + qy * gap * 1.3;
        var ex2 = px2 - bd.x, ey2 = py2 - bd.y, el2 = Math.hypot(ex2, ey2) || 1, sp2 = Y.push + 15;
        vDes = { x: PV.x + ex2 / el2 * sp2, y: PV.y + ey2 / el2 * sp2 };
        if (dist < R * 1.3 || A.passed) head = angTo(vDes.x - PV.x, vDes.y - PV.y);   // im Vorbeiflug zeigt die Nase in Flugrichtung
        if (A.passed && A.manT < 0.2) { A.man = "attack"; A.manT = 3 + Math.random() * 2; }
      } else if (m === "brk") {
        // Ausbrechen: schräg weg, Abstand gewinnen, Nase in Flugrichtung
        var ang = A.side * (0.9 + Math.random() * 0.01), bx = -ux * Math.cos(ang) + uy * Math.sin(ang), by = -uy * Math.cos(ang) - ux * Math.sin(ang);
        vDes = { x: PV.x + bx * Y.push, y: PV.y + by * Y.push };
        head = angTo(bx, by);
      } else {
        // Angriff: Wunschabstand halten, seitlich ausweichen oder kreisen
        A.st -= dt; if (A.st <= 0) { A.st = 2.5 + Math.random() * 3; A.strafe = Math.random() < 0.5 ? -1 : 1; if (Y.orbit && Math.random() < 0.25) A.dir = -A.dir; }
        var cl = Math.max(-25, Math.min(Y.push, (dist - R) * 0.6)), side = Y.orbit ? Y.orbit * A.dir : Y.strafe * A.strafe;
        vDes = { x: PV.x + ux * cl - uy * side, y: PV.y + uy * cl + ux * side };
      }
      // Feuern nur, wenn die Nase zufällig oder gewollt passt
      // Feuern, sobald die Geschütze wirklich auf dich zeigen: Toleranz nach deiner Größe in der Entfernung, unabhängig vom Manöver und vom Wunschabstand
      var tol = Math.max(0.05, Math.atan2(me.rad * 0.55, dist)) + (bd.tcomp ? TURRET.max : 0);
      fire = Math.abs(angDiff(aimHead, bd.a)) < tol;
    } else {
      A.ang += A.dir * dt * AI.patrolV / A.r;
      var px = A.home.x + Math.cos(A.ang) * A.r, py = A.home.y + Math.sin(A.ang) * A.r, tx = -Math.sin(A.ang) * A.dir, ty = Math.cos(A.ang) * A.dir;
      vDes = { x: tx * AI.patrolV + (px - bd.x) * 0.3, y: ty * AI.patrolV + (py - bd.y) * 0.3 };
      head = angTo(vDes.x, vDes.y);
    }
    if (replan || !A.vDes || A.state === "flee") A.vDes = vDes; else vDes = A.vDes;
    if (A.state === "combat") vDes = aiAvoid(bd, A, vDes, me);
    aiDrive(bd, dt, vDes, head);
    if (A.state === "flee" && A.fleeT < 5) { var fv = Math.hypot(bd.vx, bd.vy), pv0 = A.pv || 0, vh = VHI * AI.vk; if (fv > vh && fv > pv0) { var lm = Math.max(pv0, vh); bd.vx *= lm / fv; bd.vy *= lm / fv; fv = lm; } A.pv = fv; }
    else A.pv = Math.hypot(bd.vx, bd.vy);
    turretTick(bd, dt, aim);
    // jede Waffe in ihrer eigenen Reichweite: Minigun bis ~85 % ihrer Flugweite, Raketen bis 300 m, Railgun bis 90 % ihrer Reichweite
    // Feuerstöße: kurz vor dem Überhitzen absetzen und erst nach dem Abkühlen weiterschießen, damit die Miniguns nicht sperren
    var hmax = 0; bd.blocks.forEach(function (b) { if (T[b.t].kind === "mg") hmax = Math.max(hmax, b.oh > 0 ? 1 : b.heat || 0); });
    if (hmax > MG.warn) A.mgRest = true; else if (hmax < 0.35) A.mgRest = false;
    if (fire) { if (dist < MG.speed * MG.life * 0.85 && !A.mgRest) weapons(bd, dt, "mg", true, aim); if (dist < 300) weapons(bd, dt, "ms", true, aim); if (dist < RG.range * 0.9) weapons(bd, dt, "rg", true, aim); }
  }
  function aiDrive(bd, dt, vDes, head) {
    if (bd.torque > 0 && bd.energy > 0) {
      var wT = Math.max(-1.5, Math.min(1.5, angDiff(head, bd.a) * 1.5)), al = bd.torque / bd.I, dw = wT - bd.w, step = Math.sign(dw) * Math.min(Math.abs(dw), al * dt);
      bd.w += step; if (Math.abs(step) > 1e-4) bd.energy = Math.max(0, bd.energy - 3 * dt * Math.min(1, Math.abs(dw)));
    }
    var ca = Math.cos(bd.a), sa = Math.sin(bd.a), dvx = vDes.x - bd.vx, dvy = vDes.y - bd.vy, lx = dvx * ca + dvy * sa, ly = -dvx * sa + dvy * ca, acc = { x: 0, y: 0 }, use = 0;
    // Triebwerke laufen wie beim Spieler an: 50 % nach 0,2 s, voller Schub nach 1 s
    var sp = bd.spool || (bd.spool = [0, 0, 0, 0]), cmd = [0, 0, 0, 0];
    function spK(x) { return x < 0.2 ? x * 2.5 : 0.5 + 0.5 * Math.min(1, (x - 0.2) / 0.8); }
    [[lx, 1, 3, "x"], [ly, 2, 0, "y"]].forEach(function (q) {
      var v = q[0]; if (Math.abs(v) < 0.08) return;
      var d = v > 0 ? q[1] : q[2], th = bd.thr[d]; if (!th) return;
      cmd[d] = 1;
      var amax = th / bd.mass, a = Math.min(Math.abs(v) * 1.2, amax) * spK(sp[d]), eff = a / amax;
      acc[q[3]] += (v > 0 ? 1 : -1) * a; use += eff * useOf(bd, d) * dt; bd.flames[d] = Math.max(bd.flames[d] || 0, eff);
    });
    for (var di = 0; di < 4; di++) sp[di] = cmd[di] ? Math.min(1, sp[di] + dt) : Math.max(0, sp[di] - dt * 2.5);
    var sc = use > bd.energy ? (bd.energy > 0 ? bd.energy / use : 0) : 1;
    bd.energy = Math.max(0, bd.energy - use * sc); for (var fk in bd.flames) bd.flames[fk] *= sc;
    var axw = acc.x * sc, ayw = acc.y * sc;
    bd.vx += (axw * ca - ayw * sa) * dt; bd.vy += (axw * sa + ayw * ca) * dt;
  }
  // Kampfunfähig: Cockpit weg, oder keine Energie mehr und kein Reaktor, oder ohne Gyroskop oder ohne Triebwerke
  function enemyBook(dt) {
    var mv = minView();
    FL.bodies.slice().forEach(function (bd) {
      if (!bd.enemy) return;
      // Zerstört: Cockpit weg, nicht mehr manövrierfähig (kein Gyroskop oder keine Triebwerke) oder keine Energie mehr
      if (!bd.dead && (!bd.cock || (bd.energy <= 0.5 && !bd.prod) || !bd.torque || !bd.thrSum)) {
        bd.dead = true; bd.ai = null; bd.flames = {}; FL.bannerN = bd.npc.n[lang]; showBanner(t("destroyed"), "dead");
        scoreKill(bd);
      }
      // Kampfunfähig: keine funktionierenden Waffen mehr; das Schiff versucht weiter zu fliehen
      else if (!bd.dead && !bd.disarmed && !bd.blocks.some(function (b) { var k = T[b.t].kind; return k === "mg" || k === "rg" || k === "ms"; })) {
        bd.disarmed = true; if (bd.ai) { bd.ai.state = "flee"; bd.ai.fleeT = 0; } FL.bannerN = bd.npc.n[lang]; showBanner(t("ko"), "ko");
        scoreKill(bd);
      }
      var inView = Math.abs(bd.x - FL.cam.x) < mv.hw + bd.rad && Math.abs(bd.y - FL.cam.y) < mv.hh + bd.rad;
      if (inView) { bd.seen = true; bd.offT = 0; } else if (bd.seen) bd.offT += dt;
      var far = Math.hypot(bd.x - FL.cam.x, bd.y - FL.cam.y) > 3000;
      if (bd.offT > 30 || far) FL.bodies.splice(FL.bodies.indexOf(bd), 1);
    });
  }
  // Abschuss: zählt einmal pro Schiff, egal ob erst kampfunfähig und später zerstört
  function scoreKill(bd) {
    if (bd.killed) return; bd.killed = true; FL.kills = (FL.kills || 0) + 1;
    if (RUN) runKill(bd);
    var k = V.root.querySelector(".sr-kc b"); if (k) { k.textContent = FL.kills; var el = k.parentNode; el.classList.remove("pop"); void el.offsetWidth; el.classList.add("pop"); }
  }
  function showBanner(label, kind) {
    var el = V.root.querySelector(".sr-kill"); if (!el) return;
    el.querySelector("small").textContent = label || t("ko"); el.classList.toggle("flee", kind === "flee"); el.classList.toggle("dead", kind === "dead");
    el.querySelector("span").textContent = FL.bannerN; el.hidden = false; el.classList.remove("go"); void el.offsetWidth; el.classList.add("go");
    clearTimeout(V.killT); V.killT = setTimeout(function () { if (V) el.hidden = true; }, 3200);
  }
