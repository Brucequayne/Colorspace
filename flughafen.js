/* Flughafen 0.3 – ein Aufbauspiel für Soy and Soul.
   Einbindung: flughafen.js per script-Tag laden, dann Flughafen.mount(element, "de" | "en")
   und Flughafen.unmount() beim Verlassen der Seite. Der Spielstand liegt nur lokal im Browser. */
(function () {
  "use strict";

  var KEY = "flughafen-v3";
  var VERSION = "0.3";
  var RW_W = 22, TW_W = 14, RD_W = 16;
  var DIVERT = 60;
  var SIZE = { stand: [64, 66], term: [124, 46], tower: [30, 30], fire: [52, 38], hangar: [84, 62], deck: [72, 38], park: [72, 48], bus: [44, 22] };
  var DEG = Math.PI / 180, STEP = 15 * DEG;

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
    welcome: L2("Leg los: Wähle rechts „Piste“ und setz sie auf die Wiese.", "Get started: pick “Runway” on the right and place it on the field."),
    maint: L2("Wartung", "Maintenance"),
    unload: L2("Aussteigen", "Unloading"), board: L2("Einsteigen", "Boarding"), clean: L2("Reinigung", "Cleaning"),
    inTerm: L2("{n} Fluggäste", "{n} passengers"), waiting: L2("{n} wartend", "{n} waiting"),
    termDep: L2("Warten auf den Abflug: {n}", "Waiting to depart: {n}"), termArr: L2("Angekommen, auf dem Weg nach draußen: {n}", "Arrived, heading out: {n}"),
    stopInfo: L2("Wartende Fahrgäste: {n} · Bus fasst 50", "Waiting riders: {n} · bus holds 50"),
    lotInfo: L2("Belegt: {a} von {b} Plätzen", "Occupied: {a} of {b} spaces"), lotFull: L2("voll", "full"),
    noRoadTerm: L2("Ohne Straße am Terminal kommen die Fluggäste zu Fuß, Busse und Autos fahren erst mit Straße.", "Without a road at the terminal, passengers walk in; buses and cars need a road."),
    howH: L2("So funktioniert’s", "How it works"),
    how1: L2("Bauen: Werkzeug rechts wählen, mit der Maus platzieren, Klick zum Bauen. Q und E drehen stufenlos, mit gedrückter Umschalttaste in 15°-Schritten. Rollwege und Straßen zieht man Stück für Stück mit Klicks, Rechtsklick oder Esc beendet. Module rasten an passenden Kanten ein, Parkpositionen richten sich zum Rollweg aus.",
              "Building: pick a tool on the right, move it with the mouse, click to build. Q and E rotate freely, with Shift in 15° steps. Taxiways and roads are drawn piece by piece with clicks; right-click or Esc ends the line. Modules snap to matching edges, and stands turn to face the taxiway."),
    how2: L2("Karte: Ziehen auf freier Fläche oder mit rechter Maustaste verschiebt, das Mausrad zoomt, WASD und Pfeiltasten gehen auch. Ein Klick auf etwas Gebautes zeigt Infos, Ausbaustufen und „Abreißen“.",
              "Map: drag on open ground or with the right mouse button to pan, the mouse wheel zooms, WASD and arrow keys work too. Click anything you built for details, upgrades and “Demolish”."),
    how5: L2("Fluggäste: Ein Flugzeug fasst 120 bis 400 Personen, ein Bus 50, ein Auto 1 bis 3. Die Einnahmen eines Fluges richten sich danach, wie voll er ist. Ankommende steigen ins Terminal aus und fahren mit Bus oder Auto weiter, Abfliegende kommen genauso an. Fehlen beim Einsteigen Fluggäste im Terminal, startet der Flieger halbleer.",
              "Passengers: an aircraft carries 120 to 400 people, a bus 50, a car 1 to 3. A flight's revenue follows how full it is. Arrivals step into the terminal and leave by bus or car, departing passengers come in the same way. If passengers are missing at boarding, the aircraft leaves half empty."),
    how3: L2("Flugzeuge landen in Pfeilrichtung und verlassen die Piste über deine Rollwege. Eine Parkposition wird nur angeflogen, wenn ein Rollweg direkt davor liegt und mit der Piste verbunden ist. Steht sie mit dem Rücken an einem Terminal, kann sie ein Gate bekommen.",
              "Aircraft land in the direction of the arrow and leave the runway via your taxiways. A stand is only used when a taxiway runs right in front of it and connects to the runway. If its back touches a terminal, it can get a gate."),
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
    hint: {
      none: L2("Ziehen verschiebt die Karte, Mausrad zoomt.", "Drag to pan, mouse wheel to zoom."),
      rect: L2("Klick baut · Q/E drehen, Umschalt für 15° · Esc beendet", "Click to build · Q/E rotate, Shift for 15° · Esc to stop"),
      line0: L2("Klick setzt den Anfang · rastet an Piste und Rollwegen ein", "Click to start · snaps to runway and taxiways"),
      line1: L2("Klick setzt das Ende und zieht weiter · Umschalt für 15° · Rechtsklick oder Esc beendet", "Click to end and continue · Shift for 15° · right-click or Esc to stop"),
      road0: L2("Klick setzt den Anfang der Straße", "Click to start the road"),
      apply: L2("Klick auf eine Parkposition · Esc beendet", "Click a stand · Esc to stop")
    }
  };

  var TYPES = {
    p: { cap: 120, rev: 2000, turn: 18, len: 17, span: 22, sweep: 0.01, roll: 90 },
    n: { cap: 190, rev: 3500, turn: 26, len: 25, span: 25, sweep: 0.13, roll: 140 },
    w: { cap: 400, rev: 5000, turn: 40, len: 36, span: 37, sweep: 0.16, roll: 200, heavy: true }
  };
  var AIRLINES = [ // erfundene Airlines
    { c: "SOY", col: "#B5651D" }, { c: "WOK", col: "#C2412D" }, { c: "TFU", col: "#2F6F8F" },
    { c: "MSO", col: "#4F7A35" }, { c: "UMA", col: "#7A4E9A" }, { c: "KOI", col: "#D9A21B" }, { c: "NRI", col: "#1F5C4F" }
  ];

  // ---------- Zustand ----------
  var G = null, R = null, V = null, NET = null, lang = "de";

  function fresh() {
    return { v: 3, eco: 1, money: 25000000, rep: 50, nid: 1, mods: [],
      up: { rwy: 0, ils: 0, gh: 0, ext: 0 }, st: { moves: 0, pax: 0, earned: 0, div: 0 } };
  }
  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY) || "null");
      if (s && s.v === 3 && s.mods) {
        if (!s.eco) { // Spielstand aus 0.2: auf die neuen Zahlen umstellen
          s.eco = 1; s.money = Math.max(0, s.money - 8000) + 25000000;
          G = s; s.mods.forEach(function (m) { m.paid = priceOf(m); });
        }
        return s;
      }
    } catch (e) {}
    return fresh();
  }
  function save() { try { if (G) localStorage.setItem(KEY, JSON.stringify(G)); } catch (e) {} }
  function runtime() {
    return { planes: [], holdQ: [], q: {}, occ: {}, rw: {}, spawnT: 4, fx: [], veh: [], spots: {}, busT: {}, stopW: {}, tDep: 0, tArrBus: 0, tArrCar: 0, tArrWalk: 0, walkIn: 0, depBus: 0, depCarQ: [], pickRes: 0, accW: 0, accS: 0, spawnCar: 0, speed: 1, paused: false,
      id: 0, saveT: 0, msgT: 0, first: true, hangarT: 0, hangarType: "n", visitors: 0, clock: 0 };
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
  function one(type) { return mods(type)[0] || null; }
  function byId(id) { for (var i = 0; i < G.mods.length; i++) if (G.mods[i].id === id) return G.mods[i]; return null; }
  function rwLen() { return G.up.rwy ? 600 : 440; }

  // ---------- Geometrie ----------
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function size(m) { return m.t === "runway" ? [rwLen(), RW_W] : SIZE[m.t]; }
  function axes(a) { return { ux: Math.cos(a), uy: Math.sin(a), vx: -Math.sin(a), vy: Math.cos(a) }; }
  // Rechteck: Mitte, Winkel, halbe Breite/Tiefe
  function foot(m) {
    if (m.t === "taxi" || m.t === "road") {
      var l = Math.hypot(m.x2 - m.x1, m.y2 - m.y1);
      return { x: (m.x1 + m.x2) / 2, y: (m.y1 + m.y2) / 2, a: Math.atan2(m.y2 - m.y1, m.x2 - m.x1), hw: l / 2 + (m.t === "taxi" ? TW_W : RD_W) / 2, hh: (m.t === "taxi" ? TW_W : RD_W) / 2 };
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
    var L = rwLen(), A = axes(m.a);
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
    function edge(a, b, type) {
      if (a === b) return;
      var e = { a: a, b: b, len: dist(N[a], N[b]), type: type };
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
    mods("stand").forEach(function (m) {
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
      s.pts.forEach(function (p) { var n = node(p.x, p.y); if (prev >= 0) edge(prev, n, s.m.t === "runway" ? "rwy" : "taxi"); prev = n; });
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
    // Erreichbarkeit von der Landebahn aus
    var reach = {};
    if (rws[0]) {
      var st = rws[0]._junc.map(function (j) { return j.n; });
      st.forEach(function (n) { reach[n] = 1; });
      while (st.length) {
        var n = st.pop();
        adj[n].forEach(function (e) { if (e.type === "rwy") return; var o = e.a === n ? e.b : e.a; if (!reach[o]) { reach[o] = 1; st.push(o); } });
      }
    }
    mods("stand").forEach(function (m) {
      m._conn = m._pn !== null && m._pn !== undefined && !!reach[m._pn];
      var d = standDirs(m), h = SIZE.stand[1] / 2 + 6, P = { x: m.x + d.bx * h, y: m.y + d.by * h };
      m._term = mods("term").some(function (tm) { return inFoot(foot(tm), P, 1); });
    });
    var roads = mods("road");
    function onRoad(m) { var f = foot(m); return roads.some(function (r) { return segFootDist({ x: r.x1, y: r.y1 }, { x: r.x2, y: r.y2 }, f) < 20; }); }
    ["term", "park", "bus"].forEach(function (k) { mods(k).forEach(function (m) { m._road = onRoad(m); }); });
    NET = { N: N, E: E, adj: adj };
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
      desc: L2("Start- und Landebahn, frei drehbar. Der Pfeil zeigt die Landerichtung.", "Runway, freely rotatable. The arrow shows the landing direction."),
      cost: function () { return mods("runway").length ? 40000000 : 8000000; },
      lock: function () {
        var n = mods("runway").length;
        if (n >= 2) return t("maxed");
        if (n === 1 && stats().conn < 6) return t("need6");
        if (n === 1 && stats().tower < 2) return t("needTower2");
        return "";
      } },
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
      cost: function () { return 7500000; },
      lock: function () {
        if (!mods("runway").length) return t("needRw");
        return mods("term").length >= 2 && !stats().termRoad ? t("needRoad") : "";
      } },
    { id: "heavy", g: "term", tool: "apply", name: L2("Großraum-Position", "Widebody stand"),
      desc: L2("Macht eine Position fit für Langstreckenjets, die am meisten einbringen.", "Makes a stand fit for widebody jets, which earn the most."),
      cost: function () { return 850000; },
      lock: function () { if (!G.up.rwy) return t("needExt"); return stats().fire < 2 ? t("needFire2") : ""; } },
    { id: "road", g: "land", tool: "line", name: L2("Straße", "Road"),
      desc: L2("Vorfahrt für Abflug und Ankunft. Am Terminal bringt sie mehr Passagiere.", "Forecourt for departures and arrivals. At the terminal it brings more passengers."),
      cost: function () { return 8000; }, unit: 800, lock: function () { return mods("runway").length ? "" : t("needRw"); } },
    { id: "park", g: "land", tool: "rect", name: L2("Parkplatz", "Car park"),
      desc: L2("16 Stellplätze an einer Straße. Jedes abfahrende Auto zahlt 15 bis 50 €.", "16 spaces on a road. Every car that leaves pays €15 to €50."),
      cost: function () { return 120000; },
      lock: function () { if (!mods("runway").length) return t("needRw"); return mods("park").length >= 6 ? t("maxed") : ""; } },
    { id: "bus", g: "land", tool: "rect", name: L2("Bushaltestelle", "Bus stop"),
      desc: L2("An einer Straße: Busse mit 50 Plätzen bringen und holen Fluggäste.", "On a road: buses with 50 seats bring and collect passengers."),
      cost: function () { return 60000; },
      lock: function () { if (!mods("runway").length) return t("needRw"); return mods("bus").length >= 3 ? t("maxed") : ""; } },
    { id: "tower", g: "ops", tool: "rect", name: L2("Tower", "Control tower"),
      desc: L2("Kürzere Abstände zwischen Landungen und Starts. Stufe 2 mit Radar.", "Shorter spacing between landings and take-offs. Level 2 adds radar."),
      cost: function () { return 2500000; }, lock: function () { if (!mods("runway").length) return t("needRw"); return one("tower") ? t("once") : ""; } },
    { id: "fire", g: "ops", tool: "rect", name: L2("Feuerwehr", "Fire station"),
      desc: L2("Pflicht ab der fünften Position. Stufe 2 erlaubt Langstreckenjets.", "Required from the fifth stand. Level 2 allows widebodies."),
      cost: function () { return 1250000; }, lock: function () { if (!mods("runway").length) return t("needRw"); return one("fire") ? t("once") : ""; } },
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
    { id: "rwy", name: L2("Pistenverlängerung", "Runway extension"),
      desc: L2("Alle Pisten werden länger, Langstreckenjets können landen.", "All runways get longer so widebodies can land."),
      cost: function () { return 12000000; }, lock: function () { if (G.up.rwy) return t("done"); return mods("runway").length ? "" : t("needRw"); },
      apply: function () { G.up.rwy = 1; } },
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
  var LVL = { tower: [4000000], fire: [2000000], hangar: [9000000] };
  // Neupreis eines Bauteils (für die Umstellung alter Spielstände)
  function priceOf(m) {
    var len = m.x2 !== undefined ? Math.hypot(m.x2 - m.x1, m.y2 - m.y1) : 0;
    var base = { runway: 8000000, taxi: Math.max(25000, len * 2500), road: Math.max(8000, len * 800), stand: 325000, term: 7500000,
      park: 120000, bus: 60000, tower: 2500000, fire: 1250000, hangar: 6000000, deck: 400000 }[m.t] || 0;
    if (m.gate) base += 325000; if (m.heavy) base += 850000;
    if (m.lvl >= 2 && LVL[m.t]) base += LVL[m.t][0];
    return base;
  }
  function bdef(id) { return BUILD.filter(function (b) { return b.id === id; })[0]; }

  function addMod(m, cost) {
    m.id = G.nid++; m.paid = cost;
    if (m.t === "tower" || m.t === "fire" || m.t === "hangar") m.lvl = 1;
    G.mods.push(m);
    G.money -= cost;
    rebuild(); save();
    return m;
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
    if (type === "park" || type === "bus" || type === "term") { // bündig an die Straße
      mods("road").forEach(function (m) {
        var a = { x: m.x1, y: m.y1 }, b = { x: m.x2, y: m.y2 }, pr = segProj(cur, a, b);
        if (pr.d > 80) return;
        var l = dist(a, b), dx = (b.x - a.x) / l, dy = (b.y - a.y) / l;
        var side = (cx - a.x) * -dy + (cy - a.y) * dx >= 0 ? 1 : -1;
        var off = RD_W / 2 + 3 + sz[1] / 2;
        var px = pr.q.x - dy * side * off, py = pr.q.y + dx * side * off;
        var d = Math.hypot(px - cx, py - cy);
        if (d < 60) cand(px, py, Math.atan2(dy, dx), d * 0.95);
      });
    }
    return best;
  }

  function rectValid(type, x, y, a) {
    var s = SIZE[type], f = { x: x, y: y, a: a, hw: s[0] / 2, hh: s[1] / 2 };
    return !G.mods.some(function (m) { return overlap(f, foot(m), 1.5); });
  }
  function runwayValid(x, y, a) {
    var f = { x: x, y: y, a: a, hw: rwLen() / 2, hh: RW_W / 2 + 6 };
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
  function pickType() {
    var s = stats();
    var w = { p: Math.max(0.15, 1.2 - 0.12 * s.conn), n: 0.3 + 0.15 * s.conn, w: (G.up.rwy && s.heavy) ? 0.1 + 0.14 * s.heavy : 0 };
    var sum = w.p + w.n + w.w, r = Math.random() * sum;
    return r < w.p ? "p" : r < w.p + w.n ? "n" : "w";
  }
  function spawn() {
    if (R.holdQ.length >= 6 || !stats().conn) return;
    var a = AIRLINES[Math.floor(Math.random() * AIRLINES.length)];
    var p = { id: ++R.id, type: pickType(), al: a, cs: a.c + (100 + Math.floor(Math.random() * 900)),
      x: 0, y: 0, h: 0, alt: 0.8, ang: Math.random() * 6, wait: 0, fade: 0, state: "hold", path: null, pi: 0 };
    var cap = TYPES[p.type].cap;
    p.cap = cap; p.paxIn = Math.round(cap * loadF()); p.book = Math.round(cap * loadF());
    bookTrips(p.book);
    R.planes.push(p); R.holdQ.push(p);
  }
  function rwState(m) { if (!R.rw[m.id]) R.rw[m.id] = { busy: null, next: null, cool: 0, last: "" }; return R.rw[m.id]; }
  function rwFree(r) { return !r.busy && r.cool <= 0; }
  function rwSoon(r) {
    if (rwFree(r)) return true;
    if (!r.busy || r.next) return false;
    var b = r.busy;
    return (b.state === "dep" && b.pi >= 2) || (b.state === "arr" && b.pi >= 3);
  }
  function take(r, p, kind) { if (r.busy) r.next = p; else r.busy = p; r.last = kind; }
  function release(r) { if (r.next) { r.busy = r.next; r.next = null; r.cool = 0; } else { r.busy = null; r.cool = sep(); } }
  function sep() { return [3, 3, 2, 1.2][stats().tower + 1] - (G.up.ils ? 0.4 : 0); }

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
    R.occ[st.id] = p; p.st = st.id; p.state = "arr";
    var e = rwEnds(rw), f = G.up.ils ? 1.25 : 1, pa = plan.pa;
    var J = { x: e.A.x + e.dx * plan.j.d, y: e.A.y + e.dy * plan.j.d };
    var n1 = pa[1] || pa[0];
    var ex = Math.hypot(n1.x - J.x, n1.y - J.y) || 1;
    var cosA = ((n1.x - J.x) * e.dx + (n1.y - J.y) * e.dy) / ex;
    var vEx = cosA > 0.5 ? 30 : 16;
    var cut = Math.min(20, ex);
    var pts = [
      { x: p.x, y: p.y, a: 0.8, s: 100 * f },
      { x: e.A.x - e.dx * 110, y: e.A.y - e.dy * 110, a: 0.45, s: 95 * f },
      { x: e.A.x + e.dx * 40, y: e.A.y + e.dy * 40, a: 0, s: 85 * f, ev: touchdown },
      { x: J.x, y: J.y, s: vEx },
      { x: J.x + (n1.x - J.x) / ex * cut, y: J.y + (n1.y - J.y) / ex * cut, s: vEx * 0.8, ev: function () { release(r); } }
    ];
    for (var i = 1; i < pa.length; i++) pts.push({ x: pa[i].x, y: pa[i].y, s: i === pa.length - 1 ? 8 : i === pa.length - 2 ? 14 : 40 });
    p.path = pts; p.pi = 0; p.onEnd = park;
  }
  function touchdown(p) { earn(TYPES[p.type].rev * 0.4 * p.paxIn / p.cap, p.x, p.y); movement(); }
  function movement() {
    G.st.moves++;
    if (one("deck")) {
      G.rep = Math.min(100, G.rep + 0.05);
      var v = 150 * (1 + 0.2 * G.up.ext); G.money += v; G.st.earned += v;
      R.visitors = Math.min(24, R.visitors + 2);
    }
  }
  function park(p) {
    var st = byId(p.st);
    p.state = "park"; p.phase = "unload"; p.on = p.paxIn; p.boarded = 0; p.acc = 0; p.starve = 0;
    if (st) { var d = standDirs(st); p.h = Math.atan2(d.by, d.bx); }
  }
  // Fluggäste pro Sekunde durch die Türen: Gate schneller als Bus, große Flieger haben mehr Türen
  function paxRate(p) {
    var st = byId(p.st), gate = st && st.gate && st._term;
    return (gate ? 14 : 8) * (1 + (p.cap - 120) / 280) * (1 + 0.15 * G.up.gh);
  }
  function turnaround(p, dt) {
    var hasTerm = mods("term").length > 0;
    if (p.phase === "unload") {
      p.acc += paxRate(p) * dt;
      var k = Math.min(p.on, Math.floor(p.acc)); p.acc -= k; p.on -= k;
      if (k) { G.st.pax += k; arrivePax(k); }
      if (p.on <= 0) { p.phase = "clean"; p.t = 3 + p.cap / 80; p.acc = 0; }
    } else if (p.phase === "clean") {
      p.t -= dt; if (p.t <= 0) p.phase = "board";
    } else if (p.phase === "board") {
      p.acc += paxRate(p) * dt;
      var want = Math.min(p.book - p.boarded, Math.floor(p.acc));
      var have = hasTerm ? Math.min(want, R.tDep) : want;
      p.acc -= want; p.boarded += have; G.st.pax += have;
      if (hasTerm) R.tDep -= have;
      if (have === 0 && want > 0) p.starve += dt; else if (have > 0) p.starve = 0;
      if (p.boarded >= p.book || p.starve > 8) depart(p);
    }
  }
  function loadF() { return Math.min(1, 0.5 + Math.random() * 0.4 + G.rep / 1000); }

  // ---------- Landseite: Terminal, Busse, Autos ----------
  function termCenter() { var ts = mods("term"); if (!ts.length) return null; var x = 0, y = 0; ts.forEach(function (m) { x += m.x; y += m.y; }); return { x: x / ts.length, y: y / ts.length }; }
  function landMode() { if (!mods("term").length) return "none"; return mods("term").some(function (m) { return m._road; }) ? "road" : "walk"; }
  function busShare() { var n = mods("bus").filter(function (m) { return m._road; }).length; return n ? Math.min(0.65, 0.25 + 0.15 * n) : 0; }
  function termPax() { return R.tDep + R.tArrBus + R.tArrCar + R.tArrWalk; }
  function bookTrips(n) {
    var mode = landMode();
    if (mode === "none") return;
    if (mode === "walk") { R.walkIn += n; return; }
    var b = Math.round(n * busShare()); R.depBus += b; n -= b;
    while (n > 0) { var g = Math.min(n, 1 + Math.floor(Math.random() * 3)); n -= g; R.depCarQ.push({ n: g, t: Math.random() * 30 }); }
  }
  function arrivePax(n) {
    var mode = landMode();
    if (mode === "none") return;
    if (mode === "walk") { R.tArrWalk += n; return; }
    var b = Math.round(n * busShare()); R.tArrBus += b; R.tArrCar += n - b;
  }
  function nearRoad(p) {
    var best = null;
    mods("road").forEach(function (r) { var a = { x: r.x1, y: r.y1 }, b = { x: r.x2, y: r.y2 }, pr = segProj(p, a, b); if (!best || pr.d < best.d) best = { a: a, b: b, q: pr.q, d: pr.d }; });
    return best;
  }
  function along(nr, end, d) { var l = dist(nr.q, end); if (l < 1) return { x: end.x, y: end.y }; var k = Math.min(l, d) / l; return { x: nr.q.x + (end.x - nr.q.x) * k, y: nr.q.y + (end.y - nr.q.y) * k }; }
  function roadEnds(nr) { var e = Math.random() < 0.5 ? [nr.a, nr.b] : [nr.b, nr.a]; return [along(nr, e[0], 170), along(nr, e[1], 170)]; }
  var LOT = 16;
  function spotPos(m, i) {
    var w = SIZE.park[0], h = SIZE.park[1], r = Math.floor(i / 8), j = i % 8, A = axes(m.a);
    var lx = -w / 2 + 8 + j * 8, ly = -h / 2 + 11 + r * 23;
    return { x: m.x + A.ux * lx + A.vx * ly, y: m.y + A.uy * lx + A.vy * ly };
  }
  function lotEntry(m, nr) {
    var dx = nr.q.x - m.x, dy = nr.q.y - m.y, l = Math.hypot(dx, dy) || 1, A = axes(m.a);
    var dn = Math.abs(dx * A.vx + dy * A.vy) / l, du = Math.abs(dx * A.ux + dy * A.uy) / l;
    var r = du > dn ? SIZE.park[0] / 2 : SIZE.park[1] / 2;
    return { x: m.x + dx / l * (r + 2), y: m.y + dy / l * (r + 2) };
  }
  function lotSpots(m) { return R.spots[m.id] || (R.spots[m.id] = []); }
  function lotUsed(m) { return lotSpots(m).filter(function (x) { return x; }).length; }
  function freeLot() {
    var opts = [];
    mods("park").forEach(function (m) { if (!m._road) return; var sp = lotSpots(m); for (var i = 0; i < LOT; i++) if (!sp[i]) opts.push({ m: m, i: i }); });
    return opts.length ? opts[Math.floor(Math.random() * opts.length)] : null;
  }
  var CARS = ["#E7E9E4", "#2B2E2B", "#9A540A", "#5C6E80", "#B33A2E", "#D9D4C5", "#3F6B8F"];
  function vehicle(kind, pts, onEnd) {
    var v = { kind: kind, x: pts[0].x, y: pts[0].y, h: Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x), alt: 0, path: pts, pi: 0, onEnd: onEnd,
      c: CARS[Math.floor(Math.random() * CARS.length)], n: 0 };
    R.veh.push(v); return v;
  }
  function dropVeh(v) { var i = R.veh.indexOf(v); if (i >= 0) R.veh.splice(i, 1); }
  // Auto bringt (dep) oder holt (arr) n Fluggäste
  function carTrip(n, dir) {
    var lot = freeLot(), tc = termCenter();
    if (lot) {
      var m = lot.m, nr = nearRoad(m); if (!nr) return;
      var e = roadEnds(nr), E = lotEntry(m, nr), S = spotPos(m, lot.i);
      lotSpots(m)[lot.i] = true;
      var v = vehicle("car", [{ x: e[0].x, y: e[0].y, s: 55, r: 1 }, { x: nr.q.x, y: nr.q.y, s: 18, r: 1 }, { x: E.x, y: E.y, s: 9 }, { x: S.x, y: S.y, s: 5 }], function () {
        v.h = m.a + Math.PI / 2; v.state = "parked";
        if (dir === "dep") { R.tDep += n; v.stay = 70 + Math.random() * 90; }
        else { var k = Math.min(n, R.tArrCar); R.tArrCar -= k; R.pickRes -= n; v.n = k; v.stay = 5 + Math.random() * 6; }
      });
      v.lot = m.id; v.spot = lot.i; v.back = [S, E, nr.q, along(nr, Math.random() < 0.5 ? nr.a : nr.b, 170)];
    } else {
      var nr2 = nearRoad(tc); if (!nr2) { if (dir === "dep") R.tDep += n; return; }
      var e2 = roadEnds(nr2);
      var v2 = vehicle("car", [{ x: e2[0].x, y: e2[0].y, s: 55, r: 1 }, { x: nr2.q.x, y: nr2.q.y, s: 10, r: 1 }], function () {
        v2.state = "curb"; v2.stay = 1.5;
        if (dir === "dep") R.tDep += n; else { var k = Math.min(n, R.tArrCar); R.tArrCar -= k; R.pickRes -= n; }
      });
      v2.out = e2[1];
    }
  }
  function leave(v) {
    v.state = "";
    if (v.lot) {
      var m = byId(v.lot);
      if (m) lotSpots(m)[v.spot] = false;
      earn(15 + Math.random() * 35, v.x, v.y);
      var b = v.back;
      v.path = [{ x: v.x, y: v.y, s: 5, back: 1 }, { x: b[1].x, y: b[1].y, s: 8, back: 1 }, { x: b[2].x, y: b[2].y, s: 16, r: 1 }, { x: b[3].x, y: b[3].y, s: 55, r: 1 }];
    } else v.path = [{ x: v.x, y: v.y, s: 8, r: 1 }, { x: v.out.x, y: v.out.y, s: 50, r: 1 }];
    v.pi = 0; v.onEnd = dropVeh;
  }
  function landside(dt) {
    var mode = landMode(), stops = mods("bus").filter(function (m) { return m._road; });
    if (mode !== "road") { // zu Fuß: ohne Straße gehen alle direkt rein und raus
      R.accW += 8 * dt;
      var k = Math.floor(R.accW); R.accW -= k;
      var a = Math.min(k, R.walkIn + R.depBus); R.walkIn = Math.max(0, R.walkIn - a); R.tDep += a;
      R.tArrWalk = Math.max(0, R.tArrWalk + R.tArrBus + R.tArrCar - k); R.tArrBus = R.tArrCar = 0;
      R.depCarQ.forEach(function (q) { R.walkIn += q.n; }); R.depCarQ = [];
    } else {
      if (R.walkIn) { R.tDep += R.walkIn; R.walkIn = 0; }
      if (R.tArrWalk) { R.tArrCar += R.tArrWalk; R.tArrWalk = 0; }
      // Abfliegende im Auto
      R.depCarQ.forEach(function (q) { q.t -= dt; });
      R.spawnCar -= dt;
      var cars = R.veh.filter(function (v) { return v.kind === "car" && v.path; }).length;
      var budget = 0;
      while (R.spawnCar <= 0) { R.spawnCar += 0.05; budget++; }
      for (var bq = 0; bq < budget && cars < 240; bq++, cars++) {
        var i = R.depCarQ.findIndex(function (q) { return q.t <= 0; });
        var wantArr = R.tArrCar - R.pickRes > 0;
        if (i >= 0 && (!wantArr || bq % 2 === 0)) { carTrip(R.depCarQ[i].n, "dep"); R.depCarQ.splice(i, 1); }
        else if (wantArr) { var n = Math.min(R.tArrCar - R.pickRes, 1 + Math.floor(Math.random() * 3)); R.pickRes += n; carTrip(n, "arr"); }
        else break;
      }
      // Ankommende gehen zur Haltestelle
      if (stops.length) {
        R.accS += 10 * dt;
        var w = Math.min(R.tArrBus, Math.floor(R.accS)); R.accS -= Math.floor(R.accS); R.tArrBus -= w;
        for (var j = 0; j < w; j++) { var s0 = stops.reduce(function (a, b) { return (R.stopW[a.id] || 0) <= (R.stopW[b.id] || 0) ? a : b; }); R.stopW[s0.id] = (R.stopW[s0.id] || 0) + 1; }
      } else { R.tArrCar += R.tArrBus; R.tArrBus = 0; while (R.depBus > 0) { var g0 = Math.min(R.depBus, 2); R.depCarQ.push({ n: g0, t: 0 }); R.depBus -= g0; } }
      // Busse
      stops.forEach(function (st) {
        if (R.busT[st.id] === undefined) R.busT[st.id] = 3 + Math.random() * 6;
        R.busT[st.id] -= dt;
        if (R.busT[st.id] > 0) return;
        var backlog = R.depBus / stops.length + (R.stopW[st.id] || 0);
        R.busT[st.id] = backlog > 100 ? 3 + Math.random() : backlog > 40 ? 7 + Math.random() * 2 : 16 + Math.random() * 6;
        var nr = nearRoad(st); if (!nr) return;
        var e = roadEnds(nr);
        var bus = vehicle("bus", [{ x: e[0].x, y: e[0].y, s: 45, r: 1 }, { x: nr.q.x, y: nr.q.y, s: 8, r: 1 }], function () {
          var drop = Math.min(50, R.depBus), wt = R.stopW[st.id] || 0, pick = Math.min(50, wt);
          R.depBus -= drop; R.tDep += drop; R.stopW[st.id] = wt - pick;
          bus.n = pick; bus.drop = drop; bus.state = "curb"; bus.stay = 3;
          if (drop || pick) R.fx.push({ x: st.x, y: st.y - 16, t: 0, txt: "+" + drop + " / −" + pick, col: "#CFE3F0" });
        });
        bus.out = e[1];
      });
    }
    R.veh.slice().forEach(function (v) {
      if (v.path) move(v, dt);
      else if (v.state === "parked" || v.state === "curb") { v.stay -= dt; if (v.stay <= 0) leave(v); }
    });
  }

  function depRunway(st) {
    var rws = mods("runway"), order = rws.length > 1 ? [rws[1], rws[0]] : rws;
    for (var i = 0; i < order.length; i++) {
      var rw = order[i], e = rwEnds(rw);
      var js = (rw._junc || []).slice().sort(function (a, b) { return a.d - b.d; });
      for (var k = 0; k < js.length; k++) {
        if (e.L - js[k].d < 200) continue;
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
    p.phase = ""; p.depLF = p.boarded / p.cap;
    earn(T.rev * 0.2 * p.depLF * (gate ? 1 : 0.6) * (1 + 0.15 * G.up.ext), p.x, p.y - 14);
    G.rep = Math.min(100, G.rep + (gate ? 1 : 0.4) + (s.fire >= 2 ? 0.2 : 0));
    var plan = st && depRunway(st), sid = p.st;
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
    pts.push({ x: l1.x, y: l1.y, s: 90, ev: function () {
      earn(TYPES[p.type].rev * 0.4 * p.depLF, p.x, p.y); movement();
      var h = one("hangar");
      if (h && Math.random() < 0.2 * h.lvl) { earn(TYPES[p.type].rev * 2, h.x, h.y, t("maint")); R.hangarT = 14; R.hangarType = p.type; }
    } });
    pts.push({ x: l2.x, y: l2.y, a: 0.25, s: 95, ev: function () { release(r); } });
    pts.push({ x: l3.x, y: l3.y, a: 1.4, s: 110 });
    p.path = pts; p.pi = 0;
    p.onEnd = function () { R.planes.splice(R.planes.indexOf(p), 1); };
  }

  function schedule() {
    var rws = mods("runway");
    if (!rws.length) return;
    var r0 = rwState(rws[0]);
    // Abflüge je Piste
    rws.forEach(function (rw) {
      var q = R.q[rw.id];
      if (!q || !q.length) return;
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
    // Ankünfte auf der ersten Piste
    if (!R.holdQ.length || !rwSoon(r0)) return;
    var q0 = R.q[rws[0].id];
    if (rws.length === 1 && r0.last === "a" && q0 && q0.length && !q0[0].path) return;
    for (var i = 0; i < R.holdQ.length; i++) {
      var h = R.holdQ[i], st = freeStand(h.type);
      if (!st) continue;
      var plan = arrPlan(h, st, rws[0]);
      if (!plan) continue;
      R.holdQ.splice(i, 1); clearArrival(h, st, plan, rws[0]); return;
    }
  }
  function arrivalPossible() { return R.holdQ.some(function (p) { return !!freeStand(p.type); }); }

  function earn(v, x, y, label) {
    v = Math.round(v); G.money += v; G.st.earned += v;
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
      if (mv >= d) { p.x = b.x; p.y = b.y; p.alt = b.a || 0; dt -= d / sp; p.pi++; if (b.ev) b.ev(p); }
      else { p.x += dx / d * mv; p.y += dy / d * mv; var g = 1 - (d - mv) / seg; p.alt = (a.a || 0) + ((b.a || 0) - (a.a || 0)) * g; dt = 0; }
    }
  }

  function tick(dt) {
    R.clock += dt;
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
      var e = rwEnds(rw0), ox = e.A.x - e.dx * 280, oy = e.A.y - e.dy * 280;
      R.holdQ.forEach(function (h, k) {
        h.ang += dt * 0.7;
        var a = h.ang + k * (Math.PI * 2 / 6);
        h.x = ox + Math.cos(a) * 70; h.y = oy + Math.sin(a) * 70;
        h.h = a + Math.PI / 2; h.alt = 0.8;
      });
    }
    schedule();
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
    c.fillStyle = COL.grass2;
    for (var gx = Math.floor(x0 / 80) * 80; gx < x1; gx += 80) c.fillRect(gx, y0, 40, y1 - y0);

    // 1. Befestigter Untergrund wächst mit allem, was gebaut wird
    c.lineCap = "round"; c.lineJoin = "round";
    G.mods.forEach(function (m) {
      if (m.t === "road") return;
      if (m.t === "taxi" || m.t === "runway") {
        var e = segEnds(m);
        c.strokeStyle = COL.paveEdge; c.lineWidth = (m.t === "runway" ? RW_W : TW_W) + 30; line(c, e[0].x, e[0].y, e[1].x, e[1].y);
      } else {
        var s = SIZE[m.t];
        inLocal(c, m, function () { c.fillStyle = COL.paveEdge; rr(c, -s[0] / 2 - 15, -s[1] / 2 - 15, s[0] + 30, s[1] + 30, 14); c.fill(); });
      }
    });
    G.mods.forEach(function (m) {
      if (m.t === "road") return;
      if (m.t === "taxi" || m.t === "runway") {
        var e = segEnds(m);
        c.strokeStyle = COL.pave; c.lineWidth = (m.t === "runway" ? RW_W : TW_W) + 22; line(c, e[0].x, e[0].y, e[1].x, e[1].y);
      } else {
        var s = SIZE[m.t];
        inLocal(c, m, function () { c.fillStyle = COL.pave; rr(c, -s[0] / 2 - 11, -s[1] / 2 - 11, s[0] + 22, s[1] + 22, 10); c.fill(); });
      }
    });
    // 2. Straßen
    mods("road").forEach(function (m) {
      c.strokeStyle = COL.road; c.lineWidth = RD_W; line(c, m.x1, m.y1, m.x2, m.y2);
    });
    c.lineCap = "butt";
    mods("road").forEach(function (m) {
      c.strokeStyle = "rgba(255,255,255,.5)"; c.lineWidth = 0.8; c.setLineDash([6, 6]); line(c, m.x1, m.y1, m.x2, m.y2); c.setLineDash([]);
    });
    // 3. Rollwege, dann Pisten
    c.lineCap = "round";
    mods("taxi").forEach(function (m) { c.strokeStyle = COL.asph; c.lineWidth = TW_W; line(c, m.x1, m.y1, m.x2, m.y2); });
    c.lineCap = "butt";
    mods("taxi").forEach(function (m) {
      var l = Math.hypot(m.x2 - m.x1, m.y2 - m.y1), a = Math.atan2(m.y2 - m.y1, m.x2 - m.x1);
      c.save(); c.translate(m.x1, m.y1); c.rotate(a);
      c.strokeStyle = "rgba(227,184,63,.75)"; c.lineWidth = 0.7;
      for (var s = 12; s < l - 8; s += 22) { c.beginPath(); c.arc(s, -TW_W / 2, 6, 0, Math.PI); c.stroke(); c.beginPath(); c.arc(s, TW_W / 2, 6, Math.PI, Math.PI * 2); c.stroke(); }
      c.strokeStyle = COL.line; c.lineWidth = 1; line(c, 0, 0, l, 0);
      c.restore();
    });
    mods("runway").forEach(function (m, i) { drawRunway(c, m, i); });
    // Zufahrtslinien zu den Positionen
    mods("stand").forEach(function (m) {
      if (!m._entry) return;
      c.strokeStyle = COL.line; c.lineWidth = 1; line(c, m._entry.x, m._entry.y, m.x, m.y);
    });
    // 4. Rechteck-Module
    G.mods.forEach(function (m) {
      if (m.t === "taxi" || m.t === "road" || m.t === "runway") return;
      inLocal(c, m, function () { drawMod(c, m); });
    });
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
      var nx = v.path && v.path[v.pi + 1], off = nx && nx.r ? 3.5 : 0;
      var x = v.x - Math.sin(v.h) * off, y = v.y + Math.cos(v.h) * off;
      c.save(); c.translate(x, y); c.rotate(v.h);
      if (v.kind === "bus") { c.fillStyle = "#E3B83F"; c.fillRect(-12, -3.5, 24, 7); c.fillStyle = "rgba(20,20,20,.55)"; c.fillRect(-9, -1.5, 18, 1.2); c.fillRect(-9, 0.6, 18, 1.2); }
      else { c.fillStyle = v.c; c.fillRect(-4, -2, 8, 4); c.fillStyle = "rgba(20,20,20,.35)"; c.fillRect(0.5, -1.6, 2, 3.2); }
      c.restore();
    });
    // 5. Flugzeuge
    R.planes.slice().sort(function (a, b) { return (a.alt || 0) - (b.alt || 0); }).forEach(function (p) { plane(c, p); });
    labels(c);
    // 6. Auswahl, Vorschau, Einnahmen
    if (V.sel) { var sm = byId(V.sel); if (sm) outline(c, foot(sm), "#2F6F8F", 2 / z); }
    drawGhost(c);
    c.font = "700 " + (11 / Math.max(0.7, z)) + "px " + FONT;
    R.fx.forEach(function (f) {
      var a = 1 - f.t / 1.8, y = f.y - 10 - f.t * 18;
      c.globalAlpha = a; c.lineWidth = 3; c.strokeStyle = "rgba(20,22,20,.8)"; c.strokeText(f.txt, f.x, y);
      c.fillStyle = f.col || "#FFE7B8"; c.fillText(f.txt, f.x, y); c.globalAlpha = 1;
    });
    if (!G.mods.length) {
      c.fillStyle = "rgba(60,70,50,.55)"; c.font = "italic 600 " + (26 / z) + "px 'Bodoni Moda',Georgia,serif";
      c.fillText(lang === "de" ? "Hier entsteht dein Flughafen" : "Your airport starts here", V.cam.x, V.cam.y);
    }
  }

  function pill(c, x, y, txt, bg, fg) {
    var z = V.zoom, fs = 10.5 / z;
    c.font = "600 " + fs + "px " + FONT;
    var w = c.measureText(txt).width + 10 / z, h = 15 / z;
    c.fillStyle = bg; rr(c, x - w / 2, y - h / 2, w, h, 4 / z); c.fill();
    c.fillStyle = fg || "#F4F1EC"; c.fillText(txt, x, y + 0.5 / z);
  }
  function labels(c) {
    var z = V.zoom, nf = function (n) { return Math.round(n).toLocaleString(loc()); };
    R.planes.forEach(function (p) {
      if (p.state !== "park") return;
      var y = p.y - (TYPES[p.type].len * 0.5 + 12 / z);
      if (p.phase === "unload") pill(c, p.x, y, t("unload") + " " + nf(p.on) + "/" + p.cap, "rgba(21,23,21,.82)");
      else if (p.phase === "clean") pill(c, p.x, y, t("clean"), "rgba(21,23,21,.65)");
      else if (p.phase === "board") pill(c, p.x, y, t("board") + " " + nf(p.boarded) + "/" + p.cap, "rgba(154,84,10,.9)");
    });
    var tc = termCenter();
    if (tc) pill(c, tc.x, tc.y, "Terminal · " + fmt(t("inTerm"), { n: nf(termPax()) }), "rgba(46,125,91,.92)");
    mods("bus").forEach(function (m) { if (m._road) pill(c, m.x, m.y - 20 / z, fmt(t("waiting"), { n: nf(R.stopW[m.id] || 0) }), "rgba(31,92,79,.9)"); });
    R.veh.forEach(function (v) { if (v.kind === "bus" && v.state === "curb") pill(c, v.x, v.y + 12 / z, (v.n || 0) + "/50", "rgba(227,184,63,.95)", "#151715"); });
    mods("park").forEach(function (m) {
      if (!m._road) return;
      var u = lotUsed(m);
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
    var L = rwLen(), ghost = m._ghost;
    inLocal(c, m, function () {
      c.fillStyle = COL.asph; c.fillRect(-L / 2, -RW_W / 2, L, RW_W);
      c.strokeStyle = "rgba(255,255,255,.75)"; c.lineWidth = 0.8;
      line(c, -L / 2 + 2, -9, L / 2 - 2, -9); line(c, -L / 2 + 2, 9, L / 2 - 2, 9);
      c.fillStyle = "rgba(255,255,255,.85)";
      for (var k = 0; k < 6; k++) { c.fillRect(-L / 2 + 4, -8 + k * 2.9, 12, 1.6); c.fillRect(L / 2 - 16, -8 + k * 2.9, 12, 1.6); }
      c.fillRect(-L / 2 + 70, -6, 16, 3); c.fillRect(-L / 2 + 70, 3, 16, 3);
      c.fillRect(L / 2 - 86, -6, 16, 3); c.fillRect(L / 2 - 86, 3, 16, 3);
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
    c.globalAlpha = 0.75;
    if (g.kind === "rect") {
      var m = { t: g.t, x: g.x, y: g.y, a: g.a, id: 0, lvl: 1, _conn: true, _road: true };
      inLocal(c, m, function () { var s = SIZE[g.t]; c.fillStyle = COL.pave; c.fillRect(-s[0] / 2 - 6, -s[1] / 2 - 6, s[0] + 12, s[1] + 12); drawMod(c, m); });
      c.globalAlpha = 1; outline(c, { x: g.x, y: g.y, a: g.a, hw: SIZE[g.t][0] / 2, hh: SIZE[g.t][1] / 2 }, g.ok ? "#2E7D5B" : "#C2412D", 2 / V.zoom);
    } else if (g.kind === "runway") {
      drawRunway(c, { x: g.x, y: g.y, a: g.a, _ghost: true }, 0);
      c.globalAlpha = 1; outline(c, { x: g.x, y: g.y, a: g.a, hw: rwLen() / 2, hh: RW_W / 2 }, g.ok ? "#2E7D5B" : "#C2412D", 2 / V.zoom);
    } else if (g.kind === "line") {
      if (g.a) {
        c.lineCap = "round"; c.strokeStyle = g.t === "taxi" ? COL.asph : COL.road; c.lineWidth = g.t === "taxi" ? TW_W : RD_W;
        line(c, g.a.x, g.a.y, g.b.x, g.b.y); c.lineCap = "butt";
        c.globalAlpha = 1; c.strokeStyle = g.ok ? "#2E7D5B" : "#C2412D"; c.lineWidth = 2 / V.zoom; line(c, g.a.x, g.a.y, g.b.x, g.b.y);
        c.fillStyle = "#151715"; c.font = "600 " + (11 / V.zoom) + "px " + FONT;
        c.fillText(eurS(g.cost), (g.a.x + g.b.x) / 2, (g.a.y + g.b.y) / 2 - 14 / V.zoom);
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
    c.save(); c.globalAlpha = a; c.translate(p.x, p.y); c.rotate(p.h); c.scale(s, s); shape(c, T, "#E6EBF0", p.al.col); c.restore();
  }
  function shape(c, T, body, tail) {
    var L = T.len, hl = L / 2, sp = T.span / 2, sw = T.sweep * L, fw = L * 0.085 + 1.2;
    c.fillStyle = body; c.strokeStyle = "#7D8794"; c.lineWidth = 0.7;
    c.beginPath();
    c.moveTo(L * 0.1, -fw * 0.6); c.lineTo(L * 0.1 - sw, -sp); c.lineTo(L * 0.1 - sw - L * 0.12, -sp); c.lineTo(-L * 0.08, -fw * 0.6);
    c.lineTo(-L * 0.08, fw * 0.6); c.lineTo(L * 0.1 - sw - L * 0.12, sp); c.lineTo(L * 0.1 - sw, sp); c.lineTo(L * 0.1, fw * 0.6);
    c.closePath(); c.fill(); if (tail) c.stroke();
    var ts = sp * 0.38;
    c.beginPath(); c.moveTo(-hl * 0.72, 0); c.lineTo(-hl * 0.92, -ts); c.lineTo(-hl, -ts); c.lineTo(-hl * 0.94, 0); c.lineTo(-hl, ts); c.lineTo(-hl * 0.92, ts); c.closePath(); c.fill(); if (tail) c.stroke();
    c.beginPath(); c.ellipse(0, 0, hl, fw, 0, 0, Math.PI * 2); c.fill(); if (tail) c.stroke();
    if (tail) { c.fillStyle = tail; c.fillRect(-hl, -0.9, hl * 0.42, 1.8); c.fillRect(hl * 0.55, -fw * 0.55, hl * 0.12, fw * 1.1); }
  }

  // ---------- Werkzeuge und Eingabe ----------
  function world(sx, sy) { return { x: (sx - V.W / 2) / V.zoom + V.cam.x, y: (sy - V.H / 2) / V.zoom + V.cam.y }; }
  function setTool(id) {
    var b = id && bdef(id);
    V.tool = b ? { id: id, kind: b.tool, start: null } : null;
    V.ghost = null;
    if (b) V.sel = null;
    updatePanel(true); updateSel(); updateHint();
  }
  function updateGhost() {
    var T = V.tool; if (!T || !V.mouse) { V.ghost = null; return; }
    var b = bdef(T.id), p = V.mouse, cost = b.cost(), lock = b.lock();
    if (T.kind === "rect") {
      var s = snapRect(T.id, p.x, p.y, V.ang);
      var g = s ? { x: s.x, y: s.y, a: s.a } : { x: p.x, y: p.y, a: V.ang };
      g.kind = "rect"; g.t = T.id; g.ok = !lock && G.money >= cost && rectValid(T.id, g.x, g.y, g.a); g.snapped = !!s;
      V.ghost = g;
    } else if (T.kind === "runway") {
      var a = V.ang;
      mods("runway").forEach(function (m) {
        var d = Math.atan2(Math.sin(a - m.a), Math.cos(a - m.a));
        if (Math.abs(d) < 8 * DEG) a = m.a; else if (Math.abs(Math.abs(d) - Math.PI) < 8 * DEG) a = m.a + Math.PI;
      });
      V.ghost = { kind: "runway", x: p.x, y: p.y, a: a, ok: !lock && G.money >= cost && runwayValid(p.x, p.y, a) };
    } else if (T.kind === "line") {
      var thr = 14 / V.zoom + 4;
      var sp = snapPoint(T.id, p, thr), q = sp ? { x: sp.x, y: sp.y } : { x: p.x, y: p.y };
      if (T.start && V.shift && !sp) {
        var ang = Math.round(Math.atan2(q.y - T.start.y, q.x - T.start.x) / STEP) * STEP, l = dist(q, T.start);
        q = { x: T.start.x + Math.cos(ang) * l, y: T.start.y + Math.sin(ang) * l };
      }
      if (!T.start) { V.ghost = { kind: "line", t: T.id, p: q, snap: !!sp }; return; }
      var c2 = Math.max(cost, Math.round(dist(T.start, q) / 10) * b.unit * 10);
      V.ghost = { kind: "line", t: T.id, a: T.start, b: q, snap: !!sp, cost: c2, ok: !lock && G.money >= c2 && lineValid(T.id, T.start, q) };
    } else V.ghost = null;
  }
  function act() {
    var T = V.tool, g = V.ghost, b = T && bdef(T.id);
    if (!T) return;
    if (T.kind === "apply") {
      var hit = pick(V.mouse);
      if (!hit || hit.t !== "stand") return;
      applyStand(T.id, hit); return;
    }
    if (!g) return;
    var lock = b.lock();
    if (lock) { msg(lock); return; }
    if (T.kind === "line" && !T.start) { T.start = { x: g.p.x, y: g.p.y }; updateHint(); return; }
    var cost = g.cost || b.cost();
    if (G.money < cost) { msg(t("poor")); return; }
    if (!g.ok) { msg(t("blocked")); return; }
    if (g.kind === "rect") addMod({ t: g.t, x: g.x, y: g.y, a: g.a }, cost);
    else if (g.kind === "runway") { addMod({ t: "runway", x: g.x, y: g.y, a: g.a }, cost); setTool(null); msg(lang === "de" ? "Piste gebaut. Jetzt Rollwege von der Piste wegziehen." : "Runway built. Now draw taxiways off the runway.", true); return; }
    else if (g.kind === "line") { addMod({ t: T.id, x1: g.a.x, y1: g.a.y, x2: g.b.x, y2: g.b.y }, cost); T.start = { x: g.b.x, y: g.b.y }; }
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
    if (inUse(m)) { msg(t("delBusy")); return; }
    G.mods.splice(G.mods.indexOf(m), 1);
    G.money += Math.round((m.paid || 0) / 2);
    if (m.t === "runway") { delete R.rw[m.id]; delete R.q[m.id]; }
    if (m.t === "park") { R.veh.filter(function (v) { return v.lot === m.id; }).forEach(dropVeh); delete R.spots[m.id]; }
    if (m.t === "bus") { R.tArrCar += R.stopW[m.id] || 0; delete R.stopW[m.id]; }
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
    updateGhost();
  }
  function onUp(e) {
    if (!V.drag) return;
    var d = V.drag; V.drag = null; V.cv.style.cursor = "";
    if (!d.moved && d.btn === 0 && !V.tool) { var m = pick(V.mouse); V.sel = m ? m.id : null; V.delArm = false; updateSel(); }
    if (!d.moved && d.btn === 2 && V.tool) { if (V.tool.kind === "line" && V.tool.start) { V.tool.start = null; updateGhost(); updateHint(); } else setTool(null); }
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
    if (down && k === "escape") {
      if (V.tool && V.tool.kind === "line" && V.tool.start) { V.tool.start = null; updateHint(); }
      else if (V.tool) setTool(null); else { V.sel = null; updateSel(); }
      updateGhost(); return;
    }
    var rot = V.tool && (V.tool.kind === "rect" || V.tool.kind === "runway");
    if ((k === "q" || k === "e") && rot) {
      e.preventDefault();
      if (down && e.shiftKey && !e.repeat) { V.ang = Math.round(V.ang / STEP) * STEP + (k === "q" ? -STEP : STEP); updateGhost(); return; }
      keys[k] = down && !e.shiftKey; return;
    }
    if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].indexOf(k) >= 0) {
      if (!V.stage.contains(document.activeElement) && document.activeElement !== V.stage) return;
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
  var CSS = ".fh-hud{display:grid;grid-template-columns:repeat(auto-fit,minmax(118px,1fr));gap:12px 16px;margin:22px 0 0;padding:16px 0;border-block:1px solid var(--line)}" +
    ".fh-hud div{display:flex;flex-direction:column;min-width:0}.fh-hud dt{font-size:.85rem;color:var(--soft)}" +
    ".fh-hud dd{margin:0;font:italic 500 1.6rem/1.2 var(--f-display);font-variant-numeric:tabular-nums;white-space:nowrap}" +
    ".fh-hud .warn dd{color:var(--accent)}" +
    ".fh-rank{margin:6px 0 0;color:var(--accent);font-weight:600}" +
    ".fh-ver{display:inline-block;margin-left:10px;padding:1px 8px;border:1px solid var(--line);border-radius:999px;font:600 .75rem var(--f-body);color:var(--soft);vertical-align:middle;letter-spacing:0}" +
    ".fh-main{display:grid;grid-template-columns:minmax(0,1fr);gap:16px;margin-top:20px}" +
    "@media (min-width:900px){.fh-main{grid-template-columns:minmax(0,1fr) 290px;align-items:start}}" +
    ".fh-stage{position:relative;height:clamp(460px,70vh,780px);border-radius:6px;overflow:hidden;background:#B9C2A2;outline:none;touch-action:none}" +
    ".fh-stage:focus-visible{box-shadow:0 0 0 2px var(--accent)}" +
    ".fh-stage canvas{display:block;width:100%;height:100%}" +
    ".fh-hint{position:absolute;left:10px;top:10px;right:10px;pointer-events:none;display:flex}" +
    ".fh-hint span{background:rgba(21,23,21,.78);color:#F4F1EC;font:500 .82rem/1.35 var(--f-body);padding:6px 10px;border-radius:8px;max-width:100%}" +
    ".fh-ctl{position:absolute;right:10px;bottom:10px;display:flex;gap:6px}" +
    ".fh-ctl button{width:36px;height:36px;border-radius:50%;border:0;background:rgba(21,23,21,.78);color:#F4F1EC;font:600 1.1rem/1 var(--f-body);cursor:pointer}" +
    ".fh-ctl button:hover{background:#151715}" +
    ".fh-side{display:flex;flex-direction:column;gap:14px;min-width:0}" +
    ".fh-sel{border:1px solid var(--line);border-radius:14px;padding:12px 14px;min-height:64px}" +
    ".fh-sel b{display:block;font-weight:600}.fh-sel p{margin:4px 0 0;color:var(--soft);font-size:.9rem;line-height:1.45}" +
    ".fh-sel .acts{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}" +
    ".fh-sel .acts button{font:600 .82rem var(--f-body);padding:6px 12px;border-radius:999px;border:1px solid var(--ink);background:transparent;color:var(--ink);cursor:pointer}" +
    ".fh-sel .acts button.warn{border-color:var(--accent);color:var(--accent)}" +
    ".fh-sel .acts button[aria-disabled=true]{opacity:.45;cursor:default}" +
    ".fh-g{font:italic 600 1.15rem/1.2 var(--f-display);color:var(--accent);margin:4px 0 6px}" +
    ".fh-tools{display:grid;grid-template-columns:1fr 1fr;gap:6px}" +
    ".fh-tool{display:flex;flex-direction:column;align-items:flex-start;gap:2px;text-align:left;font:inherit;color:var(--ink);background:transparent;border:1px solid var(--line);border-radius:10px;padding:8px 10px;cursor:pointer;min-width:0}" +
    ".fh-tool b{font-weight:600;font-size:.88rem;line-height:1.2}.fh-tool em{font-style:normal;font-size:.78rem;color:var(--accent);font-weight:600;font-variant-numeric:tabular-nums}" +
    ".fh-tool:hover:not([aria-disabled=true]){border-color:var(--ink)}" +
    ".fh-tool[aria-pressed=true]{background:var(--ink);color:var(--bg);border-color:var(--ink)}.fh-tool[aria-pressed=true] em{color:inherit}" +
    ".fh-tool[aria-disabled=true]{opacity:.5;cursor:default}.fh-tool[aria-disabled=true] em{color:var(--soft)}" +
    ".fh-bar{display:flex;flex-wrap:wrap;align-items:center;gap:10px 14px;margin-top:14px}" +
    ".fh-msg{margin:12px 0 0;min-height:1.6em;color:var(--soft)}.fh-msg.good{color:var(--accent);font-weight:600}" +
    ".fh-reset[data-armed]{background:var(--accent);border-color:var(--accent);color:var(--bg)}";

  function injectCSS() {
    var old = document.getElementById("fh-css"); if (old) old.remove();
    var s = document.createElement("style"); s.id = "fh-css"; s.textContent = CSS; document.head.appendChild(s);
  }
  function html() {
    function st(id) { return '<div id="fh-w-' + id + '"><dt>' + t(id) + '</dt><dd id="fh-' + id + '"></dd></div>'; }
    var groups = ["air", "term", "land", "ops"].map(function (g) {
      return '<div><h3 class="fh-g">' + TX.grp[g][lang] + '</h3><div class="fh-tools">' +
        BUILD.filter(function (b) { return b.g === g; }).map(function (b) {
          return '<button type="button" class="fh-tool" data-tool="' + b.id + '" aria-pressed="false" title="' + b.desc[lang] + '"><b>' + b.name[lang] + '</b><em id="fh-c-' + b.id + '"></em></button>';
        }).join("") + "</div></div>";
    }).join("");
    var ups = '<div><h3 class="fh-g">' + TX.grp.up[lang] + '</h3><div class="fh-tools">' + UPS.map(function (u) {
      return '<button type="button" class="fh-tool" data-up="' + u.id + '" title="' + u.desc[lang] + '"><b>' + u.name[lang] + '</b><em id="fh-u-' + u.id + '"></em></button>';
    }).join("") + "</div></div>";
    return '<h1 class="ptitle">' + t("title") + '<span class="fh-ver">v' + VERSION + '</span></h1><p class="pintro">' + t("intro") + "</p>" +
      '<p class="fh-rank" id="fh-rank"></p>' +
      '<dl class="fh-hud">' + st("money") + st("rep") + st("moves") + st("pax") + st("hold") + "</dl>" +
      '<div class="fh-main"><div>' +
      '<div class="fh-stage" id="fh-stage" tabindex="0" aria-label="' + t("title") + '"><canvas id="fh-cv"></canvas>' +
      '<div class="fh-hint"><span id="fh-hint"></span></div>' +
      '<div class="fh-ctl"><button type="button" class="rot" data-rot="-1" title="' + t("rotL") + '" aria-label="' + t("rotL") + '">⟲</button>' +
      '<button type="button" class="rot" data-rot="1" title="' + t("rotR") + '" aria-label="' + t("rotR") + '">⟳</button>' +
      '<button type="button" data-zoom="-1" title="' + t("zoomOut") + '" aria-label="' + t("zoomOut") + '">−</button>' +
      '<button type="button" data-zoom="1" title="' + t("zoomIn") + '" aria-label="' + t("zoomIn") + '">+</button></div></div>' +
      '<div class="fh-bar"><span class="lbl">' + t("speed") + '</span><div class="seg" role="group" aria-label="' + t("speed") + '">' +
      [1, 2, 4].map(function (v) { return '<button type="button" data-fhspeed="' + v + '" aria-pressed="false">' + v + "×</button>"; }).join("") +
      '</div><button type="button" class="navbtn" data-fhpause aria-pressed="false"></button></div>' +
      '<p class="fh-msg" id="fh-msg" aria-live="polite"></p></div>' +
      '<aside class="fh-side"><div class="fh-sel" id="fh-sel"></div>' + groups + ups + "</aside></div>" +
      '<section class="phow"><h2>' + t("howH") + "</h2><p>" + t("how1") + "</p><p>" + t("how2") + "</p><p>" + t("how3") + "</p><p>" + t("how5") + "</p><p>" + t("how4") + "</p>" +
      '<button type="button" class="navbtn fh-reset" data-fhreset>' + t("reset") + "</button></section>";
  }

  var lastSig = "";
  function set(id, v) { var e = document.getElementById(id); if (e && e.textContent !== v) e.textContent = v; }
  function updatePanel(force) {
    if (!V) return;
    var s = stats();
    set("fh-money", eurS(G.money)); set("fh-rep", Math.round(G.rep) + " %");
    set("fh-moves", G.st.moves.toLocaleString(loc())); set("fh-pax", G.st.pax.toLocaleString(loc()));
    set("fh-hold", String(R.holdQ.length));
    set("fh-rank", "SOY · " + rank() + (s.stands ? " · " + fmt(t("conn"), { a: s.conn, b: s.stands }) : ""));
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
      set("fh-c-" + b.id, lock ? lock : b.unit ? fmt(t("perM"), { p: eurS(b.unit * 10) }) : eurS(cost));
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
    hangar: L2("Wartungshalle", "Maintenance hangar"), deck: L2("Aussichtsplattform", "Viewing deck"), park: L2("Parkplatz", "Car park"), bus: L2("Bushaltestelle", "Bus stop") };
  function updateSel() {
    var box = document.getElementById("fh-sel"); if (!box) return;
    var m = V.sel && byId(V.sel);
    if (!m) { box.innerHTML = '<p>' + t("selNone") + "</p>"; return; }
    var info = [], acts = [];
    function btn(a, label, dis, warn) { return '<button type="button" data-act="' + a + '"' + (warn ? ' class="warn"' : "") + ' aria-disabled="' + dis + '">' + label + "</button>"; }
    if (m.t === "stand") {
      info.push(m._conn ? t("stConn") : t("stNoConn"));
      if (m._conn) info.push(m.gate && m._term ? t("stGate") : t("stBus"));
      if (!m.gate) acts.push(btn("gate", t("gate") + " · " + eurS(bdef("gate").cost()), !!bdef("gate").lock() || !m._term));
      if (!m.heavy) acts.push(btn("heavy", t("heavy") + " · " + eurS(bdef("heavy").cost()), !!bdef("heavy").lock()));
    } else if (m.t === "runway") {
      var rws = mods("runway"), i = rws.indexOf(m);
      info.push(rws.length > 1 ? (i === 0 ? t("rwArr") : t("rwDep")) : t("rwBoth"));
      acts.push(btn("flip", t("flip"), false));
    } else if (LVL[m.t]) {
      info.push(t("lvl") + " " + m.lvl + "/2");
      if (m.lvl < 2) acts.push(btn("lvl", fmt(t("up2"), { n: 2 }) + " · " + eurS(LVL[m.t][0]), false));
    } else if (m.t === "term" || m.t === "park" || m.t === "bus") {
      info.push(m._road ? t("stRoad") : t("stNoRoad"));
      if (m.t === "term") { info.push(fmt(t("termDep"), { n: Math.round(R.tDep) }), fmt(t("termArr"), { n: Math.round(R.tArrBus + R.tArrCar + R.tArrWalk) })); if (landMode() === "walk") info.push(t("noRoadTerm")); }
      if (m.t === "bus") info.push(fmt(t("stopInfo"), { n: R.stopW[m.id] || 0 }));
      if (m.t === "park") info.push(fmt(t("lotInfo"), { a: lotUsed(m), b: LOT }));
    }
    acts.push(btn("del", V.delArm ? fmt(t("delQ"), { p: eurS((m.paid || 0) / 2) }) : t("del"), false, true));
    box.innerHTML = "<b>" + NAMES[m.t][lang] + (m.t === "stand" ? " " + standNo(m) : "") + "</b>" + info.map(function (s) { return "<p>" + s + "</p>"; }).join("") + '<div class="acts">' + acts.join("") + "</div>";
  }
  function updateHint() {
    var T = V.tool, k = !T ? "none" : T.kind === "rect" || T.kind === "runway" ? "rect" : T.kind === "apply" ? "apply" : T.start ? "line1" : (T.id === "road" ? "road0" : "line0");
    set("fh-hint", (T ? bdef(T.id).name[lang] + ": " : "") + TX.hint[k][lang]);
    Array.prototype.forEach.call(V.root.querySelectorAll(".fh-ctl .rot"), function (b) { b.hidden = !(T && (T.kind === "rect" || T.kind === "runway")); });
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
    var ab = e.target.closest("[data-act]");
    if (ab) {
      var m = byId(V.sel); if (!m || ab.getAttribute("aria-disabled") === "true") return;
      var a = ab.getAttribute("data-act");
      if (a === "del") { if (V.delArm) { V.delArm = false; demolish(m); } else { V.delArm = true; updateSel(); } return; }
      V.delArm = false;
      if (a === "gate" || a === "heavy") applyStand(a, m);
      else if (a === "flip") {
        if (inUse(m)) { msg(t("delBusy")); return; }
        m.a += Math.PI; rebuild(); save(); updateSel();
      } else if (a === "lvl") {
        var c = LVL[m.t][0];
        if (G.money < c) { msg(t("poor")); return; }
        G.money -= c; m.lvl = 2; m.paid += c; save(); msg(NAMES[m.t][lang] + " · " + t("lvl") + " 2", true); updateSel(); updatePanel(true);
      }
      return;
    }
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
        V.sel = null; V.cam = { x: 0, y: 0 }; V.zoom = 1; setTool(null); updateBar(); msg(t("welcome"), true);
      } else {
        r.setAttribute("data-armed", ""); r.textContent = t("resetQ");
        setTimeout(function () { if (r.isConnected) { r.removeAttribute("data-armed"); r.textContent = t("reset"); } }, 4000);
      }
    }
  }
  function onRotDown(e) { var b = e.target.closest && e.target.closest("[data-rot]"); if (b) { e.preventDefault(); V.rotHold = Number(b.getAttribute("data-rot")); } }
  function onRotUp() { if (V) V.rotHold = 0; }

  var raf = 0, last = 0, hudT = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    var dt = Math.min(0.1, (now - (last || now)) / 1000); last = now;
    keysTick(dt);
    if (!R.paused) { var g = dt * R.speed; while (g > 0) { var d = Math.min(0.05, g); tick(d); g -= d; } }
    if (R.msgT > 0) { R.msgT -= dt; if (R.msgT <= 0) msg(""); }
    R.saveT += dt; if (R.saveT > 4) { R.saveT = 0; save(); }
    hudT += dt; if (hudT > 0.25) { hudT = 0; updatePanel(); }
    draw();
  }

  function fitView() {
    if (!G.mods.length) { V.cam = { x: 0, y: 0 }; V.zoom = 1; return; }
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    G.mods.forEach(function (m) { corners(foot(m)).forEach(function (p) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }); });
    V.cam = { x: (x0 + x1) / 2, y: (y0 + y1) / 2 };
    var W = V.stage.clientWidth || 800, H = V.stage.clientHeight || 500;
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
    V = { root: el, stage: el.querySelector("#fh-stage"), cv: el.querySelector("#fh-cv"), cam: { x: 0, y: 0 }, zoom: 1, ang: 0, tool: null, ghost: null, sel: null, mouse: null, W: 800, H: 500, rotHold: 0 };
    V.ctx = V.cv.getContext("2d");
    fitView();
    el.addEventListener("click", onClick);
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
    if (R.first) { R.first = false; if (!G.mods.length) msg(t("welcome"), true); }
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
      V = null;
    }
    keys = {};
    save();
  }
  window.addEventListener("pagehide", save);

  window.Flughafen = { mount: mount, unmount: unmount,
    _debug: function () { return { G: G, R: R, V: V, tick: tick, addMod: addMod, rebuild: rebuild, stats: stats, snapRect: snapRect, setTool: setTool, act: act, updateGhost: updateGhost, rwEnds: rwEnds, world: world }; } };
})();
