  // ===== 51-steuerung-waffen.js · Steuerung und Waffen: Schub, Drehen, Minigun/Raketen/Railgun, Geschütze, Zielcomputer =====
  function dirAngle(b) { var d = dirOut(b, 2); return Math.atan2(DV[d][1], DV[d][0]); }
  function control(bd, dt, input) {
    var k = FL.keys, ca = Math.cos(bd.a), sa = Math.sin(bd.a);
    var vl = { x: bd.vx * ca + bd.vy * sa, y: -bd.vx * sa + bd.vy * ca };    // Tempo im Schiffsrahmen (−y = vorne)
    var inX = input ? (k.d ? 1 : 0) - (k.a ? 1 : 0) : 0, inY = input ? (k.s ? 1 : 0) - (k.w ? 1 : 0) : 0;
    var acc = { x: 0, y: 0 }, use = 0, thr = bd.thr, m = bd.mass;
    // Triebwerke sind träge: nach 0,2 s halbe, nach 1 s volle Leistung; Overcharge +50 % Schub und Verbrauch
    var sp = bd.spool || (bd.spool = [0, 0, 0, 0]), cmd = [0, 0, 0, 0], oc = FL.oc ? 1.5 : 1;
    function spoolK(x) { return x < 0.2 ? x * 2.5 : 0.5 + 0.5 * Math.min(1, (x - 0.2) / 0.8); }
    function axis(inp, v, posD, negD, comp) {   // posD: Richtung mit Schub in +Achse
      var want = 0, d = -1;
      if (inp > 0) { d = posD; want = 1; }
      else if (inp < 0) { d = negD; want = 1; }
      else if (FL.damp && Math.abs(v) > 0.02 && !(FL.cruise && comp === "y")) {   // Dämpfer: gegensteuern bis Stillstand; im Cruise-Modus nur noch seitlich
        d = v > 0 ? negD : posD; var need = Math.abs(v) * m / dt; want = thr[d] ? Math.min(1, need / (thr[d] * oc * (bd.player ? 1 + PM.brake + (d === 1 || d === 3 ? PM.side : 0) : 1))) : 0;
      }
      if (d < 0 || !thr[d] || !want) return;
      cmd[d] = want;
      var sign = (d === posD) ? 1 : -1, pk = 1;
      if (bd.player) { if (d === 1 || d === 3) pk += PM.side; if (sign * v < 0) pk += PM.brake; }   // Perks: Seitenschub, Bremsschub
      var eff = want * spoolK(sp[d]), F = thr[d] * oc * eff * pk, a = F / m;
      if (inp === 0) a = Math.min(a, Math.abs(v) / dt);
      acc[comp] += sign * a; use += eff * oc * useOf(bd, d) * dt; bd.flames[d] = Math.max(bd.flames[d] || 0, eff);
    }
    axis(inX, vl.x, 1, 3, "x"); axis(inY, vl.y, 2, 0, "y");
    for (var di = 0; di < 4; di++) sp[di] = cmd[di] ? Math.min(1, sp[di] + dt) : Math.max(0, sp[di] - dt * 2.5);
    // Energie reicht nicht: Schub anteilig kürzen
    var scale = 1; if (use > bd.energy) { scale = bd.energy > 0 ? bd.energy / use : 0; }
    bd.energy = Math.max(0, bd.energy - use * scale);
    acc.x *= scale; acc.y *= scale; for (var fk in bd.flames) bd.flames[fk] *= scale;
    vl.x += acc.x * dt; vl.y += acc.y * dt;
    bd.vx = vl.x * ca - vl.y * sa; bd.vy = vl.x * sa + vl.y * ca;
    // Drehen nur mit Gyroskop; ohne Eingabe stabilisiert es die Drehung
    if (bd.torque > 0 && bd.energy > 0) {
      var target = input ? ((k.e ? 1 : 0) - (k.q ? 1 : 0)) * 2.4 : 0;
      var al = bd.torque / bd.I, dw = target - bd.w, step = Math.sign(dw) * Math.min(Math.abs(dw), al * dt);
      bd.w += step; if (Math.abs(step) > 1e-4) bd.energy = Math.max(0, bd.energy - 3 * dt * Math.min(1, Math.abs(dw)));
    }
    FL.mdx *= Math.pow(0.0005, dt);
    // Waffen
    weapons(bd, dt, input ? FL.groups[FL.wsel] : null, FL.fire, null);
  }
  // Waffen einer Gruppe abfeuern (Spieler und KI nutzen dieselben Regeln)
  function weapons(bd, dt, g, firing, aim) {
    // Mehrere Miniguns setzen versetzt ein: zu Beginn einer Salve bekommt jede einen eigenen Takt-Versatz
    if (firing && g === "mg" && !bd.mgWas) {
      var mgs = bd.blocks.filter(function (b) { return T[b.t].kind === "mg"; }), per = 1 / (MG.rate * (bd.player ? 1 + PM.mgRate : 1));
      mgs.forEach(function (b, i) { b.cool2 = Math.max(b.cool2 || 0, (i / mgs.length) * per + Math.random() * per * 0.15); });
    }
    if (g === "mg" || !firing) bd.mgWas = firing && g === "mg";
    if (firing && g === "mg") bd.blocks.forEach(function (b) {
      if (T[b.t].kind !== "mg" || b.oh > 0) return;
      b.firing = true; b.cool2 = (b.cool2 || 0) - dt;
      if (b.cool2 > 0) return;
      if (bd.energy < MG.e) return;
      b.cool2 = 1 / (MG.rate * (bd.player ? 1 + PM.mgRate : 1)); bd.energy -= MG.e;
      var d = gunDir(bd, b), f = fp(b), tip = gunTip(bd, b);
      FL.shots.push({ x: tip.x, y: tip.y, vx: bd.vx + d.x * MG.speed + (Math.random() - 0.5) * 6, vy: bd.vy + d.y * MG.speed + (Math.random() - 0.5) * 6, life: 0, own: bd });
      FL.parts.push({ x: tip.x, y: tip.y, vx: bd.vx, vy: bd.vy, life: 0, max: 0.06, k: "flash", sz: 1.4 });
      var cn2 = (bd.cool && bd.cool.get(b)) || 0;
      b.heat = (b.heat || 0) + MG.heat / (1 + 0.35 * cn2) * (bd === FL.me && FL.oc ? 0.75 : 1);   // Overcharge: 25 % langsamer heiß
      if (b.heat >= 1) { b.heat = 1; b.oh = b.ohMax = MG.lock / (1 + 0.3 * cn2); for (var i = 0; i < 10; i++) FL.parts.push({ x: tip.x, y: tip.y, vx: bd.vx + (Math.random() - 0.5) * 6, vy: bd.vy + (Math.random() - 0.5) * 6, life: 0, max: 1 + Math.random(), k: "smoke", sz: 1 + Math.random() }); }
    });
    // Raketen: je Werfer 2 Schuss (Schwere Rakete: 1 Schuss mit vierfachem Schaden), abgefeuert wird nacheinander aus irgendeinem Werfer mit Munition.
    // Erst wenn alle leer sind, laden alle gemeinsam nach: 2,5 s je Werfer.
    bd.msCd = Math.max(0, (bd.msCd || 0) - dt);
    if (firing && g === "ms" && !(bd.msRl > 0) && bd.msCd <= 0 && bd.energy >= MS.e) {
      var ls = bd.blocks.filter(function (b) { return T[b.t].kind === "ms" && b.ammo > 0; });
      if (ls.length) {
        var lb = ls[(bd.msTurn = ((bd.msTurn || 0) + 1)) % ls.length];
        var lty = T[lb.t], ec = MS.e * (lty.ek || 1);
        if (bd.energy >= ec) {                            // Schwere Rakete braucht mehr Energie je Schuss
        lb.ammo--; bd.energy -= ec; bd.msCd = MS.gap;
        var d = dirWorld(bd, dirOut(lb, 0)), tip = muzzle(bd, lb), side = lty.rk === 1 ? 0 : lb.ammo === 1 ? 0.22 : -0.22, nx = -d.y * side * CELL_M, ny = d.x * side * CELL_M;
        FL.missiles.push({ x: tip.x + nx, y: tip.y + ny, vx: bd.vx + d.x * MS.v0, vy: bd.vy + d.y * MS.v0, h: Math.atan2(d.y, d.x), life: 0, own: bd, aim: aim || null, k: lty.mk || 1 });
        var left = bd.blocks.reduce(function (a, b) { return a + (T[b.t].kind === "ms" ? b.ammo : 0); }, 0);
        if (!left) bd.msRl = bd.msRlMax = MS.reload * bd.blocks.filter(function (b) { return T[b.t].kind === "ms"; }).length / (bd.player ? 1 + PM.msRl : 1);
        }
      }
    }
    if (firing && g === "rg") bd.blocks.forEach(function (b) {
      if (T[b.t].kind !== "rg" || b.cd > 0) return;
      b.holding = true;
      if (bd.energy < RG.e && !b.chg) return;
      b.chg = (b.chg || 0) + dt;
      if (b.chg >= RG.charge) { b.chg = 0; b.cd = RG.cd; bd.energy = Math.max(0, bd.energy - RG.e); fireRail(bd, b); }
    });
    }
  function useOf(bd, d) { var u = 0; bd.blocks.forEach(function (b) { var ty = T[b.t]; if (ty.kind === "thr" && thrustDir(b) === d) u += ty.use; }); return u; }
  // Zielcomputer: Minigun und Railgun schwenken bis 15° zur Zielrichtung (Maus beim Spieler, Vorhaltepunkt bei der KI)
  function gunMount(bd, b) { var d = dirOut(b, 0), f = fp(b), h = T[b.t].h; return { lx: b.x + f[0] / 2 - DV[d][0] * h / 2, ly: b.y + f[1] / 2 - DV[d][1] * h / 2 }; }
  function turretTick(bd, dt, aim) {
    bd.blocks.forEach(function (b) {
      var k = T[b.t].kind; if (k !== "mg" && k !== "rg") return;
      var want = 0;
      if (bd.tcomp && aim) {
        var m = gunMount(bd, b), mw = toWorld(bd, m.lx, m.ly), d = dirWorld(bd, dirOut(b, 0));
        want = Math.max(-TURRET.max, Math.min(TURRET.max, angDiff(Math.atan2(aim.y - mw.y, aim.x - mw.x), Math.atan2(d.y, d.x))));
      }
      var cur = b.tw || 0, st = TURRET.rate * dt; b.tw = cur + Math.max(-st, Math.min(st, want - cur));
    });
  }
  function gunDir(bd, b) { var d = dirWorld(bd, dirOut(b, 0)), a = b.tw || 0; if (!a) return d; var ca = Math.cos(a), sa = Math.sin(a); return { x: d.x * ca - d.y * sa, y: d.x * sa + d.y * ca }; }
  function gunTip(bd, b) {
    if (!b.tw) return muzzle(bd, b);
    var m = gunMount(bd, b), mw = toWorld(bd, m.lx, m.ly), d = gunDir(bd, b), L = (T[b.t].h + 0.1) * CELL_M;
    return { x: mw.x + d.x * L, y: mw.y + d.y * L };
  }
  function muzzle(bd, b) {
    var ty = T[b.t], d = dirOut(b, 0), f = fp(b), cx = b.x + f[0] / 2 + DV[d][0] * (ty.h / 2 + 0.1), cy = b.y + f[1] / 2 + DV[d][1] * (ty.h / 2 + 0.1);
    return toWorld(bd, cx, cy);
  }
  function fireRail(bd, b) {
    var d = gunDir(bd, b), p = gunTip(bd, b), left = RG.dmg, end = { x: p.x + d.x * RG.range, y: p.y + d.y * RG.range }, hits = 0, lastB = null;
    for (var s = 0; s < RG.range; s += 0.8) {
      var x = p.x + d.x * s, y = p.y + d.y * s, h = hitAt(x, y, bd);
      if (h && h.b !== lastB) { lastB = h.b; if (bd === FL.me) hitMark(x, y, h.bd); damage(h.bd, h.b, left, x, y); spark(x, y, 10); left *= 0.55; hits++; if (hits >= 3) { end = { x: x, y: y }; break; } }
    }
    FL.beams.push({ x0: p.x, y0: p.y, x1: end.x, y1: end.y, life: 0 });
  }
  function mouseWorld() {
    if (!V.mouse) return null; var ppm = PX * V.zoom / CELL_M;
    return { x: FL.cam.x + (V.mouse.sx - V.W / 2) / ppm, y: FL.cam.y + (V.mouse.sy - V.H / 2) / ppm };
  }
  // ---------- Zielcomputer: Zielerfassung und Vorhaltepunkt ----------
  // Erfasst wird das Gegnerschiff, das dem Mauszeiger am nächsten ist. Der kleine Kreis zeigt, wohin man zielen muss, damit
  // Minigun-Geschosse das Ziel bei gleichbleibender Bewegung treffen (Abfangpunkt aus Relativtempo und Geschossgeschwindigkeit).
  function leadPoint(me, tg) {
    var rx = tg.x - me.x, ry = tg.y - me.y, vx = tg.vx - me.vx, vy = tg.vy - me.vy, s2 = MG.speed * MG.speed;
    var a = vx * vx + vy * vy - s2, b = 2 * (rx * vx + ry * vy), c2 = rx * rx + ry * ry, tt;
    if (Math.abs(a) < 1e-6) tt = -c2 / b; else { var disc = b * b - 4 * a * c2; if (disc < 0) return null; var sq = Math.sqrt(disc), t1 = (-b - sq) / (2 * a), t2 = (-b + sq) / (2 * a); tt = Math.min(t1, t2) > 0 ? Math.min(t1, t2) : Math.max(t1, t2); }
    if (!(tt > 0) || tt > MG.life) return null;
    return { x: tg.x + vx * tt, y: tg.y + vy * tt, t: tt };
  }
  function drawLead(c, ppm, tm) {
    var me = FL.me; FL.tgt = null;
    if (!me.tcomp || !FL.seated || FL.bodies.indexOf(me) < 0) return;
    var mw = mouseWorld(); if (!mw) return;
    var best = null, bd2 = 1e18;
    FL.bodies.forEach(function (bd) { if (!bd.enemy || bd.dead) return; var d = Math.hypot(bd.x - mw.x, bd.y - mw.y); if (d < bd2) { bd2 = d; best = bd; } });
    if (!best) return; FL.tgt = best;
    // Erfassungsklammern
    var r = best.rad * 0.55, L = Math.max(r * 0.3, 6 / ppm);
    c.strokeStyle = "rgba(255,90,70,.85)"; c.lineWidth = 1.6 / ppm; c.beginPath();
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (q) { var x0 = best.x + q[0] * r, y0 = best.y + q[1] * r; c.moveTo(x0, y0 - q[1] * L); c.lineTo(x0, y0); c.lineTo(x0 - q[0] * L, y0); });
    c.stroke();
    var lp = leadPoint(me, best); if (!lp) return;
    var rr = Math.max(1.4, 6 / ppm);
    c.strokeStyle = "rgba(255,120,100,.35)"; c.lineWidth = 1 / ppm; c.setLineDash([4 / ppm, 4 / ppm]); c.beginPath(); c.moveTo(best.x, best.y); c.lineTo(lp.x, lp.y); c.stroke(); c.setLineDash([]);
    c.strokeStyle = "rgba(255,235,225,.95)"; c.lineWidth = 1.6 / ppm; c.beginPath(); c.arc(lp.x, lp.y, rr, 0, Math.PI * 2); c.stroke();
    c.fillStyle = "rgba(255,90,70,.95)"; c.beginPath(); c.arc(lp.x, lp.y, rr * 0.25, 0, Math.PI * 2); c.fill();
  }
