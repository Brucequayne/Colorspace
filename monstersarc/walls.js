/* Monsters Arc – walls.js (seit v0.13)
   Mauern als eigene Ebene auf dem Kachelraster: Hecke, Holzzaun, Mauer. Eine Kachel trägt höchstens ein Mauerstück
   (map.wall, ein Zeichen je Kachel, "0" = nichts). Kleinbuchstabe = waagerecht (0°), Großbuchstabe = senkrecht (90°).
   Stücke verbinden sich automatisch mit Mauern in den vier Nachbarkacheln (auch verschiedener Art), so entstehen
   Ecken, T-Stücke und Kreuzungen. Die Ausrichtung zählt nur für einzelne, unverbundene Stücke.
   Mauern sind für die Spielfigur unüberwindbar: Kollision über die Grundfläche (Mittelstück + Arme zu den Nachbarn).
   Bild: 3/4-Ansicht wie die Objekte (Vorderseite + Oberseite), Texturen über Weltkoordinaten, daher nahtlos. */
(function () {
  var MA = window.MA, L2 = MA.L2, T = MA.TILE, hash = MA.hash2, fbm = MA.fbm;
  var C = 8;    // Mitte der Kachel
  var PAD = 2;  // Rand im Bild (Hecke wächst etwas über)

  // th = halbe Dicke der Grundfläche (px), H = Höhe (px), ov = Farbe in der Übersichtskarte
  MA.WALLS = {
    h: { name: function () { return L2("Hecke", "Hedge"); }, th: 6, H: 18, ov: "#2C4A22" },
    f: { name: function () { return L2("Holzzaun", "Wooden fence"); }, th: 2, H: 13, ov: "#8A5A32" },
    m: { name: function () { return L2("Mauer", "Wall"); }, th: 5, H: 16, ov: "#7C776E" }
  };
  function def(ch) { return MA.WALLS[ch.toLowerCase()]; }
  function vertical(ch) { return ch !== ch.toLowerCase(); }

  // Verbindungen: 1 = Norden, 2 = Osten, 4 = Süden, 8 = Westen
  function maskAt(map, tx, ty) {
    var m = 0;
    if (map.wallAt(tx, ty - 1) !== "0") m |= 1;
    if (map.wallAt(tx + 1, ty) !== "0") m |= 2;
    if (map.wallAt(tx, ty + 1) !== "0") m |= 4;
    if (map.wallAt(tx - 1, ty) !== "0") m |= 8;
    return m;
  }
  // Grundfläche in Kachel-Koordinaten (0..16): Liste [x0, y0, x1, y1]
  function rects(ch, mask) {
    var d = def(ch), t = d.th, out = [[C - t, C - t, C + t, C + t]];
    if (!mask) mask = vertical(ch) ? 5 : 10;
    if (mask & 1) out.push([C - t, 0, C + t, C]);
    if (mask & 4) out.push([C - t, C, C + t, T]);
    if (mask & 8) out.push([0, C - t, C, C + t]);
    if (mask & 2) out.push([C, C - t, T, C + t]);
    return out;
  }

  // ---------- Texturen ----------
  function rgb(c) { return "rgb(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + ")"; }
  var HEDGE = [[34, 56, 28], [46, 76, 34], [62, 100, 44], [86, 128, 56], [112, 152, 70]];
  function hedgeCol(gx, gy, k, top) {   // k = 0 unten … 1 oben
    var n = fbm(gx / 3.2, gy / 3.2, 41, 2) * 0.7 + hash(gx, gy, 43) * 0.3, lv = n * 2.2 + (top ? 1.3 : k * 1.2 - 0.3);
    if (hash(gx, gy, 47) > 0.93) lv += 1;   // einzelne helle Blätter
    if (!top && k < 0.12) lv -= 1;          // Fuß im Schatten
    return HEDGE[Math.max(0, Math.min(4, Math.round(lv)))];
  }
  var STONE = [[104, 100, 92], [118, 113, 104], [132, 127, 117], [146, 140, 129]], MORTAR = [70, 66, 60];
  var MOSS = [[70, 96, 46], [88, 116, 54], [108, 136, 64]];
  function moss(gx, gy, k) {   // leicht vermoost: oben mehr, unten fast nichts
    var n = fbm(gx / 5, gy / 4, 61, 3) + (k - 0.5) * 0.35 + (hash(gx, gy, 63) - 0.5) * 0.12;
    return n > 0.66 ? MOSS[Math.min(2, ((n - 0.66) * 14) | 0)] : null;
  }
  function wallFront(gx, gy, k, ly) {
    var row = Math.floor(ly / 4), bx = gx + (row & 1) * 4, brick = Math.floor(bx / 8);
    if (((ly % 4) + 4) % 4 === 3 || ((bx % 8) + 8) % 8 === 7) return MORTAR;
    var c = STONE[(hash(brick, row, 53) * 3.99) | 0], d = (hash(gx, gy, 57) - 0.5) * 10 + (k - 0.5) * 14;
    var mo = moss(gx, gy, k); if (mo) return mo;
    return [c[0] + d, c[1] + d, c[2] + d];
  }
  function wallTop(gx, gy) {   // Abdecksteine 8 × 8 mit Fugen
    if ((gx & 7) === 7 || (gy & 7) === 7) return [92, 88, 80];
    var c = ((gx >> 3) + (gy >> 3)) & 1 ? [124, 119, 109] : [116, 111, 102], d = (hash(gx, gy, 59) - 0.5) * 8 + (hash(gx >> 3, gy >> 3, 67) - 0.5) * 10;
    var mo = moss(gx, gy + 7, 1.05); if (mo) return mo;
    return [c[0] + d, c[1] + d, c[2] + d];
  }
  var WOOD = { dark: [80, 46, 22], mid: [128, 80, 42], light: [166, 108, 58], hi: [198, 140, 82] };

  // Ein Stück zeichnen: Bild (16 + 2·PAD) × (16 + H + 2·PAD), Kachel-Ursprung bei (PAD, PAD + H)
  function render(ch, mask, gx0, gy0) {
    var d = def(ch), H = d.H, w = T + PAD * 2, h = T + H + PAD * 2, cv = MA.canvas(w, h), ctx = cv.ctx;
    var oy = PAD + H, R = rects(ch, mask);
    function px(x, y, c) { ctx.fillStyle = rgb(c); ctx.fillRect(x + PAD, y + oy, 1, 1); }
    var k = ch.toLowerCase();
    if (k === "f") {
      // Holzzaun: Pfosten in der Mitte, zwei Querlatten zu den Nachbarn
      var mk = mask || (vertical(ch) ? 5 : 10), rails = [4, 9];
      rails.forEach(function (rh) {
        for (var x = 0; x < T; x++) {
          if (!((mk & 8) && x < C) && !((mk & 2) && x >= C)) continue;
          px(x, C + 1 - rh - 1, hash(gx0 + x, rh, 71) > 0.85 ? WOOD.hi : WOOD.light); px(x, C + 1 - rh, WOOD.mid); px(x, C + 2 - rh, WOOD.dark);
        }
        for (var y = 0; y < T; y++) {
          if (!((mk & 1) && y < C) && !((mk & 4) && y >= C)) continue;
          var yy = y - rh;
          px(C - 1, yy, WOOD.light); px(C, yy, hash(gy0 + y, rh, 73) > 0.85 ? WOOD.dark : WOOD.mid);
        }
      });
      // Pfosten (3 × 2 Grundfläche, 15 hoch) mit Spitze
      for (var py = 0; py < 15; py++) for (var pxx = -1; pxx <= 1; pxx++) px(C + pxx, C + 1 - py, pxx < 0 ? WOOD.light : pxx > 0 ? WOOD.dark : (py > 12 ? WOOD.hi : WOOD.mid));
      px(C - 1, C + 1 - 14, WOOD.hi); px(C, C + 1 - 15, WOOD.light);
      ctx.fillStyle = "rgba(20,14,8,0.35)"; ctx.fillRect(PAD + C - 2, oy + C + 2, 5, 1);
    } else {
      // Kontaktschatten am Fuß
      ctx.fillStyle = "rgba(10,14,8,0.32)";
      R.forEach(function (r) { ctx.fillRect(PAD + r[0], oy + r[3], r[2] - r[0], 1); });
      // Vorderseiten
      R.forEach(function (r) {
        for (var x = r[0]; x < r[2]; x++) for (var y = r[3] - H; y < r[3]; y++) {
          var kk = (r[3] - y) / H, gx = gx0 + x, gy = gy0 + y;
          if (k === "h") { if ((x === r[0] || x === r[2] - 1) && hash(gx, gy, 81) < 0.3) continue; px(x, y, hedgeCol(gx, gy, kk, false)); }
          else px(x, y, y === r[3] - 1 ? [64, 60, 54] : wallFront(gx, gy, kk, r[3] - y));
        }
      });
      // Oberseiten (über den Vorderseiten); Ränder: Kanten zum Nachbarn laufen über die Kachel hinaus weiter
      var RX = R.map(function (r) { return [r[0] === 0 ? -9 : r[0], r[1] === 0 ? -9 : r[1], r[2] === T ? T + 9 : r[2], r[3] === T ? T + 9 : r[3]]; });
      function inTop(x, y) { for (var i = 0; i < RX.length; i++) { var r = RX[i]; if (x >= r[0] && x < r[2] && y >= r[1] - H && y < r[3] - H) return true; } return false; }
      R.forEach(function (r) {
        for (var x = r[0]; x < r[2]; x++) for (var y = r[1] - H; y < r[3] - H; y++) {
          var gx = gx0 + x, gy = gy0 + y + H, side = !inTop(x - 1, y) || !inTop(x + 1, y), lip = !inTop(x, y - 1), front = !inTop(x, y + 1);
          if (k === "h") { var hc = hedgeCol(gx, gy, 1, true); px(x, y, side ? HEDGE[Math.max(1, HEDGE.indexOf(hc) - 1)] : hc); }
          else px(x, y, side ? [78, 74, 68] : lip ? [146, 140, 128] : front ? [150, 144, 132] : wallTop(gx, gy));
        }
      });
      if (k === "h") {
        // lose Blätter über den Rand hinaus (organische Kante)
        R.forEach(function (r) {
          for (var x = r[0] - 1; x <= r[2]; x++) {
            var gx = gx0 + x;
            if (hash(gx, gy0 + r[1], 83) > 0.62) px(x, r[1] - H - 1, HEDGE[2 + (hash(gx, 1, 85) > 0.5 ? 1 : 0)]);
          }
          for (var y = r[1] - H; y < r[3]; y++) {
            if (r[0] > 0 && hash(gx0 + r[0], gy0 + y, 87) > 0.72) px(r[0] - 1, y, HEDGE[1]);
            if (r[2] < T && hash(gx0 + r[2], gy0 + y, 89) > 0.72) px(r[2], y, HEDGE[1]);
          }
        });
      }
    }
    return { cv: cv, sil: MA.silhouette(cv), ax: PAD + C, ay: oy + C + d.th, H: H };
  }

  var cache = {}, nCache = 0;
  function piece(map, tx, ty) {
    var ch = map.wallAt(tx, ty); if (ch === "0") return null;
    var m = maskAt(map, tx, ty), key = tx + "," + ty + ch + m, p = cache[key];
    if (!p) {
      if (nCache > 3000) { cache = {}; nCache = 0; }
      p = cache[key] = render(ch, m, tx * T, ty * T); nCache++;
    }
    return p;
  }
  // Vorschau/Knopfbild ohne Cache
  function preview(ch, mask, tx, ty) { return render(ch, mask, (tx || 0) * T, (ty || 0) * T); }

  // Kollision: Kreis (Fuß, Radius r) gegen Grundflächen der Mauern in der Umgebung
  function hit(map, x, y, r) {
    var x0 = Math.floor((x - r) / T), x1 = Math.floor((x + r) / T), y0 = Math.floor((y - r) / T), y1 = Math.floor((y + r) / T);
    for (var ty = y0; ty <= y1; ty++) for (var tx = x0; tx <= x1; tx++) {
      var ch = map.wallAt(tx, ty); if (ch === "0") continue;
      var R = rects(ch, maskAt(map, tx, ty)), bx = tx * T, by = ty * T;
      for (var i = 0; i < R.length; i++) {
        var q = R[i], cx = Math.max(bx + q[0], Math.min(x, bx + q[2])), cy = Math.max(by + q[1], Math.min(y, by + q[3]));
        if ((x - cx) * (x - cx) + (y - cy) * (y - cy) < r * r) return true;
      }
    }
    return false;
  }

  MA.walls = { mask: maskAt, rects: rects, piece: piece, preview: preview, hit: hit, def: def, vertical: vertical };
})();
