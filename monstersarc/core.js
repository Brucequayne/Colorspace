/* Monsters Arc – core.js
   Namensraum MA, Bildgröße und Kachelmaß (übernommen aus Shizuku), Sprache (L2), Mathe-Helfer, Zufall mit Startwert und Rauschen.
   Anders als in Shizuku ist die Map größer als das Bild: W/H sind das sichtbare Bild (Kamera), die Map hat eigene Maße (map.js). */
(function () {
  var MA = window.MA = window.MA || {};
  MA.VERSION = "0.29";
  MA.NAME = "Monsters Arc";
  MA.scenes = {};   // menu, walk, devkit (je eigene Datei)

  // Interne Auflösung wie Shizuku: das Bild ist 480 × 272 Pixel und wird pixelgenau hochskaliert.
  // COLS/ROWS = sichtbare Kacheln; die Map selbst ist größer und hat eigene Maße (map.cols/map.rows).
  MA.TILE = 16;
  MA.COLS = 30;
  MA.ROWS = 17;
  MA.W = MA.COLS * MA.TILE;   // 480
  MA.H = MA.ROWS * MA.TILE;   // 272

  MA.lang = "de";
  // Zweisprachige Texte: L2("deutsch", "english")
  MA.L2 = function (de, en) { return MA.lang === "en" ? en : de; };

  // ---------- Mathe ----------
  var M = MA.m = {};
  M.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  M.lerp = function (a, b, t) { return a + (b - a) * t; };
  M.smooth = function (t) { t = M.clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  M.easeOutCubic = function (t) { t = M.clamp(t, 0, 1); return 1 - Math.pow(1 - t, 3); };
  M.easeInCubic = function (t) { t = M.clamp(t, 0, 1); return t * t * t; };
  M.easeOutBack = function (t) { t = M.clamp(t, 0, 1); var c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
  M.dist = function (ax, ay, bx, by) { var dx = bx - ax, dy = by - ay; return Math.sqrt(dx * dx + dy * dy); };
  M.angDiff = function (a, b) { var d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
  // 8 Richtungen: 0 Ost, 1 Südost, 2 Süd, 3 Südwest, 4 West, 5 Nordwest, 6 Nord, 7 Nordost (y zeigt nach unten)
  M.dir8 = function (ang) { var a = ang / (Math.PI / 4); return ((Math.round(a) % 8) + 8) % 8; };
  M.dirVec = function (d) { var a = d * Math.PI / 4; return { x: Math.cos(a), y: Math.sin(a) }; };

  // ---------- Zufall ----------
  MA.rng = function (seed) {
    var s = (seed >>> 0) || 1;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  // Fester Zufallswert je Gitterpunkt
  MA.hash2 = function (x, y, seed) {
    var h = (x * 374761393 + y * 668265263 + (seed | 0) * 982451653) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
  // Weiches Wertrauschen
  MA.noise2 = function (x, y, seed) {
    var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    var a = MA.hash2(xi, yi, seed), b = MA.hash2(xi + 1, yi, seed), c = MA.hash2(xi, yi + 1, seed), d = MA.hash2(xi + 1, yi + 1, seed);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  MA.fbm = function (x, y, seed, oct) {
    var s = 0, amp = 0.5, f = 1, n = 0;
    for (var i = 0; i < (oct || 3); i++) { s += MA.noise2(x * f, y * f, seed + i * 17) * amp; n += amp; amp *= 0.5; f *= 2; }
    return s / n;
  };

  // ---------- Farben ----------
  MA.hex = function (h) { var n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  MA.mix = function (a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; };
  MA.rgb = function (c, a) { return a == null ? "rgb(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + ")" : "rgba(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + "," + a + ")"; };

  // ---------- Canvas ----------
  MA.canvas = function (w, h) {
    var c = document.createElement("canvas");
    c.width = w; c.height = h;
    var x = c.getContext("2d");
    x.imageSmoothingEnabled = false;
    c.ctx = x;
    return c;
  };
  // Pixel-Malhelfer für Sprites
  MA.pen = function (ctx) {
    return {
      px: function (x, y, col) { ctx.fillStyle = col; ctx.fillRect(x | 0, y | 0, 1, 1); },
      rect: function (x, y, w, h, col) { ctx.fillStyle = col; ctx.fillRect(x | 0, y | 0, w | 0, h | 0); },
      ell: function (cx, cy, rx, ry, col) {
        ctx.fillStyle = col;
        for (var y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
          for (var x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
            var dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
            if (dx * dx + dy * dy <= 1) ctx.fillRect(x, y, 1, 1);
          }
      },
      line: function (x0, y0, x1, y1, col) {
        ctx.fillStyle = col;
        x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
        var dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx + dy;
        for (var i = 0; i < 400; i++) {
          ctx.fillRect(x0, y0, 1, 1);
          if (x0 === x1 && y0 === y1) break;
          var e2 = 2 * err;
          if (e2 >= dy) { err += dy; x0 += sx; }
          if (e2 <= dx) { err += dx; y0 += sy; }
        }
      }
    };
  };
  // Dunkle Kontur um alle sichtbaren Pixel eines Sprites
  MA.outline = function (cv, col, alphaMin) {
    var w = cv.width, h = cv.height, ctx = cv.ctx || cv.getContext("2d");
    var src = ctx.getImageData(0, 0, w, h), d = src.data, out = ctx.createImageData(w, h), o = out.data;
    var c = MA.hex(col || "#120e0e"), am = alphaMin || 40;
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      var i = (y * w + x) * 4;
      if (d[i + 3] > am) { o[i] = d[i]; o[i + 1] = d[i + 1]; o[i + 2] = d[i + 2]; o[i + 3] = d[i + 3]; continue; }
      var n = (x > 0 && d[i - 1] > am) || (x < w - 1 && d[i + 7] > am) || (y > 0 && d[i - w * 4 + 3] > am) || (y < h - 1 && d[i + w * 4 + 3] > am);
      if (n) { o[i] = c[0]; o[i + 1] = c[1]; o[i + 2] = c[2]; o[i + 3] = 255; }
    }
    ctx.putImageData(out, 0, 0);
    return cv;
  };
  // Schwarze Silhouette (für Schatten)
  // Schatten eines Körpers aus 3D-Punkten [x, y, z] (z = Höhe in px): jeder Punkt fällt entlang der
  // Lichtrichtung (sh.x, sh.y pro Höhenpixel) auf den Boden, die konvexe Hülle ist der Schatten (seit v0.16)
  MA.shadowHull = function (sc, sh, pts) {
    var o = MA.light.off, P = pts.map(function (p) { return [p[0] + sh.x * p[2] - o.x, p[1] + sh.y * p[2] - o.y]; });
    P.sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    function cr(a, b, c) { return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]); }
    var lo = [], up = [], i;
    for (i = 0; i < P.length; i++) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], P[i]) <= 0) lo.pop(); lo.push(P[i]); }
    for (i = P.length - 1; i >= 0; i--) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], P[i]) <= 0) up.pop(); up.push(P[i]); }
    var H = lo.slice(0, -1).concat(up.slice(0, -1));
    sc.setTransform(1, 0, 0, 1, 0, 0); sc.fillStyle = "#000"; sc.beginPath();
    H.forEach(function (p, k) { if (k) sc.lineTo(p[0], p[1]); else sc.moveTo(p[0], p[1]); });
    sc.closePath(); sc.fill();
  };
  // Quader (Grundfläche x0..x1, y0..y1, Höhe 0..h) → Schatten
  MA.shadowBox = function (sc, sh, x0, y0, x1, y1, h, z0) {
    z0 = z0 || 0;
    MA.shadowHull(sc, sh, [[x0, y0, z0], [x1, y0, z0], [x0, y1, z0], [x1, y1, z0], [x0, y0, h], [x1, y0, h], [x0, y1, h], [x1, y1, h]]);
  };
  MA.silhouette = function (cv) {
    var s = MA.canvas(cv.width, cv.height);
    s.ctx.drawImage(cv, 0, 0);
    s.ctx.globalCompositeOperation = "source-in";
    s.ctx.fillStyle = "#000";
    s.ctx.fillRect(0, 0, cv.width, cv.height);
    return s;
  };

  // Kleiner Speicher-Helfer (localStorage kann fehlen oder werfen)
  MA.store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
})();
