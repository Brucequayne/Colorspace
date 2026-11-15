/* Shizuku – art-samurai.js
   Der Samurai als kleines 3D-Modell aus Grundformen (Kugeln, Kapseln, Zylinder).
   Für jede der 8 Richtungen und jede Animationsphase wird es per Raymarching in ein
   Pixel-Sprite gerendert, auf 4 Farbstufen je Material reduziert und mit Kontur versehen.
   Ergebnis wird zwischengespeichert. Später können gezeichnete Sprite-Sheets diese Funktion
   ersetzen: SZ.samurai.frame(richtung, animation, bild) muss dann nur ein Bild liefern.

   Projektion (für Figuren und Schwert gleich):
   Welt x = rechts, y = zur Kamera (Süden), z = oben. Kamera schaut 25° von oben. */
(function () {
  var SZ = window.SZ;
  var EL = 25 * Math.PI / 180, SE = Math.sin(EL), CE = Math.cos(EL);
  var SW = 30, SH = 36, AX = 15, AY = 32;   // Spritegröße und Fußpunkt

  // Palette je Material: dunkel → hell
  var PAL = {
    skin: ["#6E4A36", "#A2735A", "#D29C78", "#EEC29C"],
    hair: ["#0B0909", "#171212", "#262020", "#3A3030"],
    ivory: ["#6A6456", "#A69E8A", "#D6CEB8", "#F2ECDA"],
    red: ["#3A1311", "#62211B", "#8A3127", "#AE4834"],
    indigo: ["#10131F", "#1D2438", "#2E3852", "#43507A"],
    obi: ["#0A0808", "#171111", "#261C1C", "#382A2A"],
    sole: ["#1C140E", "#2E2218", "#46362A", "#5E4C3C"],
    saya: ["#120A0A", "#261414", "#3E1E1C", "#5A2C28"],
    gold: ["#5E481C", "#957530", "#C9A445", "#EBD07C"],
    eye: ["#100C0C", "#100C0C", "#1A1414", "#1A1414"],
    white: ["#8A8478", "#BEB6A4", "#E2DCCC", "#FAF6EC"],
    straw: ["#6E5626", "#A08038", "#C8A44E", "#E4C878"],
    rag: ["#2E2A26", "#4C443A", "#6C6252", "#8C806C"],
    ash: ["#141414", "#22221F", "#34332E", "#4A4842"],
    rope: ["#3A2A1A", "#5A4228", "#7A5C38", "#9A7A4E"],
    armor: ["#101114", "#1E2027", "#33363F", "#555A66"],
    lace: ["#3A0E0C", "#6A1A15", "#962A1F", "#C04230"],
    moss: ["#151C12", "#26321E", "#3B4C2C", "#58693E"],
    earth: ["#1C140E", "#33261A", "#4E3A26", "#6C5236"]
  };
  // Aussehen je Figur
  var LOOKS = {
    samurai: { torso: "kamishimo", sleeve: "ivory", legs: "indigo", wings: "red", saya: true, hat: false, knot: false },
    ronin: { torso: "kimono", sleeve: "rag", legs: "ash", wings: null, saya: true, hat: true, knot: false, eyes: false },
    // Heavy Ronin: lackierte Rüstung mit roter Schnürung, Schulterplatten, Hüftschurz, Stirnband, 30 % größer
    // Yumi-heishi: Bogenschütze in moosgrünem Kimono, brauner Hakama, Stirnband und Köcher auf dem Rücken, ohne Schwert
    yumi: { torso: "kimono", robe: "moss", sleeve: "moss", legs: "earth", wings: null, saya: false, hat: false, hachimaki: true, quiver: true },
    heavy: { torso: "armor", sleeve: "armor", legs: "ash", wings: null, sode: true, kusazuri: true, saya: true, hat: false, hachimaki: true, scale: 1.3 }
  };

  // ---------- SDF-Grundformen ----------
  function len(x, y, z) { return Math.sqrt(x * x + y * y + z * z); }
  function ell(cx, cy, cz, rx, ry, rz) {
    var m = Math.min(rx, ry, rz);
    return function (x, y, z) { return (len((x - cx) / rx, (y - cy) / ry, (z - cz) / rz) - 1) * m; };
  }
  function cone(a, b, ra, rb) {
    var bx = b[0] - a[0], by = b[1] - a[1], bz = b[2] - a[2], bb = bx * bx + by * by + bz * bz || 1;
    return function (x, y, z) {
      var px = x - a[0], py = y - a[1], pz = z - a[2], t = (px * bx + py * by + pz * bz) / bb;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      return len(px - bx * t, py - by * t, pz - bz * t) - (ra + (rb - ra) * t);
    };
  }
  function box(cx, cy, cz, hx, hy, hz) {
    return function (x, y, z) {
      var qx = Math.abs(x - cx) - hx, qy = Math.abs(y - cy) - hy, qz = Math.abs(z - cz) - hz;
      return len(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0);
    };
  }
  function ecyl(cx, cy, rx, ry, z0, z1) {
    var m = Math.min(rx, ry);
    return function (x, y, z) {
      var d = (Math.sqrt(Math.pow((x - cx) / rx, 2) + Math.pow((y - cy) / ry, 2)) - 1) * m;
      return Math.max(d, z0 - z, z - z1);
    };
  }

  // ---------- Posen ----------
  // ph: Laufphase 0..1, kind: idle/walk/block/atk/dash/parry
  function pose(anim, k, n) {
    var P = { lean: 0, crouch: 0, spread: 2, lf: 0, rf: 0, ll: 0, rl: 0, hl: [-4.6, 0.6, 11.6], hr: [4.6, 0.6, 11.6], breathe: 0 };
    if (anim === "idle") { P.breathe = k === 1 ? 0.35 : 0; P.crouch = k === 1 ? 0.15 : 0; }
    if (anim === "walk") {
      var a = (k / n) * Math.PI * 2, s = Math.sin(a), c = Math.cos(a);
      P.lf = s * 3.2; P.rf = -s * 3.2; P.ll = Math.max(0, c) * 1.3; P.rl = Math.max(0, -c) * 1.3;
      P.hl = [-4.6, 0.6 - s * 2.2, 11.8]; P.hr = [4.6, 0.6 + s * 2.2, 11.8];
      P.crouch = Math.abs(s) * 0.4; P.lean = 0.5;
    }
    if (anim === "blockwalk" || anim === "bowwalk") {
      // Gehen in Deckung bzw. mit gespanntem Bogen: kürzere Schritte, Arme bleiben in Haltung
      var a2 = (k / n) * Math.PI * 2, s2 = Math.sin(a2), c2 = Math.cos(a2);
      P.spread = 3; P.crouch = 0.8 + Math.abs(s2) * 0.25;
      P.lf = 0.6 + s2 * 2.2; P.rf = -0.6 - s2 * 2.2; P.ll = Math.max(0, c2) * 1.0; P.rl = Math.max(0, -c2) * 1.0;
      if (anim === "blockwalk") { P.hl = [-1.2, 4.2, 15]; P.hr = [1.4, 4.4, 15.4]; }
      else { P.hl = [-0.6, 6.4, 17.4]; P.hr = [1.6, -0.6, 18.6]; }
      return P;
    }
    if (anim === "block" || anim === "parry") { P.spread = 3.2; P.crouch = 0.9; P.lf = 1.6; P.rf = -1.4; P.hl = [-1.2, 4.2, 15]; P.hr = [1.4, 4.4, 15.4]; }
    if (anim === "atk") { P.spread = 3.4; P.crouch = 0.7; P.lean = 1.4; P.lf = 2.8; P.rf = -2.2; P.hl = [-1.5, 4.5, 14.5]; P.hr = [2.5, 5, 15]; }
    if (anim === "dash") { P.spread = 2.4; P.crouch = 1.0; P.lean = 2.2; P.lf = 3.5; P.rf = -3; P.rl = 1.2; P.hl = [-4, -2, 13]; P.hr = [4, -2.5, 13]; }
    if (anim === "bow") { P.spread = 3.4; P.crouch = 0.5; P.lf = 1.8; P.rf = -1.6; P.hl = [-0.6, 6.4, 17.4]; P.hr = [1.6, -0.6, 18.6]; }
    // Wasser-Beschwörung: Arme hoch, fließend zur Seite, nach vorn schieben, tief zum Boden
    if (anim === "cast_up") { P.spread = 2.6; P.hl = [-2.8, 1.2, 24.8]; P.hr = [2.8, 1.2, 24.8]; P.lean = -0.4; }
    if (anim === "cast_flow") { P.spread = 3.2; P.lf = 1.6; P.rf = -1.2; P.lean = 0.4; P.hl = [-6.2, 1.8, 19.5]; P.hr = [5.6, 3, 14.2]; }
    if (anim === "cast_flow2") { P.spread = 3.2; P.lf = -1.2; P.rf = 1.6; P.lean = 0.4; P.hl = [-5.6, 3, 14.2]; P.hr = [6.2, 1.8, 19.5]; }
    if (anim === "cast_push") { P.spread = 3.4; P.crouch = 0.8; P.lf = 2; P.rf = -1.8; P.lean = 1; P.hl = [-1.6, 6.4, 16.5]; P.hr = [1.6, 6.4, 16.5]; }
    if (anim === "cast_low") { P.spread = 3.6; P.crouch = 2.2; P.lean = 1.6; P.lf = 1.4; P.rf = -1.4; P.hl = [-2.6, 4.6, 9.5]; P.hr = [2.6, 4.6, 9.5]; }
    if (anim === "windup") { P.spread = 3; P.crouch = 0.3; P.lean = -0.6; P.lf = 1.2; P.rf = -2; P.hl = [-0.8, 1.6, 21.5]; P.hr = [1.2, 2, 22.5]; }
    if (anim === "stagger") { P.spread = 2.6; P.crouch = 0.6; P.lean = -1.6; P.lf = -1; P.rf = 1.4; P.hl = [-5.4, -0.5, 14]; P.hr = [5.4, -0.5, 14]; }
    return P;
  }

  // Modell aus Grundformen, je mit Material
  function model(P, L) {
    var cz = -P.crouch, ln = P.lean, prims = [];
    function add(f, m) { prims.push([f, m]); }
    // Füße (Waraji-Sandalen mit Tabi)
    [[-1, P.lf, P.ll], [1, P.rf, P.rl]].forEach(function (G) {
      var x = G[0] * P.spread, y = G[1], lift = G[2];
      add(box(x, y + 0.8, 0.5 + lift, 1.2, 1.9, 0.5), "sole");
      add(ell(x, y + 0.6, 1.5 + lift, 1.1, 1.7, 0.8), "white");
      // Hakama-Hosenbein, weit ausgestellt
      add(cone([x * 0.55, ln * 0.4, 11.2 + cz], [x * 1.08, y * 0.85, 2.2 + lift], 2.6, 3.4), L.legs);
    });
    // Obi (Gürtel)
    add(ecyl(0, ln * 0.5, 4.3, 3.1, 10.6 + cz, 12.2 + cz), "obi");
    // Oberkörper (Kosode) mit Kataginu-Weste
    add(ecyl(0, ln * 0.6, 3.9, 2.7, 12 + cz, 19.2 + cz + P.breathe), "torso");
    // Kataginu-Schulterflügel
    if (L.wings) add(box(0, ln * 0.65, 19.3 + cz + P.breathe, 7.2, 1.3, 0.55), L.wings);
    if (L.sode) { add(box(-5.1, ln * 0.6, 17.3 + cz + P.breathe, 1.9, 1.7, 2.4), "armor"); add(box(5.1, ln * 0.6, 17.3 + cz + P.breathe, 1.9, 1.7, 2.4), "armor"); }
    if (L.kusazuri) add(ecyl(0, ln * 0.5, 4.9, 3.7, 7.8 + cz, 11.2 + cz), "armor");
    // Arme (weite Ärmel) und Hände
    [[-1, P.hl], [1, P.hr]].forEach(function (A) {
      var sh = [A[0] * 4.4, ln * 0.6, 18.2 + cz + P.breathe], h = [A[1][0], A[1][1] + ln * 0.5, A[1][2] + cz];
      add(cone(sh, h, 1.7, 1.45), L.sleeve);
      add(ell(h[0], h[1], h[2] - 0.3, 0.95, 0.95, 0.95), "skin");
    });
    // Hals und Kopf
    add(ecyl(0, ln * 0.7, 1.3, 1.2, 19 + cz, 21 + cz), "skin");
    add(ell(0, ln * 0.8 + 0.2, 23.6 + cz + P.breathe, 3.9, 3.7, 4.0), "head");
    var hz = 23.6 + cz + P.breathe, hy = ln * 0.8 + 0.2;
    // Haarband hinten am Kopf (die langen Haare werden dynamisch gezeichnet)
    if (!L.hat) add(ell(0, hy - 3.3, hz + 1.4, 1.1, 0.9, 1.0), "red");
    // Strohhut (Sugegasa): flacher, weiter Kegel
    if (L.hat) { add(ell(0, hy, hz + 1.3, 7.2, 7.2, 0.9), "straw"); add(ell(0, hy, hz + 2.2, 4.4, 4.4, 1.7), "straw"); add(ell(0, hy, hz + 3.6, 1.6, 1.6, 1.1), "straw"); }
    // Köcher auf dem Rücken mit Pfeilfedern
    if (L.quiver) { add(cone([2.1, ln * 0.6 - 3.0, 11.8 + cz], [3.4, ln * 0.6 - 3.5, 22.4 + cz], 1.05, 1.2), "rope"); add(ell(3.5, ln * 0.6 - 3.5, 23.5 + cz, 1.15, 0.95, 1.05), "white"); }
    // Leere Saya (Schwertscheide) an der linken Hüfte
    if (L.saya) { add(cone([-3.8, ln * 0.5 + 1.8, 11.6 + cz], [-4.6, ln * 0.5 - 4.6, 9.8 + cz], 0.62, 0.62), "saya"); add(ell(-3.8, ln * 0.5 + 2.1, 11.7 + cz, 0.75, 0.6, 0.75), "gold"); }
    return { prims: prims, ln: ln, cz: cz, P: P, L: L };
  }

  // Material mit Details (Gesicht, V-Kragen, Wappen)
  function material(name, x, y, z, M) {
    // Rüstungsplatten mit waagerechter Schnürung
    if (name === "armor") return (((z - M.cz) * 1.15) % 1 + 1) % 1 < 0.2 ? "lace" : "armor";
    if (name === "head") {
      var hy = y - (M.ln * 0.8 + 0.2), hz = z - (23.6 + M.cz + M.P.breathe);
      if (hy < 0.9 - Math.max(0, -hz) * 0.5 || hz > 1.5) return "hair";
      if (M.L.eyes !== false && hy > 1.5 && Math.abs(hz + 0.1) < 0.55 && Math.abs(Math.abs(x) - 1.45) < 0.55) return "eye";
      if (M.L.hat && hy > 1 && hz < 0.6 && hz > -0.4) return "hair";
      if (M.L.hachimaki && hz > 0.55 && hz < 1.2) return "white";
      if (hy > 2 && Math.abs(hz - 0.85) < 0.3 && Math.abs(Math.abs(x) - 1.5) < 0.8) return "hair";
      return "skin";
    }
    if (name === "torso") {
      var ty = y - M.ln * 0.6, tz = z - M.cz;
      if (M.L.torso === "armor") return material("armor", x, y, z, M);
      if (M.L.torso === "kimono") {
        if (ty > 0.8 && tz > 14.2 && Math.abs(x + (tz - 14) * 0.25) < (tz - 13.6) * 0.42) return Math.abs(x + (tz - 14) * 0.25) > (tz - 13.6) * 0.3 ? "ivory" : "skin";
        return M.L.robe || "rag";
      }
      if (ty > 0.8 && tz > 15.5 && Math.abs(x) < (tz - 15.2) * 0.62) return "ivory";
      if (ty > 1.2 && Math.abs(Math.abs(x) - 2.1) < 0.55 && Math.abs(tz - 17.4) < 0.55) return "white";
      if (ty < -1.2 && Math.abs(x) < 0.8 && Math.abs(tz - 17.6) < 0.8) return "white";
      return "red";
    }
    return name;
  }

  function sdf(prims, x, y, z) {
    var best = 1e9, bi = -1;
    for (var i = 0; i < prims.length; i++) { var d = prims[i][0](x, y, z); if (d < best) { best = d; bi = i; } }
    return [best, bi];
  }

  // Raymarching eines Sprites
  function render(dir, P, L) {
    var M = model(P, L), prims = M.prims;
    var ang = dir * Math.PI / 4, fx = Math.cos(ang), fy = Math.sin(ang), rx = -fy, ry = fx;
    var sc = L.scale || 1, sw = Math.round(SW * sc), sh = Math.round(SH * sc), ax = Math.round(AX * sc), ay = Math.round(AY * sc);
    var cv = SZ.canvas(sw, sh), img = cv.ctx.createImageData(sw, sh), d = img.data;
    var Lx = -0.5, Ly = 0.42, Lz = 0.76;
    function toModel(wx, wy, wz) { return [wx * rx + wy * ry, wx * fx + wy * fy, wz]; }
    for (var py = 0; py < sh; py++) for (var px = 0; px < sw; px++) {
      var sx = (px + 0.5 - ax) / sc, sy = (py + 0.5 - ay) / sc;
      var t = 22, hit = -1, hx = 0, hy = 0, hz = 0;
      for (var it = 0; it < 90 && t > -10; it++) {
        var wy = sy * SE + t * CE, wz = -sy * CE + t * SE;
        var m = toModel(sx, wy, wz), r = sdf(prims, m[0], m[1], m[2]);
        if (r[0] < 0.06) { hit = r[1]; hx = m[0]; hy = m[1]; hz = m[2]; break; }
        t -= Math.max(r[0] * 0.9, 0.08);
      }
      if (hit < 0) continue;
      var e = 0.12, n0 = sdf(prims, hx + e, hy, hz)[0] - sdf(prims, hx - e, hy, hz)[0], n1 = sdf(prims, hx, hy + e, hz)[0] - sdf(prims, hx, hy - e, hz)[0], n2 = sdf(prims, hx, hy, hz + e)[0] - sdf(prims, hx, hy, hz - e)[0];
      var nl = Math.sqrt(n0 * n0 + n1 * n1 + n2 * n2) || 1;
      // Normale zurück in Weltkoordinaten
      var wnx = (n0 * rx + n1 * fx) / nl, wny = (n0 * ry + n1 * fy) / nl, wnz = n2 / nl;
      var lam = Math.max(0, wnx * Lx + wny * Ly + wnz * Lz);
      var v = 0.22 + lam * 0.85;
      var mat = material(prims[hit][1], hx, hy, hz, M), pal = PAL[mat] || PAL.red;
      var tone = v < 0.42 ? 0 : v < 0.68 ? 1 : v < 0.92 ? 2 : 3;
      var c = SZ.hex(pal[tone]), i = (py * sw + px) * 4;
      d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
    }
    cv.ctx.putImageData(img, 0, 0);
    SZ.outline(cv, "#0E0A0A");
    return { cv: cv, sil: SZ.silhouette(cv), ax: ax, ay: ay };
  }

  var FRAMES = { idle: 2, walk: 6, block: 1, parry: 1, atk: 1, dash: 1, bow: 1, windup: 1, stagger: 1, blockwalk: 6, bowwalk: 6, cast_up: 1, cast_flow: 1, cast_flow2: 1, cast_push: 1, cast_low: 1 };
  var USE = { samurai: ["idle", "walk", "block", "parry", "atk", "dash", "bow", "stagger", "blockwalk", "bowwalk", "cast_up", "cast_flow", "cast_flow2", "cast_push", "cast_low"], ronin: ["idle", "walk", "atk", "windup", "stagger", "block"], heavy: ["idle", "walk", "atk", "windup", "stagger"], yumi: ["idle", "walk", "bow", "stagger"] };
  var cache = {}, queue = [];
  function frame(dir, anim, k, look) {
    look = look || "samurai";
    var n = FRAMES[anim] || 1; k = ((k % n) + n) % n;
    var key = look + ":" + dir + ":" + anim + ":" + k;
    if (!cache[key]) cache[key] = render(dir, pose(anim, k, n), LOOKS[look]);
    return cache[key];
  }
  // Vorab im Hintergrund rendern, damit das Spiel nicht ruckelt
  function prewarm() {
    queue = [];
    Object.keys(USE).forEach(function (look) { USE[look].forEach(function (a) { for (var k = 0; k < FRAMES[a]; k++) for (var d = 0; d < 8; d++) queue.push([d, a, k, look]); }); });
  }
  function work(ms) {
    var t0 = performance.now();
    while (queue.length && performance.now() - t0 < ms) { var q = queue.shift(); frame(q[0], q[1], q[2], q[3]); }
    return queue.length;
  }

  // Welt-Versatz (dx rechts, dy Süden, dz hoch) → Bildschirm
  function proj(dx, dy, dz) { return { x: dx, y: dy * SE - dz * CE, depth: dy * CE + dz * SE }; }

  // Schwert zeichnen: Griff am Punkt hand (Weltversatz), Klinge in Richtung ang (Welt-Ebene), Neigung tilt (−1..1)
  // Speer: langer Holzschaft, kurze Stahlklinge mit rotem Büschel, Schaft ragt hinter die Hand
  function drawSpear(ctx, ox, oy, hand, ang, tilt, w, flash) {
    var st = w.style, L = w.blade, dx = Math.cos(ang), dy = Math.sin(ang), dz = tilt;
    var nrm = Math.sqrt(dx * dx + dy * dy + dz * dz); dx /= nrm; dy /= nrm; dz /= nrm;
    function P(k) { return proj(hand[0] + dx * k, hand[1] + dy * k, hand[2] + dz * k); }
    var p = SZ.pen(ctx), butt = P(-9), h = P(0), neck = P(L - 6), tip = P(L);
    p.line(ox + butt.x, oy + butt.y, ox + neck.x, oy + neck.y, st.grip);
    p.px(ox + butt.x, oy + butt.y, st.wrap); var mid = P(L * 0.45); p.px(ox + mid.x, oy + mid.y, st.wrap);
    var tuft = P(L - 6.5); p.px(ox + tuft.x, oy + tuft.y, "#B8302A"); p.px(ox + tuft.x, oy + tuft.y + 1, "#8A2220");
    p.line(ox + neck.x + 0.5, oy + neck.y + 1, ox + tip.x + 0.5, oy + tip.y + 1, st.edge);
    p.line(ox + neck.x, oy + neck.y, ox + tip.x, oy + tip.y, flash ? "#FFFFFF" : st.blade);
    var sh = P(L - 2); p.px(ox + sh.x, oy + sh.y, st.shine);
    return { tip: { x: ox + tip.x, y: oy + tip.y }, base: { x: ox + neck.x, y: oy + neck.y }, depth: (h.depth + tip.depth) / 2 };
  }
  function drawSword(ctx, ox, oy, hand, ang, tilt, w, flash) {
    if (w.spear) return drawSpear(ctx, ox, oy, hand, ang, tilt, w, flash);
    var st = w.style, L = w.blade;
    var dx = Math.cos(ang), dy = Math.sin(ang), dz = tilt;
    var nrm = Math.sqrt(dx * dx + dy * dy + dz * dz); dx /= nrm; dy /= nrm; dz /= nrm;
    var h = proj(hand[0], hand[1], hand[2]);
    var g0 = proj(hand[0] - dx * 3.5, hand[1] - dy * 3.5, hand[2] - dz * 3.5);
    var tip = proj(hand[0] + dx * L, hand[1] + dy * L, hand[2] + dz * L);
    var p = SZ.pen(ctx), x0 = ox + h.x, y0 = oy + h.y;
    p.line(ox + g0.x, oy + g0.y, x0, y0, st.grip);
    var mid = proj(hand[0] - dx * 1.6, hand[1] - dy * 1.6, hand[2] - dz * 1.6); p.px(ox + mid.x, oy + mid.y, st.wrap);
    // Klinge mit dunkler Schneide darunter
    p.line(x0 + 0.5, y0 + 1, ox + tip.x + 0.5, oy + tip.y + 1, st.edge);
    p.line(x0, y0, ox + tip.x, oy + tip.y, flash ? "#FFFFFF" : st.blade);
    var shine = proj(hand[0] + dx * L * 0.7, hand[1] + dy * L * 0.7, hand[2] + dz * L * 0.7);
    p.px(ox + shine.x, oy + shine.y, st.shine);
    p.px(x0, y0, st.guard); p.px(x0 + 1, y0, st.guard);
    return { tip: { x: ox + tip.x, y: oy + tip.y }, base: { x: x0, y: y0 }, depth: (h.depth + tip.depth) / 2 };
  }

  // ---------- Lange Haare: kleine Kette mit Trägheit, Schwerkraft und Wind ----------
  function Hair(n, seg) { this.n = n || 7; this.seg = seg || 2.1; this.p = null; }
  Hair.prototype.anchor = function (face, ox, oy, lean) {
    var d = Math.round(face / (Math.PI / 4)) * Math.PI / 4, fx = Math.cos(d), fy = Math.sin(d);
    var pr = proj(-fx * (3.2 + lean * 0.3), -fy * (3.2 + lean * 0.3), 24.6);
    return { x: ox + pr.x, y: oy + pr.y, fx: fx, fy: fy };
  };
  Hair.prototype.update = function (dt, a, wind, t) {
    var P = this.p, n = this.n, seg = this.seg, i;
    if (!P) { P = this.p = []; for (i = 0; i < n; i++) P.push({ x: a.x, y: a.y + i * seg, px: a.x, py: a.y + i * seg }); }
    var gust = (Math.sin(t * 1.3) * 0.5 + Math.sin(t * 3.7 + 1) * 0.3 + 0.6) * wind;
    P[0].x = a.x; P[0].y = a.y; P[0].px = a.x; P[0].py = a.y;
    var h = Math.min(dt, 0.033);
    for (i = 1; i < n; i++) {
      var q = P[i], vx = (q.x - q.px) * 0.9, vy = (q.y - q.py) * 0.9;
      q.px = q.x; q.py = q.y;
      var k = i / n;
      q.x += vx + (gust * 26 * k - a.fx * 34) * h * h * 60;
      q.y += vy + (150 - a.fy * 18) * h * h * 60 * 0.6;
    }
    for (var it = 0; it < 3; it++) for (i = 1; i < n; i++) {
      var A = P[i - 1], B = P[i], dx = B.x - A.x, dy = B.y - A.y, dd = Math.sqrt(dx * dx + dy * dy) || 1, f = (dd - seg) / dd;
      B.x -= dx * f; B.y -= dy * f;
    }
  };
  Hair.prototype.draw = function (ctx, alpha) {
    var P = this.p; if (!P) return;
    var pen = SZ.pen(ctx);
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    for (var i = 1; i < P.length; i++) {
      var a = P[i - 1], b = P[i];
      pen.line(a.x, a.y, b.x, b.y, i < 3 ? "#0E0A0A" : "#171111");
      if (i < 5) pen.line(a.x + 1, a.y, b.x + 1, b.y, "#171111");
      if (i === 2) pen.px(a.x, a.y, "#3A3030");
    }
    ctx.globalAlpha = 1;
  };

  // ---------- Yumi (Langbogen): senkrecht in der linken Hand, Sehne nach Ladung gespannt ----------
  function drawBow(ctx, ox, oy, hand, ang, draw, shake) {
    var fx = Math.cos(ang), fy = Math.sin(ang), pen = SZ.pen(ctx), pts = [];
    var jx = shake ? (Math.random() - 0.5) * shake : 0, jy = shake ? (Math.random() - 0.5) * shake : 0;
    var bend = 1.6 + draw * 2.6;
    for (var i = 0; i <= 12; i++) {
      var s = i / 12, z = -7 + s * 22, u = (z - 0) / (z < 0 ? 7 : 15);
      var off = bend * (1 - u * u);
      var p = proj(hand[0] + fx * off, hand[1] + fy * off, hand[2] + z);
      pts.push({ x: ox + p.x + jx, y: oy + p.y + jy });
    }
    var nockW = proj(hand[0] - fx * draw * 7, hand[1] - fy * draw * 7, hand[2]);
    var nock = { x: ox + nockW.x + jx, y: oy + nockW.y + jy };
    pen.line(pts[0].x, pts[0].y, nock.x, nock.y, "#E8E0CC"); pen.line(nock.x, nock.y, pts[12].x, pts[12].y, "#E8E0CC");
    for (var k = 1; k < pts.length; k++) pen.line(pts[k - 1].x, pts[k - 1].y, pts[k].x, pts[k].y, k === 5 ? "#C9A445" : "#2A1A14");
    pen.px(pts[3].x - 1, pts[3].y, "#5A3A2A"); pen.px(pts[9].x - 1, pts[9].y, "#5A3A2A");
    return nock;
  }
  // Pfeil von nock in Richtung ang (Welt-Ebene), z über dem Boden schon im Bildpunkt enthalten
  function drawArrow(ctx, x, y, ang, len, glint) {
    var dx = Math.cos(ang), dy = Math.sin(ang) * SE, l = Math.sqrt(dx * dx + dy * dy) || 1, pen = SZ.pen(ctx);
    dx /= l; dy /= l;
    var tx = x + dx * len, ty = y + dy * len;
    pen.line(x, y, tx, ty, "#8A6A44");
    pen.px(tx, ty, glint ? "#FFFFFF" : "#C8CED4"); pen.px(tx - dx, ty - dy, "#9AA2AA");
    pen.px(x - dy, y + dx, "#E8E0D0"); pen.px(x + dy, y - dx, "#E8E0D0"); pen.px(x + dx - dy, y + dy + dx, "#B8302A");
    return { x: tx, y: ty };
  }

  SZ.samurai = { Hair: Hair, drawBow: drawBow, drawArrow: drawArrow, frame: frame, FRAMES: FRAMES, prewarm: prewarm, work: work, proj: proj, drawSword: drawSword, AX: AX, AY: AY, W: SW, H: SH, PAL: PAL };
})();
