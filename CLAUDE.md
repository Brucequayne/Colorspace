# Color Space – Arbeitsanleitung für Claude

Diese Datei ist das Briefing für jede Claude-Sitzung, die an diesem Repo arbeitet. Erst ganz lesen, dann loslegen.

## Projekt und Menschen

- **Color Space** ist Noahs Website mit kleinen Browser-Spielen und Tools, gehostet über GitHub Pages aus dem Repo `Brucequayne/Colorspace` (Branch `main`, Hauptordner).
- Noah (und Freunde, die mitarbeiten) schreiben **keinen Code selbst**. Sie sind die kreativen Köpfe mit gutem technischem Verständnis. Claude schreibt den Code, testet ihn und liefert fertige Dateien.
- **Claude kann nicht pushen.** Claude liefert die geänderten Dateien, der Mensch lädt sie auf GitHub hoch („Add files“ → „Upload files“).
- Sprache mit Noah: **Deutsch**, locker, präzise. Ehrliche Einschätzungen statt Schönfärberei.
- **Soy & Soul** (`SoyandSoul/Soy-Soul`) ist eine andere, getrennte Website. Nicht anfassen.

## Aufbau des Repos

| Datei | Inhalt |
|---|---|
| `index.html` | Startseite mit Kacheln, Router (`#spacerogue`, `#flughafen` …), lädt alle Skripte |
| `patchnotes.js` | `window.PATCHNOTES` – Patchnotes aller Apps, **neueste Version oben**. Die Versionsanzeige einer App kommt aus ihrem obersten Eintrag |
| `spacerogue.js` | Space Rogue – **gebaut** aus `spacerogue-src/` (nie direkt bearbeiten, siehe unten) |
| `flughafen.js`, `gigachess.js`, `weltmacht.js`, `noaim.js`, `citygen.js` | Spiele, je eine Datei |
| `pixellab.js`, `colorspin.js`, `ezcrop.js`, `drawspace.js`, `framepaint.js`, `channels.js` | Tools, je eine Datei |
| `mp4-muxer.js` | Fremdbibliothek (MIT) für Video-Export, nicht ändern |
| `thumbs/` | Vorschaubilder der Kacheln |

Jede App ist ein IIFE mit `window.<Name>.mount(element, "de"|"en")` und `unmount()`. Texte immer zweisprachig über `L2("deutsch", "english")`.

## Pflicht bei jedem Update

1. **Immer vom aktuellen Repo-Stand ausgehen.** Vor dem Arbeiten das Repo frisch holen (`git clone`/`git pull`) und die Dateien von dort nehmen. Nie mit einer alten Kopie arbeiten – sonst überschreibt man beim Hochladen die Arbeit anderer (ist schon passiert: alte `patchnotes.js` hat neue Einträge gelöscht).
2. **Patchnote-Eintrag** oben in der Liste der App in `patchnotes.js`:
   ```js
   { v: "0.52", t: "2026-11-11T04:10:00+01:00",
     de: ["Was neu ist, in ganzen Sätzen", "…"],
     en: ["Same in English", "…"] },
   ```
   `t` = Uhrzeit des Updates in deutscher Zeit mit Offset (`+01:00` im Winter, `+02:00` im Sommer).
   Versionsnummern bei Space Rogue seit v0.52 **zweistellig** (0.52 → 0.53 …), keine dritte Stelle mehr.
3. **Cache-Stempel erhöhen:** In `index.html` hängt an jedem Skript `?v=JJJJMMTT-HHMM`. Bei jedem Update **alle** Vorkommen auf den neuen Zeitpunkt ändern (einfaches Suchen/Ersetzen), sonst sehen Besucher die alte Version.
4. **Testen**, bevor geliefert wird (Syntaxcheck mit Node, Spiel im Browser durchspielen, z. B. per Playwright mit lokalem `python3 -m http.server`).
5. **Liefern:** alle geänderten Dateien als Dateien übergeben. Fast immer: die App-Datei + `patchnotes.js` + `index.html`.
6. **Antwort an Noah:** auf Deutsch, kurz: was umgesetzt wurde (je Punkt), eigene Entscheidungen offen benennen (z. B. Balance-Werte), ein Satz zur Performance, genaue Hochlade-Anleitung, und der Hinweis, die Seite mit einer neuen Zahl zu öffnen, z. B. `?5100` (umgeht den Browser-Cache).

## Gestaltung

- Dunkles Grau, **scharfe Kanten** (kein border-radius), **keine Kursivschrift**.
- Keine externen Abhängigkeiten außer dem, was schon da ist. Alles läuft im Browser, Dateien der Nutzer verlassen nie das Gerät.

## Space Rogue (aktuell v0.57.5)

Raumschiff-Baukasten: Editor (Schiff und Raumstation), Testflug mit Kampf gegen KI, zu Fuß durchs Schiff laufen, Luft/Luken/Raumanzug, Andocken. Top-down, Raster 1 Zelle = 2,5 m, Canvas 2D.

**Quellcode liegt in `spacerogue-src/`** (Aufteilung von Fable, seit v0.50). `spacerogue-src/LIESMICH.md` lesen – dort steht, welche Datei was enthält.

- Ändern **nur** in `spacerogue-src/src/NN-name.js`. Alle Teile werden in Namensreihenfolge zu einer Funktion zusammengehängt und teilen sich die Variablen (`S` Editor, `V` Ansicht, `FL` Flug, `T` Bauteile).
- Danach bauen und testen:
  ```
  cd spacerogue-src && npm install   (einmalig, für jsdom)
  node build.js                      (schreibt ../spacerogue.js)
  node tests/logik.test.js           (23 schnelle Logiktests)
  node tests/volltest.js             (festes Kampfszenario, Fingerabdruck)
  node tests/editor.test.js          (Spielablauf: Waffen, Einrichtung, MP …)
  ```
  Volltest: Bei reinem Umbau muss der Fingerabdruck gleich bleiben. Bei gewollter Spieländerung prüfen, dann `node tests/volltest.js --merken`.
- Version steht in `src/00-kopf.js` (`var VERSION`).
- Wichtige Orte: Bauteile/Preise `11-bauteile.js`, Balance (Waffen, `GUN`, `SMG`, `wStats`, Waffengruppen `WGROUPS`) `12-balance.js`, Waffenlogik `51-steuerung-waffen.js`, KI `53-ki.js`, zu Fuß/Luken/Handwaffen `54-figur.js`, HUD `60-zeichnen-flug.js`, Turrets (KI, `TUR` in 12-balance) `56-turrets.js`, Developer Tool (Sperre, `DEV_H`) `30-zustand.js`, Environment/Asteroiden/Ebenen `44-umgebung.js`, verwitterte Panzerung (Rost/Moos als 16er-Pixeltextur, `wx`) `45-verwitterung.js`, .txt-Export/Import `73-hangar-export.js`, Infofeld und Block-Varianten-Palette (`vg`/`va`, Falte) `70-ui.js`.
- **Hochladen bei Space Rogue:** `spacerogue.js`, `patchnotes.js`, `index.html` in den Hauptordner, dazu den Ordner `spacerogue-src` (ohne `node_modules`, ohne `package-lock.json`) als Ganzes hochziehen. Bequem: als Zip liefern, Noah entpackt und zieht den Ordner ins Upload-Fenster.
- **Achtung Ordner-Upload:** den Ordner `spacerogue-src` so hochziehen, dass er im Hauptordner landet, nicht in sich selbst. Vor dem Arbeiten prüfen, dass es kein `spacerogue-src/spacerogue-src/` gibt (war bis v0.52 der Fall).
- **Gelöschte Dateien** löscht GitHub beim Ordner-Upload nicht. Wenn eine Quelldatei wegfällt, Noah genau sagen, welche Datei er von Hand löschen muss (Datei öffnen → „…“ → „Delete file“).
- Speicherschlüssel im Browser (`spacerogue-ship-v1`, `spacerogue-station-v1`, `spacerogue-ui`) und das Format der Schiffscodes nicht ändern, sonst gehen gespeicherte Schiffe verloren.

### Stand und Richtung
- **Richtung (seit 11.11.2026): Story-Spiel** mit klaren Missionen in chronologischer Reihenfolge, Level für Level. Rogue-like (in v0.50.2 entfernt) und Open World sind verworfen – nicht wieder einbauen, ohne dass Noah es sagt.
- **Aktuelle Phase: Sandbox/Technik verbessern**, noch nichts an Missionen oder Story: KI-Verhalten, Content, mehr Blöcke, mehr Funktionsblöcke, begehbare Raumstationen mit Innenräumen. Bausteine so anlegen, dass Missionen sie später nutzen können (z. B. KI-Verhalten als wiederverwendbare Bausteine, Ereignisse wie „zerstört“, „angedockt“, „Raum betreten“).
- **Developer Tool** (seit v0.52, früher Raumstation-Editor): gesperrt mit Code, dort alle Bauteile. Bauteile, die nur dort verfügbar sein sollen, bekommen `dev: true` in `11-bauteile.js`. Noah baut darin Stationen, Strukturen und Schiffe und liefert sie als .txt-Schiffscodes mit sprechendem Namen, z. B. `Mission_1_Ship_1.txt` – daraus erkennt Claude, wo sie hingehören.
- **Environment** (seit v0.54 „World Building“): im Developer Tool Tab „Environmental“, frei platzierte, skalier- und drehbare Assets (bisher 28 Asteroiden, nur mittlere bis dunkle Grautöne; Sprites in Auflösungsstufen, Maßstab max. ×4) auf drei Ebenen: -1 hinten, 0 Spielebene (starr, unzerstörbar, Kollision, blockt Schüsse), 1 vorne (wird über dem Schiff durchsichtig). Ebenen-Parallaxe `ENV_K` bewusst nah an 1. Szenen-Export = Schiffscode + Feld `env` (`[id, x, y, grad, maßstab, ebene]`). Noahs Szenen-.txt-Dateien enthalten also Blöcke und Environment.
- **Backdrops** (seit v0.56, `46-backdrops.js`): Kategorie im Tab Environmental, 21 Planeten + 5 Sonnen auf Ebene -2 ganz hinten (fast keine Parallaxe `BD_K`, Größe unabhängig vom Zoom, Lage in Bildpunkten relativ zur Bildmitte). Planeten prozedural, Tagseite zur nächsten Sonne. Gegenlicht-Saum für alles vor einer Sonne über `bdFxBegin`/`bdFxEnd` (Vordergrund in eigener Leinwand).
- **Gegenstände** (seit v0.57, `57-gegenstaende.js`): E aufheben/Bankautomat, Q ablegen, Inventar mit Ziehen und Ablegen, Schweißgerät + Pistole fest auf 1/2. Credits stapelbar; Bankautomat zahlt ein; Kontostand in der Kopfzeile (neuer Schlüssel `spacerogue-konto-v1`). Gegenstände zum Auslegen = Boden-Bauteile mit `loot` im Developer Tool.
- **Tests ohne jsdom:** Paketinstallationen sind in manchen Sitzungen gesperrt. Dann volltest/editor.test in Chromium per Playwright laufen lassen (iframe statt JSDOM, Vergleich alter gegen neuer Stand im selben Aufbau). Seit v0.57 stimmt `referenz.json` nicht mehr (nur +87 Zeichenaufrufe): beim nächsten Lauf mit jsdom `--merken`.
- **Sound und Musik** macht Noah selbst (Sounddesigner). Vertonung offen (Synchro oder Text/Sprachausgabe), vorerst Text.
- Offene Designfrage: Welche Rolle spielt der Schiffsbau in der Story (z. B. Budget/Vorgaben zwischen Missionen)?
- **Geplante Missionsstruktur (Stand 14.11.2026, noch nicht gebaut):** Missionen als Daten außerhalb von `spacerogue.js`, je Mission ein eigener Ordner (Vorschlag `spacerogue-missionen/mNN-name/` mit `mission.json`, `szene.txt`, `schiffe/`, `musik/`), Reihenfolge in `missionen.json`, zur Laufzeit per fetch geladen. Trigger nach „Wenn → dann“.
  - Musik: jede Mission hat einen eigenen Soundtrack; dazu 3 Standard-Kampf-Soundtracks, im ganzen Spiel zufällig gewählt; Boss-Soundtracks kündigt Noah an. Audio als .ogg/.mp3 (Web-Upload max. 25 MB pro Datei).
  - Trigger/Ziele: fliege zu Punkt XY, finde Objekt XY, zerstöre Ziel XY, repariere Block XY, finde Wrack XY, finde Raumstation XY, Zeittrigger, Positionstrigger usw.
  - Erste Mission = Einführungsmission. Noah liefert dafür Szene, ersten Soundtrack und Schiff; erst dann bauen. **Verschoben auf v0.6** (Stand 16.11.2026); bis dahin vor allem Sound und Score.
- **Sounds** (seit v0.58, `59-sound.js`): Noahs .mp3 unter `spacerogue-sounds/<bereich>/` (bisher `handwaffen/`). Seine Lautstärken nicht verändern; Stille am Anfang wird beim Abspielen übersprungen. Ordner `spacerogue-sounds` gehört mit ins Zip.

## Andere Apps (Kurzüberblick)
- **PolyRunner** (seit v0.1, 27.11.2026): Parkour-Zeitfahren in 3D, Lader `polyrunner.js`, Module in `polyrunner/src/` (Three.js aus `polyracer/lib/`). Aufbau, Map-Format und Skelett in `polyrunner/LIESMICH.md`. Map Editor mit Code 282828; Noah schickt Level als `PolyRunner_<Name>.json` mit Nummer. Das echte Figurenmodell kommt später von Noah und bekommt das vorhandene Rig.
- **Flughafen**: Flughafen-Aufbauspiel (v0.69: Wolkenschatten). Große Einzeldatei.
- **Gigachess**, **Weltmacht**, **No Aim**, **CityGenerator**: Spiele.
- **EZ Crop** (v0.2): Video im Browser auf 9:16 / 4:5 / 1:1 zuschneiden, Rahmen live mit der Maus führen, MP4-Export über WebCodecs + `mp4-muxer.js`.
- **Pixellab**, **Colorspin**, **Draw Space**, **FramePaint**, **Channels**: Bild-/Mal-Tools.

## Zusammenarbeit
- Es arbeiten mehrere Leute (und mehrere Claude-Sitzungen) am selben Repo. `patchnotes.js` und `index.html` fassen fast alle an – deshalb Regel 1: immer frisch vom Repo starten, und nicht zwei Updates parallel vorbereiten, die beide diese Dateien liefern.
