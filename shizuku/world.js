/* Shizuku – world.js
   Die Spielwelt einer Arena: Boden-Cache, Wasser, Moos, Vegetation, Objekte, Figuren, Partikel,
   Schatten und Licht. Wird von Arena, Übergang und Dev Tool gemeinsam benutzt.
   Wachstum: growth = { t, cx, cy } lässt Moos und Pflanzen von einem Punkt aus nach außen wachsen. */
(function () {
  var SZ = window.SZ, W = SZ.W, H = SZ.H, m = SZ.m;

  function World(arena) {
    this.arena = arena;
    this.time = arena.time;
    this.timeSpeed = 0;      // Spielstunden pro Sekunde (0 = Zeit steht)
    this.clock = 0;          // Sekunden seit Start (Animationen)
    this.wind = 1;
    this.parts = new SZ.Particles();
    this.growth = null;
    this.shake = 0;
    this.ground = null;
    this.sc = SZ.canvas(W, H);   // Schatten-Ebene
    this.mossDyn = null;
    this.rebuild();
  }
  var Wd = World.prototype;

  Wd.rebuild = function () { this.ground = SZ.ground.build(this.arena); this.solids = this.arena.solids(); this.mossBirth = null; };
  Wd.refreshSolids = function () { this.solids = this.arena.solids(); };

  // ---------- Wachstum ----------
  Wd.GROW_SPAN = 2.5;    // Sekunden, bis die Welle den äußersten Rand erreicht
  Wd.startGrowth = function (cx, cy) {
    var maxD = 0;
    [[0, 0], [W, 0], [0, H], [W, H]].forEach(function (p) { maxD = Math.max(maxD, m.dist(cx, cy, p[0], p[1] * 1.25)); });
    this.growth = { t: 0, cx: cx, cy: cy, maxD: maxD };
    var g = this.ground, b = new Float32Array(g.mossPix.length);
    for (var i = 0; i < g.mossPix.length; i++) { var p = g.mossPix[i]; b[i] = this.birth(p % W, (p / W) | 0, g.mossN[i]); }
    this.mossBirth = b;
    if (!this.mossDyn) this.mossDyn = SZ.canvas(W, H);
  };
  // Geburtszeitpunkt eines Punkts: Entfernung zum Tropfen plus organisches Rauschen
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

  // ---------- Takt ----------
  Wd.update = function (dt) {
    this.clock += dt;
    if (this.timeSpeed) this.time = (this.time + this.timeSpeed * dt + 24) % 24;
    if (this.growth) { this.growth.t += dt; if (this.growth.t > this.GROW_SPAN + 1.5) { this.growth = null; } }
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 30);
    var self = this, a = this.arena;
    // Laub von Ahornbäumen
    a.obj.forEach(function (o) {
      var d = SZ.OBJECTS[o.t];
      if (d.leaves && Math.random() < dt * 0.9 * self.grown(o.x, o.y, 1.2)) self.parts.leaf(o.x + (Math.random() - 0.5) * 38, o.y - 2 + Math.random() * 14, 18 + Math.random() * 18);
    });
    // Laubfall-Zonen
    for (var i = 0; i < a.leaf.length; i++) if (a.leaf[i] === "1" && Math.random() < dt * 0.05) {
      var tx = i % SZ.COLS, ty = (i / SZ.COLS) | 0, x = (tx + Math.random()) * SZ.TILE, y = (ty + Math.random()) * SZ.TILE;
      if (this.grown(x, y, 1) >= 1) this.parts.leaf(x, y, 34 + Math.random() * 20);
    }
    this.parts.update(dt, this);
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
    var w = cv.width * sx, h = cv.height * sy;
    ctx.drawImage(cv, 0, 0, cv.width, cv.height, Math.round(x - ax * sx), Math.round(y - ay * sy), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
  }

  // opts: ents (Figuren mit draw/drawShadow/y), afterGround(ctx), player (für Kronen-Transparenz)
  Wd.render = function (ctx, opts) {
    opts = opts || {};
    var self = this, a = this.arena, g = this.ground, S = SZ.light.sky(this.time), t = this.clock;
    if (g.rev !== a.rev && !this.throttle) { this.rebuild(); g = this.ground; }
    ctx.save();
    if (this.shake > 0.2) ctx.translate(Math.round((Math.random() - 0.5) * this.shake), Math.round((Math.random() - 0.5) * this.shake));

    // Boden, Wasser, Moos
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

    // Vegetation (flach, wiegt im Wind)
    a.veg.forEach(function (v) {
      var s = SZ.sprite("veg", v.t, v.v), d = s.def, gr = self.grown(v.x, v.y, 0.75);
      if (gr <= 0) return;
      if (gr < 1) { drawGrow(ctx, s.cv, v.x, v.y, d.ax, d.ay, gr); return; }
      var x0 = Math.round(v.x - d.ax), y0 = Math.round(v.y - d.ay);
      if (d.flat) { ctx.drawImage(s.cv, x0, y0); return; }
      var half = (d.h / 2) | 0, sw = Math.round(Math.sin(t * 1.7 + v.x * 0.07 + v.y * 0.05) * 0.9 * self.wind);
      ctx.drawImage(s.cv, 0, half, d.w, d.h - half, x0, y0 + half, d.w, d.h - half);
      ctx.drawImage(s.cv, 0, 0, d.w, half, x0 + sw, y0, d.w, half);
    });
    this.parts.drawLow(ctx);

    // Liste aller stehenden Dinge, nach Fußpunkt sortiert
    var items = [];
    a.obj.forEach(function (o) { items.push({ y: o.y, o: o }); });
    (opts.ents || []).forEach(function (e) { items.push({ y: e.y, e: e }); });
    items.sort(function (p, q) { return p.y - q.y; });

    // Schatten
    var sc = this.sc.ctx, sh = S.shadow;
    sc.setTransform(1, 0, 0, 1, 0, 0); sc.clearRect(0, 0, W, H);
    if (sh.alpha > 0.01) {
      items.forEach(function (it) {
        if (it.e) { if (it.e.drawShadow) it.e.drawShadow(sc, sh); return; }
        var o = it.o, s = SZ.sprite("obj", o.t, o.v), d = s.def, gr = d.grows ? self.grown(o.x, o.y, 1.2) : 1;
        if (gr <= 0) return;
        var k = m.easeOutCubic(gr);
        sc.setTransform(1, 0, -sh.x * k, -sh.y * k, o.x - d.ax + d.ay * sh.x * k, o.y + d.ay * sh.y * k);
        sc.drawImage(s.sil, 0, 0);
      });
      sc.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = sh.alpha; ctx.drawImage(this.sc, 0, 0); ctx.globalAlpha = 1;
    }

    // Objekte und Figuren
    var pl = opts.player;
    items.forEach(function (it) {
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
      if (rt.flash > 0) { ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = rt.flash; ctx.drawImage(s.cv, x0, y0); ctx.globalCompositeOperation = "source-over"; }
      ctx.globalAlpha = 1;
    });
    this.parts.drawHigh(ctx);
    if (opts.beforeLight) opts.beforeLight(ctx);
    SZ.light.apply(ctx, S, this.lights(S), t);
    ctx.restore();
    return S;
  };

  // Laufzeitwerte der Objekte (Wackeln, Aufblitzen) abklingen lassen
  Wd.tickObjects = function (dt) {
    this.arena.obj.forEach(function (o) {
      if (!o._rt) return;
      o._rt.shake = Math.max(0, (o._rt.shake || 0) - dt * 4);
      o._rt.flash = Math.max(0, (o._rt.flash || 0) - dt * 6);
    });
  };

  SZ.World = World;
})();
