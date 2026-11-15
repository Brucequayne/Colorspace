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
    world.parts.ink(x, y - 8 * this.sc, D.armored ? 30 : 18); world.parts.swirl(x, y, 8 * this.sc, 1, 0.7);
    SZ.audio.play("spawn", { x: x });
  }
  var E = Enemy.prototype;

  E.go = function (s) { this.state = s; this.st = 0; };

  E.update = function (dt, pl) {
    var D = this.D, w = this.world, a = w.arena;
    this.st += dt; this.idleT += dt;
    if (this.flash > 0) this.flash -= dt * 5;
    if (this.hpT > 0) this.hpT -= dt;
    if (this.dead) { this.deadT += dt; if (this.deadT > 1.8) this.gone = true; this.vx *= 0.9; this.vy *= 0.9; var np0 = a.move(this.x, this.y, this.vx * dt, this.vy * dt, D.radius, w.solids); this.x = np0.x; this.y = np0.y; return; }
    if (this.state === "spawn") { if (this.st > 0.65) this.go("approach"); return; }

    var dx = pl.x - this.x, dy = pl.y - this.y, dist = Math.sqrt(dx * dx + dy * dy), ang = Math.atan2(dy, dx);
    var plAlive = !pl.dead;
    var self0 = this, others = w.enemies.filter(function (o) { return o !== self0 && !o.dead; }).length;
    var aggro = D.armored && others === 0;          // allein: aggressiver
    this.cd -= dt * (aggro ? 1.8 : 1);
    var tx = 0, ty = 0, turn = 8, spdMul = aggro ? 1.3 : 1;
    switch (this.state) {
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
            if (res === "parry") { this.stagger(D.parryStagger, ha + Math.PI, 1.4); break; }
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
    if (!pl.dead && dist < 7 + D.radius && dist > 0.01) { tx -= dx / dist * 70; ty -= dy / dist * 70; }
    var snap = this.state === "stagger" ? 5 : this.state === "swing" ? 40 : 12;
    var spd = a.speedAt(this.x, this.y), tileC = a.tilePx(this.x, this.y);
    if (D.slowOn && D.slowOn[tileC]) spd = D.slowOn[tileC];
    this.vx += (tx * spd - this.vx) * Math.min(1, dt * snap); this.vy += (ty * spd - this.vy) * Math.min(1, dt * snap);
    var np = a.move(this.x, this.y, this.vx * dt, this.vy * dt, D.radius, w.solids);
    var moved = m.dist(this.x, this.y, np.x, np.y);
    this.x = np.x; this.y = np.y;
    this.moving = moved > 0.25 && (this.state === "approach" || this.state === "strafe" || this.state === "hold");
    // Festgefahren? Dann eine Weile strikt der Wegkarte folgen
    if (this.forceFlow > 0) this.forceFlow -= dt;
    var want = Math.sqrt(tx * tx + ty * ty) * dt;
    if ((this.state === "approach" || this.state === "strafe") && want > 0.3 && moved < want * 0.25) this.stuckT = (this.stuckT || 0) + dt; else this.stuckT = 0;
    if (this.stuckT > 0.35) { this.stuckT = 0; this.forceFlow = 1.6; this.strafe *= -1; if (this.state === "strafe") this.go("approach"); }
    if (this.moving) this.walkPh += moved / 22;
  };

  E.stagger = function (time, fromAng, power) {
    this.go("stagger"); this.stagT = time;
    this.vx = Math.cos(fromAng) * 110 * power; this.vy = Math.sin(fromAng) * 110 * power;
  };

  // Schaden nehmen (Richtung = von wo der Treffer kommt, nach außen)
  E.hurt = function (dmg, ang, power, src) {
    if (this.dead || this.state === "spawn") return;
    var w = this.world;
    this.hp -= dmg; this.flash = 1; this.hpT = 3;
    w.parts.spark(this.x, this.y - 12 * this.sc, 12, this.D.armored ? 12 : 8);
    w.parts.ink(this.x + Math.cos(ang) * 4, this.y - 10, 3, "110,18,16");
    SZ.audio.play(src === "arrow" ? "arrow_hit" : "hit_flesh", { x: this.x });
    if (this.hp <= 0) {
      this.hp = 0; this.dead = true; this.deadT = 0; this.fallDir = Math.cos(ang) >= 0 ? 1 : -1;
      var kb = this.D.armored ? 30 : 120;
      this.vx = Math.cos(ang) * kb * power; this.vy = Math.sin(ang) * kb * power;
      w.parts.ink(this.x, this.y - 10 * this.sc, this.D.armored ? 26 : 16, "26,18,20");
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
    switch (this.state) {
      case "windup": return "windup";
      case "swing": return "atk";
      case "recover": return this.st < 0.2 ? "atk" : "idle";
      case "stagger": return "stagger";
      case "hold": return this.moving ? "walk" : "idle";
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
    ctx.fillStyle = "rgba(10,8,8,0.3)"; ctx.beginPath(); ctx.ellipse(x, y, 6 * this.sc, 2.6 * this.sc, 0, 0, TAU); ctx.fill();
    if (this.dead) {
      var k = Math.min(1, this.deadT / 0.35);
      ctx.save(); ctx.translate(x, y); ctx.rotate(this.fallDir * k * Math.PI / 2 * 0.92); ctx.drawImage(s.cv, -s.ax, -s.ay); ctx.restore();
      ctx.globalAlpha = 1; return;
    }
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
  // Lebensbalken über dem Kopf (unbeleuchtet, nach dem Licht gezeichnet)
  E.drawUI = function (ctx) {
    if (this.dead || this.hpT <= 0 || this.hp >= this.hpMax) return;
    var x = Math.round(this.x) - 8, y = Math.round(this.y - 34 * this.sc), f = this.hp / this.hpMax;
    ctx.globalAlpha = Math.min(1, this.hpT);
    ctx.fillStyle = "#0C0909"; ctx.fillRect(x - 1, y - 1, 18, 4);
    ctx.fillStyle = "#3A2A26"; ctx.fillRect(x, y, 16, 2);
    ctx.fillStyle = "#D8452E"; ctx.fillRect(x, y, Math.max(1, Math.round(16 * f)), 2);
    ctx.globalAlpha = 1;
  };

  SZ.Enemy = Enemy;
})();
