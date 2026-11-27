/* Monsters Arc – Lader.
   Die Startseite lädt nur diese Datei. Das eigentliche Spiel liegt im Ordner monstersarc/
   und besteht aus mehreren Modulen (Aufbau in monstersarc/LIESMICH.md). Sie werden erst geladen, wenn man das Spiel
   öffnet, in genau der Reihenfolge aus FILES. Der Cache-Stempel (?v=…) wird von dieser Datei übernommen.
   Technische Grundlage (Pixel-Look, Boden, Pflanzen, Objekte, Figur, Licht, Map-Editor) ist aus Shizuku übernommen. */
(function () {
  var FILES = [
    "core.js",          // Namensraum MA, Bildgröße, Mathe, Zufall, Rauschen, L2
    "input.js",         // Tastatur und Maus
    "audio.js",         // Sounds (Schritte, Wind), Musik später
    "art-tiles.js",     // Bodentexturen: Stein, Moos, Erde, Sand, Wasser, Meer, Mauer
    "art-objects.js",   // Objekte und Vegetation als Pixel-Sprites
    "art-samurai.js",   // Figuren-Modell in 8 Richtungen
    "map.js",           // Map-Daten: Größe, Kacheln, Kollision, Speichern
    "walls.js",         // Mauern: Hecke, Holzzaun, Mauer (verbunden, unüberwindbar)
    "houses.js",        // Fachwerkhäuser (Objekte mit Tür) und ihre Innenräume
    "props.js",         // Straßenmöbel: Platzuhr, Straßenlaterne, Mülltonne
    "furniture.js",     // Möbel und Einrichtung für Innenräume (seit v0.21): Büro, Sitzen, Küchenmodule, Wohnen
    "buildinterior.js", // Innenräume der Generator-Gebäude: Böden, Wände, Treppen (seit v0.21)
    "deco.js",          // Hausdeko: Blumentöpfe, Efeu, Wandlampe, Schornsteine (immer über der Hauswand)
    "buildgen.js",      // Gebäude-Generator (seit v0.2): Haus aus Parametern, Stil Fachwerk
    "maps/start.js",    // Start-Map des Spiels
    "lighting.js",      // Tageszeit, Licht, Schatten
    "particles.js",     // Blätter, Staub, Spritzer
    "monsters/liste.js", // feste Monsterliste des Spiels (null = nur Browser-Liste)
    "monsters.js",      // Monster: Bild-Generator (vorne/hinten), Schrei, Werte, Monsterliste (seit v0.25)
    "monstertpl.js",    // 25 Grundmonster als Vorlagen
    "monster3d.js",     // 3D-Baukasten für Monster (seit v0.26): Modell, WebGL-Renderer, Stempel-Assets, Pixel-Look
    "attackfx.js",      // Attacken (seit v0.27): Datensatz, Attackenliste, Effekt-Kit (Partikel/Physik, Pixel-Renderer)
    "world.js",         // Spielwelt mit Kamera: zeichnet Boden, Pflanzen, Objekte, Figuren
    "character.js",     // Figur: Laufen, Kollision, Schritte (Spieler und später NPCs)
    "scene-menu.js",    // Hauptmenü
    "scene-walk.js",    // Testlauf (später: Spiel)
    "scene-dex.js",     // Monsterliste im Spiel (seit v0.25)
    "devkit.js",        // Dev-Kit: Map-Editor (weitere Editoren später)
    "buildeditor.js",   // Gebäude-Editor (seit v0.2), Reiter im Dev-Kit
    "monstereditor.js", // Monster-Editor (seit v0.25, 3D seit v0.26), Reiter im Dev-Kit
    "attackeditor.js",  // Attacken-Editor (seit v0.27), Reiter im Dev-Kit
    "main.js"           // Hülle: Canvas, Skalierung, Szenen, Schleife
  ];
  var stamp = "";
  try { var m = /[?&]v=([^&]+)/.exec(document.currentScript.src); if (m) stamp = m[1]; } catch (e) {}
  var base = "monstersarc/";
  window.MA = window.MA || {}; window.MA.STAMP = stamp;
  var state = "idle", pending = null;

  function loadAll(done) {
    if (state === "ready") return done();
    pending = done;
    if (state === "loading") return;
    state = "loading";
    var i = 0;
    (function next() {
      if (i >= FILES.length) { state = "ready"; var cb = pending; pending = null; if (cb) cb(); return; }
      var s = document.createElement("script");
      s.src = base + FILES[i] + (stamp ? "?v=" + stamp : "");
      s.onload = function () { i++; next(); };
      s.onerror = function () { state = "idle"; showError(FILES[i]); };
      document.head.appendChild(s);
    })();
  }
  var host = null;
  function showError(f) {
    if (!host) return;
    host.innerHTML = '<div style="position:fixed;inset:0;z-index:30;background:#000;color:#bbb;display:flex;align-items:center;justify-content:center;font:14px system-ui">' +
      (document.documentElement.lang === "en" ? "Could not load: " : "Konnte nicht laden: ") + "monstersarc/" + f + "</div>";
  }

  window.MonstersArc = {
    mount: function (el, lang) {
      host = el;
      el.innerHTML = '<div style="position:fixed;inset:0;z-index:30;background:#000"></div>';
      loadAll(function () { if (host === el && window.MA && MA.main) MA.main.mount(el, lang); });
    },
    unmount: function () {
      pending = null;
      if (window.MA && MA.main) MA.main.unmount();
      host = null;
    }
  };
})();
