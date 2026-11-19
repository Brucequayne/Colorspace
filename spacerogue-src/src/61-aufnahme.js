  // ===== 61-aufnahme.js · Aufnahme von Choreografien (Developer Tool, seit v0.59) =====
  // Im Testflug des Developer Tools: das eigene Schiff fliegen und aufnehmen. Jede Aufnahme wird eine Spur (wie in Ableton).
  // - Jeder Take startet von einer frischen Szene: Station, Schiffe, Asteroiden sind heil (Neustart = Testflug neu aufbauen),
  //   das eigene Schiff steht dort, wo es beim Drücken auf Aufnahme war. Danach 3 s Vorzähler.
  // - Overdub: alle aktiven Spuren spielen beim Aufnehmen mit. Sie fliegen exakt ihre Aufnahme ab (unbeweglich für Stöße).
  // - Schaden wird mitgeschrieben (welcher Block wann welche HP hat, für eigenes Schiff, Spuren und Station) und beim
  //   Abspielen genau so nachgestellt. Schüsse der Spuren sind dann nur Effekt – außer beim Aufnehmen auf das gerade
  //   aufgenommene Schiff: dort treffen sie echt (das wird Teil des neuen Takes).
  // - Positionen relativ zu Zelle (0,0) der Szene (FL.O), damit Spuren auch nach Umbauten am eigenen Schiff passen.
  Object.assign(TX, {
    recH: L2("Aufnahme", "Recording"), recRec: L2("● Aufnehmen", "● Record"), recPlay: L2("▶ Abspielen", "▶ Play"), recStop: L2("■ Stopp", "■ Stop"), recHome: L2("⟲ Neustart", "⟲ Restart"),
    recCam: L2("Kamera", "Camera"), recCamMe: L2("eigenes Schiff", "own ship"), recNone: L2("Noch keine Spuren. Losfliegen, ● drücken, nach dem Vorzähler wird aufgenommen; ■ beendet den Take.", "No tracks yet. Fly somewhere, press ●, recording starts after the count-in; ■ ends the take."),
    recSaved: L2("Spur gespeichert: {n} ({s} s)", "Track saved: {n} ({s} s)"), recShort: L2("Take zu kurz, verworfen", "Take too short, discarded"), recDelQ: L2("Spur löschen", "Delete track"),
    recOn: L2("Spur an/aus (spielt mit oder nicht)", "Track on/off (plays along or not)"), recTrk: L2("Spur", "Track"), recFull: L2("Speicher voll – Spur nur in dieser Sitzung. Szene exportieren, um sie zu sichern.", "Storage full – track kept for this session only. Export the scene to keep it."),
    recRecording: L2("AUFNAHME", "RECORDING"), recPlaying: L2("WIEDERGABE", "PLAYBACK"), recHide: L2("Spuren ein-/ausklappen", "Show/hide tracks")
  });
  var REC = { tracks: [], on: false, play: false, t: 0, cd: 0, take: null, follow: 0, open: true }, REC_SAVE = "spacerogue-rec-v1", REC_HZ = 20, REC_COL = ["#E3B83F", "#5FD0D8", "#C9A0F5", "#8FD06A", "#E0814F", "#7FB2E0", "#E07AB0", "#B9C4D4"];
  function recLoad() { try { var o = JSON.parse(localStorage.getItem(REC_SAVE) || "null"); if (o && Array.isArray(o.tracks)) REC.tracks = o.tracks.map(recUnpack).filter(Boolean); } catch (e) {} }
  function recStore() { try { localStorage.setItem(REC_SAVE, JSON.stringify({ tracks: REC.tracks })); return true; } catch (e) { return false; } }
  function recUnpack(q) {
    if (!q || !Array.isArray(q.f) || !Array.isArray(q.ship) || !q.f.length) return null;
    return { id: +q.id || 1, name: String(q.name || "Spur").slice(0, 28), on: q.on !== false, ship: q.ship, g: Array.isArray(q.g) ? q.g : [], f: q.f, d: Array.isArray(q.d) ? q.d : [], col: q.col || REC_COL[((+q.id || 1) - 1) % REC_COL.length] };
  }
  function parseRec(txt) { try { var o = JSON.parse(String(txt).trim()); return o && Array.isArray(o.rec) ? o.rec.map(recUnpack).filter(Boolean) : null; } catch (e) { return null; } }
  function recLen(q) { return q.f.length / REC_HZ; }
  function recMax() { return REC.tracks.reduce(function (a, q) { return Math.max(a, q.on ? recLen(q) : 0); }, 0); }
  function recDev() { return S.ed === "station" && FL && S.mode === "fly"; }

  // ---------- Pose aus den Bildern einer Spur (linear dazwischen) ----------
  function recPose(q, t) {
    var n = q.f.length, u = Math.max(0, Math.min(n - 1, t * REC_HZ)), i = Math.min(n - 2, Math.floor(u)), k = n > 1 ? u - i : 0, a = q.f[Math.max(0, i)], b = q.f[Math.min(n - 1, i + 1)];
    if (n === 1) b = a;
    var da = Math.atan2(Math.sin((b[2] - a[2]) / 1000), Math.cos((b[2] - a[2]) / 1000));
    return { x: FL.O.x + (a[0] + (b[0] - a[0]) * k) / 100, y: FL.O.y + (a[1] + (b[1] - a[1]) * k) / 100, a: a[2] / 1000 + da * k, vx: (a[3] + (b[3] - a[3]) * k) / 10, vy: (a[4] + (b[4] - a[4]) * k) / 10, fl: (k < 0.5 ? a : b)[5], fire: (k < 0.5 ? a : b)[6], end: t * REC_HZ >= n - 1 };
  }

  // ---------- Szene neu aufbauen (alles heil), eigenes Schiff an die Pose ----------
  function recReset(pose) {
    var vz = V.zoom, zed = V.zoomEd, ved = S.viewEd, view = S.view, fol = REC.follow;
    sndStopAll(); FL = null; S.mode = "edit"; startTest();
    if (!FL) return false;
    V.zoom = vz; V.zoomEd = zed; S.viewEd = ved; S.view = view; REC.follow = fol;
    if (pose) { var me = FL.me; me.x = pose.x; me.y = pose.y; me.a = pose.a; me.vx = pose.vx || 0; me.vy = pose.vy || 0; me.w = pose.w || 0; var sp0 = seatPos(me); FL.pilot.x = sp0.x; FL.pilot.y = sp0.y; }
    REC.t = 0; syncUI(); return true;   // Spuren hat startTest schon an ihren Start gestellt
  }
  function recGhosts() {
    REC.tracks.forEach(function (q) {
      q.di = 0; if (!q.on) return;
      var bl = parseShip(JSON.stringify({ b: q.ship })); if (!bl || !bl.length) return;
      var bd = makeBody(bl, false); bd.ghost = true; bd.static = true; bd.trk = q.id; bd.name = q.name; bd.id = ++BID;
      var p = recPose(q, 0); bd.x = p.x; bd.y = p.y; bd.a = p.a; bd.vx = bd.vy = bd.w = 0;
      FL.bodies.push(bd);
    });
  }
  function recGhostOf(id) { if (!FL) return null; for (var i = 0; i < FL.bodies.length; i++) if (FL.bodies[i].trk === id) return FL.bodies[i]; return null; }

  // ---------- Bedienung ----------
  function recPoseOfMe() { var me = FL.me; return { x: me.x, y: me.y, a: me.a, vx: me.vx, vy: me.vy, w: me.w }; }
  function recStart() {
    if (!recDev() || REC.on || REC.cd > 0) return;
    REC.play = false;
    if (!recReset(recPoseOfMe())) return;
    var me = FL.me;
    REC.take = { ship: me.blocks.map(function (b) { var a = [b.t, b.x, b.y, b.r, b.f]; if (b.c) a.push(b.c); return a; }), g: FL.groups.slice(), f: [], d: [], acc: 0 };
    REC.cd = 3; FL.paused = true; recUi();
  }
  function recBegin() { REC.cd = 0; FL.paused = false; REC.on = true; REC.t = 0; recSample(0, true); recUi(); }
  function recStop() {
    if (REC.cd > 0) { REC.cd = 0; REC.take = null; if (FL) FL.paused = false; recUi(); return; }
    if (REC.on) {
      REC.on = false; var tk = REC.take; REC.take = null;
      if (tk && tk.f.length >= REC_HZ / 2) {
        var id = REC.tracks.reduce(function (a, q) { return Math.max(a, q.id); }, 0) + 1;
        tk.d.forEach(function (e) { if (e[1] === "me") e[1] = id; });
        var q = { id: id, name: (FL && FL.me.name ? FL.me.name : t("recTrk")) + " " + id, on: true, ship: tk.ship, g: tk.g, f: tk.f, d: tk.d, col: REC_COL[(id - 1) % REC_COL.length] };
        REC.tracks.push(q); var ok = recStore();
        note(ok ? fmtN(t("recSaved"), { n: q.name, s: nf(recLen(q), 1) }) : t("recFull"));
      } else note(t("recShort"));
    }
    REC.play = false; recUi();
  }
  function recPlay() { if (!recDev() || REC.on || REC.cd > 0) return; if (!recReset(recPoseOfMe())) return; REC.play = true; recUi(); }
  function recHome() { if (!recDev() || REC.on || REC.cd > 0) return; REC.play = false; recReset(recPoseOfMe()); recUi(); }
  // Springen auf Zeit t: Szene neu, Schaden bis t sofort anwenden, Spuren an ihre Pose
  function recSeek(t) {
    if (!recDev() || REC.on || REC.cd > 0) return;
    var was = REC.play; REC.play = false;
    if (!recReset(recPoseOfMe())) return;
    REC.t = Math.max(0, t); recApplyUntil(REC.t); REC.play = was; recUi();
  }
  function fmtN(s, o) { return s.replace(/\{(\w+)\}/g, function (_, k) { return o[k] != null ? o[k] : ""; }); }

  // ---------- Simulation (aus flTick) ----------
  // Vorlauf mit echter Zeit (auch wenn der Flug während des Vorzählers steht)
  function recPre(dt) { if (REC.cd > 0) { REC.cd -= dt; if (REC.cd <= 0) recBegin(); } }
  // Zu Beginn von flTick: Zeit weiter, mitgeschriebenen Schaden der Spuren anwenden
  function recTick(dt) {
    if (!REC.tracks.length && !REC.on) return;
    if (REC.on || REC.play) { REC.t += dt; recApplyUntil(REC.t); }
    if (REC.play && REC.t > recMax() + 1.5) { REC.play = false; recUi(); }
  }
  function recApplyUntil(t) {
    REC.tracks.forEach(function (q) {
      if (!q.on) return; q.di = q.di || 0;
      while (q.di < q.d.length && q.d[q.di][0] / 100 <= t) { var e = q.d[q.di++]; recApplyDmg(e[1], e[2], e[3], e[4] / 10); }
    });
  }
  function recApplyDmg(owner, bx, by, hp) {
    var L = FL.bodies;
    for (var i = 0; i < L.length; i++) {
      var bd = L[i]; if (owner === "st" ? !bd.station : (bd.trk !== owner && bd.trkFrom !== owner)) continue;
      for (var j = 0; j < bd.blocks.length; j++) {
        var b = bd.blocks[j]; if (b.x !== bx || b.y !== by) continue;
        if (hp > 0) { b.hp = hp; return; }
        if (bd.gv) { bd.vx = bd.gv.x; bd.vy = bd.gv.y; }   // Trümmer übernehmen das Tempo der Spur
        blockKill(bd, b); return;
      }
    }
  }
  // Im Durchlauf aller Körper (nach dem Zurücksetzen der Flammen): Spur an ihre Pose, Flammen, Waffen
  function recGhost(bd, dt) {
    var q = null; for (var i = 0; i < REC.tracks.length; i++) if (REC.tracks[i].id === bd.trk) { q = REC.tracks[i]; break; }
    if (!q || !FL.O) return;
    var p = recPose(q, REC.t), run = (REC.on || REC.play) && !p.end;
    bd.x = p.x; bd.y = p.y; bd.a = p.a; bd.vx = run ? p.vx : 0; bd.vy = run ? p.vy : 0; bd.w = 0; bd.gv = { x: bd.vx, y: bd.vy };
    if (run) for (var d = 0; d < 4; d++) { var fk = Math.floor(p.fl / Math.pow(10, d)) % 10; if (fk) bd.flames[d] = fk / 9; }
    bd.energy = bd.cap;
    var g = run && p.fire ? q.g[p.fire - 1] : null;
    FL.fx = bd; weapons(bd, dt, g, !!g, null); FL.fx = null;
  }
  // Am Ende von flTick: Bild des eigenen Schiffs mitschreiben (20 pro Sekunde)
  function recSample(dt, first) {
    var tk = REC.take; if (!REC.on || !tk || !FL) return;
    tk.acc += dt; if (!first && tk.acc < 1 / REC_HZ) return; if (!first) tk.acc -= 1 / REC_HZ;
    var me = FL.me, fl = 0; for (var d = 0; d < 4; d++) fl += Math.min(9, Math.round((me.flames[d] || 0) * 9)) * Math.pow(10, d);
    var gi = FL.fire && FL.seated && FL.groups.length ? tk.g.indexOf(FL.groups[FL.wsel]) + 1 : 0;
    tk.f.push([Math.round((me.x - FL.O.x) * 100), Math.round((me.y - FL.O.y) * 100), Math.round(me.a * 1000), Math.round(me.vx * 10), Math.round(me.vy * 10), fl, gi]);
  }
  // Aus damage(): HP-Änderung mitschreiben
  function recLogDmg(bd, b) {
    var tk = REC.take; if (!tk) return;
    var owner = bd === FL.me ? "me" : bd.station ? "st" : bd.trk || bd.trkFrom || null; if (owner == null) return;
    tk.d.push([Math.round(REC.t * 100), owner, b.x, b.y, Math.round(b.hp * 10)]);
  }
  function recFollow() { if (!REC.follow || !FL) return null; var g = recGhostOf(REC.follow); return g || null; }

  // ---------- Anzeige im Flug ----------
  function recOverlay(c, W, H) {
    if (!recDev()) return;
    if (REC.cd > 0) {
      var n = Math.ceil(REC.cd), k = REC.cd - Math.floor(REC.cd);
      c.save(); c.fillStyle = "rgba(0,0,0,.25)"; c.fillRect(0, 0, W, H);
      c.font = "800 " + Math.round(110 + 40 * k) + "px " + FONTS(); c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = "rgba(224,83,63," + (0.5 + 0.5 * k) + ")"; c.fillText(String(n), W / 2, H / 2);
      c.restore();
    }
    var tl = REC.on ? t("recRecording") : REC.play ? t("recPlaying") : "";
    if (tl) { c.save(); c.font = "800 13px " + FONTS(); c.textAlign = "center"; var tw = c.measureText(tl).width + 34; c.fillStyle = "rgba(14,19,28,.85)"; c.fillRect(W / 2 - tw / 2, 70, tw, 26); c.fillStyle = REC.on ? "#E0533F" : "#57D18A"; if (!REC.on || Math.floor(performance.now() / 500) % 2) { c.beginPath(); c.arc(W / 2 - tw / 2 + 13, 83, 5, 0, 6.283); c.fill(); } c.fillText(tl, W / 2 + 7, 88); c.restore(); }
    recTl();
  }
  // Leiste unten: Knöpfe, Spuren, Zeitleiste
  function recUi() {
    if (!V) return; var r = V.root, box = r.querySelector(".sr-rec"); if (!box) return;
    var show = S.ed === "station" && S.mode === "fly" && !!FL; r.querySelector(".sr-root").classList.toggle("recd", show); box.hidden = !show; if (!show) return;
    var busy = REC.on || REC.cd > 0;
    box.querySelector('[data-act="rec-rec"]').setAttribute("aria-pressed", String(busy));
    box.querySelector('[data-act="rec-play"]').setAttribute("aria-pressed", String(REC.play));
    ["rec-play", "rec-home"].forEach(function (a) { box.querySelector('[data-act="' + a + '"]').disabled = busy; });
    var cam = box.querySelector('[data-recf="follow"]'), co = '<option value="0">' + t("recCamMe") + "</option>" + REC.tracks.map(function (q) { return '<option value="' + q.id + '">' + esc(q.name) + "</option>"; }).join("");
    if (cam.getAttribute("data-k") !== co) { cam.innerHTML = co; cam.setAttribute("data-k", co); } cam.value = String(REC.follow || 0);
    var heads = box.querySelector(".sr-rec-heads"), hh = REC.tracks.length ? REC.tracks.map(function (q) {
      return '<div class="sr-rec-h" data-trk="' + q.id + '"><i style="background:' + q.col + '"></i><input data-recname="' + q.id + '" maxlength="28" spellcheck="false" value="' + esc(q.name) + '"><button type="button" data-act="rec-on" data-trk="' + q.id + '" aria-pressed="' + q.on + '" title="' + t("recOn") + '">' + (q.on ? "●" : "○") + '</button><button type="button" data-act="rec-del" data-trk="' + q.id + '" title="' + t("recDelQ") + '">×</button></div>';
    }).join("") : '<p class="sr-rec-none">' + t("recNone") + "</p>";
    if (heads.getAttribute("data-k") !== hh && !(document.activeElement && document.activeElement.hasAttribute && document.activeElement.hasAttribute("data-recname"))) { heads.innerHTML = hh; heads.setAttribute("data-k", hh); }
    box.classList.toggle("closed", !REC.open); box.querySelector(".sr-rec-cv").style.setProperty("--rows", String(Math.max(1, REC.tracks.length + 1)));
    var bh = box.offsetHeight; r.querySelector(".sr-root").style.setProperty("--rb", bh + "px");
  }
  function recScale(cv) { var len = Math.max(20, Math.ceil(Math.max(recMax(), REC.on ? REC.t : 0, REC.t) / 10) * 10 + 5); return { len: len, k: (cv.clientWidth - 16) / len }; }
  // Zeitleiste zeichnen (je Bild)
  function recTl() {
    var box = V.root.querySelector(".sr-rec"); if (!box || box.hidden) return;
    var tm = box.querySelector(".sr-rec-time"), tt = REC.cd > 0 ? "−" + nf(REC.cd, 1) : recClock(REC.t); if (tm.textContent !== tt) tm.textContent = tt;
    var cv = box.querySelector(".sr-rec-cv"), dpr = window.devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight; if (!W || !H) return;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    var c = cv.getContext("2d"); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, W, H);
    var sc = recScale(cv), X = function (s) { return 8 + s * sc.k; }, rowH = 24, top = 18;
    // Lineal
    c.fillStyle = "#0B1018"; c.fillRect(0, 0, W, 16); c.strokeStyle = "#33415A"; c.fillStyle = "#8FA0B8"; c.font = "600 10px " + FONTS(); c.textAlign = "left";
    var step = sc.len > 120 ? 10 : 5;
    for (var s = 0; s <= sc.len; s += 1) { var x = Math.round(X(s)) + 0.5, big = s % step === 0; c.beginPath(); c.moveTo(x, big ? 4 : 10); c.lineTo(x, 16); c.stroke(); if (big) c.fillText(recClock(s, true), x + 3, 11); }
    // Spuren
    var rows = REC.tracks.length + (REC.on ? 1 : 0);
    REC.tracks.forEach(function (q, i) {
      var y = top + i * rowH, len = recLen(q);
      c.fillStyle = "rgba(255,255,255,.03)"; c.fillRect(0, y, W, rowH - 2);
      c.globalAlpha = q.on ? 1 : 0.35; c.fillStyle = q.col + "55"; c.fillRect(X(0), y + 4, len * sc.k, rowH - 10); c.fillStyle = q.col; c.fillRect(X(0), y + 4, len * sc.k, 2);
      // Schüsse (rot) als Striche, Schaden am eigenen Schiff (orange) und zerstörte Blöcke (weiß) als Rauten = Ereignisse auf der Spur
      c.fillStyle = "#E0533F"; for (var f = 0; f < q.f.length; f += 2) if (q.f[f][6]) c.fillRect(X(f / REC_HZ), y + 8, Math.max(1, 2 * sc.k / REC_HZ), 6);
      q.d.forEach(function (e) { if (e[1] !== q.id) return; var dx = X(e[0] / 100), dy = y + rowH - 8, kill = e[4] <= 0; c.fillStyle = kill ? "#FFFFFF" : "#E0814F"; c.beginPath(); c.moveTo(dx, dy - 3.5); c.lineTo(dx + 3.5, dy); c.lineTo(dx, dy + 3.5); c.lineTo(dx - 3.5, dy); c.closePath(); c.fill(); });
      c.globalAlpha = 1;
    });
    if (REC.on && REC.take) { var yy = top + REC.tracks.length * rowH; c.fillStyle = "rgba(224,83,63,.35)"; c.fillRect(X(0), yy + 4, REC.t * sc.k, rowH - 10); c.fillStyle = "#E0533F"; c.fillRect(X(0), yy + 4, REC.t * sc.k, 2); }
    // Abspielkopf
    var px = Math.round(X(REC.t)) + 0.5; c.strokeStyle = REC.on ? "#E0533F" : "#FFFFFF"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(px, 0); c.lineTo(px, Math.max(H, top + rows * rowH)); c.stroke();
    c.fillStyle = c.strokeStyle; c.beginPath(); c.moveTo(px - 5, 0); c.lineTo(px + 5, 0); c.lineTo(px, 7); c.closePath(); c.fill();
  }
  function recClock(s, short) { s = Math.max(0, s); var m = Math.floor(s / 60), r = s - m * 60; return m + ":" + (r < 10 ? "0" : "") + (short ? Math.floor(r) : r.toFixed(1)); }
  // Klick/Ziehen auf der Zeitleiste springt
  function recTlDown(e) {
    var cv = e.currentTarget; if (REC.on || REC.cd > 0) return; e.preventDefault();
    var go = function (ev) { var r = cv.getBoundingClientRect(), sc = recScale(cv); recSeek(Math.max(0, (ev.clientX - r.left - 8) / sc.k)); };
    go(e); var mv = function (ev) { if (ev.buttons) go(ev); }, up = function () { window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", mv); window.addEventListener("pointerup", up);
  }
  function recHtml() {
    return '<div class="sr-rec" hidden><div class="sr-rec-ctl"><b>' + t("recH") + '</b><button type="button" data-act="rec-rec" class="sr-rec-r">' + t("recRec") + '</button><button type="button" data-act="rec-play">' + t("recPlay") + '</button><button type="button" data-act="rec-stop">' + t("recStop") + '</button><button type="button" data-act="rec-home">' + t("recHome") + '</button>' +
      '<span class="sr-rec-time">0:00.0</span><label class="sr-rec-cam"><small>' + t("recCam") + '</small><select data-recf="follow"></select></label><span class="sr-sp"></span><button type="button" data-act="rec-open" class="sr-rec-tg" title="' + t("recHide") + '">▾</button></div>' +
      '<div class="sr-rec-tl"><div class="sr-rec-heads"></div><canvas class="sr-rec-cv"></canvas></div></div>';
  }
  // Knöpfe der Leiste (aus onClick)
  function recClick(act, a) {
    if (act === "rec-rec") { if (REC.on || REC.cd > 0) recStop(); else recStart(); }
    else if (act === "rec-play") { if (REC.play) { REC.play = false; recUi(); } else recPlay(); }
    else if (act === "rec-stop") recStop();
    else if (act === "rec-home") recHome();
    else if (act === "rec-open") { REC.open = !REC.open; recUi(); }
    else if (act === "rec-on" || act === "rec-del") {
      if (REC.on || REC.cd > 0) return true;
      var id = +a.getAttribute("data-trk"), i = REC.tracks.findIndex(function (q) { return q.id === id; }); if (i < 0) return true;
      if (act === "rec-on") REC.tracks[i].on = !REC.tracks[i].on;
      else { REC.tracks.splice(i, 1); if (REC.follow === id) REC.follow = 0; S.ev && S.ev.forEach(function (m) { if (m.trk === id) delete m.trk; }); }
      recStore(); recHome();
    } else return false;
    a.blur && a.blur(); return true;
  }
