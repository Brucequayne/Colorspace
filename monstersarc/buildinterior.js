/* Monsters Arc – buildinterior.js (seit v0.21)
   Innenräume für Generator-Gebäude (buildgen.js): Boden, Wände, Fußmatte, Treppen und die Einrichtung als Datensatz.
   Datensatz `inner` (ist Teil der exportierten Gebäudedatei, Feld `interior`):
     { floors: [ { floor: "wood", objs: [ { t, x, y, v } ] }, … ],      // je Geschoss (Erdgeschoss zuerst), x/y in px relativ zur Ecke oben links des Bodens
       stairs: [ null | { rot: "S"|"W"|"E", tx, ty }, … ] }              // stairs[t] verbindet Geschoss t mit t+1, tx/ty = Kachel oben links der Treppenfläche
   Größe des Innenraums: Außenmaß × 1,5 (aufgerundet), wie bei den Häusern in houses.js. Die Bildfläche ist 30 × 17 Kacheln (= 480 × 272 px),
   der Boden liegt mittig (layout). Rückwand 2 Kacheln hoch (Fachwerk in den Farben des Außenbaus).
   Treppen: rot = von wo man sie betritt. "S" = von unten (läuft nach Norden nach oben, 2 × 3 Kacheln), "W" = von links (läuft nach Osten,
   3 × 2 Kacheln), "E" = von rechts (läuft nach Westen, 3 × 2 Kacheln). Im Geschoss darüber liegt an derselben Stelle die Treppenöffnung,
   man erscheint dort am Einstiegsende (entry) und geht wieder hinein, um nach unten zu kommen. */
(function () {
  var MA = window.MA, L2 = MA.L2, T = MA.TILE, hash = MA.hash2, fbm = MA.fbm, G = { get FACADES() { return MA.buildgen.FACADES; }, get BEAMS() { return MA.buildgen.BEAMS; } };
  var C = 30, R = 17;

  // ---------- Böden ----------
  var FLOORS = [
    { id: "wood", n: ["Holz", "Wood"] },
    { id: "tiles", n: ["Fliesen", "Tiles"] },
    { id: "mosaic", n: ["Kacheln", "Mosaic"] },
    { id: "stone", n: ["Stein", "Stone"] },
    { id: "marble", n: ["Marmor", "Marble"] },
    { id: "modern", n: ["Modern", "Modern"] }
  ];
  function mul(c, k) { return [c[0] * k, c[1] * k, c[2] * k]; }
  var MODERN = [[188, 190, 192], [160, 162, 165], [132, 134, 138]];   // minimalistisch: drei Grautöne

  // Farbe des Bodens am Pixel (x, y) (px ab Ecke oben links des Bodens)
  function floorCol(kind, x, y, sd, W, H) {
    var c, k;
    switch (kind) {
      case "tiles": {   // Fliesen: große helle Platten, 16 px, feine Fuge
        var tx = Math.floor(x / 8), ty = Math.floor(y / 8), lx = x % 8, ly = y % 8;
        if (lx === 0 || ly === 0) return [150, 144, 134];
        k = 0.95 + hash(tx, ty, sd) * 0.1 + (fbm(x / 10, y / 10, sd + 2, 2) - 0.5) * 0.06;
        c = mul([218, 212, 198], k);
        if (lx === 1 || ly === 1) c = mul(c, 1.05);
        if (lx === 7 || ly === 7) c = mul(c, 0.94);
        return c;
      }
      case "mosaic": {   // Kacheln: kleine Mosaikkacheln 8 px im Schachbrett
        var mx = Math.floor(x / 8), my = Math.floor(y / 8);
        if (x % 8 === 0 || y % 8 === 0) return [164, 160, 150];
        c = ((mx + my) & 1) ? [226, 222, 208] : [84, 124, 148];
        c = mul(c, 0.95 + hash(mx, my, sd) * 0.1);
        if (x % 8 === 1 && y % 8 === 1) c = mul(c, 1.16);
        return c;
      }
      case "stone": {   // Stein: unregelmäßige Platten (Voronoi), dunkle Fugen
        var S = 8, cx = Math.floor(x / S), cy = Math.floor(y / S), d1 = 1e9, d2 = 1e9, bi = 0, bj = 0;
        for (var j = -1; j <= 1; j++) for (var i = -1; i <= 1; i++) {
          var gx = cx + i, gy = cy + j, px = (gx + 0.15 + hash(gx, gy, sd) * 0.7) * S, py = (gy + 0.15 + hash(gx, gy, sd + 5) * 0.7) * S;
          var dd = Math.sqrt((x - px) * (x - px) + (y - py) * (y - py));
          if (dd < d1) { d2 = d1; d1 = dd; bi = gx; bj = gy; } else if (dd < d2) d2 = dd;
        }
        if (d2 - d1 < 1.1) return [78, 74, 70];
        k = 0.82 + hash(bi, bj, sd + 9) * 0.3 + (fbm(x / 3, y / 3, sd + 4, 2) - 0.5) * 0.18;
        c = mul([120, 116, 108], k);
        if (d2 - d1 < 1.9) c = mul(c, 1.1);
        return c;
      }
      case "marble": {   // Marmor: helle Platten 32 px mit grauen Adern
        var px2 = Math.floor(x / 16), py2 = Math.floor(y / 16);
        if (x % 16 === 0 || y % 16 === 0) return [176, 174, 170];
        var n = fbm(x / 12 + px2 * 7, y / 12 + py2 * 5, sd + 1, 3), vein = Math.abs(n - 0.5);
        c = mul([234, 232, 228], 0.97 + hash(px2, py2, sd) * 0.05);
        if (vein < 0.011) c = [150, 152, 162];
        else if (vein < 0.022) c = mul(c, 0.93);
        if (((x + y) % 32) < 2) c = mul(c, 1.04);
        return c;
      }
      case "modern": {   // Modern: eine ruhige Fläche im mittleren Grau, zu den Raumrändern hin in Stufen dunkler
        var m = Math.min(x, y, (W || 9999) - 1 - x, (H || 9999) - 1 - y), st = m < 8 ? 3 : m < 16 ? 2 : m < 24 ? 1 : 0;
        return mul(MODERN[1], 1 - st * 0.07);
      }
    }
    // Holz: Dielen 4 px hoch, versetzte Stöße
    var row = Math.floor(y / 4), L = 44, off = Math.floor(hash(row, 3, sd) * L), ax = x + off, seg = Math.floor(ax / L);
    c = mul([152, 108, 68], 0.9 + hash(seg, row, sd + 7) * 0.2);
    if (y % 4 === 0) return mul(c, 0.62);
    if (ax % L === 0) return mul(c, 0.64);
    if (y % 4 === 1) c = mul(c, 1.06);
    if (hash(x >> 1, y, sd + 3) < 0.08) c = mul(c, 0.94);
    return c;
  }

  // ---------- Maße ----------
  function layout(p) {
    var iw = Math.ceil(p.w * 1.5), ih = Math.ceil(p.d * 1.5);
    var rx = Math.floor((C - iw) / 2), ry = Math.max(2, Math.floor((R - ih) / 2) + 1);
    return { iw: iw, ih: ih, rx: rx, ry: ry, X0: rx * T, Y0: ry * T, X1: (rx + iw) * T, Y1: (ry + ih) * T, doorTx: Math.min(iw - 1, Math.floor((p.door + 0.5) * 1.5)) };
  }
  // Treppenfläche relativ zum Boden (px). Einstiegsende (entry) und Auftauchpunkt (arrive) für das Spiel.
  function stairGeom(s) {
    var vert = s.rot === "S", tw = vert ? 2 : 3, th = vert ? 3 : 2, x = s.tx * T, y = s.ty * T, w = tw * T, h = th * T, en;
    if (s.rot === "S") en = [x, y + h - T, w, T]; else if (s.rot === "W") en = [x, y, T, h]; else en = [x + w - T, y, T, h];
    return { tw: tw, th: th, rect: [x, y, w, h], entry: en, arrive: [en[0] + en[2] / 2, en[1] + en[3] / 2] };
  }
  function stairsOverlap(a, b) {
    var ga = stairGeom(a).rect, gb = stairGeom(b).rect;
    return ga[0] < gb[0] + gb[2] && gb[0] < ga[0] + ga[2] && ga[1] < gb[1] + gb[3] && gb[1] < ga[1] + ga[3];
  }
  function stairFits(L, s) { var g = stairGeom(s); return s.tx >= 0 && s.ty >= 0 && s.tx + g.tw <= L.iw && s.ty + g.th <= L.ih; }

  // ---------- Datensatz ----------
  function empty(floors) {
    var f = [], i; for (i = 0; i < 3; i++) f.push({ floor: "wood", objs: [] });
    return { floors: f, stairs: [null, null] };
  }
  function floorKind(k) { for (var i = 0; i < FLOORS.length; i++) if (FLOORS[i].id === k) return k; return "wood"; }
  // Prüft einen Datensatz: unbekannte Objekte, falsche Varianten, Dinge außerhalb des Raums und kaputte Treppen fliegen raus.
  function sanitize(inn, p) {
    var L = layout(p), out = empty(), i;
    inn = inn || {};
    for (i = 0; i < 3; i++) {
      var f = inn.floors && inn.floors[i] ? inn.floors[i] : {}, list = [];
      out.floors[i].floor = floorKind(f.floor);
      (Array.isArray(f.objs) ? f.objs : []).forEach(function (o) {
        var d = o && MA.OBJECTS[o.t]; if (!d || !d.inner) return;
        var x = Math.round(+o.x), y = Math.round(+o.y), v = Math.round(+o.v) || 0;
        if (!(x >= 0 && x <= L.iw * T && y >= 0 && y <= L.ih * T)) return;
        list.push({ t: o.t, x: x, y: y, v: Math.max(0, Math.min(d.variants - 1, v)) });
      });
      out.floors[i].objs = list;
    }
    for (i = 0; i < 2; i++) {
      var s = inn.stairs && inn.stairs[i];
      if (s && (s.rot === "S" || s.rot === "W" || s.rot === "E")) {
        var q = { rot: s.rot, tx: Math.round(+s.tx), ty: Math.round(+s.ty) };
        if (stairFits(L, q) && !(i > 0 && out.stairs[i - 1] && stairsOverlap(out.stairs[i - 1], q))) out.stairs[i] = q;
      }
    }
    return out;
  }
  // Zahl der Treppen, die das Gebäude braucht, und die erste, die noch fehlt (-1 = alles da)
  function missingStair(p, inn) {
    for (var t = 0; t < p.floors - 1; t++) if (!inn.stairs[t]) return t;
    return -1;
  }

  // ---------- Bild: Boden, Wände, Matte, Treppen ----------
  function stairDraw(g, X0, Y0, s, up, TB) {
    var gm = stairGeom(s), x = X0 + gm.rect[0], y = Y0 + gm.rect[1], w = gm.rect[2], h = gm.rect[3], WOOD = [158, 112, 70], i, k;
    function fill(a, b, ww, hh, c) { g.fillStyle = MA.rgb(c); g.fillRect(Math.round(a), Math.round(b), ww, hh); }
    if (up) {
      fill(x, y, w, h, [54, 38, 28]);
      if (s.rot === "S") {   // von unten, läuft nach oben (Norden)
        for (i = 0; i < 8; i++) { var ty = y + i * 6; k = 1.1 - i * 0.05; fill(x + 3, ty, 26, 3, mul(WOOD, k)); fill(x + 3, ty + 3, 26, 3, mul(WOOD, k * 0.58)); }
        fill(x, y, 3, h, mul(TB, 0.9)); fill(x + w - 3, y, 3, h, mul(TB, 0.9)); fill(x, y, 3, 1, mul(TB, 1.3)); fill(x + w - 3, y, 3, 1, mul(TB, 1.3));
        for (i = 0; i < 4; i++) { fill(x, y + 4 + i * 12, 3, 3, mul(TB, 1.25)); fill(x + w - 3, y + 4 + i * 12, 3, 3, mul(TB, 1.25)); }
      } else {   // von links (W) läuft nach Osten, von rechts (E) nach Westen
        var mir = s.rot === "E";
        for (i = 0; i < 8; i++) {
          k = 0.7 + i * 0.05; var sx = mir ? x + w - (i + 1) * 6 : x + i * 6;
          fill(sx, y + 3, 6, 26, mul(WOOD, k)); fill(mir ? sx + 5 : sx, y + 3, 1, 26, mul(WOOD, k * 0.55));
        }
        fill(x, y, w, 3, mul(TB, 0.8)); fill(x, y, w, 1, mul(TB, 1.2));
        for (var xx = 0; xx < w; xx++) {   // Treppenwange (Seitenansicht), steigt zum oberen Ende an
          var rise = Math.floor((mir ? (w - 1 - xx) : xx) * 0.2), top = y + 28 - rise;
          fill(x + xx, top, 1, y + h - top, mul(TB, 0.95)); fill(x + xx, top, 1, 1, mul(TB, 1.3));
        }
      }
    } else {   // Öffnung im Geschoss darüber: dunkler Schacht, Stufen nach unten, Geländer auf den drei geschlossenen Seiten
      fill(x, y, w, h, [22, 16, 14]);
      if (s.rot === "S") {
        for (i = 0; i < 8; i++) fill(x + 3, y + i * 6 + 3, 26, 3, mul(WOOD, 0.14 + i * 0.045));
      } else {
        var m2 = s.rot === "E";
        for (i = 0; i < 8; i++) fill(m2 ? x + w - (i + 1) * 6 : x + i * 6, y + 3, 6, 26, mul(WOOD, 0.14 + (7 - i) * 0.045));
      }
      var RL = mul(TB, 1.15), RD = mul(TB, 0.8);
      function post(px, py) { fill(px, py - 6, 2, 7, RL); }
      function railH(rx, ry, rw) { fill(rx, ry - 6, rw, 2, RL); fill(rx, ry - 4, rw, 1, RD); for (var q = rx; q < rx + rw; q += 8) post(q, ry); }
      function railV(rx, ry, rh) { fill(rx, ry, 2, rh, RD); for (var q = ry; q < ry + rh; q += 12) post(rx, q); fill(rx, ry - 6, 2, 2, RL); }
      if (s.rot === "S") { railH(x, y, w); railV(x, y, h); railV(x + w - 2, y, h); }
      else if (s.rot === "W") { railH(x, y, w); railH(x, y + h - 2, w); railV(x + w - 2, y, h); }
      else { railH(x, y, w); railH(x, y + h - 2, w); railV(x, y, h); }
    }
  }

  // Bild eines Geschosses fl (Boden, Wände, Matte, Treppen). Gibt { cv, L } zurück. objsForWin = Objekte, denen Fenster ausweichen.
  function render(p, inn, fl) {
    var L = layout(p), X0 = L.X0, Y0 = L.Y0, X1 = L.X1, Y1 = L.Y1, W = X1 - X0, H = Y1 - Y0;
    var cv = MA.canvas(MA.W, MA.H), g = cv.ctx, PL = G.FACADES[p.facade].c, TB = G.BEAMS[p.beam].c, kind = inn.floors[fl].floor, sd = p.seed * 7 + fl * 13;
    function fill(x, y, w, h, c) { g.fillStyle = MA.rgb(c); g.fillRect(x, y, w, h); }
    fill(0, 0, MA.W, MA.H, [0, 0, 0]);
    // Boden
    var img = g.createImageData(W, H), b = img.data, x, y;
    for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
      var c = floorCol(kind, x, y, sd, W, H), ao = y < 6 ? 0.78 + y * 0.037 : 1, ax = (x < 3 || x >= W - 3) ? 0.9 : 1, i = (y * W + x) * 4;
      b[i] = c[0] * ao * ax; b[i + 1] = c[1] * ao * ax; b[i + 2] = c[2] * ao * ax; b[i + 3] = 255;
    }
    g.putImageData(img, X0, Y0);
    // Rückwand (2 Kacheln hoch) im Fachwerk
    for (y = Y0 - 32; y < Y0; y++) for (x = X0; x < X1; x++) {
      var ly = y - (Y0 - 32), lx = x - X0, c2;
      if (ly < 3) c2 = mul(TB, 0.8);
      else if (ly >= 24) c2 = ly === 24 ? [150, 108, 70] : ly === 31 ? [70, 48, 32] : (lx % 6 === 0 ? [100, 68, 42] : [124, 86, 54]);
      else if (lx % 48 < 3 || lx >= W - 3 || (ly >= 12 && ly < 14)) c2 = TB;
      else { var n = (fbm(x / 4, y / 4, 17, 2) - 0.5) * 10; c2 = [PL[0] - 14 + n, PL[1] - 14 + n, PL[2] - 12 + n]; }
      fill(x, y, 1, 1, c2);
    }
    fill(X0, Y0, W, 2, [40, 30, 24]); g.globalAlpha = 0.35; fill(X0, Y0 + 2, W, 2, [40, 30, 24]); g.globalAlpha = 1;
    // Fenster in der Rückwand, wo kein hohes Möbel oder Wandobjekt davorsteht
    var blockers = inn.floors[fl].objs.filter(function (o) { var d = MA.OBJECTS[o.t]; return o.y < 36 && (d.wall || d.h > 40); }).map(function (o) { return X0 + o.x; });
    var st = [inn.stairs[fl], fl > 0 ? inn.stairs[fl - 1] : null];
    st.forEach(function (s) { if (s) { var gm = stairGeom(s); if (gm.rect[1] < 20) blockers.push(X0 + gm.rect[0] + gm.rect[2] / 2); } });
    for (var wx = X0 + 24; wx < X1 - 20; wx += 48) {
      if (blockers.some(function (u) { return Math.abs(u - wx) < 24; })) continue;
      for (var yy = 0; yy < 10; yy++) for (var xx = 0; xx < 12; xx++) {
        var edge = xx === 0 || xx === 11 || yy === 0 || yy === 9, mid = xx === 5 || xx === 6 || yy === 4;
        fill(wx - 6 + xx, Y0 - 26 + yy, 1, 1, edge ? TB : mid ? [150, 112, 74] : (yy < 3 ? [196, 224, 236] : [156, 196, 216]));
      }
    }
    // Seiten- und Vorderwand (dunkler Holzrahmen)
    fill(X0 - 4, Y0 - 36, W + 8, 4, mul(TB, 0.7));
    fill(X0 - 4, Y0 - 36, 4, H + 40, mul(TB, 0.7)); fill(X0 - 1, Y0 - 32, 1, H + 32, mul(TB, 1.2));
    fill(X1, Y0 - 36, 4, H + 40, mul(TB, 0.7)); fill(X1, Y0 - 32, 1, H + 32, mul(TB, 1.2));
    fill(X0 - 4, Y1, W + 8, 4, mul(TB, 0.7)); fill(X0, Y1, W, 1, mul(TB, 1.2));
    // Tür und Fußmatte (nur Erdgeschoss)
    if (fl === 0) {
      var mx = X0 + L.doorTx * T;
      fill(mx, Y1, T, 4, [8, 8, 10]);
      for (var my = 0; my < 9; my++) for (var mxx = 0; mxx < 14; mxx++) fill(mx + 1 + mxx, Y1 - 10 + my, 1, 1, my === 0 || my === 8 || mxx === 0 || mxx === 13 ? [110, 66, 40] : ((mxx + my) % 3 === 0 ? [176, 120, 70] : [150, 96, 58]));
    }
    // Treppen: Öffnung der Treppe von unten, Treppe nach oben
    if (fl > 0 && inn.stairs[fl - 1]) stairDraw(g, X0, Y0, inn.stairs[fl - 1], false, TB);
    if (fl < p.floors - 1 && inn.stairs[fl]) stairDraw(g, X0, Y0, inn.stairs[fl], true, TB);
    return { cv: cv, L: L };
  }

  // Vorschaubild (Palette): Boden als Ausschnitt, Treppe als Symbol
  function floorThumb(kind) {
    var c = MA.canvas(48, 32), g = c.ctx, img = g.createImageData(48, 32), b = img.data, x, y;
    for (y = 0; y < 32; y++) for (x = 0; x < 48; x++) { var q = floorCol(kind, x + 8, y + 8, 5), i = (y * 48 + x) * 4; b[i] = q[0]; b[i + 1] = q[1]; b[i + 2] = q[2]; b[i + 3] = 255; }
    g.putImageData(img, 0, 0); return c.toDataURL();
  }
  function stairThumb(rot, p) {
    var s = { rot: rot, tx: 0, ty: 0 }, gm = stairGeom(s), c = MA.canvas(gm.rect[2] + 8, gm.rect[3] + 12), g = c.ctx;
    g.fillStyle = "#6A5A46"; g.fillRect(0, 0, c.width, c.height);
    stairDraw(g, 4, 6, s, true, G.BEAMS[p ? p.beam : 0].c);
    return c.toDataURL();
  }

  MA.buildinterior = {
    FLOORS: FLOORS, layout: layout, stairGeom: stairGeom, stairsOverlap: stairsOverlap, stairFits: stairFits,
    empty: empty, sanitize: sanitize, missingStair: missingStair, render: render, floorThumb: floorThumb, stairThumb: stairThumb, floorCol: floorCol,
    nm: function (o) { return MA.lang === "en" ? o.n[1] : o.n[0]; }
  };
})();
