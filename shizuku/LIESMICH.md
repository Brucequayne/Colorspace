# Shizuku (雫) – Aufbau

Die Startseite lädt nur `shizuku.js` (im Hauptordner). Diese Datei lädt beim Öffnen des Spiels
alle Module aus diesem Ordner nacheinander, mit demselben Cache-Stempel `?v=…`.
Kein Build-Schritt nötig: jede Datei hier ist direkt die Datei, die im Browser läuft.

| Datei | Inhalt |
|---|---|
| `core.js` | Namensraum `SZ`, Arena-Maße (480 × 272 px, Kacheln 16 px), `L2`, Mathe, Zufall, Rauschen, Pixel-Helfer |
| `input.js` | Tastatur und Maus, Umrechnung in Arena-Pixel |
| `audio.js` | Sounds und Ambiente: Ereignis → Dateien (Varianten wechseln sich ab), Stereo, Loops, Soundtrack pro Lauf (`MUSIC`), Stummschalten (M) |
| `audio/` | Alle Sound-Dateien (mp3) |
| `weapons.js` | Waffen (Katana, Yari, Yumi, Shuriken, Kunai) mit Werten, Loadout (2 Slots und Element), Angriffs- und Blockarten, Werte des Samurai (Leben, Energie, Dash) |
| `art-tiles.js` | Boden: Steinplatten, Tempelplatten, Kopfstein, Bruchstein, Kies, Moos, Erde, Sand, Wasser, Mauer, Abgrund; Klippen, Wasserfälle, Wolken |
| `art-objects.js` | Objekte (Laterne, Torii, Kirschbäume, Laubbäume, Zypresse, Zeder, Ahorn, Kiefer, Bambus, Büsche, Felsen, Jizō, Makiwara) und Vegetation, Treffer-Effekte |
| `art-samurai.js` | Figuren als kleines 3D-Modell (Samurai, Ronin), gerendert in 8 Richtungen; Schwert, Bogen, Pfeil, lange Haare |
| `arena.js` | Arena-Daten, Bodenarten mit Lauftempo, Kollision, Speichern, eingebauter Tempel |
| `arenas/standard.js` | Standard-Arena (kann vom Dev Tool exportiert werden) |
| `lighting.js` | Tageszeit, Sonnenstand, Schatten, rotes Glühen, Laternenlicht |
| `particles.js` | Blätter, Staub, Spritzer, Blut (bleibt als Flecken liegen), Ringe, Stroh, Funken, Nachbilder |
| `world.js` | Spielwelt: zeichnet alles in der richtigen Reihenfolge, Wachstum |
| `player.js` | Samurai: Bewegung, Dash, Angriffe, Konter, Blocks, Bogen, Wurfwaffen, Wasser beschwören, Leben, Energie |
| `element-water.js` | Wasser-Element: Fluten (3 Varianten), Absorbieren (heilt, Kachel wird Sand), Wasserfessel (X). Kosten in `SZ.ELEMENT_COST`, Werte in `SZ.WATER` |
| `enemies.js` | Gegner und KI (Ronin, Heavy Ronin, Yumi-heishi = Bogenschütze mit eigener KI: zweite Reihe, Flucht als Letzter) |
| `hud.js` | Lebens- und Energiebalken, Waffensymbol |
| `scene-menu.js` | Menü (雫, Gliederpuppe, versteckter Dev-Zugang) |
| `scene-intro.js` | Übergang: Tropfen fällt, Arena wächst |
| `scene-arena.js` | Kampf-Arena mit Gegnerwellen (`WAVES` feste Wellen, danach `waveSpec`; Aufstellungen in `spawnGroup`) |
| `editor.js` | Dev Tool |
| `main.js` | Canvas, Skalierung, Szenenwechsel, Hauptschleife |

## Neue Datei hinzufügen
In `shizuku.js` in die Liste `FILES` an der passenden Stelle eintragen.

## Eigene Grafiken und Sounds (später)
- Sounds: in `shizuku/audio/` ablegen und in `audio.js` unter `SOUNDS` (Ereignisse) bzw. `LOOPS` (Ambiente) eintragen.
- Samurai-Sprites: `SZ.samurai.frame(richtung, animation, bild)` liefert ein Bild. Diese Funktion
  kann auf ein Sprite-Sheet umgestellt werden, das restliche Spiel bleibt gleich.

## Dev Tool
Menü → kleines Quadrat unten links → Code. „Speichern“ gilt nur im eigenen Browser.
„Als standard.js exportieren“ und die Datei nach `shizuku/arenas/` hochladen: dann ist die Arena für alle Standard.
