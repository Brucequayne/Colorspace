/* Rap Streets – veg.js
   Vegetation wie in Shizuku: kleine Pixel-Pflanzen, mit dem Pinsel dicht gestreut, wiegen im Wind.
   Gespeichert in der Map als veg: [[art, x, y, variante], …] (x, y in Feldern).
   Niedrige Pflanzen liegen in einer eigenen Ebene unter den Objekten. Hohe Pflanzen, die vor allem stehen, was sie überdecken,
   werden nach den Objekten noch einmal obendrauf gezeichnet (man steht also im Gras). */
(function () {
  var RS = window.RS, L2 = RS.L2, W = RS.W, H = RS.H;

  // Pixel-Pinsel für die Sprites
  function painter(c) {
    return {
      px: function (x, y, col) { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), 1, 1); },
      rect: function (x, y, w, h, col) { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, h); }
    };
  }
  function blades(p, rnd, n, x0, x1, base, hmin, hmax, cols, spread) {
    for (var i = 0; i < n; i++) {
      var x = x0 + rnd() * (x1 - x0), h = hmin + rnd() * (hmax - hmin), lean = (rnd() - 0.5) * (spread || 3);
      for (var k = 0; k < h; k++) { var t = k / h; p.px(x + lean * t * t, base - k, cols[t < 0.35 ? 0 : t < 0.75 ? 1 : 2]); }
    }
  }
  // Gras und Unkraut in Großstadtfarben: etwas staubiger als in Shizuku
  var V = RS.VEG = {
    grass: { name: function () { return L2("Gras", "Grass"); }, w: 11, h: 9, ax: 5, ay: 8, variants: 4,
      draw: function (p, rnd, v) { blades(p, rnd, 5 + ((rnd() * 4) | 0), 2, 9, 8, 3, 8, [["#3E5A2E", "#5A7E3E", "#7E9E52"], ["#4A5E2C", "#6E8440", "#98A85A"], ["#3A5232", "#567444", "#7A985C"], ["#5A6034", "#7E864A", "#A8A466"]][v], 3); } },
    tallgrass: { name: function () { return L2("Hohes Gras", "Tall grass"); }, w: 15, h: 18, ax: 7, ay: 17, variants: 4, tall: true,
      draw: function (p, rnd, v) {
        blades(p, rnd, 12 + ((rnd() * 6) | 0), 2, 13, 17, 8, 16, [["#2E4A28", "#4A723A", "#76A050"], ["#3A522A", "#5E803A", "#94AE5A"], ["#2A462E", "#467042", "#709A5C"], ["#4A5A2A", "#78843A", "#ACA860"]][v], 6);
        for (var s = 0; s < 3; s++) { var x = 3 + rnd() * 9, y = 2 + rnd() * 4; p.px(x, y, "#C8C080"); p.px(x, y + 1, "#A8A060"); }
      } },
    weeds: { name: function () { return L2("Unkraut", "Weeds"); }, w: 13, h: 14, ax: 6, ay: 13, variants: 4, tall: true,
      draw: function (p, rnd, v) {   // Melde, Beifuß: verzweigte Stängel mit kleinen Blättern
        var cols = [["#4E5A2E", "#6E7E3A", "#8EA04A"], ["#5A5A30", "#7E7A3E", "#A49C56"], ["#3E5430", "#5A7442", "#7C9A54"], ["#5E5234", "#80703E", "#A89058"]][v];
        for (var s = 0; s < 3 + ((rnd() * 2) | 0); s++) {
          var x = 3 + rnd() * 7, h = 6 + rnd() * 7, lean = (rnd() - 0.5) * 4;
          for (var k = 0; k < h; k++) {
            var t = k / h, xx = x + lean * t; p.px(xx, 13 - k, cols[0]);
            if (k > 1 && k % 2 === 0) { var sd = rnd() < 0.5 ? -1 : 1; p.px(xx + sd, 13 - k, cols[1]); p.px(xx + sd * 2, 12 - k, cols[t > 0.6 ? 2 : 1]); }
          }
          if (v === 3 || rnd() < 0.3) { p.px(x + lean, 12 - h, "#C8B070"); p.px(x + lean + 1, 13 - h, "#B09858"); }
        }
      } },
    dandelion: { name: function () { return L2("Löwenzahn", "Dandelions"); }, w: 9, h: 9, ax: 4, ay: 8, variants: 3,
      draw: function (p, rnd, v) {
        for (var i = 0; i < 4; i++) { var a = rnd() * 6.28, l = 2 + rnd() * 2; for (var k = 0; k < l; k++) p.px(4 + Math.cos(a) * k, 8 + Math.sin(a) * k * 0.4, k < 1 ? "#3E5A2C" : "#5A7E3A"); }
        var n = 1 + ((rnd() * 2) | 0);
        for (var j = 0; j < n; j++) {
          var x = 2 + rnd() * 5, h = 3 + rnd() * 3; for (var y = 0; y < h; y++) p.px(x, 8 - y, "#5A7A36");
          var cy = 8 - h; if (v === 2) { p.px(x, cy, "#ECEAE2"); p.px(x - 1, cy, "#D8D6CC"); p.px(x + 1, cy, "#D8D6CC"); p.px(x, cy - 1, "#F6F4EE"); }
          else { p.px(x, cy, "#F2C230"); p.px(x - 1, cy, "#E0A820"); p.px(x + 1, cy, "#E0A820"); p.px(x, cy - 1, "#FAD860"); }
        }
      } },
    clover: { name: function () { return L2("Klee", "Clover"); }, w: 9, h: 5, ax: 4, ay: 4, variants: 3,
      draw: function (p, rnd) { for (var i = 0; i < 6; i++) { var x = 1 + rnd() * 6, y = 1 + rnd() * 3; p.px(x, y, "#4E7A3A"); p.px(x + 1, y, "#5E8C44"); p.px(x, y - 1, "#6A9A4C"); if (rnd() < 0.2) p.px(x, y - 1, "#E8E4E0"); } } },
    shrub: { name: function () { return L2("Gestrüpp", "Scrub"); }, w: 17, h: 15, ax: 8, ay: 14, variants: 3, tall: true,
      draw: function (p, rnd, v) {   // struppiger Busch, nicht rund: viele kleine Blattbüschel an Zweigen
        var cols = [["#24402A", "#36583A", "#4E7448", "#6E9256"], ["#2E4228", "#465E34", "#627A40", "#8A9A54"], ["#3A3A26", "#52502E", "#6E6A3A", "#8E8650"]][v];
        for (var b = 0; b < 5; b++) { var x = 8, y = 14, a = -Math.PI / 2 + (rnd() - 0.5) * 2.2, l = 5 + rnd() * 6; for (var k = 0; k < l; k++) { x += Math.cos(a); y += Math.sin(a) * 0.9; p.px(x, y, "#3A2E22"); }
          for (var q = 0; q < 14; q++) { var lx = x + (rnd() - 0.5) * 6, ly = y + (rnd() - 0.5) * 5, lv = (ly - y) / 3 - (lx - x) / 6 + (rnd() - 0.5); p.px(lx, ly, cols[lv > 0.6 ? 0 : lv > 0 ? 1 : lv > -0.6 ? 2 : 3]); } }
      } },
    ivy: { name: function () { return L2("Efeu am Boden", "Ground ivy"); }, w: 13, h: 7, ax: 6, ay: 5, variants: 3, flat: true,
      draw: function (p, rnd) { for (var i = 0; i < 16; i++) { var x = 1 + rnd() * 11, y = 1 + rnd() * 5, c = rnd(); p.px(x, y, c < 0.3 ? "#1E3A24" : c < 0.75 ? "#2E5232" : "#4A7244"); } } },
    leaves: { name: function () { return L2("Laub", "Fallen leaves"); }, w: 9, h: 5, ax: 4, ay: 3, variants: 4, flat: true,
      draw: function (p, rnd, v) {
        var c = [["#8A5A2A", "#B07A34", "#6E4824"], ["#A84A22", "#D06A2C", "#7E3A1E"], ["#B08E3A", "#D4B04A", "#806A2E"], ["#6E5A3A", "#8E7448", "#54462E"]][v];
        for (var i = 0; i < 4; i++) { var x = rnd() * 7, y = rnd() * 4, col = c[(rnd() * 3) | 0]; p.px(x, y, col); p.px(x + 1, y, col); if (rnd() < 0.5) p.px(x, y - 1, c[2]); }
      } },
    litter: { name: function () { return L2("Müll am Boden", "Litter"); }, w: 11, h: 6, ax: 5, ay: 4, variants: 5, flat: true,
      draw: function (p, rnd, v) {   // Papier, Dosen, Becher, Kippen, Scherben
        var n = 2 + ((rnd() * 3) | 0);
        for (var i = 0; i < n; i++) {
          var x = 1 + rnd() * 8, y = 1 + rnd() * 4, k = (v + i) % 5;
          if (k === 0) { p.rect(x, y, 3, 2, "#D8D4C8"); p.px(x + 2, y, "#B8B4A8"); }
          else if (k === 1) { p.rect(x, y, 2, 1, "#C83A2E"); p.px(x + 2, y, "#B8BCC0"); }
          else if (k === 2) { p.rect(x, y, 2, 2, "#ECE8DC"); p.px(x, y, "#3A6AB0"); }
          else if (k === 3) { p.px(x, y, "#E8E2D0"); p.px(x + 1, y, "#C89A60"); p.px(x + 3, y + 1, "#E8E2D0"); }
          else { p.px(x, y, "#6A9A6A"); p.px(x + 1, y + 1, "#4A7A5A"); p.px(x + 2, y, "#8ABA8A"); }
        }
      } }
  };
  Object.keys(V).forEach(function (k) { V[k].id = k; });

  // Pinsel: Mischungen (Anteile)
  RS.VEG_BRUSHES = [
    { id: "lot", mix: [["weeds", 4], ["tallgrass", 3], ["grass", 4], ["dandelion", 1], ["litter", 1]], name: function () { return L2("Brache", "Vacant lot"); } },
    { id: "grass", mix: [["grass", 1]], name: function () { return V.grass.name(); } },
    { id: "lawn", mix: [["grass", 5], ["clover", 3], ["dandelion", 1]], name: function () { return L2("Rasen", "Lawn"); } },
    { id: "tallgrass", mix: [["tallgrass", 1]], name: function () { return V.tallgrass.name(); } },
    { id: "weeds", mix: [["weeds", 1]], name: function () { return V.weeds.name(); } },
    { id: "cracks", mix: [["grass", 3], ["weeds", 1], ["dandelion", 1]], dens: 0.35, name: function () { return L2("Fugen-Unkraut", "Crack weeds"); } },
    { id: "dandelion", mix: [["dandelion", 1]], name: function () { return V.dandelion.name(); } },
    { id: "shrub", mix: [["shrub", 1]], dens: 0.4, name: function () { return V.shrub.name(); } },
    { id: "ivy", mix: [["ivy", 1]], name: function () { return V.ivy.name(); } },
    { id: "leaves", mix: [["leaves", 1]], name: function () { return V.leaves.name(); } },
    { id: "litter", mix: [["litter", 1]], dens: 0.6, name: function () { return V.litter.name(); } }
  ];

  // ---------- Sprites ----------
  var CACHE = {}, SWAY = {};
  RS.vegSprite = function (t, v) {
    var k = t + ":" + v; if (CACHE[k]) return CACHE[k];
    var d = V[t], cv = RS.canvas(d.w, d.h); d.draw(painter(cv.ctx), RS.rng(v * 977 + t.length * 131 + 7), v);
    return (CACHE[k] = { cv: cv, def: d });
  };
  function swaySprite(t, v, sw) {   // oberer Teil um sw Pixel versetzt (hohe Pflanzen in drei Abschnitten)
    var key = t + ":" + v + ":" + sw; if (SWAY[key]) return SWAY[key];
    var s = RS.vegSprite(t, v), d = s.def, c = RS.canvas(d.w + 8, d.h), x = c.ctx;
    if (d.tall) {
      var th = (d.h / 3) | 0, s1 = Math.round(sw * 0.5);
      x.drawImage(s.cv, 0, th * 2, d.w, d.h - th * 2, 4, th * 2, d.w, d.h - th * 2);
      x.drawImage(s.cv, 0, th, d.w, th, 4 + s1, th, d.w, th);
      x.drawImage(s.cv, 0, 0, d.w, th, 4 + sw, 0, d.w, th);
    } else {
      var hf = (d.h / 2) | 0;
      x.drawImage(s.cv, 0, hf, d.w, d.h - hf, 4, hf, d.w, d.h - hf);
      x.drawImage(s.cv, 0, 0, d.w, hf, 4 + sw, 0, d.w, hf);
    }
    return (SWAY[key] = c);
  }
  // Eine Pflanze zeichnen; wind 0…3, t Zeit
  RS.drawVeg = function (c, q, t, wind) {
    var d = V[q[0]]; if (!d) return;
    var sx = RS.sx(q[1], q[2]), sy = RS.sy(q[1], q[2]), x0 = Math.round(sx - d.ax), y0 = Math.round(sy - d.ay);
    if (d.flat) { c.drawImage(RS.vegSprite(q[0], q[3]).cv, x0, y0); return; }
    var gust = 0.7 + 0.3 * Math.sin(t * 0.37 + sx * 0.004);
    var sw = Math.max(-3, Math.min(3, Math.round(Math.sin(t * 1.7 + sx * 0.07 + sy * 0.05) * (d.tall ? 1.4 : 0.9) * wind * gust)));
    c.drawImage(swaySprite(q[0], q[3], sw), x0 - 4, y0);
  };
  RS.vegRect = function (q) { var d = V[q[0]], sx = RS.sx(q[1], q[2]), sy = RS.sy(q[1], q[2]); return { l: sx - d.ax - 4, r: sx - d.ax + d.w + 4, t: sy - d.ay, b: sy - d.ay + d.h }; };
})();
