# Rap Streets – Aufbau

Die Startseite lädt nur `rapstreets.js` (Lader). Der lädt beim Öffnen die Dateien hier in dieser Reihenfolge:

| Datei | Inhalt |
|---|---|
| `core.js` | Namensraum `RS`, Bild 480 × 272, Projektion (Boden 45° gedreht, Feld = 22 × 22 Pixel, Map 36 × 36 Felder), Mathe, Zufall, Farben, Eingabe |
| `art.js` | Boden (`RS.TILES`, `RS.groundAt`), Objekte aus Quadern (`RS.OBJECTS`, `RS.sprite`), Crowd-Figuren (`RS.person`) |
| `maps/pool.js` | Mitgelieferte Maps (`RS.POOL`), Vorlage „Brooklyn Corner“ |
| `world.js` | Map-Modell, Tiefensortierung, Schatten, Tageszeit/Licht, Crowd-Animation, Dampf (`RS.World`) |
| `editor.js` | Level-Editor (Code 282828) |
| `main.js` | Hülle, Skalierung, Menü, Schleife |

Map-Format (.json): `{ name, time, tiles: 36·36 Zeichen, obj: [{t, v, r, x, y}], ppl: [{v, x, y, f}] }`.
Gespeichert im Browser unter `rapstreets-work-v1` (letzter Stand) und `rapstreets-maps-v1` (Maps nach Namen).
