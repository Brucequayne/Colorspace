/* CityGenerator 0.25 – Stadtplan aus einer Straßenskizze, prozedural im Browser. Für Color Space.
   Ablauf: Hauptstraßen zeichnen → Verteilerstraßen zeichnen → Stil wählen → Stadt generieren →
   mit Grün (Park), Blau (Wasser) und Rot (Spezialbauten) übermalen → neu generieren.
   Welt: 2400 × 1500 m. Alles wird in Metern gerechnet. */
(function () {
  "use strict";

  var VERSION = "0.25";
  var W = 2400, H = 1500;
  var lang = "de";
  function L2(de, en) { return { de: de, en: en }; }
  var TX = {
    back: L2("Apps", "Apps"), title: L2("CityGenerator", "CityGenerator"),
    s1: L2("Hauptstraßen", "Main roads"), s2: L2("Verteilerstraßen", "Distributor roads"), s3: L2("Stadt", "City"),
    h1: L2("Schritt 1: Hauptstraßen", "Step 1: Main roads"),
    p1: L2("Zeichne die großen Achsen deiner Stadt. Mehrere Linien, Kurven und Abzweigungen sind erlaubt. Anfang und Ende rasten an bestehenden Straßen ein.", "Draw the big axes of your city. Several lines, curves and branches are fine. Start and end snap to existing roads."),
    h2: L2("Schritt 2: Verteilerstraßen", "Step 2: Distributor roads"),
    p2: L2("Jetzt die zweitgrößten Straßen. Sie verbinden die Viertel mit den Hauptstraßen. Die kleinen Seitenstraßen entstehen danach von selbst.", "Now the second largest roads. They connect the districts to the main roads. The small side streets are created automatically afterwards."),
    undo: L2("Rückgängig", "Undo"), clear: L2("Alle löschen", "Clear all"), next: L2("Weiter →", "Next →"), prev: L2("← Zurück", "← Back"),
    styleH: L2("Welcher Stadtstil?", "Which city style?"),
    usa: L2("USA", "USA"), eu: L2("Europa", "Europe"), jp: L2("Japan", "Japan"),
    usaD: L2("Geordnete Raster, große Blöcke, Vorgärten, Einkaufszentren mit Parkplätzen.", "Orderly grids, large blocks, front yards, malls with parking lots."),
    euD: L2("Gewachsene, wilde Seitenstraßen, geschlossene Blöcke mit Innenhöfen, Alleen.", "Organic, wild side streets, closed blocks with courtyards, tree-lined avenues."),
    jpD: L2("Enge Gassen zwischen breiten Hauptstraßen, schmale Häuser, kleine Parkplätze.", "Narrow lanes between wide main roads, slim houses, small parking lots."),
    rail: L2("Bahnlinie mit Bahnhof", "Railway with station"), gen: L2("Stadt generieren", "Generate city"),
    genH: L2("Stadt wird generiert …", "Generating city …"),
    h3: L2("Deine Stadt", "Your city"),
    p3: L2("Male mit den Farben über die Stadt und drück dann „Neu generieren“. Unbemaltes bleibt normale Stadt.", "Paint over the city with the colours, then press “Regenerate”. Unpainted areas stay normal city."),
    tView: L2("Ansehen", "View"), tG: L2("Grün: Parks, Bäume", "Green: parks, trees"), tB: L2("Blau: Wasser, Flüsse", "Blue: water, rivers"),
    tR: L2("Rot: Spezialbauten", "Red: special buildings"), tE: L2("Radierer", "Eraser"), size: L2("Pinselgröße", "Brush size"),
    regen: L2("Neu generieren", "Regenerate"), dice: L2("Variante würfeln", "Roll variant"), editRoads: L2("Straßen bearbeiten", "Edit roads"),
    showPaint: L2("Bemalung zeigen", "Show paint"), style: L2("Stil", "Style"), exp: L2("Als PNG speichern", "Save as PNG"),
    stats: L2("{r} km Straßen · {b} Gebäude · {t} Bäume", "{r} km of roads · {b} buildings · {t} trees"),
    needMain: L2("Zeichne mindestens eine Hauptstraße.", "Draw at least one main road."),
    dirty: L2("Bemalung geändert: „Neu generieren“ drücken.", "Paint changed: press “Regenerate”."),
    help: L2("Mausrad zoomt, rechte Maustaste oder Leertaste + Ziehen verschiebt. In der Stadt kannst du mit „Ansehen“ auch mit links verschieben. Z oder Strg+Z macht rückgängig.", "Mouse wheel zooms, right mouse button or space + drag pans. In the city you can also pan with the left button using “View”. Z or Ctrl+Z undoes."),
    saved: L2("Gespeichert: {f}", "Saved: {f}"),
    cathedral: L2("Kathedrale", "Cathedral"), church: L2("Kirche", "Church"), opera: L2("Opernhaus", "Opera house"), museum: L2("Museum", "Museum"),
    townhall: L2("Rathaus", "Town hall"), monument: L2("Denkmal", "Monument"), stadium: L2("Stadion", "Stadium"), airport: L2("Flughafen", "Airport"),
    harbor: L2("Hafen", "Harbour"), campus: L2("Universität", "University"), station: L2("Bahnhof", "Station"),
    arena: L2("Arena", "Arena"), baseball: L2("Baseballstadion", "Ballpark"), hospital: L2("Krankenhaus", "Hospital"), palace: L2("Schloss", "Palace"),
    temple: L2("Tempel", "Temple"), castle: L2("Burg", "Castle"), mall: L2("Einkaufszentrum", "Shopping mall"), market: L2("Marktplatz", "Market square"), tP: L2("Grau: Parkplätze", "Grey: parking")
  };
  function t(k) { return TX[k] ? TX[k][lang] : k; }
  function fmt(s, o) { return s.replace(/\{(\w+)\}/g, function (m, k) { return o[k] != null ? o[k] : m; }); }

  // ---------- Zufall ----------
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var q = Math.imul(a ^ a >>> 15, 1 | a); q = q + Math.imul(q ^ q >>> 7, 61 | q) ^ q; return ((q ^ q >>> 14) >>> 0) / 4294967296; }; }
  function hash2(x, y, s) { var h = Math.imul((x | 0) ^ 0x27d4eb2d, 0x165667b1) ^ Math.imul((y | 0) + 0x3c6ef372, 0x27d4eb2f) ^ Math.imul(s | 0, 0x9E3779B1); h ^= h >>> 15; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
  function noise2(x, y, s) {
    var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    var a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function pick(r, arr) { return arr[Math.floor(r() * arr.length) % arr.length]; }
  function rr(r, a, b) { return a + (b - a) * r(); }

  // ---------- Geometrie ----------
  function dist(a, b) { var dx = a.x - b.x, dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy); }
  function resample(pts, step) {
    if (pts.length < 2) return pts.slice();
    var out = [{ x: pts[0].x, y: pts[0].y }], acc = 0;
    for (var i = 1; i < pts.length; i++) {
      var a = pts[i - 1], b = pts[i], d = dist(a, b);
      while (acc + d >= step) { var f = (step - acc) / d; var p = { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f }; out.push(p); a = p; d = dist(a, b); acc = 0; }
      acc += d;
    }
    var last = pts[pts.length - 1];
    if (dist(out[out.length - 1], last) > step * 0.3) out.push({ x: last.x, y: last.y }); else out[out.length - 1] = { x: last.x, y: last.y };
    return out;
  }
  function rdp(pts, eps) {
    if (pts.length < 3) return pts.slice();
    var keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
    var st = [[0, pts.length - 1]];
    while (st.length) {
      var s = st.pop(), a = pts[s[0]], b = pts[s[1]], md = 0, mi = -1, dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy || 1;
      for (var i = s[0] + 1; i < s[1]; i++) {
        var q = ((pts[i].x - a.x) * dx + (pts[i].y - a.y) * dy) / l2; q = Math.max(0, Math.min(1, q));
        var ex = a.x + dx * q - pts[i].x, ey = a.y + dy * q - pts[i].y, d = ex * ex + ey * ey;
        if (d > md) { md = d; mi = i; }
      }
      if (mi > 0 && md > eps * eps) { keep[mi] = 1; st.push([s[0], mi], [mi, s[1]]); }
    }
    return pts.filter(function (p, i) { return keep[i]; });
  }
  function chaikin(pts, it) {
    for (var k = 0; k < it; k++) {
      if (pts.length < 3) return pts;
      var o = [pts[0]];
      for (var i = 0; i < pts.length - 1; i++) {
        var a = pts[i], b = pts[i + 1];
        o.push({ x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 }, { x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 });
      }
      o.push(pts[pts.length - 1]); pts = o;
    }
    return pts;
  }
  function cumLen(pts) { var L = [0]; for (var i = 1; i < pts.length; i++) L.push(L[i - 1] + dist(pts[i - 1], pts[i])); return L; }
  function bboxOf(pts, pad) { var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; pts.forEach(function (p) { if (p.x < x0) x0 = p.x; if (p.y < y0) y0 = p.y; if (p.x > x1) x1 = p.x; if (p.y > y1) y1 = p.y; }); return [x0 - pad, y0 - pad, x1 + pad, y1 + pad]; }
  function nearestOnPolyline(pts, L, q) {
    var best = { d: 1e18 };
    for (var i = 1; i < pts.length; i++) {
      var a = pts[i - 1], b = pts[i], dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy || 1e-9;
      var f = Math.max(0, Math.min(1, ((q.x - a.x) * dx + (q.y - a.y) * dy) / l2)), x = a.x + dx * f, y = a.y + dy * f, d = (x - q.x) * (x - q.x) + (y - q.y) * (y - q.y);
      if (d < best.d) best = { d: d, x: x, y: y, s: L[i - 1] + f * (L[i] - L[i - 1]), i: i };
    }
    best.d = Math.sqrt(best.d); return best;
  }
  function segX(a, b, c, d) {
    var r = { x: b.x - a.x, y: b.y - a.y }, s = { x: d.x - c.x, y: d.y - c.y }, den = r.x * s.y - r.y * s.x;
    if (Math.abs(den) < 1e-9) return null;
    var u = ((c.x - a.x) * s.y - (c.y - a.y) * s.x) / den, v = ((c.x - a.x) * r.y - (c.y - a.y) * r.x) / den;
    if (u < 0 || u > 1 || v < 0 || v > 1) return null;
    return { x: a.x + r.x * u, y: a.y + r.y * u, u: u, v: v };
  }
  // Punkt bei Bogenlänge s, mit Tangente
  function at(road, s) {
    var P = road.pts, L = road.L, n = P.length;
    if (s <= 0) { var tx0 = P[1].x - P[0].x, ty0 = P[1].y - P[0].y, l0 = Math.hypot(tx0, ty0) || 1; return { x: P[0].x, y: P[0].y, tx: tx0 / l0, ty: ty0 / l0 }; }
    var lo = 0, hi = n - 1;
    while (hi - lo > 1) { var m = (lo + hi) >> 1; if (L[m] < s) lo = m; else hi = m; }
    var a = P[lo], b = P[hi], seg = L[hi] - L[lo] || 1e-9, f = Math.min(1, (s - L[lo]) / seg), tx = b.x - a.x, ty = b.y - a.y, l = Math.hypot(tx, ty) || 1;
    return { x: a.x + tx * f, y: a.y + ty * f, tx: tx / l, ty: ty / l };
  }

  // ---------- Stile ----------
  var STY = {
    usa: { main: 13, mainSw: 4, dist: 9, distSw: 3.5, hw: 5, sw: 2.5, dA: 72, dB: 130, sigma: 70, global: 3.2, noise: 0, radial: 0, jit: 0.04, dead: 0.02, maxLen: [3000, 3000], cityR: 650,
      ground: [211, 221, 190], walk: "#E9E7E1", sepJ: [0.95, 1.05], trees: 0.55, park: 0.45, streetTree: 0.35, roofs: ["#8C8F94", "#A2A5A8", "#6E6A66", "#B79B7E", "#7F6A5A", "#93806C", "#5E6670"] },
    eu: { main: 12, mainSw: 4.5, dist: 7.5, distSw: 3, hw: 4, sw: 2, dA: 56, dB: 74, sigma: 110, global: 0.5, noise: 0.55, radial: 0.35, jit: 0.16, dead: 0.25, maxLen: [220, 650], cityR: 540,
      ground: [228, 222, 210], walk: "#EEEAE2", sepJ: [0.72, 1.3], trees: 0.18, park: 0.15, streetTree: 0.75, roofs: ["#C2643F", "#B5573A", "#A9603F", "#C9774E", "#6F7782", "#7D848C", "#8F6A55", "#B04F33"] },
    jp: { main: 13, mainSw: 4, dist: 8, distSw: 3, hw: 2.8, sw: 0.7, dA: 33, dB: 46, sigma: 180, global: 1.2, noise: 0.18, radial: 0, jit: 0.08, dead: 0.12, maxLen: [300, 900], cityR: 600,
      ground: [226, 224, 218], walk: "#E9E8E4", sepJ: [0.85, 1.2], trees: 0.05, park: 0.05, streetTree: 0.4, roofs: ["#5F6B78", "#4E5866", "#7D8A96", "#8E9AA3", "#6A5F58", "#9A958C", "#57626E", "#B9B5AC"] }
  };
  var CARS = ["#D9DCE0", "#2F3A4A", "#B8402F", "#ECEDEF", "#4F6E8C", "#9AA0A6", "#1F2328", "#C9A23A", "#3E6B4E", "#7A2E2E", "#F2F2F0"];

  // ---------- Zustand ----------
  var S = { phase: "main", roads: { main: [], dist: [] }, style: "eu", rail: true, seed: 1234, paint: [], tool: "view", size: 40, showPaint: true, genPaintN: -1 };
  var CITY = null;   // Ergebnis der Generierung
  var V = null, raf = 0;

  // ---------- Malmasken (2 m) ----------
  var MW = W / 2, MH = H / 2;
  var PCOL = { g: "#5DBB4E", b: "#3E8FD8", r: "#E0503A", p: "#7D858E", e: "#000" };
  // Für jede Farbe: alle Striche in Reihenfolge, eigene Farbe zeichnet, alles andere radiert (der letzte Strich gewinnt)
  function drawLayer(x, layer, strokes, extra) {
    strokes.forEach(function (st) {
      x.globalCompositeOperation = st.c === layer ? "source-over" : "destination-out";
      x.lineWidth = st.w + (st.c === layer ? extra : 0); x.lineCap = "round"; x.lineJoin = "round";
      x.beginPath(); x.moveTo(st.pts[0].x, st.pts[0].y);
      if (st.pts.length === 1) x.lineTo(st.pts[0].x + 0.01, st.pts[0].y);
      for (var i = 1; i < st.pts.length; i++) x.lineTo(st.pts[i].x, st.pts[i].y);
      x.stroke();
    });
    x.globalCompositeOperation = "source-over";
  }
  function buildMasks(strokes) {
    var c = document.createElement("canvas"); c.width = MW; c.height = MH;
    var x = c.getContext("2d", { willReadFrequently: true }), out = {};
    ["g", "b", "r", "p"].forEach(function (k) {
      x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, MW, MH); x.setTransform(0.5, 0, 0, 0.5, 0, 0);
      x.strokeStyle = "#fff"; drawLayer(x, k, strokes, 0);
      var d = x.getImageData(0, 0, MW, MH).data, m = new Uint8Array(MW * MH);
      for (var i = 0; i < m.length; i++) m[i] = d[i * 4 + 3] > 127 ? 1 : 0;
      out[k] = m;
    });
    return out;
  }
  function mAt(m, x, y) { var i = Math.floor(x / 2), j = Math.floor(y / 2); if (i < 0 || j < 0 || i >= MW || j >= MH) return 0; return m[j * MW + i]; }

  // ---------- Generierung ----------
  function generate() {
    var t0 = performance.now(), st = STY[S.style], R = mulberry(S.seed), seed = S.seed;
    var C = { style: S.style, st: st, roads: [], buildings: [], trees: [], cars: [], hedges: [], props: [], pk: [], flares: [], stops: [], lots: [], drives: [], pools: [], cross: [], specials: [], labels: [], paths: [], ponds: [], ships: [], forest: [], jn: [] };
    var M = buildMasks(S.paint); C.M = M;
    var water = M.b, park = M.g, red = M.r;

    // Straßen der Skizze
    var rid = 0;
    function addRoad(pts, cls, hw, sw, fam) {
      var r = { id: rid++, cls: cls, hw: hw, sw: sw, pts: pts, L: cumLen(pts), fam: fam, junc: [], bridges: [] };
      r.len = r.L[r.L.length - 1]; r.bb = bboxOf(pts, hw + sw + 2);
      C.roads.push(r); return r;
    }
    S.roads.main.forEach(function (p) { if (p.length > 1) addRoad(resample(p, 3), "main", st.main, st.mainSw, -1); });
    S.roads.dist.forEach(function (p) { if (p.length > 1) addRoad(resample(p, 3), "dist", st.dist, st.distSw, -1); });
    var majors = C.roads.slice();
    if (!majors.length) return null;

    // Räumliches Raster der Straßenpunkte
    var HC = 16, HW = Math.ceil(W / HC) + 1, HH = Math.ceil(H / HC) + 1, hash = new Array(HW * HH);
    function hins(r) {
      for (var i = 0; i < r.pts.length; i++) {
        var p = r.pts[i], j = Math.floor(p.y / HC) * HW + Math.floor(p.x / HC);
        if (j < 0 || j >= hash.length) continue;
        var nx = r.pts[Math.min(r.pts.length - 1, i + 1)], pv = r.pts[Math.max(0, i - 1)], tx = nx.x - pv.x, ty = nx.y - pv.y, l = Math.hypot(tx, ty) || 1;
        (hash[j] || (hash[j] = [])).push({ r: r, i: i, x: p.x, y: p.y, tx: tx / l, ty: ty / l });
      }
    }
    function hnear(x, y, rad, fn) {
      var i0 = Math.max(0, Math.floor((x - rad) / HC)), i1 = Math.min(HW - 1, Math.floor((x + rad) / HC)), j0 = Math.max(0, Math.floor((y - rad) / HC)), j1 = Math.min(HH - 1, Math.floor((y + rad) / HC));
      for (var j = j0; j <= j1; j++) for (var i = i0; i <= i1; i++) {
        var c = hash[j * HW + i]; if (!c) continue;
        for (var k = 0; k < c.length; k++) { var e = c[k], dx = e.x - x, dy = e.y - y, d = dx * dx + dy * dy; if (d <= rad * rad && fn(e, Math.sqrt(d))) return true; }
      }
      return false;
    }
    majors.forEach(hins);

    // Kreuzungen zwischen den großen Straßen
    for (var a = 0; a < majors.length; a++) for (var b = a + 1; b < majors.length; b++) {
      var A = majors[a], B = majors[b];
      if (A.bb[0] > B.bb[2] || B.bb[0] > A.bb[2] || A.bb[1] > B.bb[3] || B.bb[1] > A.bb[3]) continue;
      for (var i = 1; i < A.pts.length; i++) for (var j = 1; j < B.pts.length; j++) {
        var X = segX(A.pts[i - 1], A.pts[i], B.pts[j - 1], B.pts[j]);
        if (X) { var sA = A.L[i - 1] + X.u * (A.L[i] - A.L[i - 1]), sB = B.L[j - 1] + X.v * (B.L[j] - B.L[j - 1]); A.junc.push({ s: sA, w: B.hw + B.sw + 10 }); B.junc.push({ s: sB, w: A.hw + A.sw + 10 }); C.jn.push({ x: X.x, y: X.y }); (C.xings || (C.xings = [])).push({ A: A, B: B, sA: sA, sB: sB, x: X.x, y: X.y }); }
      }
      // Einrasten an Enden zählt auch als Kreuzung
      [[A, B], [B, A]].forEach(function (pr) {
        var P = pr[0], Q = pr[1];
        [0, P.pts.length - 1].forEach(function (k) {
          var np = nearestOnPolyline(Q.pts, Q.L, P.pts[k]);
          if (np.d < 2.5) { Q.junc.push({ s: np.s, w: P.hw + P.sw + 10 }); P.junc.push({ s: P.L[k], w: Q.hw + Q.sw + 10 }); C.jn.push({ x: np.x, y: np.y }); (C.tees || (C.tees = [])).push({ r: P, start: k === 0, host: Q, s: np.s }); }
        });
      });
    }

    // Orientierungsfeld (10 m)
    var FC = 10, FW = Math.ceil(W / FC) + 1, FH = Math.ceil(H / FC) + 1, fc = new Float32Array(FW * FH), fs = new Float32Array(FW * FH);
    var gc = 0, gs = 0, cx = 0, cy = 0, cw = 0;
    majors.forEach(function (r) {
      for (var i = 1; i < r.pts.length; i++) {
        var p = r.pts[i - 1], q = r.pts[i], a2 = 2 * Math.atan2(q.y - p.y, q.x - p.x), l = dist(p, q) * (r.cls === "main" ? 1.5 : 1);
        gc += Math.cos(a2) * l; gs += Math.sin(a2) * l; cx += p.x * l; cy += p.y * l; cw += l;
      }
    });
    var gAng = Math.atan2(gs, gc) / 2; cx /= cw; cy /= cw; C.center = { x: cx, y: cy };
    for (var k = 0; k < fc.length; k++) { fc[k] = Math.cos(2 * gAng) * st.global; fs[k] = Math.sin(2 * gAng) * st.global; }
    var sig = st.sigma, rad3 = sig * 3, rc = Math.ceil(rad3 / FC);
    majors.forEach(function (r) {
      for (var i = 0; i < r.pts.length; i += 5) {
        var p = r.pts[i], nx = r.pts[Math.min(r.pts.length - 1, i + 1)], pv = r.pts[Math.max(0, i - 1)], a2 = 2 * Math.atan2(nx.y - pv.y, nx.x - pv.x);
        var c2 = Math.cos(a2), s2 = Math.sin(a2), pi = Math.round(p.x / FC), pj = Math.round(p.y / FC), wgt = r.cls === "main" ? 1.4 : 1;
        for (var j = Math.max(0, pj - rc); j <= Math.min(FH - 1, pj + rc); j++) for (var ii = Math.max(0, pi - rc); ii <= Math.min(FW - 1, pi + rc); ii++) {
          var dx = ii * FC - p.x, dy = j * FC - p.y, d2 = dx * dx + dy * dy; if (d2 > rad3 * rad3) continue;
          var w = Math.exp(-d2 / (2 * sig * sig)) * wgt * 0.6; fc[j * FW + ii] += c2 * w; fs[j * FW + ii] += s2 * w;
        }
      }
    });
    if (st.radial || st.noise) for (var j2 = 0; j2 < FH; j2++) for (var i2 = 0; i2 < FW; i2++) {
      var k2 = j2 * FW + i2, x = i2 * FC, y = j2 * FC;
      if (st.radial) {
        var dx2 = x - cx, dy2 = y - cy, dd = Math.hypot(dx2, dy2) || 1, a3 = 2 * Math.atan2(dy2, dx2), w3 = st.radial * Math.exp(-dd * dd / (2 * 380 * 380)) * (Math.hypot(fc[k2], fs[k2]) + 0.2);
        fc[k2] += Math.cos(a3) * w3; fs[k2] += Math.sin(a3) * w3;
      }
      if (st.noise) {
        var rot = (noise2(x / 320, y / 320, seed) - 0.5) * 2 * st.noise + (noise2(x / 110, y / 110, seed + 7) - 0.5) * st.noise * 0.6, ca = Math.cos(2 * rot), sa = Math.sin(2 * rot);
        var nc = fc[k2] * ca - fs[k2] * sa, ns = fc[k2] * sa + fs[k2] * ca; fc[k2] = nc; fs[k2] = ns;
      }
    }
    function fieldAng(x, y) {
      var fx = Math.max(0, Math.min(FW - 1.001, x / FC)), fy = Math.max(0, Math.min(FH - 1.001, y / FC)), i = Math.floor(fx), j = Math.floor(fy), u = fx - i, v = fy - j, k = j * FW + i;
      var c = fc[k] * (1 - u) * (1 - v) + fc[k + 1] * u * (1 - v) + fc[k + FW] * (1 - u) * v + fc[k + FW + 1] * u * v;
      var s = fs[k] * (1 - u) * (1 - v) + fs[k + 1] * u * (1 - v) + fs[k + FW] * (1 - u) * v + fs[k + FW + 1] * u * v;
      return Math.atan2(s, c) / 2;
    }
    function fdir(x, y, fam, px, py) {
      var a = fieldAng(x, y) + (fam ? Math.PI / 2 : 0), dx = Math.cos(a), dy = Math.sin(a);
      if (dx * px + dy * py < 0) { dx = -dx; dy = -dy; }
      return { x: dx, y: dy };
    }

    // Stadtgrenze: Abstand zu den großen Straßen (10 m, Chamfer)
    var cd = new Float32Array(FW * FH).fill(1e9);
    majors.forEach(function (r) { r.pts.forEach(function (p) { var k = Math.round(p.y / FC) * FW + Math.round(p.x / FC); if (k >= 0 && k < cd.length) cd[k] = 0; }); });
    for (var pass = 0; pass < 2; pass++) {
      for (var jj = 0; jj < FH; jj++) for (var iq = 0; iq < FW; iq++) { var kk = jj * FW + iq, v0 = cd[kk];
        if (iq > 0) v0 = Math.min(v0, cd[kk - 1] + FC); if (jj > 0) v0 = Math.min(v0, cd[kk - FW] + FC);
        if (iq > 0 && jj > 0) v0 = Math.min(v0, cd[kk - FW - 1] + FC * 1.414); if (iq < FW - 1 && jj > 0) v0 = Math.min(v0, cd[kk - FW + 1] + FC * 1.414); cd[kk] = v0; }
      for (jj = FH - 1; jj >= 0; jj--) for (iq = FW - 1; iq >= 0; iq--) { kk = jj * FW + iq; v0 = cd[kk];
        if (iq < FW - 1) v0 = Math.min(v0, cd[kk + 1] + FC); if (jj < FH - 1) v0 = Math.min(v0, cd[kk + FW] + FC);
        if (iq < FW - 1 && jj < FH - 1) v0 = Math.min(v0, cd[kk + FW + 1] + FC * 1.414); if (iq > 0 && jj < FH - 1) v0 = Math.min(v0, cd[kk + FW - 1] + FC * 1.414); cd[kk] = v0; }
    }
    function cityEdge(x, y) { return st.cityR * (0.75 + 0.5 * noise2(x / 260, y / 260, seed + 3)); }
    function inCity(x, y) { var k = Math.round(Math.max(0, Math.min(H, y)) / FC) * FW + Math.round(Math.max(0, Math.min(W, x)) / FC); return cd[k] < cityEdge(x, y); }
    C.inCity = inCity;

    // Bahnlinie
    if (S.rail) {
      var ang = gAng + Math.PI / 2 + rr(R, -0.5, 0.5), dxr = Math.cos(ang), dyr = Math.sin(ang), off = rr(R, 80, 220) * (R() < 0.5 ? -1 : 1);
      var c0 = { x: cx - dyr * off, y: cy + dxr * off }, far = 3000, p0 = { x: c0.x - dxr * far, y: c0.y - dyr * far }, p3 = { x: c0.x + dxr * far, y: c0.y + dyr * far };
      var bend = rr(R, -250, 250), m1 = { x: c0.x - dxr * 700 - dyr * bend, y: c0.y - dyr * 700 + dxr * bend }, m2 = { x: c0.x + dxr * 700 + dyr * bend * 0.6, y: c0.y + dyr * 700 - dxr * bend * 0.6 };
      var rp = [];
      for (var q = 0; q <= 200; q++) { var tt = q / 200, u1 = 1 - tt;
        var px2 = u1 * u1 * u1 * p0.x + 3 * u1 * u1 * tt * m1.x + 3 * u1 * tt * tt * m2.x + tt * tt * tt * p3.x, py2 = u1 * u1 * u1 * p0.y + 3 * u1 * u1 * tt * m1.y + 3 * u1 * tt * tt * m2.y + tt * tt * tt * p3.y;
        if (px2 > -40 && px2 < W + 40 && py2 > -40 && py2 < H + 40) rp.push({ x: px2, y: py2 }); }
      if (rp.length > 10) {
        var rail = addRoad(resample(rp, 3), "rail", 4.5, 2.5, -1); hins(rail); C.rail = rail;
        var best = null; rail.pts.forEach(function (p, i) { var d = dist(p, C.center); if (!best || d < best.d) best = { d: d, s: rail.L[i] }; });
        if (best && !mAt(water, at(rail, best.s).x, at(rail, best.s).y)) C.station = { s: best.s };
      }
    }

    // ---------- Seitenstraßen: Stromlinien im Feld ----------
    var dsep = [st.dA, st.dB], step = 3, locals = [], maxSteps = 1200, tStart = performance.now();
    function blockedAt(x, y) { return mAt(park, x, y) || mAt(red, x, y) || mAt(M.p, x, y); }
    function isWater(x, y) { return mAt(water, x, y); }
    function nearRoad(x, y, hw, exclude, srcR, srcS) {
      var hit = null, bd = 1e9;
      hnear(x, y, hw + 16, function (e, d) {
        if (e.r === exclude || e.r.cls === "rail") return false;
        var lim = hw + (e.r.cls === "rail" ? e.r.hw + 1.5 : e.r.hw) + 1.2;
        if (d < lim && d < bd) { if (e.r === srcR && Math.abs(e.r.L[e.i] - srcS) < 25) return false; bd = d; hit = e; }
        return false;
      });
      return hit;
    }
    function tooClose(x, y, dx, dy, fam, d, self, ox, oy) {
      return hnear(x, y, d, function (e) { return e.r !== self && Math.abs(e.tx * dx + e.ty * dy) > 0.82 && (ox == null || (e.x - ox) * dx + (e.y - oy) * dy > 0); });
    }
    function trace(sx, sy, dx, dy, fam, srcR, srcS, me) {
      var pts = [{ x: sx, y: sy }], p = { x: sx, y: sy }, d = { x: dx, y: dy }, len = 0, end = null, bridges = [], ml = rr(R, st.maxLen[0], st.maxLen[1]);
      var hwSelf = st.hw, dtest = dsep[fam] * 0.45, start0 = srcR ? (srcR.hw + srcR.sw + 6) : 6;
      for (var n = 0; n < maxSteps; n++) {
        var n1 = fdir(p.x, p.y, fam, d.x, d.y), n2 = fdir(p.x + n1.x * step / 2, p.y + n1.y * step / 2, fam, n1.x, n1.y);
        if (st.jit) { var jr = (noise2(p.x / 60, p.y / 60, seed + 11 + fam) - 0.5) * st.jit * 2, cj = Math.cos(jr), sj = Math.sin(jr); n2 = { x: n2.x * cj - n2.y * sj, y: n2.x * sj + n2.y * cj }; }
        var q = { x: p.x + n2.x * step, y: p.y + n2.y * step };
        if (q.x < 4 || q.y < 4 || q.x > W - 4 || q.y > H - 4) { end = "edge"; break; }
        if (len > start0 && !inCity(q.x, q.y)) { end = "out"; break; }
        if (blockedAt(q.x, q.y)) { end = "block"; break; }
        if (isWater(q.x, q.y)) {
          // Brücke, wenn das andere Ufer nah ist und keine andere Brücke in der Nähe liegt
          var land = 0; for (var b2 = 3; b2 <= 120; b2 += 3) { if (!isWater(q.x + n2.x * b2, q.y + n2.y * b2)) { land = b2; break; } }
          var near = C.bridgesAt && C.bridgesAt.some(function (bp) { return Math.hypot(bp.x - q.x, bp.y - q.y) < 160; });
          if (land && land < 115 && !near && R() < 0.6) {
            var s0 = len; for (var b3 = 0; b3 <= land + 3; b3 += step) { pts.push({ x: q.x + n2.x * b3, y: q.y + n2.y * b3 }); len += step; }
            bridges.push([s0, len]); (C.bridgesAt || (C.bridgesAt = [])).push({ x: q.x, y: q.y });
            p = pts[pts.length - 1]; d = n2; continue;
          }
          end = "water"; break;
        }
        if (len > start0) {
          var h = nearRoad(q.x, q.y, hwSelf, me, srcR, srcS);
          if (h) {
            if (h.r.cls === "rail") {
              var lastX = C.railX && C.railX.some(function (rx) { return Math.hypot(rx.x - q.x, rx.y - q.y) < 140; });
              if (!lastX && R() < 0.4) { (C.railX || (C.railX = [])).push({ x: q.x, y: q.y }); for (var c3 = 0; c3 < 7; c3++) { q = { x: q.x + n2.x * step, y: q.y + n2.y * step }; pts.push(q); len += step; } p = q; d = n2; continue; }
              end = "rail"; break;
            }
            var np = nearestOnPolyline(h.r.pts.slice(Math.max(0, h.i - 2), h.i + 3), h.r.L.slice(Math.max(0, h.i - 2), h.i + 3), q);
            pts.push({ x: np.x, y: np.y }); end = { r: h.r, s: np.s }; break;
          }
          if (len > 10 && tooClose(q.x, q.y, n2.x, n2.y, fam, dtest, me)) { end = "sep"; break; }
        }
        pts.push(q); p = q; d = n2; len += step;
        if (len > ml) { end = "len"; break; }
      }
      // Lose Enden: nach vorn verbinden, wenn eine Straße nah ist
      if (typeof end === "string" && (end === "sep" || end === "len") && R() > st.dead) {
        var look = dsep[fam] * 1.1;
        for (var f = step; f <= look; f += step) {
          var qx = p.x + d.x * f, qy = p.y + d.y * f;
          if (isWater(qx, qy) || blockedAt(qx, qy)) break;
          var h2 = nearRoad(qx, qy, hwSelf, me, null, 0);
          if (h2 && h2.r.cls !== "rail") {
            for (var g = step; g < f; g += step) pts.push({ x: p.x + d.x * g, y: p.y + d.y * g });
            var np2 = nearestOnPolyline(h2.r.pts.slice(Math.max(0, h2.i - 2), h2.i + 3), h2.r.L.slice(Math.max(0, h2.i - 2), h2.i + 3), { x: qx, y: qy });
            pts.push({ x: np2.x, y: np2.y }); end = { r: h2.r, s: np2.s }; break;
          }
        }
      }
      return { pts: pts, end: end, bridges: bridges };
    }
    var queue = [];
    function seedsAlong(r, famHint) {
      for (var s = 6; s < r.len - 6; s += 6) {
        var p = at(r, s);
        [-1, 1].forEach(function (side) {
          var nx = -p.ty * side, ny = p.tx * side, a0 = fieldAng(p.x, p.y), d0 = { x: Math.cos(a0), y: Math.sin(a0) }, d1 = { x: -d0.y, y: d0.x };
          var fam = Math.abs(d0.x * nx + d0.y * ny) > Math.abs(d1.x * nx + d1.y * ny) ? 0 : 1;
          if (famHint != null && r.cls === "local") fam = 1 - r.fam;
          var dd = fam ? d1 : d0; if (dd.x * nx + dd.y * ny < 0) dd = { x: -dd.x, y: -dd.y };
          if (dd.x * nx + dd.y * ny < 0.35) return;
          queue.push({ r: r, s: s, x: p.x, y: p.y, dx: dd.x, dy: dd.y, fam: fam, side: side });
        });
      }
    }
    majors.forEach(function (r) { if (r.cls !== "rail") seedsAlong(r); });
    // Reihenfolge: von der Mitte nach außen
    queue.sort(function (a, b) { return dist(a, C.center) - dist(b, C.center); });
    var qi = 0;
    while (qi < queue.length && performance.now() - tStart < 2600) {
      var sd = queue[qi++], sr = sd.r, off2 = sr.hw + 0.5;
      var sx = sd.x + sd.dx * off2, sy = sd.y + sd.dy * off2;
      if (!inCity(sx, sy) || blockedAt(sx, sy) || isWater(sx, sy)) continue;
      var sepJ = rr(R, st.sepJ[0], st.sepJ[1]);
      if (tooClose(sx + sd.dx * 8, sy + sd.dy * 8, sd.dx, sd.dy, sd.fam, dsep[sd.fam] * sepJ, null, sd.x, sd.y)) continue;
      var me = { id: -1, cls: "local", hw: st.hw };
      var res = trace(sd.x, sd.y, sd.dx, sd.dy, sd.fam, sr, sd.s, me);
      var tl = (res.pts.length - 1) * step;
      if (tl < 14 || (typeof res.end === "string" && tl < 28)) continue;
      var lr = addRoad(res.pts, "local", st.hw, st.sw, sd.fam);
      lr.bridges = res.bridges;
      sr.junc.push({ s: sd.s, w: st.hw + st.sw + 4 }); lr.junc.push({ s: 0, w: sr.hw + sr.sw, host: sr });
      if (sr.cls !== "local") C.cross.push({ r: lr, s: 0, off: sr.hw + sr.sw + 1.5 });
      if (typeof res.end === "object" && res.end) {
        res.end.r.junc.push({ s: res.end.s, w: st.hw + st.sw + 4 }); lr.junc.push({ s: lr.len, w: res.end.r.hw + res.end.r.sw, host: res.end.r });
        if (res.end.r.cls !== "local") C.cross.push({ r: lr, s: lr.len, off: -(res.end.r.hw + res.end.r.sw + 1.5) });
        C.jn.push({ x: res.pts[res.pts.length - 1].x, y: res.pts[res.pts.length - 1].y });
      }
      hins(lr); locals.push(lr);
      seedsAlong(lr, true);
    }

    // ---------- Kreuzungen: Bordsteinradien, Zebrastreifen, Haltelinien ----------
    var RAD = { local: S.style === "jp" ? 2.2 : 4.5, dist: 7, main: 9 };
    function armDir(r, atStart) {
      var p0 = atStart ? r.pts[0] : r.pts[r.pts.length - 1], p1 = at(r, atStart ? Math.min(10, r.len) : Math.max(0, r.len - 10)), dx = p1.x - p0.x, dy = p1.y - p0.y, l = Math.hypot(dx, dy) || 1;
      return { x: dx / l, y: dy / l };
    }
    function corner(X, ua, wa, ub, wb, R, col) {
      var sn = Math.abs(ua.x * ub.y - ua.y * ub.x); if (sn < 0.4) return;
      var K = { x: X.x + ua.x * wb / sn + ub.x * wa / sn, y: X.y + ua.y * wb / sn + ub.y * wa / sn };
      C.flares.push({ k: K, a0: { x: K.x + ua.x * R, y: K.y + ua.y * R }, a1: { x: K.x + ub.x * R, y: K.y + ub.y * R }, col: col });
    }
    function zebraArm(X, ua, wa, ub, wb, R, stopToo, own) {
      var sn = Math.abs(ua.x * ub.y - ua.y * ub.x); if (sn < 0.4) return;
      var d0 = wb / sn + R * 0.55 + 2.2, zx = X.x + ua.x * d0, zy = X.y + ua.y * d0;
      if (C.zebras.some(function (z) { return Math.hypot(z.x - zx, z.y - zy) < 9; })) return;
      if (hnear(zx, zy, 24, function (e, dd) { return e.r !== own && e.r.cls !== "rail" && dd < e.r.hw + 1.5; })) return;
      C.zebras.push({ x: X.x + ua.x * d0, y: X.y + ua.y * d0, dx: ua.x, dy: ua.y, hw: wa });
      if (stopToo) { var d1 = d0 + 2.6, rx = ua.y, ry = -ua.x, cx2 = X.x + ua.x * d1, cy2 = X.y + ua.y * d1; C.stops.push([cx2 + rx * 0.3, cy2 + ry * 0.3, cx2 + rx * (wa - 0.4), cy2 + ry * (wa - 0.4)]); }
    }
    function asphaltOf(r) { return r.cls === "main" ? "#62666C" : r.cls === "dist" ? "#6C7076" : (S.style === "jp" ? "#8A8C8F" : "#777B80"); }
    C.zebras = [];
    function tee(minor, atStart, host, sh) {
      var X = atStart ? minor.pts[0] : minor.pts[minor.pts.length - 1], ua = armDir(minor, atStart), th = at(host, sh);
      var R = Math.min(RAD[minor.cls], RAD[host.cls], 2.6 * Math.min(minor.sw, host.sw) + 0.5), col = asphaltOf(minor);
      [{ x: th.tx, y: th.ty }, { x: -th.tx, y: -th.ty }].forEach(function (ub) { corner(X, ua, minor.hw, ub, host.hw, R, col); });
      if (host.cls !== "local") zebraArm(X, ua, minor.hw, { x: th.tx, y: th.ty }, host.hw, R, minor.cls !== "local" || S.style !== "usa", minor);
    }
    C.roads.forEach(function (r) { if (r.cls === "local") r.junc.forEach(function (j) { if (j.host) tee(r, j.s === 0, j.host, nearestOnPolyline(j.host.pts, j.host.L, j.s === 0 ? r.pts[0] : r.pts[r.pts.length - 1]).s); }); });
    (C.tees || []).forEach(function (q) { tee(q.r, q.start, q.host, q.s); });
    (C.xings || []).forEach(function (q) {
      var ta = at(q.A, q.sA), tb = at(q.B, q.sB), X = { x: q.x, y: q.y }, R = Math.min(RAD[q.A.cls], RAD[q.B.cls], 2.6 * Math.min(q.A.sw, q.B.sw)), col = q.A.cls === "dist" ? asphaltOf(q.A) : asphaltOf(q.B);
      [1, -1].forEach(function (sa) { [1, -1].forEach(function (sb) { corner(X, { x: ta.tx * sa, y: ta.ty * sa }, q.A.hw, { x: tb.tx * sb, y: tb.ty * sb }, q.B.hw, R, col); }); });
      [1, -1].forEach(function (sa) { zebraArm(X, { x: ta.tx * sa, y: ta.ty * sa }, q.A.hw, { x: tb.tx, y: tb.ty }, q.B.hw, R, true, q.A); zebraArm(X, { x: tb.tx * sa, y: tb.ty * sa }, q.B.hw, { x: ta.tx, y: ta.ty }, q.A.hw, R, true, q.B); });
    });

    // Brücken der großen Straßen über Wasser
    C.roads.forEach(function (r) {
      if (r.cls === "local") return;
      var inW = false, s0 = 0;
      for (var s = 0; s <= r.len; s += 2) { var p = at(r, s), w = !!isWater(p.x, p.y); if (w && !inW) { s0 = s; inW = true; } if (!w && inW) { r.bridges.push([s0 - 2, s + 2]); inW = false; } }
      if (inW) r.bridges.push([s0 - 2, r.len]);
    });

    // ---------- Belegungsraster (1 m) ----------
    // 0 frei, 1 Straße/Gehweg, 2 Wasser, 3 Park, 4 Spezial, 5 Gebäude, 6 außerhalb, 7 Hof/Parkplatz
    var land = new Uint8Array(W * H);
    var rc2 = document.createElement("canvas"); rc2.width = W; rc2.height = H;
    var rx = rc2.getContext("2d", { willReadFrequently: true });
    rx.lineCap = "round"; rx.lineJoin = "round"; rx.strokeStyle = "#fff";
    C.roads.forEach(function (r) { rx.lineWidth = 2 * (r.hw + r.sw) + 1; rx.beginPath(); r.pts.forEach(function (p, i) { if (i) rx.lineTo(p.x, p.y); else rx.moveTo(p.x, p.y); }); rx.stroke(); });
    var rd = rx.getImageData(0, 0, W, H).data;
    for (var yy = 0; yy < H; yy++) for (var xx = 0; xx < W; xx++) {
      var k3 = yy * W + xx, mk = (yy >> 1) * MW + (xx >> 1);
      if (rd[k3 * 4 + 3] > 90) land[k3] = 1;
      else if (water[mk]) land[k3] = 2;
      else if (park[mk]) land[k3] = 3;
      else if (red[mk]) land[k3] = 4;
      else if (M.p[mk]) land[k3] = 9;
      else if (!inCity(xx, yy)) land[k3] = 6;
    }
    rd = null;
    function L(x, y) { x = x | 0; y = y | 0; if (x < 0 || y < 0 || x >= W || y >= H) return 1; return land[y * W + x]; }
    function rectPts(bx, by, tx, ty, nx, ny, f, dpt) { return [{ x: bx, y: by }, { x: bx + tx * f, y: by + ty * f }, { x: bx + tx * f + nx * dpt, y: by + ty * f + ny * dpt }, { x: bx + nx * dpt, y: by + ny * dpt }]; }
    function rectFree(P, tol, allow) {
      var b = bboxOf(P, 0), bad = 0, tot = 0, ax = P[1].x - P[0].x, ay = P[1].y - P[0].y, bx2 = P[3].x - P[0].x, by2 = P[3].y - P[0].y;
      var la = ax * ax + ay * ay, lb = bx2 * bx2 + by2 * by2;
      for (var y = Math.floor(b[1]); y <= b[3]; y++) for (var x = Math.floor(b[0]); x <= b[2]; x++) {
        var px = x + 0.5 - P[0].x, py = y + 0.5 - P[0].y, u = (px * ax + py * ay) / la, v = (px * bx2 + py * by2) / lb;
        if (u < 0 || u > 1 || v < 0 || v > 1) continue;
        tot++; var c = L(x, y); if (c !== 0 && c !== allow) { bad++; if (bad > tot * tol + 1) return false; }
      }
      return tot > 0;
    }
    function rectMark(P, val) {
      var b = bboxOf(P, 0), ax = P[1].x - P[0].x, ay = P[1].y - P[0].y, bx2 = P[3].x - P[0].x, by2 = P[3].y - P[0].y, la = ax * ax + ay * ay, lb = bx2 * bx2 + by2 * by2;
      for (var y = Math.max(0, Math.floor(b[1])); y <= Math.min(H - 1, b[3]); y++) for (var x = Math.max(0, Math.floor(b[0])); x <= Math.min(W - 1, b[2]); x++) {
        var px = x + 0.5 - P[0].x, py = y + 0.5 - P[0].y, u = (px * ax + py * ay) / la, v = (px * bx2 + py * by2) / lb;
        if (u >= -0.02 && u <= 1.02 && v >= -0.02 && v <= 1.02) { var k = y * W + x; if (land[k] === 0 || land[k] === 7 || land[k] === 8) land[k] = val; }
      }
    }

    // ---------- Parks ----------
    var comps = { g: components(park), r: components(red) };
    comps.g.forEach(function (cp) {
      var pr = mulberry(Math.floor(cp.cx * 7 + cp.cy * 13) + seed);
      // Wege: Kurven durch zufällige Innenpunkte
      var np = cp.area > 4000 ? Math.min(4, 1 + Math.floor(cp.area / 30000)) : 0;
      for (var i = 0; i < np; i++) {
        var pts = [], tries = 0;
        while (pts.length < 4 && tries++ < 60) { var c = cp.cells[Math.floor(pr() * cp.cells.length)]; pts.push({ x: (c % MW) * 2 + 1, y: Math.floor(c / MW) * 2 + 1 }); }
        if (pts.length >= 3) { pts.sort(function (a, b) { return (a.x - cp.cx) * cp.ux + (a.y - cp.cy) * cp.uy - ((b.x - cp.cx) * cp.ux + (b.y - cp.cy) * cp.uy); }); C.paths.push(chaikin(pts, 4)); }
      }
      if (cp.area > 30000) {
        var cc = cp.cells[Math.floor(pr() * cp.cells.length)], px = (cc % MW) * 2, py = Math.floor(cc / MW) * 2, pr2 = Math.sqrt(cp.area) * 0.09, ok = true;
        for (var a4 = 0; a4 < 12 && ok; a4++) { var ang4 = a4 / 12 * Math.PI * 2; if (!mAt(park, px + Math.cos(ang4) * pr2 * 1.5, py + Math.sin(ang4) * pr2 * 1.5)) ok = false; }
        if (ok) C.ponds.push({ x: px, y: py, r: pr2, seed: Math.floor(pr() * 1e6) });
      }
    });
    function nearPath(x, y, w) {
      for (var i = 0; i < C.paths.length; i++) { var P = C.paths[i]; for (var j = 0; j < P.length; j += 2) if (Math.abs(P[j].x - x) < w && Math.abs(P[j].y - y) < w && Math.hypot(P[j].x - x, P[j].y - y) < w) return true; }
      for (i = 0; i < C.ponds.length; i++) if (Math.hypot(C.ponds[i].x - x, C.ponds[i].y - y) < C.ponds[i].r * 1.25 + 3) return true;
      return false;
    }

    // ---------- Spezialbauten ----------
    comps.r.forEach(function (cp) {
      var sr = mulberry(Math.floor(cp.cx * 31 + cp.cy * 17) + seed * 3), A = cp.area, asp = cp.a / Math.max(1, cp.b), sty = S.style;
      var wet = false; for (var i = 0; i < cp.edge.length && !wet; i += 3) { var e = cp.edge[i]; for (var a5 = 0; a5 < 8; a5++) { if (mAt(water, e.x + Math.cos(a5 * 0.785) * 10, e.y + Math.sin(a5 * 0.785) * 10)) { wet = true; break; } } }
      var type, v = Math.floor(sr() * 3);
      if (wet && A > 10000 && sr() < 0.9) type = "harbor";
      else if (A > 80000 && asp > 2.0 && cp.a > 380) type = "airport";
      else if (A > 22000) type = pick(sr, sty === "eu" ? ["stadium", "palace", "campus", "stadium", "palace"] : sty === "usa" ? ["stadium", "mall", "campus", "stadium"] : ["stadium", "castle", "campus", "temple"]);
      else if (A > 6000) type = pick(sr, sty === "eu" ? ["cathedral", "opera", "museum", "townhall", "market"] : sty === "usa" ? ["opera", "museum", "townhall", "church", "mall"] : ["temple", "museum", "opera", "townhall", "temple"]);
      else if (A > 1500) type = pick(sr, sty === "eu" ? ["church", "monument", "market"] : sty === "usa" ? ["church", "monument"] : ["temple", "monument"]);
      else type = "monument";
      if (type === "castle" && asp > 1.8) type = "temple";
      if (type === "mall" && A < 9000) type = "museum";
      var lk = type;
      if (type === "stadium") lk = sty === "usa" && v === 2 ? "baseball" : v === 1 ? "arena" : "stadium";
      if (type === "campus" && v === 2) lk = "hospital";
      var sp = { type: type, v: v, lk: lk, cx: cp.cx, cy: cp.cy, ux: cp.ux, uy: cp.uy, a: cp.a, b: cp.b, seed: Math.floor(sr() * 1e6), area: A };
      // Grundriss so weit verkleinern, bis er ganz in der roten Fläche liegt (kein Überstehen mehr)
      function W2(u, w) { return { x: cp.cx + cp.ux * u - cp.uy * w, y: cp.cy + cp.uy * u + cp.ux * w }; }
      function fits(fa, fb, ell) {
        for (var q = 0; q < 28; q++) {
          var t2 = q / 28 * Math.PI * 2, cu = Math.cos(t2), sv = Math.sin(t2), u, w;
          if (ell) { u = cu * fa; w = sv * fb; } else { var m = Math.max(Math.abs(cu), Math.abs(sv)); u = cu / m * fa; w = sv / m * fb; }
          var pw = W2(u, w); if (L(pw.x, pw.y) !== 4) return false;
        }
        return true;
      }
      var fa = cp.a * 0.96, fb = cp.b * 0.96, ell = type === "stadium" || type === "monument";
      for (var it = 0; it < 16 && !fits(fa, fb, ell); it++) { fa *= 0.92; fb *= 0.92; }
      sp.fa = fa; sp.fb = fb;
      if (type === "harbor") {
        var wx = 0, wy = 0; cp.edge.forEach(function (e) { for (var a6 = 0; a6 < 8; a6++) { var dx = Math.cos(a6 * 0.785), dy = Math.sin(a6 * 0.785); if (mAt(water, e.x + dx * 10, e.y + dy * 10)) { wx += dx; wy += dy; } } });
        var wl = Math.hypot(wx, wy) || 1; sp.wx = wx / wl; sp.wy = wy / wl;
        // Rahmen am Ufer: u entlang der Kaikante, v zum Wasser
        var e1 = { x: -sp.wy, y: sp.wx }, e2 = { x: sp.wx, y: sp.wy }, u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9;
        cp.cells.forEach(function (c) { var px = (c % MW) * 2 + 1 - cp.cx, py = ((c / MW) | 0) * 2 + 1 - cp.cy, u = px * e1.x + py * e1.y, w = px * e2.x + py * e2.y; if (u < u0) u0 = u; if (u > u1) u1 = u; if (w < v0) v0 = w; if (w > v1) v1 = w; });
        function HW(u, w) { return { x: cp.cx + e1.x * u + e2.x * w, y: cp.cy + e1.y * u + e2.y * w }; }
        function inside(u, w, du, dw) { for (var a7 = 0; a7 <= 1; a7 += 0.5) for (var b7 = 0; b7 <= 1; b7 += 0.5) { var p7 = HW(u + du * a7, w + dw * b7); if (L(p7.x, p7.y) !== 4) return false; } return true; }
        var hb = { e1: e1, e2: e2, cranes: [], blocks: [], sheds: [], quay: [] };
        // Kaikante: entlang des Ufers die Stellen suchen, an denen dahinter Wasser beginnt
        for (var u = u0 + 10; u < u1 - 10; u += 4) { for (var w = v1; w > v0; w -= 2) { var p8 = HW(u, w); if (mAt(red, p8.x, p8.y)) { hb.quay.push([u, w]); break; } } }
        hb.quay.forEach(function (q, k) { if (k % 10 === 4 && inside(q[0] - 8, q[1] - 22, 16, 20)) hb.cranes.push(q); });
        var cols = ["#C2533C", "#3B78B0", "#D9A637", "#4D8F68", "#8E5A9C", "#DDDAD3", "#2F6E8F"];
        for (var w2 = v0 + 8; w2 < v1 - 40; w2 += 22) for (var u2 = u0 + 6; u2 < u1 - 40; u2 += 44) {
          if (!inside(u2, w2, 38, 15) || hb.quay.some(function (q) { return Math.abs(q[0] - u2 - 19) < 30 && q[1] - (w2 + 15) < 24; })) continue;
          var cs = []; for (var k8 = 0; k8 < 18; k8++) cs.push(sr() < 0.12 ? null : cols[Math.floor(sr() * cols.length)]);
          hb.blocks.push({ u: u2, v: w2, c: cs });
        }
        for (var u3 = u0 + 4; u3 < u1 - 60; u3 += 72) if (inside(u3, v0 + 3, 62, 24) && !hb.blocks.some(function (bk) { return Math.abs(bk.u - u3) < 60 && Math.abs(bk.v - v0 - 3) < 26; })) hb.sheds.push([u3, v0 + 3]);
        sp.hb = hb;
        for (var s6 = 0; s6 < 3; s6++) {
          for (var dd = 30; dd < 260; dd += 10) {
            var ox = cp.cx + sp.wx * (dd + cp.a * 0.3) + (-sp.wy) * (s6 - 1) * 90, oy = cp.cy + sp.wy * (dd + cp.a * 0.3) + sp.wx * (s6 - 1) * 90, ok2 = true;
            for (var k6 = -45; k6 <= 45 && ok2; k6 += 9) for (var w6 = -8; w6 <= 8; w6 += 8) if (!mAt(water, ox - sp.wy * k6 + sp.wx * w6, oy + sp.wx * k6 + sp.wy * w6)) { ok2 = false; break; }
            if (ok2) { if (!C.ships.some(function (s) { return Math.hypot(s.x - ox, s.y - oy) < 60; })) C.ships.push({ x: ox, y: oy, ax: -sp.wy, ay: sp.wx, l: rr(sr, 70, 120), c: pick(sr, ["#2F4A6B", "#7A2E2E", "#3E5B4A", "#26313D"]) }); break; }
          }
        }
      }
      C.specials.push(sp);
      C.labels.push({ x: cp.cx, y: cp.cy, k: lk });
    });
    if (C.station) { var sp7 = at(C.rail, C.station.s); C.labels.push({ x: sp7.x - sp7.ty * 30, y: sp7.y + sp7.tx * 30, k: "station" }); }

    // Bahnhof: Bahnsteige und Empfangsgebäude
    if (C.station) {
      var so = at(C.rail, C.station.s), nx7 = -so.ty, ny7 = so.tx;
      C.platforms = [];
      [-1, 1].forEach(function (sd2) { C.platforms.push(rectPts(so.x - so.tx * 90 + nx7 * sd2 * 7, so.y - so.ty * 90 + ny7 * sd2 * 7, so.tx, so.ty, nx7 * sd2, ny7 * sd2, 180, 5)); });
      var hb = rectPts(so.x - so.tx * 35 + nx7 * 14, so.y - so.ty * 35 + ny7 * 14, so.tx, so.ty, nx7, ny7, 70, 22);
      if (rectFree(hb, 0.4, 0)) { rectMark(hb, 5); C.buildings.push({ P: hb, h: 4, roof: "#8A6E5A", type: "hip", big: 1 }); }
      C.platforms.forEach(function (P) { rectMark(P, 1); });
    }

    // ---------- Häuserblock-Engine (0.2) ----------
    // Jeder Straßenblock wird als Fläche behandelt: Abstandsfeld zur Straßenkante (mit nächstem Kantenpunkt),
    // Grundstücke entstehen entlang der Front und reichen organisch bis in die Blockmitte. Je dichter (Nähe zum Zentrum),
    // desto tiefer und geschlossener die Randbebauung, dahinter Innenhöfe. Außen lockerer mit Gärten und Hecken.
    var cxC = C.center.x, cyC = C.center.y, Rd = st.cityR * 1.05;
    function density(x, y) { var d = 1 - Math.hypot(x - cxC, y - cyC) / Rd; d += (noise2(x / 170, y / 170, seed + 61) - 0.5) * 0.32; return d < 0 ? 0 : d > 1 ? 1 : d; }
    C.density = density;
    var plotId = blockEngine();
    function modeParams(d, r) {
      var s = S.style;
      if (s === "eu") {
        if (d > 0.5) return { mode: "dense", depth: 11 + d * 6 + r() * 2, f: [8, 18], gap: 0.03, det: 0, flat: 0.12, h: [3.5, 7] };
        if (d > 0.28) return { mode: "mid", depth: 9.5 + r() * 2.5, f: [9, 16], gap: 0.16, det: 0.55, flat: 0.05, h: [2, 3.5] };
        return null;
      }
      if (s === "usa") {
        if (d > 0.62) return { mode: "dense", depth: 22 + d * 14, f: [18, 42], gap: 0.07, det: 0.35, flat: 1, h: [7, 24] };
        if (d > 0.42) return { mode: "mid", depth: 15 + r() * 4, f: [16, 30], gap: 0.22, det: 0.75, flat: 0.85, h: [3, 6] };
        return null;
      }
      if (d > 0.42) return { mode: "dense", depth: 10 + d * 3, f: [6, 11], gap: 0.02, det: 0.1, flat: 0.7, h: [3, 9] };
      if (d > 0.22) return { mode: "mid", depth: 8.5 + r() * 2, f: [5, 9], gap: 0.08, det: 0.6, flat: 0.5, h: [2, 3] };
      return null;
    }
    function blockEngine() {
      var N = W * H, fx = new Int16Array(N), fy = new Int16Array(N), dd = new Int32Array(N), BIG = 2000000000, k, x, y;
      for (k = 0; k < N; k++) { if (land[k] !== 0) { fx[k] = k % W; fy[k] = (k / W) | 0; dd[k] = 0; } else { fx[k] = -1; dd[k] = BIG; } }
      function rl(k, x, y, nk) { if (fx[nk] < 0) return; var dx = x - fx[nk], dy = y - fy[nk], d = dx * dx + dy * dy; if (d < dd[k]) { dd[k] = d; fx[k] = fx[nk]; fy[k] = fy[nk]; } }
      for (y = 0; y < H; y++) {
        for (x = 0; x < W; x++) { k = y * W + x; if (!dd[k]) continue; if (x > 0) rl(k, x, y, k - 1); if (y > 0) { rl(k, x, y, k - W); if (x > 0) rl(k, x, y, k - W - 1); if (x < W - 1) rl(k, x, y, k - W + 1); } }
        for (x = W - 2; x >= 0; x--) { k = y * W + x; if (dd[k]) rl(k, x, y, k + 1); }
      }
      for (y = H - 1; y >= 0; y--) {
        for (x = W - 1; x >= 0; x--) { k = y * W + x; if (!dd[k]) continue; if (x < W - 1) rl(k, x, y, k + 1); if (y < H - 1) { rl(k, x, y, k + W); if (x < W - 1) rl(k, x, y, k + W + 1); if (x > 0) rl(k, x, y, k + W - 1); } }
        for (x = 1; x < W; x++) { k = y * W + x; if (dd[k]) rl(k, x, y, k - 1); }
      }
      var lab = new Uint8Array(N), stack = new Int32Array(N), pid = new Int32Array(N), gdist = new Uint8Array(N), gid = 1, er = mulberry(seed * 17 + 3);
      for (k = 0; k < N; k++) {
        if (land[k] !== 0 || lab[k]) continue;
        var sp = 0, cells = [], b = [1e9, 1e9, -1, -1], maxd = 0; stack[sp++] = k; lab[k] = 1;
        while (sp) {
          var c = stack[--sp]; cells.push(c); var cx = c % W, cy = (c / W) | 0;
          if (cx < b[0]) b[0] = cx; if (cy < b[1]) b[1] = cy; if (cx > b[2]) b[2] = cx; if (cy > b[3]) b[3] = cy; if (dd[c] > maxd) maxd = dd[c];
          if (cx > 0 && !lab[c - 1] && land[c - 1] === 0) { lab[c - 1] = 1; stack[sp++] = c - 1; }
          if (cx < W - 1 && !lab[c + 1] && land[c + 1] === 0) { lab[c + 1] = 1; stack[sp++] = c + 1; }
          if (cy > 0 && !lab[c - W] && land[c - W] === 0) { lab[c - W] = 1; stack[sp++] = c - W; }
          if (cy < H - 1 && !lab[c + W] && land[c + W] === 0) { lab[c + W] = 1; stack[sp++] = c + W; }
        }
        gid = doBlock(cells, b, Math.sqrt(maxd), gid);
      }
      function doBlock(cells, b, maxDT, gid) {
        if (cells.length < 80 || cells.length > 160000) return gid;
        var ds = 0, n = 0, i, c;
        for (i = 0; i < cells.length; i += 9) { c = cells[i]; ds += density(c % W, (c / W) | 0); n++; }
        var d = ds / n, P = modeParams(d, er); if (!P) return gid;
        // Blockumriss als sauberes Polygon (wie in OSM: gerade Fassaden entlang der Straße)
        var bw0 = b[2] - b[0] + 1, bh0 = b[3] - b[1] + 1, mk = new Uint8Array(bw0 * bh0);
        for (i = 0; i < cells.length; i++) { c = cells[i]; mk[(((c / W) | 0) - b[1]) * bw0 + c % W - b[0]] = 1; }
        function inB(x, y) { var lx = Math.floor(x) - b[0], ly = Math.floor(y) - b[1]; return lx >= 0 && ly >= 0 && lx < bw0 && ly < bh0 && mk[ly * bw0 + lx] === 1; }
        var loops = rawLoops(function (i2, j2) { return mk[j2 * bw0 + i2] === 1; }, bw0, bh0), O = null, oa = 0;
        loops.forEach(function (lp) { var ar = 0; for (var q = 0; q < lp.length; q++) { var a = lp[q], e = lp[(q + 1) % lp.length]; ar += a.x * e.y - e.x * a.y; } if (ar > oa) { oa = ar; O = lp; } });
        if (!O) return gid;
        O = O.map(function (p) { return { x: p.x + b[0], y: p.y + b[1] }; });
        O.push(O[0]); O = rdp(O, 1.7); O.pop();
        O = O.filter(function (p, q) { var nx2 = O[(q + 1) % O.length]; return Math.hypot(nx2.x - p.x, nx2.y - p.y) > 1.2; });
        if (O.length < 3) return gid;
        var On = O.length, nrm = [];
        for (i = 0; i < On; i++) { var a = O[i], e = O[(i + 1) % On], l = Math.hypot(e.x - a.x, e.y - a.y) || 1; nrm.push({ x: -(e.y - a.y) / l, y: (e.x - a.x) / l }); }
        function offset(D) {
          return O.map(function (p, q) {
            var n1 = nrm[(q - 1 + On) % On], n2 = nrm[q], mx = n1.x + n2.x, my = n1.y + n2.y, ml = Math.hypot(mx, my) || 1; mx /= ml; my /= ml;
            var k = Math.max(0.45, mx * n2.x + my * n2.y);
            return { x: p.x + mx * D / k, y: p.y + my * D / k };
          });
        }
        // Kanten, die beim Einrücken umklappen, auf einen Punkt zusammenziehen (vereinfachtes Straight Skeleton)
        function fixInner(I) {
          for (var it = 0; it < 4; it++) {
            var bad = false;
            for (var q = 0; q < On; q++) {
              var a = O[q], e = O[(q + 1) % On], ia = I[q], ie = I[(q + 1) % On];
              if ((ie.x - ia.x) * (e.x - a.x) + (ie.y - ia.y) * (e.y - a.y) < 0) { var m = { x: (ia.x + ie.x) / 2, y: (ia.y + ie.y) / 2 }; I[q] = m; I[(q + 1) % On] = { x: m.x, y: m.y }; bad = true; }
            }
            if (!bad) break;
          }
          return I;
        }
        function validInner(I) {
          var ar = 0;
          for (var q = 0; q < On; q++) {
            var a = O[q], e = O[(q + 1) % On], ia = I[q], ie = I[(q + 1) % On];
            if ((ie.x - ia.x) * (e.x - a.x) + (ie.y - ia.y) * (e.y - a.y) < -0.01) return false;
            if (!inB(ia.x, ia.y)) return false;
            ar += ia.x * ie.y - ie.x * ia.y;
          }
          return ar > oa * 0.06;
        }
        var D = P.depth, I = null, pie = false;
        if (maxDT < D * 1.25) D = Math.max(3.5, maxDT * 0.66);
        for (var tr2 = 0; tr2 < 5; tr2++) { I = fixInner(offset(D)); if (validInner(I)) break; I = null; D *= 0.8; if (D < 3.5) break; }
        if (!I && oa > 2600) return gid;   // großer, verwinkelter Block: lockere Bebauung übernimmt
        if (!I || maxDT < 6) {
          // kleiner Block: ganz bebaut, Teile laufen wie Tortenstücke zur Mitte (Walmdach-Optik)
          pie = true; var gx = 0, gy = 0; O.forEach(function (p) { gx += p.x; gy += p.y; }); gx /= On; gy /= On;
          if (!inB(gx, gy)) return gid;
          I = O.map(function () { return { x: gx, y: gy }; });
        }
        var Mi = O.map(function (p, q) { return { x: (p.x + I[q].x) / 2, y: (p.y + I[q].y) / 2 }; });
        var Lc = [0]; for (i = 1; i <= On; i++) Lc.push(Lc[i - 1] + Math.hypot(O[i % On].x - O[i - 1].x, O[i % On].y - O[i - 1].y));
        var tot = Lc[On];
        function loc(s) { s = ((s % tot) + tot) % tot; var lo = 0, hi = On - 1; while (lo < hi) { var m = (lo + hi + 1) >> 1; if (Lc[m] <= s) lo = m; else hi = m - 1; } return { i: lo, t: (s - Lc[lo]) / ((Lc[lo + 1] - Lc[lo]) || 1) }; }
        function pt(poly, l2) { var a = poly[l2.i], e = poly[(l2.i + 1) % On]; return { x: a.x + (e.x - a.x) * l2.t, y: a.y + (e.y - a.y) * l2.t }; }
        function along(poly, s0, s1) {
          var out = [pt(poly, loc(s0))], a = loc(s0), e = loc(s1), i0 = a.i, guard = 0;
          var span = s1 - s0, walked = Lc[i0 + 1] - (s0 % tot + tot) % tot;
          while (walked < span - 1e-6 && guard++ < On + 1) { i0 = (i0 + 1) % On; out.push({ x: poly[i0].x, y: poly[i0].y }); walked += Lc[i0 + 1] - Lc[i0]; }
          out.push(pt(poly, e)); return out;
        }
        // Schnitte entlang der Front, an Ecken einrasten
        var cuts = [], sAt = er() * 5, fs = (1.15 - d * 0.3) * (pie ? 1.5 : 1);
        while (sAt < tot - 3) {
          var snap = sAt;
          for (i = 0; i < On; i++) if (Math.abs(Lc[i] - sAt) < 3.2) { snap = Lc[i]; break; }
          if (!cuts.length || snap - cuts[cuts.length - 1] > 3) cuts.push(snap);
          sAt = snap + rr(er, P.f[0], P.f[1]) * fs;
        }
        if (cuts.length < 2) cuts = [0, tot / 2];
        var flatRs = S.style === "usa" ? ["#C9CCCF", "#BFC3C6", "#D3D5D6", "#B0B5BA", "#9EA4AA"] : S.style === "jp" ? ["#B9B5AC", "#A9ADB2", "#C7C3BA", "#9AA1A8", "#8F969E"] : ["#C9C2B4", "#B8B2A6", "#A9A9A6"];
        var pal = [st.roofs[Math.floor(er() * st.roofs.length)], st.roofs[Math.floor(er() * st.roofs.length)], st.roofs[Math.floor(er() * st.roofs.length)]];
        var hedgeL = P.mode === "mid" ? Math.min(rr(er, 12, 24), (maxDT - D) * 0.42) : 0;
        for (var k2 = 0; k2 < cuts.length; k2++) {
          var s0 = cuts[k2], s1 = k2 + 1 < cuts.length ? cuts[k2 + 1] : cuts[0] + tot;
          var gap = er() < P.gap, det = er() < P.det, flat = er() < P.flat || (pie && S.style !== "eu" && er() < 0.6);
          // Hecke an der Grundstücksgrenze (lockere Bebauung)
          if (hedgeL) {
            var l0 = loc(s0), po = pt(O, l0), pi2 = pt(I, l0), hx = pi2.x - po.x, hy = pi2.y - po.y, hl = Math.hypot(hx, hy) || 1; hx /= hl; hy /= hl;
            var q0 = { x: pi2.x, y: pi2.y }, q1 = q0;
            for (var u = 1; u < hedgeL; u += 1) { var qx = pi2.x + hx * u, qy = pi2.y + hy * u; if (!inB(qx, qy)) break; q1 = { x: qx, y: qy }; }
            if (q1 !== q0) C.hedges.push([q0.x, q0.y, q1.x, q1.y]);
          }
          if (gap) continue;
          if (det && s1 - s0 > 7) { s0 += 1.1; s1 -= 1.1; }
          var oP = along(O, s0, s1), mP = along(Mi, s0, s1), iP = along(I, s0, s1);
          var full = oP.concat(iP.slice().reverse()), A = [oP.concat(mP.slice().reverse())], B2 = [mP.concat(iP.slice().reverse())];
          // Wohin zeigt die Straße? (Mittel der Außennormalen)
          var nx = 0, ny = 0; for (i = 0; i < oP.length - 1; i++) { var ex = oP[i + 1].x - oP[i].x, ey = oP[i + 1].y - oP[i].y; nx += ey; ny -= ex; }
          var nl = Math.hypot(nx, ny) || 1;
          var roof = flat ? flatRs[Math.floor(er() * flatRs.length)] : (er() < 0.8 ? pal[Math.floor(er() * 3)] : st.roofs[Math.floor(er() * st.roofs.length)]);
          var hgt = rr(er, P.h[0], P.h[1]) * (0.75 + d * 0.5);
          fillPoly(full, 5);
          C.buildings.push({ polys: flat ? [full] : A, polys2: flat ? [] : B2, flat: flat, roof: roof, h: hgt, nx: nx / nl, ny: ny / nl, bb: bboxOf(full, hgt * 1.2 + 1), kind: P.mode });
          // Seitenflügel in den Hof (Hinterhaus), wie in gründerzeitlichen Blöcken
          var lw0 = loc((s0 + s1) / 2 - 4), lw1 = loc((s0 + s1) / 2 + 4);
          if (!pie && P.mode === "dense" && S.style === "eu" && s1 - s0 > 11 && lw0.i === lw1.i && er() < 0.35) {
            var wm = (s0 + s1) / 2, ww = rr(er, 5, 7), la = loc(wm - ww / 2), lb = loc(wm + ww / 2), ia2 = pt(I, la), ib2 = pt(I, lb), oa2 = pt(O, la);
            var wOK = Math.hypot(ib2.x - ia2.x, ib2.y - ia2.y) >= 3.5;
            var vx = ia2.x - oa2.x, vy = ia2.y - oa2.y, vl = Math.hypot(vx, vy) || 1, wl = rr(er, 7, 14); vx /= vl; vy /= vl;
            var wing = [ia2, ib2, { x: ib2.x + vx * wl, y: ib2.y + vy * wl }, { x: ia2.x + vx * wl, y: ia2.y + vy * wl }];
            if (wOK && wing.every(function (p) { return inB(p.x, p.y); }) && polyFree(wing)) {
              fillPoly(wing, 5);
              var hw2 = [{ x: (wing[0].x + wing[1].x) / 2, y: (wing[0].y + wing[1].y) / 2 }, { x: (wing[2].x + wing[3].x) / 2, y: (wing[2].y + wing[3].y) / 2 }];
              C.buildings.push({ polys: [[wing[0], hw2[0], hw2[1], wing[3]]], polys2: [[hw2[0], wing[1], wing[2], hw2[1]]], flat: false, roof: roof, h: hgt * 0.8, nx: -vy, ny: vx, bb: bboxOf(wing, hgt + 1), kind: "wing" });
            }
          }
        }
        for (i = 0; i < cells.length; i++) { c = cells[i]; if (land[c] === 0) land[c] = P.mode === "dense" ? 8 : 7; }
        return gid + cuts.length + 1;
      }
      // Polygon ins Belegungsraster schreiben (nur freie Zellen)
      function fillPoly(Pl, val) {
        var bb = bboxOf(Pl, 0), n = Pl.length;
        for (var y = Math.max(0, Math.floor(bb[1])); y <= Math.min(H - 1, bb[3]); y++) {
          var cy = y + 0.5, xs = [];
          for (var q = 0, r2 = n - 1; q < n; r2 = q++) { var a = Pl[q], e = Pl[r2]; if ((a.y > cy) !== (e.y > cy)) xs.push(a.x + (cy - a.y) * (e.x - a.x) / (e.y - a.y)); }
          xs.sort(function (u, v) { return u - v; });
          for (var k = 0; k + 1 < xs.length; k += 2) for (var x = Math.max(0, Math.ceil(xs[k] - 0.5)); x <= Math.min(W - 1, Math.floor(xs[k + 1] - 0.5)); x++) { var kk = y * W + x; if (land[kk] === 0 || land[kk] === 7 || land[kk] === 8) land[kk] = val; }
        }
      }
      function polyFree(Pl) {
        var bb = bboxOf(Pl, 0), n = Pl.length, bad = 0;
        for (var y = Math.max(0, Math.floor(bb[1])); y <= Math.min(H - 1, bb[3]); y++) {
          var cy = y + 0.5, xs = [];
          for (var q = 0, r2 = n - 1; q < n; r2 = q++) { var a = Pl[q], e = Pl[r2]; if ((a.y > cy) !== (e.y > cy)) xs.push(a.x + (cy - a.y) * (e.x - a.x) / (e.y - a.y)); }
          xs.sort(function (u, v) { return u - v; });
          for (var k = 0; k + 1 < xs.length; k += 2) for (var x = Math.max(0, Math.ceil(xs[k] - 0.5)); x <= Math.min(W - 1, Math.floor(xs[k + 1] - 0.5)); x++) { var v = land[y * W + x]; if (v !== 0) bad++; }
        }
        return bad < 4;
      }
      C.gdist = gdist; return pid;
    }
    // Alle Randlinien einer Maske (auch Löcher), Eckpunkte in lokalen Pixelkoordinaten
    function rawLoops(inside, w, h) {
      var VW = w + 1, nxt = new Int32Array(VW * (h + 1)).fill(-1), nxt2 = new Int32Array(VW * (h + 1)).fill(-1);
      function add(a, b2) { if (nxt[a] < 0) nxt[a] = b2; else nxt2[a] = b2; }
      for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) {
        if (!inside(i, j)) continue;
        if (j === 0 || !inside(i, j - 1)) add(j * VW + i, j * VW + i + 1);
        if (i === w - 1 || !inside(i + 1, j)) add(j * VW + i + 1, (j + 1) * VW + i + 1);
        if (j === h - 1 || !inside(i, j + 1)) add((j + 1) * VW + i + 1, (j + 1) * VW + i);
        if (i === 0 || !inside(i - 1, j)) add((j + 1) * VW + i, j * VW + i);
      }
      var out = [];
      for (var s = 0; s < nxt.length; s++) {
        while (nxt[s] >= 0) {
          var loop = [], v = s, guard = 0;
          do { loop.push({ x: v % VW, y: (v / VW) | 0 }); var n2 = nxt[v]; if (n2 < 0) break; if (nxt2[v] >= 0) { nxt[v] = nxt2[v]; nxt2[v] = -1; } else nxt[v] = -1; v = n2; } while (v !== s && ++guard < 400000);
          if (loop.length >= 4) out.push(loop);
        }
      }
      return out;
    }
    // Umriss einer Rastermaske (1 m) als Polygone, an den Pixelkanten entlang, danach vereinfacht
    function contours(inside, w, h, ox, oy) {
      var VW = w + 1, nxt = new Int32Array(VW * (h + 1)).fill(-1), nxt2 = new Int32Array(VW * (h + 1)).fill(-1);
      function add(a, b2) { if (nxt[a] < 0) nxt[a] = b2; else nxt2[a] = b2; }
      for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) {
        if (!inside(i, j)) continue;
        if (j === 0 || !inside(i, j - 1)) add(j * VW + i, j * VW + i + 1);
        if (i === w - 1 || !inside(i + 1, j)) add(j * VW + i + 1, (j + 1) * VW + i + 1);
        if (j === h - 1 || !inside(i, j + 1)) add((j + 1) * VW + i + 1, (j + 1) * VW + i);
        if (i === 0 || !inside(i - 1, j)) add((j + 1) * VW + i, j * VW + i);
      }
      var out = [];
      for (var s = 0; s < nxt.length; s++) {
        while (nxt[s] >= 0) {
          var loop = [], v = s, guard = 0;
          do {
            loop.push(v); var n2 = nxt[v];
            if (n2 < 0) break;
            if (nxt2[v] >= 0) { nxt[v] = nxt2[v]; nxt2[v] = -1; } else nxt[v] = -1;
            v = n2;
          } while (v !== s && ++guard < 100000);
          if (loop.length < 4) continue;
          var P = loop.map(function (q) { return { x: ox + q % VW, y: oy + ((q / VW) | 0) }; }), ar = 0;
          for (var q = 0; q < P.length; q++) { var a = P[q], c = P[(q + 1) % P.length]; ar += a.x * c.y - c.x * a.y; }
          if (ar < 8) continue;   // Löcher und Krümel weglassen
          P.push(P[0]); P = rdp(P, 1.05); P.pop();
          if (P.length >= 3) out.push(P);
        }
      }
      return out;
    }

    // ---------- Gebäude entlang der Straßen (lockere Gebiete) ----------
    var br = mulberry(seed * 7 + 1);
    function lotSpec(cls) {
      var s = S.style;
      if (s === "usa") {
        if (cls === "main" || cls === "dist") return { f: [34, 70], d: [26, 44], sb: [14, 22], gap: [8, 22], kind: "com", lot: 0.15 };
        return { f: [12, 17], d: [10, 14], sb: [6, 9], gap: [5, 9], kind: "house", lot: 0.02 };
      }
      if (s === "jp") {
        if (cls === "main" || cls === "dist") return { f: [12, 28], d: [12, 22], sb: [0.4, 1], gap: [0.5, 1.5], kind: "tower", lot: 0.07 };
        return { f: [5, 9], d: [7, 11], sb: [0.2, 0.6], gap: [0.6, 1.3], kind: "jhouse", lot: 0.06 };
      }
      if (cls === "main" || cls === "dist") return { f: [12, 24], d: [14, 20], sb: [0, 0.3], gap: [0, 0.2], kind: "block", lot: 0.02 };
      return { f: [9, 19], d: [11, 16], sb: [0, 0.4], gap: [0, 0.6], kind: "block", lot: 0.04 };
    }
    function roofFor(kind, x, y) {
      var h = hash2(x | 0, y | 0, seed), rs = st.roofs;
      if (kind === "com") return { roof: pick(function () { return h; }, ["#C9CCCF", "#BFC3C6", "#D3D5D6", "#B5B9BC"]), type: "flat", h: 2 };
      if (kind === "tower") return { roof: pick(function () { return h; }, ["#B9B5AC", "#A9ADB2", "#C7C3BA", "#9AA1A8", "#8F969E"]), type: "flat", h: 4 + Math.floor(hash2(x | 0, y | 0, seed + 1) * 8) };
      if (kind === "jhouse") return { roof: rs[Math.floor(h * rs.length)], type: h < 0.75 ? "gable" : "flat", h: 2 };
      if (kind === "house") return { roof: rs[Math.floor(h * rs.length)], type: h < 0.6 ? "gable" : "hip", h: 1.5 };
      return { roof: rs[Math.floor(h * rs.length)], type: h < 0.82 ? "gable" : "flat", h: 4 + Math.floor(hash2(x | 0, y | 0, seed + 1) * 3) };
    }
    function placeAlong(r) {
      if (r.cls === "rail") return;
      var spec = lotSpec(r.cls);
      [-1, 1].forEach(function (side) {
        var s = 3 + br() * 4;
        while (s < r.len - 3) {
          var p = at(r, s), tx = p.tx, ty = p.ty, nx = -ty * side, ny = tx * side;
          if (!inCity(p.x, p.y)) { s += 10; continue; }
          var onBridge = r.bridges.some(function (b) { return s > b[0] - 4 && s < b[1] + 4; });
          if (onBridge) { s += 6; continue; }
          var f = rr(br, spec.f[0], spec.f[1]), dpt = rr(br, spec.d[0], spec.d[1]), sb = rr(br, spec.sb[0], spec.sb[1]);
          var base = r.hw + r.sw + 0.6 + sb;
          // Parkplatz in einer Lücke
          if (br() < spec.lot) {
            var lf = S.style === "jp" ? rr(br, 10, 18) : rr(br, 24, 40), ld = S.style === "jp" ? rr(br, 9, 13) : rr(br, 18, 30);
            var LP = rectPts(p.x + nx * (r.hw + r.sw + 0.6) - tx * lf / 2 * (side > 0 ? 0 : 0), p.y + ny * (r.hw + r.sw + 0.6), tx, ty, nx, ny, lf, ld);
            if (rectFree(LP, 0.01, 0)) { rectMark(LP, 7); C.lots.push({ P: LP, tx: tx, ty: ty, nx: nx, ny: ny, f: lf, d: ld, seed: Math.floor(br() * 1e6) }); s += lf + 1; continue; }
          }
          var placed = false;
          var fronts = spec.kind === "block" ? [f, f * 0.65, Math.max(6, f * 0.4)] : [f, f * 0.7], depths = [dpt, dpt * 0.75, spec.d[0] * 0.8];
          for (var fi = 0; fi < fronts.length && !placed; fi++) for (var di = 0; di < 3 && !placed; di++) {
            var ff = fronts[fi], dd2 = depths[di];
            var P = rectPts(p.x + nx * base, p.y + ny * base, tx, ty, nx, ny, ff, dd2);
            if (rectFree(P, spec.kind === "block" ? 0.04 : 0.0, 0)) {
              var rf = roofFor(spec.kind, P[0].x, P[0].y);
              rectMark(P, 5); C.buildings.push({ P: P, h: rf.h, roof: rf.roof, type: rf.type, kind: spec.kind });
              placed = true;
              if (spec.kind === "com") {
                // Kundenparkplatz zwischen Straße und Markt
                var PL = rectPts(p.x + nx * (r.hw + r.sw + 0.6), p.y + ny * (r.hw + r.sw + 0.6), tx, ty, nx, ny, ff, base - (r.hw + r.sw + 0.6) - 1);
                if (rectFree(PL, 0.05, 0)) { rectMark(PL, 7); C.lots.push({ P: PL, tx: tx, ty: ty, nx: nx, ny: ny, f: ff, d: base - (r.hw + r.sw + 1.6), seed: Math.floor(br() * 1e6) }); }
              }
              if (spec.kind === "house") {
                // Einfahrt mit Auto, manchmal ein Pool hinten
                var dw = rectPts(p.x + nx * (r.hw + r.sw + 0.6) + tx * (ff + 0.6), p.y + ny * (r.hw + r.sw + 0.6) + ty * (ff + 0.6), tx, ty, nx, ny, 3.4, base - (r.hw + r.sw) + dd2 * 0.5);
                if (rectFree(dw, 0.05, 0)) { rectMark(dw, 7); C.drives.push(dw); if (br() < 0.6) { var cp2 = { x: dw[0].x + tx * 1.7 + nx * 3.2, y: dw[0].y + ty * 1.7 + ny * 3.2 }; C.cars.push({ x: cp2.x, y: cp2.y, a: Math.atan2(ny, nx), c: pick(br, CARS) }); } }
                if (br() < 0.22) {
                  var pw2 = rr(br, 4, 6), pd2 = rr(br, 3, 4.5), pb = base + dd2 + rr(br, 2.5, 5);
                  var PP = rectPts(p.x + nx * pb + tx * (ff - pw2) / 2, p.y + ny * pb + ty * (ff - pw2) / 2, tx, ty, nx, ny, pw2, pd2);
                  if (rectFree(PP, 0, 0)) { rectMark(PP, 7); C.pools.push(PP); }
                }
              }
              s += ff + rr(br, spec.gap[0], spec.gap[1]) * (1.3 - density(p.x, p.y) * 0.6);
            }
          }
          if (!placed) s += 2.5;
        }
      });
    }
    var order = C.roads.filter(function (r) { return r.cls === "main"; }).concat(C.roads.filter(function (r) { return r.cls === "dist"; }), C.roads.filter(function (r) { return r.cls === "local"; }));
    order.forEach(placeAlong);

    // Innenbereiche: Japan füllt mit kleinen Häusern, Europa setzt Hinterhofgebäude, USA bleibt Garten
    if (S.style !== "usa") {
      var gstep = S.style === "jp" ? 8 : 16;
      for (var gy = 4; gy < H - 4; gy += gstep) for (var gx = 4; gx < W - 4; gx += gstep) {
        var jx = gx + hash2(gx, gy, seed + 21) * gstep * 0.6, jy = gy + hash2(gx, gy, seed + 22) * gstep * 0.6;
        var c0 = L(jx, jy); if (c0 !== 0 && c0 !== 8) continue;
        var nb = false; for (var q8 = 0; q8 < 8 && !nb; q8++) { var c8 = L(jx + Math.cos(q8 * 0.785) * 14, jy + Math.sin(q8 * 0.785) * 14); if (c8 === 5 || c8 === 1) nb = true; }
        if (!nb) continue;
        if (S.style === "eu" && hash2(gx, gy, seed + 23) > (c0 === 8 ? 0.55 : 0.35)) continue;
        var a7 = fieldAng(jx, jy), tx7 = Math.cos(a7), ty7 = Math.sin(a7), f7 = S.style === "jp" ? rr(br, 5, 8) : rr(br, 6, 11), d7 = S.style === "jp" ? rr(br, 6, 9) : rr(br, 5, 8);
        var P7 = rectPts(jx, jy, tx7, ty7, -ty7, tx7, f7, d7);
        if (rectFree(P7, 0, c0)) {
          // Abstand halten, damit Höfe sichtbar bleiben
          var pad = S.style === "jp" ? 0.8 : 3, P8 = rectPts(jx - tx7 * pad + ty7 * pad, jy - ty7 * pad - tx7 * pad, tx7, ty7, -ty7, tx7, f7 + 2 * pad, d7 + 2 * pad);
          if (rectFree(P8, 0.02, c0)) { var rf7 = roofFor(S.style === "jp" ? "jhouse" : "block", jx, jy); rectMark(P7, 5); C.buildings.push({ P: P7, h: S.style === "jp" ? 2 : 2, roof: rf7.roof, type: rf7.type, kind: "back" }); }
        }
      }
    }

    // ---------- Gemalte Parkplätze: Reihen mit Fahrgassen, an den Straßen ausgerichtet ----------
    var pkr = mulberry(seed * 29 + 11);
    components(M.p).forEach(function (cp) {
      var ang = fieldAng(cp.cx, cp.cy), ux = Math.cos(ang), uy = Math.sin(ang), vx = -uy, vy = ux, u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9;
      cp.cells.forEach(function (c) { var px = (c % MW) * 2 + 1 - cp.cx, py = ((c / MW) | 0) * 2 + 1 - cp.cy, u = px * ux + py * uy, v = px * vx + py * vy; if (u < u0) u0 = u; if (u > u1) u1 = u; if (v < v0) v0 = v; if (v > v1) v1 = v; });
      function P2(u, v) { return { x: cp.cx + ux * u + vx * v, y: cp.cy + uy * u + vy * v }; }
      function inP(u, v) { var q = P2(u, v); return L(q.x, q.y) === 9 && L(q.x + 1, q.y) === 9 && L(q.x, q.y + 1) === 9 && L(q.x - 1, q.y) === 9 && L(q.x, q.y - 1) === 9; }
      // Modul: Stellreihe 5 m, Fahrgasse 6,5 m, Stellreihe 5 m, Grünstreifen 1,5 m
      for (var v = v0 + 1; v + 11.5 < v1; v += 18) {
        [[v, v + 5, 1], [v + 11.5, v + 16.5, -1]].forEach(function (row) {
          for (var u = u0 + 1; u + 2.6 < u1; u += 2.6) {
            if (!inP(u, row[0] + 0.3) || !inP(u + 2.6, row[0] + 0.3) || !inP(u, row[1] - 0.3) || !inP(u + 2.6, row[1] - 0.3)) continue;
            var a1 = P2(u, row[0]), b1 = P2(u, row[1]), a2 = P2(u + 2.6, row[0]), b2 = P2(u + 2.6, row[1]);
            C.pk.push([a1.x, a1.y, b1.x, b1.y], [a2.x, a2.y, b2.x, b2.y]);
            if (pkr() < 0.62) { var cc = P2(u + 1.3, (row[0] + row[1]) / 2); C.cars.push({ x: cc.x, y: cc.y, a: ang + Math.PI / 2, c: pick(pkr, CARS) }); }
          }
        });
        for (var u2 = u0 + 6; u2 < u1 - 4; u2 += 18) if (pkr() < 0.7 && inP(u2, v + 17.2)) { var tp = P2(u2, v + 17.2); C.trees.push({ x: tp.x, y: tp.y, r: 2.2 + pkr() * 0.8, s: pkr() }); }
      }
    });

    // ---------- Details auf den Grundstücken ----------
    var pr3 = mulberry(seed * 23 + 7);
    for (var py6 = 3; py6 < H - 3; py6 += 7) for (var px6 = 3; px6 < W - 3; px6 += 7) {
      var x6 = px6 + pr3() * 4, y6 = py6 + pr3() * 4, c6 = L(x6, y6), q6 = pr3();
      if (c6 !== 7 && c6 !== 8 && !(c6 === 0 && inCity(x6, y6))) continue;
      var a6 = fieldAng(x6, y6), ux6 = Math.cos(a6), uy6 = Math.sin(a6);
      function prop(k, w, h, col) {
        var P6 = rectPts(x6, y6, ux6, uy6, -uy6, ux6, w, h);
        if (!P6.every(function (p) { var cc = L(p.x, p.y); return cc === c6; })) return false;
        rectMark(P6, 10); C.props.push({ k: k, P: P6, col: col }); return true;
      }
      if (c6 === 7 || c6 === 0) {
        if (q6 < 0.06) prop("shed", 2.4, 3, pick(pr3, ["#8F7B66", "#7D848C", "#A08C74"]));
        else if (q6 < 0.085 && S.style !== "jp") prop("tramp", 3.4, 3.4, "#2F3A3F");
        else if (q6 < 0.12) prop("patio", 4, 3, "#D8D3C8");
      } else {
        if (q6 < 0.05) prop("bins", 3, 0.9, "#4E5A52");
        else if (q6 < 0.08) prop("bikes", 5, 2, "#B9BDC1");
        else if (q6 < 0.1 && S.style !== "usa") prop("play", 5, 5, "#E6D6A8");
      }
    }

    // ---------- Bäume ----------
    var tr = mulberry(seed * 11 + 5);
    function addTree(x, y, r0) { C.trees.push({ x: x, y: y, r: r0, s: hash2(x | 0, y | 0, 5) }); }
    // Straßenbäume an Haupt- und Verteilerstraßen, in Europa als Allee in der Mitte der Hauptstraßen
    C.roads.forEach(function (r) {
      if (r.cls === "rail") return;
      var prob = r.cls === "local" ? st.streetTree * 0.35 : st.streetTree;
      if (S.style === "eu" && r.cls === "main") { r.median = true; }
      var gap = S.style === "jp" ? 9 : 11;
      for (var s = 6; s < r.len - 6; s += gap) {
        if (nearJ(r, s, 8) || onBr(r, s)) continue;
        var p = at(r, s);
        if (!inCity(p.x, p.y) && r.cls === "local") continue;
        if (r.median) addTree(p.x, p.y, 3.2 + tr() * 0.8);
        if (tr() > prob) continue;
        [-1, 1].forEach(function (sd3) {
          var o = r.hw + r.sw * 0.55, x = p.x - p.ty * sd3 * o, y = p.y + p.tx * sd3 * o;
          if (L(x, y) === 1 && !anyAsphalt(x, y, r)) addTree(x, y, r.cls === "local" ? 1.6 + tr() * 0.8 : 2.4 + tr() * 1.4);
        });
      }
    });
    function anyAsphalt(x, y, self) {
      return hnear(x, y, 20, function (e, d) { return e.r !== self && e.r.cls !== "rail" && d < e.r.hw + e.r.sw * 0.3; }) ||
        hnear(x, y, 20, function (e, d) { return e.r.cls === "rail" && d < e.r.hw + 2; });
    }
    // Gärten, Höfe, Parks, Land
    for (var ty2 = 2; ty2 < H - 2; ty2 += 5) for (var tx2 = 2; tx2 < W - 2; tx2 += 5) {
      var x9 = tx2 + hash2(tx2, ty2, seed + 41) * 4, y9 = ty2 + hash2(tx2, ty2, seed + 42) * 4, c9 = L(x9, y9), h9 = hash2(tx2, ty2, seed + 43);
      if (c9 === 3) { var cl = noise2(x9 / 45, y9 / 45, seed + 44); if (h9 < st.park + (cl - 0.45) * 1.6 && !nearPath(x9, y9, 4.5)) addTree(x9, y9, 3 + hash2(tx2, ty2, 9) * 3); }
      else if (c9 === 7) { if (h9 < st.trees * 0.45 + 0.06 && L(x9 + 2.5, y9) === 7 && L(x9 - 2.5, y9) === 7 && L(x9, y9 + 2.5) === 7 && L(x9, y9 - 2.5) === 7) addTree(x9, y9, 2 + hash2(tx2, ty2, 9) * 2.4); }
      else if (c9 === 8) { if (S.style !== "usa" && h9 < (S.style === "eu" ? 0.16 : 0.05) && L(x9 + 3, y9) === 8 && L(x9 - 3, y9) === 8 && L(x9, y9 + 3) === 8 && L(x9, y9 - 3) === 8) addTree(x9, y9, 2.2 + hash2(tx2, ty2, 9) * 2); }
      else if (c9 === 0) { if (h9 < st.trees * 0.35 && L(x9 + 3, y9) === 0 && L(x9 - 3, y9) === 0 && L(x9, y9 + 3) === 0 && L(x9, y9 - 3) === 0) addTree(x9, y9, 2.5 + hash2(tx2, ty2, 9) * 2.5); }
      else if (c9 === 4) { if (h9 < 0.12 && !C.specials.some(function (sp) { var dx = x9 - sp.cx, dy = y9 - sp.cy, u = dx * sp.ux + dy * sp.uy, v = -dx * sp.uy + dy * sp.ux; return (u * u) / Math.pow(sp.fa + 6, 2) + (v * v) / Math.pow(sp.fb + 6, 2) < 1.15 || sp.type === "harbor" || sp.type === "airport" || sp.type === "campus"; }) && L(x9 + 4, y9) === 4 && L(x9 - 4, y9) === 4 && L(x9, y9 + 4) === 4 && L(x9, y9 - 4) === 4) addTree(x9, y9, 2.6 + hash2(tx2, ty2, 9) * 1.6); }
      else if (c9 === 6) { var fn = noise2(x9 / 140, y9 / 140, seed + 45); if (fn > 0.62 && h9 < 0.75) addTree(x9, y9, 3.5 + hash2(tx2, ty2, 9) * 2.5); else if (h9 < 0.006) addTree(x9, y9, 4); }
    }

    // ---------- Autos ----------
    var ar = mulberry(seed * 13 + 9);
    C.roads.forEach(function (r) {
      if (r.cls === "rail") return;
      var park2 = r.cls === "local" ? (S.style === "eu" ? 0.62 : S.style === "usa" ? 0.25 : 0.06) : r.cls === "dist" ? (S.style === "eu" ? 0.45 : 0.18) : 0;
      if (park2 > 0) for (var s = 8; s < r.len - 8; s += 5.6) {
        if (nearJ(r, s, 6) || onBr(r, s)) continue;
        var p = at(r, s);
        if (!inCity(p.x, p.y)) continue;
        [-1, 1].forEach(function (sd4) {
          if (ar() > park2) return;
          var o = r.hw - 1.25, x = p.x - p.ty * sd4 * o, y = p.y + p.tx * sd4 * o;
          C.cars.push({ x: x, y: y, a: Math.atan2(p.ty, p.tx), c: pick(ar, CARS) });
        });
      }
      // Verkehr auf den Fahrspuren
      var lanes = r.cls === "main" ? [-r.hw * 0.75, -r.hw * 0.28, r.hw * 0.28, r.hw * 0.75] : r.cls === "dist" ? [-r.hw * 0.45, r.hw * 0.45] : [];
      if (r.median) lanes = [-r.hw * 0.8, -r.hw * 0.45, r.hw * 0.45, r.hw * 0.8];
      lanes.forEach(function (o) {
        for (var s = 10 + ar() * 40; s < r.len - 10; s += 22 + ar() * 70) {
          if (nearJ(r, s, 10)) continue;
          var p = at(r, s), dirA = Math.atan2(p.ty, p.tx) + (o < 0 ? Math.PI : 0);
          C.cars.push({ x: p.x - p.ty * o, y: p.y + p.tx * o, a: dirA, c: pick(ar, CARS) });
        }
      });
    });
    C.lots.forEach(function (lt) {
      var lr2 = mulberry(lt.seed), rows = Math.max(1, Math.floor(lt.d / 11)), cols = Math.floor(lt.f / 2.6);
      for (var rw = 0; rw < rows; rw++) for (var cc = 0; cc < cols; cc++) {
        if (lr2() > 0.55) continue;
        var u = (cc + 0.5) * 2.6, v = rw * 11 + 2.8;
        C.cars.push({ x: lt.P[0].x + lt.tx * u + lt.nx * v, y: lt.P[0].y + lt.ty * u + lt.ny * v, a: Math.atan2(lt.ny, lt.nx), c: pick(lr2, CARS) });
      }
    });

    function nearJ(r, s, m) { for (var i = 0; i < r.junc.length; i++) if (Math.abs(r.junc[i].s - s) < r.junc[i].w + m) return true; return false; }
    function onBr(r, s) { for (var i = 0; i < r.bridges.length; i++) if (s > r.bridges[i][0] - 3 && s < r.bridges[i][1] + 3) return true; return false; }
    C.nearJ = nearJ;

    // ---------- Boden (1 m): Grundfarbe, Gärten, Hecken an Grundstücksgrenzen, Innenhöfe ----------
    var gcv = document.createElement("canvas"); gcv.width = W; gcv.height = H;
    var gx2 = gcv.getContext("2d"), gd = gx2.createImageData(W, H), g = gd.data, gr = st.ground;
    var b2r = new Float32Array(MW * MH), b2g = new Float32Array(MW * MH), b2b = new Float32Array(MW * MH), dn2 = new Float32Array(MW * MH), ic2 = new Uint8Array(MW * MH);
    for (var j3 = 0; j3 < MH; j3++) for (var i3 = 0; i3 < MW; i3++) {
      var x3 = i3 * 2, y3 = j3 * 2, m3 = j3 * MW + i3, n4 = noise2(x3 / 90, y3 / 90, seed + 50) - 0.5, ic = inCity(x3, y3), col;
      if (ic) col = [gr[0] + n4 * 8, gr[1] + n4 * 8, gr[2] + n4 * 8];
      else {
        var fld = noise2(x3 / 180, y3 / 180, seed + 51), stripe = (Math.floor((x3 * Math.cos(gAng) + y3 * Math.sin(gAng)) / 60) + Math.floor(fld * 5)) % 3;
        col = stripe === 0 ? [206, 216, 176] : stripe === 1 ? [196, 210, 166] : [214, 214, 178];
        col = [col[0] + n4 * 10, col[1] + n4 * 10, col[2] + n4 * 6];
      }
      b2r[m3] = col[0]; b2g[m3] = col[1]; b2b[m3] = col[2]; ic2[m3] = ic ? 1 : 0; dn2[m3] = ic ? density(x3, y3) : 0;
    }
    var GARD = S.style === "usa" ? [200, 214, 172] : S.style === "jp" ? [208, 212, 190] : [204, 214, 178];
    var YARD = S.style === "usa" ? [132, 135, 140] : S.style === "jp" ? [214, 211, 204] : [221, 214, 200];
    var HEDGE = [170, 192, 140];
    for (var y4 = 0; y4 < H; y4++) for (var x4 = 0; x4 < W; x4++) {
      var k5 = y4 * W + x4, m5 = (y4 >> 1) * MW + (x4 >> 1), lc = land[k5], r5 = b2r[m5], g5 = b2g[m5], bl5 = b2b[m5], o5 = k5 * 4;
      if (lc === 7) {
        var pp = plotId[k5];
        { r5 = GARD[0] + (r5 - gr[0]); g5 = GARD[1] + (g5 - gr[1]); bl5 = GARD[2] + (bl5 - gr[2]); }
      } else if (lc === 8) { r5 = YARD[0] + (r5 - gr[0]) * 0.6; g5 = YARD[1] + (g5 - gr[1]) * 0.6; bl5 = YARD[2] + (bl5 - gr[2]) * 0.6; }
      else if (lc === 0 && ic2[m5] && S.style !== "usa") { var gw = Math.max(0, 0.75 - dn2[m5] * 1.3); r5 += (GARD[0] - r5) * gw; g5 += (GARD[1] - g5) * gw; bl5 += (GARD[2] - bl5) * gw; }
      g[o5] = r5; g[o5 + 1] = g5; g[o5 + 2] = bl5; g[o5 + 3] = 255;
    }
    gx2.putImageData(gd, 0, 0); C.ground = gcv;
    // Parkplätze in amerikanischen Innenhöfen
    if (S.style === "usa") {
      var cr = mulberry(seed * 19 + 4);
      for (var py5 = 3; py5 < H - 3; py5 += 6) for (var px5 = 2; px5 < W - 2; px5 += 3) {
        if (L(px5, py5) !== 8 || L(px5 + 3, py5) !== 8 || L(px5 - 3, py5) !== 8 || L(px5, py5 + 3) !== 8 || L(px5, py5 - 3) !== 8 || cr() > 0.4) continue;
        C.cars.push({ x: px5, y: py5, a: Math.PI / 2, c: pick(cr, CARS) });
      }
    }

    C.gdist = null;
    C.localsN = locals.length;
    C.km = Math.round(C.roads.filter(function (r) { return r.cls !== "rail"; }).reduce(function (a, r) { return a + r.len; }, 0) / 100) / 10;
    C.ms = Math.round(performance.now() - t0);
    C.land = null;
    return C;
  }

  // Zusammenhängende Flächen einer Maske (2 m), mit Hauptachse
  function components(m) {
    var seen = new Uint8Array(m.length), out = [];
    for (var i = 0; i < m.length; i++) {
      if (!m[i] || seen[i]) continue;
      var st = [i], cells = [], edge = []; seen[i] = 1;
      while (st.length) {
        var c = st.pop(); cells.push(c);
        var x = c % MW, y = (c / MW) | 0, isEdge = false;
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
          var nx = x + d[0], ny = y + d[1];
          if (nx < 0 || ny < 0 || nx >= MW || ny >= MH) { isEdge = true; return; }
          var k = ny * MW + nx;
          if (!m[k]) { isEdge = true; return; }
          if (!seen[k]) { seen[k] = 1; st.push(k); }
        });
        if (isEdge) edge.push({ x: x * 2 + 1, y: y * 2 + 1 });
      }
      if (cells.length < 40) continue;
      var sx = 0, sy = 0; cells.forEach(function (c) { sx += (c % MW) * 2 + 1; sy += ((c / MW) | 0) * 2 + 1; });
      var cx = sx / cells.length, cy = sy / cells.length, xx = 0, yy = 0, xy = 0;
      cells.forEach(function (c) { var dx = (c % MW) * 2 + 1 - cx, dy = ((c / MW) | 0) * 2 + 1 - cy; xx += dx * dx; yy += dy * dy; xy += dx * dy; });
      var ang = 0.5 * Math.atan2(2 * xy, xx - yy), ux = Math.cos(ang), uy = Math.sin(ang), a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9;
      cells.forEach(function (c) { var dx = (c % MW) * 2 + 1 - cx, dy = ((c / MW) | 0) * 2 + 1 - cy, u = dx * ux + dy * uy, v = -dx * uy + dy * ux; if (u < a0) a0 = u; if (u > a1) a1 = u; if (v < b0) b0 = v; if (v > b1) b1 = v; });
      var mu = (a0 + a1) / 2, mv = (b0 + b1) / 2;
      out.push({ cells: cells, edge: edge, area: cells.length * 4, cx: cx + ux * mu - uy * mv, cy: cy + uy * mu + ux * mv, ux: ux, uy: uy, a: (a1 - a0) / 2, b: (b1 - b0) / 2 });
    }
    return out;
  }

  // ---------- Zeichnen der Stadt ----------
  // Zeichnet den Ausschnitt [x0,y0,x1,y1] (Meter) in einen Kontext, der bereits auf Meter skaliert ist.
  function drawCity(x, C, vb, z) {
    var st = C.st;
    function vis(bb) { return !(bb[2] < vb[0] || bb[0] > vb[2] || bb[3] < vb[1] || bb[1] > vb[3]); }
    function visP(px, py, r) { return px + r > vb[0] && px - r < vb[2] && py + r > vb[1] && py - r < vb[3]; }
    x.imageSmoothingEnabled = true;
    x.drawImage(C.ground, 0, 0, W, H);
    // Flächen aus der Bemalung
    var tmp = document.createElement("canvas"), tw = Math.ceil((vb[2] - vb[0]) * z), th = Math.ceil((vb[3] - vb[1]) * z);
    tmp.width = Math.max(1, tw); tmp.height = Math.max(1, th);
    var tx = tmp.getContext("2d");
    function layer(k, col, extra, deco) {
      tx.setTransform(1, 0, 0, 1, 0, 0); tx.clearRect(0, 0, tmp.width, tmp.height);
      tx.setTransform(z, 0, 0, z, -vb[0] * z, -vb[1] * z); tx.strokeStyle = col; drawLayer(tx, k, S.paintGen || [], extra);
      if (deco) { tx.globalCompositeOperation = "source-atop"; deco(tx); tx.globalCompositeOperation = "source-over"; }
      x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.drawImage(tmp, 0, 0); x.restore();
    }
    function paving(t2) {   // Pflastermuster auf Plätzen
      if (z < 1.2) return; t2.strokeStyle = "rgba(150,138,118,.28)"; t2.lineWidth = 0.18; t2.beginPath();
      for (var gx = Math.floor(vb[0] / 3) * 3; gx < vb[2]; gx += 3) { t2.moveTo(gx, vb[1]); t2.lineTo(gx, vb[3]); }
      for (var gy = Math.floor(vb[1] / 3) * 3; gy < vb[3]; gy += 3) { t2.moveTo(vb[0], gy); t2.lineTo(vb[2], gy); }
      t2.stroke();
    }
    layer("r", "#D4CCBC", 1.2); layer("r", "#E3DCCD", 0, paving); layer("g", "#B9D99C", 4); layer("g", "#A6CF88", 0);
    layer("p", "#C9C5BC", 1.6); layer("p", "#84888D", 0);
    // Stellplätze der gemalten Parkflächen
    x.strokeStyle = "#E7E4DC"; x.lineWidth = 0.15; x.beginPath();
    C.pk.forEach(function (l) { if (!visP(l[0], l[1], 8)) return; x.moveTo(l[0], l[1]); x.lineTo(l[2], l[3]); }); x.stroke();
    layer("b", "#CFE5EE", 10); layer("b", "#8EC0DC", 4); layer("b", "#78B0D3", 0);
    // Teiche und Parkwege
    C.ponds.forEach(function (p) {
      if (!visP(p.x, p.y, p.r * 2)) return;
      var pr = mulberry(p.seed); x.beginPath();
      for (var i = 0; i <= 24; i++) { var a = i / 24 * Math.PI * 2, rr2 = p.r * (0.8 + 0.35 * Math.sin(a * 2 + pr() * 6) * 0.6 + pr() * 0.1); if (i) x.lineTo(p.x + Math.cos(a) * rr2 * 1.3, p.y + Math.sin(a) * rr2); else x.moveTo(p.x + Math.cos(a) * rr2 * 1.3, p.y + Math.sin(a) * rr2); }
      x.closePath(); x.fillStyle = "#CFE5EE"; x.lineWidth = 3; x.strokeStyle = "#CFE5EE"; x.stroke(); x.fillStyle = "#78B0D3"; x.fill();
    });
    x.lineCap = "round"; x.lineJoin = "round";
    C.paths.forEach(function (P) { x.beginPath(); P.forEach(function (p, i) { if (i) x.lineTo(p.x, p.y); else x.moveTo(p.x, p.y); }); x.strokeStyle = "#E9DFC4"; x.lineWidth = 3; x.stroke(); });
    // Hecken an Grundstücksgrenzen
    x.lineCap = "round"; x.strokeStyle = "#A3BE86"; x.lineWidth = 0.9;
    x.beginPath(); C.hedges.forEach(function (h) { if (!visP(h[0], h[1], 30)) return; x.moveTo(h[0], h[1]); x.lineTo(h[2], h[3]); }); x.stroke();
    // Schiffe
    C.ships.forEach(function (s) { if (!visP(s.x, s.y, s.l)) return; drawShip(x, s); });

    var roads = C.roads.filter(function (r) { return vis(r.bb); });
    function path(r, s0, s1) {
      x.beginPath();
      if (s0 == null) { r.pts.forEach(function (p, i) { if (i) x.lineTo(p.x, p.y); else x.moveTo(p.x, p.y); }); return; }
      var a = at(r, s0); x.moveTo(a.x, a.y);
      for (var i = 0; i < r.pts.length; i++) if (r.L[i] > s0 && r.L[i] < s1) x.lineTo(r.pts[i].x, r.pts[i].y);
      var b = at(r, s1); x.lineTo(b.x, b.y);
    }
    // Brückenschatten
    roads.forEach(function (r) { r.bridges.forEach(function (b) { x.save(); x.translate(2.5, 3.5); path(r, Math.max(0, b[0]), Math.min(r.len, b[1])); x.strokeStyle = "rgba(20,50,70,.35)"; x.lineWidth = 2 * (r.hw + r.sw) + 2; x.lineCap = "butt"; x.stroke(); x.restore(); }); });
    var rank = { rail: 0, local: 1, dist: 2, main: 3 };
    var rs = roads.filter(function (r) { return r.cls !== "rail"; }).sort(function (a, b) { return rank[a.cls] - rank[b.cls]; });
    // Gehwege, Bordstein, Asphalt
    rs.forEach(function (r) { path(r); x.strokeStyle = "#C9C5BC"; x.lineWidth = 2 * (r.hw + r.sw) + 0.8; x.stroke(); });
    rs.forEach(function (r) { path(r); x.strokeStyle = st.walk; x.lineWidth = 2 * (r.hw + r.sw); x.stroke(); });
    rs.forEach(function (r) { path(r); x.strokeStyle = "#55585E"; x.lineWidth = 2 * r.hw + 0.6; x.stroke(); });
    rs.forEach(function (r) { path(r); x.strokeStyle = r.cls === "main" ? "#62666C" : r.cls === "dist" ? "#6C7076" : (C.style === "jp" ? "#8A8C8F" : "#777B80"); x.lineWidth = 2 * r.hw; x.stroke(); });
    // Mittelstreifen mit Grün (Europa)
    rs.forEach(function (r) { if (!r.median) return; x.lineCap = "butt"; freeIntervals(r).forEach(function (iv) { path(r, iv[0], iv[1]); x.strokeStyle = "#D9D5CB"; x.lineWidth = 4.2; x.stroke(); path(r, iv[0], iv[1]); x.strokeStyle = "#9CC47F"; x.lineWidth = 3.4; x.stroke(); }); x.lineCap = "round"; });
    // Bordsteinradien an den Ecken der Kreuzungen
    C.flares.forEach(function (f) {
      if (!visP(f.k.x, f.k.y, 14)) return;
      x.beginPath(); x.moveTo(f.a0.x, f.a0.y); x.lineTo(f.k.x, f.k.y); x.lineTo(f.a1.x, f.a1.y); x.quadraticCurveTo(f.k.x, f.k.y, f.a0.x, f.a0.y); x.fillStyle = f.col; x.fill();
      x.beginPath(); x.moveTo(f.a1.x, f.a1.y); x.quadraticCurveTo(f.k.x, f.k.y, f.a0.x, f.a0.y); x.strokeStyle = "#55585E"; x.lineWidth = 0.3; x.stroke();
    });
    // Brückengeländer
    roads.forEach(function (r) { r.bridges.forEach(function (b) {
      [-1, 1].forEach(function (sd) { x.save(); var s0 = Math.max(0, b[0]), s1 = Math.min(r.len, b[1]); x.beginPath(); for (var s = s0; s <= s1; s += 2) { var p = at(r, s), o = (r.hw + r.sw) * sd; if (s === s0) x.moveTo(p.x - p.ty * o, p.y + p.tx * o); else x.lineTo(p.x - p.ty * o, p.y + p.tx * o); } x.strokeStyle = "#F4F2EC"; x.lineWidth = 0.9; x.stroke(); x.restore(); });
    }); });
    // Markierungen
    x.lineCap = "butt";
    rs.forEach(function (r) {
      if (r.cls === "local") return;
      var ints = freeIntervals(r);
      ints.forEach(function (iv) {
        if (r.cls === "main") {
          if (!r.median) {
            var yel = C.style === "usa";
            [-0.35, 0.35].forEach(function (o) { offPath(x, r, iv[0], iv[1], o); x.setLineDash([]); x.strokeStyle = yel ? "#E9C04A" : "#F1EEE6"; x.lineWidth = 0.25; x.stroke(); });
          }
          [-r.hw / 2, r.hw / 2].forEach(function (o) { offPath(x, r, iv[0], iv[1], o); x.setLineDash([3, 6]); x.strokeStyle = "#ECE9E1"; x.lineWidth = 0.2; x.stroke(); });
          x.setLineDash([]);
        } else {
          offPath(x, r, iv[0], iv[1], 0); x.setLineDash([3, 5]); x.strokeStyle = "#ECE9E1"; x.lineWidth = 0.2; x.stroke(); x.setLineDash([]);
        }
      });
    });
    // Zebrastreifen: Balken parallel zur Fahrtrichtung, über die ganze Fahrbahn, Haltelinien davor
    x.fillStyle = "rgba(244,242,236,.92)";
    C.zebras.forEach(function (zb) {
      if (!visP(zb.x, zb.y, zb.hw + 4)) return;
      var nx = -zb.dy, ny = zb.dx, ang = Math.atan2(zb.dy, zb.dx), n = Math.max(2, Math.floor((2 * zb.hw - 0.6) / 1.1)), o0 = -(n - 1) * 1.1 / 2;
      x.save(); x.translate(zb.x, zb.y); x.rotate(ang);
      for (var q = 0; q < n; q++) x.fillRect(-1.6, o0 + q * 1.1 - 0.28, 3.2, 0.56);
      x.restore();
    });
    x.strokeStyle = "rgba(244,242,236,.92)"; x.lineWidth = 0.45; x.lineCap = "butt";
    x.beginPath(); C.stops.forEach(function (l) { if (!visP(l[0], l[1], 12)) return; x.moveTo(l[0], l[1]); x.lineTo(l[2], l[3]); }); x.stroke();
    x.lineCap = "round";
    // Parkplätze, Einfahrten, Pools
    C.lots.forEach(function (lt) {
      if (!vis(bboxOf(lt.P, 2))) return;
      poly(x, lt.P); x.fillStyle = "#83878C"; x.fill();
      x.strokeStyle = "#E7E4DC"; x.lineWidth = 0.15;
      var rows = Math.max(1, Math.floor(lt.d / 11));
      for (var rw = 0; rw < rows; rw++) for (var u = 0; u <= lt.f + 0.01; u += 2.6) {
        var v0 = rw * 11 + 0.6, v1 = rw * 11 + 5.4;
        x.beginPath(); x.moveTo(lt.P[0].x + lt.tx * u + lt.nx * v0, lt.P[0].y + lt.ty * u + lt.ny * v0); x.lineTo(lt.P[0].x + lt.tx * u + lt.nx * v1, lt.P[0].y + lt.ty * u + lt.ny * v1); x.stroke();
      }
    });
    C.drives.forEach(function (P) { if (!vis(bboxOf(P, 1))) return; poly(x, P); x.fillStyle = "#CFCBC2"; x.fill(); });
    C.props.forEach(function (pp) {
      var P = pp.P; if (!visP(P[0].x, P[0].y, 8)) return;
      if (pp.k === "tramp") { var c = centroid(P); x.beginPath(); x.arc(c.x + 0.6, c.y + 0.8, 1.6, 0, 6.283); x.fillStyle = "rgba(0,0,0,.18)"; x.fill(); x.beginPath(); x.arc(c.x, c.y, 1.6, 0, 6.283); x.fillStyle = "#3A86C8"; x.fill(); x.beginPath(); x.arc(c.x, c.y, 1.2, 0, 6.283); x.fillStyle = pp.col; x.fill(); return; }
      if (pp.k === "play") { poly(x, P); x.fillStyle = pp.col; x.fill(); var c2 = centroid(P); x.fillStyle = "#C8432F"; x.fillRect(c2.x - 1.4, c2.y - 0.4, 1, 1); x.fillStyle = "#3B78B0"; x.fillRect(c2.x + 0.6, c2.y + 0.6, 1.2, 0.6); return; }
      if (pp.k === "patio") { poly(x, P); x.fillStyle = pp.col; x.fill(); return; }
      x.save(); x.translate(0.4, 0.55); poly(x, P); x.fillStyle = "rgba(40,36,30,.2)"; x.fill(); x.restore();
      poly(x, P); x.fillStyle = pp.col; x.fill();
      if (pp.k === "shed") { x.beginPath(); x.moveTo(P[0].x, P[0].y); x.lineTo(P[1].x, P[1].y); x.lineTo((P[1].x + P[2].x) / 2, (P[1].y + P[2].y) / 2); x.lineTo((P[0].x + P[3].x) / 2, (P[0].y + P[3].y) / 2); x.closePath(); x.fillStyle = shade(pp.col, 0.15); x.fill(); }
      if (pp.k === "bins") { var cb = ["#3E6B4E", "#4F6E8C", "#7A5A2E"]; for (var q = 0; q < 3; q++) { var t2 = (q + 0.15) / 3; x.fillStyle = cb[q]; x.fillRect(P[0].x + (P[1].x - P[0].x) * t2 - 0.35, P[0].y + (P[1].y - P[0].y) * t2 - 0.35 + 0.1, 0.75, 0.75); } }
    });
    C.pools.forEach(function (P) { if (!vis(bboxOf(P, 1))) return; poly(x, P); x.fillStyle = "#F2F0EA"; x.fill(); var c = centroid(P); x.save(); x.translate(c.x, c.y); x.scale(0.8, 0.8); x.translate(-c.x, -c.y); poly(x, P); x.fillStyle = "#6EC3E0"; x.fill(); x.restore(); });
    // Gebäude: erst alle Schatten, dann Dächer
    var bs = C.buildings.filter(function (b) { return vis(b.bb || (b.bb = bboxOf(b.P, b.h * 1.2 + 1))); });
    function polys(b) { return b.polys ? b.polys.concat(b.polys2) : [b.P]; }
    x.fillStyle = "rgba(40,36,30,.2)";
    bs.forEach(function (b) { var dx = 0.55 + b.h * 0.42, dy = 0.75 + b.h * 0.55; x.save(); x.translate(dx, dy); polys(b).forEach(function (P) { poly(x, P); x.fill(); }); x.restore(); });
    bs.forEach(function (b) { drawBuilding(x, b, z); });
    // Spezialbauten
    C.specials.forEach(function (sp) { if (!visP(sp.cx, sp.cy, Math.max(sp.a, sp.b) + 80)) return; drawSpecial(x, sp, C); });
    // Autos
    if (z > 0.5) C.cars.forEach(function (c) { if (!visP(c.x, c.y, 4)) return; drawCar(x, c); });
    // Bahn auf einem Viadukt: über den Straßen, mit Schatten
    roads.forEach(function (r) {
      if (r.cls !== "rail") return;
      x.lineCap = "butt"; x.lineJoin = "round";
      x.save(); x.translate(3.2, 4.4); path(r); x.strokeStyle = "rgba(30,30,30,.28)"; x.lineWidth = 11; x.stroke(); x.restore();
      path(r); x.strokeStyle = "#8F8B84"; x.lineWidth = 11; x.stroke();
      path(r); x.strokeStyle = "#BDB8AF"; x.lineWidth = 10.2; x.stroke();
      path(r); x.strokeStyle = "#A39C92"; x.lineWidth = 8; x.stroke();
      x.save(); x.setLineDash([0.45, 0.75]); path(r); x.strokeStyle = "#7B6F63"; x.lineWidth = 7.2; x.stroke(); x.restore();
      [-2.8, -1.25, 1.25, 2.8].forEach(function (o2) {
        x.beginPath(); for (var i = 0; i < r.pts.length; i++) { var nx = r.pts[Math.min(r.pts.length - 1, i + 1)], pv = r.pts[Math.max(0, i - 1)], tx2 = nx.x - pv.x, ty2 = nx.y - pv.y, l = Math.hypot(tx2, ty2) || 1, X = r.pts[i].x - ty2 / l * o2, Y = r.pts[i].y + tx2 / l * o2; if (i) x.lineTo(X, Y); else x.moveTo(X, Y); }
        x.strokeStyle = "#5C5F64"; x.lineWidth = 0.35; x.stroke();
      });
      // Masten der Oberleitung
      x.fillStyle = "#6E7177"; for (var s2 = 10; s2 < r.len; s2 += 40) { var p = at(r, s2); x.fillRect(p.x - p.ty * 4.6 - 0.35, p.y + p.tx * 4.6 - 0.35, 0.7, 0.7); x.fillRect(p.x + p.ty * 4.6 - 0.35, p.y - p.tx * 4.6 - 0.35, 0.7, 0.7); }
      x.lineCap = "round";
    });
    if (C.platforms) C.platforms.forEach(function (P) { x.save(); x.translate(1.6, 2.2); poly(x, P); x.fillStyle = "rgba(30,30,30,.25)"; x.fill(); x.restore(); poly(x, P); x.fillStyle = "#D8D4CB"; x.fill(); x.strokeStyle = "#B8B3A8"; x.lineWidth = 0.4; x.stroke(); x.fillStyle = "#9FA7AE"; var c0 = centroid(P); });
    // Bäume: Schatten, dann Kronen
    var ts = C.trees.filter(function (tr) { return visP(tr.x, tr.y, tr.r + 3); });
    x.fillStyle = "rgba(30,40,20,.22)";
    ts.forEach(function (tr) { x.beginPath(); x.arc(tr.x + tr.r * 0.45, tr.y + tr.r * 0.6, tr.r, 0, 6.283); x.fill(); });
    ts.forEach(function (tr) {
      var g = tr.s;
      x.fillStyle = g < 0.33 ? "#5F9150" : g < 0.66 ? "#6C9C55" : "#7AA65A"; x.beginPath(); x.arc(tr.x, tr.y, tr.r, 0, 6.283); x.fill();
      x.fillStyle = g < 0.5 ? "rgba(160,200,120,.55)" : "rgba(170,208,128,.5)"; x.beginPath(); x.arc(tr.x - tr.r * 0.28, tr.y - tr.r * 0.3, tr.r * 0.52, 0, 6.283); x.fill();
    });
  }
  function freeIntervals(r) {
    var ex = r.junc.map(function (j) { return [j.s - j.w - 2, j.s + j.w + 2]; }).sort(function (a, b) { return a[0] - b[0]; });
    var out = [], cur = 2;
    ex.forEach(function (e) { if (e[0] > cur + 2) out.push([cur, e[0]]); cur = Math.max(cur, e[1]); });
    if (r.len - 2 > cur + 2) out.push([cur, r.len - 2]);
    return out;
  }
  function offPath(x, r, s0, s1, o) {
    x.beginPath(); var first = true;
    for (var s = s0; s <= s1 + 0.01; s += 3) { var p = at(r, Math.min(s, s1)); var X = p.x - p.ty * o, Y = p.y + p.tx * o; if (first) { x.moveTo(X, Y); first = false; } else x.lineTo(X, Y); }
  }
  function poly(x, P) { x.beginPath(); x.moveTo(P[0].x, P[0].y); for (var i = 1; i < P.length; i++) x.lineTo(P[i].x, P[i].y); x.closePath(); }
  function centroid(P) { var sx = 0, sy = 0; P.forEach(function (p) { sx += p.x; sy += p.y; }); return { x: sx / P.length, y: sy / P.length }; }
  function shade(hex, f) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255;
    if (f > 0) { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; } else { r *= 1 + f; g *= 1 + f; b *= 1 + f; }
    return "rgb(" + (r | 0) + "," + (g | 0) + "," + (b | 0) + ")";
  }
  function drawBuilding(x, b, z) {
    if (b.polys) { drawBlockBuilding(x, b, z); return; }
    var P = b.P;
    if (b.type === "gable" || b.type === "hip") {
      var la = dist(P[0], P[1]), lb = dist(P[1], P[2]), A, B, Cc, D;
      if (la >= lb) { A = P[0]; B = P[1]; Cc = P[2]; D = P[3]; } else { A = P[1]; B = P[2]; Cc = P[3]; D = P[0]; }
      var m1 = { x: (A.x + D.x) / 2, y: (A.y + D.y) / 2 }, m2 = { x: (B.x + Cc.x) / 2, y: (B.y + Cc.y) / 2 };
      if (b.type === "hip") { var ins = Math.min(la, lb) * 0.45 / Math.max(la, lb); var mm1 = { x: m1.x + (m2.x - m1.x) * ins, y: m1.y + (m2.y - m1.y) * ins }, mm2 = { x: m2.x + (m1.x - m2.x) * ins, y: m2.y + (m1.y - m2.y) * ins }; m1 = mm1; m2 = mm2; }
      // Seite zum Licht (oben links) heller
      var nxA = (A.x + B.x) / 2 - (D.x + Cc.x) / 2, nyA = (A.y + B.y) / 2 - (D.y + Cc.y) / 2, lit = (-nxA - nyA) > 0;
      x.beginPath(); x.moveTo(A.x, A.y); x.lineTo(B.x, B.y); x.lineTo(m2.x, m2.y); x.lineTo(m1.x, m1.y); x.closePath(); x.fillStyle = shade(b.roof, lit ? 0.16 : -0.1); x.fill();
      x.beginPath(); x.moveTo(D.x, D.y); x.lineTo(Cc.x, Cc.y); x.lineTo(m2.x, m2.y); x.lineTo(m1.x, m1.y); x.closePath(); x.fillStyle = shade(b.roof, lit ? -0.1 : 0.16); x.fill();
      if (b.type === "hip") {
        x.beginPath(); x.moveTo(A.x, A.y); x.lineTo(D.x, D.y); x.lineTo(m1.x, m1.y); x.closePath(); x.fillStyle = shade(b.roof, 0.04); x.fill();
        x.beginPath(); x.moveTo(B.x, B.y); x.lineTo(Cc.x, Cc.y); x.lineTo(m2.x, m2.y); x.closePath(); x.fillStyle = shade(b.roof, -0.04); x.fill();
      }
      if (z > 1.2) { x.beginPath(); x.moveTo(m1.x, m1.y); x.lineTo(m2.x, m2.y); x.strokeStyle = shade(b.roof, -0.25); x.lineWidth = 0.25; x.stroke(); }
      poly(x, P); x.strokeStyle = shade(b.roof, -0.32); x.lineWidth = 0.3; x.stroke();
    } else {
      poly(x, P); x.fillStyle = shade(b.roof, -0.06); x.fill();
      var c = centroid(P), f = Math.max(0.6, 1 - 1.6 / Math.max(3, Math.min(dist(P[0], P[1]), dist(P[1], P[2]))));
      x.save(); x.translate(c.x, c.y); x.scale(f, f); x.translate(-c.x, -c.y); poly(x, P); x.fillStyle = shade(b.roof, 0.08); x.fill(); x.restore();
      poly(x, P); x.strokeStyle = shade(b.roof, -0.3); x.lineWidth = 0.3; x.stroke();
      if (z > 1.2 && b.h >= 2) {
        // kleine Aufbauten auf Flachdächern
        var hr = hash2(c.x | 0, c.y | 0, 77), n = 1 + Math.floor(hr * 3), ux = (P[1].x - P[0].x), uy = (P[1].y - P[0].y), vx = (P[3].x - P[0].x), vy = (P[3].y - P[0].y);
        for (var i = 0; i < n; i++) {
          var u = 0.2 + hash2(i, c.x | 0, 78) * 0.6, v = 0.2 + hash2(i, c.y | 0, 79) * 0.6, px = P[0].x + ux * u + vx * v, py = P[0].y + uy * u + vy * v;
          x.fillStyle = "rgba(60,60,60,.18)"; x.fillRect(px - 0.6, py - 0.2, 2.6, 2.2); x.fillStyle = shade(b.roof, 0.22); x.fillRect(px - 1.2, py - 1, 2.4, 2);
        }
      }
    }
  }
  // Gebäude aus der Block-Engine: Satteldach als zwei Hälften (straßenseitig, hofseitig), Licht von oben links
  function drawBlockBuilding(x, b, z) {
    var lit = (-b.nx - b.ny) * 0.075;
    if (b.flat) {
      b.polys.forEach(function (P) {
        poly(x, P); x.fillStyle = shade(b.roof, 0.04); x.fill();
        x.save(); poly(x, P); x.clip(); x.strokeStyle = shade(b.roof, -0.12); x.lineWidth = 1.6; x.stroke(); x.restore();
        poly(x, P); x.strokeStyle = shade(b.roof, -0.34); x.lineWidth = 0.3; x.stroke();
        if (z > 1.2 && b.h > 2.5) {
          var c = centroid(P), hr = hash2(c.x | 0, c.y | 0, 81);
          x.fillStyle = "rgba(60,60,60,.18)"; x.fillRect(c.x - 0.4, c.y - 0.2, 2.8, 2.4); x.fillStyle = shade(b.roof, 0.22); x.fillRect(c.x - 1.2, c.y - 1.2, 2.6, 2.2);
          if (hr > 0.5) { x.fillStyle = shade(b.roof, 0.18); x.fillRect(c.x + 3, c.y + 1.5, 1.8, 1.8); }
        }
      });
      return;
    }
    b.polys.forEach(function (P) { poly(x, P); x.fillStyle = shade(b.roof, lit); x.fill(); });
    b.polys2.forEach(function (P) { poly(x, P); x.fillStyle = shade(b.roof, -lit - 0.04); x.fill(); });
    x.strokeStyle = shade(b.roof, -0.32); x.lineWidth = 0.28;
    b.polys.forEach(function (P) { poly(x, P); x.stroke(); });
    b.polys2.forEach(function (P) { poly(x, P); x.stroke(); });
  }
  function drawCar(x, c) {
    x.save(); x.translate(c.x, c.y); x.rotate(c.a);
    x.fillStyle = "rgba(0,0,0,.22)"; x.fillRect(-2.05, -0.75, 4.5, 1.95);
    x.fillStyle = c.c; x.fillRect(-2.25, -0.95, 4.5, 1.9);
    x.fillStyle = "rgba(30,40,55,.75)"; x.fillRect(0.55, -0.78, 0.85, 1.56); x.fillRect(-1.65, -0.72, 0.6, 1.44);
    x.fillStyle = "rgba(255,255,255,.22)"; x.fillRect(-1.0, -0.7, 1.5, 1.4);
    x.restore();
  }
  function drawShip(x, s) {
    x.save(); x.translate(s.x, s.y); x.rotate(Math.atan2(s.ay, s.ax));
    var l = s.l, w = l * 0.16;
    x.fillStyle = "rgba(20,50,70,.25)"; x.beginPath(); x.moveTo(-l / 2 + 2, -w / 2 + 3); x.lineTo(l / 2 - w + 2, -w / 2 + 3); x.lineTo(l / 2 + 2, 3); x.lineTo(l / 2 - w + 2, w / 2 + 3); x.lineTo(-l / 2 + 2, w / 2 + 3); x.closePath(); x.fill();
    x.fillStyle = s.c; x.beginPath(); x.moveTo(-l / 2, -w / 2); x.lineTo(l / 2 - w, -w / 2); x.lineTo(l / 2, 0); x.lineTo(l / 2 - w, w / 2); x.lineTo(-l / 2, w / 2); x.closePath(); x.fill();
    var cols = ["#D4553A", "#3F7FB5", "#E2B23C", "#4E9A6B", "#E6E3DC"], k = 0;
    for (var u = -l / 2 + l * 0.18; u < l / 2 - w * 1.4; u += 6.4) for (var v = -w / 2 + 1; v < w / 2 - 2.2; v += 2.6) { x.fillStyle = cols[(k++ * 7 + (u | 0)) % cols.length]; x.fillRect(u, v, 6, 2.3); }
    x.fillStyle = "#F2F0EA"; x.fillRect(-l / 2 + 2, -w / 2 + 1, l * 0.12, w - 2);
    x.restore();
  }
  // Spezialbauten im eigenen, gedrehten Raum. a, b: halbe Ausdehnung, passend in die rote Fläche eingepasst.
  function drawSpecial(x, sp, C) {
    var r = mulberry(sp.seed), a = sp.fa, b = sp.fb, T = sp.type, V = sp.v || 0;
    if (T === "harbor") { drawHarbor(x, sp); return; }
    x.save(); x.translate(sp.cx, sp.cy); x.rotate(Math.atan2(sp.uy, sp.ux));
    var SH = "rgba(40,36,30,.22)";
    function rect(px, py, w, h, col, hgt) { if (hgt) { x.fillStyle = SH; x.fillRect(px + hgt * 0.4, py + hgt * 0.55, w, h); } x.fillStyle = col; x.fillRect(px, py, w, h); }
    function roofRect(px, py, w, h, col, hgt) {   // Satteldach entlang der längeren Seite
      rect(px, py, w, h, col, hgt);
      x.fillStyle = shade(col, 0.14); if (w >= h) x.fillRect(px, py, w, h / 2); else x.fillRect(px, py, w / 2, h);
      x.strokeStyle = shade(col, -0.3); x.lineWidth = 0.3; x.strokeRect(px, py, w, h);
    }
    function circ(cx, cy, rad, col, hgt) { if (hgt) { x.beginPath(); x.arc(cx + hgt * 0.4, cy + hgt * 0.55, rad, 0, 6.283); x.fillStyle = SH; x.fill(); } x.beginPath(); x.arc(cx, cy, rad, 0, 6.283); x.fillStyle = col; x.fill(); }
    function ell(rx, ry, col, ox, oy) { x.beginPath(); x.ellipse(ox || 0, oy || 0, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, 6.283); x.fillStyle = col; x.fill(); }
    function tree(px, py, rad) { circ(px + rad * 0.45, py + rad * 0.6, rad, "rgba(30,40,20,.22)"); circ(px, py, rad, "#6C9C55"); circ(px - rad * 0.28, py - rad * 0.3, rad * 0.52, "rgba(170,208,128,.5)"); }
    function lawn(px, py, w, h) { rect(px, py, w, h, "#A6CF88"); x.fillStyle = "rgba(255,255,255,.07)"; for (var q = 0; q < w; q += 6) if ((q / 6) % 2 === 0) x.fillRect(px + q, py, 3, h); }
    function parkingRows(px, py, w, h) {
      rect(px, py, w, h, "#83878C"); x.strokeStyle = "#E7E4DC"; x.lineWidth = 0.15;
      for (var v2 = py + 1; v2 + 5 < py + h; v2 += 17) for (var u2 = px + 1; u2 < px + w - 1; u2 += 2.6) {
        x.beginPath(); x.moveTo(u2, v2); x.lineTo(u2, v2 + 5); x.moveTo(u2, v2 + 11); x.lineTo(u2, v2 + 16); x.stroke();
        if (r() < 0.55) drawCar(x, { x: u2 + 1.3, y: v2 + 2.6, a: Math.PI / 2, c: pick(r, CARS) });
        if (v2 + 16 < py + h && r() < 0.55) drawCar(x, { x: u2 + 1.3, y: v2 + 13.6, a: Math.PI / 2, c: pick(r, CARS) });
      }
    }
    if (T === "stadium") {
      var rx = Math.min(a, b * 1.45), ry = Math.min(b, a / 1.3);
      if (sp.lk === "baseball") {
        var R0 = Math.min(a, b) * 1.5;
        x.save(); x.translate(-R0 * 0.35, R0 * 0.35); x.rotate(-Math.PI / 4);
        x.beginPath(); x.moveTo(0, 0); x.arc(0, 0, R0 * 0.95, -Math.PI / 4 - 0.75, -Math.PI / 4 + 0.75); x.closePath(); x.fillStyle = "#C9C6C0"; x.fill();
        x.beginPath(); x.moveTo(0, 0); x.arc(0, 0, R0 * 0.78, -Math.PI / 4 - 0.75, -Math.PI / 4 + 0.75); x.closePath(); x.fillStyle = "#5FA35A"; x.fill();
        x.rotate(-Math.PI / 4); var d3 = R0 * 0.22;
        x.fillStyle = "#C29266"; x.beginPath(); x.moveTo(0, 0); x.lineTo(d3, 0); x.lineTo(d3, -d3); x.lineTo(0, -d3); x.closePath(); x.fill();
        x.fillStyle = "#5FA35A"; x.fillRect(d3 * 0.18, -d3 * 0.82, d3 * 0.64, d3 * 0.64);
        x.restore();
      } else if (sp.lk === "arena") {
        x.save(); x.translate(4, 6); ell(rx, ry, SH); x.restore();
        ell(rx, ry, "#D9DCE0"); x.strokeStyle = "#B4B8BE"; x.lineWidth = 0.5;
        for (var k = 0; k < 24; k++) { var an = k / 24 * 6.283; x.beginPath(); x.moveTo(Math.cos(an) * rx * 0.35, Math.sin(an) * ry * 0.35); x.lineTo(Math.cos(an) * rx, Math.sin(an) * ry); x.stroke(); }
        ell(rx * 0.35, ry * 0.35, "#EEF0F2"); x.beginPath(); x.ellipse(0, 0, rx * 0.35, ry * 0.35, 0, 0, 6.283); x.stroke();
        x.beginPath(); x.ellipse(0, 0, rx * 0.7, ry * 0.7, 0, 0, 6.283); x.stroke();
      } else {
        x.save(); x.translate(4, 6); ell(rx, ry, SH); x.restore();
        ell(rx, ry, "#C9C6C0"); ell(rx * 0.93, ry * 0.9, "#A8ABB2");
        for (var k2 = 0; k2 < 6; k2++) { x.beginPath(); x.ellipse(0, 0, rx * (0.9 - k2 * 0.04), ry * (0.87 - k2 * 0.045), 0, 0, 6.283); x.strokeStyle = k2 % 2 ? "#B9473C" : "#C7574B"; x.lineWidth = Math.min(rx, ry) * 0.035; x.stroke(); }
        var pw = rx * 0.44, ph = ry * 0.42;
        rect(-pw, -ph, 2 * pw, 2 * ph, "#5FA35A");
        for (var s = 0; s < 8; s++) { x.fillStyle = s % 2 ? "rgba(255,255,255,.06)" : "rgba(0,0,0,.05)"; x.fillRect(-pw + s * pw / 4, -ph, pw / 4, 2 * ph); }
        x.strokeStyle = "rgba(255,255,255,.85)"; x.lineWidth = Math.max(0.3, pw * 0.012); x.strokeRect(-pw * 0.92, -ph * 0.9, pw * 1.84, ph * 1.8);
        x.beginPath(); x.moveTo(0, -ph * 0.9); x.lineTo(0, ph * 0.9); x.stroke(); x.beginPath(); x.arc(0, 0, ph * 0.28, 0, 6.283); x.stroke();
        x.strokeRect(-pw * 0.92, -ph * 0.4, pw * 0.3, ph * 0.8); x.strokeRect(pw * 0.62, -ph * 0.4, pw * 0.3, ph * 0.8);
      }
    } else if (T === "airport") {
      var rl = a * 1.9, rw = Math.min(45, b * 0.45), ry0 = -b * 0.35;
      rect(-rl / 2, ry0 - rw / 2, rl, rw, "#5B5F66");
      x.fillStyle = "#EEE"; for (var u = -rl / 2 + 60; u < rl / 2 - 60; u += 50) x.fillRect(u, ry0 - 0.5, 28, 1);
      for (var k3 = 0; k3 < 8; k3++) { x.fillRect(-rl / 2 + 6, ry0 - rw / 2 + 4 + k3 * (rw - 8) / 8, 22, 2); x.fillRect(rl / 2 - 28, ry0 - rw / 2 + 4 + k3 * (rw - 8) / 8, 22, 2); }
      rect(-rl / 2 + 40, ry0 + rw / 2 + 26, rl - 80, 16, "#6E7279");
      for (var c2 = -rl / 2 + 80; c2 < rl / 2 - 60; c2 += rl / 6) rect(c2, ry0 + rw / 2, 14, 28, "#6E7279");
      var tw = Math.min(rl * 0.45, 320), ty = ry0 + rw / 2 + 54, th = Math.max(20, Math.min(80, b - ty - 2));
      rect(-tw / 2, ty, tw, th, "#7D8188");
      rect(-tw / 2, ty + th * 0.45, tw, th * 0.45, "#DADDE1", 5);
      for (var g = -tw / 2 + 25; g < tw / 2 - 10; g += 48) { rect(g, ty + 4, 4, th * 0.42, "#C4C8CD", 3); drawPlane(x, g + 2, ty - 6, Math.PI / 2, 38); }
      drawPlane(x, -rl * 0.25, ry0, 0, 44);
    } else if (T === "cathedral" || T === "church") {
      var big = T === "cathedral", L0 = Math.min(a * 1.7, big ? 130 : 45), Wn = L0 * (big ? 0.2 : 0.26), tr = L0 * (big ? 0.55 : 0.5);
      var roof = big ? (V === 1 ? "#6B6F75" : "#5E7E78") : (V === 1 ? "#6F7782" : "#8C5A45"), h = big ? 9 : 5;
      if (big && V === 2) { var cs = Wn * 1.6; roofRect(L0 * 0.1 - cs / 2, Wn / 2, cs, Wn * 0.35, "#9A8F80", 3); roofRect(L0 * 0.1 - cs / 2, Wn / 2 + cs - Wn * 0.35, cs, Wn * 0.35, "#9A8F80", 3); roofRect(L0 * 0.1 - cs / 2, Wn / 2, Wn * 0.35, cs, "#9A8F80", 3); roofRect(L0 * 0.1 + cs / 2 - Wn * 0.35, Wn / 2, Wn * 0.35, cs, "#9A8F80", 3); lawn(L0 * 0.1 - cs / 2 + Wn * 0.35, Wn / 2 + Wn * 0.35, cs - Wn * 0.7, cs - Wn * 0.7); }
      x.fillStyle = SH; x.save(); x.translate(h * 0.42, h * 0.55); x.fillRect(-L0 / 2, -Wn / 2, L0, Wn); x.fillRect(L0 * 0.1 - Wn / 2, -tr / 2, Wn, tr); x.restore();
      x.fillStyle = roof; x.fillRect(-L0 / 2, -Wn / 2, L0, Wn); x.fillRect(L0 * 0.1 - Wn / 2, -tr / 2, Wn, tr);
      x.beginPath(); x.arc(L0 / 2, 0, Wn / 2, -Math.PI / 2, Math.PI / 2); x.fillStyle = shade(roof, -0.08); x.fill();
      x.fillStyle = shade(roof, 0.15); x.fillRect(-L0 / 2, -Wn / 2, L0, Wn / 2); x.fillRect(L0 * 0.1 - Wn / 2, -tr / 2, Wn / 2, tr);
      x.strokeStyle = shade(roof, -0.3); x.lineWidth = 0.4; x.beginPath(); x.moveTo(-L0 / 2, 0); x.lineTo(L0 / 2, 0); x.moveTo(L0 * 0.1, -tr / 2); x.lineTo(L0 * 0.1, tr / 2); x.stroke();
      if (big && V === 1) { circ(L0 * 0.1, 0, Wn * 0.62, "#7FA59A", 14); circ(L0 * 0.1 - Wn * 0.15, -Wn * 0.15, Wn * 0.3, "#A5C6BB"); rect(-L0 / 2 - Wn * 0.55, -Wn * 0.4, Wn * 0.8, Wn * 0.8, shade(roof, -0.15), 22); }
      else if (big) { rect(-L0 / 2 - Wn * 0.35, -Wn * 0.75, Wn * 0.6, Wn * 0.6, shade(roof, -0.15), 24); rect(-L0 / 2 - Wn * 0.35, Wn * 0.15, Wn * 0.6, Wn * 0.6, shade(roof, -0.15), 24); }
      else if (V === 1) circ(-L0 / 2 - Wn * 0.2, 0, Wn * 0.4, shade(roof, -0.15), 14);
      else rect(-L0 / 2 - Wn * 0.5, -Wn * 0.35, Wn * 0.7, Wn * 0.7, shade(roof, -0.15), 16);
      for (var t3 = 0; t3 < 6; t3++) tree(-a * 0.8 + t3 * a * 0.32, b * 0.82, 3);
    } else if (T === "opera") {
      var Lw = Math.min(a * 1.6, 110), Wd = Math.min(b * 1.5, 70);
      if (V === 1) {
        // Segeldächer
        x.fillStyle = SH; x.fillRect(-Lw / 2 + 4, -Wd * 0.3 + 6, Lw, Wd * 0.6);
        rect(-Lw / 2, -Wd * 0.3, Lw, Wd * 0.6, "#CFC6B5");
        for (var q2 = 0; q2 < 5; q2++) {
          var cx2 = -Lw / 2 + Lw * (0.14 + q2 * 0.17), sz = Wd * (0.42 - q2 * 0.04);
          x.beginPath(); x.moveTo(cx2 - sz * 0.5, sz * 0.4); x.quadraticCurveTo(cx2, -sz, cx2 + sz * 0.5, sz * 0.4); x.closePath(); x.fillStyle = "#F4F2EC"; x.fill();
          x.beginPath(); x.moveTo(cx2, -sz * 0.3); x.lineTo(cx2, sz * 0.4); x.strokeStyle = "#D8D4CA"; x.lineWidth = 0.5; x.stroke();
        }
      } else {
        x.fillStyle = SH; x.save(); x.translate(3, 4); x.fillRect(-Lw / 2, -Wd / 2, Lw, Wd); x.restore();
        rect(-Lw / 2, -Wd / 2, Lw, Wd, "#D8CDB8"); x.beginPath(); x.arc(-Lw / 2, 0, Wd / 2, Math.PI / 2, Math.PI * 1.5); x.fillStyle = "#D8CDB8"; x.fill();
        rect(Lw * 0.12, -Wd * 0.38, Lw * 0.3, Wd * 0.76, "#BFB39C", 12);
        circ(-Lw * 0.18, 0, Wd * 0.3, "#6E9C8E"); circ(-Lw * 0.18 - Wd * 0.08, -Wd * 0.08, Wd * 0.14, "#8DB8A9");
        x.fillStyle = "#B6AA92"; for (var k4 = -Wd / 2 + 3; k4 < Wd / 2 - 2; k4 += 4) { x.beginPath(); x.arc(-Lw / 2 - Wd * 0.42, k4 * 0.8, 0.9, 0, 6.283); x.fill(); }
      }
    } else if (T === "museum" || T === "townhall") {
      var s2 = Math.min(a, b) * 1.6, hs = s2 / 2, thk = s2 * 0.24, rc = T === "museum" ? "#BDB3A3" : "#A9573E";
      x.fillStyle = SH; x.save(); x.translate(3, 4); x.fillRect(-hs, -hs, s2, thk); x.fillRect(-hs, hs - thk, s2, thk); x.fillRect(-hs, -hs, thk, s2); if (T === "museum") x.fillRect(hs - thk, -hs, thk, s2); x.restore();
      x.fillStyle = rc; x.fillRect(-hs, -hs, s2, thk); x.fillRect(-hs, hs - thk, s2, thk); x.fillRect(-hs, -hs, thk, s2); if (T === "museum") x.fillRect(hs - thk, -hs, thk, s2);
      x.fillStyle = shade(rc, 0.14); x.fillRect(-hs, -hs, s2, thk / 2); x.fillRect(-hs, hs - thk, s2, thk / 2);
      if (T === "townhall") {
        rect(-hs - 4, -thk * 0.4, thk * 0.8, thk * 0.8, shade(rc, -0.2), 14);
        x.strokeStyle = "rgba(160,150,135,.5)"; x.lineWidth = 0.3; for (var g2 = hs + 2; g2 < a; g2 += 3) { x.beginPath(); x.moveTo(g2, -b); x.lineTo(g2, b); x.stroke(); }
        circ(Math.min(a * 0.75, hs + 20), 0, 4.5, "#CFC7B6"); circ(Math.min(a * 0.75, hs + 20), 0, 3.5, "#8EC0DC");
      } else if (V === 1) {
        x.beginPath(); x.moveTo(-hs * 0.3, hs * 0.3); x.lineTo(hs * 0.3, hs * 0.3); x.lineTo(0, -hs * 0.3); x.closePath(); x.fillStyle = "#CFE3EA"; x.fill(); x.strokeStyle = "#9FB9C2"; x.lineWidth = 0.4; x.stroke();
        x.beginPath(); x.moveTo(0, -hs * 0.3); x.lineTo(0, hs * 0.3); x.stroke();
      } else { circ(0, 0, hs * 0.32, "#CFE3EA"); x.strokeStyle = "#9FB9C2"; x.lineWidth = 0.4; for (var g3 = -hs * 0.3; g3 <= hs * 0.3; g3 += 2.5) { x.beginPath(); x.moveTo(g3, -Math.sqrt(Math.max(0, hs * hs * 0.1 - g3 * g3))); x.lineTo(g3, Math.sqrt(Math.max(0, hs * hs * 0.1 - g3 * g3))); x.stroke(); } }
    } else if (T === "campus") {
      lawn(-a, -b, 2 * a, 2 * b);
      x.strokeStyle = "#E9DFC4"; x.lineWidth = 3; x.beginPath(); x.moveTo(-a * 0.9, 0); x.lineTo(a * 0.9, 0); x.moveTo(0, -b * 0.9); x.lineTo(0, b * 0.9); x.stroke();
      if (sp.lk === "hospital") {
        var hw3 = Math.min(a * 0.9, 90), hh3 = Math.min(b * 0.8, 60), bar = Math.min(hw3, hh3) * 0.28;
        rect(-hw3, -hh3, bar, hh3 * 2, "#E6E3DC", 8); rect(hw3 - bar, -hh3, bar, hh3 * 2, "#E6E3DC", 8); rect(-hw3, -bar / 2, hw3 * 2, bar, "#EDEAE4", 8);
        circ(0, -hh3 * 0.55, Math.min(9, bar * 0.6), "#8E959C"); x.fillStyle = "#F2F0EA"; var hz = Math.min(9, bar * 0.6) * 0.5; x.fillRect(-hz * 0.6, -hh3 * 0.55 - hz, hz * 0.3, hz * 2); x.fillRect(hz * 0.3, -hh3 * 0.55 - hz, hz * 0.3, hz * 2); x.fillRect(-hz * 0.6, -hh3 * 0.55 - hz * 0.15, hz * 1.2, hz * 0.3);
      } else {
        for (var i = 0; i < 6; i++) {
          var w = Math.min(90, a * rr(r, 0.3, 0.46)), hh2 = Math.min(45, b * rr(r, 0.28, 0.4)), px = (i % 3 - 1) * a * 0.62 - w / 2, py = (i < 3 ? -1 : 1) * b * 0.5 - hh2 / 2;
          roofRect(px, py, w, hh2, pick(r, ["#B8705A", "#C9BBA6", "#A35C47"]), 6);
        }
      }
      for (var t4 = 0; t4 < 10; t4++) tree(rr(r, -a * 0.9, a * 0.9), (t4 % 2 ? 1 : -1) * b * 0.12, 2.6);
    } else if (T === "palace") {
      var Pw = Math.min(a * 0.5, 120), Ph = Math.min(b * 1.5, 110), px0 = -a + 4;
      // Schloss als Dreiflügelanlage, davor ein barocker Garten bis zum anderen Ende
      roofRect(px0, -Ph / 2, Pw * 0.28, Ph, "#6F7782", 10); roofRect(px0, -Ph / 2, Pw, Ph * 0.18, "#6F7782", 10); roofRect(px0, Ph / 2 - Ph * 0.18, Pw, Ph * 0.18, "#6F7782", 10);
      circ(px0 + Pw * 0.14, 0, Ph * 0.12, "#7FA59A", 14);
      var gx0 = px0 + Pw + 8, gw = a - gx0 - 4, gh = b * 1.7;
      if (gw > 20) {
        rect(gx0, -gh / 2, gw, gh, "#E9DFC4");
        var pc = 3, pr = 2, cw = (gw - 4 * (pc + 1)) / pc, ch = (gh - 6 * (pr + 1)) / pr;
        for (var ci = 0; ci < pc; ci++) for (var cj = 0; cj < pr; cj++) {
          var qx = gx0 + 4 + ci * (cw + 4), qy = -gh / 2 + 6 + cj * (ch + 6);
          rect(qx, qy, cw, ch, "#8DBA6B"); x.strokeStyle = "#5F9150"; x.lineWidth = 0.9; x.strokeRect(qx + 2, qy + 2, cw - 4, ch - 4);
          x.beginPath(); x.ellipse(qx + cw / 2, qy + ch / 2, cw * 0.25, ch * 0.25, 0, 0, 6.283); x.stroke();
        }
        circ(gx0 + gw / 2, 0, Math.min(10, gh * 0.08), "#CFC7B6"); circ(gx0 + gw / 2, 0, Math.min(8, gh * 0.065), "#8EC0DC");
        for (var t5 = gx0; t5 < gx0 + gw; t5 += 9) { tree(t5, -gh / 2 - 3, 2.6); tree(t5, gh / 2 + 3, 2.6); }
      }
    } else if (T === "temple") {
      rect(-a, -b, 2 * a, 2 * b, "#E8E3D6");
      var Hw = Math.min(a * 0.9, 50), Hh = Math.min(b * 0.9, 30);
      x.strokeStyle = "#D8D0BE"; x.lineWidth = 3; x.beginPath(); x.moveTo(-a, 0); x.lineTo(a * 0.2, 0); x.stroke();
      for (var g4 = -a + 6; g4 < a * 0.1 - 6; g4 += 12) { x.fillStyle = "#C8432F"; x.fillRect(g4, -3.2, 0.9, 6.4); x.fillRect(g4 - 0.5, -2.6, 1.9, 0.7); x.fillRect(g4 - 0.5, 2, 1.9, 0.7); }
      var hx = a * 0.2;
      x.fillStyle = SH; x.fillRect(hx + 3, -Hh / 2 + 4, Hw, Hh);
      x.fillStyle = "#3E434A"; x.fillRect(hx, -Hh / 2, Hw, Hh); x.fillStyle = "#565C64"; x.fillRect(hx, -Hh / 2, Hw, Hh / 2);
      x.strokeStyle = "#2B2F34"; x.lineWidth = 0.6; x.strokeRect(hx + 1.5, -Hh / 2 + 1.5, Hw - 3, Hh - 3); x.beginPath(); x.moveTo(hx + Hh * 0.3, 0); x.lineTo(hx + Hw - Hh * 0.3, 0); x.stroke();
      if (a > 30 && b > 20) {
        var pgx = -a * 0.5, pgy = -b * 0.55, pz = Math.min(12, b * 0.35);
        for (var lv = 0; lv < 5; lv++) { var sz2 = pz * (1 - lv * 0.16); rect(pgx - sz2 / 2, pgy - sz2 / 2, sz2, sz2, lv % 2 ? "#5C6168" : "#4A4F56", lv === 0 ? 16 : 0); }
      }
      for (var t6 = 0; t6 < 12; t6++) tree(rr(r, -a * 0.95, a * 0.95), (r() < 0.5 ? -1 : 1) * rr(r, b * 0.6, b * 0.95), 2.4 + r() * 1.5);
    } else if (T === "castle") {
      var cR = Math.min(a, b) * 0.95;
      rect(-cR, -cR, cR * 2, cR * 2, "#78B0D3");
      rect(-cR * 0.86, -cR * 0.86, cR * 1.72, cR * 1.72, "#9C9488");
      lawn(-cR * 0.78, -cR * 0.78, cR * 1.56, cR * 1.56);
      x.strokeStyle = "#E9DFC4"; x.lineWidth = 2.4; x.beginPath(); x.moveTo(-cR, 0); x.lineTo(0, 0); x.stroke();
      rect(-cR * 0.92, -2, cR * 0.14, 4, "#9C9488");
      var kz = cR * 0.42;
      for (var lv2 = 0; lv2 < 4; lv2++) { var s3 = kz * (1 - lv2 * 0.2); rect(-s3 / 2, -s3 / 2, s3, s3, lv2 % 2 ? "#F2F0EA" : "#3E434A", lv2 === 0 ? 18 : 0); }
      for (var t7 = 0; t7 < 10; t7++) tree(rr(r, -cR * 0.7, cR * 0.7), (t7 % 2 ? 1 : -1) * rr(r, cR * 0.45, cR * 0.72), 2.6);
    } else if (T === "mall") {
      var mw = Math.min(a * 1.2, 160), mh = Math.min(b * 0.9, 70);
      parkingRows(-a, -b, 2 * a, 2 * b);
      rect(-mw / 2, -b, mw, mh * 1.2 > b * 2 ? b * 1.6 : mh, "#D3D5D6", 4);
      x.fillStyle = "#C2C5C8"; x.fillRect(-mw / 2 + 2, -b + 2, mw - 4, 2); x.fillStyle = "#AEB2B6"; for (var q3 = -mw / 2 + 8; q3 < mw / 2 - 6; q3 += 14) x.fillRect(q3, -b + mh * 0.4, 3, 3);
    } else if (T === "market") {
      rect(-a, -b, 2 * a, 2 * b, "#E3DACA");
      x.strokeStyle = "rgba(170,158,140,.45)"; x.lineWidth = 0.25; for (var g5 = -a; g5 < a; g5 += 2.5) { x.beginPath(); x.moveTo(g5, -b); x.lineTo(g5, b); x.stroke(); }
      var tc = ["#C2533C", "#F2F0EA", "#3B78B0", "#D9A637", "#4D8F68"];
      for (var u4 = -a * 0.8; u4 < a * 0.8 - 4; u4 += 6) for (var v4 = -b * 0.7; v4 < b * 0.7 - 4; v4 += 9) {
        if (Math.abs(u4) < 8 && Math.abs(v4) < 8) continue;
        if (r() < 0.25) continue; rect(u4, v4, 4.4, 4.4, pick(r, tc), 1.2); x.fillStyle = "rgba(255,255,255,.25)"; x.fillRect(u4, v4, 2.2, 4.4);
      }
      circ(0, 0, 4, "#CFC7B6"); circ(0, 0, 3, "#8EC0DC");
    } else {
      var pr2 = Math.min(a, b) * 0.95;
      circ(0, 0, pr2, "#E5DDCD"); x.strokeStyle = "#CFC6B4"; x.lineWidth = 0.6; x.beginPath(); x.arc(0, 0, pr2, 0, 6.283); x.stroke();
      x.beginPath(); x.arc(0, 0, pr2 * 0.55, 0, 6.283); x.strokeStyle = "#D6CDBB"; x.stroke();
      if (V === 1) { x.fillStyle = "rgba(40,36,30,.3)"; x.beginPath(); x.moveTo(-0.8, 0); x.lineTo(pr2 * 0.6, pr2 * 0.8); x.lineTo(0.8, 0); x.fill(); rect(-1.1, -1.1, 2.2, 2.2, "#B8AF9F"); }
      else if (V === 2) { circ(0, 0, pr2 * 0.35, "#CFC7B6"); circ(0, 0, pr2 * 0.28, "#8EC0DC"); circ(0, 0, pr2 * 0.06, "#F2F0EA"); }
      else { circ(0, 0, pr2 * 0.16, "#9C9488", 6); circ(-0.5, -0.6, pr2 * 0.08, "#B8AF9F"); }
      for (var t8 = 0; t8 < 8; t8++) { var an2 = t8 / 8 * 6.283; tree(Math.cos(an2) * pr2 * 0.78, Math.sin(an2) * pr2 * 0.78, Math.max(1.5, pr2 * 0.1)); }
    }
    x.restore();
  }
  // Hafen: Kaikante mit Kränen, kompakte Containerblöcke, Lagerhallen. Rahmen: u entlang des Ufers, v zum Wasser.
  function drawHarbor(x, sp) {
    var hb = sp.hb; if (!hb) return;
    x.save(); x.translate(sp.cx, sp.cy); x.transform(hb.e1.x, hb.e1.y, hb.e2.x, hb.e2.y, 0, 0);
    if (hb.quay.length > 1) { x.beginPath(); hb.quay.forEach(function (q, i) { if (i) x.lineTo(q[0], q[1] - 6); else x.moveTo(q[0], q[1] - 6); }); x.strokeStyle = "#B9B6AE"; x.lineWidth = 12; x.stroke(); x.beginPath(); hb.quay.forEach(function (q, i) { if (i) x.lineTo(q[0], q[1] - 0.5); else x.moveTo(q[0], q[1] - 0.5); }); x.strokeStyle = "#8E8A82"; x.lineWidth = 1; x.stroke(); }
    hb.sheds.forEach(function (s) { x.fillStyle = "rgba(40,36,30,.22)"; x.fillRect(s[0] + 3, s[1] + 4, 60, 22); x.fillStyle = "#9AA0A6"; x.fillRect(s[0], s[1], 60, 22); x.fillStyle = "#AEB4BA"; x.fillRect(s[0], s[1], 60, 11); x.strokeStyle = "#7F858B"; x.lineWidth = 0.3; for (var u = s[0] + 5; u < s[0] + 60; u += 5) { x.beginPath(); x.moveTo(u, s[1]); x.lineTo(u, s[1] + 22); x.stroke(); } });
    hb.blocks.forEach(function (bk) {
      x.fillStyle = "#A7A49D"; x.fillRect(bk.u - 1, bk.v - 1, 40, 17);
      for (var k = 0; k < 18; k++) { var c = bk.c[k]; if (!c) continue; var cu = bk.u + (k % 3) * 12.8, cv = bk.v + Math.floor(k / 3) * 2.5; x.fillStyle = "rgba(30,30,30,.25)"; x.fillRect(cu + 0.6, cv + 0.8, 12.2, 2.3); x.fillStyle = c; x.fillRect(cu, cv, 12.2, 2.3); x.fillStyle = "rgba(255,255,255,.18)"; x.fillRect(cu, cv, 12.2, 0.8); }
    });
    hb.cranes.forEach(function (q) {
      var u = q[0], v = q[1];
      x.fillStyle = "rgba(30,30,30,.22)"; x.fillRect(u - 7 + 6, v - 20 + 8, 14, 34);
      x.fillStyle = "#D9622B"; x.fillRect(u - 7, v - 20, 2, 22); x.fillRect(u + 5, v - 20, 2, 22); x.fillRect(u - 7, v - 20, 14, 2); x.fillRect(u - 1.2, v - 22, 2.4, 36); x.fillRect(u - 7, v - 6, 14, 2);
    });
    x.restore();
  }
  function drawPlane(x, px, py, ang, s) {
    x.save(); x.translate(px, py); x.rotate(ang);
    for (var p = 0; p < 2; p++) {
      if (!p) { x.save(); x.translate(2, 3); x.fillStyle = "rgba(0,0,0,.2)"; } else x.fillStyle = "#F1F2F4";
      x.fillRect(-s / 2, -s * 0.045, s, s * 0.09);
      x.beginPath(); x.moveTo(-s * 0.05, 0); x.lineTo(-s * 0.22, -s * 0.46); x.lineTo(-s * 0.12, -s * 0.46); x.lineTo(s * 0.12, 0); x.lineTo(-s * 0.12, s * 0.46); x.lineTo(-s * 0.22, s * 0.46); x.closePath(); x.fill();
      x.fillRect(-s * 0.5, -s * 0.16, s * 0.08, s * 0.32);
      if (!p) x.restore();
    }
    x.fillStyle = "#3F6FA8"; x.fillRect(-s * 0.5, -s * 0.03, s * 0.1, s * 0.06);
    x.restore();
  }

  // ---------- Darstellung: Übersicht + Detailkacheln ----------
  var OVZ = 1.5, DZ = 4, TS = 128;   // Übersicht 1,5 px/m, Detail 4 px/m in 128-m-Kacheln
  var tiles = new Map(), tileQueue = [];
  function renderOverview() {
    if (!CITY) return null;
    var c = document.createElement("canvas"); c.width = Math.round(W * OVZ); c.height = Math.round(H * OVZ);
    var x = c.getContext("2d"); x.setTransform(OVZ, 0, 0, OVZ, 0, 0);
    drawCity(x, CITY, [0, 0, W, H], OVZ);
    return c;
  }
  function tile(ix, iy) {
    var key = iy * 100 + ix, tl = tiles.get(key);
    if (tl) { tiles.delete(key); tiles.set(key, tl); return tl; }
    return null;
  }
  function makeTile(ix, iy) {
    var c = document.createElement("canvas"); c.width = TS * DZ; c.height = TS * DZ;
    var x = c.getContext("2d"); x.setTransform(DZ, 0, 0, DZ, -ix * TS * DZ, -iy * TS * DZ);
    x.beginPath(); x.rect(ix * TS, iy * TS, TS, TS); x.clip();
    drawCity(x, CITY, [ix * TS - 2, iy * TS - 2, (ix + 1) * TS + 2, (iy + 1) * TS + 2], DZ);
    tiles.set(iy * 100 + ix, c);
    while (tiles.size > 90) tiles.delete(tiles.keys().next().value);
    return c;
  }

  // ---------- Oberfläche ----------
  var ICON = {
    view: '<svg viewBox="0 0 24 24"><path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
    g: '<i style="background:' + PCOL.g + '"></i>', b: '<i style="background:' + PCOL.b + '"></i>', r: '<i style="background:' + PCOL.r + '"></i>', p: '<i style="background:' + PCOL.p + '"></i>',
    e: '<svg viewBox="0 0 24 24"><path d="M4 16l8-8 6 6-5 5H8z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 19h12" stroke="currentColor" stroke-width="1.8"/></svg>'
  };
  function html() {
    return '<div class="cg" id="cg"><canvas class="cg-cv" id="cg-cv"></canvas>' +
      '<header class="cg-top"><a class="cg-back" href="#">← ' + t("back") + '</a><b class="cg-title">' + t("title") + '</b><span class="cg-ver">v' + VERSION + '</span>' +
      '<ol class="cg-steps" id="cg-steps"><li data-p="main">1 ' + t("s1") + '</li><li data-p="dist">2 ' + t("s2") + '</li><li data-p="city">3 ' + t("s3") + '</li></ol>' +
      '<span class="cg-grow"></span><button type="button" class="cg-ib" data-cg="zout" aria-label="−">−</button><span class="cg-zoom" id="cg-zoom"></span><button type="button" class="cg-ib" data-cg="zin" aria-label="+">+</button>' +
      '<button type="button" class="cg-btn" data-cg="home">⤢</button><button type="button" class="cg-btn" data-cg="help">?</button></header>' +
      '<aside class="cg-panel" id="cg-panel"></aside>' +
      '<div class="cg-scale" id="cg-scale"></div>' +
      '<div class="cg-modal" id="cg-modal" hidden></div>' +
      '<div class="cg-busy" id="cg-busy" hidden><i></i><b>' + t("genH") + '</b></div>' +
      '<div class="cg-note" id="cg-note" hidden></div></div>';
  }
  function panelHTML() {
    var p = S.phase;
    if (p === "main" || p === "dist") {
      var n = S.roads[p].length;
      return '<h2><i class="cg-dot" style="background:' + (p === "main" ? "#E8743B" : "#2AA198") + '"></i>' + t(p === "main" ? "h1" : "h2") + '</h2><p>' + t(p === "main" ? "p1" : "p2") + '</p>' +
        '<div class="cg-row"><button type="button" class="cg-btn" data-cg="undo"' + (n ? "" : " disabled") + '>' + t("undo") + '</button><button type="button" class="cg-btn" data-cg="clear"' + (n ? "" : " disabled") + '>' + t("clear") + '</button></div>' +
        '<div class="cg-row">' + (p === "dist" ? '<button type="button" class="cg-btn" data-cg="prev">' + t("prev") + '</button>' : "") +
        '<button type="button" class="cg-btn cg-pri" data-cg="next"' + (p === "main" && !n ? " disabled" : "") + '>' + t("next") + '</button></div>' +
        (CITY ? '<button type="button" class="cg-link" data-cg="tocity">' + t("s3") + ' →</button>' : "");
    }
    var dirty = S.paint.length !== S.genPaintN;
    return '<h2>' + t("h3") + '</h2><p>' + t("p3") + '</p>' +
      '<div class="cg-tools">' + ["view", "g", "b", "r", "p", "e"].map(function (k) {
        return '<button type="button" class="cg-tool" data-tool="' + k + '" aria-pressed="' + (S.tool === k) + '">' + ICON[k] + '<span>' + t({ view: "tView", g: "tG", b: "tB", r: "tR", p: "tP", e: "tE" }[k]) + '</span></button>';
      }).join("") + '</div>' +
      '<label class="cg-sl">' + t("size") + ' <b id="cg-sz">' + S.size + ' m</b><input type="range" min="8" max="160" step="2" value="' + S.size + '" data-cg="size"></label>' +
      '<button type="button" class="cg-btn cg-pri cg-wide' + (dirty ? " cg-hot" : "") + '" data-cg="regen">' + t("regen") + '</button>' +
      (dirty ? '<p class="cg-dirty">' + t("dirty") + '</p>' : "") +
      '<div class="cg-lbl">' + t("style") + '</div><div class="cg-seg">' + ["usa", "eu", "jp"].map(function (s) { return '<button type="button" data-style="' + s + '" aria-pressed="' + (S.style === s) + '">' + t(s) + '</button>'; }).join("") + '</div>' +
      '<label class="cg-chk"><input type="checkbox" data-cg="rail"' + (S.rail ? " checked" : "") + '> ' + t("rail") + '</label>' +
      '<label class="cg-chk"><input type="checkbox" data-cg="showPaint"' + (S.showPaint ? " checked" : "") + '> ' + t("showPaint") + '</label>' +
      '<div class="cg-row"><button type="button" class="cg-btn" data-cg="dice">' + t("dice") + '</button><button type="button" class="cg-btn" data-cg="undo"' + (S.paint.length ? "" : " disabled") + '>' + t("undo") + '</button></div>' +
      '<div class="cg-row"><button type="button" class="cg-btn" data-cg="edit">' + t("editRoads") + '</button><button type="button" class="cg-btn" data-cg="exp">' + t("exp") + '</button></div>' +
      (CITY ? '<p class="cg-stat">' + fmt(t("stats"), { r: CITY.km.toLocaleString(lang === "de" ? "de-DE" : "en-GB"), b: CITY.buildings.length.toLocaleString(lang === "de" ? "de-DE" : "en-GB"), t: CITY.trees.length.toLocaleString(lang === "de" ? "de-DE" : "en-GB") }) + '</p>' : "");
  }
  function styleModal() {
    var m = V.root.querySelector("#cg-modal");
    var art = {
      usa: '<svg viewBox="0 0 90 60"><rect width="90" height="60" fill="#D3DDBE"/>' + gridArt(0, 15, 22) + '</svg>',
      eu: '<svg viewBox="0 0 90 60"><rect width="90" height="60" fill="#E4DED2"/><path d="M0 34 Q30 26 90 30M42 0 Q48 30 38 60M0 12 L40 18M60 0 L54 28M10 60 L30 30M64 60 L60 32 M90 48 L44 40M90 12 L50 20" stroke="#777B80" stroke-width="3" fill="none"/><path d="M0 34 Q30 26 90 30M42 0 Q48 30 38 60" stroke="#62666C" stroke-width="5" fill="none"/></svg>',
      jp: '<svg viewBox="0 0 90 60"><rect width="90" height="60" fill="#E2E0DA"/>' + gridArt(0, 7, 9, "#8A8C8F", 1.4) + '<path d="M0 30H90M45 0V60" stroke="#62666C" stroke-width="6"/></svg>'
    };
    m.innerHTML = '<div class="cg-mbox"><h2>' + t("styleH") + '</h2><div class="cg-cards">' + ["usa", "eu", "jp"].map(function (s) {
      return '<button type="button" class="cg-card" data-style="' + s + '" aria-pressed="' + (S.style === s) + '">' + art[s] + '<b>' + t(s) + '</b><span>' + t(s + "D") + '</span></button>';
    }).join("") + '</div><label class="cg-chk"><input type="checkbox" data-cg="rail"' + (S.rail ? " checked" : "") + '> ' + t("rail") + '</label>' +
      '<div class="cg-row"><button type="button" class="cg-btn" data-cg="mclose">' + t("prev") + '</button><button type="button" class="cg-btn cg-pri" data-cg="gen">' + t("gen") + '</button></div></div>';
    m.hidden = false;
  }
  function gridArt(o, sx, sy, col, w) {
    var s = ""; col = col || "#777B80"; w = w || 2.4;
    for (var x = 6; x < 90; x += sx) s += '<path d="M' + x + ' 0V60" stroke="' + col + '" stroke-width="' + w + '"/>';
    for (var y = 6; y < 60; y += sy) s += '<path d="M0 ' + y + 'H90" stroke="' + col + '" stroke-width="' + w + '"/>';
    return s + (o === 0 && sx > 10 ? '<path d="M0 50 L90 14" stroke="#62666C" stroke-width="5"/>' : "");
  }
  function syncUI() {
    if (!V) return;
    V.root.querySelector("#cg-panel").innerHTML = panelHTML();
    Array.prototype.forEach.call(V.root.querySelectorAll("#cg-steps li"), function (li) { li.className = li.getAttribute("data-p") === S.phase ? "on" : ""; });
    setCursor(); need();
  }
  function note(s, ms) {
    var n = V && V.root.querySelector("#cg-note"); if (!n) return;
    n.textContent = s; n.hidden = false; clearTimeout(note.t); note.t = setTimeout(function () { if (n) n.hidden = true; }, ms || 3200);
  }

  // ---------- Ansicht ----------
  function layout() {
    if (!V) return;
    var dpr = Math.min(2, window.devicePixelRatio || 1), w = V.cv.clientWidth, h = V.cv.clientHeight;
    V.dpr = dpr; V.w = w; V.h = h; V.cv.width = Math.round(w * dpr); V.cv.height = Math.round(h * dpr);
    if (!V.fitted) home();
    need();
  }
  function home() {
    var top = 56, pad = 20, left = V.w > 900 ? 300 : 0;
    var z = Math.min((V.w - left - 2 * pad) / W, (V.h - top - 2 * pad) / H);
    V.z = z; V.vx = -(left + pad + (V.w - left - 2 * pad - W * z) / 2) / z; V.vy = -(top + pad + (V.h - top - 2 * pad - H * z) / 2) / z; V.fitted = true; need();
  }
  function zoomAt(f, sx, sy) {
    var wx = V.vx + sx / V.z, wy = V.vy + sy / V.z;
    V.z = Math.max(0.25, Math.min(6, V.z * f)); V.vx = wx - sx / V.z; V.vy = wy - sy / V.z; need();
  }
  function toW(e) { var r = V.cv.getBoundingClientRect(); return { x: V.vx + (e.clientX - r.left) / V.z, y: V.vy + (e.clientY - r.top) / V.z, sx: e.clientX - r.left, sy: e.clientY - r.top }; }
  function need() { if (V) V.need = true; }
  function setCursor() { if (!V) return; V.cv.style.cursor = V.pan ? "grabbing" : (S.phase === "city" && S.tool === "view") || V.space ? "grab" : "crosshair"; }

  function loop() {
    raf = requestAnimationFrame(loop);
    if (!V) return;
    if (V.need) { V.need = false; draw(); }
    else if (tileQueue.length) draw();
  }
  function draw() {
    var x = V.cv.getContext("2d"), dpr = V.dpr, z = V.z;
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    x.fillStyle = "#2A2B2A"; x.fillRect(0, 0, V.w, V.h);
    x.setTransform(dpr * z, 0, 0, dpr * z, -V.vx * z * dpr, -V.vy * z * dpr);
    var vb = [V.vx, V.vy, V.vx + V.w / z, V.vy + V.h / z];
    var cityMode = S.phase === "city" && CITY;
    if (CITY && V.ov) {
      x.save(); if (!cityMode) x.globalAlpha = 0.32;
      x.imageSmoothingEnabled = true; x.imageSmoothingQuality = "high";
      x.drawImage(V.ov, 0, 0, W, H);
      if (cityMode && z * dpr > 2.2) {
        // Detailkacheln: fehlende werden nach und nach gerechnet
        var ix0 = Math.max(0, Math.floor(vb[0] / TS)), ix1 = Math.min(Math.ceil(W / TS) - 1, Math.floor(vb[2] / TS)), iy0 = Math.max(0, Math.floor(vb[1] / TS)), iy1 = Math.min(Math.ceil(H / TS) - 1, Math.floor(vb[3] / TS));
        var t0 = performance.now(), miss = 0;
        for (var iy = iy0; iy <= iy1; iy++) for (var ix = ix0; ix <= ix1; ix++) {
          var tl = tile(ix, iy);
          if (!tl && performance.now() - t0 < 14) tl = makeTile(ix, iy);
          if (tl) x.drawImage(tl, ix * TS, iy * TS, TS, TS); else miss++;
        }
        tileQueue.length = miss; if (miss) V.need = true;
      } else tileQueue.length = 0;
      x.restore();
    } else {
      // Papier mit 100-m-Raster
      x.fillStyle = "#F3F1EC"; x.fillRect(0, 0, W, H);
      x.strokeStyle = "rgba(60,70,80,.08)"; x.lineWidth = 1 / z;
      x.beginPath(); for (var gx = 100; gx < W; gx += 100) { x.moveTo(gx, 0); x.lineTo(gx, H); } for (var gy = 100; gy < H; gy += 100) { x.moveTo(0, gy); x.lineTo(W, gy); } x.stroke();
    }
    x.strokeStyle = "rgba(0,0,0,.35)"; x.lineWidth = 1 / z; x.strokeRect(0, 0, W, H);
    // Skizze
    if (!cityMode) {
      x.lineCap = "round"; x.lineJoin = "round";
      [["dist", "#2AA198", 12], ["main", "#E8743B", 20]].forEach(function (d) {
        S.roads[d[0]].forEach(function (p) { x.beginPath(); p.forEach(function (q, i) { if (i) x.lineTo(q.x, q.y); else x.moveTo(q.x, q.y); }); x.strokeStyle = "rgba(0,0,0,.18)"; x.lineWidth = d[2] + 4; x.stroke(); x.strokeStyle = d[1]; x.lineWidth = d[2]; x.stroke(); });
      });
      if (V.stroke && V.stroke.length > 1) { x.beginPath(); V.stroke.forEach(function (q, i) { if (i) x.lineTo(q.x, q.y); else x.moveTo(q.x, q.y); }); x.strokeStyle = S.phase === "main" ? "#E8743B" : "#2AA198"; x.globalAlpha = 0.75; x.lineWidth = S.phase === "main" ? 20 : 12; x.stroke(); x.globalAlpha = 1; }
      if (V.lazy && V.down) { x.beginPath(); x.moveTo(V.lazy.x, V.lazy.y); x.lineTo(V.mouse.x, V.mouse.y); x.strokeStyle = "rgba(0,0,0,.35)"; x.lineWidth = 1.5 / z; x.stroke(); }
      if (V.snapHint) { x.beginPath(); x.arc(V.snapHint.x, V.snapHint.y, 9 / z + 6, 0, 6.283); x.strokeStyle = "#1E1F1E"; x.lineWidth = 2 / z; x.stroke(); }
    } else {
      // Bemalung als Überlagerung
      var showP = S.showPaint || S.paint.length !== S.genPaintN;
      if (showP && S.paint.length) {
        var oc = V.pc || (V.pc = document.createElement("canvas"));
        if (oc.width !== V.cv.width || oc.height !== V.cv.height) { oc.width = V.cv.width; oc.height = V.cv.height; }
        var ox = oc.getContext("2d");
        ox.setTransform(1, 0, 0, 1, 0, 0); ox.clearRect(0, 0, oc.width, oc.height);
        ox.setTransform(dpr * z, 0, 0, dpr * z, -V.vx * z * dpr, -V.vy * z * dpr);
        var strokes = S.paint.slice(S.genPaintN === S.paint.length || !S.showPaint ? S.genPaintN : 0);
        if (S.showPaint) strokes = S.paint;
        ["g", "b", "r", "p"].forEach(function (k) {
          var lc = V.lc || (V.lc = document.createElement("canvas")); if (lc.width !== oc.width || lc.height !== oc.height) { lc.width = oc.width; lc.height = oc.height; }
          var lx = lc.getContext("2d"); lx.setTransform(1, 0, 0, 1, 0, 0); lx.clearRect(0, 0, lc.width, lc.height); lx.setTransform(dpr * z, 0, 0, dpr * z, -V.vx * z * dpr, -V.vy * z * dpr);
          lx.strokeStyle = PCOL[k]; drawLayer(lx, k, strokes, 0);
          ox.save(); ox.setTransform(1, 0, 0, 1, 0, 0); ox.drawImage(lc, 0, 0); ox.restore();
        });
        x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 0.42; x.drawImage(oc, 0, 0); x.restore();
      }
      if (V.mouse && S.tool !== "view" && !V.pan) { x.beginPath(); x.arc(V.mouse.x, V.mouse.y, S.size / 2, 0, 6.283); x.strokeStyle = S.tool === "e" ? "#1E1F1E" : PCOL[S.tool]; x.lineWidth = 2 / z; x.stroke(); }
      // Beschriftungen
      if (z > 0.35) {
        x.setTransform(dpr, 0, 0, dpr, 0, 0);
        x.font = "600 " + (12 + Math.min(4, z * 2)) + "px 'Instrument Sans',system-ui,sans-serif"; x.textAlign = "center"; x.textBaseline = "middle";
        CITY.labels.forEach(function (lb) {
          var sx = (lb.x - V.vx) * z, sy = (lb.y - V.vy) * z; if (sx < -80 || sy < -20 || sx > V.w + 80 || sy > V.h + 20) return;
          var txt = t(lb.k); x.lineWidth = 4; x.strokeStyle = "rgba(255,255,255,.85)"; x.strokeText(txt, sx, sy); x.fillStyle = "#2A2B2A"; x.fillText(txt, sx, sy);
        });
      }
    }
    // Maßstab und Zoom
    var zEl = V.root.querySelector("#cg-zoom"); if (zEl) zEl.textContent = Math.round(z * 100) + " %";
    var sc = V.root.querySelector("#cg-scale");
    if (sc) { var m = [10, 20, 50, 100, 200, 500, 1000].filter(function (v) { return v * z >= 60; })[0] || 1000; sc.innerHTML = '<i style="width:' + Math.round(m * z) + 'px"></i>' + m + " m"; }
  }

  // ---------- Eingabe ----------
  function onDown(e) {
    if (!V) return;
    V.cv.setPointerCapture && V.cv.setPointerCapture(e.pointerId);
    var p = toW(e); V.mouse = p;
    if (e.button === 1 || e.button === 2 || V.space || (S.phase === "city" && S.tool === "view")) { V.pan = { sx: p.sx, sy: p.sy, vx: V.vx, vy: V.vy }; setCursor(); return; }
    if (e.button !== 0) return;
    V.down = true;
    if (S.phase === "city") { V.paint = { c: S.tool, w: S.size, pts: [{ x: p.x, y: p.y }] }; S.paint.push(V.paint); need(); return; }
    var sn = snapPt(p);
    V.lazy = { x: sn ? sn.x : p.x, y: sn ? sn.y : p.y }; V.stroke = [{ x: V.lazy.x, y: V.lazy.y }]; need();
  }
  function onMove(e) {
    if (!V) return;
    var p = toW(e); V.mouse = p;
    if (V.pan) { V.vx = V.pan.vx - (p.sx - V.pan.sx) / V.z; V.vy = V.pan.vy - (p.sy - V.pan.sy) / V.z; need(); return; }
    if (S.phase !== "city") V.snapHint = !V.down || V.stroke ? snapPt(p) : null;
    if (!V.down) { need(); return; }
    if (V.paint) { var lp = V.paint.pts[V.paint.pts.length - 1]; if (dist(lp, p) > S.size * 0.15) V.paint.pts.push({ x: p.x, y: p.y }); need(); return; }
    // Geglättete Eingabe: Faden hinter der Maus
    var Rl = 22 / V.z, dx = p.x - V.lazy.x, dy = p.y - V.lazy.y, d = Math.hypot(dx, dy);
    if (d > Rl) { V.lazy.x += dx * (d - Rl) / d; V.lazy.y += dy * (d - Rl) / d; var lq = V.stroke[V.stroke.length - 1]; if (dist(lq, V.lazy) > 2 / V.z) V.stroke.push({ x: V.lazy.x, y: V.lazy.y }); }
    need();
  }
  function onUp(e) {
    if (!V) return;
    if (V.pan) { V.pan = null; setCursor(); return; }
    if (!V.down) return;
    V.down = false;
    if (V.paint) { V.paint = null; syncUI(); return; }
    var pts = V.stroke, lz = V.lazy; V.stroke = null; V.lazy = null;
    if (!pts || pts.length < 2) { need(); return; }
    var endP = toW(e), sn = snapPt(endP); if (sn) pts.push({ x: sn.x, y: sn.y }); else if (lz) pts.push({ x: lz.x, y: lz.y });
    var simp = chaikin(rdp(pts, 2.2 / V.z), 2);
    if (sn) simp[simp.length - 1] = { x: sn.x, y: sn.y };
    var s0 = snapPt(simp[0]); if (s0) simp[0] = { x: s0.x, y: s0.y };
    var len = cumLen(simp); if (len[len.length - 1] < 30) { need(); return; }
    simp = simp.map(function (q) { return { x: Math.max(0, Math.min(W, q.x)), y: Math.max(0, Math.min(H, q.y)) }; });
    S.roads[S.phase].push(simp); syncUI();
  }
  function snapPt(p) {
    var best = null, lim = 18 / V.z;
    ["main", "dist"].forEach(function (k) {
      S.roads[k].forEach(function (pts) {
        var np = nearestOnPolyline(pts, cumLen(pts), p);
        if (np.d < lim && (!best || np.d < best.d)) best = np;
      });
    });
    return best;
  }
  function onWheel(e) {
    e.preventDefault(); var p = toW(e);
    zoomAt(Math.pow(1.0015, -e.deltaY * (e.deltaMode === 1 ? 30 : 1)), p.sx, p.sy);
  }
  function onKey(e) {
    if (!V) return;
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName) && e.target.type !== "range" && e.target.type !== "checkbox") return;
    if (e.code === "Space") { if (!V.space) { V.space = true; setCursor(); } e.preventDefault(); return; }
    if ((e.key === "z" || e.key === "Z") && !e.altKey) { e.preventDefault(); undo(); return; }
    if (e.key === "Escape") { var m = V.root.querySelector("#cg-modal"); if (!m.hidden) m.hidden = true; }
  }
  function onKeyUp(e) { if (V && e.code === "Space") { V.space = false; setCursor(); } }
  function undo() {
    if (S.phase === "city") { if (S.paint.length) { S.paint.pop(); if (S.genPaintN > S.paint.length) S.genPaintN = -2; syncUI(); } return; }
    if (S.roads[S.phase].length) { S.roads[S.phase].pop(); syncUI(); }
  }
  function runGenerate() {
    var busy = V.root.querySelector("#cg-busy"); busy.hidden = false;
    setTimeout(function () {
      var t0 = performance.now();
      try {
        S.paintGen = S.paint.slice();
        CITY = generate(); tiles.clear();
        if (!CITY) { note(t("needMain")); S.phase = "main"; }
        else { V.ov = renderOverview(); S.phase = "city"; S.genPaintN = S.paint.length; S.showPaint = false; }
      } catch (err) { if (window.console) console.error(err); }
      if (V) { busy.hidden = true; syncUI(); }
      if (window.console && CITY) console.log("CityGenerator: " + CITY.ms + " ms Generierung, " + Math.round(performance.now() - t0) + " ms gesamt");
    }, 40);
  }
  function exportPNG() {
    if (!CITY || !V.ov) return;
    var c = document.createElement("canvas"); c.width = V.ov.width; c.height = V.ov.height;
    var x = c.getContext("2d"); x.drawImage(V.ov, 0, 0);
    x.font = "600 18px 'Instrument Sans',system-ui,sans-serif"; x.textAlign = "center"; x.textBaseline = "middle";
    CITY.labels.forEach(function (lb) { var txt = t(lb.k); x.lineWidth = 5; x.strokeStyle = "rgba(255,255,255,.85)"; x.strokeText(txt, lb.x * OVZ, lb.y * OVZ); x.fillStyle = "#2A2B2A"; x.fillText(txt, lb.x * OVZ, lb.y * OVZ); });
    var name = "citygenerator-" + S.style + "-" + S.seed + ".png";
    c.toBlob(function (b) { var a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500); note(fmt(t("saved"), { f: name })); }, "image/png");
  }
  function onClick(e) {
    var b = e.target.closest("[data-cg],[data-tool],[data-style],[data-p]"); if (!b || !V) return;
    if (b.hasAttribute("data-tool")) { S.tool = b.getAttribute("data-tool"); syncUI(); return; }
    if (b.hasAttribute("data-style")) {
      S.style = b.getAttribute("data-style");
      Array.prototype.forEach.call(V.root.querySelectorAll("[data-style]"), function (q) { q.setAttribute("aria-pressed", String(q.getAttribute("data-style") === S.style)); });
      if (S.phase === "city" && b.closest("#cg-panel")) runGenerate();
      return;
    }
    if (b.hasAttribute("data-p")) { var ph = b.getAttribute("data-p"); if (ph === "city" && !CITY) return; S.phase = ph; syncUI(); return; }
    var a = b.getAttribute("data-cg");
    if (a === "zin") zoomAt(1.4, V.w / 2, V.h / 2);
    else if (a === "zout") zoomAt(1 / 1.4, V.w / 2, V.h / 2);
    else if (a === "home") home();
    else if (a === "help") note(t("help"), 7000);
    else if (a === "undo") undo();
    else if (a === "clear") { S.roads[S.phase] = []; syncUI(); }
    else if (a === "next") { if (S.phase === "main") { S.phase = "dist"; syncUI(); } else styleModal(); }
    else if (a === "prev") { S.phase = "main"; syncUI(); }
    else if (a === "tocity") { S.phase = "city"; syncUI(); }
    else if (a === "mclose") V.root.querySelector("#cg-modal").hidden = true;
    else if (a === "gen") { V.root.querySelector("#cg-modal").hidden = true; runGenerate(); }
    else if (a === "regen") runGenerate();
    else if (a === "dice") { S.seed = Math.floor(Math.random() * 1e6); runGenerate(); }
    else if (a === "edit") { S.phase = "main"; syncUI(); }
    else if (a === "exp") exportPNG();
  }
  function onInput(e) {
    var a = e.target.getAttribute && e.target.getAttribute("data-cg");
    if (a === "size") { S.size = +e.target.value; var s = V.root.querySelector("#cg-sz"); if (s) s.textContent = S.size + " m"; need(); }
    else if (a === "rail") { S.rail = e.target.checked; Array.prototype.forEach.call(V.root.querySelectorAll('[data-cg="rail"]'), function (q) { q.checked = S.rail; }); }
    else if (a === "showPaint") { S.showPaint = e.target.checked; need(); }
  }

  var CSS = ".cg{position:fixed;inset:0;z-index:75;background:#2A2B2A;overflow:hidden;font-family:var(--f-body);color:#E9EAE6;-webkit-user-select:none;user-select:none}" +
    ".cg *{font-style:normal}.cg [hidden]{display:none!important}" +
    ".cg-cv{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none}" +
    ".cg-top{position:absolute;left:0;right:0;top:0;display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:8px max(12px,env(safe-area-inset-right,0px)) 8px max(12px,env(safe-area-inset-left,0px));background:rgba(36,37,36,.92);border-bottom:1px solid #434543}" +
    ".cg-back{color:#A4A7A2;text-decoration:none;font-weight:600;font-size:.9rem;padding:4px 6px}.cg-back:hover{color:#E9EAE6}" +
    ".cg-title{font:600 1.1rem var(--f-display)}.cg-ver{font:600 .72rem var(--f-body);color:#A4A7A2;border:1px solid #434543;padding:1px 7px}" +
    ".cg-steps{display:flex;gap:4px;margin:0 0 0 12px;padding:0;list-style:none;font-size:.82rem;color:#A4A7A2}.cg-steps li{padding:4px 10px;border:1px solid #434543;cursor:pointer}.cg-steps li.on{color:#1E1F1E;background:#E8A04A;border-color:#E8A04A;font-weight:600}" +
    ".cg-grow{flex:1}.cg-zoom{min-width:52px;text-align:center;font-size:.82rem;color:#A4A7A2;font-variant-numeric:tabular-nums}" +
    ".cg-ib,.cg-btn{font:600 .85rem var(--f-body);color:#E9EAE6;background:#323332;border:1px solid #434543;padding:6px 11px;cursor:pointer;min-height:32px}" +
    ".cg-ib:hover,.cg-btn:hover{border-color:#A4A7A2}.cg-btn[disabled]{opacity:.4;cursor:default}" +
    ".cg-pri{background:#E8A04A;color:#1E1F1E;border-color:#E8A04A}.cg-pri:hover{background:#F0B060;border-color:#F0B060}" +
    ".cg-hot{box-shadow:0 0 0 3px rgba(232,160,74,.35);animation:cghot 1.4s ease-in-out infinite}@keyframes cghot{50%{box-shadow:0 0 0 6px rgba(232,160,74,.12)}}" +
    ".cg-panel{position:absolute;left:max(12px,env(safe-area-inset-left,0px));top:62px;width:270px;max-height:calc(100% - 130px);overflow:auto;padding:16px;background:rgba(36,37,36,.94);border:1px solid #434543;box-shadow:8px 8px 0 rgba(0,0,0,.25);display:flex;flex-direction:column;gap:10px}" +
    ".cg-panel h2{margin:0;font:600 1.15rem/1.2 var(--f-display);display:flex;align-items:center;gap:8px}.cg-panel p{margin:0;font-size:.86rem;line-height:1.45;color:#A4A7A2}" +
    ".cg-dot{width:14px;height:14px;display:inline-block}.cg-row{display:flex;gap:6px;flex-wrap:wrap}.cg-row .cg-btn{flex:1}.cg-wide{width:100%;min-height:40px;font-size:.95rem}" +
    ".cg-link{background:none;border:0;color:#E8A04A;font:600 .85rem var(--f-body);cursor:pointer;text-align:left;padding:0}" +
    ".cg-tools{display:grid;grid-template-columns:1fr;gap:4px}.cg-tool{display:flex;align-items:center;gap:10px;font:500 .86rem var(--f-body);color:#E9EAE6;background:#2E2F2E;border:1px solid #434543;padding:6px 8px;cursor:pointer;text-align:left}" +
    ".cg-tool svg{width:20px;height:20px}.cg-tool i{width:20px;height:20px;display:block}.cg-tool[aria-pressed=true]{border-color:#E8A04A;background:#3A3B3A}" +
    ".cg-sl{display:flex;flex-direction:column;gap:4px;font-size:.82rem;color:#A4A7A2}.cg-sl b{color:#E9EAE6;font-variant-numeric:tabular-nums}.cg-sl input{width:100%;accent-color:#E8A04A}" +
    ".cg-lbl{font-size:.75rem;letter-spacing:.06em;text-transform:uppercase;color:#A4A7A2}.cg-seg{display:flex}.cg-seg button{flex:1;font:600 .82rem var(--f-body);color:#E9EAE6;background:#2E2F2E;border:1px solid #434543;padding:6px 4px;cursor:pointer}.cg-seg button+button{border-left:0}.cg-seg button[aria-pressed=true]{background:#E9EAE6;color:#1E1F1E}" +
    ".cg-chk{display:flex;align-items:center;gap:8px;font-size:.84rem;color:#C9CBC6;cursor:pointer}.cg-chk input{accent-color:#E8A04A}" +
    ".cg-dirty{color:#E8A04A!important;font-weight:600}.cg-stat{font-size:.78rem!important;font-variant-numeric:tabular-nums}" +
    ".cg-scale{position:absolute;left:max(300px,calc(12px + 290px));bottom:14px;display:flex;align-items:center;gap:8px;font-size:.78rem;color:#E9EAE6;background:rgba(36,37,36,.85);padding:4px 8px;border:1px solid #434543}.cg-scale i{display:block;height:6px;border:2px solid #E9EAE6;border-top:0}" +
    ".cg-modal{position:absolute;inset:0;z-index:5;display:grid;place-items:center;background:rgba(14,15,14,.55);padding:16px}" +
    ".cg-mbox{width:100%;max-width:720px;background:#2E2F2E;border:1px solid #434543;border-top:4px solid #E8A04A;box-shadow:10px 10px 0 rgba(0,0,0,.3);padding:22px;display:flex;flex-direction:column;gap:14px}" +
    ".cg-mbox h2{margin:0;font:600 1.4rem var(--f-display)}.cg-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}" +
    ".cg-card{display:flex;flex-direction:column;gap:6px;text-align:left;font:inherit;color:#E9EAE6;background:#323332;border:2px solid #434543;padding:10px;cursor:pointer}.cg-card svg{width:100%;height:auto;display:block}" +
    ".cg-card b{font:600 1.05rem var(--f-display)}.cg-card span{font-size:.8rem;line-height:1.4;color:#A4A7A2}.cg-card[aria-pressed=true]{border-color:#E8A04A;background:#3A3B3A}" +
    ".cg-busy{position:absolute;inset:0;z-index:6;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:rgba(14,15,14,.5)}.cg-busy b{font:600 1.2rem var(--f-display)}" +
    ".cg-busy i{width:36px;height:36px;border:3px solid rgba(233,234,230,.25);border-top-color:#E8A04A;animation:cgspin .9s linear infinite}@keyframes cgspin{to{transform:rotate(360deg)}}" +
    ".cg-note{position:absolute;left:50%;top:64px;transform:translateX(-50%);max-width:min(560px,calc(100% - 32px));background:rgba(36,37,36,.95);border:1px solid #434543;padding:10px 14px;font-size:.88rem;line-height:1.45}" +
    "@media (max-width:760px){.cg-panel{top:auto;bottom:58px;left:10px;right:10px;width:auto;max-height:44%}.cg-steps,.cg-zoom,.cg-ver{display:none}.cg-top{gap:4px}.cg-scale{left:auto;right:12px;bottom:auto;top:58px}.cg-cards{grid-template-columns:1fr}.cg-mbox{max-height:calc(100% - 20px);overflow:auto}}";

  function mount(el, l) {
    unmount();
    lang = l === "en" ? "en" : "de";
    var o = document.getElementById("cg-css"); if (o) o.remove();
    var s = document.createElement("style"); s.id = "cg-css"; s.textContent = CSS; document.head.appendChild(s);
    el.innerHTML = html();
    V = { root: el, cv: el.querySelector("#cg-cv"), ov: null, ovOld: document.body.style.overflow, need: true };
    document.body.style.overflow = "hidden";
    if (CITY) V.ov = renderOverview();
    layout(); syncUI();
    V.cv.addEventListener("pointerdown", onDown); window.addEventListener("pointermove", onMove); window.addEventListener("pointerup", onUp); window.addEventListener("pointercancel", onUp);
    V.cv.addEventListener("wheel", onWheel, { passive: false }); V.cv.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    V.cv.addEventListener("pointerleave", function () { if (V && !V.down) { V.mouse = null; need(); } });
    el.addEventListener("click", onClick); el.addEventListener("input", onInput); el.addEventListener("change", onInput);
    window.addEventListener("keydown", onKey); window.addEventListener("keyup", onKeyUp); window.addEventListener("resize", layout);
    raf = requestAnimationFrame(loop);
  }
  function unmount() {
    if (raf) cancelAnimationFrame(raf); raf = 0;
    if (!V) return;
    window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); window.removeEventListener("pointercancel", onUp);
    window.removeEventListener("keydown", onKey); window.removeEventListener("keyup", onKeyUp); window.removeEventListener("resize", layout);
    document.body.style.overflow = V.ovOld || "";
    tiles.clear(); V = null;
  }
  window.CityGen = { mount: mount, unmount: unmount, _debug: function () { return { S: S, CITY: CITY, V: V, run: runGenerate, gen: generate }; } };
})();
