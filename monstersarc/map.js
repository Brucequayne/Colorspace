/* Monsters Arc – map.js
   Datenmodell einer Map (aus Shizukus arena.js übernommen): Kacheln Boden, Objekte, Vegetation, Laubfall-Zonen,
   Tageszeit, Startpunkt. Neu: die Größe ist einstellbar (cols × rows Kacheln à 16 px), eine neue Map ist komplett Meer.
   Außerhalb der Map liegt ebenfalls Meer. Bodenarten beeinflussen das Laufen (speed) wie in Shizuku.
   Seit v0.11: Standardgröße 800 × 600 Kacheln (ganze Spielwelt), Zonen (Städte, Routen – Name erscheint beim Betreten),
   Speichern platzsparend (Lauflängen-Kodierung) und im Browser über IndexedDB.
   Hinweis: In der Welt heißt die Map aus Kompatibilität mit den übernommenen Modulen weiter „arena“ (world.arena). */
(function () {
  var MA = window.MA, L2 = MA.L2, T = MA.TILE;

  // Bodenarten. Zeichen = Kürzel im gespeicherten Text. (Aus Shizuku; neu: „o“ Meer, „v“ Abgrund entfällt.)
  MA.TILES = {
    o: { name: function () { return L2("Meer (tief)", "Sea (deep)"); }, solid: true, wet: true, sw: "#163440" },
    w: { name: function () { return L2("Wasser (flach)", "Water (shallow)"); }, solid: true, element: "wasser", wet: true, sw: "#2E5A60" },   // seit v0.16 nicht begehbar (nur Sumpf ist begehbar)
    u: { name: function () { return L2("Sumpf", "Swamp"); }, speed: 0.48, element: "wasser", wet: true, sw: "#5E7A5A" },   // seit v0.12: seicht, grünlich, begehbar
    s: { name: function () { return L2("Steinplatten", "Stone slabs"); }, speed: 1, element: "erde", sw: "#77726A" },
    p: { name: function () { return L2("Große Tempelplatten", "Large temple slabs"); }, speed: 1, element: "erde", sw: "#958E80" },
    b: { name: function () { return L2("Kopfsteinpflaster", "Cobblestones"); }, speed: 0.97, element: "erde", sw: "#6E685E" },
    h: { name: function () { return L2("Bruchstein", "Flagstones"); }, speed: 0.98, element: "erde", sw: "#565A62" },
    g: { name: function () { return L2("Kies", "Gravel"); }, speed: 0.9, element: "erde", sw: "#A49E92" },
    m: { name: function () { return L2("Moos", "Moss"); }, speed: 0.96, element: "holz", sw: "#5E8040" },
    e: { name: function () { return L2("Erde", "Soil"); }, speed: 0.92, element: "erde", sw: "#6A4E38" },
    a: { name: function () { return L2("Sand (geharkt)", "Raked sand"); }, speed: 0.84, element: "erde", sw: "#D2C8AC", prints: [[150, 136, 108, 0.7], [232, 224, 202, 0.55]] },
    // seit v0.19: Matsch (langsam) und Dünensand; prints = Farbe/Deckkraft der Fußabdrücke
    k: { name: function () { return L2("Matsch", "Mud"); }, speed: 0.62, element: "erde", sw: "#4E3A2A", prints: [[26, 16, 10, 0.85], [104, 84, 62, 0.6]] },
    q: { name: function () { return L2("Sand (Dünen)", "Sand (dunes)"); }, speed: 0.84, element: "erde", sw: "#D6BC8A", prints: [[168, 132, 84, 0.75], [244, 226, 182, 0.6]] },
    "#": { name: function () { return L2("Mauer", "Wall"); }, solid: true, sw: "#3E3B38" },
    // nur in Innenräumen (seit v0.15, nicht im Editor): schwarz außerhalb des Raums, Holzdielen
    x: { name: function () { return L2("Leere", "Void"); }, solid: true, inner: true, sw: "#0C0B0E" },
    d: { name: function () { return L2("Holzdielen", "Floorboards"); }, speed: 1, inner: true, sw: "#946A44" }
  };
  MA.SEA = "o";
  MA.MAP_MIN = [30, 17]; MA.MAP_MAX = [1024, 1024]; MA.MAP_DEF = [800, 600];   // Kacheln (Breite, Höhe)
  MA.ZONE_IDS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz123456789";   // "0" = keine Zone

  function fill(n, ch) { return new Array(n + 1).join(ch); }
  // Lauflängen-Kodierung: "rle:" + je Lauf Zeichen + Länge (Basis 36) + "."
  function enc(arr) {
    var out = ["rle:"], n = arr.length, i = 0;
    while (i < n) { var c = arr[i], j = i + 1; while (j < n && arr[j] === c) j++; out.push(c + (j - i).toString(36) + "."); i = j; }
    return out.join("");
  }
  function dec(str, n, def) {
    if (!str) return null;
    if (str.slice(0, 4) !== "rle:") return str.length === n ? str.split("") : null;
    var out = new Array(n), k = 0, i = 4;
    while (i < str.length && k < n) { var c = str[i], j = str.indexOf(".", i + 1), len = parseInt(str.slice(i + 1, j), 36); for (var q = 0; q < len && k < n; q++) out[k++] = c; i = j + 1; }
    while (k < n) out[k++] = def;
    return out;
  }

  function GameMap(data) {
    data = data || {};
    this.name = data.name || L2("Neue Map", "New map");
    this.seed = data.seed || 7;
    this.time = data.time == null ? 12 : data.time;
    this.cols = Math.max(MA.MAP_MIN[0], Math.min(MA.MAP_MAX[0], data.cols | 0 || MA.MAP_DEF[0]));
    this.rows = Math.max(MA.MAP_MIN[1], Math.min(MA.MAP_MAX[1], data.rows | 0 || MA.MAP_DEF[1]));
    var n = this.cols * this.rows;
    this.tiles = dec(data.tiles, n, MA.SEA) || fill(n, MA.SEA).split("");
    this.leaf = dec(data.leaf, n, "0") || fill(n, "0").split("");
    this.zone = dec(data.zone, n, "0") || fill(n, "0").split("");
    this.wall = dec(data.wall, n, "0") || fill(n, "0").split("");   // seit v0.13: Mauern je Kachel (walls.js), "0" = keine
    // Zonen: [{ id, name, col }] – id ist ein Zeichen aus MA.ZONE_IDS
    this.zones = (data.zones || []).map(function (z) { return { id: z.id, name: z.name || "", col: z.col || "#62929E" }; });
    this.obj = (data.obj || []).filter(function (o) { return MA.OBJECTS[o[0]]; }).map(function (o) { var q = { t: o[0], x: o[1], y: o[2], v: Math.min(o[3] | 0, MA.OBJECTS[o[0]].variants - 1) }; if (o[4] != null) q.s = o[4]; return q; });   // s = Sortier-y (Hausdeko, seit v0.17)
    this.veg = (data.veg || []).filter(function (o) { return MA.VEG[o[0]]; }).map(function (o) { return { t: o[0], x: o[1], y: o[2], v: Math.min(o[3] | 0, MA.VEG[o[0]].variants - 1) }; });
    this.spawn = data.spawn || [this.cols * T / 2, this.rows * T / 2];
    this.rev = 0; this.vegRev = 0; this.zoneRev = 0; this.wallRev = 0;
    this.dirty = null;    // geänderter Kachelbereich seit dem letzten Neuzeichnen {x0,y0,x1,y1}
    this.zdirty = null;   // geänderter Zonenbereich
  }
  var A = GameMap.prototype;
  A.pxW = function () { return this.cols * T; };
  A.pxH = function () { return this.rows * T; };
  A.tile = function (tx, ty) { if (tx < 0 || ty < 0 || tx >= this.cols || ty >= this.rows) return MA.SEA; return this.tiles[ty * this.cols + tx]; };
  A.tilePx = function (x, y) { return this.tile(Math.floor(x / T), Math.floor(y / T)); };
  A.wetPx = function (x, y) { var d = MA.TILES[this.tilePx(x, y)]; return !!(d && d.wet); };
  A.setTile = function (tx, ty, ch) {
    if (tx < 0 || ty < 0 || tx >= this.cols || ty >= this.rows) return false;
    var i = ty * this.cols + tx; if (this.tiles[i] === ch) return false;
    this.tiles[i] = ch; this.rev++;
    var d = this.dirty;
    if (!d) this.dirty = { x0: tx, y0: ty, x1: tx + 1, y1: ty + 1 };
    else { d.x0 = Math.min(d.x0, tx); d.y0 = Math.min(d.y0, ty); d.x1 = Math.max(d.x1, tx + 1); d.y1 = Math.max(d.y1, ty + 1); }
    return true;
  };
  // Bereich als geändert melden, ohne Kacheln zu ändern (z. B. neuer Fels → Sandringe neu zeichnen)
  A.touch = function (tx0, ty0, tx1, ty1) {
    tx0 = Math.max(0, tx0); ty0 = Math.max(0, ty0); tx1 = Math.min(this.cols, tx1); ty1 = Math.min(this.rows, ty1);
    if (tx1 <= tx0 || ty1 <= ty0) return;
    this.rev++;
    var d = this.dirty;
    if (!d) this.dirty = { x0: tx0, y0: ty0, x1: tx1, y1: ty1 };
    else { d.x0 = Math.min(d.x0, tx0); d.y0 = Math.min(d.y0, ty0); d.x1 = Math.max(d.x1, tx1); d.y1 = Math.max(d.y1, ty1); }
  };
  // Zonen
  A.zoneAt = function (tx, ty) { if (tx < 0 || ty < 0 || tx >= this.cols || ty >= this.rows) return "0"; return this.zone[ty * this.cols + tx]; };
  A.zonePx = function (x, y) { return this.zoneAt(Math.floor(x / T), Math.floor(y / T)); };
  A.zoneInfo = function (id) { for (var i = 0; i < this.zones.length; i++) if (this.zones[i].id === id) return this.zones[i]; return null; };
  A.setZone = function (tx, ty, id) {
    if (tx < 0 || ty < 0 || tx >= this.cols || ty >= this.rows) return false;
    var i = ty * this.cols + tx; if (this.zone[i] === id) return false;
    this.zone[i] = id; this.zoneRev++;
    var d = this.zdirty;
    if (!d) this.zdirty = { x0: tx, y0: ty, x1: tx + 1, y1: ty + 1 };
    else { d.x0 = Math.min(d.x0, tx); d.y0 = Math.min(d.y0, ty); d.x1 = Math.max(d.x1, tx + 1); d.y1 = Math.max(d.y1, ty + 1); }
    return true;
  };
  A.addZone = function (name, col) {
    var used = {}; this.zones.forEach(function (z) { used[z.id] = 1; });
    var id = null; for (var k = 0; k < MA.ZONE_IDS.length; k++) if (!used[MA.ZONE_IDS[k]]) { id = MA.ZONE_IDS[k]; break; }
    if (!id) return null;
    var z = { id: id, name: name, col: col }; this.zones.push(z); this.zoneRev++; return z;
  };
  A.removeZone = function (id) {
    this.zones = this.zones.filter(function (z) { return z.id !== id; });
    for (var i = 0; i < this.zone.length; i++) if (this.zone[i] === id) this.zone[i] = "0";
    this.zoneRev++; this.zdirty = { x0: 0, y0: 0, x1: this.cols, y1: this.rows };
  };
  A.touchVeg = function () { this.vegRev++; };
  // Mauern (seit v0.13)
  A.wallAt = function (tx, ty) { if (tx < 0 || ty < 0 || tx >= this.cols || ty >= this.rows) return "0"; return this.wall[ty * this.cols + tx]; };
  A.setWall = function (tx, ty, ch) {
    if (tx < 0 || ty < 0 || tx >= this.cols || ty >= this.rows) return false;
    var i = ty * this.cols + tx; if (this.wall[i] === ch) return false;
    this.wall[i] = ch; this.wallRev++; return true;
  };
  A.isLeaf = function (tx, ty) { return this.leaf[ty * this.cols + tx] === "1"; };
  A.setLeaf = function (tx, ty, on) { if (tx < 0 || ty < 0 || tx >= this.cols || ty >= this.rows) return; this.leaf[ty * this.cols + tx] = on ? "1" : "0"; };
  A.speedAt = function (x, y) { var d = MA.TILES[this.tilePx(x, y)]; return d ? d.speed || 1 : 1; };
  A.solidTile = function (tx, ty) { var d = MA.TILES[this.tile(tx, ty)]; return !!(d && d.solid); };
  A.walkable = function (x, y, r) {
    r = r || 0;
    return !this.solidTile(Math.floor((x - r) / T), Math.floor(y / T)) && !this.solidTile(Math.floor((x + r) / T), Math.floor(y / T)) &&
      !this.solidTile(Math.floor(x / T), Math.floor((y - r) / T)) && !this.solidTile(Math.floor(x / T), Math.floor((y + r) / T)) && !MA.walls.hit(this, x, y, r);
  };

  // Größe ändern: Inhalt bleibt mittig erhalten, neue Fläche ist Meer
  A.resize = function (cols, rows) {
    cols = Math.max(MA.MAP_MIN[0], Math.min(MA.MAP_MAX[0], cols | 0)); rows = Math.max(MA.MAP_MIN[1], Math.min(MA.MAP_MAX[1], rows | 0));
    if (cols === this.cols && rows === this.rows) return false;
    var ox = Math.floor((cols - this.cols) / 2), oy = Math.floor((rows - this.rows) / 2), t = [], l = [], zz = [], wl = [];
    for (var y = 0; y < rows; y++) for (var x = 0; x < cols; x++) {
      var sx = x - ox, sy = y - oy, inside = sx >= 0 && sy >= 0 && sx < this.cols && sy < this.rows, k = sy * this.cols + sx;
      t.push(inside ? this.tiles[k] : MA.SEA); l.push(inside ? this.leaf[k] : "0"); zz.push(inside ? this.zone[k] : "0"); wl.push(inside ? this.wall[k] : "0");
    }
    this.zone = zz; this.wall = wl; this.zoneRev++; this.vegRev++; this.wallRev++;
    var dx = ox * T, dy = oy * T, W2 = cols * T, H2 = rows * T;
    function keep(o) { o.x += dx; o.y += dy; if (o.s != null) o.s += dy; return o.x >= 0 && o.y >= 0 && o.x < W2 && o.y < H2; }
    this.obj = this.obj.filter(keep); this.veg = this.veg.filter(keep);
    this.spawn = [Math.max(8, Math.min(W2 - 8, this.spawn[0] + dx)), Math.max(8, Math.min(H2 - 8, this.spawn[1] + dy))];
    this.cols = cols; this.rows = rows; this.tiles = t; this.leaf = l; this.rev++; this.dirty = null;
    return true;
  };

  A.solids = function () {
    var out = [], br = this.brects = [];
    // Häuser (seit v0.15): Grundfläche als Rechteck
    this.obj.forEach(function (o) { var d = MA.OBJECTS[o.t]; if (d.rect) br.push([o.x + d.rect[0], o.y + d.rect[1], o.x + d.rect[2], o.y + d.rect[3]]); });
    this.obj.forEach(function (o) {
      var sol = MA.objSolid(o); if (!sol) return;
      var k = o.t === "rock" ? 0.75 : 1;   // Steine: Hitbox 25 % kleiner, damit man seltener hängen bleibt
      sol.forEach(function (s) { out.push([o.x + s[0] * k, o.y + s[1] * k, s[2] * k, o]); });
    });
    return out;
  };
  // Kreis (Füße) bewegen, mit festen Kacheln (Meer, Mauer) und Objekten kollidieren – wie in Shizuku
  A.move = function (x, y, dx, dy, r, solids) {
    var self = this;
    function blocked(px, py) {
      var x0 = Math.floor((px - r) / T), x1 = Math.floor((px + r) / T), y0 = Math.floor((py - r) / T), y1 = Math.floor((py + r) / T);
      for (var ty = y0; ty <= y1; ty++) for (var tx = x0; tx <= x1; tx++) if (self.solidTile(tx, ty)) return true;
      var b = self.brects || [];
      for (var bi = 0; bi < b.length; bi++) {
        var q = b[bi], qx = Math.max(q[0], Math.min(px, q[2])), qy = Math.max(q[1], Math.min(py, q[3]));
        if ((px - qx) * (px - qx) + (py - qy) * (py - qy) < r * r) return true;
      }
      return MA.walls.hit(self, px, py, r);   // Mauern, Hecken, Zäune: unüberwindbar
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
      v: 1, game: "monstersarc", name: this.name, seed: this.seed, time: Math.round(this.time * 100) / 100, cols: this.cols, rows: this.rows,
      tiles: enc(this.tiles), leaf: enc(this.leaf), zone: enc(this.zone), wall: enc(this.wall), zones: this.zones.map(function (z) { return { id: z.id, name: z.name, col: z.col }; }),
      obj: this.obj.map(function (o) { var q = [o.t, Math.round(o.x), Math.round(o.y), o.v]; if (o.s != null) q.push(o.s); return q; }),
      veg: this.veg.map(function (o) { return [o.t, Math.round(o.x), Math.round(o.y), o.v]; }),
      spawn: this.spawn.map(Math.round)
    };
  };

  // Arbeitsstand im Browser: IndexedDB (viel Platz für große Welten), sonst localStorage
  var KEY = "monstersarc.map.v1", DB = null;
  function db(cb) {
    if (DB) return cb(DB);
    try {
      var rq = indexedDB.open("monstersarc", 1);
      rq.onupgradeneeded = function () { rq.result.createObjectStore("kv"); };
      rq.onsuccess = function () { DB = rq.result; cb(DB); };
      rq.onerror = function () { cb(null); };
    } catch (e) { cb(null); }
  }
  function idbGet(k, cb) { db(function (d) { if (!d) return cb(null); try { var r = d.transaction("kv").objectStore("kv").get(k); r.onsuccess = function () { cb(r.result || null); }; r.onerror = function () { cb(null); }; } catch (e) { cb(null); } }); }
  function idbSet(k, v, cb) { db(function (d) { if (!d) return cb(false); try { var tx = d.transaction("kv", "readwrite"); tx.objectStore("kv").put(v, k); tx.oncomplete = function () { cb(true); }; tx.onerror = function () { cb(false); }; } catch (e) { cb(false); } }); }
  function idbDel(k) { db(function (d) { if (d) try { d.transaction("kv", "readwrite").objectStore("kv").delete(k); } catch (e) {} }); }

  MA.maps = {
    GameMap: GameMap,
    blank: function (cols, rows) { return new GameMap({ cols: cols, rows: rows }); },
    // Start-Map des Spiels (maps/start.js); ohne Datei: leeres Meer in Standardgröße
    start: function () { return MA.MAP_START ? new GameMap(JSON.parse(JSON.stringify(MA.MAP_START))) : this.blank(); },
    // Arbeitsstand des Dev-Kits (nur in diesem Browser), asynchron
    loadWorking: function (cb) {
      var self = this;
      idbGet(KEY, function (s) {
        s = s || MA.store.get(KEY);
        if (s) { try { return cb(new GameMap(JSON.parse(s))); } catch (e) {} }
        cb(self.start());
      });
    },
    saveLocal: function (a, cb) {
      var s = JSON.stringify(a.serialize());
      idbSet(KEY, s, function (ok) { if (ok) MA.store.del(KEY); cb && cb(ok || MA.store.set(KEY, s), s.length); });
    },
    clearLocal: function () { idbDel(KEY); MA.store.del(KEY); }
  };
})();
