/* Monsters Arc – scene-walk.js
   Testlauf: die Spielfigur (Shizukus Samurai) läuft über die Map, die Kamera folgt ihr weich.
   Aus dem Dev-Kit gestartet geht es mit Esc zurück. Grundlage für die spätere Spielszene. */
(function () {
  var MA = window.MA, L2 = MA.L2;
  var S = { world: null, pc: null, back: null };

  MA.scenes.walk = {
    enter: function (opt) {
      opt = opt || {};
      var map = opt.map ? new MA.maps.GameMap(opt.map) : MA.maps.start();
      var w = S.world = new MA.World(map);
      w.time = opt.time != null ? opt.time : map.time; w.wind = opt.wind != null ? opt.wind : 1;
      S.pc = new MA.Character(w, map.spawn[0], map.spawn[1], { look: "samurai" });
      w.player = S.pc;
      w.follow(S.pc.x, S.pc.y - 10);
      S.back = opt.back || "menu";
      MA.main.ui.innerHTML = '<div class="ma-hint">' + L2("WASD / Pfeiltasten: laufen · Esc: zurück", "WASD / arrow keys: walk · Esc: back") + '</div>' +
        (map.walkable(S.pc.x, S.pc.y, 4) ? "" : '<div class="ma-warn">' + L2("Der Startpunkt liegt im Meer oder in einer Mauer – im Dev-Kit mit „Startpunkt“ an Land setzen.", "The start point is in the sea or a wall – set it on land with “Spawn” in the dev kit.") + '</div>');
    },
    exit: function () { MA.audio.ambience(null); MA.main.ui.innerHTML = ""; },
    update: function (dt) {
      var I = MA.input, w = S.world, pc = S.pc;
      if (I.hit("Escape")) {
        if (S.back === "devkit" && MA.scenes.devkit.resume) MA.scenes.devkit.resume();
        MA.main.go(S.back); return;
      }
      pc.readKeys(I);
      pc.update(dt);
      w.follow(pc.x, pc.y - 10, 1 - Math.exp(-dt * 6));
      w.update(dt);
      MA.audio.ambience({ wind: 0.12 + 0.1 * Math.min(2, w.wind) });
    },
    render: function (ctx) { S.world.render(ctx, { ents: [S.pc], player: S.pc }); }
  };
})();
