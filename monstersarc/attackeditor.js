/* Monsters Arc – attackeditor.js (seit v0.27)
   Attacken-Editor im Dev-Kit (Reiter „Attacken“). Grundgerüst ist die Kampfszene mit zwei Test-Monstern
   (Angreifer von hinten unten links, Ziel von vorne oben rechts, aus der Monsterliste oder Test-Monster).
   - Daten: Name, Element, Nah-/Fernkampf, Stärke, AP (wie oft einsetzbar), Genauigkeit, Dauer 1–4 s.
   - Animation: Zeitleiste (20 Bilder/s), Abspielen in 1×, ½× und ¼×, Bild für Bild weiterschalten.
     Spuren für Angreifer, Ziel und für Start-/Zielpunkt jeder Effekt-Ebene. Keyframes entstehen durch Ziehen mit der Maus
     im aktuellen Bild (Shift + Ziehen dreht, Mausrad skaliert) oder als Live-Aufnahme: Abspielen (auch langsam) und mit
     gedrückter Maustaste die Bewegung vormachen. Interpolation weich, linear oder Bild-für-Bild.
   - Effekt-Ebenen (attackfx.js): Strahl, mehrere Bälle, Kugel, Wirbel, Fontäne, Regen, Explosion, Blitzlicht, Wackeln –
     jeweils mit Element-Muster (Feuer, Wasser, Blatt, Stein, Blitz, Eis, …), Farben und Physik-Werten.
   - Zeichnen: Bild für Bild mit Pinsel, Zwiebelhaut und „Halten“.
   - Export: Animation in der gewählten Pixelgröße backen (Sprite-Sheet PNG + Infos). Attackenliste export-/importierbar.
   Arbeitsstand: localStorage `monstersarc.attack.draft.v1`. Eingebunden von devkit.js (Reiter „attacks“). */
(function () {
  var MA = window.MA, L2 = MA.L2, AT = MA.attacks, MO = MA.monsters, FPS = AT.FPS, DKEY = "monstersarc.attack.draft.v1";
  var S = null;

  MA.EDITOR_CSS = (MA.EDITOR_CSS || "") +
    ".ma-ae .seg{display:grid;gap:3px;margin:3px 0 6px}.ma-ae .seg.c2{grid-template-columns:repeat(2,1fr)}.ma-ae .seg.c3{grid-template-columns:repeat(3,1fr)}.ma-ae .seg.c4{grid-template-columns:repeat(4,1fr)}.ma-ae .seg.c5{grid-template-columns:repeat(5,1fr)}" +
    ".ma-ae .seg button{padding:5px 2px;font-size:.72rem;min-width:0}.ma-ed .ma-ae button[disabled]{opacity:.38;cursor:default}" +
    ".ma-ae .tabs{display:grid;grid-template-columns:repeat(4,1fr);gap:3px;margin:10px 0 8px}.ma-ae .tabs button{padding:6px 2px;font-size:.74rem}" +
    ".ma-ae h4{margin:10px 0 3px;font:600 .72rem/1.2 var(--f-body,system-ui);color:#ACA89F}" +
    ".ma-ae .ma-ed-row label{flex:0 0 84px}.ma-ae .ma-ed-row output{flex:0 0 46px;text-align:right;font-variant-numeric:tabular-nums;font-size:.74rem}" +
    ".ma-ae input[type=text],.ma-ae input[type=number],.ma-ae select{flex:1;min-width:0;background:#141514;color:#E4E0D8;border:1px solid #434543;padding:4px 6px;font:inherit;font-size:.8rem;border-radius:0}" +
    ".ma-ae .big{width:100%;padding:8px;margin:6px 0;background:#ED6A5E;color:#1C1D1C;border-color:#ED6A5E;font-weight:600}.ma-ed .ma-ae .big:hover{background:#F08478}" +
    ".ma-ae .big.rec{background:#C8302A;border-color:#C8302A;color:#fff}" +
    ".ma-ae .row2,.ma-ae .row3,.ma-ae .row5{display:grid;gap:3px;margin:3px 0}.ma-ae .row2{grid-template-columns:1fr 1fr}.ma-ae .row3{grid-template-columns:repeat(3,1fr)}.ma-ae .row5{grid-template-columns:repeat(5,1fr)}" +
    ".ma-ae .row2 button,.ma-ae .row3 button,.ma-ae .row5 button{padding:5px 2px;font-size:.74rem}" +
    ".ma-ae .msg{font-size:.74rem;line-height:1.4;color:#9BC78B;min-height:1.2em;margin:2px 0}.ma-ae .msg.bad{color:#ED9A8E}.ma-ae .hint{color:#8E8A82;font-size:.72rem;line-height:1.45;margin:3px 0}" +
    ".ma-ae .lay{display:flex;flex-direction:column;gap:2px;margin:4px 0}.ma-ae .lay div{display:grid;grid-template-columns:1fr 26px 26px 26px 26px;gap:2px}.ma-ae .lay button{padding:4px;font-size:.72rem;text-align:left}" +
    ".ma-ae .lay button.i{text-align:center;padding:4px 0}.ma-ae .add{display:grid;grid-template-columns:repeat(3,1fr);gap:3px;margin:4px 0}.ma-ae .add button{padding:5px 2px;font-size:.68rem}" +
    ".ma-ae .colr{display:grid;grid-template-columns:34px 1fr 64px;gap:6px;align-items:center;margin:3px 0;font-size:.78rem}.ma-ae .colr input[type=color]{width:34px;height:24px;padding:0;border:1px solid #434543;background:none;cursor:pointer}.ma-ae .colr code{color:#8E8A82;font-size:.7rem}" +
    ".ma-ae .sw{display:grid;grid-template-columns:repeat(8,1fr);gap:2px;margin:4px 0}.ma-ae .sw button{height:16px;padding:0;border:1px solid #434543}" +
    ".ma-ae .box{border:1px solid #62929E;background:#1E2A2C;padding:8px;margin:8px 0;font-size:.76rem;line-height:1.45;color:#C6D8DA}" +
    ".ma-ae .tpl{display:grid;grid-template-columns:repeat(2,1fr);gap:3px;margin:4px 0}.ma-ae .tpl button{padding:5px;font-size:.72rem;text-align:left}" +
    ".ma-ae .bake img{width:100%;image-rendering:pixelated;border:1px solid #434543;margin:4px 0;background:#2A2C2B}.ma-ae kbd{font:inherit;font-size:.68rem;border:1px solid #434543;padding:0 3px;color:#C6C5B9}";

  // ---------- Vorlagen ----------
  function lay(type, o) { var d = AT.type(type).d, st = AT.style(o.style || "energy"); return AT.sLayer(Object.assign({ type: type, style: st.id, c1: st.c1, c2: st.c2, grav: st.grav, turb: st.turb }, d, o)); }
  function keys(arr) { return { mode: "smooth", k: arr.map(function (q) { return { f: q[0], x: q[1], y: q[2], r: q[3], s: q[4] }; }) }; }
  function hit(f0) { return keys([[f0, 0, 0, 0, 1], [f0 + 1, 9, -2, 4, 1], [f0 + 2, -6, 1, -3, 1], [f0 + 3, 4, 0, 1, 1], [f0 + 5, 0, 0, 0, 1]]); }
  var T0 = AT.T0, A0 = AT.A0;
  var PRESETS = [
    { n: ["Glut", "Ember"], f: function () { return { name: "Glut", el: 1, cat: "far", power: 40, pp: 25, acc: 100, dur: 1.6, tracks: { atk: keys([[0, 0, 0, 0, 1], [4, -6, 4, 0, 1], [8, 0, 0, 0, 1]]), def: hit(17) }, layers: [lay("volley", { style: "fire", n: 3, size: 6, speed: 330, arc: 30, t0: 0.25, t1: 0.75, spread: 30 }), lay("burst", { style: "fire", n: 26, size: 4, speed: 140, t0: 0.85, t1: 0.9, E: keys([[0, T0.x, T0.y + 6]]) })] }; } },
    { n: ["Aquaknarre", "Water Gun"], f: function () { return { name: "Aquaknarre", el: 2, cat: "far", power: 40, pp: 25, acc: 100, dur: 1.8, tracks: { atk: keys([[0, 0, 0, 0, 1], [4, -4, 2, -3, 1], [26, -4, 2, -3, 1], [30, 0, 0, 0, 1]]), def: hit(12) }, layers: [lay("beam", { style: "water", t0: 0.25, t1: 1.3, width: 7, n: 50, size: 3 })] }; } },
    { n: ["Rasierblatt", "Razor Leaf"], f: function () { return { name: "Rasierblatt", el: 3, cat: "far", power: 55, pp: 25, acc: 95, dur: 1.8, tracks: { atk: keys([]), def: hit(18) }, layers: [lay("volley", { style: "leaf", n: 6, size: 8, speed: 380, arc: 22, spread: 60, t0: 0.2, t1: 1.0 })] }; } },
    { n: ["Steinhagel", "Rock Slide"], f: function () { return { name: "Steinhagel", el: 12, cat: "far", power: 75, pp: 10, acc: 90, dur: 2.2, tracks: { atk: keys([]), def: hit(22) }, layers: [lay("rain", { style: "stone", n: 30, size: 6, speed: 120, width: 120, t0: 0.2, t1: 1.4 }), lay("shake", { t0: 1.0, t1: 1.6, size: 4 })] }; } },
    { n: ["Donnerblitz", "Thunderbolt"], f: function () { return { name: "Donnerblitz", el: 4, cat: "far", power: 90, pp: 15, acc: 100, dur: 2, tracks: { atk: keys([]), def: hit(12) }, layers: [lay("beam", { style: "electric", t0: 0.45, t1: 1.2, width: 10, n: 20, size: 3, E: keys([[0, T0.x + 10, -10]]) }), lay("flash", { style: "electric", c1: "#FFFFE0", t0: 0.5, t1: 0.75, width: 60 }), lay("burst", { style: "electric", n: 18, size: 4, speed: 160, t0: 0.6, t1: 0.65, E: keys([[0, T0.x, T0.y + 10]]) })] }; } },
    { n: ["Eisstrahl", "Ice Beam"], f: function () { return { name: "Eisstrahl", el: 5, cat: "far", power: 90, pp: 10, acc: 100, dur: 2, tracks: { atk: keys([]), def: hit(14) }, layers: [lay("beam", { style: "ice", t0: 0.3, t1: 1.4, width: 9, n: 40, size: 3 }), lay("burst", { style: "ice", n: 22, size: 4, speed: 110, t0: 1.3, t1: 1.35, E: keys([[0, T0.x, T0.y]]) })] }; } },
    { n: ["Tackle", "Tackle"], f: function () { return { name: "Tackle", el: 0, cat: "near", power: 40, pp: 35, acc: 100, dur: 1.4, tracks: { atk: keys([[0, 0, 0, 0, 1], [5, -12, 8, -6, 1], [9, 170, -84, 8, 0.85], [12, 165, -80, 4, 0.85], [20, 0, 0, 0, 1]]), def: hit(9) }, layers: [lay("burst", { style: "punch", n: 16, size: 5, speed: 160, t0: 0.45, t1: 0.5, E: keys([[0, T0.x - 10, T0.y + 10]]) }), lay("shake", { t0: 0.45, t1: 0.75, size: 5 })] }; } },
    { n: ["Feuerwirbel", "Fire Spin"], f: function () { return { name: "Feuerwirbel", el: 1, cat: "far", power: 35, pp: 15, acc: 85, dur: 2.4, tracks: { atk: keys([]), def: hit(16) }, layers: [lay("vortex", { style: "fire", n: 140, size: 5, width: 110, speed: 50, t0: 0.2, t1: 1.9, E: keys([[0, T0.x, T0.y + 40]]) })] }; } },
    { n: ["Aquafontäne", "Water Spout"], f: function () { return { name: "Aquafontäne", el: 2, cat: "far", power: 70, pp: 10, acc: 95, dur: 2, tracks: { atk: keys([]), def: keys([[6, 0, 0, 0, 1], [9, 0, -16, 0, 1], [22, 0, -16, 0, 1], [28, 0, 0, 0, 1]]) }, layers: [lay("fountain", { style: "water", n: 110, size: 3, speed: 330, spread: 26, t0: 0.25, t1: 1.3, E: keys([[0, T0.x, T0.y + 44]]) })] }; } },
    { n: ["Psystrahl", "Psybeam"], f: function () { return { name: "Psystrahl", el: 10, cat: "far", power: 65, pp: 20, acc: 100, dur: 2, tracks: { atk: keys([]), def: hit(12) }, layers: [lay("beam", { style: "psychic", t0: 0.3, t1: 1.4, width: 8, n: 30, size: 3 }), lay("flash", { style: "psychic", c1: "#FFC8E8", t0: 0.35, t1: 0.6, width: 35 })] }; } },
    { n: ["Kugelblitz", "Ball Lightning"], f: function () { return { name: "Kugelblitz", el: 4, cat: "far", power: 60, pp: 15, acc: 95, dur: 2, tracks: { atk: keys([]), def: hit(25) }, layers: [lay("orb", { style: "electric", size: 10, n: 20, t0: 0.15, t1: 1.25, E: keys([[3, A0.x, A0.y - 10], [10, A0.x + 10, A0.y - 40], [24, T0.x, T0.y]]) }), lay("burst", { style: "electric", n: 20, size: 4, speed: 150, t0: 1.25, t1: 1.3, E: keys([[0, T0.x, T0.y]]) }), lay("flash", { c1: "#FFFFE0", t0: 1.25, t1: 1.45, width: 45 })] }; } }
  ];
  function fromPreset(i) { var a = AT.sanitize(PRESETS[i].f()); a.id = AT.uid(); return a; }
  function blank() { return AT.sanitize({ name: "", el: 0, cat: "far", power: 40, pp: 25, acc: 100, dur: 2, layers: [] }); }

  // ---------- Zustand ----------
  function ensure() {
    if (S) return;
    S = { tab: "anim", f: 0, time: 0, playing: false, speed: 1, loop: true, trk: { k: "atk" }, layer: -1, rec: null, drag: null, hov: null, overlay: true, undo: [], msg: "", bad: false,
      brush: { c: "#FFFFFF", size: 2, erase: false }, onion: true, tool: "move", tpl: false, bakeUrl: null, bakeInfo: null, inclScene: true, drawCache: {}, pmx: 0, pmy: 0, sprites: null };
    var d = null; try { d = JSON.parse(localStorage.getItem(DKEY) || "null"); } catch (e) {}
    S.a = d && d.a ? AT.sanitize(d.a) : fromPreset(0);
    if (S.a.layers.length) S.layer = 0;
  }
  var keepT = 0;
  function keep() { clearTimeout(keepT); keepT = setTimeout(function () { try { localStorage.setItem(DKEY, JSON.stringify({ a: S.a })); } catch (e) {} }, 300); }
  function say(t, bad) { S.msg = t; S.bad = !!bad; var el = S.host && S.host.querySelector(".ma-ae .msg"); if (el) { el.textContent = t; el.className = "msg" + (bad ? " bad" : ""); } }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function nF() { return AT.frames(S.a); }
  function pushUndo() { S.undo.push(JSON.stringify(S.a)); if (S.undo.length > 30) S.undo.shift(); }
  function undo() { if (!S.undo.length) { say(L2("Nichts rückgängig zu machen.", "Nothing to undo.")); return; } S.a = AT.sanitize(JSON.parse(S.undo.pop())); S.drawCache = {}; if (S.layer >= S.a.layers.length) S.layer = S.a.layers.length - 1; keep(); renderPanel(); }
  function setF(f) { S.f = Math.max(0, Math.min(nF() - 1, Math.round(f))); S.time = S.f / FPS; syncTransport(); }
  function curLayer() { return S.layer >= 0 ? S.a.layers[S.layer] : null; }

  // ---------- Test-Monster und Szene ----------
  var DEF0 = { x: 0, y: 0, r: 0, s: 1 }, ATK_P = { x: 124, y: 272 }, DEF_P = { x: 352, y: 134 };
  var fallback = null;
  function testSprites() {
    var ids = S.a.test || [], ma = ids[0] && MO.byId(ids[0]), md = ids[1] && MO.byId(ids[1]);
    var key = (ma ? ma.id + (ma.img ? ma.img.back.length : "") : "-") + "|" + (md ? md.id + (md.img ? md.img.front.length : "") : "-");
    if (S.sprites && S.sprites.key === key) return S.sprites;
    var atk = ma ? MO.render(ma, "back") : null, def = md ? MO.render(md, "front") : null;
    if ((!atk || !def) && !fallback) {
      fallback = {};
      var pal = { main: "#C8A060", sec: "#F0E0B8", acc: "#8A5A3A", eye: "#3A2A20", extra: "#E8C048" }, pal2 = { main: "#4A8EC8", sec: "#BEE0F0", acc: "#2E5E9A", eye: "#1A2A40", extra: "#8ACBE8" };
      if (MA.m3d && MA.m3d.ok()) { var b = MA.m3d.snapshot(MA.m3d.starter(1), pal, Math.PI + 0.55, 0.22, 64), f = MA.m3d.snapshot(MA.m3d.starter(0), pal2, 0.55, 0.22, 64); fallback.atk = b && b.cv; fallback.def = f && f.cv; }
      ["atk", "def"].forEach(function (k) { if (fallback[k]) return; var c = MA.canvas(66, 66), g = c.ctx; g.fillStyle = k === "atk" ? "#C8A060" : "#4A8EC8"; g.beginPath(); g.ellipse(33, 40, 26, 22, 0, 0, 6.283); g.fill(); fallback[k] = c; });
    }
    S.sprites = { key: key, atk: atk || fallback.atk, def: def || fallback.def };
    return S.sprites;
  }
  // Größe im Kampf (seit v0.28): wie bei Pokémon stark zusammengestaucht – kleine Monster werden größer, riesige kleiner gezeigt.
  // Zielhöhe des sichtbaren Monsters in Pixeln aus der echten Größe h (m); der Angreifer steht näher und ist etwas größer.
  function arenaH(h, which) { var t = Math.max(48, Math.min(124, 96 * Math.pow(Math.max(0.05, h || 1), 0.33))); return which === "atk" ? Math.min(160, t * 1.22) : t; }
  function bbox(cv) {   // sichtbarer Bereich des Sprites (zwischengespeichert, Bilder laden evtl. noch)
    if (!cv._bb || cv._bb.w0 !== cv.width || cv._bb.none) { var b = MO.alphaBox(cv); cv._bb = b ? { x: b.x, y: b.y, w: b.w, h: b.h, w0: cv.width } : { x: 0, y: 0, w: cv.width || 1, h: cv.height || 1, w0: cv.width, none: 1 }; }
    return cv._bb;
  }
  function spriteScale(cv, which, h) { var k = arenaH(h, which) / bbox(cv).h, r = Math.round(k); return r >= 1 && Math.abs(r - k) / k < 0.14 ? r : k; }   // ganze Faktoren, wenn sie fast passen (saubere Pixel)
  function monXf(which, f) { return AT.sample(S.a.tracks[which], f, DEF0); }
  function testMon(which) { var ids = S.a.test || [], id = ids[which === "atk" ? 0 : 1]; return id ? MO.byId(id) : null; }
  function monBox(which, f) {   // Mittelpunkt und Halbmaße des Sprites (für Griffe)
    var sp = testSprites(), cv = which === "atk" ? sp.atk : sp.def, mo = testMon(which), k = spriteScale(cv, which, mo ? mo.h : 1), P = which === "atk" ? ATK_P : DEF_P, o = monXf(which, f), bb = bbox(cv);
    var h = bb.h * k * o.s, w = bb.w * k * o.s, by = which === "atk" ? Math.min(P.y + bb.h * k * 0.15, 240 + bb.h * k * 0.3) : P.y;   // kleine Angreifer stehen ganz im Bild
    return { cx: P.x + o.x, cy: by + o.y - h / 2, w: w / 2, h: h / 2, k: k, cv: cv, bb: bb, px: P.x + o.x, py: by + o.y, o: o };
  }
  function defE(f) { var o = monXf("atk", f); return { x: AT.A0.x + o.x, y: AT.A0.y + o.y, r: 0, s: 1 }; }
  function defT(f) { var o = monXf("def", f); return { x: AT.T0.x + o.x, y: AT.T0.y + o.y, r: 0, s: 1 }; }
  function ctxFor(L) { return { E: function (fr) { return AT.sample(L.E, fr, defE(fr)); }, T: function (fr) { return AT.sample(L.T, fr, defT(fr)); } }; }
  var BG = null;
  function background() {
    if (BG) return BG;
    var c = MA.canvas(480, 272), g = c.ctx, x, y;
    for (y = 0; y < 150; y++) { var k = y / 150; g.fillStyle = MA.rgb([168 + 64 * k, 214 + 30 * k, 238 - 6 * k]); g.fillRect(0, y, 480, 1); }
    for (y = 150; y < 272; y++) for (x = 0; x < 480; x += 2) { var n = MA.hash2(x >> 3, y >> 2, 4); g.fillStyle = MA.rgb(n < 0.08 ? [118, 170, 98] : (y - 150) % 10 < 2 ? [126, 182, 104] : [140, 196, 116]); g.fillRect(x, y, 2, 1); }
    g.fillStyle = "#7AA8C8"; for (x = 0; x < 480; x++) { var hh = 6 + Math.round(4 * Math.sin(x / 23) + 3 * Math.sin(x / 9)); g.fillRect(x, 150 - hh, 1, hh); }
    function plat(cx, cy, rx, ry) { g.fillStyle = "#5E8C50"; g.beginPath(); g.ellipse(cx, cy + 2, rx + 2, ry + 2, 0, 0, 6.283); g.fill(); g.fillStyle = "#A8D088"; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, 6.283); g.fill(); g.fillStyle = "#BCDC9C"; g.beginPath(); g.ellipse(cx - rx * 0.1, cy - ry * 0.2, rx * 0.75, ry * 0.55, 0, 0, 6.283); g.fill(); }
    plat(352, 128, 80, 18); plat(124, 254, 104, 24);
    return (BG = c);
  }
  function infoBoxes(g) {
    function box(x, y, w, h) { g.fillStyle = "#3A4A48"; g.fillRect(x - 2, y - 2, w + 4, h + 4); g.fillStyle = "#F8F6E0"; g.fillRect(x, y, w, h); g.fillStyle = "#D8D4B8"; g.fillRect(x, y + h - 3, w, 3); }
    function hp(x, y, w) { g.fillStyle = "#3A4A48"; g.fillRect(x, y, w, 5); g.fillStyle = "#58D080"; g.fillRect(x + 1, y + 1, w - 2, 3); }
    var ids = S.a.test || [], ma = ids[0] && MO.byId(ids[0]), md = ids[1] && MO.byId(ids[1]);
    g.font = "bold 10px monospace"; g.textBaseline = "top";
    box(18, 18, 170, 34); g.fillStyle = "#3A4040"; g.fillText(((md && md.name) || L2("ZIEL", "TARGET")).toUpperCase(), 26, 23); g.fillText("Lv50", 150, 23); hp(52, 38, 120);
    box(290, 200, 174, 40); g.fillStyle = "#3A4040"; g.fillText(((ma && ma.name) || L2("ANGREIFER", "ATTACKER")).toUpperCase(), 298, 205); g.fillText("Lv50", 428, 205); hp(330, 222, 124);
  }
  function drawMon(g, which, f) {
    var b = monBox(which, f), cv = b.cv; if (!cv || !cv.width) return;
    g.save(); g.imageSmoothingEnabled = false; g.translate(b.px, b.py); g.rotate(b.o.r * Math.PI / 180); g.scale(b.o.s, b.o.s);
    var bb = b.bb; g.drawImage(cv, bb.x, bb.y, bb.w, bb.h, -bb.w * b.k / 2, -bb.h * b.k, bb.w * b.k, bb.h * b.k); g.restore();
  }
  var FXB = null, FXC = null;
  function fxBuf(ps) { var w = Math.round(480 / ps), h = Math.round(272 / ps); if (!FXB || FXB.w !== w || FXB.h !== h) { FXB = new AT.Buf(w, h); FXC = MA.canvas(w, h); } FXB.d.fill(0); return FXB; }
  function drawingAt(f) {   // gezeichnetes Bild für Bild f (mit „Halten“: letztes davor)
    var fr = S.a.draw.frames, best = -1;
    if (fr[f]) best = f; else if (S.a.draw.hold) Object.keys(fr).forEach(function (k) { k = +k; if (k <= f && k > best) best = k; });
    return best >= 0 ? drawCanvas(best) : null;
  }
  function drawCanvas(f) {
    var u = S.a.draw.frames[f]; if (!u) return null;
    var c = S.drawCache[f]; if (c && c.u === u) return c.cv;
    var cv = MA.canvas(240, 136), im = new Image(); im.onload = function () { cv.ctx.clearRect(0, 0, 240, 136); cv.ctx.drawImage(im, 0, 0); }; im.src = u;
    S.drawCache[f] = { u: u, cv: cv }; return cv;
  }
  // Ganze Szene für Bild f zeichnen. o: { bg, mon, fx, draw }
  function renderScene(g, f, o) {
    var t = f / FPS, ps = S.a.px, B = fxBuf(ps), fx = o.fx === false ? { shake: 0 } : AT.renderLayers(B, S.a.layers, t, ctxFor, ps);
    var sx = fx.shake ? Math.round((MA.hash2(f, 1, 9) - 0.5) * 2 * fx.shake) : 0, sy = fx.shake ? Math.round((MA.hash2(f, 2, 9) - 0.5) * 2 * fx.shake * 0.6) : 0;
    g.save(); g.translate(sx, sy);
    if (o.bg !== false) { g.drawImage(background(), 0, 0); }
    if (o.mon !== false) { drawMon(g, "def", f); drawMon(g, "atk", f); }
    if (o.bg !== false) infoBoxes(g);
    if (o.fx !== false) { FXC.ctx.putImageData(B.img, 0, 0); g.imageSmoothingEnabled = false; g.drawImage(FXC, 0, 0, 480, 272); }
    if (o.draw !== false) { var dc = (S.paint && S.paint.f === f) ? S.paint.cv : drawingAt(f); if (dc) { g.imageSmoothingEnabled = false; g.drawImage(dc, 0, 0, 480, 272); } }
    g.restore();
    if (fx.flash) { var ps2 = 2, c = fx.flash.c, a = fx.flash.a; g.fillStyle = "rgb(" + c.join(",") + ")"; for (var y = 0; y < 272; y += ps2) for (var x = 0; x < 480; x += ps2) { var bay = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5][((y / ps2) & 3) * 4 + ((x / ps2) & 3)] / 16; if (a > bay) g.fillRect(x, y, ps2, ps2); } }
  }

  // ---------- Spuren und Griffe ----------
  function trackOf(sel) {
    if (!sel) return null;
    if (sel.k === "atk" || sel.k === "def") return S.a.tracks[sel.k];
    var L = S.a.layers[sel.i]; return L ? L[sel.w] : null;
  }
  function selName(sel) { return sel.k === "atk" ? L2("Angreifer", "Attacker") : sel.k === "def" ? L2("Ziel", "Target") : (S.a.layers[sel.i] ? S.a.layers[sel.i].name : "?") + (sel.w === "E" ? L2(" · Start", " · start") : L2(" · Ziel", " · target")); }
  function usesE(L) { return ["beam", "volley", "orb", "vortex", "fountain", "burst"].indexOf(L.type) >= 0; }
  function usesT(L) { return ["beam", "volley", "rain"].indexOf(L.type) >= 0; }
  function handles() {
    var H = [], f = S.f;
    ["atk", "def"].forEach(function (w) { var b = monBox(w, f); H.push({ sel: { k: w }, x: b.cx, y: b.cy, w: b.w, h: b.h, mon: 1 }); });
    var L = curLayer();
    if (L) {
      var c = ctxFor(L);
      if (usesE(L)) { var e = c.E(f); H.push({ sel: { k: "L", i: S.layer, w: "E" }, x: e.x, y: e.y, lab: "S" }); }
      if (usesT(L)) { var tt = c.T(f); H.push({ sel: { k: "L", i: S.layer, w: "T" }, x: tt.x, y: tt.y, lab: "Z" }); }
    }
    return H;
  }
  function hoverAt(mx, my) {
    var H = handles(), best = null;
    H.forEach(function (o) { if (!o.mon && Math.hypot(o.x - mx, o.y - my) < 10) best = o; });
    if (best) return best;
    for (var i = H.length - 1; i >= 0; i--) { var o = H[i]; if (o.mon && Math.abs(mx - o.x) < o.w * 0.8 && Math.abs(my - o.y) < o.h * 0.9) return o; }
    return null;
  }
  function sameSel(a, b) { return a && b && a.k === b.k && a.i === b.i && a.w === b.w; }
  function curVal(sel, f) {
    if (sel.k === "atk" || sel.k === "def") return monXf(sel.k, f);
    var L = S.a.layers[sel.i], c = ctxFor(L); return sel.w === "E" ? c.E(f) : c.T(f);
  }
  function base(sel) { return sel.k === "atk" ? { x: 0, y: 0 } : sel.k === "def" ? { x: 0, y: 0 } : { x: 0, y: 0 }; }
  function keyAt(sel, f, v) { var tr = trackOf(sel); if (!tr) return; var cur = curVal(sel, f); AT.setKey(tr, f, { x: v.x != null ? v.x : cur.x, y: v.y != null ? v.y : cur.y, r: v.r != null ? v.r : cur.r, s: v.s != null ? v.s : cur.s }); keep(); }

  // ---------- Seitenleiste ----------
  function slider(key, label, min, max, step, val, fmt) {
    return '<div class="ma-ed-row"><label>' + label + '</label><input type="range" min="' + min + '" max="' + max + '" step="' + step + '" data-k="' + key + '" value="' + val + '"><output data-o="' + key + '">' + (fmt ? fmt(val) : val) + '</output></div>';
  }
  function sec(v) { return (+v).toFixed(2).replace(".", MA.lang === "en" ? "." : ",") + " s"; }
  function renderPanel() {
    if (!S.host) return;
    var sc = S.host.scrollTop, a = S.a, list = AT.list().slice().sort(function (x, y) { return (x.name > y.name) ? 1 : -1; }), h = '<div class="ma-ae">';
    h += '<h3>' + L2("Attackenliste", "Attack list") + ' <span class="ma-ed-cnt">' + list.length + '</span></h3>';
    h += '<div class="ma-ed-row"><select data-k="pick"><option value="">' + L2("– Attacke aus der Liste laden –", "– load attack from the list –") + '</option>' + list.map(function (q) { return '<option value="' + q.id + '"' + (q.id === a.id ? " selected" : "") + '>' + esc(q.name || "?") + '</option>'; }).join("") + '</select></div>';
    h += '<div class="row3"><button type="button" data-a="new" aria-pressed="' + S.tpl + '">' + L2("Neu", "New") + '</button><button type="button" data-a="copy">' + L2("Kopie", "Copy") + '</button><button type="button" data-a="del">' + L2("Löschen", "Delete") + '</button></div>';
    if (S.tpl) h += '<div class="hint">' + L2("Vorlage wählen oder leer beginnen:", "Pick a template or start empty:") + '</div><div class="tpl"><button type="button" data-tpl="-1">' + L2("Leer", "Empty") + '</button>' + PRESETS.map(function (p, i) { return '<button type="button" data-tpl="' + i + '">' + L2(p.n[0], p.n[1]) + '</button>'; }).join("") + '</div>';
    h += '<button type="button" class="big" data-a="save">' + (AT.byId(a.id) ? L2("Änderungen speichern", "Save changes") : L2("In Liste speichern", "Save to list")) + '</button>';
    h += '<div class="row2"><button type="button" data-a="exp">' + L2("Liste exportieren", "Export list") + '</button><button type="button" data-a="imp">' + L2("Liste importieren", "Import list") + '</button></div><input type="file" accept=".json,application/json" hidden data-k="file">';
    h += '<div class="msg' + (S.bad ? " bad" : "") + '">' + esc(S.msg) + '</div>';
    h += '<div class="tabs">' + [["data", "Daten", "Data"], ["anim", "Animation", "Animation"], ["draw", "Zeichnen", "Draw"], ["export", "Export", "Export"]].map(function (t) { return '<button type="button" data-tab="' + t[0] + '" aria-pressed="' + (S.tab === t[0]) + '">' + L2(t[1], t[2]) + '</button>'; }).join("") + '</div>';
    if (S.tab === "data") h += dataPanel(); else if (S.tab === "anim") h += animPanel(); else if (S.tab === "draw") h += drawPanel(); else h += exportPanel();
    S.host.innerHTML = h + '</div>'; S.host.scrollTop = sc;
  }
  function transport() {
    var n = nF();
    return '<div class="row5"><button type="button" data-a="first" title="Pos1">⏮</button><button type="button" data-a="prev" title="←">◀</button><button type="button" data-a="play">' + (S.playing ? "⏸" : "▶") + '</button><button type="button" data-a="next" title="→">▶|</button><button type="button" data-a="loop" aria-pressed="' + S.loop + '">↻</button></div>' +
      '<div class="seg c3">' + [[1, "1×"], [0.5, "½×"], [0.25, "¼×"]].map(function (q) { return '<button type="button" data-speed="' + q[0] + '" aria-pressed="' + (S.speed === q[0]) + '">' + q[1] + '</button>'; }).join("") + '</div>' +
      '<div class="ma-ed-row"><label>' + L2("Bild", "Frame") + '</label><input type="range" min="0" max="' + (n - 1) + '" step="1" data-k="frame" value="' + S.f + '"><output data-o="frame">' + (S.f + 1) + '/' + n + '</output></div>';
  }
  function syncTransport() {
    if (!S.host) return; var i = S.host.querySelector('[data-k="frame"]'), o = S.host.querySelector('[data-o="frame"]'); if (i) i.value = S.f; if (o) o.textContent = (S.f + 1) + "/" + nF();
    var p = S.host.querySelector('[data-a="play"]'); if (p) p.textContent = S.playing ? "⏸" : "▶";
  }
  function dataPanel() {
    var a = S.a, h = '<div class="ma-ed-row"><label>Name</label><input type="text" maxlength="24" data-k="name" value="' + esc(a.name) + '"></div>';
    h += '<div class="ma-ed-row"><label>Element</label><select data-k="el">' + MO.ELEMENTS.map(function (e, i) { return '<option value="' + i + '"' + (i === a.el ? " selected" : "") + '>' + MO.elName(i) + '</option>'; }).join("") + '</select></div>';
    h += '<h4>' + L2("Art", "Kind") + '</h4><div class="seg c2"><button type="button" data-cat="near" aria-pressed="' + (a.cat === "near") + '">' + L2("Nahkampf", "Melee") + '</button><button type="button" data-cat="far" aria-pressed="' + (a.cat === "far") + '">' + L2("Fernkampf", "Ranged") + '</button></div>';
    h += '<h4>' + L2("Werte", "Values") + '</h4>' + slider("power", L2("Stärke", "Power"), 0, 250, 5, a.power) + slider("pp", L2("AP (Einsätze)", "PP (uses)"), 1, 40, 1, a.pp) + slider("acc", L2("Genauigkeit", "Accuracy"), 30, 100, 5, a.acc, function (v) { return v + " %"; });
    h += '<div class="row2"><button type="button" data-a="sure" aria-pressed="' + a.sure + '">' + L2("Trifft immer: ", "Never misses: ") + (a.sure ? L2("ja", "yes") : L2("nein", "no")) + '</button><span></span></div>';
    h += '<h4>' + L2("Animation", "Animation") + '</h4>' + slider("dur", L2("Dauer", "Duration"), 1, 4, 0.1, a.dur, sec);
    h += '<div class="hint">' + L2("Zeitraum der Attacke: kürzeste 1 s, längste 4 s (20 Bilder pro Sekunde). Keys hinter dem Ende bleiben erhalten, werden aber nicht gezeigt.", "Length of the attack: shortest 1 s, longest 4 s (20 frames per second). Keys after the end are kept but not shown.") + '</div>';
    var ms = MO.sorted(), opt = function (cur) { return '<option value="">' + L2("Test-Monster", "Test monster") + '</option>' + ms.map(function (m) { return '<option value="' + m.id + '"' + (m.id === cur ? " selected" : "") + '>#' + ("00" + m.no).slice(-3) + ' ' + esc(m.name || "?") + '</option>'; }).join(""); };
    h += '<h4>' + L2("Kampfszene (nur zur Ansicht)", "Battle scene (preview only)") + '</h4>';
    h += '<div class="ma-ed-row"><label>' + L2("Angreifer", "Attacker") + '</label><select data-k="testA">' + opt(a.test[0]) + '</select></div><div class="ma-ed-row"><label>' + L2("Ziel", "Target") + '</label><select data-k="testB">' + opt(a.test[1]) + '</select></div>';
    return h;
  }
  function animPanel() {
    var a = S.a, h = transport(), tr = trackOf(S.trk), L = curLayer(), isMon = S.trk.k === "atk" || S.trk.k === "def";
    h += '<h4>' + L2("Spur (was bewegt wird)", "Track (what moves)") + '</h4><div class="seg c4">' +
      '<button type="button" data-trk="atk" aria-pressed="' + (S.trk.k === "atk") + '">' + L2("Angreifer", "Attacker") + '</button><button type="button" data-trk="def" aria-pressed="' + (S.trk.k === "def") + '">' + L2("Ziel", "Target") + '</button>' +
      '<button type="button" data-trk="E"' + (L && usesE(L) ? "" : " disabled") + ' aria-pressed="' + (S.trk.k === "L" && S.trk.w === "E") + '">' + L2("Ebene Start", "Layer start") + '</button><button type="button" data-trk="T"' + (L && usesT(L) ? "" : " disabled") + ' aria-pressed="' + (S.trk.k === "L" && S.trk.w === "T") + '">' + L2("Ebene Ziel", "Layer target") + '</button></div>';
    if (tr) {
      h += '<div class="seg c3">' + [["smooth", "Weich", "Smooth"], ["linear", "Linear", "Linear"], ["step", "Bild für Bild", "Frame by frame"]].map(function (q) { return '<button type="button" data-mode="' + q[0] + '" aria-pressed="' + (tr.mode === q[0]) + '">' + L2(q[1], q[2]) + '</button>'; }).join("") + '</div>';
      h += '<div class="hint">' + tr.k.length + L2(" Keys in „", " keys in “") + esc(selName(S.trk)) + L2("“.", "”.") + '</div>';
      h += '<div class="row3"><button type="button" data-a="kset">' + L2("Key setzen", "Set key") + ' <kbd>K</kbd></button><button type="button" data-a="kdel">' + L2("Key löschen", "Delete key") + '</button><button type="button" data-a="kclear">' + L2("Spur leeren", "Clear track") + '</button></div>';
      h += '<div class="row2"><button type="button" data-a="ksmooth">' + L2("Spur glätten", "Smooth track") + '</button>' + (S.trk.k === "def" ? '<button type="button" data-a="hit">' + L2("Treffer-Reaktion", "Hit reaction") + '</button>' : '<span></span>') + '</div>';
      if (isMon) { var v = monXf(S.trk.k, S.f); h += slider("kr", L2("Drehung", "Rotation"), -180, 180, 1, Math.round(v.r), function (x) { return x + "°"; }) + slider("ks", L2("Größe", "Scale"), 0.2, 3, 0.05, v.s, function (x) { return Math.round(x * 100) + "%"; }); }
    }
    h += '<button type="button" class="big' + (S.rec ? " rec" : "") + '" data-a="rec">' + (S.rec ? "■ " + L2("Aufnahme stoppen", "Stop recording") : "● " + L2("Live aufnehmen", "Record live") + " <kbd>R</kbd>") + '</button>';
    h += '<div class="hint">' + L2("Im Bild ziehen setzt einen Key im aktuellen Bild (Shift + Ziehen = drehen, Mausrad = Größe, Rechtsklick = Key löschen). Live: Abspielen startet (gern mit ½× oder ¼×), mit gedrückter Maustaste machst du die Bewegung vor – jedes Bild bekommt einen Key. Bild für Bild: mit ◀ ▶ (Pfeiltasten) wechseln und jeweils ziehen.", "Dragging in the view sets a key on the current frame (Shift + drag = rotate, wheel = scale, right click = delete key). Live: playback starts (try ½× or ¼×); hold the mouse button and act out the motion – every frame gets a key. Frame by frame: switch with ◀ ▶ (arrow keys) and drag each time.") + '</div>';
    h += '<h4>' + L2("Effekt-Ebenen", "Effect layers") + '</h4><div class="add">' + AT.TYPES.map(function (t) { return '<button type="button" data-addl="' + t.id + '">+ ' + L2(t.n[0], t.n[1]) + '</button>'; }).join("") + '</div>';
    if (a.layers.length) h += '<div class="lay">' + a.layers.map(function (q, i) {
      return '<div><button type="button" data-lsel="' + i + '" aria-pressed="' + (i === S.layer) + '">' + esc(q.name) + ' <span style="color:#8E8A82">' + L2(AT.style(q.style).n[0], AT.style(q.style).n[1]) + '</span></button>' +
        '<button type="button" class="i" data-lon="' + i + '" title="an/aus">' + (q.on ? "●" : "○") + '</button><button type="button" class="i" data-lup="' + i + '">▲</button><button type="button" class="i" data-ldn="' + i + '">▼</button><button type="button" class="i" data-ldel="' + i + '">✕</button></div>';
    }).join("") + '</div>';
    if (L) h += layerPanel(L);
    h += '<div class="row2" style="margin-top:8px"><button type="button" data-a="overlay" aria-pressed="' + S.overlay + '">' + L2("Hilfen ", "Guides ") + (S.overlay ? L2("an", "on") : L2("aus", "off")) + ' <kbd>H</kbd></button><button type="button" data-a="undo">' + L2("Rückgängig", "Undo") + ' <kbd>Strg+Z</kbd></button></div>';
    return h;
  }
  function layerPanel(L) {
    var d = S.a.dur, h = '<div class="box"><b>' + esc(L.name) + '</b> · ' + L2(AT.type(L.type).n[0], AT.type(L.type).n[1]);
    h += '<div class="ma-ed-row"><label>Name</label><input type="text" maxlength="24" data-k="lname" value="' + esc(L.name) + '"></div>';
    if (L.type !== "shake") {
      h += '<div class="ma-ed-row"><label>' + L2("Muster", "Pattern") + '</label><select data-k="lstyle">' + AT.STYLES.map(function (s) { return '<option value="' + s.id + '"' + (s.id === L.style ? " selected" : "") + '>' + L2(s.n[0], s.n[1]) + '</option>'; }).join("") + '</select></div>';
      h += '<label class="colr"><input type="color" data-lcol="c1" value="' + L.c1 + '"><span>' + L2("Farbe hell / innen", "Light / inner colour") + '</span><code>' + L.c1 + '</code></label>';
      if (L.type !== "flash") h += '<label class="colr"><input type="color" data-lcol="c2" value="' + L.c2 + '"><span>' + L2("Farbe dunkel / außen", "Dark / outer colour") + '</span><code>' + L.c2 + '</code></label>';
      h += '<button type="button" data-a="lel" style="width:100%;margin:2px 0">' + L2("Muster und Farben vom Element der Attacke", "Pattern and colours from the attack's element") + '</button>';
    }
    h += slider("lt0", L2("Start", "Start"), 0, d, 0.05, L.t0, sec) + slider("lt1", L2("Ende", "End"), 0, d, 0.05, L.t1, sec);
    var P = {
      beam: [["n", L2("Partikel", "Particles"), 0, 200, 1], ["size", L2("Partikelgröße", "Particle size"), 1, 16, 0.5], ["width", L2("Strahlbreite", "Beam width"), 2, 40, 1], ["speed", L2("Tempo", "Speed"), 50, 1000, 10], ["turb", L2("Unruhe", "Turbulence"), 0, 200, 1]],
      volley: [["n", L2("Anzahl Bälle", "Balls"), 1, 16, 1], ["size", L2("Größe", "Size"), 1, 24, 0.5], ["speed", L2("Tempo", "Speed"), 60, 1000, 10], ["arc", L2("Bogen", "Arc"), -150, 150, 1], ["spread", L2("Streuung", "Spread"), 0, 200, 1]],
      orb: [["size", L2("Größe", "Size"), 2, 40, 0.5], ["n", L2("Funken", "Sparks"), 0, 120, 1], ["life", L2("Funken-Dauer", "Spark life"), 0.1, 2, 0.05]],
      vortex: [["n", L2("Partikel", "Particles"), 10, 400, 1], ["size", L2("Größe", "Size"), 1, 16, 0.5], ["width", L2("Durchmesser", "Diameter"), 20, 300, 1], ["speed", L2("Aufsteigen", "Rise"), 0, 300, 1], ["turb", L2("Drehtempo", "Spin"), 0, 200, 1], ["life", L2("Lebensdauer", "Lifetime"), 0.2, 3, 0.05]],
      fountain: [["n", L2("Partikel", "Particles"), 10, 400, 1], ["size", L2("Größe", "Size"), 1, 16, 0.5], ["speed", L2("Kraft", "Force"), 50, 900, 10], ["spread", L2("Streuwinkel", "Spread"), 0, 180, 1], ["grav", L2("Schwerkraft", "Gravity"), -400, 1200, 10], ["turb", L2("Wirbel", "Turbulence"), 0, 200, 1], ["life", L2("Lebensdauer", "Lifetime"), 0.2, 3, 0.05]],
      rain: [["n", L2("Tropfen", "Drops"), 5, 400, 1], ["size", L2("Größe", "Size"), 1, 16, 0.5], ["speed", L2("Fallen", "Fall speed"), 0, 900, 10], ["width", L2("Breite", "Width"), 20, 400, 1], ["grav", L2("Schwerkraft", "Gravity"), 0, 1200, 10], ["spread", L2("Wind", "Wind"), 0, 80, 1]],
      burst: [["n", L2("Partikel", "Particles"), 4, 300, 1], ["size", L2("Größe", "Size"), 1, 20, 0.5], ["speed", L2("Kraft", "Force"), 20, 900, 10], ["grav", L2("Schwerkraft", "Gravity"), -400, 1200, 10], ["turb", L2("Wirbel", "Turbulence"), 0, 200, 1], ["life", L2("Lebensdauer", "Lifetime"), 0.1, 2, 0.05]],
      flash: [["width", L2("Stärke", "Strength"), 5, 100, 1]],
      shake: [["size", L2("Stärke", "Strength"), 1, 16, 0.5]]
    }[L.type] || [];
    P.forEach(function (q) { h += slider("lp_" + q[0], q[1], q[2], q[3], q[4], L[q[0]]); });
    if (["flash", "shake"].indexOf(L.type) < 0) h += '<div class="ma-ed-row"><label>Seed</label><input type="number" min="1" max="99999" data-k="lseed" value="' + L.seed + '"><button type="button" data-a="lseed">🎲</button></div>';
    var info = { beam: L2("Strahl vom Start (S) zum Ziel (Z).", "Beam from start (S) to target (Z)."), volley: L2("Bälle fliegen nacheinander von S nach Z und schlagen ein.", "Balls fly one after another from S to Z and impact."), orb: L2("Eine Kugel am Startpunkt – bewege S über die Zeit (Keys), dann fliegt sie.", "An orb at the start point – move S over time (keys) to make it fly."), vortex: L2("Partikel kreisen um S und steigen auf.", "Particles circle around S and rise."), fountain: L2("Partikel schießen bei S nach oben und fallen mit Schwerkraft.", "Particles shoot up at S and fall with gravity."), rain: L2("Partikel fallen von oben auf das Ziel Z.", "Particles fall from above onto target Z."), burst: L2("Alle Partikel fliegen zum Startzeitpunkt bei S auseinander.", "All particles burst apart at S at the start time."), flash: L2("Färbt das ganze Bild kurz ein.", "Tints the whole picture briefly."), shake: L2("Wackelt mit der ganzen Szene.", "Shakes the whole scene.") }[L.type];
    return h + '<div class="hint">' + info + '</div></div>';
  }
  function drawPanel() {
    var b = S.brush, sw = [];
    AT.STYLES.forEach(function (s) { sw.push(s.c1, s.c2); }); sw.push("#FFFFFF", "#1A1420");
    var h = transport();
    h += '<div class="hint">' + L2("Male direkt in die Kampfszene – Bild für Bild. Mit ◀ ▶ (Pfeiltasten) wechseln, die Zwiebelhaut zeigt das Bild davor. „Halten“ zeigt ein Bild weiter, bis ein neues gezeichnet ist. Rechtsklick = radieren.", "Paint straight into the battle scene – frame by frame. Switch with ◀ ▶ (arrow keys); onion skin shows the previous frame. “Hold” keeps a frame visible until a new one is drawn. Right click = erase.") + '</div>';
    h += '<label class="colr"><input type="color" data-k="bcol" value="' + b.c + '"><span>' + L2("Pinselfarbe", "Brush colour") + '</span><code>' + b.c + '</code></label>';
    h += '<div class="sw">' + sw.map(function (c) { return '<button type="button" data-sw="' + c + '" style="background:' + c + '"></button>'; }).join("") + '</div>';
    h += slider("bsize", L2("Pinselgröße", "Brush size"), 1, 8, 1, b.size);
    h += '<div class="row3"><button type="button" data-a="berase" aria-pressed="' + b.erase + '">' + L2("Radierer", "Eraser") + '</button><button type="button" data-a="hold" aria-pressed="' + S.a.draw.hold + '">' + L2("Halten", "Hold") + '</button><button type="button" data-a="onion" aria-pressed="' + S.onion + '">' + L2("Zwiebelhaut", "Onion skin") + '</button></div>';
    h += '<div class="row3"><button type="button" data-a="dcopy">' + L2("Vorheriges kopieren", "Copy previous") + '</button><button type="button" data-a="dclear">' + L2("Bild leeren", "Clear frame") + '</button><button type="button" data-a="dall">' + L2("Alle löschen", "Clear all") + '</button></div>';
    h += '<div class="hint">' + Object.keys(S.a.draw.frames).length + L2(" gezeichnete Bilder.", " drawn frames.") + '</div>';
    return h;
  }
  function exportPanel() {
    var a = S.a, n = nF(), w = Math.round(480 / a.px), hh = Math.round(272 / a.px);
    var h = '<h4>' + L2("Pixelgröße der Effekte", "Effect pixel size") + '</h4><div class="seg c4">' + [1, 2, 3, 4].map(function (p) { return '<button type="button" data-px="' + p + '" aria-pressed="' + (a.px === p) + '">' + p + ' px</button>'; }).join("") + '</div>';
    h += '<div class="hint">' + L2("1 = sehr fein, 2 = wie das Spiel, 3–4 = sehr grob. Gilt für Vorschau und Export.", "1 = very fine, 2 = like the game, 3–4 = very coarse. Applies to preview and export.") + '</div>';
    h += '<div class="row2"><button type="button" data-a="scene" aria-pressed="' + S.inclScene + '">' + (S.inclScene ? L2("Mit Kampfszene", "With battle scene") : L2("Nur Effekte (transparent)", "Effects only (transparent)")) + '</button><span></span></div>';
    h += '<button type="button" class="big" data-a="bake">' + L2("Animation backen", "Bake animation") + '</button>';
    h += '<div class="hint">' + n + L2(" Bilder à ", " frames of ") + w + " × " + hh + L2(" Pixel, 20 Bilder pro Sekunde, als Sprite-Sheet (10 Bilder pro Zeile).", " pixels, 20 frames per second, as a sprite sheet (10 frames per row).") + '</div>';
    if (S.bakeUrl) h += '<div class="bake"><img alt="" src="' + S.bakeUrl + '"></div><div class="row2"><button type="button" data-a="dlpng">' + L2("Sprite-Sheet (.png)", "Sprite sheet (.png)") + '</button><button type="button" data-a="dljson">' + L2("Infos (.json)", "Info (.json)") + '</button></div>';
    return h;
  }

  // ---------- Backen ----------
  function bake() {
    var a = S.a, n = nF(), ps = a.px, w = Math.round(480 / ps), hh = Math.round(272 / ps), cols = Math.min(10, n), rows = Math.ceil(n / cols), sheet = MA.canvas(w * cols, hh * rows), full = MA.canvas(480, 272);
    for (var f = 0; f < n; f++) {
      full.ctx.clearRect(0, 0, 480, 272);
      renderScene(full.ctx, f, { bg: S.inclScene, mon: S.inclScene, fx: true, draw: true });
      sheet.ctx.imageSmoothingEnabled = false; sheet.ctx.drawImage(full, 0, 0, 480, 272, (f % cols) * w, Math.floor(f / cols) * hh, w, hh);
    }
    S.bakeUrl = sheet.toDataURL(); S.bakeInfo = { format: "monstersarc-attack-sheet", version: 1, attack: a.name, id: a.id, fps: FPS, frames: n, frameW: w, frameH: hh, cols: cols, rows: rows, pixel: ps, scene: S.inclScene };
    say(L2("Gebacken: ", "Baked: ") + n + L2(" Bilder.", " frames.")); renderPanel();
  }
  function dl(name, url) { var x = document.createElement("a"); x.href = url; x.download = name; document.body.appendChild(x); x.click(); setTimeout(function () { x.remove(); }, 300); }
  function slug(t) { return String(t || "attacke").toLowerCase().replace(/[äöüß]/g, function (c) { return { "ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss" }[c]; }).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "attacke"; }

  // ---------- Ereignisse Seitenleiste ----------
  function onClick(e) {
    var b = e.target.closest("button"); if (!b || b.disabled) return;
    var d = b.dataset, a = S.a, L = curLayer();
    if (d.tab) { S.tab = d.tab; S.tool = d.tab === "draw" ? "draw" : "move"; renderPanel(); return; }
    if (d.tpl != null) { S.a = +d.tpl < 0 ? blank() : fromPreset(+d.tpl); S.tpl = false; S.layer = S.a.layers.length ? 0 : -1; S.trk = { k: "atk" }; S.drawCache = {}; S.undo = []; setF(0); keep(); say(L2("Vorlage geladen – noch nicht gespeichert.", "Template loaded – not saved yet.")); renderPanel(); return; }
    if (d.speed) { S.speed = +d.speed; renderPanel(); return; }
    if (d.cat) { a.cat = d.cat; keep(); renderPanel(); return; }
    if (d.trk) { S.trk = d.trk === "atk" || d.trk === "def" ? { k: d.trk } : { k: "L", i: S.layer, w: d.trk }; renderPanel(); return; }
    if (d.mode) { var tr = trackOf(S.trk); if (tr) { tr.mode = d.mode; keep(); renderPanel(); } return; }
    if (d.addl) { if (a.layers.length >= 16) { say(L2("Höchstens 16 Ebenen.", "At most 16 layers."), true); return; } pushUndo(); var sid = AT.EL_STYLE[a.el], st = AT.style(sid), nl = lay(d.addl, { style: sid, c1: st.c1, c2: st.c2 }); var dd = AT.type(d.addl).d; nl.t0 = Math.min(dd.t0, a.dur - 0.2); nl.t1 = Math.min(dd.t1, a.dur); a.layers.push(nl); S.layer = a.layers.length - 1; keep(); renderPanel(); return; }
    if (d.lsel != null) { S.layer = +d.lsel; if (S.trk.k === "L") S.trk = { k: "L", i: S.layer, w: "E" }; renderPanel(); return; }
    if (d.lon != null) { a.layers[+d.lon].on = !a.layers[+d.lon].on; keep(); renderPanel(); return; }
    if (d.lup != null || d.ldn != null) { var i = +(d.lup != null ? d.lup : d.ldn), j = i + (d.lup != null ? -1 : 1); if (j < 0 || j >= a.layers.length) return; pushUndo(); var t = a.layers[i]; a.layers[i] = a.layers[j]; a.layers[j] = t; S.layer = j; keep(); renderPanel(); return; }
    if (d.ldel != null) { pushUndo(); a.layers.splice(+d.ldel, 1); S.layer = Math.min(S.layer, a.layers.length - 1); if (S.trk.k === "L") S.trk = { k: "atk" }; keep(); renderPanel(); return; }
    if (d.sw) { S.brush.c = d.sw; S.brush.erase = false; renderPanel(); return; }
    if (d.px) { a.px = +d.px; S.bakeUrl = null; keep(); renderPanel(); return; }
    var x = d.a;
    if (x === "new") { S.tpl = !S.tpl; renderPanel(); return; }
    if (x === "copy") { var c = AT.sanitize(JSON.parse(JSON.stringify(a))); c.id = AT.uid(); c.name = (a.name + " 2").slice(0, 24); S.a = c; keep(); say(L2("Kopie erstellt – noch nicht gespeichert.", "Copy created – not saved yet.")); renderPanel(); return; }
    if (x === "del") { if (!AT.byId(a.id)) { say(L2("Diese Attacke ist noch nicht in der Liste.", "This attack is not in the list yet."), true); return; } if (S.delArm !== a.id) { S.delArm = a.id; say(L2("Zum Löschen noch einmal klicken.", "Click again to delete."), true); return; } AT.remove(a.id); S.delArm = null; say(L2("Gelöscht – die Attacke bleibt im Editor.", "Deleted – the attack stays in the editor.")); renderPanel(); return; }
    if (x === "save") { if (!a.name.trim()) { say(L2("Bitte zuerst einen Namen eingeben (Reiter Daten).", "Please enter a name first (Data tab)."), true); S.tab = "data"; renderPanel(); return; } var r = AT.put(a); if (!r) { say(L2("Speichern fehlgeschlagen – Speicher voll? Exportiere die Liste.", "Saving failed – storage full? Export the list."), true); return; } S.a = r; keep(); say(L2("Gespeichert: ", "Saved: ") + r.name); renderPanel(); return; }
    if (x === "exp") { if (!AT.list().length) { say(L2("Die Liste ist noch leer.", "The list is still empty."), true); return; } AT.exportList(); say(L2("Liste exportiert.", "List exported.")); return; }
    if (x === "imp") { S.host.querySelector("[data-k=file]").click(); return; }
    if (x === "sure") { a.sure = !a.sure; keep(); renderPanel(); return; }
    if (x === "first") { S.playing = false; setF(0); return; }
    if (x === "prev") { S.playing = false; setF(S.f - 1); renderPanelLite(); return; }
    if (x === "next") { S.playing = false; setF(S.f + 1); renderPanelLite(); return; }
    if (x === "play") { togglePlay(); return; }
    if (x === "loop") { S.loop = !S.loop; renderPanel(); return; }
    if (x === "kset") { pushUndo(); keyAt(S.trk, S.f, {}); say(L2("Key gesetzt bei Bild ", "Key set at frame ") + (S.f + 1)); renderPanel(); return; }
    if (x === "kdel") { var tr2 = trackOf(S.trk); if (tr2) { pushUndo(); AT.delKey(tr2, S.f) ? say(L2("Key gelöscht.", "Key deleted.")) : say(L2("In diesem Bild gibt es keinen Key.", "No key on this frame."), true); keep(); renderPanel(); } return; }
    if (x === "kclear") { var tr3 = trackOf(S.trk); if (tr3) { pushUndo(); tr3.k = []; keep(); renderPanel(); } return; }
    if (x === "ksmooth") { var tr4 = trackOf(S.trk); if (tr4) { pushUndo(); AT.smoothTrack(tr4); keep(); say(L2("Spur geglättet.", "Track smoothed.")); renderPanel(); } return; }
    if (x === "hit") { pushUndo(); var f0 = S.f, tr5 = a.tracks.def; [[0, 0, 0, 0, 1], [1, 9, -2, 4, 1], [2, -6, 1, -3, 1], [3, 4, 0, 1, 1], [5, 0, 0, 0, 1]].forEach(function (q) { AT.setKey(tr5, f0 + q[0], { x: q[1], y: q[2], r: q[3], s: q[4] }); }); keep(); say(L2("Treffer-Reaktion ab Bild ", "Hit reaction from frame ") + (f0 + 1)); renderPanel(); return; }
    if (x === "rec") { if (S.rec) stopRec(); else startRec(); return; }
    if (x === "overlay") { S.overlay = !S.overlay; renderPanel(); return; }
    if (x === "undo") { undo(); return; }
    if (x === "lel" && L) { pushUndo(); var st2 = AT.style(AT.EL_STYLE[a.el]); L.style = st2.id; L.c1 = st2.c1; L.c2 = st2.c2; L.grav = st2.grav; L.turb = st2.turb; keep(); renderPanel(); return; }
    if (x === "lseed" && L) { L.seed = 1 + Math.floor(Math.random() * 99998); keep(); renderPanel(); return; }
    if (x === "berase") { S.brush.erase = !S.brush.erase; renderPanel(); return; }
    if (x === "hold") { a.draw.hold = !a.draw.hold; keep(); renderPanel(); return; }
    if (x === "onion") { S.onion = !S.onion; renderPanel(); return; }
    if (x === "dcopy") { var pf = -1; Object.keys(a.draw.frames).forEach(function (k) { k = +k; if (k < S.f && k > pf) pf = k; }); if (pf < 0) { say(L2("Davor gibt es kein gezeichnetes Bild.", "There is no drawn frame before."), true); return; } pushUndo(); a.draw.frames[S.f] = a.draw.frames[pf]; keep(); renderPanel(); return; }
    if (x === "dclear") { pushUndo(); delete a.draw.frames[S.f]; keep(); renderPanel(); return; }
    if (x === "dall") { pushUndo(); a.draw.frames = {}; S.drawCache = {}; keep(); renderPanel(); return; }
    if (x === "scene") { S.inclScene = !S.inclScene; S.bakeUrl = null; renderPanel(); return; }
    if (x === "bake") { bake(); return; }
    if (x === "dlpng" && S.bakeUrl) { dl(slug(a.name) + "-sheet.png", S.bakeUrl); return; }
    if (x === "dljson" && S.bakeInfo) { dl(slug(a.name) + "-sheet.json", "data:application/json;charset=utf-8," + encodeURIComponent(JSON.stringify(Object.assign({ sheet: slug(a.name) + "-sheet.png" }, S.bakeInfo), null, 1))); return; }
  }
  function renderPanelLite() { if (S.tab === "anim") { var o = S.host.querySelector('[data-k="kr"]'); if (o) renderPanel(); } }
  function onInput(e) {
    var t = e.target, k = t.dataset.k, a = S.a, L = curLayer(), v = t.value, o = S.host.querySelector('[data-o="' + k + '"]');
    if (t.dataset.lcol && L) { L[t.dataset.lcol] = t.value.toUpperCase(); keep(); return; }
    if (!k) return;
    if (k === "name") { a.name = v.slice(0, 24); keep(); return; }
    if (k === "power" || k === "pp" || k === "acc") { a[k] = +v; if (o) o.textContent = k === "acc" ? v + " %" : v; keep(); return; }
    if (k === "dur") { a.dur = +v; if (o) o.textContent = sec(v); if (S.f >= nF()) setF(nF() - 1); keep(); return; }
    if (k === "frame") { S.playing = false; setF(+v); return; }
    if (k === "kr" || k === "ks") {
      if (performance.now() - (S.uT || 0) > 700) pushUndo(); S.uT = performance.now();
      keyAt(S.trk, S.f, k === "kr" ? { r: +v } : { s: +v }); if (o) o.textContent = k === "kr" ? v + "°" : Math.round(v * 100) + "%"; return;
    }
    if (k === "lname" && L) { L.name = v.slice(0, 24); keep(); return; }
    if ((k === "lt0" || k === "lt1") && L) { L[k.slice(1)] = +v; if (o) o.textContent = sec(v); keep(); return; }
    if (k.indexOf("lp_") === 0 && L) { L[k.slice(3)] = +v; if (o) o.textContent = v; keep(); return; }
    if (k === "lseed" && L) { L.seed = Math.max(1, Math.min(99999, Math.round(+v || 1))); keep(); return; }
    if (k === "bsize") { S.brush.size = +v; if (o) o.textContent = v; return; }
  }
  function onChange(e) {
    var t = e.target, k = t.dataset.k, a = S.a, L = curLayer();
    if (t.dataset.lcol) { renderPanel(); return; }
    if (k === "pick") { var q = AT.byId(t.value); if (!q) return; S.a = AT.sanitize(JSON.parse(JSON.stringify(q))); S.layer = S.a.layers.length ? 0 : -1; S.trk = { k: "atk" }; S.drawCache = {}; S.undo = []; setF(0); keep(); say(L2("Geladen: ", "Loaded: ") + q.name); renderPanel(); return; }
    if (k === "el") { a.el = +t.value; keep(); return; }
    if (k === "testA" || k === "testB") { a.test[k === "testA" ? 0 : 1] = t.value; S.sprites = null; keep(); return; }
    if (k === "lstyle" && L) { pushUndo(); var st = AT.style(t.value); L.style = st.id; L.c1 = st.c1; L.c2 = st.c2; L.grav = st.grav; L.turb = st.turb; keep(); renderPanel(); return; }
    if (k === "bcol") { S.brush.c = t.value.toUpperCase(); S.brush.erase = false; renderPanel(); return; }
    if (k === "dur" || k === "lt0" || k === "lt1") { renderPanel(); return; }
    if (k === "file") {
      var f = t.files && t.files[0]; if (!f) return; var rd = new FileReader();
      rd.onload = function () { try { var n = AT.importList(rd.result); say(L2("Liste importiert: ", "List imported: ") + n + L2(" Attacken (die vorige Liste liegt als Sicherung im Browser).", " attacks (the previous list is kept as a backup in the browser).")); renderPanel(); } catch (err) { say(L2("Das ist keine Attackenliste.", "This is not an attack list."), true); } };
      rd.readAsText(f); t.value = "";
    }
  }

  // ---------- Abspielen und Aufnahme ----------
  function togglePlay() { S.playing = !S.playing; if (S.playing && S.f >= nF() - 1) setF(0); S.time = S.f / FPS; syncTransport(); }
  function startRec() {
    if (!trackOf(S.trk)) { say(L2("Erst eine Spur wählen.", "Pick a track first."), true); return; }
    pushUndo(); var tr = trackOf(S.trk); tr.mode = "smooth";
    if (S.f >= nF() - 1) setF(0);
    S.rec = { sel: S.trk, last: null }; S.playing = true; S.time = S.f / FPS;
    say(L2("Aufnahme läuft – Maustaste im Bild gedrückt halten und bewegen.", "Recording – hold the mouse button in the view and move.")); renderPanel();
  }
  function stopRec() { S.rec = null; S.playing = false; keep(); say(L2("Aufnahme beendet.", "Recording stopped.")); renderPanel(); }
  function recSample(I) {
    var r = S.rec, sel = r.sel, onC = I.mx >= 0 && I.my >= 0 && I.mx < 480 && I.my < 254;
    if (!I.lmb || !onC) { r.last = null; r.grab = null; return; }
    var cur = curVal(sel, S.f), isMon = sel.k === "atk" || sel.k === "def";
    if (!r.grab) { var b = isMon ? monBox(sel.k, S.f) : null; r.grab = isMon ? { x: I.mx - cur.x, y: I.my - cur.y } : { x: 0, y: 0 }; }
    var v = { x: I.mx - r.grab.x, y: I.my - r.grab.y }, tr = trackOf(sel);
    if (r.last && S.f > r.last.f + 1) for (var f = r.last.f + 1; f < S.f; f++) { var u = (f - r.last.f) / (S.f - r.last.f); AT.setKey(tr, f, { x: r.last.x + (v.x - r.last.x) * u, y: r.last.y + (v.y - r.last.y) * u, r: cur.r, s: cur.s }); }
    AT.setKey(tr, S.f, { x: v.x, y: v.y, r: cur.r, s: cur.s }); r.last = { f: S.f, x: v.x, y: v.y };
  }

  // ---------- Bedienung im Bild ----------
  function onCanvas(I) { return I.mx >= 0 && I.my >= 0 && I.mx < 480 && I.my < 272; }
  function inStrip(I) { return S.overlay && I.my >= 254 && I.my < 272 && I.mx >= 0 && I.mx < 480; }
  function stripF(mx) { return Math.round((mx - 8) / 464 * (nF() - 1)); }
  function paintStroke(I, dx, dy) {
    var P = S.paint, a = S.a;
    if (I.lmbHit || I.rmbHit) {
      if (!P || P.f !== S.f) { pushUndo(); var cv = MA.canvas(240, 136), src = a.draw.frames[S.f] ? drawCanvas(S.f) : null; if (src) cv.ctx.drawImage(src, 0, 0); S.paint = P = { f: S.f, cv: cv, last: null }; }
      P.erase = I.rmbHit || S.brush.erase; P.last = null; P.down = true;
    }
    if (P && P.down && (I.lmb || I.rmb)) {
      var x = Math.floor(I.mx / 2), y = Math.floor(I.my / 2), g = P.cv.ctx, s = S.brush.size, L0 = P.last || { x: x, y: y }, n = Math.max(Math.abs(x - L0.x), Math.abs(y - L0.y));
      g.fillStyle = S.brush.c;
      for (var i = 0; i <= n; i++) { var xx = Math.round(L0.x + (x - L0.x) * (n ? i / n : 0)) - Math.floor(s / 2), yy = Math.round(L0.y + (y - L0.y) * (n ? i / n : 0)) - Math.floor(s / 2); if (P.erase) g.clearRect(xx, yy, s, s); else g.fillRect(xx, yy, s, s); }
      P.last = { x: x, y: y };
    }
    if (P && P.down && !I.lmb && !I.rmb) { P.down = false; var u = P.cv.toDataURL(); a.draw.frames[P.f] = u; S.drawCache[P.f] = { u: u, cv: P.cv }; S.paint = null; keep(); renderPanel(); }
  }
  function canvasUpdate(I, dx, dy) {
    var mx = I.mx, my = I.my, now = performance.now();
    if (S.scrub || (I.lmbHit && inStrip(I))) { if (I.lmb) { S.scrub = true; S.playing = false; setF(stripF(mx)); } else S.scrub = false; return; }
    if (S.rec) { recSample(I); return; }
    if (S.tool === "draw") { if (onCanvas(I) || S.paint) paintStroke(I, dx, dy); return; }
    var hov = !S.drag && onCanvas(I) ? hoverAt(mx, my) : null; if (!S.drag) S.hov = hov;
    if (I.wheel && hov && hov.mon) { if (now - (S.uT || 0) > 700) pushUndo(); S.uT = now; var v = monXf(hov.sel.k, S.f); keyAt(hov.sel, S.f, { s: Math.max(0.2, Math.min(3, v.s * Math.pow(1.06, -I.wheel))) }); S.trk = hov.sel; renderPanel(); }
    if (I.rmbHit && hov) { var tr = trackOf(hov.sel); if (tr && AT.delKey(tr, S.f)) { pushUndo(); keep(); say(L2("Key gelöscht.", "Key deleted.")); renderPanel(); } }
    if (I.lmbHit && hov) {
      pushUndo(); S.trk = hov.sel; var cur = curVal(hov.sel, S.f);
      S.drag = { sel: hov.sel, gx: mx - cur.x, gy: my - cur.y, r0: cur.r, mx0: mx, rot: I.down("Shift") }; S.playing = false; renderPanel();
    }
    if (S.drag && I.lmb && (dx || dy)) {
      var d = S.drag;
      if (d.rot && (d.sel.k === "atk" || d.sel.k === "def")) keyAt(d.sel, S.f, { r: Math.max(-180, Math.min(180, d.r0 + (mx - d.mx0) * 1.5)) });
      else keyAt(d.sel, S.f, { x: mx - d.gx, y: my - d.gy });
    }
    if (S.drag && !I.lmb) { S.drag = null; renderPanel(); }
  }

  // ---------- Hilfen zeichnen ----------
  function txt(g, t, x, y, col) { g.font = "600 9px system-ui, sans-serif"; g.textBaseline = "top"; g.fillStyle = "rgba(28,29,28,.75)"; var w = g.measureText(t).width; g.fillRect(x - 3, y - 2, w + 6, 13); g.fillStyle = col || "#F2EEE6"; g.fillText(t, x, y); }
  function drawOverlay(g) {
    var n = nF(), f = S.f, sel = S.trk;
    if (S.tool === "draw") {
      if (S.onion && S.f > 0) { var pv = null, pf = -1; Object.keys(S.a.draw.frames).forEach(function (k) { k = +k; if (k < f && k > pf) pf = k; }); if (pf >= 0 && !S.a.draw.frames[f]) pv = null; if (pf >= 0) pv = drawCanvas(pf); if (pv && pf !== f) { g.save(); g.globalAlpha = 0.3; g.imageSmoothingEnabled = false; g.drawImage(pv, 0, 0, 480, 272); g.restore(); } }
      txt(g, L2("Zeichnen · Bild ", "Draw · frame ") + (f + 1) + "/" + n + (S.a.draw.frames[f] ? "" : L2(" (leer)", " (empty)")), 8, 238);
    } else {
      // Bewegungspfad der gewählten Spur
      var tr = trackOf(sel);
      if (tr && tr.k.length) {
        g.strokeStyle = "rgba(255,255,255,.55)"; g.lineWidth = 1; g.beginPath();
        for (var i = 0; i < n; i++) { var v = curVal(sel, i), p = sel.k === "L" ? v : (function () { var b = monBox(sel.k, i); return { x: b.cx, y: b.cy }; })(); if (i) g.lineTo(p.x, p.y); else g.moveTo(p.x, p.y); }
        g.stroke();
        tr.k.forEach(function (k) { if (k.f >= n) return; var v = curVal(sel, k.f), p = sel.k === "L" ? v : (function () { var b = monBox(sel.k, k.f); return { x: b.cx, y: b.cy }; })(); g.fillStyle = k.f === f ? "#ED6A5E" : "#F2EEE6"; g.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 1, 3, 3); });
      }
      handles().forEach(function (o) {
        var act = sameSel(o.sel, sel), hv = S.hov && sameSel(S.hov.sel, o.sel);
        if (o.mon) { if (act || hv) { g.strokeStyle = act ? "rgba(237,106,94,.9)" : "rgba(255,255,255,.6)"; g.lineWidth = 1; g.strokeRect(Math.round(o.x - o.w) + 0.5, Math.round(o.y - o.h) + 0.5, Math.round(o.w * 2), Math.round(o.h * 2)); } return; }
        g.fillStyle = "#1C1D1C"; g.beginPath(); g.arc(o.x, o.y, hv ? 8 : 7, 0, 6.283); g.fill();
        g.fillStyle = o.lab === "S" ? "#7ED67E" : "#ED6A5E"; g.beginPath(); g.arc(o.x, o.y, hv ? 6.5 : 5.5, 0, 6.283); g.fill();
        g.fillStyle = "#1C1D1C"; g.font = "bold 8px system-ui"; g.textBaseline = "middle"; g.fillText(o.lab, o.x - 2.5, o.y + 0.5);
      });
      txt(g, (S.rec ? "● " + L2("AUFNAHME", "REC") + " · " : "") + selName(sel) + " · " + L2("Bild ", "frame ") + (f + 1) + "/" + n + " · " + (f / FPS).toFixed(2) + " s" + (S.speed !== 1 ? " · " + (S.speed === 0.5 ? "½×" : "¼×") : ""), 8, 238, S.rec ? "#FF9A8E" : null);
    }
    // Zeitleiste
    var y0 = 254, x0 = 8, ww = 464;
    g.fillStyle = "rgba(28,29,28,.82)"; g.fillRect(0, y0, 480, 18);
    S.a.layers.forEach(function (L, i) { var a = x0 + L.t0 / S.a.dur * ww, b = x0 + Math.min(L.t1, S.a.dur) / S.a.dur * ww; g.fillStyle = i === S.layer ? "rgba(98,146,158,.95)" : "rgba(98,146,158,.4)"; g.fillRect(a, y0 + 2 + (i % 3) * 2, Math.max(1, b - a), 2); });
    for (var q = 0; q < n; q++) { var x = x0 + q / (n - 1) * ww; g.fillStyle = q % FPS === 0 ? "#ACA89F" : "#4A4C4A"; g.fillRect(Math.round(x), y0 + (q % FPS === 0 ? 9 : 12), 1, q % FPS === 0 ? 9 : 4); }
    var trk = trackOf(sel); if (trk) trk.k.forEach(function (k) { if (k.f >= n) return; var x = x0 + k.f / (n - 1) * ww; g.fillStyle = "#E8C547"; g.beginPath(); g.moveTo(x, y0 + 9); g.lineTo(x + 3, y0 + 12); g.lineTo(x, y0 + 15); g.lineTo(x - 3, y0 + 12); g.fill(); });
    Object.keys(S.a.draw.frames).forEach(function (k) { k = +k; if (k >= n) return; var x = x0 + k / (n - 1) * ww; g.fillStyle = "#B8A8F0"; g.fillRect(Math.round(x) - 1, y0 + 15, 3, 2); });
    var px = x0 + f / (n - 1) * ww; g.fillStyle = "#ED6A5E"; g.fillRect(Math.round(px) - 1, y0, 2, 18);
  }

  MA.attackEditor = {
    mount: function (host, api) {
      ensure(); S.host = host; S.api = api; S.sprites = null;
      if (!host.__ae) {
        host.__ae = 1;
        ["click", "input", "change"].forEach(function (ev) {
          host.addEventListener(ev, function (e) { if (S.host !== host || !e.target.closest(".ma-ae")) return; e.stopPropagation(); (ev === "click" ? onClick : ev === "input" ? onInput : onChange)(e); });
        });
      }
      if (!window.__maAeKeys) { window.__maAeKeys = 1; window.addEventListener("keydown", function (e) { var t = e.target; if ((e.ctrlKey || e.metaKey) && (e.key === "z" || e.key === "Z") && !(t && /INPUT|TEXTAREA|SELECT/.test(t.tagName))) { if (S) S.ctrlZ = 1; } }); }
      renderPanel();
    },
    update: function (dt) {
      if (!S) return;
      var I = MA.input, dx = I.mx - S.pmx, dy = I.my - S.pmy; S.pmx = I.mx; S.pmy = I.my;
      var typing = document.activeElement && /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName) && document.activeElement.type !== "range";
      if (!typing) {
        if (S.ctrlZ) { S.ctrlZ = 0; undo(); }
        if (I.hit(" ")) togglePlay();
        if (I.hit("ArrowLeft") || I.hit(",")) { S.playing = false; setF(S.f - 1); renderPanelLite(); }
        if (I.hit("ArrowRight") || I.hit(".")) { S.playing = false; setF(S.f + 1); renderPanelLite(); }
        if (I.hit("Home")) { S.playing = false; setF(0); }
        if (I.hit("h")) { S.overlay = !S.overlay; renderPanel(); }
        if (I.hit("k") && S.tool !== "draw") { pushUndo(); keyAt(S.trk, S.f, {}); renderPanel(); }
        if (I.hit("r") && S.tool !== "draw") { if (S.rec) stopRec(); else startRec(); }
        if (I.hit("Delete") && S.tool !== "draw") { var tr = trackOf(S.trk); if (tr) { pushUndo(); AT.delKey(tr, S.f); keep(); renderPanel(); } }
      }
      if (S.playing) {
        S.time += dt * S.speed; var f = Math.floor(S.time * FPS + 1e-6);
        if (f >= nF()) { if (S.rec) { f = nF() - 1; S.f = f; recSample(I); stopRec(); return; } if (S.loop) { S.time = 0; f = 0; } else { f = nF() - 1; S.playing = false; } }
        if (f !== S.f) { S.f = f; syncTransport(); }
      }
      canvasUpdate(I, dx, dy);
    },
    render: function (ctx) {
      ensure();
      ctx.fillStyle = "#1C1D1C"; ctx.fillRect(0, 0, 480, 272);
      renderScene(ctx, S.f, {});
      if (S.overlay || S.rec || S.tool === "draw") drawOverlay(ctx);
    },
    _dbg: function () { return S; }
  };
})();
