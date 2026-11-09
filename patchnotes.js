/* Color Space – Patchnotes aller Spiele und Tools.
   Neueste Version jeweils oben. t = Zeitpunkt des Updates (deutsche Zeit).
   Die Versionsnummer auf den Kacheln kommt aus dem obersten Eintrag. */
window.PATCHNOTES = {

  // ================= Tools =================
  pixellab: [
    { v: "0.32", t: "2026-11-08T02:15:00+01:00",
      de: ["Start ohne Modifier, das Foto bleibt erst einmal unverändert", "Verfügbare Modifier stehen jetzt gut sichtbar rechts zur Auswahl", "Aus „Werkzeugen“ werden „Modifier“"],
      en: ["Starts without modifiers, the photo stays unchanged at first", "Available modifiers are now clearly listed on the right", "“Tools” are now called “modifiers”"] },
    { v: "0.31", t: "2026-11-07T03:39:00+01:00",
      de: ["Layout passt sich an Desktop, Tablet und Handy an", "Foto wird in die Fläche eingepasst, nie größer als das Original", "Schärfere Vorschau in passender Auflösung"],
      en: ["Layout adapts to desktop, tablet and phone", "Photo is fitted to the canvas, never larger than the original", "Sharper preview at a matching resolution"] },
    { v: "0.3", t: "2026-11-07T03:23:00+01:00",
      de: ["Neuer Knopf „Neue Variante würfeln“", "Polymerge-Formen werden gedreht und verzerrt, jede Variante sieht anders aus", "Collage-Teile flach, ohne Fugen und Schatten"],
      en: ["New “Roll a new variant” button", "Polymerge shapes are rotated and warped, every variant looks different", "Collage pieces are flat, without gaps or shadows"] },
    { v: "0.2", t: "2026-11-07T03:12:00+01:00",
      de: ["Kette aus mehreren Werkzeugen, wirken von oben nach unten", "Neues Werkzeug Polymerge: Collage als Kreis, Dreieck, Wurzeln oder Fleck", "Reihenfolge per Pfeilen ändern, Werkzeuge per Auge ausschalten"],
      en: ["Chain of several tools, applied top to bottom", "New tool Polymerge: collage as circle, triangle, roots or blob", "Reorder with arrows, switch tools off with the eye"] },
    { v: "0.1", t: "2026-11-07T02:49:00+01:00",
      de: ["Erste Version: Foto laden, verfremden, als JPEG speichern", "Werkzeug Fragments: Kaleidoskop aus Voronoi-Zellen", "Das Foto verlässt dein Gerät nicht"],
      en: ["First version: load a photo, transform it, save as JPEG", "Tool Fragments: kaleidoscope of Voronoi cells", "The photo never leaves your device"] }
  ],

  colorspin: [
    { v: "0.11", t: "2026-11-08T02:15:00+01:00",
      de: ["Qualitätsstufen: Standard 2400 px, Hoch 3200 px, Maximum 4096 px", "Schon Gemaltes wird beim Umschalten mitgenommen", "Höhere Stufen speichern feiner"],
      en: ["Quality presets: Standard 2400 px, High 3200 px, Maximum 4096 px", "Existing painting is kept when switching", "Higher presets save finer detail"] },
    { v: "0.1", t: "2026-11-07T02:28:00+01:00",
      de: ["Erste Version: auf einer drehenden Schallplatte malen", "Aus jedem Strich werden Ringe und Spiralen", "Export als JPEG"],
      en: ["First version: paint on a spinning record", "Every stroke turns into rings and spirals", "Export as JPEG"] }
  ],

  ezcrop: [
    { v: "0.11", t: "2026-11-07T04:31:00+01:00",
      de: ["Neuer Modus für Videos mit wenig Bitrate", "Ausschnitt wird in echter Pixelgröße gerendert, ohne Hochskalieren", "Bitrate richtet sich nach dem Ausgangsmaterial"],
      en: ["New mode for low-bitrate videos", "Crop is rendered at its true pixel size, no upscaling", "Bitrate follows the source material"] },
    { v: "0.1", t: "2026-11-07T04:06:00+01:00",
      de: ["Erste Version: Querformat-Video auf 9:16 zuschneiden", "Rahmen beim Abspielen mit der Maus führen, wird als Keyframes gespeichert", "Export als Full-HD-MP4, alles im Browser"],
      en: ["First version: crop landscape video to 9:16", "Steer the frame with the mouse during playback, stored as keyframes", "Export as Full HD MP4, all in the browser"] }
  ],

  drawspace: [
    { v: "0.25", t: "2026-11-09T02:29:00+01:00",
      de: ["Spraydose mit Wind: Stärke, Richtung und Turbulenz", "Farbe wird realistisch in Windrichtung verweht"],
      en: ["Spray can with wind: strength, direction and turbulence", "Paint drifts realistically with the wind"] },
    { v: "0.2", t: "2026-11-09T02:10:00+01:00",
      de: ["Farbkreis mit Farbton, Sättigung und Helligkeit", "Viel stärkere Glättung (alte 100 % entsprechen jetzt etwa 25 %)", "Neue Pinsel: Haarpinsel, Borstenpinsel, Spraydose mit eigenen Reglern", "Pinsel und Lineal öffnen ein Auswahlmenü", "Neues Werkzeug Kurve: Linie ziehen, greifen und biegen", "Neues dunkles Vorschaubild"],
      en: ["Colour wheel with hue, saturation and brightness", "Much stronger smoothing (old 100 % is now about 25 %)", "New brushes: hair brush, bristle brush, spray can with their own sliders", "Brush and ruler open a picker menu", "New curve tool: drag a line, grab it and bend it", "New dark thumbnail"] },
    { v: "0.1", t: "2026-11-09T01:47:00+01:00",
      de: ["Erste Version: weiße Fläche mit 100.000 × 100.000 Pixeln im Vollbild", "Pinsel und Lineal, Dicke, Deckkraft und Farbe", "Glättung der Mausbewegung", "Ausschnitt ziehen und als JPEG exportieren, mit Live-Pixelgröße"],
      en: ["First version: white 100,000 × 100,000 pixel area in fullscreen", "Brush and ruler, size, opacity and colour", "Mouse smoothing", "Drag a crop and export it as JPEG, with live pixel size"] }
  ],

  framepaint: [
    { v: "0.52", t: "2026-11-09T00:43:00+01:00",
      de: ["Magic Paint: spätere Schichten übermalen frühere Flächen nicht mehr", "Kleine Toleranz an den Rändern, damit keine Lücken entstehen", "Härtere Schichten, mehr Details auch bei vielen Schichten"],
      en: ["Magic Paint: later layers no longer paint over earlier areas", "Small tolerance at the edges so no gaps appear", "Harder layers, more detail even with many layers"] },
    { v: "0.51", t: "2026-11-08T16:26:00+01:00",
      de: ["Pipette nimmt immer die Farbe aus dem Video, nie aus der Malerei"],
      en: ["Picker always takes the colour from the video, never from the paint"] },
    { v: "0.5", t: "2026-11-08T06:35:00+01:00",
      de: ["Magic Paint: Knopf „Auf alle Frames“", "Neuer Pinsel Wachsmalkreide", "Quickpaint und Magic Paint mit Pinselwahl: Strich, Spray, Wachsmalkreide", "Quickpaint und Magic Paint malen mit voller Deckkraft"],
      en: ["Magic Paint: “All frames” button", "New crayon brush", "Quickpaint and Magic Paint with brush choice: stroke, spray, crayon", "Quickpaint and Magic Paint paint at full opacity"] },
    { v: "0.22", t: "2026-11-08T05:13:00+01:00",
      de: ["Quickpaint: Knopf, um die Einstellung auf alle folgenden Frames anzuwenden"],
      en: ["Quickpaint: button to apply the settings to all following frames"] },
    { v: "0.21", t: "2026-11-08T04:59:00+01:00",
      de: ["Quickpaint-Fenster bleibt offen, mit Schließen-Symbol", "Strichenden kantig und teils spitz statt rund"],
      en: ["Quickpaint window stays open, with a close icon", "Stroke ends angular and sometimes pointed instead of round"] },
    { v: "0.2", t: "2026-11-08T04:34:00+01:00",
      de: ["Magic Paint: gleiche Farbpalette über alle Frames", "Fenster bleibt offen und setzt sich beim Öffnen zurück", "Zwei Speicherplätze für Einstellungen", "Obere Schichten lassen mehr durchscheinen"],
      en: ["Magic Paint: same colour palette across all frames", "Window stays open and resets when reopened", "Two slots for saving settings", "Upper layers let more show through"] },
    { v: "0.16", t: "2026-11-08T04:12:00+01:00",
      de: ["Neu: Magic Paint malt den ganzen Frame automatisch in 4 bis 16 Schichten", "Jede Schicht mit eigener Strichbreite und Härte"],
      en: ["New: Magic Paint paints the whole frame automatically in 4 to 16 layers", "Each layer with its own stroke width and hardness"] },
    { v: "0.15", t: "2026-11-08T03:56:00+01:00",
      de: ["Quickpaint: dichtere, dickere Striche mit Überlappung", "Winkel dreht die Striche einzeln statt der ganzen Fläche", "Fenster lässt sich verschieben und springt nicht mehr weg"],
      en: ["Quickpaint: denser, thicker strokes with overlap", "Angle turns each stroke instead of the whole area", "Window can be dragged and no longer jumps away"] },
    { v: "0.12", t: "2026-11-08T03:35:00+01:00",
      de: ["D gedrückt halten blendet die Malerei aus", "Neu: Quickpaint (Q) füllt Farbflächen als Skizze", "Live-Vorschau mit Härte, Humanize und Winkel"],
      en: ["Hold D to hide the painting", "New: Quickpaint (Q) fills colour areas as a sketch", "Live preview with hardness, humanize and angle"] },
    { v: "0.1", t: "2026-11-08T03:06:00+01:00",
      de: ["Erste Version: Video laden und Bild für Bild übermalen", "Stift, Pinsel, Spraydose, Deckkraft, Farben per Pipette (C)", "5, 15 oder 30 Bilder pro Sekunde", "Export als Full-HD-MP4, nur Malerei oder über dem Video"],
      en: ["First version: load a video and paint over it frame by frame", "Pen, brush, spray can, opacity, colours via picker (C)", "5, 15 or 30 frames per second", "Export as Full HD MP4, paint only or over the video"] }
  ],

  channels: [
    { v: "0.25", t: "2026-11-09T03:00:00+01:00",
      de: ["Neue Tiefenkarte per KI (Depth Anything V2): nah hell, fern dunkel, wie in DaVinci Resolve", "Läuft komplett im Browser, dein Bild verlässt das Gerät nicht", "Modell wird nur beim ersten Mal geladen (ca. 38 MB), danach aus dem Cache", "Kanten werden am Foto ausgerichtet", "Detailstufe wählbar: Standard oder Fein", "Farbige Karte jetzt im Wärmebild-Look"],
      en: ["New AI depth map (Depth Anything V2): near is bright, far is dark, like in DaVinci Resolve", "Runs entirely in the browser, your image never leaves the device", "Model loads only the first time (about 38 MB), then from the cache", "Edges are aligned to the photo", "Choose the detail level: Standard or Fine", "Colour map now has a thermal-camera look"] },
    { v: "0.21", t: "2026-11-08T02:15:00+01:00",
      de: ["Neu: geschätzte Tiefenkarte mit den Ebenen Nah, Mitte und Fern", "Als Graustufen oder farbige Wärmekarte", "Leicht verschoben entsteht Parallax"],
      en: ["New: estimated depth map with near, middle and far layers", "As greyscale or coloured heat map", "Shift them slightly for parallax"] },
    { v: "0.2", t: "2026-11-07T12:58:00+01:00",
      de: ["Neu: CMYK-Splitter in Cyan, Magenta, Gelb und Schwarz", "Neu: Tonwerte in Schatten, Mitten und Lichter", "Ebenen ergeben übereinander wieder das Original"],
      en: ["New: CMYK splitter into cyan, magenta, yellow and black", "New: tones into shadows, midtones and highlights", "Stacked layers add up to the original again"] },
    { v: "0.1", t: "2026-11-07T12:46:00+01:00",
      de: ["Erste Version: eigene Bilder in Rot, Grün und Blau zerlegen", "Ebenen verschieben für Farbsäume", "Export einzeln oder zusammen als PNG"],
      en: ["First version: split your images into red, green and blue", "Move layers for colour fringes", "Export one by one or together as PNG"] }
  ],

  // ================= Spiele =================
  citygen: [
    { v: "0.25", t: "2026-11-09T04:20:00+01:00",
      de: ["Häuserblöcke wie auf OSM-Karten: gerade Fassaden entlang der Straße, saubere Brandwände, klare Innenhöfe", "Hinterhaus-Flügel in dichten europäischen Blöcken, Hecken als gerade Grundstücksgrenzen", "Kreuzungen mit abgerundeten Bordsteinecken, Zebrastreifen sauber ausgerichtet, Haltelinien", "Bahn fährt in der Stadt auf einem Viadukt über den Straßen", "Spezialbauten passen sich in die rote Fläche ein und stehen nicht mehr über", "Neue Spezialbauten: Schloss mit Barockgarten, Tempel, Burg, Einkaufszentrum, Marktplatz, Krankenhaus, Arena, Baseballstadion, dazu Varianten für Kathedrale, Kirche, Oper, Museum und Denkmal", "Hafen kompakt: Kaikante mit Kränen, Containerblöcke, Lagerhallen", "Neuer Pinsel Grau: Parkplätze mit Stellreihen, Fahrgassen, Bäumen und Autos", "Mehr Details: Gartenhäuser, Terrassen, Trampoline, Mülltonnen, Fahrradständer, Spielplätze, Pflaster auf Plätzen"],
      en: ["Housing blocks like on OSM maps: straight façades along the street, clean party walls, clear courtyards", "Rear wings in dense European blocks, hedges as straight plot boundaries", "Junctions with rounded kerbs, cleanly aligned zebra crossings, stop lines", "Trains run on a viaduct above the streets in the city", "Special buildings fit into the red area and no longer overlap", "New special buildings: palace with baroque garden, temple, castle, shopping mall, market square, hospital, arena, ballpark, plus variants for cathedral, church, opera, museum and monument", "Compact harbour: quay with cranes, container blocks, warehouses", "New grey brush: parking lots with rows, aisles, trees and cars", "More details: garden sheds, patios, trampolines, bins, bike racks, playgrounds, paving on squares"] },
    { v: "0.2", t: "2026-11-09T03:57:00+01:00",
      de: ["Neue Häuserblock-Engine: Grundstücke folgen der echten Blockform statt Rechtecken", "Zum Zentrum hin dichter: geschlossene Randbebauung, Häuser berühren sich", "Organische Blöcke mit Innenhöfen, teils mit Hinterhäusern", "Weiter außen lockerer: Reihen- und Doppelhäuser mit Gärten und Hecken an den Grundstücksgrenzen", "USA: Downtown mit großen Gebäuden und Parkplätzen im Blockinneren", "Japan: dicht gepackte schmale Häuser im Zentrum", "Ruhigere Dachfarben pro Block, Satteldächer mit Licht und Schatten"],
      en: ["New housing block engine: plots follow the real block shape instead of rectangles", "Denser towards the centre: closed perimeter blocks, houses touch each other", "Organic blocks with courtyards, some with rear buildings", "Looser further out: terraced and semi-detached houses with gardens and hedges along plot lines", "USA: downtown with large buildings and parking inside the blocks", "Japan: tightly packed narrow houses in the centre", "Calmer roof colours per block, gabled roofs with light and shade"] },
    { v: "0.1", t: "2026-11-09T03:45:00+01:00",
      de: ["Neues Spiel: Hauptstraßen und Verteilerstraßen mit geglätteter Maus skizzieren", "Stadtstil wählen: USA, Europa oder Japan", "Seitenstraßen, Häuser, Parkplätze, Autos, Bäume und Markierungen entstehen prozedural", "Mit Grün, Blau und Rot Parks, Wasser und Spezialbauten einmalen und neu generieren", "Brücken über Flüsse, Bahnlinie mit Bahnhof, Stadion, Kathedrale, Oper, Hafen, Flughafen und mehr", "Stadt als PNG speichern"],
      en: ["New game: sketch main and distributor roads with smoothed mouse input", "Pick a city style: USA, Europe or Japan", "Side streets, houses, parking lots, cars, trees and road markings are generated procedurally", "Paint parks, water and special buildings in green, blue and red, then regenerate", "Bridges over rivers, railway with station, stadium, cathedral, opera, harbour, airport and more", "Save the city as PNG"] }
  ],
  flughafen: [
    { v: "0.5", t: "2026-11-09T05:07:00+01:00",
      de: ["Neue Straßenart: Einbahn einspurig ohne Parkplätze (Taste O wechselt jetzt durch drei Arten)", "Kurvenmodus (Taste C): Anfang, Ende, dann mit der Maus biegen, für runde Straßen und Rollwege", "Busse bringen und holen jetzt wirklich Fluggäste, fahren öfter und bis zu vier pro Haltestelle", "Fehler behoben: Ankommende landeten nie beim Bus oder Taxi", "Parkende Autos bringen 1 bis 4 Fluggäste, Ankommende fahren später mit dem geparkten Auto weg und zahlen die Parkgebühr", "Flugzeuge bringen 50 bis 100 % mehr Umsatz", "Feuerwehr kostet nur noch 750.000 €", "Neuer Vegetationspinsel: Bäume und Büsche gemischt, Umschalt entfernt"],
      en: ["New road type: one-way single lane without parking (key O now cycles through three types)", "Curve mode (key C): start, end, then bend with the mouse, for round roads and taxiways", "Buses now really drop off and pick up passengers, run more often and up to four per stop", "Bug fixed: arriving passengers never used the bus or taxi", "Parked cars bring 1 to 4 passengers, arriving passengers later drive the parked car away and pay the parking fee", "Aircraft earn 50 to 100 % more revenue", "Fire station now costs only €750,000", "New vegetation brush: mixed trees and bushes, Shift removes"] },
    { v: "0.42", t: "2026-11-08T00:12:00+01:00",
      de: ["Ankommende verlassen den Flughafen per Bus, Auto oder Taxi", "Neu: Taxistand mit Gebühr pro Fahrt", "Mehr Einnahmen, Parken kostet 5 € pro Sekunde"],
      en: ["Arriving passengers leave by bus, car or taxi", "New: taxi rank with a fee per ride", "More income, parking costs €5 per second"] },
    { v: "0.41", t: "2026-11-07T23:38:00+01:00",
      de: ["Fast Vollbild mit Baumenü im Spiel", "Einbahnstraßen bleiben zweispurig, eine Spur wird zu Schrägparkplätzen"],
      en: ["Near fullscreen with an in-game build menu", "One-way roads stay two lanes, one becomes angled parking"] },
    { v: "0.4", t: "2026-11-07T23:22:00+01:00",
      de: ["Einbahn-Straßen und -Rollwege mit Pfeilen (Taste O)", "Landstraße am Rand: alle Autos und Busse kommen von dort", "Eigene Anflug- und Abflugrouten zeichnen", "Pistenlänge beim Bauen ziehen", "Flugzeuge überlappen sich nicht mehr"],
      en: ["One-way roads and taxiways with arrows (key O)", "Country road at the edge: all cars and buses come from there", "Draw your own approach and departure routes", "Drag the runway length while building", "Aircraft no longer overlap"] },
    { v: "0.32", t: "2026-11-07T02:13:00+01:00",
      de: ["Schrift ohne Kursiv, passend zum neuen Seitenlook"],
      en: ["Type without italics, matching the new site look"] },
    { v: "0.31", t: "2026-11-07T01:10:00+01:00",
      de: ["Durchgangsverkehr auf den Straßen", "Autos fahren weiter herein und hinaus"],
      en: ["Through traffic on the roads", "Cars drive further in and out"] },
    { v: "0.3", t: "2026-11-07T01:02:00+01:00",
      de: ["Landseite: Fluggäste, Busse mit 50 Plätzen und Autos", "Parkhaus mit 16 Stellplätzen", "Infos zu wartenden und ankommenden Fluggästen"],
      en: ["Landside: passengers, buses with 50 seats and cars", "Car park with 16 spaces", "Info on waiting and arriving passengers"] },
    { v: "0.24", t: "2026-11-07T00:39:00+01:00",
      de: ["Neue Wirtschaft mit echten Preisen in Millionen", "Jedes abfahrende Auto zahlt 15 bis 50 €", "Alte Spielstände werden umgestellt"],
      en: ["New economy with real prices in millions", "Every departing car pays €15 to €50", "Old saves are converted"] },
    { v: "0.2", t: "2026-11-07T00:23:00+01:00",
      de: ["Freies Bauen auf der Karte: Piste, Rollwege, Positionen, Terminals", "Karte verschieben und zoomen", "Klick auf Gebautes zeigt Infos, Ausbau und Abriss"],
      en: ["Free building on the map: runway, taxiways, stands, terminals", "Pan and zoom the map", "Click a building for info, upgrades and demolition"] },
    { v: "0.1", t: "2026-11-06T23:43:00+01:00",
      de: ["Erste Version des Aufbauspiels", "Positionen, Gates, Terminals, Tower und mehr ausbauen", "Spielstand wird nur lokal gespeichert"],
      en: ["First version of the builder game", "Upgrade stands, gates, terminals, tower and more", "Progress is saved only locally"] }
  ],

  gigachess: [
    { v: "0.2", t: "2026-11-07T14:26:00+01:00",
      de: ["Neu: Schach-KI in 10 Stufen", "Stufe 1 zieht zufällig, Stufe 7 entspricht etwa 400 Elo"],
      en: ["New: chess AI with 10 levels", "Level 1 moves randomly, level 7 is about 400 Elo"] },
    { v: "0.11", t: "2026-11-07T02:13:00+01:00",
      de: ["Schrift ohne Kursiv, passend zum neuen Seitenlook"],
      en: ["Type without italics, matching the new site look"] },
    { v: "0.1", t: "2026-11-07T01:45:00+01:00",
      de: ["Erste Version: Schach auf 10 × 10 Feldern", "Neue Figur: der Räuber, der schiebt statt schlägt", "Zu zweit mit Schachuhr"],
      en: ["First version: chess on a 10 × 10 board", "New piece: the robber, who pushes instead of capturing", "Two players with a chess clock"] }
  ],

  noaim: [
    { v: "0.2", t: "2026-11-07T14:03:00+01:00",
      de: ["Neuer Anime-Look für Himmel, Wolken, Wiese und Tiere", "Tageszeit mit Sonne, Mond, Glühwürmchen und Sonnenglanz auf der Wiese", "Propellermaschine mit Werbebanner im Hintergrund", "Wind läuft in Böen über das Gras"],
      en: ["New anime look for sky, clouds, meadow and animals", "Time of day with sun, moon, fireflies and sun glare on the meadow", "Propeller plane with a banner in the background", "Wind gusts sweep across the grass"] },
    { v: "0.1", t: "2026-11-07T13:35:00+01:00",
      de: ["Erste Version: Aimtrainer über die ganze Seite", "Vögel und Frösche treffen, drei entwischt heißt Game Over", "Schwierigkeit, Sensitivity und Highscore"],
      en: ["First version: full-page aim trainer", "Hit birds and frogs, three escape means game over", "Difficulty, sensitivity and high score"] }
  ],

  weltmacht: [
    { v: "0.15", t: "2026-11-08T01:50:00+01:00",
      de: ["Echte Weltkarte mit authentischen Grenzen", "Grenzen mit leichtem Rauschen, Küsten mit Flachwasser", "Gradnetz und Papierstruktur"],
      en: ["Real world map with authentic borders", "Borders with slight noise, coasts with shallow water", "Graticule and paper texture"] },
    { v: "0.1", t: "2026-11-08T01:02:00+01:00",
      de: ["Erste Version: Eroberungsspiel für 2 bis 6 Spieler, Mensch oder KI", "Token-Wirtschaft, Provinz-Ausbau und Bonuskarten", "Elite-Armeen verteidigen mit W8"],
      en: ["First version: conquest game for 2 to 6 players, human or AI", "Token economy, province upgrades and bonus cards", "Elite armies defend with d8"] }
  ]
};
