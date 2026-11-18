/* Rap Streets – art-props.js  (seit v0.32)
   Weitere Objekte für den Editor, gleiche Technik wie art.js (Quader mit Texturen, dazu Pixel-Zeichnungen per extra):
   Autos (Kompaktwagen, Kombi, Pickup, Straßenkreuzer, Streifenwagen, Schulbus), Fahrrad, Motorrad,
   Tische, Stühle, Bänke, Bäume, Häuser (Ladenzeile, Projects, Reihenhaus, Mauer), Graffiti, Plakate, Müllsäcke,
   Subway-Abgang, Feuertonne, Klimaanlagen, Münztelefon, Briefkasten, Zeitungsautomaten, Kiosk, Ampel, Schilder,
   Parkuhr, Leitkegel, Basketballkorb, Einkaufswagen, Sofa, Reifen, Stromkasten, Bushaltestelle, Tauben, Hund, Asphalt-Flicken. */
(function () {
  var RS = window.RS, L2 = RS.L2, A = RS.ART, HW = RS.HW, HH = RS.HH, hex = RS.hex, sh = RS.shade, h2 = RS.hash2, n2 = RS.noise2;
  var def = A.def, solid = A.solid, windows = A.windows, brick = A.brick, pixText = A.pixText, line = A.line;
  function rgb(c) { return "rgb(" + c.map(Math.round).join(",") + ")"; }
  function col(c) { return typeof c === "string" ? c : rgb(c); }
  function dot(c, x, y, cc) { c.fillStyle = col(cc); c.fillRect(Math.round(x), Math.round(y), 1, 1); }
  function lit(cc, g) { var c = hex(cc).slice(); c.glow = g || sh(hex(cc), 0.3); return c; }
  // Kreis/Ellipse senkrecht in der x-z-Ebene (Räder): Punkte über P
  function wheel(c, P, cx, y, cz, r, tire, rim, spokes) {
    var rf = r / 15.56;
    for (var a = 0; a < 6.283; a += 0.12) { var p = P(cx + Math.cos(a) * rf, y, cz + Math.sin(a) * r); dot(c, p[0], p[1], tire); }
    if (spokes) for (var k = 0; k < 4; k++) { var b = k * 0.785, p1 = P(cx + Math.cos(b) * rf * 0.8, y, cz + Math.sin(b) * r * 0.8), p2 = P(cx - Math.cos(b) * rf * 0.8, y, cz - Math.sin(b) * r * 0.8); c.fillStyle = rim; line(c, p1[0], p1[1], p2[0], p2[1]); }
    var hp = P(cx, y, cz); dot(c, hp[0], hp[1], rim);
  }
  function seg(c, P, a, b, cc) { var p = P(a[0], a[1], a[2]), q = P(b[0], b[1], b[2]); c.fillStyle = col(cc); line(c, p[0], p[1], q[0], q[1]); }
  var T = solid("#121214");

  // ===================== Autos =====================
  var car = A.car;
  def("hatch", { name: function () { return L2("Kompaktwagen", "Hatchback"); }, w: 1.9, d: 0.95, variants: 4, group: "car", build: car(1.9, 0.95, ["#9A2A22", "#3E6A8E", "#C8B060", "#4E5A3E"], { x: 0.3, w: 1.22, h: 6 }) });
  def("wagon", { name: function () { return L2("Kombi mit Holzdekor", "Woody wagon"); }, w: 2.5, d: 1, variants: 3, group: "car", build: car(2.5, 1, ["#C8BCA0", "#5A3A2A", "#2E4A3A"], { x: 0.3, w: 1.85, h: 6 }, { panel: "#7A5232", van: 1 }) });
  def("caddy", { name: function () { return L2("Straßenkreuzer", "Land yacht"); }, w: 2.7, d: 1.05, variants: 4, group: "car", build: car(2.7, 1.05, ["#E8E4D8", "#3A1E3E", "#1E1E22", "#7A1418"], { x: 0.72, w: 1.15, h: 6 }, { vinyl: "#2A2426" }) });
  def("pickup", { name: function () { return L2("Pickup", "Pickup truck"); }, w: 2.4, d: 1, variants: 3, group: "car", build: function (v) {
    var b = car(2.4, 1, ["#8A2A1E", "#2E3E5A", "#B8B4A8"], { x: 1.05, w: 0.7, h: 7 })(v), cc = ["#8A2A1E", "#2E3E5A", "#B8B4A8"][v], s = solid(cc), bed = solid("#2A2A2C", 0.1, 3);
    b.boxes.push({ x: 0.05, y: 0.05, z: 7.9, w: 0.95, d: 0.9, h: 0.2, top: bed });
    b.boxes.push({ x: 0, y: 0, z: 8, w: 1, d: 0.08, h: 3, top: s, fy: s, fx: s }, { x: 0, y: 0.92, z: 8, w: 1, d: 0.08, h: 3, top: s, fy: s, fx: s }, { x: 0, y: 0, z: 8, w: 0.08, d: 1, h: 3, top: s, fy: s, fx: s });
    return b;
  } });
  def("police", { name: function () { return L2("Streifenwagen", "Police car"); }, w: 2.3, d: 1, variants: 2, group: "car",
    vname: function (v) { return v ? L2("mit Blaulicht", "lights on") : L2("geparkt", "parked"); },
    build: function (v) {
      var b = car(2.3, 1, ["#E8E6E0"], { x: 0.55, w: 1.1, h: 6 }, { stripe: "#2A4A9A" })(0);
      var bar = function (u, v2) { var red = u < 6; if (!v) return hex(red ? "#7A2020" : "#22306A"); return lit(red ? "#FF5A4A" : "#5A8AFF", red ? [255, 60, 50] : [60, 110, 255]); };
      b.boxes.push({ x: 0.95, y: 0.15, z: 14, w: 0.26, d: 0.7, h: 2.5, top: solid("#D8D8DC"), fy: bar, fx: bar });
      if (v) b.fx = [{ k: "siren", x: 1.08, y: 0.5, z: 17, cols: [[255, 40, 40], [40, 90, 255]] }];
      return b;
    } });
  // ----- Schulbus: lange Kiste, Motorhaube vorn, Fensterreihe, schwarze Zierstreifen
  def("bus", { name: function () { return L2("Schulbus", "School bus"); }, w: 4.6, d: 1.15, variants: 1, group: "car", build: function () {
    var Y = hex("#E8A818"), Y2 = sh(Y, -0.12), blk = hex("#1A1A1A"), L = 3.9 * HW;
    var side = function (u, v2) {
      if (v2 < 1) return sh(Y, 0.15);
      if (v2 >= 2 && v2 < 10 && u > 3 && u < L - 3) { var wu = (u - 3) % 4.4; if (wu < 0.9) return Y2; return v2 < 4 ? hex("#5A7A90") : hex("#26303A"); }
      if (Math.abs(v2 - 11.5) < 0.6 || Math.abs(v2 - 15.5) < 0.6 || Math.abs(v2 - 19) < 0.6) return blk;
      if (v2 >= 22) return hex("#2A2A2C");
      return Y;
    };
    var back = function (u, v2) { if (v2 >= 2 && v2 < 8 && u > 2 && u < 10) return hex("#26303A"); if (v2 > 8 && v2 < 11 && (u < 3 || u > 9.5)) return lit("#D83A2A", [255, 70, 50]); return v2 >= 18 ? hex("#2A2A2C") : Y; };
    var front = function (u, v2) { if (v2 >= 2 && v2 < 9 && u > 1 && u < 11.6) return v2 < 4 ? hex("#5A7A90") : hex("#26303A"); if (v2 < 1.5 && (u < 2.5 || u > 10)) return lit("#F0B020", [255, 190, 60]); if (Math.abs(v2 - 11.5) < 0.6) return blk; return v2 >= 22 ? hex("#2A2A2C") : Y; };
    var hood = function (u, v2) { if (v2 >= 7) return hex("#5A5C60"); if (v2 > 2 && v2 < 5 && (u < 3 || u > 9.5)) return lit("#F4EBB8", [255, 236, 170]); if (v2 > 2 && v2 < 6) return hex("#1E1E20"); return Y; };
    var roof = function (u, v2, a) { return sh(Y, a < 0.2 || a > 3.7 ? 0.05 : 0.18); };
    return { boxes: [
      { x: 0.5, y: -0.03, z: 0, w: 0.5, d: 1.21, h: 5, top: T, fy: T, fx: T }, { x: 3.2, y: -0.03, z: 0, w: 0.5, d: 1.21, h: 5, top: T, fy: T, fx: T },
      { x: 0, y: 0, z: 3, w: 3.9, d: 1.15, h: 24, top: roof, fy: side, fx: front },
      { x: 3.9, y: 0.1, z: 3, w: 0.7, d: 0.95, h: 9, top: solid("#D89810"), fy: solid("#D89810"), fx: hood },
    ] };
  } });
  // ----- Fahrrad: dünner Rahmen, Speichenräder
  def("bike", { name: function () { return L2("Fahrrad", "Bicycle"); }, w: 1.1, d: 0.14, variants: 3, group: "car", build: function (v) {
    var fc = ["#C83A2E", "#2E6AB0", "#1E1E1E"][v];
    return { boxes: [{ x: 0, y: 0, z: 0, w: 1.1, d: 0.14, h: 11, ghost: 1 }], extra: function (c, P) {
      var y = 0.07, rh = [0.22, y, 4], fh = [0.9, y, 4], bb = [0.52, y, 3.5], st = [0.44, y, 10], hb = [0.84, y, 11.5], ht = [0.8, y, 9.5];
      wheel(c, P, 0.22, y, 4, 4, "#141414", "#9A9EA2", 1); wheel(c, P, 0.9, y, 4, 4, "#141414", "#9A9EA2", 1);
      [[rh, bb], [bb, st], [st, rh], [st, ht], [ht, bb], [ht, fh], [ht, hb]].forEach(function (q) { seg(c, P, q[0], q[1], fc); });
      seg(c, P, [0.38, y, 11], [0.5, y, 11], "#1A1A1A"); seg(c, P, [0.84, y - 0.09, 12], [0.84, y + 0.09, 12], "#2A2A2A");
    } };
  } });
  def("moto", { name: function () { return L2("Motorrad (abgestellt)", "Motorcycle (parked)"); }, w: 1.4, d: 0.3, variants: 3, group: "car", build: function (v) {
    var bc = hex(["#9A1E1E", "#1E1E22", "#2E4E8A"][v]), body = function (u, v2) { return v2 < 1 ? sh(bc, 0.3) : sh(bc, (h2(u | 0, v2 | 0, 2) - 0.5) * 0.06); }, chrome = solid("#A8ACB0", 0.2, 5), seat = solid("#141414");
    return { boxes: [
      { x: 0.45, y: 0.07, z: 3, w: 0.45, d: 0.16, h: 6, top: chrome, fy: function (u, v2) { return Math.floor(v2) % 2 ? hex("#3A3E42") : hex("#A8ACB0"); }, fx: solid("#5A5E62") },
      { x: 0.68, y: 0.04, z: 9, w: 0.36, d: 0.22, h: 4, top: function (u, v2) { return sh(bc, 0.25); }, fy: body, fx: body },
      { x: 0.25, y: 0.07, z: 10, w: 0.45, d: 0.16, h: 2.5, top: seat, fy: seat, fx: seat },
      { x: 0.08, y: 0.22, z: 3, w: 0.5, d: 0.06, h: 1.5, top: chrome, fy: chrome, fx: chrome, noShadow: 1 },
      { x: 0.1, y: 0.07, z: 7, w: 0.25, d: 0.16, h: 2, top: body, fy: body, fx: body, noShadow: 1 }
    ], extra: function (c, P) {
      wheel(c, P, 0.2, 0.15, 5, 5, "#141414", "#6A6E72", 0); wheel(c, P, 0.2, 0.15, 5, 3, "#2A2A2C", "#8A8E92", 1);
      wheel(c, P, 1.2, 0.15, 5, 5, "#141414", "#6A6E72", 0); wheel(c, P, 1.2, 0.15, 5, 3, "#2A2A2C", "#8A8E92", 1);
      seg(c, P, [1.2, 0.15, 5], [1.04, 0.15, 15], "#9A9EA2"); seg(c, P, [1.02, 0.0, 16], [1.02, 0.3, 16], "#1A1A1A"); seg(c, P, [1.1, 0.15, 13], [1.12, 0.15, 13], "#F4EBB8");
      seg(c, P, [0.6, 0.27, 0], [0.66, 0.27, 3], "#3A3A3A");   // Seitenständer
    } };
  } });

  // ===================== Möbel =====================
  def("table", { name: function () { return L2("Tisch", "Table"); }, w: 1, d: 0.6, variants: 4, group: "furn",
    vname: function (v) { return [L2("Klapptisch", "Folding table"), L2("Domino-Tisch", "Domino table"), L2("Picknicktisch", "Picnic table"), L2("Bistrotisch", "Bistro table")][v]; },
    build: function (v) {
      var leg = solid("#3A3A3C");
      if (v === 2) {
        var wd = function (u, v2, a, b) { return sh(hex("#7A5A3A"), (Math.floor((b || v2 / 4) * 9) % 2 ? -0.12 : 0.04) + (h2(u | 0, v2 | 0, 3) - 0.5) * 0.1); }, ws = solid("#6A4E32", 0.1, 4);
        return { boxes: [{ x: 0, y: 0.1, z: 0, w: 0.08, d: 0.4, h: 9, top: ws, fy: ws, fx: ws }, { x: 0.92, y: 0.1, z: 0, w: 0.08, d: 0.4, h: 9, top: ws, fy: ws, fx: ws },
          { x: 0, y: 0.08, z: 9, w: 1, d: 0.44, h: 1.5, top: wd, fy: ws, fx: ws }, { x: 0, y: -0.2, z: 5, w: 1, d: 0.16, h: 1.2, top: wd, fy: ws, fx: ws }, { x: 0, y: 0.64, z: 5, w: 1, d: 0.16, h: 1.2, top: wd, fy: ws, fx: ws }] };
      }
      var top = v === 1 ? function (u, v2, a, b) { var q = Math.floor(a * 10), r = Math.floor(b * 10); if (h2(q, r, 7) > 0.8 && (a * 10) % 1 > 0.2 && (b * 10) % 1 > 0.25) return h2(q, r, 8) > 0.5 ? hex("#F2EEE4") : hex("#1A1A1A"); return sh(hex("#2E6A3A"), (h2(u | 0, v2 | 0, 2) - 0.5) * 0.1); }
        : v === 3 ? solid("#5A5E62", 0.12, 6) : solid("#DCD8CE", 0.06, 2);
      var w = v === 3 ? 0.6 : 1, d = v === 3 ? 0.6 : 0.6, h = v === 3 ? 12 : 10;
      return { boxes: [{ x: 0.05, y: 0.05, z: 0, w: 0.06, d: 0.06, h: h, top: leg, fy: leg, fx: leg }, { x: w - 0.11, y: 0.05, z: 0, w: 0.06, d: 0.06, h: h, top: leg, fy: leg, fx: leg },
        { x: 0.05, y: d - 0.11, z: 0, w: 0.06, d: 0.06, h: h, top: leg, fy: leg, fx: leg }, { x: w - 0.11, y: d - 0.11, z: 0, w: 0.06, d: 0.06, h: h, top: leg, fy: leg, fx: leg },
        { x: 0, y: 0, z: h, w: w, d: d, h: 1.2, top: top, fy: solid(v === 1 ? "#1E4A2A" : v === 3 ? "#3E4246" : "#B8B4AA"), fx: solid(v === 1 ? "#1E4A2A" : v === 3 ? "#3E4246" : "#B8B4AA") }] };
    } });
  def("chair", { name: function () { return L2("Stuhl", "Chair"); }, w: 0.4, d: 0.4, variants: 4, group: "furn",
    vname: function (v) { return [L2("Klappstuhl", "Folding chair"), L2("Plastikstuhl", "Plastic chair"), L2("Gartenstuhl", "Lawn chair"), L2("Bürostuhl, alt", "Old office chair")][v]; },
    build: function (v) {
      var c0 = ["#5A5E62", "#E8E6DE", "#3E7A4A", "#2A2A2C"][v], s = solid(c0, 0.08, v + 3), lg = v === 3 ? solid("#1A1A1A") : s;
      if (v === 2) {   // Gurtband-Stuhl: Streifen
        var web = function (u, v2) { return Math.floor(u / 2) % 2 ? hex("#3E7A4A") : hex("#E8E4D8"); };
        return { boxes: [{ x: 0, y: 0, z: 0, w: 0.04, d: 0.4, h: 6, top: solid("#B8BCC0"), fy: solid("#B8BCC0"), fx: solid("#9A9EA2") }, { x: 0.36, y: 0, z: 0, w: 0.04, d: 0.4, h: 6, top: solid("#B8BCC0"), fy: solid("#B8BCC0"), fx: solid("#9A9EA2") },
          { x: 0, y: 0.04, z: 5, w: 0.4, d: 0.32, h: 1, top: function (u, v2, a) { return Math.floor(a * 10) % 2 ? hex("#3E7A4A") : hex("#E8E4D8"); }, fy: web, fx: web }, { x: 0, y: 0, z: 6, w: 0.4, d: 0.05, h: 9, top: web, fy: web, fx: web }] };
      }
      var legs = v === 3 ? [{ x: 0.17, y: 0.17, z: 0, w: 0.06, d: 0.06, h: 6, top: lg, fy: lg, fx: lg }, { x: 0.02, y: 0.17, z: 0, w: 0.36, d: 0.06, h: 1, top: lg, fy: lg, fx: lg }, { x: 0.17, y: 0.02, z: 0, w: 0.06, d: 0.36, h: 1, top: lg, fy: lg, fx: lg }]
        : [{ x: 0.02, y: 0.02, z: 0, w: 0.05, d: 0.05, h: 6, top: lg, fy: lg, fx: lg }, { x: 0.33, y: 0.02, z: 0, w: 0.05, d: 0.05, h: 6, top: lg, fy: lg, fx: lg }, { x: 0.02, y: 0.33, z: 0, w: 0.05, d: 0.05, h: 6, top: lg, fy: lg, fx: lg }, { x: 0.33, y: 0.33, z: 0, w: 0.05, d: 0.05, h: 6, top: lg, fy: lg, fx: lg }];
      return { boxes: legs.concat([{ x: 0, y: 0, z: 6, w: 0.4, d: 0.4, h: 1.2, top: v === 3 ? solid("#3A3A44") : s, fy: s, fx: s }, { x: 0, y: 0, z: 7.2, w: 0.4, d: 0.06, h: v === 3 ? 8 : 9, top: s, fy: v === 3 ? solid("#3A3A44") : s, fx: s }]) };
    } });
  def("bench2", { name: function () { return L2("Bank (mehr Varianten)", "Bench (more variants)"); }, w: 1.6, d: 0.5, variants: 4, group: "furn",
    vname: function (v) { return [L2("Beton", "Concrete"), L2("Bushaltestelle mit Werbung", "Bus stop with ad"), L2("Parkbank, alt", "Old park bench"), L2("Metallgitter", "Metal mesh")][v]; },
    build: function (v) {
      if (v === 0) { var cr = function (u, v2) { return sh(hex("#9A968C"), (n2(u * 0.3, v2 * 0.3, 4) - 0.5) * 0.2 + (h2(u | 0, v2 | 0, 1) > 0.95 ? -0.2 : 0)); };
        return { boxes: [{ x: 0.1, y: 0.05, z: 0, w: 0.25, d: 0.4, h: 6, top: cr, fy: cr, fx: cr }, { x: 1.25, y: 0.05, z: 0, w: 0.25, d: 0.4, h: 6, top: cr, fy: cr, fx: cr }, { x: 0, y: 0, z: 6, w: 1.6, d: 0.5, h: 3, top: cr, fy: cr, fx: cr }] }; }
      if (v === 1) {
        var ad = function (u, v2, a, b, L) { if (v2 < 1 || v2 > 15 || u < 1 || u > L - 1) return hex("#3A3E42"); var c = v2 < 6 ? hex("#E8C040") : v2 < 11 ? hex("#C83A2E") : hex("#1E2A44"); if (pixText("JAM", 3, 7, u, v2)) c = hex("#F4F0E4"); c = c.slice(); c.glow = sh(c, 0.2); return c; };
        var mt = solid("#5A5E62");
        return { boxes: [{ x: 0, y: 0.1, z: 0, w: 0.06, d: 0.3, h: 7, top: mt, fy: mt, fx: mt }, { x: 1.54, y: 0.1, z: 0, w: 0.06, d: 0.3, h: 7, top: mt, fy: mt, fx: mt }, { x: 0, y: 0.1, z: 7, w: 1.6, d: 0.34, h: 1.2, top: solid("#7A7E82"), fy: mt, fx: mt },
          { x: 0, y: 0, z: 2, w: 1.6, d: 0.1, h: 16, top: mt, fy: ad, fx: mt }] };
      }
      if (v === 2) { var wd = hex("#6E5A44"), sl = function (u, v2) { return sh(wd, (Math.floor(v2) % 3 === 0 ? -0.3 : 0) + (h2(u | 0, Math.floor(v2 / 3), 6) - 0.5) * 0.25 + (h2(u | 0, v2 | 0, 2) > 0.93 ? -0.2 : 0)); }, ir = solid("#2A2622");
        return { boxes: [{ x: 0.05, y: 0, z: 0, w: 0.08, d: 0.5, h: 6, top: ir, fy: ir, fx: ir }, { x: 1.47, y: 0, z: 0, w: 0.08, d: 0.5, h: 6, top: ir, fy: ir, fx: ir }, { x: 0, y: 0.1, z: 6, w: 1.6, d: 0.4, h: 1.5, top: function (u, v2, a, b) { return sh(wd, (Math.floor(b * 7) % 2 ? -0.2 : 0.05) + (h2(u | 0, 9, 3) - 0.5) * 0.15); }, fy: sl, fx: sl },
          { x: 0, y: 0, z: 9, w: 1.6, d: 0.08, h: 8, top: sl, fy: sl, fx: sl }] }; }
      var mesh = function (u, v2) { return (Math.floor(u) % 2 === 0 || Math.floor(v2) % 2 === 0) ? hex("#2E5A4A") : null; }, gr = solid("#2E5A4A");
      return { boxes: [{ x: 0.05, y: 0.05, z: 0, w: 0.06, d: 0.4, h: 6, top: gr, fy: gr, fx: gr }, { x: 1.49, y: 0.05, z: 0, w: 0.06, d: 0.4, h: 6, top: gr, fy: gr, fx: gr },
        { x: 0, y: 0.08, z: 6, w: 1.6, d: 0.42, h: 1, top: function (u, v2, a, b) { return (Math.floor(a * 18) % 2 === 0 || Math.floor(b * 8) % 2 === 0) ? hex("#2E5A4A") : null; }, fy: gr, fx: gr }, { x: 0, y: 0, z: 7, w: 1.6, d: 0.06, h: 8, top: gr, fy: mesh, fx: gr }] };
    } });

  // ===================== Bäume =====================
  // Krone aus vielen unregelmäßigen Blattbüscheln an den Astenden – nicht rund, mit Lücken, durch die Äste schauen.
  // 4 Bilder: die Krone wiegt oben um 1 Pixel, Lichtflecken flirren.
  var TREES = [
    { n: ["Platane", "Plane tree"], h: 48, sp: 1.0, cl: 40, cs: [5, 9], cols: ["#1E3A22", "#2E5430", "#46703E", "#6A9450", "#94B464"], bark: ["#8A8676", "#B4AE98", "#5E5A50"], holes: 0.1, lim: 5 },
    { n: ["Gleditschie", "Honey locust"], h: 50, sp: 1.1, cl: 50, cs: [3, 6], cols: ["#3A4A1E", "#5A6E28", "#7E9234", "#A8B44A", "#D0D06A"], bark: ["#3A3028", "#544638", "#2A221C"], holes: 0.28, lim: 6 },
    { n: ["Kahler Baum", "Bare tree"], h: 46, sp: 1.25, cl: 0, cs: [0, 0], cols: [], bark: ["#4A4038", "#6A5E50", "#2E2822"], holes: 0, lim: 8 },
    { n: ["Götterbaum (Brache)", "Tree of heaven (lot)"], h: 36, sp: 1.2, cl: 30, cs: [4, 8], cols: ["#24401E", "#3A5E26", "#56802E", "#7EA23E", "#A6C058"], bark: ["#6E6A5A", "#8E8A76", "#4E4A3E"], holes: 0.1, lim: 5, fronds: 1 },
    { n: ["Jungbaum mit Pfahl", "Young tree with stake"], h: 28, sp: 0.7, cl: 16, cs: [3, 6], cols: ["#24462A", "#386236", "#548446", "#7AA65A", "#A0C474"], bark: ["#5A4A3A", "#7A6650", "#3A3028"], holes: 0.12, lim: 3, young: 1 }
  ];
  var TREEPIX = {};
  function treePixels(v) {   // Zeichnet den Baum einmal als Pixelliste {x, y, c, k} relativ zum Stammfuß; k = 0 Stamm/Ast, 1 Laub
    if (TREEPIX[v]) return TREEPIX[v];
    var D = TREES[v], r = RS.rng(4100 + v * 97), px = {}, ends = [];
    function put(x, y, c, k) { x = Math.round(x); y = Math.round(y); px[x + "," + y] = { x: x, y: y, c: c, k: k }; }
    function limb(x, y, ang, len, w, depth) {
      var steps = Math.max(2, Math.round(len));
      for (var i = 0; i < steps; i++) {
        var t = i / steps, ww = Math.max(1, w * (1 - t * 0.45));
        for (var j = 0; j < Math.round(ww); j++) { var c = j === 0 && ww > 1 ? D.bark[1] : j === Math.round(ww) - 1 && ww > 2 ? D.bark[2] : D.bark[0]; if (v === 0 && h2(Math.round(x + j), Math.round(y), 5) > 0.7) c = "#C8C2AC"; put(x + j - ww / 2, y, c, 0); }
        x += Math.cos(ang); y += Math.sin(ang); ang += (r() - 0.5) * 0.25;
      }
      if (depth <= 0 || len < 4) { ends.push([x, y]); return; }
      var n = 2 + (r() < 0.4 ? 1 : 0);
      for (var k = 0; k < n; k++) { var na = ang + (k - (n - 1) / 2) * (0.35 + r() * 0.3) + (r() - 0.5) * 0.25; na = Math.max(-Math.PI + 0.35, Math.min(-0.35, na)); limb(x, y, na, len * (0.55 + r() * 0.2), Math.max(1, w * 0.62), depth - 1); }
    }
    // Stamm
    var th = D.young ? D.h * 0.5 : D.h * 0.42, tw = D.young ? 2 : v === 2 ? 3 : 3.4;
    limb(0, 0, -Math.PI / 2 + (r() - 0.5) * 0.08, th, tw, 0); ends.pop();
    var top = [0, -th];
    for (var l = 0; l < D.lim; l++) { var a = -Math.PI / 2 + (l / (D.lim - 1) - 0.5) * 1.5 * D.sp + (r() - 0.5) * 0.35, hy = r() * th * (v === 2 ? 0.45 : 0.25); limb(top[0] + (r() - 0.5) * 2, top[1] + hy, a, D.h * (0.24 + r() * 0.14) * (1 - hy / th * 0.5), tw * 0.6, v === 2 ? 3 : 2); }
    if (D.young) { for (var s = 0; s < th + 2; s++) put(3, -s, s % 7 === 0 ? "#2A2A2A" : "#8A7458", 0); }
    // Laub: Büschel an den Astenden und dazwischen, jedes unregelmäßig, Licht von links oben
    if (D.cl) {
      var cls = [];
      ends.forEach(function (e) { cls.push([e[0], e[1], D.cs[0] + r() * (D.cs[1] - D.cs[0]), 0.6 + r() * 0.4]); });
      for (var q = 0; q < D.cl - ends.length; q++) { var e2 = ends[(r() * ends.length) | 0], tt = 0.35 + r() * 0.75; cls.push([top[0] + (e2[0] - top[0]) * tt + (r() - 0.5) * 7, top[1] + (e2[1] - top[1]) * tt + (r() - 0.5) * 6, D.cs[0] + r() * (D.cs[1] - D.cs[0]) * 0.9, 0.55 + r() * 0.4]); }
      var minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
      cls.forEach(function (b) { minX = Math.min(minX, b[0] - b[2] - 2); maxX = Math.max(maxX, b[0] + b[2] + 2); minY = Math.min(minY, b[1] - b[2] - 2); maxY = Math.max(maxY, b[1] + b[2] + 2); });
      var cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, R0 = Math.max(maxX - minX, maxY - minY) / 2, seed = 300 + v;
      for (var y = Math.floor(minY); y <= maxY; y++) for (var x = Math.floor(minX); x <= maxX; x++) {
        var best = -9, bb = null;
        for (var i = 0; i < cls.length; i++) { var b = cls[i], dx = (x + 0.5 - b[0]) / b[2], dy = (y + 0.5 - b[1]) / (b[2] * b[3]), f = 1 - (dx * dx + dy * dy); if (f > best) { best = f; bb = b; } }
        // gezackter Rand: grobes + feines Rauschen, einzelne Blattpixel
        var jit = (n2(x / 2.1, y / 2.1, seed) - 0.5) * 0.9 + (h2(x, y, seed) - 0.5) * 0.5;
        if (best + jit < 0.12) continue;
        if (D.holes && h2(x >> 1, y >> 1, seed + 3) < D.holes && best < 0.55) continue;
        if (D.fronds && h2(x, y, seed + 9) < 0.1) continue;
        var lx = (x - cx) / R0, ly = (y - cy) / R0, ll = (x - bb[0]) / bb[2], lyy = (y - bb[1]) / bb[2];
        var lv = -ll * 0.35 - lyy * 0.7 - lx * 0.25 - ly * 0.35 + (n2(x / 1.7, y / 1.7, seed + 1) - 0.5) * 1.0;
        var idx = lv > 0.62 ? 3 : lv > 0.08 ? 2 : lv > -0.45 ? 1 : 0, hh = h2(x, y, seed + 7);
        if (idx === 2 && hh > 0.88) idx = 3; else if (idx === 1 && hh > 0.92) idx = 2; else if (idx === 1 && hh < 0.08) idx = 0;
        put(x, y, D.cols[idx], idx === 3 && hh > 0.95 ? 2 : 1);
        if (idx === 3 && hh > 0.97) put(x, y, D.cols[4], 2);
      }
      // Äste vor dem Laub an ein paar Stellen sichtbar lassen
      ends.forEach(function (e, i) { if (i % 3 === 0) for (var k = 0; k < 3; k++) put(e[0] - k * 0.5, e[1] + k, D.bark[2], 0); });
    }
    var L = Object.keys(px).map(function (k) { return px[k]; }), top2 = 0; L.forEach(function (p) { top2 = Math.min(top2, p.y); });
    return (TREEPIX[v] = { pix: L, top: top2, th: th });
  }
  def("tree", { name: function () { return L2("Baum", "Tree"); }, w: 1, d: 1, variants: TREES.length, group: "nature", anim: { n: 4, fps: 1.6 },
    vname: function (v) { return L2(TREES[v].n[0], TREES[v].n[1]); },
    build: function (v, fr) {
      var D = TREES[v], tp = treePixels(v), H0 = -tp.top, pit = function (u, v2, a, b) { if (a < 0.08 || b < 0.08 || a > 0.92 || b > 0.92) return sh(hex("#8E8A80"), (h2(u | 0, v2 | 0, 2) - 0.5) * 0.1); return sh(hex("#4A3E30"), (h2(u | 0, v2 | 0, 6) - 0.5) * 0.3); };
      var guard = solid("#1A1A1A"), boxes = [{ x: 0, y: 0, z: 0, w: 1, d: 1, h: 0.6, top: pit, fy: solid("#7A766C"), fx: solid("#6A665E") }];
      if (v !== 3) [[0.05, 0.05, 0.9, 0.04], [0.05, 0.91, 0.9, 0.04], [0.05, 0.05, 0.04, 0.9], [0.91, 0.05, 0.04, 0.9]].forEach(function (g) { boxes.push({ x: g[0], y: g[1], z: 0.6, w: g[2], d: g[3], h: 4, top: guard, fy: function (u, v2) { return Math.floor(u) % 3 === 0 || v2 < 1 ? hex("#1A1A1A") : null; }, fx: function (u, v2) { return Math.floor(u) % 3 === 0 || v2 < 1 ? hex("#1A1A1A") : null; }, noShadow: 1 }); });
      boxes.push({ x: 0.42, y: 0.42, z: 0, w: 0.16, d: 0.16, h: tp.th, ghost: 1 });
      if (D.cl || v === 2) boxes.push({ x: -0.55, y: -0.55, z: tp.th * 0.75, w: 2.1, d: 2.1, h: H0 - tp.th * 0.7, ghost: 1, round: 1 });
      var sway = [0, 1, 0, -1][fr || 0];
      return { boxes: boxes, pad: 40, extra: function (c, P, ec, r) {
        var b = P(0.5, 0.5, 0.6), bx = Math.round(b[0]), by = Math.round(b[1]), fl = r ? -1 : 1;
        tp.pix.forEach(function (p) {
          var f = Math.max(0, (-p.y - tp.th * 0.8) / (H0 - tp.th * 0.8)), dx = Math.round(sway * f * 1.4);
          var cc = p.c; if (p.k === 2 && h2(p.x, p.y, 40 + (fr || 0)) < 0.5) cc = D.cols[2];
          c.fillStyle = cc; c.fillRect(bx + p.x * fl + dx, by + p.y, 1, 1);
        });
      } };
    } });

  // ===================== Häuser =====================
  var SHOPS = [["PIZZA", "#B03028", "#F2EEE4", "#E8C878"], ["LAUNDROMAT", "#2E5A8A", "#E8E4D8", "#A8B4BC"], ["LIQUORS", "#1E1E22", "#F2C230", "#7E6A5A"], ["BARBER", "#2A2A2E", "#E8E4D8", "#B8A890"]];
  def("shop", { name: function () { return L2("Ladenzeile", "Shop row"); }, w: 5, d: 3, variants: 4, group: "house",
    vname: function (v) { return SHOPS[v][0]; },
    build: function (v) {
      var S = SHOPS[v], H = 46, seed = 140 + v, up = hex(S[3]), br = brick(["#8E4A3A", "#7A3E30", "#6E5A4A", "#8A5A44"][v], "#6E5E54");
      var win = windows({ x0: 5, y0: 5, sx: 10, sy: 13, ww: 5, wh: 8, frame: hex("#D8D0C0"), ny: 1, blind: hex("#E4DCCC") });
      var shop = function (u, v2, a, b, L) {
        if (v2 < 20) { var w = win(u, v2, seed, L); if (w) return w; return br(u, v2); }
        if (v2 < 27) { if (pixText(S[0].length * 4 > L - 4 ? S[0].slice(0, Math.floor((L - 4) / 4)) : S[0], Math.round(L / 2 - Math.min(S[0].length * 4, L - 4) / 2), 21, u, v2)) return lit(S[2], sh(hex(S[2]), 0.2)); return hex(S[1]); }
        if (u < 2 || u > L - 2 || v2 > H - 2) return hex("#2A2420");
        if (Math.abs(u - L * 0.2) < 3.5 && v2 > 29) return v2 < 31 ? hex("#2A2420") : hex("#1A1E22");
        if (v === 3 && Math.abs(u - L * 0.08) < 1.2 && v2 > 28 && v2 < 40) return ((Math.floor(v2 - u) % 4) < 2 ? lit("#D83A2A", [255, 80, 60]) : lit("#F2F0EA", [255, 255, 240]));
        var gl = (v2 - 28) % 9; if (v2 > 28 && gl < 0.8) return hex("#3A322A");
        var c = h2(Math.floor(u / 3), Math.floor((v2 - 28) / 4), seed); c = v === 1 ? (c > 0.5 ? hex("#C8CCD0") : hex("#8A9298")) : v === 0 ? (c > 0.6 ? hex("#E8C060") : hex("#7A3A22")) : v === 2 ? [hex("#C8A040"), hex("#6A8A3A"), hex("#3A2A20"), hex("#E8E4D8")][Math.floor(c * 4)] : (c > 0.5 ? hex("#C8B8A0") : hex("#4A3A30"));
        var g = sh(c, -0.15); g.glow = sh(c, 0.35); return g;
      };
      var top = function (u, v2) { return sh(hex("#4E4C4A"), (h2(u | 0, v2 | 0, 9) - 0.5) * 0.18); };
      return { boxes: [{ x: 0, y: 0, z: 0, w: 5, d: 3, h: H, top: top, fy: shop, fx: function (u, v2, a, b, L) { var w = win(u, v2, seed + 1, L); if (w && v2 < 20) return w; return br(u, v2); } },
        { x: 0, y: 0, z: H, w: 5, d: 3, h: 2, top: solid("#5A5654"), fy: solid("#8A8070"), fx: solid("#7A7064") },
        { x: 0.6, y: 3, z: 15, w: 3.8, d: 0.4, h: 2, top: function (u, v2, a) { return hex(Math.floor(a * 5) % 2 ? S[1] : S[2]); }, fy: solid(S[1]), fx: solid(S[1]) }] };
    } });
  def("project", { name: function () { return L2("Sozialbau (Projects)", "Housing projects"); }, w: 6, d: 4, variants: 2, group: "house", build: function (v) {
    var H = 132, seed = 200 + v, br = brick(["#8A4234", "#6E5244"][v], "#7A6A60");
    var win = windows({ x0: 5, y0: 6, sx: 9, sy: 12, ww: 5, wh: 6, frame: hex("#9A948A"), ny: 10, blind: hex("#D8D0B8") });
    var wall = function (u, v2, a, b, L) { if (v2 > H - 14 && v2 < H - 2 && Math.abs(u - L / 2) < 6) { if (v2 < H - 12 || Math.abs(u - L / 2) > 5) return hex("#5A524A"); return hex("#1A1C1E"); } var w = win(u, v2, seed, L); if (w) return w; if (v2 % 12 > 11.2) return hex("#9A8A7A"); return br(u, v2); };
    var top = function (u, v2) { return sh(hex("#46464A"), (h2(u | 0, v2 | 0, 5) - 0.5) * 0.16); };
    var p = solid("#7A6E64");
    return { boxes: [{ x: 0, y: 0, z: 0, w: 6, d: 4, h: H, top: top, fy: wall, fx: wall },
      { x: 0, y: 0, z: H, w: 6, d: 0.15, h: 3, top: p, fy: p, fx: p }, { x: 0, y: 3.85, z: H, w: 6, d: 0.15, h: 3, top: p, fy: p, fx: p }, { x: 5.85, y: 0, z: H, w: 0.15, d: 4, h: 3, top: p, fy: p, fx: p },
      { x: 2, y: 1.2, z: H, w: 1.4, d: 1.2, h: 10, top: top, fy: solid("#6A5E54"), fx: solid("#5A5048") }] };
  } });
  def("rowhouse", { name: function () { return L2("Reihenhaus mit Verkleidung", "Sided row house"); }, w: 3, d: 3, variants: 3, group: "house", build: function (v) {
    var H = 44, seed = 230 + v, sid = hex(["#C8B898", "#9AB0C0", "#A8C0A4"][v]);
    var win = windows({ x0: 4, y0: 6, sx: 10, sy: 18, ww: 5, wh: 9, frame: hex("#F0ECE4"), ny: 2, blind: hex("#E8E0D0") });
    var wall = function (u, v2, a, b, L) {
      var w = win(u, v2, seed, L); if (w) return w;
      return sh(sid, (v2 % 3 < 0.8 ? -0.14 : 0.02) + (h2(Math.floor(u / 12), Math.floor(v2 / 3), seed) - 0.5) * 0.04 + (n2(u * 0.1, v2 * 0.1, seed) - 0.5) * 0.06);
    };
    var front = function (u, v2, a, b, L) { if (u > L - 10 && u < L - 3 && v2 > H - 20) return u < L - 9 || u > L - 4 || v2 < H - 19 ? hex("#F0ECE4") : hex("#5A2E22"); return wall(u, v2, a, b, L); };
    var roof = function (u, v2) { return sh(hex("#3E3A38"), (h2(u | 0, v2 | 0, 3) - 0.5) * 0.2); };
    var aw = function (u, v2, a) { return Math.floor(a * 8) % 2 ? hex("#E8E4D8") : hex("#3A6A4A"); };
    return { boxes: [{ x: 0, y: 0, z: 0, w: 3, d: 3, h: H, top: roof, fy: front, fx: wall }, { x: -0.06, y: -0.06, z: H, w: 3.12, d: 3.12, h: 2, top: roof, fy: solid("#E8E4DC"), fx: solid("#D8D4CC") },
      { x: 1.95, y: 3, z: 0, w: 0.75, d: 0.5, h: 3, top: solid("#9A9690"), fy: solid("#8A867E"), fx: solid("#7A766E") }, { x: 1.9, y: 3, z: 24, w: 0.85, d: 0.4, h: 2, top: aw, fy: solid("#3A6A4A"), fx: solid("#3A6A4A") }] };
  } });
  def("wall", { name: function () { return L2("Mauer", "Wall"); }, w: 3, d: 0.3, variants: 3, group: "house",
    vname: function (v) { return [L2("Backstein", "Brick"), L2("Beton", "Concrete"), L2("Backstein, niedrig", "Brick, low")][v]; },
    build: function (v) {
      var H = v === 2 ? 14 : 30, br = brick("#8A3E30", "#6E5A50"), cr = function (u, v2) { return sh(hex("#8A8A86"), (n2(u * 0.2, v2 * 0.2, 9) - 0.5) * 0.18 + (Math.floor(u) % 14 === 0 ? -0.2 : 0)); };
      var f = v === 1 ? cr : br, cap = solid(v === 1 ? "#9E9E9A" : "#9A8A7A");
      return { boxes: [{ x: 0, y: 0, z: 0, w: 3, d: 0.3, h: H, top: cap, fy: f, fx: f }, { x: -0.03, y: -0.03, z: H, w: 3.06, d: 0.36, h: 1.5, top: cap, fy: cap, fx: cap }] };
    } });

  // ===================== Graffiti und Plakate (an Wände stellen) =====================
  var WORDS = ["RAP", "ILL", "NYC", "DOPE", "WORD", "HYPE", "CREW", "BKLN"];
  var GPAL = [["#E83A6A", "#F28AAE"], ["#F2C230", "#F07A2A"], ["#30B8E0", "#2E5AB0"], ["#7AD84A", "#2E8A3A"], ["#B060E0", "#5A2A9A"], ["#E8E4D8", "#A8ACB0"]];
  var GRAF = {};
  function grafPix(v, Wp, Hp) {   // Bitmap der Graffiti-Variante (Wp × Hp Pixel), Werte = Farbe oder null
    var k = v + ":" + Wp; if (GRAF[k]) return GRAF[k];
    var r = RS.rng(900 + v * 31), M = [], y, x, i;
    for (y = 0; y < Hp; y++) { M.push([]); for (x = 0; x < Wp; x++) M[y].push(null); }
    var set = function (x, y, c) { if (x >= 0 && y >= 0 && x < Wp && y < Hp) M[y][x] = c; };
    if (v === 6 || v === 7) {   // Tags: schnelle Filzstift-Linien
      var cc = v === 6 ? "#141414" : "#E83A6A", n = 3 + ((r() * 2) | 0), px = 3;
      for (i = 0; i < n; i++) {
        var w = 5 + r() * 5, x0 = px, yb = 8 + r() * 6; px += w + 2;
        for (var t = 0; t < 1; t += 0.03) { var xx = x0 + t * w, yy = yb - Math.abs(Math.sin(t * Math.PI * (1 + (i % 2)))) * (6 + r() * 2) + Math.sin(t * 13 + i) * 1.2; set(Math.round(xx), Math.round(yy), cc); }
        set(Math.round(x0 + w * 0.5), Math.round(yb + 2), cc);
      }
      for (x = 2; x < px - 2; x++) if (r() < 0.75) set(x, 18, cc);
      if (r() < 0.8) { set(px, 6, cc); set(px, 7, cc); set(px, 9, cc); }
      return (GRAF[k] = M);
    }
    var word = WORDS[v % WORDS.length], P2 = GPAL[v % GPAL.length], sc = 2, gw = 6, L = word.length * (gw + 2), ox = Math.max(2, Math.round((Wp - L) / 2)), oy = Math.round((Hp - 10) / 2);
    var F = []; for (y = 0; y < Hp; y++) { F.push([]); for (x = 0; x < Wp; x++) F[y].push(0); }
    for (i = 0; i < word.length; i++) {
      var g = RS.glyph(word[i]), lx = ox + i * (gw + 2), wob = Math.round((r() - 0.5) * 2);
      for (var gy = 0; gy < 5; gy++) for (var gx = 0; gx < 3; gx++) if (g[gy * 3 + gx] === "1") for (var a = 0; a < sc; a++) for (var b = 0; b < sc; b++) { var X = lx + gx * sc + a, Y = oy + gy * sc + b + wob; if (X >= 0 && Y >= 0 && X < Wp && Y < Hp) F[Y][X] = 1; }
    }
    // weiche Ecken (Bubble) und Umriss
    var inside = function (x, y) { return y >= 0 && x >= 0 && y < Hp && x < Wp && F[y][x]; };
    var near = function (x, y, d) { for (var yy = -d; yy <= d; yy++) for (var xx = -d; xx <= d; xx++) if (Math.abs(xx) + Math.abs(yy) <= d + (d > 1 ? 1 : 0) && inside(x + xx, y + yy)) return true; return false; };
    var piece = v < 4, back = v % 2 === 0;
    for (y = 0; y < Hp; y++) for (x = 0; x < Wp; x++) {
      if (inside(x, y)) {
        var c = v === 5 || v === 4 ? (y < oy + 4 ? "#E8E8E4" : "#B8BCC0") : (y - oy < 5 ? P2[0] : P2[1]);
        if (piece && !inside(x - 1, y - 1)) c = "#F8F4E8";
        set(x, y, c);
      } else if (near(x, y, 1)) set(x, y, "#141414");
      else if (piece && near(x - 1, y - 1, 1)) set(x, y, "#3A2A44");          // 3D-Schatten
      else if (back && near(x, y, 3) && n2(x * 0.3, y * 0.3, v) > 0.35) set(x, y, v === 0 ? "#5A9AD8" : "#E07AAA");
    }
    // Läufer
    for (i = 0; i < 6; i++) { x = ox + ((r() * L) | 0); for (y = oy + 11; y < oy + 12 + r() * 5 && y < Hp; y++) if (M[y - 1] && M[y - 1][x]) set(x, y, M[y - 1][x] === "#141414" ? "#141414" : P2[1]); }
    return (GRAF[k] = M);
  }
  def("graffiti", { name: function () { return L2("Graffiti (an Wand)", "Graffiti (on wall)"); }, w: 3.6, d: 0.04, variants: 8, group: "wall", wall: 1, build: function (v) {
    var Wp = Math.round(3.6 * HW), Hp = 22, M = grafPix(v, Wp, Hp);
    return { boxes: [{ x: 0, y: 0, z: 3, w: 3.6, d: 0.04, h: Hp, fy: function (u, v2) { var c = M[Math.floor(v2)] && M[Math.floor(v2)][Math.floor(u)]; return c ? hex(c) : null; }, fx: null, top: null, noShadow: 1 }] };
  } });
  def("posters", { name: function () { return L2("Plakate (an Wand)", "Posters (on wall)"); }, w: 2, d: 0.04, variants: 4, group: "wall", wall: 1, build: function (v) {
    var r = RS.rng(77 + v * 13), P = [], Wp = 22, Hp = 24, i;
    for (i = 0; i < 3 + (v % 2); i++) P.push({ x: (r() * 12) | 0, y: (r() * 8) | 0, w: 7 + ((r() * 5) | 0), h: 10 + ((r() * 5) | 0), c: ["#E8E0C8", "#F2C230", "#D83A2E", "#2E2E32", "#E8E4D8", "#3A78E0"][(r() * 6) | 0], t: ["RAP", "JAM", "LIVE", "DJ", "SAT"][(r() * 5) | 0], s: (r() * 99) | 0 });
    var f = function (u, v2) {
      for (var k = P.length - 1; k >= 0; k--) {
        var p = P[k], x = u - p.x, y = v2 - p.y; if (x < 0 || y < 0 || x >= p.w || y >= p.h) continue;
        if ((x < 1 || y < 1 || x >= p.w - 1 || y >= p.h - 1) && h2(u | 0, v2 | 0, p.s) < 0.4) continue;   // ausgefranste Ränder
        var dk = p.c === "#2E2E32", base = hex(p.c);
        if (pixText(p.t, 1, 2, x, y)) return dk ? hex("#F2C230") : hex("#141414");
        if (y > 8 && y < p.h - 2 && x > 0 && x < p.w - 1 && Math.floor(y) % 2 === 0 && h2(Math.floor(x / 2), Math.floor(y), p.s) > 0.35) return dk ? hex("#B8B4AA") : sh(base, -0.45);
        return sh(base, (h2(u | 0, v2 | 0, 5) - 0.5) * 0.08 - (y / p.h) * 0.08);
      }
      return null;
    };
    return { boxes: [{ x: 0, y: 0, z: 6, w: 2, d: 0.04, h: Hp, fy: f, noShadow: 1 }] };
  } });

  // ===================== Müll =====================
  function bag(c, x, y, w, h, base, hi, tie) {   // Müllsack: unregelmäßiger Klumpen mit Glanz und Knoten
    for (var yy = -h; yy <= 0; yy++) for (var xx = -w; xx <= w; xx++) {
      var nx = xx / w, ny = (yy + h * 0.45) / (h * 0.6), f = nx * nx + ny * ny + (h2(xx + x * 3, yy + y * 5, 11) - 0.5) * 0.35;
      if (f > 1) continue;
      var l = -nx * 0.6 - ny * 0.8 + (n2((xx + x) / 2, (yy + y) / 2, 3) - 0.5) * 0.8, cc = l > 0.75 ? hi : l > 0.1 ? sh(hex(base), 0.12) : l > -0.6 ? hex(base) : sh(hex(base), -0.4);
      dot(c, x + xx, y + yy, cc);
    }
    if (tie) { dot(c, x, y - h - 1, base); dot(c, x - 1, y - h - 2, base); dot(c, x + 1, y - h - 2, base); }
  }
  def("bags", { name: function () { return L2("Müllsäcke", "Garbage bags"); }, w: 1, d: 0.7, variants: 4, group: "trash",
    vname: function (v) { return [L2("ein paar", "a few"), L2("großer Haufen", "big pile"), L2("mit Karton", "with box"), L2("aufgerissen", "torn open")][v]; },
    build: function (v) {
      var boxes = [{ x: 0, y: 0, z: 0, w: 1, d: 0.7, h: v === 1 ? 12 : 8, ghost: 1, round: 1 }];
      if (v === 2) { var cb = function (u, v2) { return sh(hex("#A88458"), (h2(u | 0, v2 | 0, 4) - 0.5) * 0.12 + (Math.abs(v2 - 1) < 0.6 ? -0.15 : 0)); }; boxes.push({ x: 0.5, y: 0.05, z: 0, w: 0.45, d: 0.4, h: 9, top: function (u, v2, a) { return Math.abs(a - 0.22) < 0.03 ? hex("#7A5E3A") : hex("#B8946A"); }, fy: cb, fx: cb }); }
      return { boxes: boxes, extra: function (c, P) {
        var r = RS.rng(500 + v), L = [[0.3, 0.35, 5, 5], [0.65, 0.4, 4, 4], [0.45, 0.6, 4, 4]];
        if (v === 1) L = L.concat([[0.2, 0.15, 5, 6], [0.6, 0.15, 5, 5], [0.8, 0.6, 4, 4], [0.4, 0.4, 5, 7], [0.15, 0.55, 4, 4]]);
        if (v === 2) L = [[0.25, 0.3, 5, 5], [0.3, 0.6, 4, 4], [0.7, 0.62, 4, 3]];
        L.sort(function (a, b) { return (a[0] + a[1]) - (b[0] + b[1]); }).forEach(function (q, i) {
          var p = P(q[0], q[1], 0), white = (v === 1 && i === 3) || (v === 3 && i === 1);
          bag(c, Math.round(p[0]), Math.round(p[1]), q[2], q[3], white ? "#C8C8C4" : "#1E1E22", white ? "#F2F2EE" : "#5A5E66", r() < 0.7);
        });
        if (v === 3) { var p0 = P(0.7, 0.75, 0); [["#D8D4C8", 0, 0], ["#C83A2E", 3, 1], ["#E8C040", -3, 2], ["#6A9A6A", 5, -1], ["#D8D4C8", -5, 1], ["#8A6A4A", 1, 3]].forEach(function (q) { dot(c, p0[0] + q[1], p0[1] + q[2], q[0]); dot(c, p0[0] + q[1] + 1, p0[1] + q[2], q[0]); }); }
      } };
    } });
  def("barrel", { name: function () { return L2("Feuertonne", "Fire barrel"); }, w: 0.45, d: 0.45, variants: 2, group: "trash", anim: { n: 6, fps: 10 },
    vname: function (v) { return v ? L2("aus", "out") : L2("brennt", "burning"); },
    build: function (v, fr) {
      var drum = function (u, v2) { return sh(hex("#4A5A6A"), (Math.floor(v2) % 5 === 0 ? -0.3 : 0) + (n2(u * 0.4, v2 * 0.4, 7) > 0.6 ? -0.35 : 0) + (h2(u | 0, v2 | 0, 3) - 0.5) * 0.12); };
      var b = { boxes: [{ x: 0, y: 0, z: 0, w: 0.45, d: 0.45, h: 13, top: function (u, v2, a, b) { var d = Math.min(a, b, 0.45 - a, 0.45 - b); return d < 0.05 ? hex("#3A4652") : v ? hex("#2A2420") : hex("#5A2A10"); }, fy: drum, fx: drum }] };
      if (!v) {
        b.fx = [{ k: "fire", x: 0.22, y: 0.22, z: 18 }];
        b.extra = function (c, P, ec) {
          var p = P(0.225, 0.225, 13), r = RS.rng(fr * 31 + 5), F = ["#FFF2A0", "#FFD040", "#FF9A20", "#E8501A", "#8A2A10"];
          for (var i = 0; i < 26; i++) { var x = (r() - 0.5) * 7, h = r() * (9 - Math.abs(x)), y = -h; var k = Math.min(4, Math.floor((h / 9) * 4 + r() * 1.2)); dot(c, p[0] + x, p[1] + y, F[4 - Math.min(4, 4 - k)] ); dot(ec, p[0] + x, p[1] + y, F[Math.max(0, k - 1)]); }
          for (var j = 0; j < 3; j++) dot(c, p[0] + (r() - 0.5) * 6, p[1] - 10 - r() * 6, r() < 0.5 ? "#FFB040" : "#FF7A20");
        };
      }
      return b;
    } });

  // ===================== Subway-Abgang =====================
  def("subway", { name: function () { return L2("Subway-Abgang", "Subway entrance"); }, w: 3, d: 1.5, variants: 2, group: "street",
    vname: function (v) { return v ? L2("mit Schild", "with sign") : L2("offen", "open"); },
    build: function (v) {
      var G = hex("#2E5A3E"), g = solid("#2E5A3E"), gd = solid("#1E3A28"), boxes = [], y0 = 0.15, y1 = 1.35;
      var tile = function (u, v2, D) {
        if (u > 40 && v2 > D - 22 && (u - 40) > 3 && (u - 40) < 13) return v2 > D - 4 ? hex("#3A3020") : hex("#0E0F10");          // Durchgang zur Station unten
        if (v2 < 1.5) return hex("#1E1E1C");                                                                                         // Kante oben
        var t = (Math.floor(u / 3) + Math.floor(v2 / 2)) % 2, c = (u % 3 < 0.7 || v2 % 2 < 0.5) ? hex("#5A5A52") : hex(t ? "#A8A494" : "#9A9686");
        if (v2 > 5 && v2 < 8) c = hex("#2E6A4A");                                                                                    // grünes Fliesenband
        return sh(c, (n2(u * 0.2, v2 * 0.15, 4) - 0.4) * 0.35 - 0.15 - Math.pow(v2 / D, 0.6) * 0.9);
      };
      var hole = { x: 0, y: y0, w: 3, d: y1 - y0, depth: 40, steps: 9, wall: tile,
        tread: function (f, q) { return f > 0.62 ? hex("#D8B838") : sh(hex("#8E8C84"), (h2(Math.floor(q), Math.floor(f * 4), 3) - 0.5) * 0.12); },
        riser: function (u, v2) { return sh(hex("#2E2C28"), (h2(u | 0, v2 | 0, 2) - 0.5) * 0.1); } };
      // Geländer an den Seiten und hinten, vorn offen
      var post = function (x, y) { boxes.push({ x: x, y: y, z: 0, w: 0.08, d: 0.08, h: 12, top: g, fy: g, fx: gd }, { x: x - 0.02, y: y - 0.02, z: 12, w: 0.12, d: 0.12, h: 2, top: solid("#4A8A5E"), fy: g, fx: gd }); };
      [0, 1.45, 2.9].forEach(function (x) { post(x, y0 - 0.08); post(x, y1); });
      var rail = function (u, v2) { return v2 < 1.2 ? hex("#3A6E4A") : v2 > 9 ? G : v2 > 6.5 && v2 < 7.5 ? G : (Math.floor(u) % 4 === 0 ? G : null); };
      boxes.push({ x: 0, y: y0 - 0.06, z: 0, w: 2.95, d: 0.06, h: 11, top: g, fy: rail, fx: g, noShadow: 1 }, { x: 0, y: y1, z: 0, w: 2.95, d: 0.06, h: 11, top: g, fy: rail, fx: g, noShadow: 1 }, { x: -0.06, y: y0 - 0.06, z: 0, w: 0.06, d: y1 - y0 + 0.12, h: 11, top: g, fy: g, fx: rail, noShadow: 1 });
      // Laternen mit grünen Kugeln vorn
      var globe = function () { return lit("#7ADA8A", [120, 255, 150]); };
      [y0 - 0.07, y1].forEach(function (y) { boxes.push({ x: 2.9, y: y, z: 0, w: 0.08, d: 0.08, h: 22, top: g, fy: g, fx: gd }, { x: 2.86, y: y - 0.04, z: 22, w: 0.16, d: 0.16, h: 4, top: globe, fy: globe, fx: globe }); });
      if (v) {
        var sign = function (u, v2, a, b, L) { if (v2 < 0.8) return hex("#2E5A3E"); if (pixText("SUBWAY", Math.round(L / 2 - 12), 1.5, u, v2)) return lit("#F4F2EA", [255, 255, 245]); return hex("#141414"); };
        boxes.push({ x: 0.3, y: y1, z: 11, w: 2.4, d: 0.05, h: 8, top: solid("#141414"), fy: sign, fx: solid("#141414") });
      }
      return { boxes: boxes, hole: hole, fx: [{ k: "glow", x: 2.94, y: y0 - 0.03, z: 24, col: [110, 255, 150], r: 7, day: 0.1 }, { k: "glow", x: 2.94, y: y1 + 0.04, z: 24, col: [110, 255, 150], r: 7, day: 0.1 }] };
    } });

  // ===================== Details an Häusern =====================
  def("ac", { name: function () { return L2("Klimaanlage", "Air conditioner"); }, w: 0.5, d: 0.42, variants: 4, group: "wall", wall: 1,
    vname: function (v) { return [L2("Fenster, 1. Stock", "Window, 1st floor"), L2("Fenster, 2. Stock", "Window, 2nd floor"), L2("Fenster, 3. Stock", "Window, 3rd floor"), L2("Außengerät am Boden", "Ground unit")][v]; },
    build: function (v) {
      var z = [22, 39, 56, 0][v], c0 = hex(v === 3 ? "#8A8C88" : "#C8C4B8"), grill = function (u, v2) { if (u > 1 && u < 4.5 && v2 > 1 && v2 < 6) return Math.floor(v2) % 2 ? hex("#3A3A3A") : sh(c0, -0.2); return sh(c0, (h2(u | 0, v2 | 0, 3) - 0.5) * 0.08 + (n2(u * 0.4, v2 * 0.4, 5) > 0.7 ? -0.25 : 0)); };
      if (v === 3) { var fan = function (u, v2) { var dx = u - 4, dy = v2 - 5, d = dx * dx + dy * dy; if (d < 12) return d < 1.5 ? hex("#5A5A5A") : (Math.floor(Math.atan2(dy, dx) * 2) % 2 ? hex("#2A2A2A") : hex("#4A4A4A")); return grill(u, v2); };
        return { boxes: [{ x: 0, y: 0, z: 0, w: 0.5, d: 0.42, h: 11, top: fan, fy: grill, fx: grill }] }; }
      var br = solid("#3A3A3A");
      return { boxes: [{ x: 0, y: 0, z: z, w: 0.5, d: 0.42, h: 7, top: solid("#B8B4A8"), fy: function (u, v2) { return v2 > 5 && (u | 0) % 2 === 0 ? hex("#8A867C") : sh(c0, (h2(u | 0, v2 | 0, 1) - 0.5) * 0.06); }, fx: grill },
        { x: 0.08, y: 0.05, z: z - 4, w: 0.04, d: 0.37, h: 4, top: br, fy: br, fx: br, noShadow: 1 }, { x: 0.38, y: 0.05, z: z - 4, w: 0.04, d: 0.37, h: 4, top: br, fy: br, fx: br, noShadow: 1 }],
        extra: function (c, P) { var p = P(0.25, 0.42, z - 1); c.fillStyle = "rgba(40,50,60,.35)"; c.fillRect(Math.round(p[0]), Math.round(p[1]), 1, Math.max(1, Math.round(z - 2))); } };
    } });

  // ===================== Straße =====================
  def("payphone", { name: function () { return L2("Münztelefon", "Payphone"); }, w: 0.4, d: 0.4, variants: 2, group: "street", build: function (v) {
    var pole = solid("#5A5E62"), box = function (u, v2) { if (v2 > 2 && v2 < 8 && u > 1.5 && u < 4.5) return v2 < 4 ? hex("#1A1A1A") : hex("#8A8E92"); return hex("#B8BCC0"); };
    var sign = function (u, v2) { if (v2 > 2 && v2 < 3.5) return hex("#F4F2EA"); return hex(v ? "#B03028" : "#2E5AB0"); };
    return { boxes: [{ x: 0.17, y: 0.17, z: 0, w: 0.06, d: 0.06, h: 22, top: pole, fy: pole, fx: pole }, { x: 0.05, y: 0.12, z: 14, w: 0.3, d: 0.22, h: 10, top: solid("#7A7E82"), fy: box, fx: solid("#9A9EA2") },
      { x: 0, y: 0.05, z: 25, w: 0.4, d: 0.32, h: 1.2, top: solid("#5A5E62"), fy: pole, fx: pole }, { x: 0, y: 0.33, z: 26, w: 0.4, d: 0.04, h: 6, top: pole, fy: sign, fx: pole }] };
  } });
  def("mailbox", { name: function () { return L2("Briefkasten", "Mailbox"); }, w: 0.45, d: 0.4, variants: 1, group: "street", build: function () {
    var B = hex("#2A4A8A"), f = function (u, v2) { if (v2 > 3 && v2 < 4.4 && u > 1 && u < 4) return hex("#141414"); if (v2 > 6 && v2 < 9 && u > 1.5 && u < 3.5) return hex("#E8E4D8"); return sh(B, (h2(u | 0, v2 | 0, 3) - 0.5) * 0.08); }, lg = solid("#1E1E22");
    return { boxes: [{ x: 0.03, y: 0.03, z: 0, w: 0.06, d: 0.06, h: 3, top: lg, fy: lg, fx: lg }, { x: 0.36, y: 0.03, z: 0, w: 0.06, d: 0.06, h: 3, top: lg, fy: lg, fx: lg }, { x: 0.03, y: 0.31, z: 0, w: 0.06, d: 0.06, h: 3, top: lg, fy: lg, fx: lg }, { x: 0.36, y: 0.31, z: 0, w: 0.06, d: 0.06, h: 3, top: lg, fy: lg, fx: lg },
      { x: 0, y: 0, z: 3, w: 0.45, d: 0.4, h: 12, top: solid("#3A5A9A"), fy: f, fx: f }, { x: 0.02, y: 0.02, z: 15, w: 0.41, d: 0.36, h: 2, top: solid("#4A6AAA"), fy: solid("#2A4A8A"), fx: solid("#22407A") }] };
  } });
  def("newsbox", { name: function () { return L2("Zeitungsautomaten", "Newspaper boxes"); }, w: 1.2, d: 0.35, variants: 3, group: "street", build: function (v) {
    var C = [["#C83A2E", "#2E5AB0", "#E8C040"], ["#2E8A4A", "#E8E4D8", "#C83A2E"], ["#2E5AB0", "#E86A20"]][v], boxes = [];
    C.forEach(function (cc, i) {
      var b = hex(cc), f = function (u, v2) { if (v2 > 2 && v2 < 8 && u > 0.8 && u < 3.2) return v2 < 4 ? hex("#3A4A5A") : hex("#D8D4C8"); return sh(b, (h2(u | 0, v2 | 0, i) - 0.5) * 0.1); };
      boxes.push({ x: i * 0.4 + 0.02, y: 0, z: 0, w: 0.36, d: 0.35, h: 4, top: solid("#2A2A2A"), fy: solid("#2A2A2A"), fx: solid("#222") }, { x: i * 0.4 + 0.02, y: 0, z: 4, w: 0.36, d: 0.35, h: 11, top: solid(cc), fy: f, fx: solid(cc) });
    });
    return { boxes: boxes };
  } });
  def("kiosk", { name: function () { return L2("Zeitungskiosk", "Newsstand"); }, w: 1.8, d: 1.2, variants: 2, group: "street", build: function (v) {
    var G = hex(v ? "#2A2A2E" : "#2E5A3E"), wall = function (u, v2) { return sh(G, (h2(u | 0, v2 | 0, 4) - 0.5) * 0.08 + (v2 % 6 < 0.6 ? -0.15 : 0)); };
    var front = function (u, v2, a, b, L) {
      if (v2 < 6) { if (pixText("NEWS", Math.round(L / 2 - 8), 0.5, u, v2)) return lit("#F2C230", [255, 210, 80]); return hex("#141414"); }
      if (v2 > 8 && v2 < 26 && u > 1 && u < L - 1) {   // Zeitschriften im Fenster
        var col = Math.floor((u - 1) / 3.5), row = Math.floor((v2 - 9) / 5.5), c = ["#D83A2E", "#F2C230", "#3A78E0", "#E8E4D8", "#E86AA0", "#58A048", "#F07A2A"][Math.floor(h2(col, row, 9 + v) * 7)];
        if ((u - 1) % 3.5 < 0.6 || (v2 - 9) % 5.5 < 0.6) return hex("#2A2420");
        var cc = hex(c); if ((v2 - 9) % 5.5 > 1.4 && (v2 - 9) % 5.5 < 2.2 && (u - 1) % 3.5 > 1) cc = hex("#141414"); cc = cc.slice(); cc.glow = sh(cc, 0.25); return cc;
      }
      return wall(u, v2);
    };
    var roof = function (u, v2) { return sh(G, 0.15); };
    return { boxes: [{ x: 0, y: 0, z: 0, w: 1.8, d: 1.2, h: 32, top: roof, fy: front, fx: wall }, { x: -0.1, y: -0.1, z: 32, w: 2, d: 1.4, h: 2, top: roof, fy: solid("#1E2A22"), fx: solid("#1E2A22") },
      { x: 0, y: 1.2, z: 0, w: 1.8, d: 0.35, h: 7, top: function (u, v2, a, b) { var k = Math.floor(a * 8); return [hex("#E8E4D8"), hex("#D8D2C4"), hex("#C8C2B4")][k % 3]; }, fy: wall, fx: wall }] };
  } });
  // Ampel: Mast an der Ecke, Ampelkopf zeigt nach +x (r dreht), Zyklus grün → gelb → rot
  def("traffic", { name: function () { return L2("Ampel", "Traffic light"); }, w: 0.3, d: 0.3, variants: 3, group: "street",
    anim: { at: function (t, v) { if (v === 2) return Math.floor(t * 1.4) % 2 ? 1 : 3; var c = t % 16; return c < 7 ? 0 : c < 9 ? 1 : 2; }, span: 16 },
    vname: function (v) { return [L2("Autoampel", "Car signal"), L2("Fußgänger", "Pedestrian"), L2("gelb blinkend", "flashing amber")][v]; },
    build: function (v, fr) {
      fr = fr || 0; var pole = solid("#4A4E3A"), head = solid("#2E3226");
      if (v === 1) {
        var walk = fr === 0, face = function (u, v2) { if (v2 > 1 && v2 < 7 && u > 1 && u < 5) { var on = walk ? (u > 2 && u < 4 && v2 > 2 && v2 < 6) : (u > 1.5 && u < 4.5 && v2 > 2 && v2 < 5.5); return on ? (walk ? lit("#E8F0E8", [240, 255, 240]) : lit("#F07A2A", [255, 130, 50])) : hex("#141414"); } return hex("#2E3226"); };
        return { boxes: [{ x: 0.12, y: 0.12, z: 0, w: 0.06, d: 0.06, h: 30, top: pole, fy: pole, fx: pole }, { x: -0.1, y: 0.05, z: 24, w: 0.5, d: 0.45, h: 8, top: head, fy: face, fx: face }] };
      }
      var lamp = function (u, v2) {
        var k = Math.floor((v2 - 0.5) / 4.5), yy = (v2 - 0.5) % 4.5, on = v === 2 ? (k === 1 && fr === 1) : (fr === 0 && k === 2) || (fr === 1 && k === 1) || (fr === 2 && k === 0);
        if (u > 1 && u < 4.5 && yy > 0.7 && yy < 3.8 && k < 3) { var cc = ["#E83A2A", "#F2B030", "#3AD87A"][k]; return on ? lit(cc, hex(cc)) : sh(hex(cc), -0.75); }
        return hex("#2E3226");
      };
      return { boxes: [{ x: 0.12, y: 0.12, z: 0, w: 0.07, d: 0.07, h: 46, top: pole, fy: pole, fx: pole }, { x: 0.19, y: 0.12, z: 44, w: 0.8, d: 0.06, h: 2, top: pole, fy: pole, fx: pole }, { x: 0.86, y: -0.06, z: 30, w: 0.2, d: 0.45, h: 14, top: head, fy: head, fx: lamp }] };
    } });
  def("sign", { name: function () { return L2("Verkehrsschild", "Street sign"); }, w: 0.3, d: 0.3, variants: 4, group: "street",
    vname: function (v) { return [L2("Stopp", "Stop"), L2("Straßenname", "Street name"), L2("Einbahnstraße", "One way"), L2("Parkverbot", "No parking")][v]; },
    build: function (v) {
      var pole = solid("#8A8E92"), boxes = [{ x: 0.12, y: 0.12, z: 0, w: 0.05, d: 0.05, h: v === 1 ? 44 : 30, top: pole, fy: pole, fx: pole }];
      if (v === 0) boxes.push({ x: -0.16, y: 0.17, z: 22, w: 0.62, d: 0.03, h: 10, fy: function (u, v2) { var dx = Math.abs(u - 3.4), dy = Math.abs(v2 - 5); if (dx + dy > 6.2 || dx > 3.4 || dy > 5) return null; if (dx + dy > 5.4 || dx > 2.8 || dy > 4.4) return hex("#F2F0EA"); if (pixText("STOP".slice(0, 1), 2, 3, u, v2)) return hex("#F2F0EA"); return hex("#C82A22"); }, top: null, fx: null });
      if (v === 1) { var gs = function (u, v2, a, b, L) { if (pixText("BKLN", 1, 1, u, v2)) return hex("#F2F0EA"); return hex("#2E7A4A"); }; boxes.push({ x: -0.6, y: 0.12, z: 39, w: 1.6, d: 0.04, h: 7, top: solid("#2E7A4A"), fy: gs, fx: solid("#2E7A4A") }, { x: 0.12, y: -0.6, z: 32, w: 0.04, d: 1.6, h: 7, top: solid("#2E7A4A"), fy: solid("#2E7A4A"), fx: function (u, v2, a, b, L) { if (pixText("4 ST", 2, 1, u, v2)) return hex("#F2F0EA"); return hex("#2E7A4A"); } }); }
      if (v === 2) boxes.push({ x: 0.17, y: -0.2, z: 22, w: 0.03, d: 0.7, h: 7, fx: function (u, v2) { if (v2 > 2.5 && v2 < 4.5 && u > 2 && u < 9) return hex("#F2F0EA"); if (Math.abs(v2 - 3.5) < (u - 8) * 0.9 && u >= 8 && u < 11) return hex("#F2F0EA"); if (pixText("ONE", 1, 1, u, v2 + 0)) return null; return hex("#141414"); }, top: null, fy: null });
      if (v === 3) boxes.push({ x: -0.16, y: 0.17, z: 20, w: 0.62, d: 0.03, h: 11, fy: function (u, v2) { if (v2 < 0.8 || v2 > 10.2 || u < 0.5 || u > 6.2) return v2 < 11 && u < 6.7 ? hex("#C82A22") : null; var dx = u - 3.4, dy = v2 - 4; if (Math.abs(dx * dx + dy * dy - 7) < 2.5 || (Math.abs(dx + dy) < 0.8 && dx * dx + dy * dy < 8)) return hex("#C82A22"); if (pixText("P", 2.5, 2, u, v2 - 0)) return hex("#141414"); return hex("#F2F0EA"); }, top: null, fx: null });
      return { boxes: boxes };
    } });
  def("meter", { name: function () { return L2("Parkuhr", "Parking meter"); }, w: 0.3, d: 0.3, variants: 2, group: "street", build: function (v) {
    var pole = solid("#5A5E62"), head = function (u, v2) { if (v2 > 1 && v2 < 4 && u > 0.8 && u < 3) return hex("#C8D0C8"); if (v2 > 4.5 && v2 < 5.5 && u > 1 && u < 2.8) return hex("#E83A2A"); return hex("#7A7E82"); }, boxes = [];
    (v ? [0.05, 0.2] : [0.12]).forEach(function (x, i) { boxes.push({ x: x, y: 0.12, z: 0, w: 0.05, d: 0.05, h: 16, top: pole, fy: pole, fx: pole }, { x: x - 0.1, y: 0.06, z: 16, w: 0.3, d: 0.16, h: 7, top: solid("#9A9EA2"), fy: head, fx: solid("#6A6E72") }); });
    return { boxes: boxes };
  } });
  def("cone", { name: function () { return L2("Leitkegel", "Traffic cone"); }, w: 0.3, d: 0.3, variants: 2, group: "street", build: function (v) {
    var boxes = [], pos = v ? [[0, 0], [0.45, 0.1], [0.2, 0.4]] : [[0, 0]];
    pos.forEach(function (p) {
      var O = hex("#F07A20"), f = function (u, v2) { var w = 2 + v2 * 0.18; if (Math.abs(u - 1.65) > w * 0.55) return null; return v2 > 3 && v2 < 5 ? hex("#F2F0EA") : sh(O, (h2(u | 0, v2 | 0, 2) - 0.5) * 0.1); };
      boxes.push({ x: p[0], y: p[1], z: 0, w: 0.3, d: 0.3, h: 1, top: solid("#E06A18"), fy: solid("#C85A10"), fx: solid("#B04A08") }, { x: p[0] + 0.07, y: p[1] + 0.07, z: 1, w: 0.16, d: 0.16, h: 10, top: solid("#F07A20"), fy: f, fx: f });
    });
    return { boxes: boxes };
  } });
  def("hoop", { name: function () { return L2("Basketballkorb", "Basketball hoop"); }, w: 0.4, d: 0.4, variants: 2, group: "street", build: function (v) {
    var pole = solid(v ? "#2E5A8A" : "#5A5E62"), board = function (u, v2) { if (v2 > 4 && v2 < 9 && Math.abs(u - 5) < 2.5 && (v2 < 4.8 || v2 > 8.2 || Math.abs(u - 5) > 1.8)) return hex("#C82A22"); return v2 < 0.8 || v2 > 11.2 || u < 0.6 || u > 9.4 ? hex("#2A2A2A") : sh(hex("#E8E6DE"), (n2(u * 0.4, v2 * 0.4, 6) > 0.65 ? -0.2 : 0)); };
    return { boxes: [{ x: 0.15, y: 0.15, z: 0, w: 0.1, d: 0.1, h: 52, top: pole, fy: pole, fx: pole }, { x: 0.25, y: 0.17, z: 46, w: 0.45, d: 0.06, h: 2, top: pole, fy: pole, fx: pole },
      { x: 0.7, y: -0.25, z: 40, w: 0.04, d: 0.9, h: 12, top: solid("#E8E6DE"), fy: solid("#BAB8B0"), fx: board }],
      extra: function (c, P) { var cx = 0.95, cy = 0.2, z = 42; for (var a = 0; a < 6.28; a += 0.25) { var p = P(cx + Math.cos(a) * 0.18, cy + Math.sin(a) * 0.18, z); dot(c, p[0], p[1], "#E8501A"); }
        for (var k = 0; k < 8; k++) { var a2 = k / 8 * 6.28, t = P(cx + Math.cos(a2) * 0.18, cy + Math.sin(a2) * 0.18, z), b = P(cx + Math.cos(a2) * 0.1, cy + Math.sin(a2) * 0.1, z - 7); c.fillStyle = "#B8BCC0"; line(c, t[0], t[1], b[0], b[1]); } } };
  } });
  def("cart", { name: function () { return L2("Einkaufswagen", "Shopping cart"); }, w: 0.8, d: 0.5, variants: 2, group: "trash",
    vname: function (v) { return v ? L2("vollgepackt", "loaded") : L2("leer", "empty"); },
    build: function (v) {
      var wire = function (u, v2) { return (Math.floor(u) % 2 === 0 || Math.floor(v2) % 3 === 0) ? hex("#A8ACB0") : null; }, wt = function (u, v2, a, b) { return (Math.floor(a * 14) % 2 === 0 || Math.floor(b * 10) % 2 === 0) ? hex("#A8ACB0") : null; };
      var boxes = [{ x: 0.05, y: 0.05, z: 0, w: 0.06, d: 0.06, h: 4, top: T, fy: T, fx: T, noShadow: 1 }, { x: 0.7, y: 0.05, z: 0, w: 0.06, d: 0.06, h: 4, top: T, fy: T, fx: T, noShadow: 1 }, { x: 0.05, y: 0.4, z: 0, w: 0.06, d: 0.06, h: 4, top: T, fy: T, fx: T, noShadow: 1 }, { x: 0.7, y: 0.4, z: 0, w: 0.06, d: 0.06, h: 4, top: T, fy: T, fx: T, noShadow: 1 },
        { x: 0, y: 0, z: 4, w: 0.8, d: 0.5, h: 9, top: wt, fy: wire, fx: wire }, { x: -0.05, y: 0, z: 12, w: 0.05, d: 0.5, h: 2, top: solid("#C83A2E"), fy: solid("#C83A2E"), fx: solid("#A82A20") }];
      if (v) boxes.push({ x: 0.08, y: 0.06, z: 5, w: 0.64, d: 0.38, h: 11, top: function (u, v2) { var k = Math.floor(h2(Math.floor(u / 2), Math.floor(v2 / 2), 4) * 5); return hex(["#1E1E22", "#C8C4B8", "#C83A2E", "#3A6AB0", "#E8C040"][k]); }, fy: function (u, v2) { return Math.floor(u / 2) % 2 && v2 > 5 ? null : hex(["#1E1E22", "#C8C4B8", "#3A6AB0"][Math.floor(h2(Math.floor(u / 3), Math.floor(v2 / 3), 7) * 3)]); }, fx: solid("#1E1E22") });
      return { boxes: boxes };
    } });
  def("couch", { name: function () { return L2("Altes Sofa", "Old couch"); }, w: 1.5, d: 0.6, variants: 3, group: "trash",
    vname: function (v) { return [L2("braun", "brown"), L2("Blümchen", "floral"), L2("Matratze", "mattress")][v]; },
    build: function (v) {
      if (v === 2) { var mt = function (u, v2, a, b) { var q = (Math.floor(a * 8) + Math.floor(b * 5)) % 2; var c = sh(hex("#D8D0BC"), q ? -0.04 : 0.02); if (n2(a * 3, b * 3, 8) > 0.66) c = sh(c, -0.25); return c; };
        return { boxes: [{ x: 0, y: 0, z: 0, w: 1.6, d: 0.85, h: 3, top: mt, fy: solid("#B8B0A0"), fx: solid("#A8A090") }] }; }
      var c0 = hex(v ? "#B86A5A" : "#6E4A32"), fab = function (u, v2) { var c = sh(c0, (h2(u | 0, v2 | 0, 3) - 0.5) * 0.12 + (n2(u * 0.3, v2 * 0.3, 2) > 0.68 ? -0.2 : 0)); if (v && h2(Math.floor(u / 2), Math.floor(v2 / 2), 7) > 0.8) c = hex("#E8D8A0"); return c; };
      var top = function (u, v2, a, b) { return sh(fab(u, v2), Math.abs(a - 0.5) < 0.02 || Math.abs(a - 1.0) < 0.02 ? -0.25 : 0.06); };
      return { boxes: [{ x: 0, y: 0, z: 0, w: 1.5, d: 0.6, h: 7, top: top, fy: fab, fx: fab }, { x: 0, y: 0, z: 7, w: 1.5, d: 0.18, h: 8, top: fab, fy: fab, fx: fab }, { x: 0, y: 0.18, z: 7, w: 0.15, d: 0.42, h: 4, top: fab, fy: fab, fx: fab }, { x: 1.35, y: 0.18, z: 7, w: 0.15, d: 0.42, h: 4, top: fab, fy: fab, fx: fab }] };
    } });
  def("tires", { name: function () { return L2("Reifenstapel", "Tire stack"); }, w: 0.5, d: 0.5, variants: 2, group: "trash", build: function (v) {
    var boxes = [], n = v ? 5 : 3, tr = function (u, v2) { return sh(hex("#1C1C1E"), (Math.floor(u) % 2 ? -0.1 : 0.05) + (v2 < 0.7 ? 0.15 : 0)); };
    for (var i = 0; i < n; i++) boxes.push({ x: (i % 2) * 0.02, y: (i % 3) * 0.015, z: i * 3.2, w: 0.48, d: 0.48, h: 3.2, top: function (u, v2, a, b) { var d = Math.hypot(a - 0.24, b - 0.24); return d < 0.12 ? hex("#0A0A0A") : d > 0.24 ? null : hex("#2A2A2C"); }, fy: tr, fx: tr });
    return { boxes: boxes };
  } });
  def("ebox", { name: function () { return L2("Stromkasten", "Utility box"); }, w: 0.6, d: 0.35, variants: 2, group: "street", build: function (v) {
    var c0 = hex(v ? "#5A6A4E" : "#8A8E86"), f = function (u, v2) { var c = sh(c0, (n2(u * 0.3, v2 * 0.3, 4) - 0.5) * 0.15); var st = h2(Math.floor(u / 3), Math.floor(v2 / 3), 11 + v); if (st > 0.86) c = hex(["#E83A6A", "#F2C230", "#E8E4D8", "#30B8E0"][Math.floor(st * 100) % 4]); if (Math.abs(u - 3.3) < 0.4) return sh(c0, -0.3); return c; };
    return { boxes: [{ x: 0, y: 0, z: 0, w: 0.6, d: 0.35, h: 16, top: solid(v ? "#6A7A5E" : "#9A9E96"), fy: f, fx: f }] };
  } });
  def("busstop", { name: function () { return L2("Bushaltestelle", "Bus shelter"); }, w: 2.2, d: 0.8, variants: 1, group: "street", build: function () {
    var fr = solid("#3A3E42"), glass = function (u, v2) { return v2 < 1 || v2 > 23 ? hex("#3A3E42") : [170, 190, 200, 70]; };
    var ad = function (u, v2, a, b, L) { if (v2 < 1 || v2 > 23 || u < 0.8 || u > L - 0.8) return hex("#3A3E42"); var c = v2 < 10 ? hex("#2E2E32") : hex("#D83A2E"); if (pixText("DJ", 1.5, 4, u, v2)) c = hex("#F2C230"); if (v2 > 13 && v2 < 21 && Math.floor(v2) % 2 === 0 && u > 1.5 && u < L - 1.5) c = hex("#F4F0E4"); c = c.slice(); c.glow = sh(c, 0.35); return c; };
    return { boxes: [{ x: 0, y: 0, z: 0, w: 2.2, d: 0.06, h: 24, top: fr, fy: glass, fx: fr, noShadow: 1 }, { x: 0, y: 0, z: 0, w: 0.06, d: 0.8, h: 24, top: fr, fy: fr, fx: ad }, { x: 2.14, y: 0, z: 0, w: 0.06, d: 0.8, h: 24, top: fr, fy: fr, fx: glass, noShadow: 1 },
      { x: -0.05, y: -0.05, z: 24, w: 2.3, d: 0.9, h: 1.5, top: function (u, v2) { return [150, 165, 175, 200]; }, fy: fr, fx: fr }, { x: 0.3, y: 0.1, z: 6, w: 1.6, d: 0.25, h: 1.2, top: solid("#8A8E92"), fy: fr, fx: fr }] };
  } });

  // ===================== Tiere =====================
  def("pigeons", { name: function () { return L2("Tauben", "Pigeons"); }, w: 0.8, d: 0.6, variants: 3, group: "nature", anim: { n: 8, fps: 4 },
    vname: function (v) { return [2, 4, 7][v] + " " + L2("Tauben", "pigeons"); },
    build: function (v, fr) {
      var n = [2, 4, 7][v];
      return { boxes: [{ x: 0, y: 0, z: 0, w: 0.8, d: 0.6, h: 4, ghost: 1, noShadow: 1 }], extra: function (c, P, ec, r) {
        var rr = RS.rng(60 + v), B = [];
        for (var i = 0; i < n; i++) B.push([rr() * 0.75, rr() * 0.55, rr() < 0.5 ? 1 : -1, (rr() * 8) | 0, rr() < 0.2]);
        B.sort(function (a, b) { return a[0] + a[1] - b[0] - b[1]; }).forEach(function (b) {
          var p = P(b[0], b[1], 0), x = Math.round(p[0]), y = Math.round(p[1]), f = b[2], peck = ((fr || 0) + b[3]) % 8 < 2, gray = b[4] ? "#4A4A50" : "#8A8E98";
          c.fillStyle = "rgba(0,0,0,.25)"; c.fillRect(x - 2, y, 5, 1);
          dot(c, x - 2 * f, y - 2, gray); dot(c, x - f, y - 2, gray); dot(c, x, y - 2, gray); dot(c, x - f, y - 3, gray); dot(c, x, y - 3, "#6A6E78"); dot(c, x - 2 * f, y - 3, "#5A5E68"); dot(c, x - 3 * f, y - 3, "#3A3A40");
          dot(c, x, y - 1, "#C86A5A");
          if (peck) { dot(c, x + f, y - 2, "#4A7A6A"); dot(c, x + 2 * f, y - 1, "#5A5E68"); dot(c, x + 3 * f, y - 1, "#2A2A2A"); }
          else { dot(c, x + f, y - 3, "#4A7A6A"); dot(c, x + f, y - 4, "#7A5A8A"); dot(c, x + 2 * f, y - 5, "#5A5E68"); dot(c, x + f, y - 5, "#5A5E68"); dot(c, x + 3 * f, y - 5, "#2A2A2A"); dot(c, x + 2 * f, y - 6, "#E8A040"); }
        });
      } };
    } });
  def("dog", { name: function () { return L2("Hund", "Dog"); }, w: 0.6, d: 0.3, variants: 3, group: "nature", anim: { n: 4, fps: 5 },
    vname: function (v) { return [L2("Pitbull, sitzt", "Pit bull, sitting"), L2("Mischling, steht", "Mutt, standing"), L2("schwarz, liegt", "black, lying")][v]; },
    build: function (v, fr) {
      return { boxes: [{ x: 0, y: 0, z: 0, w: 0.6, d: 0.3, h: v === 2 ? 5 : 10, ghost: 1 }], extra: function (c, P, ec, r) {
        var p = P(0.3, 0.15, 0), x = Math.round(p[0]), y = Math.round(p[1]), f = r ? -1 : 1, F = fr || 0;
        var C = [["#8A8E92", "#B8BCC0", "#5A5E62"], ["#9A6A3A", "#C8925A", "#6A4626"], ["#1E1E20", "#3A3A3E", "#0E0E10"]][v], R = function (dx, dy, w, h, cc) { c.fillStyle = cc; c.fillRect(f > 0 ? x + dx : x - dx - w + 1, y + dy, w, h); };
        c.fillStyle = "rgba(0,0,0,.25)"; c.fillRect(x - 6, y, 13, 2);
        if (v === 0) {   // sitzt, Kopf hoch, hechelt
          R(-3, -7, 6, 6, C[0]); R(-4, -3, 3, 3, C[0]); R(-1, -9, 5, 3, C[0]); R(2, -13, 5, 5, C[0]); R(6, -11, 2, 2, C[1]); R(3, -14, 1, 2, C[2]); R(5, -14, 1, 2, C[2]);
          R(1, -2, 1, 2, C[1]); R(3, -2, 1, 2, C[1]); R(5, -12, 1, 1, "#141414"); R(-1, -7, 1, 4, C[1]);
          if (F % 2) R(7, -9, 1, 2, "#D86A7A"); R(-5, -1 - (F % 2), 2, 1, C[2]);
        } else if (v === 1) {   // steht, Schwanz wedelt
          R(-5, -8, 10, 4, C[0]); R(-5, -8, 10, 1, C[1]); R(-5, -4, 1, 4, C[2]); R(-3, -4, 1, 4, C[0]); R(3, -4, 1, 4, C[2]); R(4, -4, 1, 4, C[0]);
          R(4, -11, 4, 4, C[0]); R(8, -9, 2, 2, C[1]); R(4, -12, 2, 2, C[2]); R(6, -10, 1, 1, "#141414"); R(9, -9, 1, 1, "#141414");
          var tw = [0, 1, 0, -1][F]; R(-7, -10 + tw, 2, 1, C[0]); R(-8, -11 + tw * 2, 1, 1, C[0]);
        } else {   // liegt
          R(-6, -4, 11, 4, C[0]); R(-6, -4, 11, 1, C[1]); R(4, -6, 4, 4, C[0]); R(8, -4, 2, 2, C[1]); R(5, -7, 2, 1, C[2]); R(7, -5, 1, 1, F < 2 ? "#141414" : C[0]);
          R(5, -1, 4, 1, C[0]); R(-8, -2, 2, 1, C[0]); if (F === 3) R(-9, -3, 1, 1, C[0]);
        }
      } };
    } });

  // ===================== Asphalt-Flicken (flach) =====================
  def("patch", { name: function () { return L2("Asphalt-Flicken", "Asphalt patch"); }, w: 2, d: 1, variants: 5, group: "ground", flat: 1,
    vname: function (v) { return [L2("rechteckig", "rectangle"), L2("langer Graben", "long trench"), L2("rund (Schacht)", "round (utility)"), L2("Teerfugen", "crack sealant"), L2("Stahlplatte", "steel plate")][v]; },
    build: function (v) {
      var S = [[1.7, 0.85], [2, 0.36], [0.95, 0.95], [2, 1], [1.2, 0.9]][v], w = S[0], d = S[1];
      var tex = function (u, v2, a, b) {
        var X = a, Y = b, edge = Math.min(a, b, w - a, d - b);
        if (v === 2) { var r = Math.hypot(a - w / 2, b - d / 2); if (r > w / 2) return null; edge = w / 2 - r; }
        if (v === 3) { var q = Math.abs(n2(a * 2.2 + 3, b * 2.2, 17) - 0.5), q2 = Math.abs(n2(a * 3.1, b * 3.1 + 7, 23) - 0.5); return (q < 0.03 || q2 < 0.022) && edge > 0.03 ? sh(hex("#141416"), (h2(u | 0, v2 | 0, 2) - 0.5) * 0.2) : null; }
        if (v === 4) { if (edge < 0.04) return hex("#3A3C3E"); var dm = (Math.floor(u * 0.7) + Math.floor(v2 * 0.7)) % 3 === 0; return sh(hex("#6A6E70"), (dm ? 0.12 : 0) + (n2(a * 3, b * 3, 9) > 0.62 ? -0.3 : 0) + (n2(a * 6, b * 6, 4) > 0.75 ? 0.18 : 0)); }
        if (edge < 0.05) return sh(hex("#1A1A1C"), (h2(u | 0, v2 | 0, 3) - 0.5) * 0.2);       // Teernaht
        var base = v === 1 ? hex("#2A2C30") : hex("#303236"), hh = h2(Math.floor(X * 22), Math.floor(Y * 22), 41);
        var c = sh(base, (n2(X * 1.4, Y * 1.4, 33) - 0.5) * 0.14);
        if (hh > 0.94) c = sh(c, 0.22); else if (hh < 0.06) c = sh(c, -0.25);
        return c;
      };
      return { boxes: [{ x: (2 - w) / 2, y: (1 - d) / 2, z: 0, w: w, d: d, h: 0, top: tex }] };
    } });
})();
