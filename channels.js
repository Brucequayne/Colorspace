/* Channel Exporter 0.2 – Bilder im Browser in Kanäle zerlegen und exportieren. Für Color Space.
   Einbindung: channels.js per script-Tag laden, dann Channels.mount(element, "de" | "en") und Channels.unmount().
   Bilder verlassen nie das Gerät.

   Werkzeuge: Jedes Werkzeug in TOOLS liefert eine Liste von Ebenen. Jede Ebene rechnet aus den Pixeln des
   Originals ihr eigenes Bild (render). Bühne, Ziehen, Ein/Aus und Export funktionieren für jedes Werkzeug gleich.
   Ein neues Werkzeug (z. B. Tiefenkarte, Schwarzweiß, Alphakanal) ist nur ein weiterer Eintrag in TOOLS. */
(function () {
  "use strict";

  var VERSION = "0.25", PREVIEW = 2000, MAX_PIX = 40e6;
  var lang = "de";
  function L2(de, en) { return { de: de, en: en }; }
  function tr(o) { return o[lang]; }

  var TX = {
    title: L2("Channel Exporter", "Channel Exporter"),
    intro: L2("Zieh ein Bild auf die Fläche. Das gewählte Werkzeug zerlegt es in Ebenen, zum Beispiel in die Lichtkanäle Rot, Grün und Blau, in die Druckfarben CMYK, in Schatten, Mitten und Lichter oder nach geschätzter Tiefe in Nah, Mitte und Fern. Du kannst die Ebenen verschieben, ausblenden und einzeln oder zusammen exportieren. Das Bild verlässt dein Gerät nicht.",
              "Drop an image onto the area. The selected tool splits it into layers, for example the light channels red, green and blue, the CMYK print inks, shadows, midtones and highlights, or by estimated depth into near, middle and far. You can move and hide the layers and export them one by one or together. The image never leaves your device."),
    drop: L2("Bild hierher ziehen", "Drop an image here"), or: L2("oder", "or"), pick: L2("Bild auswählen", "Choose image"),
    dropNote: L2("JPEG, PNG oder WebP · bleibt auf deinem Gerät", "JPEG, PNG or WebP · stays on your device"),
    other: L2("Anderes Bild", "Other image"), tools: L2("Werkzeuge", "Tools"), more: L2("Weitere Werkzeuge folgen.", "More tools are coming."),
    layers: L2("Ebenen", "Layers"), on: L2("An", "On"), off: L2("Aus", "Off"),
    reset: L2("Zurücksetzen", "Reset"), spread: L2("Verteilen", "Spread"), snap: L2("Einrasten", "Snap to origin"),
    start: L2("Zieh eine Ebene mit Maus oder Finger weg.", "Drag a layer away with mouse or finger."),
    hint: L2("Bring alle Ebenen wieder in Deckung, dann ist das Bild komplett.", "Bring all layers back into line to complete the picture."),
    ok: L2("Deckungsgleich: das Originalbild ist wieder da.", "Perfectly aligned: the original picture is back."),
    exportH: L2("Export", "Export"), look: L2("Kanäle als", "Channels as"),
    tinted: L2("Farbig", "Coloured"), gray: L2("Graustufen", "Greyscale"),
    one: L2("{n} als PNG", "{n} as PNG"), all: L2("Alle Ebenen", "All layers"), comp: L2("Komposition als PNG", "Composite as PNG"),
    compNote: L2("Die Komposition übernimmt Verschiebungen und ausgeblendete Ebenen. Alle Exporte in voller Auflösung: {w} × {h} px.", "The composite keeps offsets and hidden layers. All exports at full resolution: {w} × {h} px."),
    working: L2("Wird berechnet …", "Working …"), saved: L2("Gespeichert: {f}", "Saved: {f}"),
    shrunk: L2("Das Bild war sehr groß und wurde auf {w} × {h} px verkleinert.", "The image was very large and was reduced to {w} × {h} px."),
    bad: L2("Diese Datei konnte nicht als Bild geöffnet werden.", "This file could not be opened as an image."),
    howH: L2("So funktioniert’s", "How it works"),
    how1: L2("Jede Ebene wird pixelgenau aus deinem Bild herausgerechnet, und bei jedem Werkzeug ergeben alle Ebenen deckungsgleich übereinander wieder das Original. Schon wenige Pixel Versatz erzeugen Farbsäume.",
             "Each layer is computed pixel-exactly from your image, and with every tool all layers stacked in line give the original again. A few pixels of offset create colour fringes."),
    howRgb: L2("RGB-Split: Jede Ebene enthält einen Lichtkanal. Auf Schwarz addieren sich die Lichter wieder zu Weiß.", "RGB split: each layer holds one channel of light. On black, the lights add up to white again."),
    howCmyk: L2("CMYK-Split: Das Bild wird in die vier Druckfarben Cyan, Magenta, Gelb und Schwarz (Key) zerlegt, wie bei einer Druckplatte. Auf weißem Papier multiplizieren sich die Farben wieder. Es ist eine einfache Umrechnung ohne Farbprofil, für echten Druck übernimmt das die Druckerei.",
                  "CMYK split: the image is split into the four print inks cyan, magenta, yellow and black (key), like printing plates. On white paper the inks multiply back together. This is a simple conversion without a colour profile; for real printing, the print shop handles that."),
    howDepth: L2("Tiefe: Ein KI-Tiefenmodell (Depth Anything V2 Small) berechnet eine Tiefenkarte wie in der Videobearbeitung: Nahes ist hell, Fernes dunkel. Das Modell läuft komplett in deinem Browser, dein Bild verlässt das Gerät nicht. Beim ersten Mal lädt dein Browser das Modell einmalig von dieser Seite (rund 38 MB), danach kommt es aus dem Cache. Die Kanten werden am Foto ausgerichtet. Das Bild wird danach in Nah, Mitte und Fern geteilt, die drei Ebenen addieren sich exakt zum Original, und leicht gegeneinander verschoben entsteht ein Parallax-Effekt.",
                   "Depth: an AI depth model (Depth Anything V2 Small) computes a depth map like in video editing: near is bright, far is dark. The model runs entirely in your browser, your image never leaves the device. The first time, your browser loads the model once from this site (about 38 MB); after that it comes from the cache. Edges are aligned to the photo. The image is then split into near, middle and far; the three layers add up exactly to the original, and shifted slightly against each other they create a parallax effect."),
    depthH: L2("Tiefenkarte", "Depth map"), depthGray: L2("Tiefenkarte als PNG", "Depth map as PNG"), depthHeat: L2("Tiefenkarte farbig", "Depth map in colour"),
    depthNote: L2("Hell ist nah, dunkel ist fern. Berechnet von einem KI-Modell in deinem Browser.", "Bright is near, dark is far. Computed by an AI model in your browser."),
    depthNoteOld: L2("Hell ist nah, dunkel ist fern. Das KI-Modell war nicht verfügbar, deshalb nur grob geschätzt.", "Bright is near, dark is far. The AI model was not available, so this is only a rough estimate."),
    dWaitH: L2("Tiefenkarte wird erstellt", "Creating depth map"),
    dLoad: L2("KI-Modell wird geladen … {p} %", "Loading AI model … {p} %"),
    dLoadNote: L2("Nur beim ersten Mal, rund 38 MB von dieser Seite. Dein Bild verlässt das Gerät nicht.", "First time only, about 38 MB from this site. Your image never leaves the device."),
    dRun: L2("Tiefe wird berechnet …", "Computing depth …"),
    dRunNote: L2("Das dauert je nach Gerät ein paar Sekunden.", "Depending on your device this takes a few seconds."),
    dFail: L2("Das KI-Modell konnte nicht geladen werden. Es wird die einfache Schätzung verwendet.", "The AI model could not be loaded. The simple estimate is used instead."),
    dQual: L2("Detail der Tiefenkarte", "Depth map detail"), dStd: L2("Standard", "Standard"), dFine: L2("Fein", "Fine"),
    dQualNote: L2("Fein zeigt mehr Details, rechnet aber etwa dreimal so lange.", "Fine shows more detail but takes about three times as long."),
    howTone: L2("Tonwerte: Das Bild wird nach Helligkeit in Schatten, Mitten und Lichter aufgeteilt, mit weichen Übergängen. Die drei Ebenen addieren sich exakt zum Original. Als Graustufen exportiert sind es Luminanzmasken, mit denen man in der Bildbearbeitung gezielt nur die hellen oder dunklen Bereiche bearbeitet.",
                  "Tones: the image is split by brightness into shadows, midtones and highlights, with soft transitions. The three layers add up exactly to the original. Exported as greyscale they are luminosity masks, used in image editing to work on only the bright or dark areas."),
    how2: L2("Bedienung: Ebene mit Maus oder Finger ziehen. Die Zahlentasten wählen eine Ebene, die Pfeiltasten verschieben sie um 1 Pixel (mit Umschalt um 10). „Einrasten“ zieht eine Ebene in ihre Ausgangsposition, sobald sie nah genug ist. Beim Export kannst du die Kanäle farbig oder als Graustufen speichern, Graustufen sind praktisch als Masken in der Bildbearbeitung.",
             "Controls: drag a layer with mouse or finger. Number keys pick a layer, arrow keys move it by 1 pixel (10 with Shift). “Snap to origin” pulls a layer back into place once it is close enough. When exporting you can save the channels in colour or as greyscale, which is handy as masks in image editing.")
  };
  function t(k) { return tr(TX[k]); }
  function fmt(s, o) { return s.replace(/\{(\w+)\}/g, function (_, k) { return o[k]; }); }

  // ---------- Werkzeuge ----------
  function channel(idx) {
    return function (s, o, mode) {
      var n = s.length;
      if (mode === "gray") { for (var i = 0; i < n; i += 4) { var v = s[i + idx]; o[i] = v; o[i + 1] = v; o[i + 2] = v; o[i + 3] = 255; } }
      else { for (var j = 0; j < n; j += 4) { o[j] = idx === 0 ? s[j] : 0; o[j + 1] = idx === 1 ? s[j + 1] : 0; o[j + 2] = idx === 2 ? s[j + 2] : 0; o[j + 3] = 255; } }
    };
  }
  // CMYK: einfache Umrechnung ohne Farbprofil. K = 1 − max(R,G,B), C = (1 − R − K) / (1 − K) usw.
  // Farbig: jede Farbe als Druckfarbe auf Weiß, multipliziert ergibt das exakt das Original. Platte: Farbmenge als Grau.
  function ink(idx) {
    return function (s, o, mode) {
      for (var i = 0; i < s.length; i += 4) {
        var r = s[i] / 255, g = s[i + 1] / 255, b = s[i + 2] / 255, k = 1 - Math.max(r, g, b), v;
        if (idx === 3) v = k; else { var ch = idx === 0 ? r : idx === 1 ? g : b; v = k >= 1 ? 0 : (1 - ch - k) / (1 - k); }
        var w = Math.round(255 * (1 - v));
        if (mode === "gray" || idx === 3) { o[i] = w; o[i + 1] = w; o[i + 2] = w; }
        else { o[i] = idx === 0 ? w : 255; o[i + 1] = idx === 1 ? w : 255; o[i + 2] = idx === 2 ? w : 255; }
        o[i + 3] = 255;
      }
    };
  }
  // Tonwerte: Helligkeit L (Rec. 709) auf drei weiche Bänder verteilt, (1−L)², 2L(1−L), L². Die Summe ist immer 1,
  // also ergeben die drei Ebenen addiert exakt das Original. Graustufen: das Gewicht selbst als Luminanzmaske.
  function tone(band) {
    return function (s, o, mode) {
      for (var i = 0; i < s.length; i += 4) {
        var L = (0.2126 * s[i] + 0.7152 * s[i + 1] + 0.0722 * s[i + 2]) / 255;
        var w = band === 0 ? (1 - L) * (1 - L) : band === 1 ? 2 * L * (1 - L) : L * L;
        if (mode === "gray") { var v = Math.round(w * 255); o[i] = v; o[i + 1] = v; o[i + 2] = v; }
        else { o[i] = Math.round(s[i] * w); o[i + 1] = Math.round(s[i + 1] * w); o[i + 2] = Math.round(s[i + 2] * w); }
        o[i + 3] = 255;
      }
    };
  }
  // Tiefe: geschätzte Tiefenkarte (1 = nah, 0 = fern) in kleiner Auflösung, beim Rendern bilinear hochgerechnet.
  // Merkmale: Bildhöhe, lokale Schärfe, Dunst (hell, ungesättigt, bläulich). Danach weichgezeichnet und normiert.
  function boxBlur(a, w, h, r) {
    var t = new Float32Array(a.length), x, y, i, acc, n;
    for (y = 0; y < h; y++) {
      acc = 0; n = 0;
      for (x = -r; x < w + r; x++) {
        if (x + r < w && x + r >= 0) { acc += a[y * w + x + r]; n++; }
        if (x - r - 1 >= 0) { acc -= a[y * w + x - r - 1]; n--; }
        if (x >= 0 && x < w) t[y * w + x] = acc / n;
      }
    }
    for (x = 0; x < w; x++) {
      acc = 0; n = 0;
      for (y = -r; y < h + r; y++) {
        if (y + r < h && y + r >= 0) { acc += t[(y + r) * w + x]; n++; }
        if (y - r - 1 >= 0) { acc -= t[(y - r - 1) * w + x]; n--; }
        if (y >= 0 && y < h) a[y * w + x] = acc / n;
      }
    }
    return a;
  }
  function pct(a, q) { var b = Array.prototype.slice.call(a).sort(function (u, v) { return u - v; }); return b[Math.min(b.length - 1, Math.floor(q * b.length))]; }
  function norm(a, lo, hi) { var lv = pct(a, lo), hv = pct(a, hi), d = hv - lv || 1; for (var i = 0; i < a.length; i++) a[i] = Math.min(1, Math.max(0, (a[i] - lv) / d)); return a; }
  function computeDepth(src) {
    var f = Math.min(1, 320 / Math.max(src.width, src.height)), w = Math.max(2, Math.round(src.width * f)), h = Math.max(2, Math.round(src.height * f));
    var c = document.createElement("canvas"); c.width = w; c.height = h;
    var x = c.getContext("2d"); x.imageSmoothingQuality = "high"; x.drawImage(src, 0, 0, w, h);
    var d = x.getImageData(0, 0, w, h).data, n = w * h, lum = new Float32Array(n), haze = new Float32Array(n), sharp = new Float32Array(n), i, px, py;
    for (i = 0; i < n; i++) {
      var r = d[i * 4] / 255, g = d[i * 4 + 1] / 255, b = d[i * 4 + 2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      var l = 0.2126 * r + 0.7152 * g + 0.0722 * b, sat = mx > 0 ? (mx - mn) / mx : 0, blue = Math.min(1, Math.max(0, (b - r) * 2 + 0.5));
      lum[i] = l; haze[i] = (1 - sat) * Math.pow(l, 0.7) * (0.6 + 0.4 * blue);
    }
    for (py = 1; py < h - 1; py++) for (px = 1; px < w - 1; px++) {
      i = py * w + px;
      var gx = lum[i + 1 - w] + 2 * lum[i + 1] + lum[i + 1 + w] - lum[i - 1 - w] - 2 * lum[i - 1] - lum[i - 1 + w];
      var gy = lum[i + w - 1] + 2 * lum[i + w] + lum[i + w + 1] - lum[i - w - 1] - 2 * lum[i - w] - lum[i - w + 1];
      sharp[i] = Math.sqrt(gx * gx + gy * gy);
    }
    var R = Math.max(2, Math.round(Math.max(w, h) * 0.04));
    norm(boxBlur(sharp, w, h, R), 0.02, 0.95); norm(boxBlur(haze, w, h, R), 0.02, 0.98);
    var dep = new Float32Array(n);
    for (py = 0; py < h; py++) for (px = 0; px < w; px++) { i = py * w + px; dep[i] = 0.42 * (py / (h - 1)) + 0.33 * sharp[i] + 0.25 * (1 - haze[i]); }
    var R2 = Math.max(2, Math.round(Math.max(w, h) * 0.03));
    boxBlur(dep, w, h, R2); boxBlur(dep, w, h, R2);
    norm(dep, 0.02, 0.98);
    return { w: w, h: h, d: dep };
  }
  // ---------- KI-Tiefe: Depth Anything V2 Small (Apache 2.0) über ONNX Runtime Web ----------
  // Modell und Laufzeit liegen im Ordner depth/ dieser Seite. Das Modell ist in zwei Teile geteilt (Upload-Grenze bei GitHub)
  // und wird im Browser wieder zusammengesetzt. Geladen wird erst, wenn jemand das Werkzeug Tiefe benutzt.
  var AI = { sess: null, loading: null, queue: Promise.resolve(), prog: null };
  var MODEL_PARTS = ["depth-anything-v2-small.part1", "depth-anything-v2-small.part2"], MODEL_BYTES = 27258801;
  function aiBase() { return new URL("depth/", location.href).href; }
  function loadScript(src) {
    return new Promise(function (res, rej) {
      if (window.ort) return res();
      var sc = document.createElement("script"); sc.src = src; sc.onload = function () { res(); }; sc.onerror = function () { rej(new Error("ort")); };
      document.head.appendChild(sc);
    });
  }
  function aiSession() {
    if (AI.sess) return Promise.resolve(AI.sess);
    if (!AI.loading) AI.loading = (async function () {
      if (typeof WebAssembly === "undefined") throw new Error("no wasm");
      await loadScript(aiBase() + "ort.wasm.min.js");
      var ort = window.ort;
      ort.env.wasm.wasmPaths = aiBase();
      ort.env.wasm.numThreads = self.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 1) : 1;
      ort.env.wasm.proxy = true;   // rechnet in einem Worker, die Seite bleibt bedienbar
      var got = 0, chunks = [];
      for (var k = 0; k < MODEL_PARTS.length; k++) {
        var r = await fetch(aiBase() + MODEL_PARTS[k]);
        if (!r.ok) throw new Error("model " + r.status);
        if (r.body && r.body.getReader) {
          var rd = r.body.getReader();
          for (;;) { var c = await rd.read(); if (c.done) break; chunks.push(c.value); got += c.value.length; if (AI.prog) AI.prog(Math.min(1, got / MODEL_BYTES)); }
        } else { var ab = new Uint8Array(await r.arrayBuffer()); chunks.push(ab); got += ab.length; if (AI.prog) AI.prog(Math.min(1, got / MODEL_BYTES)); }
      }
      var buf = new Uint8Array(got), off = 0;
      chunks.forEach(function (c) { buf.set(c, off); off += c.length; });
      chunks = null;
      AI.sess = await ort.InferenceSession.create(buf, { executionProviders: ["wasm"], graphOptimizationLevel: "all" });
      return AI.sess;
    })().catch(function (e) { AI.loading = null; throw e; });
    return AI.loading;
  }
  // Modell auf das Bild anwenden. Längere Seite = size, beide Seiten Vielfache von 14. Ergebnis 1 = nah, 0 = fern.
  function aiDepth(src, size) {
    var job = AI.queue.then(async function () {
      var sess = await aiSession(), ort = window.ort;
      var sc = size / Math.max(src.width, src.height);
      var w = Math.max(14, Math.round(src.width * sc / 14) * 14), h = Math.max(14, Math.round(src.height * sc / 14) * 14);
      var c = document.createElement("canvas"); c.width = w; c.height = h;
      var x = c.getContext("2d"); x.imageSmoothingQuality = "high"; x.drawImage(src, 0, 0, w, h);
      var d = x.getImageData(0, 0, w, h).data, n = w * h, f = new Float32Array(3 * n), M = [0.485, 0.456, 0.406], SD = [0.229, 0.224, 0.225];
      for (var i = 0; i < n; i++) for (var k = 0; k < 3; k++) f[k * n + i] = (d[i * 4 + k] / 255 - M[k]) / SD[k];
      var feeds = {}; feeds[sess.inputNames[0]] = new ort.Tensor("float32", f, [1, 3, h, w]);
      var out = await sess.run(feeds), o = out[sess.outputNames[0]];
      var dims = o.dims, ow = dims[dims.length - 1], oh = dims[dims.length - 2];
      var dep = new Float32Array(o.data);
      norm(dep, 0.005, 0.995);
      return { w: ow, h: oh, d: dep };
    });
    AI.queue = job.catch(function () {});
    return job;
  }
  // Kanten der Tiefenkarte am Foto ausrichten (Guided Filter nach He et al.), in höchstens 1600 px.
  function refineDepth(D, src) {
    var f = Math.min(1, 1600 / Math.max(src.width, src.height)), w = Math.max(2, Math.round(src.width * f)), h = Math.max(2, Math.round(src.height * f));
    var c = document.createElement("canvas"); c.width = w; c.height = h;
    var x = c.getContext("2d"); x.imageSmoothingQuality = "high"; x.drawImage(src, 0, 0, w, h);
    var d = x.getImageData(0, 0, w, h).data, n = w * h, I = new Float32Array(n), i;
    for (i = 0; i < n; i++) I[i] = (0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) / 255;
    var p = depthAt(D, w, h), r = Math.max(2, Math.round(Math.max(w, h) / 200)), eps = 0.002;
    var mI = boxBlur(I.slice(), w, h, r), mP = boxBlur(p.slice(), w, h, r), II = new Float32Array(n), IP = new Float32Array(n);
    for (i = 0; i < n; i++) { II[i] = I[i] * I[i]; IP[i] = I[i] * p[i]; }
    boxBlur(II, w, h, r); boxBlur(IP, w, h, r);
    var A = new Float32Array(n), B = new Float32Array(n);
    for (i = 0; i < n; i++) { var vI = II[i] - mI[i] * mI[i], cv = IP[i] - mI[i] * mP[i]; A[i] = cv / (vI + eps); B[i] = mP[i] - A[i] * mI[i]; }
    boxBlur(A, w, h, r); boxBlur(B, w, h, r);
    for (i = 0; i < n; i++) p[i] = Math.min(1, Math.max(0, A[i] * I[i] + B[i]));
    return { w: w, h: h, d: p };
  }
  var depthJob = 0;
  function startDepth() {
    var job = ++depthJob, img = IMG, size = S.dq === "fine" ? 770 : 518;
    AI.prog = function (q) { if (job === depthJob) setWait(fmt(t("dLoad"), { p: Math.round(q * 100) }), t("dLoadNote")); };
    if (AI.sess) setWait(t("dRun"), t("dRunNote"));
    aiSession().then(function () {
      if (job === depthJob) setWait(t("dRun"), t("dRunNote"));
      return aiDepth(img.prev, size);
    }).then(function (D) {
      img.depth = refineDepth(D, img.prev); img.depthAI = true; img.depthQ = S.dq;
    }).catch(function (e) {
      if (window.console) console.warn("Tiefe: KI nicht verfügbar", e);
      img.depth = computeDepth(img.prev); img.depthAI = false; img.depthQ = S.dq; img.depthErr = true;
    }).then(function () {
      img.dcache = null;
      if (job === depthJob && V && IMG === img && tool().depth) build();
    });
  }
  function setWait(h, sub) {
    var a = V && V.root.querySelector("#ch-dst"), b = V && V.root.querySelector("#ch-dsub");
    if (a) a.textContent = h; if (b) b.textContent = sub || "";
  }
  function depthAt(D, W, H) {   // Tiefe für ein Bild der Größe W × H, bilinear
    var out = new Float32Array(W * H), sx = D.w / W, sy = D.h / H;
    for (var y = 0; y < H; y++) {
      var fy = Math.min(D.h - 1, Math.max(0, (y + 0.5) * sy - 0.5)), y0 = Math.floor(fy), y1 = Math.min(D.h - 1, y0 + 1), ty = fy - y0;
      for (var x = 0; x < W; x++) {
        var fx = Math.min(D.w - 1, Math.max(0, (x + 0.5) * sx - 0.5)), x0 = Math.floor(fx), x1 = Math.min(D.w - 1, x0 + 1), tx = fx - x0;
        var a = D.d[y0 * D.w + x0] * (1 - tx) + D.d[y0 * D.w + x1] * tx, b = D.d[y1 * D.w + x0] * (1 - tx) + D.d[y1 * D.w + x1] * tx;
        out[y * W + x] = a * (1 - ty) + b * ty;
      }
    }
    return out;
  }
  function depthOf(w, h) {
    if (!IMG.depth) IMG.depth = computeDepth(IMG.prev);
    var key = w + "x" + h;
    if (!IMG.dcache || IMG.dcache.key !== key) IMG.dcache = { key: key, a: depthAt(IMG.depth, w, h) };
    return IMG.dcache.a;
  }
  function depthBand(band) {
    return function (s, o, mode, w, h) {
      var D = depthOf(w, h);
      for (var i = 0, p = 0; i < s.length; i += 4, p++) {
        var z = D[p], wt = band === 0 ? z * z : band === 1 ? 2 * z * (1 - z) : (1 - z) * (1 - z);
        if (mode === "gray") { var v = Math.round(wt * 255); o[i] = v; o[i + 1] = v; o[i + 2] = v; }
        else { o[i] = Math.round(s[i] * wt); o[i + 1] = Math.round(s[i + 1] * wt); o[i + 2] = Math.round(s[i + 2] * wt); }
        o[i + 3] = 255;
      }
    };
  }
  // Farbverlauf fern → nah wie eine Wärmebildkamera: Schwarz, Violett, Magenta, Orange, Gelb, Weiß
  var HEAT = [[6, 4, 16], [52, 14, 102], [150, 28, 128], [226, 84, 38], [255, 186, 40], [255, 250, 226]];
  function depthMap(W, H, heat) {
    var c = document.createElement("canvas"); c.width = W; c.height = H;
    var x = c.getContext("2d"), od = x.createImageData(W, H), o = od.data, D = depthOf(W, H);
    for (var p = 0, i = 0; p < D.length; p++, i += 4) {
      var z = D[p];
      if (heat) { var f = z * (HEAT.length - 1), k = Math.min(HEAT.length - 2, Math.floor(f)), u = f - k; for (var j = 0; j < 3; j++) o[i + j] = Math.round(HEAT[k][j] * (1 - u) + HEAT[k + 1][j] * u); }
      else { var v = Math.round(z * 255); o[i] = v; o[i + 1] = v; o[i + 2] = v; }
      o[i + 3] = 255;
    }
    x.putImageData(od, 0, 0);
    return c;
  }
  var PLUS = typeof CSS !== "undefined" && CSS.supports && CSS.supports("mix-blend-mode", "plus-lighter") ? "plus-lighter" : "screen";
  function cssBlend(T) { return T.blend === "add" ? PLUS : T.blend; }
  function modeName(T, m) { return m === "gray" && T.grayName ? tr(T.grayName) : t(m); }
  var TOOLS = [
    { id: "rgb", name: L2("RGB-Split", "RGB split"), short: "rgb",
      desc: L2("Trennt das Bild in die Lichtkanäle Rot, Grün und Blau.", "Splits the image into the red, green and blue channels of light."),
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="9" r="6" fill="#E5484D"/><circle cx="15" cy="9" r="6" fill="#30A46C" style="mix-blend-mode:screen"/><circle cx="12" cy="15" r="6" fill="#3E63DD" style="mix-blend-mode:screen"/></svg>',
      modes: ["tinted", "gray"], blend: "screen",
      spread: [[-0.17, -0.09], [0.15, -0.05], [0.01, 0.13]],
      layers: [
        { k: "r", name: L2("Rot", "Red"), file: L2("rot", "red"), color: "#E5484D", render: channel(0) },
        { k: "g", name: L2("Grün", "Green"), file: L2("gruen", "green"), color: "#30A46C", render: channel(1) },
        { k: "b", name: L2("Blau", "Blue"), file: L2("blau", "blue"), color: "#3E63DD", render: channel(2) }
      ] },
    { id: "cmyk", name: L2("CMYK-Split", "CMYK split"), short: "cmyk",
      desc: L2("Zerlegt das Bild in die Druckfarben Cyan, Magenta, Gelb und Schwarz.", "Splits the image into the print inks cyan, magenta, yellow and black."),
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" fill="#fff"/><circle cx="9" cy="9" r="6" fill="#00AEEF"/><circle cx="15" cy="9" r="6" fill="#EC008C" style="mix-blend-mode:multiply"/><circle cx="12" cy="15" r="6" fill="#FFF200" style="mix-blend-mode:multiply"/></svg>',
      modes: ["tinted", "gray"], grayName: L2("Druckplatten", "Plates"), graySuffix: "platte", blend: "multiply", bg: "#fff",
      spread: [[-0.16, -0.1], [0.15, -0.08], [-0.05, 0.14], [0.12, 0.12]],
      layers: [
        { k: "c", name: L2("Cyan", "Cyan"), file: L2("cyan", "cyan"), color: "#00AEEF", render: ink(0) },
        { k: "m", name: L2("Magenta", "Magenta"), file: L2("magenta", "magenta"), color: "#EC008C", render: ink(1) },
        { k: "y", name: L2("Gelb", "Yellow"), file: L2("gelb", "yellow"), color: "#FFF200", render: ink(2) },
        { k: "k", name: L2("Schwarz (Key)", "Black (key)"), file: L2("schwarz", "black"), color: "#1A1A1A", render: ink(3) }
      ] },
    { id: "tone", name: L2("Tonwerte", "Tones"), short: "tonwerte",
      desc: L2("Teilt das Bild nach Helligkeit in Schatten, Mitten und Lichter. Als Graustufen sind es Luminanzmasken.", "Splits the image by brightness into shadows, midtones and highlights. As greyscale they are luminosity masks."),
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="3" width="6" height="18" fill="#2B2D42"/><rect x="9" y="3" width="6" height="18" fill="#8D8A7E"/><rect x="16" y="3" width="6" height="18" fill="#EFE6CF"/></svg>',
      modes: ["tinted", "gray"], grayName: L2("Luminanzmasken", "Luminosity masks"), graySuffix: "maske", blend: "add",
      spread: [[-0.17, -0.06], [0.0, 0.12], [0.17, -0.06]],
      layers: [
        { k: "s", name: L2("Schatten", "Shadows"), file: L2("schatten", "shadows"), color: "#2B2D42", render: tone(0) },
        { k: "m", name: L2("Mitten", "Midtones"), file: L2("mitten", "midtones"), color: "#8D8A7E", render: tone(1) },
        { k: "h", name: L2("Lichter", "Highlights"), file: L2("lichter", "highlights"), color: "#EFE6CF", render: tone(2) }
      ] },
    { id: "depth", name: L2("Tiefe", "Depth"), short: "tiefe", depth: true,
      desc: L2("Ein KI-Modell berechnet in deinem Browser eine Tiefenkarte und teilt das Bild in Nah, Mitte und Fern. Leicht verschoben entsteht Parallax.", "An AI model computes a depth map in your browser and splits the image into near, middle and far. Shifted slightly, it gives parallax."),
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="3" width="20" height="5" fill="#2E3A5C"/><rect x="2" y="9.5" width="20" height="5" fill="#5F8A86"/><rect x="2" y="16" width="20" height="5" fill="#E8D9A8"/></svg>',
      modes: ["tinted", "gray"], grayName: L2("Tiefenmasken", "Depth masks"), graySuffix: "maske", blend: "add",
      spread: [[0.05, 0.015], [0, 0], [-0.04, -0.01]],
      layers: [
        { k: "n", name: L2("Nah", "Near"), file: L2("nah", "near"), color: "#E8D9A8", render: depthBand(0) },
        { k: "m", name: L2("Mitte", "Middle"), file: L2("mitte", "middle"), color: "#5F8A86", render: depthBand(1) },
        { k: "f", name: L2("Fern", "Far"), file: L2("fern", "far"), color: "#2E3A5C", render: depthBand(2) }
      ] }
  ];
  function tool() { return TOOLS.filter(function (x) { return x.id === S.tool; })[0] || TOOLS[0]; }

  // ---------- Zustand ----------
  var S = { tool: "rgb", mode: "tinted", snap: true, dq: "std" };
  var IMG = null;   // { name, full (canvas), w, h, prev (canvas), pw, ph }
  var L = null;     // { x:{}, y:{}, on:{}, z:[], active, touched }
  var V = null;     // UI

  function resetLayers() {
    var T = tool(); L = { x: {}, y: {}, on: {}, z: [], active: T.layers[0].k, touched: false };
    T.layers.forEach(function (l) { L.x[l.k] = 0; L.y[l.k] = 0; L.on[l.k] = true; L.z.push(l.k); });
  }

  // ---------- Laden ----------
  function loadFile(file) {
    if (!file || !/^image\//.test(file.type || "") && !/\.(jpe?g|png|webp|gif|bmp|avif)$/i.test(file.name || "")) { note(t("bad")); return; }
    var url = URL.createObjectURL(file), im = new Image();
    im.onload = function () {
      var w = im.naturalWidth, h = im.naturalHeight, f = Math.min(1, Math.sqrt(MAX_PIX / (w * h)));
      w = Math.max(1, Math.round(w * f)); h = Math.max(1, Math.round(h * f));
      var full = document.createElement("canvas"); full.width = w; full.height = h;
      full.getContext("2d").drawImage(im, 0, 0, w, h);
      var pf = Math.min(1, PREVIEW / Math.max(w, h)), pw = Math.max(1, Math.round(w * pf)), ph = Math.max(1, Math.round(h * pf));
      var prev = document.createElement("canvas"); prev.width = pw; prev.height = ph;
      var px = prev.getContext("2d"); px.imageSmoothingQuality = "high"; px.drawImage(full, 0, 0, pw, ph);
      URL.revokeObjectURL(url);
      IMG = { name: (file.name || "bild").replace(/\.[^.]+$/, ""), full: full, w: w, h: h, prev: prev, pw: pw, ph: ph, shrunk: f < 1 };
      resetLayers();
      if (V) build();
    };
    im.onerror = function () { URL.revokeObjectURL(url); note(t("bad")); };
    im.src = url;
  }

  // Ebene aus einer Quelle (Vorschau oder volle Auflösung) rechnen
  function renderLayer(src, layer, mode) {
    var w = src.width, h = src.height, sx = src.getContext("2d"), sd = sx.getImageData(0, 0, w, h);
    var c = document.createElement("canvas"); c.width = w; c.height = h;
    var cx = c.getContext("2d"), od = cx.createImageData(w, h);
    layer.render(sd.data, od.data, mode, w, h);
    cx.putImageData(od, 0, 0);
    return c;
  }

  // ---------- Bühne ----------
  var ds = 1, org = { x: 0, y: 0 }, drag = null, animT = 0;
  function stage() { return V && V.root.querySelector("#ch-stage"); }
  function layout() {
    var st = stage(); if (!st || !IMG) return;
    var sw = st.clientWidth, sh = st.clientHeight, m = 18;
    ds = Math.min((sw - 2 * m) / IMG.w, (sh - 2 * m) / IMG.h, IMG.pw / IMG.w * 1.5);
    var dw = IMG.w * ds, dh = IMG.h * ds;
    org = { x: (sw - dw) / 2, y: (sh - dh) / 2 };
    Array.prototype.forEach.call(st.querySelectorAll(".ch-lyr"), function (c) {
      var k = c.getAttribute("data-k");
      c.style.width = dw + "px"; c.style.height = dh + "px";
      c.style.left = (org.x + L.x[k] * ds) + "px"; c.style.top = (org.y + L.y[k] * ds) + "px";
    });
    drawAdd(st);
    var side = V.root.querySelector("#ch-side");
    if (side) side.style.maxHeight = window.innerWidth >= 1100 ? V.root.querySelector(".ch-deskbox").offsetHeight + "px" : "";
    status();
  }
  // Browser ohne mix-blend-mode "plus-lighter": addierende Werkzeuge exakt auf einer Leinwand darüber zeichnen.
  // Die Ebenen bleiben unsichtbar darunter liegen, damit man sie weiter greifen kann.
  function drawAdd(st) {
    var cv = st.querySelector(".ch-addcv"); if (!cv) return;
    var dpr = window.devicePixelRatio || 1, W = Math.round(st.clientWidth * dpr), H = Math.round(st.clientHeight * dpr);
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    var x = cv.getContext("2d"); x.globalCompositeOperation = "source-over"; x.fillStyle = "#000"; x.fillRect(0, 0, W, H);
    x.globalCompositeOperation = "lighter";
    L.z.forEach(function (k) {
      if (!L.on[k]) return;
      var c = st.querySelector('.ch-lyr[data-k="' + k + '"]');
      x.drawImage(c, (org.x + L.x[k] * ds) * dpr, (org.y + L.y[k] * ds) * dpr, IMG.w * ds * dpr, IMG.h * ds * dpr);
    });
  }
  function clampPos(nx, ny) {
    var st = stage(), sw = st.clientWidth, sh = st.clientHeight, dw = IMG.w * ds, dh = IMG.h * ds;
    var l = Math.min(Math.max(org.x + nx * ds, -dw * 0.8), sw - dw * 0.2);
    var tp = Math.min(Math.max(org.y + ny * ds, -dh * 0.8), sh - dh * 0.2);
    return { x: (l - org.x) / ds, y: (tp - org.y) / ds };
  }
  function setPos(k, nx, ny) {
    var p = clampPos(nx, ny);
    if (S.snap && Math.sqrt(p.x * p.x + p.y * p.y) * ds < 7) { p.x = 0; p.y = 0; }
    L.x[k] = p.x; L.y[k] = p.y;
  }
  function animate() {
    var st = stage(); if (!st) return;
    st.classList.add("anim"); clearTimeout(animT);
    animT = setTimeout(function () { if (st.isConnected) st.classList.remove("anim"); }, 450);
  }
  function select(k) {
    L.active = k; L.z = L.z.filter(function (x) { return x !== k; }).concat(k);
    L.z.forEach(function (key, i) { var c = V.root.querySelector('.ch-lyr[data-k="' + key + '"]'); if (c) c.style.zIndex = i + 1; });
    Array.prototype.forEach.call(V.root.querySelectorAll("[data-sel]"), function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-sel") === k)); });
  }
  function sg(n) { return (n > 0 ? "+" : n < 0 ? "−" : "±") + Math.abs(n); }
  function status() {
    if (!V || !IMG) return;
    var al = true;
    tool().layers.forEach(function (l) {
      var x = L.x[l.k], y = L.y[l.k], el = V.root.querySelector("#ch-o-" + l.k);
      if (el) el.textContent = "x " + sg(Math.round(x)) + "  y " + sg(Math.round(y));
      if (!L.on[l.k] || Math.abs(x) >= 0.5 || Math.abs(y) >= 0.5) al = false;
    });
    var s = V.root.querySelector("#ch-stat");
    if (s) { s.textContent = al ? (L.touched ? t("ok") : t("start")) : t("hint"); s.classList.toggle("ok", al && L.touched); }
  }
  function eyes() {
    tool().layers.forEach(function (l) {
      var b = V.root.querySelector('[data-vis="' + l.k + '"]'), c = V.root.querySelector('.ch-lyr[data-k="' + l.k + '"]');
      if (b) { b.setAttribute("aria-pressed", String(L.on[l.k])); b.textContent = L.on[l.k] ? t("on") : t("off"); }
      if (c) c.classList.toggle("off", !L.on[l.k]);
    });
    var st = stage(); if (st && IMG) drawAdd(st);
  }

  // ---------- Export ----------
  function download(canvas, fname) {
    return new Promise(function (res) {
      canvas.toBlob(function (b) {
        var url = URL.createObjectURL(b), a = document.createElement("a");
        a.href = url; a.download = fname; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
        res();
      }, "image/png");
    });
  }
  function later() { return new Promise(function (r) { setTimeout(r, 30); }); }
  var busy = false;
  async function exportLayers(keys) {
    if (busy || !IMG) return; busy = true; note(t("working")); await later();
    try {
      var T = tool(), names = [];
      for (var i = 0; i < keys.length; i++) {
        var l = T.layers.filter(function (q) { return q.k === keys[i]; })[0];
        var f = IMG.name + "-" + tr(l.file) + (S.mode === "gray" ? "-" + (T.graySuffix || "grau") : "") + ".png";
        await download(renderLayer(IMG.full, l, S.mode), f); names.push(f);
        if (i < keys.length - 1) await new Promise(function (r) { setTimeout(r, 400); });
      }
      note(fmt(t("saved"), { f: names.join(", ") }));
    } finally { busy = false; if (IMG) IMG.dcache = null; }
  }
  async function exportComp() {
    if (busy || !IMG) return; busy = true; note(t("working")); await later();
    try {
      var T = tool(), c = document.createElement("canvas"); c.width = IMG.w; c.height = IMG.h;
      var x = c.getContext("2d"); x.fillStyle = T.bg || "#000"; x.fillRect(0, 0, IMG.w, IMG.h);
      x.globalCompositeOperation = { screen: "screen", multiply: "multiply", add: "lighter" }[T.blend] || "source-over";
      T.layers.forEach(function (l) { if (L.on[l.k]) x.drawImage(renderLayer(IMG.full, l, "tinted"), Math.round(L.x[l.k]), Math.round(L.y[l.k])); });
      var f = IMG.name + "-" + T.short + "-komposition.png";
      await download(c, f); note(fmt(t("saved"), { f: f }));
    } finally { busy = false; if (IMG) IMG.dcache = null; }
  }

  async function exportDepth(heat) {
    if (busy || !IMG) return; busy = true; note(t("working")); await later();
    try {
      var f = IMG.name + "-tiefenkarte" + (heat ? "-farbig" : "") + ".png";
      await download(depthMap(IMG.w, IMG.h, heat), f); IMG.dcache = null; note(fmt(t("saved"), { f: f }));
    } finally { busy = false; }
  }

  // ---------- Oberfläche ----------
  var CSS = ".ch-ver{display:inline-block;margin-left:10px;padding:1px 8px;border:1px solid var(--line);font:600 .75rem var(--f-body);color:var(--soft);vertical-align:middle}" +
    ".ch-wrap{display:grid;grid-template-columns:minmax(0,1fr);gap:20px;margin-top:22px}" +
    ".ch-stage{position:relative;width:100%;aspect-ratio:4/5;max-height:80vh;min-height:320px;background:#000;overflow:hidden;isolation:isolate;user-select:none;-webkit-user-select:none;touch-action:none}" +
    ".ch-stage.empty{display:grid;place-items:center;background:#1E1F22}" +
    ".ch-stage.over{outline:3px dashed #E3B83F;outline-offset:-10px}" +
    ".ch-stage:focus-visible{outline:2px solid var(--accent);outline-offset:3px}" +
    ".ch-lyr{position:absolute;display:block;max-width:none;cursor:grab;touch-action:none}" +
    ".ch-addcv{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:50}" +
    ".ch-lyr.grab{cursor:grabbing}.ch-lyr.off{display:none}.ch-stage.anim .ch-lyr{transition:left .4s ease,top .4s ease}" +
    ".ch-drop{text-align:center;color:#F1EFEA;display:flex;flex-direction:column;align-items:center;gap:10px;padding:20px}" +
    ".ch-drop b{font:600 1.4rem/1.2 var(--f-display)}.ch-drop span{color:rgba(241,239,234,.7)}" +
    ".ch-wait #ch-dst{color:#F1EFEA;font-weight:600;font-variant-numeric:tabular-nums}.ch-wait #ch-dsub{max-width:36ch;font-size:.9rem}" +
    ".ch-spin{width:34px;height:34px;border:3px solid rgba(241,239,234,.25);border-top-color:#E8A04A;animation:chspin .9s linear infinite}" +
    "@keyframes chspin{to{transform:rotate(360deg)}}@media (prefers-reduced-motion:reduce){.ch-spin{animation:none}}" +
    ".ch-pick{font:600 1rem var(--f-body);padding:12px 20px;border:0;background:#F1EFEA;color:#151715;cursor:pointer}" +
    ".ch-side{display:flex;flex-direction:column;gap:14px;min-width:0}" +
    ".ch-box{border:1px solid var(--line);background:var(--card,transparent);padding:14px 16px;display:flex;flex-direction:column;gap:12px}" +
    ".ch-box h3{font:600 .78rem/1 var(--f-body);letter-spacing:.12em;text-transform:uppercase;color:var(--soft);margin:0}" +
    ".ch-desc{margin:0;color:var(--soft);font-size:.88rem;line-height:1.45}" +
    ".ch-tools{display:flex;flex-wrap:wrap;gap:8px}" +
    ".ch-tool{display:flex;align-items:center;gap:8px;font:600 .9rem var(--f-body);padding:8px 12px;border:1px solid var(--line);background:transparent;color:var(--ink);cursor:pointer}" +
    ".ch-tool svg{width:20px;height:20px;display:block}" +
    ".ch-tool[aria-pressed=true]{background:var(--ink);color:var(--bg);border-color:var(--ink)}" +
    ".ch-chip{display:flex;align-items:stretch;border:1px solid var(--line);overflow:hidden}" +
    ".ch-chip button{font:inherit;color:var(--ink);background:transparent;border:0;cursor:pointer}" +
    ".ch-chip .sel{flex:1;display:grid;grid-template-columns:auto 1fr;column-gap:10px;align-items:center;text-align:left;padding:8px 14px 8px 12px}" +
    ".ch-chip .sel i{width:14px;height:14px;border-radius:50%;grid-row:1/3}" +
    ".ch-chip .sel b{font-weight:600;line-height:1.2}" +
    ".ch-chip .sel span{font:500 .78rem/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--soft);white-space:pre}" +
    ".ch-chip .sel[aria-pressed=true]{background:var(--ink);color:var(--bg)}.ch-chip .sel[aria-pressed=true] span{color:inherit;opacity:.8}" +
    ".ch-chip .eye{padding:0 14px;border-left:1px solid var(--line);font-weight:600;font-size:.85rem;min-width:56px;color:var(--soft)}" +
    ".ch-chip .eye[aria-pressed=true]{color:var(--ink)}" +
    ".ch-btns{display:flex;flex-wrap:wrap;gap:8px;align-items:center}" +
    ".ch-snap{display:inline-flex;align-items:center;gap:8px;font-weight:500;cursor:pointer;font-size:.92rem}.ch-snap input{width:18px;height:18px;accent-color:var(--accent)}" +
    ".ch-stat{margin:0;color:var(--soft);font-size:.88rem;min-height:1.3em}.ch-stat.ok{color:var(--accent);font-weight:600}" +
    ".ch-seg{display:flex}.ch-seg button{flex:1;font:600 .88rem var(--f-body);padding:8px 10px;border:1px solid var(--line);background:transparent;color:var(--ink);cursor:pointer}" +
    ".ch-seg button+button{border-left:0}.ch-seg button[aria-pressed=true]{background:var(--ink);color:var(--bg);border-color:var(--ink)}" +
    ".ch-save{font:600 1rem var(--f-body);padding:12px 18px;border:0;background:var(--ink);color:var(--bg);cursor:pointer}" +
    ".ch-dh{margin-top:6px!important}.ch-dprev{display:grid;grid-template-columns:1fr 1fr;gap:6px}.ch-dprev canvas{width:100%;height:auto;display:block;background:#000}" +
    ".ch-note{margin:0;color:var(--soft);font-size:.88rem;min-height:1.3em;overflow-wrap:anywhere}" +
    "@media (min-width:1100px){" +
      ".ch-wrap{width:min(calc(100vw - 48px),2200px);margin-left:calc((100% - min(calc(100vw - 48px),2200px)) / 2);grid-template-columns:minmax(0,3fr) minmax(300px,1fr);align-items:start}" +
      ".ch-stage{aspect-ratio:16/9;max-height:calc(100vh - 40px)}.ch-deskbox{position:sticky;top:20px}" +
      ".ch-side{position:sticky;top:20px;overflow-y:auto;padding-right:4px;scrollbar-width:thin}" +
    "}";

  function html() {
    return '<h1 class="ptitle">' + t("title") + '<span class="ch-ver">v' + VERSION + '</span></h1><p class="pintro">' + t("intro") + "</p>" +
      '<div class="ch-wrap"><div class="ch-deskbox"><div class="ch-stage" id="ch-stage" tabindex="0"></div><input type="file" id="ch-file" accept="image/*" hidden></div>' +
      '<div class="ch-side" id="ch-side"></div></div>' +
      '<section class="phow"><h2>' + t("howH") + "</h2><p>" + t("how1") + "</p><p>" + t("howRgb") + "</p><p>" + t("howCmyk") + "</p><p>" + t("howTone") + "</p><p>" + t("howDepth") + "</p><p>" + t("how2") + "</p></section>";
  }
  function toolsBox() {
    return '<div class="ch-box"><h3>' + t("tools") + '</h3><div class="ch-tools">' +
      TOOLS.map(function (T) { return '<button type="button" class="ch-tool" data-tool="' + T.id + '" aria-pressed="' + (T.id === S.tool) + '" title="' + tr(T.desc) + '">' + T.icon + tr(T.name) + "</button>"; }).join("") +
      '</div><p class="ch-desc">' + tr(tool().desc) + " " + t("more") + "</p></div>";
  }
  function build() {
    var st = stage(), side = V.root.querySelector("#ch-side");
    if (!IMG) {
      st.classList.add("empty"); st.style.background = "";
      st.innerHTML = '<div class="ch-drop"><b>' + t("drop") + "</b><span>" + t("or") + '</span><button type="button" class="ch-pick" data-act="pick">' + t("pick") + '</button><span id="ch-dn">' + t("dropNote") + "</span></div>";
      side.innerHTML = toolsBox();
      return;
    }
    var T = tool();
    if (T.depth && (!IMG.depth || IMG.depthQ !== S.dq)) {
      IMG.depth = null; IMG.dcache = null;
      st.classList.add("empty"); st.style.background = "";
      st.innerHTML = '<div class="ch-drop ch-wait"><i class="ch-spin" aria-hidden="true"></i><b>' + t("dWaitH") + '</b><span id="ch-dst" aria-live="polite">' + (AI.sess ? t("dRun") : fmt(t("dLoad"), { p: 0 })) + '</span><span id="ch-dsub">' + (AI.sess ? t("dRunNote") : t("dLoadNote")) + "</span></div>";
      side.innerHTML = toolsBox();
      startDepth();
      return;
    }
    st.classList.remove("empty");
    st.style.background = T.bg || "#000";
    st.innerHTML = "";
    L.z.forEach(function (k, i) {
      var l = T.layers.filter(function (q) { return q.k === k; })[0], c = renderLayer(IMG.prev, l, "tinted");
      c.className = "ch-lyr" + (L.on[k] ? "" : " off"); c.setAttribute("data-k", k);
      c.setAttribute("aria-label", tr(l.name)); c.style.zIndex = i + 1; c.style.mixBlendMode = cssBlend(T);
      st.appendChild(c);
    });
    if (T.blend === "add" && PLUS !== "plus-lighter") {
      Array.prototype.forEach.call(st.querySelectorAll(".ch-lyr"), function (c) { c.style.opacity = "0"; c.style.mixBlendMode = "normal"; });
      var ac = document.createElement("canvas"); ac.className = "ch-addcv"; st.appendChild(ac);
    }
    var chips = T.layers.map(function (l) {
      return '<div class="ch-chip"><button type="button" class="sel" data-sel="' + l.k + '" aria-pressed="' + (L.active === l.k) + '"><i style="background:' + l.color + '"></i><b>' + tr(l.name) + '</b><span id="ch-o-' + l.k + '"></span></button>' +
        '<button type="button" class="eye" data-vis="' + l.k + '" aria-pressed="' + L.on[l.k] + '">' + (L.on[l.k] ? t("on") : t("off")) + "</button></div>";
    }).join("");
    var seg = T.modes.length > 1 ? '<div class="ch-desc">' + t("look") + '</div><div class="ch-seg">' + T.modes.map(function (m) { return '<button type="button" data-mode="' + m + '" aria-pressed="' + (S.mode === m) + '">' + modeName(T, m) + "</button>"; }).join("") + "</div>" : "";
    side.innerHTML = '<div class="ch-btns"><button type="button" class="navbtn" data-act="pick">' + t("other") + "</button></div>" + toolsBox() +
      '<div class="ch-box"><h3>' + t("layers") + "</h3>" + chips +
      '<div class="ch-btns"><button type="button" class="navbtn" data-act="reset">' + t("reset") + '</button><button type="button" class="navbtn" data-act="spread">' + t("spread") + '</button><label class="ch-snap"><input type="checkbox" data-snap' + (S.snap ? " checked" : "") + "> " + t("snap") + "</label></div>" +
      '<p class="ch-stat" id="ch-stat" aria-live="polite"></p></div>' +
      '<div class="ch-box"><h3>' + t("exportH") + "</h3>" + seg +
      '<div class="ch-btns">' + T.layers.map(function (l) { return '<button type="button" class="navbtn" data-one="' + l.k + '">' + fmt(t("one"), { n: tr(l.name) }) + "</button>"; }).join("") +
      '<button type="button" class="navbtn" data-act="all">' + t("all") + "</button></div>" +
      '<button type="button" class="ch-save" data-act="comp">' + t("comp") + "</button>" +
      (T.depth ? '<h3 class="ch-dh">' + t("depthH") + '</h3><div class="ch-dprev" id="ch-dprev"></div><div class="ch-btns"><button type="button" class="navbtn" data-act="dgray">' + t("depthGray") + '</button><button type="button" class="navbtn" data-act="dheat">' + t("depthHeat") + '</button></div><p class="ch-desc">' + t(IMG.depthAI ? "depthNote" : "depthNoteOld") + "</p>" +
        '<div class="ch-desc">' + t("dQual") + '</div><div class="ch-seg">' + ["std", "fine"].map(function (q) { return '<button type="button" data-dq="' + q + '" aria-pressed="' + (S.dq === q) + '">' + t(q === "std" ? "dStd" : "dFine") + "</button>"; }).join("") + '</div><p class="ch-desc">' + t("dQualNote") + "</p>" : "") +
      '<p class="ch-desc">' + fmt(t("compNote"), { w: IMG.w, h: IMG.h }) + '</p><p class="ch-note" id="ch-note">' + (T.depth && IMG.depthErr && !IMG.depthAI ? t("dFail") : IMG.shrunk ? fmt(t("shrunk"), { w: IMG.w, h: IMG.h }) : "") + "</p></div>";
    if (T.depth) {
      var dp = V.root.querySelector("#ch-dprev"), pf = Math.min(1, 640 / Math.max(IMG.pw, IMG.ph)), a = depthMap(Math.round(IMG.pw * pf), Math.round(IMG.ph * pf), false), b = depthMap(a.width, a.height, true);
      a.setAttribute("aria-label", t("depthH")); dp.appendChild(a); dp.appendChild(b);
    }
    requestAnimationFrame(layout);
  }
  function note(s) { if (!V) return; var n = V.root.querySelector("#ch-note") || V.root.querySelector("#ch-dn"); if (n) n.textContent = s; }

  // ---------- Eingabe ----------
  function onDown(e) {
    var c = e.target.closest && e.target.closest(".ch-lyr");
    if (!c || (e.button && e.button > 0)) return;
    e.preventDefault();
    var k = c.getAttribute("data-k"); select(k); L.touched = true;
    stage().classList.remove("anim");
    drag = { k: k, id: e.pointerId, sx: e.clientX, sy: e.clientY, x0: L.x[k], y0: L.y[k], el: c };
    try { c.setPointerCapture(e.pointerId); } catch (er) {}
    c.classList.add("grab");
  }
  function onMove(e) {
    if (!drag || e.pointerId !== drag.id) return;
    setPos(drag.k, drag.x0 + (e.clientX - drag.sx) / ds, drag.y0 + (e.clientY - drag.sy) / ds);
    layout();
  }
  function onUp(e) { if (!drag || e.pointerId !== drag.id) return; drag.el.classList.remove("grab"); drag = null; }
  function onKey(e) {
    if (!IMG || !e.target.closest || !e.target.closest("#ch-stage")) return;
    var T = tool(), n = parseInt(e.key, 10);
    if (n >= 1 && n <= T.layers.length) { select(T.layers[n - 1].k); return; }
    var step = e.shiftKey ? 10 : 1, dx = 0, dy = 0;
    if (e.key === "ArrowLeft") dx = -step; else if (e.key === "ArrowRight") dx = step;
    else if (e.key === "ArrowUp") dy = -step; else if (e.key === "ArrowDown") dy = step; else return;
    e.preventDefault(); L.touched = true;
    var k = L.active, p = clampPos(Math.round(L.x[k]) + dx, Math.round(L.y[k]) + dy);   // Pfeiltasten bewegen in Bildpixeln
    L.x[k] = Math.round(p.x); L.y[k] = Math.round(p.y); layout();
  }
  function onClick(e) {
    var b;
    if ((b = e.target.closest("[data-act]"))) {
      var a = b.getAttribute("data-act");
      if (a === "pick") V.root.querySelector("#ch-file").click();
      else if (a === "reset") { animate(); tool().layers.forEach(function (l) { L.x[l.k] = 0; L.y[l.k] = 0; L.on[l.k] = true; }); eyes(); layout(); }
      else if (a === "spread") {
        L.touched = true; animate();
        var T = tool(), m = Math.max(IMG.w, IMG.h);
        T.layers.forEach(function (l, i) { var d = T.spread[i] || [0, 0], p = clampPos(d[0] * m, d[1] * m); L.x[l.k] = p.x; L.y[l.k] = p.y; });
        layout();
      }
      else if (a === "all") exportLayers(tool().layers.map(function (l) { return l.k; }));
      else if (a === "comp") exportComp();
      else if (a === "dgray" || a === "dheat") exportDepth(a === "dheat");
      return;
    }
    if ((b = e.target.closest("[data-tool]"))) { S.tool = b.getAttribute("data-tool"); if (tool().modes.indexOf(S.mode) < 0) S.mode = tool().modes[0]; if (IMG) resetLayers(); build(); return; }
    if ((b = e.target.closest("[data-dq]"))) { var q = b.getAttribute("data-dq"); if (q !== S.dq) { S.dq = q; build(); } return; }
    if ((b = e.target.closest("[data-sel]"))) { select(b.getAttribute("data-sel")); return; }
    if ((b = e.target.closest("[data-vis]"))) { var k = b.getAttribute("data-vis"); L.on[k] = !L.on[k]; L.touched = true; eyes(); status(); return; }
    if ((b = e.target.closest("[data-mode]"))) { S.mode = b.getAttribute("data-mode"); Array.prototype.forEach.call(V.root.querySelectorAll("[data-mode]"), function (q) { q.setAttribute("aria-pressed", String(q === b)); }); return; }
    if ((b = e.target.closest("[data-one]"))) { exportLayers([b.getAttribute("data-one")]); return; }
  }
  function onChange(e) {
    if (e.target.matches("[data-snap]")) S.snap = e.target.checked;
    if (e.target.id === "ch-file" && e.target.files[0]) { loadFile(e.target.files[0]); e.target.value = ""; }
  }
  function onDragOver(e) { if (!e.dataTransfer || Array.prototype.indexOf.call(e.dataTransfer.types || [], "Files") < 0) return; e.preventDefault(); stage().classList.add("over"); }
  function onDragLeave(e) { if (e.target.id === "ch-stage") stage().classList.remove("over"); }
  function onDrop(e) { if (!e.dataTransfer || !e.dataTransfer.files.length) return; e.preventDefault(); stage().classList.remove("over"); loadFile(e.dataTransfer.files[0]); }
  var rsT = 0;
  function onResize() { clearTimeout(rsT); rsT = setTimeout(layout, 100); }

  function mount(el, l) {
    unmount();
    lang = l === "en" ? "en" : "de";
    var o = document.getElementById("ch-css"); if (o) o.remove();
    var s = document.createElement("style"); s.id = "ch-css"; s.textContent = CSS; document.head.appendChild(s);
    el.innerHTML = html();
    V = { root: el };
    el.addEventListener("pointerdown", onDown); window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp); window.addEventListener("pointercancel", onUp);
    el.addEventListener("keydown", onKey); el.addEventListener("click", onClick); el.addEventListener("change", onChange);
    window.addEventListener("resize", onResize);
    var st = stage();
    st.addEventListener("dragover", onDragOver); st.addEventListener("dragleave", onDragLeave); st.addEventListener("drop", onDrop);
    build();
  }
  function unmount() {
    if (!V) return;
    window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp); window.removeEventListener("resize", onResize);
    V.root.removeEventListener("pointerdown", onDown); V.root.removeEventListener("keydown", onKey);
    V.root.removeEventListener("click", onClick); V.root.removeEventListener("change", onChange);
    drag = null; V = null; depthJob++;
  }

  window.Channels = { mount: mount, unmount: unmount, tools: TOOLS };
})();
