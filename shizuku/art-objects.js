/* Shizuku – art-objects.js
   Objekte (fest, mit Kollision) und Vegetation (Deko, wächst, wiegt im Wind) als Pixel-Sprites.
   Jede Art hat: Größe w/h, Ankerpunkt ax/ay (Fußpunkt), Varianten und eine Zeichenfunktion.
   Sprites werden einmal gezeichnet und zwischengespeichert. Später können hier echte Grafikdateien
   die Zeichenfunktionen ersetzen, der Rest des Spiels bleibt gleich. */
(function () {
  var SZ = window.SZ, L2 = SZ.L2;

  // Laub-Kugelgruppen (Baumkronen): Pixel gehören zur Krone, wenn das Blob-Feld groß genug ist
  function canopy(p, ctx, rnd, blobs, cols, light, holes) {
    var minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    blobs.forEach(function (b) { minX = Math.min(minX, b[0] - b[2]); maxX = Math.max(maxX, b[0] + b[2]); minY = Math.min(minY, b[1] - b[3]); maxY = Math.max(maxY, b[1] + b[3]); });
    var seed = (rnd() * 1e6) | 0;
    for (var y = Math.floor(minY); y <= maxY; y++) for (var x = Math.floor(minX); x <= maxX; x++) {
      var best = -1, bb = null;
      for (var i = 0; i < blobs.length; i++) {
        var b = blobs[i], dx = (x + 0.5 - b[0]) / b[2], dy = (y + 0.5 - b[1]) / b[3], f = 1 - (dx * dx + dy * dy);
        if (f > best) { best = f; bb = b; }
      }
      var jit = (SZ.hash2(x, y, seed) - 0.5) * 0.35;
      if (best + jit < 0.05) continue;
      if (holes && SZ.hash2(x, y, seed + 3) < holes && best < 0.5) continue;
      // Licht von oben links: Lage im eigenen Blob
      var lx = (x - bb[0]) / bb[2], ly = (y - bb[1]) / bb[3];
      var lv = -lx * 0.35 - ly * 0.75 + (SZ.noise2(x / 2.2, y / 2.2, seed) - 0.5) * 0.9 + (light || 0);
      var idx = lv > 0.55 ? 3 : lv > 0.05 ? 2 : lv > -0.5 ? 1 : 0;
      p.px(x, y, cols[idx]);
    }
  }
  function trunk(p, pts, w0, w1, col, dark, light) {
    for (var i = 0; i < pts.length - 1; i++) {
      var a = pts[i], b = pts[i + 1], n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));
      for (var k = 0; k <= n; k++) {
        var t = k / n, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t;
        var w = w0 + (w1 - w0) * ((i + t) / (pts.length - 1));
        var x0 = Math.round(x - w / 2);
        for (var j = 0; j < Math.max(1, Math.round(w)); j++) p.px(x0 + j, y, j === 0 ? light : j === Math.round(w) - 1 ? dark : col);
      }
    }
  }

  SZ.OBJECTS = {
    toro: {
      name: function () { return L2("Steinlaterne", "Stone lantern"); },
      w: 18, h: 32, ax: 9, ay: 30, variants: 2, solid: [[0, -2, 6]], light: { dx: 0, dy: -17, r: 52, col: [255, 168, 84] },
      draw: function (p, ctx, rnd, v) {
        var st = "#8E897F", sd = "#6A665F", sl = "#ABA69B";
        p.rect(3, 26, 12, 4, st); p.rect(3, 26, 12, 1, sl); p.rect(3, 29, 12, 1, sd);
        p.rect(7, 17, 4, 9, st); p.rect(7, 17, 1, 9, sl); p.rect(10, 17, 1, 9, sd);
        p.rect(4, 15, 10, 2, st); p.rect(4, 15, 10, 1, sl);
        p.rect(5, 9, 8, 6, sd); p.rect(5, 9, 1, 6, st);
        if (v === 0) { p.rect(7, 10, 4, 4, "#FFD27A"); p.px(8, 11, "#FFF2C0"); p.px(9, 11, "#FFF2C0"); }
        else { p.ell(9, 12, 2.3, 2.3, "#FFD27A"); p.px(9, 11, "#FFF2C0"); }
        p.rect(4, 7, 10, 2, st); p.rect(2, 6, 14, 2, st); p.rect(1, 5, 16, 1, sl); p.px(0, 4, st); p.px(17, 4, st);
        p.rect(5, 4, 8, 1, sl); p.rect(7, 2, 4, 2, st); p.px(8, 1, sl); p.px(9, 1, st);
        p.rect(2, 7, 14, 1, sd);
        for (var i = 0; i < 6; i++) p.px(2 + rnd() * 14, 5 + rnd() * 2, rnd() < 0.5 ? "#5E7A3E" : "#7C9A4A");
        for (var j = 0; j < 4; j++) p.px(3 + rnd() * 12, 26 + rnd() * 2, "#5E7A3E");
      }
    },
    torii: {
      name: function () { return L2("Torii", "Torii"); },
      w: 66, h: 50, ax: 33, ay: 48, variants: 1, solid: [[-19, -1, 3], [19, -1, 3]],
      draw: function (p) {
        var red = "#B5402C", rd = "#8A2C1F", rl = "#D4593C", blk = "#1F1B1B", bl = "#3A3434";
        // Pfosten
        [13, 50].forEach(function (x) { p.rect(x, 12, 4, 33, red); p.rect(x, 12, 1, 33, rl); p.rect(x + 3, 12, 1, 33, rd); p.rect(x - 1, 43, 6, 5, blk); p.rect(x - 1, 43, 6, 1, bl); });
        // Nuki (unterer Balken)
        p.rect(7, 18, 53, 3, red); p.rect(7, 18, 53, 1, rl); p.rect(7, 20, 53, 1, rd);
        // Gakuzuka mit Tafel
        p.rect(31, 10, 5, 8, red); p.rect(30, 11, 7, 6, blk); p.rect(31, 12, 5, 4, "#C9A445");
        // Shimaki und Kasagi
        p.rect(4, 8, 59, 3, red); p.rect(4, 8, 59, 1, rl); p.rect(4, 10, 59, 1, rd);
        p.rect(2, 4, 63, 4, blk); p.rect(2, 4, 63, 1, bl);
        p.rect(0, 3, 4, 2, blk); p.rect(63, 3, 3, 2, blk); p.px(0, 2, blk); p.px(65, 2, blk);
      }
    },
    maple: {
      name: function () { return L2("Fächerahorn", "Japanese maple"); },
      w: 54, h: 56, ax: 27, ay: 54, variants: 2, grows: true, leaves: true, solid: [[0, -1, 4]], canopy: 36,
      draw: function (p, ctx, rnd, v) {
        trunk(p, [[27, 54], [26, 46], [28, 38], [26, 30]], 4, 2, "#5A3B2A", "#3A261C", "#7A553C");
        trunk(p, [[27, 40], [20, 32], [15, 27]], 2, 1, "#5A3B2A", "#3A261C", "#7A553C");
        trunk(p, [[27, 38], [35, 31], [40, 26]], 2, 1, "#5A3B2A", "#3A261C", "#7A553C");
        var blobs = [], cx = 27, cy = 22;
        for (var i = 0; i < 16; i++) { var a = rnd() * 6.28, r = rnd(); blobs.push([cx + Math.cos(a) * r * 17, cy + Math.sin(a) * r * 11 - 1, 6 + rnd() * 4, 4.5 + rnd() * 3]); }
        var cols = v === 1 ? ["#7A3A12", "#B85A1E", "#E08A2C", "#F6C055"] : ["#6E1714", "#A82722", "#D24A2C", "#F08A3E"];
        canopy(p, ctx, rnd, blobs, cols, 0, 0.12);
      }
    },
    pine: {
      name: function () { return L2("Kiefer (Niwaki)", "Pine (niwaki)"); },
      w: 56, h: 56, ax: 28, ay: 54, variants: 2, grows: true, solid: [[0, -1, 4]], canopy: 40,
      draw: function (p, ctx, rnd, v) {
        var tc = "#4A3426", td = "#2E2018", tl = "#6A4C36";
        trunk(p, [[28, 54], [30, 46], [25, 38], [29, 30], [27, 20]], 5, 2, tc, td, tl);
        trunk(p, [[27, 38], [16, 34], [10, 32]], 2, 1, tc, td, tl);
        trunk(p, [[29, 30], [40, 26], [46, 25]], 2, 1, tc, td, tl);
        trunk(p, [[28, 22], [20, 16]], 1.5, 1, tc, td, tl);
        var cols = ["#1F3420", "#2F4D2C", "#46693A", "#6E8E4C"];
        var pads = v === 1 ? [[12, 29, 9, 4], [46, 22, 9, 4], [26, 13, 12, 5], [34, 36, 7, 3]] : [[10, 29, 10, 4], [45, 22, 10, 4], [22, 13, 9, 4], [33, 9, 8, 4], [28, 26, 7, 3]];
        pads.forEach(function (pd) {
          var b = [];
          for (var i = 0; i < 6; i++) b.push([pd[0] + (rnd() - 0.5) * pd[2] * 1.3, pd[1] + (rnd() - 0.5) * pd[3] * 0.6, pd[2] * (0.5 + rnd() * 0.3), pd[3] * (0.7 + rnd() * 0.3)]);
          canopy(p, ctx, rnd, b, cols, 0.15, 0);
          for (var k = 0; k < pd[2] * 1.4; k++) p.px(pd[0] - pd[2] + rnd() * pd[2] * 2, pd[1] - pd[3] * 0.6 + rnd() * 2 - 1, "#8FAE62");
        });
      }
    },
    bamboo: {
      name: function () { return L2("Bambus", "Bamboo"); },
      w: 20, h: 48, ax: 10, ay: 46, variants: 3, grows: true, solid: [[0, -1, 4]], canopy: 30,
      draw: function (p, ctx, rnd) {
        var n = 3 + ((rnd() * 2) | 0);
        for (var s = 0; s < n; s++) {
          var x = 3 + s * 4 + ((rnd() * 2) | 0), top = 2 + rnd() * 10, lean = (rnd() - 0.5) * 3;
          for (var y = 46; y > top; y--) {
            var xx = Math.round(x + lean * (46 - y) / 44), node = ((y + s * 3) % 7) === 0;
            p.px(xx, y, node ? "#4E7028" : "#6F9A3A"); p.px(xx + 1, y, node ? "#5E8030" : "#8FB84E");
          }
          for (var l = 0; l < 7; l++) {
            var ly = top + rnd() * 18, lx = Math.round(x + lean * (46 - ly) / 44), dir = rnd() < 0.5 ? -1 : 1, len = 3 + rnd() * 3;
            for (var k = 1; k <= len; k++) p.px(lx + dir * k, ly + k * 0.4, k < len - 1 ? "#3E6A2A" : "#5E8A38");
          }
        }
      }
    },
    bush: {
      name: function () { return L2("Azaleenbusch", "Azalea bush"); },
      w: 22, h: 16, ax: 11, ay: 15, variants: 3, grows: true, solid: [[0, -2, 6]],
      draw: function (p, ctx, rnd, v) {
        var b = [];
        for (var i = 0; i < 6; i++) b.push([11 + (rnd() - 0.5) * 10, 9 + (rnd() - 0.5) * 3, 5 + rnd() * 2, 4 + rnd() * 1.5]);
        canopy(p, ctx, rnd, b, ["#1E3A22", "#2E5430", "#43723C", "#679450"], 0.1, 0);
        if (v !== 2) {
          var fc = v === 1 ? ["#F2EEE6", "#D8D2C8"] : ["#E8668F", "#F5A7C2"];
          for (var f = 0; f < 14; f++) { var x = 4 + rnd() * 14, y = 4 + rnd() * 8; p.px(x, y, fc[0]); if (rnd() < 0.5) p.px(x + 1, y, fc[1]); }
        }
      }
    },
    rock: {
      name: function () { return L2("Fels", "Rock"); },
      w: 26, h: 18, ax: 13, ay: 16, variants: 4, solid: [[0, -3, 8]],
      solidV: [[[0, -3, 8]], [[0, -2, 6]], [[0, -3, 9]], [[0, -2, 4]]],
      draw: function (p, ctx, rnd, v) {
        var sz = [[10, 7], [7, 5], [11, 8], [5, 4]][v], cx = 13, cy = 16 - sz[1];
        var seed = (rnd() * 1e5) | 0;
        for (var y = cy - sz[1]; y <= 16; y++) for (var x = cx - sz[0] - 1; x <= cx + sz[0] + 1; x++) {
          var dx = (x + 0.5 - cx) / sz[0], dy = (y + 0.5 - cy) / sz[1];
          var r = dx * dx + dy * dy + (SZ.noise2(x / 3, y / 3, seed) - 0.5) * 0.5;
          if (y > cy) r = dx * dx + Math.pow((y + 0.5 - cy) / (16 - cy + 0.01), 4) * 0.8 + (SZ.noise2(x / 3, y / 3, seed) - 0.5) * 0.4;
          if (r > 1) continue;
          var lv = -dx * 0.5 - dy * 0.8 + (SZ.hash2(x, y, seed) - 0.5) * 0.4;
          var col = lv > 0.5 ? "#A9A49A" : lv > 0 ? "#8A857C" : lv > -0.5 ? "#6C6862" : "#4F4C48";
          if (dy < -0.35 && SZ.noise2(x / 2.5, y / 2.5, seed + 5) > 0.5) col = lv > 0.3 ? "#7E9A4C" : "#5C7A3A";
          p.px(x, y, col);
        }
      }
    },
    jizo: {
      name: function () { return L2("Jizō-Statue", "Jizō statue"); },
      w: 12, h: 18, ax: 6, ay: 17, variants: 1, solid: [[0, -2, 4]],
      draw: function (p) {
        var st = "#8C887F", sd = "#66625B", sl = "#ADA89D";
        p.rect(2, 14, 8, 3, sd); p.rect(2, 14, 8, 1, st);
        p.ell(6, 10.5, 3.5, 4, st); p.rect(3, 10, 1, 4, sl);
        p.ell(6, 4.5, 2.6, 2.8, st); p.px(5, 3, sl); p.px(5, 5, sd); p.px(7, 5, sd);
        p.rect(3, 7, 6, 3, "#B2302A"); p.rect(3, 9, 6, 1, "#8A2220"); p.px(4, 7, "#D04A3A");
      }
    },
    makiwara: {
      name: function () { return L2("Makiwara (Übungspfahl)", "Makiwara (training post)"); },
      w: 12, h: 28, ax: 6, ay: 27, variants: 1, solid: [[0, -1, 4]], hit: true,
      draw: function (p, ctx, rnd) {
        p.rect(3, 24, 6, 3, "#6E6A62"); p.rect(3, 24, 6, 1, "#8C877D");
        p.rect(4, 2, 4, 23, "#6B4A2E"); p.rect(4, 2, 1, 23, "#8A6440");
        p.rect(3, 5, 6, 15, "#C8A85A"); p.rect(3, 5, 1, 15, "#E2C67A"); p.rect(8, 5, 1, 15, "#9C8040");
        for (var i = 0; i < 18; i++) p.px(3 + rnd() * 6, 5 + rnd() * 15, rnd() < 0.5 ? "#B09048" : "#DCC07A");
        [6, 11, 16, 19].forEach(function (y) { p.rect(3, y, 6, 1, "#6A4A28"); });
        p.px(3, 3, "#C8A85A"); p.px(8, 4, "#C8A85A");
      }
    }
  };

  SZ.VEG = {
    grass: {
      name: function () { return L2("Gras", "Grass"); }, w: 11, h: 9, ax: 5, ay: 8, variants: 4,
      draw: function (p, ctx, rnd, v) {
        var cols = [["#3E6430", "#5A8A3E", "#7FAE52"], ["#4E6A2E", "#73923E", "#A0B65A"], ["#3A5C34", "#557E44", "#7AA05C"], ["#5E6A34", "#86904A", "#B4B266"]][v];
        var n = 5 + ((rnd() * 4) | 0);
        for (var i = 0; i < n; i++) {
          var x = 2 + rnd() * 7, h = 3 + rnd() * 5, lean = (rnd() - 0.5) * 3;
          for (var k = 0; k < h; k++) p.px(x + lean * k / h, 8 - k, cols[k < h * 0.4 ? 0 : k < h * 0.8 ? 1 : 2]);
        }
      }
    },
    fern: {
      name: function () { return L2("Farn", "Fern"); }, w: 15, h: 10, ax: 7, ay: 9, variants: 3,
      draw: function (p, ctx, rnd) {
        for (var f = 0; f < 5; f++) {
          var a = Math.PI + (f / 4) * Math.PI + (rnd() - 0.5) * 0.3, len = 5 + rnd() * 3;
          for (var k = 0; k < len; k++) {
            var x = 7 + Math.cos(a) * k, y = 9 + Math.sin(a) * k * 0.9 + (k * k) * 0.06;
            p.px(x, y, k < 2 ? "#2E5228" : "#4C7A38");
            if (k % 2 === 1) { p.px(x + Math.cos(a + 1.4), y + Math.sin(a + 1.4), "#6A9A48"); p.px(x + Math.cos(a - 1.4), y + Math.sin(a - 1.4), "#5A8A40"); }
          }
        }
      }
    },
    lily: {
      name: function () { return L2("Higanbana", "Red spider lily"); }, w: 9, h: 13, ax: 4, ay: 12, variants: 4,
      draw: function (p, ctx, rnd) {
        var h = 6 + ((rnd() * 3) | 0);
        for (var y = 12; y > 12 - h; y--) p.px(4, y, "#4E7A34");
        var cy = 12 - h, red = ["#B81E18", "#D8301F", "#F0533A"];
        for (var i = 0; i < 7; i++) {
          var a = (i / 7) * 6.28 + rnd() * 0.4, len = 2 + rnd() * 2;
          for (var k = 1; k <= len; k++) p.px(4 + Math.cos(a) * k, cy + Math.sin(a) * k * 0.8 - (k > 2 ? 1 : 0), red[k === 1 ? 0 : k < 3 ? 1 : 2]);
        }
        p.px(4, cy, "#7E1210");
        p.px(1, cy - 2, "#F0533A"); p.px(7, cy - 2, "#F0533A");
      }
    },
    flower: {
      name: function () { return L2("Weiße Blüten", "White flowers"); }, w: 7, h: 7, ax: 3, ay: 6, variants: 3,
      draw: function (p, ctx, rnd) {
        p.px(1, 6, "#4E7A34"); p.px(5, 6, "#4E7A34"); p.px(3, 5, "#4E7A34"); p.px(3, 6, "#3E6A2C");
        var n = 1 + ((rnd() * 2) | 0);
        for (var i = 0; i < n; i++) {
          var x = 2 + rnd() * 3, y = 2 + rnd() * 2;
          p.px(x - 1, y, "#EEEAE2"); p.px(x + 1, y, "#EEEAE2"); p.px(x, y - 1, "#F6F2EA"); p.px(x, y + 1, "#D8D2C6"); p.px(x, y, "#E8C04A");
        }
      }
    },
    reed: {
      name: function () { return L2("Schilf", "Reeds"); }, w: 9, h: 16, ax: 4, ay: 15, variants: 3,
      draw: function (p, ctx, rnd) {
        for (var s = 0; s < 4; s++) {
          var x = 1 + rnd() * 7, h = 8 + rnd() * 6, lean = (rnd() - 0.5) * 2;
          for (var k = 0; k < h; k++) p.px(x + lean * k / h, 15 - k, k < h * 0.5 ? "#5A6E34" : "#8A9450");
          if (rnd() < 0.5) { var tx = x + lean, ty = 15 - h; p.px(tx, ty, "#6A4428"); p.px(tx, ty + 1, "#6A4428"); p.px(tx, ty + 2, "#7E5430"); }
        }
      }
    },
    leaves: {
      name: function () { return L2("Laub am Boden", "Fallen leaves"); }, w: 7, h: 5, ax: 3, ay: 4, variants: 4, flat: true,
      draw: function (p, ctx, rnd) {
        var c = ["#A82722", "#D24A2C", "#E07A34", "#8E1F1A"];
        for (var i = 0; i < 3; i++) { var x = rnd() * 5, y = 1 + rnd() * 3, col = c[(rnd() * 4) | 0]; p.px(x, y, col); p.px(x + 1, y, col); if (rnd() < 0.5) p.px(x, y - 1, col); }
      }
    },
    lotus: {
      name: function () { return L2("Seerose", "Water lily"); }, w: 12, h: 8, ax: 6, ay: 6, variants: 3, flat: true, water: true,
      draw: function (p, ctx, rnd, v) {
        p.ell(6, 4.5, 5, 2.8, "#3E6E3A"); p.ell(5.5, 4, 3.5, 1.8, "#548A46");
        p.px(10, 4, "rgba(0,0,0,0)"); ctx.clearRect(8, 3, 3, 1); ctx.clearRect(9, 4, 2, 1);
        if (v === 0) { p.px(5, 2, "#F2A6C2"); p.px(4, 3, "#E8789E"); p.px(6, 3, "#E8789E"); p.px(5, 3, "#F8D0DE"); p.px(5, 1, "#F8D0DE"); }
      }
    }
  };

  // ---------- Sprite-Cache ----------
  var cache = {};
  SZ.sprite = function (kind, type, v) {
    var key = kind + ":" + type + ":" + v;
    if (cache[key]) return cache[key];
    var def = (kind === "veg" ? SZ.VEG : SZ.OBJECTS)[type];
    var cv = SZ.canvas(def.w, def.h);
    def.draw(SZ.pen(cv.ctx), cv.ctx, SZ.rng(1000 + v * 97 + type.length * 13 + type.charCodeAt(0)), v || 0);
    if (kind === "obj") SZ.outline(cv, "#141012");
    var s = { cv: cv, sil: SZ.silhouette(cv), def: def };
    cache[key] = s;
    return s;
  };
  SZ.objSolid = function (o) { var d = SZ.OBJECTS[o.t]; return d.solidV ? d.solidV[o.v] : d.solid; };
})();
