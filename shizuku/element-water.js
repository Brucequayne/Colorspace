/* Shizuku – element-water.js
   Wasser-Element: der Samurai steckt die Waffe ein, hebt die Hände und beschwört Wasser,
   das eine Kachel in Wasser verwandelt. Bewegungen wie ein Tanz, Wasser mit Wellenbewegung.
   Drei Varianten (wechseln sich ab):
     0 Kreis   – Wasser steigt vom Boden, kreist um den Samurai und schießt zur Kachel
     1 Boden   – an der Kachel springt eine Wasserfontäne aus dem Boden und fällt in sich zusammen
     2 Himmel  – eine Wassersäule stürzt gerade vom Himmel auf die Kachel
   Ablauf und Zeiten stehen in VAR. Bei conv wird die Kachel umgewandelt (world.convertTile). */
(function () {
  var SZ = window.SZ, m = SZ.m, TAU = Math.PI * 2;
  var VAR = [{ dur: 2.7, conv: 2.35, flood: 2.2 }, { dur: 2.6, conv: 2.15, flood: 1.95 }, { dur: 2.6, conv: 2.1, flood: 1.85 }];

  // Wasserband: dunkler Rand, helle Mitte, weiße Glanzlinie
  function ribbon(ctx, pts, w, alpha) {
    if (pts.length < 2) return;
    ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.globalAlpha = alpha == null ? 1 : alpha;
    [[w + 2, "rgba(30,82,104,0.6)"], [w, "rgba(96,170,200,0.9)"], [Math.max(1, w - 2), "rgba(170,222,238,0.95)"]].forEach(function (L) {
      ctx.lineWidth = L[0]; ctx.strokeStyle = L[1]; ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y); for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y); ctx.stroke();
    });
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    for (var j = 1; j < pts.length; j += 3) ctx.fillRect(Math.round(pts[j].x), Math.round(pts[j].y - w * 0.3), 1, 1);
    ctx.restore();
  }

  function WaterCast(world, player, tx, ty, variant) {
    this.w = world; this.p = player; this.tx = tx; this.ty = ty; this.v = variant % 3;
    this.cx = tx * SZ.TILE + SZ.TILE / 2; this.cy = ty * SZ.TILE + SZ.TILE / 2;
    this.t = 0; this.done = false; this.converted = false; this.V = VAR[this.v];
    this.face = Math.atan2(this.cy - player.y, this.cx - player.x);
    this.lastRing = 0;
  }
  var P = WaterCast.prototype;

  // Pose und Blickrichtung des Samurai zum Zeitpunkt t (der „Tanz“)
  P.pose = function () {
    var t = this.t, f = this.face, alt = function (a, b, per) { return Math.floor(t / per) % 2 ? a : b; };
    if (t < 0.3) return { anim: "idle", ang: f };
    if (this.v === 0) {
      if (t < 0.7) return { anim: "cast_low", ang: f };
      if (t < 1.8) return { anim: alt("cast_flow", "cast_flow2", 0.28), ang: this.orbitAng() + Math.PI / 2 };
      if (t < 2.25) return { anim: "cast_push", ang: f };
      return { anim: "cast_up", ang: f };
    }
    if (this.v === 1) {
      if (t < 0.6) return { anim: "cast_low", ang: f };
      if (t < 1.7) return { anim: alt("cast_up", "cast_flow", 0.32), ang: f + Math.sin(t * 4) * 0.5 };
      if (t < 2.1) return { anim: "cast_low", ang: f };
      return { anim: "idle", ang: f };
    }
    if (t < 0.9) return { anim: "cast_up", ang: f };
    if (t < 1.6) return { anim: alt("cast_flow", "cast_flow2", 0.3), ang: f + Math.sin(t * 3.4) * 0.6 };
    if (t < 2.1) return { anim: "cast_push", ang: f };
    return { anim: "cast_up", ang: f };
  };
  P.orbitAng = function () { var u = m.clamp((this.t - 0.7) / 1.1, 0, 1); return this.face - Math.PI / 2 + m.smooth(u) * TAU * 1.35; };

  P.update = function (dt) {
    this.t += dt;
    var t = this.t, w = this.w, p = this.p;
    // Tropfen und Wellenringe je nach Variante
    if (this.v === 0 && t > 0.3 && t < 0.8 && Math.random() < dt * 30) w.parts.add({ type: "drop", x: p.x + (Math.random() - 0.5) * 24, y: p.y + (Math.random() - 0.5) * 10, z: 0, vx: 0, vy: 0, vz: 50 + Math.random() * 40, life: 0.8, col: Math.random() < 0.5 ? "#CDEFF2" : "#8FCAD6" });
    if (this.v === 1 && t > 0.6 && t < 2 && t - this.lastRing > 0.22) { this.lastRing = t; w.parts.ring(this.cx, this.cy, 14, 0.8); }
    if (this.v === 1 && t > 0.6 && t < 1.9 && Math.random() < dt * 40) w.parts.splash(this.cx, this.cy - this.fountainH() * 0.9, 1, 0.5);
    if (this.v === 2 && t > 1.35 && t < 2.05) { if (Math.random() < dt * 50) w.parts.splash(this.cx + (Math.random() - 0.5) * 6, this.cy, 1, 0.7); if (t - this.lastRing > 0.18) { this.lastRing = t; w.parts.ring(this.cx, this.cy, 16, 0.7); } }
    if (this.v === 0 && t > 2.2 && !this.hitDone) { this.hitDone = true; w.parts.splash(this.cx, this.cy, 16, 0.9); w.parts.ring(this.cx, this.cy, 18, 0.8); SZ.audio.play("step_water", { x: this.cx, vol: 1.6, rate: 0.8 }); }
    if (this.v === 2 && t > 1.35 && !this.hitDone) { this.hitDone = true; w.shake = 1.5; SZ.audio.play("step_water", { x: this.cx, vol: 1.6, rate: 0.7 }); }
    if (!this.converted && t >= this.V.conv) {
      this.converted = true;
      w.convertTile(this.tx, this.ty, "w");
      w.parts.splash(this.cx, this.cy, 14, 0.7); w.parts.ring(this.cx, this.cy, 22, 1.1); w.parts.ring(this.cx, this.cy, 34, 1.5);
      SZ.audio.play("step_water", { x: this.cx, vol: 1.4, rate: 0.9 });
      if (this.onConvert) this.onConvert();
    }
    if (t >= this.V.dur) { this.done = true; return false; }
  };

  P.fountainH = function () {
    var t = this.t;
    if (t < 0.6) return 0;
    if (t < 1.7) return 30 * m.easeOutBack(m.clamp((t - 0.6) / 0.7, 0, 1));
    return 30 * (1 - m.easeInCubic(m.clamp((t - 1.7) / 0.4, 0, 1)));
  };

  P.draw = function (ctx) {
    var t = this.t, p = this.p, cx = this.cx, cy = this.cy, pts = [], i;
    // Überflutung der Kachel (vor und kurz nach dem Umwandeln)
    var fl = (t - this.V.flood) / (this.V.conv - this.V.flood + 0.05);
    if (fl > 0) {
      var a = this.converted ? Math.max(0, 1 - (t - this.V.conv) / 0.3) : 1, r = 3 + Math.min(1, fl) * 11;
      ctx.save(); ctx.beginPath(); ctx.rect(cx - 8, cy - 8, 16, 16); ctx.clip();
      ctx.globalAlpha = 0.85 * a; ctx.fillStyle = "#3C7A86"; ctx.beginPath(); ctx.ellipse(cx, cy, r, r * 0.85, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = "rgba(200,240,245,0.8)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(cx, cy, r, r * 0.85, 0, 0, TAU); ctx.stroke();
      ctx.restore();
    }
    if (this.v === 0) {
      var hx = p.x, hy = p.y - 12;
      if (t > 0.3 && t < 0.7) {
        // Wasser steigt spiralförmig vom Boden auf
        var u = (t - 0.3) / 0.4;
        for (i = 0; i <= 14; i++) { var s = i / 14 * u, ph = this.face - Math.PI / 2 + s * 4; pts.push({ x: hx + Math.cos(ph) * (6 + s * 7), y: p.y - s * 12 + Math.sin(ph) * (6 + s * 7) * 0.5 }); }
        ribbon(ctx, pts, 2 + u);
      } else if (t >= 0.7 && t < 1.8) {
        // Kreisen um den Samurai, mit Wellen
        var th = this.orbitAng();
        for (i = 0; i <= 18; i++) { var ph2 = th - 1.9 + i / 18 * 1.9; pts.push({ x: hx + Math.cos(ph2) * 14, y: hy + 2 + Math.sin(ph2) * 7.5 - Math.sin(ph2 * 3 + t * 9) * 2.2 }); }
        ribbon(ctx, pts, 3);
      } else if (t >= 1.8 && t < 2.3) {
        // Schuss zur Kachel im Bogen
        var th2 = this.orbitAng(), sx = hx + Math.cos(th2) * 14, sy = hy + 2 + Math.sin(th2) * 7.5, u2 = m.clamp((t - 1.8) / 0.42, 0, 1);
        var mx = (sx + cx) / 2, my = Math.min(sy, cy) - 34;
        for (i = 0; i <= 16; i++) {
          var s2 = Math.max(0, u2 - 0.45 + i / 16 * 0.45), e = s2, bx = (1 - e) * (1 - e) * sx + 2 * (1 - e) * e * mx + e * e * cx, by = (1 - e) * (1 - e) * sy + 2 * (1 - e) * e * my + e * e * cy;
          pts.push({ x: bx, y: by + Math.sin(e * 14 - t * 16) * 2 });
        }
        ribbon(ctx, pts, 3 + (1 - u2));
      }
    } else if (this.v === 1) {
      var H = this.fountainH();
      if (H > 0.5) for (var k = -1; k <= 1; k++) {
        pts = [];
        for (i = 0; i <= 10; i++) { var yy = cy - H * i / 10; pts.push({ x: cx + k * 3 * (1 - i / 14) + Math.sin(yy * 0.35 + t * 9 + k * 2) * 1.6, y: yy }); }
        ribbon(ctx, pts, k === 0 ? 4 : 2, k === 0 ? 1 : 0.8);
      }
    } else {
      // Säule aus dem Himmel
      if (t > 0.9 && t < 2.15) {
        var front = cy * m.easeInCubic(m.clamp((t - 0.9) / 0.45, 0, 1)), tail = t > 1.95 ? cy * m.easeInCubic(m.clamp((t - 1.95) / 0.2, 0, 1)) : -10;
        var wd = t > 1.9 ? Math.max(1, 5 * (1 - (t - 1.9) / 0.25)) : 5;
        for (var k2 = -1; k2 <= 1; k2++) {
          pts = [];
          for (i = 0; i <= 16; i++) { var y2 = tail + (front - tail) * i / 16; pts.push({ x: cx + k2 * 2 + Math.sin(y2 * 0.18 - t * 14 + k2) * 1.4, y: y2 }); }
          ribbon(ctx, pts, k2 === 0 ? wd : Math.max(1, wd - 3), 0.9);
        }
      }
    }
  };

  SZ.WaterCast = WaterCast;
  SZ.ELEMENT_COST = { water: 300 };
})();
