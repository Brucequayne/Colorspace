/* Shizuku – core.js
   Namensraum SZ, feste Maße der Arena, Sprache (L2), Mathe-Helfer, Zufall mit Startwert und Rauschen. */
(function () {
  var SZ = window.SZ = window.SZ || {};
  SZ.VERSION = "0.13";
  SZ.scenes = {};   // menu, intro, arena, editor (je eigene Datei)

  // Interne Auflösung: die Arena füllt genau dieses Bild, es wird pixelgenau hochskaliert.
  SZ.TILE = 16;
  SZ.COLS = 30;
  SZ.ROWS = 17;
  SZ.W = SZ.COLS * SZ.TILE;   // 480
  SZ.H = SZ.ROWS * SZ.TILE;   // 272

  SZ.lang = "de";
  // Zweisprachige Texte: L2("deutsch", "english")
  SZ.L2 = function (de, en) { return SZ.lang === "en" ? en : de; };

  // ---------- Mathe ----------
  var M = SZ.m = {};
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
  SZ.rng = function (seed) {
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
  SZ.hash2 = function (x, y, seed) {
    var h = (x * 374761393 + y * 668265263 + (seed | 0) * 982451653) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
  // Weiches Wertrauschen
  SZ.noise2 = function (x, y, seed) {
    var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    var a = SZ.hash2(xi, yi, seed), b = SZ.hash2(xi + 1, yi, seed), c = SZ.hash2(xi, yi + 1, seed), d = SZ.hash2(xi + 1, yi + 1, seed);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
  SZ.fbm = function (x, y, seed, oct) {
    var s = 0, amp = 0.5, f = 1, n = 0;
    for (var i = 0; i < (oct || 3); i++) { s += SZ.noise2(x * f, y * f, seed + i * 17) * amp; n += amp; amp *= 0.5; f *= 2; }
    return s / n;
  };

  // ---------- Farben ----------
  SZ.hex = function (h) { var n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  SZ.mix = function (a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; };
  SZ.rgb = function (c, a) { return a == null ? "rgb(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + ")" : "rgba(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + "," + a + ")"; };

  // ---------- Canvas ----------
  SZ.canvas = function (w, h) {
    var c = document.createElement("canvas");
    c.width = w; c.height = h;
    var x = c.getContext("2d");
    x.imageSmoothingEnabled = false;
    c.ctx = x;
    return c;
  };
  // Pixel-Malhelfer für Sprites
  SZ.pen = function (ctx) {
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
  SZ.outline = function (cv, col, alphaMin) {
    var w = cv.width, h = cv.height, ctx = cv.ctx || cv.getContext("2d");
    var src = ctx.getImageData(0, 0, w, h), d = src.data, out = ctx.createImageData(w, h), o = out.data;
    var c = SZ.hex(col || "#120e0e"), am = alphaMin || 40;
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
  SZ.silhouette = function (cv) {
    var s = SZ.canvas(cv.width, cv.height);
    s.ctx.drawImage(cv, 0, 0);
    s.ctx.globalCompositeOperation = "source-in";
    s.ctx.fillStyle = "#000";
    s.ctx.fillRect(0, 0, cv.width, cv.height);
    return s;
  };

  // Kleiner Speicher-Helfer (localStorage kann fehlen oder werfen)
  SZ.store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
})();
