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
| `terrain.js` | Gelände: Höhenraster 360 × 360 Zellen auf 1440 m (ältere 1024-m-Szenen werden mittig übernommen), Kacheln, Pinsel, Bodenarten |
| `road.js` | Straße: Spline-Punkte (Höhe, Breite, Neigung, Kerbs, Gelände an/aus `t`, Hilfspunkt `a`), Netz, Abfrage, Gelände-Einbettung, automatische Betonbrücken (Brüstungen, Pfeiler) |
| `models.js` | Prozedurale Platzhalter-Modelle (Bäume, Steine, Gras, Testauto) |
| `vegetation.js` | Pflanzentypen (Bäume, Gras aus Halmen, Steine, Kollisionsradien), Pinsel-Gruppen mit Wahrscheinlichkeiten und Hangneigung von/bis, Instanzen, Wind |
| `wind.js` | Wind-Symbol oben rechts (Richtung relativ zur Kamera, Stärke) |
| `world.js` | Welt aus Gelände + mehreren Straßen (`roads`, Hauptstrecke `road`, Abzweigungen `j`) + Vegetation + Umgebung, Boden-Abfrage für die Physik, Standard-Strecke |
| `sceneio.js` | Szenen-Export/-Import (.txt), automatisches Speichern |
| `input.js` | Tastatur, Controller |
| `car.js` | Fahrphysik: Starrkörper, 4 Räder, Stabilisatoren, Reifen (Kräfte auf Rollzentrum-Höhe), Motor, Getriebe, Antrieb (240 Hz), Kollision mit Stämmen/Felsen |
| `drive.js` | Testfahrt mit Verfolgerkamera und Anzeige |
| `editor.js` | Developer Tool (Straße: mehrere Straßen, Modi Bearbeiten/Gerade/Kurve, Abzweigungen, farbige Bau-Vorschau, Platzierhöhe C/V, Straßen-Terrain an/aus) |
| `menu.js` | Hauptmenü (später Werkstatt) |
| `main.js` | Hülle, Zustände, Schleife, CSS |

## Geplante Module (noch nicht gebaut)

`assets.js` (FBX-Bibliothek, Vorschaubilder, Asset-Pinsel), `weather.js` (Wetter, Wolken, Wolkenschatten, Nässe),
`lights.js` (Lichtquellen, Scheinwerfer), `tires.js` (Reifenarten, Verschleiß, Temperatur), `engines.js` (Motoren inkl. Elektro),
`race.js` (Rennen, Runden, Boxenstopp, Kraftstoff, Schaden/Ausfall), `ai.js` (KI-Fahrer), `season.js` (Saison, Wertung, Geld),
`garage.js` (Werkstatt: Tuning, Lackiererei, Kauf), `net.js` (Freunde per Einladungslink), `hud.js` (Live-Statistiken).

## Speicher im Browser

`polyracer-scene-v1` (aktuelle Szene), `polyracer-settings-v1`, `polyracer-ui-v1`, `polyracer-dev` (Developer-Code 424242).
