/* Rap Streets – fx.js
   Platzierbare Effekte (Gruppe „Effekte“ im Editor). Im Spiel unsichtbar, nur ihre Wirkung; im Editor als Markierung.
   - Dampf (3 Stärken), Sirene (rot/blau, gelb, rot), Flackerlicht und ruhiger Lichtkegel (Laternenhöhe, Wandlampe, Neonröhre).
   - Flackerlicht/Lichtkegel rasten an Laternen ein; das normale Laternenlicht flackert dann mit.
   Gezeichnet nach dem Umgebungslicht (additiv), am Tag schwächer. */
(function () {
  var RS = window.RS, L2 = RS.L2, A = RS.ART, HW = RS.HW, HH = RS.HH, m = RS.m;

  // Markierung im Editor: gestrichelte Linie vom Boden zur Effekthöhe, oben ein Symbol
  function marker(col, z, glyph) {
    return function (c, P) {
      var g = P(0.15, 0.15, 0), t = P(0.15, 0.15, z), x = Math.round(g[0]), y0 = Math.round(g[1]), y1 = Math.round(t[1]);
      c.fillStyle = "rgba(0,0,0,.55)"; c.fillRect(x - 3, y0 - 1, 7, 3);
      c.fillStyle = col; for (var y = y1; y < y0; y += 3) c.fillRect(x, y, 1, 2);
      c.fillRect(x - 2, y0, 5, 1); c.fillStyle = "#111"; c.fillRect(x - 4, y1 - 4, 9, 9); c.fillStyle = col; c.fillRect(x - 3, y1 - 3, 7, 7);
      c.fillStyle = "#111"; glyph.forEach(function (p) { c.fillRect(x - 2 + p[0], y1 - 2 + p[1], 1, 1); });
    };
  }
  var GL = { steam: [[1, 0], [3, 1], [1, 2], [3, 3], [1, 4]], siren: [[2, 0], [1, 1], [2, 1], [3, 1], [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [0, 4], [1, 4], [2, 4], [3, 4], [4, 4]], light: [[1, 0], [2, 0], [3, 0], [2, 1], [1, 2], [3, 2], [0, 4], [2, 3], [4, 4]] };
  function ghost(z) { return [{ x: 0, y: 0, z: 0, w: 0.3, d: 0.3, h: Math.max(4, z), ghost: 1, noShadow: 1 }]; }

  A.def("fx_steam", { name: function () { return L2("Dampf", "Steam"); }, w: 0.3, d: 0.3, variants: 3, group: "fx", fxOnly: 1, flat: 1,
    vname: function (v) { return [L2("schwach", "light"), L2("mittel", "medium"), L2("stark", "heavy")][v]; },
    build: function (v) { return { boxes: ghost(8), fx: [{ k: "steam", x: 0.15, y: 0.15, z: 0, rate: [0.6, 1.1, 2][v], size: [0.75, 1.1, 1.7][v] }], extra: marker("#C8CCD2", 8, GL.steam) }; } });
  var SIR = [[[255, 40, 40], [40, 90, 255], 17], [[255, 40, 40], [40, 90, 255], 30], [[255, 170, 30], [255, 170, 30], 17], [[255, 30, 30], [255, 30, 30], 30]];
  A.def("fx_siren", { name: function () { return L2("Sirene (Blinklicht)", "Siren light"); }, w: 0.3, d: 0.3, variants: 4, group: "fx", fxOnly: 1,
    vname: function (v) { return [L2("Rot/Blau, Autodach", "Red/blue, car roof"), L2("Rot/Blau, hoch", "Red/blue, high"), L2("Gelb, Autodach", "Amber, car roof"), L2("Rot, hoch", "Red, high")][v]; },
    build: function (v) { var S = SIR[v]; return { boxes: ghost(S[2]), fx: [{ k: "siren", x: 0.15, y: 0.15, z: S[2], cols: [S[0], S[1]] }], extra: marker(v === 2 ? "#F2B030" : "#E84A4A", S[2], GL.siren) }; } });
  var LIG = [[48, [255, 210, 140], 1.9], [26, [255, 214, 150], 1.2], [26, [205, 240, 230], 1.3]];
  function lightDef(id, flick) {
    A.def(id, { name: function () { return flick ? L2("Flackerlicht mit Kegel", "Flickering light cone") : L2("Lichtkegel", "Light cone"); }, w: 0.3, d: 0.3, variants: 3, group: "fx", fxOnly: 1, snapLamp: 1,
      vname: function (v) { return [L2("Laternenhöhe", "Lamp height"), L2("Wandlampe", "Wall lamp"), L2("Neonröhre", "Neon tube")][v]; },
      build: function (v) { var S = LIG[v]; return { boxes: ghost(S[0]), fx: [{ k: "cone", flick: flick, x: 0.15, y: 0.15, z: S[0], col: S[1], r: S[2], neon: v === 2 }], extra: marker(flick ? "#F2C230" : "#E8E0C8", S[0], GL.light) }; } });
  }
  lightDef("fx_flicker", 1); lightDef("fx_cone", 0);

  // ---------- Wirkung ----------
  function flick(t, seed) {
    var bad = RS.noise2(t * 0.45, seed * 0.13, 61);           // mal ruhig, mal unruhig
    if (bad < 0.5) return 0.94 + 0.06 * RS.noise2(t * 6, seed, 3);
    var h = RS.hash2(Math.floor(t * 15), seed, 9);
    return h < 0.3 ? 0.06 : h < 0.45 ? 0.45 : 0.75 + 0.25 * h;
  }
  RS.flickerAt = function (FX, x, y, t) {   // Faktor für ein normales Licht an (x, y): flackert mit, wenn dort ein Flackerlicht sitzt
    for (var i = 0; i < FX.length; i++) { var f = FX[i]; if (f.k === "cone" && f.flick && Math.abs(f.x - x) < 0.6 && Math.abs(f.y - y) < 0.6) return flick(t, f.seed); }
    return 1;
  };
  function rgba(c, a) { return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + Math.max(0, Math.min(1, a)).toFixed(3) + ")"; }
  function glow(c, x, y, r, col, a) { var g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgba(col, a)); g.addColorStop(0.45, rgba(col, a * 0.35)); g.addColorStop(1, rgba(col, 0)); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); }
  RS.drawFx = function (c, FX, t, night) {
    c.save(); c.globalCompositeOperation = "lighter";
    FX.forEach(function (f) {
      var gx = RS.sx(f.x, f.y), gy = RS.sy(f.x, f.y), hx = gx, hy = gy - f.z;
      if (f.k === "cone") {
        var v = f.flick ? flick(t, f.seed) : 1, st = (0.3 + 0.7 * night) * v, rad = f.r * Math.SQRT2 * HW;
        if (st < 0.02) return;
        var g = c.createLinearGradient(0, hy, 0, gy + rad * 0.6); g.addColorStop(0, rgba(f.col, 0.26 * st)); g.addColorStop(1, rgba(f.col, 0.04 * st));
        c.fillStyle = g; c.beginPath(); c.moveTo(hx - (f.neon ? 4 : 1.5), hy); c.lineTo(gx - rad, gy); c.arc(gx, gy, rad, Math.PI, 0, true); c.lineTo(hx + (f.neon ? 4 : 1.5), hy); c.closePath(); c.fill();
        glow(c, gx, gy, rad * 1.15, f.col, 0.32 * st);
        glow(c, hx, hy, f.neon ? 9 : 6, f.col, 0.7 * st);
        c.fillStyle = rgba([255, 250, 235], 0.9 * v); if (f.neon) c.fillRect(Math.round(hx) - 3, Math.round(hy), 7, 1); else c.fillRect(Math.round(hx) - 1, Math.round(hy), 2, 1);
      } else if (f.k === "siren") {
        var a = t * 7 + f.seed, st2 = 0.45 + 0.55 * night;
        for (var i = 0; i < 2; i++) {
          var ang = a + i * Math.PI, on = Math.max(0, Math.cos(ang)), col = f.cols[i], ox = i ? 2 : -2;
          if (on > 0.05) {
            glow(c, hx + ox, hy, 10, col, 0.75 * on * st2);
            var px = f.x + Math.cos(ang * 0.5 + i) * 1.4, py = f.y + Math.sin(ang * 0.5 + i) * 1.4;
            glow(c, RS.sx(px, py), RS.sy(px, py), 2.6 * Math.SQRT2 * HW, col, 0.22 * on * st2);
          }
          c.fillStyle = rgba(col.map(function (q) { return Math.round(q * 0.4 + 150 * on); }), 1); c.fillRect(Math.round(hx + ox) - 1, Math.round(hy) - 1, 2, 2);
        }
      } else if (f.k === "fire") {
        var fl = 0.75 + 0.25 * RS.noise2(t * 9, f.seed, 4), st3 = (0.35 + 0.65 * night) * fl;
        glow(c, gx, gy, 2.4 * Math.SQRT2 * HW, [255, 140, 50], 0.28 * st3);
        glow(c, hx, hy, 12, [255, 170, 70], 0.55 * st3);
      } else if (f.k === "glow") {
        var st4 = (f.day || 0.15) + (1 - (f.day || 0.15)) * night;
        glow(c, hx, hy, f.r || 8, f.col, 0.6 * st4);
        if (f.ground) glow(c, gx, gy, f.ground * Math.SQRT2 * HW, f.col, 0.18 * st4);
      }
    });
    c.restore();
  };
})();
