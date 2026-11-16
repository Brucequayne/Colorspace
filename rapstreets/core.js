/* Rap Streets – core.js
   Namensraum RS, Bildgröße (wie Shizuku: 480 × 272, pixelgenau hochskaliert), Projektion, Mathe, Zufall, Farben, Eingabe.
   Projektion: Der Boden ist ein Raster aus G × G Feldern, um 45° gedreht – eine Kreuzung zeigt mit der Spitze zum Betrachter.
   Gleiche Kamerahöhe wie Shizuku, also keine Stauchung: ein Feld ist eine Raute mit gleicher Breite und Höhe (2·HW).
   Weltkoordinaten: x, y in Feldern (0…G), z in Pixeln nach oben. */
(function () {
  var RS = window.RS = window.RS || {};
  RS.VERSION = "0.1";
  RS.W = 480; RS.H = 272;
  RS.G = 36;            // Felder je Seite (die Raute deckt den ganzen Bildschirm ab)
  RS.HW = 11;           // halbe Rautenbreite in Pixeln (Feld = 22 × 22 Pixel)
  RS.HH = 11;           // halbe Rautenhöhe (gleich HW = gleiche Kamerahöhe wie Shizuku)
  RS.OX = RS.W / 2;     // Bildschirmposition der Mapmitte
  RS.OY = RS.H / 2 - RS.G * RS.HH;
  RS.lang = "de";
  RS.L2 = function (de, en) { return RS.lang === "en" ? en : de; };

  // ---------- Projektion ----------
  RS.sx = function (x, y) { return RS.OX + (x - y) * RS.HW; };
  RS.sy = function (x, y, z) { return RS.OY + (x + y) * RS.HH - (z || 0); };
  RS.toGrid = function (px, py) { var a = (px - RS.OX) / RS.HW, b = (py - RS.OY) / RS.HH; return { x: (a + b) / 2, y: (b - a) / 2 }; };
  RS.visible = function (tx, ty) {   // liegt das Feld (ganz oder teilweise) im Bild?
    var cx = RS.sx(tx + 0.5, ty + 0.5), cy = RS.sy(tx + 0.5, ty + 0.5);
    return cx > -RS.HW && cx < RS.W + RS.HW && cy > -RS.HH && cy < RS.H + RS.HH;
  };

  // ---------- Mathe ----------
  var M = RS.m = {};
  M.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  M.lerp = function (a, b, t) { return a + (b - a) * t; };
  M.smooth = function (t) { t = M.clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  M.dist = function (ax, ay, bx, by) { var dx = bx - ax, dy = by - ay; return Math.sqrt(dx * dx + dy * dy); };

  // ---------- Zufall (aus Shizuku) ----------
  RS.rng = function (seed) {
    var s = (seed >>> 0) || 1;
    return function () { s = (s + 0x6D2B79F5) >>> 0; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  };
  RS.hash2 = function (x, y, seed) {
    var h = (x * 374761393 + y * 668265263 + (seed | 0) * 982451653) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296;
  };
  RS.noise2 = function (x, y, seed) {
    var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    var a = RS.hash2(xi, yi, seed), b = RS.hash2(xi + 1, yi, seed), c = RS.hash2(xi, yi + 1, seed), d = RS.hash2(xi + 1, yi + 1, seed);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };

  // ---------- Farben ----------
  RS.hex = function (h) { var n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  RS.shade = function (c, k) { return k >= 0 ? [c[0] + (255 - c[0]) * k, c[1] + (255 - c[1]) * k, c[2] + (255 - c[2]) * k] : [c[0] * (1 + k), c[1] * (1 + k), c[2] * (1 + k)]; };
  RS.mix = function (a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; };

  // ---------- Canvas ----------
  RS.canvas = function (w, h) { var c = document.createElement("canvas"); c.width = Math.max(1, w); c.height = Math.max(1, h); var x = c.getContext("2d"); x.imageSmoothingEnabled = false; c.ctx = x; return c; };
  RS.store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
  };

  // ---------- Eingabe (aus Shizuku, ohne Spieltasten) ----------
  var I = RS.input = { keys: {}, pressed: {}, mx: 0, my: 0, inside: false, lmb: false, rmb: false, lmbHit: false, rmbHit: false, wheel: 0, el: null };
  var view = { x: 0, y: 0, s: 1 };
  I.setView = function (x, y, s) { view.x = x; view.y = y; view.s = s; };   // relativ zur Wurzel (Position wird bei jedem Ereignis frisch gemessen)
  function toPx(cx, cy) { var r = I.el ? I.el.getBoundingClientRect() : { left: 0, top: 0 }; I.mx = (cx - r.left - view.x) / view.s; I.my = (cy - r.top - view.y) / view.s; I.inside = I.mx >= 0 && I.my >= 0 && I.mx < RS.W && I.my < RS.H; }
  function typing(e) { var t = e.target; return t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT"); }
  function kd(e) { if (typing(e)) return; var k = e.key.length === 1 ? e.key.toLowerCase() : e.key; if (!I.keys[k]) I.pressed[k] = true; I.keys[k] = true; }
  function ku(e) { var k = e.key.length === 1 ? e.key.toLowerCase() : e.key; I.keys[k] = false; }
  function mm(e) { toPx(e.clientX, e.clientY); }
  function md(e) {
    if (!I.el || !I.el.contains(e.target) || e.target.tagName !== "CANVAS") return;
    toPx(e.clientX, e.clientY);
    if (e.button === 0) { I.lmb = true; I.lmbHit = true; }
    if (e.button === 2) { I.rmb = true; I.rmbHit = true; }
  }
  function mu(e) { if (e.button === 0) I.lmb = false; if (e.button === 2) I.rmb = false; }
  function cm(e) { if (I.el && I.el.contains(e.target)) e.preventDefault(); }
  function wh(e) { if (I.el && e.target.tagName === "CANVAS") { I.wheel += Math.sign(e.deltaY); e.preventDefault(); } }
  function blur() { I.keys = {}; I.lmb = I.rmb = false; }
  I.attach = function (el) {
    I.el = el; window.addEventListener("keydown", kd); window.addEventListener("keyup", ku); window.addEventListener("pointermove", mm);
    window.addEventListener("mousedown", md); window.addEventListener("mouseup", mu); window.addEventListener("contextmenu", cm);
    window.addEventListener("wheel", wh, { passive: false }); window.addEventListener("blur", blur);
  };
  I.detach = function () {
    window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); window.removeEventListener("pointermove", mm);
    window.removeEventListener("mousedown", md); window.removeEventListener("mouseup", mu); window.removeEventListener("contextmenu", cm);
    window.removeEventListener("wheel", wh); window.removeEventListener("blur", blur); I.el = null; blur();
  };
  I.endFrame = function () { I.pressed = {}; I.lmbHit = false; I.rmbHit = false; I.wheel = 0; };
  I.down = function (k) { return !!I.keys[k]; };
  I.hit = function (k) { return !!I.pressed[k]; };
})();
