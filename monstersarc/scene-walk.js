/* Monsters Arc – scene-walk.js
   Testlauf: die Spielfigur (Shizukus Samurai) läuft über die Map, die Kamera folgt ihr weich.
   Aus dem Dev-Kit gestartet geht es mit Esc zurück. Grundlage für die spätere Spielszene.
   Betritt die Figur eine Zone (Stadt, Route), erscheint oben links kurz deren Name.
   Seit v0.15: Häuser. Vor der Tür mit E betreten → Abblende wie in Feuerrot → Innenraum (eigene kleine Map).
   Auf der Fußmatte nach unten laufen = hinaus. Treppe betreten = anderes Stockwerk (eigener Raum). */
(function () {
  var MA = window.MA, L2 = MA.L2;
  var FADE = 0.28;   // Sekunden ab- bzw. aufblenden
  var S = { world: null, pc: null, back: null, out: null, room: null, house: null, fade: null, armed: true, door: null };

  function showZone(name) {
    var el = MA.main.ui.querySelector(".ma-zone");
    if (!el) { el = document.createElement("div"); el.className = "ma-zone"; MA.main.ui.appendChild(el); }
    el.textContent = name; el.classList.remove("on"); void el.offsetWidth; el.classList.add("on");
  }

  // Übergang: abblenden, dann fn (neuer Ort), dann aufblenden. Die Figur steht währenddessen still.
  function transition(fn) { if (!S.fade) S.fade = { t: 0, fn: fn, done: false }; }
  function setWorld(w, x, y, face) {
    var pc = S.pc;
    S.world = w; pc.world = w; w.player = pc;
    pc.x = x; pc.y = y; pc.vx = 0; pc.vy = 0; pc.face = face; pc.bodyAng = face; pc.dir = MA.m.dir8(face);
    w.follow(pc.x, pc.y - 10);
  }
  function loadRoom(floor, via) {
    var R = MA.houses.interior(S.house, floor), w = new MA.World(R.map);
    w.time = 12; w.wind = 0;
    S.room = R; S.armed = false;
    var p = via === "stairs" && R.spawnStairs ? R.spawnStairs : R.spawnDoor;
    setWorld(w, p[0], p[1], via === "stairs" ? Math.PI / 2 : -Math.PI / 2);
  }
  function enterHouse(o) {
    S.out = { world: S.world }; S.house = o;
    loadRoom(0, "door");
  }
  function leaveHouse() {
    var dp = MA.houses.doorOf(S.house);
    S.room = null;
    setWorld(S.out.world, dp.x, dp.y + 9, Math.PI / 2);
    S.out = null; S.house = null;
  }

  MA.scenes.walk = {
    enter: function (opt) {
      opt = opt || {};
      var map = opt.map ? new MA.maps.GameMap(opt.map) : MA.maps.start();
      var w = S.world = new MA.World(map);
      w.time = opt.time != null ? opt.time : map.time; w.wind = opt.wind != null ? opt.wind : 1;
      S.pc = new MA.Character(w, map.spawn[0], map.spawn[1], { look: "samurai" });
      w.player = S.pc;
      w.follow(S.pc.x, S.pc.y - 10);
      S.back = opt.back || "menu"; S.zone = null; S.out = null; S.room = null; S.house = null; S.fade = null; S.door = null;
      MA.main.ui.innerHTML = '<div class="ma-hint">' + L2("WASD / Pfeiltasten: laufen · E: Tür öffnen · Esc: zurück", "WASD / arrow keys: walk · E: open door · Esc: back") + '</div>' +
        (map.walkable(S.pc.x, S.pc.y, 4) ? "" : '<div class="ma-warn">' + L2("Der Startpunkt liegt im Meer oder in einer Mauer – im Dev-Kit mit „Startpunkt“ an Land setzen.", "The start point is in the sea or a wall – set it on land with “Spawn” in the dev kit.") + '</div>');
    },
    exit: function () { MA.audio.ambience(null); MA.main.ui.innerHTML = ""; },
    update: function (dt) {
      var I = MA.input, pc = S.pc;
      if (I.hit("Escape") && !S.fade) {
        if (S.back === "devkit" && MA.scenes.devkit.resume) MA.scenes.devkit.resume();
        MA.main.go(S.back); return;
      }
      if (S.fade) {
        S.fade.t += dt;
        if (!S.fade.done && S.fade.t >= FADE) { S.fade.done = true; S.fade.fn(); }
        if (S.fade.t >= FADE * 2) S.fade = null;
        pc.input.x = 0; pc.input.y = 0;
      } else pc.readKeys(I);
      var w = S.world;
      pc.update(dt);
      S.door = null;
      if (!S.fade) {
        if (!S.room) {
          // Tür in der Nähe? E öffnet sie
          var o = MA.houses.doorNear(w.arena, pc.x, pc.y);
          if (o) { S.door = MA.houses.doorOf(o); if (I.hit("e")) transition(function () { enterHouse(o); }); }
          // Zone betreten: Name kurz einblenden (wie die Ortsschilder in Pokémon). Lücken ohne Zone zählen nicht als Wechsel.
          var zid = w.arena.zonePx(pc.x, pc.y);
          if (zid !== "0" && zid !== S.zone) { if (S.zone != null) w.clearPrints(zid); S.zone = zid; var zi = w.arena.zoneInfo(zid); if (zi && zi.name) showZone(zi.name); }
        } else {
          var R = S.room, onSt = MA.houses.inRect(R.stairs, pc.x, pc.y);
          if (R.mat && MA.houses.inRect(R.mat, pc.x, pc.y) && pc.input.y > 0) transition(leaveHouse);
          else if (onSt && S.armed) transition(function () { loadRoom(R.floor === 0 ? 1 : 0, "stairs"); });
          if (!onSt) S.armed = true;   // erst wieder auslösen, nachdem man die Treppe verlassen hat
        }
      }
      w.follow(pc.x, pc.y - 10, 1 - Math.exp(-dt * 6));
      w.update(dt);
      MA.audio.ambience(S.room ? null : { wind: 0.12 + 0.1 * Math.min(2, w.wind) });
    },
    render: function (ctx) {
      var w = S.world, R = S.room;
      w.render(ctx, { ents: [S.pc], player: S.pc, afterGround: R ? function (c) { c.drawImage(R.deco, 0, 0); } : null });
      // Hinweis über der Tür: Taste E
      if (S.door && !S.fade) {
        var x = Math.round((S.door.x - w.cam.x) * w.zoom), y = Math.round((S.door.y - 34 - w.cam.y) * w.zoom), b = Math.round(0.5 + 0.5 * Math.sin(w.clock * 5));
        ctx.fillStyle = "#1C1D1C"; ctx.fillRect(x - 6, y - 6 - b, 12, 12);
        ctx.fillStyle = "#C6C5B9"; ctx.fillRect(x - 5, y - 5 - b, 10, 10);
        ctx.fillStyle = "#1C1D1C"; var yy = y - 3 - b;
        ctx.fillRect(x - 2, yy, 1, 6); ctx.fillRect(x - 2, yy, 4, 1); ctx.fillRect(x - 2, yy + 2, 3, 1); ctx.fillRect(x - 2, yy + 5, 4, 1);
      }
      // Ab-/Aufblende (schwarz)
      if (S.fade) {
        var t = S.fade.t, a = t < FADE ? t / FADE : 1 - (t - FADE) / FADE;
        ctx.fillStyle = "rgba(0,0,0," + Math.max(0, Math.min(1, a)) + ")"; ctx.fillRect(0, 0, MA.W, MA.H);
      }
    },
    state: S   // für Tests und spätere Skripte (Figur, Welt)
  };
})();
