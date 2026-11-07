/* No Aim No Game 0.2 – Aimtrainer mit Vögeln und Fröschen auf einer Wiese. Für Color Space.
   Einbindung: noaim.js per script-Tag laden, dann NoAim.mount(element, "de" | "en") und NoAim.unmount().
   Das Spiel legt sich über die ganze Seite. Highscores liegen nur lokal im Browser (localStorage "noaim-v1"). */
(function () {
  "use strict";

  var VERSION = "0.2", KEY = "noaim-v1";
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
  // Jede Stütze ist ein Moment des Tages. Dazwischen wird weich überblendet.
  var KEYS = ["top", "mid", "bot", "sun", "cloud", "csh", "mtn", "hill", "tree", "mTop", "mBot", "b0", "b1", "b2"];
  function K(h, night, warm, c) { var o = { h: h, night: night, warm: warm }; KEYS.forEach(function (k, i) { o[k] = c[i]; }); return o; }
  var NIGHT = ["#0A1030", "#16204A", "#2A3566", "#FFE7A8", "#3A4672", "#232C52", "#2A3560", "#1A2B3A", "#12202A", "#1E3A34", "#0F2219", "#0E2418", "#183626", "#2E5646"];
  var PAL = [
    K(0, 1, 0, NIGHT),
    K(4.6, 0.8, 0.25, ["#121A46", "#2A2E62", "#5A4A7E", "#FF9A5C", "#5A5584", "#3A3A68", "#3E4272", "#23334A", "#18283A", "#2A4A40", "#142A20", "#16301F", "#22442E", "#3A6448"]),
    K(5.8, 0.35, 1, ["#34488E", "#8A6AA8", "#F6A88A", "#FF9A5C", "#FFC7B0", "#B07A9E", "#7A6E9E", "#4E6A6A", "#34504A", "#5E8A5A", "#2E5A34", "#2A5030", "#4A7A44", "#9AB46E"]),
    K(6.8, 0.05, 0.55, ["#4A86D0", "#9CC6E8", "#FFDDB0", "#FFC46A", "#FFF1E0", "#C2B4CC", "#8EA4C8", "#6E9A6A", "#4A7452", "#86BE66", "#4E8C3E", "#3E7434", "#6AA84C", "#C2DE80"]),
    K(9, 0, 0, ["#3D8FE0", "#8CC8F0", "#D8F0FA", "#FFF2B0", "#FFFFFF", "#B8CCE6", "#9CB8D8", "#78AE6A", "#4E8456", "#90CE6A", "#50963C", "#3E7E32", "#6CB24A", "#BCE47E"]),
    K(12, 0, 0, ["#2F86DE", "#7EC2F2", "#D2EEFC", "#FFF6C4", "#FFFFFF", "#AEC6E8", "#98B6DA", "#7AB46A", "#4E8A56", "#94D26C", "#52983C", "#3E8032", "#6EB64A", "#C2E884"]),
    K(15.5, 0, 0.15, ["#3A88D8", "#8EC4EC", "#E2F0F0", "#FFE69A", "#FFFBF2", "#B8C4DE", "#9CB4D2", "#7AAE66", "#4E8452", "#94CC66", "#529438", "#407C30", "#70B048", "#CCE47E"]),
    K(17.3, 0, 0.8, ["#4878C4", "#A8B8D8", "#FFD49A", "#FFB04A", "#FFE2BE", "#C49AA8", "#A096B4", "#7A9858", "#52703E", "#A8C45A", "#5E8A34", "#5A8030", "#94B44A", "#F0DA82"]),
    K(18.3, 0.2, 1, ["#3E4E94", "#B07A9E", "#FF9A5A", "#FF6A3A", "#FFAE8A", "#9A5E86", "#6E5E8A", "#4C5E4A", "#34442E", "#7A8A44", "#3E5A2A", "#3A5228", "#6A7A3A", "#E0A060"]),
    K(19.2, 0.55, 0.5, ["#262E66", "#5A4880", "#C8708A", "#FF5A4A", "#8A6A98", "#4E3E72", "#3E3A66", "#2C3644", "#1E2830", "#3A4A3A", "#1E2E22", "#1E3024", "#2E4434", "#6A7064"]),
    K(20.3, 0.85, 0, ["#10183E", "#1E2C5E", "#3A4C86", "#FFE7A8", "#3E4A7C", "#283460", "#2A3666", "#1C2C3E", "#142230", "#22403A", "#11251C", "#12281C", "#1C3A2A", "#345A4C"]),
    K(24, 1, 0, NIGHT)
  ];
  function hx(c) { return [parseInt(c.substr(1, 2), 16), parseInt(c.substr(3, 2), 16), parseInt(c.substr(5, 2), 16)]; }
  function toHex(a) { return "#" + a.map(function (v) { return ("0" + Math.round(clamp(v, 0, 255)).toString(16)).slice(-2); }).join(""); }
  function mix(a, b, f) { var x = hx(a), y = hx(b); return toHex([lerp(x[0], y[0], f), lerp(x[1], y[1], f), lerp(x[2], y[2], f)]); }
  function rgba(c, a) { var x = hx(c); return "rgba(" + x[0] + "," + x[1] + "," + x[2] + "," + a.toFixed(3) + ")"; }
  function palette(h) {
    var i = 0; while (i < PAL.length - 2 && PAL[i + 1].h <= h) i++;
    var a = PAL[i], b = PAL[i + 1], f = clamp((h - a.h) / (b.h - a.h), 0, 1); f = f * f * (3 - 2 * f);
    var o = { night: lerp(a.night, b.night, f), warm: lerp(a.warm, b.warm, f) };
    KEYS.forEach(function (k) { o[k] = mix(a[k], b[k], f); });
    o.sunH = Math.sin(Math.PI * (h - 6) / 12);
    return o;
  }

  // ---------- Szene ----------
  var skyC = null, bgC = null, cacheKey = "", P = null, stars = [], clouds = [], towers = [], trees = [], blobs = [], blades = [], flowers = [], motes = [];
  var plane = { on: false, next: 4, x: 0, y: 0, dir: 1, t: 0, s: 1, banner: null };
  var wind = { t: 0 }, moonC = null;
  function canvas(w, h) { var c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; }
  function sunPos() { var R0 = Math.min(W, H) * 0.055; return { x: W / 2, y: horizon - P.sunH * horizon * 0.8, r: R0 * (1 + 0.3 * clamp(1 - P.sunH * 2, 0, 1)) }; }

  // Wolke im Anime-Stil: Schattenseite unten, beleuchtete Kuppen oben, helle Kanten zur Sonne.
  function cloudSprite(c, size) {
    var minX = 0, maxX = 0, minY = 0;
    c.parts.forEach(function (p) { minX = Math.min(minX, p.x - p.r); maxX = Math.max(maxX, p.x + p.r); minY = Math.min(minY, p.y - p.r * 1.2); });
    var pad = 0.2, ox = size * (-minX + pad), oy = size * (-minY + pad), cw = size * (maxX - minX + pad * 2), ch = oy + size * 0.1;
    var k = canvas(cw * dpr, ch * dpr), x = k.getContext("2d");
    x.scale(dpr, dpr); x.translate(ox, oy);
    x.save(); x.beginPath(); x.rect(-cw, -ch * 2, cw * 2, ch * 2 - size * 0.02); x.clip();
    function blob(dy, rs, col, sel) {
      x.fillStyle = col; x.beginPath();
      c.parts.forEach(function (p) { if (sel && !sel(p)) return; x.moveTo(p.x * size + p.r * size * rs, p.y * size + dy * p.r * size); x.arc(p.x * size, p.y * size + dy * p.r * size, p.r * size * rs, 0, Math.PI * 2); });
      x.fill();
    }
    blob(0, 1, P.csh);
    blob(-0.16, 0.9, P.cloud);
    var hl = mix(P.cloud, P.warm > 0.3 ? P.sun : "#FFFFFF", 0.35 + 0.3 * P.warm);
    x.globalAlpha = 0.85; blob(-0.32, 0.6, hl, function (p) { return p.y < -c.h * 0.35; }); x.globalAlpha = 1;
    x.restore();
    return { img: k, w: cw, h: ch, ox: ox, oy: oy };
  }
  function cloudShape(big) {
    var n = big ? 9 : 5 + Math.floor(Math.random() * 4), parts = [], w = big ? 3.2 : rnd(2.2, 3.4), h = big ? 2.4 : rnd(0.9, 1.4);
    for (var i = 0; i < n; i++) {
      var u = n === 1 ? 0.5 : i / (n - 1), px = (u - 0.5) * w, bump = Math.sin(u * Math.PI);
      parts.push({ x: px + rnd(-0.15, 0.15), y: -0.35 - bump * h * rnd(0.55, 0.9), r: 0.35 + bump * h * rnd(0.35, 0.55) });
    }
    if (big) for (var j = 0; j < 4; j++) parts.push({ x: rnd(-0.6, 0.6), y: -h * rnd(1.2, 1.7), r: rnd(0.45, 0.7) });
    return { parts: parts, w: w, h: h + 0.6 };
  }
  function newCloud(xf, fresh) {
    var sh = cloudShape(false);
    return { x: xf, y: rnd(0.12, 0.62), s: rnd(0.028, 0.05), v: rnd(0.006, 0.014), shape: sh, spr: null, fresh: fresh };
  }
  function seedScene() {
    stars = []; for (var i = 0; i < 160; i++) stars.push({ x: Math.random(), y: Math.random() * 0.9, r: rnd(0.5, 1.5), a: rnd(0.4, 1), tw: rnd(0.6, 2.2), ph: Math.random() * 6 });
    clouds = []; for (var k = 0; k < 8; k++) clouds.push(newCloud(Math.random() * 1.3 - 0.15));
    towers = [{ x: rnd(0.1, 0.28), s: rnd(0.04, 0.05), shape: cloudShape(true) }, { x: rnd(0.7, 0.9), s: rnd(0.035, 0.045), shape: cloudShape(true) }];
    trees = []; for (var t2 = 0; t2 < 26; t2++) trees.push({ x: Math.random(), k: rnd(0.6, 1.3), n: 2 + Math.floor(Math.random() * 3) });
    blobs = []; for (var b2 = 0; b2 < 26; b2++) blobs.push({ x: Math.random(), y: Math.random(), rx: rnd(0.08, 0.22), ry: rnd(0.04, 0.1), light: Math.random() < 0.5 });
    motes = []; for (var m = 0; m < 40; m++) motes.push({ x: Math.random(), y: Math.random(), ph: Math.random() * 10, seed: Math.random() * 100, s: rnd(0.6, 1.4) });
    plane.on = false; plane.next = 4;
  }
  function seedBlades() {
    blades = []; flowers = [];
    var n = Math.round(clamp(W * (H - horizon) / 160, 900, 3600)), u = unit();
    for (var i = 0; i < n; i++) {
      var d = Math.pow(Math.random(), 0.75);
      blades.push({ x: Math.random() * (W + 40) - 20, y: horizon + 4 + d * (H - horizon), d: d, h: lerp(5, 30, Math.pow(d, 1.25)) * u * rnd(0.7, 1.3), lean: rnd(-0.25, 0.25), ph: Math.random() * 6.3, v: Math.random() });
    }
    blades.sort(function (a, b) { return a.y - b.y; });
    var cols = ["#FFF1A6", "#FFFFFF", "#FFB3C7", "#C9B6FF", "#FFD27A"];
    for (var j = 0; j < 70; j++) { var b = blades[Math.floor(Math.random() * blades.length)]; flowers.push({ b: b, c: cols[j % cols.length], r: (1.6 + 2.6 * b.d) * u }); }
  }

  function makeStatic() {
    var key = S.hour.toFixed(2) + "|" + W + "|" + H; if (key === cacheKey) return; cacheKey = key;
    P = palette(S.hour);
    var cw = Math.round(W * dpr), ch = Math.round(H * dpr), sp = sunPos();
    skyC = skyC || canvas(1, 1); skyC.width = cw; skyC.height = ch;
    var x = skyC.getContext("2d"); x.setTransform(dpr, 0, 0, dpr, 0, 0);
    var g = x.createLinearGradient(0, 0, 0, horizon); g.addColorStop(0, P.top); g.addColorStop(0.55, P.mid); g.addColorStop(1, P.bot);
    x.fillStyle = g; x.fillRect(0, 0, W, horizon + 4);
    // Sonnenhof und Strahlen bei tiefer Sonne
    if (P.sunH > -0.2) {
      var glowR = sp.r * (5 + 4 * P.warm), gl = x.createRadialGradient(sp.x, sp.y, sp.r * 0.6, sp.x, sp.y, glowR);
      gl.addColorStop(0, rgba(P.sun, 0.75)); gl.addColorStop(0.35, rgba(P.sun, 0.22 + 0.15 * P.warm)); gl.addColorStop(1, rgba(P.sun, 0));
      x.fillStyle = gl; x.fillRect(0, 0, W, horizon + 4);
      var rays = clamp(1 - P.sunH / 0.55, 0, 1) * (P.sunH > -0.05 ? 1 : 0);
      if (rays > 0.02) {
        x.save(); x.globalCompositeOperation = "screen";
        for (var r = 0; r < 9; r++) {
          var a0 = -Math.PI + (r + 0.5) / 9 * Math.PI + rnd(-0.05, 0.05), len = W * 0.9, wdt = 0.035 + 0.02 * (r % 3);
          var rg = x.createRadialGradient(sp.x, sp.y, sp.r, sp.x, sp.y, len); rg.addColorStop(0, rgba(P.sun, 0.16 * rays)); rg.addColorStop(1, rgba(P.sun, 0));
          x.fillStyle = rg; x.beginPath(); x.moveTo(sp.x, sp.y); x.arc(sp.x, sp.y, len, a0 - wdt, a0 + wdt); x.closePath(); x.fill();
        }
        x.restore();
      }
      x.fillStyle = mix(P.sun, "#FFFFFF", 0.35); x.beginPath(); x.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2); x.fill();
      x.fillStyle = rgba("#FFFFFF", 0.5); x.beginPath(); x.arc(sp.x, sp.y, sp.r * 0.72, 0, Math.PI * 2); x.fill();
    }
    // Mond (eigene Ebene, damit die Sichel sauber ausgeschnitten ist)
    var h = S.hour, mh = h < 6 ? h + 24 : h, moonH = Math.sin(Math.PI * (mh - 18) / 12);
    if (moonH > -0.15 && P.night > 0.3) {
      var mr = sp.r * 0.75, my = horizon - moonH * horizon * 0.72, ma = clamp((P.night - 0.3) * 2, 0, 1);
      var mg = x.createRadialGradient(W / 2, my, mr, W / 2, my, mr * 6); mg.addColorStop(0, rgba("#BFD2FF", 0.25 * ma)); mg.addColorStop(1, rgba("#BFD2FF", 0));
      x.fillStyle = mg; x.fillRect(0, 0, W, horizon);
      moonC = canvas(mr * 2.4 * dpr, mr * 2.4 * dpr); var mc = moonC.getContext("2d"); mc.scale(dpr, dpr);
      mc.fillStyle = "#F7F1DC"; mc.beginPath(); mc.arc(mr * 1.2, mr * 1.2, mr, 0, Math.PI * 2); mc.fill();
      mc.globalCompositeOperation = "destination-out"; mc.beginPath(); mc.arc(mr * 1.65, mr * 1.0, mr * 0.88, 0, Math.PI * 2); mc.fill();
      x.globalAlpha = ma; x.drawImage(moonC, W / 2 - mr * 1.2, my - mr * 1.2, mr * 2.4, mr * 2.4); x.globalAlpha = 1;
    }
    // Große Quellwolken am Horizont, hinter den Bergen
    towers.forEach(function (tw) { var spr = cloudSprite(tw.shape, tw.s * W); x.drawImage(spr.img, tw.x * W - spr.ox, horizon - H * 0.05 - spr.oy, spr.w, spr.h); });
    clouds.forEach(function (c) { c.spr = null; });
    // Berge, Hügel, Bäume, Wiese
    bgC = bgC || canvas(1, 1); bgC.width = cw; bgC.height = ch;
    var y = bgC.getContext("2d"); y.setTransform(dpr, 0, 0, dpr, 0, 0); y.clearRect(0, 0, W, H);
    mountains(y, horizon - H * 0.03, H * 0.16, P.mtn, mix(P.mtn, P.bot, 0.65), 11);
    mountains(y, horizon - H * 0.01, H * 0.09, mix(P.mtn, P.hill, 0.45), mix(mix(P.mtn, P.hill, 0.45), P.bot, 0.5), 23);
    var hillTop = function (u) { return horizon - H * 0.035 * (0.6 + 0.5 * Math.sin(u * 7.1 + 0.4) + 0.3 * Math.sin(u * 15.3 + 1.7)); };
    var hg = y.createLinearGradient(0, horizon - H * 0.07, 0, horizon + 4); hg.addColorStop(0, P.hill); hg.addColorStop(1, mix(P.hill, P.mTop, 0.6));
    y.fillStyle = hg; y.beginPath(); y.moveTo(0, horizon + 4); for (var i = 0; i <= 80; i++) y.lineTo(i / 80 * W, hillTop(i / 80)); y.lineTo(W, horizon + 4); y.closePath(); y.fill();
    var tl = mix(P.tree, P.sun, 0.18 + 0.2 * P.warm);
    trees.forEach(function (tr) {
      var tx = tr.x * W, ty = hillTop(tr.x) + 3, r = H * 0.012 * tr.k;
      for (var q = 0; q < tr.n; q++) {
        var ox = (q - (tr.n - 1) / 2) * r * 1.1, oy = -r * (q % 2 ? 0.6 : 1.1);
        y.fillStyle = P.tree; y.beginPath(); y.arc(tx + ox, ty + oy, r, 0, Math.PI * 2); y.fill();
        y.fillStyle = tl; y.beginPath(); y.arc(tx + ox - r * 0.3, ty + oy - r * 0.35, r * 0.5, 0, Math.PI * 2); y.fill();
      }
    });
    var m = y.createLinearGradient(0, horizon, 0, H); m.addColorStop(0, P.mTop); m.addColorStop(1, P.mBot);
    y.fillStyle = m; y.fillRect(0, horizon, W, H - horizon);
    blobs.forEach(function (b) { y.fillStyle = rgba(b.light ? P.b2 : P.b0, 0.1); y.beginPath(); y.ellipse(b.x * W, horizon + b.y * (H - horizon), b.rx * W, b.ry * (H - horizon), 0, 0, Math.PI * 2); y.fill(); });
    var hz = y.createLinearGradient(0, horizon, 0, horizon + H * 0.09); hz.addColorStop(0, rgba(P.bot, 0.55)); hz.addColorStop(1, rgba(P.bot, 0));
    y.fillStyle = hz; y.fillRect(0, horizon, W, H * 0.09);
  }
  function mountains(x, base, amp, top, bottom, seed) {
    var g = x.createLinearGradient(0, base - amp, 0, base + 6); g.addColorStop(0, top); g.addColorStop(1, bottom);
    x.fillStyle = g; x.beginPath(); x.moveTo(0, base + 6);
    for (var i = 0; i <= 120; i++) {
      var u = i / 120, v = 0.55 * (1 - Math.abs(noise(seed, u * 4))) + 0.3 * (noise(seed + 3, u * 9) * 0.5 + 0.5) + 0.15 * (noise(seed + 9, u * 23) * 0.5 + 0.5);
      x.lineTo(u * W, base - amp * v * (0.55 + 0.45 * Math.sin(u * Math.PI)));
    }
    x.lineTo(W, base + 6); x.closePath(); x.fill();
  }

  // Wind: Böen laufen als schräge Bänder über die Wiese. Wo sie sind, biegt sich das Gras und zeigt die helle Seite.
  var GUST = [{ v: 0.17, per: 1.6, bw: 0.11, off: 0 }, { v: 0.11, per: 1.9, bw: 0.16, off: 0.7 }];
  function gustCenters(i) {
    var gb = GUST[i], span = W * gb.per, c = ((wind.t * gb.v * W + gb.off * span) % span) - W * 0.3;
    return c;
  }
  function gustAt(x0, y0) {
    var u = x0 + (y0 - horizon) * 0.5, g = 0;
    for (var i = 0; i < GUST.length; i++) { var d = (u - gustCenters(i)) / (GUST[i].bw * W); g = Math.max(g, Math.exp(-d * d) * (i ? 0.75 : 1)); }
    return g;
  }
  function drawMeadow(x) {
    var sp = sunPos(), glare = P.sunH > -0.08 ? clamp(1 - P.sunH / 0.7, 0, 1) : 0, day = 1 - P.night;
    // Sonnenglanz auf der Wiese: ein breiter, warmer Schimmer unter der Sonne, kräftiger bei tiefer Sonne
    x.save(); x.beginPath(); x.rect(0, horizon, W, H - horizon); x.clip();
    x.globalCompositeOperation = "screen";
    if (P.sunH > -0.1) {
      x.save(); x.translate(sp.x, horizon); x.scale(1, 0.32);
      var rr = W * (0.28 + 0.25 * glare), sg = x.createRadialGradient(0, 0, 0, 0, 0, rr);
      sg.addColorStop(0, rgba(P.sun, (0.22 + 0.4 * glare) * day)); sg.addColorStop(0.5, rgba(P.sun, (0.08 + 0.15 * glare) * day)); sg.addColorStop(1, rgba(P.sun, 0));
      x.fillStyle = sg; x.fillRect(-rr, -rr, rr * 2, rr * 2); x.restore();
    }
    if (P.night > 0.4) {
      x.save(); x.translate(W / 2, horizon); x.scale(1, 0.3);
      var mg = x.createRadialGradient(0, 0, 0, 0, 0, W * 0.4); mg.addColorStop(0, rgba("#9FB8FF", 0.12 * P.night)); mg.addColorStop(1, rgba("#9FB8FF", 0));
      x.fillStyle = mg; x.fillRect(-W, -W, W * 2, W * 2); x.restore();
    }
    // helle Schweife der Böen
    x.save(); x.transform(1, 0, -0.5, 1, horizon * 0.5, 0);
    for (var i = 0; i < GUST.length; i++) {
      var c = gustCenters(i), bw = GUST[i].bw * W, lg = x.createLinearGradient(c - bw * 1.6, 0, c + bw * 1.6, 0);
      lg.addColorStop(0, rgba(P.b2, 0)); lg.addColorStop(0.5, rgba(P.b2, 0.13 * (i ? 0.75 : 1))); lg.addColorStop(1, rgba(P.b2, 0));
      x.fillStyle = lg; x.fillRect(c - bw * 1.6, horizon, bw * 3.2, H - horizon);
    }
    x.restore(); x.restore();
    // Grashalme in wenigen Pfaden gebündelt (Helligkeit × nah/fern)
    var paths = [[], [], [], [], [], []], t = wind.t, cols = [P.b0, P.b1, P.b2];
    var hiCol = mix(P.b2, P.sun, 0.12 + 0.15 * P.warm);
    for (var k = 0; k < blades.length; k++) {
      var b = blades[k], g = gustAt(b.x, b.y), sway = 0.12 * Math.sin(t * 1.6 + b.x * 0.012 + b.ph);
      var w = sway + g * (0.9 + 0.2 * b.v), dx = b.x - sp.x;
      var lit = g * 1.6 + b.v * 0.7 + glare * day * Math.exp(-dx * dx / (W * W * 0.04)) * (1.1 - b.d * 0.6);
      var br = lit > 1.55 ? 2 : lit > 0.75 ? 1 : 0, near = b.d > 0.55 ? 1 : 0;
      b.tx = b.x + (b.lean + w) * b.h * 0.75; b.ty = b.y - b.h * (1 - 0.22 * Math.min(1, Math.abs(w)));
      paths[br * 2 + near].push(b);
    }
    x.lineCap = "round";
    for (var p = 0; p < 6; p++) {
      var list = paths[p]; if (!list.length) continue;
      var br2 = p >> 1, nr = p & 1;
      x.strokeStyle = br2 === 2 ? hiCol : cols[br2]; x.lineWidth = (nr ? 2.6 : 1.3) * Math.max(0.8, unit());
      x.beginPath();
      for (var q = 0; q < list.length; q++) { var bl = list[q]; x.moveTo(bl.x, bl.y); x.quadraticCurveTo(bl.x + (bl.tx - bl.x) * 0.2, bl.y - bl.h * 0.55, bl.tx, bl.ty); }
      x.stroke();
    }
    flowers.forEach(function (f) {
      x.fillStyle = mix(f.c, "#18213F", P.night * 0.7); x.beginPath(); x.arc(f.b.tx, f.b.ty, f.r, 0, Math.PI * 2); x.fill();
      x.fillStyle = rgba("#FFFFFF", 0.5 * day); x.beginPath(); x.arc(f.b.tx - f.r * 0.3, f.b.ty - f.r * 0.3, f.r * 0.4, 0, Math.PI * 2); x.fill();
    });
  }
  // Pollen am Tag, Glühwürmchen in der Nacht
  function drawMotes(x, dt) {
    var day = 1 - P.night;
    motes.forEach(function (m) {
      m.ph += dt;
      m.x += (0.012 + 0.03 * gustAt(m.x * W, horizon + m.y * (H - horizon))) * dt + noise(m.seed, m.ph * 0.3) * 0.004 * dt;
      if (m.x > 1.05) m.x = -0.05;
      var px = m.x * W, py = horizon - H * 0.12 + m.y * (H - horizon + H * 0.1) + noise(m.seed + 5, m.ph * 0.4) * 18;
      if (day > 0.05) { x.fillStyle = rgba("#FFFDF0", 0.55 * day); x.beginPath(); x.arc(px, py, 1.4 * m.s, 0, Math.PI * 2); x.fill(); }
      if (P.night > 0.3) {
        var bl = Math.max(0, Math.sin(m.ph * 1.7 + m.seed)) * clamp((P.night - 0.3) * 1.6, 0, 1);
        if (bl > 0.02) {
          var gr = x.createRadialGradient(px, py, 0, px, py, 9 * m.s); gr.addColorStop(0, rgba("#E8FF9A", 0.7 * bl)); gr.addColorStop(1, rgba("#E8FF9A", 0));
          x.fillStyle = gr; x.fillRect(px - 10 * m.s, py - 10 * m.s, 20 * m.s, 20 * m.s);
          x.fillStyle = rgba("#FBFFD8", bl); x.beginPath(); x.arc(px, py, 1.3 * m.s, 0, Math.PI * 2); x.fill();
        }
      }
    });
  }
  function drawStars(x) {
    if (P.night < 0.05) return;
    x.fillStyle = "#FFF6DA";
    stars.forEach(function (s) { x.globalAlpha = P.night * s.a * (0.65 + 0.35 * Math.sin(wind.t * s.tw + s.ph)); x.beginPath(); x.arc(s.x * W, s.y * horizon, s.r, 0, Math.PI * 2); x.fill(); });
    x.globalAlpha = 1;
  }
  function drawClouds(x, dt) {
    clouds.forEach(function (c, i) {
      c.x += c.v * dt;
      if (c.x > 1.3) { clouds[i] = newCloud(-0.3); return; }
      if (!c.spr) c.spr = cloudSprite(c.shape, c.s * W);
      x.drawImage(c.spr.img, c.x * W - c.spr.ox, c.y * horizon - c.spr.oy, c.spr.w, c.spr.h);
    });
  }

  // Propellermaschine mit Werbebanner, weit hinten
  var BANNER = "VVRONSCHXFER";
  function bannerSprite(s) {
    var fs = Math.round(s * 0.62), pad = s * 0.35, k = canvas(1, 1), x = k.getContext("2d");
    x.font = "700 " + fs + 'px "Instrument Sans", system-ui, sans-serif';
    var w = x.measureText(BANNER).width + pad * 2, h = s * 0.95;
    k.width = Math.ceil(w * dpr); k.height = Math.ceil(h * dpr); x = k.getContext("2d"); x.scale(dpr, dpr);
    x.fillStyle = "#FFF6E4"; x.fillRect(0, 0, w, h);
    x.fillStyle = "#D9534F"; x.fillRect(0, 0, w, h * 0.1); x.fillRect(0, h * 0.9, w, h * 0.1);
    x.font = "700 " + fs + 'px "Instrument Sans", system-ui, sans-serif'; x.textBaseline = "middle"; x.fillStyle = "#B83B3B"; x.fillText(BANNER, pad, h * 0.53);
    return { img: k, w: w, h: h };
  }
  function updPlane(dt) {
    if (!plane.on) {
      plane.next -= dt; if (plane.next > 0) return;
      plane.on = true; plane.dir = Math.random() < 0.5 ? 1 : -1; plane.s = 17 * unit(); plane.t = 0;
      plane.y = horizon - H * rnd(0.17, 0.27); plane.banner = bannerSprite(plane.s);
      var span = plane.banner.w + plane.s * 5; plane.x = plane.dir > 0 ? -span : W + span; plane.speed = W / rnd(26, 34);
      return;
    }
    plane.t += dt; plane.x += plane.dir * plane.speed * dt;
    var span2 = plane.banner.w + plane.s * 5;
    if (plane.dir > 0 ? plane.x > W + span2 : plane.x < -span2) { plane.on = false; plane.next = rnd(35, 60); }
  }
  function drawPlane(x) {
    if (!plane.on) return;
    var s = plane.s, d = plane.dir, haze = 0.28 + 0.4 * P.night, bob = Math.sin(plane.t * 1.3) * s * 0.15;
    function c(col) { return mix(mix(col, P.bot, haze), "#0A1030", P.night * 0.45); }
    var px = plane.x, py = plane.y + bob, bn = plane.banner;
    // Seil und wehendes Banner hinter dem Flugzeug
    var bx0 = px - d * s * 1.6, gap = s * 1.4, bLeft = d > 0 ? bx0 - gap - bn.w : bx0 + gap;
    x.strokeStyle = c("#5A5A66"); x.lineWidth = 1; x.beginPath(); x.moveTo(bx0, py); x.lineTo(d > 0 ? bLeft + bn.w : bLeft, py + bn.h * 0.1); x.stroke();
    var sl = Math.max(3, Math.round(bn.w / 40)), n = Math.ceil(bn.w / sl);
    x.save(); x.globalAlpha = 1 - haze * 0.45;
    for (var i = 0; i < n; i++) {
      var sx = i * sl, sw = Math.min(sl, bn.w - sx), far = d > 0 ? (bn.w - sx) / bn.w : sx / bn.w;
      var off = Math.sin(plane.t * 7 - (d > 0 ? bn.w - sx : sx) * 0.05) * s * 0.18 * far;
      x.drawImage(bn.img, sx * dpr, 0, sw * dpr, bn.h * dpr, bLeft + sx, py - bn.h * 0.4 + off, sw + 0.6, bn.h);
    }
    x.fillStyle = rgba(P.bot, haze * 0.5); x.fillRect(bLeft, py - bn.h * 0.6, bn.w, bn.h * 1.4);
    x.restore();
    // Flugzeug
    x.save(); x.translate(px, py); x.scale(d, 1);
    x.lineWidth = 1; x.strokeStyle = c("#3A3A48"); x.lineJoin = "round";
    x.fillStyle = c("#E6DCC8"); x.beginPath(); x.moveTo(-s * 1.6, -s * 0.15); x.lineTo(-s * 2.1, -s * 0.75); x.lineTo(-s * 1.75, -s * 0.75); x.lineTo(-s * 1.2, -s * 0.18); x.closePath(); x.fill(); x.stroke();
    x.fillStyle = c("#F4EEE2"); x.beginPath(); x.ellipse(0, 0, s * 1.7, s * 0.32, 0, 0, Math.PI * 2); x.fill(); x.stroke();
    x.fillStyle = c("#D9534F"); x.fillRect(-s * 1.4, -s * 0.06, s * 2.8, s * 0.12);
    x.fillStyle = c("#9CC4E4"); x.beginPath(); x.ellipse(s * 0.5, -s * 0.22, s * 0.35, s * 0.16, 0, Math.PI, 0); x.fill();
    x.fillStyle = c("#E6DCC8"); x.beginPath(); x.ellipse(s * 0.1, s * 0.12, s * 0.9, s * 0.13, 0.05, 0, Math.PI * 2); x.fill(); x.stroke();
    x.fillStyle = rgba("#DDDDDD", 0.45); x.beginPath(); x.ellipse(s * 1.75, 0, s * 0.06, s * 0.55 * (0.7 + 0.3 * Math.sin(plane.t * 60)), 0, 0, Math.PI * 2); x.fill();
    x.restore();
  }

  // ---------- Tiere im Anime-Stil ----------
  var BIRDS = [
    { body: "#F2907F", belly: "#FFE9D6", wing: "#DB6A60", shade: "#D9746A", line: "#7A3A3A" },
    { body: "#82B9F0", belly: "#ECF6FF", wing: "#5E95D8", shade: "#6AA2DD", line: "#2E4E7A" },
    { body: "#FFD46E", belly: "#FFF7DA", wing: "#F0B04A", shade: "#EBBB57", line: "#8A5E1E" },
    { body: "#BCA6EC", belly: "#F3EEFF", wing: "#9C82DA", shade: "#A890DE", line: "#4E3A7A" }
  ];
  var INK = "#23303A";
  function unit() { return Math.max(0.6, Math.min(W, H * 1.4) / 1000); }
  function ell(x, cx, cy, rx, ry, rot) { x.beginPath(); x.ellipse(cx, cy, rx, ry, rot || 0, 0, Math.PI * 2); }
  function eye(x, cx, cy, rx, ry) {
    x.fillStyle = "#2A2033"; ell(x, cx, cy, rx, ry); x.fill();
    x.fillStyle = "#5A4A78"; ell(x, cx, cy + ry * 0.45, rx * 0.7, ry * 0.4); x.fill();
    x.fillStyle = "#FFFFFF"; x.beginPath(); x.arc(cx + rx * 0.25, cy - ry * 0.4, rx * 0.45, 0, Math.PI * 2); x.fill();
    x.beginPath(); x.arc(cx - rx * 0.35, cy + ry * 0.35, rx * 0.2, 0, Math.PI * 2); x.fill();
  }
  function drawBird(x, b, rot) {
    var s = b.s, fl = Math.sin(b.t * b.flap), c = b.col;
    x.save(); x.translate(b.x, b.y); x.scale(b.dir, 1); if (rot) x.rotate(rot);
    x.lineWidth = Math.max(1.2, s * 0.075); x.strokeStyle = c.line; x.lineJoin = "round"; x.lineCap = "round";
    // Schwanzfedern
    x.fillStyle = c.wing;
    for (var k = -1; k <= 1; k++) { ell(x, -s * 0.98, -s * 0.05 + k * s * 0.14, s * 0.42, s * 0.12, 0.15 + k * 0.32); x.fill(); x.stroke(); }
    // ferner Flügel
    x.save(); x.translate(-s * 0.05, -s * 0.12); x.rotate(-0.6 - fl * 0.7); x.fillStyle = c.shade; ell(x, -s * 0.35, 0, s * 0.5, s * 0.22); x.fill(); x.stroke(); x.restore();
    // Körper mit Schattenseite und Bauch
    x.fillStyle = c.body; ell(x, 0, 0, s * 0.95, s * 0.78); x.fill();
    x.save(); ell(x, 0, 0, s * 0.95, s * 0.78); x.clip();
    x.fillStyle = c.shade; ell(x, -s * 0.1, s * 0.62, s * 1.15, s * 0.5); x.fill();
    x.fillStyle = c.belly; ell(x, s * 0.32, s * 0.32, s * 0.55, s * 0.42); x.fill();
    x.fillStyle = rgba("#FFFFFF", 0.35); ell(x, -s * 0.15, -s * 0.5, s * 0.45, s * 0.16, -0.2); x.fill();
    x.restore();
    ell(x, 0, 0, s * 0.95, s * 0.78); x.stroke();
    // Haarbüschel, Schnabel, Auge, Wangen
    x.beginPath(); x.moveTo(s * 0.15, -s * 0.74); x.quadraticCurveTo(s * 0.05, -s * 1.05, s * 0.32, -s * 1.02); x.moveTo(s * 0.28, -s * 0.74); x.quadraticCurveTo(s * 0.3, -s * 0.95, s * 0.5, -s * 0.9); x.stroke();
    x.fillStyle = "#F7A64A"; x.beginPath(); x.moveTo(s * 0.86, -s * 0.2); x.quadraticCurveTo(s * 1.28, -s * 0.06, s * 0.88, s * 0.08); x.closePath(); x.fill(); x.stroke();
    eye(x, s * 0.5, -s * 0.2, s * 0.13, s * 0.19);
    x.fillStyle = rgba("#FF7F9A", 0.5); ell(x, s * 0.62, s * 0.12, s * 0.14, s * 0.075); x.fill();
    // naher Flügel mit Federkante
    x.save(); x.translate(-s * 0.1, -s * 0.02); x.rotate(-0.2 - fl * 0.95);
    x.fillStyle = c.wing; x.beginPath(); x.moveTo(0, -s * 0.2);
    x.quadraticCurveTo(-s * 0.7, -s * 0.38, -s * 1.0, -s * 0.05);
    x.quadraticCurveTo(-s * 0.85, s * 0.08, -s * 0.7, s * 0.06); x.quadraticCurveTo(-s * 0.58, s * 0.2, -s * 0.42, s * 0.14); x.quadraticCurveTo(-s * 0.25, s * 0.26, 0, s * 0.18);
    x.closePath(); x.fill(); x.stroke();
    x.restore();
    x.restore();
  }
  function drawFrog(x, f, rot, alpha) {
    var s = f.s, hopping = f.state === "hop";
    if (!rot) { x.fillStyle = "rgba(10,30,20,.2)"; var sh = hopping ? 1 - 0.5 * Math.sin(Math.PI * f.hop.p) : 1; ell(x, f.x, f.gy + s * 0.05, s * 0.95 * sh, s * 0.2 * sh); x.fill(); }
    x.save(); x.translate(f.x, f.y); x.scale(f.dir, 1);
    if (rot) { x.translate(0, -s * 0.5); x.rotate(rot); x.translate(0, s * 0.5); }
    else if (hopping) x.rotate(-0.35 * Math.cos(Math.PI * f.hop.p));
    if (alpha !== undefined) x.globalAlpha = alpha;
    var BODY = "#7FCD66", SH = "#5FAF4E", LN = "#2F5E2A";
    x.lineWidth = Math.max(1.2, s * 0.075); x.strokeStyle = LN; x.lineJoin = "round"; x.lineCap = "round";
    x.fillStyle = SH;
    if (hopping || rot) { ell(x, -s * 0.95, -s * 0.15, s * 0.62, s * 0.17, -0.35); x.fill(); x.stroke(); ell(x, -s * 1.5, s * 0.05, s * 0.3, s * 0.1, 0.2); x.fill(); x.stroke(); }
    else { ell(x, -s * 0.5, -s * 0.28, s * 0.45, s * 0.32, -0.2); x.fill(); x.stroke(); ell(x, -s * 0.25, -s * 0.02, s * 0.45, s * 0.11); x.fill(); x.stroke(); }
    x.fillStyle = BODY; ell(x, 0, -s * 0.5, s * 0.88, s * 0.6); x.fill();
    x.save(); ell(x, 0, -s * 0.5, s * 0.88, s * 0.6); x.clip();
    x.fillStyle = SH; ell(x, -s * 0.2, -s * 0.02, s * 1.0, s * 0.3); x.fill();
    x.fillStyle = "#EAF7BC"; ell(x, s * 0.36, -s * 0.3, s * 0.42, s * 0.3); x.fill();
    x.fillStyle = rgba("#FFFFFF", 0.35); ell(x, -s * 0.2, -s * 0.9, s * 0.4, s * 0.12, -0.15); x.fill();
    x.restore();
    ell(x, 0, -s * 0.5, s * 0.88, s * 0.6); x.stroke();
    x.fillStyle = SH; ell(x, s * 0.6, -s * 0.06, s * 0.14, s * 0.12); x.fill(); x.stroke();
    [[s * 0.28, -s * 1.0, s * 0.27], [s * 0.74, -s * 0.95, s * 0.25]].forEach(function (e) {
      x.fillStyle = BODY; x.beginPath(); x.arc(e[0], e[1], e[2], 0, Math.PI * 2); x.fill(); x.stroke();
      x.fillStyle = "#FFFFFF"; x.beginPath(); x.arc(e[0], e[1], e[2] * 0.78, 0, Math.PI * 2); x.fill();
      eye(x, e[0] + e[2] * 0.12, e[1] + e[2] * 0.05, e[2] * 0.5, e[2] * 0.6);
    });
    x.fillStyle = rgba("#FF7F9A", 0.5); ell(x, s * 0.8, -s * 0.55, s * 0.15, s * 0.08); x.fill();
    x.beginPath(); x.lineWidth = Math.max(1, s * 0.06); x.arc(s * 0.5, -s * 0.6, s * 0.22, 0.35, 1.3); x.stroke();
    x.restore(); x.globalAlpha = 1;
  }

  // ---------- Effekte ----------
  function killBird(b) {
    for (var i = 0; i < 8; i++) fx.push({ k: "puff", x: b.x + rnd(-0.5, 0.5) * b.s, y: b.y + rnd(-0.4, 0.4) * b.s, r: b.s * rnd(0.3, 0.55), life: 0, max: rnd(0.3, 0.45) });
    for (var s2 = 0; s2 < 4; s2++) fx.push({ k: "spark", x: b.x + rnd(-1, 1) * b.s, y: b.y + rnd(-1, 1) * b.s, r: b.s * rnd(0.25, 0.45), life: 0, max: rnd(0.3, 0.45) });
    for (var j = 0; j < 10; j++) {
      var a = Math.random() * Math.PI * 2, v = rnd(60, 190) * unit();
      fx.push({ k: "feather", x: b.x, y: b.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, rot: Math.random() * 6, vr: rnd(-6, 6), sz: b.s * rnd(0.22, 0.36),
        col: j % 3 === 0 ? b.col.belly : j % 3 === 1 ? b.col.wing : b.col.body, line: b.col.line, life: 0, max: rnd(1.2, 2), sw: Math.random() * 6 });
    }
  }
  function killFrog(f, hx0, hy0) {
    fx.push({ k: "corpse", f: { x: f.x, y: f.y, gy: f.gy, s: f.s, dir: f.dir, state: "sit", hop: null }, vx: -f.dir * rnd(80, 160) * unit(), vy: -rnd(380, 480) * unit(), rot: 0, vr: rnd(9, 14) * (Math.random() < 0.5 ? -1 : 1), life: 0, max: 1.1 });
    fx.push({ k: "ring", x: hx0, y: hy0, r: f.s * 0.3, life: 0, max: 0.5 });
    fx.push({ k: "ring", x: hx0, y: hy0, r: f.s * 0.15, life: -0.08, max: 0.5 });
    for (var i = 0; i < 16; i++) {
      var a = -Math.PI / 2 + rnd(-1.2, 1.2), v = rnd(120, 300) * unit();
      fx.push({ k: "drop", x: hx0, y: hy0, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: f.s * rnd(0.08, 0.17), life: 0, max: rnd(0.5, 0.85) });
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
  function star4(x, cx, cy, r) { x.beginPath(); x.moveTo(cx, cy - r); x.quadraticCurveTo(cx, cy, cx + r, cy); x.quadraticCurveTo(cx, cy, cx, cy + r); x.quadraticCurveTo(cx, cy, cx - r, cy); x.quadraticCurveTo(cx, cy, cx, cy - r); x.fill(); }
  function drawFx(x) {
    fx.forEach(function (e) {
      if (e.life < 0) return;
      var p = e.life / e.max;
      if (e.k === "puff") { x.globalAlpha = (1 - p) * 0.9; var pg = x.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.r * (1 + p * 1.6)); pg.addColorStop(0, "#FFFFFF"); pg.addColorStop(0.7, "rgba(255,255,255,.85)"); pg.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = pg; x.beginPath(); x.arc(e.x, e.y, e.r * (1 + p * 1.6), 0, Math.PI * 2); x.fill(); }
      else if (e.k === "spark") { x.globalAlpha = 1 - p; x.fillStyle = "#FFF7C8"; star4(x, e.x, e.y, e.r * (0.6 + p)); }
      else if (e.k === "feather") {
        x.globalAlpha = p > 0.7 ? (1 - p) / 0.3 : 1; x.save(); x.translate(e.x, e.y); x.rotate(e.rot);
        x.fillStyle = e.col; x.strokeStyle = e.line; x.lineWidth = 1; x.beginPath(); x.moveTo(-e.sz, 0); x.quadraticCurveTo(0, -e.sz * 0.5, e.sz, 0); x.quadraticCurveTo(0, e.sz * 0.5, -e.sz, 0); x.fill(); x.stroke();
        x.beginPath(); x.moveTo(-e.sz * 1.15, 0); x.lineTo(e.sz * 0.8, 0); x.stroke(); x.restore();
      }
      else if (e.k === "drop") { x.globalAlpha = 1 - p * p; x.fillStyle = "#7CCBF2"; x.strokeStyle = "#2E7FB0"; x.lineWidth = 1; x.beginPath(); x.arc(e.x, e.y, e.r, 0, Math.PI * 2); x.fill(); x.stroke(); x.fillStyle = "#FFFFFF"; x.beginPath(); x.arc(e.x - e.r * 0.3, e.y - e.r * 0.3, e.r * 0.35, 0, Math.PI * 2); x.fill(); }
      else if (e.k === "ring") { x.globalAlpha = 1 - p; x.strokeStyle = "#D6F1FF"; x.lineWidth = 2.5; ell(x, e.x, e.y, e.r * (1 + p * 4), e.r * (0.4 + p * 1.4)); x.stroke(); }
      else if (e.k === "corpse") { drawFrog(x, e.f, e.rot, 1 - p * 0.6); }
      else if (e.k === "pop") {
        x.globalAlpha = 1 - p; x.font = "600 " + Math.round(20 * unit() + 6) + 'px "Instrument Sans", system-ui, sans-serif'; x.textAlign = "center";
        x.lineWidth = 4; x.strokeStyle = INK; x.strokeText(e.txt, e.x, e.y); x.fillStyle = "#FFF6C8"; x.fillText(e.txt, e.x, e.y);
      }
      x.globalAlpha = 1;
    });
  }

  // ---------- Bewegung der Tiere ----------
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
      if (e.type === "bird") { dy = aim.y - e.y; hit = dx * dx / (e.s * e.s * 1.3) + dy * dy / (e.s * e.s * 0.85) <= 1; }
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
    horizon = Math.round(H * 0.62);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    tint = tint || document.createElement("canvas"); tint.width = cv.width; tint.height = cv.height;
    if (ow && oh && (ow !== W || oh !== H)) {
      var fx0 = W / ow, fy = H / oh;
      ent.forEach(function (e) { e.x *= fx0; e.y *= fy; if (e.base) { e.base *= fy; e.top *= fy; e.bot *= fy; e.amp *= fy; e.nAmp *= fy; } if (e.gy) e.gy *= fy; if (e.hop) { e.hop.x0 *= fx0; e.hop.x1 *= fx0; } });
      aim.x *= fx0; aim.y *= fy;
    }
    cacheKey = ""; if (!ow || ow !== W || oh !== H) seedBlades();
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
    if (run) { wind.t += dt; updPlane(dt); }
    x.drawImage(skyC, 0, 0); x.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawStars(x);
    drawPlane(x);
    drawClouds(x, run ? dt : 0);
    x.setTransform(1, 0, 0, 1, 0, 0); x.drawImage(bgC, 0, 0); x.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawMeadow(x);
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
    x.setTransform(1, 0, 0, 1, 0, 0); x.drawImage(tint, 0, 0);
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawMotes(x, run ? dt : 0);
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
