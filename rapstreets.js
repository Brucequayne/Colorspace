/* Rap Streets – Lader.
   Die Startseite lädt nur diese Datei. Das Spiel liegt im Ordner rapstreets/ (Aufbau wie bei Shizuku)
   und wird erst geladen, wenn man es öffnet, in genau der Reihenfolge aus FILES. Der Cache-Stempel (?v=…) wird übernommen. */
(function () {
  var FILES = [
    "core.js",        // Namensraum RS, Maße, Projektion (Boden um 45° gedreht), Mathe, Zufall, Eingabe, L2
    "art.js",         // Boden, Häuser, Autos, Deko, Crowd – alles prozedural als Pixel-Sprites
    "art-rapper.js",  // Die Rapper (Posen nach Mikro-Pegel und Takt)
    "beats/beats.js", // Instrumentals mit Tempo und erstem Downbeat
    "maps/pool.js",   // Map-Pool
    "world.js",       // Map-Daten, Zeichnen mit Tiefe, Schatten, Tageszeit, Licht, Leben (Crowd, Dampf, Laternen)
    "editor.js",      // Map-Editor (Code 282828)
    "battle.js",      // Battle-Modus: Beat, Mikro, Parts, Pass the mic, Crowd-Hype, Zeitleiste
    "mix.js",         // Audio-Mischung: Compressor + Limiter (Einstellungen im Dev Tool), Mikro-Test
    "record.js",      // Aufnahme als MP4 (Bild + Anzeige + Beat + Mikro), ansehen und speichern
    "main.js"         // Hülle: Canvas, Skalierung, Menü, Schleife
  ];
  var stamp = "";
  try { var m = /[?&]v=([^&]+)/.exec(document.currentScript.src); if (m) stamp = m[1]; } catch (e) {}
  var base = "rapstreets/", state = "idle", pending = null, host = null;
  window.RS = window.RS || {}; window.RS.STAMP = stamp;
  function loadAll(done) {
    if (state === "ready") return done();
    pending = done; if (state === "loading") return; state = "loading";
    var i = 0;
    (function next() {
      if (i >= FILES.length) { state = "ready"; var cb = pending; pending = null; if (cb) cb(); return; }
      var s = document.createElement("script");
      s.src = base + FILES[i] + (stamp ? "?v=" + stamp : "");
      s.onload = function () { i++; next(); };
      s.onerror = function () { state = "idle"; if (host) host.innerHTML = '<div style="position:fixed;inset:0;z-index:30;background:#000;color:#bbb;display:flex;align-items:center;justify-content:center;font:14px system-ui">' + (document.documentElement.lang === "en" ? "Could not load: " : "Konnte nicht laden: ") + base + FILES[i] + "</div>"; };
      document.head.appendChild(s);
    })();
  }
  window.RapStreets = {
    mount: function (el, lang) {
      host = el;
      el.innerHTML = '<div style="position:fixed;inset:0;z-index:30;background:#000"></div>';
      loadAll(function () { if (host === el && window.RS && RS.main) RS.main.mount(el, lang); });
    },
    unmount: function () { pending = null; if (window.RS && RS.main) RS.main.unmount(); host = null; }
  };
})();
