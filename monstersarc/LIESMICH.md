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
| `buildgen.js` | Gebäude-Generator (seit v0.2): `MA.buildgen.render(params)` zeichnet ein Haus aus einem Parametersatz (Stil Fachwerk). `sanitize` begrenzt alle Werte, `DEFAULTS` = Standard. Liefert Bild `cv`, Anker `ax/ay` (Mitte der Vorderkante), Grundfläche `foot`, Türmitte `doorX`, Rauchpunkte `smoke`. Farben stehen als Paletten `BEAMS`/`FACADES`/`ROOFS`, Füllungen als `FILLS` |
| `buildinterior.js` | Innenräume für Generator-Gebäude (seit v0.21): `MA.buildinterior` mit Böden (`FLOORS`: Holz, Fliesen, Kacheln, Stein, Marmor, Modern), `layout`, `render` (Boden, Rückwand, Matte, Treppen), `stairGeom`, `sanitize`, `missingStair` |
| `furniture.js` | Möbel für Innenräume (seit v0.21): Büro, Sitzen, modulare Küche (`mod:16`, Wandobjekte `wall:true`), Wohnen. Alle mit `inner:true` |
| `buildeditor.js` | Gebäude-Editor (seit v0.2), Reiter im Dev-Kit (`MA.buildEditor.mount/update/render`, von devkit.js aufgerufen). Parameter links, Vorschau rechts, Export `.json`, Import, Arbeitsstand im localStorage `monstersarc.building.v1`. Seit v0.21 mit Schalter Außen/Innen |
| Perspektive | Alle Assets (Objekte, Deko, Möbel) in der 3/4-Ansicht der Häuser: Vorderseite senkrecht, Oberseite darüber sichtbar (Tiefe = Höhe im Bild, keine Seitenansicht). Schornsteine, Töpfe, Kästen zeigen ihre Oberseite/Öffnung (seit v0.18) |
| Fußabdrücke | Seit v0.19: Bodenarten mit `prints` (Farbe Mulde + heller Rand) in map.js. `character.js` setzt alle 9 px einen Abdruck (`world.addPrint`), `world.drawPrints` nach dem Boden; beim Zonenwechsel `world.clearPrints(neueZone)` (scene-walk) |
| `props.js` | Straßenmöbel (seit v0.19.9): `clock` (Platzuhr), `streetlamp` (mit Licht), `bin` (eckige Mülltonne) |
| Trampelpfad | Seit v0.19.9: `map.paths` = Stempel [x, y, r] ohne Raster (Pinsel `path` in devkit.js), werden in `buildChunk` ins Bodenbild eingebacken (`pathAt`/`pathCol` in art-tiles.js) |
| Supermarkt | `market107` in houses.js (`shop: 1`): Ladengeschoss `shopFront`, Innenraum mit Fliesen `i`, `m_fridge`, `m_aisle`, `m_checkout`, keine Treppe |
| `devkit.js` | Dev-Kit: Bereiche Map-Editor (v0.1), Attacken, Missionen, Monster (später) |
| `main.js` | Hülle: Canvas, Skalierung, Szenen, Schleife |

## Bodenarten
`o` Meer (tief, nicht begehbar, Standard für neue Maps und außerhalb der Map), `w` Wasser (flach, seit v0.16 nicht begehbar),
`r` Grasboden, `l` Waldboden, `z` Strandsand (seit v0.19.9), `k` Matsch (seit v0.19, langsam, Fußabdrücke), `q` Dünensand (seit v0.19, Fußabdrücke), `u` Sumpf (seit v0.12: seichtes grünes Wasser mit Entengrütze, begehbar, noch langsamer; eigenes weiches Feld `swampF` in art-tiles),
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

## Gebäude-Editor und Gebäudedateien (seit v0.2)
Im Dev-Kit der Reiter „Gebäude-Editor“. Noah stellt ein Haus zusammen, vergibt einen Namen und exportiert `monstersarc-gebaeude-<name>.json`. Die Datei enthält nur die Parameter (Format `monstersarc-building`, Feld `params`), das Bild entsteht daraus immer exakt gleich (`seed` für die Texturen). Die Dateien kommen später in die Bibliothek des Map-Editors (Objekt pro Gebäude, erzeugt mit `MA.buildgen.render`).

Parameter (`params`): `w`, `d` (Blöcke), `floors` (1–3), `door` (Block von links), `wtype` (`square`/`round`), `wins` (Fenster je Geschoss, Erdgeschoss zuerst), `beam`/`facade`/`roof` (Index in den Paletten), `fill` (0 Putz, 1 Bretter waagerecht, 2 senkrecht, 3 fein, 4 Schindeln), `rooftype` (`tiles`/`flat`), `ridge` (`x` First quer, `y` Giebel vorn), `balc`/`balcSlot`/`balcW`/`balcFloor`, `shaft`/`shaftSlot` (Kaminschacht aus Kopfstein), `dormers` (0–3, nur Dachziegel mit First quer), `chim`/`chimPos` (Schornstein, Lage in %), `seed`.

Wichtig für die Übernahme ins Spiel: Der Anker ist die Mitte der Vorderkante der Grundfläche (wie bei `houses.js`); Kaminschacht und Balkon ragen ca. 6–7 px über die Vorderkante hinaus (für Kollision nur die Grundfläche `foot` nehmen). 
Innenraum (Format-Version 2, Feld `interior`, seit v0.21): `size` = [Breite, Tiefe] in Kacheln (Außenmaß × 1,5, aufgerundet), `floors` = je Geschoss `{ floor, objs:[{t,x,y,v}] }` (`t` = Objekt-ID aus `MA.OBJECTS`, `x/y` = Fußpunkt in px ab Ecke oben links des Bodens, die Rückwand liegt 32 px darüber), `stairs` = `[{ from, to, rot, tx, ty, rect, entry, arrive }]`. `rot` S/W/E = von unten/links/rechts betreten. Man erscheint im anderen Geschoss am Einstiegsende (`arrive`). Bild: `MA.buildinterior.render(params, inner, geschoss)` plus Objekte nach y sortiert. Version-1-Dateien (ohne `interior`) bleiben gültig. Kollision und Spielerbewegung im Innenraum gibt es noch nicht (kommt mit der Übernahme in den Map-Editor).
