/* Shizuku – element-air.js
   Luft-Element. Alles wird direkt in Pixeln gezeichnet (helle Windbögen, Spiralen, gerasterte Luftkugel),
   Vegetation biegt sich gerichtet bzw. im Kreis mit (world.push mit dir / spin) und lose Halme fliegen mit.
   3. Slot (Mana):
     Linksklick tippen            → Windhieb, abwechselnd links und rechts (ähnlich den Wasserfäusten)
     Shift + Linksklick           → Windrose: Wirbel um den Samurai, trifft alle Gegner im Umkreis, Rückstoß
     Linksklick halten (1 s)      → Luftkugel, solange gehalten: durch Gegner laufen, Kontaktschaden, Dash-Rammstoß
   Passiv: bei voller Energie ist der Dash luftig und kostet nichts; Fernkampf 30 % schneller (Feuerrate, Spannen),
           Pfeile 40 % schneller (siehe player.js)
   X (einmal pro Welle): Sturmklinge – 5 s lang schickt jeder Nahkampfangriff einen Windstoß hinterher */
(function () {
  var SZ = window.SZ, m = SZ.m, TAU = Math.PI * 2;
  var AIR = SZ.AIR_ART = {
    slash: { dmg: 6, reach: 44, arc: 0.95, dur: 0.22, hitFrom: 0.05, hitTo: 0.12, mana: 4, knock: 0.8 },
    whirl: { dmg: 8, r: 46, dur: 0.5, hitAt: 0.12, mana: 18, knock: 1.7 },
    sphere: { charge: 1.0, mana: 20, min: 10, r: 13, touch: 5, touchCd: 0.45, knock: 1.4, dashDmg: 12, dashKnock: 2.4 },
    gust: { dur: 5, dmg: 4, knock: 1.5, reach: 56, arc: 1.1 },
    passive: { rate: 1.3, draw: 1.3, arrow: 1.4 }
  };
  var COL = ["#FFFFFF", "#E8F0EE", "#C8D8D6", "#A8BCBC"];
  var BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  function rnd(a, b) { return a + Math.random() * (b - a); }
  // ein Pixel mit gerasterter Deckkraft (a 0…1) – kein weicher Rand, passend zum Pixel-Look
  function px(ctx, x, y, col, a) {
    x = Math.round(x); y = Math.round(y);
    if (a < 1 && a * 16 <= BAY[(y & 3) * 4 + (x & 3)]) return;
    ctx.fillStyle = col; ctx.fillRect(x, y, 1, 1);
  }
  // Bogen aus Pixeln: Mittelpunkt, Radien, Winkel a0…a1, Deckkraft läuft zu den Enden hin aus
  function arcPx(ctx, cx, cy, r, ry, a0, a1, col, a) {
    var n = Math.max(4, Math.ceil(Math.abs(a1 - a0) * r * 1.2));
    for (var i = 0; i <= n; i++) {
      var s = i / n, an = a0 + (a1 - a0) * s, edge = Math.min(1, Math.sin(s * Math.PI) * 2.2);
      px(ctx, cx + Math.cos(an) * r, cy + Math.sin(an) * ry, col, a * edge);
    }
  }

  // ---------- Vegetation: biegen und lose Halme losreißen ----------
  var VEGCOL = { grass: ["#6E8C3A", "#8AA850", "#A4BC62"], tallgrass: ["#7A9440", "#9AB058", "#B8C878"], wheat: ["#D8B860", "#C8A048", "#E8CC78"],
                 wildflower: ["#E8D060", "#D86A8A", "#FFFFFF", "#8AA850"], flower: ["#F2A6C0", "#FFFFFF", "#E8D060", "#8AA850"], fern: ["#5E8040", "#7A9A50"],
                 reed: ["#8A9A5A", "#B0B878"], lotus: ["#F2C0D0", "#6E9C60"], lily: ["#6E9C60", "#FFFFFF"] };
  function tear(w, x, y, r, n, ang, spin) {
    var veg = w.arena.veg, hits = [];
    for (var i = 0; i < veg.length; i++) { var v = veg[i]; if (Math.abs(v.x - x) < r && Math.abs(v.y - y) < r * 0.8 && VEGCOL[v.t]) hits.push(v); }
    for (var k = 0; k < n && hits.length; k++) {
      var v2 = hits[(Math.random() * hits.length) | 0], cols = VEGCOL[v2.t], a = ang != null ? ang + rnd(-0.5, 0.5) : Math.atan2(v2.y - y, v2.x - x) + (spin || 0) * Math.PI / 2 + rnd(-0.4, 0.4), s = rnd(40, 110);
      w.parts.add({ type: "leaf", x: v2.x + rnd(-2, 2), y: v2.y, z: rnd(2, 7), vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.6, vz: rnd(4, 16), life: rnd(1.2, 2.6), col: cols[(Math.random() * cols.length) | 0], ph: Math.random() * 6.28, ground: 0 });
    }
  }
  SZ.windTear = tear;

  function Arts(world) {
    this.w = world; this.t = 0; this.raw = true;   // raw: nicht durch die Wasser-Pixelebene (eigener Pixel-Look)
    this.slashes = []; this.gusts = []; this.whirls = []; this.press = null; this.charging = null;
  }
  var R = Arts.prototype;
  R.idle = function () { var p = this.w.player; return !this.slashes.length && !this.gusts.length && !this.whirls.length && !this.charging && !(p && (p.sphere || p.airBuff > 0)); };

  // ---------- Eingabe (Element-Slot aktiv) ----------
  R.input = function (p, dt, I) {
    var ac = p.act;
    if (p.sphere) { if (!I.lmb || p.mana <= 0.01) this.endSphere(p); return; }
    if (I.lmbHit && I.down("Shift")) { if (!ac) this.whirl(p); this.press = null; return; }
    if (I.lmbHit) {
      if (!ac) this.press = { t: 0, charging: false };
      else if (ac.type === "aslash" && ac.t > ac.dur * 0.35) ac.queued = true;
    }
    var pr = this.press;
    if (pr) {
      pr.t += dt;
      if (!I.lmb) {
        if (pr.charging && p.act && p.act.type === "acharge") p.act = null;
        if (!pr.charging && !p.act) this.slash(p);
        else if (pr.charging && !p.act) this.slash(p);   // zu früh losgelassen: normaler Windhieb
        this.press = null;
      } else if (!pr.charging && pr.t >= 0.16 && !p.act) { pr.charging = true; p.act = { type: "acharge", t: 0 }; }
      else if (pr.charging && p.act && p.act.type === "acharge" && p.act.t >= AIR.sphere.charge) {
        p.act = null; this.press = null;
        if (p.mana >= AIR.sphere.min) this.startSphere(p); else this.empty(p);
      } else if (pr.charging && (!p.act || p.act.type !== "acharge")) this.press = null;
    }
  };
  R.empty = function (p) { if (!this.emptyT || this.t - this.emptyT > 0.4) { this.emptyT = this.t; p.manaFlash = 0.5; SZ.audio.play("block", { vol: 0.2, rate: 1.7 }); } };
  R.slash = function (p, side) {
    if (!p.useMana(AIR.slash.mana)) { this.empty(p); return; }
    this.side = side || -(this.side || 1);
    p.act = { type: "aslash", t: 0, dur: AIR.slash.dur, side: this.side, hits: [], ang: p.face };
    this.slashes.push({ act: p.act, x: p.x, y: p.y, a: p.face, side: this.side, t: 0 });
    var w = this.w;
    w.push(p.x + Math.cos(p.face) * 24, p.y + Math.sin(p.face) * 24, 34, 3.5, 0.7, { dir: p.face });
    tear(w, p.x + Math.cos(p.face) * 26, p.y + Math.sin(p.face) * 26, 22, 4, p.face);
    SZ.audio.play("swing", { x: p.x, rate: 1.35, vol: 0.7 });
    if (p.airBuff > 0) this.gust(p, p.face);
  };
  R.whirl = function (p) {
    if (!p.useMana(AIR.whirl.mana)) { this.empty(p); return; }
    p.act = { type: "awhirl", t: 0, dur: AIR.whirl.dur, hit: false };
    this.whirls.push({ x: p.x, y: p.y, t: 0, spin: Math.random() < 0.5 ? 1 : -1, act: p.act });
    SZ.audio.play("swing_e", { x: p.x, rate: 1.1 }); SZ.audio.play("dash", { x: p.x, rate: 0.8, vol: 0.8 });
  };
  R.startSphere = function (p) {
    p.sphere = { t: 0, touch: new Map(), dashHit: [] };
    p.spend();
    this.w.parts.swirl(p.x, p.y, 10, 1, 0.6); this.w.parts.swirl(p.x, p.y, 7, -1, 0.5);
    SZ.audio.play("dash", { x: p.x, rate: 0.7, vol: 0.9 });
  };
  R.endSphere = function (p) {
    if (!p.sphere) return;
    p.sphere = null;
    this.w.push(p.x, p.y, 30, 3, 0.6); this.w.parts.swirl(p.x, p.y, 12, -1, 0.5);
    SZ.audio.play("dash", { x: p.x, rate: 1.2, vol: 0.6 });
  };
  // Sturmklinge (X): Windstoß hinter einem Nahkampfangriff her
  R.gust = function (p, ang) {
    this.gusts.push({ x: p.x, y: p.y, a: ang, t: 0, hits: [] });
    SZ.audio.play("dash", { x: p.x, rate: 1.35, vol: 0.55 });
  };
  // Luftiger Dash (Passiv): Wind entlang der Bahn
  R.dashTrail = function (p, ang) {
    var w = this.w;
    w.push(p.x, p.y, 30, 4, 0.7, { dir: ang });
    tear(w, p.x, p.y, 16, 2, ang);
    for (var i = 0; i < 2; i++) w.parts.wind(p.x + rnd(-6, 6), p.y - rnd(2, 20), ang, rnd(14, 26), 0.35, 0.9);
  };

  // ---------- Treffer ----------
  function hitEnemy(w, e, dmg, ang, knock) {
    e.hurt(dmg, ang, e.D.armored ? 0 : knock, "wind");
    if (!e.D.armored) e.knockT = 0.45;   // erzwungene Bewegung: kann über die Kante fliegen
    for (var i = 0; i < 3; i++) w.parts.wind(e.x + rnd(-4, 4), e.y - rnd(4, 18), ang, rnd(10, 18), 0.3, 0.9);
  }
  R.update = function (dt) {
    this.t += dt;
    var w = this.w, p = w.player, self = this;
    if (!p) return true;
    var ac = p.act;
    // Windhiebe
    for (var i = this.slashes.length - 1; i >= 0; i--) {
      var s = this.slashes[i]; s.t += dt;
      if (s.act === ac && ac.t >= AIR.slash.hitFrom && ac.t - dt < AIR.slash.hitTo) {
        var S = AIR.slash;
        w.enemies.forEach(function (e) {
          if (e.dead || e.state === "spawn" || ac.hits.indexOf(e) >= 0) return;
          var d = m.dist(p.x, p.y, e.x, e.y), a = Math.atan2(e.y - p.y, e.x - p.x);
          if (d < S.reach + e.D.radius && Math.abs(m.angDiff(s.a, a)) < S.arc * 0.5 + 6 / Math.max(8, d)) { ac.hits.push(e); hitEnemy(w, e, S.dmg, a, S.knock); SZ.audio.play("hit_flesh", { x: e.x, vol: 0.45, rate: 1.2 }); }
        });
      }
      if (s.t > 0.32) this.slashes.splice(i, 1);
    }
    // Windrose
    for (var j = this.whirls.length - 1; j >= 0; j--) {
      var h = this.whirls[j]; h.t += dt; h.x = p.x; h.y = p.y;
      var W = AIR.whirl, u = h.t / W.dur;
      if (h.t < W.dur) { w.push(p.x, p.y, W.r * (0.5 + u * 0.7), 4.5, 0.5, { spin: h.spin }); if (Math.random() < dt * 30) tear(w, p.x, p.y, W.r * (0.4 + u * 0.6), 1, null, h.spin); }
      if (!h.hit && h.t >= W.hitAt) {
        h.hit = true;
        w.enemies.forEach(function (e) {
          if (e.dead || e.state === "spawn") return;
          var d = m.dist(p.x, p.y, e.x, e.y);
          if (d < W.r + e.D.radius) { var a = Math.atan2(e.y - p.y, e.x - p.x); hitEnemy(w, e, W.dmg, a, W.knock); }
        });
        tear(w, p.x, p.y, W.r, 10, null, h.spin);
        w.shake = Math.max(w.shake, 1.2);
      }
      if (h.t > W.dur + 0.15) this.whirls.splice(j, 1);
    }
    // Luftkugel
    if (p.sphere) {
      var Q = AIR.sphere, sp = p.sphere, dashing = ac && ac.type === "dash";
      sp.t += dt;
      p.mana = Math.max(0, p.mana - Q.mana * dt); p.manaT = 0;
      w.push(p.x, p.y, 22, 2.5, 0.35, { spin: 1 });
      if (Math.random() < dt * 6) tear(w, p.x, p.y, 16, 1, null, 1);
      if (!dashing) sp.dashHit = [];
      w.enemies.forEach(function (e) {
        if (e.dead || e.state === "spawn") return;
        var d = m.dist(p.x, p.y, e.x, e.y), a = Math.atan2(e.y - p.y, e.x - p.x);
        if (d > Q.r + e.D.radius + (dashing ? 4 : 0)) return;
        if (dashing && sp.dashHit.indexOf(e) < 0) {   // Rammstoß im Dash
          sp.dashHit.push(e); hitEnemy(w, e, Q.dashDmg, a, Q.dashKnock); w.shake = Math.max(w.shake, 1.5);
          SZ.audio.play("hit_flesh", { x: e.x, rate: 0.9 });
        } else if (!dashing && (sp.touch.get(e) || 0) <= sp.t) {
          sp.touch.set(e, sp.t + Q.touchCd); hitEnemy(w, e, Q.touch, a, Q.knock);
          SZ.audio.play("hit_flesh", { x: e.x, vol: 0.4, rate: 1.25 });
        }
      });
    }
    // Sturmklinge: Windstöße
    if (p.airBuff > 0) {
      p.airBuff -= dt;
      if (Math.random() < dt * 8) w.parts.wind(p.x + rnd(-6, 6), p.y - rnd(4, 22), rnd(0, TAU), rnd(8, 14), 0.3, 0.6);
      if (p.airBuff <= 0) { p.airBuff = 0; SZ.audio.play("dash", { x: p.x, rate: 1.5, vol: 0.4 }); }
    }
    for (var k = this.gusts.length - 1; k >= 0; k--) {
      var g = this.gusts[k], G = AIR.gust; g.t += dt;
      var reach = G.reach * Math.min(1, g.t / 0.18);
      w.enemies.forEach(function (e) {
        if (e.dead || e.state === "spawn" || g.hits.indexOf(e) >= 0) return;
        var d = m.dist(g.x, g.y, e.x, e.y), a = Math.atan2(e.y - g.y, e.x - g.x);
        if (d < reach + e.D.radius && d > reach - 18 && Math.abs(m.angDiff(g.a, a)) < G.arc * 0.5) { g.hits.push(e); hitEnemy(w, e, G.dmg, a, G.knock); }
      });
      if (g.t < 0.2) w.push(g.x + Math.cos(g.a) * reach, g.y + Math.sin(g.a) * reach, 26, 3.5, 0.6, { dir: g.a });
      if (g.t > 0.3) this.gusts.splice(k, 1);
    }
    // Laden: Wind sammelt sich
    this.charging = ac && ac.type === "acharge" ? ac : null;
    if (this.charging && Math.random() < dt * 20) {
      var ra = Math.random() * TAU;
      w.parts.wind(p.x + Math.cos(ra) * 18, p.y + Math.sin(ra) * 10 - 10, ra + Math.PI + 0.6, rnd(8, 14), 0.25, 0.7);
      w.push(p.x, p.y, 18, 1.5 + ac.t * 2, 0.3, { spin: 1 });
    }
    return true;
  };

  // ---------- Zeichnen (direkt in Pixeln) ----------
  R.drawLow = function (ctx) {
    var p = this.w.player, t = this.t;
    // Schatten der Luftkugel und Wirbel am Boden: helle, gerasterte Ringe
    if (p && p.sphere) { var r = AIR.sphere.r + 2 + Math.sin(t * 9); arcPx(ctx, p.x, p.y, r, r * 0.45, 0, TAU, COL[2], 0.45); }
    this.whirls.forEach(function (h) {
      var u = Math.min(1, h.t / AIR.whirl.dur), R2 = AIR.whirl.r * (0.3 + u * 0.75), fade = 1 - Math.max(0, (h.t - AIR.whirl.dur * 0.6) / (AIR.whirl.dur * 0.55));
      for (var k = 0; k < 3; k++) arcPx(ctx, h.x, h.y, R2 * (0.6 + k * 0.2), R2 * (0.6 + k * 0.2) * 0.5, t * 9 * h.spin + k * 2, t * 9 * h.spin + k * 2 + 2.2, COL[1 + k % 2], 0.7 * fade);
    });
  };
  R.draw = function (ctx) {
    var p = this.w.player, t = this.t, self = this;
    // Windhiebe: Sichel aus drei Bögen, öffnet sich nach vorn
    this.slashes.forEach(function (s) {
      var u = s.t / 0.32, ext = m.easeOutCubic(Math.min(1, s.t / 0.12)), fade = 1 - Math.max(0, (u - 0.35) / 0.65);
      var R2 = 12 + AIR.slash.reach * 0.75 * ext, half = AIR.slash.arc * 0.5, a0 = s.a - half * s.side, a1 = s.a + half * s.side;
      var cx = p.x, cy = p.y - 10;
      for (var k = 0; k < 3; k++) arcPx(ctx, cx, cy, R2 - k * 4, (R2 - k * 4) * 0.62, a0 + s.side * k * 0.12, a1, COL[k], fade * (1 - k * 0.2));
    });
    // Windrose: Spiralarme, die sich nach außen drehen
    this.whirls.forEach(function (h) {
      var W = AIR.whirl, u = Math.min(1, h.t / W.dur), R2 = W.r * (0.3 + u * 0.75), fade = 1 - Math.max(0, (h.t - W.dur * 0.6) / (W.dur * 0.55));
      for (var k = 0; k < 8; k++) {
        var base = k * TAU / 8 + h.t * 11 * h.spin;
        for (var i = 0; i <= 24; i++) {
          var s = i / 24, an = base + s * 1.5 * h.spin, rr = 5 + R2 * s, yy = h.y - 8 + Math.sin(an) * rr * 0.5 - s * 4;
          px(ctx, h.x + Math.cos(an) * rr, yy, COL[i % 2], fade * (0.65 + s * 0.35));
          if (s > 0.5) px(ctx, h.x + Math.cos(an) * (rr + 1), yy + 1, COL[2], fade * 0.7);
        }
      }
    });
    // Luftkugel: rotierende Streifen und ein heller Rand
    if (p && p.sphere) {
      var Q = AIR.sphere, cx2 = p.x, cy2 = p.y - 11, r = Q.r + Math.sin(t * 7) * 0.8, grow = Math.min(1, p.sphere.t / 0.2);
      arcPx(ctx, cx2, cy2, r * grow, r * grow * 0.95, 0, TAU, COL[1], 0.35);
      for (var k2 = 0; k2 < 4; k2++) {
        var a0 = t * (k2 % 2 ? 6 : -5) + k2 * 1.6, tilt = 0.35 + k2 * 0.18;
        arcPx(ctx, cx2, cy2, r * grow, r * grow * tilt, a0, a0 + 1.9, COL[k2 % 2], 0.85);
      }
    }
    // Laden: Spirale zieht sich zusammen
    if (this.charging) {
      var c = this.charging, q = Math.min(1, c.t / AIR.sphere.charge);
      for (var k3 = 0; k3 < 3; k3++) {
        var aa = t * 8 + k3 * TAU / 3;
        for (var i2 = 0; i2 <= 10; i2++) { var s2 = i2 / 10, rr2 = (20 - q * 8) * (1 - s2 * 0.6); px(ctx, p.x + Math.cos(aa + s2 * 2) * rr2, p.y - 11 + Math.sin(aa + s2 * 2) * rr2 * 0.6, COL[i2 % 2], 0.4 + q * 0.5); }
      }
    }
    // Sturmklinge: Windstoß als große Sichel
    this.gusts.forEach(function (g) {
      var G = AIR.gust, reach = G.reach * m.easeOutCubic(Math.min(1, g.t / 0.18)), fade = 1 - Math.max(0, (g.t - 0.15) / 0.15);
      for (var k = 0; k < 2; k++) arcPx(ctx, g.x, g.y - 10, reach - k * 5, (reach - k * 5) * 0.6, g.a - G.arc * 0.5, g.a + G.arc * 0.5, COL[k], fade);
    });
    // Sturmklinge aktiv: Windbänder um den Samurai
    if (p && p.airBuff > 0) {
      for (var k4 = 0; k4 < 2; k4++) { var b0 = t * (k4 ? 7 : -6) + k4 * 2; arcPx(ctx, p.x, p.y - 10, 11, 5, b0, b0 + 1.6, COL[k4], 0.75); }
    }
  };

  SZ.airArts = function (world) {
    if (!world.airArts) world.airArts = new Arts(world);
    if (world.fx.indexOf(world.airArts) < 0) world.fx.push(world.airArts);
    return world.airArts;
  };
})();
