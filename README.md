# Anarchy Frankfurt – Map-Editor v0.21

Grundstein für das Spiel: Frankfurt im Maßstab 1:1 (25 × 25 km) mit Stadtkarte aus OpenStreetMap als Boden.
Kamera: 45° gedreht, 48° geneigt, 12 Pixel pro Meter. Objekte drehen in 15°-Schritten.

Liegt im Repo im Ordner `anarchy-frankfurt/`, aufrufbar unter der Color-Space-Adresse plus `/anarchy-frankfurt/`. Direkt als Datei (file://) geht es nicht,
weil die JS-Dateien als Module geladen werden.

## Dateien (`js/`)
| Datei | Aufgabe |
|---|---|
| config.js | Einstellungen (Winkel, Pixel/Meter, Kartengröße, Orte) |
| camera.js | Projektion, Kamera, Längen-/Breitengrad ↔ Meter |
| storage.js | Browser-Speicher, Export/Import |
| osm.js | OSM-Daten laden (Overpass), umwandeln, cachen |
| refmap.js | Stadtkarte als Boden zeichnen |
| geometry.js | 3D-Bausteine für Assets |
| materials.js | Pixel-Texturen |
| assets.js | Asset-Bibliothek |
| renderer.js | Pixel-Renderer (Sprites mit Schatten und Umriss) |
| tiles.js | Kachel-Cache für Boden und Objekte |
| world.js | Kartenobjekte, Rückgängig, Speichern |
| roads.js | Straßennetz, Kreuzungen, Fahrbahn-Markierungen |
| veg.js | Vegetationspinsel: Pixel-Pflanzen wie in Rap Streets/Shizuku |
| tools.js | Werkzeuge (Auswahl, Platzieren, Vegetationspinsel, Radierer, Straße) |
| ui.js | Oberfläche |
| main.js | Start, Eingabe, Zeichenschleife |

Kartendaten © OpenStreetMap-Mitwirkende, Lizenz ODbL.
