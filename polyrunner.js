/* PolyRunner – Lader.
   Parkour-Zeitfahren in minimalistischem 3D. Die Startseite lädt nur diese Datei. Das Spiel liegt im Ordner polyrunner/ als ES-Module;
   Three.js kommt aus polyracer/lib/ (nicht doppelt im Repo). Import-Map gemeinsam mit Poly Racer und Leaarn (window.CSImport):
   jedes Modul ("pru/…") bekommt den Cache-Stempel der Startseite. Aufbau: polyrunner/LIESMICH.md */
(function () {
  var MODULES = [
    "core.js",    // Namensraum, Texte (L2), Speicher, Mathe
    "engine.js",  // Renderer, Himmel mit Sonne und Tageszyklus, Licht, Schatten, Boden, Beton-Material
    "world.js",   // Map-Daten, Strukturen (Prismen), Kollision, Start/Ziel/Test-Start
    "runner.js",  // Test-Runner: Skelett (Rig) + Low-Poly-Strichmännchen, Animation
    "move.js",    // Bewegung und Parkour
    "tweak.js",   // Tweaker: Bewegung, Größe, Animation live einstellen, Presets, Export
    "play.js",    // Testlauf: Kamera, Zeitfahren, Bestzeiten
    "editor.js",  // Map Editor
    "menu.js",    // Hauptmenü, Einstellungen
    "haare.js",   // Haare: Anime-Strähnen mit Physik, Malen auf der Kopfhaut
    "rig.js",     // Rig der Spielfigur: Gelenke + Gewichte
    "kleider_basis.js", // Grundformen für neue Kleidung (Badehose als Punkt-Netz)
    "kleidung.js",// Kleidung: Entwürfe aus Ringen → Stoffnetz mit Dicke und Physik
    "figur.js",   // Spielfigur: Modell (model/figur.bin) auf dem Skelett, Haut, Augen, Brauen, enge Kleidung
    "riged.js",   // Reiter „Rig“ im Charakter-Editor
    "chared.js",  // Charakter-Editor
    "punkte.js",  // Punkt-Editor für Kleidung (Netz Punkt für Punkt)
    "malen.js",   // Stoffpinsel: Formen, Linien, Pinsel auf dem Stoff
    "kleided.js", // Kleidungs-Editor
    "main.js"     // Hülle: Start, Zustände, Schleife, Gestaltung
  ];
  var stamp = "";
  try { var m = /[?&]v=([^&]+)/.exec(document.currentScript.src); if (m) stamp = m[1]; } catch (e) {}
  var q = stamp ? "?v=" + stamp : "", host = null, mod = null, token = 0;
  var CS = window.CSImport || (window.CSImport = { map: {}, done: false,
    add: function (o) { for (var k in o) if (!(k in this.map)) this.map[k] = o[k]; },
    ensure: function () { if (this.done) return; this.done = true; var s = document.createElement("script"); s.type = "importmap"; s.textContent = JSON.stringify({ imports: this.map }); document.head.appendChild(s); } });
  (function () {
    var imp = { "three": "./polyracer/lib/three.module.min.js" + q, "three/addons/": "./polyracer/lib/addons/" };
    MODULES.forEach(function (f) { imp["pru/" + f] = "./polyrunner/src/" + f + q; });
    CS.add(imp);
  })();
  function fail(el, e) {
    el.innerHTML = '<div style="position:fixed;inset:0;z-index:30;background:#111214;color:#bbb;display:flex;align-items:center;justify-content:center;font:600 15px system-ui;padding:24px;text-align:center">' +
      "PolyRunner konnte nicht geladen werden. / PolyRunner could not be loaded.<br>" + String((e && e.message) || e) + "</div>";
  }
  window.PolyRunner = {
    mount: function (el, lang) {
      host = el; var my = ++token;
      el.innerHTML = '<div style="position:fixed;inset:0;z-index:30;background:#111214"></div>';
      CS.ensure();
      import("pru/main.js").then(function (m) { mod = m; if (host === el && my === token) m.mount(el, lang, stamp); }).catch(function (e) { if (host === el) fail(el, e); });
    },
    unmount: function () { token++; if (mod) mod.unmount(); host = null; }
  };
})();
