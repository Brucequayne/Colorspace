/* Shizuku – editor.js  (Dev Tool)
   Arenen bauen: Boden kachelgenau, Objekte setzen/verschieben/löschen, organische Pinsel
   (Gras, Farn, Higanbana, Blüten, Schilf, Seerosen, Laub, Wasser, Moos, Erde, Sand, Laubfall),
   Radierer, Tageszeit mit Lichtvorschau, Wind, Rückgängig, Speichern, Export/Import, Testen.
   Erreichbar über das kleine Feld unten links im Menü (Code). */
(function () {
  var SZ = window.SZ, L2 = SZ.L2, m = SZ.m, T = SZ.TILE;
  var PANEL = 272;

  SZ.EDITOR_CSS =
    ".sz-ed{position:absolute;left:0;top:0;bottom:0;width:" + PANEL + "px;background:#1C1D1C;border-right:1px solid #3A3C3A;overflow-y:auto;overflow-x:hidden;padding:12px 12px 20px;font-size:13px;color:#DCD8CF;scrollbar-width:thin}" +
    ".sz-ed h3{margin:16px 0 7px;font:600 .7rem/1 var(--f-body,system-ui);letter-spacing:.12em;text-transform:uppercase;color:#8E8A82}" +
    ".sz-ed-head{display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid #3A3C3A;padding-bottom:10px}.sz-ed-head b{font-size:1rem}.sz-ed-head span{color:#8E8A82;font-size:.75rem}" +
    ".sz-ed button,.sz-ed select,.sz-ed input[type=text]{font:inherit;color:#E4E0D8;background:#262726;border:1px solid #434543;border-radius:0;padding:5px 8px;cursor:pointer}" +
    ".sz-ed input[type=text]{cursor:text;width:100%}" +
    ".sz-ed button:hover{border-color:#9A968E}.sz-ed button[aria-pressed=true]{background:#E4E0D8;color:#1C1D1C;border-color:#E4E0D8}" +
    ".sz-ed-tools{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}.sz-ed-tools button{padding:6px 2px;font-size:.78rem}" +
    ".sz-ed-list{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}" +
    ".sz-ed-list button{display:flex;flex-direction:column;align-items:center;gap:3px;padding:5px 2px;font-size:.68rem;line-height:1.15;text-align:center;min-height:58px;justify-content:flex-end}" +
    ".sz-ed-list img{image-rendering:pixelated;max-width:56px;max-height:38px}" +
    ".sz-ed-list .sw{width:30px;height:18px;border:1px solid #000}" +
    ".sz-ed-row{display:flex;align-items:center;gap:8px;margin:6px 0}.sz-ed-row label{flex:0 0 64px;color:#ACA89F}.sz-ed-row input[type=range]{min-width:0}.sz-ed-pre{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin:6px 0}.sz-ed-pre button{padding:5px 2px;font-size:.74rem}.sz-ed-row input[type=range]{flex:1;accent-color:#E8A04A}.sz-ed-row output{flex:0 0 42px;text-align:right;font-variant-numeric:tabular-nums}" +
    ".sz-ed-btns{display:grid;grid-template-columns:1fr 1fr;gap:4px}.sz-ed-btns .w{grid-column:1/-1}" +
    ".sz-ed-btns .go{background:#E8A04A;color:#1C1D1C;border-color:#E8A04A;font-weight:600}.sz-ed-btns .go2{border-color:#E8A04A;color:#F0C890}.sz-ed-btns select{width:100%}" +
    ".sz-ed-info{margin-top:12px;color:#8E8A82;font-size:.74rem;line-height:1.45}" +
    ".sz-ed-status{margin-top:8px;min-height:1.4em;color:#B9F0CF;font-size:.78rem}" +
    ".sz-ed-pos{position:absolute;right:10px;top:8px;font:12px monospace;color:#CFCAC0;background:rgba(0,0,0,.55);padding:3px 7px;pointer-events:none}";

  var TOOLS = ["tile", "brush", "obj", "move", "erase", "spawn"];
  function toolName(t) {
    return { tile: L2("Boden", "Floor"), brush: L2("Pinsel", "Brush"), obj: L2("Objekte", "Objects"), move: L2("Verschieben", "Move"), erase: L2("Radierer", "Eraser"), spawn: L2("Startpunkt", "Spawn") }[t];
  }
  // Pinselarten: veg = Pflanzen streuen, tile = Bodenart rund malen, leaf = Laubfall-Zone
  var BRUSHES = [
    { id: "meadow", kind: "veg", mix: [["grass", 6], ["fern", 1], ["flower", 1]], name: function () { return L2("Wiese", "Meadow"); } },
    { id: "grass", kind: "veg", mix: [["grass", 1]], name: function () { return SZ.VEG.grass.name(); } },
    { id: "tallgrass", kind: "veg", mix: [["tallgrass", 1]], name: function () { return SZ.VEG.tallgrass.name(); } },
    { id: "tallmeadow", kind: "veg", mix: [["tallgrass", 4], ["wildflower", 2], ["grass", 1]], name: function () { return L2("Hohe Wiese", "Tall meadow"); } },
    { id: "wheat", kind: "veg", mix: [["wheat", 1]], dens: 2.2, name: function () { return L2("Kornfeld", "Grain field"); } },
    { id: "wildflower", kind: "veg", mix: [["wildflower", 1]], name: function () { return SZ.VEG.wildflower.name(); } },
    { id: "fern", kind: "veg", mix: [["fern", 1]], name: function () { return SZ.VEG.fern.name(); } },
    { id: "lily", kind: "veg", mix: [["lily", 1]], name: function () { return SZ.VEG.lily.name(); } },
    { id: "flower", kind: "veg", mix: [["flower", 1]], name: function () { return SZ.VEG.flower.name(); } },
    { id: "reed", kind: "veg", mix: [["reed", 1]], name: function () { return SZ.VEG.reed.name(); } },
    { id: "lotus", kind: "veg", mix: [["lotus", 1]], name: function () { return SZ.VEG.lotus.name(); } },
    { id: "leaves", kind: "veg", mix: [["leaves", 1]], name: function () { return SZ.VEG.leaves.name(); } },
    { id: "petals", kind: "veg", mix: [["petals", 1]], name: function () { return SZ.VEG.petals.name(); } },
    { id: "leaffall", kind: "leaf", name: function () { return L2("Laubfall", "Leaf fall"); } },
    { id: "w", kind: "tile", name: function () { return SZ.TILES.w.name(); } },
    { id: "m", kind: "tile", name: function () { return SZ.TILES.m.name(); } },
    { id: "e", kind: "tile", name: function () { return SZ.TILES.e.name(); } },
    { id: "a", kind: "tile", name: function () { return SZ.TILES.a.name(); } },
    { id: "s", kind: "tile", name: function () { return SZ.TILES.s.name(); } },
    { id: "p", kind: "tile", name: function () { return SZ.TILES.p.name(); } },
    { id: "b", kind: "tile", name: function () { return SZ.TILES.b.name(); } },
    { id: "h", kind: "tile", name: function () { return SZ.TILES.h.name(); } },
    { id: "g", kind: "tile", name: function () { return SZ.TILES.g.name(); } },
    { id: "v", kind: "tile", name: function () { return SZ.TILES.v.name(); } }
  ];
  var TILE_SW = {}; Object.keys(SZ.TILES).forEach(function (k) { TILE_SW[k] = SZ.TILES[k].sw; });

  var E = null;   // Zustand des Editors (bleibt beim Testen erhalten)

  function thumb(kind, type, v) {
    var s = SZ.sprite(kind, type, v || 0), c = SZ.canvas(s.cv.width * 2, s.cv.height * 2);
    c.ctx.drawImage(s.cv, 0, 0, c.width, c.height);
    return c.toDataURL();
  }
  function fmtTime(t) { var h = Math.floor(t), mi = Math.floor((t - h) * 60); return (h < 10 ? "0" : "") + h + ":" + (mi < 10 ? "0" : "") + mi; }
  function download(name, text, type) {
    var b = new Blob([text], { type: type || "application/json" }), a = document.createElement("a");
    a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  function snapshot() { E.undo.push(JSON.stringify(E.arena.serialize())); if (E.undo.length > 60) E.undo.shift(); }
  function loadArena(a) {
    E.arena = a; E.world = new SZ.World(a); E.world.throttle = true;
    E.world.time = a.time; E.world.timeSpeed = E.timeRun ? E.timeSpeedV : 0; E.world.wind = E.wind;
    syncUI();
  }
  function undo() {
    var s = E.undo.pop(); if (!s) { status(L2("Nichts rückgängig zu machen.", "Nothing to undo.")); return; }
    var keep = { time: E.world.time };
    loadArena(new SZ.arena.Arena(JSON.parse(s)));
    E.world.time = keep.time;
    status(L2("Rückgängig.", "Undone."));
  }
  function status(t) { var el = E.ui && E.ui.querySelector(".sz-ed-status"); if (el) { el.textContent = t; clearTimeout(E.stT); E.stT = setTimeout(function () { el.textContent = ""; }, 3500); } }

  // ---------- Oberfläche ----------
  function build() {
    var ui = SZ.main.ui;
    ui.innerHTML = '<div class="sz-ed"></div><div class="sz-ed-pos"></div>';
    E.ui = ui.querySelector(".sz-ed"); E.pos = ui.querySelector(".sz-ed-pos");
    var h = '<div class="sz-ed-head"><b>Dev Tool</b><span>Shizuku v' + SZ.VERSION + '</span></div>' +
      '<h3>' + L2("Werkzeug", "Tool") + '</h3><div class="sz-ed-tools">' + TOOLS.map(function (t) { return '<button type="button" data-tool="' + t + '">' + toolName(t) + '</button>'; }).join("") + '</div>' +
      '<div class="sz-ed-opt"></div>' +
      '<h3>' + L2("Licht", "Light") + '</h3>' +
      '<div class="sz-ed-row"><label>' + L2("Uhrzeit", "Time") + '</label><input type="range" min="0" max="24" step="0.05" data-k="time"><output data-o="time"></output></div>' +
      '<div class="sz-ed-row"><label>' + L2("Zeit läuft", "Time runs") + '</label><button type="button" data-a="timerun">▶</button><select data-k="tspeed"><option value="0.1">0,1 h/s</option><option value="0.5">0,5 h/s</option><option value="2">2 h/s</option></select></div>' +
      '<div class="sz-ed-pre"><button type="button" data-time="6.1">' + L2("Aufgang", "Sunrise") + '</button><button type="button" data-time="12">' + L2("Mittag", "Noon") + '</button><button type="button" data-time="18.15">' + L2("Untergang", "Sunset") + '</button><button type="button" data-time="23">' + L2("Nacht", "Night") + '</button></div>' +
      '<div class="sz-ed-row"><label>Wind</label><input type="range" min="0" max="3" step="0.1" data-k="wind"><output data-o="wind"></output></div>' +
      '<h3>' + L2("Arena", "Arena") + '</h3>' +
      '<div class="sz-ed-row"><label>Name</label><input type="text" data-k="name" maxlength="40"></div>' +
      '<div class="sz-ed-row"><label>' + L2("Raster", "Grid") + ' (G)</label><button type="button" data-a="grid">' + L2("an/aus", "on/off") + '</button></div>' +
      '<div class="sz-ed-btns">' +
      '<button type="button" class="w go" data-a="test">' + L2("▶ Testen (mit Übergang)", "▶ Test (with transition)") + '</button>' +
      '<button type="button" data-a="grow">' + L2("Wachstum zeigen", "Show growth") + '</button>' +
      '<button type="button" data-a="undo">' + L2("Rückgängig", "Undo") + '</button>' +
      '<button type="button" class="w" data-a="save">' + L2("Speichern (dieser Browser)", "Save (this browser)") + '</button>' +
      '<select data-k="poolsel" class="w" aria-label="Map-Pool"></select>' +
      '<button type="button" data-a="std">' + L2("Pool-Map laden", "Load pool map") + '</button>' +
      '<button type="button" data-a="blank">' + L2("Leere Arena", "Empty arena") + '</button>' +
      '<button type="button" class="w go2" data-a="export">' + L2("Für Map-Pool exportieren (.json)", "Export for map pool (.json)") + '</button>' +
      '<button type="button" data-a="import">' + L2("Import", "Import") + '</button>' +
      '<button type="button" data-a="forget">' + L2("Lokale Arena löschen", "Forget local arena") + '</button>' +
      '<button type="button" data-a="menu">' + L2("← Menü", "← Menu") + '</button>' +
      '</div><input type="file" accept=".json,.js,application/json" hidden data-k="file">' +
      '<div class="sz-ed-status"></div>' +
      '<div class="sz-ed-info">' + L2(
        "Abgrund (Boden oder Pinsel) macht die Insel kleiner, Wasser am Rand wird zum Wasserfall. Linke Maustaste malt bzw. setzt, rechte löscht. Mausrad: Variante (Objekte) bzw. Pinselgröße. Umschalt: Objekte am 8-px-Raster. Strg+Z: rückgängig.<br>„Speichern“ gilt nur in diesem Browser. Für alle Spieler: „Für Map-Pool exportieren“ und die .json-Datei an Claude schicken, sie kommt dann in den Map-Pool.",
        "Abyss (floor or brush) shrinks the island, water at the edge becomes a waterfall. Left mouse paints or places, right deletes. Mouse wheel: variant (objects) or brush size. Shift: snap objects to 8 px. Ctrl+Z: undo.<br>“Save” only applies to this browser. For all players: “Export for map pool” and send the .json file to Claude, it then goes into the map pool.") + '</div>';
    E.ui.innerHTML = h;
    E.ui.addEventListener("click", onClick);
    E.ui.addEventListener("input", onInput);
    E.ui.querySelector("[data-k=file]").addEventListener("change", onFile);
    E.ui.querySelector("[data-k=poolsel]").innerHTML = SZ.arena.pool().map(function (p) { return '<option value="' + p.i + '">' + (p.i + 1) + ". " + p.name.replace(/</g, "") + "</option>"; }).join("");
    renderOpts(); syncUI();
  }

  function renderOpts() {
    var o = E.ui.querySelector(".sz-ed-opt"), h = "";
    if (E.tool === "tile") {
      h = '<h3>' + L2("Bodenart", "Floor type") + '</h3><div class="sz-ed-list">' + Object.keys(SZ.TILES).map(function (k) {
        return '<button type="button" data-tile="' + k + '" aria-pressed="' + (E.tile === k) + '"><span class="sw" style="background:' + TILE_SW[k] + '"></span>' + SZ.TILES[k].name() + '</button>';
      }).join("") + '</div>' + sizeRow("tsize", 1, 5, 1);
    } else if (E.tool === "brush") {
      h = '<h3>' + L2("Pinsel", "Brush") + '</h3><div class="sz-ed-list">' + BRUSHES.map(function (b) {
        var pic = b.kind === "veg" ? '<img alt="" src="' + thumb("veg", b.mix[0][0], 0) + '">' : b.kind === "tile" ? '<span class="sw" style="background:' + TILE_SW[b.id] + '"></span>' : '<span class="sw" style="background:#C0502A"></span>';
        return '<button type="button" data-brush="' + b.id + '" aria-pressed="' + (E.brush === b.id) + '">' + pic + b.name() + '</button>';
      }).join("") + '</div>' + sizeRow("bsize", 3, 48, 1) + '<div class="sz-ed-row"><label>' + L2("Dichte", "Density") + '</label><input type="range" min="1" max="10" step="1" data-k="dens" value="' + E.dens + '"><output data-o="dens">' + E.dens + '</output></div>';
    } else if (E.tool === "obj") {
      h = '<h3>' + L2("Objekt", "Object") + '</h3><div class="sz-ed-list">' + Object.keys(SZ.OBJECTS).map(function (k) {
        return '<button type="button" data-obj="' + k + '" aria-pressed="' + (E.obj === k) + '"><img alt="" src="' + thumb("obj", k, 0) + '">' + SZ.OBJECTS[k].name() + '</button>';
      }).join("") + '</div><div class="sz-ed-row"><label>Variante</label><button type="button" data-a="var">' + (E.ov + 1) + ' / ' + SZ.OBJECTS[E.obj].variants + '</button></div>';
    } else if (E.tool === "erase") {
      h = '<h3>' + L2("Radierer", "Eraser") + '</h3>' + sizeRow("bsize", 3, 48, 1) + '<div class="sz-ed-info">' + L2("Entfernt Pflanzen, Objekte und Laubfall im Kreis.", "Removes plants, objects and leaf fall in the circle.") + '</div>';
    } else if (E.tool === "move") {
      h = '<div class="sz-ed-info">' + L2("Objekt mit gedrückter linker Maustaste ziehen.", "Drag an object with the left mouse button.") + '</div>';
    } else if (E.tool === "spawn") {
      h = '<div class="sz-ed-info">' + L2("Klick setzt den Startpunkt des Samurai. Dort landet auch der Tropfen.", "Click sets the samurai's start point. The drop lands there too.") + '</div>';
    }
    o.innerHTML = h;
  }
  function sizeRow(k, a, b, st) {
    return '<div class="sz-ed-row"><label>' + L2("Größe", "Size") + '</label><input type="range" min="' + a + '" max="' + b + '" step="' + st + '" data-k="' + k + '" value="' + E[k] + '"><output data-o="' + k + '">' + E[k] + '</output></div>';
  }
  function syncUI() {
    if (!E.ui || !E.ui.querySelector) return;
    Array.prototype.forEach.call(E.ui.querySelectorAll("[data-tool]"), function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-tool") === E.tool)); });
    var q = function (s) { return E.ui.querySelector(s); };
    if (q("[data-k=time]")) { q("[data-k=time]").value = E.world.time; q("[data-o=time]").textContent = fmtTime(E.world.time); }
    if (q("[data-k=wind]")) { q("[data-k=wind]").value = E.wind; q("[data-o=wind]").textContent = E.wind.toFixed(1); }
    if (q("[data-k=name]")) q("[data-k=name]").value = E.arena.name;
    if (q("[data-a=timerun]")) q("[data-a=timerun]").setAttribute("aria-pressed", String(E.timeRun));
    if (q("[data-k=tspeed]")) q("[data-k=tspeed]").value = String(E.timeSpeedV);
  }

  function onClick(e) {
    var b = e.target.closest("button"); if (!b) return;
    var d = b.dataset;
    if (d.tool) { E.tool = d.tool; renderOpts(); syncUI(); return; }
    if (d.tile) { E.tile = d.tile; renderOpts(); return; }
    if (d.brush) { E.brush = d.brush; renderOpts(); return; }
    if (d.obj) { E.obj = d.obj; E.ov = 0; renderOpts(); return; }
    if (d.time) { E.world.time = +d.time; E.arena.time = E.world.time; syncUI(); return; }
    var a = d.a;
    if (a === "var") { E.ov = (E.ov + 1) % SZ.OBJECTS[E.obj].variants; renderOpts(); }
    else if (a === "timerun") { E.timeRun = !E.timeRun; E.world.timeSpeed = E.timeRun ? E.timeSpeedV : 0; syncUI(); }
    else if (a === "grid") E.grid = !E.grid;
    else if (a === "undo") undo();
    else if (a === "grow") { var sp = E.arena.spawn; E.world.startGrowth(sp[0], sp[1] - 4); E.world.parts.splash(sp[0], sp[1] - 4, 20, 1); }
    else if (a === "save") { E.arena.time = E.world.time; status(SZ.arena.saveLocal(E.arena) ? L2("Gespeichert. Diese Arena wird jetzt in diesem Browser gespielt.", "Saved. This arena is now played in this browser.") : L2("Speichern nicht möglich.", "Could not save.")); }
    else if (a === "std") { snapshot(); var ps = E.ui.querySelector("[data-k=poolsel]"); loadArena(SZ.arena.fromPool(+ps.value || 0)); status(L2("Pool-Map geladen (noch nicht gespeichert).", "Pool map loaded (not saved yet).")); }
    else if (a === "blank") { snapshot(); var t = E.world.time; loadArena(SZ.arena.blank()); E.world.time = E.arena.time = t; syncUI(); }
    else if (a === "forget") { SZ.arena.clearLocal(); status(L2("Lokale Arena gelöscht. Gespielt wird wieder die Standard-Arena.", "Local arena removed. The default arena is played again.")); }
    else if (a === "export") { E.arena.time = E.world.time; download("shizuku-map-" + (E.arena.name || "map").replace(/[^a-z0-9]+/gi, "-").toLowerCase() + ".json", JSON.stringify(E.arena.serialize())); }
    else if (a === "import") E.ui.querySelector("[data-k=file]").click();
    else if (a === "test") { E.arena.time = E.world.time; SZ.main.go("intro", { arena: E.arena.serialize(), back: "editor" }); }
    else if (a === "menu") SZ.main.go("menu");
  }
  function onInput(e) {
    var k = e.target.dataset.k; if (!k) return;
    var v = e.target.value;
    if (k === "time") { E.world.time = +v; E.arena.time = +v; }
    else if (k === "wind") { E.wind = +v; E.world.wind = E.wind; }
    else if (k === "tspeed") { E.timeSpeedV = +v; if (E.timeRun) E.world.timeSpeed = E.timeSpeedV; }
    else if (k === "name") E.arena.name = v;
    else if (k === "bsize" || k === "tsize" || k === "dens") E[k] = +v;
    var o = E.ui.querySelector('[data-o="' + k + '"]');
    if (o) o.textContent = k === "time" ? fmtTime(+v) : k === "wind" ? (+v).toFixed(1) : v;
  }
  function onFile(e) {
    var f = e.target.files[0]; if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      try {
        var txt = String(r.result), i = txt.indexOf("{"), j = txt.lastIndexOf("}");
        var data = JSON.parse(txt.slice(i, j + 1));
        snapshot(); loadArena(new SZ.arena.Arena(data));
        status(L2("Importiert: ", "Imported: ") + E.arena.name);
      } catch (er) { status(L2("Datei konnte nicht gelesen werden.", "Could not read the file.")); }
      e.target.value = "";
    };
    r.readAsText(f);
  }

  // ---------- Malen auf der Arena ----------
  function inCircle(cx, cy, r, fn) {
    var x0 = Math.floor((cx - r) / T), x1 = Math.floor((cx + r) / T), y0 = Math.floor((cy - r) / T), y1 = Math.floor((cy + r) / T);
    for (var ty = y0; ty <= y1; ty++) for (var tx = x0; tx <= x1; tx++) {
      if (m.dist(cx, cy, (tx + 0.5) * T, (ty + 0.5) * T) <= r + T * 0.35) fn(tx, ty);
    }
  }
  function vegOk(type, x, y) {
    var c = E.arena.tilePx(x, y), d = SZ.VEG[type];
    if (c === "#" || c === "v") return false;
    return d.water ? c === "w" : c !== "w";
  }
  function paintBrush(dt, erase) {
    var I = SZ.input, b = BRUSHES.filter(function (q) { return q.id === E.brush; })[0], r = E.bsize, a = E.arena;
    if (b.kind === "tile") { inCircle(I.mx, I.my, r * 0.8, function (tx, ty) { a.setTile(tx, ty, erase ? "s" : b.id); }); return; }
    if (b.kind === "leaf") { inCircle(I.mx, I.my, r * 0.8, function (tx, ty) { a.setLeaf(tx, ty, !erase); }); return; }
    if (erase) { removeVeg(I.mx, I.my, r, b.mix.map(function (q) { return q[0]; })); return; }
    var n = E.dens * dt * (6 + r * 0.6) * (b.dens || 1), total = 0;
    b.mix.forEach(function (q) { total += q[1]; });
    for (E.acc += n; E.acc >= 1; E.acc--) {
      var ang = Math.random() * 6.283, rr = Math.sqrt(Math.random()) * r, x = I.mx + Math.cos(ang) * rr, y = I.my + Math.sin(ang) * rr * 0.8;
      var pick = Math.random() * total, type = b.mix[0][0];
      for (var i = 0, s = 0; i < b.mix.length; i++) { s += b.mix[i][1]; if (pick <= s) { type = b.mix[i][0]; break; } }
      if (!vegOk(type, x, y)) continue;
      var close = a.veg.some(function (v) { return v.t === type && Math.abs(v.x - x) < 3 && Math.abs(v.y - y) < 3; });
      if (close) continue;
      a.veg.push({ t: type, x: Math.round(x), y: Math.round(y), v: (Math.random() * SZ.VEG[type].variants) | 0 });
    }
  }
  function removeVeg(x, y, r, types) {
    E.arena.veg = E.arena.veg.filter(function (v) { return (types && types.indexOf(v.t) < 0) || m.dist(x, y, v.x, v.y) > r; });
  }
  function nearestObj(x, y, max) {
    var best = null, bd = max || 14;
    E.arena.obj.forEach(function (o) { var d = m.dist(x, y, o.x, o.y - 4); if (d < bd) { bd = d; best = o; } });
    return best;
  }
  function snap(v) { return SZ.input.down("Shift") ? Math.round(v / 8) * 8 : Math.round(v); }

  SZ.scenes.editor = {
    enter: function () {
      if (!E) E = { tool: "brush", tile: "m", brush: "meadow", obj: "toro", ov: 0, bsize: 14, tsize: 1, dens: 5, wind: 1, grid: false, timeRun: false, timeSpeedV: 0.5, undo: [], acc: 0, drag: null, stroke: false };
      SZ.main.setSidebar(PANEL);
      SZ.audio.ambience(null);
      if (!E.arena || !E.keep) loadArena(SZ.arena.active());
      E.keep = false;
      build();
    },
    // Vom Testen zurück: Arena bleibt erhalten
    resume: function () { E.keep = true; },
    exit: function () { SZ.main.setSidebar(0); },
    update: function (dt) {
      var I = SZ.input, a = E.arena, w = E.world;
      if ((I.down("Control") || I.down("Meta")) && I.hit("z")) undo();
      if (I.hit("g")) E.grid = !E.grid;
      if (I.hit("r") && E.tool === "obj") { E.ov = (Math.random() * SZ.OBJECTS[E.obj].variants) | 0; renderOpts(); }
      if (I.wheel) {
        if (E.tool === "obj") { var n = SZ.OBJECTS[E.obj].variants; E.ov = ((E.ov + I.wheel) % n + n) % n; renderOpts(); }
        else if (E.tool === "brush" || E.tool === "erase") { E.bsize = m.clamp(E.bsize - I.wheel * 2, 3, 48); renderOpts(); }
        else if (E.tool === "tile") { E.tsize = m.clamp(E.tsize - I.wheel, 1, 5); renderOpts(); }
      }
      var active = I.inside && (I.lmb || I.rmb);
      if (active && !E.stroke && E.tool !== "move") { snapshot(); E.stroke = true; }
      if (!I.lmb && !I.rmb && E.stroke) { E.stroke = false; w.lastBuild = -9; w.refreshSolids(); }
      if (I.inside) {
        if (E.tool === "tile" && (I.lmb || I.rmb)) {
          var tx0 = Math.floor(I.mx / T) - ((E.tsize - 1) >> 1), ty0 = Math.floor(I.my / T) - ((E.tsize - 1) >> 1);
          for (var yy = 0; yy < E.tsize; yy++) for (var xx = 0; xx < E.tsize; xx++) a.setTile(tx0 + xx, ty0 + yy, I.lmb ? E.tile : "s");
        } else if (E.tool === "brush" && (I.lmb || I.rmb)) paintBrush(dt, I.rmb);
        else if (E.tool === "erase" && (I.lmb || I.rmb)) {
          removeVeg(I.mx, I.my, E.bsize);
          a.obj = a.obj.filter(function (o) { return m.dist(I.mx, I.my, o.x, o.y) > E.bsize; });
          inCircle(I.mx, I.my, E.bsize * 0.8, function (tx, ty) { a.setLeaf(tx, ty, false); });
          w.refreshSolids();
        } else if (E.tool === "obj") {
          if (I.lmbHit) { a.obj.push({ t: E.obj, x: snap(I.mx), y: snap(I.my), v: E.ov }); w.refreshSolids(); }
          if (I.rmbHit) { var o = nearestObj(I.mx, I.my); if (o) { a.obj.splice(a.obj.indexOf(o), 1); w.refreshSolids(); } }
        } else if (E.tool === "move") {
          if (I.lmbHit) { var hit = nearestObj(I.mx, I.my, 18); if (hit) { snapshot(); E.drag = { o: hit, dx: hit.x - I.mx, dy: hit.y - I.my }; } }
          if (E.drag && I.lmb) { E.drag.o.x = snap(I.mx + E.drag.dx); E.drag.o.y = snap(I.my + E.drag.dy); }
          if (E.drag && !I.lmb) { E.drag = null; w.refreshSolids(); }
        } else if (E.tool === "spawn" && I.lmbHit) { snapshot(); a.spawn = [Math.round(I.mx), Math.round(I.my)]; }
        var tc = a.tilePx(I.mx, I.my);
        E.pos.textContent = Math.round(I.mx) + ", " + Math.round(I.my) + "  ·  " + (SZ.TILES[tc] ? SZ.TILES[tc].name() : "") + "  ·  " + fmtTime(w.time);
      }
      // Bodenänderungen gebündelt neu zeichnen (das Neuzeichnen dauert etwas)
      if (w.ground.rev !== a.rev && (!E.stroke || w.clock - (w.lastBuild || -9) > 0.3)) { w.rebuild(); w.lastBuild = w.clock; }
      w.update(dt);
      if (E.timeRun) { var tEl = E.ui.querySelector("[data-k=time]"); if (tEl) { tEl.value = w.time; E.ui.querySelector("[data-o=time]").textContent = fmtTime(w.time); } a.time = w.time; }
    },
    render: function (ctx) {
      var w = E.world, a = E.arena, I = SZ.input;
      w.render(ctx, {});
      // Hilfslinien (unbeleuchtet)
      if (E.grid) {
        ctx.fillStyle = "rgba(255,255,255,0.12)";
        for (var x = T; x < SZ.W; x += T) ctx.fillRect(x, 0, 1, SZ.H);
        for (var y = T; y < SZ.H; y += T) ctx.fillRect(0, y, SZ.W, 1);
      }
      var showLeaf = E.tool === "brush" && E.brush === "leaffall" || E.tool === "erase";
      if (showLeaf) {
        ctx.fillStyle = "rgba(232,110,50,0.22)";
        for (var i = 0; i < a.leaf.length; i++) if (a.leaf[i] === "1") ctx.fillRect((i % SZ.COLS) * T, ((i / SZ.COLS) | 0) * T, T, T);
      }
      // Startpunkt
      var sp = a.spawn;
      ctx.strokeStyle = "rgba(160,220,255,0.85)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(sp[0] + 0.5, sp[1] + 0.5, 6, 3, 0, 0, 6.283); ctx.stroke();
      ctx.fillStyle = "rgba(160,220,255,0.85)"; ctx.fillRect(sp[0], sp[1] - 9, 1, 7);
      if (!I.inside) return;
      ctx.strokeStyle = "rgba(255,255,255,0.75)";
      if (E.tool === "brush" || E.tool === "erase") { ctx.beginPath(); ctx.ellipse(I.mx, I.my, E.bsize, E.bsize * 0.8, 0, 0, 6.283); ctx.stroke(); }
      else if (E.tool === "tile") {
        var tx0 = Math.floor(I.mx / T) - ((E.tsize - 1) >> 1), ty0 = Math.floor(I.my / T) - ((E.tsize - 1) >> 1);
        ctx.strokeRect(tx0 * T + 0.5, ty0 * T + 0.5, E.tsize * T - 1, E.tsize * T - 1);
      } else if (E.tool === "obj") {
        var s = SZ.sprite("obj", E.obj, E.ov);
        ctx.globalAlpha = 0.65; ctx.drawImage(s.cv, snap(I.mx) - s.def.ax, snap(I.my) - s.def.ay); ctx.globalAlpha = 1;
      } else if (E.tool === "move" || E.tool === "spawn") {
        var o = E.tool === "move" && (E.drag ? E.drag.o : nearestObj(I.mx, I.my, 18));
        if (o) { var d = SZ.OBJECTS[o.t]; ctx.strokeRect(Math.round(o.x - d.ax) - 0.5, Math.round(o.y - d.ay) - 0.5, d.w + 1, d.h + 1); }
        ctx.fillStyle = "#fff"; ctx.fillRect(Math.round(I.mx), Math.round(I.my), 1, 1);
      }
    }
  };
})();
