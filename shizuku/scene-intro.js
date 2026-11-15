/* Shizuku – scene-intro.js
   Übergang vom Menü in die Arena:
   1. Auf schwarzem Grund fällt ein Tautropfen von oben bis zur Bildmitte.
   2. Er fällt weiter „nach unten“ in die Arena (wird kleiner), das Schwarz löst sich.
   3. Aufprall: Spritzer und Ringe, eine feuchte Welle läuft über den Stein, Moos und
      Pflanzen wachsen im Zeitraffer von innen nach außen (höchstens 4 Sekunden: Welle 2,5 s + Rauschen 0,3 s + Wachsen 1,2 s).
   4. Der Samurai erscheint am Aufprallpunkt, danach geht es nahtlos in die Arena. */
(function () {
  var SZ = window.SZ, m = SZ.m;
  var FALL = 0.95, DIVE = 0.55, IMPACT = FALL + DIVE;

  var S = null;
  SZ.scenes.intro = {
    enter: function (opt) {
      SZ.main.ui.innerHTML = "";
      SZ.audio.ambience(null);
      var arena = opt && opt.arena ? new SZ.arena.Arena(opt.arena) : SZ.arena.active();
      var world = new SZ.World(arena), sp = world.arena.spawn;
      world.startGrowth(sp[0], sp[1] - 4);
      world.growth.t = -1e6;   // bis zum Aufprall wächst nichts
      var pl = new SZ.Player(world, sp[0], sp[1]);
      pl.appear = 0; pl.control = false; pl.face = Math.PI / 2; pl.dir = 2;
      S = { t: 0, world: world, player: pl, hit: false, back: opt && opt.back };
    },
    exit: function () {},
    update: function (dt) {
      S.t += dt;
      if (SZ.input.hit("Escape")) { if (S.back === "editor") { SZ.scenes.editor.resume(); SZ.main.go("editor"); } else SZ.main.go("menu"); return; }
      var w = S.world, p = S.player, sp = w.arena.spawn;
      if (!S.hit && S.t >= IMPACT) {
        S.hit = true;
        w.growth.t = 0;
        w.parts.splash(sp[0], sp[1] - 4, 28, 1);
        w.parts.ring(sp[0], sp[1] - 4, 26, 0.9); w.parts.ring(sp[0], sp[1] - 4, 44, 1.4);
        w.shake = 1.5;
        SZ.audio.play("drop");
      }
      if (S.hit) {
        var gt = S.t - IMPACT;
        if (gt > 0.35 && gt < 0.4) w.parts.ring(sp[0], sp[1] - 4, 70, 1.8);
        p.appear = m.smooth((gt - 0.15) / 0.8);
        if (gt > 0.7) p.control = true;
      }
      w.update(dt);
      p.update(dt, SZ.input);
      // Ambiente blendet mit dem Aufprall ein
      if (S.hit) { var amb = w.ambience(p.x, p.y), k = Math.min(1, (S.t - IMPACT) / 1.5); amb.wind *= k; amb.waterfall *= k; SZ.audio.ambience(amb); }
      // Übergang in die Arena, sobald alles gewachsen ist
      if (S.hit && w.growthDone()) SZ.main.go("arena", { world: w, player: p, back: S.back });
    },
    render: function (ctx) {
      var w = S.world, sp = w.arena.spawn;
      w.render(ctx, {
        ents: [S.player], player: S.player,
        afterGround: function (c) {
          if (!S.hit || !w.growth) return;
          // Feuchte Welle über dem Stein
          var gt = w.growth.t, r = w.growth.maxD * Math.pow(Math.min(1.2, gt / w.GROW_SPAN), 1 / 0.85);
          if (r < 2) return;
          c.save(); c.translate(sp[0], sp[1] - 4); c.scale(1, 0.8);
          var g = c.createRadialGradient(0, 0, 0, 0, 0, r);
          var fade = 1 - m.smooth((gt - w.GROW_SPAN) / 1.2);
          g.addColorStop(0, "rgba(10,24,30,0)");
          g.addColorStop(Math.max(0, 1 - 40 / r), "rgba(10,24,30," + (0.05 * fade) + ")");
          g.addColorStop(Math.max(0, 1 - 6 / r), "rgba(10,24,30," + (0.3 * fade) + ")");
          g.addColorStop(Math.max(0, 1 - 2 / r), "rgba(200,236,240," + (0.22 * fade) + ")");
          g.addColorStop(1, "rgba(10,24,30,0)");
          c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, 0, 6.283); c.fill();
          c.restore();
        }
      });
    },
    // Hochaufgelöst über dem Pixelbild: Schwarzblende und Tropfen
    renderTop: function (c, V) {
      var t = S.t, dpr = V.dpr, sp = S.world.arena.spawn;
      var black = t < FALL ? 1 : 1 - m.smooth((t - FALL) / (DIVE + 0.25));
      if (black > 0) { c.fillStyle = "rgba(0,0,0," + black + ")"; c.fillRect(0, 0, c.canvas.width, c.canvas.height); }
      if (t >= IMPACT) return;
      var cx = (V.x + V.w / 2) * dpr, cy = (V.y + V.h / 2) * dpr, ix = (V.x + sp[0] * V.s) * dpr, iy = (V.y + (sp[1] - 4) * V.s) * dpr;
      var x, y, sc, stretch, a = 1;
      if (t < FALL) {
        var k = t / FALL, e = k * k;
        x = cx; y = -40 * dpr + (cy + 40 * dpr) * e; sc = 1; stretch = 1 + e * 0.5;
      } else {
        var q = (t - FALL) / DIVE, e2 = m.easeInCubic(q);
        x = cx + (ix - cx) * m.smooth(q); y = cy + (iy - cy) * m.smooth(q); sc = 1 - e2 * 0.82; stretch = 1.5 - q * 0.4; a = 1 - Math.max(0, q - 0.85) / 0.15;
      }
      var r = Math.max(4, Math.min(16, V.s * 3.2)) * dpr * sc;
      c.save(); c.globalAlpha = a; c.translate(x, y);
      // Leuchten und Fallspur
      var gl = c.createRadialGradient(0, 0, 0, 0, 0, r * 5);
      gl.addColorStop(0, "rgba(170,220,255,0.18)"); gl.addColorStop(1, "rgba(170,220,255,0)");
      c.fillStyle = gl; c.fillRect(-r * 5, -r * 5, r * 10, r * 10);
      if (t < FALL) {
        var tr = c.createLinearGradient(0, -r * 9 * stretch, 0, 0);
        tr.addColorStop(0, "rgba(200,230,255,0)"); tr.addColorStop(1, "rgba(200,230,255,0.22)");
        c.fillStyle = tr; c.fillRect(-r * 0.12, -r * 9 * stretch, r * 0.24, r * 9 * stretch);
      }
      // Tropfenform
      c.scale(1 / Math.sqrt(stretch), stretch);
      c.beginPath();
      c.moveTo(0, -r * 2.1);
      c.bezierCurveTo(r * 0.35, -r * 1.2, r, -r * 0.55, r, 0);
      c.arc(0, 0, r, 0, Math.PI);
      c.bezierCurveTo(-r, -r * 0.55, -r * 0.35, -r * 1.2, 0, -r * 2.1);
      var g = c.createRadialGradient(-r * 0.3, -r * 0.2, r * 0.1, 0, 0, r * 1.4);
      g.addColorStop(0, "rgba(245,252,255,0.97)"); g.addColorStop(0.55, "rgba(170,214,236,0.92)"); g.addColorStop(1, "rgba(90,150,190,0.85)");
      c.fillStyle = g; c.fill();
      c.fillStyle = "rgba(255,255,255,0.95)";
      c.beginPath(); c.ellipse(-r * 0.38, -r * 0.3, r * 0.17, r * 0.32, -0.4, 0, 6.283); c.fill();
      c.restore();
    }
  };
})();
