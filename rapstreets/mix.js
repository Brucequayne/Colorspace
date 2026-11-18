/* Rap Streets – mix.js
   Mischung für Aufnahme und Mikro-Test (Einstellungen im Dev Tool, Abschnitt „Audio“):
     Mikro → Compressor → Mikro-Pegel → Limiter ─┐
     Beat  → Beat-Pegel → Limiter ───────────────┼→ Summen-Limiter (−1 dBFS) → harte Grenze bei 0 dBFS → Ausgang
   Compressor und Limiter sind eigene AudioWorklets (der eingebaute DynamicsCompressor hebt den Pegel heimlich an
   und ist deshalb als Limiter unbrauchbar). Limiter = echter Brickwall mit 3 ms Vorausschau, kein Clipping davor.
   Einstellungen liegen im Browser unter rapstreets-audio-v1; ohne eigene Werte gelten DEF. */
(function () {
  var RS = window.RS, A = RS.audio, KEY = "rapstreets-audio-v1";

  // Standardwerte (dB / ms). Noah kann sie im Dev Tool ändern und mit „Werte kopieren“ weitergeben.
  var DEF = A.MIX_DEF = { comp: 1, thr: -24, ratio: 4, att: 3, rel: 120, micGain: 12, micCeil: -3, beatGain: -6, beatCeil: -6, master: -1 };
  A.mixGet = function () {
    var s = {}, o = {}; try { o = JSON.parse(RS.store.get(KEY) || "{}") || {}; } catch (e) {}
    Object.keys(DEF).forEach(function (k) { s[k] = typeof o[k] === "number" && isFinite(o[k]) ? o[k] : DEF[k]; });
    return s;
  };
  A.mixSet = function (s) { RS.store.set(KEY, JSON.stringify(s)); };
  A.mixReset = function () { RS.store.del(KEY); };

  // ---------- AudioWorklet: Compressor und Limiter ----------
  var CODE = [
    "class RSDyn extends AudioWorkletProcessor {",
    "  constructor(o) {",
    "    super(); var p = (o && o.processorOptions) || {}; this.mode = p.mode || 'limit'; this.p = {}; this.set(p);",
    "    this.port.onmessage = (e) => this.set(e.data);",
    "    this.env = 0;",
    "    var L = Math.max(2, Math.round(sampleRate * 0.003) + 1); this.L = L; this.D = L - 1;",
    "    this.dl = [new Float32Array(this.D), new Float32Array(this.D)]; this.w = 0;",
    "    this.qv = new Float32Array(L + 2); this.qi = new Float64Array(L + 2); this.qh = 0; this.qt = 0; this.n = 0;",
    "    this.box = new Float32Array(L).fill(1); this.bi = 0; this.sum = L; this.r = 1;",
    "  }",
    "  set(d) {",
    "    for (var k in d) this.p[k] = d[k]; var p = this.p, sr = sampleRate;",
    "    this.aC = 1 - Math.exp(-1 / (Math.max(0.1, p.att || 3) * 0.001 * sr));",
    "    this.rC = 1 - Math.exp(-1 / (Math.max(1, p.rel || 100) * 0.001 * sr));",
    "    this.ceil = Math.pow(10, (p.ceil == null ? -1 : p.ceil) / 20);",
    "  }",
    "  process(ins, outs) {",
    "    var inp = ins[0], out = outs[0]; if (!out || !out.length) return true;",
    "    var nc = out.length, len = out[0].length;",
    "    if (!inp || !inp.length) { for (var c = 0; c < nc; c++) out[c].fill(0); if (this.mode === 'comp') return true; }",
    "    var x0 = inp && inp[0], x1 = inp && inp.length > 1 ? inp[1] : x0;",
    "    if (this.mode === 'comp') {",
    "      var p = this.p, thr = p.thr, ra = Math.max(1, p.ratio), W = 6, sl = 1 / ra - 1;",
    "      for (var i = 0; i < len; i++) {",
    "        var a = Math.abs(x0[i]), b = Math.abs(x1[i]), pk = a > b ? a : b;",
    "        this.env += (pk - this.env) * (pk > this.env ? this.aC : this.rC);",
    "        var lv = 20 * Math.log10(this.env + 1e-9), ov = lv - thr, gr;",
    "        if (2 * ov < -W) gr = 0; else if (2 * ov > W) gr = sl * ov; else gr = sl * (ov + W / 2) * (ov + W / 2) / (2 * W);",
    "        var g = Math.pow(10, gr / 20);",
    "        out[0][i] = x0[i] * g; if (nc > 1) out[1][i] = x1[i] * g;",
    "      }",
    "      return true;",
    "    }",
    "    // Limiter: Mindestwert der nötigen Absenkung über die Vorausschau halten, Release, dann Mittelwert über die Vorausschau",
    "    var L = this.L, D = this.D, ceil = this.ceil, cap = L + 2;",
    "    for (var i = 0; i < len; i++) {",
    "      var s0 = x0 ? x0[i] : 0, s1 = x1 ? x1[i] : 0, a = Math.abs(s0), b = Math.abs(s1), pk = a > b ? a : b;",
    "      var gq = pk > ceil ? ceil / pk : 1, n = this.n++;",
    "      while (this.qt !== this.qh && this.qv[(this.qt - 1 + cap) % cap] >= gq) this.qt = (this.qt - 1 + cap) % cap;",
    "      this.qv[this.qt] = gq; this.qi[this.qt] = n; this.qt = (this.qt + 1) % cap;",
    "      while (this.qi[this.qh] <= n - L) this.qh = (this.qh + 1) % cap;",
    "      var h = this.qv[this.qh];",
    "      this.r = h < this.r ? h : this.r + (h - this.r) * this.rC;",
    "      this.sum += this.r - this.box[this.bi]; this.box[this.bi] = this.r; this.bi = (this.bi + 1) % L;",
    "      if ((n & 65535) === 0) { var t = 0; for (var k = 0; k < L; k++) t += this.box[k]; this.sum = t; }",
    "      var g = this.sum / L; if (g > 1) g = 1;",
    "      var d0 = this.dl[0][this.w], d1 = this.dl[1][this.w]; this.dl[0][this.w] = s0; this.dl[1][this.w] = s1; this.w = (this.w + 1) % D;",
    "      out[0][i] = d0 * g; if (nc > 1) out[1][i] = d1 * g;",
    "    }",
    "    return true;",
    "  }",
    "}",
    "registerProcessor('rs-dyn', RSDyn);"
  ].join("\n");
  var URL_ = null;
  // Einmal pro AudioContext laden (auch für OfflineAudioContext)
  A.mixPrepare = function (ctx) {
    if (!ctx || !ctx.audioWorklet) return Promise.resolve(false);
    if (ctx.__rsDyn) return ctx.__rsDyn;
    if (!URL_) URL_ = URL.createObjectURL(new Blob([CODE], { type: "application/javascript" }));
    return (ctx.__rsDyn = ctx.audioWorklet.addModule(URL_).then(function () { return true; }, function () { return false; }));
  };
  function dyn(ctx, mode, opt) {
    try { return new AudioWorkletNode(ctx, "rs-dyn", { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2], channelCount: 2, channelCountMode: "explicit", channelInterpretation: "speakers", processorOptions: Object.assign({ mode: mode }, opt) }); }
    catch (e) { return null; }
  }
  function gain(ctx, db) { var g = ctx.createGain(); g.gain.value = Math.pow(10, db / 20); return g; }
  function chain(list) { var l = list.filter(Boolean); for (var i = 0; i + 1 < l.length; i++) l[i].connect(l[i + 1]); return l; }

  // Baut die Mischung. mic / beat: Quellknoten (mic darf fehlen). raw = ohne Compressor/Limiter (zum Vergleichen).
  // Gibt { out, nodes, micIn, beatIn } zurück; out muss der Aufrufer noch verbinden.
  A.mixBuild = function (ctx, mic, beat, s, raw) {
    s = s || A.mixGet(); var nodes = [];
    var bus = ctx.createGain(); bus.channelCount = 2; bus.channelCountMode = "explicit"; nodes.push(bus);
    var micIn = null, beatIn = null;
    if (mic) {
      var mc = !raw && s.comp ? dyn(ctx, "comp", { thr: s.thr, ratio: s.ratio, att: s.att, rel: s.rel }) : null;
      var mg = gain(ctx, raw ? 0 : s.micGain), ml = raw ? null : dyn(ctx, "limit", { ceil: s.micCeil, rel: 80 });
      var m = chain([mc, mg, ml, bus]); micIn = m[0]; mic.connect(micIn); nodes = nodes.concat(m.slice(0, -1));
    }
    if (beat) {
      var bg = gain(ctx, raw ? 0 : s.beatGain), bl = raw ? null : dyn(ctx, "limit", { ceil: s.beatCeil, rel: 80 });
      var b = chain([bg, bl, bus]); beatIn = b[0]; beat.connect(beatIn); nodes = nodes.concat(b.slice(0, -1));
    }
    // Summe: Limiter, danach harte Grenze bei ±1 (lineare Kurve – verändert nichts darunter)
    var sl = raw ? null : dyn(ctx, "limit", { ceil: s.master, rel: 60 });
    var hard = ctx.createWaveShaper(); hard.curve = new Float32Array([-1, 1]);
    chain([bus, sl, hard]); if (sl) nodes.push(sl); nodes.push(hard);
    return { out: hard, nodes: nodes, micIn: micIn, beatIn: beatIn };
  };
  A.mixFree = function (mx, mic, beat) {
    if (!mx) return;
    if (mic && mx.micIn) try { mic.disconnect(mx.micIn); } catch (e) {}
    if (beat && mx.beatIn) try { beat.disconnect(mx.beatIn); } catch (e) {}
    mx.nodes.forEach(function (n) { try { n.disconnect(); } catch (e) {} });
  };

  // Verzögerung Ausgabe + Eingabe: um so viel kommt die Stimme später als der Beat, zu dem gerappt wird
  A.latency = function () {
    var ctx = A.ctx, inLat = 0; if (!ctx) return 0;
    try { inLat = A.mic ? (A.mic.getAudioTracks()[0].getSettings().latency || 0.01) : 0; } catch (e) {}
    return Math.max(0, Math.min(0.6, (ctx.outputLatency || 0) + (ctx.baseLatency || 0) + inLat));
  };

  // ---------- Mikro-Test ----------
  // Spielt einen Vorlauf von 1 Takt, nimmt dann LEN Sekunden roh auf (Mikro und Beat getrennt, Beat um die Latenz verzögert,
  // genau wie bei der echten Aufnahme). Danach kann man das Ergebnis beliebig oft mit den aktuellen Einstellungen anhören.
  var T = A.test = { busy: false, take: null, play: null };
  T.LEN = 2;
  function stopPlay() { if (T.play) { try { T.play.stop(); } catch (e) {} try { T.play.disconnect(); } catch (e) {} T.play = null; } }
  T.stop = function () { stopPlay(); if (T.cancel) T.cancel(); };
  // beat: Eintrag aus RS.BEATS, at: Sekunde im Instrumental, wo die Aufnahme beginnt. info(text) meldet den Stand.
  T.record = function (beat, at, info) {
    if (T.busy) return Promise.reject(new Error("busy"));
    T.busy = true; stopPlay();
    var ctx = A.context(); if (!ctx) { T.busy = false; return Promise.reject(new Error("WebAudio")); }
    return A.micOpen().then(function (ok) {
      if (!ok || !A.micSrc) throw new Error(RS.L2("kein Mikro-Zugriff", "no mic access"));
      return A.load(beat);
    }).then(function (buf) {
      return new Promise(function (done, fail) {
        var sr = ctx.sampleRate, bar = 240 / beat.bpm, pre = bar, D = A.latency();
        var from = Math.max(0, Math.min(buf.duration - T.LEN - 0.1, at) - pre);
        pre = Math.min(pre, at - from); if (pre < 0) pre = 0;
        var src = ctx.createBufferSource(); src.buffer = buf;
        var mark = ctx.createConstantSource(); mark.offset.value = 1;
        var dl = ctx.createDelay(1); dl.delayTime.value = D;
        var dm = ctx.createDelay(1); dm.delayTime.value = D;
        var sp = ctx.createChannelSplitter(2), mg = ctx.createChannelMerger(4);
        var proc = ctx.createScriptProcessor(4096, 4, 1), mute = ctx.createGain(); mute.gain.value = 0;
        src.connect(A.gain);                                   // auf die Boxen / Kopfhörer
        src.connect(dl); dl.connect(sp); sp.connect(mg, 0, 1); sp.connect(mg, 1, 2);
        mark.connect(dm); dm.connect(mg, 0, 3);
        A.micSrc.connect(mg, 0, 0);
        mg.connect(proc); proc.connect(mute); mute.connect(ctx.destination);
        var need = Math.ceil((pre + T.LEN + D + 0.6) * sr), got = 0, ch = [[], [], [], []], over = false;
        function cleanup() {
          over = true; proc.onaudioprocess = null; T.cancel = null; clearInterval(tick);
          try { src.stop(); } catch (e) {} try { mark.stop(); } catch (e) {}
          [src, mark, dl, dm, sp, mg, proc, mute].forEach(function (n) { try { n.disconnect(); } catch (e) {} });
          try { A.micSrc.disconnect(mg); } catch (e) {}
        }
        T.cancel = function () { if (over) return; cleanup(); T.busy = false; fail(new Error(RS.L2("abgebrochen", "cancelled"))); };
        proc.onaudioprocess = function (e) {
          if (over) return; var ib = e.inputBuffer;
          for (var c = 0; c < 4; c++) ch[c].push(new Float32Array(ib.getChannelData(Math.min(c, ib.numberOfChannels - 1))));
          got += ib.length;
          if (got >= need) {
            cleanup();
            var all = ch.map(function (bl) { var o = new Float32Array(got), p = 0; bl.forEach(function (b) { o.set(b, p); p += b.length; }); return o; });
            var i0 = -1; for (var i = 0; i < got; i++) if (all[3][i] > 0.5) { i0 = i; break; }
            if (i0 < 0) { T.busy = false; fail(new Error(RS.L2("Zeitmarke fehlt", "time mark missing"))); return; }
            var s0 = i0 + Math.round(pre * sr), n = Math.round(T.LEN * sr);
            if (s0 + n > got) n = got - s0;
            T.take = { sr: sr, mic: all[0].slice(s0, s0 + n), l: all[1].slice(s0, s0 + n), r: all[2].slice(s0, s0 + n), D: D, beat: beat.file, at: at };
            T.busy = false; done(T.take);
          }
        };
        var t0 = ctx.currentTime + 0.12, tEnd = t0 + pre;
        src.start(t0, from); mark.start(t0);
        var tick = setInterval(function () {
          if (over) return; var left = tEnd - ctx.currentTime;
          info(left > 0 ? RS.L2("Vorlauf … ", "Pre-roll … ") + Math.ceil(left / (bar / 4)) : RS.L2("Aufnahme läuft!", "Recording!"));
        }, 50);
      });
    }).catch(function (e) { T.busy = false; throw e; });
  };
  function peakDb(arrs) { var p = 0; arrs.forEach(function (a) { for (var i = 0; i < a.length; i++) { var v = Math.abs(a[i]); if (v > p) p = v; } }); return 20 * Math.log10(p + 1e-9); }
  // Aufnahme mit den aktuellen Einstellungen (oder roh) rechnen und abspielen. Gibt Spitzenwerte zurück.
  T.listen = function (raw) {
    var tk = T.take; if (!tk) return Promise.reject(new Error("no take"));
    stopPlay();
    var OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext, n = tk.mic.length;
    var oc = new OAC(2, n, tk.sr);
    return A.mixPrepare(oc).then(function () {
      var mb = oc.createBuffer(1, n, tk.sr); mb.copyToChannel(tk.mic, 0);
      var bb = oc.createBuffer(2, n, tk.sr); bb.copyToChannel(tk.l, 0); bb.copyToChannel(tk.r, 1);
      var ms = oc.createBufferSource(), bs = oc.createBufferSource(); ms.buffer = mb; bs.buffer = bb;
      var mx = A.mixBuild(oc, ms, bs, A.mixGet(), raw); mx.out.connect(oc.destination);
      ms.start(0); bs.start(0);
      return oc.startRendering();
    }).then(function (res) {
      var ctx = A.context(), s = ctx.createBufferSource(); s.buffer = res; s.connect(ctx.destination); s.start(ctx.currentTime + 0.05); T.play = s;
      s.onended = function () { if (T.play === s) T.play = null; };
      return { mic: peakDb([tk.mic]), out: peakDb([res.getChannelData(0), res.getChannelData(1)]), buf: res };
    });
  };
})();
