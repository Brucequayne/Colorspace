/* Shizuku – player.js
   Der Samurai.
   Laufen WASD · Blick zur Maus (8 Richtungen) · Leertaste Dash (kostet 33 % Energie)
   Katana: Linksklick Angriff, Rechtsklick Block, Q bzw. E gehalten = Typ 2 bzw. 3,
           Rechtsklick halten + Linksklick = Konter (pariert im richtigen Moment, dann starker Gegenschlag)
   Yumi:   Linksklick halten zum Spannen, loslassen zum Schießen
   Waffe wechseln: 1 / 2 oder Mausrad.
   Leben und Energie: Energie lädt nach 2 s ohne Angriff oder Dash. Blocken kostet Energie. */
(function () {
  var SZ = window.SZ, m = SZ.m, TAU = Math.PI * 2;
  var R = 4;

  function Player(world, x, y) {
    var C = SZ.PLAYER;
    this.world = world;
    this.x = x; this.y = y; this.vx = 0; this.vy = 0;
    this.face = Math.PI / 2; this.dir = 2; this.bodyAng = this.face;
    this.wi = 0; this.weapon = SZ.WEAPONS.katana;
    this.act = null; this.guard = null;
    this.combo = 0; this.comboSide = 1; this.queued = false; this.comboT = 0;
    this.walkPh = 0; this.stepT = 0; this.idleT = 0;
    this.trail = [];
    this.appear = 1; this.control = true;
    this.inv = 0; this.hitstop = 0; this.flash = 0;
    this.hp = this.hpMax = C.hp; this.en = this.enMax = C.energy; this.enT = 99;
    this.dead = false; this.deadT = 0;
    this.hair = new SZ.samurai.Hair(8, 2.1);
    this.sword = null;
  }
  var P = Player.prototype;

  P.modeIndex = function (I) { return I.down("q") ? 1 : I.down("e") ? 2 : 0; };
  P.setWeapon = function (i) {
    i = ((i % SZ.WEAPON_ORDER.length) + SZ.WEAPON_ORDER.length) % SZ.WEAPON_ORDER.length;
    if (i === this.wi) { this.wantW = null; return; }
    if (this.act && (this.act.type === "atk" || this.act.type === "draw" || this.act.type === "loose")) { this.wantW = i; return; }
    this.wantW = null; this.wi = i; this.weapon = SZ.WEAPONS[SZ.WEAPON_ORDER[i]];
    SZ.audio.play("equip");
  };
  P.spend = function () { this.enT = 0; };

  P.startAttack = function (kind) {
    var A = SZ.ATTACKS[kind], w = this.weapon, sp = w.speed || 1;
    if (kind === "kesa") { if (this.combo >= (A.combo || 1)) this.combo = 0; this.comboSide = this.combo % 2 === 0 ? 1 : -1; this.combo++; }
    else this.combo = 0;
    var arc = (A.arcDeg || w.arc * (A.arcMul || 1) * (kind === "kesa" && this.combo === 3 ? 1.25 : 1)) * Math.PI / 180;
    this.act = { type: "atk", kind: kind, A: A, t: 0, ang: this.face, arc: arc, side: kind === "kaeshi" ? 1 : this.comboSide, hits: [],
      wind: A.wind / sp, swing: A.swing / sp, rec: A.rec / sp, dmg: w.dmg * A.dmgMul, countered: false };
    this.trail = [];
    this.spend();
    if (kind !== "kaeshi") SZ.audio.play(kind === "tsuki" ? "thrust" : "swing", { rate: 0.95 + Math.random() * 0.1 });
  };
  P.startParry = function () { this.act = { type: "parry", t: 0, B: SZ.BLOCKS.ukenagashi, ang: this.face }; SZ.audio.play("parry"); };
  P.startDodge = function (ix, iy) {
    var B = SZ.BLOCKS.ashisabaki, a = ix || iy ? Math.atan2(iy, ix) : this.face + Math.PI;
    this.act = { type: "dodge", t: 0, B: B, ang: a };
    this.inv = B.dur; SZ.audio.play("dodge");
  };
  P.startDash = function (ix, iy) {
    var C = SZ.PLAYER;
    if (this.en < C.dashCost - 0.01) { SZ.audio.play("tired"); return; }
    this.en -= C.dashCost; this.spend();
    var a = ix || iy ? Math.atan2(iy, ix) : this.face;
    this.act = { type: "dash", t: 0, ang: a, dur: C.dashTime };
    this.inv = C.dashTime + 0.06;
    var w = this.world;
    w.parts.swirl(this.x, this.y, 7, 1, 0.6); w.parts.swirl(this.x, this.y, 4, -1, 0.5);
    w.parts.dust(this.x, this.y, 5);
    w.push(this.x, this.y, 22, 3, 0.6);
    SZ.audio.play("dash");
  };
  P.isParrying = function () {
    var a = this.act;
    return !!a && ((a.type === "parry" && a.t < a.B.window) || (a.type === "atk" && a.kind === "kaeshi" && a.t < a.wind));
  };

  // Bogen: Pfeil lösen
  P.loose = function (charge) {
    var W = this.weapon, c = m.clamp(charge, 0, 1), w = this.world;
    var spd = m.lerp(W.speed[0], W.speed[1], c * c), dmg = m.lerp(W.dmg[0], W.dmg[1], c * c);
    var a = this.face, sx = this.x + Math.cos(a) * 7, sy = this.y + Math.sin(a) * 5;
    w.addArrow({ x: sx, y: sy, z: 15, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, ang: a, dmg: dmg, power: c, drop: c > 0.6 ? 0 : 14 * (1 - c), dist: 0, lastFx: 0, hit: [], trail: [] });
    this.act = { type: "loose", t: 0, dur: 0.24, c: c };
    this.spend();
    this.vx -= Math.cos(a) * 30 * c; this.vy -= Math.sin(a) * 30 * c;
    if (c > 0.8) {
      // Theatralisch: Druckwelle, Wirbel, kurze Zeitlupe
      w.shake = 3.5;
      w.parts.ring(this.x, this.y, 22, 0.5, "rgba(245,240,226,");
      w.parts.swirl(this.x, this.y, 10, 1, 0.8); w.parts.swirl(this.x, this.y, 6, -1, 0.7);
      for (var i = 0; i < 6; i++) { var b = a + Math.PI + (Math.random() - 0.5) * 1.6; w.parts.wind(this.x + Math.cos(b) * 4, this.y - 8 + Math.sin(b) * 3, b, 8 + Math.random() * 8, 0.35, 0.6); }
      w.push(this.x, this.y, 30, 3, 0.8);
      w.parts.dust(this.x, this.y, 6);
      SZ.main.slowmo(0.3, 0.14);
      SZ.audio.play("bow_strong");
    } else SZ.audio.play("bow", { rate: 0.9 + c * 0.3 });
  };

  P.update = function (dt, I) {
    var w = this.world, a = w.arena, C = SZ.PLAYER;
    if (this.dead) { this.deadT += dt; this.hair.update(dt, this.hair.anchor(this.bodyAng, this.x, this.y, 0), w.wind, w.clock); return; }
    if (this.inv > 0) this.inv -= dt;
    if (this.flash > 0) this.flash -= dt * 4;
    this.enT += dt;
    if (this.enT > C.regenDelay) this.en = Math.min(this.enMax, this.en + C.regenRate * dt);

    var ix = 0, iy = 0, Wp = this.weapon, ac = this.act;
    if (this.control) {
      if (I.down("a") || I.down("ArrowLeft")) ix -= 1;
      if (I.down("d") || I.down("ArrowRight")) ix += 1;
      if (I.down("w") || I.down("ArrowUp")) iy -= 1;
      if (I.down("s") || I.down("ArrowDown")) iy += 1;
      var il = Math.sqrt(ix * ix + iy * iy); if (il) { ix /= il; iy /= il; }
      if (I.hit("1")) this.setWeapon(0);
      if (I.hit("2")) this.setWeapon(1);
      if (I.wheel && !ac) this.setWeapon(this.wi + (I.wheel > 0 ? 1 : -1));
      if (this.wantW != null) this.setWeapon(this.wantW);
      Wp = this.weapon;
      var lock = ac && (ac.type === "atk" || ac.type === "dash" || ac.type === "hurt" || ac.type === "dodge");
      if (!lock) this.face = Math.atan2(I.my - (this.y - 12), I.mx - this.x);
      if ((I.hit(" ")) && (!ac || ac.type === "loose" || (ac.type === "atk" && ac.t > ac.wind + ac.swing))) { this.startDash(ix, iy); ac = this.act; }
      var mi = this.modeIndex(I);
      if (Wp.type === "bow") {
        this.guard = null;
        if (!ac && I.lmbHit) { this.act = ac = { type: "draw", t: 0, full: false }; SZ.audio.play("bow_draw"); }
        if (ac && ac.type === "draw" && !I.lmb) {
          if (ac.t >= Wp.minDraw) this.loose(ac.t / Wp.full); else this.act = null;
          ac = this.act;
        }
      } else {
        // Katana
        if (I.lmbHit) {
          if (!ac && this.guard) this.startAttack("kaeshi");
          else if (!ac) this.startAttack(Wp.attacks[mi]);
          else if (ac.type === "atk" && ac.kind === "kesa" && Wp.attacks[mi] === "kesa" && ac.t > ac.wind) this.queued = true;
          ac = this.act;
        }
      }
      this.guard = null;
      if (!ac && I.rmb) {
        var bk = Wp.blocks[mi];
        if (bk === "kamae") this.guard = "kamae";
        else if (I.rmbHit && bk === "ukenagashi") this.startParry();
        else if (I.rmbHit && bk === "ashisabaki") this.startDodge(ix, iy);
      }
    }

    // Bewegung und Aktionen
    // Sprint mit Shift: nur beim normalen Laufen (nicht in Deckung, beim Spannen oder Angreifen)
    this.sprinting = this.control && I.down("Shift") && (ix || iy) && !this.guard && !this.act;
    var spd = C.walk * (this.sprinting ? C.sprint : 1) * a.speedAt(this.x, this.y), tx = ix * spd, ty = iy * spd;
    if (this.guard) { tx *= SZ.BLOCKS.kamae.moveMul; ty *= SZ.BLOCKS.kamae.moveMul; }
    ac = this.act;
    var snap = 14;
    if (ac) {
      ac.t += dt;
      if (ac.type === "atk") {
        tx *= 0.3 / Wp.weight; ty *= 0.3 / Wp.weight;
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
        tx = Math.cos(ac.ang) * dd; ty = Math.sin(ac.ang) * dd; snap = 30;
        if (ac.t < ac.B.dur && Math.floor(ac.t / 0.04) !== Math.floor((ac.t - dt) / 0.04)) w.parts.ghost(this.sprite(), this.x, this.y);
        if (ac.t > ac.B.dur + ac.B.rec) this.act = null;
      } else if (ac.type === "dash") {
        var ds = ac.t < ac.dur ? C.dashSpeed * (1 - ac.t / ac.dur * 0.45) : 0;
        tx = Math.cos(ac.ang) * ds; ty = Math.sin(ac.ang) * ds; snap = 40;
        if (ac.t < ac.dur) {
          if (Math.floor(ac.t / 0.03) !== Math.floor((ac.t - dt) / 0.03)) {
            w.parts.ghost(this.sprite(), this.x, this.y);
            w.parts.wind(this.x + (Math.random() - 0.5) * 6, this.y - 4 - Math.random() * 14, ac.ang, 10 + Math.random() * 8, 0.3, 0.7);
            w.push(this.x, this.y, 16, 3, 0.5);
            if (a.tilePx(this.x, this.y) === "w") w.parts.splash(this.x, this.y, 3, 0.5); else w.parts.dust(this.x, this.y, 1);
          }
        } else if (ac.t > ac.dur + 0.08) { this.act = null; w.parts.swirl(this.x, this.y, 5, -1, 0.45); }
      } else if (ac.type === "draw") {
        tx *= Wp.drawMove; ty *= Wp.drawMove;
        if (!ac.full && ac.t >= Wp.full) { ac.full = true; w.parts.swirl(this.x, this.y, 6, 1, 0.5); SZ.audio.play("bow_full"); }
      } else if (ac.type === "loose") {
        tx *= 0.5; ty *= 0.5;
        if (ac.t > ac.dur) this.act = null;
      } else if (ac.type === "hurt") {
        tx = ty = 0; snap = 6;
        if (ac.t > ac.dur) this.act = null;
      }
    } else if (this.comboT > 0) { this.comboT -= dt; if (this.comboT <= 0) this.combo = 0; }

    var k = Math.min(1, dt * snap);
    this.vx += (tx - this.vx) * k; this.vy += (ty - this.vy) * k;
    var np = a.move(this.x, this.y, this.vx * dt, this.vy * dt, R, w.solids);
    var moved = m.dist(this.x, this.y, np.x, np.y);
    this.x = np.x; this.y = np.y;

    if (moved > 0.2 && !(ac && (ac.type === "dodge" || ac.type === "dash"))) {
      this.walkPh += moved / 22;
      this.stepT -= dt;
      if (this.stepT <= 0) {
        this.stepT = this.sprinting ? 0.2 : 0.32;
        var tile = a.tilePx(this.x, this.y);
        if (tile === "w") { w.parts.ring(this.x, this.y, 7, 0.7); w.parts.splash(this.x, this.y, 2, 0.4); SZ.audio.play("step_water"); }
        else { if (this.sprinting) w.push(this.x, this.y, 10, 1.5, 0.4); w.parts.dust(this.x, this.y, this.sprinting ? 3 : 2, tile === "a" ? "#D6CCB0" : tile === "e" ? "#7A5E44" : tile === "g" ? "#B8B2A4" : "#A8A096"); SZ.audio.play("step"); }
      }
    }
    this.moving = moved > 0.2;
    this.idleT += dt;
    // Körper dreht beim Schwung mit dem Schwert mit
    var sp = this.swordPose();
    if (this.act && this.act.type === "atk" && sp.cur != null) this.bodyAng = this.act.kind === "kaiten" ? sp.cur : this.face + m.angDiff(this.face, sp.cur) * 0.65;
    else this.bodyAng = this.face;
    this.dir = m.dir8(this.bodyAng);
    this.hair.update(dt, this.hair.anchor(this.bodyAng, this.x, this.y, 0), w.wind + Math.min(2, Math.hypot(this.vx, this.vy) / 80), w.clock);
    this.hitCheck();
  };

  // Treffer einstecken. Rückgabe: "parry", "block", "break", "hit" oder "miss"
  P.hurt = function (dmg, fx, fy, src) {
    if (this.dead || this.inv > 0) return "miss";
    var w = this.world, a = Math.atan2(fy - this.y, fx - this.x), front = Math.abs(m.angDiff(this.face, a)) < 1.3;
    var mx = (this.x + fx) / 2, my = (this.y + fy) / 2 - 12;
    if (this.isParrying() && front) {
      if (this.act.type === "atk") this.act.countered = true;
      this.flash = 0.6;
      w.parts.spark(mx, my + 12, 12, 16, "#BFF4FF"); w.parts.ring(this.x, this.y - 2, 16, 0.4, "rgba(170,240,255,");
      w.shake = 2; SZ.main.slowmo(0.25, 0.22);
      SZ.audio.play("parry_hit");
      return "parry";
    }
    if (this.guard && front) {
      this.en -= dmg * SZ.PLAYER.blockCost; this.spend();
      w.parts.spark(mx, my + 12, 12, 8);
      if (this.en < 0) {
        this.en = 0; this.hp -= dmg * 0.5; this.guard = null;
        this.act = { type: "hurt", t: 0, dur: 0.45 }; this.vx = -Math.cos(a) * 120; this.vy = -Math.sin(a) * 120;
        w.shake = 3; SZ.audio.play("guard_break");
        this.checkDeath(); return "break";
      }
      this.vx = -Math.cos(a) * 70; this.vy = -Math.sin(a) * 70; w.shake = 1.5;
      SZ.audio.play("block");
      return "block";
    }
    this.hp -= dmg; this.flash = 1;
    this.act = { type: "hurt", t: 0, dur: 0.28 }; this.guard = null;
    this.vx = -Math.cos(a) * 150; this.vy = -Math.sin(a) * 150;
    w.shake = 3; this.hitstop = 0.06;
    w.parts.spark(this.x, this.y - 12, 10, 8, "#E8503A");
    SZ.audio.play("hurt");
    this.checkDeath();
    return "hit";
  };
  P.checkDeath = function () {
    if (this.hp > 0) return;
    this.hp = 0; this.dead = true; this.deadT = 0; this.act = null; this.guard = null; this.control = false;
    this.world.parts.ink(this.x, this.y - 6, 10, "120,20,18");
    SZ.main.slowmo(0.25, 0.6);
  };

  // Schwertlage: Griff (Weltversatz), Klingenwinkel, Neigung
  P.swordPose = function () {
    var f = this.face, fx = Math.cos(f), fy = Math.sin(f), rx = -fy, ry = fx;
    function Wv(mx, my, mz) { return [mx * rx + my * fx, mx * ry + my * fy, mz]; }
    var ac = this.act;
    if (ac && ac.type === "atk") {
      var tt = ac.t, p;
      if (ac.kind === "kaeshi" && tt < ac.wind) return { hand: Wv(0.6, 4.6, 15.2), ang: f - Math.PI / 2, tilt: 0.3, guard: true, parry: true };
      if (ac.kind === "tsuki") {
        p = tt < ac.wind ? -0.4 * (tt / ac.wind) : tt < ac.wind + ac.swing ? -0.4 + 1.4 * m.easeOutCubic((tt - ac.wind) / ac.swing) : 1;
        var ext = 3 + p * 6;
        return { hand: [Math.cos(ac.ang) * ext, Math.sin(ac.ang) * ext, 15], ang: ac.ang, tilt: 0.02, swinging: tt > ac.wind && tt < ac.wind + ac.swing };
      }
      var s0 = ac.ang - ac.side * ac.arc / 2, s1 = ac.ang + ac.side * ac.arc / 2;
      var q = tt < ac.wind ? (ac.kind === "kaeshi" ? 0 : -0.08 * (tt / ac.wind)) : tt < ac.wind + ac.swing ? m.easeOutCubic((tt - ac.wind) / ac.swing) : 1;
      var ang = s0 + (s1 - s0) * q;
      return { hand: [Math.cos(ang) * 5.5, Math.sin(ang) * 5.5, 14.5], ang: ang, tilt: 0.06, swinging: tt > ac.wind && tt < ac.wind + ac.swing, s0: s0, cur: ang };
    }
    if (ac && ac.type === "parry") { var pw = ac.t < ac.B.window; return { hand: Wv(1, 4, 16), ang: f - Math.PI / 2 + 0.7, tilt: 0.85, parry: pw }; }
    if (ac && (ac.type === "dodge" || ac.type === "dash")) return { hand: Wv(4, -1.5, 13), ang: f + Math.PI * 0.8, tilt: -0.3 };
    if (ac && ac.type === "hurt") return { hand: Wv(4.6, 0, 13), ang: f + 1.2, tilt: -0.6 };
    if (this.guard) return { hand: Wv(0.6, 4.6, 15.2), ang: f - Math.PI / 2, tilt: 0.22, guard: true };
    var bob = this.moving ? Math.sin(this.walkPh * TAU) * 0.6 : 0;
    return { hand: Wv(4.6, 1.6, 12 + bob), ang: f + 0.45, tilt: -0.55 };
  };

  P.animName = function () {
    var ac = this.act;
    if (this.dead) return "stagger";
    if (ac) {
      if (ac.type === "atk") return ac.kind === "kaeshi" && ac.t < ac.wind ? "block" : "atk";
      if (ac.type === "parry") return "parry";
      if (ac.type === "draw" || ac.type === "loose") return this.moving ? "bowwalk" : "bow";
      if (ac.type === "hurt") return "stagger";
      return "dash";
    }
    if (this.guard) return this.moving ? "blockwalk" : "block";
    return this.moving ? "walk" : "idle";
  };
  P.sprite = function () {
    var an = this.animName(), k = (an === "walk" || an === "blockwalk" || an === "bowwalk") ? Math.floor(this.walkPh * (an === "walk" ? 6 : 8)) : an === "idle" ? Math.floor(this.idleT / 0.7) : 0;
    return SZ.samurai.frame(this.dir, an, k, "samurai");
  };

  // Treffer mit dem Katana: Gegner und Objekte
  P.hitCheck = function () {
    var ac = this.act; if (!ac || ac.type !== "atk") return;
    var sp = this.swordPose(); if (!sp.swinging) return;
    var self = this, w = this.world, reach = this.weapon.reach;
    function inArc(tx, ty, extra) {
      var dist = m.dist(self.x, self.y, tx, ty), ang = Math.atan2(ty - self.y, tx - self.x);
      if (ac.kind === "tsuki") return dist < reach + 10 + extra && Math.abs(m.angDiff(ac.ang, ang)) < 0.45;
      if (dist > reach + 6 + extra) return false;
      if (dist < 8) return true;
      var a0 = sp.s0, a1 = sp.cur, lo = Math.min(a0, a1), hi = Math.max(a0, a1), aa = ang;
      while (aa < lo) aa += TAU; while (aa > lo + TAU) aa -= TAU;
      return aa <= hi + 0.15;
    }
    w.enemies.forEach(function (e) {
      if (e.dead || ac.hits.indexOf(e) >= 0 || !inArc(e.x, e.y, 3)) return;
      ac.hits.push(e);
      var mul = ac.countered ? ac.A.counterMul || 2.4 : 1;
      e.hurt(ac.dmg * mul, Math.atan2(e.y - self.y, e.x - self.x), ac.kind === "kaiten" ? 1.3 : ac.countered ? 1.8 : 1, "sword");
      if (ac.countered) { w.parts.ring(e.x, e.y - 2, 20, 0.5, "rgba(170,240,255,"); SZ.main.slowmo(0.2, 0.25); w.shake = 4; }
      self.hitstop = ac.countered ? 0.1 : 0.05;
    });
    w.arena.obj.forEach(function (o) {
      var sol = SZ.objSolid(o); if (!sol || ac.hits.indexOf(o) >= 0) return;
      var r = sol[0][2];
      if (!inArc(o.x + sol[0][0], o.y + sol[0][1], r)) return;
      ac.hits.push(o);
      var c = SZ.objCenter(o);
      w.hitObject(o, (self.x + c.x) / 2 + (c.x - self.x) * 0.3, o.y, ac.kind === "kaiten" ? 1.3 : 1);
      w.shake = Math.max(w.shake, 1.5);
      self.hitstop = Math.max(self.hitstop, 0.04);
    });
  };

  P.drawShadow = function (sc, sh) {
    if (this.dead) return;
    var s = this.sprite(), A = SZ.samurai;
    SZ.light.shadowXf(sc, sh, this.x, this.y, A.AX, A.AY);
    sc.globalAlpha = this.appear;
    sc.drawImage(s.sil, 0, 0);
    sc.globalAlpha = 1;
  };

  P.draw = function (ctx) {
    var s = this.sprite(), A = SZ.samurai, x = Math.round(this.x), y = Math.round(this.y), w = this.weapon, ac = this.act;
    ctx.fillStyle = "rgba(10,8,8," + (0.32 * this.appear) + ")";
    ctx.beginPath(); ctx.ellipse(x, y, 6, 2.6, 0, 0, TAU); ctx.fill();
    if (this.dead) {
      var k = Math.min(1, this.deadT / 0.4);
      ctx.save(); ctx.globalAlpha = 1 - Math.max(0, this.deadT - 1.2) / 0.8;
      ctx.translate(x, y); ctx.rotate((Math.cos(this.face) >= 0 ? -1 : 1) * k * Math.PI / 2 * 0.95);
      ctx.drawImage(s.cv, -A.AX, -A.AY); ctx.restore();
      return;
    }
    var hairBehind = this.dir >= 0 && this.dir <= 4;
    ctx.globalAlpha = this.appear;
    if (hairBehind) this.hair.draw(ctx, this.appear);

    if (w.type === "bow") {
      var f = this.face, fx = Math.cos(f), fy = Math.sin(f), rx = -fy, ry = fx;
      var aiming = ac && (ac.type === "draw" || ac.type === "loose");
      var hand = aiming ? [-0.6 * rx + 6.4 * fx, -0.6 * ry + 6.4 * fy, 17.4] : [-4.4 * rx + 1 * fx, -4.4 * ry + 1 * fy, 12.5];
      var dr = ac && ac.type === "draw" ? m.clamp(ac.t / w.full, 0, 1) : 0;
      var bowBehind = Math.sin(f) < -0.2;
      function bow() {
        var nock = A.drawBow(ctx, x, y, hand, aiming ? f : f + Math.PI / 2, dr, dr >= 1 ? 0.9 : 0);
        if (ac && ac.type === "draw") A.drawArrow(ctx, nock.x, nock.y, f, 10, dr >= 1 && Math.floor(this.world.clock * 8) % 2 === 0);
      }
      if (bowBehind) bow.call(this);
      ctx.drawImage(s.cv, x - A.AX, y - A.AY);
      if (!bowBehind) bow.call(this);
      this.sword = null;
    } else {
      var sp = this.swordPose();
      var mid = A.proj(sp.hand[0] + Math.cos(sp.ang) * 6, sp.hand[1] + Math.sin(sp.ang) * 6, sp.hand[2]);
      var behind = mid.depth < 3.5 && Math.sin(sp.ang) < 0.2;
      if (behind) this.sword = A.drawSword(ctx, x, y, sp.hand, sp.ang, sp.tilt, w, sp.parry);
      ctx.drawImage(s.cv, x - A.AX, y - A.AY);
      if (!behind) this.sword = A.drawSword(ctx, x, y, sp.hand, sp.ang, sp.tilt, w, sp.parry);
      if (sp.swinging && this.sword) this.trail.push({ a: this.sword.tip, b: this.sword.base, t: this.world.clock, c: ac && ac.countered });
      var now = this.world.clock;
      this.trail = this.trail.filter(function (p) { return now - p.t < 0.12; });
      if (this.trail.length > 1) {
        var T = this.trail;
        for (var i = 1; i < T.length; i++) {
          var kk = 1 - (now - T[i].t) / 0.12;
          ctx.fillStyle = T[i].c ? "rgba(170,240,255," + (0.75 * kk) + ")" : "rgba(255,250,236," + (0.55 * kk) + ")";
          ctx.beginPath(); ctx.moveTo(T[i - 1].a.x, T[i - 1].a.y); ctx.lineTo(T[i].a.x, T[i].a.y);
          ctx.lineTo(T[i].b.x * 0.4 + T[i].a.x * 0.6, T[i].b.y * 0.4 + T[i].a.y * 0.6);
          ctx.lineTo(T[i - 1].b.x * 0.4 + T[i - 1].a.x * 0.6, T[i - 1].b.y * 0.4 + T[i - 1].a.y * 0.6);
          ctx.closePath(); ctx.fill();
        }
      }
      if (sp.guard || sp.parry) {
        var B = sp.parry ? SZ.BLOCKS.ukenagashi : SZ.BLOCKS.kamae, half = B.arc * Math.PI / 360, cy = y - 9;
        ctx.strokeStyle = sp.parry ? "rgba(140,230,245,0.85)" : "rgba(236,228,206,0.45)";
        ctx.lineWidth = 1; ctx.beginPath();
        ctx.ellipse(x, cy, 14, 9, 0, this.face - half, this.face + half); ctx.stroke();
      }
    }
    if (!hairBehind) this.hair.draw(ctx, this.appear);
    ctx.globalAlpha = 1;
    // Rotes Aufblitzen bei Treffern
    if (this.flash > 0 && !this.dead) {
      ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = Math.min(0.7, this.flash);
      ctx.drawImage(s.cv, x - A.AX, y - A.AY); ctx.restore();
    }
  };

  SZ.Player = Player;
})();
