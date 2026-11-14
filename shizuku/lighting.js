/* Shizuku – lighting.js
   Tageszeit 0–24 h: Umgebungsfarbe (multipliziert), rotes Glühen bei Sonnenauf- und -untergang,
   Sonnenstand für lange Schatten, Nachtanteil für Laternenlicht.
   Sonne: geht im Osten (rechts) auf, steht mittags im Süden (unten), geht im Westen (links) unter. */
(function () {
  var SZ = window.SZ, W = SZ.W, H = SZ.H;

  var AMB = [
    [0, [50, 60, 104]], [4.5, [58, 64, 108]], [5.4, [118, 86, 110]], [6.1, [238, 154, 124]], [7.0, [250, 196, 160]],
    [8.6, [255, 236, 214]], [12, [255, 252, 244]], [15.6, [255, 240, 214]], [17.1, [252, 212, 166]], [18.1, [246, 162, 126]],
    [18.9, [176, 104, 116]], [19.8, [82, 68, 112]], [21, [50, 60, 104]], [24, [50, 60, 104]]
  ];
  function amb(t) {
    t = ((t % 24) + 24) % 24;
    for (var i = 0; i < AMB.length - 1; i++) {
      var a = AMB[i], b = AMB[i + 1];
      if (t >= a[0] && t <= b[0]) return SZ.mix(a[1], b[1], SZ.m.smooth((t - a[0]) / (b[0] - a[0])));
    }
    return AMB[0][1];
  }
  function bump(t, c, w) { var d = Math.abs(t - c) / w; return d >= 1 ? 0 : 0.5 + 0.5 * Math.cos(d * Math.PI); }

  // Alles, was von der Uhrzeit abhängt
  function sky(t) {
    t = ((t % 24) + 24) % 24;
    var night = t < 5 || t > 20 ? 1 : t < 6.6 ? 1 - SZ.m.smooth((t - 5) / 1.6) : t > 18.3 ? SZ.m.smooth((t - 18.3) / 1.7) : 0;
    var rise = bump(t, 6.1, 1.1), set = bump(t, 18.1, 1.2);
    var day = t > 6 && t < 18.6, sh;
    if (day) {
      var p = (t - 6) / 12, a = p * Math.PI, elev = Math.max(0.02, Math.sin(Math.min(1, Math.max(0, p)) * Math.PI)) * 62 * Math.PI / 180;
      var L = SZ.m.clamp(1 / Math.tan(elev), 0.4, 3.4);
      var fade = SZ.m.smooth(Math.min(t - 6, 18.6 - t) / 0.5);
      sh = { x: -Math.cos(a) * L, y: -Math.sin(a) * L * 0.55 - 0.32, alpha: 0.36 * fade, az: a };
    } else {
      sh = { x: 0.25, y: -0.35, alpha: 0.14 * night, az: Math.PI * 1.5 };
    }
    return {
      t: t, amb: amb(t), night: night,
      glow: Math.max(rise, set), glowAz: rise > set ? 0 : Math.PI,   // 0 = Licht von rechts, PI = von links
      shadow: sh
    };
  }

  var lc = null;
  // Licht über das fertige Bild legen. lights: [{x, y, r, col, k}]
  function apply(ctx, S, lights, time) {
    if (!lc) lc = SZ.canvas(W, H);
    var l = lc.ctx;
    l.globalCompositeOperation = "source-over";
    l.fillStyle = SZ.rgb(S.amb);
    l.fillRect(0, 0, W, H);
    // Streiflicht der tiefen Sonne über den Platz
    if (S.glow > 0.01) {
      var g = S.glowAz === 0 ? l.createLinearGradient(W, 0, 0, H * 0.4) : l.createLinearGradient(0, 0, W, H * 0.4);
      g.addColorStop(0, "rgba(255,150,96," + (0.5 * S.glow) + ")");
      g.addColorStop(1, "rgba(255,150,96,0)");
      l.globalCompositeOperation = "lighter";
      l.fillStyle = g; l.fillRect(0, 0, W, H);
    }
    l.globalCompositeOperation = "lighter";
    lights.forEach(function (L) {
      var k = L.k;
      if (k <= 0.01) return;
      var rg = l.createRadialGradient(L.x, L.y, 1, L.x, L.y, L.r);
      rg.addColorStop(0, "rgba(" + L.col[0] + "," + L.col[1] + "," + L.col[2] + "," + (0.95 * k) + ")");
      rg.addColorStop(0.35, "rgba(" + L.col[0] + "," + (L.col[1] * 0.8 | 0) + "," + (L.col[2] * 0.6 | 0) + "," + (0.45 * k) + ")");
      rg.addColorStop(1, "rgba(0,0,0,0)");
      l.fillStyle = rg;
      l.fillRect(L.x - L.r, L.y - L.r, L.r * 2, L.r * 2);
    });
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    ctx.drawImage(lc, 0, 0);
    // Rotes Glühen und Lichtschein (aufhellend)
    if (S.glow > 0.01) {
      ctx.globalCompositeOperation = "screen";
      var gx = S.glowAz === 0 ? W : 0;
      var rg2 = ctx.createRadialGradient(gx, -40, 10, gx, -40, W * 0.95);
      rg2.addColorStop(0, "rgba(255,70,30," + (0.42 * S.glow) + ")");
      rg2.addColorStop(0.5, "rgba(200,40,40," + (0.16 * S.glow) + ")");
      rg2.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = rg2; ctx.fillRect(0, 0, W, H);
    }
    ctx.globalCompositeOperation = "lighter";
    lights.forEach(function (L) {
      if (L.k * S.night < 0.05) return;
      var rg3 = ctx.createRadialGradient(L.x, L.y, 0, L.x, L.y, L.r * 0.45);
      rg3.addColorStop(0, "rgba(255,190,110," + (0.35 * L.k * S.night) + ")");
      rg3.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = rg3; ctx.fillRect(L.x - L.r, L.y - L.r, L.r * 2, L.r * 2);
    });
    // Leichte Vignette
    ctx.globalCompositeOperation = "multiply";
    if (!apply.vig) {
      var v = SZ.canvas(W, H), vg = v.ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, W * 0.66);
      vg.addColorStop(0, "#fff"); vg.addColorStop(1, "#b9b2aa");
      v.ctx.fillStyle = vg; v.ctx.fillRect(0, 0, W, H); apply.vig = v;
    }
    ctx.drawImage(apply.vig, 0, 0);
    ctx.restore();
  }

  // Laternen-Helligkeit: nachts voll, in der Dämmerung schwach, flackernd
  function lampK(S, time, seed) {
    var base = Math.max(S.night, S.glow * 0.45);
    var fl = 0.88 + Math.sin(time * 9 + seed) * 0.05 + Math.sin(time * 23.7 + seed * 3) * 0.04;
    return base * fl;
  }

  SZ.light = { sky: sky, apply: apply, lampK: lampK };
})();
