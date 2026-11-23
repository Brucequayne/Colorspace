/* Monsters Arc – art-tiles.js  (Bodenbild aus Shizuku übernommen)
   Zeichnet den Boden Pixel für Pixel wie Shizuku: Bodenarten gehen organisch ineinander über (Kachelfelder + Rauschen),
   Moos als eigene Ebene, Wasser mit Uferkante.
   Änderungen für Monsters Arc:
   - Die Welt ist sehr groß (bis 1024 × 1024 Kacheln). Gebaut wird deshalb in Stücken („Chunks“) zu 16 × 16 Kacheln,
     nur dort, wo die Kamera hinschaut (world.js verwaltet die Chunks).
   - Meer („o“, tief, nicht begehbar) statt Abgrund, auch außerhalb der Map. Die Küste verläuft organisch.
   - Plattenmuster (Steinplatten) werden je Chunk erzeugt. */
(function () {
  var MA = window.MA, T = MA.TILE, CS = 16;   // Chunk-Größe in Kacheln
  var hash = MA.hash2, fbm = MA.fbm, noise = MA.noise2;
  var EXACT = { w: 1, o: 1, u: 1, v: 1, "#": 1, x: 1, d: 1, i: 1 };
  function isWater(c) { return c === "w" || c === "o" || c === "u"; }

  // Plattenmuster (Standard-Steinboden): Rechtecke aus 8-px-Zellen, je Chunk (lokale Pixel)
  function slabs(seed, w0, h0) {
    var gw = w0 / 8, gh = h0 / 8, id = new Int32Array(gw * gh).fill(-1), info = [], rnd = MA.rng(seed);
    for (var y = 0; y < gh; y++) for (var x = 0; x < gw; x++) {
      if (id[y * gw + x] >= 0) continue;
      var w = 1 + ((rnd() * 3) | 0), h = 1 + ((rnd() * 2) | 0);
      if (rnd() < 0.25) { w = 2; h = 2; }
      for (var ww = 1; ww < w; ww++) if (x + ww >= gw || id[y * gw + x + ww] >= 0) { w = ww; break; }
      for (var hh = 1; hh < h; hh++) if (y + hh >= gh) { h = hh; break; }
      for (var yy = y; yy < y + h; yy++) for (var xx = x; xx < x + w; xx++) if (id[yy * gw + xx] < 0) id[yy * gw + xx] = info.length;
      info.push({ x: x * 8, y: y * 8, w: w * 8, h: h * 8, tone: (rnd() - 0.5) * 22, warm: rnd(), crack: rnd() < 0.18 ? rnd() * 1e6 | 0 : 0 });
    }
    return { id: id, info: info, gw: gw };
  }
  function crackSet(sl, w0) {
    var set = {};
    sl.info.forEach(function (s) {
      if (!s.crack) return;
      var r = MA.rng(s.crack), x = s.x + 2 + r() * (s.w - 4), y = s.y + 2 + r() * (s.h - 4), dx = r() < 0.5 ? 1 : -1, n = 4 + r() * (s.w + s.h) * 0.4;
      for (var i = 0; i < n; i++) {
        set[(y | 0) * w0 + (x | 0)] = 1;
        if (r() < 0.6) x += dx; else y += r() < 0.5 ? 1 : -1;
        if (r() < 0.12) set[((y + 1) | 0) * w0 + (x | 0)] = 1;
        if (x < s.x + 1 || x > s.x + s.w - 2 || y < s.y + 1 || y > s.y + s.h - 2) break;
      }
    });
    return set;
  }
  // Voronoi-Zellen (Kopfstein, Bruchstein)
  function vor(x, y, cell, seed) {
    var cx = Math.floor(x / cell), cy = Math.floor(y / cell), d1 = 1e9, d2 = 1e9, id = 0, px = 0, py = 0;
    for (var j = -1; j <= 1; j++) for (var i = -1; i <= 1; i++) {
      var gx = cx + i, gy = cy + j;
      var ox = (gx + 0.15 + hash(gx, gy, seed) * 0.7) * cell, oy = (gy + 0.15 + hash(gx, gy, seed + 1) * 0.7) * cell;
      var d = (x - ox) * (x - ox) + (y - oy) * (y - oy);
      if (d < d1) { d2 = d1; d1 = d; id = gx * 7919 + gy; px = ox; py = oy; } else if (d < d2) d2 = d;
    }
    return { d1: Math.sqrt(d1), d2: Math.sqrt(d2), id: id, cx: px, cy: py };
  }
  // ---------- Bodenarten als Pixelfarbe ----------
  var MAT = {};
  MAT.s = function (x, y, c) {   // Steinplatten
    var s = c.sl.info[c.sl.id[((c.ly / 8) | 0) * c.sl.gw + ((c.lx / 8) | 0)]], sx = c.lx - s.x, sy = c.ly - s.y;
    var base = MA.mix([124, 118, 108], [104, 104, 104], s.warm), tone = s.tone + (c.nf - 0.5) * 18 + (c.n1 - 0.5) * 8;
    var col = [base[0] + tone, base[1] + tone, base[2] + tone];
    if (sx === 0 || sy === 0) col = [64, 60, 56];
    else if (sy === 1) col = [col[0] + 14, col[1] + 14, col[2] + 12];
    else if (sx === 1) col = [col[0] + 7, col[1] + 7, col[2] + 6];
    else if (sy === s.h - 1) col = [col[0] - 12, col[1] - 12, col[2] - 11];
    else if (sx === s.w - 1) col = [col[0] - 7, col[1] - 7, col[2] - 6];
    if (c.cracks[c.ly * c.cw + c.lx]) col = [70, 66, 61];
    if (c.n1 < 0.025) col = [col[0] - 16, col[1] - 16, col[2] - 15]; else if (c.n1 > 0.988) col = [col[0] + 14, col[1] + 14, col[2] + 13];
    c.joint = sx <= 1 || sy <= 1;
    return col;
  };
  MAT.p = function (x, y, c) {   // Große Tempelplatten (Läuferverband)
    var row = Math.floor(y / 16), off = row % 2 ? 8 : 0, cx = Math.floor((x + off) / 16), lx = (x + off) - cx * 16, ly = y - row * 16;
    var t = (hash(cx, row, c.seed + 71) - 0.5) * 14 + (c.nf - 0.5) * 10 + (c.n1 - 0.5) * 5;
    var col = [150 + t, 143 + t, 130 + t];
    if (lx === 0 || ly === 0) col = [78, 72, 66];
    else if (ly === 1) col = [col[0] + 12, col[1] + 12, col[2] + 10];
    else if (ly === 15) col = [col[0] - 14, col[1] - 14, col[2] - 13];
    else if (lx === 15) col = [col[0] - 9, col[1] - 9, col[2] - 8];
    else if (c.n1 > 0.992) col = [col[0] + 16, col[1] + 16, col[2] + 15];
    c.joint = lx === 0 || ly === 0;
    return col;
  };
  MAT.b = function (x, y, c) {   // Kopfsteinpflaster
    var v = vor(x, y, 6, c.seed + 81);
    if (v.d2 - v.d1 < 1.15) { c.joint = true; return [56, 52, 48]; }
    var t = (hash(v.id, 3, c.seed) - 0.5) * 30, col = [122 + t, 116 + t, 106 + t * 0.9];
    var dx = x - v.cx, dy = y - v.cy;
    if (dx + dy < -2.2) col = [col[0] + 16, col[1] + 16, col[2] + 14]; else if (dx + dy > 2) col = [col[0] - 18, col[1] - 18, col[2] - 16];
    c.joint = v.d2 - v.d1 < 2;
    return col;
  };
  MAT.h = function (x, y, c) {   // Bruchstein / Schiefer
    var v = vor(x, y, 12, c.seed + 91);
    if (v.d2 - v.d1 < 1.5) { c.joint = true; return hash(x, y, 5) < 0.3 ? [54, 66, 44] : [42, 42, 44]; }
    var t = (hash(v.id, 9, c.seed) - 0.5) * 22 + (c.nf - 0.5) * 12, col = [84 + t, 88 + t, 96 + t];
    var dx = x - v.cx, dy = y - v.cy;
    if (v.d2 - v.d1 < 2.6 && dx + dy < 0) col = [col[0] + 18, col[1] + 18, col[2] + 18];
    else if (v.d2 - v.d1 < 2.6) col = [col[0] - 12, col[1] - 12, col[2] - 10];
    if (c.n1 > 0.985) col = [col[0] + 14, col[1] + 14, col[2] + 16];
    c.joint = v.d2 - v.d1 < 2.6;
    return col;
  };
  var GRAV = [[178, 172, 160], [150, 144, 134], [126, 120, 112], [196, 190, 178], [104, 98, 92], [160, 150, 132]];
  MAT.g = function (x, y, c) {   // Kies
    var k = hash(x >> 1, y >> 1, c.seed + 101), col = GRAV[(k * GRAV.length) | 0].slice();
    if (hash(x, y, c.seed + 103) < 0.3) col = GRAV[(hash(x, y, c.seed + 107) * GRAV.length) | 0].slice();
    var d = (c.nf - 0.5) * 18; col = [col[0] + d, col[1] + d, col[2] + d];
    if ((y & 1) && hash(x >> 1, (y >> 1), c.seed + 101) > 0.7) col = [col[0] - 22, col[1] - 22, col[2] - 20];
    return col;
  };
  MAT.e = function (x, y, c) {   // Erde
    var en = fbm(x / 4, y / 4, c.seed + 23, 2), col = MA.mix([98, 74, 52], [72, 54, 40], en);
    if (c.n1 > 0.93) col = [132, 124, 112]; else if (c.n1 < 0.04) col = [52, 38, 30];
    return col;
  };
  // seit v0.19.9 ---------------------------------------------------------------
  MAT.r = function (x, y, c) {   // Grasboden: saftiger und heller als Moos, kurze senkrechte Halmstriche
    var col = MA.mix([110, 166, 66], [86, 140, 52], Math.min(1, c.nf * 1.15));
    var bl = hash(x, y >> 2, c.seed + 501), b2 = hash(x, (y + 2) >> 2, c.seed + 503);
    if (bl > 0.78) col = [136, 188, 82]; else if (bl < 0.1) col = [64, 112, 42];
    else if (b2 > 0.86) col = [122, 176, 72];
    if (c.n1 > 0.996) col = [236, 220, 110];           // vereinzelt kleine Blüte
    var d = (fbm(x / 22, y / 22, c.seed + 507, 2) - 0.5) * 16;
    return [col[0] + d * 0.6, col[1] + d, col[2] + d * 0.4];
  };
  MAT.l = function (x, y, c) {   // Waldboden: dunkler als Moos, Laub, Nadeln, Zweige
    var col = MA.mix([62, 52, 36], [40, 34, 26], fbm(x / 5, y / 5, c.seed + 511, 2));
    var lf = hash(x >> 1, y >> 1, c.seed + 513);
    if (lf > 0.86) col = [[112, 74, 38], [134, 94, 46], [86, 60, 32], [76, 84, 40]][((lf - 0.86) * 28) | 0];
    else if (lf < 0.05) col = [28, 22, 16];
    if (hash(x, y, c.seed + 517) > 0.985) col = [120, 102, 70];                       // Nadel / Zweiglicht
    if (fbm(x / 9, y / 9, c.seed + 519, 2) > 0.66 && lf < 0.6) col = MA.mix(col, [58, 78, 38], 0.6);   // Moosflecken
    return col;
  };
  MAT.z = function (x, y, c) {   // Strandsand: hell, warm, feinkörnig, ein paar Muschelsplitter
    var col = MA.mix([234, 218, 176], [218, 200, 156], fbm(x / 9, y / 9, c.seed + 521, 2)), g = (c.n1 - 0.5) * 12;
    col = [col[0] + g, col[1] + g, col[2] + g * 0.8];
    if (c.n1 > 0.994) col = [248, 242, 232]; else if (c.n1 < 0.006) col = [176, 160, 128];
    return col;
  };
  // Trampelpfad (seit v0.19.9): frei gemalte Stempel ohne Raster (map.paths), werden ins Bodenbild eingebacken
  var PATH_A = [150, 124, 88], PATH_B = [126, 102, 72];
  function pathCol(x, y, seed, e) {
    var col = MA.mix(PATH_A, PATH_B, fbm(x / 4, y / 4, seed + 531, 2));
    if (e > 0.88) col = MA.mix(col, [116, 92, 64], 0.5);   // ausgetretene Mitte
    var h = hash(x, y, seed + 533);
    if (h > 0.975) col = [178, 168, 148]; else if (h < 0.03) col = [96, 76, 52];
    return col;
  }
  MAT.k = function (x, y, c) {   // Matsch (seit v0.19): nasse dunkle Erde, Pfützen mit Himmelsspiegelung, glänzende Stellen
    var en = fbm(x / 4, y / 4, c.seed + 401, 2), col = MA.mix([84, 62, 44], [56, 40, 30], en);
    var pd = fbm(x / 9, y / 7, c.seed + 403, 3);
    if (pd > 0.66) {   // Pfütze: braunes Wasser, Rand dunkler, ein paar Spiegelungen
      col = pd > 0.685 ? [66, 56, 44] : [46, 34, 24];
      if (pd > 0.69 && (y % 3 === 0) && fbm(x / 4, y, c.seed + 405, 2) > 0.6) col = [104, 98, 86];
    } else if (c.n1 > 0.95) col = [112, 92, 70];      // nasser Glanz
    else if (c.n1 < 0.05) col = [40, 28, 20];
    else if (hash(x >> 1, y, c.seed + 407) > 0.9) col = [col[0] + 10, col[1] + 8, col[2] + 6];
    return col;
  };
  MAT.q = function (x, y, c) {   // Dünensand (seit v0.19): Windrippel, geschwungen, Luvseite hell, Lee-Seite schmal und dunkel
    var ph = y * 0.62 + Math.sin(x * 0.045 + c.seed) * 5 + fbm(x / 48, y / 48, c.seed + 411, 2) * 16 + Math.sin(x * 0.11 + y * 0.03) * 1.2;
    var f = ((ph / 6.2832) % 1 + 1) % 1, col;
    if (f < 0.16) col = [184, 154, 108];                  // Schatten hinter dem Kamm
    else if (f < 0.24) col = [204, 176, 128];
    else if (f > 0.9) col = [238, 216, 168];             // Kamm
    else col = MA.mix([214, 186, 136], [228, 204, 154], (f - 0.24) / 0.66);
    var d = (c.n1 - 0.5) * 8 + (fbm(x / 20, y / 20, c.seed + 413, 2) - 0.5) * 14;
    return [col[0] + d, col[1] + d, col[2] + d * 0.8];
  };
  MAT.a = function (x, y, c) {   // Geharkter Sand, Ringe um Felsen
    var best = 1e9;
    c.rocks.forEach(function (r) { var dd = Math.sqrt((x - r.x) * (x - r.x) + (y - r.y + 3) * (y - r.y + 3) * 1.6); if (dd < best) best = dd; });
    var wave = best < 26 ? Math.sin(best * 1.25) : Math.sin((y + Math.sin(x * 0.07 + c.seed) * 1.6) * 1.25);
    var col = wave > 0.35 ? [214, 205, 182] : wave < -0.55 ? [170, 160, 140] : [196, 187, 164];
    return [col[0] + (c.n1 - 0.5) * 10, col[1] + (c.n1 - 0.5) * 10, col[2] + (c.n1 - 0.5) * 8];
  };


  // Weiches Feld 0..1 aus einer Kachel-Eigenschaft, vorberechnet für den Chunk plus Rand (m Kacheln)
  function fieldR(arena, tx0, ty0, nw, nh, m, pred) {
    var fw = nw + 2 * m, fh = nh + 2 * m, f = new Float32Array(fw * fh);
    for (var y = 0; y < fh; y++) for (var x = 0; x < fw; x++) f[y * fw + x] = pred(arena.tile(tx0 - m + x, ty0 - m + y)) ? 1 : 0;
    return function (px, py) {
      var fx = px / T - 0.5 - (tx0 - m), fy = py / T - 0.5 - (ty0 - m), x0 = Math.floor(fx), y0 = Math.floor(fy), u = fx - x0, v = fy - y0;
      function g(a, b) { a = a < 0 ? 0 : a >= fw ? fw - 1 : a; b = b < 0 ? 0 : b >= fh ? fh - 1 : b; return f[b * fw + a]; }
      u = u * u * (3 - 2 * u); v = v * v * (3 - 2 * v);
      return (g(x0, y0) * (1 - u) + g(x0 + 1, y0) * u) * (1 - v) + (g(x0, y0 + 1) * (1 - u) + g(x0 + 1, y0 + 1) * u) * v;
    };
  }

  // Einen Chunk bauen (cx, cy in Chunk-Koordinaten). Ergebnis: base, moss (Canvas), wmask (Wasser-Pixel), x0/y0 in Weltpixeln
  function buildChunk(arena, cx, cy) {
    var C = arena.cols, R = arena.rows, seed = arena.seed | 0;
    var tx0 = cx * CS, ty0 = cy * CS, tx1 = Math.min(C, tx0 + CS), ty1 = Math.min(R, ty0 + CS), nw = tx1 - tx0, nh = ty1 - ty0;
    var px0 = tx0 * T, py0 = ty0 * T, cw = nw * T, chh = nh * T;
    var cv = MA.canvas(cw, chh), img = cv.ctx.createImageData(cw, chh), d = img.data;
    var mcv = MA.canvas(cw, chh), mimg = mcv.ctx.createImageData(cw, chh), md = mimg.data;
    var wmask = new Uint8Array(cw * chh);
    var sl = slabs(seed * 31 + 5 + cx * 7919 + cy * 104729, cw, chh);
    var ctx = { seed: seed, sl: sl, cw: cw, rocks: arena.obj.filter(function (o) { return o.t === "rock" && o.x > px0 - 40 && o.x < px0 + cw + 40 && o.y > py0 - 40 && o.y < py0 + chh + 40; }) };
    ctx.cracks = crackSet(sl, cw);
    function tl(tx, ty) { return arena.tile(tx, ty); }
    var mossF = fieldR(arena, tx0, ty0, nw, nh, 2, function (c) { return c === "m"; });
    // Organische Küste: Land/Wasser-Grenze folgt einem weichen Feld mit Rauschen statt der Kachelkante.
    // Begehbarkeit bleibt kachelgenau; nur das Bild ist um bis zu ~eine halbe Kachel verschoben.
    var landF = fieldR(arena, tx0, ty0, nw, nh, 2, function (c) { return !isWater(c); }), seaF = fieldR(arena, tx0, ty0, nw, nh, 2, function (c) { return c === "o"; });
    var swampF = fieldR(arena, tx0, ty0, nw, nh, 2, function (c) { return c === "u"; });
    var PS = (arena.paths || []).filter(function (q) { return q[0] + q[2] + 6 > px0 && q[0] - q[2] - 6 < px0 + cw && q[1] + q[2] + 6 > py0 && q[1] - q[2] - 6 < py0 + chh; });
    function pathAt(x, y) {
      var best = 0;
      for (var k = 0; k < PS.length; k++) { var q = PS[k], dx = x - q[0], dy = (y - q[1]) * 1.15; if (Math.abs(dx) > q[2] + 6) continue; var v = 1 - Math.sqrt(dx * dx + dy * dy) / (q[2] + 4); if (v > best) best = v; }
      return best;
    }
    var coast = new Uint8Array(nw * nh), coastLand = [];
    for (var cty = 0; cty < nh; cty++) for (var ctx0 = 0; ctx0 < nw; ctx0++) {
      var gx = tx0 + ctx0, gy = ty0 + cty, cwt = isWater(tl(gx, gy)), cl = null, cf = 0;
      for (var oy = -1; oy <= 1; oy++) for (var ox = -1; ox <= 1; ox++) {
        var nc = tl(gx + ox, gy + oy);
        if (isWater(nc) !== cwt) cf = 1;
        if (!isWater(nc) && nc !== "#" && (!cl || (ox === 0 || oy === 0))) cl = nc;
      }
      coast[cty * nw + ctx0] = cf; coastLand[cty * nw + ctx0] = cl || "a";
    }
    var tmpScore = {};

    // Bodenart eines Pixels: Nachbarkacheln gewichtet, Grenzen mit Rauschen
    function matAt(x, y, own) {
      var fx = x / T - 0.5, fy = y / T - 0.5, x0 = Math.floor(fx), y0 = Math.floor(fy), u = fx - x0, v = fy - y0;
      u = u * u * (3 - 2 * u); v = v * v * (3 - 2 * v);
      var cs = [[x0, y0, (1 - u) * (1 - v)], [x0 + 1, y0, u * (1 - v)], [x0, y0 + 1, (1 - u) * v], [x0 + 1, y0 + 1, u * v]];
      var keys = [], first = null, same = true;
      for (var i = 0; i < 4; i++) {
        var ch = tl(Math.max(0, Math.min(C - 1, cs[i][0])), Math.max(0, Math.min(R - 1, cs[i][1])));
        if (ch in EXACT) ch = own;
        if (ch === "m") ch = "s";
        if (first === null) first = ch; else if (ch !== first) same = false;
        if (!(ch in tmpScore)) { tmpScore[ch] = 0; keys.push(ch); }
        tmpScore[ch] += cs[i][2];
      }
      var best = first, bv = -9;
      if (!same) for (var k = 0; k < keys.length; k++) {
        var s = tmpScore[keys[k]] + (fbm(x / 5, y / 5, seed + keys[k].charCodeAt(0) * 13, 2) - 0.5) * 0.75;
        if (s > bv) { bv = s; best = keys[k]; }
      }
      for (var q = 0; q < keys.length; q++) delete tmpScore[keys[q]];
      return best;
    }

    for (var y = py0; y < py0 + chh; y++) {
      var ty = (y / T) | 0, ly = y - ty * T;
      for (var x = px0; x < px0 + cw; x++) {
        var tx = (x / T) | 0, lx = x - tx * T, ch = arena.tiles[ty * C + tx], li = (y - py0) * cw + (x - px0), i = li * 4, col = null;
        ctx.n1 = hash(x, y, seed); ctx.nf = fbm(x / 7, y / 7, seed, 2); ctx.joint = false; ctx.lx = x - px0; ctx.ly = y - py0;
        var ci = (ty - ty0) * nw + (tx - tx0);
        var waterHere = isWater(ch), sd = null;
        if (ch !== "#" && coast[ci]) { var vv = landF(x, y) + (fbm(x / 6, y / 6, seed + 201, 2) - 0.5) * 0.6; sd = (0.5 - vv) * 30; waterHere = vv < 0.5; }
        var landCh = isWater(ch) ? coastLand[ci] : ch;
        wmask[li] = waterHere && ch !== "#" ? 1 : 0;
        if (ch === "i") { var fx2 = x & 15, fy2 = y & 15, ft = (hash(x >> 4, y >> 4, seed + 541) - 0.5) * 8; col = fx2 === 0 || fy2 === 0 ? [168, 166, 158] : [212 + ft, 210 + ft, 202 + ft]; if (fy2 === 1) col = [222 + ft, 220 + ft, 214 + ft]; }   // Fliesen (Laden)
        else if (ch === "x") col = [12, 11, 14];   // Innenraum: außerhalb schwarz
        else if (ch === "d") {                  // Innenraum: Holzdielen (Bretter 4 px breit, versetzte Stöße)
          var prow = y >> 2, poff = (hash(prow, 3, seed + 41) * 40) | 0, pk = Math.floor((x + poff) / 40), pv = (hash(pk, prow, seed + 43) - 0.5) * 18 + (hash(x, y, seed + 47) - 0.5) * 6;
          col = (y & 3) === 3 ? [92, 62, 40] : ((x + poff) % 40 === 0 ? [104, 72, 46] : [150 + pv, 108 + pv * 0.8, 70 + pv * 0.6]);
          if ((y & 3) === 0) col = [col[0] + 8, col[1] + 6, col[2] + 4];
        } else if (ch === "#") {
          var belowWall = tl(tx, ty + 1) === "#";
          if (!belowWall && ly >= 5) {
            var fy = ly - 5, row = (fy / 4) | 0, off = (row % 2) * 5 + tx * 3, bx = Math.floor((x + off) / 10);
            var mortar = fy % 4 === 0 || (x + off) % 10 === 0, bt = (hash(bx, row + ty * 7, seed + 3) - 0.5) * 18;
            col = mortar ? [52, 48, 46] : [88 + bt, 84 + bt, 78 + bt];
            var sh = 1 - fy * 0.028; col = [col[0] * sh, col[1] * sh, col[2] * sh];
            if (!mortar && (x + off) % 10 === 1) col = [col[0] + 10, col[1] + 10, col[2] + 9];
          } else {
            var cn = (ctx.nf - 0.5) * 26 + (ctx.n1 - 0.5) * 10;
            col = [112 + cn, 107 + cn, 98 + cn];
            if (!belowWall && ly === 4) col = [col[0] + 22, col[1] + 21, col[2] + 18];
            if (fbm(x / 6, y / 6, seed + 11, 3) > 0.7) col = MA.mix(col, [74, 96, 52], 0.55);
          }
        } else if (waterHere) {
          // Wasser: Uferkante (organisch), dann flach → tief. Meer (o) wird weiter draußen noch dunkler.
          var dist = sd != null ? Math.max(0, sd) : 99;
          var sw = swampF(x, y), sk = sw > 0.01 ? Math.max(0, Math.min(1, (sw + (fbm(x / 5, y / 5, seed + 311, 2) - 0.5) * 0.5 - 0.5) * 4 + 0.5)) : 0;
          if (dist < 2) col = sk > 0.5 ? (dist < 1 ? [104, 100, 72] : [84, 98, 70]) : dist < 1 ? [138, 132, 120] : [96, 92, 84];
          else if (dist < 3) col = sk > 0.5 ? [96, 128, 104] : [40, 62, 60];
          else {
            var depth = Math.min(1, (dist - 3) / 12) + (ctx.nf - 0.5) * 0.25 + seaF(x, y) * 0.5 * Math.min(1, (dist - 3) / 15);
            col = MA.mix([62, 104, 98], [22, 46, 54], Math.max(0, Math.min(1, depth)));
            if (depth > 1) col = MA.mix([22, 46, 54], [16, 34, 44], Math.min(1, depth - 1));
            var shw = 1 - seaF(x, y);   // seit v0.19.9: flaches Wasser (w) heller und klarer als das Meer
            if (shw > 0.02) col = MA.mix(col, MA.mix([92, 146, 138], [74, 124, 120], Math.min(1, (dist - 3) / 14)), shw * 0.7);
            if (ctx.n1 > 0.97) col = MA.mix(col, [90, 120, 90], 0.4);
          }
          if (sk > 0 && dist >= 2) {
            // Sumpf (seit v0.12): seichtes, grünliches Wasser, heller als das Meer, mit Entengrütze und Algen
            var sc = MA.mix([112, 148, 122], [92, 128, 106], Math.min(1, ctx.nf * 1.2));   // helles, grünliches Flachwasser
            var duck = fbm(x / 6, y / 6, seed + 301, 3);
            if (duck > 0.6) sc = MA.mix(sc, [120, 152, 64], Math.min(1, (duck - 0.6) * 7));   // Entengrütze in Flecken
            if (duck > 0.64 && ctx.n1 > 0.82) sc = [150, 178, 82];
            else if (duck < 0.6 && ctx.n1 > 0.985) sc = [176, 200, 180];                       // Lichtreflex
            else if (duck < 0.6 && ctx.n1 < 0.03) sc = [70, 104, 86];
            if ((y % 3 === 0) && duck < 0.55 && fbm(x / 3, y, seed + 309, 2) > 0.62) sc = MA.mix(sc, [140, 172, 150], 0.5);   // leichte Wellen
            if (fbm(x / 10, y / 10, seed + 307, 2) < 0.3) sc = MA.mix(sc, [88, 118, 104], 0.35);   // etwas tiefere Stellen
            col = MA.mix(col, sc, sk);
          }
        } else {
          var mat = matAt(x, y, landCh);
          col = (MAT[mat] || MAT.s)(x, y, ctx);
          // Moos als eigene Ebene
          var mf = mossF(x, y);
          if (mf > 0.03 && mat !== "a" && mat !== "g" && mat !== "k" && mat !== "q" && mat !== "z" && mat !== "r" && mat !== "l") {
            var mv = mf + (ctx.joint ? 0.28 : 0) + (fbm(x / 6, y / 6, seed + 31, 3) - 0.5) * 0.9;
            if (mv > 0.62) {
              var mc = MA.mix([58, 84, 40], [112, 136, 62], fbm(x / 3, y / 3, seed + 33, 2));
              if (ctx.n1 > 0.9) mc = [146, 160, 82];
              if (mv < 0.7) mc = MA.mix(mc, col, 0.45);
              md[i] = mc[0]; md[i + 1] = mc[1]; md[i + 2] = mc[2]; md[i + 3] = 255;
            }
          }
          // Trampelpfad über dem Boden (und über dem Moos)
          if (PS.length) {
            var pv = pathAt(x, y);
            if (pv > 0) {
              var pe = pv + (fbm(x / 3, y / 3, seed + 535, 2) - 0.5) * 0.55;
              if (pe > 0.42) { col = pathCol(x, y, seed, pe); md[i + 3] = 0; }
              else if (pe > 0.3 && hash(x, y, seed + 537) > 0.45) { col = MA.mix(col, pathCol(x, y, seed, pe), 0.6); if (md[i + 3] && hash(x, y, seed + 539) > 0.5) md[i + 3] = 0; }
            }
          }
          // Verschattung an Mauern
          var ao = 1;
          if (tl(tx, ty - 1) === "#" && ly < 4) ao *= 0.62 + ly * 0.09;
          if (tl(tx - 1, ty) === "#" && lx < 3) ao *= 0.78 + lx * 0.07;
          if (tl(tx + 1, ty) === "#" && lx > T - 4) ao *= 0.78 + (T - 1 - lx) * 0.07;
          if (ao < 1) col = [col[0] * ao, col[1] * ao, col[2] * ao];
        }
        d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
      }
    }
    cv.ctx.putImageData(img, 0, 0); mcv.ctx.putImageData(mimg, 0, 0);
    return { base: cv, moss: mcv, wmask: wmask, x0: px0, y0: py0, w: cw, h: chh, cx: cx, cy: cy };
  }

  // Wasser: wandernde Lichtlinien und Glitzern – nur sichtbare Chunks, nur bei Spielansicht (Zoom 1)
  var wcv = null;
  function drawWater(ctx, chunks, t, cam) {
    var VW = MA.W, VH = MA.H;
    if (!wcv) wcv = MA.canvas(VW, VH);
    var img = wcv.imgData || (wcv.imgData = wcv.ctx.createImageData(VW, VH)), d = img.data;
    d.fill(0);
    chunks.forEach(function (c) {
      var sx0 = Math.max(0, c.x0 - cam.x), sy0 = Math.max(0, c.y0 - cam.y), sx1 = Math.min(VW, c.x0 + c.w - cam.x), sy1 = Math.min(VH, c.y0 + c.h - cam.y), mk = c.wmask;
      for (var sy = sy0; sy < sy1; sy++) {
        var y = sy + cam.y, ly = y % T; if (ly < 2 || ly > T - 2) continue;
        for (var sx = sx0; sx < sx1; sx++) {
          var x = sx + cam.x; if (!mk[(y - c.y0) * c.w + (x - c.x0)]) continue;
          var lx = x % T; if (lx < 1 || lx > T - 2) continue;   // Raster wie Shizuku
          var a = Math.sin(x * 0.42 + t * 1.3 + Math.sin(y * 0.55 + t * 0.9) * 1.6) * Math.sin(y * 0.7 - t * 1.05 + x * 0.12), i = (sy * VW + sx) * 4;
          if (a > 0.8) { d[i] = 150; d[i + 1] = 196; d[i + 2] = 190; d[i + 3] = 120; }
          else if (a > 0.66) { d[i] = 110; d[i + 1] = 156; d[i + 2] = 150; d[i + 3] = 70; }
          if (MA.hash2(x, y, Math.floor(t * 3)) > 0.9975) { d[i] = 235; d[i + 1] = 245; d[i + 2] = 240; d[i + 3] = 220; }
        }
      }
    });
    wcv.ctx.putImageData(img, 0, 0);
    ctx.drawImage(wcv, cam.x, cam.y);   // ctx ist um die Kamera verschoben
  }

  // Meer außerhalb der Map bzw. unter noch nicht gebauten Chunks (Bild-Koordinaten)
  var SEA = "rgb(19,40,49)";
  function drawSea(ctx) { ctx.fillStyle = SEA; ctx.fillRect(0, 0, MA.W, MA.H); }

  MA.ground = { buildChunk: buildChunk, CS: CS, drawWater: drawWater, drawSea: drawSea, isWater: isWater };
})();
