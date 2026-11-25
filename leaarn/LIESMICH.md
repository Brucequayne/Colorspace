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
| `shop.js` | Supermarkt-Regale (seit v0.17): Einkaufen mit E, Waren = Gegenstände mit `laden` und `preis` in items.js |
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

Sitzen (seit v0.16): Möbel mit `sit: [[x, z, fx, fz, Sitzhöhe], …]` (lokal um die Zellmitte, f = Blickrichtung) bekommen je Platz eine Interaktion `sitzen`
(Stuhl, Sofa mit zwei Plätzen, Bettkante). E setzt hin (`Player.sitDown`, Figur hat dafür Kniegelenke), E oder Laufen steht auf (`Play.stand` sucht die freie Stelle
vor, neben oder hinter dem Sitz). Ein Stuhl bis 1 m vor einem Schreibtisch gehört zum Laptop (`desk`): nicht einzeln benutzbar, beim Öffnen des Laptops setzt man sich darauf.

Möbel-Lager (seit v0.16): Teile mit `act: "lager"` und `lager: "kleidung" | "regal" | "essen"` (Kleiderschrank, Regal, Kühlschrank) haben 64 Plätze (8 × 8),
gespeichert in `leaarn-save-v1` → `lager[Schlüssel]`. Schlüssel = `home:<Bauteil-Nummer>` im Zuhause (bleibt beim Verschieben des Hauses), sonst `<k>@<x>,<z>:<Nummer>`.
Erlaubte Arten in `LAGER` (items.js): Kleiderschrank nur `kind: "kleidung"`, Kühlschrank nur `kind: "essen"`, Regal alles. Muster-Gegenstände: `muetze`, `apfel` (noch nicht erhältlich).

Drehung (Hotfix v0.18): Das Modell dreht mit `rotation.y = −a`, `toLocal`/`toWorld`/`dirToWorld`/`dirToLocal` rechnen passend dazu
(Welt = x·cos a − z·sin a, x·sin a + z·cos a). Map-Editor: Häuser über die Liste „Platzierte Häuser“ wählen, `M` = Verschieben (`moveStart`/`moveDrop`/`moveCancel`).
Starterhaus (v0.18): Noahs Export, Hecke per `gardenParts` (houses.js, auch vom Haus-Editor benutzt) beim Laden erzeugt.

Map-Eintrag: `{ k: "starter" | "lokal", d: Hausdaten (nur lokal), x, z, y, a (Grad), home }`. `home` = Zuhause (Spielstart vor der ersten Tür).

## Straßen (seit v0.19)

Straßentypen in `TYPEN` (road.js): `zwei`, `zwei-gw`, `ein`, `ein-gw`, `rad` – Fahrbahnbreite (2,6 m je Spur), Gehweg beidseitig, Markierungen.
Eine Straße mit `typ` ignoriert Breite/Kerbs/Gehweg der Punkte (alte Straßen ohne `typ` bleiben wie gebaut). Kreuzungen: `prio()` (breiter, dann älter)
gewinnt, die andere lässt dort ihren Belag weg; Markierungen und Gehwege entfallen auf fremder Fahrbahn (`onRoad`). Editor: Einrasten in `endAt`
(Straßenende → Verbinden, gleicher Typ wird eine Straße; Straße → Einmündung `j`), `matchCross` gleicht Kreuzungen in der Höhe an, Griffe nur an offenen Enden.

## Objekte und Gras-Sichtweite (seit v0.19)

`objekte.js`: Assets in `OBJEKTE` (bisher `laterne`), Map-Feld `objs: [{ k, x, z, y, a }]`, Kollision über `Objekte.near`. Für FBX-Modelle liegt
`FBXLoader.js` in `polyracer/lib/addons/loaders/`. Gras/Kleinkram (`sp < 1,2`) liegt in 64-m-Kacheln (`buildTiles`), `cull` blendet Kacheln
außerhalb der Gras-Sichtweite aus (Einstellung `grass` in `leaarn-settings-v1`, 0 = unbegrenzt), der Shader lässt die Halme davor wegschrumpfen.
Im Map-Editor gilt keine Grenze (`veg.limit = false`).

## Straßen: Gehweg (seit v0.16)

Punkte haben zusätzlich `sl`, `sr` (Gehweg links/rechts ab diesem Punkt) und `gs` (0 europäisch = kleine Backsteine, 1 amerikanisch = Betonplatten 1,5 m).
Gehweg = 2,4 m breit inkl. Bordstein, 15 cm über der Fahrbahn, liegt außen neben den Kerbs. Pflaster als eigenes Netz `wmesh` mit zwei im Browser gezeichneten Texturen
(`walkTex` in road.js), Bordstein und Stirnseiten im normalen Straßennetz. Physik: `query` liefert `kind: "walk"`, Gelände-Randstreifen liegt bündig mit dem Gehweg,
auf Brücken rückt die Brüstung an die Gehweg-Außenkante (`face(q, Seite)`). Pflanzen halten Abstand zum Gehweg (`roadDist`).

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

Periodensystem (Chemie, seit v0.19.1, art `pse`, Thema `periodensystem`): Daten und Regeln in `faecher/elemente.js` (118 Elemente mit Name,
Alternativnamen, Masse, Kategorie, Zustand; Periode/Gruppe/Platz und Elektronen pro Schale werden berechnet, `FAKT` = Wissenswertes).
Setup-Seite = erkundbares Periodensystem (`renderPseSetup`, Klick klappt die Infokarte neben dem Element auf), dann 5 Runden Symbol → Name
(`renderPseQ`/`pCheck`/`pNext`), Punkte 2/1/0 wie beim Vokabeltest, Schwierigkeit in `STUFEN_PSE` (gemerkt in `leaarn-ui-v1` → `pse`).

Schalenmodelle bauen (Chemie, seit v0.19.2, art `schale`, Thema `schalenmodell`): 2 Elemente, Modell `{ p, n, sh }` bauen
(`renderSchaleQ`, `sDraw`, `sBtn`, `sEl`; Rechtsklick auf eine Schale = Elektron weg), Wertung `schaleBewerte` in elemente.js
(je 1 Punkt: Protonen, Neutronen = gerundete Masse − Z, Schalen = Periode, Elektronen gesamt, Verteilung). Ausklappbares Periodensystem `sPanel`
(Element gewählt → nur dessen Infos, ohne Schalenverteilung). Stufen `STUFEN_SCHALE`, gemerkt in `leaarn-ui-v1` → `schale`.

Stufen statt Jahrgänge (seit v0.15): `klasse` 5–6 = Basics, 7–8 = Fortgeschritten, 9–10 = Experte, `stufe: "alle"` = Alle Stufen.

Farbmischen (`faecher/farben.js`): Farbe = Pigment-Anteile [Rot, Gelb, Blau, Weiß, Schwarz], Mischen = gleiche Teile.
Rot/Gelb/Blau werden über den RYB-Würfel (wie Malfarben, Itten) in RGB umgerechnet, Weiß/Schwarz danach beigemischt. Neue Malfarben in `PAINTS` eintragen.
Noah liefert Themen (Fach, Klasse, Inhalt), Claude macht daraus Aufgaben und – je nach Fach – eigene Spiele.

## Fokus (seit v0.17)

`leaarn-save-v1` → `fokus` (0…1). `Play.focusTick`: lädt nur, solange im Laptop eine Lern-Challenge läuft (`learn.view === "quiz"`), mit `1/300` je Sekunde
(leer → voll in 5 Min.), sinkt in der offenen Welt mit `1/600` je Sekunde (voll → leer in 10 Min.), steht im Laptop-Menü und in der Pause. Gespeichert etwa alle 5 s.
Voller Fokus beim Abschluss einer Runde: Belohnung × 1,15 aufgerundet (`Learn.finish`, `q.boost`). Werte in `FOKUS` (save.js).

## Garten und Supermarkt (seit v0.17)

Zaun (`zaun`) und Hecke (`hecke`) sind Kanten-Teile (`fence`/`hedge`), zählen nicht zur Grundfläche (Drehpunkt des Hauses bleibt gleich), aber zur Kollision
(`HouseInst.reach`, Grenzen `min2`/`max2`). `HouseEditor.autoGarden(id)`: Rand des Grundstücks (Etage 0), ohne Kanten mit Hauswand, Eingang 2 m vor der ersten Tür.
Supermarkt-Teile mit `act: "laden"` und `laden: "tiefkuehl" | "obst" | "allg"` (Gefriertruhe, Obstregal, Warenregal) öffnen `Shop` (shop.js).

## Speicher im Browser

`leaarn-scene-v1` (Map), `leaarn-save-v1` (Geld, Lernstatistik), `leaarn-houses-v1` (Häuser aus dem Haus-Editor),
`leaarn-settings-v1`, `leaarn-ui-v1`, `leaarn-dev` (Editor-Code **616161**).

## Geplant

Laden/Kaufen (bessere Häuser, Möbel), Treppen und begehbare Obergeschosse, Auto kaufen und über die Map fahren (car.js/drive.js stehen bereit,
Kollision Auto ↔ Haus fehlt noch), weitere Fächer und Spielarten, Orte auf der Map mit Aufgaben.
