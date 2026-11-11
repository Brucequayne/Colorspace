  // ===== 30-zustand.js · Zustand: Spielstand, Speichern/Laden, Beispielschiff und Beispielstation =====
  // ---------- Zustand ----------
  var S = null, V = null, raf = 0, last = 0;
  var SAVE = "spacerogue-ship-v1", SAVE_ST = "spacerogue-station-v1";
  function freshState() {
    return { blocks: [], ed: "ship", ship: [], station: [], names: { ship: "", station: "" }, tool: "build", sel: "lblk", r: 0, f: 0, sym: false, symGap: false, view: "in", color: "#C8473A", undo: [], mode: "edit" };
  }
  function load() {
    S = freshState();
    try { var j = JSON.parse(localStorage.getItem(SAVE) || "null"); if (j && j.blocks) { S.blocks = j.blocks.filter(function (b) { return T[b.t]; }); if (j.color) S.color = j.color; if (j.symGap) S.symGap = true; } } catch (e) {}
    if (!S.blocks.length) S.blocks = starter();
    S.ship = S.blocks;
    try { var jn = JSON.parse(localStorage.getItem(SAVE) || "null"); if (jn && jn.name) S.names.ship = jn.name; } catch (e) {}
    try { var js = JSON.parse(localStorage.getItem(SAVE_ST) || "null"); if (js && js.blocks) S.station = js.blocks.filter(function (b) { return T[b.t] && !/^(thr|cock|gyro)$/.test(T[b.t].kind); }); if (js && js.name) S.names.station = js.name; if (js && js.ed === "station") { S.ed = "station"; S.blocks = S.station; } } catch (e) {}
  }
  function save() {
    if (S.ed === "station") S.station = S.blocks; else S.ship = S.blocks;
    try {
      localStorage.setItem(SAVE, JSON.stringify({ blocks: S.ship.map(strip), color: S.color, symGap: !!S.symGap, name: S.names.ship }));
      localStorage.setItem(SAVE_ST, JSON.stringify({ blocks: S.station.map(strip), ed: S.ed, name: S.names.station }));
    } catch (e) {}
  }
  // Editor-Modus umschalten: Schiff oder Raumstation, jeder mit eigenem Entwurf
  // Beispielstation: gepanzerter Raum mit Boden, Reaktor, Batterie, Schildgenerator und einer Deckenluke in der Mitte
  function starterStation() {
    var B = [], occ = {};
    function put(t, x, y) { var ty = T[t]; for (var i = 0; i < ty.w; i++) for (var j = 0; j < ty.h; j++) occ[(x + i) + "," + (y + j)] = 1; B.push({ t: t, x: x, y: y, r: 0, f: 0, c: t === "lblk" ? "#6A7480" : undefined }); }
    put("rea", -4, -3); put("bat", 4, -3); put("bat", 4, -2); put("shs", 4, 3); put("hat", 0, 0);
    for (var x = -5; x <= 5; x++) for (var y = -4; y <= 4; y++) {
      if (occ[x + "," + y]) continue;
      put(Math.abs(x) === 5 || Math.abs(y) === 4 ? "lblk" : "flo", x, y);
    }
    return B.map(function (b) { if (!b.c) delete b.c; return b; });
  }
  function setEd(m) {
    if (S.ed === m) return; save();
    S.ed = m; S.blocks = m === "station" ? S.station : S.ship; S.undo = [];
    if (m === "station" && /^(thr|cock|gyro)$/.test(T[S.sel].kind)) S.sel = "lblk";
    if (m === "station" && !S.blocks.length) { S.blocks = S.station = starterStation(); }
    V.zoom = m === "station" ? Math.max(ZMIN_ST, Math.min(V.zoom, 0.8)) : Math.max(0.3, V.zoom);
    save(); fitCam(); syncUI();
  }
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
    m("ths", -6, 0, 1);
    m("lrmp", -3, 2, 2); m("lrmp", -4, 1, 2);
    m("col", -3, 4, 0); m("col", -3, 5, 0);
    m("msl", -1, -8, 0);
    // Luken nach außen: an der Stelle der Fenster, davor bleibt eine Lücke in der Seitenpanzerung
    B = B.filter(function (b) { return !(b.y === -1 && (b.x === -3 || b.x === 3 || b.x === -4 || b.x === 4)); });
    B.forEach(function (b) { if (b.t === "win") b.t = "hat"; });
    return B;
  }

