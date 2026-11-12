  // ===== 60-zeichnen-flug.js · Zeichnen: Flugansicht (Schweife, Staub, Effekte, Schiffe, Radar, HUD) =====
  // Schweif der Vortriebsdüsen (Schub nach vorne): Punkte bleiben im Raum stehen und verblassen, so sieht man die eigene Bahn
  function trailTick() {
    FL.bodies.forEach(function (bd) {
      bd.blocks.forEach(function (b) {
        var ty = T[b.t]; if (ty.kind !== "thr" || thrustDir(b) !== 0) return;
        // Schweif auch im Gleitflug, solange das Schiff fliegt; mit Schub heller
        var tr = b.trail || (b.trail = []), sp = Math.hypot(bd.vx, bd.vy), fk = Math.max(bd.flames[0] || 0, sp > 2 ? Math.min(0.45, sp / 40) : 0);
        while (tr.length && (tr[0] === null || FL.t - tr[0].t > TRAIL.life)) tr.shift();
        if (fk < 0.05) { if (tr.length && tr[tr.length - 1] !== null) tr.push(null); return; }
        var last = tr[tr.length - 1]; if (last && FL.t - last.t < TRAIL.step) return;
        var f = fp(b), p = toWorld(bd, b.x + f[0] / 2 + DV[2][0] * ty.h / 2, b.y + f[1] / 2 + DV[2][1] * ty.h / 2);
        tr.push({ x: p.x, y: p.y, t: FL.t, k: fk, w: ty.w * CELL_M * 0.32 });
      });
    });
  }
  function drawTrails(c) {
    c.lineCap = "butt";
    FL.bodies.forEach(function (bd) {
      bd.blocks.forEach(function (b) {
        var tr = b.trail; if (!tr || tr.length < 2) return;
        for (var i = 1; i < tr.length; i++) {
          var a = tr[i - 1], q = tr[i]; if (!a || !q) continue;
          var age = (FL.t - q.t) / TRAIL.life; if (age >= 1) continue;
          c.strokeStyle = "rgba(150,200,255," + (TRAIL.alpha * (1 - age) * Math.min(1, q.k * 1.4)) + ")"; c.lineWidth = q.w * (1 - age * 0.6);
          c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(q.x, q.y); c.stroke();
        }
      });
    });
    c.lineCap = "butt";
  }
  // Staub für das Tempogefühl: eine Schicht auf Höhe der Schiffe (Parallaxe 1) und sehr wenige große, weiche Körner
  // zwischen Schiff und Kamera (Parallaxe 2,2), die am schnellsten vorbeiziehen. Mit Tempo werden sie zu kurzen Bewegungsstreifen.
  function dHash(x, y, i, sd) { var v = Math.sin(x * 127.1 + y * 311.7 + i * 74.7 + sd * 19.3) * 43758.5453; return v - Math.floor(v); }
  function drawDust(c, W, H, ppm, L) {
    var sc = ppm * L.f, cx = FL.cam.x, cy = FL.cam.y, hw = W / 2 / sc, hh = H / 2 / sc;
    var src = FL.out && FL.eva ? FL.eva : FL.me, vx = src.vx || 0, vy = src.vy || 0, vs = Math.hypot(vx, vy);
    var fade = L.f === 1 ? Math.min(1, ppm / 4) : 1; if (fade <= 0.05) return;
    // Streifen: Belichtungszeit 35 ms, begrenzt auf 140 px, erst ab spürbarem Tempo
    var sl = Math.min(140, vs * sc * 0.035), sx = vs > 0 ? -vx / vs * sl : 0, sy = vs > 0 ? -vy / vs * sl : 0, streak = sl > 1.5;
    var px = Math.max(L.minPx, Math.min(L.maxPx, L.size * sc)), x0 = Math.floor((cx - hw) / L.tile) - 1, x1 = Math.floor((cx + hw) / L.tile) + 1, y0 = Math.floor((cy - hh) / L.tile) - 1, y1 = Math.floor((cy + hh) / L.tile) + 1;
    if ((x1 - x0) * (y1 - y0) > 900) return;
    var a = L.alpha * fade * (streak ? Math.max(0.55, 1 - sl / 300) : 1);
    c.save();
    c.strokeStyle = "rgba(" + L.col + "," + a + ")"; c.fillStyle = c.strokeStyle; c.lineWidth = px; c.lineCap = "round";
    if (streak) c.beginPath();
    for (var ix = x0; ix <= x1; ix++) for (var iy = y0; iy <= y1; iy++) for (var i = 0; i < L.n; i++) {
      if (L.prob < 1 && dHash(ix, iy, i + 7, L.seed) > L.prob) continue;
      var ux = (ix + dHash(ix, iy, i, L.seed)) * L.tile, uy = (iy + dHash(ix, iy, i + 3, L.seed)) * L.tile;
      var X = W / 2 + (ux - cx) * sc, Y = H / 2 + (uy - cy) * sc;
      if (X < -sl - 10 || X > W + sl + 10 || Y < -sl - 10 || Y > H + sl + 10) continue;
      if (streak) { c.moveTo(X, Y); c.lineTo(X + sx, Y + sy); } else c.fillRect(X - px / 2, Y - px / 2, px, px);
    }
    if (streak) c.stroke();
    c.restore();
  }
  // Eintritt in hohe Geschwindigkeit: kaum spürbares Wackeln (max. 2 px) und kurze chromatische Aberration (SVG-Filter auf dem Canvas)
  function fxPre(ppm, tm) {
    var dt = FL.fxT ? Math.min(0.05, tm - FL.fxT) : 0; FL.fxT = tm;
    var off = { x: 0, y: 0 };
    if (FL.shake > 0) { FL.shake -= dt; var a = 2 * Math.max(0, FL.shake / 0.7); off.x = (Math.sin(tm * 53) + Math.sin(tm * 31.7)) * 0.5 * a / ppm; off.y = (Math.sin(tm * 47.3) + Math.cos(tm * 29.1)) * 0.5 * a / ppm; }
    var f = V.root.querySelector("#srCAo1");
    if (FL.ca > 0 && f) {
      FL.ca -= dt; var k = Math.max(0, FL.ca / 0.5), me = FL.me, sp = Math.hypot(me.vx, me.vy) || 1, d = 3.2 * k;
      var dx = (me.vx / sp) * d, dy = (me.vy / sp) * d;
      f.setAttribute("dx", dx.toFixed(2)); f.setAttribute("dy", dy.toFixed(2));
      var f2 = V.root.querySelector("#srCAo2"); f2.setAttribute("dx", (-dx).toFixed(2)); f2.setAttribute("dy", (-dy).toFixed(2));
      if (!V.caOn) { V.cv.style.filter = "url(#srCA)"; V.caOn = true; }
    } else if (V.caOn) { V.cv.style.filter = ""; V.caOn = false; }
    return off;
  }
  // Kurzer Schriftzug über dem Schiff: 0,5 s sichtbar, bis 1 s ausgeblendet
  function floatTxt(txt, rgb) { if (FL) FL.flt = { txt: txt, t0: FL.t, rgb: rgb || "232,236,239" }; }
  function drawFloat(c, W, H, ppm) {
    var f = FL.flt; if (!f) return;
    var age = FL.t - f.t0; if (age >= 1) { FL.flt = null; return; }
    var a = age < 0.5 ? 1 : 1 - (age - 0.5) / 0.5, me = FL.me;
    var x = W / 2 + (me.x - FL.cam.x) * ppm, y = H / 2 + (me.y - FL.cam.y) * ppm - Math.max(40, me.rad * ppm * 0.85) - 14 - age * 10;
    c.save(); c.font = "600 13px " + FONTS(); c.textAlign = "center"; c.textBaseline = "middle";
    c.fillStyle = "rgba(0,0,0," + 0.5 * a + ")"; c.fillText(f.txt, x + 1, y + 1);
    c.fillStyle = "rgba(" + f.rgb + "," + a + ")"; c.fillText(f.txt, x, y); c.restore();
  }
  function flDraw() {
    var c = V.ctx, W = V.W, H = V.H, z = V.zoom, s = PX * z, ppm = s / CELL_M, tm = performance.now() / 1000;
    var shk = fxPre(ppm, tm); FL.cam.x += shk.x; FL.cam.y += shk.y;
    drawSpace(c, W, H, FL.cam.x * ppm, FL.cam.y * ppm);
    envFlDraw(c, W, H, ppm, -1);   // Environment hinten
    drawDust(c, W, H, ppm, DUST.near);
    envFlDraw(c, W, H, ppm, 0);    // Environment Spielebene
    c.save(); c.translate(W / 2, H / 2); c.scale(ppm, ppm); c.translate(-FL.cam.x, -FL.cam.y);
    drawTrails(c);
    // Triebwerksflammen unter den Schiffen
    FL.bodies.forEach(function (bd) {
      bd.blocks.forEach(function (b) {
        var ty = T[b.t]; if (ty.kind !== "thr") return;
        var d = thrustDir(b), fk = bd.flames[d] || 0; if (fk < 0.02) return;
        var ex = dirWorld(bd, (d + 2) % 4), f = fp(b), base = toWorld(bd, b.x + f[0] / 2 + DV[(d + 2) % 4][0] * ty.h / 2, b.y + f[1] / 2 + DV[(d + 2) % 4][1] * ty.h / 2);
        var ocx = bd === FL.me && FL.oc, L = (ty.w + 1) * CELL_M * (0.2 + 1.1 * fk) * (ocx ? 1.45 : 1) * (0.88 + Math.random() * 0.24), wd = ty.w * CELL_M * (0.18 + 0.16 * fk) * (ocx ? 1.2 : 1);
        var gr = c.createLinearGradient(base.x, base.y, base.x + ex.x * L, base.y + ex.y * L);
        if (ocx) { gr.addColorStop(0, "rgba(255,255,255,.98)"); gr.addColorStop(0.3, "rgba(200,140,255,.85)"); gr.addColorStop(1, "rgba(150,80,255,0)"); }
        else { gr.addColorStop(0, "rgba(190,240,255,.95)"); gr.addColorStop(0.35, "rgba(90,170,255,.7)"); gr.addColorStop(1, "rgba(60,100,255,0)"); }
        if (ocx) {   // Overcharge: wilder, ausfransender Strahl statt spitzer Flamme
          var ang = Math.atan2(ex.y, ex.x);
          c.save(); c.translate(base.x, base.y); c.rotate(ang);
          for (var lb = 0; lb < 7; lb++) {
            var la = (Math.random() - 0.5) * 0.7, ll = L * (0.45 + Math.random() * 0.7), lwd = wd * (0.45 + Math.random() * 0.8);
            var g2 = c.createLinearGradient(0, 0, ll, 0); g2.addColorStop(0, "rgba(255,255,255,.9)"); g2.addColorStop(0.35, "rgba(205,150,255,.6)"); g2.addColorStop(1, "rgba(140,70,255,0)");
            c.save(); c.rotate(la); c.fillStyle = g2; c.beginPath(); c.moveTo(0, -wd * 0.8);
            c.quadraticCurveTo(ll * 0.45, -lwd * 1.3, ll, -lwd * (0.3 + Math.random() * 0.5)); c.lineTo(ll * (0.85 + Math.random() * 0.2), 0); c.lineTo(ll, lwd * (0.3 + Math.random() * 0.5));
            c.quadraticCurveTo(ll * 0.45, lwd * 1.3, 0, wd * 0.8); c.closePath(); c.fill(); c.restore();
          }
          c.fillStyle = "rgba(255,255,255,.85)"; c.beginPath(); c.ellipse(wd * 0.3, 0, wd * 0.8, wd * 0.6, 0, 0, Math.PI * 2); c.fill();
          c.restore();
          if (Math.random() < 0.6) { var sa = ang + (Math.random() - 0.5) * 0.9, sv = 25 + Math.random() * 30; FL.parts.push({ x: base.x, y: base.y, vx: bd.vx + Math.cos(sa) * sv, vy: bd.vy + Math.sin(sa) * sv, life: 0, max: 0.25 + Math.random() * 0.3, k: "ocs", sz: 0.4 }); }
        } else { c.fillStyle = gr; c.beginPath(); c.moveTo(base.x - ex.y * wd, base.y + ex.x * wd); c.lineTo(base.x + ex.x * L, base.y + ex.y * L); c.lineTo(base.x + ex.y * wd, base.y - ex.x * wd); c.closePath(); c.fill(); }
      });
    });
    FL.bodies.forEach(function (bd) {
      c.save(); c.translate(bd.x, bd.y); c.rotate(bd.a); c.scale(CELL_M / PX, CELL_M / PX); c.translate(-bd.com[0] * PX, -bd.com[1] * PX);
      drawShip(c, bd.blocks, PX, bd.enemy ? "out" : S.view, tm, bd, bd.map);
      if (bd === FL.me && S.view === "in") {
        // Angedockt und niemand an Bord: Licht aus; beim Betreten gehen die Lampen kurz flackernd an
        var dark = FL.dock && FL.dock.done && (FL.out || (FL.pb || FL.me) !== FL.me), lt = bd.light === undefined ? 1 : bd.light;
        lt = dark ? Math.max(0, lt - 0.02) : Math.min(1, lt + 0.035); bd.light = lt;
        var fl = !dark && lt < 1 && lt > 0.15 && Math.sin(tm * 60) > 0.6 ? 0.25 : 0;
        if (lt < 1) { c.fillStyle = "rgba(4,6,12," + (0.78 * (1 - lt) + fl) + ")"; bd.cells.forEach(function (q) { c.fillRect((q[0] - 0.5) * PX, (q[1] - 0.5) * PX, PX, PX); }); }
      }
      if (bd === FL.me && !FL.seated && (FL.pb || FL.me) === FL.me) drawGhosts(c, bd, tm);
      if (bd === (FL.pb || FL.me) && !FL.seated && !FL.out) drawAstronaut(c, FL.pilot.x * PX, FL.pilot.y * PX, FL.pilot.face, FL.pilot.ph, PX / 24 * 1.25, FL.welding, FL.slot === 2 ? 1 : FL.slot === 3 ? 2 : 0);
      // Überhitzung und Ladung an den Waffen
      bd.blocks.forEach(function (b) {
        var ty = T[b.t], f = fp(b), cx = (b.x + f[0] / 2) * PX, cy = (b.y + f[1] / 2) * PX;
        if (ty.kind === "mg" && (b.oh > 0 || (b.heat || 0) >= MG.warn)) {
          c.save(); c.translate(cx, cy); c.rotate(-bd.a);
          if (b.oh > 0) {
            c.strokeStyle = "rgba(255,255,255,.25)"; c.lineWidth = 3; c.beginPath(); c.arc(0, -PX * 1.4, PX * 0.55, 0, Math.PI * 2); c.stroke();
            c.strokeStyle = "#E0533F"; c.beginPath(); c.arc(0, -PX * 1.4, PX * 0.55, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (b.oh / (b.ohMax || MG.lock))); c.stroke();
            c.fillStyle = "#E0533F"; c.font = "800 12px " + FONTS(); c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("!!!", 0, -PX * 1.4);
          } else { c.fillStyle = "#E3B83F"; c.fillRect(-7, -PX * 1.4 - 9, 14, 18); c.fillStyle = "#151715"; c.font = "800 13px " + FONTS(); c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("!", 0, -PX * 1.4 + 1); }
          c.restore();
        }
      });
      c.restore();
    });
    if (FL.out && FL.eva) { c.save(); c.translate(FL.eva.x, FL.eva.y); c.scale(CELL_M / PX, CELL_M / PX); drawAstronaut(c, 0, 0, FL.eva.face, FL.eva.ph, 1.25, FL.welding, FL.slot === 2 ? 1 : FL.slot === 3 ? 2 : 0); c.restore(); }
    (FL.missiles || []).forEach(function (m) {
      c.save(); c.translate(m.x, m.y); c.rotate(m.h); if (m.k > 1) c.scale(1.7, 1.7);   // Schwere Rakete: größer
      c.fillStyle = "rgba(255,190,90,.85)"; c.beginPath(); c.moveTo(-0.9, -0.28); c.lineTo(-2.4 - Math.random() * 0.8, 0); c.lineTo(-0.9, 0.28); c.closePath(); c.fill();
      c.fillStyle = "#E9ECEE"; c.fillRect(-0.9, -0.22, 1.6, 0.44); c.fillStyle = "#C8473A"; c.beginPath(); c.moveTo(0.7, -0.22); c.lineTo(1.1, 0); c.lineTo(0.7, 0.22); c.closePath(); c.fill();
      c.restore();
    });
    // Gegner: rotes ! beim Entdecken, Schild „Kampfunfähig“ über besiegten Schiffen
    FL.bodies.forEach(function (bd) {
      if (!bd.enemy) return;
      var yy = bd.y - bd.rad * 0.8 - 14 / ppm;
      if (bd.ai && bd.ai.alert > 0) { c.fillStyle = "rgba(224,83,63," + Math.min(1, bd.ai.alert * 2) + ")"; c.font = "800 " + (20 / ppm) + "px " + FONTS(); c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("!", bd.x, yy); }
      if (bd.dead || bd.disarmed) { var lb = t(bd.dead ? "destroyed" : "ko"); c.font = "700 " + (11 / ppm) + "px " + FONTS(); c.textAlign = "center"; c.textBaseline = "middle"; var tw = c.measureText(lb).width; c.fillStyle = "rgba(20,24,30,.8)"; c.fillRect(bd.x - tw / 2 - 5 / ppm, yy - 8 / ppm, tw + 10 / ppm, 16 / ppm); c.fillStyle = bd.dead ? "#F08A78" : "#C9D1D9"; c.fillText(lb, bd.x, yy); }
    });
    // Schildtreffer: dünne blaue Schicht direkt über der Panzerung, nur rund um die Einschlagstelle, blendet in 0,5 s aus
    if (FL.shHits.length) {
      c.save(); c.globalCompositeOperation = "lighter";
      FL.shHits = FL.shHits.filter(function (h) {
        var age = FL.t - h.t, bd = h.bd; if (age > 0.5 || FL.bodies.indexOf(bd) < 0) return false;
        var a = 1 - age / 0.5, R2 = 2.3, ca = Math.cos(bd.a), sa = Math.sin(bd.a), half = CELL_M * 0.5 + 0.35;
        c.save(); c.translate(bd.x, bd.y); c.rotate(bd.a);
        bd.cells.forEach(function (q) {
          var d = Math.hypot(q[0] - h.lx, q[1] - h.ly); if (d > R2) return;
          var k = Math.pow(1 - d / R2, 1.6) * a, lx = (q[0] - bd.com[0]) * CELL_M, ly = (q[1] - bd.com[1]) * CELL_M;
          c.fillStyle = "rgba(80,160,255," + (0.32 * k) + ")"; c.fillRect(lx - half, ly - half, half * 2, half * 2);
        });
        var hx = (h.lx - bd.com[0]) * CELL_M, hy = (h.ly - bd.com[1]) * CELL_M, rr = 0.6 + (1 - a) * 1.6;
        c.strokeStyle = "rgba(170,215,255," + (0.85 * a) + ")"; c.lineWidth = 0.25; c.beginPath(); c.arc(hx, hy, rr, 0, Math.PI * 2); c.stroke();
        c.fillStyle = "rgba(210,235,255," + (0.7 * a) + ")"; c.beginPath(); c.arc(hx, hy, 0.35 * a + 0.1, 0, Math.PI * 2); c.fill();
        c.restore();
        return true;
      });
      c.restore();
    }
    drawLead(c, ppm, tm);
    drawDockHint(c, ppm);
    // Treffermarker: kleines x
    FL.hits.forEach(function (h) {
      var a = 1 - h.life / 0.35, r = (h.crit ? 7 + h.life * 10 : 4 + h.life * 6) / ppm;
      c.strokeStyle = "rgba(0,0,0," + 0.5 * a + ")"; c.lineWidth = 3 / ppm; c.beginPath(); c.moveTo(h.x - r, h.y - r); c.lineTo(h.x + r, h.y + r); c.moveTo(h.x + r, h.y - r); c.lineTo(h.x - r, h.y + r); c.stroke();
      c.strokeStyle = h.crit ? "rgba(255,210,80," + a + ")" : "rgba(255,255,255," + a + ")"; c.lineWidth = (h.crit ? 2 : 1.4) / ppm; c.stroke();
    });
    // Zielcomputer: roter Ziellaser der Railgun, solange sie lädt
    FL.bodies.forEach(function (bd) {
      if (!bd.tcomp) return;
      bd.blocks.forEach(function (b) {
        if (T[b.t].kind !== "rg" || !(b.chg > 0)) return;
        var d = gunDir(bd, b), p = gunTip(bd, b), L = RG.range;
        for (var q = 2; q < RG.range; q += 2) { var h = hitAt(p.x + d.x * q, p.y + d.y * q, bd); if (h || (FL.envG.length && envHit(p.x + d.x * q, p.y + d.y * q))) { L = q; break; } }
        var k = Math.min(1, b.chg / RG.charge);
        c.strokeStyle = "rgba(255,60,50," + (0.25 + 0.45 * k) + ")"; c.lineWidth = (0.6 + 0.8 * k) / ppm * 2;
        c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x + d.x * L, p.y + d.y * L); c.stroke();
        if (L < RG.range) { c.fillStyle = "rgba(255,90,70," + (0.5 + 0.5 * k) + ")"; c.beginPath(); c.arc(p.x + d.x * L, p.y + d.y * L, 3 / ppm, 0, Math.PI * 2); c.fill(); }
      });
    });
    // Geschosse, Strahlen, Partikel
    c.strokeStyle = "#FFD27A"; c.lineWidth = 0.5;
    FL.shots.forEach(function (p) { if (p.pl || p.k) return; var l = Math.hypot(p.vx, p.vy) || 1; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - p.vx / l * 2.4, p.y - p.vy / l * 2.4); c.stroke(); });
    // Geschützgranaten: dicker, länger, glühend
    FL.shots.forEach(function (p) {
      if (!p.k) return; var l = Math.hypot(p.vx, p.vy) || 1, big = p.k === "g120", L = big ? 5.5 : 3.6;
      c.strokeStyle = big ? "rgba(255,150,60,.55)" : "rgba(255,190,90,.5)"; c.lineWidth = big ? 2.4 : 1.4; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - p.vx / l * L, p.y - p.vy / l * L); c.stroke();
      c.strokeStyle = big ? "#FFE0A8" : "#FFE9B8"; c.lineWidth = big ? 1 : 0.6; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - p.vx / l * L * 0.6, p.y - p.vy / l * L * 0.6); c.stroke();
    });
    // Pistolenkugeln: kleiner und kürzer
    var lw0 = c.lineWidth; c.lineWidth = 0.14; c.strokeStyle = "#FFE3A0";
    FL.shots.forEach(function (p) { if (!p.pl) return; var l = Math.hypot(p.vx, p.vy) || 1; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - p.vx / l * 0.9, p.y - p.vy / l * 0.9); c.stroke(); });
    c.lineWidth = lw0;
    FL.beams.forEach(function (b) { var a = 1 - b.life / 0.3; c.strokeStyle = "rgba(140,230,255," + a + ")"; c.lineWidth = 1.4 * a + 0.2; c.beginPath(); c.moveTo(b.x0, b.y0); c.lineTo(b.x1, b.y1); c.stroke(); c.strokeStyle = "rgba(255,255,255," + a + ")"; c.lineWidth = 0.4; c.stroke(); });
    FL.parts.forEach(function (q) {
      var k = q.life / q.max;
      if (q.k === "smoke") { c.fillStyle = "rgba(70,70,74," + (0.38 * (1 - k)) + ")"; c.beginPath(); c.arc(q.x, q.y, q.sz * (1 + k * 1.6), 0, Math.PI * 2); c.fill(); }
      else if (q.k === "fire") { c.fillStyle = "rgba(255," + Math.round(200 - k * 140) + ",60," + (0.9 * (1 - k)) + ")"; c.beginPath(); c.arc(q.x, q.y, q.sz * (1 - k * 0.5), 0, Math.PI * 2); c.fill(); }
      else if (q.k === "ocs") { c.fillStyle = "rgba(220,180,255," + (1 - k) + ")"; c.fillRect(q.x, q.y, 0.45, 0.45); }
      else if (q.k === "steam") { if (q.life < 0) return; c.fillStyle = "rgba(225,232,240," + (0.38 * (1 - k)) + ")"; c.beginPath(); c.arc(q.x, q.y, q.sz * (1 + k * 2.2), 0, Math.PI * 2); c.fill(); }
      else if (q.k === "suck") { c.fillStyle = "rgba(110,180,255," + (0.45 * Math.sin(Math.PI * k)) + ")"; c.beginPath(); c.arc(q.x, q.y, q.sz * (1.4 - k), 0, Math.PI * 2); c.fill(); }
      else if (q.k === "jet") { c.fillStyle = "rgba(220,235,255," + (0.8 * (1 - k)) + ")"; c.beginPath(); c.arc(q.x, q.y, q.sz * (1 + k), 0, Math.PI * 2); c.fill(); }
      else if (q.k === "weld") { c.fillStyle = "rgba(170,230,255," + (1 - k) + ")"; c.fillRect(q.x, q.y, 0.35, 0.35); }
      else if (q.k === "spark") { c.fillStyle = "rgba(255,230,160," + (1 - k) + ")"; c.fillRect(q.x, q.y, 0.4, 0.4); }
      else if (q.k === "flash") { c.fillStyle = "rgba(255,240,200," + (1 - k) + ")"; c.beginPath(); c.arc(q.x, q.y, q.sz, 0, Math.PI * 2); c.fill(); }
      else if (q.k === "debris") { c.save(); c.translate(q.x, q.y); c.rotate(q.a); c.globalAlpha = 1 - k * k; c.fillStyle = q.col; c.fillRect(-q.sz / 2, -q.sz / 2, q.sz, q.sz * 0.6); c.restore(); c.globalAlpha = 1; }
    });
    c.restore();
    envFlDraw(c, W, H, ppm, 1);    // Environment vorne
    drawDust(c, W, H, ppm, DUST.front);
    radarEdges(c, W, H, ppm);
    drawFloat(c, W, H, ppm);
    FL.cam.x -= shk.x; FL.cam.y -= shk.y;
    flHud();
  }
  // Antennen: Gegner außerhalb des Bildes, aber in Antennenreichweite, als rotes Dreieck am Bildschirmrand
  function antRange(bd) { return bd.nAnt ? Math.min(1800, 600 + 300 * (bd.nAnt - 1)) * (bd.player ? 1 + PM.radar : 1) : 0; }
  function radarEdges(c, W, H, ppm) {
    var me = FL.me, rg = antRange(me); if (!rg || FL.bodies.indexOf(me) < 0) return;
    FL.bodies.forEach(function (bd) {
      if (!bd.enemy || bd.dead) return;
      var d = Math.hypot(bd.x - me.x, bd.y - me.y); if (d > rg) return;
      var sx = W / 2 + (bd.x - FL.cam.x) * ppm, sy = H / 2 + (bd.y - FL.cam.y) * ppm, m = 26;
      if (sx > -10 && sx < W + 10 && sy > -10 && sy < H + 10) return;
      var vx = sx - W / 2, vy = sy - H / 2, L = m, R = W - m, Tp = 84, Bt = H - m;   // oben unter der Werkzeugleiste bleiben
      var k = Math.min(vx > 0 ? (R - W / 2) / vx : vx < 0 ? (L - W / 2) / vx : 1e9, vy > 0 ? (Bt - H / 2) / vy : vy < 0 ? (Tp - H / 2) / vy : 1e9), ex = W / 2 + vx * k, ey = H / 2 + vy * k, an = Math.atan2(vy, vx);
      c.save(); c.translate(ex, ey); c.rotate(an); c.globalAlpha = 0.55 + 0.35 * (1 - d / rg);
      c.fillStyle = "#E0533F"; c.beginPath(); c.moveTo(11, 0); c.lineTo(-5, -6.5); c.lineTo(-1.5, 0); c.lineTo(-5, 6.5); c.closePath(); c.fill();
      c.restore();
      c.fillStyle = "rgba(240,138,120,.75)"; c.font = "600 10px " + FONTS(); c.textAlign = "center"; c.textBaseline = "middle";
      c.fillText(nf(d) + " m", ex - Math.cos(an) * 20, ey - Math.sin(an) * 20);
    });
  }
  // Hologramme zerstörter Blöcke in der Nähe der Figur: blau = lässt sich aufbauen, rot = erst Nachbarblock aufbauen
  function drawGhosts(c, bd, tm) {
    if (!bd.lost || !bd.lost.length) return;
    var p = FL.out && FL.eva ? toLocal(bd, FL.eva.x, FL.eva.y) : FL.pilot;
    bd.lost.forEach(function (g) {
      var f = fp(g); if (Math.hypot(g.x + f[0] / 2 - p.x, g.y + f[1] / 2 - p.y) > 6) return;
      var ok = canRebuild(bd, g), on = FL.weldG === g, pulse = 0.5 + 0.5 * Math.sin(tm * 5);
      c.save(); c.globalAlpha = on ? 0.55 : 0.32; drawBlock(c, g, PX, S.view, 1, tm, null); c.restore();
      c.fillStyle = ok ? "rgba(90,200,255," + (0.16 + (on ? 0.14 * pulse : 0)) + ")" : "rgba(240,90,70,.2)";
      c.strokeStyle = ok ? "rgba(140,225,255,.85)" : "rgba(240,110,90,.8)"; c.lineWidth = 1.2; c.setLineDash([4, 3]);
      cellsOf(g).forEach(function (q) { c.fillRect(q.c[0] * PX, q.c[1] * PX, PX, PX); });
      c.strokeRect(g.x * PX + 0.6, g.y * PX + 0.6, f[0] * PX - 1.2, f[1] * PX - 1.2); c.setLineDash([]);
    });
  }
  function mmss(sec) { sec = Math.max(0, Math.ceil(sec)); return Math.floor(sec / 60) + ":" + ("0" + sec % 60).slice(-2); }
  function flHud() {
    var rootEl = V.root.querySelector(".sr-root"), ft = !FL.seated; if (rootEl.classList.contains("foot") !== ft) { rootEl.classList.toggle("foot", ft); syncHot(); }
    // Standardansicht: im Cockpit außen, zu Fuß innen (mit V weiterhin umschaltbar)
    if (FL.seatWas !== FL.seated) { FL.seatWas = FL.seated; S.view = FL.seated ? "out" : "in"; syncUI(); }
    var snb = V.root.querySelector(".sr-shipn"); if (snb && !snb.classList.contains("edit")) { var nm = FL.me.name || t("shipDef"); if (snb.textContent !== nm) snb.textContent = nm; }
    var me = FL.me, sp = Math.hypot(me.vx, me.vy), g = FL.groups[FL.wsel];
    set("sr-h-sp", nf(sp, 1) + " m/s");
    // Tempo: rotes „Hoch“ über 120 m/s, an der Sperre ein ruhiger Hinweis „⇧ Limit“ (feste Breite, nichts springt)
    var hiNow = sp > VHI + 0.3, atLim = !FL.hiOk && sp >= VHI - 1;
    set("sr-h-spb", hiNow ? t("hiBadge") + (sp >= VMAX - 0.5 ? " · max" : "") : atLim ? t("limBadge") : "");
    var spb = V.root.querySelector("#sr-h-spb"); if (spb) spb.className = hiNow ? "hi" : atLim ? "lim" : "";
    var spEl = V.root.querySelector("#sr-h-sp"); if (spEl) spEl.className = hiNow ? "hi" : "";
    function lit(id, on) { var e = V.root.querySelector(id); if (e && e.classList.contains("lit") !== !!on) e.classList.toggle("lit", !!on); }
    lit("#sr-ic-z", FL.damp); lit("#sr-ic-c", FL.cruise); lit("#sr-ic-h", FL.hiOk); lit("#sr-ic-x", FL.oc);
    var ek = me.cap ? me.energy / me.cap : 0, sk = me.cap ? (me.shE || 0) / me.cap : 0, eb = V.root.querySelector("#sr-h-ebar"); if (eb) { eb.style.width = (ek * 100).toFixed(1) + "%"; eb.style.background = ek < 0.2 ? "#E0533F" : "#57D18A"; }
    var sbh = V.root.querySelector("#sr-h-sbar"); if (sbh) sbh.style.width = (sk * 100).toFixed(1) + "%";
    set("sr-shp-v", FL.shPct + " %"); set("sr-shp-n", me.shGen ? "" : t("shNoGen"));
    // Energieanzeige unten in der Mitte
    var be = V.root.querySelector("#sr-be-e"), bs = V.root.querySelector("#sr-be-s");
    if (be) { be.style.width = (ek * 100).toFixed(1) + "%"; be.style.background = ek < 0.2 ? "#E0533F" : "#57D18A"; bs.style.width = (sk * 100).toFixed(1) + "%"; }
    set("sr-be-t", t("shield") + " " + Math.floor((me.shE || 0) / me.cap * 100 + 1e-6) + " %  ·  " + nf(me.energy) + "  /  " + nf(me.cap));
    set("sr-h-en", nf(me.energy) + " / " + nf(me.cap));
    var ob = V.root.querySelector("#sr-h-ocbar"); if (ob) { ob.style.width = Math.round(FL.ocT / (me.ocMax || 3) * 100) + "%"; ob.style.background = FL.oc ? "#B98AE0" : "#6B7FA0"; }
    var wtxt = g ? t(g) : t("none");
    if (g === "mg") { var h = 0, oh = 0; me.blocks.forEach(function (b) { if (T[b.t].kind === "mg") { h = Math.max(h, b.heat || 0); oh = Math.max(oh, b.oh || 0); } }); wtxt += oh > 0 ? " · !!! " + nf(oh, 1) + " s" : " · " + Math.round(h * 100) + " %"; }
    if (g === "msl" || g === "msh") { var am = 0, mx = 0, mq = me.mst && me.mst[g]; me.blocks.forEach(function (b) { if (b.t === g) { am += b.ammo === undefined ? msMax(b) : b.ammo; mx += msMax(b); } }); wtxt += mq && mq.rl > 0 ? (lang === "de" ? " · lädt " : " · reloading ") + nf(mq.rl, 1) + " s" : " · " + am + " / " + mx; }
    if (GUN[g]) { var gc = 0; me.blocks.forEach(function (b) { if (b.t === g) gc = Math.max(gc, b.gcd || 0); }); wtxt += gc > 0.05 ? " · " + nf(gc, 1) + " s" : " · " + t("wReady"); }
    if (g === "rg") { var cd = 0; me.blocks.forEach(function (b) { if (T[b.t].kind === "rg") cd = Math.max(cd, b.cd || 0); }); wtxt += cd > 0 ? " · " + nf(cd, 1) + " s" : " · bereit".replace("bereit", lang === "de" ? "bereit" : "ready"); }
    var tn = 0, ta = 0; me.blocks.forEach(function (b) { if (T[b.t].kind === "tur") { tn++; if (b.tgt) ta++; } });   // Turrets: Anzahl, davon mit Ziel
    if (tn) wtxt += " · " + t("hTur") + " " + ta + "/" + tn;   // z. B. „Turrets 2/4“: zwei von vier haben ein Ziel
    set("sr-h-w", wtxt);
    set("sr-h-seat", FL.out ? t("hOut") : !me.seat ? t("hGone") : FL.seated ? t("hSeat") : t("hWalk"));
    var ak = FL.suit / SUIT.max, ab = V.root.querySelector("#sr-h-airbar"); if (ab) { ab.style.width = Math.round(ak * 100) + "%"; ab.style.background = FL.breath === "room" ? "#57D18A" : ak < 0.25 ? "#E0533F" : "#E3B83F"; }
    set("sr-h-air", (FL.breath === "room" ? "" : t(FL.breath === "jet" ? "airJet" : "airSuit") + " · ") + mmss(FL.suit));
    var ae = V.root.querySelector("#sr-h-air"); if (ae) ae.className = FL.breath === "room" ? "on" : ak < 0.25 ? "warn" : "off";
    var sb = V.root.querySelector('[data-act="seat"]'); if (sb) { set("sr-h-seatb", FL.seated ? t("exitSeat") : t("sitDown")); }
    var wb = V.root.querySelector("#sr-h-weld"); if (wb) { wb.parentNode.hidden = FL.seated || FL.slot !== 1; set("sr-h-weld", FL.weldG ? fmt(t(FL.weldOk ? "weldBuild" : "weldWait"), { n: T[FL.weldG.t].n[lang] }) : FL.weldB ? fmt(t("weldOn"), { n: T[FL.weldB.t].n[lang], p: Math.round(FL.weldB.hp / hpMax(FL.me, FL.weldB) * 100) }) : t("hWeldIdle")); }
    var se = V.root.querySelector("#sr-h-seat"); if (se) se.className = !me.seat ? "warn" : "";
  }

