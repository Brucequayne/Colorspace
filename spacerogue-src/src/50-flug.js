  // ===== 50-flug.js · Flug: Körper, Start/Ende des Testflugs, Hauptschleife der Simulation (flTick) =====
  // ---------- Testflug ----------
  var FL = null, BID = 0, ZMIN_FL = 0.2, ZMIN_ST = 0.1, VMAX = 500, VHI = 120;
  // Maximale HP eines Blocks; Perks erhöhen sie für das eigene Schiff
  function hpMax(bd, b) { var h = T[b.t].hp; if (bd && bd.player) { h *= 1 + PM.hp; if (T[b.t].kind === "cock") h *= 1 + PM.cockHp; } return h; }
  function makeBody(blocks, ctrl) {
    var bd = { blocks: blocks, x: 0, y: 0, a: 0, vx: 0, vy: 0, w: 0, ctrl: !!ctrl, energy: 0, cap: 0, flames: {} };
    blocks.forEach(function (b) { if (b.hp === undefined) b.hp = T[b.t].hp; });
    recalc(bd, true);
    bd.energy = bd.cap;
    return bd;
  }
  function recalc(bd, first) {
    var pm = bd.player ? PM : null, st = stats(bd.blocks, pm), old = bd.com;
    bd.com = st.com; bd.mass = Math.max(0.5, st.mass); bd.I = Math.max(1, st.I); bd.thr = st.thr; bd.torque = st.torque; bd.prod = st.prod * (pm ? 1 + pm.prod : 1);
    bd.cap = st.cap * (pm ? 1 + pm.batCap : 1) + (st.cock ? 30 : 0);
    var shk = 0; bd.blocks.forEach(function (b) { if (T[b.t].kind === "shield") shk += T[b.t].shk; });
    bd.shGen = shk; bd.shEff = 1;   // Ladetempo in % der Kapazität pro Sekunde (klein 5, groß 25, addiert sich); 1 Energie je abgefangenem Schadenspunkt
    bd.shE = Math.min(bd.shE || 0, bd.cap); bd.energy = Math.min(bd.energy, bd.cap - bd.shE);
    bd.map = buildMap(bd.blocks); bd.roomsDirty = true;
    bd.cool = coolMap(bd.blocks, bd.map); bd.ocMax = ocMaxOf(bd.blocks, bd.cool) * (pm ? 1 + pm.oc : 1);
    bd.seat = bd.blocks.filter(function (b) { return T[b.t].kind === "cock"; })[0] || null;
    bd.cock = st.cock; bd.thrSum = st.thr[0] + st.thr[1] + st.thr[2] + st.thr[3]; bd.nAnt = bd.blocks.filter(function (b) { return T[b.t].kind === "ant"; }).length; bd.tcomp = bd.blocks.some(function (b) { return T[b.t].kind === "tcomp"; });
    bd.cells = []; bd.map.forEach(function (v, k) { var q = k.split(","); bd.cells.push([+q[0] + 0.5, +q[1] + 0.5, v.b]); });
    if (!bd.id) bd.id = ++BID;
    var r = 0; bd.blocks.forEach(function (b) { var f = fp(b); [[b.x, b.y], [b.x + f[0], b.y + f[1]]].forEach(function (p) { r = Math.max(r, Math.hypot(p[0] - bd.com[0], p[1] - bd.com[1])); }); }); bd.rad = r * CELL_M + 2;
    if (!first && old) { var dx = (bd.com[0] - old[0]) * CELL_M, dy = (bd.com[1] - old[1]) * CELL_M, ca = Math.cos(bd.a), sa = Math.sin(bd.a); bd.x += dx * ca - dy * sa; bd.y += dx * sa + dy * ca; }
  }
  function toWorld(bd, cx, cy) { var lx = (cx - bd.com[0]) * CELL_M, ly = (cy - bd.com[1]) * CELL_M, ca = Math.cos(bd.a), sa = Math.sin(bd.a); return { x: bd.x + lx * ca - ly * sa, y: bd.y + lx * sa + ly * ca }; }
  function toLocal(bd, x, y) { var dx = x - bd.x, dy = y - bd.y, ca = Math.cos(bd.a), sa = Math.sin(bd.a); return { x: (dx * ca + dy * sa) / CELL_M + bd.com[0], y: (-dx * sa + dy * ca) / CELL_M + bd.com[1] }; }
  function dirWorld(bd, d) { var v = DV[d], ca = Math.cos(bd.a), sa = Math.sin(bd.a); return { x: v[0] * ca - v[1] * sa, y: v[0] * sa + v[1] * ca }; }
  function blockCenter(bd, b) { var f = fp(b); return toWorld(bd, b.x + f[0] / 2, b.y + f[1] / 2); }

  function startTest() {
    save();
    var stMode = S.ed === "station", src = stMode ? S.ship : S.blocks, st = stats(src);
    if (!st.cock) { note(t(stMode ? "stNoShip" : "noCockTest")); return; }
    var comps = components(src), main = comps.reduce(function (a, b) { return mainScore(b) > mainScore(a) ? b : a; });
    var copy = main.map(function (b) { return { t: b.t, x: b.x, y: b.y, r: b.r, f: b.f, c: b.c }; });
    var me = makeBody(copy, true);
    FL = { bodies: [me], me: me, shots: [], beams: [], parts: [], seated: true, damp: true, wsel: 0, groups: [], keys: {}, mdx: 0, cam: { x: 0, y: 0 }, zoom: 1, t: 0 };
    var sp0 = seatPos(me); FL.pilot = { x: sp0.x, y: sp0.y, face: -Math.PI / 2, ph: 0 };
    FL.oc = false; FL.ocT = me.ocMax;
    FL.groups = WGROUPS.filter(function (g) { return me.blocks.some(function (b) { return grpOf(b) === g; }); });   // je Waffentyp eine eigene Gruppe
    FL.missiles = []; FL.hits = []; FL.sig = 0; FL.banner = 0; me.id = ++BID;
    FL.items = []; FL.pb = me; FL.dock = null; FL.shHits = []; FL.shPct = 0; me.shE = 0; FL.kills = 0; FL.shTarget = 0; FL.shAcc = 0;
    var kcb = V.root.querySelector(".sr-kc b"); if (kcb) kcb.textContent = "0";
    me.player = true; recalc(me); me.energy = me.cap; me.name = S.names.ship || t("shipDef"); FL.slot = 1; FL.pbLast = undefined;
    FL.suit = SUIT.max; FL.out = false; FL.eva = null; FL.enterCd = 0; FL.ko = 0; me.lost = []; me.air = new Map();
    if (stMode && S.station.length) {
      // Raumstation: statischer Körper vor dem Schiff, bewegt sich nie, auch nicht durch Stöße
      var sc = components(S.station), sm = sc.reduce(function (a, b) { return b.length > a.length ? b : a; });
      var sta = makeBody(sm.map(function (b) { return { t: b.t, x: b.x, y: b.y, r: b.r, f: b.f, c: b.c }; }), false);
      sta.static = true; sta.station = true; sta.name = S.names.station || t("stDef"); sta.id = ++BID; sta.x = 0; sta.y = me.y - (me.rad + sta.rad + 40); sta.vx = sta.vy = sta.w = 0;
      FL.bodies.push(sta);
    } else if (!stMode) spawnTargets();
    // Environment (nur Developer Tool): Zelle (0,0) der Szene liegt dort, wo auch die Station liegt; ohne Station 60 m vor dem Schiff
    FL.env = []; FL.envG = [];
    if (stMode && S.env && S.env.length) {
      var stb = FL.bodies.filter(function (b) { return b.station; })[0];
      envFlightInit(stb ? { x: stb.x - stb.com[0] * CELL_M, y: stb.y - stb.com[1] * CELL_M } : { x: me.x, y: me.y - me.rad - 60 });
    }
    S.viewEd = S.view; S.view = "out"; FL.seatWas = true;
    S.mode = "fly"; V.zoomEd = V.zoom; V.zoom = Math.min(1.1, Math.max(0.6, V.zoom));
    syncUI();
  }
  function stopTest() { FL = null; S.mode = "edit"; if (V.zoomEd) V.zoom = V.zoomEd; if (S.viewEd) S.view = S.viewEd; syncUI(); }
  // Zielschiffe: Panzerung mit ein paar Maschinenteilen, damit Rauch und Feuer sichtbar werden
  function targetShip() {
    var B = [];
    for (var y = 0; y < 5; y++) for (var x = -3; x <= 3; x++) {
      var edge = x === -3 || x === 3 || y === 0 || y === 4;
      B.push({ t: edge ? (y === 0 ? "hblk" : "lblk") : (x === 0 && y === 2 ? "rea" : "flo"), x: x, y: y, r: 0, f: 0, c: edge && y === 0 ? "#B9573E" : undefined });
    }
    B = B.filter(function (b) { return !(b.x >= 0 && b.x <= 1 && b.y >= 2 && b.y <= 3 && !(b.x === 0 && b.y === 2)); });
    B = B.filter(function (b) { return b.t !== "flo" || !(b.x === 0 && b.y === 2); });
    B.push({ t: "gyr", x: -1, y: 2, r: 0, f: 0 }); B.push({ t: "bat", x: 2, y: 2, r: 0, f: 0 });
    B = B.filter(function (b) { return !(b.t === "flo" && ((b.x === -1 && b.y === 2) || (b.x === 2 && b.y === 2))); });
    B.push({ t: "ths", x: -2, y: 5, r: 0, f: 0 }); B.push({ t: "ths", x: 2, y: 5, r: 0, f: 0 });
    return B;
  }
  function spawnTargets() {
    FL.bodies = FL.bodies.filter(function (b) { return b === FL.me || b.enemy || b.station; });
    [[0, -110, 0.2], [85, -70, -0.6], [-95, -55, 0.9]].forEach(function (p) {
      var bd = makeBody(targetShip(), false); bd.x = FL.me.x + p[0]; bd.y = FL.me.y + p[1]; bd.a = p[2]; bd.w = (Math.random() - 0.5) * 0.15; bd.target = true;
      FL.bodies.push(bd);
    });
  }

  function flTick(dt) {
    FL.t += dt;
    if (FL.oc) { FL.ocT -= dt; if (FL.ocT <= 0) { FL.ocT = 0; FL.oc = false; } }
    else FL.ocT = Math.min(FL.me.ocMax || 3, FL.ocT + dt * 0.5);
    var me = FL.me, k = FL.keys;
    airTick(FL.pb || me, dt);
    // Schiebetür großer Cockpits öffnet, wenn man zu Fuß in ihre Nähe kommt
    if (me.seat && T[me.seat.t].h >= 4) { var sb = me.seat, sf = fp(sb), bdir = dirOut(sb, 2), dcx = sb.x + sf[0] / 2 + DV[bdir][0] * (sf[0] / 2 - 0.2), dcy = sb.y + sf[1] / 2 + DV[bdir][1] * (sf[1] / 2 - 0.2);
      var near = !FL.seated && !FL.out && Math.hypot(FL.pilot.x - dcx, FL.pilot.y - dcy) < 1.3; sb.ckOpen = Math.max(0, Math.min(1, (sb.ckOpen || 0) + (near ? dt : -dt) * 4)); }
    // Luken aller eigenen Körper schließen nach dem Durchgehen wieder (auch die der Station, wenn man nicht dort ist)
    FL.bodies.forEach(function (b) { if (b === (FL.pb || me) || (b !== me && !b.station)) return; b.blocks.forEach(function (hb) { if (T[hb.t].kind !== "hatch") return; if (hb.openT > 0) hb.openT -= dt; var o = hb.openT > 0; if (o !== !!hb.open) { hb.open = o; b.roomsDirty = true; } }); });
    if (FL.out) evaTick(evaBody(), dt);
    FL.bodies.slice().forEach(function (bd) {
      // Raketen: jede Werfer-Art (leicht/schwer) lädt für sich nach
      if (bd.mst) Object.keys(bd.mst).forEach(function (g) { var q = bd.mst[g]; q.cd = Math.max(0, q.cd - dt); if (q.rl > 0) { q.rl -= dt; if (q.rl <= 0) { q.rl = 0; bd.blocks.forEach(function (b) { if (b.t === g) b.ammo = msMax(b); }); } } });
      // Energie: Reaktoren laden, Verbraucher ziehen
      bd.energy = Math.min(bd.cap - (bd.shE || 0), bd.energy + bd.prod * dt);   // der Schildanteil ist reserviert
      bd.flames = {};
      if (bd === me) turretTick(bd, dt, FL.seated && !FL.out ? mouseWorld() : null);
      if (bd === me && bd.ctrl && bd.seat && !FL.dock) control(bd, dt, FL.seated);   // ohne Pilot halten nur die Dämpfer das Schiff; beim Andocken steuert der Autopilot
      if (bd === me) { var fm = 0; for (var fk in bd.flames) fm = Math.max(fm, bd.flames[fk]); if (FL.fire && FL.seated && FL.groups.length) fm = Math.max(fm, 0.6); FL.sig = Math.max(FL.sig * Math.exp(-dt / 1.2), fm); }
      if (bd.ai) aiTick(bd, dt);
      turretsAuto(bd, dt);   // Turrets zielen und feuern selbstständig
      if (bd === (FL.pb || me) && !FL.seated && !FL.out) walk(bd, dt);
      var vlim = bd.enemy ? VMAX * AI.vk : VMAX;   // Tempolimit 500 m/s, KI-Schiffe 10 % weniger
      var vv = Math.hypot(bd.vx, bd.vy); if (vv > vlim) { bd.vx *= vlim / vv; bd.vy *= vlim / vv; vv = vlim; }
      if (bd === me) {
        // Sperre bei 120 m/s: verhindert nur weiteres Beschleunigen, bremst nie ab. Umschalt gibt den Bereich 120–500 m/s frei.
        var pv = bd.pv || 0;
        if (!FL.hiOk && vv > VHI && vv > pv) { var lim = Math.max(pv, VHI); bd.vx *= lim / vv; bd.vy *= lim / vv; vv = lim; }
        if (FL.hiOk && pv <= VHI && vv > VHI) { FL.shake = 0.7; FL.ca = Math.max(FL.ca || 0, 0.5); }   // Eintritt in hohe Geschwindigkeit
        if (FL.hiOk && pv >= VHI && vv < VHI) FL.hiOk = false;   // wieder unter 120 m/s: Freigabe erlischt, beim nächsten Mal erneut Umschalt
        bd.pv = vv;
      }
      if (bd.static) { bd.vx = bd.vy = bd.w = 0; }
      bd.x += bd.vx * dt; bd.y += bd.vy * dt; bd.a += bd.w * dt;
      bd.blocks.forEach(function (b) {
        var ty = T[b.t];
        if (ty.kind === "mg" || (ty.kind === "tur" && ty.tw === "mg")) { var cn = (bd.cool && bd.cool.get(b)) || 0; if (b.oh > 0) { b.oh -= dt; if (b.oh <= 0) { b.oh = 0; b.heat = 0; } } else if (!b.firing) b.heat = Math.max(0, (b.heat || 0) - MG.cool * (1 + 0.6 * cn) * dt); b.firing = false; }
        if (ty.kind === "ms" && b.ammo === undefined) b.ammo = msMax(b);
        if (ty.kind === "rg" || (ty.kind === "tur" && ty.tw === "rg")) { if (b.cd > 0) b.cd -= dt; if (!b.holding) b.chg = 0; b.holding = false; }
        if ((ty.kind === "gun" || ty.kind === "tur") && b.gcd > 0) b.gcd -= dt;
        var hk = b.hp / hpMax(bd, b);
        if (MECH[ty.kind] && hk < 0.5 && Math.random() < dt * (hk < 0.25 ? 5 : 2.5)) { var p = blockCenter(bd, b); FL.parts.push({ x: p.x + (Math.random() - 0.5) * 2, y: p.y + (Math.random() - 0.5) * 2, vx: bd.vx + (Math.random() - 0.5) * 3, vy: bd.vy - 1.5 - Math.random() * 2, life: 0, max: 1.4 + Math.random() * 0.8, k: "smoke", sz: 0.5 + Math.random() * 0.5 }); }
        if (MECH[ty.kind] && hk < 0.25 && Math.random() < dt * 9) { var q = blockCenter(bd, b); FL.parts.push({ x: q.x + (Math.random() - 0.5) * 1.6, y: q.y + (Math.random() - 0.5) * 1.6, vx: bd.vx + (Math.random() - 0.5) * 4, vy: bd.vy + (Math.random() - 0.5) * 4, life: 0, max: 0.4 + Math.random() * 0.3, k: "fire", sz: 0.45 + Math.random() * 0.45 }); }
      });
    });
    collide();
    envCollide();
    enemyBook(dt);
    trailTick();
    dockTick(dt);
    tipTick(dt);
    shieldTick(dt);
    FL.hits = FL.hits.filter(function (h) { h.life += dt; return h.life < 0.35; });
    if (FL.banner > 0) FL.banner -= dt;
    // Geschosse
    FL.shots = FL.shots.filter(function (p) {
      p.life += dt; if (p.life > (p.lmax || MG.life)) return false;
      var steps = Math.ceil(Math.hypot(p.vx, p.vy) * dt / 1.0);
      for (var i = 0; i < steps; i++) {
        p.x += p.vx * dt / steps; p.y += p.vy * dt / steps;
        if (FL.envG.length && envHit(p.x, p.y)) { spark(p.x, p.y, 4); return false; }   // Environment ist unzerstörbar
        var hit = p.pl ? hitAt(p.x, p.y, null, true) : hitAt(p.x, p.y, p.own); if (hit) { var crit = p.own && p.own.player && Math.random() < PM.crit; if (p.own === FL.me || p.pl) hitMark(p.x, p.y, hit.bd, crit); damage(hit.bd, hit.b, (p.dmg || MG.dmg) * (crit ? 2 : 1), p.x, p.y); spark(p.x, p.y, crit ? 10 : p.k ? 9 : 5); if (p.splash) blast(p.x, p.y, p.splash, p.sdmg, null); return false; }
      }
      return true;
    });
    FL.beams = FL.beams.filter(function (b) { b.life += dt; return b.life < 0.3; });
    // Leichte Raketen: starke Beschleunigung, lenken nur ganz leicht zum Mauszeiger
    var mw = mouseWorld();
    FL.missiles = (FL.missiles || []).filter(function (m) {
      var mk = (m.own && m.own.player ? 1 + PM.msDmg : 1) * (m.k || 1);
      m.life += dt; if (m.life > MS.life) { blast(m.x, m.y, MS.splash, MS.sdmg * mk, m.own); return false; }
      var tg = m.own === FL.me ? mw : (m.own.ai && !m.own.dead ? { x: FL.me.x, y: FL.me.y } : null);
      if (tg) { var want = Math.atan2(tg.y - m.y, tg.x - m.x), dh = Math.atan2(Math.sin(want - m.h), Math.cos(want - m.h)); var trn = MS.turn * (m.own && m.own.player ? 1 + PM.msTurn : 1); m.h += Math.max(-trn * dt, Math.min(trn * dt, dh)); }
      var sp = Math.hypot(m.vx, m.vy), ns = Math.min(MS.vmax, sp + MS.acc * dt);
      // Geschwindigkeit dreht mit der Nase mit
      m.vx = Math.cos(m.h) * ns; m.vy = Math.sin(m.h) * ns;
      if (Math.random() < 0.9) FL.parts.push({ x: m.x, y: m.y, vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2, life: 0, max: 0.7 + Math.random() * 0.4, k: "smoke", sz: 0.35 + Math.random() * 0.25 });
      var steps = Math.ceil(ns * dt / 1.0);
      for (var i = 0; i < steps; i++) {
        m.x += m.vx * dt / steps; m.y += m.vy * dt / steps;
        if (FL.envG.length && envHit(m.x, m.y)) { blast(m.x, m.y, MS.splash, MS.sdmg * mk, null); return false; }
        var hit = hitAt(m.x, m.y, m.own); if (hit) { if (m.own === FL.me) hitMark(m.x, m.y, hit.bd); damage(hit.bd, hit.b, MS.dmg * mk, m.x, m.y); blast(m.x, m.y, MS.splash, MS.sdmg * mk, null); return false; }
      }
      return true;
    });
    FL.parts = FL.parts.filter(function (q) { q.life += dt; q.x += q.vx * dt; q.y += q.vy * dt; if (q.k === "debris") { q.a += q.w * dt; } return q.life < q.max; });
    if (FL.parts.length > 900) FL.parts.splice(0, FL.parts.length - 900);
    // Dynamische Kamera: schaut ein Stück in Richtung Maus, das Schiff rückt dabei Richtung Bildrand (höchstens 30 % des halben Bildes)
    var tox = 0, toy = 0, ppm = PX * V.zoom / CELL_M;
    if (V.mouse) {
      tox = Math.max(-0.3 * V.W / 2, Math.min(0.3 * V.W / 2, (V.mouse.sx - V.W / 2) * 0.35)) / ppm;
      toy = Math.max(-0.3 * V.H / 2, Math.min(0.3 * V.H / 2, (V.mouse.sy - V.H / 2) * 0.35)) / ppm;
    }
    FL.camOff = FL.camOff || { x: 0, y: 0 }; var ck = 1 - Math.exp(-dt * 3.5);
    FL.camOff.x += (tox - FL.camOff.x) * ck; FL.camOff.y += (toy - FL.camOff.y) * ck;
    var fx = me.x, fy = me.y;
    if (FL.out && FL.eva) { fx = FL.eva.x; fy = FL.eva.y; }
    else if (!FL.seated) { var pw = toWorld(FL.pb || me, FL.pilot.x, FL.pilot.y); fx = pw.x; fy = pw.y; }   // zu Fuß folgt die Kamera der Figur
    // Schwelle überschritten (anderer Körper betreten): Name einblenden
    var here = FL.out ? null : (FL.pb || me);
    if (here !== FL.pbLast) { if (here && FL.pbLast !== undefined && !FL.seated) showPlace(here.name || ""); FL.pbLast = here; }
    FL.cam.x = fx + FL.camOff.x; FL.cam.y = fy + FL.camOff.y;
  }
