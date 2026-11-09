/* Space Rogue 0.1 – Schiffseditor und Testflug. Für Color Space.
   Top-down wie FTL, modulare Bauteile wie Space Engineers. Alles läuft im Browser.
   Raster: 1 Zelle = 2,5 m. Vorne ist oben (−y). Drehung r: 0…3 im Uhrzeigersinn, f: gespiegelt. */
(function () {
  "use strict";

  var VERSION = "0.22";
  var CELL_M = 2.5, PX = 24;              // Meter je Zelle, Pixel je Zelle bei Zoom 1
  var lang = "de";
  function L2(de, en) { return { de: de, en: en }; }
  function t(k) { var v = TX[k]; return v ? v[lang] : k; }
  function fmt(s, o) { return s.replace(/\{(\w+)\}/g, function (m, k) { return o[k] !== undefined ? o[k] : m; }); }
  function nf(v, d) { return Number(v).toLocaleString(lang === "de" ? "de-DE" : "en-GB", { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }

  var TX = {
    back: L2("Apps", "Apps"), title: L2("Space Rogue", "Space Rogue"),
    catLA: L2("Panzerung leicht", "Light armour"), catHA: L2("Panzerung schwer", "Heavy armour"), catCo: L2("Cockpit", "Cockpit"),
    catTh: L2("Antrieb und Steuerung", "Propulsion"), catEn: L2("Energie", "Power"), catIn: L2("Innenraum", "Interior"), catWe: L2("Waffen", "Weapons"),
    tBuild: L2("Bauen", "Build"), tErase: L2("Abreißen", "Remove"), tPaint: L2("Malen", "Paint"),
    rot: L2("Drehen (R)", "Rotate (R)"), flip: L2("Spiegeln (F)", "Flip (F)"), sym: L2("Symmetrie (M)", "Symmetry (M)"),
    vIn: L2("Innen", "Interior"), vOut: L2("Außen", "Exterior"), view: L2("Ansicht (V)", "View (V)"),
    undo: L2("Rückgängig", "Undo"), clear: L2("Leeren", "Clear"), starter: L2("Beispielschiff", "Sample ship"),
    test: L2("Schiff testen", "Test ship"), toEd: L2("Zurück zum Editor", "Back to editor"),
    dir: L2("FLUGRICHTUNG", "FORWARD"),
    sMass: L2("Masse", "Mass"), sThr: L2("Schub und Beschleunigung", "Thrust and acceleration"),
    dF: L2("Vorwärts", "Forward"), dB: L2("Rückwärts", "Backward"), dL: L2("Links", "Left"), dR: L2("Rechts", "Right"),
    sGyro: L2("Drehung", "Rotation"), sEn: L2("Energie", "Power"), sProd: L2("Erzeugung", "Generation"), sStore: L2("Speicher", "Storage"), sUse: L2("Verbrauch bei Volllast", "Use at full load"),
    sRooms: L2("Räume", "Rooms"), sBlocks: L2("Blöcke", "Blocks"),
    wNoCock: L2("Kein Cockpit: ohne Cockpit kann niemand fliegen.", "No cockpit: nobody can fly without one."),
    wNoGyro: L2("Kein Gyroskop: das Schiff kann sich nicht drehen.", "No gyroscope: the ship cannot rotate."),
    wNoThr: L2("Keine Triebwerke für: {d}", "No thrusters for: {d}"),
    wLeak: L2("{n} Raum/Räume undicht: dort kann man nicht atmen.", "{n} room(s) leaking: no air to breathe."),
    wLoose: L2("{n} Block/Blöcke nicht verbunden (rot markiert).", "{n} block(s) not connected (marked red)."),
    wNoPow: L2("Keine Energiequelle: Batterie oder Reaktor einbauen.", "No power source: add a battery or reactor."),
    okRooms: L2("{n} Raum/Räume luftdicht", "{n} room(s) airtight"), noRooms: L2("Keine Innenräume", "No interior rooms"),
    hintEd: L2("Linksklick bauen, Ziehen baut Reihen · Rechtsklick abreißen · R drehen · F spiegeln · M Symmetrie · V Innen/Außen · Mausrad zoomt · Mitte/Leertaste + Ziehen verschiebt", "Left click build, drag for rows · right click remove · R rotate · F flip · M symmetry · V interior/exterior · wheel zooms · middle/space + drag pans"),
    hintFl: L2("Im Sitz: WASD fliegen · Q/E drehen (oder Umschalt + Maus) · Linksklick feuern · R Waffe · Z Trägheitsdämpfer · X Overcharge · Raketen lenken leicht zum Mauszeiger · Zu Fuß: WASD laufen · Linksklick schweißen · F aussteigen/hinsetzen · V Innen/Außen · Rechtsklick: Block beschädigen (Test) · Esc Editor", "Seated: WASD fly · Q/E rotate (or Shift + mouse) · left click fire · R weapon · Z inertia dampers · X overcharge · missiles steer gently toward the cursor · On foot: WASD walk · left click weld · F get up/sit down · V interior/exterior · right click: damage block (test) · Esc editor"),
    noCockTest: L2("Zum Testen braucht das Schiff ein Cockpit.", "The ship needs a cockpit to be tested."),
    damp: L2("Trägheitsdämpfer", "Inertia dampers"), on: L2("an", "on"), off: L2("aus", "off"),
    speed: L2("Tempo", "Speed"), energy: L2("Energie", "Power"), weapon: L2("Waffe", "Weapon"), none: L2("keine", "none"),
    seated: L2("Im Cockpit", "In cockpit"), unseated: L2("Nicht im Cockpit · F zum Hinsetzen", "Not in cockpit · F to sit down"),
    cockGone: L2("Cockpit zerstört · Steuerung verloren", "Cockpit destroyed · control lost"),
    noPower: L2("Keine Energie", "No power"), mg: L2("Minigun", "Minigun"), rg: L2("Railgun", "Railgun"), ms: L2("Leichte Raketen", "Light missiles"),
    targets: L2("Ziele neu", "Reset targets"), exitSeat: L2("Aussteigen (F)", "Get up (F)"), sitDown: L2("Hinsetzen (F)", "Sit down (F)"),
    walking: L2("Zu Fuß · F am Sitz zum Hinsetzen", "On foot · F at the seat to sit down"), tooFar: L2("Zu weit vom Sitz entfernt", "Too far from the seat"),
    weld: L2("Schweißgerät", "Welder"), weldOn: L2("repariert {n}: {p} %", "repairing {n}: {p} %"), weldIdle: L2("Linksklick vor einem Block repariert ihn", "Left click facing a block repairs it"),
    sDim: L2("Abmessungen", "Dimensions"), sCool: L2("Kühlung", "Cooling"), sCoolW: L2("Gekühlt", "Cooled"), weap: L2("Waffen", "weapons"), thrs: L2("Triebwerke", "thrusters"), sCom: L2("Schwerpunkt", "Centre of mass"), comHint: L2("gelb-schwarzer Kreis", "yellow-black circle"),
    roomCells: L2("{n} Felder", "{n} cells"), color: L2("Farbe", "Colour"), placeHint: L2("Erster Block: frei platzieren", "First block: place anywhere")
  };

  // ---------- Bauteile ----------
  // kind: armor, cock, thr, gyro, bat, reac, ant, floor, wall, door, win, mg, rg
  // shape: full, ramp1, ramp2, round, half
  var T = {}, CATS = [];
  function def(id, o) { o.id = id; T[id] = o; return o; }
  function armor(pre, heavy) {
    var m = heavy ? 3.3 : 0.5, hp = heavy ? 190 : 45, nm = heavy ? L2("schwer", "heavy") : L2("leicht", "light");
    var col = heavy ? "#6A7480" : "#9AA5B1";
    [["blk", "full", 1, 1, L2("Block 1×1", "Block 1×1"), 1],
     ["rmp", "ramp1", 1, 1, L2("Rampe 1×1", "Slope 1×1"), 0.5],
     ["rm2", "ramp2", 1, 2, L2("Rampe 1×2", "Slope 1×2"), 1],
     ["rm3", "ramp3", 1, 3, L2("Rampe 1×3", "Slope 1×3"), 1.5],
     ["cor", "round", 1, 1, L2("Ecke rund 1×1", "Round corner 1×1"), 0.8],
     ["hlf", "half", 1, 1, L2("Halb 1×1", "Half 1×1"), 0.5]].forEach(function (a) {
      def(pre + a[0], { cat: heavy ? "catHA" : "catLA", kind: "armor", shape: a[1], w: a[2], h: a[3], mass: Math.round(m * a[5] * 100) / 100, hp: Math.round(hp * Math.max(0.6, a[5])), col: col, heavy: heavy,
        n: L2(a[4].de + " " + nm.de, a[4].en + " " + nm.en) });
    });
  }
  armor("l", false); armor("h", true);
  def("cks", { cat: "catCo", kind: "cock", w: 2, h: 3, mass: 1.8, hp: 220, n: L2("Cockpit klein 2×3", "Small cockpit 2×3"), col: "#9AA5B1" });
  def("ckm", { cat: "catCo", kind: "cock", w: 3, h: 4, mass: 4.2, hp: 320, n: L2("Cockpit 3×4", "Cockpit 3×4"), col: "#9AA5B1" });
  def("ckl", { cat: "catCo", kind: "cock", w: 4, h: 5, mass: 7.5, hp: 440, n: L2("Cockpit groß 4×5", "Large cockpit 4×5"), col: "#9AA5B1" });
  def("ths", { cat: "catTh", kind: "thr", w: 1, h: 2, mass: 1.4, hp: 65, thrust: 180, use: 6, n: L2("Ionenantrieb klein 1×2", "Small ion thruster 1×2"), col: "#7E8995" });
  def("thl", { cat: "catTh", kind: "thr", w: 2, h: 3, mass: 5.2, hp: 170, thrust: 690, use: 20, n: L2("Ionenantrieb groß 2×3", "Large ion thruster 2×3"), col: "#7E8995" });
  def("gyr", { cat: "catTh", kind: "gyro", w: 1, h: 1, mass: 1.1, hp: 65, torque: 14000, use: 3, n: L2("Gyroskop 1×1", "Gyroscope 1×1"), col: "#7E8995" });
  def("col", { cat: "catTh", kind: "cool", w: 1, h: 1, mass: 0.8, hp: 50, n: L2("Kühlblock 1×1", "Cooling block 1×1"), col: "#7E8995" });
  def("ant", { cat: "catTh", kind: "ant", w: 1, h: 3, mass: 0.9, hp: 32, n: L2("Antenne 1×3", "Antenna 1×3"), col: "#7E8995" });
  def("bat", { cat: "catEn", kind: "bat", w: 1, h: 1, mass: 1.6, hp: 50, cap: 300, n: L2("Batterie 1×1", "Battery 1×1"), col: "#7E8995" });
  def("rea", { cat: "catEn", kind: "reac", w: 2, h: 2, mass: 4.6, hp: 135, prod: 14, n: L2("Reaktor 2×2", "Reactor 2×2"), col: "#7E8995" });
  def("flo", { cat: "catIn", kind: "floor", w: 1, h: 1, mass: 0.18, hp: 32, n: L2("Boden (Innenraum)", "Floor (interior)"), col: "#9AA5B1" });
  def("wal", { cat: "catIn", kind: "wall", w: 1, h: 1, mass: 0.45, hp: 65, n: L2("Innenwand", "Interior wall"), col: "#9AA5B1" });
  def("dor", { cat: "catIn", kind: "door", w: 1, h: 1, mass: 0.6, hp: 75, n: L2("Schiebetür", "Sliding door"), col: "#9AA5B1" });
  def("win", { cat: "catIn", kind: "win", w: 1, h: 1, mass: 0.7, hp: 40, n: L2("Fenster 1×1", "Window 1×1"), col: "#9AA5B1" });
  def("mgn", { cat: "catWe", kind: "mg", w: 1, h: 2, mass: 1.3, hp: 60, n: L2("Minigun 1×2", "Minigun 1×2"), col: "#7E8995" });
  def("msl", { cat: "catWe", kind: "ms", w: 1, h: 2, mass: 1.6, hp: 60, n: L2("Leichte Raketen 1×2", "Light missiles 1×2"), col: "#7E8995" });
  def("rgn", { cat: "catWe", kind: "rg", w: 1, h: 3, mass: 3.8, hp: 120, n: L2("Railgun 1×3", "Railgun 1×3"), col: "#7E8995" });
  CATS = ["catLA", "catHA", "catCo", "catTh", "catEn", "catIn", "catWe"];
  var MECH = { cock: 1, thr: 1, gyro: 1, ant: 1, bat: 1, reac: 1, door: 1, mg: 1, rg: 1, cool: 1, ms: 1 };
  var ROOMABLE = { bat: 1, reac: 1, gyro: 1, cool: 1 };   // Maschinen, die in einem Raum stehen dürfen und dann zum Raum gehören
  function replaceable(newT, o) { return o && T[newT].kind !== "floor" && T[o.b.t].kind === "floor"; }
  var DV = [[0, -1], [1, 0], [0, 1], [-1, 0]];     // N, O, S, W als Zellversatz

  // Welche lokalen Außenkanten verbinden (conn) und dichten (seal)? d: 0 N, 1 O, 2 S, 3 W
  function edgeRule(ty, lx, ly, d) {
    var k = ty.kind, sh = ty.shape, last = ly === ty.h - 1;
    if (k === "armor") {
      if (sh === "ramp1" || sh === "round") return { c: d === 2 || d === 3, s: d === 2 || d === 3 };
      if (sh === "ramp2" || sh === "ramp3") return { c: d === 3 || (d === 2 && last), s: d === 3 || (d === 2 && last) };
      if (sh === "half") return { c: d !== 0, s: d === 2 };
      return { c: true, s: true };
    }
    if (k === "thr") return { c: d !== 2, s: true };                       // Düse hinten verbindet nicht
    if (k === "mg" || k === "rg" || k === "ant" || k === "ms") return { c: last && d !== 0, s: true };   // nur am hinteren Ende
    if (k === "cock") return { c: true, s: true };                         // auch vorne an der Kanzel lässt sich anbauen
    return { c: true, s: true };
  }

  // ---------- Geometrie eines Blocks ----------
  function fp(b) { var ty = T[b.t]; return b.r % 2 ? [ty.h, ty.w] : [ty.w, ty.h]; }
  function cellOf(b, lx, ly) {   // lokale Zelle → Schiffszelle
    var ty = T[b.t], w = ty.w, h = ty.h, x = b.f ? w - 1 - lx : lx, y = ly;
    for (var i = 0; i < b.r; i++) { var nx = h - 1 - y, ny = x; x = nx; y = ny; var tw = w; w = h; h = tw; }
    return [b.x + x, b.y + y];
  }
  function dirOut(b, d) { if (b.f && (d === 1 || d === 3)) d = 4 - d; return (d + b.r) % 4; }
  function dirIn(b, d) { d = (d - b.r + 4) % 4; if (b.f && (d === 1 || d === 3)) d = 4 - d; return d; }
  function key(x, y) { return x + "," + y; }
  function buildMap(blocks) {
    var M = new Map();
    blocks.forEach(function (b) { var ty = T[b.t]; for (var ly = 0; ly < ty.h; ly++) for (var lx = 0; lx < ty.w; lx++) { var c = cellOf(b, lx, ly); M.set(key(c[0], c[1]), { b: b, lx: lx, ly: ly }); } });
    return M;
  }
  function cellsOf(b) { var ty = T[b.t], out = []; for (var ly = 0; ly < ty.h; ly++) for (var lx = 0; lx < ty.w; lx++) out.push({ c: cellOf(b, lx, ly), lx: lx, ly: ly }); return out; }
  // Verbindung zwischen zwei Blöcken über eine gemeinsame Kante
  function linked(M, b) {
    var out = [];
    cellsOf(b).forEach(function (q) {
      for (var d = 0; d < 4; d++) {
        var nx = q.c[0] + DV[d][0], ny = q.c[1] + DV[d][1], o = M.get(key(nx, ny));
        if (!o || o.b === b) continue;
        var a = edgeRule(T[b.t], q.lx, q.ly, dirIn(b, d)).c, c = edgeRule(T[o.b.t], o.lx, o.ly, dirIn(o.b, (d + 2) % 4)).c;
        if (a && c && out.indexOf(o.b) < 0) out.push(o.b);
      }
    });
    return out;
  }
  function components(blocks) {
    var M = buildMap(blocks), seen = new Set(), comps = [];
    blocks.forEach(function (b) {
      if (seen.has(b)) return;
      var comp = [], st = [b]; seen.add(b);
      while (st.length) { var x = st.pop(); comp.push(x); linked(M, x).forEach(function (o) { if (!seen.has(o)) { seen.add(o); st.push(o); } }); }
      comps.push(comp);
    });
    return comps;
  }
  // Räume: zusammenhängende Boden- und Türzellen, dicht wenn jede Außenkante abgedichtet ist
  function rooms(blocks) {
    var M = buildMap(blocks), seen = new Set(), out = [];
    M.forEach(function (v, k) {
      var kd = T[v.b.t].kind; if ((kd !== "floor" && kd !== "door") || seen.has(k)) return;
      var cells = [], leaks = [], st = [k]; seen.add(k);
      while (st.length) {
        var kk = st.pop(), p = kk.split(","), x = +p[0], y = +p[1]; cells.push([x, y]);
        for (var d = 0; d < 4; d++) {
          var nx = x + DV[d][0], ny = y + DV[d][1], nk = key(nx, ny), o = M.get(nk);
          if (!o) { leaks.push([x, y, d]); continue; }
          var ok = T[o.b.t].kind;
          if (ok === "floor" || ok === "door" || ROOMABLE[ok]) { if (!seen.has(nk)) { seen.add(nk); st.push(nk); } continue; }
          if (!edgeRule(T[o.b.t], o.lx, o.ly, dirIn(o.b, (d + 2) % 4)).s) leaks.push([x, y, d]);
        }
      }
      out.push({ cells: cells, leaks: leaks, ok: !leaks.length });
    });
    return out;
  }

  // Kühlung: aneinandergereihte Kühlblöcke bilden ein Netz. Jedes Teil, das irgendwo am Netz anliegt,
  // bekommt die Kühlleistung aller Blöcke dieses Netzes (mehrere Netze zählen zusammen).
  function coolMap(blocks, M) {
    M = M || buildMap(blocks);
    var nets = new Map(), out = new Map(), id = 0;
    blocks.forEach(function (b) {
      if (T[b.t].kind !== "cool" || nets.has(b)) return;
      var net = [], st = [b]; nets.set(b, id);
      while (st.length) { var x = st.pop(); net.push(x); for (var d = 0; d < 4; d++) { var o = M.get(key(x.x + DV[d][0], x.y + DV[d][1])); if (o && T[o.b.t].kind === "cool" && !nets.has(o.b)) { nets.set(o.b, id); st.push(o.b); } } }
      var touched = new Set();
      net.forEach(function (x) { for (var d = 0; d < 4; d++) { var o = M.get(key(x.x + DV[d][0], x.y + DV[d][1])); if (o && T[o.b.t].kind !== "cool") touched.add(o.b); } });
      touched.forEach(function (tb) { out.set(tb, (out.get(tb) || 0) + net.length); });
      id++;
    });
    return out;
  }
  function ocMaxOf(blocks, cm) {   // Overcharge-Dauer: 3 s, jeder Kühlblock an einem Triebwerk verlängert
    var n = 0, seen = new Set(); blocks.forEach(function (b) { if (T[b.t].kind === "thr" && cm.get(b)) { if (!seen.has(cm.get(b) + ":" + b.x)) n = Math.max(n, cm.get(b)); } });
    return 3 + 0.8 * n;
  }
  // ---------- Werte eines Schiffs ----------
  function thrustDir(b) { return dirOut(b, 0); }     // Schub zeigt zur Montageseite, Düse nach hinten
  function stats(blocks) {
    var s = { mass: 0, thr: [0, 0, 0, 0], torque: 0, cap: 0, prod: 0, use: 0, n: blocks.length, cock: 0, gyro: 0, com: [0, 0], I: 0, mg: 0, rg: 0, ms: 0 };
    blocks.forEach(function (b) {
      var ty = T[b.t], f = fp(b), cx = b.x + f[0] / 2, cy = b.y + f[1] / 2;
      s.mass += ty.mass; s.com[0] += cx * ty.mass; s.com[1] += cy * ty.mass;
      if (ty.kind === "thr") { s.thr[thrustDir(b)] += ty.thrust; s.use += ty.use; }
      if (ty.kind === "gyro") { s.torque += ty.torque; s.gyro++; s.use += ty.use; }
      if (ty.kind === "bat") s.cap += ty.cap;
      if (ty.kind === "reac") s.prod += ty.prod;
      if (ty.kind === "cock") s.cock++;
      if (ty.kind === "mg") s.mg++;
      if (ty.kind === "rg") s.rg++;
      if (ty.kind === "ms") s.ms++;
    });
    if (s.mass) { s.com[0] /= s.mass; s.com[1] /= s.mass; }
    blocks.forEach(function (b) {
      var ty = T[b.t], f = fp(b), dx = (b.x + f[0] / 2 - s.com[0]) * CELL_M, dy = (b.y + f[1] / 2 - s.com[1]) * CELL_M;
      s.I += ty.mass * (dx * dx + dy * dy + (f[0] * f[0] + f[1] * f[1]) * CELL_M * CELL_M / 12);
    });
    return s;
  }

  // ---------- Zustand ----------
  var S = null, V = null, raf = 0, last = 0;
  var SAVE = "spacerogue-ship-v1";
  function freshState() {
    return { blocks: [], tool: "build", sel: "lblk", r: 0, f: 0, sym: false, view: "in", color: "#C8473A", undo: [], mode: "edit" };
  }
  function load() {
    S = freshState();
    try { var j = JSON.parse(localStorage.getItem(SAVE) || "null"); if (j && j.blocks) { S.blocks = j.blocks.filter(function (b) { return T[b.t]; }); if (j.color) S.color = j.color; } } catch (e) {}
    if (!S.blocks.length) S.blocks = starter();
  }
  function save() { try { localStorage.setItem(SAVE, JSON.stringify({ blocks: S.blocks.map(strip), color: S.color })); } catch (e) {} }
  function strip(b) { var o = { t: b.t, x: b.x, y: b.y, r: b.r, f: b.f }; if (b.c) o.c = b.c; return o; }
  function pushUndo() { S.undo.push(JSON.stringify(S.blocks.map(strip))); if (S.undo.length > 60) S.undo.shift(); }

  // Beispielschiff: Cockpit vorn, luftdichter Raum, Triebwerke in alle Richtungen, Gyroskop, Energie, Waffen
  function starter() {
    var B = [];
    function a(t, x, y, r, f, c) { B.push({ t: t, x: x, y: y, r: r || 0, f: f || 0, c: c }); }
    function m(t, x, y, r, c) { var ty = T[t], w = (r % 2 ? ty.h : ty.w); a(t, x, y, r, 0, c); a(t, 1 - x - w, y, (4 - r) % 4, 1, c); }
    a("ckm", -1, -6, 0);
    for (var y = -6; y <= 3; y++) m(y === -1 ? "win" : (y <= -4 ? "hblk" : "lblk"), -2, y, 0);
    for (var x = -1; x <= 1; x++) { a("flo", x, -2); a("flo", x, -1); a("lblk", x, 1); }
    a("gyr", -1, 0); a("bat", 0, 0); a("bat", 1, 0);
    a("rea", -1, 2); a("lblk", 1, 2); a("lblk", 1, 3);
    m("thl", -2, 4, 0); a("ths", 0, 4, 0);
    m("ths", -2, -8, 2);
    for (y = -4; y <= 1; y++) m("lblk", -3, y, 0, y % 2 ? "#C8473A" : undefined);
    for (y = -2; y <= 0; y++) m("lblk", -4, y, 0, "#C8473A");
    m("mgn", -3, -6, 0); m("rgn", -4, -5, 0);
    m("ths", -6, -1, 1);
    m("lrmp", -3, 2, 2); m("lrmp", -4, 1, 2);
    m("col", -3, 4, 0); m("col", -3, 5, 0);
    m("msl", -1, -8, 0);
    return B;
  }

  // ---------- Editor: Platzieren ----------
  function ghostAt(cx, cy, tid, r, f) {
    var ty = T[tid], w = r % 2 ? ty.h : ty.w, h = r % 2 ? ty.w : ty.h;
    return { t: tid, x: cx - Math.floor((w - 1) / 2), y: cy - Math.floor((h - 1) / 2), r: r, f: f };
  }
  function mirrorOf(b) { var f = fp(b); return { t: b.t, x: 1 - b.x - f[0], y: b.y, r: (4 - b.r) % 4, f: 1 - b.f, c: b.c }; }
  function canPlace(b, M, extra) {
    var cs = cellsOf(b);
    for (var i = 0; i < cs.length; i++) { var k = key(cs[i].c[0], cs[i].c[1]); if (M.has(k) && !replaceable(b.t, M.get(k))) return false; if (extra && extra.has(k)) return false; }
    if (!S.blocks.length && !extra) return true;
    return linked(M, b).length > 0 || (extra && extra.size > 0 && linkedTo(M, b, extra));
  }
  function linkedTo(M, b, extraMap) { var M2 = new Map(M); extraMap.forEach(function (v, k) { M2.set(k, v); }); return linked(M2, b).length > 0; }
  function placeList(g) {
    var list = [g];
    if (S.sym) { var mg = mirrorOf(g); if (mg.x !== g.x || mg.r !== g.r || mg.f !== g.f) list.push(mg); }
    // Spiegelbild deckt sich mit dem Original: nur einmal setzen
    if (list.length === 2) { var a = new Set(cellsOf(list[0]).map(function (q) { return key(q.c[0], q.c[1]); })); if (cellsOf(list[1]).some(function (q) { return a.has(key(q.c[0], q.c[1])); })) list.pop(); }
    return list;
  }
  function tryPlace(g, noUndo) {
    var M = buildMap(S.blocks), list = placeList(g), first = S.blocks.length === 0;
    var okA = first || canPlace(list[0], M);
    if (!okA) return false;
    var extra = new Map(); cellsOf(list[0]).forEach(function (q) { extra.set(key(q.c[0], q.c[1]), { b: list[0], lx: q.lx, ly: q.ly }); });
    var okB = list[1] ? canPlaceWith(list[1], M, extra) : false;
    if (!noUndo) pushUndo();
    var put = [list[0]]; if (list[1] && okB) put.push(list[1]);
    // Böden unter dem neuen Teil werden ersetzt
    var under = new Set(); put.forEach(function (q) { cellsOf(q).forEach(function (c) { under.add(key(c.c[0], c.c[1])); }); });
    if (T[g.t].kind !== "floor") S.blocks = S.blocks.filter(function (q) { return !(T[q.t].kind === "floor" && under.has(key(q.x, q.y))); });
    put.forEach(function (q) { S.blocks.push(clean(q)); });
    save(); return true;
  }
  // Reihe: vom Startfeld in Zugrichtung (waagerecht oder senkrecht), Abstand = Größe des Teils
  function rowList() {
    var R0 = V.row; if (!R0) return [];
    var ty = T[S.sel], fw = S.r % 2 ? ty.h : ty.w, fh = S.r % 2 ? ty.w : ty.h, dx = R0.ex - R0.sx, dy = R0.ey - R0.sy, out = [];
    var horiz = Math.abs(dx) >= Math.abs(dy), step = horiz ? fw : fh, n = Math.floor(Math.abs(horiz ? dx : dy) / step) + 1, sg = (horiz ? dx : dy) < 0 ? -1 : 1;
    for (var i = 0; i < Math.min(n, 60); i++) out.push(ghostAt(R0.sx + (horiz ? sg * step * i : 0), R0.sy + (horiz ? 0 : sg * step * i), S.sel, S.r, S.f));
    return out;
  }
  function placeRow() {
    var L = rowList(), n = 0; if (!L.length) return;
    pushUndo();
    for (var pass = 0; pass < 2; pass++) L.forEach(function (g) { if (!g.done && tryPlace(g, true)) { g.done = true; n++; } });   // zweiter Durchgang für Teile, die erst über Nachbarn Anschluss finden
    if (!n) { S.undo.pop(); if (S.blocks.length) note(lang === "de" ? "Hier passt der Block nicht oder hat keinen Anschluss." : "The block does not fit here or has no connection."); }
  }
  function canPlaceWith(b, M, extra) {
    var cs = cellsOf(b);
    for (var i = 0; i < cs.length; i++) { var k = key(cs[i].c[0], cs[i].c[1]); if ((M.has(k) && !replaceable(b.t, M.get(k))) || extra.has(k)) return false; }
    return linkedTo(M, b, extra);
  }
  function clean(b) { return { t: b.t, x: b.x, y: b.y, r: b.r, f: b.f }; }
  function blockAt(cx, cy, M) { var o = (M || buildMap(S.blocks)).get(key(cx, cy)); return o ? o.b : null; }
  function mirrorCell(cx) { return 0 - cx; }   // Achse auf Zelle 0: Spiegelung x → 1 − x − 1 = −x
  function eraseAt(cx, cy) {
    var M = buildMap(S.blocks), b = blockAt(cx, cy, M); if (!b) return false;
    pushUndo();
    var kill = [b]; if (S.sym) { var o = blockAt(mirrorCell(cx), cy, M); if (o && o !== b) kill.push(o); }
    S.blocks = S.blocks.filter(function (q) { return kill.indexOf(q) < 0; }); save(); return true;
  }
  function paintAt(cx, cy) {
    var M = buildMap(S.blocks), b = blockAt(cx, cy, M); if (!b) return false;
    var list = [b]; if (S.sym) { var o = blockAt(mirrorCell(cx), cy, M); if (o && o !== b) list.push(o); }
    if (list.every(function (q) { return q.c === S.color; })) return false;
    pushUndo(); list.forEach(function (q) { q.c = S.color; }); save(); return true;
  }

  // ---------- Zeichnen der Blöcke ----------
  var GLASS = "#5FB4D9", GLASS2 = "#9FD8EE", DARK = "#2A2F36", MID = "#4A525C", LIGHT = "#C9D1D9", FLOOR = "#B9BEC4", FLOOR2 = "#A9AFB6", ACC = "#E3B83F";
  function shade(hex, k) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    function f(v) { return Math.max(0, Math.min(255, Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k)))); }
    return "rgb(" + f(r) + "," + f(g) + "," + f(b) + ")";
  }
  function shapePath(c, sh, w, h) {
    c.beginPath();
    if (sh === "ramp1" || sh === "ramp2" || sh === "ramp3") { c.moveTo(0, 0); c.lineTo(0, h); c.lineTo(w, h); c.closePath(); }
    else if (sh === "round") { c.moveTo(0, 0); c.arc(0, h, w, -Math.PI / 2, 0); c.lineTo(0, h); c.closePath(); }
    else if (sh === "half") c.rect(0, h / 2, w, h / 2);
    else c.rect(0, 0, w, h);
  }
  // b: Block, s: Pixel je Zelle, view: "in"/"out", dmg: Anteil Leben (0…1)
  function drawBlock(c, b, s, view, hpk, tm, opts) {
    var ty = T[b.t], f = fp(b), w = ty.w * s, h = ty.h * s, k = ty.kind;
    c.save();
    c.translate((b.x + f[0] / 2) * s, (b.y + f[1] / 2) * s);
    c.rotate(b.r * Math.PI / 2); if (b.f) c.scale(-1, 1);
    c.translate(-w / 2, -h / 2);
    var col = b.c || ty.col, lw = Math.max(1, s / 16), dam = hpk !== undefined && hpk <= 0.5;
    c.lineJoin = "miter";
    if (k === "armor" || k === "win") {
      if (k === "win") { c.fillStyle = shade(col, -0.15); c.fillRect(0, 0, w, h); c.fillStyle = GLASS; c.fillRect(w * 0.18, h * 0.18, w * 0.64, h * 0.64); c.fillStyle = GLASS2; c.fillRect(w * 0.22, h * 0.22, w * 0.2, h * 0.56); }
      else {
        shapePath(c, ty.shape, w, h); c.fillStyle = col; c.fill();
        c.save(); c.clip();
        c.fillStyle = shade(col, 0.22); c.fillRect(0, 0, w, lw * 2); c.fillRect(0, 0, lw * 2, h);
        c.fillStyle = shade(col, -0.25); c.fillRect(0, h - lw * 2, w, lw * 2); c.fillRect(w - lw * 2, 0, lw * 2, h);
        if (ty.heavy) { c.fillStyle = shade(col, -0.18); c.fillRect(w * 0.3, h * 0.3, w * 0.4, h * 0.4); c.fillStyle = shade(col, 0.1); c.fillRect(w * 0.34, h * 0.34, w * 0.32, h * 0.32); }
        c.restore();
      }
      shapePath(c, k === "win" ? "full" : ty.shape, w, h); c.strokeStyle = shade(col, -0.5); c.lineWidth = lw; c.stroke();
      if (dam) damageMarks(c, w, h, b, s, ty.shape);
    } else if (k === "floor" || k === "wall" || k === "door") {
      if (view === "out") { roof(c, w, h, col, lw); }
      else if (k === "floor") { c.fillStyle = FLOOR; c.fillRect(0, 0, w, h); c.strokeStyle = FLOOR2; c.lineWidth = lw; c.strokeRect(lw / 2, lw / 2, w - lw, h - lw); c.fillStyle = FLOOR2; c.fillRect(w * 0.45, h * 0.45, w * 0.1, h * 0.1); }
      else if (k === "wall") { c.fillStyle = shade(col, -0.35); c.fillRect(0, 0, w, h); c.fillStyle = shade(col, -0.15); c.fillRect(w * 0.15, 0, w * 0.7, h); c.strokeStyle = shade(col, -0.55); c.lineWidth = lw; c.strokeRect(lw / 2, lw / 2, w - lw, h - lw); }
      else { c.fillStyle = FLOOR; c.fillRect(0, 0, w, h); c.fillStyle = shade(col, -0.3); c.fillRect(0, 0, w * 0.12, h); c.fillRect(w * 0.88, 0, w * 0.12, h); c.fillStyle = "#D9A21B"; c.fillRect(w * 0.12, h * 0.38, w * 0.37, h * 0.24); c.fillRect(w * 0.51, h * 0.38, w * 0.37, h * 0.24); c.fillStyle = DARK; c.fillRect(w * 0.49, h * 0.38, w * 0.02, h * 0.24); }
      if (k === "door" && view === "out") { c.fillStyle = "#D9A21B"; c.fillRect(w * 0.42, h * 0.1, w * 0.16, h * 0.8); }
    } else if (k === "cock") {
      c.fillStyle = col; c.fillRect(0, 0, w, h);
      c.fillStyle = shade(col, -0.3); c.fillRect(0, h - lw * 2, w, lw * 2); c.fillRect(0, 0, lw * 2, h); c.fillRect(w - lw * 2, 0, lw * 2, h);
      var cw = w - s * 0.5, ch = s * (ty.h > 3 ? 1.6 : 1.2);
      c.fillStyle = GLASS; c.beginPath(); c.moveTo(s * 0.25, ch); c.lineTo(s * 0.25, s * 0.45); c.lineTo(w / 2, s * 0.08); c.lineTo(w - s * 0.25, s * 0.45); c.lineTo(w - s * 0.25, ch); c.closePath(); c.fill();
      c.fillStyle = GLASS2; c.beginPath(); c.moveTo(s * 0.4, ch * 0.9); c.lineTo(s * 0.4, s * 0.5); c.lineTo(w / 2 - s * 0.1, s * 0.25); c.lineTo(w / 2 - s * 0.1, ch * 0.9); c.closePath(); c.fill();
      if (view === "in") {
        c.fillStyle = FLOOR; c.fillRect(s * 0.25, ch + lw, cw, h - ch - s * 0.35);
        c.fillStyle = MID; c.fillRect(s * 0.4, ch + lw, cw - s * 0.3, s * 0.28);
        c.fillStyle = "#57D18A"; c.fillRect(s * 0.6, ch + lw * 2, s * 0.3, s * 0.12); c.fillStyle = ACC; c.fillRect(w - s * 0.9, ch + lw * 2, s * 0.3, s * 0.12);
        var sx = w / 2, sy = ch + s * 0.95; c.fillStyle = "#5A3E2B"; c.fillRect(sx - s * 0.32, sy - s * 0.3, s * 0.64, s * 0.62); c.fillStyle = "#7A5A40"; c.fillRect(sx - s * 0.24, sy - s * 0.2, s * 0.48, s * 0.4);
        if (opts && opts.pilot) drawAstronaut(c, sx, sy - s * 0.05, -Math.PI / 2, 0, s / 24, false);
      } else { c.fillStyle = shade(col, -0.12); c.fillRect(s * 0.25, ch + lw, cw, h - ch - s * 0.35); c.strokeStyle = shade(col, -0.35); c.lineWidth = lw; for (var gy = ch + s * 0.6; gy < h - s * 0.4; gy += s * 0.7) { c.beginPath(); c.moveTo(s * 0.25, gy); c.lineTo(w - s * 0.25, gy); c.stroke(); } }
      c.strokeStyle = shade(col, -0.55); c.lineWidth = lw; c.strokeRect(lw / 2, lw / 2, w - lw, h - lw);
      if (dam) damageMarks(c, w, h, b, s, "full");
    } else if (k === "thr") {
      c.fillStyle = shade(col, -0.1); c.fillRect(w * 0.08, 0, w * 0.84, h * 0.62);
      c.fillStyle = shade(col, 0.2); c.fillRect(w * 0.08, 0, w * 0.84, lw * 2);
      c.fillStyle = MID; c.beginPath(); c.moveTo(w * 0.16, h * 0.6); c.lineTo(w * 0.84, h * 0.6); c.lineTo(w * 0.96, h); c.lineTo(w * 0.04, h); c.closePath(); c.fill();
      c.fillStyle = DARK; c.beginPath(); c.moveTo(w * 0.24, h * 0.66); c.lineTo(w * 0.76, h * 0.66); c.lineTo(w * 0.86, h * 0.97); c.lineTo(w * 0.14, h * 0.97); c.closePath(); c.fill();
      c.fillStyle = "rgba(120,200,255,.9)"; c.fillRect(w * 0.3, h * 0.9, w * 0.4, h * 0.05);
      c.fillStyle = b.c ? b.c : ACC; c.fillRect(w * 0.2, h * 0.2, w * 0.6, h * 0.08);
      c.strokeStyle = shade(col, -0.55); c.lineWidth = lw; c.strokeRect(w * 0.08, 0, w * 0.84, h * 0.62);
    } else if (k === "gyro") {
      c.fillStyle = shade(col, -0.15); c.fillRect(0, 0, w, h);
      c.strokeStyle = LIGHT; c.lineWidth = lw * 1.4; c.beginPath(); c.arc(w / 2, h / 2, w * 0.32, 0, Math.PI * 2); c.stroke();
      var ga = tm * 3; c.strokeStyle = b.c || ACC; c.beginPath(); c.moveTo(w / 2 + Math.cos(ga) * w * 0.3, h / 2 + Math.sin(ga) * h * 0.3); c.lineTo(w / 2 - Math.cos(ga) * w * 0.3, h / 2 - Math.sin(ga) * h * 0.3); c.stroke();
      c.fillStyle = DARK; c.fillRect(w * 0.44, h * 0.44, w * 0.12, h * 0.12);
      c.strokeStyle = shade(col, -0.55); c.lineWidth = lw; c.strokeRect(lw / 2, lw / 2, w - lw, h - lw);
    } else if (k === "bat") {
      c.fillStyle = shade(col, -0.1); c.fillRect(0, 0, w, h);
      c.fillStyle = DARK; c.fillRect(w * 0.2, h * 0.15, w * 0.6, h * 0.7);
      var lv = opts && opts.batK !== undefined ? opts.batK : 1; c.fillStyle = lv < 0.2 ? "#E0533F" : "#57D18A"; c.fillRect(w * 0.26, h * 0.21 + h * 0.58 * (1 - lv), w * 0.48, h * 0.58 * lv);
      c.fillStyle = b.c || ACC; c.fillRect(w * 0.38, h * 0.06, w * 0.24, h * 0.09);
      c.strokeStyle = shade(col, -0.55); c.lineWidth = lw; c.strokeRect(lw / 2, lw / 2, w - lw, h - lw);
    } else if (k === "reac") {
      c.fillStyle = shade(col, -0.2); c.fillRect(0, 0, w, h);
      c.fillStyle = shade(col, 0.05); c.fillRect(w * 0.08, h * 0.08, w * 0.84, h * 0.84);
      var pulse = 0.6 + 0.4 * Math.sin(tm * 4);
      c.fillStyle = DARK; c.beginPath(); c.arc(w / 2, h / 2, w * 0.3, 0, Math.PI * 2); c.fill();
      c.fillStyle = "rgba(90,220,255," + (0.55 + 0.35 * pulse) + ")"; c.beginPath(); c.arc(w / 2, h / 2, w * 0.18, 0, Math.PI * 2); c.fill();
      c.fillStyle = b.c || ACC; [[0.12, 0.12], [0.8, 0.12], [0.12, 0.8], [0.8, 0.8]].forEach(function (q) { c.fillRect(w * q[0], h * q[1], w * 0.08, h * 0.08); });
      c.strokeStyle = shade(col, -0.55); c.lineWidth = lw; c.strokeRect(lw / 2, lw / 2, w - lw, h - lw);
    } else if (k === "cool") {
      c.fillStyle = shade(col, -0.2); c.fillRect(0, 0, w, h);
      c.fillStyle = "#2E4A5E"; c.fillRect(w * 0.12, h * 0.12, w * 0.76, h * 0.76);
      c.fillStyle = "#8FD3F2"; for (var fi = 0; fi < 4; fi++) c.fillRect(w * 0.18, h * (0.2 + fi * 0.17), w * 0.64, h * 0.07);
      c.fillStyle = b.c || "#5FB4D9"; c.fillRect(w * 0.44, 0, w * 0.12, h * 0.12); c.fillRect(w * 0.44, h * 0.88, w * 0.12, h * 0.12); c.fillRect(0, h * 0.44, w * 0.12, h * 0.12); c.fillRect(w * 0.88, h * 0.44, w * 0.12, h * 0.12);
      c.strokeStyle = shade(col, -0.55); c.lineWidth = lw; c.strokeRect(lw / 2, lw / 2, w - lw, h - lw);
    } else if (k === "ant") {
      c.fillStyle = shade(col, -0.1); c.fillRect(w * 0.1, h - s, w * 0.8, s);
      c.fillStyle = LIGHT; c.fillRect(w * 0.44, h * 0.08, w * 0.12, h - s);
      c.fillRect(w * 0.2, h * 0.3, w * 0.6, lw * 1.5); c.fillRect(w * 0.28, h * 0.5, w * 0.44, lw * 1.5);
      c.fillStyle = Math.sin(tm * 5) > 0 ? "#E0533F" : "#7A2A20"; c.fillRect(w * 0.42, h * 0.04, w * 0.16, w * 0.16);
      c.strokeStyle = shade(col, -0.55); c.lineWidth = lw; c.strokeRect(w * 0.1, h - s, w * 0.8, s);
    } else if (k === "mg") {
      c.fillStyle = shade(col, -0.1); c.fillRect(w * 0.12, h - s, w * 0.76, s);
      c.fillStyle = b.c || "#8C4A3A"; c.fillRect(w * 0.2, h - s * 0.85, w * 0.6, s * 0.5);
      c.fillStyle = DARK; [0.3, 0.5, 0.7].forEach(function (q) { c.fillRect(w * q - w * 0.06, h * 0.06, w * 0.12, h - s * 0.9); });
      c.fillStyle = MID; c.fillRect(w * 0.18, h * 0.42, w * 0.64, s * 0.14);
      c.strokeStyle = shade(col, -0.55); c.lineWidth = lw; c.strokeRect(w * 0.12, h - s, w * 0.76, s);
    } else if (k === "ms") {
      c.fillStyle = shade(col, -0.12); c.fillRect(w * 0.08, h * 0.3, w * 0.84, h * 0.7);
      c.fillStyle = b.c || "#8C4A3A"; c.fillRect(w * 0.14, h - s * 0.55, w * 0.72, s * 0.35);
      [0.3, 0.7].forEach(function (q) { c.fillStyle = DARK; c.fillRect(w * q - w * 0.15, h * 0.06, w * 0.3, h * 0.55); var ready = !(opts && opts.reload); c.fillStyle = ready ? "#E9ECEE" : "#4A525C"; c.beginPath(); c.moveTo(w * q, h * 0.08); c.lineTo(w * q + w * 0.09, h * 0.2); c.lineTo(w * q - w * 0.09, h * 0.2); c.closePath(); c.fill(); if (ready) { c.fillStyle = "#C8473A"; c.fillRect(w * q - w * 0.09, h * 0.2, w * 0.18, h * 0.06); } });
      c.strokeStyle = shade(col, -0.55); c.lineWidth = lw; c.strokeRect(w * 0.08, h * 0.3, w * 0.84, h * 0.7);
    } else if (k === "rg") {
      c.fillStyle = shade(col, -0.15); c.fillRect(w * 0.08, h - s * 1.2, w * 0.84, s * 1.2);
      c.fillStyle = b.c || "#3E6F96"; c.fillRect(w * 0.16, h - s * 1.05, w * 0.68, s * 0.5);
      c.fillStyle = DARK; c.fillRect(w * 0.22, h * 0.04, w * 0.18, h - s * 1.1); c.fillRect(w * 0.6, h * 0.04, w * 0.18, h - s * 1.1);
      var chg = opts && opts.charge ? opts.charge : 0;
      c.fillStyle = "rgba(120,220,255," + (0.25 + chg * 0.75) + ")"; c.fillRect(w * 0.42, h * 0.08, w * 0.16, h - s * 1.15);
      c.strokeStyle = shade(col, -0.55); c.lineWidth = lw; c.strokeRect(w * 0.08, h - s * 1.2, w * 0.84, s * 1.2);
    }
    if (dam && MECH[k] && k !== "cock") damageMarks(c, w, h, b, s, "full");
    c.restore();
  }
  // Astronaut von oben: Helm mit Visier, Schultern, Rucksack, Arme und Füße bewegen sich beim Laufen
  function drawAstronaut(c, x, y, face, ph, sc, weld) {
    var sw = Math.sin(ph), cw = Math.cos(ph);
    c.save(); c.translate(x, y); c.rotate(face); c.scale(sc, sc);
    c.fillStyle = "rgba(0,0,0,.25)"; c.beginPath(); c.ellipse(1, 1.5, 7, 9.5, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#3A3F46"; c.beginPath(); c.ellipse(sw * 4.2, -3.6, 3.2, 2.1, 0, 0, Math.PI * 2); c.fill(); c.beginPath(); c.ellipse(-sw * 4.2, 3.6, 3.2, 2.1, 0, 0, Math.PI * 2); c.fill();
    c.save(); c.rotate(sw * 0.18);
    c.fillStyle = "#8C96A0"; c.fillRect(-8.5, -4.5, 4, 9);
    c.fillStyle = "#E3E7EA"; c.beginPath(); c.ellipse(0, 0, 4.6, 8.2, 0, 0, Math.PI * 2); c.fill(); c.strokeStyle = "#9AA3AD"; c.lineWidth = 0.8; c.stroke();
    c.fillStyle = "#E0743A"; c.beginPath(); c.arc(-0.5, -7.2, 2.2, 0, Math.PI * 2); c.fill(); c.beginPath(); c.arc(-0.5, 7.2, 2.2, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#D5DADF"; c.beginPath(); c.arc(1.5 - sw * 3.2, -8.8, 1.8, 0, Math.PI * 2); c.fill();
    var hx = weld ? 6.5 : 1.5 + sw * 3.2, hy = weld ? 4.5 : 8.8; c.beginPath(); c.arc(hx, hy, 1.8, 0, Math.PI * 2); c.fill();
    if (weld) { c.fillStyle = "#3A3F46"; c.fillRect(6, 3.4, 5, 2.2); var g = 0.6 + 0.4 * Math.random(); c.fillStyle = "rgba(150,220,255," + g + ")"; c.beginPath(); c.arc(11.8, 4.5, 1.6 + Math.random(), 0, Math.PI * 2); c.fill(); }
    c.restore();
    c.fillStyle = "#F4F6F8"; c.beginPath(); c.arc(0.6, 0, 4.4, 0, Math.PI * 2); c.fill(); c.strokeStyle = "#9AA3AD"; c.lineWidth = 0.7; c.stroke();
    c.fillStyle = "#3E6F96"; c.beginPath(); c.ellipse(2.6, 0, 2, 3.2, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = "rgba(255,255,255,.55)"; c.fillRect(2.4, -2, 0.9, 1.6);
    void cw;
    c.restore();
  }
  function roof(c, w, h, col, lw) {
    c.fillStyle = shade(col, 0.08); c.fillRect(0, 0, w, h);
    c.strokeStyle = shade(col, -0.2); c.lineWidth = lw; c.strokeRect(lw / 2, lw / 2, w - lw, h - lw);
    c.fillStyle = shade(col, -0.12); c.fillRect(w * 0.2, h * 0.2, lw * 1.5, lw * 1.5); c.fillRect(w * 0.75, h * 0.75, lw * 1.5, lw * 1.5);
  }
  // Beschädigt: leichte Beulen und Risse (Zufall aus der Blockposition, damit es stabil bleibt)
  function damageMarks(c, w, h, b, s, sh) {
    var sd = (Math.abs(b.x * 73856093 ^ b.y * 19349663 ^ b.t.length * 83492791) % 997) / 997, v = Math.floor(sd * 4);
    c.save(); shapePath(c, sh || "full", w, h); c.clip();
    c.translate(w / 2, h / 2); c.rotate(v * Math.PI / 2); if (sd > 0.5) c.scale(-1, 1); c.translate(-w / 2, -h / 2);
    // Beule: leicht abgedunkelte, eingedrückte Ecke mit heller Kante
    c.fillStyle = "rgba(10,12,16,.22)"; c.beginPath(); c.moveTo(w * 0.55, 0); c.lineTo(w, 0); c.lineTo(w, h * 0.42); c.quadraticCurveTo(w * 0.72, h * 0.28, w * 0.55, 0); c.fill();
    c.strokeStyle = "rgba(255,255,255,.22)"; c.lineWidth = Math.max(0.6, s / 30); c.beginPath(); c.moveTo(w * 0.55, 0); c.quadraticCurveTo(w * 0.72, h * 0.28, w, h * 0.42); c.stroke();
    // zwei feine Risse
    c.strokeStyle = "rgba(14,15,18,.6)"; c.lineWidth = Math.max(0.6, s / 28);
    c.beginPath(); c.moveTo(w * (0.2 + sd * 0.15), h * 0.62); c.lineTo(w * 0.36, h * 0.5); c.lineTo(w * 0.44, h * 0.56); c.lineTo(w * 0.58, h * 0.44);
    c.moveTo(w * 0.36, h * 0.5); c.lineTo(w * 0.33, h * 0.36);
    c.stroke();
    c.restore();
  }

  // ---------- Hintergrund ----------
  var STARS = null, NEB = null;
  function stars() {
    if (STARS) return STARS;
    STARS = [];
    for (var l = 0; l < 3; l++) { var a = []; for (var i = 0; i < 220; i++) a.push([Math.random(), Math.random(), Math.random() * 0.8 + 0.3]); STARS.push(a); }
    var cv = document.createElement("canvas"); cv.width = cv.height = 512; var g = cv.getContext("2d");
    var gr = g.createRadialGradient(170, 200, 10, 170, 200, 260); gr.addColorStop(0, "rgba(90,60,140,.35)"); gr.addColorStop(1, "rgba(90,60,140,0)"); g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
    gr = g.createRadialGradient(380, 360, 10, 380, 360, 220); gr.addColorStop(0, "rgba(40,110,150,.28)"); gr.addColorStop(1, "rgba(40,110,150,0)"); g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
    NEB = cv; return STARS;
  }
  function drawSpace(c, W, H, ox, oy) {
    c.fillStyle = "#080B12"; c.fillRect(0, 0, W, H);
    stars();
    var nw = Math.max(W, H) * 1.4; c.globalAlpha = 0.9; c.drawImage(NEB, -((ox * 0.02) % nw) - nw * 0.2, -((oy * 0.02) % nw) - nw * 0.2, nw, nw); c.globalAlpha = 1;
    STARS.forEach(function (layer, li) {
      var par = [0.05, 0.12, 0.25][li], sz = [1, 1.4, 2][li];
      c.fillStyle = ["rgba(200,210,230,.5)", "rgba(220,228,245,.7)", "rgba(255,255,255,.9)"][li];
      layer.forEach(function (st) {
        var x = ((st[0] * W * 1.5 - ox * par) % (W * 1.5) + W * 1.5) % (W * 1.5) - W * 0.25, y = ((st[1] * H * 1.5 - oy * par) % (H * 1.5) + H * 1.5) % (H * 1.5) - H * 0.25;
        c.fillRect(x, y, sz * st[2], sz * st[2]);
      });
    });
  }

  // ---------- Editor zeichnen ----------
  function edDraw() {
    var c = V.ctx, W = V.W, H = V.H, z = V.zoom, s = PX * z;
    drawSpace(c, W, H, V.cam.x * s, V.cam.y * s);
    c.save(); c.translate(W / 2 - V.cam.x * s, H / 2 - V.cam.y * s);
    // Raster
    var x0 = Math.floor(V.cam.x - W / 2 / s) - 1, x1 = Math.ceil(V.cam.x + W / 2 / s) + 1, y0 = Math.floor(V.cam.y - H / 2 / s) - 1, y1 = Math.ceil(V.cam.y + H / 2 / s) + 1;
    c.strokeStyle = "rgba(120,150,190,.10)"; c.lineWidth = 1; c.beginPath();
    for (var gx = x0; gx <= x1; gx++) { c.moveTo(gx * s + 0.5, y0 * s); c.lineTo(gx * s + 0.5, y1 * s); }
    for (var gy = y0; gy <= y1; gy++) { c.moveTo(x0 * s, gy * s + 0.5); c.lineTo(x1 * s, gy * s + 0.5); }
    c.stroke();
    if (S.sym) { c.strokeStyle = "rgba(227,184,63,.6)"; c.setLineDash([6, 6]); c.lineWidth = 2; c.beginPath(); c.moveTo(0.5 * s, y0 * s); c.lineTo(0.5 * s, y1 * s); c.stroke(); c.setLineDash([]); }
    var tm = performance.now() / 1000, M = buildMap(S.blocks);
    // Räume einfärben (Innenansicht)
    var R = rooms(S.blocks);
    drawShip(c, S.blocks, s, S.view, tm, null, M);
    if (S.view === "in") R.forEach(function (rm) {
      c.fillStyle = rm.ok ? "rgba(90,190,255,.16)" : "rgba(224,83,63,.22)";
      rm.cells.forEach(function (q) { c.fillRect(q[0] * s, q[1] * s, s, s); });
      c.strokeStyle = "#E0533F"; c.lineWidth = Math.max(2, s / 8);
      rm.leaks.forEach(function (q) { var x = q[0] * s, y = q[1] * s; c.beginPath(); if (q[2] === 0) { c.moveTo(x, y); c.lineTo(x + s, y); } else if (q[2] === 1) { c.moveTo(x + s, y); c.lineTo(x + s, y + s); } else if (q[2] === 2) { c.moveTo(x, y + s); c.lineTo(x + s, y + s); } else { c.moveTo(x, y); c.lineTo(x, y + s); } c.stroke(); });
    });
    // lose Blöcke rot markieren
    var comps = components(S.blocks); if (comps.length > 1) {
      var main = comps.reduce(function (a, b) { return mainScore(b) > mainScore(a) ? b : a; });
      c.strokeStyle = "#E0533F"; c.lineWidth = 2;
      comps.forEach(function (cp) { if (cp === main) return; cp.forEach(function (b) { var f = fp(b); c.strokeRect(b.x * s + 1, b.y * s + 1, f[0] * s - 2, f[1] * s - 2); }); });
    }
    // Schwerpunkt
    if (S.blocks.length) {
      var stc = stats(S.blocks), mx = stc.com[0] * s, my = stc.com[1] * s, rr = Math.max(7, s * 0.38);
      c.fillStyle = "#151715"; c.beginPath(); c.arc(mx, my, rr, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#E3B83F"; c.beginPath(); c.moveTo(mx, my); c.arc(mx, my, rr, -Math.PI / 2, 0); c.closePath(); c.fill(); c.beginPath(); c.moveTo(mx, my); c.arc(mx, my, rr, Math.PI / 2, Math.PI); c.closePath(); c.fill();
      c.strokeStyle = "#E3B83F"; c.lineWidth = 1.5; c.beginPath(); c.arc(mx, my, rr, 0, Math.PI * 2); c.stroke();
    }
    // Flugrichtung
    var bb = bounds(S.blocks), ax = bb ? (bb.x0 + bb.x1) / 2 : 0.5, ay = bb ? bb.y0 - 1.6 : -3;
    c.fillStyle = "rgba(227,184,63,.9)"; c.beginPath(); c.moveTo(ax * s, (ay - 1.2) * s); c.lineTo((ax - 0.7) * s, ay * s); c.lineTo((ax + 0.7) * s, ay * s); c.closePath(); c.fill();
    c.fillStyle = "rgba(227,184,63,.9)"; c.font = "700 " + Math.max(10, 0.45 * s) + "px " + FONTS(); c.textAlign = "center"; c.fillText(t("dir"), ax * s, (ay + 0.7) * s);
    // Vorschau
    if (V.mouse && !V.pan) {
      var cx = Math.floor(V.mouse.x), cy = Math.floor(V.mouse.y);
      if (S.tool === "build") {
        var ghosts = V.row ? rowList() : [ghostAt(cx, cy, S.sel, S.r, S.f)];
        ghosts.forEach(function (g, gi) {
          var list = placeList(g), ok = !S.blocks.length || canPlace(g, M) || (V.row && gi > 0);
          list.forEach(function (q, i) {
            c.globalAlpha = 0.6; drawBlock(c, q, s, S.view, 1, tm); c.globalAlpha = 1;
            var f = fp(q); c.strokeStyle = ok ? "#57D18A" : "#E0533F"; c.lineWidth = 2; c.strokeRect(q.x * s, q.y * s, f[0] * s, f[1] * s);
            if (i === 0 && gi === 0) arrowFor(c, q, s);
          });
        });
        if (V.row && ghosts.length > 1) { c.fillStyle = "#57D18A"; c.font = "700 13px " + FONTS(); c.textAlign = "left"; c.fillText("× " + ghosts.length, (ghosts[ghosts.length - 1].x + 1.4) * s, (ghosts[ghosts.length - 1].y + 0.7) * s); }
      } else {
        var hb = blockAt(cx, cy, M), list2 = hb ? [hb] : [];
        if (hb && S.sym) { var o = blockAt(mirrorCell(cx), cy, M); if (o && o !== hb) list2.push(o); }
        list2.forEach(function (q) { var f = fp(q); c.strokeStyle = S.tool === "erase" ? "#E0533F" : S.color; c.lineWidth = 3; c.strokeRect(q.x * s, q.y * s, f[0] * s, f[1] * s); });
        if (!hb) { c.strokeStyle = "rgba(255,255,255,.3)"; c.lineWidth = 1; c.strokeRect(cx * s, cy * s, s, s); }
      }
    }
    c.restore();
    // Infokasten zum Block unter dem Mauszeiger: Name, Gewicht, Leben
    if (V.mouse && !V.pan && !V.row) {
      var hb2 = blockAt(Math.floor(V.mouse.x), Math.floor(V.mouse.y), M);
      if (hb2) {
        var ty2 = T[hb2.t], txt = ty2.n[lang] + " · " + kg(ty2.mass) + " · " + ty2.hp + " HP";
        c.font = "600 12px " + FONTS(); var tw = c.measureText(txt).width + 16, tx = Math.min(V.W - tw - 6, V.mouse.sx + 16), ty3 = Math.min(V.H - 30, V.mouse.sy + 18);
        c.fillStyle = "rgba(14,19,28,.94)"; c.fillRect(tx, ty3, tw, 24); c.strokeStyle = "#33415A"; c.lineWidth = 1; c.strokeRect(tx + 0.5, ty3 + 0.5, tw - 1, 23);
        c.fillStyle = "#E6EAF0"; c.textAlign = "left"; c.textBaseline = "middle"; c.fillText(txt, tx + 8, ty3 + 12.5); c.textBaseline = "alphabetic";
      }
    }
  }
  function kg(t) { return nf(Math.round(t * 1000)) + " kg"; }
  function arrowFor(c, b, s) {   // zeigt bei Triebwerken die Schubrichtung, bei Waffen die Schussrichtung
    var ty = T[b.t]; if (ty.kind !== "thr" && ty.kind !== "mg" && ty.kind !== "rg" && ty.kind !== "ms") return;
    var d = dirOut(b, 0), f = fp(b), cx = (b.x + f[0] / 2) * s, cy = (b.y + f[1] / 2) * s, L = Math.max(f[0], f[1]) * s * 0.5 + s * 0.8;
    var dx = DV[d][0], dy = DV[d][1], ex = cx + dx * L, ey = cy + dy * L;
    c.strokeStyle = ty.kind === "thr" ? "#57D18A" : "#E0533F"; c.fillStyle = c.strokeStyle; c.lineWidth = 2;
    c.beginPath(); c.moveTo(cx, cy); c.lineTo(ex, ey); c.stroke();
    c.beginPath(); c.moveTo(ex + dx * 8, ey + dy * 8); c.lineTo(ex - dy * 6, ey + dx * 6); c.lineTo(ex + dy * 6, ey - dx * 6); c.closePath(); c.fill();
  }
  function mainScore(cp) { return cp.length + (cp.some(function (b) { return T[b.t].kind === "cock"; }) ? 1e5 : 0); }
  function bounds(bl) {
    if (!bl.length) return null; var o = { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 };
    bl.forEach(function (b) { var f = fp(b); o.x0 = Math.min(o.x0, b.x); o.y0 = Math.min(o.y0, b.y); o.x1 = Math.max(o.x1, b.x + f[0]); o.y1 = Math.max(o.y1, b.y + f[1]); });
    return o;
  }
  // Schiff: erst Innenleben, dann Aufbauten; Panzerung zuletzt, damit Kanten sauber liegen
  var ORDER = { floor: 0, door: 0, wall: 1, cock: 2, bat: 2, reac: 2, gyro: 2, cool: 2, thr: 3, mg: 3, rg: 3, ms: 3, ant: 3, win: 4, armor: 4 };
  // Panzerung (und außen die Dächer) verschmilzt zu einer Hülle: Kanten nur dort, wo die Hülle endet
  function isHull(k, view) { return k === "armor" || k === "win" || (view === "out" && (k === "floor" || k === "wall" || k === "door")); }
  function drawShip(c, blocks, s, view, tm, body, M) {
    M = M || buildMap(blocks);
    var sorted = blocks.slice().sort(function (a, b) { return ORDER[T[a.t].kind] - ORDER[T[b.t].kind]; }), hull = [];
    sorted.forEach(function (b) {
      var ty = T[b.t], hpk = b.hp !== undefined ? b.hp / ty.hp : 1, o = null;
      if (isHull(ty.kind, view)) { hull.push(b); return; }
      if (body) o = { pilot: ty.kind === "cock" && body.ctrl && FL && FL.seated && b === body.seat, batK: body.cap ? body.energy / body.cap : 1, charge: b.chg ? Math.min(1, b.chg / RG.charge) : 0, reload: b.rl > 0 };
      drawBlock(c, b, s, view, hpk, tm, o);
    });
    hull.forEach(function (b) { hullFill(c, b, s, view, b.hp !== undefined ? b.hp / T[b.t].hp : 1); });
    hull.forEach(function (b) { hullEdges(c, b, s, M, view); });
  }
  function hullFill(c, b, s, view, hpk) {
    var ty = T[b.t], f = fp(b), w = ty.w * s, h = ty.h * s, k = ty.kind, col = b.c || ty.col, lw = Math.max(1, s / 16);
    c.save(); c.translate((b.x + f[0] / 2) * s, (b.y + f[1] / 2) * s); c.rotate(b.r * Math.PI / 2); if (b.f) c.scale(-1, 1); c.translate(-w / 2, -h / 2);
    if (k === "armor") {
      shapePath(c, ty.shape, w, h); c.fillStyle = col; c.fill();
      if (ty.heavy && ty.shape === "full") { c.fillStyle = shade(col, -0.25); [[0.2, 0.2], [0.8, 0.2], [0.2, 0.8], [0.8, 0.8]].forEach(function (q) { c.fillRect(w * q[0] - lw, h * q[1] - lw, lw * 2, lw * 2); }); }
      c.strokeStyle = shade(col, -0.55); c.lineWidth = lw * 1.2; c.beginPath();
      if (ty.shape.indexOf("ramp") === 0) { c.moveTo(0, 0); c.lineTo(w, h); }
      else if (ty.shape === "round") c.arc(0, h, w, -Math.PI / 2, 0);
      else if (ty.shape === "half") { c.moveTo(0, h / 2); c.lineTo(w, h / 2); c.moveTo(0, h / 2); c.lineTo(0, h); c.moveTo(w, h / 2); c.lineTo(w, h); }
      c.stroke();
      if (ty.shape !== "full") {   // Lichtkante an der schrägen Seite
        c.strokeStyle = shade(col, 0.25); c.lineWidth = lw; c.beginPath();
        if (ty.shape.indexOf("ramp") === 0) { c.moveTo(lw * 1.4, lw * 3); c.lineTo(w - lw * 2.5, h - lw * 1.2); }
        else if (ty.shape === "round") c.arc(0, h, w - lw * 1.6, -Math.PI / 2 + 0.12, -0.12);
        c.stroke();
      }
      if (hpk <= 0.5) damageMarks(c, w, h, b, s, ty.shape);
    } else if (k === "win") {
      c.fillStyle = shade(col, -0.1); c.fillRect(0, 0, w, h); c.fillStyle = GLASS; c.fillRect(w * 0.18, h * 0.18, w * 0.64, h * 0.64); c.fillStyle = GLASS2; c.fillRect(w * 0.22, h * 0.22, w * 0.2, h * 0.56);
      if (hpk <= 0.5) damageMarks(c, w, h, b, s, "full");
    } else {
      c.fillStyle = shade(col, 0.06); c.fillRect(0, 0, w, h);
      if (k === "door") { c.fillStyle = "#D9A21B"; c.fillRect(w * 0.42, h * 0.12, w * 0.16, h * 0.76); }
    }
    c.restore();
  }
  function hullEdges(c, b, s, M, view) {
    var ty = T[b.t], col = b.c || ty.col, lw = Math.max(1, s / 14), dark = shade(col, -0.55), lite = shade(col, 0.24), shd = shade(col, -0.28);
    cellsOf(b).forEach(function (q) {
      var x = q.c[0] * s, y = q.c[1] * s;
      for (var d = 0; d < 4; d++) {
        if (!edgeRule(ty, q.lx, q.ly, dirIn(b, d)).s && ty.kind === "armor") continue;
        var o = M.get(key(q.c[0] + DV[d][0], q.c[1] + DV[d][1]));
        if (o && o.b === b) continue;
        var merged = o && isHull(T[o.b.t].kind, view) && edgeRule(T[o.b.t], o.lx, o.ly, dirIn(o.b, (d + 2) % 4)).s;
        var e = d === 0 ? [x, y, x + s, y, 0, 1] : d === 1 ? [x + s, y, x + s, y + s, -1, 0] : d === 2 ? [x, y + s, x + s, y + s, 0, -1] : [x, y, x, y + s, 1, 0];
        if (merged) {   // Farbwechsel innerhalb der Hülle: feine Naht
          if ((d === 1 || d === 2) && (o.b.c || T[o.b.t].col) !== col) { c.strokeStyle = "rgba(0,0,0,.28)"; c.lineWidth = lw * 0.7; c.beginPath(); c.moveTo(e[0], e[1]); c.lineTo(e[2], e[3]); c.stroke(); }
          continue;
        }
        c.strokeStyle = d === 0 || d === 3 ? lite : shd; c.lineWidth = lw * 1.3; c.beginPath(); c.moveTo(e[0] + e[4] * lw * 1.6, e[1] + e[5] * lw * 1.6); c.lineTo(e[2] + e[4] * lw * 1.6, e[3] + e[5] * lw * 1.6); c.stroke();
        c.strokeStyle = dark; c.lineWidth = lw; c.beginPath(); c.moveTo(e[0] + e[4] * lw * 0.5, e[1] + e[5] * lw * 0.5); c.lineTo(e[2] + e[4] * lw * 0.5, e[3] + e[5] * lw * 0.5); c.stroke();
      }
    });
  }
  function FONTS() { return getComputedStyle(document.documentElement).getPropertyValue("--f-display") || "sans-serif"; }

  // ---------- Testflug ----------
  var FL = null;
  var MG = { rate: 12, speed: 420, life: 1.25, dmg: 7, heat: 0.042, cool: 0.42, warn: 0.78, lock: 3.2, e: 0.4 };
  var MS = { v0: 30, acc: 420, vmax: 340, turn: 0.45, life: 4, dmg: 55, splash: 2.6, sdmg: 28, reload: 1.4, e: 6 };
  var RG = { charge: 0.7, cd: 2.2, dmg: 150, range: 700, e: 45 };
  function makeBody(blocks, ctrl) {
    var bd = { blocks: blocks, x: 0, y: 0, a: 0, vx: 0, vy: 0, w: 0, ctrl: !!ctrl, energy: 0, cap: 0, flames: {} };
    blocks.forEach(function (b) { if (b.hp === undefined) b.hp = T[b.t].hp; });
    recalc(bd, true);
    bd.energy = bd.cap;
    return bd;
  }
  function recalc(bd, first) {
    var st = stats(bd.blocks), old = bd.com;
    bd.com = st.com; bd.mass = Math.max(0.5, st.mass); bd.I = Math.max(1, st.I); bd.thr = st.thr; bd.torque = st.torque; bd.prod = st.prod;
    bd.cap = st.cap + (st.cock ? 30 : 0); bd.energy = Math.min(bd.energy, bd.cap);
    bd.map = buildMap(bd.blocks);
    bd.cool = coolMap(bd.blocks, bd.map); bd.ocMax = ocMaxOf(bd.blocks, bd.cool);
    bd.seat = bd.blocks.filter(function (b) { return T[b.t].kind === "cock"; })[0] || null;
    var r = 0; bd.blocks.forEach(function (b) { var f = fp(b); [[b.x, b.y], [b.x + f[0], b.y + f[1]]].forEach(function (p) { r = Math.max(r, Math.hypot(p[0] - bd.com[0], p[1] - bd.com[1])); }); }); bd.rad = r * CELL_M + 2;
    if (!first && old) { var dx = (bd.com[0] - old[0]) * CELL_M, dy = (bd.com[1] - old[1]) * CELL_M, ca = Math.cos(bd.a), sa = Math.sin(bd.a); bd.x += dx * ca - dy * sa; bd.y += dx * sa + dy * ca; }
  }
  function toWorld(bd, cx, cy) { var lx = (cx - bd.com[0]) * CELL_M, ly = (cy - bd.com[1]) * CELL_M, ca = Math.cos(bd.a), sa = Math.sin(bd.a); return { x: bd.x + lx * ca - ly * sa, y: bd.y + lx * sa + ly * ca }; }
  function toLocal(bd, x, y) { var dx = x - bd.x, dy = y - bd.y, ca = Math.cos(bd.a), sa = Math.sin(bd.a); return { x: (dx * ca + dy * sa) / CELL_M + bd.com[0], y: (-dx * sa + dy * ca) / CELL_M + bd.com[1] }; }
  function dirWorld(bd, d) { var v = DV[d], ca = Math.cos(bd.a), sa = Math.sin(bd.a); return { x: v[0] * ca - v[1] * sa, y: v[0] * sa + v[1] * ca }; }
  function blockCenter(bd, b) { var f = fp(b); return toWorld(bd, b.x + f[0] / 2, b.y + f[1] / 2); }

  function startTest() {
    var st = stats(S.blocks);
    if (!st.cock) { note(t("noCockTest")); return; }
    var comps = components(S.blocks), main = comps.reduce(function (a, b) { return mainScore(b) > mainScore(a) ? b : a; });
    var copy = main.map(function (b) { return { t: b.t, x: b.x, y: b.y, r: b.r, f: b.f, c: b.c }; });
    var me = makeBody(copy, true);
    FL = { bodies: [me], me: me, shots: [], beams: [], parts: [], seated: true, damp: true, wsel: 0, groups: [], keys: {}, mdx: 0, cam: { x: 0, y: 0 }, zoom: 1, t: 0 };
    var sp0 = seatPos(me); FL.pilot = { x: sp0.x, y: sp0.y, face: -Math.PI / 2, ph: 0 };
    FL.oc = false; FL.ocT = me.ocMax;
    FL.groups = []; if (st.mg) FL.groups.push("mg"); if (st.ms) FL.groups.push("ms"); if (st.rg) FL.groups.push("rg");
    FL.missiles = [];
    spawnTargets();
    S.mode = "fly"; V.zoomEd = V.zoom; V.zoom = Math.min(1.1, Math.max(0.6, V.zoom));
    syncUI();
  }
  function stopTest() { FL = null; S.mode = "edit"; if (V.zoomEd) V.zoom = V.zoomEd; syncUI(); }
  // Zielschiffe: Panzerung mit ein paar Maschinenteilen, damit Rauch und Feuer sichtbar werden
  function targetShip() {
    var B = [];
    for (var y = 0; y < 5; y++) for (var x = -3; x <= 3; x++) {
      var edge = x === -3 || x === 3 || y === 0 || y === 4;
      B.push({ t: edge ? (y === 0 ? "hblk" : "lblk") : (x === 0 && y === 2 ? "rea" : "flo"), x: x, y: y, r: 0, f: 0, c: edge && y === 0 ? "#B9573E" : undefined });
    }
    B = B.filter(function (b) { return !(b.x >= 0 && b.x <= 1 && b.y >= 2 && b.y <= 3 && !(b.x === 0 && b.y === 2)); });
    B = B.filter(function (b) { return b.t !== "flo" || !(b.x === 0 && b.y === 2); });
    B.push({ t: "gyr", x: -1, y: 2, r: 0, f: 0 }); B.push({ t: "bat", x: 2, y: 2, r: 0, f: 0 });
    B = B.filter(function (b) { return !(b.t === "flo" && ((b.x === -1 && b.y === 2) || (b.x === 2 && b.y === 2))); });
    B.push({ t: "ths", x: -2, y: 5, r: 0, f: 0 }); B.push({ t: "ths", x: 2, y: 5, r: 0, f: 0 });
    return B;
  }
  function spawnTargets() {
    FL.bodies = FL.bodies.filter(function (b) { return b === FL.me; });
    [[0, -110, 0.2], [85, -70, -0.6], [-95, -55, 0.9]].forEach(function (p) {
      var bd = makeBody(targetShip(), false); bd.x = FL.me.x + p[0]; bd.y = FL.me.y + p[1]; bd.a = p[2]; bd.w = (Math.random() - 0.5) * 0.15; bd.target = true;
      FL.bodies.push(bd);
    });
  }

  function flTick(dt) {
    FL.t += dt;
    if (FL.oc) { FL.ocT -= dt; if (FL.ocT <= 0) { FL.ocT = 0; FL.oc = false; } }
    else FL.ocT = Math.min(FL.me.ocMax || 3, FL.ocT + dt * 0.5);
    var me = FL.me, k = FL.keys;
    FL.bodies.forEach(function (bd) {
      // Energie: Reaktoren laden, Verbraucher ziehen
      bd.energy = Math.min(bd.cap, bd.energy + bd.prod * dt);
      bd.flames = {};
      if (bd === me && bd.ctrl && bd.seat) control(bd, dt, FL.seated);   // ohne Pilot halten nur die Dämpfer das Schiff
      if (bd === me && !FL.seated) walk(bd, dt);
      bd.x += bd.vx * dt; bd.y += bd.vy * dt; bd.a += bd.w * dt;
      bd.blocks.forEach(function (b) {
        var ty = T[b.t];
        if (ty.kind === "mg") { var cn = (bd.cool && bd.cool.get(b)) || 0; if (b.oh > 0) { b.oh -= dt; if (b.oh <= 0) { b.oh = 0; b.heat = 0; } } else if (!b.firing) b.heat = Math.max(0, (b.heat || 0) - MG.cool * (1 + 0.6 * cn) * dt); b.firing = false; }
        if (ty.kind === "ms" && b.rl > 0) b.rl -= dt;
        if (ty.kind === "rg") { if (b.cd > 0) b.cd -= dt; if (!b.holding) b.chg = 0; b.holding = false; }
        var hk = b.hp / ty.hp;
        if (MECH[ty.kind] && hk < 0.5 && Math.random() < dt * (hk < 0.25 ? 5 : 2.5)) { var p = blockCenter(bd, b); FL.parts.push({ x: p.x + (Math.random() - 0.5) * 2, y: p.y + (Math.random() - 0.5) * 2, vx: bd.vx + (Math.random() - 0.5) * 3, vy: bd.vy - 1.5 - Math.random() * 2, life: 0, max: 1.4 + Math.random() * 0.8, k: "smoke", sz: 0.5 + Math.random() * 0.5 }); }
        if (MECH[ty.kind] && hk < 0.25 && Math.random() < dt * 9) { var q = blockCenter(bd, b); FL.parts.push({ x: q.x + (Math.random() - 0.5) * 1.6, y: q.y + (Math.random() - 0.5) * 1.6, vx: bd.vx + (Math.random() - 0.5) * 4, vy: bd.vy + (Math.random() - 0.5) * 4, life: 0, max: 0.4 + Math.random() * 0.3, k: "fire", sz: 0.45 + Math.random() * 0.45 }); }
      });
    });
    // Geschosse
    FL.shots = FL.shots.filter(function (p) {
      p.life += dt; if (p.life > MG.life) return false;
      var steps = Math.ceil(Math.hypot(p.vx, p.vy) * dt / 1.0);
      for (var i = 0; i < steps; i++) {
        p.x += p.vx * dt / steps; p.y += p.vy * dt / steps;
        var hit = hitAt(p.x, p.y, p.own); if (hit) { damage(hit.bd, hit.b, MG.dmg, p.x, p.y); spark(p.x, p.y, 5); return false; }
      }
      return true;
    });
    FL.beams = FL.beams.filter(function (b) { b.life += dt; return b.life < 0.3; });
    // Leichte Raketen: starke Beschleunigung, lenken nur ganz leicht zum Mauszeiger
    var mw = mouseWorld();
    FL.missiles = (FL.missiles || []).filter(function (m) {
      m.life += dt; if (m.life > MS.life) { blast(m.x, m.y, MS.splash, MS.sdmg, m.own); return false; }
      if (mw) { var want = Math.atan2(mw.y - m.y, mw.x - m.x), dh = Math.atan2(Math.sin(want - m.h), Math.cos(want - m.h)); m.h += Math.max(-MS.turn * dt, Math.min(MS.turn * dt, dh)); }
      var sp = Math.hypot(m.vx, m.vy), ns = Math.min(MS.vmax, sp + MS.acc * dt);
      // Geschwindigkeit dreht mit der Nase mit
      m.vx = Math.cos(m.h) * ns; m.vy = Math.sin(m.h) * ns;
      if (Math.random() < 0.9) FL.parts.push({ x: m.x, y: m.y, vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2, life: 0, max: 0.7 + Math.random() * 0.4, k: "smoke", sz: 0.35 + Math.random() * 0.25 });
      var steps = Math.ceil(ns * dt / 1.0);
      for (var i = 0; i < steps; i++) {
        m.x += m.vx * dt / steps; m.y += m.vy * dt / steps;
        var hit = hitAt(m.x, m.y, m.own); if (hit) { damage(hit.bd, hit.b, MS.dmg, m.x, m.y); blast(m.x, m.y, MS.splash, MS.sdmg, null); return false; }
      }
      return true;
    });
    FL.parts = FL.parts.filter(function (q) { q.life += dt; q.x += q.vx * dt; q.y += q.vy * dt; if (q.k === "debris") { q.a += q.w * dt; } return q.life < q.max; });
    if (FL.parts.length > 900) FL.parts.splice(0, FL.parts.length - 900);
    FL.cam.x = me.x; FL.cam.y = me.y;
  }
  // ---------- zu Fuß im Schiff ----------
  function localPt(b, lx, ly) {
    var ty = T[b.t], w = ty.w, h = ty.h, x = b.f ? w - lx : lx, y = ly;
    for (var i = 0; i < b.r; i++) { var nx = h - y, ny = x; x = nx; y = ny; var tw = w; w = h; h = tw; }
    return { x: b.x + x, y: b.y + y };
  }
  function seatPos(bd) { var b = bd.seat; if (!b) return { x: bd.com[0], y: bd.com[1] }; var ty = T[b.t]; return localPt(b, ty.w / 2, (ty.h > 3 ? 1.6 : 1.2) + 0.95); }
  function walkable(bd, x, y) {
    var o = bd.map.get(key(Math.floor(x), Math.floor(y))); if (!o) return false;
    var k = T[o.b.t].kind; return k === "floor" || k === "door" || (k === "cock" && o.ly >= 1);
  }
  function canStand(bd, x, y) { var r = 0.24; return walkable(bd, x - r, y - r) && walkable(bd, x + r, y - r) && walkable(bd, x - r, y + r) && walkable(bd, x + r, y + r); }
  function walk(bd, dt) {
    var P = FL.pilot, k = FL.keys, dx = (k.d ? 1 : 0) - (k.a ? 1 : 0), dy = (k.s ? 1 : 0) - (k.w ? 1 : 0);
    if (dx || dy) {   // Bildschirmrichtung → Schiffsrahmen
      var l = Math.hypot(dx, dy), ca = Math.cos(bd.a), sa = Math.sin(bd.a), lx = (dx * ca + dy * sa) / l, ly = (-dx * sa + dy * ca) / l, sp = 2.2 * dt;
      if (canStand(bd, P.x + lx * sp, P.y)) P.x += lx * sp;
      if (canStand(bd, P.x, P.y + ly * sp)) P.y += ly * sp;
      var want = Math.atan2(ly, lx), d = Math.atan2(Math.sin(want - P.face), Math.cos(want - P.face)); P.face += d * Math.min(1, dt * 14);
      P.ph += dt * 10;
    } else P.ph *= Math.pow(0.001, dt);
    // Schweißgerät: repariert den Block direkt vor der Figur
    FL.welding = false; FL.weldB = null;
    if (FL.fire) {
      var tx = P.x + Math.cos(P.face) * 0.8, ty = P.y + Math.sin(P.face) * 0.8, o = bd.map.get(key(Math.floor(tx), Math.floor(ty)));
      FL.welding = true;
      if (o) {
        var mx = T[o.b.t].hp; FL.weldB = o.b;
        if (o.b.hp < mx) {
          o.b.hp = Math.min(mx, o.b.hp + 30 * dt);
          if (Math.random() < dt * 40) { var wp = toWorld(bd, tx, ty), a = Math.random() * 6.28, v = 3 + Math.random() * 6; FL.parts.push({ x: wp.x, y: wp.y, vx: bd.vx + Math.cos(a) * v, vy: bd.vy + Math.sin(a) * v, life: 0, max: 0.15 + Math.random() * 0.2, k: "weld", sz: 0.25 }); }
        }
      }
    }
  }
  function toggleSeat() {
    var me = FL.me;
    if (FL.seated) { FL.seated = false; var sp = seatPos(me); FL.pilot.x = sp.x; FL.pilot.y = sp.y; FL.pilot.face = me.seat ? dirAngle(me.seat) : 0; if (S.view !== "in") { S.view = "in"; syncUI(); } return; }
    if (!me.seat) return;
    var p = seatPos(me); if (Math.hypot(p.x - FL.pilot.x, p.y - FL.pilot.y) > 1.5) { note(t("tooFar")); return; }
    FL.seated = true;
  }
  function dirAngle(b) { var d = dirOut(b, 2); return Math.atan2(DV[d][1], DV[d][0]); }
  function control(bd, dt, input) {
    var k = FL.keys, ca = Math.cos(bd.a), sa = Math.sin(bd.a);
    var vl = { x: bd.vx * ca + bd.vy * sa, y: -bd.vx * sa + bd.vy * ca };    // Tempo im Schiffsrahmen (−y = vorne)
    var inX = input ? (k.d ? 1 : 0) - (k.a ? 1 : 0) : 0, inY = input ? (k.s ? 1 : 0) - (k.w ? 1 : 0) : 0;
    var acc = { x: 0, y: 0 }, use = 0, thr = bd.thr, m = bd.mass;
    // Triebwerke sind träge: nach 0,2 s halbe, nach 1 s volle Leistung; Overcharge +50 % Schub und Verbrauch
    var sp = bd.spool || (bd.spool = [0, 0, 0, 0]), cmd = [0, 0, 0, 0], oc = FL.oc ? 1.5 : 1;
    function spoolK(x) { return x < 0.2 ? x * 2.5 : 0.5 + 0.5 * Math.min(1, (x - 0.2) / 0.8); }
    function axis(inp, v, posD, negD, comp) {   // posD: Richtung mit Schub in +Achse
      var want = 0, d = -1;
      if (inp > 0) { d = posD; want = 1; }
      else if (inp < 0) { d = negD; want = 1; }
      else if (FL.damp && Math.abs(v) > 0.02) {   // Dämpfer: gegensteuern bis Stillstand
        d = v > 0 ? negD : posD; var need = Math.abs(v) * m / dt; want = thr[d] ? Math.min(1, need / (thr[d] * oc)) : 0;
      }
      if (d < 0 || !thr[d] || !want) return;
      cmd[d] = want;
      var eff = want * spoolK(sp[d]), F = thr[d] * oc * eff, a = F / m, sign = (d === posD) ? 1 : -1;
      if (inp === 0) a = Math.min(a, Math.abs(v) / dt);
      acc[comp] += sign * a; use += eff * oc * useOf(bd, d) * dt; bd.flames[d] = Math.max(bd.flames[d] || 0, eff);
    }
    axis(inX, vl.x, 1, 3, "x"); axis(inY, vl.y, 2, 0, "y");
    for (var di = 0; di < 4; di++) sp[di] = cmd[di] ? Math.min(1, sp[di] + dt) : Math.max(0, sp[di] - dt * 2.5);
    // Energie reicht nicht: Schub anteilig kürzen
    var scale = 1; if (use > bd.energy) { scale = bd.energy > 0 ? bd.energy / use : 0; }
    bd.energy = Math.max(0, bd.energy - use * scale);
    acc.x *= scale; acc.y *= scale; for (var fk in bd.flames) bd.flames[fk] *= scale;
    vl.x += acc.x * dt; vl.y += acc.y * dt;
    bd.vx = vl.x * ca - vl.y * sa; bd.vy = vl.x * sa + vl.y * ca;
    // Drehen nur mit Gyroskop; ohne Eingabe stabilisiert es die Drehung
    if (bd.torque > 0 && bd.energy > 0) {
      var target = input ? ((k.e ? 1 : 0) - (k.q ? 1 : 0)) * 2.4 : 0;
      if (input && k.shift && FL.mdx) target = Math.max(-3, Math.min(3, FL.mdx * 0.08));
      var al = bd.torque / bd.I, dw = target - bd.w, step = Math.sign(dw) * Math.min(Math.abs(dw), al * dt);
      bd.w += step; if (Math.abs(step) > 1e-4) bd.energy = Math.max(0, bd.energy - 3 * dt * Math.min(1, Math.abs(dw)));
    }
    FL.mdx *= Math.pow(0.0005, dt);
    // Waffen
    var g = input ? FL.groups[FL.wsel] : null;
    if (FL.fire && g === "mg") bd.blocks.forEach(function (b) {
      if (T[b.t].kind !== "mg" || b.oh > 0) return;
      b.firing = true; b.cool2 = (b.cool2 || 0) - dt;
      if (b.cool2 > 0) return;
      if (bd.energy < MG.e) return;
      b.cool2 = 1 / MG.rate; bd.energy -= MG.e;
      var d = dirWorld(bd, dirOut(b, 0)), f = fp(b), tip = muzzle(bd, b);
      FL.shots.push({ x: tip.x, y: tip.y, vx: bd.vx + d.x * MG.speed + (Math.random() - 0.5) * 6, vy: bd.vy + d.y * MG.speed + (Math.random() - 0.5) * 6, life: 0, own: bd });
      FL.parts.push({ x: tip.x, y: tip.y, vx: bd.vx, vy: bd.vy, life: 0, max: 0.06, k: "flash", sz: 1.4 });
      var cn2 = (bd.cool && bd.cool.get(b)) || 0;
      b.heat = (b.heat || 0) + MG.heat / (1 + 0.35 * cn2);
      if (b.heat >= 1) { b.heat = 1; b.oh = b.ohMax = MG.lock / (1 + 0.3 * cn2); for (var i = 0; i < 10; i++) FL.parts.push({ x: tip.x, y: tip.y, vx: bd.vx + (Math.random() - 0.5) * 6, vy: bd.vy + (Math.random() - 0.5) * 6, life: 0, max: 1 + Math.random(), k: "smoke", sz: 1 + Math.random() }); }
    });
    if (FL.fire && g === "ms") bd.blocks.forEach(function (b) {
      if (T[b.t].kind !== "ms" || b.rl > 0 || bd.energy < MS.e) return;
      b.rl = MS.reload; bd.energy -= MS.e;
      var d = dirWorld(bd, dirOut(b, 0)), tip = muzzle(bd, b);
      FL.missiles.push({ x: tip.x, y: tip.y, vx: bd.vx + d.x * MS.v0, vy: bd.vy + d.y * MS.v0, h: Math.atan2(d.y, d.x), life: 0, own: bd });
    });
    if (FL.fire && g === "rg") bd.blocks.forEach(function (b) {
      if (T[b.t].kind !== "rg" || b.cd > 0) return;
      b.holding = true;
      if (bd.energy < RG.e && !b.chg) return;
      b.chg = (b.chg || 0) + dt;
      if (b.chg >= RG.charge) { b.chg = 0; b.cd = RG.cd; bd.energy = Math.max(0, bd.energy - RG.e); fireRail(bd, b); }
    });
  }
  function useOf(bd, d) { var u = 0; bd.blocks.forEach(function (b) { var ty = T[b.t]; if (ty.kind === "thr" && thrustDir(b) === d) u += ty.use; }); return u; }
  function muzzle(bd, b) {
    var ty = T[b.t], d = dirOut(b, 0), f = fp(b), cx = b.x + f[0] / 2 + DV[d][0] * (ty.h / 2 + 0.1), cy = b.y + f[1] / 2 + DV[d][1] * (ty.h / 2 + 0.1);
    return toWorld(bd, cx, cy);
  }
  function fireRail(bd, b) {
    var d = dirWorld(bd, dirOut(b, 0)), p = muzzle(bd, b), left = RG.dmg, end = { x: p.x + d.x * RG.range, y: p.y + d.y * RG.range }, hits = 0, lastB = null;
    for (var s = 0; s < RG.range; s += 0.8) {
      var x = p.x + d.x * s, y = p.y + d.y * s, h = hitAt(x, y, bd);
      if (h && h.b !== lastB) { lastB = h.b; damage(h.bd, h.b, left, x, y); spark(x, y, 10); left *= 0.55; hits++; if (hits >= 3) { end = { x: x, y: y }; break; } }
    }
    FL.beams.push({ x0: p.x, y0: p.y, x1: end.x, y1: end.y, life: 0 });
  }
  function mouseWorld() {
    if (!V.mouse) return null; var ppm = PX * V.zoom / CELL_M;
    return { x: FL.cam.x + (V.mouse.sx - V.W / 2) / ppm, y: FL.cam.y + (V.mouse.sy - V.H / 2) / ppm };
  }
  // Flächenschaden um einen Punkt (Raketen, explodierende Triebwerke und Reaktoren)
  function blast(x, y, r, dmg, skip) {
    FL.parts.push({ x: x, y: y, vx: 0, vy: 0, life: 0, max: 0.22, k: "flash", sz: r * 1.3 });
    for (var i = 0; i < 10; i++) FL.parts.push({ x: x, y: y, vx: (Math.random() - 0.5) * 14, vy: (Math.random() - 0.5) * 14, life: 0, max: 0.35 + Math.random() * 0.35, k: "fire", sz: 0.8 + Math.random() * r * 0.4 });
    var hits = [];
    FL.bodies.forEach(function (bd) {
      if (bd === skip || Math.abs(x - bd.x) > bd.rad + r || Math.abs(y - bd.y) > bd.rad + r) return;
      bd.blocks.forEach(function (b) { var p = blockCenter(bd, b), d = Math.hypot(p.x - x, p.y - y); if (d < r) hits.push({ bd: bd, b: b, dmg: dmg * (1 - d / r * 0.7) }); });
    });
    hits.forEach(function (h) { damage(h.bd, h.b, h.dmg, x, y); });
  }
  function hitAt(x, y, own) {
    for (var i = 0; i < FL.bodies.length; i++) {
      var bd = FL.bodies[i]; if (bd === own) continue;
      if (Math.abs(x - bd.x) > bd.rad || Math.abs(y - bd.y) > bd.rad) continue;
      var l = toLocal(bd, x, y), o = bd.map.get(key(Math.floor(l.x), Math.floor(l.y)));
      if (o) return { bd: bd, b: o.b };
    }
    return null;
  }
  function spark(x, y, n) { for (var i = 0; i < n; i++) { var a = Math.random() * 6.28, v = 8 + Math.random() * 18; FL.parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: 0.2 + Math.random() * 0.25, k: "spark", sz: 0.4 }); } }
  // Schaden: bei 0 Leben fällt der Block weg, lose Teile treiben als eigene Trümmer davon
  function damage(bd, b, dmg, x, y) {
    if (FL.bodies.indexOf(bd) < 0 || bd.blocks.indexOf(b) < 0) return;   // schon zerstört (Kettenreaktion)
    b.hp -= dmg;
    if (b.hp > 0) return;
    var p = blockCenter(bd, b), col = b.c || T[b.t].col;
    for (var i = 0; i < 8; i++) { var a = Math.random() * 6.28, v = 4 + Math.random() * 10; FL.parts.push({ x: p.x, y: p.y, vx: bd.vx + Math.cos(a) * v, vy: bd.vy + Math.sin(a) * v, life: 0, max: 1.5 + Math.random(), k: "debris", sz: 0.5 + Math.random() * 0.7, col: col, a: Math.random() * 6, w: (Math.random() - 0.5) * 10 }); }
    for (i = 0; i < 6; i++) FL.parts.push({ x: p.x, y: p.y, vx: bd.vx + (Math.random() - 0.5) * 8, vy: bd.vy + (Math.random() - 0.5) * 8, life: 0, max: 0.35 + Math.random() * 0.3, k: "fire", sz: 1.2 + Math.random() });
    FL.parts.push({ x: p.x, y: p.y, vx: bd.vx, vy: bd.vy, life: 0, max: 0.18, k: "flash", sz: 4 });
    bd.blocks.splice(bd.blocks.indexOf(b), 1);
    if (!bd.blocks.length) FL.bodies.splice(FL.bodies.indexOf(bd), 1); else splitBody(bd);
    // Triebwerke und Reaktoren explodieren und beschädigen, was direkt drumherum liegt
    var kd = T[b.t].kind;
    if (kd === "reac") blast(p.x, p.y, 3.2 * CELL_M, 85, null);
    else if (kd === "thr") blast(p.x, p.y, (T[b.t].w > 1 ? 2.4 : 1.8) * CELL_M, T[b.t].w > 1 ? 60 : 40, null);
  }
  function splitBody(bd) {
    var comps = components(bd.blocks);
    if (comps.length <= 1) { recalc(bd); return; }
    var keep = comps.reduce(function (a, c) { return mainScore(c) > mainScore(a) ? c : a; });
    comps.forEach(function (cp) {
      if (cp === keep) return;
      var nb = { blocks: cp, x: 0, y: 0, a: bd.a, vx: bd.vx, vy: bd.vy, w: bd.w + (Math.random() - 0.5) * 0.8, ctrl: false, energy: 0, cap: 0, flames: {} };
      var st = stats(cp), c = toWorld(bd, st.com[0], st.com[1]);
      recalc(nb, true); nb.x = c.x; nb.y = c.y;
      var rx = c.x - bd.x, ry = c.y - bd.y, l = Math.hypot(rx, ry) || 1;
      nb.vx += -bd.w * ry + rx / l * (2 + Math.random() * 3); nb.vy += bd.w * rx + ry / l * (2 + Math.random() * 3);
      FL.bodies.push(nb);
    });
    bd.blocks = keep; recalc(bd);
    if (bd === FL.me && !bd.seat) FL.seated = false;
  }

  function flDraw() {
    var c = V.ctx, W = V.W, H = V.H, z = V.zoom, s = PX * z, ppm = s / CELL_M, tm = performance.now() / 1000;
    drawSpace(c, W, H, FL.cam.x * ppm, FL.cam.y * ppm);
    c.save(); c.translate(W / 2, H / 2); c.scale(ppm, ppm); c.translate(-FL.cam.x, -FL.cam.y);
    // Triebwerksflammen unter den Schiffen
    FL.bodies.forEach(function (bd) {
      bd.blocks.forEach(function (b) {
        var ty = T[b.t]; if (ty.kind !== "thr") return;
        var d = thrustDir(b), fk = bd.flames[d] || 0; if (fk < 0.02) return;
        var ex = dirWorld(bd, (d + 2) % 4), f = fp(b), base = toWorld(bd, b.x + f[0] / 2 + DV[(d + 2) % 4][0] * ty.h / 2, b.y + f[1] / 2 + DV[(d + 2) % 4][1] * ty.h / 2);
        var ocx = bd === FL.me && FL.oc, L = (ty.w + 1) * CELL_M * (0.2 + 1.1 * fk) * (ocx ? 1.45 : 1) * (0.88 + Math.random() * 0.24), wd = ty.w * CELL_M * (0.18 + 0.16 * fk) * (ocx ? 1.2 : 1);
        var gr = c.createLinearGradient(base.x, base.y, base.x + ex.x * L, base.y + ex.y * L);
        if (ocx) { gr.addColorStop(0, "rgba(255,255,255,.98)"); gr.addColorStop(0.3, "rgba(200,140,255,.85)"); gr.addColorStop(1, "rgba(150,80,255,0)"); }
        else { gr.addColorStop(0, "rgba(190,240,255,.95)"); gr.addColorStop(0.35, "rgba(90,170,255,.7)"); gr.addColorStop(1, "rgba(60,100,255,0)"); }
        if (ocx) {   // Overcharge: wilder, ausfransender Strahl statt spitzer Flamme
          var ang = Math.atan2(ex.y, ex.x);
          c.save(); c.translate(base.x, base.y); c.rotate(ang);
          for (var lb = 0; lb < 7; lb++) {
            var la = (Math.random() - 0.5) * 0.7, ll = L * (0.45 + Math.random() * 0.7), lwd = wd * (0.45 + Math.random() * 0.8);
            var g2 = c.createLinearGradient(0, 0, ll, 0); g2.addColorStop(0, "rgba(255,255,255,.9)"); g2.addColorStop(0.35, "rgba(205,150,255,.6)"); g2.addColorStop(1, "rgba(140,70,255,0)");
            c.save(); c.rotate(la); c.fillStyle = g2; c.beginPath(); c.moveTo(0, -wd * 0.8);
            c.quadraticCurveTo(ll * 0.45, -lwd * 1.3, ll, -lwd * (0.3 + Math.random() * 0.5)); c.lineTo(ll * (0.85 + Math.random() * 0.2), 0); c.lineTo(ll, lwd * (0.3 + Math.random() * 0.5));
            c.quadraticCurveTo(ll * 0.45, lwd * 1.3, 0, wd * 0.8); c.closePath(); c.fill(); c.restore();
          }
          c.fillStyle = "rgba(255,255,255,.85)"; c.beginPath(); c.ellipse(wd * 0.3, 0, wd * 0.8, wd * 0.6, 0, 0, Math.PI * 2); c.fill();
          c.restore();
          if (Math.random() < 0.6) { var sa = ang + (Math.random() - 0.5) * 0.9, sv = 25 + Math.random() * 30; FL.parts.push({ x: base.x, y: base.y, vx: bd.vx + Math.cos(sa) * sv, vy: bd.vy + Math.sin(sa) * sv, life: 0, max: 0.25 + Math.random() * 0.3, k: "ocs", sz: 0.4 }); }
        } else { c.fillStyle = gr; c.beginPath(); c.moveTo(base.x - ex.y * wd, base.y + ex.x * wd); c.lineTo(base.x + ex.x * L, base.y + ex.y * L); c.lineTo(base.x + ex.y * wd, base.y - ex.x * wd); c.closePath(); c.fill(); }
      });
    });
    FL.bodies.forEach(function (bd) {
      c.save(); c.translate(bd.x, bd.y); c.rotate(bd.a); c.scale(CELL_M / PX, CELL_M / PX); c.translate(-bd.com[0] * PX, -bd.com[1] * PX);
      drawShip(c, bd.blocks, PX, S.view, tm, bd, bd.map);
      if (bd === FL.me && !FL.seated) drawAstronaut(c, FL.pilot.x * PX, FL.pilot.y * PX, FL.pilot.face, FL.pilot.ph, PX / 24 * 1.25, FL.welding);
      // Überhitzung und Ladung an den Waffen
      bd.blocks.forEach(function (b) {
        var ty = T[b.t], f = fp(b), cx = (b.x + f[0] / 2) * PX, cy = (b.y + f[1] / 2) * PX;
        if (ty.kind === "mg" && (b.oh > 0 || (b.heat || 0) >= MG.warn)) {
          c.save(); c.translate(cx, cy); c.rotate(-bd.a);
          if (b.oh > 0) {
            c.strokeStyle = "rgba(255,255,255,.25)"; c.lineWidth = 3; c.beginPath(); c.arc(0, -PX * 1.4, PX * 0.55, 0, Math.PI * 2); c.stroke();
            c.strokeStyle = "#E0533F"; c.beginPath(); c.arc(0, -PX * 1.4, PX * 0.55, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (b.oh / (b.ohMax || MG.lock))); c.stroke();
            c.fillStyle = "#E0533F"; c.font = "800 12px " + FONTS(); c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("!!!", 0, -PX * 1.4);
          } else { c.fillStyle = "#E3B83F"; c.fillRect(-7, -PX * 1.4 - 9, 14, 18); c.fillStyle = "#151715"; c.font = "800 13px " + FONTS(); c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("!", 0, -PX * 1.4 + 1); }
          c.restore();
        }
      });
      c.restore();
    });
    (FL.missiles || []).forEach(function (m) {
      c.save(); c.translate(m.x, m.y); c.rotate(m.h);
      c.fillStyle = "rgba(255,190,90,.85)"; c.beginPath(); c.moveTo(-0.9, -0.28); c.lineTo(-2.4 - Math.random() * 0.8, 0); c.lineTo(-0.9, 0.28); c.closePath(); c.fill();
      c.fillStyle = "#E9ECEE"; c.fillRect(-0.9, -0.22, 1.6, 0.44); c.fillStyle = "#C8473A"; c.beginPath(); c.moveTo(0.7, -0.22); c.lineTo(1.1, 0); c.lineTo(0.7, 0.22); c.closePath(); c.fill();
      c.restore();
    });
    // Geschosse, Strahlen, Partikel
    c.strokeStyle = "#FFD27A"; c.lineWidth = 0.5;
    FL.shots.forEach(function (p) { var l = Math.hypot(p.vx, p.vy) || 1; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - p.vx / l * 2.4, p.y - p.vy / l * 2.4); c.stroke(); });
    FL.beams.forEach(function (b) { var a = 1 - b.life / 0.3; c.strokeStyle = "rgba(140,230,255," + a + ")"; c.lineWidth = 1.4 * a + 0.2; c.beginPath(); c.moveTo(b.x0, b.y0); c.lineTo(b.x1, b.y1); c.stroke(); c.strokeStyle = "rgba(255,255,255," + a + ")"; c.lineWidth = 0.4; c.stroke(); });
    FL.parts.forEach(function (q) {
      var k = q.life / q.max;
      if (q.k === "smoke") { c.fillStyle = "rgba(70,70,74," + (0.38 * (1 - k)) + ")"; c.beginPath(); c.arc(q.x, q.y, q.sz * (1 + k * 1.6), 0, Math.PI * 2); c.fill(); }
      else if (q.k === "fire") { c.fillStyle = "rgba(255," + Math.round(200 - k * 140) + ",60," + (0.9 * (1 - k)) + ")"; c.beginPath(); c.arc(q.x, q.y, q.sz * (1 - k * 0.5), 0, Math.PI * 2); c.fill(); }
      else if (q.k === "ocs") { c.fillStyle = "rgba(220,180,255," + (1 - k) + ")"; c.fillRect(q.x, q.y, 0.45, 0.45); }
      else if (q.k === "weld") { c.fillStyle = "rgba(170,230,255," + (1 - k) + ")"; c.fillRect(q.x, q.y, 0.35, 0.35); }
      else if (q.k === "spark") { c.fillStyle = "rgba(255,230,160," + (1 - k) + ")"; c.fillRect(q.x, q.y, 0.4, 0.4); }
      else if (q.k === "flash") { c.fillStyle = "rgba(255,240,200," + (1 - k) + ")"; c.beginPath(); c.arc(q.x, q.y, q.sz, 0, Math.PI * 2); c.fill(); }
      else if (q.k === "debris") { c.save(); c.translate(q.x, q.y); c.rotate(q.a); c.globalAlpha = 1 - k * k; c.fillStyle = q.col; c.fillRect(-q.sz / 2, -q.sz / 2, q.sz, q.sz * 0.6); c.restore(); c.globalAlpha = 1; }
    });
    c.restore();
    flHud();
  }
  function flHud() {
    var me = FL.me, sp = Math.hypot(me.vx, me.vy), g = FL.groups[FL.wsel];
    set("sr-h-sp", nf(sp, 1) + " m/s");
    set("sr-h-damp", t("damp") + ": " + t(FL.damp ? "on" : "off")); var dEl = V.root.querySelector("#sr-h-damp"); if (dEl) dEl.className = FL.damp ? "on" : "off";
    var ek = me.cap ? me.energy / me.cap : 0, eb = V.root.querySelector("#sr-h-ebar"); if (eb) { eb.style.width = Math.round(ek * 100) + "%"; eb.style.background = ek < 0.2 ? "#E0533F" : "#57D18A"; }
    set("sr-h-en", nf(me.energy) + " / " + nf(me.cap));
    set("sr-h-oc", (FL.oc ? t("on") : t("off")) + " · " + nf(FL.ocT, 1) + " / " + nf(me.ocMax || 3, 1) + " s");
    var ob = V.root.querySelector("#sr-h-ocbar"); if (ob) { ob.style.width = Math.round(FL.ocT / (me.ocMax || 3) * 100) + "%"; ob.style.background = FL.oc ? "#B98AE0" : "#6B7FA0"; }
    var oe = V.root.querySelector("#sr-h-oc"); if (oe) oe.className = FL.oc ? "on" : "";
    var wtxt = g ? t(g) : t("none");
    if (g === "mg") { var h = 0, oh = 0; me.blocks.forEach(function (b) { if (T[b.t].kind === "mg") { h = Math.max(h, b.heat || 0); oh = Math.max(oh, b.oh || 0); } }); wtxt += oh > 0 ? " · !!! " + nf(oh, 1) + " s" : " · " + Math.round(h * 100) + " %"; }
    if (g === "ms") { var rl = 0; me.blocks.forEach(function (b) { if (T[b.t].kind === "ms") rl = Math.max(rl, b.rl || 0); }); wtxt += rl > 0 ? " · " + nf(rl, 1) + " s" : (lang === "de" ? " · bereit" : " · ready"); }
    if (g === "rg") { var cd = 0; me.blocks.forEach(function (b) { if (T[b.t].kind === "rg") cd = Math.max(cd, b.cd || 0); }); wtxt += cd > 0 ? " · " + nf(cd, 1) + " s" : " · bereit".replace("bereit", lang === "de" ? "bereit" : "ready"); }
    set("sr-h-w", wtxt);
    set("sr-h-seat", !me.seat ? t("cockGone") : FL.seated ? t("seated") : t("walking"));
    var sb = V.root.querySelector('[data-act="seat"]'); if (sb) { set("sr-h-seatb", FL.seated ? t("exitSeat") : t("sitDown")); }
    var wb = V.root.querySelector("#sr-h-weld"); if (wb) { wb.parentNode.hidden = FL.seated; set("sr-h-weld", FL.weldB ? fmt(t("weldOn"), { n: T[FL.weldB.t].n[lang], p: Math.round(FL.weldB.hp / T[FL.weldB.t].hp * 100) }) : t("weldIdle")); }
    var se = V.root.querySelector("#sr-h-seat"); if (se) se.className = !me.seat ? "warn" : "";
  }

  // ---------- UI ----------
  function set(id, txt) { var e = document.getElementById(id); if (e && e.textContent !== txt) e.textContent = txt; }
  function note(txt) { var n = V.root.querySelector(".sr-note"); n.textContent = txt; n.hidden = false; clearTimeout(V.noteT); V.noteT = setTimeout(function () { if (V) n.hidden = true; }, 3200); }
  function icon(id) {
    var ty = T[id], cv = document.createElement("canvas"), s = 14, w = ty.w, h = ty.h, sc = Math.min(40 / (w * s), 40 / (h * s), 1.4);
    cv.width = 44; cv.height = 44; var c = cv.getContext("2d");
    c.translate(22 - w * s * sc / 2, 22 - h * s * sc / 2); c.scale(sc, sc);
    drawBlock(c, { t: id, x: 0, y: 0, r: 0, f: 0 }, s, "in", 1, 0);
    return cv.toDataURL();
  }
  function html() {
    var pal = CATS.map(function (cat) {
      return '<div class="sr-cat"><h4>' + t(cat) + '</h4><div class="sr-grid">' + Object.keys(T).filter(function (id) { return T[id].cat === cat; }).map(function (id) {
        return '<button type="button" class="sr-blk" data-blk="' + id + '" title="' + T[id].n[lang] + " · " + kg(T[id].mass) + " · " + T[id].hp + ' HP"><img alt="" src="' + icon(id) + '"><span>' + T[id].n[lang] + "</span><small>" + kg(T[id].mass) + "</small></button>";
      }).join("") + "</div></div>";
    }).join("");
    var sw = ["#C8473A", "#E3B83F", "#57A06A", "#3E6F96", "#7B4BA8", "#E9ECEE", "#9AA5B1", "#6A7480", "#2A2F36"].map(function (c) { return '<button type="button" class="sr-sw" data-sw="' + c + '" style="background:' + c + '" aria-label="' + c + '"></button>'; }).join("");
    return '<div class="sr-root">' +
      '<canvas id="sr-cv"></canvas>' +
      '<div class="sr-top"><a class="sr-back" href="#">← ' + t("back") + '</a><b class="sr-ttl">' + t("title") + ' <small>v' + VERSION + '</small></b>' +
      '<div class="sr-ed-only sr-tbar"><button type="button" data-act="undo">' + t("undo") + '</button><button type="button" data-act="starter">' + t("starter") + '</button><button type="button" data-act="clear">' + t("clear") + '</button></div>' +
      '<div class="sr-sp"></div><div class="sr-seg"><button type="button" data-view="in">' + t("vIn") + '</button><button type="button" data-view="out">' + t("vOut") + '</button></div>' +
      '<button type="button" class="sr-go sr-ed-only" data-act="test">' + t("test") + ' ▸</button><button type="button" class="sr-go sr-fl-only" data-act="edit">◂ ' + t("toEd") + '</button></div>' +
      '<aside class="sr-pal sr-ed-only"><div class="sr-tools"><button type="button" data-tool="build">' + t("tBuild") + '</button><button type="button" data-tool="erase">' + t("tErase") + '</button><button type="button" data-tool="paint">' + t("tPaint") + '</button></div>' +
      '<div class="sr-paint"><label>' + t("color") + ' <input type="color" id="sr-col"></label><div class="sr-sws">' + sw + '</div></div>' +
      '<div class="sr-opts"><button type="button" data-act="rot">' + t("rot") + '</button><button type="button" data-act="flip">' + t("flip") + '</button><button type="button" data-act="sym">' + t("sym") + '</button></div>' +
      '<div class="sr-list">' + pal + '</div></aside>' +
      '<aside class="sr-info sr-ed-only" id="sr-info"></aside>' +
      '<div class="sr-hud sr-fl-only"><div><small>' + t("speed") + '</small><b id="sr-h-sp"></b></div><div><small>' + t("energy") + '</small><b id="sr-h-en"></b><i class="sr-eb"><i id="sr-h-ebar"></i></i></div>' +
      '<div><small>' + t("weapon") + ' (R)</small><b id="sr-h-w"></b></div><div><small>Z</small><b id="sr-h-damp"></b></div><div><small>X · Overcharge</small><b id="sr-h-oc"></b><i class="sr-eb"><i id="sr-h-ocbar"></i></i></div><div><small>F</small><b id="sr-h-seat"></b></div><div hidden><small>' + t("weld") + '</small><b id="sr-h-weld"></b></div>' +
      '<button type="button" data-act="seat" id="sr-h-seatb"></button><button type="button" data-act="targets">' + t("targets") + '</button></div>' +
      '<div class="sr-hint" id="sr-hint"></div><div class="sr-note" hidden></div></div>';
  }
  function syncUI() {
    if (!V) return;
    var r = V.root, fly = S.mode === "fly";
    r.querySelector(".sr-root").classList.toggle("fly", fly);
    r.querySelectorAll("[data-tool]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-tool") === S.tool)); });
    r.querySelectorAll("[data-blk]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-blk") === S.sel && S.tool === "build")); });
    r.querySelectorAll("[data-view]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-view") === S.view)); });
    var sb = r.querySelector('[data-act="sym"]'); if (sb) sb.setAttribute("aria-pressed", String(S.sym));
    var fb = r.querySelector('[data-act="flip"]'); if (fb) fb.setAttribute("aria-pressed", String(!!S.f));
    r.querySelector(".sr-paint").hidden = S.tool !== "paint";
    var ci = r.querySelector("#sr-col"); if (ci && ci.value !== S.color) ci.value = S.color;
    r.querySelectorAll("[data-sw]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-sw").toLowerCase() === S.color.toLowerCase())); });
    set("sr-hint", fly ? t("hintFl") : t("hintEd"));
    if (!fly) info();
  }
  function coolTxt() { var cm = coolMap(S.blocks), w = 0, th = 0; cm.forEach(function (n, b) { var k = T[b.t].kind; if (k === "mg" || k === "rg") w++; if (k === "thr") th++; }); return w + " " + t("weap") + " · " + th + " " + t("thrs"); }
  function dimTxt() { var b = bounds(S.blocks); if (!b) return "–"; var w = b.x1 - b.x0, h = b.y1 - b.y0; return w + " × " + h + " (" + nf(w * CELL_M, 1) + " × " + nf(h * CELL_M, 1) + " m)"; }
  function info() {
    var st = stats(S.blocks), R = rooms(S.blocks), comps = components(S.blocks), main = comps.length ? comps.reduce(function (a, b) { return mainScore(b) > mainScore(a) ? b : a; }) : [];
    var loose = S.blocks.length - main.length, m = st.mass || 1;
    function row(l, v) { return "<div><span>" + l + "</span><b>" + v + "</b></div>"; }
    function acc(i) { return st.thr[i] ? nf(st.thr[i]) + " kN · " + nf(st.thr[i] / m, 1) + " m/s²" : "–"; }
    var warn = [];
    if (!st.cock) warn.push(t("wNoCock"));
    if (!st.gyro) warn.push(t("wNoGyro"));
    var miss = [[0, "dF"], [2, "dB"], [3, "dL"], [1, "dR"]].filter(function (q) { return !st.thr[q[0]]; }).map(function (q) { return t(q[1]); });
    if (miss.length) warn.push(fmt(t("wNoThr"), { d: miss.join(", ") }));
    var leaks = R.filter(function (x) { return !x.ok; }).length; if (leaks) warn.push(fmt(t("wLeak"), { n: leaks }));
    if (loose > 0) warn.push(fmt(t("wLoose"), { n: loose }));
    if (!st.cap && !st.prod) warn.push(t("wNoPow"));
    var wdeg = st.torque ? nf(st.torque / Math.max(1, st.I) * 57.3) + " °/s²" : "–";
    document.getElementById("sr-info").innerHTML =
      "<h4>" + t("sBlocks") + "</h4>" + row(t("sBlocks"), nf(st.n)) + row(t("sMass"), nf(st.mass * 1000) + " kg") +
      row(t("sDim"), dimTxt()) + row(t("sCom"), t("comHint")) +
      "<h4>" + t("sThr") + "</h4>" + row("↑ " + t("dF"), acc(0)) + row("↓ " + t("dB"), acc(2)) + row("← " + t("dL"), acc(3)) + row("→ " + t("dR"), acc(1)) +
      "<h4>" + t("sGyro") + "</h4>" + row("Gyro", st.gyro ? st.gyro + " × · " + wdeg : "–") +
      "<h4>" + t("sCool") + "</h4>" + row(t("sCoolW"), coolTxt()) + row("Overcharge", nf(ocMaxOf(S.blocks, coolMap(S.blocks)), 1) + " s") +
      "<h4>" + t("sEn") + "</h4>" + row(t("sProd"), nf(st.prod) + " E/s") + row(t("sStore"), nf(st.cap) + " E") + row(t("sUse"), nf(st.use) + " E/s") +
      "<h4>" + t("sRooms") + "</h4><p class='" + (leaks ? "bad" : "ok") + "'>" + (R.length ? fmt(t("okRooms"), { n: R.length - leaks }) + (leaks ? " · " + leaks + " ✕" : "") + " · " + fmt(t("roomCells"), { n: R.reduce(function (a, r) { return a + r.cells.length; }, 0) }) : t("noRooms")) + "</p>" +
      (warn.length ? "<ul class='sr-warn'>" + warn.map(function (w) { return "<li>" + w + "</li>"; }).join("") + "</ul>" : "");
  }

  var CSS = ".sr-root{position:fixed;inset:0;z-index:30;background:#080B12;color:#E6EAF0;font-family:var(--f-body,system-ui);user-select:none;-webkit-user-select:none;overflow:hidden}" +
    ".sr-root canvas#sr-cv{position:absolute;inset:0;width:100%;height:100%;display:block;cursor:crosshair}" +
    ".sr-top{position:absolute;left:0;right:0;top:0;display:flex;align-items:center;gap:10px;padding:10px 14px;background:linear-gradient(#0E131C,rgba(14,19,28,.92));border-bottom:1px solid #263142;z-index:3;flex-wrap:wrap}" +
    ".sr-back{color:#E6EAF0;text-decoration:none;font-weight:600;font-size:.9rem;padding:6px 10px;border:1px solid #33415A}.sr-back:hover{border-color:#E3B83F}" +
    ".sr-ttl{font:600 1.15rem var(--f-display,inherit);letter-spacing:.02em}.sr-ttl small{font:600 .7rem inherit;color:#8FA0B8;border:1px solid #33415A;padding:1px 5px;margin-left:4px}.sr-sp{flex:1}" +
    ".sr-root button{font:600 .82rem var(--f-body,inherit);color:#E6EAF0;background:#141B27;border:1px solid #33415A;padding:6px 10px;cursor:pointer;border-radius:0}.sr-root button:hover{border-color:#5B7194}" +
    ".sr-root button[aria-pressed=true]{background:#E3B83F;color:#141414;border-color:#E3B83F}.sr-tbar{display:flex;gap:6px}.sr-seg{display:flex}.sr-seg button+button{border-left:0}" +
    ".sr-root .sr-go{background:#2E7D5B;border-color:#3FA076;font-size:.9rem;padding:7px 14px}.sr-root .sr-go:hover{background:#3A946D}" +
    ".sr-pal{position:absolute;left:10px;top:64px;bottom:44px;width:248px;background:rgba(14,19,28,.94);border:1px solid #263142;z-index:2;display:flex;flex-direction:column}" +
    ".sr-tools{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;padding:8px}.sr-opts{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;padding:0 8px 8px}.sr-opts button{font-size:.72rem;padding:5px 2px}" +
    ".sr-paint{padding:0 8px 8px;display:flex;flex-direction:column;gap:6px;font-size:.78rem}.sr-paint label{display:flex;align-items:center;gap:8px}.sr-paint input{width:44px;height:26px;border:1px solid #33415A;background:none;padding:0}" +
    ".sr-sws{display:flex;flex-wrap:wrap;gap:4px}.sr-root .sr-sw{width:22px;height:22px;padding:0;border:2px solid #263142}.sr-root .sr-sw[aria-pressed=true]{border-color:#fff;outline:1px solid #000}" +
    ".sr-list{overflow:auto;padding:0 8px 8px;flex:1;min-height:0}.sr-cat h4{margin:10px 0 6px;font:600 .72rem var(--f-body,inherit);letter-spacing:.08em;text-transform:uppercase;color:#8FA0B8}" +
    ".sr-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}.sr-root .sr-blk{display:flex;flex-direction:column;align-items:center;gap:3px;padding:5px 3px;background:#101620;min-width:0}" +
    ".sr-blk img{width:44px;height:44px;image-rendering:auto}.sr-blk span{font-size:.62rem;line-height:1.2;text-align:center;color:#B9C4D4;font-weight:500;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}" +
    ".sr-blk small{font-size:.58rem;color:#8FA0B8;font-variant-numeric:tabular-nums}" +
    ".sr-root .sr-blk[aria-pressed=true]{background:#2A3550;border-color:#E3B83F;color:#E6EAF0}.sr-blk[aria-pressed=true] span{color:#fff}" +
    ".sr-info{position:absolute;right:10px;top:64px;width:250px;max-height:calc(100% - 110px);overflow:auto;background:rgba(14,19,28,.94);border:1px solid #263142;padding:10px 12px;z-index:2;font-size:.8rem}" +
    ".sr-info h4{margin:10px 0 4px;font:600 .7rem var(--f-body,inherit);letter-spacing:.08em;text-transform:uppercase;color:#8FA0B8}.sr-info h4:first-child{margin-top:0}" +
    ".sr-info div{display:flex;justify-content:space-between;gap:8px;padding:2px 0}.sr-info div span{color:#B9C4D4}.sr-info b{font-weight:600;font-variant-numeric:tabular-nums;text-align:right}" +
    ".sr-info p{margin:2px 0}.sr-info .ok{color:#7FD3A4}.sr-info .bad{color:#F08A78}.sr-warn{margin:10px 0 0;padding:8px 8px 8px 22px;background:rgba(224,83,63,.12);border-left:3px solid #E0533F;color:#F3C2B8}.sr-warn li{margin:2px 0}" +
    ".sr-hint{position:absolute;left:50%;bottom:10px;transform:translateX(-50%);max-width:calc(100% - 540px);min-width:280px;text-align:center;font-size:.74rem;color:#B9C4D4;background:rgba(14,19,28,.85);border:1px solid #263142;padding:6px 10px;z-index:2}" +
    ".sr-note{position:absolute;left:50%;top:72px;transform:translateX(-50%);background:#E0533F;color:#fff;font-weight:600;padding:8px 14px;z-index:4;font-size:.86rem}" +
    ".sr-hud{position:absolute;left:12px;top:64px;display:flex;flex-direction:column;gap:8px;background:rgba(14,19,28,.88);border:1px solid #263142;padding:10px 12px;z-index:2;min-width:220px}" +
    ".sr-hud div{display:flex;flex-direction:column;gap:2px}.sr-hud small{font-size:.66rem;letter-spacing:.08em;text-transform:uppercase;color:#8FA0B8}.sr-hud b{font-weight:600;font-variant-numeric:tabular-nums}" +
    ".sr-hud b.on{color:#7FD3A4}.sr-hud b.off{color:#F0B860}.sr-hud b.warn{color:#F08A78}.sr-hud div[hidden]{display:none}.sr-eb{display:block;height:6px;background:#263142}.sr-eb i{display:block;height:100%;width:0}" +
    ".sr-root .sr-fl-only{display:none}.sr-root.fly .sr-fl-only{display:flex}.sr-root.fly .sr-ed-only{display:none}.sr-root.fly .sr-hud{display:flex}.sr-root.fly .sr-hint{max-width:calc(100% - 40px)}" +
    ".sr-root [hidden]{display:none!important}" +
    "@media (max-width:900px){.sr-info{display:none}.sr-hint{max-width:calc(100% - 280px)}}";

  // ---------- Eingabe ----------
  function worldMouse(e) {
    var r = V.cv.getBoundingClientRect(), s = PX * V.zoom;
    return { sx: e.clientX - r.left, sy: e.clientY - r.top, x: V.cam.x + (e.clientX - r.left - V.W / 2) / s, y: V.cam.y + (e.clientY - r.top - V.H / 2) / s };
  }
  function onDown(e) {
    V.cv.focus && V.cv.focus();
    var m = worldMouse(e); V.mouse = m;
    if (S.mode === "fly") {
      if (e.button === 0) FL.fire = true;
      if (e.button === 2) { var ppm = PX * V.zoom / CELL_M, wx = FL.cam.x + (m.sx - V.W / 2) / ppm, wy = FL.cam.y + (m.sy - V.H / 2) / ppm, h = hitAt(wx, wy, null); if (h) { damage(h.bd, h.b, T[h.b.t].hp * 0.26, wx, wy); spark(wx, wy, 6); } }
      return;
    }
    if (e.button === 1 || (e.button === 0 && V.space)) { V.pan = { x: e.clientX, y: e.clientY, cx: V.cam.x, cy: V.cam.y }; e.preventDefault(); return; }
    var cx = Math.floor(m.x), cy = Math.floor(m.y);
    V.down = e.button;
    if (e.button === 2) { if (eraseAt(cx, cy)) syncUI(); V.lastCell = key(cx, cy); return; }
    if (e.button !== 0) return;
    if (S.tool === "build") { V.row = { sx: cx, sy: cy, ex: cx, ey: cy }; }
    else if (S.tool === "erase") { if (eraseAt(cx, cy)) syncUI(); }
    else if (S.tool === "paint") { if (paintAt(cx, cy)) syncUI(); }
    V.lastCell = key(cx, cy);
  }
  function onMove(e) {
    if (!V) return;
    var m = worldMouse(e);
    if (S.mode === "fly") { if (e.shiftKey) FL.mdx += e.movementX || 0; V.mouse = m; return; }
    if (V.pan) { var s = PX * V.zoom; V.cam.x = V.pan.cx - (e.clientX - V.pan.x) / s; V.cam.y = V.pan.cy - (e.clientY - V.pan.y) / s; return; }
    V.mouse = m;
    if (V.down === undefined || V.down === null) return;
    var cx = Math.floor(m.x), cy = Math.floor(m.y), kk = key(cx, cy); if (kk === V.lastCell) return; V.lastCell = kk;
    if (V.down === 2 || S.tool === "erase") { if (eraseAt(cx, cy)) syncUI(); }
    else if (S.tool === "paint") { if (paintAt(cx, cy)) syncUI(); }
    else if (S.tool === "build" && V.row) { V.row.ex = cx; V.row.ey = cy; }
  }
  function onUp(e) { if (!V) return; V.pan = null; V.down = null; if (FL) FL.fire = false; if (V.row) { placeRow(); V.row = null; syncUI(); } }
  function onWheel(e) { e.preventDefault(); var k = e.deltaY < 0 ? 1.12 : 1 / 1.12; V.zoom = Math.max(0.3, Math.min(3, V.zoom * k)); }
  function onKey(e) {
    if (!V || e.target.tagName === "INPUT") return;
    var k = e.key.toLowerCase();
    if (S.mode === "fly") {
      if (k === "escape") { stopTest(); return; }
      if (["w", "a", "s", "d", "q", "e"].indexOf(k) >= 0) { FL.keys[k] = true; e.preventDefault(); }
      if (k === "shift") FL.keys.shift = true;
      if (e.repeat) return;
      if (k === "z") FL.damp = !FL.damp;
      if (k === "x") { if (FL.oc) FL.oc = false; else if (FL.ocT > 0.3) FL.oc = true; }
      if (k === "r" && FL.groups.length) FL.wsel = (FL.wsel + 1) % FL.groups.length;
      if (k === "f") toggleSeat();
      if (k === "v" || k === "tab") { S.view = S.view === "in" ? "out" : "in"; syncUI(); e.preventDefault(); }
      return;
    }
    if (k === " ") { V.space = true; e.preventDefault(); return; }
    if ((e.ctrlKey || e.metaKey) && k === "z") { undo(); e.preventDefault(); return; }
    if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].indexOf(k) >= 0) { V.keys[k] = true; e.preventDefault(); return; }
    if (e.repeat) return;
    if (k === "r") { S.r = (S.r + (e.shiftKey ? 3 : 1)) % 4; syncUI(); }
    else if (k === "f") { S.f = S.f ? 0 : 1; syncUI(); }
    else if (k === "m") { S.sym = !S.sym; syncUI(); }
    else if (k === "v" || k === "tab") { S.view = S.view === "in" ? "out" : "in"; syncUI(); e.preventDefault(); }
    else if (k === "1") { S.tool = "build"; syncUI(); } else if (k === "2") { S.tool = "erase"; syncUI(); } else if (k === "3") { S.tool = "paint"; syncUI(); }
  }
  function onKeyUp(e) {
    if (!V) return; var k = e.key.toLowerCase();
    if (k === " ") V.space = false;
    if (FL) { FL.keys[k] = false; if (k === "shift") FL.keys.shift = false; }
    V.keys[k] = false;
  }
  function undo() { var u = S.undo.pop(); if (!u) return; S.blocks = JSON.parse(u); save(); syncUI(); }
  function onClick(e) {
    var a = e.target.closest("[data-act]"), tl = e.target.closest("[data-tool]"), bk = e.target.closest("[data-blk]"), vw = e.target.closest("[data-view]"), sw = e.target.closest("[data-sw]");
    if (tl) { S.tool = tl.getAttribute("data-tool"); syncUI(); return; }
    if (bk) { S.sel = bk.getAttribute("data-blk"); S.tool = "build"; syncUI(); return; }
    if (vw) { S.view = vw.getAttribute("data-view"); syncUI(); return; }
    if (sw) { S.color = sw.getAttribute("data-sw"); S.tool = "paint"; save(); syncUI(); return; }
    if (!a) return;
    var act = a.getAttribute("data-act");
    if (act === "rot") S.r = (S.r + 1) % 4;
    else if (act === "flip") S.f = S.f ? 0 : 1;
    else if (act === "sym") S.sym = !S.sym;
    else if (act === "undo") undo();
    else if (act === "clear") { pushUndo(); S.blocks = []; save(); }
    else if (act === "starter") { pushUndo(); S.blocks = starter(); save(); fitCam(); }
    else if (act === "test") { startTest(); return; }
    else if (act === "edit") { stopTest(); return; }
    else if (act === "targets") { if (FL) spawnTargets(); return; }
    else if (act === "seat") { if (FL) toggleSeat(); a.blur(); return; }
    syncUI();
  }
  function onInput(e) { if (e.target.id === "sr-col") { S.color = e.target.value; S.tool = "paint"; save(); syncUI(); } }
  function fitCam() { var b = bounds(S.blocks); if (!b) { V.cam = { x: 0.5, y: 0 }; return; } V.cam = { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 }; }

  function layout() {
    if (!V) return;
    var dpr = window.devicePixelRatio || 1, r = V.cv.getBoundingClientRect();
    V.W = r.width; V.H = r.height; V.cv.width = Math.round(r.width * dpr); V.cv.height = Math.round(r.height * dpr);
    V.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function loop(now) {
    if (!V) return;
    raf = requestAnimationFrame(loop);
    var dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    var dpr = window.devicePixelRatio || 1; V.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (S.mode === "fly" && FL) { var g = dt; while (g > 0) { var d = Math.min(1 / 120, g); flTick(d); g -= d; } flDraw(); }
    else {
      var k = V.keys, sp = 14 / V.zoom * dt;
      if (k.w || k.arrowup) V.cam.y -= sp; if (k.s || k.arrowdown) V.cam.y += sp; if (k.a || k.arrowleft) V.cam.x -= sp; if (k.d || k.arrowright) V.cam.x += sp;
      edDraw();
    }
  }

  function mount(el, l) {
    unmount();
    lang = l === "en" ? "en" : "de";
    var o = document.getElementById("sr-css"); if (o) o.remove();
    var st = document.createElement("style"); st.id = "sr-css"; st.textContent = CSS; document.head.appendChild(st);
    load();
    el.innerHTML = html();
    V = { root: el, cv: el.querySelector("#sr-cv"), zoom: 1.25, cam: { x: 0.5, y: 0 }, keys: {}, ovOld: document.body.style.overflow };
    V.ctx = V.cv.getContext("2d");
    document.body.style.overflow = "hidden";
    fitCam(); layout(); syncUI();
    V.cv.addEventListener("pointerdown", onDown); window.addEventListener("pointermove", onMove); window.addEventListener("pointerup", onUp); window.addEventListener("pointercancel", onUp);
    V.cv.addEventListener("wheel", onWheel, { passive: false }); V.cv.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    V.cv.addEventListener("pointerleave", function () { if (V && S.mode !== "fly") V.mouse = null; });
    el.addEventListener("click", onClick); el.addEventListener("input", onInput);
    window.addEventListener("keydown", onKey); window.addEventListener("keyup", onKeyUp); window.addEventListener("resize", layout);
    window.addEventListener("blur", releaseKeys);
    last = 0; raf = requestAnimationFrame(loop);
  }
  function releaseKeys() { if (V) V.keys = {}; if (FL) { FL.keys = {}; FL.fire = false; } }
  function unmount() {
    if (raf) cancelAnimationFrame(raf); raf = 0;
    if (!V) return;
    window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); window.removeEventListener("pointercancel", onUp);
    window.removeEventListener("keydown", onKey); window.removeEventListener("keyup", onKeyUp); window.removeEventListener("resize", layout); window.removeEventListener("blur", releaseKeys);
    document.body.style.overflow = V.ovOld || "";
    FL = null; if (S) S.mode = "edit"; V = null;
  }
  window.SpaceRogue = { mount: mount, unmount: unmount, _debug: function () { return { S: S, V: V, FL: FL, T: T, stats: stats, rooms: rooms, components: components, starter: starter, startTest: startTest, damage: damage }; } };
})();
