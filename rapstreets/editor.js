/* Rap Streets – editor.js  (Level-Editor, Code-geschützt)
   Brooklyn-Maps bauen: Boden feldgenau (Pinselgröße, Shift = Rechteck), Häuser/Autos/Deko setzen (Mausrad = Variante, R = drehen),
   Crowd-Pinsel (Gruppen von 2D-Leuten), Verschieben, Radierer, Uhrzeit mit Licht, Raster, Jubel-Vorschau, Rückgängig,
   Speichern im Browser, Export/Import als .json, Vorlagen. */
(function () {
  var RS = window.RS, L2 = RS.L2, m = RS.m, G = RS.G, HW = RS.HW, HH = RS.HH;
  var PANEL = 272, WORK = "rapstreets-work-v1", MAPS = "rapstreets-maps-v1";

  RS.EDITOR_CSS =
    ".rs-ed{position:absolute;left:0;top:0;bottom:0;width:" + PANEL + "px;background:#1B1B1C;border-right:1px solid #38383A;overflow-y:auto;overflow-x:hidden;padding:12px 12px 20px;font-size:13px;color:#DEDAD2;scrollbar-width:thin}" +
    ".rs-ed h3{margin:16px 0 7px;font:600 .7rem/1 var(--f-body,system-ui);letter-spacing:.12em;text-transform:uppercase;color:#8E8A84}" +
    ".rs-ed-head{display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid #38383A;padding-bottom:10px}.rs-ed-head b{font-size:1rem;letter-spacing:.06em}.rs-ed-head span{color:#8E8A84;font-size:.75rem}" +
    ".rs-ed button,.rs-ed select,.rs-ed input[type=text]{font:inherit;color:#E6E2DA;background:#262628;border:1px solid #434346;border-radius:0;padding:5px 8px;cursor:pointer}" +
    ".rs-ed input[type=text]{cursor:text;width:100%}" +
    ".rs-ed button:hover{border-color:#9A968E}.rs-ed button[aria-pressed=true]{background:#F2C230;color:#1B1B1C;border-color:#F2C230}" +
    ".rs-ed-tools{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}.rs-ed-tools button{padding:6px 2px;font-size:.78rem}" +
    ".rs-ed-list{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}" +
    ".rs-ed-list button{display:flex;flex-direction:column;align-items:center;gap:3px;padding:5px 2px;font-size:.68rem;line-height:1.15;text-align:center;min-height:60px;justify-content:flex-end}" +
    ".rs-ed-list img{image-rendering:pixelated;max-width:60px;max-height:44px}" +
    ".rs-ed-sub{margin:4px 0 2px;color:#8E8A84;font-size:.68rem;letter-spacing:.08em;text-transform:uppercase}" +
    ".rs-ed-row{display:flex;align-items:center;gap:8px;margin:6px 0}.rs-ed-row label{flex:0 0 70px;color:#ACA89F}.rs-ed-row input[type=range]{flex:1;min-width:0;accent-color:#F2C230}.rs-ed-row output{flex:0 0 42px;text-align:right;font-variant-numeric:tabular-nums}" +
    ".rs-ed-pre{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin:6px 0}.rs-ed-pre button{padding:5px 2px;font-size:.74rem}" +
    ".rs-ed-btns{display:grid;grid-template-columns:1fr 1fr;gap:4px}.rs-ed-btns .w{grid-column:1/-1}.rs-ed-btns select{width:100%}" +
    ".rs-ed-btns .go{background:#F2C230;color:#1B1B1C;border-color:#F2C230;font-weight:600}" +
    ".rs-ed-info{margin-top:12px;color:#8E8A84;font-size:.74rem;line-height:1.45}" +
    ".rs-ed-status{margin-top:8px;min-height:1.4em;color:#B9F0CF;font-size:.78rem}" +
    ".rs-ed-mx label{flex:0 0 92px}.rs-ed-mx output{flex:0 0 58px}.rs-ed-chk{display:flex;align-items:center;gap:8px;margin:6px 0;color:#ACA89F;cursor:pointer}.rs-ed-chk input{accent-color:#F2C230;margin:0}" +
    ".rs-ed-meter{margin-top:6px;color:#ACA89F;font-size:.74rem;line-height:1.45;font-variant-numeric:tabular-nums;min-height:1.4em}.rs-ed-meter b{color:#E6E2DA;font-weight:600}.rs-ed-meter .hot{color:#FF6A5A}" +
    ".rs-ed-pos{position:absolute;right:10px;top:8px;font:12px monospace;color:#D2CDC4;background:rgba(0,0,0,.6);padding:3px 7px;pointer-events:none}";

  var TOOLS = ["tile", "obj", "crowd", "move", "erase", "stage"];
  function toolName(t) { return { tile: L2("Boden", "Ground"), obj: L2("Objekte", "Objects"), crowd: L2("Crowd", "Crowd"), move: L2("Verschieben", "Move"), erase: L2("Radierer", "Eraser"), stage: L2("Bühne", "Stage") }[t]; }
  var GROUPS = [["house", function () { return L2("Häuser", "Buildings"); }], ["car", function () { return L2("Autos", "Cars"); }], ["deco", function () { return L2("Straße & Deko", "Street & props"); }]];
  var TILE_ORDER = ["a", "r", "x", "y", "c", "e", "l", "k", "w", "s", "b", "d", "g"];

  // Audio (Dev Tool): Regler für mix.js – [Schlüssel, Name, min, max, Schritt, Einheit]
  var MX = [
    ["thr", function () { return L2("Threshold", "Threshold"); }, -50, 0, 1, " dB"],
    ["ratio", function () { return "Ratio"; }, 1, 20, 0.5, ":1"],
    ["att", function () { return "Attack"; }, 0.5, 50, 0.5, " ms"],
    ["rel", function () { return "Release"; }, 20, 600, 10, " ms"],
    ["micGain", function () { return L2("Mikro-Pegel", "Mic level"); }, -12, 30, 0.5, " dB"],
    ["micCeil", function () { return L2("Mikro-Limiter", "Mic limiter"); }, -24, 0, 0.5, " dB"],
    ["beatGain", function () { return L2("Beat-Pegel", "Beat level"); }, -24, 6, 0.5, " dB"],
    ["beatCeil", function () { return L2("Beat-Limiter", "Beat limiter"); }, -24, 0, 0.5, " dB"]
  ];
  function mxRow(r) { return '<div class="rs-ed-row rs-ed-mx"><label>' + r[1]() + '</label><input type="range" min="' + r[2] + '" max="' + r[3] + '" step="' + r[4] + '" data-mx="' + r[0] + '"><output data-mo="' + r[0] + '"></output></div>'; }
  function num(v) { return String(Math.round(v * 10) / 10).replace(".", ","); }
  function meter(t) { var el = E && E.ui && E.ui.querySelector(".rs-ed-meter"); if (el) el.innerHTML = t; }

  var E = null;
  function status(t) { var el = E && E.ui && E.ui.querySelector(".rs-ed-status"); if (el) { el.textContent = t; clearTimeout(E.stT); E.stT = setTimeout(function () { el.textContent = ""; }, 3500); } }
  function download(name, text) {
    var b = new Blob([text], { type: "application/json" }), a = document.createElement("a");
    a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function fmtTime(t) { var h = Math.floor(t), mi = Math.floor((t - h) * 60); return (h < 10 ? "0" : "") + h + ":" + (mi < 10 ? "0" : "") + mi; }
  function snap(v, s) { return Math.round(v / s) * s; }
  function snapOf(def) { return def.group === "house" ? 1 : def.group === "car" ? 0.5 : 0.1; }

  // ---------- Vorschaubilder ----------
  var THUMB = {};
  function objThumb(t, v) {
    var k = t + ":" + v; if (THUMB[k]) return THUMB[k];
    var s = RS.sprite(t, v, 0), c = s.cv.ctx.getImageData(0, 0, s.cv.width, s.cv.height).data, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (var y = 0; y < s.cv.height; y++) for (var x = 0; x < s.cv.width; x++) if (c[(y * s.cv.width + x) * 4 + 3]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    var w = x1 - x0 + 1, h = y1 - y0 + 1, sc = Math.min(60 / w, 44 / h, 4), cv = RS.canvas(Math.max(1, Math.round(w * sc)), Math.max(1, Math.round(h * sc)));
    cv.ctx.drawImage(s.cv, x0, y0, w, h, 0, 0, cv.width, cv.height);
    return (THUMB[k] = cv.toDataURL());
  }
  function tileThumb(t) {
    var k = "t:" + t; if (THUMB[k]) return THUMB[k];
    var cv = RS.canvas(44, 22), img = cv.ctx.createImageData(44, 22), d = img.data, tl = function () { return t; };
    for (var py = 0; py < 22; py++) for (var px = 0; px < 44; px++) {
      var a = (px - 22 + 0.5) / 11, b = (py + 0.5) / 5.5, X = (a + b) / 2, Y = (b - a) / 2;   // 2 × 2 Felder gestaucht
      if (X < 0 || Y < 0 || X >= 2 || Y >= 2) continue;
      var c = RS.groundAt(t, 5 + X, 5 + Y, tl), i = (py * 44 + px) * 4; d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
    }
    cv.ctx.putImageData(img, 0, 0); return (THUMB[k] = cv.toDataURL());
  }

  // ---------- Map laden / Rückgängig ----------
  function setMap(data, keepTime) {
    var t = E.world ? E.world.time : null;
    E.world = new RS.World(data); E.world.cheer = E.cheer;
    if (keepTime && t != null) E.world.time = t;
    E.sel = null; syncUI();
  }
  function snapshot() { E.undo.push(JSON.stringify(E.world.serialize())); if (E.undo.length > 60) E.undo.shift(); E.changed = true; }
  function undo() {
    var s = E.undo.pop(); if (!s) { status(L2("Nichts rückgängig zu machen.", "Nothing to undo.")); return; }
    setMap(JSON.parse(s), true); status(L2("Rückgängig.", "Undone."));
  }
  function savedMaps() { try { return JSON.parse(RS.store.get(MAPS) || "{}") || {}; } catch (e) { return {}; } }
  function saveWork() { RS.store.set(WORK, JSON.stringify(E.world.serialize())); }

  // ---------- Oberfläche ----------
  function build() {
    var ui = RS.main.ui;
    ui.innerHTML = '<div class="rs-ed"></div><div class="rs-ed-pos"></div>';
    E.ui = ui.querySelector(".rs-ed"); E.pos = ui.querySelector(".rs-ed-pos");
    var objList = GROUPS.map(function (g) {
      return '<div class="rs-ed-sub">' + g[1]() + '</div><div class="rs-ed-list">' + Object.keys(RS.OBJECTS).filter(function (k) { return RS.OBJECTS[k].group === g[0]; }).map(function (k) {
        return '<button type="button" data-obj="' + k + '"><img alt="" src="' + objThumb(k, 0) + '">' + RS.OBJECTS[k].name() + '</button>';
      }).join("") + '</div>';
    }).join("");
    var h = '<div class="rs-ed-head"><b>Level-Editor</b><span>Rap Streets v' + RS.VERSION + '</span></div>' +
      '<h3>' + L2("Werkzeug", "Tool") + '</h3><div class="rs-ed-tools">' + TOOLS.map(function (t) { return '<button type="button" data-tool="' + t + '">' + toolName(t) + '</button>'; }).join("") + '</div>' +
      '<div data-pane="tile"><h3>' + L2("Boden", "Ground") + '</h3>' +
      '<div class="rs-ed-row"><label>' + L2("Größe", "Size") + '</label><input type="range" min="1" max="7" step="2" data-k="tsize"><output data-o="tsize"></output></div>' +
      '<div class="rs-ed-list">' + TILE_ORDER.map(function (k) { return '<button type="button" data-tile="' + k + '"><img alt="" src="' + tileThumb(k) + '">' + RS.TILES[k].name() + '</button>'; }).join("") + '</div></div>' +
      '<div data-pane="obj"><h3>' + L2("Objekte", "Objects") + '</h3>' +
      '<div class="rs-ed-row"><label>' + L2("Variante", "Variant") + '</label><button type="button" data-a="vprev">‹</button><output data-o="var" style="flex:1;text-align:center"></output><button type="button" data-a="vnext">›</button><button type="button" data-a="rot">' + L2("Drehen", "Rotate") + '</button></div>' +
      objList + '</div>' +
      '<div data-pane="crowd"><h3>Crowd</h3>' +
      '<div class="rs-ed-row"><label>' + L2("Radius", "Radius") + '</label><input type="range" min="0.5" max="4" step="0.25" data-k="crad"><output data-o="crad"></output></div>' +
      '<div class="rs-ed-row"><label>' + L2("Dichte", "Density") + '</label><input type="range" min="0.35" max="0.9" step="0.05" data-k="cgap"><output data-o="cgap"></output></div>' +
      '<div class="rs-ed-row"><label>' + L2("Blick", "Facing") + '</label><select data-k="cface" style="flex:1"><option value="mix">' + L2("gemischt", "mixed") + '</option><option value="0">' + L2("nach rechts", "right") + '</option><option value="1">' + L2("nach links", "left") + '</option></select></div></div>' +
      '<h3>' + L2("Licht", "Light") + '</h3>' +
      '<div class="rs-ed-row"><label>' + L2("Uhrzeit", "Time") + '</label><input type="range" min="0" max="24" step="0.05" data-k="time"><output data-o="time"></output></div>' +
      '<div class="rs-ed-pre"><button type="button" data-time="7">' + L2("Morgen", "Morning") + '</button><button type="button" data-time="13">' + L2("Mittag", "Noon") + '</button><button type="button" data-time="18.4">' + L2("Abend", "Evening") + '</button><button type="button" data-time="22.5">' + L2("Nacht", "Night") + '</button></div>' +
      '<h3>' + L2("Ansicht", "View") + '</h3><div class="rs-ed-btns"><button type="button" data-a="grid">' + L2("Raster (G)", "Grid (G)") + '</button><button type="button" data-a="cheer">' + L2("Jubeln (Leertaste)", "Cheer (Space)") + '</button></div>' +
      '<h3>Audio – ' + L2("Aufnahme", "Recording") + '</h3>' +
      '<div class="rs-ed-sub">' + L2("Mikro: Compressor", "Mic: compressor") + '</div>' +
      '<label class="rs-ed-chk"><input type="checkbox" data-mx="comp">' + L2("Compressor an", "Compressor on") + '</label>' +
      MX.slice(0, 4).map(mxRow).join("") +
      '<div class="rs-ed-sub">' + L2("Mikro: Pegel und Limiter", "Mic: level and limiter") + '</div>' + MX.slice(4, 6).map(mxRow).join("") +
      '<div class="rs-ed-sub">' + L2("Instrumental", "Instrumental") + '</div>' + MX.slice(6, 8).map(mxRow).join("") +
      '<div class="rs-ed-sub">' + L2("Mikro testen", "Test mic") + '</div>' +
      '<div class="rs-ed-btns"><select class="w" data-k="mbeat">' + RS.BEATS.map(function (b, i) { return '<option value="' + i + '">' + b.file.replace(/\.mp3$/i, "").replace(/_/g, " ") + '</option>'; }).join("") + '</select></div>' +
      '<div class="rs-ed-row"><label>' + L2("Ab", "From") + '</label><input type="range" min="0" max="60" step="0.5" data-k="mat"><output data-o="mat"></output></div>' +
      '<div class="rs-ed-btns"><button type="button" class="go w" data-a="mtest">' + L2("Mikro testen (2 s)", "Test mic (2 s)") + '</button>' +
      '<button type="button" data-a="mplay">' + L2("Anhören", "Listen") + '</button><button type="button" data-a="mraw">' + L2("Roh anhören", "Listen raw") + '</button>' +
      '<button type="button" data-a="mcopy">' + L2("Werte kopieren", "Copy values") + '</button><button type="button" data-a="mreset">' + L2("Standardwerte", "Defaults") + '</button></div>' +
      '<div class="rs-ed-meter"></div>' +
      '<div class="rs-ed-info">' + L2(
        "Gilt für die Aufnahme jedes Battles (in diesem Browser). Test: ein Takt Vorlauf, dann 2 Sekunden Beat + Mikro – mit Kopfhörern, sonst nimmt das Mikro den Beat aus den Boxen mit. „Anhören“ rechnet die Aufnahme immer mit den aktuellen Reglern neu, „Roh“ ohne Compressor und Limiter.",
        "Applies to the recording of every battle (in this browser). Test: one bar pre-roll, then 2 seconds of beat + mic – use headphones, otherwise the mic picks up the beat from the speakers. “Listen” always renders the take with the current settings, “raw” without compressor and limiters.") + '</div>' +
      '<h3>Map</h3><div class="rs-ed-btns">' +
      '<input type="text" class="w" data-k="name" maxlength="40" aria-label="Name">' +
      '<button type="button" class="go" data-a="save">' + L2("Speichern", "Save") + '</button><button type="button" data-a="undo">' + L2("Rückgängig", "Undo") + '</button>' +
      '<select class="w" data-k="load"></select>' +
      '<button type="button" data-a="export">Export .json</button><button type="button" data-a="import">Import .json</button>' +
      '<button type="button" data-a="clear">' + L2("Leeren", "Clear") + '</button><button type="button" data-a="menu">' + L2("Menü", "Menu") + '</button>' +
      '<input type="file" accept=".json,application/json" hidden></div>' +
      '<div class="rs-ed-status"></div>' +
      '<div class="rs-ed-info">' + L2(
        "Linke Maustaste setzt, rechte löscht, was unter dem Zeiger liegt. Bühne: Klick setzt den Platz der Rapper (gelb), rot/blau sind ihre Warteplätze. Boden: Shift + Ziehen füllt ein Rechteck. Objekte: Mausrad wechselt die Variante, R dreht. Crowd: gedrückt halten und über die Fläche ziehen. Verschieben: ziehen, Entf löscht, R dreht. Strg + Z macht rückgängig. Gespeicherte Maps bleiben nur in diesem Browser – für Noah als .json exportieren.",
        "Left mouse places, right deletes what is under the pointer. Stage: a click sets where the rappers stand (yellow), red/blue are their waiting spots. Ground: Shift + drag fills a rectangle. Objects: wheel changes the variant, R rotates. Crowd: hold and drag across the area. Move: drag, Del deletes, R rotates. Ctrl + Z undoes. Saved maps stay in this browser only – export as .json to share.") + '</div>';
    E.ui.innerHTML = h;
    E.ui.addEventListener("click", onClick);
    E.ui.addEventListener("input", onInput);
    E.ui.addEventListener("change", onChange);
    E.ui.querySelector("input[type=file]").addEventListener("change", onFile);
    syncUI();
  }
  function fillLoad() {
    var sel = E.ui.querySelector("[data-k=load]"), maps = savedMaps();
    sel.innerHTML = '<option value="">' + L2("Map laden …", "Load map …") + '</option>' +
      '<optgroup label="' + L2("Vorlagen", "Templates") + '">' + RS.POOL.map(function (p) { return '<option value="pool:' + p.id + '">' + p.name + '</option>'; }).join("") + '</optgroup>' +
      (Object.keys(maps).length ? '<optgroup label="' + L2("Gespeichert", "Saved") + '">' + Object.keys(maps).sort().map(function (n) { return '<option value="map:' + n.replace(/"/g, "&quot;") + '">' + n.replace(/</g, "&lt;") + '</option>'; }).join("") + '</optgroup>' : "");
  }
  function syncUI() {
    if (!E.ui) return;
    var q = function (s) { return E.ui.querySelector(s); };
    E.ui.querySelectorAll("[data-tool]").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.tool === E.tool); });
    E.ui.querySelectorAll("[data-pane]").forEach(function (p) { p.hidden = p.dataset.pane !== E.tool; });
    E.ui.querySelectorAll("[data-tile]").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.tile === E.tile); });
    E.ui.querySelectorAll("[data-obj]").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.obj === E.obj.t); });
    q("[data-k=tsize]").value = E.tsize; q("[data-o=tsize]").textContent = E.tsize + "×" + E.tsize;
    q("[data-k=crad]").value = E.crad; q("[data-o=crad]").textContent = String(E.crad).replace(".", ",");
    q("[data-k=cgap]").value = E.cgap; q("[data-o=cgap]").textContent = Math.round((1 - (E.cgap - 0.35) / 0.55) * 100) + " %";
    q("[data-k=cface]").value = E.cface;
    q("[data-k=time]").value = E.world.time; q("[data-o=time]").textContent = fmtTime(E.world.time);
    q("[data-o=var]").textContent = (E.obj.v + 1) + " / " + RS.OBJECTS[E.obj.t].variants;
    q("[data-a=grid]").setAttribute("aria-pressed", E.grid); q("[data-a=cheer]").setAttribute("aria-pressed", E.cheer);
    var nm = q("[data-k=name]"); if (document.activeElement !== nm) nm.value = E.world.map.name;
    var ms = RS.audio.mixGet(); q("[data-mx=comp]").checked = !!ms.comp;
    MX.forEach(function (r) { q("[data-mx=" + r[0] + "]").value = ms[r[0]]; q("[data-mo=" + r[0] + "]").textContent = num(ms[r[0]]) + r[5]; });
    E.ui.querySelectorAll("[data-mx=thr],[data-mx=ratio],[data-mx=att],[data-mx=rel]").forEach(function (el) { el.disabled = !ms.comp; });
    var bt = RS.BEATS[E.mbeat] || RS.BEATS[0], at = q("[data-k=mat]"); q("[data-k=mbeat]").value = E.mbeat;
    at.max = Math.max(1, Math.floor(bt.dur - 3)); if (E.mat == null) E.mat = Math.round((bt.down + 4 * 240 / bt.bpm) * 2) / 2; E.mat = Math.min(E.mat, +at.max);
    at.value = E.mat; var sec = Math.floor(E.mat); q("[data-o=mat]").textContent = Math.floor(sec / 60) + ":" + (sec % 60 < 10 ? "0" : "") + (sec % 60);
    fillLoad();
  }
  function setVariant(d) {
    var def = RS.OBJECTS[E.obj.t];
    if (E.tool === "move" && E.sel && E.sel.k === "o") { snapshot(); var o = E.sel.o; o.v = (o.v + d + RS.OBJECTS[o.t].variants) % RS.OBJECTS[o.t].variants; E.world.dirty(); reselect(o); return; }
    E.obj.v = (E.obj.v + d + def.variants) % def.variants; syncUI();
  }
  function rotate() {
    if (E.tool === "move" && E.sel && E.sel.k === "o") {
      snapshot(); var o = E.sel.o, s0 = RS.sprite(o.t, o.v, o.r), cx = o.x + s0.w / 2, cy = o.y + s0.d / 2; o.r = 1 - o.r;
      var s1 = RS.sprite(o.t, o.v, o.r), sn = snapOf(s1.def); o.x = snap(cx - s1.w / 2, sn); o.y = snap(cy - s1.d / 2, sn); E.world.dirty(); reselect(o); return;
    }
    E.obj.r = 1 - E.obj.r;
  }
  function reselect(o) { E.world.sort(); E.sel = E.world.order.filter(function (q) { return q.o === o; })[0] || null; }
  function onClick(e) {
    var b = e.target.closest("button"); if (!b) return;
    if (b.dataset.tool) { E.tool = b.dataset.tool; E.sel = null; syncUI(); return; }
    if (b.dataset.tile) { E.tile = b.dataset.tile; E.tool = "tile"; syncUI(); return; }
    if (b.dataset.obj) { if (E.obj.t !== b.dataset.obj) E.obj = { t: b.dataset.obj, v: 0, r: E.obj.r }; E.tool = "obj"; syncUI(); return; }
    if (b.dataset.time) { E.world.time = +b.dataset.time; syncUI(); return; }
    var a = b.dataset.a;
    if (a === "vprev") setVariant(-1);
    else if (a === "vnext") setVariant(1);
    else if (a === "rot") rotate();
    else if (a === "grid") { E.grid = !E.grid; syncUI(); }
    else if (a === "cheer") { E.cheer = !E.cheer; E.world.cheer = E.cheer; syncUI(); }
    else if (a === "undo") undo();
    else if (a === "save") {
      var mp = E.world.serialize(), maps = savedMaps(); maps[mp.name || "Brooklyn"] = mp;
      var ok = RS.store.set(MAPS, JSON.stringify(maps)) && RS.store.set(WORK, JSON.stringify(mp)); E.changed = false;
      status(ok ? L2("Gespeichert: ", "Saved: ") + mp.name : L2("Speichern nicht möglich (Browser-Speicher voll oder gesperrt).", "Saving failed (browser storage full or blocked).")); fillLoad();
    }
    else if (a === "export") { var d = E.world.serialize(); download("RapStreets_" + (d.name || "Map").replace(/[^\w\-]+/g, "_") + ".json", JSON.stringify(d)); status(L2("Exportiert.", "Exported.")); }
    else if (a === "import") E.ui.querySelector("input[type=file]").click();
    else if (a === "clear") { snapshot(); var bl = RS.blankMap(); bl.name = E.world.map.name; setMap(bl, true); status(L2("Map geleert (Rückgängig möglich).", "Map cleared (undo possible).")); }
    else if (a === "menu") { saveWork(); RS.main.go("menu"); }
    else if (a === "mtest") micTest();
    else if (a === "mplay" || a === "mraw") listen(a === "mraw");
    else if (a === "mcopy") {
      var txt = JSON.stringify(RS.audio.mixGet());
      var done = function () { status(L2("Werte kopiert – an Claude schicken, dann werden sie Standard.", "Values copied.")); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, function () { window.prompt("", txt); });
      else window.prompt("", txt);
    }
    else if (a === "mreset") { RS.audio.mixReset(); syncUI(); status(L2("Standardwerte geladen.", "Defaults loaded.")); }
  }
  function micTest() {
    var T = RS.audio.test; if (T.busy) { T.stop(); return; }
    var bt = E.ui.querySelector("[data-a=mtest]"); bt.textContent = L2("Abbrechen", "Cancel"); meter(L2("Mikro wird geöffnet …", "Opening mic …"));
    T.record(RS.BEATS[E.mbeat] || RS.BEATS[0], E.mat, function (t) { meter("<b>" + t + "</b>"); }).then(function () {
      bt.textContent = L2("Mikro testen (2 s)", "Test mic (2 s)"); listen(false);
    }, function (err) { if (!E.ui) return; bt.textContent = L2("Mikro testen (2 s)", "Test mic (2 s)"); meter(L2("Test nicht möglich: ", "Test failed: ") + (err && err.message || err)); });
  }
  function db(v) { return '<b class="' + (v > -0.05 ? "hot" : "") + '">' + (v < -99 ? "–" : num(v)) + " dBFS</b>"; }
  function listen(raw) {
    var T = RS.audio.test; if (!T.take) { meter(L2("Erst „Mikro testen“ drücken.", "Press “Test mic” first.")); return; }
    T.listen(raw).then(function (r) {
      meter((raw ? L2("Roh", "Raw") : L2("Bearbeitet", "Processed")) + " · " + L2("Mikro roh: Spitze ", "Mic raw: peak ") + db(r.mic) + "<br>" + L2("Ergebnis: Spitze ", "Result: peak ") + db(r.out) +
        (r.mic > -0.1 ? "<br>" + L2("Mikro übersteuert schon am Eingang – das kann kein Limiter reparieren. Eingangspegel im System oder am Interface runter.", "Mic already clips at the input – no limiter can fix that. Lower the input level in your system or interface.") : "") +
        (r.mic < -30 ? "<br>" + L2("Mikro sehr leise – näher ran oder Eingangspegel im System erhöhen.", "Mic very quiet – get closer or raise the input level in your system.") : ""));
    }, function (err) { meter(L2("Abspielen nicht möglich: ", "Playback failed: ") + (err && err.message || err)); });
  }
  function onInput(e) {
    var mk = e.target.dataset.mx;
    if (mk) { var ms = RS.audio.mixGet(); ms[mk] = mk === "comp" ? (e.target.checked ? 1 : 0) : +e.target.value; RS.audio.mixSet(ms); syncUI(); return; }
    var k = e.target.dataset.k; if (!k) return;
    if (k === "mat") { E.mat = +e.target.value; syncUI(); return; }
    if (k === "time") { E.world.time = +e.target.value; }
    else if (k === "tsize") E.tsize = +e.target.value;
    else if (k === "crad") E.crad = +e.target.value;
    else if (k === "cgap") E.cgap = +e.target.value;
    else if (k === "name") { E.world.map.name = e.target.value.slice(0, 40); return; }
    syncUI();
  }
  function onChange(e) {
    var k = e.target.dataset.k;
    if (k === "cface") { E.cface = e.target.value; return; }
    if (k === "mbeat") { E.mbeat = +e.target.value; E.mat = null; syncUI(); return; }
    if (k !== "load" || !e.target.value) return;
    var v = e.target.value; snapshot();
    if (v.indexOf("pool:") === 0) { var p = RS.POOL.filter(function (x) { return "pool:" + x.id === v; })[0]; if (p) setMap(p.data || p.make()); }
    else { var mp = savedMaps()[v.slice(4)]; if (mp) setMap(mp); }
    status(L2("Geladen: ", "Loaded: ") + E.world.map.name);
  }
  function onFile(e) {
    var f = e.target.files && e.target.files[0]; e.target.value = ""; if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      try { var d = JSON.parse(r.result); if (!d || typeof d.tiles !== "string") throw 0; snapshot(); setMap(d); status(L2("Importiert: ", "Imported: ") + E.world.map.name); }
      catch (er) { status(L2("Das ist keine Rap-Streets-Map.", "This is not a Rap Streets map.")); }
    };
    r.readAsText(f);
  }

  // ---------- Werkzeuge auf der Map ----------
  function cellsAround(gx, gy, n) { var L = [], h = (n - 1) / 2, cx = Math.floor(gx), cy = Math.floor(gy); for (var y = cy - h; y <= cy + h; y++) for (var x = cx - h; x <= cx + h; x++) if (x >= 0 && y >= 0 && x < G && y < G) L.push([x, y]); return L; }
  function paint(cells) { var w = E.world, ch = []; cells.forEach(function (c) { if (w.setTile(c[0], c[1], E.tile)) ch.push(c); }); if (ch.length) w.groundTiles(ch); }
  function rectCells(a, b) { var L = [], x0 = Math.min(a[0], b[0]), x1 = Math.max(a[0], b[0]), y0 = Math.min(a[1], b[1]), y1 = Math.max(a[1], b[1]); for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) if (x >= 0 && y >= 0 && x < G && y < G) L.push([x, y]); return L; }
  function ghostPos(g) { var s = RS.sprite(E.obj.t, E.obj.v, E.obj.r), sn = snapOf(s.def); return { x: m.clamp(snap(g.x - s.w / 2, sn), -1, G), y: m.clamp(snap(g.y - s.d / 2, sn), -1, G), s: s }; }
  function blocked(x, y) {   // steht dort schon ein (nicht flaches) Objekt oder eine Figur zu nah?
    var w = E.world;
    for (var i = 0; i < w.map.obj.length; i++) { var o = w.map.obj[i], s = RS.sprite(o.t, o.v, o.r); if (!s.def.flat && x > o.x - 0.1 && y > o.y - 0.1 && x < o.x + s.w + 0.1 && y < o.y + s.d + 0.1) return true; }
    for (i = 0; i < w.map.ppl.length; i++) { var p = w.map.ppl[i]; if (Math.abs(p.x - x) < E.cgap && Math.abs(p.y - y) < E.cgap && (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y) < E.cgap * E.cgap) return true; }
    return x < 0.2 || y < 0.2 || x > G - 0.2 || y > G - 0.2;
  }
  function crowdBrush(g, dt) {
    var w = E.world, tries = Math.ceil(30 * dt * E.crad * E.crad) + 2, added = 0;
    for (var i = 0; i < tries && w.map.ppl.length < 800; i++) {
      var a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * E.crad, x = g.x + Math.cos(a) * r, y = g.y + Math.sin(a) * r;
      if (blocked(x, y)) continue;
      w.map.ppl.push({ v: Math.floor(Math.random() * RS.PEOPLE_N), x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100, f: E.cface === "mix" ? (Math.random() < 0.5 ? 1 : 0) : +E.cface }); added++;
    }
    if (added) w.dirty();
  }
  function removeItem(q) {
    if (!q) return false; var w = E.world;
    if (q.k === "o") w.map.obj.splice(w.map.obj.indexOf(q.o), 1); else w.map.ppl.splice(w.map.ppl.indexOf(q.p), 1);
    w.dirty(); if (E.sel && (E.sel.o === q.o && q.o || E.sel.p === q.p && q.p)) E.sel = null; return true;
  }

  RS.scenes = RS.scenes || {};
  RS._ed = function () { return E; };   // für Tests
  RS.scenes.editor = {
    enter: function () {
      if (!E) {
        var data = null; try { data = JSON.parse(RS.store.get(WORK) || "null"); } catch (er) {}
        E = { tool: "tile", tile: "a", tsize: 1, obj: { t: "brown", v: 0, r: 0 }, crad: 1.5, cgap: 0.5, cface: "mix", grid: false, cheer: false, undo: [], sel: null, world: null, t: 0, mbeat: 0, mat: null };
        E.world = new RS.World(data || RS.POOL[0].make());
      }
      E.ui = null; build();
      RS.main.setSidebar(PANEL);
      E.keys = function (ev) {
        if (ev.target && /INPUT|SELECT|TEXTAREA/.test(ev.target.tagName)) return;
        if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "z") { ev.preventDefault(); undo(); }
        else if (ev.key === " ") { ev.preventDefault(); E.cheer = !E.cheer; E.world.cheer = E.cheer; syncUI(); }
        else if (ev.key === "Delete" || ev.key === "Backspace") { if (E.sel) { snapshot(); removeItem(E.sel); E.sel = null; } }
        else if (ev.key === "Escape") E.sel = null;
      };
      window.addEventListener("keydown", E.keys);
    },
    exit: function () { if (RS.audio.test) RS.audio.test.stop(); RS.main.setSidebar(0); if (E && E.keys) window.removeEventListener("keydown", E.keys); if (E && E.world) saveWork(); },
    update: function (dt) {
      var I = RS.input, w = E.world, g = RS.toGrid(I.mx, I.my), gc = [Math.floor(g.x), Math.floor(g.y)];
      w.update(dt); E.t += dt;
      if (I.hit("g")) { E.grid = !E.grid; syncUI(); }
      if (I.hit("r")) rotate();
      if (I.wheel) { if (E.tool === "obj" || E.tool === "move") setVariant(I.wheel > 0 ? 1 : -1); else if (E.tool === "tile") { E.tsize = m.clamp(E.tsize + (I.wheel > 0 ? -2 : 2), 1, 7); syncUI(); } else if (E.tool === "crowd") { E.crad = m.clamp(E.crad + (I.wheel > 0 ? -0.25 : 0.25), 0.5, 4); syncUI(); } }
      E.pos.textContent = I.inside ? "x " + g.x.toFixed(1) + "  y " + g.y.toFixed(1) + "   " + w.map.obj.length + " " + L2("Objekte", "objects") + " · " + w.map.ppl.length + " " + L2("Leute", "people") : "";
      if (!I.inside && !E.drag) { E.hover = null; return; }
      E.hover = E.tool === "erase" || E.tool === "move" || I.rmb ? w.pick(I.mx, I.my) : null;
      // Rechte Maustaste: löschen, was unter dem Zeiger liegt
      if (I.rmbHit) { var q = w.pick(I.mx, I.my); if (q) { snapshot(); removeItem(q); } return; }
      if (E.tool === "tile") {
        if (I.lmbHit) { snapshot(); E.drag = { shift: I.down("Shift"), a: gc }; }
        if (E.drag && I.lmb && !E.drag.shift) paint(cellsAround(g.x, g.y, E.tsize));
        if (E.drag && !I.lmb) { if (E.drag.shift) paint(rectCells(E.drag.a, gc)); E.drag = null; }
      } else if (E.tool === "obj") {
        if (I.lmbHit) { var gp = ghostPos(g); snapshot(); w.map.obj.push({ t: E.obj.t, v: E.obj.v, r: E.obj.r, x: gp.x, y: gp.y }); w.dirty(); }
      } else if (E.tool === "crowd") {
        if (I.lmbHit) snapshot();
        if (I.lmb) crowdBrush(g, dt);
      } else if (E.tool === "erase") {
        if (I.lmbHit) { snapshot(); E.drag = {}; }
        if (E.drag && I.lmb) removeItem(w.pick(I.mx, I.my));
        if (E.drag && !I.lmb) E.drag = null;
      } else if (E.tool === "stage") {
        if (I.lmbHit) { snapshot(); w.map.stage = { x: Math.round(g.x * 10) / 10, y: Math.round(g.y * 10) / 10 }; status(L2("Bühne gesetzt: hier stehen die Rapper.", "Stage set: the rappers stand here.")); }
      } else if (E.tool === "move") {
        if (I.lmbHit) {
          var hit = w.pick(I.mx, I.my); E.sel = hit;
          if (hit) { snapshot(); var it = hit.o || hit.p; E.drag = { it: it, dx: it.x - g.x, dy: it.y - g.y, sn: hit.o ? snapOf(hit.s.def) : 0.05 }; }
        }
        if (E.drag && I.lmb) { var d = E.drag; d.it.x = snap(g.x + d.dx, d.sn); d.it.y = snap(g.y + d.dy, d.sn); w.dirty(); }
        if (E.drag && !I.lmb) { E.drag = null; if (E.sel && E.sel.o) reselect(E.sel.o); }
      }
    },
    render: function (c) {
      var w = E.world, I = RS.input, g = RS.toGrid(I.mx, I.my);
      w.render(c, { sel: E.sel && E.sel.o });
      // Raster
      if (E.grid) {
        c.strokeStyle = "rgba(255,255,255,.13)"; c.lineWidth = 1; c.beginPath();
        for (var i = 0; i <= G; i++) { c.moveTo(RS.sx(i, 0), RS.sy(i, 0)); c.lineTo(RS.sx(i, G), RS.sy(i, G)); c.moveTo(RS.sx(0, i), RS.sy(0, i)); c.lineTo(RS.sx(G, i), RS.sy(G, i)); }
        c.stroke();
      }
      // Bühne: Mitte (gelb) und Warteplätze der Rapper (rot/blau)
      if (E.tool === "stage" || E.grid) {
        var sp = RS.stageSpots(w.map), mk = function (p, col) { var x = Math.round(RS.sx(p.x, p.y)), y = Math.round(RS.sy(p.x, p.y)); c.fillStyle = col; c.beginPath(); c.moveTo(x, y - 3); c.lineTo(x + 6, y); c.lineTo(x, y + 3); c.lineTo(x - 6, y); c.closePath(); c.fill(); };
        mk(sp.c, "rgba(242,194,48,.9)"); mk(sp.wait[0], "rgba(216,55,44,.9)"); mk(sp.wait[1], "rgba(58,120,224,.9)");
      }
      if (!I.inside) return;
      var dia = function (x0, y0, x1, y1, col, fill) {
        c.beginPath(); c.moveTo(RS.sx(x0, y0), RS.sy(x0, y0)); c.lineTo(RS.sx(x1, y0), RS.sy(x1, y0)); c.lineTo(RS.sx(x1, y1), RS.sy(x1, y1)); c.lineTo(RS.sx(x0, y1), RS.sy(x0, y1)); c.closePath();
        if (fill) { c.fillStyle = fill; c.fill(); } c.strokeStyle = col; c.lineWidth = 1; c.stroke();
      };
      if (E.tool === "tile") {
        var cl = E.drag && E.drag.shift ? rectCells(E.drag.a, [Math.floor(g.x), Math.floor(g.y)]) : cellsAround(g.x, g.y, E.tsize);
        if (cl.length) { var xs = cl.map(function (q) { return q[0]; }), ys = cl.map(function (q) { return q[1]; }); dia(Math.min.apply(null, xs), Math.min.apply(null, ys), Math.max.apply(null, xs) + 1, Math.max.apply(null, ys) + 1, "rgba(242,194,48,.9)", "rgba(242,194,48,.12)"); }
      } else if (E.tool === "obj") {
        var gp = ghostPos(g); dia(gp.x, gp.y, gp.x + gp.s.w, gp.y + gp.s.d, "rgba(242,194,48,.8)", "rgba(242,194,48,.12)");
        c.globalAlpha = 0.65; c.drawImage(gp.s.cv, Math.round(RS.sx(gp.x, gp.y) - gp.s.ax), Math.round(RS.sy(gp.x, gp.y) - gp.s.ay)); c.globalAlpha = 1;
      } else if (E.tool === "crowd") {
        var cx = RS.sx(g.x, g.y), cy = RS.sy(g.x, g.y), r = E.crad * Math.SQRT2 * HW;
        c.save(); c.translate(cx, cy); c.scale(1, HH / HW); c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.restore();
        c.strokeStyle = "rgba(242,194,48,.85)"; c.lineWidth = 1; c.stroke();
      }
      if (E.hover && (E.tool === "erase" || E.tool === "move")) {
        var q = E.hover, col = E.tool === "erase" ? "rgba(230,80,60,.9)" : "rgba(242,194,48,.9)";
        if (q.k === "o") dia(q.o.x, q.o.y, q.o.x + q.s.w, q.o.y + q.s.d, col, null);
        else { var px = RS.sx(q.p.x, q.p.y), py = RS.sy(q.p.x, q.p.y); c.strokeStyle = col; c.strokeRect(Math.round(px) - 5.5, Math.round(py) - 26.5, 11, 28); }
      }
      if (E.sel && E.sel.p) { var sp = E.sel.p, ex = RS.sx(sp.x, sp.y), ey = RS.sy(sp.x, sp.y); c.strokeStyle = "rgba(242,194,48,.95)"; c.strokeRect(Math.round(ex) - 5.5, Math.round(ey) - 26.5, 11, 28); }
    }
  };
})();
