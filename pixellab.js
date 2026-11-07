/* PIXELLAB 0.2 – Fotos im Browser verfremden, mit einer Kette aus Werkzeugen. Für Soy and Soul.
   Einbindung: pixellab.js per script-Tag laden, dann Pixellab.mount(element, "de" | "en")
   und Pixellab.unmount() beim Verlassen der Seite. Fotos verlassen nie das Gerät. */
(function () {
  "use strict";

  var VERSION = "0.2";
  var PREVIEW = 1000;   // längste Seite der Vorschau in Pixeln
  var lang = "de";

  function L2(de, en) { return { de: de, en: en }; }
  var TX = {
    title: L2("PIXELLAB", "PIXELLAB"),
    intro: L2("Lade ein Foto, verfremde es mit einer Kette von Werkzeugen und speichere das Ergebnis. Alles passiert in deinem Browser, das Foto verlässt dein Gerät nicht.",
              "Load a photo, transform it with a chain of tools and save the result. Everything happens in your browser, and the photo never leaves your device."),
    drop: L2("Foto hierher ziehen", "Drop a photo here"), or: L2("oder", "or"), pick: L2("Foto auswählen", "Choose photo"),
    dropNote: L2("JPEG, PNG oder WebP · bleibt auf deinem Gerät", "JPEG, PNG or WebP · stays on your device"),
    other: L2("Anderes Foto", "Other photo"), original: L2("Original zeigen", "Show original"),
    chain: L2("Werkzeugkette", "Tool chain"),
    chainNote: L2("Die Werkzeuge wirken von oben nach unten. Jedes bearbeitet das Ergebnis des vorherigen, die Reihenfolge verändert also das Bild.",
                  "Tools run from top to bottom. Each one works on the result of the one before, so the order changes the image."),
    start: L2("Foto", "Photo"), result: L2("Ergebnis", "Result"),
    empty: L2("Noch keine Werkzeuge. Füge unten eins hinzu.", "No tools yet. Add one below."),
    add: L2("Werkzeug hinzufügen", "Add tool"),
    up: L2("Nach oben", "Move up"), down: L2("Nach unten", "Move down"), remove: L2("Entfernen", "Remove"),
    fold: L2("Ein- oder ausklappen", "Expand or collapse"), onoff: L2("An oder aus", "On or off"),
    allOpen: L2("Alle aufklappen", "Expand all"), allClosed: L2("Alle einklappen", "Collapse all"),
    source: L2("Ausschnitt", "Section"), sourceHint: L2("Rahmen verschieben. Das Vorschaubild zeigt, was bei diesem Werkzeug ankommt.", "Drag the frame. The thumbnail shows what reaches this tool."),
    exportH: L2("Export", "Export"), quality: L2("Qualität", "Quality"),
    qNote: L2("{w} × {h} Pixel · {mp} Megapixel · {p} % der Pixel des Originals", "{w} × {h} pixels · {mp} megapixels · {p}% of the original's pixels"),
    save: L2("Als JPEG speichern", "Save as JPEG"), working: L2("Wird berechnet … {p} %", "Rendering … {p}%"), saved: L2("Gespeichert.", "Saved."),
    tooBig: L2("Das Bild ist zu groß für diesen Browser. Bitte eine niedrigere Qualität wählen.", "The image is too large for this browser. Please pick a lower quality."),
    bad: L2("Diese Datei konnte nicht als Bild geöffnet werden.", "This file could not be opened as an image."),
    howH: L2("So funktioniert’s", "How it works"),
    how1: L2("Füge Werkzeuge zur Kette hinzu. Mit den Pfeilen änderst du die Reihenfolge, mit dem Auge schaltest du ein Werkzeug aus, ohne seine Einstellungen zu verlieren, und mit dem Pfeil rechts klappst du die Regler ein. Dasselbe Werkzeug darf mehrfach vorkommen.",
             "Add tools to the chain. Use the arrows to change the order, the eye to switch a tool off without losing its settings, and the chevron on the right to fold away the sliders. The same tool can appear more than once."),
    how2: L2("Fragments zerlegt das ganze Bild in Voronoi-Zellen, die alle einen gedrehten und gespiegelten Ausschnitt zeigen. Polymerge baut eine solche Collage nur in einer Form: als Mandala im Kreis, als Dreieck, als wachsende Wurzeln oder als zufälligen Fleck. Punch macht jede Form wilder.",
             "Fragments splits the whole image into Voronoi cells, each showing a rotated and mirrored section. Polymerge builds such a collage only inside a shape: a circular mandala, a triangle, growing roots or a random blot. Punch makes every shape wilder."),
    how3: L2("Beim Export bestimmt die Qualität den Anteil der Pixel: 100 % ist die volle Auflösung des Originals, 50 % hat halb so viele Pixel, 1 % ein Hundertstel.",
             "On export, quality sets the share of pixels: 100% is the original's full resolution, 50% has half as many pixels, 1% a hundredth.")
  };
  function t(k) { return TX[k][lang]; }
  function fmt(s, o) { return s.replace(/\{(\w+)\}/g, function (_, k) { return o[k]; }); }
  function nf(n, d) { return n.toLocaleString(lang === "de" ? "de-DE" : "en-GB", { maximumFractionDigits: d || 0 }); }

  // ---------- Hilfsfunktionen ----------
  function hash(x, y, s) {
    var n = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177); n ^= n >>> 16;
    return (n >>> 0) / 4294967296;
  }
  function rng(seed) { var a = (seed * 2654435761) >>> 0; return function () { a = (a + 0x6D2B79F5) | 0; var t2 = Math.imul(a ^ (a >>> 15), 1 | a); t2 = (t2 + Math.imul(t2 ^ (t2 >>> 7), 61 | t2)) ^ t2; return ((t2 ^ (t2 >>> 14)) >>> 0) / 4294967296; }; }
  function vnoise(x, y, s) {
    var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    var a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, y, s, oct) { var tt = 0, amp = 0.5, fr = 1, norm = 0; for (var i = 0; i < oct; i++) { tt += amp * vnoise(x * fr, y * fr, s + i * 17); norm += amp; fr *= 2; amp *= 0.5; } return tt / norm; }
  function reflect(v, n) { var p = 2 * n; v = ((v % p) + p) % p; return v < n ? v : p - 1 - v; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  // ---------- Werkzeug: Fragments ----------
  var FRAG = {
    name: L2("Fragments", "Fragments"),
    desc: L2("Streut einen Ausschnitt wie ein Kaleidoskop über ein Voronoi-Muster im ganzen Bild.", "Scatters a section like a kaleidoscope across a Voronoi pattern over the whole image."),
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M3 4 L10 3 L12 9 L6 12 Z"/><path d="M10 3 L20 4 L18 10 L12 9 Z"/><path d="M6 12 L12 9 L18 10 L16 17 L9 18 Z"/><path d="M3 4 L6 12 L9 18 L4 21 Z"/><path d="M18 10 L21 13 L20 20 L16 17 Z"/></svg>',
    defaults: { size: 12, seed: 7, order: 70, src: 30, rot: 100, scatter: 25, seam: 1, mirror: true, cx: 0.5, cy: 0.5 },
    controls: [
      { k: "thumb" }, { k: "src", l: L2("Größe des Ausschnitts", "Section size"), min: 5, max: 100, u: " %" },
      { k: "size", l: L2("Größe der Textur", "Texture size"), min: 2, max: 40, u: " %" },
      { k: "seed", l: L2("Anordnung", "Arrangement"), min: 0, max: 100, u: "" },
      { k: "order", l: L2("Unordnung", "Disorder"), min: 0, max: 100, u: " %" },
      { k: "rot", l: L2("Drehung", "Rotation"), min: 0, max: 100, u: " %" },
      { k: "scatter", l: L2("Streuung", "Scatter"), min: 0, max: 100, u: " %" },
      { k: "seam", l: L2("Fugen", "Seams"), min: 0, max: 20, u: "" },
      { k: "mirror", type: "check", l: L2("Spiegeln wie im Kaleidoskop", "Mirror like a kaleidoscope") }
    ],
    prep: function (W0, H0, P) {
      var Sz = Math.max(W0, H0) * P.size / 100, gw = Math.ceil(W0 / Sz) + 2, gh = Math.ceil(H0 / Sz) + 2;
      var J = P.order / 100, rot = P.rot / 100, srcPx = Math.min(W0, H0) * P.src / 100, sc = P.scatter / 100, cells = new Array(gw * gh);
      for (var gy = 0; gy < gh; gy++) for (var gx = 0; gx < gw; gx++) {
        var X = gx - 1, Y = gy - 1, s = P.seed * 16, a = (hash(X, Y, s + 3) * 2 - 1) * Math.PI * rot;
        cells[gy * gw + gx] = { x: (X + 0.5 + (hash(X, Y, s) - 0.5) * J) * Sz, y: (Y + 0.5 + (hash(X, Y, s + 1) - 0.5) * J) * Sz,
          c: Math.cos(a), s: Math.sin(a), m: P.mirror && hash(X, Y, s + 4) < 0.5 ? -1 : 1,
          ox: (hash(X, Y, s + 5) - 0.5) * sc * srcPx * 1.5, oy: (hash(X, Y, s + 6) - 0.5) * sc * srcPx * 1.5 };
      }
      return { cells: cells, gw: gw, gh: gh, Sz: Sz, k: srcPx / Sz, seam: P.seam * Math.max(W0, H0) / 1000 };
    },
    rows: function (out, src, w, h, f, W0, H0, P, G, y0, y1) {
      var d = out.data, sd = src.data, Sz = G.Sz, gw = G.gw, gh = G.gh, cells = G.cells, k = G.k, cx = P.cx * W0, cy = P.cy * H0, seam = G.seam;
      for (var oy = y0; oy < y1; oy++) {
        var Y = (oy + 0.5) / f, gyc = Math.floor(Y / Sz) + 1;
        for (var ox = 0; ox < w; ox++) {
          var X = (ox + 0.5) / f, gxc = Math.floor(X / Sz) + 1, d1 = 1e30, d2 = 1e30, best = null;
          for (var j = -1; j <= 1; j++) {
            var gy = gyc + j; if (gy < 0 || gy >= gh) continue;
            for (var i = -1; i <= 1; i++) {
              var gx = gxc + i; if (gx < 0 || gx >= gw) continue;
              var c = cells[gy * gw + gx], dx = X - c.x, dy = Y - c.y, dd = dx * dx + dy * dy;
              if (dd < d1) { d2 = d1; d1 = dd; best = c; } else if (dd < d2) d2 = dd;
            }
          }
          var lx = X - best.x, ly = Y - best.y, u = (lx * best.c - ly * best.s) * best.m, v = lx * best.s + ly * best.c;
          var sx = reflect(Math.floor((cx + best.ox + u * k) * f), w), sy = reflect(Math.floor((cy + best.oy + v * k) * f), h);
          var si = (sy * w + sx) * 4, o = (oy * w + ox) * 4, r = sd[si], g = sd[si + 1], b = sd[si + 2];
          if (seam > 0) { var e = Math.sqrt(d2) - Math.sqrt(d1); if (e < seam) { var a = 1 - e / seam; a = a * a * 0.85; r *= 1 - a; g *= 1 - a; b *= 1 - a; } }
          d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = 255;
        }
      }
    }
  };

  // ---------- Werkzeug: Polymerge ----------
  function sdTri(px, py, r) { // gleichseitiges Dreieck, Spitze oben (iq)
    var k = Math.sqrt(3); py = -py;
    px = Math.abs(px) - r; py = py + r / k;
    if (px + k * py > 0) { var tx = (px - k * py) / 2, ty = (-k * px - py) / 2; px = tx; py = ty; }
    px -= clamp(px, -2 * r, 0);
    return -Math.hypot(px, py) * (py < 0 ? -1 : 1);
  }
  function genRoots(C, Rs, seed, punch) {
    var R = rng(seed * 7 + 3), segs = [], maxD = 5 + Math.round(punch * 2), cap = 2200;
    function grow(x, y, a, len, th, dep) {
      if (dep > maxD || len < Rs * 0.025 || segs.length > cap) return;
      var steps = 3;
      for (var s = 0; s < steps; s++) {
        a += (R() - 0.5) * (0.45 + punch * 1.4);
        var nx = x + Math.cos(a) * len / steps, ny = y + Math.sin(a) * len / steps;
        segs.push({ x1: x, y1: y, x2: nx, y2: ny, t: th, a: a });
        x = nx; y = ny; th *= 0.92;
      }
      var nb = R() < 0.35 + punch * 0.35 ? 3 : 2;
      for (var b = 0; b < nb; b++) grow(x, y, a + (R() - 0.5) * (1.1 + punch * 0.9), len * (0.6 + R() * 0.22), th * 0.72, dep + 1);
    }
    var roots = 2 + Math.round(punch * 3);
    for (var i = 0; i < roots; i++) grow(C.x + (R() - 0.5) * Rs * 0.3, C.y - Rs * 0.95, Math.PI / 2 + (R() - 0.5) * 1.3, Rs * 0.74, Rs * (0.11 + punch * 0.05), 0);
    // Raster zum schnellen Nachschlagen
    var g = Math.max(4, Rs * 0.12), grid = {};
    segs.forEach(function (s) {
      var pad = s.t + g * 0.05;
      var x0 = Math.floor((Math.min(s.x1, s.x2) - pad) / g), x1 = Math.floor((Math.max(s.x1, s.x2) + pad) / g);
      var y0 = Math.floor((Math.min(s.y1, s.y2) - pad) / g), y1 = Math.floor((Math.max(s.y1, s.y2) + pad) / g);
      for (var gy = y0; gy <= y1; gy++) for (var gx = x0; gx <= x1; gx++) { var key = gx + "," + gy; (grid[key] || (grid[key] = [])).push(s); }
    });
    return { grid: grid, g: g };
  }
  var POLY = {
    name: L2("Polymerge", "Polymerge"),
    desc: L2("Formt aus einem Ausschnitt eine Collage in einer Gestalt: Kreis-Mandala, Dreieck, Wurzeln oder zufälliger Fleck.", "Shapes a collage from a section into a form: circular mandala, triangle, roots or a random blot."),
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 3.5 L12 20.5 M4.6 7.8 L19.4 16.2 M4.6 16.2 L19.4 7.8"/><circle cx="12" cy="12" r="3"/></svg>',
    defaults: { mode: "circle", shape: 70, cell: 14, seed: 11, punch: 25, src: 25, cx: 0.5, cy: 0.5 },
    controls: [
      { k: "mode", type: "seg", l: L2("Form", "Shape"), opts: [["circle", "Circular"], ["tri", "Triangle"], ["roots", "Roots"], ["noise", "Noisy"]] },
      { k: "punch", l: L2("Punch", "Punch"), min: 0, max: 100, u: " %" },
      { k: "shape", l: L2("Größe der Form", "Shape size"), min: 10, max: 100, u: " %" },
      { k: "cell", l: L2("Größe der Teile", "Piece size"), min: 3, max: 40, u: " %" },
      { k: "seed", l: L2("Anordnung", "Arrangement"), min: 0, max: 100, u: "" },
      { k: "thumb" }, { k: "src", l: L2("Größe des Ausschnitts", "Section size"), min: 5, max: 100, u: " %" }
    ],
    prep: function (W0, H0, P) {
      var p = P.punch / 100, Rs = Math.min(W0, H0) / 2 * P.shape / 100, C = { x: W0 / 2, y: H0 / 2 };
      var G = { p: p, Rs: Rs, C: C, cs: Rs * P.cell / 100 * 1.4, srcPx: Math.min(W0, H0) * P.src / 100, seed: P.seed * 31 + 5,
        n: Math.round(6 + p * 10), band: Rs * 0.035, seam: Math.max(W0, H0) / 1400 };
      if (P.mode === "roots") G.roots = genRoots(C, Rs, P.seed + 1, p);
      return G;
    },
    rows: function (out, src, w, h, f, W0, H0, P, G, y0, y1) {
      var d = out.data, sd = src.data, mode = P.mode, p = G.p, Rs = G.Rs, C = G.C, cs = G.cs, seed = G.seed, aa = 1.2 / f;
      var cx = P.cx * W0, cy = P.cy * H0, k = G.srcPx / cs, sec = 2 * Math.PI / (mode === "tri" ? 3 : G.n), band = G.band, seamW = G.seam;
      for (var oy = y0; oy < y1; oy++) {
        var Y = (oy + 0.5) / f;
        for (var ox = 0; ox < w; ox++) {
          var o = (oy * w + ox) * 4, X = (ox + 0.5) / f, dx = X - C.x, dy = Y - C.y, sdv, qx = dx, qy = dy, extra = 0;
          if (mode === "circle" || mode === "tri") {
            var r = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
            var wob = p * (fbm(Math.cos(ang) * 1.6 + 5, Math.sin(ang) * 1.6 + 5, seed, 3) - 0.5) * Rs * 0.7;
            sdv = mode === "circle" ? r - Rs - wob : sdTri(dx, dy, Rs * 0.86) - wob * 0.6;
            if (sdv > aa) { d[o] = sd[o]; d[o + 1] = sd[o + 1]; d[o + 2] = sd[o + 2]; d[o + 3] = 255; continue; }
            var a2 = ang + p * 2.2 * r / Rs;                         // Wirbel mit Punch
            a2 = ((a2 % sec) + sec) % sec; a2 = Math.abs(a2 - sec / 2); // Kaleidoskop-Faltung
            qx = r * Math.cos(a2); qy = r * Math.sin(a2);
          } else if (mode === "roots") {
            var list = G.roots.grid[Math.floor(X / G.roots.g) + "," + Math.floor(Y / G.roots.g)];
            sdv = 1e9;
            if (list) for (var li = 0; li < list.length; li++) {
              var s = list[li], ex = s.x2 - s.x1, ey = s.y2 - s.y1, l2 = ex * ex + ey * ey || 1;
              var tt = clamp(((X - s.x1) * ex + (Y - s.y1) * ey) / l2, 0, 1), ddd = Math.hypot(X - s.x1 - ex * tt, Y - s.y1 - ey * tt) - s.t;
              if (ddd < sdv) { sdv = ddd; extra = s.a; }
            }
            if (sdv > aa) { d[o] = sd[o]; d[o + 1] = sd[o + 1]; d[o + 2] = sd[o + 2]; d[o + 3] = 255; continue; }
          } else { // noise
            var wx = X + p * Rs * 0.6 * (fbm(X / Rs * 2, Y / Rs * 2, seed + 9, 3) - 0.5), wy = Y + p * Rs * 0.6 * (fbm(X / Rs * 2 + 7, Y / Rs * 2, seed + 13, 3) - 0.5);
            var nv = fbm(wx / Rs * (1.4 + p * 1.6), wy / Rs * (1.4 + p * 1.6), seed, 4) - Math.hypot(wx - C.x, wy - C.y) / Rs * 0.5;
            sdv = (0.16 - nv) * Rs * 0.6;
            if (sdv > aa) { d[o] = sd[o]; d[o + 1] = sd[o + 1]; d[o + 2] = sd[o + 2]; d[o + 3] = 255; continue; }
          }
          // Collage-Zelle (Worley) in den gefalteten Koordinaten
          var gxc = Math.floor(qx / cs), gyc = Math.floor(qy / cs), d1 = 1e30, d2 = 1e30, bx = 0, by = 0, bi = 0, bj = 0;
          for (var j = -1; j <= 1; j++) for (var i = -1; i <= 1; i++) {
            var gx = gxc + i, gy = gyc + j;
            var sx0 = (gx + 0.5 + (hash(gx, gy, seed) - 0.5) * 0.85) * cs, sy0 = (gy + 0.5 + (hash(gx, gy, seed + 1) - 0.5) * 0.85) * cs;
            var ddx = qx - sx0, ddy = qy - sy0, dd = ddx * ddx + ddy * ddy;
            if (dd < d1) { d2 = d1; d1 = dd; bx = sx0; by = sy0; bi = gx; bj = gy; } else if (dd < d2) d2 = dd;
          }
          var an = (hash(bi, bj, seed + 3) * 2 - 1) * Math.PI * (0.4 + p * 0.6) + extra, cA = Math.cos(an), sA = Math.sin(an);
          var mir = hash(bi, bj, seed + 4) < 0.5 ? -1 : 1, scl = 1 + (hash(bi, bj, seed + 7) - 0.5) * p * 1.4;
          var lx = qx - bx, ly = qy - by, u = (lx * cA - ly * sA) * mir * scl, v = (lx * sA + ly * cA) * scl;
          var ofx = (hash(bi, bj, seed + 5) - 0.5) * G.srcPx * (0.3 + p), ofy = (hash(bi, bj, seed + 6) - 0.5) * G.srcPx * (0.3 + p);
          var ssx = reflect(Math.floor((cx + ofx + u * k) * f), w), ssy = reflect(Math.floor((cy + ofy + v * k) * f), h), si = (ssy * w + ssx) * 4;
          var rr = sd[si], gg = sd[si + 1], bb = sd[si + 2], sh = 0;
          var e = Math.sqrt(d2) - Math.sqrt(d1); if (e < seamW) sh = Math.max(sh, (1 - e / seamW) * 0.55);
          if (-sdv < band) sh = Math.max(sh, (1 + sdv / band) * 0.4);         // dunkler Rand der Form
          rr *= 1 - sh; gg *= 1 - sh; bb *= 1 - sh;
          var m = clamp(0.5 - sdv / aa, 0, 1);
          d[o] = sd[o] + (rr - sd[o]) * m; d[o + 1] = sd[o + 1] + (gg - sd[o + 1]) * m; d[o + 2] = sd[o + 2] + (bb - sd[o + 2]) * m; d[o + 3] = 255;
        }
      }
    }
  };
  var TOOLS = { fragments: FRAG, polymerge: POLY };

  // ---------- Zustand ----------
  var S = null;  // { img, name, W, H, f, base, stack: [{id,type,on,open,P}], q }
  var V = null, uid = 0;
  function newTool(type) { return { id: ++uid, type: type, on: true, open: true, P: Object.assign({}, TOOLS[type].defaults) }; }

  function imgData(img, w, h) {
    var c = document.createElement("canvas"); c.width = w; c.height = h;
    var x = c.getContext("2d"); x.drawImage(img, 0, 0, w, h);
    return { data: x.getImageData(0, 0, w, h).data, w: w, h: h };
  }
  function loadFile(file) {
    if (!file || !/^image\//.test(file.type)) { note(t("bad")); return; }
    var url = URL.createObjectURL(file), img = new Image();
    img.onload = function () {
      var W = img.naturalWidth, H = img.naturalHeight, f = Math.min(1, PREVIEW / Math.max(W, H));
      var keep = S ? S.stack : [newTool("fragments")];
      S = { img: img, name: (file.name || "foto").replace(/\.[^.]+$/, ""), W: W, H: H, f: f,
        base: imgData(img, Math.max(1, Math.round(W * f)), Math.max(1, Math.round(H * f))), stack: keep, q: S ? S.q : 100, stageIn: [] };
      if (V) { buildUI(); renderPreview(); }
    };
    img.onerror = function () { URL.revokeObjectURL(url); note(t("bad")); };
    img.src = url;
  }

  // Ganze Kette auf ein Bild anwenden (für die Vorschau in einem Rutsch)
  function runChain(base, f) {
    var cur = base, w = base.w, h = base.h, ins = [];
    S.stack.forEach(function (tl) {
      ins.push(cur);
      if (!tl.on) return;
      var T = TOOLS[tl.type], out = { data: new Uint8ClampedArray(w * h * 4), w: w, h: h };
      T.rows(out, cur, w, h, f, S.W, S.H, tl.P, T.prep(S.W, S.H, tl.P), 0, h);
      cur = out;
    });
    return { img: cur, ins: ins };
  }

  var pending = 0;
  function renderPreview() {
    if (pending) return;
    pending = requestAnimationFrame(function () {
      pending = 0;
      if (!V || !S) return;
      var cv = V.root.querySelector("#px-cv"); if (!cv) return;
      var w = S.base.w, h = S.base.h, x = cv.getContext("2d");
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
      var res = runChain(S.base, S.f);
      S.stageIn = res.ins;
      var show = V.showOrig ? S.base : res.img;
      x.putImageData(new ImageData(new Uint8ClampedArray(show.data), w, h), 0, 0);
      drawThumbs();
    });
  }
  function drawThumbs() {
    Array.prototype.forEach.call(V.root.querySelectorAll(".px-th"), function (th) {
      var i = +th.dataset.i, tl = S.stack[i], src = S.stageIn[i] || S.base; if (!tl) return;
      var box = th.parentNode.clientWidth || 240, tw = Math.min(box, 200 * S.W / S.H), hh = Math.round(tw * S.H / S.W), dpr = window.devicePixelRatio || 1;
      th.width = Math.round(tw * dpr); th.height = Math.round(hh * dpr); th.style.width = tw + "px"; th.style.height = hh + "px";
      var tmp = V.tmp || (V.tmp = document.createElement("canvas"));
      tmp.width = src.w; tmp.height = src.h; tmp.getContext("2d").putImageData(new ImageData(new Uint8ClampedArray(src.data), src.w, src.h), 0, 0);
      var x = th.getContext("2d"); x.setTransform(dpr, 0, 0, dpr, 0, 0);
      x.drawImage(tmp, 0, 0, tw, hh);
      var srcPx = tl.type === "polymerge" ? Math.min(S.W, S.H) * tl.P.src / 100 : Math.min(S.W, S.H) * tl.P.src / 100;
      var s = srcPx * tw / S.W, cx = tl.P.cx * tw, cy = tl.P.cy * hh;
      x.fillStyle = "rgba(0,0,0,.45)"; x.fillRect(0, 0, tw, hh);
      x.save(); x.beginPath(); x.rect(cx - s / 2, cy - s / 2, s, s); x.clip(); x.drawImage(tmp, 0, 0, tw, hh); x.restore();
      x.strokeStyle = "#fff"; x.lineWidth = 2; x.strokeRect(cx - s / 2, cy - s / 2, s, s);
    });
  }

  // ---------- Export ----------
  var exporting = false;
  function exportDims() { var r = Math.sqrt(S.q / 100); return { w: Math.max(1, Math.round(S.W * r)), h: Math.max(1, Math.round(S.H * r)), r: r }; }
  function doExport() {
    if (exporting || !S) return;
    var dm = exportDims(), c = document.createElement("canvas"); c.width = dm.w; c.height = dm.h;
    var x = c.getContext("2d");
    if (!x || c.width !== dm.w) { note(t("tooBig")); return; }
    exporting = true; updateExport();
    setTimeout(function () {
      var cur;
      try { cur = imgData(S.img, dm.w, dm.h); } catch (e) { exporting = false; note(t("tooBig")); updateExport(); return; }
      var tools = S.stack.filter(function (tl) { return tl.on; }), ti = 0, y = 0, out = null, G = null, step = Math.max(8, Math.floor(150000 / dm.w));
      (function chunk() {
        if (ti >= tools.length) return finish();
        var tl = tools[ti], T = TOOLS[tl.type];
        if (!out) { out = { data: new Uint8ClampedArray(dm.w * dm.h * 4), w: dm.w, h: dm.h }; G = T.prep(S.W, S.H, tl.P); y = 0; }
        var y1 = Math.min(dm.h, y + step);
        T.rows(out, cur, dm.w, dm.h, dm.r, S.W, S.H, tl.P, G, y, y1);
        y = y1;
        note(fmt(t("working"), { p: Math.round((ti + y / dm.h) / tools.length * 100) }));
        if (y >= dm.h) { cur = out; out = null; ti++; }
        setTimeout(chunk, 0);
      })();
      function finish() {
        x.putImageData(new ImageData(cur.data, dm.w, dm.h), 0, 0);
        c.toBlob(function (blob) {
          exporting = false;
          if (!blob) { note(t("tooBig")); updateExport(); return; }
          var url = URL.createObjectURL(blob), a = document.createElement("a");
          a.href = url; a.download = S.name + "-pixellab-" + S.q + ".jpg";
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
          note(t("saved")); updateExport();
        }, "image/jpeg", 0.92);
      }
    }, 30);
  }

  // ---------- Oberfläche ----------
  var CSS = ".px-ver{display:inline-block;margin-left:10px;padding:1px 8px;border:1px solid var(--line);border-radius:999px;font:600 .75rem var(--f-body);color:var(--soft);vertical-align:middle}" +
    ".px-wrap{display:grid;grid-template-columns:minmax(0,1fr);gap:20px;margin-top:22px}" +
    "@media (min-width:960px){.px-wrap{grid-template-columns:minmax(0,1fr) 350px;align-items:start}.px-deskbox{position:sticky;top:12px}}" +
    ".px-desk{position:relative;min-height:clamp(380px,62vh,760px);border-radius:18px;display:grid;place-items:center;padding:28px;overflow:hidden;" +
      "background:#3A3632;background-image:radial-gradient(rgba(255,255,255,.05) 1px,transparent 1px);background-size:6px 6px}" +
    ".px-desk.over{outline:3px dashed #E3B83F;outline-offset:-10px}" +
    ".px-photo{background:#fff;padding:10px;box-shadow:0 18px 50px rgba(0,0,0,.45);max-width:100%}" +
    ".px-photo canvas{display:block;max-width:100%;max-height:calc(62vh - 76px);height:auto;width:auto}" +
    ".px-drop{text-align:center;color:#F4F1EC;display:flex;flex-direction:column;align-items:center;gap:10px}" +
    ".px-drop b{font:600 1.4rem/1.2 var(--f-display)}.px-drop span{color:rgba(244,241,236,.7)}" +
    ".px-pick{font:600 1rem var(--f-body);padding:12px 20px;border-radius:999px;border:0;background:#F4F1EC;color:#151715;cursor:pointer}" +
    ".px-side{display:flex;flex-direction:column;gap:14px;min-width:0}" +
    ".px-btns{display:flex;flex-wrap:wrap;gap:8px}" +
    ".px-box{border:1px solid var(--line);border-radius:16px;padding:14px 16px;display:flex;flex-direction:column;gap:12px}" +
    ".px-hd{display:flex;justify-content:space-between;align-items:center;gap:8px}" +
    ".px-box h3{font:600 .78rem/1 var(--f-body);letter-spacing:.12em;text-transform:uppercase;color:var(--soft);margin:0}" +
    ".px-lnk{font:600 .8rem var(--f-body);background:none;border:0;color:var(--soft);cursor:pointer;padding:2px 0;text-decoration:underline}" +
    ".px-desc{margin:0;color:var(--soft);font-size:.88rem;line-height:1.45}" +
    ".px-flow{display:flex;flex-direction:column;gap:0}" +
    ".px-term{align-self:flex-start;font:600 .78rem var(--f-body);padding:3px 10px;border-radius:999px;background:var(--line);color:var(--ink)}" +
    ".px-link{width:2px;height:14px;background:var(--line);margin-left:19px}" +
    ".px-card{border:1px solid var(--line);border-radius:14px;background:var(--card,transparent);overflow:hidden}" +
    ".px-card.off{opacity:.55}" +
    ".px-ch{display:flex;align-items:center;gap:4px;padding:8px 6px 8px 10px}.px-ch .ic{margin:0 4px}" +
    ".px-num{flex:none;width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font:700 .78rem var(--f-body);background:var(--ink);color:var(--bg)}" +
    ".px-ch svg.ic{width:20px;height:20px;flex:none}" +
    ".px-ch b{flex:1;min-width:0;font-weight:600;font-size:.98rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
    ".px-ib{width:25px;height:28px;flex:none;border-radius:8px;border:0;background:transparent;color:var(--ink);cursor:pointer;display:grid;place-items:center;font:600 .95rem/1 var(--f-body)}" +
    ".px-ib:hover{background:var(--line)}.px-ib[disabled]{opacity:.3;cursor:default;background:transparent}" +
    ".px-ib svg{width:17px;height:17px}" +
    ".px-cb{display:flex;flex-direction:column;gap:12px;padding:4px 14px 14px;border-top:1px solid var(--line)}" +
    ".px-cb[hidden]{display:none}" +
    ".px-row{display:flex;flex-direction:column;gap:6px}" +
    ".px-row label{display:flex;justify-content:space-between;font-weight:600;font-size:.9rem;margin-top:8px}" +
    ".px-row label span{color:var(--soft);font-weight:500;font-variant-numeric:tabular-nums}" +
    ".px-row input[type=range]{width:100%;accent-color:var(--accent)}" +
    ".px-chk{display:flex;align-items:center;gap:8px;font-weight:500;font-size:.92rem;cursor:pointer}.px-chk input{width:18px;height:18px;accent-color:var(--accent)}" +
    ".px-segs{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid var(--line);border-radius:10px;overflow:hidden}" +
    ".px-segs button{font:600 .8rem var(--f-body);padding:8px 2px;border:0;background:transparent;color:var(--soft);cursor:pointer}" +
    ".px-segs button[aria-pressed=true]{background:var(--ink);color:var(--bg)}" +
    ".px-th{display:block;margin:0 auto;border-radius:8px;cursor:move;touch-action:none}" +
    ".px-add{display:flex;flex-wrap:wrap;gap:8px}" +
    ".px-add button{display:flex;align-items:center;gap:6px;font:600 .88rem var(--f-body);padding:8px 12px;border-radius:999px;border:1px dashed var(--ink);background:transparent;color:var(--ink);cursor:pointer}" +
    ".px-add button svg{width:16px;height:16px}" +
    ".px-save{font:600 1rem var(--f-body);padding:12px 18px;border-radius:999px;border:0;background:var(--ink);color:var(--bg);cursor:pointer}" +
    ".px-save[aria-disabled=true]{opacity:.5;cursor:default}" +
    ".px-note{margin:0;color:var(--soft);font-size:.88rem;min-height:1.3em;font-variant-numeric:tabular-nums}";

  var EYE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M2 12 Q12 3 22 12 Q12 21 2 12 Z"/><circle cx="12" cy="12" r="3"/></svg>';
  var EYEOFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M2 12 Q12 3 22 12 Q12 21 2 12 Z"/><path d="M4 20 L20 4"/></svg>';

  function html() {
    return '<h1 class="ptitle">' + t("title") + '<span class="px-ver">v' + VERSION + '</span></h1><p class="pintro">' + t("intro") + "</p>" +
      '<div class="px-wrap"><div class="px-deskbox"><div class="px-desk" id="px-desk"></div><input type="file" id="px-file" accept="image/*" hidden></div>' +
      '<div class="px-side" id="px-side"></div></div>' +
      '<section class="phow"><h2>' + t("howH") + "</h2><p>" + t("how1") + "</p><p>" + t("how2") + "</p><p>" + t("how3") + "</p></section>";
  }
  function ctrlHTML(tl, i) {
    var T = TOOLS[tl.type], P = tl.P;
    return T.controls.map(function (c) {
      if (c.k === "thumb") return '<div class="px-row"><label>' + t("source") + '</label><canvas class="px-th" data-i="' + i + '"></canvas><span class="px-desc">' + t("sourceHint") + "</span></div>";
      if (c.type === "check") return '<label class="px-chk"><input type="checkbox" data-i="' + i + '" data-k="' + c.k + '"' + (P[c.k] ? " checked" : "") + "> " + c.l[lang] + "</label>";
      if (c.type === "seg") return '<div class="px-row"><label>' + c.l[lang] + '</label><div class="px-segs" role="group" aria-label="' + c.l[lang] + '">' +
        c.opts.map(function (o) { return '<button type="button" data-i="' + i + '" data-k="' + c.k + '" data-v="' + o[0] + '" aria-pressed="' + (P[c.k] === o[0]) + '">' + o[1] + "</button>"; }).join("") + "</div></div>";
      var id = "px-" + tl.id + "-" + c.k;
      return '<div class="px-row"><label for="' + id + '">' + c.l[lang] + '<span id="' + id + '-v">' + P[c.k] + c.u + '</span></label><input type="range" id="' + id + '" data-i="' + i + '" data-k="' + c.k + '" data-u="' + c.u + '" min="' + c.min + '" max="' + c.max + '" step="1" value="' + P[c.k] + '"></div>';
    }).join("");
  }
  function chainHTML() {
    var n = S.stack.length, anyOpen = S.stack.some(function (x) { return x.open; });
    var cards = S.stack.map(function (tl, i) {
      var T = TOOLS[tl.type];
      return '<div class="px-link"></div><div class="px-card' + (tl.on ? "" : " off") + '">' +
        '<div class="px-ch"><span class="px-num">' + (i + 1) + "</span>" + T.icon.replace("<svg", '<svg class="ic"') + "<b>" + T.name[lang] + "</b>" +
        '<button type="button" class="px-ib" data-act="up" data-i="' + i + '" title="' + t("up") + '" aria-label="' + t("up") + '"' + (i === 0 ? " disabled" : "") + ">↑</button>" +
        '<button type="button" class="px-ib" data-act="down" data-i="' + i + '" title="' + t("down") + '" aria-label="' + t("down") + '"' + (i === n - 1 ? " disabled" : "") + ">↓</button>" +
        '<button type="button" class="px-ib" data-act="on" data-i="' + i + '" title="' + t("onoff") + '" aria-label="' + t("onoff") + '" aria-pressed="' + tl.on + '">' + (tl.on ? EYE : EYEOFF) + "</button>" +
        '<button type="button" class="px-ib" data-act="del" data-i="' + i + '" title="' + t("remove") + '" aria-label="' + t("remove") + '">×</button>' +
        '<button type="button" class="px-ib" data-act="fold" data-i="' + i + '" title="' + t("fold") + '" aria-label="' + t("fold") + '" aria-expanded="' + tl.open + '">' + (tl.open ? "▾" : "▸") + "</button></div>" +
        '<div class="px-cb"' + (tl.open ? "" : " hidden") + '><p class="px-desc">' + T.desc[lang] + "</p>" + ctrlHTML(tl, i) + "</div></div>";
    }).join("");
    return '<div class="px-box"><div class="px-hd"><h3>' + t("chain") + "</h3>" + (n ? '<button type="button" class="px-lnk" data-act="all">' + (anyOpen ? t("allClosed") : t("allOpen")) + "</button>" : "") + "</div>" +
      '<p class="px-desc">' + t("chainNote") + '</p><div class="px-flow"><span class="px-term">' + t("start") + "</span>" +
      (n ? cards : '<div class="px-link"></div><p class="px-desc">' + t("empty") + "</p>") +
      '<div class="px-link"></div><span class="px-term">' + t("result") + '</span></div>' +
      '<div class="px-hd"><h3>' + t("add") + '</h3></div><div class="px-add">' +
      Object.keys(TOOLS).map(function (k) { return '<button type="button" data-add="' + k + '">+ ' + TOOLS[k].icon + TOOLS[k].name[lang] + "</button>"; }).join("") + "</div></div>";
  }
  function buildUI() {
    var desk = V.root.querySelector("#px-desk"), side = V.root.querySelector("#px-side");
    if (!S) {
      desk.innerHTML = '<div class="px-drop"><b>' + t("drop") + "</b><span>" + t("or") + '</span><button type="button" class="px-pick" data-px="pick">' + t("pick") + '</button><span id="px-dn">' + t("dropNote") + "</span></div>";
      side.innerHTML = '<div class="px-box"><h3>' + t("chain") + '</h3><p class="px-desc">' + t("chainNote") + "</p>" +
        Object.keys(TOOLS).map(function (k) { return '<div class="px-ch">' + TOOLS[k].icon.replace("<svg", '<svg class="ic"') + "<b>" + TOOLS[k].name[lang] + '</b></div><p class="px-desc">' + TOOLS[k].desc[lang] + "</p>"; }).join("") + "</div>";
      return;
    }
    if (!desk.querySelector("#px-cv")) desk.innerHTML = '<div class="px-photo"><canvas id="px-cv" role="img" aria-label="' + S.name + '"></canvas></div>';
    side.innerHTML = '<div class="px-btns"><button type="button" class="navbtn" data-px="pick">' + t("other") + '</button><button type="button" class="navbtn" data-px="orig">' + t("original") + "</button></div>" +
      '<div id="px-chain">' + chainHTML() + "</div>" +
      '<div class="px-box"><h3>' + t("exportH") + '</h3><div class="px-row"><label for="px-q">' + t("quality") + '<span id="px-q-v">' + S.q + ' %</span></label><input type="range" id="px-q" min="1" max="100" step="1" value="' + S.q + '"></div>' +
      '<p class="px-note" id="px-dims"></p><button type="button" class="px-save" data-px="save" id="px-save">' + t("save") + '</button><p class="px-note" id="px-note"></p></div>';
    updateExport();
  }
  function rebuildChain() { var c = V.root.querySelector("#px-chain"); if (c) c.innerHTML = chainHTML(); drawThumbs(); }
  function updateExport() {
    if (!V || !S) return;
    var dm = exportDims(), el = V.root.querySelector("#px-dims");
    if (el) el.textContent = fmt(t("qNote"), { w: nf(dm.w), h: nf(dm.h), mp: nf(dm.w * dm.h / 1e6, dm.w * dm.h < 1e6 ? 2 : 1), p: S.q });
    var b = V.root.querySelector("#px-save"); if (b) b.setAttribute("aria-disabled", String(exporting));
  }
  function note(s) { if (!V) return; var n = V.root.querySelector("#px-note") || V.root.querySelector("#px-dn"); if (n) n.textContent = s; }

  function onInput(e) {
    var el = e.target;
    if (el.id === "px-q") { S.q = +el.value; V.root.querySelector("#px-q-v").textContent = S.q + " %"; updateExport(); return; }
    if (el.dataset.i === undefined || !S) return;
    var tl = S.stack[+el.dataset.i], k = el.dataset.k; if (!tl) return;
    if (el.type === "checkbox") tl.P[k] = el.checked;
    else { tl.P[k] = +el.value; var v = document.getElementById(el.id + "-v"); if (v) v.textContent = el.value + (el.dataset.u || ""); }
    renderPreview();
  }
  function onClick(e) {
    var b = e.target.closest("[data-px],[data-act],[data-add],[data-v]"); if (!b) return;
    if (b.dataset.px === "pick") { V.root.querySelector("#px-file").click(); return; }
    if (!S) return;
    if (b.dataset.px === "save") { doExport(); return; }
    if (b.dataset.add) { S.stack.push(newTool(b.dataset.add)); rebuildChain(); renderPreview(); return; }
    if (b.dataset.v !== undefined) {
      var tl0 = S.stack[+b.dataset.i]; tl0.P[b.dataset.k] = b.dataset.v;
      Array.prototype.forEach.call(b.parentNode.children, function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      renderPreview(); return;
    }
    var a = b.dataset.act, i = +b.dataset.i, st = S.stack;
    if (a === "all") { var open = !st.some(function (x) { return x.open; }); st.forEach(function (x) { x.open = open; }); rebuildChain(); return; }
    if (a === "fold") { st[i].open = !st[i].open; rebuildChain(); return; }
    if (a === "on") { st[i].on = !st[i].on; rebuildChain(); renderPreview(); return; }
    if (a === "del") { st.splice(i, 1); rebuildChain(); renderPreview(); return; }
    if (a === "up" && i > 0) { var x = st[i]; st[i] = st[i - 1]; st[i - 1] = x; rebuildChain(); renderPreview(); return; }
    if (a === "down" && i < st.length - 1) { var y = st[i]; st[i] = st[i + 1]; st[i + 1] = y; rebuildChain(); renderPreview(); }
  }
  function onChange(e) { if (e.target.id === "px-file" && e.target.files[0]) { loadFile(e.target.files[0]); e.target.value = ""; } }
  function onPress(e) {
    if (!S) return;
    if (e.target.closest('[data-px="orig"]')) { V.showOrig = true; renderPreview(); }
    var th = e.target.closest(".px-th");
    if (th) { V.dragTh = +th.dataset.i; moveTh(e, th); try { th.setPointerCapture(e.pointerId); } catch (er) {} }
  }
  function onRelease() { if (!V) return; if (V.showOrig) { V.showOrig = false; renderPreview(); } V.dragTh = null; }
  function moveTh(e, th) {
    var tl = S.stack[V.dragTh]; if (!tl) return;
    var r = th.getBoundingClientRect();
    tl.P.cx = clamp((e.clientX - r.left) / r.width, 0, 1); tl.P.cy = clamp((e.clientY - r.top) / r.height, 0, 1);
    renderPreview();
  }
  function onMove(e) { if (V && V.dragTh !== null && S) { var th = V.root.querySelector('.px-th[data-i="' + V.dragTh + '"]'); if (th) moveTh(e, th); } }
  function onDragOver(e) { if (!e.dataTransfer || Array.prototype.indexOf.call(e.dataTransfer.types || [], "Files") < 0) return; e.preventDefault(); V.root.querySelector("#px-desk").classList.add("over"); }
  function onDragLeave(e) { if (e.target.id === "px-desk") V.root.querySelector("#px-desk").classList.remove("over"); }
  function onDrop(e) { if (!e.dataTransfer || !e.dataTransfer.files.length) return; e.preventDefault(); V.root.querySelector("#px-desk").classList.remove("over"); loadFile(e.dataTransfer.files[0]); }

  function injectCSS() { var o = document.getElementById("px-css"); if (o) o.remove(); var s = document.createElement("style"); s.id = "px-css"; s.textContent = CSS; document.head.appendChild(s); }
  function mount(el, l) {
    unmount();
    lang = l === "en" ? "en" : "de";
    injectCSS();
    el.innerHTML = html();
    V = { root: el, showOrig: false, dragTh: null };
    el.addEventListener("input", onInput); el.addEventListener("click", onClick); el.addEventListener("change", onChange);
    el.addEventListener("pointerdown", onPress); window.addEventListener("pointerup", onRelease); window.addEventListener("pointermove", onMove);
    var desk = el.querySelector("#px-desk");
    desk.addEventListener("dragover", onDragOver); desk.addEventListener("dragleave", onDragLeave); desk.addEventListener("drop", onDrop);
    buildUI();
    if (S) renderPreview();
  }
  function unmount() {
    if (V) {
      window.removeEventListener("pointerup", onRelease); window.removeEventListener("pointermove", onMove);
      V.root.removeEventListener("input", onInput); V.root.removeEventListener("click", onClick); V.root.removeEventListener("change", onChange);
      V.root.removeEventListener("pointerdown", onPress);
      V = null;
    }
  }
  window.addEventListener("resize", function () { if (V && S) drawThumbs(); });

  window.Pixellab = { mount: mount, unmount: unmount, _debug: function () { return { S: S, TOOLS: TOOLS }; } };
})();
