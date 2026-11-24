/* Monsters Arc – audio.js
   Sounds und Ambiente (Dateien in monstersarc/audio/, aus Shizuku übernommen: Schritte, Wind).
   - Ereignisse (SOUNDS) haben eine oder mehrere Varianten; abgespielt wird zufällig,
     aber nie zweimal hintereinander dieselbe. Leichte Tonhöhen-Streuung für Lebendigkeit.
   - Stereo: Sounds mit Position (x in Arena-Pixeln) werden links/rechts verteilt.
   - Loops (Wind, Wasserfall) laufen nahtlos; der Wasserfall wird lauter, je näher man ihm kommt.
   - Musik: pro Lauf ein Soundtrack aus MUSIC, nahtlos im Dauerloop. In der Welle voll,
     zwischen den Wellen leiser, mit weichen Übergängen.
   - Taste M schaltet stumm (wird gemerkt).
   Browser erlauben Ton erst nach einer Nutzeraktion: MA.audio.unlock() beim ersten Klick. */
(function () {
  var MA = window.MA;
  function seq(base, n) { var a = []; for (var i = 1; i <= n; i++) a.push(base + "_" + i + ".mp3"); return a; }

  // Ereignis → Dateien, Lautstärke, Tonhöhe [min, max]
  var SOUNDS = {
    step:        { f: seq("Characterstep", 7), vol: 0.32, rate: [0.94, 1.06] },
    step_grass:  { f: seq("step_mosundgras", 7), vol: 0.38, rate: [0.94, 1.06] },
    step_water:  { f: seq("step_water", 5), vol: 0.45, rate: [0.94, 1.06] }
  };
  MA.SOUND_HIT = function (name) { return (SOUNDS[name] && SOUNDS[name].hit) || 0; };
  var LOOPS = { wind: "Wind.mp3" };
  // Soundtracks: jeder Lauf bekommt zufällig einen davon
  var MUSIC = [];   // eigene Musik kommt später (je Map / Event)

  var ctx = null, master = null, sfxBus = null, ambBus = null, musBus = null, mus = null, musWant = null, musLevel = 0, buffers = {}, last = {}, loops = {}, loading = false, muted = false;
  try { muted = localStorage.getItem("monstersarc.mute") === "1"; } catch (e) {}
  var volume = { sfx: 0.85, amb: 0.7, music: 0.5 };

  function load(file, cb) {
    if (buffers[file]) { if (buffers[file] !== "loading" && cb) cb(buffers[file]); return; }
    buffers[file] = "loading";
    fetch("monstersarc/audio/" + file + (MA.STAMP ? "?v=" + MA.STAMP : "")).then(function (r) { if (!r.ok) throw 0; return r.arrayBuffer(); })
      .then(function (b) { return new Promise(function (ok, no) { ctx.decodeAudioData(b, ok, no); }); })
      .then(function (buf) { buffers[file] = buf; if (cb) cb(buf); })
      .catch(function () { delete buffers[file]; });
  }
  // Stille vor dem ersten hörbaren Signal (−44 dB unter der Spitze), damit Effekte genau im Moment starten
  var leadCache = typeof WeakMap !== "undefined" ? new WeakMap() : null;
  function lead(buf) {
    if (leadCache && leadCache.has(buf)) return leadCache.get(buf);
    var d = buf.getChannelData(0), n = d.length, pk = 0, i;
    for (i = 0; i < n; i++) { var v = Math.abs(d[i]); if (v > pk) pk = v; }
    var th = pk * 0.006; for (i = 0; i < n && Math.abs(d[i]) < th; i++) {}
    var t = Math.max(0, i / buf.sampleRate - 0.003);
    if (leadCache) leadCache.set(buf, t);
    return t;
  }
  // Stille am Anfang/Ende einer MP3 finden (Encoder-Polster), damit Loops nahtlos sind
  function trim(buf) {
    var d = buf.getChannelData(0), n = d.length, a = 0, b = n - 1, th = 0.0004;
    while (a < n && Math.abs(d[a]) < th) a++;
    while (b > a && Math.abs(d[b]) < th) b--;
    return { start: a / buf.sampleRate, end: (b + 1) / buf.sampleRate };
  }

  var A = MA.audio = {
    volume: volume,
    // beim ersten Klick: Audio starten und alles laden
    unlock: function () {
      if (!ctx) {
        try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
        master = ctx.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ctx.destination);
        sfxBus = ctx.createGain(); sfxBus.gain.value = volume.sfx; sfxBus.connect(master);
        ambBus = ctx.createGain(); ambBus.gain.value = volume.amb; ambBus.connect(master);
        musBus = ctx.createGain(); musBus.gain.value = volume.music; musBus.connect(master);
      }
      if (ctx.state === "suspended") ctx.resume();
      if (!loading) {
        loading = true;
        Object.keys(SOUNDS).forEach(function (k) { SOUNDS[k].f.forEach(function (f) { load(f); }); });
        Object.keys(LOOPS).forEach(function (k) { load(LOOPS[k]); });
        MUSIC.forEach(function (f) { load(f); });
      }
      if (musWant) A.musicLevel(musLevel);
    },
    ready: function () { return !!ctx; },
    // Für erzeugte Klänge (Monsterschreie, seit v0.25): Audio-Kontext und Effekt-Ausgang; null, wenn stumm
    synth: function () { A.unlock(); if (!ctx || muted) return null; return { ctx: ctx, out: sfxBus }; },
    // Sound abspielen. opt: x (Arena-Pixel für Stereo), vol, rate. Rückgabe: Griff mit stop()
    play: function (name, opt) {
      var S = SOUNDS[name]; if (!S || !ctx || muted) return null;
      opt = opt || {};
      var n = S.f.length, i = (Math.random() * n) | 0;
      if (n > 1 && i === last[name]) i = (i + 1 + ((Math.random() * (n - 1)) | 0)) % n;
      last[name] = i;
      var buf = buffers[S.f[i]]; if (!buf || buf === "loading") return null;
      var src = ctx.createBufferSource(), g = ctx.createGain(), out = g;
      src.buffer = buf;
      var r = S.rate ? S.rate[0] + Math.random() * (S.rate[1] - S.rate[0]) : 1;
      src.playbackRate.value = r * (opt.rate || 1);
      var gv = (S.vol || 1) * (opt.vol == null ? 1 : opt.vol), off = Math.max(lead(buf), S.offset || 0) + (opt.offset || 0);
      if (S.offset) { g.gain.setValueAtTime(0, ctx.currentTime); g.gain.linearRampToValueAtTime(gv, ctx.currentTime + 0.012); }   // weich einblenden, kein Knacken
      else g.gain.value = gv;
      src.connect(g);
      if (opt.x != null && ctx.createStereoPanner) {
        var p = ctx.createStereoPanner(); p.pan.value = Math.max(-0.8, Math.min(0.8, (opt.x / MA.W - 0.5) * 1.4));
        g.connect(p); out = p;
      }
      out.connect(sfxBus);
      // opt.loop: als Schleife spielen (Strahl o. Ä.), mit weichem Einblenden; über stop() beenden
      var pn = out !== g ? out : null;
      if (opt.loop) {
        src.loop = true; src.loopStart = Math.min(0.4, buf.duration * 0.2); src.loopEnd = Math.max(src.loopStart + 0.2, buf.duration - 0.25);
        g.gain.setValueAtTime(0, ctx.currentTime); g.gain.linearRampToValueAtTime(gv, ctx.currentTime + 0.08);
      }
      src.start(0, Math.min(off, buf.duration - 0.05));
      return { pan: function (x) { if (pn) pn.pan.value = Math.max(-0.8, Math.min(0.8, (x / MA.W - 0.5) * 1.4)); },
               stop: function (fade) { try { var t = ctx.currentTime; g.gain.setTargetAtTime(0, t, (fade || 0.05) / 3); src.stop(t + (fade || 0.05) + 0.05); } catch (e) {} } };
    },
    // Ambiente-Lautstärken setzen: { wind: 0..1, waterfall: 0..1, waterPan: -1..1 }. null = alles ausblenden
    ambience: function (lv) {
      if (!ctx) return;
      Object.keys(LOOPS).forEach(function (k) {
        var want = lv ? (lv[k] || 0) : 0, L = loops[k];
        if (!L && want > 0.001) {
          var buf = buffers[LOOPS[k]]; if (!buf || buf === "loading") return;
          var src = ctx.createBufferSource(), g = ctx.createGain(), tr = trim(buf);
          src.buffer = buf; src.loop = true; src.loopStart = tr.start; src.loopEnd = tr.end;
          g.gain.value = 0; src.connect(g);
          var pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
          if (pan) { g.connect(pan); pan.connect(ambBus); } else g.connect(ambBus);
          src.start(0, tr.start + Math.random() * (tr.end - tr.start) * 0.8);
          L = loops[k] = { src: src, g: g, pan: pan };
        }
        if (!L) return;
        L.g.gain.setTargetAtTime(want, ctx.currentTime, 0.35);
        if (L.pan && k === "waterfall" && lv) L.pan.pan.setTargetAtTime(lv.waterPan || 0, ctx.currentTime, 0.3);
        if (want <= 0.001 && !lv) { var LL = L; setTimeout(function () { try { LL.src.stop(); } catch (e) {} }, 1600); delete loops[k]; }
      });
    },
    toggleMute: function () {
      muted = !muted;
      try { localStorage.setItem("monstersarc.mute", muted ? "1" : "0"); } catch (e) {}
      if (master) master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.05);
      return muted;
    },
    isMuted: function () { return muted; },
    loopsActive: function () { return Object.keys(loops).map(function (k) { return k + ":" + loops[k].g.gain.value.toFixed(2); }); },
    // Soundtrack für einen neuen Lauf wählen (bleibt den ganzen Lauf gleich)
    musicStart: function () {
      if (mus && mus.src) { var old = mus; old.g.gain.setTargetAtTime(0, ctx.currentTime, 0.4); setTimeout(function () { try { old.src.stop(); } catch (e) {} }, 2500); }
      mus = null; musWant = MUSIC[(Math.random() * MUSIC.length) | 0]; musLevel = 0;
    },
    // Lautstärke der Musik 0..1, weicher Übergang (tau Sekunden)
    musicLevel: function (lv, tau) {
      musLevel = lv;
      if (!ctx || !musWant) return;
      if (!mus) {
        var buf = buffers[musWant]; if (!buf || buf === "loading") return;   // lädt noch, nächster Aufruf versucht es wieder
        var src = ctx.createBufferSource(), g = ctx.createGain(), tr = trim(buf);
        src.buffer = buf; src.loop = true; src.loopStart = tr.start; src.loopEnd = tr.end;
        g.gain.value = 0; src.connect(g); g.connect(musBus); src.start(0, tr.start);
        mus = { src: src, g: g, lv: -1 };
      }
      if (Math.abs(mus.lv - lv) > 0.001) { mus.g.gain.setTargetAtTime(lv, ctx.currentTime, tau || 0.9); mus.lv = lv; }
    },
    musicStop: function () {
      musWant = null;
      if (mus && ctx) { var old = mus; old.g.gain.setTargetAtTime(0, ctx.currentTime, 0.5); setTimeout(function () { try { old.src.stop(); } catch (e) {} }, 3000); }
      mus = null;
    },
    stopAll: function () {
      Object.keys(loops).forEach(function (k) { try { loops[k].src.stop(); } catch (e) {} });
      loops = {};
      if (mus) { try { mus.src.stop(); } catch (e) {} } mus = null; musWant = null;
      if (ctx && ctx.state === "running") ctx.suspend();
    }
  };
})();
