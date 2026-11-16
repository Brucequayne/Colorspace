  // ===== 59-sound.js · Sounds aus Dateien (seit v0.58, Raumklang seit v0.58.1) =====
  // Alle Sounds liegen in spacerogue-sounds/ und werden beim ersten Klick geladen (Web Audio).
  //  handwaffen/  Noahs Aufnahmen (Pistole, MP). synth/  von Claude synthetisierte Platzhalter – jede Datei kann durch eine
  //  eigene mit gleichem Namen ersetzt werden. Schleifen (.wav) müssen nahtlos loopen.
  // Beim Abspielen wird die Stille am Anfang übersprungen (nicht bei Schleifen). Lautstärken kommen aus den Dateien,
  // dazu Raumklang: leiser mit Abstand zur eigenen Figur (Hörer) und je weiter die Kamera herausgezoomt ist, Stereo nach links/rechts.
  var SND = {
    dir: "spacerogue-sounds/",
    files: {
      pDraw: "handwaffen/pistole_rausholen.mp3", pShot: "handwaffen/pistole_schuss.mp3", mDraw: "handwaffen/mp_rausholen.mp3", mShot: "handwaffen/mp_schuss.mp3", mCase: "handwaffen/mp_huelse.mp3",
      rgCh: "synth/railgun_laden.mp3", rgShot: "synth/railgun_schuss.mp3", lz: "synth/laser_strahl.wav", msStart: "synth/rakete_start.mp3", msLoop: "synth/rakete_zischen.wav",
      hit1: "synth/treffer_metall_1.mp3", hit2: "synth/treffer_metall_2.mp3", hit3: "synth/treffer_metall_3.mp3", shHit: "synth/schild_treffer.mp3", shLoad: "synth/schild_laden.wav",
      reac: "synth/reaktor_summen.wav", ping: "synth/scanner_ping.mp3", st1: "synth/schritt_1.mp3", st2: "synth/schritt_2.mp3", st3: "synth/schritt_3.mp3", st4: "synth/schritt_4.mp3", breath: "synth/atmen_helm.wav"
    },
    loop: { lz: 1, msLoop: 1, shLoad: 1, reac: 1, breath: 1 },
    buf: {}, off: {}, busy: false, out: null, dull: null, voices: {}, loops: {}, last: {}, ids: 0
  };
  // Stimmen je Sound: wie viele gleichzeitig klingen dürfen; die älteste wird kurz ausgeblendet (Dauerfeuer bleibt klar)
  var SND_MAX = { mShot: 4, mCase: 3, pShot: 3, pDraw: 1, mDraw: 1, gat: 6, rgCh: 3, rgShot: 3, msStart: 3, hit: 4, shHit: 3, ping: 1, step: 2 };
  // Raumklang: R = Abstand (m), bei dem ein Sound noch halb so laut ist; Zoom: unter Z0 wird es leiser
  var SPAT = { R: 70, Z0: 0.9, zk: 0.75, pan: 0.7 };
  // eigener Zufall für Sounds: Math.random bleibt unberührt, damit Ton den Spielablauf nie verändert (Volltest bleibt gleich)
  var sndSeed = 12345; function sndR() { sndSeed = (Math.imul(sndSeed, 1103515245) + 12345) >>> 0; return sndSeed / 4294967296; }
  function sndLoad() {
    audioInit(); if (!AC || SND.busy) return; SND.busy = true;
    SND.out = AC.createGain(); SND.out.gain.value = SET.sfx; SND.out.connect(AC.destination);
    SND.dull = AC.createBiquadFilter(); SND.dull.type = "lowpass"; SND.dull.frequency.value = 2600; SND.dull.Q.value = 0.5; SND.dull.connect(SND.out);   // dumpfer Bus (Gatling)
    Object.keys(SND.files).forEach(function (k) {
      fetch(SND.dir + SND.files[k]).then(function (r) { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
        .then(function (a) { return new Promise(function (ok, no) { AC.decodeAudioData(a, ok, no); }); })
        .then(function (b) { SND.buf[k] = b; SND.off[k] = SND.loop[k] ? 0 : sndLead(b); })
        .catch(function () {});   // fehlt eine Datei, bleibt es an der Stelle still
    });
  }
  function sndLead(b) {   // erste Stelle über -50 dB, 3 ms Vorlauf
    var d = b.getChannelData(0), th = 0.0032, n = Math.min(d.length, Math.floor(b.sampleRate * 0.2));
    for (var i = 0; i < n; i++) if (Math.abs(d[i]) > th) return Math.max(0, i / b.sampleRate - 0.003);
    return 0;
  }
  function sndVol(v) { SET.sfx = v; if (SND.out) SND.out.gain.value = v; }
  function sndOk() { return AC && AC.state === "running" && SND.out && SET.sfx > 0; }
  // Hörer = die eigene Figur (zu Fuß, im Anzug draußen, sonst das eigene Schiff)
  function sndEar() {
    if (!FL) return null;
    if (FL.out && FL.eva) return { x: FL.eva.x, y: FL.eva.y };
    if (!FL.seated && FL.pilot) { var pb = FL.pb || FL.me; return toWorld(pb, FL.pilot.x, FL.pilot.y); }
    return { x: FL.me.x, y: FL.me.y };
  }
  function sndZoom() { return Math.pow(Math.min(1, (V.zoom || 1) / SPAT.Z0), SPAT.zk); }
  // Lautstärke und Stereo für eine Stelle in der Welt (x, y in m); ohne Stelle: nur Zoom
  function sndAt(x, y) {
    var z = sndZoom(); if (x == null) return { g: z, p: 0 };
    var E = sndEar(); if (!E) return { g: z, p: 0 };
    var d = Math.hypot(x - E.x, y - E.y), ppm = PX * V.zoom / CELL_M, half = (V.W || 800) / 2 / ppm;
    return { g: z / (1 + (d / SPAT.R) * (d / SPAT.R)), p: Math.max(-1, Math.min(1, (x - E.x) / half)) * SPAT.pan };
  }
  // k: Name, o: { pitch: ±Zufall, rate: fest, gain, delay: s, x, y: Stelle, bus: "dull", vk: Stimmengruppe, flat: ohne Raumklang }
  function snd(k, o) {
    if (!sndOk() || !SND.buf[k]) return null;
    o = o || {};
    var sp = o.flat ? { g: 1, p: 0 } : sndAt(o.x, o.y), gain = (o.gain == null ? 1 : o.gain) * sp.g; if (gain < 0.004) return null;
    try {
      var t0 = AC.currentTime + (o.delay || 0), src = AC.createBufferSource(), g = AC.createGain(), last = g;
      src.buffer = SND.buf[k]; src.playbackRate.value = (o.rate || 1) * (1 + (o.pitch ? (sndR() - 0.5) * 2 * o.pitch : 0));
      g.gain.value = gain; src.connect(g);
      if (sp.p && AC.createStereoPanner) { var pn = AC.createStereoPanner(); pn.pan.value = sp.p; g.connect(pn); last = pn; }
      last.connect(o.bus === "dull" ? SND.dull : SND.out);
      var vk = o.vk || k, L = SND.voices[vk] || (SND.voices[vk] = []);
      while (L.length >= (SND_MAX[vk] || 3)) { var old = L.shift(); try { old.g.gain.setTargetAtTime(0, t0, 0.012); old.s.stop(t0 + 0.06); } catch (e) {} }
      var v = { s: src, g: g }; L.push(v); src.onended = function () { var i = L.indexOf(v); if (i >= 0) L.splice(i, 1); };
      src.start(t0, SND.off[k] || 0); return v;
    } catch (e) { return null; }
  }
  // Mindestabstand zwischen zwei gleichen Sounds (s), damit Massentreffer nicht knattern
  function sndGap(k, s) { var n = AC ? AC.currentTime : 0; if (n - (SND.last[k] || -9) < s) return false; SND.last[k] = n; return true; }
  // ---------- Schleifen: jeden Frame mit Lautstärke setzen; was nicht mehr gesetzt wird, blendet aus ----------
  function sndLoop(id, k, gain, pan, rate) {
    if (!sndOk() || !SND.buf[k]) return;
    var L = SND.loops[id];
    if (!L) {
      try {
        var src = AC.createBufferSource(), g = AC.createGain(), pn = AC.createStereoPanner ? AC.createStereoPanner() : null;
        src.buffer = SND.buf[k]; src.loop = true; g.gain.value = 0; src.connect(g);
        if (pn) { g.connect(pn); pn.connect(SND.out); } else g.connect(SND.out);
        src.start(AC.currentTime, sndR() * SND.buf[k].duration);   // zufällige Startstelle, damit gleiche Schleifen nicht phasengleich sind
        L = SND.loops[id] = { s: src, g: g, p: pn };
      } catch (e) { return; }
    }
    L.seen = true; var tn = AC.currentTime;
    L.g.gain.setTargetAtTime(Math.max(0, gain), tn, 0.06);
    if (L.p) L.p.pan.setTargetAtTime(pan || 0, tn, 0.06);
    if (rate) L.s.playbackRate.setTargetAtTime(rate, tn, 0.1);
  }
  function sndLoopsEnd() {
    if (!AC) return;
    Object.keys(SND.loops).forEach(function (id) {
      var L = SND.loops[id]; if (L.seen) { L.seen = false; return; }
      try { L.g.gain.setTargetAtTime(0, AC.currentTime, 0.05); L.s.stop(AC.currentTime + 0.3); } catch (e) {}
      delete SND.loops[id];
    });
  }
  function sndStopAll() { Object.keys(SND.loops).forEach(function (id) { var L = SND.loops[id]; try { L.g.gain.value = 0; L.s.stop(); } catch (e) {} }); SND.loops = {}; }
  // ---------- Handwaffen ----------
  function sndHeld() {
    var h = FL && !FL.seated ? held() : null;
    if (h !== SND.lastHeld) { SND.lastHeld = h; if (h === "pistol") snd("pDraw", { flat: 1 }); else if (h === "smg") snd("mDraw", { flat: 1 }); }
  }
  function sndShot(spec) {
    if (!sndOk()) return;   // ohne Ton keine Zufallszahlen verbrauchen (das Spiel darf vom Sound nie abhängen)
    if (spec === SMG) {
      snd("mShot", { pitch: 0.025, gain: 0.92 + sndR() * 0.08, flat: 1 });
      SND.cn = (SND.cn || 0) + 1;
      if (!FL.out && SND.cn % 2 === 0) snd("mCase", { pitch: 0.07, gain: 0.8 + sndR() * 0.3, delay: 0.28 + sndR() * 0.3, flat: 1 });   // jede zweite Hülse, nicht im All
    } else snd("pShot", { pitch: 0.02, flat: 1 });
  }
  // ---------- Schiffswaffen ----------
  // Gatling (Minigun): MP-Schuss etwas höher und dumpfer, ohne Hülsen. Je Schiff nur die ersten zwei Rohre hörbar (b.sndOn)
  function sndGat(bd, b, x, y) { if (b.sndOn === false || !sndOk()) return; snd("mShot", { x: x, y: y, rate: 1.13, pitch: 0.02, gain: 0.75 + sndR() * 0.1, bus: "dull", vk: "gat" }); }
  function sndGatPick(list) { list.forEach(function (b, i) { b.sndOn = i < 2; }); }
  function sndRail(x, y) { if (!sndOk()) return; snd("rgShot", { x: x, y: y, pitch: 0.03 }); }
  function sndRailCharge(b, x, y) { if (!sndOk()) return; b.sndCh = snd("rgCh", { x: x, y: y }); b.sndChT = FL.t; }
  function sndRailAbort(b) { if (b.sndCh && FL.t - b.sndChT < RG.charge - 0.02) { try { b.sndCh.g.gain.setTargetAtTime(0, AC.currentTime, 0.03); b.sndCh.s.stop(AC.currentTime + 0.15); } catch (e) {} } b.sndCh = null; }
  function sndMissile(x, y) { if (!sndOk()) return; snd("msStart", { x: x, y: y, pitch: 0.05 }); }
  function sndHitMetal(x, y) { if (!sndOk() || !sndGap("hit", 0.035)) return; snd("hit" + (1 + Math.floor(sndR() * 3)), { x: x, y: y, pitch: 0.08, gain: 0.8 + sndR() * 0.2, vk: "hit" }); }
  function sndShield(x, y) { if (!sndOk() || !sndGap("shHit", 0.06)) return; snd("shHit", { x: x, y: y, pitch: 0.06 }); }
  // ---------- je Frame: Schleifen, Schritte, Scanner ----------
  function sndTick(dt) {
    if (!FL || !sndOk()) return;
    var E = sndEar();
    // Laser: ein Summen je Schiff, das gerade strahlt (Stelle = Mitte der Emitter)
    FL.bodies.forEach(function (bd) {
      var n = 0, sx = 0, sy = 0;
      bd.blocks.forEach(function (b) { if (b.lz && FL.t - b.lz.t < 0.06) { n++; sx += b.lz.x0; sy += b.lz.y0; } });
      if (!n) return; if (!bd.sid) bd.sid = ++SND.ids; var a = sndAt(sx / n, sy / n);
      sndLoop("lz" + bd.sid, "lz", a.g * Math.min(1.3, 0.8 + 0.2 * n), a.p);
    });
    // Raketen: Zischen der vier nächsten im Flug
    if (FL.missiles && FL.missiles.length && E) {
      FL.missiles.map(function (m) { return { m: m, d: Math.hypot(m.x - E.x, m.y - E.y) }; }).sort(function (a, b) { return a.d - b.d; }).slice(0, 4).forEach(function (q) {
        if (!q.m.sid) q.m.sid = ++SND.ids; var a = sndAt(q.m.x, q.m.y); sndLoop("ms" + q.m.sid, "msLoop", a.g * 0.9 * Math.min(1, q.m.life * 6), a.p, q.m.k > 1 ? 0.88 : 1);
      });
    }
    // Schild laden: magnetisches Summen am eigenen Schiff, steigt mit dem Füllstand
    if (FL.shCharging && FL.me.shGen) { var a2 = sndAt(FL.me.x, FL.me.y), fr = FL.shTarget > 0 ? Math.min(1, FL.me.shE / FL.shTarget) : 0; sndLoop("shL", "shLoad", a2.g * 0.9, a2.p, 0.9 + 0.25 * fr); }
    // Zu Fuß: Reaktor-Summen (nach 4 Zellen ganz weg), Schritte
    if (!FL.seated && !FL.out && FL.pilot) {
      var pb = FL.pb || FL.me, P = FL.pilot, best = 9;
      pb.blocks.forEach(function (b) {
        if (T[b.t].kind !== "reac") return; var f = fp(b), cx = Math.max(b.x, Math.min(b.x + f[0], P.x)), cy = Math.max(b.y, Math.min(b.y + f[1], P.y));
        best = Math.min(best, Math.hypot(cx - P.x, cy - P.y));
      });
      if (best < 4) sndLoop("reac", "reac", Math.pow(1 - best / 4, 2) * 0.9 * sndZoom(), 0);
      var w = toWorld(pb, P.x, P.y);
      if (SND.stp && SND.stp.bd === pb) {
        var mv = Math.hypot(P.x - SND.stp.x, P.y - SND.stp.y);
        if (mv < 0.5) { SND.stepD = (SND.stepD || 0) + mv * CELL_M; if (SND.stepD > 0.85) { SND.stepD = 0; SND.stepN = ((SND.stepN || 0) + 1) % 4; snd("st" + (SND.stepN + 1), { flat: 1, pitch: 0.06, gain: 0.7 + sndR() * 0.25, vk: "step" }); } }
      }
      SND.stp = { bd: pb, x: P.x, y: P.y };
    } else SND.stp = null;
    // Atmen im Helm, sobald man auf Anzugluft angewiesen ist
    if (FL.breath && FL.breath !== "room") sndLoop("br", "breath", 0.85, 0);
    // Scanner: Sonar-Ping alle 5 s, solange er mit Antenne arbeitet
    if (FL.me.nScan && antRange(FL.me) && FL.bodies.indexOf(FL.me) >= 0) { SND.pingT = (SND.pingT || 0) - dt; if (SND.pingT <= 0) { SND.pingT = 5; snd("ping", { x: FL.me.x, y: FL.me.y, gain: 0.7 }); } }
    sndLoopsEnd();
  }
