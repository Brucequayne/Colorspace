/* EZ Crop 0.1 – Videos im Browser auf 9:16 zuschneiden, Crop-Fahrt live per Maus aufnehmen. Für Color Space.
   Einbindung: ezcrop.js per script-Tag laden, dann EzCrop.mount(element, "de" | "en") und EzCrop.unmount().
   Für den Export wird mp4-muxer.js (MIT) aus demselben Ordner nachgeladen. Videos verlassen nie das Gerät. */
(function () {
  "use strict";

  var VERSION = "0.11", OUT_W = 1080, OUT_H = 1920, FPS = 30, BITRATE = 16000000;
  var lang = "de";

  function L2(de, en) { return { de: de, en: en }; }
  var TX = {
    title: L2("EZ Crop", "EZ Crop"),
    intro: L2("Video laden, abspielen und den 9:16-Rahmen live mit der Maus führen. EZ Crop merkt sich die Fahrt als Keyframes und rechnet nur diesen Ausschnitt als Full-HD-MP4 für TikTok und Co. heraus. Das Video verlässt dein Gerät nicht.",
              "Load a video, play it and steer the 9:16 frame live with your mouse. EZ Crop remembers the move as keyframes and renders only that section as a Full HD MP4 for TikTok and similar. The video never leaves your device."),
    drop: L2("Video hierher ziehen", "Drop a video here"), or: L2("oder", "or"), pick: L2("Video auswählen", "Choose video"),
    dropNote: L2("MP4, MOV oder WebM · bleibt auf deinem Gerät", "MP4, MOV or WebM · stays on your device"),
    other: L2("Anderes Video", "Other video"), play: L2("Abspielen", "Play"), pause: L2("Pause", "Pause"),
    hint: L2("Während das Video läuft: Rahmen mit gedrückter Maus führen, das wird aufgezeichnet. Im Pausenmodus setzt Ziehen einen einzelnen Keyframe.",
             "While the video plays: hold the mouse and steer the frame, this gets recorded. When paused, dragging sets a single keyframe."),
    preview: L2("Vorschau 9:16", "Preview 9:16"), scale: L2("Größe des Rahmens", "Frame size"), smooth: L2("Glättung", "Smoothing"),
    keys: L2("{n} Keyframes", "{n} keyframes"), noKeys: L2("Noch keine Keyframes: der Rahmen steht still.", "No keyframes yet: the frame stays still."),
    clear: L2("Keyframes löschen", "Clear keyframes"), sure: L2("Wirklich alle löschen?", "Really clear all?"),
    rec: L2("Aufnahme", "Recording"),
    exportH: L2("Export", "Export"), exportInfo: L2("MP4 · {w} × {h} · 30 Bilder/s · H.264, variable Bitrate um {br} Mbit/s · mit Ton", "MP4 · {w} × {h} · 30 fps · H.264, variable bitrate around {br} Mbps · with audio"),
    modeHD: L2("Full HD", "Full HD"), modeLow: L2("Low Quality · nativ", "Low quality · native"),
    lowInfo: L2("Für Material, das schon mit wenig Bitrate kam: Der Ausschnitt wird in seiner echten Pixelgröße gerendert, ohne Hochskalieren, und die Bitrate richtet sich nach der Quelle (hier etwa {src} Mbit/s). Maßgeblich ist der größte Rahmen der Fahrt.",
                "For footage that already came with a low bitrate: the section is rendered at its real pixel size, without upscaling, and the bitrate follows the source (about {src} Mbps here). The largest frame of the move sets the size."),
    save: L2("Als MP4 exportieren", "Export as MP4"), cancel: L2("Abbrechen", "Cancel"),
    working: L2("Bild {i} von {n} … {p} %", "Frame {i} of {n} … {p}%"), audio: L2("Ton wird kodiert …", "Encoding audio …"),
    done: L2("Fertig: {mb} MB, im Schnitt {mbit} Mbit/s.", "Done: {mb} MB, {mbit} Mbps on average."), cancelled: L2("Abgebrochen.", "Cancelled."),
    noSupport: L2("Dein Browser kann keine Videos kodieren. Bitte Chrome, Edge, Opera oder Safari in aktueller Version verwenden.", "Your browser cannot encode video. Please use a current Chrome, Edge, Opera or Safari."),
    opusNote: L2("Hinweis: Dieser Browser kann kein AAC kodieren, der Ton ist deshalb Opus. Für TikTok besser Chrome oder Edge unter Windows oder macOS nutzen.", "Note: this browser cannot encode AAC, so the audio is Opus. For TikTok, better use Chrome or Edge on Windows or macOS."),
    noAudio: L2("Ohne Ton exportiert: Die Tonspur ließ sich nicht lesen.", "Exported without audio: the audio track could not be read."),
    failed: L2("Export fehlgeschlagen: {e}", "Export failed: {e}"),
    bad: L2("Diese Datei konnte nicht als Video geöffnet werden.", "This file could not be opened as a video."),
    howH: L2("So funktioniert’s", "How it works"),
    how1: L2("Spiel das Video ab und halte die Maus im Bild gedrückt: Der 9:16-Rahmen folgt deiner Hand, und jede Bewegung wird mit der Zeit des Videos gespeichert. Fährst du eine Stelle später noch einmal, ersetzt die neue Fahrt die alte nur dort, wo du gefahren bist. Mit dem Regler für die Größe zoomst du hinein, auch das wird beim Abspielen aufgezeichnet.",
             "Play the video and hold the mouse down in the picture: the 9:16 frame follows your hand, and every movement is stored with the video's time. If you go over a passage again later, the new move replaces the old one only where you moved. The size slider zooms in, and that is recorded during playback too."),
    how2: L2("Glättung nimmt kleine Zitterer aus der Fahrt. Der Export rechnet Bild für Bild den Ausschnitt in 1080 × 1920 heraus, 30 Bilder pro Sekunde, mit variabler Bitrate um 16 Mbit/s, das liegt im empfohlenen Bereich von 12 bis 18 Mbit/s für TikTok. Der Ton wird übernommen.",
             "Smoothing takes small jitters out of the move. The export renders the section frame by frame at 1080 × 1920, 30 frames per second, with a variable bitrate around 16 Mbps, within the 12 to 18 Mbps range recommended for TikTok. The audio is kept."),
    how3: L2("Der Export läuft vollständig in deinem Browser. Er dauert je nach Rechner etwa so lange wie das Video selbst oder etwas länger.", "The export runs entirely in your browser. Depending on your computer it takes about as long as the video itself, or a little longer.")
  };
  function t(k) { return TX[k][lang]; }
  function fmt(s, o) { return s.replace(/\{(\w+)\}/g, function (_, k) { return o[k]; }); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function tc(s) { s = Math.max(0, s || 0); var m = Math.floor(s / 60), r = s - m * 60; return m + ":" + (r < 10 ? "0" : "") + r.toFixed(1); }

  // ---------- Zustand ----------
  var E = null;   // { file, url, name, dur, vw, vh, keys:[{t,x,y,s}], cur:{x,y,s}, smooth }
  var V = null;

  // Rahmen in Quellpixeln aus Mitte (0–1) und Größe (Anteil der Höhe)
  function rect(c) {
    var ch = c.s * E.vh, cw = ch * 9 / 16;
    if (cw > E.vw) { cw = E.vw; ch = cw * 16 / 9; }
    var x = clamp(c.x * E.vw, cw / 2, E.vw - cw / 2), y = clamp(c.y * E.vh, ch / 2, E.vh - ch / 2);
    return { x: x - cw / 2, y: y - ch / 2, w: cw, h: ch };
  }
  function interp(tm) {
    var k = E.keys;
    if (!k.length) return { x: E.cur.x, y: E.cur.y, s: E.cur.s };
    if (tm <= k[0].t) return k[0];
    if (tm >= k[k.length - 1].t) return k[k.length - 1];
    var lo = 0, hi = k.length - 1;
    while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (k[mid].t <= tm) lo = mid; else hi = mid; }
    var a = k[lo], b = k[hi], f = (tm - a.t) / ((b.t - a.t) || 1);
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, s: a.s + (b.s - a.s) * f };
  }
  function path(tm) {
    var w = E.smooth / 100 * 0.4;
    if (!E.keys.length || w <= 0) return interp(tm);
    var sx = 0, sy = 0, ss = 0, n = 0;
    for (var i = -4; i <= 4; i++) { var p = interp(tm + w * i / 4), wt = 5 - Math.abs(i); sx += p.x * wt; sy += p.y * wt; ss += p.s * wt; n += wt; }
    return { x: sx / n, y: sy / n, s: ss / n };
  }
  function setKey(tm, c) {
    var k = E.keys, i = k.findIndex(function (q) { return Math.abs(q.t - tm) < 1 / 60; });
    var nk = { t: tm, x: c.x, y: c.y, s: c.s };
    if (i >= 0) k[i] = nk; else { k.push(nk); k.sort(function (a, b) { return a.t - b.t; }); }
  }
  // Aufnahme: ersetzt nur die Keyframes zwischen dem letzten aufgenommenen Zeitpunkt und jetzt
  function recordKey(tm, c) {
    var prev = V.recPrev;
    if (prev === null || tm < prev) { prev = tm - 1e-3; }
    E.keys = E.keys.filter(function (q) { return !(q.t > prev && q.t <= tm + 1e-4); });
    E.keys.push({ t: tm, x: c.x, y: c.y, s: c.s });
    E.keys.sort(function (a, b) { return a.t - b.t; });
    V.recPrev = tm;
  }

  // ---------- Laden ----------
  function loadFile(file) {
    if (!file || !/^video\//.test(file.type) && !/\.(mp4|mov|m4v|webm|mkv)$/i.test(file.name || "")) { note(t("bad")); return; }
    if (E && E.url) URL.revokeObjectURL(E.url);
    var url = URL.createObjectURL(file);
    E = { file: file, url: url, name: (file.name || "video").replace(/\.[^.]+$/, ""), dur: 0, vw: 0, vh: 0, keys: [], cur: { x: 0.5, y: 0.5, s: 1 }, smooth: 40, mode: (E && E.mode) || "hd" };
    if (V) buildUI();
  }
  function onMeta() {
    var vid = V.vid;
    E.dur = vid.duration || 0; E.vw = vid.videoWidth; E.vh = vid.videoHeight;
    if (!E.vw) { note(t("bad")); return; }
    layout(); updateSide();
  }

  // ---------- Darstellung ----------
  function layout() {
    if (!V || !E || !E.vw) return;
    var desk = V.root.querySelector("#ez-desk"), cv = V.cv;
    var aw = desk.clientWidth - 36, ah = desk.clientHeight - 36, sc = Math.min(aw / E.vw, ah / E.vh);
    var cw = Math.round(E.vw * sc), ch = Math.round(E.vh * sc), dpr = window.devicePixelRatio || 1;
    cv.style.width = cw + "px"; cv.style.height = ch + "px";
    cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr);
    V.sc = cv.width / E.vw;
    var pv = V.pv, ph = Math.min(pv.parentNode.clientWidth * 16 / 9, Math.max(260, (window.innerWidth >= 1100 ? desk.clientHeight : window.innerHeight) * 0.6)), pw = Math.round(ph * 9 / 16);
    ph = Math.round(pw * 16 / 9);
    pv.style.width = pw + "px"; pv.style.height = ph + "px";
    pv.width = Math.round(pw * dpr); pv.height = Math.round(ph * dpr);
    var side = V.root.querySelector("#ez-side");
    if (side) side.style.maxHeight = window.innerWidth >= 1100 ? V.root.querySelector(".ez-deskbox").offsetHeight + "px" : "";
  }
  function current() {
    if (V.drag) return E.cur;
    return path(V.vid.currentTime);
  }
  var raf = 0, lastRec = 0;
  function frame() {
    raf = requestAnimationFrame(frame);
    if (!V || !E || !E.vw || V.vid.readyState < 2) return;
    var vid = V.vid, tm = vid.currentTime, playing = !vid.paused && !vid.ended;
    if (V.drag && playing && tm - lastRec >= 1 / 30) { recordKey(tm, E.cur); lastRec = tm; }
    if (!V.drag && E.keys.length) { var pc = path(tm); E.cur = { x: pc.x, y: pc.y, s: pc.s }; }
    var c = current(), r = rect(c), x = V.cv.getContext("2d"), sc = V.sc, W = V.cv.width, H = V.cv.height;
    x.drawImage(vid, 0, 0, W, H);
    x.fillStyle = "rgba(10,10,10,.6)";
    x.fillRect(0, 0, W, r.y * sc); x.fillRect(0, (r.y + r.h) * sc, W, H - (r.y + r.h) * sc);
    x.fillRect(0, r.y * sc, r.x * sc, r.h * sc); x.fillRect((r.x + r.w) * sc, r.y * sc, W - (r.x + r.w) * sc, r.h * sc);
    var dpr = window.devicePixelRatio || 1;
    x.strokeStyle = V.drag && playing ? "#E2621B" : "#F1EFEA"; x.lineWidth = 2 * dpr;
    x.strokeRect(r.x * sc, r.y * sc, r.w * sc, r.h * sc);
    x.strokeStyle = "rgba(241,239,234,.35)"; x.lineWidth = 1 * dpr; x.beginPath();
    for (var i = 1; i < 3; i++) { x.moveTo((r.x + r.w * i / 3) * sc, r.y * sc); x.lineTo((r.x + r.w * i / 3) * sc, (r.y + r.h) * sc); x.moveTo(r.x * sc, (r.y + r.h * i / 3) * sc); x.lineTo((r.x + r.w) * sc, (r.y + r.h * i / 3) * sc); }
    x.stroke();
    if (V.drag && playing) { x.fillStyle = "#E2621B"; x.beginPath(); x.arc(r.x * sc + 14 * dpr, r.y * sc + 14 * dpr, 6 * dpr, 0, Math.PI * 2); x.fill(); }
    var p = V.pv.getContext("2d"); p.imageSmoothingQuality = "high";
    p.drawImage(vid, r.x, r.y, r.w, r.h, 0, 0, V.pv.width, V.pv.height);
    // Zeitleiste
    var pos = V.root.querySelector("#ez-pos");
    if (!V.scrub) pos.value = E.dur ? Math.round(tm / E.dur * 1000) : 0;
    V.root.querySelector("#ez-time").textContent = tc(tm) + " / " + tc(E.dur);
    var pb = V.root.querySelector("#ez-play"); var lbl = playing ? t("pause") : t("play");
    if (pb.dataset.l !== lbl) { pb.dataset.l = lbl; pb.textContent = (playing ? "❚❚ " : "▶ ") + lbl; }
    drawKeys();
  }
  var keysSig = "";
  function drawKeys() {
    var k = E.keys, sig = k.length + ":" + (k.length ? k[0].t + k[k.length - 1].t : 0) + ":" + V.cv.width;
    if (sig === keysSig) return; keysSig = sig;
    var c = V.root.querySelector("#ez-keys"), w = c.clientWidth, dpr = window.devicePixelRatio || 1;
    c.width = Math.round(w * dpr); c.height = Math.round(10 * dpr);
    var x = c.getContext("2d"); x.clearRect(0, 0, c.width, c.height);
    x.fillStyle = "#E2621B";
    k.forEach(function (q) { var px = Math.round(q.t / (E.dur || 1) * c.width); x.fillRect(px, 0, Math.max(1, dpr), c.height); });
    var n = V.root.querySelector("#ez-kn"); if (n) n.textContent = k.length ? fmt(t("keys"), { n: k.length.toLocaleString(lang === "de" ? "de-DE" : "en-GB") }) : t("noKeys");
  }

  // ---------- Export ----------
  var busy = false, cancelReq = false;
  function loadMuxer() {
    if (window.Mp4Muxer) return Promise.resolve();
    return new Promise(function (res, rej) {
      var s = document.createElement("script"); s.src = "mp4-muxer.js"; s.onload = res; s.onerror = function () { rej(new Error("mp4-muxer.js")); };
      document.head.appendChild(s);
    });
  }
  function seek(v, tm) { return new Promise(function (res) { var done = function () { v.removeEventListener("seeked", done); res(); }; v.addEventListener("seeked", done); v.currentTime = tm; }); }
  function srcBitrate() { return E.file && E.dur ? E.file.size * 8 / E.dur : BITRATE; }
  // Ausgabegröße und Bitrate für den gewählten Modus
  function spec() {
    if (E.mode !== "low") return { w: OUT_W, h: OUT_H, br: BITRATE };
    var maxH = 0, list = E.keys.length ? E.keys : [E.cur];
    list.forEach(function (c) { maxH = Math.max(maxH, rect(c).h); });
    var k = clamp(Math.round(maxH / 32), 10, 60), w = k * 18, h = k * 32;           // exakt 9:16, gerade Werte, höchstens 1080 × 1920
    var br = srcBitrate() * (w * h) / (E.vw * E.vh) * 1.5;                          // Pixelanteil der Quelle plus Reserve
    br = clamp(Math.round(br / 1e5) * 1e5, 1000000, 12000000);
    return { w: w, h: h, br: br };
  }
  function mb1(v) { var s = (v / 1e6).toFixed(1); return lang === "de" ? s.replace(".", ",") : s; }
  async function pickVideoCodec(sp) {
    var list = ["avc1.640028", "avc1.4d0028", "avc1.42e028"];
    for (var i = 0; i < list.length; i++) {
      var cfg = { codec: list[i], width: sp.w, height: sp.h, bitrate: sp.br, bitrateMode: "variable", framerate: FPS, latencyMode: "quality", avc: { format: "avc" } };
      try { var r = await VideoEncoder.isConfigSupported(cfg); if (r.supported) return cfg; } catch (e) {}
    }
    return null;
  }
  async function readAudio() {
    try {
      var ab = await E.file.arrayBuffer(), ctx = new OfflineAudioContext(2, 48000, 48000);
      return await new Promise(function (res, rej) { ctx.decodeAudioData(ab, res, rej); });
    } catch (e) { return null; }
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
    if (busy || !E || !E.vw) return;
    if (typeof VideoEncoder === "undefined" || typeof VideoFrame === "undefined") { note(t("noSupport")); return; }
    busy = true; cancelReq = false; updateSide(); V.vid.pause();
    var notes = [];
    try {
      await loadMuxer();
      var sp = spec(), OW = sp.w, OH = sp.h;
      var vcfg = await pickVideoCodec(sp);
      if (!vcfg) { note(t("noSupport")); return; }
      var audio = await readAudio(), ach = audio ? Math.min(2, audio.numberOfChannels) : 0, acfg = audio ? await pickAudio(ach) : null;
      if (!audio) notes.push(t("noAudio")); else if (!acfg) { notes.push(t("noAudio")); audio = null; }
      else if (acfg.mux === "opus") notes.push(t("opusNote"));
      var target = new Mp4Muxer.ArrayBufferTarget();
      var muxer = new Mp4Muxer.Muxer({ target: target, video: { codec: "avc", width: OW, height: OH, frameRate: FPS },
        audio: audio ? { codec: acfg.mux, sampleRate: 48000, numberOfChannels: ach } : undefined, fastStart: "in-memory", firstTimestampBehavior: "offset" });
      var encErr = null;
      var venc = new VideoEncoder({ output: function (c, m) { muxer.addVideoChunk(c, m); }, error: function (e) { encErr = e; } });
      venc.configure(vcfg);
      var ev = document.createElement("video"); ev.muted = true; ev.playsInline = true; ev.preload = "auto"; ev.src = E.url;
      await new Promise(function (res, rej) { ev.onloadeddata = res; ev.onerror = function () { rej(new Error("video")); }; });
      var cv = document.createElement("canvas"); cv.width = OW; cv.height = OH;
      var x = cv.getContext("2d"); x.imageSmoothingQuality = "high";
      var n = Math.max(1, Math.floor(E.dur * FPS)), us = 1e6 / FPS;
      for (var i = 0; i < n; i++) {
        if (cancelReq || encErr) break;
        var tm = Math.min(i / FPS, E.dur - 0.001);
        await seek(ev, tm);
        var r = rect(path(tm));
        x.drawImage(ev, r.x, r.y, r.w, r.h, 0, 0, OW, OH);
        var vf = new VideoFrame(cv, { timestamp: Math.round(i * us), duration: Math.round(us) });
        venc.encode(vf, { keyFrame: i % (FPS * 2) === 0 }); vf.close();
        while (venc.encodeQueueSize > 6) await new Promise(function (r2) { setTimeout(r2, 4); });
        if (i % 5 === 0) note(fmt(t("working"), { i: i + 1, n: n, p: Math.round(i / n * (audio ? 92 : 100)) }));
      }
      if (encErr) throw encErr;
      if (cancelReq) { venc.close(); note(t("cancelled")); return; }
      await venc.flush(); venc.close();
      if (audio) {
        note(t("audio"));
        var aenc = new AudioEncoder({ output: function (c, m) { muxer.addAudioChunk(c, m); }, error: function (e) { encErr = e; } });
        aenc.configure(acfg.cfg);
        var total = Math.min(audio.length, Math.round(E.dur * 48000)), step = 1024, chans = [];
        for (var c2 = 0; c2 < ach; c2++) chans.push(audio.getChannelData(c2));
        for (var s = 0; s < total; s += step) {
          var len = Math.min(step, total - s), buf = new Float32Array(len * ach);
          for (var c3 = 0; c3 < ach; c3++) buf.set(chans[c3].subarray(s, s + len), c3 * len);
          var ad = new AudioData({ format: "f32-planar", sampleRate: 48000, numberOfFrames: len, numberOfChannels: ach, timestamp: Math.round(s / 48000 * 1e6), data: buf });
          aenc.encode(ad); ad.close();
          if (aenc.encodeQueueSize > 50) await new Promise(function (r3) { setTimeout(r3, 2); });
        }
        await aenc.flush(); aenc.close();
        if (encErr) throw encErr;
      }
      muxer.finalize();
      var blob = new Blob([target.buffer], { type: "video/mp4" }), url = URL.createObjectURL(blob), a = document.createElement("a");
      a.href = url; a.download = E.name + (E.mode === "low" ? "-ezcrop-" + OW + "x" + OH : "-ezcrop") + ".mp4"; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
      var mb = blob.size / 1048576, mbit = blob.size * 8 / (E.dur || 1) / 1e6;
      note([fmt(t("done"), { mb: mb.toFixed(1).replace(".", lang === "de" ? "," : "."), mbit: mbit.toFixed(1).replace(".", lang === "de" ? "," : ".") })].concat(notes).join(" "));
    } catch (e) {
      note(fmt(t("failed"), { e: (e && e.message) || e }));
    } finally { busy = false; updateSide(); }
  }

  // ---------- Oberfläche ----------
  var CSS = ".ez-ver{display:inline-block;margin-left:10px;padding:1px 8px;border:1px solid var(--line);font:600 .75rem var(--f-body);color:var(--soft);vertical-align:middle}" +
    ".ez-wrap{display:grid;grid-template-columns:minmax(0,1fr);gap:20px;margin-top:22px}" +
    ".ez-desk{position:relative;width:100%;aspect-ratio:16/9;min-height:300px;display:grid;place-items:center;padding:18px;overflow:hidden;background:#24221F;touch-action:none}" +
    ".ez-desk.over{outline:3px dashed #E3B83F;outline-offset:-10px}" +
    ".ez-desk canvas{display:block;cursor:grab}.ez-desk canvas.grab{cursor:grabbing}" +
    ".ez-drop{text-align:center;color:#F1EFEA;display:flex;flex-direction:column;align-items:center;gap:10px}" +
    ".ez-drop b{font:600 1.4rem/1.2 var(--f-display)}.ez-drop span{color:rgba(241,239,234,.7)}" +
    ".ez-pick{font:600 1rem var(--f-body);padding:12px 20px;border:0;background:#F1EFEA;color:#151715;cursor:pointer}" +
    ".ez-bar{display:flex;align-items:center;gap:12px;margin-top:10px;flex-wrap:wrap}" +
    ".ez-bar button{font:600 .92rem var(--f-body);padding:9px 16px;border:0;background:var(--ink);color:var(--bg);cursor:pointer;min-width:120px}" +
    ".ez-tl{flex:1;min-width:200px;display:flex;flex-direction:column;gap:3px}" +
    ".ez-tl input{width:100%;accent-color:#E2621B;margin:0}.ez-tl canvas{display:block;width:100%;height:10px;background:var(--line)}" +
    ".ez-time{font:600 .9rem var(--f-body);font-variant-numeric:tabular-nums;color:var(--soft);min-width:96px;text-align:right}" +
    ".ez-hint{margin:8px 0 0;color:var(--soft);font-size:.9rem}" +
    ".ez-side{display:flex;flex-direction:column;gap:14px;min-width:0}" +
    ".ez-box{border:1px solid var(--line);background:var(--card,transparent);padding:14px 16px;display:flex;flex-direction:column;gap:12px}" +
    ".ez-box h3{font:600 .78rem/1 var(--f-body);letter-spacing:.12em;text-transform:uppercase;color:var(--soft);margin:0}" +
    ".ez-pv{display:block;background:#111;max-width:100%}" +
    ".ez-row{display:flex;flex-direction:column;gap:6px}" +
    ".ez-row label{display:flex;justify-content:space-between;font-weight:600;font-size:.9rem}" +
    ".ez-row label span{color:var(--soft);font-weight:500;font-variant-numeric:tabular-nums}" +
    ".ez-row input{width:100%;accent-color:var(--accent)}" +
    ".ez-desc{margin:0;color:var(--soft);font-size:.88rem;line-height:1.45}" +
    ".ez-btns{display:flex;flex-wrap:wrap;gap:8px}" +
    ".ez-btns .navbtn.armed{background:var(--accent);border-color:var(--accent);color:var(--bg)}" +
    ".ez-save{font:600 1rem var(--f-body);padding:12px 18px;border:0;background:var(--ink);color:var(--bg);cursor:pointer}" +
    ".ez-save[aria-disabled=true]{opacity:.5;cursor:default}" +
    ".ez-note{margin:0;color:var(--soft);font-size:.88rem;min-height:1.3em;font-variant-numeric:tabular-nums}" +
    "@media (min-width:1100px){" +
      ".ez-wrap{width:min(calc(100vw - 48px),2200px);margin-left:calc((100% - min(calc(100vw - 48px),2200px)) / 2);grid-template-columns:minmax(0,3fr) minmax(300px,1fr);align-items:start}" +
      ".ez-desk{max-height:calc(100vh - 150px)}.ez-deskbox{position:sticky;top:20px}" +
      ".ez-side{position:sticky;top:20px;overflow-y:auto;padding-right:4px;scrollbar-width:thin}" +
    "}";

  function html() {
    return '<h1 class="ptitle">' + t("title") + '<span class="ez-ver">v' + VERSION + '</span></h1><p class="pintro">' + t("intro") + "</p>" +
      '<div class="ez-wrap"><div class="ez-deskbox"><div class="ez-desk" id="ez-desk"></div><div id="ez-bar"></div><input type="file" id="ez-file" accept="video/*,.mp4,.mov,.m4v,.webm" hidden></div>' +
      '<div class="ez-side" id="ez-side"></div></div>' +
      '<section class="phow"><h2>' + t("howH") + "</h2><p>" + t("how1") + "</p><p>" + t("how2") + "</p><p>" + t("how3") + "</p></section>";
  }
  function buildUI() {
    var desk = V.root.querySelector("#ez-desk"), side = V.root.querySelector("#ez-side"), bar = V.root.querySelector("#ez-bar");
    if (V.vid) { V.vid.pause(); V.vid.removeAttribute("src"); V.vid.load(); V.vid = null; }
    if (!E) {
      desk.innerHTML = '<div class="ez-drop"><b>' + t("drop") + "</b><span>" + t("or") + '</span><button type="button" class="ez-pick" data-ez="pick">' + t("pick") + '</button><span id="ez-dn">' + t("dropNote") + "</span></div>";
      bar.innerHTML = ""; side.innerHTML = '<div class="ez-box"><h3>' + t("preview") + '</h3><p class="ez-desc">' + t("hint") + "</p></div>";
      return;
    }
    desk.innerHTML = '<canvas id="ez-cv" aria-label="' + E.name + '"></canvas>';
    bar.innerHTML = '<div class="ez-bar"><button type="button" id="ez-play" data-ez="play"></button>' +
      '<div class="ez-tl"><input type="range" id="ez-pos" min="0" max="1000" step="1" value="0" aria-label="Position"><canvas id="ez-keys"></canvas></div>' +
      '<span class="ez-time" id="ez-time"></span></div><p class="ez-hint">' + t("hint") + "</p>";
    side.innerHTML = '<div class="px-btns ez-btns"><button type="button" class="navbtn" data-ez="pick">' + t("other") + "</button></div>" +
      '<div class="ez-box"><h3>' + t("preview") + '</h3><div><canvas class="ez-pv" id="ez-pv"></canvas></div>' +
      '<div class="ez-row"><label for="ez-scale">' + t("scale") + '<span id="ez-scale-v"></span></label><input type="range" id="ez-scale" min="30" max="100" step="1"></div>' +
      '<div class="ez-row"><label for="ez-smooth">' + t("smooth") + '<span id="ez-smooth-v"></span></label><input type="range" id="ez-smooth" min="0" max="100" step="1"></div>' +
      '<p class="ez-desc" id="ez-kn"></p><div class="ez-btns"><button type="button" class="navbtn" data-ez="clear">' + t("clear") + "</button></div></div>" +
      '<div class="ez-box"><h3>' + t("exportH") + '</h3><div class="ez-btns"><button type="button" class="navbtn" data-ez="mode" data-m="hd" id="ez-m-hd">' + t("modeHD") + '</button><button type="button" class="navbtn" data-ez="mode" data-m="low" id="ez-m-low">' + t("modeLow") + '</button></div><p class="ez-desc" id="ez-info"></p><p class="ez-desc" id="ez-lowinfo"></p><button type="button" class="ez-save" data-ez="save" id="ez-save">' + t("save") + '</button><p class="ez-note" id="ez-note"></p></div>';
    var vid = document.createElement("video");
    vid.src = E.url; vid.playsInline = true; vid.preload = "auto";
    vid.addEventListener("loadedmetadata", onMeta);
    vid.addEventListener("error", function () { note(t("bad")); });
    V.vid = vid; V.cv = desk.querySelector("#ez-cv"); V.pv = side.querySelector("#ez-pv");
    keysSig = "";
    updateSide();
  }
  function updateSide() {
    if (!V || !E) return;
    var sc = V.root.querySelector("#ez-scale"); if (!sc) return;
    var c = V.vid && E.vw ? current() : E.cur;
    sc.value = Math.round(c.s * 100); V.root.querySelector("#ez-scale-v").textContent = Math.round(c.s * 100) + " %";
    V.root.querySelector("#ez-smooth").value = E.smooth; V.root.querySelector("#ez-smooth-v").textContent = E.smooth + " %";
    ["hd", "low"].forEach(function (m) { var b = V.root.querySelector("#ez-m-" + m); b.setAttribute("aria-pressed", String(E.mode === m)); b.classList.toggle("armed", E.mode === m); });
    if (E.vw) { var sp = spec(); V.root.querySelector("#ez-info").textContent = fmt(t("exportInfo"), { w: sp.w, h: sp.h, br: mb1(sp.br) }); }
    var li = V.root.querySelector("#ez-lowinfo"); li.hidden = E.mode !== "low"; if (E.vw) li.textContent = fmt(t("lowInfo"), { src: mb1(srcBitrate()) });
    var sv = V.root.querySelector("#ez-save");
    sv.setAttribute("aria-disabled", String(!E.vw)); sv.textContent = busy ? t("cancel") : t("save");
    if (busy) sv.removeAttribute("aria-disabled");
  }
  function note(s) { if (!V) return; var n = V.root.querySelector("#ez-note") || V.root.querySelector("#ez-dn"); if (n) n.textContent = s; }

  // ---------- Eingabe ----------
  function srcPoint(e) {
    var r = V.cv.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  }
  function onDown(e) {
    if (!E || !E.vw || busy || e.target.id !== "ez-cv" || (e.button && e.button > 0)) return;
    e.preventDefault();
    var p = srcPoint(e), c = current(), r = rect(c);
    var inside = p.x * E.vw >= r.x && p.x * E.vw <= r.x + r.w && p.y * E.vh >= r.y && p.y * E.vh <= r.y + r.h;
    var cx = (r.x + r.w / 2) / E.vw, cy = (r.y + r.h / 2) / E.vh;
    V.off = inside ? { x: cx - p.x, y: cy - p.y } : { x: 0, y: 0 };
    E.cur = { x: p.x + V.off.x, y: p.y + V.off.y, s: c.s };
    V.drag = true; V.recPrev = null; lastRec = -1; V.cv.classList.add("grab");
    try { V.cv.setPointerCapture(e.pointerId); } catch (er) {}
    if (V.vid.paused) setKeyNow();
  }
  function clampCur() { var r = rect(E.cur); E.cur.x = (r.x + r.w / 2) / E.vw; E.cur.y = (r.y + r.h / 2) / E.vh; }
  function setKeyNow() { clampCur(); setKey(V.vid.currentTime, E.cur); keysSig = ""; }
  function onMove(e) {
    if (!V || !V.drag) return;
    var p = srcPoint(e);
    E.cur = { x: p.x + V.off.x, y: p.y + V.off.y, s: E.cur.s }; clampCur();
    if (V.vid.paused) setKeyNow();
  }
  function onUp() { if (!V || !V.drag) return; V.drag = false; V.cv.classList.remove("grab"); keysSig = ""; updateSide(); }
  function onInput(e) {
    var id = e.target.id;
    if (id === "ez-pos") { V.scrub = true; if (E.dur) V.vid.currentTime = +e.target.value / 1000 * E.dur; return; }
    if (id === "ez-smooth") { E.smooth = +e.target.value; V.root.querySelector("#ez-smooth-v").textContent = E.smooth + " %"; return; }
    if (id === "ez-scale") {
      var c = current(); E.cur = { x: c.x, y: c.y, s: +e.target.value / 100 }; clampCur();
      V.root.querySelector("#ez-scale-v").textContent = e.target.value + " %";
      if (!V.vid.paused) { if (V.scaleRec === null) V.recPrev = null; recordKey(V.vid.currentTime, E.cur); V.scaleRec = true; }
      else if (E.keys.length) setKeyNow();
      keysSig = "";
    }
  }
  function onChangeEv(e) {
    if (e.target.id === "ez-pos") { V.scrub = false; updateSide(); }
    if (e.target.id === "ez-scale") { V.scaleRec = null; updateSide(); }
    if (e.target.id === "ez-file" && e.target.files[0]) { loadFile(e.target.files[0]); e.target.value = ""; }
  }
  function onClick(e) {
    var b = e.target.closest("[data-ez]"); if (!b) return;
    var a = b.dataset.ez;
    if (a === "pick") { if (!busy) V.root.querySelector("#ez-file").click(); return; }
    if (!E) return;
    if (a === "play") { if (V.vid.paused) V.vid.play(); else V.vid.pause(); return; }
    if (a === "mode") { if (!busy) { E.mode = b.dataset.m; updateSide(); } return; }
    if (a === "save") { if (busy) cancelReq = true; else doExport(); return; }
    if (a === "clear") {
      if (!b.classList.contains("armed")) { b.classList.add("armed"); b.textContent = t("sure"); setTimeout(function () { if (b.isConnected) { b.classList.remove("armed"); b.textContent = t("clear"); } }, 3500); return; }
      b.classList.remove("armed"); b.textContent = t("clear"); E.cur = current(); E.keys = []; keysSig = ""; updateSide();
    }
  }
  function onKey(e) {
    if (!V || !E || !V.vid || /INPUT|TEXTAREA/.test((e.target && e.target.tagName) || "") && e.target.type !== "range") return;
    if (e.code === "Space") { e.preventDefault(); if (V.vid.paused) V.vid.play(); else V.vid.pause(); }
  }
  function onDragOver(e) { if (!e.dataTransfer || Array.prototype.indexOf.call(e.dataTransfer.types || [], "Files") < 0) return; e.preventDefault(); V.root.querySelector("#ez-desk").classList.add("over"); }
  function onDragLeave(e) { if (e.target.id === "ez-desk") V.root.querySelector("#ez-desk").classList.remove("over"); }
  function onDrop(e) { if (!e.dataTransfer || !e.dataTransfer.files.length) return; e.preventDefault(); V.root.querySelector("#ez-desk").classList.remove("over"); if (!busy) loadFile(e.dataTransfer.files[0]); }
  var rsT = 0;
  function onResize() { clearTimeout(rsT); rsT = setTimeout(function () { layout(); keysSig = ""; }, 120); }

  function injectCSS() { var o = document.getElementById("ez-css"); if (o) o.remove(); var s = document.createElement("style"); s.id = "ez-css"; s.textContent = CSS; document.head.appendChild(s); }
  function mount(el, l) {
    unmount();
    lang = l === "en" ? "en" : "de";
    injectCSS();
    el.innerHTML = html();
    V = { root: el, drag: false, scrub: false, recPrev: null, scaleRec: null, sc: 1 };
    el.addEventListener("pointerdown", onDown); window.addEventListener("pointermove", onMove); window.addEventListener("pointerup", onUp);
    el.addEventListener("input", onInput); el.addEventListener("change", onChangeEv); el.addEventListener("click", onClick);
    window.addEventListener("keydown", onKey); window.addEventListener("resize", onResize);
    var desk = el.querySelector("#ez-desk");
    desk.addEventListener("dragover", onDragOver); desk.addEventListener("dragleave", onDragLeave); desk.addEventListener("drop", onDrop);
    buildUI();
    raf = requestAnimationFrame(frame);
  }
  function unmount() {
    if (raf) cancelAnimationFrame(raf); raf = 0;
    if (V) {
      cancelReq = true;
      if (V.vid) V.vid.pause();
      window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp);
      window.removeEventListener("keydown", onKey); window.removeEventListener("resize", onResize);
      V.root.removeEventListener("pointerdown", onDown); V.root.removeEventListener("input", onInput);
      V.root.removeEventListener("change", onChangeEv); V.root.removeEventListener("click", onClick);
      V = null;
    }
  }

  window.EzCrop = { mount: mount, unmount: unmount, _debug: function () { return { E: E, V: V, path: path, exportMP4: doExport }; } };
})();
