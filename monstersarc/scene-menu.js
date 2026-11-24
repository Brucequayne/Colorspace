/* Monsters Arc – scene-menu.js
   Hauptmenü: Titel, Spielen (kommt später), Dev-Kit. Im Hintergrund die Start-Map mit Tageslicht,
   die Kamera gleitet langsam darüber (wie Shizuku: gleicher Pixel-Look und gleiche Beleuchtung). */
(function () {
  var MA = window.MA, L2 = MA.L2;
  var S = { world: null, t: 0, el: null };

  MA.scenes.menu = {
    enter: function () {
      MA.audio.musicStop();
      var map = MA.maps.start();
      S.world = new MA.World(map); S.world.time = 17.4; S.world.wind = 1; S.t = 0;
      S.world.follow(map.spawn[0], map.spawn[1]);
      var ui = MA.main.ui;
      ui.innerHTML =
        '<div class="ma-menu">' +
        '<a class="ma-back" href="#">← Color Space</a>' +
        '<div class="ma-title"><h1>Monsters Arc</h1><p>Pre-Alpha v' + MA.VERSION + '</p></div>' +
        '<div class="ma-mbtns">' +
        '<button type="button" data-m="play" disabled>' + L2("Spielen", "Play") + '<small>' + L2("kommt später", "coming later") + '</small></button>' +
        '<button type="button" data-m="dex">' + L2("Monsterliste", "Monster list") + '<small>' + MA.monsters.list().length + ' Monster</small></button>' +
        '<button type="button" data-m="devkit">Dev-Kit<small>' + L2("Map-, Gebäude- und Monster-Editor", "Map, building and monster editor") + '</small></button>' +
        '</div></div>';
      S.el = ui.firstChild;
      S.el.addEventListener("click", function (e) {
        var b = e.target.closest("button"); if (!b || b.disabled) return;
        if (b.dataset.m === "devkit") MA.main.go("devkit");
        if (b.dataset.m === "dex") MA.main.go("dex");
      });
    },
    exit: function () { MA.main.ui.innerHTML = ""; },
    update: function (dt) {
      S.t += dt;
      var a = S.world.arena, w = S.world;
      // langsame Fahrt über die Map (bei kleinen Maps bleibt sie mittig)
      w.follow(a.pxW() / 2 + Math.sin(S.t * 0.05) * a.pxW() * 0.3, a.pxH() / 2 + Math.cos(S.t * 0.037) * a.pxH() * 0.25, 1);
      w.update(dt);
    },
    render: function (ctx) { S.world.render(ctx, {}); }
  };
})();
