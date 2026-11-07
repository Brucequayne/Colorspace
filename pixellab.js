/* PIXELLAB 0.1 – Fotos im Browser verfremden. Für Soy and Soul.
   Einbindung: pixellab.js per script-Tag laden, dann Pixellab.mount(element, "de" | "en")
   und Pixellab.unmount() beim Verlassen der Seite. Fotos verlassen nie das Gerät. */
(function () {
  "use strict";

  var VERSION = "0.1";
  var PREVIEW = 1100;   // längste Seite der Vorschau in Pixeln
  var lang = "de";

  function L2(de, en) { return { de: de, en: en }; }
  var TX = {
    title: L2("PIXELLAB", "PIXELLAB"),
    intro: L2("Lade ein Foto, verfremde es mit Werkzeugen und speichere das Ergebnis. Alles passiert in deinem Browser, das Foto verlässt dein Gerät nicht.",
              "Load a photo, transform it with tools and save the result. Everything happens in your browser, and the photo never leaves your device."),
    drop: L2("Foto hierher ziehen", "Drop a photo here"), or: L2("oder", "or"), pick: L2("Foto auswählen", "Choose photo"),
    dropNote: L2("JPEG, PNG oder WebP · bleibt auf deinem Gerät", "JPEG, PNG or WebP · stays on your device"),
    other: L2("Anderes Foto", "Other photo"), original: L2("Original zeigen", "Show original"),
    tools: L2("Werkzeuge", "Tools"),
    fragments: L2("Fragments", "Fragments"),
    fragDesc: L2("Nimmt einen Ausschnitt des Fotos und streut ihn wie ein Kaleidoskop über ein Voronoi-Muster.", "Takes a section of the photo and scatters it like a kaleidoscope across a Voronoi pattern."),
    source: L2("Ausschnitt", "Section"), sourceHint: L2("Rahmen im Vorschaubild verschieben", "Drag the frame in the thumbnail"),
    pSize: L2("Größe der Textur", "Texture size"), pSeed: L2("Anordnung", "Arrangement"), pOrder: L2("Unordnung", "Disorder"),
    pSrc: L2("Größe des Ausschnitts", "Section size"), pRot: L2("Drehung", "Rotation"), pScatter: L2("Streuung", "Scatter"),
    pSeam: L2("Fugen", "Seams"), pMirror: L2("Spiegeln wie im Kaleidoskop", "Mirror like a kaleidoscope"),
    reset: L2("Zurücksetzen", "Reset"), off: L2("Effekt aus", "Effect off"), on: L2("Effekt an", "Effect on"),
    exportH: L2("Export", "Export"), quality: L2("Qualität", "Quality"),
    qNote: L2("{w} × {h} Pixel · {mp} Megapixel · {p} % der Pixel des Originals", "{w} × {h} pixels · {mp} megapixels · {p}% of the original's pixels"),
    save: L2("Als JPEG speichern", "Save as JPEG"), working: L2("Wird berechnet … {p} %", "Rendering … {p}%"), saved: L2("Gespeichert.", "Saved."),
    tooBig: L2("Das Bild ist zu groß für diesen Browser. Bitte eine niedrigere Qualität wählen.", "The image is too large for this browser. Please pick a lower quality."),
    bad: L2("Diese Datei konnte nicht als Bild geöffnet werden.", "This file could not be opened as an image."),
    howH: L2("So funktioniert’s", "How it works"),
    how1: L2("Das Foto wird in Zellen aufgeteilt, wie bei einem Voronoi-Muster. Jede Zelle zeigt denselben Ausschnitt deines Fotos, aber gedreht, gespiegelt und leicht versetzt. So entsteht aus einem kleinen Teil des Bildes ein abstraktes, sich wiederholendes Muster.",
             "The photo is split into cells, like a Voronoi pattern. Each cell shows the same section of your photo, but rotated, mirrored and slightly shifted. A small part of the image turns into an abstract repeating pattern."),
    how2: L2("Größe der Textur bestimmt, wie groß die Zellen sind, Anordnung würfelt sie neu, Unordnung macht aus einem regelmäßigen Raster ein wildes Muster. Den Ausschnitt wählst du im kleinen Vorschaubild.",
             "Texture size sets how big the cells are, arrangement reshuffles them, disorder turns a regular grid into a wild pattern. You pick the section in the small thumbnail."),
    how3: L2("Beim Export bestimmt die Qualität den Anteil der Pixel: 100 % ist die volle Auflösung des Originals, 50 % hat halb so viele Pixel, 1 % ein Hundertstel.",
             "On export, quality sets the share of pixels: 100% is the original's full resolution, 50% has half as many pixels, 1% a hundredth.")
  };
  function t(k) { return TX[k][lang]; }
  function fmt(s, o) { return s.replace(/\{(\w+)\}/g, function (_, k) { return o[k]; }); }
  function nf(n, d) { return n.toLocaleString(lang === "de" ? "de-DE" : "en-GB", { maximumFractionDigits: d || 0 }); }

  // ---------- Zustand ----------
  var DEF = { size: 12, seed: 7, order: 70, src: 30, rot: 100, scatter: 25, seam: 1, mirror: true, cx: 0.5, cy: 0.5 };
  var S = null;  // { img, name, W, H, full: ImageData|null, prev: {data,w,h}, P: params, on, q }
  var V = null;

  // ---------- Fragments: Voronoi-Kaleidoskop ----------
  function hash(x, y, s) {
    var n = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177); n ^= n >>> 16;
    return (n >>> 0) / 4294967296;
  }
  // Zellen (Saatpunkte) für ein Bild der Größe W0×H0 in Originalpixeln
  function seeds(W0, H0, P) {
    var Sz = Math.max(W0, H0) * P.size / 100, gw = Math.ceil(W0 / Sz) + 2, gh = Math.ceil(H0 / Sz) + 2;
    var J = P.order / 100, rot = P.rot / 100, srcPx = Math.min(W0, H0) * P.src / 100, sc = P.scatter / 100;
    var cells = new Array(gw * gh);
    for (var gy = 0; gy < gh; gy++) for (var gx = 0; gx < gw; gx++) {
      var X = gx - 1, Y = gy - 1, s = P.seed * 16;
      var a = (hash(X, Y, s + 3) * 2 - 1) * Math.PI * rot;
      cells[gy * gw + gx] = {
        x: (X + 0.5 + (hash(X, Y, s) - 0.5) * J) * Sz,
        y: (Y + 0.5 + (hash(X, Y, s + 1) - 0.5) * J) * Sz,
        c: Math.cos(a), s: Math.sin(a),
        m: P.mirror && hash(X, Y, s + 4) < 0.5 ? -1 : 1,
        ox: (hash(X, Y, s + 5) - 0.5) * sc * srcPx * 1.5,
        oy: (hash(X, Y, s + 6) - 0.5) * sc * srcPx * 1.5
      };
    }
    return { cells: cells, gw: gw, gh: gh, Sz: Sz, k: srcPx / Sz };
  }
  function reflect(v, n) { var p = 2 * n; v = ((v % p) + p) % p; return v < n ? v : p - 1 - v; }
  // Rendert Zeilen y0..y1 eines Ausgabebildes (w×h); f = Ausgabepixel pro Originalpixel; src = Quellpixel mit eigenem Maßstab fs
  function renderRows(out, w, h, f, src, fs, W0, H0, P, G, y0, y1) {
    var d = out.data, sd = src.data, sw = src.w, sh = src.h, Sz = G.Sz, gw = G.gw, gh = G.gh, cells = G.cells, k = G.k;
    var cx = P.cx * W0, cy = P.cy * H0, seam = P.seam * Math.max(W0, H0) / 1000;
    for (var oy = y0; oy < y1; oy++) {
      var Y = (oy + 0.5) / f, gyc = Math.floor(Y / Sz) + 1;
      for (var ox = 0; ox < w; ox++) {
        var X = (ox + 0.5) / f, gxc = Math.floor(X / Sz) + 1;
        var d1 = 1e30, d2 = 1e30, best = null;
        for (var j = -1; j <= 1; j++) {
          var gy = gyc + j; if (gy < 0 || gy >= gh) continue;
          for (var i = -1; i <= 1; i++) {
            var gx = gxc + i; if (gx < 0 || gx >= gw) continue;
            var c = cells[gy * gw + gx], dx = X - c.x, dy = Y - c.y, dd = dx * dx + dy * dy;
            if (dd < d1) { d2 = d1; d1 = dd; best = c; } else if (dd < d2) d2 = dd;
          }
        }
        var lx = X - best.x, ly = Y - best.y;
        var u = (lx * best.c - ly * best.s) * best.m, v = lx * best.s + ly * best.c;
        var sx = reflect(Math.floor((cx + best.ox + u * k) * fs), sw), sy = reflect(Math.floor((cy + best.oy + v * k) * fs), sh);
        var si = (sy * sw + sx) * 4, o = (oy * w + ox) * 4;
        var r = sd[si], g = sd[si + 1], b = sd[si + 2];
        if (seam > 0) {
          var e = Math.sqrt(d2) - Math.sqrt(d1);
          if (e < seam) { var a = 1 - e / seam; a = a * a * 0.85; r *= 1 - a; g *= 1 - a; b *= 1 - a; }
        }
        d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = 255;
      }
    }
  }

  // ---------- Laden ----------
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
      var pw = Math.max(1, Math.round(W * f)), ph = Math.max(1, Math.round(H * f));
      S = { img: img, url: url, name: (file.name || "foto").replace(/\.[^.]+$/, ""), W: W, H: H, f: f, prev: imgData(img, pw, ph),
        P: Object.assign({}, DEF), on: true, q: 100, tool: "fragments" };
      if (V) { buildUI(); renderPreview(); }
    };
    img.onerror = function () { URL.revokeObjectURL(url); note(t("bad")); };
    img.src = url;
  }

  // ---------- Vorschau ----------
  var pending = 0;
  function renderPreview() {
    if (pending) return;
    pending = requestAnimationFrame(function () {
      pending = 0;
      if (!V || !S) return;
      var cv = V.root.querySelector("#px-cv"); if (!cv) return;
      var w = S.prev.w, h = S.prev.h;
      cv.width = w; cv.height = h;
      var x = cv.getContext("2d");
      if (!S.on || V.showOrig) { x.drawImage(S.img, 0, 0, w, h); }
      else {
        var out = x.createImageData(w, h), G = seeds(S.W, S.H, S.P);
        renderRows(out, w, h, S.f, S.prev, S.f, S.W, S.H, S.P, G, 0, h);
        x.putImageData(out, 0, 0);
      }
      drawThumb();
    });
  }
  function drawThumb() {
    var th = V.root.querySelector("#px-th"); if (!th) return;
    var box = th.parentNode.clientWidth || 260, tw = Math.min(box, 220 * S.W / S.H), k = tw / S.W, hh = Math.round(S.H * k), dpr = window.devicePixelRatio || 1;
    th.width = Math.round(tw * dpr); th.height = Math.round(hh * dpr); th.style.width = tw + "px"; th.style.height = hh + "px";
    var x = th.getContext("2d"); x.setTransform(dpr, 0, 0, dpr, 0, 0);
    x.drawImage(S.img, 0, 0, tw, hh);
    var s = Math.min(S.W, S.H) * S.P.src / 100 * k, cx = S.P.cx * tw, cy = S.P.cy * hh;
    x.fillStyle = "rgba(0,0,0,.45)"; x.fillRect(0, 0, tw, hh);
    x.save(); x.beginPath(); x.rect(cx - s / 2, cy - s / 2, s, s); x.clip(); x.drawImage(S.img, 0, 0, tw, hh); x.restore();
    x.strokeStyle = "#fff"; x.lineWidth = 2; x.strokeRect(cx - s / 2, cy - s / 2, s, s);
    x.fillStyle = "#fff"; x.beginPath(); x.arc(cx, cy, 3, 0, Math.PI * 2); x.fill();
  }

  // ---------- Export ----------
  var exporting = false;
  function exportDims() { var r = Math.sqrt(S.q / 100); return { w: Math.max(1, Math.round(S.W * r)), h: Math.max(1, Math.round(S.H * r)), r: r }; }
  function doExport() {
    if (exporting || !S) return;
    var dm = exportDims();
    var c = document.createElement("canvas"); c.width = dm.w; c.height = dm.h;
    var x = c.getContext("2d");
    if (!x || c.width !== dm.w) { note(t("tooBig")); return; }
    exporting = true; updateExport();
    // Quelle in voller Auflösung (nur einmal erzeugen)
    setTimeout(function () {
      try {
        if (S.on && !S.full) S.full = imgData(S.img, S.W, S.H);
      } catch (e) { exporting = false; note(t("tooBig")); updateExport(); return; }
      if (!S.on) { x.drawImage(S.img, 0, 0, dm.w, dm.h); finish(); return; }
      var out = x.createImageData(dm.w, dm.h), G = seeds(S.W, S.H, S.P), y = 0, step = Math.max(8, Math.floor(200000 / dm.w));
      (function chunk() {
        var y1 = Math.min(dm.h, y + step);
        renderRows(out, dm.w, dm.h, dm.r, S.full, 1, S.W, S.H, S.P, G, y, y1);
        y = y1;
        note(fmt(t("working"), { p: Math.round(y / dm.h * 100) }));
        if (y < dm.h) setTimeout(chunk, 0); else { x.putImageData(out, 0, 0); finish(); }
      })();
      function finish() {
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
    "@media (min-width:960px){.px-wrap{grid-template-columns:minmax(0,1fr) 300px;align-items:start}}" +
    ".px-desk{position:relative;min-height:clamp(380px,62vh,760px);border-radius:18px;display:grid;place-items:center;padding:28px;overflow:hidden;" +
      "background:#3A3632;background-image:radial-gradient(rgba(255,255,255,.05) 1px,transparent 1px);background-size:6px 6px}" +
    ".px-desk.over{outline:3px dashed #E3B83F;outline-offset:-10px}" +
    ".px-photo{background:#fff;padding:10px;box-shadow:0 18px 50px rgba(0,0,0,.45);max-width:100%;max-height:100%}" +
    ".px-photo canvas{display:block;max-width:100%;max-height:calc(62vh - 76px);height:auto;width:auto}" +
    ".px-drop{text-align:center;color:#F4F1EC;display:flex;flex-direction:column;align-items:center;gap:10px}" +
    ".px-drop b{font:600 1.4rem/1.2 var(--f-display)}.px-drop span{color:rgba(244,241,236,.7)}" +
    ".px-pick{font:600 1rem var(--f-body);padding:12px 20px;border-radius:999px;border:0;background:#F4F1EC;color:#151715;cursor:pointer}" +
    ".px-side{display:flex;flex-direction:column;gap:16px;min-width:0}" +
    ".px-box{border:1px solid var(--line);border-radius:16px;padding:14px 16px;display:flex;flex-direction:column;gap:12px}" +
    ".px-box h3{font:600 .78rem/1 var(--f-body);letter-spacing:.12em;text-transform:uppercase;color:var(--soft);margin:0}" +
    ".px-tool{display:flex;align-items:center;gap:10px;font:600 1rem var(--f-body);padding:10px 12px;border-radius:12px;border:1px solid var(--ink);background:var(--ink);color:var(--bg);text-align:left;cursor:default}" +
    ".px-tool svg{width:22px;height:22px;flex:none}" +
    ".px-desc{margin:0;color:var(--soft);font-size:.9rem;line-height:1.45}" +
    ".px-row{display:flex;flex-direction:column;gap:6px}" +
    ".px-row label{display:flex;justify-content:space-between;font-weight:600;font-size:.9rem}" +
    ".px-row label span{color:var(--soft);font-weight:500;font-variant-numeric:tabular-nums}" +
    ".px-row input[type=range]{width:100%;accent-color:var(--accent)}" +
    ".px-chk{display:flex;align-items:center;gap:8px;font-weight:500;font-size:.92rem;cursor:pointer}.px-chk input{width:18px;height:18px;accent-color:var(--accent)}" +
    ".px-th{display:block;margin:0 auto;border-radius:8px;cursor:move;touch-action:none}" +
    ".px-btns{display:flex;flex-wrap:wrap;gap:8px}" +
    ".px-save{font:600 1rem var(--f-body);padding:12px 18px;border-radius:999px;border:0;background:var(--ink);color:var(--bg);cursor:pointer}" +
    ".px-save[aria-disabled=true]{opacity:.5;cursor:default}" +
    ".px-note{margin:0;color:var(--soft);font-size:.88rem;min-height:1.3em;font-variant-numeric:tabular-nums}";

  var ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M3 4 L10 3 L12 9 L6 12 Z"/><path d="M10 3 L20 4 L18 10 L12 9 Z"/><path d="M6 12 L12 9 L18 10 L16 17 L9 18 Z"/><path d="M3 4 L6 12 L9 18 L4 21 Z"/><path d="M18 10 L21 13 L20 20 L16 17 Z"/></svg>';

  function html() {
    return '<h1 class="ptitle">' + t("title") + '<span class="px-ver">v' + VERSION + '</span></h1><p class="pintro">' + t("intro") + "</p>" +
      '<div class="px-wrap"><div><div class="px-desk" id="px-desk"></div>' +
      '<input type="file" id="px-file" accept="image/*" hidden></div><div class="px-side" id="px-side"></div></div>' +
      '<section class="phow"><h2>' + t("howH") + "</h2><p>" + t("how1") + "</p><p>" + t("how2") + "</p><p>" + t("how3") + "</p></section>";
  }
  function slider(id, label, min, max, val, unit) {
    return '<div class="px-row"><label for="px-' + id + '">' + label + '<span id="px-' + id + '-v">' + val + (unit || "") + '</span></label><input type="range" id="px-' + id + '" data-p="' + id + '" min="' + min + '" max="' + max + '" step="1" value="' + val + '"></div>';
  }
  function buildUI() {
    var desk = V.root.querySelector("#px-desk"), side = V.root.querySelector("#px-side");
    if (!S) {
      desk.innerHTML = '<div class="px-drop"><b>' + t("drop") + "</b><span>" + t("or") + '</span><button type="button" class="px-pick" data-px="pick">' + t("pick") + "</button><span>" + t("dropNote") + "</span></div>";
      side.innerHTML = '<div class="px-box"><h3>' + t("tools") + '</h3><div class="px-tool">' + ICON + t("fragments") + '</div><p class="px-desc">' + t("fragDesc") + "</p></div>";
      return;
    }
    var P = S.P;
    desk.innerHTML = '<div class="px-photo"><canvas id="px-cv" role="img" aria-label="' + S.name + '"></canvas></div>';
    side.innerHTML =
      '<div class="px-btns"><button type="button" class="navbtn" data-px="pick">' + t("other") + '</button><button type="button" class="navbtn" data-px="orig">' + t("original") + "</button></div>" +
      '<div class="px-box"><h3>' + t("tools") + '</h3><div class="px-tool">' + ICON + t("fragments") + '</div><p class="px-desc">' + t("fragDesc") + "</p>" +
      '<div class="px-row"><label>' + t("source") + '</label><canvas class="px-th" id="px-th"></canvas><span class="px-desc">' + t("sourceHint") + '</span></div>' +
      slider("size", t("pSize"), 2, 40, P.size, " %") + slider("seed", t("pSeed"), 0, 100, P.seed) + slider("order", t("pOrder"), 0, 100, P.order, " %") +
      slider("src", t("pSrc"), 5, 100, P.src, " %") + slider("rot", t("pRot"), 0, 100, P.rot, " %") + slider("scatter", t("pScatter"), 0, 100, P.scatter, " %") +
      slider("seam", t("pSeam"), 0, 20, P.seam) +
      '<label class="px-chk"><input type="checkbox" id="px-mirror" data-p="mirror"' + (P.mirror ? " checked" : "") + "> " + t("pMirror") + "</label>" +
      '<div class="px-btns"><button type="button" class="navbtn" data-px="reset">' + t("reset") + '</button><button type="button" class="navbtn" data-px="toggle" id="px-toggle">' + (S.on ? t("off") : t("on")) + "</button></div></div>" +
      '<div class="px-box"><h3>' + t("exportH") + "</h3>" + slider("q", t("quality"), 1, 100, S.q, " %") +
      '<p class="px-note" id="px-dims"></p><button type="button" class="px-save" data-px="save" id="px-save">' + t("save") + '</button><p class="px-note" id="px-note"></p></div>';
    updateExport();
  }
  function updateExport() {
    if (!V || !S) return;
    var dm = exportDims(), el = V.root.querySelector("#px-dims");
    if (el) el.textContent = fmt(t("qNote"), { w: nf(dm.w), h: nf(dm.h), mp: nf(dm.w * dm.h / 1e6, dm.w * dm.h < 1e6 ? 2 : 1), p: S.q });
    var b = V.root.querySelector("#px-save"); if (b) b.setAttribute("aria-disabled", String(exporting));
  }
  function note(s) { var n = V && V.root.querySelector("#px-note"); if (n) n.textContent = s; else if (V && s) { var d = V.root.querySelector(".px-drop span:last-child"); if (d) d.textContent = s; } }

  function onInput(e) {
    var k = e.target.dataset && e.target.dataset.p; if (!k || !S) return;
    if (k === "mirror") S.P.mirror = e.target.checked;
    else if (k === "q") { S.q = +e.target.value; updateExport(); }
    else S.P[k] = +e.target.value;
    var v = V.root.querySelector("#px-" + k + "-v");
    if (v) v.textContent = e.target.value + (k === "seed" || k === "seam" ? "" : " %");
    if (k !== "q") renderPreview();
  }
  function onClick(e) {
    var b = e.target.closest("[data-px]"); if (!b) return;
    var a = b.dataset.px;
    if (a === "pick") { V.root.querySelector("#px-file").click(); return; }
    if (!S) return;
    if (a === "reset") { S.P = Object.assign({}, DEF); buildUI(); renderPreview(); }
    else if (a === "toggle") { S.on = !S.on; b.textContent = S.on ? t("off") : t("on"); renderPreview(); }
    else if (a === "save") doExport();
  }
  function onChange(e) { if (e.target.id === "px-file" && e.target.files[0]) { loadFile(e.target.files[0]); e.target.value = ""; } }
  // Original zeigen, solange gedrückt
  function onPress(e) {
    var b = e.target.closest('[data-px="orig"]');
    if (b && S) { V.showOrig = true; renderPreview(); }
    var th = e.target.closest("#px-th");
    if (th && S) { V.dragTh = true; moveTh(e); try { th.setPointerCapture(e.pointerId); } catch (er) {} }
  }
  function onRelease() { if (!V) return; if (V.showOrig) { V.showOrig = false; renderPreview(); } V.dragTh = false; }
  function moveTh(e) {
    var th = V.root.querySelector("#px-th"), r = th.getBoundingClientRect();
    S.P.cx = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    S.P.cy = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
    renderPreview();
  }
  function onMove(e) { if (V && V.dragTh && S) moveTh(e); }
  function onDragOver(e) { if (!e.dataTransfer || Array.prototype.indexOf.call(e.dataTransfer.types || [], "Files") < 0) return; e.preventDefault(); V.root.querySelector("#px-desk").classList.add("over"); }
  function onDragLeave(e) { if (e.target.id === "px-desk") V.root.querySelector("#px-desk").classList.remove("over"); }
  function onDrop(e) {
    if (!e.dataTransfer || !e.dataTransfer.files.length) return;
    e.preventDefault(); V.root.querySelector("#px-desk").classList.remove("over");
    loadFile(e.dataTransfer.files[0]);
  }

  function injectCSS() { var o = document.getElementById("px-css"); if (o) o.remove(); var s = document.createElement("style"); s.id = "px-css"; s.textContent = CSS; document.head.appendChild(s); }
  function mount(el, l) {
    unmount();
    lang = l === "en" ? "en" : "de";
    injectCSS();
    el.innerHTML = html();
    V = { root: el, showOrig: false, dragTh: false };
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
  window.addEventListener("resize", function () { if (V && S) drawThumb(); });

  window.Pixellab = { mount: mount, unmount: unmount, _debug: function () { return { S: S, loadFile: loadFile }; } };
})();
