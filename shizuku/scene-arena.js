/* Shizuku – scene-arena.js
   Die Kampf-Arena. Kamera fest, die Arena füllt das Bild.
   v0.1: Samurai mit Steuerung, Übungspfähle als Ziele. Esc führt zurück ins Menü. */
(function () {
  var SZ = window.SZ, L2 = SZ.L2;
  var S = null;

  function cursor(c, x, y) {
    x = Math.round(x); y = Math.round(y);
    c.fillStyle = "rgba(10,8,8,0.7)";
    c.fillRect(x - 4, y - 1, 3, 3); c.fillRect(x + 2, y - 1, 3, 3); c.fillRect(x - 1, y - 4, 3, 3); c.fillRect(x - 1, y + 2, 3, 3);
    c.fillStyle = "#F2ECDA";
    c.fillRect(x - 3, y, 2, 1); c.fillRect(x + 2, y, 2, 1); c.fillRect(x, y - 3, 1, 2); c.fillRect(x, y + 2, 1, 2);
    c.fillStyle = "#E2462F"; c.fillRect(x, y, 1, 1);
  }

  SZ.scenes.arena = {
    enter: function (opt) {
      var world = opt && opt.world, pl = opt && opt.player;
      if (!world) {
        world = new SZ.World(SZ.arena.active());
        pl = new SZ.Player(world, world.arena.spawn[0], world.arena.spawn[1]);
      }
      pl.control = true; pl.appear = 1;
      S = { world: world, player: pl, out: 0, back: opt && opt.back };
      SZ.main.root.classList.add("sz-play");
      SZ.main.ui.innerHTML = '<div class="sz-hint">' +
        L2("WASD laufen · Maus zielen · Linksklick Angriff · Rechtsklick Block · Q / E halten: Typ 2 / 3 · Esc Menü",
           "WASD move · mouse aim · left click attack · right click block · hold Q / E: type 2 / 3 · Esc menu") + '</div>';
    },
    exit: function () { SZ.main.root.classList.remove("sz-play"); },
    update: function (dt) {
      var I = SZ.input, w = S.world, p = S.player;
      if (S.out > 0) { S.out += dt; if (S.out > 0.7) { if (S.back === "editor") { SZ.scenes.editor.resume(); SZ.main.go("editor"); } else SZ.main.go("menu", { fromGame: true }); } return; }
      if (I.hit("Escape")) { S.out = 0.0001; p.control = false; return; }
      if (p.hitstop > 0) { p.hitstop -= dt; return; }
      w.update(dt);
      p.update(dt, I);
      w.tickObjects(dt);
    },
    render: function (ctx) {
      S.world.render(ctx, { ents: [S.player], player: S.player });
      if (SZ.input.inside && !S.out) cursor(ctx, SZ.input.mx, SZ.input.my);
    },
    renderTop: function (c) {
      if (S.out > 0) { c.fillStyle = "rgba(0,0,0," + Math.min(1, S.out / 0.6) + ")"; c.fillRect(0, 0, c.canvas.width, c.canvas.height); }
    }
  };
})();
