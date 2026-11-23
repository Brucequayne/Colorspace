/* Monsters Arc – devkit.js  (Dev-Kit)
   Das Dev-Kit bündelt alle Editoren als eigene Bereiche: Map-Editor (v0.1), Attacken, Missionen, Monster (später).
   Der Map-Editor ist Shizukus Dev Tool: Boden kachelgenau, Objekte setzen/verschieben/löschen, organische Pinsel
   (Wiese, Gras, Farn, Blumen, Schilf, Seerosen, Laub, Bodenarten, Laubfall), Radierer, Tageszeit mit Lichtvorschau,
   Wind, Rückgängig, Speichern, Export/Import, Testen. Neu: Map-Größe einstellbar, Kamera mit Verschieben
   (WASD/Pfeiltasten, mittlere Maustaste, Klick in die Übersichtskarte), neue Maps bestehen nur aus Meer.
   Seit v0.11: Welt 800 × 600 Kacheln, Zoom (bis zur ganzen Welt, Knopf zurück zur Spielansicht), Werkzeug „Zonen“
   (Städte/Routen farbig einzeichnen und benennen; im Spiel erscheint beim Betreten der Name). */
(function () {
  var MA = window.MA, L2 = MA.L2, m = MA.m, T = MA.TILE;
  var PANEL = 288;

  MA.EDITOR_CSS =
    ".ma-ed{position:absolute;left:0;top:0;bottom:0;width:" + PANEL + "px;background:#1C1D1C;border-right:1px solid #3A3C3A;overflow-y:auto;overflow-x:hidden;padding:12px 12px 20px;font-size:13px;color:#DCD8CF;scrollbar-width:thin}" +
    ".ma-ed h3{margin:16px 0 7px;font:600 .7rem/1 var(--f-body,system-ui);letter-spacing:.12em;text-transform:uppercase;color:#8E8A82}" +
    ".ma-ed-head{display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid #3A3C3A;padding-bottom:10px}.ma-ed-head b{font-size:1rem}.ma-ed-head span{color:#8E8A82;font-size:.75rem}" +
    ".ma-tabs{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:10px}.ma-tabs button{padding:6px 4px;font-size:.76rem;text-align:left}.ma-tabs button[disabled]{opacity:.45;cursor:default}.ma-tabs small{display:block;font-size:.62rem;color:#8E8A82}" +
    ".ma-tabs button[aria-pressed=true] small{color:#475657}" +
    ".ma-ed button,.ma-ed select,.ma-ed input[type=text],.ma-ed input[type=number]{font:inherit;color:#E4E0D8;background:#262726;border:1px solid #434543;border-radius:0;padding:5px 8px;cursor:pointer}" +
    ".ma-ed input[type=text],.ma-ed input[type=number]{cursor:text;width:100%}" +
    ".ma-ed button:hover:not([disabled]){border-color:#9A968E}.ma-ed button[aria-pressed=true]{background:#C6C5B9;color:#1C1D1C;border-color:#C6C5B9}" +
    ".ma-ed-tools{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}.ma-ed-tools button{padding:6px 2px;font-size:.78rem}" +
    ".ma-ed-list{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}" +
    ".ma-ed-list button{display:flex;flex-direction:column;align-items:center;gap:3px;padding:5px 2px;font-size:.68rem;line-height:1.15;text-align:center;min-height:58px;justify-content:flex-end}" +
    ".ma-ed-list img{image-rendering:pixelated;max-width:56px;max-height:38px}" +
    ".ma-ed-list .sw{width:30px;height:18px;border:1px solid #000}" +
    ".ma-ed-row{display:flex;align-items:center;gap:8px;margin:6px 0}.ma-ed-row label{flex:0 0 64px;color:#ACA89F}.ma-ed-row input[type=range]{min-width:0}.ma-ed-pre{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin:6px 0}.ma-ed-pre button{padding:5px 2px;font-size:.74rem}.ma-ed-row input[type=range]{flex:1;accent-color:#ED6A5E}.ma-ed-row output{flex:0 0 42px;text-align:right;font-variant-numeric:tabular-nums}" +
    ".ma-ed-size{display:grid;grid-template-columns:1fr auto 1fr;gap:6px;align-items:center;margin:6px 0}.ma-ed-size span{color:#8E8A82}" +
    ".ma-ed-btns{display:grid;grid-template-columns:1fr 1fr;gap:4px}.ma-ed-btns .w{grid-column:1/-1}" +
    ".ma-ed-btns .go{background:#ED6A5E;color:#1C1D1C;border-color:#ED6A5E;font-weight:600}.ma-ed-btns .go2{border-color:#62929E;color:#A9D2DA}.ma-ed-btns select{width:100%}" +
    ".ma-ed-mini{display:block;width:100%;image-rendering:pixelated;border:1px solid #434543;cursor:crosshair;background:#163440}" +
    ".ma-ed-info{margin-top:12px;color:#8E8A82;font-size:.74rem;line-height:1.45}" +
    ".ma-ed-status{margin-top:8px;min-height:1.4em;color:#A9D2DA;font-size:.78rem}" +
    ".ma-ed-soon{margin-top:18px;padding:12px;border:1px dashed #434543;color:#ACA89F;font-size:.8rem;line-height:1.5}" +
    ".ma-ed-pos{position:absolute;right:10px;top:8px;font:12px monospace;color:#CFCAC0;background:rgba(0,0,0,.55);padding:3px 7px;pointer-events:none}" +
    ".ma-ed-zoom{display:grid;grid-template-columns:34px 34px 1fr 54px;gap:4px;align-items:center;margin-top:6px}.ma-ed-zoom output{text-align:right;font-variant-numeric:tabular-nums;color:#ACA89F}" +
    ".ma-zl{display:flex;flex-direction:column;gap:4px;margin:6px 0}.ma-zr{display:grid;grid-template-columns:28px 1fr 30px;gap:4px;align-items:center}" +
    ".ma-zr input[type=color]{width:28px;height:28px;padding:0;border:1px solid #434543;background:none;cursor:pointer}.ma-zr input[type=text]{padding:4px 6px}" +
    ".ma-zr.on input[type=text]{border-color:#ED6A5E;background:#2A2221}.ma-zr button{padding:4px 0}" +
    ".ma-zlabel{position:absolute;pointer-events:none;transform:translate(-50%,-50%);font:600 .74rem/1 var(--f-body,system-ui);color:#fff;text-shadow:0 1px 3px #000,0 0 2px #000;white-space:nowrap}";

  // Bereiche des Dev-Kits (weitere Editoren kommen als eigene Bereiche dazu)
  var TABS = [
    { id: "map", name: function () { return L2("Map-Editor", "Map editor"); }, ver: "v0.11" },
    { id: "attacks", name: function () { return L2("Attacken", "Attacks"); }, soon: true },
    { id: "missions", name: function () { return L2("Missionen", "Missions"); }, soon: true },
    { id: "monsters", name: function () { return L2("Monster", "Monsters"); }, soon: true }
  ];

  var TOOLS = ["tile", "brush", "obj", "move", "erase", "spawn", "zones"];
  function toolName(t) {
    return { tile: L2("Boden", "Floor"), brush: L2("Pinsel", "Brush"), obj: L2("Objekte", "Objects"), move: L2("Verschieben", "Move"), erase: L2("Radierer", "Eraser"), spawn: L2("Startpunkt", "Spawn"), zones: L2("Zonen", "Zones") }[t];
  }
  // Farben für neue Zonen (Palette und gut unterscheidbare Töne)
  var ZCOLS = ["#ED6A5E", "#62929E", "#E8C547", "#8BC34A", "#B07CC6", "#4A6D7C", "#F29E4C", "#5CC8B5", "#D96C9C", "#C6C5B9"];
  // Pinselarten (aus Shizuku): veg = Pflanzen streuen, tile = Bodenart rund malen, leaf = Laubfall-Zone
  var BRUSHES = [
    { id: "meadow", kind: "veg", mix: [["grass", 6], ["fern", 1], ["flower", 1]], name: function () { return L2("Wiese", "Meadow"); } },
    { id: "grass", kind: "veg", mix: [["grass", 1]], name: function () { return MA.VEG.grass.name(); } },
    { id: "tallgrass", kind: "veg", mix: [["tallgrass", 1]], name: function () { return MA.VEG.tallgrass.name(); } },
    { id: "tallmeadow", kind: "veg", mix: [["tallgrass", 4], ["wildflower", 2], ["grass", 1]], name: function () { return L2("Hohe Wiese", "Tall meadow"); } },
    { id: "wheat", kind: "veg", mix: [["wheat", 1]], dens: 2.2, name: function () { return L2("Kornfeld", "Grain field"); } },
    { id: "wildflower", kind: "veg", mix: [["wildflower", 1]], name: function () { return MA.VEG.wildflower.name(); } },
    { id: "fern", kind: "veg", mix: [["fern", 1]], name: function () { return MA.VEG.fern.name(); } },
    { id: "lily", kind: "veg", mix: [["lily", 1]], name: function () { return MA.VEG.lily.name(); } },
    { id: "flower", kind: "veg", mix: [["flower", 1]], name: function () { return MA.VEG.flower.name(); } },
    { id: "reed", kind: "veg", mix: [["reed", 1]], name: function () { return MA.VEG.reed.name(); } },
    { id: "lotus", kind: "veg", mix: [["lotus", 1]], name: function () { return MA.VEG.lotus.name(); } },
    { id: "leaves", kind: "veg", mix: [["leaves", 1]], name: function () { return MA.VEG.leaves.name(); } },
    { id: "petals", kind: "veg", mix: [["petals", 1]], name: function () { return MA.VEG.petals.name(); } },
    { id: "leaffall", kind: "leaf", name: function () { return L2("Laubfall", "Leaf fall"); } },
    { id: "o", kind: "tile", name: function () { return MA.TILES.o.name(); } },
    { id: "w", kind: "tile", name: function () { return MA.TILES.w.name(); } },
    { id: "m", kind: "tile", name: function () { return MA.TILES.m.name(); } },
    { id: "e", kind: "tile", name: function () { return MA.TILES.e.name(); } },
    { id: "a", kind: "tile", name: function () { return MA.TILES.a.name(); } },
    { id: "s", kind: "tile", name: function () { return MA.TILES.s.name(); } },
    { id: "p", kind: "tile", name: function () { return MA.TILES.p.name(); } },
    { id: "b", kind: "tile", name: function () { return MA.TILES.b.name(); } },
    { id: "h", kind: "tile", name: function () { return MA.TILES.h.name(); } },
    { id: "g", kind: "tile", name: function () { return MA.TILES.g.name(); } }
  ];
  var TILE_SW = {}; Object.keys(MA.TILES).forEach(function (k) { TILE_SW[k] = MA.TILES[k].sw; });
  var ERASE_TILE = "o";   // Rechtsklick mit Boden-Werkzeug/Bodenpinsel: zurück zu Meer

  var E = null;   // Zustand des Dev-Kits (bleibt beim Testen erhalten)

  function thumb(kind, type, v) {
    var s = MA.sprite(kind, type, v || 0), c = MA.canvas(s.cv.width * 2, s.cv.height * 2);
    c.ctx.drawImage(s.cv, 0, 0, c.width, c.height);
    return c.toDataURL();
  }
  function fmtTime(t) { var h = Math.floor(t), mi = Math.floor((t - h) * 60); return (h < 10 ? "0" : "") + h + ":" + (mi < 10 ? "0" : "") + mi; }
  function download(name, text, type) {
    var b = new Blob([text], { type: type || "application/json" }), a = document.createElement("a");
    a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  function snapshot() { E.undo.push(JSON.stringify(E.arena.serialize())); if (E.undo.length > 30) E.undo.shift(); }
  function loadArena(a, keepCam) {
    var cam = E.world && keepCam ? { x: E.world.cam.x, y: E.world.cam.y, z: E.world.zoom } : null;
    E.arena = a; E.world = new MA.World(a); E.world.throttle = true;
    E.world.time = a.time; E.world.timeSpeed = E.timeRun ? E.timeSpeedV : 0; E.world.wind = E.wind;
    if (cam) { E.world.zoom = Math.max(E.world.minZoom(), cam.z); E.world.cam.x = cam.x; E.world.cam.y = cam.y; E.world.pan(0, 0); } else E.world.follow(a.spawn[0], a.spawn[1]);
    E.labels = null;
    if (E.zsel && !a.zoneInfo(E.zsel)) E.zsel = a.zones.length ? a.zones[0].id : null;
    syncUI(); if (E.tool === "zones") renderOpts();
  }
  function undo() {
    var s = E.undo.pop(); if (!s) { status(L2("Nichts rückgängig zu machen.", "Nothing to undo.")); return; }
    var keep = { time: E.world.time };
    loadArena(new MA.maps.GameMap(JSON.parse(s)), true);
    E.world.time = keep.time;
    status(L2("Rückgängig.", "Undone."));
  }
  function status(t) { var el = E.ui && E.ui.querySelector(".ma-ed-status"); if (el) { el.textContent = t; clearTimeout(E.stT); E.stT = setTimeout(function () { el.textContent = ""; }, 3500); } }

  // Shizuku-Arena (30 × 17, mit Abgrund) in eine Monsters-Arc-Map umwandeln
  function fromShizuku(d) {
    if (d.cols || !d.tiles || d.tiles.length !== 30 * 17) return d;
    d.cols = 30; d.rows = 17; d.tiles = d.tiles.replace(/v/g, "o"); return d;
  }

  // ---------- Oberfläche ----------
  function build() {
    var ui = MA.main.ui;
    ui.innerHTML = '<div class="ma-ed"></div><div class="ma-ed-pos"></div>';
    E.ui = ui.querySelector(".ma-ed"); E.pos = ui.querySelector(".ma-ed-pos");
    var h = '<div class="ma-ed-head"><b>Dev-Kit</b><span>' + MA.NAME + ' v' + MA.VERSION + '</span></div>' +
      '<div class="ma-tabs">' + TABS.map(function (tb) {
        return '<button type="button" data-tab="' + tb.id + '" aria-pressed="' + (E.tab === tb.id) + '"' + (tb.soon ? " disabled" : "") + '>' + tb.name() + '<small>' + (tb.soon ? L2("kommt später", "coming later") : tb.ver) + '</small></button>';
      }).join("") + '</div><div class="ma-ed-body"></div>';
    E.ui.innerHTML = h;
    E.ui.addEventListener("click", onClick);
    E.ui.addEventListener("input", onInput);
    E.ui.addEventListener("change", onChange);
    renderBody();
  }
  function renderBody() {
    var b = E.ui.querySelector(".ma-ed-body");
    if (E.tab !== "map") { b.innerHTML = '<div class="ma-ed-soon">' + L2("Dieser Editor kommt in einer späteren Version.", "This editor comes in a later version.") + '</div>'; return; }
    b.innerHTML =
      '<h3>' + L2("Übersicht", "Overview") + '</h3><canvas class="ma-ed-mini"></canvas>' +
      '<div class="ma-ed-zoom"><button type="button" data-a="zout" title="' + L2("Herauszoomen (−)", "Zoom out (−)") + '">−</button><button type="button" data-a="zin" title="' + L2("Hineinzoomen (+)", "Zoom in (+)") + '">+</button><button type="button" data-a="z1">' + L2("Spielansicht", "Game view") + '</button><output data-o="zoom"></output></div>' +
      '<h3>' + L2("Werkzeug", "Tool") + '</h3><div class="ma-ed-tools">' + TOOLS.map(function (t) { return '<button type="button" data-tool="' + t + '">' + toolName(t) + '</button>'; }).join("") + '</div>' +
      '<div class="ma-ed-opt"></div>' +
      '<h3>' + L2("Licht", "Light") + '</h3>' +
      '<div class="ma-ed-row"><label>' + L2("Uhrzeit", "Time") + '</label><input type="range" min="0" max="24" step="0.05" data-k="time"><output data-o="time"></output></div>' +
      '<div class="ma-ed-row"><label>' + L2("Zeit läuft", "Time runs") + '</label><button type="button" data-a="timerun">▶</button><select data-k="tspeed"><option value="0.1">0,1 h/s</option><option value="0.5">0,5 h/s</option><option value="2">2 h/s</option></select></div>' +
      '<div class="ma-ed-pre"><button type="button" data-time="6.1">' + L2("Aufgang", "Sunrise") + '</button><button type="button" data-time="12">' + L2("Mittag", "Noon") + '</button><button type="button" data-time="18.15">' + L2("Untergang", "Sunset") + '</button><button type="button" data-time="23">' + L2("Nacht", "Night") + '</button></div>' +
      '<div class="ma-ed-row"><label>Wind</label><input type="range" min="0" max="3" step="0.1" data-k="wind"><output data-o="wind"></output></div>' +
      '<h3>Map</h3>' +
      '<div class="ma-ed-row"><label>Name</label><input type="text" data-k="name" maxlength="40"></div>' +
      '<div class="ma-ed-size" title="' + L2("Breite × Höhe in Kacheln", "Width × height in tiles") + '"><input type="number" data-k="cols" min="' + MA.MAP_MIN[0] + '" max="' + MA.MAP_MAX[0] + '"><span>×</span><input type="number" data-k="rows" min="' + MA.MAP_MIN[1] + '" max="' + MA.MAP_MAX[1] + '"></div>' +
      '<div class="ma-ed-btns"><button type="button" class="w" data-a="resize">' + L2("Größe übernehmen (Kacheln, Inhalt bleibt mittig)", "Apply size (tiles, content stays centred)") + '</button></div>' +
      '<div class="ma-ed-row"><label>' + L2("Raster", "Grid") + ' (G)</label><button type="button" data-a="grid">' + L2("an/aus", "on/off") + '</button></div>' +
      '<div class="ma-ed-btns">' +
      '<button type="button" class="w go" data-a="test">' + L2("▶ Testen (Figur laufen lassen)", "▶ Test (walk around)") + '</button>' +
      '<button type="button" data-a="undo">' + L2("Rückgängig", "Undo") + '</button>' +
      '<button type="button" data-a="blank">' + L2("Neue Map (Meer)", "New map (sea)") + '</button>' +
      '<button type="button" class="w" data-a="save">' + L2("Arbeitsstand speichern", "Save work in progress") + '</button>' +
      '<button type="button" class="w go2" data-a="export">' + L2("Map exportieren (.json)", "Export map (.json)") + '</button>' +
      '<button type="button" data-a="import">' + L2("Import", "Import") + '</button>' +
      '<button type="button" data-a="forget">' + L2("Arbeitsstand löschen", "Discard work in progress") + '</button>' +
      '<button type="button" class="w" data-a="menu">' + L2("← Hauptmenü", "← Main menu") + '</button>' +
      '</div><input type="file" accept=".json,.js,application/json" hidden data-k="file">' +
      '<div class="ma-ed-status"></div>' +
      '<div class="ma-ed-info">' + L2(
        "Ansicht verschieben: WASD/Pfeiltasten (Umschalt = schneller), mittlere Maustaste ziehen oder in die Übersicht klicken. Zoomen: Strg + Mausrad, Tasten + und −, „Spielansicht“ setzt auf die Kamera des Spiels zurück. Weit herausgezoomt zeigt die Karte nur die Bodenfarben. Linke Maustaste malt bzw. setzt, rechte löscht (Boden wird wieder Meer). Mausrad: Variante (Objekte) bzw. Pinselgröße. Umschalt: Objekte am 8-px-Raster. Strg+Z: rückgängig.<br>„Arbeitsstand speichern“ gilt nur in diesem Browser. Für das Spiel: „Map exportieren“ und die .json-Datei an Claude schicken. Shizuku-Maps lassen sich importieren (Abgrund wird Meer).",
        "Move the view: WASD/arrow keys (Shift = faster), drag with the middle mouse button or click into the overview. Zoom: Ctrl + mouse wheel, keys + and −, “Game view” resets to the game camera. Zoomed far out the map only shows floor colours. Left mouse paints or places, right deletes (floor turns back into sea). Mouse wheel: variant (objects) or brush size. Shift: snap objects to 8 px. Ctrl+Z: undo.<br>“Save work in progress” only applies in this browser. For the game: “Export map” and send the .json file to Claude. Shizuku maps can be imported (abyss becomes sea).") + '</div>';
    b.querySelector("[data-k=file]").addEventListener("change", onFile);
    E.mini = b.querySelector(".ma-ed-mini");
    E.mini.addEventListener("pointerdown", miniDown); E.mini.addEventListener("pointermove", function (e) { if (e.buttons & 1) miniDown(e); });
    renderOpts(); syncUI();
  }

  function renderOpts() {
    var o = E.ui.querySelector(".ma-ed-opt"); if (!o) return;
    var h = "";
    if (E.tool === "tile") {
      h = '<h3>' + L2("Bodenart", "Floor type") + '</h3><div class="ma-ed-list">' + Object.keys(MA.TILES).map(function (k) {
        return '<button type="button" data-tile="' + k + '" aria-pressed="' + (E.tile === k) + '"><span class="sw" style="background:' + TILE_SW[k] + '"></span>' + MA.TILES[k].name() + '</button>';
      }).join("") + '</div>' + sizeRow("tsize", 1, 9, 1);
    } else if (E.tool === "brush") {
      h = '<h3>' + L2("Pinsel", "Brush") + '</h3><div class="ma-ed-list">' + BRUSHES.map(function (b) {
        var pic = b.kind === "veg" ? '<img alt="" src="' + thumb("veg", b.mix[0][0], 0) + '">' : b.kind === "tile" ? '<span class="sw" style="background:' + TILE_SW[b.id] + '"></span>' : '<span class="sw" style="background:#C0502A"></span>';
        return '<button type="button" data-brush="' + b.id + '" aria-pressed="' + (E.brush === b.id) + '">' + pic + b.name() + '</button>';
      }).join("") + '</div>' + sizeRow("bsize", 3, 64, 1) + '<div class="ma-ed-row"><label>' + L2("Dichte", "Density") + '</label><input type="range" min="1" max="10" step="1" data-k="dens" value="' + E.dens + '"><output data-o="dens">' + E.dens + '</output></div>';
    } else if (E.tool === "obj") {
      h = '<h3>' + L2("Objekt", "Object") + '</h3><div class="ma-ed-list">' + Object.keys(MA.OBJECTS).map(function (k) {
        return '<button type="button" data-obj="' + k + '" aria-pressed="' + (E.obj === k) + '"><img alt="" src="' + thumb("obj", k, 0) + '">' + MA.OBJECTS[k].name() + '</button>';
      }).join("") + '</div><div class="ma-ed-row"><label>Variante</label><button type="button" data-a="var">' + (E.ov + 1) + ' / ' + MA.OBJECTS[E.obj].variants + '</button></div>';
    } else if (E.tool === "erase") {
      h = '<h3>' + L2("Radierer", "Eraser") + '</h3>' + sizeRow("bsize", 3, 64, 1) + '<div class="ma-ed-info">' + L2("Entfernt Pflanzen, Objekte und Laubfall im Kreis.", "Removes plants, objects and leaf fall in the circle.") + '</div>';
    } else if (E.tool === "move") {
      h = '<div class="ma-ed-info">' + L2("Objekt mit gedrückter linker Maustaste ziehen.", "Drag an object with the left mouse button.") + '</div>';
    } else if (E.tool === "spawn") {
      h = '<div class="ma-ed-info">' + L2("Klick setzt den Startpunkt der Spielfigur (auch für „Testen“).", "Click sets the player's start point (also for “Test”).") + '</div>';
    } else if (E.tool === "zones") {
      var A = E.arena;
      h = '<h3>' + L2("Zonen (Städte, Routen)", "Zones (towns, routes)") + '</h3><div class="ma-zl">' + A.zones.map(function (z) {
        return '<div class="ma-zr' + (E.zsel === z.id ? " on" : "") + '" data-zone="' + z.id + '"><input type="color" value="' + z.col + '" data-zc="' + z.id + '"><input type="text" value="' + z.name.replace(/"/g, "&quot;") + '" data-zn="' + z.id + '" placeholder="' + L2("Name", "Name") + '"><button type="button" data-zdel="' + z.id + '" title="' + L2("Zone löschen", "Delete zone") + '">×</button></div>';
      }).join("") + '</div><div class="ma-ed-btns"><button type="button" class="w" data-a="znew">' + L2("+ Neue Zone", "+ New zone") + '</button></div>' +
        sizeRow("zsize", 1, 64, 1) +
        '<div class="ma-ed-info">' + L2("Zone anklicken, dann mit der linken Maustaste Kacheln einfärben, rechte Maustaste entfernt die Zone. Im Spiel erscheint der Name kurz, sobald man die Zone betritt. Die Farben sieht man nur hier im Dev-Kit.", "Click a zone, then colour tiles with the left mouse button; the right button removes the zone. In the game the name pops up briefly when you enter the zone. The colours are only visible here in the dev kit.") + '</div>';
    }
    o.innerHTML = h;
  }
  function sizeRow(k, a, b, st) {
    return '<div class="ma-ed-row"><label>' + L2("Größe", "Size") + '</label><input type="range" min="' + a + '" max="' + b + '" step="' + st + '" data-k="' + k + '" value="' + E[k] + '"><output data-o="' + k + '">' + E[k] + '</output></div>';
  }
  function syncUI() {
    if (!E.ui || !E.ui.querySelector) return;
    Array.prototype.forEach.call(E.ui.querySelectorAll("[data-tool]"), function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-tool") === E.tool)); });
    var q = function (s) { return E.ui.querySelector(s); };
    if (q("[data-k=time]")) { q("[data-k=time]").value = E.world.time; q("[data-o=time]").textContent = fmtTime(E.world.time); }
    if (q("[data-k=wind]")) { q("[data-k=wind]").value = E.wind; q("[data-o=wind]").textContent = E.wind.toFixed(1); }
    if (q("[data-k=name]")) q("[data-k=name]").value = E.arena.name;
    if (q("[data-k=cols]")) { q("[data-k=cols]").value = E.arena.cols; q("[data-k=rows]").value = E.arena.rows; }
    if (q("[data-a=timerun]")) q("[data-a=timerun]").setAttribute("aria-pressed", String(E.timeRun));
    if (q("[data-k=tspeed]")) q("[data-k=tspeed]").value = String(E.timeSpeedV);
    if (q("[data-o=zoom]")) q("[data-o=zoom]").textContent = Math.round(E.world.zoom * 100) + " %";
  }

  // ---------- Übersichtskarte (nutzt das Übersichtsbild der Welt) ----------
  function drawMini() {
    var c = E.mini; if (!c) return;
    var a = E.arena, w = E.world, mw = 528, mh = Math.max(40, Math.round(mw * a.rows / a.cols));
    if (c.width !== mw || c.height !== mh) { c.width = mw; c.height = mh; }
    var ctx = c.getContext("2d"), k = mw / a.cols;
    ctx.imageSmoothingEnabled = true; ctx.drawImage(w.ov, 0, 0, mw, mh);
    if (E.tool === "zones") { ctx.globalAlpha = 0.6; ctx.imageSmoothingEnabled = false; ctx.drawImage(w.zc, 0, 0, mw, mh); ctx.globalAlpha = 1; }
    ctx.fillStyle = "#ED6A5E"; ctx.fillRect(a.spawn[0] / T * k - 2, a.spawn[1] / T * k - 2, 4, 4);
    ctx.strokeStyle = "#FFFFFF"; ctx.lineWidth = 2;
    ctx.strokeRect(w.cam.x / T * k, w.cam.y / T * k, Math.max(3, w.viewW() / T * k), Math.max(3, w.viewH() / T * k));
  }
  function miniDown(e) {
    var r = E.mini.getBoundingClientRect(), a = E.arena, w = E.world;
    var tx = (e.clientX - r.left) / r.width * a.cols, ty = (e.clientY - r.top) / r.height * a.rows;
    w.cam.x = tx * T - w.viewW() / 2; w.cam.y = ty * T - w.viewH() / 2; w.pan(0, 0);
  }
  function zoomBy(f, sx, sy) {
    var w = E.world, z = m.clamp(w.zoom * f, w.minZoom(), 1);
    if (Math.abs(z - 1) < 0.02) z = 1;
    w.setZoom(z, sx, sy); syncUI();
  }
  // Zonen-Namen in der Mitte ihrer Fläche (für die Anzeige im Dev-Kit)
  function zoneLabels() {
    var a = E.arena;
    if (E.labels && E.labelsRev === a.zoneRev) return E.labels;
    var acc = {};
    for (var i = 0; i < a.zone.length; i++) { var id = a.zone[i]; if (id === "0") continue; var q = acc[id] || (acc[id] = [0, 0, 0]); q[0] += i % a.cols; q[1] += (i / a.cols) | 0; q[2]++; }
    E.labels = a.zones.filter(function (z) { return acc[z.id]; }).map(function (z) { var q = acc[z.id]; return { name: z.name || "?", x: (q[0] / q[2] + 0.5) * T, y: (q[1] / q[2] + 0.5) * T }; });
    E.labelsRev = a.zoneRev;
    return E.labels;
  }

  function onClick(e) {
    var zr = e.target.closest("[data-zone]");
    if (zr && !e.target.closest("button")) { if (E.zsel !== zr.dataset.zone) { E.zsel = zr.dataset.zone; Array.prototype.forEach.call(E.ui.querySelectorAll(".ma-zr"), function (el) { el.classList.toggle("on", el.dataset.zone === E.zsel); }); } return; }
    var b = e.target.closest("button"); if (!b) return;
    var d = b.dataset;
    if (d.tab) { if (!b.disabled) { E.tab = d.tab; build(); } return; }
    if (d.tool) { E.tool = d.tool; renderOpts(); syncUI(); return; }
    if (d.tile) { E.tile = d.tile; renderOpts(); return; }
    if (d.brush) { E.brush = d.brush; renderOpts(); return; }
    if (d.obj) { E.obj = d.obj; E.ov = 0; renderOpts(); return; }
    if (d.time) { E.world.time = +d.time; E.arena.time = E.world.time; syncUI(); return; }
    if (d.zdel) { snapshot(); E.arena.removeZone(d.zdel); E.world.syncZones(true); if (E.zsel === d.zdel) E.zsel = E.arena.zones.length ? E.arena.zones[0].id : null; renderOpts(); return; }
    var a = d.a;
    if (a === "zin") zoomBy(1.4);
    else if (a === "zout") zoomBy(1 / 1.4);
    else if (a === "z1") { E.world.setZoom(1); syncUI(); }
    else if (a === "znew") {
      snapshot();
      var z = E.arena.addZone(L2("Zone ", "Zone ") + (E.arena.zones.length + 1), ZCOLS[E.arena.zones.length % ZCOLS.length]);
      if (z) { E.zsel = z.id; renderOpts(); var inp = E.ui.querySelector('[data-zn="' + z.id + '"]'); if (inp) { inp.focus(); inp.select(); } }
      else status(L2("Höchstens " + MA.ZONE_IDS.length + " Zonen.", "At most " + MA.ZONE_IDS.length + " zones."));
    }
    else if (a === "var") { E.ov = (E.ov + 1) % MA.OBJECTS[E.obj].variants; renderOpts(); }
    else if (a === "timerun") { E.timeRun = !E.timeRun; E.world.timeSpeed = E.timeRun ? E.timeSpeedV : 0; syncUI(); }
    else if (a === "grid") E.grid = !E.grid;
    else if (a === "undo") undo();
    else if (a === "resize") {
      var c = +E.ui.querySelector("[data-k=cols]").value, r = +E.ui.querySelector("[data-k=rows]").value;
      snapshot();
      if (E.arena.resize(c, r)) { loadArena(E.arena, true); status(L2("Neue Größe: ", "New size: ") + E.arena.cols + " × " + E.arena.rows); } else { E.undo.pop(); syncUI(); }
    }
    else if (a === "save") {
      E.arena.time = E.world.time; status(L2("Speichere …", "Saving …"));
      MA.maps.saveLocal(E.arena, function (ok, len) { status(ok ? L2("Arbeitsstand gespeichert (" + Math.round(len / 1024) + " KB). Er öffnet sich beim nächsten Mal im Dev-Kit.", "Work in progress saved (" + Math.round(len / 1024) + " KB). It opens in the dev kit next time.") : L2("Speichern nicht möglich – bitte exportieren.", "Could not save – please export.")); });
    }
    else if (a === "blank") {
      snapshot(); var t = E.world.time, nm = MA.maps.blank(+E.ui.querySelector("[data-k=cols]").value || E.arena.cols, +E.ui.querySelector("[data-k=rows]").value || E.arena.rows);
      nm.time = t; loadArena(nm); E.world.time = t; syncUI();
    }
    else if (a === "forget") { MA.maps.clearLocal(); status(L2("Arbeitsstand gelöscht. Beim nächsten Öffnen startet das Dev-Kit mit der Start-Map.", "Work in progress discarded. Next time the dev kit opens with the start map.")); }
    else if (a === "export") { E.arena.time = E.world.time; download("monstersarc-map-" + (E.arena.name || "map").replace(/[^a-z0-9]+/gi, "-").toLowerCase() + ".json", JSON.stringify(E.arena.serialize())); }
    else if (a === "import") E.ui.querySelector("[data-k=file]").click();
    else if (a === "test") { E.arena.time = E.world.time; MA.main.go("walk", { map: E.arena.serialize(), back: "devkit", time: E.world.time, wind: E.wind }); }
    else if (a === "menu") MA.main.go("menu");
  }
  function onInput(e) {
    var zn = e.target.dataset.zn, zc = e.target.dataset.zc;
    if (zn) { var zi = E.arena.zoneInfo(zn); if (zi) { zi.name = e.target.value; E.labels = null; } return; }
    if (zc) { var zj = E.arena.zoneInfo(zc); if (zj) { zj.col = e.target.value; E.world.syncZones(true); } return; }
    var k = e.target.dataset.k; if (!k) return;
    var v = e.target.value;
    if (k === "time") { E.world.time = +v; E.arena.time = +v; }
    else if (k === "wind") { E.wind = +v; E.world.wind = E.wind; }
    else if (k === "tspeed") { E.timeSpeedV = +v; if (E.timeRun) E.world.timeSpeed = E.timeSpeedV; }
    else if (k === "name") E.arena.name = v;
    else if (k === "bsize" || k === "tsize" || k === "dens" || k === "zsize") E[k] = +v;
    var o = E.ui.querySelector('[data-o="' + k + '"]');
    if (o) o.textContent = k === "time" ? fmtTime(+v) : k === "wind" ? (+v).toFixed(1) : v;
  }
  function onChange(e) { if (e.target.dataset.k === "tspeed") onInput(e); }
  function onFile(e) {
    var f = e.target.files[0]; if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      try {
        var txt = String(r.result), i = txt.indexOf("{"), j = txt.lastIndexOf("}");
        var data = fromShizuku(JSON.parse(txt.slice(i, j + 1)));
        snapshot(); loadArena(new MA.maps.GameMap(data));
        status(L2("Importiert: ", "Imported: ") + E.arena.name + " (" + E.arena.cols + " × " + E.arena.rows + ")");
      } catch (er) { status(L2("Datei konnte nicht gelesen werden.", "Could not read the file.")); }
      e.target.value = "";
    };
    r.readAsText(f);
  }

  // ---------- Malen auf der Map (Weltkoordinaten wx/wy) ----------
  function inCircle(cx, cy, r, fn) {
    var x0 = Math.floor((cx - r) / T), x1 = Math.floor((cx + r) / T), y0 = Math.floor((cy - r) / T), y1 = Math.floor((cy + r) / T);
    for (var ty = y0; ty <= y1; ty++) for (var tx = x0; tx <= x1; tx++) {
      if (m.dist(cx, cy, (tx + 0.5) * T, (ty + 0.5) * T) <= r + T * 0.35) fn(tx, ty);
    }
  }
  function vegOk(type, x, y) {
    var c = E.arena.tilePx(x, y), d = MA.VEG[type];
    if (c === "#" || c === "o") return false;
    if (x < 0 || y < 0 || x >= E.arena.pxW() || y >= E.arena.pxH()) return false;
    return d.water ? c === "w" : c !== "w";
  }
  function paintBrush(dt, erase) {
    var b = BRUSHES.filter(function (q) { return q.id === E.brush; })[0], r = E.bsize, a = E.arena, X = E.wx, Y = E.wy;
    if (b.kind === "tile") { inCircle(X, Y, r * 0.8, function (tx, ty) { a.setTile(tx, ty, erase ? ERASE_TILE : b.id); }); return; }
    if (b.kind === "leaf") { inCircle(X, Y, r * 0.8, function (tx, ty) { a.setLeaf(tx, ty, !erase); }); return; }
    if (erase) { removeVeg(X, Y, r, b.mix.map(function (q) { return q[0]; })); return; }
    var n = E.dens * dt * (6 + r * 0.6) * (b.dens || 1), total = 0;
    b.mix.forEach(function (q) { total += q[1]; });
    for (E.acc += n; E.acc >= 1; E.acc--) {
      var ang = Math.random() * 6.283, rr = Math.sqrt(Math.random()) * r, x = X + Math.cos(ang) * rr, y = Y + Math.sin(ang) * rr * 0.8;
      var pick = Math.random() * total, type = b.mix[0][0];
      for (var i = 0, s = 0; i < b.mix.length; i++) { s += b.mix[i][1]; if (pick <= s) { type = b.mix[i][0]; break; } }
      if (!vegOk(type, x, y)) continue;
      var close = a.veg.some(function (v) { return v.t === type && Math.abs(v.x - x) < 3 && Math.abs(v.y - y) < 3; });
      if (close) continue;
      a.veg.push({ t: type, x: Math.round(x), y: Math.round(y), v: (Math.random() * MA.VEG[type].variants) | 0 });
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
  function snap(v) { return MA.input.down("Shift") ? Math.round(v / 8) * 8 : Math.round(v); }

  MA.scenes.devkit = {
    enter: function () {
      if (!E) E = { tab: "map", tool: "brush", tile: "m", brush: "meadow", obj: "toro", ov: 0, bsize: 14, tsize: 1, zsize: 6, dens: 5, wind: 1, grid: false, timeRun: false, timeSpeedV: 0.5, undo: [], acc: 0, drag: null, stroke: false, wx: 0, wy: 0, zsel: null };
      MA.main.setSidebar(PANEL);
      MA.audio.ambience(null);
      MA.audio.musicStop();
      MA.main.ui.innerHTML = '<div class="ma-hint">' + L2("Lade Map …", "Loading map …") + '</div>';
      if (E.arena && E.keep) { E.keep = false; build(); return; }
      E.ready = false;
      MA.maps.loadWorking(function (map) { loadArena(map); if (!E.zsel && map.zones.length) E.zsel = map.zones[0].id; E.ready = true; build(); });
    },
    // Vom Testen zurück: Map bleibt erhalten
    resume: function () { E.keep = true; },
    exit: function () { MA.main.setSidebar(0); },
    update: function (dt) {
      if (!E.world || !E.ui || !E.ui.querySelector) return;
      var I = MA.input, a = E.arena, w = E.world, z = w.zoom, ctrl = I.down("Control") || I.down("Meta");
      if (ctrl && I.hit("z")) undo();
      if (I.hit("g")) E.grid = !E.grid;
      if (I.hit("+") || I.hit("=")) zoomBy(1.4);
      if (I.hit("-")) zoomBy(1 / 1.4);
      // Ansicht verschieben (Tempo in Bildpixeln, unabhängig vom Zoom)
      var sp = (I.down("Shift") ? 720 : 260) * dt / z, px = 0, py = 0;
      if (!ctrl) {
        if (I.down("a") || I.down("ArrowLeft")) px -= sp;
        if (I.down("d") || I.down("ArrowRight")) px += sp;
        if (I.down("w") || I.down("ArrowUp")) py -= sp;
        if (I.down("s") || I.down("ArrowDown")) py += sp;
      }
      if (I.mmb && E.lastM) { px -= (I.mx - E.lastM[0]) / z; py -= (I.my - E.lastM[1]) / z; }
      E.lastM = I.mmb ? [I.mx, I.my] : null;
      if (px || py) w.pan(px, py);
      E.wx = w.cam.x + I.mx / z; E.wy = w.cam.y + I.my / z;
      if (I.hit("r") && E.tool === "obj") { E.ov = (Math.random() * MA.OBJECTS[E.obj].variants) | 0; renderOpts(); }
      if (I.wheel) {
        if (ctrl) zoomBy(I.wheel < 0 ? 1.25 : 0.8, I.mx, I.my);
        else if (E.tool === "obj") { var n = MA.OBJECTS[E.obj].variants; E.ov = ((E.ov + I.wheel) % n + n) % n; renderOpts(); }
        else if (E.tool === "brush" || E.tool === "erase") { E.bsize = m.clamp(E.bsize - I.wheel * 2, 3, 64); renderOpts(); }
        else if (E.tool === "tile") { E.tsize = m.clamp(E.tsize - I.wheel, 1, 9); renderOpts(); }
        else if (E.tool === "zones") { E.zsize = m.clamp(E.zsize - I.wheel, 1, 64); renderOpts(); }
      }
      var active = I.inside && (I.lmb || I.rmb) && E.tab === "map";
      if (active && !E.stroke && E.tool !== "move") { snapshot(); E.stroke = true; }
      if (!I.lmb && !I.rmb && E.stroke) { E.stroke = false; w.lastBuild = -9; w.refreshSolids(); }
      if (I.inside && E.tab === "map") {
        var X = E.wx, Y = E.wy;
        if (E.tool === "tile" && (I.lmb || I.rmb)) {
          var tx0 = Math.floor(X / T) - ((E.tsize - 1) >> 1), ty0 = Math.floor(Y / T) - ((E.tsize - 1) >> 1);
          for (var yy = 0; yy < E.tsize; yy++) for (var xx = 0; xx < E.tsize; xx++) a.setTile(tx0 + xx, ty0 + yy, I.lmb ? E.tile : ERASE_TILE);
        } else if (E.tool === "zones" && (I.lmb || I.rmb)) {
          if (I.rmb || E.zsel) {
            var zx0 = Math.floor(X / T) - ((E.zsize - 1) >> 1), zy0 = Math.floor(Y / T) - ((E.zsize - 1) >> 1);
            for (var zy = 0; zy < E.zsize; zy++) for (var zx = 0; zx < E.zsize; zx++) a.setZone(zx0 + zx, zy0 + zy, I.lmb ? E.zsel : "0");
          } else if (I.lmbHit) status(L2("Erst eine Zone anlegen oder auswählen.", "Create or select a zone first."));
        } else if (E.tool === "brush" && (I.lmb || I.rmb)) paintBrush(dt, I.rmb);
        else if (E.tool === "erase" && (I.lmb || I.rmb)) {
          removeVeg(X, Y, E.bsize);
          a.obj = a.obj.filter(function (o) { return m.dist(X, Y, o.x, o.y) > E.bsize; });
          inCircle(X, Y, E.bsize * 0.8, function (tx, ty) { a.setLeaf(tx, ty, false); });
          w.refreshSolids();
        } else if (E.tool === "obj") {
          if (I.lmbHit) { a.obj.push({ t: E.obj, x: snap(X), y: snap(Y), v: E.ov }); w.refreshSolids(); }
          if (I.rmbHit) { var o = nearestObj(X, Y); if (o) { a.obj.splice(a.obj.indexOf(o), 1); w.refreshSolids(); } }
        } else if (E.tool === "move") {
          if (I.lmbHit) { var hit = nearestObj(X, Y, 18); if (hit) { snapshot(); E.drag = { o: hit, dx: hit.x - X, dy: hit.y - Y }; } }
          if (E.drag && I.lmb) { E.drag.o.x = snap(X + E.drag.dx); E.drag.o.y = snap(Y + E.drag.dy); }
          if (E.drag && !I.lmb) { E.drag = null; w.refreshSolids(); }
        } else if (E.tool === "spawn" && I.lmbHit) { snapshot(); a.spawn = [Math.round(X), Math.round(Y)]; }
        var tc = a.tilePx(X, Y), zi = a.zoneInfo(a.zonePx(X, Y));
        E.pos.textContent = Math.round(X) + ", " + Math.round(Y) + "  ·  " + Math.floor(X / T) + "/" + Math.floor(Y / T) + "  ·  " + (MA.TILES[tc] ? MA.TILES[tc].name() : "") + (zi ? "  ·  " + (zi.name || "?") : "") + "  ·  " + fmtTime(w.time) + "  ·  " + Math.round(z * 100) + " %";
      }
      // Bodenänderungen gebündelt übernehmen (betroffene Chunks werden neu gebaut)
      if (w.rev !== a.rev && (!E.stroke || w.clock - (w.lastBuild || -9) > 0.12)) { w.rebuild(); w.lastBuild = w.clock; }
      w.update(dt);
      if (E.timeRun) { var tEl = E.ui.querySelector("[data-k=time]"); if (tEl) { tEl.value = w.time; E.ui.querySelector("[data-o=time]").textContent = fmtTime(w.time); } a.time = w.time; }
      drawMini();
    },
    render: function (ctx) {
      if (!E.world) { ctx.fillStyle = "#13282F"; ctx.fillRect(0, 0, MA.W, MA.H); return; }
      var w = E.world, a = E.arena, I = MA.input, z = w.zoom, cx = z >= 1 ? Math.round(w.cam.x) : w.cam.x, cy = z >= 1 ? Math.round(w.cam.y) : w.cam.y;
      w.render(ctx, { zones: E.tool === "zones" ? 0.42 : 0, build: 10 });
      // Hilfslinien (unbeleuchtet), in Weltkoordinaten
      ctx.save(); ctx.scale(z, z); ctx.translate(-cx, -cy);
      ctx.strokeStyle = "rgba(237,106,94,0.55)"; ctx.lineWidth = 1 / z; ctx.strokeRect(-0.5, -0.5, a.pxW() + 1, a.pxH() + 1);   // Map-Rand
      var vw = w.viewW(), vh = w.viewH();
      if (E.grid && z >= 0.5) {
        ctx.fillStyle = "rgba(255,255,255,0.12)";
        for (var x = Math.ceil(cx / T) * T; x < cx + vw; x += T) ctx.fillRect(x, cy, 1 / z, vh);
        for (var y = Math.ceil(cy / T) * T; y < cy + vh; y += T) ctx.fillRect(cx, y, vw, 1 / z);
      }
      var showLeaf = (E.tool === "brush" && E.brush === "leaffall" || E.tool === "erase") && z >= 0.25;
      if (showLeaf) {
        ctx.fillStyle = "rgba(232,110,50,0.22)";
        var tx0 = Math.max(0, Math.floor(cx / T)), ty0 = Math.max(0, Math.floor(cy / T)), tx1 = Math.min(a.cols - 1, Math.floor((cx + vw) / T)), ty1 = Math.min(a.rows - 1, Math.floor((cy + vh) / T));
        for (var ty = ty0; ty <= ty1; ty++) for (var tx = tx0; tx <= tx1; tx++) if (a.leaf[ty * a.cols + tx] === "1") ctx.fillRect(tx * T, ty * T, T, T);
      }
      // Startpunkt
      var sp = a.spawn, ps = Math.max(1, 1 / z);
      ctx.strokeStyle = "rgba(160,220,255,0.85)"; ctx.lineWidth = ps;
      ctx.beginPath(); ctx.ellipse(sp[0] + 0.5, sp[1] + 0.5, 6 * ps, 3 * ps, 0, 0, 6.283); ctx.stroke();
      ctx.fillStyle = "rgba(160,220,255,0.85)"; ctx.fillRect(sp[0], sp[1] - 9 * ps, ps, 7 * ps);
      if (I.inside && E.tab === "map") {
        var X = E.wx, Y = E.wy;
        ctx.strokeStyle = "rgba(255,255,255,0.75)"; ctx.lineWidth = ps;
        if (E.tool === "brush" || E.tool === "erase") { ctx.beginPath(); ctx.ellipse(X, Y, E.bsize, E.bsize * 0.8, 0, 0, 6.283); ctx.stroke(); }
        else if (E.tool === "tile" || E.tool === "zones") {
          var n2 = E.tool === "tile" ? E.tsize : E.zsize, bx = Math.floor(X / T) - ((n2 - 1) >> 1), by = Math.floor(Y / T) - ((n2 - 1) >> 1);
          ctx.strokeRect(bx * T + 0.5, by * T + 0.5, n2 * T - 1, n2 * T - 1);
        } else if (E.tool === "obj") {
          var s = MA.sprite("obj", E.obj, E.ov);
          ctx.globalAlpha = 0.65; ctx.drawImage(s.cv, snap(X) - s.def.ax, snap(Y) - s.def.ay); ctx.globalAlpha = 1;
        } else if (E.tool === "move" || E.tool === "spawn") {
          var o = E.tool === "move" && (E.drag ? E.drag.o : nearestObj(X, Y, 18));
          if (o) { var d = MA.OBJECTS[o.t]; ctx.strokeRect(Math.round(o.x - d.ax) - 0.5, Math.round(o.y - d.ay) - 0.5, d.w + 1, d.h + 1); }
          ctx.fillStyle = "#fff"; ctx.fillRect(Math.round(X), Math.round(Y), ps, ps);
        }
      }
      ctx.restore();
    },
    // Zonen-Namen als Text über dem Bild (scharf, unabhängig von der Pixelgröße)
    renderTop: function (c, v) {
      if (!E.world || E.tool !== "zones") { if (E.lbl) E.lbl.innerHTML = ""; return; }
      var root = MA.main.ui; if (!E.lbl || !E.lbl.isConnected) { E.lbl = document.createElement("div"); E.lbl.style.cssText = "position:absolute;inset:0;pointer-events:none"; root.appendChild(E.lbl); E.lblHtml = ""; }
      var w = E.world, z = w.zoom, out = "";
      zoneLabels().forEach(function (L) {
        var sx = (L.x - w.cam.x) * z, sy = (L.y - w.cam.y) * z; if (sx < 0 || sy < 0 || sx > MA.W || sy > MA.H) return;
        out += '<div class="ma-zlabel" style="left:' + (v.x + sx * v.s).toFixed(0) + 'px;top:' + (v.y + sy * v.s).toFixed(0) + 'px">' + L.name.replace(/</g, "&lt;") + '</div>';
      });
      if (E.lblHtml !== out) { E.lbl.innerHTML = out; E.lblHtml = out; }
    }
  };
})();
