/* Monsters Arc – attackfx.js (seit v0.27)
   Attacken: Datensatz, Attackenliste (localStorage `monstersarc.attacks.v1`, als eine .json-Datei export-/importierbar)
   und das Effekt-Kit für die Animationen: kleine Physik-Simulationen (Schwerkraft, Luftwiderstand, Wirbel), die in einem
   groben Pixelpuffer gezeichnet werden (Kugeln mit Licht von oben links, 3 Tonstufen, Umriss, Raster-Transparenz) –
   dadurch haben die Effekte denselben Look wie die Monster.
   Alles ist deterministisch (Seed): Ein Bild hängt nur von der Zeit ab, deshalb kann man frei vor- und zurückspulen
   und am Ende jedes Bild in der gewünschten Pixelauflösung „backen“ (Sprite-Sheet).

   Attacke: { id, name, el (Element-Index aus monsters.js), cat: "near"|"far", power (0–250), pp (1–40), acc (30–100), sure (trifft immer),
     dur (1–4 s), px (Effekt-Pixelgröße 1–4), test: [Angreifer-ID, Ziel-ID],
     tracks: { atk, def },                      // Bewegung von Angreifer und Ziel: { mode, k: [{ f, x, y, r, s }] } (x/y = Versatz in px, r = Grad, s = Maßstab)
     layers: [{ id, type, name, on, style, c1, c2, t0, t1, n, size, speed, grav, turb, spread, width, arc, life, seed, E, T }],   // E/T = Start-/Zielpfad (Spuren wie oben, x/y absolut)
     draw: { hold, frames: { Bildnummer: PNG-data-URL } } }  // gezeichnete Bilder (240 × 136)
   Koordinaten: Kampfszene 480 × 272, Angreifer (Rücken) unten links, Ziel oben rechts. 20 Bilder pro Sekunde. */
(function () {
  var MA = window.MA, L2 = MA.L2, KEY = "monstersarc.attacks.v1", FPS = 20, W = 480, H = 272;
  var A0 = { x: 150, y: 192 }, T0 = { x: 352, y: 96 };   // Startpunkt (Maul des Angreifers) und Zielpunkt (Mitte des Ziels)

  // ---------- Muster (Element-Verarbeitung) ----------
  var STYLES = [
    { id: "fire", n: ["Feuer", "Fire"], c1: "#FFE070", c2: "#E0401C", shape: "blob", grav: -70, turb: 45, age: 1, glow: 1 },
    { id: "water", n: ["Wasser", "Water"], c1: "#C8ECFF", c2: "#2E6EC8", shape: "drop", grav: 260, turb: 6 },
    { id: "leaf", n: ["Blatt", "Leaf"], c1: "#B0E070", c2: "#3A8430", shape: "leaf", grav: 40, turb: 35, spin: 7 },
    { id: "stone", n: ["Stein", "Stone"], c1: "#CDB890", c2: "#6A5640", shape: "rock", grav: 520, turb: 0, spin: 5 },
    { id: "electric", n: ["Blitz", "Electric"], c1: "#FFFFC8", c2: "#F0C020", shape: "spark", grav: 0, turb: 0, glow: 1 },
    { id: "ice", n: ["Eis", "Ice"], c1: "#F4FCFF", c2: "#6EC0E8", shape: "shard", grav: 80, turb: 4, spin: 3 },
    { id: "poison", n: ["Gift", "Poison"], c1: "#E8B0F8", c2: "#7A3898", shape: "bubble", grav: -40, turb: 22 },
    { id: "psychic", n: ["Psycho", "Psychic"], c1: "#FFC8E8", c2: "#C83C8C", shape: "ring", grav: 0, turb: 8, glow: 1 },
    { id: "ghost", n: ["Geist", "Ghost"], c1: "#C8B0F8", c2: "#3A2868", shape: "wisp", grav: -25, turb: 30 },
    { id: "dark", n: ["Unlicht", "Dark"], c1: "#8C7C8C", c2: "#1E1620", shape: "wisp", grav: 0, turb: 22 },
    { id: "wind", n: ["Wind", "Wind"], c1: "#FFFFFF", c2: "#B4CCE0", shape: "streak", grav: 0, turb: 18 },
    { id: "energy", n: ["Energie", "Energy"], c1: "#FFFFFF", c2: "#E8D49C", shape: "star", grav: 0, turb: 8, glow: 1 },
    { id: "steel", n: ["Stahl", "Steel"], c1: "#F4F4FA", c2: "#7C84A0", shape: "shard", grav: 240, turb: 0, spin: 6 },
    { id: "dragon", n: ["Drache", "Dragon"], c1: "#D0B8FF", c2: "#4C2CC0", shape: "blob", grav: -45, turb: 38, age: 1, glow: 1 },
    { id: "earth", n: ["Erde", "Earth"], c1: "#E0C890", c2: "#8A6A3C", shape: "rock", grav: 380, turb: 10, spin: 4 },
    { id: "punch", n: ["Schlag", "Impact"], c1: "#FFF4D0", c2: "#E06030", shape: "star", grav: 0, turb: 0, glow: 1 }
  ];
  // Element (monsters.js) → Muster: Normal, Feuer, Wasser, Pflanze, Elektro, Eis, Kampf, Gift, Boden, Flug, Psycho, Käfer, Gestein, Geist, Drache, Unlicht, Stahl
  var EL_STYLE = ["energy", "fire", "water", "leaf", "electric", "ice", "punch", "poison", "earth", "wind", "psychic", "leaf", "stone", "ghost", "dragon", "dark", "steel"];
  function style(id) { for (var i = 0; i < STYLES.length; i++) if (STYLES[i].id === id) return STYLES[i]; return STYLES[11]; }

  var TYPES = [
    { id: "beam", n: ["Strahl", "Beam"], d: { t0: 0.3, t1: 1.6, n: 60, size: 4, speed: 420, width: 8, life: 0.6 } },
    { id: "volley", n: ["Mehrere Bälle", "Volley"], d: { t0: 0.2, t1: 1.2, n: 4, size: 6, speed: 360, arc: 40, life: 0.5 } },
    { id: "orb", n: ["Kugel", "Orb"], d: { t0: 0.2, t1: 1.6, n: 24, size: 12, speed: 0, life: 0.6 } },
    { id: "vortex", n: ["Wirbel", "Vortex"], d: { t0: 0.3, t1: 1.8, n: 90, size: 4, speed: 60, width: 90, life: 1.0 } },
    { id: "fountain", n: ["Fontäne", "Fountain"], d: { t0: 0.3, t1: 1.4, n: 90, size: 4, speed: 300, spread: 30, life: 1.1 } },
    { id: "rain", n: ["Regen", "Rain"], d: { t0: 0.2, t1: 1.6, n: 80, size: 3, speed: 260, width: 140, life: 1.0 } },
    { id: "burst", n: ["Explosion", "Burst"], d: { t0: 0.9, t1: 1.0, n: 40, size: 5, speed: 260, life: 0.6 } },
    { id: "flash", n: ["Blitzlicht", "Flash"], d: { t0: 0.9, t1: 1.1, n: 0, size: 0, speed: 0, width: 70 } },
    { id: "shake", n: ["Wackeln", "Shake"], d: { t0: 0.9, t1: 1.3, n: 0, size: 6, speed: 0 } }
  ];
  function type(id) { for (var i = 0; i < TYPES.length; i++) if (TYPES[i].id === id) return TYPES[i]; return TYPES[0]; }

  // ---------- Keyframe-Spuren ----------
  function sortK(k) { k.sort(function (a, b) { return a.f - b.f; }); return k; }
  function cr(p0, p1, p2, p3, t) { var t2 = t * t, t3 = t2 * t; return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3); }
  // Wert einer Spur bei Bild f (Bruchteile erlaubt). def = Standardwert ohne Keys
  function sample(tr, f, def) {
    var k = tr && tr.k; if (!k || !k.length) return def;
    if (f <= k[0].f) return kv(k[0], def); if (f >= k[k.length - 1].f) return kv(k[k.length - 1], def);
    var i = 0; while (i < k.length - 1 && k[i + 1].f <= f) i++;
    var a = k[i], b = k[i + 1], t = (f - a.f) / Math.max(1e-6, b.f - a.f), m = tr.mode || "smooth";
    if (m === "step") return kv(a, def);
    var o = {};
    ["x", "y", "r", "s"].forEach(function (q) {
      var va = a[q] != null ? a[q] : def[q], vb = b[q] != null ? b[q] : def[q];
      if (m === "smooth" && (q === "x" || q === "y")) { var p = k[i - 1] || a, n = k[i + 2] || b; o[q] = cr(p[q] != null ? p[q] : va, va, vb, n[q] != null ? n[q] : vb, t); }
      else o[q] = va + (vb - va) * t;
    });
    return o;
  }
  function kv(a, def) { return { x: a.x != null ? a.x : def.x, y: a.y != null ? a.y : def.y, r: a.r != null ? a.r : def.r, s: a.s != null ? a.s : def.s }; }
  function setKey(tr, f, v) {
    f = Math.round(f); var k = tr.k, e = null;
    for (var i = 0; i < k.length; i++) if (k[i].f === f) e = k[i];
    if (!e) { e = { f: f }; k.push(e); sortK(k); }
    ["x", "y", "r", "s"].forEach(function (q) { if (v[q] != null) e[q] = Math.round(v[q] * 100) / 100; });
    return e;
  }
  function delKey(tr, f) { var n = tr.k.length; tr.k = tr.k.filter(function (q) { return q.f !== Math.round(f); }); return n !== tr.k.length; }
  function smoothTrack(tr) {
    var k = tr.k; if (k.length < 3) return;
    var c = k.map(function (q) { return { x: q.x, y: q.y, r: q.r, s: q.s }; });
    for (var i = 1; i < k.length - 1; i++) ["x", "y", "r", "s"].forEach(function (q) { if (c[i][q] != null && c[i - 1][q] != null && c[i + 1][q] != null) k[i][q] = (c[i - 1][q] + 2 * c[i][q] + c[i + 1][q]) / 4; });
  }
  function track() { return { mode: "smooth", k: [] }; }

  // ---------- Datensatz ----------
  function clamp(v, a, b, d) { v = +v; return isFinite(v) ? Math.max(a, Math.min(b, v)) : d; }
  function uid() { return "a" + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36); }
  function sTrack(t) {
    var o = { mode: t && (t.mode === "linear" || t.mode === "step") ? t.mode : "smooth", k: [] };
    (t && Array.isArray(t.k) ? t.k : []).slice(0, 500).forEach(function (q) {
      if (!q) return; var e = { f: Math.round(clamp(q.f, 0, 400, 0)) };
      ["x", "y", "r", "s"].forEach(function (z) { if (q[z] != null && isFinite(+q[z])) e[z] = +q[z]; });
      o.k.push(e);
    });
    sortK(o.k); return o;
  }
  function isHex(h) { return typeof h === "string" && /^#[0-9a-f]{6}$/i.test(h); }
  function sLayer(L) {
    L = L || {}; var T = type(L.type), st = style(L.style), d = T.d;
    return { id: typeof L.id === "string" ? L.id.slice(0, 30) : uid(), type: T.id, name: typeof L.name === "string" ? L.name.slice(0, 24) : L2(T.n[0], T.n[1]), on: L.on !== false,
      style: st.id, c1: isHex(L.c1) ? L.c1 : st.c1, c2: isHex(L.c2) ? L.c2 : st.c2,
      t0: clamp(L.t0, 0, 4, d.t0), t1: clamp(L.t1, 0, 4, d.t1), n: Math.round(clamp(L.n, 0, 400, d.n)), size: clamp(L.size, 0, 40, d.size), speed: clamp(L.speed, 0, 1200, d.speed),
      grav: clamp(L.grav, -800, 1200, st.grav), turb: clamp(L.turb, 0, 200, st.turb), spread: clamp(L.spread, 0, 360, d.spread || 40), width: clamp(L.width, 0, 400, d.width || 40),
      arc: clamp(L.arc, -200, 200, d.arc || 0), life: clamp(L.life, 0.1, 3, d.life || 0.8), seed: Math.round(clamp(L.seed, 1, 99999, 1 + Math.floor(Math.random() * 9999))),
      E: sTrack(L.E), T: sTrack(L.T) };
  }
  function sanitize(a) {
    a = a || {};
    var o = { id: typeof a.id === "string" && a.id ? a.id.slice(0, 40) : uid(), name: typeof a.name === "string" ? a.name.slice(0, 24) : "",
      el: Math.round(clamp(a.el, 0, 16, 0)), cat: a.cat === "near" ? "near" : "far", power: Math.round(clamp(a.power, 0, 250, 40)), pp: Math.round(clamp(a.pp, 1, 40, 25)),
      acc: Math.round(clamp(a.acc, 30, 100, 100)), sure: !!a.sure, dur: clamp(a.dur, 1, 4, 2), px: Math.round(clamp(a.px, 1, 4, 2)),
      test: Array.isArray(a.test) ? a.test.slice(0, 2).map(function (x) { return typeof x === "string" ? x.slice(0, 40) : ""; }) : ["", ""],
      tracks: { atk: sTrack(a.tracks && a.tracks.atk), def: sTrack(a.tracks && a.tracks.def) },
      layers: (Array.isArray(a.layers) ? a.layers : []).slice(0, 16).map(sLayer), draw: { hold: !(a.draw && a.draw.hold === false), frames: {} } };
    var fr = a.draw && a.draw.frames;
    if (fr && typeof fr === "object") Object.keys(fr).slice(0, 80).forEach(function (k) { var u = fr[k], f = Math.round(+k); if (typeof u === "string" && u.indexOf("data:image/png;base64,") === 0 && u.length < 300000 && f >= 0 && f <= 80) o.draw.frames[f] = u; });
    return o;
  }
  function frames(a) { return Math.round(a.dur * FPS); }

  // ---------- Liste ----------
  var LIST = null;
  function load() { if (LIST) return LIST; var j = null; try { j = JSON.parse(MA.store.get(KEY) || "null"); } catch (e) {} LIST = (j && Array.isArray(j.list) ? j.list : (MA.ATTACK_LIST || [])).map(sanitize); return LIST; }
  function save() { try { return MA.store.set(KEY, JSON.stringify({ v: 1, list: LIST })); } catch (e) { return false; } }
  function list() { return load(); }
  function byId(id) { var l = load(); for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i]; return null; }
  function put(a) { a = sanitize(a); var l = load(), i = -1; l.forEach(function (q, k) { if (q.id === a.id) i = k; }); if (i >= 0) l[i] = a; else l.push(a); var ok = save(); return ok === false ? null : a; }
  function remove(id) { LIST = load().filter(function (q) { return q.id !== id; }); save(); }
  function exportList() {
    var b = new Blob([JSON.stringify({ format: "monstersarc-attacklist", version: 1, game: MA.VERSION, count: load().length, list: load() }, null, 1)], { type: "application/json" }), u = URL.createObjectURL(b), x = document.createElement("a");
    x.href = u; x.download = "monstersarc-attacken.json"; document.body.appendChild(x); x.click(); setTimeout(function () { URL.revokeObjectURL(u); x.remove(); }, 400);
  }
  function importList(text) {
    var j = JSON.parse(text), arr = Array.isArray(j) ? j : j && Array.isArray(j.list) ? j.list : null; if (!arr) throw new Error("no list");
    MA.store.set(KEY + ".backup", JSON.stringify({ v: 1, list: load() })); LIST = arr.map(sanitize); save(); return LIST.length;
  }

  // ---------- Pixelpuffer ----------
  var BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  function hx(h) { var n = parseInt(String(h).slice(1), 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function Buf(w, h) { this.w = w; this.h = h; this.img = new ImageData(w, h); this.d = this.img.data; }
  Buf.prototype.px = function (x, y, c, a) {
    x = x | 0; y = y | 0; if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    if (a != null && a < 1 && a <= BAY[(y & 3) * 4 + (x & 3)] / 16) return;   // Raster-Transparenz
    var o = (y * this.w + x) * 4; this.d[o] = c[0]; this.d[o + 1] = c[1]; this.d[o + 2] = c[2]; this.d[o + 3] = 255;
  };
  var LX = -0.5, LY = -0.6, LZ = 0.62;
  function tones(c) { return { hi: mix(c, [255, 255, 255], 0.5), base: c, sh: mix(c, [30, 22, 50], 0.42), out: mix(c, [12, 8, 22], 0.66) }; }
  function ball(B, cx, cy, r, c, o) {   // beleuchtete Kugel mit 3 Tönen und Umriss
    o = o || {}; var T = tones(c), a = o.a, R = Math.max(0.5, r), ol = !o.noOut && R >= 2.5;
    for (var y = Math.floor(cy - R - 1); y <= Math.ceil(cy + R + 1); y++) for (var x = Math.floor(cx - R - 1); x <= Math.ceil(cx + R + 1); x++) {
      var dx = (x + 0.5 - cx) / R, dy = (y + 0.5 - cy) / R; if (o.sx) { dx /= o.sx; } if (o.sy) { dy /= o.sy; }
      if (o.ang) { var ca = Math.cos(-o.ang), sa = Math.sin(-o.ang), t = dx * ca - dy * sa; dy = dx * sa + dy * ca; dx = t; }
      var d2 = dx * dx + dy * dy; if (d2 > 1) continue;
      if (ol && d2 > Math.pow(1 - 1.2 / R, 2)) { B.px(x, y, T.out, a); continue; }
      var l = LX * dx + LY * dy + LZ * Math.sqrt(1 - d2);
      B.px(x, y, o.flat ? c : l > 0.72 ? T.hi : l > 0.28 ? T.base : T.sh, a);
    }
  }
  function soft(B, cx, cy, r, c, a) {   // weicher Fleck (Glühen, Rauch) über Raster-Transparenz
    var R = Math.max(0.6, r);
    for (var y = Math.floor(cy - R); y <= Math.ceil(cy + R); y++) for (var x = Math.floor(cx - R); x <= Math.ceil(cx + R); x++) {
      var d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / R; if (d > 1) continue; B.px(x, y, c, a * (1 - d * d));
    }
  }
  function line(B, x0, y0, x1, y1, w, c, a) { var n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2)); for (var i = 0; i <= n; i++) { var t = i / n; disc(B, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, w / 2, c, a); } }
  function disc(B, cx, cy, r, c, a) { if (r < 0.75) { B.px(cx, cy, c, a); return; } for (var y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (var x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) if (Math.pow(x + 0.5 - cx, 2) + Math.pow(y + 0.5 - cy, 2) <= r * r) B.px(x, y, c, a); }
  function poly(B, pts, c, a, facet) {   // gefülltes Vieleck; facet = Flächen je Dreieck vom Mittelpunkt schattieren
    var x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, cx = 0, cy = 0, T = tones(c);
    pts.forEach(function (p) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); cx += p[0] / pts.length; cy += p[1] / pts.length; });
    for (var y = Math.floor(y0); y <= Math.ceil(y1); y++) for (var x = Math.floor(x0); x <= Math.ceil(x1); x++) {
      var px = x + 0.5, py = y + 0.5, inn = false, edge = 1e9;
      for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        var A = pts[i], Bq = pts[j];
        if ((A[1] > py) !== (Bq[1] > py) && px < (Bq[0] - A[0]) * (py - A[1]) / (Bq[1] - A[1]) + A[0]) inn = !inn;
        var ex = Bq[0] - A[0], ey = Bq[1] - A[1], l2 = ex * ex + ey * ey || 1, t = Math.max(0, Math.min(1, ((px - A[0]) * ex + (py - A[1]) * ey) / l2));
        edge = Math.min(edge, Math.hypot(px - A[0] - ex * t, py - A[1] - ey * t));
      }
      if (!inn) continue;
      var col = T.base;
      if (edge < 0.9 && x1 - x0 > 3) col = T.out;
      else if (facet) { var ang = Math.atan2(py - cy, px - cx), l = -Math.cos(ang - 3.93); col = l > 0.35 ? T.hi : l > -0.35 ? T.base : T.sh; }
      B.px(x, y, col, a);
    }
  }

  // ---------- Simulation ----------
  function h(i, k, s) { return MA.hash2(i * 7 + k, k * 13 + i, s); }
  function integ(p, v, age, grav, turb, drag, ph) {
    var steps = Math.max(1, Math.ceil(age * 30)), dt = age / steps, x = p.x, y = p.y, vx = v.x, vy = v.y, tt = 0;
    for (var i = 0; i < steps; i++) {
      tt += dt; vx += Math.sin(tt * 3.1 + ph) * turb * dt * 3; vy += (grav + Math.cos(tt * 2.3 + ph * 1.7) * turb * 2) * dt;
      var dd = 1 - drag * dt; vx *= dd; vy *= dd; x += vx * dt; y += vy * dt;
    }
    return { x: x, y: y, vx: vx, vy: vy };
  }
  // Partikel einer Ebene zum Zeitpunkt t (s). ctx.E(f)/ctx.T(f) liefern Start-/Zielpunkt bei Bild f.
  function particles(L, t, ctx) {
    var out = [], st = style(L.style), n = L.n, f = t * FPS, dur = Math.max(0.05, L.t1 - L.t0), c1 = hx(L.c1), c2 = hx(L.c2);
    function col(r, age01) {
      if (st.age) { var c = mix(c1, c2, Math.min(1, age01 * 1.3)); return age01 > 0.75 ? mix(c, [60, 50, 60], (age01 - 0.75) * 2.4) : c; }
      return mix(c1, c2, 0.25 + r * 0.6);
    }
    function push(o) { out.push(o); }
    var E = ctx.E(f), Tt = ctx.T(f), i, r1, r2, r3, ts, age, P;
    if (L.type === "fountain" || L.type === "burst" || L.type === "rain") {
      for (i = 0; i < n; i++) {
        r1 = h(i, 1, L.seed); r2 = h(i, 2, L.seed); r3 = h(i, 3, L.seed);
        ts = L.type === "burst" ? L.t0 + r3 * 0.06 : L.t0 + (i + r3) / n * dur; age = t - ts;
        var life = L.life * (0.7 + 0.6 * r2); if (age < 0 || age > life) continue;
        var e = ctx.E(ts * FPS), p0, v0, drag = L.type === "burst" ? 3 : 0.4;
        if (L.type === "fountain") { var an = (-90 + (r1 - 0.5) * L.spread) * Math.PI / 180, sp = L.speed * (0.75 + 0.5 * r2); p0 = { x: e.x, y: e.y }; v0 = { x: Math.cos(an) * sp, y: Math.sin(an) * sp }; }
        else if (L.type === "burst") { var a2 = r1 * 6.283, s2 = L.speed * (0.35 + 0.65 * r2); p0 = { x: e.x, y: e.y }; v0 = { x: Math.cos(a2) * s2, y: Math.sin(a2) * s2 * 0.75 }; }
        else { var tg = ctx.T(ts * FPS); p0 = { x: tg.x + (r1 - 0.5) * L.width, y: tg.y - 150 - r2 * 50 }; v0 = { x: (L.spread - 40) * 0.5, y: L.speed }; }
        P = integ(p0, v0, age, L.grav, L.turb, drag, r1 * 6.283);
        if (L.type === "rain") { var gy = ctx.T(ts * FPS).y + 28 + r3 * 10; if (P.y > gy) { push({ k: "splash", x: P.x, y: gy, r: L.size, a: 1, c: col(r1, 0.2) }); continue; } }
        push({ x: P.x, y: P.y, vx: P.vx, vy: P.vy, r: L.size * (0.6 + 0.6 * r3) * (st.age ? 1 - 0.4 * age / life : 1), ang: r1 * 6.283 + (st.spin || 0) * age * (r2 - 0.5) * 2, a: 1 - Math.max(0, age / life - 0.7) / 0.3, c: col(r2, age / life), seed: i, age: age });
      }
    } else if (L.type === "vortex") {
      for (i = 0; i < n; i++) {
        r1 = h(i, 1, L.seed); r2 = h(i, 2, L.seed); r3 = h(i, 3, L.seed); ts = L.t0 + (i + r3) / n * dur; age = t - ts; var lf = L.life * (0.7 + 0.6 * r2); if (age < 0 || age > lf) continue;
        var ang = r1 * 6.283 + age * (4 + L.turb * 0.05) * (0.8 + 0.4 * r2), rad = L.width / 2 * (0.35 + 0.65 * r3) * Math.min(1, age * 3 + 0.2), z = Math.sin(ang);
        push({ x: E.x + Math.cos(ang) * rad, y: E.y + z * rad * 0.32 - age * L.speed + 20, vx: -Math.sin(ang) * 80, vy: 0, r: L.size * (0.7 + 0.3 * z) * (0.7 + 0.5 * r2), z: z, ang: ang, a: 1 - Math.max(0, age / lf - 0.7) / 0.3, c: col(r2, age / lf), seed: i, age: age });
      }
      out.sort(function (a, b) { return a.z - b.z; });
    } else if (L.type === "beam") {
      if (t < L.t0 || t > L.t1 + 0.15) return out;
      var len = Math.max(1, Math.hypot(Tt.x - E.x, Tt.y - E.y)), head = Math.min(1, (t - L.t0) / Math.max(0.05, Math.min(0.4, dur * 0.3))), fade = t > L.t1 ? 1 - (t - L.t1) / 0.15 : 1;
      push({ k: "beam", x: E.x, y: E.y, x2: E.x + (Tt.x - E.x) * head, y2: E.y + (Tt.y - E.y) * head, w: L.width * fade * (t > L.t1 ? 1 : 1), a: fade, f: f });
      var nx = -(Tt.y - E.y) / len, ny = (Tt.x - E.x) / len;
      for (i = 0; i < n; i++) {
        r1 = h(i, 1, L.seed); r2 = h(i, 2, L.seed); r3 = h(i, 3, L.seed);
        var u = (r1 + (t - L.t0) * L.speed / len * (0.7 + 0.6 * r2)) % 1; if (u > head) continue;
        var wob = (r3 - 0.5) * L.width * 1.2 + Math.sin(u * 12 + t * 9 + i) * L.turb * 0.08;
        push({ x: E.x + (Tt.x - E.x) * u + nx * wob, y: E.y + (Tt.y - E.y) * u + ny * wob, vx: (Tt.x - E.x) / len * L.speed, vy: (Tt.y - E.y) / len * L.speed, r: L.size * (0.5 + 0.7 * r2), ang: u * 20 + r1 * 6, a: fade, c: col(r2, u), seed: i, age: u });
      }
      if (head >= 1) for (i = 0; i < 6; i++) { r1 = h(i, 7, L.seed + Math.floor(f / 2)); push({ x: Tt.x + (r1 - 0.5) * L.width * 2.5, y: Tt.y + (h(i, 8, L.seed + Math.floor(f / 2)) - 0.5) * L.width * 2, r: L.size * 0.8, a: fade, c: c1, seed: i + 100, ang: r1 * 6, age: 0.1 }); }
    } else if (L.type === "orb") {
      if (t < L.t0 || t > L.t1 + 0.1) return out;
      var grow = Math.min(1, (t - L.t0) / 0.3), fo = t > L.t1 ? 1 - (t - L.t1) / 0.1 : 1, R = L.size * grow * (1 + 0.08 * Math.sin(t * 14));
      for (var j = 6; j >= 1; j--) { var pe = ctx.E(f - j * 1.2); push({ x: pe.x, y: pe.y, r: R * (1 - j * 0.13), a: fo * (0.6 - j * 0.08), c: c2, seed: 200 + j, ang: 0, age: 0.5, trail: 1 }); }
      push({ k: "orb", x: E.x, y: E.y, r: R, a: fo, c: c1, c2: c2 });
      for (i = 0; i < n; i++) {
        r1 = h(i, 1, L.seed); r2 = h(i, 2, L.seed); ts = L.t0 + (i + r2) / n * dur; age = t - ts; if (age < 0 || age > L.life) continue;
        var aa = r1 * 6.283 + age * 7, rr = R * (1.9 - 1.4 * age / L.life);
        push({ x: E.x + Math.cos(aa) * rr, y: E.y + Math.sin(aa) * rr * 0.6, r: Math.max(1, L.size * 0.25), a: fo, c: col(r2, age / L.life), seed: i, ang: aa, age: age, vx: -Math.sin(aa) * 50, vy: Math.cos(aa) * 30 });
      }
    } else if (L.type === "volley") {
      var K = Math.max(1, n);
      for (i = 0; i < K; i++) {
        r1 = h(i, 1, L.seed); ts = L.t0 + (K > 1 ? i / (K - 1) : 0) * dur * 0.7;
        var e0 = ctx.E(ts * FPS), dist = Math.hypot(T0.x - e0.x, T0.y - e0.y), fl = Math.max(0.2, dist / Math.max(40, L.speed)), t1 = ctx.T((ts + fl) * FPS);
        var uu = (t - ts) / fl; if (uu < 0) continue;
        var spX = (h(i, 4, L.seed) - 0.5) * L.spread * 0.4, spY = (h(i, 5, L.seed) - 0.5) * L.spread * 0.3;
        var pos = (function (e0, t1, spX, spY) { return function (u) { return { x: e0.x + (t1.x + spX - e0.x) * u, y: e0.y + (t1.y + spY - e0.y) * u - Math.sin(Math.PI * u) * L.arc }; }; })(e0, t1, spX, spY);
        if (uu <= 1) {
          for (var q = 5; q >= 1; q--) { var pu = pos(Math.max(0, uu - q * 0.035)); push({ x: pu.x, y: pu.y, r: L.size * (1 - q * 0.14), a: 0.75 - q * 0.12, c: c2, seed: i * 10 + q, ang: 0, age: 0.6, trail: 1 }); }
          var pp = pos(uu), pn = pos(Math.min(1, uu + 0.02));
          push({ x: pp.x, y: pp.y, vx: (pn.x - pp.x) * 50, vy: (pn.y - pp.y) * 50, r: L.size, a: 1, c: c1, seed: i, ang: uu * 12 + r1 * 6, age: 0.05, main: 1 });
        } else if (uu < 1 + 0.35 / fl) {   // Einschlag
          var ia = (t - ts - fl), end = pos(1);
          for (q = 0; q < 7; q++) { var a3 = h(i, 10 + q, L.seed) * 6.283, s3 = 40 + h(i, 20 + q, L.seed) * 70; push({ x: end.x + Math.cos(a3) * s3 * ia, y: end.y + Math.sin(a3) * s3 * ia * 0.7, vx: Math.cos(a3) * s3, vy: Math.sin(a3) * s3, r: L.size * 0.5 * (1 - ia / 0.35), a: 1 - ia / 0.35, c: col(h(i, q, 3), ia / 0.35), seed: i * 20 + q, ang: a3, age: ia }); }
        }
      }
    }
    return out;
  }
  function env(L, t) { if (t < L.t0 || t > L.t1) return 0; return Math.max(0, Math.min(1, (t - L.t0) / 0.06, (L.t1 - t) / 0.1)); }

  // ---------- Zeichnen ----------
  function zig(B, x0, y0, x1, y1, w, seed, c1, c2, a) {   // Blitz-Zickzack
    var n = Math.max(3, Math.round(Math.hypot(x1 - x0, y1 - y0) / 7)), nx = -(y1 - y0), ny = x1 - x0, l = Math.hypot(nx, ny) || 1, px = x0, py = y0; nx /= l; ny /= l;
    for (var i = 1; i <= n; i++) {
      var t = i / n, off = i === n ? 0 : (MA.hash2(i, seed, 77) - 0.5) * w * 2.2, x = x0 + (x1 - x0) * t + nx * off, y = y0 + (y1 - y0) * t + ny * off;
      line(B, px, py, x, y, 2.4, c2, a); line(B, px, py, x, y, 1, c1, a); px = x; py = y;
    }
  }
  function drawP(B, p, st, s, L, f) {   // ein Partikel, s = 1/Pixelgröße
    var x = p.x * s, y = p.y * s, r = Math.max(0.5, p.r * s), a = p.a, c = p.c;
    if (a <= 0.02) return;
    if (p.k === "splash") { line(B, x - r, y, x - r * 2, y - r, 1, c, 0.8); line(B, x + r, y, x + r * 2, y - r, 1, c, 0.8); B.px(x, y - r, c, 0.8); return; }
    if (p.trail) { if (st.shape === "spark" || st.shape === "ring") soft(B, x, y, r, c, a * 0.8); else ball(B, x, y, r * 0.8, c, { a: a, noOut: 1 }); return; }
    if (st.glow && r > 1.2) soft(B, x, y, r * 1.9, hx(L.c2), 0.35 * a);
    switch (st.shape) {
      case "drop": { var sp = Math.hypot(p.vx || 0, p.vy || 0), an = Math.atan2(p.vy || 0, p.vx || 1); ball(B, x, y, r, c, { a: a, sy: 1, sx: 1 + Math.min(1.5, sp / 300), ang: an }); break; }
      case "leaf": ball(B, x, y, r * 1.2, c, { a: a, sx: 1, sy: 0.45, ang: p.ang, flat: 0 }); line(B, x - Math.cos(p.ang) * r, y - Math.sin(p.ang) * r, x + Math.cos(p.ang) * r, y + Math.sin(p.ang) * r, 1, tones(c).sh, a); break;
      case "rock": {
        var pts = []; for (var i = 0; i < 6; i++) { var aa = p.ang + i * 1.047, rr = r * (0.75 + 0.45 * MA.hash2(p.seed, i, 9)); pts.push([x + Math.cos(aa) * rr, y + Math.sin(aa) * rr]); }
        poly(B, pts, c, a, true); break;
      }
      case "shard": { var ca = Math.cos(p.ang), sa = Math.sin(p.ang), q = function (u, v) { return [x + u * ca - v * sa, y + u * sa + v * ca]; }; poly(B, [q(0, -r * 1.5), q(r * 0.55, 0), q(0, r * 1.5), q(-r * 0.55, 0)], c, a, true); B.px(q(0, -r * 1.2)[0], q(0, -r * 1.2)[1], [255, 255, 255], a); break; }
      case "spark": { var an2 = Math.atan2(p.vy || 0.01, p.vx || 1) + (MA.hash2(p.seed, f >> 1, 3) - 0.5) * 2, l2 = r * 2.5; zig(B, x - Math.cos(an2) * l2, y - Math.sin(an2) * l2, x + Math.cos(an2) * l2, y + Math.sin(an2) * l2, r * 0.8, p.seed + (f >> 1) * 31, hx(L.c1), hx(L.c2), a); break; }
      case "bubble": { var T = tones(c); for (var k = 0; k < 24; k++) { var b = k / 24 * 6.283; B.px(x + Math.cos(b) * r, y + Math.sin(b) * r, T.base, a); } soft(B, x, y, r * 0.9, c, 0.3 * a); B.px(x - r * 0.4, y - r * 0.4, [255, 255, 255], a); break; }
      case "ring": { var rr2 = r * (1 + (p.age || 0) * 2); for (var k2 = 0; k2 < 36; k2++) { var b2 = k2 / 36 * 6.283; B.px(x + Math.cos(b2) * rr2, y + Math.sin(b2) * rr2 * 0.6, c, a); } break; }
      case "wisp": soft(B, x, y, r * 1.6, c, 0.7 * a); soft(B, x, y, r * 0.8, tones(c).hi, 0.5 * a); break;
      case "streak": { var an3 = Math.atan2(p.vy || 0, p.vx || 1); line(B, x - Math.cos(an3) * r * 2.5, y - Math.sin(an3) * r * 2.5, x + Math.cos(an3) * r * 2.5, y + Math.sin(an3) * r * 2.5, Math.max(1, r * 0.5), c, a * 0.85); break; }
      case "star": { var T2 = tones(c), rs = Math.max(1, Math.round(r)); for (var k3 = -rs; k3 <= rs; k3++) { B.px(x + k3, y, Math.abs(k3) < rs / 2 ? T2.hi : c, a); B.px(x, y + k3, Math.abs(k3) < rs / 2 ? T2.hi : c, a); } if (rs > 2) { B.px(x + 1, y + 1, c, a); B.px(x - 1, y - 1, c, a); B.px(x + 1, y - 1, c, a); B.px(x - 1, y + 1, c, a); } break; }
      default: ball(B, x, y, r, c, { a: a, noOut: !!st.age });
    }
  }
  function drawBeam(B, p, st, s, L) {
    var x0 = p.x * s, y0 = p.y * s, x1 = p.x2 * s, y1 = p.y2 * s, w = Math.max(1, p.w * s), a = p.a, c1 = hx(L.c1), c2 = hx(L.c2), f = p.f, len = Math.hypot(x1 - x0, y1 - y0) || 1, nx = -(y1 - y0) / len, ny = (x1 - x0) / len;
    if (st.shape === "spark") { for (var k = 0; k < 3; k++) zig(B, x0, y0, x1, y1, w * (0.6 + k * 0.3), L.seed + k * 97 + (f >> 1) * 13, c1, c2, a); return; }
    var n = Math.ceil(len), t = f / FPS;
    for (var i = 0; i <= n; i++) {
      var u = i / n, x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u, ww = w;
      if (st.id === "water") { var off = Math.sin(u * 18 - t * 22) * w * 0.25; x += nx * off; y += ny * off; ww = w * (0.85 + 0.15 * Math.sin(u * 30 - t * 30)); }
      else if (st.shape === "blob") ww = w * (0.7 + 0.5 * MA.hash2(i >> 1, f, 5));
      else if (st.shape === "wisp") ww = w * (0.6 + 0.6 * MA.hash2(i >> 2, f >> 1, 6));
      else if (st.shape === "rock" || st.shape === "leaf") ww = w * 0.45;
      if (st.shape === "wisp") { soft(B, x, y, ww / 2 + 1, c2, 0.5 * a); continue; }
      if (st.glow) disc(B, x, y, ww / 2 + 1.5, c2, 0.4 * a);
      disc(B, x, y, ww / 2, c2, a); disc(B, x, y, ww / 3, c1, a); if (ww > 4) disc(B, x, y, ww / 7, [255, 255, 255], a);
    }
    if (st.shape === "ring") for (var r = 0; r < 4; r++) { var uu = ((t * 1.5 + r / 4) % 1), cx = x0 + (x1 - x0) * uu, cy = y0 + (y1 - y0) * uu; for (var k2 = 0; k2 < 30; k2++) { var b = k2 / 30 * 6.283; B.px(cx + Math.cos(b) * w * 0.9, cy + Math.sin(b) * w * 1.2, c1, a); } }
  }
  function drawOrb(B, p, st, s, L) {
    var x = p.x * s, y = p.y * s, r = p.r * s; if (r < 0.5) return;
    soft(B, x, y, r * 1.8, p.c2, 0.45 * p.a);
    if (st.shape === "spark") { for (var k = 0; k < 5; k++) { var a = MA.hash2(k, Math.floor(y + x), 4) * 6.283; zig(B, x, y, x + Math.cos(a) * r * 1.6, y + Math.sin(a) * r * 1.6, r * 0.3, k * 7 + Math.floor(x), p.c, p.c2, p.a); } }
    ball(B, x, y, r, p.c2, { a: p.a, noOut: true }); ball(B, x - r * 0.1, y - r * 0.1, r * 0.7, p.c, { a: p.a, noOut: true });
  }
  // Ebenen zum Zeitpunkt t in den Puffer zeichnen. ps = Pixelgröße (1–4).
  function renderLayers(B, layers, t, ctx, ps) {
    var s = 1 / ps, fx = { flash: null, shake: 0 };
    layers.forEach(function (L) {
      if (!L.on) return; var st = style(L.style);
      if (L.type === "flash") { var e = env(L, t); if (e > 0) fx.flash = { c: hx(L.c1), a: e * L.width / 100 }; return; }
      if (L.type === "shake") { var e2 = env(L, t); fx.shake = Math.max(fx.shake, e2 * L.size); return; }
      particles(L, t, typeof ctx === "function" ? ctx(L) : ctx).forEach(function (p) { if (p.k === "beam") drawBeam(B, p, st, s, L); else if (p.k === "orb") drawOrb(B, p, st, s, L); else drawP(B, p, st, s, L, t * FPS); });
    });
    return fx;
  }

  MA.attacks = {
    FPS: FPS, W: W, H: H, A0: A0, T0: T0, STYLES: STYLES, EL_STYLE: EL_STYLE, TYPES: TYPES, style: style, type: type,
    sample: sample, setKey: setKey, delKey: delKey, smoothTrack: smoothTrack, track: track, sanitize: sanitize, sLayer: sLayer, frames: frames, uid: uid,
    list: list, byId: byId, put: put, remove: remove, exportList: exportList, importList: importList,
    Buf: Buf, renderLayers: renderLayers, env: env, hx: hx
  };
})();
