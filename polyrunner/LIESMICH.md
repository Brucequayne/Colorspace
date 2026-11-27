# PolyRunner – Aufbau

Parkour-Zeitfahren in minimalistischem 3D. Ein Level = eine Map mit Start und Ziel, keine Wegweiser. Der Rest des Spiels
dreht sich um Figur, Bewegung und Parkour. Three.js r170 kommt aus `polyracer/lib/` (nicht doppelt im Repo).

Die Startseite lädt nur `polyrunner.js` (Lader). Er meldet seine Module in der gemeinsamen Import-Map an
(`window.CSImport`, zusammen mit Poly Racer und Leaarn), jedes Modul bekommt den Cache-Stempel der Startseite.
Neue Module: in `MODULES` in `polyrunner.js` eintragen. Modul-Präfix: `pru/`.

## Module in `src/`

| Datei | Aufgabe |
|---|---|
| `core.js` | Namensraum `PRU` (Version), Texte (`L2`, `t`), Speicherschlüssel `KEYS`, Zugangscode `DEV_CODE` (282828), Mathe, `ftime` |
| `engine.js` | Renderer, Himmelskuppel (Verlauf + Sonne/Mond im Shader), Tageszyklus (`env.time`, `cycle`, `speed`: 1 = 24 min pro Tag), Licht, Nebel, Schatten folgen dem Blickpunkt, Boden, `concrete(hex)` = matter Beton mit weltfester Körnung (wird nie gestreckt) |
| `world.js` | Map-Daten, `Prism` (Netz, Flächen zum Weiterbauen, Kugel-Kollision), Marker Start/Ziel/Test-Start, `collideSphere`, `ray`, Verlauf über `snapshot`/`restore` |
| `runner.js` | Test-Runner: **Skelett** (`BONES`) + Low-Poly-Strichmännchen, prozedurale Animation je Zustand, Bein-IK |
| `move.js` | Bewegung und Parkour (feste 120 Schritte/s), alle Zahlen in `TUNE` |
| `play.js` | Testlauf: Verfolgerkamera mit Pointer-Lock, Zeitfahren, Bestzeiten, Pause |
| `editor.js` | Map Editor: Bauen, Start/Ziel/Test-Start, Farbe, Löschen, Himmel, Datei, Rückgängig |
| `menu.js` | Hauptmenü (Spielen noch gesperrt), Code-Abfrage, Einstellungen |
| `main.js` | Hülle: Zustände `menu`, `editor`, `test`, Schleife, CSS |

## Map-Format (.json)

```
{ format: "polyrunner-map", v: 1, id, name,
  sky: { time, cycle, speed },
  start: { p: [x, y, z], yaw }, finish: { p: [x, y, z] }, test: { p, yaw } | null,
  structs: [ { id, s, o: [x,y,z], n: [..], u: [..], pts: [[a,b], …], h, c } ] }
```

- Jede Struktur ist ein gerades Prisma: konvexes Vieleck `pts` (gegen den Uhrzeiger) in der Ebene durch `o` mit den Achsen
  `u` und `v = n × u`, entlang `n` um `h` Meter herausgezogen. `s` = Form (`rect`, `tri`, `circle`, `hex`), `c` = Füllfarbe.
  Auf dem Boden ist `n` = oben, auf Dächern auch, an Wänden zeigt `n` waagerecht aus der Wand.
- Maße in Metern, auf mm gerundet. `id` der Map ist der Schlüssel für Bestzeiten (`polyrunner-best-v1`).
- Ziel: Zylinder mit Radius `FINISH_R` (1,4 m), 4 m hoch.
- Speicher im Browser: `polyrunner-map-v1` (Arbeits-Map), `polyrunner-settings-v1`, `polyrunner-ui-v1`, `polyrunner-dev`.

Ablauf Level: Noah baut im Editor, exportiert `PolyRunner_<Name>.json` und schickt die Dateien mit Nummer.
Für „Spielen“ kommen sie später als Level-Liste ins Spiel (noch nicht gebaut).

## Bauwerkzeug

Ziehen markiert die Form auf der Fläche unter der Maus (Boden, Dach oder Wand), Loslassen startet das Hochziehen entlang der
Flächen-Normale, Klick setzt die Höhe. Ecken/Kanten rasten an Kanten in derselben Ebene ein, die Höhe an den Höhen aller Ecken
(Alt aus), Strg = 0,25-m-Schritte, Zahl tippen = genaue Höhe. Auf dem Boden dreht Q/E die Form (15°, mit Shift 1°),
auf Flächen richtet sie sich nach der Fläche.

## Skelett (für das echte Modell)

Knochennamen wie gängige Humanoid-Rigs: `Hips, Spine, Chest, Neck, Head`, je Seite `Left…/Right…`:
`Shoulder, UpperArm, LowerArm, Hand, UpperLeg, LowerLeg, Foot, Toes`. Ruhepose: Blick nach +Z, links = +X,
Arme und Beine hängen gerade nach unten. Figur 1,8 m, Hüfte 0,9 m, Ober-/Unterschenkel je 0,415 m.
Das Modell kommt später als SkinnedMesh mit denselben Knochen (oder wird auf sie umgemappt); die Animation in `runner.js` bleibt.

## Bewegung (Stand v0.1)

WASD, Shift sprinten (baut sich langsam auf), Leertaste springen. Strg/C: rutschen ab Sprinttempo, sonst ducken;
kurz vor der Landung nach hohem Fall: abrollen (sonst ab ~4,9 m stolpern). In der Luft an einer Wand entlang: Wallrun,
Leertaste stößt ab. Frontal an der Wand in der Luft: Wandsprung (nicht zweimal hintereinander an derselben Wand, zwischen
zwei Wänden hin und her geht). Am Boden frontal an der Wand + Sprung: Wand hochlaufen. Kanten bis 2,15 m über den Füßen:
automatisch hochziehen, niedrige Hindernisse bis 1,25 m im Lauf überklettern.
