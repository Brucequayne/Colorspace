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
| `haare.js` | Haare: Strähnen aus Wurzeln (Look `hair`), Ruheform am Kopf entlang, Federkette mit Kollision, Malen (`pick`) |
| `kleidung.js` | Kleidung: Entwurf aus Ringen (`newDesign`, `cloneDesign`), Netz bauen (`buildGarment`), Stoff mit Dicke, Physik und Greifen (`Cloth`) |
| `kleided.js` | Kleidungs-Editor (Modus `kleid`, aus dem Charakter-Editor): Entwürfe, Ringe ziehen, Stoff, Dehnen, Export |
| `figur.js` | Spielfigur: lädt `model/figur.bin`, SkinnedMesh auf dem Runner-Skelett, Shader für Haut, Augen, Brauen, enge Kleidung (Speedo), `follow(runner)` |
| `chared.js` | Charakter-Editor (Modus `char`, Knopf „Charakter“ im Map Editor): Haut, Augen, Brauen, Kleidung, Vorschau-Animation |
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
- Speicher im Browser: `polyrunner-map-v1` (Arbeits-Map), `polyrunner-char-v1` (Aussehen der Figur), `polyrunner-settings-v1`, `polyrunner-ui-v1`, `polyrunner-dev`.

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

## Laufen (seit v0.11)

- Tempo und Richtung sind getrennt (`Mover.groundMove`): Antritt `push` mit nachlassender Kraft (`1 − (v/vmax)²`), Auslaufen `friction`,
  Gegenrichtung `brake`, Tempoverlust in Kurven `bleed`. Drehrate = Grip / Tempo, Grip sinkt mit dem Tempo (`gripLow`, `gripLoss`, `gripMin`).
- Blickrichtung `inp.aim` kommt von der Kamera. `Mover.face`: Hüfte (`yaw`) folgt der Laufrichtung, höchstens ±70° (rückwärts ±57°) neben dem Blick;
  der Oberkörper dreht in `runner.js` zurück (`twist`). Seitlich `side` (74 %), rückwärts ~48 %, Sprint nur im Kegel `sprintCone`.
- Gangzyklus in `runner.js` (Zweig `loco`): Frequenz `cad` und Kontaktanteil `beta` aus dem Tempo, Schrittlänge = v·beta/cad (Standfuß steht).
  Gehen/Laufen wird über `rf` überblendet. Neigung aus Grundhaltung + Längsbeschleunigung `acc`, Kurvenlage aus Querbeschleunigung `lat`.

## Neu in v0.13

- Wand hochlaufen (`climb`): `startWallUp(tempo)` — Schritte ab `wallStep1`/`wallStep2` m/s, Schub `wallStepV + wallStepK·tempo` je Schritt,
  Auslöser am Boden (Sprung frontal an der Wand) oder in der Luft kurz nach dem Absprung (`airT < 0.5`).
- Wallrun: `sideFromContact` / `sideWall` (Strahlen zur Seite, Figur wird herangezogen), Winkel ≤ ~50°. Am Boden an der Wand: `brush` → Hand-IK.
- Absprung: `jumpId`, `jumpBoth` (linke Maustaste → `inp.both`, oder aus dem Stand); das Sprungbein wählt `runner.js` aus der Gangphase.
- Hängen: `hangDrop` 1,78 m, Körper optisch 20 cm näher an der Wand (`pivZ`), Pendel `pendulum()`/`applyPendulum()` aus `hang.v0` (Geschwindigkeit vor dem Aufprall), nur wenn `feetFree`.
- Animation: Gelenke als Federn (`j(name, x, y, z, w, zeta)`), Feder-Werte `spring(key, …)` für Neigung, Kurvenlage, Hüfte, Oberkörper-Nachschwingen.
  Kurzes Überblenden bei Moduswechsel (`blend`). Slide-Beine per `limbIK` an Bodenpunkte.
- Licht: Strukturen werfen Schatten mit den Vorderseiten (`shadowSide = FrontSide`), Kontaktschatten unten an senkrechten Wänden (`uAO`).

## Bewegung (Stand v0.12)

- Tasten: WASD (relativ zur Kamera), Shift sprinten, Leertaste: springen / Wandsprung / an der Kante hochziehen / beim Aufkommen abrollen,
  Q/E Hüft-Slide links/rechts (halten), Strg/C ducken und Kante loslassen.
- Stufen ≤ `step` (0,45 m) steigt er im Lauf (`Mover.stepUp`, Versatz optisch über `smooth` ausgeglichen).
- Kanten in der Luft (`Mover.grabLedge`): Höhe über dem Absprungboden ≤ 0,55 m Füße (`vault` „step“), ≤ `vaultHands` (1,3 m) Hände („hands“),
  darüber Hängen (`hang`, Körper `hangDrop` unter der Kante). Im Hängen: Leertaste = Hochziehen („pullup“), A/D hangeln (`edgeAt` prüft die Kante),
  Strg/C oder rückwärts = loslassen, rückwärts + Leertaste = Rücksprung.
- Fallhöhe = höchster Punkt seit Bodenkontakt − Landehöhe. Grenzen `safe`, `stumble`, `deadly` in `TUNE`; Leertaste in der Luft bei schnellem Fall
  = Abrollwunsch (`rollBuf`), kurz nach dem Aufprall noch `lateRoll` Sekunden Zeit. Beinbruch → Modus `broken`, Ragdoll in `runner.js`.
- Slide: `slideSide` +1 links (Q), −1 rechts (E); Aufstehen `startGetup`: Wunschrichtung zur Hüftseite = schnell mit Drehung, andere Seite = langsam.

## Animation (Stand v0.12)

- `Runner.place()` vor `update()` aufrufen. `runner.world` = Welt für Fuß-Strahlen und Ragdoll-Kollision.
- Füße: `ground()` je Fuß (Höhe, Neigung), Becken `pelOff` senkt sich auf den tieferen Fuß.
- Hände: `armIK()` (Zwei-Knochen-IK in 3D, Ellbogen nach `pole`), genutzt beim Hängen, Hochziehen und Hände-Vault.
- Ragdoll: `startRagdoll()` baut 15 Punkte aus den Gelenken, Stäbe dazwischen, `applyRag()` dreht die Knochen danach.

## Bewegung (Stand v0.1, teils überholt)

WASD (relativ zur Kamera), Shift sprinten, Leertaste springen. Strg/C: rutschen ab Sprinttempo, sonst ducken;
kurz vor der Landung nach hohem Fall: abrollen (sonst ab ~4,9 m stolpern). In der Luft an einer Wand entlang: Wallrun,
Leertaste stößt ab. Frontal an der Wand in der Luft: Wandsprung (nicht zweimal hintereinander an derselben Wand, zwischen
zwei Wänden hin und her geht). Am Boden frontal an der Wand + Sprung: Wand hochlaufen. Kanten bis 2,15 m über den Füßen:
automatisch hochziehen, niedrige Hindernisse bis 1,25 m im Lauf überklettern.

## Spielfigur und Charakter-Editor (seit v0.14)

- Quelle: `model/quelle/Charakter_Polyrunner.fbx` (Noahs Modell, ohne Skelett, ohne UVs; Augäpfel, Zähne und Zunge sind eigene Teile).
  `werkzeuge/figur_bauen.js` macht daraus `model/figur.bin`: `node polyrunner/werkzeuge/figur_bauen.js dump` (lädt das FBX per Playwright im Browser,
  schreibt `werkzeuge/figur_roh.json`, nicht hochladen), danach ohne Argument (Auto-Rig, schreibt die .bin). Das Modell wird nicht verändert,
  nur auf **1,40 m** skaliert (Kindgröße, Noahs Wahl), Füße auf y = 0, Blick +Z, gleiche Punkte zusammengelegt.
- `figur.bin`: `PRF1`, Länge + JSON-Kopf (Gelenke `joints`, Augäpfel `eyes` mit Mittelpunkt/Radius/Lidöffnung, Knochenliste), dann Positionen (Uint16, quantisiert),
  Indizes (Uint16), je Punkt 4 Knochen + 4 Gewichte (Uint8) und Teil `aPart` (0 Haut, 1 Haut Hände/Füße, 2/3 Auge links/rechts, 4 Zähne, 5 Zunge).
- Auto-Rig: Gelenke von Hand aus Schnitten durchs Modell bestimmt (`J` im Werkzeug), Gewichte = nächstes Knochensegment der eigenen Körperseite,
  dann 14× über die Oberfläche geglättet. Knochen-Ruhe in `Figur`: Arme/Beine zeigen mit −Y aufs nächste Gelenk (A-Pose = Bind-Pose),
  deshalb kann `follow(runner)` die lokalen Drehungen des Runners 1:1 übernehmen; Becken × `k` (Beckenhöhe 0,69 / 0,9). Arme +0,12 rad weiter abgespreizt.
- Aussehen nur im Shader auf der Ruhe-Position (`position` vor dem Skinning), dadurch liegt alles exakt auf der Haut:
  Augen = Leinwand-Textur in Blickrichtung projiziert (`eyeCanvas`), Brauen = Leinwand von vorne aufs Gesicht (`browCanvas`, Ausschnitt `FACE`),
  Speedo = Felder in `pruSpeedo()` (Bund oben, Beinausschnitt je Bein über Winkel um die Beinachse, Seitenstreifen über Winkel um den Körper).
  Enge Kleidung später genauso (eigene Felder), weite Kleidung als eigene Netze mit Stoffphysik (v0.16), Haare v0.15.
- Look (`LOOK_DEFAULT`): `{ v, skin, eyes: { type, iris, size, pupil, shine }, brows: { type, color, size, thick, y, gap, tilt }, bottom }`.
  Export `PolyRunner_Figur.json` mit `format: "polyrunner-look"`.
- Vorschau im Editor: Runner läuft unsichtbar auf der Stelle (Laufband), Boden-Strahlen über eine Ersatz-Welt (`FAKEWORLD`).

## Haare (seit v0.15)

- Look `hair = { groups: [{ id, len (m), type, color, thick }], roots: [[x, y, z, nx, ny, nz, gruppe], …] }`, Wurzeln in Ruhe-Koordinaten.
  Typen: `glatt, wellen, locken, wild, braids, dreads, dreadsdick`. Jede Wurzel = eine Strähne (flache, spitz zulaufende Anime-Strähne, Braids/Dreads rund).
- Kopf-Höhenkarte (`headMap`): größter Hautabstand vom Kopfmittelpunkt `HC` je Richtung (64 × 40), dient für Ruheform, Kollision und „auf die Haut legen“.
  Malen: Strahl wird mit der Kopf-Matrix in Ruhe-Koordinaten gedreht und gegen das Kopf-Teilnetz (Haut über y 1,13) getestet.
- Ruheform (`makeStrand`): Startrichtung = Schwerkraft entlang der Kopfhaut (oben: nach hinten) + Abheben, Schritt für Schritt aus dem Kopf geschoben, fällt dann;
  Typ-Verformung quer zur Strähne. Zufall je Wurzel fest (Samen aus der Position).
- Physik (`update`): Federkette wie VRM-Spring-Bones — Trägheit mit Dämpfung, Zug zur mit dem Kopf gedrehten Ruherichtung (Wurzel steif, Spitze weich),
  Schwerkraft, Fahrtwind (`wind`, im Editor = Laufband-Tempo), Länge zum Vorgänger exakt, Kollision Kopf + Kapseln `COLL` (Hals, Brust, Schultern, Bauch).
- Kopfhaut-Tönung: Attribut `aHair` (Farbe + Anteil) auf der Figur, im Shader über die Haut gemischt.
- Editor: Reiter „Haare“ (Ansicht springt auf den Kopf, Animation Stehen). Linke Maus auf dem Kopf malt/radiert, daneben dreht. Einstellungen des Pinsels in `polyrunner-ui-v1` (`hb`).

## Kleidung (seit v0.17: echte Stoffnetze, Kleidungs-Editor)

- Keine Kleidung mehr im Haut-Shader (Badehose, Tanktop usw. aus v0.14–v0.16 entfernt). Look: `wear = { top: Entwurf|null, bottom: Entwurf|null }` (Kopien).
- Entwürfe in `polyrunner-kleider-v1` (Liste), Format `polyrunner-kleid`:
  - Oberteil `{ kind: "top", color, thick (mm), stiff (0–1), neck: { d (Tiefe, − = Kragen), w (Breite 0–1), ease }, arm (Armausschnitt m), torso: [{ y, ease }] (aufsteigend, [0] = Saum), sleeve: [{ t, ease }] (t = m entlang des Arms ab Schulter, letzter = Ärmelende, 0 = ärmellos) }`
  - Hose `{ kind: "bottom", …, waist: { y, ease }, leg: [{ L, ease }] }` — L: 0 = T-Badehose, bis 0,15 wandert die Seite zum Schritt (Panty), darüber waagrechte Öffnung bei y = 0,622 − (L − 0,15), über den Knöchel hinaus angesetzt.
  - `ease` = Weite in m über der Haut (zwischen den Ringen linear), Hals-Weite oben im Rumpf eingeblendet.
- `buildGarment`: Feld je Hautpunkt (Klasse Rumpf/Arm/Bein/Kopf über den stärksten Knochen, `bodyInfo` einmal je Modell), Dreiecke mit einem inneren Punkt kopiert, äußere Punkte auf die Schnittlinie geschoben;
  Weite über die Normale, Rumpf unter der Brust und Hosenbeine fallen zusätzlich von der breitesten Stelle innerhalb der Falllänge (≈ 8–9 × Weite) darüber (Radien-Tabellen `tor`, `legs`);
  Ansetzen (`extend`) für Saum unter 0,70, Ärmel über 0,315 m, Hose über den Knöchel. `pin` = wie fest am Körper (eng/oben fest, weit/unten lose).
- `Cloth`: CPU-Skinning der Anker, Verlet, Zug zum Anker, Stofflängen mit Straffheit (`slack` 1–1,35, Stärke, Durchgänge), Abstand zur Haut `mn` (+ `setLayer` = Oberteil über der Hose),
  Kapseln Beine/Unterarme. Netz = Außenhaut + Innenhaut (− Normale × Dicke) + Rand an den Öffnungen. Greifen: `pick(ray)`, `grab(i, punkt)` (Handvoll bis 3 cm), `drag`, `release`, `strain()`.
- Editor: Ringe = Randschleifen (Öffnungen) bzw. äußerster Stoffpunkt je Richtung im Band (Zwischenringe), anklicken → ziehen (dy = Länge, dx = Weite), Neubau höchstens alle 110 ms.
- Ablauf mit Noah: er exportiert `PolyRunner_Kleid_<Name>.json`, Claude legt sie als feste Kleidung ins Spiel (Ordner/Liste noch festzulegen).
