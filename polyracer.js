/* Poly Racer – Lader.
   Die Startseite lädt nur diese Datei. Das Spiel liegt im Ordner polyracer/ als ES-Module (Three.js r170 in polyracer/lib/).
   Beim ersten Öffnen wird eine Import-Map gesetzt: "three" und jedes eigene Modul ("pr/…") bekommen den Cache-Stempel (?v=…)
   der Startseite, damit nach einem Update keine alten Teile aus dem Browser-Cache kommen. Aufbau: polyracer/LIESMICH.md */
(function () {
  var MODULES = [
    "core.js",      // Namensraum, Texte (L2), Speicher, Mathe, Zufall, Rauschen
    "engine.js",    // Renderer, Szene, Kamera, Himmel, Sonne/Licht nach Uhrzeit, Nebel, Schatten, Qualität
    "terrain.js",   // Gelände: Höhenraster, Low-Poly-Netz in Kacheln, Formen, Malen, Höhe/Neigung abfragen
    "road.js",      // Straße: Spline-Punkte mit Höhe, Breite, Neigung, Kerbs; Netz, Abfrage für Physik, Gelände-Einbettung
    "models.js",    // Prozedurale Low-Poly-Platzhalter (Bäume, Büsche, Steine, Gras, Auto)
    "vegetation.js",// Vegetation: Typen, Pinsel-Gruppen mit Wahrscheinlichkeiten, Instanzen
    "wind.js",      // Wind sichtbar als feine Linien (Stärke und Richtung)
    "world.js",     // Welt = Gelände + Straße + Vegetation + Umgebung; Boden-Abfrage, Standard-Strecke
    "sceneio.js",   // Szenen als .txt exportieren/importieren, automatisch speichern
    "input.js",     // Tastatur und Controller
    "car.js",       // Fahrzeug: Starrkörper, 4 Räder mit Federung, Reifenmodell, Motor/Getriebe/Antrieb
    "drive.js",     // Testfahrt: Auto auf der Strecke, Verfolgerkamera, Anzeige
    "editor.js",    // Developer Tool: Gelände-, Straßen-, Vegetationspinsel, Umgebung, Export
    "menu.js",      // Hauptmenü (später: Werkstatt)
    "main.js"       // Hülle: Start, Zustände, Schleife
  ];
  var stamp = "";
  try { var m = /[?&]v=([^&]+)/.exec(document.currentScript.src); if (m) stamp = m[1]; } catch (e) {}
  var q = stamp ? "?v=" + stamp : "", mapped = false, host = null, mod = null, token = 0;
  function importMap() {
    if (mapped) return; mapped = true;
    var imp = { "three": "./polyracer/lib/three.module.min.js" + q, "three/addons/": "./polyracer/lib/addons/" };
    MODULES.forEach(function (f) { imp["pr/" + f] = "./polyracer/src/" + f + q; });
    var s = document.createElement("script"); s.type = "importmap"; s.textContent = JSON.stringify({ imports: imp });
    document.head.appendChild(s);
  }
  function fail(el, e) {
    el.innerHTML = '<div style="position:fixed;inset:0;z-index:30;background:#111214;color:#bbb;display:flex;align-items:center;justify-content:center;font:600 15px system-ui;padding:24px;text-align:center">' +
      "Poly Racer konnte nicht geladen werden. / Poly Racer could not be loaded.<br>" + String((e && e.message) || e) + "</div>";
  }
  window.PolyRacer = {
    mount: function (el, lang) {
      host = el; var my = ++token;
      el.innerHTML = '<div style="position:fixed;inset:0;z-index:30;background:#111214"></div>';
      importMap();
      import("pr/main.js").then(function (m) { mod = m; if (host === el && my === token) m.mount(el, lang, stamp); }).catch(function (e) { if (host === el) fail(el, e); });
    },
    unmount: function () { token++; if (mod) mod.unmount(); host = null; }
  };
})();
