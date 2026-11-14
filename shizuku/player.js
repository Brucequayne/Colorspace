/* Shizuku – player.js
   Der Samurai: Laufen (WASD), Blick zur Maus (8 Richtungen), 3 Angriffe und 3 Blocks.
   Linksklick = Angriff, Rechtsklick = Block. Q bzw. E gedrückt halten wählt Typ 2 bzw. 3
   (siehe weapons.js). Bodenart bremst (Wasser, Sand). Treffer auf Übungspfähle zum Testen. */
(function () {
  var SZ = window.SZ, m = SZ.m, TAU = Math.PI * 2;
  var SPEED = 86, R = 4;

  function Player(world, x, y) {
    this.world = world;
    this.x = x; this.y = y; this.vx = 0; this.vy = 0;
    this.face = Math.PI / 2; this.dir = 2;
    this.weapon = SZ.WEAPONS.katana;
    this.act = null;          // laufender Angriff oder Parade/Ausweichen
    this.guard = null;        // gehaltener Block
    this.combo = 0; this.comboSide = 1; this.queued = false;
    this.walkPh = 0; this.stepT = 0; this.idleT = 0;
    this.trail = [];
    this.appear = 1;          // 0..1 Einblenden im Übergang
    this.control = true;
    this.inv = 0;
    this.sword = null;
  }
  var P = Player.prototype;

  P.modeIndex = function (I) { return I.down("q") ? 1 : I.down("e") ? 2 : 0; };

  P.startAttack = function (kind) {
    var A = SZ.ATTACKS[kind], w = this.weapon, sp = w.speed;
    if (kind === "kesa") { if (this.combo >= (A.combo || 1)) this.combo = 0; this.comboSide = this.combo % 2 === 0 ? 1 : -1; this.combo++; }
    else this.combo = 0;
    var arc = (A.arcDeg || w.arc * (A.arcMul || 1) * (kind === "kesa" && this.combo === 3 ? 1.25 : 1)) * Math.PI / 180;
    this.act = { type: "atk", kind: kind, A: A, t: 0, ang: this.face, arc: arc, side: this.comboSide, hits: [],
      wind: A.wind / sp, swing: A.swing / sp, rec: A.rec / sp, dmg: w.dmg * A.dmgMul };
    this.trail = [];
    SZ.audio.play(kind === "tsuki" ? "thrust" : "swing", { rate: 0.95 + Math.random() * 0.1 });
  };
  P.startParry = function () { var B = SZ.BLOCKS.ukenagashi; this.act = { type: "parry", t: 0, B: B, ang: this.face }; SZ.audio.play("parry"); };
  P.startDodge = function (ix, iy) {
    var B = SZ.BLOCKS.ashisabaki, a = ix || iy ? Math.atan2(iy, ix) : this.face + Math.PI;
    this.act = { type: "dodge", t: 0, B: B, ang: a };
    this.inv = B.dur; SZ.audio.play("dodge");
  };

  P.update = function (dt, I) {
    var w = this.world, a = w.arena;
    if (this.inv > 0) this.inv -= dt;
    var ix = 0, iy = 0;
    if (this.control) {
      if (I.down("a") || I.down("ArrowLeft")) ix -= 1;
      if (I.down("d") || I.down("ArrowRight")) ix += 1;
      if (I.down("w") || I.down("ArrowUp")) iy -= 1;
      if (I.down("s") || I.down("ArrowDown")) iy += 1;
      var il = Math.sqrt(ix * ix + iy * iy); if (il) { ix /= il; iy /= il; }
      // Blickrichtung zur Maus (während eines Hiebs festgehalten)
      if (!this.act || this.act.type === "parry") this.face = Math.atan2(I.my - (this.y - 12), I.mx - this.x);
      this.dir = m.dir8(this.face);
      var mi = this.modeIndex(I), W = this.weapon;
      // Angriffe
      if (I.lmbHit) {
        if (!this.act) this.startAttack(W.attacks[mi]);
        else if (this.act.type === "atk" && this.act.kind === "kesa" && W.attacks[mi] === "kesa" && this.act.t > this.act.wind) this.queued = true;
      }
      // Blocks
      this.guard = null;
      if (!this.act && I.rmb) {
        var bk = W.blocks[mi];
        if (bk === "kamae") this.guard = "kamae";
        else if (I.rmbHit && bk === "ukenagashi") this.startParry();
        else if (I.rmbHit && bk === "ashisabaki") this.startDodge(ix, iy);
      }
    }

    // Bewegung
    var spd = SPEED * a.speedAt(this.x, this.y), tx = ix * spd, ty = iy * spd;
    if (this.guard) { tx *= SZ.BLOCKS.kamae.moveMul; ty *= SZ.BLOCKS.kamae.moveMul; }
    var ac = this.act;
    if (ac) {
      ac.t += dt;
      if (ac.type === "atk") {
        tx *= 0.3 / this.weapon.weight; ty *= 0.3 / this.weapon.weight;
        if (ac.t > ac.wind && ac.t < ac.wind + ac.swing) {
          var lk = ac.A.lunge * (1 - (ac.t - ac.wind) / ac.swing);
          tx += Math.cos(ac.ang) * lk; ty += Math.sin(ac.ang) * lk;
        }
        var end = ac.wind + ac.swing + ac.rec;
        if (this.queued && ac.t > ac.wind + ac.swing * 0.8 && this.combo < (ac.A.combo || 1)) { this.queued = false; this.face = Math.atan2(I.my - (this.y - 12), I.mx - this.x); this.startAttack("kesa"); ac = this.act; }
        else if (ac.t >= end) { this.act = null; if (ac.kind === "kesa") this.comboT = 0.25; else this.combo = 0; }
      } else if (ac.type === "parry") {
        tx *= 0.25; ty *= 0.25;
        if (ac.t > ac.B.window + ac.B.rec) this.act = null;
      } else if (ac.type === "dodge") {
        var dd = ac.t < ac.B.dur ? ac.B.speed * (1 - ac.t / ac.B.dur * 0.6) : 0;
        tx = Math.cos(ac.ang) * dd; ty = Math.sin(ac.ang) * dd;
        if (ac.t < ac.B.dur && Math.floor(ac.t / 0.04) !== Math.floor((ac.t - dt) / 0.04)) w.parts.ghost(this.sprite(), this.x, this.y);
        if (ac.t > ac.B.dur + ac.B.rec) this.act = null;
      }
    } else if (this.comboT > 0) { this.comboT -= dt; if (this.comboT <= 0) this.combo = 0; }

    var k = Math.min(1, dt * (ac && ac.type === "dodge" ? 30 : 14));
    this.vx += (tx - this.vx) * k; this.vy += (ty - this.vy) * k;
    var np = a.move(this.x, this.y, this.vx * dt, this.vy * dt, R, w.solids);
    var moved = m.dist(this.x, this.y, np.x, np.y);
    this.x = np.x; this.y = np.y;

    // Schritte: Staub oder Wasserringe
    if (moved > 0.2 && !(ac && ac.type === "dodge")) {
      this.walkPh += moved / 22;
      this.stepT -= dt;
      if (this.stepT <= 0) {
        this.stepT = 0.3;
        var tile = a.tilePx(this.x, this.y);
        if (tile === "w") { w.parts.ring(this.x, this.y, 7, 0.7); w.parts.splash(this.x, this.y, 2, 0.4); SZ.audio.play("step_water"); }
        else { w.parts.dust(this.x, this.y, 2, tile === "a" ? "#D6CCB0" : tile === "e" ? "#7A5E44" : "#A8A096"); SZ.audio.play("step"); }
      }
    }
    this.moving = moved > 0.2;
    this.idleT += dt;
    this.hitCheck();
  };

  // Aktuelle Schwertlage: Griffposition (Weltversatz) und Klingenwinkel
  P.swordPose = function () {
    var f = this.face, fx = Math.cos(f), fy = Math.sin(f), rx = -fy, ry = fx;
    function Wv(mx, my, mz) { return [mx * rx + my * fx, mx * ry + my * fy, mz]; }
    var ac = this.act;
    if (ac && ac.type === "atk") {
      var tt = ac.t, p;
      if (ac.kind === "tsuki") {
        p = tt < ac.wind ? -0.4 * (tt / ac.wind) : tt < ac.wind + ac.swing ? -0.4 + 1.4 * m.easeOutCubic((tt - ac.wind) / ac.swing) : 1;
        var ext = 3 + p * 6;
        return { hand: [Math.cos(ac.ang) * ext, Math.sin(ac.ang) * ext, 15], ang: ac.ang, tilt: 0.02, swinging: tt > ac.wind && tt < ac.wind + ac.swing };
      }
      var s0 = ac.ang - ac.side * ac.arc / 2, s1 = ac.ang + ac.side * ac.arc / 2;
      if (ac.kind === "kaiten") { s0 = ac.ang - ac.arc / 2; s1 = ac.ang + ac.arc / 2; }
      var q = tt < ac.wind ? -0.08 * (tt / ac.wind) : tt < ac.wind + ac.swing ? m.easeOutCubic((tt - ac.wind) / ac.swing) : 1;
      var ang = s0 + (s1 - s0) * q;
      return { hand: [Math.cos(ang) * 5.5, Math.sin(ang) * 5.5, 14.5], ang: ang, tilt: 0.06, swinging: tt > ac.wind && tt < ac.wind + ac.swing, s0: s0, cur: ang };
    }
    if (ac && ac.type === "parry") { var pw = ac.t < ac.B.window; return { hand: Wv(1, 4, 16), ang: f - Math.PI / 2 + 0.7, tilt: 0.85, parry: pw }; }
    if (ac && ac.type === "dodge") return { hand: Wv(4, -1.5, 13), ang: f + Math.PI * 0.8, tilt: -0.3 };
    if (this.guard) return { hand: Wv(0.6, 4.6, 15.2), ang: f - Math.PI / 2, tilt: 0.22, guard: true };
    var bob = this.moving ? Math.sin(this.walkPh * TAU) * 0.6 : 0;
    return { hand: Wv(4.6, 1.6, 12 + bob), ang: f + 0.45, tilt: -0.55 };
  };

  P.animName = function () {
    var ac = this.act;
    if (ac) return ac.type === "atk" ? "atk" : ac.type === "parry" ? "parry" : "dash";
    if (this.guard) return "block";
    return this.moving ? "walk" : "idle";
  };
  P.sprite = function () {
    var an = this.animName(), k = an === "walk" ? Math.floor(this.walkPh * 6) : an === "idle" ? Math.floor(this.idleT / 0.7) : 0;
    return SZ.samurai.frame(this.dir, an, k);
  };

  // Treffer an Übungspfählen (später: Gegner)
  P.hitCheck = function () {
    var ac = this.act; if (!ac || ac.type !== "atk") return;
    var sp = this.swordPose(); if (!sp.swinging) return;
    var self = this, w = this.world, reach = this.weapon.reach;
    w.arena.obj.forEach(function (o) {
      var d = SZ.OBJECTS[o.t]; if (!d.hit || ac.hits.indexOf(o) >= 0) return;
      var tx = o.x, ty = o.y - 3, dist = m.dist(self.x, self.y, tx, ty), ang = Math.atan2(ty - self.y, tx - self.x), ok = false;
      if (ac.kind === "tsuki") ok = dist < reach + 10 && Math.abs(m.angDiff(ac.ang, ang)) < 0.4;
      else {
        if (dist > reach + 6) return;
        var a0 = sp.s0, a1 = sp.cur, lo = Math.min(a0, a1), hi = Math.max(a0, a1), aa = ang;
        while (aa < lo) aa += TAU; while (aa > lo + TAU) aa -= TAU;
        ok = aa <= hi + 0.15 || dist < 8;
      }
      if (!ok) return;
      ac.hits.push(o);
      o._rt = o._rt || {}; o._rt.shake = 1; o._rt.flash = 0.9;
      w.parts.straw(o.x, o.y - 12, 10);
      w.parts.spark(o.x, o.y - 12, 12, 6);
      w.shake = ac.kind === "kaiten" ? 3 : 2;
      self.hitstop = 0.05;
      SZ.audio.play("hit_straw");
    });
  };

  P.drawShadow = function (sc, sh) {
    var s = this.sprite(), A = SZ.samurai;
    sc.setTransform(1, 0, -sh.x, -sh.y, this.x - A.AX + A.AY * sh.x, this.y + A.AY * sh.y);
    sc.globalAlpha = this.appear;
    sc.drawImage(s.sil, 0, 0);
    sc.globalAlpha = 1;
  };

  P.draw = function (ctx) {
    var s = this.sprite(), A = SZ.samurai, x = Math.round(this.x), y = Math.round(this.y), w = this.weapon;
    var sp = this.swordPose();
    // Kontaktschatten
    ctx.fillStyle = "rgba(10,8,8," + (0.32 * this.appear) + ")";
    ctx.beginPath(); ctx.ellipse(x, y, 6, 2.6, 0, 0, TAU); ctx.fill();
    var mid = A.proj(sp.hand[0] + Math.cos(sp.ang) * 6, sp.hand[1] + Math.sin(sp.ang) * 6, sp.hand[2]);
    var behind = mid.depth < 3.5 && Math.sin(sp.ang) < 0.2;
    ctx.globalAlpha = this.appear;
    if (behind) this.sword = A.drawSword(ctx, x, y, sp.hand, sp.ang, sp.tilt, w, sp.parry);
    ctx.drawImage(s.cv, x - A.AX, y - A.AY);
    if (!behind) this.sword = A.drawSword(ctx, x, y, sp.hand, sp.ang, sp.tilt, w, sp.parry);
    ctx.globalAlpha = 1;
    // Schwertspur
    if (sp.swinging && this.sword) this.trail.push({ a: this.sword.tip, b: this.sword.base, t: this.world.clock });
    var now = this.world.clock;
    this.trail = this.trail.filter(function (p) { return now - p.t < 0.12; });
    if (this.trail.length > 1) {
      var T = this.trail;
      for (var i = 1; i < T.length; i++) {
        var k = 1 - (now - T[i].t) / 0.12;
        ctx.fillStyle = "rgba(255,250,236," + (0.55 * k) + ")";
        ctx.beginPath(); ctx.moveTo(T[i - 1].a.x, T[i - 1].a.y); ctx.lineTo(T[i].a.x, T[i].a.y);
        ctx.lineTo(T[i].b.x * 0.4 + T[i].a.x * 0.6, T[i].b.y * 0.4 + T[i].a.y * 0.6);
        ctx.lineTo(T[i - 1].b.x * 0.4 + T[i - 1].a.x * 0.6, T[i - 1].b.y * 0.4 + T[i - 1].a.y * 0.6);
        ctx.closePath(); ctx.fill();
      }
    }
    // Block-Anzeige: feiner Bogen vor dem Samurai
    if (sp.guard || sp.parry) {
      var B = sp.guard ? SZ.BLOCKS.kamae : SZ.BLOCKS.ukenagashi, half = B.arc * Math.PI / 360, cy = y - 9;
      ctx.strokeStyle = sp.parry ? "rgba(140,230,245,0.85)" : "rgba(236,228,206,0.45)";
      ctx.lineWidth = 1; ctx.beginPath();
      ctx.ellipse(x, cy, 14, 9, 0, this.face - half, this.face + half); ctx.stroke();
    }
  };

  SZ.Player = Player;
})();
