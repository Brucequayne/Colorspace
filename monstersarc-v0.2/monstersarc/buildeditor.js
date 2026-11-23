/* Monsters Arc – buildeditor.js (seit v0.2)
   Gebäude-Editor: eigener Reiter im Dev-Kit. Links die Parameter, rechts die Vorschau des Hauses (aus buildgen.js).
   Ablauf: Stil wählen → Fenster, Fassade, Dimension, Dachtyp und Extras einstellen → Namen eingeben →
   „Gebäude exportieren (.json)“ und die Datei an Claude schicken. Die Datei enthält nur die Parameter
   (das Bild lässt sich daraus jederzeit exakt neu erzeugen). Import lädt eine solche Datei wieder in den Editor.
   Der Arbeitsstand (Parameter + Name) bleibt im Browser erhalten (localStorage `monstersarc.building.v1`).
   Eingebunden von devkit.js: MA.buildEditor.mount / update / render (Reiter „buildings“). */
(function () {
  var MA = window.MA, L2 = MA.L2, G = MA.buildgen, T = MA.TILE, KEY = "monstersarc.building.v1";
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
    ".ma-be-fills{display:grid;grid-template-columns:1fr 1fr;gap:4px}.ma-be-fills button{padding:5px 4px;font-size:.74rem;text-align:left}";

  var S = null;   // Zustand (bleibt beim Reiterwechsel erhalten)

  function load() {
    var raw = MA.store.get(KEY), j = null;
    try { j = raw ? JSON.parse(raw) : null; } catch (e) { j = null; }
    return { p: G.sanitize(j && j.p), name: (j && typeof j.name === "string") ? j.name.slice(0, 40) : "" };
  }
  function save() { MA.store.set(KEY, JSON.stringify({ p: S.p, name: S.name })); }
  function ensure() {
    if (S) return;
    var d = load();
    S = { p: d.p, name: d.name, zoom: null, ox: 0, oy: 0, grid: false, res: null, bg: null, host: null, api: null, info: null };
    S.res = G.render(S.p);
  }
  function changed() { S.p = G.sanitize(S.p); S.res = G.render(S.p); save(); }

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

    h += '<h3>' + L2("Gebäude", "Building") + '</h3>' +
      row("Name", '<input type="text" data-bn="name" maxlength="40" placeholder="' + L2("z. B. Bäckerei", "e.g. Bakery") + '" value="' + S.name.replace(/"/g, "&quot;") + '">') +
      '<div class="ma-ed-btns">' +
      '<button type="button" class="w go" data-ba="export">' + L2("Gebäude exportieren (.json)", "Export building (.json)") + '</button>' +
      '<button type="button" data-ba="seed">' + L2("Texturen würfeln", "Reroll textures") + '</button>' +
      '<button type="button" data-ba="reset">' + L2("Zurücksetzen", "Reset") + '</button>' +
      '<button type="button" data-ba="png">' + L2("Vorschau-PNG", "Preview PNG") + '</button>' +
      '<button type="button" data-ba="import">' + L2("Import", "Import") + '</button>' +
      '</div><input type="file" accept=".json,application/json" hidden data-bn="file">' +
      '<h3>' + L2("Ansicht", "View") + '</h3>' +
      '<div class="ma-ed-zoom"><button type="button" data-ba="zout" title="−">−</button><button type="button" data-ba="zin" title="+">+</button><button type="button" data-ba="zauto">Auto</button><output data-bo="zoom"></output></div>' +
      row(L2("Raster", "Grid") + " (G)", '<button type="button" data-ba="grid" aria-pressed="' + S.grid + '">' + L2("an/aus", "on/off") + '</button>') +
      '<div class="ma-ed-status"></div><div class="ma-ed-info" data-bo="info"></div>' +
      '<div class="ma-ed-info">' + L2(
        "Ansicht: Mausrad oder +/− zoomt, bei großem Zoom verschiebst du das Bild mit WASD/Pfeiltasten oder der mittleren Maustaste.<br>Alles, was du hier einstellst, steckt in der exportierten .json-Datei. Schick sie mir mit dem Namen im Dateinamen, dann kommt das Gebäude in die Bibliothek des Map-Editors.",
        "View: mouse wheel or +/− zooms; when zoomed in, move the picture with WASD/arrow keys or the middle mouse button.<br>Everything you set here is stored in the exported .json file. Send it to me with the name in the file name and the building goes into the map editor library.") + '</div>' +
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
    var r = S.res, nm = S.name.trim();
    return {
      format: "monstersarc-building", version: 1, game: MA.VERSION, name: nm || "Gebäude", style: S.p.style, params: S.p,
      info: { blocks: [S.p.w, S.p.d], floors: S.p.floors, imageSize: [r.w, r.h], anchor: [r.ax, r.ay] }
    };
  }
  function doImport(text) {
    var j; try { j = JSON.parse(text); } catch (e) { status(L2("Keine gültige Gebäudedatei.", "Not a valid building file.")); return; }
    var pr = j && (j.params || (j.w ? j : null));
    if (!pr) { status(L2("Keine gültige Gebäudedatei.", "Not a valid building file.")); return; }
    S.p = G.sanitize(pr); S.name = typeof j.name === "string" ? j.name.slice(0, 40) : S.name; changed(); renderPanel();
    status(L2("Importiert: ", "Imported: ") + (S.name || "—"));
  }

  function onClick(e) {
    var b = e.target.closest("button"); if (!b || b.disabled) return;
    var d = b.dataset;
    if (d.bp) { e.stopPropagation(); setP(d.bp, parseV(d.bv)); renderPanel(); return; }
    var a = d.ba; if (!a) return;
    e.stopPropagation();
    if (a === "export") {
      if (!S.name.trim()) { status(L2("Bitte erst einen Namen eingeben.", "Please enter a name first.")); var ni = S.host.querySelector('[data-bn="name"]'); if (ni) ni.focus(); return; }
      var fn = "monstersarc-gebaeude-" + (slug(S.name) || "gebaeude") + ".json";
      saveBlob(fn, new Blob([JSON.stringify(exportData(), null, 1)], { type: "application/json" }));
      status(L2("Exportiert: ", "Exported: ") + fn);
    }
    else if (a === "png") S.res.cv.toBlob(function (bl) { saveBlob("monstersarc-gebaeude-" + (slug(S.name) || "vorschau") + ".png", bl); status(L2("Vorschau-PNG gespeichert.", "Preview PNG saved.")); });
    else if (a === "seed") { S.p.seed = (Math.random() * 99999) | 0; changed(); syncRanges(); }
    else if (a === "reset") { S.p = G.sanitize(null); S.name = ""; changed(); renderPanel(); status(L2("Zurückgesetzt.", "Reset.")); }
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
    // Seitenleiste aufbauen (host = Körper des Dev-Kit-Reiters, api = { status })
    mount: function (host, api) {
      ensure(); S.host = host; S.api = api;
      if (!host.__be) { host.__be = 1; host.addEventListener("click", onClick); host.addEventListener("input", onInput); host.addEventListener("change", onChange); }
      renderPanel();
    },
    update: function (dt) {
      if (!S) return;
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
      ensure(); if (!S.bg) S.bg = ground();
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
