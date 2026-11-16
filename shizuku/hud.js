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
    if (kind === "star") {
      p.px(x + 5, y + 5, "#5E666E"); [[5, 2], [5, 3], [5, 7], [5, 8], [2, 5], [3, 5], [7, 5], [8, 5]].forEach(function (q) { p.px(x + q[0], y + q[1], "#DCE3E8"); });
      p.px(x + 4, y + 4, "#9AA2AA"); p.px(x + 6, y + 6, "#9AA2AA"); p.px(x + 6, y + 4, "#9AA2AA"); p.px(x + 4, y + 6, "#9AA2AA");
    } else if (kind === "knife") {
      p.line(x + 3, y + 7, x + 8, y + 2, "#C8CED4"); p.px(x + 9, y + 1, "#FFFFFF"); p.line(x + 1, y + 9, x + 2, y + 8, "#2A1E1A"); p.px(x, y + 10, "#8A7A5A"); p.px(x + 1, y + 10, "#8A7A5A");
    } else if (kind === "spear") {
      p.line(x + 1, y + 10, x + 8, y + 3, "#8A6440"); p.line(x + 8, y + 3, x + 10, y + 1, "#DCE3E8"); p.px(x + 10, y + 0, "#FFFFFF"); p.px(x + 7, y + 4, "#B8302A");
    } else if (kind === "bow") {
      var pts = [[3, 1], [4, 2], [5, 4], [5, 6], [5, 8], [4, 9], [3, 10]];
      pts.forEach(function (q) { p.px(x + q[0] + 1, y + q[1], "#C9A06A"); });
      p.line(x + 4, y + 1, x + 4, y + 10, "#E8E0CC"); p.line(x + 3, y + 5, x + 9, y + 5, "#9A8060"); p.px(x + 9, y + 5, "#DCE3E8");
    } else if (kind === "water") {
      [[1, 3], [2, 2], [3, 3], [4, 4], [5, 3], [6, 2], [7, 3], [8, 4], [9, 3]].forEach(function (q) { p.px(x + q[0], y + q[1], "#96C4BE"); p.px(x + q[0], y + q[1] + 3, "#6E9C96"); p.px(x + q[0], y + q[1] + 6, "#3E6862"); });
      p.px(x + 2, y + 2, "#EBF5F0"); p.px(x + 6, y + 5, "#EBF5F0");
    } else {
      p.line(x + 2, y + 9, x + 9, y + 2, "#DCE3E8"); p.px(x + 9, y + 1, "#FFFFFF"); p.px(x + 3, y + 7, "#C9A445"); p.px(x + 4, y + 8, "#C9A445");
      p.line(x + 1, y + 10, x + 2, y + 9, "#5B4A3A");
    }
  }

  SZ.weaponIcon = function (ctx, x, y, id) { var W = SZ.WEAPONS[id]; icon(ctx, x, y, kindOf(W)); };
  function kindOf(W) { return W.type === "element" ? W.el : W.type === "bow" ? "bow" : W.type === "throw" ? W.proj : W.spear ? "spear" : "katana"; }
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
      var low = pl.en < SZ.PLAYER.dashCost - 0.01;
      var back = pl.exhausted ? (Math.floor(Date.now() / 250) % 2 ? "#5A1C16" : "#3A1410") : "#24201A";
      bar(ctx, x, y + 7, 74, 3, e, low ? "#8A7A5A" : "#E2D29A", low ? null : "#FFF4C8", back);
      ctx.fillStyle = "#0A0808"; ctx.fillRect(x + Math.round(74 / 3), y + 7, 1, 3); ctx.fillRect(x + Math.round(74 * 2 / 3), y + 7, 1, 3);
      // Mana (für den Element-Slot): lädt langsamer als die Energie, blinkt, wenn es nicht reicht
      if (pl.slots && pl.slots.length > 2) {
        var mf = pl.mana / pl.manaMax, fl = pl.manaFlash > 0 && Math.floor(pl.manaFlash * 12) % 2;
        bar(ctx, x, y + 13, 74, 2, mf, fl ? "#D88A7A" : "#6E9C96", fl ? null : "#96C4BE", "#16242A");
      }
      // Slots: aktive Waffe hell, die anderen gedimmt
      (pl.slots || []).forEach(function (id, i) {
        var W = SZ.WEAPONS[id], k = kindOf(W);
        ctx.globalAlpha = i === pl.wi ? 1 : 0.4;
        icon(ctx, x + 80 + i * 15, y - 1, k);
        ctx.globalAlpha = 1;
      });
    }
  };
})();
