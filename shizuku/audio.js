/* Shizuku – audio.js
   Sounds und Ambiente (Dateien in shizuku/audio/).
   - Ereignisse (SOUNDS) haben eine oder mehrere Varianten; abgespielt wird zufällig,
     aber nie zweimal hintereinander dieselbe. Leichte Tonhöhen-Streuung für Lebendigkeit.
   - Stereo: Sounds mit Position (x in Arena-Pixeln) werden links/rechts verteilt.
   - Loops (Wind, Wasserfall) laufen nahtlos; der Wasserfall wird lauter, je näher man ihm kommt.
   - Musik: pro Lauf ein Soundtrack aus MUSIC, nahtlos im Dauerloop. In der Welle voll,
     zwischen den Wellen leiser, mit weichen Übergängen.
   - Taste M schaltet stumm (wird gemerkt).
   Browser erlauben Ton erst nach einer Nutzeraktion: SZ.audio.unlock() beim ersten Klick. */
(function () {
  var SZ = window.SZ;
  function seq(base, n) { var a = []; for (var i = 1; i <= n; i++) a.push(base + "_" + i + ".mp3"); return a; }

  // Ereignis → Dateien, Lautstärke, Tonhöhe [min, max]
  var SOUNDS = {
    unsheathe:   { f: ["Schwertherausziehen.mp3"], vol: 0.8 },
    swing:       { f: seq("Schwertschwingen", 4), vol: 0.6, rate: [0.95, 1.06] },
    swing_e:     { f: ["Schwerthieb_E.mp3"], vol: 0.75, rate: [0.97, 1.03] },
    thrust:      { f: ["Schwertstich_Q.mp3"], vol: 0.75, rate: [0.97, 1.03] },
    hit_flesh:   { f: seq("schwerttreffer", 4), vol: 0.75, rate: [0.94, 1.06] },
    hit_wood:    { f: seq("schwerthiebaufHolz", 4), vol: 0.6, rate: [0.94, 1.06] },
    hit_straw:   { f: seq("schwerthiebaufHolz", 4), vol: 0.55, rate: [1.02, 1.12] },
    block:       { f: seq("Schwertblock", 5), vol: 0.7, rate: [0.96, 1.05] },
    parry_hit:   { f: seq("Schwertblock", 5), vol: 0.85, rate: [1.08, 1.16] },
    guard_break: { f: seq("Schwertblock", 5), vol: 0.95, rate: [0.78, 0.84] },
    hurt:        { f: seq("hurt", 6), vol: 0.75 },
    dash:        { f: seq("dash", 2), vol: 0.6, rate: [0.95, 1.06] },
    dodge:       { f: seq("dash", 2), vol: 0.5, rate: [1.05, 1.12] },
    bow_draw:    { f: ["Bow_Spannen.mp3"], vol: 0.7 },
    bow:         { f: ["Bow_ArrowShot.mp3"], vol: 0.7, rate: [0.98, 1.05] },
    bow_strong:  { f: ["Bow_ArrowShot.mp3"], vol: 1.0, rate: [0.88, 0.92] },
    arrow_hit:   { f: ["Bow_ArrowShotimpacthit.mp3"], vol: 0.75, rate: [0.97, 1.03], offset: 0.78 },   // Datei hat ~0,8 s Anlauf vor dem Einschlag
    arrow_wood:  { f: ["Bow_ArrowShotimpactwood.mp3"], vol: 0.6, rate: [0.95, 1.05] },
    spawn:       { f: seq("Roninspawn", 4), vol: 0.6 },
    spawn_heavy: { f: ["Heavy_Ronin_Spawn_1.mp3", "Heavy_Ronin_Spawn_2.mp3"], vol: 0.75 },
    step:        { f: seq("Characterstep", 7), vol: 0.32, rate: [0.94, 1.06] },
    step_grass:  { f: seq("step_mosundgras", 7), vol: 0.38, rate: [0.94, 1.06] },
    step_water:  { f: seq("step_water", 5), vol: 0.45, rate: [0.94, 1.06] }
  };
  var LOOPS = { wind: "Wind.mp3", waterfall: "Flowingwaterfall.mp3" };
  // Soundtracks: jeder Lauf bekommt zufällig einen davon
  var MUSIC = ["shizuku_OST_1.mp3"];

  var ctx = null, master = null, sfxBus = null, ambBus = null, musBus = null, mus = null, musWant = null, musLevel = 0, buffers = {}, last = {}, loops = {}, loading = false, muted = false;
  try { muted = localStorage.getItem("shizuku.mute") === "1"; } catch (e) {}
  var volume = { sfx: 0.85, amb: 0.7, music: 0.5 };

  function load(file, cb) {
    if (buffers[file]) { if (buffers[file] !== "loading" && cb) cb(buffers[file]); return; }
    buffers[file] = "loading";
    fetch("shizuku/audio/" + file + (SZ.STAMP ? "?v=" + SZ.STAMP : "")).then(function (r) { if (!r.ok) throw 0; return r.arrayBuffer(); })
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

  var A = SZ.audio = {
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
      var gv = (S.vol || 1) * (opt.vol == null ? 1 : opt.vol), off = Math.max(lead(buf), S.offset || 0);
      if (S.offset) { g.gain.setValueAtTime(0, ctx.currentTime); g.gain.linearRampToValueAtTime(gv, ctx.currentTime + 0.012); }   // weich einblenden, kein Knacken
      else g.gain.value = gv;
      src.connect(g);
      if (opt.x != null && ctx.createStereoPanner) {
        var p = ctx.createStereoPanner(); p.pan.value = Math.max(-0.8, Math.min(0.8, (opt.x / SZ.W - 0.5) * 1.4));
        g.connect(p); out = p;
      }
      out.connect(sfxBus);
      src.start(0, Math.min(off, buf.duration - 0.05));
      return { stop: function (fade) { try { var t = ctx.currentTime; g.gain.setTargetAtTime(0, t, (fade || 0.05) / 3); src.stop(t + (fade || 0.05) + 0.05); } catch (e) {} } };
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
      try { localStorage.setItem("shizuku.mute", muted ? "1" : "0"); } catch (e) {}
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
