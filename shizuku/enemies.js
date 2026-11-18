/* Shizuku – enemies.js
   Gegner. Jede Art hat Werte (Leben, Tempo, Schaden, Reichweite, Zeiten) und ein Aussehen.
   KI des Ronin (Standard-Schwertgegner):
   erscheinen (Tintenrauch) → annähern → umkreisen → ausholen (Klinge blitzt auf, das ist das Signal
   zum Parieren) → Hieb mit Ausfallschritt → erholen. Wird er getroffen, taumelt er.
   Wird sein Hieb pariert, taumelt er lange: Zeit für den Gegenschlag. */
(function () {
  var SZ = window.SZ, L2 = SZ.L2, m = SZ.m, TAU = Math.PI * 2;

  SZ.ENEMIES = {
    ronin: {
      name: function () { return L2("Ronin", "Ronin"); },
      look: "ronin", hp: 60, speed: 54, dmg: 14, reach: 19, arc: 120,
      windup: 0.52, swing: 0.15, rec: 0.55, cooldown: [0.7, 1.6],
      stagger: 0.28, parryStagger: 1.0, radius: 4,
      sword: { blade: "#C4C8CC", edge: "#6E747C", shine: "#F4F6F8", guard: "#5A4A30", grip: "#2A1E1A", wrap: "#4A3A2A" }, blade: 13, lunge: 210
    },
    // Heavy Ronin: gepanzert, 30 % größer, kein Rückstoß und nicht zu betäuben – nur eine Parade bringt ihn ins Taumeln.
    // In der Gruppe lässt er sich Zeit, allein wird er aggressiv. Auf Kies, Sand und Wasser langsamer.
    heavy: {
      name: function () { return L2("Heavy Ronin", "Heavy Ronin"); },
      look: "heavy", scale: 1.3, hp: 160, speed: 44, dmg: 24, reach: 25, arc: 150,
      windup: 0.78, swing: 0.2, rec: 0.8, cooldown: [1.1, 2.1],
      stagger: 0, parryStagger: 1.3, radius: 6, armored: true,
      slowOn: { g: 0.6, a: 0.6, w: 0.5 },
      sword: { blade: "#B8BEC4", edge: "#5E646C", shine: "#F0F2F4", guard: "#8A2A20", grip: "#141012", wrap: "#6A1A15" }, blade: 19, lunge: 170
    },
    // Yumi-heishi: Bogenschütze. Hält sich in der zweiten Reihe, schießt aus der Distanz (Pfeile lassen sich
    // mit Nahkampfwaffen blocken und parieren). Als letzter Überlebender flieht er, wenn man ihm zu nahe kommt.
    yumi: {
      name: function () { return L2("Yumi-heishi", "Yumi-heishi"); },
      look: "yumi", hp: 40, speed: 52, dmg: 12, ranged: true,
      draw: 0.95, quick: 0.55, arrowSpeed: 265, keep: [100, 165], cooldown: [1.3, 2.3],
      stagger: 0.3, parryStagger: 0.6, radius: 4
    },
    // Monkey Lord (Boss, Welle 10): 40 % größer, kämpft mit einem Stab, doppelt so viel Leben wie ein Heavy Ronin.
    // Drei Angriffsmuster: Schlagkombo (3–4 Hiebe), Sprung mit Stab-Einschlag (Druckwelle), Wirbel (Stab kreist um ihn).
    // Kann dashen (Lücke schließen, ausweichen). Blockt jeden Angriff, der genauso ist wie der vorige.
    // Wie der Heavy kein Rückstoß und nicht zu betäuben, nur eine Parade bringt ihn ins Taumeln.
    monkey: {
      name: function () { return L2("Monkey Lord", "Monkey Lord"); },
      look: "monkey", scale: 1.4, hp: 320, speed: 62, dmg: 13, reach: 25, arc: 150, radius: 7, armored: true, boss: true,
      stagger: 0, parryStagger: 1.05, cooldown: [0.9, 1.7],
      combo: { first: 0.46, next: 0.17, swing: 0.14, lunge: 165, rec: 0.7 },
      slam: { crouch: 0.45, air: 0.6, r: 36, dmg: 20, rec: 0.95, height: 30 },
      sweep: { windup: 0.55, spin: 0.5, reach: 31, dmg: 16, rec: 0.65 },
      dash: { time: 0.22, speed: 280, cd: 1.6 },
      staff: { wood: "#6B4424", hi: "#9A6A3A", dark: "#3A2414", cap: "#C9A445", capHi: "#EBD07C" }
    }
  };

  function Enemy(world, type, x, y, opt) {
    var D = SZ.ENEMIES[type];
    this.world = world; this.type = type; this.D = D;
    this.x = x; this.y = y; this.vx = 0; this.vy = 0;
    this.hp = this.hpMax = Math.round(D.hp * ((opt && opt.hpMul) || 1));
    this.face = Math.PI / 2; this.dir = 2;
    this.state = "spawn"; this.st = 0; this.cd = 0.6 + Math.random() * 0.6;
    this.strafe = Math.random() < 0.5 ? 1 : -1;
    this.walkPh = Math.random(); this.idleT = 0; this.flash = 0; this.hpT = 0;
    this.dead = false; this.deadT = 0; this.gone = false;
    this.trail = []; this.atkAng = 0; this.hitDone = false;
    this.sc = D.scale || 1;
    world.parts.ink(x, y - 8 * this.sc, D.boss ? 60 : D.armored ? 30 : 18); world.parts.swirl(x, y, 8 * this.sc, 1, 0.7);
    if (D.boss) {
      this.z = 0; this.gKey = null; this.gInst = null; this.cryCd = 0; this.dashCd = 1; this.lastPat = null; this.phase2 = false;
      world.parts.swirl(x, y, 16, -1, 1); world.parts.ring(x, y, 30, 0.8, "rgba(230,160,120,"); world.shake = Math.max(world.shake, 3);
      SZ.audio.play("monkey_roar", { x: x });
    } else SZ.audio.play(D.armored ? "spawn_heavy" : "spawn", { x: x });
  }
  var E = Enemy.prototype;

  E.go = function (s) { this.state = s; this.st = 0; };

  E.update = function (dt, pl) {
    var D = this.D, w = this.world, a = w.arena;
    this.st += dt; this.idleT += dt;
    if (this.flash > 0) this.flash -= dt * 5;
    if (this.hpT > 0) this.hpT -= dt;
    if (this.falling) { this.updateFall(dt); return; }
    if (this.dead) {
      this.deadT += dt; if (this.deadT > 1.8) this.gone = true; this.vx *= 0.9; this.vy *= 0.9;
      var np0 = a.move(this.x, this.y, this.vx * dt, this.vy * dt, D.radius, w.solids, Math.hypot(this.vx, this.vy) > 30); this.x = np0.x; this.y = np0.y;
      if (a.tilePx(this.x, this.y) === "v") this.startFall();
      return;
    }
    if (this.state === "spawn") { if (this.st > (D.boss ? 1.2 : 0.65)) this.go("approach"); return; }
    // Von Wasser gefesselt: kann sich nicht bewegen und nicht angreifen
    if (this.held > 0) {
      this.held -= dt;
      if (this.state !== "held") this.go("held");
      var hk = Math.max(0, 1 - dt * 14); this.vx *= hk; this.vy *= hk; this.moving = false;
      var nph = a.move(this.x, this.y, this.vx * dt, this.vy * dt, D.radius, w.solids); this.x = nph.x; this.y = nph.y;
      if (this.held <= 0) { this.held = 0; this.go("approach"); }
      return;
    }

    var dx = pl.x - this.x, dy = pl.y - this.y, dist = Math.sqrt(dx * dx + dy * dy), ang = Math.atan2(dy, dx);
    var plAlive = !pl.dead;
    var self0 = this, others = w.enemies.filter(function (o) { return o !== self0 && !o.dead; }).length;
    var aggro = D.armored && others === 0;          // allein: aggressiver
    this.cd -= dt * (aggro ? 1.8 : 1);
    var tx = 0, ty = 0, turn = 8, spdMul = aggro ? 1.3 : 1;
    if (D.ranged) { var ar = this.archer(dt, pl, dist, ang, others); tx = ar[0]; ty = ar[1]; turn = ar[2]; }
    else if (D.boss) { var br = this.monkey(dt, pl, dist, ang); if (br === null) return; tx = br[0]; ty = br[1]; turn = br[2]; }
    else switch (this.state) {
      case "approach":
        if (!plAlive) { this.go("idle"); break; }
        var mv = w.steer(this.x, this.y, pl.x, pl.y, this.forceFlow > 0);
        tx = Math.cos(mv) * D.speed * spdMul; ty = Math.sin(mv) * D.speed * spdMul;
        // Heavy in der Gruppe: lässt sich manchmal Zeit
        if (D.armored && others > 0 && dist < 110 && Math.random() < dt * 0.45) { this.holdT = 1 + Math.random() * 1.6; this.go("hold"); break; }
        if (dist < D.reach + (this.cd <= 0 ? 6 : 12)) this.go(this.cd <= 0 ? "windup" : "strafe");
        break;
      case "strafe":
        if (!plAlive) { this.go("idle"); break; }
        if (!w.los(this.x, this.y, pl.x, pl.y)) { this.go("approach"); break; }
        // Seitwärts nur, wo Platz ist; sonst Richtung wechseln
        var px = -Math.sin(ang) * this.strafe, py = Math.cos(ang) * this.strafe;
        if (w.blockedAt(this.x + px * 10, this.y + py * 10)) { this.strafe *= -1; px = -px; py = -py; if (w.blockedAt(this.x + px * 10, this.y + py * 10)) { px = py = 0; } }
        var keep = (dist - (D.reach + 11)) * 2.2;
        tx = Math.cos(ang) * keep + px * D.speed * 0.6;
        ty = Math.sin(ang) * keep + py * D.speed * 0.6;
        if (Math.random() < dt * 0.4) this.strafe *= -1;
        if (this.cd <= 0 && dist < D.reach + 13) this.go("windup");
        else if (dist > D.reach + 34) this.go("approach");
        break;
      case "hold":
        turn = 4;
        tx = -Math.sin(ang) * this.strafe * D.speed * 0.3; ty = Math.cos(ang) * this.strafe * D.speed * 0.3;
        if (dist < D.reach + 8) { tx -= Math.cos(ang) * 20; ty -= Math.sin(ang) * 20; }
        if (this.st > this.holdT || others === 0 || !plAlive) this.go("approach");
        break;
      case "windup":
        turn = 3.2;
        var close = dist > D.reach - 2 ? 34 : -8;
        tx = Math.cos(ang) * close; ty = Math.sin(ang) * close;
        if (this.st > D.windup - 0.14 && this.st - dt <= D.windup - 0.14) {  w.parts.spark(this.x + Math.cos(this.face) * 3, this.y - 22, 0, 4, "#FFFFFF"); }
        if (this.st >= D.windup * (aggro ? 0.82 : 1)) { this.atkAng = this.face; this.hitDone = false; this.trail = []; this.go("swing"); SZ.audio.play("swing", { rate: 0.86, x: this.x }); }
        break;
      case "swing":
        turn = 0;
        var p = this.st / D.swing, lunge = (D.lunge || 210) * Math.max(0, 1 - p);
        tx = Math.cos(this.atkAng) * lunge; ty = Math.sin(this.atkAng) * lunge;
        if (!this.hitDone && p >= 0.2) {
          var hd = m.dist(this.x, this.y, pl.x, pl.y), ha = Math.atan2(pl.y - this.y, pl.x - this.x);
          if (hd <= D.reach + 5 && Math.abs(m.angDiff(this.atkAng, ha)) < D.arc * Math.PI / 360) {
            this.hitDone = true;
            var res = pl.hurt(D.dmg, this.x, this.y, this);
            if (res === "parry") {
              if (SZ.perk.n(pl, "hoeflichkeit") && this.type === "ronin") { this.hurt(9999, ha, 1.2, "sword"); break; }   // Höflichkeit: Parade tötet Ronin
              this.stagger(D.parryStagger, ha + Math.PI, 1.4); break;
            }
            if (res === "block" && SZ.perk.n(pl, "standhaftigkeit")) this.hurt(D.dmg * 0.3 * SZ.perk.n(pl, "standhaftigkeit"), ha, 0.4, "thorns");   // Standhaftigkeit
          }
        }
        if (this.st >= D.swing) this.go("recover");
        break;
      case "recover":
        turn = 2;
        if (this.st >= D.rec) { this.cd = m.lerp(D.cooldown[0], D.cooldown[1], Math.random()); this.go(Math.random() < 0.6 ? "strafe" : "approach"); }
        break;
      case "stagger":
        turn = 0;
        if (this.st >= this.stagT) this.go("approach");
        break;
      case "idle":
        if (plAlive) this.go("approach");
        break;
    }
    if (turn) this.face += m.clamp(m.angDiff(this.face, ang), -turn * dt, turn * dt);
    this.dir = m.dir8(this.face);

    // Abstand zu anderen Gegnern
    var self = this;
    w.enemies.forEach(function (o) {
      if (o === self || o.dead) return;
      var ex = self.x - o.x, ey = self.y - o.y, ed = Math.sqrt(ex * ex + ey * ey);
      var minD = 10 + D.radius + o.D.radius;
      if (ed < minD && ed > 0.01) { tx += ex / ed * 40; ty += ey / ed * 40; }
    });
    if (!pl.dead && !pl.sphere && dist < 7 + D.radius && dist > 0.01) { tx -= dx / dist * 70; ty -= dy / dist * 70; }   // Luftkugel: der Samurai läuft durch
    var snap = this.state === "stagger" ? 5 : (this.state === "swing" || this.state === "dash") ? 40 : this.state === "spin" ? 20 : 12;
    var spd = a.speedAt(this.x, this.y), tileC = a.tilePx(this.x, this.y);
    if (D.slowOn && D.slowOn[tileC]) spd = D.slowOn[tileC];
    if (this.slowT > 0) { this.slowT -= dt; tx *= SZ.WATER_ART.beam.slow; ty *= SZ.WATER_ART.beam.slow; }   // vom Wasserstrahl gebremst
    this.vx += (tx * spd - this.vx) * Math.min(1, dt * snap); this.vy += (ty * spd - this.vy) * Math.min(1, dt * snap);
    // Rückstoß ist erzwungene Bewegung: wer weit genug geschleudert wird, kann über die Kante stürzen
    var forced = (this.state === "stagger" || this.knockT > 0) && Math.hypot(this.vx, this.vy) > 45;
    if (this.knockT > 0) this.knockT -= dt;
    var np = a.move(this.x, this.y, this.vx * dt, this.vy * dt, D.radius, w.solids, forced);
    var moved = m.dist(this.x, this.y, np.x, np.y);
    this.x = np.x; this.y = np.y;
    if (!this.z && a.tilePx(this.x, this.y) === "v") { this.startFall(); return; }
    this.moving = moved > 0.25 && (this.state === "approach" || this.state === "strafe" || this.state === "hold" || this.state === "position" || this.state === "flee");
    if (D.boss && this.state === "dash" && Math.floor(this.st / 0.045) !== Math.floor((this.st - dt) / 0.045)) w.parts.ghost(this.sprite(), this.x, this.y);
    // Festgefahren? Dann eine Weile strikt der Wegkarte folgen
    if (this.forceFlow > 0) this.forceFlow -= dt;
    var want = Math.sqrt(tx * tx + ty * ty) * dt;
    if ((this.state === "approach" || this.state === "strafe" || this.state === "position" || this.state === "flee") && want > 0.3 && moved < want * 0.25) this.stuckT = (this.stuckT || 0) + dt; else this.stuckT = 0;
    if (this.stuckT > 0.35) { this.stuckT = 0; this.forceFlow = 1.6; this.strafe *= -1; if (this.state === "strafe") this.go("approach"); }
    if (this.moving) this.walkPh += moved / 22;
  };

  // ---------- Absturz vom Inselrand ----------
  // Der Gegner fällt in die Tiefe (wird hinter der Insel gezeichnet, siehe world.js) und gilt als besiegt.
  E.startFall = function () {
    if (this.falling) return;
    this.falling = { t: 0, vx: this.vx * 0.6, vy: this.vy * 0.6, spin: (Math.random() - 0.5) * 6 };
    if (!this.dead) { this.hp = 0; this.dead = true; this.deadT = 0; this.fell = true; }
    this.held = 0; this.go("stagger");
    SZ.audio.play("hurt", { x: this.x, rate: 0.85, vol: 0.7 });
  };
  E.updateFall = function (dt) {
    var f = this.falling; f.t += dt;
    this.x += f.vx * dt; this.y += f.vy * dt; f.vx *= 0.98; f.vy *= 0.98;
    if (f.t > 1.6) { this.gone = true; this.deadT = 99; }
  };
  // ---------- Bogenschützen-KI ----------
  // position: Platz in der zweiten Reihe suchen (hinter den Verbündeten, vom Spieler aus gesehen)
  // aim: stehen, spannen (Pfeilspitze blitzt kurz vor dem Schuss), schießen; flee: als Letzter vor dem Spieler weglaufen
  // Gibt [tx, ty, turn] zurück.
  // Freie Schusslinie: nur Mauern und Objekte, die höher als die Flugbahn sind, halten einen Pfeil auf
  // (über Wasser und Abgrund fliegt er hinweg)
  function clearShot(w, x0, y0, x1, y1, self) {
    var d = m.dist(x0, y0, x1, y1), n = Math.ceil(d / 4);
    // Verbündete in der Schusslinie (Pfeile machen Teamschaden)
    if (self) for (var q = 0; q < w.enemies.length; q++) {
      var o = w.enemies[q]; if (o === self || o.dead || o.falling) continue;
      var ux = x1 - x0, uy = y1 - y0, tt = ((o.x - x0) * ux + (o.y - y0) * uy) / (d * d);
      if (tt > 0.05 && tt < 0.95 && m.dist(o.x, o.y, x0 + ux * tt, y0 + uy * tt) < o.D.radius + 5) return false;
    }
    for (var i = 1; i < n; i++) {
      var t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
      if (w.arena.tilePx(x, y) === "#") return false;
      for (var k = 0; k < w.solids.length; k++) {
        var c = w.solids[k], dd = SZ.OBJECTS[c[3].t];
        if (dd.h * 0.9 > 15 && Math.abs(x - c[0]) < c[2] && Math.abs(y - c[1]) < c[2] * 0.8 + 1) return false;
      }
    }
    return true;
  }
  function gd0(e) { return e.goal ? m.dist(e.x, e.y, e.goal[0], e.goal[1]) : 99; }
  E.archer = function (dt, pl, dist, ang, others) {
    var D = this.D, w = this.world, self = this, tx = 0, ty = 0, turn = 6, last = others === 0;
    var los = !pl.dead && clearShot(w, this.x, this.y, pl.x, pl.y, this);
    this.goalT = (this.goalT || 0) - dt;
    if (pl.dead) { if (this.state !== "idle") this.go("idle"); return [0, 0, 4]; }
    if (this.state === "approach" || this.state === "idle") this.go(last ? "flee" : "position");
    switch (this.state) {
      case "position": case "flee": {
        if (!los && this.cd <= 0 && gd0(this) < 8 && this.goalT > 0.3) this.goalT = 0.3;
        if (this.goalT <= 0 || !this.goal) { this.goal = this.pickSpot(pl, last); this.goalT = 0.8 + Math.random() * 0.6; }
        var g = this.goal, gd = m.dist(this.x, this.y, g[0], g[1]), sp = D.speed * (this.state === "flee" ? 1.3 : 1);
        if (gd > 6) {
          var mv = w.steer(this.x, this.y, g[0], g[1], this.forceFlow > 0);
          // Flucht: nie auf den Spieler zu laufen, nah dran direkt weg (oder seitlich, wenn hinten zu ist)
          if (this.state === "flee" && dist < 75 && Math.cos(mv - ang) > 0.1) {
            mv = ang + Math.PI;
            if (w.blockedAt(this.x + Math.cos(mv) * 12, this.y + Math.sin(mv) * 12) || !w.arena.walkable(this.x + Math.cos(mv) * 12, this.y + Math.sin(mv) * 12, 5)) mv = ang + Math.PI / 2 * this.strafe;
          }
          tx = Math.cos(mv) * sp; ty = Math.sin(mv) * sp;
        }
        else { tx = -Math.sin(ang) * this.strafe * sp * 0.25; ty = Math.cos(ang) * this.strafe * sp * 0.25; }
        if (this.state === "position" && last) this.go("flee");
        if (this.state === "flee" && !last) this.go("position");
        var tooClose = dist < (last ? 95 : 60);
        // schießen, wenn frei und nicht bedrängt (bedrängt: hastiger Schuss nur selten)
        var cornered = tooClose && dist < 40 && this.stuckT > 0.2;
        if (this.cd <= 0 && los && dist < 250 && (!tooClose || cornered || (dist < 34 && Math.random() < dt * 1.5))) { this.quickShot = tooClose; this.go("aim"); SZ.audio.play("bow_draw", { x: this.x, vol: 0.55, rate: this.quickShot ? 1.5 : 1.1 }); }
        break;
      }
      case "aim": {
        turn = 7;
        var full = this.quickShot ? D.quick : D.draw;
        if (!los && this.st < full - 0.2) { this.go("position"); this.cd = 0.3; break; }
        if (!this.quickShot && dist < 28 && !last) { this.go("position"); this.cd = 0.4; break; }   // zu nah: lieber Abstand gewinnen
        if (this.st >= full - 0.16 && this.st - dt < full - 0.16) w.parts.spark(this.x + Math.cos(this.face) * 6, this.y - 18, 0, 4, "#FFFFFF");
        if (this.st >= full) { this.shoot(pl); this.go("recover"); }
        break;
      }
      case "recover":
        turn = 3;
        if (this.st >= 0.35) { this.cd = m.lerp(D.cooldown[0], D.cooldown[1], Math.random()) * (last ? 0.8 : 1); this.goal = null; this.go(last ? "flee" : "position"); }
        break;
      case "stagger":
        turn = 0;
        if (this.st >= this.stagT) this.go(last ? "flee" : "position");
        break;
    }
    return [tx, ty, turn];
  };
  // Guten Platz suchen: zweite Reihe bzw. auf der Flucht möglichst weit weg
  E.pickSpot = function (pl, last) {
    var w = this.world, a = w.arena, self = this, D = this.D, best = [this.x, this.y], bs = -1e9;
    var allies = w.enemies.filter(function (o) { return o !== self && !o.dead && !o.D.ranged; });
    var cx = 0, cy = 0; allies.forEach(function (o) { cx += o.x; cy += o.y; });
    var hasLine = allies.length > 0; if (hasLine) { cx /= allies.length; cy /= allies.length; }
    var F = w.flowTo(this.x, this.y);
    var mates = w.enemies.filter(function (o) { return o !== self && !o.dead && o.D.ranged; }).map(function (o) { return o.goal || [o.x, o.y]; });
    for (var i = 0; i < 26; i++) {
      var x = 20 + Math.random() * (SZ.W - 40), y = 30 + Math.random() * (SZ.H - 56);
      if (!a.walkable(x, y, 6) || w.blockedAt(x, y) || a.tilePx(x, y) === "w") continue;
      var fd = F.dist[Math.floor(y / 8) * (SZ.W / 8) + Math.floor(x / 8)]; if (fd < 0) continue;
      var dp = m.dist(x, y, pl.x, pl.y), dm = m.dist(x, y, this.x, this.y), sc;
      if (last) {
        sc = dp * 1.2 - dm * 0.35 - Math.max(0, 40 - Math.min(x, SZ.W - x, y, SZ.H - y)) * 2;   // weit weg, nicht in die Ecke drängen
        if (dp < m.dist(this.x, this.y, pl.x, pl.y) - 10 && dm > 40) sc -= 200;           // nicht am Spieler vorbei
      } else {
        var ideal = (D.keep[0] + D.keep[1]) / 2;
        if (hasLine) {
          // zweite Reihe: hinter den Verbündeten, vom Spieler aus gesehen
          var ux = cx - pl.x, uy = cy - pl.y, ul = Math.hypot(ux, uy) || 1, bx = cx + ux / ul * 45, by = cy + uy / ul * 45;
          ideal = m.clamp(ul + 45, D.keep[0], 230);
          sc = -m.dist(x, y, bx, by) * 0.9;
        } else sc = 0;
        sc -= Math.abs(dp - ideal) * 1.1 + dm * 0.25;
      }
      mates.forEach(function (g) { var md = m.dist(x, y, g[0], g[1]); if (md < 45) sc -= (45 - md) * 3; });   // Schützen verteilen sich
      if (clearShot(w, x, y, pl.x, pl.y, this)) sc += last ? 30 : 140;   // freie Schusslinie ist das Wichtigste
      if (sc > bs) { bs = sc; best = [x, y]; }
    }
    return best;
  };
  // Pfeil abschießen, mit leichtem Vorhalt
  E.shoot = function (pl) {
    var D = this.D, w = this.world, sp = D.arrowSpeed * (this.quickShot ? 0.85 : 1);
    var tt = m.dist(this.x, this.y, pl.x, pl.y) / sp, lx = pl.x + (pl.vx || 0) * tt * 0.4, ly = pl.y + (pl.vy || 0) * tt * 0.4;
    var a = Math.atan2(ly - this.y, lx - this.x) + (Math.random() - 0.5) * (this.quickShot ? 0.16 : 0.06);
    this.face = a;
    w.addArrow({ hostile: true, from: this, x: this.x + Math.cos(a) * 6, y: this.y + Math.sin(a) * 4, z: 15, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, ang: a,
                 dmg: D.dmg * (this.quickShot ? 0.75 : 1), power: 0.3, drop: 0, dist: 0, lastFx: 0, hit: [], trail: [] });
    SZ.audio.play("bow", { x: this.x, vol: 0.8, rate: 1.06 });
  };


  // ---------- Monkey Lord ----------
  // Zustände: approach, strafe, windup → swing (Kombo), sweepup → spin (Wirbel), crouch → leap → recover (Sprung),
  // dash, block, recover, stagger. Gibt [tx, ty, turn] zurück, null = Bewegung schon erledigt (Sprung).
  function rr(a, b) { return a + Math.random() * (b - a); }
  E.cry = function (force, rate) {
    if (!force && this.cryCd > 0) return;
    this.cryCd = 2.6; SZ.audio.play("monkey_cry", { x: this.x, rate: rate || 1 });
  };
  E.startDash = function (a, then) {
    this.dashAng = a; this.after = then || null; this.dashCd = this.D.dash.cd * (this.phase2 ? 0.7 : 1); this.go("dash");
    SZ.audio.play("dash", { x: this.x, rate: 0.8 });
    this.world.parts.dust(this.x, this.y, 4, "#8A7A5A");
  };
  // Muster wählen: nie zweimal dasselbe hintereinander
  E.pickPattern = function (dist) {
    var opts = [];
    if (dist < 75) opts.push(["combo", 3]);
    if (dist < 55) opts.push(["sweep", 2]);
    if (dist > 38 && dist < 150) opts.push(["slam", 2]);
    var self = this, f = opts.filter(function (o) { return o[0] !== self.lastPat; });
    if (f.length) opts = f;
    if (!opts.length) return null;
    var sum = 0, i; for (i = 0; i < opts.length; i++) sum += opts[i][1];
    var r = Math.random() * sum; for (i = 0; i < opts.length; i++) { r -= opts[i][1]; if (r <= 0) return opts[i][0]; }
    return opts[0][0];
  };
  E.beginPattern = function (pat, pl) {
    var D = this.D, k = this.phase2 ? 0.85 : 1;
    this.pat = pat; this.lastPat = pat;
    if (pat === "combo") { this.hitN = 0; this.hitMax = Math.random() < 0.5 ? 3 : 4; this.side = 1; this.wu = D.combo.first * k; this.go("windup"); if (Math.random() < 0.5) this.cry(); }
    else if (pat === "sweep") { this.wu = D.sweep.windup * k; this.spinDir = Math.random() < 0.5 ? 1 : -1; this.go("sweepup"); }
    else { this.wu = D.slam.crouch * k; this.go("crouch"); this.cry(true); }
  };
  E.monkey = function (dt, pl, dist, ang) {
    var D = this.D, w = this.world, a = w.arena, tx = 0, ty = 0, turn = 8, plAlive = !pl.dead, self = this;
    if (this.cryCd > 0) this.cryCd -= dt;
    if (this.dashCd > 0) this.dashCd -= dt;
    if (!this.phase2 && this.hp < this.hpMax * 0.5) {   // zweite Phase: schneller und wütender
      this.phase2 = true; this.cry(true, 0.9); w.shake = Math.max(w.shake, 3); w.parts.ring(this.x, this.y, 28, 0.6, "rgba(230,120,90,");
    }
    var spd = D.speed * (this.phase2 ? 1.15 : 1);
    switch (this.state) {
      case "approach": case "idle":
        if (!plAlive) { this.state = "idle"; break; }
        if (this.state === "idle") this.go("approach");
        var mv = w.steer(this.x, this.y, pl.x, pl.y, this.forceFlow > 0);
        tx = Math.cos(mv) * spd; ty = Math.sin(mv) * spd;
        if (this.cd <= 0 && dist > 80 && dist < 170 && this.dashCd <= 0 && w.los(this.x, this.y, pl.x, pl.y) && Math.random() < 0.5) { this.startDash(ang, "combo"); break; }   // Dash und direkt Kombo
        if (this.cd <= 0) {
          var pat = this.pickPattern(dist);
          if (pat === "slam" || (pat && dist < (pat === "sweep" ? D.sweep.reach + 4 : D.reach + 14))) { this.beginPattern(pat, pl); break; }
        }
        // Lücke schließen: Dash zum Spieler, danach direkt angreifen
        if (dist > 80 && dist < 170 && this.dashCd <= 0 && this.cd <= 0.4 && w.los(this.x, this.y, pl.x, pl.y) && Math.random() < dt * 2.5) { this.startDash(ang, "combo"); break; }
        if (this.cd > 0 && dist < 48) this.go("strafe");
        break;
      case "strafe":
        if (!plAlive) { this.go("idle"); break; }
        var px = -Math.sin(ang) * this.strafe, py = Math.cos(ang) * this.strafe;
        if (w.blockedAt(this.x + px * 12, this.y + py * 12)) { this.strafe *= -1; px = -px; py = -py; }
        var keep = (dist - 40) * 2.2;
        tx = Math.cos(ang) * keep + px * spd * 0.7; ty = Math.sin(ang) * keep + py * spd * 0.7;
        if (Math.random() < dt * 0.5) this.strafe *= -1;
        if (this.cd <= 0 || dist > 70) this.go("approach");
        break;
      case "dash": {
        turn = 0;
        var Dd = D.dash, k = 1 - this.st / Dd.time;
        tx = Math.cos(this.dashAng) * Dd.speed * (0.4 + k * 0.6); ty = Math.sin(this.dashAng) * Dd.speed * (0.4 + k * 0.6);
        if (this.st >= Dd.time) {
          var then = this.after; this.after = null;
          if (then && plAlive && dist < 70) this.beginPattern(then, pl);
          else this.go("approach");
        }
        break;
      }
      // Schlagkombo
      case "windup":
        turn = 4;
        var close = dist > D.reach - 2 ? 40 : -6;
        tx = Math.cos(ang) * close; ty = Math.sin(ang) * close;
        if (this.wu > 0.25 && this.st > this.wu - 0.14 && this.st - dt <= this.wu - 0.14) w.parts.spark(this.x + Math.cos(this.face) * 4, this.y - 30, 0, 5, "#FFFFFF");
        if (this.st >= this.wu) { this.atkAng = this.face; this.hitDone = false; this.trail = []; this.go("swing"); SZ.audio.play("swing", { rate: 0.78, x: this.x }); }
        break;
      case "swing": {
        turn = 0;
        var C = D.combo, q = this.st / C.swing, lunge = C.lunge * Math.max(0, 1 - q);
        tx = Math.cos(this.atkAng) * lunge; ty = Math.sin(this.atkAng) * lunge;
        if (!this.hitDone && q >= 0.25) {
          var hd = m.dist(this.x, this.y, pl.x, pl.y), ha = Math.atan2(pl.y - this.y, pl.x - this.x);
          if (hd <= D.reach + 5 && Math.abs(m.angDiff(this.atkAng, ha)) < D.arc * Math.PI / 360) {
            this.hitDone = true;
            var res = pl.hurt(D.dmg * (this.hitN === this.hitMax - 1 ? 1.4 : 1), this.x, this.y, this);   // letzter Hieb schlägt härter
            if (res === "parry") { this.stagger(D.parryStagger, ha + Math.PI, 0.9); break; }
            if (res === "block" && SZ.perk.n(pl, "standhaftigkeit")) this.hurt(D.dmg * 0.3 * SZ.perk.n(pl, "standhaftigkeit"), ha, 0.4, "thorns");
          }
        }
        if (this.st >= C.swing) {
          this.hitN++; this.side = -this.side;
          if (this.hitN < this.hitMax && plAlive) { this.wu = C.next * (this.phase2 ? 0.85 : 1); this.go("windup"); }
          else { this.recT = C.rec; this.go("recover"); }
        }
        break;
      }
      // Wirbel: Stab kreist anderthalb Mal um ihn herum
      case "sweepup":
        turn = 5;
        if (this.st > this.wu - 0.16 && this.st - dt <= this.wu - 0.16) w.parts.spark(this.x - Math.cos(this.face) * 8, this.y - 16, 0, 5, "#FFFFFF");
        if (this.st >= this.wu) { this.atkAng = this.face; this.hitDone = false; this.trail = []; this.go("spin"); SZ.audio.play("swing_e", { rate: 0.75, x: this.x }); }
        break;
      case "spin": {
        turn = 0;
        var Sw = D.sweep, drift = dist > 14 ? 45 : 0;
        tx = Math.cos(ang) * drift; ty = Math.sin(ang) * drift;
        if (Math.floor(this.st / 0.12) !== Math.floor((this.st - dt) / 0.12)) { SZ.audio.play("swing", { rate: 0.7, x: this.x, vol: 0.7 }); w.push(this.x, this.y, 36, 3, 0.4, { spin: this.spinDir }); }
        if (!this.hitDone && dist < Sw.reach + 5 && this.st > 0.05) {
          this.hitDone = true;
          var r2 = pl.hurt(Sw.dmg, this.x, this.y, this);
          if (r2 === "parry") { this.stagger(D.parryStagger, ang + Math.PI, 0.9); break; }
        }
        if (this.st >= Sw.spin) { this.recT = Sw.rec; this.go("recover"); }
        break;
      }
      // Sprung mit Einschlag
      case "crouch":
        turn = 6;
        if (this.st >= this.wu) {
          var tt = D.slam.air, lx = pl.x + (pl.vx || 0) * tt * 0.35, ly = pl.y + (pl.vy || 0) * tt * 0.35;
          if (!a.walkable(lx, ly, 6) || w.blockedAt(lx, ly)) { lx = pl.x; ly = pl.y; }
          if (!a.walkable(lx, ly, 6)) { lx = this.x; ly = this.y; }
          this.leap = { x0: this.x, y0: this.y, x1: lx, y1: ly };
          this.go("leap"); SZ.audio.play("dash", { x: this.x, rate: 0.6, vol: 0.9 });
          w.parts.dust(this.x, this.y, 8, "#8A7A5A");
        }
        break;
      case "leap": {
        var L = this.leap, u = Math.min(1, this.st / D.slam.air), e2 = m.smooth(u);
        this.x = L.x0 + (L.x1 - L.x0) * e2; this.y = L.y0 + (L.y1 - L.y0) * e2; this.vx = this.vy = 0;
        this.z = Math.sin(u * Math.PI) * D.slam.height;
        this.face = Math.atan2(pl.y - this.y, pl.x - this.x); this.dir = m.dir8(this.face);
        if (u >= 1) { this.z = 0; this.land(pl); }
        return null;
      }
      case "block":
        turn = 14;
        if (this.st >= 0.3) { this.cd = Math.min(this.cd, 0.25); this.go(dist < 50 ? "strafe" : "approach"); }
        break;
      case "recover":
        turn = 2;
        if (this.st >= this.recT) {
          this.cd = rr(D.cooldown[0], D.cooldown[1]) * (this.phase2 ? 0.65 : 1);
          this.go(Math.random() < 0.5 ? "strafe" : "approach");
        }
        break;
      case "stagger":
        turn = 0;
        if (this.st >= this.stagT) { this.cd = 0.5; this.go("approach"); }
        break;
    }
    // Ausweichen: wenn der Samurai gerade zum Schlag ansetzt, springt er manchmal zur Seite
    if ((this.state === "approach" || this.state === "strafe") && plAlive && dist < 42 && this.dashCd <= 0 && pl.act && pl.act.type === "atk" && pl.act.t < 0.06 && Math.random() < 0.3) {
      var side = Math.random() < 0.5 ? 1 : -1, da = ang + Math.PI + side * 1.2;
      if (!w.blockedAt(this.x + Math.cos(da) * 20, this.y + Math.sin(da) * 20) && a.walkable(this.x + Math.cos(da) * 30, this.y + Math.sin(da) * 30, 8)) this.startDash(da, null);
    }
    return [tx, ty, turn];
  };
  // Landung nach dem Sprung: Druckwelle
  E.land = function (pl) {
    var D = this.D, S = D.slam, w = this.world, self = this;
    w.shake = Math.max(w.shake, 4.5);
    w.parts.ring(this.x, this.y, S.r, 0.45, "rgba(220,190,150,"); w.parts.ring(this.x, this.y, S.r * 0.6, 0.3, "rgba(255,240,220,");
    w.parts.dust(this.x, this.y, 18, "#8A7A5A"); w.parts.chips(this.x + Math.cos(this.face) * 10, this.y + Math.sin(this.face) * 6, 2, 12, ["#6E5A40", "#8A7A5A", "#4E3A26"]);
    w.push(this.x, this.y, S.r + 16, 6, 0.6);
    SZ.audio.play("guard_break", { x: this.x, rate: 0.6 }); SZ.audio.play("monkey_hit", { x: this.x, rate: 0.7 });
    w.arena.obj.forEach(function (o) { if (m.dist(o.x, o.y, self.x, self.y) < S.r + 6 && SZ.objSolid(o)) w.hitObject(o, o.x, o.y - 4, 1.2); });
    var d = m.dist(this.x, this.y, pl.x, pl.y);
    if (!pl.dead && d < S.r + 4) {
      var res = pl.hurt(S.dmg, this.x, this.y, this);
      if (res === "parry") { this.stagger(D.parryStagger * 1.2, Math.atan2(this.y - pl.y, this.x - pl.x), 0.5); return; }
    }
    this.recT = S.rec; this.go("recover");
  };
  // Wiederholte Angriffe blocken: gleicher Angriff wie der vorige (neue Ausführung) → geblockt.
  // key = Art des Angriffs, inst = die einzelne Ausführung (mehrere Treffer einer Ausführung zählen als einer)
  E.guard = function (src, opt, ang) {
    var key = (opt && opt.k) || src, inst = (opt && opt.i) || null;
    if (inst && inst === this.gInst) { if (this.gBlocked) this.blockFx(ang, src); return this.gBlocked; }
    var rep = key === this.gKey;
    this.gInst = inst; this.gKey = key; this.gBlocked = rep;
    if (rep) this.blockFx(ang, src);
    return rep;
  };
  E.blockFx = function (ang, src) {
    var w = this.world, from = ang + Math.PI;
    if (this.state === "approach" || this.state === "strafe" || this.state === "recover" || this.state === "block" || this.state === "idle") { this.face = from; this.dir = m.dir8(from); this.go("block"); }
    w.parts.spark(this.x + Math.cos(from) * 6, this.y - 18, 4, 10, "#FFFFFF"); w.parts.ring(this.x, this.y - 2, 14, 0.3, "rgba(255,240,200,");
    if (!this.blkT || w.clock - this.blkT > 0.12) SZ.audio.play("block", { x: this.x, rate: 0.85 });
    this.blkT = w.clock;
    w.bossBlock = (w.bossBlock || 0) + 1;   // Hinweis für die Arena
  };

  E.stagger = function (time, fromAng, power) {
    this.go("stagger"); this.stagT = time;
    this.vx = Math.cos(fromAng) * 110 * power; this.vy = Math.sin(fromAng) * 110 * power;
  };

  // Schaden nehmen (Richtung = von wo der Treffer kommt, nach außen)
  E.hurt = function (dmg, ang, power, src, opt) {
    if (this.dead || this.state === "spawn") return;
    var w = this.world, crit = false, boss = this.D.boss;
    if (boss && (this.z > 6 || this.state === "leap")) return;                                       // in der Luft nicht zu treffen
    if (boss && src !== "ally" && src !== "thorns" && this.guard(src, opt, ang)) return;            // gleicher Angriff wie eben: geblockt
    // Perks des Samurai (nicht bei Teamschaden durch Bogenschützen oder Rückschaden)
    if (src !== "ally" && src !== "thorns" && w.player) { var o = SZ.perk.outgoing(w.player, dmg, src); dmg = o.dmg; crit = o.crit; }
    this.hp -= dmg; this.flash = 1; this.hpT = 3;
    if (crit) { w.parts.spark(this.x, this.y - 14 * this.sc, 14, 14, "#FFD84A"); w.parts.ring(this.x, this.y - 2, 14, 0.35, "rgba(255,220,120,"); w.shake = Math.max(w.shake, 1.5); }
    w.parts.spark(this.x, this.y - 12 * this.sc, 12, this.D.armored ? 12 : 8);
    if (src !== "water" && src !== "beam") w.parts.blood(this.x + Math.cos(ang) * 2, this.y, 11 * this.sc, Math.min(16, 5 + Math.round(dmg * 0.5)), ang, 0.7 + (power || 0) * 0.4);
    if (boss) { if (src !== "beam" || Math.random() < 0.3) SZ.audio.play("monkey_hit", { x: this.x, vol: src === "water" || src === "beam" || src === "wind" ? 0.55 : 1 }); }
    else if (src !== "beam") SZ.audio.play(src === "arrow" ? "arrow_hit" : "hit_flesh", { x: this.x, vol: src === "water" ? 0.5 : 1 });
    if (this.hp <= 0) {
      this.hp = 0; this.dead = true; this.deadT = 0; this.fallDir = Math.cos(ang) >= 0 ? 1 : -1;
      var kb = this.D.armored ? 30 : 120;
      this.vx = Math.cos(ang) * kb * power; this.vy = Math.sin(ang) * kb * power;
      w.parts.ink(this.x, this.y - 10 * this.sc, this.D.armored ? 26 : 16, "26,18,20");
      w.parts.blood(this.x, this.y, 10 * this.sc, this.D.armored ? 26 : 20, ang, 1.2);
      if (boss) {   // Boss besiegt: Fellbüschel, langer Ruf, Heilkugel fällt
        w.parts.chips(this.x, this.y - 6, 30, 22, ["#432A1A", "#694426", "#8E6236", "#C9A445"]);
        w.parts.ring(this.x, this.y, 40, 0.8, "rgba(240,200,150,"); w.shake = 6;
        SZ.audio.play("monkey_cry", { x: this.x, rate: 0.82 }); SZ.main.slowmo(0.2, 0.7);
        (w.drops = w.drops || []).push({ x: this.x, y: this.y, t: 0, kind: "heal" });
        return;
      }
      if (this.D.armored) w.parts.chips(this.x, this.y - 4, 26, 10, ["#33363F", "#962A1F", "#555A66"]);   // Rüstungsteile
      else w.parts.chips(this.x, this.y - 2, 24, 8, ["#C8A44E", "#E4C878", "#A08038"]);   // Strohfasern vom Hut
      w.shake = Math.max(w.shake, 3);
      SZ.main.slowmo(0.35, 0.18);
      return;
    }
    if (this.D.armored) return;   // kein Rückstoß, keine Unterbrechung
    this.stagger(this.D.stagger + (power > 1.2 ? 0.25 : 0), ang, power);
  };

  E.animName = function () {
    if (this.dead) return "stagger";
    if (this.D.boss) switch (this.state) {
      case "windup": case "sweepup": return "windup";
      case "swing": case "spin": return "atk";
      case "crouch": return "cast_low";
      case "leap": return this.st < this.D.slam.air * 0.75 ? "windup" : "atk";
      case "dash": return "dash";
      case "block": return "block";
      case "spawn": return "cast_up";
      case "recover": return this.pat === "slam" && this.st < 0.5 ? "cast_low" : this.st < 0.2 ? "atk" : "idle";
    }
    switch (this.state) {
      case "windup": return "windup";
      case "swing": return "atk";
      case "stagger": return "stagger";
      case "held": return "stagger";
      case "hold": return this.moving ? "walk" : "idle";
      case "aim": return "bow";
      case "recover": return this.D.ranged ? (this.st < 0.15 ? "bow" : "idle") : (this.st < 0.2 ? "atk" : "idle");
    }
    return this.moving ? "walk" : "idle";
  };
  E.sprite = function () {
    var an = this.animName(), k = an === "walk" ? Math.floor(this.walkPh * 6) : an === "idle" ? Math.floor(this.idleT / 0.8) : 0;
    return SZ.samurai.frame(this.dir, an, k, this.D.look);
  };
  E.swordPose = function () {
    var sp = this.swordPose1(), k = this.sc;
    if (k !== 1 && sp.hand) sp.hand = [sp.hand[0] * k, sp.hand[1] * k, sp.hand[2] * k];
    return sp;
  };
  E.swordPose1 = function () {
    var f = this.face, fx = Math.cos(f), fy = Math.sin(f), rx = -fy, ry = fx;
    function Wv(mx, my, mz) { return [mx * rx + my * fx, mx * ry + my * fy, mz]; }
    if (this.state === "windup") return { hand: Wv(0.8, 1.5, 22), ang: f + Math.PI * 0.85, tilt: 0.9, glint: this.st > this.D.windup - 0.14 };
    if (this.state === "swing" || (this.state === "recover" && this.st < 0.2)) {
      var p = this.state === "swing" ? m.easeOutCubic(this.st / this.D.swing) : 1, half = this.D.arc * Math.PI / 360;
      var ang = this.atkAng - half + half * 2 * p;
      return { hand: [Math.cos(ang) * 5.5, Math.sin(ang) * 5.5, 14.5], ang: ang, tilt: 0.05, swinging: this.state === "swing" };
    }
    if (this.state === "stagger") return { hand: Wv(4.6, -0.5, 13), ang: f + 1.3, tilt: -0.5 };
    return { hand: Wv(4.4, 2, 12.5), ang: f + 0.35, tilt: -0.5 };
  };

  E.drawShadow = function (sc, sh) {
    if (this.dead || this.state === "spawn") return;
    var s = this.sprite(), A = SZ.samurai;
    SZ.light.shadowXf(sc, sh, this.x, this.y, s.ax, s.ay);
    sc.drawImage(s.sil, 0, 0);
  };
  E.draw = function (ctx) {
    var s = this.sprite(), A = SZ.samurai, x = Math.round(this.x), y = Math.round(this.y), D = this.D;
    var alpha = this.state === "spawn" ? m.smooth(this.st / 0.65) : this.dead ? 1 - Math.max(0, this.deadT - 0.9) / 0.9 : 1;
    if (alpha <= 0) return;
    ctx.globalAlpha = alpha;
    var shs = D.boss && this.z ? Math.max(0.5, 1 - this.z / 50) : 1;
    ctx.fillStyle = "rgba(10,8,8,0.3)"; ctx.beginPath(); ctx.ellipse(x, y, 6 * this.sc * shs, 2.6 * this.sc * shs, 0, 0, TAU); ctx.fill();
    if (this.dead) {
      var k = Math.min(1, this.deadT / 0.35);
      ctx.save(); ctx.translate(x, y); ctx.rotate(this.fallDir * k * Math.PI / 2 * 0.92); ctx.drawImage(s.cv, -s.ax, -s.ay); ctx.restore();
      ctx.globalAlpha = 1; return;
    }
    if (D.ranged) { this.drawArcher(ctx, s, x, y); ctx.globalAlpha = 1; return; }
    if (D.boss) { this.drawMonkey(ctx, s, x, y); ctx.globalAlpha = 1; return; }
    var sp = this.swordPose(), w = { style: D.sword, blade: D.blade };
    var mid = A.proj(sp.hand[0] + Math.cos(sp.ang) * 6, sp.hand[1] + Math.sin(sp.ang) * 6, sp.hand[2]);
    var behind = mid.depth < 3.5 && Math.sin(sp.ang) < 0.2;
    var sw = null;
    if (behind) sw = A.drawSword(ctx, x, y, sp.hand, sp.ang, sp.tilt, w, sp.glint);
    ctx.drawImage(s.cv, x - s.ax, y - s.ay);
    if (!behind) sw = A.drawSword(ctx, x, y, sp.hand, sp.ang, sp.tilt, w, sp.glint);
    if (sp.glint && sw) { ctx.fillStyle = "#FFFFFF"; ctx.fillRect(Math.round(sw.tip.x) - 2, Math.round(sw.tip.y), 5, 1); ctx.fillRect(Math.round(sw.tip.x), Math.round(sw.tip.y) - 2, 1, 5); }
    if (sp.swinging && sw) this.trail.push({ a: sw.tip, b: sw.base, t: this.world.clock });
    var now = this.world.clock;
    this.trail = this.trail.filter(function (p) { return now - p.t < 0.12; });
    for (var i = 1; i < this.trail.length; i++) {
      var T = this.trail, kk = 1 - (now - T[i].t) / 0.12;
      ctx.fillStyle = "rgba(230,200,190," + (0.45 * kk) + ")";
      ctx.beginPath(); ctx.moveTo(T[i - 1].a.x, T[i - 1].a.y); ctx.lineTo(T[i].a.x, T[i].a.y);
      ctx.lineTo(T[i].b.x * 0.4 + T[i].a.x * 0.6, T[i].b.y * 0.4 + T[i].a.y * 0.6); ctx.lineTo(T[i - 1].b.x * 0.4 + T[i - 1].a.x * 0.6, T[i - 1].b.y * 0.4 + T[i - 1].a.y * 0.6);
      ctx.closePath(); ctx.fill();
    }
    if (this.flash > 0) { ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = Math.min(0.8, this.flash); ctx.drawImage(s.cv, x - s.ax, y - s.ay); ctx.restore(); }
    ctx.globalAlpha = 1;
  };
  // Bogenschütze: Bogen statt Schwert, beim Spannen mit Pfeil
  E.drawArcher = function (ctx, s, x, y) {
    var A = SZ.samurai, f = this.face, fx = Math.cos(f), fy = Math.sin(f), rx = -fy, ry = fx, self = this;
    var aiming = this.state === "aim" || (this.state === "recover" && this.st < 0.15);
    var full = this.quickShot ? this.D.quick : this.D.draw, dr = this.state === "aim" ? m.clamp(this.st / full, 0, 1) : 0;
    var hand = aiming ? [-0.6 * rx + 6.4 * fx, -0.6 * ry + 6.4 * fy, 17.4] : [-4.4 * rx + 1 * fx, -4.4 * ry + 1 * fy, 12.5];
    function bow() {
      var nock = A.drawBow(ctx, x, y, hand, aiming ? f : f + Math.PI / 2, dr, 0);
      if (self.state === "aim") A.drawArrow(ctx, nock.x, nock.y, f, 10, dr > 0.85 && Math.floor(self.world.clock * 10) % 2 === 0);
    }
    var behind = Math.sin(f) < -0.2;
    if (behind) bow();
    ctx.drawImage(s.cv, x - s.ax, y - s.ay);
    if (!behind) bow();
    if (this.flash > 0) { ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = Math.min(0.8, this.flash); ctx.drawImage(s.cv, x - s.ax, y - s.ay); ctx.restore(); }
  };

  // Monkey Lord: Stab statt Schwert, Sprung mit Zielmarke am Boden
  E.staffPose = function () {
    var f = this.face, fx = Math.cos(f), fy = Math.sin(f), rx = -fy, ry = fx, st = this.state, D = this.D;
    function Wv(mx, my, mz) { return [mx * rx + my * fx, mx * ry + my * fy, mz]; }
    if (st === "windup") return { hand: Wv(this.side * 1.5, 0.5, 22), ang: f + Math.PI * 0.85 * this.side, tilt: 0.7, b: 8, f: 18, glint: this.wu > 0.25 && this.st > this.wu - 0.14 };
    if (st === "swing" || (st === "recover" && this.pat === "combo" && this.st < 0.2)) {
      var p = st === "swing" ? m.easeOutCubic(this.st / D.combo.swing) : 1, half = D.arc * Math.PI / 360;
      var a = this.atkAng + this.side * (-half + half * 2 * p);
      return { hand: [Math.cos(a) * 5.5, Math.sin(a) * 5.5, 14.5], ang: a, tilt: 0.05, b: 7, f: 21, swinging: st === "swing" };
    }
    if (st === "sweepup") return { hand: Wv(-this.spinDir * 4.5, -1.5, 13), ang: f + Math.PI - this.spinDir * 0.8, tilt: 0.05, b: 11, f: 17, glint: this.st > this.wu - 0.16 };
    if (st === "spin" || (st === "recover" && this.pat === "sweep" && this.st < 0.15)) {
      var u = st === "spin" ? this.st / D.sweep.spin : 1, a2 = this.atkAng + this.spinDir * (Math.PI + u * Math.PI * 3);
      return { hand: [Math.cos(a2) * 4, Math.sin(a2) * 4, 13.5], ang: a2, tilt: 0.02, b: 10, f: 20, swinging: st === "spin" };
    }
    if (st === "crouch" || (st === "leap" && this.st < D.slam.air * 0.75) || st === "spawn") return { hand: Wv(0, 1, 26), ang: f + Math.PI / 2, tilt: 0, b: 13, f: 13 };
    if (st === "leap" || (st === "recover" && this.pat === "slam" && this.st < 0.5)) return { hand: Wv(0, 7, 9), ang: f, tilt: -0.9, b: 9, f: 15 };
    if (st === "block") return { hand: Wv(0, 5.5, 16), ang: f + Math.PI / 2, tilt: 0.1, b: 12, f: 12 };
    if (st === "dash") return { hand: Wv(3, -2, 12), ang: f + Math.PI + 0.35, tilt: 0.25, b: 8, f: 16 };
    if (st === "stagger" || this.dead) return { hand: Wv(4.6, -0.5, 13), ang: f + 1.3, tilt: -0.5, b: 8, f: 16 };
    return { hand: Wv(4.4, 1.5, 12.5), ang: f + 0.25, tilt: 1.7, b: 9, f: 16 };   // aufrecht in der rechten Hand
  };
  function drawStaff(ctx, ox, oy, hand, ang, tilt, back, front, st, glint) {
    var A = SZ.samurai, dx = Math.cos(ang), dy = Math.sin(ang), dz = tilt, n = Math.sqrt(dx * dx + dy * dy + dz * dz);
    dx /= n; dy /= n; dz /= n;
    var e0 = A.proj(hand[0] - dx * back, hand[1] - dy * back, hand[2] - dz * back), e1 = A.proj(hand[0] + dx * front, hand[1] + dy * front, hand[2] + dz * front);
    var p = SZ.pen(ctx), x0 = ox + e0.x, y0 = oy + e0.y, x1 = ox + e1.x, y1 = oy + e1.y;
    p.line(x0, y0 + 1, x1, y1 + 1, st.dark); p.line(x0, y0, x1, y1, st.wood); p.line(x0 + 1, y0, x1 + 1, y1, st.hi);
    var k = 2.2 / (back + front);   // goldene Kappen an beiden Enden
    p.line(x0, y0, x0 + (x1 - x0) * k, y0 + (y1 - y0) * k, st.cap); p.line(x1, y1, x1 - (x1 - x0) * k, y1 - (y1 - y0) * k, glint ? "#FFFFFF" : st.cap);
    p.px(x1, y1, glint ? "#FFFFFF" : st.capHi); p.px(x0, y0, st.capHi);
    return { tip: { x: x1, y: y1 }, base: { x: x0, y: y0 }, depth: (e0.depth + e1.depth) / 2 };
  }
  E.drawMonkey = function (ctx, s, x, y) {
    var D = this.D, sc = this.sc, sp = this.staffPose(), z = Math.round(this.z || 0), now = this.world.clock;
    // Zielmarke des Sprungs
    if (this.state === "leap" || this.state === "crouch") {
      var L = this.state === "leap" ? this.leap : null, gx = L ? L.x1 : x, gy = L ? L.y1 : y, k = L ? Math.min(1, this.st / D.slam.air) : 0;
      if (L) {
        var r = D.slam.r * (0.55 + 0.45 * k), pulse = 0.45 + 0.35 * Math.sin(now * 24);
        ctx.strokeStyle = "rgba(230,80,60," + pulse + ")"; ctx.beginPath(); ctx.ellipse(Math.round(gx) + 0.5, Math.round(gy) + 0.5, r, r * 0.5, 0, 0, TAU); ctx.stroke();
        ctx.fillStyle = "rgba(200,60,40," + (0.12 + k * 0.12) + ")"; ctx.beginPath(); ctx.ellipse(Math.round(gx), Math.round(gy), r, r * 0.5, 0, 0, TAU); ctx.fill();
      }
    }
    var hand = [sp.hand[0] * sc, sp.hand[1] * sc, sp.hand[2] * sc], b = sp.b * sc, f = sp.f * sc, yy = y - z;
    var mid = SZ.samurai.proj(hand[0] + Math.cos(sp.ang) * 4, hand[1] + Math.sin(sp.ang) * 4, hand[2]);
    var behind = mid.depth < 4.5 && Math.sin(sp.ang) < 0.2 && !sp.swinging, st;
    if (behind) st = drawStaff(ctx, x, yy, hand, sp.ang, sp.tilt, b, f, D.staff, sp.glint);
    ctx.drawImage(s.cv, x - s.ax, yy - s.ay);
    if (!behind) st = drawStaff(ctx, x, yy, hand, sp.ang, sp.tilt, b, f, D.staff, sp.glint);
    if (sp.glint && st) { ctx.fillStyle = "#FFFFFF"; ctx.fillRect(Math.round(st.tip.x) - 2, Math.round(st.tip.y), 5, 1); ctx.fillRect(Math.round(st.tip.x), Math.round(st.tip.y) - 2, 1, 5); }
    if (sp.swinging && st) this.trail.push({ a: st.tip, b: st.base, t: now });
    this.trail = this.trail.filter(function (q) { return now - q.t < 0.14; });
    for (var i = 1; i < this.trail.length; i++) {
      var T = this.trail, kk = 1 - (now - T[i].t) / 0.14;
      ctx.fillStyle = "rgba(240,215,170," + (0.4 * kk) + ")";
      ctx.beginPath(); ctx.moveTo(T[i - 1].a.x, T[i - 1].a.y); ctx.lineTo(T[i].a.x, T[i].a.y);
      ctx.lineTo(T[i].b.x * 0.35 + T[i].a.x * 0.65, T[i].b.y * 0.35 + T[i].a.y * 0.65); ctx.lineTo(T[i - 1].b.x * 0.35 + T[i - 1].a.x * 0.65, T[i - 1].b.y * 0.35 + T[i - 1].a.y * 0.65);
      ctx.closePath(); ctx.fill();
    }
    if (this.flash > 0) { ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = Math.min(0.8, this.flash); ctx.drawImage(s.cv, x - s.ax, yy - s.ay); ctx.restore(); }
  };
  // Lebensbalken über dem Kopf (unbeleuchtet, nach dem Licht gezeichnet)
  E.drawUI = function (ctx) {
    if (this.dead || this.hpT <= 0 || this.hp >= this.hpMax || this.D.boss) return;   // Boss: eigener Balken oben
    var x = Math.round(this.x) - 8, y = Math.round(this.y - 34 * this.sc), f = this.hp / this.hpMax;
    ctx.globalAlpha = Math.min(1, this.hpT);
    ctx.fillStyle = "#0C0909"; ctx.fillRect(x - 1, y - 1, 18, 4);
    ctx.fillStyle = "#3A2A26"; ctx.fillRect(x, y, 16, 2);
    ctx.fillStyle = "#D8452E"; ctx.fillRect(x, y, Math.max(1, Math.round(16 * f)), 2);
    ctx.globalAlpha = 1;
  };

  SZ.Enemy = Enemy;
})();
