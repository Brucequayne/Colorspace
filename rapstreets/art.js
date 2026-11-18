/* Rap Streets – art.js
   Alles prozedural als Pixel-Grafik, Brooklyn in den 90ern:
   - Boden: Farbe je Bildpunkt aus Weltkoordinaten (funktioniert mit jeder Projektion), Bordsteine automatisch an Gehweg/Straße.
   - Objekte: aus Quadern gebaut. Jede sichtbare Fläche (oben, vorne links = +y, vorne rechts = +x) bekommt eine Textur-Funktion
     tex(u, v) in Flächen-Pixeln (u entlang der Fläche, v von oben nach unten). Fenster können nachts leuchten (Emissiv-Bild).
   - Crowd: 2D-Figuren von vorn mit Wipp- und Jubel-Animation, viele Varianten (Haut, Klamotten, Mützen).
   Gedreht wird mit r = 0/1 (Vorderseite links bzw. rechts sichtbar). */
(function () {
  var RS = window.RS, L2 = RS.L2, HW = RS.HW, HH = RS.HH, hex = RS.hex, sh = RS.shade, h2 = RS.hash2, n2 = RS.noise2;

  // ===================== Boden =====================
  // road: zählt als Fahrbahn (Bordstein zum Gehweg), walk: Gehweg (erhöht)
  RS.TILES = {
    a: { name: function () { return L2("Asphalt", "Asphalt"); }, sw: "#3B3E43", road: 1 },
    r: { name: function () { return L2("Asphalt, rissig", "Cracked asphalt"); }, sw: "#45484C", road: 1 },
    x: { name: function () { return L2("Mittellinie ↘", "Center line ↘"); }, sw: "#4A4535", road: 1 },
    y: { name: function () { return L2("Mittellinie ↙", "Center line ↙"); }, sw: "#4A4535", road: 1 },
    c: { name: function () { return L2("Zebrastreifen ↘", "Crosswalk ↘"); }, sw: "#8A8C8E", road: 1 },
    e: { name: function () { return L2("Zebrastreifen ↙", "Crosswalk ↙"); }, sw: "#8A8C8E", road: 1 },
    l: { name: function () { return L2("Parklinie ↘", "Parking line ↘"); }, sw: "#55585C", road: 1 },
    k: { name: function () { return L2("Parklinie ↙", "Parking line ↙"); }, sw: "#55585C", road: 1 },
    w: { name: function () { return L2("Pfütze", "Puddle"); }, sw: "#2A3644", road: 1 },
    s: { name: function () { return L2("Gehweg", "Sidewalk"); }, sw: "#8E8B85", walk: 1 },
    b: { name: function () { return L2("Backsteinpflaster", "Brick paving"); }, sw: "#8A4E3E", walk: 1 },
    d: { name: function () { return L2("Brache", "Vacant lot"); }, sw: "#6A5E4E" },
    g: { name: function () { return L2("Grasfleck", "Grass patch"); }, sw: "#56663C" }
  };
  var C_ASP = hex("#393C41"), C_SW = hex("#8C8983"), C_CURB = hex("#B3AFA6"), C_CURBF = hex("#6E6B66");
  function asphalt(X, Y, crack) {
    var q = Math.floor(X * 22), r = Math.floor(Y * 22), hh = h2(q, r, 5), c = C_ASP;
    var p = n2(X * 1.3, Y * 1.3, 2);
    c = sh(c, (p - 0.5) * 0.18);
    if (hh > 0.93) c = sh(c, 0.18); else if (hh < 0.07) c = sh(c, -0.25);
    if (crack) { var cr = Math.abs(n2(X * 2.2, Y * 2.2, 9) - 0.5); if (cr < 0.018) c = sh(c, -0.45); if (n2(X * 0.9, Y * 0.9, 4) > 0.68) c = sh(c, 0.1); }
    return c;
  }
  function concrete(X, Y, u, v) {
    var c = sh(C_SW, (n2(X * 2, Y * 2, 3) - 0.5) * 0.14), q = Math.floor(X * 22), r = Math.floor(Y * 22);
    if (u < 0.04 || v < 0.04) c = sh(c, -0.13);                           // Fugen der Platten
    var gum = h2(q, r, 11); if (gum > 0.985) c = sh(c, -0.35);             // Kaugummiflecken
    if (n2(X * 3, Y * 3, 21) > 0.74) c = sh(c, -0.08);                     // Abnutzung
    return c;
  }
  function brickPave(X, Y) {
    var row = Math.floor(Y * 6), off = row % 2 ? 0.5 : 0, col = Math.floor(X * 3 + off);
    var fu = (X * 3 + off) % 1, fv = (Y * 6) % 1, base = hex("#8A4E3E");
    var c = sh(base, (h2(col, row, 31) - 0.5) * 0.22);
    if (fu < 0.08 || fv < 0.12) c = hex("#6A5A50");
    return c;
  }
  // Farbe eines Bodenpunkts. t = Kürzel, X, Y = Weltkoordinaten (Felder), tile = function(tx,ty) liefert Kürzel
  RS.groundAt = function (t, X, Y, tile) {
    var tx = Math.floor(X), ty = Math.floor(Y), u = X - tx, v = Y - ty, c, T = RS.TILES[t] || RS.TILES.a;
    if (t === "s") c = concrete(X, Y, u, v);
    else if (t === "b") c = brickPave(X, Y);
    else if (t === "d") { c = sh(hex("#6A5E4E"), (n2(X * 2.5, Y * 2.5, 7) - 0.5) * 0.3); var gq = h2(Math.floor(X * 22), Math.floor(Y * 22), 8); if (gq > 0.9) c = sh(c, 0.25); else if (gq < 0.06) c = hex("#4E463C"); if (h2(Math.floor(X * 6), Math.floor(Y * 6), 77) > 0.985) c = hex("#C8C2B0"); }
    else if (t === "g") { var gg = n2(X * 3, Y * 3, 13); c = gg > 0.45 ? sh(hex("#56663C"), (h2(Math.floor(X * 22), Math.floor(Y * 22), 3) - 0.5) * 0.3) : sh(hex("#6A5E4E"), (gg - 0.3) * 0.4); }
    else if (t === "w") { c = asphalt(X, Y); var pd = n2(X * 1.6, Y * 1.6, 41); if (pd > 0.42) { c = sh(hex("#28323E"), (n2(X * 4, Y * 4, 2) - 0.5) * 0.3); if (h2(Math.floor(X * 22), Math.floor(Y * 22), 5) > 0.97) c = hex("#7E95AA"); } }
    else {
      c = asphalt(X, Y, t === "r");
      if (t === "x" && Math.abs(v - 0.5) < 0.05 && (u * 2) % 1 < 0.6) c = hex("#D2A93A");                  // gelbe Mittellinie entlang x
      if (t === "y" && Math.abs(u - 0.5) < 0.05 && (v * 2) % 1 < 0.6) c = hex("#D2A93A");
      if (t === "c" && (Y * 2.5) % 1 < 0.5 && u > 0.08 && u < 0.92) c = sh(hex("#D8D6CF"), (n2(X * 6, Y * 6, 1) - 0.6) * 0.4);   // Zebrastreifen
      if (t === "e" && (X * 2.5) % 1 < 0.5 && v > 0.08 && v < 0.92) c = sh(hex("#D8D6CF"), (n2(X * 6, Y * 6, 1) - 0.6) * 0.4);
      if (t === "l" && v < 0.06) c = hex("#C9C7C0");
      if (t === "k" && u < 0.06) c = hex("#C9C7C0");
    }
    if (tile) {
      // Bordstein: Gehweg-Kante zur Fahrbahn; die Kanten zum Betrachter (+x, +y) zeigen eine kleine senkrechte Fläche
      if (T.walk) {
        var rx = (RS.TILES[tile(tx + 1, ty)] || {}).road, ry = (RS.TILES[tile(tx, ty + 1)] || {}).road, lx = (RS.TILES[tile(tx - 1, ty)] || {}).road, ly = (RS.TILES[tile(tx, ty - 1)] || {}).road;
        if ((rx && u > 0.9) || (ry && v > 0.9) || (lx && u < 0.1) || (ly && v < 0.1)) c = sh(C_CURB, (h2(Math.floor(X * 22), Math.floor(Y * 22), 3) - 0.5) * 0.1);
      } else if (T.road) {
        var wx = (RS.TILES[tile(tx - 1, ty)] || {}).walk, wy = (RS.TILES[tile(tx, ty - 1)] || {}).walk, wx2 = (RS.TILES[tile(tx + 1, ty)] || {}).walk, wy2 = (RS.TILES[tile(tx, ty + 1)] || {}).walk;
        if ((wx && u < 0.09) || (wy && v < 0.09)) c = C_CURBF;                                            // sichtbare Bordsteinkante
        else if ((wx && u < 0.17) || (wy && v < 0.17) || (wx2 && u > 0.88) || (wy2 && v > 0.88)) c = sh(c, -0.22);   // Rinnstein
      }
    }
    return c;
  };

  // ===================== Quader-Grafik =====================
  // Fläche zeichnen: o = Bildpunkt der Ecke (oben links der Fläche), U/V = Bildschirmvektoren je Einheit, lu/lv = Längen
  function face(ctx, img, em, o, U, V, lu, lv, tex, k, clip) {
    var det = U[0] * V[1] - U[1] * V[0]; if (!det) return;
    var xs = [o[0], o[0] + U[0] * lu, o[0] + V[0] * lv, o[0] + U[0] * lu + V[0] * lv], ys = [o[1], o[1] + U[1] * lu, o[1] + V[1] * lv, o[1] + U[1] * lu + V[1] * lv];
    var x0 = Math.floor(Math.min.apply(null, xs)), x1 = Math.ceil(Math.max.apply(null, xs)), y0 = Math.floor(Math.min.apply(null, ys)), y1 = Math.ceil(Math.max.apply(null, ys));
    var W = img.width, d = img.data, ed = em ? em.data : null, LU = lu * (U[0] ? Math.abs(U[0]) : 1);
    for (var py = Math.max(0, y0); py < Math.min(img.height, y1); py++) for (var px = Math.max(0, x0); px < Math.min(W, x1); px++) {
      var dx = px + 0.5 - o[0], dy = py + 0.5 - o[1], a = (dx * V[1] - dy * V[0]) / det, b = (U[0] * dy - U[1] * dx) / det;
      if (a < 0 || b < 0 || a >= lu || b >= lv) continue;
      if (clip && !clip(px, py)) continue;
      var c = tex(a * (U[0] ? Math.abs(U[0]) : 1), b * (V[1] ? Math.abs(V[1]) : 1), a, b, LU); if (!c) continue;
      var cc = k ? sh(c, k) : c, i = (py * W + px) * 4;
      d[i] = cc[0]; d[i + 1] = cc[1]; d[i + 2] = cc[2]; d[i + 3] = c[3] == null ? 255 : c[3];
      if (ed) { if (c.glow) { ed[i] = c.glow[0]; ed[i + 1] = c.glow[1]; ed[i + 2] = c.glow[2]; ed[i + 3] = 255; } else ed[i + 3] = 0; }
    }
  }
  // Quader: b = { x, y, z, w, d, h, top, fy, fx } (x/y/w/d in Feldern, z/h in Pixeln), Texturen: function(u, v, a, b) → Farbe
  function drawBox(ctx, img, em, ax, ay, b) {
    if (b.ghost) return;
    var P = function (x, y, z) { return [ax + (x - y) * HW, ay + (x + y) * HH - z]; };
    var zt = b.z + b.h;
    if (b.top) face(ctx, img, em, P(b.x, b.y, zt), [HW, HH], [-HW, HH], b.w, b.d, b.top, 0.06);
    if (b.fy && b.h > 0) face(ctx, img, em, P(b.x, b.y + b.d, zt), [HW, HH], [0, 1], b.w, b.h, b.fy, -0.02);
    if (b.fx && b.h > 0) face(ctx, img, em, P(b.x + b.w, b.y + b.d, zt), [HW, -HH], [0, 1], b.d, b.h, b.fx, -0.2);
  }
  // Spiegeln für r = 1: x ↔ y, Flächen tauschen
  function mirror(b) { return { x: b.y, y: b.x, z: b.z, w: b.d, d: b.w, h: b.h, top: b.top && function (u, v, a, bb) { return b.top(v, u, bb, a); }, fy: b.fx, fx: b.fy, ghost: b.ghost, noShadow: b.noShadow, round: b.round }; }

  // ---------- Textur-Bausteine ----------
  function solid(col, noise, seed) { var c = hex(col); return function (u, v) { return noise ? sh(c, (h2(u | 0, v | 0, seed || 1) - 0.5) * noise) : c; }; }
  var GLASS = hex("#26303C"), GLASS2 = hex("#3E5266"), LIT = [255, 214, 140];
  // Fenster in einer Wand: Raster; win(u, v) gibt Farbe oder null
  function windows(o) {
    return function (u, v, seed, L) {
      var gap = o.sx - o.ww - 2, n = Math.max(1, Math.floor((L - 2 * o.x0 + gap) / o.sx)), x0 = (L - (n * o.sx - gap)) / 2;
      var fx = u - x0, fy = v - o.y0; if (fx < 0 || fy < 0) return null; if (Math.floor(fx / o.sx) >= n) return null;
      var cx = Math.floor(fx / o.sx), cy = Math.floor(fy / o.sy), lx = fx - cx * o.sx, ly = fy - cy * o.sy;
      if (o.nx && cx >= o.nx || o.ny && cy >= o.ny) return null;
      if (o.skip && o.skip(cx, cy, n)) return null;
      if (lx >= o.ww + 2 || ly >= o.wh + 2) return null;
      if (lx < 1 || ly < 1 || lx >= o.ww + 1 || ly >= o.wh + 1) return o.frame;
      var lit = h2(cx + seed * 7, cy, 99) > 0.55, c = ly < 2 || lx < 2 ? GLASS2 : GLASS;
      if (o.blind && h2(cx, cy + seed, 5) > 0.6 && ly < o.wh * 0.5) c = o.blind;
      c = c.slice(); if (lit) c.glow = sh(LIT, -(h2(cx, cy, seed + 3)) * 0.35);
      return c;
    };
  }
  function brick(base, mortar) {
    var b = hex(base), m = hex(mortar);
    return function (u, v) { var row = Math.floor(v / 2), off = row % 2 ? 2 : 0, col = Math.floor((u + off) / 4); if (v % 2 >= 1.5 || (u + off) % 4 < 0.9) return m; return sh(b, (h2(col, row, 7) - 0.5) * 0.25); };
  }
  var FONT;
  function pixText(str, x0, y0, u, v) {   // 3×5-Pixelschrift für Schilder
    var F = FONT = FONT || { D: "110101101101110", E: "111100110100111", L: "100100100100111", I: "111010010010111", B: "110101110101110", O: "111101101101111", G: "111100101101111", A: "010101111101101", R: "110101110101101", X: "101101010101101", T: "111010010010010", C: "111100100100111", K: "101110100110101", S: "111100111001111", N: "101111111111101", Y: "101101010010010", P: "110101110100100", " ": "000000000000000", "2": "111001111100111", "4": "101101111001001", "7": "111001001010010", "/": "001001010100100", H: "101101111101101", U: "101101101101111", Z: "111001010100111", Q: "010101101110011", M: "101111111101101", W: "101101111111101", F: "111100110100100", V: "101101101101010", J: "001001001101111", "0": "111101101101111", "1": "010110010010111", "3": "111001111001111", "5": "111100111001111", "6": "111100111101111", "8": "111101111101111", "9": "111101111001111", "!": "010010010000010", ".": "000000000000010", "-": "000000111000000", "'": "010010000000000", "$": "011110010011110" };
    var dx = Math.floor(u - x0), dy = Math.floor(v - y0); if (dy < 0 || dy > 4 || dx < 0) return false;
    var ci = Math.floor(dx / 4), cx = dx % 4; if (ci >= str.length || cx > 2) return false;
    var g = F[str[ci]] || F[" "]; return g[dy * 3 + cx] === "1";
  }
  RS.glyph = function (ch) { if (!FONT) pixText("A", 0, 0, 0, 0); return FONT[ch] || FONT[" "]; };

  // ===================== Objekte =====================
  // Jede Art: name, w/d (Felder, bei r = 0), h (Pixel ungefähr), variants, build(v) → { boxes, extra(ctx, P), lights: [{x,y,z,r,col}], steam }
  var OBJ = RS.OBJECTS = {};
  function def(id, o) { o.id = id; OBJ[id] = o; }

  // ----- Brownstone: Sandsteinfront, hohe Fenster, Gesims, Treppe (Stoop) mit Geländer
  def("brown", {
    name: function () { return L2("Brownstone", "Brownstone"); }, w: 4, d: 3, variants: 3, group: "house",
    build: function (v) {
      var base = ["#74463A", "#6A4234", "#7E5440"][v], H = 64, wall = hex(base), seed = v * 13 + 1;
      var win = windows({ x0: 4, y0: 7, sx: 9, sy: 17, ww: 4, wh: 9, frame: hex("#D8CDB8"), ny: 3, blind: hex("#C8B8A0") });
      var winF = windows({ x0: 4, y0: 7, sx: 9, sy: 17, ww: 4, wh: 9, frame: hex("#D8CDB8"), ny: 3, blind: hex("#C8B8A0"), skip: function (cx, cy, n) { return cy === 2 && Math.abs(cx - (n - 1) / 2) < 0.8; } });
      var tex = function (u, v2, a, b, L) {
        var w = win(u, v2, seed, L); if (w) return w;
        if (v2 % 17 < 1.2 && v2 > 4) return sh(wall, 0.12);                                      // Gesims je Etage
        return sh(wall, (n2(u * 0.4, v2 * 0.4, seed) - 0.5) * 0.2 + (h2(u | 0, v2 | 0, seed) - 0.5) * 0.08);
      };
      var front = function (u, v2, a, b, L) {
        var dc = L / 2; if (u > dc - 4 && u < dc + 5 && v2 > H - 34 && v2 < H - 14) return u < dc - 3 || u > dc + 3.5 || v2 < H - 33 ? hex("#D8CDB8") : hex("#3A2418");   // Tür über der Treppe
        var w = winF(u, v2, seed, L); if (w) return w;
        if (v2 % 17 < 1.2 && v2 > 4) return sh(wall, 0.12);
        return sh(wall, (n2(u * 0.4, v2 * 0.4, seed) - 0.5) * 0.2 + (h2(u | 0, v2 | 0, seed) - 0.5) * 0.08);
      };
      var top = function (u, v2) { return sh(hex("#5A5A5E"), (h2(u | 0, v2 | 0, 3) - 0.5) * 0.2); };
      var stair = function (u, v2) { return sh(hex("#8C6A56"), v2 < 1.5 ? 0.15 : -0.05); };
      return { boxes: [
        { x: 0, y: 0, z: 0, w: 4, d: 3, h: H, top: top, fy: front, fx: tex },
        { x: -0.08, y: -0.08, z: H, w: 4.16, d: 3.16, h: 4, top: top, fy: solid("#9A8470"), fx: solid("#9A8470") },
        { x: 1.55, y: 3, z: 0, w: 1.1, d: 0.9, h: 5, top: stair, fy: stair, fx: stair },
        { x: 1.55, y: 3, z: 5, w: 1.1, d: 0.6, h: 5, top: stair, fy: stair, fx: stair },
        { x: 1.55, y: 3, z: 10, w: 1.1, d: 0.3, h: 5, top: stair, fy: stair, fx: stair }
      ], extra: function (c, P) {   // schwarzes Geländer an der Treppe
        c.fillStyle = "#16130F";
        [1.55, 2.62].forEach(function (x) { var a = P(x, 3.9, 9), b = P(x, 3.05, 21); line(c, a[0], a[1], b[0], b[1]); var p = P(x, 3.9, 0); c.fillRect(Math.round(p[0]), Math.round(p[1]) - 9, 1, 9); });
      } };
    }
  });
  // ----- Backstein-Wohnblock mit Feuerleiter und Wassertank
  def("brick", {
    name: function () { return L2("Backsteinblock", "Brick tenement"); }, w: 5, d: 4, variants: 2, group: "house",
    build: function (v) {
      var H = 84, seed = 40 + v, br = brick(["#8E3B2E", "#7A3428"][v], "#6E5A50");
      var win = windows({ x0: 4, y0: 6, sx: 10, sy: 16, ww: 5, wh: 8, frame: hex("#C9C0B0"), ny: 5, blind: hex("#E6E0CC") });
      var wall = function (u, v2, a, b, L) { var w = win(u, v2, seed, L); if (w) return w; if (v2 % 16 > 14.6) return hex("#A89A88"); return br(u, v2); };
      var fire = function (u, v2, a, b, L) {   // Feuerleiter vor der linken Front
        var fl = (v2 - 4) % 16, fu = u - 10;
        if (fu > 0 && fu < 24 && v2 > 4 && v2 < H - 14) {
          if (fl > 12 && fl < 14) return hex("#141414");                                          // Plattform
          if (fl > 9 && fl <= 12 && (Math.floor(fu) % 3 === 0)) return hex("#1C1C1C");              // Geländerstäbe
          var dia = (fl + Math.floor(v2 / 16) % 2 * 10) % 16; if (Math.abs(fu - 4 - dia * 1.1) < 0.8 && fl < 12) return hex("#202020");   // Treppe zickzack
        }
        return wall(u, v2, a, b, L);
      };
      var top = function (u, v2) { return sh(hex("#4E4E52"), (h2(u | 0, v2 | 0, 5) - 0.5) * 0.18); };
      var wood = function (u, v2) { return sh(hex("#6E5236"), (u | 0) % 3 === 0 ? -0.25 : 0); };
      return { boxes: [
        { x: 0, y: 0, z: 0, w: 5, d: 4, h: H, top: top, fy: fire, fx: wall },
        { x: 0, y: 0, z: H, w: 5, d: 0.15, h: 3, top: solid("#7A6A5E"), fy: solid("#7A6A5E"), fx: solid("#7A6A5E") },
        { x: 0, y: 3.85, z: H, w: 5, d: 0.15, h: 3, top: solid("#7A6A5E"), fy: solid("#7A6A5E"), fx: solid("#7A6A5E") },
        { x: 4.85, y: 0, z: H, w: 0.15, d: 4, h: 3, top: solid("#7A6A5E"), fy: solid("#7A6A5E"), fx: solid("#7A6A5E") },
        { x: 1.4, y: 1.2, z: H + 8, w: 1.1, d: 1.1, h: 14, top: solid("#5A4430"), fy: wood, fx: wood },     // Wassertank
        { x: 1.5, y: 1.3, z: H + 22, w: 0.9, d: 0.9, h: 4, top: solid("#3A3A3A"), fy: solid("#2E2E2E"), fx: solid("#262626") }
      ], extra: function (c, P) { c.fillStyle = "#1E1E1E"; [[1.45, 2.25], [2.45, 2.25], [2.45, 1.25]].forEach(function (q) { var a = P(q[0], q[1], H); c.fillRect(Math.round(a[0]), Math.round(a[1]) - 8, 1, 8); }); } };
    }
  });
  // ----- Eck-Bodega: Laden mit Markise und Schild, darüber Wohnung
  def("bodega", {
    name: function () { return L2("Eck-Bodega", "Corner bodega"); }, w: 4, d: 4, variants: 3, group: "house",
    build: function (v) {
      var H = 52, paint = hex(["#B89D6A", "#7E8A5E", "#A8A49A"][v]), aw = [["#2E7A3E", "#E8E4D8"], ["#B03028", "#E8E4D8"], ["#284C8A", "#E8E4D8"]][v], seed = 70 + v;
      var sign = ["DELI", "BODEGA", "24/7 DELI"][v];
      var win = windows({ x0: 5, y0: 5, sx: 11, sy: 14, ww: 5, wh: 7, frame: hex("#E4DCC8"), ny: 1 });
      var shop = function (u, v2, a, b, len) {
        if (v2 < 26) { var w = win(u, v2, seed, len); if (w) return w; return sh(paint, (h2(u | 0, v2 | 0, seed) - 0.5) * 0.1); }
        if (v2 < 33) { if (pixText(sign, 4, 27, u, v2)) return hex("#F4E6A0"); return hex("#1E2A22"); }        // Schild
        if (u < 2 || u > len - 2 || v2 > H - 2) return hex("#2A2420");
        if (Math.abs(u - len * 0.72) < 4 && v2 > 35) return v2 < 37 ? hex("#2A2420") : hex("#14181C");         // Tür
        var sl = (v2 - 34) % 5; if (v2 > 34 && sl < 1) return hex("#4A3A2E");                                   // Regale im Schaufenster
        var c = h2(Math.floor(u / 2), Math.floor((v2 - 34) / 5), seed) ; c = [hex("#C83A2E"), hex("#E8C040"), hex("#3A8AC8"), hex("#E8E4D8"), hex("#58A048")][Math.floor(c * 5)];
        var g = sh(c, -0.1); g.glow = sh(c, 0.3); return g;
      };
      var top = function (u, v2) { return sh(hex("#55524E"), (h2(u | 0, v2 | 0, 9) - 0.5) * 0.18); };
      var awn = function (u, v2) { return v2 > 2 ? hex("#1A1A1A") : hex((Math.floor(u / 3) % 2) ? aw[1] : aw[0]); };
      var awT = function (u, v2, a, b) { return sh(hex((Math.floor(a * 6) % 2) ? aw[1] : aw[0]), -b * 0.4); };
      var awT2 = function (u, v2, a, b) { return sh(hex((Math.floor(b * 6) % 2) ? aw[1] : aw[0]), -a * 0.4); };
      return { boxes: [
        { x: 0, y: 0, z: 0, w: 4, d: 4, h: H, top: top, fy: shop, fx: shop },
        { x: 0.2, y: 4, z: 19, w: 3.6, d: 0.55, h: 3, top: awT, fy: awn, fx: awn },
        { x: 4, y: 0.2, z: 19, w: 0.55, d: 3.6, h: 3, top: awT2, fy: awn, fx: awn }
      ] };
    }
  });
  // ----- Garage/Lager: Betonsteine, Rolltor, Graffiti
  def("garage", {
    name: function () { return L2("Garage mit Graffiti", "Garage with graffiti"); }, w: 5, d: 4, variants: 3, group: "house",
    build: function (v) {
      var H = 40, seed = 90 + v, blockC = hex("#7D7F80");
      var block = function (u, v2) { var row = Math.floor(v2 / 4), off = row % 2 ? 3 : 0; if (v2 % 4 < 0.9 || (u + off) % 6 < 0.9) return hex("#5E6062"); return sh(blockC, (h2(Math.floor((u + off) / 6), row, seed) - 0.5) * 0.12 + (n2(u * 0.2, v2 * 0.2, seed) - 0.5) * 0.15); };
      var PAL = [hex("#E83A6A"), hex("#F2C230"), hex("#30B8E0"), hex("#7AD84A"), hex("#B060E0"), hex("#F07A2A")];
      var graf = function (u, v2) {   // Graffiti-Tags: weiche Farbflächen mit dunkler Kontur
        var n = n2(u * 0.09, v2 * 0.14, seed), m = n2(u * 0.3, v2 * 0.3, seed + 4);
        if (v2 > 8 && v2 < H - 6 && n > 0.55) {
          if (n < 0.585) return hex("#121212");
          var c = PAL[Math.floor(n2(u * 0.05, v2 * 0.05, seed + 9) * 6) % 6]; return m > 0.75 ? sh(c, 0.35) : c;
        }
        return null;
      };
      var gate = function (u, v2, a, b, L) {
        if (u > 6 && u < L - 8 && v2 > 12) { if (v2 < 14 || u < 8 || u > L - 10) return hex("#3A3C3E"); var c = sh(hex("#8E9296"), (v2 % 3 < 1) ? -0.3 : 0.05); var g = graf(u, v2); return g && h2(Math.floor(u / 2), 1, seed) > 0.2 ? g : c; }
        return graf(u, v2) || block(u, v2);
      };
      var side = function (u, v2) { return graf(u + 30, v2) || block(u, v2); };
      return { boxes: [{ x: 0, y: 0, z: 0, w: 5, d: 4, h: H, top: function (u, v2) { return sh(hex("#4A4C4E"), (h2(u | 0, v2 | 0, 4) - 0.5) * 0.2); }, fy: gate, fx: side }] };
    }
  });
  // ----- Autos der 90er: Räder, Karosserie, Kabine mit Scheiben (Front zeigt nach +x)
  function car(len, wid, body, cab, opts) {
    opts = opts || {};
    return function (v) {
      var col = hex(body[v % body.length]), glass = hex("#2A3846"), glass2 = hex("#4E6A80"), dk = sh(col, -0.35), tire = hex("#121214");
      var L = len * HW, cx0 = cab.x * HW, cx1 = (cab.x + cab.w) * HW;
      var side = function (u, v2) {
        if (v2 < 1) return sh(col, 0.25);
        if (v2 >= 5) return hex("#2A2A2C");                                                     // Schweller
        if (opts.check && v2 >= 2 && v2 < 3) return ((Math.floor(u / 1.5) % 2) ? hex("#141414") : hex("#E8E4D8"));
        if (opts.stripe && v2 >= 2 && v2 < 3) return hex(opts.stripe);
        if (opts.panel && v2 >= 1.5 && v2 < 4.5 && u > 2 && u < L - 2) return sh(hex(opts.panel), (Math.floor(v2 * 2) % 2 ? -0.08 : 0.04) + (h2(u | 0, 3, 9) - 0.5) * 0.12);
        if (opts.text && v2 >= 1 && v2 < 6 && pixText(opts.text, Math.round(L / 2 - opts.text.length * 2) + 1, 1, u, v2 - 0.0)) return hex(opts.textCol || "#1E3E8A");
        if (Math.abs(u - (cx0 + cx1) / 2) < 0.5 && v2 < 4.5) return dk;                         // Türfuge
        if (Math.abs(u - L * 0.82) < 2 && v2 > 3) return dk;                                      // Radlauf
        if (Math.abs(u - L * 0.2) < 2 && v2 > 3) return dk;
        return v2 > 3.5 ? sh(col, -0.12) : col;
      };
      var front = function (u, v2) {
        var W2 = wid * HW;
        if (v2 >= 5) return hex("#6A6C70");                                                      // Stoßstange
        if (v2 >= 1.5 && v2 < 3.5 && (u < 3 || u > W2 - 3)) { var c = hex("#F4EBB8"); c = c.slice(); c.glow = [255, 236, 170]; return c; }   // Scheinwerfer
        if (v2 >= 1.5 && v2 < 4) return hex("#1E1E20");                                          // Kühlergrill
        return sh(col, 0.08);
      };
      var top = function (u, v2, a) { var c = sh(col, 0.14); if (Math.abs(a - (cab.x + cab.w + 0.04)) < 0.05 || Math.abs(a - (cab.x - 0.04)) < 0.05) return sh(col, -0.1); return c; };
      var cabS = function (u, v2) {                                                              // Seitenscheiben mit Säulen
        if (v2 < 1) return opts.vinyl ? hex(opts.vinyl) : sh(col, 0.2);
        if (v2 >= cab.h - 1) return col;
        if (u < 1.2 || u > cab.w * HW - 1.2 || Math.abs(u - cab.w * HW * (opts.van ? 0.25 : 0.5)) < 0.7) return col;
        if (opts.van && u < cab.w * HW * 0.25 - 0.7) return col;
        return v2 < 2.5 ? glass2 : glass;
      };
      var cabF = function (u, v2) { if (v2 < 1 || v2 >= cab.h - 0.5 || u < 0.8 || u > (wid - 0.2) * HW - 0.8) return col; return v2 < 2.5 ? glass2 : glass; };   // Frontscheibe
      var roof = function (u, v2, a, b) { if (opts.vinyl && a > 0.08 && a < cab.w - 0.25) return sh(hex(opts.vinyl), (h2(u | 0, v2 | 0, 4) - 0.5) * 0.12); if (a > cab.w - (opts.van ? 0.12 : 0.22)) return glass2; if (!opts.van && a < 0.16) return glass; return sh(col, 0.22 + (b > 0.15 && b < (wid - 0.2) - 0.15 && opts.rack ? -0.4 : 0)); };
      var T = solid("#121214"), boxes = [
        { x: len * 0.12, y: -0.03, z: 0, w: 0.42, d: wid + 0.06, h: 4, top: T, fy: T, fx: T },
        { x: len * 0.7, y: -0.03, z: 0, w: 0.42, d: wid + 0.06, h: 4, top: T, fy: T, fx: T },
        { x: 0, y: 0, z: 2, w: len, d: wid, h: 6, top: top, fy: side, fx: front },
        { x: cab.x, y: 0.1, z: 8, w: cab.w, d: wid - 0.2, h: cab.h, top: roof, fy: cabS, fx: cabF }
      ];
      if (opts.taxi) boxes.push({ x: cab.x + cab.w * 0.38, y: wid * 0.3, z: 8 + cab.h, w: 0.28, d: wid * 0.4, h: 3, top: solid("#F4F0D0"), fy: function () { var c = hex("#F2E6A0"); c = c.slice(); c.glow = [255, 236, 160]; return c; }, fx: solid("#D8CC80") });
      return { boxes: boxes };
    };
  }
  def("sedan", { name: function () { return L2("Limousine", "Sedan"); }, w: 2.2, d: 1, variants: 4, group: "car", build: car(2.2, 1, ["#7A1E2C", "#1E3E66", "#D8D4C8", "#2E2E32"], { x: 0.52, w: 1.08, h: 6 }) });
  def("taxi", { name: function () { return L2("Yellow Cab", "Yellow cab"); }, w: 2.2, d: 1, variants: 1, group: "car", build: car(2.2, 1, ["#E8B820"], { x: 0.52, w: 1.08, h: 6 }, { taxi: 1, check: 1 }) });
  def("van", { name: function () { return L2("Kastenwagen", "Van"); }, w: 2.4, d: 1.1, variants: 3, group: "car", build: car(2.4, 1.1, ["#C8C4B8", "#4A5E3A", "#7A2A24"], { x: 0.15, w: 1.85, h: 10 }, { van: 1, stripe: "#9A3424" }) });
  // ----- Kleinkram
  def("bench", { name: function () { return L2("Bank", "Bench"); }, w: 1.4, d: 0.45, variants: 2, group: "deco", build: function (v) {
    var wood = hex(["#3E6A3A", "#6E4E30"][v]), slat = function (u, v2) { return sh(wood, (Math.floor(v2) % 2) ? -0.25 : 0); }, iron = solid("#1E1E1E");
    return { boxes: [{ x: 0, y: 0, z: 0, w: 0.08, d: 0.45, h: 6, top: iron, fy: iron, fx: iron }, { x: 1.32, y: 0, z: 0, w: 0.08, d: 0.45, h: 6, top: iron, fy: iron, fx: iron },
      { x: 0, y: 0, z: 6, w: 1.4, d: 0.12, h: 9, top: slat, fy: slat, fx: slat }, { x: 0, y: 0.12, z: 5, w: 1.4, d: 0.33, h: 2, top: function (u, v2, a, b) { return sh(wood, (Math.floor(b * 8) % 2) ? -0.2 : 0.05); }, fy: slat, fx: slat }] };
  } });
  def("pot", { name: function () { return L2("Blumentopf", "Flower pot"); }, w: 0.45, d: 0.45, variants: 3, group: "deco", build: function (v) {
    var tc = solid("#A0563A", 0.15, 3);
    return { boxes: [{ x: 0, y: 0, z: 0, w: 0.45, d: 0.45, h: 6, top: solid("#3A2A1E"), fy: tc, fx: tc }], extra: function (c, P) {
      var p = P(0.225, 0.225, 6), cols = [["#3E7A34", "#5EA048", "#E05070"], ["#3E7A34", "#6AB050", "#F0D040"], ["#2E6A2E", "#4E9040", "#4E9040"]][v];
      for (var i = 0; i < 26; i++) { var a = h2(i, v, 1) * 6.28, r = h2(i, v, 2) * 4.2, x = Math.round(p[0] + Math.cos(a) * r), y = Math.round(p[1] - 3 + Math.sin(a) * r * 0.8); c.fillStyle = cols[i % 7 === 0 ? 2 : i % 2]; c.fillRect(x, y, 1, 1); }
    } };
  } });
  def("boombox", { name: function () { return L2("Ghettoblaster", "Boombox"); }, w: 0.7, d: 0.3, variants: 2, group: "deco", build: function (v) {
    var body = hex(["#B8BCC0", "#2A2A2E"][v]);
    var front = function (u, v2) { var c1 = (u - 2.5) * (u - 2.5) + (v2 - 4) * (v2 - 4), c2 = (u - 5.5) * (u - 5.5) + (v2 - 4) * (v2 - 4); if (c1 < 4.5 || c2 < 4.5) return (c1 < 1.2 || c2 < 1.2) ? hex("#606468") : hex("#18181A"); if (v2 < 1.4) return hex("#E05030"); return body; };
    return { boxes: [{ x: 0, y: 0, z: 0, w: 0.7, d: 0.3, h: 7, top: function (u, v2, a) { return Math.abs(a - 0.35) < 0.2 ? hex("#18181A") : sh(body, 0.1); }, fy: front, fx: solid(["#9CA0A4", "#222226"][v]) }] };
  } });
  def("trash", { name: function () { return L2("Mülltonne", "Trash can"); }, w: 0.5, d: 0.5, variants: 2, group: "deco", build: function (v) {
    var m = hex(["#5A6A5A", "#6E7076"][v]), rib = function (u, v2) { return sh(m, (Math.floor(v2) % 4 === 0) ? -0.3 : (h2(u | 0, v2 | 0, 2) - 0.5) * 0.1); };
    return { boxes: [{ x: 0, y: 0, z: 0, w: 0.5, d: 0.5, h: 11, top: solid("#3A3E3A"), fy: rib, fx: rib }, { x: -0.04, y: -0.04, z: 11, w: 0.58, d: 0.58, h: 2, top: solid(["#6A7A6A", "#80848A"][v]), fy: solid("#4A524A"), fx: solid("#4A524A") }] };
  } });
  def("dumpster", { name: function () { return L2("Container", "Dumpster"); }, w: 1.6, d: 0.9, variants: 2, group: "deco", build: function (v) {
    var m = hex(["#2E5A3A", "#2E4A6E"][v]), s = function (u, v2) { return sh(m, (Math.floor(u) % 6 === 0) ? -0.25 : (n2(u * 0.3, v2 * 0.3, 4) - 0.5) * 0.2); };
    return { boxes: [{ x: 0, y: 0, z: 0, w: 1.6, d: 0.9, h: 14, top: solid("#1E2A22"), fy: s, fx: s }, { x: 0, y: 0, z: 14, w: 1.6, d: 0.9, h: 1, top: solid("#22262A"), fy: solid("#181818"), fx: solid("#181818") }] };
  } });
  def("hydrant", { name: function () { return L2("Hydrant", "Fire hydrant"); }, w: 0.3, d: 0.3, variants: 1, group: "deco", build: function () {
    var r = solid("#C42A22", 0.15, 2);
    return { boxes: [{ x: 0, y: 0, z: 0, w: 0.3, d: 0.3, h: 9, top: solid("#E04A3A"), fy: r, fx: r }, { x: 0.06, y: 0.06, z: 9, w: 0.18, d: 0.18, h: 3, top: solid("#D8C040"), fy: solid("#B8A030"), fx: solid("#988020") }, { x: -0.06, y: 0.1, z: 5, w: 0.42, d: 0.1, h: 2, top: r, fy: r, fx: r }] };
  } });
  def("lamp", { name: function () { return L2("Straßenlaterne", "Street lamp"); }, w: 0.2, d: 0.2, variants: 1, group: "deco", build: function () {
    var p = solid("#2E3236"), head = function (u, v2) { var c = hex("#F2E2A8"); c = c.slice(); c.glow = [255, 226, 160]; return v2 > 1 ? c : hex("#2E3236"); };
    return { boxes: [{ x: 0, y: 0, z: 0, w: 0.2, d: 0.2, h: 54, top: p, fy: p, fx: p }, { x: 0.2, y: 0.02, z: 52, w: 0.9, d: 0.16, h: 2, top: p, fy: p, fx: p }, { x: 0.8, y: -0.05, z: 49, w: 0.4, d: 0.3, h: 3, top: p, fy: head, fx: head }],
      lights: [{ x: 1.0, y: 0.1, z: 48, r: 54, col: [255, 214, 140] }] };
  } });
  def("fence", { name: function () { return L2("Maschendrahtzaun", "Chain-link fence"); }, w: 2, d: 0.08, variants: 1, group: "deco", build: function () {
    var link = function (u, v2) { if (u < 1 || u > 20.5 || v2 < 1.2) return hex("#7A7E82"); var a = (u + v2) % 3, b = (u - v2 + 99) % 3; return (a < 0.7 || b < 0.7) ? [150, 156, 162, 230] : null; };
    return { boxes: [{ x: 0, y: 0, z: 0, w: 2, d: 0.08, h: 26, top: solid("#7A7E82"), fy: link, fx: solid("#6A6E72") }] };
  } });
  def("crates", { name: function () { return L2("Milchkisten", "Milk crates"); }, w: 0.5, d: 0.5, variants: 3, group: "deco", build: function (v) {
    var cols = ["#E07A20", "#2E5AB0", "#C02A2A"], boxes = [];
    for (var i = 0; i <= v; i++) { var c = hex(cols[(i + v) % 3]), f = function (cc) { return function (u, v2) { return (Math.floor(u) % 3 === 0 && v2 > 1 && v2 < 5) ? sh(cc, -0.45) : cc; }; }(c); boxes.push({ x: 0, y: 0, z: i * 6, w: 0.5, d: 0.5, h: 6, top: function (cc) { return function (u, v2) { return (Math.floor(u) % 3 === 0 || Math.floor(v2) % 3 === 0) ? cc : hex("#1A1A1A"); }; }(c), fy: f, fx: f }); }
    return { boxes: boxes };
  } });
  def("manhole", { name: function () { return L2("Gullideckel (dampft)", "Manhole (steaming)"); }, w: 0.6, d: 0.6, variants: 1, group: "deco", flat: 1, build: function () {
    return { boxes: [{ x: 0, y: 0, z: 0, w: 0.6, d: 0.6, h: 0, top: function (u, v2, a, b) { var d = (a - 0.3) * (a - 0.3) + (b - 0.3) * (b - 0.3); if (d > 0.09) return null; if (d > 0.075) return hex("#1E1E20"); return (Math.floor(a * 20) % 3 === 0 || Math.floor(b * 20) % 3 === 0) ? hex("#4A4A4C") : hex("#2E2E30"); } }], steam: { x: 0.3, y: 0.3 } };
  } });

  // ---------- Sprite-Erzeugung mit Zwischenspeicher ----------
  var CACHE = {};
  // Loch im Boden (z. B. Subway-Abgang): Innenwände und Stufen unter z = 0, auf die Öffnung beschnitten
  function drawHole(img, em, ax, ay, ho, r) {
    var x0 = ho.x, y0 = ho.y, w = ho.w, d = ho.d; if (r) { x0 = ho.y; y0 = ho.x; w = ho.d; d = ho.w; }
    var P = function (x, y, z) { return [ax + (x - y) * HW, ay + (x + y) * HH - z]; };
    var clip = function (px, py) { var a = (px + 0.5 - ax) / HW, b = (py + 0.5 - ay) / HH, gx = (a + b) / 2, gy = (b - a) / 2; return gx >= x0 && gy >= y0 && gx < x0 + w && gy < y0 + d; };
    var D = ho.depth, n = ho.steps, rise = D / n, len = r ? d : w, step = len / n;
    // hintere Wände (zeigen zum Betrachter)
    face(null, img, em, P(x0, y0, 0), [HW, HH], [0, 1], w, D, function (u, v) { return ho.wall(u, v, D); }, -0.1, clip);
    face(null, img, em, P(x0, y0, 0), [-HW, HH], [0, 1], d, D, function (u, v) { return ho.wall(u + 40, v, D); }, -0.25, clip);
    // Stufen: oben an der offenen Seite (+x bzw. +y bei r), nach hinten immer tiefer
    for (var i = n - 1; i >= 0; i--) {
      var z = -(i + 1) * rise, dk = -0.12 - i / n * 0.55;
      if (!r) {
        var xs = x0 + w - (i + 1) * step;
        face(null, img, em, P(xs, y0, z), [HW, HH], [-HW, HH], step, d, function (u, v, a) { return ho.tread(a / step, v); }, dk, clip);
        face(null, img, em, P(xs + step, y0 + d, z + rise), [HW, -HH], [0, 1], d, rise, function (u, v) { return ho.riser(u, v); }, dk - 0.15, clip);
      } else {
        var ys = y0 + d - (i + 1) * step;
        face(null, img, em, P(x0, ys, z), [HW, HH], [-HW, HH], w, step, function (u, v, a, b) { return ho.tread(b / step, u); }, dk, clip);
        face(null, img, em, P(x0, ys + step, z + rise), [HW, HH], [0, 1], w, rise, function (u, v) { return ho.riser(u, v); }, dk - 0.05, clip);
      }
    }
  }
  var CACHE = {};
  RS.sprite = function (t, v, r, fr) {
    fr = fr || 0;
    var k = t + ":" + v + ":" + r + ":" + fr; if (CACHE[k]) return CACHE[k];
    var o = OBJ[t], b = o.build(v || 0, fr), boxes = b.boxes.map(function (q) { return r ? mirror(q) : q; });
    var x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    boxes.forEach(function (q) { [[q.x, q.y], [q.x + q.w, q.y], [q.x, q.y + q.d], [q.x + q.w, q.y + q.d]].forEach(function (p) { var sx = (p[0] - p[1]) * HW, sy = (p[0] + p[1]) * HH; x0 = Math.min(x0, sx); x1 = Math.max(x1, sx); y0 = Math.min(y0, sy - q.z - q.h); y1 = Math.max(y1, sy - q.z); }); });
    var pad = 12 + (b.pad || 0), ax = Math.round(-x0 + pad), ay = Math.round(-y0 + pad + 10), W = Math.round(x1 - x0 + pad * 2), H = Math.round(y1 - y0 + pad * 2 + 10 + (b.hole ? b.hole.depth : 0));
    var cv = RS.canvas(W, H), img = cv.ctx.createImageData(W, H), em = cv.ctx.createImageData(W, H);
    if (b.hole) drawHole(img, em, ax, ay, b.hole, r);
    // Quader von hinten nach vorn (nach Tiefe der Grundfläche, dann Höhe)
    boxes.slice().sort(function (a, bb) {
      var e = 0.001, ab = a.x + a.w <= bb.x + e || a.y + a.d <= bb.y + e, ba = bb.x + bb.w <= a.x + e || bb.y + bb.d <= a.y + e;
      if (ab && !ba) return -1; if (ba && !ab) return 1;
      return a.z - bb.z || (a.x + a.w / 2 + a.y + a.d / 2) - (bb.x + bb.w / 2 + bb.y + bb.d / 2);
    }).forEach(function (q) { drawBox(cv.ctx, img, em, ax, ay, q); });
    cv.ctx.putImageData(img, 0, 0);
    var P = function (x, y, z) { if (r) { var s = x; x = y; y = s; } return [ax + (x - y) * HW, ay + (x + y) * HH - (z || 0)]; };
    var emc = RS.canvas(W, H); emc.ctx.putImageData(em, 0, 0);
    if (b.extra) b.extra(cv.ctx, P, emc.ctx, r);
    var hasEm = !!b.emissive; if (!hasEm) { var ed = emc.ctx.getImageData(0, 0, W, H).data; for (var i = 3; i < ed.length; i += 4) if (ed[i]) { hasEm = true; break; } }
    var W0 = r ? o.d : o.w, D0 = r ? o.w : o.d, sw = function (p) { return r ? Object.assign({}, p, { x: p.y, y: p.x }) : p; };
    var res = { cv: cv, em: hasEm ? emc : null, ax: ax, ay: ay, w: W0, d: D0, def: o, lights: (b.lights || []).map(function (l) { return r ? { x: l.y, y: l.x, z: l.z, r: l.r, col: l.col, day: l.day } : l; }),
      steam: b.steam ? sw(b.steam) : null, fx: b.fx ? b.fx.map(sw) : null, boxes: boxes };
    CACHE[k] = res; return res;
  };
  // Bild eines Objekts zum Zeitpunkt t (animierte Objekte wechseln das Bild; Phase je Position versetzt)
  RS.spriteAt = function (o, t) {
    var d = OBJ[o.t], A = d.anim; if (!A) return RS.sprite(o.t, o.v, o.r);
    var ph = RS.hash2(Math.round(o.x * 10), Math.round(o.y * 10), 17), fr = A.at ? A.at(t + ph * (A.span || 10), o.v) : Math.floor(t * A.fps + ph * A.n) % A.n;
    return RS.sprite(o.t, o.v, o.r, fr);
  };
  function line(c, x0, y0, x1, y1) { x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1); var dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx + dy; for (var i = 0; i < 300; i++) { c.fillRect(x0, y0, 1, 1); if (x0 === x1 && y0 === y1) break; var e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } } }

  RS.ART = { face: face, drawBox: drawBox, solid: solid, windows: windows, brick: brick, pixText: pixText, line: line, def: def, GLASS: GLASS, GLASS2: GLASS2, LIT: LIT, car: car };

  // ===================== Crowd =====================
  // 2D-Figur von vorn, 16 × 30 Pixel, Fußpunkt (8, 28). Frames: 0/1 wippen, 2/3 jubeln (Hände hoch)
  var SKIN = ["#5A3A28", "#7A4E34", "#9A6440", "#C08A60", "#E0B48C", "#3E2A1E"];
  var TOPS = ["#B03028", "#2E5AB0", "#E0A020", "#2E2E30", "#3E7A3E", "#E8E4D8", "#7A3A8A", "#D85A20", "#4A6A8A"];
  var PANTS = ["#2E4A7A", "#1E2A44", "#2A2A2C", "#7A6A4A", "#4A5A3A"];
  var HEAD = ["cap", "capb", "beanie", "durag", "afro", "short", "braids", "hood"];
  RS.PEOPLE_N = 48;
  function personParams(v) {
    var r = RS.rng(v * 7919 + 13);
    var p = { skin: SKIN[Math.floor(r() * SKIN.length)], top: TOPS[Math.floor(r() * TOPS.length)], top2: TOPS[Math.floor(r() * TOPS.length)], pants: PANTS[Math.floor(r() * PANTS.length)],
      head: HEAD[Math.floor(r() * HEAD.length)], hat: TOPS[Math.floor(r() * TOPS.length)], shoes: r() < 0.5 ? "#C89A50" : r() < 0.6 ? "#E8E8E4" : "#1E1E1E", chain: r() < 0.3, wide: r() < 0.5 ? 0 : 1, tall: Math.floor(r() * 3) - 1, jacket: r() < 0.4 };
    return p;
  }
  RS.person = function (v, frame, flip) {
    var k = "p:" + v + ":" + frame + ":" + (flip ? 1 : 0); if (CACHE[k]) return CACHE[k];
    var P = personParams(v), cv = RS.canvas(16, 30), c = cv.ctx, bob = frame === 1 || frame === 3 ? 1 : 0, ty = -P.tall;
    function px(x, y, w, h, col) { c.fillStyle = col; c.fillRect(flip ? 16 - x - w : x, y + bob + ty, w, h); }
    var top = P.top, dark = "rgb(" + sh(hex(top), -0.3).map(Math.round).join(",") + ")";
    // Beine (Baggy) und Schuhe
    px(5, 20, 3, 7, P.pants); px(8, 20, 3, 7, P.pants); px(5 - P.wide, 22, 1, 5, P.pants); px(10 + P.wide, 22, 1, 5, P.pants);
    px(4, 27 - bob, 4, 2, P.shoes); px(8, 27 - bob, 4, 2, P.shoes);
    // Oberkörper (Hoodie/Jacke)
    px(4, 11, 8, 10, top); px(4, 11, 1, 10, dark); if (P.jacket) { px(7, 12, 2, 8, P.top2); px(4, 19, 8, 1, dark); }
    // Arme
    if (frame >= 2) { var up = frame === 2 ? 0 : 1; px(2, 4 + up, 2, 8, top); px(12, 4 + (1 - up), 2, 8, top); px(2, 3 + up, 2, 2, P.skin); px(12, 3 + (1 - up), 2, 2, P.skin); }
    else { px(3, 12, 2, 8, top); px(11, 12, 2, 8, top); px(3, 19, 2, 2, P.skin); px(11, 19, 2, 2, P.skin); }
    if (P.chain) { px(6, 12, 4, 1, "#E8C040"); px(7, 13, 2, 1, "#E8C040"); }
    // Kopf
    px(6, 5, 4, 6, P.skin); px(5, 6, 1, 4, P.skin); px(10, 6, 1, 4, P.skin);
    px(6, 8, 1, 1, "#141414"); px(9, 8, 1, 1, "#141414");
    var hc = P.hat;
    if (P.head === "cap") { px(5, 4, 6, 2, hc); px(6, 6, 6, 1, hc); }
    else if (P.head === "capb") { px(5, 4, 6, 2, hc); px(4, 5, 2, 1, hc); }
    else if (P.head === "beanie") { px(5, 3, 6, 3, hc); px(5, 5, 6, 1, "rgb(" + sh(hex(hc), -0.3).map(Math.round).join(",") + ")"); }
    else if (P.head === "durag") { px(5, 4, 6, 2, "#1E1E1E"); px(10, 6, 2, 3, "#1E1E1E"); }
    else if (P.head === "afro") { px(4, 2, 8, 4, "#1A1410"); px(4, 5, 1, 3, "#1A1410"); px(11, 5, 1, 3, "#1A1410"); }
    else if (P.head === "braids") { px(5, 4, 6, 2, "#1A1410"); px(5, 6, 1, 5, "#1A1410"); px(10, 6, 1, 5, "#1A1410"); }
    else if (P.head === "hood") { px(5, 4, 6, 2, top); px(5, 5, 1, 6, top); px(10, 5, 1, 6, top); }
    else px(6, 4, 4, 1, "#1A1410");
    var res = { cv: cv, ax: 8, ay: 28 }; CACHE[k] = res; return res;
  };
})();
