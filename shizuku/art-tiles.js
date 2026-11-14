/* Shizuku – art-tiles.js
   Zeichnet den kompletten Boden einer Arena Pixel für Pixel:
   Tempelplatten mit Fugen, Kanten, Rissen und Abrieb, organische Übergänge zu Moos und Erde,
   geharkter Sand mit Ringen um Steine, Wasser mit Uferkante, Mauern mit Deckstein und Quaderfront.
   Ergebnis: base (fertiger Boden ohne Moos) und moss (eigene Ebene, damit Moos „wachsen“ kann). */
(function () {
  var SZ = window.SZ, C = SZ.COLS, R = SZ.ROWS, T = SZ.TILE, W = SZ.W, H = SZ.H;
  var hash = SZ.hash2, fbm = SZ.fbm, noise = SZ.noise2;

  // Plattenmuster: Rechtecke aus 8-px-Zellen
  function slabs(seed) {
    var gw = W / 8, gh = H / 8, id = new Int32Array(gw * gh).fill(-1), info = [], rnd = SZ.rng(seed * 31 + 5);
    for (var y = 0; y < gh; y++) for (var x = 0; x < gw; x++) {
      if (id[y * gw + x] >= 0) continue;
      var w = 1 + ((rnd() * 3) | 0), h = 1 + ((rnd() * 2) | 0);
      if (rnd() < 0.25) { w = 2; h = 2; }
      for (var ww = 1; ww < w; ww++) if (x + ww >= gw || id[y * gw + x + ww] >= 0) { w = ww; break; }
      for (var hh = 1; hh < h; hh++) if (y + hh >= gh) { h = hh; break; }
      for (var yy = y; yy < y + h; yy++) for (var xx = x; xx < x + w; xx++) if (id[yy * gw + xx] < 0) id[yy * gw + xx] = info.length;
      var warm = rnd();
      info.push({ x: x * 8, y: y * 8, w: w * 8, h: h * 8, tone: (rnd() - 0.5) * 22, warm: warm, crack: rnd() < 0.18 ? rnd() * 1e6 | 0 : 0 });
    }
    return { id: id, info: info, gw: gw };
  }

  // Feld 0..1 je Kachel, weich zwischen Kachelmitten interpoliert (für organische Übergänge)
  function field(arena, ch) {
    var f = new Float32Array(C * R);
    for (var i = 0; i < C * R; i++) f[i] = arena.tiles[i] === ch ? 1 : 0;
    return function (x, y) {
      var fx = x / T - 0.5, fy = y / T - 0.5, x0 = Math.floor(fx), y0 = Math.floor(fy), u = fx - x0, v = fy - y0;
      function g(a, b) { a = Math.max(0, Math.min(C - 1, a)); b = Math.max(0, Math.min(R - 1, b)); return f[b * C + a]; }
      u = u * u * (3 - 2 * u); v = v * v * (3 - 2 * v);
      return (g(x0, y0) * (1 - u) + g(x0 + 1, y0) * u) * (1 - v) + (g(x0, y0 + 1) * (1 - u) + g(x0 + 1, y0 + 1) * u) * v;
    };
  }

  // Risse: kleine Zufallswege auf ausgewählten Platten
  function crackSet(sl) {
    var set = {};
    sl.info.forEach(function (s) {
      if (!s.crack) return;
      var r = SZ.rng(s.crack), x = s.x + 2 + r() * (s.w - 4), y = s.y + 2 + r() * (s.h - 4), dx = r() < 0.5 ? 1 : -1, n = 4 + r() * (s.w + s.h) * 0.4;
      for (var i = 0; i < n; i++) {
        set[(y | 0) * W + (x | 0)] = 1;
        if (r() < 0.6) x += dx; else y += r() < 0.5 ? 1 : -1;
        if (r() < 0.12) { set[((y + 1) | 0) * W + (x | 0)] = 1; }
        if (x < s.x + 1 || x > s.x + s.w - 2 || y < s.y + 1 || y > s.y + s.h - 2) break;
      }
    });
    return set;
  }

  function build(arena) {
    var seed = arena.seed | 0;
    var cv = SZ.canvas(W, H), img = cv.ctx.createImageData(W, H), d = img.data;
    var sl = slabs(seed), cracks = crackSet(sl);
    var mossF = field(arena, "m"), earthF = field(arena, "e");
    var rocks = arena.obj.filter(function (o) { return o.t === "rock" && arena.tilePx(o.x, o.y) === "a"; });
    var mossPix = [], mossCol = [], mossN = [];
    var stoneA = [124, 118, 108], stoneB = [104, 104, 104];

    function tl(tx, ty) { return arena.tile(tx, ty); }
    for (var y = 0; y < H; y++) {
      var ty = (y / T) | 0, ly = y - ty * T;
      for (var x = 0; x < W; x++) {
        var tx = (x / T) | 0, lx = x - tx * T, ch = arena.tiles[ty * C + tx], i = (y * W + x) * 4, col;
        var n1 = hash(x, y, seed), nf = fbm(x / 7, y / 7, seed, 2);

        if (ch === "#") {
          // ---------- Mauer ----------
          var belowWall = tl(tx, ty + 1) === "#";
          if (!belowWall && ly >= 5) {
            var fy = ly - 5, row = (fy / 4) | 0, off = (row % 2) * 5 + tx * 3, bx = Math.floor((x + off) / 10);
            var mortar = fy % 4 === 0 || (x + off) % 10 === 0;
            var bt = (hash(bx, row + ty * 7, seed + 3) - 0.5) * 18;
            col = mortar ? [52, 48, 46] : [88 + bt, 84 + bt, 78 + bt];
            var sh = 1 - fy * 0.028;
            col = [col[0] * sh, col[1] * sh, col[2] * sh];
            if (!mortar && (x + off) % 10 === 1) col = [col[0] + 10, col[1] + 10, col[2] + 9];
            if (fbm(x / 5, y / 4, seed + 9, 2) > 0.66 && fy < 5) col = [62, 82, 46];
          } else {
            var cn = (nf - 0.5) * 26 + (n1 - 0.5) * 10;
            col = [112 + cn, 107 + cn, 98 + cn];
            if (!belowWall && ly === 4) col = [col[0] + 22, col[1] + 21, col[2] + 18];
            if (fbm(x / 6, y / 6, seed + 11, 3) > 0.7) col = SZ.mix(col, [74, 96, 52], 0.55);
          }
        } else if (ch === "w") {
          // ---------- Wasser ----------
          var dist = 99;
          if (tl(tx - 1, ty) !== "w") dist = Math.min(dist, lx);
          if (tl(tx + 1, ty) !== "w") dist = Math.min(dist, T - 1 - lx);
          if (tl(tx, ty - 1) !== "w") dist = Math.min(dist, ly);
          if (tl(tx, ty + 1) !== "w") dist = Math.min(dist, T - 1 - ly);
          if (tl(tx - 1, ty - 1) !== "w") dist = Math.min(dist, Math.max(lx, ly));
          if (tl(tx + 1, ty - 1) !== "w") dist = Math.min(dist, Math.max(T - 1 - lx, ly));
          if (tl(tx - 1, ty + 1) !== "w") dist = Math.min(dist, Math.max(lx, T - 1 - ly));
          if (tl(tx + 1, ty + 1) !== "w") dist = Math.min(dist, Math.max(T - 1 - lx, T - 1 - ly));
          if (dist < 2) col = dist < 1 ? [138, 132, 120] : [96, 92, 84];        // Uferstein
          else if (dist < 3) col = [40, 62, 60];                               // Schatten unter der Kante
          else {
            var depth = Math.min(1, (dist - 3) / 12) + (nf - 0.5) * 0.25;
            col = SZ.mix([62, 104, 98], [22, 46, 54], Math.max(0, Math.min(1, depth)));
            if (n1 > 0.97) col = SZ.mix(col, [90, 120, 90], 0.4);
          }
        } else if (ch === "a") {
          // ---------- Geharkter Sand ----------
          var ring = null, best = 1e9;
          rocks.forEach(function (r) { var dd = Math.sqrt((x - r.x) * (x - r.x) + (y - r.y + 3) * (y - r.y + 3) * 1.6); if (dd < best) { best = dd; ring = r; } });
          var wave = ring && best < 26 ? Math.sin(best * 1.25) : Math.sin((y + Math.sin(x * 0.07 + seed) * 1.6) * 1.25);
          col = wave > 0.35 ? [214, 205, 182] : wave < -0.55 ? [170, 160, 140] : [196, 187, 164];
          col = [col[0] + (n1 - 0.5) * 10, col[1] + (n1 - 0.5) * 10, col[2] + (n1 - 0.5) * 8];
          var edge = (tl(tx - 1, ty) !== "a" && lx < 2) || (tl(tx + 1, ty) !== "a" && lx > T - 3) || (tl(tx, ty - 1) !== "a" && ly < 2) || (tl(tx, ty + 1) !== "a" && ly > T - 3);
          if (edge) col = ((x + y) % 4 === 0) ? [70, 66, 62] : [116, 110, 100];
        } else {
          // ---------- Steinplatten (auch unter Moos und Erde) ----------
          var gw = sl.gw, sid = sl.id[((y / 8) | 0) * gw + ((x / 8) | 0)], s = sl.info[sid];
          var sx = x - s.x, sy = y - s.y;
          var base = SZ.mix(stoneA, stoneB, s.warm);
          var tone = s.tone + (nf - 0.5) * 18 + (n1 - 0.5) * 8;
          col = [base[0] + tone, base[1] + tone, base[2] + tone];
          if (sx === 0 || sy === 0) col = [64, 60, 56];
          else if (sy === 1) col = [col[0] + 14, col[1] + 14, col[2] + 12];
          else if (sx === 1) col = [col[0] + 7, col[1] + 7, col[2] + 6];
          else if (sy === s.h - 1) col = [col[0] - 12, col[1] - 12, col[2] - 11];
          else if (sx === s.w - 1) col = [col[0] - 7, col[1] - 7, col[2] - 6];
          if (cracks[y * W + x]) col = [70, 66, 61];
          if (n1 < 0.025) col = [col[0] - 16, col[1] - 16, col[2] - 15];
          else if (n1 > 0.988) col = [col[0] + 14, col[1] + 14, col[2] + 13];

          // Erde, organisch über die Kachelgrenze hinaus
          var ef = earthF(x, y);
          if (ef > 0.05 && ef + (fbm(x / 5, y / 5, seed + 21, 3) - 0.5) * 0.7 > 0.55) {
            var en = fbm(x / 4, y / 4, seed + 23, 2);
            col = SZ.mix([98, 74, 52], [72, 54, 40], en);
            if (n1 > 0.93) col = [132, 124, 112];
            else if (n1 < 0.04) col = [52, 38, 30];
          }
          // Moos als eigene Ebene (darf wachsen)
          var mf = mossF(x, y);
          if (mf > 0.03) {
            var joint = sx <= 1 || sy <= 1 ? 0.28 : 0;
            var mv = mf + joint + (fbm(x / 6, y / 6, seed + 31, 3) - 0.5) * 0.9;
            if (mv > 0.62) {
              var mn = fbm(x / 3, y / 3, seed + 33, 2);
              var mc = SZ.mix([58, 84, 40], [112, 136, 62], mn);
              if (n1 > 0.9) mc = [146, 160, 82];
              if (mv < 0.7) mc = SZ.mix(mc, col, 0.45);
              mossPix.push(y * W + x); mossCol.push(mc); mossN.push(noise(x / 9, y / 9, seed + 41));
            }
          }
        }

        // Umgebungsverdeckung an Mauern
        if (ch !== "#") {
          var ao = 1;
          if (tl(tx, ty - 1) === "#" && ly < 4) ao *= 0.62 + ly * 0.09;
          if (tl(tx - 1, ty) === "#" && lx < 3) ao *= 0.78 + lx * 0.07;
          if (tl(tx + 1, ty) === "#" && lx > T - 4) ao *= 0.78 + (T - 1 - lx) * 0.07;
          if (ao < 1) col = [col[0] * ao, col[1] * ao, col[2] * ao];
        }
        d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
      }
    }
    cv.ctx.putImageData(img, 0, 0);

    // Moos-Ebene (fertig gewachsen)
    var mcv = SZ.canvas(W, H), mimg = mcv.ctx.createImageData(W, H);
    for (var k = 0; k < mossPix.length; k++) { var p = mossPix[k] * 4, c = mossCol[k]; mimg.data[p] = c[0]; mimg.data[p + 1] = c[1]; mimg.data[p + 2] = c[2]; mimg.data[p + 3] = 255; }
    mcv.ctx.putImageData(mimg, 0, 0);

    // Wasserpixel für die Animation
    var water = [];
    for (var wy = 0; wy < R; wy++) for (var wx = 0; wx < C; wx++) if (arena.tiles[wy * C + wx] === "w") water.push(wx, wy);

    return { base: cv, moss: mcv, mossPix: mossPix, mossCol: mossCol, mossN: mossN, water: water, rev: arena.rev, wcv: SZ.canvas(W, H) };
  }

  // Wasser: wandernde Lichtlinien und Glitzern, jedes Bild neu
  function drawWater(ctx, g, t) {
    if (!g.water.length) return;
    var wc = g.wcv, img = wc.imgData || (wc.imgData = wc.ctx.createImageData(W, H)), d = img.data;
    d.fill(0);
    for (var k = 0; k < g.water.length; k += 2) {
      var tx = g.water[k], ty = g.water[k + 1];
      for (var ly = 3; ly < T - 2; ly++) for (var lx = 2; lx < T - 2; lx++) {
        var x = tx * T + lx, y = ty * T + ly, i = (y * W + x) * 4;
        var a = Math.sin(x * 0.42 + t * 1.3 + Math.sin(y * 0.55 + t * 0.9) * 1.6) * Math.sin(y * 0.7 - t * 1.05 + x * 0.12);
        if (a > 0.8) { d[i] = 150; d[i + 1] = 196; d[i + 2] = 190; d[i + 3] = 120; }
        else if (a > 0.66) { d[i] = 110; d[i + 1] = 156; d[i + 2] = 150; d[i + 3] = 70; }
        var sp = SZ.hash2(x, y, Math.floor(t * 3));
        if (sp > 0.9975) { d[i] = 235; d[i + 1] = 245; d[i + 2] = 240; d[i + 3] = 220; }
      }
    }
    wc.ctx.putImageData(img, 0, 0);
    ctx.drawImage(wc, 0, 0);
  }

  SZ.ground = { build: build, drawWater: drawWater };
})();
