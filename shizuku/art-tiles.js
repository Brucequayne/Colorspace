/* Shizuku – art-tiles.js
   Zeichnet den kompletten Boden einer Arena Pixel für Pixel.
   Die Arena ist eine schwebende Insel: Abgrund-Kacheln (v) bleiben durchsichtig, darunter liegen
   Wolken in der Tiefe. Unter der Südkante hängt eine Felsklippe mit Wurzeln.
   Wasser am Inselrand stürzt als endloser Wasserfall in die Tiefe.
   Bodenarten gehen organisch ineinander über (Kachelfelder + Rauschen), nur Wasser, Mauer
   und Abgrund sind kachelgenau.
   Ergebnis: base (Boden ohne Moos), moss (eigene Ebene, kann wachsen), Wasserfall-Ströme. */
(function () {
  var SZ = window.SZ, C = SZ.COLS, R = SZ.ROWS, T = SZ.TILE, W = SZ.W, H = SZ.H;
  var hash = SZ.hash2, fbm = SZ.fbm, noise = SZ.noise2;
  var EXACT = { w: 1, v: 1, "#": 1 };

  // Plattenmuster (Standard-Steinboden): Rechtecke aus 8-px-Zellen
  function slabs(seed) {
    var gw = W / 8, gh = H / 8, id = new Int32Array(gw * gh).fill(-1), info = [], rnd = SZ.rng(seed * 31 + 5);
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
  function crackSet(sl) {
    var set = {};
    sl.info.forEach(function (s) {
      if (!s.crack) return;
      var r = SZ.rng(s.crack), x = s.x + 2 + r() * (s.w - 4), y = s.y + 2 + r() * (s.h - 4), dx = r() < 0.5 ? 1 : -1, n = 4 + r() * (s.w + s.h) * 0.4;
      for (var i = 0; i < n; i++) {
        set[(y | 0) * W + (x | 0)] = 1;
        if (r() < 0.6) x += dx; else y += r() < 0.5 ? 1 : -1;
        if (r() < 0.12) set[((y + 1) | 0) * W + (x | 0)] = 1;
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
  // Feld 0..1 je Kachel, weich zwischen Kachelmitten interpoliert
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

  // ---------- Bodenarten als Pixelfarbe ----------
  var MAT = {};
  MAT.s = function (x, y, c) {   // Steinplatten
    var s = c.sl.info[c.sl.id[((y / 8) | 0) * c.sl.gw + ((x / 8) | 0)]], sx = x - s.x, sy = y - s.y;
    var base = SZ.mix([124, 118, 108], [104, 104, 104], s.warm), tone = s.tone + (c.nf - 0.5) * 18 + (c.n1 - 0.5) * 8;
    var col = [base[0] + tone, base[1] + tone, base[2] + tone];
    if (sx === 0 || sy === 0) col = [64, 60, 56];
    else if (sy === 1) col = [col[0] + 14, col[1] + 14, col[2] + 12];
    else if (sx === 1) col = [col[0] + 7, col[1] + 7, col[2] + 6];
    else if (sy === s.h - 1) col = [col[0] - 12, col[1] - 12, col[2] - 11];
    else if (sx === s.w - 1) col = [col[0] - 7, col[1] - 7, col[2] - 6];
    if (c.cracks[y * W + x]) col = [70, 66, 61];
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
    var en = fbm(x / 4, y / 4, c.seed + 23, 2), col = SZ.mix([98, 74, 52], [72, 54, 40], en);
    if (c.n1 > 0.93) col = [132, 124, 112]; else if (c.n1 < 0.04) col = [52, 38, 30];
    return col;
  };
  MAT.a = function (x, y, c) {   // Geharkter Sand, Ringe um Felsen
    var best = 1e9;
    c.rocks.forEach(function (r) { var dd = Math.sqrt((x - r.x) * (x - r.x) + (y - r.y + 3) * (y - r.y + 3) * 1.6); if (dd < best) best = dd; });
    var wave = best < 26 ? Math.sin(best * 1.25) : Math.sin((y + Math.sin(x * 0.07 + c.seed) * 1.6) * 1.25);
    var col = wave > 0.35 ? [214, 205, 182] : wave < -0.55 ? [170, 160, 140] : [196, 187, 164];
    return [col[0] + (c.n1 - 0.5) * 10, col[1] + (c.n1 - 0.5) * 10, col[2] + (c.n1 - 0.5) * 8];
  };

  function build(arena) {
    var seed = arena.seed | 0;
    var cv = SZ.canvas(W, H), img = cv.ctx.createImageData(W, H), d = img.data;
    var ctx = { seed: seed, sl: slabs(seed), rocks: arena.obj.filter(function (o) { return o.t === "rock"; }) };
    ctx.cracks = crackSet(ctx.sl);
    var mossF = field(arena, "m");
    var mossPix = [], mossCol = [], mossN = [];
    function tl(tx, ty) { return arena.tile(tx, ty); }
    function isVoid(tx, ty) { return tl(tx, ty) === "v"; }
    function surf(ch) { return !(ch in EXACT); }
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

    for (var y = 0; y < H; y++) {
      var ty = (y / T) | 0, ly = y - ty * T;
      for (var x = 0; x < W; x++) {
        var tx = (x / T) | 0, lx = x - tx * T, ch = arena.tiles[ty * C + tx], i = (y * W + x) * 4, col = null, a = 255;
        ctx.n1 = hash(x, y, seed); ctx.nf = fbm(x / 7, y / 7, seed, 2); ctx.joint = false;

        if (ch === "v") { d[i + 3] = 0; continue; }       // Abgrund bleibt durchsichtig (Klippen später)
        if (ch === "#") {
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
            if (fbm(x / 6, y / 6, seed + 11, 3) > 0.7) col = SZ.mix(col, [74, 96, 52], 0.55);
          }
        } else if (ch === "w") {
          // Wasser: Uferkante nur zu festem Boden, zum Abgrund hin fließt es über
          var dist = 99;
          function nw(ax, ay) { var c2 = tl(ax, ay); return c2 !== "w" && c2 !== "v"; }
          if (nw(tx - 1, ty)) dist = Math.min(dist, lx);
          if (nw(tx + 1, ty)) dist = Math.min(dist, T - 1 - lx);
          if (nw(tx, ty - 1)) dist = Math.min(dist, ly);
          if (nw(tx, ty + 1)) dist = Math.min(dist, T - 1 - ly);
          if (nw(tx - 1, ty - 1)) dist = Math.min(dist, Math.max(lx, ly));
          if (nw(tx + 1, ty - 1)) dist = Math.min(dist, Math.max(T - 1 - lx, ly));
          if (nw(tx - 1, ty + 1)) dist = Math.min(dist, Math.max(lx, T - 1 - ly));
          if (nw(tx + 1, ty + 1)) dist = Math.min(dist, Math.max(T - 1 - lx, T - 1 - ly));
          if (dist < 2) col = dist < 1 ? [138, 132, 120] : [96, 92, 84];
          else if (dist < 3) col = [40, 62, 60];
          else {
            var depth = Math.min(1, (dist - 3) / 12) + (ctx.nf - 0.5) * 0.25;
            col = SZ.mix([62, 104, 98], [22, 46, 54], Math.max(0, Math.min(1, depth)));
            if (ctx.n1 > 0.97) col = SZ.mix(col, [90, 120, 90], 0.4);
          }
          // Kante zum Abgrund: hellere Strömung
          var toVoid = (isVoid(tx, ty + 1) && ly > 12) || (isVoid(tx - 1, ty) && lx < 3) || (isVoid(tx + 1, ty) && lx > 12);
          if (toVoid && hash(x, y, seed + 9) > 0.45) col = [120, 168, 170];
        } else {
          var mat = matAt(x, y, ch);
          col = (MAT[mat] || MAT.s)(x, y, ctx);
          // Moos als eigene Ebene
          var mf = mossF(x, y);
          if (mf > 0.03 && mat !== "a" && mat !== "g") {
            var mv = mf + (ctx.joint ? 0.28 : 0) + (fbm(x / 6, y / 6, seed + 31, 3) - 0.5) * 0.9;
            if (mv > 0.62) {
              var mc = SZ.mix([58, 84, 40], [112, 136, 62], fbm(x / 3, y / 3, seed + 33, 2));
              if (ctx.n1 > 0.9) mc = [146, 160, 82];
              if (mv < 0.7) mc = SZ.mix(mc, col, 0.45);
              mossPix.push(y * W + x); mossCol.push(mc); mossN.push(noise(x / 9, y / 9, seed + 41));
            }
          }
        }
        if (ch !== "#") {
          // Verschattung an Mauern
          var ao = 1;
          if (tl(tx, ty - 1) === "#" && ly < 4) ao *= 0.62 + ly * 0.09;
          if (tl(tx - 1, ty) === "#" && lx < 3) ao *= 0.78 + lx * 0.07;
          if (tl(tx + 1, ty) === "#" && lx > T - 4) ao *= 0.78 + (T - 1 - lx) * 0.07;
          // Inselkante: unregelmäßig abgebrochen, dunkler Rand
          if (ch !== "w") {
            var ev = 99;
            if (isVoid(tx, ty - 1)) ev = Math.min(ev, ly);
            if (isVoid(tx - 1, ty)) ev = Math.min(ev, lx);
            if (isVoid(tx + 1, ty)) ev = Math.min(ev, T - 1 - lx);
            if (isVoid(tx - 1, ty - 1)) ev = Math.min(ev, Math.max(lx, ly));
            if (isVoid(tx + 1, ty - 1)) ev = Math.min(ev, Math.max(T - 1 - lx, ly));
            var es = isVoid(tx, ty + 1) ? T - 1 - ly : 99;
            if (isVoid(tx - 1, ty + 1)) es = Math.min(es, Math.max(lx, T - 1 - ly));
            if (isVoid(tx + 1, ty + 1)) es = Math.min(es, Math.max(T - 1 - lx, T - 1 - ly));
            // Kante bleibt geschlossen (keine Löcher zum Himmel), nur ein dunkler Rand
            if (ev < 1) ao *= 0.62; else if (ev < 2) ao *= 0.8;
            if (es < 1) col = [col[0] * 1.15, col[1] * 1.12, col[2] * 1.08];
          }
          if (ao < 1) col = [col[0] * ao, col[1] * ao, col[2] * ao];
        }
        d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = a;
      }
    }

    // ---------- Seitenkanten: schmale Felskante im Abgrund neben der Insel ----------
    for (var sy2 = 0; sy2 < H; sy2++) {
      var sty = (sy2 / T) | 0;
      for (var sx2 = 0; sx2 < W; sx2++) {
        var stx = (sx2 / T) | 0; if (tl(stx, sty) !== "v") continue;
        var slx = sx2 - stx * T, j0 = (sy2 * W + sx2) * 4, sc = null;
        var leftI = tl(stx - 1, sty) !== "v" && tl(stx - 1, sty) !== "w", rightI = tl(stx + 1, sty) !== "v" && tl(stx + 1, sty) !== "w";
        if (leftI && slx < 2) sc = slx === 0 ? [72, 64, 58] : [40, 34, 32];
        if (rightI && slx > T - 3) sc = slx === T - 1 ? [86, 78, 70] : [40, 34, 32];
        if (sc) { var sn = (hash(sx2, sy2, seed + 57) - 0.5) * 14; d[j0] = sc[0] + sn; d[j0 + 1] = sc[1] + sn; d[j0 + 2] = sc[2] + sn; d[j0 + 3] = 255; }
      }
    }

    // ---------- Klippen unter der Südkante ----------
    var falls = [];
    for (var cx = 0; cx < W; cx++) {
      var ctx2 = (cx / T) | 0;
      for (var r = 0; r < R; r++) {
        var top = tl(ctx2, r);
        if (top === "v" || tl(ctx2, r + 1) !== "v") continue;
        var y0 = (r + 1) * T;
        // Abstand zur seitlichen Inselkante (für abgerundete Unterseite)
        // Abstand zum Ende der Kante; geht die Insel dort eine Reihe tiefer weiter, wird nicht abgerundet (sonst Spalt)
        var dl = 0, dr = 0;
        while (dl < 40 && cx - dl - 1 >= 0 && tl(Math.floor((cx - dl - 1) / T), r) !== "v" && tl(Math.floor((cx - dl - 1) / T), r + 1) === "v") dl++;
        while (dr < 40 && cx + dr + 1 < W && tl(Math.floor((cx + dr + 1) / T), r) !== "v" && tl(Math.floor((cx + dr + 1) / T), r + 1) === "v") dr++;
        var endL = cx - dl - 1 < 0 || tl(Math.floor((cx - dl - 1) / T), r) === "v", endR = cx + dr + 1 >= W || tl(Math.floor((cx + dr + 1) / T), r) === "v";
        if (!endL) dl = 40; if (!endR) dr = 40;
        var edge = Math.min(dl, dr), taper = Math.sqrt(Math.min(1, (edge + 1) / 12));
        var depthPx = Math.round((16 + noise(cx / 5, r, seed + 61) * 12 + hash(cx, r, seed + 63) * 3) * taper) + 2;
        var isW = top === "w";
        for (var k = 0; k < depthPx; k++) {
          var yy = y0 + k; if (yy >= H) break;
          if (tl(ctx2, (yy / T) | 0) !== "v") break;
          var j = (yy * W + cx) * 4;
          if (isW) continue;   // unter Wasser: der Wasserfall ist sichtbar
          var c;
          if (k < 2) c = [84, 62, 44];
          else if (k < 4) c = hash(cx, yy, seed + 65) < 0.5 ? [66, 48, 36] : [58, 42, 32];
          else {
            var band = Math.floor((k + noise(cx / 9, 0, seed + 67) * 4) / 4) % 3, rt = (fbm(cx / 4, yy / 2, seed + 69, 2) - 0.5) * 22;
            var bc = [[98, 90, 82], [80, 74, 68], [66, 60, 56]][band];
            var shade = 1 - k / (depthPx + 6) * 0.55;
            c = [(bc[0] + rt) * shade, (bc[1] + rt) * shade, (bc[2] + rt) * shade];
            if (edge < 2) c = [c[0] * 1.2, c[1] * 1.2, c[2] * 1.2];
            if (hash(cx, 0, seed + 71) > 0.93 && k < depthPx - 2) c = [40, 30, 24];   // Riss
          }
          if (k === depthPx - 1) c = [28, 24, 22];
          d[j] = c[0]; d[j + 1] = c[1]; d[j + 2] = c[2]; d[j + 3] = 255;
        }
        // Hängende Wurzeln
        if (!isW && hash(cx, r, seed + 73) > 0.9) {
          var len = 4 + hash(cx, r, seed + 75) * 10, wx = cx;
          for (var q = 0; q < len; q++) {
            var yy2 = y0 + depthPx - 2 + q; if (yy2 >= H) break;
            if (q > 0 && hash(cx, q, seed + 77) > 0.7) wx += hash(cx, q, seed + 79) > 0.5 ? 1 : -1;
            if (wx < 0 || wx >= W) break;
            var j2 = (yy2 * W + wx) * 4; d[j2] = q < len * 0.5 ? 62 : 48; d[j2 + 1] = q < len * 0.5 ? 48 : 52; d[j2 + 2] = 34; d[j2 + 3] = 255;
          }
        }
      }
    }
    cv.ctx.putImageData(img, 0, 0);

    // Moos-Ebene
    var mcv = SZ.canvas(W, H), mimg = mcv.ctx.createImageData(W, H);
    for (var mk = 0; mk < mossPix.length; mk++) {
      var p = mossPix[mk] * 4; if (d[p + 3] === 0) continue;
      var mcol = mossCol[mk]; mimg.data[p] = mcol[0]; mimg.data[p + 1] = mcol[1]; mimg.data[p + 2] = mcol[2]; mimg.data[p + 3] = 255;
    }
    mcv.ctx.putImageData(mimg, 0, 0);

    // Wasserkacheln und Wasserfall-Ströme
    var water = [];
    for (var wy = 0; wy < R; wy++) for (var wx2 = 0; wx2 < C; wx2++) if (arena.tiles[wy * C + wx2] === "w") {
      water.push(wx2, wy);
      if (isVoid(wx2, wy + 1)) falls.push({ x0: wx2 * T, x1: wx2 * T + T, y0: (wy + 1) * T - 1, front: true });
      if (isVoid(wx2 - 1, wy)) falls.push({ x0: wx2 * T - 6, x1: wx2 * T, y0: wy * T + 3, side: -1 });
      if (isVoid(wx2 + 1, wy)) falls.push({ x0: wx2 * T + T, x1: wx2 * T + T + 6, y0: wy * T + 3, side: 1 });
      if (isVoid(wx2, wy - 1)) falls.push({ x0: wx2 * T, x1: wx2 * T + T, y0: wy * T, back: true });
    }
    return { base: cv, moss: mcv, mossPix: mossPix, mossCol: mossCol, mossN: mossN, water: water, falls: falls, rev: arena.rev, wcv: SZ.canvas(W, H) };
  }

  // Wasser: wandernde Lichtlinien und Glitzern
  function drawWater(ctx, g, t) {
    if (!g.water.length) return;
    var wc = g.wcv, img = wc.imgData || (wc.imgData = wc.ctx.createImageData(W, H)), d = img.data;
    d.fill(0);
    for (var k = 0; k < g.water.length; k += 2) {
      var tx = g.water[k], ty = g.water[k + 1];
      for (var ly = 2; ly < T - 1; ly++) for (var lx = 1; lx < T - 1; lx++) {
        var x = tx * T + lx, y = ty * T + ly, i = (y * W + x) * 4;
        var a = Math.sin(x * 0.42 + t * 1.3 + Math.sin(y * 0.55 + t * 0.9) * 1.6) * Math.sin(y * 0.7 - t * 1.05 + x * 0.12);
        if (a > 0.8) { d[i] = 150; d[i + 1] = 196; d[i + 2] = 190; d[i + 3] = 120; }
        else if (a > 0.66) { d[i] = 110; d[i + 1] = 156; d[i + 2] = 150; d[i + 3] = 70; }
        if (SZ.hash2(x, y, Math.floor(t * 3)) > 0.9975) { d[i] = 235; d[i + 1] = 245; d[i + 2] = 240; d[i + 3] = 220; }
      }
    }
    wc.ctx.putImageData(img, 0, 0);
    ctx.drawImage(wc, 0, 0);
  }

  // ---------- Tiefe unter der Insel: Wolken ----------
  var abyss = null;
  function cloudLayer(seed, scale, thr, cols) {
    var w = W * 2, c = SZ.canvas(w, H), img = c.ctx.createImageData(w, H), d = img.data;
    for (var y = 0; y < H; y++) for (var x = 0; x < w; x++) {
      var n1 = fbm(x / scale, y / (scale * 0.6), seed, 4), n2 = fbm((x - w) / scale, y / (scale * 0.6), seed, 4), t = x / w;
      var n = n1 * (1 - t) + n2 * t;
      var i = (y * w + x) * 4, dith = (hash(x, y, seed) - 0.5) * 0.04;
      var v = n + dith;
      if (v > thr) {
        var cc = v > thr + 0.16 ? cols[2] : v > thr + 0.07 ? cols[1] : cols[0];
        d[i] = cc[0]; d[i + 1] = cc[1]; d[i + 2] = cc[2]; d[i + 3] = cc[3];
      }
    }
    c.ctx.putImageData(img, 0, 0);
    return c;
  }
  function drawAbyss(ctx, t) {
    if (!abyss) {
      var bg = SZ.canvas(W, H), g = bg.ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, "#3C4A5C"); g.addColorStop(0.5, "#2E3A4C"); g.addColorStop(1, "#1E2636");
      bg.ctx.fillStyle = g; bg.ctx.fillRect(0, 0, W, H);
      abyss = {
        bg: bg,
        far: cloudLayer(311, 60, 0.52, [[92, 106, 124, 120], [116, 130, 148, 150], [140, 154, 170, 170]]),
        near: cloudLayer(733, 38, 0.56, [[150, 160, 176, 150], [182, 190, 204, 190], [214, 220, 230, 215]])
      };
    }
    ctx.drawImage(abyss.bg, 0, 0);
    var o1 = (t * 2.2) % (W * 2), o2 = (t * 5) % (W * 2);
    ctx.drawImage(abyss.far, -o1, 0); ctx.drawImage(abyss.far, W * 2 - o1, 0);
    ctx.drawImage(abyss.near, -o2, 6); ctx.drawImage(abyss.near, W * 2 - o2, 6);
  }

  // ---------- Wasserfälle ----------
  var fallTex = null;
  function makeFallTex() {
    var c = SZ.canvas(16, 48), img = c.ctx.createImageData(16, 48), d = img.data;
    for (var x = 0; x < 16; x++) {
      var ph = hash(x, 0, 5) * 48, len = 6 + hash(x, 1, 5) * 18, br = hash(x, 2, 5);
      for (var y = 0; y < 48; y++) {
        var i = (y * 16 + x) * 4, p = ((y - ph) % 48 + 48) % 48;
        var c0 = [74, 128, 138];
        if (p < len) c0 = br > 0.6 ? [200, 232, 236] : [140, 190, 198];
        else if (p < len + 3) c0 = [104, 158, 166];
        d[i] = c0[0]; d[i + 1] = c0[1]; d[i + 2] = c0[2]; d[i + 3] = 235;
      }
    }
    c.ctx.putImageData(img, 0, 0);
    return c;
  }
  function drawFalls(ctx, g, t) {
    if (!g.falls.length) return;
    if (!fallTex) fallTex = makeFallTex();
    var pat = ctx.createPattern(fallTex, "repeat"), off = (t * 95) % 48;
    g.falls.forEach(function (f) {
      if (f.back) return;
      var w = f.x1 - f.x0, y0 = f.y0;
      ctx.save();
      ctx.beginPath(); ctx.rect(f.x0, y0, w, H - y0); ctx.clip();
      ctx.translate(f.x0, off); ctx.fillStyle = pat; ctx.fillRect(0, y0 - off - 48, w, H - y0 + 96);
      ctx.restore();
      ctx.fillStyle = "rgba(30,60,70,0.45)"; ctx.fillRect(f.x0, y0, 1, H - y0); ctx.fillRect(f.x1 - 1, y0, 1, H - y0);
      // Schaum an der Kante
      for (var x = f.x0; x < f.x1; x++) if (SZ.hash2(x, Math.floor(t * 8), 3) > 0.35) { ctx.fillStyle = "rgba(235,248,250,0.85)"; ctx.fillRect(x, y0 + (SZ.hash2(x, Math.floor(t * 6), 4) * 3 | 0), 1, 1); }
      // Nebel nach unten
      var gr = ctx.createLinearGradient(0, H - 70, 0, H);
      gr.addColorStop(0, "rgba(46,58,76,0)"); gr.addColorStop(1, "rgba(46,58,76,0.75)");
      ctx.fillStyle = gr; ctx.fillRect(f.x0, Math.max(y0, H - 70), w, H);
    });
  }

  SZ.ground = { build: build, drawWater: drawWater, drawAbyss: drawAbyss, drawFalls: drawFalls };
})();
