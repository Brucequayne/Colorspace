# Poly Racer – Aufbau

3D-Rennspiel im Low-Poly-Look. Grafik mit Three.js r170 (MIT-Lizenz, `lib/LICENSE-three.txt`).
Die Startseite lädt nur `polyracer.js` (Lader). Der setzt beim ersten Öffnen eine Import-Map, damit jedes Modul
den Cache-Stempel der Startseite bekommt, und lädt dann `src/main.js`.

## Ordner

| Pfad | Inhalt |
|---|---|
| `lib/three.module.min.js` | Three.js (nicht ändern) |
| `lib/addons/` | FBX-Lader samt Hilfsdateien (für die Assets, noch nicht benutzt) |
| `src/` | eigener Code, ein Modul je Aufgabe (siehe unten) |
| `strecken/` | fertige Strecken als `.txt` (Export aus dem Developer Tool) |
| `assets/` | später: FBX-Modelle und Texturen, Unterordner = Kategorien |

## Module in `src/`

| Datei | Aufgabe |
|---|---|
| `core.js` | Namensraum `PR`, Texte (`L2`, `t`), Speicherschlüssel, Mathe, Zufall, Rauschen |
| `engine.js` | Renderer, Kamera, Himmel, Sonne/Mond nach Uhrzeit, Nebel, Schatten, Qualität |
| `terrain.js` | Gelände: Höhenraster 256 × 256 Zellen auf 1024 m, Kacheln, Pinsel, Bodenarten |
| `road.js` | Straße: Spline-Punkte (Höhe, Breite, Neigung, Kerbs), Netz, Abfrage, Gelände-Einbettung |
| `models.js` | Prozedurale Platzhalter-Modelle (Bäume, Steine, Gras, Testauto) |
| `vegetation.js` | Pflanzentypen, Pinsel-Gruppen mit Wahrscheinlichkeiten, Instanzen, Wind |
| `world.js` | Welt aus Gelände + Straße + Vegetation + Umgebung, Boden-Abfrage für die Physik, Standard-Strecke |
| `sceneio.js` | Szenen-Export/-Import (.txt), automatisches Speichern |
| `input.js` | Tastatur, Controller |
| `car.js` | Fahrphysik: Starrkörper, 4 Räder, Reifen, Motor, Getriebe, Antrieb (240 Hz) |
| `drive.js` | Testfahrt mit Verfolgerkamera und Anzeige |
| `editor.js` | Developer Tool |
| `menu.js` | Hauptmenü (später Werkstatt) |
| `main.js` | Hülle, Zustände, Schleife, CSS |

## Geplante Module (noch nicht gebaut)

`assets.js` (FBX-Bibliothek, Vorschaubilder, Asset-Pinsel), `weather.js` (Wetter, Wolken, Wolkenschatten, Nässe),
`lights.js` (Lichtquellen, Scheinwerfer), `tires.js` (Reifenarten, Verschleiß, Temperatur), `engines.js` (Motoren inkl. Elektro),
`race.js` (Rennen, Runden, Boxenstopp, Kraftstoff, Schaden/Ausfall), `ai.js` (KI-Fahrer), `season.js` (Saison, Wertung, Geld),
`garage.js` (Werkstatt: Tuning, Lackiererei, Kauf), `net.js` (Freunde per Einladungslink), `hud.js` (Live-Statistiken).

## Speicher im Browser

`polyracer-scene-v1` (aktuelle Szene), `polyracer-settings-v1`, `polyracer-ui-v1`, `polyracer-dev` (Developer-Code 424242).
