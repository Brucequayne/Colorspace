  // ===== 45-verwitterung.js · Zeichnen: verwitterte Panzerung (v0.54.2, überarbeitet v0.54.3; nur Developer Tool) =====
  // Zwei Varianten jedes Panzerblocks: rostig (wx "r") und bemoost / zugewuchert (wx "m").
  // Rost und Moos sind EINE nahtlose Textur im Schiffsraster (nicht je Block): Zelle (x, y) zeigt immer dieselbe Stelle,
  // deshalb laufen Flecken über Blockgrenzen weiter, egal wie die Blöcke gedreht sind.
  // Seit v0.54.3 als Pixel-Textur wie bei Minecraft: 16 × 16 Texel pro Zelle, beim Heranzoomen scharf (ohne Glättung) gezeichnet.
  // Die Textur wiederholt sich alle WX_P Zellen und bedeckt etwa 27–30 % der Fläche (Ziel 20–40 %); darunter bleibt der normale Block sichtbar.
  var WX_P = 36, WX_PPC = 16, WX_TEX = {}, WX_ICON = false;
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
  // Schwelle, über der genau der Anteil q der Werte liegt
  function wxQuant(f, q) { var a = new Float32Array(Math.ceil(f.length / 7)); for (var i = 0, j = 0; i < f.length; i += 7) a[j++] = f[i]; a.sort(); return a[Math.floor(a.length * (1 - q))]; }
  function wxSm(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }

  // Ein Texel setzen (deckend oder halbtransparent)
  function wxPut(d, o, c, a) { d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = a; }
  // Feld je Texel: mehrere kleine Rauschfrequenzen (Flecken von ¼ bis 1 Zelle) plus Texel-Zufall für krümelige Ränder
  function wxTexelField(N, nA, nB, R, fr, wts) {
    var f = new Float32Array(N * N);
    for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
      var u = x / N, w = y / N, v = 0; for (var k = 0; k < fr.length; k++) v += (k % 2 ? nB : nA)(u, w, Math.round(fr[k]), 1) * wts[k];   /* ganze Gitterzahl, sonst kachelt es nicht */
      f[y * N + x] = v + R() * wts[wts.length - 1];
    }
    return f;
  }

  function wxBuildRust(g, N) {
    var img = g.createImageData(N, N), d = img.data, nA = wxNoise(911), nB = wxNoise(377), nC = wxNoise(53), R = wxRng(4711), P = WX_P;
    // Frequenzen in Gitterfeldern über die ganze Kachel: P = 1 Fleck je Zelle, 2P = halbe Zelle …
    var f = wxTexelField(N, nA, nB, R, [P * 1.3, P * 2.7, P * 5.5], [0.34, 0.4, 0.26, 0.18]);
    var th = wxQuant(f, 0.27), thS = wxQuant(f, 0.36);
    var C = [[64, 33, 20], [92, 47, 26], [118, 60, 31], [142, 72, 36], [168, 90, 44], [190, 112, 56]];
    for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
      var i = y * N + x, o = i * 4, v = f[i], u = x / N, w = y / N;
      if (v >= th) {
        // Innen dunkler, Rand heller und orange; einzelne Lochfraß-Texel fast schwarz-braun
        var depth = (v - th) / 0.09, tone = Math.max(0, Math.min(5, Math.round(4.3 - depth * 2.3 + (nC(u, w, P * 4, 1) - 0.5) * 3 + (R() - 0.5) * 1.4)));
        if (R() < 0.05 && depth > 0.4) tone = 0;
        wxPut(d, o, C[tone], 255);
      } else if (v >= thS && R() < 0.35) wxPut(d, o, C[2 + (R() < 0.5 ? 1 : 0)], 110);   // Rostschleier um die Flecken, nur einzelne Texel
      else if (R() < 0.006) wxPut(d, o, C[3 + (R() < 0.5 ? 1 : 0)], 230);               // vereinzelte Rostpunkte auf blankem Metall
    }
    g.putImageData(img, 0, 0);
  }

  function wxBuildMoss(g, N) {
    var img = g.createImageData(N, N), d = img.data, nA = wxNoise(4242), nB = wxNoise(1717), nC = wxNoise(99), R = wxRng(8080), P = WX_P;
    // Moos wächst in zusammenhängenden Polstern (etwas größer als Rost), Ränder krümelig aufgelöst
    var f = wxTexelField(N, nA, nB, R, [P * 0.45, P * 1.1, P * 2.6], [0.5, 0.32, 0.18, 0.14]);
    var th = wxQuant(f, 0.23), thS = wxQuant(f, 0.3);
    var C = [[30, 46, 22], [42, 64, 27], [56, 82, 32], [70, 99, 38], [88, 118, 44], [108, 138, 54], [132, 158, 70]];
    var on = new Uint8Array(N * N); for (var k = 0; k < N * N; k++) on[k] = f[k] >= th ? 1 : 0;
    for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
      var i = y * N + x, o = i * 4, v = f[i], u = x / N, w = y / N;
      if (on[i]) {
        // Höhe: Polster in der Mitte heller, am Rand dunkler; feines Rauschen für Büschel
        var depth = Math.min(1, (v - th) / 0.14), tuft = nC(u, w, P * 5, 1);
        var tone = Math.round(1.5 + depth * 2.6 + (tuft - 0.5) * 2.6 + (R() - 0.5) * 1.3);
        // Schatten unten rechts: Polster wirkt erhaben
        var ex = on[y * N + (x + N - 1) % N], ey = on[((y + N - 1) % N) * N + x];
        if (!ex || !ey) tone += 1;   // oben/links Kante: Licht
        var sx = on[y * N + (x + 1) % N], sy = on[((y + 1) % N) * N + x];
        if (!sx || !sy) tone -= 1;   // unten/rechts Kante: Schatten
        tone = Math.max(0, Math.min(6, tone));
        if (R() < 0.012) tone = 6;   // einzelne helle Sporenkapseln
        wxPut(d, o, C[tone], 255);
      } else {
        // dunkler Schlagschatten direkt unter/rechts eines Polsters
        var lx = on[y * N + (x + N - 1) % N], ly = on[((y + N - 1) % N) * N + x];
        if (lx || ly) wxPut(d, o, [18, 22, 14], 90);
        else if (v >= thS && R() < 0.3) wxPut(d, o, C[1 + (R() < 0.5 ? 1 : 0)], 200);   // einzelne Moos-Krümel im Umfeld
        else if (R() < 0.004) wxPut(d, o, C[2], 220);
      }
    }
    g.putImageData(img, 0, 0);
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
  // Kleine Andeutung für die Bauteilliste (die echte Textur wird erst beim Bauen erzeugt): ein paar Texel-Cluster
  function wxIcon(c, ty, w, h) {
    var R = wxRng(ty.wx === "r" ? 7 : 11), u = Math.min(w, h), px = Math.max(1, Math.round(u / 10));
    var C = ty.wx === "r" ? ["#5C2F1C", "#7A3F22", "#8E4824", "#A8582A"] : ["#2A4019", "#3A5722", "#4B6B2A", "#62853A"];
    c.save(); shapePath(c, ty.shape, w, h); c.clip();
    var blobs = ty.wx === "r" ? [[0.28, 0.3, 0.18], [0.72, 0.66, 0.16], [0.6, 0.22, 0.08], [0.22, 0.78, 0.1], [0.82, 0.3, 0.06]] : [[0.25, 0.28, 0.24], [0.75, 0.72, 0.22], [0.2, 0.8, 0.1]];
    blobs.forEach(function (q) {
      for (var yy = -q[2]; yy <= q[2]; yy += px / u) for (var xx = -q[2]; xx <= q[2]; xx += px / u) {
        if (xx * xx + yy * yy > q[2] * q[2] * (0.6 + R() * 0.6)) continue;
        c.fillStyle = C[Math.floor(R() * C.length)]; c.fillRect(Math.round((q[0] + xx) * w), Math.round((q[1] + yy) * h), px, px);
      }
    });
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
      c.imageSmoothingEnabled = s < WX_PPC * 0.95;   // Texel scharf wie Pixel-Art, solange vergrößert wird
      c.fillStyle = tx.pat; c.fillRect(b.x * s, b.y * s, ff[0] * s, ff[1] * s);
      c.restore();
    } catch (e) { try { c.restore(); } catch (e2) {} }
  }
