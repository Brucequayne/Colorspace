/* Rap Streets – record.js
   Aufnahme des Battles als MP4, live während des Spiels (WebCodecs + mp4-muxer, wie EZ Crop):
   - Bild: Spielbild 3× vergrößert (1440 × 816) plus Anzeige (Namen, Hype, Status, Zeitleiste) auf eine Aufnahme-Leinwand gezeichnet.
   - Ton: Instrumental + Mikro in einem eigenen Zweig gemischt (nicht auf den Boxen). Das Mikro kommt durch die Latenz von
     Ausgabe und Eingabe später an – deshalb wird das Instrumental um genau diese Zeit verzögert, das Bild ebenso.
   - Alles bleibt im Browser. Nach dem Battle: ansehen oder als .mp4 speichern. */
(function () {
  var RS = window.RS, L2 = RS.L2, A = RS.audio;
  var S = 3, VW = RS.W * S, VH = RS.H * S, FPS = 30, E = 4.2 * S;   // E = "em" der Anzeige in Aufnahme-Pixeln
  var R = RS.rec = { on: false, last: null, note: "" };

  function loadMuxer() {
    if (window.Mp4Muxer) return Promise.resolve();
    return new Promise(function (ok, no) { var s = document.createElement("script"); s.src = "mp4-muxer.js"; s.onload = ok; s.onerror = function () { no(new Error("mp4-muxer.js")); }; document.head.appendChild(s); });
  }
  R.supported = function () { return typeof VideoEncoder !== "undefined" && typeof AudioEncoder !== "undefined" && typeof VideoFrame !== "undefined" && typeof AudioData !== "undefined"; };
  R.preload = function () { if (R.supported()) loadMuxer().catch(function () {}); };
  function pickVideo() {
    var list = ["avc1.640028", "avc1.4d0028", "avc1.42e028"], i = 0;
    return (function next() {
      if (i >= list.length) return Promise.resolve(null);
      var cfg = { codec: list[i++], width: VW, height: VH, bitrate: 5000000, bitrateMode: "variable", framerate: FPS, latencyMode: "realtime", avc: { format: "avc" } };
      return VideoEncoder.isConfigSupported(cfg).then(function (r) { return r.supported ? cfg : next(); }, next);
    })();
  }
  function pickAudio(sr) {
    var opts = [["mp4a.40.2", "aac", 192000], ["opus", "opus", 160000]], i = 0;
    return (function next() {
      if (i >= opts.length) return Promise.resolve(null);
      var o = opts[i++], cfg = { codec: o[0], sampleRate: sr, numberOfChannels: 2, bitrate: o[2] };
      return AudioEncoder.isConfigSupported(cfg).then(function (r) { return r.supported ? { cfg: cfg, mux: o[1] } : next(); }, next);
    })();
  }

  // ---------- Start ----------
  R.start = function (B) {
    R.abort(); R.note = "";
    if (!R.supported()) { R.note = L2("Aufnahme geht in diesem Browser nicht (Chrome oder Edge nehmen).", "Recording doesn't work in this browser (use Chrome or Edge)."); return; }
    var ctx = A.ctx, my = R.cur = { B: B, ok: false, n: 0, vlast: -1, samples: 0, err: null };
    // Latenz: Ausgabe (Boxen/Kopfhörer) + Eingabe (Mikro). Um so viel kommt die Stimme später als der Beat, zu dem gerappt wird.
    my.D = A.latency();
    Promise.all([loadMuxer(), pickVideo(), pickAudio(ctx.sampleRate), A.mixPrepare(ctx)]).then(function (r) {
      if (R.cur !== my) return;
      var vcfg = r[1], acfg = r[2];
      if (!vcfg) { R.note = L2("Video-Kodierung wird hier nicht unterstützt.", "Video encoding is not supported here."); R.cur = null; return; }
      my.target = new Mp4Muxer.ArrayBufferTarget();
      my.mux = new Mp4Muxer.Muxer({ target: my.target, video: { codec: "avc", width: VW, height: VH, frameRate: FPS },
        audio: acfg ? { codec: acfg.mux, sampleRate: ctx.sampleRate, numberOfChannels: 2 } : undefined, fastStart: "in-memory", firstTimestampBehavior: "cross-track-offset" });
      my.venc = new VideoEncoder({ output: function (c, m) { my.mux.addVideoChunk(c, m); }, error: function (e) { my.err = e; } });
      my.venc.configure(vcfg);
      my.cv = RS.canvas(VW, VH);
      if (acfg) {
        my.aenc = new AudioEncoder({ output: function (c, m) { my.mux.addAudioChunk(c, m); }, error: function (e) { my.err = e; } });
        my.aenc.configure(acfg.cfg);
        // Aufnahme-Mischung (mix.js, Einstellungen aus dem Dev Tool): Beat (verzögert) + Mikro, getrennt von den Boxen
        var dl = ctx.createDelay(1); dl.delayTime.value = my.D; A.gain.connect(dl);
        var mx = my.mx = A.mixBuild(ctx, A.micSrc || null, dl, A.mixGet());
        var sp = ctx.createScriptProcessor(2048, 2, 2), mute = ctx.createGain(); mute.gain.value = 0;
        mx.out.connect(sp); sp.connect(mute); mute.connect(ctx.destination);
        sp.onaudioprocess = function (e) {
          if (R.cur !== my || !my.ok || my.stopped) return;
          var ib = e.inputBuffer, n = ib.length, buf = new Float32Array(n * 2);
          buf.set(ib.getChannelData(0), 0); buf.set(ib.numberOfChannels > 1 ? ib.getChannelData(1) : ib.getChannelData(0), n);
          if (my.t0 == null) my.t0 = e.playbackTime - n / ctx.sampleRate;   // Zeitpunkt des ersten Ton-Samples
          var ad = new AudioData({ format: "f32-planar", sampleRate: ctx.sampleRate, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round(my.samples / ctx.sampleRate * 1e6), data: buf });
          try { my.aenc.encode(ad); } catch (er) { my.err = er; } ad.close(); my.samples += n;
        };
        my.nodes = [dl, sp, mute]; my.micSrc = A.micSrc;
      }
      my.ok = true;
    }).catch(function (e) { if (R.cur === my) { R.note = L2("Aufnahme konnte nicht starten: ", "Recording could not start: ") + (e && e.message || e); R.cur = null; } });
  };

  // ---------- Bild ----------
  function txt(x, s, X, Y, font, col, align, ls) {
    x.font = font; x.textAlign = align || "left"; x.textBaseline = "alphabetic";
    if (ls != null && "letterSpacing" in x) x.letterSpacing = ls + "px";
    x.fillStyle = "#000"; x.fillText(s, X, Y + E * 0.15); x.fillStyle = col; x.fillText(s, X, Y);
    if ("letterSpacing" in x) x.letterSpacing = "0px";
  }
  var COL = ["#D8372C", "#3A78E0"], TXT = ["#FF5A4A", "#5A9AFF"], F = "system-ui,Segoe UI,Helvetica,Arial,sans-serif", IMP = "Impact,'Arial Black',sans-serif";
  function hud(x, B, t) {
    var P = B.plan, D = P.end, st = (B.stTxt || "||").split("|"), cls = st[2] || "";
    // Spielerkarten
    [0, 1].forEach(function (i) {
      var w = 12 * E, h = 4.4 * E, X = i ? VW - 1.6 * E - w : 1.6 * E, Y = 1.4 * E, on = B.holder === i && B.state === "run";
      x.fillStyle = on ? "rgba(12,12,12,.88)" : "rgba(12,12,12,.72)"; x.fillRect(X, Y, w, h);
      x.fillStyle = COL[i]; x.fillRect(i ? X + w - 0.5 * E : X, Y, 0.5 * E, h);
      if (on) { x.strokeStyle = COL[i]; x.lineWidth = 0.2 * E; x.strokeRect(X - 0.1 * E, Y - 0.1 * E, w + 0.2 * E, h + 0.2 * E); }
      var px = i ? X + w - 0.9 * E - 0.5 * E : X + 0.5 * E + 0.9 * E, al = i ? "right" : "left";
      txt(x, B.names[i], px, Y + 1.85 * E, "700 " + (1.5 * E) + "px " + F, "#F2EEE6", al);
      var bw = w - 2.3 * E, bx = i ? px - bw : px; x.fillStyle = "#2A2A2C"; x.fillRect(bx, Y + 2.35 * E, bw, 0.7 * E);
      x.fillStyle = COL[i]; var fw = bw * B.hyp[i]; x.fillRect(i ? bx + bw - fw : bx, Y + 2.35 * E, fw, 0.7 * E);
      txt(x, Math.round(B.hyp[i] * 100) + " %", px, Y + 3.95 * E, "600 " + E + "px " + F, "#BEB8AC", al);
    });
    // Status Mitte
    var cx = VW / 2, pass = cls.indexOf("rs-pass") >= 0, c = cls.indexOf("rs-c0") >= 0 ? 0 : cls.indexOf("rs-c1") >= 0 ? 1 : -1;
    if (st[0]) txt(x, st[0].toUpperCase(), cx, 2.4 * E, "600 " + E + "px " + F, "#D8D2C6", "center", 0.14 * E);
    if (st[1]) {
      var big = pass ? 3.2 * E * (1 + 0.03 * Math.sin(B.t * 14)) : 2.4 * E;
      txt(x, st[1].toUpperCase(), cx, 2.4 * E + big * 1.02, "900 " + big + "px " + IMP, pass ? "#F2C230" : c >= 0 ? TXT[c] : "#F2EEE6", "center", 0.04 * big);
    }
    if (B.state === "run") { var ly = 2.4 * E + (pass ? 3.2 : 2.4) * E * 1.02 + 0.6 * E; x.fillStyle = "rgba(0,0,0,.55)"; x.fillRect(cx - 6 * E, ly, 12 * E, 0.45 * E); x.fillStyle = "#F2EEE6"; x.fillRect(cx - 6 * E, ly, 12 * E * B.act, 0.45 * E); }
    // Zeitleiste
    var by = VH - 1.4 * E - 1.9 * E, tw = 7.5 * E, bx0 = 1.6 * E + tw, bw0 = VW - 1.6 * E - bx0;
    txt(x, fmt(Math.min(t, D)) + " / " + fmt(D), 1.6 * E, by + 1.3 * E, "600 " + E + "px " + F, "#F2EEE6", "left");
    x.fillStyle = "rgba(10,10,10,.75)"; x.fillRect(bx0, by, bw0, 1.9 * E);
    P.segs.forEach(function (s) {
      var a = bx0 + s.a / D * bw0, w = (s.b - s.a) / D * bw0;
      if (s.k === "part") { x.fillStyle = s.pl ? "#2A5AB0" : "#B02A22"; x.fillRect(a, by, w, 1.9 * E); txt(x, "P" + (s.pl + 1), a + w / 2, by + 1.3 * E, "700 " + (0.9 * E) + "px " + F, "rgba(255,255,255,.9)", "center"); }
      else if (s.k === "intro") { x.fillStyle = "#3A3A3C"; x.fillRect(a, by, w, 1.9 * E); }
      else { x.save(); x.beginPath(); x.rect(a, by, w, 1.9 * E); x.clip(); x.fillStyle = "#2A2A2A"; x.fillRect(a, by, w, 1.9 * E); x.fillStyle = "#F2C230"; for (var k = -2 * E; k < w + 2 * E; k += E) { x.beginPath(); x.moveTo(a + k, by + 1.9 * E); x.lineTo(a + k + 0.5 * E, by + 1.9 * E); x.lineTo(a + k + 0.5 * E + 1.9 * E, by); x.lineTo(a + k + 1.9 * E, by); x.fill(); } x.restore(); }
    });
    var hx = bx0 + Math.min(t, D) / D * bw0; x.fillStyle = "#000"; x.fillRect(hx - 0.25 * E, by - 0.5 * E, 0.5 * E, 2.9 * E); x.fillStyle = "#FFF"; x.fillRect(hx - 0.15 * E, by - 0.4 * E, 0.3 * E, 2.7 * E);
    // Ergebnis
    if (B.state === "end" && B.score) {
      x.fillStyle = "rgba(0,0,0,.45)"; x.fillRect(0, VH * 0.36, VW, VH * 0.24);
      var w2 = B.winner, head = w2 < 0 ? L2("Unentschieden", "Draw") : B.names[w2] + " " + L2("gewinnt", "wins");
      txt(x, head.toUpperCase(), cx, VH * 0.47, "900 " + (3.6 * E) + "px " + IMP, w2 < 0 ? "#F2EEE6" : TXT[w2], "center", 0.04 * 3.6 * E);
      txt(x, B.names[0] + "  " + Math.round(B.score[0].hype * 100) + " %   ·   " + B.names[1] + "  " + Math.round(B.score[1].hype * 100) + " %   " + L2("Crowd-Hype", "crowd hype"), cx, VH * 0.555, "600 " + (1.2 * E) + "px " + F, "#D8D2C6", "center");
    }
  }
  function fmt(t) { t = Math.max(0, Math.floor(t)); return Math.floor(t / 60) + ":" + (t % 60 < 10 ? "0" : "") + (t % 60); }

  // Pro Spielbild aufrufen: zeichnet höchstens 30 Bilder pro Sekunde in die Aufnahme
  R.frame = function (lo, B, t) {
    var my = R.cur; if (!my || !my.ok || my.stopped || my.t0 == null || my.err) return;
    var now = A.ctx.currentTime, ts = now - my.t0 + my.D;   // Bild um die Latenz später einordnen, passend zum verzögerten Beat
    if (ts < 0 || ts - my.vlast < 1 / FPS - 0.002) return;
    if (my.venc.encodeQueueSize > 8) return;   // Kodierer kommt nicht hinterher: Bild auslassen statt das Spiel auszubremsen
    var x = my.cv.ctx, cr = RS.main.crop(); x.imageSmoothingEnabled = false; x.drawImage(lo, cr.x, cr.y, cr.w, cr.h, 0, 0, VW, VH); hud(x, B, t);
    var vf = new VideoFrame(my.cv, { timestamp: Math.round(ts * 1e6), duration: Math.round(1e6 / FPS) });
    try { my.venc.encode(vf, { keyFrame: my.n % (FPS * 2) === 0 }); } catch (e) { my.err = e; } vf.close();
    my.vlast = ts; my.n++;
  };

  // ---------- Ende ----------
  function teardown(my) {
    if (my.nodes && my.nodes[1]) my.nodes[1].onaudioprocess = null;
    try { A.gain.disconnect(my.nodes && my.nodes[0]); } catch (e) {}
    A.mixFree(my.mx, my.micSrc, my.nodes && my.nodes[0]);
    (my.nodes || []).forEach(function (n) { try { n.disconnect(); } catch (e) {} });
  }
  R.stop = function (B, done) {
    var my = R.cur; R.cur = null;
    if (!my || !my.ok) { done(null); return; }
    my.stopped = true; teardown(my);
    Promise.resolve().then(function () { return my.venc.flush(); }).then(function () { return my.aenc ? my.aenc.flush() : null; }).then(function () {
      if (my.err) throw my.err;
      my.venc.close(); if (my.aenc) my.aenc.close(); my.mux.finalize();
      if (R.last) URL.revokeObjectURL(R.last.url);
      var blob = new Blob([my.target.buffer], { type: "video/mp4" }), d = new Date(), p = function (n) { return (n < 10 ? "0" : "") + n; };
      var nm = ("RapStreets_" + B.names[0] + "_vs_" + B.names[1] + "_" + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + "-" + p(d.getHours()) + p(d.getMinutes())).replace(/[^\w\-]+/g, "_") + ".mp4";
      R.last = { url: URL.createObjectURL(blob), name: nm, size: blob.size, D: my.D };
      done(R.last);
    }).catch(function (e) { R.note = L2("Aufnahme fehlgeschlagen: ", "Recording failed: ") + (e && e.message || e); try { my.venc.close(); } catch (er) {} try { my.aenc && my.aenc.close(); } catch (er) {} done(null); });
  };
  R.abort = function () {
    var my = R.cur; R.cur = null; if (!my) return; my.stopped = true;
    if (my.ok) { teardown(my); try { my.venc.close(); } catch (e) {} try { my.aenc && my.aenc.close(); } catch (e) {} }
  };
  R.download = function () {
    if (!R.last) return; var a = document.createElement("a"); a.href = R.last.url; a.download = R.last.name; document.body.appendChild(a); a.click(); a.remove();
  };
})();
