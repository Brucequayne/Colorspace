/* Shizuku (雫) – Lader.
   Die Startseite lädt nur diese Datei. Das eigentliche Spiel liegt im Ordner shizuku/
   und besteht aus mehreren Modulen. Sie werden erst geladen, wenn man das Spiel öffnet,
   in genau der Reihenfolge aus FILES. Der Cache-Stempel (?v=…) wird von dieser Datei übernommen. */
(function () {
  var FILES = [
    "core.js",          // Namensraum SZ, Konstanten, Mathe, Zufall, Rauschen, L2
    "input.js",         // Tastatur und Maus
    "audio.js",         // Platzhalter für Musik und Sounds
    "weapons.js",       // Waffen und ihre Werte
    "art-tiles.js",     // Bodentexturen: Stein, Moos, Erde, Sand, Wasser, Mauer
    "art-objects.js",   // Objekte und Vegetation als Pixel-Sprites
    "art-samurai.js",   // Samurai in 8 Richtungen, Schwert
    "arena.js",         // Arena-Daten, Kacheln, Kollision, Speichern
    "arenas/pool.js",   // Map-Pool: alle Arenen für alle Spieler
    "lighting.js",      // Tageszeit, Licht, Schatten
    "particles.js",     // Blätter, Staub, Spritzer, Stroh, Wind, Wirbel, Tinte
    "world.js",         // Spielwelt: zeichnet Insel, Objekte, Figuren, Pfeile
    "player.js",        // Samurai: Bewegung, Dash, Angriffe, Blocks, Bogen, Leben, Energie
    "enemies.js",       // Gegner und ihre KI (Ronin)
    "hud.js",           // Lebens- und Energiebalken
    "scene-menu.js",    // Menü
    "scene-intro.js",   // Übergang: Tropfen und Wachstum
    "scene-arena.js",   // Kampf-Arena
    "editor.js",        // Dev Tool
    "main.js"           // Hülle: Canvas, Skalierung, Szenen, Schleife
  ];
  var stamp = "";
  try { var m = /[?&]v=([^&]+)/.exec(document.currentScript.src); if (m) stamp = m[1]; } catch (e) {}
  var base = "shizuku/";
  window.SZ = window.SZ || {}; window.SZ.STAMP = stamp;   // auch für Sounds in shizuku/audio/
  var state = "idle", pending = null, failed = false;

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
      s.onerror = function () { failed = true; state = "idle"; showError(FILES[i]); };
      document.head.appendChild(s);
    })();
  }
  var host = null;
  function showError(f) {
    if (!host) return;
    host.innerHTML = '<div style="position:fixed;inset:0;z-index:30;background:#000;color:#bbb;display:flex;align-items:center;justify-content:center;font:14px system-ui">' +
      (document.documentElement.lang === "en" ? "Could not load: " : "Konnte nicht laden: ") + "shizuku/" + f + "</div>";
  }

  window.Shizuku = {
    mount: function (el, lang) {
      host = el; failed = false;
      el.innerHTML = '<div style="position:fixed;inset:0;z-index:30;background:#000"></div>';
      loadAll(function () { if (host === el && window.SZ && SZ.main) SZ.main.mount(el, lang); });
    },
    unmount: function () {
      pending = null;
      if (window.SZ && SZ.main) SZ.main.unmount();
      host = null;
    }
  };
})();
