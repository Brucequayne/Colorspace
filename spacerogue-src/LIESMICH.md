# Space Rogue – Quellcode

Die Website lädt weiterhin genau eine Datei: `spacerogue.js` im Hauptordner.
Diese Datei wird **gebaut** – aus den Teilen in `spacerogue-src/src/`.

## Die drei Regeln

1. **`spacerogue.js` nie direkt ändern.** Geändert wird nur in `spacerogue-src/src/`. Danach neu bauen.
2. **Nach jeder Änderung: bauen und testen.**
   ```
   node spacerogue-src/build.js
   node spacerogue-src/tests/logik.test.js
   node spacerogue-src/tests/volltest.js      (einmalig vorher: npm install im Ordner spacerogue-src)
   node spacerogue-src/tests/editor.test.js
   ```
3. **Hochladen:** die neu gebaute `spacerogue.js` **und** den Ordner `spacerogue-src` (ohne `node_modules`).

## Wo liegt was

| Datei | Inhalt |
|---|---|
| `00-kopf.js` | Version, Rastermaße, Sprache, kleine Helfer |
| `10-texte.js` | alle Beschriftungen und Spieltipps (de/en) |
| `11-bauteile.js` | Bauteile mit Masse, HP, Schub; Kosten; Perk-Haken `PM`; Kantenregeln |
| `12-balance.js` | Waffen, Anzug, KI-Stile, Kollision, Geschütze, Docking |
| `13-npc-schiffe.js` | Baupläne der Gegner |
| `20-schiffslogik.js` | Geometrie, Verbindungen, Räume, Kühlung, Werte, Schiffscode |
| `30-zustand.js` | Spielstand, Speichern/Laden, Beispielschiff, Beispielstation |
| `31-editor.js` | Platzieren, Symmetrie, Abreißen, Malen |
| `40`–`43-zeichnen-*.js` | Blöcke, Schiff, Hintergrund, Editor-Ansicht |
| `45-verwitterung.js` | Verwitterte Panzerung (Developer Tool): nahtlose Rost-/Moos-Pixeltexturen (16 Texel je Zelle) im Schiffsraster, `wxOverlay` |
| `44-umgebung.js` | Environment (Developer Tool): Asteroiden-Assets `ENV`, Ebenen `ENV_K`, Sprites, Platzieren im Editor, Zeichnen und Kollision im Testflug |
| `46-backdrops.js` | Backdrops (Developer Tool, seit v0.56): 21 Planeten und 5 Sonnen auf Ebene -2 ganz hinten in der Skybox (`BD_K` fast ohne Parallaxe, Größe unabhängig vom Zoom), prozedurale Kugel-Sprites in Auflösungsstufen (große Stufen entstehen stückweise), Gegenlicht-Saum `bdFxBegin`/`bdFxEnd` für alles vor einer Sonne |
| `50-flug.js` | Körper, Start/Ende Testflug, Simulationsschleife `flTick` |
| `51-steuerung-waffen.js` | Schub, Drehen, Waffen, Geschütze, Zielcomputer |
| `52-schaden.js` | Treffer, Explosionen, Schild, Zerbrechen, Kollisionen |
| `53-ki.js` | Gegner-KI |
| `54-figur.js` | Luft, Luken, Jetpack, Schweißen, Laufen, Pistole, Inventar |
| `55-andocken.js` | Andocken |
| `47-luftstrom.js` | Luftfäden an offenen Stellen (seit v0.57.2): `airOpenings` (Boden/Tür ohne Nachbarblock, je Körper zwischengespeichert), `drawAirflow`, Werte in `AIRF` |
| `32-autodrehen.js` | Auto-Drehen beim Bauen (seit v0.57.5): `edRot(cx, cy)` bewertet alle vier Drehungen (Anschlüsse, freie Düse/Mündung, Triebwerk vom Schiff weg, Waffen nach vorn); `SET` = Einstellungen |
| `58-scanner.js` | Scanner (seit v0.57.5): `scanTargets`, `scanEdges` (Asteroiden, Stationen, Wracks in Antennenreichweite am Bildrand), `hudDodge` |
| `74-menue.js` | Spielmenü und Einstellungen (seit v0.57.5): `menuOpen`/`menuClose`, `menuClick`, Speicherschlüssel `spacerogue-settings-v1` |
| `59-sound.js` | Sounds aus Dateien (seit v0.58): `SND` (Ordner `spacerogue-sounds/`, Dateinamen), `sndLoad` beim ersten Klick, `snd(name, {pitch, gain, delay})` mit Stimmen-Begrenzung `SND_MAX`, Stille am Anfang wird übersprungen; Handwaffen `sndHeld`, `sndShot` |
| `57-gegenstaende.js` | Gegenstände (seit v0.57): `ITEMS`, Schnellleiste `FL.hot` und Inventar `FL.inv`, aufheben (E) und ablegen (Q), Ziehen im Inventar, liegende (`bd.items`) und treibende (`FL.loose`) Gegenstände, Bankautomat, Kontostand (`spacerogue-konto-v1`) |
| `56-turrets.js` | Turrets: KI-Zielwahl, Schwenken mit Vorhalt, Feuern, Hitze-Disziplin (`turretsAuto`) |
| `60-zeichnen-flug.js` | Flugansicht, Effekte, Radar, HUD |
| `70-ui.js`, `71-css.js` | HTML-Aufbau, Infofeld, Aussehen |
| `72-eingabe.js` | Maus, Tastatur, Knöpfe |
| `73-hangar-export.js` | Hangar, Export/Import |
| `90-start.js` | Bildschleife, `mount`/`unmount` – muss die letzte Datei bleiben |

## Wie der Build funktioniert

`build.js` hängt alle Dateien aus `src/` in Namensreihenfolge aneinander. Zusammen ergeben sie **eine** große
Funktion (sie beginnt in `00-kopf.js` und endet in `90-start.js`). Die Teile sind also keine eigenständigen Module:
Alle teilen sich dieselben Variablen (`S` Editor-Zustand, `V` Ansicht, `FL` Flug, `T` Bauteile).

Folgen für Änderungen:
- Funktionen dürfen in jeder Datei stehen und sich gegenseitig aufrufen.
- `var X = …` auf oberster Ebene wird in Dateireihenfolge ausgeführt. Daten, die andere Daten brauchen, müssen
  in einer früheren Datei stehen (deshalb liegen alle Datendateien bei 10–13).
- Neue Dateien bekommen eine Nummer, die sie an die passende Stelle sortiert (z. B. `56-neues-system.js`).
- Zeilen, die mit `// =====` beginnen, sind Dateimarken und Erklärungen aus dem Umbau.

## Die Tests

- **`logik.test.js`** – 23 schnelle Tests ohne Browser und ohne Installation: Bauteildaten, Werte, Räume und
  Luftdichtheit, Zusammenhang, Kühlung, Schiffscode, alle NPC-Baupläne.
- **`volltest.js`** – spielt ein festes Szenario mit festem Zufall durch (Editor, 45 s Kampf gegen alle vier
  NPC-Schiffe, zu Fuß, Luke, Station mit Andockversuch) und vergleicht den Endzustand mit `referenz.json`.
  - Umbau ohne Funktionsänderung: Fingerabdruck muss **gleich** bleiben.
  - Gewollte Spieländerung: Fingerabdruck ändert sich. Auf Fehlermeldungen prüfen, dann
    `node spacerogue-src/tests/volltest.js --merken`.
  Der Volltest spielt den Editor und den Testflug.
- **`editor.test.js`** – Tests mit echtem Spielablauf ohne Bildschirm: Schwere Rakete, Preisanzeige, getrennte Waffengruppen, 25-/120-mm-Geschütz, Waffenwerte (Schaden/RPM/DPS), Panzerung 1×2, Einrichtung, Maschinenpistole, Testflug starten und mit Esc beenden.
- Die Tests ersetzen keinen Blick ins echte Spiel: Sie sehen nichts, sie rechnen nur.

## Unverändert seit dem Umbau

- `window.SpaceRogue` mit `mount`, `unmount`, `_debug`
- Speicherschlüssel `spacerogue-ship-v1`, `spacerogue-station-v1`, `spacerogue-ui`
- Format der Schiffscodes (Export/Import)
- Raster 2,5 m, Rendering Canvas 2D

## Verlauf

- v0.50.0–0.50.1: Rogue-like-Run mit Stages, Werft-Credits und Perks (von Fable).
- v0.50.2: Der Run-Modus wurde wieder entfernt; Schwere Rakete, Preise in der Bauteilliste und der Fix für die
  verrutschte Ansicht zu Fuß sind geblieben. Der Perk-Haken `PM` in `11-bauteile.js` bleibt für spätere Upgrades.
- v0.51.0: Waffengruppen je Typ (`WGROUPS`, `grpOf` in `12-balance.js`), Geschütze (`GUN`), Waffenkennzahlen (`wStats`),
  Maschinenpistole (`SMG`, `fireHand` in `54-figur.js`), Einrichtung (Art `deco`, Zeichnung `decoArt`), Panzerung 1×2.
- v0.52: Der Raumstation-Editor ist jetzt das „Developer Tool“ (intern weiter `S.ed === "station"`, Speicherschlüssel unverändert),
  gesperrt mit 6-stelligem Code (Prüfwert `DEV_H` in `30-zustand.js`, Freischaltung in `localStorage` unter `spacerogue-dev`).
  Dort sind alle Bauteile erlaubt. Bauteile mit `dev: true` in `11-bauteile.js` erscheinen nur im Developer Tool.
  Export/Import können .txt-Dateien speichern und öffnen (`saveTxt`/`openTxt` in `73-hangar-export.js`).
- v0.54 „World Building“: Environment im Developer Tool. Assets frei platziert (`S.env`, gespeichert im Stations-Speicher unter `env`),
  drei Ebenen (-1 hinten, 0 Spielebene mit Kollision, 1 vorne), skalier- und drehbar. Szenencode = Schiffscode + Feld `env`
  (`sceneCode`/`parseEnv` in `20-schiffslogik.js`). Neue Assets: Eintrag in `ENV` in `44-umgebung.js`.
- v0.54.1: Asteroiden nur in Grautönen (`ENV_MAT`), Sprites in Auflösungsstufen 1/2/4 bis 2048 px (`envSprite`), Maßstab höchstens ×4.
- v0.54.2: Verwitterte Panzerung. Jede Panzer-ID gibt es zusätzlich als `…r` (rostig) und `…m` (bewachsen), `dev: true`,
  Kategorien `catRA`/`catOA`, Feld `wx`. Die Textur liegt im Schiffsraster (Kachel `WX_P` = 36 Zellen), wird beim ersten
  Gebrauch erzeugt (~0,5 s) und per Pattern geclippt über den Block gelegt. Paletten-Vorschau zeichnet nur eine Andeutung (`WX_ICON`).
- v0.54.3: Verwitterung als Pixel-Textur, 16 Texel je Zelle (`WX_PPC`), beim Vergrößern ohne Glättung gezeichnet. Rost feiner,
  Efeu durch Moospolster ersetzt (`wxBuildMoss`). Erzeugung ~0,1 s je Textur.
- v0.54.4: Block-Varianten. `vg` = Gruppe (ID des Originals), `va` = Art der Zeichnung, `vn` = Kurzname; anlegen mit
  `variant(base, id, va, name)` in `11-bauteile.js`. Palette: eine Kachel je Gruppe mit Falte (`tileHTML`, `openVar`, `pickVar`
  in `70-ui.js`), gewählte Variante in `localStorage` unter `spacerogue-var`. Neue Form `round2` (Ecke rund 1×2).
  Neue Teile: `bt6` große Batterie, `kr1`/`kr2`/`kr6` Kisten, `kry` Kryokapsel, `pul` Bedienmodul (Deko).
- v0.55: Turrets (`kind: "tur"`, `tw` = Waffe). Werte in `TUR` (`12-balance.js`), Logik in `56-turrets.js`, Grafik `turretArt`
  (Sockel im normalen Durchgang, Kopf nach der Hülle). Kisten-Variante `…g` (grau, industriell).
- v0.57: Gegenstände (`57-gegenstaende.js`). Spieler hat `FL.hot` (Schnellleiste, 9) und `FL.inv` (64), Plätze `null` oder `{ id, n }`;
  Werkzeug/Waffe kommt aus dem gehaltenen Gegenstand (`held()`, `heldGun()`), nicht mehr aus der Platznummer. Schweißgerät und
  Pistole liegen fest auf 1 und 2 (`slotFixed`). Zum Auslegen im Developer Tool: Boden-Bauteile mit `loot`/`amt` (`lc1`, `lc2`, `lsm`),
  `makeBody` macht daraus normalen Boden plus `bd.items`. Bankautomat `atm` (Deko, `dk: "atm"`). Kontostand in `localStorage` unter
  `spacerogue-konto-v1` (neuer Schlüssel, die alten bleiben unverändert).
  Volltest: Spielablauf unverändert, der Fingerabdruck ändert sich nur durch 87 zusätzliche Zeichenaufrufe (Symbole der vier neuen
  Bauteile in der Bauteilliste). Ohne jsdom geprüft (in Chromium); beim nächsten Lauf mit jsdom die Referenz mit `--merken` neu setzen.
- v0.57.1: Gegenstände zum Auslegen ersetzen vorhandenen Boden (`replaceable`, `tryPlace`), im Flug Boden des Raums über `lootFloor`.
  Leertaste zu Fuß/draußen (`spaceAct`, `edgeOff`, `edgeLand` in `57-gegenstaende.js`) statt automatischem Hinaus-/Hineinschweben
  am offenen Rand. Hinweis am Ziel in der Welt: `drawUsePrompt`. Volltest: Ablauf unverändert, nur +20 Zeichenaufrufe (Credits-Symbol).
- v0.57.2: Gerüste `tr1`–`tr3`, `tp1`–`tp3` (`kind: "truss"`, Kategorie `catTr`): Verbindung wie Panzerung gleicher Form, dichten nie
  (`edgeRule`), Grafik `trussArt` in `40-zeichnen-bloecke.js`. Antennen `an4`/`an5` mit Reichweiten-Faktor `ar` (1,5 / 2);
  `bd.antM` = Faktoren absteigend, `antRange` = 600 m × stärkste + 300 m × jede weitere, höchstens 1.800 m (bzw. die stärkste allein).
  Luftfäden `47-luftstrom.js`. Volltest: Ablauf unverändert, nur Zeichenaufrufe der neuen Bauteil-Symbole.
- v0.57.5: Startmenü (`74-menue.js`; Tests klicken nach dem Start auf „Editor“), Auto-Drehen (`32-autodrehen.js`, genutzt in
  `rowList` und in der Vorschau), Laser `lsr` (`kind: "lsr"`, Werte `LSR` in 12-balance, `fireLaser` in 51, Strahl `drawLasers` in 60,
  Waffengruppe `lsr`), Scanner `scn` (`kind: "scan"`, `bd.nScan`, `58-scanner.js`), Cockpit-Varianten `ckt2` (`va: "bub"`) und
  `cks2`/`ckm2`/`ckl2` (`va: "pano"`). Ansichtswechsel beim Aus-/Einsteigen über `FL.outWas` in 60. Volltest: Spielzustand unverändert;
  weniger Zeichenaufrufe nur in der Phase draußen (jetzt Außenansicht) und mehr Bauteil-Symbole.
- v0.58: Sounds von Noah unter `spacerogue-sounds/handwaffen/` (pistole_rausholen, pistole_schuss, mp_rausholen, mp_schuss,
  mp_huelse .mp3). Lautstärke aus den Dateien, Regler `SET.sfx` in den Einstellungen. Neue Sounds: Datei in den Ordner, Eintrag in
  `SND.files`, an der passenden Stelle `snd("name")` aufrufen. Volltest unverändert.
