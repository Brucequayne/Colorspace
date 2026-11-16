/* Shizuku – element-air.js
   Luft-Element. Alles wird direkt in Pixeln gezeichnet (helle Windbögen, Spiralen, gerasterte Luftkugel),
   Vegetation biegt sich gerichtet bzw. im Kreis mit (world.push mit dir / spin) und lose Halme fliegen mit.
   3. Slot (Mana):
     Linksklick tippen            → Windhieb, abwechselnd links und rechts (ähnlich den Wasserfäusten)
     Shift + Linksklick           → Windrose: Tornado um den Samurai (Laub wirbelt mit), trifft alle Gegner im Umkreis, Rückstoß
     Linksklick halten (0,5 s)    → Luftkugel, solange gehalten: durch Gegner laufen, Kontaktschaden, Dash-Rammstoß
   Passiv: Dash kostet 25 % weniger Energie; Fernkampf 30 % schneller (Feuerrate, Spannen),
           Pfeile 40 % schneller (siehe player.js)
   X (einmal pro Welle): Sturmklinge – 5 s lang schickt jeder Nahkampfangriff einen Windstoß hinterher */
(function () {
  var SZ = window.SZ, m = SZ.m, TAU = Math.PI * 2;
  var AIR = SZ.AIR_ART = {
    slash: { dmg: 6, reach: 44, arc: 0.95, dur: 0.22, hitFrom: 0.05, hitTo: 0.12, mana: 4, knock: 0.8 },
    whirl: { dmg: 8, r: 46, dur: 0.8, hitAt: 0.16, mana: 18, knock: 1.7 },
    sphere: { charge: 0.5, mana: 20, min: 10, r: 13, touch: 4, touchCd: 0.2, knock: 1.2, dashDmg: 12, dashKnock: 2.4 },
    gust: { dur: 5, dmg: 4, knock: 1.5, reach: 56, arc: 1.1 },
    passive: { rate: 1.3, draw: 1.3, arrow: 1.4, dash: 0.75 }
  };
  function rnd(a, b) { return a + Math.random() * (b - a); }
  var LEAF = ["#6E8C3A", "#8AA850", "#A4BC62", "#C8A048", "#8A6A44", "#5E8040", "#B89058"], DUST = ["#B8AE9A", "#9A9080", "#D0C6B2"];
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
    this.w = world; this.t = 0;   // gezeichnet in die Wind-Pixelebene (pal = "wind")
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
    p.act = { type: "awhirl", t: 0, dur: 0.45, hit: false };
    var h = { x: p.x, y: p.y, t: 0, spin: Math.random() < 0.5 ? 1 : -1, act: p.act, debris: [], cols: [] };
    // Farben der Pflanzen ringsum: genau dieses Laub wird hochgewirbelt
    var veg = this.w.arena.veg;
    for (var i = 0; i < veg.length; i++) { var v = veg[i]; if (Math.abs(v.x - p.x) < 50 && Math.abs(v.y - p.y) < 40 && VEGCOL[v.t]) h.cols = h.cols.concat(VEGCOL[v.t]); }
    if (!h.cols.length) h.cols = LEAF;
    for (var k = 0; k < 44; k++) this.debris(h);
    this.whirls.push(h);
    this.w.shake = Math.max(this.w.shake, 1);
    SZ.audio.play("swing_e", { x: p.x, rate: 0.9 }); SZ.audio.play("dash", { x: p.x, rate: 0.6, vol: 0.9 });
  };
  // Ein Stück Laub oder Staub im Tornado
  R.debris = function (h) {
    var leaf = Math.random() < 0.7;
    h.debris.push({ ang: Math.random() * TAU, r: rnd(6, 26), z: rnd(0, 5), vz: rnd(25, 75), w: rnd(7, 12), leaf: leaf,
                    col: leaf ? h.cols[(Math.random() * h.cols.length) | 0] : DUST[(Math.random() * DUST.length) | 0], big: Math.random() < 0.55 });
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
      if (s.t > 0.36) this.slashes.splice(i, 1);
    }
    // Windrose
    for (var j = this.whirls.length - 1; j >= 0; j--) {
      var h = this.whirls[j]; h.t += dt; h.x = p.x; h.y = p.y;
      var W = AIR.whirl, u = h.t / W.dur;
      if (h.t < W.dur) {
        w.push(p.x, p.y, W.r * (0.6 + u * 0.7), 5, 0.5, { spin: h.spin });
        if (Math.random() < dt * 30) tear(w, p.x, p.y, W.r * (0.4 + u * 0.6), 1, null, h.spin);
        if (h.t < W.dur * 0.6 && Math.random() < dt * 60) this.debris(h);
        if (Math.random() < dt * 20) w.parts.dust(p.x + rnd(-20, 20), p.y + rnd(-8, 8), 1, DUST[(Math.random() * 3) | 0]);
      }
      // Laub und Staub kreisen im Trichter nach oben
      for (var di = h.debris.length - 1; di >= 0; di--) {
        var d0 = h.debris[di];
        d0.ang += d0.w * h.spin * dt; d0.z = Math.min(46, d0.z + d0.vz * dt); d0.vz *= Math.pow(0.6, dt);
        d0.r += ((10 + d0.z * 0.6) * (0.6 + Math.min(1, h.t / 0.2) * 0.5) - d0.r) * Math.min(1, dt * 5);
        if (h.t >= W.dur) {   // am Ende fliegt alles tangential davon
          var ta = d0.ang + h.spin * Math.PI / 2, sp = rnd(60, 130);
          if (d0.leaf) w.parts.add({ type: "leaf", x: h.x + Math.cos(d0.ang) * d0.r, y: h.y + Math.sin(d0.ang) * d0.r * 0.45, z: d0.z, vx: Math.cos(ta) * sp + Math.cos(d0.ang) * 40, vy: (Math.sin(ta) * sp + Math.sin(d0.ang) * 40) * 0.5, vz: rnd(5, 25), life: rnd(1.5, 3), col: d0.col, ph: Math.random() * 6.28, ground: 0 });
          h.debris.splice(di, 1);
        }
      }
      if (!h.hit && h.t >= W.hitAt) {
        h.hit = true;
        w.enemies.forEach(function (e) {
          if (e.dead || e.state === "spawn") return;
          var d = m.dist(p.x, p.y, e.x, e.y);
          if (d < W.r + e.D.radius) { var a = Math.atan2(e.y - p.y, e.x - p.x); hitEnemy(w, e, W.dmg, a, W.knock); }
        });
        tear(w, p.x, p.y, W.r, 10, null, h.spin);
        w.shake = Math.max(w.shake, 2);
        w.parts.dust(p.x, p.y, 10, "#C8BEA8");
      }
      if (h.t > W.dur + 0.15) this.whirls.splice(j, 1);
    }
    // Luftkugel
    if (p.sphere) {
      var Q = AIR.sphere, sp = p.sphere, dashing = ac && ac.type === "dash";
      sp.t += dt;
      p.mana = Math.max(0, p.mana - Q.mana * SZ.perk.mana(p) * dt); p.manaT = 0;
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

  // ---------- Zeichnen: dicke Windböen ----------
  // Böen sind Sichel-Bänder (in der Mitte dick, an den Enden spitz) mit hellen Strähnen und dunklerem Außenrand.
  // Gezeichnet in die Wind-Pixelebene (world.fxLayer, Palette SZ.WIND_PAL): grob, halbtransparent, wie dichte Luft.
  SZ.WIND_PAL = [244, 248, 246, 222, 232, 232, 196, 210, 212, 166, 184, 188, 136, 154, 160, 206, 196, 176];
  var C_BODY = "rgba(196,210,212,0.62)", C_EDGE = "rgba(150,168,172,0.8)", C_HI = "rgba(240,246,244,0.9)", C_MID = "rgba(222,232,232,0.75)", C_DUST = "rgba(206,196,176,0.65)";
  // Winkelbereich a0…a1 (beliebige Richtung) in Teilstücke vorne/hinten zerlegen (front: true/false, undefined = alles)
  function parts(a0, a1, front) {
    if (front === undefined) return [[a0, a1, 0, 1]];
    var out = [], n = Math.max(8, Math.ceil(Math.abs(a1 - a0) * 12)), cur = null;
    for (var i = 0; i <= n; i++) {
      var s = i / n, an = a0 + (a1 - a0) * s, ok = (Math.sin(an) >= 0) === front;
      if (ok && !cur) cur = [an, an, s, s];
      if (ok) { cur[1] = an; cur[3] = s; }
      if (!ok && cur) { out.push(cur); cur = null; }
    }
    if (cur) out.push(cur);
    return out;
  }
  // Sichel-Band: äußerer Radius r, Dicke w (Mitte), Ellipse ry/r
  function band(ctx, cx, cy, r, k, a0, a1, w, col, front) {
    parts(a0, a1, front).forEach(function (pt) {
      var b0 = pt[0], b1 = pt[1], s0 = pt[2], s1 = pt[3], n = Math.max(4, Math.ceil(Math.abs(b1 - b0) * r / 2.5));
      ctx.fillStyle = col; ctx.beginPath();
      for (var i = 0; i <= n; i++) { var q = i / n, an = b0 + (b1 - b0) * q; i ? ctx.lineTo(cx + Math.cos(an) * r, cy + Math.sin(an) * r * k) : ctx.moveTo(cx + Math.cos(an) * r, cy + Math.sin(an) * r * k); }
      for (var j = n; j >= 0; j--) {
        var q2 = j / n, an2 = b0 + (b1 - b0) * q2, gs = s0 + (s1 - s0) * q2, tp = Math.pow(Math.max(0, Math.sin(gs * Math.PI)), 0.7), ri = Math.max(0, r - w * tp);
        ctx.lineTo(cx + Math.cos(an2) * ri, cy + Math.sin(an2) * ri * k);
      }
      ctx.closePath(); ctx.fill();
    });
  }
  // Strähne: Linie entlang einer Ellipse
  function streak(ctx, cx, cy, r, k, a0, a1, lw, col, front) {
    parts(a0, a1, front).forEach(function (pt) {
      var b0 = pt[0], b1 = pt[1], n = Math.max(3, Math.ceil(Math.abs(b1 - b0) * r / 3));
      ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.lineCap = "round"; ctx.beginPath();
      for (var i = 0; i <= n; i++) { var an = b0 + (b1 - b0) * i / n; i ? ctx.lineTo(cx + Math.cos(an) * r, cy + Math.sin(an) * r * k) : ctx.moveTo(cx + Math.cos(an) * r, cy + Math.sin(an) * r * k); }
      ctx.stroke();
    });
  }
  // Eine volle Böe: Band + dunkler Rand + helle Strähnen innen
  function gustBand(ctx, cx, cy, r, k, a0, a1, w, alpha, front, dusty) {
    ctx.globalAlpha = alpha;
    band(ctx, cx, cy, r + 1, k, a0, a1, w * 0.45, C_EDGE, front);
    band(ctx, cx, cy, r, k, a0, a1, w, dusty ? C_DUST : C_BODY, front);
    var span = a1 - a0;
    streak(ctx, cx, cy, r - w * 0.3, k, a0 + span * 0.12, a1 - span * 0.18, Math.max(1.2, w * 0.22), C_HI, front);
    streak(ctx, cx, cy, r - w * 0.62, k, a0 + span * 0.3, a1 - span * 0.1, Math.max(1, w * 0.16), C_MID, front);
    ctx.globalAlpha = 1;
  }

  R.pal = "wind";
  R.drawLow = function (ctx) {
    var p = this.w.player, t = this.t;
    if (p && p.sphere) drawSphere(ctx, p, t, false);
    this.whirls.forEach(function (h) { drawTornado(ctx, h, t, false); });
    if (p && p.airBuff > 0) drawAura(ctx, p, t, false);
  };
  R.draw = function (ctx) {
    var p = this.w.player, t = this.t;
    // Windhieb: dicke Sichel, die nach vorn ausholt, zwei kleinere Böen folgen
    this.slashes.forEach(function (s) {
      var u = s.t / 0.36, ext = m.easeOutCubic(Math.min(1, s.t / 0.1)), fade = 1 - Math.max(0, (u - 0.5) / 0.5);
      var R2 = 18 + AIR.slash.reach * 0.8 * ext, half = AIR.slash.arc * 0.72, sweep = Math.min(1, s.t / 0.07);
      var a0 = s.a - half * s.side, a1 = a0 + 2 * half * s.side * sweep, cy = p.y - 10;
      if (s.side < 0) { var tmp = a0; a0 = a1; a1 = tmp; }
      gustBand(ctx, p.x, cy, R2, 0.7, a0, a1, 14 * (0.6 + ext * 0.4), fade, undefined);
      gustBand(ctx, p.x, cy, R2 - 11, 0.7, a0 + 0.15, a1 - 0.1, 7, fade * 0.85, undefined);
      if (ext > 0.5) gustBand(ctx, p.x, cy, R2 + 8, 0.7, a0 + 0.3, a1 - 0.3, 5, fade * 0.7, undefined);
    });
    this.whirls.forEach(function (h) { drawTornado(ctx, h, t, true); });
    if (p && p.sphere) drawSphere(ctx, p, t, true);
    // Laden: Böen ziehen sich spiralförmig zusammen
    if (this.charging) {
      var q = Math.min(1, this.charging.t / AIR.sphere.charge);
      for (var k = 0; k < 3; k++) { var aa = t * 9 + k * TAU / 3, rr = 24 - q * 9; gustBand(ctx, p.x, p.y - 10, rr, 0.6, aa, aa + 1.3, 4 + q * 3, 0.6 + q * 0.4, undefined); }
    }
    // Sturmklinge: Windstoß als große, dicke Welle
    this.gusts.forEach(function (g) {
      var G = AIR.gust, reach = 10 + G.reach * m.easeOutCubic(Math.min(1, g.t / 0.18)), fade = 1 - Math.max(0, (g.t - 0.14) / 0.16);
      gustBand(ctx, g.x, g.y - 10, reach, 0.6, g.a - G.arc * 0.55, g.a + G.arc * 0.55, 14, fade, undefined);
      gustBand(ctx, g.x, g.y - 10, reach - 12, 0.6, g.a - G.arc * 0.4, g.a + G.arc * 0.4, 7, fade * 0.8, undefined);
    });
    if (p && p.airBuff > 0) drawAura(ctx, p, t, true);
  };
  // Luftkugel: dicke Böen kreisen in mehreren Neigungen um den Samurai (vorne/hinten getrennt)
  function drawSphere(ctx, p, t, front) {
    var Q = AIR.sphere, grow = m.easeOutCubic(Math.min(1, p.sphere.t / 0.2)), r = (Q.r + 4) * grow, cy = p.y - 11;
    var tilt = [0.32, 0.55, 0.8, 0.45], sp = [7, -6, 8.5, -7.5];
    for (var k = 0; k < 4; k++) {
      var a0 = t * sp[k] + k * 1.7;
      gustBand(ctx, p.x, cy, r + (k % 2) * 2, tilt[k], a0, a0 + 2.3, 6, 0.95, front);
    }
    if (!front) { ctx.globalAlpha = 0.5; band(ctx, p.x, p.y, r * 0.9, 0.42, 0, TAU, 4, C_BODY); ctx.globalAlpha = 1; }   // Luftdruck am Boden
  }
  // Sturmklinge aktiv: zwei Böen kreisen um den Samurai
  function drawAura(ctx, p, t, front) {
    for (var k = 0; k < 2; k++) { var b0 = t * (k ? 7 : -6) + k * 2; gustBand(ctx, p.x, p.y - 10 + k * 4, 13, 0.42, b0, b0 + 1.8, 4, 0.8, front); }
  }
  // Tornado: übereinander liegende, dicke Böen, die sich nach oben weiten und unterschiedlich schnell drehen
  function drawTornado(ctx, h, t, front) {
    var W = AIR.whirl, u = h.t / W.dur, grow = m.easeOutCubic(Math.min(1, h.t / 0.16)), fade = 1 - Math.max(0, (u - 0.75) / 0.3);
    if (fade <= 0) return;
    var spread = 1 + Math.max(0, u - 0.75) * 1.6;
    for (var k = 0; k < 6; k++) {
      var z = k * 7, r = (11 + k * 4.6) * grow * spread, cy = h.y - z, sp = (13 - k * 1.1) * h.spin, w = 6 + k * 1.1;
      for (var j = 0; j < 2; j++) {
        var a0 = t * sp + k * 1.1 + j * Math.PI, len = 1.9 + (k % 2) * 0.5;
        var lo = Math.min(a0, a0 + len * h.spin), hi = Math.max(a0, a0 + len * h.spin);
        gustBand(ctx, h.x, cy, r, 0.42, lo, hi, w, fade * (j ? 0.8 : 1), front, k < 2);
      }
    }
    // Druckwelle im Trefferzeitpunkt: dicker Ring nach außen
    if (front && h.t > W.hitAt && h.t < W.hitAt + 0.25) {
      var q = (h.t - W.hitAt) / 0.25, rr = 14 + (W.r + 12) * m.easeOutCubic(q);
      gustBand(ctx, h.x, h.y, rr, 0.45, 0, TAU, 7 * (1 - q) + 2, 1 - q, undefined);
    }
    if (!front) { ctx.globalAlpha = fade * 0.6; band(ctx, h.x, h.y, 22 * grow, 0.45, 0, TAU, 6, C_DUST); ctx.globalAlpha = 1; }   // Staub am Boden
  }
  // Laub und Staub im Tornado in Originalfarben (nicht durch die Wind-Palette)
  function drawDebris(ctx, h, t, front) {
    var W = AIR.whirl, u = h.t / W.dur, fade = 1 - Math.max(0, (u - 0.75) / 0.3), spread = 1 + Math.max(0, u - 0.75) * 1.6;
    if (fade <= 0) return;
    h.debris.forEach(function (d) {
      var sn = Math.sin(d.ang); if ((sn >= 0) !== front) return;
      var x = Math.round(h.x + Math.cos(d.ang) * d.r * spread), y = Math.round(h.y + sn * d.r * 0.42 * spread - d.z);
      ctx.globalAlpha = fade; ctx.fillStyle = d.col;
      ctx.fillRect(x, y, d.big ? 2 : 1, d.leaf && d.big ? 1 : d.big ? 2 : 1);
      if (d.leaf && d.big && (Math.floor(t * 20 + d.r) % 2)) ctx.fillRect(x, y + 1, 1, 1);
      ctx.globalAlpha = 1;
    });
  }
  R.drawTopLow = function (ctx) { var t = this.t; this.whirls.forEach(function (h) { drawDebris(ctx, h, t, false); }); };
  R.drawTop = function (ctx) { var t = this.t; this.whirls.forEach(function (h) { drawDebris(ctx, h, t, true); }); };

  SZ.airArts = function (world) {
    if (!world.airArts) world.airArts = new Arts(world);
    if (world.fx.indexOf(world.airArts) < 0) world.fx.push(world.airArts);
    return world.airArts;
  };
})();
