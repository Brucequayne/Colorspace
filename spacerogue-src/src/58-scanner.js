  // ===== 58-scanner.js · Scanner (v0.57.5) =====
  // Ein Scanner-Block nutzt die Reichweite der Antennen (antRange) und zeigt Strukturen in der Umgebung am Bildrand:
  // Asteroiden (Spielebene), Raumstationen und Wracks (zerstörte Schiffe, abgerissene Trümmer). Ohne Antenne zeigt er nichts.
  var SCAN = { ast: 8, col: { ast: "#A7B0BA", st: "#7FB2E0", wr: "#E3B83F" } };
  function scanTargets(me, rg) {
    var L = [], A = [];
    (FL.envG || []).forEach(function (e) { var d = Math.hypot(e.x - me.x, e.y - me.y) - e.R; if (d < rg) A.push({ x: e.x, y: e.y, d: Math.max(0, d), k: "ast" }); });
    A.sort(function (a, b) { return a.d - b.d; }); L = A.slice(0, SCAN.ast);   // nur die nächsten Asteroiden, sonst wird der Rand voll
    FL.bodies.forEach(function (bd) {
      if (bd === me || bd === FL.pb || bd.target) return;   // Übungsziele zählen nicht
      var k = bd.station ? "st" : (bd.dead || (!bd.enemy && !bd.ctrl)) ? "wr" : null; if (!k) return;
      var d = Math.hypot(bd.x - me.x, bd.y - me.y) - (bd.rad || 0); if (d < rg) L.push({ x: bd.x, y: bd.y, d: Math.max(0, d), k: k });
    });
    return L;
  }
  // Randmarker nicht unter dem Infofeld links verstecken: liegt der Punkt darunter, rückt er rechts daneben
  function hudDodge(x, y) {
    var h = V.root.querySelector(".sr-hud"), cv = V.cv.getBoundingClientRect(); if (!h || h.hidden) return x;
    var r = h.getBoundingClientRect(), l = r.left - cv.left, t0 = r.top - cv.top;
    return (x > l - 30 && x < l + r.width + 10 && y > t0 - 20 && y < t0 + r.height + 20) ? l + r.width + 34 : x;
  }
  function scanEdges(c, W, H, ppm) {
    var me = FL.me; if (!me.nScan || FL.bodies.indexOf(me) < 0) return;
    var rg = antRange(me); if (!rg) return;
    scanTargets(me, rg).forEach(function (q) {
      var sx = W / 2 + (q.x - FL.cam.x) * ppm, sy = H / 2 + (q.y - FL.cam.y) * ppm, m = 30;
      if (sx > -10 && sx < W + 10 && sy > -10 && sy < H + 10) return;   // im Bild: sieht man ohnehin
      var vx = sx - W / 2, vy = sy - H / 2, L = m, R = W - m, Tp = 90, Bt = H - m;
      var k = Math.min(vx > 0 ? (R - W / 2) / vx : vx < 0 ? (L - W / 2) / vx : 1e9, vy > 0 ? (Bt - H / 2) / vy : vy < 0 ? (Tp - H / 2) / vy : 1e9), ex = W / 2 + vx * k, ey = H / 2 + vy * k, an = Math.atan2(vy, vx), ex0 = ex; ex = hudDodge(ex, ey);
      var col = SCAN.col[q.k];
      c.save(); c.translate(ex, ey); c.globalAlpha = 0.5 + 0.4 * (1 - q.d / rg); c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 1.5;
      if (q.k === "ast") { c.rotate(Math.PI / 4); c.strokeRect(-4.5, -4.5, 9, 9); }
      else if (q.k === "st") { c.fillRect(-5, -5, 10, 10); c.strokeStyle = "#0E121A"; c.strokeRect(-2.5, -2.5, 5, 5); }
      else { c.beginPath(); c.moveTo(0, -6); c.lineTo(6, 5); c.lineTo(-6, 5); c.closePath(); c.stroke(); c.fillRect(-0.8, -2, 1.6, 4); }
      c.restore();
      c.save(); c.globalAlpha = 0.75; c.fillStyle = col; c.font = "600 10px " + FONTS(); c.textAlign = "center"; c.textBaseline = "middle";
      var lbl = t(q.k === "ast" ? "scAst" : q.k === "st" ? "scSt" : "scWr") + " · " + (q.d >= 1000 ? nf(q.d / 1000, 1) + " km" : nf(q.d) + " m");
      if (ex !== ex0) { c.textAlign = "left"; c.fillText(lbl, ex + 11, ey); } else c.fillText(lbl, ex - Math.cos(an) * 34, ey - Math.sin(an) * 22);
      c.restore();
    });
  }
