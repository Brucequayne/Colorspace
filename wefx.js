/* WeFX: Video laden, kreative Effekte in einer Kette übereinanderlegen, als MP4 (H.264, Full HD) exportieren.
   Alles läuft im Browser, das Video verlässt das Gerät nicht.

   Aufbau
   - Dieser Kern kümmert sich um Oberfläche, Video, Player, I/O-Bereich, Vollbild, die Effektkette und den Export.
   - Jeder Effekt liegt in einer eigenen Datei fx-<id>.js im Hauptverzeichnis und meldet sich mit WeFX.register({...}) an.
     So kann ein Effekt beliebig tief werden, ohne den Kern anzufassen.
   - Die Reihenfolge der Kette zählt: Das Video läuft von oben nach unten durch alle eingeschalteten Effekte,
     jeder bekommt das Ergebnis des vorigen. Per Drag & Drop am Griff lässt sich die Reihenfolge ändern.

   Effekt-Schnittstelle (siehe fx-wave.js als Vorlage)
   WeFX.register({
     id: "wave", name: { de, en }, desc: { de, en }, icon: "<svg …>",
     params: [ { k, type: "range" | "select" | "color" | "check", label: { de, en }, def, min, max, step, unit, options: [[wert, { de, en }], …] } ],
     init(state, c)  // optional: einmal je Effekt-Instanz und Auflösung
     render(c)       // Pflicht: zeichnet von c.src nach c.dst
   })
   c = { src, dst (Canvas gleicher Größe), w, h, scale (Breite / 1920, für Pixelangaben), t (Sekunden), frame, fps,
         p (Werte der Regler), state (bleibt je Instanz erhalten),
         cont (true, wenn dieser Frame bis zu 4 Frames nach dem vorigen kommt; gap = Abstand),
         same (true, wenn derselbe Frame noch einmal gerechnet wird, etwa nach einer Regleränderung im Stand),
         export (true beim Export), util }
   Parametertyp "pick": Farbe, die man mit der Pipette aus dem Video nimmt (Wert "#RRGGBB").
   Den Regler „Mix“, das Ein-/Ausschalten und den Bereich (Cropper) übernimmt der Kern für jeden Effekt. */
(function () {
  "use strict";

  var VERSION = "0.11", RATES = [24, 25, 30, 60];
  // Je Effekt eine Datei: fx-<id>.js im Hauptverzeichnis. Neue Effekte hier eintragen.
  var FX_FILES = ["colorblur", "wave", "rgbsplit", "pixelate"];
  var STAMP = (function () { var s = document.currentScript && document.currentScript.src, m = s && /[?&]v=([^&]+)/.exec(s); return m ? m[1] : VERSION; })();
  var lang = "de";
  function L2(de, en) { return { de: de, en: en }; }

  var TX = {
    title: L2("WeFX", "WeFX"),
    intro: L2("Zieh ein Video auf die Fläche und leg kreative Effekte darüber. Die Effekte wirken nacheinander, ihre Reihenfolge änderst du per Drag & Drop. Am Ende exportierst du als MP4. Das Video verlässt dein Gerät nicht.",
              "Drop a video onto the area and layer creative effects over it. The effects work one after another, you change their order by drag and drop. Finally export as MP4. The video never leaves your device."),
    drop: L2("Video hierher ziehen", "Drop a video here"), or: L2("oder", "or"), pick: L2("Video wählen", "Choose video"),
    dropNote: L2("MP4, MOV oder WebM · bleibt auf deinem Gerät", "MP4, MOV or WebM · stays on your device"),
    other: L2("Andere Datei", "Other file"), loading: L2("Frame wird geladen …", "Loading frame …"),
    prev: L2("Frame zurück", "Previous frame"), next: L2("Frame vor", "Next frame"), play: L2("Abspielen", "Play"), pause: L2("Pause", "Pause"),
    frame: L2("Frame {i} / {n}", "Frame {i} / {n}"),
    ioIn: L2("In-Punkt hier setzen (I)", "Set in point here (I)"), ioOut: L2("Out-Punkt hier setzen (O)", "Set out point here (O)"), ioClear: L2("Bereich zurücksetzen", "Clear range"),
    ioAll: L2("Bereich: ganzes Video · mit I und O eingrenzen", "Range: whole video · narrow it with I and O"), ioInfo: L2("Bereich: Frame {a} bis {b} ({n} Frames)", "Range: frame {a} to {b} ({n} frames)"),
    fs: L2("Vollbild", "Fullscreen"), fsOff: L2("Vollbild beenden", "Exit fullscreen"), sideTog: L2("Einstellungen ein- oder ausklappen", "Show or hide settings"),
    orig: L2("Original zeigen", "Show original"), allOff: L2("Alle Effekte aus", "All effects off"),
    tabFx: L2("Effekte", "Effects"), tabExport: L2("Export", "Export"),
    chainH: L2("Effektkette", "Effect chain"), chainIn: L2("Video", "Video"), chainOut: L2("Ausgabe", "Output"),
    chainEmpty: L2("Noch keine Effekte. Füg unten einen hinzu.", "No effects yet. Add one below."),
    chainNote: L2("Von oben nach unten: Jeder Effekt bekommt das Ergebnis des vorigen. Am Griff ziehen ändert die Reihenfolge.", "Top to bottom: each effect gets the result of the one before. Drag the handle to change the order."),
    addH: L2("Effekt hinzufügen", "Add effect"), fxLoading: L2("Effekte werden geladen …", "Loading effects …"), fxFail: L2("{n} konnte nicht geladen werden.", "{n} could not be loaded."),
    mix: L2("Mix", "Mix"), on: L2("Ein- oder ausschalten", "Turn on or off"), openFx: L2("Einstellungen öffnen oder schließen", "Open or close settings"),
    del: L2("Entfernen", "Remove"), dup: L2("Duplizieren", "Duplicate"), reset: L2("Zurücksetzen", "Reset"), grip: L2("Ziehen zum Sortieren (oder Pfeiltasten)", "Drag to reorder (or arrow keys)"),
    pickBtn: L2("Pipette", "Picker"), pickOn: L2("Klick ins Bild nimmt die Farbe (Esc bricht ab)", "Click the image to take the colour (Esc cancels)"),
    cropH: L2("Bereich", "Area"), cropOn: L2("Nur in einem Bereich wirken", "Only work inside an area"), cropEdit: L2("Bereich bearbeiten", "Edit area"), cropDone: L2("Fertig", "Done"),
    cropClear: L2("Keyframes löschen", "Clear keyframes"), cropInv: L2("Umkehren: außerhalb wirken", "Invert: work outside"), cropFeather: L2("Weiche Kante", "Soft edge"), cropSmooth: L2("Glättung der Bewegung", "Motion smoothing"),
    cropKeys: L2("{n} Keyframes", "{n} keyframes"), cropNoKeys: L2("Noch keine Keyframes: der Bereich steht still.", "No keyframes yet: the area stays still."),
    cropHelp: L2("Im Bild: innen ziehen verschiebt, an Kante oder Ecke ziehen ändert die Größe. Beim Abspielen mit gedrückter Maus wird die Bewegung aufgenommen, im Stand setzt Ziehen einen Keyframe.", "In the image: drag inside to move, drag an edge or corner to resize. Hold the mouse during playback to record the move, when paused dragging sets one keyframe."),
    masterH: L2("Master-Bereich", "Master area"), masterOn: L2("Alle Effekte auf einen Bereich begrenzen", "Limit all effects to one area"), masterNote: L2("Außerhalb bleibt das Original, innen wirkt die ganze Kette.", "Outside stays original, inside the whole chain works."),
    rec: L2("Aufnahme", "Recording"),
    exportH: L2("Export", "Export"), fps: L2("Bildrate", "Frame rate"), bitrate: L2("Bitrate (variabel)", "Bitrate (variable)"), audio: L2("Ton des Videos mitnehmen", "Keep the video's sound"),
    exportInfo: L2("MP4 · H.264 · {w} × {h} (Full HD) · {f} Bilder/s · variable Bitrate um {br} Mbit/s", "MP4 · H.264 · {w} × {h} (Full HD) · {f} fps · variable bitrate around {br} Mbit/s"),
    save: L2("Als MP4 exportieren", "Export as MP4"), cancel: L2("Abbrechen", "Cancel"),
    frameH: L2("Einzelbild", "Single frame"), frameSave: L2("Aktuellen Frame als PNG", "Current frame as PNG"), frameInfo: L2("PNG · {w} × {h} mit allen Effekten", "PNG · {w} × {h} with all effects"),
    frameDone: L2("Frame {i} gespeichert ({w} × {h}).", "Frame {i} saved ({w} × {h})."),
    working: L2("Frame {i} von {n} · {p} %", "Frame {i} of {n} · {p}%"), audioW: L2("Ton wird kodiert …", "Encoding sound …"),
    done: L2("Fertig: {mb} MB gespeichert.", "Done: {mb} MB saved."), cancelled: L2("Export abgebrochen.", "Export cancelled."),
    noAudio: L2("Ohne Ton, das Video hat keinen lesbaren Ton oder der Browser kann ihn nicht kodieren.", "Without sound: the video has no readable sound or the browser cannot encode it."),
    noSupport: L2("Dieser Browser kann kein H.264 kodieren. Bitte einen aktuellen Chrome, Edge oder Safari nutzen.", "This browser cannot encode H.264. Please use a current Chrome, Edge or Safari."),
    failed: L2("Export fehlgeschlagen: {e}", "Export failed: {e}"), bad: L2("Diese Datei konnte nicht als Video geöffnet werden.", "This file could not be opened as a video."),
    keys: L2("Tasten: Leertaste Abspielen · ← → Frame · I O Bereich · F Vollbild · D halten: Original", "Keys: Space play · ← → frame · I O range · F fullscreen · hold D: original"),
    howH: L2("So funktioniert’s", "How it works"),
    how1: L2("Ein Effekt ist ein Baustein in einer Kette. Das Video läuft von oben nach unten durch alle eingeschalteten Effekte, jeder arbeitet mit dem Ergebnis des vorigen. Darum zählt die Reihenfolge: Erst Pixel und dann Welle verbiegt die Pixelblöcke, erst Welle und dann Pixel macht aus der Welle grobe Treppen.",
              "An effect is a building block in a chain. The video runs from top to bottom through every effect that is switched on, each works on the result of the one before. That is why the order matters: pixel first and then wave bends the pixel blocks, wave first and then pixel turns the wave into coarse steps."),
    how2: L2("Jeder Effekt hat einen Regler „Mix“, der seine Wirkung mit dem Bild davor mischt, und lässt sich einzeln ausschalten. Am Griff links ziehst du ihn an eine andere Stelle, mit dem Griff im Fokus gehen auch die Pfeiltasten. D gedrückt halten zeigt das Original.",
              "Each effect has a “Mix” slider that blends its result with the image before it, and can be switched off on its own. Drag it by the handle on the left to another place, with the handle focused the arrow keys work too. Hold D to see the original."),
    how4: L2("Jeder Effekt kann auf einen Bereich begrenzt werden, dazu gibt es einen Master-Bereich für die ganze Kette. Das Rechteck ziehst du im Bild frei auf, innen verschieben, an Kanten und Ecken die Größe ändern. Hältst du die Maus beim Abspielen gedrückt, wird die Bewegung als Keyframes aufgenommen, wie bei EZ Crop. „Umkehren“ lässt den Effekt außerhalb wirken.",
              "Every effect can be limited to an area, and there is a master area for the whole chain. Drag the rectangle freely in the image, move it from inside, resize at edges and corners. Hold the mouse during playback and the move is recorded as keyframes, like in EZ Crop. “Invert” makes the effect work outside."),
    how3: L2("Die Vorschau rechnet in geringerer Auflösung, damit sie flüssig bleibt. Der Export rechnet jeden Frame in Full HD neu, nur im I/O-Bereich, wenn einer gesetzt ist.",
              "The preview works at a lower resolution so it stays smooth. The export renders every frame again in Full HD, only inside the I/O range if one is set.")
  };
  function t(k) { return TX[k][lang]; }
  function tl(o) { return o ? o[lang] || o.de || "" : ""; }
  function fmt(s, o) { return s.replace(/\{(\w+)\}/g, function (_, k) { return o[k]; }); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function canvas(w, h) { var c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
  function dec(v, n) { var s = v.toFixed(n); return lang === "de" ? s.replace(".", ",") : s; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  // ---------- Effekt-Register ----------
  var REG = {}, LOADING = {}, FAILED = {};
  var util = {
    canvas: canvas, clamp: clamp,
    lerp: function (a, b, k) { return a + (b - a) * k; },
    // Pixel lesen und schreiben, für Effekte, die direkt mit Bilddaten arbeiten
    read: function (cv) { return cv.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, cv.width, cv.height); },
    write: function (cv, img) { cv.getContext("2d").putImageData(img, 0, 0); },
    copy: function (src, dst) { var x = dst.getContext("2d"); x.globalAlpha = 1; x.globalCompositeOperation = "copy"; x.drawImage(src, 0, 0); x.globalCompositeOperation = "source-over"; }
  };
  function register(def) {
    if (!def || !def.id || typeof def.render !== "function") return;
    def.params = def.params || [];
    REG[def.id] = def; delete LOADING[def.id];
    if (V) updateSide();
  }
  function loadEffects() {
    FX_FILES.forEach(function (id) {
      if (REG[id] || LOADING[id]) return;
      LOADING[id] = true; delete FAILED[id];
      var s = document.createElement("script"); s.src = "fx-" + id + ".js?v=" + STAMP; s.async = true;
      s.onerror = function () { delete LOADING[id]; FAILED[id] = true; if (V) updateSide(); };
      document.head.appendChild(s);
    });
  }
  function defaults(def) { var p = {}; def.params.forEach(function (q) { p[q.k] = q.def; }); return p; }

  // ---------- Zustand ----------
  // F: Projekt { file, url, name, dur, vw, vh, ow, oh, n, idx, inF, outF }
  // S.chain: [{ uid, id, on, open, mix, p }] in Verarbeitungsreihenfolge (oben zuerst)
  var F = null, V = null, uidN = 0;
  var S = { chain: [], tab: "fx", sideOpen: true, mbit: 16, audio: true, fpsI: 2, master: newCrop() };
  function fps() { return RATES[S.fpsI]; }

  // ---------- Laden ----------
  function loadFile(file) {
    if (!file || !/^video\//.test(file.type || "") && !/\.(mp4|mov|m4v|webm|mkv)$/i.test(file.name || "")) { note(t("bad")); return; }
    stopPlay();
    if (F && F.url) URL.revokeObjectURL(F.url);
    F = { file: file, url: URL.createObjectURL(file), name: (file.name || "video").replace(/\.[^.]+$/, ""), dur: 0, vw: 0, vh: 0, ow: 1920, oh: 1080, n: 1, idx: 0, inF: null, outF: null };
    buildUI();
  }
  function onMeta() {
    var v = V.vid;
    F.dur = v.duration || 0; F.vw = v.videoWidth; F.vh = v.videoHeight;
    if (!F.vw || !isFinite(F.dur)) { note(t("bad")); return; }
    if (F.vh > F.vw) { F.ow = 1080; F.oh = 1920; } else { F.ow = 1920; F.oh = 1080; }
    F.n = Math.max(1, Math.floor(F.dur * fps()));
    V.ready = true; layout(); updateSide(); goFrame(F.idx || 0);
  }
  function tFrame(i) { return Math.min((i + 0.5) / fps(), Math.max(0, F.dur - 0.001)); }
  function seek(v, tm) {
    return new Promise(function (res) {
      if (Math.abs(v.currentTime - tm) < 1e-4 && v.readyState >= 2) { res(); return; }
      var done = function () { v.removeEventListener("seeked", done); res(); };
      v.addEventListener("seeked", done); v.currentTime = tm;
    });
  }
  // Videobild "contain" auf Schwarz in die Fläche W × H
  function drawVideo(ctx, vid, W, H) {
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
    var s = Math.min(W / vid.videoWidth, H / vid.videoHeight), w = vid.videoWidth * s, h = vid.videoHeight * s;
    ctx.imageSmoothingQuality = "high"; ctx.drawImage(vid, (W - w) / 2, (H - h) / 2, w, h);
  }
  var loadTok = 0;
  async function goFrame(i) {
    if (!F || !V || !V.ready) return;
    i = clamp(i, 0, F.n - 1);
    var tok = ++loadTok; F.idx = i; V.loading = true; updateBar();
    await seek(V.vid, tFrame(i));
    if (tok !== loadTok || !V) return;
    V.loading = false; updateBar(); need();
  }

  // ---------- I/O-Bereich ----------
  function ioRange() { if (!F) return { a: 0, b: 0 }; var a = F.inF == null ? 0 : F.inF, b = F.outF == null ? F.n - 1 : F.outF; a = clamp(a, 0, F.n - 1); b = clamp(b, a, F.n - 1); return { a: a, b: b }; }
  function ioSet(which) {
    if (!F || !V.ready) return;
    if (which === "in") { F.inF = F.idx; if (F.outF != null && F.outF < F.idx) F.outF = null; }
    else if (which === "out") { F.outF = F.idx; if (F.inF != null && F.inF > F.idx) F.inF = null; }
    else { F.inF = null; F.outF = null; }
    if (F.inF === 0) F.inF = null; if (F.outF === F.n - 1) F.outF = null;
    updateBar(); if (S.tab === "export") updateSide();
  }

  // ---------- Cropper (seit v0.11) ----------
  // Jeder Effekt hat einen eigenen Bereich (it.crop), dazu gibt es einen Master-Bereich (S.master) für die ganze Kette.
  // Ein Bereich ist ein freies Rechteck, Mitte und Größe als Anteil der Bildbreite und -höhe, mit Keyframes über die Zeit:
  // { on, inv, feather, smooth, cur: { x, y, w, h }, keys: [{ t, x, y, w, h }] }
  function newCrop() { return { on: false, inv: false, feather: 0, smooth: 35, cur: { x: 0.5, y: 0.5, w: 0.5, h: 0.5 }, keys: [] }; }
  function cropFix(r) { var w = clamp(r.w, 0.02, 1), h = clamp(r.h, 0.02, 1); return { x: clamp(r.x, w / 2, 1 - w / 2), y: clamp(r.y, h / 2, 1 - h / 2), w: w, h: h }; }
  function cropInterp(cr, tm) {
    var k = cr.keys;
    if (!k.length) return cr.cur;
    if (tm <= k[0].t) return k[0];
    if (tm >= k[k.length - 1].t) return k[k.length - 1];
    var lo = 0, hi = k.length - 1;
    while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (k[mid].t <= tm) lo = mid; else hi = mid; }
    var a = k[lo], b = k[hi], f = (tm - a.t) / ((b.t - a.t) || 1);
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, w: a.w + (b.w - a.w) * f, h: a.h + (b.h - a.h) * f };
  }
  function cropAt(cr, tm) {
    if (V && V.cdrag && V.cdrag.cr === cr) return V.cdrag.r;   // beim Ziehen gilt, was die Maus gerade zeigt
    var wd = cr.smooth / 100 * 0.4;
    if (!cr.keys.length || wd <= 0) return cropFix(cropInterp(cr, tm));
    var o = { x: 0, y: 0, w: 0, h: 0 }, n = 0;
    for (var i = -4; i <= 4; i++) { var q = cropInterp(cr, tm + wd * i / 4), wt = 5 - Math.abs(i); o.x += q.x * wt; o.y += q.y * wt; o.w += q.w * wt; o.h += q.h * wt; n += wt; }
    return cropFix({ x: o.x / n, y: o.y / n, w: o.w / n, h: o.h / n });
  }
  function cropSetKey(cr, tm, r) {
    var k = cr.keys, i = k.findIndex(function (q) { return Math.abs(q.t - tm) < 1 / 120; }), nk = { t: tm, x: r.x, y: r.y, w: r.w, h: r.h };
    if (i >= 0) k[i] = nk; else { k.push(nk); k.sort(function (a, b) { return a.t - b.t; }); }
  }
  function cropRecord(cr, tm, r) {   // Aufnahme wie bei EZ Crop: ersetzt nur die Keyframes seit dem letzten aufgenommenen Zeitpunkt
    var prev = V.recPrev; if (prev == null || tm < prev) prev = tm - 1e-3;
    cr.keys = cr.keys.filter(function (q) { return !(q.t > prev && q.t <= tm + 1e-4); });
    cr.keys.push({ t: tm, x: r.x, y: r.y, w: r.w, h: r.h }); cr.keys.sort(function (a, b) { return a.t - b.t; });
    V.recPrev = tm;
  }
  function cropOf(key) { if (key === "m") return S.master; var it = findIt(+key); return it ? it.crop : null; }
  // Maske des Bereichs zeichnen und anwenden: innen das Ergebnis (res), außen das Bild davor (base)
  function cropApply(base, res, cr, B, info) {
    var w = base.width, h = base.height, r = cropAt(cr, info.t);
    if (!B.m || B.m.width !== w || B.m.height !== h) { B.m = canvas(w, h); B.e = canvas(w, h); B.f = canvas(w, h); }
    var mx = B.m.getContext("2d"), fe = cr.feather * w / 1920;
    mx.setTransform(1, 0, 0, 1, 0, 0); mx.globalCompositeOperation = "source-over"; mx.clearRect(0, 0, w, h);
    mx.filter = fe > 0.3 ? "blur(" + fe.toFixed(1) + "px)" : "none"; mx.fillStyle = "#fff";
    var rx = (r.x - r.w / 2) * w, ry = (r.y - r.h / 2) * h, rw = r.w * w, rh = r.h * h;
    if (cr.inv) { mx.fillRect(-fe * 3, -fe * 3, w + fe * 6, h + fe * 6); mx.filter = "none"; mx.globalCompositeOperation = "destination-out"; mx.filter = fe > 0.3 ? "blur(" + fe.toFixed(1) + "px)" : "none"; mx.fillRect(rx, ry, rw, rh); }
    else mx.fillRect(rx, ry, rw, rh);
    mx.filter = "none"; mx.globalCompositeOperation = "source-over";
    var o = base === B.e || res === B.e ? (base === B.f || res === B.f ? null : B.f) : B.e, ox = o.getContext("2d");
    ox.globalAlpha = 1; ox.globalCompositeOperation = "copy"; ox.drawImage(res, 0, 0);
    ox.globalCompositeOperation = "destination-in"; ox.drawImage(B.m, 0, 0);
    ox.globalCompositeOperation = "destination-over"; ox.drawImage(base, 0, 0);
    ox.globalCompositeOperation = "source-over";
    return o;
  }

  // ---------- Effektkette ----------
  // Läuft in der Reihenfolge der Liste. Drei Puffer: A (Eingang), B (Ausgang des Effekts), C (für den Mix).
  function chainBuffers(store, w, h) {
    if (!store.a || store.a.width !== w || store.a.height !== h) { store.a = canvas(w, h); store.b = canvas(w, h); store.c = canvas(w, h); store.gen = (store.gen || 0) + 1; }
    return store;
  }
  // inp: Canvas mit dem Videobild (Größe w × h). Gibt das Canvas mit dem Ergebnis zurück.
  function runChain(inp, store, info) {
    var w = inp.width, h = inp.height, B = chainBuffers(store, w, h), cur = inp, outs = [B.a, B.b, B.c], k = 0;
    var gap = store.lastFrame == null ? 0 : info.frame - store.lastFrame, same = gap === 0 && store.lastFrame != null, cont = gap >= 1 && gap <= 4;
    store.lastFrame = info.frame;
    S.chain.forEach(function (it) {
      var def = REG[it.id]; if (!def || !it.on || it.mix <= 0) return;
      var key = info.export ? "stx" : "st";
      if (!it[key] || it[key + "G"] !== B.gen) { it[key] = {}; it[key + "G"] = B.gen; if (def.init) try { def.init(it[key], { w: w, h: h, scale: w / 1920, util: util }); } catch (e) { console.error(e); } }
      var dst = outs[k % 3] === cur ? outs[(k + 1) % 3] : outs[k % 3];
      var dx = dst.getContext("2d"); dx.setTransform(1, 0, 0, 1, 0, 0); dx.globalAlpha = 1; dx.globalCompositeOperation = "source-over"; dx.filter = "none"; dx.clearRect(0, 0, w, h);
      try {
        def.render({ src: cur, dst: dst, w: w, h: h, scale: w / 1920, t: info.t, frame: info.frame, fps: fps(), p: it.p, state: it[key], cont: cont, gap: gap, same: same, export: !!info.export, util: util });
      } catch (e) { console.error("WeFX " + it.id, e); return; }
      if (it.mix < 100) {   // Mix: Ergebnis mit dem Bild davor mischen
        var mixc = [B.a, B.b, B.c].filter(function (c) { return c !== cur && c !== dst; })[0], mx = mixc.getContext("2d");
        mx.globalAlpha = 1; mx.globalCompositeOperation = "copy"; mx.drawImage(cur, 0, 0); mx.globalCompositeOperation = "source-over";
        mx.globalAlpha = it.mix / 100; mx.drawImage(dst, 0, 0); mx.globalAlpha = 1; dst = mixc;
      }
      if (it.crop && it.crop.on) dst = cropApply(cur, dst, it.crop, B, info);   // Bereich: nur dort wirkt der Effekt
      cur = dst; k++;
    });
    if (S.master.on && cur !== inp) cur = cropApply(inp, cur, S.master, B, info);   // Master-Bereich: außerhalb bleibt das Original
    return cur;
  }
  function addFx(id) {
    var def = REG[id]; if (!def) return;
    S.chain.forEach(function (it) { it.open = false; });
    S.chain.push({ uid: ++uidN, id: id, on: true, open: true, mix: 100, p: defaults(def), crop: newCrop() });
    updateSide(); need();
  }
  function findIt(uid) { for (var i = 0; i < S.chain.length; i++) if (S.chain[i].uid === uid) return S.chain[i]; return null; }
  function moveIt(uid, to) {
    var i = S.chain.findIndex(function (it) { return it.uid === uid; }); if (i < 0) return;
    to = clamp(to, 0, S.chain.length - 1); if (to === i) return;
    var it = S.chain.splice(i, 1)[0]; S.chain.splice(to, 0, it); need();
  }

  // ---------- Darstellung ----------
  var raf = 0;
  function need() { if (V) V.need = true; }
  function layout() {
    if (!V || !F || !F.vw || !V.cv) return;
    var desk = V.root.querySelector("#wx-desk"), aw = desk.clientWidth - 20, ah = desk.clientHeight - 20, sc = Math.min(aw / F.ow, ah / F.oh);
    var cw = Math.max(50, Math.floor(F.ow * sc)), ch = Math.max(50, Math.floor(F.oh * sc)), dpr = window.devicePixelRatio || 1;
    V.cv.style.width = cw + "px"; V.cv.style.height = ch + "px";
    V.cv.width = Math.round(cw * dpr); V.cv.height = Math.round(ch * dpr);
    // Vorschau rechnet höchstens mit 1280 px Breite (Hochkant: Höhe), damit sie flüssig bleibt
    var pw = Math.min(V.cv.width, F.ow, F.ow >= F.oh ? 1280 : Math.round(1280 * F.ow / F.oh));
    V.pw = Math.max(2, pw); V.ph = Math.max(2, Math.round(pw * F.oh / F.ow));
    var side = V.root.querySelector("#wx-side");
    if (side) side.style.maxHeight = window.innerWidth >= 1100 ? Math.max(360, V.root.querySelector(".wx-deskbox").offsetHeight) + "px" : "";
    drawStrip(); need();
  }
  function loop() {
    raf = requestAnimationFrame(loop);
    if (!V || !F || !V.ready) return;
    if (V.playing) {
      var k = Math.min(F.n - 1, Math.floor(V.vid.currentTime * fps()));
      if (V.vid.ended || F.outF != null && k > F.outF) { stopPlay(); return; }
      if (k !== F.idx) { F.idx = k; updateBar(true); }
      var tm = V.vid.currentTime;
      if (V.cdrag && tm - (V.lastRec || -1) >= 1 / 30) { cropRecord(V.cdrag.cr, tm, V.cdrag.r); V.lastRec = tm; V.cdrag.rec = true; }
      if (k !== V.shown || V.need || V.cdrag) { V.shown = k; V.need = false; render(tm, k); }   // Effekte mit Gedächtnis brauchen jeden Frame genau einmal
      return;
    }
    if (V.need && !V.loading) { V.need = false; V.shown = F.idx; render(tFrame(F.idx), F.idx); }
  }
  function render(tm, frame) {
    var pv = V.pv || (V.pv = canvas(V.pw, V.ph));
    if (pv.width !== V.pw || pv.height !== V.ph) { pv.width = V.pw; pv.height = V.ph; }
    drawVideo(pv.getContext("2d"), V.vid, V.pw, V.ph);
    var out = V.peek || V.allOff ? pv : runChain(pv, V.store || (V.store = {}), { t: tm, frame: frame });
    var x = V.cv.getContext("2d"); x.imageSmoothingQuality = "high"; x.drawImage(out, 0, 0, V.cv.width, V.cv.height);
    if (V.editCrop) drawCropUI(x, tm);
  }
  // Rahmen des Bereichs, der gerade bearbeitet wird: außen abgedunkelt, Griffe an Ecken und Kanten
  function drawCropUI(x, tm) {
    var cr = cropOf(V.editCrop); if (!cr || !cr.on) return;
    var W = V.cv.width, H = V.cv.height, r = cropAt(cr, tm), dpr = window.devicePixelRatio || 1;
    var rx = (r.x - r.w / 2) * W, ry = (r.y - r.h / 2) * H, rw = r.w * W, rh = r.h * H;
    x.save(); x.fillStyle = "rgba(10,9,8,.5)";
    if (cr.inv) x.fillRect(rx, ry, rw, rh);
    else { x.fillRect(0, 0, W, ry); x.fillRect(0, ry + rh, W, H - ry - rh); x.fillRect(0, ry, rx, rh); x.fillRect(rx + rw, ry, W - rx - rw, rh); }
    var recording = V.cdrag && V.playing;
    x.strokeStyle = recording ? "#F87666" : "#D7D0C8"; x.lineWidth = 2 * dpr; x.setLineDash(cr.inv ? [8 * dpr, 6 * dpr] : []); x.strokeRect(rx, ry, rw, rh); x.setLineDash([]);
    var hs = 9 * dpr; x.fillStyle = recording ? "#F87666" : "#D7D0C8";
    [[0, 0], [0.5, 0], [1, 0], [1, 0.5], [1, 1], [0.5, 1], [0, 1], [0, 0.5]].forEach(function (q) { x.fillRect(rx + rw * q[0] - hs / 2, ry + rh * q[1] - hs / 2, hs, hs); });
    var lab = V.editCrop === "m" ? t("masterH") : (function () { var it = findIt(+V.editCrop), d = it && REG[it.id]; return t("cropH") + " · " + (d ? tl(d.name) : ""); })();
    if (recording) lab = "● " + t("rec") + " · " + lab;
    x.font = "600 " + Math.round(12 * dpr) + "px " + getComputedStyle(document.body).fontFamily; var tw = x.measureText(lab).width + 14 * dpr;
    x.fillStyle = recording ? "#F87666" : "#0A0908"; x.fillRect(rx, Math.max(0, ry - 24 * dpr), tw, 22 * dpr);
    x.fillStyle = recording ? "#0A0908" : "#D7D0C8"; x.textBaseline = "middle"; x.fillText(lab, rx + 7 * dpr, Math.max(0, ry - 24 * dpr) + 11 * dpr);
    x.restore();
  }
  function drawStrip() {
    if (!V || !F) return;
    var c = V.root.querySelector("#wx-strip"); if (!c) return;
    var w = c.clientWidth, dpr = window.devicePixelRatio || 1;
    c.width = Math.max(1, Math.round(w * dpr)); c.height = Math.round(10 * dpr);
    var x = c.getContext("2d"); x.clearRect(0, 0, c.width, c.height);
    var ec = V.editCrop && cropOf(V.editCrop);
    if (ec && ec.keys.length && F.dur) { x.fillStyle = "#95A78D"; ec.keys.forEach(function (q) { x.fillRect(Math.floor(q.t / F.dur * c.width), 0, Math.max(1, Math.round(dpr)), c.height); }); }
    if (F.inF == null && F.outF == null) return;
    var fw = c.width / F.n, io = ioRange(), lw = Math.max(2, Math.round(2 * dpr));
    x.fillStyle = "rgba(248,118,102,.6)"; x.fillRect(Math.floor(io.a * fw), 0, Math.ceil((io.b - io.a + 1) * fw), c.height);
    x.fillStyle = "#F87666"; x.fillRect(Math.floor(io.a * fw), 0, lw, c.height); x.fillRect(Math.ceil((io.b + 1) * fw) - lw, 0, lw, c.height);
  }

  // ---------- Abspielen ----------
  function startPlay() {
    if (!F || !V.ready || V.playing) return;
    var io = ioRange(); if (F.idx < io.a || F.idx >= io.b) F.idx = io.a;
    V.playing = true; if (V.store) V.store.lastFrame = null;
    V.vid.currentTime = F.idx / fps(); V.vid.muted = false;
    var p = V.vid.play(); if (p && p.catch) p.catch(function () { V.vid.muted = true; V.vid.play().catch(function () {}); });
    updateBar();
  }
  function stopPlay() {
    if (!V || !V.playing) return;
    V.playing = false; V.vid.pause(); V.vid.muted = true;
    goFrame(Math.min(F.n - 1, Math.floor(V.vid.currentTime * fps())));
  }

  // ---------- Export ----------
  var busy = false, cancelReq = false;
  function exportCtx() { return { store: {} }; }
  async function exportFrame() {
    if (!F || !V.ready || busy) return;
    if (V.playing) stopPlay();
    var W = F.ow, H = F.oh, i = F.idx, base = canvas(W, H);
    try {
      var ev = await openVideo(); await seek(ev, tFrame(i)); drawVideo(base.getContext("2d"), ev, W, H); closeVideo(ev);
      var out = runChain(base, exportCtx().store, { t: tFrame(i), frame: i, export: true });
      var blob = await new Promise(function (res) { out.toBlob(res, "image/png"); }); if (!blob) throw new Error("PNG");
      var num = String(i + 1); while (num.length < String(F.n).length) num = "0" + num;
      download(blob, F.name + "-wefx-frame-" + num + ".png", 4000);
      note(fmt(t("frameDone"), { i: i + 1, w: W, h: H }));
    } catch (e) { note(fmt(t("failed"), { e: e && e.message || e })); }
  }
  function openVideo() {
    var ev = document.createElement("video"); ev.muted = true; ev.playsInline = true; ev.preload = "auto"; ev.src = F.url;
    return new Promise(function (res, rej) { ev.onloadeddata = function () { res(ev); }; ev.onerror = function () { rej(new Error("video")); }; });
  }
  function closeVideo(ev) { ev.removeAttribute("src"); ev.load(); }
  function download(blob, name, ms) {
    var url = URL.createObjectURL(blob), a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, ms);
  }
  function loadMuxer() {
    if (window.Mp4Muxer) return Promise.resolve();
    return new Promise(function (res, rej) { var s = document.createElement("script"); s.src = "mp4-muxer.js"; s.onload = res; s.onerror = function () { rej(new Error("mp4-muxer.js")); }; document.head.appendChild(s); });
  }
  async function pickVideoCodec(w, h, br, f) {
    var list = ["avc1.640028", "avc1.4d0028", "avc1.42e028"];
    if (f > 30) list = ["avc1.64002a", "avc1.4d002a", "avc1.42e02a"].concat(list);
    for (var i = 0; i < list.length; i++) {
      var cfg = { codec: list[i], width: w, height: h, bitrate: br, bitrateMode: "variable", framerate: f, latencyMode: "quality", avc: { format: "avc" } };
      try { var r = await VideoEncoder.isConfigSupported(cfg); if (r.supported) return cfg; } catch (e) {}
    }
    return null;
  }
  async function readAudio() {
    try { var ab = await F.file.arrayBuffer(), ctx = new OfflineAudioContext(2, 48000, 48000); return await ctx.decodeAudioData(ab).catch(function () { return null; }); }
    catch (e) { return null; }
  }
  async function pickAudio(ch) {
    var opts = [["mp4a.40.2", "aac", 192000], ["opus", "opus", 160000]];
    for (var i = 0; i < opts.length; i++) {
      var cfg = { codec: opts[i][0], sampleRate: 48000, numberOfChannels: ch, bitrate: opts[i][2] };
      try { if (typeof AudioEncoder !== "undefined" && (await AudioEncoder.isConfigSupported(cfg)).supported) return { cfg: cfg, mux: opts[i][1] }; } catch (e) {}
    }
    return null;
  }
  async function doExport() {
    if (busy || !F || !V.ready) return;
    if (typeof VideoEncoder === "undefined" || typeof VideoFrame === "undefined") { note(t("noSupport")); return; }
    stopPlay(); busy = true; cancelReq = false; updateSide();
    var notes = [];
    try {
      await loadMuxer();
      var OW = F.ow, OH = F.oh, FPS = fps(), br = S.mbit * 1e6, io = ioRange(), i0 = io.a, n = io.b - io.a + 1, us = 1e6 / FPS;
      var vcfg = await pickVideoCodec(OW, OH, br, FPS);
      if (!vcfg) { note(t("noSupport")); return; }
      var audio = null, acfg = null, ach = 0;
      if (S.audio) {
        audio = await readAudio(); ach = audio ? Math.min(2, audio.numberOfChannels) : 0; acfg = audio ? await pickAudio(ach) : null;
        if (!audio || !acfg) { notes.push(t("noAudio")); audio = null; }
      }
      var target = new Mp4Muxer.ArrayBufferTarget();
      var muxer = new Mp4Muxer.Muxer({ target: target, video: { codec: "avc", width: OW, height: OH, frameRate: FPS },
        audio: audio ? { codec: acfg.mux, sampleRate: 48000, numberOfChannels: ach } : undefined, fastStart: "in-memory", firstTimestampBehavior: "offset" });
      var encErr = null;
      var venc = new VideoEncoder({ output: function (c, m) { muxer.addVideoChunk(c, m); }, error: function (e) { encErr = e; } });
      venc.configure(vcfg);
      var ev = await openVideo(), base = canvas(OW, OH), bx = base.getContext("2d"), store = exportCtx().store;
      S.chain.forEach(function (it) { it.stx = null; });   // Effekte mit Gedächtnis starten beim Export frisch
      for (var i = 0; i < n; i++) {
        if (cancelReq || encErr) break;
        var fi = i0 + i; await seek(ev, tFrame(fi)); drawVideo(bx, ev, OW, OH);
        var out = runChain(base, store, { t: tFrame(fi), frame: fi, export: true });
        var vf = new VideoFrame(out, { timestamp: Math.round(i * us), duration: Math.round(us) });
        venc.encode(vf, { keyFrame: i % (FPS * 2) === 0 }); vf.close();
        while (venc.encodeQueueSize > 6) await new Promise(function (r2) { setTimeout(r2, 4); });
        if (i % 3 === 0) note(fmt(t("working"), { i: i + 1, n: n, p: Math.round(i / n * (audio ? 94 : 100)) }));
      }
      closeVideo(ev);
      if (encErr) throw encErr;
      if (cancelReq) { venc.close(); note(t("cancelled")); return; }
      await venc.flush(); venc.close();
      if (audio) {
        note(t("audioW"));
        var aenc = new AudioEncoder({ output: function (c, m) { muxer.addAudioChunk(c, m); }, error: function (e) { encErr = e; } });
        aenc.configure(acfg.cfg);
        var a0 = Math.min(audio.length, Math.round(i0 / FPS * 48000)), total = Math.max(0, Math.min(audio.length - a0, Math.round(n / FPS * 48000))), step = 1024, chans = [];
        for (var c2 = 0; c2 < ach; c2++) chans.push(audio.getChannelData(c2));
        for (var s = 0; s < total; s += step) {
          var len = Math.min(step, total - s), buf = new Float32Array(len * ach);
          for (var c3 = 0; c3 < ach; c3++) buf.set(chans[c3].subarray(a0 + s, a0 + s + len), c3 * len);
          var ad = new AudioData({ format: "f32-planar", sampleRate: 48000, numberOfFrames: len, numberOfChannels: ach, timestamp: Math.round(s / 48000 * 1e6), data: buf });
          aenc.encode(ad); ad.close();
          if (aenc.encodeQueueSize > 50) await new Promise(function (r3) { setTimeout(r3, 2); });
        }
        await aenc.flush(); aenc.close();
        if (encErr) throw encErr;
      }
      muxer.finalize();
      var blob = new Blob([target.buffer], { type: "video/mp4" });
      download(blob, F.name + "-wefx.mp4", 10000);
      note([fmt(t("done"), { mb: dec(blob.size / 1048576, 1) })].concat(notes).join(" "));
    } catch (e) {
      note(fmt(t("failed"), { e: (e && e.message) || e }));
    } finally { busy = false; updateSide(); }
  }

  // ---------- Oberfläche ----------
  // Gleiches Farbschema wie Frame Painter: Stein #D7D0C8 · Sand #C8C6AF · Schwarz #0A0908, Akzente Salbei #95A78D und Koralle #F87666
  var CSS = [
    "body.wx-theme{--bg:#D7D0C8;--head:#D7D0C8;--edge:#D7D0C8;--card:#C8C6AF;--ink:#0A0908;--soft:rgba(10,9,8,.62);--line:rgba(10,9,8,.16);--accent:#F87666;--sage:#95A78D;--shadow:rgba(10,9,8,.25);color-scheme:light}",
    "body.wx-theme .rate,body.wx-theme .back{color:var(--soft)}html.wx-noscroll,html.wx-noscroll body{overflow:hidden}",
    ".wx-ver{display:inline-block;margin-left:10px;padding:2px 8px;border-radius:999px;background:var(--ink);font:600 .75rem var(--f-body);color:var(--bg);vertical-align:middle}",
    ".wx-wrap{position:relative;display:grid;grid-template-columns:minmax(0,1fr);gap:16px;margin-top:22px}.wx-deskbox{position:relative;min-width:0}",
    ".wx-desk{position:relative;width:100%;aspect-ratio:16/9;min-height:300px;display:grid;place-items:center;padding:10px;overflow:hidden;background:var(--ink);border-radius:14px}",
    ".wx-desk.tall{aspect-ratio:4/5}.wx-desk.over{outline:3px dashed var(--accent);outline-offset:-10px}.wx-desk canvas{display:block}",
    ".wx-drop{text-align:center;color:var(--bg);display:flex;flex-direction:column;align-items:center;gap:10px;padding:20px}.wx-drop b{font:600 1.4rem/1.2 var(--f-display)}.wx-drop span{color:rgba(215,208,200,.65)}",
    ".wx-pick{font:600 1rem var(--f-body);padding:12px 22px;border:0;border-radius:999px;background:var(--bg);color:var(--ink);cursor:pointer}",
    ".wx-load,.wx-peek{position:absolute;left:14px;top:14px;padding:4px 10px;border-radius:999px;background:rgba(10,9,8,.7);color:var(--bg);font:600 .8rem var(--f-body)}.wx-peek{background:var(--accent);color:var(--ink)}",
    ".wx-bar{display:flex;align-items:center;gap:8px;margin-top:10px;padding:8px 10px;background:var(--ink);border-radius:12px;color:var(--bg)}",
    ".wx-bar .wx-nav{display:grid;place-items:center;min-width:38px;height:36px;font:600 .9rem var(--f-body);padding:0 12px;border:0;border-radius:8px;background:rgba(215,208,200,.1);color:var(--bg);cursor:pointer}",
    ".wx-bar .wx-nav:hover{background:rgba(215,208,200,.2)}.wx-bar .wx-nav[disabled]{opacity:.3;cursor:default}",
    ".wx-bar .wx-play{background:var(--accent);color:var(--ink);min-width:104px}.wx-bar .wx-play:hover{background:#FA8C7E}.wx-bar .wx-play.on{background:var(--sage)}",
    ".wx-bar .wx-fsb svg{width:18px;height:18px}.wx-bar .wx-fsb[aria-pressed=true]{background:var(--sage);color:var(--ink)}",
    ".wx-fr{font:600 .88rem var(--f-body);font-variant-numeric:tabular-nums;min-width:118px;text-align:center}",
    ".wx-tl{flex:1;min-width:160px;display:flex;flex-direction:column;gap:4px}.wx-tl input{width:100%;accent-color:var(--accent);margin:0}.wx-tl canvas{display:block;width:100%;height:6px;border-radius:3px;background:rgba(215,208,200,.14)}",
    ".wx-time{font:600 .84rem var(--f-body);font-variant-numeric:tabular-nums;color:rgba(215,208,200,.7);min-width:92px;text-align:right}",
    ".wx-io{display:flex;gap:4px}.wx-bar .wx-io .wx-nav{min-width:32px;padding:0 8px;font-weight:700}.wx-bar .wx-ioc{color:var(--accent)}.wx-ioc[hidden]{display:none!important}",
    ".wx-bar2{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center;margin-top:10px}.wx-bar2 .navbtn{border-radius:999px;border-color:var(--line)}.wx-bar2 .navbtn:hover{border-color:var(--ink)}",
    ".wx-bar2 .navbtn[aria-pressed=true]{background:var(--ink);color:var(--bg);border-color:var(--ink)}.wx-other{margin-left:auto}",
    ".wx-bar3{display:flex;flex-wrap:wrap;gap:4px 16px;align-items:baseline;margin-top:8px}",
    ".wx-note{margin:0;color:var(--ink);font-size:.86rem;font-weight:600;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}.wx-note:empty{display:none}.wx-keys{margin:0;color:var(--soft);font-size:.78rem}",
    ".wx-side{display:flex;flex-direction:column;gap:12px;min-width:0}",
    ".wx-tabs{display:grid;grid-template-columns:repeat(2,1fr);gap:4px;padding:4px;background:var(--card);border-radius:12px;position:sticky;top:0;z-index:2}",
    ".wx-tabs button{font:600 .9rem var(--f-body);padding:9px 6px;border:0;border-radius:9px;background:transparent;color:var(--ink);cursor:pointer}.wx-tabs button:hover{background:rgba(10,9,8,.07)}.wx-tabs button[aria-selected=true]{background:var(--ink);color:var(--bg)}",
    ".wx-sc{display:flex;flex-direction:column;gap:12px}",
    ".wx-box{background:var(--card);border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:12px}",
    ".wx-box h3{font:600 .72rem/1 var(--f-body);letter-spacing:.12em;text-transform:uppercase;color:var(--soft);margin:0}",
    ".wx-row{display:flex;flex-direction:column;gap:6px}.wx-row label{display:flex;justify-content:space-between;font-weight:600;font-size:.86rem}.wx-row label span{color:var(--soft);font-weight:500;font-variant-numeric:tabular-nums}",
    ".wx-row input[type=range]{width:100%;accent-color:var(--ink)}.wx-row input:disabled{opacity:.4}.wx-ticks{display:flex;justify-content:space-between;font-size:.76rem;color:var(--soft)}",
    ".wx-desc{margin:0;color:var(--soft);font-size:.82rem;line-height:1.45}",
    ".wx-seg{display:flex;flex-wrap:wrap;border:1px solid var(--ink);border-radius:10px;overflow:hidden}.wx-seg button{flex:1 1 auto;font:600 .82rem var(--f-body);padding:7px 8px;border:0;background:transparent;color:var(--ink);cursor:pointer}",
    ".wx-seg button+button{border-left:1px solid var(--ink)}.wx-seg button[aria-pressed=true]{background:var(--ink);color:var(--bg)}",
    ".wx-save{font:600 .95rem var(--f-body);padding:11px 18px;border:0;border-radius:999px;background:var(--ink);color:var(--bg);cursor:pointer}.wx-save[disabled]{opacity:.35;cursor:default}",
    ".wx-qpbtn{font:600 .9rem var(--f-body);padding:10px 14px;border:1.5px solid var(--ink);border-radius:999px;background:transparent;color:var(--ink);cursor:pointer}.wx-qpbtn:hover{background:var(--ink);color:var(--bg)}.wx-qpbtn[disabled]{opacity:.35;cursor:default;background:transparent;color:var(--ink)}",
    ".wx-chk{display:inline-flex;align-items:center;gap:7px;font-weight:500;font-size:.88rem;cursor:pointer}.wx-chk input{width:16px;height:16px;accent-color:var(--ink)}",
    ".wx-iot{margin:0;padding:8px 10px;border-radius:8px;background:var(--bg);font-size:.82rem;font-weight:600}",
    /* Effektkette */
    ".wx-chain{display:flex;flex-direction:column;gap:6px}",
    ".wx-end{align-self:flex-start;font:600 .72rem var(--f-body);letter-spacing:.08em;text-transform:uppercase;padding:4px 10px;border-radius:999px;background:var(--ink);color:var(--bg)}",
    ".wx-flow{width:2px;height:10px;margin-left:18px;background:var(--ink);opacity:.35}",
    ".wx-item{background:var(--bg);border-radius:10px;transition:box-shadow .15s}.wx-item.off .wx-ih b,.wx-item.off .wx-fico{opacity:.4}",
    ".wx-item.drag{box-shadow:0 10px 24px rgba(10,9,8,.28),inset 0 0 0 2px var(--ink);position:relative;z-index:3}",
    ".wx-ih{display:flex;align-items:center;gap:8px;padding:6px 6px 6px 4px;min-height:44px}",
    ".wx-grip{flex:none;width:22px;height:32px;display:grid;place-items:center;border:0;border-radius:6px;background:transparent;color:var(--soft);cursor:grab;touch-action:none;padding:0}.wx-grip:hover{background:rgba(10,9,8,.08);color:var(--ink)}.wx-grip svg{width:12px;height:18px}",
    ".wx-item.drag .wx-grip{cursor:grabbing}",
    ".wx-fico{flex:none;width:30px;height:30px;display:grid;place-items:center;border-radius:8px;background:var(--ink);color:var(--bg)}.wx-fico svg{width:20px;height:20px}",
    ".wx-ih b{flex:1;min-width:0;font:600 .92rem var(--f-display);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.wx-num{font:600 .72rem var(--f-body);color:var(--soft);font-variant-numeric:tabular-nums}",
    ".wx-ib{flex:none;width:30px;height:30px;display:grid;place-items:center;border:0;border-radius:50%;background:transparent;color:var(--ink);cursor:pointer;padding:0}.wx-ib:hover{background:rgba(10,9,8,.08)}.wx-ib svg{width:18px;height:18px}",
    ".wx-ib.wx-onb[aria-pressed=true]{color:var(--ink)}.wx-ib.wx-onb[aria-pressed=false]{color:var(--soft)}.wx-ib.wx-caret[aria-expanded=true] svg{transform:rotate(180deg)}",
    ".wx-body{display:flex;flex-direction:column;gap:12px;padding:4px 12px 12px;border-top:1px solid var(--line);padding-top:12px}",
    ".wx-body input[type=color]{width:100%;height:32px;border:0;border-radius:8px;padding:0;background:transparent;cursor:pointer}",
    ".wx-acts{display:flex;flex-wrap:wrap;gap:6px}.wx-acts .navbtn{border-radius:999px;border-color:var(--line);font-size:.8rem;padding:5px 12px}",
    ".wx-cat{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}",
    ".wx-add{display:flex;flex-direction:column;align-items:flex-start;gap:6px;text-align:left;padding:10px 12px;border:0;border-radius:10px;background:var(--bg);color:var(--ink);cursor:pointer;font:inherit}",
    ".wx-add:hover{background:#E1DBD4}.wx-add b{display:flex;align-items:center;gap:8px;font:600 .9rem var(--f-display)}.wx-add span{font-size:.76rem;line-height:1.35;color:var(--soft)}",
    ".wx-add .wx-fico{width:26px;height:26px}.wx-add .wx-fico svg{width:17px;height:17px}.wx-add[disabled]{opacity:.45;cursor:default}",
    ".wx-pickr{display:flex;align-items:center;gap:10px}.wx-sw{width:34px;height:34px;flex:none;border-radius:8px;box-shadow:inset 0 0 0 1px rgba(10,9,8,.25)}.wx-pickr code{font:600 .86rem ui-monospace,SFMono-Regular,Menlo,monospace;flex:1}",
    ".wx-pk{font:600 .82rem var(--f-body);padding:7px 12px;border:0;border-radius:999px;background:var(--ink);color:var(--bg);cursor:pointer}.wx-pk[aria-pressed=true]{background:var(--accent);color:var(--ink)}",
    ".wx-hint{margin:-4px 0 0;color:var(--soft);font-size:.76rem;line-height:1.35}",
    ".wx-crop{display:flex;flex-direction:column;gap:10px;padding:10px;border-radius:10px;background:var(--card)}.wx-crop h4{margin:0;font:600 .7rem/1 var(--f-body);letter-spacing:.12em;text-transform:uppercase;color:var(--soft)}",
    ".wx-ce{font:600 .82rem var(--f-body);padding:7px 14px;border:1.5px solid var(--ink);border-radius:999px;background:transparent;color:var(--ink);cursor:pointer}.wx-ce[aria-pressed=true]{background:var(--accent);border-color:var(--accent)}",
    ".wx-cbadge{display:inline-grid;place-items:center;width:18px;height:18px;border-radius:5px;background:var(--accent);color:var(--ink);flex:none}.wx-cbadge svg{width:12px;height:12px}",
    ".wx-desk canvas.pick{cursor:crosshair}",
    ".wx-stog{display:none}",
    "@media (min-width:1100px){",
    "  .wx-wrap{width:calc(100vw - 40px);margin-left:calc((100% - (100vw - 40px)) / 2);grid-template-columns:minmax(0,1fr) 340px;align-items:start;transition:grid-template-columns .25s ease}",
    "  .wx-wrap.wx-closed{grid-template-columns:minmax(0,1fr) 0px;column-gap:0}.wx-wrap.wx-closed .wx-side{visibility:hidden;overflow:hidden}",
    "  .wx-desk{aspect-ratio:auto;height:calc(100vh - 150px);min-height:420px}.wx-desk.tall{aspect-ratio:auto}",
    "  .wx-deskbox{position:sticky;top:12px}.wx-side{position:sticky;top:12px;overflow-y:auto;padding-right:2px;scrollbar-width:thin}",
    "  .wx-stog{display:grid;place-items:center;position:absolute;top:calc((100vh - 150px) / 2 - 32px);right:-15px;width:14px;height:64px;padding:0;border:0;border-radius:7px;background:var(--ink);color:var(--bg);cursor:pointer;z-index:3}",
    "  .wx-wrap.wx-closed .wx-stog{right:-17px}",
    "}",
    ".wx-stog span{width:6px;height:6px;border-top:2px solid currentColor;border-right:2px solid currentColor;transform:translateX(-1px) rotate(45deg)}.wx-wrap.wx-closed .wx-stog span{transform:translateX(1px) rotate(-135deg)}.wx-stog:hover{background:var(--accent);color:var(--ink)}",
    ".wx-wrap.wx-fs{position:fixed;inset:0;z-index:1000;width:100vw;height:100vh;margin:0;padding:12px 22px 12px 12px;background:var(--bg);overflow:hidden;grid-template-columns:minmax(0,1fr) 340px;align-items:start}",
    ".wx-wrap.wx-fs.wx-closed{grid-template-columns:minmax(0,1fr) 0px}.wx-wrap.wx-fs .wx-desk{height:calc(100vh - 118px);aspect-ratio:auto}",
    ".wx-wrap.wx-fs .wx-deskbox,.wx-wrap.wx-fs .wx-side{position:relative;top:0}.wx-wrap.wx-fs .wx-side{max-height:calc(100vh - 24px)!important}.wx-wrap.wx-fs .wx-keys{display:none}",
    ".wx-wrap.wx-fs .wx-stog{display:grid;place-items:center;position:absolute;top:calc((100vh - 118px) / 2 - 32px);right:-15px;width:14px;height:64px;padding:0;border:0;border-radius:7px;background:var(--ink);color:var(--bg);cursor:pointer;z-index:3}",
    ".wx-wrap.wx-fs.wx-closed .wx-side{visibility:hidden;overflow:hidden}.wx-wrap:fullscreen{background:var(--bg)}"
  ].join("");

  var ICO = {
    grip: '<svg viewBox="0 0 12 18" aria-hidden="true"><g fill="currentColor"><circle cx="3" cy="3" r="1.6"/><circle cx="9" cy="3" r="1.6"/><circle cx="3" cy="9" r="1.6"/><circle cx="9" cy="9" r="1.6"/><circle cx="3" cy="15" r="1.6"/><circle cx="9" cy="15" r="1.6"/></g></svg>',
    eye: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>',
    eyeOff: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 20L20 4" stroke="currentColor" stroke-width="2"/></svg>',
    caret: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2"/></svg>',
    crop: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2v15h15M2 7h15v15" fill="none" stroke="currentColor" stroke-width="3"/></svg>',
    fx: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12c3-6 6-6 9 0s6 6 9 0" fill="none" stroke="currentColor" stroke-width="2"/></svg>'
  };

  function html() {
    return '<h1 class="ptitle">' + t("title") + '<span class="wx-ver">v' + VERSION + '</span></h1><p class="pintro">' + t("intro") + "</p>" +
      '<div class="wx-wrap' + (S.sideOpen ? "" : " wx-closed") + '"><div class="wx-deskbox"><div class="wx-desk" id="wx-desk"></div><div id="wx-bar"></div><input type="file" id="wx-file" accept="video/*,.mp4,.mov,.m4v,.webm" hidden>' +
      '<button type="button" class="wx-stog" data-wx="side" aria-label="' + t("sideTog") + '" title="' + t("sideTog") + '" aria-expanded="' + S.sideOpen + '"><span aria-hidden="true"></span></button></div>' +
      '<aside class="wx-side" id="wx-side"><div class="wx-tabs" id="wx-tabs" role="tablist"></div><div class="wx-sc" id="wx-sc"></div></aside></div>' +
      '<section class="phow"><h2>' + t("howH") + "</h2><p>" + t("how1") + "</p><p>" + t("how2") + "</p><p>" + t("how4") + "</p><p>" + t("how3") + "</p></section>";
  }
  function buildUI() {
    var desk = V.root.querySelector("#wx-desk"), bar = V.root.querySelector("#wx-bar");
    if (V.vid) { V.vid.pause(); V.vid.removeAttribute("src"); V.vid.load(); V.vid = null; }
    V.ready = false; V.cv = null; V.store = null; V.editCrop = null; V.picking = null; V.cdrag = null;
    if (!F) {
      desk.classList.remove("tall");
      desk.innerHTML = '<div class="wx-drop"><b>' + t("drop") + "</b><span>" + t("or") + '</span><button type="button" class="wx-pick" data-wx="file">' + t("pick") + '</button><span id="wx-dn">' + t("dropNote") + "</span></div>";
      bar.innerHTML = ""; updateSide(); return;
    }
    desk.innerHTML = '<canvas id="wx-cv" aria-label="' + esc(F.name) + '"></canvas><span class="wx-load" id="wx-load" hidden>' + t("loading") + '</span><span class="wx-peek" id="wx-peek" hidden>' + t("orig") + "</span>";
    V.cv = desk.querySelector("#wx-cv");
    bar.innerHTML = '<div class="wx-bar"><button type="button" class="wx-nav" data-wx="prev" aria-label="' + t("prev") + '" title="' + t("prev") + ' (←)">◀</button>' +
      '<button type="button" class="wx-nav wx-play" data-wx="play" id="wx-play"></button>' +
      '<button type="button" class="wx-nav" data-wx="next" aria-label="' + t("next") + '" title="' + t("next") + ' (→)">▶</button>' +
      '<span class="wx-fr" id="wx-fr"></span>' +
      '<div class="wx-tl"><input type="range" id="wx-pos" min="0" max="0" step="1" value="0" aria-label="Frame"><canvas id="wx-strip"></canvas></div>' +
      '<span class="wx-time" id="wx-time"></span>' +
      '<span class="wx-io"><button type="button" class="wx-nav" data-wx="ioIn" title="' + t("ioIn") + '" aria-label="' + t("ioIn") + '">I</button><button type="button" class="wx-nav" data-wx="ioOut" title="' + t("ioOut") + '" aria-label="' + t("ioOut") + '">O</button><button type="button" class="wx-nav wx-ioc" data-wx="ioClear" id="wx-ioc" title="' + t("ioClear") + '" aria-label="' + t("ioClear") + '" hidden>×</button></span>' +
      '<button type="button" class="wx-nav wx-fsb" data-wx="fs" id="wx-fsb" title="' + t("fs") + ' (F)" aria-label="' + t("fs") + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" fill="none" stroke="currentColor" stroke-width="2"/></svg></button></div>' +
      '<div class="wx-bar2"><button type="button" class="navbtn" data-wx="allOff" id="wx-alloff" aria-pressed="false">' + t("allOff") + '</button>' +
      '<button type="button" class="navbtn wx-other" data-wx="file">' + t("other") + "</button></div>" +
      '<div class="wx-bar3"><p class="wx-note" id="wx-note" aria-live="polite">' + esc(V.lastNote || "") + '</p><p class="wx-keys">' + t("keys") + "</p></div>";
    var v = document.createElement("video");
    v.muted = true; v.playsInline = true; v.preload = "auto"; v.src = F.url;
    v.addEventListener("loadedmetadata", function () { if (V && V.vid === v) desk.classList.toggle("tall", v.videoHeight > v.videoWidth); });
    v.addEventListener("loadeddata", function () { if (V && V.vid === v && !V.ready) onMeta(); }, { once: true });
    v.addEventListener("error", function () { note(t("bad")); });
    V.vid = v;
    updateSide();
  }
  function paramHTML(it, def, q) {
    var id = "wx-p-" + it.uid + "-" + q.k, v = it.p[q.k], lab = tl(q.label);
    if (q.type === "range") return '<div class="wx-row"><label for="' + id + '">' + lab + '<span id="' + id + '-v">' + v + (q.unit || "") + '</span></label><input type="range" id="' + id + '" data-uid="' + it.uid + '" data-k="' + q.k + '" min="' + q.min + '" max="' + q.max + '" step="' + (q.step || 1) + '" value="' + v + '">' + (q.hint ? '<p class="wx-hint">' + tl(q.hint) + "</p>" : "") + "</div>";
    if (q.type === "select") return '<div class="wx-row"><label>' + lab + '</label><div class="wx-seg">' + q.options.map(function (o) {
      return '<button type="button" data-uid="' + it.uid + '" data-k="' + q.k + '" data-v="' + esc(o[0]) + '" aria-pressed="' + (v === o[0]) + '">' + tl(o[1]) + "</button>"; }).join("") + "</div></div>";
    if (q.type === "color") return '<div class="wx-row"><label for="' + id + '">' + lab + '<span>' + v + '</span></label><input type="color" id="' + id + '" data-uid="' + it.uid + '" data-k="' + q.k + '" value="' + v + '"></div>';
    if (q.type === "pick") return '<div class="wx-row"><label>' + lab + '</label><div class="wx-pickr"><span class="wx-sw" style="background:' + v + '"></span><code>' + v + '</code><button type="button" class="wx-pk" data-pick="' + it.uid + '" data-k="' + q.k + '" aria-pressed="' + !!(V.picking && V.picking.uid === it.uid && V.picking.k === q.k) + '">' + t("pickBtn") + "</button></div>" + (V.picking && V.picking.uid === it.uid && V.picking.k === q.k ? '<p class="wx-hint">' + t("pickOn") + "</p>" : "") + "</div>";
    if (q.type === "check") return '<label class="wx-chk"><input type="checkbox" data-uid="' + it.uid + '" data-k="' + q.k + '"' + (v ? " checked" : "") + "> " + lab + "</label>";
    return "";
  }
  function cropHTML(cr, key, master) {
    var ed = V.editCrop === key, h = '<div class="wx-crop"><h4>' + t(master ? "masterH" : "cropH") + "</h4>" +
      '<label class="wx-chk"><input type="checkbox" data-crop="' + key + '" data-ck="on"' + (cr.on ? " checked" : "") + "> " + t(master ? "masterOn" : "cropOn") + "</label>";
    if (cr.on) {
      h += '<div class="wx-acts"><button type="button" class="wx-ce" data-cropedit="' + key + '" aria-pressed="' + ed + '"' + (F && V.ready ? "" : " disabled") + ">" + t(ed ? "cropDone" : "cropEdit") + "</button>" +
        (cr.keys.length ? '<button type="button" class="navbtn" data-cropclear="' + key + '">' + t("cropClear") + "</button>" : "") + "</div>" +
        '<p class="wx-desc">' + (cr.keys.length ? fmt(t("cropKeys"), { n: cr.keys.length.toLocaleString(lang === "de" ? "de-DE" : "en-GB") }) : t("cropNoKeys")) + (ed ? " · " + t("cropHelp") : "") + "</p>" +
        '<div class="wx-row"><label for="wx-cf-' + key + '">' + t("cropFeather") + '<span id="wx-cf-' + key + '-v">' + cr.feather + ' px</span></label><input type="range" id="wx-cf-' + key + '" data-crop="' + key + '" data-ck="feather" min="0" max="200" step="1" value="' + cr.feather + '"></div>' +
        '<div class="wx-row"><label for="wx-cs-' + key + '">' + t("cropSmooth") + '<span id="wx-cs-' + key + '-v">' + cr.smooth + ' %</span></label><input type="range" id="wx-cs-' + key + '" data-crop="' + key + '" data-ck="smooth" min="0" max="100" step="1" value="' + cr.smooth + '"></div>' +
        '<label class="wx-chk"><input type="checkbox" data-crop="' + key + '" data-ck="inv"' + (cr.inv ? " checked" : "") + "> " + t("cropInv") + "</label>" + (master ? '<p class="wx-desc">' + t("masterNote") + "</p>" : "");
    }
    return h + "</div>";
  }
  function chainHTML() {
    var h = '<span class="wx-end">' + t("chainIn") + '</span><div class="wx-flow"></div>';
    if (!S.chain.length) h += '<p class="wx-desc">' + t("chainEmpty") + '</p><div class="wx-flow"></div>';
    h += '<div class="wx-list" id="wx-list">' + S.chain.map(function (it, i) {
      var def = REG[it.id], name = def ? tl(def.name) : it.id;
      var body = it.open && def ? '<div class="wx-body">' + (def.desc ? '<p class="wx-desc">' + tl(def.desc) + "</p>" : "") + def.params.map(function (q) { return paramHTML(it, def, q); }).join("") +
        '<div class="wx-row"><label for="wx-mix-' + it.uid + '">' + t("mix") + '<span id="wx-mix-' + it.uid + '-v">' + it.mix + ' %</span></label><input type="range" id="wx-mix-' + it.uid + '" data-uid="' + it.uid + '" data-k="__mix" min="0" max="100" step="1" value="' + it.mix + '"></div>' +
        cropHTML(it.crop, String(it.uid), false) +
        '<div class="wx-acts"><button type="button" class="navbtn" data-wx="dup" data-uid="' + it.uid + '">' + t("dup") + '</button><button type="button" class="navbtn" data-wx="reset" data-uid="' + it.uid + '">' + t("reset") + "</button></div></div>" : "";
      return '<div class="wx-item' + (it.on ? "" : " off") + '" data-item="' + it.uid + '"><div class="wx-ih">' +
        '<button type="button" class="wx-grip" data-grip="' + it.uid + '" title="' + t("grip") + '" aria-label="' + t("grip") + ": " + esc(name) + '">' + ICO.grip + "</button>" +
        '<span class="wx-fico">' + (def && def.icon || ICO.fx) + "</span><b>" + esc(name) + "</b>" + (it.crop.on ? '<span class="wx-cbadge" title="' + t("cropH") + '">' + ICO.crop + "</span>" : "") + '<span class="wx-num">' + (i + 1) + "</span>" +
        '<button type="button" class="wx-ib wx-onb" data-wx="on" data-uid="' + it.uid + '" aria-pressed="' + it.on + '" title="' + t("on") + '" aria-label="' + t("on") + '">' + (it.on ? ICO.eye : ICO.eyeOff) + "</button>" +
        '<button type="button" class="wx-ib wx-caret" data-wx="open" data-uid="' + it.uid + '" aria-expanded="' + !!it.open + '" title="' + t("openFx") + '" aria-label="' + t("openFx") + '">' + ICO.caret + "</button>" +
        '<button type="button" class="wx-ib" data-wx="del" data-uid="' + it.uid + '" title="' + t("del") + '" aria-label="' + t("del") + '">' + ICO.x + "</button></div>" + body + '</div>' + '<div class="wx-flow"></div>';
    }).join("") + "</div>";
    return h + '<span class="wx-end">' + t("chainOut") + "</span>";
  }
  function updateSide() {
    if (!V) return;
    var side = V.root.querySelector("#wx-side"), sc = V.root.querySelector("#wx-sc"), ready = F && V.ready;
    if (!side || !sc) return;
    V.root.querySelector("#wx-tabs").innerHTML = [["fx", "tabFx"], ["export", "tabExport"]].map(function (q) {
      return '<button type="button" role="tab" data-tab="' + q[0] + '" aria-selected="' + (S.tab === q[0]) + '">' + t(q[1]) + "</button>"; }).join("");
    var h = "";
    if (S.tab === "fx") {
      var pend = Object.keys(LOADING).length, fail = Object.keys(FAILED);
      h = '<div class="wx-box"><h3>' + t("chainH") + '</h3><div class="wx-chain">' + chainHTML() + '</div><p class="wx-desc">' + t("chainNote") + "</p>" + cropHTML(S.master, "m", true) + "</div>" +
        '<div class="wx-box"><h3>' + t("addH") + '</h3><div class="wx-cat">' + FX_FILES.filter(function (id) { return REG[id]; }).map(function (id) {
          var d = REG[id]; return '<button type="button" class="wx-add" data-add="' + id + '"><b><span class="wx-fico">' + (d.icon || ICO.fx) + "</span>" + esc(tl(d.name)) + "</b>" + (d.desc ? "<span>" + esc(tl(d.short || d.desc)) + "</span>" : "") + "</button>";
        }).join("") + "</div>" + (pend ? '<p class="wx-desc">' + t("fxLoading") + "</p>" : "") + (fail.length ? '<p class="wx-desc">' + fmt(t("fxFail"), { n: fail.join(", ") }) + "</p>" : "") + "</div>";
    } else {
      var io0 = ioRange(), ioTxt = F && (F.inF != null || F.outF != null) ? fmt(t("ioInfo"), { a: io0.a + 1, b: io0.b + 1, n: io0.b - io0.a + 1 }) : t("ioAll"), ow = F ? F.ow : 1920, oh = F ? F.oh : 1080;
      h = '<div class="wx-box"><h3>' + t("exportH") + '</h3>' +
        '<div class="wx-row"><label>' + t("fps") + '</label><div class="wx-seg">' + RATES.map(function (r, i) { return '<button type="button" data-fps="' + i + '" aria-pressed="' + (S.fpsI === i) + '"' + (busy ? " disabled" : "") + ">" + r + "</button>"; }).join("") + "</div></div>" +
        '<div class="wx-row"><label for="wx-br">' + t("bitrate") + '<span id="wx-br-v">' + S.mbit + ' Mbit/s</span></label><input type="range" id="wx-br" min="2" max="60" step="1" value="' + S.mbit + '"></div>' +
        '<label class="wx-chk"><input type="checkbox" data-opt="audio"' + (S.audio ? " checked" : "") + "> " + t("audio") + "</label>" +
        '<p class="wx-desc" id="wx-info">' + fmt(t("exportInfo"), { w: ow, h: oh, f: fps(), br: S.mbit }) + "</p>" + (F ? '<p class="wx-iot">' + ioTxt + "</p>" : "") +
        (busy ? '<button type="button" class="wx-save" data-wx="cancel">' + t("cancel") + "</button>" : '<button type="button" class="wx-save" data-wx="export"' + (ready ? "" : " disabled") + ">" + t("save") + "</button>") + "</div>" +
        '<div class="wx-box"><h3>' + t("frameH") + '</h3><p class="wx-desc">' + fmt(t("frameInfo"), { w: ow, h: oh }) + '</p><button type="button" class="wx-qpbtn" data-wx="frame"' + (ready && !busy ? "" : " disabled") + ">" + t("frameSave") + "</button></div>";
    }
    sc.innerHTML = h;
  }
  function updateBar(light) {
    if (!V || !F) return;
    var fr = V.root.querySelector("#wx-fr"); if (!fr) return;
    fr.textContent = fmt(t("frame"), { i: F.idx + 1, n: F.n });
    var pos = V.root.querySelector("#wx-pos"); pos.max = F.n - 1; pos.value = F.idx;
    V.root.querySelector("#wx-time").textContent = tc(F.idx / fps()) + " / " + tc(F.dur);
    if (light) return;
    var pb = V.root.querySelector("#wx-play"); pb.textContent = V.playing ? "❚❚ " + t("pause") : "▶ " + t("play"); pb.classList.toggle("on", !!V.playing);
    V.root.querySelector('[data-wx="prev"]').disabled = F.idx === 0 || V.playing;
    V.root.querySelector('[data-wx="next"]').disabled = F.idx >= F.n - 1 || V.playing;
    var ioc = V.root.querySelector("#wx-ioc"); if (ioc) ioc.hidden = F.inF == null && F.outF == null;
    var ld = V.root.querySelector("#wx-load"); if (ld) ld.hidden = !V.loading;
    drawStrip();
  }
  function tc(s) { s = Math.max(0, s || 0); var m = Math.floor(s / 60), r = s - m * 60; return m + ":" + (r < 10 ? "0" : "") + r.toFixed(1).replace(".", lang === "de" ? "," : "."); }
  function note(s) { if (!V) return; V.lastNote = s; var n = V.root.querySelector("#wx-note") || V.root.querySelector("#wx-dn"); if (n) n.textContent = s; }
  function sideState() {
    var w = V.root.querySelector(".wx-wrap"); if (!w) return;
    w.classList.toggle("wx-closed", !S.sideOpen);
    var b = V.root.querySelector(".wx-stog"); if (b) b.setAttribute("aria-expanded", String(S.sideOpen));
    layout(); setTimeout(layout, 280);
  }
  function fsEl() { return document.fullscreenElement || document.webkitFullscreenElement; }
  function toggleFS() {
    var w = V.root.querySelector(".wx-wrap"); if (!w) return;
    if (w.classList.contains("wx-fs")) { if (fsEl()) { var ex = document.exitFullscreen || document.webkitExitFullscreen; try { var p0 = ex.call(document); if (p0 && p0.catch) p0.catch(function () {}); } catch (e) {} } w.classList.remove("wx-fs"); fsDone(); return; }
    w.classList.add("wx-fs");
    var rq = w.requestFullscreen || w.webkitRequestFullscreen;
    if (rq) { try { var p = rq.call(w); if (p && p.catch) p.catch(function () {}); } catch (e2) {} }
    fsDone();
  }
  function fsDone() {
    var w = V.root.querySelector(".wx-wrap"), on = w && w.classList.contains("wx-fs"), b = V.root.querySelector("#wx-fsb");
    if (b) { b.title = t(on ? "fsOff" : "fs") + " (F)"; b.setAttribute("aria-label", t(on ? "fsOff" : "fs")); b.setAttribute("aria-pressed", String(!!on)); }
    document.documentElement.classList.toggle("wx-noscroll", !!on);
    layout(); setTimeout(layout, 120); setTimeout(layout, 400);
  }
  function onFsChange() { if (!V) return; var w = V.root.querySelector(".wx-wrap"); if (w) w.classList.toggle("wx-fs", !!fsEl()); fsDone(); }

  // ---------- Drag & Drop der Effektkette ----------
  // Am Griff ziehen: das Element wandert live an die Stelle, über deren Mitte der Zeiger gerade ist.
  var drag = null;
  function onGripDown(e) {
    var g = e.target.closest && e.target.closest("[data-grip]"); if (!g || busy) return;
    var item = g.closest(".wx-item"), list = item && item.parentNode; if (!item) return;
    e.preventDefault();
    drag = { id: e.pointerId, uid: +g.dataset.grip, item: item, list: list, y0: e.clientY, on: false };
    try { g.setPointerCapture(e.pointerId); } catch (er) {}
  }
  function onGripMove(e) {
    if (!drag || e.pointerId !== drag.id) return;
    if (!drag.on) { if (Math.abs(e.clientY - drag.y0) < 4) return; drag.on = true; drag.item.classList.add("drag"); }
    var items = Array.prototype.filter.call(drag.list.querySelectorAll(".wx-item"), function (n) { return n !== drag.item; });
    var before = null;
    for (var i = 0; i < items.length; i++) { var r = items[i].getBoundingClientRect(); if (e.clientY < r.top + r.height / 2) { before = items[i]; break; } }
    var ref = before ? before : null, flowOf = function (n) { return n.nextElementSibling && n.nextElementSibling.classList.contains("wx-flow") ? n.nextElementSibling : null; };
    var myFlow = flowOf(drag.item);
    if (ref) { if (ref === drag.item.nextElementSibling || ref === (myFlow && myFlow.nextElementSibling)) return; drag.list.insertBefore(drag.item, ref); }
    else { if (!flowOf(drag.item) || !flowOf(drag.item).nextElementSibling) return; drag.list.appendChild(drag.item); }
    if (myFlow) drag.item.parentNode.insertBefore(myFlow, drag.item.nextSibling);
    // Reihenfolge sofort übernehmen, damit die Vorschau beim Ziehen mitgeht
    var order = Array.prototype.map.call(drag.list.querySelectorAll(".wx-item"), function (n) { return +n.dataset.item; });
    S.chain.sort(function (a, b) { return order.indexOf(a.uid) - order.indexOf(b.uid); });
    Array.prototype.forEach.call(drag.list.querySelectorAll(".wx-num"), function (n, k) { n.textContent = k + 1; });
    need();
  }
  function onGripUp(e) {
    if (!drag || e.pointerId !== drag.id) return;
    var was = drag.on; drag.item.classList.remove("drag"); drag = null;
    if (was) { updateSide(); need(); }
  }

  // ---------- Maus im Bild: Pipette und Bereich bearbeiten ----------
  function cvPos(e) { var r = V.cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height, pw: r.width, ph: r.height }; }
  function cropHit(cr, p) {   // was liegt unter dem Zeiger: Kanten (l, r, t, b) oder innen (move)
    var r = cropAt(cr, V.playing ? V.vid.currentTime : tFrame(F.idx)), tx = 10 / p.pw, ty = 10 / p.ph;
    var l = r.x - r.w / 2, rr = r.x + r.w / 2, tp = r.y - r.h / 2, bt = r.y + r.h / 2;
    if (p.x < l - tx || p.x > rr + tx || p.y < tp - ty || p.y > bt + ty) return null;
    var e = { l: Math.abs(p.x - l) <= tx, r: Math.abs(p.x - rr) <= tx, t: Math.abs(p.y - tp) <= ty, b: Math.abs(p.y - bt) <= ty };
    if (e.l || e.r || e.t || e.b) return { edges: e, r: r };
    return { move: true, r: r };
  }
  function hitCursor(h) {
    if (!h) return "default"; if (h.move) return "move";
    var e = h.edges; if ((e.l && e.t) || (e.r && e.b)) return "nwse-resize"; if ((e.r && e.t) || (e.l && e.b)) return "nesw-resize";
    return e.l || e.r ? "ew-resize" : "ns-resize";
  }
  function cursorState() { if (V && V.cv) { V.cv.classList.toggle("pick", !!V.picking); if (!V.picking && !V.editCrop) V.cv.style.cursor = ""; } }
  function onCvDown(e) {
    if (!V || !V.cv || e.target !== V.cv || !F || !V.ready || busy) return;
    if (e.button !== undefined && e.button > 0) return;
    var p = cvPos(e);
    if (V.picking) {   // Pipette: Farbe aus dem Video (vor allen Effekten) nehmen
      e.preventDefault();
      var pv = V.pv, x = clamp(Math.floor(p.x * pv.width), 0, pv.width - 1), y = clamp(Math.floor(p.y * pv.height), 0, pv.height - 1);
      var dd = pv.getContext("2d", { willReadFrequently: true }).getImageData(x, y, 1, 1).data, hx = "#" + [dd[0], dd[1], dd[2]].map(function (v) { return (v < 16 ? "0" : "") + v.toString(16); }).join("").toUpperCase();
      var it = findIt(V.picking.uid); if (it) it.p[V.picking.k] = hx;
      V.picking = null; cursorState(); updateSide(); need(); return;
    }
    var cr = V.editCrop && cropOf(V.editCrop); if (!cr || !cr.on) return;
    var h = cropHit(cr, p); if (!h) return;
    e.preventDefault(); try { V.cv.setPointerCapture(e.pointerId); } catch (er) {}
    V.cdrag = { id: e.pointerId, cr: cr, hit: h, p0: p, r0: Object.assign({}, h.r), r: Object.assign({}, h.r), rec: false };
    V.recPrev = null; V.lastRec = -1; need();
  }
  function onCvMove(e) {
    if (!V || !V.cv) return;
    if (V.cdrag && e.pointerId === V.cdrag.id) {
      var d = V.cdrag, p = cvPos(e), dx = p.x - d.p0.x, dy = p.y - d.p0.y, r0 = d.r0, r;
      if (d.hit.move) r = { x: r0.x + dx, y: r0.y + dy, w: r0.w, h: r0.h };
      else {
        var l = r0.x - r0.w / 2, rr = r0.x + r0.w / 2, tp = r0.y - r0.h / 2, bt = r0.y + r0.h / 2, ed = d.hit.edges;
        if (ed.l) l = Math.min(clamp(l + dx, 0, 1), rr - 0.02); if (ed.r) rr = Math.max(clamp(rr + dx, 0, 1), l + 0.02);
        if (ed.t) tp = Math.min(clamp(tp + dy, 0, 1), bt - 0.02); if (ed.b) bt = Math.max(clamp(bt + dy, 0, 1), tp + 0.02);
        r = { x: (l + rr) / 2, y: (tp + bt) / 2, w: rr - l, h: bt - tp };
      }
      d.r = cropFix(r);
      if (!V.playing) { if (d.cr.keys.length) cropSetKey(d.cr, tFrame(F.idx), d.r); else d.cr.cur = d.r; }   // im Stand: ein Keyframe oder (ohne Keyframes) feste Lage
      need(); return;
    }
    if (e.target === V.cv && V.editCrop && !V.picking) { var cr = cropOf(V.editCrop); V.cv.style.cursor = cr && cr.on ? hitCursor(cropHit(cr, cvPos(e))) : ""; }
  }
  function onCvUp(e) {
    if (!V || !V.cdrag || e.pointerId !== V.cdrag.id) return;
    var d = V.cdrag; V.cdrag = null;
    if (V.playing) cropRecord(d.cr, V.vid.currentTime, d.r);
    updateSide(); drawStrip(); need();
  }

  // ---------- Eingaben ----------
  function onClick(e) {
    var b = e.target.closest("[data-wx],[data-tab],[data-add],[data-v],[data-fps],[data-pick],[data-cropedit],[data-cropclear]"); if (!b) return;
    if (b.dataset.pick) { var pk = { uid: +b.dataset.pick, k: b.dataset.k }; V.picking = V.picking && V.picking.uid === pk.uid && V.picking.k === pk.k ? null : pk; if (V.picking) V.editCrop = null; cursorState(); updateSide(); need(); return; }
    if (b.dataset.cropedit) { V.editCrop = V.editCrop === b.dataset.cropedit ? null : b.dataset.cropedit; V.picking = null; cursorState(); updateSide(); drawStrip(); need(); return; }
    if (b.dataset.cropclear) { var cc = cropOf(b.dataset.cropclear); if (cc) { cc.cur = cropAt(cc, F && V.ready ? tFrame(F.idx) : 0); cc.keys = []; } updateSide(); drawStrip(); need(); return; }
    if (b.dataset.tab) { S.tab = b.dataset.tab; if (!S.sideOpen) { S.sideOpen = true; sideState(); } updateSide(); return; }
    if (b.dataset.add) { addFx(b.dataset.add); return; }
    if (b.dataset.fps !== undefined) { if (busy) return; var tm = F && V.ready ? F.idx / fps() : 0; S.fpsI = +b.dataset.fps; if (F && V.ready) { F.n = Math.max(1, Math.floor(F.dur * fps())); F.inF = null; F.outF = null; goFrame(Math.floor(tm * fps())); } updateSide(); return; }
    if (b.dataset.v !== undefined && b.dataset.uid) { var it0 = findIt(+b.dataset.uid); if (it0) { it0.p[b.dataset.k] = b.dataset.v; Array.prototype.forEach.call(b.parentNode.children, function (s) { s.setAttribute("aria-pressed", String(s === b)); }); need(); } return; }
    var a = b.dataset.wx, it = b.dataset.uid ? findIt(+b.dataset.uid) : null;
    if (a === "side") { S.sideOpen = !S.sideOpen; sideState(); return; }
    if (a === "fs") { if (F && V.ready) toggleFS(); return; }
    if (a === "file") { if (!busy) V.root.querySelector("#wx-file").click(); return; }
    if (a === "on" && it) { it.on = !it.on; updateSide(); need(); return; }
    if (a === "open" && it) { it.open = !it.open; updateSide(); return; }
    if (a === "del" && it) { S.chain = S.chain.filter(function (q) { return q !== it; }); if (V.editCrop === String(it.uid)) V.editCrop = null; if (V.picking && V.picking.uid === it.uid) V.picking = null; cursorState(); updateSide(); need(); return; }
    if (a === "dup" && it) { var i = S.chain.indexOf(it), cp = { uid: ++uidN, id: it.id, on: it.on, open: true, mix: it.mix, p: Object.assign({}, it.p), crop: JSON.parse(JSON.stringify(it.crop)) }; it.open = false; S.chain.splice(i + 1, 0, cp); updateSide(); need(); return; }
    if (a === "reset" && it && REG[it.id]) { it.p = defaults(REG[it.id]); it.mix = 100; updateSide(); need(); return; }
    if (a === "allOff") { V.allOff = !V.allOff; b.setAttribute("aria-pressed", String(V.allOff)); need(); return; }
    if (!F || !V.ready) return;
    if (a === "prev") goFrame(F.idx - 1);
    else if (a === "next") goFrame(F.idx + 1);
    else if (a === "play") { if (V.playing) stopPlay(); else startPlay(); }
    else if (a === "ioIn") ioSet("in");
    else if (a === "ioOut") ioSet("out");
    else if (a === "ioClear") ioSet("clear");
    else if (a === "export") doExport();
    else if (a === "frame") exportFrame();
    else if (a === "cancel") cancelReq = true;
  }
  function onInput(e) {
    var el = e.target;
    if (el.dataset.uid && el.dataset.k) {
      var it = findIt(+el.dataset.uid); if (!it) return;
      if (el.dataset.k === "__mix") { it.mix = +el.value; V.root.querySelector("#wx-mix-" + it.uid + "-v").textContent = it.mix + " %"; need(); return; }
      var def = REG[it.id], q = def && def.params.filter(function (x) { return x.k === el.dataset.k; })[0]; if (!q) return;
      if (q.type === "range") { it.p[q.k] = +el.value; var lb = V.root.querySelector("#wx-p-" + it.uid + "-" + q.k + "-v"); if (lb) lb.textContent = el.value + (q.unit || ""); }
      else if (q.type === "color") { it.p[q.k] = el.value; var sp = el.parentNode.querySelector("label span"); if (sp) sp.textContent = el.value; }
      else if (q.type === "check") it.p[q.k] = el.checked;
      need(); return;
    }
    if (el.dataset.crop && el.dataset.ck) {
      var cr = cropOf(el.dataset.crop); if (!cr) return; var ck = el.dataset.ck;
      if (ck === "on") { cr.on = el.checked; if (cr.on && F && V.ready) V.editCrop = el.dataset.crop; else if (!cr.on && V.editCrop === el.dataset.crop) V.editCrop = null; cursorState(); updateSide(); drawStrip(); need(); return; }
      if (ck === "inv") { cr.inv = el.checked; need(); return; }
      cr[ck] = +el.value; var lb2 = V.root.querySelector((ck === "feather" ? "#wx-cf-" : "#wx-cs-") + el.dataset.crop + "-v"); if (lb2) lb2.textContent = el.value + (ck === "feather" ? " px" : " %"); need(); return;
    }
    if (el.id === "wx-br") { S.mbit = +el.value; V.root.querySelector("#wx-br-v").textContent = S.mbit + " Mbit/s"; var inf = V.root.querySelector("#wx-info"); if (inf) inf.textContent = fmt(t("exportInfo"), { w: F ? F.ow : 1920, h: F ? F.oh : 1080, f: fps(), br: S.mbit }); return; }
    if (el.id === "wx-pos" && F && V.ready && !V.playing) goFrame(+el.value);
  }
  function onChange(e) {
    var el = e.target;
    if (el.id === "wx-file" && el.files[0]) { loadFile(el.files[0]); el.value = ""; return; }
    if (el.dataset.opt) { S[el.dataset.opt] = el.checked; el.blur(); }
  }
  function onKey(e) {
    if (!V) return;
    var tg = e.target, tag = tg && tg.tagName;
    if (tag === "INPUT" && tg.type !== "range" && tg.type !== "checkbox" || tag === "TEXTAREA" || tag === "SELECT") return;
    // Griff im Fokus: Pfeiltasten verschieben den Effekt
    if (tg && tg.dataset && tg.dataset.grip && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
      e.preventDefault(); var uid = +tg.dataset.grip, i = S.chain.findIndex(function (q) { return q.uid === uid; });
      moveIt(uid, i + (e.key === "ArrowUp" ? -1 : 1)); updateSide();
      var ng = V.root.querySelector('[data-grip="' + uid + '"]'); if (ng) ng.focus(); return;
    }
    if (!F || !V.ready || e.ctrlKey || e.metaKey || e.altKey) return;
    var k = e.key.toLowerCase();
    if (k === "d") { e.preventDefault(); if (!V.peek) { V.peek = true; var pk = V.root.querySelector("#wx-peek"); if (pk) pk.hidden = false; need(); } return; }
    if (k === "f") { e.preventDefault(); toggleFS(); return; }
    if (k === "escape" && (V.picking || V.editCrop)) { V.picking = null; V.editCrop = null; cursorState(); updateSide(); drawStrip(); need(); return; }
    if (k === "escape") { var w = V.root.querySelector(".wx-wrap"); if (w && w.classList.contains("wx-fs") && !fsEl()) { toggleFS(); return; } }
    if ((k === "i" || k === "o") && !V.playing) { e.preventDefault(); ioSet(k === "i" ? "in" : "out"); return; }
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") { if (tag === "INPUT" && tg.type === "range") return; e.preventDefault(); if (!V.playing) goFrame(F.idx + (e.key === "ArrowLeft" ? -1 : 1)); return; }
    if (e.key === " ") { if (tag === "BUTTON") return; e.preventDefault(); if (V.playing) stopPlay(); else startPlay(); }
  }
  function onKeyUp(e) { if (V && (e.key === "d" || e.key === "D") && V.peek) { V.peek = false; var pk = V.root.querySelector("#wx-peek"); if (pk) pk.hidden = true; need(); } }
  function onBlurWin() { if (V && V.peek) { V.peek = false; need(); } }
  function onDragOver(e) { if (!e.dataTransfer || Array.prototype.indexOf.call(e.dataTransfer.types || [], "Files") < 0) return; e.preventDefault(); V.root.querySelector("#wx-desk").classList.add("over"); }
  function onDragLeave(e) { if (e.target.id === "wx-desk") V.root.querySelector("#wx-desk").classList.remove("over"); }
  function onDrop(e) { if (!e.dataTransfer || !e.dataTransfer.files.length) return; e.preventDefault(); V.root.querySelector("#wx-desk").classList.remove("over"); if (!busy) loadFile(e.dataTransfer.files[0]); }
  var rsT = 0;
  function onResize() { clearTimeout(rsT); rsT = setTimeout(layout, 120); }

  function injectCSS() { var o = document.getElementById("wx-css"); if (o) o.remove(); var s = document.createElement("style"); s.id = "wx-css"; s.textContent = CSS; document.head.appendChild(s); }
  function mount(el, l) {
    unmount();
    lang = l === "en" ? "en" : "de";
    injectCSS(); document.body.classList.add("wx-theme");
    el.innerHTML = html();
    V = { root: el, need: true };
    el.addEventListener("click", onClick); el.addEventListener("input", onInput); el.addEventListener("change", onChange);
    el.addEventListener("pointerdown", onGripDown); window.addEventListener("pointermove", onGripMove); window.addEventListener("pointerup", onGripUp); window.addEventListener("pointercancel", onGripUp);
    el.addEventListener("pointerdown", onCvDown); window.addEventListener("pointermove", onCvMove); window.addEventListener("pointerup", onCvUp); window.addEventListener("pointercancel", onCvUp);
    window.addEventListener("keydown", onKey); window.addEventListener("keyup", onKeyUp); window.addEventListener("blur", onBlurWin); window.addEventListener("resize", onResize);
    document.addEventListener("fullscreenchange", onFsChange); document.addEventListener("webkitfullscreenchange", onFsChange);
    var desk = el.querySelector("#wx-desk");
    desk.addEventListener("dragover", onDragOver); desk.addEventListener("dragleave", onDragLeave); desk.addEventListener("drop", onDrop);
    loadEffects();
    buildUI();
    raf = requestAnimationFrame(loop);
  }
  function unmount() {
    if (raf) cancelAnimationFrame(raf); raf = 0;
    document.body.classList.remove("wx-theme"); document.documentElement.classList.remove("wx-noscroll");
    document.removeEventListener("fullscreenchange", onFsChange); document.removeEventListener("webkitfullscreenchange", onFsChange);
    if (fsEl()) { try { var ex = document.exitFullscreen || document.webkitExitFullscreen; var p = ex.call(document); if (p && p.catch) p.catch(function () {}); } catch (e) {} }
    if (!V) return;
    cancelReq = true;
    if (V.vid) V.vid.pause();
    window.removeEventListener("pointermove", onGripMove); window.removeEventListener("pointerup", onGripUp); window.removeEventListener("pointercancel", onGripUp);
    window.removeEventListener("pointermove", onCvMove); window.removeEventListener("pointerup", onCvUp); window.removeEventListener("pointercancel", onCvUp); V.root.removeEventListener("pointerdown", onCvDown);
    window.removeEventListener("keydown", onKey); window.removeEventListener("keyup", onKeyUp); window.removeEventListener("blur", onBlurWin); window.removeEventListener("resize", onResize);
    V.root.removeEventListener("click", onClick); V.root.removeEventListener("input", onInput); V.root.removeEventListener("change", onChange); V.root.removeEventListener("pointerdown", onGripDown);
    V = null;
  }

  window.WeFX = { register: register, util: util, mount: mount, unmount: unmount, _debug: function () { return { F: F, V: V, S: S, REG: REG }; } };
})();
