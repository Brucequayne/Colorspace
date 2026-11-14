  // ===== 47-luftstrom.js · Dezente Luftzüge an offenen Stellen (v0.57.2) =====
  // Offene Stelle = begehbarer Boden oder Tür, an dessen Seite kein Block mehr ist (Loch, kaputte Wand, offener Rand).
  // Dort ziehen ein paar feine grau-weiße Luftfäden: drinnen hinaus ins All, draußen ins Schiff hinein – immer dorthin, wohin man will.
  var AIRF = { per: 3, near: 45, a: 0.3, rgb: "214,220,228", sh: "30,36,46" };   // a = höchste Deckkraft des hellen Fadens; sh = feiner dunkler Saum, damit er auch auf hellem Boden lesbar bleibt
  function airOpenings(bd) {
    var ca = bd.airC, sig = bd.blocks.length + ":" + bd.map.size;
    if (ca && ca.sig === sig && FL.t - ca.t < 1.5) return ca.L;
    var L = [];
    bd.blocks.forEach(function (b) {
      if (!openEdgeKind(T[b.t].kind)) return;
      cellsOf(b).forEach(function (q) {
        var cx = q.c[0], cy = q.c[1];
        for (var d = 0; d < 4; d++) if (!bd.map.has(key(cx + DV[d][0], cy + DV[d][1]))) L.push([cx, cy, d, (Math.imul(cx * 73856093 ^ cy * 19349663 ^ d * 83492791, 2654435761) >>> 0) / 4294967296]);
      });
    });
    bd.airC = { sig: sig, t: FL.t, L: L };
    return L;
  }
  function drawAirflow(c, bd, tm) {
    var L = airOpenings(bd); if (!L.length) return;
    var inward = !!FL.out, px = FL.out && FL.eva ? toLocal(bd, FL.eva.x, FL.eva.y) : (FL.pb || FL.me) === bd ? FL.pilot : null;
    if (!px) { var pl = FL.pb || FL.me, w0 = toWorld(pl, FL.pilot.x, FL.pilot.y); px = toLocal(bd, w0.x, w0.y); }
    var near = AIRF.near / CELL_M;
    c.save(); c.lineCap = "round"; var lw0 = Math.max(0.8, PX * 0.035);
    L.forEach(function (o) {
      var mx = o[0] + 0.5 + DV[o[2]][0] * 0.5, my = o[1] + 0.5 + DV[o[2]][1] * 0.5;
      if (Math.abs(mx - px.x) > near || Math.abs(my - px.y) > near) return;
      var nx = DV[o[2]][0], ny = DV[o[2]][1], tx = -ny, ty = nx;
      for (var k = 0; k < AIRF.per; k++) {
        var h = (o[3] * 7.31 + k * 0.618) % 1, per = 2.4 + h * 1.4, ph = ((tm / per + h * 3.7) % 1);
        var off = (h - 0.5) * 0.8;   // Lage entlang der Öffnung
        // Weg: innen zusammenlaufen, durch die Öffnung, außen auffächern (Zellen)
        var ax = mx - nx * 1.4 + tx * off * 0.9, ay = my - ny * 1.4 + ty * off * 0.9;
        var bx = mx + tx * off * 0.25, by = my + ty * off * 0.25;
        var ex = mx + nx * 2.1 + tx * off * 2.6, ey = my + ny * 2.1 + ty * off * 2.6;
        var u1 = ph * 1.35 - 0.35, u0 = u1 - 0.32, al = Math.sin(Math.PI * Math.min(1, Math.max(0, ph))) * AIRF.a;
        if (al < 0.01) continue;
        c.beginPath();
        for (var i = 0; i <= 6; i++) {
          var u = Math.min(1, Math.max(0, u0 + (u1 - u0) * i / 6)); if (inward) u = 1 - u;
          var v = 1 - u, X = v * v * ax + 2 * v * u * bx + u * u * ex, Y = v * v * ay + 2 * v * u * by + u * u * ey;
          if (i) c.lineTo(X * PX, Y * PX); else c.moveTo(X * PX, Y * PX);
        }
        c.strokeStyle = "rgba(" + AIRF.sh + "," + (al * 0.45).toFixed(3) + ")"; c.lineWidth = lw0 * 2.2; c.stroke();
        c.strokeStyle = "rgba(" + AIRF.rgb + "," + al.toFixed(3) + ")"; c.lineWidth = lw0; c.stroke();
      }
    });
    c.restore();
  }
