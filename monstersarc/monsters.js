/* Monsters Arc – monsters.js (seit v0.25)
   Monster: Datensatz, Bild-Generator (Vorder- und Rückansicht, Pixel-Look wie Gen 3), Schrei (8-bit, per Seed),
   Kampfwerte, 25 Vorlagen und die Monsterliste (im Browser gespeichert, als eine Datei exportierbar).

   Bild: Das Monster besteht aus einfachen Formen (Ellipsen, Kapseln, Dreiecke) in einem Raum 0…1. Gerastert wird mit
   S = 64 × Größe Pixeln – größere Monster bekommen also mehr Pixel, die Pixel selbst bleiben gleich groß.
   Licht von links oben, 5 Tonstufen je Farbe, dunkle Außenlinie und Innenlinien zwischen Teilen (wie Gen 3).
   Rückansicht: ohne Gesicht/Bauch, Schwanz und Flügel liegen vorne, Seiten gespiegelt.

   Liste: localStorage `monstersarc.monsters.v1` = { v: 1, list: [...] }. Fällt auf MA.MONSTER_LIST (monsters/liste.js)
   zurück, falls im Browser noch nichts liegt. Export/Import immer die ganze Liste (Format `monstersarc-monsters`). */
(function () {
  var MA = window.MA, L2 = MA.L2, hex = MA.hex, mix = MA.mix;
  var KEY = "monstersarc.monsters.v1";

  // ---------- Grunddaten ----------
  var ELEMENTS = ["Normal", "Feuer", "Wasser", "Pflanze", "Elektro", "Eis", "Kampf", "Gift", "Boden", "Flug", "Psycho", "Käfer", "Gestein", "Geist", "Drache", "Unlicht", "Stahl"];
  var ELEMENTS_EN = ["Normal", "Fire", "Water", "Grass", "Electric", "Ice", "Fighting", "Poison", "Ground", "Flying", "Psychic", "Bug", "Rock", "Ghost", "Dragon", "Dark", "Steel"];
  var EL_COL = ["#A8A08A", "#E0703C", "#4A86C8", "#5E9A4A", "#E8C048", "#8AC8D8", "#B04A3C", "#8A5AA8", "#C8A060", "#8EA6E0", "#E0608A", "#9AB040", "#A89050", "#6A5A98", "#6A50D8", "#5E5048", "#A8A8B8"];
  var STATS = [
    { k: "hp", de: "KP", en: "HP" }, { k: "atk", de: "Angriff", en: "Attack" }, { k: "def", de: "Verteidigung", en: "Defense" },
    { k: "spa", de: "Sp.-Angriff", en: "Sp. Atk" }, { k: "spd", de: "Sp.-Vert.", en: "Sp. Def" }, { k: "ini", de: "Initiative", en: "Speed" }
  ];
  // Wert auf einem Level: Grundwert (Lv 1) wächst linear bis zum Endwert (Lv 100) = Grundwert + Potenzial × 4
  function statAt(s, lvl) { var b = s[0], f = s[0] + s[1] * 4; return Math.round(b + (f - b) * (Math.max(1, Math.min(100, lvl)) - 1) / 99); }

  var LOOK0 = { body: "round", bw: 0.5, bh: 0.5, head: 0.5, legs: 2, legL: 0.4, legT: 0.5, arms: "none", ear: "none", earS: 0.5, horn: "none", tail: "none", tailS: 0.5,
    wing: "none", spikes: 0, eyes: "round", eyeS: 0.5, eyeGap: 0.5, mouth: "smile", pattern: "none", cheeks: 0, seed: 1 };
  var PAL0 = { main: "#C8A060", sec: "#F0E0B8", acc: "#8A5A3A", eye: "#3A2A20", extra: "#E8C048" };
  function blank() {
    return { id: "m" + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36), no: 1, name: "", el: [0, -1], pre: null, evo: null, evoLvl: 16,
      look: JSON.parse(JSON.stringify(LOOK0)), pal: JSON.parse(JSON.stringify(PAL0)), size: 1, h: 0.5, kg: 8,
      stats: { hp: [12, 45], atk: [7, 45], def: [7, 45], spa: [7, 45], spd: [7, 45], ini: [7, 45] }, cry: { seed: 1, pitch: 1, stretch: 1 } };
  }
  var CH = {   // erlaubte Auswahlwerte
    body: ["round", "tall", "quad", "serpent", "blob", "bird"], legs: [0, 2, 4], arms: ["none", "stub", "long", "claw"],
    ear: ["none", "point", "round", "long", "fin"], horn: ["none", "one", "two", "antenna"], tail: ["none", "short", "long", "curl", "flame", "leaf", "fluff"],
    wing: ["none", "small", "big", "bat"], eyes: ["round", "big", "angry", "sleepy", "dot", "cyclops", "slit"], mouth: ["none", "smile", "open", "fang", "beak"],
    pattern: ["none", "belly", "spots", "stripes", "mask"]
  };
  function clamp(v, a, b, d) { v = +v; return isFinite(v) ? Math.max(a, Math.min(b, v)) : d; }
  function okCol(c, d) { return typeof c === "string" && /^#[0-9a-fA-F]{6}$/.test(c) ? c : d; }
  // Datensatz absichern (Import, alte Stände): fehlende Felder ergänzen, Werte begrenzen
  function sanitize(m) {
    var b = blank(); m = m || {};
    var o = { id: typeof m.id === "string" ? m.id : b.id, no: Math.round(clamp(m.no, 0, 9999, 1)), name: String(m.name || "").slice(0, 24),
      el: [Math.round(clamp(m.el && m.el[0], 0, ELEMENTS.length - 1, 0)), Math.round(clamp(m.el && m.el[1], -1, ELEMENTS.length - 1, -1))],
      pre: typeof m.pre === "string" ? m.pre : null, evo: typeof m.evo === "string" ? m.evo : null, evoLvl: Math.round(clamp(m.evoLvl, 2, 100, 16)),
      size: clamp(m.size, 0.5, 2, 1), h: clamp(m.h, 0.1, 30, 0.5), kg: clamp(m.kg, 0.1, 999, 8), look: {}, pal: {}, stats: {}, cry: {} };
    var L = m.look || {};
    Object.keys(LOOK0).forEach(function (k) {
      if (CH[k]) o.look[k] = CH[k].indexOf(L[k]) >= 0 ? L[k] : LOOK0[k];
      else if (k === "seed") o.look.seed = Math.round(clamp(L.seed, 1, 99999, 1));
      else if (k === "spikes" || k === "cheeks") o.look[k] = L[k] ? 1 : 0;
      else o.look[k] = clamp(L[k], 0, 1, LOOK0[k]);
    });
    Object.keys(PAL0).forEach(function (k) { o.pal[k] = okCol(m.pal && m.pal[k], PAL0[k]); });
    STATS.forEach(function (s) { var v = m.stats && m.stats[s.k] || b.stats[s.k]; o.stats[s.k] = [Math.round(clamp(v[0], 1, 60, 7)), Math.round(clamp(v[1], 0, 100, 45))]; });
    var c = m.cry || {}; o.cry = { seed: Math.round(clamp(c.seed, 1, 99999, 1)), pitch: clamp(c.pitch, 0.5, 2, 1), stretch: clamp(c.stretch, 0.5, 2, 1) };
    return o;
  }

  // ---------- Bild ----------
  var LIGHT = (function () { var l = [-0.55, -0.66, 0.52], n = Math.hypot(l[0], l[1], l[2]); return [l[0] / n, l[1] / n, l[2] / n]; })();
  function tones(c) {   // 5 Stufen: tiefer Schatten, Schatten, Grund, Licht, Glanz (Schatten leicht kühl, Licht leicht warm)
    return [mix(c, [24, 22, 46], 0.55), mix(c, [40, 40, 70], 0.3), c, mix(c, [255, 250, 230], 0.24), mix(c, [255, 255, 245], 0.55)];
  }

  // Teile aus dem Aussehen bauen. Koordinaten 0…1, x nach rechts, y nach unten, Boden bei GY.
  function buildParts(L, back, rnd) {
    var P = [], D = [], GY = 0.95, z = 0;
    function ell(cx, cy, rx, ry, col, zz, o) { var p = { k: "e", cx: cx, cy: cy, rx: rx, ry: ry, col: col, z: zz == null ? z++ : zz }; if (o) for (var q in o) p[q] = o[q]; P.push(p); return p; }
    function cap(ax, ay, bx, by, r0, r1, col, zz, o) { var p = { k: "c", ax: ax, ay: ay, bx: bx, by: by, r0: r0, r1: r1 == null ? r0 : r1, col: col, z: zz == null ? z++ : zz }; if (o) for (var q in o) p[q] = o[q]; P.push(p); return p; }
    function tri(pts, col, zz, o) { var p = { k: "t", p: pts, col: col, z: zz == null ? z++ : zz }; if (o) for (var q in o) p[q] = o[q]; P.push(p); return p; }
    var body = L.body, legsN = body === "serpent" ? 0 : body === "bird" ? 2 : L.legs, legLen = legsN ? 0.05 + L.legL * 0.14 : 0;
    var lr = 0.03 + L.legT * 0.035; if (body === "bird") lr = 0.014 + L.legT * 0.01;
    var B, H = null;
    if (body === "round" || body === "blob") {
      var rx = 0.19 + L.bw * 0.21, ry = 0.17 + L.bh * 0.19;
      B = { cx: 0.5, cy: GY - legLen * 0.75 - ry * (body === "blob" ? 0.86 : 0.95), rx: rx, ry: ry };
    } else if (body === "tall") {
      var rx2 = 0.12 + L.bw * 0.14, ry2 = 0.14 + L.bh * 0.15, hr = 0.1 + L.head * 0.09;
      B = { cx: 0.5, cy: GY - legLen - ry2 * 0.9, rx: rx2, ry: ry2 };
      H = { cx: 0.5, cy: B.cy - ry2 - hr * 0.55, r: hr };
    } else if (body === "quad") {
      var rx3 = 0.2 + L.bw * 0.18, ry3 = 0.1 + L.bh * 0.11, hr3 = 0.1 + L.head * 0.08;
      B = { cx: 0.5, cy: GY - legLen - ry3 * 0.75, rx: rx3, ry: ry3 };
      H = { cx: 0.5, cy: B.cy - ry3 * 0.35 - hr3 * 0.45, r: hr3 };
    } else if (body === "serpent") {
      var crx = 0.2 + L.bw * 0.12, cry = 0.075 + L.bh * 0.04, hr4 = 0.09 + L.head * 0.07;
      B = { cx: 0.5, cy: GY - cry * 2.4, rx: crx * 0.78, ry: cry * 1.05 };
      H = { cx: 0.52, cy: B.cy - 0.2 - L.bh * 0.08, r: hr4 };
    } else {   // bird
      var rx5 = 0.13 + L.bw * 0.14, ry5 = 0.15 + L.bh * 0.12, hr5 = 0.09 + L.head * 0.07;
      B = { cx: 0.5, cy: GY - legLen - ry5 * 0.92, rx: rx5, ry: ry5 };
      H = { cx: 0.5, cy: B.cy - ry5 - hr5 * 0.5, r: hr5 };
    }
    var F = H ? { cx: H.cx, cy: H.cy, r: H.r } : { cx: B.cx, cy: B.cy - B.ry * 0.18, r: Math.min(B.rx, B.ry) * 0.9 };   // Gesicht
    var topY = H ? H.cy - H.r : B.cy - B.ry, headX = H ? H.cx : 0.5, headR = H ? H.r : Math.min(B.rx, B.ry);

    // hinten liegende Teile (z negativ): Stacheln, Flügel (vorne nur in der Rückansicht), Schwanz, hintere Beine
    var side = back ? -1 : 1;
    if (L.spikes) {
      var n = 5, sw = (H ? H.r : B.rx) * 0.5;
      for (var i = 0; i < n; i++) {
        var t = (i + 0.5) / n, ax = 0.5 + (t - 0.5) * (H ? H.r * 1.6 : B.rx * 1.6), ay0 = H ? H.cy - Math.sqrt(Math.max(0, 1 - Math.pow((ax - H.cx) / H.r, 2))) * H.r : B.cy - Math.sqrt(Math.max(0, 1 - Math.pow((ax - B.cx) / B.rx, 2))) * B.ry;
        var hh = sw * (0.8 + 0.5 * Math.sin(t * Math.PI));
        tri([[ax - sw * 0.35, ay0 + 0.02], [ax + sw * 0.35, ay0 + 0.02], [ax, ay0 - hh]], "acc", -10);
      }
    }
    if (L.wing !== "none") {
      var wz = back ? 50 : -8, big = L.wing === "big" ? 1.45 : 1, wy = B.cy - B.ry * 0.35;
      [-1, 1].forEach(function (s) {
        var wx = 0.5 + s * (B.rx + 0.05 * big);
        if (L.wing === "bat") {
          tri([[0.5 + s * B.rx * 0.5, wy - 0.02], [0.5 + s * (B.rx + 0.22), wy - 0.12], [0.5 + s * (B.rx + 0.16), wy + 0.12]], "acc", wz);
          ell(0.5 + s * (B.rx + 0.1), wy + 0.1, 0.035, 0.03, "acc", wz, { cut: 1 });
        } else {
          ell(wx, wy, 0.09 * big, 0.055 * big, "sec", wz, { a: s * -0.55 });
          ell(wx + s * 0.03 * big, wy + 0.035 * big, 0.06 * big, 0.035 * big, "sec", wz + 0.1, { a: s * -0.35 });
        }
      });
    }
    if (L.tail !== "none") {
      var tz = back ? 40 : -6, tl = 0.6 + L.tailS * 0.8, bx0 = 0.5 + side * B.rx * 0.72, by0 = B.cy + B.ry * 0.35;
      if (L.tail === "short") ell(0.5 + side * (B.rx + 0.02), by0 - 0.02, 0.05 * tl, 0.04 * tl, "main", tz);
      else if (L.tail === "fluff") ell(0.5 + side * (B.rx + 0.06 * tl), by0 - 0.06 * tl, 0.09 * tl, 0.11 * tl, "sec", tz);
      else if (L.tail === "curl") { cap(bx0, by0, 0.5 + side * (B.rx + 0.1 * tl), by0 - 0.04, 0.045, 0.036, "main", tz); ell(0.5 + side * (B.rx + 0.13 * tl), by0 - 0.11 * tl, 0.07 * tl, 0.07 * tl, "main", tz + 0.1, { ring: 0.55 }); }
      else {
        var ex = 0.5 + side * (B.rx + 0.16 * tl), ey = by0 - 0.2 * tl, mx = 0.5 + side * (B.rx + 0.12 * tl), my = by0 + 0.01;
        cap(bx0, by0, mx, my, 0.05, 0.042, "main", tz); cap(mx, my, ex, ey, 0.042, L.tail === "long" ? 0.026 : 0.032, "main", tz + 0.1);
        if (L.tail === "flame") { ell(ex, ey - 0.04, 0.06, 0.085, "acc", tz + 0.2, { flame: 1 }); ell(ex, ey - 0.025, 0.03, 0.048, "extra", tz + 0.3, { flame: 1 }); }
        if (L.tail === "leaf") ell(ex + side * 0.03, ey - 0.06, 0.06, 0.1, "acc", tz + 0.2, { a: side * 0.5, leaf: 1 });
      }
    }
    // Beine
    var legs = [];
    if (legsN) {
      var hipY = B.cy + B.ry * 0.55;
      if (legsN === 4) {
        [-1, 1].forEach(function (s) { legs.push({ x: 0.5 + s * B.rx * 0.78, y: hipY - 0.03, back: 1 }); legs.push({ x: 0.5 + s * B.rx * 0.38, y: hipY, back: 0 }); });
      } else [-1, 1].forEach(function (s) { legs.push({ x: 0.5 + s * B.rx * (body === "bird" ? 0.35 : 0.52), y: hipY, back: 0 }); });
      legs.forEach(function (g) {
        var zz = g.back ? -4 : 20, fy = GY - (g.back ? 0.03 : 0) - lr * 0.6;
        cap(g.x, g.y, g.x, fy, lr, lr * 0.9, "main", zz);
        if (body === "bird") { tri([[g.x - lr * 2.2, GY], [g.x + lr * 2.2, GY], [g.x, fy - lr]], "extra", zz + 0.1); }
        else ell(g.x, fy + lr * 0.15, lr * 1.35, lr * 0.75, "main", zz + 0.1);
      });
    }
    // Körper
    if (body === "serpent") {
      ell(0.5, GY - 0.075, 0.2 + L.bw * 0.12, 0.075 + L.bh * 0.04, "main", 0);
      ell(0.5, B.cy, B.rx, B.ry, "main", 1);
      cap(0.5, B.cy - 0.02, H.cx, H.cy + H.r * 0.4, 0.06 + L.bw * 0.025, 0.05 + L.bw * 0.02, "main", 2);
    } else {
      ell(B.cx, B.cy, B.rx, B.ry, "main", 5, body === "blob" ? { wob: 0.09, flat: GY - 0.005 } : null);
    }
    // Arme
    if (L.arms !== "none") {
      [-1, 1].forEach(function (s) {
        var sx = 0.5 + s * B.rx * 0.82, sy = B.cy - B.ry * 0.2;
        if (L.arms === "stub") ell(sx + s * 0.02, sy + 0.03, 0.045, 0.035, "main", 30, { a: s * 0.6 });
        else {
          var hx = 0.5 + s * (B.rx + 0.09), hy = B.cy + B.ry * 0.35;
          cap(sx, sy, hx, hy, 0.048, 0.04, "main", 30);
          if (L.arms === "claw") for (var c = -1; c <= 1; c++) tri([[hx + c * 0.016 - 0.008, hy + 0.02], [hx + c * 0.016 + 0.008, hy + 0.02], [hx + c * 0.02, hy + 0.06]], "extra", 31);
          else ell(hx, hy + 0.01, 0.045, 0.04, "main", 31);
        }
      });
    }
    // Kopf
    if (H) ell(H.cx, H.cy, H.r * 1.06, H.r, "main", 40);
    // Ohren (hinter dem Kopf, z 39) – bei Kopflosen auf dem Körper
    var ez = H ? 39 : 4, es = 0.6 + L.earS * 0.8;
    if (L.ear !== "none") {
      [-1, 1].forEach(function (s) {
        var ex = headX + s * headR * 0.62, ey = topY + headR * 0.22;
        if (L.ear === "point") {
          var h = 0.11 * es, w = 0.06 * es;
          tri([[ex - w, ey + 0.02], [ex + w, ey + 0.02], [ex + s * w * 0.5, ey - h]], "main", ez);
          if (!back) tri([[ex - w * 0.45, ey + 0.01], [ex + w * 0.45, ey + 0.01], [ex + s * w * 0.4, ey - h * 0.62]], "acc", ez + 0.2, { decal: 1 });
        } else if (L.ear === "round") {
          ell(ex + s * 0.01, ey - 0.02, 0.055 * es, 0.05 * es, "main", ez);
          if (!back) ell(ex + s * 0.01, ey - 0.015, 0.03 * es, 0.027 * es, "acc", ez + 0.2, { decal: 1 });
        } else if (L.ear === "long") {
          ell(ex + s * 0.03, ey - 0.12 * es, 0.035 * es, 0.13 * es, "main", ez, { a: s * 0.22 });
          if (!back) ell(ex + s * 0.03, ey - 0.11 * es, 0.017 * es, 0.09 * es, "acc", ez + 0.2, { a: s * 0.22, decal: 1 });
        } else {   // Flossen seitlich
          var fx = headX + s * headR * 0.95, fy = (H ? H.cy : F.cy) - headR * 0.1;
          tri([[fx, fy - 0.05 * es], [fx, fy + 0.05 * es], [fx + s * 0.13 * es, fy - 0.08 * es]], "acc", ez);
        }
      });
    }
    // Hörner / Fühler (vor dem Kopf oben)
    if (L.horn !== "none") {
      var hz = 45;
      if (L.horn === "one") tri([[headX - 0.025, topY + 0.03], [headX + 0.025, topY + 0.03], [headX, topY - 0.09]], "extra", hz);
      else if (L.horn === "two") [-1, 1].forEach(function (s) { var hx2 = headX + s * headR * 0.42; tri([[hx2 - 0.022, topY + headR * 0.18], [hx2 + 0.022, topY + headR * 0.18], [hx2 + s * 0.035, topY - 0.075]], "extra", hz); });
      else [-1, 1].forEach(function (s) { var ax2 = headX + s * headR * 0.3, tx = headX + s * headR * 0.65, ty = topY - 0.12; cap(ax2, topY + 0.02, tx, ty, 0.009, 0.008, "acc", hz); ell(tx, ty, 0.022, 0.022, "extra", hz + 0.1); });
    }
    // Muster (Abziehbilder auf Körper/Kopf, ohne Innenlinie)
    var pat = L.pattern;
    if (pat === "belly" && !back) D.push({ k: "e", cx: B.cx, cy: B.cy + B.ry * 0.22, rx: B.rx * 0.62, ry: B.ry * 0.62, col: "sec", on: [5, 1] });
    if (pat === "spots") for (var sp = 0; sp < 7; sp++) {
      var ang = rnd() * 6.283, rr = rnd() * 0.75, onHead = H && rnd() < 0.3, T0 = onHead ? H : B;
      var trx = onHead ? H.r : B.rx, tryy = onHead ? H.r : B.ry;
      D.push({ k: "e", cx: T0.cx + Math.cos(ang) * trx * rr, cy: T0.cy + Math.sin(ang) * tryy * rr * (back ? 0.9 : 0.6) - (back ? 0 : tryy * 0.2), rx: 0.018 + rnd() * 0.02, ry: 0.016 + rnd() * 0.016, col: "acc", on: onHead ? [40] : [5, 1, 0] });
    }
    if (pat === "stripes") D.push({ k: "s", col: "acc", on: [5, 1, 0, 40], y0: B.cy - B.ry, y1: B.cy + B.ry * (back ? 0.8 : 0.1), H: H });
    if (pat === "mask" && !back) D.push({ k: "e", cx: F.cx, cy: F.cy - F.r * 0.05, rx: F.r * 0.95, ry: F.r * 0.3, col: "acc", on: [H ? 40 : 5] });
    if (L.cheeks && !back) [-1, 1].forEach(function (s) { D.push({ k: "e", cx: F.cx + s * F.r * 0.62, cy: F.cy + F.r * 0.3, rx: F.r * 0.17, ry: F.r * 0.12, col: "acc", on: [H ? 40 : 5] }); });
    // Schnabel als Teil (vorne)
    if (L.mouth === "beak" && !back) { var by = F.cy + F.r * 0.22; tri([[F.cx - F.r * 0.22, by], [F.cx + F.r * 0.22, by], [F.cx, by + F.r * 0.42]], "extra", 60); }
    return { P: P, D: D, F: F, back: back, GY: GY };
  }

  function inside(p, x, y, n) {   // Treffer? Normale in n
    if (p.k === "e") {
      var dx = x - p.cx, dy = y - p.cy;
      if (p.a) { var ca = Math.cos(-p.a), sa = Math.sin(-p.a), qx = dx * ca - dy * sa; dy = dx * sa + dy * ca; dx = qx; }
      var rx = p.rx, ry = p.ry;
      if (p.wob) { var an = Math.atan2(dy / ry, dx / rx), wv = 1 + p.wob * (Math.sin(an * 3 + p.ph) * 0.6 + Math.sin(an * 5 + p.ph * 2) * 0.4); rx *= wv; ry *= wv; }
      if (p.flame) { var fy = (dy / ry + 1) / 2; rx *= 0.35 + fy * 0.75; }   // oben spitz
      if (p.leaf) { var ly = Math.abs(dy / ry); rx *= 1 - ly * ly * 0.7; }
      if (p.flat && y > p.flat) return false;
      var q = (dx / rx) * (dx / rx) + (dy / ry) * (dy / ry);
      if (q > 1) return false;
      if (p.ring && q < p.ring * p.ring) return false;
      if (n) { n[0] = dx / rx; n[1] = dy / ry; n[2] = Math.sqrt(Math.max(0, 1 - q)); }
      return true;
    }
    if (p.k === "c") {
      var vx = p.bx - p.ax, vy = p.by - p.ay, l2 = vx * vx + vy * vy || 1e-9, t = Math.max(0, Math.min(1, ((x - p.ax) * vx + (y - p.ay) * vy) / l2));
      var cx = p.ax + vx * t, cy = p.ay + vy * t, r = p.r0 + (p.r1 - p.r0) * t, ddx = x - cx, ddy = y - cy, d = Math.sqrt(ddx * ddx + ddy * ddy);
      if (d > r) return false;
      if (n) { n[0] = ddx / r; n[1] = ddy / r; n[2] = Math.sqrt(Math.max(0, 1 - (d / r) * (d / r))); }
      return true;
    }
    var A = p.p[0], Bq = p.p[1], C = p.p[2];
    var d1 = (x - Bq[0]) * (A[1] - Bq[1]) - (A[0] - Bq[0]) * (y - Bq[1]), d2 = (x - C[0]) * (Bq[1] - C[1]) - (Bq[0] - C[0]) * (y - C[1]), d3 = (x - A[0]) * (C[1] - A[1]) - (C[0] - A[0]) * (y - A[1]);
    if (((d1 < 0) || (d2 < 0) || (d3 < 0)) && ((d1 > 0) || (d2 > 0) || (d3 > 0))) return false;
    if (n) { var gx = (A[0] + Bq[0] + C[0]) / 3, gy = (A[1] + Bq[1] + C[1]) / 3; n[0] = (x - gx) * 6; n[1] = (y - gy) * 6 - 0.2; n[2] = 0.8; }
    return true;
  }

  var cache = {}, cacheN = 0;
  // Bild eines Monsters: view "front" | "back". Ergebnis: Canvas S × S (S = 64 × Größe)
  function render(m, view) {
    var back = view === "back", key = JSON.stringify([m.look, m.pal, m.size, back]);
    if (cache[key]) return cache[key];
    if (cacheN > 300) { cache = {}; cacheN = 0; }
    var L = m.look, S = Math.max(24, Math.round(64 * m.size)), rnd = MA.rng(L.seed * 7919 + 13);
    var G = buildParts(L, back, rnd), P = G.P.slice().sort(function (a, b) { return a.z - b.z; });
    P.forEach(function (p) { p.ph = rnd() * 6.283; });
    if (back) P.forEach(function (p) { if (p.z >= 40 && p.z < 50 && p.col === "main") p.backHead = 1; });
    var pal = {}; Object.keys(m.pal).forEach(function (k) { pal[k] = tones(hex(m.pal[k])); });
    var N = S * S, part = new Int16Array(N).fill(-1), lv = new Uint8Array(N), slot = new Array(N), n = [0, 0, 0];
    for (var py = 0; py < S; py++) for (var px = 0; px < S; px++) {
      var x = (px + 0.5) / S, y = (py + 0.5) / S, i = py * S + px, best = -1;
      for (var k = P.length - 1; k >= 0; k--) if (inside(P[k], x, y, n)) { best = k; break; }
      if (best < 0) continue;
      var p = P[best];
      if (p.cut) { part[i] = -1; continue; }   // Aussparung (Fledermausflügel)
      part[i] = best;
      var b = n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2];
      if (back) b -= 0.08;
      lv[i] = b > 0.86 ? 4 : b > 0.48 ? 3 : b > 0.02 ? 2 : b > -0.45 ? 1 : 0;
      var sl = p.col;
      // Abziehbilder (Muster) auf passenden Teilen
      for (var d = 0; d < G.D.length; d++) {
        var q = G.D[d], zz = Math.floor(p.z);
        if (q.on.indexOf(zz) < 0 && !(q.on.indexOf(40) >= 0 && zz === 40) ) continue;
        if (q.k === "e") { var dx = (x - q.cx) / q.rx, dy = (y - q.cy) / q.ry; if (dx * dx + dy * dy <= 1) sl = q.col; }
        else if (q.k === "s") { if (y > q.y0 && y < q.y1 && Math.floor((y - q.y0) * S / Math.max(3, S * 0.07)) % 2 === 1) sl = q.col; }
      }
      slot[i] = sl;
    }
    // Linien: außen dunkel, innen zwischen Teilen (das vordere Teil bekommt die Linie)
    var cv = MA.canvas(S, S), img = cv.ctx.createImageData(S, S), d8 = img.data;
    function at(x, y) { return x < 0 || y < 0 || x >= S || y >= S ? -1 : part[y * S + x]; }
    for (py = 0; py < S; py++) for (px = 0; px < S; px++) {
      i = py * S + px; var pi = part[i]; if (pi < 0) continue;
      var col = pal[slot[i]][lv[i]], pz = P[pi].z, edge = 0;
      var nb = [at(px - 1, py), at(px + 1, py), at(px, py - 1), at(px, py + 1)];
      for (var e = 0; e < 4; e++) {
        if (nb[e] < 0) { edge = 2; break; }
        if (nb[e] !== pi && P[nb[e]].z < pz - 0.5 && !P[pi].decal) edge = Math.max(edge, 1);
      }
      if (edge === 2) col = mix(pal[P[pi].col][0], [10, 8, 18], 0.55);
      else if (edge === 1) col = mix(pal[P[pi].col][0], [10, 8, 18], 0.25);
      var o = i * 4; d8[o] = col[0]; d8[o + 1] = col[1]; d8[o + 2] = col[2]; d8[o + 3] = 255;
    }
    cv.ctx.putImageData(img, 0, 0);
    if (!back) face(cv.ctx, S, G.F, L, pal);
    cache[key] = cv; cacheN++;
    return cv;
  }

  // Gesicht in Pixeln: Augen, Mund (nur Vorderansicht)
  function face(c, S, F, L, pal) {
    function px(x, y, col) { c.fillStyle = MA.rgb(col); c.fillRect(Math.round(x), Math.round(y), 1, 1); }
    function disc(cx, cy, r, col) { for (var y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (var x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) { var dx = x + 0.5 - cx, dy = y + 0.5 - cy; if (dx * dx + dy * dy <= r * r) px(x, y, col); } }
    var fx = F.cx * S, fy = F.cy * S, fr = F.r * S, er = Math.max(1.6, fr * (0.14 + L.eyeS * 0.16)), gap = fr * (0.28 + L.eyeGap * 0.34);
    var dark = [22, 18, 26], white = [250, 248, 240], ink = pal.main[0], eye = pal.eye[2];
    var eyesAt = L.eyes === "cyclops" ? [[fx, fy - fr * 0.05, er * 1.7]] : [[fx - gap, fy - fr * 0.05, er * (L.eyes === "big" ? 1.35 : 1)], [fx + gap, fy - fr * 0.05, er * (L.eyes === "big" ? 1.35 : 1)]];
    eyesAt.forEach(function (E, idx) {
      var x = E[0], y = E[1], r = E[2], s = idx === 0 ? -1 : 1;
      if (L.eyes === "dot") { disc(x, y, Math.max(1, r * 0.55), dark); px(x - r * 0.2, y - r * 0.25, white); return; }
      disc(x, y, r + 1, mix(ink, dark, 0.5));
      disc(x, y, r, white);
      if (L.eyes === "slit") { disc(x, y, r * 0.85, eye); for (var yy = -r * 0.7; yy <= r * 0.7; yy++) px(x, y + yy, dark); }
      else { disc(x, y + r * 0.12, r * 0.68, eye); disc(x, y + r * 0.15, r * 0.36, dark); }
      px(x - r * 0.35, y - r * 0.4, white); if (r > 3) px(x - r * 0.35 + 1, y - r * 0.4, white);
      // Lider
      if (L.eyes === "angry" || L.eyes === "sleepy") {
        for (var ly = Math.floor(y - r - 1); ly <= Math.ceil(y + r + 1); ly++) for (var lx = Math.floor(x - r - 1); lx <= Math.ceil(x + r + 1); lx++) {
          var dx = lx + 0.5 - x, dy = ly + 0.5 - y; if (dx * dx + dy * dy > (r + 1) * (r + 1)) continue;
          var lim = L.eyes === "sleepy" ? -r * 0.05 : -r * 0.15 + (L.eyes === "cyclops" ? 0 : -s * dx * 0.55);
          if (dy < lim - 1) px(lx, ly, pal.main[2]); else if (dy < lim) px(lx, ly, mix(ink, dark, 0.5));
        }
      }
    });
    var my = fy + fr * 0.42, mw = Math.max(2, fr * 0.32);
    if (L.mouth === "smile" || L.mouth === "fang") {
      for (var t = -mw; t <= mw; t++) px(fx + t, my + Math.round((t * t) / (mw * mw) * -Math.max(1, mw * 0.35)) + Math.max(1, mw * 0.35), dark);
      if (L.mouth === "fang") [-1, 1].forEach(function (s) { px(fx + s * mw * 0.55, my + mw * 0.35 + 1, white); if (mw > 4) px(fx + s * mw * 0.55, my + mw * 0.35 + 2, white); });
    } else if (L.mouth === "open") {
      for (var oy = -mw * 0.55; oy <= mw * 0.55; oy++) for (var ox = -mw * 0.7; ox <= mw * 0.7; ox++) {
        var q = (ox / (mw * 0.7)) * (ox / (mw * 0.7)) + (oy / (mw * 0.55)) * (oy / (mw * 0.55)); if (q > 1) continue;
        px(fx + ox, my + oy, q > 0.6 ? dark : oy > 0 ? [200, 80, 90] : [80, 26, 34]);
      }
    }
  }

  // ---------- Schrei (8-bit) ----------
  function cryPlan(c) {
    var r = MA.rng(c.seed * 2654435761 >>> 0), n = 2 + Math.floor(r() * 3), segs = [];
    var f = 260 + r() * 700;
    for (var i = 0; i < n; i++) {
      var d = 0.05 + r() * 0.13, f1 = f * (0.55 + r() * 1.3);
      segs.push({ d: d, f0: f, f1: f1, vib: r() < 0.5 ? 8 + r() * 22 : 0, vd: 0.02 + r() * 0.06, wave: r() < 0.65 ? "square" : r() < 0.5 ? "triangle" : "sawtooth", noise: r() < 0.3, gap: r() < 0.35 ? 0.02 + r() * 0.04 : 0 });
      f = r() < 0.5 ? f1 : f * (0.7 + r() * 0.8);
    }
    return segs;
  }
  var crush = null;
  function playCry(m) {
    if (!MA.audio || !MA.audio.synth) return 0;
    var A = MA.audio.synth(); if (!A) return 0;
    var ctx = A.ctx, c = m.cry, segs = cryPlan(c), t = ctx.currentTime + 0.03, st = c.stretch, pt = c.pitch;
    if (!crush || crush.context !== ctx) {   // 8-bit-Körnung: Pegel in 16 Stufen
      crush = ctx.createWaveShaper(); var cur = new Float32Array(256); for (var i = 0; i < 256; i++) { var v = i / 127.5 - 1; cur[i] = Math.round(v * 8) / 8; } crush.curve = cur;
      crush.connect(A.out);
    }
    segs.forEach(function (s) {
      var d = s.d * st, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = s.wave; o.frequency.setValueAtTime(s.f0 * pt, t); o.frequency.exponentialRampToValueAtTime(Math.max(40, s.f1 * pt), t + d);
      if (s.vib) { var lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = s.vib; lg.gain.value = s.f0 * pt * s.vd; lfo.connect(lg); lg.connect(o.frequency); lfo.start(t); lfo.stop(t + d + 0.05); }
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.16, t + 0.008); g.gain.setValueAtTime(0.14, t + d * 0.7); g.gain.linearRampToValueAtTime(0, t + d);
      o.connect(g); g.connect(crush); o.start(t); o.stop(t + d + 0.02);
      if (s.noise) {
        var len = Math.floor(ctx.sampleRate * Math.min(0.06, d)), buf = ctx.createBuffer(1, len, ctx.sampleRate), ch = buf.getChannelData(0), rr = MA.rng(c.seed + 7);
        for (var k = 0; k < len; k++) ch[k] = (rr() * 2 - 1) * (1 - k / len);
        var ns = ctx.createBufferSource(), ng = ctx.createGain(); ns.buffer = buf; ng.gain.value = 0.08; ns.connect(ng); ng.connect(crush); ns.start(t);
      }
      t += d + s.gap * st;
    });
    return t - ctx.currentTime;
  }

  // ---------- Liste ----------
  var LIST = null;
  function load() {
    if (LIST) return LIST;
    var raw = null; try { raw = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) {}
    var src = raw && raw.list ? raw.list : (MA.MONSTER_LIST || []);
    LIST = src.map(sanitize);
    return LIST;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify({ v: 1, list: LIST })); return true; } catch (e) { return false; } }
  function byId(id) { return load().filter(function (m) { return m.id === id; })[0] || null; }
  function sorted() { return load().slice().sort(function (a, b) { return a.no - b.no || a.name.localeCompare(b.name); }); }
  // Monster speichern (neu oder ersetzen) und Entwicklungen auf beiden Seiten eintragen
  function put(m) {
    m = sanitize(m); load();
    var i = LIST.findIndex(function (q) { return q.id === m.id; });
    if (i >= 0) LIST[i] = m; else LIST.push(m);
    LIST.forEach(function (q) {
      if (q.id === m.id) return;
      if (q.evo === m.id && m.pre !== q.id) q.evo = null;       // alte Verknüpfung lösen
      if (q.pre === m.id && m.evo !== q.id) q.pre = null;
      if (m.pre === q.id) q.evo = m.id;
      if (m.evo === q.id) q.pre = m.id;
    });
    save(); return m;
  }
  function remove(id) {
    load(); LIST = LIST.filter(function (q) { return q.id !== id; });
    LIST.forEach(function (q) { if (q.pre === id) q.pre = null; if (q.evo === id) q.evo = null; });
    save();
  }
  function exportList() {
    var data = JSON.stringify({ format: "monstersarc-monsters", version: 1, saved: new Date().toISOString(), list: sorted() }, null, 1);
    var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([data], { type: "application/json" })); a.download = "MonstersArc_Monsterliste.json";
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  // ganze Liste ersetzen (alte Liste bleibt als Sicherung unter KEY + ".bak")
  function importList(text) {
    var d = JSON.parse(text), list = Array.isArray(d) ? d : d && d.list;
    if (!Array.isArray(list)) throw new Error("keine Monsterliste");
    try { localStorage.setItem(KEY + ".bak", localStorage.getItem(KEY) || ""); } catch (e) {}
    LIST = list.map(sanitize); save(); return LIST.length;
  }
  function nextNo() { var mx = 0; load().forEach(function (q) { mx = Math.max(mx, q.no); }); return mx + 1; }

  MA.monsters = {
    ELEMENTS: ELEMENTS, EL_COL: EL_COL, STATS: STATS, CH: CH,
    elName: function (i) { return i < 0 ? "–" : L2(ELEMENTS[i], ELEMENTS_EN[i]); },
    statAt: statAt, blank: blank, sanitize: sanitize, render: render, playCry: playCry,
    list: load, sorted: sorted, byId: byId, put: put, remove: remove, exportList: exportList, importList: importList, nextNo: nextNo
  };
})();
