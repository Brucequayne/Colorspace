/* Flughafen – ein kleines Aufbauspiel für Soy and Soul.
   Einbindung: <script src="flughafen.js"></script>, dann Flughafen.mount(element, "de" | "en")
   und Flughafen.unmount() beim Verlassen der Seite. Der Spielstand liegt nur lokal im Browser. */
(function () {
  "use strict";

  var KEY = "flughafen-v2";
  var MAXC = 14;                 // maximale Anzahl Parkpositionen
  var COLW = 60, LEFT = 150, RIGHT = 40, X0 = 40;
  var Y = { r2: 78, r1: 140, twy: 195, stand: 252, termTop: 288, termBot: 330, rd1: 348, rd2: 370, land: 388, H: 444 };
  var DIVERT = 55;               // Sekunden in der Warteschleife bis zum Ausweichen
  var SITE = {
    hangar: { x: 8, y: 208, w: 78, h: 56 },
    fire: { x: 94, y: 208, w: 48, h: 36 },
    deck: { x: 8, y: 274, w: 78, h: 40 },
    tower: { x: 118, y: 286 }
  };

  // ---------- Texte ----------
  var TX = {
    title: { de: "Flughafen", en: "Airport" },
    intro: { de: "Bau deinen eigenen Flughafen. Die Flugzeuge kommen von selbst, jede Landung und jeder Start bringt Geld. Je größer und besser dein Flughafen, desto mehr Verkehr zieht er an. Wer aber zu lange in der Warteschleife kreist, fliegt woandershin.",
             en: "Build your own airport. Aircraft arrive on their own, and every landing and take-off earns money. The bigger and better your airport, the more traffic it attracts. But anyone left circling too long flies somewhere else." },
    money: { de: "Kasse", en: "Cash" }, rep: { de: "Ruf", en: "Reputation" },
    moves: { de: "Bewegungen", en: "Movements" }, pax: { de: "Passagiere", en: "Passengers" },
    hold: { de: "Warteschleife", en: "Holding" },
    build: { de: "Ausbauen", en: "Build" },
    pause: { de: "Pause", en: "Pause" }, play: { de: "Weiter", en: "Resume" }, speed: { de: "Tempo", en: "Speed" },
    ranks: { de: ["Flugplatz", "Regionalflughafen", "Verkehrsflughafen", "Internationales Drehkreuz"],
             en: ["Airfield", "Regional airport", "Commercial airport", "International hub"] },
    built: { de: "gebaut", en: "built" },
    poor: { de: "Dafür reicht das Geld noch nicht.", en: "Not enough cash yet." },
    divert: { de: "weicht aus: zu lange in der Warteschleife.", en: "diverts: held too long." },
    welcome: { de: "Der erste Flieger ist im Anflug.", en: "The first aircraft is on approach." },
    maint: { de: "Wartung", en: "Maintenance" },
    tip: { de: "Tipp: Ist die Piste der Engpass, helfen Tower, Schnellabrollwege und Instrumentenlandesystem.", en: "Tip: if the runway is the bottleneck, a tower, rapid exits and an ILS help." },
    howH: { de: "So funktioniert’s", en: "How it works" },
    how1: { de: "Flugzeuge kreisen links oben, bis die Piste frei ist und eine passende Parkposition wartet. Bei Landung und Start kassierst du eine Gebühr, nach der Abfertigung kommen die Ticketeinnahmen dazu.",
            en: "Aircraft circle at the top left until the runway is clear and a suitable stand is free. You collect a fee on landing and take-off, and the ticket revenue after the turnaround." },
    how2: { de: "Positionen ohne Gate werden per Bus abgefertigt: langsamer und weniger Einnahmen. Ein Gate braucht ein Terminalmodul dahinter, jedes Modul hat Platz für zwei Gates. Tower, Instrumentenlandesystem, Schnellabrollwege und eine zweite Piste lösen Engpässe auf der Piste. Ab der fünften Position verlangt die Luftaufsicht eine Feuerwehr, Langstreckenjets brauchen eine größere.",
            en: "Stands without a gate are served by bus: slower and less revenue. A gate needs a terminal module behind it, and each module has room for two gates. Tower, instrument landing system, rapid exit taxiways and a second runway ease runway bottlenecks. From the fifth stand the authority requires a fire station, and widebodies need a bigger one." },
    how3: { de: "Der Spielstand wird nur in deinem Browser gespeichert.", en: "Your progress is saved only in your browser." },
    reset: { de: "Neues Spiel", en: "New game" }, resetQ: { de: "Wirklich alles löschen?", en: "Really delete everything?" },
    done: { de: "Ausgebaut", en: "Complete" }, maxed: { de: "Kein Platz mehr", en: "No space left" },
    lvl: { de: "Stufe", en: "Level" },
    needFire: { de: "Braucht eine Feuerwehr", en: "Needs a fire station" },
    needFire2: { de: "Braucht Feuerwehr Stufe 2", en: "Needs fire station level 2" },
    needRwy: { de: "Braucht die Pistenverlängerung", en: "Needs the runway extension" },
    needStand: { de: "Erst eine neue Parkposition bauen", en: "Build a new stand first" },
    needTerm: { de: "Braucht ein weiteres Terminalmodul", en: "Needs another terminal module" },
    needRoad: { de: "Braucht die getrennte Vorfahrt", en: "Needs the split forecourt road" },
    needTower: { de: "Braucht einen Tower", en: "Needs a control tower" },
    needTower2: { de: "Braucht Tower Stufe 2", en: "Needs tower level 2" },
    need6: { de: "Ab 6 Parkpositionen", en: "From 6 stands" },
    dep: { de: "ABFLUG", en: "DEPARTURES" }, arr: { de: "ANKUNFT", en: "ARRIVALS" },
    grp: { air: { de: "Rollfeld", en: "Airside" }, term: { de: "Terminal", en: "Terminal" },
           land: { de: "Landseite", en: "Landside" }, ops: { de: "Betrieb", en: "Operations" } }
  };

  var TYPES = {
    p: { pax: 60, fee: 80, turn: 18, len: 17, span: 22, sweep: 0.01, roll: 100 },
    n: { pax: 160, fee: 200, turn: 26, len: 25, span: 25, sweep: 0.13, roll: 150 },
    w: { pax: 300, fee: 450, turn: 40, len: 36, span: 37, sweep: 0.16, roll: 210, heavy: true }
  };
  // Erfundene Airlines (keine echten Marken)
  var AIRLINES = [
    { c: "SOY", col: "#B5651D" }, { c: "WOK", col: "#C2412D" }, { c: "TFU", col: "#2F6F8F" },
    { c: "MSO", col: "#4F7A35" }, { c: "UMA", col: "#7A4E9A" }, { c: "KOI", col: "#D9A21B" }, { c: "NRI", col: "#1F5C4F" }
  ];

  // ---------- Zustand ----------
  var G = null, R = null, V = null, lang = "de";

  function fresh() {
    return { v: 2, money: 1500, rep: 50, cols: [{ gate: true, heavy: false }], term: 1, bus: 0, park: 0,
      up: { rwy: 0, ils: 0, r2: 0, gh: 0, exit: 0, ext: 0, road: 1, tower: 0, fire: 0, hangar: 0, deck: 0 },
      st: { moves: 0, pax: 0, earned: 0, div: 0 } };
  }
  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY) || "null");
      if (s && s.v === 2 && s.cols && s.cols.length) return s;
    } catch (e) {}
    return fresh();
  }
  function save() { try { if (G) localStorage.setItem(KEY, JSON.stringify(G)); } catch (e) {} }
  function runtime() {
    return { planes: [], holdQ: [], depQ: [], occ: [], rw: [{ busy: null, next: null, cool: 0, last: "" }, { busy: null, next: null, cool: 0, last: "" }],
      spawnT: 3, fx: [], cars: [], carT: 0, buses: [], busT: 4, speed: 1, paused: false, id: 0, saveT: 0, msgT: 0,
      first: true, hangarT: 0, hangarType: "n", visitors: 0, clock: 0 };
  }

  function t(k) { return TX[k][lang]; }
  function nS() { return G.cols.length; }
  function nGates() { return G.cols.filter(function (c) { return c.gate; }).length; }
  function nH() { return G.cols.filter(function (c) { return c.heavy; }).length; }
  function rl() { return G.up.rwy ? 600 : 440; }
  function worldW() { return Math.max(LEFT + nS() * COLW + RIGHT, LEFT + G.park * 74 + RIGHT, X0 + rl() + 70, 620); }
  function cx(i) { return LEFT + i * COLW + COLW / 2; }
  function loc() { return lang === "de" ? "de-DE" : "en-GB"; }
  function eur(v) { var n = Math.round(v).toLocaleString(loc()); return lang === "de" ? n + " €" : "€" + n; }
  function rank() { var n = nS(); return t("ranks")[n < 3 ? 0 : n < 6 ? 1 : n < 10 ? 2 : 3]; }
  function round(v) { return Math.round(v / 50) * 50; }
  function gateSlot() {
    for (var i = 0; i < G.cols.length; i++) if (!G.cols[i].gate && Math.floor(i / 2) < G.term) return i;
    return -1;
  }
  function lv(n, max) { return t("lvl") + " " + n + "/" + max; }

  // ---------- Ausbau ----------
  function L2(de, en) { return { de: de, en: en }; }
  var BUILD = [
    // Rollfeld
    { id: "stand", g: "air", name: L2("Parkposition", "Aircraft stand"),
      desc: L2("Neue Position auf dem Vorfeld. Ohne Gate per Bus: langsamer, weniger Ertrag.", "A new stand on the apron. Without a gate it is served by bus: slower, less revenue."),
      cost: function () { return round(700 * Math.pow(1.3, nS() - 1)); },
      lock: function () { if (nS() >= MAXC) return t("maxed"); return nS() >= 4 && G.up.fire < 1 ? t("needFire") : ""; },
      apply: function () { G.cols.push({ gate: false, heavy: false }); } },
    { id: "heavy", g: "air", name: L2("Großraum-Position", "Widebody stand"),
      desc: L2("Macht eine Position fit für Langstreckenjets, die am meisten einbringen.", "Makes a stand fit for widebody jets, which earn the most."),
      cost: function () { return round(3500 * Math.pow(1.25, nH())); },
      lock: function () {
        if (!G.up.rwy) return t("needRwy");
        if (G.up.fire < 2) return t("needFire2");
        return nH() >= nS() ? t("needStand") : "";
      },
      apply: function () {
        var best = -1;
        G.cols.forEach(function (c, i) { if (!c.heavy && (best < 0 || (c.gate && !G.cols[best].gate))) best = i; });
        if (best >= 0) G.cols[best].heavy = true;
      } },
    { id: "exit", g: "air", name: L2("Schnellabrollwege", "Rapid exit taxiways"),
      desc: L2("Schräge Abfahrten: Landende Flieger räumen die Piste früher.", "Angled exits: landing aircraft clear the runway sooner."),
      cost: function () { return 4000; }, lock: function () { return G.up.exit ? t("done") : ""; },
      apply: function () { G.up.exit = 1; } },
    { id: "rwy", g: "air", name: L2("Pistenverlängerung", "Runway extension"),
      desc: L2("Eine längere Piste, die auch Langstreckenjets nutzen können.", "A longer runway that widebody jets can use too."),
      cost: function () { return 9000; }, lock: function () { return G.up.rwy ? t("done") : ""; },
      apply: function () { G.up.rwy = 1; } },
    { id: "ils", g: "air", name: L2("Instrumentenlandesystem", "Instrument landing system"),
      desc: L2("Schnellere Anflüge und kürzere Abstände auf der Piste.", "Faster approaches and shorter spacing on the runway."),
      cost: function () { return 5000; },
      lock: function () { if (G.up.ils) return t("done"); return G.up.tower < 1 ? t("needTower") : ""; },
      apply: function () { G.up.ils = 1; } },
    { id: "r2", g: "air", name: L2("Zweite Piste", "Second runway"),
      desc: L2("Eine eigene Startbahn: Landungen und Starts laufen parallel.", "A dedicated departure runway: landings and take-offs run in parallel."),
      cost: function () { return 20000; },
      lock: function () {
        if (G.up.r2) return t("done");
        if (nS() < 6) return t("need6");
        return G.up.tower < 2 ? t("needTower2") : "";
      },
      apply: function () { G.up.r2 = 1; } },
    // Terminal
    { id: "term", g: "term", name: L2("Terminalmodul", "Terminal module"),
      desc: L2("Ein neuer Gebäudeabschnitt mit Check-in und Sicherheitskontrolle. Platz für zwei Gates.", "A new building section with check-in and security. Room for two gates."),
      cost: function () { return round(1500 * Math.pow(1.45, G.term - 1)); },
      lock: function () {
        if (G.term * 2 >= MAXC) return t("maxed");
        if (G.term * 2 >= nS()) return t("needStand");
        return G.term >= 3 && G.up.road < 2 ? t("needRoad") : "";
      },
      apply: function () { G.term++; } },
    { id: "gate", g: "term", name: L2("Gate", "Gate"),
      desc: L2("Fluggastbrücke vom Terminal zur Position: schnellere Abfertigung, mehr Einnahmen, mehr Nachfrage.", "A jet bridge from the terminal to the stand: faster turnarounds, more revenue, more demand."),
      cost: function () { return round(900 * Math.pow(1.3, nGates() - 1)); },
      lock: function () { if (gateSlot() >= 0) return ""; return nGates() >= nS() ? t("needStand") : t("needTerm"); },
      apply: function () { var i = gateSlot(); if (i >= 0) G.cols[i].gate = true; } },
    { id: "ext", g: "term", name: L2("Terminal-Erweiterung", "Terminal extension"),
      desc: L2("Shops, Gastronomie und Lounges: jede Stufe bringt 15 % mehr pro Passagier.", "Shops, food and lounges: each level earns 15% more per passenger."),
      cost: function () { return round(3000 * Math.pow(2, G.up.ext)); },
      lock: function () { return G.up.ext >= 3 ? t("done") : ""; },
      extra: function () { return lv(G.up.ext, 3); },
      apply: function () { G.up.ext++; } },
    // Landseite
    { id: "road", g: "land", name: L2("Vorfahrt Abflug/Ankunft", "Split forecourt road"),
      desc: L2("Getrennte Straßen für Abflug und Ankunft. Mehr Passagiere kommen zum Flughafen.", "Separate roads for departures and arrivals. More passengers get to the airport."),
      cost: function () { return 6000; }, lock: function () { return G.up.road >= 2 ? t("done") : ""; },
      apply: function () { G.up.road = 2; } },
    { id: "park", g: "land", name: L2("Parkplatz", "Car park"),
      desc: L2("Parkgebühren: Jeder Parkplatz verdient an jeder Abfertigung mit.", "Parking fees: every car park earns a share of each turnaround."),
      cost: function () { return round(1200 * Math.pow(1.5, G.park)); },
      lock: function () { return G.park >= 6 ? t("maxed") : ""; },
      extra: function () { return G.park + "/6"; },
      apply: function () { G.park++; } },
    { id: "bus", g: "land", name: L2("Bushaltestelle", "Bus stop"),
      desc: L2("Anbindung an Stadt und Umland: jede Haltestelle bringt rund 8 % mehr Nachfrage.", "Links to the city and region: each stop brings about 8% more demand."),
      cost: function () { return round(800 * Math.pow(1.6, G.bus)); },
      lock: function () { return G.bus >= 3 ? t("maxed") : ""; },
      extra: function () { return G.bus + "/3"; },
      apply: function () { G.bus++; } },
    // Betrieb
    { id: "tower", g: "ops", name: L2("Tower", "Control tower"),
      desc: L2("Flugsicherung vor Ort: kürzere Abstände zwischen Landungen und Starts. Stufe 2 mit Radar.", "Air traffic control on site: shorter spacing between landings and take-offs. Level 2 adds radar."),
      cost: function () { return [2500, 8000][G.up.tower] || 0; },
      lock: function () { return G.up.tower >= 2 ? t("done") : ""; },
      extra: function () { return lv(G.up.tower, 2); },
      apply: function () { G.up.tower++; } },
    { id: "fire", g: "ops", name: L2("Feuerwehr", "Fire station"),
      desc: L2("Pflicht ab der fünften Position. Stufe 2 erlaubt Langstreckenjets und stärkt den Ruf.", "Required from the fifth stand. Level 2 allows widebodies and boosts reputation."),
      cost: function () { return [2000, 7000][G.up.fire] || 0; },
      lock: function () { return G.up.fire >= 2 ? t("done") : ""; },
      extra: function () { return lv(G.up.fire, 2); },
      apply: function () { G.up.fire++; } },
    { id: "hangar", g: "ops", name: L2("Wartungshalle", "Maintenance hangar"),
      desc: L2("Airlines lassen hier warten: Nach manchen Abflügen kommt ein Wartungsauftrag rein.", "Airlines get their aircraft serviced here: some departures bring in a maintenance job."),
      cost: function () { return [6000, 14000][G.up.hangar] || 0; },
      lock: function () { return G.up.hangar >= 2 ? t("done") : ""; },
      extra: function () { return lv(G.up.hangar, 2); },
      apply: function () { G.up.hangar++; } },
    { id: "gh", g: "ops", name: L2("Bodenabfertigung", "Ground handling"),
      desc: L2("Mehr Personal und Gerät: jede Stufe macht die Abfertigung 15 % schneller.", "More staff and equipment: each level makes turnarounds 15% faster."),
      cost: function () { return round(2500 * Math.pow(2.2, G.up.gh)); },
      lock: function () { return G.up.gh >= 3 ? t("done") : ""; },
      extra: function () { return lv(G.up.gh, 3); },
      apply: function () { G.up.gh++; } },
    { id: "deck", g: "ops", name: L2("Aussichtsplattform", "Viewing deck"),
      desc: L2("Planespotter zahlen Eintritt: Einnahmen bei jeder Bewegung, dazu ein besserer Ruf.", "Plane spotters pay to get in: income on every movement, plus a better reputation."),
      cost: function () { return 3500; }, lock: function () { return G.up.deck ? t("done") : ""; },
      apply: function () { G.up.deck = 1; } }
  ];

  function bname(id) { return BUILD.filter(function (x) { return x.id === id; })[0].name[lang]; }
  function buy(id) {
    var b = BUILD.filter(function (x) { return x.id === id; })[0];
    if (!b || b.lock()) return;
    var c = b.cost();
    if (G.money < c) { msg(t("poor")); return; }
    G.money -= c;
    b.apply();
    save();
    msg(b.name[lang] + " " + t("built") + ".", true);
    updatePanel(true);
  }

  // ---------- Verkehr ----------
  function interval() {
    var cap = 0.6 + 0.4 * nS() + 0.2 * nGates() + 0.25 * nH() + (G.up.r2 ? 0.8 : 0);
    var land = 1 + 0.15 * (G.up.road - 1) + 0.08 * G.bus;
    var repF = 1.35 - G.rep / 100 * 0.7;
    return Math.max(4.5, 50 / (cap * land) * repF);
  }
  function pickType() {
    var w = { p: Math.max(0.15, 1.2 - 0.12 * nS()), n: 0.3 + 0.15 * nS(), w: (G.up.rwy && nH()) ? 0.1 + 0.14 * nH() : 0 };
    var sum = w.p + w.n + w.w, r = Math.random() * sum;
    return r < w.p ? "p" : r < w.p + w.n ? "n" : "w";
  }
  function spawn() {
    if (R.holdQ.length >= 6) return;
    var a = AIRLINES[Math.floor(Math.random() * AIRLINES.length)];
    var p = { id: ++R.id, type: pickType(), al: a, cs: a.c + (100 + Math.floor(Math.random() * 900)),
      x: 70, y: 26, h: 0, alt: 0.8, ang: Math.random() * 6, wait: 0, fade: 0, state: "hold", path: null, pi: 0 };
    R.planes.push(p);
    R.holdQ.push(p);
  }
  function freeStand(type) {
    var best = -1, bs = -99;
    G.cols.forEach(function (c, i) {
      if (R.occ[i]) return;
      if (TYPES[type].heavy && !c.heavy) return;
      var s = (c.gate ? 2 : 0) - (c.heavy && !TYPES[type].heavy ? 1.5 : 0) - i * 0.01;
      if (s > bs) { bs = s; best = i; }
    });
    return best;
  }
  // Warteplätze vor dem Start: Rollhalt, dann (bei zwei Pisten) vor der Hauptpiste, dann auf dem Rollweg
  function slot(k) {
    if (k === 0) return { x: X0 + 12, y: (G.up.r2 ? Y.r2 : Y.r1) + 22 };
    if (G.up.r2) return k === 1 ? { x: X0 + 12, y: Y.r1 + 22 } : { x: X0 + 12 + 26 * (k - 1), y: Y.twy };
    return { x: X0 + 12 + 26 * k, y: Y.twy };
  }
  function rwFree(r) { return !r.busy && r.cool <= 0; }
  // Der nächste Flieger darf schon starten bzw. anfliegen, während der vorige die Piste räumt.
  function rwSoon(r) {
    if (rwFree(r)) return true;
    if (!r.busy || r.next) return false;
    var b = r.busy;
    return (b.state === "dep" && b.pi >= 2) || (b.state === "arr" && b.pi >= 3);
  }
  function take(r, p, kind) {
    if (r.busy) r.next = p; else r.busy = p;
    r.last = kind;
  }
  function sep() { return [3, 2, 1.2][G.up.tower] - (G.up.ils ? 0.4 : 0); }

  function schedule() {
    var r1 = R.rw[0], dr = G.up.r2 ? R.rw[1] : r1;
    if (R.depQ.length && !R.depQ[0].path && R.depQ[0].atHold && rwSoon(dr)) {
      var arrWaits = !G.up.r2 && dr.last === "d" && arrivalPossible();
      if (!arrWaits) launch(R.depQ.shift(), dr);
    }
    if (R.holdQ.length && rwSoon(r1)) {
      if (!G.up.r2 && r1.last === "a" && R.depQ.length) return;
      for (var i = 0; i < R.holdQ.length; i++) {
        var p = R.holdQ[i], col = freeStand(p.type);
        if (col >= 0) { R.holdQ.splice(i, 1); clearArrival(p, col, r1); return; }
      }
    }
  }
  function arrivalPossible() { return R.holdQ.some(function (p) { return freeStand(p.type) >= 0; }); }
  function exits() {
    var L = rl(), e = [X0 + L * 0.42, X0 + L * 0.62, X0 + L - 22];
    if (G.up.exit) e.unshift(X0 + L * 0.3);
    return e;
  }
  function pickExit(type) {
    var ex = exits(), min = X0 + 40 + TYPES[type].roll * (G.up.exit ? 0.75 : 1);
    for (var i = 0; i < ex.length; i++) if (ex[i] >= min) return ex[i];
    return ex[ex.length - 1];
  }

  function clearArrival(p, col, r) {
    take(r, p, "a");
    R.occ[col] = p; p.col = col; p.state = "arr";
    var f = G.up.ils ? 1.25 : 1, ex = pickExit(p.type), sx = cx(col), q = G.up.exit ? 1 : 0;
    var off = q ? 22 : 0;
    p.path = [
      { x: p.x, y: p.y, a: 0.8, s: 100 * f },
      { x: X0 - 70, y: Y.r1 - 38, a: 0.5, s: 100 * f },
      { x: X0 + 40, y: Y.r1, a: 0, s: 85 * f, ev: touchdown },
      { x: ex, y: Y.r1, s: q ? 34 : 20 },
      { x: ex + off * 0.4, y: Y.r1 + 16, s: q ? 26 : 16, ev: function () { release(r); } },
      { x: ex + off, y: Y.twy, s: 24 },
      { x: sx, y: Y.twy, s: 40 },
      { x: sx, y: Y.stand, s: 12 }
    ];
    p.pi = 0;
    p.onEnd = park;
  }
  function touchdown(p) { earn(TYPES[p.type].fee, p.x, p.y); movement(); }
  function movement() {
    G.st.moves++;
    if (G.up.deck) {
      G.rep = Math.min(100, G.rep + 0.05);
      var v = 15 * (1 + 0.2 * G.up.ext);
      G.money += v; G.st.earned += v;
      R.visitors = Math.min(24, R.visitors + 2);
    }
  }
  function release(r) {
    if (r.next) { r.busy = r.next; r.next = null; r.cool = 0; }
    else { r.busy = null; r.cool = sep(); }
  }
  function turnTime(p) {
    return TYPES[p.type].turn * (G.cols[p.col].gate ? 1 : 1.45) * (1 - 0.15 * G.up.gh);
  }
  function park(p) { p.state = "park"; p.T = p.t = turnTime(p); p.h = Math.PI / 2; }

  function depart(p) {
    var T = TYPES[p.type], c = G.cols[p.col], sx = cx(p.col);
    var fare = (c.gate ? 2.5 : 1.5) * (1 + 0.15 * G.up.ext) + 0.25 * G.park;
    earn(T.pax * fare, p.x, p.y - 14);
    G.st.pax += T.pax * 2;
    G.rep = Math.min(100, G.rep + (c.gate ? 1 : 0.4) + (G.up.fire >= 2 ? 0.2 : 0));
    var ry = G.up.r2 ? Y.r2 : Y.r1, col = p.col;
    p.state = "out";
    p.path = [
      { x: sx, y: Y.stand, s: 10 },
      { x: sx, y: Y.twy, s: 12, back: 1, ev: function () { R.occ[col] = null; } },
      { x: X0 + 12 + 26 * (R.depQ.length + 1), y: Y.twy, s: 40 }
    ];
    p.pi = 0;
    p.onEnd = function () { p.state = "wait"; R.depQ.push(p); };
  }
  function launch(p, r) {
    take(r, p, "d"); p.state = "dep";
    var ry = G.up.r2 ? Y.r2 : Y.r1, lo = X0 + rl() * (TYPES[p.type].heavy ? 0.66 : 0.5), W = worldW();
    p.path = [
      { x: p.x, y: p.y, s: 12 },
      { x: X0 + 32, y: ry, s: 16 },
      { x: lo, y: ry, s: 90, ev: function () {
        earn(TYPES[p.type].fee, p.x, p.y); movement();
        if (G.up.hangar && Math.random() < 0.2 * G.up.hangar) {
          var h = SITE.hangar;
          earn(TYPES[p.type].fee * 1.5, h.x + h.w / 2, h.y + 10, t("maint"));
          R.hangarT = 14; R.hangarType = p.type;
        }
      } },
      { x: lo + 40, y: ry - 13, a: 0.2, s: 92, ev: function () { release(r); } },
      { x: lo + 120, y: ry - 40, a: 0.6, s: 95 },
      { x: W + 160, y: ry - 150, a: 1.3, s: 100 }
    ];
    p.pi = 0;
    p.onEnd = function () { R.planes.splice(R.planes.indexOf(p), 1); };
  }

  function earn(v, x, y, label) {
    v = Math.round(v);
    G.money += v; G.st.earned += v;
    R.fx.push({ x: x, y: y, t: 0, txt: (label ? label + " " : "") + "+" + eur(v) });
  }

  function move(p, dt) {
    while (p.path && dt > 0) {
      var a = p.path[p.pi], b = p.path[p.pi + 1];
      if (!b) { var fn = p.onEnd; p.path = null; if (fn) fn(p); return; }
      var dx = b.x - p.x, dy = b.y - p.y, d = Math.hypot(dx, dy);
      var seg = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      var f = Math.min(1, Math.max(0, 1 - d / seg));
      var sp = Math.max(4, a.s + (b.s - a.s) * f), mv = sp * dt;
      if (d > 0.01) p.h = b.back ? Math.atan2(-dy, -dx) : Math.atan2(dy, dx);
      if (mv >= d) {
        p.x = b.x; p.y = b.y; p.alt = b.a || 0;
        dt -= d / sp; p.pi++;
        if (b.ev) b.ev(p);
      } else {
        p.x += dx / d * mv; p.y += dy / d * mv;
        var g = 1 - (d - mv) / seg;
        p.alt = (a.a || 0) + ((b.a || 0) - (a.a || 0)) * g;
        dt = 0;
      }
    }
  }

  function tick(dt) {
    R.clock += dt;
    R.rw.forEach(function (r) { if (!r.busy && r.cool > 0) r.cool -= dt; });
    R.spawnT -= dt;
    if (R.spawnT <= 0) { spawn(); R.spawnT = interval() * (0.7 + Math.random() * 0.6); }
    if (R.hangarT > 0) R.hangarT -= dt;
    R.visitors = Math.max(G.up.deck ? 3 : 0, R.visitors - dt * 0.15);

    for (var i = R.holdQ.length - 1; i >= 0; i--) {
      var h = R.holdQ[i];
      h.wait += dt; h.fade = Math.min(1, h.fade + dt);
      if (h.wait > DIVERT) {
        R.holdQ.splice(i, 1);
        R.planes.splice(R.planes.indexOf(h), 1);
        G.rep = Math.max(0, G.rep - 4); G.st.div++;
        msg(h.cs + " " + t("divert") + (G.st.div % 3 === 1 ? " " + t("tip") : ""));
      }
    }
    R.holdQ.forEach(function (h, k) {
      h.ang += dt * 0.9;
      var a = h.ang + k * (Math.PI * 2 / 6), ox = 90, oy = 28, rx = 60, ry = 13;
      h.x = ox + Math.cos(a) * rx; h.y = oy + Math.sin(a) * ry;
      h.h = Math.atan2(Math.cos(a) * ry, -Math.sin(a) * rx);
      h.alt = 0.8;
    });

    // Wartende Abflüge rücken auf: der erste zum Rollhalt, die anderen auf dem Rollweg dahinter
    R.depQ.forEach(function (p, k) {
      if (p.path) return;
      var sl = slot(k);
      if (Math.abs(p.x - sl.x) < 1 && Math.abs(p.y - sl.y) < 1) { p.atHold = k === 0; return; }
      p.atHold = false;
      var pts = [{ x: p.x, y: p.y, s: 20 }];
      if (sl.y < Y.twy - 1 && p.y > Y.twy - 1 && Math.abs(p.x - sl.x) > 1) pts.push({ x: sl.x, y: Y.twy, s: 18 });
      pts.push({ x: sl.x, y: sl.y, s: 16 });
      p.path = pts; p.pi = 0; p.onEnd = null;
    });

    schedule();

    R.planes.forEach(function (p) {
      if (p.state === "park") { p.t -= dt; if (p.t <= 0) depart(p); }
      else if (p.path) move(p, dt);
    });

    R.fx.forEach(function (f) { f.t += dt; });
    R.fx = R.fx.filter(function (f) { return f.t < 1.8; });

    // Autos: mehr Terminal, mehr Verkehr
    var W = worldW();
    R.carT -= dt;
    if (R.carT <= 0) {
      R.carT = Math.max(0.4, 6 / (1 + G.term + G.park * 0.5));
      var dir = Math.random() < 0.5 ? 1 : -1;
      var lane = G.up.road >= 2 ? (Math.random() < 0.5 ? Y.rd1 : Y.rd2) : (Y.rd1 + Y.rd2) / 2;
      R.cars.push({ x: dir > 0 ? -10 : W + 10, y: lane + (dir > 0 ? 3 : -3), d: dir, v: 26 + Math.random() * 12,
        c: ["#E7E9E4", "#2B2E2B", "#9A540A", "#5C6E80", "#B33A2E", "#D9D4C5"][Math.floor(Math.random() * 6)] });
    }
    R.cars.forEach(function (c) { c.x += c.d * c.v * dt; });
    R.cars = R.cars.filter(function (c) { return c.x > -20 && c.x < W + 20; });

    // Busse halten an den Haltestellen
    if (G.bus) {
      R.busT -= dt;
      if (R.busT <= 0) { R.busT = 9 / G.bus; R.buses.push({ x: -20, stop: Math.floor(Math.random() * G.bus), wait: 4 }); }
    }
    R.buses.forEach(function (b) {
      var sx = 12 + b.stop * 44 + 19;
      if (b.wait > 0 && b.x < sx && b.x + 30 * dt >= sx) b.x = sx;
      if (b.x === sx && b.wait > 0) b.wait -= dt; else b.x += 30 * dt;
    });
    R.buses = R.buses.filter(function (b) { return b.x < W + 30; });
  }

  // ---------- Zeichnen ----------
  var FONT = "'Instrument Sans',system-ui,sans-serif";
  function draw() {
    var cv = V.cv, c = V.ctx, W = worldW(), H = Y.H;
    var cw = V.stage.clientWidth || 600;
    var sc = Math.max(cw / W, cw < 700 ? 0.8 : 0);
    var dpr = window.devicePixelRatio || 1;
    var pw = Math.round(W * sc), ph = Math.round(H * sc);
    if (cv.width !== Math.round(pw * dpr) || cv.height !== Math.round(ph * dpr)) {
      cv.width = Math.round(pw * dpr); cv.height = Math.round(ph * dpr);
      cv.style.width = pw + "px"; cv.style.height = ph + "px";
    }
    c.setTransform(sc * dpr, 0, 0, sc * dpr, 0, 0);
    c.textAlign = "center"; c.textBaseline = "middle";

    // Gras mit Mähstreifen
    c.fillStyle = "#C3BCB0"; c.fillRect(0, 0, W, H);
    // Landseite
    c.fillStyle = "#B5AEA2"; c.fillRect(0, Y.termBot + 4, W, H - Y.termBot - 4);
    // Zaun zwischen Luft- und Landseite
    c.strokeStyle = "rgba(80,72,84,.35)"; c.setLineDash([2, 3]); c.lineWidth = 0.8;
    line(c, 0, Y.termBot + 4, W, Y.termBot + 4); c.setLineDash([]);

    if (!G.up.r2) ghost(c, X0, Y.r2 - 11, 440, 22, bname("r2"));

    var L = rl();
    // Rollweg und Verbindungen
    c.fillStyle = "#4A4350";
    c.fillRect(X0, Y.twy - 7, W - X0 - 16, 14);
    var ex = exits(), q = G.up.exit;
    c.fillRect(X0 + 5, Y.r1, 14, Y.twy - Y.r1);
    ex.forEach(function (x) {
      if (q) {
        c.beginPath(); c.moveTo(x - 7, Y.r1); c.lineTo(x + 7, Y.r1); c.lineTo(x + 29, Y.twy); c.lineTo(x + 15, Y.twy); c.closePath(); c.fill();
      } else c.fillRect(x - 7, Y.r1, 14, Y.twy - Y.r1);
    });
    if (G.up.r2) c.fillRect(X0 + 5, Y.r2, 14, Y.r1 - Y.r2);
    c.strokeStyle = "rgba(227,184,63,.8)"; c.lineWidth = 0.7;
    for (var sx2 = X0 + 20; sx2 < W - 24; sx2 += 22) {
      c.beginPath(); c.arc(sx2, Y.twy - 7, 7, 0, Math.PI); c.stroke();
      c.beginPath(); c.arc(sx2, Y.twy + 7, 7, Math.PI, Math.PI * 2); c.stroke();
    }
    c.strokeStyle = "#E3B83F"; c.lineWidth = 1;
    line(c, X0, Y.twy, W - 16, Y.twy);
    line(c, X0 + 12, Y.r1 + 11, X0 + 12, Y.twy);
    ex.forEach(function (x) { line(c, x, Y.r1 + 11, x + (q ? 22 : 0), Y.twy); });
    if (G.up.r2) line(c, X0 + 12, Y.r2 + 11, X0 + 12, Y.r1 - 11);

    // Pisten
    runway(c, Y.r1, L, G.up.r2 ? ["09R", "27L"] : ["09", "27"], G.up.ils);
    if (G.up.r2) runway(c, Y.r2, 440, ["09L", "27R"], false);
    c.strokeStyle = "#E3B83F"; c.lineWidth = 1.4;
    line(c, X0 + 5, Y.r1 + 20, X0 + 19, Y.r1 + 20);
    if (G.up.r2) line(c, X0 + 5, Y.r2 + 20, X0 + 19, Y.r2 + 20);

    // Vorfeld
    var n = nS(), ax = LEFT - 8, aw = n * COLW + 16;
    c.fillStyle = "#D2CCC1"; c.fillRect(ax, Y.twy + 7, aw, Y.termTop - Y.twy - 7);
    c.fillStyle = "#C4BDB1";
    for (var i = 0; i < n; i++) c.fillRect(LEFT + i * COLW, Y.twy + 7, 1, Y.termTop - Y.twy - 7);
    G.cols.forEach(function (col, i) {
      var x = cx(i);
      c.strokeStyle = "#E3B83F"; c.lineWidth = 1;
      line(c, x, Y.twy + 7, x, Y.stand + 14);
      c.strokeStyle = "rgba(255,255,255,.85)";
      var bw = col.heavy ? 46 : 34;
      c.strokeRect(x - bw / 2, Y.stand - 22, bw, 44);
      c.fillStyle = "rgba(30,32,30,.75)";
      c.font = "600 9px " + FONT;
      c.fillText((col.heavy ? "H" : "") + (i + 1), x + bw / 2 - 7, Y.stand - 15);
    });

    // Betriebsgebäude
    hangar(c); fire(c); deck(c); tower(c);

    // Terminalmodule (je zwei Positionen breit) und Busabfertigung
    for (var m = 0; m < Math.ceil(n / 2); m++) {
      var mx = LEFT + m * 2 * COLW, mw = Math.min(2, n - m * 2) * COLW;
      if (m < G.term) terminal(c, mx, 2 * COLW, m === 0, m === G.term - 1);
      else ghost(c, mx + 4, Y.termTop + 4, mw - 8, Y.termBot - Y.termTop - 8, bname("term"));
    }
    G.cols.forEach(function (col, i) {
      if (col.gate) return;
      var x = cx(i);
      c.fillStyle = "#E3B83F"; c.fillRect(x - 11, Y.stand + 30, 22, 7);
      c.fillStyle = "#151715"; c.fillRect(x - 9, Y.stand + 32, 18, 2);
    });

    // Straße(n)
    roads(c, W);
    // Parkplätze und Bushaltestellen
    for (var k = 0; k < G.park; k++) lot(c, LEFT + k * 74, Y.land, k);
    if (G.park < 6) ghost(c, LEFT + G.park * 74, Y.land, 68, 46, bname("park"));
    for (var b = 0; b < 3; b++) {
      if (b < G.bus) stop(c, 12 + b * 44, Y.land + 4);
      else if (b === G.bus) ghost(c, 12 + b * 44, Y.land + 4, 38, 20, lang === "de" ? "Bus" : "Bus");
    }
    R.buses.forEach(function (bs) {
      c.fillStyle = "#E3B83F"; c.fillRect(bs.x - 13, Y.rd2 + 1, 26, 7);
      c.fillStyle = "rgba(20,20,20,.6)"; c.fillRect(bs.x - 10, Y.rd2 + 3, 20, 2);
    });

    // Fluggastbrücken
    G.cols.forEach(function (col, i) {
      if (!col.gate) return;
      var x = cx(i), p = R.occ[i], on = p && p.state === "park";
      c.strokeStyle = "#F4F1EC"; c.lineWidth = 4; c.lineCap = "round";
      line(c, x - 16, Y.termTop, x - 12, on ? Y.stand + TYPES[p.type].len * 0.28 : Y.termTop - 14);
      c.lineCap = "butt";
    });

    // Flugzeuge: am Boden zuerst, dann in der Luft
    R.planes.slice().sort(function (a, b) { return (a.alt || 0) - (b.alt || 0); }).forEach(function (p) { plane(c, p); });

    // Abfertigungs-Fortschritt
    R.planes.forEach(function (p) {
      if (p.state !== "park") return;
      var r = TYPES[p.type].len * 0.5 + 6, f = 1 - p.t / p.T;
      c.strokeStyle = "rgba(0,0,0,.25)"; c.lineWidth = 2.5;
      c.beginPath(); c.arc(p.x, p.y, r, 0, Math.PI * 2); c.stroke();
      c.strokeStyle = "#F0A848";
      c.beginPath(); c.arc(p.x, p.y, r, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2); c.stroke();
    });

    // Einnahmen
    c.font = "700 11px " + FONT;
    R.fx.forEach(function (f) {
      var a = 1 - f.t / 1.8, y = f.y - 10 - f.t * 18;
      c.globalAlpha = a;
      c.lineWidth = 3; c.strokeStyle = "rgba(20,22,20,.8)"; c.strokeText(f.txt, f.x, y);
      c.fillStyle = "#FFE7B8"; c.fillText(f.txt, f.x, y);
      c.globalAlpha = 1;
    });
  }

  function line(c, a, b, x, y) { c.beginPath(); c.moveTo(a, b); c.lineTo(x, y); c.stroke(); }
  function ghost(c, x, y, w, h, label) {
    c.strokeStyle = "rgba(74,67,80,.4)"; c.setLineDash([4, 4]); c.lineWidth = 1;
    c.strokeRect(x, y, w, h); c.setLineDash([]);
    if (label && w > 30) {
      c.fillStyle = "rgba(74,67,80,.6)"; c.font = "600 7.5px " + FONT;
      c.fillText(label, x + w / 2, y + h / 2, w - 4);
    }
  }

  function runway(c, y, L, ids, ils) {
    c.fillStyle = "#4A4350"; c.fillRect(X0, y - 11, L, 22);
    c.strokeStyle = "rgba(255,255,255,.75)"; c.lineWidth = 0.8;
    line(c, X0 + 2, y - 9, X0 + L - 2, y - 9); line(c, X0 + 2, y + 9, X0 + L - 2, y + 9);
    c.fillStyle = "rgba(255,255,255,.85)";
    for (var k = 0; k < 6; k++) {
      c.fillRect(X0 + 4, y - 8 + k * 2.9, 12, 1.6);
      c.fillRect(X0 + L - 16, y - 8 + k * 2.9, 12, 1.6);
    }
    c.fillRect(X0 + 70, y - 6, 16, 3); c.fillRect(X0 + 70, y + 3, 16, 3);
    c.setLineDash([10, 9]); c.lineWidth = 1;
    line(c, X0 + 44, y, X0 + L - 44, y); c.setLineDash([]);
    c.font = "700 7px " + FONT;
    c.save(); c.translate(X0 + 26, y); c.rotate(Math.PI / 2); c.fillText(ids[0], 0, 0); c.restore();
    c.save(); c.translate(X0 + L - 26, y); c.rotate(-Math.PI / 2); c.fillText(ids[1], 0, 0); c.restore();
    if (ils) { // Anflugbefeuerung
      var on = Math.floor(R.clock * 6) % 6;
      for (var j = 0; j < 6; j++) {
        c.fillStyle = j === on ? "#FFF6D0" : "rgba(255,246,208,.45)";
        c.fillRect(X0 - 8 - j * 6, y - 1, 3, 2);
      }
    }
  }

  function terminal(c, x, w, first, last) {
    var y = Y.termTop, h = Y.termBot - Y.termTop;
    if (!first) { c.fillStyle = "#F4F1EC"; c.fillRect(x - 6, y + 14, 12, 12); c.fillStyle = "#8E7D72"; c.fillRect(x - 6, y + 16, 12, 8); }
    c.fillStyle = "#F4F1EC"; c.fillRect(x + 3, y, w - 6, h);
    c.fillStyle = "#8E7D72"; c.fillRect(x + 5, y + 2, w - 10, h - 4);
    c.fillStyle = "#C3D3DE";
    for (var k = 0; k < 2; k++) for (var r = 0; r < 2; r++) c.fillRect(x + 12 + k * 52, y + 8 + r * 9, 40, 4);
    c.fillStyle = "#A69689"; c.fillRect(x + 10, y + h - 9, 6, 4); c.fillRect(x + w - 16, y + h - 9, 6, 4);
    var e = G.up.ext;
    if (e >= 1) { c.fillStyle = "#B9AA9E"; c.fillRect(x + 22, y + 27, w - 44, 7); }      // Shops
    if (e >= 2) { c.fillStyle = "#7E9A6E"; c.fillRect(x + 8, y + 27, 9, 8); c.fillRect(x + w - 17, y + 27, 9, 8); } // Dachgarten
    if (e >= 3 && first) { // Glaskuppel wie in der Vorlage
      c.fillStyle = "#AEBFCB"; c.beginPath(); c.arc(x + w / 2, Y.termBot + 2, 14, Math.PI, 0); c.fill();
      c.strokeStyle = "#F4F1EC"; c.lineWidth = 1.2; c.stroke();
      c.fillStyle = "#8FA3B2"; c.beginPath(); c.moveTo(x + w / 2 - 6, Y.termBot); c.lineTo(x + w / 2, Y.termBot - 9); c.lineTo(x + w / 2 + 6, Y.termBot); c.fill();
    }
  }

  function hangar(c) {
    var s = SITE.hangar;
    if (!G.up.hangar) { ghost(c, s.x, s.y, s.w, s.h, bname("hangar")); return; }
    c.fillStyle = "#4A4350"; c.fillRect(s.x + 10, Y.twy + 7, s.w - 20, s.y - Y.twy - 7);
    c.fillStyle = "#C9CCC5"; c.fillRect(s.x, s.y, s.w, s.h);
    c.fillStyle = "#B7BBB3";
    for (var k = 0; k < 6; k++) c.fillRect(s.x, s.y + 6 + k * 9, s.w, 2);
    if (G.up.hangar >= 2) { c.fillStyle = "#9EA39A"; c.fillRect(s.x + s.w / 2 - 0.5, s.y, 1, s.h); }
    c.fillStyle = "#2F3330"; c.fillRect(s.x + 6, s.y, s.w - 12, 3);
    if (R.hangarT > 0) {
      c.save(); c.translate(s.x + s.w / 2, s.y + s.h / 2 + 2); c.rotate(-Math.PI / 2);
      shape(c, TYPES[R.hangarType === "w" ? "n" : R.hangarType], "#F6F6F2", "#888");
      c.restore();
    }
    c.fillStyle = "rgba(30,32,30,.7)"; c.font = "700 7px " + FONT;
    c.fillText(lang === "de" ? "WARTUNG" : "MRO", s.x + s.w / 2, s.y + s.h - 6);
  }

  function fire(c) {
    var s = SITE.fire;
    if (!G.up.fire) { ghost(c, s.x, s.y, s.w, s.h, bname("fire")); return; }
    c.fillStyle = "#4A4350"; c.fillRect(s.x + 6, Y.twy + 7, s.w - 12, s.y - Y.twy - 7);
    c.fillStyle = "#B33A2E"; c.fillRect(s.x, s.y, s.w, s.h);
    c.fillStyle = "#E7E9E4"; c.fillRect(s.x, s.y + s.h - 10, s.w, 10);
    c.fillStyle = "#8E2A20";
    var doors = G.up.fire >= 2 ? 3 : 2;
    for (var k = 0; k < doors; k++) c.fillRect(s.x + 4 + k * 15, s.y + s.h - 9, 11, 8);
    for (var j = 0; j < doors; j++) { c.fillStyle = "#D8392B"; c.fillRect(s.x + 5 + j * 15, s.y - 9, 9, 7); }
    c.fillStyle = "#FFFFFF"; c.font = "700 6.5px " + FONT;
    c.fillText(lang === "de" ? "FEUERWEHR" : "FIRE", s.x + s.w / 2, s.y + 12);
  }

  function deck(c) {
    var s = SITE.deck;
    if (!G.up.deck) { ghost(c, s.x, s.y, s.w, s.h, bname("deck")); return; }
    c.fillStyle = "#A9825A"; c.fillRect(s.x, s.y, s.w, s.h);
    c.fillStyle = "#94704B";
    for (var k = 0; k < s.w; k += 6) c.fillRect(s.x + k, s.y, 1, s.h);
    c.strokeStyle = "#E7E9E4"; c.lineWidth = 1.2; c.strokeRect(s.x + 1, s.y + 1, s.w - 2, s.h - 2);
    var n = Math.round(R.visitors);
    for (var i = 0; i < n; i++) {
      var px = s.x + 6 + ((i * 37) % (s.w - 12)), py = s.y + 5 + ((i * 13) % 10);
      c.fillStyle = ["#2F6F8F", "#C2412D", "#D9A21B", "#151715"][i % 4];
      c.beginPath(); c.arc(px, py, 1.8, 0, Math.PI * 2); c.fill();
    }
    c.fillStyle = "rgba(30,32,30,.75)"; c.font = "700 6.5px " + FONT;
    c.fillText(lang === "de" ? "AUSSICHT" : "VIEWING", s.x + s.w / 2, s.y + s.h - 8);
  }

  function tower(c) {
    var s = SITE.tower;
    if (!G.up.tower) { ghost(c, s.x - 14, s.y - 14, 28, 28, ""); c.fillStyle = "rgba(74,67,80,.6)"; c.font = "600 7px " + FONT; c.fillText("Tower", s.x, s.y); return; }
    c.fillStyle = "rgba(0,0,0,.25)"; c.beginPath(); c.arc(s.x + 6, s.y + 8, 11, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#D7DAD3"; c.fillRect(s.x - 9, s.y - 9, 18, 18);
    c.fillStyle = "#24302E"; c.beginPath(); c.arc(s.x, s.y, 8, 0, Math.PI * 2); c.fill();
    c.strokeStyle = "#8FB3B8"; c.lineWidth = 1.5; c.beginPath(); c.arc(s.x, s.y, 8, 0, Math.PI * 2); c.stroke();
    c.fillStyle = "#E7E9E4"; c.beginPath(); c.arc(s.x, s.y, 3, 0, Math.PI * 2); c.fill();
    if (G.up.tower >= 2) {
      var a = R.clock * 2.5, rx = s.x + 20, ry = s.y - 18;
      c.fillStyle = "#C9CCC5"; c.beginPath(); c.arc(rx, ry, 4, 0, Math.PI * 2); c.fill();
      c.strokeStyle = "#F6F6F2"; c.lineWidth = 2;
      line(c, rx - Math.cos(a) * 7, ry - Math.sin(a) * 7, rx + Math.cos(a) * 7, ry + Math.sin(a) * 7);
    }
  }

  function roads(c, W) {
    var two = G.up.road >= 2;
    c.fillStyle = "#5A5360";
    if (two) {
      c.fillRect(0, Y.rd1 - 7, W, 14); c.fillRect(0, Y.rd2 - 7, W, 14);
      c.fillStyle = "#B5AEA2"; c.fillRect(0, Y.rd1 + 7, W, Y.rd2 - Y.rd1 - 14);
    } else c.fillRect(0, (Y.rd1 + Y.rd2) / 2 - 8, W, 16);
    c.strokeStyle = "rgba(255,255,255,.5)"; c.setLineDash([6, 6]); c.lineWidth = 0.8;
    if (two) { line(c, 0, Y.rd1, W, Y.rd1); line(c, 0, Y.rd2, W, Y.rd2); }
    else line(c, 0, (Y.rd1 + Y.rd2) / 2, W, (Y.rd1 + Y.rd2) / 2);
    c.setLineDash([]);
    // Bordstein am Terminal
    c.fillStyle = "#C9CCC5"; c.fillRect(LEFT, Y.termBot + 1, Math.max(G.term * 2, 1) * COLW, 3);
    R.cars.forEach(function (car) { c.fillStyle = car.c; c.fillRect(car.x - 4, car.y - 2, 8, 4); });
    if (two) {
      c.font = "700 6.5px " + FONT;
      [[t("dep"), Y.rd1], [t("arr"), Y.rd2]].forEach(function (l) {
        var w = c.measureText(l[0]).width + 10;
        c.fillStyle = "#2E7D5B"; c.fillRect(LEFT - w - 6, l[1] - 5, w, 10);
        c.fillStyle = "#FFFFFF"; c.fillText(l[0], LEFT - 6 - w / 2, l[1] + 0.5);
      });
    }
  }

  function lot(c, x, y, k) {
    c.fillStyle = "#6A6370"; c.fillRect(x, y, 68, 46);
    c.strokeStyle = "rgba(255,255,255,.55)"; c.lineWidth = 0.6;
    for (var r = 0; r < 2; r++) for (var i = 0; i <= 8; i++) line(c, x + 2 + i * 8, y + 3 + r * 22, x + 2 + i * 8, y + 19 + r * 22);
    var fill = Math.min(1, 0.25 + G.st.moves / 400);
    var cols = ["#E7E9E4", "#2B2E2B", "#9A540A", "#5C6E80", "#B33A2E", "#D9D4C5"];
    for (var r2 = 0; r2 < 2; r2++) for (var j = 0; j < 8; j++) {
      var hsh = Math.abs(Math.sin((k * 16 + r2 * 8 + j) * 12.9898) * 43758.5453) % 1;
      if (hsh < fill) { c.fillStyle = cols[Math.floor(hsh * 60) % 6]; c.fillRect(x + 4 + j * 8, y + 6 + r2 * 22, 4, 9); }
    }
    c.fillStyle = "#2F6F8F"; c.fillRect(x + 56, y - 6, 9, 9);
    c.fillStyle = "#FFFFFF"; c.font = "700 7px " + FONT; c.fillText("P", x + 60.5, y - 1.5);
  }

  function stop(c, x, y) {
    c.fillStyle = "#C9CCC5"; c.fillRect(x, y, 38, 20);
    c.fillStyle = "#8FB3B8"; c.fillRect(x + 6, y + 4, 26, 6);
    c.fillStyle = "#1F5C4F"; c.beginPath(); c.arc(x + 33, y + 15, 3.5, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#FFFFFF"; c.font = "700 4.5px " + FONT; c.fillText("H", x + 33, y + 15.3);
  }

  function plane(c, p) {
    var T = TYPES[p.type], alt = p.alt || 0, s = 1 + alt * 0.7, a = p.state === "hold" ? p.fade : 1;
    if (alt > 0.02) {
      c.save(); c.globalAlpha = 0.22 * a;
      c.translate(p.x + alt * 14, p.y + alt * 20); c.rotate(p.h);
      shape(c, T, "#000", null); c.restore();
    }
    c.save(); c.globalAlpha = a;
    c.translate(p.x, p.y); c.rotate(p.h); c.scale(s, s);
    shape(c, T, "#E6EBF0", p.al.col);
    c.restore();
  }

  function shape(c, T, body, tail) {
    var L = T.len, hl = L / 2, sp = T.span / 2, sw = T.sweep * L, fw = L * 0.085 + 1.2;
    c.fillStyle = body;
    c.strokeStyle = "#7D8794"; c.lineWidth = 0.7;
    c.beginPath();
    c.moveTo(L * 0.1, -fw * 0.6); c.lineTo(L * 0.1 - sw, -sp); c.lineTo(L * 0.1 - sw - L * 0.12, -sp); c.lineTo(-L * 0.08, -fw * 0.6);
    c.lineTo(-L * 0.08, fw * 0.6); c.lineTo(L * 0.1 - sw - L * 0.12, sp); c.lineTo(L * 0.1 - sw, sp); c.lineTo(L * 0.1, fw * 0.6);
    c.closePath(); c.fill(); if (tail) c.stroke();
    var ts = sp * 0.38;
    c.beginPath();
    c.moveTo(-hl * 0.72, 0); c.lineTo(-hl * 0.92, -ts); c.lineTo(-hl * 1.0, -ts); c.lineTo(-hl * 0.94, 0);
    c.lineTo(-hl * 1.0, ts); c.lineTo(-hl * 0.92, ts); c.closePath(); c.fill(); if (tail) c.stroke();
    c.beginPath(); c.ellipse(0, 0, hl, fw, 0, 0, Math.PI * 2); c.fill(); if (tail) c.stroke();
    if (tail) {
      c.fillStyle = tail;
      c.fillRect(-hl * 1.0, -0.9, hl * 0.42, 1.8);
      c.fillRect(hl * 0.55, -fw * 0.55, hl * 0.12, fw * 1.1);
    }
  }

  // ---------- Oberfläche ----------
  var CSS = ".fh-hud{display:grid;grid-template-columns:repeat(auto-fit,minmax(118px,1fr));gap:12px 16px;margin:22px 0 0;padding:16px 0;border-block:1px solid var(--line)}" +
    ".fh-hud div{display:flex;flex-direction:column;min-width:0}.fh-hud dt{font-size:.85rem;color:var(--soft)}" +
    ".fh-hud dd{margin:0;font:italic 500 1.6rem/1.2 var(--f-display);font-variant-numeric:tabular-nums;white-space:nowrap}" +
    ".fh-hud .warn dd{color:var(--accent)}" +
    ".fh-rank{margin:6px 0 0;color:var(--accent);font-weight:600}" +
    ".fh-stage{margin-top:20px;border-radius:4px;overflow-x:auto;overflow-y:hidden;background:#C3BCB0;-webkit-overflow-scrolling:touch}" +
    ".fh-stage canvas{display:block}" +
    ".fh-bar{display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px;margin-top:14px}" +
    ".fh-msg{margin:14px 0 0;min-height:1.6em;color:var(--soft)}.fh-msg.good{color:var(--accent);font-weight:600}" +
    ".fh-h{font:italic 500 2.2rem/1.05 var(--f-display);margin:36px 0 4px}" +
    ".fh-g{font:italic 600 1.3rem/1.2 var(--f-display);color:var(--accent);margin:24px 0 10px}" +
    ".fh-build{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px}" +
    ".fh-card{display:flex;flex-direction:column;gap:6px;text-align:left;font:inherit;color:var(--ink);background:transparent;border:1px solid var(--line);border-radius:14px;padding:14px 16px;cursor:pointer}" +
    ".fh-card:hover:not([aria-disabled=true]){border-color:var(--ink)}" +
    ".fh-card b{font-weight:600}.fh-card span{color:var(--soft);font-size:.92rem;line-height:1.45}" +
    ".fh-card em{font-style:normal;font-weight:600;margin-top:auto;padding-top:6px;font-variant-numeric:tabular-nums;color:var(--accent)}" +
    ".fh-card[aria-disabled=true]{cursor:default}.fh-card[aria-disabled=true] em{color:var(--soft)}" +
    ".fh-card.lock{opacity:.55}" +
    ".fh-reset[data-armed]{background:var(--accent);border-color:var(--accent);color:var(--bg)}";

  function injectCSS() {
    if (document.getElementById("fh-css")) return;
    var s = document.createElement("style"); s.id = "fh-css"; s.textContent = CSS;
    document.head.appendChild(s);
  }

  function html() {
    var groups = ["air", "term", "land", "ops"].map(function (g) {
      return '<h3 class="fh-g">' + TX.grp[g][lang] + '</h3><div class="fh-build">' +
        BUILD.filter(function (b) { return b.g === g; }).map(function (b) {
          return '<button type="button" class="fh-card" data-fh="' + b.id + '"><b>' + b.name[lang] + "</b><span>" + b.desc[lang] + '</span><em id="fh-c-' + b.id + '"></em></button>';
        }).join("") + "</div>";
    }).join("");
    function st(id) { return '<div id="fh-w-' + id + '"><dt>' + t(id) + '</dt><dd id="fh-' + id + '"></dd></div>'; }
    return '<h1 class="ptitle">' + t("title") + '</h1><p class="pintro">' + t("intro") + "</p>" +
      '<p class="fh-rank" id="fh-rank"></p>' +
      '<dl class="fh-hud">' + st("money") + st("rep") + st("moves") + st("pax") + st("hold") + "</dl>" +
      '<div class="fh-stage" id="fh-stage"><canvas id="fh-cv" role="img" aria-label="' + t("title") + '"></canvas></div>' +
      '<div class="fh-bar"><span class="lbl">' + t("speed") + '</span><div class="seg" role="group" aria-label="' + t("speed") + '">' +
      [1, 2, 4].map(function (v) { return '<button type="button" data-fhspeed="' + v + '" aria-pressed="false">' + v + "×</button>"; }).join("") +
      '</div><button type="button" class="navbtn" data-fhpause aria-pressed="false"></button></div>' +
      '<p class="fh-msg" id="fh-msg" aria-live="polite"></p>' +
      '<h2 class="fh-h">' + t("build") + "</h2>" + groups +
      '<section class="phow"><h2>' + t("howH") + "</h2><p>" + t("how1") + "</p><p>" + t("how2") + "</p><p>" + t("how3") + "</p>" +
      '<button type="button" class="navbtn fh-reset" data-fhreset>' + t("reset") + "</button></section>";
  }

  var lastSig = "";
  function set(id, v) { var e = document.getElementById(id); if (e && e.textContent !== v) e.textContent = v; }
  function updatePanel(force) {
    if (!V) return;
    set("fh-money", eur(G.money));
    set("fh-rep", Math.round(G.rep) + " %");
    set("fh-moves", G.st.moves.toLocaleString(loc()));
    set("fh-pax", G.st.pax.toLocaleString(loc()));
    set("fh-hold", String(R.holdQ.length));
    set("fh-rank", "SOY · " + rank());
    var hw = document.getElementById("fh-w-hold");
    if (hw) hw.classList.toggle("warn", R.holdQ.some(function (h) { return h.wait > DIVERT * 0.55; }));
    var sig = "";
    BUILD.forEach(function (b) { sig += b.id + b.lock() + b.cost() + (G.money >= b.cost()) + (b.extra ? b.extra() : "") + "|"; });
    if (sig === lastSig && !force) return;
    lastSig = sig;
    BUILD.forEach(function (b) {
      var btn = V.root.querySelector('[data-fh="' + b.id + '"]');
      if (!btn) return;
      var lock = b.lock(), cost = b.cost(), ok = !lock && G.money >= cost;
      btn.setAttribute("aria-disabled", String(!ok));
      btn.classList.toggle("lock", !!lock);
      var txt = lock ? lock : eur(cost);
      if (b.extra && lock !== t("done")) txt = b.extra() + " · " + txt;
      set("fh-c-" + b.id, txt);
    });
  }
  function updateBar() {
    Array.prototype.forEach.call(V.root.querySelectorAll("[data-fhspeed]"), function (b) {
      b.setAttribute("aria-pressed", String(Number(b.getAttribute("data-fhspeed")) === R.speed && !R.paused));
    });
    var p = V.root.querySelector("[data-fhpause]");
    p.textContent = R.paused ? t("play") : t("pause");
    p.setAttribute("aria-pressed", String(R.paused));
  }
  function msg(s, good) {
    if (!V) return;
    var e = document.getElementById("fh-msg");
    if (!e) return;
    e.textContent = s; e.classList.toggle("good", !!good);
    R.msgT = 6;
  }

  function onClick(e) {
    var b = e.target.closest("[data-fh]");
    if (b) { buy(b.getAttribute("data-fh")); return; }
    var s = e.target.closest("[data-fhspeed]");
    if (s) { R.speed = Number(s.getAttribute("data-fhspeed")); R.paused = false; updateBar(); return; }
    if (e.target.closest("[data-fhpause]")) { R.paused = !R.paused; updateBar(); return; }
    var r = e.target.closest("[data-fhreset]");
    if (r) {
      if (r.hasAttribute("data-armed")) {
        G = fresh(); R = runtime(); R.first = false; save();
        r.removeAttribute("data-armed"); r.textContent = t("reset");
        msg(t("welcome"), true); updatePanel(true); updateBar();
      } else {
        r.setAttribute("data-armed", ""); r.textContent = t("resetQ");
        setTimeout(function () { if (r.isConnected) { r.removeAttribute("data-armed"); r.textContent = t("reset"); } }, 4000);
      }
    }
  }

  var raf = 0, last = 0, hudT = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    var dt = Math.min(0.1, (now - (last || now)) / 1000); last = now;
    if (!R.paused) {
      var g = dt * R.speed;
      while (g > 0) { var d = Math.min(0.05, g); tick(d); g -= d; }
    }
    if (R.msgT > 0) { R.msgT -= dt; if (R.msgT <= 0) msg(""); }
    R.saveT += dt; if (R.saveT > 4) { R.saveT = 0; save(); }
    hudT += dt; if (hudT > 0.25) { hudT = 0; updatePanel(); }
    draw();
  }

  function mount(el, l) {
    unmount();
    lang = l === "en" ? "en" : "de";
    if (!G) G = load();
    if (!R) R = runtime();
    injectCSS();
    el.innerHTML = html();
    V = { root: el, stage: el.querySelector("#fh-stage"), cv: el.querySelector("#fh-cv") };
    V.ctx = V.cv.getContext("2d");
    el.addEventListener("click", onClick);
    lastSig = ""; updatePanel(true); updateBar();
    if (R.first) { R.first = false; msg(t("welcome"), true); }
    last = 0;
    raf = requestAnimationFrame(frame);
  }
  function unmount() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (V) { V.root.removeEventListener("click", onClick); V = null; }
    save();
  }
  window.addEventListener("pagehide", save);

  // Nur zum Testen: Flughafen._debug
  window.Flughafen = { mount: mount, unmount: unmount, _debug: function () { return { G: G, R: R, tick: tick, buy: buy }; } };
})();
