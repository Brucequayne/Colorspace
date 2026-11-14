/* Shizuku – hud.js
   Lebens- und Energiebalken oben links, Waffensymbol daneben. Wird nach dem Licht gezeichnet,
   damit die Anzeige auch nachts klar bleibt. Verlorenes Leben bleibt kurz hell sichtbar.
   Die Energie hat Kerben bei 33 % und 66 % (ein Dash kostet 33 %). */
(function () {
  var SZ = window.SZ;
  var chip = 1, chipT = 0, lastHp = 1;

  function bar(ctx, x, y, w, h, f, col, hi, back) {
    ctx.fillStyle = "#0A0808"; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = back || "#2A2220"; ctx.fillRect(x, y, w, h);
    var fw = Math.round(w * Math.max(0, Math.min(1, f)));
    ctx.fillStyle = col; ctx.fillRect(x, y, fw, h);
    if (hi && fw > 0) { ctx.fillStyle = hi; ctx.fillRect(x, y, fw, 1); }
  }
  function icon(ctx, x, y, kind) {
    var p = SZ.pen(ctx);
    p.rect(x - 1, y - 1, 13, 13, "#0A0808"); p.rect(x, y, 11, 11, "#1E1A18");
    if (kind === "bow") {
      var pts = [[3, 1], [4, 2], [5, 4], [5, 6], [5, 8], [4, 9], [3, 10]];
      pts.forEach(function (q) { p.px(x + q[0] + 1, y + q[1], "#C9A06A"); });
      p.line(x + 4, y + 1, x + 4, y + 10, "#E8E0CC"); p.line(x + 3, y + 5, x + 9, y + 5, "#9A8060"); p.px(x + 9, y + 5, "#DCE3E8");
    } else {
      p.line(x + 2, y + 9, x + 9, y + 2, "#DCE3E8"); p.px(x + 9, y + 1, "#FFFFFF"); p.px(x + 3, y + 7, "#C9A445"); p.px(x + 4, y + 8, "#C9A445");
      p.line(x + 1, y + 10, x + 2, y + 9, "#5B4A3A");
    }
  }

  SZ.hud = {
    reset: function () { chip = 1; chipT = 0; lastHp = 1; },
    draw: function (ctx, pl, dt) {
      var f = pl.hp / pl.hpMax, e = pl.en / pl.enMax;
      if (f < lastHp) chipT = 0.6;
      lastHp = f;
      if (chipT > 0) chipT -= dt; else chip = Math.max(f, chip - dt * 0.6);
      if (chip < f) chip = f;
      var x = 8, y = 8;
      bar(ctx, x, y, 74, 4, chip, "#F2E6D0", null, "#2A2220");
      ctx.fillStyle = "#C83C2A"; ctx.fillRect(x, y, Math.round(74 * Math.max(0, f)), 4);
      ctx.fillStyle = "#E8664A"; ctx.fillRect(x, y, Math.round(74 * Math.max(0, f)), 1);
      var low = pl.en < SZ.PLAYER.dashCost;
      bar(ctx, x, y + 7, 74, 3, e, low ? "#8A7A5A" : "#E2D29A", low ? null : "#FFF4C8", "#24201A");
      ctx.fillStyle = "#0A0808"; ctx.fillRect(x + Math.round(74 / 3), y + 7, 1, 3); ctx.fillRect(x + Math.round(74 * 2 / 3), y + 7, 1, 3);
      icon(ctx, x + 80, y - 1, pl.weapon.type === "bow" ? "bow" : "katana");
    }
  };
})();
