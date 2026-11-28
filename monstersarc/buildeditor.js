/* Monsters Arc – buildeditor.js (seit v0.2, Innenbereich seit v0.21)
   Gebäude-Editor: eigener Reiter im Dev-Kit. Links die Parameter, rechts die Vorschau des Hauses (aus buildgen.js).
   v0.21: Schalter Außen / Innen. Innen: Boden je Geschoss, Möbel setzen/verschieben/löschen, Treppen (3 Drehungen), Geschoss-Wechsel
   (Datensatz und Bild: buildinterior.js, Möbel: furniture.js + houses.js). Der Export (Version 2) enthält Außen und Innen in einer Datei.
   Ablauf: Stil wählen → Fenster, Fassade, Dimension, Dachtyp und Extras einstellen → Namen eingeben →
   „Gebäude exportieren (.json)“ und die Datei an Claude schicken. Die Datei enthält nur die Parameter
   (das Bild lässt sich daraus jederzeit exakt neu erzeugen). Import lädt eine solche Datei wieder in den Editor.
   Der Arbeitsstand (Parameter + Name) bleibt im Browser erhalten (localStorage `monstersarc.building.v1`).
   Eingebunden von devkit.js: MA.buildEditor.mount / update / render (Reiter „buildings“). */
(function () {
  var MA = window.MA, L2 = MA.L2, G = MA.buildgen, I2 = MA.buildinterior, T = MA.TILE, KEY = "monstersarc.building.v1";
  var ZOOMS = [0.5, 1, 2, 3, 4];

  MA.EDITOR_CSS = (MA.EDITOR_CSS || "") +
    ".ma-seg{display:flex;gap:3px;flex:1;min-width:0}.ma-seg button{flex:1;padding:5px 2px;font-size:.76rem;min-width:0}" +
    ".ma-ed .ma-seg button[disabled],.ma-ed .ma-be button[disabled]{opacity:.38;cursor:default}" +
    ".ma-be .ma-ed-row label{flex:0 0 78px}.ma-be .ma-ed-row output{flex:0 0 46px}" +
    ".ma-sw{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin:4px 0}" +
    ".ma-ed .ma-sw button,.ma-ed .ma-sw button[aria-pressed=true]{height:28px;padding:0;background:var(--c);border:2px solid #434543}" +
    ".ma-ed .ma-sw button[aria-pressed=true]{border-color:#ED6A5E;box-shadow:inset 0 0 0 1px #1C1D1C}" +
    ".ma-be h4{margin:10px 0 3px;font:600 .72rem/1.2 var(--f-body,system-ui);color:#ACA89F}.ma-be h4 b{color:#E4E0D8;font-weight:600}" +
    ".ma-be .hint{color:#8E8A82;font-size:.72rem;line-height:1.4;margin:3px 0}" +
    ".ma-be .ma-th{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin:4px 0}.ma-be .ma-th.f3{grid-template-columns:repeat(3,1fr)}" +
    ".ma-ed .ma-th button{height:54px;padding:2px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:1px;font-size:.62rem}" +
    ".ma-ed .ma-th.f3 button{height:60px}.ma-ed .ma-th button[aria-pressed=true]{border-color:#ED6A5E;box-shadow:inset 0 0 0 1px #1C1D1C}" +
    ".ma-be .ma-th img{max-width:100%;max-height:100%;image-rendering:pixelated;min-height:0;object-fit:contain}.ma-ed .ma-th.f3 button img{max-height:36px}" +
    ".ma-be .warn{background:#4A2A22;border:1px solid #ED6A5E;color:#F4D6CE;font-size:.76rem;line-height:1.4;padding:6px 8px;border-radius:4px;margin:6px 0}" +
    ".ma-be .ok{color:#9BC78B}.ma-be .bad{color:#ED9A8E}.ma-be .stl{display:flex;justify-content:space-between;gap:6px;font-size:.74rem;margin:2px 0;color:#CFCBC1}" +
    ".ma-be-fills{display:grid;grid-template-columns:1fr 1fr;gap:4px}.ma-be-fills button{padding:5px 4px;font-size:.74rem;text-align:left}";

  var S = null;   // Zustand (bleibt beim Reiterwechsel erhalten)

  function load() {
    var raw = MA.store.get(KEY), j = null;
    try { j = raw ? JSON.parse(raw) : null; } catch (e) { j = null; }
    var p = G.sanitize(j && j.p);
    return { p: p, name: (j && typeof j.name === "string") ? j.name.slice(0, 40) : "", inn: I2.sanitize(j && j.inn, p), mode: j && j.mode === "in" ? "in" : "out" };
  }
  function save() { MA.store.set(KEY, JSON.stringify({ p: S.p, name: S.name, inn: S.inn, mode: S.mode })); }
  function ensure() {
    if (S) return;
    var d = load();
    S = { p: d.p, name: d.name, zoom: null, ox: 0, oy: 0, grid: false, res: null, bg: null, host: null, api: null, info: null,
      mode: d.mode, inn: d.inn, fl: 0, tool: "put", cat: "office", item: { t: "m_desk_pc", v: 0 }, rot: "S", undo: [], need: -1, bgc: null, drag: null, thumbs: {} };
    S.res = G.render(S.p);
    if (S.mode === "in") enterInner();
  }
  function changed() { S.p = G.sanitize(S.p); S.res = G.render(S.p); S.bgc = null; save(); }

  // ---------- Bausteine der Oberfläche ----------
  function val(v) { return String(v); }
  function seg(key, opts, cur, extra) {
    return '<div class="ma-seg">' + opts.map(function (o) {
      return '<button type="button" data-bp="' + key + '" data-bv="' + val(o.v) + '" aria-pressed="' + (o.v === cur) + '"' + (o.off ? " disabled" : "") + (o.t ? ' title="' + o.t + '"' : "") + '>' + o.l + '</button>';
    }).join("") + '</div>';
  }
  function row(label, inner) { return '<div class="ma-ed-row"><label>' + label + '</label>' + inner + '</div>'; }
  function slider(key, label) { return row(label, '<input type="range" data-bs="' + key + '" min="0" max="1" step="1"><output data-bo="' + key + '"></output>'); }
  function swatches(key, list, cur) {
    return '<div class="ma-sw">' + list.map(function (o, i) {
      return '<button type="button" data-bp="' + key + '" data-bv="' + i + '" aria-pressed="' + (i === cur) + '" title="' + G.nm(o) + '" style="--c:' + MA.rgb(o.c) + '"></button>';
    }).join("") + '</div>';
  }
  function onoff(key, cur, off) { return seg(key, [{ v: true, l: L2("an", "on"), off: off }, { v: false, l: L2("aus", "off") }], cur); }
  var FL = function (i) { return i === 0 ? L2("Erdgeschoss", "Ground") : L2(i + ". OG", "Upper " + i); };

  function panelHtml() {
    var sw = '<div class="ma-seg" style="margin-bottom:4px">' +
      '<button type="button" data-bi="mode:out" aria-pressed="' + (S.mode === "out") + '">' + L2("Außen", "Outside") + '</button>' +
      '<button type="button" data-bi="mode:in" aria-pressed="' + (S.mode === "in") + '">' + L2("Innen", "Inside") + '</button></div>';
    return '<div class="ma-be">' + sw + '</div>' + (S.mode === "in" ? innerPanel() : outerPanel());
  }
  function nameBlock() {
    return '<h3>' + L2("Gebäude", "Building") + '</h3>' +
      row("Name", '<input type="text" data-bn="name" maxlength="40" placeholder="' + L2("z. B. Bäckerei", "e.g. Bakery") + '" value="' + S.name.replace(/"/g, "&quot;") + '">') +
      '<div class="ma-ed-btns">' +
      '<button type="button" class="w go" data-ba="export">' + L2("Gebäude exportieren (.json)", "Export building (.json)") + '</button>' +
      (S.mode === "in" ? '<button type="button" data-ba="ipng">' + L2("Innen-PNG", "Interior PNG") + '</button>' : '<button type="button" data-ba="seed">' + L2("Texturen würfeln", "Reroll textures") + '</button>') +
      '<button type="button" data-ba="reset">' + L2("Zurücksetzen", "Reset") + '</button>' +
      (S.mode === "in" ? "" : '<button type="button" data-ba="png">' + L2("Vorschau-PNG", "Preview PNG") + '</button>') +
      '<button type="button" data-ba="import">' + L2("Import", "Import") + '</button>' +
      '</div><input type="file" accept=".json,application/json" hidden data-bn="file">';
  }
  function outerPanel() {
    var p = S.p, flat = p.rooftype === "flat", dormOk = !flat && p.ridge === "x";
    var h = '<div class="ma-be">';
    h += '<h3>' + L2("Stil", "Style") + '</h3>' + seg("style", [{ v: "fachwerk", l: L2("Fachwerk", "Timber frame") }], "fachwerk") +
      '<div class="hint">' + L2("Weitere Stile kommen später.", "More styles come later.") + '</div>';

    h += '<h3>' + L2("1 · Fenster", "1 · Windows") + '</h3>' +
      row(L2("Typ", "Type"), seg("wtype", [{ v: "square", l: L2("Eckig", "Square") }, { v: "round", l: L2("Rund", "Round") }], p.wtype));
    for (var f = 0; f < p.floors; f++) h += slider("win" + f, FL(f));
    h += '<div class="hint">' + L2("Anzahl Fenster je Geschoss. Die Tür, der Kaminschacht und die Balkontür nehmen Platz weg.", "Windows per floor. The door, chimney shaft and balcony door take up space.") + '</div>';

    h += '<h3>' + L2("2 · Fassade", "2 · Facade") + '</h3>' +
      '<h4>' + L2("Füllung zwischen den Balken", "Infill between the beams") + '</h4><div class="ma-be-fills">' +
      G.FILLS.map(function (o, i) { return '<button type="button" data-bp="fill" data-bv="' + i + '" aria-pressed="' + (p.fill === i) + '">' + G.nm(o) + '</button>'; }).join("") + '</div>' +
      '<h4>' + L2("Balken", "Beams") + ': <b>' + G.nm(G.BEAMS[p.beam]) + '</b></h4>' + swatches("beam", G.BEAMS, p.beam) +
      '<h4>' + L2("Fassade", "Facade") + ': <b>' + G.nm(G.FACADES[p.facade]) + '</b></h4>' + swatches("facade", G.FACADES, p.facade) +
      '<h4>' + L2("Dach", "Roof") + ': <b>' + G.nm(G.ROOFS[p.roof]) + '</b></h4>' + swatches("roof", G.ROOFS, p.roof);

    h += '<h3>' + L2("3 · Dimension", "3 · Size") + '</h3>' +
      slider("w", L2("Breite", "Width")) + slider("d", L2("Tiefe", "Depth")) +
      row(L2("Geschosse", "Floors"), seg("floors", [{ v: 1, l: "1" }, { v: 2, l: "2" }, { v: 3, l: "3" }], p.floors)) +
      slider("door", L2("Tür-Block", "Door block")) +
      '<div class="hint">' + L2("Breite × Tiefe in Blöcken (1 Block = 1 Kachel = 16 px). Die Tür sitzt an der Vorderseite.", "Width × depth in blocks (1 block = 1 tile = 16 px). The door is on the front.") + '</div>';

    h += '<h3>' + L2("4 · Dachtyp", "4 · Roof type") + '</h3>' +
      seg("rooftype", [{ v: "tiles", l: L2("Dachziegel", "Roof tiles") }, { v: "flat", l: L2("Flach", "Flat") }], p.rooftype) +
      row(L2("First", "Ridge"), seg("ridge", [{ v: "x", l: L2("Quer (Traufe vorn)", "Across (eaves front)"), off: flat }, { v: "y", l: L2("Giebel vorn", "Gable front"), off: flat }], p.ridge));

    h += '<h3>' + L2("5 · Fassaden-Extras", "5 · Facade extras") + '</h3>' +
      '<h4>' + L2("Balkon", "Balcony") + '</h4>' + onoff("balc", p.balc, p.floors < 2);
    if (p.floors < 2) h += '<div class="hint">' + L2("Ein Balkon braucht mindestens 2 Geschosse.", "A balcony needs at least 2 floors.") + '</div>';
    if (p.balc) {
      h += row(L2("Breite", "Width"), seg("balcW", [{ v: 1, l: L2("1 Block", "1 block") }, { v: 2, l: L2("2 Blöcke", "2 blocks") }], p.balcW));
      if (p.floors > 2) h += row(L2("Geschoss", "Floor"), seg("balcFloor", [{ v: 1, l: L2("1. OG", "Upper 1") }, { v: 2, l: L2("2. OG", "Upper 2") }], p.balcFloor));
      h += slider("balcSlot", L2("Position", "Position"));
    }
    h += '<h4>' + L2("Kaminschacht (Kopfstein)", "Chimney shaft (cobblestone)") + '</h4>' + onoff("shaft", p.shaft);
    if (p.shaft) h += slider("shaftSlot", L2("Position", "Position"));

    h += '<h3>' + L2("6 · Dach-Extras", "6 · Roof extras") + '</h3>' +
      '<h4>' + L2("Dachfenster", "Dormer windows") + '</h4>' +
      seg("dormers", [0, 1, 2, 3].map(function (n) { return { v: n, l: String(n), off: !dormOk && n > 0 }; }), dormOk ? p.dormers : 0);
    if (!dormOk) h += '<div class="hint">' + L2("Dachfenster gibt es nur bei Dachziegeln mit First quer.", "Dormers only work with roof tiles and the ridge across.") + '</div>';
    h += '<h4>' + L2("Schornstein", "Chimney") + '</h4>' + onoff("chim", p.chim);
    if (p.chim) h += slider("chimPos", L2("Position", "Position"));

    h += nameBlock() +
      '<h3>' + L2("Ansicht", "View") + '</h3>' +
      '<div class="ma-ed-zoom"><button type="button" data-ba="zout" title="−">−</button><button type="button" data-ba="zin" title="+">+</button><button type="button" data-ba="zauto">Auto</button><output data-bo="zoom"></output></div>' +
      row(L2("Raster", "Grid") + " (G)", '<button type="button" data-ba="grid" aria-pressed="' + S.grid + '">' + L2("an/aus", "on/off") + '</button>') +
      '<div class="ma-ed-status"></div><div class="ma-ed-info" data-bo="info"></div>' +
      '<div class="ma-ed-info">' + L2(
        "Ansicht: Mausrad oder +/− zoomt, bei großem Zoom verschiebst du das Bild mit WASD/Pfeiltasten oder der mittleren Maustaste.<br>Alles, was du hier (außen und innen) einstellst, steckt in der exportierten .json-Datei. Schick sie mir mit dem Namen im Dateinamen, dann kommt das Gebäude in die Bibliothek des Map-Editors.",
        "View: mouse wheel or +/− zooms; when zoomed in, move the picture with WASD/arrow keys or the middle mouse button.<br>Everything you set here (outside and inside) is stored in the exported .json file. Send it to me with the name in the file name and the building goes into the map editor library.") + '</div>' +
      '<div class="ma-ed-btns" style="margin-top:12px"><button type="button" class="w" data-ba="menu">' + L2("← Hauptmenü", "← Main menu") + '</button></div>';
    return h + '</div>';
  }

  // Grenzen und Werte der Regler aus dem Zustand
  function spec(key) {
    var p = S.p;
    if (key === "w") return [3, 12, p.w, p.w];
    if (key === "d") return [3, 10, p.d, p.d];
    if (key === "door") return [0, p.w - 1, p.door, p.door + 1];
    if (/^win\d$/.test(key)) { var f = +key.slice(3), mx = G.avail(p, f).length; return [0, mx, p.wins[f], p.wins[f]]; }
    if (key === "balcSlot") return [0, p.w - p.balcW, p.balcSlot, p.balcSlot + 1];
    if (key === "shaftSlot") return [0, p.w - 1, p.shaftSlot, p.shaftSlot + 1];
    if (key === "chimPos") return [15, 85, p.chimPos, p.chimPos + " %"];
    return null;
  }
  function syncRanges() {
    var host = S.host; if (!host) return;
    Array.prototype.forEach.call(host.querySelectorAll("[data-bs]"), function (el) {
      var sp = spec(el.dataset.bs); if (!sp) return;
      el.min = sp[0]; el.max = sp[1]; el.step = el.dataset.bs === "chimPos" ? 5 : 1; el.value = sp[2];
      var o = host.querySelector('[data-bo="' + el.dataset.bs + '"]'); if (o) o.textContent = sp[3];
    });
    var z = host.querySelector('[data-bo="zoom"]'); if (z) z.textContent = zoomNow() === 0.5 ? "50 %" : Math.round(zoomNow() * 100) + " %";
    var r = S.res, inf = host.querySelector('[data-bo="info"]');
    if (inf && r) inf.textContent = L2("Bild ", "Image ") + r.w + " × " + r.h + " px · " + L2("Grundfläche ", "Footprint ") + S.p.w + " × " + S.p.d + L2(" Blöcke", " blocks") + " · " + L2("Wandhöhe ", "Wall height ") + r.Hw + " px";
    var gb = host.querySelector('[data-ba="grid"]'); if (gb) gb.setAttribute("aria-pressed", String(S.grid));
  }
  function renderPanel() {
    if (!S.host) return;
    S.host.innerHTML = panelHtml(); syncRanges();
  }
  function status(t) { if (S.api && S.api.status) S.api.status(t); }

  function parseV(v) { return v === "true" ? true : v === "false" ? false : /^-?\d+$/.test(v) ? +v : v; }
  function setP(key, v) {
    var p = S.p;
    if (/^win\d$/.test(key)) { p.wins = p.wins.slice(); p.wins[+key.slice(3)] = v; } else p[key] = v;
    changed();
  }
  function slug(s) { return (s || "").toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""); }
  function saveBlob(name, blob) {
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function exportData() {
    var r = S.res, nm = S.name.trim(), inn = I2.sanitize(S.inn, S.p), nf = S.p.floors, L = I2.layout(S.p), stairs = [], t;
    for (t = 0; t < nf - 1; t++) {
      var st = inn.stairs[t], g = I2.stairGeom(st);
      stairs.push({ from: t, to: t + 1, rot: st.rot, tx: st.tx, ty: st.ty, rect: g.rect, entry: g.entry, arrive: g.arrive });
    }
    return {
      format: "monstersarc-building", version: 2, game: MA.VERSION, name: nm || "Gebäude", style: S.p.style, params: S.p,
      interior: {
        size: [L.iw, L.ih], tile: T, doorTile: L.doorTx, backWall: 32,
        note: "x,y = Fußpunkt der Objekte in px ab Ecke oben links des Bodens (Rückwand liegt 32 px darüber). Stairs: rect/entry = [x,y,w,h] in px, arrive = Auftauchpunkt im Geschoss darüber/darunter.",
        floors: inn.floors.slice(0, nf), stairs: stairs
      },
      info: { blocks: [S.p.w, S.p.d], floors: nf, imageSize: [r.w, r.h], anchor: [r.ax, r.ay], interiorObjects: inn.floors.slice(0, nf).reduce(function (n, f) { return n + f.objs.length; }, 0) }
    };
  }
  function doImport(text) {
    var j; try { j = JSON.parse(text); } catch (e) { status(L2("Keine gültige Gebäudedatei.", "Not a valid building file.")); return; }
    var pr = j && (j.params || (j.w ? j : null));
    if (!pr) { status(L2("Keine gültige Gebäudedatei.", "Not a valid building file.")); return; }
    S.p = G.sanitize(pr); S.name = typeof j.name === "string" ? j.name.slice(0, 40) : S.name;
    var inn = null;
    if (j.interior && Array.isArray(j.interior.floors)) {
      inn = { floors: j.interior.floors, stairs: [null, null] };
      (Array.isArray(j.interior.stairs) ? j.interior.stairs : []).forEach(function (st) { if (st && st.from >= 0 && st.from < 2) inn.stairs[st.from] = st; });
    }
    S.inn = I2.sanitize(inn, S.p); S.undo = []; S.fl = 0; S.bgc = null; changed();
    if (S.mode === "in") enterInner(); else S.need = I2.missingStair(S.p, S.inn);
    renderPanel();
    status(L2("Importiert: ", "Imported: ") + (S.name || "—") + (inn ? "" : L2(" (ohne Innenraum)", " (no interior)")));
  }

  function onClick(e) {
    var b = e.target.closest("button"); if (!b || b.disabled) return;
    var d = b.dataset;
    if (d.bi) { e.stopPropagation(); onInner(d.bi); return; }
    if (d.bp) { e.stopPropagation(); setP(d.bp, parseV(d.bv)); renderPanel(); return; }
    var a = d.ba; if (!a) return;
    e.stopPropagation();
    if (a === "export") {
      if (!S.name.trim()) { status(L2("Bitte erst einen Namen eingeben.", "Please enter a name first.")); var ni = S.host.querySelector('[data-bn="name"]'); if (ni) ni.focus(); return; }
      S.inn = I2.sanitize(S.inn, S.p); S.need = I2.missingStair(S.p, S.inn);
      if (S.need >= 0) { S.mode = "in"; enterInner(); renderPanel(); status(L2("Erst die Treppe platzieren: ", "Place the stairs first: ") + stairName(S.need)); return; }
      var fn = "monstersarc-gebaeude-" + (slug(S.name) || "gebaeude") + ".json";
      saveBlob(fn, new Blob([JSON.stringify(exportData(), null, 1)], { type: "application/json" }));
      status(L2("Exportiert: ", "Exported: ") + fn);
    }
    else if (a === "png") S.res.cv.toBlob(function (bl) { saveBlob("monstersarc-gebaeude-" + (slug(S.name) || "vorschau") + ".png", bl); status(L2("Vorschau-PNG gespeichert.", "Preview PNG saved.")); });
    else if (a === "ipng") { var pc = MA.canvas(MA.W, MA.H); drawInner(pc.ctx, S.fl); pc.toBlob(function (bl) { saveBlob("monstersarc-innen-" + (slug(S.name) || "gebaeude") + "-" + (S.fl + 1) + ".png", bl); status(L2("Innen-PNG gespeichert.", "Interior PNG saved.")); }); }
    else if (a === "seed") { S.p.seed = (Math.random() * 99999) | 0; changed(); syncRanges(); }
    else if (a === "reset") { S.p = G.sanitize(null); S.name = ""; S.inn = I2.empty(); S.undo = []; S.fl = 0; S.need = -1; changed(); if (S.mode === "in") enterInner(); renderPanel(); status(L2("Zurückgesetzt.", "Reset.")); }
    else if (a === "import") S.host.querySelector('[data-bn="file"]').click();
    else if (a === "zin") zoomStep(1);
    else if (a === "zout") zoomStep(-1);
    else if (a === "zauto") { S.zoom = null; S.ox = S.oy = 0; syncRanges(); }
    else if (a === "grid") { S.grid = !S.grid; syncRanges(); }
    else if (a === "menu") MA.main.go("menu");
  }
  function onInput(e) {
    var el = e.target;
    if (el.dataset.bs) { e.stopPropagation(); setP(el.dataset.bs, +el.value); syncRanges(); return; }
    if (el.dataset.bn === "name") { e.stopPropagation(); S.name = el.value; save(); }
  }
  function onChange(e) {
    var el = e.target;
    if (el.dataset.bn === "file") {
      e.stopPropagation(); var f = el.files[0]; if (!f) return;
      var rd = new FileReader(); rd.onload = function () { doImport(String(rd.result)); }; rd.readAsText(f); el.value = "";
    }
  }

  // ======================= INNENBEREICH (seit v0.21) =======================
  var CATS = [
    { id: "office", n: ["Büro", "Office"], ids: ["m_desk_pc", "m_desk_laptop", "m_desk_books", "m_office_chair"] },
    { id: "seat", n: ["Sitzen", "Seating"], ids: ["m_chair_wood", "m_chair_fold", "m_sofa", "m_armchair"] },
    { id: "kitchen", n: ["Küche", "Kitchen"], ids: ["m_k_counter", "m_k_stove", "m_k_fridge", "m_k_wall"] },
    { id: "living", n: ["Wohnen", "Living"], ids: ["m_tv", "m_cabinet", "m_mirror", "m_floorlamp", "m_walllamp", "m_plant", "m_pot"] },
    { id: "house", n: ["Haus", "House"], ids: ["m_table", "m_shelf", "m_bed", "m_barrel", "m_hearth", "m_aisle", "m_fridge", "m_checkout"] }
  ];
  function cat(id) { for (var i = 0; i < CATS.length; i++) if (CATS[i].id === id) return CATS[i]; return CATS[0]; }
  function odef(t) { return MA.OBJECTS[t]; }
  function thumb(t, v) {
    var k = t + ":" + v; if (S.thumbs[k]) return S.thumbs[k];
    return (S.thumbs[k] = MA.sprite("obj", t, v).cv.toDataURL());
  }
  function nfl() { return S.p.floors; }
  function pushU() { S.undo.push(JSON.stringify(S.inn)); if (S.undo.length > 60) S.undo.shift(); }
  function doUndo() {
    if (!S.undo.length) { status(L2("Nichts rückgängig zu machen.", "Nothing to undo.")); return; }
    S.inn = I2.sanitize(JSON.parse(S.undo.pop()), S.p); checkStairs(false); save(); renderPanel();
  }
  function enterInner() {
    S.inn = I2.sanitize(S.inn, S.p);
    if (S.fl >= nfl()) S.fl = nfl() - 1;
    checkStairs(true);
  }
  // Fehlt noch eine Treppe? Dann wird als Erstes danach gefragt: Geschoss wechseln, Treppen-Werkzeug, Hinweis.
  function checkStairs(force) {
    S.need = I2.missingStair(S.p, S.inn);
    if (S.need >= 0 && force) { S.fl = S.need; S.tool = "stair"; }
    else if (S.need < 0 && S.tool === "stair" && force) S.tool = "put";
  }
  function stairName(t) { return FL(t) + " → " + FL(t + 1); }
  function curObjs() { return S.inn.floors[S.fl].objs; }
  function stairsHere() {   // Treppen, die auf dem aktuellen Geschoss sichtbar sind: [Treppe nach oben, Öffnung von unten]
    var a = S.fl < nfl() - 1 ? S.inn.stairs[S.fl] : null, b = S.fl > 0 ? S.inn.stairs[S.fl - 1] : null; return [a, b];
  }
  function inRect(rc, x, y) { return x >= rc[0] && x < rc[0] + rc[2] && y >= rc[1] && y < rc[1] + rc[3]; }
  function blockedPt(x, y) {
    var st = stairsHere();
    for (var i = 0; i < 2; i++) if (st[i] && inRect(I2.stairGeom(st[i]).rect, x, y - 1)) return true;
    return false;
  }
  function stairOk(t, s) {
    if (t < 0 || t >= nfl() - 1) return false;
    var L = I2.layout(S.p); if (!I2.stairFits(L, s)) return false;
    var a = t > 0 ? S.inn.stairs[t - 1] : null, b = t + 1 < nfl() - 1 ? S.inn.stairs[t + 1] : null;
    return !((a && I2.stairsOverlap(a, s)) || (b && I2.stairsOverlap(b, s)));
  }
  function snapObj(t, mx, my) {
    var d = odef(t), L = I2.layout(S.p), lx = mx - L.X0, ly = my - L.Y0, x, y, mw = L.iw * T, mh = L.ih * T;
    if (d.mod) x = Math.floor(lx / T) * T + T / 2; else x = Math.round(lx / 8) * 8;
    if (d.wall) y = T; else if (d.mod) y = (Math.floor(ly / T) + 1) * T; else y = Math.round(ly / 8) * 8;
    x = Math.max(d.mod ? T / 2 : 0, Math.min(mw - (d.mod ? T / 2 : 0), x)); y = Math.max(T, Math.min(mh, y));
    return { x: x, y: y };
  }
  function hitObj(mx, my) {
    var L = I2.layout(S.p), list = curObjs(), best = -1, by = -1;
    for (var i = 0; i < list.length; i++) {
      var o = list[i], sp = MA.sprite("obj", o.t, o.v), d = sp.def, rx = L.X0 + o.x - d.ax, ry = L.Y0 + o.y - d.ay;
      if (mx >= rx && mx < rx + d.w && my >= ry && my < ry + d.h && o.y >= by) {
        var a = sp.cv.ctx.getImageData(Math.floor(mx - rx), Math.floor(my - ry), 1, 1).data[3];
        if (a > 10) { best = i; by = o.y; }
      }
    }
    return best;
  }
  function stairAt(mx, my) {   // Index der Treppe (t), falls die Maus über ihrer Fläche liegt
    var L = I2.layout(S.p), st = stairsHere(), idx = [S.fl, S.fl - 1];
    for (var i = 0; i < 2; i++) if (st[i] && inRect(I2.stairGeom(st[i]).rect, mx - L.X0, my - L.Y0)) return idx[i];
    return -1;
  }
  function placeObj(t, v, x, y) {
    var list = curObjs();
    for (var i = 0; i < list.length; i++) if (list[i].t === t && list[i].x === x && list[i].y === y) { if (list[i].v === v) return false; pushU(); list[i].v = v; save(); return true; }
    if (blockedPt(x, y)) { status(L2("Dort liegt die Treppe.", "The stairs are there.")); return false; }
    pushU(); list.push({ t: t, x: x, y: y, v: v }); save(); return true;
  }
  function placeStair(t, s) {
    if (!stairOk(t, s)) { status(L2("Dort passt die Treppe nicht (Raumrand oder andere Treppe im Weg).", "The stairs don't fit there (room edge or other stairs in the way).")); return; }
    pushU();
    S.inn.stairs[t] = s;
    var rc = I2.stairGeom(s).rect, n = 0;   // Möbel unter der Treppe und unter der Öffnung darüber entfernen
    [t, t + 1].forEach(function (f) {
      var fo = S.inn.floors[f], keep = fo.objs.filter(function (o) { return !inRect(rc, o.x, o.y - 1); });
      n += fo.objs.length - keep.length; fo.objs = keep;
    });
    checkStairs(false);
    if (S.need >= 0) { S.fl = S.need; S.tool = "stair"; } else if (S.tool === "stair") S.tool = "put";
    save(); renderPanel();
    status(stairName(t) + L2(": Treppe gesetzt", ": stairs placed") + (n ? " · " + n + L2(" Möbel entfernt", " items removed") : "") + (S.need >= 0 ? " · " + L2("Weiter mit ", "Next: ") + stairName(S.need) : ""));
  }
  function stairFromMouse(mx, my) {
    var L = I2.layout(S.p), g = I2.stairGeom({ rot: S.rot, tx: 0, ty: 0 });
    var tx = Math.round((mx - L.X0) / T - g.tw / 2), ty = Math.round((my - L.Y0) / T - g.th / 2);
    tx = Math.max(0, Math.min(L.iw - g.tw, tx)); ty = Math.max(0, Math.min(L.ih - g.th, ty));
    return { rot: S.rot, tx: tx, ty: ty };
  }

  function bi(k, label, pressed, extra) { return '<button type="button" data-bi="' + k + '" aria-pressed="' + !!pressed + '"' + (extra || "") + '>' + label + '</button>'; }
  function innerPanel() {
    var p = S.p, h = '<div class="ma-be">', i, c = cat(S.cat), d = odef(S.item.t);
    if (S.need >= 0) h += '<div class="warn"><b>' + L2("Treppe platzieren!", "Place the stairs!") + '</b><br>' + L2("Zwischen ", "Between ") + stairName(S.need) + L2(" fehlt noch die Treppe. Wähle eine Drehung und klicke in den Raum. Exportieren geht erst, wenn alle Treppen stehen.", " the stairs are missing. Pick a rotation and click in the room. Export works once all stairs are placed.") + '</div>';
    h += '<h3>' + L2("Geschoss", "Floor") + '</h3><div class="ma-seg">';
    for (i = 0; i < nfl(); i++) h += bi("fl:" + i, (i === 0 ? L2("EG", "GF") : i + ". OG") + (i === S.fl ? "" : ""), i === S.fl, ' title="' + FL(i) + ' (' + (i + 1) + ')"');
    h += '</div><div class="hint">' + L2("Taste 1–3 wechselt das Geschoss. Raum: ", "Keys 1–3 switch floors. Room: ") + I2.layout(p).iw + " × " + I2.layout(p).ih + L2(" Kacheln (Außenmaß × 1,5).", " tiles (outer size × 1.5).") + '</div>';
    h += '<h3>' + L2("Boden", "Floor covering") + ': <span style="font-weight:400">' + FL(S.fl) + '</span></h3><div class="ma-th f3">';
    I2.FLOORS.forEach(function (f) {
      h += '<button type="button" data-bi="fk:' + f.id + '" aria-pressed="' + (S.inn.floors[S.fl].floor === f.id) + '" title="' + I2.nm(f) + '"><img src="' + (S.thumbs["f" + f.id] || (S.thumbs["f" + f.id] = I2.floorThumb(f.id))) + '"><span>' + I2.nm(f) + '</span></button>';
    });
    h += '</div><div class="ma-ed-btns">' + bi("fkall", L2("Für alle Geschosse", "For all floors")) + '</div>';

    h += '<h3>' + L2("Werkzeug", "Tool") + '</h3><div class="ma-seg">' +
      bi("tool:put", L2("Setzen", "Place"), S.tool === "put") + bi("tool:move", L2("Schieben", "Move"), S.tool === "move") +
      bi("tool:del", L2("Löschen", "Delete"), S.tool === "del") + bi("tool:stair", L2("Treppe", "Stairs"), S.tool === "stair", nfl() < 2 ? " disabled" : "") + '</div>';
    if (S.tool === "stair") {
      h += '<h4>' + L2("Treppe zwischen ", "Stairs between ") + (S.fl < nfl() - 1 ? '<b>' + stairName(S.fl) + '</b>' : '<b>—</b>') + '</h4>';
      if (S.fl >= nfl() - 1) h += '<div class="hint">' + L2("Im obersten Geschoss beginnt keine Treppe. Wechsle ins Geschoss darunter.", "No stairs start on the top floor. Switch to the floor below.") + '</div>';
      h += '<h4>' + L2("Eingang der Treppe (R dreht)", "Entrance of the stairs (R rotates)") + '</h4><div class="ma-th f3">';
      [["S", L2("von unten", "from below")], ["W", L2("von links", "from the left")], ["E", L2("von rechts", "from the right")]].forEach(function (r) {
        h += '<button type="button" data-bi="rot:' + r[0] + '" aria-pressed="' + (S.rot === r[0]) + '"><img src="' + (S.thumbs["s" + r[0]] || (S.thumbs["s" + r[0]] = I2.stairThumb(r[0], p))) + '"><span>' + r[1] + '</span></button>';
      });
      h += '</div><div class="hint">' + L2("Man betritt die Treppe an der Seite, von der sie benannt ist, und geht nach oben. Im Geschoss darüber ist an derselben Stelle die Öffnung; dort erscheint man und geht wieder hinein, um nach unten zu kommen.", "You enter the stairs from the side it is named after and walk up. On the floor above the same spot is the opening; you appear there and walk back in to go down.") + '</div>';
    } else {
      h += '<h3>' + L2("Objekte", "Objects") + '</h3><div class="ma-seg" style="flex-wrap:wrap">' + CATS.map(function (k) { return bi("cat:" + k.id, L2(k.n[0], k.n[1]), S.cat === k.id); }).join("") + '</div>' +
        '<div class="ma-th">' + c.ids.map(function (t) {
          var df = odef(t); if (!df) return "";
          return '<button type="button" data-bi="item:' + t + '" aria-pressed="' + (S.item.t === t) + '" title="' + df.name() + '"><img src="' + thumb(t, S.item.t === t ? S.item.v : 0) + '"></button>';
        }).join("") + '</div>';
      if (d) {
        h += '<h4>' + d.name() + (d.variants > 1 ? ' · ' + L2("Variante ", "Variant ") + (S.item.v + 1) + '/' + d.variants + ' <span style="font-weight:400">(' + L2("Mausrad", "wheel") + ')</span>' : '') + '</h4>';
        if (d.variants > 1) {
          h += '<div class="ma-th">';
          for (i = 0; i < d.variants; i++) h += '<button type="button" data-bi="var:' + i + '" aria-pressed="' + (S.item.v === i) + '"><img src="' + thumb(S.item.t, i) + '"></button>';
          h += '</div>';
        }
        if (d.mod) h += '<div class="hint">' + L2("Küchenmodul: rastet auf die Kachel ein und schließt bündig an die Nachbarn an.", "Kitchen module: snaps to the tile and sits flush against its neighbours.") + '</div>';
        if (d.wall) h += '<div class="hint">' + L2("Wandobjekt: hängt an der Rückwand.", "Wall object: hangs on the back wall.") + '</div>';
      }
      h += '<div class="hint">' + L2("Linksklick setzt, Rechtsklick löscht. Schieben: Objekt anklicken, ziehen, loslassen.", "Left click places, right click deletes. Move: click an object, drag, release.") + '</div>';
    }
    h += '<h3>' + L2("Treppen", "Stairs") + '</h3>';
    if (nfl() < 2) h += '<div class="hint">' + L2("Eingeschossig – keine Treppe nötig.", "Single floor – no stairs needed.") + '</div>';
    for (i = 0; i < nfl() - 1; i++) {
      var st = S.inn.stairs[i];
      h += '<div class="stl"><span>' + stairName(i) + '</span><span class="' + (st ? "ok" : "bad") + '">' + (st ? L2("gesetzt", "placed") : L2("fehlt", "missing")) + ' <button type="button" data-bi="goto:' + i + '" style="padding:1px 6px;font-size:.7rem">' + (st ? L2("ändern", "change") : L2("setzen", "place")) + '</button></span></div>';
    }
    h += '<div class="ma-ed-btns" style="margin-top:6px">' + bi("undo", L2("Rückgängig (Strg+Z)", "Undo (Ctrl+Z)")) + bi("clear", L2("Geschoss leeren", "Clear floor")) + '</div>';
    h += nameBlock() + '<div class="ma-ed-status"></div>' +
      '<div class="ma-ed-info">' + L2("Alles Innen wird zusammen mit dem Außenbereich in <b>einer</b> .json exportiert. Ändern sich Breite/Tiefe im Außen-Modus, werden Dinge außerhalb des neuen Raums beim nächsten Innen-Wechsel entfernt.", "Everything inside is exported together with the outside in <b>one</b> .json. If width/depth change in Outside mode, things outside the new room are removed the next time you switch to Inside.") + '</div>';
    h += '<div class="ma-ed-btns" style="margin-top:12px"><button type="button" class="w" data-ba="menu">' + L2("← Hauptmenü", "← Main menu") + '</button></div></div>';
    return h;
  }
  function onInner(a) {
    var k = a.split(":")[0], v = a.slice(k.length + 1), d;
    if (k === "mode") { S.mode = v; if (v === "in") enterInner(); save(); renderPanel(); return; }
    if (k === "fl") { S.fl = Math.max(0, Math.min(nfl() - 1, +v)); }
    else if (k === "fk") { pushU(); S.inn.floors[S.fl].floor = v; save(); }
    else if (k === "fkall") { pushU(); var kd = S.inn.floors[S.fl].floor; S.inn.floors.forEach(function (f) { f.floor = kd; }); save(); status(L2("Boden für alle Geschosse gesetzt.", "Floor applied to all floors.")); }
    else if (k === "tool") S.tool = v;
    else if (k === "cat") { S.cat = v; S.item = { t: cat(v).ids[0], v: 0 }; }
    else if (k === "item") { S.item = { t: v, v: 0 }; if (S.tool !== "put") S.tool = "put"; }
    else if (k === "var") S.item.v = +v;
    else if (k === "rot") S.rot = v;
    else if (k === "goto") { var t = +v; S.fl = t; S.tool = "stair"; }
    else if (k === "undo") { doUndo(); return; }
    else if (k === "clear") { pushU(); S.inn.floors[S.fl].objs = []; save(); status(FL(S.fl) + L2(" geleert.", " cleared.")); }
    renderPanel();
  }
  function wheelVar(dir) {
    var d = odef(S.item.t); if (!d || d.variants < 2) return;
    S.item.v = (S.item.v + dir + d.variants) % d.variants; renderPanel();
  }
  function innerUpdate() {
    var I = MA.input, L = I2.layout(S.p), mx = I.mx, my = I.my, ctrl = I.down("Control") || I.down("Meta"), i;
    for (i = 0; i < nfl(); i++) if (I.hit(String(i + 1)) && S.fl !== i) { S.fl = i; renderPanel(); }
    if (ctrl && I.hit("z")) { doUndo(); return; }
    if (I.hit("r") && S.tool === "stair") { S.rot = S.rot === "S" ? "W" : S.rot === "W" ? "E" : "S"; renderPanel(); }
    if (I.wheel && S.tool === "put") wheelVar(I.wheel < 0 ? 1 : -1);
    var inRoom = mx >= L.X0 - 4 && mx < L.X1 + 4 && my >= L.Y0 - 4 && my < L.Y1 + 4;
    S.hov = null;
    if (!inRoom) { if (!I.lmb) S.drag = null; return; }
    if (S.tool === "put" && S.item) {
      var sn = snapObj(S.item.t, mx, my); S.hov = { kind: "ghost", x: sn.x, y: sn.y, ok: !blockedPt(sn.x, sn.y) };
      if (I.lmbHit) placeObj(S.item.t, S.item.v, sn.x, sn.y);
    } else if (S.tool === "stair") {
      var s = stairFromMouse(mx, my); S.hov = { kind: "stair", s: s, ok: stairOk(S.fl, s) };
      if (I.lmbHit) placeStair(S.fl, s);
    } else if (S.tool === "move") {
      if (I.lmbHit) { var hi = hitObj(mx, my); if (hi >= 0) { pushU(); S.drag = { i: hi }; } }
      if (S.drag) {
        var o = curObjs()[S.drag.i];
        if (o && I.lmb) { var sm = snapObj(o.t, mx, my); o.x = sm.x; o.y = sm.y; S.hov = { kind: "obj", i: S.drag.i }; }
        else { if (o && blockedPt(o.x, o.y)) { var u = S.undo.pop(); S.inn = I2.sanitize(JSON.parse(u), S.p); status(L2("Dort liegt die Treppe.", "The stairs are there.")); } save(); S.drag = null; }
      } else { var hh = hitObj(mx, my); if (hh >= 0) S.hov = { kind: "obj", i: hh }; }
    }
    if (S.tool === "del" || I.rmbHit) {
      var hd = hitObj(mx, my), sa = hd < 0 ? stairAt(mx, my) : -1;
      if (hd >= 0) S.hov = { kind: "obj", i: hd, del: 1 }; else if (sa >= 0) S.hov = { kind: "stairdel", t: sa };
      if ((S.tool === "del" && I.lmbHit) || I.rmbHit || (I.hit("Delete") && (hd >= 0 || sa >= 0))) {
        if (hd >= 0) { pushU(); curObjs().splice(hd, 1); save(); }
        else if (sa >= 0) { pushU(); S.inn.stairs[sa] = null; checkStairs(true); save(); renderPanel(); status(stairName(sa) + L2(": Treppe entfernt – bitte neu setzen.", ": stairs removed – please place again.")); }
      }
    }
  }
  // Geschoss zeichnen: Hintergrund (Boden, Wände, Treppen) + Möbel nach Tiefe sortiert
  function innerKey() {
    var fo = S.inn.floors[S.fl], bl = fo.objs.filter(function (o) { var d = odef(o.t); return o.y < 36 && (d.wall || d.h > 40); }).map(function (o) { return o.x; });
    return JSON.stringify([S.p.w, S.p.d, S.p.floors, S.p.door, S.p.beam, S.p.facade, S.p.seed, S.fl, fo.floor, S.inn.stairs, bl]);
  }
  function drawInner(ctx, fl) {
    var key = innerKey();
    if (!S.bgc || S.bgc.key !== key) S.bgc = { key: key, r: I2.render(S.p, S.inn, fl) };
    var L = S.bgc.r.L, list = S.inn.floors[fl].objs.slice().sort(function (a, b) { return a.y - b.y || a.x - b.x; }), t = performance.now() / 1000;
    ctx.drawImage(S.bgc.r.cv, 0, 0);
    list.forEach(function (o) {
      var d = odef(o.t), fr = d.frames ? Math.floor(t * (d.fps || 6)) % d.frames : 0, sp = MA.sprite("obj", o.t, o.v, fr);
      ctx.drawImage(sp.cv, L.X0 + o.x - d.ax, L.Y0 + o.y - d.ay);
    });
    return L;
  }
  function innerRender(ctx) {
    ctx.fillStyle = "#0C0B0E"; ctx.fillRect(0, 0, MA.W, MA.H);
    var L = drawInner(ctx, S.fl), h = S.hov;
    ctx.save(); ctx.imageSmoothingEnabled = false;
    if (h && h.kind === "ghost") {
      var d = odef(S.item.t), sp = MA.sprite("obj", S.item.t, S.item.v);
      ctx.globalAlpha = 0.6; ctx.drawImage(sp.cv, L.X0 + h.x - d.ax, L.Y0 + h.y - d.ay); ctx.globalAlpha = 1;
      ctx.strokeStyle = h.ok ? "rgba(255,255,255,.7)" : "#ED6A5E"; ctx.lineWidth = 1;
      ctx.strokeRect(L.X0 + h.x - 3.5, L.Y0 + h.y - 3.5, 7, 7);
    } else if (h && h.kind === "obj") {
      var o = curObjs()[h.i];
      if (o) { var dd = odef(o.t); ctx.strokeStyle = h.del ? "#ED6A5E" : "#F4E8A0"; ctx.lineWidth = 1; ctx.strokeRect(L.X0 + o.x - dd.ax + 0.5, L.Y0 + o.y - dd.ay + 0.5, dd.w - 1, dd.h - 1); }
    } else if (h && h.kind === "stair") {
      var gm = I2.stairGeom(h.s), c = h.ok ? "120,220,120" : "237,106,94";
      ctx.fillStyle = "rgba(" + c + ",.28)"; ctx.fillRect(L.X0 + gm.rect[0], L.Y0 + gm.rect[1], gm.rect[2], gm.rect[3]);
      ctx.fillStyle = "rgba(" + c + ",.55)"; ctx.fillRect(L.X0 + gm.entry[0], L.Y0 + gm.entry[1], gm.entry[2], gm.entry[3]);
      ctx.strokeStyle = "rgb(" + c + ")"; ctx.strokeRect(L.X0 + gm.rect[0] + 0.5, L.Y0 + gm.rect[1] + 0.5, gm.rect[2] - 1, gm.rect[3] - 1);
    } else if (h && h.kind === "stairdel") {
      var st = S.inn.stairs[h.t], g2 = I2.stairGeom(st); ctx.strokeStyle = "#ED6A5E"; ctx.strokeRect(L.X0 + g2.rect[0] + 0.5, L.Y0 + g2.rect[1] + 0.5, g2.rect[2] - 1, g2.rect[3] - 1);
    }
    // Geschoss-Anzeige und Treppen-Hinweis
    ctx.font = "bold 10px monospace"; ctx.textBaseline = "top";
    var lab = FL(S.fl) + (S.p.floors > 1 ? "  [" + (S.fl + 1) + "/" + S.p.floors + "]" : "");
    ctx.fillStyle = "rgba(0,0,0,.6)"; ctx.fillRect(4, 4, ctx.measureText(lab).width + 8, 14); ctx.fillStyle = "#F4E8D0"; ctx.fillText(lab, 8, 7);
    if (S.need >= 0) {
      var m = L2("Treppe platzieren: ", "Place the stairs: ") + stairName(S.need), w2 = ctx.measureText(m).width + 12;
      ctx.fillStyle = "rgba(74,42,34,.92)"; ctx.fillRect((MA.W - w2) / 2, 4, w2, 16); ctx.strokeStyle = "#ED6A5E"; ctx.strokeRect((MA.W - w2) / 2 + 0.5, 4.5, w2 - 1, 15);
      ctx.fillStyle = "#F4D6CE"; ctx.fillText(m, (MA.W - w2) / 2 + 6, 8);
    }
    ctx.restore();
  }

  // ---------- Vorschau ----------
  function zoomAuto() {
    var r = S.res, best = ZOOMS[0];
    ZOOMS.forEach(function (z) { if (r.w * z <= MA.W - 24 && r.h * z <= MA.H - 16) best = z; });
    return best;
  }
  function zoomNow() { return S.zoom || zoomAuto(); }
  function zoomStep(dir) {
    var i = ZOOMS.indexOf(zoomNow()); S.zoom = ZOOMS[Math.max(0, Math.min(ZOOMS.length - 1, i + dir))]; S.ox = S.oy = 0; syncRanges();
  }
  function ground() {
    var c = MA.canvas(MA.W, MA.H), img = c.ctx.createImageData(MA.W, MA.H), b = img.data;
    for (var y = 0; y < MA.H; y++) for (var x = 0; x < MA.W; x++) {
      var n = (MA.fbm(x / 9, y / 9, 7, 2) - 0.5) * 16 + (MA.hash2(x, y, 3) - 0.5) * 7, chk = ((x >> 4) + (y >> 4)) & 1 ? 2 : -2, i = (y * MA.W + x) * 4;
      b[i] = 66 + n + chk; b[i + 1] = 88 + n * 1.1 + chk; b[i + 2] = 58 + n * 0.8 + chk; b[i + 3] = 255;
    }
    c.ctx.putImageData(img, 0, 0); return c;
  }

  MA.buildEditor = {
    // Arbeitsstand für „Gesamten Arbeitsstand exportieren“ (seit v0.28.2) und zurückspielen
    state: function () { if (S) return { p: S.p, name: S.name, inn: S.inn, mode: S.mode }; try { return JSON.parse(MA.store.get(KEY) || "null"); } catch (e) { return null; } },
    restore: function (j) { if (!j || typeof j !== "object") return false; MA.store.set(KEY + ".backup", MA.store.get(KEY) || ""); MA.store.set(KEY, JSON.stringify(j)); S = null; return true; },
    // Seitenleiste aufbauen (host = Körper des Dev-Kit-Reiters, api = { status })
    mount: function (host, api) {
      ensure(); S.host = host; S.api = api;
      if (!host.__be) { host.__be = 1; host.addEventListener("click", onClick); host.addEventListener("input", onInput); host.addEventListener("change", onChange); }
      renderPanel();
    },
    update: function (dt) {
      if (!S) return;
      if (S.mode === "in") { innerUpdate(); return; }
      var I = MA.input;
      if (I.hit("g")) { S.grid = !S.grid; syncRanges(); }
      if (I.hit("+") || I.hit("=")) zoomStep(1);
      if (I.hit("-")) zoomStep(-1);
      if (I.wheel && !(I.down("Control") || I.down("Meta"))) zoomStep(I.wheel < 0 ? 1 : -1);
      // Ansicht verschieben (wenn das Haus größer ist als das Bild): WASD/Pfeile oder mittlere Maustaste
      var sp = (I.down("Shift") ? 420 : 200) * (dt || 0.016), dx = 0, dy = 0;
      if (I.down("a") || I.down("ArrowLeft")) dx += sp;
      if (I.down("d") || I.down("ArrowRight")) dx -= sp;
      if (I.down("w") || I.down("ArrowUp")) dy += sp;
      if (I.down("s") || I.down("ArrowDown")) dy -= sp;
      if (I.mmb && S.lastM) { dx += I.mx - S.lastM[0]; dy += I.my - S.lastM[1]; }
      S.lastM = I.mmb ? [I.mx, I.my] : null;
      if (dx || dy) { S.ox = Math.max(-600, Math.min(600, S.ox + dx)); S.oy = Math.max(-600, Math.min(600, S.oy + dy)); }
    },
    render: function (ctx) {
      ensure(); if (S.mode === "in") { innerRender(ctx); return; }
      if (!S.bg) S.bg = ground();
      ctx.drawImage(S.bg, 0, 0);
      var r = S.res, z = zoomNow(), X = Math.round((MA.W - r.w * z) / 2 + S.ox), Y = Math.round((MA.H - r.h * z) / 2 + 4 + S.oy);
      ctx.save(); ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = "rgba(0,0,0,0.22)";   // weicher Bodenschatten unter dem Haus
      ctx.fillRect(X + (r.foot[0] - 2) * z, Y + (r.foot[3] - 3) * z, (r.W + 6) * z, 6 * z);
      ctx.drawImage(r.cv, X, Y, Math.round(r.w * z), Math.round(r.h * z));
      if (S.grid) {   // Blockraster vor dem Haus (die Grundfläche selbst liegt hinter der Fassade) mit Tür-Markierung
        var x0 = X + r.foot[0] * z, x1 = X + r.foot[2] * z, y1 = Y + r.foot[3] * z, ext = 2 * T * z;
        ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 1;
        for (var gx = 0; gx <= S.p.w; gx++) { var lxp = Math.round(x0 + gx * T * z) + 0.5; ctx.beginPath(); ctx.moveTo(lxp, y1 - 1); ctx.lineTo(lxp, y1 + ext); ctx.stroke(); }
        for (var gy = 0; gy <= 2; gy++) { var lyp = Math.round(y1 + gy * T * z) + 0.5; ctx.beginPath(); ctx.moveTo(x0, lyp); ctx.lineTo(x1, lyp); ctx.stroke(); }
        ctx.fillStyle = "#ED6A5E"; ctx.fillRect(Math.round(X + r.doorX * z) - 4 * z, Math.round(y1) + 1, 8 * z, 2);   // Tür-Markierung
      }
      ctx.restore();
    }
  };
})();
