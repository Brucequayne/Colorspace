/* Shizuku – arena.js
   Datenmodell einer Arena: 30 × 17 Kacheln Boden, Objekte, Vegetation, Laubfall-Zonen, Tageszeit.
   Gespeichert als kleines JSON. Bodenarten beeinflussen schon jetzt das Laufen (speed),
   später auch Gegner und Elemente. */
(function () {
  var SZ = window.SZ, L2 = SZ.L2, C = SZ.COLS, R = SZ.ROWS, T = SZ.TILE;

  // Bodenarten. Zeichen = Kürzel im gespeicherten Text.
  // speed: Lauftempo-Faktor, solid: nicht begehbar, element: Bezug zu den 4 Elementen (für später)
  SZ.TILES = {
    s: { name: function () { return L2("Steinboden", "Stone floor"); }, speed: 1, element: "erde" },
    m: { name: function () { return L2("Moos", "Moss"); }, speed: 0.96, element: "holz" },
    e: { name: function () { return L2("Erde", "Soil"); }, speed: 0.92, element: "erde" },
    a: { name: function () { return L2("Sand (geharkt)", "Raked sand"); }, speed: 0.84, element: "erde" },
    w: { name: function () { return L2("Wasser", "Water"); }, speed: 0.55, element: "wasser", wet: true },
    "#": { name: function () { return L2("Mauer", "Wall"); }, solid: true }
  };

  function blankTiles() {
    var t = [];
    for (var y = 0; y < R; y++) for (var x = 0; x < C; x++)
      t.push(y < 2 || y === R - 1 || x === 0 || x === C - 1 ? "#" : "s");
    return t.join("");
  }

  // Arena-Objekt mit Hilfsfunktionen um die Rohdaten
  function Arena(data) {
    data = data || {};
    this.name = data.name || "Tempel";
    this.seed = data.seed || 7;
    this.time = data.time == null ? 18.2 : data.time;
    this.tiles = (data.tiles && data.tiles.length === C * R ? data.tiles : blankTiles()).split("");
    this.leaf = (data.leaf && data.leaf.length === C * R ? data.leaf : new Array(C * R + 1).join("0")).split("");
    this.obj = (data.obj || []).filter(function (o) { return SZ.OBJECTS[o[0]]; }).map(function (o) { return { t: o[0], x: o[1], y: o[2], v: o[3] | 0 }; });
    this.veg = (data.veg || []).filter(function (o) { return SZ.VEG[o[0]]; }).map(function (o) { return { t: o[0], x: o[1], y: o[2], v: o[3] | 0 }; });
    this.spawn = data.spawn || [SZ.W / 2, SZ.H / 2 + 14];
    this.rev = 0;   // zählt Änderungen am Boden (Neuzeichnen)
  }
  var A = Arena.prototype;
  A.tile = function (tx, ty) { if (tx < 0 || ty < 0 || tx >= C || ty >= R) return "#"; return this.tiles[ty * C + tx]; };
  A.tilePx = function (x, y) { return this.tile(Math.floor(x / T), Math.floor(y / T)); };
  A.setTile = function (tx, ty, ch) {
    if (tx < 0 || ty < 0 || tx >= C || ty >= R) return false;
    var i = ty * C + tx; if (this.tiles[i] === ch) return false;
    this.tiles[i] = ch; this.rev++; return true;
  };
  A.isLeaf = function (tx, ty) { return this.leaf[ty * C + tx] === "1"; };
  A.setLeaf = function (tx, ty, on) { if (tx < 0 || ty < 0 || tx >= C || ty >= R) return; this.leaf[ty * C + tx] = on ? "1" : "0"; };
  A.speedAt = function (x, y) { var d = SZ.TILES[this.tilePx(x, y)]; return d ? d.speed || 1 : 1; };
  A.solidTile = function (tx, ty) { var d = SZ.TILES[this.tile(tx, ty)]; return !!(d && d.solid); };

  // Kreise aller festen Objekte: [x, y, r, objekt]
  A.solids = function () {
    var out = [];
    this.obj.forEach(function (o) {
      var sol = SZ.objSolid(o); if (!sol) return;
      sol.forEach(function (s) { out.push([o.x + s[0], o.y + s[1], s[2], o]); });
    });
    return out;
  };
  // Kreis (Füße) bewegen, mit Mauern und Objekten kollidieren
  A.move = function (x, y, dx, dy, r, solids) {
    var self = this;
    function blocked(px, py) {
      var x0 = Math.floor((px - r) / T), x1 = Math.floor((px + r) / T), y0 = Math.floor((py - r) / T), y1 = Math.floor((py + r) / T);
      for (var ty = y0; ty <= y1; ty++) for (var tx = x0; tx <= x1; tx++) if (self.solidTile(tx, ty)) return true;
      return false;
    }
    if (!blocked(x + dx, y)) x += dx;
    else { var s = Math.sign(dx); for (var i = 0; i < Math.abs(dx) && !blocked(x + s * 0.5, y); i += 0.5) x += s * 0.5; }
    if (!blocked(x, y + dy)) y += dy;
    else { var s2 = Math.sign(dy); for (var j = 0; j < Math.abs(dy) && !blocked(x, y + s2 * 0.5); j += 0.5) y += s2 * 0.5; }
    (solids || this.solids()).forEach(function (c) {
      var ddx = x - c[0], ddy = (y - c[1]) * 1.4, d = Math.sqrt(ddx * ddx + ddy * ddy), min = c[2] + r;
      if (d < min && d > 0.0001) { x = c[0] + ddx / d * min; y = c[1] + ddy / d * min / 1.4; }
    });
    return { x: x, y: y };
  };

  A.serialize = function () {
    return {
      v: 1, name: this.name, seed: this.seed, time: Math.round(this.time * 100) / 100,
      tiles: this.tiles.join(""), leaf: this.leaf.join(""),
      obj: this.obj.map(function (o) { return [o.t, Math.round(o.x), Math.round(o.y), o.v]; }),
      veg: this.veg.map(function (o) { return [o.t, Math.round(o.x), Math.round(o.y), o.v]; }),
      spawn: this.spawn
    };
  };

  // ---------- Standard-Tempel (falls keine eigene Standard-Arena hinterlegt ist) ----------
  function makeTemple() {
    var a = new Arena({ seed: 7, time: 18.2 }), rnd = SZ.rng(4242);
    function set(x, y, ch) { if (!a.solidTile(x, y)) a.setTile(x, y, ch); }
    // Teich unten links
    var pond = { 11: [3, 6], 12: [2, 7], 13: [3, 7], 14: [4, 6] };
    Object.keys(pond).forEach(function (y) { for (var x = pond[y][0]; x <= pond[y][1]; x++) set(x, +y, "w"); });
    // Moos um den Teich und in Ecken
    for (var y = 2; y < R - 1; y++) for (var x = 1; x < C - 1; x++) {
      if (a.tile(x, y) !== "s") continue;
      var nearW = false;
      for (var oy = -1; oy <= 1; oy++) for (var ox = -1; ox <= 1; ox++) if (a.tile(x + ox, y + oy) === "w") nearW = true;
      var corner = (x < 5 && y < 5) || (x > 25 && y > 12) || (x < 3 && y > 8) || (y === 2 && rnd() < 0.25);
      if ((nearW && rnd() < 0.8) || (corner && rnd() < 0.7)) set(x, y, "m");
    }
    // Erde unter den Bäumen
    [[3, 4], [4, 4], [5, 4], [3, 5], [4, 5], [4, 3], [5, 5], [25, 11], [26, 11], [25, 12], [24, 12], [26, 12]].forEach(function (p) { set(p[0], p[1], "e"); });
    // Geharkter Sandgarten oben rechts
    for (var sy = 3; sy <= 6; sy++) for (var sx = 20; sx <= 26; sx++) if (!((sx === 20 || sx === 26) && (sy === 3 || sy === 6))) set(sx, sy, "a");
    // Laubfall unter dem Ahorn
    for (var ly = 2; ly <= 7; ly++) for (var lx = 1; lx <= 7; lx++) if (rnd() < 0.85) a.setLeaf(lx, ly, true);

    function o(t, x, y, v) { a.obj.push({ t: t, x: x, y: y, v: v || 0 }); }
    o("torii", 240, 60);
    o("toro", 72, 46); o("toro", 168, 46); o("toro", 312, 46); o("toro", 408, 46, 1);
    o("maple", 70, 92); o("pine", 410, 200);
    o("bamboo", 454, 112); o("bamboo", 462, 132, 1); o("bamboo", 448, 150, 2);
    o("bush", 122, 54); o("bush", 360, 54, 1); o("bush", 154, 246, 2); o("bush", 300, 248, 1);
    o("rock", 344, 82, 0); o("rock", 396, 72, 2); o("rock", 382, 102, 1);
    o("rock", 36, 236, 3); o("rock", 128, 196, 1);
    o("jizo", 146, 186);
    o("makiwara", 176, 140); o("makiwara", 306, 170);

    // Vegetation verteilen
    function ok(x, y) { var c = a.tilePx(x, y); return c !== "#" && c !== "w" && c !== "a"; }
    function v(t, x, y) { if (ok(x, y)) a.veg.push({ t: t, x: Math.round(x), y: Math.round(y), v: (rnd() * 4) | 0 }); }
    for (var i = 0; i < 420; i++) {
      var x = 18 + rnd() * (SZ.W - 36), y = 36 + rnd() * (SZ.H - 56), c = a.tilePx(x, y);
      var edge = x < 50 || x > SZ.W - 50 || y < 52 || y > SZ.H - 40;
      var cx = Math.abs(x - 240) < 90 && Math.abs(y - 150) < 60;   // Kampfmitte frei halten
      if (cx) continue;
      if (c === "m" && rnd() < 0.7) v(rnd() < 0.8 ? "grass" : "fern", x, y);
      else if (c === "e" && rnd() < 0.6) v(rnd() < 0.5 ? "grass" : "fern", x, y);
      else if (c === "s" && edge && rnd() < 0.35) v("grass", x, y);
    }
    // Higanbana (rote Spinnenlilien) unter dem Ahorn und am unteren Rand
    for (var h = 0; h < 26; h++) { var ang = rnd() * 6.28, rr = 14 + rnd() * 30; v("lily", 70 + Math.cos(ang) * rr * 1.3, 104 + Math.sin(ang) * rr * 0.7); }
    for (var h2 = 0; h2 < 12; h2++) v("lily", 190 + rnd() * 110, 238 + rnd() * 14);
    // Schilf am Teichufer
    for (var r2 = 0; r2 < 34; r2++) {
      var px = 24 + rnd() * 120, py = 168 + rnd() * 84;
      if (a.tilePx(px, py) !== "w") { var near = a.tilePx(px + 8, py) === "w" || a.tilePx(px - 8, py) === "w" || a.tilePx(px, py + 8) === "w" || a.tilePx(px, py - 8) === "w"; if (near) v("reed", px, py); }
    }
    // Seerosen im Teich
    for (var lo = 0; lo < 14; lo++) {
      var wx = 44 + rnd() * 76, wy = 186 + rnd() * 44;
      if (a.tilePx(wx, wy) === "w" && a.tilePx(wx + 8, wy) === "w" && a.tilePx(wx - 8, wy) === "w" && a.tilePx(wx, wy + 6) === "w")
        a.veg.push({ t: "lotus", x: Math.round(wx), y: Math.round(wy), v: (rnd() * 3) | 0 });
    }
    // Weiße Blüten und Laub am Boden
    for (var f = 0; f < 18; f++) v("flower", 20 + rnd() * 440, 40 + rnd() * 220);
    for (var l = 0; l < 30; l++) v("leaves", 30 + rnd() * 90, 50 + rnd() * 90);
    for (var fe = 0; fe < 14; fe++) v("fern", 420 + rnd() * 40, 96 + rnd() * 80);
    a.veg = a.veg.filter(function (q) { return !(Math.abs(q.x - 240) < 40 && q.y < 70); });
    return a;
  }

  var KEY = "shizuku.arena.v1";
  SZ.arena = {
    Arena: Arena,
    blank: function () { return new Arena({}); },
    // Standard: zuerst die exportierte Datei arenas/standard.js, sonst der eingebaute Tempel
    standard: function () { return SZ.ARENA_STANDARD ? new Arena(JSON.parse(JSON.stringify(SZ.ARENA_STANDARD))) : makeTemple(); },
    // Aktive Arena: im Dev Tool gespeicherte (nur in diesem Browser) oder Standard
    active: function () {
      var s = SZ.store.get(KEY);
      if (s) { try { return new Arena(JSON.parse(s)); } catch (e) {} }
      return this.standard();
    },
    hasLocal: function () { return !!SZ.store.get(KEY); },
    saveLocal: function (a) { return SZ.store.set(KEY, JSON.stringify(a.serialize())); },
    clearLocal: function () { SZ.store.del(KEY); }
  };
})();
