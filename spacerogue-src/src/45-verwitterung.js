  // ===== 45-verwitterung.js · Zeichnen: verwitterte Panzerung (v0.54.2, nur Developer Tool) =====
  // Zwei Varianten jedes Panzerblocks: rostig (wx "r") und zugewuchert mit Moos und Efeu (wx "m").
  // Rost und Bewuchs sind EINE nahtlose Textur im Schiffsraster (nicht je Block): Zelle (x, y) zeigt immer dieselbe Stelle,
  // deshalb laufen Flecken, Ranken und Blätter über Blockgrenzen weiter, egal wie die Blöcke gedreht sind.
  // Die Textur wiederholt sich alle WX_P Zellen und bedeckt etwa 30 % der Fläche (Ziel 20–40 %); darunter bleibt der normale Block sichtbar.
  var WX_P = 36, WX_PPC = 32, WX_TEX = {}, WX_ICON = false;
  function wxRng(s) { return function () { s = s + 0x6D2B79F5 | 0; var t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  // Kachelbares Wertrauschen: Gitter mit n Feldern, das am Rand wieder in sich übergeht
  function wxNoise(seed) {
    var R = wxRng(seed), cache = {};
    function grid(n) { if (cache[n]) return cache[n]; var g = new Float32Array(n * n); for (var i = 0; i < n * n; i++) g[i] = R(); return (cache[n] = g); }
    function v(u, w, n) {   // u, w ∈ [0,1)
      var g = grid(n), x = u * n, y = w * n, xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
      var x0 = (xi % n + n) % n, y0 = (yi % n + n) % n, x1 = (x0 + 1) % n, y1 = (y0 + 1) % n;
      var a = g[y0 * n + x0], b = g[y0 * n + x1], c = g[y1 * n + x0], d = g[y1 * n + x1], sx = xf * xf * (3 - 2 * xf), sy = yf * yf * (3 - 2 * yf);
      return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
    }
    return function (u, w, n0, oct) { var s = 0, amp = 0.5, tot = 0, n = n0; for (var o = 0; o < oct; o++) { s += amp * v(u, w, n); tot += amp; amp *= 0.5; n *= 2; } return s / tot; };
  }
  function wxField(N, fn) {
    var M = N >> 1, lo = new Float32Array(M * M), f = new Float32Array(N * N), x, y;
    for (y = 0; y < M; y++) for (x = 0; x < M; x++) lo[y * M + x] = fn(x / M, y / M);
    for (y = 0; y < N; y++) { var fy = y / 2, y0 = Math.floor(fy), ty = fy - y0, y1 = (y0 + 1) % M; for (x = 0; x < N; x++) { var fx = x / 2, x0 = Math.floor(fx), tx = fx - x0, x1 = (x0 + 1) % M;
      f[y * N + x] = (lo[y0 * M + x0] * (1 - tx) + lo[y0 * M + x1] * tx) * (1 - ty) + (lo[y1 * M + x0] * (1 - tx) + lo[y1 * M + x1] * tx) * ty; } }
    return f;
  }
  // Schwelle, über der genau der Anteil q der Werte liegt
  function wxQuant(f, q) { var a = new Float32Array(Math.ceil(f.length / 7)); for (var i = 0, j = 0; i < f.length; i += 7) a[j++] = f[i]; a.sort(); return a[Math.floor(a.length * (1 - q))]; }
  function wxSm(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

  function wxBuildRust(g, N) {
    var img = g.createImageData(N, N), d = img.data, nA = wxNoise(911), nB = wxNoise(377), nC = wxNoise(53), nD = wxNoise(2024), i, x, y;
    var f = wxField(N, function (u, w) { var wu = u + (nB(u, w, 18, 2) - 0.5) * 0.017, ww = w + (nB(u + 0.5, w, 18, 2) - 0.5) * 0.017; return nA(wu, ww, 18, 4) * 0.8 + nA(u, w, 5, 2) * 0.2; });
    for (i = 0; i < N * N; i++) f[i] = f[i] * 0.85 + nC((i % N) / N, Math.floor(i / N) / N, 144, 1) * 0.15;   // feinere Flecken, gleichmäßiger verteilt
    var th = wxQuant(f, 0.28), thH = wxQuant(f, 0.40);
    for (y = 0; y < N; y++) for (x = 0; x < N; x++) {
      i = y * N + x; var u2 = x / N, w2 = y / N, v = f[i], o = i * 4;
      var grain = nD(u2, w2, 432, 1), pit = nC(u2, w2, 288, 1), lay = nB(u2, w2, 43, 2);
      var vv = v + (grain - 0.5) * 0.05;   // ausgefranster, körniger Rand
      var core = wxSm(th - 0.004, th + 0.012, vv), deep = wxSm(th + 0.03, th + 0.13, v), halo = wxSm(thH, th, v) * 0.16 * (0.6 + grain * 0.8);
      var spot = pit > 0.8 && v > thH - 0.05 ? wxSm(0.8, 0.86, pit) * 0.85 : 0;   // einzelne Rostpunkte im Umfeld
      var a = Math.max(core * (0.82 + 0.16 * grain), halo, spot);
      if (a <= 0.01) continue;
      // Farbe: matt braun, innen dunkler, nur stellenweise kräftiges Orange (frischer Rost)
      var t = Math.min(1, Math.max(0, deep * 0.65 + (lay - 0.5) * 0.7 + 0.15)), r, gg, b;
      r = 132 - 62 * t; gg = 70 - 34 * t; b = 40 - 18 * t;
      var fresh = wxSm(0.62, 0.8, grain * 0.6 + lay * 0.4) * (1 - deep);
      r += 40 * fresh; gg += 20 * fresh; b += 4 * fresh;
      if (core < 0.3 && spot === 0) { r = 104; gg = 72; b = 52; }        // Verfärbung drumherum: graubraun
      if (pit > 0.84 && core > 0.5) { r *= 0.5; gg *= 0.45; b *= 0.45; }  // Lochfraß
      var sh = (grain - 0.5) * 26; d[o] = r + sh; d[o + 1] = gg + sh * 0.6; d[o + 2] = b + sh * 0.4; d[o + 3] = Math.min(255, a * 255);
    }
    g.putImageData(img, 0, 0);
  }

  function wxBuildMoss(g, N) {
    var img = g.createImageData(N, N), d = img.data, nA = wxNoise(4242), nB = wxNoise(1717), nC = wxNoise(99), nD = wxNoise(31337), i, x, y;
    var f = wxField(N, function (u, w) { var wu = u + (nB(u, w, 14, 2) - 0.5) * 0.022, ww = w + (nB(u, w + 0.5, 14, 2) - 0.5) * 0.022; return nA(wu, ww, 13, 4) * 0.86 + nA(u, w, 5, 2) * 0.14; });
    for (i = 0; i < N * N; i++) f[i] = f[i] * 0.87 + nC((i % N) / N, Math.floor(i / N) / N, 108, 1) * 0.13;
    var th = wxQuant(f, 0.16);   // 16 % Moos, dazu kommt der Efeu
    for (y = 0; y < N; y++) for (x = 0; x < N; x++) {
      i = y * N + x; var u2 = x / N, w2 = y / N, v = f[i], o = i * 4, fuzz = nD(u2, w2, 468, 1), clump = nB(u2, w2, 65, 2);
      var a = wxSm(th - 0.006, th + 0.02, v + (fuzz - 0.5) * 0.07);   // flauschiger, krümeliger Rand
      if (a <= 0.01) continue;
      var t = wxSm(th, th + 0.12, v), lit = clump * 0.55 + fuzz * 0.45;
      // dunkles Oliv bis Moosgrün, in der Mitte dichter; helle Spitzen durch das feine Rauschen
      d[o] = 44 + 46 * lit - 12 * t; d[o + 1] = 64 + 60 * lit - 4 * t; d[o + 2] = 28 + 18 * lit - 8 * t; d[o + 3] = a * (0.8 + 0.2 * fuzz) * 255;
    }
    g.putImageData(img, 0, 0);
    // Efeu: Ranken mit dichtem Laub wachsen von Mooskissen aus über die Platten; alles 9× versetzt gezeichnet, damit die Kachel nahtlos bleibt
    var R = wxRng(8080), P = WX_PPC, vines = [];
    for (var k = 0; k < Math.round(26 * WX_P * WX_P / 400 * 1.1); k++) {
      var sx = 0, sy = 0;
      for (var tr = 0; tr < 60; tr++) { sx = R() * N; sy = R() * N; if (f[(Math.floor(sy) % N) * N + Math.floor(sx) % N] > th) break; }
      var ang = R() * 6.283, len = 3 + R() * 6, pts = [[sx, sy]], leaves = [];
      function grow(x0, y0, a0, steps, sz) {
        var xx = x0, yy = y0, aa = a0, line = [[xx, yy]];
        for (var st = 0; st < steps; st++) {
          aa += (R() - 0.5) * 0.6; xx += Math.cos(aa) * 0.18 * P; yy += Math.sin(aa) * 0.18 * P; line.push([xx, yy]);
          var nl = R() < 0.9 ? (R() < 0.45 ? 2 : 1) : 0;
          for (var q = 0; q < nl; q++) { var sd = q ? -1 : (R() < 0.5 ? 1 : -1); leaves.push([xx, yy, aa + sd * (0.7 + R() * 0.8), (0.2 + R() * 0.16) * P * sz, Math.floor(R() * 4)]); }
        }
        return line;
      }
      var main = grow(sx, sy, ang, Math.round(len / 0.18), 1), lines = [main];
      for (var bi = 0; bi < 1 + Math.floor(R() * 3); bi++) { var bp = main[Math.floor(R() * main.length)]; lines.push(grow(bp[0], bp[1], ang + (R() < 0.5 ? 1 : -1) * (0.7 + R() * 0.8), 6 + Math.floor(R() * 12), 0.85)); }
      vines.push({ lines: lines, leaves: leaves, w: (0.03 + R() * 0.025) * P });
    }
    var LC = [[38, 72, 34], [50, 90, 40], [62, 104, 46], [44, 80, 52]];
    for (var ox = -1; ox <= 1; ox++) for (var oy = -1; oy <= 1; oy++) {
      g.save(); g.translate(ox * N, oy * N);
      vines.forEach(function (vn) {
        g.strokeStyle = "rgba(66,58,36,.95)"; g.lineWidth = vn.w; g.lineCap = "round"; g.lineJoin = "round";
        vn.lines.forEach(function (ln) { g.beginPath(); ln.forEach(function (p, j) { if (j) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }); g.stroke(); });
        vn.leaves.forEach(function (L) {
          var c0 = LC[L[4]], s2 = L[3];
          g.save(); g.translate(L[0], L[1]); g.rotate(L[2]);
          g.strokeStyle = "rgba(60,60,30,.8)"; g.lineWidth = Math.max(0.6, s2 * 0.07); g.beginPath(); g.moveTo(0, 0); g.lineTo(s2 * 0.35, 0); g.stroke();   // Stiel
          g.translate(s2 * 0.3, 0);
          // Efeublatt: drei Lappen, Schatten darunter für etwas Tiefe
          function leaf() { g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(s2 * 0.1, -s2 * 0.55, s2 * 0.45, -s2 * 0.42); g.quadraticCurveTo(s2 * 0.6, -s2 * 0.2, s2 * 0.95, 0); g.quadraticCurveTo(s2 * 0.6, s2 * 0.2, s2 * 0.45, s2 * 0.42); g.quadraticCurveTo(s2 * 0.1, s2 * 0.55, 0, 0); }
          g.save(); g.translate(s2 * 0.06, s2 * 0.08); leaf(); g.fillStyle = "rgba(0,0,0,.28)"; g.fill(); g.restore();
          leaf(); g.fillStyle = "rgb(" + c0[0] + "," + c0[1] + "," + c0[2] + ")"; g.fill();
          g.strokeStyle = "rgba(150,190,110,.35)"; g.lineWidth = Math.max(0.5, s2 * 0.05); g.beginPath(); g.moveTo(s2 * 0.05, 0); g.lineTo(s2 * 0.85, 0); g.moveTo(s2 * 0.3, 0); g.lineTo(s2 * 0.45, -s2 * 0.3); g.moveTo(s2 * 0.3, 0); g.lineTo(s2 * 0.45, s2 * 0.3); g.stroke();
          g.restore();
        });
      });
      g.restore();
    }
  }
  // Textur einmal je Variante erzeugen (beim ersten Zeichnen)
  function wxTex(kind) {
    if (WX_TEX[kind] !== undefined) return WX_TEX[kind];
    var N = WX_P * WX_PPC, cv = document.createElement("canvas"); cv.width = cv.height = N;
    var g = cv.getContext("2d"); if (!g || !g.createImageData || !g.createPattern) return (WX_TEX[kind] = null);
    var t0 = performance.now();
    try { if (kind === "r") wxBuildRust(g, N); else wxBuildMoss(g, N); } catch (e) { return (WX_TEX[kind] = null); }
    WX_TEX[kind] = { cv: cv, pat: null, N: N, ms: Math.round(performance.now() - t0) };
    return WX_TEX[kind];
  }
  // Kleine Andeutung für die Bauteilliste (die echte Textur wird erst beim Bauen erzeugt)
  function wxIcon(c, ty, w, h) {
    var R = wxRng(ty.wx === "r" ? 7 : 11), u = Math.min(w, h);
    c.save(); shapePath(c, ty.shape, w, h); c.clip();
    if (ty.wx === "r") {
      [["#6E3E24", 0.3, 0.32, 0.28], ["#8A4A26", 0.72, 0.68, 0.24], ["#9B5A2C", 0.62, 0.22, 0.12], ["#5A3220", 0.2, 0.78, 0.14]].forEach(function (q) { c.fillStyle = q[0]; c.beginPath(); c.arc(w * q[1], h * q[2], u * q[3], 0, 6.283); c.fill(); });
      for (var i = 0; i < 10; i++) { c.fillStyle = "rgba(110,60,34,.8)"; c.fillRect(w * R(), h * R(), u * 0.06, u * 0.06); }
    } else {
      [["#3E5E2C", 0.25, 0.3, 0.26], ["#4C6E34", 0.78, 0.75, 0.22]].forEach(function (q) { c.fillStyle = q[0]; c.beginPath(); c.arc(w * q[1], h * q[2], u * q[3], 0, 6.283); c.fill(); });
      c.strokeStyle = "#4A4128"; c.lineWidth = Math.max(1, u * 0.05); c.beginPath(); c.moveTo(0, h * 0.85); c.quadraticCurveTo(w * 0.5, h * 0.4, w, h * 0.15); c.stroke();
      [[0.3, 0.62, 0.6], [0.55, 0.42, -0.9], [0.8, 0.26, 0.4]].forEach(function (q) { c.save(); c.translate(w * q[0], h * q[1]); c.rotate(q[2]); c.fillStyle = "#3F7A36"; c.beginPath(); c.ellipse(u * 0.1, 0, u * 0.13, u * 0.08, 0, 0, 6.283); c.fill(); c.restore(); });
    }
    c.restore();
  }
  // Verwitterung über einen Block legen. Vorher steht der Kontext im Block-Raster (0..w, 0..h); m0 ist die Lage im Schiffsraster vor dem Block-Versatz.
  function wxOverlay(c, b, ty, s, w, h, m0) {
    if (WX_ICON) { wxIcon(c, ty, w, h); return; }
    var tx = wxTex(ty.wx); if (!tx || !m0) return;
    try {
      if (!tx.pat) tx.pat = c.createPattern(tx.cv, "repeat");
      var ff = fp(b);
      c.save(); shapePath(c, ty.shape, w, h); c.clip();
      c.setTransform(m0);
      if (tx.pat.setTransform && typeof DOMMatrix !== "undefined") tx.pat.setTransform(new DOMMatrix().scaleSelf(s / WX_PPC, s / WX_PPC));
      c.fillStyle = tx.pat; c.fillRect(b.x * s, b.y * s, ff[0] * s, ff[1] * s);
      c.restore();
    } catch (e) { try { c.restore(); } catch (e2) {} }
  }
