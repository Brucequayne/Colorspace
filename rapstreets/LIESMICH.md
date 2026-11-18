# Rap Streets – Aufbau

Die Startseite lädt nur `rapstreets.js` (Lader). Der lädt beim Öffnen die Dateien hier in dieser Reihenfolge:

| Datei | Inhalt |
|---|---|
| `core.js` | Namensraum `RS`, Bild 480 × 272, Projektion (Boden 45° gedreht, Feld = 22 × 22 Pixel, Map 36 × 36 Felder), Mathe, Zufall, Farben, Eingabe |
| `art.js` | Boden (`RS.TILES`, `RS.groundAt`), Objekte aus Quadern (`RS.OBJECTS`, `RS.sprite`), Crowd-Figuren (`RS.person`) |
| `art-rapper.js` | Rapper-Figuren mit kombinierbaren Posen (`RS.rapper`) |
| `art-props.js` | Weitere Objekte (seit v0.32): Autos, Möbel, Bäume (Pixel-Kronen, 4 Wind-Bilder), Häuser, Wand-Deko (`wall: 1`, rastet an Häusern ein), Müll, Subway-Abgang (`hole`: Treppe unter z = 0), Straßenmöbel, Tiere (`anim`), Asphalt-Flicken |
| `fx.js` | Platzierbare Effekte (`fxOnly`, im Spiel unsichtbar): Dampf, Sirene, Flackerlicht/Lichtkegel (`snapLamp`); Zeichnen der Effekt-Lichter (`RS.drawFx`) |
| `veg.js` | Vegetation für den Pinsel (`RS.VEG`, `RS.VEG_BRUSHES`), Wind-Wiegen wie in Shizuku |
| `beats/beats.js` | Instrumentals mit Tempo, erstem Downbeat, Länge (`RS.BEATS`); die .mp3 liegen daneben |
| `maps/pool.js` | Mitgelieferte Maps (`RS.POOL`), Vorlage „Brooklyn Corner“ |
| `world.js` | Map-Modell, Tiefensortierung, Schatten, Tageszeit/Licht, Crowd-Animation, Dampf (`RS.World`) |
| `editor.js` | Level-Editor = Dev Tool (Code 282828), Werkzeug „Bühne“ setzt `stage`, Bereich „Audio“ (Regler für mix.js, Mikro-Test) |
| `battle.js` | Battle: Audio (WebAudio, Mikro-Pegel), Ablauf `RS.plan` (Viertel + 2 Takte Pass the mic), Crowd-Hype, Rapper-Wege, HUD/Zeitleiste |
| `mix.js` | Aufnahme-Mischung: Mikro → Compressor → Pegel → Limiter, Beat → Pegel → Limiter, Summen-Limiter (AudioWorklet, eigene Dynamik ohne versteckte Anhebung). Einstellungen im Dev Tool (`rapstreets-audio-v1`), Standardwerte `MIX_DEF`. Mikro-Test (`RS.audio.test`) |
| `record.js` | Aufnahme als MP4 live während des Battles (WebCodecs + `mp4-muxer.js`): Spielbild 3× + gezeichnete Anzeige, Beat (um Latenz verzögert, −3 dB, Begrenzer) + Mikro |
| `main.js` | Hülle, Skalierung, Menü, Schleife |

Map-Format (.json): `{ name, time, wind, tiles: 36·36 Zeichen, obj: [{t, v, r, x, y}], ppl: [{v, x, y, f}], veg: [[art, x, y, variante]], stage: {x, y} }`.
Kamera: im Spiel `RS.main.crop()` (Zoom `RS.main.ZOOM` = 1,2, Mitte auf der Bühne), im Editor das ganze Bild.
Gespeichert im Browser unter `rapstreets-work-v1` (letzter Stand) und `rapstreets-maps-v1` (Maps nach Namen).
