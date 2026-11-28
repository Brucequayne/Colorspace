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
| `art-samurai.js` | Figuren-Modell in 8 Richtungen (aus Shizuku), Aussehen über `look`. Seit v0.28 die Spielfigur `"kid"` (Junge, ca. 12, 1,50 m) als Baukasten: `makeLook(id, spec)` mit Körper, Frisur, Oberteil, Hose, Schuhen, Stirnband und Farben je Teil (Aufbau `KID0`) – Grundlage für spätere Outfit-, Frisur- und Farbwahl |
| `map.js` | Map-Daten: Größe (`cols` × `rows`, Standard 800 × 600), Bodenarten (`MA.TILES`), Zonen (`zone`, `zones`), Kollision, Größe ändern, Speichern (Lauflängen-Kodierung, IndexedDB) |
| `maps/start.js` | Start-Map des Spiels (`MA.MAP_START`, `null` = leeres Meer) |
| `lighting.js` | Tageszeit, Licht, Schatten (aus Shizuku, Schatten mit Kamera-Versatz) |
| `particles.js` | Blätter, Staub, Spritzer (aus Shizuku) |
| `world.js` | Spielwelt mit Kamera und Zoom (`cam`, `zoom`, `follow`, `pan`, `setZoom`): Boden-Chunks werden bei Bedarf gebaut (Zeitbudget, max. 140 im Speicher), weit draußen Übersichtsbild (`ov`), Zonen-Ebene (`zc`), Pflanzen in Fächern |
| `character.js` | Figur (`MA.Character`): Laufen, Kollision, Schritte – Grundlage für Spieler und NPCs. Standard-Aussehen `"kid"` (seit v0.28, ohne Schwert und ohne langen Zopf) |
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
| `monsters.js` | Monster (seit v0.25): Datensatz (`sanitize`, `blank`), Bild-Generator `render(m, "front"\|"back")` (Formen in 0…1, gerastert mit 64 × Größe Pixeln, 5 Tonstufen, Außen- und Innenlinien, Gesicht als Pixel), Schrei `playCry` (8-bit, Seed, Tonhöhe, Länge), Werte `statAt` (Grundwert Lv 1 → Grundwert + Potenzial × 4 auf Lv 100), Wertevorschlag `suggestStats` (seit v0.28), Größenvergleich `compareCanvas` (seit v0.28), Monsterliste (localStorage `monstersarc.monsters.v1`, Export/Import der ganzen Liste) |
| `monstertpl.js` | 25 Grundmonster als Vorlagen (`MA.MONSTER_TEMPLATES`) |
| `monsters/liste.js` | Feste Monsterliste des Spiels (`MA.MONSTER_LIST`, `null` = nur Browser-Liste). Exportierte Listen von Noah kommen hier hinein |
| `monster3d.js` | 3D-Baukasten für Monster (seit v0.26): Modell (Wirbelsäule, Schädel, Glieder, Stempel, Pinsel; `sanitize`), `build`/`pack` → Grundkörper, WebGL2-Raymarching `draw` (Licht von oben links, weiche Schatten, Verdeckung), Pixel-Look `post` (4 Töne, Raster, Außen-/Innenlinien, Fellbüschel), `snapshot` (fertiges Spielbild), Stempel-Assets `A` (Augen, Mund, Zacken/Flügel, Füße, Hände), 12 Glied-Vorlagen, 8 Grundkörper |
| `monstereditor.js` | Monster-Editor, Reiter im Dev-Kit (`MA.monsterEditor.mount/update/render`). Seit v0.26: Reiter Bauen (3D: Formen, Glieder, Stempel, Pinsel, Kamera, Symmetrie), Allgemein, Farben, Werte, Klang, Attacken. „Zur Liste hinzufügen“ = Foto vorne → Foto hinten → Nachzeichnen (Stift/Radierer/Pipette/Füllen) → speichern, danach „Entwicklung bauen“. Arbeitsstand `monstersarc.monster.draft.v2` |
| `attacks/liste.js` | Feste Attackenliste des Spiels (seit v0.28.2, `MA.ATTACK_LIST`, null = nur Browser-Liste) |
| `tools/einbauen.js` | Node-Skript (seit v0.28.2): `node tools/einbauen.js <arbeitsstand.json>` schreibt Karte, Monsterliste und Attackenliste aus dem Gesamten Arbeitsstand in `maps/start.js`, `monsters/liste.js`, `attacks/liste.js` |
| `attackfx.js` | Attacken-Daten und Effekt-Kit (seit v0.27, `MA.attacks`): `sanitize`, Liste (`list/byId/put/remove/exportList/importList`, Speicher `monstersarc.attacks.v1`), Keyframe-Spuren (`sample/setKey/delKey/smoothTrack`), 16 Muster `STYLES`, Ebenen-Typen `TYPES`, deterministische Partikel-Physik und Pixel-Zeichnung `renderLayers` |
| `attackeditor.js` | Attacken-Editor, Reiter im Dev-Kit (`MA.attackEditor.mount/update/render`): Kampfszene mit 2 Testmonstern, Reiter Daten / Animation / Zeichnen / Export, Live-Aufnahme, 11 Vorlagen. Arbeitsstand `monstersarc.attack.draft.v1` |
| `scene-dex.js` | Monsterliste im Spiel (Hauptmenü → Monsterliste); seit v0.28 alle Bilder gleich groß, darunter Größenvergleich mit der Spielfigur (1,50 m) |
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

## Monster (seit v0.25)
Datensatz: `id`, `no` (Nr. in der Monsterliste), `name`, `el` [Element 1, Element 2 oder -1], `pre`/`evo` (id), `evoLvl`, `look` (Körperbau und Teile, `seed`), `pal` (main, sec, acc, eye, extra), `size` (Bild: 64 × size Pixel, seit v0.28 nur noch die Pixelzahl), `scale` (Gesamtgröße seit v0.28, 0,1–20; fehlt sie, gilt `size`, damit alte Monster ihre Größe behalten), `h` (m) = Modellhöhe × 0,5 m × `scale`, `kg` (wächst mit `scale`³), `stats` {hp, atk, def, spa = Fernkampf, spd = Fern-Abwehr, ini: [Grundwert Lv 1, Potenzial 0–100]} (die Schlüssel `spa`/`spd` bleiben, nur die Namen sind seit v0.28 neu), `cry` {seed, pitch, stretch}. Elemente: Index in `MA.monsters.ELEMENTS`.
Perspektive: nur vorne und hinten (wie Gen 3), keine Animation. Export-Datei `MonstersArc_Monsterliste.json` (Format `monstersarc-monsters`, Feld `list`).


### 3D-Monster (seit v0.26)
Jedes neue Monster hat zusätzlich `model` (3D-Modell, Aufbau siehe Kopf von `monster3d.js`), `img` { front, back: PNG als data-URL, w: Kantenlänge, side: Vergleichsbild für die Monsterliste (seit v0.28.1, optional; fehlt es, wird `front` genommen) } und `snap` { f, b, s: [Drehung, Neigung] der Fotos }. Ablauf „Zur Liste hinzufügen“ seit v0.28.1: vorne → hinten → Vergleichsbild (Standard von der Seite, gleicher Maßstab wie vorne, überspringbar) → Nachzeichnen aller drei Bilder. Im Spiel werden nur die Bilder aus `img` gezeigt (`MA.monsters.render` nimmt sie, falls vorhanden). Ältere Monster ohne `img` werden weiter mit dem 2D-Generator aus v0.25 gezeichnet. Die Bildgröße ist `64 × size` Pixel (+ 2 für die Linie, size 0,5–4, also bis 256 px seit v0.26.4), das Monster sitzt mittig und füllt 88 % (seit v0.26.2). Spielbilder nutzen den einfachen Schattenmodus (`draw(..., simple)`, `post({simple})`: 3 Töne, kein Raster). Größe `h` und Gewicht `kg` berechnet `MA.m3d.measure(model, size)`: 1 Modell-Einheit = 0,5 m × size, Masse aus Volumen (Haut/Fell 1, Stein 2, Feder 0,5). Stempel können `mir` haben = eigenständige Spiegel-Kopie, Werte gespiegelt gespeichert (entsteht beim Ausschalten der Symmetrie, seit v0.26.5). Gelenke können `s` haben = Dicke des Abschnitts bis zum nächsten Gelenk (Mitte, 0,3–3). Der 3D-Editor braucht WebGL2.

## Attacken (seit v0.27)
Eine Attacke: `{ id, name, el, cat: "near"|"far", power 0–250, pp 1–40, acc 30–100, sure, dur 1–4 (Sekunden), px 1–4 (Pixelgröße), test: [Angreifer-ID, Ziel-ID], tracks: { atk, def }, layers: [...] (max. 16), draw: { hold, frames: { Bildnummer: PNG-data-URL 240×136 } } }`. 20 Bilder pro Sekunde, Bildzahl = `dur × 20`. Spur = `{ mode: "smooth"|"linear"|"step", k: [{ f, x, y, r, s }] }` (Monster-Spuren sind Versatz/Drehung/Größe, Ebenen-Spuren `E`/`T` sind Start- und Zielpunkt in Bildpixeln, 480×272). Die Physik hängt nur von der Zeit und dem `seed` der Ebene ab, darum kann man frei vor- und zurückspulen. Attacken werden immer vom Spieler (unten links) zum Gegner (oben rechts) gebaut; Spiegeln für Gegner-Attacken und die Verknüpfung mit Monstern kommen später. Export „Animation backen“: Sprite-Sheet 10 Bilder pro Zeile, Bildgröße 240×136 × Pixelfaktor, dazu JSON `monstersarc-attack-sheet`.

### Wertevorschlag (seit v0.28)
`MA.monsters.suggestStats(m)` würfelt Kampfwerte grob nach dem Pokémon-Balancing. Basiswert B je Wert: Summe nach Entwicklungsstufe (Basis mit Entwicklung 310, Mitte 410, Endstufe aus 2 Stufen 480, aus 3 Stufen 520, ohne Entwicklung 440), +3,5 % je Verdopplung der Höhe, ±5 % Zufall. Verteilung: Element-Profil `EL_PROF` (Hauptelement 60 %, Zweitelement 40 %; z. B. Gestein/Stahl Verteidigung, Flug/Elektro Initiative, Kampf Angriff + Verteidigung, Psycho Fernkampf), Größe `SIZE_EFF` je Verdopplung der Höhe (KP +16 %, Verteidigung +8 %, Initiative −13 % …), schwer für die Größe → mehr Verteidigung, langsamer, je Wert ±12 % Zufall. Umrechnung: Grundwert Lv 1 = 5 + B/12 (KP 10 + B/8), Potenzial = B/2, also Lv 100 ≈ 2 × B. Im Monster-Editor: Reiter Werte → „Werte vorschlagen“; neue Monster mit unveränderten Standardwerten bekommen beim ersten Speichern automatisch einen Vorschlag.

### Größe im Kampf (seit v0.28)
Im Kampf (bisher die Kampfszene im Attacken-Editor) zählt der sichtbare Bereich des Bildes: Zielhöhe Gegner = 96 px × h^0,33 (48–124 px), Angreifer ×1,22 (höchstens 160 px). Ganze Vergrößerungsfaktoren, wenn sie bis auf 14 % passen, sonst krumme (Pixel nicht ganz gleichmäßig). So werden kleine Monster größer und riesige kleiner gezeigt als in echt.

## Gesamter Arbeitsstand (seit v0.28.2)
Dev-Kit → Map-Editor → „GESAMTEN ARBEITSSTAND EXPORTIEREN“ erzeugt `monstersarc-arbeitsstand-<Datum>-<Uhrzeit>.json` (Format `monstersarc-workstate`): `map` (die Map, die gerade im Editor offen ist), `monsters` (ganze Monsterliste), `attacks` (ganze Attackenliste), `building` (Arbeitsstand des Gebäude-Editors: ein Haus mit Innenraum). „Import“ im Map-Editor erkennt diese Datei und spielt alles zurück (Sicherungen: Monster `monstersarc.monsters.v1.bak`, Attacken `monstersarc.attacks.v1.backup`, Gebäude `monstersarc.building.v1.backup`, Map über Rückgängig).
Einbau ins Spiel: `node tools/einbauen.js <datei>` im Ordner `monstersarc/`. Das Gebäude hat noch keine feste Spieldatei (bleibt im Browser, geht aber in jeder Arbeitsstand-Datei mit). Nicht enthalten sind unfertige Entwürfe in den Editoren (Monster-Entwurf, Attacken-Entwurf), nur gespeicherte Listen.

Stand v0.29: Der Arbeitsstand vom 28.11.2026 (02:02) ist eingebaut (`maps/start.js` 800 × 600, `monsters/liste.js` 6 Monster, `attacks/liste.js` 2 Attacken). Gebäude „Stadt_Haus_Groß_01“ liegt nur im Browser-Stand von Noah (noch keine feste Spieldatei).
