/* Draw Space: eine weiße Fläche von 100.000 × 100.000 Pixeln zum Kritzeln.
   Gespeichert wird nur, was bemalt ist: in Kacheln zu 500 × 500 Pixeln, die erst beim Malen entstehen.
   Werkzeuge, Pinsel (und später Stempel) sind Register, neue Einträge brauchen keinen Umbau.
   Alles läuft im Browser, nichts verlässt das Gerät. */
(function () {
  "use strict";

  var VERSION = "0.1", T = 500, NT = 200, WORLD = T * NT, ZMIN = 0.01, ZMAX = 16;
  var lang = "de";
  function L2(de, en) { return { de: de, en: en }; }
  var TX = {
    title: L2("Draw Space", "Draw Space"), back: L2("Apps", "Apps"),
    brush: L2("Pinsel", "Brush"), ruler: L2("Lineal", "Ruler"), hand: L2("Verschieben", "Pan"),
    undo: L2("Rückgängig", "Undo"), redo: L2("Wiederholen", "Redo"),
    zin: L2("Hineinzoomen", "Zoom in"), zout: L2("Herauszoomen", "Zoom out"), home: L2("Zur Mitte", "Back to centre"),
    exp: L2("Exportieren", "Export"), help: L2("Hilfe", "Help"),
    size: L2("Dicke", "Size"), opacity: L2("Deckkraft", "Opacity"), smooth: L2("Glättung", "Smoothing"),
    colour: L2("Farbe", "Colour"), recent: L2("Zuletzt benutzt", "Recently used"),
    smoothNote: L2("Glättung zieht den Strich weich hinter der Maus her, für ruhige, geschwungene Linien.", "Smoothing lets the stroke trail softly behind the mouse, for calm, flowing lines."),
    rulerNote: L2("Ziehen zeichnet eine gerade Linie mit dem Pinsel. Mit Umschalt rastet der Winkel in 15°-Schritten ein.", "Drag to draw a straight line with the brush. Hold Shift to snap the angle in 15° steps."),
    brushNote: L2("Tipp: Umschalt + Klick zieht eine gerade Linie vom letzten Strichende.", "Tip: Shift + click draws a straight line from the end of the last stroke."),
    cropH: L2("Bereich exportieren", "Export area"), cropHint: L2("Zieh einen Rahmen um den Bereich. Ecken und Kanten lassen sich verschieben.", "Drag a frame around the area. Corners and edges can be moved."),
    cropFit: L2("Alles Gemalte", "Everything painted"), cropGo: L2("Als JPEG exportieren", "Export as JPEG"), cancel: L2("Abbrechen", "Cancel"),
    cropMax: L2("Zu groß für den Export: höchstens 16.384 px pro Seite und 120 Megapixel.", "Too large to export: at most 16,384 px per side and 120 megapixels."),
    cropEmpty: L2("Noch nichts gemalt.", "Nothing painted yet."), saving: L2("JPEG wird erstellt …", "Creating JPEG …"),
    saved: L2("Gespeichert: {f}", "Saved: {f}"),
    helpTxt: L2("Mausrad zoomt, Leertaste halten oder mittlere bzw. rechte Maustaste zum Verschieben. Tasten: B Pinsel · L Lineal · H Verschieben · [ ] Dicke · Strg+Z / Strg+Y · 0 zur Mitte · + / − Zoom · Esc bricht ab. Die Fläche ist 100.000 × 100.000 Pixel groß, die kleine Karte unten links zeigt, wo du bist. Deine Zeichnung bleibt erhalten, solange die Seite offen ist.",
                 "The mouse wheel zooms, hold Space or use the middle or right mouse button to pan. Keys: B brush · L ruler · H pan · [ ] size · Ctrl+Z / Ctrl+Y · 0 centre · + / − zoom · Esc cancels. The area is 100,000 × 100,000 pixels, the small map at the bottom left shows where you are. Your drawing is kept as long as the page is open.")
  };
  function t(k) { return TX[k][lang]; }
  function fmt(s, o) { return s.replace(/\{(\w+)\}/g, function (_, k) { return o[k]; }); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function canvas(w, h) { var c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
  function num(n) { return Math.round(n).toLocaleString(lang === "de" ? "de-DE" : "en-GB"); }

  // ---------- Frutiger-Aero-Icons (gemeinsame Verläufe in einem defs-Block) ----------
  var DEFS = '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>' +
    '<linearGradient id="dsAqua" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E4F9FF"/><stop offset=".45" stop-color="#62CBF3"/><stop offset="1" stop-color="#1373C4"/></linearGradient>' +
    '<linearGradient id="dsGreen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F0FFE2"/><stop offset=".5" stop-color="#84D757"/><stop offset="1" stop-color="#2B8A27"/></linearGradient>' +
    '<linearGradient id="dsGlassG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E9FFF4" stop-opacity=".95"/><stop offset="1" stop-color="#55C98F" stop-opacity=".8"/></linearGradient>' +
    '<linearGradient id="dsSilver" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".5" stop-color="#C8D2DC"/><stop offset="1" stop-color="#7D8B99"/></linearGradient>' +
    '<linearGradient id="dsGloss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
    '<radialGradient id="dsOrb" cx=".38" cy=".3" r=".75"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".35" stop-color="#8EDCFA"/><stop offset="1" stop-color="#1572C2"/></radialGradient>' +
    '<radialGradient id="dsOrbG" cx=".38" cy=".3" r=".75"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".35" stop-color="#A6E98A"/><stop offset="1" stop-color="#23862A"/></radialGradient>' +
    '<radialGradient id="dsLens" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#FFFFFF" stop-opacity=".95"/><stop offset="1" stop-color="#5FC6F0" stop-opacity=".55"/></radialGradient>' +
    '</defs></svg>';
  var GLOSS = function (cx, cy, rx, ry) { return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="url(#dsGloss)"/>'; };
  var ICONS = {
    brush: '<svg viewBox="0 0 32 32" aria-hidden="true"><g transform="rotate(42 16 16)"><rect x="13.3" y="14" width="5.4" height="16" rx="2.7" fill="url(#dsAqua)" stroke="#0E5EA3" stroke-width=".6"/><rect x="14.2" y="15" width="1.5" height="13" rx=".75" fill="#fff" opacity=".75"/>' +
      '<rect x="12.8" y="9.5" width="6.4" height="5" fill="url(#dsSilver)" stroke="#6B7987" stroke-width=".5"/><path d="M12.8 9.5 C13 4 15 1.5 16 1 C17 1.5 19 4 19.2 9.5 Z" fill="var(--dscol,#E2621B)" stroke="rgba(0,0,0,.35)" stroke-width=".5"/><path d="M14.2 8.5 C14.4 5 15.2 3.4 16 2.7" stroke="#fff" stroke-width="1" fill="none" opacity=".7"/></g></svg>',
    ruler: '<svg viewBox="0 0 32 32" aria-hidden="true"><g transform="rotate(-32 16 16)"><rect x="1.5" y="10.5" width="29" height="11" rx="2" fill="url(#dsGlassG)" stroke="#2B8A27" stroke-width=".8"/>' +
      '<path d="M5 10.5v4M9 10.5v6M13 10.5v4M17 10.5v6M21 10.5v4M25 10.5v6" stroke="#1F6B1E" stroke-width=".9"/><rect x="2.5" y="11.3" width="27" height="4" rx="1.5" fill="#fff" opacity=".55"/></g></svg>',
    hand: '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="13.5" fill="url(#dsOrb)" stroke="#0E5EA3" stroke-width=".7"/>' + GLOSS(16, 10, 9, 5.5) +
      '<path d="M16 6l3 4h-2v4h4v-2l4 3-4 3v-2h-4v4h2l-3 4-3-4h2v-4h-4v2l-4-3 4-3v2h4v-4h-2z" fill="#fff" stroke="#0E5EA3" stroke-width=".5"/></svg>',
    undo: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M12 6 L3 13 L12 20 V15.5 C18 15 23 17 26 24 C26 15 21 9.5 12 10 Z" fill="url(#dsGreen)" stroke="#1F6B1E" stroke-width=".8" stroke-linejoin="round"/><path d="M11 8.5 L5.5 13 M13 11.5 C18 11.5 22 13.5 24 18" stroke="#fff" stroke-width="1.1" fill="none" opacity=".75"/></svg>',
    redo: '<svg viewBox="0 0 32 32" aria-hidden="true"><g transform="matrix(-1 0 0 1 32 0)"><path d="M12 6 L3 13 L12 20 V15.5 C18 15 23 17 26 24 C26 15 21 9.5 12 10 Z" fill="url(#dsGreen)" stroke="#1F6B1E" stroke-width=".8" stroke-linejoin="round"/><path d="M11 8.5 L5.5 13 M13 11.5 C18 11.5 22 13.5 24 18" stroke="#fff" stroke-width="1.1" fill="none" opacity=".75"/></g></svg>',
    zin: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M19.5 19.5 L28 28" stroke="#2D3A46" stroke-width="5" stroke-linecap="round"/><path d="M20.5 20.5 L27 27" stroke="#8C99A6" stroke-width="1.5" stroke-linecap="round"/><circle cx="13" cy="13" r="10" fill="url(#dsLens)" stroke="url(#dsSilver)" stroke-width="3"/>' + GLOSS(12, 9, 6, 3.5) + '<path d="M8.5 13h9M13 8.5v9" stroke="#0E5EA3" stroke-width="2.4" stroke-linecap="round"/></svg>',
    zout: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M19.5 19.5 L28 28" stroke="#2D3A46" stroke-width="5" stroke-linecap="round"/><path d="M20.5 20.5 L27 27" stroke="#8C99A6" stroke-width="1.5" stroke-linecap="round"/><circle cx="13" cy="13" r="10" fill="url(#dsLens)" stroke="url(#dsSilver)" stroke-width="3"/>' + GLOSS(12, 9, 6, 3.5) + '<path d="M8.5 13h9" stroke="#0E5EA3" stroke-width="2.4" stroke-linecap="round"/></svg>',
    home: '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="13.5" fill="url(#dsOrb)" stroke="#0E5EA3" stroke-width=".7"/><path d="M8 11 C11 8 14 9 15 12 C16 15 12 16 13 19 C14 22 10 23 7.5 20 C5.5 17 5.5 14 8 11Z M18 6.5 C22 6 26 9 27 13 C24 13 22 12 20 13 C18 11 17 9 18 6.5Z M19 18 C22 17 25 18 26 20 C24 24 21 26 18 26 C17 23 17 20 19 18Z" fill="url(#dsGreen)" opacity=".95"/>' + GLOSS(16, 9.5, 9.5, 5.5) + '</svg>',
    exp: '<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="3" y="3" width="26" height="26" rx="4" fill="url(#dsAqua)" stroke="#0E5EA3" stroke-width=".7"/>' + GLOSS(16, 9, 11, 5) +
      '<path d="M8 12V8h4M24 12V8h-4M8 20v4h4M24 20v4h-4" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="square"/><path d="M16 10.5v8M12.5 15.5l3.5 3.5 3.5-3.5" stroke="#1F6B1E" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 10.5v8M12.5 15.5l3.5 3.5 3.5-3.5" stroke="#9BE36F" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    help: '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="13.5" fill="url(#dsOrb)" stroke="#0E5EA3" stroke-width=".7"/>' + GLOSS(16, 10, 9, 5.5) + '<path d="M12.2 12.5 C12.2 9.8 14 8.3 16.2 8.3 C18.6 8.3 20.2 9.9 20.2 12 C20.2 15 16.6 15.2 16.6 18.5" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round"/><circle cx="16.6" cy="23" r="1.8" fill="#fff"/></svg>',
    close: '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="12" fill="url(#dsOrb)" stroke="#0E5EA3" stroke-width=".7"/>' + GLOSS(16, 11, 8, 4.5) + '<path d="M11.5 11.5l9 9M20.5 11.5l-9 9" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/></svg>'
  };

  // ---------- Register: Pinsel, Werkzeuge, später Stempel ----------
  // Ein Pinsel malt ein Wegstück a → b in einen Kontext in Weltkoordinaten. Neue Pinsel = neuer Eintrag.
  var BRUSHES = {
    round: { name: L2("Rundpinsel", "Round brush"), settings: ["size", "opacity", "smooth"],
      seg: function (x, a, b, w, col) { x.strokeStyle = col; x.lineWidth = w; x.lineCap = "round"; x.lineJoin = "round"; x.beginPath(); x.moveTo(a.x, a.y); x.lineTo(b.x, b.y); x.stroke(); } }
  };
  var STAMPS = {};   // Platz für Stempel: { id: { name, icon, place(ctx, p, size, col) } }
  var RANGES = { size: [1, 400, "px"], opacity: [1, 100, " %"], smooth: [0, 95, " %"] };

  // ---------- Dokument: Kacheln (bleiben erhalten, solange die Seite offen ist) ----------
  var DOC = new Map(), MIPS = new Map(), STROKE = new Map(), MIP = 50;
  var S = { tool: "brush", brush: "round", size: 12, opacity: 100, smooth: 35, r: 28, g: 110, b: 210, recent: [], view: null, last: null };
  var V = null, UNDO = [], REDO = [];
  function color() { return "rgb(" + S.r + "," + S.g + "," + S.b + ")"; }
  function hexCol() { return "#" + [S.r, S.g, S.b].map(function (v) { return (v < 16 ? "0" : "") + v.toString(16); }).join("").toUpperCase(); }
  function tileGet(map, k, create) { var c = map.get(k); if (!c && create) { c = canvas(T, T); map.set(k, c); } return c; }
  // Malt in alle Kacheln, die das Welt-Rechteck berühren. fn bekommt einen Kontext in Weltkoordinaten.
  function paintRect(map, x0, y0, x1, y1, fn) {
    var tx0 = Math.max(0, Math.floor(x0 / T)), tx1 = Math.min(NT - 1, Math.floor(x1 / T)), ty0 = Math.max(0, Math.floor(y0 / T)), ty1 = Math.min(NT - 1, Math.floor(y1 / T));
    for (var ty = ty0; ty <= ty1; ty++) for (var tx = tx0; tx <= tx1; tx++) {
      var c = tileGet(map, ty * NT + tx, true), x = c.getContext("2d");
      x.save(); x.translate(-tx * T, -ty * T); fn(x); x.restore();
    }
  }
  function updateMip(k) {
    var c = DOC.get(k);
    if (!c) { MIPS.delete(k); return; }
    var m = MIPS.get(k) || canvas(MIP, MIP), x = m.getContext("2d");
    x.clearRect(0, 0, MIP, MIP); x.imageSmoothingQuality = "high"; x.drawImage(c, 0, 0, MIP, MIP); MIPS.set(k, m);
  }
  function copyTile(c) { if (!c) return null; var d = canvas(T, T); d.getContext("2d").drawImage(c, 0, 0); return d; }
  function commitStroke() {
    if (!STROKE.size) return;
    var entries = [];
    STROKE.forEach(function (sc, k) {
      var d = DOC.get(k); entries.push({ k: k, before: copyTile(d) });
      if (!d) { d = canvas(T, T); DOC.set(k, d); }
      var x = d.getContext("2d"); x.globalAlpha = S.opacity / 100; x.drawImage(sc, 0, 0); x.globalAlpha = 1;
      updateMip(k);
    });
    STROKE.clear(); pushUndo(entries); V.miniDirty = true;
  }
  function undoCount() { return UNDO.reduce(function (s, e) { return s + e.length; }, 0); }
  function pushUndo(entries) { UNDO.push(entries); REDO = []; while (UNDO.length > 1 && (UNDO.length > 40 || undoCount() > 300)) UNDO.shift(); updateBtns(); }
  function swap(from, to) {
    var e = from.pop(); if (!e) return;
    to.push(e.map(function (it) { var cur = DOC.get(it.k); var b = it.before; if (b) DOC.set(it.k, b); else DOC.delete(it.k); updateMip(it.k); return { k: it.k, before: cur || null }; }));
    V.miniDirty = true; need(); updateBtns();
  }
  function undo() { if (V.down) return; swap(UNDO, REDO); }
  function redo() { if (V.down) return; swap(REDO, UNDO); }

  // ---------- Ansicht ----------
  function w2s(x, y) { return { x: (x - V.vx) * V.z, y: (y - V.vy) * V.z }; }
  function s2w(x, y) { return { x: V.vx + x / V.z, y: V.vy + y / V.z }; }
  function center(wx, wy, z) { if (z) V.z = clamp(z, ZMIN, ZMAX); V.vx = wx - V.w / 2 / V.z; V.vy = wy - V.h / 2 / V.z; clampView(); }
  function clampView() {   // Rand: höchstens eine halbe Bildschirmbreite über die Fläche hinaus
    var mx = V.w / 2 / V.z, my = V.h / 2 / V.z;
    V.vx = clamp(V.vx, -mx, WORLD - mx); V.vy = clamp(V.vy, -my, WORLD - my);
  }
  function zoomAt(sx, sy, f) {
    var p = s2w(sx, sy), nz = clamp(V.z * f, ZMIN, ZMAX);
    V.z = nz; V.vx = p.x - sx / nz; V.vy = p.y - sy / nz; clampView(); need(); updateZoom();
  }
  function need() { if (V) V.need = true; }

  function render() {
    var x = V.ctx, W = V.w, H = V.h, z = V.z;
    x.setTransform(V.dpr, 0, 0, V.dpr, 0, 0);
    x.fillStyle = "#BFCCD8"; x.fillRect(0, 0, W, H);
    var a = w2s(0, 0), b = w2s(WORLD, WORLD), ax = Math.max(0, a.x), ay = Math.max(0, a.y), bx = Math.min(W, b.x), by = Math.min(H, b.y);
    if (bx > ax && by > ay) { x.fillStyle = "#fff"; x.fillRect(ax, ay, bx - ax, by - ay); }
    var tx0 = Math.max(0, Math.floor(V.vx / T)), ty0 = Math.max(0, Math.floor(V.vy / T)), tx1 = Math.min(NT - 1, Math.floor((V.vx + W / z) / T)), ty1 = Math.min(NT - 1, Math.floor((V.vy + H / z) / T));
    var mip = T * z < 110;
    x.imageSmoothingEnabled = z < 2; x.imageSmoothingQuality = "high";
    function draw(map, k) {
      var c = map.get(k); if (!c) return;
      var tx = k % NT, ty = (k - tx) / NT, sx = Math.floor((tx * T - V.vx) * z), sy = Math.floor((ty * T - V.vy) * z), ex = Math.floor(((tx + 1) * T - V.vx) * z), ey = Math.floor(((ty + 1) * T - V.vy) * z);
      x.drawImage(c, sx, sy, ex - sx, ey - sy);
    }
    function each(map, fn) {
      var cells = (tx1 - tx0 + 1) * (ty1 - ty0 + 1);
      if (tx1 < tx0 || ty1 < ty0) return;
      if (cells <= map.size) { for (var ty = ty0; ty <= ty1; ty++) for (var tx = tx0; tx <= tx1; tx++) if (map.has(ty * NT + tx)) fn(ty * NT + tx); }
      else map.forEach(function (_, k) { var tx = k % NT, ty = (k - tx) / NT; if (tx >= tx0 && tx <= tx1 && ty >= ty0 && ty <= ty1) fn(k); });
    }
    each(DOC, function (k) { draw(mip ? MIPS : DOC, k); });
    if (STROKE.size) { x.globalAlpha = S.opacity / 100; each(STROKE, function (k) { draw(STROKE, k); }); x.globalAlpha = 1; }
    x.imageSmoothingEnabled = true;
    // Lineal-Anzeige
    if (V.rul) {
      var r = V.rul, s1 = w2s(r.a.x, r.a.y), s2 = w2s(r.b.x, r.b.y), len = Math.hypot(r.b.x - r.a.x, r.b.y - r.a.y), ang = Math.round((Math.atan2(-(r.b.y - r.a.y), r.b.x - r.a.x) * 180 / Math.PI + 360) % 360);
      x.setLineDash([6, 5]); x.strokeStyle = "rgba(14,94,163,.8)"; x.lineWidth = 1; x.beginPath(); x.moveTo(s1.x, s1.y); x.lineTo(s2.x, s2.y); x.stroke(); x.setLineDash([]);
      label(x, num(len) + " px · " + ang + "°", s2.x + 14, s2.y + 18);
    }
    if (V.crop) drawCrop(x);
    // Pinselzeiger
    if (V.hover && !V.crop && !V.panning && S.tool !== "hand" && !V.space) {
      var hs = w2s(V.hover.x, V.hover.y), rr = Math.max(1.5, S.size / 2 * z);
      x.lineWidth = 1; x.strokeStyle = "rgba(0,0,0,.55)"; x.beginPath(); x.arc(hs.x, hs.y, rr + 1, 0, Math.PI * 2); x.stroke();
      x.strokeStyle = "rgba(255,255,255,.95)"; x.beginPath(); x.arc(hs.x, hs.y, rr, 0, Math.PI * 2); x.stroke();
    }
    if (V.miniDirty || V.viewMoved) drawMini();
    V.viewMoved = false;
    var st = V.root.querySelector("#ds-pos"); if (st && V.hover) st.textContent = num(clamp(V.hover.x, 0, WORLD)) + " , " + num(clamp(V.hover.y, 0, WORLD));
  }
  function label(x, txt, lx, ly) {
    x.font = "600 12px " + getComputedStyle(document.body).fontFamily;
    var w = x.measureText(txt).width + 14;
    x.fillStyle = "rgba(255,255,255,.92)"; x.strokeStyle = "rgba(14,94,163,.6)"; x.lineWidth = 1;
    x.fillRect(lx, ly - 15, w, 22); x.strokeRect(lx + .5, ly - 14.5, w - 1, 21);
    x.fillStyle = "#12324F"; x.fillText(txt, lx + 7, ly);
  }

  // ---------- Minikarte ----------
  function drawMini() {
    var c = V.mini; if (!c) return;
    V.miniDirty = false;
    var x = c.getContext("2d"), S2 = c.width, f = S2 / WORLD, dpr = V.dpr;
    x.clearRect(0, 0, S2, S2); x.fillStyle = "rgba(255,255,255,.85)"; x.fillRect(0, 0, S2, S2);
    x.fillStyle = "#1373C4";
    DOC.forEach(function (_, k) { var tx = k % NT, ty = (k - tx) / NT; x.fillRect(Math.floor(tx * T * f), Math.floor(ty * T * f), Math.max(1.5 * dpr, T * f), Math.max(1.5 * dpr, T * f)); });
    var vx = V.vx * f, vy = V.vy * f, vw = V.w / V.z * f, vh = V.h / V.z * f;
    x.strokeStyle = "#E2621B"; x.lineWidth = 1.5 * dpr; x.strokeRect(vx, vy, Math.max(3 * dpr, vw), Math.max(3 * dpr, vh));
  }

  // ---------- Malen ----------
  function seg(a, b) {
    var w = Math.max(0.5, S.size * (V.pen ? 0.3 + 0.7 * b.p : 1)), r = w / 2 + 2, br = BRUSHES[S.brush], col = color();
    paintRect(STROKE, Math.min(a.x, b.x) - r, Math.min(a.y, b.y) - r, Math.max(a.x, b.x) + r, Math.max(a.y, b.y) + r, function (x) { br.seg(x, a, b, w, col); });
    need();
  }
  function smoothStep(raw) {
    var k = 1 - S.smooth / 100 * 0.94, s = V.sm, nx = { x: s.x + (raw.x - s.x) * k, y: s.y + (raw.y - s.y) * k, p: s.p + (raw.p - s.p) * k };
    seg(s, nx); V.sm = nx;
  }
  function snapAngle(a, b) {
    var dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy), an = Math.round(Math.atan2(dy, dx) / (Math.PI / 12)) * (Math.PI / 12);
    return { x: a.x + Math.cos(an) * L, y: a.y + Math.sin(an) * L, p: b.p };
  }
  function addRecent() { var h = hexCol(); S.recent = [h].concat(S.recent.filter(function (q) { return q !== h; })).slice(0, 10); }
  var TOOLS = {
    brush: { key: "b", icon: "brush",
      down: function (p, e) {
        if (e.shiftKey && S.last) { STROKE.clear(); seg(S.last, p); commitStroke(); S.last = p; addRecent(); return false; }
        V.sm = p; V.raw = p; seg(p, p); return true;
      },
      move: function (evs) { evs.forEach(function (p) { V.raw = p; smoothStep(p); }); },
      tick: function () { if (S.smooth > 0 && Math.hypot(V.raw.x - V.sm.x, V.raw.y - V.sm.y) > 0.3 / V.z) smoothStep(V.raw); },
      up: function () { for (var g = 0; g < 60 && Math.hypot(V.raw.x - V.sm.x, V.raw.y - V.sm.y) > 0.5 / V.z; g++) smoothStep(V.raw); commitStroke(); S.last = V.sm; addRecent(); }
    },
    ruler: { key: "l", icon: "ruler",
      down: function (p) { V.rul = { a: p, b: p }; STROKE.clear(); seg(p, p); return true; },
      move: function (evs, e) { var p = evs[evs.length - 1]; V.rul.b = e.shiftKey ? snapAngle(V.rul.a, p) : p; STROKE.clear(); seg(V.rul.a, V.rul.b); },
      up: function () { commitStroke(); S.last = V.rul.b; V.rul = null; addRecent(); }
    },
    hand: { key: "h", icon: "hand", pan: true }
  };

  // ---------- Export-Rahmen ----------
  function cropRect() { var c = V.crop; return { x: Math.round(Math.min(c.x0, c.x1)), y: Math.round(Math.min(c.y0, c.y1)), w: Math.round(Math.abs(c.x1 - c.x0)), h: Math.round(Math.abs(c.y1 - c.y0)) }; }
  function cropOK(r) { return r.w >= 1 && r.h >= 1 && r.w <= 16384 && r.h <= 16384 && r.w * r.h <= 120e6; }
  function drawCrop(x) {
    var c = V.crop; if (c.x0 == null) { label(x, t("cropHint"), 16, V.h - 60); return; }
    var r = cropRect(), a = w2s(r.x, r.y), b = w2s(r.x + r.w, r.y + r.h);
    x.fillStyle = "rgba(10,40,70,.35)";
    x.fillRect(0, 0, V.w, a.y); x.fillRect(0, b.y, V.w, V.h - b.y); x.fillRect(0, a.y, a.x, b.y - a.y); x.fillRect(b.x, a.y, V.w - b.x, b.y - a.y);
    x.strokeStyle = "#fff"; x.lineWidth = 2; x.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
    x.setLineDash([6, 6]); x.strokeStyle = "#1373C4"; x.lineWidth = 2; x.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y); x.setLineDash([]);
    hpts(a, b).forEach(function (h) { x.fillStyle = "#fff"; x.fillRect(h.x - 5, h.y - 5, 10, 10); x.strokeStyle = "#1373C4"; x.lineWidth = 1.5; x.strokeRect(h.x - 5, h.y - 5, 10, 10); });
    label(x, num(r.w) + " × " + num(r.h) + " px", Math.min(V.w - 160, Math.max(8, a.x)), Math.max(24, a.y - 12));
    var el = V.root.querySelector("#ds-cdim"); if (el) el.textContent = num(r.w) + " × " + num(r.h) + " px";
    var go = V.root.querySelector('[data-ds="cropGo"]'), warn = V.root.querySelector("#ds-cwarn"), ok = cropOK(r);
    if (go) go.disabled = !ok; if (warn) warn.hidden = ok || r.w < 1 || r.h < 1;
  }
  function hpts(a, b) {
    var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    return [{ id: "nw", x: a.x, y: a.y }, { id: "n", x: mx, y: a.y }, { id: "ne", x: b.x, y: a.y }, { id: "e", x: b.x, y: my }, { id: "se", x: b.x, y: b.y }, { id: "s", x: mx, y: b.y }, { id: "sw", x: a.x, y: b.y }, { id: "w", x: a.x, y: my }];
  }
  function cropHit(sx, sy) {
    var c = V.crop; if (!c || c.x0 == null) return null;
    var r = cropRect(), a = w2s(r.x, r.y), b = w2s(r.x + r.w, r.y + r.h), hs = hpts(a, b);
    for (var i = 0; i < hs.length; i++) if (Math.abs(sx - hs[i].x) <= 9 && Math.abs(sy - hs[i].y) <= 9) return hs[i].id;
    if (sx > a.x && sx < b.x && sy > a.y && sy < b.y) return "move";
    return null;
  }
  function startCrop() { if (V.down) return; V.crop = { x0: null }; V.root.querySelector("#ds-crop").hidden = false; V.root.querySelector("#ds-cdim").textContent = "–"; need(); }
  function endCrop() { V.crop = null; V.cdrag = null; V.root.querySelector("#ds-crop").hidden = true; need(); }
  function contentBox() {   // genaue Grenzen alles Gemalten (Randkacheln werden pixelgenau geprüft)
    if (!DOC.size) return null;
    var x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    DOC.forEach(function (c, k) {
      var tx = k % NT, ty = (k - tx) / NT, d = c.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, T, T).data, bx0 = T, by0 = T, bx1 = -1, by1 = -1;
      for (var y = 0; y < T; y++) for (var x = 0; x < T; x++) if (d[(y * T + x) * 4 + 3]) { if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y; }
      if (bx1 < 0) return;
      x0 = Math.min(x0, tx * T + bx0); y0 = Math.min(y0, ty * T + by0); x1 = Math.max(x1, tx * T + bx1 + 1); y1 = Math.max(y1, ty * T + by1 + 1);
    });
    return x1 < 0 ? null : { x0: x0, y0: y0, x1: x1, y1: y1 };
  }
  async function exportCrop() {
    var r = cropRect(); if (!cropOK(r)) return;
    note(t("saving")); await new Promise(function (res) { setTimeout(res, 30); });
    var c = canvas(r.w, r.h), x = c.getContext("2d");
    x.fillStyle = "#fff"; x.fillRect(0, 0, r.w, r.h);
    var tx0 = Math.max(0, Math.floor(r.x / T)), tx1 = Math.min(NT - 1, Math.floor((r.x + r.w - 1) / T)), ty0 = Math.max(0, Math.floor(r.y / T)), ty1 = Math.min(NT - 1, Math.floor((r.y + r.h - 1) / T));
    for (var ty = ty0; ty <= ty1; ty++) for (var tx = tx0; tx <= tx1; tx++) { var tc = DOC.get(ty * NT + tx); if (tc) x.drawImage(tc, tx * T - r.x, ty * T - r.y); }
    var name = "drawspace-" + r.w + "x" + r.h + ".jpg";
    c.toBlob(function (b) {
      if (!b) return;
      var u = URL.createObjectURL(b), a = document.createElement("a"); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(u); }, 10000);
      note(fmt(t("saved"), { f: name }));
    }, "image/jpeg", 0.92);
    endCrop();
  }

  // ---------- Eingabe ----------
  var PTR = new Map();
  function sxy(e) { var r = V.cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  function wp(e) { var s = sxy(e), w = s2w(s.x, s.y); return { x: w.x, y: w.y, p: e.pointerType === "pen" ? (e.pressure || 0.5) : 0.5 }; }
  function onDown(e) {
    if (e.target !== V.cv) return;
    e.preventDefault();
    try { V.cv.setPointerCapture(e.pointerId); } catch (er) {}
    PTR.set(e.pointerId, sxy(e));
    if (PTR.size === 2) {   // zwei Finger: zoomen und verschieben
      if (V.down) { STROKE.clear(); V.down = false; V.rul = null; }
      var pts = Array.from(PTR.values()); V.pinch = { d: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y), c: { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 } }; V.panning = null; return;
    }
    if (PTR.size > 2) return;
    var s = sxy(e);
    if (V.crop) {
      var h = cropHit(s.x, s.y), w = s2w(s.x, s.y);
      if (!h) { V.crop.x0 = V.crop.x1 = clamp(w.x, 0, WORLD); V.crop.y0 = V.crop.y1 = clamp(w.y, 0, WORLD); h = "se"; }
      else { var r = cropRect(); V.crop.x0 = r.x; V.crop.y0 = r.y; V.crop.x1 = r.x + r.w; V.crop.y1 = r.y + r.h; }
      V.cdrag = { h: h, sx: w.x, sy: w.y, c: Object.assign({}, V.crop) }; need(); return;
    }
    if (e.button === 1 || e.button === 2 || V.space || TOOLS[S.tool].pan) { V.panning = { sx: s.x, sy: s.y, vx: V.vx, vy: V.vy }; V.cv.style.cursor = "grabbing"; return; }
    if (e.button !== 0) return;
    V.pen = e.pointerType === "pen";
    var p = wp(e);
    if (TOOLS[S.tool].down(p, e)) { V.down = true; V.pid = e.pointerId; }
    V.hover = p; need();
  }
  function onMove(e) {
    if (!V) return;
    if (PTR.has(e.pointerId)) PTR.set(e.pointerId, sxy(e));
    if (V.pinch && PTR.size === 2) {
      var pts = Array.from(PTR.values()), d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y), c = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      V.vx -= (c.x - V.pinch.c.x) / V.z; V.vy -= (c.y - V.pinch.c.y) / V.z;
      if (V.pinch.d > 0) zoomAt(c.x, c.y, d / V.pinch.d);
      V.pinch = { d: d, c: c }; clampView(); V.viewMoved = true; need(); return;
    }
    if (V.panning) { var s = sxy(e); V.vx = V.panning.vx - (s.x - V.panning.sx) / V.z; V.vy = V.panning.vy - (s.y - V.panning.sy) / V.z; clampView(); V.viewMoved = true; need(); return; }
    if (V.cdrag) {
      var s2 = sxy(e), w = s2w(s2.x, s2.y), dg = V.cdrag, c0 = dg.c, cr = V.crop, dx = w.x - dg.sx, dy = w.y - dg.sy;
      if (dg.h === "move") { var ww = c0.x1 - c0.x0, hh = c0.y1 - c0.y0; cr.x0 = clamp(c0.x0 + dx, 0, WORLD - ww); cr.y0 = clamp(c0.y0 + dy, 0, WORLD - hh); cr.x1 = cr.x0 + ww; cr.y1 = cr.y0 + hh; }
      else {
        if (dg.h.indexOf("w") >= 0) cr.x0 = clamp(c0.x0 + dx, 0, WORLD); if (dg.h.indexOf("e") >= 0) cr.x1 = clamp(c0.x1 + dx, 0, WORLD);
        if (dg.h.indexOf("n") >= 0) cr.y0 = clamp(c0.y0 + dy, 0, WORLD); if (dg.h.indexOf("s") >= 0) cr.y1 = clamp(c0.y1 + dy, 0, WORLD);
      }
      need(); return;
    }
    if (V.down && e.pointerId === V.pid) {
      var evs = (e.getCoalescedEvents ? e.getCoalescedEvents() : [e]); if (!evs.length) evs = [e];
      TOOLS[S.tool].move(evs.map(wp), e); V.hover = wp(e); return;
    }
    if (e.target === V.cv) {
      V.hover = wp(e); need();
      if (V.crop) { var hh2 = cropHit(sxy(e).x, sxy(e).y); V.cv.style.cursor = hh2 === "move" ? "move" : hh2 ? (/^(n|s)$/.test(hh2) ? "ns-resize" : /^(e|w)$/.test(hh2) ? "ew-resize" : /^(nw|se)$/.test(hh2) ? "nwse-resize" : "nesw-resize") : "crosshair"; }
    }
  }
  function onUp(e) {
    if (!V) return;
    PTR.delete(e.pointerId);
    if (V.pinch) { if (PTR.size < 2) V.pinch = null; return; }
    if (V.panning) { V.panning = null; setCursor(); return; }
    if (V.cdrag) { V.cdrag = null; var r = cropRect(); var c = V.crop; c.x0 = r.x; c.y0 = r.y; c.x1 = r.x + r.w; c.y1 = r.y + r.h; need(); return; }
    if (V.down && e.pointerId === V.pid) { V.down = false; TOOLS[S.tool].up(); updatePanel(true); need(); }
  }
  function onWheel(e) {
    if (e.target !== V.cv) return;
    e.preventDefault();
    var s = sxy(e), dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    zoomAt(s.x, s.y, Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0015)));
    V.viewMoved = true;
  }
  function onKey(e) {
    if (!V) return;
    var tg = e.target, tag = tg && tg.tagName;
    if (tag === "INPUT" && tg.type === "text" || tag === "TEXTAREA") return;
    if (e.key === " " ) { if (!V.space) { V.space = true; setCursor(); } e.preventDefault(); return; }
    if (e.ctrlKey || e.metaKey) {
      var k0 = e.key.toLowerCase();
      if (k0 === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      else if (k0 === "y") { e.preventDefault(); redo(); }
      return;
    }
    var k = e.key.toLowerCase();
    if (k === "escape") { if (V.crop) endCrop(); else if (!V.root.querySelector("#ds-help").hidden) V.root.querySelector("#ds-help").hidden = true; return; }
    if (k === "enter" && V.crop) { exportCrop(); return; }
    if (V.crop) return;
    for (var id in TOOLS) if (TOOLS[id].key === k) { setTool(id); return; }
    if (k === "[" || k === "]") { S.size = clamp(S.size + (k === "]" ? 1 : -1) * Math.max(1, Math.round(S.size * 0.12)), 1, 400); var ss = V.root.querySelector("#ds-s-size"); if (ss) { ss.value = S.size; V.root.querySelector("#ds-v-size").textContent = S.size + "px"; } need(); return; }
    if (k === "0") { center(WORLD / 2, WORLD / 2, 1); V.viewMoved = true; need(); updateZoom(); return; }
    if (k === "+" || k === "=") { zoomAt(V.w / 2, V.h / 2, 1.25); return; }
    if (k === "-") { zoomAt(V.w / 2, V.h / 2, 0.8); return; }
  }
  function onKeyUp(e) { if (V && e.key === " ") { V.space = false; setCursor(); } }
  function onBlur() { if (V) { V.space = false; setCursor(); } }
  function setCursor() { if (!V || !V.cv) return; V.cv.style.cursor = V.crop ? "crosshair" : (V.space || S.tool === "hand") ? "grab" : "none"; need(); }
  function setTool(id) { if (!TOOLS[id] || V.down) return; S.tool = id; Array.prototype.forEach.call(V.root.querySelectorAll("[data-tool]"), function (b) { b.setAttribute("aria-pressed", String(b.dataset.tool === id)); }); updatePanel(); setCursor(); }
  function onMiniDown(e) {
    var r = V.mini.getBoundingClientRect(), go = function (ev) { var fx = (ev.clientX - r.left) / r.width, fy = (ev.clientY - r.top) / r.height; center(clamp(fx, 0, 1) * WORLD, clamp(fy, 0, 1) * WORLD); V.viewMoved = true; need(); };
    go(e); V.miniDrag = go; e.preventDefault();
  }
  function onMiniMove(e) { if (V && V.miniDrag && e.buttons) V.miniDrag(e); }
  function onMiniUp() { if (V) V.miniDrag = null; }
  function onClick(e) {
    var b = e.target.closest("[data-ds],[data-tool],[data-col]"); if (!b) return;
    if (b.dataset.tool) { setTool(b.dataset.tool); return; }
    if (b.dataset.col) { var h = b.dataset.col; S.r = parseInt(h.substr(1, 2), 16); S.g = parseInt(h.substr(3, 2), 16); S.b = parseInt(h.substr(5, 2), 16); updateColorUI(); return; }
    var a = b.dataset.ds;
    if (a === "undo") undo(); else if (a === "redo") redo();
    else if (a === "zin") zoomAt(V.w / 2, V.h / 2, 1.4); else if (a === "zout") zoomAt(V.w / 2, V.h / 2, 1 / 1.4);
    else if (a === "home") { center(WORLD / 2, WORLD / 2, 1); V.viewMoved = true; need(); updateZoom(); }
    else if (a === "exp") { if (V.crop) endCrop(); else startCrop(); }
    else if (a === "help") { var hp = V.root.querySelector("#ds-help"); hp.hidden = !hp.hidden; }
    else if (a === "helpX") V.root.querySelector("#ds-help").hidden = true;
    else if (a === "cropGo") exportCrop();
    else if (a === "cropNo") endCrop();
    else if (a === "cropFit") {
      var bx = contentBox(); if (!bx) { note(t("cropEmpty")); return; }
      var m = 20; V.crop = { x0: Math.max(0, bx.x0 - m), y0: Math.max(0, bx.y0 - m), x1: Math.min(WORLD, bx.x1 + m), y1: Math.min(WORLD, bx.y1 + m) };
      var zf = Math.min(V.w / (V.crop.x1 - V.crop.x0), V.h / (V.crop.y1 - V.crop.y0)) * 0.8;
      center((V.crop.x0 + V.crop.x1) / 2, (V.crop.y0 + V.crop.y1) / 2, zf); V.viewMoved = true; updateZoom(); need();
    }
  }
  function onInput(e) {
    var el = e.target;
    if (el.dataset.set) { S[el.dataset.set] = +el.value; var r = RANGES[el.dataset.set]; V.root.querySelector("#ds-v-" + el.dataset.set).textContent = el.value + r[2]; need(); return; }
    if (el.dataset.rgb) { S[el.dataset.rgb] = +el.value; updateColorUI(); return; }
    if (el.id === "ds-hex") { var m = /^#?([0-9a-f]{6})$/i.exec(el.value.trim()); if (m) { S.r = parseInt(m[1].substr(0, 2), 16); S.g = parseInt(m[1].substr(2, 2), 16); S.b = parseInt(m[1].substr(4, 2), 16); updateColorUI(true); } }
  }

  // ---------- Oberfläche ----------
  function note(s) { var n = V && V.root.querySelector("#ds-note"); if (!n) return; n.textContent = s; n.hidden = !s; clearTimeout(V.noteT); V.noteT = setTimeout(function () { if (V) n.hidden = true; }, 4000); }
  function updateBtns() { if (!V) return; var u = V.root.querySelector('[data-ds="undo"]'), r = V.root.querySelector('[data-ds="redo"]'); if (u) u.disabled = !UNDO.length; if (r) r.disabled = !REDO.length; }
  function updateZoom() { var z = V && V.root.querySelector("#ds-zoom"); if (z) z.textContent = (V.z >= 0.1 ? Math.round(V.z * 100) : (V.z * 100).toFixed(1).replace(".", lang === "de" ? "," : ".")) + " %"; }
  function sl(k, lab) { var r = RANGES[k]; return '<div class="ds-row"><label for="ds-s-' + k + '">' + lab + '<span id="ds-v-' + k + '">' + S[k] + r[2] + '</span></label><input type="range" id="ds-s-' + k + '" data-set="' + k + '" min="' + r[0] + '" max="' + r[1] + '" step="1" value="' + S[k] + '"></div>'; }
  function rgbRow(k, lab) {
    var o = { r: S.r, g: S.g, b: S.b }, lo = Object.assign({}, o), hi = Object.assign({}, o); lo[k] = 0; hi[k] = 255;
    return '<div class="ds-row ds-rgb"><label for="ds-c-' + k + '">' + lab + '<span id="ds-cv-' + k + '">' + S[k] + '</span></label><input type="range" id="ds-c-' + k + '" data-rgb="' + k + '" min="0" max="255" step="1" value="' + S[k] + '" style="--lo:rgb(' + lo.r + "," + lo.g + "," + lo.b + ");--hi:rgb(" + hi.r + "," + hi.g + "," + hi.b + ')"></div>';
  }
  function updatePanel(recentOnly, fromHex) {
    if (!V) return;
    V.root.style.setProperty("--dscol", color());
    var p = V.root.querySelector("#ds-panel");
    if (recentOnly) { var rc = p.querySelector("#ds-rec"); if (rc) rc.innerHTML = recentHTML(); return; }
    var act = document.activeElement, actId = act && act.id, tool = S.tool;
    if (tool === "hand") { p.hidden = true; return; }
    p.hidden = false;
    var swatch = '<div class="ds-col"><span class="ds-orb" style="background:' + color() + '"></span><input type="text" id="ds-hex" value="' + hexCol() + '" maxlength="7" spellcheck="false" aria-label="' + t("colour") + ' Hex"></div>';
    p.innerHTML = '<h3>' + ICONS[TOOLS[tool].icon] + t(tool) + "</h3>" + BRUSHES[S.brush].settings.map(function (k) { return sl(k, t(k)); }).join("") +
      '<p class="ds-desc">' + t(tool === "ruler" ? "rulerNote" : "smoothNote") + "</p>" +
      '<h3 class="ds-h2">' + t("colour") + "</h3>" + swatch + rgbRow("r", "R") + rgbRow("g", "G") + rgbRow("b", "B") +
      '<div id="ds-rec">' + recentHTML() + "</div>" + (tool === "brush" ? '<p class="ds-desc">' + t("brushNote") + "</p>" : "");
    if (actId && actId !== "ds-hex") { var na = p.querySelector("#" + actId); if (na) na.focus(); }
    if (fromHex) { var hx = p.querySelector("#ds-hex"); if (hx) { hx.focus(); hx.setSelectionRange(hx.value.length, hx.value.length); } }
  }
  // Farbe ändern, ohne das Panel neu zu bauen (sonst bricht das Ziehen am Regler ab)
  function updateColorUI(fromHex) {
    V.root.style.setProperty("--dscol", color());
    var p = V.root.querySelector("#ds-panel"), o = p.querySelector(".ds-orb"); if (o) o.style.background = color();
    var hx = p.querySelector("#ds-hex"); if (hx && !fromHex) hx.value = hexCol();
    ["r", "g", "b"].forEach(function (k) {
      var inp = p.querySelector("#ds-c-" + k); if (!inp) return;
      var lo = { r: S.r, g: S.g, b: S.b }, hi = { r: S.r, g: S.g, b: S.b }; lo[k] = 0; hi[k] = 255;
      inp.value = S[k]; inp.style.setProperty("--lo", "rgb(" + lo.r + "," + lo.g + "," + lo.b + ")"); inp.style.setProperty("--hi", "rgb(" + hi.r + "," + hi.g + "," + hi.b + ")");
      p.querySelector("#ds-cv-" + k).textContent = S[k];
    });
    need();
  }
  function recentHTML() { return S.recent.length ? '<div class="ds-desc">' + t("recent") + '</div><div class="ds-rec">' + S.recent.map(function (c) { return '<button type="button" data-col="' + c + '" style="background:' + c + '" title="' + c + '" aria-label="' + c + '"></button>'; }).join("") + "</div>" : ""; }
  function btn(id, act) { return '<button type="button" class="ds-ib" data-ds="' + act + '" title="' + t(id) + '" aria-label="' + t(id) + '">' + ICONS[id] + "</button>"; }
  function html() {
    return DEFS + '<div class="ds" id="ds-root"><canvas class="ds-cv" id="ds-cv"></canvas>' +
      '<header class="ds-top ds-glass"><a class="ds-back" href="#">← ' + t("back") + '</a><b class="ds-title">' + t("title") + '</b><span class="ds-ver">v' + VERSION + "</span>" +
      '<span class="ds-sep"></span><div class="ds-tools">' + Object.keys(TOOLS).map(function (id) { return '<button type="button" class="ds-ib" data-tool="' + id + '" aria-pressed="' + (S.tool === id) + '" title="' + t(id) + " (" + TOOLS[id].key.toUpperCase() + ')" aria-label="' + t(id) + '">' + ICONS[TOOLS[id].icon] + "</button>"; }).join("") + "</div>" +
      '<span class="ds-sep"></span>' + btn("undo", "undo") + btn("redo", "redo") +
      '<span class="ds-grow"></span>' + btn("zout", "zout") + '<span class="ds-zoom" id="ds-zoom"></span>' + btn("zin", "zin") + btn("home", "home") +
      '<span class="ds-sep"></span>' + btn("exp", "exp") + btn("help", "help") + "</header>" +
      '<aside class="ds-panel ds-glass" id="ds-panel"></aside>' +
      '<div class="ds-bl"><canvas class="ds-mini ds-glass" id="ds-mini" title="100.000 × 100.000"></canvas><span class="ds-pos ds-glass" id="ds-pos">–</span></div>' +
      '<div class="ds-crop ds-glass" id="ds-crop" hidden><b>' + t("cropH") + '</b><span class="ds-cdim" id="ds-cdim">–</span><span class="ds-desc">' + t("cropHint") + '</span><span class="ds-cwarn" id="ds-cwarn" hidden>' + t("cropMax") + "</span>" +
        '<div class="ds-cb"><button type="button" class="ds-btn" data-ds="cropFit">' + t("cropFit") + '</button><button type="button" class="ds-btn ds-pri" data-ds="cropGo" disabled>' + t("cropGo") + '</button><button type="button" class="ds-btn" data-ds="cropNo">' + t("cancel") + " (Esc)</button></div></div>" +
      '<div class="ds-help ds-glass" id="ds-help" hidden><button type="button" class="ds-ib ds-x" data-ds="helpX" aria-label="×">' + ICONS.close + "</button><b>" + t("title") + "</b><p>" + t("helpTxt") + "</p></div>" +
      '<div class="ds-note ds-glass" id="ds-note" hidden></div></div>';
  }
  var CSS = ".ds{color-scheme:light;position:fixed;inset:0;z-index:75;background:#BFCCD8;overflow:hidden;font-family:var(--f-body);color:#12324F;--dsink:#12324F}" +
    ".ds *{font-style:normal}" +
    ".ds-cv{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;cursor:none}" +
    ".ds-glass{background:linear-gradient(180deg,rgba(255,255,255,.86),rgba(214,238,255,.7));border:1px solid rgba(255,255,255,.95);box-shadow:0 6px 22px rgba(16,58,104,.25),inset 0 1px 0 #fff;-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}" +
    ".ds-top{position:absolute;left:0;right:0;top:0;display:flex;align-items:center;gap:6px;padding:6px max(12px,env(safe-area-inset-right,0px)) 6px max(12px,env(safe-area-inset-left,0px));border-width:0 0 1px;flex-wrap:wrap}" +
    ".ds-back{font:600 .9rem var(--f-body);color:#0E5EA3;text-decoration:none;padding:6px 8px}.ds-back:hover{text-decoration:underline}" +
    ".ds-title{font:600 1.05rem var(--f-display);margin-left:4px}.ds-ver{font:600 .72rem var(--f-body);color:#3D6688;border:1px solid rgba(14,94,163,.35);padding:1px 7px}" +
    ".ds-sep{width:1px;height:28px;background:rgba(14,94,163,.25);margin:0 6px}.ds-grow{flex:1}" +
    ".ds-tools{display:flex;gap:4px}" +
    ".ds-ib{width:40px;height:40px;display:grid;place-items:center;padding:4px;border:1px solid transparent;background:transparent;cursor:pointer;transition:background .12s,border-color .12s,transform .08s}" +
    ".ds-ib svg{width:30px;height:30px;display:block;filter:drop-shadow(0 1px 1.5px rgba(10,50,90,.35))}" +
    ".ds-ib:hover{background:radial-gradient(circle at 50% 40%,rgba(255,255,255,.95),rgba(140,214,250,.45));border-color:rgba(255,255,255,.95)}" +
    ".ds-ib:active{transform:translateY(1px)}.ds-ib[disabled]{opacity:.35;cursor:default;background:transparent}" +
    ".ds-ib[aria-pressed=true]{background:radial-gradient(circle at 50% 35%,#fff,rgba(98,203,243,.75));border-color:#62CBF3;box-shadow:0 0 0 2px rgba(98,203,243,.45),inset 0 1px 0 #fff}" +
    ".ds-zoom{min-width:56px;text-align:center;font:600 .85rem var(--f-body);font-variant-numeric:tabular-nums}" +
    ".ds-panel{position:absolute;left:max(12px,env(safe-area-inset-left,0px));top:70px;width:250px;max-height:calc(100% - 300px);overflow-y:auto;padding:12px 14px;display:flex;flex-direction:column;gap:10px;scrollbar-width:thin}" +
    ".ds-panel[hidden]{display:none}" +
    ".ds-panel h3{display:flex;align-items:center;gap:8px;margin:0;font:600 .95rem var(--f-display)}.ds-panel h3 svg{width:26px;height:26px}.ds-h2{margin-top:4px!important}" +
    ".ds-row{display:flex;flex-direction:column;gap:4px}.ds-row label{display:flex;justify-content:space-between;font:600 .84rem var(--f-body)}.ds-row label span{color:#3D6688;font-weight:500;font-variant-numeric:tabular-nums}" +
    ".ds-row input{width:100%;accent-color:#1C8FD6;margin:0}" +
    ".ds-rgb input{-webkit-appearance:none;appearance:none;height:12px;background:linear-gradient(90deg,var(--lo),var(--hi));border:1px solid rgba(14,94,163,.35)}" +
    ".ds-rgb input::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#fff,#8EDCFA 45%,#1572C2);border:1px solid #0E5EA3;cursor:pointer}" +
    ".ds-rgb input::-moz-range-thumb{width:16px;height:16px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#fff,#8EDCFA 45%,#1572C2);border:1px solid #0E5EA3;cursor:pointer}" +
    ".ds-col{display:flex;align-items:center;gap:10px}.ds-orb{width:40px;height:40px;border-radius:50%;flex:none;border:1px solid rgba(10,50,90,.5);box-shadow:inset 0 -6px 10px rgba(0,0,0,.25),inset 0 6px 8px rgba(255,255,255,.6),0 2px 5px rgba(10,50,90,.3)}" +
    ".ds-col input{width:100%;font:600 .9rem ui-monospace,SFMono-Regular,Menlo,monospace;padding:7px 8px;border:1px solid rgba(14,94,163,.4);background:rgba(255,255,255,.85);color:#12324F}" +
    ".ds-desc{margin:0;color:#3D6688;font-size:.8rem;line-height:1.4}" +
    ".ds-rec{display:flex;flex-wrap:wrap;gap:5px;margin-top:4px}.ds-rec button{width:22px;height:22px;border-radius:50%;border:1px solid rgba(10,50,90,.45);cursor:pointer;padding:0;box-shadow:inset 0 3px 4px rgba(255,255,255,.55)}" +
    ".ds-bl{position:absolute;left:max(12px,env(safe-area-inset-left,0px));bottom:max(12px,env(safe-area-inset-bottom,0px));display:flex;flex-direction:column;gap:6px;align-items:flex-start}" +
    ".ds-mini{width:150px;height:150px;cursor:pointer;touch-action:none}" +
    ".ds-pos{font:600 .78rem var(--f-body);font-variant-numeric:tabular-nums;padding:3px 8px}" +
    ".ds-crop{position:absolute;left:50%;transform:translateX(-50%);top:66px;display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px 16px;max-width:calc(100% - 24px);text-align:center}" +
    ".ds-crop[hidden],.ds-help[hidden],.ds-note[hidden]{display:none}" +
    ".ds-cdim{font:600 1.3rem var(--f-display);font-variant-numeric:tabular-nums;color:#0E5EA3}.ds-cwarn{color:#B03A20;font-size:.84rem;font-weight:600}" +
    ".ds-cb{display:flex;flex-wrap:wrap;gap:6px;justify-content:center}" +
    ".ds-btn{font:600 .88rem var(--f-body);padding:8px 14px;border:1px solid rgba(14,94,163,.45);background:linear-gradient(180deg,#fff,#DDEFFC);color:#12324F;cursor:pointer;box-shadow:inset 0 1px 0 #fff}" +
    ".ds-btn:hover{border-color:#1C8FD6}.ds-btn[disabled]{opacity:.45;cursor:default}" +
    ".ds-pri{background:linear-gradient(180deg,#E9FAFF 0%,#62CBF3 48%,#1C8FD6 52%,#1373C4 100%);color:#fff;border-color:#0E5EA3;text-shadow:0 1px 1px rgba(0,40,80,.5)}" +
    ".ds-help{position:absolute;right:max(12px,env(safe-area-inset-right,0px));top:66px;width:min(360px,calc(100% - 24px));padding:12px 16px;font-size:.88rem;line-height:1.5}.ds-help p{margin:6px 0 0}.ds-x{position:absolute;right:6px;top:6px;width:32px;height:32px}.ds-x svg{width:24px;height:24px}" +
    ".ds-note{position:absolute;left:50%;transform:translateX(-50%);bottom:max(16px,env(safe-area-inset-bottom,0px));padding:8px 14px;font:600 .88rem var(--f-body)}" +
    "@media (max-width:760px){.ds-bl{bottom:70px}.ds-panel{top:auto;bottom:250px;width:min(250px,calc(100% - 24px));max-height:40%}.ds-title,.ds-ver{display:none}.ds-sep{margin:0 2px}.ds-ib{width:36px;height:36px}.ds-ib svg{width:26px;height:26px}.ds-mini{width:110px;height:110px}}";

  function layout() {
    if (!V) return;
    var r = V.root.querySelector("#ds-root").getBoundingClientRect(), dpr = window.devicePixelRatio || 1, cx = V.w ? V.vx + V.w / 2 / V.z : WORLD / 2, cy = V.h ? V.vy + V.h / 2 / V.z : WORLD / 2;
    V.w = r.width; V.h = r.height; V.dpr = dpr;
    V.cv.width = Math.round(V.w * dpr); V.cv.height = Math.round(V.h * dpr);
    var ms = V.mini.getBoundingClientRect(); V.mini.width = Math.round(ms.width * dpr); V.mini.height = Math.round(ms.height * dpr);
    center(cx, cy); V.miniDirty = true; need();
  }
  var raf = 0;
  function loop() {
    raf = requestAnimationFrame(loop);
    if (!V) return;
    if (V.down && TOOLS[S.tool].tick) TOOLS[S.tool].tick();
    if (V.need) { V.need = false; render(); }
  }
  function injectCSS() { var o = document.getElementById("ds-css"); if (o) o.remove(); var s = document.createElement("style"); s.id = "ds-css"; s.textContent = CSS; document.head.appendChild(s); }
  function mount(el, l) {
    unmount();
    lang = l === "en" ? "en" : "de";
    injectCSS();
    el.innerHTML = html();
    V = { root: el, need: true, ov: document.body.style.overflow };
    V.cv = el.querySelector("#ds-cv"); V.ctx = V.cv.getContext("2d"); V.mini = el.querySelector("#ds-mini");
    document.body.style.overflow = "hidden";
    var v0 = S.view || { x: WORLD / 2, y: WORLD / 2, z: 1 };
    V.z = v0.z; V.w = 0; V.h = 0; layout(); center(v0.x, v0.y, v0.z);
    V.cv.addEventListener("pointerdown", onDown); window.addEventListener("pointermove", onMove); window.addEventListener("pointerup", onUp); window.addEventListener("pointercancel", onUp);
    V.cv.addEventListener("wheel", onWheel, { passive: false }); V.cv.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    V.cv.addEventListener("pointerleave", function () { if (V && !V.down) { V.hover = null; need(); } });
    V.mini.addEventListener("pointerdown", onMiniDown); window.addEventListener("pointermove", onMiniMove); window.addEventListener("pointerup", onMiniUp);
    el.addEventListener("click", onClick); el.addEventListener("input", onInput);
    window.addEventListener("keydown", onKey); window.addEventListener("keyup", onKeyUp); window.addEventListener("blur", onBlur); window.addEventListener("resize", layout);
    updatePanel(); updateBtns(); updateZoom(); setCursor();
    raf = requestAnimationFrame(loop);
  }
  function unmount() {
    if (raf) cancelAnimationFrame(raf); raf = 0;
    if (!V) return;
    if (V.down) { V.down = false; commitStroke(); }
    S.view = { x: V.vx + V.w / 2 / V.z, y: V.vy + V.h / 2 / V.z, z: V.z };
    window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); window.removeEventListener("pointercancel", onUp);
    window.removeEventListener("pointermove", onMiniMove); window.removeEventListener("pointerup", onMiniUp);
    window.removeEventListener("keydown", onKey); window.removeEventListener("keyup", onKeyUp); window.removeEventListener("blur", onBlur); window.removeEventListener("resize", layout);
    document.body.style.overflow = V.ov || "";
    PTR.clear(); V = null;
  }
  window.DrawSpace = { mount: mount, unmount: unmount, BRUSHES: BRUSHES, TOOLS: TOOLS, STAMPS: STAMPS,
    _debug: function () { return { DOC: DOC, V: V, S: S, UNDO: UNDO, exportCrop: exportCrop, contentBox: contentBox }; } };
})();
