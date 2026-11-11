  // ===== 54-figur.js · Figur: Luft und Anzug, Luken, Jetpack, Schweißen, Laufen, Werkzeugleiste, Pistole, Inventar =====
  // ---------- Luft, Luken und Raumanzug ----------
  // Eine Luke öffnet nur kurz beim Durchgehen und wenn man draußen direkt davor schwebt
  // Luken öffnen nur kurz beim Benutzen mit F
  function hatchNear(bd, b) { return b.openT > 0; }
  function pulseHatch(bd, x, y) { var o = bd.map.get(key(Math.floor(x), Math.floor(y))); if (o && T[o.b.t].kind === "hatch") o.b.openT = 0.6; }
  function airRooms(bd) {
    if (bd.rooms) bd.rooms.forEach(function (r) { r.cells.forEach(function (c) { bd.air.set(key(c[0], c[1]), r.air); }); });
    bd.rooms = rooms(bd.blocks, bd.map); bd.roomOf = new Map();
    bd.rooms.forEach(function (r, i) {
      var sum = 0, n = 0;
      r.cells.forEach(function (c) { var kk = key(c[0], c[1]), a = bd.air.get(kk); bd.roomOf.set(kk, r); if (a !== undefined) { sum += a; n++; } });
      r.air = n ? sum / r.cells.length : (bd.airInit ? 0 : 1);
    });
    bd.airInit = true; bd.roomsDirty = false;
  }
  function pilotRoom(bd) {
    if (FL.out) return null;
    var p = FL.seated ? seatPos(bd) : FL.pilot;
    return bd.roomOf ? bd.roomOf.get(key(Math.floor(p.x), Math.floor(p.y))) || null : null;
  }
  function airTick(bd, dt) {
    if (!bd.air) bd.air = new Map();
    bd.blocks.forEach(function (b) { if (T[b.t].kind !== "hatch") return; if (b.openT > 0) b.openT -= dt; var o = hatchNear(bd, b); if (o !== !!b.open) { b.open = o; bd.roomsDirty = true; } });
    if (bd.roomsDirty || !bd.rooms) airRooms(bd);
    bd.rooms.forEach(function (r) { r.air = Math.max(0, Math.min(1, r.air + (r.ok ? AIR.fill : -AIR.vent) * dt)); });
    // Atmen: Raumluft, sobald genug da ist, sonst zieht der Anzug
    var r = pilotRoom(bd); FL.breath = r && r.air > SUIT.breathe ? "room" : FL.out ? "jet" : "suit";
    if (FL.breath === "room") FL.suit = Math.min(SUIT.max, FL.suit + SUIT.refill * dt);
    else FL.suit = Math.max(0, FL.suit - dt * (1 + (FL.out && FL.eva && FL.eva.thr ? SUIT.jet : 0)));
    if (FL.suit <= 0) {
      FL.ko += dt;
      if (FL.ko > 2.5 && RUN) { FL.ko = 0; runOver("air"); return; }
      if (FL.ko > 2.5) { FL.ko = 0; FL.suit = SUIT.max; FL.out = false; FL.eva = null; if (bd.seat) { FL.seated = true; var sp = seatPos(bd); FL.pilot.x = sp.x; FL.pilot.y = sp.y; } note(t("airOut")); }
    } else FL.ko = 0;
  }
  // Aussteigen durch eine Luke: ab jetzt fliegt die Figur frei im Raum, mit dem Tempo des Schiffs an dieser Stelle
  function openEdgeKind(k) { return k === "floor" || k === "door"; }
  function exitShip(bd, lx, ly, push, mdir) {
    pulseHatch(bd, FL.pilot.x, FL.pilot.y);
    var w = toWorld(bd, lx, ly), rx = w.x - bd.x, ry = w.y - bd.y, P = FL.pilot, fa = P.face + bd.a, pa = mdir !== undefined ? mdir + bd.a : fa, pk = push ? 1.2 : 0.3;
    FL.eva = { x: w.x, y: w.y, vx: bd.vx - bd.w * ry + Math.cos(pa) * pk, vy: bd.vy + bd.w * rx + Math.sin(pa) * pk, face: fa, ph: 0, thr: false };
    FL.out = true; FL.enterCd = 0.8; FL.seated = false;
  }
  function enterAt(bd, cx, cy) {
    FL.pb = bd;
    var E = FL.eva; FL.out = false; FL.pilot.x = cx + 0.5; FL.pilot.y = cy + 0.5; FL.pilot.face = E ? E.face - bd.a : 0; FL.eva = null; FL.enterCd = 0.5;
  }
  // Bezugskörper draußen: eigenes Schiff oder Station, über der man schwebt bzw. die am nächsten ist
  function evaBody() {
    var E = FL.eva, best = FL.me, bd2 = Infinity;
    FL.bodies.forEach(function (b) {
      if (b !== FL.me && !b.station) return;
      var lp = toLocal(b, E.x, E.y), d = b.map.has(key(Math.floor(lp.x), Math.floor(lp.y))) ? -1 : Math.hypot(E.x - b.x, E.y - b.y) - b.rad;
      if (d < bd2) { bd2 = d; best = b; }
    });
    return best;
  }
  function evaTick(bd, dt) {
    var E = FL.eva, k = FL.keys, dx = (k.d ? 1 : 0) - (k.a ? 1 : 0), dy = (k.s ? 1 : 0) - (k.w ? 1 : 0), ax = 0, ay = 0;
    E.thr = false;
    if (FL.suit > 0) {
      if (dx || dy) { var l = Math.hypot(dx, dy); ax = dx / l * SUIT.acc; ay = dy / l * SUIT.acc; E.thr = true; }
      if (k.shift) {   // Tempo an das eigene Schiff angleichen
        var rvx = bd.vx - E.vx, rvy = bd.vy - E.vy, rl = Math.hypot(rvx, rvy);
        if (rl > 0.05) { var a = Math.min(SUIT.acc, rl / dt); ax += rvx / rl * a; ay += rvy / rl * a; E.thr = true; }
      }
    }
    E.vx += ax * dt; E.vy += ay * dt; E.x += E.vx * dt; E.y += E.vy * dt;
    if (E.thr && Math.random() < dt * 30) { var al = Math.hypot(ax, ay) || 1; FL.parts.push({ x: E.x - ax / al * 0.5, y: E.y - ay / al * 0.5, vx: E.vx - ax / al * 6 + (Math.random() - 0.5), vy: E.vy - ay / al * 6 + (Math.random() - 0.5), life: 0, max: 0.35, k: "jet", sz: 0.22 }); }
    var mw = mouseWorld();
    if (mw) { var want = Math.atan2(mw.y - E.y, mw.x - E.x), d = Math.atan2(Math.sin(want - E.face), Math.cos(want - E.face)); E.face += d * Math.min(1, dt * 10); }
    E.ph += E.thr ? dt * 4 : 0;
    // Schweißen draußen: Punkt vor der Figur im Schiffsraster
    FL.welding = false; FL.weldB = null; FL.weldG = null;
    if (FL.fire && FL.slot === 1) { FL.welding = true; var tp = toLocal(bd, E.x + Math.cos(E.face) * 1.6, E.y + Math.sin(E.face) * 1.6); weldAt(bd, tp.x, tp.y, dt); }
    // Zurück ins Schiff über eine Luke
    FL.enterCd = Math.max(0, FL.enterCd - dt);
    var lp = toLocal(bd, E.x, E.y), o = bd.map.get(key(Math.floor(lp.x), Math.floor(lp.y)));
    // Offenes Schiff: über eine Bodenzelle am offenen Rand schweben, dann steigt man direkt wieder ein
    if (o && openEdgeKind(T[o.b.t].kind) && FL.enterCd <= 0) {
      var cx0 = Math.floor(lp.x), cy0 = Math.floor(lp.y), edge = false;
      for (var dd = 0; dd < 4; dd++) if (!bd.map.has(key(cx0 + DV[dd][0], cy0 + DV[dd][1]))) edge = true;
      if (edge) enterAt(bd, cx0, cy0);
    }
  }
  // Schweißgerät: repariert Blöcke (15 HP/s) und baut zerstörte Blöcke an ihrer alten Stelle wieder auf
  function lostAt(bd, x, y) {
    var cx = Math.floor(x), cy = Math.floor(y);
    for (var i = 0; i < bd.lost.length; i++) { var g = bd.lost[i]; if (cellsOf(g).some(function (q) { return q.c[0] === cx && q.c[1] === cy; })) return g; }
    return null;
  }
  function canRebuild(bd, g) { return cellsOf(g).every(function (q) { return !bd.map.has(key(q.c[0], q.c[1])); }) && linked(bd.map, g).length > 0; }
  function weldAt(bd, lx, ly, dt) {
    var o = bd.map.get(key(Math.floor(lx), Math.floor(ly))), spark = false;
    if (o) { var mx = hpMax(bd, o.b); FL.weldB = o.b; if (o.b.hp < mx) { o.b.hp = Math.min(mx, o.b.hp + WELD * dt); spark = true; } }
    else if (bd.lost) {
      var g = lostAt(bd, lx, ly);
      if (g) {
        FL.weldG = g; FL.weldOk = canRebuild(bd, g);
        if (FL.weldOk) {
          var nb = { t: g.t, x: g.x, y: g.y, r: g.r, f: g.f, c: g.c, hp: WELD * dt };
          bd.lost.splice(bd.lost.indexOf(g), 1); bd.blocks.push(nb); recalc(bd); FL.weldB = nb; FL.weldG = null; spark = true;
        }
      }
    }
    if (spark && Math.random() < dt * 40) { var wp = toWorld(bd, lx, ly), a = Math.random() * 6.28, v = 3 + Math.random() * 6; FL.parts.push({ x: wp.x, y: wp.y, vx: bd.vx + Math.cos(a) * v, vy: bd.vy + Math.sin(a) * v, life: 0, max: 0.15 + Math.random() * 0.2, k: "weld", sz: 0.25 }); }
  }
  // ---------- zu Fuß im Schiff ----------
  function localPt(b, lx, ly) {
    var ty = T[b.t], w = ty.w, h = ty.h, x = b.f ? w - lx : lx, y = ly;
    for (var i = 0; i < b.r; i++) { var nx = h - y, ny = x; x = nx; y = ny; var tw = w; w = h; h = tw; }
    return { x: b.x + x, y: b.y + y };
  }
  function seatPos(bd) { var b = bd.seat; if (!b) return { x: bd.com[0], y: bd.com[1] }; var ty = T[b.t]; return ty.w === 1 ? localPt(b, 0.5, 1.45) : localPt(b, ty.w / 2, (ty.h > 3 ? 1.6 : 1.2) + 0.95); }
  function walkable(bd, x, y) {
    var o = bd.map.get(key(Math.floor(x), Math.floor(y))); if (!o) return false;
    var k = T[o.b.t].kind; return k === "floor" || k === "door" || k === "hatch" || (k === "cock" && o.ly >= 1) || (k === "dock" && o.b.dockOpen > 0.8);
  }
  function canStand(bd, x, y) { var r = 0.24; return walkable(bd, x - r, y - r) && walkable(bd, x + r, y - r) && walkable(bd, x - r, y + r) && walkable(bd, x + r, y + r); }
  function walk(bd, dt) {
    var P = FL.pilot, k = FL.keys, dx = (k.d ? 1 : 0) - (k.a ? 1 : 0), dy = (k.s ? 1 : 0) - (k.w ? 1 : 0);
    if (dx || dy) {   // Bildschirmrichtung → Schiffsrahmen
      var l = Math.hypot(dx, dy), ca = Math.cos(bd.a), sa = Math.sin(bd.a), lx = (dx * ca + dy * sa) / l, ly = (-dx * sa + dy * ca) / l, sp = 2.2 * dt * (PM.walk ? 2 : 1) * (k.shift ? 1.8 : 1);   // Umschalt: sprinten
      if (canStand(bd, P.x + lx * sp, P.y)) P.x += lx * sp;
      if (canStand(bd, P.x, P.y + ly * sp)) P.y += ly * sp;
      P.ph += dt * 10;
      var cur = bd.map.get(key(Math.floor(P.x), Math.floor(P.y)));
      // Angedockt: vom Andockring direkt in den Dock des anderen Körpers hinübergehen
      if (cur && T[cur.b.t].kind === "dock" && FL.dock && FL.dock.done) {
        var tx2 = P.x + lx * 0.75, ty2 = P.y + ly * 0.75;
        if (!bd.map.get(key(Math.floor(tx2), Math.floor(ty2)))) {
          var ob = bd === FL.dock.a ? FL.dock.b : FL.dock.a, wpt = toWorld(bd, tx2, ty2), l2 = toLocal(ob, wpt.x, wpt.y);
          if (walkable(ob, l2.x, l2.y)) {
            // ein Stück weiter in den anderen Dock schieben, bis die Figur sicher steht
            var w3 = toWorld(bd, P.x + lx * 1.6, P.y + ly * 1.6), l3 = toLocal(ob, w3.x, w3.y), qx = l2.x, qy = l2.y;
            for (var st2 = 0; st2 <= 10 && !canStand(ob, qx, qy); st2++) { qx = l2.x + (l3.x - l2.x) * st2 / 10; qy = l2.y + (l3.y - l2.y) * st2 / 10; }
            if (canStand(ob, qx, qy)) { FL.pb = ob; P.x = qx; P.y = qy; P.face += bd.a - ob.a; return; }
          }
        }
      }
      // Offenes Schiff: Boden oder Tür ohne Wand zum All, dort direkt hinaustreten (Luken nur mit F)
      if (cur && openEdgeKind(T[cur.b.t].kind)) { var nx = P.x + lx * 0.75, ny = P.y + ly * 0.75; if (!bd.map.get(key(Math.floor(nx), Math.floor(ny)))) { exitShip(bd, nx, ny, true, Math.atan2(ly, lx)); return; } }
    } else P.ph *= Math.pow(0.001, dt);
    // Boden unter den Füßen weggeschossen: die Figur treibt ins All
    if (!walkable(bd, P.x, P.y)) { exitShip(bd, P.x, P.y); FL.eva.vx -= Math.cos(P.face + bd.a) * 1.2; FL.eva.vy -= Math.sin(P.face + bd.a) * 1.2; return; }
    // Schweißgerät: repariert oder baut den Block direkt vor der Figur
    FL.welding = false; FL.weldB = null; FL.weldG = null;
    { var mw2 = mouseWorld(); if (mw2) { var lm = toLocal(bd, mw2.x, mw2.y), wa = Math.atan2(lm.y - P.y, lm.x - P.x), dd2 = Math.atan2(Math.sin(wa - P.face), Math.cos(wa - P.face)); P.face += dd2 * Math.min(1, dt * 16); } }   // zu Fuß immer zur Maus schauen
    if (FL.fire && FL.slot === 1) { FL.welding = true; weldAt(bd, P.x + Math.cos(P.face) * 0.8, P.y + Math.sin(P.face) * 0.8, dt); }
  }
  function toggleSeat() {
    var me = FL.me;
    if (FL.out) {   // draußen: über einer Luke mit F wieder hinein
      var eb = evaBody(), lp = toLocal(eb, FL.eva.x, FL.eva.y), o = eb.map.get(key(Math.floor(lp.x), Math.floor(lp.y)));
      if (o && T[o.b.t].kind === "hatch") { o.b.openT = 0.6; enterAt(eb, Math.floor(lp.x), Math.floor(lp.y)); } else note(t("outside"));
      return;
    }
    var pb = FL.pb || me;
    if (!FL.seated) {   // zu Fuß auf einer Luke: mit F hinaus (auch durch die Decke, wenn die Luke mitten im Raum liegt)
      var hc = pb.map.get(key(Math.floor(FL.pilot.x), Math.floor(FL.pilot.y)));
      if (hc && T[hc.b.t].kind === "hatch") { exitShip(pb, FL.pilot.x, FL.pilot.y, false); FL.pb = me; return; }
      if (pb !== me) { note(t("notOnShip")); return; }
    }
    if (FL.seated) { FL.seated = false; var sp = seatPos(me); FL.pilot.x = sp.x; FL.pilot.y = sp.y; FL.pilot.face = me.seat ? dirAngle(me.seat) : 0; return; }
    if (!me.seat) return;
    var p = seatPos(me); if (Math.hypot(p.x - FL.pilot.x, p.y - FL.pilot.y) > 1.5) { note(t("tooFar")); return; }
    FL.seated = true;
  }
  // ---------- Werkzeugleiste zu Fuß (1–9) ----------
  // 1 Schweißgerät, 2 Pistole (Einzelschuss, 50 % des Minigun-Schadens), 3–9 frei
  var HOT = [
    { n: L2("Schweißgerät", "Welder"), ic: '<svg viewBox="0 0 24 24"><path d="M4 17l7-7 3 3-7 7H4z" fill="#9AA5B1"/><path d="M14 13l3-3" stroke="#D5DADF" stroke-width="2"/><circle cx="18.5" cy="8.5" r="2.4" fill="#8EE0FF"/><path d="M18.5 3v2M22 8.5h-2M21 4.5l-1.4 1.4" stroke="#8EE0FF" stroke-width="1.4"/></svg>' },
    { n: L2("Pistole", "Pistol"), ic: '<svg viewBox="0 0 24 24"><path d="M3 8h15l2 2v2H11l-1 2h-2l-1 5H4l1-6H3z" fill="#9AA5B1"/><path d="M18 9h3" stroke="#D5DADF" stroke-width="2"/></svg>' }
  ];
  function firePistol() {
    if ((FL.pcd || 0) > FL.t) return; FL.pcd = FL.t + PISTOL.cd;
    var mw = mouseWorld(); if (!mw) return;
    // Mündung der Pistole: in der Hand vor der Figur (Figurmaßstab: 1 Einheit ≈ 0,13 m)
    var ox, oy, vx0, vy0, fw;
    if (FL.out && FL.eva) { ox = FL.eva.x; oy = FL.eva.y; vx0 = FL.eva.vx; vy0 = FL.eva.vy; fw = FL.eva.face; }
    else { var pb = FL.pb || FL.me, P = FL.pilot, w = toWorld(pb, P.x, P.y); ox = w.x; oy = w.y; vx0 = pb.vx; vy0 = pb.vy; fw = P.face + pb.a; }
    var u = CELL_M / 24 * 1.25, cf = Math.cos(fw), sf = Math.sin(fw), mx = ox + (12.8 * cf - 4.5 * sf) * u, my = oy + (12.8 * sf + 4.5 * cf) * u;
    var a = Math.atan2(mw.y - my, mw.x - mx), da = Math.atan2(Math.sin(a - fw), Math.cos(a - fw)); if (Math.abs(da) > 0.5) a = fw + Math.sign(da) * 0.5;   // nur grob in Blickrichtung
    var dx = Math.cos(a), dy = Math.sin(a);
    FL.shots.push({ x: mx, y: my, vx: vx0 + dx * PISTOL.speed, vy: vy0 + dy * PISTOL.speed, life: 0, own: null, pl: true, dmg: PISTOL.dmg });   // volle Kollision, auch eigenes Schiff
    FL.parts.push({ x: mx + dx * 0.1, y: my + dy * 0.1, vx: vx0, vy: vy0, life: 0, max: 0.04, k: "flash", sz: 0.18 });
  }
  function syncHot() {
    var el = V.root.querySelector(".sr-hot"); if (!el || !FL) return;
    el.querySelectorAll("i").forEach(function (q, i) { q.classList.toggle("on", FL.slot === i + 1); });
    var nm = HOT[FL.slot - 1]; set("sr-hot-n", nm ? nm.n[lang] : t("emptySlot"));
  }
  function hotHtml() {
    var h = ""; for (var i = 0; i < 9; i++) h += '<i title="' + (HOT[i] ? HOT[i].n[lang] : "") + '"><u>' + (i + 1) + "</u>" + (HOT[i] ? HOT[i].ic : "") + "</i>";
    return '<div class="sr-hot"><div class="sr-hot-row">' + h + '</div><span id="sr-hot-n"></span></div>';
  }
  // Ortsname beim Überschreiten der Schwelle: 3 s sichtbar, bis 4 s ausgeblendet
  function showPlace(name) {
    var el = V.root.querySelector(".sr-place"); if (!el) return;
    el.textContent = name; el.classList.remove("go"); void el.offsetWidth; el.classList.add("go");
  }
  // ---------- Charakter-Inventar ----------
  // 8×8 leere Plätze wie in Survival-Spielen; Gegenstände folgen in einem späteren Update
  function openInv() {
    if (!FL) return; var el = V.root.querySelector(".sr-inv"); el.hidden = false;
    var g = el.querySelector(".sr-inv-grid"); if (!g.childElementCount) { var h = ""; for (var i = 0; i < INV.w * INV.h; i++) h += '<i class="sr-slot"></i>'; g.innerHTML = h; }
    var n = (FL.items || []).length; el.querySelector(".sr-inv-cnt").textContent = n + " / " + (INV.w * INV.h);
  }
  function closeInv() { if (!V) return; V.root.querySelector(".sr-inv").hidden = true; }
  function invOpen() { var el = V && V.root.querySelector(".sr-inv"); return !!(el && !el.hidden); }
