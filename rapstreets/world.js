/* Rap Streets – world.js
   Map-Modell und Zeichnen der Szene:
   - Map: { name, time, tiles (G×G Zeichen), obj: [{t, v, r, x, y}], ppl: [{v, x, y, f}] }
   - Boden als fertiges Bild (wird nur an geänderten Stellen neu berechnet)
   - Schatten (Sonne wandert mit der Uhrzeit), Tiefensortierung, Crowd-Animation, Dampf aus Gullis
   - Licht: Tageszeit-Farbe, nachts leuchtende Fenster und Laternen */
(function () {
  var RS = window.RS, G = RS.G, HW = RS.HW, HH = RS.HH, W = RS.W, H = RS.H, m = RS.m;

  // ---------- Map ----------
  RS.blankMap = function () { return { name: "Brooklyn", time: 17.5, tiles: new Array(G * G + 1).join("s"), obj: [], ppl: [] }; };
  RS.cleanMap = function (d) {
    var b = RS.blankMap(); if (!d || typeof d !== "object") return b;
    var t = typeof d.tiles === "string" && d.tiles.length === G * G ? d.tiles : b.tiles;
    t = t.replace(/[^a-z]/g, "s").split("").map(function (c) { return RS.TILES[c] ? c : "s"; }).join("");
    return {
      name: String(d.name || b.name).slice(0, 40), time: m.clamp(+d.time || b.time, 0, 24), tiles: t,
      obj: (Array.isArray(d.obj) ? d.obj : []).filter(function (o) { return o && RS.OBJECTS[o.t]; }).slice(0, 600).map(function (o) {
        return { t: o.t, v: m.clamp(o.v | 0, 0, RS.OBJECTS[o.t].variants - 1), r: o.r ? 1 : 0, x: +o.x || 0, y: +o.y || 0 };
      }),
      ppl: (Array.isArray(d.ppl) ? d.ppl : []).filter(function (p) { return p; }).slice(0, 800).map(function (p) {
        return { v: (p.v | 0) % RS.PEOPLE_N, x: +p.x || 0, y: +p.y || 0, f: p.f ? 1 : 0 };
      }),
      stage: d.stage && isFinite(+d.stage.x) && isFinite(+d.stage.y) ? { x: m.clamp(+d.stage.x, 1, G - 1), y: m.clamp(+d.stage.y, 1, G - 1) } : null
    };
  };
  // Bühne: hier stehen die Rapper. Ohne Angabe: vor dem ersten Ghettoblaster, sonst unten in der Bildmitte
  // Plätze auf der Bühne: c Mitte, u = Richtung nach rechts im Bild, f = Richtung zum Betrachter
  RS.stageSpots = function (map) {
    var S = RS.stageOf(map), k = Math.SQRT1_2, u = { x: k, y: -k }, f = { x: k, y: k };
    var at = function (su, sf) { return { x: S.x + u.x * su + f.x * sf, y: S.y + u.y * su + f.y * sf }; };
    return { c: S, u: u, f: f, at: at, wait: [at(-1.6, -0.2), at(1.6, -0.2)] };
  };
  RS.stageOf = function (map) {
    if (map.stage) return map.stage;
    var bb = map.obj.filter(function (o) { return o.t === "boombox"; })[0];
    return bb ? { x: bb.x + 0.9, y: bb.y + 0.9 } : { x: 21.5, y: 21.5 };
  };

  // ---------- Welt ----------
  function World(map) {
    this.map = RS.cleanMap(map);
    this.time = this.map.time; this.cheer = false; this.t = 0;
    this.ground = RS.canvas(W, H); this.gimg = this.ground.ctx.createImageData(W, H);
    this.shadow = RS.canvas(W, H); this.light = RS.canvas(W, H); this.fx = RS.canvas(W, H);
    this.steam = []; this.order = null; this.actors = []; this.hype = 0; this.beat = null; this.groundAll();
  }
  RS.World = World;
  World.prototype.tile = function (x, y) { if (x < 0 || y < 0 || x >= G || y >= G) return "s"; return this.map.tiles[y * G + x]; };
  World.prototype.setTile = function (x, y, c) {
    if (x < 0 || y < 0 || x >= G || y >= G || this.tile(x, y) === c) return false;
    var i = y * G + x, t = this.map.tiles; this.map.tiles = t.slice(0, i) + c + t.slice(i + 1); return true;
  };
  // Bodenbild in einem Bildschirm-Rechteck neu berechnen (Bildpunkt → Weltpunkt → Farbe)
  World.prototype.groundRect = function (x0, y0, x1, y1) {
    var self = this, d = this.gimg.data, tile = function (x, y) { return self.tile(x, y); };
    x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0)); x1 = Math.min(W, Math.ceil(x1)); y1 = Math.min(H, Math.ceil(y1));
    for (var py = y0; py < y1; py++) for (var px = x0; px < x1; px++) {
      var g = RS.toGrid(px + 0.5, py + 0.5), X = m.clamp(g.x, 0, G - 0.001), Y = m.clamp(g.y, 0, G - 0.001);
      var c = RS.groundAt(tile(Math.floor(X), Math.floor(Y)), X, Y, tile), i = (py * W + px) * 4;
      d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
    }
    this.ground.ctx.putImageData(this.gimg, 0, 0, x0, y0, x1 - x0, y1 - y0);
  };
  World.prototype.groundAll = function () { this.groundRect(0, 0, W, H); };
  World.prototype.groundTiles = function (list) {   // list: [[x, y], …] geänderte Felder (Nachbarn wegen Bordstein mit)
    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    list.forEach(function (q) { var cx = RS.sx(q[0] + 0.5, q[1] + 0.5), cy = RS.sy(q[0] + 0.5, q[1] + 0.5); x0 = Math.min(x0, cx); x1 = Math.max(x1, cx); y0 = Math.min(y0, cy); y1 = Math.max(y1, cy); });
    if (x0 > x1) return; this.groundRect(x0 - 2 * HW - 2, y0 - 2 * HH - 2, x1 + 2 * HW + 2, y1 + 2 * HH + 2);
  };
  World.prototype.dirty = function () { this.order = null; };

  // ---------- Tiefensortierung ----------
  // Jedes Element hat eine Grundfläche [x0,x1]×[y0,y1]. Liegt A ganz hinter B (kleineres x oder y), wird A zuerst gezeichnet.
  function items(w) {
    var L = [];
    w.map.obj.forEach(function (o, i) { var s = RS.sprite(o.t, o.v, o.r); L.push({ k: "o", o: o, s: s, i: i, x0: o.x, y0: o.y, x1: o.x + s.w, y1: o.y + s.d, flat: s.def.flat }); });
    w.map.ppl.forEach(function (p, i) { L.push({ k: "p", p: p, i: i, x0: p.x - 0.15, y0: p.y - 0.15, x1: p.x + 0.15, y1: p.y + 0.15 }); });
    w.actors.forEach(function (a, i) { L.push({ k: "a", a: a, i: i, x0: a.x - 0.15, y0: a.y - 0.15, x1: a.x + 0.15, y1: a.y + 0.15 }); });
    L.forEach(function (q) {
      q.key = q.x0 + q.x1 + q.y0 + q.y1;
      // Bildschirm-Spanne grob (für schnelle Überlappungsprüfung)
      q.l = RS.sx(q.x0, q.y1) - 2; q.r = RS.sx(q.x1, q.y0) + 2;
    });
    return L;
  }
  function behind(a, b) {   // 1: a vor b zeichnen, -1: b vor a, 0: egal
    var e = 0.001, ab = a.x1 <= b.x0 + e || a.y1 <= b.y0 + e, ba = b.x1 <= a.x0 + e || b.y1 <= a.y0 + e;
    if (ab && !ba) return 1; if (ba && !ab) return -1; return 0;
  }
  World.prototype.sort = function () {
    var L = items(this), n = L.length, flat = L.filter(function (q) { return q.flat; }), rest = L.filter(function (q) { return !q.flat; });
    n = rest.length; var inn = new Array(n).fill(0), out = []; for (var i = 0; i < n; i++) out.push([]);
    for (i = 0; i < n; i++) for (var j = i + 1; j < n; j++) {
      var a = rest[i], b = rest[j]; if (a.r < b.l || b.r < a.l) continue;   // überlappen sich auf dem Bildschirm nicht
      var k = behind(a, b); if (!k) k = a.key <= b.key ? 1 : -1;
      if (k > 0) { out[i].push(j); inn[j]++; } else { out[j].push(i); inn[i]++; }
    }
    // Kahn mit Vorrang nach Tiefe
    var ready = [], res = [];
    for (i = 0; i < n; i++) if (!inn[i]) ready.push(i);
    while (res.length < n) {
      if (!ready.length) { var best = -1; for (i = 0; i < n; i++) if (inn[i] > 0 && (best < 0 || rest[i].key < rest[best].key)) best = i; inn[best] = 0; ready.push(best); }   // Zyklus: aufbrechen
      ready.sort(function (x, y) { return rest[y].key - rest[x].key; });
      var c = ready.pop(); if (inn[c] < 0) continue; inn[c] = -1; res.push(rest[c]);
      out[c].forEach(function (d) { if (inn[d] > 0 && --inn[d] === 0) ready.push(d); });
    }
    flat.sort(function (a, b) { return a.key - b.key; });
    this.order = flat.concat(res);
  };

  // ---------- Licht ----------
  // Farbe des Umgebungslichts (multipliziert), Nachtstärke (0…1) und Sonnenrichtung je Uhrzeit
  var KEYS = [[0, [52, 62, 104], 1], [5, [60, 68, 110], 1], [6.3, [200, 140, 120], 0.45], [8, [246, 232, 214], 0], [12, [255, 252, 246], 0], [16.5, [255, 238, 214], 0], [18.6, [236, 150, 110], 0.3], [19.8, [120, 96, 140], 0.75], [21, [60, 68, 112], 1], [24, [52, 62, 104], 1]];
  RS.lightAt = function (t) {
    t = ((t % 24) + 24) % 24;
    for (var i = 0; i < KEYS.length - 1; i++) if (t >= KEYS[i][0] && t <= KEYS[i + 1][0]) {
      var a = KEYS[i], b = KEYS[i + 1], k = m.smooth((t - a[0]) / (b[0] - a[0]));
      return { amb: RS.mix(a[1], b[1], k), night: m.lerp(a[2], b[2], k) };
    }
    return { amb: KEYS[0][1], night: 1 };
  };
  RS.sunAt = function (t) {   // Sonne von links (morgens) nach rechts (abends); liefert Schattenvektor je Pixel Höhe (in Feldern)
    var day = m.clamp((t - 6) / 13, 0, 1), alt = Math.sin(day * Math.PI), az = m.lerp(-1.1, 1.1, day);
    var len = 1 / (HH * Math.max(0.35, alt * 1.6 + 0.25));
    var vx = Math.cos(az + 0.785) * len, vy = Math.sin(az + 0.785) * len;   // Schatten zeigt vom Licht weg
    return { x: vy, y: vx, a: t < 5.6 || t > 20 ? 0 : 0.34 * m.smooth((Math.min(t - 5.6, 20 - t)) / 1.2) };
  };
  function shadowPoly(c, b, ox, oy, sun) {   // Schatten eines Quaders: Grundfläche + verschobene Dachfläche, als konvexe Hülle
    var z = b.z, h = b.h, pts = [], cs = [[b.x, b.y], [b.x + b.w, b.y], [b.x + b.w, b.y + b.d], [b.x, b.y + b.d]];
    cs.forEach(function (p) { pts.push([p[0] + sun.x * z, p[1] + sun.y * z]); pts.push([p[0] + sun.x * (z + h), p[1] + sun.y * (z + h)]); });
    pts = pts.map(function (p) { return [ox + RS.sx(p[0], p[1]) - RS.OX, oy + RS.sy(p[0], p[1]) - RS.OY]; });
    pts.sort(function (a, b2) { return a[0] - b2[0] || a[1] - b2[1]; });
    var cr = function (o, a, b2) { return (a[0] - o[0]) * (b2[1] - o[1]) - (a[1] - o[1]) * (b2[0] - o[0]); }, lo = [], up = [];
    pts.forEach(function (p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); });
    for (var i = pts.length - 1; i >= 0; i--) { var p = pts[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
    var hull = lo.slice(0, -1).concat(up.slice(0, -1));
    c.beginPath(); hull.forEach(function (p, i) { if (i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); }); c.closePath(); c.fill();
  }

  // ---------- Zeichnen ----------
  World.prototype.update = function (dt) {
    this.t += dt;
    var self = this;
    // Dampf aus Gullideckeln
    this.map.obj.forEach(function (o) {
      var s = RS.sprite(o.t, o.v, o.r); if (!s.steam) return;
      if (RS.hash2(Math.floor(self.t * 9), o.x * 7 | 0, o.y * 13 | 0) < dt * 9 * 0.9) self.steam.push({ x: o.x + s.steam.x, y: o.y + s.steam.y, z: 0, a: 0, life: 0, max: 2.2 + Math.random() * 1.2, dx: (Math.random() - 0.3) * 4, r: 1.5 + Math.random() });
    });
    this.steam = this.steam.filter(function (p) { p.life += dt; p.z += dt * 9; p.dx += dt * 1.5; p.r += dt * 2.2; return p.life < p.max; });
    if (this.steam.length > 160) this.steam.splice(0, this.steam.length - 160);
  };
  // Figur (Zuschauer oder Rapper) mit Bildposition
  World.prototype.figure = function (q) {
    var f = q.p || q.a, sp = q.p ? RS.person(q.p.v, this.personFrame(q.p, q.i), q.p.f) : q.a.sp;
    return { sp: sp, x: Math.round(RS.sx(f.x, f.y) - sp.ax), y: Math.round(RS.sy(f.x, f.y) - sp.ay - (q.a && q.a.z || 0)) };
  };
  World.prototype.personFrame = function (p, i) {
    var ph = RS.hash2(i, p.v, 3), t = this.t, b = this.beat;
    // Jubeln: im Editor alle (Vorschau), im Battle je nach Hype – wer eine niedrige Schwelle hat, jubelt zuerst
    var on = this.cheer || (this.hype > 0.02 && RS.hash2(i, p.v, 7) * 0.92 + 0.04 < this.hype);
    var md = function (n) { return ((n % 2) + 2) % 2; };
    if (on) return 2 + (b != null ? md(Math.floor(b * 2 + (ph < 0.5 ? 0 : 0.5))) : Math.floor(t * 4.2 + ph * 4) % 2);
    if (b != null) return md(Math.floor(b + (ph < 0.25 ? 0.5 : 0)));   // Wippen im Takt (ein paar auf der Offbeat)
    return Math.floor(t * (1.6 + ph * 0.8) + ph * 2) % 2;
  };
  World.prototype.render = function (c, opt) {
    opt = opt || {};
    if (!this.order || this.actors.length) this.sort();
    var L = RS.lightAt(this.time), sun = RS.sunAt(this.time), self = this;
    c.drawImage(this.ground, 0, 0);
    // Schatten: erst deckend in eigene Ebene, dann einmal halbtransparent drüber (keine doppelten Abdunklungen)
    if (sun.a > 0.01) {
      var sc = this.shadow.ctx; sc.clearRect(0, 0, W, H); sc.fillStyle = "#000";
      this.order.forEach(function (q) {
        if (q.k === "o") { if (q.flat) return; q.s.boxes.forEach(function (b) { if (b.h > 0) shadowPoly(sc, { x: b.x + q.o.x, y: b.y + q.o.y, w: b.w, d: b.d, z: b.z, h: b.h }, RS.OX, RS.OY, sun); }); }
        else { var f = q.p || q.a, px = RS.sx(f.x, f.y), py = RS.sy(f.x, f.y); var ex = RS.sx(f.x + sun.x * 22, f.y + sun.y * 22) - px, ey = RS.sy(f.x + sun.x * 22, f.y + sun.y * 22) - py; sc.beginPath(); sc.moveTo(px - 3, py); sc.lineTo(px + 3, py); sc.lineTo(px + ex + 2, py + ey); sc.lineTo(px + ex - 2, py + ey); sc.closePath(); sc.fill(); }
      });
      c.globalAlpha = sun.a; c.drawImage(this.shadow, 0, 0); c.globalAlpha = 1;
    }
    // Weicher Kontaktschatten unter Figuren (auch nachts)
    c.fillStyle = "rgba(0,0,0,.28)";
    this.map.ppl.concat(this.actors).forEach(function (p) { var px = Math.round(RS.sx(p.x, p.y)), py = Math.round(RS.sy(p.x, p.y)); c.fillRect(px - 3, py - 1, 7, 2); c.fillRect(px - 2, py - 2, 5, 1); });
    // Farbiger Ring unter den Rappern (wer wer ist); heller, wenn er das Mikro hat
    this.actors.forEach(function (p) {
      if (!p.ring) return; var px = RS.sx(p.x, p.y), py = RS.sy(p.x, p.y);
      c.save(); c.translate(px, py); c.scale(1, 0.5); c.beginPath(); c.arc(0, 0, 8, 0, Math.PI * 2); c.restore();
      c.strokeStyle = "rgba(" + p.ring.join(",") + "," + (p.on ? 0.95 : 0.5) + ")"; c.lineWidth = 1.5; c.stroke();
    });
    // Objekte und Figuren in Tiefenreihenfolge
    this.order.forEach(function (q) {
      if (q.k === "o") {
        var s = q.s, x = Math.round(RS.sx(q.o.x, q.o.y) - s.ax), y = Math.round(RS.sy(q.o.x, q.o.y) - s.ay);
        c.drawImage(s.cv, x, y); if (opt.sel === q.o) { c.globalAlpha = 0.35 + 0.2 * Math.sin(self.t * 8); c.globalCompositeOperation = "lighter"; c.drawImage(s.cv, x, y); c.globalCompositeOperation = "source-over"; c.globalAlpha = 1; }
      } else { var fg = self.figure(q); c.drawImage(fg.sp.cv, fg.x, fg.y); }
    });
    // Dampf
    this.steam.forEach(function (p) {
      var k = p.life / p.max, a = Math.sin(Math.PI * k) * 0.32, px = RS.sx(p.x, p.y) + p.dx, py = RS.sy(p.x, p.y) - p.z;
      c.fillStyle = "rgba(220,220,224," + (a * 0.7).toFixed(3) + ")"; c.beginPath(); c.arc(px, py, p.r, 0, Math.PI * 2); c.fill();
    });
    // Umgebungslicht
    var a = L.amb.map(Math.round);
    if (a[0] < 254 || a[1] < 254 || a[2] < 254) { c.globalCompositeOperation = "multiply"; c.fillStyle = "rgb(" + a.join(",") + ")"; c.fillRect(0, 0, W, H); c.globalCompositeOperation = "source-over"; }
    // Nachtlichter: Fenster/Schaufenster/Laternenköpfe und Lichtkegel der Laternen
    if (L.night > 0.02) {
      var lc = this.light.ctx; lc.clearRect(0, 0, W, H);
      this.order.forEach(function (q) {
        if (q.k !== "o") return; var s = q.s, ox = RS.sx(q.o.x, q.o.y), oy = RS.sy(q.o.x, q.o.y);
        s.lights.forEach(function (l) {
          var gx = RS.sx(q.o.x + l.x, q.o.y + l.y), gy = RS.sy(q.o.x + l.x, q.o.y + l.y);
          var g = lc.createRadialGradient(gx, gy, 0, gx, gy, l.r); g.addColorStop(0, "rgba(" + l.col.join(",") + ",.55)"); g.addColorStop(0.5, "rgba(" + l.col.join(",") + ",.18)"); g.addColorStop(1, "rgba(" + l.col.join(",") + ",0)");
          lc.fillStyle = g; lc.save(); lc.translate(gx, gy); lc.scale(1, HH / HW); lc.translate(-gx, -gy); lc.fillRect(gx - l.r, gy - l.r, l.r * 2, l.r * 2); lc.restore();
        });
      });
      // Leuchtende Fenster in Tiefenreihenfolge: was davor steht, radiert das Leuchten dahinter aus
      var fc = this.fx.ctx; fc.clearRect(0, 0, W, H);
      this.order.forEach(function (q) {
        if (q.k === "o") {
          var x = Math.round(RS.sx(q.o.x, q.o.y) - q.s.ax), y = Math.round(RS.sy(q.o.x, q.o.y) - q.s.ay);
          fc.globalCompositeOperation = "destination-out"; fc.drawImage(q.s.cv, x, y);
          if (q.s.em) { fc.globalCompositeOperation = "source-over"; fc.drawImage(q.s.em, x, y); }
        } else { var fg = self.figure(q); fc.globalCompositeOperation = "destination-out"; fc.drawImage(fg.sp.cv, fg.x, fg.y); }
      });
      fc.globalCompositeOperation = "source-over";
      c.globalAlpha = L.night; c.globalCompositeOperation = "lighter"; c.drawImage(this.light, 0, 0); c.drawImage(this.fx, 0, 0);
      c.globalCompositeOperation = "source-over"; c.globalAlpha = 1;
    }
  };
  // Treffer: welches Objekt / welche Figur liegt unter dem Bildpunkt? (vorderstes zuerst)
  World.prototype.pick = function (px, py) {
    if (!this.order) this.sort();
    for (var i = this.order.length - 1; i >= 0; i--) {
      var q = this.order[i];
      if (q.k === "o") {
        var s = q.s, x = Math.floor(px - (RS.sx(q.o.x, q.o.y) - s.ax)), y = Math.floor(py - (RS.sy(q.o.x, q.o.y) - s.ay));
        if (x < 0 || y < 0 || x >= s.cv.width || y >= s.cv.height) continue;
        if (!s.alpha) s.alpha = s.cv.ctx.getImageData(0, 0, s.cv.width, s.cv.height).data;
        if (s.alpha[(y * s.cv.width + x) * 4 + 3] > 20) return q;
      } else if (q.p) {
        var sx = RS.sx(q.p.x, q.p.y), sy = RS.sy(q.p.x, q.p.y);
        if (px > sx - 5 && px < sx + 5 && py > sy - 26 && py < sy + 1) return q;
      }
    }
    return null;
  };
  World.prototype.serialize = function () {
    var r = function (v) { return Math.round(v * 100) / 100; }, mp = this.map;
    return { name: mp.name, time: r(this.time), tiles: mp.tiles, obj: mp.obj.map(function (o) { return { t: o.t, v: o.v, r: o.r, x: r(o.x), y: r(o.y) }; }), ppl: mp.ppl.map(function (p) { return { v: p.v, x: r(p.x), y: r(p.y), f: p.f }; }), stage: mp.stage ? { x: r(mp.stage.x), y: r(mp.stage.y) } : null };
  };
})();
