/* Monsters Arc – furniture.js (seit v0.21)
   Möbel und Einrichtung für Innenräume (nur innen, `inner: true`). Wird vom Gebäude-Editor benutzt (Innen-Modus) und später vom Spiel.
   Die älteren Innenobjekte (Tisch, Regal, Bett, Fass, Topfpflanze, Kamin, Ladenmöbel) liegen weiter in houses.js.
   Alle Objekte: 3/4-Ansicht, Fußpunkt (ax, ay) = Mitte der Vorderkante am Boden, schwarze Kontur wie überall (MA.sprite).
   Besondere Felder:
   - mod: 16     Küchenmodule. 16 px breit und mit der Kontur bündig, rasten im Editor auf die Kachel ein. Alle Unterschränke (Herd, Arbeitszeile,
                 Kühlschrank niedrig) haben dieselbe Höhe, der Wandschrank hängt darüber (gleiche x-Lage, gleicher Fußpunkt).
   - wall: true  Wandobjekt. Hängt an der Rückwand, der Fußpunkt liegt in der hintersten Kachelreihe (y = Oberkante Boden + 16).
   - light       Lichtquelle wie beim Kamin (dx, dy relativ zum Fußpunkt). */
(function () {
  var MA = window.MA, L2 = MA.L2;
  var WD = "#8A5E3A", WDL = "#A8784C", WDD = "#5E3E26";
  function hx(c, k) { var v = MA.hex(c); return MA.rgb([Math.min(255, v[0] * k), Math.min(255, v[1] * k), Math.min(255, v[2] * k)]); }
  function def(id, d) { d.inner = true; MA.OBJECTS[id] = d; }

  // ---------- Büro ----------
  var DESK = [
    { top: "#8A5E3A", hi: "#A8784C", fr: "#6E4A2E", dk: "#4A3220" },    // Holz
    { top: "#CFCBC0", hi: "#E8E4DA", fr: "#A8A498", dk: "#6E6A60" }     // hell, modern
  ];
  function deskBase(p, v) {
    var c = DESK[v % 2];
    p.rect(3, 23, 3, 12, c.dk); p.rect(34, 23, 3, 12, c.dk);                  // vordere Beine
    p.rect(1, 12, 38, 8, c.top); p.rect(1, 12, 38, 1, c.hi); p.rect(1, 19, 38, 1, c.fr);   // Platte (Oberseite)
    p.rect(1, 20, 38, 3, c.fr); p.rect(1, 22, 38, 1, c.dk);                  // Zarge
    p.rect(24, 23, 12, 10, c.fr); p.rect(25, 24, 10, 4, c.top); p.rect(25, 29, 10, 3, c.top);   // Schubladen
    p.rect(28, 25, 4, 1, c.dk); p.rect(28, 30, 4, 1, c.dk);
  }
  def("m_desk_pc", {
    name: function () { return L2("Schreibtisch (Computer)", "Desk (computer)"); }, w: 42, h: 38, ax: 21, ay: 35, variants: 2, solid: [[-10, -6, 8], [10, -6, 8]],
    draw: function (p, ctx, rnd, v) {
      deskBase(p, v);
      p.rect(3, 5, 7, 11, "#8E9094"); p.rect(3, 5, 7, 1, "#B4B6BA"); p.rect(4, 8, 5, 1, "#5E6064"); p.rect(4, 10, 5, 1, "#5E6064"); p.px(6, 13, "#7ACB6A");   // Gehäuse
      p.rect(14, 1, 17, 12, "#26282C"); p.rect(15, 2, 15, 9, "#3C78B4"); p.rect(15, 2, 15, 1, "#6AA2D4");                                                     // Monitor
      p.rect(17, 4, 6, 1, "#CFE4F4"); p.rect(17, 6, 9, 1, "#CFE4F4"); p.rect(17, 8, 5, 1, "#8EBCE0"); p.rect(26, 4, 3, 5, "#2A5A8C");
      p.rect(21, 13, 3, 2, "#5E6064"); p.rect(18, 15, 9, 1, "#5E6064");
      p.rect(14, 16, 16, 3, "#D6D6D0"); p.rect(15, 17, 14, 1, "#8E8E88"); p.rect(33, 16, 4, 3, "#D6D6D0"); p.px(34, 17, "#8E8E88");   // Tastatur, Maus
    }
  });
  def("m_desk_laptop", {
    name: function () { return L2("Schreibtisch (Laptop)", "Desk (laptop)"); }, w: 42, h: 38, ax: 21, ay: 35, variants: 2, solid: [[-10, -6, 8], [10, -6, 8]],
    draw: function (p, ctx, rnd, v) {
      deskBase(p, v);
      p.rect(12, 3, 17, 11, "#2C2E32"); p.rect(13, 4, 15, 9, "#7AAED8"); p.rect(13, 4, 15, 3, "#A8CCE8"); p.rect(15, 8, 8, 1, "#F2F6FA"); p.rect(15, 10, 5, 1, "#F2F6FA");   // Bildschirm
      p.rect(11, 14, 19, 5, "#B8BCC0"); p.rect(11, 14, 19, 1, "#D6D8DC"); p.rect(12, 15, 17, 2, "#8E9296"); p.rect(17, 18, 7, 1, "#9A9EA2");                                    // Basis
      p.rect(33, 13, 5, 6, "#E8E2D4"); p.rect(33, 13, 5, 1, "#5E3E26"); p.rect(38, 15, 1, 3, "#E8E2D4");                                                                       // Tasse
      p.rect(3, 14, 6, 5, "#E8E2D4"); p.rect(3, 14, 6, 1, "#FFFFFF"); p.rect(4, 16, 4, 1, "#B8B4A8");                                                                           // Notizblock
    }
  });
  def("m_desk_books", {
    name: function () { return L2("Schreibtisch (Bücher, Zettel)", "Desk (books, papers)"); }, w: 42, h: 38, ax: 21, ay: 35, variants: 2, solid: [[-10, -6, 8], [10, -6, 8]],
    draw: function (p, ctx, rnd, v) {
      deskBase(p, v);
      p.rect(3, 15, 11, 4, "#8E3A30"); p.rect(3, 15, 11, 1, "#B05A4C"); p.rect(4, 11, 9, 4, "#3E5A7A"); p.rect(4, 11, 9, 1, "#6282A4"); p.rect(5, 8, 7, 3, "#5E7A3E"); p.rect(5, 8, 7, 1, "#86A45E");   // Bücherstapel
      p.rect(4, 17, 9, 1, "#E8DCC0"); p.rect(5, 13, 7, 1, "#E8DCC0");
      p.rect(17, 14, 11, 6, "#F0ECE0"); p.rect(18, 15, 7, 1, "#B8B4A8"); p.rect(18, 17, 8, 1, "#B8B4A8"); p.rect(21, 12, 10, 6, "#E6E2D4"); p.rect(22, 13, 6, 1, "#B8B4A8"); p.rect(22, 15, 7, 1, "#B8B4A8");   // Zettel
      p.rect(32, 10, 5, 7, "#4A86B4"); p.rect(32, 10, 5, 1, "#7AB0D8"); p.px(33, 8, "#C84A3C"); p.px(33, 9, "#C84A3C"); p.px(35, 7, "#E8C048"); p.px(35, 8, "#E8C048"); p.px(34, 9, "#3E3E44");   // Stiftebecher
    }
  });
  var OFFC = [["#3A3C40", "#585A60"], ["#6E7278", "#9094A0"], ["#A8443A", "#C85E50"]];
  def("m_office_chair", {
    name: function () { return L2("Bürosessel", "Office chair"); }, w: 22, h: 34, ax: 11, ay: 31, variants: 3, solid: [[0, -3, 6]],
    draw: function (p, ctx, rnd, v) {
      var c = OFFC[v % 3];
      p.rect(4, 28, 14, 2, "#2A2C30"); p.rect(10, 22, 2, 7, "#4A4C50"); p.rect(2, 29, 3, 2, "#1E1F22"); p.rect(17, 29, 3, 2, "#1E1F22"); p.rect(9, 30, 4, 1, "#1E1F22");   // Fuß mit Rollen
      p.rect(3, 17, 16, 6, c[0]); p.rect(3, 17, 16, 2, c[1]); p.rect(3, 22, 16, 1, "#1E1F22");                                                                          // Sitz
      p.rect(4, 2, 14, 14, c[0]); p.rect(4, 2, 14, 2, c[1]); p.rect(6, 5, 10, 9, hx(c[0], 0.82)); p.rect(5, 4, 1, 11, c[1]);                                             // Lehne
      p.rect(1, 13, 2, 8, "#2A2C30"); p.rect(19, 13, 2, 8, "#2A2C30"); p.rect(0, 13, 4, 2, "#3A3C40"); p.rect(18, 13, 4, 2, "#3A3C40");                                    // Armlehnen
    }
  });

  // ---------- Sitzen ----------
  var CHW = [[WD, WDL, WDD], ["#B8884E", "#D4A468", "#8A6236"]];
  def("m_chair_wood", {
    name: function () { return L2("Stuhl (Holz)", "Chair (wood)"); }, w: 18, h: 30, ax: 9, ay: 28, variants: 2, solid: [[0, -3, 5]],
    draw: function (p, ctx, rnd, v) {
      var c = CHW[v % 2];
      p.rect(3, 2, 2, 14, c[2]); p.rect(13, 2, 2, 14, c[2]); p.rect(3, 2, 12, 2, c[1]); p.rect(5, 6, 8, 2, c[0]); p.rect(5, 10, 8, 2, c[0]);   // Lehne
      p.rect(2, 15, 14, 6, c[0]); p.rect(2, 15, 14, 1, c[1]); p.rect(2, 21, 14, 2, c[2]);                                                     // Sitz
      p.rect(3, 23, 2, 5, c[2]); p.rect(13, 23, 2, 5, c[2]);                                                                                  // Beine
    }
  });
  var FOLD = ["#E8E6DE", "#4A7EB4", "#C8483C", "#5E9A4A", "#E8B83A", "#3A3C40"];
  def("m_chair_fold", {
    name: function () { return L2("Klappstuhl (Kunststoff)", "Folding chair (plastic)"); }, w: 18, h: 30, ax: 9, ay: 28, variants: 6, solid: [[0, -3, 5]],
    draw: function (p, ctx, rnd, v) {
      var c = FOLD[v % 6], hi = hx(c, 1.18), lo = hx(c, 0.7), mt = "#8E9094";
      p.rect(3, 3, 12, 10, c); p.rect(3, 3, 12, 1, hi); p.rect(3, 12, 12, 1, lo); p.rect(5, 6, 8, 1, lo); p.rect(5, 8, 8, 1, lo);          // Lehne mit Schlitzen
      p.rect(2, 14, 14, 5, c); p.rect(2, 14, 14, 1, hi); p.rect(2, 19, 14, 1, lo);                                                          // Sitz
      p.rect(3, 12, 1, 3, mt); p.rect(14, 12, 1, 3, mt);
      p.line(3, 20, 14, 27, mt); p.line(14, 20, 3, 27, mt); p.rect(2, 27, 3, 1, "#5E6064"); p.rect(13, 27, 3, 1, "#5E6064");                // Kreuzgestell
    }
  });
  var SOFA = [["#5A6E86", "#7890AC", "#3E4E62"], ["#8A5A3A", "#AA7448", "#5E3C26"], ["#5E7A5A", "#7C9C76", "#3E563C"]];
  def("m_sofa", {
    name: function () { return L2("Sofa", "Sofa"); }, w: 52, h: 38, ax: 26, ay: 35, variants: 3, solid: [[-15, -6, 8], [0, -6, 8], [15, -6, 8]],
    draw: function (p, ctx, rnd, v) {
      var c = SOFA[v % 3];
      p.rect(3, 3, 46, 14, c[0]); p.rect(3, 3, 46, 2, c[1]);
      [[7, 11], [19, 14], [34, 11]].forEach(function (q, i) { var x = [6, 19, 33][i], w = [12, 13, 13][i]; p.rect(x, 6, w, 10, c[1]); p.rect(x, 6, w, 1, hx(c[1], 1.15)); p.rect(x, 15, w, 1, c[2]); });   // Rückenkissen
      p.rect(0, 8, 8, 24, c[0]); p.rect(44, 8, 8, 24, c[0]); p.rect(0, 8, 8, 3, c[1]); p.rect(44, 8, 8, 3, c[1]); p.rect(7, 12, 1, 20, c[2]); p.rect(44, 12, 1, 20, c[2]);   // Armlehnen
      p.rect(8, 18, 36, 8, c[1]); p.rect(8, 18, 36, 1, hx(c[1], 1.15)); p.rect(8, 26, 36, 5, c[0]); p.rect(20, 18, 1, 13, c[2]); p.rect(32, 18, 1, 13, c[2]); p.rect(8, 30, 36, 1, c[2]);   // Sitzkissen
      p.rect(0, 32, 52, 2, c[2]); p.rect(2, 34, 3, 1, "#2A2018"); p.rect(47, 34, 3, 1, "#2A2018");
    }
  });
  def("m_armchair", {
    name: function () { return L2("Sessel", "Armchair"); }, w: 28, h: 36, ax: 14, ay: 33, variants: 3, solid: [[0, -6, 8]],
    draw: function (p, ctx, rnd, v) {
      var c = SOFA[v % 3];
      p.rect(3, 3, 22, 14, c[0]); p.rect(3, 3, 22, 2, c[1]); p.rect(6, 6, 16, 10, c[1]); p.rect(6, 6, 16, 1, hx(c[1], 1.15)); p.rect(6, 15, 16, 1, c[2]);
      p.rect(0, 9, 7, 22, c[0]); p.rect(21, 9, 7, 22, c[0]); p.rect(0, 9, 7, 3, c[1]); p.rect(21, 9, 7, 3, c[1]); p.rect(6, 13, 1, 18, c[2]); p.rect(21, 13, 1, 18, c[2]);
      p.rect(7, 18, 14, 7, c[1]); p.rect(7, 18, 14, 1, hx(c[1], 1.15)); p.rect(7, 25, 14, 5, c[0]); p.rect(7, 29, 14, 1, c[2]);
      p.rect(0, 31, 28, 2, c[2]); p.rect(2, 33, 3, 1, "#2A2018"); p.rect(23, 33, 3, 1, "#2A2018");
    }
  });

  // ---------- Küche (modular: 16 px breit, gleiche Höhe, bündig) ----------
  // Fußpunkt g = ay. Unterschrank: Oberseite g-20 … g-17 (4 Zeilen), Front g-16 … g-1, Sockel g-3 … g-1.
  function kBase(p, g, top, hiTop, front, panel, dark, handle, flat) {
    p.rect(0, g - 20, 16, 4, top); p.rect(0, g - 20, 16, 1, hiTop); p.rect(0, g - 17, 16, 1, hx(top, 0.7));
    p.rect(0, g - 16, 16, 13, front); p.rect(0, g - 3, 16, 3, dark);
    if (!flat) { p.rect(1, g - 15, 14, 11, panel); p.rect(1, g - 15, 14, 1, hx(panel, 1.15)); p.rect(1, g - 5, 14, 1, hx(panel, 0.75)); p.rect(1, g - 15, 1, 11, hx(panel, 0.85)); }
    if (handle) p.rect(11, g - 14, 3, 1, handle);
  }
  def("m_k_counter", {
    name: function () { return L2("Arbeitszeile", "Counter"); }, w: 16, h: 28, ax: 8, ay: 26, variants: 3, mod: 16, solid: [[0, -6, 8]],
    draw: function (p, ctx, rnd, v) {
      var g = 26;
      if (v === 2) kBase(p, g, "#C8CCCE", "#E4E6E6", "#7A7E82", "#8E9296", "#3E4044", "#D6D8DC");
      else kBase(p, g, "#B9B3A6", "#D6D1C6", WD, "#9A6A42", "#3A2E26", "#D0C8B0");
      p.rect(1, g - 9, 14, 1, v === 2 ? "#62666A" : "#6E4A2E");   // Schubladenfuge
      p.rect(6, g - 8, 4, 1, v === 2 ? "#D6D8DC" : "#D0C8B0");
      if (v === 1) {   // Spüle mit Hahn
        p.rect(3, g - 19, 10, 3, "#8E9AA2"); p.rect(4, g - 18, 8, 2, "#5E6A72"); p.rect(3, g - 19, 10, 1, "#B8C4CC");
        p.rect(7, g - 25, 2, 6, "#C8CCCE"); p.rect(7, g - 25, 4, 2, "#C8CCCE"); p.px(10, g - 23, "#8E9094");
      }
    }
  });
  var STV = [["#E4E6E6", "#2A2C30", "#B8BCC0"], ["#3E4044", "#1A1B1E", "#8E9094"]];
  def("m_k_stove", {
    name: function () { return L2("Herd / Ofen", "Stove / oven"); }, w: 16, h: 28, ax: 8, ay: 26, variants: 2, mod: 16, solid: [[0, -6, 8]],
    draw: function (p, ctx, rnd, v) {
      var g = 26, c = STV[v % 2];
      p.rect(0, g - 20, 16, 4, "#2A2C30"); p.rect(0, g - 20, 16, 1, "#4A4C52"); p.rect(0, g - 17, 16, 1, "#1A1B1E");   // Kochfeld
      p.rect(2, g - 19, 4, 2, "#5E6064"); p.rect(10, g - 19, 4, 2, "#5E6064"); p.px(3, g - 18, "#C84A3C"); p.px(11, g - 18, "#C84A3C");
      p.rect(0, g - 16, 16, 13, c[0]); p.rect(0, g - 3, 16, 3, "#2A2C30");
      p.px(2, g - 15, c[2]); p.px(5, g - 15, c[2]); p.px(10, g - 15, c[2]); p.px(13, g - 15, c[2]);                       // Knebel
      p.rect(1, g - 13, 14, 9, c[1]); p.rect(3, g - 11, 10, 5, "#4A5560"); p.rect(3, g - 11, 10, 1, "#6E7C88"); p.rect(2, g - 13, 12, 1, c[2]);   // Backofenfenster, Griff
    }
  });
  def("m_k_fridge", {
    name: function () { return L2("Kühlschrank", "Fridge"); }, w: 16, h: 56, ax: 8, ay: 54, variants: 3, mod: 16, solid: [[0, -6, 8]],
    draw: function (p, ctx, rnd, v) {
      var g = 54, w = v === 2 ? ["#B8BCC0", "#D6D8DC", "#8E9296"] : ["#E4E6E6", "#F2F4F4", "#B8BCBE"];
      if (v === 0) {   // Unterbau-Kühlschrank: gleiche Höhe wie die anderen Unterschränke
        p.rect(0, g - 20, 16, 4, w[1]); p.rect(0, g - 20, 16, 1, "#FFFFFF"); p.rect(0, g - 17, 16, 1, w[2]);
        p.rect(0, g - 16, 16, 13, w[0]); p.rect(0, g - 3, 16, 3, "#5E6266");
        p.rect(1, g - 15, 14, 4, w[1]); p.rect(0, g - 11, 16, 1, w[2]); p.rect(12, g - 14, 1, 2, "#8E9094"); p.rect(12, g - 9, 1, 5, "#8E9094");
      } else {         // hoch (Standgerät), gleiche Breite und Bodenlinie
        p.rect(0, g - 52, 16, 3, w[1]); p.rect(0, g - 52, 16, 1, "#FFFFFF"); p.rect(0, g - 49, 16, 1, w[2]);
        p.rect(0, g - 48, 16, 45, w[0]); p.rect(0, g - 3, 16, 3, "#5E6266");
        p.rect(0, g - 34, 16, 1, w[2]); p.rect(1, g - 47, 14, 12, w[1]); p.rect(1, g - 32, 14, 27, w[1]);
        p.rect(12, g - 44, 1, 6, "#8E9094"); p.rect(12, g - 30, 1, 10, "#8E9094"); p.rect(1, g - 47, 1, 42, "#FFFFFF");
      }
    }
  });
  // Wandschrank: hängt über den Unterschränken (gleicher Fußpunkt und gleiche x-Lage, Schrank sitzt auf Wandhöhe)
  var WC = [[WD, "#9A6A42", "#B08658", "#4A3220"], ["#E4E6E6", "#F0F2F2", "#FFFFFF", "#9A9EA2"], ["#7A7E82", "#8E9296", "#A8ACAE", "#3E4044"]];
  def("m_k_wall", {
    name: function () { return L2("Wandschrank", "Wall cabinet"); }, w: 16, h: 56, ax: 8, ay: 54, variants: 4, mod: 16, wall: true, solid: [],
    draw: function (p, ctx, rnd, v) {
      if (v === 3) {   // Dunstabzugshaube
        p.rect(5, 2, 6, 9, "#B8BCC0"); p.rect(5, 2, 1, 9, "#D6D8DC"); p.rect(10, 2, 1, 9, "#8E9296");
        p.rect(0, 11, 16, 8, "#C8CCCE"); p.rect(0, 11, 16, 1, "#E4E6E6"); p.rect(0, 19, 16, 2, "#5E6266"); p.rect(3, 20, 10, 1, "#FFE6A8");
        return;
      }
      var c = WC[v % 3];
      p.rect(0, 3, 16, 2, c[2]); p.rect(0, 5, 16, 16, c[0]); p.rect(1, 6, 14, 14, c[1]); p.rect(1, 6, 14, 1, hx(c[1], 1.15)); p.rect(1, 6, 1, 14, hx(c[1], 0.85));
      p.rect(0, 21, 16, 1, c[3]); p.rect(11, 16, 1, 3, v === 0 ? "#D0C8B0" : "#8E9094");
    }
  });

  // ---------- Wohnen und Deko ----------
  def("m_cabinet", {
    name: function () { return L2("Schrank (Holz)", "Cabinet (wood)"); }, w: 32, h: 56, ax: 16, ay: 53, variants: 2, solid: [[-6, -5, 8], [6, -5, 8]],
    draw: function (p, ctx, rnd, v) {
      var c = CHW[v % 2];
      p.rect(1, 2, 30, 5, c[1]); p.rect(1, 2, 30, 1, hx(c[1], 1.15)); p.rect(0, 6, 32, 2, c[1]);                    // Oberseite, Kranzleiste
      p.rect(1, 8, 30, 42, c[0]); p.rect(1, 8, 1, 42, c[1]); p.rect(30, 8, 1, 42, c[2]);
      p.rect(3, 10, 12, 36, hx(c[0], 1.08)); p.rect(17, 10, 12, 36, hx(c[0], 1.08)); p.rect(3, 10, 12, 1, c[1]); p.rect(17, 10, 12, 1, c[1]);
      p.rect(3, 10, 1, 36, c[1]); p.rect(17, 10, 1, 36, c[1]); p.rect(14, 8, 3, 42, c[2]);
      p.rect(12, 26, 1, 7, "#D0B070"); p.rect(19, 26, 1, 7, "#D0B070");
      p.rect(1, 48, 30, 3, c[2]); p.rect(2, 51, 3, 2, c[2]); p.rect(27, 51, 3, 2, c[2]);
    }
  });
  def("m_mirror", {
    name: function () { return L2("Spiegel", "Mirror"); }, w: 24, h: 52, ax: 12, ay: 50, variants: 3, wall: true, solid: [],
    draw: function (p, ctx, rnd, v) {
      var glass = "#A8C4D4", gl2 = "#D4E6F0";
      if (v === 1) {   // rund
        p.ell(12, 19, 10, 10, WD); p.ell(12, 19, 8.4, 8.4, WDL); p.ell(12, 19, 7.2, 7.2, glass); p.line(8, 22, 14, 14, gl2); p.line(10, 24, 16, 16, gl2);
      } else if (v === 2) {   // hoch und schmal
        p.rect(7, 4, 12, 32, "#2A2C30"); p.rect(8, 5, 10, 30, glass); p.line(9, 30, 16, 8, gl2); p.line(11, 32, 17, 14, gl2);
      } else {
        p.rect(5, 8, 16, 24, WD); p.rect(5, 8, 16, 2, WDL); p.rect(6, 10, 14, 20, glass); p.line(8, 26, 15, 13, gl2); p.line(10, 28, 17, 17, gl2);
      }
    }
  });
  def("m_floorlamp", {
    name: function () { return L2("Stehlampe", "Floor lamp"); }, w: 18, h: 52, ax: 9, ay: 50, variants: 2, solid: [[0, -2, 3]], light: { dx: 0, dy: -34, r: 74, col: [255, 214, 140] },
    draw: function (p, ctx, rnd, v) {
      var pole = v ? "#2A2C30" : "#B8964A", shade = v ? ["#E8E4DA", "#B8B4A8"] : ["#F0E2B8", "#C8B888"];
      p.ell(9, 48, 6, 1.8, "#3A3C40"); p.rect(8, 15, 2, 33, pole); p.rect(8, 15, 1, 33, hx(pole, 1.25));
      for (var r = 0; r < 12; r++) { var w = 8 + Math.round(r * 0.7); p.rect(9 - w / 2, 4 + r, w, 1, shade[0]); p.px(9 + w / 2 - 1, 4 + r, shade[1]); }
      p.rect(2, 16, 14, 1, shade[1]); p.rect(6, 3, 6, 1, shade[1]);
    }
  });
  def("m_walllamp", {
    name: function () { return L2("Wandlampe", "Wall lamp"); }, w: 14, h: 52, ax: 7, ay: 50, variants: 2, wall: true, solid: [], light: { dx: 0, dy: -26, r: 60, col: [255, 206, 130] },
    draw: function (p, ctx, rnd, v) {
      var arm = v ? "#2A2C30" : "#B8964A", sh = v ? ["#F2F2EC", "#C8C8C0"] : ["#F0E2B8", "#C8B888"];
      p.rect(5, 14, 4, 12, arm); p.rect(6, 12, 2, 3, arm); p.rect(3, 8, 8, 6, sh[0]); p.rect(3, 8, 8, 1, "#FFFFFF"); p.rect(3, 13, 8, 1, sh[1]); p.rect(4, 14, 6, 1, "#FFE6A8");
    }
  });
  def("m_tv", {
    name: function () { return L2("Fernseher (auf Tisch)", "TV (on table)"); }, w: 44, h: 42, ax: 22, ay: 39, variants: 2, solid: [[-9, -4, 8], [9, -4, 8]],
    draw: function (p, ctx, rnd, v) {
      p.rect(2, 27, 40, 5, WDL); p.rect(2, 27, 40, 1, "#C69A68"); p.rect(2, 32, 40, 6, WD); p.rect(2, 37, 40, 1, WDD);          // Tischplatte, Zarge
      p.rect(3, 33, 17, 4, hx(WD, 0.88)); p.rect(23, 33, 17, 4, hx(WD, 0.88)); p.rect(18, 34, 1, 2, "#D0C8B0"); p.rect(25, 34, 1, 2, "#D0C8B0");
      p.rect(3, 38, 3, 1, WDD); p.rect(38, 38, 3, 1, WDD);
      p.rect(19, 24, 6, 3, "#3A3C40"); p.rect(14, 26, 16, 1, "#2A2C30");                                                       // Fuß
      p.rect(5, 4, 34, 21, "#1E1F22"); p.rect(6, 5, 32, 19, v ? "#4E7A34" : "#26323C");
      if (v) { p.rect(6, 5, 32, 10, "#6AA2D4"); p.rect(6, 12, 32, 3, "#8EC0E4"); p.ell(30, 9, 3, 3, "#F4E090"); p.ell(14, 14, 7, 3, "#3E6A2C"); p.ell(24, 15, 9, 3, "#4A7A34"); }
      else { p.line(9, 21, 20, 7, "#34444F"); p.line(12, 22, 24, 7, "#34444F"); }
      p.px(36, 24, "#C84A3C");
    }
  });
  // Zimmerpflanzen (3 Variationen)
  var POT = [["#A65A3C", "#C06A48", "#86462E"], ["#D8D4C8", "#ECE8DE", "#B0AC9E"], ["#6E7278", "#8A8E94", "#4E5258"]];
  def("m_plant", {
    name: function () { return L2("Zimmerpflanze", "Houseplant"); }, w: 28, h: 50, ax: 14, ay: 48, variants: 3, solid: [[0, -3, 5]],
    draw: function (p, ctx, rnd, v) {
      var pc = POT[v % 3], x, i;
      if (v === 0) {   // Gummibaum
        p.rect(13, 20, 2, 22, "#5E4A32");
        [[8, 12, 6, 3.4], [20, 14, 6, 3.4], [14, 6, 6, 3.6], [9, 22, 6, 3.2], [19, 23, 6, 3.2], [14, 16, 5, 3]].forEach(function (l, k) { p.ell(l[0], l[1], l[2], l[3], k % 2 ? "#2E5A34" : "#3E7240"); p.ell(l[0] - 1, l[1] - 1, l[2] * 0.5, l[3] * 0.4, "#6AA450"); });
      } else if (v === 1) {   // Palme
        p.rect(13, 22, 2, 20, "#6A5A3C");
        for (i = 0; i < 7; i++) { var a = -2.9 + i * 0.5, ex = 14 + Math.cos(a) * 12, ey = 22 + Math.sin(a) * 15 + (Math.abs(i - 3) * 1.6); p.line(14, 22, ex, ey, "#3E7240"); p.line(14, 23, ex, ey + 1, "#2E5A34"); p.px(ex, ey, "#6AA450"); p.px((14 + ex) / 2, (22 + ey) / 2 - 1, "#6AA450"); }
      } else {   // blühender Strauch
        p.ell(14, 28, 11, 9, "#3E7240"); p.ell(11, 25, 7, 6, "#4E8A4C"); p.ell(18, 31, 6, 5, "#2E5A34");
        for (i = 0; i < 14; i++) { x = (i * 37) % 19 + 5; p.px(x, 21 + (i * 11) % 14, i % 3 ? "#E88AA8" : "#F6F0E0"); }
      }
      p.rect(8, 40, 12, 8, pc[0]); p.rect(7, 38, 14, 3, pc[1]); p.rect(8, 40, 2, 8, pc[1]); p.rect(18, 40, 2, 8, pc[2]); p.rect(9, 46, 10, 2, pc[2]); p.rect(9, 39, 10, 1, "#4A3220");
    }
  });
})();
