/* Shizuku – world.js
   Die Spielwelt einer Arena: Tiefe mit Wolken, Wasserfälle, Insel-Boden, Wasser, Moos, Vegetation,
   Objekte, Figuren, Pfeile, Partikel, Schatten und Licht. Wird von Arena, Übergang und Dev Tool benutzt.
   Wachstum: growth = { t, cx, cy } lässt Moos und Pflanzen von einem Punkt aus nach außen wachsen.
   Druck (pushes): Wind von Dash und Pfeilen biegt Pflanzen weg. */
(function () {
  var SZ = window.SZ, W = SZ.W, H = SZ.H, m = SZ.m;
  var CANOPY_COLS = {
    maple: ["#A82722", "#D24A2C", "#E07A34", "#8E1F1A"], sakura: ["#F2A6C0", "#FFD0DE", "#FFE8EE", "#E888A8"],
    tree: ["#2E6B3A", "#4A8E44", "#78B858"], cypress: ["#245632", "#3A7840"], cedar: ["#1E4A2A", "#2E6838"], pine: ["#2F4D2C", "#46693A"],
    bamboo: ["#5E8A38", "#8FB84E", "#C8D890"], bush: ["#2E6B3A", "#4A8E44", "#78B858"]
  };

  function World(arena) {
    this.arena = arena;
    this.time = arena.time;
    this.timeSpeed = 0;
    this.clock = 0;
    this.wind = 1;
    this.parts = new SZ.Particles();
    this.growth = null;
    this.shake = 0;
    this.ground = null;
    this.sc = SZ.canvas(W, H);
    this.mossDyn = null;
    this.pushes = [];
    this.arrows = [];
    this.enemies = [];
    this.fx = [];      // laufende Effekte mit update(dt)/draw(ctx), z. B. Wasser-Beschwörung
    this.rebuild();
  }
  var Wd = World.prototype;

  Wd.rebuild = function () { this.ground = SZ.ground.build(this.arena); this.solids = this.arena.solids(); this.mossBirth = null; };
  Wd.refreshSolids = function () { this.solids = this.arena.solids(); };

  // ---------- Wachstum ----------
  Wd.GROW_SPAN = 2.5;
  Wd.startGrowth = function (cx, cy) {
    var maxD = 0;
    [[0, 0], [W, 0], [0, H], [W, H]].forEach(function (p) { maxD = Math.max(maxD, m.dist(cx, cy, p[0], p[1] * 1.25)); });
    this.growth = { t: 0, cx: cx, cy: cy, maxD: maxD };
    var g = this.ground, b = new Float32Array(g.mossPix.length);
    for (var i = 0; i < g.mossPix.length; i++) { var p = g.mossPix[i]; b[i] = this.birth(p % W, (p / W) | 0, g.mossN[i]); }
    this.mossBirth = b;
    if (!this.mossDyn) this.mossDyn = SZ.canvas(W, H);
  };
  Wd.birth = function (x, y, n) {
    var G = this.growth; if (!G) return -1;
    var d = m.dist(G.cx, G.cy, x, y * 1.25) / G.maxD;
    if (n == null) n = SZ.noise2(x / 22, y / 22, 99);
    return Math.max(0, this.GROW_SPAN * Math.pow(d, 0.85) + (n - 0.5) * 0.6);
  };
  Wd.grown = function (x, y, dur) {
    if (!this.growth) return 1;
    return m.clamp((this.growth.t - this.birth(x, y)) / dur, 0, 1);
  };
  Wd.growthDone = function () { return !this.growth; };

  // ---------- Wind- und Druckwellen ----------
  // Druck auf Pflanzen. mode: { dir: Winkel } = Wind in eine Richtung, { spin: ±1 } = Wirbel; ohne = vom Punkt weg
  Wd.push = function (x, y, r, str, life, mode) { this.pushes.push({ x: x, y: y, r: r, s: str, life: life || 0.6, age: 0, dir: mode && mode.dir, spin: mode && mode.spin }); if (this.pushes.length > 160) this.pushes.shift(); };
  Wd.bendAt = function (x, y) {
    var dx = 0;
    for (var i = 0; i < this.pushes.length; i++) {
      var p = this.pushes[i], d = Math.abs(x - p.x) + Math.abs(y - p.y) * 1.3;
      if (d < p.r) {
        var k = (1 - d / p.r) * p.s * (1 - p.age / p.life);
        if (p.dir != null) dx += Math.cos(p.dir) * k * 1.3 * (1 + 0.35 * Math.sin(p.age * 30 + x * 0.4));          // Windstoß
        else if (p.spin) dx += Math.cos(Math.atan2(y - p.y, x - p.x) + p.spin * Math.PI / 2) * k * 1.4 * (1 + 0.4 * Math.sin(p.age * 26 + y * 0.5));   // Wirbel
        else dx += (x >= p.x ? 1 : -1) * k;
      }
    }
    return m.clamp(dx, -3, 3);
  };

  // ---------- Treffer an Objekten: Wackeln und Partikel ----------
  Wd.hitObject = function (o, hx, hy, power, src) {
    var d = SZ.OBJECTS[o.t], fx = d.fx || {}, c = SZ.objCenter(o), p = this.parts;
    power = power || 1;
    o._rt = o._rt || {}; o._rt.shake = Math.min(1.4, 0.6 + power * 0.5); o._rt.flash = 0.7;
    var hz = Math.min(18, d.h * 0.35);
    if (fx.straw) { p.straw(o.x, o.y - 12, 10); p.spark(o.x, o.y - 12, 12, 6); }
    if (fx.chips) p.chips(hx, hy, hz, Math.round(6 + power * 6), fx.chips);
    // Klang: Pfeil schlägt ein bzw. Klinge trifft Holz/Stroh (für Stein gibt es noch keinen Sound)
    if (fx.straw || (fx.chips && !fx.sparks)) SZ.audio.play(src === "arrow" ? "arrow_wood" : fx.straw ? "hit_straw" : "hit_wood", { x: o.x });
    if (fx.sparks) p.spark(hx, hy, hz, Math.round(4 + power * 5));
    var cols = CANOPY_COLS[o.t];
    if ((fx.leaves || fx.petals) && cols) p.leafBurst(o.x, o.y - 2, Math.round(4 + power * 6), cols, d.h * 0.45, d.h * 0.8, d.w * 0.6);
  };

  // ---------- Takt ----------
  Wd.update = function (dt) {
    this.clock += dt;
    if (this.timeSpeed) this.time = (this.time + this.timeSpeed * dt + 24) % 24;
    if (this.growth) { this.growth.t += dt; if (this.growth.t > this.GROW_SPAN + 1.5) this.growth = null; }
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 30);
    var self = this, a = this.arena;
    for (var pi = this.pushes.length - 1; pi >= 0; pi--) { this.pushes[pi].age += dt; if (this.pushes[pi].age > this.pushes[pi].life) this.pushes.splice(pi, 1); }
    a.obj.forEach(function (o) {
      var d = SZ.OBJECTS[o.t];
      if (d.leaves && Math.random() < dt * 0.9 * self.grown(o.x, o.y, 1.2)) self.parts.leaf(o.x + (Math.random() - 0.5) * 38, o.y - 2 + Math.random() * 14, 18 + Math.random() * 18);
      if (d.petals && Math.random() < dt * 1.3 * self.grown(o.x, o.y, 1.2)) self.parts.petal(o.x, o.y, 22 + Math.random() * 18);
    });
    for (var i = 0; i < a.leaf.length; i++) if (a.leaf[i] === "1" && Math.random() < dt * 0.05) {
      var tx = i % SZ.COLS, ty = (i / SZ.COLS) | 0, x = (tx + Math.random()) * SZ.TILE, y = (ty + Math.random()) * SZ.TILE;
      if (this.grown(x, y, 1) >= 1) this.parts.leaf(x, y, 34 + Math.random() * 20);
    }
    // Gischt an Wasserfällen
    var falls = this.ground.falls;
    for (var f = 0; f < falls.length; f++) if (!falls[f].back && Math.random() < dt * 2.2) this.parts.mist(falls[f].x0 + Math.random() * (falls[f].x1 - falls[f].x0), falls[f].y0 + 2 + Math.random() * 10);
    this.updateArrows(dt);
    for (var fi = this.fx.length - 1; fi >= 0; fi--) if (this.fx[fi].update(dt) === false) this.fx.splice(fi, 1);
    this.parts.update(dt, this);
  };

  // ---------- Pfeile ----------
  Wd.addArrow = function (o) { this.arrows.push(o); return o; };
  Wd.updateArrows = function (dt) {
    var self = this, a = this.arena;
    for (var i = this.arrows.length - 1; i >= 0; i--) {
      var r = this.arrows[i];
      if (r.stuck) { r.age += dt; if (r.age > 7) this.arrows.splice(i, 1); continue; }
      var steps = Math.max(1, Math.ceil(Math.hypot(r.vx, r.vy) * dt / 3));
      for (var s = 0; s < steps && !r.stuck && !r.dead; s++) {
        var h = dt / steps;
        r.x += r.vx * h; r.y += r.vy * h; r.dist += Math.hypot(r.vx, r.vy) * h;
        if (!r.overVoid) r.z = Math.max(2, r.z - r.drop * h);
        if (r.spin != null) r.spin += h * 26;
        // Wurfwaffen: nach der Reichweite fallen sie zu Boden und bleiben liegen
        if (r.range && r.dist > r.range && !r.overVoid) {
          r.z -= 220 * h; var dmp = Math.exp(-9 * h); r.vx *= dmp; r.vy *= dmp;
          if (r.z <= 1) { r.z = 0.5; r.stuck = true; r.age = 3.5; r.onGround = true; break; }
        }
        // Bugwelle bei starken Schüssen: Wind wird zu beiden Seiten weggedrückt
        if (r.power > 0.45 && r.dist - r.lastFx > (r.power > 0.85 ? 3 : 5)) {
          r.lastFx = r.dist;
          var nx = -Math.sin(r.ang), ny = Math.cos(r.ang);
          if (a.tilePx(r.x, r.y) !== "v") {
            for (var sd = -1; sd <= 1; sd += 2) {
              self.parts.wake(r.x + nx * sd * 2, r.y + ny * sd * 1.5, r.ang, sd, r.power);
              if (Math.random() < 0.35 * r.power) self.parts.add({ type: "dust", x: r.x + nx * sd * 3, y: r.y + ny * sd * 2, z: 0.5, vx: nx * sd * (50 + Math.random() * 50), vy: ny * sd * 30, vz: 4 + Math.random() * 6, life: 0.4 + Math.random() * 0.3, col: "#B8B0A2" });
            }
            self.push(r.x, r.y, 10 + r.power * 14, 3 * r.power, 0.8);
          }
          if (Math.random() < 0.5) self.parts.wind(r.x, r.y - r.z, r.ang, 8 + r.power * 12, 0.3, 0.45 * r.power);
        }
        // Feindlicher Pfeil: trifft den Spieler (Block: zerbricht, Parade: fliegt zurück, Ausweichen: fliegt durch)
        var pl = self.player;
        if (r.hostile && pl && !pl.dead && r.hit.indexOf(pl) < 0 && Math.abs(pl.x - r.x) < 5 && r.y > pl.y - 8 && r.y < pl.y + 4) {
          r.hit.push(pl);
          var res = pl.hurt(r.dmg, r.x - Math.cos(r.ang) * 30, r.y - Math.sin(r.ang) * 30, "arrow");
          if (res === "parry") {
            r.hostile = false; r.hit = [pl]; r.ang += Math.PI + (Math.random() - 0.5) * 0.2; r.dmg *= 1.5; r.power = 0.6;
            var sp2 = Math.hypot(r.vx, r.vy) * 1.15; r.vx = Math.cos(r.ang) * sp2; r.vy = Math.sin(r.ang) * sp2; r.dist = 0;
          } else if (res === "block" || res === "break") {
            self.parts.chips(r.x, r.y, r.z, 6, ["#8A6A44", "#5E4630", "#D8D2C4"]); r.dead = true; break;
          } else if (res === "hit") {
            SZ.audio.play("arrow_hit", { x: r.x, vol: 0.8 }); r.dead = true; break;
          }
        }
        // Treffer: Gegner
        for (var e = 0; e < self.enemies.length && !r.hostile; e++) {
          var en = self.enemies[e];
          if (en.dead || r.hit.indexOf(en) >= 0) continue;
          if (Math.abs(en.x - r.x) < 6 * en.sc && r.y > en.y - 9 * en.sc && r.y < en.y + 5) {
            r.hit.push(en);
            en.hurt(r.dmg, r.ang, r.knock != null ? r.knock : 0.6 + r.power, "arrow");
            if (r.power < 0.85 || r.hit.length > 2) { r.dead = true; break; }
          }
        }
        if (r.dead) break;
        // Treffer: feste Objekte (bleibt stecken)
        var tile = a.tilePx(r.x, r.y);
        if (tile === "v") r.overVoid = true;
        if (tile === "#") { r.stuck = true; r.age = 0; break; }
        for (var k = 0; k < self.solids.length; k++) {
          var c = self.solids[k], o = c[3], dd = SZ.OBJECTS[o.t];
          if (Math.abs(r.x - c[0]) < c[2] && Math.abs(r.y - c[1]) < c[2] * 0.8 + 1 && r.z < dd.h * 0.9) {
            r.stuck = true; r.age = 0; r.x -= r.vx * h; r.y -= r.vy * h;
            self.hitObject(o, r.x, r.y, 0.4 + r.power, "arrow");
            break;
          }
        }
      }
      if (r.dead || r.x < -40 || r.x > W + 40 || r.y < -40 || r.y > H + 40) { this.arrows.splice(i, 1); continue; }
      r.trail.push({ x: r.x, y: r.y - r.z, t: this.clock });
      while (r.trail.length && this.clock - r.trail[0].t > 0.16) r.trail.shift();
    }
  };
  Wd.drawArrows = function (ctx) {
    var now = this.clock;
    this.arrows.forEach(function (r) {
      // Spur
      if (!r.stuck && r.trail.length > 1) {
        for (var i = 1; i < r.trail.length; i++) {
          var k = 1 - (now - r.trail[i].t) / 0.16;
          ctx.strokeStyle = (r.hostile ? "rgba(255,190,170," : "rgba(255,250,236,") + (k * (0.2 + r.power * 0.6)) + ")"; ctx.lineWidth = r.power > 0.8 ? 2 : 1;
          ctx.beginPath(); ctx.moveTo(r.trail[i - 1].x, r.trail[i - 1].y); ctx.lineTo(r.trail[i].x, r.trail[i].y); ctx.stroke();
        }
      }
      if (!r.overVoid) { ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.fillRect(Math.round(r.x - Math.cos(r.ang) * 4), Math.round(r.y), 6, 1); }
      ctx.globalAlpha = r.stuck ? Math.min(1, (7 - r.age) / 1) : 1;
      var px = Math.round(r.x), py = Math.round(r.y - r.z);
      if (r.kind === "star") {
        // Wurfstern: dreht sich (abwechselnd + und ×)
        var cross = Math.floor((r.spin || 0) / 1.2) % 2 === 0;
        ctx.fillStyle = "#5E666E"; ctx.fillRect(px, py, 1, 1);
        ctx.fillStyle = "#C8CED4";
        if (cross || r.stuck) { ctx.fillRect(px - 1, py, 1, 1); ctx.fillRect(px + 1, py, 1, 1); ctx.fillRect(px, py - 1, 1, 1); ctx.fillRect(px, py + 1, 1, 1); }
        else { ctx.fillRect(px - 1, py - 1, 1, 1); ctx.fillRect(px + 1, py + 1, 1, 1); ctx.fillRect(px + 1, py - 1, 1, 1); ctx.fillRect(px - 1, py + 1, 1, 1); }
      } else if (r.kind === "knife") {
        // Kunai: dunkle Klinge, Griff mit Ring
        var kx = Math.cos(r.ang), ky = Math.sin(r.ang) * 0.42, pen = SZ.pen(ctx), L2 = r.stuck ? 3 : 5;
        pen.line(px - kx * L2, py - ky * L2, px, py, "#9AA2AA"); pen.px(px, py, "#E4E8EC");
        pen.line(px - kx * (L2 + 3), py - ky * (L2 + 3), px - kx * L2, py - ky * L2, "#2A1E1A"); pen.px(px - kx * (L2 + 4), py - ky * (L2 + 4), "#8A7A5A");
      } else {
        var len = r.stuck ? 5 : 8, tx = r.x - Math.cos(r.ang) * len, ty = r.y - r.z - Math.sin(r.ang) * len * 0.42;
        SZ.samurai.drawArrow(ctx, tx, ty, r.ang, len, r.power > 0.85 && !r.stuck);
      }
      ctx.globalAlpha = 1;
    });
  };

  // ---------- Wegfindung (Raster 8 px) ----------
  // Blockiert: Abgrund, Mauern und Objekte (um den Gegner-Radius vergrößert).
  // Distanzkarte zum Ziel per Breitensuche (8 Nachbarn, keine Ecken abschneiden), von allen Gegnern geteilt.
  var NG = 8, GW = W / NG, GH = Math.ceil(H / NG);
  Wd.nav = function () {
    if (this._nav && this._navSolids === this.solids && this._navRev === this.arena.rev) return this._nav;
    var b = new Uint8Array(GW * GH), a = this.arena, R = 5, sol = this.solids;
    for (var gy = 0; gy < GH; gy++) for (var gx = 0; gx < GW; gx++) {
      var cx = gx * NG + 4, cy = gy * NG + 4, bl = !a.walkable(cx, cy, R);
      for (var i = 0; !bl && i < sol.length; i++) {
        var c = sol[i], dx = cx - c[0], dy = (cy - c[1]) * 1.4;
        if (dx * dx + dy * dy < (c[2] + R) * (c[2] + R)) bl = true;
      }
      b[gy * GW + gx] = bl ? 1 : 0;
    }
    this._nav = b; this._navSolids = sol; this._navRev = this.arena.rev; this._flow = null;
    return b;
  };
  Wd.blockedAt = function (x, y) {
    var gx = Math.floor(x / NG), gy = Math.floor(y / NG);
    if (gx < 0 || gy < 0 || gx >= GW || gy >= GH) return true;
    return this.nav()[gy * GW + gx] === 1;
  };
  Wd.flowTo = function (tx, ty) {
    var b = this.nav(), gx = SZ.m.clamp(Math.floor(tx / NG), 0, GW - 1), gy = SZ.m.clamp(Math.floor(ty / NG), 0, GH - 1), F = this._flow;
    if (F && F.gx === gx && F.gy === gy && this.clock - F.t < 0.5) return F;
    var dist = new Int16Array(GW * GH).fill(-1), q = new Int32Array(GW * GH), qh = 0, qt = 0;
    // Ziel blockiert? Dann die nächste freie Zelle nehmen
    var start = gy * GW + gx;
    if (b[start]) {
      var best = -1;
      for (var r = 1; r < 6 && best < 0; r++) for (var oy = -r; oy <= r && best < 0; oy++) for (var ox = -r; ox <= r; ox++) {
        var nx = gx + ox, ny = gy + oy; if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
        if (!b[ny * GW + nx]) { best = ny * GW + nx; break; }
      }
      if (best >= 0) start = best;
    }
    dist[start] = 0; q[qt++] = start;
    while (qh < qt) {
      var cur = q[qh++], cx = cur % GW, cy = (cur / GW) | 0, cd = dist[cur];
      for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        var x2 = cx + dx, y2 = cy + dy; if (x2 < 0 || y2 < 0 || x2 >= GW || y2 >= GH) continue;
        var j = y2 * GW + x2; if (b[j] || dist[j] >= 0) continue;
        if (dx && dy && (b[cy * GW + x2] || b[y2 * GW + cx])) continue;
        dist[j] = cd + 1; q[qt++] = j;
      }
    }
    this._flow = { gx: gx, gy: gy, t: this.clock, dist: dist };
    return this._flow;
  };
  // Richtung (Winkel) entlang der Distanzkarte, oder null
  Wd.flowDir = function (x, y, tx, ty) {
    var F = this.flowTo(tx, ty), b = this.nav(), gx = Math.floor(x / NG), gy = Math.floor(y / NG), best = 1e9, bx = 0, by = 0;
    for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      var x2 = gx + dx, y2 = gy + dy; if (x2 < 0 || y2 < 0 || x2 >= GW || y2 >= GH) continue;
      var j = y2 * GW + x2, d = F.dist[j]; if (d < 0) continue;
      if (dx && dy && (b[gy * GW + x2] || b[y2 * GW + gx])) continue;
      var dd = d + (dx && dy ? 0.4 : 0);
      if (dd < best) { best = dd; bx = x2; by = y2; }
    }
    if (best === 1e9) return null;
    return Math.atan2(by * NG + 4 - y, bx * NG + 4 - x);
  };
  // Freie Sichtlinie (für den Gegner-Körper breit genug)?
  Wd.los = function (x0, y0, x1, y1) {
    var d = SZ.m.dist(x0, y0, x1, y1), n = Math.ceil(d / 4);
    for (var i = 1; i < n; i++) { var t = i / n; if (this.blockedAt(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t)) return false; }
    return true;
  };
  // Lenkung zum Ziel: direkt bei freier Sicht, sonst über die Distanzkarte
  Wd.steer = function (x, y, tx, ty, force) {
    if (!force && this.los(x, y, tx, ty)) return Math.atan2(ty - y, tx - x);
    var a = this.flowDir(x, y, tx, ty);
    return a == null ? Math.atan2(ty - y, tx - x) : a;
  };

  // Ambiente: Wind immer leise, Wasserfall lauter je näher (x/y = Hörposition, meist der Spieler)
  Wd.ambience = function (x, y) {
    var best = 1e9, bx = SZ.W / 2;
    this.ground.falls.forEach(function (f) {
      var nx = Math.max(f.x0, Math.min(f.x1, x)), ny = f.back ? f.y0 : Math.max(f.y0, y), d = Math.hypot(nx - x, (ny - y) * 1.2);
      if (d < best) { best = d; bx = nx; }
    });
    var fall = best < 1e8 ? 0.75 * Math.max(0.14, 1 - best / 260) : 0;
    return { wind: 0.12 + 0.1 * Math.min(2, this.wind), waterfall: fall, waterPan: Math.max(-0.7, Math.min(0.7, (bx / SZ.W - 0.5) * 1.4)) };
  };

  // ---------- Kachel in Wasser verwandeln (Wasser-Element) ----------
  // Entfernt alles, was auf der Kachel steht oder wächst, und zeichnet nur die Umgebung neu.
  // Effekte (Wasser) in halber Auflösung zeichnen, auf die Wasserpalette reduzieren und mit harten Pixeln
  // hochskalieren: so passen sie zum Pixel-Look von Boden und Figuren. Halbtransparenz wird gerastert.
  var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  Wd.drawFx = function (ctx, low) {
    var all = this.fx.filter(function (f) { return (low ? f.drawLow : f.draw) && !(f.idle && f.idle()); });
    var list = all.filter(function (f) { return !f.raw; });
    all.forEach(function (f) { if (f.raw) { if (low) f.drawLow(ctx); else f.draw(ctx); } });   // eigener Pixel-Look (Luft)
    if (!list.length) return;
    var W2 = SZ.W >> 1, H2 = SZ.H >> 1, L = this._fxc || (this._fxc = SZ.canvas(W2, H2)), c = L.ctx;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W2, H2); c.setTransform(0.5, 0, 0, 0.5, 0, 0);
    list.forEach(function (f) { if (low) f.drawLow(c, ctx); else f.draw(c, ctx); });
    c.setTransform(1, 0, 0, 1, 0, 0);
    var img = c.getImageData(0, 0, W2, H2), d = img.data, P = SZ.WATER_PAL, np = P.length;
    for (var y = 0, i = 0; y < H2; y++) for (var x = 0; x < W2; x++, i += 4) {
      var a = d[i + 3]; if (!a) continue;
      if (a < 250 && a < (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) * 16) { d[i + 3] = 0; continue; }   // gerasterte Transparenz
      var r = d[i] * 255 / a, g = d[i + 1] * 255 / a, b = d[i + 2] * 255 / a, best = 0, bd = 1e9;
      for (var k = 0; k < np; k += 3) { var dr = r - P[k], dg = g - P[k + 1], db = b - P[k + 2], dd = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11; if (dd < bd) { bd = dd; best = k; } }
      d[i] = P[best]; d[i + 1] = P[best + 1]; d[i + 2] = P[best + 2]; d[i + 3] = 255;
    }
    c.putImageData(img, 0, 0);
    var sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
    ctx.drawImage(L, 0, 0, SZ.W, SZ.H);
    ctx.imageSmoothingEnabled = sm;
  };
  Wd.drawFaller = function (ctx, e) {
    var f = e.falling, s = e.sprite(), dy = 260 * f.t * f.t, a = Math.max(0, 1 - f.t / 1.4);
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha = a; ctx.translate(Math.round(e.x), Math.round(e.y + dy)); ctx.rotate(f.spin * f.t * 0.5);
    ctx.drawImage(s.cv, -s.ax, -s.ay); ctx.restore();
  };
  Wd.convertTile = function (tx, ty, to) {
    var a = this.arena, T = SZ.TILE, x0 = tx * T, y0 = ty * T, x1 = x0 + T, y1 = y0 + T, p = this.parts;
    function inside(x, y) { return x >= x0 && x < x1 && y >= y0 && y < y1; }
    a.obj = a.obj.filter(function (o) {
      if (!inside(o.x, o.y)) return true;
      var d = SZ.OBJECTS[o.t], cols = (d.fx && d.fx.chips) || ["#8A857C", "#5E8040"];
      p.chips(o.x, o.y - 2, 6, 10, cols); p.splash(o.x, o.y, 6, 0.6);
      return false;
    });
    a.veg = a.veg.filter(function (v) { if (!inside(v.x, v.y)) return true; if (Math.random() < 0.3) p.chips(v.x, v.y - 2, 3, 2, ["#4A7E3A", "#7AAE52"]); return false; });
    a.setTile(tx, ty, to || "w");
    this.ground = SZ.ground.build(a, this.ground, { x0: tx - 2, y0: ty - 2, x1: tx + 3, y1: ty + 5 });
    this.ground.rev = a.rev;
    this.refreshSolids(); this._vegDirty = true;
  };

  Wd.lights = function (S) {
    var out = [], self = this;
    this.arena.obj.forEach(function (o, i) {
      var d = SZ.OBJECTS[o.t]; if (!d.light) return;
      out.push({ x: o.x + d.light.dx, y: o.y + d.light.dy, r: d.light.r, col: d.light.col, k: SZ.light.lampK(S, self.clock, i * 7.3) });
    });
    return out;
  };

  // ---------- Zeichnen ----------
  function drawGrow(ctx, cv, x, y, ax, ay, g) {
    var sy = m.easeOutBack(g), sx = 0.55 + 0.45 * m.easeOutCubic(g);
    ctx.drawImage(cv, 0, 0, cv.width, cv.height, Math.round(x - ax * sx), Math.round(y - ay * sy), Math.max(1, Math.round(cv.width * sx)), Math.max(1, Math.round(cv.height * sy)));
  }

  Wd.drawVeg = function (ctx, v, ents) {
    var s = SZ.sprite("veg", v.t, v.v), d = s.def, gr = this.grown(v.x, v.y, 0.75);
    if (gr <= 0) return;
    if (gr < 1) { drawGrow(ctx, s.cv, v.x, v.y, d.ax, d.ay, gr); return; }
    var x0 = Math.round(v.x - d.ax), y0 = Math.round(v.y - d.ay);
    if (d.flat) { ctx.drawImage(s.cv, x0, y0); return; }
    var bend = this.bendAt(v.x, v.y);
    if (d.tall && ents) for (var i = 0; i < ents.length; i++) {
      var e = ents[i], dx = v.x - e.x, dy = v.y - e.y;
      if (Math.abs(dx) < 8 && Math.abs(dy) < 5) bend += (dx >= 0 ? 1 : -1) * (2 - Math.abs(dx) / 4);
    }
    var amp = d.tall ? 1.4 : 0.9;
    var sw = Math.max(-4, Math.min(4, Math.round(Math.sin(this.clock * 1.7 + v.x * 0.07 + v.y * 0.05) * amp * this.wind + bend)));
    ctx.drawImage(swaySprite(s, v.t, v.v, sw), x0 - 4, y0);
  };
  // Pflanze in einer Wiegestellung (oben um sw Pixel versetzt), einmal gezeichnet und gemerkt
  var swayCache = {};
  function swaySprite(s, t, vv, sw) {
    var key = t + ":" + vv + ":" + sw, c = swayCache[key];
    if (c) return c;
    var d = s.def; c = SZ.canvas(d.w + 8, d.h); var x = c.ctx;
    if (d.tall) {
      var third = (d.h / 3) | 0, sw1 = Math.round(sw * 0.5);
      x.drawImage(s.cv, 0, third * 2, d.w, d.h - third * 2, 4, third * 2, d.w, d.h - third * 2);
      x.drawImage(s.cv, 0, third, d.w, third, 4 + sw1, third, d.w, third);
      x.drawImage(s.cv, 0, 0, d.w, third, 4 + sw, 0, d.w, third);
    } else {
      var half = (d.h / 2) | 0;
      x.drawImage(s.cv, 0, half, d.w, d.h - half, 4, half, d.w, d.h - half);
      x.drawImage(s.cv, 0, 0, d.w, half, 4 + sw, 0, d.w, half);
    }
    swayCache[key] = c;
    return c;
  }

  // opts: ents (Figuren mit draw/drawShadow/y), afterGround(ctx), beforeLight(ctx), player (Kronen-Transparenz)
  Wd.render = function (ctx, opts) {
    opts = opts || {};
    var self = this, a = this.arena, g = this.ground, S = SZ.light.sky(this.time), t = this.clock;
    if (g.rev !== a.rev && !this.throttle) { this.rebuild(); g = this.ground; }
    ctx.save();
    if (this.shake > 0.2) ctx.translate(Math.round((Math.random() - 0.5) * this.shake), Math.round((Math.random() - 0.5) * this.shake));

    // Tiefe, Wasserfälle, Insel
    SZ.ground.drawAbyss(ctx, t);
    SZ.ground.drawFalls(ctx, g, t);
    // Wer über die Kante stürzt, fällt hinter der Insel in die Tiefe
    (opts.ents || []).concat(this.enemies).forEach(function (e) { if (e.falling) self.drawFaller(ctx, e); });
    ctx.drawImage(g.base, 0, 0);
    SZ.ground.drawWater(ctx, g, t);
    if (this.growth && this.mossBirth) {
      var md = this.mossDyn, img = md.img || (md.img = md.ctx.createImageData(W, H)), d = img.data, gt = this.growth.t;
      d.fill(0);
      for (var i = 0; i < g.mossPix.length; i++) {
        var age = gt - this.mossBirth[i]; if (age < 0) continue;
        var p = g.mossPix[i] * 4, c = g.mossCol[i], fresh = age < 0.35 ? (0.35 - age) / 0.35 : 0;
        d[p] = c[0] + fresh * 60; d[p + 1] = c[1] + fresh * 70; d[p + 2] = c[2] + fresh * 20; d[p + 3] = 255;
      }
      md.ctx.putImageData(img, 0, 0);
      ctx.drawImage(md, 0, 0);
    } else ctx.drawImage(g.moss, 0, 0);
    if (opts.afterGround) opts.afterGround(ctx);

    var ents = (opts.ents || []).concat(this.enemies).filter(function (e) { return !e.falling; });
    // Vegetation: wird nur jedes 3. Bild (im Wachstum jedes 2.) in eine Zwischenebene gezeichnet.
    // Hohe Halme nahe Figuren oder vor Objekten bleiben live und werden mit ihnen nach Tiefe sortiert.
    this._vegN = (this._vegN || 0) + 1;
    // Takt: 0 = niedrige Hälfte A, 1 = hohe, 2 = niedrige Hälfte B, 3 = hohe (im Wachstum alles öfter)
    var ph = this.growth ? this._vegN % 2 * 2 : this._vegN % 4;
    var first = !this._vegLow || this._vegDirty;
    for (var half = 0; half < 2; half++) {
      if (!(first || ph === half * 2 || (this.growth && ph === 0))) continue;
      var lo = (this._vegLow || (this._vegLow = [SZ.canvas(W, H), SZ.canvas(W, H)]))[half];
      lo.ctx.clearRect(0, 0, W, H);
      for (var vi = half; vi < a.veg.length; vi += 2) { var vv = a.veg[vi]; if (!SZ.VEG[vv.t].tall) self.drawVeg(lo.ctx, vv, ents); }
    }
    if (first || ph === 1 || ph === 3) {
      var hi = this._vegHigh || (this._vegHigh = SZ.canvas(W, H)), live = [], tallL = [];
      hi.ctx.clearRect(0, 0, W, H);
      a.veg.forEach(function (v) { if (SZ.VEG[v.t].tall) tallL.push(v); });
      tallL.sort(function (p, q) { return p.y - q.y; });
      tallL.forEach(function (v) {
        var near = false, i;
        for (i = 0; i < ents.length && !near; i++) if (Math.abs(ents[i].x - v.x) < 28 && Math.abs(ents[i].y - v.y) < 30) near = true;
        for (i = 0; i < a.obj.length && !near; i++) {
          var o = a.obj[i], od = SZ.OBJECTS[o.t];
          if (v.y > o.y && v.y - 20 < o.y && Math.abs(v.x - o.x) < od.w / 2 + 8) near = true;
        }
        if (near) live.push(v); else self.drawVeg(hi.ctx, v, ents);
      });
      this._liveTall = live;
    }
    this._vegDirty = false;
    ctx.drawImage(this._vegLow[0], 0, 0); ctx.drawImage(this._vegLow[1], 0, 0);
    ctx.drawImage(this._vegHigh, 0, 0);
    var tall = this._liveTall || [];
    this.parts.drawLow(ctx);
    this.drawFx(ctx, true);    // Effekte unter den Figuren

    // Alles Stehende nach Fußpunkt sortiert
    var items = [];
    a.obj.forEach(function (o) { items.push({ y: o.y, o: o }); });
    tall.forEach(function (v) { items.push({ y: v.y, v: v }); });
    ents.forEach(function (e) { items.push({ y: e.y, e: e }); });
    items.sort(function (p, q) { return p.y - q.y; });

    // Schatten
    var sc = this.sc.ctx, sh = S.shadow;
    sc.setTransform(1, 0, 0, 1, 0, 0); sc.clearRect(0, 0, W, H);
    if (sh.alpha > 0.01) {
      items.forEach(function (it) {
        if (it.v) return;
        if (it.e) { if (it.e.drawShadow) it.e.drawShadow(sc, sh); return; }
        var o = it.o, s = SZ.sprite("obj", o.t, o.v), d = s.def, gr = d.grows ? self.grown(o.x, o.y, 1.2) : 1;
        if (gr <= 0) return;
        var k = m.easeOutCubic(gr);
        SZ.light.shadowXf(sc, sh, o.x, o.y, d.ax, d.ay, k);
        sc.drawImage(s.sil, 0, 0);
      });
      sc.setTransform(1, 0, 0, 1, 0, 0);
      // Schatten nur auf der Insel, nicht in der Tiefe
      sc.globalCompositeOperation = "destination-in"; sc.drawImage(g.base, 0, 0); sc.globalCompositeOperation = "source-over";
      ctx.globalAlpha = sh.alpha; ctx.drawImage(this.sc, 0, 0); ctx.globalAlpha = 1;
    }

    var pl = opts.player;
    items.forEach(function (it) {
      if (it.v) { self.drawVeg(ctx, it.v, ents); return; }
      if (it.e) { it.e.draw(ctx); return; }
      var o = it.o, s = SZ.sprite("obj", o.t, o.v), d = s.def, rt = o._rt || {};
      var gr = d.grows ? self.grown(o.x, o.y, 1.2) : 1;
      if (gr <= 0) return;
      if (gr < 1) { drawGrow(ctx, s.cv, o.x, o.y, d.ax, d.ay, gr); return; }
      var dx = rt.shake ? Math.round(Math.sin(t * 70) * rt.shake * 1.6) : 0;
      var x0 = Math.round(o.x - d.ax) + dx, y0 = Math.round(o.y - d.ay);
      var fade = d.canopy && pl && pl.y < o.y - 2 && Math.abs(pl.x - o.x) < d.w / 2 && pl.y > o.y - d.canopy - 8;
      if (fade) ctx.globalAlpha = 0.55;
      ctx.drawImage(s.cv, x0, y0);
      if (rt.flash > 0) { ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = rt.flash * 0.6; ctx.drawImage(s.cv, x0, y0); ctx.globalCompositeOperation = "source-over"; }
      ctx.globalAlpha = 1;
    });
    this.drawArrows(ctx);
    this.drawFx(ctx, false);
    this.parts.drawHigh(ctx);
    if (opts.beforeLight) opts.beforeLight(ctx);
    SZ.light.apply(ctx, S, this.lights(S), t);
    ctx.restore();
    return S;
  };

  Wd.tickObjects = function (dt) {
    this.arena.obj.forEach(function (o) {
      if (!o._rt) return;
      o._rt.shake = Math.max(0, (o._rt.shake || 0) - dt * 4);
      o._rt.flash = Math.max(0, (o._rt.flash || 0) - dt * 6);
    });
  };

  SZ.World = World;
})();
