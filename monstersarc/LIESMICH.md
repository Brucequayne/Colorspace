# Monsters Arc – Aufbau

Monster-Abenteuer mit offener Welt und linearer Story. Technische Grundlage (Pixel-Look 480 × 272, Kacheln 16 px,
Boden, Pflanzen, Objekte, Licht, Figur, Map-Editor) ist **1:1 aus Shizuku übernommen** und um eine Kamera und
einstellbare Map-Größen erweitert.

Die Startseite lädt nur `monstersarc.js` (im Hauptordner). Diese Datei lädt beim Öffnen alle Module aus diesem
Ordner nacheinander, mit demselben Cache-Stempel `?v=…`. Kein Build-Schritt nötig. Namensraum im Browser: `MA`.

| Datei | Inhalt |
|---|---|
| `core.js` | Namensraum `MA`, Bildgröße (480 × 272), `L2`, Mathe, Zufall, Rauschen, Pixel-Helfer (aus Shizuku) |
| `input.js` | Tastatur und Maus (aus Shizuku, dazu mittlere Maustaste) |
| `audio.js` | Sounds (Schritte, Wind) aus Shizuku in `audio/`; Musik später |
| `art-tiles.js` | Boden Pixel für Pixel (aus Shizuku), gebaut in Chunks zu 16 × 16 Kacheln. Neu: Meer statt Abgrund, organische Küste |
| `art-objects.js` | Objekte und Vegetation (aus Shizuku). Seit v0.12 Fels mit 13 Varianten (9–12 neu) |
| `art-samurai.js` | Figuren-Modell in 8 Richtungen (aus Shizuku), Aussehen über `look` |
| `map.js` | Map-Daten: Größe (`cols` × `rows`, Standard 800 × 600), Bodenarten (`MA.TILES`), Zonen (`zone`, `zones`), Kollision, Größe ändern, Speichern (Lauflängen-Kodierung, IndexedDB) |
| `maps/start.js` | Start-Map des Spiels (`MA.MAP_START`, `null` = leeres Meer) |
| `lighting.js` | Tageszeit, Licht, Schatten (aus Shizuku, Schatten mit Kamera-Versatz) |
| `particles.js` | Blätter, Staub, Spritzer (aus Shizuku) |
| `world.js` | Spielwelt mit Kamera und Zoom (`cam`, `zoom`, `follow`, `pan`, `setZoom`): Boden-Chunks werden bei Bedarf gebaut (Zeitbudget, max. 140 im Speicher), weit draußen Übersichtsbild (`ov`), Zonen-Ebene (`zc`), Pflanzen in Fächern |
| `character.js` | Figur (`MA.Character`): Laufen, Kollision, Schritte, Haare wie Shizukus Samurai – Grundlage für Spieler und NPCs |
| `scene-menu.js` | Hauptmenü |
| `scene-walk.js` | Testlauf mit Kamera (später die Spielszene); beim Betreten einer Zone erscheint ihr Name |
| `walls.js` | Mauern (seit v0.13): Hecke `h`, Holzzaun `f`, Mauer `m` in `map.wall` (ein Zeichen je Kachel, Großbuchstabe = senkrecht). Verbinden sich mit den vier Nachbarn, Kollision über die Grundfläche (`MA.walls.hit`, in `map.move`) |
| `houses.js` | Fachwerkhäuser (seit v0.15) als Objekte `house75` … `house76` (Feld `house`: w, d, Stockwerke, Schornstein, First, Tür-Kachel), Kollision `rect`, Möbel `m_*` (nur innen), Innenraum-Generator `MA.houses.interior(o, stockwerk)` (Map 30 × 17, Boden `d`, außen `x`, Bild `deco` für Wände/Treppe/Matte), Türen `doorOf`/`doorNear`. Betreten/Treppen/Abblende in `scene-walk.js` |
| Schatten | Seit v0.16 werfen Häuser (`def.shadow`) und Hecken/Mauern (`MA.walls.shadow`) 3D-Schatten: Punkte [x, y, Höhe] entlang der Lichtrichtung auf den Boden, konvexe Hülle (`MA.shadowHull`, `MA.shadowBox` in core.js). Alle anderen Objekte nutzen weiter die Bild-Silhouette (`shadowXf`) |
| `deco.js` | Hausdeko (seit v0.17): Objekte mit `deco: true` (`d_pot`, `d_ivy`, `d_lamp`, `d_chimney`), eigener Reiter im Editor. Auf einem Haus gesetzt bekommt das Objekt `s` = Vorderkante des Hauses + 0,5 (wird als 5. Wert gespeichert) und wird direkt nach dem Haus gezeichnet. Kein Schatten, keine Kollision. Rauch: `MA.deco.smokeAt`, Teilchen `smoke` in particles.js |
| `devkit.js` | Dev-Kit: Bereiche Map-Editor (v0.1), Attacken, Missionen, Monster (später) |
| `main.js` | Hülle: Canvas, Skalierung, Szenen, Schleife |

## Bodenarten
`o` Meer (tief, nicht begehbar, Standard für neue Maps und außerhalb der Map), `w` Wasser (flach, seit v0.16 nicht begehbar),
`u` Sumpf (seit v0.12: seichtes grünes Wasser mit Entengrütze, begehbar, noch langsamer; eigenes weiches Feld `swampF` in art-tiles),
`s p b h g m e a` wie Shizuku, `#` Mauer. Die Begehbarkeit ist kachelgenau, das Bild der Küste ist organisch.

## Pinsel (devkit.js `BRUSHES`)
`veg` streut Pflanzen (Mischung `mix`), `tile` malt Boden rund, `leaf` Laubfall, `rocks` (seit v0.12) streut Fels-Objekte
der angekreuzten Varianten (`E.rockSel`, Abstand über `ROCK_R`). Wasserpflanzen nur auf `w`/`u`, Schilf auch im Sumpf (`vegOk`).

## Maps
Im Dev-Kit „Map exportieren“ → `.json`. Für das Spiel schickt Noah die Datei an Claude; sie kommt nach `maps/`
(Start-Map: in `maps/start.js` als `window.MA.MAP_START = {…}`). Shizuku-Arenen lassen sich importieren (Abgrund wird Meer).
Größe: 30 × 17 bis 1024 × 1024 Kacheln, Standard 800 × 600 (ganze Spielwelt). Arbeitsstand im Browser: IndexedDB `monstersarc` (Schlüssel `monstersarc.map.v1`), dazu `monstersarc.mute` im localStorage.

## Zonen
Städte und Routen: `map.zone` = je Kachel ein Zeichen (`0` = keine Zone), `map.zones` = `[{ id, name, col }]`. Im Dev-Kit Werkzeug „Zonen“. Im Spiel erscheint der Name oben links, sobald man eine andere Zone betritt (Lücken ohne Zone zählen nicht als Wechsel).

## Neue Datei hinzufügen
In `monstersarc.js` in die Liste `FILES` an der passenden Stelle eintragen.
