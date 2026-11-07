/* No Aim No Game 0.1 – Aimtrainer mit Vögeln und Fröschen auf einer Wiese. Für Color Space.
   Einbindung: noaim.js per script-Tag laden, dann NoAim.mount(element, "de" | "en") und NoAim.unmount().
   Das Spiel legt sich über die ganze Seite. Highscores liegen nur lokal im Browser (localStorage "noaim-v1"). */
(function () {
  "use strict";

  var VERSION = "0.1", KEY = "noaim-v1";
  var lang = "de";
  function L2(de, en) { return { de: de, en: en }; }
  var TX = {
    title: L2("No Aim No Game", "No Aim No Game"),
    intro: L2("Vögel fliegen über den Himmel, Frösche hüpfen über die Wiese. Ein Schuss, ein Treffer. Lässt du drei Tiere auf die andere Seite entkommen, ist die Runde vorbei. Mit der Zeit kommen immer mehr.",
              "Birds fly across the sky, frogs hop over the meadow. One shot, one hit. Let three animals escape to the other side and the round is over. Over time, more and more appear."),
    time: L2("Uhrzeit", "Time of day"), diff: L2("Schwierigkeit", "Difficulty"), sens: L2("Sensitivity", "Sensitivity"),
    d0: L2("Easy", "Easy"), d1: L2("Normal", "Normal"), d2: L2("Hard", "Hard"),
    dNote: L2("Gilt ab der nächsten Runde.", "Applies from the next round."),
    sound: L2("Ton", "Sound"), on: L2("An", "On"), off: L2("Aus", "Off"),
    full: L2("Vollbild", "Fullscreen"),
    start: L2("Start", "Start"), resume: L2("Weiter", "Resume"), restart: L2("Neu starten", "Restart"), again: L2("Nochmal", "Play again"),
    paused: L2("Pause", "Paused"), over: L2("Game Over", "Game Over"),
    score: L2("Punkte", "Score"), best: L2("Highscore", "High score"), newBest: L2("Neuer Highscore!", "New high score!"),
    acc: L2("Trefferquote", "Accuracy"), hits: L2("Treffer", "Hits"), lasted: L2("Überlebt", "Survived"),
    bests: L2("Highscores", "High scores"),
    back: L2("← Alle Anwendungen", "← All apps"),
    help: L2("Klick zum Schießen. Esc pausiert. Mit gefangener Maus wirkt die Sensitivity, so wie in Shootern.",
             "Click to shoot. Esc pauses. With the mouse captured, sensitivity applies, just like in shooters."),
    touchHelp: L2("Tippen zum Schießen.", "Tap to shoot."),
    pauseBtn: L2("Pause", "Pause")
  };
  function t(k) { return TX[k][lang]; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function lerp(a, b, f) { return a + (b - a) * f; }
  function num(v, d) { var s = v.toFixed(d); return lang === "de" ? s.replace(".", ",") : s; }

  // ---------- Schwierigkeit ----------
  // birdT/frogT: Sekunden für eine Bildschirmbreite. amp/nAmp: Anteil der Höhe. Je schwerer, desto schneller,
  // weiter ausschlagend und unregelmäßiger (Rauschen, Tempowechsel, Rückwärtshüpfer).
  var DIFF = [
    { birdT: [7.5, 9], amp: [0.03, 0.06], freq: [0.22, 0.4], nAmp: 0.012, spdVar: 0.05, frogT: [10, 12], pause: [0.45, 0.6], hopVar: 0.08, back: 0, base: 2.4, min: 0.9, mult: 1 },
    { birdT: [5.2, 6.5], amp: [0.05, 0.1], freq: [0.35, 0.7], nAmp: 0.045, spdVar: 0.22, frogT: [7, 9], pause: [0.18, 0.8], hopVar: 0.35, back: 0.06, base: 1.8, min: 0.6, mult: 1.5 },
    { birdT: [3.6, 4.6], amp: [0.07, 0.15], freq: [0.5, 1.05], nAmp: 0.09, spdVar: 0.45, frogT: [5, 6.5], pause: [0.04, 0.95], hopVar: 0.6, back: 0.16, base: 1.3, min: 0.4, mult: 2 }
  ];

  // ---------- Zustand ----------
  var S = { state: "menu", diff: 1, hour: 12, sens: 1, sound: true };
  var G = null;            // laufende Runde
  var R = null;            // Oberfläche
  var ent = [], fx = [], W = 0, H = 0, dpr = 1, horizon = 0;
  var aim = { x: 0, y: 0, vis: false, kick: 0 }, locked = false;
  var best = [0, 0, 0];

  function load() {
    try { var o = JSON.parse(localStorage.getItem(KEY) || "{}"); if (o.best) best = [o.best[0] | 0, o.best[1] | 0, o.best[2] | 0];
      if (o.s) { S.diff = clamp(o.s.diff | 0, 0, 2); S.hour = clamp(+o.s.hour || 12, 0, 24); S.sens = clamp(+o.s.sens || 1, 0.2, 3); S.sound = o.s.sound !== false; } } catch (e) {}
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify({ best: best, s: { diff: S.diff, hour: S.hour, sens: S.sens, sound: S.sound } })); } catch (e) {} }

  // ---------- Rauschen ----------
  function hash(n) { n = Math.sin(n * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); }
  function noise(seed, x) { var i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(seed * 57 + i), hash(seed * 57 + i + 1), u) * 2 - 1; }

  // ---------- Ton (synthetisch, leise) ----------
  var AC = null, master = null, nbuf = null;
  function audio() {
    if (!S.sound) return null;
    if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); master = AC.createGain(); master.gain.value = 0.32; master.connect(AC.destination); } catch (e) { return null; } }
    if (AC.state === "suspended") AC.resume();
    if (!nbuf) { nbuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate); var d = nbuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    return AC;
  }
  function env(g, t0, peak, dur) { g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(peak, t0 + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); }
  function noiseHit(a, t0, type, f0, f1, peak, dur) {
    var n = a.createBufferSource(); n.buffer = nbuf; var f = a.createBiquadFilter(); f.type = type;
    f.frequency.setValueAtTime(f0, t0); f.frequency.exponentialRampToValueAtTime(f1, t0 + dur); f.Q.value = 0.7;
    var g = a.createGain(); env(g, t0, peak, dur); n.connect(f); f.connect(g); g.connect(master);
    n.start(t0, Math.random() * 0.5); n.stop(t0 + dur + 0.02);
  }
  function tone(a, t0, type, f0, f1, peak, dur) {
    var o = a.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    var g = a.createGain(); env(g, t0, peak, dur); o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  var SND = {
    shot: function () { var a = audio(); if (!a) return; var t0 = a.currentTime; noiseHit(a, t0, "bandpass", 2200, 500, 0.55, 0.13); tone(a, t0, "sine", 150, 48, 0.45, 0.11); },
    bird: function () { var a = audio(); if (!a) return; var t0 = a.currentTime + 0.02; tone(a, t0, "triangle", 760, 1350, 0.22, 0.09); noiseHit(a, t0, "highpass", 3000, 1500, 0.12, 0.12); },
    frog: function () { var a = audio(); if (!a) return; var t0 = a.currentTime + 0.02; tone(a, t0, "sine", 280, 820, 0.3, 0.12); noiseHit(a, t0 + 0.03, "lowpass", 1400, 300, 0.22, 0.25); },
    escape: function () { var a = audio(); if (!a) return; var t0 = a.currentTime; tone(a, t0, "sine", 330, 210, 0.22, 0.28); },
    over: function () { var a = audio(); if (!a) return; var t0 = a.currentTime; [440, 349, 262].forEach(function (f, i) { tone(a, t0 + i * 0.17, "triangle", f, f * 0.98, 0.22, 0.2); }); }
  };

  // ---------- Tageszeit ----------
  var PAL = [
    { h: 0,    top: "#0B1230", bot: "#1E2A55", cloud: "#3E4A70", far: "#1C2A3C", near: "#17282A", mTop: "#1D3A27", mBot: "#112217", sun: "#FFE08A", night: 1, warm: 0 },
    { h: 4.8,  top: "#121B44", bot: "#3B3466", cloud: "#4E4C78", far: "#22304A", near: "#1C2F2C", mTop: "#22412B", mBot: "#142719", sun: "#FF8A4C", night: 0.85, warm: 0.2 },
    { h: 6,    top: "#3D5596", bot: "#F2A065", cloud: "#F5BFA4", far: "#5C6E8A", near: "#3F6B4A", mTop: "#4F8A3C", mBot: "#30632A", sun: "#FF7A3D", night: 0.3, warm: 1 },
    { h: 7.6,  top: "#4C98DE", bot: "#BFE3F6", cloud: "#FFFFFF", far: "#8FB7C8", near: "#6FAE5E", mTop: "#7BC45A", mBot: "#4E9A38", sun: "#FFD94A", night: 0, warm: 0.1 },
    { h: 12,   top: "#3A8BDD", bot: "#CDEBFB", cloud: "#FFFFFF", far: "#9CC4D0", near: "#78BA62", mTop: "#82CC5C", mBot: "#52A23A", sun: "#FFF09A", night: 0, warm: 0 },
    { h: 16.4, top: "#3F86D2", bot: "#D6E9F2", cloud: "#FFF8EE", far: "#9CBCC6", near: "#74B25C", mTop: "#7EC458", mBot: "#4F9A38", sun: "#FFE070", night: 0, warm: 0.15 },
    { h: 18,   top: "#47508F", bot: "#F08A4C", cloud: "#F4A48A", far: "#6A6A8A", near: "#4C6E48", mTop: "#5A8A3E", mBot: "#3A6230", sun: "#FF6A33", night: 0.25, warm: 1 },
    { h: 19.6, top: "#1B2352", bot: "#5A3D6E", cloud: "#5C4A78", far: "#2C3050", near: "#22362E", mTop: "#2A4A2E", mBot: "#1A2E1E", sun: "#FF5A3A", night: 0.75, warm: 0.3 },
    { h: 24,   top: "#0B1230", bot: "#1E2A55", cloud: "#3E4A70", far: "#1C2A3C", near: "#17282A", mTop: "#1D3A27", mBot: "#112217", sun: "#FFE08A", night: 1, warm: 0 }
  ];
  function hx(c) { return [parseInt(c.substr(1, 2), 16), parseInt(c.substr(3, 2), 16), parseInt(c.substr(5, 2), 16)]; }
  function mix(a, b, f) { var x = hx(a), y = hx(b); return "rgb(" + Math.round(lerp(x[0], y[0], f)) + "," + Math.round(lerp(x[1], y[1], f)) + "," + Math.round(lerp(x[2], y[2], f)) + ")"; }
  function palette(h) {
    var i = 0; while (i < PAL.length - 2 && PAL[i + 1].h <= h) i++;
    var a = PAL[i], b = PAL[i + 1], f = clamp((h - a.h) / (b.h - a.h), 0, 1); f = f * f * (3 - 2 * f);
    var o = { night: lerp(a.night, b.night, f), warm: lerp(a.warm, b.warm, f) };
    ["top", "bot", "cloud", "far", "near", "mTop", "mBot", "sun"].forEach(function (k) { o[k] = mix(a[k], b[k], f); });
    return o;
  }

  // ---------- Szene (gecacht pro Uhrzeit und Größe) ----------
  var skyC = null, groundC = null, cacheKey = "", P = null, stars = [], clouds = [], tufts = [];
  function makeStatic() {
    var k = S.hour.toFixed(2) + "|" + W + "|" + H; if (k === cacheKey) return; cacheKey = k;
    P = palette(S.hour);
    var cw = Math.round(W * dpr), ch = Math.round(H * dpr);
    skyC = skyC || document.createElement("canvas"); skyC.width = cw; skyC.height = ch;
    var x = skyC.getContext("2d"); x.setTransform(dpr, 0, 0, dpr, 0, 0);
    var g = x.createLinearGradient(0, 0, 0, horizon); g.addColorStop(0, P.top); g.addColorStop(1, P.bot);
    x.fillStyle = g; x.fillRect(0, 0, W, horizon + 2);
    // Sterne
    if (P.night > 0.05) {
      x.fillStyle = "#FFF6DA";
      stars.forEach(function (s) { x.globalAlpha = P.night * s.a; x.beginPath(); x.arc(s.x * W, s.y * horizon, s.r, 0, Math.PI * 2); x.fill(); });
      x.globalAlpha = 1;
    }
    // Sonne und Mond gehen in der Bildmitte auf und unter
    var cx = W / 2, R0 = Math.min(W, H) * 0.06, h = S.hour;
    var sunH = Math.sin(Math.PI * (h - 6) / 12), sy = horizon - sunH * horizon * 0.78;
    if (sunH > -0.15) {
      var gl = x.createRadialGradient(cx, sy, R0 * 0.5, cx, sy, R0 * (3 + 2 * P.warm));
      gl.addColorStop(0, P.sun); gl.addColorStop(1, "rgba(255,200,120,0)");
      x.globalAlpha = 0.45 + 0.25 * P.warm; x.fillStyle = gl; x.fillRect(cx - R0 * 6, sy - R0 * 6, R0 * 12, R0 * 12); x.globalAlpha = 1;
      x.fillStyle = P.sun; x.beginPath(); x.arc(cx, sy, R0, 0, Math.PI * 2); x.fill();
    }
    var mh = h < 6 ? h + 24 : h, moonH = Math.sin(Math.PI * (mh - 18) / 12);
    if (moonH > -0.15 && P.night > 0.3) {
      var my = horizon - moonH * horizon * 0.72, mr = R0 * 0.7;
      x.globalAlpha = clamp((P.night - 0.3) * 2, 0, 1);
      x.fillStyle = "#F4EFD8"; x.beginPath(); x.arc(cx, my, mr, 0, Math.PI * 2); x.fill();
      x.fillStyle = P.top; x.beginPath(); x.arc(cx + mr * 0.45, my - mr * 0.2, mr * 0.85, 0, Math.PI * 2); x.fill();
      x.globalAlpha = 1;
    }
    // Hügel und Wiese
    groundC = groundC || document.createElement("canvas"); groundC.width = cw; groundC.height = ch;
    var y = groundC.getContext("2d"); y.setTransform(dpr, 0, 0, dpr, 0, 0); y.clearRect(0, 0, W, H);
    hill(y, P.far, horizon - H * 0.07, H * 0.05, 2.3, 1.7);
    hill(y, P.near, horizon - H * 0.025, H * 0.035, 3.7, 4.1);
    var m = y.createLinearGradient(0, horizon, 0, H); m.addColorStop(0, P.mTop); m.addColorStop(1, P.mBot);
    y.fillStyle = m; y.fillRect(0, horizon, W, H - horizon);
    y.strokeStyle = mix(rgbHex(P.mBot), "#000000", 0.15); y.lineWidth = 2; y.lineCap = "round";
    tufts.forEach(function (tf) {
      var tx = tf.x * W, ty = horizon + tf.y * (H - horizon), sc = 0.5 + tf.y;
      y.beginPath();
      for (var j = -1; j <= 1; j++) { y.moveTo(tx + j * 4 * sc, ty); y.quadraticCurveTo(tx + j * 5 * sc, ty - 7 * sc, tx + j * 8 * sc, ty - 12 * sc); }
      y.stroke();
      if (tf.flower) { y.fillStyle = mix(tf.flower, "#18213F", P.night * 0.7); y.beginPath(); y.arc(tx + 8 * sc, ty - 13 * sc, 3 * sc, 0, Math.PI * 2); y.fill(); }
    });
  }
  function rgbHex(c) { var m = c.match(/\d+/g); return "#" + m.slice(0, 3).map(function (v) { return ("0" + (+v).toString(16)).slice(-2); }).join(""); }
  function hill(x, col, base, amp, f1, f2) {
    x.fillStyle = col; x.beginPath(); x.moveTo(0, horizon + 2);
    for (var i = 0; i <= 60; i++) { var u = i / 60; x.lineTo(u * W, base - amp * (0.6 * Math.sin(u * Math.PI * f1 + 0.7) + 0.4 * Math.sin(u * Math.PI * f2 + 2.1) + 0.6)); }
    x.lineTo(W, horizon + 2); x.closePath(); x.fill();
  }
  function seedScene() {
    stars = []; for (var i = 0; i < 140; i++) stars.push({ x: Math.random(), y: Math.random() * 0.85, r: rnd(0.6, 1.6), a: rnd(0.4, 1) });
    tufts = []; var fl = ["#F7E15A", "#F2F2F2", "#E86A8A", "#B48CF0"];
    for (var j = 0; j < 90; j++) tufts.push({ x: Math.random(), y: Math.pow(Math.random(), 0.8) * 0.95 + 0.03, flower: Math.random() < 0.25 ? fl[j % 4] : null });
    tufts.sort(function (a, b) { return a.y - b.y; });
    clouds = []; for (var k = 0; k < 7; k++) clouds.push(newCloud(Math.random()));
  }
  function newCloud(xf) {
    var n = 3 + Math.floor(Math.random() * 3), parts = [];
    for (var i = 0; i < n; i++) parts.push({ dx: (i - (n - 1) / 2) * rnd(0.7, 0.95), dy: rnd(-0.35, 0.1) - (i > 0 && i < n - 1 ? 0.3 : 0), r: rnd(0.55, 0.85) });
    return { x: xf, y: rnd(0.08, 0.5), s: rnd(0.035, 0.06), v: rnd(0.004, 0.012), parts: parts };
  }
  function drawClouds(x, dt) {
    clouds.forEach(function (c, i) {
      c.x += c.v * dt;
      if (c.x > 1.25) { clouds[i] = newCloud(-0.25); return; }
      var s = c.s * W, cx = c.x * W, cy = c.y * horizon;
      x.fillStyle = P.cloud; x.globalAlpha = 0.92 - P.night * 0.35;
      x.beginPath(); c.parts.forEach(function (p) { x.moveTo(cx + p.dx * s + p.r * s, cy + p.dy * s); x.arc(cx + p.dx * s, cy + p.dy * s, p.r * s, 0, Math.PI * 2); });
      x.rect(cx - (c.parts.length / 2) * s * 0.8, cy - s * 0.1, c.parts.length * s * 0.8, s * 0.55); x.fill();
      x.globalAlpha = 1;
    });
  }

  // ---------- Tiere ----------
  var INK = "#1F2A2E";
  var BIRDS = [
    { body: "#E8574A", belly: "#F8C9A0", wing: "#B93A33" },
    { body: "#3D7DD8", belly: "#D5E8FA", wing: "#2A5AA8" },
    { body: "#F2B33D", belly: "#FFF0C2", wing: "#D08A22" },
    { body: "#8A5BC8", belly: "#E4D4F6", wing: "#6A3FA6" }
  ];
  function unit() { return Math.max(0.6, Math.min(W, H * 1.4) / 1000); }
  function prog() { return G ? 1 + Math.min(0.35, G.time / 240) : 1; }
  function D() { return DIFF[G ? G.diff : 0]; }
  function spawnBird() {
    var d = D(), dir = Math.random() < 0.5 ? 1 : -1, s = 26 * unit() * rnd(0.85, 1.15);
    var top = H * 0.1, bot = horizon - H * 0.1;
    ent.push({ type: "bird", dir: dir, s: s, x: dir > 0 ? -s * 2 : W + s * 2, base: rnd(top + H * 0.05, bot - H * 0.05), t: 0,
      speed: (W + 4 * s) / rnd(d.birdT[0], d.birdT[1]) * prog(), amp: H * rnd(d.amp[0], d.amp[1]), freq: rnd(d.freq[0], d.freq[1]),
      ph: Math.random() * 6.3, nAmp: H * d.nAmp, seed: Math.random() * 1000, spdVar: d.spdVar, col: BIRDS[Math.floor(Math.random() * BIRDS.length)],
      flap: rnd(11, 15), y: 0, top: top, bot: bot });
  }
  function spawnFrog() {
    var d = D(), dir = Math.random() < 0.5 ? 1 : -1, depth = Math.random(), s = 22 * unit() * (0.7 + 0.6 * depth);
    var gy = horizon + (H - horizon) * (0.18 + 0.7 * depth), m = s * 2;
    var cycle = 0.42 + (d.pause[0] + d.pause[1]) / 2, total = rnd(d.frogT[0], d.frogT[1]) / prog();
    ent.push({ type: "frog", dir: dir, s: s, x: dir > 0 ? -m : W + m, gy: gy, y: gy, state: "sit", timer: rnd(0, 0.2), hop: null,
      len: (W + 2 * m) * cycle / total, d: d, seed: Math.random() * 1000 });
  }
  function updBird(b, dt) {
    b.t += dt;
    var sp = b.speed * (1 + b.spdVar * noise(b.seed + 7, b.t * 0.8));
    b.x += b.dir * sp * dt;
    var y = b.base + b.amp * Math.sin(Math.PI * 2 * b.freq * b.t + b.ph) + b.nAmp * noise(b.seed, b.t * 1.3);
    if (y < b.top) y = b.top + (b.top - y) * 0.3; if (y > b.bot) y = b.bot - (y - b.bot) * 0.3;
    b.y = y;
    return b.dir > 0 ? b.x > W + b.s * 2.2 : b.x < -b.s * 2.2;
  }
  function updFrog(f, dt) {
    var d = f.d;
    if (f.state === "sit") {
      f.timer -= dt;
      if (f.timer <= 0) {
        var back = Math.random() < d.back, L = f.len * (1 + d.hopVar * rnd(-1, 1)) * (back ? -0.45 : 1);
        f.hop = { x0: f.x, x1: f.x + f.dir * L, p: 0, dur: rnd(0.38, 0.5) * (1 + d.hopVar * 0.3 * rnd(-1, 1)), h: f.s * rnd(1.6, 2.6) * (1 + d.hopVar * rnd(-0.5, 0.7)) };
        f.state = "hop";
      }
    } else {
      var hp = f.hop; hp.p += dt / hp.dur;
      if (hp.p >= 1) { f.x = hp.x1; f.y = f.gy; f.state = "sit"; f.timer = rnd(d.pause[0], d.pause[1]) / prog(); }
      else { f.x = lerp(hp.x0, hp.x1, hp.p); f.y = f.gy - hp.h * 4 * hp.p * (1 - hp.p); }
    }
    return f.dir > 0 ? f.x > W + f.s * 2 : f.x < -f.s * 2;
  }

  function ell(x, cx, cy, rx, ry, rot) { x.beginPath(); x.ellipse(cx, cy, rx, ry, rot || 0, 0, Math.PI * 2); }
  function drawBird(x, b, rot) {
    var s = b.s, fl = Math.sin(b.t * b.flap), c = b.col;
    x.save(); x.translate(b.x, b.y); x.scale(b.dir, 1); if (rot) x.rotate(rot);
    x.lineWidth = Math.max(1.5, s * 0.09); x.strokeStyle = INK; x.lineJoin = "round";
    x.fillStyle = c.wing; x.beginPath(); x.moveTo(-s * 0.85, -s * 0.05); x.lineTo(-s * 1.5, -s * 0.42); x.lineTo(-s * 1.42, s * 0.22); x.closePath(); x.fill(); x.stroke();
    x.fillStyle = c.body; ell(x, 0, 0, s, s * 0.62); x.fill(); x.stroke();
    x.fillStyle = c.belly; ell(x, s * 0.12, s * 0.2, s * 0.62, s * 0.3); x.fill();
    x.fillStyle = c.body; x.beginPath(); x.arc(s * 0.78, -s * 0.3, s * 0.44, 0, Math.PI * 2); x.fill(); x.stroke();
    x.fillStyle = "#F4A23A"; x.beginPath(); x.moveTo(s * 1.14, -s * 0.42); x.lineTo(s * 1.62, -s * 0.27); x.lineTo(s * 1.14, -s * 0.12); x.closePath(); x.fill(); x.stroke();
    x.fillStyle = "#fff"; x.beginPath(); x.arc(s * 0.9, -s * 0.4, s * 0.15, 0, Math.PI * 2); x.fill(); x.lineWidth = Math.max(1, s * 0.05); x.stroke();
    x.fillStyle = INK; x.beginPath(); x.arc(s * 0.95, -s * 0.4, s * 0.07, 0, Math.PI * 2); x.fill();
    x.lineWidth = Math.max(1.5, s * 0.09);
    x.save(); x.translate(-s * 0.05, -s * 0.12); x.rotate(-0.25 - fl * 0.85);
    x.fillStyle = c.wing; ell(x, -s * 0.42, 0, s * 0.6, s * 0.24); x.fill(); x.stroke(); x.restore();
    x.restore();
  }
  function drawFrog(x, f, rot, alpha) {
    var s = f.s, hopping = f.state === "hop";
    if (!rot) { x.fillStyle = "rgba(0,0,0,.18)"; var sh = hopping ? 1 - 0.5 * Math.sin(Math.PI * f.hop.p) : 1; ell(x, f.x, f.gy + s * 0.05, s * 0.9 * sh, s * 0.18 * sh); x.fill(); }
    x.save(); x.translate(f.x, f.y); x.scale(f.dir, 1);
    if (rot) { x.translate(0, -s * 0.5); x.rotate(rot); x.translate(0, s * 0.5); }
    else if (hopping) { x.rotate(-0.35 * Math.cos(Math.PI * f.hop.p)); }
    if (alpha !== undefined) x.globalAlpha = alpha;
    x.lineWidth = Math.max(1.5, s * 0.09); x.strokeStyle = INK; x.lineJoin = "round";
    var G1 = "#5DBB4A", G2 = "#3E9234";
    x.fillStyle = G2;
    if (hopping || rot) { ell(x, -s * 0.95, -s * 0.15, s * 0.62, s * 0.17, -0.35); x.fill(); x.stroke(); ell(x, -s * 1.5, s * 0.05, s * 0.3, s * 0.1, 0.2); x.fill(); x.stroke(); }
    else { ell(x, -s * 0.5, -s * 0.28, s * 0.45, s * 0.32, -0.2); x.fill(); x.stroke(); ell(x, -s * 0.25, -s * 0.02, s * 0.45, s * 0.11); x.fill(); x.stroke(); }
    x.fillStyle = G1; ell(x, 0, -s * 0.5, s * 0.85, s * 0.55); x.fill(); x.stroke();
    x.fillStyle = "#CDE98C"; ell(x, s * 0.28, -s * 0.34, s * 0.46, s * 0.28); x.fill();
    x.fillStyle = G2; ell(x, s * 0.6, -s * 0.06, s * 0.14, s * 0.12); x.fill(); x.stroke();
    [[s * 0.3, -s * 1.0, s * 0.25], [s * 0.74, -s * 0.94, s * 0.23]].forEach(function (e) {
      x.fillStyle = G1; x.beginPath(); x.arc(e[0], e[1], e[2], 0, Math.PI * 2); x.fill(); x.stroke();
      x.fillStyle = "#fff"; x.beginPath(); x.arc(e[0], e[1], e[2] * 0.62, 0, Math.PI * 2); x.fill();
      x.fillStyle = INK; x.beginPath(); x.arc(e[0] + e[2] * 0.15, e[1], e[2] * 0.3, 0, Math.PI * 2); x.fill();
    });
    x.beginPath(); x.lineWidth = Math.max(1, s * 0.06); x.arc(s * 0.55, -s * 0.58, s * 0.3, 0.25, 1.2); x.stroke();
    x.restore(); x.globalAlpha = 1;
  }

  // ---------- Effekte ----------
  function killBird(b) {
    for (var i = 0; i < 7; i++) fx.push({ k: "puff", x: b.x + rnd(-0.5, 0.5) * b.s, y: b.y + rnd(-0.4, 0.4) * b.s, r: b.s * rnd(0.3, 0.55), life: 0, max: rnd(0.28, 0.42) });
    for (var j = 0; j < 10; j++) {
      var a = Math.random() * Math.PI * 2, v = rnd(60, 190) * unit();
      fx.push({ k: "feather", x: b.x, y: b.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, rot: Math.random() * 6, vr: rnd(-6, 6), sz: b.s * rnd(0.22, 0.36),
        col: j % 3 === 0 ? b.col.belly : j % 3 === 1 ? b.col.wing : b.col.body, life: 0, max: rnd(1.1, 1.8), sw: Math.random() * 6 });
    }
  }
  function killFrog(f, hx, hy) {
    fx.push({ k: "corpse", f: { x: f.x, y: f.y, gy: f.gy, s: f.s, dir: f.dir, state: "sit", hop: null }, vx: -f.dir * rnd(80, 160) * unit(), vy: -rnd(380, 480) * unit(), rot: 0, vr: rnd(9, 14) * (Math.random() < 0.5 ? -1 : 1), life: 0, max: 1.1 });
    fx.push({ k: "ring", x: hx, y: hy, r: f.s * 0.3, life: 0, max: 0.45 });
    for (var i = 0; i < 14; i++) {
      var a = -Math.PI / 2 + rnd(-1.2, 1.2), v = rnd(120, 300) * unit();
      fx.push({ k: "drop", x: hx, y: hy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: f.s * rnd(0.08, 0.16), life: 0, max: rnd(0.5, 0.8) });
    }
  }
  function updFx(dt) {
    var g = 900 * unit();
    fx = fx.filter(function (e) {
      e.life += dt; if (e.life >= e.max) return false;
      if (e.k === "feather") { e.vx *= Math.pow(0.12, dt); e.vy = e.vy * Math.pow(0.2, dt) + 140 * unit() * dt; e.x += (e.vx + Math.sin(e.life * 5 + e.sw) * 30 * unit()) * dt; e.y += e.vy * dt; e.rot += e.vr * dt; }
      else if (e.k === "drop") { e.vy += g * dt; e.x += e.vx * dt; e.y += e.vy * dt; }
      else if (e.k === "corpse") { e.vy += g * dt; e.f.x += e.vx * dt; e.f.y += e.vy * dt; e.rot += e.vr * dt; }
      else if (e.k === "pop") { e.y -= 40 * dt; }
      return true;
    });
  }
  function drawFx(x) {
    fx.forEach(function (e) {
      var p = e.life / e.max;
      if (e.k === "puff") { x.globalAlpha = 1 - p; x.fillStyle = "#FFFFFF"; x.beginPath(); x.arc(e.x, e.y, e.r * (1 + p * 1.6), 0, Math.PI * 2); x.fill(); }
      else if (e.k === "feather") {
        x.globalAlpha = p > 0.7 ? (1 - p) / 0.3 : 1; x.save(); x.translate(e.x, e.y); x.rotate(e.rot);
        x.fillStyle = e.col; x.strokeStyle = INK; x.lineWidth = 1.2; ell(x, 0, 0, e.sz, e.sz * 0.34); x.fill(); x.stroke();
        x.beginPath(); x.moveTo(-e.sz * 1.1, 0); x.lineTo(e.sz * 0.8, 0); x.stroke(); x.restore();
      }
      else if (e.k === "drop") { x.globalAlpha = 1 - p * p; x.fillStyle = "#58B9EC"; x.strokeStyle = "#1E5E8A"; x.lineWidth = 1; x.beginPath(); x.arc(e.x, e.y, e.r, 0, Math.PI * 2); x.fill(); x.stroke(); }
      else if (e.k === "ring") { x.globalAlpha = 1 - p; x.strokeStyle = "#BFE8FF"; x.lineWidth = 3; ell(x, e.x, e.y, e.r * (1 + p * 4), e.r * (0.4 + p * 1.4)); x.stroke(); }
      else if (e.k === "corpse") { drawFrog(x, e.f, e.rot, 1 - p * 0.6); }
      else if (e.k === "pop") {
        x.globalAlpha = 1 - p; x.font = "600 " + Math.round(20 * unit() + 6) + 'px "Instrument Sans", system-ui, sans-serif'; x.textAlign = "center";
        x.lineWidth = 4; x.strokeStyle = INK; x.strokeText(e.txt, e.x, e.y); x.fillStyle = "#FFF6C8"; x.fillText(e.txt, e.x, e.y);
      }
      x.globalAlpha = 1;
    });
  }

  // ---------- Spielablauf ----------
  function newGame() {
    G = { diff: S.diff, time: 0, score: 0, lives: 3, shots: 0, hits: 0, next: 0.6, flash: [], newBest: false };
    ent = []; fx = [];
  }
  function spawnTick(dt) {
    var d = G ? DIFF[G.diff] : DIFF[0];
    if (!G) { // Vorführmodus im Menü
      AT.next -= dt; if (AT.next <= 0) { AT.next = rnd(1.4, 2.6); if (ent.length < 6) (Math.random() < 0.6 ? spawnBird : spawnFrog)(); }
      return;
    }
    G.next -= dt;
    if (G.next <= 0) {
      var iv = Math.max(d.min, d.base / (1 + G.time / 45));
      G.next = iv * rnd(0.75, 1.25);
      var n = 1 + (Math.random() < Math.min(0.45, G.time / 200) ? 1 : 0);
      for (var i = 0; i < n; i++) (Math.random() < 0.62 ? spawnBird : spawnFrog)();
    }
  }
  var AT = { next: 0.3 };
  function escaped(e) {
    if (!G || S.state !== "play") return;
    G.lives--; G.flash.push({ side: e.dir > 0 ? 1 : -1, y: e.y, life: 0 }); SND.escape();
    if (G.lives <= 0) gameOver();
  }
  function gameOver() {
    S.state = "over"; SND.over();
    if (G.score > best[G.diff]) { best[G.diff] = G.score; G.newBest = true; save(); }
    if (document.pointerLockElement) document.exitPointerLock();
    showMenu();
  }
  function shoot() {
    if (S.state !== "play") return;
    G.shots++; aim.kick = 1; SND.shot();
    for (var i = ent.length - 1; i >= 0; i--) {
      var e = ent[i], dx = aim.x - e.x, dy, hit;
      if (e.type === "bird") { dy = aim.y - e.y; hit = (dx * e.dir - e.s * 0.25) * (dx * e.dir - e.s * 0.25) / (e.s * e.s * 1.6) + dy * dy / (e.s * e.s * 0.75) <= 1; }
      else { dy = aim.y - (e.y - e.s * 0.6); hit = dx * dx + dy * dy <= e.s * e.s * 1.25; }
      if (hit) {
        ent.splice(i, 1); G.hits++;
        var pts = Math.round((e.type === "bird" ? 10 : 15) * DIFF[G.diff].mult);
        G.score += pts; fx.push({ k: "pop", txt: "+" + pts, x: e.x, y: e.y - e.s * 1.2, life: 0, max: 0.8 });
        if (e.type === "bird") { killBird(e); SND.bird(); } else { killFrog(e, aim.x, aim.y); SND.frog(); }
        return;
      }
    }
  }

  // ---------- Zeichnen ----------
  var cv = null, ctx = null, tint = null, last = 0, raf = 0;
  function resize() {
    if (!R) return;
    var ow = W, oh = H;
    W = R.root.clientWidth; H = R.root.clientHeight; dpr = Math.min(2, window.devicePixelRatio || 1);
    horizon = Math.round(H * 0.64);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    tint = tint || document.createElement("canvas"); tint.width = cv.width; tint.height = cv.height;
    if (ow && oh && (ow !== W || oh !== H)) {
      var fx0 = W / ow, fy = H / oh;
      ent.forEach(function (e) { e.x *= fx0; e.y *= fy; if (e.base) { e.base *= fy; e.top *= fy; e.bot *= fy; e.amp *= fy; e.nAmp *= fy; } if (e.gy) e.gy *= fy; if (e.hop) { e.hop.x0 *= fx0; e.hop.x1 *= fx0; } });
      aim.x *= fx0; aim.y *= fy;
    }
    cacheKey = "";
  }
  function frame(ts) {
    raf = requestAnimationFrame(frame);
    if (!R) return;
    var dt = Math.min(0.05, last ? (ts - last) / 1000 : 0); last = ts;
    var run = S.state !== "pause";
    makeStatic();
    if (run) {
      if (G && S.state === "play") G.time += dt;
      spawnTick(S.state === "play" ? dt : (G ? 0 : dt));
      ent = ent.filter(function (e) { var out = e.type === "bird" ? updBird(e, dt) : updFrog(e, dt); if (out) escaped(e); return !out; });
      updFx(dt);
      if (G) G.flash = G.flash.filter(function (f) { f.life += dt; return f.life < 0.9; });
    }
    aim.kick = Math.max(0, aim.kick - dt * 9);
    var x = ctx; x.setTransform(1, 0, 0, 1, 0, 0);
    x.drawImage(skyC, 0, 0); x.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawClouds(x, run ? dt : 0);
    x.setTransform(1, 0, 0, 1, 0, 0); x.drawImage(groundC, 0, 0);
    // Tiere und Effekte auf eigener Ebene, damit sie mit der Tageszeit eingefärbt werden
    var y = tint.getContext("2d"); y.setTransform(1, 0, 0, 1, 0, 0); y.clearRect(0, 0, tint.width, tint.height); y.setTransform(dpr, 0, 0, dpr, 0, 0);
    ent.slice().sort(function (a, b) { return (a.type === "frog" ? a.gy : 0) - (b.type === "frog" ? b.gy : 0); }).forEach(function (e) { if (e.type === "bird") drawBird(y, e); else drawFrog(y, e); });
    drawFx(y);
    if (P.night > 0.02 || P.warm > 0.02) {
      y.globalCompositeOperation = "source-atop";
      if (P.night > 0.02) { y.fillStyle = "rgba(16,24,64," + (0.55 * P.night).toFixed(3) + ")"; y.fillRect(0, 0, W, H); }
      if (P.warm > 0.02) { y.fillStyle = "rgba(255,130,60," + (0.14 * P.warm).toFixed(3) + ")"; y.fillRect(0, 0, W, H); }
      y.globalCompositeOperation = "source-over";
    }
    x.drawImage(tint, 0, 0);
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (G && (S.state === "play" || S.state === "pause")) hud(x);
    if (S.state === "play" && aim.vis) crosshair(x);
  }
  function heart(x, cx, cy, r, full) {
    x.beginPath(); x.moveTo(cx, cy + r * 0.9);
    x.bezierCurveTo(cx - r * 1.4, cy - r * 0.1, cx - r * 0.7, cy - r * 1.1, cx, cy - r * 0.35);
    x.bezierCurveTo(cx + r * 0.7, cy - r * 1.1, cx + r * 1.4, cy - r * 0.1, cx, cy + r * 0.9);
    x.fillStyle = full ? "#F0525A" : "rgba(255,255,255,.25)"; x.fill(); x.lineWidth = 2; x.strokeStyle = INK; x.stroke();
  }
  function hud(x) {
    var u = unit(), pad = 18, fs = Math.round(30 * u + 8);
    x.font = "600 " + fs + 'px "Instrument Sans", system-ui, sans-serif'; x.textAlign = "left"; x.textBaseline = "top"; x.lineJoin = "round";
    x.lineWidth = 5; x.strokeStyle = INK; x.strokeText(String(G.score), pad, pad); x.fillStyle = "#FFFFFF"; x.fillText(String(G.score), pad, pad);
    x.font = "600 " + Math.round(fs * 0.45) + 'px "Instrument Sans", system-ui, sans-serif';
    var bs = t("best") + " " + Math.max(best[G.diff], G.score) + " · " + t("d" + G.diff);
    x.lineWidth = 3.5; x.strokeText(bs, pad, pad + fs * 1.08); x.fillStyle = "#FFF6C8"; x.fillText(bs, pad, pad + fs * 1.08);
    for (var i = 0; i < 3; i++) heart(x, W - pad - 14 - i * 34, pad + 16, 12, i < G.lives);
    G.flash.forEach(function (f) {
      var a = 1 - f.life / 0.9, gx = f.side > 0 ? W : 0, gr = x.createLinearGradient(gx, 0, gx - f.side * W * 0.12, 0);
      gr.addColorStop(0, "rgba(240,82,90," + (0.5 * a).toFixed(3) + ")"); gr.addColorStop(1, "rgba(240,82,90,0)");
      x.fillStyle = gr; x.fillRect(f.side > 0 ? W - W * 0.12 : 0, 0, W * 0.12, H);
    });
    x.textBaseline = "alphabetic";
  }
  function crosshair(x) {
    var cx = Math.round(aim.x) + 0.5, cy = Math.round(aim.y) + 0.5, gap = 5 + aim.kick * 5, len = 8;
    function lines() { x.beginPath(); x.moveTo(cx - gap - len, cy); x.lineTo(cx - gap, cy); x.moveTo(cx + gap, cy); x.lineTo(cx + gap + len, cy); x.moveTo(cx, cy - gap - len); x.lineTo(cx, cy - gap); x.moveTo(cx, cy + gap); x.lineTo(cx, cy + gap + len); x.stroke(); }
    x.lineCap = "butt"; x.strokeStyle = "rgba(15,20,24,.55)"; x.lineWidth = 3; lines();
    x.strokeStyle = "#FFFFFF"; x.lineWidth = 1.25; lines();
    x.fillStyle = "rgba(15,20,24,.55)"; x.fillRect(cx - 1.5, cy - 1.5, 3, 3); x.fillStyle = "#fff"; x.fillRect(cx - 0.75, cy - 0.75, 1.5, 1.5);
  }

  // ---------- Menü ----------
  function hh(h) { var m = Math.round(h * 60) % 1440; return ("0" + Math.floor(m / 60)).slice(-2) + ":" + ("0" + (m % 60)).slice(-2); }
  var CSS = ".na-root{position:fixed;inset:0;z-index:80;overflow:hidden;background:#3A8BDD;touch-action:none;user-select:none;-webkit-user-select:none}" +
    ".na-root canvas{position:absolute;inset:0;width:100%;height:100%;display:block}" +
    ".na-root.play{cursor:none}" +
    ".na-menu{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(440px,calc(100% - 32px));max-height:calc(100% - 32px);overflow:auto;box-sizing:border-box;" +
      "background:rgba(17,21,25,.84);color:#F3F1EA;padding:22px 24px;display:flex;flex-direction:column;gap:14px;font-family:var(--f-body,system-ui,sans-serif)}" +
    ".na-menu h1{font:600 2rem/1.05 var(--f-display,system-ui,sans-serif);letter-spacing:-.02em;margin:0}" +
    ".na-menu h1 span{display:inline-block;margin-left:8px;padding:1px 7px;border:1px solid rgba(243,241,234,.35);font-size:.75rem;font-weight:600;vertical-align:middle;letter-spacing:0}" +
    ".na-menu p{margin:0;color:rgba(243,241,234,.78);font-size:.92rem;line-height:1.45}" +
    ".na-menu .na-big{font:600 1.6rem/1.2 var(--f-display,system-ui,sans-serif);margin:0;color:#F3F1EA}" +
    ".na-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.na-stats div{border:1px solid rgba(243,241,234,.2);padding:8px 10px}" +
    ".na-stats b{display:block;font-size:1.2rem;font-variant-numeric:tabular-nums}.na-stats small{color:rgba(243,241,234,.65);font-size:.75rem}" +
    ".na-row{display:flex;flex-direction:column;gap:6px}.na-row label{display:flex;justify-content:space-between;font-weight:600;font-size:.9rem}" +
    ".na-row label span{color:rgba(243,241,234,.7);font-weight:500;font-variant-numeric:tabular-nums}.na-row input{width:100%;accent-color:#F2B33D;margin:0}" +
    ".na-ticks{display:flex;justify-content:space-between;font-size:.75rem;color:rgba(243,241,234,.6)}" +
    ".na-btns{display:flex;flex-wrap:wrap;gap:8px}" +
    ".na-btn{font:600 .9rem var(--f-body,system-ui,sans-serif);padding:9px 14px;border:1px solid rgba(243,241,234,.45);background:transparent;color:#F3F1EA;cursor:pointer;border-radius:0}" +
    ".na-btn[aria-pressed=true]{background:#F3F1EA;color:#111519}" +
    ".na-go{font:600 1.1rem var(--f-body,system-ui,sans-serif);padding:13px 18px;border:0;background:#F2B33D;color:#1B1A14;cursor:pointer;border-radius:0;flex:1}" +
    ".na-back{color:#F3F1EA;font-weight:600;text-decoration:none;font-size:.9rem}.na-back:hover{text-decoration:underline}" +
    ".na-best{display:flex;gap:14px;font-size:.85rem;color:rgba(243,241,234,.75);font-variant-numeric:tabular-nums}.na-best b{color:#F3F1EA}" +
    ".na-menu .na-new{color:#F2B33D;font-weight:600}" +
    ".na-pause{position:absolute;top:calc(14px + env(safe-area-inset-top,0px));left:50%;transform:translateX(-50%);font:600 .85rem var(--f-body,system-ui,sans-serif);padding:7px 14px;border:0;background:rgba(17,21,25,.55);color:#F3F1EA;cursor:pointer;border-radius:0}" +
    ".na-menu[hidden],.na-pause[hidden]{display:none}" +
    "@media (pointer:fine){.na-pause{display:none}}";
  function menuHTML() {
    var st = S.state;
    var head = st === "over" ? '<p class="na-big">' + t("over") + "</p>" + (G.newBest ? '<p class="na-new">' + t("newBest") + "</p>" : "") +
      '<div class="na-stats"><div><b>' + G.score + "</b><small>" + t("score") + "</small></div><div><b>" + (G.shots ? Math.round(G.hits / G.shots * 100) : 0) + " %</b><small>" + t("acc") + "</small></div><div><b>" + Math.floor(G.time) + " s</b><small>" + t("lasted") + "</small></div></div>"
      : st === "pause" ? '<p class="na-big">' + t("paused") + '</p><div class="na-stats"><div><b>' + G.score + "</b><small>" + t("score") + "</small></div><div><b>" + G.hits + "</b><small>" + t("hits") + "</small></div><div><b>" + G.lives + " / 3</b><small>♥</small></div></div>"
      : '<p>' + t("intro") + "</p>";
    var go = st === "pause" ? '<button type="button" class="na-go" data-na="resume">' + t("resume") + '</button><button type="button" class="na-btn" data-na="start">' + t("restart") + "</button>"
      : '<button type="button" class="na-go" data-na="start">' + (st === "over" ? t("again") : t("start")) + "</button>";
    return '<h1>' + t("title") + "<span>v" + VERSION + "</span></h1>" + head +
      '<div class="na-row"><label for="na-time">' + t("time") + '<span id="na-time-v">' + hh(S.hour) + '</span></label><input type="range" id="na-time" min="0" max="24" step="0.05" value="' + S.hour + '"></div>' +
      '<div class="na-row"><label for="na-diff">' + t("diff") + '<span id="na-diff-v">' + t("d" + S.diff) + '</span></label><input type="range" id="na-diff" min="0" max="2" step="1" value="' + S.diff + '"><div class="na-ticks"><span>' + t("d0") + "</span><span>" + t("d1") + "</span><span>" + t("d2") + "</span></div>" +
        (st === "pause" ? '<p id="na-dnote" hidden>' + t("dNote") + "</p>" : "") + "</div>" +
      '<div class="na-row"><label for="na-sens">' + t("sens") + '<span id="na-sens-v">' + num(S.sens, 2) + ' ×</span></label><input type="range" id="na-sens" min="0.2" max="3" step="0.05" value="' + S.sens + '"></div>' +
      '<div class="na-btns"><button type="button" class="na-btn" data-na="sound" aria-pressed="' + S.sound + '">' + t("sound") + ": " + (S.sound ? t("on") : t("off")) + '</button>' +
        (document.fullscreenEnabled ? '<button type="button" class="na-btn" data-na="full" aria-pressed="' + !!document.fullscreenElement + '">' + t("full") + "</button>" : "") + "</div>" +
      '<div class="na-btns">' + go + "</div>" +
      '<div class="na-best"><span>' + t("bests") + ":</span>" + [0, 1, 2].map(function (i) { return "<span>" + t("d" + i) + " <b>" + best[i] + "</b></span>"; }).join("") + "</div>" +
      '<p>' + (matchMedia("(pointer:fine)").matches ? t("help") : t("touchHelp")) + "</p>" +
      '<a class="na-back" href="#">' + t("back") + "</a>";
  }
  function showMenu() {
    R.menu.innerHTML = menuHTML(); R.menu.hidden = false; R.pb.hidden = true; R.root.classList.remove("play");
  }
  function hideMenu() { R.menu.hidden = true; R.pb.hidden = false; R.root.classList.add("play"); }
  function lockPointer() {
    if (!matchMedia("(pointer:fine)").matches || !cv.requestPointerLock) return;
    try { var p = cv.requestPointerLock(); if (p && p.catch) p.catch(function () {}); } catch (e) {}
  }
  function startGame() { newGame(); S.state = "play"; aim.x = W / 2; aim.y = horizon * 0.6; aim.vis = true; hideMenu(); lockPointer(); audio(); }
  function resume() { S.state = "play"; last = 0; hideMenu(); lockPointer(); }
  function pause() { if (S.state !== "play") return; S.state = "pause"; showMenu(); if (document.pointerLockElement) document.exitPointerLock(); }

  // ---------- Eingabe ----------
  function onDown(e) {
    if (S.state !== "play" || e.target !== cv) return;
    if (e.button && e.button > 0) return;
    e.preventDefault();
    if (!locked) { var r = R.root.getBoundingClientRect(); aim.x = e.clientX - r.left; aim.y = e.clientY - r.top; aim.vis = true; }
    shoot();
  }
  function onMove(e) {
    if (!R) return;
    if (locked) { aim.x = clamp(aim.x + e.movementX * S.sens, 0, W); aim.y = clamp(aim.y + e.movementY * S.sens, 0, H); aim.vis = true; return; }
    if (e.pointerType && e.pointerType !== "mouse") return;
    var r = R.root.getBoundingClientRect(); aim.x = e.clientX - r.left; aim.y = e.clientY - r.top; aim.vis = true;
  }
  function onLeave() { if (!locked) aim.vis = false; }
  function onLock() {
    locked = document.pointerLockElement === cv;
    if (!locked && S.state === "play") pause();
  }
  function onKey(e) {
    if (!R) return;
    if ((e.key === "Escape" || e.key === "p" || e.key === "P") && S.state === "play") { e.preventDefault(); pause(); }
    else if (e.key === "Enter" && S.state !== "play" && e.target.tagName !== "BUTTON") { e.preventDefault(); if (S.state === "pause") resume(); else startGame(); }
  }
  function onVis() { if (document.hidden) pause(); }
  function onInput(e) {
    var id = e.target.id, v = +e.target.value;
    if (id === "na-time") { S.hour = v; R.menu.querySelector("#na-time-v").textContent = hh(v); }
    else if (id === "na-diff") { S.diff = v; R.menu.querySelector("#na-diff-v").textContent = t("d" + v); var n = R.menu.querySelector("#na-dnote"); if (n) n.hidden = !G || v === G.diff; }
    else if (id === "na-sens") { S.sens = v; R.menu.querySelector("#na-sens-v").textContent = num(v, 2) + " ×"; }
  }
  function onChange() { save(); }
  function onClick(e) {
    var b = e.target.closest("[data-na]"); if (!b) return;
    var a = b.getAttribute("data-na");
    if (a === "start") startGame();
    else if (a === "resume") resume();
    else if (a === "pause") pause();
    else if (a === "sound") { S.sound = !S.sound; save(); b.setAttribute("aria-pressed", String(S.sound)); b.textContent = t("sound") + ": " + (S.sound ? t("on") : t("off")); if (S.sound) audio(); }
    else if (a === "full") { if (document.fullscreenElement) document.exitFullscreen(); else R.root.requestFullscreen().catch(function () {}); }
  }
  function onFull() { if (!R) return; var b = R.menu.querySelector('[data-na="full"]'); if (b) b.setAttribute("aria-pressed", String(!!document.fullscreenElement)); setTimeout(resize, 60); }
  var rsT = 0;
  function onResize() { clearTimeout(rsT); rsT = setTimeout(resize, 80); }

  function mount(el, l) {
    unmount();
    lang = l === "en" ? "en" : "de";
    load();
    var o = document.getElementById("na-css"); if (o) o.remove();
    var s = document.createElement("style"); s.id = "na-css"; s.textContent = CSS; document.head.appendChild(s);
    var root = document.createElement("div"); root.className = "na-root";
    root.innerHTML = '<canvas aria-label="No Aim No Game"></canvas><div class="na-menu" role="dialog" aria-label="No Aim No Game"></div><button type="button" class="na-pause" data-na="pause" hidden>' + t("pauseBtn") + "</button>";
    document.body.appendChild(root);
    R = { root: root, el: el, menu: root.querySelector(".na-menu"), pb: root.querySelector(".na-pause"), ov: document.body.style.overflow };
    document.body.style.overflow = "hidden";
    cv = root.querySelector("canvas"); ctx = cv.getContext("2d");
    S.state = "menu"; G = null; ent = []; fx = []; W = 0; H = 0; AT.next = 0.3;
    seedScene(); resize(); showMenu();
    root.addEventListener("pointerdown", onDown); window.addEventListener("pointermove", onMove); root.addEventListener("pointerleave", onLeave);
    root.addEventListener("click", onClick); root.addEventListener("input", onInput); root.addEventListener("change", onChange);
    document.addEventListener("pointerlockchange", onLock); document.addEventListener("fullscreenchange", onFull);
    document.addEventListener("visibilitychange", onVis); window.addEventListener("keydown", onKey); window.addEventListener("resize", onResize);
    root.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    last = 0; raf = requestAnimationFrame(frame);
  }
  function unmount() {
    if (raf) cancelAnimationFrame(raf); raf = 0;
    if (!R) return;
    if (document.pointerLockElement) document.exitPointerLock();
    if (document.fullscreenElement === R.root) document.exitFullscreen().catch(function () {});
    window.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerlockchange", onLock); document.removeEventListener("fullscreenchange", onFull);
    document.removeEventListener("visibilitychange", onVis); window.removeEventListener("keydown", onKey); window.removeEventListener("resize", onResize);
    document.body.style.overflow = R.ov || "";
    R.root.remove(); R = null; G = null; locked = false; save();
  }

  window.NoAim = { mount: mount, unmount: unmount, _debug: function () { return { S: S, G: G, ent: ent, fx: fx, aim: aim, shoot: shoot, startGame: startGame, spawnBird: spawnBird, spawnFrog: spawnFrog }; } };
})();
