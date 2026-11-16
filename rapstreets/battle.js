/* Rap Streets – battle.js
   Battle-Modus (funktionale Version):
   - Zufälliges Instrumental (beats/beats.js), abgespielt über WebAudio in Originallautstärke.
   - Song wird geviertelt: Spieler 1 → 2 → 1 → 2. Zwischen den Parts 2 Takte "Pass the mic" (Song läuft weiter, Crowd jubelt).
   - Ein Mikro (wird in echt weitergegeben): Pegel über getUserMedia + Analyser. Grundrauschen inkl. Beat aus den Boxen wird in
     Intro und Pausen gemessen und abgezogen. Je mehr gerappt wird, desto höher der Crowd-Hype des Spielers.
   - Zwei Rapper auf festen Wegen um die Bühne, Posen nach Pegel und Takt. Zeitleiste mit roten/blauen Parts. */
(function () {
  var RS = window.RS, L2 = RS.L2, m = RS.m;

  // ===================== Audio =====================
  var A = RS.audio = { ctx: null, buf: {}, src: null, mic: null, an: null, data: null, gain: null };
  A.context = function () {
    if (!A.ctx) { var C = window.AudioContext || window.webkitAudioContext; if (!C) return null; A.ctx = new C(); A.gain = A.ctx.createGain(); A.gain.connect(A.ctx.destination); }
    if (A.ctx.state === "suspended") A.ctx.resume();
    return A.ctx;
  };
  A.load = function (beat) {
    var ctx = A.context(); if (!ctx) return Promise.reject(new Error("WebAudio"));
    if (A.buf[beat.file]) return Promise.resolve(A.buf[beat.file]);
    return fetch("rapstreets/beats/" + beat.file + (RS.STAMP ? "?v=" + RS.STAMP : "")).then(function (r) { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then(function (ab) { return new Promise(function (ok, no) { ctx.decodeAudioData(ab, ok, no); }); })
      .then(function (b) { A.buf = {}; A.buf[beat.file] = b; return b; });   // nur das letzte Instrumental im Speicher halten
  };
  A.play = function (buf, delay) {
    A.stop(); var ctx = A.context(), s = ctx.createBufferSource(); s.buffer = buf; s.connect(A.gain);
    var t0 = ctx.currentTime + (delay || 0.1); s.start(t0); A.src = s; return t0;
  };
  A.stop = function () { if (A.src) { try { A.src.stop(); } catch (e) {} A.src.disconnect(); A.src = null; } };
  // Mikro: nur Pegel messen, nie zu den Lautsprechern durchschleifen (sonst Rückkopplung)
  A.micOpen = function () {
    if (A.mic) return Promise.resolve(true);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return Promise.resolve(false);
    var ctx = A.context(); if (!ctx) return Promise.resolve(false);
    return navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false } }).then(function (st) {
      A.mic = st; var src = ctx.createMediaStreamSource(st); A.an = ctx.createAnalyser(); A.an.fftSize = 1024; src.connect(A.an); A.data = new Float32Array(A.an.fftSize); return true;
    }).catch(function () { return false; });
  };
  A.micClose = function () { if (A.mic) A.mic.getTracks().forEach(function (t) { t.stop(); }); A.mic = null; A.an = null; };
  A.micDb = function () {   // Pegel in dB (RMS)
    if (!A.an) return -100; A.an.getFloatTimeDomainData(A.data); var s = 0; for (var i = 0; i < A.data.length; i++) s += A.data[i] * A.data[i];
    return 10 * Math.log10(s / A.data.length + 1e-12);
  };

  // ===================== Ablauf =====================
  // Segmente: intro (2 Takte ab dem ersten Downbeat), dann P1, pass, P2, pass, P1, pass, P2 bis zum Ende. Grenzen liegen auf Takten.
  RS.plan = function (b) {
    var bar = 240 / b.bpm, end = b.dur, i0 = b.down + 2 * bar, L = end - i0, S = [];
    var q = [1, 2, 3].map(function (k) { var t = i0 + k * L / 4; return b.down + Math.round((t - b.down) / bar) * bar; });
    S.push({ k: "intro", a: 0, b: i0, pl: 0 });
    var marks = [i0].concat(q), order = [0, 1, 0, 1];
    for (var k = 0; k < 4; k++) {
      var a = k ? marks[k] + 2 * bar : marks[k], e = k < 3 ? marks[k + 1] : end;
      if (k) S.push({ k: "pass", a: marks[k], b: a, pl: order[k], from: order[k - 1] });
      S.push({ k: "part", a: a, b: e, pl: order[k], n: k });
    }
    return { segs: S, bar: bar, beat: bar / 4, end: end };
  };

  // ===================== Battle-Szene =====================
  var B = null;
  function seg(t) { for (var i = 0; i < B.plan.segs.length; i++) { var s = B.plan.segs[i]; if (t < s.b) return s; } return null; }
  function fmt(t) { t = Math.max(0, Math.floor(t)); return Math.floor(t / 60) + ":" + (t % 60 < 10 ? "0" : "") + (t % 60); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  function buildHud() {
    var st = RS.main.stage, P = B.plan, D = P.end;
    var tl = P.segs.map(function (s) {
      var cls = s.k === "part" ? "rs-tl-p" + s.pl : s.k === "pass" ? "rs-tl-pass" : "rs-tl-intro";
      return '<i class="' + cls + '" style="left:' + (s.a / D * 100).toFixed(3) + '%;width:' + ((s.b - s.a) / D * 100).toFixed(3) + '%">' + (s.k === "part" ? "P" + (s.pl + 1) : "") + '</i>';
    }).join("");
    st.innerHTML = '<div class="rs-hud">' +
      [0, 1].map(function (i) { return '<div class="rs-pl rs-pl' + i + '"><b>' + esc(B.names[i]) + '</b><i><u></u></i><span>0 %</span></div>'; }).join("") +
      '<div class="rs-st"><small></small><b></b><em><u></u></em></div>' +
      '<div class="rs-tl"><div class="rs-tl-bar">' + tl + '<s></s></div><span>0:00 / ' + fmt(D) + '</span></div>' +
      '<div class="rs-esc">' + L2("Esc: abbrechen", "Esc: quit") + (B.noMic ? " · " + L2("kein Mikro – die Crowd hört nichts", "no mic – the crowd can't hear you") : "") + '</div>' +
      '<div class="rs-end" hidden></div></div>';
    B.el = {
      pl: [0, 1].map(function (i) { var e = st.querySelector(".rs-pl" + i); return { root: e, bar: e.querySelector("u"), val: e.querySelector("span") }; }),
      stS: st.querySelector(".rs-st small"), stB: st.querySelector(".rs-st b"), st: st.querySelector(".rs-st"), lv: st.querySelector(".rs-st em u"),
      head: st.querySelector(".rs-tl-bar s"), time: st.querySelector(".rs-tl span"), end: st.querySelector(".rs-end")
    };
  }
  function setStatus(small, big, cls) {
    if (B.stTxt === small + "|" + big + "|" + cls) return; B.stTxt = small + "|" + big + "|" + cls;
    B.el.stS.textContent = small; B.el.stB.textContent = big; B.el.st.className = "rs-st " + (cls || "");
  }

  // ----- Rapper -----
  function rapperUpdate(dt, t, s) {
    var W = B.world, sp = B.spots, beat = W.beat, md2 = function (n) { return ((n % 2) + 2) % 2; };
    // Wer hat das Mikro? In der Pause wechselt es nach dem ersten Takt
    var holder = s ? (s.k === "pass" ? (t < s.a + B.plan.bar ? s.from : s.pl) : s.pl) : B.winner != null ? B.winner : 0;
    B.holder = holder;
    B.actors.forEach(function (a, i) {
      var target, mine = holder === i, inPart = s && s.k === "part" && mine;
      if (!s) target = mine ? sp.at(0, 0.3) : sp.wait[i];
      else if (s.k === "pass") {
        var first = t < s.a + B.plan.bar, side = i === 0 ? -1 : 1;
        target = first ? sp.at(side * 0.45, 0.15) : (mine ? sp.at(0, 0.3) : sp.wait[i]);
      } else if (mine) {
        a.pace += dt * (0.12 + B.act * 0.35);   // läuft beim Rappen auf festem Weg hin und her
        target = sp.at(Math.sin(a.pace * Math.PI) * 0.9, 0.3 + Math.sin(a.pace * Math.PI * 2) * 0.12);
      } else target = sp.wait[i];
      var dx = target.x - a.x, dy = target.y - a.y, d = Math.sqrt(dx * dx + dy * dy), walking = d > 0.04;
      if (walking) { var v = Math.min(d, dt * (inPart ? 0.9 : 1.8)); a.x += dx / d * v; a.y += dy / d * v; a.step += dt * (inPart ? 4 : 6); var sx = dx - dy; if (Math.abs(sx) > 0.02) a.flip = sx < 0; }
      else if (!mine) a.flip = i === 1;   // Wartende schauen zur Mitte
      var pose = { mic: "none", free: "down", legs: walking ? (md2(Math.floor(a.step)) ? "a" : "b") : "s", bob: beat != null ? md2(Math.floor(beat)) === 0 : false };
      if (mine) {
        if (s && s.k === "pass" && t < s.a + B.plan.bar && t > s.a + B.plan.bar * 0.4) pose.mic = "out";
        else if (inPart && B.act > 0.12) {
          var seq = B.act > 0.6 ? ["out", "up", "out", "high"] : ["down", "out", "down", "up"];
          pose.mic = "mouth"; pose.free = seq[((Math.floor(beat) % 4) + 4) % 4]; pose.bob = md2(Math.floor(beat * 2)) === 0;
        } else pose.mic = "chest";
      }
      if (B.state === "end" && B.winner === i) { pose.mic = "high"; pose.free = "high"; pose.bob = md2(Math.floor(B.t * 4)) === 0; }
      if (B.state === "end" && B.winner === -1) pose.free = "up";
      a.on = mine && !!s;       a.sp = RS.rapper(i, pose, a.flip);
    });
  }

  function finish() {
    B.state = "end"; B.endT = B.t; RS.audio.stop();
    var sc = [0, 1].map(function (i) { return { hype: B.time[i] ? B.sum[i] / B.time[i] : 0, rap: B.time[i] ? B.voiced[i] / B.time[i] : 0 }; });
    B.score = sc; B.winner = Math.abs(sc[0].hype - sc[1].hype) < 0.03 ? -1 : sc[0].hype > sc[1].hype ? 0 : 1;
  }
  function showEnd() {
    var e = B.el.end, sc = B.score, w = B.winner;
    e.innerHTML = '<div class="rs-end-box"><h2>' + (w < 0 ? L2("Unentschieden", "Draw") : '<span class="rs-c' + w + '">' + esc(B.names[w]) + '</span> ' + L2("gewinnt", "wins")) + '</h2>' +
      '<p>' + L2("Die Crowd hat entschieden.", "The crowd has decided.") + '</p>' +
      '<table>' + [0, 1].map(function (i) { return '<tr><th class="rs-c' + i + '">' + esc(B.names[i]) + '</th><td>' + L2("Crowd-Hype", "Crowd hype") + ' <b>' + Math.round(sc[i].hype * 100) + ' %</b></td><td>' + L2("am Mikro", "on the mic") + ' <b>' + Math.round(sc[i].rap * 100) + ' %</b></td></tr>'; }).join("") + '</table>' +
      '<div class="rs-end-btns"><button type="button" data-a="again">' + L2("Revanche", "Rematch") + '</button><button type="button" data-a="new">' + L2("Neue Map", "New map") + '</button><button type="button" data-a="menu">' + L2("Menü", "Menu") + '</button></div></div>';
    e.hidden = false;
    e.querySelector(".rs-end-btns").addEventListener("click", function (ev) {
      var b = ev.target.closest("button"); if (!b) return;
      if (b.dataset.a === "again") RS.main.go("battle", { names: B.names, beat: RS.pickBeat() });
      else if (b.dataset.a === "new") { RS.main.newMap(); RS.main.go("menu"); }
      else RS.main.go("menu");
    });
  }

  RS.pickBeat = function (not) {
    var L = RS.BEATS, last = RS.lastBeat, c = L.filter(function (b) { return b !== last; }); if (!c.length) c = L;
    var b = c[Math.floor(Math.random() * c.length)]; RS.lastBeat = b; return b;
  };

  RS.scenes = RS.scenes || {};
  RS._battle = function () { return B; };   // für Tests
  RS.scenes.battle = {
    enter: function (opt) {
      var W = RS.main.world, sp = RS.stageSpots(W.map);
      B = { world: W, names: opt.names, beatInfo: opt.beat, plan: RS.plan(opt.beat), spots: sp, state: "load", t: 0, act: 0, floor: RS.micFloor != null ? RS.micFloor : -60,
        hyp: [0.15, 0.15], sum: [0, 0], time: [0, 0], voiced: [0, 0], noMic: !RS.audio.an, winner: null, stTxt: "" };
      B.actors = [0, 1].map(function (i) { var w = sp.wait[i]; return { x: w.x, y: w.y, z: 0, pace: i ? 1 : 0, step: 0, flip: i === 1, sp: null, ring: i ? [58, 120, 224] : [216, 55, 44] }; });
      B.actors[0].x = sp.at(0, 0.3).x; B.actors[0].y = sp.at(0, 0.3).y;
      W.actors = B.actors; W.cheer = false; W.hype = 0.1;
      buildHud(); setStatus(L2("Lade Beat …", "Loading beat …"), "", "");
      rapperUpdate(0, 0, B.plan.segs[0]);
      var my = B;
      RS.audio.load(opt.beat).then(function (buf) {
        if (B !== my) return; B.buf = buf; B.t0 = RS.audio.play(buf, 0.15); B.state = "run"; B.chk = { t: 0, ct: RS.audio.ctx.currentTime };
        B.srcEnded = false; RS.audio.src.onended = function () { if (B === my) B.srcEnded = true; };
      }).catch(function (er) { if (B === my) setStatus(L2("Beat konnte nicht geladen werden", "Could not load the beat") + " (" + opt.beat.file + (er && er.message ? ", " + er.message : "") + ")", L2("Esc = zurück", "Esc = back"), ""); });
      B.keys = function (e) { if (e.key === "Escape") { e.preventDefault(); RS.main.go("menu"); } };
      window.addEventListener("keydown", B.keys);
    },
    exit: function () {
      if (!B) return; RS.audio.stop(); window.removeEventListener("keydown", B.keys);
      B.world.actors = []; B.world.hype = 0; B.world.beat = null; B.world.dirty();
      RS.main.stage.innerHTML = ""; B = null;
    },
    update: function (dt) {
      var W = B.world; B.t += dt; W.update(dt);
      if (B.state === "load") { rapperUpdate(dt, 0, B.plan.segs[0]); return; }
      // Wächter: läuft die Audio-Uhr nicht (Browser hat den Ton blockiert), Knopf zum Starten zeigen
      if (B.state === "run") {
        var ac = RS.audio.ctx; B.chk.t += dt;
        if (ac.currentTime > B.chk.ct + 0.05) { B.chk.t = 0; B.chk.ct = ac.currentTime; if (B.el.unl) { B.el.unl.remove(); B.el.unl = null; } }
        else if (B.chk.t > 0.8 && !B.el.unl) {
          var u = document.createElement("button"); u.type = "button"; u.className = "rs-unl"; u.textContent = L2("Ton ist blockiert – hier klicken zum Starten", "Sound is blocked – click here to start");
          u.addEventListener("click", function () { ac.resume().then(function () { if (!B) return; B.t0 = RS.audio.play(B.buf, 0.1); B.chk = { t: 0, ct: ac.currentTime }; }); });
          RS.main.stage.querySelector(".rs-hud").appendChild(u); B.el.unl = u;
        }
        if (B.el.unl) return;
      }
      var ctx = RS.audio.ctx, t = B.state === "run" ? Math.max(0, ctx.currentTime - B.t0) : B.plan.end, P = B.plan, s = B.state === "run" ? seg(t) : null;
      W.beat = (t - B.beatInfo.down) / P.beat;
      // Mikro-Pegel → Aktivität (über dem gemessenen Grundpegel)
      var db = RS.audio.micDb(), rapping = s && s.k === "part";
      if (!rapping) B.floor += (db - B.floor) * Math.min(1, dt * (db < B.floor ? 3 : 0.6));
      else if (db < B.floor) B.floor += (db - B.floor) * Math.min(1, dt * 2);
      B.floor = Math.max(B.floor, -72);   // echtes Mikro rauscht immer etwas – so zählt kein digitales Grundrauschen als Rap
      var raw = B.noMic ? 0 : m.clamp((db - B.floor - 6) / 20, 0, 1);
      B.act += (raw - B.act) * Math.min(1, dt * (raw > B.act ? 14 : 4));
      // Hype
      var target = 0.1;
      if (s && s.k === "part") {
        var i = s.pl; B.hyp[i] = m.clamp(B.hyp[i] + dt * (0.42 * B.act - 0.09), 0.04, 1);
        B.sum[i] += B.hyp[i] * dt; B.time[i] += dt; if (B.act > 0.2) B.voiced[i] += dt; target = B.hyp[i];
      } else if (s && s.k === "pass") target = 0.95;
      else if (!s) target = B.state === "end" ? 1 : 0.1;
      W.hype += (target - W.hype) * Math.min(1, dt * 3);
      if (B.state === "run" && (t >= P.end - 0.02 || B.srcEnded)) { finish(); s = null; }
      if (B.state === "end" && !B.shown && B.t - B.endT > 2.5) { B.shown = true; showEnd(); }
      rapperUpdate(dt, t, s);
      // HUD
      var e = B.el;
      [0, 1].forEach(function (i) { e.pl[i].bar.style.width = (B.hyp[i] * 100).toFixed(1) + "%"; e.pl[i].val.textContent = Math.round(B.hyp[i] * 100) + " %"; e.pl[i].root.classList.toggle("on", B.holder === i && !!s); });
      e.lv.style.width = (B.act * 100).toFixed(1) + "%";
      e.head.style.left = (Math.min(t, P.end) / P.end * 100).toFixed(3) + "%"; e.time.textContent = fmt(t) + " / " + fmt(P.end);
      if (B.state === "end") setStatus(L2("Ende", "End"), L2("Die Crowd entscheidet …", "The crowd decides …"), "");
      else if (!s) setStatus("", "", "");
      else if (s.k === "intro") { var left = Math.ceil((s.b - t) / P.beat); setStatus(L2("Gleich am Mikro", "Up next"), B.names[0] + " · " + left, "rs-c0"); }
      else if (s.k === "pass") setStatus(L2("Weiter an", "Over to") + " " + B.names[s.pl], "PASS THE MIC", "rs-pass rs-c" + s.pl);
      else setStatus(L2("Am Mikro", "On the mic") + " · Part " + (s.n + 1) + "/4 · " + fmt(s.b - t), B.names[s.pl], "rs-c" + s.pl);
    },
    render: function (c) { B.world.render(c); }
  };

  RS.BATTLE_CSS =
    ".rs-hud{position:absolute;inset:0;pointer-events:none;color:#F2EEE6;text-shadow:0 .15em 0 #000}" +
    ".rs-pl{position:absolute;top:1.4em;width:12em;padding:.7em .9em;background:rgba(12,12,12,.72);border-left:.5em solid #D8372C}" +
    ".rs-pl0{left:1.6em}.rs-pl1{right:1.6em;border-left:0;border-right:.5em solid #3A78E0;text-align:right}" +
    ".rs-pl b{display:block;font:700 1.5em/1.1 var(--f-body,system-ui);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
    ".rs-pl i{display:block;height:.7em;margin:.5em 0 .3em;background:#2A2A2C}.rs-pl u{display:block;height:100%;width:0;background:#D8372C;text-decoration:none;transition:width .15s linear}" +
    ".rs-pl1 u{background:#3A78E0;margin-left:auto}.rs-pl span{font:600 1em/1 var(--f-body,system-ui);color:#BEB8AC;font-variant-numeric:tabular-nums}" +
    ".rs-pl.on{background:rgba(12,12,12,.88)}.rs-pl0.on{box-shadow:0 0 0 .2em #D8372C}.rs-pl1.on{box-shadow:0 0 0 .2em #3A78E0}" +
    ".rs-st{position:absolute;left:50%;top:1.6em;transform:translateX(-50%);text-align:center;white-space:nowrap}" +
    ".rs-st small{display:block;font:600 1em/1.2 var(--f-body,system-ui);letter-spacing:.14em;text-transform:uppercase;color:#D8D2C6}" +
    ".rs-st b{display:block;font:900 2.4em/1.05 Impact,'Arial Black',sans-serif;letter-spacing:.04em;text-transform:uppercase}" +
    ".rs-st em{display:block;width:12em;height:.45em;margin:.5em auto 0;background:rgba(0,0,0,.55)}.rs-st em u{display:block;height:100%;width:0;background:#F2EEE6;text-decoration:none}" +
    ".rs-c0 b,.rs-c0{color:#FF5A4A}.rs-c1 b,.rs-c1{color:#5A9AFF}.rs-st.rs-c0 small,.rs-st.rs-c1 small{color:#D8D2C6}" +
    ".rs-st.rs-pass b{color:#F2C230;font-size:3.2em;animation:rsPulse .45s ease-in-out infinite alternate}@keyframes rsPulse{from{transform:scale(1)}to{transform:scale(1.06)}}" +
    ".rs-tl{position:absolute;left:1.6em;right:1.6em;bottom:1.4em;display:flex;flex-direction:row-reverse;align-items:center;gap:1em}" +
    ".rs-tl-bar{position:relative;flex:1;height:1.9em;background:rgba(10,10,10,.75)}" +
    ".rs-tl-bar i{position:absolute;top:0;bottom:0;display:flex;align-items:center;justify-content:center;font:700 .9em/1 var(--f-body,system-ui);color:rgba(255,255,255,.9);overflow:hidden}" +
    ".rs-tl-p0{background:#B02A22}.rs-tl-p1{background:#2A5AB0}.rs-tl-pass{background:repeating-linear-gradient(135deg,#F2C230 0 .35em,#2A2A2A .35em .7em)}.rs-tl-intro{background:#3A3A3C}" +
    ".rs-tl-bar s{position:absolute;top:-.4em;bottom:-.4em;width:.3em;margin-left:-.15em;background:#FFF;box-shadow:0 0 0 .1em #000;text-decoration:none}" +
    ".rs-tl span{font:600 1em/1 var(--f-body,system-ui);font-variant-numeric:tabular-nums;min-width:6.5em}" +
    ".rs-esc{position:absolute;left:1.6em;bottom:4.2em;font:500 .9em/1 var(--f-body,system-ui);color:#A8A296}" +
    ".rs-unl{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);pointer-events:auto;font:700 1.4em/1 var(--f-body,system-ui);letter-spacing:.08em;padding:1em 1.4em;border:0;border-radius:0;background:#F2C230;color:#141414;cursor:pointer;box-shadow:.3em .3em 0 #111}" +
    ".rs-end{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.55);pointer-events:auto;animation:rsIn .5s ease both}.rs-end[hidden]{display:none}" +
    ".rs-end-box{background:#161616;border:1px solid #3A3A3A;padding:2em 2.4em;text-align:center;text-shadow:none;min-width:30em}" +
    ".rs-end-box h2{margin:0;font:900 3.2em/1.1 Impact,'Arial Black',sans-serif;text-transform:uppercase;letter-spacing:.03em}.rs-end-box p{margin:.4em 0 1.4em;color:#A8A296;font-size:1.1em}" +
    ".rs-end-box table{margin:0 auto 1.6em;border-collapse:collapse;font-size:1.2em}.rs-end-box th{text-align:left;padding:.3em 1.2em .3em 0}.rs-end-box td{padding:.3em 0 .3em 1.4em;color:#BEB8AC}.rs-end-box td b{color:#F2EEE6}" +
    ".rs-end-btns{display:flex;gap:.8em;justify-content:center}.rs-end-btns button{font:700 1.1em/1 var(--f-body,system-ui);letter-spacing:.12em;text-transform:uppercase;padding:.9em 1.4em;border:0;border-radius:0;background:#3A3A3C;color:#ECE8E0;cursor:pointer}" +
    ".rs-end-btns button:first-child{background:#F2C230;color:#141414}.rs-end-btns button:hover{filter:brightness(1.12)}";
})();
