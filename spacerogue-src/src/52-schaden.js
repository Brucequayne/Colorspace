  // ===== 52-schaden.js · Schaden: Treffer, Explosionen, Schild, Zerbrechen, Kollisionen =====
  // Flächenschaden um einen Punkt (Raketen, explodierende Triebwerke und Reaktoren)
  function blast(x, y, r, dmg, skip, ns) {
    FL.parts.push({ x: x, y: y, vx: 0, vy: 0, life: 0, max: 0.22, k: "flash", sz: r * 1.3 });
    for (var i = 0; i < 10; i++) FL.parts.push({ x: x, y: y, vx: (Math.random() - 0.5) * 14, vy: (Math.random() - 0.5) * 14, life: 0, max: 0.35 + Math.random() * 0.35, k: "fire", sz: 0.8 + Math.random() * r * 0.4 });
    var hits = [];
    FL.bodies.forEach(function (bd) {
      if (bd === skip || Math.abs(x - bd.x) > bd.rad + r || Math.abs(y - bd.y) > bd.rad + r) return;
      bd.blocks.forEach(function (b) { var p = blockCenter(bd, b), d = Math.hypot(p.x - x, p.y - y); if (d < r) hits.push({ bd: bd, b: b, dmg: dmg * (1 - d / r * 0.7) }); });
    });
    hits.forEach(function (h) { var hp2 = blockCenter(h.bd, h.b); damage(h.bd, h.b, h.dmg, hp2.x, hp2.y, ns); });
  }
  function hitAt(x, y, own, noFloor) {
    for (var i = 0; i < FL.bodies.length; i++) {
      var bd = FL.bodies[i]; if (bd === own) continue;
      if (Math.abs(x - bd.x) > bd.rad || Math.abs(y - bd.y) > bd.rad) continue;
      var l = toLocal(bd, x, y), o = bd.map.get(key(Math.floor(l.x), Math.floor(l.y)));
      if (o && !(noFloor && T[o.b.t].kind === "floor")) return { bd: bd, b: o.b };   // Pistolenkugeln fliegen über Böden hinweg
    }
    return null;
  }
  function spark(x, y, n) { for (var i = 0; i < n; i++) { var a = Math.random() * 6.28, v = 8 + Math.random() * 18; FL.parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: 0.2 + Math.random() * 0.25, k: "spark", sz: 0.4 }); } }
  // Schaden: bei 0 Leben fällt der Block weg, lose Teile treiben als eigene Trümmer davon
  // Schild: fängt Treffer ab, solange Schildenergie da ist und mindestens ein Generator arbeitet. Kosten je Schadenspunkt sinken mit mehr Generatoren.
  function shieldAbsorb(bd, b, dmg, x, y) {
    if (!(bd.shE > 0) || !bd.shGen) return dmg;
    var cost = dmg * bd.shEff, p = (x || y) ? { x: x, y: y } : blockCenter(bd, b);
    if (bd.shE >= cost) { bd.shE -= cost; shieldHit(bd, p.x, p.y); return 0; }
    var left = dmg - bd.shE / bd.shEff; bd.shE = 0; shieldHit(bd, p.x, p.y); return left;
  }
  function shieldHit(bd, x, y) {
    var l = toLocal(bd, x, y); FL.shHits.push({ bd: bd, lx: l.x, ly: l.y, x: x, y: y, t: FL.t });
    if (FL.shHits.length > 50) FL.shHits.shift();
  }
  function damage(bd, b, dmg, x, y, ns) {
    if (FL.bodies.indexOf(bd) < 0 || bd.blocks.indexOf(b) < 0) return;   // schon zerstört (Kettenreaktion)
    if (!ns) { dmg = shieldAbsorb(bd, b, dmg, x, y); if (dmg <= 0) return; }
    b.hp -= dmg;
    if (b.hp > 0) return;
    var p = blockCenter(bd, b), col = b.c || T[b.t].col;
    for (var i = 0; i < 8; i++) { var a = Math.random() * 6.28, v = 4 + Math.random() * 10; FL.parts.push({ x: p.x, y: p.y, vx: bd.vx + Math.cos(a) * v, vy: bd.vy + Math.sin(a) * v, life: 0, max: 1.5 + Math.random(), k: "debris", sz: 0.5 + Math.random() * 0.7, col: col, a: Math.random() * 6, w: (Math.random() - 0.5) * 10 }); }
    for (i = 0; i < 6; i++) FL.parts.push({ x: p.x, y: p.y, vx: bd.vx + (Math.random() - 0.5) * 8, vy: bd.vy + (Math.random() - 0.5) * 8, life: 0, max: 0.35 + Math.random() * 0.3, k: "fire", sz: 1.2 + Math.random() });
    FL.parts.push({ x: p.x, y: p.y, vx: bd.vx, vy: bd.vy, life: 0, max: 0.18, k: "flash", sz: 4 });
    bd.blocks.splice(bd.blocks.indexOf(b), 1);
    if (bd === FL.me && bd.lost) bd.lost.push(strip(b));
    if (!bd.blocks.length) FL.bodies.splice(FL.bodies.indexOf(bd), 1); else splitBody(bd);
    // Triebwerke und Reaktoren explodieren und beschädigen, was direkt drumherum liegt
    var kd = T[b.t].kind;
    if (kd === "reac") blast(p.x, p.y, 3.2 * CELL_M, 85, null, true);
    else if (kd === "thr") blast(p.x, p.y, (T[b.t].w > 1 ? 2.4 : 1.8) * CELL_M, T[b.t].w > 1 ? 60 : 40, null, true);
  }
  function splitBody(bd) {
    var comps = components(bd.blocks);
    if (comps.length <= 1) { recalc(bd); return; }
    var keep = comps.reduce(function (a, c) { return mainScore(c) > mainScore(a) ? c : a; });
    comps.forEach(function (cp) {
      if (cp === keep) return;
      if (bd === FL.me && bd.lost) cp.forEach(function (b) { bd.lost.push(strip(b)); });
      var nb = { blocks: cp, x: 0, y: 0, a: bd.a, vx: bd.vx, vy: bd.vy, w: bd.w + (Math.random() - 0.5) * 0.8, ctrl: false, energy: 0, cap: 0, flames: {} };
      var st = stats(cp), c = toWorld(bd, st.com[0], st.com[1]);
      recalc(nb, true); nb.x = c.x; nb.y = c.y;
      var rx = c.x - bd.x, ry = c.y - bd.y, l = Math.hypot(rx, ry) || 1;
      nb.vx += -bd.w * ry + rx / l * (2 + Math.random() * 3); nb.vy += bd.w * rx + ry / l * (2 + Math.random() * 3);
      FL.bodies.push(nb);
    });
    bd.blocks = keep; recalc(bd);
    if (bd === FL.me && !bd.seat && FL.seated) { FL.seated = false; var sp = seatPos(bd); FL.pilot.x = sp.x; FL.pilot.y = sp.y; }
  }

  // Treffer an fremden Schiffen: kleines x an der Stelle und ein leiser, weicher Klick
  var AC = null, lastHitS = 0;
  function audioInit() { try { if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); } catch (e) {} }
  function hitMark(x, y, bd, crit) {
    if (bd === FL.me) return;
    if (bd.ai) { bd.ai.hurt = true; bd.ai.hitN = (bd.ai.hitN || 0) + 1; }
    FL.hits.push({ x: x, y: y, life: 0, crit: !!crit }); if (FL.hits.length > 40) FL.hits.shift();
    if (!AC || AC.state !== "running") return;
    var t0 = AC.currentTime; if (t0 - lastHitS < 0.07) return; lastHitS = t0;
    try {
      var o = AC.createOscillator(), g = AC.createGain(), f = AC.createBiquadFilter();
      o.type = "triangle"; o.frequency.setValueAtTime(560, t0); o.frequency.exponentialRampToValueAtTime(330, t0 + 0.07);
      f.type = "lowpass"; f.frequency.value = 1800;
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.045, t0 + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.09);
      o.connect(f); f.connect(g); g.connect(AC.destination); o.start(t0); o.stop(t0 + 0.11);
    } catch (e) {}
  }
  // ---------- Kollisionen ----------
  // Zellen des kleineren Körpers gegen das Raster des größeren; Stoß mit Masse und Trägheit (schwere Schiffe werden weniger abgelenkt).
  // Über 20 m/s Aufprall gehen an der Stelle Blöcke kaputt.
  function collide() {
    var B = FL.bodies, dmg = [];
    FL.colCd = FL.colCd || {};
    for (var i = 0; i < B.length; i++) for (var j = i + 1; j < B.length; j++) {
      var A = B[i], C = B[j], dx = C.x - A.x, dy = C.y - A.y;
      if (FL.dock && ((FL.dock.a === A && FL.dock.b === C) || (FL.dock.a === C && FL.dock.b === A))) continue;   // Andock-Paar kollidiert nicht
      if (Math.abs(dx) > A.rad + C.rad || Math.abs(dy) > A.rad + C.rad || Math.hypot(dx, dy) > A.rad + C.rad) continue;
      var sm = A.cells.length <= C.cells.length ? A : C, bg = sm === A ? C : A;
      var px = 0, py = 0, n = 0, hs = [], hb = [], ca = Math.cos(sm.a), sa = Math.sin(sm.a);
      for (var k = 0; k < sm.cells.length; k++) {
        var cl = sm.cells[k], lx = (cl[0] - sm.com[0]) * CELL_M, ly = (cl[1] - sm.com[1]) * CELL_M, wx = sm.x + lx * ca - ly * sa, wy = sm.y + lx * sa + ly * ca;
        if (Math.abs(wx - bg.x) > bg.rad || Math.abs(wy - bg.y) > bg.rad) continue;
        var l = toLocal(bg, wx, wy), q = bg.map.get(key(Math.floor(l.x), Math.floor(l.y)));
        if (q && (T[cl[2].t].kind === "dock" || T[q.b.t].kind === "dock")) { var fx = l.x - Math.floor(l.x), fy = l.y - Math.floor(l.y); if (fx < 0.05 || fx > 0.95 || fy < 0.05 || fy > 0.95) q = null; }   // Dock-Hitbox 0,9
        if (q) { px += wx; py += wy; n++; if (hs.indexOf(cl[2]) < 0) hs.push(cl[2]); if (hb.indexOf(q.b) < 0) hb.push(q.b); }
      }
      if (!n) continue;
      px /= n; py /= n;
      var nx = sm.x - bg.x, ny = sm.y - bg.y, nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;   // Normale vom großen zum kleinen Körper
      var rsx = px - sm.x, rsy = py - sm.y, rbx = px - bg.x, rby = py - bg.y;
      var vsx = sm.vx - sm.w * rsy, vsy = sm.vy + sm.w * rsx, vbx = bg.vx - bg.w * rby, vby = bg.vy + bg.w * rbx;
      var rvx = vsx - vbx, rvy = vsy - vby, vn = rvx * nx + rvy * ny, sp = Math.hypot(rvx, rvy);
      if (sm.static && bg.static) continue;
      var ims = sm.static ? 0 : 1 / sm.mass, imb = bg.static ? 0 : 1 / bg.mass, iIs = sm.static ? 0 : 1 / sm.I, iIb = bg.static ? 0 : 1 / bg.I, rsn = rsx * ny - rsy * nx, rbn = rbx * ny - rby * nx;
      if (vn < 0) {
        var jj = -(1 + COL.e) * vn / (ims + imb + rsn * rsn * iIs + rbn * rbn * iIb);
        sm.vx += jj * nx * ims; sm.vy += jj * ny * ims; sm.w += rsn * jj * iIs;
        bg.vx -= jj * nx * imb; bg.vy -= jj * ny * imb; bg.w -= rbn * jj * iIb;
        var pk = Math.min(A.id, C.id) + ":" + Math.max(A.id, C.id);
        if (sp > COL.dmgV && !(FL.colCd[pk] > FL.t)) {
          FL.colCd[pk] = FL.t + 0.3;
          var base = (sp - COL.dmgV) * COL.dmgK, mS = sm.static ? 1e6 : sm.mass, mB = bg.static ? 1e6 : bg.mass, tot = mS + mB;
          hs.slice(0, 4).forEach(function (b) { dmg.push([sm, b, base * 2 * Math.min(1, mB / tot)]); });
          hb.slice(0, 4).forEach(function (b) { dmg.push([bg, b, base * 2 * Math.min(1, mS / tot)]); });
          spark(px, py, 14); FL.parts.push({ x: px, y: py, vx: 0, vy: 0, life: 0, max: 0.2, k: "flash", sz: 2 + sp * 0.05 });
        } else if (sp > 4) spark(px, py, 3);
      }
      // auseinanderschieben, damit nichts ineinander stecken bleibt
      var corr = Math.min(0.6, 0.06 * n), ws = (ims + imb) ? ims / (ims + imb) : 0.5;
      sm.x += nx * corr * ws; sm.y += ny * corr * ws; bg.x -= nx * corr * (1 - ws); bg.y -= ny * corr * (1 - ws);
    }
    dmg.forEach(function (d) { damage(d[0], d[1], d[2], 0, 0, true); });   // Rammen geht am Schild vorbei
  }
  // Schild-Zuweisung: Anteil der Gesamtkapazität wird aus der Schiffsenergie ins Schild umgebucht.
  // Leergeschossene Schilde füllen sich nicht von selbst, erst wenn der Regler neu gesetzt wird (oder ↻).
  // Setzt das Ziel; aufgeladen wird danach fließend in 1-%-Schritten mit dem Tempo der Generatoren. Weniger Anteil gibt Energie sofort zurück.
  function setShield(pct) {
    var me = FL.me; FL.shPct = pct; FL.shTarget = pct / 100 * me.cap;
    if ((me.shE || 0) > FL.shTarget) { var back = me.shE - FL.shTarget; me.shE = FL.shTarget; me.energy = Math.min(me.cap - me.shE, me.energy + back); FL.shCharging = false; }
    else FL.shCharging = FL.shTarget - (me.shE || 0) > 0.5;
  }
  function shieldTick(dt) {
    var me = FL.me; if (!FL.shCharging) return;
    if (!me.shGen) return;   // ohne Generator lädt nichts
    var step = me.cap / 100; FL.shAcc += dt * me.shGen;   // shGen = Prozent pro Sekunde
    while (FL.shAcc >= 1 && FL.shCharging) {
      FL.shAcc -= 1;
      var need = Math.min(step, FL.shTarget - me.shE); if (need <= 0.01 || me.energy < need) { if (me.energy < need) FL.shAcc = 0; break; }
      me.energy -= need; me.shE += need;
    }
    if (FL.shTarget - me.shE <= 0.5) { FL.shCharging = false; FL.shAcc = 0; floatTxt(t("shCharged"), "120,190,255"); }
    else if (Math.random() < dt * 40) {   // Sog-Effekt: blaue Partikel ziehen von außen an die Hülle
      var a = Math.random() * 6.28, r = me.rad * 0.9 + 6;
      FL.parts.push({ x: me.x + Math.cos(a) * r, y: me.y + Math.sin(a) * r, vx: me.vx - Math.cos(a) * r * 1.6, vy: me.vy - Math.sin(a) * r * 1.6, life: 0, max: 0.55, k: "suck", sz: 0.35 + Math.random() * 0.3 });
    }
  }
