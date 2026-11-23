/* Monsters Arc – houses.js (seit v0.15)
   Fachwerkhäuser als Objekte (Größe in Kacheln, Tür vorne) und ihre Innenräume.
   - Außen: 3/4-Ansicht wie alle Objekte. Das Bild wird als Höhenfeld gezeichnet (Dach von hinten nach vorn,
     dann die Vorderseite), daher passen Satteldach (First quer) und Giebel vorn (First längs) zusammen.
   - Objekt-Anker (o.x, o.y) = Mitte der Vorderkante der Grundfläche. Kollision: Grundfläche als Rechteck (rect).
   - Varianten 0–3: leichte Farbunterschiede an Fassade, Holz und (ganz leicht) Dach.
   - Innen: Fläche = Außenmaß × 1,5 (aufgerundet), z. B. 5 × 4 → 8 × 6. Zweistöckige Häuser haben eine Treppe,
     die in einen eigenen Raum (Obergeschoss) führt. Der Innenraum ist eine kleine Map (30 × 17, Rest „x“ = schwarz)
     mit Möbeln als Objekten und einem vorgezeichneten Bild für Wände, Teppich, Fußmatte und Treppe (deco). */
(function () {
  var MA = window.MA, L2 = MA.L2, T = MA.TILE, hash = MA.hash2, fbm = MA.fbm;
  var FH0 = 30, FH1 = 24;   // Höhe Erdgeschoss / Obergeschoss in px
  var OV = 3, PADX = 5;     // Dachüberstand, Rand im Bild

  // Noahs fünf Häuser für das erste Dorf. door = Kachel (von links) mit der Tür, ridge x = First quer, y = Giebel vorn
  var HOUSES = [
    { id: "house75", w: 7, d: 5, fl: 2, chim: 1, ridge: "x", door: 3 },
    { id: "house65", w: 6, d: 5, fl: 1, chim: 1, ridge: "x", door: 1 },
    { id: "house57", w: 5, d: 7, fl: 2, chim: 0, ridge: "y", door: 2 },
    { id: "house54", w: 5, d: 4, fl: 1, chim: 0, ridge: "x", door: 2 },
    { id: "house76", w: 7, d: 6, fl: 2, chim: 1, ridge: "x", door: 2 },
    // seit v0.19.9: Supermarkt – modernes Ladengeschoss (Glasfront, Schiebetür, Schild) in einem Fachwerkhaus
    { id: "market107", w: 10, d: 7, fl: 2, chim: 0, ridge: "x", door: 4, shop: 1 }
  ];
  var PLASTER = [[230, 221, 199], [221, 214, 201], [229, 213, 180], [216, 207, 188]];
  var TIMBER = [[78, 52, 34], [66, 46, 33], [88, 59, 38], [72, 51, 37]];
  var ROOF = [[148, 72, 54], [141, 71, 57], [152, 79, 57], [138, 75, 60]];

  function geom(h) {
    var W = h.w * T, D = h.d * T, Hw = h.fl === 2 ? FH0 + FH1 : FH0, rh = Math.round((h.ridge === "x" ? D : W) * 0.42);
    return { W: W, D: D, Hw: Hw, rh: rh, offY: Hw + rh + 16 };
  }
  function roofZ(h, g, x, y) {
    return h.ridge === "x" ? g.rh * (1 - Math.abs(y - g.D / 2) / (g.D / 2)) : g.rh * (1 - Math.abs(x - g.W / 2) / (g.W / 2));
  }
  function mul(c, k) { return [c[0] * k, c[1] * k, c[2] * k]; }

  function drawHouse(h, ctx, v) {
    var g = geom(h), W = g.W, D = g.D, Hw = g.Hw, cw = W + PADX * 2, chh = g.offY + D + OV + 3;
    var img = ctx.createImageData(cw, chh), buf = img.data;
    var PL = PLASTER[v % 4], TB = TIMBER[v % 4], RF = ROOF[v % 4], sd = h.w * 31 + h.d * 7 + v * 101;
    function put(x, s, c) {
      var px = x + PADX, py = s; if (px < 0 || py < 0 || px >= cw || py >= chh) return;
      var i = (py * cw + px) * 4; buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2]; buf[i + 3] = 255;
    }
    function get(x, s) { var i = (s * cw + x + PADX) * 4; return [buf[i], buf[i + 1], buf[i + 2]]; }

    // ---- Dach ----
    function roofCol(x, y) {
      var rx = h.ridge === "x", dist = rx ? Math.abs(y + 0.5 - D / 2) : Math.abs(x + 0.5 - W / 2);
      var along = rx ? x : y, row = Math.floor(dist / 4), ai = along + (row & 1) * 3, ti = Math.floor(ai / 6);
      var edge = rx ? (x < -1 || x >= W + 1) : (y > D + 1 || y < -1);
      if (edge) return mul(TB, 0.95);
      var lit = rx ? (y + 0.5 > D / 2 ? 1 : 0.78) : (x + 0.5 < W / 2 ? 1 : 0.8);
      var c = mul(RF, lit * (0.93 + hash(ti, row, sd) * 0.14));
      if (dist < 2.5) return mul(RF, 0.66 * (0.95 + hash(ai >> 2, 1, sd) * 0.1));   // Firstziegel
      if (dist % 4 < 1) c = mul(c, 0.76);                                            // Ziegelreihen
      else if (((ai % 6) + 6) % 6 === 0) c = mul(c, 0.88);
      return c;
    }
    var eaveS = {};
    function roofPass(y0, y1, mark) {
      for (var x = -OV; x < W + OV; x++) {
        var prev = null;
        for (var y = y0; y <= y1; y++) {
          var z = Hw + roofZ(h, g, x + 0.5, y + 0.5), s = Math.round(y - z + g.offY), c = roofCol(x, y);
          if (prev === null) put(x, s, c);
          else for (var q = Math.min(prev, s); q <= Math.max(prev, s); q++) put(x, q, c);
          prev = s;
        }
        if (mark) eaveS[x] = prev;
      }
    }
    roofPass(-OV, D + OV, false);

    // ---- Schornstein ----
    if (h.chim) {
      var cx0 = h.ridge === "x" ? Math.round(W * 0.7) : Math.round(W / 2 + W * 0.2), cy0 = h.ridge === "x" ? Math.round(D / 2 + 1) : Math.round(D * 0.3);
      var zTop = Hw + g.rh + 10, cyF = cy0 + 7;
      for (var x = cx0; x < cx0 + 9; x++) {
        var zb = Hw + roofZ(h, g, x + 0.5, cyF) - 2;
        for (var z = Math.floor(zb); z <= zTop; z++) {
          var s = cyF - z + g.offY, row = (zTop - z) >> 2, joint = (zTop - z) % 4 === 3 || ((x - cx0 + (row & 1) * 2) % 5 === 4);
          var c = zTop - z < 2 ? [128, 122, 112] : joint ? [92, 82, 74] : mul([146, 76, 56], 0.92 + hash(x, row, sd + 9) * 0.14);
          if (x === cx0) c = mul(c, 1.12); else if (x === cx0 + 8) c = mul(c, 0.8);
          put(x, s, c);
        }
        for (var y = cy0; y < cyF; y++) put(x, y - zTop + g.offY, (x > cx0 + 1 && x < cx0 + 7 && y > cy0 + 1 && y < cyF - 1) ? [34, 28, 26] : [138, 132, 120]);
      }
    }

    // ---- Vorderseite (Fachwerk) ----
    var upW = []; for (var i = 0; i < h.w; i++) upW.push(i % 2 === 1);
    var gW = []; for (i = 0; i < h.w; i++) gW.push(i !== h.door && Math.abs(i - h.door) % 2 === 1);
    var box = []; for (i = 0; i < h.w; i++) box.push(hash(i, v, sd + 5) > 0.45);
    function plaster(x, z) { var n = (fbm(x / 4, z / 4, sd + 3, 2) - 0.5) * 10 + (hash(x, z, sd) - 0.5) * 5 - (z < 10 ? (10 - z) * 0.8 : 0); return [PL[0] + n, PL[1] + n, PL[2] + n * 1.1]; }
    function brace(lx, z, za, zb, cross, flip) {
      var u = (lx - 2) / 13, t = (z - za) / (zb - za); if (flip) u = 1 - u;
      return Math.abs(u - t) < 0.11 || (cross && Math.abs(u - (1 - t)) < 0.11);
    }
    function win(lx, z, z0, z1, glass) {   // Fenster: Rahmen, Sprossenkreuz, Glanz
      if (lx < 4 || lx >= 12 || z < z0 || z >= z1) return null;
      if (lx === 4 || lx === 11 || z === z0 || z === z1 - 1) return TB;
      var mz = Math.floor((z0 + z1) / 2);
      if (lx === 7 || z === mz) return [150, 112, 74];
      if ((lx - (z - z0)) === 1 || (lx - (z - z0)) === 2) return [128, 156, 176];
      return glass;
    }
    // Ladengeschoss (Supermarkt): Glasfront mit Metallrahmen, Schiebetür, Schild „MARKT“
    var FONT = { M: ["10001", "11011", "10101", "10001", "10001"], A: ["01110", "10001", "11111", "10001", "10001"], R: ["11110", "10001", "11110", "10010", "10001"], K: ["10001", "10010", "11100", "10010", "10001"], T: ["11111", "00100", "00100", "00100", "00100"] };
    var SIGN = "MARKT", sx0 = Math.round(W / 2 - (SIGN.length * 6 - 1) / 2), MET = [62, 66, 70], METL = [118, 124, 128];
    function shopFront(x, z, i, lx) {
      var zs = FH0 - 11;   // Unterkante des Schildes
      if (z >= zs) {       // Schild über der ganzen Front
        if (z === zs || z === FH0 - 3) return METL;
        var r = FH0 - 5 - z, cxl = x - sx0, li = Math.floor(cxl / 6), lc = cxl - li * 6;
        if (r >= 0 && r < 5 && li >= 0 && li < SIGN.length && lc < 5 && FONT[SIGN[li]][r][lc] === "1") return [246, 244, 236];
        return x < 3 || x >= W - 3 ? MET : [74, 109, 124];
      }
      if (z < 2) return [70, 72, 74];
      var glass = function () {
        var c = [96, 138, 156];
        if (((x + z) % 26) < 3 || ((x + z + 9) % 26) === 0) c = [168, 202, 212];          // Spiegelung
        else if (z === 7 || z === 13) c = MA.mix(c, [hash(x >> 1, z, sd) > 0.5 ? 196 : 120, 120, 90], 0.35);   // Regale dahinter
        return c;
      };
      if (i === h.door && lx >= 2 && lx < 14) {   // Schiebetür aus Glas
        if (lx === 2 || lx === 13 || z === zs - 1 || lx === 7 || lx === 8) return MET;
        return mul(glass(), 1.06);
      }
      if (x < 2 || x >= W - 2 || lx < 2 || z === 2 || z === zs - 1) return lx === 1 || x === W - 1 ? METL : MET;   // Rahmen
      return glass();
    }
    function facade(x, z) {
      var i = Math.floor(x / T), lx = x - i * T, gz = Hw + (h.ridge === "y" ? roofZ(h, g, x + 0.5, D) : 0);
      if (z >= Hw) {   // Giebel
        if (Math.abs(x + 0.5 - W / 2) < 1.2) return TB;
        if (z >= Hw + 13 && z < Hw + 15) return TB;
        var gw = Math.abs(x + 0.5 - W / 2) < 6 && z >= Hw + 3 && z < Hw + 11;
        if (gw) { var wl = x + 0.5 - W / 2; if (Math.abs(wl) > 4.5 || z === Hw + 3 || z === Hw + 10) return TB; if (Math.abs(wl) < 1.5 || z === Hw + 7) return [150, 112, 74]; return [56, 78, 100]; }
        if (z < Hw + 2) return TB;
        return plaster(x, z);
      }
      if (h.shop && z < FH0 - 2) return shopFront(x, z, i, lx);
      // Tür (ersetzt Sockel)
      if (i === h.door && lx >= 3 && lx < 13 && z < 22) {
        if (z >= 20 || lx === 3 || lx === 12) return TB;
        if (lx === 10 && z === 10) return [214, 182, 92];
        return lx % 3 === 1 ? [96, 60, 34] : mul([122, 80, 46], 0.95 + hash(lx, z >> 3, sd) * 0.1);
      }
      if (z < 4) {   // Sockel aus Stein
        var row = z >> 1, j = (x + (row & 1) * 4) % 8 === 0 || z === 1;
        return j ? [86, 82, 76] : mul([124, 118, 108], 0.92 + hash(x >> 3, row, sd + 2) * 0.14);
      }
      if (x < 2 || x >= W - 2 || lx < 2) return TB;                          // Ständer
      if (z < 6 || (z >= FH0 - 2 && z < FH0) || (h.fl === 2 && z >= Hw - 2)) return TB;   // Schwelle, Rähm
      if (z < FH0) {   // Erdgeschoss
        if (gW[i]) {
          if (box[i] && z >= 7 && z < 9 && lx >= 3 && lx < 13) return z === 8 ? [96, 64, 40] : (hash(x, z, sd + 4) > 0.45 ? [196, 64, 60] : [112, 132, 60]);
          var wc = win(lx, z, 10, 23, [56, 78, 100]); if (wc) return wc;
          if (z === 9 && lx >= 3 && lx < 13) return [168, 158, 140];
          return plaster(x, z);
        }
        if (i !== h.door && brace(lx, z, 6, FH0 - 2, false, i > h.w / 2 - 0.5)) return TB;
        return plaster(x, z);
      }
      // Obergeschoss
      if (upW[i]) { var wu = win(lx, z, FH0 + 5, FH0 + 17, [56, 78, 100]); if (wu) return wu; if (z === FH0 + 4 && lx >= 3 && lx < 13) return [168, 158, 140]; return plaster(x, z); }
      if (brace(lx, z, FH0, Hw - 2, true, false)) return TB;
      return plaster(x, z);
    }
    for (var fx = 0; fx < W; fx++) {
      var zt = Hw + (h.ridge === "y" ? Math.max(0, roofZ(h, g, fx + 0.5, D) - 2) : 0);
      for (var fz = 0; fz < zt; fz++) put(fx, D - fz + g.offY - 1, mul(facade(fx, fz), 0.97));
    }
    // vorderer Dachüberstand über der Fassade, darunter ein Schattenstreifen
    roofPass(D, D + OV, true);
    for (var ex = 0; ex < W; ex++) for (var k = 1; k <= 2; k++) { var es = eaveS[ex] + k; if (es < g.offY + D - 4) put(ex, es, mul(get(ex, es), k === 1 ? 0.62 : 0.8)); }
    ctx.putImageData(img, 0, 0);
  }

  // Schatten (seit v0.16): Haus als 3D-Körper (Kasten + Dach mit Überstand und First), Schornstein extra.
  // Ersetzt den flachen Silhouetten-Schatten, der das ganze Bild wie eine Platte auf den Boden gelegt hat.
  function shadow(sc, sh, o) {
    var h = MA.OBJECTS[o.t].house, g = geom(h), W = g.W, D = g.D, Hw = g.Hw, X = o.x - W / 2, Y = o.y - D;
    var pts = [[0, 0, 0], [W, 0, 0], [0, D, 0], [W, D, 0], [0, 0, Hw], [W, 0, Hw], [0, D, Hw], [W, D, Hw]];
    [[-OV, -OV], [W + OV, -OV], [-OV, D + OV], [W + OV, D + OV]].forEach(function (c) { pts.push([c[0], c[1], Hw + roofZ(h, g, c[0], c[1])]); });
    if (h.ridge === "x") pts.push([-OV, D / 2, Hw + g.rh], [W + OV, D / 2, Hw + g.rh]);
    else pts.push([W / 2, -OV, Hw + g.rh], [W / 2, D + OV, Hw + g.rh]);
    MA.shadowHull(sc, sh, pts.map(function (p) { return [X + p[0], Y + p[1], p[2]]; }));
    if (h.chim) {
      var cx0 = h.ridge === "x" ? Math.round(W * 0.7) : Math.round(W / 2 + W * 0.2), cy0 = h.ridge === "x" ? Math.round(D / 2 + 1) : Math.round(D * 0.3);
      MA.shadowBox(sc, sh, X + cx0, Y + cy0, X + cx0 + 9, Y + cy0 + 7, Hw + g.rh + 10, Hw + roofZ(h, g, cx0 + 4, cy0 + 7));
    }
  }

  // Als Objekte anmelden (im Objekt-Werkzeug wählbar)
  HOUSES.forEach(function (h) {
    var g = geom(h);
    MA.OBJECTS[h.id] = {
      name: function () { return h.shop ? L2("Supermarkt ", "Supermarket ") + h.w + "×" + h.d : L2("Fachwerkhaus ", "Timber house ") + h.w + "×" + h.d; },
      w: g.W + PADX * 2, h: g.offY + g.D + OV + 3, ax: PADX + g.W / 2, ay: g.offY + g.D, variants: 4,
      house: h, grid: true, shadow: function (sc, sh, o) { shadow(sc, sh, o); }, canopy: g.D + g.Hw - 6, rect: [-g.W / 2, -g.D, g.W / 2, 0], fx: { chips: ["#8A6A4A", "#C9BFA8", "#8E4A36"] },
      draw: function (p, ctx, rnd, v) { drawHouse(h, ctx, v); }
    };
  });

  // ---------- Möbel (nur innen) ----------
  var WD = "#8A5E3A", WDL = "#A8784C", WDD = "#5E3E26";
  MA.OBJECTS.m_table = {
    name: function () { return L2("Tisch", "Table"); }, inner: true, w: 34, h: 26, ax: 17, ay: 23, variants: 1, solid: [[-7, -5, 7], [7, -5, 7]],
    draw: function (p) {
      p.rect(4, 17, 3, 6, WDD); p.rect(27, 17, 3, 6, WDD); p.rect(15, 18, 3, 5, WDD);
      p.rect(1, 9, 32, 9, WD); p.rect(1, 9, 32, 1, WDL); p.rect(1, 16, 32, 2, WDD);
      for (var x = 4; x < 32; x += 7) p.rect(x, 10, 1, 6, "#7A5232");
      p.rect(8, 6, 4, 5, "#C9C2B2"); p.rect(8, 6, 4, 1, "#E4DED0"); p.px(12, 8, "#C9C2B2");           // Krug
      p.ell(23, 11, 4, 1.6, "#D8D2C4"); p.ell(23, 11, 2.5, 0.9, "#B88A4A");                          // Teller mit Brot
    }
  };
  MA.OBJECTS.m_shelf = {
    name: function () { return L2("Regal", "Shelf"); }, inner: true, w: 26, h: 36, ax: 13, ay: 34, variants: 2, solid: [[-5, -3, 6], [5, -3, 6]],
    draw: function (p, ctx, rnd) {
      p.rect(1, 2, 24, 32, WDD); p.rect(2, 3, 22, 30, "#4A3020");
      [3, 12, 21].forEach(function (y) {
        for (var x = 3; x < 23;) { var bw = 2 + ((rnd() * 2) | 0), bh = 6 + ((rnd() * 3) | 0), cols = ["#8E3A30", "#3E5A7A", "#5E7A3E", "#B08A3A", "#6A4A6E"]; if (rnd() < 0.15) { x += 2; continue; } p.rect(x, y + 9 - bh, bw, bh, cols[(rnd() * cols.length) | 0]); p.rect(x, y + 9 - bh, bw, 1, "#D8C8A8"); x += bw; }
        p.rect(2, y + 9, 22, 2, WD); p.rect(2, y + 9, 22, 1, WDL);
      });
      p.rect(1, 2, 24, 1, WDL); p.rect(1, 33, 24, 1, "#3A2616");
    }
  };
  MA.OBJECTS.m_bed = {
    name: function () { return L2("Bett", "Bed"); }, inner: true, w: 22, h: 38, ax: 11, ay: 35, variants: 3, solid: [[0, -7, 8], [0, -19, 8]],
    draw: function (p, ctx, rnd, v) {
      var bl = [["#8E3A30", "#B04A3C"], ["#3E5A7A", "#5274A0"], ["#5E7A3E", "#789A4E"]][v];
      p.rect(1, 2, 20, 34, WDD); p.rect(1, 2, 20, 6, WD); p.rect(1, 2, 20, 1, WDL);
      p.rect(3, 7, 16, 27, "#E8E2D4"); p.rect(4, 8, 14, 6, "#F6F2EA"); p.rect(4, 13, 14, 1, "#CFC8B8");
      p.rect(3, 16, 16, 18, bl[0]); p.rect(3, 16, 16, 2, bl[1]); for (var y = 20; y < 34; y += 4) p.rect(3, y, 16, 1, bl[1]);
      p.rect(1, 34, 20, 2, "#3A2616");
    }
  };
  MA.OBJECTS.m_barrel = {
    name: function () { return L2("Fass", "Barrel"); }, inner: true, w: 16, h: 20, ax: 8, ay: 18, variants: 1, solid: [[0, -3, 6]],
    draw: function (p) {
      p.rect(2, 4, 12, 14, WD); p.rect(3, 3, 10, 1, WD); p.rect(2, 4, 2, 14, WDL); p.rect(12, 4, 2, 14, WDD);
      p.rect(2, 6, 12, 1, "#4A4A4E"); p.rect(2, 14, 12, 1, "#4A4A4E"); p.ell(8, 3.5, 5, 1.6, "#A8784C"); p.ell(8, 3.5, 3.4, 0.8, "#8A5E3A");
    }
  };
  MA.OBJECTS.m_pot = {
    name: function () { return L2("Topfpflanze", "Potted plant"); }, inner: true, w: 14, h: 22, ax: 7, ay: 20, variants: 1, solid: [[0, -2, 4]],
    draw: function (p, ctx, rnd) {
      p.rect(3, 13, 8, 7, "#A65A3C"); p.rect(2, 12, 10, 2, "#C06A48"); p.rect(9, 14, 2, 6, "#86462E");
      for (var i = 0; i < 26; i++) { var a = rnd() * 6.28, r = rnd() * 5; p.px(7 + Math.cos(a) * r, 7 + Math.sin(a) * r * 0.9, rnd() < 0.5 ? "#4E7A34" : "#6E9A44"); }
    }
  };
  MA.OBJECTS.m_hearth = {
    name: function () { return L2("Kamin", "Fireplace"); }, inner: true, w: 34, h: 40, ax: 17, ay: 37, variants: 1, frames: 3, fps: 7, solid: [[0, -4, 12]],
    light: { dx: 0, dy: -10, r: 70, col: [255, 150, 70] },
    draw: function (p, ctx, rnd, v, fr) {
      for (var y = 2; y < 36; y++) for (var x = 2; x < 32; x++) { var row = y >> 2, j = y % 4 === 0 || (x + (row & 1) * 3) % 6 === 0; p.px(x, y, j ? "#5E5850" : (MA.hash2(x >> 1, row, 5) > 0.5 ? "#8E887E" : "#7C766C")); }
      p.rect(0, 2, 34, 3, "#6A4A30"); p.rect(0, 2, 34, 1, "#8A6440");
      p.rect(8, 16, 18, 20, "#1E1614"); p.rect(8, 16, 18, 1, "#3A2C24");
      var f = ["#FFD27A", "#F0903A", "#C8502A"];
      for (var i = 0; i < 18; i++) { var fx = 11 + ((i * 7 + fr * 5) % 12), fh = 3 + ((i * 3 + fr * 2) % 7); p.rect(fx, 35 - fh, 1, fh, f[(i + fr) % 3]); }
      p.rect(11, 33, 12, 2, "#5E3E26");
    }
  };

  // Ladenmöbel (Supermarkt, seit v0.19.9) – 3/4-Ansicht: Oberseite sichtbar
  var PROD = ["#C84A3C", "#E8C048", "#4A86B4", "#5E9A4A", "#E07A3A", "#8A5AA8", "#F2EEE2", "#3A3A40"];
  MA.OBJECTS.m_aisle = {
    name: function () { return L2("Regalinsel", "Shelf island"); }, inner: true, w: 34, h: 30, ax: 17, ay: 27, variants: 3, solid: [[-9, -5, 7], [9, -5, 7]],
    draw: function (p, ctx, rnd) {
      p.rect(1, 4, 32, 7, "#A8ACAE"); p.rect(1, 4, 32, 1, "#C8CCCE");                 // Oberseite (Deckplatte)
      for (var x = 3; x < 31; x += 3) p.rect(x, 5, 2, 4, PROD[(rnd() * PROD.length) | 0]);   // Waren oben
      p.rect(1, 11, 32, 16, "#6A6E72"); p.rect(1, 11, 1, 16, "#8A8E92"); p.rect(32, 11, 1, 16, "#4A4E52");
      [12, 18].forEach(function (y) {
        for (var x = 2; x < 32;) { var bw = 2 + ((rnd() * 3) | 0), bh = 3 + ((rnd() * 2) | 0), c = PROD[(rnd() * PROD.length) | 0]; p.rect(x, y + 5 - bh, bw, bh, c); p.px(x, y + 5 - bh, "#F6F2EA"); x += bw + (rnd() < 0.2 ? 1 : 0); }
        p.rect(1, y + 5, 32, 1, "#C8CCCE");
      });
      p.rect(1, 24, 32, 3, "#4A4E52"); p.rect(4, 24, 8, 1, "#ED6A5E");                 // Sockel, Preisschild
    }
  };
  MA.OBJECTS.m_fridge = {
    name: function () { return L2("Kühlregal", "Fridge"); }, inner: true, w: 34, h: 40, ax: 17, ay: 37, variants: 1, solid: [[-8, -3, 7], [8, -3, 7]],
    draw: function (p, ctx, rnd) {
      p.rect(1, 2, 32, 4, "#D8DCDE"); p.rect(1, 2, 32, 1, "#F0F2F2");                  // Oberseite
      p.rect(1, 6, 32, 31, "#E4E6E6"); p.rect(32, 6, 1, 31, "#A8ACAE");
      [2, 17].forEach(function (dx) {
        p.rect(dx + 1, 8, 13, 24, "#7AA6BA");
        for (var y = 10; y < 30; y += 6) { for (var x = dx + 2; x < dx + 13; x += 2) p.rect(x, y, 1, 4, ["#F2EEE2", "#4A86B4", "#C84A3C", "#5E9A4A"][(rnd() * 4) | 0]); p.rect(dx + 1, y + 4, 13, 1, "#C8DCE4"); }
        p.rect(dx + 2, 9, 1, 22, "#B8D8E4"); p.rect(dx + 12, 18, 1, 5, "#5E6266");      // Glanz, Griff
      });
      p.rect(1, 33, 32, 4, "#5E6266"); p.rect(2, 3, 30, 1, "#62929E");
    }
  };
  MA.OBJECTS.m_checkout = {
    name: function () { return L2("Kasse", "Checkout"); }, inner: true, w: 30, h: 26, ax: 15, ay: 23, variants: 1, solid: [[-6, -3, 6], [6, -3, 6]],
    draw: function (p) {
      p.rect(1, 8, 28, 5, "#B8BCBE"); p.rect(3, 9, 18, 3, "#2A2C2E"); p.rect(3, 9, 18, 1, "#4A4C4E");   // Oberseite mit Laufband
      p.rect(1, 13, 28, 10, "#8A5E3A"); p.rect(1, 13, 28, 1, "#A8784C"); p.rect(28, 13, 1, 10, "#5E3E26"); p.rect(1, 22, 28, 1, "#3A2616");
      p.rect(22, 3, 6, 6, "#3A3C40"); p.rect(23, 4, 4, 3, "#7ACB6A"); p.rect(22, 2, 6, 1, "#5A5C60");   // Kassenterminal
      p.rect(6, 9, 3, 2, "#E8C048"); p.rect(11, 9, 2, 2, "#C84A3C");                                   // Waren auf dem Band
    }
  };

  // ---------- Innenraum ----------
  function rect(x0, y0, x1, y1) { return { x0: x0, y0: y0, x1: x1, y1: y1 }; }
  function inR(r, x, y) { return r && x >= r.x0 && x < r.x1 && y >= r.y0 && y < r.y1; }

  function interior(o, floor) {
    var h = MA.OBJECTS[o.t].house, iw = Math.ceil(h.w * 1.5), ih = Math.ceil(h.d * 1.5), C = 30, R = 17;
    var map = new MA.maps.GameMap({ cols: C, rows: R, name: "inside" });
    var rx = Math.floor((C - iw) / 2), ry = Math.max(2, Math.floor((R - ih) / 2) + 1);
    for (var i = 0; i < C * R; i++) map.tiles[i] = "x";
    for (var ty = ry; ty < ry + ih; ty++) for (var tx = rx; tx < rx + iw; tx++) map.tiles[ty * C + tx] = h.shop ? "i" : "d";
    var rnd = MA.rng(((o.x * 7 + o.y * 13) | 0) + floor * 101 + 5);
    var mx = rx + Math.min(iw - 1, Math.floor((h.door + 0.5) * 1.5));
    var stLeft = mx >= rx + iw / 2, st = h.fl === 2 && !h.shop ? { tx: stLeft ? rx : rx + iw - 2, ty: ry } : null;
    var X0 = rx * T, Y0 = ry * T, X1 = (rx + iw) * T, Y1 = (ry + ih) * T, cxm = (X0 + X1) / 2, objs = [];
    function add(t, x, y, v) { objs.push({ t: t, x: Math.round(x), y: Math.round(y), v: v || 0 }); }
    var farX = stLeft ? X1 - 22 : X0 + 22, nearX = stLeft ? X0 + 50 : X1 - 50;   // Seite ohne Treppe / Mitte daneben
    if (h.shop) {
      // Supermarkt: Kühlregale an der Rückwand, zwei Reihen Regalinseln (Gang zur Tür frei), Kassen neben dem Eingang
      var dxm = mx * T + 8;
      for (var fx = X0 + 22; fx <= X1 - 22; fx += 34) add("m_fridge", fx, Y0 + 12);
      [Y0 + 62, Y0 + 106].forEach(function (ay) { for (var axx = X0 + 30; axx <= X1 - 30; axx += 36) if (Math.abs(axx - dxm) > 34) add("m_aisle", axx, ay, (rnd() * 3) | 0); });
      add("m_checkout", dxm - 46, Y1 - 26); add("m_checkout", dxm + 46, Y1 - 26);
      add("m_pot", X0 + 10, Y1 - 6); add("m_pot", X1 - 10, Y1 - 6);
    } else if (floor === 0) {
      add("m_shelf", st ? farX : X0 + 22, Y0 + 12, (rnd() * 2) | 0);
      if (h.chim) add("m_hearth", st ? (cxm + farX) / 2 : cxm, Y0 + 10);
      add("m_table", cxm, Y0 + ih * T * 0.55);
      add("m_barrel", mx * T + 8 < cxm ? X1 - 12 : X0 + 12, Y1 - 6);
      if (iw > 7) add("m_pot", mx * T + 8 < cxm ? X0 + 10 : X1 - 10, Y1 - 6);
      if (h.fl === 1) add("m_bed", X1 - 16, Y0 + 40, (rnd() * 3) | 0);
    } else {
      var nb = iw >= 10 ? 2 : 1;
      for (var b = 0; b < nb; b++) add("m_bed", (stLeft ? X1 - 16 : X0 + 16) + (stLeft ? -1 : 1) * b * 28, Y0 + 40, (rnd() * 3) | 0);
      add("m_shelf", cxm + (stLeft ? 10 : -10), Y0 + 12, (rnd() * 2) | 0);
      add("m_pot", stLeft ? X1 - 12 : X0 + 12, Y1 - 6);
      add("m_barrel", stLeft ? X0 + 12 : X1 - 12, Y1 - 6);
    }
    map.obj = objs;

    // Wände, Teppich, Fußmatte, Treppe als ein Bild (liegt über dem Boden, unter Möbeln und Figur)
    var dc = MA.canvas(C * T, R * T), g = dc.ctx, var0 = o.v || 0, PL = PLASTER[var0 % 4], TB = TIMBER[var0 % 4];
    function fill(x, y, w, hh, c) { g.fillStyle = MA.rgb(c); g.fillRect(x, y, w, hh); }
    // Rückwand (2 Kacheln hoch) im Fachwerk
    for (var y = Y0 - 32; y < Y0; y++) for (var x = X0; x < X1; x++) {
      var ly = y - (Y0 - 32), lx = x - X0, c;
      if (ly < 3) c = mul(TB, 0.8);
      else if (ly >= 24) c = ly === 24 ? [150, 108, 70] : ly === 31 ? [70, 48, 32] : (lx % 6 === 0 ? [100, 68, 42] : [124, 86, 54]);
      else if (lx % 48 < 3 || lx >= X1 - X0 - 3 || (ly >= 12 && ly < 14)) c = TB;
      else { var n = (fbm(x / 4, y / 4, 17, 2) - 0.5) * 10; c = [PL[0] - 14 + n, PL[1] - 14 + n, PL[2] - 12 + n]; }
      fill(x, y, 1, 1, c);
    }
    fill(X0, Y0, X1 - X0, 2, [40, 30, 24]); g.globalAlpha = 0.35; fill(X0, Y0 + 2, X1 - X0, 2, [40, 30, 24]); g.globalAlpha = 1;
    // Fenster in der Rückwand (wo Platz ist)
    var used = objs.filter(function (q) { return q.y < Y0 + 16; }).map(function (q) { return q.x; }); if (st) used.push((st.tx + 1) * T);
    for (var wx = X0 + 24; wx < X1 - 20; wx += 48) {
      if (used.some(function (u) { return Math.abs(u - wx) < 24; })) continue;
      for (var yy = 0; yy < 10; yy++) for (var xx = 0; xx < 12; xx++) {
        var edge = xx === 0 || xx === 11 || yy === 0 || yy === 9, mid = xx === 5 || xx === 6 || yy === 4;
        fill(wx - 6 + xx, Y0 - 26 + yy, 1, 1, edge ? TB : mid ? [150, 112, 74] : (yy < 3 ? [196, 224, 236] : [156, 196, 216]));
      }
    }
    // Seiten- und Vorderwand (dunkler Holzrahmen)
    fill(X0 - 4, Y0 - 36, X1 - X0 + 8, 4, mul(TB, 0.7));
    fill(X0 - 4, Y0 - 36, 4, Y1 - Y0 + 40, mul(TB, 0.7)); fill(X0 - 1, Y0 - 32, 1, Y1 - Y0 + 32, mul(TB, 1.2));
    fill(X1, Y0 - 36, 4, Y1 - Y0 + 40, mul(TB, 0.7)); fill(X1, Y0 - 32, 1, Y1 - Y0 + 32, mul(TB, 1.2));
    fill(X0 - 4, Y1, X1 - X0 + 8, 4, mul(TB, 0.7)); fill(X0, Y1, X1 - X0, 1, mul(TB, 1.2));
    var mat = null;
    if (floor === 0) {
      fill(mx * T, Y1, T, 4, [8, 8, 10]);   // Türöffnung
      for (var my = 0; my < 9; my++) for (var mxx = 0; mxx < 14; mxx++) fill(mx * T + 1 + mxx, Y1 - 10 + my, 1, 1, my === 0 || my === 8 || mxx === 0 || mxx === 13 ? [110, 66, 40] : ((mxx + my) % 3 === 0 ? [176, 120, 70] : [150, 96, 58]));
      mat = rect(mx * T, Y1 - 10, mx * T + T, Y1);
    }
    // Teppich
    var rgx = floor === 0 ? cxm : (stLeft ? X1 - 40 : X0 + 40), rgy = floor === 0 ? Y0 + ih * T * 0.55 - 6 : Y0 + 66, rw = Math.min(70, (iw - 4) * T), rhh = 30;
    if (floor === 1) { rw = 40; rhh = 24; }
    if (h.shop) rhh = 0;   // kein Teppich im Laden
    for (var qy = 0; qy < rhh; qy++) for (var qx = 0; qx < rw; qx++) {
      var bd = qx < 2 || qy < 2 || qx >= rw - 2 || qy >= rhh - 2, bd2 = qx === 4 || qy === 4 || qx === rw - 5 || qy === rhh - 5;
      fill(rgx - rw / 2 + qx, rgy - rhh / 2 + qy, 1, 1, bd ? [170, 130, 76] : bd2 ? [196, 160, 96] : (((qx >> 2) + (qy >> 2)) % 2 ? [140, 58, 50] : [124, 50, 46]));
    }
    // Treppe: unten hoch (Erdgeschoss), oben Öffnung nach unten (Obergeschoss)
    var stairs = null;
    if (st) {
      var sx = st.tx * T, sy = st.ty * T;
      for (var s = 0; s < 8; s++) {
        var yTop = sy - 16 + s * 6, up = floor === 0, k = up ? 0.75 + (8 - s) * 0.05 : 0.45 + s * 0.08;
        fill(sx + 3, yTop, 26, 6, mul([150, 106, 66], k)); fill(sx + 3, yTop, 26, 1, mul([186, 140, 92], k)); fill(sx + 3, yTop + 5, 26, 1, mul([70, 46, 30], k));
      }
      fill(sx, sy - 18, 3, 50, mul(TB, 0.9)); fill(sx + 29, sy - 18, 3, 50, mul(TB, 0.9)); fill(sx, sy - 18, 32, 2, mul(TB, 1.1));
      if (floor === 1) { g.globalAlpha = 0.45; fill(sx + 3, sy - 16, 26, 20, [10, 8, 8]); g.globalAlpha = 1; }
      stairs = rect(sx + 3, sy, sx + 29, sy + 26);
    }
    return {
      map: map, deco: dc, floor: floor, mat: mat, stairs: stairs,
      spawnDoor: [mx * T + 8, Y1 - 6], spawnStairs: st ? [st.tx * T + 16, st.ty * T + 46] : null
    };
  }

  // Tür eines Hauses: Punkt vor der Tür (Welt-Pixel)
  function doorOf(o) { var h = MA.OBJECTS[o.t].house; return { x: o.x - h.w * T / 2 + h.door * T + 8, y: o.y }; }
  // Haus, vor dessen Tür (x, y) steht
  function doorNear(map, x, y) {
    for (var i = 0; i < map.obj.length; i++) {
      var o = map.obj[i], d = MA.OBJECTS[o.t]; if (!d.house) continue;
      var dp = doorOf(o); if (Math.abs(x - dp.x) < 10 && y > dp.y && y - dp.y < 13) return o;
    }
    return null;
  }

  // Rauchpunkt des eingebauten Schornsteins (Welt-Pixel, Oberkante; seit v0.17)
  function smokeAt(o) {
    var h = MA.OBJECTS[o.t].house, g = geom(h), W = g.W, D = g.D;
    var cx0 = h.ridge === "x" ? Math.round(W * 0.7) : Math.round(W / 2 + W * 0.2), cy0 = h.ridge === "x" ? Math.round(D / 2 + 1) : Math.round(D * 0.3);
    return [o.x - W / 2 + cx0 + 4.5, o.y - D + cy0 + 3 - (g.Hw + g.rh + 10)];
  }
  MA.houses = { list: HOUSES, interior: interior, doorOf: doorOf, doorNear: doorNear, inRect: inR, smokeAt: smokeAt };
})();
