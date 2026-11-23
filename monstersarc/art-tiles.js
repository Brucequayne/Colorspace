/* Monsters Arc – art-tiles.js  (aus Shizuku übernommen)
   Änderungen für Monsters Arc: Map-Größe frei (Maße kommen bei jedem Bauen aus der Map), keine schwebende Insel
   mehr – statt Abgrund gibt es Meer („o“, tiefes Wasser, nicht begehbar), auch außerhalb der Map.
   Das Wasser-Glitzern wird nur für den sichtbaren Ausschnitt berechnet.
   ---- ursprüngliche Beschreibung (Shizuku) ----
   Zeichnet den kompletten Boden einer Arena Pixel für Pixel.
   Die Arena ist eine schwebende Insel: Abgrund-Kacheln (v) bleiben durchsichtig, darunter liegen
   Wolken in der Tiefe. Unter der Südkante hängt eine Felsklippe mit Wurzeln.
   Wasser am Inselrand stürzt als endloser Wasserfall in die Tiefe.
   Bodenarten gehen organisch ineinander über (Kachelfelder + Rauschen), nur Wasser, Mauer
   und Abgrund sind kachelgenau.
   Ergebnis: base (Boden ohne Moos), moss (eigene Ebene, kann wachsen), Wasserfall-Ströme. */
(function () {
  var MA = window.MA, T = MA.TILE, C = 1, R = 1, W = T, H = T;   // C/R/W/H werden bei jedem build() aus der Map gesetzt
  var hash = MA.hash2, fbm = MA.fbm, noise = MA.noise2;
  var EXACT = { w: 1, o: 1, v: 1, "#": 1 };
  function isWater(c) { return c === "w" || c === "o"; }

  // Plattenmuster (Standard-Steinboden): Rechtecke aus 8-px-Zellen
  function slabs(seed) {
    var gw = W / 8, gh = H / 8, id = new Int32Array(gw * gh).fill(-1), info = [], rnd = MA.rng(seed * 31 + 5);
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
      var r = MA.rng(s.crack), x = s.x + 2 + r() * (s.w - 4), y = s.y + 2 + r() * (s.h - 4), dx = r() < 0.5 ? 1 : -1, n = 4 + r() * (s.w + s.h) * 0.4;
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

  function fieldP(arena, pred) {
    var f = new Float32Array(C * R);
    for (var i = 0; i < C * R; i++) f[i] = pred(arena.tiles[i]) ? 1 : 0;
    return function (x, y) {
      var fx = x / T - 0.5, fy = y / T - 0.5, x0 = Math.floor(fx), y0 = Math.floor(fy), u = fx - x0, v = fy - y0;
      function g(a, b) { if (a < 0 || b < 0 || a >= C || b >= R) return 0; return f[b * C + a]; }
      u = u * u * (3 - 2 * u); v = v * v * (3 - 2 * v);
      return (g(x0, y0) * (1 - u) + g(x0 + 1, y0) * u) * (1 - v) + (g(x0, y0 + 1) * (1 - u) + g(x0 + 1, y0 + 1) * u) * v;
    };
  }

  // ---------- Bodenarten als Pixelfarbe ----------
  var MAT = {};
  MAT.s = function (x, y, c) {   // Steinplatten
    var s = c.sl.info[c.sl.id[((y / 8) | 0) * c.sl.gw + ((x / 8) | 0)]], sx = x - s.x, sy = y - s.y;
    var base = MA.mix([124, 118, 108], [104, 104, 104], s.warm), tone = s.tone + (c.nf - 0.5) * 18 + (c.n1 - 0.5) * 8;
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
    var en = fbm(x / 4, y / 4, c.seed + 23, 2), col = MA.mix([98, 74, 52], [72, 54, 40], en);
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

  // rect (optional, in Kacheln {x0,y0,x1,y1}) zeichnet nur diesen Bereich neu und übernimmt den Rest aus prev
  function build(arena, prev, rect) {
    C = arena.cols; R = arena.rows; W = C * T; H = R * T;
    var part = !!(prev && rect && prev.img && prev.W === W && prev.H === H);
    var px0 = 0, py0 = 0, px1 = W, py1 = H;
    if (part) { px0 = Math.max(0, rect.x0 * T); py0 = Math.max(0, rect.y0 * T); px1 = Math.min(W, rect.x1 * T); py1 = Math.min(H, rect.y1 * T); }
    var seed = arena.seed | 0;
    var cv = part ? prev.base : MA.canvas(W, H), img = part ? prev.img : cv.ctx.createImageData(W, H), d = img.data;
    var wmask = part ? prev.wmask : new Uint8Array(W * H);   // 1 = Wasser-Pixel (für das Glitzern)
    var ctx = { seed: seed, sl: part ? prev.sl : slabs(seed), rocks: arena.obj.filter(function (o) { return o.t === "rock"; }) };
    ctx.cracks = part ? prev.cracks : crackSet(ctx.sl);
    var mossF = field(arena, "m");
    // Organische Küste (Monsters Arc): Land/Wasser-Grenze folgt einem weichen Feld mit Rauschen statt der Kachelkante.
    // Begehbarkeit bleibt kachelgenau; nur das Bild ist um bis zu ~eine halbe Kachel verschoben.
    var landF = fieldP(arena, function (c) { return !isWater(c); }), seaF = field(arena, "o");
    var coast = new Uint8Array(C * R), coastLand = [];
    for (var cty = 0; cty < R; cty++) for (var ctx0 = 0; ctx0 < C; ctx0++) {
      var cw = isWater(arena.tiles[cty * C + ctx0]), cl = null, cf = 0;
      for (var oy = -1; oy <= 1; oy++) for (var ox = -1; ox <= 1; ox++) {
        var nc = tl(ctx0 + ox, cty + oy);
        if (isWater(nc) !== cw) cf = 1;
        if (!isWater(nc) && nc !== "#" && (!cl || (ox === 0 || oy === 0))) cl = nc;
      }
      coast[cty * C + ctx0] = cf; coastLand[cty * C + ctx0] = cl || "a";
    }
    var mossPix = [], mossCol = [], mossN = [];
    if (part) for (var q0 = 0; q0 < prev.mossPix.length; q0++) {
      var qp = prev.mossPix[q0], qx = qp % W, qy = (qp / W) | 0;
      if (qx >= px0 && qx < px1 && qy >= py0 && qy < py1) continue;
      mossPix.push(qp); mossCol.push(prev.mossCol[q0]); mossN.push(prev.mossN[q0]);
    }
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

    for (var y = py0; y < py1; y++) {
      var ty = (y / T) | 0, ly = y - ty * T;
      for (var x = px0; x < px1; x++) {
        var tx = (x / T) | 0, lx = x - tx * T, ch = arena.tiles[ty * C + tx], i = (y * W + x) * 4, col = null, a = 255;
        ctx.n1 = hash(x, y, seed); ctx.nf = fbm(x / 7, y / 7, seed, 2); ctx.joint = false;

        if (ch === "v") { d[i + 3] = 0; continue; }       // Abgrund bleibt durchsichtig (Klippen später)
        var waterHere = isWater(ch), sd = null;
        if (ch !== "#" && coast[ty * C + tx]) { var vv = landF(x, y) + (fbm(x / 6, y / 6, seed + 201, 2) - 0.5) * 0.6; sd = (0.5 - vv) * 30; waterHere = vv < 0.5; }
        var landCh = isWater(ch) ? coastLand[ty * C + tx] : ch;
        wmask[y * W + x] = waterHere && ch !== "#" ? 1 : 0;
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
            if (fbm(x / 6, y / 6, seed + 11, 3) > 0.7) col = MA.mix(col, [74, 96, 52], 0.55);
          }
        } else if (waterHere) {
          // Wasser: Uferkante (organisch, s. o.), dann flach → tief. Meer (o) wird weiter draußen noch dunkler.
          var dist = sd != null ? Math.max(0, sd) : 99;
          if (dist < 2) col = dist < 1 ? [138, 132, 120] : [96, 92, 84];
          else if (dist < 3) col = [40, 62, 60];
          else {
            var depth = Math.min(1, (dist - 3) / 12) + (ctx.nf - 0.5) * 0.25 + seaF(x, y) * 0.5 * Math.min(1, (dist - 3) / 15);
            col = MA.mix([62, 104, 98], [22, 46, 54], Math.max(0, Math.min(1, depth)));
            if (depth > 1) col = MA.mix([22, 46, 54], [16, 34, 44], Math.min(1, depth - 1));
            if (ctx.n1 > 0.97) col = MA.mix(col, [90, 120, 90], 0.4);
          }
        } else {
          var mat = matAt(x, y, landCh);
          col = (MAT[mat] || MAT.s)(x, y, ctx);
          // Moos als eigene Ebene
          var mf = mossF(x, y);
          if (mf > 0.03 && mat !== "a" && mat !== "g") {
            var mv = mf + (ctx.joint ? 0.28 : 0) + (fbm(x / 6, y / 6, seed + 31, 3) - 0.5) * 0.9;
            if (mv > 0.62) {
              var mc = MA.mix([58, 84, 40], [112, 136, 62], fbm(x / 3, y / 3, seed + 33, 2));
              if (ctx.n1 > 0.9) mc = [146, 160, 82];
              if (mv < 0.7) mc = MA.mix(mc, col, 0.45);
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

    // (Felskanten und Klippen der schwebenden Insel aus Shizuku entfallen: Monsters Arc hat Meer statt Abgrund)
    var falls = [];
    if (part) cv.ctx.putImageData(img, 0, 0, px0, py0, px1 - px0, py1 - py0); else cv.ctx.putImageData(img, 0, 0);

    // Moos-Ebene
    var mcv, mimg;
    if (part) { mcv = prev.moss; mimg = prev.mimg; for (var cy3 = py0; cy3 < py1; cy3++) mimg.data.fill(0, (cy3 * W + px0) * 4, (cy3 * W + px1) * 4); }
    else { mcv = MA.canvas(W, H); mimg = mcv.ctx.createImageData(W, H); }
    for (var mk = 0; mk < mossPix.length; mk++) {
      var p = mossPix[mk] * 4; if (d[p + 3] === 0) continue;
      if (part) { var mx2 = mossPix[mk] % W, my2 = (mossPix[mk] / W) | 0; if (mx2 < px0 || mx2 >= px1 || my2 < py0 || my2 >= py1) continue; }
      var mcol = mossCol[mk]; mimg.data[p] = mcol[0]; mimg.data[p + 1] = mcol[1]; mimg.data[p + 2] = mcol[2]; mimg.data[p + 3] = 255;
    }
    if (part) mcv.ctx.putImageData(mimg, 0, 0, px0, py0, px1 - px0, py1 - py0); else mcv.ctx.putImageData(mimg, 0, 0);

    // Wasserkacheln und Wasserfall-Ströme
    return { base: cv, img: img, moss: mcv, mimg: mimg, sl: ctx.sl, cracks: ctx.cracks, mossPix: mossPix, mossCol: mossCol, mossN: mossN, falls: falls, rev: arena.rev, W: W, H: H, wmask: wmask };
  }

  // Wasser: wandernde Lichtlinien und Glitzern – nur im sichtbaren Ausschnitt (cam = linke obere Ecke des Bilds in Weltpixeln)
  var wcv = null;
  function drawWater(ctx, g, t, cam) {
    var VW = MA.W, VH = MA.H, GW = g.W, GH = g.H, mk = g.wmask;
    if (!wcv) wcv = MA.canvas(VW, VH);
    var img = wcv.imgData || (wcv.imgData = wcv.ctx.createImageData(VW, VH)), d = img.data;
    d.fill(0);
    for (var sy = 0; sy < VH; sy++) {
      var y = sy + cam.y; if (y < 0 || y >= GH) continue;
      for (var sx = 0; sx < VW; sx++) {
        var x = sx + cam.x; if (x < 0 || x >= GW || !mk[y * GW + x]) continue;
        var lx = x % T, ly = y % T; if (ly < 2 || ly > T - 2 || lx < 1 || lx > T - 2) continue;   // Raster wie Shizuku
        var a = Math.sin(x * 0.42 + t * 1.3 + Math.sin(y * 0.55 + t * 0.9) * 1.6) * Math.sin(y * 0.7 - t * 1.05 + x * 0.12), i = (sy * VW + sx) * 4;
        if (a > 0.8) { d[i] = 150; d[i + 1] = 196; d[i + 2] = 190; d[i + 3] = 120; }
        else if (a > 0.66) { d[i] = 110; d[i + 1] = 156; d[i + 2] = 150; d[i + 3] = 70; }
        if (MA.hash2(x, y, Math.floor(t * 3)) > 0.9975) { d[i] = 235; d[i + 1] = 245; d[i + 2] = 240; d[i + 3] = 220; }
      }
    }
    wcv.ctx.putImageData(img, 0, 0);
    ctx.drawImage(wcv, cam.x, cam.y);   // ctx ist um die Kamera verschoben
  }

  // Meer außerhalb der Map (Bild-Koordinaten, vor der Kamera-Verschiebung)
  function drawSea(ctx) { ctx.fillStyle = "rgb(18,38,48)"; ctx.fillRect(0, 0, MA.W, MA.H); }

  MA.ground = { build: build, drawWater: drawWater, drawSea: drawSea, isWater: isWater };
})();
