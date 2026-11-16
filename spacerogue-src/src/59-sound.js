  // ===== 59-sound.js · Sounds aus Dateien (v0.58) =====
  // Noahs Sounds liegen als .mp3 in spacerogue-sounds/ und werden beim ersten Klick geladen (Web Audio).
  // Beim Abspielen wird die Stille am Anfang übersprungen (Start ab dem ersten hörbaren Sample), damit Schüsse ohne Verzögerung kommen.
  // Lautstärken kommen aus den Dateien (Noahs Mischung), dazu nur der Regler „Effekte“ in den Einstellungen.
  var SND = {
    dir: "spacerogue-sounds/handwaffen/",
    files: { pDraw: "pistole_rausholen.mp3", pShot: "pistole_schuss.mp3", mDraw: "mp_rausholen.mp3", mShot: "mp_schuss.mp3", mCase: "mp_huelse.mp3" },
    buf: {}, off: {}, busy: false, out: null, voices: {}
  };
  // Stimmen je Sound: wie viele gleichzeitig klingen dürfen; die älteste wird kurz ausgeblendet (MP-Dauerfeuer bleibt klar)
  var SND_MAX = { mShot: 4, mCase: 3, pShot: 3, pDraw: 1, mDraw: 1 };
  function sndLoad() {
    audioInit(); if (!AC || SND.busy) return; SND.busy = true;
    SND.out = AC.createGain(); SND.out.gain.value = SET.sfx; SND.out.connect(AC.destination);
    Object.keys(SND.files).forEach(function (k) {
      fetch(SND.dir + SND.files[k]).then(function (r) { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
        .then(function (a) { return new Promise(function (ok, no) { AC.decodeAudioData(a, ok, no); }); })
        .then(function (b) { SND.buf[k] = b; SND.off[k] = sndLead(b); })
        .catch(function () {});   // fehlt eine Datei, bleibt es an der Stelle still
    });
  }
  function sndLead(b) {   // erste Stelle über -50 dB, 3 ms Vorlauf
    var d = b.getChannelData(0), th = 0.0032, n = Math.min(d.length, Math.floor(b.sampleRate * 0.2));
    for (var i = 0; i < n; i++) if (Math.abs(d[i]) > th) return Math.max(0, i / b.sampleRate - 0.003);
    return 0;
  }
  function sndVol(v) { SET.sfx = v; if (SND.out) SND.out.gain.value = v; }
  // k: Name, o: { pitch: ±Anteil Zufall, gain: Faktor, delay: s }
  function snd(k, o) {
    if (!AC || AC.state !== "running" || !SND.buf[k] || !SND.out || SET.sfx <= 0) return;
    o = o || {};
    try {
      var t0 = AC.currentTime + (o.delay || 0), src = AC.createBufferSource(), g = AC.createGain();
      src.buffer = SND.buf[k]; src.playbackRate.value = 1 + (o.pitch ? (Math.random() - 0.5) * 2 * o.pitch : 0);
      g.gain.value = o.gain == null ? 1 : o.gain; src.connect(g); g.connect(SND.out);
      var L = SND.voices[k] || (SND.voices[k] = []);
      while (L.length >= (SND_MAX[k] || 3)) { var old = L.shift(); try { old.g.gain.setTargetAtTime(0, t0, 0.012); old.s.stop(t0 + 0.06); } catch (e) {} }
      var v = { s: src, g: g }; L.push(v); src.onended = function () { var i = L.indexOf(v); if (i >= 0) L.splice(i, 1); };
      src.start(t0, SND.off[k] || 0);
    } catch (e) {}
  }
  // Handwaffen: Ziehen beim Wechsel auf Pistole/MP, Schuss je Schuss, Hülsen bei der MP (nur auf Boden, nicht im All)
  function sndHeld() {
    var h = FL && !FL.seated ? held() : null;
    if (h !== SND.lastHeld) { SND.lastHeld = h; if (h === "pistol") snd("pDraw"); else if (h === "smg") snd("mDraw"); }
  }
  function sndShot(spec) {
    if (spec === SMG) {
      snd("mShot", { pitch: 0.025, gain: 0.92 + Math.random() * 0.08 });
      SND.cn = (SND.cn || 0) + 1;
      if (!FL.out && SND.cn % 2 === 0) snd("mCase", { pitch: 0.07, gain: 0.8 + Math.random() * 0.3, delay: 0.28 + Math.random() * 0.3 });   // jede zweite Hülse hörbar, landet etwas später
    } else snd("pShot", { pitch: 0.02 });
  }
