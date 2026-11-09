/* Flughafen 0.4 – ein Aufbauspiel für Color Space.
   Einbindung: flughafen.js per script-Tag laden, dann Flughafen.mount(element, "de" | "en")
   und Flughafen.unmount() beim Verlassen der Seite. Der Spielstand liegt nur lokal im Browser. */
(function () {
  "use strict";

  var KEY = "flughafen-v3";
  var VERSION = "0.69";
  var RW_W = 22, TW_W = 14, RD_W = 16, SL_W = 9, RVW = 28;   // RVW: nur gezeichnete Pistenbreite
  var DIVERT = 60;
  var SIZE = { stand: [64, 66], term: [124, 46], tower: [30, 30], fire: [52, 38], hangar: [84, 62], deck: [72, 38], park: [72, 48], bus: [44, 22], cab: [62, 22], hotels: [50, 34], hotel: [70, 44], hotell: [96, 74], tank: [44, 44] };
  var DEG = Math.PI / 180, STEP = 15 * DEG;
  var M_PX = 6, RW_MIN = 250, RW_MAX = 760;   // 1 Pixel Piste = 6 m; Mindestlänge 1.500 m

  // ---------- Texte ----------
  function L2(de, en) { return { de: de, en: en }; }
  var TX = {
    title: L2("Flughafen", "Airport"),
    intro: L2("Bau deinen Flughafen von Grund auf. Leg zuerst die Piste, zieh Rollwege, setz Parkpositionen und Terminals daran. Die Flugzeuge kommen von selbst, jede Landung und jeder Start bringt Geld.",
              "Build your airport from scratch. Lay down the runway first, draw taxiways, then add stands and terminals. Aircraft arrive on their own, and every landing and take-off earns money."),
    money: L2("Kasse", "Cash"), rep: L2("Ruf", "Reputation"), moves: L2("Bewegungen", "Movements"),
    pax: L2("Passagiere", "Passengers"), hold: L2("Warteschleife", "Holding"),
    pause: L2("Pause", "Pause"), play: L2("Weiter", "Resume"), speed: L2("Tempo", "Speed"),
    ranks: { de: ["Grüne Wiese", "Flugplatz", "Regionalflughafen", "Verkehrsflughafen", "Internationales Drehkreuz"],
             en: ["Empty field", "Airfield", "Regional airport", "Commercial airport", "International hub"] },
    conn: L2("{a} von {b} Positionen angebunden", "{a} of {b} stands connected"),
    built: L2("gebaut", "built"), poor: L2("Dafür reicht das Geld noch nicht.", "Not enough cash yet."),
    blocked: L2("Hier ist kein Platz.", "There is no room here."),
    divert: L2("weicht aus: zu lange in der Warteschleife.", "diverts: held too long."),
    tip: L2("Tipp: Ist die Piste der Engpass, helfen Tower, Instrumentenlandesystem, schräge Abrollwege und eine zweite Piste.", "Tip: if the runway is the bottleneck, a tower, an ILS, angled exits and a second runway help."),
    welcome: L2("Leg los: Wähle unten im Baumenü „Piste“ und setz sie auf die Wiese.", "Get started: pick “Runway” in the build menu below and place it on the field."),
    maint: L2("Wartung", "Maintenance"),
    unload: L2("Aussteigen", "Unloading"), board: L2("Einsteigen", "Boarding"), clean: L2("Reinigung", "Cleaning"),
    inTerm: L2("{n} Fluggäste", "{n} passengers"), waiting: L2("{n} wartend", "{n} waiting"),
    termDep: L2("Warten auf den Abflug: {n}", "Waiting to depart: {n}"), termArr: L2("Angekommen, auf dem Weg nach draußen: {n}", "Arrived, heading out: {n}"),
    stopInfo: L2("Wartende Fahrgäste: {n} · Bus fasst 50", "Waiting riders: {n} · bus holds 50"),
    lotInfo: L2("Belegt: {a} von {b} Plätzen · 5 € pro Sekunde Parkzeit", "Occupied: {a} of {b} spaces · €5 per second parked"), lotFull: L2("voll", "full"),
    noRoadTerm: L2("Ohne Straße am Terminal kommen die Fluggäste zu Fuß, Busse und Autos fahren erst mit Straße.", "Without a road at the terminal, passengers walk in; buses and cars need a road."),
    howH: L2("So funktioniert’s", "How it works"),
    how1: L2("Bauen: Werkzeug im Baumenü unten wählen, mit der Maus platzieren, Klick zum Bauen. Q und E drehen stufenlos, mit gedrückter Umschalttaste in 15°-Schritten. Die Piste ziehst du mit zwei Klicks: Anfang setzen, dann Richtung und Länge. Je länger, desto teurer, aber desto größere Flugzeuge können landen. Danach zeichnest du Anflug- und Abflugroute. Rollwege und Straßen zieht man Stück für Stück mit Klicks, Rechtsklick oder Esc beendet. Mit O werden neue Stücke zur Einbahn, ein Pfeil in der Mittellinie zeigt die Richtung.",
              "Building: pick a tool in the build menu below, move it with the mouse, click to build. Q and E rotate freely, with Shift in 15° steps. The runway takes two clicks: set the start, then direction and length. Longer costs more but lets bigger aircraft land. Then you draw the approach and departure routes. Taxiways and roads are drawn piece by piece with clicks; right-click or Esc ends the line. Press O to make new pieces one-way, an arrow in the centre line shows the direction."),
    how2: L2("Karte: Ziehen auf freier Fläche oder mit rechter Maustaste verschiebt, das Mausrad zoomt, WASD und Pfeiltasten gehen auch. Ein Klick auf etwas Gebautes zeigt Infos, Ausbaustufen und „Abreißen“.",
              "Map: drag on open ground or with the right mouse button to pan, the mouse wheel zooms, WASD and arrow keys work too. Click anything you built for details, upgrades and “Demolish”."),
    how5: L2("Fluggäste: Ein Flugzeug fasst 120 bis 400 Personen, ein Bus 50, ein Auto oder Taxi 1 bis 4. Ankommende verlassen den Flughafen mit Bus, Auto oder Taxi. Ein- und ausgestiegen wird nur, solange das Flugzeug an Gate oder Parkposition steht. Autos und Busse kommen über die Landstraße, die quer über die Karte läuft. Verbinde deine Straßen mit ihr. Autos fahren nicht durcheinander durch, sie stellen sich an, und zu enge Straßen stauen sich. Einbahnstraßen bleiben zweispurig: rechts wird gefahren, links ist ein Streifen mit Schrägparkplätzen, die wie ein Parkplatz Geld bringen.",
              "Passengers: an aircraft carries 120 to 400 people, a bus 50, a car or taxi 1 to 4. Arrivals leave the airport by bus, car or taxi. Passengers only board and leave while the aircraft is docked at a gate or stand. Cars and buses come in on the country road that crosses the map, so connect your roads to it. Cars don't drive through each other: they queue, and narrow roads jam. One-way roads keep two lanes: traffic uses the right one, the left one becomes angled parking that earns money like a car park."),
    how3: L2("Flugzeuge landen in Pfeilrichtung und verlassen die Piste über deine Rollwege. Eine Parkposition wird nur angeflogen, wenn ein Rollweg direkt davor liegt und Hin- und Rückweg zur Piste bestehen. Flugzeuge weichen einander aus und warten, wenn der Weg blockiert ist. Steht eine Position mit dem Rücken an einem Terminal, kann sie ein Gate bekommen.",
              "Aircraft land in the direction of the arrow and leave the runway via your taxiways. A stand is only used when a taxiway runs right in front of it with a way there from the runway and back. Aircraft keep their distance and wait when the way is blocked. If a stand's back touches a terminal, it can get a gate."),
    how4: L2("Der Spielstand wird nur in deinem Browser gespeichert.", "Your progress is saved only in your browser."),
    reset: L2("Neues Spiel", "New game"), resetQ: L2("Wirklich alles löschen?", "Really delete everything?"),
    done: L2("Ausgebaut", "Complete"), maxed: L2("Maximum erreicht", "Maximum reached"), lvl: L2("Stufe", "Level"),
    needRw: L2("Erst eine Piste bauen", "Build a runway first"),
    needFire: L2("Braucht eine Feuerwehr", "Needs a fire station"),
    needFire2: L2("Braucht Feuerwehr Stufe 2", "Needs fire station level 2"),
    needExt: L2("Braucht die Pistenverlängerung", "Needs the runway extension"),
    needTower: L2("Braucht einen Tower", "Needs a control tower"),
    needTower2: L2("Braucht Tower Stufe 2", "Needs tower level 2"),
    need6: L2("Ab 6 angebundenen Positionen", "From 6 connected stands"),
    needRoad: L2("Braucht eine Straße am Terminal", "Needs a road at the terminal"),
    needGateTerm: L2("Die Position muss mit dem Rücken an einem Terminal stehen.", "The stand's back must touch a terminal."),
    once: L2("Schon gebaut", "Already built"),
    grp: { air: L2("Rollfeld", "Airside"), term: L2("Terminal", "Terminal"), land: L2("Landseite", "Landside"), ops: L2("Betrieb", "Operations"), up: L2("Ausbau", "Upgrades") },
    perM: L2("{p} pro 10 m", "{p} per 10 m"),
    selNone: L2("Klick auf etwas Gebautes, um es auszuwählen.", "Click something you built to select it."),
    flip: L2("Landerichtung umkehren", "Reverse landing direction"),
    del: L2("Abreißen", "Demolish"), delQ: L2("Wirklich abreißen? (+{p})", "Really demolish? (+{p})"),
    delBusy: L2("Das wird gerade benutzt. Warte, bis es frei ist.", "That is in use right now. Wait until it is free."),
    gate: L2("Gate bauen", "Build gate"), heavy: L2("Großraum-Position", "Widebody stand"),
    up2: L2("Auf Stufe {n} ausbauen", "Upgrade to level {n}"),
    stConn: L2("Mit der Piste verbunden", "Connected to the runway"),
    stNoConn: L2("Nicht angebunden: Rollweg direkt davor ziehen und mit der Piste verbinden.", "Not connected: draw a taxiway right in front of it and link it to the runway."),
    stGate: L2("Mit Gate", "With gate"), stBus: L2("Busabfertigung", "Served by bus"),
    stRoad: L2("An der Straße", "On the road"), stNoRoad: L2("Noch ohne Straßenanschluss", "Not on a road yet"),
    rwArr: L2("Landungen", "Landings"), rwDep: L2("Starts", "Take-offs"), rwBoth: L2("Landungen und Starts", "Landings and take-offs"),
    zoomIn: L2("Hineinzoomen", "Zoom in"), zoomOut: L2("Herauszoomen", "Zoom out"),
    rotL: L2("Nach links drehen (Q)", "Rotate left (Q)"), rotR: L2("Nach rechts drehen (E)", "Rotate right (E)"),
    taxiInfo: L2("Wartende Fluggäste: {n} · Taxis am Stand: {k}", "Waiting passengers: {n} · taxis at the rank: {k}"),
    termOut: L2("Auf dem Weg nach draußen: {b} Bus, {c} Auto, {x} Taxi", "Heading out: {b} bus, {c} car, {x} taxi"),
    stripInfo: L2("Schrägparkplätze: {a} von {b} belegt", "Angled parking: {a} of {b} taken"),
    owOn: L2("Einbahn", "One-way"), owOff: L2("Beide Richtungen", "Two-way"), owRev: L2("Richtung umkehren", "Reverse direction"),
    owInfo: L2("Einbahn in Pfeilrichtung. Bei Straßen wird die linke Spur zum Streifen mit Schrägparkplätzen.", "One-way in arrow direction. On roads the left lane becomes a strip of angled parking."), twInfo: L2("In beide Richtungen befahrbar", "Usable in both directions"),
    owTool: L2("Richtung für neue Stücke (Taste O): beide Richtungen, Einbahn mit Parkstreifen, Einbahn einspurig", "Direction for new pieces (key O): two-way, one-way with parking, one-way single lane"),
    owPk: L2("Einbahn mit Parkstreifen", "One-way with parking"), owSl: L2("Einbahn einspurig", "One-way single lane"),
    cvTool: L2("Kurve (Taste C)", "Curve (key C)"), cvOn: L2("Kurve an", "Curve on"),
    vegName: L2("Vegetation", "Vegetation"),
    owBus: L2("Einbahn mit Busspur", "One-way with bus lane"), fuel: L2("Kerosin", "Fuel"), fprice: L2("Kerosinpreis", "Fuel price"),
    fpTitle: L2("Kerosinpreis", "Fuel price"), fpUnit: L2("je Einheit", "per unit"), fpOpen: L2("Preisverlauf öffnen", "Open price chart"),
    fpSell: L2("Verkaufspreis an Airlines", "Selling price to airlines"), fpBuy: L2("Einkauf", "Buying"), fpSales: L2("Verkauft in den letzten 15 Minuten: {u} Einheiten · {e}", "Sold in the last 15 minutes: {u} units · {e}"),
    fpLog: L2("Zuletzt getankt", "Last refuelled"), fpNone: L2("Noch kein Flugzeug betankt", "No aircraft refuelled yet"), noFuel: L2("Kein Kerosin", "No fuel"),
    fpLeg: L2("Kauf|Verkauf|Betankung", "Buy|Sell|Refuel"),
    fpSz: L2("klein|mittel|groß", "small|medium|large"), fpFill: L2("Volltanken jetzt", "Full refill now"), fpRange: L2("Letzte 15 Minuten", "Last 15 minutes"),
    fpNoTank: L2("Noch kein Kerosintank gebaut", "No fuel tank built yet"), fpLo: L2("Tief", "Low"), fpHi: L2("Hoch", "High"),
    fuelFill: L2("Auffüllen", "Refill"), fuelFull: L2("Tanks sind voll", "Tanks are full"), fuelEmpty: L2("Kein Kerosin: Flugbetrieb eingestellt. Tanks auffüllen!", "Out of fuel: flight operations stopped. Refill the tanks!"),
    fuelInfo: L2("Lager des Flughafens: {p} %", "Airport stock: {p} %"), fuelBought: L2("Kerosin gekauft", "Fuel bought"), fuelSold: L2("Kerosin", "Fuel"),
    dozer: L2("Abriss", "Bulldozer"), dozerT: L2("Abriss-Werkzeug (B)", "Bulldozer (B)"), mvBtn: L2("Versetzen", "Relocate"), mvName: L2("Versetzen", "Relocate"),
    mvDone: L2("Versetzt", "Relocated"), mvBusy: L2("Gerade belegt, später versetzen", "In use, relocate later"),
    rate: L2("Umsatz/Min", "Revenue/min"), rateHint: L2("Umsatz der letzten 60 Sekunden", "Revenue of the last 60 seconds"),
    finOpen: L2("Finanzbericht öffnen", "Open financial report"), finTitle: L2("Finanzbericht", "Financial report"),
    finSub: L2("Umsatz je Bereich in € pro Minute, letzte 15 Minuten", "Revenue by area in € per minute, last 15 minutes"),
    finTot: L2("Gesamt", "Total"), finSum: L2("Umsatz in 15 Minuten: {e}", "Revenue in 15 minutes: {e}"), finEmpty: L2("Noch keine Einnahmen", "No revenue yet"),
    finCat: L2("Flugbetrieb|Fluggastentgelte|Kerosin an Airlines|Kerosinhandel|Shops|Hotels|Parken, Bus, Taxi|Wartung", "Flight operations|Passenger fees|Fuel to airlines|Fuel trading|Shops|Hotels|Parking, bus, taxi|Maintenance"),
    crisis: L2("Ölkrise", "Oil crisis"), crisisOn: L2("Ölkrise! Der Kerosinpreis steigt stark und bleibt eine Weile hoch.", "Oil crisis! The fuel price rises sharply and stays high for a while."),
    crisisOff: L2("Die Ölkrise ist vorbei, der Kerosinpreis beruhigt sich.", "The oil crisis is over, the fuel price is calming down."), crisisNow: L2("Ölkrise läuft", "Oil crisis ongoing"),
    wx: L2("Wetter", "Weather"), wxOpen: L2("Vorhersage öffnen", "Open forecast"), wxTitle: L2("Wetter und Vorhersage", "Weather and forecast"),
    wxSun: L2("Sonnig", "Sunny"), wxPart: L2("Leicht bewölkt", "Partly cloudy"), wxCloud: L2("Bewölkt", "Cloudy"), wxStorm: L2("Gewitter", "Thunderstorm"),
    wxToday: L2("Heute", "Today"), wxDay: L2("Tag +{n}", "Day +{n}"), wxRisk: L2("Gewitter {p} %", "Storm {p} %"),
    wxNote: L2("Vorhersagen sind Schätzungen: je weiter weg, desto ungenauer. Bei Gewitter starten keine Flugzeuge.", "Forecasts are estimates: the further ahead, the less accurate. No take-offs during thunderstorms."),
    stocks: L2("Börse", "Stocks"), smOpen: L2("Aktienmarkt öffnen", "Open stock market"), smTitle: L2("Aktienmarkt", "Stock market"),
    smDepot: L2("Depotwert {v} · Gewinn/Verlust {g}", "Portfolio {v} · profit/loss {g}"), smAir: L2("Airline", "Airline"), smOil: L2("Ölfirma", "Oil company"),
    smHold: L2("Bestand {n} Stk. · Ø Kaufkurs {a} · Wert {v}", "Holding {n} shares · avg. price {a} · value {v}"), smNone: L2("Keine Aktien im Bestand", "No shares held"),
    smBuyD: L2("Kauf: {n} Aktien zu je {p}", "Buying {n} shares at {p} each"), smSellD: L2("Verkauf: {n} Aktien zu je {p}", "Selling {n} shares at {p} each"),
    smFee: L2("Verkauf zum Kurs abzüglich 1 %", "Sales pay the price minus 1%"), smShares: L2("{n} Stk.", "{n} sh."), smDone: L2("Aktien verkauft", "Shares sold"), smBought: L2("Aktien gekauft", "Shares bought"),
    smHint: L2("Airlines leiden unter hohem Ölpreis, Ölfirmen profitieren davon.", "Airlines suffer from high oil prices, oil companies profit from them."),
    storm: L2("Unwetter", "Severe storm"), stormOn: L2("Unwetter zieht auf: Starts sind ausgesetzt, bis es vorbei ist.", "A severe storm is coming: take-offs are suspended until it passes."),
    stormOff: L2("Das Unwetter ist abgezogen, Starts sind wieder frei.", "The storm has passed, take-offs are cleared again."), stormBan: L2("UNWETTER · Starts ausgesetzt", "SEVERE STORM · take-offs suspended"),
    crash: L2("Absturz! {cs} ist verunglückt. Flugbetrieb eingestellt, bis das Wrack geräumt ist.", "Crash! {cs} has crashed. Flight operations suspended until the wreck is cleared."),
    wreck: L2("Wrack", "Wreck"), wreckInfo: L2("{cs} · Flugbetrieb eingestellt", "{cs} · flight operations suspended"), wreckClear: L2("Wrack räumen", "Clear wreck"),
    wreckBusy: L2("Räumung läuft · noch {s}", "Clearing in progress · {s} left"), wreckDone: L2("Absturzstelle geräumt und sicher. Flugbetrieb läuft wieder.", "Crash site cleared and safe. Flight operations resume."),
    wreckBan: L2("ABSTURZ · Flugbetrieb eingestellt", "CRASH · flight operations suspended"), wreckBan2: L2("RÄUMUNG · noch {s}", "CLEARING · {s} left"), wreckHint: L2("Auf das Wrack klicken und räumen", "Click the wreck and clear it"),
    crashMk: L2("Absturz", "Crash"),
    wideOk: L2("Großraumjets können hier parken", "Widebody jets can park here"), wideNo: L2("Keine Großraumjets: braucht eine Piste ab 3.000 m mit Weg hierher und zurück", "No widebodies: needs a runway of 3,000 m or more with a route here and back"),
    trBuy: L2("Kaufen", "Buy"), trSell: L2("Verkaufen", "Sell"), trMove: L2("Regler verschieben zum Handeln", "Move the slider to trade"),
    trBuyD: L2("Einkauf am Markt: {a} → {b}", "Buying on the market: {a} → {b}"), trSellD: L2("Rückverkauf an den Markt: {a} → {b}", "Selling back to the market: {a} → {b}"),
    trNow: L2("Füllstand jetzt {p}", "Fill level now {p}"), trPoor: L2("Nicht genug Geld", "Not enough money"),
    trPrice: L2("Markt: Einkauf {b} · Rückkauf {s} je Einheit", "Market: buy {b} · sell back {s} per unit"),
    trDone: L2("Kerosin verkauft", "Fuel sold"),
    fuelHint: L2("Klick füllt alle Tanks auf", "Click to refill all tanks"),
    tMod: L2("Modernisieren", "Modernise"), tShop: L2("Shops einbauen", "Add shops"), tLng: L2("Lounge einbauen", "Add lounge"),
    tLvl2: L2("Modernes Terminal", "Modern terminal"), tHas: L2("Ausstattung: {x}", "Fitted: {x}"), tNone: L2("keine", "none"),
    shopsW: L2("Shops", "Shops"), lngW: L2("Lounge", "Lounge"), hotelInfo: L2("Gäste: {n} von {k}", "Guests: {n} of {k}"), hotelPay: L2("Hotel", "Hotel"),
    hwName: L2("Landstraße", "Country road"),
    hwInfo: L2("Von hier kommen alle Autos und Busse. Verbinde deine Straßen mit ihr.", "All cars and buses come from here. Connect your roads to it."),
    noHw: L2("Nicht mit der Landstraße verbunden", "Not connected to the country road"),
    rwLen: L2("Länge {m} m", "Length {m} m"), rwShort: L2("Mindestens 1.500 m", "At least 1,500 m"),
    rwFor: L2("Geeignet für: {c}", "Suitable for: {c}"),
    cls: { p: L2("Turboprops", "turboprops"), n: L2("Mittelstrecke", "narrowbodies"), w: L2("Langstrecke", "widebodies") },
    rwBuilt: L2("Piste gebaut. Zeichne jetzt die Anflugroute.", "Runway built. Now draw the approach route."),
    appDone: L2("Anflugroute gespeichert. Jetzt die Abflugroute.", "Approach saved. Now the departure route."),
    depDone: L2("Routen gespeichert. Jetzt Rollwege von der Piste wegziehen.", "Routes saved. Now draw taxiways off the runway."),
    appNew: L2("Anflugroute neu zeichnen", "Redraw approach"), depNew: L2("Abflugroute neu zeichnen", "Redraw departure"),
    routes: L2("Anflug und Abflug folgen deinen Routen.", "Approaches and departures follow your routes."),
    jam: L2("Stau auf dem Rollfeld: Einbahn-Rollwege helfen, dass sich Flugzeuge nicht gegenüberstehen.", "Gridlock on the apron: one-way taxiways keep aircraft from meeting head-on."),
    connIn: L2("Nur Hinweg angebunden: es fehlt ein Rückweg zur Piste.", "Only reachable one way: there is no way back to the runway."),
    hint: {
      none: L2("Ziehen verschiebt die Karte, Mausrad zoomt.", "Drag to pan, mouse wheel to zoom."),
      rect: L2("Klick baut · Q/E drehen, Umschalt für 15° · Esc beendet", "Click to build · Q/E rotate, Shift for 15° · Esc to stop"),
      dozer: L2("Klick reißt ab, Ziehen räumt alles unter dem Cursor (außer Pisten) · halbe Baukosten zurück · Esc beendet", "Click to demolish, drag to clear everything under the cursor (except runways) · half the cost back · Esc to stop"),
      move: L2("Neuen Platz anklicken · Q/E drehen · Esc bricht ab", "Click the new spot · Q/E rotate · Esc to cancel"),
      line0: L2("Klick setzt den Anfang · rastet an Piste und Rollwegen ein", "Click to start · snaps to runway and taxiways"),
      line1: L2("Klick setzt das Ende und zieht weiter · Umschalt für 15° · Rechtsklick oder Esc beendet", "Click to end and continue · Shift for 15° · right-click or Esc to stop"),
      road0: L2("Klick setzt den Anfang der Straße", "Click to start the road"),
      cv1: L2("Kurve: Klick setzt das Ende", "Curve: click to set the end"),
      cv2: L2("Kurve: Maus biegt die Kurve · Klick baut · Rechtsklick oder Esc setzt das Ende neu", "Curve: the mouse bends the curve · click to build · right-click or Esc to reset the end"),
      brush: L2("Ziehen pflanzt Bäume und Büsche · Umschalt + Ziehen entfernt · Esc beendet", "Drag to plant trees and bushes · Shift + drag removes · Esc to stop"),
      apply: L2("Klick auf eine Parkposition · Esc beendet", "Click a stand · Esc to stop"),
      rw0: L2("Klick setzt den Pistenanfang, hier setzen die Flugzeuge auf", "Click to set the runway start, aircraft touch down here"),
      rw1: L2("Maus bestimmt Richtung und Länge · Klick baut · Umschalt für 15° · Esc bricht ab", "Mouse sets direction and length · click to build · Shift for 15° · Esc cancels"),
      app: L2("Anflugroute: Wegpunkte von weit draußen Richtung Piste klicken · Enter oder Rechtsklick fertig · Esc: gerader Anflug", "Approach: click waypoints from far out towards the runway · Enter or right-click to finish · Esc: straight-in"),
      dep: L2("Abflugroute: Wegpunkte von der Piste nach draußen klicken · Enter oder Rechtsklick fertig · Esc: gerader Abflug", "Departure: click waypoints from the runway outwards · Enter or right-click to finish · Esc: straight out")
    }
  };

  var TYPES = {
    p: { cap: 120, rev: 20000, turn: 18, len: 14.5, span: 15.5, swp: 3, prop: true, roll: 90, need: 250 },
    n: { cap: 190, rev: 40000, turn: 26, len: 28, span: 26.5, swp: 27, roll: 140, need: 350 },
    w: { cap: 400, rev: 90000, turn: 40, len: 38, span: 36.5, swp: 32, roll: 200, heavy: true, need: 500 }
  };
  var PAXFEE = 30, SHOP = 15, PARKFEE = 5, BUSFARE = 4, TAXIFEE = 18;   // Euro pro Fluggast, pro Sekunde Parken, pro Fahrgast, pro Taxi
  var AIRLINES = [ // neutrale Charter- und Regionalflieger: weiß mit grauem Heck
    { c: "SOY", col: "#8C96A0" }, { c: "WOK", col: "#6B7580" }, { c: "TFU", col: "#A3ACB5" },
    { c: "MSO", col: "#5C6670" }, { c: "UMA", col: "#959DA6" }, { c: "KOI", col: "#7D8794" }, { c: "NRI", col: "#4F5963" }
  ];
  // Die fünf großen Airlines: farbiger Rumpf und Leitwerk, an der Börse gehandelt
  var CARRIERS = [
    { id: "FMR", n: "Flymore", c: "FMR", col: "#C8372D", dk: "#8E241D" },
    { id: "BOT", n: "Bot Air", c: "BOT", col: "#2F6FB8", dk: "#1F4C80" },
    { id: "SLK", n: "Slickair", c: "SLK", col: "#2E8B57", dk: "#1E5E3A" },
    { id: "LFH", n: "Lufthoheit", c: "LFH", col: "#E0B323", dk: "#9C7C14" },
    { id: "NFK", n: "Nachtfalke", c: "NFK", col: "#7B4BA8", dk: "#53317A" }
  ];

  // ---------- Zustand ----------
  var G = null, R = null, V = null, NET = null, lang = "de";

  function fresh() {
    var g = { v: 3, v4: 1, eco: 1, money: 25000000, rep: 50, nid: 1, mods: [],
      up: { rwy: 0, ils: 0, gh: 0, ext: 0 }, st: { moves: 0, pax: 0, earned: 0, div: 0 }, veg: [], pave: {}, fuel: 0, fpt: 0, fps: Math.random() * 1000 };
    addHighway(g, 430);
    return g;
  }
  // Landstraße quer über die Karte, leicht geschwungen. Von ihren Enden kommen alle Fahrzeuge.
  function addHighway(g, y0, xa, xb) {
    xa = xa === undefined ? -1900 : xa; xb = xb === undefined ? 1900 : xb;
    var n = Math.max(6, Math.round((xb - xa) / 420)), pts = [];
    for (var i = 0; i <= n; i++) { var x = xa + (xb - xa) * i / n; pts.push({ x: x, y: y0 + Math.sin(i * 1.3) * 26 + Math.sin(i * 0.55 + 1) * 40 }); }
    for (var k = 0; k < n; k++) g.mods.push({ t: "road", hw: 1, id: g.nid++, paid: 0, x1: pts[k].x, y1: pts[k].y, x2: pts[k + 1].x, y2: pts[k + 1].y });
  }
  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY) || "null");
      if (s && s.v === 3 && s.mods) {
        if (!s.eco) { // Spielstand aus 0.2: auf die neuen Zahlen umstellen
          s.eco = 1; s.money = Math.max(0, s.money - 8000) + 25000000;
          G = s; s.mods.forEach(function (m) { m.paid = priceOf(m); });
        }
        if (!s.v4) { // Spielstand aus 0.3: Pistenlänge, Landstraße
          s.v4 = 1;
          s.mods.forEach(function (m) { if (m.t === "runway" && !m.len) m.len = s.up.rwy ? 600 : 440; });
          var y1 = 0, xa = -1900, xb = 1900;
          s.mods.forEach(function (m) { var ys = m.y2 !== undefined ? [m.y1, m.y2] : [m.y + 60]; ys.forEach(function (y) { y1 = Math.max(y1, y); }); var xs = m.x2 !== undefined ? [m.x1, m.x2] : [m.x]; xs.forEach(function (x) { xa = Math.min(xa, x - 1500); xb = Math.max(xb, x + 1500); }); });
          addHighway(s, y1 + 300, xa, xb);
          s.legacyRoads = true;
        }
        if (!s.veg) s.veg = []; if (!s.pave) s.pave = {}; if (s.fuel === undefined) s.fuel = 0; if (!s.fpt) s.fpt = 0; if (s.fps === undefined) s.fps = Math.random() * 1000;
        return s;
      }
    } catch (e) {}
    return fresh();
  }
  function save() { try { if (G) localStorage.setItem(KEY, JSON.stringify(G)); } catch (e) {} }
  function runtime() {
    return { planes: [], holdQ: [], q: {}, occ: {}, rw: {}, spawnT: 4, jamT: 0, bays: {}, tArrTaxi: 0, depTaxi: 0, fx: [], veh: [], spots: {}, busT: {}, stopW: {}, tDep: 0, tArrBus: 0, tArrCar: 0, tArrWalk: 0, walkIn: 0, depBus: 0, depCarQ: [], pickRes: 0, accW: 0, accS: 0, spawnCar: 0, speed: 1, paused: false,
      id: 0, saveT: 0, msgT: 0, first: true, hangarT: 0, hangarType: "n", visitors: 0, clock: 0, hotel: {}, hotelQ: 0, apron: [], shopAcc: 0, shopT: 0 };
  }

  function t(k) { return TX[k][lang]; }
  function fmt(s, o) { return s.replace(/\{(\w+)\}/g, function (_, k) { return o[k]; }); }
  function loc() { return lang === "de" ? "de-DE" : "en-GB"; }
  function eur(v) { var n = Math.round(v).toLocaleString(loc()); return lang === "de" ? n + " €" : "€" + n; }
  function eurS(v) {
    var a = Math.abs(v);
    if (a < 1e6) return eur(v);
    var n = (v / 1e6).toLocaleString(loc(), { maximumFractionDigits: a >= 1e8 ? 0 : a >= 1e7 ? 1 : 2 });
    return lang === "de" ? n + " Mio. €" : "€" + n + "M";
  }
  function round(v) { return Math.round(v / 50) * 50; }
  function mods(type) { return G.mods.filter(function (m) { return m.t === type; }); }
  var HOTELS = { hotels: { cap: 50, sh: 0.05, cost: 900000 }, hotel: { cap: 100, sh: 0.08, cost: 1600000 }, hotell: { cap: 180, sh: 0.12, cost: 2400000 } };
  function isHotel(tp) { return !!HOTELS[tp]; }
  function hotels() { return G.mods.filter(function (m) { return isHotel(m.t); }); }
  function one(type) { return mods(type)[0] || null; }
  function byId(id) { for (var i = 0; i < G.mods.length; i++) if (G.mods[i].id === id) return G.mods[i]; return null; }
  function rwLen(m) { return (m && m.len) || 440; }
  function rwCost(len, n) { return round((3000000 + len * M_PX * 2000) * (n ? 2 : 1) / 1000) * 1000; }
  function rwMeters(len) { return Math.round(len * M_PX / 10) * 10; }
  function rwFits(m, type) { return rwLen(m) >= TYPES[type].need; }
  function rwClasses(len) { return ["p", "n", "w"].filter(function (k) { return len >= TYPES[k].need; }).map(function (k) { return TX.cls[k][lang]; }).join(", "); }

  // ---------- Geometrie ----------
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function size(m) { return m.t === "runway" ? [rwLen(m), RW_W] : SIZE[m.t]; }
  function axes(a) { return { ux: Math.cos(a), uy: Math.sin(a), vx: -Math.sin(a), vy: Math.cos(a) }; }
  // Rechteck: Mitte, Winkel, halbe Breite/Tiefe
  function foot(m) {
    if (m.t === "taxi" || m.t === "road") {
      var l = Math.hypot(m.x2 - m.x1, m.y2 - m.y1);
      var w = m.t === "taxi" ? TW_W : m.sl ? SL_W : RD_W;
      return { x: (m.x1 + m.x2) / 2, y: (m.y1 + m.y2) / 2, a: Math.atan2(m.y2 - m.y1, m.x2 - m.x1), hw: l / 2 + w / 2, hh: w / 2 };
    }
    var s = size(m);
    return { x: m.x, y: m.y, a: m.a, hw: s[0] / 2, hh: s[1] / 2 + (m.t === "runway" ? 6 : 0) };
  }
  function corners(f) {
    var A = axes(f.a), out = [];
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (k) {
      out.push({ x: f.x + A.ux * f.hw * k[0] + A.vx * f.hh * k[1], y: f.y + A.uy * f.hw * k[0] + A.vy * f.hh * k[1] });
    });
    return out;
  }
  function overlap(f1, f2, shrink) {
    var a = { x: f1.x, y: f1.y, a: f1.a, hw: f1.hw - shrink, hh: f1.hh - shrink };
    var b = { x: f2.x, y: f2.y, a: f2.a, hw: f2.hw - shrink, hh: f2.hh - shrink };
    if (a.hw <= 0 || a.hh <= 0 || b.hw <= 0 || b.hh <= 0) return false;
    var ca = corners(a), cb = corners(b), ax = [a.a, a.a + Math.PI / 2, b.a, b.a + Math.PI / 2];
    for (var i = 0; i < 4; i++) {
      var nx = Math.cos(ax[i]), ny = Math.sin(ax[i]);
      var p1 = ca.map(function (p) { return p.x * nx + p.y * ny; }), p2 = cb.map(function (p) { return p.x * nx + p.y * ny; });
      if (Math.max.apply(null, p1) < Math.min.apply(null, p2) || Math.max.apply(null, p2) < Math.min.apply(null, p1)) return false;
    }
    return true;
  }
  function toLocal(f, p) {
    var A = axes(f.a), dx = p.x - f.x, dy = p.y - f.y;
    return { x: dx * A.ux + dy * A.uy, y: dx * A.vx + dy * A.vy };
  }
  function inFoot(f, p, pad) { var l = toLocal(f, p); return Math.abs(l.x) <= f.hw + (pad || 0) && Math.abs(l.y) <= f.hh + (pad || 0); }
  function dPointFoot(f, p) {
    var l = toLocal(f, p), dx = Math.max(0, Math.abs(l.x) - f.hw), dy = Math.max(0, Math.abs(l.y) - f.hh);
    return Math.hypot(dx, dy);
  }
  function segProj(p, a, b) {
    var dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy || 1;
    var tt = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
    var q = { x: a.x + dx * tt, y: a.y + dy * tt };
    return { t: tt, q: q, d: dist(p, q) };
  }
  function segFootDist(a, b, f) {
    var d = Infinity;
    for (var i = 0; i <= 12; i++) d = Math.min(d, dPointFoot(f, { x: a.x + (b.x - a.x) * i / 12, y: a.y + (b.y - a.y) * i / 12 }));
    corners(f).forEach(function (c) { d = Math.min(d, segProj(c, a, b).d); });
    return d;
  }
  function rwEnds(m) {
    var L = rwLen(m), A = axes(m.a);
    return { A: { x: m.x - A.ux * L / 2, y: m.y - A.uy * L / 2 }, B: { x: m.x + A.ux * L / 2, y: m.y + A.uy * L / 2 }, dx: A.ux, dy: A.uy, L: L };
  }
  function segEnds(m) { return m.t === "runway" ? (function (e) { return [e.A, e.B]; })(rwEnds(m)) : [{ x: m.x1, y: m.y1 }, { x: m.x2, y: m.y2 }]; }
  // Parkposition: Vorderseite zeigt in lokale -y-Richtung (zum Rollweg), Rücken +y (zum Terminal)
  function standDirs(m) { var A = axes(m.a); return { fx: -A.vx, fy: -A.vy, bx: A.vx, by: A.vy }; }

  // ---------- Wegenetz ----------
  function rebuild() {
    var N = [], E = [], adj = [];
    function node(x, y) {
      for (var i = 0; i < N.length; i++) if (Math.abs(N[i].x - x) < 1.5 && Math.abs(N[i].y - y) < 1.5) return i;
      N.push({ x: x, y: y }); adj.push([]); return N.length - 1;
    }
    function edge(a, b, type, dir) {
      if (a === b) return;
      var e = { a: a, b: b, len: dist(N[a], N[b]), type: type, dir: dir || 0 };   // dir 1: nur von a nach b
      E.push(e); adj[a].push(e); adj[b].push(e);
    }
    var segs = [];
    G.mods.forEach(function (m) {
      if (m.t !== "runway" && m.t !== "taxi") return;
      var e = segEnds(m);
      segs.push({ m: m, a: e[0], b: e[1], pts: [{ t: 0, x: e[0].x, y: e[0].y }, { t: 1, x: e[1].x, y: e[1].y }] });
    });
    // Rollweg-Enden auf anderen Linien = Kreuzungen
    segs.forEach(function (s) {
      if (s.m.t !== "taxi") return;
      [s.a, s.b].forEach(function (p) {
        segs.forEach(function (o) {
          if (o === s) return;
          var pr = segProj(p, o.a, o.b);
          if (pr.d < 1.5) o.pts.push({ t: pr.t, x: pr.q.x, y: pr.q.y });
        });
      });
    });
    // Parkpositionen: Rollweg direkt vor der Nase?
    function standRay(m) {
      var d = standDirs(m), h = SIZE.stand[1] / 2;
      var F = { x: m.x + d.fx * h, y: m.y + d.fy * h };
      var best = null;
      segs.forEach(function (s) {
        if (s.m.t !== "taxi") return;
        // Schnitt Strahl F + k*f mit Segment
        var rx = s.b.x - s.a.x, ry = s.b.y - s.a.y, den = d.fx * ry - d.fy * rx;
        if (Math.abs(den) < 1e-6) return;
        var qx = s.a.x - F.x, qy = s.a.y - F.y;
        var k = (qx * ry - qy * rx) / den, u = (qx * d.fy - qy * d.fx) / den;
        if (k >= -3 && k <= 26 && u >= -0.001 && u <= 1.001 && (!best || k < best.k)) best = { k: k, s: s, u: u };
      });
      if (best) { best.F = F; best.d = d; }
      return best;
    }
    mods("stand").forEach(function (m) {
      var best = standRay(m);
      // Position vor dem Rollweg gebaut: liegt der Rollweg seitlich oder hinten, dreht sich die Position zu ihm
      if (!best && !(R && R.occ && R.occ[m.id])) [Math.PI, Math.PI / 2, -Math.PI / 2].some(function (da) {
        m.a += da; best = standRay(m); if (best) return true; m.a -= da; return false;
      });
      var d = best ? best.d : standDirs(m), F = best ? best.F : null;
      m._en = m._pn = null;
      if (best) {
        var ex = F.x + d.fx * best.k, ey = F.y + d.fy * best.k;
        best.s.pts.push({ t: best.u, x: ex, y: ey });
        m._entry = { x: ex, y: ey };
      } else m._entry = null;
    });
    segs.forEach(function (s) {
      s.pts.sort(function (p, q) { return p.t - q.t; });
      var prev = -1;
      s.pts.forEach(function (p) { var n = node(p.x, p.y); if (prev >= 0) edge(prev, n, s.m.t === "runway" ? "rwy" : "taxi", s.m.ow ? 1 : 0); prev = n; });
      if (s.m.t === "runway") {
        var e = rwEnds(s.m);
        s.m._nodes = s.pts.map(function (p) { return { n: node(p.x, p.y), d: p.t * e.L }; });
      }
    });
    mods("stand").forEach(function (m) {
      if (m._entry) { m._en = node(m._entry.x, m._entry.y); m._pn = node(m.x, m.y); edge(m._en, m._pn, "lead"); }
    });
    var rws = mods("runway");
    rws.forEach(function (r) {
      r._junc = (r._nodes || []).filter(function (j) { return adj[j.n].some(function (e) { return e.type !== "rwy"; }); });
    });
    // Erreichbarkeit: Hinweg von der Landepiste, Rückweg zu irgendeiner Piste (Einbahnen beachten)
    function flood(starts, back) {
      var reach = {}, st = starts.slice();
      st.forEach(function (n) { reach[n] = 1; });
      while (st.length) {
        var n = st.pop();
        adj[n].forEach(function (e) {
          if (e.type === "rwy") return;
          var o = e.a === n ? e.b : e.a;
          if (e.dir === 1 && (back ? n !== e.b : n !== e.a)) return;
          if (!reach[o]) { reach[o] = 1; st.push(o); }
        });
      }
      return reach;
    }
    var allJ = []; rws.forEach(function (r) { r._junc.forEach(function (j) { allJ.push(j.n); }); });
    var reachIn = flood(allJ, false);   // Landungen auf jeder Piste möglich
    var reachOut = flood(allJ, true);
    mods("stand").forEach(function (m) {
      var has = m._pn !== null && m._pn !== undefined;
      m._half = has && !!reachIn[m._pn] && !reachOut[m._pn];
      m._conn = has && !!reachIn[m._pn] && !!reachOut[m._pn];
      var d = standDirs(m), h = SIZE.stand[1] / 2 + 6, P = { x: m.x + d.bx * h, y: m.y + d.by * h };
      m._term = mods("term").some(function (tm) { return inFoot(foot(tm), P, 1); });
    });
    NET = { N: N, E: E, adj: adj };
    buildRoads();
  }

  // Straßennetz: eigene Knoten und gerichtete Kanten, Zufahrten für Parkplätze, Haltestellen und Terminals
  var RNET = null;
  function buildRoads() {
    var N = [], adj = [];
    function node(x, y) {
      for (var i = 0; i < N.length; i++) if (Math.abs(N[i].x - x) < 1.5 && Math.abs(N[i].y - y) < 1.5) return i;
      N.push({ x: x, y: y }); adj.push([]); return N.length - 1;
    }
    function edge(a, b, ow, hw, sl, bl) { if (a === b) return; var e = { a: a, b: b, len: dist(N[a], N[b]), dir: ow ? 1 : 0, hw: hw ? 1 : 0, sl: sl ? 1 : 0, bl: bl ? 1 : 0 }; adj[a].push(e); adj[b].push(e); }
    var segs = mods("road").map(function (m) { return { m: m, a: { x: m.x1, y: m.y1 }, b: { x: m.x2, y: m.y2 }, pts: [{ t: 0, x: m.x1, y: m.y1 }, { t: 1, x: m.x2, y: m.y2 }] }; });
    segs.forEach(function (s) {
      [s.a, s.b].forEach(function (p) {
        segs.forEach(function (o) { if (o === s) return; var pr = segProj(p, o.a, o.b); if (pr.d < 1.5 && pr.t > 0.001 && pr.t < 0.999) o.pts.push({ t: pr.t, x: pr.q.x, y: pr.q.y }); });
      });
    });
    // Zufahrt: nächster Straßenpunkt vor dem Modul
    var acc = [];
    ["term", "park", "bus", "cab", "hotel", "hotels", "hotell"].forEach(function (k) {
      mods(k).forEach(function (m) {
        var f = foot(m), best = null;
        segs.forEach(function (s) {
          var pr = segProj(m, s.a, s.b);
          if (segFootDist(s.a, s.b, f) < 20 && (!best || pr.d < best.pr.d)) best = { s: s, pr: pr };
        });
        m._acc = null; m._accPt = null;
        if (best) { var tt = Math.max(0.0005, Math.min(0.9995, best.pr.t)); best.s.pts.push({ t: tt, x: best.s.a.x + (best.s.b.x - best.s.a.x) * tt, y: best.s.a.y + (best.s.b.y - best.s.a.y) * tt }); acc.push({ m: m, s: best.s, t: tt }); }
      });
    });
    segs.forEach(function (s) {
      s.pts.sort(function (p, q) { return p.t - q.t; });
      var prev = -1;
      s.pts.forEach(function (p) { var n = node(p.x, p.y); if (prev >= 0) edge(prev, n, s.m.ow, s.m.hw, s.m.sl, s.m.bl); prev = n; });
    });
    acc.forEach(function (o) { var p = { x: o.s.a.x + (o.s.b.x - o.s.a.x) * o.t, y: o.s.a.y + (o.s.b.y - o.s.a.y) * o.t }; o.m._acc = node(p.x, p.y); o.m._accPt = p; });
    // Enden der Landstraße
    var ends = [];
    mods("road").forEach(function (m) {
      if (!m.hw) return;
      [{ x: m.x1, y: m.y1 }, { x: m.x2, y: m.y2 }].forEach(function (p) { var n = node(p.x, p.y); if (adj[n].length === 1 && ends.indexOf(n) < 0) ends.push(n); });
    });
    RNET = { N: N, adj: adj, ends: ends };
    // Angebunden heißt: von einem Ende der Landstraße hin und zu einem Ende zurück
    var fwd = rflood(ends, false), bwd = rflood(ends, true);
    ["term", "park", "bus", "cab", "hotel", "hotels", "hotell"].forEach(function (k) { mods(k).forEach(function (m) { m._road = m._acc !== null && !!fwd[m._acc] && !!bwd[m._acc]; }); });
    // Einbahnstraßen: rechte Spur fährt, linke Seite ist ein Streifen mit Schrägparkplätzen
    mods("road").forEach(function (m) {
      m._spots = 0; m._park = false;
      if (!m.ow || m.hw || m.sl || m.bl) return;
      var L = Math.hypot(m.x2 - m.x1, m.y2 - m.y1);
      m._spots = Math.max(0, Math.floor((L - 30) / 10));
      m._sN = node(m.x1, m.y1); m._eN = node(m.x2, m.y2);
      m._park = m._spots > 0 && !!fwd[m._sN] && !!bwd[m._eN];
    });
  }
  // Schrägparkplatz i an einer Einbahnstraße: Mitte, Spurpunkt davor, Blickrichtung
  function roadSpot(m, i) {
    var L = Math.hypot(m.x2 - m.x1, m.y2 - m.y1), ux = (m.x2 - m.x1) / L, uy = (m.y2 - m.y1) / L, lx = uy, ly = -ux;
    var sOff = 15 + i * 10 + 5, h = Math.atan2(uy, ux);
    var P = function (d, side) { return { x: m.x1 + ux * d + lx * side, y: m.y1 + uy * d + ly * side }; };
    return { c: P(sOff + 2, 4.3), lane: P(sOff - 9, 0), back: P(sOff - 3, 0), h: h - Math.PI / 4 };
  }
  function rflood(starts, back) {
    var reach = {}, st = starts.slice();
    st.forEach(function (n) { reach[n] = 1; });
    while (st.length) {
      var n = st.pop();
      RNET.adj[n].forEach(function (e) {
        var o = e.a === n ? e.b : e.a;
        if (e.dir === 1 && (back ? n !== e.b : n !== e.a)) return;
        if (!reach[o]) { reach[o] = 1; st.push(o); }
      });
    }
    return reach;
  }
  // kürzester Weg im Straßennetz, liefert Punkte mit Spurversatz-Markierung (r: rechts fahren auf Straßen mit Gegenverkehr)
  function rpath(src, dst, bus) {
    if (src == null || dst == null || !RNET) return null;
    var dd = {}, prev = {}, pe = {}, done = {}, open = [src];
    dd[src] = 0;
    while (open.length) {
      var bi = 0; for (var i = 1; i < open.length; i++) if (dd[open[i]] < dd[open[bi]]) bi = i;
      var n = open.splice(bi, 1)[0];
      if (done[n]) continue; done[n] = 1;
      if (n === dst) break;
      RNET.adj[n].forEach(function (e) {
        if (e.dir === 1 && n !== e.a) return;
        var o = e.a === n ? e.b : e.a, nd = dd[n] + e.len * (e.bl && bus ? 0.6 : 1);
        if (dd[o] === undefined || nd < dd[o]) { dd[o] = nd; prev[o] = n; pe[o] = e; open.push(o); }
      });
    }
    if (dd[dst] === undefined) return null;
    var ids = [dst]; while (ids[0] !== src) ids.unshift(prev[ids[0]]);
    // Landstraße schnell, Flughafenstraßen langsamer
    return ids.map(function (k, i) { var nx = ids[i + 1] !== undefined ? pe[ids[i + 1]] : null; return { x: RNET.N[k].x, y: RNET.N[k].y, r: pe[k] && pe[k].sl ? 0 : pe[k] && pe[k].bl ? (bus ? 1 : -1) : 1, s: nx && nx.hw ? 75 : 40 }; });   // immer rechts fahren, auch Einbahnen sind zweispurig
  }

  function path(src, dst) {
    if (src == null || dst == null) return null;
    var N = NET.N, dd = {}, prev = {}, done = {}, open = [src];
    dd[src] = 0;
    while (open.length) {
      var bi = 0;
      for (var i = 1; i < open.length; i++) if (dd[open[i]] < dd[open[bi]]) bi = i;
      var n = open.splice(bi, 1)[0];
      if (done[n]) continue;
      done[n] = 1;
      if (n === dst) break;
      NET.adj[n].forEach(function (e) {
        if (e.type === "rwy") return;
        var o = e.a === n ? e.b : e.a;
        if (e.dir === 1 && n !== e.a) return;
        if (e.type === "lead" && o !== dst && o !== src && n !== src && n !== dst) return;
        var nd = dd[n] + e.len;
        if (dd[o] === undefined || nd < dd[o]) { dd[o] = nd; prev[o] = n; open.push(o); }
      });
    }
    if (dd[dst] === undefined) return null;
    var out = [dst];
    while (out[0] !== src) out.unshift(prev[out[0]]);
    return out.map(function (k) { return N[k]; });
  }

  function stats() {
    var st = mods("stand");
    return {
      stands: st.length, conn: st.filter(function (m) { return m._conn; }).length,
      gates: st.filter(function (m) { return m._conn && m.gate && m._term; }).length,
      heavy: st.filter(function (m) { return m._conn && m.heavy; }).length,
      rws: mods("runway").length, term: mods("term").length,
      termRoad: mods("term").some(function (m) { return m._road; }),
      bus: mods("bus").filter(function (m) { return m._road; }).length,
      park: mods("park").filter(function (m) { return m._road; }).length,
      tower: one("tower") ? one("tower").lvl : 0, fire: one("fire") ? one("fire").lvl : 0,
      hangar: one("hangar") ? one("hangar").lvl : 0, deck: !!one("deck")
    };
  }
  function rank() {
    var c = stats().conn, r = t("ranks");
    return !mods("runway").length ? r[0] : c < 3 ? r[1] : c < 6 ? r[2] : c < 10 ? r[3] : r[4];
  }

  // ---------- Bauen ----------
  // Jedes Bauteil: Kosten, Sperren, Art des Werkzeugs
  var BUILD = [
    { id: "runway", g: "air", tool: "runway", name: L2("Piste", "Runway"),
      desc: L2("Start- und Landebahn: Anfang setzen, Länge ziehen. Ab 2.100 m Mittelstrecke, ab 3.000 m Langstrecke.", "Runway: set the start, drag the length. From 2,100 m narrowbodies, from 3,000 m widebodies."),
      cost: function () { return rwCost(RW_MIN, mods("runway").length); }, from: true,
      lock: function () {
        var n = mods("runway").length;
        if (n >= 2) return t("maxed");
        if (n === 1 && stats().conn < 6) return t("need6");
        if (n === 1 && stats().tower < 2) return t("needTower2");
        return "";
      } },
    { id: "pave", g: "air", tool: "brush", name: L2("Asphaltfläche", "Apron paving"),
      desc: L2("Malt Asphaltboden wie auf dem Vorfeld, damit der Flughafen wie ein zusammenhängendes Gelände wirkt. Umschalt + Ziehen entfernt. 300 € pro Feld.", "Paints apron paving so the airport looks like one connected site. Shift + drag removes. €300 per tile."),
      cost: function () { return 300; }, lock: function () { return ""; } },
    { id: "taxi", g: "air", tool: "line", name: L2("Rollweg", "Taxiway"),
      desc: L2("Verbindet Piste und Parkpositionen. Schräge Abfahrten räumen die Piste schneller.", "Links runway and stands. Angled exits clear the runway faster."),
      cost: function () { return 25000; }, unit: 2500, lock: function () { return mods("runway").length ? "" : t("needRw"); } },
    { id: "stand", g: "air", tool: "rect", name: L2("Parkposition", "Aircraft stand"),
      desc: L2("Richtet sich zum nächsten Rollweg aus. Ohne Gate per Bus: langsamer, weniger Ertrag.", "Turns to face the nearest taxiway. Without a gate it is served by bus: slower, less revenue."),
      cost: function () { return 325000; },
      lock: function () { if (!mods("runway").length) return t("needRw"); return mods("stand").length >= 4 && !one("fire") ? t("needFire") : ""; } },
    { id: "gate", g: "term", tool: "apply", name: L2("Gate", "Gate"),
      desc: L2("Fluggastbrücke für eine Position, die mit dem Rücken am Terminal steht.", "A jet bridge for a stand whose back touches a terminal."),
      cost: function () { return 325000; },
      lock: function () { return mods("term").length ? "" : (lang === "de" ? "Erst ein Terminalmodul bauen" : "Build a terminal module first"); } },
    { id: "term", g: "term", tool: "rect", name: L2("Terminalmodul", "Terminal module"),
      desc: L2("Gebäudeabschnitt mit Check-in und Kontrolle. Rastet an Positionen und anderen Modulen ein.", "Building section with check-in and security. Snaps to stands and other modules."),
      cost: function () { return 3500000; },
      lock: function () {
        if (!mods("runway").length) return t("needRw");
        return mods("term").length >= 2 && !stats().termRoad ? t("needRoad") : "";
      } },
    { id: "heavy", g: "term", tool: "apply", name: L2("Großraum-Position", "Widebody stand"),
      desc: L2("Macht eine Position fit für Langstreckenjets, die am meisten einbringen.", "Makes a stand fit for widebody jets, which earn the most."),
      cost: function () { return 850000; },
      lock: function () { if (!mods("runway").some(function (r) { return rwFits(r, "w"); })) return lang === "de" ? "Braucht eine Piste ab 3.000 m" : "Needs a runway of 3,000 m or more"; return stats().fire < 2 ? t("needFire2") : ""; } },
    { id: "road", g: "land", tool: "line", name: L2("Straße", "Road"),
      desc: L2("Vorfahrt für Abflug und Ankunft. Taste O wechselt zwischen beiden Richtungen, Einbahn mit Parkstreifen und Einbahn einspurig, Taste C baut Kurven.", "Forecourt for departures and arrivals. Key O switches between two-way, one-way with parking and one-way single lane, key C builds curves."),
      cost: function () { return 8000; }, unit: 800, lock: function () { return mods("runway").length ? "" : t("needRw"); } },
    { id: "park", g: "land", tool: "rect", name: L2("Parkplatz", "Car park"),
      desc: L2("16 Stellplätze an einer Straße. Wer parkt, bringt 1 bis 4 Fluggäste mit, später fahren Ankommende mit dem Auto weg. Parken kostet 5 € pro Sekunde, bezahlt wird bei der Ausfahrt.", "16 spaces on a road. Each parked car brings 1 to 4 passengers; arriving passengers later drive it away. Parking costs €5 per second, paid on the way out."),
      cost: function () { return 120000; },
      lock: function () { if (!mods("runway").length) return t("needRw"); return ""; } },
    { id: "bus", g: "land", tool: "rect", name: L2("Bushaltestelle", "Bus stop"),
      desc: L2("An einer Straße: Busse mit 50 Plätzen bringen und holen Fluggäste.", "On a road: buses with 50 seats bring and collect passengers."),
      cost: function () { return 60000; },
      lock: function () { if (!mods("runway").length) return t("needRw"); return mods("bus").length >= 8 ? t("maxed") : ""; } },
    { id: "cab", g: "land", tool: "rect", name: L2("Taxistand", "Taxi rank"),
      desc: L2("An einer Straße: Taxis bringen Abfliegende und holen Ankommende ab. Jede Fahrt bringt eine Gebühr.", "On a road: taxis drop off departing and collect arriving passengers. Every ride pays a fee."),
      cost: function () { return 90000; },
      lock: function () { if (!mods("runway").length) return t("needRw"); return mods("cab").length >= 8 ? t("maxed") : ""; } },
    { id: "hotels", g: "land", tool: "rect", name: L2("Hotel klein", "Small hotel"),
      desc: L2("An einer Straße: kompaktes Hotel für 50 Gäste. Ankommende mit Anschlussflug übernachten hier und zahlen pro Aufenthalt.", "On a road: compact hotel for 50 guests. Arriving passengers with onward flights stay here and pay for the stay."),
      cost: function () { return HOTELS.hotels.cost; }, lock: function () { if (!mods("runway").length) return t("needRw"); if (!mods("term").length) return lang === "de" ? "Erst ein Terminalmodul bauen" : "Build a terminal module first"; return hotels().length >= 12 ? t("maxed") : ""; } },
    { id: "hotel", g: "land", tool: "rect", name: L2("Hotel mittel", "Medium hotel"),
      desc: L2("An einer Straße: Hotel für 100 Gäste. Ankommende mit Anschlussflug übernachten hier und zahlen pro Aufenthalt.", "On a road: hotel for 100 guests. Arriving passengers with onward flights stay here and pay for the stay."),
      cost: function () { return HOTELS.hotel.cost; }, lock: function () { if (!mods("runway").length) return t("needRw"); if (!mods("term").length) return lang === "de" ? "Erst ein Terminalmodul bauen" : "Build a terminal module first"; return hotels().length >= 12 ? t("maxed") : ""; } },
    { id: "hotell", g: "land", tool: "rect", name: L2("Hotel groß", "Large hotel"),
      desc: L2("An einer Straße: großes Hotel mit eigenem Parkplatz davor, 180 Gäste. Zieht die meisten Übernachtungen an.", "On a road: large hotel with its own car park in front, 180 guests. Attracts the most overnight stays."),
      cost: function () { return HOTELS.hotell.cost; }, lock: function () { if (!mods("runway").length) return t("needRw"); if (!mods("term").length) return lang === "de" ? "Erst ein Terminalmodul bauen" : "Build a terminal module first"; return hotels().length >= 12 ? t("maxed") : ""; } },
    { id: "veg", g: "land", tool: "brush", name: L2("Vegetation", "Vegetation"),
      desc: L2("Pinsel mit einer Mischung aus Bäumen und Büschen. Ziehen pflanzt, Umschalt + Ziehen entfernt. Je Pflanze 1.500 €, etwas besserer Ruf.", "Brush with a mix of trees and bushes. Drag to plant, Shift + drag removes. €1,500 per plant, a slightly better reputation."),
      cost: function () { return 1500; }, lock: function () { return ""; } },
    { id: "tank", g: "ops", tool: "rect", name: L2("Kerosintank", "Fuel tank"),
      desc: L2("Frei platzierbar. Ein Tank reicht für etwa 100 Flüge. Kerosin einkaufen und an die Flugzeuge weiterverkaufen: Klick auf die Kerosin-Anzeige oben füllt auf.", "Place anywhere. One tank lasts about 100 flights. Buy fuel and sell it on to aircraft: click the fuel gauge at the top to refill."),
      cost: function () { return 250000; }, lock: function () { if (!mods("runway").length) return t("needRw"); return mods("tank").length >= 16 ? t("maxed") : ""; } },
    { id: "tower", g: "ops", tool: "rect", name: L2("Tower", "Control tower"),
      desc: L2("Kürzere Abstände zwischen Landungen und Starts. Stufe 2 mit Radar.", "Shorter spacing between landings and take-offs. Level 2 adds radar."),
      cost: function () { return 2500000; }, lock: function () { if (!mods("runway").length) return t("needRw"); return one("tower") ? t("once") : ""; } },
    { id: "fire", g: "ops", tool: "rect", name: L2("Feuerwehr", "Fire station"),
      desc: L2("Pflicht ab der fünften Position. Stufe 2 erlaubt Langstreckenjets.", "Required from the fifth stand. Level 2 allows widebodies."),
      cost: function () { return 750000; }, lock: function () { if (!mods("runway").length) return t("needRw"); return one("fire") ? t("once") : ""; } },
    { id: "hangar", g: "ops", tool: "rect", name: L2("Wartungshalle", "Maintenance hangar"),
      desc: L2("Nach manchen Abflügen kommt ein Wartungsauftrag rein.", "Some departures bring in a maintenance job."),
      cost: function () { return 6000000; }, lock: function () { if (!mods("runway").length) return t("needRw"); return one("hangar") ? t("once") : ""; } },
    { id: "deck", g: "ops", tool: "rect", name: L2("Aussichtsplattform", "Viewing deck"),
      desc: L2("Planespotter zahlen Eintritt bei jeder Bewegung, dazu ein besserer Ruf.", "Plane spotters pay on every movement, plus a better reputation."),
      cost: function () { return 400000; }, lock: function () { if (!mods("runway").length) return t("needRw"); return one("deck") ? t("once") : ""; } }
  ];
  var UPS = [
    { id: "ils", name: L2("Instrumentenlandesystem", "Instrument landing system"),
      desc: L2("Schnellere Anflüge, kürzere Abstände.", "Faster approaches, shorter spacing."),
      cost: function () { return 3500000; }, lock: function () { if (G.up.ils) return t("done"); return stats().tower < 1 ? t("needTower") : ""; },
      apply: function () { G.up.ils = 1; } },
    { id: "gh", name: L2("Bodenabfertigung", "Ground handling"),
      desc: L2("Jede Stufe macht die Abfertigung 15 % schneller.", "Each level makes turnarounds 15% faster."),
      cost: function () { return 900000 * Math.pow(2, G.up.gh); }, lock: function () { return G.up.gh >= 3 ? t("done") : ""; },
      extra: function () { return t("lvl") + " " + G.up.gh + "/3"; }, apply: function () { G.up.gh++; } },
    { id: "ext", name: L2("Terminal-Erweiterung", "Terminal extension"),
      desc: L2("Shops und Lounges: jede Stufe 15 % mehr pro Passagier.", "Shops and lounges: each level 15% more per passenger."),
      cost: function () { return 2000000 * Math.pow(2, G.up.ext); },
      lock: function () { if (G.up.ext >= 3) return t("done"); return mods("term").length ? "" : (lang === "de" ? "Erst ein Terminalmodul bauen" : "Build a terminal module first"); },
      extra: function () { return t("lvl") + " " + G.up.ext + "/3"; }, apply: function () { G.up.ext++; } }
  ];
  var LVL = { tower: [500000], fire: [2000000], hangar: [9000000] };
  // Neupreis eines Bauteils (für die Umstellung alter Spielstände)
  function priceOf(m) {
    var len = m.x2 !== undefined ? Math.hypot(m.x2 - m.x1, m.y2 - m.y1) : 0;
    var base = { runway: rwCost(rwLen(m), 0), taxi: Math.max(25000, len * 2500), road: Math.max(8000, len * 800), stand: 325000, term: 3500000,
      park: 120000, bus: 60000, cab: 90000, hotels: 900000, hotel: 1600000, hotell: 2400000, tank: 250000, tower: 2500000, fire: 750000, hangar: 6000000, deck: 400000 }[m.t] || 0;
    if (m.gate) base += 325000; if (m.heavy) base += 850000; if (m.t === "term") { if (m.lvl >= 2) base += TUP.tmod; if (m.shops) base += TUP.tshop; if (m.lounge) base += TUP.tlng; }
    if (m.lvl >= 2 && LVL[m.t]) base += LVL[m.t][0];
    return base;
  }
  function bdef(id) { return BUILD.filter(function (b) { return b.id === id; })[0]; }

  function addMod(m, cost) {
    m.id = G.nid++; m.paid = cost;
    if (m.t === "tower" || m.t === "fire" || m.t === "hangar" || m.t === "term") m.lvl = 1;
    if (isHotel(m.t)) { m.hc = G.hcol || 0; G.hcol = (G.hcol || 0) + 1; }
    G.mods.push(m);
    G.money -= cost;
    clearVeg(m);
    rebuild(); save();
    return m;
  }

  function clearVeg(m) { if (!G.veg || !G.veg.length) return; var f = foot(m); G.veg = G.veg.filter(function (v) { return !inFoot(f, v, v.r * 0.6); }); }
  // Vegetationspinsel: Bäume und Büsche gemischt, nicht auf Gebautem
  var PV = 16;
  function paveAt(p, erase) {
    var Rb = 22, i0 = Math.floor((p.x - Rb) / PV), i1 = Math.floor((p.x + Rb) / PV), j0 = Math.floor((p.y - Rb) / PV), j1 = Math.floor((p.y + Rb) / PV);
    for (var j = j0; j <= j1; j++) for (var i = i0; i <= i1; i++) {
      var cx = (i + 0.5) * PV, cy = (j + 0.5) * PV; if (Math.hypot(cx - p.x, cy - p.y) > Rb) continue;
      var k = i + "," + j;
      if (erase) { if (G.pave[k]) { delete G.pave[k]; V.brushed = true; } continue; }
      if (G.pave[k]) continue;
      if (G.money < 300) { if (!V.brush.poor) { msg(t("poor")); V.brush.poor = true; } return; }
      G.pave[k] = 1; G.money -= 300; V.brushed = true;
      if (G.veg.length) G.veg = G.veg.filter(function (v) { return Math.abs(v.x - cx) > PV * 0.6 + v.r * 0.5 || Math.abs(v.y - cy) > PV * 0.6 + v.r * 0.5; });
    }
  }
  function brushAt(p, erase) {
    if (V.tool && V.tool.id === "pave") { paveAt(p, erase); return; }
    var Rb = 34;
    if (erase) { var n0 = G.veg.length; G.veg = G.veg.filter(function (v) { return dist(v, p) > Rb; }); if (n0 !== G.veg.length) V.brushed = true; return; }
    var B = V.brush; if (B.last && dist(B.last, p) < 9) return; B.last = { x: p.x, y: p.y };
    for (var k = 0; k < 3; k++) {
      if (G.money < 1500) { if (!B.poor) { msg(t("poor")); B.poor = true; } return; }
      var a = Math.random() * Math.PI * 2, rd = Math.sqrt(Math.random()) * Rb, q = { x: p.x + Math.cos(a) * rd, y: p.y + Math.sin(a) * rd };
      var tree = Math.random() < 0.45, r = tree ? 9 + Math.random() * 6 : 4 + Math.random() * 3;
      if (G.mods.some(function (m) { return inFoot(foot(m), q, r + 3); })) continue;
      if (G.veg.some(function (v) { return dist(v, q) < (v.r + r) * 0.72; })) continue;
      G.veg.push({ x: Math.round(q.x * 10) / 10, y: Math.round(q.y * 10) / 10, r: Math.round(r * 10) / 10, k: tree ? 1 : 0, s: Math.round(Math.random() * 100) / 100 });
      G.money -= 1500; G.rep = Math.min(100, G.rep + 0.01); V.brushed = true;
    }
  }
  // Einrasten für Rechteck-Module
  function snapRect(type, cx, cy, a0) {
    var sz = SIZE[type], best = null;
    function cand(x, y, a, d, lineFrom) { if (!best || d < best.d) best = { x: x, y: y, a: a, d: d, from: lineFrom }; }
    var cur = { x: cx, y: cy };
    G.mods.forEach(function (m) {
      if (m.t === "taxi" || m.t === "road" || m.t === "runway") return;
      var f = foot(m);
      if (dist(f, cur) > 260) return;
      var A = axes(m.a);
      for (var e = 0; e < 4; e++) {
        var na = m.a + e * Math.PI / 2, nx = Math.cos(na), ny = Math.sin(na), ux = -ny, uy = nx;
        var hn = Math.abs(nx * A.ux + ny * A.uy) * f.hw + Math.abs(nx * A.vx + ny * A.vy) * f.hh;
        var hu = Math.abs(ux * A.ux + uy * A.uy) * f.hw + Math.abs(ux * A.vx + uy * A.vy) * f.hh;
        // Winkel des neuen Moduls: nächstes Vielfaches von 90° zum Nachbarn
        var k = Math.round((a0 - m.a) / (Math.PI / 2)), ga = m.a + k * Math.PI / 2, G2 = axes(ga);
        var gn = Math.abs(nx * G2.ux + ny * G2.uy) * sz[0] / 2 + Math.abs(nx * G2.vx + ny * G2.vy) * sz[1] / 2;
        var gu = Math.abs(ux * G2.ux + uy * G2.uy) * sz[0] / 2 + Math.abs(ux * G2.vx + uy * G2.vy) * sz[1] / 2;
        var mx = f.x + nx * hn, my = f.y + ny * hn;
        var tt = (cx - mx) * ux + (cy - my) * uy;
        var lim = hu + gu - 8;
        if (Math.abs(tt) > lim + 30) continue;
        tt = Math.max(-lim, Math.min(lim, tt));
        [0, hu - gu, gu - hu, hu + gu, -hu - gu].forEach(function (s) { if (Math.abs(tt - s) < 12) tt = s; });
        var px = mx + nx * gn + ux * tt, py = my + ny * gn + uy * tt;
        var d = Math.hypot(px - cx, py - cy);
        if (d < gn + 26) cand(px, py, ga, d);
      }
    });
    if (type === "stand") {
      mods("taxi").forEach(function (m) {
        var a = { x: m.x1, y: m.y1 }, b = { x: m.x2, y: m.y2 }, pr = segProj(cur, a, b);
        if (pr.d > 90) return;
        var l = dist(a, b), dx = (b.x - a.x) / l, dy = (b.y - a.y) / l;
        var side = (cx - a.x) * -dy + (cy - a.y) * dx >= 0 ? 1 : -1;
        var nx = -dy * side, ny = dx * side;            // weg vom Rollweg
        var fwx = -nx, fwy = -ny;                        // Nase zum Rollweg
        var ang = Math.atan2(fwx, -fwy);
        var off = TW_W / 2 + 2 + sz[1] / 2;
        var px = pr.q.x + nx * off, py = pr.q.y + ny * off;
        var d = Math.hypot(px - cx, py - cy);
        if (d < 70) cand(px, py, ang, d * 0.9, null);
      });
    }
    if (type === "park" || type === "bus" || type === "term" || type === "cab" || isHotel(type)) { // bündig an die Straße
      mods("road").forEach(function (m) {
        var a = { x: m.x1, y: m.y1 }, b = { x: m.x2, y: m.y2 }, pr = segProj(cur, a, b);
        if (pr.d > 80) return;
        var l = dist(a, b), dx = (b.x - a.x) / l, dy = (b.y - a.y) / l;
        var side = (cx - a.x) * -dy + (cy - a.y) * dx >= 0 ? 1 : -1;
        var off = (m.sl ? SL_W : RD_W) / 2 + 3 + sz[1] / 2;
        var px = pr.q.x - dy * side * off, py = pr.q.y + dx * side * off;
        var d = Math.hypot(px - cx, py - cy);
        if (d < 60) cand(px, py, Math.atan2(dy, dx), d * 0.95);
      });
    }
    return best;
  }

  function rectValid(type, x, y, a) {
    var s = SIZE[type], f = { x: x, y: y, a: a, hw: s[0] / 2, hh: s[1] / 2 }, soft = { park: 1, bus: 1, cab: 1 };
    // Parkplätze und Haltebuchten dürfen sich gegenseitig um etwa 5 % überlappen
    return !G.mods.some(function (m) { return m.id !== V.ignore && overlap(f, foot(m), soft[type] && soft[m.t] ? 1.5 + Math.min(s[0], s[1]) * 0.05 : 1.5); });
  }
  function runwayValid(x, y, a, len) {
    if (len < RW_MIN) return false;
    var f = { x: x, y: y, a: a, hw: len / 2, hh: RW_W / 2 + 6 };
    return !G.mods.some(function (m) { return m.t !== "taxi" && overlap(f, foot(m), 1.5); });
  }
  function lineValid(type, a, b) {
    if (dist(a, b) < 20) return false;
    var l = dist(a, b), w = type === "taxi" ? TW_W : RD_W;
    var f = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, a: Math.atan2(b.y - a.y, b.x - a.x), hw: l / 2 - 4, hh: w / 2 };
    return !G.mods.some(function (m) {
      if (type === "taxi" && (m.t === "taxi" || m.t === "runway")) return false;
      if (type === "road" && m.t === "road") return false;
      return overlap(f, foot(m), 1.5);
    });
  }
  function snapPoint(type, p, thr) {
    var best = null;
    function c(x, y, d) { if (d < thr && (!best || d < best.d)) best = { x: x, y: y, d: d }; }
    var lines = G.mods.filter(function (m) { return type === "taxi" ? (m.t === "taxi" || m.t === "runway") : m.t === "road"; });
    lines.forEach(function (m) { segEnds(m).forEach(function (e) { c(e.x, e.y, dist(e, p) * 0.6); }); });
    if (best) return best;
    lines.forEach(function (m) { var e = segEnds(m), pr = segProj(p, e[0], e[1]); c(pr.q.x, pr.q.y, pr.d); });
    return best;
  }

  // ---------- Verkehr ----------
  function interval() {
    var s = stats();
    var cap = 0.6 + 0.4 * s.conn + 0.2 * s.gates + 0.25 * s.heavy + (s.rws > 1 ? 0.8 : 0);
    var land = 1 + (s.termRoad ? 0.15 : 0) + 0.08 * s.bus;
    var repF = 1.35 - G.rep / 100 * 0.7;
    return Math.max(4.5, 50 / (cap * land) * repF);
  }
  function standOkFor(m, k) {
    if (!m._conn || (TYPES[k].heavy && !m.heavy) || !depRunway(m, k)) return false;
    return mods("runway").some(function (rw) { return rwFits(rw, k) && (rw._junc || []).some(function (j) { return j.d >= 50 && path(j.n, m._pn); }); });
  }
  function typeReachable(k) { return mods("stand").some(function (m) { return standOkFor(m, k); }); }
  function pickType() {
    var s = stats();
    // Ein Typ kommt, sobald irgendeine passende Piste eine passende Position erreicht (nicht mehr beide Pisten nötig)
    var ok = function (k) { return typeReachable(k); };
    var w = { p: Math.max(0.15, 1.2 - 0.12 * s.conn), n: ok("n") ? 0.3 + 0.15 * s.conn : 0, w: (ok("w") && s.heavy) ? 0.1 + 0.14 * s.heavy : 0 };
    var sum = w.p + w.n + w.w, r = Math.random() * sum;
    return r < w.p ? "p" : r < w.p + w.n ? "n" : "w";
  }
  function spawn() {
    if (R.holdQ.length >= 6 || !stats().conn || fuelOut() || opsBlocked()) return;   // ohne Kerosin ist der Flugbetrieb eingestellt
    var a = Math.random() < 0.35 ? CARRIERS[Math.floor(Math.random() * CARRIERS.length)] : AIRLINES[Math.floor(Math.random() * AIRLINES.length)];
    var p = { id: ++R.id, type: pickType(), al: a, cs: a.c + (100 + Math.floor(Math.random() * 900)),
      x: 0, y: 0, h: 0, alt: 0.8, ang: Math.random() * 6, wait: 0, fade: 0, state: "hold", path: null, pi: 0 };
    var cap = TYPES[p.type].cap;
    p.cap = cap; p.revF = 1.5 + Math.random() * 0.5; p.paxIn = Math.round(cap * loadF()); p.book = Math.round(cap * loadF());
    bookTrips(p.book);
    R.planes.push(p); R.holdQ.push(p);
  }
  function rwState(m) { if (!R.rw[m.id]) R.rw[m.id] = { busy: null, next: null, cool: 0, last: "" }; return R.rw[m.id]; }
  function rwFree(r) { return !r.busy && r.cool <= 0; }
  function rwSoon(r) {
    if (rwFree(r)) return true;
    if (!r.busy || r.next) return false;
    var b = r.busy;
    return !!b.soon;
  }
  function take(r, p, kind) { if (r.busy) r.next = p; else r.busy = p; r.last = kind; }
  function release(r) { if (r.next) { r.busy = r.next; r.next = null; r.cool = 0; } else { r.busy = null; r.cool = sep(); } }
  function sep() { return [3, 3, 2, 1.2][stats().tower + 1] - (G.up.ils ? 0.4 : 0); }

  // ---------- Routen ----------
  function chaikin(pts, it) {
    for (var k = 0; k < it; k++) {
      if (pts.length < 3) return pts;
      var out = [pts[0]];
      for (var i = 0; i < pts.length - 1; i++) {
        var a = pts[i], b = pts[i + 1];
        out.push({ x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 }, { x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 });
      }
      out.push(pts[pts.length - 1]); pts = out;
    }
    return pts;
  }
  // Anflug: Wegpunkte des Spielers, dann ausgerichteter Endanflug auf die Schwelle
  function appRoute(rw) {
    var e = rwEnds(rw), P = function (d) { return { x: e.A.x - e.dx * d, y: e.A.y - e.dy * d }; };
    var base = rw.app && rw.app.length ? rw.app.slice() : [P(950)];
    return chaikin(base.concat([P(300)]), 2).concat([P(110)]);
  }
  function depRoute(rw, from) {
    var e = rwEnds(rw), P = function (d) { return { x: from.x + e.dx * d, y: from.y + e.dy * d }; };
    if (!rw.dep || !rw.dep.length) return [P(800)];
    return chaikin([from, P(220)].concat(rw.dep), 2).slice(1);
  }
  function holdPoint(rw) { return rw.app && rw.app.length ? rw.app[0] : (function (e) { return { x: e.A.x - e.dx * 950, y: e.A.y - e.dy * 950 }; })(rwEnds(rw)); }

  function arrPlan(p, st, rw) {
    var e = rwEnds(rw), min = 40 + TYPES[p.type].roll, best = null, last = null;
    (rw._junc || []).forEach(function (j) {
      if (best || j.d < 50) return;
      var pa = path(j.n, st._pn);
      if (!pa) return;
      last = { j: j, pa: pa };
      if (j.d >= min) best = last;
    });
    return best || last;
  }
  function standsFor(type) {   // freie, angebundene Positionen, beste zuerst
    // Wartet ein Großraumjet, bleiben Großraum-Positionen für ihn frei
    var wideWaiting = !TYPES[type].heavy && R.holdQ.some(function (h) { return TYPES[h.type].heavy; });
    var L = mods("stand").filter(function (m) { return m._conn && !R.occ[m.id] && (!TYPES[type].heavy || m.heavy) && !(wideWaiting && m.heavy); });
    L.forEach(function (m) { m._sc = (m.gate && m._term ? 2 : 0) - (m.heavy && !TYPES[type].heavy ? 1.5 : 0) + Math.random() * 0.1; });
    return L.sort(function (a, b) { return b._sc - a._sc; });
  }
  function freeStand(type) {
    var rw = mods("runway")[0], out = null, bs = -99;
    if (!rw) return null;
    mods("stand").forEach(function (m) {
      if (!m._conn || R.occ[m.id]) return;
      if (TYPES[type].heavy && !m.heavy) return;
      var s = (m.gate && m._term ? 2 : 0) - (m.heavy && !TYPES[type].heavy ? 1.5 : 0) + Math.random() * 0.1;
      if (s > bs) { bs = s; out = m; }
    });
    return out;
  }

  function clearArrival(p, st, plan, rw) {
    var r = rwState(rw);
    take(r, p, "a");
    R.occ[st.id] = p; p.st = st.id; p.state = "arr"; p.soon = false;
    var e = rwEnds(rw), f = G.up.ils ? 1.25 : 1, pa = plan.pa;
    var J = { x: e.A.x + e.dx * plan.j.d, y: e.A.y + e.dy * plan.j.d };
    var n1 = pa[1] || pa[0];
    var ex = Math.hypot(n1.x - J.x, n1.y - J.y) || 1;
    var cosA = ((n1.x - J.x) * e.dx + (n1.y - J.y) * e.dy) / ex;
    var vEx = cosA > 0.5 ? 30 : 16;
    var cut = Math.min(20, ex);
    var rt = appRoute(rw), pts = [{ x: p.x, y: p.y, a: 0.8, s: 100 * f }];
    rt.forEach(function (q, i) { var g = (i + 1) / rt.length; pts.push({ x: q.x, y: q.y, a: 0.8 - 0.35 * g, s: (100 - 5 * g) * f }); });
    pts.push(
      { x: e.A.x + e.dx * 40, y: e.A.y + e.dy * 40, a: 0, s: 85 * f, ev: touchdown },
      { x: J.x, y: J.y, s: vEx, ev: function (q) { q.soon = true; } },
      { x: J.x + (n1.x - J.x) / ex * cut, y: J.y + (n1.y - J.y) / ex * cut, s: vEx * 0.8, ev: function () { release(r); } }
    );
    for (var i = 1; i < pa.length; i++) pts.push({ x: pa[i].x, y: pa[i].y, s: i === pa.length - 1 ? 8 : i === pa.length - 2 ? 14 : 40 });
    p.path = pts; p.pi = 0; p.onEnd = park;
  }
  function touchdown(p) { if (Math.random() < CRASHP) { crash(p); return; } earn(TYPES[p.type].rev * 0.4 * p.paxIn / p.cap * (p.revF || 1), p.x, p.y, "", "fly"); movement(); }
  function movement() {
    G.st.moves++;
    if (one("deck")) {
      G.rep = Math.min(100, G.rep + 0.05);
      var v = 600 * (1 + 0.2 * G.up.ext); G.money += v; G.st.earned += v;
      R.visitors = Math.min(24, R.visitors + 2);
    }
  }
  function park(p) {
    var st = byId(p.st);
    p.state = "park"; p.phase = "unload"; p.on = p.paxIn; p.boarded = 0; p.acc = 0; p.starve = 0; p.docked = true;
    if (st) { var d = standDirs(st); p.h = Math.atan2(d.by, d.bx); }
    refuel(p); apronJobs(p, st);
  }
  function fuelJob(p) {
    var tanks = mods("tank"); if (!tanks.length) return;
    var T = TYPES[p.type], fx = Math.cos(p.h), fy = Math.sin(p.h), rx = -fy, ry = fx;
    var tk = tanks.reduce(function (a, b) { return dist(a, p) < dist(b, p) ? a : b; });
    R.apron.push({ p: p, k: "fuel", from: { x: tk.x, y: tk.y }, to: { x: p.x - fx * T.len * 0.05 + rx * T.span * 0.32, y: p.y - fy * T.len * 0.05 + ry * T.span * 0.32 }, t0: R.clock });
  }
  // Vorfeld (nur Optik): Tankwagen vom nächsten Tank, Vorfeldbus vom Terminal, wenn kein Gate
  function apronJobs(p, st) {
    var T = TYPES[p.type], fx = Math.cos(p.h), fy = Math.sin(p.h), rx = -fy, ry = fx;
    if (p.fuelled) fuelJob(p);
    var tc = termCenter();
    if (tc && st && !(st.gate && st._term)) {
      var door = { x: p.x + fx * T.len * 0.3 - rx * (T.span * 0.12 + 5), y: p.y + fy * T.len * 0.3 - ry * (T.span * 0.12 + 5) };
      R.apron.push({ p: p, k: "bus", from: { x: tc.x, y: tc.y }, to: door, t0: R.clock + 1.5 });
    }
  }
  // Fluggäste pro Sekunde durch die Türen: Gate schneller als Bus, große Flieger haben mehr Türen
  function paxRate(p) {
    var st = byId(p.st), gate = st && st.gate && st._term;
    return (gate ? 14 : 8) * (1 + (p.cap - 120) / 280) * (1 + 0.15 * G.up.gh);
  }
  function turnaround(p, dt) {
    if (p.phase === "push") { p.t -= dt; if (p.t <= 0) pushback(p); return; }
    if (!p.docked) return;   // Ein- und Aussteigen nur, solange das Flugzeug angedockt steht
    if (p.noFuel && p.phase !== "fuel" && G.fuel >= (FUEL[p.type] || 2)) {   // Kerosin gekauft: Flugzeug tankt sofort
      var ready = p.phase === "board" && (p.boarded >= p.book || p.starve > 8);
      if (refuel(p)) { fuelJob(p); if (ready) { p.phase = "fuel"; p.t = 7; return; } }
    }
    var hasTerm = mods("term").length > 0;
    if (p.phase === "unload") {
      p.acc += paxRate(p) * dt;
      var k = Math.min(p.on, Math.floor(p.acc)); p.acc -= k; p.on -= k;
      if (k) { G.st.pax += k; arrivePax(k); }
      if (p.on <= 0) { p.phase = "clean"; p.t = 3 + p.cap / 80; p.acc = 0; if (p.paxIn) earn(p.paxIn * PAXFEE, p.x, p.y - 10, lang === "de" ? "Fluggastentgelt" : "Passenger fees", "pax"); }
    } else if (p.phase === "clean") {
      p.t -= dt; if (p.t <= 0) p.phase = "board";
    } else if (p.phase === "board") {
      p.acc += paxRate(p) * dt;
      var want = Math.min(p.book - p.boarded, Math.floor(p.acc));
      var have = hasTerm ? Math.min(want, R.tDep) : want;
      p.acc -= want; p.boarded += have; G.st.pax += have;
      if (hasTerm) R.tDep -= have;
      if (have === 0 && want > 0) p.starve += dt; else if (have > 0) p.starve = 0;
      if (p.boarded >= p.book || p.starve > 8) {
        if (!p.noFuel) depart(p);   // ohne Kerosin bleibt das Flugzeug stehen
      }
    } else if (p.phase === "fuel") {
      p.t -= dt; if (p.t <= 0) depart(p);
    }
  }
  function loadF() { return Math.min(1, 0.5 + Math.random() * 0.4 + G.rep / 1000); }

  // ---------- Landseite: Terminal, Busse, Autos ----------
  function termCenter() { var ts = mods("term"); if (!ts.length) return null; var x = 0, y = 0; ts.forEach(function (m) { x += m.x; y += m.y; }); return { x: x / ts.length, y: y / ts.length }; }
  function landMode() { if (!mods("term").length) return "none"; return mods("term").some(function (m) { return m._road; }) ? "road" : "walk"; }
  function busShare() { var n = mods("bus").filter(function (m) { return m._road; }).length; return n ? Math.min(0.65, 0.25 + 0.15 * n) : 0; }
  function taxiShare() { return mods("cab").some(function (m) { return m._road; }) ? 0.3 : 0; }
  // ---------- Kerosin: ein Tank reicht für etwa 100 Flüge (Mix aus kleinen und großen Fliegern) ----------
  var FUEL = { p: 1, n: 3, w: 8 }, TANKCAP = 300, FUELBUY = 3500, FUELSELL = 5600;
  function fuelCap() { return mods("tank").length * TANKCAP; }
  function fuelPct() { var c = fuelCap(); return c ? Math.max(0, Math.min(100, G.fuel / c * 100)) : 0; }
  // Kerosinpreis: Grundwelle (Periode 13 min, leicht verzerrt) garantiert in jedem 15-Minuten-Fenster
  // ein Hoch und ein Tief, Rauschen lässt ihn dazwischen schwanken. Zeit läuft in Echtzeit (G.fpt).
  // Marktrauschen: glatte Zufallskurve, je Kanal (k) eigener Verlauf, alles aus dem Spielstand-Seed
  function fpHash(i, k) { var v = Math.sin(i * 127.1 + (k || 0) * 311.7 + G.fps * 3.17) * 43758.5453; return v - Math.floor(v); }
  function fpNoise(x, k) { var i = Math.floor(x), f = x - i; f = f * f * (3 - 2 * f); var a = fpHash(i, k); return a + (fpHash(i + 1, k) - a) * f; }
  function fpN(x, k) { return fpNoise(x, k) * 2 - 1; }   // −1 … 1
  // Ölkrisen: nach 3 bis 10 Preiszyklen (je ca. 13 min) steigt der Preis 3–5 min stark, bleibt 5–10 min kritisch und beruhigt sich
  var CRISES = null, CRSEED = null;
  function crisisList(tt) {
    if (CRSEED !== G.fps) { CRSEED = G.fps; CRISES = []; }
    var rnd = function (n, k) { return fpHash(n * 7.3 + 0.5, 900 + k); };
    while (true) {
      var n = CRISES.length, prev = n ? CRISES[n - 1] : null;
      if (prev && prev.s > tt + 4000) break;
      var gap = (3 + Math.floor(rnd(n, 1) * 8)) * 780, st = (prev ? prev.e : 0) + gap;
      var up = 180 + rnd(n, 2) * 120, hold = 300 + rnd(n, 3) * 300, down = 150 + rnd(n, 4) * 150;
      CRISES.push({ s: st, a: st + up, b: st + up + hold, e: st + up + hold + down, k: 0.85 + rnd(n, 5) * 0.55 });
      if (CRISES.length > 400) break;
    }
    return CRISES;
  }
  function crisisAt(tt) {   // 0 … 1 (Stärke) und die Krise selbst
    if (tt <= 0) return null;
    var L = crisisList(tt);
    for (var i = 0; i < L.length; i++) {
      var c = L[i]; if (tt < c.s) return null; if (tt >= c.e) continue;
      var lv = tt < c.a ? (tt - c.s) / (c.a - c.s) : tt < c.b ? 1 : 1 - (tt - c.b) / (c.e - c.b);
      return { c: c, lv: lv * lv * (3 - 2 * lv) };
    }
    return null;
  }
  function fuelPriceAt(tt) {
    // Grundwelle mit unregelmäßigem Takt, darüber vier Rauschlinien unterschiedlicher Geschwindigkeit
    var u = Math.PI * 2 * (tt / 780) + 1.7 * fpNoise(tt / 900, 7) * Math.PI + G.fps;
    var v = 0.28 * Math.sin(u) + 0.22 * fpN(tt / 160, 1) + 0.14 * fpN(tt / 47, 2) + 0.07 * fpN(tt / 13, 3) + 0.035 * fpN(tt / 4, 4);
    var cr = crisisAt(tt), boost = 0;
    if (cr) boost = cr.c.k * cr.lv + cr.lv * 0.12 * fpN(tt / 9, 5);
    return Math.round(FUELBUY * Math.max(0.22, 1 + v) * (1 + boost) / 10) * 10;
  }
  function fuelPrice() { return fuelPriceAt(Math.floor(G.fpt || 0)); }
  // ---------- Aktienmarkt ----------
  // Kurse sind eine feste Funktion der Zeit (wie der Kerosinpreis): eigenes Rauschen je Aktie plus Abhängigkeit vom Ölpreis
  var STOCKS = CARRIERS.map(function (a, i) { return { id: a.id, n: a.n, k: "air", col: a.col, base: [64, 38, 52, 118, 27][i], vol: [0.2, 0.26, 0.22, 0.16, 0.3][i], beta: -0.42 }; }).concat([
    { id: "PNV", n: "Petronova", k: "oil", col: "#2C2F33", base: 142, vol: 0.18, beta: 0.5 },
    { id: "OKR", n: "Ölkrone AG", k: "oil", col: "#8A6A2B", base: 86, vol: 0.2, beta: 0.62 },
    { id: "DWE", n: "Deepwell Energy", k: "oil", col: "#1F5C6B", base: 47, vol: 0.27, beta: 0.7 },
    { id: "SFO", n: "Sandfire Oil", k: "oil", col: "#B5512A", base: 23, vol: 0.34, beta: 0.85 }
  ]);
  function stk(id) { return STOCKS.filter(function (q) { return q.id === id; })[0]; }
  function stockAt(q, tt) {
    var k = 20 + STOCKS.indexOf(q) * 6, oil = fuelPriceAt(tt) / FUELBUY - 1;
    var ln = q.vol * (1.1 * fpN(tt / 5200, k) + 0.9 * fpN(tt / 620, k + 1) + 0.5 * fpN(tt / 140, k + 2) + 0.25 * fpN(tt / 33, k + 3) + 0.1 * fpN(tt / 8, k + 4)) + q.beta * 0.55 * oil;
    (G.scrash || []).forEach(function (c) {   // Absturz: Kurs fällt binnen Sekunden auf den Tiefstand, Erholung dauert lange
      if (c.s !== q.id || tt < c.t) return;
      var a = tt - c.t, f = a < 25 ? a / 25 : a < 180 ? 1 : Math.exp(-(a - 180) / 1500);
      ln -= c.d * f;
    });
    return Math.max(0.5, Math.round(q.base * Math.exp(ln) * 100) / 100);
  }
  function stockNow(q) { return stockAt(q, Math.floor(G.fpt || 0)); }
  function eur2(v) { var n = v.toLocaleString(loc(), { minimumFractionDigits: 2, maximumFractionDigits: 2 }); return lang === "de" ? n + " €" : "€" + n; }
  function smDepot() {
    var v = 0, c = 0; STOCKS.forEach(function (q) { var h = (G.port || {})[q.id]; if (h && h.n) { v += h.n * stockNow(q); c += h.cost; } });
    return { v: v, g: v - c, c: c };
  }
  // Kerosinbörse am Tank: Regler auf Zielfüllstand, links verkaufen (zum Marktpreis −3 %), rechts kaufen
  var SELLBACK = 0.97;
  function fuelBack() { return Math.round(fuelPrice() * SELLBACK / 10) * 10; }
  function trCalc() {
    var r = document.getElementById("fh-tr"); if (!r) return null;
    var cap = fuelCap(), tgt = Math.round(+r.value / 100 * cap), d = tgt - Math.round(G.fuel);
    if (Math.abs(d) < 1) d = 0;
    return { r: r, cap: cap, pct: +r.value, d: d, buy: d > 0, sum: d > 0 ? d * fuelPrice() : -d * fuelBack() };
  }
  function trUpdate() {
    var q = trCalc(); if (!q) return;
    var cp = Math.round(fuelPct()), pe = function (v) { return v + "\u00a0%"; };
    q.r.style.setProperty("--cur", cp + "%"); q.r.style.setProperty("--a", Math.min(cp, q.pct) + "%"); q.r.style.setProperty("--b", Math.max(cp, q.pct) + "%"); q.r.classList.toggle("buy", q.d > 0); q.r.classList.toggle("sell", q.d < 0);
    set("fh-tr-pct", pe(q.pct)); set("fh-tr-now", fmt(t("trNow"), { p: pe(cp) }));
    set("fh-tr-pr", fmt(t("trPrice"), { b: eur(fuelPrice()), s: eur(fuelBack()) }));
    var sum = document.getElementById("fh-tr-sum"), b = document.getElementById("fh-tr-btn"), poor = q.buy && q.sum > G.money;
    set("fh-tr-desc", q.d === 0 ? "" : fmt(t(q.buy ? "trBuyD" : "trSellD"), { a: pe(cp), b: pe(q.pct) }));
    sum.textContent = q.d === 0 ? "" : (q.buy ? "−" : "+") + eur(q.sum); sum.className = "sum " + (q.d > 0 ? "buy" : "sell");
    b.textContent = q.d === 0 ? t("trMove") : poor ? t("trPoor") : (q.buy ? t("trBuy") : t("trSell")) + " · " + eurS(q.sum);
    b.className = q.d > 0 ? "buy" : q.d < 0 ? "sell" : ""; b.setAttribute("aria-disabled", String(q.d === 0 || poor));
  }
  function logTrade(k, pr) { (G.trades || (G.trades = [])).push({ t: Math.floor(G.fpt || 0), p: pr, k: k }); if (G.trades.length > 40) G.trades.shift(); }
  function trDo() {
    var q = trCalc(); if (!q || q.d === 0) return;
    if (q.buy) { if (q.sum > G.money) { msg(t("poor")); return; } G.money -= q.sum; G.fuel += q.d; logTrade("b", fuelPrice()); msg(t("fuelBought") + " · " + eurS(q.sum), true); }
    else { G.money += q.sum; finAdd("trade", q.sum); G.fuel = Math.max(0, G.fuel + q.d); logTrade("s", fuelBack()); msg(t("trDone") + " · +" + eurS(q.sum), true); }
    save(); updatePanel(true); updateSel(); fpDraw(true);
  }
  function fillFuel() {
    var cap = fuelCap(); if (!cap) return;
    var miss = cap - G.fuel; if (miss < 0.5) { msg(t("fuelFull")); return; }
    var pr = fuelPrice(), buy = Math.min(miss, Math.floor(G.money / pr)); if (buy <= 0) { msg(t("poor")); return; }
    G.fuel += buy; G.money -= buy * pr; logTrade("b", pr); save(); msg(t("fuelBought") + " · " + eurS(buy * pr), true); updatePanel(true); updateSel(); fpDraw(true);
  }
  // Verkaufspreis folgt dem Markt mit Aufschlag: im Tief eingekauft und im Hoch verkauft lohnt sich am meisten
  function fuelSellAt(tt) { return Math.round((fuelPriceAt(tt) * 1.25 + 1200) / 10) * 10; }
  function fuelSell() { return fuelSellAt(Math.floor(G.fpt || 0)); }
  function fuelOut() { return fuelCap() > 0 && G.fuel < 1; }
  // Jedes Flugzeug tankt: klein 1, mittel 3, groß 8 Einheiten. Ohne Tanks übernimmt ein externer Lieferant (keine Einnahmen).
  function refuel(p) {
    if (!mods("tank").length) { p.noFuel = false; return true; }
    var need = FUEL[p.type] || 2;
    if (G.fuel >= need) {
      var pr = fuelSell(); G.fuel -= need; p.fuelled = true; p.noFuel = false; earn(need * pr, p.x, p.y + 12, t("fuelSold"), "fuel");
      (R.fuelLog || (R.fuelLog = [])).push({ cs: p.cs, k: p.type, u: need, e: need * pr, t: G.fpt || 0 }); if (R.fuelLog.length > 60) R.fuelLog.shift();
      fpDraw(true); return true;
    }
    p.noFuel = true;
    if (R.clock - (R.fuelMsg || -99) > 30) { R.fuelMsg = R.clock; msg(t("fuelEmpty")); G.rep = Math.max(0, G.rep - 0.5); }
    return false;
  }
  // ---------- Terminal: modernes Terminal mit Shops und Lounges ----------
  var TUP = { tmod: 2000000, tshop: 800000, tlng: 1200000 };
  function termLvl(m) { return m.lvl || 1; }
  function bizShare() { var n = mods("term").filter(function (m) { return termLvl(m) >= 2 && m.lounge; }).length; return Math.min(0.32, 0.05 + 0.07 * n); }
  function shopTick(dt) {
    var ts = mods("term"), sh = ts.filter(function (m) { return termLvl(m) >= 2 && m.shops; });
    if (!sh.length) return;
    // je mehr Menschen im Terminal warten, desto mehr wird gekauft
    R.shopAcc += termPax() * 0.32 * (sh.length / ts.length) * (1 + 0.15 * G.up.ext) * dt;
    R.shopT += dt;
    if (R.shopT >= 8 && R.shopAcc >= 1) { var m = sh[Math.floor(Math.random() * sh.length)]; earn(R.shopAcc, m.x, m.y - 14, t("shopsW"), "shop"); R.shopAcc = 0; R.shopT = 0; }
  }
  // ---------- Hotels: Ankommende mit Anschlussflug übernachten und fliegen danach weiter ----------
  function hotelCap(m) { return (HOTELS[m.t] || HOTELS.hotel).cap; }
  function hotelShare() { return Math.min(0.3, hotels().filter(function (m) { return m._road; }).reduce(function (a, m) { return a + HOTELS[m.t].sh; }, 0)); }
  function hotelTick(dt) {
    var hs = hotels().filter(function (m) { return m._road; });
    if (!hs.length) { R.tArrCar += R.hotelQ; R.hotelQ = 0; return; }
    while (R.hotelQ > 0) {
      var free = hs.filter(function (m) { return hotelGuests(m) < hotelCap(m); }); if (!free.length) { R.tArrCar += R.hotelQ; R.hotelQ = 0; break; }
      var m = free[Math.floor(Math.random() * free.length)], g = Math.min(R.hotelQ, 1 + Math.floor(Math.random() * 3), hotelCap(m) - hotelGuests(m));
      (R.hotel[m.id] || (R.hotel[m.id] = [])).push({ n: g, stay: 80 + Math.random() * 120, paid: 0 }); R.hotelQ -= g;
    }
    hs.forEach(function (m) {
      var list = R.hotel[m.id]; if (!list) return;
      for (var i = list.length - 1; i >= 0; i--) {
        var q = list[i]; q.stay -= dt; q.paid += q.n * 2.2 * dt;
        if (q.stay <= 0) { earn(Math.round(q.paid + q.n * 90), m.x, m.y - 16, t("hotelPay"), "hotel"); R.tDep += q.n; list.splice(i, 1); }
      }
    });
  }
  // Auf welcher Seite (lokal +y oder -y) liegt die Straße? Für den Parkplatz vor dem großen Hotel
  function hotelRS(m) {
    if (m._rs !== undefined && m._rsN === G.mods.length) return m._rs;
    var best = 1e9, sg = 1, ax = -Math.sin(m.a), ay = Math.cos(m.a);
    mods("road").forEach(function (r) { var pr = segProj(m, { x: r.x1, y: r.y1 }, { x: r.x2, y: r.y2 }); if (pr.d < best) { best = pr.d; sg = (pr.q.x - m.x) * ax + (pr.q.y - m.y) * ay >= 0 ? 1 : -1; } });
    m._rs = sg; m._rsN = G.mods.length; return sg;
  }
  function hotelGuests(m) { return (R.hotel[m.id] || []).reduce(function (a, q) { return a + q.n; }, 0); }
  function termPax() { return R.tDep + R.tArrBus + R.tArrCar + R.tArrWalk + (R.tArrTaxi || 0); }
  function bookTrips(n) {
    var mode = landMode();
    if (mode === "none") return;
    if (mode === "walk") { R.walkIn += n; return; }
    var b = Math.round(n * busShare()); R.depBus += b; n -= b;
    var x = Math.round(n * taxiShare() * 0.6); R.depTaxi = (R.depTaxi || 0) + x; n -= x;
    while (n > 0) { var g = Math.min(n, 1 + Math.floor(Math.random() * 4)); n -= g; R.depCarQ.push({ n: g, t: Math.random() * 30 }); }
  }
  function arrivePax(n) {
    var mode = landMode();
    if (mode === "none") return;
    if (mode === "walk") { R.tArrWalk += n; return; }
    // kleine Gruppen: zufällig aufteilen, sonst rundet der Busanteil immer auf null
    var ho = Math.min(n, Math.floor(n * hotelShare() + Math.random())); R.hotelQ += ho; n -= ho;
    var b = Math.min(n, Math.floor(n * busShare() + Math.random())), x = Math.min(n - b, Math.floor((n - b) * taxiShare() + Math.random()));
    R.tArrBus += b; R.tArrTaxi = (R.tArrTaxi || 0) + x; R.tArrCar += n - b - x;
  }
  var LOT = 16;
  function spotPos(m, i) {
    var w = SIZE.park[0], h = SIZE.park[1], r = Math.floor(i / 8), j = i % 8, A = axes(m.a);
    var lx = -w / 2 + 8 + j * 8, ly = -h / 2 + 11 + r * 23;
    return { x: m.x + A.ux * lx + A.vx * ly, y: m.y + A.uy * lx + A.vy * ly };
  }
  function lotEntry(m) {
    var q = m._accPt, dx = q.x - m.x, dy = q.y - m.y, l = Math.hypot(dx, dy) || 1, A = axes(m.a);
    var dn = Math.abs(dx * A.vx + dy * A.vy) / l, du = Math.abs(dx * A.ux + dy * A.uy) / l;
    var sz = SIZE[m.t] || SIZE.park, r = du > dn ? sz[0] / 2 : sz[1] / 2;
    return { x: m.x + dx / l * (r + 2), y: m.y + dy / l * (r + 2) };
  }
  function lotSpots(m) { return R.spots[m.id] || (R.spots[m.id] = []); }
  function lotUsed(m) { return lotSpots(m).filter(function (x) { return x; }).length; }   // reserviert (inkl. Anfahrt)
  function lotParked(m) { return R.veh.filter(function (v) { return v.lot === m.id && v.state === "parked"; }).length; }   // tatsächlich geparkt
  function freeLot() {
    var opts = [];
    mods("park").forEach(function (m) { if (!m._road) return; var sp = lotSpots(m); for (var i = 0; i < LOT; i++) if (!sp[i]) opts.push({ m: m, i: i }); });
    mods("road").forEach(function (m) { if (!m._park) return; var sp = lotSpots(m); for (var i = 0; i < m._spots; i++) if (!sp[i]) opts.push({ m: m, i: i }); });
    return opts.length ? opts[Math.floor(Math.random() * opts.length)] : null;
  }
  var CARS = ["#E7E9E4", "#2B2E2B", "#9A540A", "#5C6E80", "#B33A2E", "#D9D4C5", "#3F6B8F"];
  function vehicle(kind, pts, onEnd) {
    var v = { kind: kind, x: pts[0].x, y: pts[0].y, h: Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x), alt: 0, path: pts, pi: 0, onEnd: onEnd,
      c: CARS[Math.floor(Math.random() * CARS.length)], n: 0, len: kind === "bus" ? 24 : 8.5, wt: 0, id: ++R.id };
    R.veh.push(v); return v;
  }
  function dropVeh(v) {
    if (v.lot && !v.lotFree) { var lm = byId(v.lot); if (lm && R.spots[lm.id]) R.spots[lm.id][v.spot] = false; v.lotFree = true; }   // Platz nicht dauerhaft blockieren
    var i = R.veh.indexOf(v); if (i >= 0) R.veh.splice(i, 1);
  }
  function shuffled(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
  // Weg von einem Ende der Landstraße zur Zufahrt und von dort zu einem Ende zurück
  function spawnFree(p) { return !R.veh.some(function (v) { return (v.path || v.state === "curb") && Math.abs(v.x - p.x) < 20 && Math.abs(v.y - p.y) < 20; }); }
  function tripVia(a, b) {
    var ends = shuffled(RNET.ends).filter(function (e) { return spawnFree(RNET.N[e]); }), inP = null, outP = null;
    for (var i = 0; i < ends.length && !inP; i++) inP = rpath(ends[i], a);
    ends = shuffled(RNET.ends);
    for (var k = 0; k < ends.length && !outP; k++) outP = rpath(b, ends[k]);
    return inP && outP ? { inP: speeds(inP, 20), outP: speeds(outP, 45) } : null;
  }
  function trip(acc, bus) {
    var ends = shuffled(RNET.ends).filter(function (e) { return spawnFree(RNET.N[e]); }), inP = null, outP = null, e0 = -1;
    for (var i = 0; i < ends.length && !inP; i++) { inP = rpath(ends[i], acc, bus); e0 = ends[i]; }
    ends = shuffled(RNET.ends);
    var outs = ends.filter(function (e) { return e !== e0; }).concat([e0]);
    for (var k = 0; k < outs.length && !outP; k++) outP = rpath(acc, outs[k], bus);
    return inP && outP ? { inP: speeds(inP, 10), outP: speeds(outP, 45) } : null;
  }
  // Geschwindigkeit je Punkt: Landstraße 45, sonst 32, am Ende langsam
  function speeds(pts, endS) { return pts.map(function (p, i) { return { x: p.x, y: p.y, r: p.r, s: i === pts.length - 1 ? endS : p.s || 45 }; }); }
  // Auto bringt (dep) oder holt (arr) n Fluggäste
  function carTrip(n, dir) {
    R.lastDir = dir;
    // Viele lassen sich nur vorfahren (Kiss & Fly) oder werden am Bordstein abgeholt, die anderen parken
    var lot = Math.random() < (dir === "dep" ? 0.4 : 0.35) ? freeLot() : null;
    if (lot && lot.m.t === "road") {   // Schrägparken an der Einbahnstraße
      var rm = lot.m, sp = roadSpot(rm, lot.i), tv = tripVia(rm._sN, rm._eN); if (!tv) return false;
      lotSpots(rm)[lot.i] = true;
      var rv = vehicle("car", tv.inP.concat([{ x: sp.lane.x, y: sp.lane.y, s: 10, r: 1 }, { x: sp.c.x, y: sp.c.y, s: 5 }]), function () {
        rv.h = sp.h; rv.state = "parked";
        if (dir === "dep") { R.tDep += n; rv.stay = 420 + Math.random() * 240; rv.dep = true; rv.own = n; }
        else { var k = Math.min(n, R.tArrCar); R.tArrCar -= k; R.pickRes -= n; rv.n = k; rv.stay = 5 + Math.random() * 6; }
      });
      rv.lot = rm.id; rv.spot = lot.i; rv.back = [sp.c, { x: sp.back.x, y: sp.back.y, r: 1 }].concat(tv.outP);
      return true;
    }
    if (lot) {
      var m = lot.m, tr = trip(m._acc); if (!tr) return false;
      var E = lotEntry(m), S = spotPos(m, lot.i);
      lotSpots(m)[lot.i] = true;
      var v = vehicle("car", tr.inP.concat([{ x: E.x, y: E.y, s: 8 }, { x: S.x, y: S.y, s: 5 }]), function () {
        v.h = m.a + Math.PI / 2; v.state = "parked";
        if (dir === "dep") { R.tDep += n; v.stay = 420 + Math.random() * 240; v.dep = true; v.own = n; }
        else { var k = Math.min(n, R.tArrCar); R.tArrCar -= k; R.pickRes -= n; v.n = k; v.stay = 5 + Math.random() * 6; }
      });
      v.lot = m.id; v.spot = lot.i; v.back = [S, E].concat(tr.outP);
      return true;
    }
    var tm = mods("term").filter(function (q) { return q._road; })[0]; if (!tm) return false;
    var tr2 = trip(tm._acc); if (!tr2) return false;
    // Halten auf dem Seitenstreifen vor dem Terminal, verteilt auf die Länge der Vorfahrt
    var ip = tr2.inP, A2 = ip[ip.length - 1], B2 = ip.length > 1 ? ip[ip.length - 2] : A2, sl = dist(A2, B2), back2 = sl > 6 ? Math.random() * Math.min(50, sl - 4) : 0;
    var stop = sl > 0 ? { x: A2.x + (B2.x - A2.x) / sl * back2, y: A2.y + (B2.y - A2.y) / sl * back2, r: 1, s: 8 } : A2;
    var v2 = vehicle("car", ip.slice(0, -1).concat([stop]), function () {
      v2.state = "curb"; v2.stay = 1 + Math.random() * 1.5;
      if (dir === "dep") R.tDep += n; else { var k = Math.min(n, R.tArrCar); R.tArrCar -= k; R.pickRes -= n; }
    });
    v2.out = [{ x: A2.x, y: A2.y, r: 1, s: 30 }].concat(tr2.outP.slice(1));
    return true;
  }
  function leave(v) {
    v.state = "";
    if (v.lot) {
      var m = byId(v.lot);
      if (m) lotSpots(m)[v.spot] = false; v.lotFree = true;
      earn(Math.max(5, Math.round(v.parkT || 0) * PARKFEE), v.x, v.y, "", "land");
      var b = v.back;
      v.path = [{ x: v.x, y: v.y, s: 5, back: 1 }, { x: b[1].x, y: b[1].y, s: 8, back: 1 }].concat(b.slice(2));
    } else v.path = [{ x: v.x, y: v.y, s: 8, r: 1 }].concat(v.out);
    v.pi = 0; v.onEnd = dropVeh;
  }
  // Abstand halten: wer vor einem steht, bremst. Gegenseitiges Blockieren an Kreuzungen löst sich nach kurzer Zeit.
  function follow(dt) {
    var vs = R.veh.filter(function (v) { return v.path; });   // wer am Bordstein hält, steht auf dem Seitenstreifen
    vs.forEach(function (v) {
      var nx = v.path && v.path[v.pi + 1], off = nx && nx.r === -1 ? -3.5 : nx && nx.r ? 3.5 : 0;
      v.px = v.x - Math.sin(v.h) * off; v.py = v.y + Math.cos(v.h) * off;
    });
    vs.forEach(function (v) {
      v.lim = undefined;
      if (!v.path) return;
      if (v.ghost > 0) { v.ghost -= dt; return; }
      var nx = v.path[v.pi + 1]; if (!nx) return;
      if (nx.back) return;
      var ch = Math.cos(v.h), sh = Math.sin(v.h), lim = Infinity, cross = false;
      for (var i = 0; i < vs.length; i++) {
        var u = vs[i]; if (u === v) continue;
        var dx = u.px - v.px, dy = u.py - v.py; if (dx > 46 || dx < -46 || dy > 46 || dy < -46) continue;
        var al = dx * ch + dy * sh, la = -dx * sh + dy * ch, gap = (v.len + u.len) / 2 + 3;
        if (Math.abs(al) < 0.8 && Math.abs(la) < 3.3) { if (u.id < v.id) lim = 0; continue; }   // genau übereinander: der Jüngere wartet
        if (al <= 0 || al > gap + 16 || Math.abs(la) > 3.3) continue;
        var same = Math.cos(u.h - v.h) > 0.35;
        if (same) lim = Math.min(lim, Math.max(0, (al - gap) * 3));
        else if (al < gap + 5 && (u.id < v.id || !u.path || (u.lim !== undefined && u.lim < 2 && u.wt < v.wt))) cross = true;   // Kreuzung: wer zuerst da war, fährt
      }
      if (cross) lim = 0;
      v.lim = lim === Infinity ? undefined : lim;
      if (v.lim !== undefined && v.lim < 2) { v.wt += dt; if (v.wt > 9) { v.ghost = 1.2; v.wt = 0; } } else v.wt = 0;
    });
  }
  // ---------- Taxis ----------
  // Taxis kommen über die Landstraße, bringen Abfliegende mit, warten in einer Bucht am Taxistand und nehmen Ankommende mit
  var BAYS = 4;
  function bayPos(m, i) { var A = axes(m.a), lx = -SIZE.cab[0] / 2 + 9 + i * 14.5; return { x: m.x + A.ux * lx, y: m.y + A.uy * lx }; }
  function taxis(dt) {
    var ranks = mods("cab").filter(function (m) { return m._road; });
    if (!ranks.length) { R.tArrCar += R.tArrTaxi || 0; R.tArrTaxi = 0; if (R.depTaxi) { R.depCarQ.push({ n: R.depTaxi, t: 0 }); R.depTaxi = 0; } return; }
    var tcap = ranks.length * 24; if ((R.tArrTaxi || 0) > tcap) { R.tArrCar += R.tArrTaxi - tcap; R.tArrTaxi = tcap; }   // zu lange Schlange: Rest nimmt das Auto
    R.taxiT = (R.taxiT || 0) - dt;
    if (R.taxiT > 0) return;
    R.taxiT = 0.6;
    var fleet = R.veh.filter(function (v) { return v.kind === "taxi" && !v.leaving; }), seats = fleet.length * 3;
    if ((R.tArrTaxi || 0) <= seats && !(R.depTaxi > 0)) return;
    if (R.veh.filter(function (v) { return v.kind === "taxi"; }).length >= 30) return;
    var opts = [];
    ranks.forEach(function (m) { var b = R.bays[m.id] || (R.bays[m.id] = []); for (var i = 0; i < BAYS; i++) if (!b[i]) opts.push({ m: m, i: i }); });
    if (!opts.length) return;
    var o = opts[Math.floor(Math.random() * opts.length)], m = o.m, tr = trip(m._acc); if (!tr) return;
    var E = lotEntry(m), B = bayPos(m, o.i), drop = Math.min(R.depTaxi || 0, 1 + Math.floor(Math.random() * 3));
    R.depTaxi -= drop; R.bays[m.id][o.i] = true;
    var v = vehicle("taxi", tr.inP.concat([{ x: E.x, y: E.y, s: 8 }, { x: B.x, y: B.y, s: 5 }]), function () {
      v.h = m.a; v.state = "taxi"; v.wait = 0; R.tDep += drop;
    });
    v.rank = m.id; v.bay = o.i; v.back = [B, E].concat(tr.outP); v.c = "#F2C230";
  }
  function taxiWait(v, dt) {
    v.wait += dt;
    if (v.wait < 1.2) return;
    var avail = Math.min(R.tArrTaxi || 0, 1 + Math.floor(Math.random() * 4));
    if (avail > 0 || v.wait > 45) {
      R.tArrTaxi = Math.max(0, (R.tArrTaxi || 0) - avail); v.n = avail;
      if (avail) earn(TAXIFEE, v.x, v.y, "", "land");
      var b = R.bays[v.rank]; if (b) b[v.bay] = false;
      v.state = ""; v.leaving = true;
      v.path = [{ x: v.x, y: v.y, s: 5, back: 1 }, { x: v.back[1].x, y: v.back[1].y, s: 8, back: 1 }].concat(v.back.slice(2)); v.pi = 0; v.onEnd = dropVeh;
    }
  }
  function landside(dt) {
    var mode = landMode(), stops = mods("bus").filter(function (m) { return m._road; });
    // Durchgangsverkehr auf der Landstraße
    R.thruT = (R.thruT || 0) - dt;
    var ends = RNET ? RNET.ends : [];
    if (ends.length >= 2 && R.thruT <= 0) {
      R.thruT = 2.6 + Math.random() * 2.4;
      var sh = shuffled(ends), pa = rpath(sh[0], sh[1]);
      if (pa && spawnFree(RNET.N[sh[0]]) && R.veh.filter(function (v) { return v.thru; }).length < 30) { var tv = vehicle("car", speeds(pa, 45), dropVeh); tv.thru = true; }
    }
    if (mode !== "road") { // zu Fuß: ohne Anbindung an die Landstraße gehen alle direkt rein und raus
      R.accW += 8 * dt;
      var k = Math.floor(R.accW); R.accW -= k;
      var a = Math.min(k, R.walkIn + R.depBus); R.walkIn = Math.max(0, R.walkIn - a); R.tDep += a;
      R.tArrWalk = Math.max(0, R.tArrWalk + R.tArrBus + R.tArrCar + (R.tArrTaxi || 0) - k); R.tArrBus = R.tArrCar = R.tArrTaxi = 0;
      if (R.depTaxi) { R.walkIn += R.depTaxi; R.depTaxi = 0; }
      R.depCarQ.forEach(function (q) { R.walkIn += q.n; }); R.depCarQ = [];
    } else {
      if (R.walkIn) { R.tDep += R.walkIn; R.walkIn = 0; }
      if (R.tArrWalk) { R.tArrCar += R.tArrWalk; R.tArrWalk = 0; }
      R.depCarQ.forEach(function (q) { q.t -= dt; });
      // Ankommende gehen zu einem geparkten Auto, das andere Fluggäste vorher abgestellt haben
      var freeArr = R.tArrCar - R.pickRes;
      if (freeArr > 0) R.veh.forEach(function (v) {
        if (freeArr <= 0 || v.state !== "parked" || !v.dep || v.claim || (v.parkT || 0) < 20) return;
        var k = Math.min(v.own || 1, freeArr); freeArr -= k; R.tArrCar -= k; v.n = k; v.claim = true; v.stay = 3 + Math.random() * 4;
      });
      R.spawnCar -= dt;
      var cars = R.veh.filter(function (v) { return v.kind === "car" && v.path && !v.thru; }).length;
      var budget = 0;
      while (R.spawnCar <= 0) { R.spawnCar += 0.22; budget++; }
      // Wer keinen Platz auf der Straße findet, wartet: so entstehen Rückstaus statt endloser Autoschlangen
      for (var bq = 0; bq < budget && cars < 130; bq++, cars++) {
        var i = R.depCarQ.findIndex(function (q) { return q.t <= 0; });
        var wantArr = R.tArrCar - R.pickRes > 0;
        R.alt = !R.alt;   // abwechselnd bringen und abholen, damit Ankommende nicht ewig warten
        if (i >= 0 && (!wantArr || R.alt)) { if (carTrip(R.depCarQ[i].n, "dep")) R.depCarQ.splice(i, 1); else R.depCarQ[i].t = 1; }
        else if (wantArr) { var n = Math.min(R.tArrCar - R.pickRes, 1 + Math.floor(Math.random() * 5)); R.pickRes += n; if (!carTrip(n, "arr")) R.pickRes -= n; }
        else break;
      }
      if (stops.length) {
        R.accS += 10 * dt;
        var w = Math.min(R.tArrBus, Math.floor(R.accS)); R.accS -= Math.floor(R.accS); R.tArrBus -= w;
        for (var j = 0; j < w; j++) { var s0 = stops.reduce(function (a2, b2) { return (R.stopW[a2.id] || 0) <= (R.stopW[b2.id] || 0) ? a2 : b2; }); if ((R.stopW[s0.id] || 0) >= 150) R.tArrCar++; else R.stopW[s0.id] = (R.stopW[s0.id] || 0) + 1; }
      } else { R.tArrCar += R.tArrBus; R.tArrBus = 0; while (R.depBus > 0) { var g0 = Math.min(R.depBus, 2); R.depCarQ.push({ n: g0, t: 0 }); R.depBus -= g0; } }
      taxis(dt);
      hotelTick(dt);
      stops.forEach(function (st) {
        if (R.busT[st.id] === undefined) R.busT[st.id] = 3 + Math.random() * 6;
        R.busT[st.id] -= dt;
        if (R.busT[st.id] > 0) return;
        var backlog = R.depBus / stops.length + (R.stopW[st.id] || 0);
        R.busT[st.id] = backlog > 100 ? 4 + Math.random() * 2 : backlog > 40 ? 7 + Math.random() * 2 : backlog > 0 ? 11 + Math.random() * 4 : 20 + Math.random() * 6;
        if (R.veh.filter(function (v) { return v.kind === "bus" && v.stop === st.id; }).length >= 4) return;
        var tr = trip(st._acc, true); if (!tr) { R.busT[st.id] = 1; return; }
        var bus = vehicle("bus", tr.inP, function () {
          var drop = Math.min(50, R.depBus), wt = R.stopW[st.id] || 0, pick = Math.min(50, wt);
          R.depBus -= drop; R.tDep += drop; R.stopW[st.id] = wt - pick;
          if (drop + pick) earn((drop + pick) * BUSFARE, st.x, st.y + 10, "", "land");
          bus.n = pick; bus.drop = drop; bus.state = "curb"; bus.stay = 3;
          if (drop || pick) R.fx.push({ x: st.x, y: st.y - 16, t: 0, txt: "+" + drop + " / −" + pick, col: "#CFE3F0" });
        });
        bus.out = tr.outP; bus.stop = st.id;
      });
    }
    follow(dt);
    R.veh.slice().forEach(function (v) {
      if (v.path) move(v, dt);
      else if (v.state === "parked" || v.state === "curb") { v.stay -= dt; if (v.state === "parked") v.parkT = (v.parkT || 0) + dt; if (v.stay <= 0) leave(v); }
      else if (v.state === "taxi") taxiWait(v, dt);
    });
  }

  function depRunway(st, type) {
    var rws = mods("runway"), order = rws.length > 1 ? [rws[1], rws[0]] : rws;
    for (var i = 0; i < order.length; i++) {
      var rw = order[i], e = rwEnds(rw);
      if (type && !rwFits(rw, type)) continue;
      var js = (rw._junc || []).slice().sort(function (a, b) { return a.d - b.d; });
      var need = type ? TYPES[type].need * 0.8 : 200;
      for (var k = 0; k < js.length; k++) {
        if (e.L - js[k].d < need) continue;
        var pa = path(st._pn, js[k].n);
        if (pa) return { rw: rw, j: js[k], pa: pa };
      }
    }
    return null;
  }
  function polyCum(pts) { var c = [0]; for (var i = 1; i < pts.length; i++) c.push(c[i - 1] + dist(pts[i - 1], pts[i])); return c; }
  function pointAt(pts, c, d) {
    d = Math.max(0, Math.min(c[c.length - 1], d));
    for (var i = 1; i < pts.length; i++) if (c[i] >= d) {
      var f = (d - c[i - 1]) / ((c[i] - c[i - 1]) || 1);
      return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * f, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * f };
    }
    return { x: pts[pts.length - 1].x, y: pts[pts.length - 1].y };
  }
  function sub(pts, c, d0, d1, s) {
    var a = pointAt(pts, c, d0), out = [{ x: a.x, y: a.y, s: s }];
    for (var i = 0; i < pts.length; i++) if (c[i] > d0 + 0.5 && c[i] < d1 - 0.5) out.push({ x: pts[i].x, y: pts[i].y, s: pts[i].s || s, back: pts[i].back, ev: pts[i].ev });
    var b = pointAt(pts, c, d1); out.push({ x: b.x, y: b.y, s: s });
    return out;
  }

  function depart(p) {
    var st = byId(p.st), T = TYPES[p.type], s = stats();
    var gate = st && st.gate && st._term;
    p.depLF = p.boarded / p.cap;
    earn(T.rev * 0.2 * p.depLF * (gate ? 1 : 0.6) * (1 + 0.15 * G.up.ext) * (p.revF || 1) + p.boarded * bizShare() * 150 + p.boarded * (PAXFEE + (mods("term").length ? SHOP * (1 + 0.15 * G.up.ext) : 0)), p.x, p.y - 14);
    G.rep = Math.min(100, G.rep + (gate ? 1 : 0.4) + (s.fire >= 2 ? 0.2 : 0));
    p.docked = false; p.phase = "push"; p.t = 0;
  }
  // Zurückschieben erst, wenn der Rollweg vor der Position frei ist
  function pushback(p) {
    var st = byId(p.st), T = TYPES[p.type];
    var plan = st && depRunway(st, p.type), sid = p.st;
    if (plan && st._entry) {
      var busy = R.planes.some(function (o) {
        if (o === p || (o.alt || 0) > 0.05 || o.state === "hold" || o.state === "park") return false;
        return dist(o, st._entry) < (T.len + TYPES[o.type].len) / 2 + 30;
      });
      if (busy) { p.t = 0.8; return; }
    }
    p.phase = "";
    if (!plan) { // kein Weg mehr: Flieger wird abgeschleppt
      R.occ[sid] = null; R.planes.splice(R.planes.indexOf(p), 1); return;
    }
    var pa = plan.pa, full = [{ x: pa[0].x, y: pa[0].y, s: 10 }];
    full.push({ x: pa[1].x, y: pa[1].y, s: 12, back: 1, ev: function () { R.occ[sid] = null; } });
    for (var i = 2; i < pa.length; i++) full.push({ x: pa[i].x, y: pa[i].y, s: 40 });
    p.full = full; p.cum = polyCum(full); p.rwId = plan.rw.id; p.jd = plan.j.d;
    var q = R.q[p.rwId] || (R.q[p.rwId] = []);
    var inbound = R.planes.filter(function (o) { return o !== p && o.state === "out" && o.rwId === p.rwId; }).length;
    var T2 = p.cum[p.cum.length - 1];
    p.dEnd = 26 + 30 * (q.length + inbound);
    p.state = "out";
    // erster Abschnitt rückwärts (Pushback), dann bis zum Rollhalt
    p.path = full.slice(0, 2).concat(sub(full, p.cum, p.cum[1], Math.max(p.cum[1], T2 - p.dEnd), 40).slice(1));
    p.pi = 0;
    p.onEnd = function () { p.state = "wait"; q.push(p); };
  }
  function launch(p, rwm) {
    var r = rwState(rwm), e = rwEnds(rwm);
    take(r, p, "d"); p.state = "dep";
    var T2 = p.cum[p.cum.length - 1];
    var pts = sub(p.full, p.cum, T2 - p.dEnd, T2, 14);
    pts[0] = { x: p.x, y: p.y, s: 12 };
    var jd = p.jd, rem = e.L - jd, lo = Math.max(110, Math.min(rem - 60, TYPES[p.type].heavy ? 300 : 230));
    var P = function (d) { return { x: e.A.x + e.dx * d, y: e.A.y + e.dy * d }; };
    var j = P(jd + 12), l1 = P(jd + lo), l2 = P(jd + lo + 50), l3 = P(jd + lo + 800);
    pts.push({ x: j.x, y: j.y, s: 14 });
    p.soon = false;
    pts.push({ x: l1.x, y: l1.y, s: 90, ev: function () {
      if (Math.random() < CRASHP) { crash(p); return; }
      p.soon = true;
      earn(TYPES[p.type].rev * 0.4 * p.depLF * (p.revF || 1), p.x, p.y); movement();
      var h = one("hangar");
      if (h && Math.random() < 0.2 * h.lvl) { earn(TYPES[p.type].rev * 2, h.x, h.y, t("maint"), "maint"); R.hangarT = 14; R.hangarType = p.type; }
    } });
    pts.push({ x: l2.x, y: l2.y, a: 0.25, s: 95, ev: function () { release(r); } });
    var dr = depRoute(rwm, l2);
    dr.forEach(function (q, i) { pts.push({ x: q.x, y: q.y, a: 0.25 + 1.15 * (i + 1) / dr.length, s: 100 + 10 * (i + 1) / dr.length }); });
    void l3;
    p.path = pts; p.pi = 0;
    p.onEnd = function () { R.planes.splice(R.planes.indexOf(p), 1); };
  }

  function schedule() {
    var rws = mods("runway");
    if (!rws.length || opsBlocked()) return;   // Absturz: nichts startet, nichts landet
    var r0 = rwState(rws[0]), storm = stormOn();
    // Abflüge je Piste
    rws.forEach(function (rw) {
      var q = R.q[rw.id];
      if (!q || !q.length || storm) return;   // bei Unwetter warten die Abflüge am Rollhalt
      var r = rwState(rw), p = q[0];
      if (p.path || !rwSoon(r)) return;
      if (rws.length === 1 && r.last === "d" && arrivalPossible()) return;
      q.shift(); launch(p, rw);
      q.forEach(function (o, k) { // aufrücken
        var nd = 26 + 30 * k, T2 = o.cum[o.cum.length - 1];
        if (o.path || nd >= o.dEnd - 1) return;
        o.path = sub(o.full, o.cum, T2 - o.dEnd, T2 - nd, 16); o.pi = 0; o.path[0] = { x: o.x, y: o.y, s: 16 };
        o.dEnd = nd; o.onEnd = null;
      });
    });
    // Ankünfte: bevorzugt auf der ersten Piste, sonst auf jeder Piste, von der die Position erreichbar ist
    if (!R.holdQ.length) return;
    var q0 = R.q[rws[0].id];
    if (rws.length === 1 && (!rwSoon(r0) || (r0.last === "a" && q0 && q0.length && !q0[0].path))) return;
    var order = R.holdQ.slice().sort(function (a, b) { return (TYPES[b.type].heavy ? 1 : 0) - (TYPES[a.type].heavy ? 1 : 0); });   // Großraumjets zuerst
    for (var oi = 0; oi < order.length; oi++) {
      var h = order[oi], i = R.holdQ.indexOf(h), cands = standsFor(h.type);
      for (var ci = 0; ci < cands.length; ci++) {
        var st = cands[ci]; if (!depRunway(st, h.type)) continue;
        for (var ri = 0; ri < rws.length; ri++) {
          var rw = rws[ri]; if (!rwFits(rw, h.type) || !rwSoon(rwState(rw))) continue;
          var plan = arrPlan(h, st, rw);
          if (plan) { R.holdQ.splice(i, 1); clearArrival(h, st, plan, rw); return; }
        }
      }
    }
  }
  function arrivalPossible() { return R.holdQ.some(function (p) { return !!freeStand(p.type); }); }

  // Flugzeuge am Boden halten Abstand: wer jemanden vor sich hat, bleibt stehen.
  // Stehen sich zwei länger gegenseitig im Weg, rollt eins durch, damit nichts für immer festhängt.
  function separate(dt) {
    var ground = R.planes.filter(function (o) { return (o.alt || 0) < 0.05 && o.state !== "hold"; });
    ground.forEach(function (p) {
      p.lim = undefined;
      if (!p.path || p.state === "park") return;
      var a = p.path[p.pi], b = p.path[p.pi + 1]; if (!a || !b || a.s > 45) { p.blk = 0; return; }
      if (p.ghost > 0) { p.ghost -= dt; return; }
      var dx = b.x - p.x, dy = b.y - p.y, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, T = TYPES[p.type], lim = Infinity, by = null;
      ground.forEach(function (o) {
        if (o === p) return;
        var ox = o.x - p.x, oy = o.y - p.y; if (Math.abs(ox) > 80 || Math.abs(oy) > 80) return;
        var al = ox * ux + oy * uy, la = -ox * uy + oy * ux, O = TYPES[o.type], gap = (T.len + O.len) / 2 + 6;
        if (al <= 0 || al > gap + 14 || Math.abs(la) > (T.span + O.span) * 0.3) return;
        var l2 = Math.max(0, (al - gap) * 2);
        if (l2 < lim) { lim = l2; by = o; }
      });
      p.lim = lim === Infinity ? undefined : lim;
      if (p.lim !== undefined && p.lim < 1) {
        p.blk = (p.blk || 0) + dt;
        // festgefahren: wer sich gegenseitig blockiert oder vor einem stehenden Flieger hängt, rollt nach einer Weile durch
        if (p.blk > 9 && by && (by.blk > 9 || !by.path) && (p.id > by.id || !by.path)) { p.ghost = 4; p.blk = 0; p.lim = undefined; if (R.jamT <= 0) { R.jamT = 60; msg(t("jam")); } }
      } else p.blk = 0;
    });
    if (R.jamT > 0) R.jamT -= dt;
  }
  // Finanzbericht: Einnahmen je Bereich in 5-Sekunden-Töpfen (Echtzeit, pausiert mit dem Spiel), 15 Minuten
  var FINCAT = ["fly", "pax", "fuel", "trade", "shop", "hotel", "land", "maint"], FINCOL = ["#E3B83F", "#7DB3E8", "#E58A73", "#B98AE0", "#8FC79A", "#5FC2C2", "#C9C2B5", "#D97FB0"];
  var FINB = 5, FINN = 180;
  function finAdd(cat, v) {
    if (!(v > 0)) return;
    var f = G.fin || (G.fin = []), i = Math.floor((G.fpt || 0) / FINB), last = f[f.length - 1];
    if (!last || last.i !== i) { last = { i: i, c: {} }; f.push(last); while (f.length && f[0].i <= i - FINN) f.shift(); }
    last.c[cat] = (last.c[cat] || 0) + Math.round(v);
  }
  function finRate() {   // Umsatz der letzten 60 Sekunden
    var i = Math.floor((G.fpt || 0) / FINB), n = 60 / FINB, s2 = 0;
    (G.fin || []).forEach(function (b) { if (b.i > i - n) for (var k in b.c) s2 += b.c[k]; });
    return s2;
  }
  function earn(v, x, y, label, cat) {
    v = Math.round(v); G.money += v; G.st.earned += v; finAdd(cat || "fly", v);
    R.fx.push({ x: x, y: y, t: 0, txt: (label ? label + " " : "") + "+" + eur(v) });
  }

  function move(p, dt) {
    while (p.path && dt > 0) {
      var a = p.path[p.pi], b = p.path[p.pi + 1];
      if (!b) { var fn = p.onEnd; p.path = null; if (fn) fn(p); return; }
      var dx = b.x - p.x, dy = b.y - p.y, d = Math.hypot(dx, dy);
      var seg = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      var f = Math.min(1, Math.max(0, 1 - d / seg));
      var sp = Math.max(4, a.s + (b.s - a.s) * f);
      if (p.lim !== undefined) { sp = Math.min(sp, p.lim); if (sp < 0.5) return; }
      var mv = sp * dt;
      if (d > 0.01) p.h = b.back ? Math.atan2(-dy, -dx) : Math.atan2(dy, dx);
      if (mv >= d) { p.x = b.x; p.y = b.y; p.alt = b.a || 0; dt -= d / sp; p.pi++; if (b.ev) b.ev(p); }
      else { p.x += dx / d * mv; p.y += dy / d * mv; var g = 1 - (d - mv) / seg; p.alt = (a.a || 0) + ((b.a || 0) - (a.a || 0)) * g; dt = 0; }
    }
  }

  // ---------- Unwetter und Abstürze ----------
  // Spielzeit G.gt läuft mit (gespeichert). Unwetter alle 7–14 Spieltage, Dauer ein Fünftel bis ein ganzer Tag.
  function stormPlan() {
    var gt = G.gt || 0;
    if (!G.storm || gt >= G.storm.e) G.storm = { s: gt + (7 + Math.random() * 7) * DAY, e: 0 };
    if (!G.storm.e) G.storm.e = G.storm.s + DAY * (0.2 + Math.random() * 0.8);
  }
  function stormK() {   // 0 … 1, mit Ein- und Ausblenden
    var st = G.storm, gt = G.gt || 0; if (!st || gt < st.s || gt >= st.e) return 0;
    return Math.min(1, (gt - st.s) / 12, (st.e - gt) / 12);
  }
  // ---------- Wetter ----------
  // Jeder Spieltag hat Bewölkung, Temperatur und Wind aus dem Spielstand-Seed; Gewitter kommen aus dem Unwetter-Plan
  function wxDay(d) {
    var c = fpHash(d * 3.1 + 7, 41), c2 = fpHash(d * 5.7 + 3, 42), t0 = fpHash(d * 2.3 + 1, 43), wa = fpHash(d * 1.7 + 9, 44);
    return { c: Math.max(0, Math.min(1, c * 0.75 + c2 * 0.35 - 0.05)), tb: 11 + t0 * 14, wa: wa * Math.PI * 2 };
  }
  function wxNow() {
    var gt = G.gt || 0, d = Math.floor(gt / DAY), f = gt / DAY - d, a = wxDay(d), b = wxDay(d + 1), k = f * f * (3 - 2 * f);
    var c = a.c + (b.c - a.c) * k, storm = stormOn();
    if (storm) c = 1;
    var h = dayInfo().h, di = Math.cos((h - 15) / 24 * Math.PI * 2), amp = 6 * (1 - c * 0.6);
    var temp = a.tb + (b.tb - a.tb) * k + di * amp - (storm ? 5 : 0);
    var wa = a.wa + Math.atan2(Math.sin(b.wa - a.wa), Math.cos(b.wa - a.wa)) * k;
    return { c: c, t: temp, storm: storm, kind: storm ? "storm" : c > 0.62 ? "cloud" : c > 0.32 ? "part" : "sun", wa: wa };
  }
  function wxIcon(kind, sz) {
    var sun = '<circle cx="10" cy="10" r="4.2" fill="#E3B83F"/><g stroke="#E3B83F" stroke-width="1.6"><path d="M10 1.5v2.6M10 15.9v2.6M1.5 10h2.6M15.9 10h2.6M4 4l1.8 1.8M14.2 14.2l1.8 1.8M4 16l1.8-1.8M14.2 5.8L16 4"/></g>';
    var cloud = function (x, y, col) { return '<path fill="' + col + '" d="M' + (x + 3) + ' ' + (y + 9) + 'h10a3.2 3.2 0 0 0 0-6.4 4.6 4.6 0 0 0-8.8-1.2A3.8 3.8 0 0 0 ' + (x + 3) + ' ' + (y + 9) + 'z"/>'; };
    var body = kind === "sun" ? sun : kind === "part" ? '<g transform="translate(-3 -3) scale(.8)">' + sun + '</g>' + cloud(3, 7, "#D9DDE1") : kind === "cloud" ? cloud(0, 3, "#AEB5BC") + cloud(3, 7, "#D9DDE1") : cloud(1, 2, "#8C949C") + '<path fill="#E3B83F" d="M10 12l-3 5h2.5l-1.2 3.5 4.2-5.5H10l1.4-3z"/>';
    return '<svg class="wxi" viewBox="0 0 20 20" width="' + (sz || 18) + '" height="' + (sz || 18) + '" aria-hidden="true">' + body + "</svg>";
  }
  // Vorhersage: Bewölkung mit wachsender Unschärfe, Gewitter als Wahrscheinlichkeit
  function wxForecast() {
    var gt = G.gt || 0, d0 = Math.floor(gt / DAY), out = [], st = G.storm || { s: 1e12, e: 1e12 };
    for (var i = 0; i <= 3; i++) {
      var d = d0 + i, w = wxDay(d), err = (fpHash(d * 9.1 + i * 2.7, 45) - 0.5) * 0.18 * i;
      var ds = d * DAY, de = ds + DAY, hit = st.s < de && st.e > ds, near = !hit && Math.abs(st.s - ds) < DAY * 1.6;
      var p = hit ? (i === 0 ? 95 : 88 - i * 12 + Math.round((fpHash(d, 46) - 0.5) * 20)) : near ? 12 + Math.round(fpHash(d, 47) * 18) : Math.round(fpHash(d, 48) * 8 * (1 + w.c));
      if (i === 0 && stormOn()) p = 100;
      var c = Math.max(0, Math.min(1, w.c + err));
      var kind = p >= 55 ? "storm" : c > 0.62 ? "cloud" : c > 0.32 ? "part" : "sun";
      var tErr = Math.round((fpHash(d * 4.3 + i, 49) - 0.5) * 2 * i);
      out.push({ i: i, kind: kind, hi: Math.round(w.tb + 6 * (1 - c * 0.6) + tErr), lo: Math.round(w.tb - 6 * (1 - c * 0.6) + tErr - 1), p: Math.max(0, Math.min(100, p)) });
    }
    return out;
  }
  // Wolkenschatten ziehen mit dem Wind über die Karte
  var CLOUDSPR = null;
  function cloudSprite() {
    if (CLOUDSPR) return CLOUDSPR;
    var cv = document.createElement("canvas"); cv.width = cv.height = 128; var g = cv.getContext("2d");
    [[64, 64, 52], [40, 70, 34], [88, 58, 36], [66, 44, 30]].forEach(function (q) { var gr = g.createRadialGradient(q[0], q[1], 0, q[0], q[1], q[2]); gr.addColorStop(0, "rgba(20,28,40,1)"); gr.addColorStop(1, "rgba(20,28,40,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
    CLOUDSPR = cv; return cv;
  }
  // Menge hängt vom Bewölkungsgrad ab (sonnig fast keine, bewölkt viele), Größe variiert um Faktor 20.
  // Bei Unwetter ist ohnehin alles dunkel, dann werden keine Einzelschatten gezeichnet.
  function cloudShadows(c, x0, y0, x1, y1) {
    var w = wxNow(), sk = 1 - stormK(); if (w.c < 0.18 || sk <= 0.02) return;
    var spr = cloudSprite(), TILE = 3600, cc = w.c - 0.18, n = Math.round(Math.pow(cc, 1.6) * 70), sp = 0.7, gt = G.gt || 0;
    if (!n) return;
    var ox = Math.cos(w.wa) * sp * gt, oy = Math.sin(w.wa) * sp * gt;
    c.globalAlpha = Math.min(0.3, 0.12 + w.c * 0.14) * sk;
    for (var i = 0; i < n; i++) {
      var bx = fpHash(i * 1.3 + 0.2, 50) * TILE + ox * (0.85 + fpHash(i * 4.9, 53) * 0.3), by = fpHash(i * 2.1 + 0.7, 51) * TILE + oy * (0.85 + fpHash(i * 4.9, 53) * 0.3), sz = 70 * Math.pow(20, fpHash(i * 3.7, 52));
      bx = ((bx % TILE) + TILE) % TILE; by = ((by % TILE) + TILE) % TILE;
      for (var tx = Math.floor((x0 - sz) / TILE); tx <= Math.floor(x1 / TILE); tx++) for (var ty = Math.floor((y0 - sz) / TILE); ty <= Math.floor(y1 / TILE); ty++) {
        var X = bx + tx * TILE - sz / 2, Y = by + ty * TILE - sz / 2;
        if (X > x1 || Y > y1 || X + sz < x0 || Y + sz < y0) continue;
        c.drawImage(spr, X, Y, sz, sz * 0.7);
      }
    }
    c.globalAlpha = 1;
  }
  function wxDraw() {
    if (!V) return;
    var box = V.root.querySelector("#fh-wxp"); if (!box || box.hidden) return;
    var w = wxNow(), fc = wxForecast(), names = { sun: t("wxSun"), part: t("wxPart"), cloud: t("wxCloud"), storm: t("wxStorm") };
    var html = '<div class="wxnow">' + wxIcon(w.kind, 40) + '<div><b>' + Math.round(w.t) + ' °C</b><span>' + names[w.kind] + "</span></div></div>" +
      '<div class="wxlist">' + fc.map(function (d) {
        return '<div class="wxrow"><span class="dn">' + (d.i ? fmt(t("wxDay"), { n: d.i }) : t("wxToday")) + "</span>" + wxIcon(d.kind, 22) + '<span class="tt">' + d.hi + "° / " + d.lo + '°</span><span class="pp' + (d.p >= 50 ? " hi" : "") + '">' + fmt(t("wxRisk"), { p: d.p }) + "</span></div>";
      }).join("") + "</div><p>" + t("wxNote") + "</p>";
    var key2 = html.replace(/\d+ °C/, ""); if (box._k !== html) { box.querySelector(".wxbody").innerHTML = html; box._k = html; }
  }
  function stormOn() { var st = G.storm, gt = G.gt || 0; return !!st && gt >= st.s && gt < st.e; }
  var CRASHP = 1 / 2048, WRECKCOST = { p: 1000000, n: 2500000, w: 4500000 }, CLEART = 120;
  function crash(p) {
    var cs = p.cs, al = p.al;
    G.wreck = { x: p.x, y: p.y, h: p.h, k: p.type, cs: cs, col: al.col, n: al.n || "", cost: WRECKCOST[p.type] || 2500000, clr: 0 };
    // Flugzeug entfernen, Piste und Position freigeben
    mods("runway").forEach(function (rw) { var r = rwState(rw); if (r.busy === p) release(r); if (r.next === p) r.next = null; });
    Object.keys(R.occ).forEach(function (k) { if (R.occ[k] === p) R.occ[k] = null; });
    Object.keys(R.q).forEach(function (k) { var q = R.q[k], i = q.indexOf(p); if (i >= 0) q.splice(i, 1); });
    var i = R.planes.indexOf(p); if (i >= 0) R.planes.splice(i, 1);
    R.apron = R.apron.filter(function (j) { return j.p !== p; });
    G.rep = Math.max(0, G.rep - 15);
    if (al.n) (G.scrash || (G.scrash = [])).push({ s: al.id, t: Math.floor(G.fpt || 0), d: 0.85 + Math.random() * 0.35 });
    msg(fmt(t("crash"), { cs: (al.n ? al.n + " " : "") + cs }));
    V.sel = "wreck"; updateSel(); save();
  }
  function opsBlocked() { return !!G.wreck; }
  function wreckTick(dtReal) {
    var w = G.wreck; if (!w || !w.clr) return;
    w.clr -= dtReal;
    if (w.clr <= 0) { G.wreck = null; msg(t("wreckDone"), true); if (V.sel === "wreck") V.sel = null; updateSel(); save(); }
    else if (V.sel === "wreck") { var el = document.getElementById("fh-wreck-t"); if (el) el.textContent = fmt(t("wreckBusy"), { s: mmss(w.clr) }); }
  }
  function earnFx(w) { R.fx.push({ x: w.x, y: w.y - 10, t: 0, txt: "−" + eur(w.cost), col: "#F2A08E" }); }
  function mmss(sec) { sec = Math.max(0, Math.ceil(sec)); return Math.floor(sec / 60) + ":" + ("0" + sec % 60).slice(-2); }
  function tick(dt) {
    R.clock += dt;
    G.gt = (G.gt || 0) + dt; stormPlan();
    var so = stormOn(); if (R.stormWas === undefined) R.stormWas = so; else if (so !== R.stormWas) { R.stormWas = so; msg(t(so ? "stormOn" : "stormOff"), !so); }
    shopTick(dt);
    Object.keys(R.rw).forEach(function (k) { var r = R.rw[k]; if (!r.busy && r.cool > 0) r.cool -= dt; });
    R.spawnT -= dt;
    if (R.spawnT <= 0) { spawn(); R.spawnT = interval() * (0.7 + Math.random() * 0.6); }
    if (R.hangarT > 0) R.hangarT -= dt;
    R.visitors = Math.max(one("deck") ? 3 : 0, R.visitors - dt * 0.15);

    var rw0 = mods("runway")[0];
    for (var i = R.holdQ.length - 1; i >= 0; i--) {
      var h = R.holdQ[i];
      h.wait += dt; h.fade = Math.min(1, h.fade + dt);
      if (h.wait > DIVERT || !rw0) {
        R.holdQ.splice(i, 1); R.planes.splice(R.planes.indexOf(h), 1);
        R.tDep = Math.max(0, R.tDep - h.book); // gebuchte Fluggäste fliegen woanders
        if (rw0) { G.rep = Math.max(0, G.rep - 4); G.st.div++; msg(h.cs + " " + t("divert") + (G.st.div % 3 === 1 ? " " + t("tip") : "")); }
      }
    }
    if (rw0) {
      var hp = holdPoint(rw0), ox = hp.x, oy = hp.y;
      R.holdQ.forEach(function (h, k) {
        h.ang += dt * 0.7;
        var a = h.ang + k * (Math.PI * 2 / 6);
        h.x = ox + Math.cos(a) * 70; h.y = oy + Math.sin(a) * 70;
        h.h = a + Math.PI / 2; h.alt = 0.8;
      });
    }
    schedule();
    separate(dt);
    R.planes.slice().forEach(function (p) {
      if (p.state === "park") turnaround(p, dt);
      else if (p.path) move(p, dt);
    });
    R.fx.forEach(function (f) { f.t += dt; });
    R.fx = R.fx.filter(function (f) { return f.t < 1.8; });

    landside(dt);
  }

  // ---------- Zeichnen ----------
  var FONT = "'Instrument Sans',system-ui,sans-serif";
  var COL = { grass: "#B9C2A2", grass2: "#B2BC9B", pave: "#D3CDC2", paveEdge: "#C6BFB3", asph: "#4A4350", road: "#5A5360", line: "#E3B83F" };

  function line(c, a, b, x, y) { c.beginPath(); c.moveTo(a, b); c.lineTo(x, y); c.stroke(); }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  var GRASS = null;
  function grassPattern(c) {
    if (GRASS) return GRASS;
    var N = 512, cv = document.createElement("canvas"); cv.width = cv.height = N;
    var x = cv.getContext("2d"), img = x.createImageData(N, N), d = img.data;
    function h(i, j, s2, per) { i = ((i % per) + per) % per; j = ((j % per) + per) % per; var v = Math.sin(i * 127.1 + j * 311.7 + s2 * 74.7) * 43758.5453; return v - Math.floor(v); }
    function vn(u, v, per, s2) { var i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j; fu = fu * fu * (3 - 2 * fu); fv = fv * fv * (3 - 2 * fv);
      var a = h(i, j, s2, per), b = h(i + 1, j, s2, per), cc = h(i, j + 1, s2, per), e = h(i + 1, j + 1, s2, per); return a + (b - a) * fu + (cc - a) * fv + (a - b - cc + e) * fu * fv; }
    var base = [185, 194, 162], lite = [193, 202, 168], dark = [175, 186, 153];
    for (var j = 0; j < N; j++) for (var i = 0; i < N; i++) {
      var n = vn(i / N * 9, j / N * 9, 9, 1) * 0.6 + vn(i / N * 21, j / N * 21, 21, 2) * 0.4, col = n < 0.38 ? dark : n > 0.62 ? lite : base, k = (j * N + i) * 4;
      d[k] = col[0]; d[k + 1] = col[1]; d[k + 2] = col[2]; d[k + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    GRASS = c.createPattern(cv, "repeat");
    try { GRASS.setTransform(new DOMMatrix().scale(2)); } catch (e) {}
    return GRASS;
  }
  function inLocal(c, m, fn) { c.save(); c.translate(m.x, m.y); c.rotate(m.a); fn(); c.restore(); }

  function draw() {
    var cv = V.cv, c = V.ctx, st = V.stage;
    var W = st.clientWidth, H = st.clientHeight, dpr = window.devicePixelRatio || 1;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    V.W = W; V.H = H;
    var z = V.zoom;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.fillStyle = COL.grass; c.fillRect(0, 0, W, H);
    c.setTransform(dpr * z, 0, 0, dpr * z, dpr * (W / 2 - V.cam.x * z), dpr * (H / 2 - V.cam.y * z));
    c.textAlign = "center"; c.textBaseline = "middle";
    var x0 = V.cam.x - W / 2 / z, y0 = V.cam.y - H / 2 / z, x1 = V.cam.x + W / 2 / z, y1 = V.cam.y + H / 2 / z;
    // Wiese: drei Grüntöne als Rauschmuster, flach und comichaft
    var gp = grassPattern(c); if (gp) { c.fillStyle = gp; c.fillRect(x0, y0, x1 - x0, y1 - y0); }
    // gemalte Asphaltflächen
    var pk = Object.keys(G.pave || {});
    if (pk.length) {
      var cells = [];
      pk.forEach(function (k) { var i = k.indexOf(","), cx = +k.slice(0, i) * PV, cy = +k.slice(i + 1) * PV; if (cx > x0 - PV && cx < x1 && cy > y0 - PV && cy < y1) cells.push(cx, cy); });
      c.fillStyle = COL.paveEdge; for (var q = 0; q < cells.length; q += 2) c.fillRect(cells[q] - 3, cells[q + 1] - 3, PV + 6, PV + 6);
      c.fillStyle = COL.pave; for (q = 0; q < cells.length; q += 2) c.fillRect(cells[q] - 0.3, cells[q + 1] - 0.3, PV + 0.6, PV + 0.6);
    }

    // 1. Befestigter Untergrund wächst mit allem, was gebaut wird
    c.lineCap = "round"; c.lineJoin = "round";
    G.mods.forEach(function (m) {
      if (m.t === "road") return;
      if (m.t === "taxi" || m.t === "runway") {
        var e = segEnds(m);
        c.strokeStyle = COL.paveEdge; c.lineWidth = (m.t === "runway" ? RVW : TW_W) + 30; line(c, e[0].x, e[0].y, e[1].x, e[1].y);
      } else {
        var s = SIZE[m.t];
        inLocal(c, m, function () { c.fillStyle = COL.paveEdge; rr(c, -s[0] / 2 - 15, -s[1] / 2 - 15, s[0] + 30, s[1] + 30, 14); c.fill(); });
      }
    });
    G.mods.forEach(function (m) {
      if (m.t === "road") return;
      if (m.t === "taxi" || m.t === "runway") {
        var e = segEnds(m);
        c.strokeStyle = COL.pave; c.lineWidth = (m.t === "runway" ? RVW : TW_W) + 22; line(c, e[0].x, e[0].y, e[1].x, e[1].y);
      } else {
        var s = SIZE[m.t];
        inLocal(c, m, function () { c.fillStyle = COL.pave; rr(c, -s[0] / 2 - 11, -s[1] / 2 - 11, s[0] + 22, s[1] + 22, 10); c.fill(); });
      }
    });
    // 2. Straßen
    mods("road").forEach(function (m) {
      c.strokeStyle = COL.road; c.lineWidth = m.sl ? SL_W : RD_W; line(c, m.x1, m.y1, m.x2, m.y2);
    });
    c.lineCap = "butt";
    mods("road").forEach(function (m) {
      var l = Math.hypot(m.x2 - m.x1, m.y2 - m.y1), a = Math.atan2(m.y2 - m.y1, m.x2 - m.x1);
      c.save(); c.translate(m.x1, m.y1); c.rotate(a);
      if (m.hw) { c.strokeStyle = "rgba(255,255,255,.7)"; c.lineWidth = 0.8; line(c, 0, -RD_W / 2 + 1.5, l, -RD_W / 2 + 1.5); line(c, 0, RD_W / 2 - 1.5, l, RD_W / 2 - 1.5); }
      if (m.ow && m.bl) {
        // rechte Spur rot: nur für Busse
        c.fillStyle = "rgba(170,58,48,.85)"; c.fillRect(0, 0.5, l, RD_W / 2 - 1.2);
        c.strokeStyle = "rgba(255,255,255,.7)"; c.lineWidth = 0.6; line(c, 0, 0.2, l, 0.2);
        c.fillStyle = "rgba(255,255,255,.85)"; c.font = "700 3.6px " + FONT; for (var bx2 = 20; bx2 < l - 8; bx2 += 60) c.fillText("BUS", bx2, 4.4);
        c.save(); c.translate(0, -3.5); arrows(c, l, "rgba(255,255,255,.8)", 2.4); c.restore();
      }
      else if (m.ow && m.sl) { arrows(c, l, "rgba(255,255,255,.8)", 2.4); }
      else if (m.ow) {
        c.strokeStyle = "rgba(255,255,255,.55)"; c.lineWidth = 0.6;
        var ns = m._spots || 0;
        for (var k = 0; k <= ns; k++) { var sx = 15 + k * 10; line(c, sx, -0.6, sx + 7, -RD_W / 2 + 0.6); }
        if (ns) { c.setLineDash([3, 3]); line(c, 15, -0.6, 15 + ns * 10, -0.6); c.setLineDash([]); }
        c.save(); c.translate(0, 3.5); arrows(c, l, "rgba(255,255,255,.8)", 2.6); c.restore();
      } else { c.strokeStyle = "rgba(255,255,255,.55)"; c.lineWidth = 0.8; c.setLineDash([6, 6]); line(c, 0, 0, l, 0); c.setLineDash([]); }
      c.restore();
    });
    // 3. Rollwege, dann Pisten
    c.lineCap = "round";
    mods("taxi").forEach(function (m) { c.strokeStyle = COL.asph; c.lineWidth = TW_W; line(c, m.x1, m.y1, m.x2, m.y2); });
    c.lineCap = "butt";
    // Mittellinie; Abzweige nur dort, wo wirklich ein Rollweg oder eine Position abgeht; Pfeile bei Einbahn
    mods("taxi").forEach(function (m) {
      var l = Math.hypot(m.x2 - m.x1, m.y2 - m.y1), a = Math.atan2(m.y2 - m.y1, m.x2 - m.x1);
      c.save(); c.translate(m.x1, m.y1); c.rotate(a);
      c.strokeStyle = COL.line; c.lineWidth = 1; line(c, 0, 0, l, 0);
      if (m.ow) arrows(c, l, COL.line, 3.2);
      c.restore();
    });
    junctions(c);
    mods("runway").forEach(function (m, i) { drawRunway(c, m, i); });
    drawRoutes(c);
    // Zufahrtslinien zu den Positionen
    mods("stand").forEach(function (m) {
      if (!m._entry) return;
      c.strokeStyle = COL.line; c.lineWidth = 1; line(c, m._entry.x, m._entry.y, m.x, m.y);
    });
    // Schatten der Gebäude (Sonne von oben links, nachts schwächer)
    var SHH = { term: 6, fire: 4, hangar: 7, hotel: 9, hotels: 6, hotell: 0, deck: 2, bus: 2, cab: 1, park: 0.5 }, shA = 0.2 * (1 - dayInfo().dark * 0.8);
    c.fillStyle = "rgba(20,26,18," + shA + ")";
    G.mods.forEach(function (m) {
      if (m.t === "tank") { c.beginPath(); c.arc(m.x + 4, m.y + 6, SIZE.tank[0] / 2 - 2, 0, Math.PI * 2); c.fill(); return; }
      if (m.t === "hotell") { c.save(); c.translate(m.x + 10, m.y + 13); c.rotate(m.a); c.fillRect(-48, hotelRS(m) > 0 ? -37 : -11, 96, 48); c.restore(); return; }
      var hh2 = SHH[m.t]; if (!hh2) return;
      var sz = SIZE[m.t]; c.save(); c.translate(m.x + hh2 * 0.8, m.y + hh2 * 1.1); c.rotate(m.a); c.fillRect(-sz[0] / 2, -sz[1] / 2, sz[0], sz[1]); c.restore();
    });
    // 4. Rechteck-Module
    G.mods.forEach(function (m) {
      if (m.t === "taxi" || m.t === "road" || m.t === "runway") return;
      inLocal(c, m, function () { drawMod(c, m); });
    });
    // Vegetation: Büsche und Bäume mit Schatten
    var vx0 = x0 - 20, vx1 = x1 + 20, vy0 = y0 - 20, vy1 = y1 + 20, vs = (G.veg || []).filter(function (v) { return v.x > vx0 && v.x < vx1 && v.y > vy0 && v.y < vy1; });
    c.fillStyle = "rgba(40,50,30,.22)";
    vs.forEach(function (v) { c.beginPath(); c.ellipse(v.x + v.r * 0.5, v.y + v.r * 0.7, v.r, v.r * 0.8, 0, 0, Math.PI * 2); c.fill(); });
    vs.forEach(function (v) {
      if (v.k) {
        c.fillStyle = v.s < 0.5 ? "#4E7A3A" : "#557F3C"; c.beginPath(); c.arc(v.x, v.y, v.r, 0, Math.PI * 2); c.fill();
        c.fillStyle = v.s < 0.5 ? "#6E9B4E" : "#77A352"; c.beginPath(); c.arc(v.x - v.r * 0.18, v.y - v.r * 0.2, v.r * 0.72, 0, Math.PI * 2); c.fill();
        c.fillStyle = "rgba(196,224,140,.55)"; c.beginPath(); c.arc(v.x - v.r * 0.38, v.y - v.r * 0.42, v.r * 0.32, 0, Math.PI * 2); c.fill();
      } else {
        var ang = v.s * 6.28;
        for (var bi = 0; bi < 3; bi++) { var bx = v.x + Math.cos(ang + bi * 2.1) * v.r * 0.55, by = v.y + Math.sin(ang + bi * 2.1) * v.r * 0.55; c.fillStyle = "#5C8A42"; c.beginPath(); c.arc(bx, by, v.r * 0.62, 0, Math.PI * 2); c.fill(); }
        c.fillStyle = "rgba(170,206,120,.6)"; c.beginPath(); c.arc(v.x - v.r * 0.25, v.y - v.r * 0.3, v.r * 0.38, 0, Math.PI * 2); c.fill();
      }
    });
    if (V.tool && V.tool.kind === "brush" && V.mouse) { c.strokeStyle = "rgba(21,23,21,.65)"; c.lineWidth = 1.5 / z; c.setLineDash([5 / z, 4 / z]); c.beginPath(); c.arc(V.mouse.x, V.mouse.y, V.tool.id === "pave" ? 22 : 34, 0, Math.PI * 2); c.stroke(); c.setLineDash([]); }
    // Fluggastbrücken
    mods("stand").forEach(function (m) {
      if (!(m.gate && m._term)) return;
      var d = standDirs(m), h = SIZE.stand[1] / 2, p = R.occ[m.id], on = p && p.state === "park";
      var bx = m.x + d.bx * (h + 2) - d.by * 14 * -1, by = m.y + d.by * (h + 2) + d.bx * 14 * -1;
      var reach = on ? h - TYPES[p.type].len * 0.25 : 12;
      c.strokeStyle = "#F4F1EC"; c.lineWidth = 4; c.lineCap = "round";
      line(c, bx, by, bx - d.bx * reach + d.by * -4, by - d.by * reach - d.bx * -4);
      c.lineCap = "butt";
    });
    // Fahrzeuge: rechts fahren, geparkt im Stellplatz
    R.veh.forEach(function (v) {
      var nx = v.path && v.path[v.pi + 1], off = v.state === "curb" ? 7 : nx && nx.r === -1 ? -3.5 : nx && nx.r ? 3.5 : 0;
      var x = v.state === "curb" ? v.x - Math.sin(v.h) * off : v.px !== undefined && (v.path || v.state === "curb") ? v.px : v.x - Math.sin(v.h) * off, y = v.state === "curb" ? v.y + Math.cos(v.h) * off : v.py !== undefined && v.path ? v.py : v.y + Math.cos(v.h) * off;
      v._dx = x; v._dy = y;
      c.save(); c.translate(x, y); c.rotate(v.h);
      if (v.kind === "bus") { c.fillStyle = "#E3B83F"; c.fillRect(-12, -3.5, 24, 7); c.fillStyle = "rgba(20,20,20,.55)"; c.fillRect(-9, -1.5, 18, 1.2); c.fillRect(-9, 0.6, 18, 1.2); }
      else { c.fillStyle = v.c; c.fillRect(-4, -2, 8, 4); c.fillStyle = "rgba(20,20,20,.35)"; c.fillRect(0.5, -1.6, 2, 3.2); if (v.kind === "taxi") { c.fillStyle = "#151715"; c.fillRect(-1.5, -0.8, 1.6, 1.6); } }
      c.restore();
    });
    // Fluggäste unterwegs zwischen angedocktem Flugzeug und Terminal
    var tc0 = termCenter();
    if (tc0) R.planes.forEach(function (p) {
      if (!p.docked || (p.phase !== "unload" && p.phase !== "board")) return;
      var st = byId(p.st); if (!st) return;
      var gate = st.gate && st._term, d = standDirs(st), from = gate ? { x: st.x + d.bx * (SIZE.stand[1] / 2 + 4), y: st.y + d.by * (SIZE.stand[1] / 2 + 4) } : { x: p.x, y: p.y };
      var to = gate ? { x: from.x + d.bx * 14, y: from.y + d.by * 14 } : tc0;
      if (p.phase === "board") { var tmp = from; from = to; to = tmp; }
      var L = dist(from, to) || 1, n = gate ? 3 : Math.min(10, Math.max(3, Math.round(L / 25)));
      c.fillStyle = p.phase === "board" ? "#9A540A" : "#2E7D5B";
      for (var k = 0; k < n; k++) { var f = ((R.clock * (gate ? 0.8 : 0.35)) + k / n) % 1; c.beginPath(); c.arc(from.x + (to.x - from.x) * f, from.y + (to.y - from.y) * f, 1.6, 0, Math.PI * 2); c.fill(); }
    });
    // Vorfeldfahrzeuge: Tankwagen und Vorfeldbus (nur Optik)
    R.apron = R.apron.filter(function (j) {
      var parked = j.p.state === "park" && R.planes.indexOf(j.p) >= 0;
      if (!parked && j.t1 === undefined) j.t1 = R.clock;
      var u = j.t1 === undefined ? (R.clock - j.t0) / 7 : 1 - (R.clock - j.t1) / 7;
      if (j.t1 !== undefined && u <= 0) return false;
      if (u <= 0) return true;
      u = Math.min(1, u); var e = u * u * (3 - 2 * u), x = j.from.x + (j.to.x - j.from.x) * e, y = j.from.y + (j.to.y - j.from.y) * e;
      var ang = Math.atan2(j.to.y - j.from.y, j.to.x - j.from.x) + (j.t1 !== undefined ? Math.PI : 0);
      c.save(); c.translate(x, y); c.rotate(ang);
      c.fillStyle = "rgba(0,0,0,.2)"; c.fillRect(-5, -1.4, 11, 4.2);
      if (j.k === "fuel") { c.fillStyle = "#E3B83F"; c.fillRect(3, -2, 3, 4); c.fillStyle = "#EEF0F2"; c.fillRect(-5.5, -2.1, 8.2, 4.2); c.fillStyle = "#C9CED4"; c.fillRect(-5, -1.2, 7, 0.6); }
      else { c.fillStyle = "#3E7F8C"; c.fillRect(-7, -2.4, 14, 4.8); c.fillStyle = "rgba(220,235,245,.85)"; c.fillRect(-5.5, -1.7, 11, 1); c.fillRect(-5.5, 0.7, 11, 1); }
      c.restore();
      return true;
    });
    // Wrack mit Rauch und Feuer
    if (G.wreck) {
      var wk = G.wreck, WT = TYPES[wk.k];
      c.save(); c.translate(wk.x, wk.y); c.rotate(wk.h + 0.5);
      c.fillStyle = "rgba(20,16,12,.35)"; c.beginPath(); c.ellipse(0, 0, WT.len * 0.75, WT.span * 0.45, 0, 0, Math.PI * 2); c.fill();
      shape(c, WT, "#3A3A3A", null);
      c.fillStyle = "#2A2624"; c.fillRect(-WT.len * 0.1, -WT.span * 0.08, WT.len * 0.3, WT.span * 0.16);
      c.restore();
      if (!wk.clr || wk.clr > 20) for (var fi = 0; fi < 7; fi++) {   // Rauchwolken ziehen nach rechts oben ab
        var ph = (R.clock * 0.35 + fi / 7) % 1, smR = 4 + ph * 16;
        c.fillStyle = "rgba(60,58,56," + (0.45 * (1 - ph)) + ")"; c.beginPath(); c.arc(wk.x + ph * 40 + Math.sin(fi * 2.3) * 5, wk.y - ph * 55, smR, 0, Math.PI * 2); c.fill();
      }
      if (!wk.clr) { c.fillStyle = "rgba(255,140,40," + (0.55 + 0.25 * Math.sin(R.clock * 13)) + ")"; c.beginPath(); c.arc(wk.x, wk.y, 4 + Math.sin(R.clock * 9) * 1.2, 0, Math.PI * 2); c.fill(); }
      if (V.sel === "wreck") outline(c, { x: wk.x, y: wk.y, a: 0, hw: WT.len * 0.6, hh: WT.span * 0.6 }, "#C2412D", 2 / z);
    }
    // 5. Flugzeuge
    R.planes.slice().sort(function (a, b) { return (a.alt || 0) - (b.alt || 0); }).forEach(function (p) { plane(c, p); });
    cloudShadows(c, x0, y0, x1, y1);
    nightPass(c, z, x0, y0, x1, y1, W, H, dpr);
    labels(c);
    // 6. Auswahl, Vorschau, Einnahmen
    if (V.sel) { var sm = byId(V.sel); if (sm) outline(c, foot(sm), "#2F6F8F", 2 / z); }
    drawGhost(c);
    c.font = "700 " + (11 / Math.max(0.7, z)) + "px " + FONT;
    if (!V.clean) R.fx.forEach(function (f) {
      var a = 1 - f.t / 1.8, y = f.y - 10 - f.t * 18;
      c.globalAlpha = a; c.lineWidth = 3; c.strokeStyle = "rgba(20,22,20,.8)"; c.strokeText(f.txt, f.x, y);
      c.fillStyle = f.col || "#FFE7B8"; c.fillText(f.txt, f.x, y); c.globalAlpha = 1;
    });
    weatherPass(c, W, H, dpr);
    if (!mods("runway").length) {
      c.fillStyle = "rgba(60,70,50,.55)"; c.font = "600 " + (26 / z) + "px " + FONT;
      c.fillText(lang === "de" ? "Hier entsteht dein Flughafen" : "Your airport starts here", V.cam.x, V.cam.y);
    }
  }

  // Unwetter (Regen, Blitze, Abdunklung) und Banner für Sperren, in Bildschirmkoordinaten
  function weatherPass(c, W, H, dpr) {
    var k = stormK(), w = G.wreck;
    if (!k && !w) return;
    c.save(); c.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (k) {
      c.fillStyle = "rgba(24,30,42," + (0.5 * k) + ")"; c.fillRect(0, 0, W, H);
      var tm = R.clock, n = Math.round(260 * k);
      c.strokeStyle = "rgba(200,215,235,.38)"; c.lineWidth = 1; c.beginPath();
      for (var i = 0; i < n; i++) {
        var hx = (Math.sin(i * 12.9898) * 43758.5453) % 1, hy = (Math.sin(i * 78.233) * 12543.21) % 1; hx = Math.abs(hx); hy = Math.abs(hy);
        var x = (hx * (W + 200) + tm * 120) % (W + 200) - 100, y = (hy * (H + 100) + tm * 620 * (0.8 + hx * 0.4)) % (H + 100) - 50;
        c.moveTo(x, y); c.lineTo(x - 5, y + 16);
      }
      c.stroke();
      // Blitz: alle paar Sekunden kurzer Lichtblitz mit gezackter Linie
      var cyc = 5.3, ph = tm % cyc, seed = Math.floor(tm / cyc);
      if (ph < 0.35 && Math.abs(Math.sin(seed * 3.7)) > 0.35) {
        var a = (1 - ph / 0.35);
        c.fillStyle = "rgba(235,240,255," + (0.28 * a * k) + ")"; c.fillRect(0, 0, W, H);
        var bx = Math.abs(Math.sin(seed * 91.7)) * W, by = 0; c.strokeStyle = "rgba(255,255,255," + (0.9 * a) + ")"; c.lineWidth = 2.2; c.beginPath(); c.moveTo(bx, by);
        for (var s2 = 1; s2 <= 9; s2++) { bx += Math.sin(seed * 13 + s2 * 7.1) * 28; by += H * 0.06; c.lineTo(bx, by); }
        c.stroke();
      }
    }
    var ban = w ? (w.clr ? fmt(t("wreckBan2"), { s: mmss(w.clr) }) : t("wreckBan")) : t("stormBan");
    c.font = "700 13px " + FONT; c.textAlign = "center"; c.textBaseline = "middle";
    var tp = V.root.querySelector(".fh-top"), ty = 12;
    if (tp) { var rb = tp.getBoundingClientRect(), rs = V.stage.getBoundingClientRect(); ty = Math.max(12, rb.bottom - rs.top + 12); }
    var bw = c.measureText(ban).width + 28; c.fillStyle = w ? "rgba(194,50,38,.95)" : "rgba(28,34,46,.92)"; c.fillRect(W / 2 - bw / 2, ty, bw, 28);
    c.fillStyle = "#F4F1EC"; c.fillText(ban, W / 2, ty + 14.5);
    if (w && !w.clr) { c.font = "600 11px " + FONT; c.fillStyle = "rgba(20,22,20,.85)"; c.fillRect(W / 2 - bw / 2, ty + 28, bw, 20); c.fillStyle = "rgba(244,241,236,.9)"; c.fillText(t("wreckHint"), W / 2, ty + 38.5); }
    c.restore();
  }
  function arrows(c, l, col, w) {
    c.fillStyle = col;
    var n = Math.max(1, Math.floor(l / 70));
    for (var i = 0; i < n; i++) {
      var x = l * (i + 0.5) / n;
      c.beginPath(); c.moveTo(x + w * 1.6, 0); c.lineTo(x - w * 1.2, -w); c.lineTo(x - w * 0.5, 0); c.lineTo(x - w * 1.2, w); c.closePath(); c.fill();
    }
  }
  // Abbiegebögen an Knoten: Mittellinien gehen mit einem Bogen ineinander über
  function junctions(c) {
    if (!NET) return;
    c.strokeStyle = COL.line; c.lineWidth = 1;
    NET.N.forEach(function (n, i) {
      var es = NET.adj[i].filter(function (e) { return e.type !== "rwy"; });
      if (es.length < 2) return;
      var dirs = es.map(function (e) { var o = NET.N[e.a === i ? e.b : e.a], l = dist(n, o) || 1; return { x: (o.x - n.x) / l, y: (o.y - n.y) / l, l: l }; });
      for (var a = 0; a < dirs.length; a++) for (var b = a + 1; b < dirs.length; b++) {
        var p = dirs[a], q = dirs[b], cos = p.x * q.x + p.y * q.y;
        if (cos < -0.94 || cos > 0.85) continue;   // geradeaus oder zu spitz: kein Bogen
        var r = Math.min(18, p.l * 0.45, q.l * 0.45);
        c.beginPath(); c.moveTo(n.x + p.x * r, n.y + p.y * r); c.quadraticCurveTo(n.x, n.y, n.x + q.x * r, n.y + q.y * r); c.stroke();
      }
    });
    // Rollweg trifft auf die Piste: Bogen in Landerichtung und dagegen
    mods("runway").forEach(function (rw) {
      var e = rwEnds(rw);
      (rw._junc || []).forEach(function (j) {
        var n = NET.N[j.n];
        NET.adj[j.n].forEach(function (ed) {
          if (ed.type === "rwy") return;
          var o = NET.N[ed.a === j.n ? ed.b : ed.a], l = dist(n, o) || 1, ux = (o.x - n.x) / l, uy = (o.y - n.y) / l, r = Math.min(20, l * 0.45);
          [1, -1].forEach(function (sg) {
            var cos = (ux * e.dx + uy * e.dy) * sg; if (cos < -0.2) return;
            c.beginPath(); c.moveTo(n.x + e.dx * sg * r, n.y + e.dy * sg * r); c.quadraticCurveTo(n.x, n.y, n.x + ux * r, n.y + uy * r); c.stroke();
          });
        });
      });
    });
  }
  function drawRoutes(c) {
    var z = V.zoom, act = V.tool && V.tool.kind === "route";
    mods("runway").forEach(function (rw, i) {
      var sel = V.sel === rw.id, alpha = sel ? 0.9 : 0.35;
      if (act && V.tool.rw === rw.id) return;
      var rws = mods("runway"), arr = i === 0, dep = rws.length === 1 || i === 1;
      c.lineWidth = (sel ? 2.2 : 1.4) / z; c.setLineDash([9 / z, 7 / z]);
      if (arr) {
        var a = appRoute(rw), e = rwEnds(rw);
        c.strokeStyle = "rgba(47,111,143," + alpha + ")"; c.beginPath(); c.moveTo(a[0].x, a[0].y); a.forEach(function (q) { c.lineTo(q.x, q.y); }); c.lineTo(e.A.x, e.A.y); c.stroke();
        c.setLineDash([]); c.fillStyle = "rgba(47,111,143," + alpha + ")"; c.beginPath(); c.arc(a[0].x, a[0].y, 5 / z, 0, Math.PI * 2); c.fill(); c.setLineDash([9 / z, 7 / z]);
      }
      if (dep) {
        var e3 = rwEnds(rw), from = { x: e3.B.x - e3.dx * 60, y: e3.B.y - e3.dy * 60 }, d = [from].concat(depRoute(rw, from));
        c.strokeStyle = "rgba(181,101,29," + alpha + ")"; c.beginPath(); c.moveTo(d[0].x, d[0].y); d.forEach(function (q) { c.lineTo(q.x, q.y); }); c.stroke();
      }
      c.setLineDash([]);
    });
  }
  function pill(c, x, y, txt, bg, fg) {
    var z = V.zoom, fs = 10.5 / z;
    c.font = "600 " + fs + "px " + FONT;
    var w = c.measureText(txt).width + 10 / z, h = 15 / z;
    c.fillStyle = bg; rr(c, x - w / 2, y - h / 2, w, h, 4 / z); c.fill();
    c.fillStyle = fg || "#F4F1EC"; c.fillText(txt, x, y + 0.5 / z);
  }
  function labels(c) {
    if (V.clean) return;   // für saubere Vorschaubilder
    var z = V.zoom, nf = function (n) { return Math.round(n).toLocaleString(loc()); };
    R.planes.forEach(function (p) {
      if (p.state !== "park") return;
      var y = p.y - (TYPES[p.type].len * 0.5 + 12 / z);
      if (p.phase === "unload") pill(c, p.x, y, t("unload") + " " + nf(p.on) + "/" + p.cap, "rgba(21,23,21,.82)");
      else if (p.phase === "clean") pill(c, p.x, y, t("clean"), "rgba(21,23,21,.65)");
      else if (p.phase === "board") pill(c, p.x, y, t("board") + " " + nf(p.boarded) + "/" + p.cap, "rgba(154,84,10,.9)");
      else if (p.phase === "fuel") pill(c, p.x, y, t("fuelSold") + " …", "rgba(21,23,21,.65)");
      if (p.noFuel) pill(c, p.x, y - 15 / z, t("noFuel"), "rgba(194,50,38,.95)");
    });
    var tc = termCenter();
    if (tc) pill(c, tc.x, tc.y, "Terminal · " + fmt(t("inTerm"), { n: nf(termPax()) }), "rgba(46,125,91,.92)");
    mods("bus").forEach(function (m) { if (m._road) pill(c, m.x, m.y - 20 / z, fmt(t("waiting"), { n: nf(R.stopW[m.id] || 0) }), "rgba(31,92,79,.9)"); });
    var tr0 = mods("cab").filter(function (m) { return m._road; });
    if (tr0.length) pill(c, tr0[0].x, tr0[0].y - 20 / z, "Taxi · " + fmt(t("waiting"), { n: nf(R.tArrTaxi || 0) }), "rgba(154,120,10,.92)");
    R.veh.forEach(function (v) { if (v.kind === "bus" && v.state === "curb") pill(c, v.x, v.y + 12 / z, (v.n || 0) + "/50", "rgba(227,184,63,.95)", "#151715"); });
    mods("park").forEach(function (m) {
      if (!m._road) return;
      var u = lotParked(m);
      pill(c, m.x, m.y, u >= LOT ? t("lotFull") + " " + u + "/" + LOT : u + "/" + LOT, u >= LOT ? "rgba(194,65,45,.92)" : "rgba(47,111,143,.9)");
    });
  }

  function outline(c, f, col, w) {
    var p = corners({ x: f.x, y: f.y, a: f.a, hw: f.hw + 4, hh: f.hh + 4 });
    c.strokeStyle = col; c.lineWidth = w; c.setLineDash([6 * w, 4 * w]);
    c.beginPath(); c.moveTo(p[0].x, p[0].y); for (var i = 1; i < 4; i++) c.lineTo(p[i].x, p[i].y); c.closePath(); c.stroke();
    c.setLineDash([]);
  }

  function bearing(dx, dy) { var b = (Math.atan2(dy, dx) / DEG + 90 + 360) % 360; var n = Math.round(b / 10) % 36; return n === 0 ? 36 : n; }
  function pad(n) { return (n < 10 ? "0" : "") + n; }

  function drawRunway(c, m, idx) {
    var L = rwLen(m), ghost = m._ghost;
    inLocal(c, m, function () {
      var hw = RVW / 2, kk = RVW / 22;
      c.fillStyle = COL.asph; c.fillRect(-L / 2, -hw, L, RVW);
      c.strokeStyle = "rgba(255,255,255,.75)"; c.lineWidth = 0.8;
      line(c, -L / 2 + 2, -hw + 2, L / 2 - 2, -hw + 2); line(c, -L / 2 + 2, hw - 2, L / 2 - 2, hw - 2);
      c.fillStyle = "rgba(255,255,255,.85)";
      for (var k = 0; k < 8; k++) { c.fillRect(-L / 2 + 4, -hw + 3.5 + k * (RVW - 7) / 7.6, 12, 1.6); c.fillRect(L / 2 - 16, -hw + 3.5 + k * (RVW - 7) / 7.6, 12, 1.6); }
      c.fillRect(-L / 2 + 70, -6 * kk, 16, 3 * kk); c.fillRect(-L / 2 + 70, 3 * kk, 16, 3 * kk);
      c.fillRect(L / 2 - 86, -6 * kk, 16, 3 * kk); c.fillRect(L / 2 - 86, 3 * kk, 16, 3 * kk);
      c.setLineDash([10, 9]); c.lineWidth = 1; line(c, -L / 2 + 44, 0, L / 2 - 44, 0); c.setLineDash([]);
      var A = axes(m.a), n1 = bearing(A.ux, A.uy), n2 = n1 > 18 ? n1 - 18 : n1 + 18;
      var sfx = mods("runway").length > 1 && !ghost ? (idx === 0 ? "R" : "L") : "";
      c.font = "700 7px " + FONT;
      c.save(); c.translate(-L / 2 + 26, 0); c.rotate(Math.PI / 2); c.fillText(pad(n1) + sfx, 0, 0); c.restore();
      c.save(); c.translate(L / 2 - 26, 0); c.rotate(-Math.PI / 2); c.fillText(pad(n2) + (sfx === "R" ? "L" : sfx === "L" ? "R" : ""), 0, 0); c.restore();
      // Landerichtung
      c.fillStyle = "rgba(240,168,72,.9)";
      c.beginPath(); c.moveTo(-L / 2 - 30, -6); c.lineTo(-L / 2 - 14, 0); c.lineTo(-L / 2 - 30, 6); c.closePath(); c.fill();
      c.fillRect(-L / 2 - 50, -1.2, 22, 2.4);
      if (G.up.ils && idx === 0 && !ghost) {
        var on = Math.floor(R.clock * 6) % 6;
        for (var j = 0; j < 6; j++) { c.fillStyle = j === on ? "#FFF6D0" : "rgba(255,246,208,.45)"; c.fillRect(-L / 2 - 58 - j * 7, -1, 3, 2); }
      }
    });
  }

  function drawMod(c, m) {
    var s = SIZE[m.t], w = s[0], h = s[1];
    if (m.t === "stand") {
      c.strokeStyle = "rgba(255,255,255,.9)"; c.lineWidth = 1;
      c.strokeRect(-w / 2 + 4, -h / 2 + 2, w - 8, h - 4);
      if (m.heavy) { c.strokeStyle = COL.line; c.strokeRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2); }
      c.strokeStyle = COL.line; line(c, 0, -h / 2, 0, h / 2 - 8);
      c.fillStyle = "rgba(30,32,30,.7)"; c.font = "600 8px " + FONT;
      c.fillText((m.heavy ? "H" : "") + standNo(m), w / 2 - 12, h / 2 - 9);
      if (!m._conn) {
        c.fillStyle = "#C2412D"; c.beginPath(); c.arc(-w / 2 + 10, h / 2 - 10, 6, 0, Math.PI * 2); c.fill();
        c.fillStyle = "#FFF"; c.font = "700 8px " + FONT; c.fillText("!", -w / 2 + 10, h / 2 - 9.5);
      } else if (!(m.gate && m._term)) {
        c.fillStyle = "#E3B83F"; c.fillRect(-w / 2 + 6, h / 2 - 13, 16, 6); c.fillStyle = "#151715"; c.fillRect(-w / 2 + 8, h / 2 - 11, 12, 2);
      }
    } else if (m.t === "term" && termLvl(m) >= 2) {
      // modernes Terminal: Glasdach mit Sheds, helle Fassade
      c.fillStyle = "#F4F5F2"; c.fillRect(-w / 2, -h / 2, w, h);
      c.fillStyle = "#93AFC2"; c.fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4);
      c.fillStyle = "#B6CBD8"; for (var gk = -w / 2 + 4; gk < w / 2 - 4; gk += 10) c.fillRect(gk, -h / 2 + 3, 5, h - 6);
      c.strokeStyle = "#E8EEF1"; c.lineWidth = 0.8; c.beginPath(); c.moveTo(-w / 2 + 2, 0); c.quadraticCurveTo(0, -h * 0.3, w / 2 - 2, 0); c.stroke();
      if (m.shops) { var sc = ["#C2412D", "#2F6F8F", "#D9A21B", "#3E7F5B"]; for (var si = 0; si < 4; si++) { c.fillStyle = sc[si]; c.fillRect(-w / 2 + 8 + si * 9, h / 2 - 9, 7, 6); } }
      if (m.lounge) { c.fillStyle = "#6E9B4E"; c.fillRect(w / 2 - 30, h / 2 - 12, 24, 9); c.fillStyle = "#86B35E"; c.fillRect(w / 2 - 28, h / 2 - 10, 9, 5); }
    } else if (isHotel(m.t)) {
      var HP = [["#EDE8DF", "#C9BBA8", "#B5A691", "#2F6F8F"], ["#F1ECE6", "#B9C4CC", "#A3B0BA", "#8A3B2E"], ["#EEE9E0", "#D2B9A0", "#BFA286", "#2E6B4F"],
        ["#F2EFEA", "#C4C9B6", "#AEB59C", "#5B3F73"], ["#EDE6DC", "#D6C49A", "#C2AE80", "#24496B"], ["#F0EEEA", "#BDB4C2", "#A79DAE", "#9A5A12"]][(m.hc || 0) % 6];
      var by0 = -h / 2, bh = h;
      if (m.t === "hotell") { // Parkplatz zur Straße hin, Gebäude dahinter
        var rs = hotelRS(m), py0 = rs > 0 ? h / 2 - 26 : -h / 2; by0 = rs > 0 ? -h / 2 : -h / 2 + 26; bh = h - 26;
        c.fillStyle = COL.asph; c.fillRect(-w / 2, py0, w, 26);
        c.strokeStyle = "rgba(244,241,236,.75)"; c.lineWidth = 0.6;
        for (var px2 = -w / 2 + 6; px2 <= w / 2 - 6; px2 += 7) { c.beginPath(); c.moveTo(px2, py0 + (rs > 0 ? 26 : 0)); c.lineTo(px2, py0 + (rs > 0 ? 15 : 11)); c.stroke(); }
        var PC = ["#C2412D", "#E9ECEE", "#2F6F8F", "#3A3A40", "#D9A21B", "#8C9AA6"];
        for (var ci = 0; ci < 12; ci++) { if ((ci * 7 + m.id * 3) % 5 === 0) continue; c.fillStyle = PC[(ci + m.id) % 6]; c.fillRect(-w / 2 + 7.2 + ci * 7, py0 + (rs > 0 ? 17 : 2), 4.6, 7); }
      }
      c.fillStyle = HP[0]; c.fillRect(-w / 2, by0, w, bh);
      c.fillStyle = HP[1]; c.fillRect(-w / 2 + 3, by0 + 3, w - 6, bh - 6);
      if (m.t === "hotels") { c.fillStyle = HP[2]; c.fillRect(-w / 2 + 6, by0 + 6, w - 12, bh - 12); c.fillStyle = HP[1]; c.fillRect(-w / 2 + 9, by0 + 9, w - 18, bh - 18); }
      else { c.fillStyle = HP[2]; for (var hk = -w / 2 + 6; hk < w / 2 - 6; hk += 8) c.fillRect(hk, by0 + 5, 4, bh - 10); }
      if (m.t !== "hotels") { c.fillStyle = "#67B7D6"; c.fillRect(w / 2 - 22, by0 + 6, 14, 9); c.strokeStyle = HP[0]; c.lineWidth = 1; c.strokeRect(w / 2 - 22, by0 + 6, 14, 9); }
      if (m.t === "hotell") { c.fillStyle = "#7FA05A"; c.fillRect(-w / 2 + 26, by0 + 6, 18, bh - 12); }
      var sgx = -w / 2 + (m.t === "hotels" ? 4 : 6), sgy = by0 + bh / 2;
      c.fillStyle = HP[3]; c.fillRect(sgx, sgy - 5, 14, 10); c.fillStyle = "#FFF"; c.font = "700 7px " + FONT; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("H", sgx + 7, sgy + 0.5);
    } else if (m.t === "tank") {
      var rT = w / 2 - 2, lvl = fuelPct() / 100;
      c.fillStyle = "#E9ECEE"; c.beginPath(); c.arc(0, 0, rT, 0, Math.PI * 2); c.fill();
      c.strokeStyle = "#B9C0C6"; c.lineWidth = 1.2; c.stroke();
      c.beginPath(); c.arc(0, 0, rT * 0.72, 0, Math.PI * 2); c.strokeStyle = "#CBD1D6"; c.lineWidth = 0.8; c.stroke();
      c.fillStyle = "rgba(255,255,255,.65)"; c.beginPath(); c.arc(-rT * 0.3, -rT * 0.3, rT * 0.35, 0, Math.PI * 2); c.fill();
      c.fillStyle = lvl < 0.2 ? "#C2412D" : "#E3B83F"; c.fillRect(-rT * 0.6, rT * 0.55, rT * 1.2 * lvl, 3); c.strokeStyle = "#7D8794"; c.lineWidth = 0.5; c.strokeRect(-rT * 0.6, rT * 0.55, rT * 1.2, 3);
    } else if (m.t === "term") {
      c.fillStyle = "#F4F1EC"; c.fillRect(-w / 2, -h / 2, w, h);
      c.fillStyle = "#8E7D72"; c.fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4);
      c.fillStyle = "#C3D3DE";
      for (var k = 0; k < 2; k++) for (var r = 0; r < 2; r++) c.fillRect(-w / 2 + 10 + k * 54, -h / 2 + 7 + r * 9, 46, 4);
      var e = G.up.ext;
      if (e >= 1) { c.fillStyle = "#B9AA9E"; c.fillRect(-w / 2 + 22, h / 2 - 16, w - 44, 7); }
      if (e >= 2) { c.fillStyle = "#7E9A6E"; c.fillRect(-w / 2 + 7, h / 2 - 16, 9, 9); c.fillRect(w / 2 - 16, h / 2 - 16, 9, 9); }
      if (e >= 3) { c.fillStyle = "#AEBFCB"; c.beginPath(); c.arc(0, 0, 9, 0, Math.PI * 2); c.fill(); c.strokeStyle = "#F4F1EC"; c.lineWidth = 1.2; c.stroke(); }
    } else if (m.t === "tower") {
      c.fillStyle = "rgba(0,0,0,.2)"; c.beginPath(); c.arc(5, 7, 12, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#D7DAD3"; c.fillRect(-10, -10, 20, 20);
      c.fillStyle = "#24302E"; c.beginPath(); c.arc(0, 0, 9, 0, Math.PI * 2); c.fill();
      c.strokeStyle = "#8FB3B8"; c.lineWidth = 1.5; c.stroke();
      c.fillStyle = "#E7E9E4"; c.beginPath(); c.arc(0, 0, 3, 0, Math.PI * 2); c.fill();
      if (m.lvl >= 2) {
        var a = R.clock * 2.5; c.strokeStyle = "#F6F6F2"; c.lineWidth = 2;
        line(c, 22 - Math.cos(a) * 7, -12 - Math.sin(a) * 7, 22 + Math.cos(a) * 7, -12 + Math.sin(a) * 7);
      }
    } else if (m.t === "fire") {
      c.fillStyle = "#B33A2E"; c.fillRect(-w / 2, -h / 2, w, h);
      c.fillStyle = "#E7E9E4"; c.fillRect(-w / 2, -h / 2, w, 9);
      var doors = m.lvl >= 2 ? 3 : 2;
      for (var i = 0; i < doors; i++) { c.fillStyle = "#8E2A20"; c.fillRect(-w / 2 + 4 + i * 16, -h / 2 + 1, 12, 7); c.fillStyle = "#D8392B"; c.fillRect(-w / 2 + 5 + i * 16, -h / 2 - 9, 10, 7); }
      c.fillStyle = "#FFF"; c.font = "700 6.5px " + FONT; c.fillText(lang === "de" ? "FEUERWEHR" : "FIRE", 0, 6);
    } else if (m.t === "hangar") {
      c.fillStyle = "#C9CCC5"; c.fillRect(-w / 2, -h / 2, w, h);
      c.fillStyle = "#B7BBB3"; for (var j = 0; j < 7; j++) c.fillRect(-w / 2, -h / 2 + 5 + j * 8, w, 2);
      if (m.lvl >= 2) { c.fillStyle = "#9EA39A"; c.fillRect(-0.5, -h / 2, 1, h); }
      c.fillStyle = "#2F3330"; c.fillRect(-w / 2 + 6, -h / 2, w - 12, 3);
      if (R.hangarT > 0) { c.save(); c.rotate(-Math.PI / 2); shape(c, TYPES[R.hangarType === "w" ? "n" : R.hangarType], "#E6EBF0", "#888"); c.restore(); }
      c.fillStyle = "rgba(30,32,30,.7)"; c.font = "700 7px " + FONT; c.fillText(lang === "de" ? "WARTUNG" : "MRO", 0, h / 2 - 7);
    } else if (m.t === "deck") {
      c.fillStyle = "#A9825A"; c.fillRect(-w / 2, -h / 2, w, h);
      c.fillStyle = "#94704B"; for (var q = 0; q < w; q += 6) c.fillRect(-w / 2 + q, -h / 2, 1, h);
      c.strokeStyle = "#E7E9E4"; c.lineWidth = 1.2; c.strokeRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2);
      for (var v = 0; v < Math.round(R.visitors); v++) {
        c.fillStyle = ["#2F6F8F", "#C2412D", "#D9A21B", "#151715"][v % 4];
        c.beginPath(); c.arc(-w / 2 + 6 + ((v * 37) % (w - 12)), -h / 2 + 5 + ((v * 13) % 10), 1.8, 0, Math.PI * 2); c.fill();
      }
      c.fillStyle = "rgba(30,32,30,.75)"; c.font = "700 6.5px " + FONT; c.fillText(lang === "de" ? "AUSSICHT" : "VIEWING", 0, h / 2 - 8);
    } else if (m.t === "park") {
      c.fillStyle = "#6A6370"; c.fillRect(-w / 2, -h / 2, w, h);
      c.strokeStyle = "rgba(255,255,255,.55)"; c.lineWidth = 0.6;
      for (var rr2 = 0; rr2 < 2; rr2++) for (var i2 = 0; i2 <= 8; i2++) line(c, -w / 2 + 4 + i2 * 8, -h / 2 + 3 + rr2 * 23, -w / 2 + 4 + i2 * 8, -h / 2 + 19 + rr2 * 23);
      c.fillStyle = "#2F6F8F"; c.fillRect(w / 2 - 12, -h / 2 - 5, 10, 10);
      c.fillStyle = "#FFF"; c.font = "700 7px " + FONT; c.fillText("P", w / 2 - 7, -h / 2 + 0.5);
    } else if (m.t === "cab") {
      c.fillStyle = "#6A6370"; c.fillRect(-w / 2, -h / 2, w, h);
      c.strokeStyle = "rgba(242,194,48,.8)"; c.lineWidth = 0.7;
      for (var tb = 0; tb <= BAYS; tb++) line(c, -w / 2 + 2 + tb * 14.5, -h / 2 + 2, -w / 2 + 2 + tb * 14.5, h / 2 - 2);
      c.fillStyle = "#F2C230"; c.fillRect(w / 2 - 15, -h / 2 - 6, 14, 7);
      c.fillStyle = "#151715"; c.font = "700 4.5px " + FONT; c.fillText("TAXI", w / 2 - 8, -h / 2 - 2.3);
    } else if (m.t === "bus") {
      c.fillStyle = "#C9CCC5"; c.fillRect(-w / 2, -h / 2, w, h);
      c.fillStyle = "#8FB3B8"; c.fillRect(-w / 2 + 6, -h / 2 + 4, w - 18, 6);
      c.fillStyle = "#1F5C4F"; c.beginPath(); c.arc(w / 2 - 6, 4, 4, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#FFF"; c.font = "700 5px " + FONT; c.fillText("H", w / 2 - 6, 4.3);
      if (m._road && Math.floor(R.clock / 6 + m.id) % 2 === 0) { c.fillStyle = "#E3B83F"; c.fillRect(-w / 2 + 2, h / 2 + 3, 30, 8); }
    }
  }
  function standNo(m) { return mods("stand").indexOf(m) + 1; }

  function drawGhost(c) {
    var g = V.ghost; if (!g) return;
    if (g.kind === "dozer") {
      var grp = dozeGroup(g.m), back = grp.reduce(function (a, q) { return a + Math.round((q.paid || 0) / 2); }, 0);
      c.fillStyle = "rgba(194,65,45,.28)";
      grp.forEach(function (q) { var f = foot(q); c.save(); c.translate(f.x, f.y); c.rotate(f.a); c.fillRect(-f.hw, -f.hh, f.hw * 2, f.hh * 2); c.restore(); outline(c, f, "#C2412D", 2 / V.zoom); });
      var f0 = foot(g.m);
      pill(c, f0.x, f0.y - f0.hh - 14 / V.zoom, g.busy ? t("delBusy") : NAMES[g.m.t] ? NAMES[g.m.t][lang] + " · +" + eurS(back) : "+" + eurS(back), "rgba(194,65,45,.92)");
      return;
    }
    if (g.move && V.tool && V.tool.mid) { var om = byId(V.tool.mid); if (om) outline(c, foot(om), "rgba(244,241,236,.8)", 1.5 / V.zoom); }
    c.globalAlpha = 0.75;
    if (g.kind === "rect") {
      var m = { t: g.t, x: g.x, y: g.y, a: g.a, id: 0, lvl: 1, _conn: true, _road: true };
      inLocal(c, m, function () { var s = SIZE[g.t]; c.fillStyle = COL.pave; c.fillRect(-s[0] / 2 - 6, -s[1] / 2 - 6, s[0] + 12, s[1] + 12); drawMod(c, m); });
      c.globalAlpha = 1; outline(c, { x: g.x, y: g.y, a: g.a, hw: SIZE[g.t][0] / 2, hh: SIZE[g.t][1] / 2 }, g.ok ? "#2E7D5B" : "#C2412D", 2 / V.zoom);
    } else if (g.kind === "rwpt") {
      c.globalAlpha = 1; c.fillStyle = "#151715"; c.beginPath(); c.arc(g.p.x, g.p.y, 5 / V.zoom, 0, Math.PI * 2); c.fill();
    } else if (g.kind === "runway") {
      if (g.len > 30) drawRunway(c, { x: g.x, y: g.y, a: g.a, len: g.len, _ghost: true }, 0);
      c.globalAlpha = 1; outline(c, { x: g.x, y: g.y, a: g.a, hw: g.len / 2, hh: RW_W / 2 }, g.ok ? "#2E7D5B" : "#C2412D", 2 / V.zoom);
      var lbl = (g.short ? t("rwShort") : fmt(t("rwLen"), { m: rwMeters(g.len).toLocaleString(loc()) }) + " · " + eurS(g.cost)) + (g.short ? "" : " · " + rwClasses(g.len));
      pill(c, g.x, g.y - 30 / V.zoom, lbl, g.ok ? "rgba(21,23,21,.85)" : "rgba(194,65,45,.92)");
    } else if (g.kind === "route") {
      var T = V.tool, pts = T.pts.concat([g.p]);
      c.globalAlpha = 1; c.strokeStyle = T.phase === "app" ? "#2F6F8F" : "#B5651D"; c.lineWidth = 2.5 / V.zoom; c.setLineDash([10 / V.zoom, 6 / V.zoom]);
      c.beginPath();
      var rw = byId(T.rw);
      if (rw && T.phase === "dep") { var e = rwEnds(rw); c.moveTo(e.B.x, e.B.y); } else c.moveTo(pts[0].x, pts[0].y);
      pts.forEach(function (q) { c.lineTo(q.x, q.y); });
      if (rw && T.phase === "app") { var e2 = rwEnds(rw); c.lineTo(e2.A.x - e2.dx * 300, e2.A.y - e2.dy * 300); c.lineTo(e2.A.x, e2.A.y); }
      c.stroke(); c.setLineDash([]);
      T.pts.forEach(function (q) { c.fillStyle = "#151715"; c.beginPath(); c.arc(q.x, q.y, 4 / V.zoom, 0, Math.PI * 2); c.fill(); });
    } else if (g.kind === "line" || g.kind === "curve") {
      if (g.a) {
        var gp = g.pts || [g.a, g.b], gw = g.t === "taxi" ? TW_W : V.owm === 2 ? SL_W : RD_W;
        c.lineCap = "round"; c.lineJoin = "round"; c.strokeStyle = g.t === "taxi" ? COL.asph : COL.road; c.lineWidth = gw;
        c.beginPath(); gp.forEach(function (q, i) { if (i) c.lineTo(q.x, q.y); else c.moveTo(q.x, q.y); }); c.stroke(); c.lineCap = "butt";
        if (V.owm) for (var gi = 1; gi < gp.length; gi++) { c.save(); c.translate(gp[gi - 1].x, gp[gi - 1].y); c.rotate(Math.atan2(gp[gi].y - gp[gi - 1].y, gp[gi].x - gp[gi - 1].x)); arrows(c, dist(gp[gi - 1], gp[gi]), g.t === "taxi" ? COL.line : "#FFFFFF", 3.2); c.restore(); }
        c.globalAlpha = 1; c.strokeStyle = g.ok ? "#2E7D5B" : "#C2412D"; c.lineWidth = 2 / V.zoom;
        c.beginPath(); gp.forEach(function (q, i) { if (i) c.lineTo(q.x, q.y); else c.moveTo(q.x, q.y); }); c.stroke();
        if (g.ctrl) { c.setLineDash([4 / V.zoom, 4 / V.zoom]); c.lineWidth = 1 / V.zoom; c.strokeStyle = "#151715"; line(c, g.a.x, g.a.y, g.ctrl.x, g.ctrl.y); line(c, g.ctrl.x, g.ctrl.y, g.b.x, g.b.y); c.setLineDash([]); }
        var mid = gp[Math.floor(gp.length / 2)];
        c.fillStyle = "#151715"; c.font = "600 " + (11 / V.zoom) + "px " + FONT;
        c.fillText(eurS(g.cost), mid.x, mid.y - 14 / V.zoom);
      }
      c.globalAlpha = 1;
      var p = g.b || g.p;
      c.fillStyle = g.snap ? "#2E7D5B" : "#151715"; c.beginPath(); c.arc(p.x, p.y, 4 / V.zoom, 0, Math.PI * 2); c.fill();
    }
    c.globalAlpha = 1;
  }

  function plane(c, p) {
    var T = TYPES[p.type], alt = p.alt || 0, s = 1 + alt * 0.7, a = p.state === "hold" ? p.fade : 1;
    if (alt > 0.02) { c.save(); c.globalAlpha = 0.22 * a; c.translate(p.x + alt * 14, p.y + alt * 20); c.rotate(p.h); shape(c, T, "#000", null); c.restore(); }
    c.save(); c.globalAlpha = a; c.translate(p.x, p.y); c.rotate(p.h); c.scale(s, s); shape(c, T, "#E6EBF0", p.al.col, p.al.n ? p.al : null); c.restore();
  }
  // Flugzeug von oben: schlanker Rumpf mit Nase und Heckkonus, gepfeilte Flügel (Jets etwa 30° nach hinten),
  // Höhenleitwerk, Triebwerke unter den Flügeln. Turboprops mit geraden Flügeln und Propellern.
  function shape(c, T, body, tail, liv) {
    var L = T.len, hl = L / 2, sp = T.span / 2, prop = !!T.prop, fw = L * (prop ? 0.105 : 0.115) / 2 + 0.25;
    var sw = Math.tan((T.swp || 0) * Math.PI / 180), cr = L * (prop ? 0.13 : 0.2), ct = cr * (prop ? 0.7 : 0.3), le = prop ? L * 0.14 : L * 0.1;
    var dark = body === "#000";
    c.fillStyle = body; c.strokeStyle = "#7D8794"; c.lineWidth = 0.35;
    // Flügel
    function wing(side) {
      var tipLE = le - sp * sw;
      c.beginPath(); c.moveTo(le, side * fw * 0.8); c.lineTo(tipLE, side * sp); c.lineTo(tipLE - ct, side * sp); c.lineTo(le - cr, side * fw * 0.8); c.closePath(); c.fill(); if (tail) c.stroke();
    }
    wing(-1); wing(1);
    // Höhenleitwerk
    if (liv) c.fillStyle = liv.col;
    var hs = sp * (prop ? 0.34 : 0.36), hcr = L * 0.11, hsw = Math.tan(((T.swp || 0) + (prop ? 0 : 6)) * Math.PI / 180), hle = -hl + L * (prop ? 0.13 : 0.15);
    [-1, 1].forEach(function (side) { c.beginPath(); c.moveTo(hle, side * fw * 0.4); c.lineTo(hle - hs * hsw, side * hs); c.lineTo(hle - hs * hsw - hcr * 0.45, side * hs); c.lineTo(hle - hcr, side * fw * 0.3); c.closePath(); c.fill(); if (tail) c.stroke(); });
    // Rumpf: spitz zulaufende Nase, lange gleich breite Röhre, schlanker Heckkonus
    var nose = hl - L * 0.1, tailS = -hl + L * 0.24;
    if (liv) c.fillStyle = liv.col;
    c.beginPath();
    c.moveTo(hl, 0);
    c.quadraticCurveTo(hl, -fw, nose, -fw); c.lineTo(tailS, -fw); c.quadraticCurveTo(-hl + L * 0.06, -fw * 0.75, -hl, -fw * 0.22);
    c.lineTo(-hl, fw * 0.22); c.quadraticCurveTo(-hl + L * 0.06, fw * 0.75, tailS, fw); c.lineTo(nose, fw); c.quadraticCurveTo(hl, fw, hl, 0);
    c.closePath(); c.fill(); if (tail) c.stroke();
    // Triebwerke
    if (!dark) {
      if (prop) {
        [-1, 1].forEach(function (side) {
          var y = side * sp * 0.34; c.fillStyle = "#C9CED4"; c.fillRect(le - cr * 0.6, y - fw * 0.42, cr * 0.9, fw * 0.84);
          c.strokeStyle = "rgba(60,64,70,.55)"; c.lineWidth = 0.4; c.beginPath(); c.moveTo(le + 0.6, y - sp * 0.16); c.lineTo(le + 0.6, y + sp * 0.16); c.stroke();
        });
      } else {
        var eng = T.heavy ? [0.36] : [0.34];
        eng.forEach(function (f) {
          [-1, 1].forEach(function (side) {
            var y = side * sp * f, x0 = le - sp * f * sw + L * 0.05, el = L * (T.heavy ? 0.13 : 0.12), ew = fw * (T.heavy ? 0.95 : 0.8);
            c.fillStyle = "#B9C0C8"; c.beginPath(); c.moveTo(x0, y - ew / 2); c.lineTo(x0 - el, y - ew / 2 * 0.8); c.lineTo(x0 - el, y + ew / 2 * 0.8); c.lineTo(x0, y + ew / 2); c.closePath(); c.fill();
            c.fillStyle = "#59606A"; c.fillRect(x0 - 0.35, y - ew / 2, 0.35, ew);
          });
        });
      }
    }
    if (tail && liv) {
      // Airline: Seitenleitwerk dunkel, heller Streifen über dem Rumpf
      c.fillStyle = liv.dk; c.beginPath(); c.moveTo(-hl, -0.7); c.lineTo(-hl + L * 0.24, -0.38); c.lineTo(-hl + L * 0.24, 0.38); c.lineTo(-hl, 0.7); c.closePath(); c.fill();
      c.fillStyle = "rgba(255,255,255,.55)"; c.fillRect(tailS + L * 0.02, -fw * 0.16, nose - tailS - L * 0.06, fw * 0.32);
      c.fillStyle = "#3B4652"; c.beginPath(); c.moveTo(hl - L * 0.035, -fw * 0.55); c.lineTo(hl - L * 0.06, -fw * 0.7); c.lineTo(hl - L * 0.06, fw * 0.7); c.lineTo(hl - L * 0.035, fw * 0.55); c.closePath(); c.fill();
    } else if (tail) {
      // Seitenleitwerk von oben als Strich in Airline-Farbe, Cockpitfenster
      c.fillStyle = tail; c.beginPath(); c.moveTo(-hl, -0.55); c.lineTo(-hl + L * 0.2, -0.3); c.lineTo(-hl + L * 0.2, 0.3); c.lineTo(-hl, 0.55); c.closePath(); c.fill();
      c.fillStyle = tail; c.fillRect(nose - L * 0.3, -fw, L * 0.3, fw * 0.28); c.fillRect(nose - L * 0.3, fw * 0.72, L * 0.3, fw * 0.28);
      c.fillStyle = "#3B4652"; c.beginPath(); c.moveTo(hl - L * 0.035, -fw * 0.55); c.lineTo(hl - L * 0.06, -fw * 0.7); c.lineTo(hl - L * 0.06, fw * 0.7); c.lineTo(hl - L * 0.035, fw * 0.55); c.closePath(); c.fill();
    }
  }
  function planeLights(c, T) {
    var L = T.len, hl = L / 2, sp = T.span / 2, prop = !!T.prop, sw = Math.tan((T.swp || 0) * Math.PI / 180), cr = L * (prop ? 0.13 : 0.2), ct = cr * (prop ? 0.7 : 0.3), le = prop ? L * 0.14 : L * 0.1;
      // Positionslichter: links rot, rechts grün, weiße Blitzer an den Spitzen, rotes Leuchtfeuer am Rumpf
      var tipLE2 = le - sp * sw, tx = tipLE2 - ct * 0.5, ph = R.clock % 1.2;
      glow(c, tx, -sp, 2.2, "rgba(255,60,50,", 0.95); glow(c, tx, sp, 2.2, "rgba(60,255,120,", 0.95);
      if (ph < 0.08 || (ph > 0.18 && ph < 0.26)) { glow(c, tx, -sp, 4, "rgba(255,255,255,", 1); glow(c, tx, sp, 4, "rgba(255,255,255,", 1); glow(c, -hl, 0, 3, "rgba(255,255,255,", 0.9); }
      if ((R.clock + 0.5) % 1 < 0.15) glow(c, 0, 0, 3.4, "rgba(255,70,50,", 1);
  }
  var GLOW = {};
  function glow(c, x, y, r, rgba, a) {
    var sp = GLOW[rgba];
    if (!sp) {
      sp = document.createElement("canvas"); sp.width = sp.height = 64;
      var x2 = sp.getContext("2d"), g = x2.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, rgba + "1)"); g.addColorStop(0.25, rgba + ".7)"); g.addColorStop(0.55, rgba + ".18)"); g.addColorStop(1, rgba + "0)");
      x2.fillStyle = g; x2.fillRect(0, 0, 64, 64); GLOW[rgba] = sp;
    }
    var R2 = r * 2.2, ga = c.globalAlpha; c.globalAlpha = ga * a; c.drawImage(sp, x - R2, y - R2, R2 * 2, R2 * 2); c.globalAlpha = ga;
  }
  // ---------- Tag und Nacht ----------
  var DAY = 420;   // ein Tag dauert 7 Minuten Spielzeit
  function dayInfo() {
    var tod = (R.clock / DAY + 0.3) % 1, h = tod * 24, dark, dusk = 0;
    if (h >= 7 && h <= 18.5) dark = 0; else if (h > 18.5 && h < 21) dark = (h - 18.5) / 2.5; else if (h >= 21 || h < 4.5) dark = 1; else dark = 1 - (h - 4.5) / 2.5;
    dark = Math.max(0, Math.min(1, dark)); dark = dark * dark * (3 - 2 * dark);
    if (h > 17 && h < 21.5) dusk = Math.sin((h - 17) / 4.5 * Math.PI); else if (h > 4.5 && h < 8.5) dusk = 0.7 * Math.sin((h - 4.5) / 4 * Math.PI);
    return { h: h, dark: dark, dusk: dusk };
  }
  function clockTxt() { var h = dayInfo().h, hh = Math.floor(h), mm = Math.floor((h - hh) * 60 / 10) * 10; return (hh < 10 ? "0" : "") + hh + ":" + (mm < 10 ? "0" : "") + mm; }
  function nightPass(c, z, x0, y0, x1, y1, W, H, dpr) {
    var d = dayInfo();
    if (d.dark < 0.01 && d.dusk < 0.01) return;
    // Abdunkeln: Abendrot in der Dämmerung, kühles Blau in der Nacht
    var r = 255, g = 255, b = 255, k = d.dusk * 0.45 * (1 - d.dark);
    r = r + (255 - r) * k; g = g + (198 - g) * k; b = b + (150 - b) * k;
    var n = d.dark * 0.88; r = r + (48 - r) * n; g = g + (60 - g) * n; b = b + (108 - b) * n;
    c.save(); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.globalCompositeOperation = "multiply"; c.fillStyle = "rgb(" + (r | 0) + "," + (g | 0) + "," + (b | 0) + ")"; c.fillRect(0, 0, W, H); c.restore();
    if (d.dark < 0.08) return;
    c.save(); c.globalCompositeOperation = "lighter"; c.globalAlpha = Math.min(1, d.dark * 1.25);
    function vis(x, y, m) { return x > x0 - m && x < x1 + m && y > y0 - m && y < y1 + m; }
    // Pisten: weiße Randbefeuerung, grüne Schwelle, rote Endbefeuerung
    mods("runway").forEach(function (m) {
      var e = rwEnds(m), nx = -e.dy, ny = e.dx, o = RVW / 2 + 1.5;
      for (var s = 0; s <= e.L; s += 26) { var px = e.A.x + e.dx * s, py = e.A.y + e.dy * s; if (!vis(px, py, 20)) continue; glow(c, px + nx * o, py + ny * o, 1.4, "rgba(255,248,225,", 0.95); glow(c, px - nx * o, py - ny * o, 1.4, "rgba(255,248,225,", 0.95); }
      for (var q = -RVW / 2; q <= RVW / 2; q += 4) { glow(c, e.A.x + nx * q, e.A.y + ny * q, 1.4, "rgba(80,255,130,", 1); glow(c, e.B.x + nx * q, e.B.y + ny * q, 1.4, "rgba(255,70,60,", 1); }
      for (var a2 = 20; a2 <= 140; a2 += 20) { var ax = e.A.x - e.dx * a2, ay = e.A.y - e.dy * a2; if ((R.clock * 2 + a2 / 140) % 1 < 0.15) glow(c, ax, ay, 2.6, "rgba(255,255,255,", 1); else glow(c, ax, ay, 1.2, "rgba(255,240,200,", 0.7); }
    });
    // Rollwege: grüne Mittellinie, blaue Ränder
    mods("taxi").forEach(function (m) {
      var l = Math.hypot(m.x2 - m.x1, m.y2 - m.y1), ux = (m.x2 - m.x1) / l, uy = (m.y2 - m.y1) / l;
      for (var s = 6; s < l; s += 16) { var px = m.x1 + ux * s, py = m.y1 + uy * s; if (!vis(px, py, 10)) continue; glow(c, px, py, 1.1, "rgba(80,255,140,", 0.9); if (s % 32 < 16) { glow(c, px - uy * (TW_W / 2 + 1), py + ux * (TW_W / 2 + 1), 1.1, "rgba(80,140,255,", 0.9); glow(c, px + uy * (TW_W / 2 + 1), py - ux * (TW_W / 2 + 1), 1.1, "rgba(80,140,255,", 0.9); } }
    });
    // Straßenlaternen
    mods("road").forEach(function (m) {
      var l = Math.hypot(m.x2 - m.x1, m.y2 - m.y1), ux = (m.x2 - m.x1) / l, uy = (m.y2 - m.y1) / l, o = (m.sl ? SL_W : RD_W) / 2 + 3, step = m.hw ? 90 : 55;
      for (var s = step / 2; s < l; s += step) { var px = m.x1 + ux * s, py = m.y1 + uy * s; if (!vis(px, py, 30)) continue; glow(c, px - uy * o, py + ux * o, 7, "rgba(255,196,120,", 0.42); glow(c, px - uy * o, py + ux * o, 1.3, "rgba(255,226,170,", 1); }
    });
    // Gebäude: Fenster, Flutlicht, Leuchtfeuer
    G.mods.forEach(function (m) {
      if (m.t === "road" || m.t === "taxi" || m.t === "runway" || !vis(m.x, m.y, 90)) return;
      var sz = SIZE[m.t] || [20, 20], A = axes(m.a), w2 = sz[0] / 2, h2 = sz[1] / 2;
      function L2p(lx, ly) { return { x: m.x + A.ux * lx + A.vx * ly, y: m.y + A.uy * lx + A.vy * ly }; }
      function lg(lx, ly, r, col, a) { var q = L2p(lx, ly); glow(c, q.x, q.y, r, col, a); }
      if (m.t === "term") { for (var u = -w2 + 6; u < w2 - 4; u += 8) { lg(u, -h2 + 1.5, 2.4, "rgba(255,214,140,", 0.85); lg(u, h2 - 1.5, 2.4, "rgba(255,214,140,", 0.85); } lg(0, 0, 26, "rgba(255,200,120,", 0.25); }
      else if (m.t === "tower") { lg(0, 0, 9, "rgba(170,230,255,", 0.5); if (R.clock % 2 < 1) lg(0, 0, 3, "rgba(80,255,120,", 1); else lg(0, 0, 3, "rgba(255,255,255,", 1); }
      else if (m.t === "hangar") { lg(0, h2 + 6, 22, "rgba(255,240,210,", 0.35); lg(-w2 + 4, -h2 + 4, 2, "rgba(255,70,60,", 1); }
      else if (m.t === "fire") { lg(0, h2 + 4, 14, "rgba(255,230,200,", 0.35); if (R.clock % 1.4 < 0.2) lg(0, 0, 3, "rgba(255,80,60,", 1); }
      else if (m.t === "park") { [[-w2 + 3, -h2 + 3], [w2 - 3, -h2 + 3], [-w2 + 3, h2 - 3], [w2 - 3, h2 - 3], [0, 0]].forEach(function (q) { lg(q[0], q[1], 9, "rgba(255,206,140,", 0.38); lg(q[0], q[1], 1.3, "rgba(255,230,180,", 1); }); }
      else if (m.t === "bus" || m.t === "cab") { lg(0, 0, 10, "rgba(255,226,170,", 0.4); }
      else if (m.t === "deck") { for (var u2 = -w2 + 6; u2 < w2; u2 += 12) lg(u2, 0, 2, "rgba(255,226,170,", 0.8); }
      else if (isHotel(m.t)) { if (m.t === "hotell") lg(0, hotelRS(m) > 0 ? h2 - 13 : -h2 + 13, 18, "rgba(255,226,170,", 0.45); for (var u3 = -w2 + 8; u3 < w2 - 4; u3 += 8) for (var v3 = -h2 + 8; v3 < h2 - 4; v3 += 10) if ((u3 * 7 + v3 * 3 + m.id) % 5 < 3 && !(m.t === "hotell" && (hotelRS(m) > 0 ? v3 > h2 - 28 : v3 < -h2 + 28))) lg(u3, v3, 1.8, "rgba(255,214,150,", 0.85); lg(-w2 + 13, 0, 8, "rgba(120,190,255,", 0.6); }
      else if (m.t === "tank") { if (R.clock % 1.6 < 0.8) lg(0, 0, 2.6, "rgba(255,60,50,", 1); lg(0, h2 + 4, 10, "rgba(255,230,190,", 0.3); }
      else if (m.t === "term" && termLvl(m) >= 2) lg(0, 0, 30, "rgba(170,210,255,", 0.25);
      else if (m.t === "stand") { lg(-w2 + 4, h2 - 4, 26, "rgba(255,236,200,", 0.28); lg(w2 - 4, h2 - 4, 26, "rgba(255,236,200,", 0.28); lg(-w2 + 4, h2 - 4, 1.8, "rgba(255,240,210,", 1); lg(w2 - 4, h2 - 4, 1.8, "rgba(255,240,210,", 1); }
    });
    // Scheinwerfer der Fahrzeuge
    R.veh.forEach(function (v) { if (!v.path || !vis(v.x, v.y, 20)) return; var f = v.len / 2 + 2.5, bx = v._dx !== undefined ? v._dx : v.x, by = v._dy !== undefined ? v._dy : v.y; glow(c, bx + Math.cos(v.h) * f, by + Math.sin(v.h) * f, 3, "rgba(255,240,200,", 0.6); });
    // Flugzeuge: Positions- und Blitzlichter, Landescheinwerfer beim Rollen
    R.planes.forEach(function (p) {
      if (p.state === "hold" && !p.fade) return;
      var T = TYPES[p.type], s = 1 + (p.alt || 0) * 0.7;
      c.save(); c.translate(p.x, p.y); c.rotate(p.h); c.scale(s, s); planeLights(c, T);
      if ((p.alt || 0) < 0.3) glow(c, T.len / 2 + 8, 0, 6, "rgba(255,250,230,", 0.35);
      c.restore();
    });
    c.restore();
  }

  // ---------- Werkzeuge und Eingabe ----------
  function world(sx, sy) { return { x: (sx - V.W / 2) / V.zoom + V.cam.x, y: (sy - V.H / 2) / V.zoom + V.cam.y }; }
  function setTool(id) {
    var b = id && bdef(id);
    if (V.tool && V.tool.kind === "route") finishRoute(true, true);
    V.tool = b ? { id: id, kind: b.tool, start: null } : null;
    V.ghost = null;
    if (b) V.sel = null;
    updatePanel(true); updateSel(); updateHint(); updateDozBtn();
  }
  // Abriss-Werkzeug und Versetzen laufen ohne Eintrag im Baumenü
  var MOVEFEE = 25000, MOVABLE = { park: 1, bus: 1, stand: 1, cab: 1 };
  function setDozer(on) {
    if (V.tool && V.tool.kind === "route") finishRoute(true, true);
    V.tool = on ? { id: "dozer", kind: "dozer" } : null; V.ghost = null; V.sel = null;
    updatePanel(true); updateSel(); updateHint(); updateDozBtn();
  }
  function updateDozBtn() { var b = V.root.querySelector("[data-dozer]"); if (b) b.setAttribute("aria-pressed", String(!!(V.tool && V.tool.kind === "dozer"))); }
  function startMove(m) {
    if (inUse(m)) { msg(t("mvBusy")); return; }
    if (G.money < MOVEFEE) { msg(t("poor")); return; }
    V.tool = { id: "move", kind: "move", mid: m.id }; V.ang = m.a; V.ghost = null; V.sel = null;
    updatePanel(true); updateSel(); updateHint(); updateDozBtn();
  }
  function dozeGroup(m) { return m.cv ? G.mods.filter(function (q) { return q.cv === m.cv; }) : [m]; }
  function dozeAt(p, click) {
    var m = pick(p); if (!m || m.hw) return;
    if (!click && m.t === "runway") return;      // Pisten nur per gezieltem Klick
    if (inUse(m)) { if (click) msg(t("delBusy")); return; }
    var back = dozeGroup(m).reduce(function (a, q) { return a + Math.round((q.paid || 0) / 2); }, 0);
    demolish(m); V.sel = null;
    if (back) R.fx.push({ x: p.x, y: p.y, t: 0, txt: t("dozer") + " +" + eur(back) });
  }
  // Routen zeichnen: nach dem Bau einer Piste erst Anflug, dann Abflug
  function startRoute(rwId, phase) {
    V.tool = { id: "route", kind: "route", rw: rwId, phase: phase, pts: [] };
    V.ghost = null; V.sel = null; updatePanel(true); updateSel(); updateHint();
  }
  function finishRoute(skip, quiet) {
    var T = V.tool; if (!T || T.kind !== "route") return;
    var rw = byId(T.rw);
    if (rw) { if (!skip && T.pts.length) rw[T.phase] = T.pts.slice(); else delete rw[T.phase]; save(); }
    V.tool = null; V.ghost = null;
    if (quiet) return;
    if (T.phase === "app" && T.chain && rw) { startRoute(rw.id, "dep"); V.tool.chain = true; msg(t("appDone"), true); return; }
    if (T.chain) msg(t("depDone"), true);
    updatePanel(true); updateSel(); updateHint();
  }
  function updateGhost() {
    var T = V.tool; if (!T || !V.mouse) { V.ghost = null; return; }
    if (T.kind === "route") { V.ghost = { kind: "route", p: V.mouse }; return; }
    if (T.kind === "dozer") { var hm = pick(V.mouse); V.ghost = hm && !hm.hw ? { kind: "dozer", m: hm, busy: inUse(hm) } : null; return; }
    if (T.kind === "move") {
      var mm = byId(T.mid); if (!mm) { setTool(null); return; }
      V.ignore = mm.id;
      var ms = snapRect(mm.t, V.mouse.x, V.mouse.y, V.ang), mg = ms ? { x: ms.x, y: ms.y, a: ms.a } : { x: V.mouse.x, y: V.mouse.y, a: V.ang };
      mg.kind = "rect"; mg.t = mm.t; mg.move = true; mg.ok = G.money >= MOVEFEE && rectValid(mm.t, mg.x, mg.y, mg.a) && !inUse(mm); mg.snapped = !!ms;
      V.ignore = null; V.ghost = mg; return;
    }
    var b = bdef(T.id), p = V.mouse, cost = b.cost(), lock = b.lock();
    if (T.kind === "rect") {
      var s = snapRect(T.id, p.x, p.y, V.ang);
      var g = s ? { x: s.x, y: s.y, a: s.a } : { x: p.x, y: p.y, a: V.ang };
      g.kind = "rect"; g.t = T.id; g.ok = !lock && G.money >= cost && rectValid(T.id, g.x, g.y, g.a); g.snapped = !!s;
      V.ghost = g;
    } else if (T.kind === "runway") {
      if (!T.start) { V.ghost = { kind: "rwpt", p: p }; return; }
      var a = Math.atan2(p.y - T.start.y, p.x - T.start.x);
      if (V.shift) a = Math.round(a / STEP) * STEP;
      mods("runway").forEach(function (m) {
        var d = Math.atan2(Math.sin(a - m.a), Math.cos(a - m.a));
        if (Math.abs(d) < 8 * DEG) a = m.a; else if (Math.abs(Math.abs(d) - Math.PI) < 8 * DEG) a = m.a + Math.PI;
      });
      var len = Math.min(RW_MAX, dist(p, T.start)), cx = T.start.x + Math.cos(a) * len / 2, cy = T.start.y + Math.sin(a) * len / 2;
      var rc = rwCost(Math.max(len, RW_MIN), mods("runway").length);
      V.ghost = { kind: "runway", x: cx, y: cy, a: a, len: len, cost: rc, short: len < RW_MIN, ok: !lock && G.money >= rc && runwayValid(cx, cy, a, len) };
    } else if (T.kind === "line") {
      var thr = 14 / V.zoom + 4;
      var sp = snapPoint(T.id, p, thr), q = sp ? { x: sp.x, y: sp.y } : { x: p.x, y: p.y };
      if (T.start && V.shift && !sp) {
        var ang = Math.round(Math.atan2(q.y - T.start.y, q.x - T.start.x) / STEP) * STEP, l = dist(q, T.start);
        q = { x: T.start.x + Math.cos(ang) * l, y: T.start.y + Math.sin(ang) * l };
      }
      if (!T.start) { V.ghost = { kind: "line", t: T.id, p: q, snap: !!sp }; return; }
      if (V.curve && T.end) {
        // Quadratische Kurve durch den Mauspunkt, in Stücke von etwa 26 px zerlegt
        var M = { x: p.x, y: p.y }, P0 = T.start, P2 = T.end, P1 = { x: 2 * M.x - (P0.x + P2.x) / 2, y: 2 * M.y - (P0.y + P2.y) / 2 };
        var fine = [], fc = [0];
        for (var i = 0; i <= 120; i++) { var tt = i / 120, u1 = 1 - tt; fine.push({ x: u1 * u1 * P0.x + 2 * u1 * tt * P1.x + tt * tt * P2.x, y: u1 * u1 * P0.y + 2 * u1 * tt * P1.y + tt * tt * P2.y }); if (i) fc.push(fc[i - 1] + dist(fine[i - 1], fine[i])); }
        var arc = fc[120], n = Math.max(2, Math.min(28, Math.floor(arc / 24))), pts = [P0];
        for (var k2 = 1, f2 = 1; k2 < n; k2++) { var want = arc * k2 / n; while (fc[f2] < want) f2++; var fr = (want - fc[f2 - 1]) / ((fc[f2] - fc[f2 - 1]) || 1); pts.push({ x: fine[f2 - 1].x + (fine[f2].x - fine[f2 - 1].x) * fr, y: fine[f2 - 1].y + (fine[f2].y - fine[f2 - 1].y) * fr }); }
        pts.push(P2);
        var len = 0, okc = true; for (var j = 1; j < pts.length; j++) { len += dist(pts[j - 1], pts[j]); if (!lineValid(T.id, pts[j - 1], pts[j])) okc = false; }
        var cc = Math.max(cost, Math.round(len / 10) * b.unit * 10);
        V.ghost = { kind: "curve", t: T.id, a: P0, b: P2, ctrl: P1, pts: pts, snap: false, cost: cc, ok: !lock && G.money >= cc && okc };
        return;
      }
      var c2 = Math.max(cost, Math.round(dist(T.start, q) / 10) * b.unit * 10);
      V.ghost = { kind: "line", t: T.id, a: T.start, b: q, snap: !!sp, cost: c2, ok: !lock && G.money >= c2 && lineValid(T.id, T.start, q) };
    } else V.ghost = null;
  }
  function act() {
    var T = V.tool, g = V.ghost, b = T && bdef(T.id);
    if (!T) return;
    if (T.kind === "route") { if (V.mouse) T.pts.push({ x: V.mouse.x, y: V.mouse.y }); return; }
    if (T.kind === "dozer") return;
    if (T.kind === "move") {
      var mm = byId(T.mid); if (!mm || !g) return;
      if (G.money < MOVEFEE) { msg(t("poor")); return; }
      if (!g.ok) { msg(inUse(mm) ? t("mvBusy") : t("blocked")); return; }
      G.money -= MOVEFEE; mm.x = g.x; mm.y = g.y; mm.a = g.a; clearVeg(mm);
      if (mm.t === "park") { R.veh.filter(function (v) { return v.lot === mm.id; }).forEach(dropVeh); delete R.spots[mm.id]; }
      if (mm.t === "cab") { R.veh.filter(function (v) { return v.rank === mm.id; }).forEach(dropVeh); delete R.bays[mm.id]; }
      rebuild(); save(); msg(NAMES[mm.t][lang] + ": " + t("mvDone") + " · −" + eurS(MOVEFEE), true);
      V.tool = null; V.ghost = null; V.sel = mm.id; updatePanel(true); updateSel(); updateHint(); return;
    }
    if (T.kind === "apply") {
      var hit = pick(V.mouse);
      if (!hit || hit.t !== "stand") return;
      applyStand(T.id, hit); return;
    }
    if (!g) return;
    var lock = b.lock();
    if (lock) { msg(lock); return; }
    if (T.kind === "line" && !T.start) { T.start = { x: g.p.x, y: g.p.y }; updateHint(); return; }
    if (T.kind === "line" && V.curve && !T.end) { if (g.b && dist(g.b, T.start) > 30) { T.end = { x: g.b.x, y: g.b.y }; updateHint(); updateGhost(); } return; }
    if (T.kind === "runway" && !T.start) { T.start = { x: g.p.x, y: g.p.y }; updateHint(); updateGhost(); return; }
    if (g.kind === "runway" && g.short) { msg(t("rwShort")); return; }
    var cost = g.cost || b.cost();
    if (G.money < cost) { msg(t("poor")); return; }
    if (!g.ok) { msg(t("blocked")); return; }
    if (g.kind === "rect") addMod({ t: g.t, x: g.x, y: g.y, a: g.a }, cost);
    else if (g.kind === "runway") { var nm = addMod({ t: "runway", x: g.x, y: g.y, a: g.a, len: Math.round(g.len) }, cost); setTool(null); startRoute(nm.id, "app"); V.tool.chain = true; msg(t("rwBuilt"), true); return; }
    else if (g.kind === "line") { var lm = { t: T.id, x1: g.a.x, y1: g.a.y, x2: g.b.x, y2: g.b.y }; if (V.owm) lm.ow = 1; if (V.owm === 2 && T.id === "road") lm.sl = 1; if (V.owm === 3 && T.id === "road") lm.bl = 1; addMod(lm, cost); T.start = { x: g.b.x, y: g.b.y }; }
    else if (g.kind === "curve") {
      // alle Stücke auf einmal anlegen, ein gemeinsamer Abriss über die Gruppe
      var gid = G.nid, per = Math.round(cost / (g.pts.length - 1));
      for (var ci = 1; ci < g.pts.length; ci++) {
        var cm = { t: T.id, x1: g.pts[ci - 1].x, y1: g.pts[ci - 1].y, x2: g.pts[ci].x, y2: g.pts[ci].y, cv: gid, id: G.nid++, paid: per };
        if (V.owm) cm.ow = 1; if (V.owm === 2 && T.id === "road") cm.sl = 1; if (V.owm === 3 && T.id === "road") cm.bl = 1;
        G.mods.push(cm); clearVeg(cm);
      }
      G.money -= cost; rebuild(); save();
      T.start = { x: g.b.x, y: g.b.y }; T.end = null; updateHint();
    }
    if (T.kind === "rect" && bdef(T.id).lock()) setTool(null);
    updateGhost(); updatePanel(true);
  }
  function applyStand(id, m) {
    var b = bdef(id), cost = b.cost(), lock = b.lock();
    if (lock) { msg(lock); return; }
    if (id === "gate") { if (m.gate) return; if (!m._term) { msg(t("needGateTerm")); return; } }
    if (id === "heavy" && m.heavy) return;
    if (G.money < cost) { msg(t("poor")); return; }
    G.money -= cost; m[id === "gate" ? "gate" : "heavy"] = true; m.paid += cost;
    save(); msg(b.name[lang] + " " + t("built") + ".", true); updatePanel(true); updateSel();
  }
  function pick(p) {
    if (!p) return null;
    for (var i = G.mods.length - 1; i >= 0; i--) {
      var m = G.mods[i];
      if (m.t === "taxi" || m.t === "road") { if (segProj(p, { x: m.x1, y: m.y1 }, { x: m.x2, y: m.y2 }).d < (m.t === "taxi" ? TW_W : RD_W) / 2 + 3) return m; }
      else if (inFoot(foot(m), p, 3)) return m;
    }
    return null;
  }
  function inUse(m) {
    if (m.t === "stand") return !!R.occ[m.id];
    if (m.t === "runway") { var r = R.rw[m.id]; return !!(r && (r.busy || r.next)) || R.planes.some(function (p) { return p.rwId === m.id; }); }
    return false;
  }
  function demolish(m) {
    if (m.hw) return;
    if (inUse(m)) { msg(t("delBusy")); return; }
    var grp = m.cv ? G.mods.filter(function (q) { return q.cv === m.cv; }) : [m];
    grp.forEach(function (q) { G.mods.splice(G.mods.indexOf(q), 1); G.money += Math.round((q.paid || 0) / 2); if (q.t === "road") { R.veh.filter(function (v) { return v.lot === q.id; }).forEach(dropVeh); delete R.spots[q.id]; } });
    if (m.t === "runway") { delete R.rw[m.id]; delete R.q[m.id]; }
    if (m.t === "park" || m.t === "road") { R.veh.filter(function (v) { return v.lot === m.id; }).forEach(dropVeh); delete R.spots[m.id]; }
    if (m.t === "bus") { R.tArrCar += R.stopW[m.id] || 0; delete R.stopW[m.id]; }
    if (m.t === "cab") { R.veh.filter(function (v) { return v.rank === m.id; }).forEach(dropVeh); delete R.bays[m.id]; }
    if (m.t === "tank") G.fuel = Math.min(G.fuel, fuelCap());
    if (isHotel(m.t)) { R.tDep += hotelGuests(m); delete R.hotel[m.id]; }
    V.sel = null; rebuild(); save(); updatePanel(true); updateSel();
  }

  function onDown(e) {
    V.stage.focus({ preventScroll: true });
    var r = V.cv.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top;
    V.mouse = world(sx, sy);
    if (e.button === 1 || e.button === 2 || (e.button === 0 && !V.tool)) {
      V.drag = { sx: sx, sy: sy, cx: V.cam.x, cy: V.cam.y, moved: false, btn: e.button, id: e.pointerId };
      try { V.cv.setPointerCapture(e.pointerId); } catch (er) {}
      return;
    }
    if (e.button === 0 && V.tool && V.tool.kind === "dozer") { V.dozing = true; try { V.cv.setPointerCapture(e.pointerId); } catch (er) {} dozeAt(V.mouse, true); updateGhost(); return; }
    if (e.button === 0 && V.tool && V.tool.kind === "brush") { V.brush = {}; try { V.cv.setPointerCapture(e.pointerId); } catch (er) {} brushAt(V.mouse, e.shiftKey); return; }
    if (e.button === 0) { updateGhost(); act(); }
  }
  function onMove(e) {
    var r = V.cv.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top;
    V.shift = e.shiftKey;
    if (V.drag) {
      var dx = sx - V.drag.sx, dy = sy - V.drag.sy;
      if (Math.abs(dx) + Math.abs(dy) > 4) V.drag.moved = true;
      if (V.drag.moved) { V.cam.x = V.drag.cx - dx / V.zoom; V.cam.y = V.drag.cy - dy / V.zoom; V.cv.style.cursor = "grabbing"; }
    }
    V.mouse = world(sx, sy);
    if (V.brush) brushAt(V.mouse, e.shiftKey);
    if (V.dozing) dozeAt(V.mouse, false);
    updateGhost();
  }
  function onUp(e) {
    if (V.dozing) { V.dozing = false; return; }
    if (V.brush) { V.brush = null; if (V.brushed) { V.brushed = false; save(); updatePanel(true); } return; }
    if (!V.drag) return;
    var d = V.drag; V.drag = null; V.cv.style.cursor = "";
    if (!d.moved && d.btn === 0 && !V.tool) {
      var wk = G.wreck, onW = wk && dist(V.mouse, wk) < TYPES[wk.k].len * 0.7 + 8;
      var m = onW ? null : pick(V.mouse); V.sel = onW ? "wreck" : m ? m.id : null; V.delArm = false; updateSel();
    }
    if (!d.moved && d.btn === 2 && V.tool) {
      if (V.tool.kind === "route") finishRoute(false);
      else if (V.tool.kind === "line" && V.tool.end) { V.tool.end = null; updateGhost(); updateHint(); }
      else if ((V.tool.kind === "line" || V.tool.kind === "runway") && V.tool.start) { V.tool.start = null; updateGhost(); updateHint(); } else setTool(null);
    }
  }
  function onWheel(e) {
    e.preventDefault();
    var r = V.cv.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top;
    var before = world(sx, sy);
    zoomTo(V.zoom * Math.pow(1.0015, -e.deltaY));
    var after = world(sx, sy);
    V.cam.x += before.x - after.x; V.cam.y += before.y - after.y;
    V.mouse = world(sx, sy); updateGhost();
  }
  function zoomTo(z) { V.zoom = Math.max(0.3, Math.min(2.8, z)); }
  var keys = {};
  function onKey(e) {
    if (!V) return;
    var tag = (e.target && e.target.tagName) || "";
    if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
    var k = e.key.toLowerCase(), down = e.type === "keydown";
    V.shift = e.shiftKey;
    if (down && k === "b" && !e.repeat) { setDozer(!(V.tool && V.tool.kind === "dozer")); return; }
    if (down && k === "enter" && V.tool && V.tool.kind === "route") { e.preventDefault(); finishRoute(false); return; }
    if (down && k === "o" && V.tool && V.tool.kind === "line") { cycleOw(); return; }
    if (down && k === "c" && V.tool && V.tool.kind === "line") { V.curve = !V.curve; if (V.tool) V.tool.end = null; updateHint(); updateGhost(); return; }
    if (down && k === "escape") {
      if (V.tool && V.tool.kind === "route") { finishRoute(true); updateGhost(); return; }
      if (V.tool && V.tool.kind === "line" && V.tool.end) { V.tool.end = null; updateHint(); }
      else if (V.tool && (V.tool.kind === "line" || V.tool.kind === "runway") && V.tool.start) { V.tool.start = null; updateHint(); }
      else if (V.tool) setTool(null); else { V.sel = null; updateSel(); }
      updateGhost(); return;
    }
    var rot = V.tool && (V.tool.kind === "rect" || V.tool.kind === "move");
    if ((k === "q" || k === "e") && rot) {
      e.preventDefault();
      if (down && e.shiftKey && !e.repeat) { V.ang = Math.round(V.ang / STEP) * STEP + (k === "q" ? -STEP : STEP); updateGhost(); return; }
      keys[k] = down && !e.shiftKey; return;
    }
    if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].indexOf(k) >= 0) {
      if (!V.stage.contains(document.activeElement) && document.activeElement !== V.stage && document.activeElement !== document.body) return;
      e.preventDefault(); keys[k] = down;
    }
  }
  function keysTick(dt) {
    var rs = 1.6 * dt, ps = 520 / V.zoom * dt;
    if (keys.q || V.rotHold === -1) { V.ang -= rs; updateGhost(); }
    if (keys.e || V.rotHold === 1) { V.ang += rs; updateGhost(); }
    if (keys.w || keys.arrowup) V.cam.y -= ps;
    if (keys.s || keys.arrowdown) V.cam.y += ps;
    if (keys.a || keys.arrowleft) V.cam.x -= ps;
    if (keys.d || keys.arrowright) V.cam.x += ps;
  }

  // ---------- Oberfläche ----------
  var CSS = ".fh-full{position:fixed;inset:0;z-index:70;overflow:hidden;background:#B9C2A2;color:#F4F1EC;font-family:var(--f-body,system-ui,sans-serif);outline:none;touch-action:none;--top:52px;--dock:120px}" +
    ".fh-full canvas{position:absolute;inset:0;width:100%;height:100%;display:block}" +
    ".fh-full button{font-family:inherit;border-radius:0}" +
    ".fh-panel{background:rgba(21,23,21,.86);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)}" +
    ".fh-top{position:absolute;left:0;right:0;top:0;display:flex;align-items:center;flex-wrap:wrap;gap:6px 18px;padding:8px max(14px,env(safe-area-inset-right)) 8px max(14px,env(safe-area-inset-left));padding-top:calc(8px + env(safe-area-inset-top,0px))}" +
    ".fh-back{color:#F4F1EC;text-decoration:none;font-weight:600;font-size:.9rem;white-space:nowrap}.fh-back:hover{text-decoration:underline}" +
    ".fh-title{display:flex;flex-direction:column;min-width:0;margin-right:auto}" +
    ".fh-title b{font:600 1.15rem/1.1 var(--f-display,inherit);white-space:nowrap}.fh-title b span{font:600 .7rem var(--f-body,inherit);border:1px solid rgba(244,241,236,.35);padding:0 6px;margin-left:8px;vertical-align:middle}" +
    ".fh-title small{color:#E3B83F;font-weight:600;font-size:.8rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
    ".fh-hud{display:flex;gap:4px 18px;margin:0;flex-wrap:wrap}.fh-hud div{display:flex;flex-direction:column;min-width:0}" +
    ".fh-hud [data-fhfp]{cursor:pointer}.fh-hud [data-fhfp] dd::after{content:'';display:inline-block;width:13px;height:10px;margin-left:6px;vertical-align:1px;background:linear-gradient(currentColor,currentColor) 0 100%/3px 40% no-repeat,linear-gradient(currentColor,currentColor) 5px 100%/3px 100% no-repeat,linear-gradient(currentColor,currentColor) 10px 100%/3px 65% no-repeat;opacity:.8}" +
    ".fh-hud .crisis{background:#8E241D}.fh-hud .crisis dt{color:#FFD9CF}.fh-hud [data-fhsm]{cursor:pointer}.fh-hud [data-fhsm]:hover dd{color:#E3B83F}.fh-hud [data-fhfp]:hover dd{color:#E3B83F}.fh-hud .up dd{color:#E58A73}.fh-hud .down dd{color:#8FC79A}" +
    ".fh-fp{position:absolute;left:50%;transform:translateX(-50%);top:calc(var(--top) + 10px);width:min(460px,calc(100% - 24px));padding:12px 14px}" +
    ".fh-fp .hd{display:flex;justify-content:space-between;align-items:center}.fh-fp .hd b{font-weight:600}" +
    ".fh-fp .hd button{font:600 1.1rem inherit;width:28px;height:28px;border:1px solid rgba(244,241,236,.35);background:transparent;color:#F4F1EC;cursor:pointer}" +
    ".fh-fp .now{display:flex;align-items:baseline;gap:8px;margin:6px 0 8px}.fh-fp .now span{font:600 1.6rem/1 var(--f-display,inherit);font-variant-numeric:tabular-nums}" +
    ".fh-fp .now small{color:rgba(244,241,236,.6);font-size:.8rem}.fh-fp .now em{font-style:normal;font-size:.85rem;font-variant-numeric:tabular-nums;margin-left:auto}" +
    ".fh-full .fh-fp canvas{position:static;inset:auto;display:block;width:100%;height:auto;aspect-ratio:840/300;background:rgba(0,0,0,.25)}" +
    ".fh-fp .ax{display:flex;justify-content:space-between;font-size:.7rem;color:rgba(244,241,236,.55);margin-top:3px}" +
    ".fh-hud [data-fhwx]{cursor:pointer}.fh-hud [data-fhwx] dd{display:flex;align-items:center;gap:6px}.fh-hud [data-fhwx]:hover dd{color:#E3B83F}.wxi{display:block;flex:none}" +
    ".fh-wxp{width:min(380px,calc(100% - 24px))}.fh-wxp .wxnow{display:flex;align-items:center;gap:14px;margin:6px 0 10px}.fh-wxp .wxnow b{display:block;font:600 1.6rem/1 var(--f-display,inherit)}.fh-wxp .wxnow span{font-size:.84rem;color:rgba(244,241,236,.75)}" +
    ".fh-wxp .wxlist{display:flex;flex-direction:column;gap:2px}.fh-wxp .wxrow{display:grid;grid-template-columns:64px 26px 1fr auto;align-items:center;gap:10px;padding:6px 8px;background:rgba(244,241,236,.05);font-size:.84rem;font-variant-numeric:tabular-nums}" +
    ".fh-wxp .wxrow .dn{color:rgba(244,241,236,.75)}.fh-wxp .wxrow .pp{color:rgba(244,241,236,.6)}.fh-wxp .wxrow .pp.hi{color:#F2A08E;font-weight:600}.fh-wxp p{font-size:.74rem;color:rgba(244,241,236,.55);margin:10px 0 0}" +
    ".fh-sm{width:min(640px,calc(100% - 24px));max-height:calc(100% - var(--top) - var(--dock) - 30px);overflow:auto}.fh-sm p.sub{margin:2px 0 8px;font-size:.82rem;color:rgba(244,241,236,.75);font-variant-numeric:tabular-nums}" +
    ".fh-sm .list{display:flex;flex-direction:column;gap:2px}.fh-sm .srow{display:grid;grid-template-columns:10px minmax(0,1.6fr) 80px minmax(0,1fr) 62px minmax(0,.8fr);align-items:center;gap:10px;padding:6px 8px;border:1px solid transparent;background:rgba(244,241,236,.04);color:#F4F1EC;font:inherit;text-align:left;cursor:pointer}" +
    ".fh-sm .srow:hover{background:rgba(244,241,236,.09)}.fh-sm .srow[aria-pressed=true]{border-color:#E3B83F;background:rgba(227,184,63,.1)}.fh-sm .srow i{width:10px;height:26px}" +
    ".fh-sm .srow .nm{display:flex;flex-direction:column;min-width:0}.fh-sm .srow .nm b{font-weight:600;font-size:.86rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.fh-sm .srow .nm small{font-size:.68rem;color:rgba(244,241,236,.55)}" +
    ".fh-full .fh-sm .srow canvas{position:static;inset:auto;width:80px;height:22px;background:none}.fh-sm .srow .pr{font-variant-numeric:tabular-nums;font-weight:600;font-size:.86rem;text-align:right}" +
    ".fh-sm .srow .ch{font-variant-numeric:tabular-nums;font-size:.78rem;text-align:right}.fh-sm .srow .hl{font-variant-numeric:tabular-nums;font-size:.74rem;color:rgba(244,241,236,.6);text-align:right}" +
    ".fh-sm .up{color:#8FC79A}.fh-sm .dn{color:#E58A73}.fh-sm .det{margin-top:10px;padding-top:10px;border-top:1px solid rgba(244,241,236,.15)}.fh-sm .det .now span:first-child{font-size:1rem;font-weight:600}" +
    ".fh-sm p.hint{font-size:.74rem;color:rgba(244,241,236,.55)}.fh-sm .acts button.buy{border-color:#E58A73;color:#E58A73}.fh-sm .acts button.sell{border-color:#8FC79A;color:#8FC79A}" +
    "@media (max-width:560px){.fh-sm .srow{grid-template-columns:8px minmax(0,1fr) 60px 56px;gap:8px}.fh-full .fh-sm .srow canvas,.fh-sm .srow .hl{display:none}}" +
    ".fh-fin{width:min(560px,calc(100% - 24px));max-height:calc(100% - var(--top) - var(--dock) - 30px);overflow:auto}.fh-fin p.sub{margin:2px 0 0;font-size:.78rem;color:rgba(244,241,236,.6)}" +
    ".fh-fin .fleg{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:4px 14px;margin-top:8px;font-size:.78rem}" +
    ".fh-fin .fleg span{display:flex;align-items:center;gap:6px;min-width:0;color:rgba(244,241,236,.85)}.fh-fin .fleg span.off{opacity:.4}.fh-fin .fleg i{flex:none;width:12px;height:3px}" +
    ".fh-fin .fleg em{font-style:normal;margin-left:auto;font-variant-numeric:tabular-nums;color:rgba(244,241,236,.6)}" +
    ".fh-fp .leg{display:flex;gap:12px;font-size:.72rem;color:rgba(244,241,236,.65);margin-top:4px}.fh-fp .leg span{display:flex;align-items:center;gap:5px}" +
    ".fh-fp .leg i{display:inline-block;width:9px;height:9px;border-radius:50%;border:1.5px solid #F4F1EC}.fh-fp .leg i.b{background:#E58A73}.fh-fp .leg i.s{background:#8FC79A}.fh-fp .leg i.r{width:5px;height:5px;border:0;border-radius:0;background:rgba(143,199,154,.7)}" +
    ".fh-fp .sell{display:flex;align-items:center;gap:6px;font-size:.84rem;color:rgba(244,241,236,.8);margin:-2px 0 8px}.fh-fp .sell b{color:#8FC79A;font-weight:600;font-variant-numeric:tabular-nums}" +
    ".fh-fp .sell i{display:inline-block;width:18px;border-top:2px dashed #8FC79A}.fh-fp p.log{font-size:.78rem;color:rgba(244,241,236,.6)}" +
    ".fh-fp p{margin:8px 0 0;color:rgba(244,241,236,.8);font-size:.84rem;line-height:1.45}" +
    ".fh-fp .acts{margin-top:8px}.fh-fp .acts button{font:600 .8rem inherit;padding:6px 10px;border:1px solid rgba(244,241,236,.5);background:transparent;color:#F4F1EC;cursor:pointer}.fh-fp .acts button[aria-disabled=true]{opacity:.45;cursor:default}" +
    ".fh-hud [data-fhfin]{cursor:pointer}.fh-hud [data-fhfin] dd::after{content:'';display:inline-block;width:13px;height:10px;margin-left:6px;vertical-align:1px;background:linear-gradient(currentColor,currentColor) 0 100%/3px 40% no-repeat,linear-gradient(currentColor,currentColor) 5px 100%/3px 100% no-repeat,linear-gradient(currentColor,currentColor) 10px 100%/3px 65% no-repeat;opacity:.8}.fh-hud [data-fhfin]:hover dd{color:#E3B83F}" +
    ".fh-hud dt{font-size:.7rem;color:rgba(244,241,236,.65);letter-spacing:.04em;text-transform:uppercase}" +
    ".fh-hud dd{margin:0;font:600 1.05rem/1.2 var(--f-display,inherit);font-variant-numeric:tabular-nums;white-space:nowrap}.fh-hud .warn dd{color:#F0A848}" +
    ".fh-run{display:flex;gap:4px;align-items:center}" +
    ".fh-run button{font:600 .82rem/1 inherit;padding:7px 10px;border:1px solid rgba(244,241,236,.3);background:transparent;color:#F4F1EC;cursor:pointer}" +
    ".fh-run button[aria-pressed=true]{background:#F4F1EC;color:#151715;border-color:#F4F1EC}" +
    ".fh-dock{position:absolute;left:0;right:0;bottom:0;padding:6px max(10px,env(safe-area-inset-right)) calc(10px + env(safe-area-inset-bottom,0px)) max(10px,env(safe-area-inset-left))}" +
    ".fh-tabs{display:flex;gap:2px;overflow-x:auto;scrollbar-width:none}" +
    ".fh-tab.fh-doz{margin-left:auto;color:#F0A848;display:inline-flex;align-items:center;gap:7px}.fh-tab.fh-doz svg{flex:none}.fh-tab.fh-doz[aria-pressed=true]{background:#C2412D;color:#F4F1EC;border-bottom-color:#F4F1EC}" +
    ".fh-tab{font:600 .85rem inherit;padding:7px 14px;border:0;background:transparent;color:rgba(244,241,236,.7);cursor:pointer;white-space:nowrap;border-bottom:2px solid transparent}" +
    ".fh-tab[aria-selected=true]{color:#F4F1EC;border-bottom-color:#E3B83F}" +
    ".fh-tools{display:flex;gap:6px;overflow-x:auto;padding-top:8px;scrollbar-width:thin}" +
    ".fh-tool{flex:0 0 auto;width:156px;display:flex;flex-direction:column;align-items:flex-start;gap:2px;text-align:left;color:#F4F1EC;background:rgba(244,241,236,.06);border:1px solid rgba(244,241,236,.18);padding:8px 10px;cursor:pointer}" +
    ".fh-tool b{font-weight:600;font-size:.88rem;line-height:1.2}.fh-tool em{font-style:normal;font-size:.76rem;color:#E3B83F;font-weight:600;font-variant-numeric:tabular-nums;line-height:1.25}" +
    ".fh-tool:hover:not([aria-disabled=true]){border-color:#F4F1EC}" +
    ".fh-tool[aria-pressed=true]{background:#E3B83F;color:#151715;border-color:#E3B83F}.fh-tool[aria-pressed=true] em{color:#151715}" +
    ".fh-tool[aria-disabled=true]{opacity:.45;cursor:default}.fh-tool[aria-disabled=true] em{color:rgba(244,241,236,.7)}" +
    ".fh-grp{display:none}.fh-grp.on{display:flex}" +
    ".fh-sel{position:absolute;right:max(12px,env(safe-area-inset-right));top:calc(var(--top) + 10px);width:min(300px,calc(100% - 24px));padding:12px 14px;max-height:calc(100% - var(--top) - var(--dock) - 30px);overflow:auto}" +
    ".fh-sel b{display:block;font-weight:600}.fh-sel p{margin:4px 0 0;color:rgba(244,241,236,.75);font-size:.86rem;line-height:1.45}" +
    ".fh-trade{display:flex;flex-direction:column;gap:6px;margin-top:2px}.fh-trade .row{display:flex;justify-content:space-between;align-items:baseline;gap:8px;font-size:.78rem;color:rgba(244,241,236,.6)}" +
    ".fh-trade .row b{font:600 1.25rem/1 var(--f-display,inherit);color:#F4F1EC;font-variant-numeric:tabular-nums}.fh-trade .row.sm{font-size:.72rem;flex-wrap:wrap}" +
    ".fh-trade input{-webkit-appearance:none;appearance:none;width:100%;height:22px;margin:0;background:transparent;cursor:pointer;--tc:#E3B83F}" +
    ".fh-trade input.buy{--tc:#E58A73}.fh-trade input.sell{--tc:#8FC79A}" +
    ".fh-trade input::-webkit-slider-runnable-track{height:8px;background:linear-gradient(90deg,transparent calc(var(--cur) - 1px),#F4F1EC calc(var(--cur) - 1px),#F4F1EC calc(var(--cur) + 1px),transparent calc(var(--cur) + 1px)),linear-gradient(90deg,rgba(227,184,63,.55) var(--a,var(--cur)),var(--tc) var(--a,var(--cur)),var(--tc) var(--b,var(--cur)),rgba(244,241,236,.14) var(--b,var(--cur)))}" +
    ".fh-trade input::-moz-range-track{height:8px;background:linear-gradient(90deg,transparent calc(var(--cur) - 1px),#F4F1EC calc(var(--cur) - 1px),#F4F1EC calc(var(--cur) + 1px),transparent calc(var(--cur) + 1px)),linear-gradient(90deg,rgba(227,184,63,.55) var(--a,var(--cur)),var(--tc) var(--a,var(--cur)),var(--tc) var(--b,var(--cur)),rgba(244,241,236,.14) var(--b,var(--cur)))}" +
    ".fh-trade input::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:22px;margin-top:-7px;background:var(--tc);border:2px solid #1E211E;border-radius:0}" +
    ".fh-trade input::-moz-range-thumb{width:12px;height:20px;background:var(--tc);border:2px solid #1E211E;border-radius:0}" +
    ".fh-trade .desc{font-size:.84rem;color:rgba(244,241,236,.85)}.fh-trade .desc:empty,.fh-trade .sum:empty{display:none}" +
    ".fh-trade .sum{font:600 1.4rem/1.1 var(--f-display,inherit);font-variant-numeric:tabular-nums}.fh-trade .sum.buy{color:#E58A73}.fh-trade .sum.sell{color:#8FC79A}" +
    ".fh-sel .acts button.buy{border-color:#E58A73;color:#E58A73}.fh-sel .acts button.sell{border-color:#8FC79A;color:#8FC79A}" +
    ".fh-sel .acts{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}" +
    ".fh-sel .acts button{font:600 .8rem inherit;padding:6px 10px;border:1px solid rgba(244,241,236,.5);background:transparent;color:#F4F1EC;cursor:pointer}" +
    ".fh-sel .acts button.warn{border-color:#F0A848;color:#F0A848}.fh-sel .acts button[aria-disabled=true]{opacity:.45;cursor:default}" +
    ".fh-hint{position:absolute;left:max(12px,env(safe-area-inset-left));top:calc(var(--top) + 10px);max-width:min(560px,calc(100% - 340px));pointer-events:none}" +
    ".fh-hint span{display:inline-block;background:rgba(21,23,21,.78);font:500 .82rem/1.35 inherit;padding:6px 10px}" +
    ".fh-ctl{position:absolute;right:max(12px,env(safe-area-inset-right));bottom:calc(var(--dock) + 12px);display:flex;gap:6px}" +
    ".fh-ctl button{width:38px;height:38px;border:0;background:rgba(21,23,21,.82);color:#F4F1EC;font:600 1.1rem/1 inherit;cursor:pointer}" +
    ".fh-ctl button:hover{background:#151715}.fh-ctl button[aria-pressed=true]{background:#E3B83F;color:#151715}" +
    ".fh-msg{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(var(--dock) + 14px);max-width:min(640px,calc(100% - 140px));margin:0;padding:8px 14px;font-size:.88rem;line-height:1.4;text-align:center;pointer-events:none}" +
    ".fh-msg:empty{display:none}.fh-msg.good{color:#E3B83F;font-weight:600}" +
    ".fh-help{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(620px,calc(100% - 32px));max-height:calc(100% - var(--top) - var(--dock) - 30px);overflow:auto;padding:18px 22px}" +
    ".fh-help h2{font:600 1.3rem var(--f-display,inherit);margin:0 0 8px}.fh-help p{margin:8px 0;color:rgba(244,241,236,.85);font-size:.9rem;line-height:1.5}" +
    ".fh-help .row{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}" +
    ".fh-help button{font:600 .85rem inherit;padding:8px 14px;border:1px solid rgba(244,241,236,.5);background:transparent;color:#F4F1EC;cursor:pointer}" +
    ".fh-reset[data-armed]{background:#C2412D!important;border-color:#C2412D!important}" +
    ".fh-full [hidden]{display:none!important}" +
    "@media (max-width:760px){.fh-hud dd{font-size:.92rem}.fh-hint{max-width:calc(100% - 24px)}.fh-sel{top:auto;bottom:calc(var(--dock) + 60px)}}";

  function injectCSS() {
    var old = document.getElementById("fh-css"); if (old) old.remove();
    var s = document.createElement("style"); s.id = "fh-css"; s.textContent = CSS; document.head.appendChild(s);
  }
  var GRPS = ["air", "term", "land", "ops", "up"];
  function html() {
    function st(id) { return '<div id="fh-w-' + id + '"' + (id === "money" ? ' data-fhfin role="button" tabindex="0" title="' + t("finOpen") + '"' : id === "rate" ? ' title="' + t("rateHint") + '"' : id === "fprice" ? ' data-fhfp role="button" tabindex="0" title="' + t("fpOpen") + '"' : id === "stocks" ? ' data-fhsm role="button" tabindex="0" title="' + t("smOpen") + '"' : id === "wx" ? ' data-fhwx role="button" tabindex="0" title="' + t("wxOpen") + '"' : "") + '><dt>' + t(id) + '</dt><dd id="fh-' + id + '"></dd></div>'; }
    var tabs = GRPS.map(function (g) { return '<button type="button" class="fh-tab" role="tab" data-tab="' + g + '" aria-selected="false">' + TX.grp[g][lang] + "</button>"; }).join("");
    var groups = ["air", "term", "land", "ops"].map(function (g) {
      return '<div class="fh-tools fh-grp" data-grp="' + g + '">' + BUILD.filter(function (b) { return b.g === g; }).map(function (b) {
        return '<button type="button" class="fh-tool" data-tool="' + b.id + '" aria-pressed="false" title="' + b.desc[lang] + '"><b>' + b.name[lang] + '</b><em id="fh-c-' + b.id + '"></em></button>';
      }).join("") + "</div>";
    }).join("");
    var ups = '<div class="fh-tools fh-grp" data-grp="up">' + UPS.map(function (u) {
      return '<button type="button" class="fh-tool" data-up="' + u.id + '" title="' + u.desc[lang] + '"><b>' + u.name[lang] + '</b><em id="fh-u-' + u.id + '"></em></button>';
    }).join("") + "</div>";
    return '<div class="fh-full" id="fh-stage" tabindex="0" aria-label="' + t("title") + '"><canvas id="fh-cv"></canvas>' +
      '<div class="fh-top fh-panel" id="fh-top"><a class="fh-back" href="#">' + (lang === "de" ? "← Apps" : "← Apps") + '</a>' +
      '<div class="fh-title"><b>' + t("title") + "<span>v" + VERSION + '</span></b><small id="fh-rank"></small></div>' +
      '<dl class="fh-hud">' + st("money") + st("wx") + st("rate") + st("fuel") + st("fprice") + st("stocks") + st("rep") + st("moves") + st("pax") + st("hold") + "</dl>" +
      '<div class="fh-run" role="group" aria-label="' + t("speed") + '">' + [1, 2, 4].map(function (v) { return '<button type="button" data-fhspeed="' + v + '" aria-pressed="false">' + v + "×</button>"; }).join("") +
      '<button type="button" data-fhpause aria-pressed="false"></button><button type="button" data-fhhelp aria-pressed="false" title="' + t("howH") + '">?</button></div></div>' +
      '<div class="fh-hint"><span id="fh-hint"></span></div>' +
      '<div class="fh-sel fh-panel" id="fh-sel" hidden></div>' +
      '<div class="fh-fp fh-fin fh-panel" id="fh-fin" hidden><div class="hd"><b>' + t("finTitle") + '</b><button type="button" data-fhfin aria-label="' + (lang === "de" ? "Schließen" : "Close") + '">×</button></div>' +
      '<p class="sub">' + t("finSub") + '</p><div class="now"><span id="fh-fin-rate"></span><small>' + t("rate") + '</small></div>' +
      '<canvas id="fh-fin-cv" width="1000" height="357"></canvas><div class="ax"><span>−15 min</span><span>−10 min</span><span>−5 min</span><span>' + (lang === "de" ? "jetzt" : "now") + '</span></div>' +
      '<div class="fleg" id="fh-fin-leg"></div><p id="fh-fin-sum"></p></div>' +
      '<div class="fh-fp fh-wxp fh-panel" id="fh-wxp" hidden><div class="hd"><b>' + t("wxTitle") + '</b><button type="button" data-fhwx aria-label="' + (lang === "de" ? "Schließen" : "Close") + '">×</button></div><div class="wxbody"></div></div>' +
      '<div class="fh-fp fh-sm fh-panel" id="fh-sm" hidden><div class="hd"><b>' + t("smTitle") + '</b><button type="button" data-fhsm aria-label="' + (lang === "de" ? "Schließen" : "Close") + '">×</button></div>' +
      '<p class="sub" id="fh-sm-dep"></p><div class="list" id="fh-sm-list">' + STOCKS.map(function (q) {
        return '<button type="button" class="srow" data-stk="' + q.id + '"><i style="background:' + q.col + '"></i><span class="nm"><b>' + q.n + '</b><small>' + t(q.k === "air" ? "smAir" : "smOil") + '</small></span>' +
          '<canvas width="160" height="44" data-spark="' + q.id + '"></canvas><span class="pr" data-spr="' + q.id + '"></span><span class="ch" data-sch="' + q.id + '"></span><span class="hl" data-shl="' + q.id + '"></span></button>';
      }).join("") + '</div>' +
      '<div class="det"><div class="now"><span id="fh-sm-name"></span><span id="fh-sm-now"></span><em id="fh-sm-d"></em></div>' +
      '<canvas id="fh-sm-cv" width="1000" height="357"></canvas><div class="ax"><span>−15 min</span><span>' + t("fpRange") + '</span><span>' + (lang === "de" ? "jetzt" : "now") + '</span></div>' +
      '<p id="fh-sm-hold"></p><div class="fh-trade"><input type="range" id="fh-sm-r" min="0" max="1000" step="1" value="0" aria-label="' + t("stocks") + '">' +
      '<span class="row sm"><span>0</span><span id="fh-sm-tg"></span><span id="fh-sm-mx"></span></span><span class="desc" id="fh-sm-desc"></span><span class="sum" id="fh-sm-sum"></span></div>' +
      '<div class="acts"><button type="button" id="fh-sm-btn" data-smtrade aria-disabled="true"></button></div><p class="hint">' + t("smHint") + " " + t("smFee") + '</p></div></div>' +
      '<div class="fh-fp fh-panel" id="fh-fp" hidden><div class="hd"><b>' + t("fpTitle") + '</b><button type="button" data-fhfp aria-label="' + (lang === "de" ? "Schließen" : "Close") + '">×</button></div>' +
      '<div class="now"><span id="fh-fp-now"></span><small>' + t("fpBuy") + " " + t("fpUnit") + '</small><em id="fh-fp-d"></em></div>' +
      '<div class="sell"><i></i>' + t("fpSell") + ': <b id="fh-fp-sell"></b></div>' +
      '<canvas id="fh-fp-cv" width="840" height="300"></canvas>' + (function () { var L = t("fpLeg").split("|"); return '<div class="leg"><span><i class="b"></i>' + L[0] + '</span><span><i class="s"></i>' + L[1] + '</span><span><i class="r"></i>' + L[2] + "</span></div>"; })() + '<div style="display:none"></div><div class="ax"><span>−15 min</span><span>' + t("fpRange") + '</span><span>' + (lang === "de" ? "jetzt" : "now") + '</span></div>' +
      '<p id="fh-fp-info"></p><p id="fh-fp-log" class="log"></p><div class="acts"><button type="button" data-fhfpfill></button></div></div>' +
      '<div class="fh-ctl"><button type="button" data-ow hidden title="' + t("owTool") + '" aria-label="' + t("owTool") + '">⇄</button>' +
      '<button type="button" data-cv hidden title="' + t("cvTool") + '" aria-label="' + t("cvTool") + '">◠</button>' +
      '<button type="button" class="rot" data-rot="-1" title="' + t("rotL") + '" aria-label="' + t("rotL") + '">⟲</button>' +
      '<button type="button" class="rot" data-rot="1" title="' + t("rotR") + '" aria-label="' + t("rotR") + '">⟳</button>' +
      '<button type="button" data-zoom="-1" title="' + t("zoomOut") + '" aria-label="' + t("zoomOut") + '">−</button>' +
      '<button type="button" data-zoom="1" title="' + t("zoomIn") + '" aria-label="' + t("zoomIn") + '">+</button></div>' +
      '<p class="fh-msg fh-panel" id="fh-msg" aria-live="polite"></p>' +
      '<div class="fh-help fh-panel" id="fh-help" hidden><h2>' + t("howH") + "</h2><p>" + t("how1") + "</p><p>" + t("how2") + "</p><p>" + t("how3") + "</p><p>" + t("how5") + "</p><p>" + t("how4") + "</p>" +
      '<div class="row"><button type="button" data-fhhelp>' + (lang === "de" ? "Schließen" : "Close") + '</button><button type="button" class="fh-reset" data-fhreset>' + t("reset") + "</button></div></div>" +
      '<div class="fh-dock fh-panel" id="fh-dock"><div class="fh-tabs" role="tablist">' + tabs + '<button type="button" class="fh-tab fh-doz" data-dozer aria-pressed="false" title="' + t("dozerT") + '"><svg viewBox="0 0 28 18" width="26" height="17" aria-hidden="true"><path d="M1 3h3v14H1z" fill="currentColor"/><path d="M4 10h5v2H4z" fill="currentColor"/><path d="M9 7h12V2h6v10H9z" fill="currentColor"/><path d="M22 3.5h3.5v4H22z" fill="#1E211E"/><path d="M8 12.5h19v5H8z" fill="currentColor"/><path d="M10 14h2v2h-2zM14 14h2v2h-2zM18 14h2v2h-2zM22 14h2v2h-2z" fill="#1E211E"/></svg><span>' + t("dozer") + "</span></button></div>" + groups + ups + "</div></div>";
  }
  function setTab(g) {
    V.tab = g;
    Array.prototype.forEach.call(V.root.querySelectorAll("[data-tab]"), function (b) { b.setAttribute("aria-selected", String(b.getAttribute("data-tab") === g)); });
    Array.prototype.forEach.call(V.root.querySelectorAll("[data-grp]"), function (d) { d.classList.toggle("on", d.getAttribute("data-grp") === g); });
    layoutVars();
  }
  // Höhe von Kopfleiste und Baumenü an die Karte weitergeben, damit Hinweise und Knöpfe nicht darunter liegen
  function layoutVars() {
    if (!V) return;
    var top = V.root.querySelector("#fh-top"), dock = V.root.querySelector("#fh-dock");
    if (top) V.stage.style.setProperty("--top", top.offsetHeight + "px");
    if (dock) V.stage.style.setProperty("--dock", dock.offsetHeight + "px");
  }

  var lastSig = "";
  function set(id, v) { var e = document.getElementById(id); if (e && e.textContent !== v) e.textContent = v; }
  function updatePanel(force) {
    if (!V) return;
    var s = stats();
    set("fh-money", eurS(G.money)); set("fh-rep", Math.round(G.rep) + " %");
    set("fh-moves", G.st.moves.toLocaleString(loc())); set("fh-pax", G.st.pax.toLocaleString(loc()));
    set("fh-hold", String(R.holdQ.length));
    set("fh-rate", eurS(finRate()));
    var pw = document.getElementById("fh-w-fprice");
    if (pw) { var pn = fuelPrice(), p60 = fuelPriceAt(Math.floor(G.fpt || 0) - 60), inCr = !!crisisAt(Math.floor(G.fpt || 0)); set("fh-fprice", eur(pn)); pw.classList.toggle("up", pn > p60 * 1.02); pw.classList.toggle("down", pn < p60 * 0.98); pw.classList.toggle("crisis", inCr); pw.title = inCr ? t("crisisNow") : t("fpOpen");
      if (R.inCrisis === undefined) R.inCrisis = inCr; else if (inCr !== R.inCrisis) { R.inCrisis = inCr; msg(t(inCr ? "crisisOn" : "crisisOff"), !inCr); } }
    var sw = document.getElementById("fh-w-stocks"); if (sw) set("fh-stocks", eurS(smDepot().v));
    var wxe = document.getElementById("fh-wx"); if (wxe) { var wn = wxNow(), wh = wxIcon(wn.kind, 18) + "<span>" + Math.round(wn.t) + " °C</span>"; if (wxe._h !== wh) { wxe.innerHTML = wh; wxe._h = wh; } }
    var fw = document.getElementById("fh-w-fuel");
    if (fw) { var tk = mods("tank").length; fw.hidden = !tk; if (tk) { var fp = fuelPct(); set("fh-fuel", Math.round(fp) + " %"); fw.classList.toggle("warn", fp < 20); } }
    set("fh-rank", "SOY · " + clockTxt() + " · " + rank() + (s.stands ? " · " + fmt(t("conn"), { a: s.conn, b: s.stands }) : ""));
    var hw = document.getElementById("fh-w-hold");
    if (hw) hw.classList.toggle("warn", R.holdQ.some(function (h) { return h.wait > DIVERT * 0.55; }));
    var sig = (V.tool ? V.tool.id : "") + "|" + Math.floor(G.money);
    BUILD.forEach(function (b) { sig += b.lock(); }); UPS.forEach(function (u) { sig += u.lock() + u.cost(); });
    if (sig === lastSig && !force) return;
    lastSig = sig;
    BUILD.forEach(function (b) {
      var btn = V.root.querySelector('[data-tool="' + b.id + '"]'); if (!btn) return;
      var lock = b.lock(), cost = b.cost();
      btn.setAttribute("aria-disabled", String(!!lock));
      btn.setAttribute("aria-pressed", String(!!(V.tool && V.tool.id === b.id)));
      set("fh-c-" + b.id, lock ? lock : b.unit ? fmt(t("perM"), { p: eurS(b.unit * 10) }) : (b.from ? (lang === "de" ? "ab " : "from ") : "") + eurS(cost));
    });
    UPS.forEach(function (u) {
      var btn = V.root.querySelector('[data-up="' + u.id + '"]'); if (!btn) return;
      var lock = u.lock(), cost = u.cost(), ok = !lock && G.money >= cost;
      btn.setAttribute("aria-disabled", String(!ok));
      var txt = lock ? lock : eurS(cost); if (u.extra && lock !== t("done")) txt = u.extra() + " · " + txt;
      set("fh-u-" + u.id, txt);
    });
  }
  var NAMES = { runway: L2("Piste", "Runway"), taxi: L2("Rollweg", "Taxiway"), road: L2("Straße", "Road"), stand: L2("Parkposition", "Aircraft stand"),
    term: L2("Terminalmodul", "Terminal module"), tower: L2("Tower", "Control tower"), fire: L2("Feuerwehr", "Fire station"),
    hangar: L2("Wartungshalle", "Maintenance hangar"), deck: L2("Aussichtsplattform", "Viewing deck"), park: L2("Parkplatz", "Car park"), bus: L2("Bushaltestelle", "Bus stop"), cab: L2("Taxistand", "Taxi rank"), hotels: L2("Hotel klein", "Small hotel"), hotel: L2("Hotel mittel", "Medium hotel"), hotell: L2("Hotel groß", "Large hotel"), tank: L2("Kerosintank", "Fuel tank") };
  function updateSel() { updateSel0(); trUpdate(); }
  function updateSel0() {
    var box = document.getElementById("fh-sel"); if (!box) return;
    if (V.sel === "wreck") {
      var w = G.wreck; if (!w) { V.sel = null; box.hidden = true; box.innerHTML = ""; return; }
      box.hidden = false;
      box.innerHTML = "<b>" + t("wreck") + "</b><p>" + fmt(t("wreckInfo"), { cs: (w.n ? w.n + " " : "") + w.cs }) + "</p>" +
        (w.clr ? '<p id="fh-wreck-t">' + fmt(t("wreckBusy"), { s: mmss(w.clr) }) + "</p>" : '<div class="acts"><button type="button" data-wreck class="warn">' + t("wreckClear") + " · " + eurS(w.cost) + "</button></div>");
      return;
    }
    var m = V.sel && byId(V.sel);
    if (!m) { box.hidden = true; box.innerHTML = ""; return; }
    box.hidden = false;
    var info = [], acts = [];
    function btn(a, label, dis, warn) { return '<button type="button" data-act="' + a + '"' + (warn ? ' class="warn"' : "") + ' aria-disabled="' + dis + '">' + label + "</button>"; }
    if (m.t === "stand") {
      info.push(m._conn ? t("stConn") : m._half ? t("connIn") : t("stNoConn"));
      if (m.heavy && m._conn) info.push(standOkFor(m, "w") ? t("wideOk") : t("wideNo"));
      if (m._conn) info.push(m.gate && m._term ? t("stGate") : t("stBus"));
      if (!m.gate) acts.push(btn("gate", t("gate") + " · " + eurS(bdef("gate").cost()), !!bdef("gate").lock() || !m._term));
      if (!m.heavy) acts.push(btn("heavy", t("heavy") + " · " + eurS(bdef("heavy").cost()), !!bdef("heavy").lock()));
    } else if (m.t === "runway") {
      var rws = mods("runway"), i = rws.indexOf(m);
      info.push(rws.length > 1 ? (i === 0 ? t("rwArr") : t("rwDep")) : t("rwBoth"));
      info.push(fmt(t("rwLen"), { m: rwMeters(rwLen(m)).toLocaleString(loc()) }) + " · " + fmt(t("rwFor"), { c: rwClasses(rwLen(m)) }));
      info.push(t("routes"));
      acts.push(btn("flip", t("flip"), false));
      acts.push(btn("app", t("appNew"), false)); acts.push(btn("dep", t("depNew"), false));
    } else if (m.t === "taxi" || m.t === "road") {
      if (m.hw) { info.push(t("hwInfo")); }
      else {
        info.push(m.bl ? t("owBus") : m.sl ? t("owSl") : m.ow ? t("owInfo") : t("twInfo"));
        if (m.t === "road" && m.ow && !m.sl && !m.bl) info.push(fmt(t("stripInfo"), { a: lotParked(m), b: m._spots || 0 }) + (m._park ? "" : " · " + t("noHw")));
        var nxt = m.t === "road" ? (!m.ow ? 1 : m.bl ? 0 : m.sl ? 3 : 2) : (m.ow ? 0 : 1);
        acts.push(btn("ow", nxt === 0 ? t("owOff") : nxt === 1 ? (m.t === "road" ? t("owPk") : t("owOn")) : nxt === 2 ? t("owSl") : t("owBus"), false));
        if (m.ow) acts.push(btn("rev", t("owRev"), false));
      }
    } else if (LVL[m.t]) {
      info.push(t("lvl") + " " + m.lvl + "/2");
      if (m.lvl < 2) acts.push(btn("lvl", fmt(t("up2"), { n: 2 }) + " · " + eurS(LVL[m.t][0]), false));
    } else if (m.t === "tank") {
      var cp = Math.round(fuelPct());
      info.push('<span class="fh-trade"><span class="row"><span>0 %</span><b id="fh-tr-pct">' + cp + ' %</b><span>100 %</span></span>' +
        '<input type="range" id="fh-tr" min="0" max="100" step="1" value="' + cp + '" aria-label="' + t("fuel") + '" style="--cur:' + cp + '%">' +
        '<span class="row sm"><span id="fh-tr-now"></span><span id="fh-tr-pr"></span></span>' +
        '<span class="desc" id="fh-tr-desc"></span><span class="sum" id="fh-tr-sum"></span></span>');
      acts.push('<button type="button" data-act="trade" id="fh-tr-btn" aria-disabled="true">' + t("trMove") + "</button>");
    } else if (m.t === "term" || m.t === "park" || m.t === "bus" || m.t === "cab" || isHotel(m.t)) {
      if (isHotel(m.t)) info.push(fmt(t("hotelInfo"), { n: hotelGuests(m), k: hotelCap(m) }));
      if (m.t === "term") {
        var fit = []; if (m.shops) fit.push(t("shopsW")); if (m.lounge) fit.push(t("lngW"));
        info.push((termLvl(m) >= 2 ? t("tLvl2") : NAMES.term[lang]) + " · " + fmt(t("tHas"), { x: fit.length ? fit.join(", ") : t("tNone") }));
        if (termLvl(m) < 2) acts.push(btn("tmod", t("tMod") + " · " + eurS(TUP.tmod), false));
        else { if (!m.shops) acts.push(btn("tshop", t("tShop") + " · " + eurS(TUP.tshop), false)); if (!m.lounge) acts.push(btn("tlng", t("tLng") + " · " + eurS(TUP.tlng), false)); }
      }
      info.push(m._road ? t("stRoad") : m._acc !== null && m._acc !== undefined ? t("noHw") : t("stNoRoad"));
      if (m.t === "term") { info.push(fmt(t("termDep"), { n: Math.round(R.tDep) }), fmt(t("termArr"), { n: Math.round(R.tArrBus + R.tArrCar + R.tArrWalk + (R.tArrTaxi || 0)) }), fmt(t("termOut"), { b: Math.round(R.tArrBus), c: Math.round(R.tArrCar + R.tArrWalk), x: Math.round(R.tArrTaxi || 0) })); if (landMode() === "walk") info.push(t("noRoadTerm")); }
      if (m.t === "bus") info.push(fmt(t("stopInfo"), { n: R.stopW[m.id] || 0 }));
      if (m.t === "cab") info.push(fmt(t("taxiInfo"), { n: Math.round(R.tArrTaxi || 0), k: R.veh.filter(function (v) { return v.rank === m.id && v.state === "taxi"; }).length }));
      if (m.t === "park") info.push(fmt(t("lotInfo"), { a: lotParked(m), b: LOT }));
    }
    if (!m.hw) acts.push(btn("del", V.delArm ? fmt(t("delQ"), { p: eurS((m.paid || 0) / 2) }) : t("del"), false, true));
    if (MOVABLE[m.t] && !m.hw) acts.unshift(btn("move", t("mvBtn") + " · " + eurS(MOVEFEE), G.money < MOVEFEE || inUse(m)));
    box.innerHTML = "<b>" + (m.hw ? t("hwName") : NAMES[m.t][lang]) + (m.t === "stand" ? " " + standNo(m) : "") + "</b>" + info.map(function (s) { return "<p>" + s + "</p>"; }).join("") + '<div class="acts">' + acts.join("") + "</div>";
  }
  function updateHint() {
    var T = V.tool, k = !T ? "none" : T.kind === "route" ? T.phase : T.kind === "runway" ? (T.start ? "rw1" : "rw0") : T.kind === "rect" ? "rect" : T.kind === "apply" ? "apply" : T.start ? "line1" : (T.id === "road" ? "road0" : "line0");
    if (T && T.kind === "line" && V.curve) k = !T.start ? k : T.end ? "cv2" : "cv1";
    if (T && T.kind === "brush") k = "brush";
    if (T && (T.kind === "dozer" || T.kind === "move")) { set("fh-hint", t(T.kind === "dozer" ? "dozer" : "mvName") + ": " + TX.hint[T.kind][lang] + (T.kind === "move" ? " · " + eurS(MOVEFEE) : "")); Array.prototype.forEach.call(V.root.querySelectorAll(".fh-ctl .rot"), function (b) { b.hidden = T.kind !== "move"; }); updateCtl(); return; }
    var extra = T && T.kind === "line" ? " · " + owLabel(V.owm) + " (O)" + (V.curve ? " · " + t("cvOn") + " (C)" : "") : "";
    set("fh-hint", (T && T.kind !== "route" ? bdef(T.id).name[lang] + ": " : "") + TX.hint[k][lang] + extra);
    Array.prototype.forEach.call(V.root.querySelectorAll(".fh-ctl .rot"), function (b) { b.hidden = !(T && T.kind === "rect"); });
    updateCtl();
  }
  function cycleOw() { var n = V.tool && V.tool.id === "road" ? 4 : 2; V.owm = ((V.owm || 0) + 1) % n; updateHint(); updateGhost(); }
  function owLabel(m) { return !m ? t("owOff") : m === 1 ? (V.tool && V.tool.id === "taxi" ? t("owOn") : t("owPk")) : m === 2 ? t("owSl") : t("owBus"); }
  function updateCtl() {
    var b = V.root.querySelector("[data-ow]"); if (!b) return;
    var line = !!(V.tool && V.tool.kind === "line");
    b.hidden = !line; b.setAttribute("aria-pressed", String(!!V.owm)); b.textContent = !V.owm ? "⇄" : V.owm === 1 ? (V.tool && V.tool.id === "taxi" ? "→" : "→P") : V.owm === 2 ? "→1" : "→B";
    var cb = V.root.querySelector("[data-cv]"); if (cb) { cb.hidden = !line; cb.setAttribute("aria-pressed", String(!!V.curve)); }
  }
  function updateBar() {
    Array.prototype.forEach.call(V.root.querySelectorAll("[data-fhspeed]"), function (b) {
      b.setAttribute("aria-pressed", String(Number(b.getAttribute("data-fhspeed")) === R.speed && !R.paused));
    });
    var p = V.root.querySelector("[data-fhpause]"); p.textContent = R.paused ? t("play") : t("pause"); p.setAttribute("aria-pressed", String(R.paused));
  }
  function msg(s, good) {
    if (!V) return;
    var e = document.getElementById("fh-msg"); if (!e) return;
    e.textContent = s; e.classList.toggle("good", !!good); R.msgT = 6;
  }

  function onClick(e) {
    if (e.target.closest("[data-dozer]")) { setDozer(!(V.tool && V.tool.kind === "dozer")); return; }
    var pnl = e.target.closest("[data-fhfp]") ? "fh-fp" : e.target.closest("[data-fhfin]") ? "fh-fin" : e.target.closest("[data-fhsm]") ? "fh-sm" : e.target.closest("[data-fhwx]") ? "fh-wxp" : null;
    if (pnl) { ["fh-fp", "fh-fin", "fh-sm", "fh-wxp"].forEach(function (id) { var bx = V.root.querySelector("#" + id); bx.hidden = id === pnl ? !bx.hidden : true; }); fpDraw(true); finDraw(true); smDraw(true, true); wxDraw(); return; }
    var srow = e.target.closest("[data-stk]"); if (srow) { V.stk = srow.getAttribute("data-stk"); smDraw(true, true); return; }
    var smb = e.target.closest("[data-smtrade]"); if (smb) { if (smb.getAttribute("aria-disabled") !== "true") smDo(); return; }
    if (e.target.closest("[data-fhfpfill]")) { if (e.target.closest("[data-fhfpfill]").getAttribute("aria-disabled") !== "true") fillFuel(); return; }
    var tab = e.target.closest("[data-tab]");
    if (tab) { setTab(tab.getAttribute("data-tab")); return; }
    if (e.target.closest("[data-fhhelp]")) { var hb = V.root.querySelector("#fh-help"); hb.hidden = !hb.hidden; return; }
    var tb = e.target.closest("[data-tool]");
    if (tb) {
      var id = tb.getAttribute("data-tool");
      if (tb.getAttribute("aria-disabled") === "true") { msg(bdef(id).lock()); return; }
      setTool(V.tool && V.tool.id === id ? null : id); V.stage.focus({ preventScroll: true }); return;
    }
    var ub = e.target.closest("[data-up]");
    if (ub) {
      var u = UPS.filter(function (x) { return x.id === ub.getAttribute("data-up"); })[0], lock = u.lock();
      if (lock) { msg(lock); return; }
      if (G.money < u.cost()) { msg(t("poor")); return; }
      G.money -= u.cost(); u.apply(); rebuild(); save(); msg(u.name[lang] + " " + t("built") + ".", true); updatePanel(true); return;
    }
    if (e.target.closest("[data-wreck]")) {
      var w = G.wreck; if (!w || w.clr) return;
      G.money -= w.cost; w.clr = CLEART; earnFx(w);   // darf ins Minus gehen, sonst stünde der Flughafen für immer still
      save(); updateSel(); updatePanel(true); return;
    }
    var ab = e.target.closest("[data-act]");
    if (ab) {
      var m = byId(V.sel); if (!m || ab.getAttribute("aria-disabled") === "true") return;
      var a = ab.getAttribute("data-act");
      if (a === "del") { if (V.delArm) { V.delArm = false; demolish(m); } else { V.delArm = true; updateSel(); } return; }
      V.delArm = false;
      if (a === "gate" || a === "heavy") applyStand(a, m);
      else if (a === "flip") {
        if (inUse(m)) { msg(t("delBusy")); return; }
        m.a += Math.PI; delete m.app; delete m.dep; rebuild(); save(); startRoute(m.id, "app"); V.tool.chain = true; msg(t("rwBuilt").split(". ")[1] || "", true);
      }
      else if (a === "app" || a === "dep") { startRoute(m.id, a); }
      else if (a === "ow") {
        if (m.t === "road") { if (!m.ow) { m.ow = 1; m.sl = 0; m.bl = 0; } else if (m.bl) { m.ow = 0; m.bl = 0; } else if (m.sl) { m.sl = 0; m.bl = 1; } else m.sl = 1; }
        else m.ow = m.ow ? 0 : 1;
        rebuild(); save(); updateSel();
      }
      else if (a === "fuel") { fillFuel(); }
      else if (a === "trade") { trDo(); }
      else if (a === "move") { startMove(m); }
      else if (a === "tmod" || a === "tshop" || a === "tlng") {
        var pc = TUP[a];
        if (G.money < pc) { msg(t("poor")); return; }
        G.money -= pc; m.paid = (m.paid || 0) + pc;
        if (a === "tmod") m.lvl = 2; else if (a === "tshop") m.shops = 1; else m.lounge = 1;
        save(); msg(NAMES.term[lang] + ": " + (a === "tmod" ? t("tLvl2") : a === "tshop" ? t("shopsW") : t("lngW")), true); updateSel(); updatePanel(true);
      }
      else if (a === "rev") { var x = m.x1, y = m.y1; m.x1 = m.x2; m.y1 = m.y2; m.x2 = x; m.y2 = y; rebuild(); save(); updateSel(); } else if (a === "lvl") {
        var c = LVL[m.t][0];
        if (G.money < c) { msg(t("poor")); return; }
        G.money -= c; m.lvl = 2; m.paid += c; save(); msg(NAMES[m.t][lang] + " · " + t("lvl") + " 2", true); updateSel(); updatePanel(true);
      }
      return;
    }
    if (e.target.closest("[data-ow]")) { cycleOw(); V.stage.focus({ preventScroll: true }); return; }
    if (e.target.closest("[data-cv]")) { V.curve = !V.curve; if (V.tool) V.tool.end = null; updateHint(); updateGhost(); V.stage.focus({ preventScroll: true }); return; }
    var zb = e.target.closest("[data-zoom]");
    if (zb) { zoomTo(V.zoom * (zb.getAttribute("data-zoom") === "1" ? 1.25 : 0.8)); return; }
    var s = e.target.closest("[data-fhspeed]");
    if (s) { R.speed = Number(s.getAttribute("data-fhspeed")); R.paused = false; updateBar(); return; }
    if (e.target.closest("[data-fhpause]")) { R.paused = !R.paused; updateBar(); return; }
    var r = e.target.closest("[data-fhreset]");
    if (r) {
      if (r.hasAttribute("data-armed")) {
        G = fresh(); R = runtime(); R.first = false; rebuild(); save();
        r.removeAttribute("data-armed"); r.textContent = t("reset");
        V.sel = null; fitView(); setTool(null); updateBar(); msg(t("welcome"), true); V.root.querySelector("#fh-help").hidden = true;
      } else {
        r.setAttribute("data-armed", ""); r.textContent = t("resetQ");
        setTimeout(function () { if (r.isConnected) { r.removeAttribute("data-armed"); r.textContent = t("reset"); } }, 4000);
      }
    }
  }
  function onRotDown(e) { var b = e.target.closest && e.target.closest("[data-rot]"); if (b) { e.preventDefault(); V.rotHold = Number(b.getAttribute("data-rot")); } }
  function onRotUp() { if (V) V.rotHold = 0; }

  var raf = 0, last = 0, hudT = 0;
  var trT = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    var dt = Math.min(0.1, (now - (last || now)) / 1000); last = now;
    keysTick(dt);
    if (!R.paused) { G.fpt = (G.fpt || 0) + dt; fpDraw(); finDraw(); smDraw(); wreckTick(dt); }
    V.wxT = (V.wxT || 0) + dt; if (V.wxT > 1) { V.wxT = 0; wxDraw(); }
    trT += dt; if (trT > 0.5) { trT = 0; trUpdate(); }
    if (!R.paused) { var g = dt * R.speed; while (g > 0) { var d = Math.min(0.05, g); tick(d); g -= d; } }
    if (R.msgT > 0) { R.msgT -= dt; if (R.msgT <= 0) msg(""); }
    R.saveT += dt; if (R.saveT > 4) { R.saveT = 0; save(); }
    hudT += dt; if (hudT > 0.25) { hudT = 0; updatePanel(); layoutVars(); }
    draw();
  }

  // Aktienmarkt-Fenster: Liste mit Mini-Verlauf, darunter Detail-Diagramm und Handelsregler (wie beim Kerosin)
  var smLast = -1;
  function nI(v) { return Math.round(v).toLocaleString(loc()); }
  function smHold(id) { var p = G.port || (G.port = {}); return p[id] || (p[id] = { n: 0, cost: 0 }); }
  function smDraw(force, reset) {
    if (!V) return;
    var box = V.root.querySelector("#fh-sm"); if (!box || box.hidden) return;
    var sec = Math.floor(G.fpt || 0); if (!force && sec === smLast) return; smLast = sec;
    if (!V.stk) V.stk = STOCKS[0].id;
    var dep = smDepot();
    set("fh-sm-dep", fmt(t("smDepot"), { v: eurS(dep.v), g: (dep.g >= 0 ? "+" : "−") + eurS(Math.abs(dep.g)) }));
    STOCKS.forEach(function (q) {
      var now = stockNow(q), old = stockAt(q, sec - 900), ch = (now / old - 1) * 100, h = smHold(q.id);
      var row = box.querySelector('[data-stk="' + q.id + '"]'); row.setAttribute("aria-pressed", String(V.stk === q.id));
      box.querySelector('[data-spr="' + q.id + '"]').textContent = eur2(now);
      var ce = box.querySelector('[data-sch="' + q.id + '"]'); ce.textContent = (ch >= 0 ? "+" : "−") + Math.abs(ch).toFixed(1).replace(".", lang === "de" ? "," : ".") + " %"; ce.className = "ch " + (ch >= 0 ? "up" : "dn");
      box.querySelector('[data-shl="' + q.id + '"]').textContent = h.n ? fmt(t("smShares"), { n: nI(h.n) }) : "";
      var cv = box.querySelector('[data-spark="' + q.id + '"]'), c = cv.getContext("2d"), W = cv.width, H = cv.height, pts = [], lo = Infinity, hi = -Infinity;
      for (var k = 0; k <= 60; k++) { var v = stockAt(q, sec - 900 + k * 15); pts.push(v); lo = Math.min(lo, v); hi = Math.max(hi, v); }
      c.clearRect(0, 0, W, H); c.beginPath();
      pts.forEach(function (v, k2) { var x = k2 / 60 * (W - 4) + 2, y = H - 4 - (v - lo) / ((hi - lo) || 1) * (H - 8); if (k2) c.lineTo(x, y); else c.moveTo(x, y); });
      c.strokeStyle = ch >= 0 ? "#8FC79A" : "#E58A73"; c.lineWidth = 3; c.stroke();
    });
    // Detail
    var q = stk(V.stk), N = 900, pts2 = [], lo2 = Infinity, hi2 = -Infinity;
    for (var k3 = 0; k3 <= N; k3++) { var v2 = stockAt(q, sec - N + k3); pts2.push(v2); lo2 = Math.min(lo2, v2); hi2 = Math.max(hi2, v2); }
    var cv2 = box.querySelector("#fh-sm-cv"), c2 = cv2.getContext("2d"), W2 = cv2.width, H2 = cv2.height, pad = (hi2 - lo2) * 0.12 || 1, ymin = lo2 - pad, ymax = hi2 + pad;
    function X(k) { return 4 + k / N * (W2 - 8); }
    function Y(v) { return H2 - 12 - (v - ymin) / (ymax - ymin) * (H2 - 24); }
    c2.clearRect(0, 0, W2, H2); shadeCrisis(c2, sec - N, N, X, H2);
    c2.strokeStyle = "rgba(244,241,236,.08)"; c2.lineWidth = 1; for (var gx = 0; gx <= 15; gx++) { var xx = Math.round(X(gx * 60)) + 0.5; c2.beginPath(); c2.moveTo(xx, 0); c2.lineTo(xx, H2); c2.stroke(); }
    var h0 = smHold(q.id); if (h0.n) { var av = h0.cost / h0.n; c2.setLineDash([8, 6]); c2.strokeStyle = "rgba(244,241,236,.5)"; c2.lineWidth = 2; c2.beginPath(); c2.moveTo(0, Y(av)); c2.lineTo(W2, Y(av)); c2.stroke(); c2.setLineDash([]); }
    c2.beginPath(); c2.moveTo(X(0), H2); for (k3 = 0; k3 <= N; k3++) c2.lineTo(X(k3), Y(pts2[k3])); c2.lineTo(X(N), H2); c2.closePath(); c2.fillStyle = q.col + "22"; c2.fill();
    c2.beginPath(); for (k3 = 0; k3 <= N; k3++) { if (k3) c2.lineTo(X(k3), Y(pts2[k3])); else c2.moveTo(X(k3), Y(pts2[k3])); } c2.strokeStyle = q.k === "oil" && q.col === "#2C2F33" ? "#C9CED4" : q.col; c2.lineWidth = 3; c2.stroke();
    (G.strades || []).forEach(function (m) { if (m.s !== q.id) return; var kk = m.t - (sec - N); if (kk < 0 || kk > N) return; c2.beginPath(); c2.arc(X(kk), Y(m.p), 8, 0, Math.PI * 2); c2.fillStyle = m.k === "b" ? "#E58A73" : "#8FC79A"; c2.fill(); c2.lineWidth = 3; c2.strokeStyle = "#F4F1EC"; c2.stroke(); });
    (G.scrash || []).forEach(function (cc) { if (cc.s !== q.id) return; var kk = cc.t - (sec - N); if (kk < 0 || kk > N) return; var xx2 = X(kk); c2.fillStyle = "rgba(194,65,45,.9)"; c2.fillRect(xx2 - 1.5, 0, 3, H2); c2.font = "700 19px " + FONT; c2.textAlign = xx2 > W2 * 0.8 ? "right" : "left"; c2.fillText(t("crashMk").toUpperCase(), xx2 + (xx2 > W2 * 0.8 ? -8 : 8), H2 - 18); });
    c2.fillStyle = "#F4F1EC"; c2.fillRect(X(N) - 6, Y(pts2[N]) - 6, 12, 12);
    var now2 = pts2[N], d1 = now2 - stockAt(q, sec - 60), de = document.getElementById("fh-sm-d");
    set("fh-sm-name", q.n + " · " + q.id); set("fh-sm-now", eur2(now2));
    de.textContent = (d1 >= 0 ? "▲ +" : "▼ −") + eur2(Math.abs(d1)) + " / min"; de.style.color = d1 >= 0 ? "#8FC79A" : "#E58A73";
    set("fh-sm-hold", h0.n ? fmt(t("smHold"), { n: nI(h0.n), a: eur2(h0.cost / h0.n), v: eurS(h0.n * now2) }) + " · " + ((h0.n * now2 - h0.cost) >= 0 ? "+" : "−") + eurS(Math.abs(h0.n * now2 - h0.cost)) : t("smNone"));
    if (reset) { var r = document.getElementById("fh-sm-r"), mx = smMax(q); r.value = mx ? Math.round(h0.n / mx * 1000) : 0; V.smR0 = r.value; }
    smUpd();
  }
  function smMax(q) { return smHold(q.id).n + Math.floor(Math.max(0, G.money) / stockNow(q)); }
  function smCalc() {
    var r = document.getElementById("fh-sm-r"); if (!r || !V.stk) return null;
    var q = stk(V.stk), h = smHold(q.id), mx = smMax(q), tg = r.value === V.smR0 ? h.n : Math.round(+r.value / 1000 * mx), d = tg - h.n, pr = stockNow(q), sp = Math.round(pr * 0.99 * 100) / 100;
    return { r: r, q: q, h: h, mx: mx, tg: tg, d: d, pr: pr, sp: sp, sum: d > 0 ? d * pr : -d * sp };
  }
  function smUpd() {
    var z = smCalc(); if (!z) return;
    var cur = z.mx ? z.h.n / z.mx * 100 : 0, tp = +z.r.value / 10;
    z.r.style.setProperty("--cur", cur + "%"); z.r.style.setProperty("--a", Math.min(cur, tp) + "%"); z.r.style.setProperty("--b", Math.max(cur, tp) + "%");
    z.r.classList.toggle("buy", z.d > 0); z.r.classList.toggle("sell", z.d < 0);
    set("fh-sm-tg", fmt(t("smShares"), { n: nI(z.tg) })); set("fh-sm-mx", fmt(t("smShares"), { n: nI(z.mx) }));
    set("fh-sm-desc", z.d === 0 ? "" : fmt(t(z.d > 0 ? "smBuyD" : "smSellD"), { n: nI(Math.abs(z.d)), p: eur2(z.d > 0 ? z.pr : z.sp) }));
    var sm = document.getElementById("fh-sm-sum"), b = document.getElementById("fh-sm-btn"), poor = z.d > 0 && z.sum > G.money;
    sm.textContent = z.d === 0 ? "" : (z.d > 0 ? "−" : "+") + eur(z.sum); sm.className = "sum " + (z.d > 0 ? "buy" : "sell");
    b.textContent = z.d === 0 ? t("trMove") : poor ? t("trPoor") : (z.d > 0 ? t("trBuy") : t("trSell")) + " · " + eurS(z.sum);
    b.className = z.d > 0 ? "buy" : z.d < 0 ? "sell" : ""; b.setAttribute("aria-disabled", String(z.d === 0 || poor));
  }
  function smDo() {
    var z = smCalc(); if (!z || z.d === 0) return;
    if (z.d > 0) { if (z.sum > G.money) { msg(t("poor")); return; } G.money -= z.sum; z.h.n += z.d; z.h.cost += z.sum; msg(z.q.n + ": " + t("smBought") + " · " + eurS(z.sum), true); }
    else { var part = -z.d / z.h.n; z.h.cost -= z.h.cost * part; z.h.n += z.d; G.money += z.sum; if (!z.h.n) z.h.cost = 0; msg(z.q.n + ": " + t("smDone") + " · +" + eurS(z.sum), true); }
    (G.strades || (G.strades = [])).push({ s: z.q.id, t: Math.floor(G.fpt || 0), p: z.d > 0 ? z.pr : z.sp, k: z.d > 0 ? "b" : "s" }); if (G.strades.length > 80) G.strades.shift();
    save(); updatePanel(true); smDraw(true, true);
  }
  // Finanzbericht: je Bereich eine Linie (gleitender 60-s-Umsatz in €/min), dazu die Summe
  var finLast = -1;
  function finDraw(force) {
    if (!V) return;
    var box = V.root.querySelector("#fh-fin"); if (!box || box.hidden) return;
    var sec = Math.floor(G.fpt || 0); if (!force && sec === finLast) return; finLast = sec;
    var cv = box.querySelector("#fh-fin-cv"), c = cv.getContext("2d"), W = cv.width, H = cv.height;
    var cur = Math.floor((G.fpt || 0) / FINB), win = 60 / FINB, map = {}, tot15 = {}, all = 0;
    (G.fin || []).forEach(function (b) { map[b.i] = b.c; });
    FINCAT.forEach(function (k) { tot15[k] = 0; });
    var series = FINCAT.map(function () { return []; }), total = [], ymax = 1000;
    for (var j = 0; j < FINN; j++) {
      var i = cur - FINN + 1 + j, tsum = 0;
      FINCAT.forEach(function (k, ci) {
        var r = 0; for (var q = 0; q < win; q++) { var b = map[i - q]; if (b && b[k]) r += b[k]; }
        series[ci].push(r); tsum += r;
        var bb = map[i]; if (bb && bb[k]) { tot15[k] += bb[k]; all += bb[k]; }
      });
      total.push(tsum); if (tsum > ymax) ymax = tsum;
    }
    ymax *= 1.08;
    var P = { l: 6, r: 6, t: 14, b: 10 };
    function X(j) { return P.l + j / (FINN - 1) * (W - P.l - P.r); }
    function Y(v) { return H - P.b - v / ymax * (H - P.t - P.b); }
    c.clearRect(0, 0, W, H);
    c.lineWidth = 1; c.strokeStyle = "rgba(244,241,236,.08)"; c.fillStyle = "rgba(244,241,236,.5)"; c.font = "600 18px " + FONT; c.textAlign = "left";
    var step = Math.pow(10, Math.floor(Math.log10(ymax / 3))); [1, 2, 5, 10].some(function (f) { if (ymax / (step * f) <= 5) { step *= f; return true; } });
    for (var gv = step; gv < ymax; gv += step) { var gy = Math.round(Y(gv)) + 0.5; c.beginPath(); c.moveTo(0, gy); c.lineTo(W, gy); c.stroke(); c.fillText(eurS(gv), 8, gy - 5); }
    for (var gx = 1; gx < 3; gx++) { var xx = Math.round(X(gx * 60)) + 0.5; c.beginPath(); c.moveTo(xx, 0); c.lineTo(xx, H); c.stroke(); }
    function line(arr, col, wd) { c.beginPath(); for (var j2 = 0; j2 < arr.length; j2++) { if (j2) c.lineTo(X(j2), Y(arr[j2])); else c.moveTo(X(j2), Y(arr[j2])); } c.strokeStyle = col; c.lineWidth = wd; c.stroke(); }
    FINCAT.forEach(function (k, ci) { if (tot15[k] > 0 || series[ci].some(function (v) { return v > 0; })) line(series[ci], FINCOL[ci], 3); });
    c.setLineDash([10, 6]); line(total, "#F4F1EC", 2.5); c.setLineDash([]);
    var names = t("finCat").split("|"), order = FINCAT.map(function (k, ci) { return ci; }).sort(function (a, b) { return tot15[FINCAT[b]] - tot15[FINCAT[a]]; });
    document.getElementById("fh-fin-leg").innerHTML = '<span><i style="background:#F4F1EC"></i>' + t("finTot") + "<em>" + eurS(all) + "</em></span>" + order.map(function (ci) {
      var v = tot15[FINCAT[ci]]; return '<span' + (v > 0 ? "" : ' class="off"') + '><i style="background:' + FINCOL[ci] + '"></i>' + names[ci] + "<em>" + (all > 0 ? Math.round(v / all * 100) : 0) + " %</em></span>";
    }).join("");
    set("fh-fin-rate", eurS(finRate()));
    set("fh-fin-sum", all > 0 ? fmt(t("finSum"), { e: eurS(all) }) : t("finEmpty"));
  }
  // Preisverlauf: nur gezeichnet, wenn das Fenster offen ist, und dann einmal pro Sekunde
  var fpLast = -1;
  function shadeCrisis(c, t0, N, X, H) {
    var L = crisisList(t0 + N);
    L.forEach(function (q) {
      if (q.e < t0 || q.s > t0 + N) return;
      var xa = X(Math.max(0, q.s - t0)), xb = X(Math.min(N, q.e - t0)), xh = X(Math.max(0, Math.min(N, q.a - t0))), xe = X(Math.max(0, Math.min(N, q.b - t0)));
      c.fillStyle = "rgba(194,65,45,.13)"; c.fillRect(xa, 0, xb - xa, H);
      c.fillStyle = "rgba(194,65,45,.18)"; c.fillRect(xh, 0, Math.max(0, xe - xh), H);
      c.fillStyle = "#E58A73"; c.font = "700 19px " + FONT; c.textAlign = "left"; c.fillText(t("crisis").toUpperCase(), Math.min(Math.max(xa + 8, 8), xb - 8 > xa + 8 ? xb - 120 : xa + 8), 24);
    });
  }
  function fpDraw(force) {
    if (!V) return;
    var box = V.root.querySelector("#fh-fp"); if (!box || box.hidden) return;
    var sec = Math.floor(G.fpt || 0); if (!force && sec === fpLast) return; fpLast = sec;
    var cv = box.querySelector("#fh-fp-cv"), c = cv.getContext("2d"), W = cv.width, H = cv.height, N = 900, pts = [], lo = Infinity, hi = -Infinity;
    var sp = [], shi = 0;
    for (var k = 0; k <= N; k++) { var v = fuelPriceAt(sec - N + k); pts.push(v); if (v < lo) lo = v; if (v > hi) hi = v; var sv = fuelSellAt(sec - N + k); sp.push(sv); if (sv > shi) shi = sv; }
    var ymin = lo * 0.9, ymax = shi * 1.04, padL = 4, padR = 4;
    function Y(v) { return H - 14 - (v - ymin) / (ymax - ymin) * (H - 28); }
    function X(k) { return padL + k / N * (W - padL - padR); }
    c.clearRect(0, 0, W, H);
    shadeCrisis(c, sec - N, N, X, H);
    c.strokeStyle = "rgba(244,241,236,.08)"; c.lineWidth = 1;
    for (var gx = 0; gx <= 15; gx++) { var xx = Math.round(X(gx * 60)) + 0.5; c.beginPath(); c.moveTo(xx, 0); c.lineTo(xx, H); c.stroke(); }
    c.setLineDash([8, 6]); c.strokeStyle = "rgba(143,199,154,.8)"; c.lineWidth = 2; c.beginPath(); for (k = 0; k <= N; k += 3) { if (k) c.lineTo(X(k), Y(sp[k])); else c.moveTo(X(k), Y(sp[k])); } c.stroke(); c.setLineDash([]);
    if (R.fuelLog) { c.fillStyle = "rgba(143,199,154,.55)"; R.fuelLog.forEach(function (f) { var kk = f.t - (sec - N); if (kk >= 0 && kk <= N) c.fillRect(X(kk) - 2, Y(f.e / f.u) - 2, 4, 4); }); }
    var trMarks = (G.trades || []).filter(function (q) { var kk = q.t - (sec - N); return kk >= 0 && kk <= N; });
    c.beginPath(); c.moveTo(X(0), H); for (k = 0; k <= N; k++) c.lineTo(X(k), Y(pts[k])); c.lineTo(X(N), H); c.closePath(); c.fillStyle = "rgba(227,184,63,.14)"; c.fill();
    c.beginPath(); for (k = 0; k <= N; k++) { if (k) c.lineTo(X(k), Y(pts[k])); else c.moveTo(X(k), Y(pts[k])); } c.strokeStyle = "#E3B83F"; c.lineWidth = 3; c.stroke();
    var iH = pts.indexOf(hi), iL = pts.indexOf(lo); c.font = "600 19px " + FONT;
    [[iH, hi, t("fpHi"), -10], [iL, lo, t("fpLo"), 24]].forEach(function (q) { var x = X(q[0]); c.fillStyle = "#F4F1EC"; c.fillRect(x - 4, Y(q[1]) - 4, 8, 8); c.textAlign = x > W * 0.75 ? "right" : x < W * 0.25 ? "left" : "center"; c.fillText(q[2] + " " + eur(q[1]), x, Math.min(H - 4, Math.max(18, Y(q[1]) + q[3]))); });
    c.fillStyle = "#E3B83F"; c.fillRect(X(N) - 6, Y(pts[N]) - 6, 12, 12);
    trMarks.forEach(function (q) { var x = X(q.t - (sec - N)), y = Y(q.p); c.beginPath(); c.arc(x, y, 8, 0, Math.PI * 2); c.fillStyle = q.k === "b" ? "#E58A73" : "#8FC79A"; c.fill(); c.lineWidth = 3; c.strokeStyle = "#F4F1EC"; c.stroke(); });
    var now = pts[N], d = now - fuelPriceAt(sec - 60), de = document.getElementById("fh-fp-d");
    set("fh-fp-now", eur(now));
    de.textContent = (d > 0 ? "▲ +" : d < 0 ? "▼ −" : "± ") + eur(Math.abs(d)) + " / min"; de.style.color = d > 0 ? "#E58A73" : d < 0 ? "#8FC79A" : "";
    var cap = fuelCap(), miss = Math.max(0, cap - G.fuel), fb = box.querySelector("[data-fhfpfill]");
    var logs = (R.fuelLog || []).filter(function (f) { return f.t > sec - N; }), su = 0, se = 0; logs.forEach(function (f) { su += f.u; se += f.e; });
    var szN = t("fpSz").split("|"), last = (R.fuelLog || []).slice(-4).reverse().map(function (f) { return f.cs + " (" + szN[f.k === "p" ? 0 : f.k === "n" ? 1 : 2] + ") " + f.u + " × " + eur(f.e / f.u); });
    set("fh-fp-sell", eur(fuelSell()));
    set("fh-fp-info", (cap ? t("fuel") + " " + Math.round(fuelPct()) + " % · " : t("fpNoTank") + " · ") + fmt(t("fpSales"), { u: su, e: eurS(se).replace(/ /g, "\u00a0") }));
    set("fh-fp-log", last.length ? t("fpLog") + ": " + last.join(" · ") : t("fpNone"));
    fb.hidden = !cap; fb.textContent = t("fuelFill") + " · " + eurS(miss * now); fb.setAttribute("aria-disabled", String(miss < 0.5));
  }
  function fitView() {
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    var ms = G.mods.filter(function (m) { return !m.hw; });
    if (!ms.length) { V.cam = { x: 0, y: 120 }; V.zoom = 1; return; }
    ms.forEach(function (m) { corners(foot(m)).forEach(function (p) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }); });
    V.cam = { x: (x0 + x1) / 2, y: (y0 + y1) / 2 };
    var W = V.stage.clientWidth || 800, H = (V.stage.clientHeight || 500) - 180;
    V.zoom = Math.max(0.3, Math.min(1.4, Math.min(W / (x1 - x0 + 200), H / (y1 - y0 + 200))));
  }

  function mount(el, l) {
    unmount();
    lang = l === "en" ? "en" : "de";
    if (!G) G = load();
    if (!R) R = runtime();
    rebuild();
    injectCSS();
    el.innerHTML = html();
    V = { root: el, stage: el.querySelector("#fh-stage"), cv: el.querySelector("#fh-cv"), cam: { x: 0, y: 0 }, zoom: 1, ang: 0, tool: null, ghost: null, sel: null, mouse: null, W: 800, H: 500, rotHold: 0, ov: document.body.style.overflow };
    document.body.style.overflow = "hidden";
    setTab("air"); window.addEventListener("resize", layoutVars);
    V.stage.focus({ preventScroll: true });
    V.ctx = V.cv.getContext("2d");
    fitView();
    el.addEventListener("click", onClick);
    el.addEventListener("input", function (e) { if (e.target.id === "fh-tr") trUpdate(); if (e.target.id === "fh-sm-r") smUpd(); });
    el.addEventListener("pointerdown", onRotDown);
    window.addEventListener("pointerup", onRotUp);
    V.cv.addEventListener("pointerdown", onDown);
    V.cv.addEventListener("pointermove", onMove);
    V.cv.addEventListener("pointerup", onUp);
    V.cv.addEventListener("pointerleave", function () { if (V && !V.drag) { V.mouse = null; V.ghost = null; } });
    V.cv.addEventListener("wheel", onWheel, { passive: false });
    V.cv.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    lastSig = ""; updatePanel(true); updateBar(); updateSel(); updateHint();
    if (R.first) { R.first = false; if (!mods("runway").length) msg(t("welcome"), true); }
    if (G.legacyRoads) { delete G.legacyRoads; save(); msg(lang === "de" ? "Neu: Unten verläuft jetzt eine Landstraße. Von dort kommen alle Autos und Busse, verbinde deine Straßen mit ihr." : "New: a country road now runs along the bottom. All cars and buses come from there, so connect your roads to it.", true); }
    last = 0; raf = requestAnimationFrame(frame);
  }
  function unmount() {
    if (raf) cancelAnimationFrame(raf); raf = 0;
    if (V) {
      V.root.removeEventListener("click", onClick);
      V.root.removeEventListener("pointerdown", onRotDown);
      window.removeEventListener("pointerup", onRotUp);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
      window.removeEventListener("resize", layoutVars);
      document.body.style.overflow = V.ov || "";
      V = null;
    }
    keys = {};
    save();
  }
  window.addEventListener("pagehide", save);

  window.Flughafen = { mount: mount, unmount: unmount,
    _debug: function () { return { G: G, R: R, V: V, tick: tick, addMod: addMod, rebuild: rebuild, stats: stats, snapRect: snapRect, setTool: setTool, act: act, updateGhost: updateGhost, rwEnds: rwEnds, world: world, fuelPriceAt: fuelPriceAt, crisisList: crisisList, crash: crash, wxNow: wxNow }; } };
})();
