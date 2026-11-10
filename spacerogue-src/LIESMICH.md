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
| `50-flug.js` | Körper, Start/Ende Testflug, Simulationsschleife `flTick` |
| `51-steuerung-waffen.js` | Schub, Drehen, Waffen, Geschütze, Zielcomputer |
| `52-schaden.js` | Treffer, Explosionen, Schild, Zerbrechen, Kollisionen |
| `53-ki.js` | Gegner-KI |
| `54-figur.js` | Luft, Luken, Jetpack, Schweißen, Laufen, Pistole, Inventar |
| `55-andocken.js` | Andocken |
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
- Neue Dateien bekommen eine Nummer, die sie an die passende Stelle sortiert (z. B. `56-run.js`).
- Zeilen, die mit `// =====` beginnen, sind Dateimarken und Erklärungen aus dem Umbau.

## Die Tests

- **`logik.test.js`** – 23 schnelle Tests ohne Browser und ohne Installation: Bauteildaten, Werte, Räume und
  Luftdichtheit, Zusammenhang, Kühlung, Schiffscode, alle NPC-Baupläne.
- **`volltest.js`** – spielt ein festes Szenario mit festem Zufall durch (Editor, 45 s Kampf gegen alle vier
  NPC-Schiffe, zu Fuß, Luke, Station mit Andockversuch) und vergleicht den Endzustand mit `referenz.json`.
  - Umbau ohne Funktionsänderung: Fingerabdruck muss **gleich** bleiben.
  - Gewollte Spieländerung: Fingerabdruck ändert sich. Auf Fehlermeldungen prüfen, dann
    `node spacerogue-src/tests/volltest.js --merken`.
- Der Volltest ersetzt keinen Blick ins echte Spiel: Er sieht nichts, er rechnet nur.

## Unverändert seit dem Umbau (Stand v0.49.3)

- `window.SpaceRogue` mit `mount`, `unmount`, `_debug`
- Speicherschlüssel `spacerogue-ship-v1`, `spacerogue-station-v1`, `spacerogue-ui`
- Format der Schiffscodes (Export/Import)
- Raster 2,5 m, Rendering Canvas 2D

## Geplant als Nächstes

Eigener Run-Zustand für den Rogue-like-Modus (Stage, Credits, Schiffsschaden, Perks, Tod/Neustart), getrennt vom
Testflug. Die Perk-Haken über `PM` sind dafür noch im Code (aktuell alle auf 0).
