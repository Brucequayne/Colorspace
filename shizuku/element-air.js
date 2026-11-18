/* Shizuku – element-air.js
   Luft-Element. Alles wird direkt in Pixeln gezeichnet (helle Windbögen, Spiralen, gerasterte Luftkugel),
   Vegetation biegt sich gerichtet bzw. im Kreis mit (world.push mit dir / spin) und lose Halme fliegen mit.
   3. Slot (Mana):
     Linksklick tippen            → Windhieb, abwechselnd links und rechts (ähnlich den Wasserfäusten)
     Shift + Linksklick           → Windrose: Tornado um den Samurai (Laub wirbelt mit), trifft alle Gegner im Umkreis, Rückstoß
     Linksklick halten (0,5 s)    → Sturm: ein wilder Tornado entsteht am Fadenkreuz und folgt ihm, solange gehalten;
                                    saugt Gegner an, wirbelt sie herum, schleudert sie am Ende hinaus
   Passiv: Dash kostet 25 % weniger Energie; Fernkampf 30 % schneller (Feuerrate, Spannen),
           Pfeile 40 % schneller (siehe player.js)
   X (einmal pro Welle): Sturmklinge – 5 s lang schickt jeder Nahkampfangriff einen Windstoß hinterher */
(function () {
  var SZ = window.SZ, m = SZ.m, TAU = Math.PI * 2;
  var AIR = SZ.AIR_ART = {
    slash: { dmg: 6, reach: 44, arc: 0.95, dur: 0.22, hitFrom: 0.05, hitTo: 0.12, mana: 4, knock: 0.8 },
    whirl: { dmg: 8, r: 46, dur: 0.8, hitAt: 0.16, mana: 18, knock: 1.7 },
    // Sturm (halten): wilder Tornado am Fadenkreuz, folgt dem Fadenkreuz, solange gehalten wird
    storm: { charge: 0.5, mana: 22, min: 12, r: 20, tick: 0.2, dmg: 4, speed: 105, fling: 1.9 },
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
  R.idle = function () { var p = this.w.player; return !this.slashes.length && !this.gusts.length && !this.whirls.length && !this.charging && !this.storm && !(p && p.airBuff > 0); };

  // ---------- Eingabe (Element-Slot aktiv) ----------
  R.input = function (p, dt, I) {
    var ac = p.act;
    if (this.storm) { if (!I.lmb || p.mana <= 0.01 || p.act !== this.storm.act) this.endStorm(p); return; }
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
      else if (pr.charging && p.act && p.act.type === "acharge" && p.act.t >= AIR.storm.charge) {
        p.act = null; this.press = null;
        if (p.mana >= AIR.storm.min) this.startStorm(p, I); else this.empty(p);
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
  // Sturm beschwören: der Tornado entsteht direkt am Fadenkreuz, der Samurai bleibt in Beschwörungshaltung
  R.startStorm = function (p, I) {
    var x = m.clamp(I.mx, 12, SZ.W - 12), y = m.clamp(I.my + 10, 24, SZ.H - 8);
    p.act = { type: "asummon", t: 0 };
    var h = { x: x, y: y, tx: x, ty: y, t: 0, spin: Math.random() < 0.5 ? 1 : -1, act: p.act, debris: [], cols: [], tick: 0, seed: Math.random() * 10, end: 0 };
    var veg = this.w.arena.veg;
    for (var i = 0; i < veg.length; i++) { var v = veg[i]; if (Math.abs(v.x - x) < 40 && Math.abs(v.y - y) < 30 && VEGCOL[v.t]) h.cols = h.cols.concat(VEGCOL[v.t]); }
    if (!h.cols.length) h.cols = LEAF;
    for (var k = 0; k < 30; k++) this.debris(h);
    this.storm = h; p.spend();
    this.w.shake = Math.max(this.w.shake, 1.5); this.w.push(x, y, 40, 5, 0.8, { spin: h.spin });
    SZ.audio.play("swing_e", { x: x, rate: 0.7 }); SZ.audio.play("dash", { x: x, rate: 0.55, vol: 1 });
  };
  // Sturm endet: wer noch drin ist, fliegt hinaus; Laub wird weggeschleudert
  R.endStorm = function (p) {
    var h = this.storm; if (!h) return;
    this.storm = null;
    var w = this.w, S = AIR.storm;
    w.enemies.forEach(function (e) {
      if (e.dead || e.state === "spawn") return;
      var d = m.dist(h.x, h.y, e.x, e.y);
      if (d < S.r + e.D.radius + 6) hitEnemy(w, e, S.dmg, Math.atan2(e.y - h.y, e.x - h.x) + h.spin * 0.6, S.fling, { k: "storm_end", i: h });
    });
    h.debris.forEach(function (d0) {
      if (!d0.leaf) return;
      var ta = d0.ang + h.spin * Math.PI / 2, sp = rnd(70, 150);
      w.parts.add({ type: "leaf", x: h.x + Math.cos(d0.ang) * d0.r, y: h.y + Math.sin(d0.ang) * d0.r * 0.45, z: d0.z, vx: Math.cos(ta) * sp + Math.cos(d0.ang) * 50, vy: (Math.sin(ta) * sp + Math.sin(d0.ang) * 50) * 0.5, vz: rnd(5, 30), life: rnd(1.5, 3), col: d0.col, ph: Math.random() * 6.28, ground: 0 });
    });
    this.fade = { x: h.x, y: h.y, t: 0, spin: h.spin, debris: [], seed: h.seed };   // kurzes Ausklingen
    w.push(h.x, h.y, 44, 5, 0.6, { spin: h.spin }); w.shake = Math.max(w.shake, 1.2);
    SZ.audio.play("dash", { x: h.x, rate: 1.1, vol: 0.7 });
    if (p && p.act && p.act.type === "asummon") p.act = null;
  };
  R.endSphere = R.endStorm;   // alter Name (player.js)
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
  function hitEnemy(w, e, dmg, ang, knock, opt) {
    e.hurt(dmg, ang, e.D.armored ? 0 : knock, "wind", opt);   // opt: Art und Ausführung des Angriffs (Monkey Lord blockt Wiederholungen)
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
          if (d < S.reach + e.D.radius && Math.abs(m.angDiff(s.a, a)) < S.arc * 0.5 + 6 / Math.max(8, d)) { ac.hits.push(e); hitEnemy(w, e, S.dmg, a, S.knock, { k: "aslash", i: ac }); if (!e.D.boss) SZ.audio.play("hit_flesh", { x: e.x, vol: 0.45, rate: 1.2 }); }
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
          if (d < W.r + e.D.radius) { var a = Math.atan2(e.y - p.y, e.x - p.x); hitEnemy(w, e, W.dmg, a, W.knock, { k: "awhirl", i: h }); }
        });
        tear(w, p.x, p.y, W.r, 10, null, h.spin);
        w.shake = Math.max(w.shake, 2);
        w.parts.dust(p.x, p.y, 10, "#C8BEA8");
      }
      if (h.t > W.dur + 0.15) this.whirls.splice(j, 1);
    }
    // Sturm: folgt dem Fadenkreuz, saugt an, wirbelt herum
    var st = this.storm;
    if (st) {
      var S = AIR.storm, I = SZ.input;
      st.t += dt;
      if (p.act !== st.act || p.dead) this.endStorm(p);
      else {
        p.mana = Math.max(0, p.mana - S.mana * SZ.perk.mana(p) * dt); p.manaT = 0;
        p.face = Math.atan2(st.y - p.y, st.x - p.x);
        // Ziel: Fadenkreuz, dazu wildes Schlingern
        st.tx = m.clamp(I.mx, 12, SZ.W - 12); st.ty = m.clamp(I.my + 10, 24, SZ.H - 8);
        var wx = Math.sin(st.t * 3.1 + st.seed) * 14, wy = Math.cos(st.t * 2.3 + st.seed * 2) * 8;
        var dx = st.tx + wx - st.x, dy = st.ty + wy - st.y, dl = Math.hypot(dx, dy), mv = Math.min(dl, S.speed * dt);
        if (dl > 0.1) { st.x += dx / dl * mv; st.y += dy / dl * mv; }
        w.push(st.x, st.y, S.r + 18, 5.5, 0.4, { spin: st.spin });
        if (Math.random() < dt * 14) tear(w, st.x, st.y, S.r + 10, 2, null, st.spin);
        if (Math.random() < dt * 30) w.parts.dust(st.x + rnd(-14, 14), st.y + rnd(-6, 6), 1, DUST[(Math.random() * 3) | 0]);
        if (Math.random() < dt * 50 && st.debris.length < 70) this.debris(st);
        // Laub kreist im Trichter
        st.debris.forEach(function (d0) {
          d0.ang += d0.w * 1.2 * st.spin * dt; d0.z += d0.vz * dt; d0.vz *= Math.pow(0.6, dt);
          if (d0.z > 52) { d0.z = rnd(0, 6); d0.vz = rnd(30, 80); }   // oben raus, unten wieder rein
          d0.r += ((9 + d0.z * 0.55) - d0.r) * Math.min(1, dt * 5);
        });
        // Gegner: ansaugen und im Kreis herumschleudern, 5 Treffer pro Sekunde
        st.tick -= dt;
        var hitNow = st.tick <= 0; if (hitNow) st.tick += S.tick;
        w.enemies.forEach(function (e) {
          if (e.dead || e.state === "spawn" || e.falling) return;
          var ex = e.x - st.x, ey = e.y - st.y, d = Math.hypot(ex, ey);
          if (d > S.r + 22) return;
          var a = Math.atan2(ey, ex);
          e.slowT = 0.3;   // eigene Bewegung stark gebremst
          if (!e.D.armored) {   // Sog: zur Mitte und im Kreis herum (über die Kante möglich)
            var tan = a + st.spin * Math.PI / 2, pull = d > 7 ? 60 : -10, k0 = 1 - Math.min(1, d / (S.r + 22));
            var mx = (Math.cos(tan) * 110 - Math.cos(a) * pull) * (0.4 + k0 * 0.6) * dt, my = (Math.sin(tan) * 110 - Math.sin(a) * pull) * (0.4 + k0 * 0.6) * dt;
            var np = w.arena.move(e.x, e.y, mx, my, e.D.radius, w.solids, true); e.x = np.x; e.y = np.y;
            if (w.arena.tilePx(e.x, e.y) === "v") { e.startFall(); return; }
          }
          if (hitNow && d < S.r + e.D.radius) {
            e.hurt(S.dmg, a + st.spin * Math.PI / 2, 0, "wind", { k: "storm", i: st });
            if (!e.D.boss) SZ.audio.play("hit_flesh", { x: e.x, vol: 0.35, rate: 1.3 });
          }
        });
        if (Math.floor(st.t / 0.45) !== Math.floor((st.t - dt) / 0.45)) SZ.audio.play("dash", { x: st.x, rate: 0.6 + Math.random() * 0.2, vol: 0.5 });
        if (p.mana <= 0.01) this.endStorm(p);
      }
    }
    if (this.fade) { this.fade.t += dt; if (this.fade.t > 0.35) this.fade = null; }
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
        if (d < reach + e.D.radius && d > reach - 18 && Math.abs(m.angDiff(g.a, a)) < G.arc * 0.5) { g.hits.push(e); hitEnemy(w, e, G.dmg, a, G.knock, { k: "gust", i: g }); }
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
    if (this.storm) drawStorm(ctx, this.storm, t, false, 1);
    if (this.fade) drawStorm(ctx, this.fade, t, false, 1 - this.fade.t / 0.35);
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
    if (this.storm) { drawStorm(ctx, this.storm, t, true, 1); drawSummon(ctx, p, t); }
    if (this.fade) drawStorm(ctx, this.fade, t, true, 1 - this.fade.t / 0.35);
    // Laden: Böen ziehen sich spiralförmig zusammen
    if (this.charging) {
      var q = Math.min(1, this.charging.t / AIR.storm.charge);
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
  // Sturm: hoher, wilder Tornado – Böen in vielen Ebenen, deren Mitte schlingert; unten Staub
  function drawStorm(ctx, h, t, front, alpha) {
    if (alpha <= 0) return;
    var grow = m.easeOutCubic(Math.min(1, h.t / 0.25)) * (1 + (1 - alpha) * 0.8);
    for (var k = 0; k < 9; k++) {
      var z = k * 6.5, wob = Math.sin(t * 6 + k * 0.7 + h.seed) * k * 0.7, r = (7 + k * 3.9) * grow, cy = h.y - z, sp = (16 - k * 1.1) * h.spin, w = 5 + k * 0.9;
      for (var j = 0; j < 2; j++) {
        var a0 = t * sp + k * 1.3 + j * Math.PI + Math.sin(t * 3 + k) * 0.4, len = 1.8 + ((k + j) % 3) * 0.35;
        var lo = Math.min(a0, a0 + len * h.spin), hi = Math.max(a0, a0 + len * h.spin);
        gustBand(ctx, h.x + wob, cy, r, 0.4, lo, hi, w, alpha * (j ? 0.8 : 1), front, k < 2);
      }
    }
    if (!front) { ctx.globalAlpha = alpha * 0.65; band(ctx, h.x, h.y, 24 * grow, 0.45, 0, TAU, 7, C_DUST); ctx.globalAlpha = 1; }
  }
  // Beschwörung: Wind kreist um die erhobenen Hände des Samurai
  function drawSummon(ctx, p, t) {
    for (var k = 0; k < 2; k++) { var a0 = t * (k ? 8 : -7) + k * 2; gustBand(ctx, p.x, p.y - 16 - k * 3, 9 + k * 2, 0.45, a0, a0 + 2, 3.5, 0.9, undefined); }
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
  function drawDebris(ctx, h, t, front, storm) {
    var W = AIR.whirl, u = storm ? 0 : h.t / W.dur, fade = 1 - Math.max(0, (u - 0.75) / 0.3), spread = 1 + Math.max(0, u - 0.75) * 1.6;
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
  R.drawTopLow = function (ctx) { var t = this.t; this.whirls.forEach(function (h) { drawDebris(ctx, h, t, false); }); if (this.storm) drawDebris(ctx, this.storm, t, false, true); };
  R.drawTop = function (ctx) { var t = this.t; this.whirls.forEach(function (h) { drawDebris(ctx, h, t, true); }); if (this.storm) drawDebris(ctx, this.storm, t, true, true); };

  SZ.airArts = function (world) {
    if (!world.airArts) world.airArts = new Arts(world);
    if (world.fx.indexOf(world.airArts) < 0) world.fx.push(world.airArts);
    return world.airArts;
  };
})();
