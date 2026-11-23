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
| `art-tiles.js` | Boden Pixel für Pixel (aus Shizuku). Neu: Meer statt Abgrund, organische Küste, Map-Größe frei |
| `art-objects.js` | Objekte und Vegetation (aus Shizuku, unverändert) |
| `art-samurai.js` | Figuren-Modell in 8 Richtungen (aus Shizuku), Aussehen über `look` |
| `map.js` | Map-Daten: Größe (`cols` × `rows`), Bodenarten (`MA.TILES`), Kollision, Größe ändern, Speichern |
| `maps/start.js` | Start-Map des Spiels (`MA.MAP_START`, `null` = leeres Meer) |
| `lighting.js` | Tageszeit, Licht, Schatten (aus Shizuku, Schatten mit Kamera-Versatz) |
| `particles.js` | Blätter, Staub, Spritzer (aus Shizuku) |
| `world.js` | Spielwelt mit Kamera (`world.cam`, `follow`, `pan`): zeichnet nur den sichtbaren Ausschnitt |
| `character.js` | Figur (`MA.Character`): Laufen, Kollision, Schritte, Haare wie Shizukus Samurai – Grundlage für Spieler und NPCs |
| `scene-menu.js` | Hauptmenü |
| `scene-walk.js` | Testlauf mit Kamera (später die Spielszene) |
| `devkit.js` | Dev-Kit: Bereiche Map-Editor (v0.1), Attacken, Missionen, Monster (später) |
| `main.js` | Hülle: Canvas, Skalierung, Szenen, Schleife |

## Bodenarten
`o` Meer (tief, nicht begehbar, Standard für neue Maps und außerhalb der Map), `w` Wasser (flach, begehbar, langsam),
`s p b h g m e a` wie Shizuku, `#` Mauer. Die Begehbarkeit ist kachelgenau, das Bild der Küste ist organisch.

## Maps
Im Dev-Kit „Map exportieren“ → `.json`. Für das Spiel schickt Noah die Datei an Claude; sie kommt nach `maps/`
(Start-Map: in `maps/start.js` als `window.MA.MAP_START = {…}`). Shizuku-Arenen lassen sich importieren (Abgrund wird Meer).
Größe: 30 × 17 bis 160 × 120 Kacheln. Browser-Speicher: `monstersarc.map.v1` (Arbeitsstand), `monstersarc.mute`.

## Neue Datei hinzufügen
In `monstersarc.js` in die Liste `FILES` an der passenden Stelle eintragen.
