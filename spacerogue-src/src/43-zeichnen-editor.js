  // ===== 43-zeichnen-editor.js · Zeichnen: Editor-Ansicht (Raster, Räume, Vorschau, Infokasten) =====
  // ---------- Editor zeichnen ----------
  function edDraw() {
    var c = V.ctx, W = V.W, H = V.H, z = V.zoom, s = PX * z;
    drawSpace(c, W, H, V.cam.x * s, V.cam.y * s);
    var suns = bdEdDraw(c), fxc = suns.length ? bdFxBegin(W, H) : null; if (fxc) c = fxc;   // Backdrops ganz hinten; vor einer Sonne wird der Vordergrund getrennt gezeichnet (Gegenlicht)
    envEdDraw(c, -1);   // Environment hinten
    c.save(); c.translate(W / 2 - V.cam.x * s, H / 2 - V.cam.y * s);
    // Raster
    var x0 = Math.floor(V.cam.x - W / 2 / s) - 1, x1 = Math.ceil(V.cam.x + W / 2 / s) + 1, y0 = Math.floor(V.cam.y - H / 2 / s) - 1, y1 = Math.ceil(V.cam.y + H / 2 / s) + 1;
    c.strokeStyle = "rgba(120,150,190,.10)"; c.lineWidth = 1; c.beginPath();
    for (var gx = x0; gx <= x1; gx++) { c.moveTo(gx * s + 0.5, y0 * s); c.lineTo(gx * s + 0.5, y1 * s); }
    for (var gy = y0; gy <= y1; gy++) { c.moveTo(x0 * s, gy * s + 0.5); c.lineTo(x1 * s, gy * s + 0.5); }
    c.stroke();
    if (S.sym) { c.strokeStyle = "rgba(227,184,63,.6)"; c.setLineDash([6, 6]); c.lineWidth = 2; c.beginPath(); c.moveTo(symAx() * s, y0 * s); c.lineTo(symAx() * s, y1 * s); c.stroke(); c.setLineDash([]); }
    c.save(); c.translate(-(W / 2 - V.cam.x * s), -(H / 2 - V.cam.y * s)); envEdDraw(c, 0); c.restore();   // Environment Spielebene unter den Blöcken
    var tm = performance.now() / 1000, M = buildMap(S.blocks);
    // Räume einfärben (Innenansicht)
    var R = rooms(S.blocks);
    drawShip(c, S.blocks, s, S.view, tm, null, M);
    if (S.view === "in") R.forEach(function (rm) {
      c.fillStyle = rm.ok ? "rgba(90,190,255,.16)" : "rgba(224,83,63,.22)";
      rm.cells.forEach(function (q) { c.fillRect(q[0] * s, q[1] * s, s, s); });
      c.strokeStyle = "#E0533F"; c.lineWidth = Math.max(2, s / 8);
      rm.leaks.forEach(function (q) { var x = q[0] * s, y = q[1] * s; c.beginPath(); if (q[2] === 0) { c.moveTo(x, y); c.lineTo(x + s, y); } else if (q[2] === 1) { c.moveTo(x + s, y); c.lineTo(x + s, y + s); } else if (q[2] === 2) { c.moveTo(x, y + s); c.lineTo(x + s, y + s); } else { c.moveTo(x, y); c.lineTo(x, y + s); } c.stroke(); });
    });
    // lose Blöcke rot markieren
    var comps = components(S.blocks); if (comps.length > 1) {
      var main = comps.reduce(function (a, b) { return mainScore(b) > mainScore(a) ? b : a; });
      c.strokeStyle = "#E0533F"; c.lineWidth = 2;
      comps.forEach(function (cp) { if (cp === main) return; cp.forEach(function (b) { var f = fp(b); c.strokeRect(b.x * s + 1, b.y * s + 1, f[0] * s - 2, f[1] * s - 2); }); });
    }
    // Schwerpunkt
    if (S.blocks.length) {
      var stc = stats(S.blocks), mx = stc.com[0] * s, my = stc.com[1] * s, rr = Math.max(7, s * 0.38);
      c.fillStyle = "#151715"; c.beginPath(); c.arc(mx, my, rr, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#E3B83F"; c.beginPath(); c.moveTo(mx, my); c.arc(mx, my, rr, -Math.PI / 2, 0); c.closePath(); c.fill(); c.beginPath(); c.moveTo(mx, my); c.arc(mx, my, rr, Math.PI / 2, Math.PI); c.closePath(); c.fill();
      c.strokeStyle = "#E3B83F"; c.lineWidth = 1.5; c.beginPath(); c.arc(mx, my, rr, 0, Math.PI * 2); c.stroke();
    }
    // Flugrichtung (nur Schiffe)
    var bb = S.ed === "station" ? null : bounds(S.blocks), ax = bb ? (bb.x0 + bb.x1) / 2 : 0.5, ay = bb ? bb.y0 - 1.6 : -3;
    if (bb) { c.fillStyle = "rgba(227,184,63,.9)"; c.beginPath(); c.moveTo(ax * s, (ay - 1.2) * s); c.lineTo((ax - 0.7) * s, ay * s); c.lineTo((ax + 0.7) * s, ay * s); c.closePath(); c.fill();
      c.fillStyle = "rgba(227,184,63,.9)"; c.font = "700 " + Math.max(10, 0.45 * s) + "px " + FONTS(); c.textAlign = "center"; c.fillText(t("dir"), ax * s, (ay + 0.7) * s); }
    // Vorschau
    if (V.mouse && !V.pan && !(S.ed === "station" && S.envTab)) {
      var cx = Math.floor(V.mouse.x), cy = Math.floor(V.mouse.y);
      if (S.tool === "build") {
        var ghosts = V.row ? rowList() : [ghostAt(cx, cy, S.sel, S.r, S.f)];
        ghosts.forEach(function (g, gi) {
          var list = placeList(g), ok = !S.blocks.length || canPlace(g, M) || (V.row && gi > 0);
          list.forEach(function (q, i) {
            c.globalAlpha = 0.6; drawBlock(c, q, s, S.view, 1, tm); c.globalAlpha = 1;
            var f = fp(q); c.strokeStyle = ok ? "#57D18A" : "#E0533F"; c.lineWidth = 2; c.strokeRect(q.x * s, q.y * s, f[0] * s, f[1] * s);
            if (i === 0 && gi === 0) arrowFor(c, q, s);
          });
        });
        if (V.row && ghosts.length > 1) { c.fillStyle = "#57D18A"; c.font = "700 13px " + FONTS(); c.textAlign = "left"; c.fillText("× " + ghosts.length, (ghosts[ghosts.length - 1].x + 1.4) * s, (ghosts[ghosts.length - 1].y + 0.7) * s); }
      } else {
        var hb = blockAt(cx, cy, M), list2 = hb ? [hb] : [];
        if (hb && S.sym) { var o = blockAt(mirrorCell(cx), cy, M); if (o && o !== hb) list2.push(o); }
        list2.forEach(function (q) { var f = fp(q); c.strokeStyle = S.tool === "erase" ? "#E0533F" : S.color; c.lineWidth = 3; c.strokeRect(q.x * s, q.y * s, f[0] * s, f[1] * s); });
        if (!hb) { c.strokeStyle = "rgba(255,255,255,.3)"; c.lineWidth = 1; c.strokeRect(cx * s, cy * s, s, s); }
      }
    }
    c.restore();
    envEdDraw(c, 1);   // Environment vorne
    if (fxc) { bdFxEnd(V.ctx, W, H, suns); c = V.ctx; }
    if (S.ed === "station") { envEdGhost(c); bdEdGhost(c); }
    // Infokasten zum Block unter dem Mauszeiger: Name, Gewicht, Leben
    if (V.mouse && !V.pan && !V.row && !(S.ed === "station" && S.envTab)) {
      var hb2 = blockAt(Math.floor(V.mouse.x), Math.floor(V.mouse.y), M);
      if (hb2) {
        var ty2 = T[hb2.t], txt = ty2.n[lang] + " · " + kg(ty2.mass) + " · " + ty2.hp + " HP · " + cr(ty2.cost);
        c.font = "600 12px " + FONTS(); var tw = c.measureText(txt).width + 16, tx = Math.min(V.W - tw - 6, V.mouse.sx + 16), ty3 = Math.min(V.H - 30, V.mouse.sy + 18);
        c.fillStyle = "rgba(14,19,28,.94)"; c.fillRect(tx, ty3, tw, 24); c.strokeStyle = "#33415A"; c.lineWidth = 1; c.strokeRect(tx + 0.5, ty3 + 0.5, tw - 1, 23);
        c.fillStyle = "#E6EAF0"; c.textAlign = "left"; c.textBaseline = "middle"; c.fillText(txt, tx + 8, ty3 + 12.5); c.textBaseline = "alphabetic";
      }
    }
  }
  function kg(t) { return nf(Math.round(t * 1000)) + " kg"; }
  function arrowFor(c, b, s) {   // zeigt bei Triebwerken die Schubrichtung, bei Waffen die Schussrichtung
    var ty = T[b.t]; if (ty.kind !== "thr" && ty.kind !== "mg" && ty.kind !== "rg" && ty.kind !== "gun" && ty.kind !== "ms") return;
    var d = dirOut(b, 0), f = fp(b), cx = (b.x + f[0] / 2) * s, cy = (b.y + f[1] / 2) * s, L = Math.max(f[0], f[1]) * s * 0.5 + s * 0.8;
    var dx = DV[d][0], dy = DV[d][1], ex = cx + dx * L, ey = cy + dy * L;
    c.strokeStyle = ty.kind === "thr" ? "#57D18A" : "#E0533F"; c.fillStyle = c.strokeStyle; c.lineWidth = 2;
    c.beginPath(); c.moveTo(cx, cy); c.lineTo(ex, ey); c.stroke();
    c.beginPath(); c.moveTo(ex + dx * 8, ey + dy * 8); c.lineTo(ex - dy * 6, ey + dx * 6); c.lineTo(ex + dy * 6, ey - dx * 6); c.closePath(); c.fill();
  }
