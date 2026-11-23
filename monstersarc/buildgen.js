/* Monsters Arc – buildgen.js (seit v0.2)
   Gebäude-Generator: zeichnet aus einem Parametersatz (`p`) ein Haus als Pixelbild in 3/4-Ansicht.
   Aktueller Stil: "fachwerk" (derselbe Look wie die Häuser in houses.js, aber frei einstellbar). Weitere Stile kommen später
   als eigene Einträge in MA.buildgen.STYLES.
   Der Parametersatz ist das, was der Gebäude-Editor exportiert (Dev-Kit → Gebäude-Editor). Das Bild ist daraus immer
   reproduzierbar (feste Zufallszahl `seed`), also reicht der Parametersatz als Gebäudedatei.
   Maße: 1 Block = 1 Kachel = 16 px. Erdgeschoss 30 px hoch, jedes weitere Geschoss 24 px.
   Verwendung:  var r = MA.buildgen.render(params);   // r.cv = Bild, r.ax/r.ay = Anker (Mitte der Vorderkante der Grundfläche)
   Gebäude-Anker, Kollisionsfläche und Rauchpunkte stehen ebenfalls in r (siehe Ende von render). */
(function () {
  var MA = window.MA, L2 = MA.L2, T = MA.TILE, hash = MA.hash2, fbm = MA.fbm;
  var FH0 = 30, FH1 = 24;   // Höhe Erdgeschoss / jedes weitere Geschoss in px
  var PADX = 8, BOT = 10;   // Rand links/rechts, Rand unten im Bild

  // ---------- Farbvarianten (vorgefertigt, keine freien RGB-Regler) ----------
  var BEAMS = [
    { n: ["Dunkelbraun", "Dark brown"], c: [78, 52, 34] },
    { n: ["Schwarzbraun", "Black brown"], c: [46, 36, 32] },
    { n: ["Eiche", "Oak"], c: [120, 84, 52] },
    { n: ["Rotbraun", "Red brown"], c: [112, 52, 38] },
    { n: ["Anthrazit", "Anthracite"], c: [60, 64, 68] },
    { n: ["Waldgrün", "Forest green"], c: [48, 70, 52] }
  ];
  var FACADES = [
    { n: ["Cremeweiß", "Cream"], c: [230, 221, 199] },
    { n: ["Sandgelb", "Sand yellow"], c: [229, 213, 180] },
    { n: ["Hellgrau", "Light grey"], c: [214, 214, 208] },
    { n: ["Lachs", "Salmon"], c: [226, 194, 172] },
    { n: ["Salbei", "Sage"], c: [190, 206, 176] },
    { n: ["Taubenblau", "Dove blue"], c: [180, 198, 210] },
    { n: ["Holz hell", "Light wood"], c: [196, 156, 106] },
    { n: ["Holz dunkel", "Dark wood"], c: [136, 98, 64] }
  ];
  var ROOFS = [
    { n: ["Ziegelrot", "Brick red"], c: [148, 72, 54] },
    { n: ["Dunkelrot", "Dark red"], c: [118, 50, 44] },
    { n: ["Schiefergrau", "Slate grey"], c: [92, 98, 106] },
    { n: ["Braun", "Brown"], c: [112, 78, 56] },
    { n: ["Kupfergrün", "Copper green"], c: [84, 130, 114] },
    { n: ["Sandorange", "Sand orange"], c: [198, 118, 70] }
  ];
  // Füllung zwischen den Balken: Putz (wie die Häuser bisher) und vier Brettervarianten
  var FILLS = [
    { n: ["Putz", "Plaster"] },
    { n: ["Bretter waagerecht", "Horizontal planks"] },
    { n: ["Bretter senkrecht", "Vertical planks"] },
    { n: ["Feine Bretter", "Fine boards"] },
    { n: ["Schindeln", "Shingles"] }
  ];

  // ---------- Parameter ----------
  var DEFAULTS = {
    style: "fachwerk",
    w: 6, d: 5, floors: 2, door: 2,               // Dimension in Blöcken, Geschosse, Türposition (Block von links)
    wtype: "square", wins: [3, 3, 3],             // Fenster: eckig/rund, Anzahl je Geschoss (Erdgeschoss zuerst)
    beam: 0, facade: 0, roof: 0, fill: 0,         // Farbvarianten (Balken, Fassade, Dach), Füllung
    rooftype: "tiles", ridge: "x",                // Dach: Dachziegel/flach, First quer (x) oder Giebel vorn (y)
    balc: false, balcSlot: 2, balcW: 1, balcFloor: 1,   // Fassadenextra Balkon
    shaft: false, shaftSlot: 0,                   // Fassadenextra Kaminschacht (Kopfstein)
    dormers: 0,                                   // Dachextra Dachfenster (nur Dachziegel mit First quer)
    chim: true, chimPos: 70,                      // Dachextra Schornstein, Lage in % entlang des Dachs
    seed: 1                                       // Zufallszahl für die Texturen
  };
  function clampI(v, a, b) { v = Math.round(+v); if (!(v >= a)) v = a; if (v > b) v = b; return v; }
  function floorBase(f) { return f === 0 ? 0 : FH0 + FH1 * (f - 1); }
  function floorTop(f) { return f === 0 ? FH0 : FH0 + FH1 * f; }

  // Freie Blöcke einer Fassadenreihe für Fenster in Geschoss f (ohne Tür, Kaminschacht, Balkontür)
  function avail(p, f) {
    var out = [];
    for (var i = 0; i < p.w; i++) {
      if (f === 0 && i === p.door) continue;
      if (p.shaft && i === p.shaftSlot) continue;
      if (p.balc && f === p.balcFloor && i >= p.balcSlot && i < p.balcSlot + p.balcW) continue;
      out.push(i);
    }
    return out;
  }

  // Prüft und begrenzt alle Werte (unbekannte oder kaputte Eingaben werden zu Standardwerten)
  function sanitize(p0) {
    var p = {}, k, i; p0 = p0 || {};
    for (k in DEFAULTS) p[k] = p0[k] !== undefined ? p0[k] : DEFAULTS[k];
    p.style = "fachwerk";
    p.w = clampI(p.w, 3, 12); p.d = clampI(p.d, 3, 10); p.floors = clampI(p.floors, 1, 3);
    p.door = clampI(p.door, 0, p.w - 1);
    p.wtype = p.wtype === "round" ? "round" : "square";
    p.beam = clampI(p.beam, 0, BEAMS.length - 1); p.facade = clampI(p.facade, 0, FACADES.length - 1);
    p.roof = clampI(p.roof, 0, ROOFS.length - 1); p.fill = clampI(p.fill, 0, FILLS.length - 1);
    p.rooftype = p.rooftype === "flat" ? "flat" : "tiles";
    p.ridge = p.ridge === "y" ? "y" : "x";
    p.seed = clampI(p.seed, 0, 99999);
    p.dormers = clampI(p.dormers, 0, 3);
    p.chim = !!p.chim; p.chimPos = clampI(p.chimPos, 15, 85);
    // Kaminschacht nie auf der Tür
    p.shaft = !!p.shaft; p.shaftSlot = clampI(p.shaftSlot, 0, p.w - 1);
    if (p.shaft && p.shaftSlot === p.door) p.shaftSlot = p.door + 1 < p.w ? p.door + 1 : p.door - 1;
    // Balkon: nur ab 2 Geschossen, nicht über/auf dem Kaminschacht
    p.balcW = clampI(p.balcW, 1, 2); p.balcFloor = clampI(p.balcFloor, 1, Math.max(1, p.floors - 1));
    p.balc = !!p.balc && p.floors >= 2;
    p.balcSlot = clampI(p.balcSlot, 0, p.w - p.balcW);
    if (p.balc && p.shaft && p.shaftSlot >= p.balcSlot && p.shaftSlot < p.balcSlot + p.balcW) {
      var ok = -1;
      for (i = 0; i <= p.w - p.balcW; i++) if (!(p.shaftSlot >= i && p.shaftSlot < i + p.balcW) && (ok < 0 || Math.abs(i - p.balcSlot) < Math.abs(ok - p.balcSlot))) ok = i;
      if (ok < 0) p.balc = false; else p.balcSlot = ok;
    }
    var wa = Array.isArray(p.wins) ? p.wins : DEFAULTS.wins, wins = [];
    for (i = 0; i < 3; i++) wins.push(clampI(wa[i] === undefined ? DEFAULTS.wins[i] : wa[i], 0, i < p.floors ? avail(p, i).length : p.w));
    p.wins = wins;
    return p;
  }

  // Welche Blöcke bekommen in Geschoss f ein Fenster (gleichmäßig verteilt)
  function winSlots(p, f) {
    var av = avail(p, f), n = Math.min(p.wins[f] || 0, av.length), set = {};
    for (var k = 0; k < n; k++) set[av[Math.floor((k + 0.5) * av.length / n)]] = true;
    return set;
  }

  function geom(p) {
    var flat = p.rooftype === "flat", W = p.w * T, D = p.d * T, Hw = floorTop(p.floors - 1);
    var rh = flat ? 0 : Math.round((p.ridge === "x" ? D : W) * 0.42), ov = flat ? 1 : 3;
    var offY = Hw + rh + 20;
    return { flat: flat, W: W, D: D, Hw: Hw, rh: rh, ov: ov, offY: offY, cw: W + PADX * 2, chh: offY + D + ov + BOT };
  }
  function mul(c, k) { return [c[0] * k, c[1] * k, c[2] * k]; }

  // ---------- Zeichnen ----------
  function render(p0) {
    var p = sanitize(p0), g = geom(p), W = g.W, D = g.D, Hw = g.Hw, rh = g.rh, flat = g.flat, OV = g.ov, offY = g.offY, cw = g.cw, chh = g.chh;
    var cv = MA.canvas(cw, chh), ctx = cv.ctx, img = ctx.createImageData(cw, chh), buf = img.data;
    var TB = BEAMS[p.beam].c, FC = FACADES[p.facade].c, RF = ROOFS[p.roof].c, sd = p.seed * 131 + p.w * 31 + p.d * 7;
    var LW = [150, 112, 74], GLASS = [56, 78, 100], SILL = [168, 158, 140];
    var DOOR = MA.mix(TB, [150, 98, 58], 0.6);
    function put(x, s, c) {
      var px = Math.round(x) + PADX, py = Math.round(s); if (px < 0 || py < 0 || px >= cw || py >= chh) return;
      var i = (py * cw + px) * 4; buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2]; buf[i + 3] = 255;
    }
    function get(x, s) { var i = (s * cw + x + PADX) * 4; return [buf[i], buf[i + 1], buf[i + 2]]; }
    function roofZ(x, y) {
      if (flat) return 0;
      return p.ridge === "x" ? rh * (1 - Math.abs(y - D / 2) / (D / 2)) : rh * (1 - Math.abs(x - W / 2) / (W / 2));
    }
    function fr(x0, y0, w, h, c) { for (var yy = y0; yy < y0 + h; yy++) for (var xx = x0; xx < x0 + w; xx++) put(xx, yy, c); }

    // ---- Dach (Ziegel) ----
    function roofCol(x, y) {
      var rx = p.ridge === "x", dist = rx ? Math.abs(y + 0.5 - D / 2) : Math.abs(x + 0.5 - W / 2);
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
          var z = Hw + roofZ(x + 0.5, y + 0.5), s = Math.round(y - z + offY), c = roofCol(x, y);
          if (prev === null) put(x, s, c);
          else for (var q = Math.min(prev, s); q <= Math.max(prev, s); q++) put(x, q, c);
          prev = s;
        }
        if (mark) eaveS[x] = prev;
      }
    }
    // ---- Flachdach: Dachfläche mit Attika (umlaufende Brüstung) ----
    var CAP = MA.mix(FC, [176, 172, 164], 0.55);
    function flatRoof() {
      var zt = Hw + 4, x, y;
      for (y = 0; y < D; y++) for (x = 0; x < W; x++) {
        var c = mul(RF, 0.88 + hash(x >> 2, y >> 2, sd) * 0.14);
        if (y % 24 === 0 || (x + (y >> 4) * 8) % 32 === 0) c = mul(c, 0.84);   // Bahnen
        put(x, y - Hw + offY, c);
      }
      for (y = 2; y < 6; y++) for (x = 2; x < W - 2; x++) put(x, y - Hw + offY, mul(get(x, y - Hw + offY), 0.82));   // Schatten hinter der Brüstung
      for (x = 0; x < W; x++) for (y = 0; y < 2; y++) { put(x, y - zt + offY, CAP); put(x, D - 1 - y - zt + offY, CAP); }
      for (y = 0; y < D; y++) for (x = 0; x < 2; x++) { put(x, y - zt + offY, mul(CAP, 0.92)); put(W - 1 - x, y - zt + offY, mul(CAP, 0.92)); }
      for (var z = Hw; z < zt; z++) for (x = 2; x < W - 2; x++) put(x, 2 - z + offY, mul(FC, z === Hw ? 0.6 : 0.74));   // Innenseite der hinteren Brüstung
    }
    if (flat) flatRoof(); else roofPass(-OV, D + OV, false);

    // ---- Schornstein auf dem Dach ----
    var ch = null;
    if (p.chim) {
      var cx0, cy0;
      if (flat) { cx0 = Math.max(4, Math.min(W - 13, Math.round(p.chimPos / 100 * W - 4.5))); cy0 = Math.round(D * 0.3); }
      else if (p.ridge === "x") { cx0 = Math.max(3, Math.min(W - 12, Math.round(p.chimPos / 100 * W - 4.5))); cy0 = Math.round(D / 2 + 1); }
      else { cx0 = Math.round(W / 2 + W * 0.2); cy0 = Math.max(3, Math.min(D - 12, Math.round(p.chimPos / 100 * D - 3))); }
      ch = { cx0: cx0, cy0: cy0, cyF: cy0 + 7, zTop: flat ? Hw + 14 : Hw + rh + 10 };
      for (var x = cx0; x < cx0 + 9; x++) {
        var zb = flat ? Hw - 1 : Hw + roofZ(x + 0.5, ch.cyF) - 2;
        for (var z = Math.floor(zb); z <= ch.zTop; z++) {
          var s = ch.cyF - z + offY, row = (ch.zTop - z) >> 2, joint = (ch.zTop - z) % 4 === 3 || ((x - cx0 + (row & 1) * 2) % 5 === 4);
          var c = ch.zTop - z < 2 ? [128, 122, 112] : joint ? [92, 82, 74] : mul([146, 76, 56], 0.92 + hash(x, row, sd + 9) * 0.14);
          if (x === cx0) c = mul(c, 1.12); else if (x === cx0 + 8) c = mul(c, 0.8);
          put(x, s, c);
        }
        for (var y = cy0; y < ch.cyF; y++) put(x, y - ch.zTop + offY, (x > cx0 + 1 && x < cx0 + 7 && y > cy0 + 1 && y < ch.cyF - 1) ? [34, 28, 26] : [138, 132, 120]);
      }
    }

    // ---- Dachfenster (Gauben) auf der vorderen Dachfläche (Dachziegel, First quer) ----
    if (!flat && p.ridge === "x" && p.dormers > 0) {
      var yf = Math.round(D * 0.66), zr = Hw + roofZ(0, yf);
      var placed = [];
      for (var dk = 0; dk < p.dormers; dk++) {
        var xc = Math.round(W * (dk + 1) / (p.dormers + 1));
        if (ch && xc + 9 > ch.cx0 - 2 && xc - 9 < ch.cx0 + 11) {   // Schornstein im Weg: Gaube daneben setzen
          var xl = ch.cx0 - 11, xr = ch.cx0 + 9 + 11, xn = Math.abs(xl - xc) <= Math.abs(xr - xc) ? xl : xr;
          if (xn < 9) xn = xr; if (xn > W - 9) xn = xl;
          if (xn < 9 || xn > W - 9) continue;
          xc = xn;
        }
        if (placed.some(function (q) { return Math.abs(q - xc) < 17; })) continue;
        placed.push(xc);
        var xa = xc - 7;
        // Dächlein (zwei Flächen, laufen nach hinten in die Dachfläche)
        for (var sx = xa - 1; sx <= xc + 7 + 1; sx++) {
          var left = sx <= xc, t = left ? (sx - (xa - 1)) / (xc - (xa - 1)) : ((xc + 8) - sx) / ((xc + 8) - xc);
          var zE = zr + 10 + 6 * Math.max(0, Math.min(1, t)), rF = Math.round(yf - zE + offY), rB = rF - 8;
          for (var rr = rB; rr <= rF; rr++) put(sx, rr, rr === rF ? mul(TB, 1.05) : mul(RF, (left ? 1 : 0.76) * (0.92 + hash(sx, rr, sd + 21) * 0.1)));
        }
        // Vorderfläche mit Fenster
        for (var fx = xa; fx < xa + 14; fx++) for (var fz = zr - 2; fz < zr + 10; fz++) {
          var edge = fx === xa || fx === xa + 13 || fz === zr + 9, lx2 = fx - xa, wz = fz - zr, col;
          if (edge) col = TB;
          else if (p.wtype === "round") {
            var ddx = lx2 + 0.5 - 7, ddz = wz + 0.5 - 4.5, dd = Math.sqrt(ddx * ddx + ddz * ddz);
            col = dd > 4.4 ? fill(fx, fz) : dd > 3.4 ? TB : (Math.abs(ddx) < 0.7 || Math.abs(ddz) < 0.7) ? LW : GLASS;
          } else {
            var inW = lx2 >= 3 && lx2 < 11 && wz >= 1 && wz < 8;
            col = !inW ? fill(fx, fz) : (lx2 === 3 || lx2 === 10 || wz === 1 || wz === 7) ? TB : (lx2 === 6 || lx2 === 7 || wz === 4) ? LW : GLASS;
          }
          put(fx, Math.round(yf - fz + offY - 1), mul(col, 0.97));
        }
        // Giebeldreieck über der Vorderfläche
        for (var gz = 0; gz < 7; gz++) {
          var half = 7 - gz;
          for (var gx = xc - half; gx < xc + half; gx++) put(gx, Math.round(yf - (zr + 10 + gz) + offY - 1), (gx === xc - half || gx === xc + half - 1) ? TB : mul(fill(gx, zr + 10 + gz), 0.97));
        }
      }
    }

    // ---- Fassade: Füllung zwischen den Balken ----
    function plaster(x, z) { var n = (fbm(x / 4, z / 4, sd + 3, 2) - 0.5) * 10 + (hash(x, z, sd) - 0.5) * 5 - (z < 10 ? (10 - z) * 0.8 : 0); return [FC[0] + n, FC[1] + n, FC[2] + n * 1.1]; }
    function fill(x, z) {
      var c = FC, v;
      switch (p.fill) {
        case 1: {   // Bretter waagerecht, breit, gegeneinander versetzt
          var row = Math.floor(z / 5), L = 34, off = Math.floor(hash(row, 7, sd) * L), ax = x + off, seg = Math.floor(ax / L);
          v = 0.9 + hash(seg, row, sd + 11) * 0.2;
          if (z % 5 === 0) return mul(c, 0.6); if (ax % L === 0) return mul(c, 0.68);
          if (z % 5 === 4) v *= 1.05; if (hash(x >> 1, z, sd + 2) < 0.07) v *= 0.93;
          return mul(c, v);
        }
        case 2: {   // Bretter senkrecht (Brettschalung)
          var col = Math.floor(x / 5); v = 0.88 + hash(col, 3, sd + 13) * 0.22;
          if (x % 5 === 0) return mul(c, 0.62); if (x % 5 === 1) v *= 1.06;
          if (hash(col, z >> 3, sd + 5) < 0.12) v *= 0.94;
          return mul(c, v);
        }
        case 3: {   // feine Bretter (Stülpschalung)
          var r3 = Math.floor(z / 3); v = 0.96 + hash(r3, x >> 5, sd + 17) * 0.08;
          if (z % 3 === 0) return mul(c, 0.68); if (z % 3 === 1) v *= 1.06;
          if ((x + (r3 % 3) * 13) % 41 === 0) v *= 0.8;
          return mul(c, v);
        }
        case 4: {   // Holzschindeln
          var r4 = Math.floor(z / 4), a4 = x + (r4 & 1) * 3, t4 = Math.floor(a4 / 6);
          v = 0.88 + hash(t4, r4, sd + 3) * 0.24;
          if (z % 4 === 0) return mul(c, 0.64); if (((a4 % 6) + 6) % 6 === 0) return mul(c, 0.8);
          return mul(c, v);
        }
      }
      return plaster(x, z);
    }
    function brace(lx, z, za, zb, cross, flip) {
      var u = (lx - 2) / 13, t = (z - za) / (zb - za); if (flip) u = 1 - u;
      return Math.abs(u - t) < 0.11 || (cross && Math.abs(u - (1 - t)) < 0.11);
    }
    var wset = [], boxes = [], i;
    for (i = 0; i < p.floors; i++) wset.push(winSlots(p, i));
    for (i = 0; i < p.w; i++) boxes.push(hash(i, p.seed, sd + 5) > 0.45);
    function floorOf(z) { return z < FH0 ? 0 : Math.min(p.floors - 1, Math.floor((z - FH0) / FH1) + 1); }
    function squareWin(lx, z, z0, z1) {
      if (lx < 4 || lx >= 12 || z < z0 || z >= z1) return null;
      if (lx === 4 || lx === 11 || z === z0 || z === z1 - 1) return TB;
      var mz = Math.floor((z0 + z1) / 2);
      if (lx === 7 || z === mz) return LW;
      if ((lx - (z - z0)) === 1 || (lx - (z - z0)) === 2) return [128, 156, 176];
      return GLASS;
    }
    function roundWin(lx, z, zc) {
      var dx = lx + 0.5 - 8, dz = z + 0.5 - zc, d = Math.sqrt(dx * dx + dz * dz);
      if (d > 5.7) return null; if (d > 4.6) return TB;
      if (Math.abs(dx) < 0.8 || Math.abs(dz) < 0.8) return LW;
      if (Math.abs(dx + dz) < 1.0 && dz > 0.9) return [128, 156, 176];
      return GLASS;
    }
    function giebelWin(x, z) {   // Fenster im vorderen Giebel (First längs)
      var wl = x + 0.5 - W / 2;
      if (p.wtype === "round") {
        var dz = z + 0.5 - (Hw + 7), d = Math.sqrt(wl * wl + dz * dz);
        if (d > 5) return null; if (d > 3.9) return TB; if (Math.abs(wl) < 0.9 || Math.abs(dz) < 0.9) return LW; return GLASS;
      }
      if (Math.abs(wl) >= 6 || z < Hw + 3 || z >= Hw + 11) return null;
      if (Math.abs(wl) > 4.5 || z === Hw + 3 || z === Hw + 10) return TB;
      if (Math.abs(wl) < 1.5 || z === Hw + 7) return LW;
      return GLASS;
    }
    function parapet(z) { return z === Hw + 3 ? CAP : mul(FC, z === Hw ? 0.6 : 0.8); }
    function facade(x, z) {
      var i = Math.floor(x / T), lx = x - i * T;
      if (z >= Hw) {
        if (flat) return parapet(z);
        // Giebel (First längs)
        if (Math.abs(x + 0.5 - W / 2) < 1.2) return TB;
        if (z >= Hw + 13 && z < Hw + 15) return TB;
        var gw = giebelWin(x, z); if (gw) return gw;
        if (z < Hw + 2) return TB;
        return fill(x, z);
      }
      // Tür (ersetzt den Sockel)
      if (i === p.door && lx >= 3 && lx < 13 && z < 22) {
        if (z >= 20 || lx === 3 || lx === 12) return TB;
        if (lx === 10 && z === 10) return [214, 182, 92];
        return lx % 3 === 1 ? mul(DOOR, 0.78) : mul(DOOR, 0.95 + hash(lx, z >> 3, sd) * 0.1);
      }
      if (z < 4) {   // Sockel aus Stein
        var row = z >> 1, j = (x + (row & 1) * 4) % 8 === 0 || z === 1;
        return j ? [86, 82, 76] : mul([124, 118, 108], 0.92 + hash(x >> 3, row, sd + 2) * 0.14);
      }
      if (x < 2 || x >= W - 2 || lx < 2) return TB;   // Ständer
      var f = floorOf(z), zb = floorBase(f), zt = floorTop(f);
      if (z < 6 || (z >= zt - 2 && z < zt)) return TB;   // Schwelle, Rähm
      if (wset[f][i]) {
        var wc;
        if (p.wtype === "round") {
          var zc = f === 0 ? 16.5 : zb + 11; wc = roundWin(lx, z, zc);
          if (wc) return wc;
          if (z === Math.floor(zc - 6.5) && lx >= 3 && lx < 13) return SILL;
        } else {
          var z0 = f === 0 ? 10 : zb + 5, z1 = f === 0 ? 23 : zb + 17;
          if (f === 0 && boxes[i] && z >= 7 && z < 9 && lx >= 3 && lx < 13) return z === 8 ? [96, 64, 40] : (hash(x, z, sd + 4) > 0.45 ? [196, 64, 60] : [112, 132, 60]);   // Blumenkasten
          wc = squareWin(lx, z, z0, z1); if (wc) return wc;
          if (z === z0 - 1 && lx >= 3 && lx < 13) return SILL;
        }
        return fill(x, z);
      }
      if (p.balc && f === p.balcFloor && i >= p.balcSlot && i < p.balcSlot + p.balcW) {   // Balkontür
        if (lx >= 3 && lx < 13 && z >= zb + 1 && z < zb + 20) {
          if (lx === 3 || lx === 12 || z === zb + 19 || z === zb + 1) return TB;
          if (lx === 7 || lx === 8 || z === zb + 11) return LW;
          return (lx + z) % 9 === 0 ? [128, 156, 176] : GLASS;
        }
        return fill(x, z);
      }
      if (f === 0) { if (i !== p.door && brace(lx, z, 6, FH0 - 2, false, i > p.w / 2 - 0.5)) return TB; return fill(x, z); }
      if (brace(lx, z, zb, zt - 2, true, false)) return TB;
      return fill(x, z);
    }
    for (var fx = 0; fx < W; fx++) {
      var zt = Hw + (flat ? 4 : p.ridge === "y" ? Math.max(0, roofZ(fx + 0.5, D) - 2) : 0);
      for (var fz = 0; fz < zt; fz++) put(fx, D - fz + offY - 1, mul(facade(fx, fz), 0.97));
    }
    // vorderer Dachüberstand über der Fassade, darunter ein Schattenstreifen
    if (!flat) {
      roofPass(D, D + OV, true);
      for (var ex = 0; ex < W; ex++) for (var k = 1; k <= 2; k++) { var es = eaveS[ex] + k; if (es < offY + D - 4) put(ex, es, mul(get(ex, es), k === 1 ? 0.62 : 0.8)); }
    }

    // ---- Fassadenextra: Kaminschacht aus Kopfstein (vor der Wand, ragt über die Traufe) ----
    var shaftTop = 0, shx0 = 0;
    if (p.shaft) {
      var PR = 6, x0 = shx0 = p.shaftSlot * T + 3, x1 = x0 + 10, zT = shaftTop = Hw + (flat ? 14 : Math.max(14, Math.min(36, Math.round(rh * 0.8))));
      var STONES = [[128, 124, 116], [110, 106, 100], [142, 136, 126], [98, 94, 90], [134, 124, 108]];
      var cap0 = zT + 2;
      for (var yy = 0; yy <= PR + 1; yy++) for (var xx = x0 - 1; xx <= x1; xx++) put(xx, D + yy - cap0 + offY - 1, (xx > x0 + 1 && xx < x1 - 2 && yy > 1 && yy < PR - 1) ? [30, 26, 24] : mul([150, 146, 138], 0.95 + hash(xx, yy, sd + 31) * 0.1));   // Deckplatte oben
      for (var sz = 0; sz < zT; sz++) for (var sx2 = x0; sx2 < x1; sx2++) {
        var srow = sz >> 2, sa = sx2 + (srow & 1) * 2 + Math.floor(hash(srow, 2, sd + 41) * 3), sti = Math.floor(sa / 5), sc;
        if (sz % 4 === 0 || sa % 5 === 0) sc = [66, 62, 58];
        else { sc = mul(STONES[Math.floor(hash(sti, srow, sd + 47) * STONES.length)], 0.92 + hash(sx2, sz, sd + 53) * 0.14); if ((sa % 5 === 1 && sz % 4 === 1)) sc = mul(sc, 1.14); }
        if (sx2 === x0) sc = mul(sc, 1.1); else if (sx2 === x1 - 1) sc = mul(sc, 0.78);
        if (sz < 2) sc = mul(sc, 0.8);
        put(sx2, D + PR - sz + offY - 1, sc);
      }
      for (var cz = 0; cz < 2; cz++) for (var cx2 = x0 - 1; cx2 <= x1; cx2++) put(cx2, D + PR + 1 - (zT + cz) + offY - 1, cz === 1 ? mul([166, 162, 154], 1.0) : [112, 108, 102]);   // Kante der Deckplatte
    }

    // ---- Fassadenextra: Balkon ----
    if (p.balc) {
      var bz = floorBase(p.balcFloor), ba = p.balcSlot * T + 1, bb = (p.balcSlot + p.balcW) * T - 1, BP = 7, bx, by;
      var PLK = mul(TB, 1.5), RAIL = mul(TB, 1.25);
      for (by = 0; by < BP; by++) for (bx = ba; bx < bb; bx++) put(bx, D + by - bz + offY - 1, mul(PLK, (bx - ba) % 3 === 0 ? 0.78 : (by === 0 ? 0.86 : 0.96 + hash(bx, by, sd + 61) * 0.08)));   // Bodenplatte (Oberseite)
      for (bx = ba; bx < bb; bx++) { put(bx, D + BP - bz + offY - 1, mul(TB, 0.9)); put(bx, D + BP + 1 - bz + offY - 1, mul(TB, 0.7)); }                    // Stirnseite
      for (by = 2; by < 6; by++) for (bx = ba; bx < bb; bx++) { var sc2 = get(bx, D + BP + by - bz + offY); put(bx, D + BP + by - bz + offY, mul(sc2, by < 4 ? 0.7 : 0.84)); }   // Schatten unter dem Balkon
      for (var bk = 0; bk < 2; bk++) { var bxk = bk ? bb - 3 : ba + 1; for (by = 0; by < 5; by++) put(bxk + (bk ? by * 0 : 0), D + BP + 2 + by - bz + offY - 1, mul(TB, 0.8)); }   // Konsolen
      for (bx = ba; bx < bb; bx += 3) for (var bh = 0; bh < 9; bh++) put(bx, D + BP - (bz + 1 + bh) + offY - 1, TB);   // Geländerstäbe
      for (bx = ba; bx < bb; bx++) { put(bx, D + BP - (bz + 9) + offY - 1, RAIL); put(bx, D + BP - (bz + 10) + offY - 1, mul(RAIL, 1.15)); }                   // Handlauf
      for (by = 0; by < BP; by++) { put(ba, D + by - (bz + 9) + offY - 1, RAIL); put(bb - 1, D + by - (bz + 9) + offY - 1, RAIL); }                              // Handlauf seitlich nach hinten
    }

    ctx.putImageData(img, 0, 0);

    // ---- Angaben fürs Spiel ----
    var smoke = [];
    if (ch) smoke.push([PADX + ch.cx0 + 4.5, offY + ch.cy0 + 3 - ch.zTop]);
    if (p.shaft) smoke.push([PADX + shx0 + 5, offY + D + 3 - (shaftTop + 2)]);
    return {
      cv: cv, p: p, w: cw, h: chh, ax: PADX + W / 2, ay: offY + D,
      W: W, D: D, Hw: Hw, foot: [PADX, offY, PADX + W, offY + D],
      doorX: PADX + p.door * T + 8, smoke: smoke
    };
  }

  MA.buildgen = {
    DEFAULTS: DEFAULTS, STYLES: { fachwerk: { name: function () { return L2("Fachwerk", "Timber frame"); } } },
    BEAMS: BEAMS, FACADES: FACADES, ROOFS: ROOFS, FILLS: FILLS,
    sanitize: sanitize, render: render, avail: avail,
    nm: function (o) { return MA.lang === "en" ? o.n[1] : o.n[0]; },
    FH0: FH0, FH1: FH1
  };
})();
