/* Monsters Arc – world.js
   Die Spielwelt einer Map (aus Shizukus world.js übernommen): Boden, Wasser, Moos, Vegetation, Objekte, Figuren,
   Partikel, Schatten und Licht – gleiche Zeichenreihenfolge und gleicher Look wie Shizuku.
   Neu für die große Welt (bis 1024 × 1024 Kacheln):
   - Kamera (world.cam = linke obere Ecke in Weltpixeln) und Zoom (world.zoom, 1 = Spielansicht).
   - Boden in Chunks (16 × 16 Kacheln), gebaut nur dort, wo man hinschaut, mit Zeitbudget pro Bild; gemerkt werden
     höchstens MAXCH Chunks. Weit herausgezoomt: Übersichtsbild (1 Pixel je Kachel, Farbe der Bodenart).
   - Pflanzen in Fächern (je Chunk) – gezeichnet wird nur, was sichtbar ist.
   - Zonen-Ebene (Städte, Routen) für das Dev-Kit.
   Kampf-Teile aus Shizuku (Pfeile, Element-Effekte, Wegfindung der Gegner) sind hier nicht dabei. */
(function () {
  var MA = window.MA, W = MA.W, H = MA.H, m = MA.m, T = MA.TILE;
  var MAXCH = 140, FAR = 0.2, VEGZ = 0.5;

  function World(map) {
    this.arena = map;   // Name wie in Shizuku, damit die übernommenen Module (Partikel) passen
    this.time = map.time;
    this.timeSpeed = 0;
    this.clock = 0;
    this.wind = 1;
    this.parts = new MA.Particles();
    this.shake = 0;
    this.sc = MA.canvas(W, H);
    this.pushes = [];
    this.cam = { x: 0, y: 0 };
    this.zoom = 1;
    this.chunks = {}; this.nChunks = 0; this.frame = 0;
    this.rebuild(true);
  }
  var Wd = World.prototype, CS = function () { return MA.ground.CS; };

  // ---------- Boden: Chunks, Übersicht, Zonen ----------
  Wd.rebuild = function (full) {
    var a = this.arena;
    if (full || !this.ov || this.ov.width !== a.cols || this.ov.height !== a.rows) {
      this.chunks = {}; this.nChunks = 0;
      this.ov = MA.canvas(a.cols, a.rows); this.ovImg = this.ov.ctx.createImageData(a.cols, a.rows);
      this.zc = MA.canvas(a.cols, a.rows); this.zcImg = this.zc.ctx.createImageData(a.cols, a.rows);
      this.paintOverview({ x0: 0, y0: 0, x1: a.cols, y1: a.rows });
      this.paintZones({ x0: 0, y0: 0, x1: a.cols, y1: a.rows });
      a.dirty = null; a.zdirty = null;
    } else if (a.dirty) {
      var d = a.dirty; a.dirty = null;
      this.paintOverview(d);
      var cs = CS(), c0x = Math.floor((d.x0 - 2) / cs), c1x = Math.floor((d.x1 + 1) / cs), c0y = Math.floor((d.y0 - 2) / cs), c1y = Math.floor((d.y1 + 1) / cs);
      for (var cy = c0y; cy <= c1y; cy++) for (var cx = c0x; cx <= c1x; cx++) { var c = this.chunks[cx + "," + cy]; if (c) c.stale = true; }
    }
    this.rev = a.rev;
    this.solids = a.solids();
  };
  Wd.refreshSolids = function () { this.solids = this.arena.solids(); };
  Wd.paintOverview = function (r) {
    var a = this.arena, d = this.ovImg.data, x0 = Math.max(0, r.x0), y0 = Math.max(0, r.y0), x1 = Math.min(a.cols, r.x1), y1 = Math.min(a.rows, r.y1);
    for (var y = y0; y < y1; y++) for (var x = x0; x < x1; x++) {
      var t = MA.TILES[a.tiles[y * a.cols + x]], c = t ? (t.rgb || (t.rgb = MA.hex(t.sw))) : [0, 0, 0], i = (y * a.cols + x) * 4;
      var wc = a.wall[y * a.cols + x]; if (wc !== "0") { var wd = MA.walls.def(wc); c = wd.rgb || (wd.rgb = MA.hex(wd.ov)); }   // Mauern
      d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
    }
    this.ov.ctx.putImageData(this.ovImg, 0, 0, x0, y0, x1 - x0, y1 - y0);
    this.ovRev = (this.ovRev || 0) + 1;
  };
  Wd.paintZones = function (r) {
    var a = this.arena, d = this.zcImg.data, x0 = Math.max(0, r.x0), y0 = Math.max(0, r.y0), x1 = Math.min(a.cols, r.x1), y1 = Math.min(a.rows, r.y1), cols = {};
    a.zones.forEach(function (z) { cols[z.id] = MA.hex(z.col); });
    for (var y = y0; y < y1; y++) for (var x = x0; x < x1; x++) {
      var id = a.zone[y * a.cols + x], c = cols[id], i = (y * a.cols + x) * 4;
      if (c) { d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255; } else d[i + 3] = 0;
    }
    this.zc.ctx.putImageData(this.zcImg, 0, 0, x0, y0, x1 - x0, y1 - y0);
  };
  Wd.syncZones = function (all) {
    var a = this.arena;
    if (all) { this.paintZones({ x0: 0, y0: 0, x1: a.cols, y1: a.rows }); a.zdirty = null; }
    else if (a.zdirty) { this.paintZones(a.zdirty); a.zdirty = null; }
  };
  // Sichtbare Chunks (mit Rand pad in Chunks), nach Abstand zur Bildmitte sortiert
  Wd.visChunks = function (pad) {
    var a = this.arena, cs = CS() * T, z = this.zoom, v = { x0: this.cam.x, y0: this.cam.y, x1: this.cam.x + W / z, y1: this.cam.y + H / z };
    var mx = (v.x0 + v.x1) / 2, my = (v.y0 + v.y1) / 2, out = [];
    var c0x = Math.max(0, Math.floor(v.x0 / cs) - pad), c1x = Math.min(Math.ceil(a.cols / CS()) - 1, Math.floor(v.x1 / cs) + pad);
    var c0y = Math.max(0, Math.floor(v.y0 / cs) - pad), c1y = Math.min(Math.ceil(a.rows / CS()) - 1, Math.floor(v.y1 / cs) + pad);
    for (var cy = c0y; cy <= c1y; cy++) for (var cx = c0x; cx <= c1x; cx++) out.push({ cx: cx, cy: cy, d: Math.hypot((cx + 0.5) * cs - mx, (cy + 0.5) * cs - my), vis: cx * cs < v.x1 && (cx + 1) * cs > v.x0 && cy * cs < v.y1 && (cy + 1) * cs > v.y0 });
    out.sort(function (p, q) { return p.d - q.d; });
    return out;
  };
  // Fehlende oder veraltete Chunks bauen. Sichtbare zuerst; ms = Zeitbudget (mind. ein Chunk pro Bild)
  Wd.buildChunks = function (list, ms, force) {
    var t0 = performance.now(), built = 0, self = this;
    for (var i = 0; i < list.length; i++) {
      var q = list[i], k = q.cx + "," + q.cy, c = this.chunks[k];
      if (c && !c.stale) { c.used = this.frame; continue; }
      if (!(force && q.vis) && built > 0 && performance.now() - t0 > ms) continue;
      var nc = MA.ground.buildChunk(this.arena, q.cx, q.cy); nc.used = this.frame;
      if (!c) this.nChunks++;
      this.chunks[k] = nc; built++;
    }
    if (this.nChunks > MAXCH) {   // älteste verwerfen
      var keys = Object.keys(this.chunks).sort(function (p, q) { return self.chunks[p].used - self.chunks[q].used; });
      for (var j = 0; j < keys.length && this.nChunks > MAXCH; j++) { if (this.chunks[keys[j]].used === this.frame) break; delete this.chunks[keys[j]]; this.nChunks--; }
    }
    return built;
  };
  Wd.pending = function () { var n = 0, self = this; this.visChunks(0).forEach(function (q) { var c = self.chunks[q.cx + "," + q.cy]; if (!c || c.stale) n++; }); return n; };

  // Pflanzen-Fächer (je Chunk), neu bei Änderungen
  Wd.vegIndex = function () {
    var a = this.arena;
    if (this._vix && this._vixLen === a.veg.length && this._vixRev === a.vegRev) return this._vix;
    var cs = CS() * T, idx = {};
    for (var i = 0; i < a.veg.length; i++) { var v = a.veg[i], k = Math.floor(v.x / cs) + "," + Math.floor(v.y / cs); (idx[k] || (idx[k] = [])).push(v); }
    this._vix = idx; this._vixLen = a.veg.length; this._vixRev = a.vegRev;
    return idx;
  };

  // ---------- Kamera ----------
  Wd.viewW = function () { return W / this.zoom; };
  Wd.viewH = function () { return H / this.zoom; };
  // Auf einen Punkt richten (weich mit k, 1 = sofort); an den Map-Rändern begrenzt (kleine Maps: mittig)
  Wd.follow = function (x, y, k) {
    var a = this.arena, mw = a.pxW(), mh = a.pxH(), vw = this.viewW(), vh = this.viewH(), tx = x - vw / 2, ty = y - vh / 2;
    tx = mw <= vw ? (mw - vw) / 2 : m.clamp(tx, 0, mw - vw);
    ty = mh <= vh ? (mh - vh) / 2 : m.clamp(ty, 0, mh - vh);
    this.cam.x += (tx - this.cam.x) * (k == null ? 1 : k); this.cam.y += (ty - this.cam.y) * (k == null ? 1 : k);
  };
  // Frei verschieben (Dev-Kit), etwas Meer am Rand ist erlaubt
  Wd.pan = function (dx, dy) {
    var a = this.arena, vw = this.viewW(), vh = this.viewH(), mx = 64 / this.zoom;
    this.cam.x = a.pxW() + 2 * mx <= vw ? (a.pxW() - vw) / 2 : m.clamp(this.cam.x + dx, -mx, a.pxW() - vw + mx);
    this.cam.y = a.pxH() + 2 * mx <= vh ? (a.pxH() - vh) / 2 : m.clamp(this.cam.y + dy, -mx, a.pxH() - vh + mx);
  };
  // Zoom ändern, Punkt unter (sx, sy) in Bildpixeln bleibt stehen
  Wd.setZoom = function (z, sx, sy) {
    if (sx == null) { sx = W / 2; sy = H / 2; }
    var wx = this.cam.x + sx / this.zoom, wy = this.cam.y + sy / this.zoom;
    this.zoom = z; this.cam.x = wx - sx / z; this.cam.y = wy - sy / z; this.pan(0, 0);
  };
  Wd.minZoom = function () { var a = this.arena; return Math.min(1, Math.min(W / a.pxW(), H / a.pxH()) * 0.9); };
  Wd.view = function (pad) { pad = pad || 0; var c = this.cam; return { x0: c.x - pad, y0: c.y - pad, x1: c.x + this.viewW() + pad, y1: c.y + this.viewH() + pad }; };

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
    if (this.zoom >= VEGZ) {
      // Blätter und Blüten nur im sichtbaren Bereich
      a.obj.forEach(function (o) {
        if (o.x < v.x0 - 60 || o.x > v.x1 + 60 || o.y < v.y0 || o.y > v.y1 + 260) return;
        var d = MA.OBJECTS[o.t];
        if (d.leaves && Math.random() < dt * 0.9) self.parts.leaf(o.x + (Math.random() - 0.5) * 38, o.y - 2 + Math.random() * 14, 18 + Math.random() * 18);
        if (d.petals && Math.random() < dt * 1.3) self.parts.petal(o.x, o.y, 22 + Math.random() * 18);
        if ((d.deco || d.house) && Math.random() < dt * 2.6) { var sm = MA.deco.smokeAt(o); if (sm) sm.forEach(function (q) { self.parts.smoke(q[0], q[1], self.wind); }); }   // Schornsteine rauchen
      });
      var tx0 = Math.max(0, Math.floor(v.x0 / T)), tx1 = Math.min(a.cols - 1, Math.floor(v.x1 / T)), ty0 = Math.max(0, Math.floor(v.y0 / T)), ty1 = Math.min(a.rows - 1, Math.floor(v.y1 / T));
      for (var ty = ty0; ty <= ty1; ty++) for (var tx = tx0; tx <= tx1; tx++) if (a.leaf[ty * a.cols + tx] === "1" && Math.random() < dt * 0.05)
        this.parts.leaf((tx + Math.random()) * T, (ty + Math.random()) * T, 34 + Math.random() * 20);
    }
    this.parts.update(dt, this);
    this.tickObjects(dt);
  };

  Wd.lights = function (S) {
    var out = [], self = this, v = this.view(120), z = this.zoom;
    this.arena.obj.forEach(function (o, i) {
      var d = MA.OBJECTS[o.t]; if (!d.light) return;
      if (o.x < v.x0 || o.x > v.x1 || o.y < v.y0 || o.y > v.y1) return;
      out.push({ x: (o.x + d.light.dx - self.cam.x) * z, y: (o.y + d.light.dy - self.cam.y) * z, r: d.light.r * z, col: d.light.col, k: MA.light.lampK(S, self.clock, i * 7.3) });
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

  // opts: ents (Figuren mit draw/drawShadow/x/y), afterGround(ctx), beforeLight(ctx), player (Kronen-Transparenz),
  //       zones (Zonen-Ebene zeigen, 0..1 Deckkraft), build (Zeitbudget für Chunks in ms)
  Wd.render = function (ctx, opts) {
    opts = opts || {};
    this.frame++;
    var self = this, a = this.arena, S = MA.light.sky(this.time), t = this.clock, z = this.zoom;
    if (this.rev !== a.rev && !this.throttle) this.rebuild();
    if (a.zdirty) this.syncZones();
    var cx = z >= 1 ? Math.round(this.cam.x) : this.cam.x, cy = z >= 1 ? Math.round(this.cam.y) : this.cam.y;
    var vw = W / z, vh = H / z, v = { x0: cx - 40, y0: cy - 20, x1: cx + vw + 40, y1: cy + vh + 90 };
    MA.ground.drawSea(ctx);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    var shx = 0, shy = 0;
    if (this.shake > 0.2) { shx = Math.round((Math.random() - 0.5) * this.shake); shy = Math.round((Math.random() - 0.5) * this.shake); }
    ctx.scale(z, z);
    ctx.translate(-cx + shx, -cy + shy);

    // Boden
    var cs = CS() * T, shown = [];
    if (z < FAR) ctx.drawImage(this.ov, 0, 0, a.cols, a.rows, 0, 0, a.pxW(), a.pxH());
    else {
      var list = this.visChunks(z >= 1 ? 1 : 0);
      this.buildChunks(list, opts.build != null ? opts.build : 8, z >= 1);
      for (var li = 0; li < list.length; li++) {
        var q = list[li]; if (!q.vis) continue;
        var c = this.chunks[q.cx + "," + q.cy];
        if (c) { ctx.drawImage(c.base, c.x0, c.y0); ctx.drawImage(c.moss, c.x0, c.y0); shown.push(c); }
        else { var tx0 = q.cx * CS(), ty0 = q.cy * CS(), tw = Math.min(CS(), a.cols - tx0), th = Math.min(CS(), a.rows - ty0); ctx.drawImage(this.ov, tx0, ty0, tw, th, tx0 * T, ty0 * T, tw * T, th * T); }
      }
      if (z >= 1) MA.ground.drawWater(ctx, shown, t, { x: cx, y: cy });
    }
    if (opts.zones) { ctx.globalAlpha = opts.zones; ctx.drawImage(this.zc, 0, 0, a.cols, a.rows, 0, 0, a.pxW(), a.pxH()); ctx.globalAlpha = 1; }
    if (opts.afterGround) opts.afterGround(ctx);

    var ents = (opts.ents || []), items = [];
    if (z >= FAR) {
      // Vegetation (nur nah genug): niedrige direkt, hohe nach Tiefe mit Objekten und Figuren sortiert
      var tall = [];
      if (z >= VEGZ) {
        var vix = this.vegIndex(), b0x = Math.floor(v.x0 / cs), b1x = Math.floor(v.x1 / cs), b0y = Math.floor(v.y0 / cs), b1y = Math.floor(v.y1 / cs);
        for (var by = b0y; by <= b1y; by++) for (var bx = b0x; bx <= b1x; bx++) {
          var bucket = vix[bx + "," + by]; if (!bucket) continue;
          for (var i = 0; i < bucket.length; i++) {
            var vv = bucket[i]; if (vv.x < v.x0 || vv.x > v.x1 || vv.y < v.y0 || vv.y > v.y1) continue;
            if (MA.VEG[vv.t].tall) tall.push(vv); else self.drawVeg(ctx, vv, ents);
          }
        }
        this.parts.drawLow(ctx);
      }
      a.obj.forEach(function (o) { var d = MA.OBJECTS[o.t]; if (o.x + d.w < v.x0 || o.x - d.w > v.x1 || o.y < v.y0 || o.y - d.h > v.y1) return; items.push({ y: o.s != null ? o.s : o.y, o: o }); });   // Hausdeko (o.s) direkt nach ihrem Haus
      tall.forEach(function (q2) { items.push({ y: q2.y, v: q2 }); });
      // Mauern (seit v0.13): je Kachel ein Stück, sortiert nach dem Fuß
      var wx0 = Math.max(0, Math.floor(v.x0 / T) - 1), wx1 = Math.min(a.cols - 1, Math.floor(v.x1 / T) + 1), wy0 = Math.max(0, Math.floor(v.y0 / T) - 1), wy1 = Math.min(a.rows - 1, Math.floor((v.y1 + 24) / T));
      for (var wy = wy0; wy <= wy1; wy++) for (var wxx = wx0; wxx <= wx1; wxx++) {
        if (a.wall[wy * a.cols + wxx] === "0") continue;
        var wp = MA.walls.piece(a, wxx, wy); items.push({ y: wy * T + wp.ay - wp.H - 2, w: wp, wx: wxx * T, wy: wy * T, tx: wxx, ty: wy });
      }
      ents.forEach(function (e) { items.push({ y: e.y, e: e }); });
      items.sort(function (p, q2) { return p.y - q2.y; });

      // Schatten (nur in der Spielansicht; Schattenbild in Bildgröße, Kamera über MA.light.off)
      var sc = this.sc.ctx, shd = S.shadow;
      if (z === 1 && shd.alpha > 0.01) {
        sc.setTransform(1, 0, 0, 1, 0, 0); sc.clearRect(0, 0, W, H);
        MA.light.off.x = cx; MA.light.off.y = cy;
        items.forEach(function (it) {
          if (it.v) return;
          if (it.w && MA.walls.shadow(sc, shd, a, it.tx, it.ty)) return;
          if (it.w) { MA.light.shadowXf(sc, shd, it.wx + it.w.ax - 2, it.wy + it.w.ay - it.w.H - 2, it.w.ax, it.w.ay, 1); sc.drawImage(it.w.sil, 0, 0); return; }
          if (it.e) { if (it.e.drawShadow) it.e.drawShadow(sc, shd); return; }
          var o = it.o, s = MA.sprite("obj", o.t, o.v), d = s.def;
          if (d.shadow) { d.shadow(sc, shd, o); return; }
          if (d.deco) return;   // Hausdeko: kein Bodenschatten   // eigener 3D-Schatten (Häuser)
          MA.light.shadowXf(sc, shd, o.x, o.y, d.ax, d.ay, 1);
          sc.drawImage(s.sil, 0, 0);
        });
        sc.setTransform(1, 0, 0, 1, 0, 0);
        MA.light.off.x = 0; MA.light.off.y = 0;
        ctx.globalAlpha = shd.alpha; ctx.drawImage(this.sc, cx, cy); ctx.globalAlpha = 1;
      }

      var pl = opts.player;
      var faded = [];
      items.forEach(function (it) {
        if (it.v) { self.drawVeg(ctx, it.v, ents); return; }
        if (it.e) { it.e.draw(ctx); return; }
        if (it.w) { ctx.drawImage(it.w.cv, it.wx - 2, it.wy - it.w.H - 2); return; }
        var o = it.o, d0 = MA.OBJECTS[o.t], fr = d0.frames ? Math.floor(t * (d0.fps || 6) + o.x * 0.37 + o.y * 0.11) % d0.frames : 0;   // Banner flattern
        var s = MA.sprite("obj", o.t, o.v, fr), d = s.def, rt = o._rt || {};
        var dx = rt.shake ? Math.round(Math.sin(t * 70) * rt.shake * 1.6) : 0;
        var x0 = Math.round(o.x - d.ax) + dx, y0 = Math.round(o.y - d.ay);
        var fade = d.canopy && pl && pl.y < o.y - 2 && Math.abs(pl.x - o.x) < d.w / 2 && pl.y > o.y - d.canopy - 8;
        if (fade && d.house) faded.push(o);
        // Hausdeko blendet mit ihrem Haus aus
        if (o.s != null && faded.some(function (hq) { return Math.abs(hq.y + 0.5 - o.s) < 0.01 && Math.abs(o.x - hq.x) < MA.OBJECTS[hq.t].w / 2; })) fade = true;
        if (fade) ctx.globalAlpha = 0.55;
        ctx.drawImage(s.cv, x0, y0);
        ctx.globalAlpha = 1;
      });
      if (z >= VEGZ) this.parts.drawHigh(ctx);
    }
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
