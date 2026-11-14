# Shizuku (雫) – Aufbau

Die Startseite lädt nur `shizuku.js` (im Hauptordner). Diese Datei lädt beim Öffnen des Spiels
alle Module aus diesem Ordner nacheinander, mit demselben Cache-Stempel `?v=…`.
Kein Build-Schritt nötig: jede Datei hier ist direkt die Datei, die im Browser läuft.

| Datei | Inhalt |
|---|---|
| `core.js` | Namensraum `SZ`, Arena-Maße (480 × 272 px, Kacheln 16 px), `L2`, Mathe, Zufall, Rauschen, Pixel-Helfer |
| `input.js` | Tastatur und Maus, Umrechnung in Arena-Pixel |
| `audio.js` | Platzhalter für Musik und Sounds (`SZ.audio.play("name")` steht schon an allen Stellen) |
| `weapons.js` | Waffen mit Werten, 3 Angriffsarten, 3 Blockarten |
| `art-tiles.js` | Boden: Steinplatten, Moos, Erde, geharkter Sand, Wasser, Mauern |
| `art-objects.js` | Objekte (Laterne, Torii, Bäume, Bambus, Busch, Fels, Jizō, Makiwara) und Vegetation |
| `art-samurai.js` | Samurai als kleines 3D-Modell, gerendert in 8 Richtungen; Schwert |
| `arena.js` | Arena-Daten, Bodenarten mit Lauftempo, Kollision, Speichern, eingebauter Tempel |
| `arenas/standard.js` | Standard-Arena (kann vom Dev Tool exportiert werden) |
| `lighting.js` | Tageszeit, Sonnenstand, Schatten, rotes Glühen, Laternenlicht |
| `particles.js` | Blätter, Staub, Spritzer, Ringe, Stroh, Funken, Nachbilder |
| `world.js` | Spielwelt: zeichnet alles in der richtigen Reihenfolge, Wachstum |
| `player.js` | Samurai-Steuerung, Angriffe, Blocks, Treffer |
| `scene-menu.js` | Menü (雫, Gliederpuppe, versteckter Dev-Zugang) |
| `scene-intro.js` | Übergang: Tropfen fällt, Arena wächst |
| `scene-arena.js` | Kampf-Arena |
| `editor.js` | Dev Tool |
| `main.js` | Canvas, Skalierung, Szenenwechsel, Hauptschleife |

## Neue Datei hinzufügen
In `shizuku.js` in die Liste `FILES` an der passenden Stelle eintragen.

## Eigene Grafiken und Sounds (später)
- Sounds: in `shizuku/audio/` ablegen und in `audio.js` unter `FILES` eintragen.
- Samurai-Sprites: `SZ.samurai.frame(richtung, animation, bild)` liefert ein Bild. Diese Funktion
  kann auf ein Sprite-Sheet umgestellt werden, das restliche Spiel bleibt gleich.

## Dev Tool
Menü → kleines Quadrat unten links → Code. „Speichern“ gilt nur im eigenen Browser.
„Als standard.js exportieren“ und die Datei nach `shizuku/arenas/` hochladen: dann ist die Arena für alle Standard.
