/* Monsters Arc – props.js (seit v0.19.9)
   Straßenmöbel als normale Objekte (Objekt-Werkzeug): Platzuhr am Mast, Straßenlaterne, eckige Mülltonne.
   Perspektive wie bei den Häusern (3/4-Ansicht): senkrechte Vorderseite plus sichtbare Oberseite. */
(function () {
  var MA = window.MA, L2 = MA.L2;
  var IRON = "#2E3A36", IRON_L = "#4E5E58", IRON_D = "#1E2624";

  // Sockel: kleiner Steinblock, Oberseite sichtbar
  function plinth(p, cx, by, w) {
    p.rect(cx - w / 2, by - 4, w, 4, "#7C766C"); p.rect(cx - w / 2, by - 4, 1, 4, "#9A948A"); p.rect(cx + w / 2 - 1, by - 4, 1, 4, "#5E5850");
    p.rect(cx - w / 2, by - 7, w, 3, "#A8A296"); p.rect(cx - w / 2, by - 7, w, 1, "#BEB8AC");
  }
  // Mast: 3 px breit, links Licht, rechts Schatten
  function mast(p, cx, y0, y1) {
    p.rect(cx - 1, y0, 3, y1 - y0, IRON); p.rect(cx - 1, y0, 1, y1 - y0, IRON_L); p.rect(cx + 1, y0, 1, y1 - y0, IRON_D);
  }

  MA.OBJECTS.clock = {
    name: function () { return L2("Platzuhr", "Square clock"); }, w: 28, h: 66, ax: 14, ay: 64, variants: 2, solid: [[0, -3, 4]],
    draw: function (p, ctx, rnd, v) {
      var cx = 14, by = 64, cg = v === 1 ? ["#6E2A24", "#8E3A30", "#4E1E1A"] : [IRON, IRON_L, IRON_D];   // Variante 2: dunkelrot
      plinth(p, cx, by, 10);
      mast(p, cx, 24, by - 6);
      p.rect(cx - 2, 46, 5, 2, IRON_L); p.rect(cx - 2, 30, 5, 2, IRON_L);   // Zierringe
      // Uhrgehäuse: Vorderseite 18 × 16, darüber Oberseite (Deckel) 18 × 4, Spitze
      var x0 = cx - 9, y0 = 9;
      p.rect(x0, y0, 18, 16, cg[0]); p.rect(x0, y0, 1, 16, cg[1]); p.rect(x0 + 17, y0, 1, 16, cg[2]); p.rect(x0, y0 + 15, 18, 1, cg[2]);
      p.rect(x0 - 1, y0 - 4, 20, 4, cg[1]); p.rect(x0 - 1, y0 - 4, 20, 1, "#7A8A84"); p.rect(x0 - 1, y0 - 1, 20, 1, cg[2]);
      p.rect(cx - 2, y0 - 7, 5, 3, cg[0]); p.rect(cx - 1, y0 - 9, 3, 2, "#C9A445"); p.px(cx, y0 - 10, "#E4C870");
      // Zifferblatt
      p.ell(cx + 0.5, y0 + 8, 6.6, 6.6, "#C9A445"); p.ell(cx + 0.5, y0 + 8, 5.6, 5.6, "#F2EEE2");
      for (var k = 0; k < 12; k++) { var a = k / 12 * 6.283; p.px(cx + 0.5 + Math.cos(a) * 4.6, y0 + 8 + Math.sin(a) * 4.6, k % 3 ? "#9A948A" : "#2A2A2E"); }
      p.line(cx, y0 + 8, cx - 2, y0 + 5, "#1A1A1E"); p.line(cx, y0 + 8, cx + 3, y0 + 6, "#1A1A1E"); p.px(cx, y0 + 8, "#8E3A30");
    }
  };

  MA.OBJECTS.streetlamp = {
    name: function () { return L2("Straßenlaterne", "Street lamp"); }, w: 22, h: 74, ax: 11, ay: 72, variants: 2, solid: [[0, -3, 3]],
    light: { dx: 0, dy: -58, r: 82, col: [255, 198, 124] },
    draw: function (p, ctx, rnd, v) {
      var cx = 11, by = 72;
      plinth(p, cx, by, 8);
      mast(p, cx, 22, by - 6);
      p.rect(cx - 2, by - 14, 5, 6, IRON); p.rect(cx - 2, by - 14, 1, 6, IRON_L);   // Fuß
      if (v === 1) { p.line(cx, 24, cx + 5, 20, IRON); p.line(cx, 26, cx + 5, 22, IRON_D); }   // Variante 2: Zierbogen
      // Laternenkopf: Dach von oben (Trapez), Glas vorn, Boden
      p.rect(cx - 6, 7, 13, 3, IRON); p.rect(cx - 5, 5, 11, 2, IRON_L); p.rect(cx - 3, 3, 7, 2, IRON); p.px(cx, 1, IRON_D); p.px(cx, 2, IRON);
      p.rect(cx - 5, 10, 11, 10, IRON_D); p.rect(cx - 4, 11, 9, 8, "#FFD27A"); p.rect(cx - 2, 12, 5, 6, "#FFF0C0"); p.px(cx, 14, "#FFFFFF");
      p.rect(cx, 11, 1, 8, IRON);   // Mittelsteg
      p.rect(cx - 5, 20, 11, 2, IRON); p.rect(cx - 2, 22, 5, 1, IRON_D);
    }
  };

  MA.OBJECTS.bin = {
    name: function () { return L2("Mülltonne (eckig)", "Bin (square)"); }, w: 18, h: 24, ax: 9, ay: 22, variants: 3, solid: [[0, -4, 6]],
    draw: function (p, ctx, rnd, v) {
      var C = [["#3E5A4A", "#557A64", "#2C4034"], ["#4A5A6A", "#647A8E", "#34404C"], ["#7A6A3A", "#9A8A4E", "#5A4C28"]][v];
      var x0 = 3, by = 22;
      // Korpus: Vorderseite mit Rippen
      p.rect(x0, by - 13, 12, 13, C[0]); p.rect(x0, by - 13, 1, 13, C[1]); p.rect(x0 + 11, by - 13, 1, 13, C[2]);
      for (var x = x0 + 3; x < x0 + 11; x += 3) p.rect(x, by - 11, 1, 9, C[2]);
      p.rect(x0, by - 1, 12, 1, "#1E1E20");
      p.rect(x0 + 4, by - 9, 4, 3, "#D8D2C4"); p.rect(x0 + 5, by - 8, 2, 1, C[0]);   // Schild
      // Deckel: Oberseite 14 × 5 mit Einwurfschlitz, vordere Kante
      p.rect(x0 - 1, by - 19, 14, 5, C[1]); p.rect(x0 - 1, by - 19, 14, 1, "#A8B4AC"); p.rect(x0 - 1, by - 14, 14, 1, C[2]);
      p.rect(x0 + 3, by - 17, 6, 2, "#14161A");
    }
  };
})();
