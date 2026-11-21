# Anarchy Frankfurt – Map-Editor v0.28

Grundstein für das Spiel: Frankfurt im Maßstab 1:1 (25 × 25 km) mit Stadtkarte aus OpenStreetMap als Boden.
Kamera: 45° gedreht, 48° geneigt, 12 Pixel pro Meter. Objekte drehen in 15°-Schritten, Straßen in 5°-Schritten.

Liegt im Repo im Ordner `anarchy-frankfurt/`, aufrufbar unter der Color-Space-Adresse plus `/anarchy-frankfurt/`. Direkt als Datei (file://) geht es nicht,
weil die JS-Dateien als Module geladen werden.

## Dateien (`js/`)
| Datei | Aufgabe |
|---|---|
| camera.js | Einstellungen, Projektion, Kamera, Längen-/Breitengrad ↔ Meter |
| osm.js | OSM-Daten laden (Overpass), umwandeln, cachen, als Stadtkarte zeichnen |
| geometry.js | 3D-Bausteine für Assets |
| materials.js | Pixel-Texturen |
| assets.js | Asset-Bibliothek |
| renderer.js | Pixel-Renderer (Sprites mit Schatten und Umriss) |
| tiles.js | Kachel-Cache für Boden und Objekte |
| world.js | Kartenobjekte, Rückgängig, Speichern, Browser-Speicher, Export/Import |
| roads.js | Straßennetz, Kreuzungen, Fahrbahn-Markierungen |
| veg.js | Vegetationspinsel: Pixel-Pflanzen wie in Rap Streets/Shizuku |
| blocks.js | Häuserblock-Tool: Gründerzeit-Altbau und Fachwerk prozedural aus einem Vieleck, Hofzugänge, Türen |
| paint.js | Bodenpinsel (Bodentexturen auf 0,25-m-Raster) |
| player.js | Spieltest: Figur, Kollision, Türen, Innenraum-Konzept |
| tools.js | Werkzeuge (Auswahl, Platzieren, Vegetationspinsel, Radierer, Straße) |
| ui.js | Oberfläche |
| main.js | Start, Eingabe, Zeichenschleife |

Kartendaten © OpenStreetMap-Mitwirkende, Lizenz ODbL.

## models/
Fertig gerenderte Sprites der Low-Poly-Pack-Modelle (72 Drehungen à 5°). Pro Modell eine PNG
(obere Hälfte Farbe, untere Hälfte Tiefe + Schatten) und eine JSON mit den Bildausschnitten.
Die 3D-Originaldateien liegen bewusst nicht im Repo.
