/* Leaarn – Lader.
   Lernspiel: Hub (Zuhause) in Low-Poly-3D wie Poly Racer, Lernaufgaben am Schreibtisch bringen Geld.
   Die Startseite lädt nur diese Datei. Das Spiel liegt im Ordner leaarn/ als ES-Module; Three.js kommt aus polyracer/lib/.
   Import-Map gemeinsam mit Poly Racer (window.CSImport): jedes Modul ("le/…") bekommt den Cache-Stempel der Startseite.
   Aufbau: leaarn/LIESMICH.md */
(function () {
  var MODULES = [
    "core.js",        // Namensraum, Texte (L2), Speicher, Mathe, Zufall, Rauschen (aus Poly Racer)
    "engine.js",      // Renderer, Kamera, Himmel, Sonne/Licht, Nebel, Schatten (aus Poly Racer)
    "terrain.js",     // Gelände 360 × 360 auf 1440 m (aus Poly Racer)
    "road.js",        // Straßen (aus Poly Racer)
    "models.js",      // Low-Poly-Modelle: Bäume, Steine, Gras, Auto (aus Poly Racer)
    "vegetation.js",  // Vegetation (aus Poly Racer, wächst nicht in Häusern)
    "wind.js",        // Wind-Symbol (aus Poly Racer)
    "race.js",        // Checkpoints (aus Poly Racer, für spätere Fahr-Aufgaben)
    "objekte.js",     // Objekte auf der Map: Straßenlaterne … (seit v0.19)
    "houses.js",      // Haus-Bauteile, Hausbau, Kollision, Türen, Interaktionen
    "haeuser.js",     // fertige Häuser für den Map-Editor (Starterhaus)
    "world.js",       // Welt = Gelände + Straßen + Vegetation + Häuser; Standard-Hub
    "sceneio.js",     // Map als .txt exportieren/importieren, automatisch speichern
    "input.js",       // Tastatur und Controller
    "car.js",         // Fahrzeug (aus Poly Racer, später: Auto kaufen)
    "drive.js",       // Auto-Test im Map-Editor
    "save.js",        // Spielstand: Geld, Zwischenkonto, Lernstatistik
    "items.js",       // Gegenstände, Inventar-Daten
    "inventory.js",   // Schnellauswahl 1–9, Rucksack (I), Ziehen und Ablegen
    "musik.js",       // Ghettoblaster
    "sound.js",       // Kassen-Klingel, Münz-Tick
    "faecher/werkzeug.js", "faecher/farben.js", "faecher/wortliste.js", "faecher/vokabeln.js", "faecher/elemente.js", "faecher/mathe.js", "faecher/deutsch.js", "faecher/englisch.js", "faecher/fremdsprache.js", "faecher/biologie.js",
    "faecher/chemie.js", "faecher/physik.js", "faecher/geschichte.js", "faecher/erdkunde.js", "faecher/politik.js", "faecher/wirtschaft.js",
    "faecher/religion.js", "faecher/kunst.js", "faecher/musik.js", "faecher/informatik.js",
    "faecher/index.js", // alle Fächer, Aufgabenformat, Belohnung
    "stats.js",       // Statistiken im Laptop
    "learn.js",       // Lernmodus am Laptop
    "player.js",      // Spielfigur: Modell, Laufen, Kollision
    "shop.js",        // Supermarkt-Regale: Einkaufen (seit v0.17)
    "play.js",        // Spielen: Hub, Kamera, Türen, Schreibtisch
    "editor.js",      // Map-Editor (Gelände, Straße, Vegetation, Häuser, Umgebung, Datei)
    "houseeditor.js", // Haus-Editor (mit Bulldozer)
    "charedit.js",    // Charakter-Editor (erster Start)
    "menu.js",        // Hauptmenü
    "main.js"         // Hülle: Start, Zustände, Schleife, Gestaltung
  ];
  var stamp = "";
  try { var m = /[?&]v=([^&]+)/.exec(document.currentScript.src); if (m) stamp = m[1]; } catch (e) {}
  var q = stamp ? "?v=" + stamp : "", host = null, mod = null, token = 0;
  var CS = window.CSImport || (window.CSImport = { map: {}, done: false,
    add: function (o) { for (var k in o) if (!(k in this.map)) this.map[k] = o[k]; },
    ensure: function () { if (this.done) return; this.done = true; var s = document.createElement("script"); s.type = "importmap"; s.textContent = JSON.stringify({ imports: this.map }); document.head.appendChild(s); } });
  (function () {
    var imp = { "three": "./polyracer/lib/three.module.min.js" + q, "three/addons/": "./polyracer/lib/addons/" };
    MODULES.forEach(function (f) { imp["le/" + f] = "./leaarn/src/" + f + q; });
    CS.add(imp);
  })();
  function fail(el, e) {
    el.innerHTML = '<div style="position:fixed;inset:0;z-index:30;background:#111214;color:#bbb;display:flex;align-items:center;justify-content:center;font:600 15px system-ui;padding:24px;text-align:center">' +
      "Leaarn konnte nicht geladen werden. / Leaarn could not be loaded.<br>" + String((e && e.message) || e) + "</div>";
  }
  window.Leaarn = {
    mount: function (el, lang) {
      host = el; var my = ++token;
      el.innerHTML = '<div style="position:fixed;inset:0;z-index:30;background:#111214"></div>';
      CS.ensure();
      import("le/main.js").then(function (m) { mod = m; if (host === el && my === token) m.mount(el, lang, stamp); }).catch(function (e) { if (host === el) fail(el, e); });
    },
    unmount: function () { token++; if (mod) mod.unmount(); host = null; }
  };
})();
