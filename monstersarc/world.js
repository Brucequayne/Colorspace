/* Monsters Arc – world.js
   Die Spielwelt einer Map (aus Shizukus world.js übernommen): Boden, Wasser, Moos, Vegetation, Objekte, Figuren,
   Partikel, Schatten und Licht – gleiche Zeichenreihenfolge und gleicher Look wie Shizuku.
   Neu: Kamera. Die Map ist größer als das Bild; gezeichnet wird nur der sichtbare Ausschnitt (world.cam = linke obere
   Ecke in Weltpixeln). Kampf-Teile aus Shizuku (Pfeile, Element-Effekte, Wegfindung der Gegner) sind hier nicht dabei. */
(function () {
  var MA = window.MA, W = MA.W, H = MA.H, m = MA.m, T = MA.TILE;
  var CANOPY_COLS = {
    maple: ["#A82722", "#D24A2C", "#E07A34", "#8E1F1A"], sakura: ["#F2A6C0", "#FFD0DE", "#FFE8EE", "#E888A8"],
    tree: ["#2E6B3A", "#4A8E44", "#78B858"], cypress: ["#245632", "#3A7840"], cedar: ["#1E4A2A", "#2E6838"], pine: ["#2F4D2C", "#46693A"],
    bamboo: ["#5E8A38", "#8FB84E", "#C8D890"], bush: ["#2E6B3A", "#4A8E44", "#78B858"]
  };

  function World(map) {
    this.arena = map;   // Name wie in Shizuku, damit die übernommenen Module (Partikel) passen
    this.time = map.time;
    this.timeSpeed = 0;
    this.clock = 0;
    this.wind = 1;
    this.parts = new MA.Particles();
    this.shake = 0;
    this.ground = null;
    this.sc = MA.canvas(W, H);
    this.pushes = [];
    this.cam = { x: 0, y: 0 };
    this.rebuild();
  }
  var Wd = World.prototype;

  // Boden neu zeichnen: ganz, oder nur den geänderten Bereich (map.dirty) – bei großen Maps viel schneller
  Wd.rebuild = function (full) {
    var a = this.arena, g = this.ground, d = a.dirty;
    if (!full && g && d && g.W === a.pxW() && g.H === a.pxH()) {
      this.ground = MA.ground.build(a, g, { x0: d.x0 - 2, y0: d.y0 - 2, x1: d.x1 + 2, y1: d.y1 + 2 });
    } else this.ground = MA.ground.build(a);
    a.dirty = null; this.ground.rev = a.rev;
    this.solids = a.solids();
  };
  Wd.refreshSolids = function () { this.solids = this.arena.solids(); };
  Wd.grown = function () { return 1; };   // Shizukus Wachstums-Übergang wird hier nicht gebraucht

  // ---------- Kamera ----------
  // Auf einen Punkt richten (weich mit k, 1 = sofort); an den Map-Rändern begrenzt (kleine Maps: mittig)
  Wd.follow = function (x, y, k) {
    var a = this.arena, mw = a.pxW(), mh = a.pxH(), tx = x - W / 2, ty = y - H / 2;
    tx = mw <= W ? (mw - W) / 2 : m.clamp(tx, 0, mw - W);
    ty = mh <= H ? (mh - H) / 2 : m.clamp(ty, 0, mh - H);
    this.cam.x += (tx - this.cam.x) * (k == null ? 1 : k); this.cam.y += (ty - this.cam.y) * (k == null ? 1 : k);
  };
  // Frei verschieben (Dev-Kit), etwas Meer am Rand ist erlaubt
  Wd.pan = function (dx, dy) {
    var a = this.arena, mx = 64;
    this.cam.x = m.clamp(this.cam.x + dx, -mx, Math.max(-mx, a.pxW() - W + mx));
    this.cam.y = m.clamp(this.cam.y + dy, -mx, Math.max(-mx, a.pxH() - H + mx));
  };
  Wd.view = function (pad) { pad = pad || 0; var c = this.cam; return { x0: c.x - pad, y0: c.y - pad, x1: c.x + W + pad, y1: c.y + H + pad }; };

  // ---------- Wind- und Druckwellen (aus Shizuku) ----------
  Wd.push = function (x, y, r, str, life, mode) { this.pushes.push({ x: x, y: y, r: r, s: str, life: life || 0.6, age: 0, dir: mode && mode.dir, spin: mode && mode.spin }); if (this.pushes.length > 160) this.pushes.shift(); };
  Wd.bendAt = function (x, y) {
    var dx = 0;
    for (var i = 0; i < this.pushes.length; i++) {
      var p = this.pushes[i], d = Math.abs(x - p.x) + Math.abs(y - p.y) * 1.3;
      if (d < p.r) {
        var k = (1 - d / p.r) * p.s * (1 - p.age / p.life);
        if (p.dir != null) dx += Math.cos(p.dir) * k * 1.3 * (1 + 0.35 * Math.sin(p.age * 30 + x * 0.4));
        else if (p.spin) dx += Math.cos(Math.atan2(y - p.y, x - p.x) + p.spin * Math.PI / 2) * k * 1.4 * (1 + 0.4 * Math.sin(p.age * 26 + y * 0.5));
        else dx += (x >= p.x ? 1 : -1) * k;
      }
    }
    return m.clamp(dx, -3, 3);
  };

  // ---------- Takt ----------
  Wd.update = function (dt) {
    this.clock += dt;
    if (this.timeSpeed) this.time = (this.time + this.timeSpeed * dt + 24) % 24;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 30);
    var self = this, a = this.arena, v = this.view(60);
    for (var pi = this.pushes.length - 1; pi >= 0; pi--) { this.pushes[pi].age += dt; if (this.pushes[pi].age > this.pushes[pi].life) this.pushes.splice(pi, 1); }
    // Blätter und Blüten nur im sichtbaren Bereich (große Maps)
    a.obj.forEach(function (o) {
      if (o.x < v.x0 || o.x > v.x1 || o.y < v.y0 || o.y > v.y1 + 60) return;
      var d = MA.OBJECTS[o.t];
      if (d.leaves && Math.random() < dt * 0.9) self.parts.leaf(o.x + (Math.random() - 0.5) * 38, o.y - 2 + Math.random() * 14, 18 + Math.random() * 18);
      if (d.petals && Math.random() < dt * 1.3) self.parts.petal(o.x, o.y, 22 + Math.random() * 18);
    });
    var tx0 = Math.max(0, Math.floor(v.x0 / T)), tx1 = Math.min(a.cols - 1, Math.floor(v.x1 / T)), ty0 = Math.max(0, Math.floor(v.y0 / T)), ty1 = Math.min(a.rows - 1, Math.floor(v.y1 / T));
    for (var ty = ty0; ty <= ty1; ty++) for (var tx = tx0; tx <= tx1; tx++) if (a.leaf[ty * a.cols + tx] === "1" && Math.random() < dt * 0.05)
      this.parts.leaf((tx + Math.random()) * T, (ty + Math.random()) * T, 34 + Math.random() * 20);
    this.parts.update(dt, this);
    this.tickObjects(dt);
  };

  Wd.lights = function (S) {
    var out = [], self = this, v = this.view(120);
    this.arena.obj.forEach(function (o, i) {
      var d = MA.OBJECTS[o.t]; if (!d.light) return;
      if (o.x < v.x0 || o.x > v.x1 || o.y < v.y0 || o.y > v.y1) return;
      out.push({ x: o.x + d.light.dx - self.cam.x, y: o.y + d.light.dy - self.cam.y, r: d.light.r, col: d.light.col, k: MA.light.lampK(S, self.clock, i * 7.3) });
    });
    return out;
  };

  // ---------- Zeichnen (wie Shizuku) ----------
  Wd.drawVeg = function (ctx, v, ents) {
    var s = MA.sprite("veg", v.t, v.v), d = s.def;
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
    var d = s.def; c = MA.canvas(d.w + 8, d.h); var x = c.ctx;
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

  // opts: ents (Figuren mit draw/drawShadow/x/y), afterGround(ctx, Welt-Koordinaten), beforeLight(ctx), player (Kronen-Transparenz)
  Wd.render = function (ctx, opts) {
    opts = opts || {};
    var self = this, a = this.arena, g = this.ground, S = MA.light.sky(this.time), t = this.clock;
    if (g.rev !== a.rev && !this.throttle) { this.rebuild(); g = this.ground; }
    var cx = Math.round(this.cam.x), cy = Math.round(this.cam.y), v = { x0: cx - 40, y0: cy - 20, x1: cx + W + 40, y1: cy + H + 90 };
    MA.ground.drawSea(ctx);
    ctx.save();
    var shx = 0, shy = 0;
    if (this.shake > 0.2) { shx = Math.round((Math.random() - 0.5) * this.shake); shy = Math.round((Math.random() - 0.5) * this.shake); }
    ctx.translate(-cx + shx, -cy + shy);

    // Boden: nur der sichtbare Ausschnitt der großen Bodenbilder
    var sx = Math.max(0, cx), sy = Math.max(0, cy), sw = Math.min(g.W, cx + W) - sx, sh = Math.min(g.H, cy + H) - sy;
    if (sw > 0 && sh > 0) { ctx.drawImage(g.base, sx, sy, sw, sh, sx, sy, sw, sh); }
    MA.ground.drawWater(ctx, g, t, { x: cx, y: cy });
    if (sw > 0 && sh > 0) ctx.drawImage(g.moss, sx, sy, sw, sh, sx, sy, sw, sh);
    if (opts.afterGround) opts.afterGround(ctx);

    var ents = (opts.ents || []);
    // Vegetation: niedrige direkt, hohe nach Tiefe mit Objekten und Figuren sortiert (nur sichtbare)
    var tall = [];
    for (var i = 0; i < a.veg.length; i++) {
      var vv = a.veg[i]; if (vv.x < v.x0 || vv.x > v.x1 || vv.y < v.y0 || vv.y > v.y1) continue;
      if (MA.VEG[vv.t].tall) tall.push(vv); else self.drawVeg(ctx, vv, ents);
    }
    this.parts.drawLow(ctx);

    // Alles Stehende nach Fußpunkt sortiert
    var items = [];
    a.obj.forEach(function (o) { var d = MA.OBJECTS[o.t]; if (o.x + d.w < v.x0 || o.x - d.w > v.x1 || o.y < v.y0 || o.y - d.h > v.y1) return; items.push({ y: o.y, o: o }); });
    tall.forEach(function (q) { items.push({ y: q.y, v: q }); });
    ents.forEach(function (e) { items.push({ y: e.y, e: e }); });
    items.sort(function (p, q) { return p.y - q.y; });

    // Schatten (Schattenbild in Bildgröße, Kamera über MA.light.off)
    var sc = this.sc.ctx, shd = S.shadow;
    sc.setTransform(1, 0, 0, 1, 0, 0); sc.clearRect(0, 0, W, H);
    if (shd.alpha > 0.01) {
      MA.light.off.x = cx; MA.light.off.y = cy;
      items.forEach(function (it) {
        if (it.v) return;
        if (it.e) { if (it.e.drawShadow) it.e.drawShadow(sc, shd); return; }
        var o = it.o, s = MA.sprite("obj", o.t, o.v), d = s.def;
        MA.light.shadowXf(sc, shd, o.x, o.y, d.ax, d.ay, 1);
        sc.drawImage(s.sil, 0, 0);
      });
      sc.setTransform(1, 0, 0, 1, 0, 0);
      MA.light.off.x = 0; MA.light.off.y = 0;
      ctx.globalAlpha = shd.alpha; ctx.drawImage(this.sc, cx, cy); ctx.globalAlpha = 1;
    }

    var pl = opts.player;
    items.forEach(function (it) {
      if (it.v) { self.drawVeg(ctx, it.v, ents); return; }
      if (it.e) { it.e.draw(ctx); return; }
      var o = it.o, d0 = MA.OBJECTS[o.t], fr = d0.frames ? Math.floor(t * (d0.fps || 6) + o.x * 0.37 + o.y * 0.11) % d0.frames : 0;   // Banner flattern
      var s = MA.sprite("obj", o.t, o.v, fr), d = s.def, rt = o._rt || {};
      var dx = rt.shake ? Math.round(Math.sin(t * 70) * rt.shake * 1.6) : 0;
      var x0 = Math.round(o.x - d.ax) + dx, y0 = Math.round(o.y - d.ay);
      var fade = d.canopy && pl && pl.y < o.y - 2 && Math.abs(pl.x - o.x) < d.w / 2 && pl.y > o.y - d.canopy - 8;
      if (fade) ctx.globalAlpha = 0.55;
      ctx.drawImage(s.cv, x0, y0);
      ctx.globalAlpha = 1;
    });
    this.parts.drawHigh(ctx);
    if (opts.beforeLight) opts.beforeLight(ctx);
    ctx.restore();
    MA.light.apply(ctx, S, this.lights(S), t);
    return S;
  };

  Wd.tickObjects = function (dt) {
    this.arena.obj.forEach(function (o) {
      if (!o._rt) return;
      o._rt.shake = Math.max(0, (o._rt.shake || 0) - dt * 4);
      o._rt.flash = Math.max(0, (o._rt.flash || 0) - dt * 6);
    });
  };

  MA.World = World;
})();
