# Leaarn – Aufbau

Lernspiel für Klasse 5–10. Man läuft in 3rd Person durch sein Zuhause (Hub), löst am Schreibtisch mit Laptop Lernaufgaben
und verdient damit Geld, von dem man sich später Neues kaufen kann (bessere Häuser, ein Auto, …).
Grafik im Low-Poly-Look von Poly Racer, viele Module sind aus Poly Racer übernommen. Three.js r170 kommt aus `polyracer/lib/` (nicht doppelt im Repo).

Die Startseite lädt nur `leaarn.js` (Lader). Er meldet seine Module in einer **gemeinsamen Import-Map mit Poly Racer** an
(`window.CSImport`, Browser erlauben meist nur eine Import-Map), jedes Modul bekommt den Cache-Stempel der Startseite.
Neue Module: in `MODULES` in `leaarn.js` eintragen.

## Module in `src/`

| Datei | Aufgabe |
|---|---|
| `core.js` | Namensraum, Texte (`L2`, `t`), Speicherschlüssel, Mathe, Zufall, Rauschen (aus Poly Racer) |
| `engine.js` | Renderer, Kamera, Himmel, Sonne nach Uhrzeit, Nebel, Schatten (aus Poly Racer) |
| `terrain.js`, `road.js`, `vegetation.js`, `models.js`, `wind.js`, `race.js`, `car.js`, `drive.js`, `input.js`, `sceneio.js` | aus Poly Racer (Gelände 360² auf 1440 m, Straßenbau, Vegetation, Auto für später) |
| `houses.js` | **Haus-Bauteile** (`PARTS`), Hausbau aus Bauteilen (`buildHouse`), Kollision (Wand-Strecken, Möbel-Kästen), Türen, Interaktionen, `HouseInst` (Haus in der Welt) |
| `haeuser.js` | **fertige Häuser** für den Map-Editor (`HOUSES`, bisher `starter`) |
| `world.js` | Welt = Gelände + Straßen + Vegetation + Häuser (`houses`, Gelände wird unter Häusern geebnet), Standard-Hub |
| `player.js` | Spielfigur: Low-Poly-Modell mit Lauf-Animation, Laufen/Rennen/Springen, Kollision, Kamera-Strahl gegen Wände (`camHit`) |
| `play.js` | Spielen: Kamera (3rd Person, drinnen steiler über die Wände), Türen und Schreibtisch mit E, Geld-Anzeige, Pause |
| `learn.js` | Lernmodus am Laptop: Fächer → Themen → Runde (10 Aufgaben) → Ergebnis mit Belohnung |
| `stats.js` | Statistiken im Laptop (seit v0.14): Lernzeit/Geld je Tag (Woche/Monat, echtes Datum), Runden je Fach, meistgelerntes Fach; Daten aus `save.log` |
| `items.js` | Gegenstände (`ITEMS`, Symbole als SVG), Inventar im Spielstand (`save.inv`, 36 Plätze: 0–8 Schnellauswahl), `give`, `move`, `has` |
| `inventory.js` | Schnellauswahl (1–9) und Rucksack (I) mit Ziehen und Ablegen |
| `musik.js` | Ghettoblaster: CDs (Gegenstände mit `kind: "cd"`, `src`) abspielen, Lautstärke nach Abstand |
| `save.js` | Spielstand: Geld, Zwischenkonto (`offen`, seit v0.12), Lernstatistik je Fach/Thema |
| `sound.js` | Kassen-Klingel beim Einsammeln (eigene Datei `leaarn/sounds/kasse.mp3` wird bevorzugt, sonst synthetisch), Münz-Tick |
| `faecher/` | **ein Modul je Schulfach** (siehe unten), `index.js` = Liste, Aufgabenformat, Belohnung, Prüfen |
| `faecher/wortliste.js` | Englisch-Vokabeln (seit v0.15): die 2500 häufigsten englischen Wörter, eine Zeile je Wort (`englisch=deutsch=Thema=Wortart`) |
| `faecher/vokabeln.js` | Vokabeltest (seit v0.15): Themengebiete, Schwierigkeit, Prüfen mit Synonymen und Tippfehlern, Belohnung |
| `editor.js` | Map-Editor (Developer Tool aus Poly Racer + Werkzeug **Häuser**) |
| `houseeditor.js` | Haus-Editor (getrennt vom Map-Editor), Bulldozer (B, Treffer über `partAt` → Bauteil-Nummer je Netzstück), Kamera Q/E |
| `charedit.js` | Charakter-Editor (seit v0.13): Name, Alter, Farben Oberteil/Hose/Schuhe/Haare, startet beim ersten Spielstart; Daten in `save.char` |
| `menu.js`, `main.js` | Hauptmenü, Hülle, Zustände (`menu`, `play`, `editor`, `house`, `drive`), CSS |

## Häuser

Ein Haus = Liste von Bauteilen auf einem 1-m-Raster, Etagen à 2,8 m:
`{ v: 1, name, parts: [[id, x, z, r, etage, stufe, spiegeln], …] }`

- Zellen-Teile (Boden, Dach, Möbel) liegen in Zelle (x, z), `r` = Drehung in 90°-Schritten (Möbel: vorne = Seite des Nutzers).
- Kanten-Teile (Wände, Fenster, Türen, Geländer, Giebel) liegen auf einer Zellkante: `r` 0 = Norden (z klein), 1 = Osten, 2 = Süden, 3 = Westen. Türen schwingen in die Zelle, an der sie gesetzt wurden.
- Dachschrägen steigen in Richtung `r` um 1 m je Zelle, `stufe` hebt sie (und Giebel) um je 1 m. Giebel `spiegeln` = steigt andersherum.
- Teile auf Etage 1 liegen auf den Wänden der Etage 0 (Decke/Dach). Wer im Haus auf einer überdachten Zelle steht, sieht alles darüber nicht.
- Fensterglas ist ein eigenes, halb durchsichtiges Netz ohne Schatten (Sonnenlicht fällt ins Zimmer). Ausgeblendete Etagen (drinnen) werfen weiter Schatten (unsichtbares Material, `cutAbove`).
- Interaktionen: `act: "lernen"` (Schreibtisch), Türen automatisch. Kollision: Wände als Strecken, Möbel mit `box`.

Ablauf: Noah baut im Haus-Editor, exportiert `Leaarn_Haus_<Name>.txt` und schickt sie. Claude trägt das Haus in `haeuser.js` ein
(neuer Schlüssel in `HOUSES`), dann steht es im Map-Editor unter „Fertige Häuser“. Häuser aus der Browser-Liste des Haus-Editors
lassen sich im Map-Editor schon vorher als „lokal“ platzieren – ihre Daten werden dann in die Map geschrieben.

Grundstück (seit v0.14): `plot: [[x, z], …]` Zellen im Haus. Auf der Map wird das Rechteck um Grundstück + Haus (+0,5 m) flach gemacht (`plotRect`, `carve`), dort wachsen keine Pflanzen (`world.onPlot`). Ohne Grundstück: Haus + 2 m.

Map-Eintrag: `{ k: "starter" | "lokal", d: Hausdaten (nur lokal), x, z, y, a (Grad), home }`. `home` = Zuhause (Spielstart vor der ersten Tür).

## Fächer und Aufgaben

Je Fach eine Datei in `src/faecher/` (Klasse 5–10, ohne Sport): mathe, deutsch, englisch, fremdsprache (Französisch/Latein/Spanisch),
biologie, chemie, physik, geschichte, erdkunde, politik, wirtschaft, religion (Religion/Ethik), kunst, musik, informatik.

```js
export default {
  id: "mathe", name: L2("Mathe", "Maths"), kurz: "M", farbe: "#ED6A5E",
  spiele: [ … geplante Spielarten … ],
  themen: [
    { id, name: L2(…), klasse: 5, art: "eingabe" | "mc" | "wahrfalsch", anzahl: 10, info: L2(…),
      aufgaben: [ … ]            // feste Liste, davon werden 10 gezogen
      erzeugen(R) { … }          // oder berechnet (R = Zufall)
      geplant: true }            // noch ohne Aufgaben → „bald“
  ]
};
```
Aufgaben: `eingabe` `{ frage, antwort }` (antwort darf eine Liste sein), `mc` `{ frage, optionen, richtig }`, `wahrfalsch` `{ frage, richtig }`,
`farbe` (Kunst, seit v0.11: Farbe per Ziehen mischen, Modus `mischen` = A + ? = Ziel, `raten` = A + B = ?; Darstellung in `learn.js` → `renderFarbe`).
Belohnung je Runde (`belohnung` in `faecher/index.js`): Standard 10/10 = 150 €, 5–9 = 75 €, 1–4 = 25 €, 0 = 5 €.
Eigene Stufen je Thema mit `lohn: [{ ab: 5, euro: 100 }, { ab: 1, euro: 25 }, { ab: 0, euro: 5 }]` (Farb-Spiele, 5 Durchgänge).

Zwischenkonto (seit v0.12): Belohnungen gehen erst aufs Zwischenkonto im Laptop; „Belohnungen einsammeln“ oder Aufstehen bucht sie aufs Spielerkonto (Kassen-Klingel, fliegende Scheine in `play.js` → `collect`).

Color Guesser (seit v0.12, art `guess`): Farbe 4 s zeigen (`zeigen`), dann HSB-Regler; Bewertung 0–10 aus CIEDE2000-Abstand (`rating` in `farben.js`), 5 Runden, `wertung(scores)` im Thema: Summe aufgerundet in Euro + Bonus, wenn alle Runden über 5/7,5/9 (+25/50/125 €, nur höchste Stufe).

Vokabeltest (seit v0.15, art `vokabel`, Englisch, zwei Themen `vokabeln-de` / `vokabeln-en`): Thema mit `setup: true` → vor dem Start Einstellungs-Seite
(Themengebiet `kat`: `alle`, `k:<Thema>`, `w:<Wortart>`; Schwierigkeit `lvl` 0–2 = Drittel des Bereichs nach Häufigkeit; gemerkt in `leaarn-ui-v1` → `vok`).
5 Wörter gleichzeitig, jedes einzeln bestätigen (`renderVok`/`vConfirm` in `learn.js`). Punkte je Wort: 2 richtig, 1 Tippfehler (bis 3 Buchstaben keiner, 4–6 einer, ab 7 zwei;
kein Tippfehler, wenn die Eingabe selbst ein anderes bekanntes Wort ist), Synonym-Bonus fürs zweite Wort nach Komma (+2/+1, nur wenn das erste zählt).
Bei Deutsch → Englisch zählen alle englischen Wörter, die dieselbe deutsche Übersetzung haben (groß → big, large, tall …). Schreibvarianten (`color|colour`) und
männlich/weiblich (Lehrer/Lehrerin) zählen als dasselbe Wort. Gleichlautende Wörter (Hotel, Hand) höchstens eins je Durchgang.
Belohnung `VOK_LOHN`: 0 = 5 €, 1–5 = 25 €, 6–9 = 75 €, 10 = 150 €, über 10 = 250 €, mal 1 / 1,3 / 1,6 je Schwierigkeit (aufgerundet).

Stufen statt Jahrgänge (seit v0.15): `klasse` 5–6 = Basics, 7–8 = Fortgeschritten, 9–10 = Experte, `stufe: "alle"` = Alle Stufen.

Farbmischen (`faecher/farben.js`): Farbe = Pigment-Anteile [Rot, Gelb, Blau, Weiß, Schwarz], Mischen = gleiche Teile.
Rot/Gelb/Blau werden über den RYB-Würfel (wie Malfarben, Itten) in RGB umgerechnet, Weiß/Schwarz danach beigemischt. Neue Malfarben in `PAINTS` eintragen.
Noah liefert Themen (Fach, Klasse, Inhalt), Claude macht daraus Aufgaben und – je nach Fach – eigene Spiele.

## Speicher im Browser

`leaarn-scene-v1` (Map), `leaarn-save-v1` (Geld, Lernstatistik), `leaarn-houses-v1` (Häuser aus dem Haus-Editor),
`leaarn-settings-v1`, `leaarn-ui-v1`, `leaarn-dev` (Editor-Code **616161**).

## Geplant

Laden/Kaufen (bessere Häuser, Möbel), Treppen und begehbare Obergeschosse, Auto kaufen und über die Map fahren (car.js/drive.js stehen bereit,
Kollision Auto ↔ Haus fehlt noch), weitere Fächer und Spielarten, Orte auf der Map mit Aufgaben.
