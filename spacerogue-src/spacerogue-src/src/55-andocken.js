  // ===== 55-andocken.js · Andocken: Dock-Paare finden, Autopilot, Türen, Effekte =====
  // ---------- Andocken ----------
  // Zwei gleich große Docks, Ringe zueinander, Abstand unter einem Block: P startet den Autopiloten, der langsam und sicher ankoppelt.
  // Docks haben eine um 10 % verkleinerte Hitbox, und zwischen dem Paar gibt es keine Kollision, damit nichts klemmt.
  function dockFace(bd, b) {
    var f = fp(b), d = dirOut(b, 0), lx = b.x + f[0] / 2 + DV[d][0] * f[0] / 2, ly = b.y + f[1] / 2 + DV[d][1] * f[1] / 2;
    var p = toWorld(bd, lx, ly), ca = Math.cos(bd.a), sa = Math.sin(bd.a);
    return { x: p.x, y: p.y, dx: DV[d][0] * ca - DV[d][1] * sa, dy: DV[d][0] * sa + DV[d][1] * ca, lx: lx, ly: ly };
  }
  function findDockPair() {
    var me = FL.me, best = null;
    me.blocks.forEach(function (a) {
      if (T[a.t].kind !== "dock") return; var fa = dockFace(me, a);
      FL.bodies.forEach(function (ob) {
        if (ob === me || ob.enemy) return;
        ob.blocks.forEach(function (b) {
          if (b.t !== a.t) return; var fb = dockFace(ob, b), dist = Math.hypot(fa.x - fb.x, fa.y - fb.y), dot = fa.dx * fb.dx + fa.dy * fb.dy;
          if (dist < DOCK.range && dot < -0.9 && (!best || dist < best.dist)) best = { a: me, da: a, b: ob, db: b, dist: dist };
        });
      });
    });
    return best;
  }
  function dockKey() {
    if (FL.dock) {   // Abdocken
      if (!FL.dock.done) { FL.dock = null; floatTxt(t("dockAbort")); return; }
      if ((FL.pb || FL.me) !== FL.me) { note(t("notOnShip")); return; }
      var cur = FL.me.map.get(key(Math.floor(FL.pilot.x), Math.floor(FL.pilot.y)));
      if (!FL.seated && cur && T[cur.b.t].kind === "dock") { note(t("dockStand")); return; }
      var D = FL.dock; D.da.dockOpen = 0; D.db.dockOpen = 0; FL.me.static = false; FL.me.roomsDirty = true; D.b.roomsDirty = true;
      var fb = dockFace(D.b, D.db); FL.me.vx = D.b.vx + fb.dx * 0.8; FL.me.vy = D.b.vy + fb.dy * 0.8; FL.me.w = 0;
      FL.dock = null; floatTxt(t("undocked")); return;
    }
    var pr = findDockPair(); if (!pr) { floatTxt(t("noDock")); return; }
    FL.dock = pr; pr.done = false; pr.hiss = false; floatTxt(t("docking"));
  }
  function dockTick(dt) {
    var D = FL.dock, me = FL.me;
    // Türen der Docks: öffnen erst, wenn vollständig angedockt
    FL.bodies.forEach(function (bd) { bd.blocks.forEach(function (b) { if (T[b.t].kind !== "dock") return; var want = D && D.done && (b === D.da || b === D.db) ? 1 : 0, o0 = b.dockOpen || 0;
      b.dockOpen = Math.max(0, Math.min(1, o0 + (want ? dt : -dt) * 1.6)); if ((o0 > 0.5) !== (b.dockOpen > 0.5)) bd.roomsDirty = true; }); });
    if (!D) return;
    if (FL.bodies.indexOf(D.b) < 0 || me.blocks.indexOf(D.da) < 0 || D.b.blocks.indexOf(D.db) < 0) { FL.dock = null; me.static = false; return; }
    if (D.done) { me.vx = D.b.vx; me.vy = D.b.vy; me.w = 0; return; }
    // Zielpose: Ring an Ring mit kleinem Spalt, Docks genau gegenüber
    var fb = dockFace(D.b, D.db), fa = dockFace(me, D.da);
    var aErr = angDiff(Math.atan2(-fb.dy, -fb.dx), Math.atan2(fa.dy, fa.dx));
    var tx = fb.x + fb.dx * DOCK.gap, ty = fb.y + fb.dy * DOCK.gap, ex = tx - fa.x, ey = ty - fa.y, el = Math.hypot(ex, ey);
    me.w = Math.max(-DOCK.w, Math.min(DOCK.w, aErr * 2));
    var sp = Math.min(DOCK.v, el * 1.2); me.vx = D.b.vx + (el > 1e-4 ? ex / el * sp : 0); me.vy = D.b.vy + (el > 1e-4 ? ey / el * sp : 0);
    if (!D.hiss && el < 0.45) { D.hiss = true; hissSound(); dockSteam(fb, D.b); }
    if (el < 0.03 && Math.abs(aErr) < 0.004) {
      me.a += aErr; fa = dockFace(me, D.da); me.x += tx - fa.x; me.y += ty - fa.y;
      me.vx = D.b.vx; me.vy = D.b.vy; me.w = 0; D.done = true; me.static = !!D.b.static; floatTxt(t("docked"), "127,211,164");
    }
  }
  function dockSteam(fb, ob) {
    for (var i = 0; i < 26; i++) {
      var sd = (Math.random() - 0.5) * CELL_M * 2.4, px = fb.x - fb.dy * sd, py = fb.y + fb.dx * sd, side = Math.random() < 0.5 ? -1 : 1, v = 2 + Math.random() * 4;
      FL.parts.push({ x: px, y: py, vx: ob.vx - fb.dy * side * v + fb.dx * (Math.random() - 0.5), vy: ob.vy + fb.dx * side * v + fb.dy * (Math.random() - 0.5), life: -Math.random() * 0.4, max: 1.1 + Math.random() * 0.6, k: "steam", sz: 0.5 + Math.random() * 0.6 });
    }
  }
  function hissSound() {
    audioInit(); if (!AC || AC.state !== "running") return;
    try {
      var t0 = AC.currentTime, len = 0.9, buf = AC.createBuffer(1, Math.floor(AC.sampleRate * len), AC.sampleRate), dd = buf.getChannelData(0);
      for (var i = 0; i < dd.length; i++) dd[i] = Math.random() * 2 - 1;
      var src = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
      src.buffer = buf; f.type = "bandpass"; f.frequency.value = 3800; f.Q.value = 0.9;
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.05, t0 + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t0 + len);
      src.connect(f); f.connect(g); g.connect(AC.destination); src.start(t0); src.stop(t0 + len);
    } catch (e) {}
  }
  // Andock-Hinweis am Dock, solange ein passendes Gegenstück in Reichweite ist
  function drawDockHint(c, ppm) {
    if (!FL.seated) return;
    var pr = FL.dock ? null : findDockPair(); FL.dockReady = !!pr;
    var txt = FL.dock ? (FL.dock.done ? t("dockedHint") : t("docking")) : pr ? t("dockHint") : ""; if (!txt) return;
    var D = FL.dock || pr, fa = dockFace(FL.me, D.da);
    c.save(); c.font = "600 " + (12 / ppm) + "px " + FONTS(); c.textAlign = "center"; c.textBaseline = "middle";
    var tw = c.measureText(txt).width; c.fillStyle = "rgba(14,19,28,.75)"; c.fillRect(fa.x - tw / 2 - 6 / ppm, fa.y - 9 / ppm - 20 / ppm, tw + 12 / ppm, 18 / ppm);
    c.fillStyle = FL.dock && FL.dock.done ? "#9FE3BD" : "#F2C14E"; c.fillText(txt, fa.x, fa.y - 20 / ppm); c.restore();
  }
