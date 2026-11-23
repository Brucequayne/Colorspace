/* Monsters Arc – art-objects.js
   Objekte (fest, mit Kollision) und Vegetation (Deko, wächst, wiegt im Wind) als Pixel-Sprites.
   Jede Art hat: Größe w/h, Ankerpunkt ax/ay (Fußpunkt), Varianten und eine Zeichenfunktion.
   fx: Partikel bei Treffern (Holzsplitter, Steinsplitter, Blätter, Blüten).
   tall: Vegetation, die mit Figuren nach Tiefe sortiert wird (man läuft hindurch). */
(function () {
  var MA = window.MA, L2 = MA.L2;

  // Laubkronen aus Kugelgruppen: Licht von oben links, helle Sprenkel, dunkle Unterseite
  function canopy(p, ctx, rnd, blobs, cols, light, holes, speck) {
    var minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    blobs.forEach(function (b) { minX = Math.min(minX, b[0] - b[2]); maxX = Math.max(maxX, b[0] + b[2]); minY = Math.min(minY, b[1] - b[3]); maxY = Math.max(maxY, b[1] + b[3]); });
    var seed = (rnd() * 1e6) | 0;
    for (var y = Math.floor(minY); y <= maxY; y++) for (var x = Math.floor(minX); x <= maxX; x++) {
      var best = -1, bb = null;
      for (var i = 0; i < blobs.length; i++) {
        var b = blobs[i], dx = (x + 0.5 - b[0]) / b[2], dy = (y + 0.5 - b[1]) / b[3], f = 1 - (dx * dx + dy * dy);
        if (f > best) { best = f; bb = b; }
      }
      var jit = (MA.hash2(x, y, seed) - 0.5) * 0.35;
      if (best + jit < 0.05) continue;
      if (holes && MA.hash2(x, y, seed + 3) < holes && best < 0.5) continue;
      var lx = (x - bb[0]) / bb[2], ly = (y - bb[1]) / bb[3];
      var lv = -lx * 0.35 - ly * 0.75 + (MA.noise2(x / 2.2, y / 2.2, seed) - 0.5) * 0.9 + (light || 0);
      var idx = lv > 0.55 ? 3 : lv > 0.05 ? 2 : lv > -0.5 ? 1 : 0;
      var h = MA.hash2(x, y, seed + 7);
      if (speck !== false) { if (idx === 2 && h > 0.86) idx = 3; else if (idx === 1 && h > 0.9) idx = 2; else if (idx === 1 && h < 0.08) idx = 0; }
      p.px(x, y, cols[idx]);
      if (cols[4] && idx === 3 && h > 0.93) p.px(x, y, cols[4]);
    }
  }
  function trunk(p, pts, w0, w1, col, dark, light) {
    for (var i = 0; i < pts.length - 1; i++) {
      var a = pts[i], b = pts[i + 1], n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])) || 1;
      for (var k = 0; k <= n; k++) {
        var t = k / n, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t;
        var w = w0 + (w1 - w0) * ((i + t) / (pts.length - 1)), wr = Math.max(1, Math.round(w)), x0 = Math.round(x - w / 2);
        for (var j = 0; j < wr; j++) p.px(x0 + j, y, j === 0 && wr > 1 ? light : j === wr - 1 && wr > 2 ? dark : col);
      }
    }
  }
  // Fels: Grundlinie by, halbe Breite rx, Höhe h; Licht von oben links, Moos oben
  function stone(p, cx, by, rx, h, seed, moss, cols) {
    cols = cols || ["#4F4C48", "#6C6862", "#8A857C", "#A9A49A"];
    for (var y = Math.floor(by - h - 1); y <= by; y++) for (var x = Math.floor(cx - rx - 2); x <= cx + rx + 2; x++) {
      var t = (by - y) / h, nx = (x + 0.5 - cx) / rx;
      var widthAt = Math.pow(Math.max(0, 1 - Math.pow(Math.max(0, t), 2.2)), 0.5) + (MA.noise2(x / 3, y / 3, seed) - 0.5) * 0.35;
      if (t < 0 || Math.abs(nx) > widthAt) continue;
      var lv = -nx * 0.55 + (t - 0.4) * 1.1 + (MA.hash2(x, y, seed) - 0.5) * 0.4;
      var idx = lv > 0.55 ? 3 : lv > 0 ? 2 : lv > -0.5 ? 1 : 0;
      var col = cols[idx];
      if (moss && t > 0.55 && MA.noise2(x / 2.5, y / 2.5, seed + 5) > 0.48) col = lv > 0.3 ? "#7E9A4C" : "#5C7A3A";
      p.px(x, y, col);
    }
  }
  var WOOD = ["#5A3B2A", "#7A553C", "#3A261C"], STONE = ["#8A857C", "#A9A49A", "#6C6862"];
  var GREEN = ["#1F4A2E", "#2E6B3A", "#4A8E44", "#78B858", "#A8D474"];

  MA.OBJECTS = {
    toro: {
      name: function () { return L2("Steinlaterne", "Stone lantern"); },
      w: 18, h: 32, ax: 9, ay: 30, variants: 2, solid: [[0, -2, 6]], light: { dx: 0, dy: -17, r: 52, col: [255, 168, 84] }, fx: { chips: STONE, sparks: true },
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
      w: 66, h: 50, ax: 33, ay: 48, variants: 1, solid: [[-19, -1, 3], [19, -1, 3]], fx: { chips: ["#B5402C", "#D4593C", "#1F1B1B"] },
      draw: function (p) {
        var red = "#B5402C", rd = "#8A2C1F", rl = "#D4593C", blk = "#1F1B1B", bl = "#3A3434";
        [13, 50].forEach(function (x) { p.rect(x, 12, 4, 33, red); p.rect(x, 12, 1, 33, rl); p.rect(x + 3, 12, 1, 33, rd); p.rect(x - 1, 43, 6, 5, blk); p.rect(x - 1, 43, 6, 1, bl); });
        p.rect(7, 18, 53, 3, red); p.rect(7, 18, 53, 1, rl); p.rect(7, 20, 53, 1, rd);
        p.rect(31, 10, 5, 8, red); p.rect(30, 11, 7, 6, blk); p.rect(31, 12, 5, 4, "#C9A445");
        p.rect(4, 8, 59, 3, red); p.rect(4, 8, 59, 1, rl); p.rect(4, 10, 59, 1, rd);
        p.rect(2, 4, 63, 4, blk); p.rect(2, 4, 63, 1, bl);
        p.rect(0, 3, 4, 2, blk); p.rect(63, 3, 3, 2, blk); p.px(0, 2, blk); p.px(65, 2, blk);
      }
    },
    sakura: {
      name: function () { return L2("Kirschbaum", "Cherry tree"); },
      w: 60, h: 58, ax: 30, ay: 56, variants: 3, grows: true, petals: true, solid: [[0, -1, 4]], canopy: 38, fx: { chips: WOOD, petals: true },
      draw: function (p, ctx, rnd, v) {
        var tc = "#4A3030", td = "#2E1C1E", tl = "#6A4646";
        var cols = v === 1 ? ["#9C7E88", "#D8AEBC", "#F2D2DA", "#FFEEF2", "#FFFFFF"] : ["#8E3E58", "#C86A88", "#EC9CB4", "#FFC8D8", "#FFE8EE"];
        if (v === 2) {
          // Shidare-zakura: Hängekirsche
          trunk(p, [[30, 56], [29, 46], [31, 36], [29, 24]], 5, 2, tc, td, tl);
          trunk(p, [[30, 32], [20, 24], [14, 22]], 2, 1, tc, td, tl); trunk(p, [[30, 30], [40, 23], [46, 22]], 2, 1, tc, td, tl);
          var bl = []; for (var i = 0; i < 10; i++) { var a = rnd() * 6.28, r = rnd(); bl.push([30 + Math.cos(a) * r * 16, 18 + Math.sin(a) * r * 8, 6 + rnd() * 3, 4 + rnd() * 2]); }
          canopy(p, ctx, rnd, bl, cols, 0.1, 0.05);
          for (var s = 0; s < 34; s++) {
            var sx = 8 + rnd() * 44, sy = 14 + rnd() * 10, len = 8 + rnd() * 18, sw = 0;
            for (var k = 0; k < len; k++) { if (rnd() < 0.15) sw += rnd() < 0.5 ? -1 : 1; p.px(sx + sw * 0.4 + (sx < 30 ? -k * 0.12 : k * 0.12), sy + k, k > len - 3 ? cols[3] : rnd() < 0.3 ? cols[1] : cols[2]); }
          }
          return;
        }
        trunk(p, [[30, 56], [31, 48], [27, 40], [30, 30]], 5, 2, tc, td, tl);
        trunk(p, [[29, 42], [19, 34], [12, 30]], 2, 1, tc, td, tl);
        trunk(p, [[29, 38], [40, 32], [47, 28]], 2, 1, tc, td, tl);
        var blobs = [];
        for (var j = 0; j < 18; j++) { var a2 = rnd() * 6.28, r2 = rnd(); blobs.push([30 + Math.cos(a2) * r2 * 19, 22 + Math.sin(a2) * r2 * 11, 6 + rnd() * 4, 4.5 + rnd() * 3]); }
        canopy(p, ctx, rnd, blobs, cols, 0.15, 0.1);
        for (var q = 0; q < 8; q++) p.px(10 + rnd() * 40, 34 + rnd() * 6, cols[2]);
      }
    },
    maple: {
      name: function () { return L2("Fächerahorn", "Japanese maple"); },
      w: 54, h: 56, ax: 27, ay: 54, variants: 2, grows: true, leaves: true, solid: [[0, -1, 4]], canopy: 36, fx: { chips: WOOD, leaves: true },
      draw: function (p, ctx, rnd, v) {
        trunk(p, [[27, 54], [26, 46], [28, 38], [26, 30]], 4, 2, "#5A3B2A", "#3A261C", "#7A553C");
        trunk(p, [[27, 40], [20, 32], [15, 27]], 2, 1, "#5A3B2A", "#3A261C", "#7A553C");
        trunk(p, [[27, 38], [35, 31], [40, 26]], 2, 1, "#5A3B2A", "#3A261C", "#7A553C");
        var blobs = [];
        for (var i = 0; i < 16; i++) { var a = rnd() * 6.28, r = rnd(); blobs.push([27 + Math.cos(a) * r * 17, 22 + Math.sin(a) * r * 11 - 1, 6 + rnd() * 4, 4.5 + rnd() * 3]); }
        canopy(p, ctx, rnd, blobs, v === 1 ? ["#7A3A12", "#B85A1E", "#E08A2C", "#F6C055"] : ["#6E1714", "#A82722", "#D24A2C", "#F08A3E"], 0, 0.12);
      }
    },
    tree: {
      name: function () { return L2("Laubbaum", "Deciduous tree"); },
      w: 60, h: 60, ax: 30, ay: 58, variants: 3, grows: true, solid: [[0, -1, 4]], canopy: 40, fx: { chips: WOOD, leaves: true },
      draw: function (p, ctx, rnd, v) {
        var tc = "#5C3A26", td = "#3A2418", tl = "#7E5636", blobs = [], i;
        if (v === 0) {
          trunk(p, [[30, 58], [30, 44], [30, 32]], 6, 4, tc, td, tl);
          p.rect(26, 56, 9, 2, tc); trunk(p, [[30, 40], [22, 32]], 2, 1, tc, td, tl);
          for (i = 0; i < 14; i++) { var a = rnd() * 6.28, r = rnd(); blobs.push([30 + Math.cos(a) * r * 15, 22 + Math.sin(a) * r * 11, 7 + rnd() * 4, 6 + rnd() * 3]); }
        } else if (v === 1) {
          trunk(p, [[30, 58], [33, 50], [28, 42], [32, 34]], 6, 3, tc, td, tl);
          trunk(p, [[30, 44], [18, 36], [10, 34]], 3, 1, tc, td, tl); trunk(p, [[31, 38], [44, 32], [50, 30]], 3, 1, tc, td, tl);
          for (i = 0; i < 18; i++) { var a1 = rnd() * 6.28, r1 = rnd(); blobs.push([30 + Math.cos(a1) * r1 * 21, 22 + Math.sin(a1) * r1 * 10, 7 + rnd() * 4, 5 + rnd() * 3]); }
        } else {
          trunk(p, [[30, 58], [30, 40]], 5, 4, tc, td, tl); p.rect(27, 56, 7, 2, tc);
          for (i = 0; i < 14; i++) { var a2 = rnd() * 6.28, r2 = rnd(); blobs.push([30 + Math.cos(a2) * r2 * 11, 22 + Math.sin(a2) * r2 * 17, 7 + rnd() * 3, 6 + rnd() * 3]); }
        }
        canopy(p, ctx, rnd, blobs, GREEN, 0.1, 0.04);
      }
    },
    cypress: {
      name: function () { return L2("Zypresse", "Cypress"); },
      w: 22, h: 56, ax: 11, ay: 54, variants: 2, grows: true, solid: [[0, -1, 3]], canopy: 46, fx: { chips: WOOD, leaves: true },
      draw: function (p, ctx, rnd, v) {
        trunk(p, [[11, 54], [11, 44]], 3, 3, "#4A3020", "#2E1C12", "#6A4A30");
        var b = [], hgt = v === 1 ? 40 : 46;
        for (var i = 0; i < 12; i++) { var t = i / 11; b.push([11 + (rnd() - 0.5) * 3, 46 - t * hgt, (4.5 + rnd() * 1.5) * (1 - t * 0.55), 5 + rnd() * 2]); }
        canopy(p, ctx, rnd, b, ["#173A26", "#245632", "#3A7840", "#5E9E50", "#8CC468"], 0.1, 0);
      }
    },
    cedar: {
      name: function () { return L2("Zeder (Sugi)", "Cedar (sugi)"); },
      w: 34, h: 58, ax: 17, ay: 56, variants: 2, grows: true, solid: [[0, -1, 3]], canopy: 48, fx: { chips: WOOD, leaves: true },
      draw: function (p, ctx, rnd, v) {
        p.rect(15, 46, 4, 10, "#4A3020"); p.rect(15, 46, 1, 10, "#6A4A30"); p.rect(18, 46, 1, 10, "#2E1C12");
        var cols = ["#14301E", "#1E4A2A", "#2E6838", "#4E8A48"], tiers = v === 1 ? 7 : 6;
        for (var k = 0; k < tiers; k++) {
          var ty = 6 + k * (40 / tiers), half = 3 + k * (12 / tiers) + 2, th = 40 / tiers + 3;
          for (var y = 0; y < th; y++) {
            var w = half * (0.35 + 0.65 * y / th) + (rnd() - 0.5);
            for (var x = -Math.round(w); x <= Math.round(w); x++) {
              var lv = -x / (w + 1) * 0.6 - y / th * 0.8 + 0.5 + (MA.hash2(x, ty + y, 9) - 0.5) * 0.5;
              p.px(17 + x, ty + y, cols[lv > 0.75 ? 3 : lv > 0.3 ? 2 : lv > -0.2 ? 1 : 0]);
            }
          }
        }
        p.px(17, 3, "#2E6838"); p.px(17, 4, "#2E6838"); p.px(17, 5, "#1E4A2A");
      }
    },
    pine: {
      name: function () { return L2("Kiefer (Niwaki)", "Pine (niwaki)"); },
      w: 56, h: 56, ax: 28, ay: 54, variants: 2, grows: true, solid: [[0, -1, 4]], canopy: 40, fx: { chips: WOOD, leaves: true },
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
      w: 20, h: 48, ax: 10, ay: 46, variants: 3, grows: true, solid: [[0, -1, 4]], canopy: 30, fx: { chips: ["#8FB84E", "#6F9A3A", "#C8D890"], leaves: true },
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
      name: function () { return L2("Busch", "Bush"); },
      w: 34, h: 26, ax: 17, ay: 24, variants: 6, grows: true, fx: { leaves: true },
      solidV: [[[0, -3, 6]], [[-6, -2, 5], [6, -2, 5]], [[0, -3, 9]], [[0, -2, 5]], [[0, -2, 4]], [[0, -3, 7]]],
      draw: function (p, ctx, rnd, v) {
        var b = [], i;
        if (v === 0) { for (i = 0; i < 8; i++) b.push([17 + (rnd() - 0.5) * 10, 16 + (rnd() - 0.5) * 6, 5 + rnd() * 2, 4.5 + rnd() * 1.5]); canopy(p, ctx, rnd, b, GREEN, 0.1, 0); }
        else if (v === 1) { for (i = 0; i < 10; i++) b.push([17 + (rnd() - 0.5) * 22, 19 + (rnd() - 0.5) * 3, 5 + rnd() * 2, 3.5 + rnd()]); canopy(p, ctx, rnd, b, ["#1E4428", "#2C6234", "#468240", "#6EA456", "#94C46C"], 0.1, 0); }
        else if (v === 2) { for (i = 0; i < 12; i++) b.push([17 + (rnd() - 0.5) * 16, 13 + (rnd() - 0.5) * 10, 6 + rnd() * 2, 5.5 + rnd() * 2]); canopy(p, ctx, rnd, b, ["#183C26", "#265A32", "#3E7A3C", "#62A050", "#8CC66A"], 0.1, 0); }
        else if (v === 3) {
          // fedrig, nach oben strebende Blätter
          for (i = 0; i < 46; i++) {
            var bx = 8 + rnd() * 18, len = 5 + rnd() * 10, lean = (bx - 17) * 0.12 + (rnd() - 0.5) * 0.6;
            for (var k = 0; k < len; k++) { var t = k / len; p.px(bx + lean * k, 23 - k, t < 0.3 ? "#1E4428" : t < 0.7 ? "#2E6E3A" : t < 0.9 ? "#4E9446" : "#86C066"); }
          }
        }
        else if (v === 4) { b.push([17, 17, 6, 5.5], [15, 16, 4, 4], [19, 17, 4, 4]); canopy(p, ctx, rnd, b, ["#2A5A30", "#3C7A3A", "#5A9C48", "#84BE60", "#B0DA84"], 0.2, 0); }
        else {
          for (i = 0; i < 9; i++) b.push([17 + (rnd() - 0.5) * 12, 15 + (rnd() - 0.5) * 7, 5 + rnd() * 2, 4.5 + rnd() * 1.5]);
          canopy(p, ctx, rnd, b, ["#0E2A1C", "#1A3E26", "#2A5834", "#46784A", "#6A9A60"], 0.05, 0);
          for (i = 0; i < 12; i++) { var fx = 7 + rnd() * 20, fy = 9 + rnd() * 11; p.px(fx, fy, "#C42A2E"); p.px(fx + 1, fy, "#E04A44"); p.px(fx, fy - 1, "#F07068"); if (rnd() < 0.5) p.px(fx + 1, fy - 1, "#F4D060"); }
        }
      }
    },
    rock: {
      name: function () { return L2("Fels", "Rock"); },
      w: 38, h: 34, ax: 19, ay: 32, variants: 13, fx: { chips: STONE, sparks: true },
      solidV: [[[0, -3, 8]], [[0, -2, 6]], [[0, -3, 9]], [[0, -2, 4]], [[0, -2, 4]], null, [[-5, -2, 5], [6, -2, 5]], [[0, -4, 13]], null,
        [[0, -2, 4]], [[0, -2, 3]], [[-3, -1, 3], [4, -1, 2]], [[0, -4, 15]]],   // 9–12 seit Monsters Arc v0.12
      draw: function (p, ctx, rnd, v) {
        var s = (rnd() * 1e5) | 0;
        if (v === 0) stone(p, 19, 32, 10, 13, s, true);
        else if (v === 1) stone(p, 19, 32, 7, 9, s, true);
        else if (v === 2) stone(p, 19, 32, 11, 15, s, true);
        else if (v === 3) stone(p, 19, 32, 5, 7, s, false);
        else if (v === 4) stone(p, 19, 32, 5, 26, s, true);                          // stehender Stein
        else if (v === 5) stone(p, 19, 32, 9, 4, s, false, ["#5E5A54", "#7C776E", "#9A948A", "#B6B0A4"]);   // flacher Trittstein
        else if (v === 6) { stone(p, 13, 32, 6, 10, s, true); stone(p, 25, 32, 7, 12, s + 1, true); stone(p, 19, 33, 4, 5, s + 2, false); }  // Gruppe
        else if (v === 7) stone(p, 19, 32, 16, 22, s, true);                         // großer Findling
        else if (v === 8) { for (var i = 0; i < 7; i++) stone(p, 12 + rnd() * 14, 30 + rnd() * 3, 2 + rnd() * 2, 2 + rnd() * 2, s + i, false); }  // Kiesel
        // Monsters Arc v0.12: drei kleine Steine und ein großer flacher Fels
        else if (v === 9) stone(p, 19, 32, 5, 6, s, true);                                                     // kleiner runder Stein mit Moos
        else if (v === 10) stone(p, 19, 32, 3.5, 8, s, false, ["#4A4A4E", "#66666A", "#84848A", "#A2A2A6"]);   // kleiner spitzer Stein (bläulich grau)
        else if (v === 11) { stone(p, 16, 32, 4, 5, s, false); stone(p, 23, 32, 3, 4, s + 3, true); }          // zwei kleine Steine
        else stone(p, 19, 32, 18, 14, s, true, ["#4A4640", "#66615A", "#847E74", "#A39D92"]);                    // großer flacher Fels
      }
    },
    fence: {
      name: function () { return L2("Roter Holzzaun", "Red wooden fence"); },
      w: 32, h: 44, ax: 16, ay: 42, variants: 4, fx: { chips: ["#B5402C", "#D4593C", "#8A2C1F", "#1F1B1B"] },
      solidV: [
        [[-11, -1, 3], [-4, -1, 3], [4, -1, 3], [11, -1, 3]],
        [[-5, -1, 3], [4, -1, 3]],
        [[0, -1, 3], [0, -8, 3], [0, -15, 3], [0, -22, 3], [0, -29, 3]],
        [[0, -1, 2]]
      ],
      draw: function (p, ctx, rnd, v) {
        var red = "#B5402C", rl = "#D4593C", rd = "#8A2C1F", blk = "#1F1B1B", bl = "#3A3434";
        function post(x, base, h) {
          p.rect(x, base - h, 2, h, red); p.px(x, base - h, rl); p.rect(x, base - h + 1, 1, h - 1, rl); p.rect(x + 1, base - h + 2, 1, h - 2, rd);
          p.rect(x - 1, base - h - 2, 4, 2, blk); p.rect(x - 1, base - h - 2, 4, 1, bl);   // Kappe
          p.rect(x - 1, base - 1, 4, 1, "#2A2422");                                        // Fuß
        }
        if (v === 0 || v === 1) {
          var x0 = v === 0 ? 2 : 9, x1 = v === 0 ? 29 : 22, base = 42;
          p.rect(x0, base - 9, x1 - x0 + 2, 2, red); p.rect(x0, base - 9, x1 - x0 + 2, 1, rl); p.rect(x0, base - 7, x1 - x0 + 2, 1, rd);   // oberer Riegel
          p.rect(x0, base - 4, x1 - x0 + 2, 1, rd);                                                                                      // unterer Riegel
          var xs = v === 0 ? [2, 11, 20, 29] : [9, 22];
          xs.forEach(function (x) { post(x, base, 11); });
        } else if (v === 2) {
          // Zaun nach Norden (längs): Pfosten hintereinander, Riegel als senkrechte Linien
          var bases = [12, 22, 32, 42];
          bases.forEach(function (b, i) {
            post(15, b, 7);
            if (i < 3) { p.rect(17, b - 6, 1, 10, rl); p.rect(18, b - 6, 1, 10, rd); p.rect(17, b - 2, 2, 1, rd); }   // Riegel zur nächsten Stütze
          });
        } else {
          post(15, 42, 12);
          p.rect(13, 34, 6, 1, "#C8A85A"); p.px(13, 35, "#C8A85A"); p.px(18, 35, "#A88A48"); p.px(13, 36, "#E8E0CC"); p.px(18, 37, "#E8E0CC");   // Seil mit Papierstreifen
        }
      }
    },
    jizo: {
      name: function () { return L2("Jizō-Statue", "Jizō statue"); },
      w: 12, h: 18, ax: 6, ay: 17, variants: 1, solid: [[0, -2, 4]], fx: { chips: STONE, sparks: true },
      draw: function (p) {
        var st = "#8C887F", sd = "#66625B", sl = "#ADA89D";
        p.rect(2, 14, 8, 3, sd); p.rect(2, 14, 8, 1, st);
        p.ell(6, 10.5, 3.5, 4, st); p.rect(3, 10, 1, 4, sl);
        p.ell(6, 4.5, 2.6, 2.8, st); p.px(5, 3, sl); p.px(5, 5, sd); p.px(7, 5, sd);
        p.rect(3, 7, 6, 3, "#B2302A"); p.rect(3, 9, 6, 1, "#8A2220"); p.px(4, 7, "#D04A3A");
      }
    },
    // Banner (Nobori): senkrechte Fahne an einem Pfahl, der in der Erde steckt. 4 Bilder: der Stoff flattert
    banner: {
      name: function () { return L2("Banner", "Banner"); },
      w: 26, h: 60, ax: 6, ay: 58, variants: 3, frames: 4, fps: 5, solid: [[0, -1, 2]],
      fx: { chips: ["#6B4A2E", "#A8241E", "#E8E0CC", "#1D2438"] },
      draw: function (p, ctx, rnd, v, fr) {
        var PX = 5, top = 4, base = 58, c0 = 8, c1 = 19, y0 = 8, y1 = 47, ph = (fr || 0) * Math.PI / 2;
        // Stoff-Farben je Variante: [dunkel, mittel, hell, Glanz]
        var C = [["#5E1410", "#8A1E18", "#B02A20", "#CC4430"],      // rot
                 ["#8A8270", "#BEB6A0", "#E2DAC4", "#F4EEDC"],      // weiß
                 ["#10131F", "#1D2438", "#2E3852", "#43507A"]][v];  // indigo
        // Pfahl (schwarz lackiert), Spitze, Querstange oben
        p.rect(PX, top, 2, base - top, "#2A1E1A"); p.rect(PX, top, 1, base - top, "#4A3A30");
        p.px(PX, top - 1, "#C9A445"); p.px(PX + 1, top - 1, "#957530"); p.px(PX, top - 2, "#EBD07C");
        // Erde, in der der Pfahl steckt
        p.rect(PX - 3, base - 1, 8, 2, "#3A2A1C"); p.rect(PX - 2, base - 2, 6, 1, "#4E3A26"); p.px(PX - 3, base - 2, "#5A4430"); p.px(PX + 4, base - 2, "#33261A");
        // Stoff: wellt sich zum freien Rand hin (am Pfahl und oben festgebunden)
        for (var y = y0; y <= y1; y++) {
          var ty = (y - y0) / (y1 - y0), sway = Math.sin(y * 0.3 - ph) * (0.6 + ty * 1.4), edge = Math.round(c1 + sway + ty * 0.8);
          if (y === y1) edge -= 1;
          for (var x = c0; x <= edge; x++) {
            var tx = (x - c0) / (c1 - c0), fold = Math.sin(x * 0.7 + y * 0.18 - ph * 1.0 + tx * 1.5) * (0.25 + tx * 0.75);
            var k = fold > 0.45 ? 3 : fold > -0.1 ? 2 : fold > -0.6 ? 1 : 0;
            if (x === edge) k = Math.max(0, k - 1);
            var col = C[k];
            // Muster
            var mx = x - (c0 + c1) / 2 - 0.5, my = y - 16;
            if (v === 0) {   // weißes Wappen mit rotem Kern, dunkles Band unten
              var r = Math.sqrt(mx * mx + my * my);
              if (r < 4.6) col = r < 1.7 ? C[Math.min(3, k + 1)] : ["#B8B09C", "#D8D0BC", "#ECE6D6", "#FAF6EC"][k];
              if (y > y1 - 6) col = ["#2A0A08", "#3E100C", "#561812", "#6A2018"][k];
            } else if (v === 1) {   // schwarzes Kopfband, drei Pinselstriche, rotes Siegel
              if (y < y0 + 4) col = ["#0A0808", "#141010", "#201A1A", "#2C2424"][k];
              var sx = x - c0;
              var ink = "#141010";   // abstrakte Pinselschrift: Querstrich, Hauptstrich mit Haken, zwei Tupfer
              if (y === 13 && sx > 1 && sx < 10) col = ink; if (y === 14 && sx > 2 && sx < 6) col = ink;
              if ((sx === 5 || (sx === 6 && y < 30)) && y > 13 && y < 34) col = ink;
              if ((y === 33 && sx === 4) || (y === 32 && sx === 3)) col = ink;
              if ((y === 20 && sx === 8) || (y === 21 && (sx === 8 || sx === 9)) || (y === 22 && sx === 9)) col = ink;
              if ((y === 25 && sx === 3) || (y === 26 && (sx === 2 || sx === 3)) || (y === 27 && sx === 2)) col = "#201A1A";
              if (y > 37 && y < 42 && sx > 6 && sx < 10) col = y === 38 ? "#D8452E" : "#B02A20";
            } else {   // weiße Rauten in einer Spalte, weißer Randstreifen am Pfahl
              var dx = Math.abs(mx), cy = ((y - y0 - 3) % 9 + 9) % 9, dy = Math.abs(cy - 4);
              if (dx + dy < 3.2 && dx + dy > 1.6 && y > y0 + 2 && y < y1 - 3) col = ["#8A8478", "#BEB6A4", "#E2DCCC", "#FAF6EC"][k];
              if (x <= c0 + 1) col = ["#8A8478", "#BEB6A4", "#E2DCCC", "#F2ECDA"][Math.min(2, k)];
            }
            p.px(x, y, col);
          }
        }
        // Querstange und Ösen am Pfahl
        p.rect(PX, y0 - 1, c1 - PX + 2, 1, "#2A1E1A"); p.px(c1 + 1, y0 - 1, "#C9A445");
        for (var ry = y0 + 2; ry < y1; ry += 6) { p.px(PX + 2, ry, "#E8E0CC"); p.px(PX + 1, ry, "#C8C0AC"); }
      }
    },
    makiwara: {
      name: function () { return L2("Makiwara (Übungspfahl)", "Makiwara (training post)"); },
      w: 12, h: 28, ax: 6, ay: 27, variants: 1, solid: [[0, -1, 4]], fx: { straw: true },
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

  function blades(p, rnd, n, x0, x1, base, hmin, hmax, cols, spread) {
    for (var i = 0; i < n; i++) {
      var x = x0 + rnd() * (x1 - x0), h = hmin + rnd() * (hmax - hmin), lean = (rnd() - 0.5) * (spread || 3);
      for (var k = 0; k < h; k++) { var t = k / h; p.px(x + lean * t * t, base - k, cols[t < 0.35 ? 0 : t < 0.75 ? 1 : 2]); }
    }
  }

  MA.VEG = {
    grass: {
      name: function () { return L2("Gras", "Grass"); }, w: 11, h: 9, ax: 5, ay: 8, variants: 4,
      draw: function (p, ctx, rnd, v) {
        var cols = [["#3E6430", "#5A8A3E", "#7FAE52"], ["#4E6A2E", "#73923E", "#A0B65A"], ["#3A5C34", "#557E44", "#7AA05C"], ["#5E6A34", "#86904A", "#B4B266"]][v];
        blades(p, rnd, 5 + ((rnd() * 4) | 0), 2, 9, 8, 3, 8, cols, 3);
      }
    },
    tallgrass: {
      name: function () { return L2("Hohes Gras", "Tall grass"); }, w: 15, h: 18, ax: 7, ay: 17, variants: 4, tall: true,
      draw: function (p, ctx, rnd, v) {
        var cols = [["#2E5228", "#4A7E3A", "#7AAE52"], ["#3A5A2A", "#628A3A", "#9AB85A"], ["#2A4C2E", "#467A42", "#74A45C"], ["#4A5A2A", "#7A8A3A", "#B0B060"]][v];
        blades(p, rnd, 12 + ((rnd() * 6) | 0), 2, 13, 17, 8, 16, cols, 6);
        for (var s = 0; s < 3; s++) { var x = 3 + rnd() * 9, y = 2 + rnd() * 4; p.px(x, y, "#C8C080"); p.px(x, y + 1, "#A8A060"); }
      }
    },
    wildflower: {
      name: function () { return L2("Wildblumen", "Wildflowers"); }, w: 11, h: 15, ax: 5, ay: 14, variants: 4, tall: true,
      draw: function (p, ctx, rnd, v) {
        blades(p, rnd, 5, 2, 9, 14, 5, 10, ["#2E5228", "#4A7E3A", "#6A9E4A"], 3);
        var fc = [["#8A5ABE", "#B48AE0"], ["#E8C030", "#F6E070"], ["#F0ECE4", "#FFFFFF"], ["#D8506A", "#F088A0"]][v];
        for (var i = 0; i < 3; i++) {
          var x = 2 + rnd() * 7, h = 7 + rnd() * 6;
          for (var k = 0; k < h; k++) p.px(x, 14 - k, "#4A7A36");
          var y = 14 - h; p.px(x, y, fc[0]); p.px(x - 1, y, fc[0]); p.px(x + 1, y, fc[0]); p.px(x, y - 1, fc[1]); p.px(x, y + 1, fc[0]);
        }
      }
    },
    wheat: {
      name: function () { return L2("Korn", "Grain"); }, w: 11, h: 19, ax: 5, ay: 18, variants: 3, tall: true,
      draw: function (p, ctx, rnd) {
        var cols = ["#8A6A28", "#C09A3A", "#E2C25A", "#F6E08E"];
        for (var i = 0; i < 6; i++) {
          var x = 1 + rnd() * 9, h = 12 + rnd() * 6, lean = (rnd() - 0.5) * 3;
          for (var k = 0; k < h; k++) { var t = k / h; p.px(x + lean * t * t, 18 - k, cols[t < 0.4 ? 0 : 1]); }
          var tx = x + lean, ty = 18 - h;
          for (var e = 0; e < 4; e++) { p.px(tx, ty + e, cols[e < 2 ? 3 : 2]); p.px(tx + (e % 2 ? 1 : -1), ty + e + 0.5, cols[2]); }
          p.px(tx, ty - 1, cols[3]); p.px(tx + 1, ty - 2, "#E8D8A0");
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
        p.px(4, cy, "#7E1210"); p.px(1, cy - 2, "#F0533A"); p.px(7, cy - 2, "#F0533A");
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
      name: function () { return L2("Schilf", "Reeds"); }, w: 9, h: 16, ax: 4, ay: 15, variants: 3, tall: true,
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
    petals: {
      name: function () { return L2("Kirschblüten am Boden", "Fallen petals"); }, w: 7, h: 5, ax: 3, ay: 4, variants: 3, flat: true,
      draw: function (p, ctx, rnd) {
        var c = ["#F2A6C0", "#FFD0DE", "#E888A8", "#FFF0F4"];
        for (var i = 0; i < 4; i++) p.px(rnd() * 6, 1 + rnd() * 3, c[(rnd() * 4) | 0]);
      }
    },
    lotus: {
      name: function () { return L2("Seerose", "Water lily"); }, w: 12, h: 8, ax: 6, ay: 6, variants: 3, flat: true, water: true,
      draw: function (p, ctx, rnd, v) {
        p.ell(6, 4.5, 5, 2.8, "#3E6E3A"); p.ell(5.5, 4, 3.5, 1.8, "#548A46");
        ctx.clearRect(8, 3, 3, 1); ctx.clearRect(9, 4, 2, 1);
        if (v === 0) { p.px(5, 2, "#F2A6C2"); p.px(4, 3, "#E8789E"); p.px(6, 3, "#E8789E"); p.px(5, 3, "#F8D0DE"); p.px(5, 1, "#F8D0DE"); }
      }
    }
  };

  // ---------- Sprite-Cache ----------
  var cache = {};
  MA.sprite = function (kind, type, v, fr) {
    fr = fr || 0;
    var key = kind + ":" + type + ":" + v + (fr ? ":" + fr : "");
    if (cache[key]) return cache[key];
    var def = (kind === "veg" ? MA.VEG : MA.OBJECTS)[type];
    var cv = MA.canvas(def.w, def.h);
    def.draw(MA.pen(cv.ctx), cv.ctx, MA.rng(1000 + v * 97 + type.length * 13 + type.charCodeAt(0)), v || 0, fr);
    if (kind === "obj" && !def.noOutline) MA.outline(cv, "#141012");
    var s = { cv: cv, sil: MA.silhouette(cv), def: def };
    cache[key] = s;
    return s;
  };
  MA.objSolid = function (o) { var d = MA.OBJECTS[o.t]; return d.solidV ? d.solidV[o.v] : d.solid; };
  // Grobe Trefferhöhe eines Objekts (Mitte des Sprites über dem Fußpunkt)
  MA.objCenter = function (o) { var d = MA.OBJECTS[o.t]; return { x: o.x, y: o.y - Math.min(14, d.h * 0.35) }; };
})();
