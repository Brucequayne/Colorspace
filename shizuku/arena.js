/* Shizuku – arena.js
   Datenmodell einer Arena: 30 × 17 Kacheln Boden, Objekte, Vegetation, Laubfall-Zonen, Tageszeit.
   Die Arena ist eine schwebende Insel: Kacheln „v“ sind Abgrund.
   Bodenarten beeinflussen das Laufen (speed), später auch Gegner und Elemente. */
(function () {
  var SZ = window.SZ, L2 = SZ.L2, C = SZ.COLS, R = SZ.ROWS, T = SZ.TILE;

  // Bodenarten. Zeichen = Kürzel im gespeicherten Text.
  SZ.TILES = {
    s: { name: function () { return L2("Steinplatten", "Stone slabs"); }, speed: 1, element: "erde", sw: "#77726A" },
    p: { name: function () { return L2("Große Tempelplatten", "Large temple slabs"); }, speed: 1, element: "erde", sw: "#958E80" },
    b: { name: function () { return L2("Kopfsteinpflaster", "Cobblestones"); }, speed: 0.97, element: "erde", sw: "#6E685E" },
    h: { name: function () { return L2("Bruchstein", "Flagstones"); }, speed: 0.98, element: "erde", sw: "#565A62" },
    g: { name: function () { return L2("Kies", "Gravel"); }, speed: 0.9, element: "erde", sw: "#A49E92" },
    m: { name: function () { return L2("Moos", "Moss"); }, speed: 0.96, element: "holz", sw: "#5E8040" },
    e: { name: function () { return L2("Erde", "Soil"); }, speed: 0.92, element: "erde", sw: "#6A4E38" },
    a: { name: function () { return L2("Sand (geharkt)", "Raked sand"); }, speed: 0.84, element: "erde", sw: "#D2C8AC" },
    w: { name: function () { return L2("Wasser", "Water"); }, speed: 0.55, element: "wasser", wet: true, sw: "#2E5A60" },
    "#": { name: function () { return L2("Mauer", "Wall"); }, solid: true, sw: "#3E3B38" },
    v: { name: function () { return L2("Abgrund", "Abyss"); }, solid: true, abyss: true, sw: "#26303E" }
  };

  function blankTiles() {
    var t = [];
    for (var y = 0; y < R; y++) for (var x = 0; x < C; x++)
      t.push(y === 0 || y === R - 1 || x === 0 || x === C - 1 ? "v" : "s");
    return t.join("");
  }

  function Arena(data) {
    data = data || {};
    this.name = data.name || "Tempel";
    this.seed = data.seed || 7;
    this.time = data.time == null ? 18.2 : data.time;
    this.tiles = (data.tiles && data.tiles.length === C * R ? data.tiles : blankTiles()).split("");
    this.leaf = (data.leaf && data.leaf.length === C * R ? data.leaf : new Array(C * R + 1).join("0")).split("");
    this.obj = (data.obj || []).filter(function (o) { return SZ.OBJECTS[o[0]]; }).map(function (o) { return { t: o[0], x: o[1], y: o[2], v: Math.min(o[3] | 0, SZ.OBJECTS[o[0]].variants - 1) }; });
    this.veg = (data.veg || []).filter(function (o) { return SZ.VEG[o[0]]; }).map(function (o) { return { t: o[0], x: o[1], y: o[2], v: Math.min(o[3] | 0, SZ.VEG[o[0]].variants - 1) }; });
    this.spawn = data.spawn || [SZ.W / 2, SZ.H / 2 + 14];
    this.rev = 0;
  }
  var A = Arena.prototype;
  A.tile = function (tx, ty) { if (tx < 0 || ty < 0 || tx >= C || ty >= R) return "v"; return this.tiles[ty * C + tx]; };
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
  A.walkable = function (x, y, r) {
    r = r || 0;
    return !this.solidTile(Math.floor((x - r) / T), Math.floor(y / T)) && !this.solidTile(Math.floor((x + r) / T), Math.floor(y / T)) &&
      !this.solidTile(Math.floor(x / T), Math.floor((y - r) / T)) && !this.solidTile(Math.floor(x / T), Math.floor((y + r) / T));
  };

  A.solids = function () {
    var out = [];
    this.obj.forEach(function (o) {
      var sol = SZ.objSolid(o); if (!sol) return;
      var k = o.t === "rock" ? 0.75 : 1;   // Steine: Hitbox 25 % kleiner, damit man seltener hängen bleibt
      sol.forEach(function (s) { out.push([o.x + s[0] * k, o.y + s[1] * k, s[2] * k, o]); });
    });
    return out;
  };
  // Kreis (Füße) bewegen, mit Abgrund, Mauern und Objekten kollidieren
  // canFall: erzwungene Bewegung (Rückstoß, Dash) – dann hält der Abgrund nicht auf, man kann hinunterstürzen
  A.move = function (x, y, dx, dy, r, solids, canFall) {
    var self = this;
    function blocked(px, py) {
      if (canFall) return self.solidTile(Math.floor(px / T), Math.floor(py / T)) && self.tilePx(px, py) !== "v";
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
      if (d < min && d > 0.0001) {
        var nx = c[0] + ddx / d * min, ny = c[1] + ddy / d * min / 1.4;
        if (!blocked(nx, ny)) { x = nx; y = ny; }
      }
    });
    return { x: x, y: y };
  };

  A.serialize = function () {
    return {
      v: 2, name: this.name, seed: this.seed, time: Math.round(this.time * 100) / 100,
      tiles: this.tiles.join(""), leaf: this.leaf.join(""),
      obj: this.obj.map(function (o) { return [o.t, Math.round(o.x), Math.round(o.y), o.v]; }),
      veg: this.veg.map(function (o) { return [o.t, Math.round(o.x), Math.round(o.y), o.v]; }),
      spawn: this.spawn
    };
  };

  // ---------- Eingebauter Tempel auf der schwebenden Insel ----------
  function makeTemple() {
    var a = new Arena({ seed: 7, time: 18.2 }), rnd = SZ.rng(4242);
    function set(x, y, ch) { if (x > 0 && y > 0 && x < C - 1 && y < R - 1) a.setTile(x, y, ch); }
    function rect(x0, y0, x1, y1, ch) { for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) set(x, y, ch); }
    // Unregelmäßige Inselkante
    [[1, 1], [2, 1], [1, 2], [28, 1], [27, 1], [28, 2], [1, 15], [28, 15], [27, 15], [28, 8], [28, 9], [12, 15], [13, 15]].forEach(function (p) { a.setTile(p[0], p[1], "v"); });
    // Große Platten: Platz in der Mitte und Weg zum Torii
    rect(10, 6, 19, 11, "p"); rect(14, 2, 15, 5, "p");
    // Kies um den Sandgarten, Sand in der Mitte
    rect(19, 2, 27, 7, "g"); rect(20, 3, 26, 6, "a"); a.setTile(20, 3, "g"); a.setTile(26, 6, "g");
    // Bruchstein unten rechts, Kopfstein vom Platz zum Teich
    rect(21, 11, 27, 14, "h");
    [[9, 10], [8, 10], [8, 11], [7, 11], [9, 11], [8, 12]].forEach(function (p) { set(p[0], p[1], "b"); });
    // Teich unten links, fließt über die Südkante
    var pond = { 11: [4, 6], 12: [3, 7], 13: [3, 7], 14: [4, 7], 15: [4, 6] };
    Object.keys(pond).forEach(function (y) { for (var x = pond[y][0]; x <= pond[y][1]; x++) set(x, +y, "w"); });
    // Moos um den Teich und in Ecken
    for (var y = 1; y < R - 1; y++) for (var x = 1; x < C - 1; x++) {
      var t = a.tile(x, y); if (t !== "s") continue;
      var nearW = false;
      for (var oy = -1; oy <= 1; oy++) for (var ox = -1; ox <= 1; ox++) if (a.tile(x + ox, y + oy) === "w") nearW = true;
      var corner = (x < 5 && y < 5) || (x > 24 && y > 12) || (x < 3 && y > 8);
      if ((nearW && rnd() < 0.85) || (corner && rnd() < 0.7)) set(x, y, "m");
    }
    // Erde unter den Bäumen
    [[3, 5], [4, 5], [5, 5], [3, 6], [4, 6], [4, 4], [24, 12], [25, 12], [25, 13], [26, 12]].forEach(function (p) { set(p[0], p[1], "e"); });
    for (var ly = 2; ly <= 8; ly++) for (var lx = 1; lx <= 7; lx++) if (rnd() < 0.85) a.setLeaf(lx, ly, true);

    function o(t, x, y, v) { a.obj.push({ t: t, x: x, y: y, v: v || 0 }); }
    o("torii", 240, 48);
    o("toro", 52, 36); o("toro", 150, 34, 1); o("toro", 330, 34, 1); o("toro", 428, 38);
    o("sakura", 186, 76, 0); o("sakura", 298, 74, 1); o("sakura", 136, 182, 2);
    o("maple", 62, 98); o("pine", 412, 204);
    o("bamboo", 454, 98); o("bamboo", 462, 116, 1); o("cypress", 444, 160); o("cedar", 30, 140, 0);
    o("tree", 334, 234, 1);
    o("bush", 106, 40, 0); o("bush", 372, 42, 1); o("bush", 28, 196, 2); o("bush", 222, 252, 3); o("bush", 262, 250, 4); o("bush", 452, 234, 5);
    o("rock", 344, 82, 0); o("rock", 396, 72, 2); o("rock", 382, 102, 1);
    o("rock", 34, 238, 3); o("rock", 90, 206, 5); o("rock", 104, 222, 5); o("rock", 196, 238, 4); o("rock", 300, 200, 6); o("rock", 160, 112, 8);
    o("jizo", 160, 236);
    o("makiwara", 176, 140); o("makiwara", 306, 170);

    function ok(x, y) { var c = a.tilePx(x, y); return c !== "#" && c !== "w" && c !== "a" && c !== "v" && c !== "p"; }
    function v(t, x, y) { if (ok(x, y)) a.veg.push({ t: t, x: Math.round(x), y: Math.round(y), v: (rnd() * SZ.VEG[t].variants) | 0 }); }
    for (var i = 0; i < 420; i++) {
      var x2 = 18 + rnd() * (SZ.W - 36), y2 = 22 + rnd() * (SZ.H - 44), c = a.tilePx(x2, y2);
      var edge = x2 < 50 || x2 > SZ.W - 50 || y2 < 44 || y2 > SZ.H - 40;
      if (Math.abs(x2 - 240) < 96 && Math.abs(y2 - 146) < 62) continue;
      if (c === "m" && rnd() < 0.7) v(rnd() < 0.7 ? "grass" : rnd() < 0.5 ? "fern" : "tallgrass", x2, y2);
      else if (c === "e" && rnd() < 0.6) v(rnd() < 0.5 ? "grass" : "fern", x2, y2);
      else if ((c === "s" || c === "h" || c === "b") && edge && rnd() < 0.4) v(rnd() < 0.6 ? "grass" : "tallgrass", x2, y2);
      else if (c === "g" && rnd() < 0.08) v("grass", x2, y2);
    }
    for (var h = 0; h < 22; h++) { var an = rnd() * 6.28, rr = 14 + rnd() * 26; v("lily", 62 + Math.cos(an) * rr * 1.3, 110 + Math.sin(an) * rr * 0.7); }
    for (var h2 = 0; h2 < 10; h2++) v("lily", 180 + rnd() * 30, 246 + rnd() * 8);
    // Kornfeld unten rechts, hohe Wiese links
    for (var wf = 0; wf < 34; wf++) v("wheat", 346 + rnd() * 48, 212 + rnd() * 34);
    for (var tm = 0; tm < 40; tm++) { var px = 20 + rnd() * 26, py = 150 + rnd() * 40; v(rnd() < 0.7 ? "tallgrass" : "flower", px, py); }
    for (var r2 = 0; r2 < 34; r2++) {
      var qx = 24 + rnd() * 120, qy = 168 + rnd() * 84;
      if (a.tilePx(qx, qy) !== "w") { var near = a.tilePx(qx + 8, qy) === "w" || a.tilePx(qx - 8, qy) === "w" || a.tilePx(qx, qy + 8) === "w" || a.tilePx(qx, qy - 8) === "w"; if (near) v("reed", qx, qy); }
    }
    for (var lo = 0; lo < 14; lo++) {
      var wx = 52 + rnd() * 66, wy = 180 + rnd() * 44;
      if (a.tilePx(wx, wy) === "w" && a.tilePx(wx + 8, wy) === "w" && a.tilePx(wx - 8, wy) === "w" && a.tilePx(wx, wy + 6) === "w")
        a.veg.push({ t: "lotus", x: Math.round(wx), y: Math.round(wy), v: (rnd() * 3) | 0 });
    }
    for (var f = 0; f < 16; f++) v("flower", 20 + rnd() * 440, 30 + rnd() * 220);
    for (var l = 0; l < 26; l++) v("leaves", 30 + rnd() * 80, 60 + rnd() * 80);
    for (var p2 = 0; p2 < 18; p2++) v("petals", 150 + rnd() * 180, 70 + rnd() * 40);
    for (var fe = 0; fe < 12; fe++) v("fern", 420 + rnd() * 40, 86 + rnd() * 90);
    a.veg = a.veg.filter(function (q) { return !(Math.abs(q.x - 240) < 40 && q.y < 64); });
    a.spawn = [240, 150];
    return a;
  }

  var KEY = "shizuku.arena.v1";
  SZ.arena = {
    Arena: Arena,
    blank: function () { return new Arena({}); },
    // Map-Pool (arenas/pool.js): Liste aller Maps für alle Spieler
    pool: function () {
      var P = (SZ.ARENA_POOL && SZ.ARENA_POOL.length) ? SZ.ARENA_POOL : ["tempel"];
      return P.map(function (e, i) { return { i: i, name: typeof e === "string" ? "Tempel" : (e.name || "Map " + (i + 1)), entry: e }; });
    },
    fromPool: function (i) {
      var P = this.pool(), e = P[((i % P.length) + P.length) % P.length].entry;
      return typeof e === "string" ? makeTemple() : new Arena(JSON.parse(JSON.stringify(e)));
    },
    // Zufällige Map aus dem Pool
    standard: function () { return this.fromPool(Math.floor(Math.random() * this.pool().length)); },
    // Gespielt wird immer eine Map aus dem Pool
    active: function () { return this.standard(); },
    // Arbeitsstand des Dev Tools (nur in diesem Browser, wird nie gespielt außer über „Testen“)
    working: function () {
      var s = SZ.store.get(KEY);
      if (s) { try { return new Arena(JSON.parse(s)); } catch (e) {} }
      return this.fromPool(0);
    },
    hasLocal: function () { return !!SZ.store.get(KEY); },
    saveLocal: function (a) { return SZ.store.set(KEY, JSON.stringify(a.serialize())); },
    clearLocal: function () { SZ.store.del(KEY); }
  };
})();
