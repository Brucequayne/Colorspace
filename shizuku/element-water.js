/* Shizuku – element-water.js
   Wasser-Element. Wasser wird im Anime-Stil gezeichnet: dicke Körper aus überlappenden Kreisen
   (dunkle Kontur, kräftiges Blau, helles Türkis, weiße Glanzkante), wandernder Schaum, Bläschen
   und echte Spritzer mit Schwerkraft (Spray).
   Effekte (alle mit update(dt) → false wenn fertig, drawLow(ctx) unter den Figuren, draw(ctx) darüber):
     WaterCast   – Kachel fluten, drei Varianten: 0 Kreis um den Samurai, 1 Fontäne aus dem Boden, 2 Strahl vom Himmel
     WaterDrain  – Wasserkachel aussaugen (heilt), die Kachel wird zu Sand
     WaterBind   – Wasserfessel (X): Lassos aus dem Wasser packen Gegner, halten sie fest und peitschen sie */
(function () {
  var SZ = window.SZ, m = SZ.m, TAU = Math.PI * 2, T = SZ.TILE;
  // Flache Anime-Palette: keine Kontur, keine Glanzpunkte, nur Farbflächen in Ebenen
  // Gleiche Farben wie das Wasser auf dem Boden (art-tiles.js: Tiefe 22,46,54 · Mitte 62,104,98 · Lichtlinien 110,156,150 / 150,196,190 · Glitzer 235,245,240)
  var COL = { back: "#1A3840", deep: "#2B5052", body: "#3E6862", mid: "#6E9C96", hi: "#96C4BE", foam: "#EBF5F0" };
  // Palette für die Pixel-Ebene der Effekte (world.drawFx): Wasserfarben plus Schatten und Schaum
  SZ.WATER_PAL = [26, 56, 64, 43, 80, 82, 62, 104, 98, 110, 156, 150, 150, 196, 190, 200, 228, 222, 235, 245, 240, 16, 34, 40];
  var COST = SZ.ELEMENT_COST = { flood: 100, drain: 200, bind: 150 };
  SZ.WATER = { healPct: 0.07, bindRange: 4, bindHold: 1.5, whipDmg: 4, whips: 3 };

  function disc(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0.6, r), 0, TAU); ctx.fill(); }
  function rnd(a, b) { return a + Math.random() * (b - a); }

  // ---------- Spritzer: Tropfen mit Schwerkraft ----------
  function Spray(world) { this.w = world; this.list = []; }
  Spray.prototype.add = function (x, y, z, vx, vy, vz, r) {
    if (this.list.length > 600) this.list.shift();
    this.list.push({ x: x, y: y, z: Math.max(0, z), vx: vx, vy: vy, vz: vz, r: r || 1.2 });
  };
  // Tropfen-Explosion in alle Richtungen (spd seitlich, up nach oben)
  Spray.prototype.burst = function (x, y, z, n, spd, up, r) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * TAU, s = spd * rnd(0.3, 1);
      this.add(x, y, z, Math.cos(a) * s, Math.sin(a) * s * 0.6, up * rnd(0.4, 1.15), (r || 1.4) * rnd(0.55, 1.3));
    }
  };
  Spray.prototype.update = function (dt) {
    for (var i = this.list.length - 1; i >= 0; i--) {
      var p = this.list[i];
      p.vz -= 330 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.z <= 0 && p.vz < 0) {
        if (p.r > 1.4 && Math.random() < 0.35) this.w.parts.ring(p.x, p.y, 2 + p.r * 1.5, 0.35);
        this.list.splice(i, 1);
      }
    }
  };
  // Gischt: flache Tropfen, in Flugrichtung gestreckt
  Spray.prototype.draw = function (ctx) {
    var L = this.list, i, p;
    for (i = 0; i < L.length; i++) {
      p = L[i]; var x = Math.round(p.x), y = Math.round(p.y - p.z), r = p.r * 0.75, up = p.vz > 0;
      if (r < 0.95) { ctx.fillStyle = (i % 3) ? COL.hi : COL.foam; ctx.fillRect(x, y, 1, 1); continue; }
      if (r < 1.6) { ctx.fillStyle = (i & 1) ? COL.mid : COL.body; ctx.fillRect(x, y, 1, 2); ctx.fillStyle = COL.foam; ctx.fillRect(x, up ? y : y + 1, 1, 1); continue; }
      ctx.fillStyle = COL.body; ctx.fillRect(x - 1, y - 1, 2, 3);
      ctx.fillStyle = COL.mid; ctx.fillRect(x, y - 1, 1, 2);
      ctx.fillStyle = COL.foam; ctx.fillRect(x - 1, up ? y - 1 : y + 1, 1, 1);
    }
  };

  // ---------- Wasserkörper in 2D-Ebenen ----------
  // pts: Mittellinie {x, y(Boden), z, r}. Daraus wird ein Band mit gezackten Rändern gebaut und in Ebenen
  // gezeichnet: dunkle Rückseite, Grundblau, Mittelblau, helle Lichtseite, weiße Schaumsträhnen.
  // ds: Fließrichtung (1 = zum Ende hin, -1 = zum Anfang). filt: nur diese Punkte (z. B. hinter der Figur).
  function body(ctx, pts, t, ds, filt) {
    if (!filt) return ribbon(ctx, pts, t, ds || 1);
    var run = [];
    for (var i = 0; i < pts.length; i++) {
      if (filt(pts[i])) run.push(pts[i]);
      else { if (run.length > 1) ribbon(ctx, run, t, ds || 1); run = []; }
    }
    if (run.length > 1) ribbon(ctx, run, t, ds || 1);
  }
  function ribbon(ctx, pts, t, ds) {
    var n = pts.length, S = [], d = 0, i, mx = 0, my = 0;
    if (n < 2) return;
    for (i = 0; i < n; i++) {
      var p = pts[i], x = p.x, y = p.y - p.z;
      if (i) d += Math.hypot(x - S[i - 1].x, y - S[i - 1].y);
      S.push({ x: x, y: y, r: p.r, d: d });
    }
    for (i = 0; i < n; i++) {
      var A = S[Math.max(0, i - 1)], B = S[Math.min(n - 1, i + 1)], tx = B.x - A.x, ty = B.y - A.y, l = Math.hypot(tx, ty) || 1;
      S[i].nx = -ty / l; S[i].ny = tx / l; mx += S[i].nx; my += S[i].ny;
    }
    // Normale zeigt zur Lichtseite (oben bzw. links)
    if (my > n * 0.25 || (Math.abs(my) <= n * 0.25 && mx > 0)) S.forEach(function (q) { q.nx = -q.nx; q.ny = -q.ny; });
    var J = function (q, k) { return 1 + 0.14 * Math.sin(q.d * 0.5 - t * 15 * ds + k) + 0.1 * Math.abs(Math.sin(q.d * 0.9 + t * 7 + k * 2)) - 0.05; };
    var band = function (col, fa, fb) {
      ctx.fillStyle = col; ctx.beginPath();
      for (var j = 0; j < n; j++) { var q = S[j], o = fa(q); j ? ctx.lineTo(q.x + q.nx * q.r * o, q.y + q.ny * q.r * o) : ctx.moveTo(q.x + q.nx * q.r * o, q.y + q.ny * q.r * o); }
      for (var k = n - 1; k >= 0; k--) { var q2 = S[k], o2 = fb(q2); ctx.lineTo(q2.x + q2.nx * q2.r * o2, q2.y + q2.ny * q2.r * o2); }
      ctx.closePath(); ctx.fill();
    };
    var cap = function (q, col, k) { if (q.r > 1.2 && q.r < 6.5) { ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(q.x, q.y, q.r * k, q.r * k * 0.9, 0, 0, TAU); ctx.fill(); } };
    // 1 Rückseite + Grundblau
    cap(S[0], COL.deep, 0.95); cap(S[n - 1], COL.deep, 0.95);
    band(COL.back, function (q) { return -J(q, 0); }, function (q) { return -0.2; });
    band(COL.deep, function (q) { return -0.55 * J(q, 1); }, function (q) { return J(q, 2); });
    // 2 Mittelblau, wellig verschoben
    band(COL.body, function (q) { return -0.35 + 0.12 * Math.sin(q.d * 0.21 - t * 9 * ds); }, function (q) { return 0.82 * J(q, 3); });
    cap(S[n - 1], COL.body, 0.6);
    // 3 Lichtseite
    band(COL.mid, function (q) { return 0.12 + 0.16 * Math.sin(q.d * 0.33 - t * 12 * ds + 1); }, function (q) { return 0.62 * J(q, 4); });
    // 4 Schaumsträhnen, die mit der Strömung laufen
    var strands = S[0].r > 7 || S[n - 1].r > 7 ? 5 : 3;
    for (var k = 0; k < strands; k++) {
      var c = function (q) { return -0.55 + 1.1 * (k + 0.5) / strands + 0.18 * Math.sin(q.d * 0.06 + k * 2.1 + t); };
      var on = function (q) { return q.r > 1.6 && Math.sin(q.d * (0.13 + k * 0.02) - t * 21 * ds + k * 1.7) > 0.35; };
      ctx.fillStyle = k % 2 ? COL.hi : COL.foam;
      var runS = -1;
      for (var j = 0; j <= n; j++) {
        var ok = j < n && on(S[j]);
        if (ok && runS < 0) runS = j;
        if (!ok && runS >= 0) {
          if (j - runS > 1) {
            ctx.beginPath();
            for (var a = runS; a < j; a++) { var q = S[a], w = 0.07 + 0.05 * Math.sin((a - runS) / (j - runS) * Math.PI), o = c(q) + w; a === runS ? ctx.moveTo(q.x + q.nx * q.r * o, q.y + q.ny * q.r * o) : ctx.lineTo(q.x + q.nx * q.r * o, q.y + q.ny * q.r * o); }
            for (var b2 = j - 1; b2 >= runS; b2--) { var q3 = S[b2], w2 = 0.07 + 0.05 * Math.sin((b2 - runS) / (j - runS) * Math.PI), o3 = c(q3) - w2; ctx.lineTo(q3.x + q3.nx * q3.r * o3, q3.y + q3.ny * q3.r * o3); }
            ctx.closePath(); ctx.fill();
          }
          runS = -1;
        }
      }
    }
  }
  // Wellige Dicke
  function wob(s, t, a) { return 1 + (a || 0.2) * Math.sin(s * 23 - t * 19) + (a || 0.2) * 0.6 * Math.sin(s * 57 + t * 13); }
  // Quadratische Bézierkurve in 3D (Bodenkoordinaten + Höhe)
  function bez(a, b, c, u) {
    var v = 1 - u;
    return { x: v * v * a.x + 2 * v * u * b.x + u * u * c.x, y: v * v * a.y + 2 * v * u * b.y + u * u * c.y, z: v * v * a.z + 2 * v * u * b.z + u * u * c.z };
  }
  // Flache Wasserfläche am Boden mit Ringwellen aus weißen Bogenstücken
  function foamPool(ctx, x, y, r, t, alpha) {
    if (r < 0.5) return;
    ctx.save(); ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.fillStyle = COL.deep; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.58, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = COL.body; ctx.beginPath(); ctx.ellipse(x - r * 0.08, y - r * 0.06, r * 0.74, r * 0.4, 0, 0, TAU); ctx.fill();
    ctx.lineWidth = 1;
    for (var k = 0; k < 3; k++) {
      var rr = r * (0.3 + ((t * 0.9 + k / 3) % 1) * 0.75);
      ctx.strokeStyle = k % 2 ? COL.hi : COL.foam;
      for (var g = 0; g < 3; g++) { var a0 = g * TAU / 3 + k + t * (k % 2 ? 1.2 : -1); ctx.beginPath(); ctx.ellipse(x, y, rr, rr * 0.58, 0, a0, a0 + 1.3); ctx.stroke(); }
    }
    ctx.restore();
  }
  // Spitze Wasserzunge (flach, drei Ebenen, weiße Spitze)
  function tongue(ctx, x, y, dx, dy, len, w, bend) {
    var px = -dy, py = dx, tx = x + dx * len + px * bend, ty = y + dy * len + py * bend;
    var lay = function (col, k, wk) {
      var ex = x + (tx - x) * k, ey = y + (ty - y) * k, ww = w * wk;
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - px * ww, y - py * ww);
      ctx.quadraticCurveTo(x + dx * len * k * 0.5 - px * ww * 1.1 + px * bend * 0.6, y + dy * len * k * 0.5 - py * ww * 1.1 + py * bend * 0.6, ex, ey);
      ctx.quadraticCurveTo(x + dx * len * k * 0.45 + px * ww * 0.9 + px * bend * 0.4, y + dy * len * k * 0.45 + py * ww * 0.9 + py * bend * 0.4, x + px * ww, y + py * ww);
      ctx.closePath(); ctx.fill();
    };
    lay(COL.deep, 1, 1); lay(COL.body, 0.86, 0.72); lay(COL.mid, 0.66, 0.45);
    ctx.fillStyle = COL.foam; ctx.fillRect(Math.round(tx), Math.round(ty), 1, 2);
  }
  // Spritzkrone: Kranz aus Zungen, die nach außen und oben schießen
  function crown(ctx, x, y, R, h, t, n) {
    n = n || 9;
    if (h < 0.8) return;
    var order = [];
    for (var k = 0; k < n; k++) order.push(k);
    order.sort(function (a, b) { return Math.sin(a / n * TAU + 0.3) - Math.sin(b / n * TAU + 0.3); });   // hinten zuerst
    order.forEach(function (k) {
      var a = k / n * TAU + 0.3, bx = x + Math.cos(a) * R, by = y + Math.sin(a) * R * 0.55;
      var dx = Math.cos(a) * 0.55, dy = -1 + Math.sin(a) * 0.2, l = Math.hypot(dx, dy);
      var hh = h * (0.55 + 0.45 * Math.abs(Math.sin(k * 3.1 + t * 9)));
      tongue(ctx, bx, by, dx / l, dy / l, hh, 1.6 + (k % 3) * 0.5, Math.sin(k * 1.7 + t * 6) * 2);
    });
  }
  // Kurzlebige Spritzer-Kronen (Aufprall, Treffer)
  function splashList(list, x, y, R, h, n, t) { list.push({ x: x, y: y, R: R, h: h, n: n || 9, t0: t }); }
  function drawSplashes(ctx, list, t) {
    for (var i = list.length - 1; i >= 0; i--) {
      var s = list[i], u = (t - s.t0) / 0.5;
      if (u > 1) { list.splice(i, 1); continue; }
      crown(ctx, s.x, s.y, s.R * (0.7 + u * 0.6), s.h * Math.sin(Math.min(1, u * 1.4) * Math.PI), t, s.n);
    }
  }

  // =====================================================================
  // WaterCast – Kachel fluten
  // =====================================================================
  var VAR = [{ dur: 2.9, conv: 2.45 }, { dur: 2.85, conv: 2.2 }, { dur: 2.8, conv: 2.05 }];
  function WaterCast(world, player, tx, ty, variant) {
    this.w = world; this.p = player; this.tx = tx; this.ty = ty; this.v = variant % 3;
    this.cx = tx * T + T / 2; this.cy = ty * T + T / 2;
    this.t = 0; this.done = false; this.converted = false; this.V = VAR[this.v];
    this.face = Math.atan2(this.cy - player.y, this.cx - player.x);
    this.spray = new Spray(world); this.ev = {}; this.splashes = [];
  }
  var C = WaterCast.prototype;
  C.once = function (k) { if (this.ev[k]) return false; this.ev[k] = true; return true; };
  C.pose = function () {
    var t = this.t, f = this.face, alt = function (a, b, per) { return Math.floor(t / per) % 2 ? a : b; };
    if (t < 0.3) return { anim: "idle", ang: f };
    if (this.v === 0) {
      if (t < 0.75) return { anim: "cast_low", ang: f };
      if (t < 1.9) return { anim: alt("cast_flow", "cast_flow2", 0.28), ang: this.orbitAng() + Math.PI / 2 };
      if (t < 2.35) return { anim: "cast_push", ang: f };
      return { anim: "cast_up", ang: f };
    }
    if (this.v === 1) {
      if (t < 0.65) return { anim: "cast_low", ang: f };
      if (t < 1.75) return { anim: alt("cast_up", "cast_flow", 0.32), ang: f + Math.sin(t * 4) * 0.5 };
      if (t < 2.15) return { anim: "cast_low", ang: f };
      return { anim: "idle", ang: f };
    }
    if (t < 0.9) return { anim: alt("cast_flow", "cast_flow2", 0.3), ang: f + Math.sin(t * 3.4) * 0.5 };
    if (t < 1.85) return { anim: "cast_up", ang: f };
    if (t < 2.15) return { anim: "cast_push", ang: f };
    return { anim: "idle", ang: f };
  };
  C.orbitAng = function () { var u = m.clamp((this.t - 0.75) / 1.15, 0, 1); return this.face - Math.PI / 2 + m.smooth(u) * TAU * 1.4; };

  // Geometrie je Variante (Liste von Wasserkörpern)
  C.geo = function () {
    var t = this.t, p = this.p, cx = this.cx, cy = this.cy, out = [], i, pts, s;
    if (this.v === 0) {
      if (t > 0.3 && t < 0.8) {
        // drei sprudelnde Quellen am Boden, die sich zum Wirbel hochdrehen
        var u = m.clamp((t - 0.3) / 0.45, 0, 1);
        for (var k = 0; k < 3; k++) {
          var a0 = this.face + k * TAU / 3; pts = [];
          for (i = 0; i <= 14; i++) {
            s = i / 14 * u; var a = a0 + s * 1.6;
            pts.push({ x: p.x + Math.cos(a) * (17 - s * 3), y: p.y + Math.sin(a) * (10 - s * 2), z: s * 16, r: (3.6 - s * 1.6) * wob(s + k, t, 0.15) });
          }
          out.push({ pts: pts, back: true });
        }
      } else if (t >= 0.8 && t < 1.95) {
        // dicke Wasserschlange kreist mit Wellen um den Samurai
        var th = this.orbitAng(); pts = [];
        for (i = 0; i <= 34; i++) {
          s = i / 34; var ph = th - s * 2.6;
          pts.push({ x: p.x + Math.cos(ph) * 17, y: p.y + Math.sin(ph) * 10, z: 13 + Math.sin(ph * 2 + t * 7) * 4, r: (5 - s * 3.4) * wob(s, t, 0.16) });
        }
        out.push({ pts: pts, back: true });
      } else if (t >= 1.95 && t < 2.45) {
        // Schuss im hohen Bogen zur Kachel
        var th2 = this.orbitAng(), A = { x: p.x + Math.cos(th2) * 17, y: p.y + Math.sin(th2) * 10, z: 13 }, B = { x: (A.x + cx) / 2, y: (A.y + cy) / 2, z: 52 }, Cc = { x: cx, y: cy, z: 0 };
        var head = m.clamp((t - 1.95) / 0.36, 0, 1), tail = m.clamp((t - 2.07) / 0.38, 0, 1); pts = [];
        for (i = 0; i <= 30; i++) {
          s = tail + (head - tail) * i / 30; var q = bez(A, B, Cc, s);
          pts.push({ x: q.x, y: q.y, z: q.z, r: (2 + 3.6 * (i / 30)) * wob(s, t, 0.18) });
        }
        out.push({ pts: pts });
      }
    } else if (this.v === 1) {
      var H = this.geyserH();
      if (H > 1) {
        var R = 7.5 * (t > 1.75 ? Math.max(0.4, 1 - (t - 1.75) / 0.4) : 1); pts = [];
        for (i = 0; i <= 26; i++) {
          s = i / 26; var z = H * s;
          pts.push({ x: cx + Math.sin(z * 0.22 - t * 10) * 1.8, y: cy, z: z, r: R * (1 - s * 0.25) * wob(s, t, 0.2) });
        }
        // schäumende Krone oben
        for (i = 0; i < 7; i++) { var a2 = i / 7 * TAU + t * 3; pts.push({ x: cx + Math.cos(a2) * R * 0.9, y: cy + Math.sin(a2) * 3, z: H + 2 + Math.sin(a2 * 2 + t * 12) * 3, r: R * 0.65 * wob(i / 7, t, 0.25) }); }
        out.push({ pts: pts });
      }
    } else {
      // Strahl aus dem Himmel, breiter als die Kachel
      if (t > 0.9 && t < 2.1) {
        var top = cy + 40;                                                     // oben aus dem Bild heraus
        var bottom = top * (1 - m.clamp((t - 0.9) / 0.22, 0, 1));             // Strahlspitze rast nach unten
        var endZ = top * (1 - m.clamp((t - 1.85) / 0.25, 0, 1));              // am Ende fällt der Rest hinterher
        var Rb = 13.5 * (t > 1.82 ? Math.max(0.2, 1 - (t - 1.82) / 0.3) : 1);
        if (endZ - bottom < 2) return out;
        pts = [];
        var n = Math.ceil((endZ - bottom) / 1.6);
        for (i = 0; i <= n; i++) {
          var zz = bottom + (endZ - bottom) * i / n;
          var flare = zz < 10 ? 1 + (10 - zz) / 10 * 0.45 : 1;
          pts.push({ x: cx + Math.sin(zz * 0.09 + t * 8) * 1.5, y: cy, z: zz, r: Rb * flare * wob(zz / 60, t * 1.3, 0.13) });
        }
        out.push({ pts: pts, beam: true, R: Rb, low: bottom, high: endZ });
      }
    }
    return out;
  };
  C.geyserH = function () {
    var t = this.t;
    if (t < 0.65) return 0;
    if (t < 1.75) return 46 * Math.min(1, m.easeOutBack(m.clamp((t - 0.65) / 0.55, 0, 1))) + Math.sin(t * 14) * 2;
    return 46 * (1 - m.easeInCubic(m.clamp((t - 1.75) / 0.35, 0, 1)));
  };

  C.update = function (dt) {
    this.t += dt;
    var t = this.t, w = this.w, sp = this.spray, cx = this.cx, cy = this.cy, i;
    sp.update(dt);
    // Platzier-Sound so starten, dass sein Platsch genau auf den Aufprall fällt
    // (Aufprall: Schlange 2,38 s, Fontäne 0,65 s, Himmelsstrahl 1,1 s)
    if (!this.snd) { WaterCast.n = (WaterCast.n || 0) + 1; this.snd = "water_place_" + (WaterCast.n % 2 + 1); }
    var sndAt = Math.max(0, [2.38, 0.65, 1.1][this.v] - SZ.SOUND_HIT(this.snd));
    if (t >= sndAt && this.once("snd")) SZ.audio.play(this.snd, { x: cx });
    var G = this.geo();
    // Spritzer von den Wasserkörpern
    G.forEach(function (g) {
      var n = g.beam ? 5 : 2;
      for (var k = 0; k < n; k++) if (Math.random() < dt * 30) {
        var q = g.pts[(Math.random() * g.pts.length) | 0]; if (!q) return;
        var a = Math.random() * TAU;
        sp.add(q.x + Math.cos(a) * q.r, q.y, q.z + Math.sin(a) * q.r * 0.5, Math.cos(a) * rnd(15, 45), Math.sin(a) * rnd(5, 20), rnd(10, 60), rnd(0.7, 1.6));
      }
    });
    if (this.v === 0) {
      if (t > 0.3 && t < 0.8 && Math.random() < dt * 40) sp.add(this.p.x + rnd(-14, 14), this.p.y + rnd(-8, 8), 0, rnd(-10, 10), rnd(-6, 6), rnd(60, 130), rnd(0.8, 1.8));
      if (t > 2.38 && this.once("hit")) {
        sp.burst(cx, cy, 2, 55, 85, 150, 1.8); w.shake = Math.max(w.shake, 1.6); splashList(this.splashes, cx, cy, 9, 22, 11, t);
        w.parts.ring(cx, cy, 20, 0.8);
      }
    } else if (this.v === 1) {
      if (t > 0.3 && t < 0.7 && Math.random() < dt * 30) sp.add(cx + rnd(-6, 6), cy + rnd(-4, 4), 0, rnd(-8, 8), rnd(-5, 5), rnd(40, 90), rnd(0.7, 1.4));
      if (t > 0.65 && this.once("burst")) { sp.burst(cx, cy, 1, 30, 50, 170, 1.7); splashList(this.splashes, cx, cy, 7, 16, 9, t); w.shake = Math.max(w.shake, 1.2); }
      var H = this.geyserH();
      if (H > 8 && t < 1.8) for (i = 0; i < 3; i++) if (Math.random() < dt * 30) { var a3 = Math.random() * TAU; sp.add(cx + Math.cos(a3) * 5, cy + Math.sin(a3) * 3, H + 3, Math.cos(a3) * rnd(25, 60), Math.sin(a3) * rnd(10, 30), rnd(30, 90), rnd(0.9, 2)); }
      if (t > 0.65 && t < 2 && Math.random() < dt * 6) w.parts.ring(cx, cy, 13, 0.6);
      if (t > 1.75 && this.once("fall")) for (i = 0; i < 26; i++) { var a4 = Math.random() * TAU; sp.add(cx + rnd(-6, 6), cy, rnd(10, 40), Math.cos(a4) * rnd(20, 70), Math.sin(a4) * rnd(10, 35), rnd(-10, 50), rnd(1, 2.2)); }
      if (t > 2.05 && this.once("hit")) { sp.burst(cx, cy, 1, 40, 80, 120, 1.7); splashList(this.splashes, cx, cy, 8, 18, 10, t); w.parts.ring(cx, cy, 22, 0.9); }
    } else {
      if (t > 0.35 && t < 0.95 && Math.random() < dt * 16) sp.add(cx + rnd(-10, 10), cy + rnd(-5, 5), rnd(60, 90), 0, 0, -rnd(40, 90), rnd(0.9, 1.6));   // erste Tropfen
      if (t > 1.1 && this.once("hit")) { w.shake = Math.max(w.shake, 2.5); sp.burst(cx, cy, 1, 40, 110, 160, 1.9); splashList(this.splashes, cx, cy, 14, 30, 13, t); }
      if (t > 1.1 && t < 1.95) {
        for (i = 0; i < 4; i++) if (Math.random() < dt * 60) { var a5 = Math.random() * TAU; sp.add(cx + Math.cos(a5) * 13, cy + Math.sin(a5) * 7, rnd(1, 6), Math.cos(a5) * rnd(50, 120), Math.sin(a5) * rnd(25, 60), rnd(40, 130), rnd(0.9, 2.2)); }
        if (Math.random() < dt * 8) w.parts.ring(cx, cy, 24, 0.6);
        if (Math.random() < dt * 14) w.parts.mist(cx + rnd(-16, 16), cy + rnd(-4, 6));
      }
    }
    if (!this.converted && t >= this.V.conv) {
      this.converted = true;
      w.convertTile(this.tx, this.ty, "w");
      sp.burst(cx, cy, 1, 18, 50, 80, 1.3);
      w.parts.ring(cx, cy, 26, 1.2); w.parts.ring(cx, cy, 38, 1.6);
      if (this.onConvert) this.onConvert();
    }
    if (t >= this.V.dur && !sp.list.length) { this.done = true; return false; }
    if (t >= this.V.dur + 2) { this.done = true; return false; }
  };
  C.drawLow = function (ctx) {
    var t = this.t, cx = this.cx, cy = this.cy, py = this.p.y;
    // Überflutung der Kachel: schäumende Fläche, die sich ausbreitet
    var f0 = this.v === 0 ? 2.3 : this.v === 1 ? 0.65 : 1.05;
    if (t > f0) {
      var grow = m.clamp((t - f0) / 0.4, 0, 1), fade = this.converted ? Math.max(0, 1 - (t - this.V.conv) / 0.45) : 1;
      var r = this.v === 2 ? 6 + grow * 12 : 4 + grow * 9;
      foamPool(ctx, cx, cy, Math.min(r, this.v === 2 && !this.converted ? 18 : 9), t, 0.95 * fade);
    }
    if (this.v === 2 && t > 0.35 && t < 1.1) {   // Schatten des kommenden Strahls
      var u = m.clamp((t - 0.35) / 0.6, 0, 1);
      ctx.fillStyle = "rgba(16,34,40," + (0.35 * u) + ")"; ctx.beginPath(); ctx.ellipse(cx, cy, 6 + u * 9, (6 + u * 9) * 0.55, 0, 0, TAU); ctx.fill();
    }
    var self = this;
    this.geo().forEach(function (g) { if (g.back) body(ctx, g.pts, t, 1, function (p) { return p.y < py; }); });
  };
  C.draw = function (ctx) {
    var t = this.t, py = this.p.y, cx = this.cx, cy = this.cy;
    this.geo().forEach(function (g) {
      body(ctx, g.pts, t, g.beam ? -1 : 1, g.back ? function (p) { return p.y >= py; } : null);
      if (g.beam) {
        if (g.low < 2) crown(ctx, cx, cy, g.R * 1.05, 16, t, 13);
      }
    });
    if (this.v === 1 && this.t > 0.65 && this.t < 2.1) crown(ctx, cx, cy, 8, 8, t, 9);
    drawSplashes(ctx, this.splashes, t);
    this.spray.draw(ctx);
  };

  // =====================================================================
  // WaterDrain – Wasser aus einer Kachel saugen, heilt den Samurai
  // =====================================================================
  function WaterDrain(world, player, tx, ty) {
    this.w = world; this.p = player; this.tx = tx; this.ty = ty;
    this.cx = tx * T + T / 2; this.cy = ty * T + T / 2;
    this.t = 0; this.done = false; this.converted = false; this.healed = false;
    this.face = Math.atan2(this.cy - player.y, this.cx - player.x);
    this.spray = new Spray(world); this.snap = null; this.ev = {}; this.splashes = [];
  }
  var D = WaterDrain.prototype;
  D.once = C.once;
  D.pose = function () {
    var t = this.t, f = this.face;
    if (t < 0.3) return { anim: "idle", ang: f };
    if (t < 0.6) return { anim: "cast_push", ang: f };
    if (t < 1.95) return { anim: Math.floor(t / 0.34) % 2 ? "cast_flow" : "cast_flow2", ang: f + Math.sin(t * 3) * 0.3 };
    if (t < 2.3) return { anim: "cast_low", ang: f };
    return { anim: "cast_up", ang: f };
  };
  D.hands = function () { return { x: this.p.x + Math.cos(this.face) * 4, y: this.p.y + Math.sin(this.face) * 2, z: 17 }; };
  D.geo = function () {
    var t = this.t, out = [];
    if (t < 0.6 || t > 2.05) return out;
    var Hd = this.hands(), A0 = { x: this.cx, y: this.cy, z: 0 };
    var u = m.clamp((t - 0.6) / 0.25, 0, 1), endFade = t > 1.8 ? m.clamp((t - 1.8) / 0.25, 0, 1) : 0;
    for (var k = -1; k <= 1; k++) {
      var Mid = { x: (A0.x + Hd.x) / 2 + Math.cos(this.face + Math.PI / 2) * k * (12 + Math.sin(t * 5 + k) * 4), y: (A0.y + Hd.y) / 2 + Math.sin(this.face + Math.PI / 2) * k * 7, z: 26 + k * 4 };
      var pts = [], A = { x: A0.x + k * 4, y: A0.y + Math.abs(k) * 2, z: 0 };
      for (var i = 0; i <= 22; i++) {
        var s = endFade + (u - endFade) * (i / 22);
        var q = bez(A, Mid, Hd, s);
        pts.push({ x: q.x + Math.sin(s * 14 - t * 12 + k) * 1.2, y: q.y, z: q.z, r: (k === 0 ? 3.4 : 2.4) * (1 - s * 0.5) * wob(s, t, 0.2) });
      }
      out.push({ pts: pts });
    }
    return out;
  };
  D.update = function (dt) {
    this.t += dt;
    var t = this.t, w = this.w, sp = this.spray, Hd = this.hands();
    sp.update(dt);
    if (t > 0.3 && t < 0.7 && Math.random() < dt * 35) sp.add(this.cx + rnd(-6, 6), this.cy + rnd(-4, 4), 0, rnd(-6, 6), rnd(-4, 4), rnd(40, 80), rnd(0.7, 1.5));
    if (t >= 0.25 && this.once("snd")) SZ.audio.play("water_absorb", { x: this.cx });
    if (t > 0.6 && this.once("lift")) { sp.burst(this.cx, this.cy, 1, 16, 30, 90, 1.4); splashList(this.splashes, this.cx, this.cy, 6, 12, 8, t); }
    if (t > 0.6 && t < 1.95 && Math.random() < dt * 24) { var a = Math.random() * TAU; sp.add(Hd.x + Math.cos(a) * 6, Hd.y + Math.sin(a) * 3, Hd.z + rnd(-3, 5), -Math.cos(a) * 20, -Math.sin(a) * 10, rnd(-10, 30), rnd(0.6, 1.1)); }
    if (!this.converted && t >= 0.62) {
      this.converted = true;
      w.convertTile(this.tx, this.ty, "s");   // ausgesaugt: Sand bleibt zurück
      if (this.onConvert) this.onConvert();
    }
    if (!this.healed && t >= 2.05) {
      this.healed = true;
      var p = this.p, add = p.hpMax * SZ.WATER.healPct;
      p.hp = Math.min(p.hpMax, p.hp + add);
      for (var i = 0; i < 18; i++) w.parts.add({ type: "spark", x: p.x + rnd(-8, 8), y: p.y + rnd(-3, 3), z: rnd(2, 20), vx: rnd(-8, 8), vy: rnd(-4, 4), vz: rnd(20, 50), life: rnd(0.5, 0.9), col: i % 2 ? "#C8E2DC" : "#96C4BE" });
      w.parts.ring(p.x, p.y, 16, 0.7, "rgba(200,228,222,"); w.parts.ring(p.x, p.y, 26, 1, "rgba(150,196,190,");
      sp.burst(p.x, p.y, 16, 14, 40, 40, 1);
      if (this.onHeal) this.onHeal(add);
    }
    if (t >= 2.6 && !sp.list.length) { this.done = true; return false; }
    if (t >= 4) { this.done = true; return false; }
  };
  D.drawLow = function (ctx, main) {
    var t = this.t, x0 = this.tx * T, y0 = this.ty * T;
    // vor dem Umwandeln das Wasserbild der Kachel festhalten, danach schrumpft es weg
    if (!this.snap && t >= 0.5 && !this.converted) {
      try {
        var src = main || ctx, tr = src.getTransform ? src.getTransform() : null, sx = tr ? tr.e : 0, sy = tr ? tr.f : 0, sc = tr ? tr.a : 1;
        var img = src.getImageData(Math.round(x0 * sc + sx), Math.round(y0 * sc + sy), Math.round(T * sc), Math.round(T * sc));
        this.snap = SZ.canvas(img.width, img.height); this.snap.ctx.putImageData(img, 0, 0);
      } catch (e) { this.snap = false; }
    }
    if (this.converted && t < 2) {
      var u = m.clamp((t - 0.62) / 1.3, 0, 1), r = (1 - m.easeInCubic(u)) * T * 0.75;
      if (r > 0.5) {
        ctx.save(); ctx.beginPath(); ctx.ellipse(this.cx, this.cy, r, r * 0.8, 0, 0, TAU); ctx.clip();
        if (this.snap) ctx.drawImage(this.snap, x0, y0, T, T); else { ctx.fillStyle = COL.deep; ctx.fillRect(x0, y0, T, T); }
        ctx.restore();
        ctx.strokeStyle = "rgba(200,228,222,0.85)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(this.cx, this.cy, r, r * 0.8, 0, 0, TAU); ctx.stroke();
      }
    }
    if (t > 0.3 && t < 0.7) foamPool(ctx, this.cx, this.cy, 4 + (t - 0.3) * 10, t, 0.9);
  };
  D.draw = function (ctx) {
    var t = this.t, self = this;
    this.geo().forEach(function (g) { body(ctx, g.pts, t, -1); });
    if (t > 0.65 && t < 2.1) {   // Wasserkugel zwischen den Händen
      var Hd = this.hands(), r = Math.min(4.5, (t - 0.65) * 5) * (t > 1.95 ? Math.max(0, 1 - (t - 1.95) / 0.15) : 1), pts = [];
      for (var i = 0; i < 6; i++) { var a = i / 6 * TAU + t * 6; pts.push({ x: Hd.x + Math.cos(a) * r * 0.3, y: Hd.y, z: Hd.z + Math.sin(a) * r * 0.3, r: r * wob(i / 6, t, 0.2) }); }
      body(ctx, pts, t);
    }
    drawSplashes(ctx, this.splashes, t);
    this.spray.draw(ctx);
  };

  // =====================================================================
  // WaterBind – Wasserfessel: Lassos aus dem Wasser packen alle Gegner in Reichweite
  // =====================================================================
  // Nächste Wasserkachel zu (x, y) und Abstand bis zu ihrem Rand
  function nearestWater(arena, x, y) {
    var best = null, bd = 1e9;
    for (var ty = 0; ty < SZ.ROWS; ty++) for (var tx = 0; tx < SZ.COLS; tx++) {
      if (arena.tile(tx, ty) !== "w") continue;
      var dx = Math.max(tx * T - x, 0, x - (tx * T + T)), dy = Math.max(ty * T - y, 0, y - (ty * T + T)), d = Math.sqrt(dx * dx + dy * dy);
      if (d < bd) { bd = d; best = { x: m.clamp(x, tx * T + 3, tx * T + T - 3), y: m.clamp(y, ty * T + 3, ty * T + T - 3), d: d }; }
    }
    return best;
  }
  function bindTargets(world) {
    var out = [];
    world.enemies.forEach(function (e) {
      if (e.dead || e.state === "spawn") return;
      var src = nearestWater(world.arena, e.x, e.y);
      if (src && src.d <= SZ.WATER.bindRange * T) out.push({ e: e, sx: src.x, sy: src.y });
    });
    return out;
  }
  function hasWater(arena) { for (var i = 0; i < arena.tiles.length; i++) if (arena.tiles[i] === "w") return true; return false; }

  var GRAB = 0.3, HOLD = SZ.WATER.bindHold;
  function WaterBind(world, player, targets) {
    this.w = world; this.p = player; this.t = 0; this.done = false; this.spray = new Spray(world); this.splashes = [];
    var cx = 0, cy = 0;
    this.binds = targets.map(function (g, i) {
      cx += g.e.x; cy += g.e.y;
      g.e.held = GRAB + HOLD + 0.1;   // sofort festhalten, damit niemand entwischt
      return { e: g.e, sx: g.sx, sy: g.sy, t0: i * 0.05, hits: 0, grabbed: false, released: false };
    });
    this.face = targets.length ? Math.atan2(cy / targets.length - player.y, cx / targets.length - player.x) : player.face;
  }
  var B = WaterBind.prototype;
  B.pose = function () { return { anim: this.t < 0.18 ? "cast_low" : this.t < 0.35 ? "cast_push" : "cast_up", ang: this.face }; };
  B.whipTimes = [0.55, 1.0, 1.45];
  B.update = function (dt) {
    this.t += dt;
    var self = this, sp = this.spray, w = this.w, alive = false;
    sp.update(dt);
    if (this.t < 0.05 && !this.snd) { this.snd = true; SZ.audio.play("step_water", { x: this.p.x, vol: 1.6, rate: 0.6 }); }
    this.binds.forEach(function (b) {
      var u = self.t - b.t0, e = b.e;
      if (b.released) return;
      alive = true;
      if (u < 0) return;
      if (!b.grabbed && u >= GRAB) {
        b.grabbed = true; e.held = HOLD; e.vx = e.vy = 0;
        sp.burst(e.x, e.y, 10, 14, 40, 70, 1.4); w.parts.ring(e.x, e.y, 10, 0.5); splashList(self.splashes, b.sx, b.sy, 4, 10, 7, self.t);
        SZ.audio.play("step_water", { x: e.x, vol: 1.4, rate: 0.9 });
      }
      if (b.grabbed && b.hits < self.whipTimes.length && u >= self.whipTimes[b.hits] + 0.16 && !e.dead) {
        b.hits++;
        e.hurt(SZ.WATER.whipDmg, Math.atan2(e.y - b.sy, e.x - b.sx), 0, "water", { k: "whip", i: self });
        sp.burst(e.x, e.y, 14 * e.sc, 12, 55, 60, 1.3); splashList(self.splashes, e.x, e.y + 1, 5 * e.sc, 9, 7, self.t); w.shake = Math.max(w.shake, 0.8);
        SZ.audio.play("step_water", { x: e.x, vol: 1.5, rate: 1.35 });
      }
      if (b.grabbed && (u >= GRAB + HOLD || e.dead)) {
        b.released = true; if (!e.dead) e.held = 0;
        sp.burst(e.x, e.y, 9, 26, 60, 90, 1.5); splashList(self.splashes, e.x, e.y + 1, 6 * e.sc, 13, 9, self.t);
        SZ.audio.play("step_water", { x: e.x, vol: 1.2, rate: 0.8 });
      }
      if (Math.random() < dt * 20) { var q = self.ropePt(b, Math.random()); if (q) sp.add(q.x, q.y, q.z, rnd(-15, 15), rnd(-8, 8), rnd(10, 40), rnd(0.6, 1.3)); }
    });
    if (!alive && !sp.list.length && !this.splashes.length) { this.done = true; return false; }
  };
  // Punkt auf dem Lasso (s = 0 Quelle … 1 Gegner)
  B.ropePt = function (b, s) {
    var u = this.t - b.t0, e = b.e; if (u < 0) return null;
    var A = { x: b.sx, y: b.sy, z: 0 }, E = { x: e.x, y: e.y, z: 9 * e.sc }, M = { x: (A.x + E.x) / 2, y: (A.y + E.y) / 2, z: 18 + m.dist(A.x, A.y, E.x, E.y) * 0.15 };
    var head = m.clamp(u / GRAB, 0, 1), q = bez(A, M, E, s * head);
    q.x += Math.sin(s * 12 - this.t * 14) * 1.3 * Math.sin(s * Math.PI); q.z += Math.sin(s * 9 - this.t * 11) * 1.5 * Math.sin(s * Math.PI);
    return q;
  };
  // Wasserringe um den Gegner (geschlossene Bänder; vorne/hinten wird beim Zeichnen getrennt)
  B.coil = function (b) {
    var e = b.e, u = this.t - b.t0 - GRAB, rings = [];
    if (u < 0 || b.released) return rings;
    var sq = 1 + Math.max(0, 0.18 - u) * 4;   // zieht sich zusammen
    [5, 11].forEach(function (h, k) {
      var pts = [];
      for (var i = 0; i <= 20; i++) {
        var a = i / 20 * TAU + u * (k % 2 ? 2 : -2.4) + k;
        pts.push({ x: e.x + Math.cos(a) * 6.8 * e.sc * sq, y: e.y + Math.sin(a) * 3.2 * e.sc * sq, z: h * e.sc + Math.sin(a * 2 + u * 9) * 0.8, r: 1.6 * wob(i / 20, u, 0.2) });
      }
      rings.push(pts);
    });
    return rings;
  };
  // Peitsche: steigt aus dem Wasser hoch und schlägt auf den Gegner
  B.whip = function (b) {
    var u = this.t - b.t0;
    for (var k = 0; k < this.whipTimes.length; k++) {
      var w0 = this.whipTimes[k], v = (u - w0) / 0.3;
      if (v < 0 || v > 1 || !b.grabbed || b.released) continue;
      var e = b.e, side = k % 2 ? 1 : -1, A = { x: b.sx + side * 3, y: b.sy, z: 0 };
      var top = { x: (b.sx + e.x) / 2 + side * 14, y: (b.sy + e.y) / 2 - 6, z: 38 }, E = { x: e.x, y: e.y, z: 15 * e.sc };
      var reach = v < 0.55 ? m.easeOutCubic(v / 0.55) : 1 - (v - 0.55) / 0.45, pts = [];
      for (var i = 0; i <= 20; i++) { var s = i / 20 * reach, q = bez(A, top, E, s); pts.push({ x: q.x, y: q.y, z: q.z, r: (2.6 - s * 1.4) * wob(s, this.t, 0.2) }); }
      return pts;
    }
    return null;
  };
  B.drawLow = function (ctx) {
    var self = this, t = this.t;
    this.binds.forEach(function (b) {
      var u = t - b.t0; if (u < 0 || b.released) return;
      foamPool(ctx, b.sx, b.sy, 3 + Math.min(1, u * 4) * 3, t, 0.9);
      self.coil(b).forEach(function (r) { body(ctx, r, t, 1, function (p) { return p.y < b.e.y; }); });
    });
  };
  B.draw = function (ctx) {
    var self = this, t = this.t;
    this.binds.forEach(function (b) {
      var u = t - b.t0; if (u < 0 || b.released) return;
      var pts = [];
      for (var i = 0; i <= 24; i++) { var s = i / 24, q = self.ropePt(b, s); q.r = (2.8 - s * 1.2) * wob(s, t, 0.15); pts.push(q); }
      if (!b.grabbed) { var hq = pts[pts.length - 1]; pts.push({ x: hq.x, y: hq.y, z: hq.z, r: 3.6 }); }
      body(ctx, pts, t, -1);
      self.coil(b).forEach(function (r) { body(ctx, r, t, 1, function (p) { return p.y >= b.e.y; }); });
      var wp = self.whip(b); if (wp) body(ctx, wp, t);
    });
    drawSplashes(ctx, this.splashes, t);
    this.spray.draw(ctx);
  };

  // =====================================================================
  // Wasser-Kampfkünste (3. Slot): Fäuste, Geschosse, Strahl
  //   Linksklick tippen          → Wasserfaust, abwechselnd links und rechts (Reichweite 2 × Katana)
  //   Shift + Linksklick halten  → schnelle Wassergeschosse in wechselnden Kurven auf den Gegner zu
  //   Linksklick halten, loslassen → Wasserstrahl: lenkbar, 8 Treffer pro Sekunde, schiebt leichte Gegner zurück,
  //                                bremst schwere; läuft, bis das Mana leer ist oder man erneut klickt
  // =====================================================================
  var ART = SZ.WATER_ART = {
    punch: { dmg: 6, reach: 42, arc: 0.5, dur: 0.24, hitFrom: 0.06, hitTo: 0.13, mana: 4, knock: 0.5 },
    bolt: { dmg: 5, speed: 250, range: 175, cd: 0.2, mana: 6, turn: 6.5, knock: 0.3 },
    beam: { dmg: 2.5, tick: 1 / 8, mana: 33, min: 12, len: 210, turn: 4.2, charge: 0.55, slow: 0.35, push: 0.8 }
  };
  function hand(p, side, fwd, z) {
    var f = p.face;
    return { x: p.x + Math.cos(f) * fwd - Math.sin(f) * side, y: p.y + Math.sin(f) * fwd + Math.cos(f) * side * 0.7, z: z };
  }
  // Höhe von Objekten, an denen Wasser hängen bleibt (Bäume, Laternen, Felsen ab Hüfthöhe)
  function blocks(w, x, y, z) {
    if (x < 0 || y < 0 || x >= SZ.W || y >= SZ.H) return true;
    if (w.arena.tilePx(x, y) === "#") return true;
    for (var k = 0; k < w.solids.length; k++) {
      var c = w.solids[k], d = SZ.OBJECTS[c[3].t];
      if (d.h * 0.9 > z && Math.abs(x - c[0]) < c[2] && Math.abs(y - c[1]) < c[2] * 0.8 + 1) return true;
    }
    return false;
  }
  function Arts(world) {
    this.w = world; this.spray = new Spray(world); this.splashes = []; this.t = 0;
    this.bolts = []; this.boltCd = 0; this.boltSide = 1; this.press = null; this.beam = null; this.fist = null;
  }
  var R = Arts.prototype;
  R.idle = function () { return !this.bolts.length && !this.beam && !this.fist && !this.spray.list.length && !this.splashes.length && !this.charging; };
  // ---------- Eingabe (vom Spieler aufgerufen, wenn der Element-Slot aktiv ist) ----------
  R.input = function (p, dt, I) {
    var ac = p.act;
    if (ac && ac.type === "beam") { if (I.lmbHit || p.mana <= 0.01) this.endBeam(p); return; }
    if (I.down("Shift") && I.lmb) {
      this.press = null;
      if ((!ac || ac.type === "wbolt") && this.boltCd <= 0) { if (p.useMana(ART.bolt.mana)) this.fireBolt(p, I); else this.empty(p); }
      return;
    }
    if (I.lmbHit) {
      if (!ac) this.press = { t: 0, charging: false };
      else if (ac.type === "punch" && ac.t > ac.dur * 0.35) ac.queued = true;
    }
    var pr = this.press;
    if (pr) {
      pr.t += dt;
      if (!I.lmb) {
        if (pr.charging && p.act && p.act.type === "wcharge") {
          if (p.act.t >= ART.beam.charge * 0.8 && p.mana >= ART.beam.min) this.startBeam(p);
          else { p.act = null; this.punch(p); }
        } else if (!pr.charging && !p.act) this.punch(p);
        this.press = null;
      } else if (!pr.charging && pr.t >= 0.16 && !p.act) { pr.charging = true; p.act = { type: "wcharge", t: 0, full: false }; }
      else if (pr.charging && (!p.act || p.act.type !== "wcharge")) this.press = null;
    }
  };
  R.empty = function (p) { if (!this.emptyT || this.t - this.emptyT > 0.4) { this.emptyT = this.t; p.manaFlash = 0.5; SZ.audio.play("block", { vol: 0.2, rate: 1.7 }); } };
  // Faust
  R.punch = function (p, side) {
    if (!p.useMana(ART.punch.mana)) { this.empty(p); return; }
    this.fistSide = side || -(this.fistSide || 1);
    p.act = { type: "punch", t: 0, dur: ART.punch.dur, side: this.fistSide, hits: [], ang: p.face };
    SZ.audio.play("step_water", { x: p.x, vol: 0.7, rate: 1.45 });
  };
  // Geschoss
  R.fireBolt = function (p, I) {
    var w = this.w, B = ART.bolt, best = null, bd = 1e9;
    // Ziel: Gegner nahe am Mauszeiger, sonst Gegner in Blickrichtung, sonst der Mauspunkt
    w.enemies.forEach(function (e) {
      if (e.dead || e.state === "spawn") return;
      var dm = m.dist(e.x, e.y - 6, I.mx, I.my), dp = m.dist(e.x, e.y, p.x, p.y);
      if (dp > B.range + 30) return;
      var sc = dm < 45 ? dm : Math.abs(m.angDiff(p.face, Math.atan2(e.y - p.y, e.x - p.x))) < 0.45 ? 60 + dp * 0.3 : 1e9;
      if (sc < bd) { bd = sc; best = e; }
    });
    var tx = I.mx, ty = I.my, dm2 = m.dist(p.x, p.y, tx, ty);
    if (dm2 > B.range) { tx = p.x + (tx - p.x) / dm2 * B.range; ty = p.y + (ty - p.y) / dm2 * B.range; }
    this.boltSide = -this.boltSide;
    var a0 = Math.atan2((best ? best.y : ty) - p.y, (best ? best.x : tx) - p.x) + this.boltSide * rnd(0.45, 1.0), h = hand(p, this.boltSide * 3, 6, 14);
    this.bolts.push({ x: h.x, y: h.y, z: h.z, a: a0, tgt: best, tx: tx, ty: ty, dist: 0, trail: [], hit: false, fall: false });
    this.boltCd = B.cd;
    p.act = { type: "wbolt", t: 0, dur: 0.14, side: this.boltSide };
    SZ.audio.play("step_water", { x: p.x, vol: 0.6, rate: 1.7 });
  };
  // Strahl
  R.startBeam = function (p) {
    p.act = { type: "beam", t: 0 };
    this.beam = { act: p.act, a: p.face, tick: 0, len: 0, t: 0 };
    this.beam.snd = SZ.audio.play("water_beam", { x: p.x, loop: true });
    this.spray.burst(p.x + Math.cos(p.face) * 8, p.y + Math.sin(p.face) * 8, 14, 14, 50, 60, 1.3);
    this.w.shake = Math.max(this.w.shake, 1);
  };
  R.endBeam = function (p) {
    var b = this.beam; if (!b) return;
    if (b.snd) b.snd.stop(0.18);
    if (b.end) { this.spray.burst(b.end.x, b.end.y, b.end.z, 18, 60, 70, 1.4); splashList(this.splashes, b.end.x, b.end.y, 5, 10, 8, this.t); }
    this.beam = null;
    if (p && p.act === b.act) p.act = null;
  };
  // Punkt auf der Faust-Bahn (s 0 … 1)
  R.fistPts = function (p, ac) {
    var P = ART.punch, u = ac.t / ac.dur, ext = u < 0.38 ? m.easeOutCubic(u / 0.38) : 1 - m.easeInCubic((u - 0.38) / 0.62);
    if (ext <= 0.02) return null;
    var f = ac.ang, h = hand(p, ac.side * 2.6, 3, 14), L = 6 + P.reach * ext, pts = [];
    for (var i = 0; i <= 14; i++) {
      var s = i / 14, lat = ac.side * Math.sin(s * Math.PI) * 5 * ext;
      pts.push({ x: h.x + Math.cos(f) * L * s - Math.sin(f) * lat, y: h.y + Math.sin(f) * L * s + Math.cos(f) * lat * 0.7, z: 14 - s * 2, r: (2 + s * 1.6) * wob(s, this.t, 0.15) });
    }
    var tip = pts[pts.length - 1];
    for (var k = 0; k < 5; k++) { var aa = k / 5 * TAU + this.t * 12; pts.push({ x: tip.x + Math.cos(aa) * 1.2, y: tip.y, z: tip.z + Math.sin(aa) * 1.2, r: 4.4 * wob(k / 5, this.t, 0.2) }); }
    return { pts: pts, tip: tip, ext: ext };
  };
  R.update = function (dt) {
    this.t += dt;
    var w = this.w, p = w.player, sp = this.spray, self = this;
    sp.update(dt);
    if (this.boltCd > 0) this.boltCd -= dt;
    var ac = p && p.act;
    // ---- Faust: Treffer im Schlagfenster
    this.fist = ac && ac.type === "punch" ? ac : null;
    if (this.fist && ac.t >= ART.punch.hitFrom && ac.t - dt < ART.punch.hitTo) {
      var P = ART.punch;
      w.enemies.forEach(function (e) {
        if (e.dead || e.state === "spawn" || ac.hits.indexOf(e) >= 0) return;
        var d = m.dist(p.x, p.y, e.x, e.y), a = Math.atan2(e.y - p.y, e.x - p.x);
        if (d < P.reach + 6 + e.D.radius && Math.abs(m.angDiff(ac.ang, a)) < P.arc + 6 / Math.max(8, d)) {
          ac.hits.push(e); e.hurt(P.dmg, a, P.knock, "water", { k: "wpunch", i: ac });
          sp.burst(e.x, e.y, 12 * e.sc, 12, 55, 50, 1.3); splashList(self.splashes, e.x, e.y + 1, 4 * e.sc, 8, 7, self.t);
          SZ.audio.play("water_place_" + (1 + (Math.random() * 2 | 0)), { x: e.x, vol: 0.45, rate: 1.35, offset: 0.25 });
        }
      });
    }
    if (this.fist) { var fp = this.fistPts(p, ac); if (fp && Math.random() < dt * 40) sp.add(fp.tip.x, fp.tip.y, fp.tip.z, Math.cos(ac.ang) * rnd(10, 40) + rnd(-15, 15), Math.sin(ac.ang) * rnd(5, 20), rnd(10, 50), rnd(0.6, 1.3)); }
    // ---- Laden: Wasser sammelt sich an den Händen
    this.charging = ac && ac.type === "wcharge" ? ac : null;
    if (this.charging) {
      var hc = hand(p, 0, 6, 15);
      if (Math.random() < dt * 30) { var ra = Math.random() * TAU; sp.add(hc.x + Math.cos(ra) * 12, hc.y + Math.sin(ra) * 7, hc.z + rnd(-3, 6), -Math.cos(ra) * 40, -Math.sin(ra) * 25, rnd(10, 30), rnd(0.6, 1.2)); }
      if (!ac.full && ac.t >= ART.beam.charge) { ac.full = true; sp.burst(hc.x, hc.y, hc.z, 10, 30, 40, 1.1); SZ.audio.play("step_water", { x: p.x, vol: 0.8, rate: 0.75 }); }
    }
    // ---- Geschosse
    for (var i = this.bolts.length - 1; i >= 0; i--) {
      var b = this.bolts[i], B = ART.bolt;
      b.trail.unshift({ x: b.x, y: b.y, z: b.z }); if (b.trail.length > 8) b.trail.pop();
      if (b.fall) { b.z -= 140 * dt; b.x += Math.cos(b.a) * 80 * dt; b.y += Math.sin(b.a) * 80 * dt; if (b.z <= 0) { self.splat(b.x, b.y, 0, w.arena.tilePx(b.x, b.y) === "w"); this.bolts.splice(i, 1); } continue; }
      var gx = b.tgt && !b.tgt.dead ? b.tgt.x : b.tx, gy = b.tgt && !b.tgt.dead ? b.tgt.y : b.ty;
      var want = Math.atan2(gy - b.y, gx - b.x), turn = B.turn * (0.6 + Math.min(1, b.dist / 60) * 0.8);
      b.a += m.clamp(m.angDiff(b.a, want), -turn * dt, turn * dt);
      var st = B.speed * dt; b.x += Math.cos(b.a) * st; b.y += Math.sin(b.a) * st; b.dist += st;
      b.z = 14 + Math.sin(Math.min(1, b.dist / B.range) * Math.PI) * 10;
      if (Math.random() < dt * 25) sp.add(b.x, b.y, b.z, rnd(-10, 10), rnd(-6, 6), rnd(0, 25), rnd(0.5, 1));
      var hitE = null;
      for (var k = 0; k < w.enemies.length; k++) { var e = w.enemies[k]; if (!e.dead && e.state !== "spawn" && Math.abs(e.x - b.x) < e.D.radius + 4 && b.y > e.y - 9 && b.y < e.y + 5) { hitE = e; break; } }
      if (hitE) {
        hitE.hurt(B.dmg, b.a, B.knock, "water", { k: "wbolt", i: b });
        self.splat(b.x, b.y, b.z * 0.6, false, hitE);
        SZ.audio.play("water_place_" + (1 + (Math.random() * 2 | 0)), { x: b.x, vol: 0.35, rate: 1.6, offset: 0.25 });
        this.bolts.splice(i, 1); continue;
      }
      if (blocks(w, b.x, b.y, b.z)) { self.splat(b.x, b.y, b.z, false); this.bolts.splice(i, 1); continue; }
      if (b.dist > B.range + 20) b.fall = true;
    }
    // ---- Strahl
    var bm = this.beam;
    if (bm) {
      if (!p || p.dead || p.act !== bm.act) this.endBeam(null);
      else {
        var BM = ART.beam, I = SZ.input;
        bm.t += dt;
        var want2 = Math.atan2(I.my - (p.y - 12), I.mx - p.x);
        bm.a += m.clamp(m.angDiff(bm.a, want2), -BM.turn * dt, BM.turn * dt);
        p.face = bm.a;
        p.mana = Math.max(0, p.mana - BM.mana * SZ.perk.mana(p) * dt); p.manaT = 0;
        if (bm.snd) bm.snd.pan(p.x);
        // Länge: bis zu einem hohen Hindernis
        var o = hand(p, 0, 8, 15), L = 0, ca = Math.cos(bm.a), sa = Math.sin(bm.a);
        while (L < BM.len && !blocks(w, o.x + ca * L, o.y + sa * L, 15)) L += 3;
        bm.len = Math.min(L, bm.len + 900 * dt);   // schießt in einem Bruchteil einer Sekunde nach vorn
        bm.o = o; bm.end = { x: o.x + ca * bm.len, y: o.y + sa * bm.len, z: 13 };
        // Treffer: 8 pro Sekunde
        bm.tick -= dt;
        if (bm.tick <= 0) {
          bm.tick += BM.tick; var any = false;
          w.enemies.forEach(function (e) {
            if (e.dead || e.state === "spawn") return;
            var rx = e.x - o.x, ry = e.y - o.y, along = rx * ca + ry * sa, across = Math.abs(-rx * sa + ry * ca);
            if (along < 0 || along > bm.len + e.D.radius || across > e.D.radius + 6) return;
            any = true;
            e.hurt(BM.dmg, bm.a, e.D.armored ? 0 : BM.push, "beam", { k: "beam", i: bm });
            if (e.D.armored) e.slowT = 0.3;   // Schwere: deutlich langsamer statt zurückgeschoben
            sp.burst(e.x, e.y, 10 * e.sc, 4, 45, 35, 1.1);
            if (Math.random() < 0.5) splashList(self.splashes, e.x - ca * 4, e.y - sa * 4, 3.5 * e.sc, 7, 6, self.t);
          });
          if (any) SZ.audio.play("step_water", { x: bm.end.x, vol: 0.35, rate: 1.25 + Math.random() * 0.3 });
        }
        // Gischt am Ende und an der Quelle
        for (var j = 0; j < 3; j++) if (Math.random() < dt * 40) { var ra2 = bm.a + Math.PI + rnd(-1.3, 1.3); sp.add(bm.end.x, bm.end.y, bm.end.z, Math.cos(ra2) * rnd(30, 80), Math.sin(ra2) * rnd(15, 40), rnd(20, 70), rnd(0.7, 1.6)); }
        if (Math.random() < dt * 12) { var na = bm.a + (Math.random() < 0.5 ? 1 : -1) * Math.PI / 2, s2 = rnd(0.1, 0.95); sp.add(o.x + ca * bm.len * s2, o.y + sa * bm.len * s2, 15, Math.cos(na) * rnd(10, 30), Math.sin(na) * rnd(5, 15), rnd(0, 30), rnd(0.6, 1.1)); }
        if (Math.random() < dt * 6) w.parts.ring(bm.end.x, bm.end.y, 10, 0.4);
        if (p.mana <= 0.01) this.endBeam(p);
      }
    }
    return true;
  };
  R.splat = function (x, y, z, wet, e) {
    this.spray.burst(x, y, z, wet ? 6 : 12, 45, 50, 1.2);
    splashList(this.splashes, x, y, e ? 4 * e.sc : 3.5, e ? 8 : 6, 7, this.t);
    if (wet) this.w.parts.ring(x, y, 8, 0.5);
  };
  R.drawLow = function () {};
  R.draw = function (ctx) {
    var t = this.t, p = this.w.player, self = this;
    // Geschosse: Kopf mit Schweif
    this.bolts.forEach(function (b) {
      if (b.trail.length < 2) return;
      var pts = [];
      for (var i = b.trail.length - 1; i >= 0; i--) { var q = b.trail[i], s = 1 - i / (b.trail.length - 1); pts.push({ x: q.x, y: q.y, z: q.z, r: 0.8 + s * 2.2 }); }
      pts.push({ x: b.x, y: b.y, z: b.z, r: 3.2 * wob(0.3, t, 0.2) });
      body(ctx, pts, t, 1);
    });
    if (p) {
      var ac = p.act;
      if (ac && ac.type === "punch") { var fp = this.fistPts(p, ac); if (fp) body(ctx, fp.pts, t, 1); }
      if (ac && ac.type === "wcharge") {   // Wasserkugel wächst zwischen den Händen
        var hc = hand(p, 0, 6, 15), r = Math.min(1, ac.t / ART.beam.charge) * 4 + 0.6, pts2 = [];
        for (var k = 0; k < 7; k++) { var a = k / 7 * TAU + t * 7; pts2.push({ x: hc.x + Math.cos(a) * r * 0.5, y: hc.y + Math.sin(a) * r * 0.3, z: hc.z + Math.sin(a * 2) * r * 0.3, r: r * wob(k / 7, t, 0.25) }); }
        body(ctx, pts2, t, 1);
        for (var k2 = 0; k2 < 3; k2++) {   // drei Ströme, die sich hineindrehen
          var aa = t * 5 + k2 * TAU / 3, rr = 12 - (ac.t * 14 % 8), pts3 = [];
          for (var j = 0; j <= 6; j++) { var s = j / 6, a2 = aa + s * 1.4; pts3.push({ x: hc.x + Math.cos(a2) * rr * (1 - s * 0.7), y: hc.y + Math.sin(a2) * rr * 0.6 * (1 - s * 0.7), z: hc.z + (1 - s) * 2, r: 0.9 + s * 0.6 }); }
          body(ctx, pts3, t, 1);
        }
      }
    }
    var bm = this.beam;
    if (bm && bm.o && bm.len > 2) {
      var o = bm.o, ca = Math.cos(bm.a), sa = Math.sin(bm.a), n = Math.max(2, Math.ceil(bm.len / 2)), pts4 = [];
      for (var i2 = 0; i2 <= n; i2++) {
        var s3 = i2 / n, d = bm.len * s3, lat = Math.sin(d * 0.12 - t * 22) * 1.1 * Math.min(1, s3 * 4);
        pts4.push({ x: o.x + ca * d - sa * lat, y: o.y + sa * d + ca * lat * 0.7, z: 15 - s3 * 2, r: (4.2 + s3 * 1.8 + Math.min(1, bm.t * 3) * 0.9) * wob(d / 90, t, 0.14) });
      }
      body(ctx, pts4, t, 1);
      crown(ctx, bm.end.x, bm.end.y + 2, 5, 9, t, 9);
    }
    drawSplashes(ctx, this.splashes, t);
    this.spray.draw(ctx);
  };
  SZ.waterArts = function (world) {
    if (!world.arts) world.arts = new Arts(world);
    if (world.fx.indexOf(world.arts) < 0) world.fx.push(world.arts);
    return world.arts;
  };

  SZ.WaterCast = WaterCast; SZ.WaterDrain = WaterDrain; SZ.WaterBind = WaterBind;
  SZ.water = { targets: bindTargets, hasWater: hasWater, nearest: nearestWater };
})();
