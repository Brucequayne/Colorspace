/* Monsters Arc – deco.js (seit v0.17)
   Hausdeko: Objekte, die an Häusern angebracht werden (eigener Reiter „Hausdeko“ im Map-Editor).
   Besonderheit: Wird ein Deko-Objekt auf ein Haus gesetzt, merkt es sich dessen Vorderkante (o.s = Haus-y + 0,5).
   Es wird dann direkt nach dem Haus gezeichnet, also immer über der Hauswand und nie dahinter, aber weiterhin
   hinter Figuren, die vor dem Haus stehen. Ohne Haus darunter sortiert es wie jedes Objekt nach seinem Fuß.
   Deko hat keine Kollision und keinen Bodenschatten. Schornsteine (und die eingebauten der Häuser) rauchen. */
(function () {
  var MA = window.MA, L2 = MA.L2;

  // ---------- Blumentöpfe / Blumenkästen ----------
  function flowers(p, rnd, x0, x1, y0, y1, cols, n) {
    for (var i = 0; i < n; i++) {
      var x = x0 + rnd() * (x1 - x0), y = y0 + rnd() * (y1 - y0);
      if (rnd() < 0.55) p.px(x, y, ["#4E7A34", "#6E9A44", "#3E6A2C"][(rnd() * 3) | 0]);
      else { var c = cols[(rnd() * cols.length) | 0]; p.px(x, y, c); if (rnd() < 0.4) p.px(x + 1, y, c); }
    }
  }
  MA.OBJECTS.d_pot = {
    name: function () { return L2("Blumentopf", "Flower pot"); }, deco: true, w: 32, h: 18, ax: 16, ay: 17, variants: 4,
    draw: function (p, ctx, rnd, v) {
      if (v === 0) {        // klein, rund, Terrakotta, rote Blumen
        p.rect(12, 11, 8, 5, "#A65A3C"); p.rect(18, 11, 2, 5, "#86462E"); p.rect(13, 16, 6, 1, "#86462E");
        p.ell(16, 10, 5.2, 2, "#C06A48"); p.ell(16, 10, 3.6, 1.1, "#4A3220");   // Rand von oben, Erde
        flowers(p, rnd, 11, 21, 3, 9, ["#D84A3E", "#F07060", "#E8C048"], 40);
      } else if (v === 1) { // klein, rund, blau glasiert, weiße Blumen mit Ranken
        p.rect(12, 11, 8, 5, "#4A6D7C"); p.rect(18, 11, 2, 5, "#3A5664"); p.rect(13, 16, 6, 1, "#3A5664");
        p.ell(16, 10, 5.2, 2, "#62929E"); p.ell(16, 10, 3.6, 1.1, "#4A3220");
        flowers(p, rnd, 11, 21, 3, 9, ["#F2F0E6", "#E8E4D4", "#F0D870"], 40);
        p.px(11, 11, "#4E7A34"); p.px(10, 12, "#6E9A44"); p.px(21, 11, "#4E7A34"); p.px(22, 13, "#6E9A44");
      } else if (v === 2) { // Blumenkasten für ein Fenster
        p.rect(9, 9, 14, 2, "#A8784C"); p.rect(10, 9, 12, 1, "#4A3220");   // Oberseite: Rand und Erde
        p.rect(9, 11, 14, 4, "#8A5E3A"); p.rect(9, 11, 14, 1, "#9A6C44"); p.rect(9, 15, 14, 1, "#5E3E26");
        flowers(p, rnd, 9, 23, 5, 11, ["#D84A3E", "#F08AA8", "#F2F0E6"], 60);
        for (var i = 0; i < 5; i++) { var hx = 10 + rnd() * 12; p.rect(hx, 15, 1, 1 + rnd() * 2, "#4E7A34"); }
      } else {              // breiter Pflanzkasten (Bank, zwei Fenster)
        p.rect(1, 8, 30, 3, "#A8784C"); p.rect(2, 9, 28, 1, "#4A3220");   // Oberseite: Rand und Erde
        p.rect(1, 11, 30, 5, "#8A5E3A"); p.rect(1, 11, 30, 1, "#9A6C44"); p.rect(1, 16, 30, 1, "#5E3E26");
        for (var x = 4; x < 30; x += 6) p.rect(x, 12, 1, 4, "#7A5232");
        flowers(p, rnd, 1, 31, 4, 11, ["#D84A3E", "#F08AA8", "#E8C048", "#8A6AC8"], 120);
      }
    }
  };

  // ---------- Efeu (8 Muster) ----------
  var IVY = [[22, 54, 22], [38, 76, 32], [56, 98, 40], [78, 120, 52]];
  var IVY_V = [   // [Breite, Höhe, Ranken, Wuchs: 0 von unten, 1 von oben hängend, 2 seitlich]
    [14, 16, 2, 0], [22, 24, 3, 0], [12, 40, 2, 0], [36, 14, 3, 2], [32, 48, 5, 0], [26, 20, 4, 1], [28, 32, 3, 0], [20, 30, 2, 0]
  ];
  MA.OBJECTS.d_ivy = {
    name: function () { return L2("Efeu", "Ivy"); }, deco: true, noOutline: true, w: 40, h: 52, ax: 20, ay: 51, variants: 8,
    draw: function (p, ctx, rnd, v) {
      var c = IVY_V[v], W = c[0], H = c[1], x0 = 20 - W / 2, yb = 51, leaves = [];
      function leaf(x, y) {
        var k = rnd(), col = k < 0.2 ? IVY[0] : k < 0.55 ? IVY[1] : k < 0.88 ? IVY[2] : IVY[3];
        leaves.push([Math.round(x), Math.round(y), col, rnd() < 0.5]);
      }
      for (var r = 0; r < c[2]; r++) {
        var x, y, steps = H * (0.7 + rnd() * 0.4), dx, dy;
        if (c[3] === 1) { x = x0 + rnd() * W; y = yb - H; dx = 0; dy = 1; }          // hängt von oben
        else if (c[3] === 2) { x = x0; y = yb - rnd() * H; dx = 1; dy = 0; steps = W * (0.8 + rnd() * 0.3); }   // wächst seitlich
        else { x = x0 + W * (0.2 + rnd() * 0.6); y = yb; dx = 0; dy = -1; }        // klettert von unten
        for (var s = 0; s < steps; s++) {
          x += dx + (rnd() - 0.5) * 1.6 * (dy ? 1 : 0.3); y += dy + (rnd() - 0.5) * 1.6 * (dx ? 1 : 0.3);
          x = Math.max(x0, Math.min(x0 + W - 1, x)); y = Math.max(yb - H, Math.min(yb, y));
          p.px(x, y, "#4A3A22");
          if (rnd() < 0.75) leaf(x + (rnd() - 0.5) * 5, y + (rnd() - 0.5) * 4);
          if (rnd() < 0.08) { var bx = x, by = y, bd = rnd() < 0.5 ? -1 : 1; for (var b = 0; b < 6; b++) { bx += bd * 0.8; by += dy ? dy * 0.5 : (rnd() - 0.5); p.px(bx, by, "#4A3A22"); if (rnd() < 0.8) leaf(bx, by - 1); } }
        }
      }
      leaves.forEach(function (l) {   // Blatt: 2 × 2 mit dunkler Unterkante, manchmal 3 breit
        var cs = "rgb(" + l[2].join(",") + ")";
        p.rect(l[0], l[1], l[3] ? 3 : 2, 2, cs);
        p.px(l[0], l[1] + 2, "rgb(" + IVY[0].join(",") + ")");
        if (l[2] !== IVY[3] && rnd() < 0.3) p.px(l[0], l[1], "rgb(" + IVY[3].join(",") + ")");
      });
    }
  };

  // ---------- Wandlampe ----------
  MA.OBJECTS.d_lamp = {
    name: function () { return L2("Wandlampe", "Wall lamp"); }, deco: true, w: 16, h: 22, ax: 8, ay: 21, variants: 2,
    light: { dx: 0, dy: -11, r: 52, col: [255, 196, 120] },
    draw: function (p, ctx, rnd, v) {
      var f = v === 1 ? -1 : 1, cx = 8;
      // Wandhalter (Eisen) zur Seite, Laterne hängt daran
      p.rect(v === 1 ? 10 : 3, 5, 3, 7, "#2A2A2E"); p.px(v === 1 ? 11 : 4, 6, "#4A4A50");
      for (var i = 0; i < 5; i++) p.px(cx - f * (i - 1), 4 - (i > 2 ? 1 : 0), "#2A2A2E");
      p.rect(cx - 3, 5, 7, 3, "#2A2A2E"); p.rect(cx - 2, 5, 5, 2, "#4A4A52"); p.px(cx, 4, "#2A2A2E");   // Dach der Laterne von oben
      p.rect(cx - 3, 8, 7, 8, "#2A2A2E"); p.rect(cx - 2, 9, 5, 6, "#FFD27A"); p.rect(cx - 1, 10, 3, 4, "#FFF0C0"); p.px(cx, 12, "#FFFFFF");
      p.rect(cx - 2, 16, 5, 1, "#2A2A2E"); p.px(cx, 17, "#2A2A2E");
    }
  };

  // ---------- Schornsteine (4 Arten) ----------
  // Seit v0.18 in derselben 3/4-Ansicht wie die Häuser: Vorderseite plus Oberseite (Tiefe dp), man schaut
  // leicht von oben in die Öffnung hinein. [Breite, Höhe der Vorderseite, Tiefe der Oberseite]
  var CHIM = [[10, 20, 7], [12, 17, 8], [8, 25, 6], [14, 15, 8]];
  var CB = 43;   // Fußlinie im Bild
  function bricks(p, x0, y0, w, h, base, dark, mortar) {
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      var row = y >> 2, j = y % 4 === 3 || ((x + (row & 1) * 3) % 6 === 5);
      p.px(x0 + x, y0 + y, j ? mortar : (x === 0 ? "#B8705A" : x >= w - 2 ? dark : (MA.hash2(x >> 1, row, 3) > 0.7 ? dark : base)));
    }
  }
  // Oberseite mit Öffnung: Rand (rim), innen dunkel, oben sieht man ein Stück der hinteren Innenwand
  function opening(p, x0, y0, w, dp, rim, rimLight, inner) {
    p.rect(x0, y0, w, dp, rim); p.rect(x0, y0, w, 1, rimLight);
    p.rect(x0 + 2, y0 + 1, w - 4, dp - 3, "#1A1412"); p.rect(x0 + 2, y0 + 1, w - 4, 2, inner); p.rect(x0 + 2, y0 + 3, w - 4, 1, "#2A1E1A");
  }
  MA.OBJECTS.d_chimney = {
    name: function () { return L2("Schornstein", "Chimney"); }, deco: true, w: 22, h: 44, ax: 11, ay: 43, variants: 4,
    draw: function (p, ctx, rnd, v) {
      var c = CHIM[v], w = c[0], hf = c[1], dp = c[2], x0 = 11 - w / 2, yf = CB - hf, yt = yf - dp;   // yt = Oberkante der Oberseite
      if (v === 0) {        // Backstein mit Abdeckplatte
        bricks(p, x0, yf + 2, w, hf - 2, "#9A4E38", "#7A3C2C", "#6A5E54");
        p.rect(x0 - 1, yf, w + 2, 2, "#8A847A"); p.rect(x0 - 1, yf, w + 2, 1, "#A8A296");
        opening(p, x0 - 1, yt, w + 2, dp, "#8A847A", "#B8B2A6", "#5E3A2C");
      } else if (v === 1) { // Naturstein
        for (var y = 0; y < hf; y++) for (var x = 0; x < w; x++) {
          var st = MA.hash2((x + (y >> 2) * 2) >> 2, y >> 2, 9), j = y % 4 === 3 || MA.hash2(x, y >> 2, 11) > 0.86;
          p.px(x0 + x, yf + y, j ? "#5E5850" : x === 0 ? "#A8A296" : x >= w - 2 ? "#6E685E" : st > 0.6 ? "#9A948A" : st > 0.3 ? "#8A847A" : "#7A746A");
        }
        opening(p, x0, yt, w, dp, "#9A948A", "#B8B2A6", "#5E5850");
      } else if (v === 2) { // hoch und schmal mit Blechhut auf Stützen
        bricks(p, x0, yf, w, hf, "#A85A40", "#84442E", "#6A5E54");
        opening(p, x0, yt, w, dp, "#84442E", "#B8705A", "#5E3A2C");
        var hy = yt - 5;   // Hut schwebt über der Öffnung: Stützen, darüber die Blechplatte (Oberseite + Kante)
        p.rect(x0, hy + 3, 1, 4, "#4A4E52"); p.rect(x0 + w - 1, hy + 3, 1, 4, "#4A4E52");
        p.rect(x0 - 2, hy - 3, w + 4, 5, "#7A8288"); p.rect(x0 - 2, hy - 3, w + 4, 1, "#9AA2A8"); p.rect(x0 - 2, hy + 2, w + 4, 1, "#4A4E52");
      } else {              // breit mit zwei Tonaufsätzen
        bricks(p, x0, yf + 2, w, hf - 2, "#9A4E38", "#7A3C2C", "#6A5E54");
        p.rect(x0 - 1, yf, w + 2, 2, "#8A847A");
        p.rect(x0 - 1, yt, w + 2, dp, "#8A847A"); p.rect(x0 - 1, yt, w + 2, 1, "#B8B2A6");   // Abdeckplatte von oben
        [x0 + 1, x0 + w - 6].forEach(function (px) {   // Tonaufsatz: Zylinder, oben runde Öffnung
          var py = yt + dp - 3;
          p.rect(px, py - 6, 5, 6, "#B86A48"); p.rect(px + 4, py - 6, 1, 6, "#8E4E34"); p.rect(px, py - 6, 1, 6, "#D08A64");
          p.ell(px + 2.5, py - 7, 2.6, 1.4, "#C87A54"); p.ell(px + 2.5, py - 7, 1.4, 0.7, "#1A1412");
        });
      }
    }
  };
  // Rauchpunkt (Welt-Pixel, Mitte der Öffnung) – auch für die eingebauten Schornsteine der Häuser
  function smokeAt(o) {
    var d = MA.OBJECTS[o.t];
    if (o.t === "d_chimney") {
      var c = CHIM[o.v], top = o.y - c[1] - c[2] / 2;   // Mitte der Öffnung
      if (o.v === 2) return [[o.x, o.y - c[1] - c[2] - 2]];   // kommt unter dem Hut hervor
      if (o.v === 3) { var py = o.y - c[1] - 10; return [[o.x - c[0] / 2 + 3.5, py], [o.x + c[0] / 2 - 3.5, py]]; }
      return [[o.x, top]];
    }
    if (d.house && d.house.chim && MA.houses.smokeAt) return [MA.houses.smokeAt(o)];
    return null;
  }

  // Haus unter einem Punkt (für das Anheften): das vorderste Haus, dessen Bild den Punkt enthält
  function houseAt(map, x, y) {
    var best = null;
    map.obj.forEach(function (o) {
      var d = MA.OBJECTS[o.t]; if (!d.house) return;
      if (x >= o.x - d.ax && x < o.x - d.ax + d.w && y >= o.y - d.ay && y <= o.y + 3 && (!best || o.y > best.y)) best = o;
    });
    return best;
  }
  function attach(map, o) { var h = houseAt(map, o.x, o.y - 1); if (h) o.s = h.y + 0.5; else delete o.s; return h; }

  MA.deco = { smokeAt: smokeAt, houseAt: houseAt, attach: attach };
})();
