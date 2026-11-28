/* Monsters Arc – monster3d.js (seit v0.26)
   3D-Baukasten für Monster (Prinzip wie im Spiel „Spore“): Das Modell ist eine Wirbelsäule aus Wirbeln (Punkt + Dicke),
   ein Schädel aus Knoten, Gliedmaßen aus Gelenken, aufgestempelte Teile (Augen, Münder, Hörner/Flügel, Füße, Hände)
   und Pinselstriche (Oberfläche Haut/Fell/Stein/Feder oder Farbe). Alles wird zu einer weichen, organischen Form
   verschmolzen (Signed Distance Field, „smooth union“) und auf der Grafikkarte per Raymarching gerendert
   (WebGL2, Licht schräg von oben links, weiche Schatten, Umgebungsverdeckung).
   Das Ergebnis wird danach auf Spielpixel heruntergerechnet: je Farbe 4 Tonstufen, leichtes Raster, Außenlinie und
   Innenlinien an Tiefensprüngen, Fell bekommt Büschel an der Kante. Nur im Editor steckt die 3D-Rechnung,
   im Spiel liegen fertige Pixelbilder (vorne/hinten).

   Koordinaten: x = rechts/links (Symmetrieebene x = 0), y = oben, z = vorne (Blickrichtung des Monsters). Boden y = −1.
   Farbplätze (slot): 0 Körper (pal.main), 1 Zweitfarbe (sec), 2 Akzent (acc), 3 Extra (Hörner, Krallen; extra), 4 Augen (eye),
   5 Weiß, 6 Schwarz, 7 Mundrot. Oberflächen (mat): 0 Haut, 1 Fell, 2 Stein, 3 Feder.

   Modell (Feld `model` im Monster-Datensatz):
   { v: 1, sym, mat (Grund-Oberfläche), slot (Grundfarbe Körper),
     spine: [{ p:[x,y,z], r, w }],   // Wirbel, Index 0 = vorne (Hals), w = Breite (x-Streckung)
     head:  [{ p, r, w }],           // Schädelknoten, Index 0 sitzt am Hals
     limbs: [{ pre, sym, slot, anc, j:[{ p, r }] }],   // Gelenke; Dicke eines Gelenks gilt bis zum nächsten Gelenk
     stamps:[{ a, p, n, rot, tilt, s, sym, anc }],     // a = Asset-ID, anc = Anker (s/h/l/e)
     paint: [{ p, r, k, v, sym, anc }] }                // k 0 = Oberfläche (v = mat), 1 = Farbe (v = slot)
   Anker: { k:"s", i } Wirbel, { k:"h", i } Schädel, { k:"l", i, j } Gelenk, { k:"e", i } Gliedende (Füße/Hände). */
(function () {
  var MA = window.MA, L2 = MA.L2, GND = -1;

  // ---------- Vektoren / Quaternionen ----------
  function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function mul(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function len(a) { return Math.sqrt(dot(a, a)); }
  function norm(a) { var l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
  function mir(a) { return [-a[0], a[1], a[2]]; }
  function qmul(a, b) {
    return [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
      a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
  }
  function qaxis(ax, ang) { var s = Math.sin(ang / 2); return [ax[0] * s, ax[1] * s, ax[2] * s, Math.cos(ang / 2)]; }
  function qeul(e) { return qmul(qaxis([0, 0, 1], e[2] || 0), qmul(qaxis([0, 1, 0], e[1] || 0), qaxis([1, 0, 0], e[0] || 0))); }
  function qrot(q, v) { var u = [q[0], q[1], q[2]], t = add(cross(u, v), mul(v, q[3])); return add(v, mul(cross(u, t), 2)); }
  function qinv(q, v) { return qrot([-q[0], -q[1], -q[2], q[3]], v); }
  function qbasis(X, Y, Z) {   // Spalten = lokale Achsen in Weltkoordinaten
    var m00 = X[0], m10 = X[1], m20 = X[2], m01 = Y[0], m11 = Y[1], m21 = Y[2], m02 = Z[0], m12 = Z[1], m22 = Z[2], tr = m00 + m11 + m22, s;
    if (tr > 0) { s = Math.sqrt(tr + 1) * 2; return [(m21 - m12) / s, (m02 - m20) / s, (m10 - m01) / s, 0.25 * s]; }
    if (m00 > m11 && m00 > m22) { s = Math.sqrt(1 + m00 - m11 - m22) * 2; return [0.25 * s, (m01 + m10) / s, (m02 + m20) / s, (m21 - m12) / s]; }
    if (m11 > m22) { s = Math.sqrt(1 + m11 - m00 - m22) * 2; return [(m01 + m10) / s, 0.25 * s, (m12 + m21) / s, (m02 - m20) / s]; }
    s = Math.sqrt(1 + m22 - m00 - m11) * 2; return [(m02 + m20) / s, (m12 + m21) / s, 0.25 * s, (m10 - m01) / s];
  }
  function clamp(v, a, b, d) { v = +v; return isFinite(v) ? Math.max(a, Math.min(b, v)) : d; }

  // ---------- Gliedmaßen-Vorlagen (lokal: x = vom Körper weg, y = oben, z = vorne) ----------
  var PRESETS = [
    { id: "stub", n: ["Stummel", "Stub"], j: [[0, 0, 0], [0.16, -0.06, 0]], r: [0.11, 0.09] },
    { id: "leg2", n: ["Bein kurz", "Short leg"], j: [[0, 0, 0], [0.06, -0.3, 0.04], [0.06, -0.6, 0]], r: [0.1, 0.08, 0.07], ground: 1 },
    { id: "leg3", n: ["Bein", "Leg"], j: [[0, 0, 0], [0.08, -0.32, 0.12], [0.08, -0.7, 0]], r: [0.09, 0.07, 0.06], ground: 1 },
    { id: "hind", n: ["Hinterbein", "Hind leg"], j: [[0, 0, 0], [0.08, -0.22, 0.16], [0.08, -0.46, -0.1], [0.08, -0.7, 0.02]], r: [0.1, 0.075, 0.055, 0.05], ground: 1 },
    { id: "insect", n: ["Insektenbein", "Insect leg"], j: [[0, 0, 0], [0.22, 0.16, 0], [0.44, -0.08, 0.02], [0.52, -0.55, 0.04]], r: [0.04, 0.035, 0.03, 0.02], ground: 1 },
    { id: "spider", n: ["Spinnenbein", "Spider leg"], j: [[0, 0, 0], [0.25, 0.3, 0], [0.55, 0.15, 0], [0.7, -0.6, 0]], r: [0.045, 0.04, 0.03, 0.02], ground: 1 },
    { id: "arm3", n: ["Arm", "Arm"], j: [[0, 0, 0], [0.28, -0.14, 0.02], [0.48, -0.32, 0.12]], r: [0.07, 0.06, 0.05] },
    { id: "arm4", n: ["Arm lang", "Long arm"], j: [[0, 0, 0], [0.28, -0.1, 0], [0.55, -0.24, 0.1], [0.78, -0.32, 0.18]], r: [0.07, 0.06, 0.05, 0.045] },
    { id: "wing", n: ["Flügelarm", "Wing arm"], j: [[0, 0, 0], [0.25, 0.18, -0.02], [0.5, 0.32, -0.08], [0.72, 0.26, -0.16]], r: [0.05, 0.04, 0.03, 0.02] },
    { id: "tentacle", n: ["Tentakel", "Tentacle"], j: [[0, 0, 0], [0.14, -0.08, 0], [0.27, -0.12, 0.06], [0.38, -0.1, 0.14], [0.45, -0.04, 0.22], [0.48, 0.04, 0.28]], r: [0.07, 0.06, 0.05, 0.04, 0.03, 0.02], free: 1 },
    { id: "tail", n: ["Schwanz", "Tail"], j: [[0, 0, 0], [0.22, 0.03, 0], [0.42, 0.12, 0], [0.58, 0.26, 0]], r: [0.09, 0.07, 0.05, 0.03], free: 1 },
    { id: "neck", n: ["Hals/Stiel", "Stalk"], j: [[0, 0, 0], [0.12, 0.2, 0], [0.18, 0.42, 0]], r: [0.06, 0.05, 0.05], free: 1 }
  ];
  function preset(id) { for (var i = 0; i < PRESETS.length; i++) if (PRESETS[i].id === id) return PRESETS[i]; return PRESETS[2]; }
  // Glied an einer Stelle ansetzen. out = Richtung vom Körper weg (Oberflächennormale)
  function makeLimb(pid, root, out, o) {
    o = o || {}; var P = preset(pid), rs = o.rs || 1, ls = o.ls || 1, X, Y, Z;
    if (P.free) { X = norm(out); Y = [0, 1, 0]; Y = sub(Y, mul(X, dot(X, Y))); if (len(Y) < 0.2) Y = [0, 0, 1]; Y = norm(Y); Z = cross(X, Y); }
    else {
      X = [out[0], 0, out[2]]; if (len(X) < 0.15) X = [out[0] >= 0 ? 1 : -1, 0, 0]; X = norm(X); Y = [0, 1, 0];
      Z = sub([0, 0, 1], mul(X, X[2])); Z = len(Z) < 0.3 ? norm(cross(X, Y)) : norm(Z);
    }
    var pts = P.j.map(function (q) { return add(root, add(add(mul(X, q[0] * ls), mul(Y, q[1] * ls)), mul(Z, q[2] * ls))); });
    if (P.ground) {
      var last = pts.length - 1, dy = pts[last][1] - root[1], tgt = GND + P.r[last] * rs * 0.9;
      if (dy < -0.01) { var k = clamp((tgt - root[1]) / dy, 0.15, 3, 1); pts = pts.map(function (p) { return [p[0], root[1] + (p[1] - root[1]) * k, p[2]]; }); }
    }
    return { pre: P.id, sym: !!o.sym, slot: 0, anc: o.anc || null, j: pts.map(function (p, i) { return { p: p, r: P.r[i] * rs }; }) };
  }

  // ---------- Stempel-Assets (lokal: z = von der Oberfläche weg, y = oben, x = seitlich; Maßstab 1) ----------
  function E(c, r, slot, o) { o = o || {}; return { t: 0, c: c, r: r, q: o.rot ? qeul(o.rot) : [0, 0, 0, 1], slot: slot, k: o.k || 0, f: o.f || 0, eye: o.eye, lt: o.lt || 0 }; }
  function C(a, b, r1, r2, slot, o) { o = o || {}; return { t: 1, a: a, b: b, r1: r1, r2: r2, w: 1, slot: slot, k: o.k || 0, f: 0 }; }
  function EYE(c, r, iris, pup, shape, lid, lt, f) { return E(c, [r, r, r].map(function (v, i) { return Array.isArray(r) ? r[i] : v; }), 4, { f: 2 | (f || 0), eye: [iris, pup, shape, lid], lt: lt || 0 }); }
  function chain(pts, rads, slot, k) { var o = []; for (var i = 0; i < pts.length - 1; i++) o.push(C(pts[i], pts[i + 1], rads[i], rads[i + 1], slot, { k: k || 0 })); return o; }
  function fan(n, a0, a1, L, w, slot, x) {   // flache Federn/Finger als Fächer in der y-z-Ebene
    var o = []; for (var i = 0; i < n; i++) { var a = a0 + (a1 - a0) * (n > 1 ? i / (n - 1) : 0.5), d = [0, Math.sin(a), Math.cos(a)]; o.push(E([x || 0, d[1] * L * 0.9, d[2] * L * 0.9], [w * 0.35, w, L], slot, { rot: [-a, 0, 0] })); }
    return o;
  }
  function fingers(n, spread, L, r, slot, claw) {   // Finger nach vorne (+z), Krallen optional
    var o = []; for (var i = 0; i < n; i++) {
      var a = n > 1 ? (i / (n - 1) - 0.5) * spread : 0, d = [Math.sin(a), 0, Math.cos(a)], b0 = mul(d, 0.04), e = add(b0, mul(d, L));
      o.push(C(b0, e, r, r * 0.8, 0, { k: 0.015 })); if (claw) o.push(C(e, add(e, add(mul(d, L * 0.45), [0, -0.02, 0])), r * 0.75, 0.003, 3));
    }
    return o;
  }
  function toes(n, spread, L, r, slot, claw, y) {   // Zehen nach vorne am Boden
    var o = []; for (var i = 0; i < n; i++) {
      var a = n > 1 ? (i / (n - 1) - 0.5) * spread : 0, d = [Math.sin(a), 0, Math.cos(a)], b0 = add([0, y || -0.04, 0], mul(d, 0.03)), e = add(b0, mul(d, L));
      o.push(C(b0, e, r, r * 0.85, slot, { k: 0.015 })); if (claw) o.push(C(e, add(e, add(mul(d, L * 0.5), [0, -0.015, 0])), r * 0.7, 0.003, 3));
    }
    return o;
  }
  var A = { eyes: [], mouth: [], deco: [], feet: [], hands: [] };
  function def(cat, de, en, fn) { A[cat].push({ id: cat + A[cat].length, n: [de, en], cat: cat, p: fn() }); }
  // Augen
  def("eyes", "Rund", "Round", function () { return [EYE([0, 0, -0.02], 0.07, 0.55, 0.26, 0, 1)]; });
  def("eyes", "Groß", "Big", function () { return [EYE([0, 0, -0.03], 0.1, 0.62, 0.3, 0, 1)]; });
  def("eyes", "Knopf", "Button", function () { return [EYE([0, 0, -0.02], 0.06, 0.95, 0.82, 0, 1)]; });
  def("eyes", "Katze", "Cat", function () { return [EYE([0, 0, -0.02], 0.075, 0.78, 0.3, 1, 1)]; });
  def("eyes", "Ziege", "Goat", function () { return [EYE([0, 0, -0.02], 0.075, 0.72, 0.34, 2, 1)]; });
  def("eyes", "Müde", "Sleepy", function () { return [EYE([0, 0, -0.02], 0.075, 0.6, 0.28, 0, 0.12)]; });
  def("eyes", "Wütend", "Angry", function () { return [EYE([0, 0, -0.02], 0.075, 0.6, 0.28, 0, 0.32, 0.65), C([0.08, 0.075, 0.005], [-0.06, 0.035, 0.02], 0.022, 0.018, 0, { k: 0.02 })]; });
  def("eyes", "Verträumt", "Dreamy", function () { return [EYE([0, 0, -0.02], 0.075, 0.7, 0.32, 0, -0.15)]; });
  def("eyes", "Glühend", "Glowing", function () { return [EYE([0, 0, -0.02], 0.075, 1, 0, 4, 1)]; });
  def("eyes", "Facette", "Compound", function () { return [EYE([0, 0, -0.02], [0.085, 0.095, 0.075], 1, 0, 4, 1, 0, 4)]; });
  def("eyes", "Stielauge", "Eye stalk", function () { return [C([0, 0, -0.05], [0, 0.11, 0.07], 0.022, 0.018, 0, { k: 0.02 }), EYE([0, 0.13, 0.09], 0.06, 0.55, 0.26, 0, 1)]; });
  def("eyes", "Zyklop", "Cyclops", function () { return [EYE([0, 0, -0.05], 0.15, 0.55, 0.24, 0, 1)]; });
  def("eyes", "Punkt", "Dot", function () { return [EYE([0, 0, -0.01], 0.035, 0.95, 0.9, 0, 1)]; });
  def("eyes", "Ring", "Ring", function () { return [EYE([0, 0, -0.02], 0.075, 0.72, 0.48, 5, 1)]; });
  def("eyes", "Stern", "Star", function () { return [EYE([0, 0, -0.02], 0.075, 0.72, 0.36, 3, 1)]; });
  def("eyes", "Wimpern", "Lashes", function () { return [EYE([0, 0, -0.02], 0.075, 0.6, 0.28, 0, 1)].concat([-0.04, 0, 0.04].map(function (x) { return C([x, 0.05, 0.02], [x * 1.6, 0.11, 0.03], 0.01, 0.004, 6); })); });
  def("eyes", "Echse", "Lizard", function () { return [EYE([0, 0, -0.02], 0.075, 0.85, 0.26, 1, 0.55), E([0, 0.06, 0.0], [0.085, 0.025, 0.05], 0, { k: 0.02 })]; });
  def("eyes", "Oval", "Oval", function () { return [EYE([0, 0, -0.02], [0.06, 0.1, 0.06], 0.6, 0.3, 0, 1)]; });
  def("eyes", "Dreiergruppe", "Cluster", function () { return [EYE([-0.05, -0.02, -0.01], 0.04, 0.7, 0.35, 0, 1), EYE([0.05, -0.02, -0.01], 0.04, 0.7, 0.35, 0, 1), EYE([0, 0.06, -0.01], 0.045, 0.7, 0.35, 0, 1)]; });
  def("eyes", "Leer", "Hollow", function () { return [EYE([0, 0, -0.02], 0.075, 0.92, 0.22, 7, 1)]; });
  // Münder
  def("mouth", "Lächeln", "Smile", function () { return chain([[-0.07, 0.025, -0.01], [-0.03, -0.005, 0], [0.03, -0.005, 0], [0.07, 0.025, -0.01]], [0.011, 0.012, 0.012, 0.011], 6); });
  def("mouth", "Offen", "Open", function () { return [E([0, 0, -0.015], [0.06, 0.04, 0.03], 6), E([0, -0.022, -0.005], [0.035, 0.016, 0.022], 7)]; });
  def("mouth", "Zähnchen", "Little teeth", function () { return chain([[-0.07, 0.025, -0.01], [0, -0.005, 0], [0.07, 0.025, -0.01]], [0.011, 0.012, 0.011], 6).concat([C([-0.03, 0.0, 0.004], [-0.028, -0.03, 0.006], 0.012, 0.004, 5), C([0.03, 0.0, 0.004], [0.028, -0.03, 0.006], 0.012, 0.004, 5)]); });
  def("mouth", "Fangzähne", "Fangs", function () { return [E([0, 0, -0.015], [0.065, 0.04, 0.03], 6), C([-0.035, 0.03, 0.008], [-0.03, -0.035, 0.012], 0.016, 0.004, 5), C([0.035, 0.03, 0.008], [0.03, -0.035, 0.012], 0.016, 0.004, 5)]; });
  def("mouth", "Schnabel spitz", "Pointed beak", function () { return [C([0, 0, -0.03], [0, -0.03, 0.17], 0.065, 0.008, 3, { k: 0.02 })]; });
  def("mouth", "Entenschnabel", "Duck bill", function () { return [E([0, -0.01, 0.06], [0.085, 0.025, 0.1], 3, { k: 0.02 })]; });
  def("mouth", "Grinsen", "Grin", function () { return [E([0, 0, -0.015], [0.085, 0.032, 0.03], 6)].concat([-0.05, -0.017, 0.017, 0.05].map(function (x) { return E([x, 0.012, 0.004], [0.014, 0.013, 0.014], 5); })); });
  def("mouth", "Mandibeln", "Mandibles", function () { return [-1, 1].map(function (s) { return chain([[s * 0.05, 0, -0.01], [s * 0.07, -0.03, 0.06], [s * 0.02, -0.05, 0.11]], [0.025, 0.018, 0.004], 3); }).reduce(function (a, b) { return a.concat(b); }); });
  def("mouth", "Schmollmund", "Pout", function () { return [E([0, 0, -0.005], [0.028, 0.022, 0.022], 6)]; });
  def("mouth", "Hauer", "Tusks", function () { return [E([0, 0, -0.012], [0.06, 0.02, 0.025], 6), C([-0.05, -0.01, 0.0], [-0.06, 0.07, 0.04], 0.018, 0.005, 5), C([0.05, -0.01, 0.0], [0.06, 0.07, 0.04], 0.018, 0.005, 5)]; });
  // Zacken, Hörner, Flügel, Stacheln, Fühler, Ohren
  def("deco", "Horn", "Horn", function () { return [C([0, 0, -0.03], [0, 0.03, 0.28], 0.06, 0.008, 3, { k: 0.03 })]; });
  def("deco", "Horn gebogen", "Curved horn", function () { return chain([[0, 0, -0.03], [0, 0.08, 0.14], [0, 0.2, 0.22], [0, 0.33, 0.2]], [0.06, 0.042, 0.022, 0.005], 3, 0.02); });
  def("deco", "Widderhorn", "Ram horn", function () { return chain([[0, 0, -0.02], [0.05, 0.12, 0.08], [0.13, 0.17, 0], [0.15, 0.07, -0.08], [0.1, -0.03, -0.04]], [0.055, 0.045, 0.035, 0.025, 0.012], 3, 0.02); });
  def("deco", "Hörnchen", "Nub", function () { return [C([0, 0, -0.03], [0, 0.02, 0.1], 0.045, 0.02, 3, { k: 0.03 })]; });
  def("deco", "Stachel", "Spike", function () { return [C([0, 0, -0.02], [0, 0, 0.17], 0.036, 0.003, 3, { k: 0.01 })]; });
  def("deco", "Stachelreihe", "Spike row", function () { return [[-0.09, 0.11], [0, 0.16], [0.09, 0.11]].map(function (q) { return C([0, q[0], -0.02], [0, q[0] - 0.02, q[1]], 0.033, 0.003, 3, { k: 0.01 }); }); });
  def("deco", "Rückenplatte", "Back plate", function () { return [E([0, 0, 0.08], [0.016, 0.12, 0.13], 1, { k: 0.02 })]; });
  def("deco", "Fühler", "Antenna", function () { return [C([0, 0, -0.02], [0, 0.07, 0.3], 0.012, 0.01, 0), E([0, 0.07, 0.31], [0.035, 0.035, 0.035], 3)]; });
  def("deco", "Fühler gefiedert", "Feathery antenna", function () { var o = [C([0, 0, -0.02], [0, 0.05, 0.3], 0.011, 0.008, 0)]; for (var i = 1; i <= 4; i++) { var z = i * 0.06; o.push(E([0.03, z / 6, z], [0.035, 0.008, 0.012], 1, { rot: [0, 0, 0.4] }), E([-0.03, z / 6, z], [0.035, 0.008, 0.012], 1, { rot: [0, 0, -0.4] })); } return o; });
  def("deco", "Federflügel", "Feather wing", function () { return fan(5, 0.15, 1.15, 0.19, 0.05, 1).concat([E([0, 0.04, 0.06], [0.03, 0.06, 0.09], 0, { k: 0.03 })]); });
  def("deco", "Lederflügel", "Bat wing", function () {
    var o = chain([[0, 0, 0], [0, 0.12, 0.12], [0, 0.18, 0.3]], [0.025, 0.02, 0.008], 3, 0.02);
    [[0, 0.25], [0.6, 0.27], [1.1, 0.22]].forEach(function (q) { o.push(C([0, 0.12, 0.12], [0, 0.12 + Math.sin(q[0]) * q[1] - q[1] * 0.4, 0.12 + Math.cos(q[0]) * q[1]], 0.012, 0.005, 3)); });
    o.push(E([0, 0.05, 0.22], [0.008, 0.13, 0.17], 1, { rot: [0.3, 0, 0] })); return o;
  });
  def("deco", "Insektenflügel", "Insect wing", function () { return [E([0, 0.06, 0.16], [0.006, 0.06, 0.17], 1, { rot: [-0.35, 0, 0] }), E([0, -0.04, 0.13], [0.006, 0.045, 0.13], 1, { rot: [0.3, 0, 0] })]; });
  def("deco", "Flosse", "Fin", function () { return [E([0, 0.03, 0.1], [0.014, 0.08, 0.13], 1, { rot: [-0.45, 0, 0], k: 0.02 })]; });
  def("deco", "Rückenflosse", "Dorsal fin", function () { return [E([0, -0.05, 0.11], [0.015, 0.14, 0.12], 1, { rot: [0.5, 0, 0], k: 0.02 })]; });
  def("deco", "Kamm", "Crest", function () { return [[0.06, 0.13, 0.07], [-0.02, 0.1, 0.055], [-0.1, 0.07, 0.04]].map(function (q) { return E([0, q[0], q[1] * 0.8], [0.014, q[2], q[1]], 1, { rot: [0.25, 0, 0], k: 0.02 }); }); });
  def("deco", "Blatt", "Leaf", function () { return [E([0, 0, 0.15], [0.016, 0.075, 0.15], 1, { k: 0.01 }), C([0, 0, -0.02], [0, 0, 0.27], 0.012, 0.006, 0)]; });
  def("deco", "Kristall", "Crystal", function () { return [C([0, 0, -0.03], [0, 0.02, 0.21], 0.05, 0.012, 3), C([0.04, 0, -0.03], [0.09, -0.02, 0.13], 0.035, 0.01, 3), C([-0.04, 0.02, -0.03], [-0.07, 0.04, 0.1], 0.03, 0.008, 3)]; });
  def("deco", "Spitzohr", "Pointed ear", function () { return [E([0, 0, 0.1], [0.06, 0.018, 0.13], 0, { k: 0.03 }), E([0, 0.012, 0.1], [0.035, 0.01, 0.09], 2)]; });
  def("deco", "Rundohr", "Round ear", function () { return [E([0, 0, 0.07], [0.085, 0.02, 0.08], 0, { k: 0.03 }), E([0, 0.014, 0.07], [0.05, 0.01, 0.05], 2)]; });
  def("deco", "Flamme", "Flame", function () { return [E([0, 0, 0.1], [0.065, 0.065, 0.11], 3), E([0.02, 0, 0.17], [0.035, 0.035, 0.08], 3), E([0, 0.012, 0.09], [0.035, 0.03, 0.06], 2)]; });
  // Füße (lokal: y = oben, z = vorne des Monsters, Ursprung = Ende des Beins)
  def("feet", "Pfote", "Paw", function () { return [E([0, -0.03, 0.03], [0.08, 0.05, 0.1], 0, { k: 0.04 })]; });
  def("feet", "Zehenpfote", "Toed paw", function () { return [E([0, -0.03, 0.02], [0.08, 0.045, 0.09], 0, { k: 0.04 })].concat([-0.045, 0, 0.045].map(function (x) { return E([x, -0.045, 0.1], [0.03, 0.028, 0.032], 0, { k: 0.01 }); })); });
  def("feet", "Krallenpfote", "Clawed paw", function () { return [E([0, -0.03, 0.02], [0.08, 0.045, 0.09], 0, { k: 0.04 })].concat([-0.045, 0, 0.045].map(function (x) { return C([x, -0.05, 0.1], [x * 1.2, -0.07, 0.16], 0.02, 0.003, 3); })); });
  def("feet", "Huf", "Hoof", function () { return [C([0, 0.02, 0], [0, -0.05, 0.01], 0.06, 0.07, 0, { k: 0.03 }), E([0, -0.075, 0.01], [0.075, 0.025, 0.075], 3)]; });
  def("feet", "Spalthuf", "Cloven hoof", function () { return [C([0, 0.02, 0], [0, -0.04, 0.01], 0.055, 0.06, 0, { k: 0.03 }), E([-0.03, -0.065, 0.025], [0.035, 0.03, 0.06], 3), E([0.03, -0.065, 0.025], [0.035, 0.03, 0.06], 3)]; });
  def("feet", "Vogelfuß", "Bird foot", function () { return toes(3, 1.1, 0.13, 0.016, 3, false, -0.05).concat([C([0, -0.05, 0], [0, -0.055, -0.08], 0.015, 0.012, 3)]); });
  def("feet", "Greifkralle", "Talons", function () { return toes(3, 1.0, 0.12, 0.02, 3, true, -0.05).concat([C([0, -0.05, 0], [0, -0.06, -0.08], 0.018, 0.01, 3), C([0, -0.06, -0.08], [0, -0.09, -0.06], 0.012, 0.003, 3)]); });
  def("feet", "Schwimmfuß", "Webbed foot", function () { return [E([0, -0.06, 0.08], [0.09, 0.012, 0.1], 1)].concat(toes(3, 1.0, 0.13, 0.014, 3, false, -0.055)); });
  def("feet", "Elefantenfuß", "Elephant foot", function () { return [C([0, 0.01, 0], [0, -0.06, 0.005], 0.08, 0.09, 0, { k: 0.03 })].concat([-0.05, 0, 0.05].map(function (x) { return E([x, -0.07, 0.08], [0.022, 0.018, 0.012], 5); })); });
  def("feet", "Echsenfuß", "Lizard foot", function () { return [E([0, -0.04, 0.02], [0.05, 0.03, 0.06], 0, { k: 0.03 })].concat(toes(5, 2.2, 0.1, 0.012, 0, true, -0.05)); });
  def("feet", "Froschfuß", "Frog foot", function () { var o = toes(4, 1.6, 0.14, 0.011, 0, false, -0.055); [-1.6, -0.53, 0.53, 1.6].forEach(function (a) { var d = [Math.sin(a / 2), 0, Math.cos(a / 2)]; o.push(E(add([0, -0.055, 0.03], mul(d, 0.16)), [0.02, 0.016, 0.02], 0)); }); return o; });
  def("feet", "Stampfer", "Stomper", function () { return [E([0, -0.05, 0.02], [0.12, 0.05, 0.13], 0, { k: 0.04 })]; });
  def("feet", "Spinnenspitze", "Spider tip", function () { return [C([0, 0, 0], [0, -0.1, 0.02], 0.03, 0.004, 3)]; });
  def("feet", "Saugnapf", "Sucker", function () { return [E([0, -0.05, 0], [0.07, 0.02, 0.07], 2, { k: 0.03 }), E([0, -0.066, 0], [0.04, 0.008, 0.04], 7)]; });
  def("feet", "Bärentatze", "Bear paw", function () { return [E([0, -0.035, 0.02], [0.1, 0.05, 0.1], 0, { k: 0.04 })].concat([-0.06, -0.02, 0.02, 0.06].map(function (x) { return E([x, -0.05, 0.11], [0.025, 0.025, 0.025], 0, { k: 0.01 }); })).concat([-0.06, -0.02, 0.02, 0.06].map(function (x) { return C([x, -0.055, 0.13], [x, -0.07, 0.17], 0.014, 0.003, 3); })); });
  def("feet", "Krebsspitze", "Crab tip", function () { return chain([[0, 0, 0], [0, -0.06, 0.04], [0, -0.11, 0.02]], [0.04, 0.03, 0.004], 3, 0.01); });
  def("feet", "Klumpfuß", "Club foot", function () { return [E([0, -0.03, 0], [0.09, 0.07, 0.09], 0, { k: 0.04 })]; });
  def("feet", "Dinofuß", "Dino foot", function () { return [E([0, -0.035, 0.0], [0.07, 0.04, 0.07], 0, { k: 0.04 })].concat(toes(3, 0.9, 0.11, 0.028, 0, true, -0.05)); });
  def("feet", "Ballenpfote", "Bean paw", function () { return [E([0, -0.03, 0.02], [0.08, 0.045, 0.09], 0, { k: 0.04 })].concat([-0.045, 0, 0.045].map(function (x) { return E([x, -0.045, 0.1], [0.03, 0.028, 0.032], 0, { k: 0.01 }); })).concat([-0.045, 0, 0.045].map(function (x) { return E([x, -0.05, 0.128], [0.014, 0.012, 0.008], 7); })); });
  def("feet", "Flossenfuß", "Flipper", function () { return [E([0, -0.05, 0.1], [0.1, 0.015, 0.14], 1, { k: 0.02 })]; });
  // Hände (lokal: z = entlang des Arms nach außen, y = oben, Ursprung = Ende des Arms)
  def("hands", "Faust", "Fist", function () { return [E([0, 0, 0.04], [0.06, 0.05, 0.06], 0, { k: 0.03 })]; });
  def("hands", "Dreifinger", "Three fingers", function () { return [E([0, 0, 0.03], [0.05, 0.03, 0.05], 0, { k: 0.03 })].concat(fingers(3, 1.0, 0.07, 0.016, 0)); });
  def("hands", "Vierfinger", "Four fingers", function () { return [E([0, 0, 0.03], [0.055, 0.03, 0.05], 0, { k: 0.03 })].concat(fingers(4, 1.2, 0.07, 0.014, 0)); });
  def("hands", "Fünffinger", "Five fingers", function () { return [E([0, 0, 0.03], [0.055, 0.03, 0.05], 0, { k: 0.03 })].concat(fingers(4, 0.9, 0.075, 0.013, 0), [C([0.05, 0, 0.02], [0.09, 0.02, 0.06], 0.014, 0.012, 0, { k: 0.015 })]); });
  def("hands", "Krallenhand", "Claw hand", function () { return [E([0, 0, 0.03], [0.05, 0.03, 0.05], 0, { k: 0.03 })].concat(fingers(3, 1.0, 0.06, 0.016, 0, true)); });
  def("hands", "Zange", "Pincer", function () { return [E([0, 0, 0.05], [0.06, 0.05, 0.07], 3, { k: 0.03 }), E([0, 0.03, 0.15], [0.035, 0.025, 0.09], 3, { rot: [0.25, 0, 0] }), E([0, -0.035, 0.13], [0.03, 0.02, 0.07], 3, { rot: [-0.25, 0, 0] })]; });
  def("hands", "Sichel", "Scythe", function () { return chain([[0, 0, 0], [0, 0.05, 0.1], [0, 0.02, 0.2], [0, -0.06, 0.24]], [0.035, 0.028, 0.016, 0.003], 3, 0.01); });
  def("hands", "Fäustling", "Mitten", function () { return [E([0, 0, 0.05], [0.055, 0.035, 0.075], 0, { k: 0.03 }), C([0.05, 0, 0.02], [0.08, 0.02, 0.07], 0.022, 0.018, 0, { k: 0.02 })]; });
  def("hands", "Tentakelende", "Tentacle tip", function () { return chain([[0, 0, 0], [0, 0.03, 0.08], [0, 0.1, 0.12], [0, 0.14, 0.08]], [0.035, 0.025, 0.016, 0.006], 0, 0.02); });
  def("hands", "Saugnapfhand", "Sucker hand", function () { return [E([0, 0, 0.04], [0.05, 0.04, 0.05], 0, { k: 0.03 }), E([0, 0, 0.085], [0.06, 0.06, 0.015], 2)]; });
  def("hands", "Hammerfaust", "Hammer fist", function () { return [E([0, 0, 0.07], [0.09, 0.08, 0.09], 3, { k: 0.03 })]; });
  def("hands", "Paddel", "Paddle", function () { return [E([0, 0, 0.1], [0.08, 0.015, 0.13], 1, { k: 0.02 })]; });
  def("hands", "Blatthand", "Leaf hand", function () { return [E([0, 0, 0.13], [0.06, 0.012, 0.15], 1, { k: 0.02 })]; });
  def("hands", "Dornenhand", "Thorn hand", function () { return [E([0, 0, 0.03], [0.055, 0.045, 0.055], 0, { k: 0.03 })].concat([[1, 0], [-1, 0], [0, 1], [0, -1]].map(function (q) { return C([q[0] * 0.04, q[1] * 0.035, 0.04], [q[0] * 0.09, q[1] * 0.08, 0.1], 0.02, 0.003, 3); })); });
  def("hands", "Knochenklaue", "Bone claw", function () { return [E([0, 0, 0.02], [0.04, 0.025, 0.04], 0, { k: 0.03 })].concat(fingers(3, 0.9, 0.13, 0.01, 5).map(function (p) { p.slot = 5; return p; })); });
  def("hands", "Geisterhand", "Ghost hand", function () { return [-0.5, 0, 0.5].map(function (a) { return C([0, 0, 0], [Math.sin(a) * 0.12, 0.02, Math.cos(a) * 0.14], 0.04, 0.005, 0, { k: 0.03 }); }); });
  def("hands", "Pfotenhand", "Paw hand", function () { return [E([0, 0, 0.04], [0.06, 0.04, 0.055], 0, { k: 0.03 })].concat([-0.04, -0.013, 0.013, 0.04].map(function (x) { return E([x, 0, 0.095], [0.02, 0.02, 0.02], 0, { k: 0.01 }); })); });
  def("hands", "Doppelklinge", "Twin blades", function () { return [-0.03, 0.03].map(function (x) { return C([x, 0, 0], [x * 2, 0.02, 0.22], 0.025, 0.003, 3); }); });
  def("hands", "Morgenstern", "Mace", function () { var o = [E([0, 0, 0.07], [0.07, 0.07, 0.07], 3)]; [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0.6, 0.6, 0.5]].forEach(function (d) { d = norm(d); o.push(C(add([0, 0, 0.07], mul(d, 0.05)), add([0, 0, 0.07], mul(d, 0.12)), 0.022, 0.003, 3)); }); return o; });
  def("hands", "Stummelhand", "Stub hand", function () { return [E([0.02, 0, 0.04], [0.025, 0.025, 0.03], 0, { k: 0.02 }), E([-0.025, 0, 0.035], [0.022, 0.022, 0.026], 0, { k: 0.02 })]; });
  var CATS = [["eyes", "Augen", "Eyes"], ["mouth", "Mund", "Mouth"], ["deco", "Zacken/Flügel", "Spikes/wings"], ["feet", "Füße", "Feet"], ["hands", "Hände", "Hands"]];
  function asset(id) { var cat = String(id).replace(/\d+$/, ""), i = +String(id).replace(/^\D+/, ""); return A[cat] && A[cat][i] || null; }

  // ---------- Modell absichern ----------
  function v3(a, d) { return Array.isArray(a) && a.length === 3 ? [clamp(a[0], -4, 4, d[0]), clamp(a[1], -4, 4, d[1]), clamp(a[2], -4, 4, d[2])] : d.slice(); }
  function anc(a) { if (!a || typeof a !== "object" || "shle".indexOf(a.k) < 0 || a.k.length !== 1) return null; return { k: a.k, i: Math.round(clamp(a.i, 0, 99, 0)), j: Math.round(clamp(a.j, 0, 99, 0)) }; }
  function sanitize(M) {
    if (!M || typeof M !== "object" || !Array.isArray(M.spine) || !M.spine.length) return null;
    function node(n) { return { p: v3(n && n.p, [0, 0, 0]), r: clamp(n && n.r, 0.02, 1, 0.2), w: clamp(n && n.w, 0.35, 2.5, 1) }; }
    var o = { v: 1, sym: M.sym !== false, mat: Math.round(clamp(M.mat, 0, 3, 0)), slot: Math.round(clamp(M.slot, 0, 4, 0)),
      spine: M.spine.slice(0, 16).map(node), head: (Array.isArray(M.head) ? M.head : []).slice(0, 8).map(node), limbs: [], stamps: [], paint: [] };
    (Array.isArray(M.limbs) ? M.limbs : []).slice(0, 12).forEach(function (L) {
      if (!L || !Array.isArray(L.j) || L.j.length < 2) return;
      o.limbs.push({ pre: typeof L.pre === "string" ? L.pre : "leg3", sym: !!L.sym, slot: Math.round(clamp(L.slot, 0, 4, 0)), anc: anc(L.anc),
        j: L.j.slice(0, 8).map(function (q) { var o2 = { p: v3(q && q.p, [0, 0, 0]), r: clamp(q && q.r, 0.008, 0.6, 0.06) }, sf = clamp(q && q.s, 0.3, 3, 1); if (Math.abs(sf - 1) > 0.01) o2.s = sf; return o2; }) });
    });
    (Array.isArray(M.stamps) ? M.stamps : []).slice(0, 60).forEach(function (s) {
      if (!s || !asset(s.a)) return;
      o.stamps.push({ a: s.a, p: v3(s.p, [0, 0, 0]), n: norm(v3(s.n, [0, 0, 1])), rot: clamp(s.rot, -7, 7, 0), tilt: clamp(s.tilt, -1.6, 1.6, 0), s: clamp(s.s, 0.2, 5, 1), sym: !!s.sym, mir: !!s.mir, anc: anc(s.anc) });
    });
    (Array.isArray(M.paint) ? M.paint : []).slice(0, 600).forEach(function (d) {
      if (!d) return; o.paint.push({ p: v3(d.p, [0, 0, 0]), r: clamp(d.r, 0.01, 1, 0.08), k: d.k ? 1 : 0, v: Math.round(clamp(d.v, 0, 4, 0)), sym: !!d.sym, anc: anc(d.anc) });
    });
    return o;
  }

  // ---------- Modell → Grundkörper (Primitive) ----------
  function stampFrame(M, s) {
    var a = asset(s.a), cat = a ? a.cat : "eyes", X, Y, Z, o;
    if (s.anc && s.anc.k === "e" && M.limbs[s.anc.i]) {
      var j = M.limbs[s.anc.i].j, e = j[j.length - 1].p, pr = j[j.length - 2].p; o = e;
      if (cat === "feet") { Y = [0, 1, 0]; Z = [Math.sin(s.rot), 0, Math.cos(s.rot)]; X = cross(Y, Z); }
      else {
        Z = norm(sub(e, pr)); Y = sub([0, 1, 0], mul(Z, Z[1])); if (len(Y) < 0.2) Y = [0, 0, 1]; Y = norm(Y); X = cross(Y, Z);
        var c0 = Math.cos(s.rot), s0 = Math.sin(s.rot), X2 = add(mul(X, c0), mul(Y, s0)); Y = add(mul(X, -s0), mul(Y, c0)); X = X2;
      }
    } else {
      o = s.p; Z = norm(s.n); Y = sub([0, 1, 0], mul(Z, Z[1])); if (len(Y) < 0.25) Y = sub([0, 0, 1], mul(Z, Z[2])); Y = norm(Y); X = cross(Y, Z);
      var c1 = Math.cos(s.rot), s1 = Math.sin(s.rot), X3 = add(mul(X, c1), mul(Y, s1)); Y = add(mul(X, -s1), mul(Y, c1)); X = X3;
    }
    if (s.tilt) { var ct = Math.cos(s.tilt), st = Math.sin(s.tilt), Y2 = add(mul(Y, ct), mul(Z, st)); Z = add(mul(Y, -st), mul(Z, ct)); Y = Y2; }
    return { o: o, X: X, Y: Y, Z: Z };
  }
  function mirrorPrim(P) {
    var q = JSON.parse(JSON.stringify(P));
    if (q.t === 0) { q.c = mir(q.c); q.q = [q.q[0], -q.q[1], -q.q[2], q.q[3]]; } else { q.a = mir(q.a); q.b = mir(q.b); }
    q.src = Object.assign({}, P.src, { m: 1 }); return q;
  }
  function build(M, opt) {
    opt = opt || {}; var P = [], BK = 0.1, bs = M.slot || 0;
    function rc(a, b, r1, r2, w, slot, k, f, src) { P.push({ t: 1, a: a, b: b, r1: r1, r2: r2, w: w || 1, slot: slot, k: k, f: f, src: src }); }
    var sp = M.spine, hd = M.head;
    if (sp.length === 1) rc(sp[0].p, sp[0].p, sp[0].r, sp[0].r, sp[0].w, bs, BK, 1, { k: "s", i: 0 });
    for (var i = 0; i < sp.length - 1; i++) rc(sp[i].p, sp[i + 1].p, sp[i].r, sp[i + 1].r, (sp[i].w + sp[i + 1].w) / 2, bs, BK, 1, { k: "s", i: i + (i === 0 ? 0 : 1) * 0 });
    if (hd.length) {
      rc(sp[0].p, hd[0].p, sp[0].r * 0.72, hd[0].r * 0.8, (sp[0].w + hd[0].w) / 2, bs, 0.12, 1, { k: "h", i: 0 });
      rc(hd[0].p, hd[0].p, hd[0].r, hd[0].r, hd[0].w, bs, BK, 1, { k: "h", i: 0 });
      for (var h = 0; h < hd.length - 1; h++) rc(hd[h].p, hd[h + 1].p, hd[h].r, hd[h + 1].r, (hd[h].w + hd[h + 1].w) / 2, bs, BK, 1, { k: "h", i: h + 1 });
    }
    var nBody = P.length;
    M.limbs.forEach(function (L, li) {
      var j = L.j, s0 = P.length, sl = L.slot || bs;
      for (var q = 0; q < j.length - 1; q++) {
        var r1 = j[q].r, r2 = j[q].r * 0.65 + j[q + 1].r * 0.35, sf = j[q].s || 1, kq = q === 0 ? 0.08 : 0.05;
        if (Math.abs(sf - 1) < 0.01) rc(j[q].p, j[q + 1].p, r1, r2, 1, sl, kq, 1, { k: "l", i: li, j: q });
        else {   // Abschnitt dicker/dünner: Mitte wird zum Bauch bzw. zur Taille (seit v0.26.2)
          var mid = mul(add(j[q].p, j[q + 1].p), 0.5), rm = Math.max(0.006, (r1 + r2) / 2 * sf);
          rc(j[q].p, mid, r1, rm, 1, sl, kq, 1, { k: "l", i: li, j: q, g: 1 }); rc(mid, j[q + 1].p, rm, r2, 1, sl, 0.03, 1, { k: "l", i: li, j: q, g: 1 });
        }
      }
      rc(j[j.length - 1].p, j[j.length - 1].p, j[j.length - 1].r, j[j.length - 1].r, 1, sl, 0.04, 1, { k: "l", i: li, j: j.length - 1 });
      if (L.sym) for (var m = s0, e = P.length; m < e; m++) P.push(mirrorPrim(P[m]));
    });
    if (!opt.noStamps) M.stamps.forEach(function (s, si) {
      if (opt.exclude === si) return;
      var a = asset(s.a); if (!a) return;
      var F = stampFrame(M, s), Q = qbasis(F.X, F.Y, F.Z), s0 = P.length, sc = s.s;
      function W(l) { return add(F.o, add(add(mul(F.X, l[0] * sc), mul(F.Y, l[1] * sc)), mul(F.Z, l[2] * sc))); }
      a.p.forEach(function (lp) {
        var q = { t: lp.t, slot: lp.slot, k: lp.k * sc, f: lp.f, src: { k: "st", i: si } };
        if (lp.t === 0) { q.c = W(lp.c); q.r = mul(lp.r, sc); q.q = qmul(Q, lp.q); q.eye = lp.eye; q.lt = lp.lt; }
        else { q.a = W(lp.a); q.b = W(lp.b); q.r1 = lp.r1 * sc; q.r2 = lp.r2 * sc; q.w = 1; }
        P.push(q);
      });
      if (s.mir) for (var mm = s0, me = P.length; mm < me; mm++) { P[mm] = mirrorPrim(P[mm]); P[mm].src.m = 0; }   // eigenständige Spiegel-Kopie (seit v0.26.5): Werte liegen gespiegelt vor
      var lsym = s.anc && s.anc.k === "e" && M.limbs[s.anc.i] && M.limbs[s.anc.i].sym;
      if (s.sym || lsym) for (var m = s0, e = P.length; m < e; m++) P.push(mirrorPrim(P[m]));
    });
    P.forEach(function (q) {   // Hüllkugeln
      if (q.t === 0) { q.bc = q.c; q.br = Math.max(q.r[0], q.r[1], q.r[2]); }
      else { q.bc = mul(add(q.a, q.b), 0.5); q.br = len(sub(q.b, q.a)) / 2 + Math.max(q.r1, q.r2) * Math.max(1, q.w); }
    });
    var lo = [9, 9, 9], hi = [-9, -9, -9];
    P.forEach(function (q) { for (var k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], q.bc[k] - q.br); hi[k] = Math.max(hi[k], q.bc[k] + q.br); } });
    var c = mul(add(lo, hi), 0.5), R = 0.1; P.forEach(function (q) { R = Math.max(R, len(sub(q.bc, c)) + q.br); });
    // Pinselpunkte
    var D = [];
    M.paint.forEach(function (d) { D.push(d); if (d.sym && Math.abs(d.p[0]) > d.r * 0.2) D.push({ p: mir(d.p), r: d.r, k: d.k, v: d.v }); });
    return { P: P, D: D, bs: [c[0], c[1], c[2], R * 1.05], mat: M.mat, nBody: nBody };
  }
  function pack(B) {
    var N = B.P.length, f = new Float32Array(Math.max(1, N) * 24);
    B.P.forEach(function (q, i) {
      var o = i * 24;
      f.set([q.t, q.slot, q.k, q.f], o);
      if (q.t === 0) { f.set([q.c[0], q.c[1], q.c[2], 0, q.r[0], q.r[1], q.r[2], q.lt || 0, q.q[0], q.q[1], q.q[2], q.q[3]], o + 4); }
      else f.set([q.a[0], q.a[1], q.a[2], q.r1, q.b[0], q.b[1], q.b[2], q.r2, q.w, 0, 0, 0], o + 4);
      if (q.eye) f.set(q.eye, o + 16);
      f.set([q.bc[0], q.bc[1], q.bc[2], q.br], o + 20);
    });
    var M = B.D.length, d = new Float32Array(Math.max(1, M) * 8);
    B.D.forEach(function (q, i) { d.set([q.p[0], q.p[1], q.p[2], q.r, q.k, q.v, 0, 0], i * 8); });
    return { f: f, N: N, d: d, M: M, bs: B.bs, mat: B.mat };
  }

  // ---------- Abstandsfeld in JS (zum Anklicken der Oberfläche) ----------
  function sdE(p, c, r, q) { var l = qinv(q, sub(p, c)), k0 = Math.hypot(l[0] / r[0], l[1] / r[1], l[2] / r[2]), k1 = Math.hypot(l[0] / (r[0] * r[0]), l[1] / (r[1] * r[1]), l[2] / (r[2] * r[2])); return k0 * (k0 - 1) / Math.max(k1, 1e-6); }
  function sdRC(p, a, b, r1, r2) {
    var ba = sub(b, a), l2 = dot(ba, ba); if (l2 < 1e-8) return len(sub(p, a)) - Math.max(r1, r2);
    var rr = r1 - r2, a2 = l2 - rr * rr, il2 = 1 / l2, pa = sub(p, a), y = dot(pa, ba), z = y - l2, xx = sub(mul(pa, l2), mul(ba, y)), x2 = dot(xx, xx), y2 = y * y * l2, z2 = z * z * l2, k = Math.sign(rr) * rr * rr * x2;
    if (Math.sign(z) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
    if (Math.sign(y) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
    return (Math.sqrt(x2 * a2 * il2) + y * rr) * il2 - r1;
  }
  function primD(q, p) {
    if (q.t === 0) return sdE(p, q.c, q.r, q.q);
    var w = q.w || 1, pp = p; if (w !== 1) { var cx = (q.a[0] + q.b[0]) / 2; pp = [cx + (p[0] - cx) / w, p[1], p[2]]; }
    return sdRC(pp, q.a, q.b, q.r1, q.r2) * Math.min(w, 1);
  }
  function sdf(P, p) {
    var d = 1e5, id = -1;
    for (var i = 0; i < P.length; i++) {
      var q = P[i], k = q.k; if (len(sub(p, q.bc)) - q.br > d + k) continue;
      var di = primD(q, p);
      if (k > 0) { var h = Math.max(k - Math.abs(d - di), 0) / k; if (di < d) id = i; d = Math.min(d, di) - h * h * k * 0.25; }
      else if (di < d) { d = di; id = i; }
    }
    return [d, id];
  }
  function pick(P, o, dir, bs) {
    var oc = sub(o, bs), b = dot(oc, dir), c = dot(oc, oc) - bs[3] * bs[3], h = b * b - c; if (h < 0) return null;
    h = Math.sqrt(h); var t = Math.max(0, -b - h), tm = -b + h;
    for (var s = 0; s < 160; s++) {
      var p = add(o, mul(dir, t)), r = sdf(P, p);
      if (r[0] < 0.002) {
        var e = 0.003, n = norm([sdf(P, add(p, [e, 0, 0]))[0] - sdf(P, sub(p, [e, 0, 0]))[0], sdf(P, add(p, [0, e, 0]))[0] - sdf(P, sub(p, [0, e, 0]))[0], sdf(P, add(p, [0, 0, e]))[0] - sdf(P, sub(p, [0, 0, e]))[0]]);
        return { p: p, n: n, prim: r[1] >= 0 ? P[r[1]] : null, t: t };
      }
      t += Math.max(r[0] * 0.9, 0.0008); if (t > tm) break;
    }
    return null;
  }

  // ---------- Kamera (orthografisch) ----------
  function basis(cam) {
    var cp = Math.cos(cam.pitch), v = [Math.sin(cam.yaw) * cp, Math.sin(cam.pitch), Math.cos(cam.yaw) * cp], F = mul(v, -1), R = norm(cross(F, [0, 1, 0])), U = cross(R, F);
    var L = norm(add(add(mul(R, -0.55), mul(U, 0.78)), mul(F, -0.42)));
    return { F: F, R: R, U: U, L: L };
  }
  function project(cam, W, H, p, B) { B = B || basis(cam); var d = sub(p, cam.t); return [W / 2 + dot(d, B.R) * cam.zoom, H / 2 - dot(d, B.U) * cam.zoom, dot(d, B.F)]; }
  function ray(cam, W, H, x, y, B) { B = B || basis(cam); var u = (x - W / 2) / cam.zoom, v = (H / 2 - y) / cam.zoom; return { o: add(add(add(cam.t, mul(B.R, u)), mul(B.U, v)), mul(B.F, -50)), d: B.F }; }

  // ---------- WebGL2-Renderer ----------
  var VS = "#version 300 es\nvoid main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));gl_Position=vec4(p*2.0-1.0,0.0,1.0);}";
  var FS = [
    "#version 300 es", "precision highp float;precision highp int;precision highp sampler2D;",
    "uniform sampler2D uP;uniform int uN;uniform sampler2D uD;uniform int uM;uniform int uMat;uniform int uSimple;",
    "uniform vec3 uT,uR,uU,uF,uL;uniform float uS;uniform vec2 uRes;uniform vec4 uBS;out vec4 oc;",
    "vec4 tp(int i,int k){return texelFetch(uP,ivec2(k,i),0);}",
    "vec3 qrot(vec4 q,vec3 v){return v+2.0*cross(q.xyz,cross(q.xyz,v)+q.w*v);}",
    "vec3 qinv(vec4 q,vec3 v){return qrot(vec4(-q.xyz,q.w),v);}",
    "float sdE(vec3 p,vec3 r){float k0=length(p/r),k1=length(p/(r*r));return k0*(k0-1.0)/max(k1,1e-6);}",
    "float sdRC(vec3 p,vec3 a,vec3 b,float r1,float r2){vec3 ba=b-a;float l2=dot(ba,ba);if(l2<1e-8)return length(p-a)-max(r1,r2);",
    " float rr=r1-r2,a2=l2-rr*rr,il2=1.0/l2;vec3 pa=p-a;float y=dot(pa,ba),z=y-l2;vec3 xx=pa*l2-ba*y;float x2=dot(xx,xx),y2=y*y*l2,z2=z*z*l2,k=sign(rr)*rr*rr*x2;",
    " if(sign(z)*a2*z2>k)return sqrt(x2+z2)*il2-r2;if(sign(y)*a2*y2<k)return sqrt(x2+y2)*il2-r1;return (sqrt(x2*a2*il2)+y*rr)*il2-r1;}",
    "float prim(int i,vec3 p,float t){vec4 t1=tp(i,1),t2=tp(i,2),t3=tp(i,3);if(t<0.5)return sdE(qinv(t3,p-t1.xyz),t2.xyz);",
    " float w=t3.x;vec3 q=p;float cx=(t1.x+t2.x)*0.5;q.x=cx+(p.x-cx)/w;return sdRC(q,t1.xyz,t2.xyz,t1.w,t2.w)*min(w,1.0);}",
    "float map(vec3 p,out int id){float d=1e5;id=-1;for(int i=0;i<1024;i++){if(i>=uN)break;vec4 b=tp(i,5);vec4 t0=tp(i,0);float k=t0.z;",
    " if(length(p-b.xyz)-b.w>d+k)continue;float di=prim(i,p,t0.x);",
    " if(k>0.0){float h=max(k-abs(d-di),0.0)/k;if(di<d)id=i;d=min(d,di)-h*h*k*0.25;}else if(di<d){d=di;id=i;}}return d;}",
    "float mapd(vec3 p){int i;return map(p,i);}",
    "float h31(vec3 p){p=fract(p*0.3183099+0.1);p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}",
    "vec3 h33(vec3 p){return vec3(h31(p),h31(p+19.19),h31(p+47.47));}",
    "float vn(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(mix(h31(i),h31(i+vec3(1,0,0)),f.x),mix(h31(i+vec3(0,1,0)),h31(i+vec3(1,1,0)),f.x),f.y),mix(mix(h31(i+vec3(0,0,1)),h31(i+vec3(1,0,1)),f.x),mix(h31(i+vec3(0,1,1)),h31(i+vec3(1,1,1)),f.x),f.y),f.z);}",
    "void main(){vec2 fc=gl_FragCoord.xy;float u=(fc.x-uRes.x*0.5)/uS,v=(fc.y-uRes.y*0.5)/uS;",
    " vec3 ro=uT+uR*u+uU*v-uF*50.0,rd=uF;vec3 o0=ro-uBS.xyz;float b=dot(o0,rd),c=dot(o0,o0)-uBS.w*uBS.w,h=b*b-c;",
    " if(h<0.0){oc=vec4(0.0);return;}h=sqrt(h);float t=max(-b-h,0.0),tm=-b+h;int id=-1;bool hit=false;",
    " for(int s=0;s<160;s++){vec3 p=ro+rd*t;int ii;float d=map(p,ii);if(d<0.0015){hit=true;id=ii;break;}t+=max(d*0.9,0.0008);if(t>tm)break;}",
    " if(!hit||id<0){oc=vec4(0.0);return;}",
    " vec3 p=ro+rd*t;vec2 e=vec2(1.0,-1.0)*0.0025;",
    " vec3 n=normalize(e.xyy*mapd(p+e.xyy)+e.yyx*mapd(p+e.yyx)+e.yxy*mapd(p+e.yxy)+e.xxx*mapd(p+e.xxx));",
    " vec4 t0=tp(id,0);int slot=int(t0.y+0.5);int fl=int(t0.w+0.5);int mat=0;bool hl=false;",
    " if((fl&1)!=0){mat=uMat;for(int j=0;j<2048;j++){if(j>=uM)break;vec4 a=texelFetch(uD,ivec2(0,j),0);if(length(p-a.xyz)<a.w){vec4 bb=texelFetch(uD,ivec2(1,j),0);if(bb.x<0.5)mat=int(bb.y+0.5);else slot=int(bb.y+0.5);}}}",
    " float tl=1.0;",
    " if(uSimple==1){",   // Spielbild: ruhige Flächen wie in der 3. Generation, nur Risse bzw. Federkanten
    "  if(mat==2){vec3 q=p*7.0;vec3 ip=floor(q);float d1=9.0,d2=9.0;for(int z=-1;z<=1;z++)for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec3 g=ip+vec3(float(x),float(y),float(z));float dd=length(q-g-h33(g));if(dd<d1){d2=d1;d1=dd;}else if(dd<d2)d2=dd;}if(d2-d1<0.07)tl=0.45;}",
    "  else if(mat==3){vec3 q=p*9.0;float row=floor(q.y*1.5);vec2 f2=fract(vec2(q.x+q.z+row*0.5,q.y*1.5));if(length(vec2(f2.x-0.5,f2.y)*vec2(1.0,1.3))>0.95)tl=0.5;}",
    " } else",
    " if(mat==2){vec3 q=p*9.0;vec3 ip=floor(q);float d1=9.0,d2=9.0;vec3 bc=vec3(0.0);",
    "  for(int z=-1;z<=1;z++)for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec3 g=ip+vec3(float(x),float(y),float(z));vec3 oo=g+h33(g);float dd=length(q-oo);if(dd<d1){d2=d1;d1=dd;bc=g;}else if(dd<d2)d2=dd;}",
    "  n=normalize(n+(h33(bc)-0.5)*0.55);tl=(d2-d1<0.1)?0.6:0.92+0.16*h31(bc);}",
    " else if(mat==1){vec3 q=p*vec3(16.0,9.0,16.0);n=normalize(n+vec3(vn(q)-0.5,vn(q+7.3)-0.5,vn(q+3.1)-0.5)*0.75);tl=0.84+0.26*step(0.5,vn(p*vec3(22.0,10.0,22.0)));}",
    " else if(mat==3){vec3 q=p*12.0;float row=floor(q.y*1.5);vec2 cc=vec2(q.x+q.z+row*0.5,q.y*1.5);vec2 f2=fract(cc);float rr=length(vec2(f2.x-0.5,f2.y)*vec2(1.0,1.3));tl=mix(1.12,0.66,clamp(rr,0.0,1.0));if(rr>0.92)tl=0.55;n=normalize(n+vec3(0.0,(0.5-f2.y)*0.5,0.0));}",
    " if((fl&2)!=0){vec4 t1=tp(id,1),t2=tp(id,2),t3=tp(id,3),t4=tp(id,4);vec3 l=qinv(t3,p-t1.xyz)/t2.xyz;vec2 uv=l.xy;float ir=t4.x,pu=t4.y;int sh=int(t4.z+0.5);float lid=t4.w;slot=5;",
    "  if((fl&4)!=0){vec3 cq=floor(l*7.0);slot=h31(cq)>0.45?4:6;}",
    "  else if(l.z>0.0){float di=length(uv),dp=di;if(sh==1)dp=length(vec2(uv.x*2.8,uv.y));else if(sh==2)dp=length(vec2(uv.x,uv.y*2.8));",
    "   else if(sh==3){float an=atan(uv.y,uv.x);dp=di/(0.6+0.4*abs(cos(an*2.5)));}",
    "   if(di<ir)slot=4;if(sh==5){if(di<pu&&di>pu*0.5)slot=6;}else if(sh==7){slot=di<ir?6:5;if(di<pu)slot=5;}else if(sh!=4&&dp<pu)slot=6;",
    "   if(length(uv-vec2(-0.3,0.34)*max(ir,0.45))<0.15*max(ir,0.5)){slot=5;hl=true;}}",
    "  if(lid<0.99){float lt=t2.w;float ly=uv.y*cos(lt)+uv.x*sin(lt);if(ly>lid){slot=0;hl=false;}}}",
    " vec3 L=uL;float dif=clamp((dot(n,L)+0.2)/1.2,0.0,1.0);",
    " float shd=1.0,st=0.03;for(int s=0;s<22;s++){float dd=mapd(p+n*0.012+L*st);shd=min(shd,9.0*dd/st);st+=clamp(dd,0.02,0.2);if(shd<0.05||st>3.0)break;}shd=clamp(shd,0.0,1.0);",
    " float ao=0.0,sc=1.0;for(int k=1;k<=3;k++){float hh=0.045*float(k);ao+=(hh-mapd(p+n*hh))*sc;sc*=0.6;}ao=clamp(1.0-ao*3.5,0.0,1.0);",
    " float lum=uSimple==1?(0.3+0.7*dif*mix(0.72,1.0,shd))*mix(0.88,1.0,ao)*tl:(0.24+0.76*dif*mix(0.58,1.0,shd))*mix(0.72,1.0,ao)*tl;",
    " if((mat==0&&uSimple==0)||(fl&2)!=0){float sp=pow(max(dot(reflect(-L,n),-rd),0.0),18.0);lum+=sp*((fl&2)!=0?0.6:0.2);}",
    " if(hl)lum=1.0;float dep=clamp(0.5+dot(p-uT,uF)/(4.0*uBS.w),0.0,1.0);",
    " oc=vec4(float(slot+8*mat)/255.0,clamp(lum,0.0,1.0),dep,1.0);}"
  ].join("\n");
  var GL = null;
  function glInit() {
    if (GL !== null) return GL;
    try {
      var c = document.createElement("canvas"), g = c.getContext("webgl2", { antialias: false, preserveDrawingBuffer: true, premultipliedAlpha: false });
      if (!g) return (GL = false);
      function sh(t, s) { var o = g.createShader(t); g.shaderSource(o, s); g.compileShader(o); if (!g.getShaderParameter(o, g.COMPILE_STATUS)) throw new Error(g.getShaderInfoLog(o)); return o; }
      var pr = g.createProgram(); g.attachShader(pr, sh(g.VERTEX_SHADER, VS)); g.attachShader(pr, sh(g.FRAGMENT_SHADER, FS)); g.linkProgram(pr);
      if (!g.getProgramParameter(pr, g.LINK_STATUS)) throw new Error(g.getProgramInfoLog(pr));
      var U = {}; ["uP", "uN", "uD", "uM", "uMat", "uSimple", "uT", "uR", "uU", "uF", "uL", "uS", "uRes", "uBS"].forEach(function (n) { U[n] = g.getUniformLocation(pr, n); });
      function tex() { var t = g.createTexture(); g.bindTexture(g.TEXTURE_2D, t); g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.NEAREST); g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.NEAREST); g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE); g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE); return t; }
      GL = { c: c, g: g, pr: pr, U: U, tP: tex(), tD: tex(), vao: g.createVertexArray(), last: null };
    } catch (e) { if (window.console) console.warn("monster3d WebGL:", e); GL = false; }
    return GL;
  }
  // Bild rendern → Uint8Array RGBA (Zeilen von oben nach unten). R = slot + 8·mat, G = Helligkeit, B = Tiefe, A = Treffer
  function draw(pk, cam, W, H, simple) {
    var G = glInit(); if (!G) return null;
    var g = G.g, B = basis(cam);
    if (G.c.width !== W || G.c.height !== H) { G.c.width = W; G.c.height = H; }
    g.viewport(0, 0, W, H); g.useProgram(G.pr);
    if (G.last !== pk) {
      g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_2D, G.tP); g.texImage2D(g.TEXTURE_2D, 0, g.RGBA32F, 6, Math.max(1, pk.N), 0, g.RGBA, g.FLOAT, pk.f);
      g.activeTexture(g.TEXTURE1); g.bindTexture(g.TEXTURE_2D, G.tD); g.texImage2D(g.TEXTURE_2D, 0, g.RGBA32F, 2, Math.max(1, pk.M), 0, g.RGBA, g.FLOAT, pk.d);
      G.last = pk;
    }
    g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_2D, G.tP); g.activeTexture(g.TEXTURE1); g.bindTexture(g.TEXTURE_2D, G.tD);
    var U = G.U; g.uniform1i(U.uP, 0); g.uniform1i(U.uD, 1); g.uniform1i(U.uN, pk.N); g.uniform1i(U.uM, pk.M); g.uniform1i(U.uMat, pk.mat); g.uniform1i(U.uSimple, simple ? 1 : 0);
    g.uniform3fv(U.uT, cam.t); g.uniform3fv(U.uR, B.R); g.uniform3fv(U.uU, B.U); g.uniform3fv(U.uF, B.F); g.uniform3fv(U.uL, B.L);
    g.uniform1f(U.uS, cam.zoom); g.uniform2f(U.uRes, W, H); g.uniform4fv(U.uBS, pk.bs);
    g.bindVertexArray(G.vao); g.clearColor(0, 0, 0, 0); g.clear(g.COLOR_BUFFER_BIT); g.drawArrays(g.TRIANGLES, 0, 3);
    var raw = new Uint8Array(W * H * 4), out = new Uint8Array(W * H * 4); g.readPixels(0, 0, W, H, g.RGBA, g.UNSIGNED_BYTE, raw);
    for (var y = 0; y < H; y++) out.set(raw.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4);
    return out;
  }

  // ---------- Pixel-Look ----------
  function hx(h) { var n = parseInt(String(h || "#888888").slice(1), 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function mixc(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function tones(c) { return [mixc(c, [255, 250, 230], 0.3), c, mixc(c, [40, 40, 72], 0.36), mixc(c, [24, 22, 46], 0.62)]; }
  function palTones(pal) {
    var p = pal || {};
    return [tones(hx(p.main || "#C8A060")), tones(hx(p.sec || "#F0E0B8")), tones(hx(p.acc || "#8A5A3A")), tones(hx(p.extra || "#E8C048")), tones(hx(p.eye || "#3A2A20")),
      [[255, 255, 255], [242, 242, 246], [196, 200, 212], [140, 142, 160]], [[70, 66, 84], [30, 26, 36], [22, 18, 28], [14, 10, 18]], tones([200, 70, 84])];
  }
  var BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  function post(raw, W, H, pal, o) {
    o = o || {}; var N = W * H, hit = new Uint8Array(N), slot = new Uint8Array(N), mat = new Uint8Array(N), lum = new Float32Array(N), dep = new Float32Array(N), i, k;
    for (k = 0; k < N; k++) { if (raw[k * 4 + 3] < 128) continue; hit[k] = 1; var code = raw[k * 4]; slot[k] = code & 7; mat[k] = code >> 3; lum[k] = raw[k * 4 + 1] / 255; dep[k] = raw[k * 4 + 2] / 255; }
    // Fell: Büschel an der Kante
    var add2 = [];
    for (k = 0; k < N; k++) {
      if (hit[k]) continue; var x = k % W, y = (k - x) / W, src = -1;
      [[0, 1], [1, 0], [-1, 0], [0, -1]].forEach(function (d) { var xx = x + d[0], yy = y + d[1]; if (xx < 0 || yy < 0 || xx >= W || yy >= H) return; var q = yy * W + xx; if (hit[q] && mat[q] === 1 && src < 0) src = q; });
      if (src >= 0 && MA.hash2(x, y, 41) < 0.36) add2.push([k, src]);
    }
    add2.forEach(function (a) { var q = a[1]; hit[a[0]] = 2; slot[a[0]] = slot[q]; mat[a[0]] = 1; lum[a[0]] = lum[q] * 0.8; dep[a[0]] = dep[q]; });
    var T = palTones(pal), img = new ImageData(W, H), b = img.data, thr = o.thr || 0.04, TN = new Int8Array(N);
    for (k = 0; k < N; k++) if (hit[k]) {
      var xa = k % W, ya = (k - xa) / W;
      if (o.simple) TN[k] = lum[k] > 0.8 ? 0 : lum[k] > 0.44 ? 1 : 2;   // Spielbild: Licht, Grundton, Schatten
      else { var La = lum[k] + (BAY[(ya & 3) * 4 + (xa & 3)] / 16 - 0.47) * 0.05; TN[k] = La > 0.8 ? 0 : La > 0.52 ? 1 : La > 0.28 ? 2 : 3; }
    }
    if (o.simple) for (var pass = 0; pass < 2; pass++) for (k = 0; k < N; k++) {   // einzelne Pixel an die Nachbarn angleichen
      if (!hit[k]) continue; var xs = k % W, ys = (k - xs) / W, cnt = [0, 0, 0, 0], same = 0, nb = 0;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { var xx = xs + d[0], yy = ys + d[1]; if (xx < 0 || yy < 0 || xx >= W || yy >= H) return; var q = yy * W + xx; if (!hit[q] || slot[q] !== slot[k]) return; nb++; cnt[TN[q]]++; if (TN[q] === TN[k]) same++; });
      if (nb >= 3 && same === 0) { var bt = 0; for (var t = 1; t < 4; t++) if (cnt[t] > cnt[bt]) bt = t; TN[k] = bt; }
    }
    for (k = 0; k < N; k++) {
      var x2 = k % W, y2 = (k - x2) / W, c = null;
      if (hit[k]) {
        var tn = TN[k];
        if (hit[k] === 1) for (i = 0; i < 4; i++) {
          var xx = x2 + [1, -1, 0, 0][i], yy = y2 + [0, 0, 1, -1][i]; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
          var q = yy * W + xx; if (hit[q] && dep[q] > dep[k] + thr) { tn = 3; break; }
        }
        c = T[slot[k]][tn];
      } else {
        for (i = 0; i < 4; i++) {
          var x3 = x2 + [1, -1, 0, 0][i], y3 = y2 + [0, 0, 1, -1][i]; if (x3 < 0 || y3 < 0 || x3 >= W || y3 >= H) continue;
          var q2 = y3 * W + x3; if (hit[q2]) { c = mixc(T[slot[q2]][3], [10, 8, 18], 0.55); break; }
        }
      }
      if (c) { b[k * 4] = c[0]; b[k * 4 + 1] = c[1]; b[k * 4 + 2] = c[2]; b[k * 4 + 3] = 255; }
    }
    return { img: img, hit: hit, dep: dep };
  }

  // ---------- Fotos (fertige Spielbilder) ----------
  function bbox(raw, W, H) { var x0 = W, y0 = H, x1 = -1, y1 = -1; for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) if (raw[(y * W + x) * 4 + 3] > 128) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } return x1 < 0 ? null : [x0, y0, x1, y1]; }
  // Spielbild px × px (+ 1 Pixel Rand für die Linie), Monster mittig mit gleichem Rand bei jeder Pixelzahl (seit v0.26.2).
  // zsMax: Maßstab (Zoom je Bildpixel) der Vorderansicht übernehmen, damit vorne und hinten gleich groß sind.
  var FILL = 0.88;
  function snapshot(M, pal, yaw, pitch, px, zsMax) {
    var B = build(M), pk = pack(B), W0 = 160, cam = { yaw: yaw, pitch: pitch, t: B.bs.slice(0, 3), zoom: W0 * 0.95 / (2 * B.bs[3]) };
    var r = draw(pk, cam, W0, W0, true); if (!r) return null;
    var bb = bbox(r, W0, W0), zs = FILL / (2 * B.bs[3]);
    if (bb) {
      var Bs = basis(cam), bw = (bb[2] - bb[0] + 1) / cam.zoom, bh = (bb[3] - bb[1] + 1) / cam.zoom, cx = (bb[0] + bb[2] + 1) / 2, cy = (bb[1] + bb[3] + 1) / 2;
      cam.t = add(add(cam.t, mul(Bs.R, (cx - W0 / 2) / cam.zoom)), mul(Bs.U, (W0 / 2 - cy) / cam.zoom));
      zs = FILL / Math.max(bw, bh);
    }
    if (zsMax) zs = Math.min(zs, zsMax);
    var W = px + 2; cam.zoom = zs * px; r = draw(pk, cam, W, W, true);
    var pp = post(r, W, W, pal, { thr: 3 / (cam.zoom * 4 * B.bs[3]), simple: true }), cv = MA.canvas(W, W); cv.ctx.putImageData(pp.img, 0, 0);
    return { cv: cv, zoom: zs };
  }
  // Vorschaubild eines Stempels / Grundkörpers
  var thumbs = {};
  function thumbPrims(prims, pal, key, yaw, pitch, S) {
    if (thumbs[key]) return thumbs[key];
    S = S || 40;
    var P = prims.map(function (q) { q = JSON.parse(JSON.stringify(q)); if (q.t === 0) { q.bc = q.c; q.br = Math.max(q.r[0], q.r[1], q.r[2]); } else { q.bc = mul(add(q.a, q.b), 0.5); q.br = len(sub(q.b, q.a)) / 2 + Math.max(q.r1, q.r2); } return q; });
    var lo = [9, 9, 9], hi = [-9, -9, -9]; P.forEach(function (q) { for (var k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], q.bc[k] - q.br); hi[k] = Math.max(hi[k], q.bc[k] + q.br); } });
    var c = mul(add(lo, hi), 0.5), R = 0.02; P.forEach(function (q) { R = Math.max(R, len(sub(q.bc, c)) + q.br); });
    var pk = pack({ P: P, D: [], bs: [c[0], c[1], c[2], R * 1.05], mat: 0 }), cam = { yaw: yaw, pitch: pitch, t: c, zoom: S * 0.95 / (2 * R) };
    var r = draw(pk, cam, S, S); if (!r) return "";
    var pp = post(r, S, S, pal, { thr: 0.06 }), cv = MA.canvas(S, S); cv.ctx.putImageData(pp.img, 0, 0);
    return (thumbs[key] = cv.toDataURL());
  }
  function assetThumb(id, pal) {
    var a = asset(id); if (!a) return "";
    var yaw = a.cat === "feet" ? 0.7 : a.cat === "hands" ? 1.2 : a.cat === "deco" ? 0.9 : 0.45, pitch = a.cat === "feet" ? 0.45 : 0.25;
    var P = a.p.slice(); if (a.cat === "eyes" || a.cat === "mouth") P = P.concat([E([0, 0, -0.12], [0.16, 0.16, 0.1], 0, { k: 0.02 })]);
    return thumbPrims(P, pal, "a" + id + JSON.stringify(pal), yaw, pitch);
  }
  function modelThumb(M, pal, key) { var B = build(M); return thumbPrims(B.P.map(function (q) { var o = Object.assign({}, q); delete o.src; return o; }), pal, "m" + key + JSON.stringify(pal), 0.55, 0.25, 48); }
  function limbThumb(pid) {
    if (thumbs["l" + pid]) return thumbs["l" + pid];
    var P = preset(pid), c = MA.canvas(40, 40), g = c.ctx, s = 44, ox = 6, oy = P.ground ? 6 : 20;
    if (P.j.some(function (q) { return q[1] < -0.4; })) oy = 4;
    var pts = P.j.map(function (q) { return [ox + q[0] * s, oy - q[1] * s * 0.95]; });
    g.lineCap = "round"; g.strokeStyle = "#C6C5B9";
    for (var i = 0; i < pts.length - 1; i++) { g.lineWidth = Math.max(2, P.r[i] * 60); g.beginPath(); g.moveTo(pts[i][0], pts[i][1]); g.lineTo(pts[i + 1][0], pts[i + 1][1]); g.stroke(); }
    g.fillStyle = "#ED6A5E"; pts.forEach(function (p) { g.fillRect(Math.round(p[0]) - 1, Math.round(p[1]) - 1, 3, 3); });
    return (thumbs["l" + pid] = c.toDataURL());
  }

  // ---------- Grundkörper ----------
  function N(p, r, w) { return { p: p, r: r, w: w || 1 }; }
  function st(a, p, n, o) { o = o || {}; return { a: a, p: p, n: norm(n), rot: o.rot || 0, tilt: o.tilt || 0, s: o.s || 1, sym: !!o.sym, anc: o.anc || null }; }
  function snapStamps(M) {   // Stempel genau auf die Oberfläche setzen (Grundkörper werden grob beschrieben)
    var B = build(M, { noStamps: 1 });
    M.stamps.forEach(function (s) {
      if (s.anc && s.anc.k === "e") return;
      var o = add(s.p, mul(s.n, 0.9)), h = pick(B.P, o, mul(s.n, -1), B.bs);
      if (h) { s.p = h.p; s.n = h.n; }
      if (!s.anc) s.anc = nearestAnchor(M, s.p);
    });
    return M;
  }
  function nearestAnchor(M, p) {
    var best = { k: "s", i: 0 }, bd = 1e9;
    M.spine.forEach(function (n, i) { var d = len(sub(n.p, p)) - n.r; if (d < bd) { bd = d; best = { k: "s", i: i }; } });
    M.head.forEach(function (n, i) { var d = len(sub(n.p, p)) - n.r; if (d < bd) { bd = d; best = { k: "h", i: i }; } });
    M.limbs.forEach(function (L, li) { L.j.forEach(function (q, j) { var pp = L.sym && p[0] * q.p[0] < 0 ? mir(p) : p, d = len(sub(q.p, pp)) - q.r; if (d < bd) { bd = d; best = { k: "l", i: li, j: j }; } }); });
    return best;
  }
  function eyes(M, hi, id, dx, dy, s) { var h = M.head[hi], p = add(h.p, [dx, dy, h.r]), n = [dx * 2.2, dy * 1.5 + 0.15, 1]; M.stamps.push(st(id, p, n, { sym: true, s: s || 1 })); }
  var STARTERS = [
    { n: ["Klecks", "Blob"], f: function () {
      var M = { v: 1, sym: true, mat: 0, slot: 0, spine: [N([0, -0.46, 0.1], 0.42, 1.12), N([0, -0.54, -0.16], 0.4, 1.1)], head: [N([0, -0.3, 0.3], 0.27, 1.12)], limbs: [], stamps: [], paint: [] };
      M.stamps.push(st("eyes0", [0.13, -0.16, 0.55], [0.4, 0.25, 1], { sym: true, s: 1.2 }), st("mouth0", [0, -0.36, 0.58], [0, -0.15, 1]));
      M.paint.push({ p: [0, -0.6, 0.4], r: 0.3, k: 1, v: 1, sym: false, anc: { k: "s", i: 0 } }); return M; } },
    { n: ["Vierbeiner", "Quadruped"], f: function () {
      var M = { v: 1, sym: true, mat: 1, slot: 0, spine: [N([0, -0.1, 0.38], 0.25), N([0, -0.06, 0.1], 0.28, 1.05), N([0, -0.08, -0.2], 0.27, 1.05), N([0, -0.12, -0.45], 0.21)], head: [N([0, 0.22, 0.66], 0.22), N([0, 0.13, 0.88], 0.13)], limbs: [], stamps: [], paint: [] };
      M.limbs.push(makeLimb("leg3", [0.16, -0.22, 0.34], [1, 0, 0], { sym: true, anc: { k: "s", i: 0 } }), makeLimb("hind", [0.16, -0.24, -0.38], [1, 0, 0], { sym: true, anc: { k: "s", i: 3 } }), makeLimb("tail", [0, -0.04, -0.6], [0, 0.35, -1], { anc: { k: "s", i: 3 }, rs: 0.9 }));
      M.stamps.push(st("eyes0", [0.12, 0.3, 0.82], [0.55, 0.35, 0.8], { sym: true }), st("deco17", [0.12, 0.4, 0.6], [0.45, 1, -0.1], { sym: true }), st("mouth0", [0, 0.08, 1.0], [0, -0.3, 1], { s: 0.8 }));
      M.stamps.push(st("feet1", [0, 0, 0], [0, 1, 0], { anc: { k: "e", i: 0 } }), st("feet1", [0, 0, 0], [0, 1, 0], { anc: { k: "e", i: 1 } }));
      M.paint.push({ p: [0, -0.32, 0.1], r: 0.24, k: 1, v: 1, sym: false, anc: { k: "s", i: 1 } }); return M; } },
    { n: ["Zweibeiner", "Biped"], f: function () {
      var M = { v: 1, sym: true, mat: 0, slot: 0, spine: [N([0, 0.28, 0.02], 0.22), N([0, -0.02, 0], 0.28, 1.08), N([0, -0.32, -0.02], 0.27, 1.1)], head: [N([0, 0.66, 0.06], 0.25, 1.05), N([0, 0.6, 0.26], 0.12)], limbs: [], stamps: [], paint: [] };
      M.limbs.push(makeLimb("leg2", [0.14, -0.42, 0], [1, 0, 0], { sym: true, anc: { k: "s", i: 2 }, rs: 1.1 }), makeLimb("arm3", [0.22, 0.24, 0.02], [1, 0, 0], { sym: true, anc: { k: "s", i: 0 } }));
      M.stamps.push(st("eyes0", [0.1, 0.74, 0.26], [0.45, 0.3, 1], { sym: true }), st("mouth0", [0, 0.56, 0.36], [0, -0.2, 1], { s: 0.8 }), st("feet0", [0, 0, 0], [0, 1, 0], { anc: { k: "e", i: 0 } }), st("hands1", [0, 0, 0], [0, 1, 0], { anc: { k: "e", i: 1 } }));
      M.paint.push({ p: [0, -0.1, 0.28], r: 0.24, k: 1, v: 1, sym: false, anc: { k: "s", i: 1 } }); return M; } },
    { n: ["Vogel", "Bird"], f: function () {
      var M = { v: 1, sym: true, mat: 3, slot: 0, spine: [N([0, 0.02, 0.16], 0.25), N([0, -0.08, -0.14], 0.24, 1.05), N([0, -0.02, -0.42], 0.11)], head: [N([0, 0.38, 0.3], 0.19)], limbs: [], stamps: [], paint: [] };
      M.limbs.push(makeLimb("leg3", [0.1, -0.24, 0.0], [1, 0, 0], { sym: true, anc: { k: "s", i: 1 }, rs: 0.45 }));
      M.stamps.push(st("eyes0", [0.1, 0.44, 0.44], [0.8, 0.2, 0.7], { sym: true, s: 0.9 }), st("mouth4", [0, 0.36, 0.48], [0, -0.1, 1]), st("deco9", [0.22, 0.04, -0.02], [1, 0.25, -0.15], { sym: true, s: 1.4, rot: 0.3 }), st("deco12", [0, 0.0, -0.5], [0, 0.4, -1], { s: 1.3 }), st("feet5", [0, 0, 0], [0, 1, 0], { anc: { k: "e", i: 0 } }));
      M.paint.push({ p: [0, -0.18, 0.28], r: 0.2, k: 1, v: 1, sym: false, anc: { k: "s", i: 0 } }); return M; } },
    { n: ["Fisch", "Fish"], f: function () {
      var M = { v: 1, sym: true, mat: 0, slot: 0, spine: [N([0, -0.15, 0.42], 0.19, 0.8), N([0, -0.15, 0.12], 0.3, 0.75), N([0, -0.15, -0.2], 0.25, 0.75), N([0, -0.15, -0.5], 0.11, 0.7)], head: [N([0, -0.18, 0.62], 0.17, 0.85)], limbs: [], stamps: [], paint: [] };
      M.stamps.push(st("eyes1", [0.12, -0.08, 0.6], [1, 0.2, 0.45], { sym: true, s: 0.8 }), st("mouth1", [0, -0.24, 0.78], [0, -0.1, 1], { s: 0.8 }), st("deco12", [0, -0.15, -0.6], [0, 0, -1], { s: 1.6, tilt: 0 }), st("deco13", [0, 0.12, 0.0], [0, 1, 0], { s: 1.4 }), st("deco12", [0.18, -0.25, 0.25], [1, -0.4, 0], { sym: true, s: 0.9, rot: 1.2 }));
      M.paint.push({ p: [0, -0.4, 0.1], r: 0.25, k: 1, v: 1, sym: false, anc: { k: "s", i: 1 } }); return M; } },
    { n: ["Schlange", "Serpent"], f: function () {
      var M = { v: 1, sym: true, mat: 0, slot: 0, spine: [N([0, 0.15, 0.3], 0.13), N([0, -0.25, 0.2], 0.15), N([0, -0.62, 0.05], 0.17), N([0, -0.83, -0.25], 0.17), N([0, -0.86, -0.55], 0.14), N([0, -0.88, -0.82], 0.1), N([0, -0.9, -1.02], 0.06)], head: [N([0, 0.38, 0.45], 0.17, 1.1), N([0, 0.35, 0.63], 0.1)], limbs: [], stamps: [], paint: [] };
      M.stamps.push(st("eyes16", [0.1, 0.46, 0.55], [0.8, 0.4, 0.6], { sym: true, s: 0.8 }), st("mouth3", [0, 0.3, 0.7], [0, -0.3, 1], { s: 0.8 }));
      M.paint.push({ p: [0, -0.2, 0.34], r: 0.14, k: 1, v: 1, sym: false, anc: { k: "s", i: 1 } }, { p: [0, -0.6, 0.2], r: 0.14, k: 1, v: 1, sym: false, anc: { k: "s", i: 2 } }); return M; } },
    { n: ["Insekt", "Bug"], f: function () {
      var M = { v: 1, sym: true, mat: 0, slot: 0, spine: [N([0, -0.2, 0.3], 0.16), N([0, -0.22, 0.05], 0.13), N([0, -0.18, -0.34], 0.27, 1.05)], head: [N([0, -0.1, 0.52], 0.16)], limbs: [], stamps: [], paint: [] };
      [0.2, 0.05, -0.1].forEach(function (z) { M.limbs.push(makeLimb("insect", [0.1, -0.28, z], [1, 0, 0], { sym: true, anc: { k: "s", i: 1 } })); });
      M.stamps.push(st("eyes9", [0.11, -0.04, 0.6], [0.9, 0.3, 0.5], { sym: true }), st("deco7", [0.06, 0.04, 0.58], [0.3, 1, 0.5], { sym: true }), st("mouth7", [0, -0.17, 0.66], [0, -0.3, 1]));
      return M; } },
    { n: ["Koloss", "Golem"], f: function () {
      var M = { v: 1, sym: true, mat: 2, slot: 0, spine: [N([0, 0.15, 0], 0.42, 1.2), N([0, -0.3, 0], 0.38, 1.2)], head: [N([0, 0.6, 0.18], 0.2, 1.1)], limbs: [], stamps: [], paint: [] };
      M.limbs.push(makeLimb("arm4", [0.42, 0.25, 0], [1, 0, 0], { sym: true, anc: { k: "s", i: 0 }, rs: 1.9 }), makeLimb("leg2", [0.22, -0.55, 0], [1, 0, 0], { sym: true, anc: { k: "s", i: 1 }, rs: 1.7 }));
      M.stamps.push(st("eyes12", [0.08, 0.66, 0.36], [0.3, 0.1, 1], { sym: true, s: 1.2 }), st("hands10", [0, 0, 0], [0, 1, 0], { anc: { k: "e", i: 0 }, s: 1.3 }), st("feet11", [0, 0, 0], [0, 1, 0], { anc: { k: "e", i: 1 } }));
      return M; } }
  ];
  function starter(i) { var M = STARTERS[i].f(); return snapStamps(sanitize(M)); }

  // Größe (m) und Gewicht (kg) aus dem Modell (seit v0.26.2). Bildgröße `size` legt den Maßstab fest: 1 Modell-Einheit = 0,5 m × size.
  // Masse: Haut/Fell 1, Stein 2, Feder 0,5 (Vögel wiegen für ihre Größe nur die Hälfte), Stempel 1.
  var DENS = [1, 1, 2, 0.5], RHO = 260;
  function measure(M, size) {
    var B = build(M), P = B.P, lo = [9, 9, 9], hi = [-9, -9, -9];
    P.forEach(function (q) { for (var k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], q.bc[k] - q.br); hi[k] = Math.max(hi[k], q.bc[k] + q.br); } });
    var n = 26, st = [(hi[0] - lo[0]) / n, (hi[1] - lo[1]) / n, (hi[2] - lo[2]) / n], vv = st[0] * st[1] * st[2], mass = 0, vol = 0, y0 = 9, y1 = -9;
    for (var iz = 0; iz < n; iz++) for (var iy = 0; iy < n; iy++) for (var ix = 0; ix < n; ix++) {
      var p = [lo[0] + (ix + 0.5) * st[0], lo[1] + (iy + 0.5) * st[1], lo[2] + (iz + 0.5) * st[2]], r = sdf(P, p);
      if (r[0] > 0) continue;
      var pr = P[r[1]], d = 1;
      if (pr && (pr.f & 1)) { var mt = M.mat; B.D.forEach(function (q) { if (q.k === 0 && len(sub(p, q.p)) < q.r + 0.12) mt = q.v; }); d = DENS[mt] || 1; }
      vol += vv; mass += vv * d; y0 = Math.min(y0, p[1] - st[1] / 2); y1 = Math.max(y1, p[1] + st[1] / 2);
    }
    var u = 0.5 * (size || 1), h = Math.max(0.1, (y1 - y0) * u), kg = mass * u * u * u * RHO;
    return { h: Math.round(h * 10) / 10, kg: kg < 10 ? Math.round(kg * 10) / 10 : Math.round(kg), vol: vol, y0: y0, h1: Math.max(0.01, (y1 - y0) * 0.5), kg1: mass * 0.125 * RHO };
  }

  MA.m3d = {
    GND: GND, PRESETS: PRESETS, preset: preset, A: A, CATS: CATS, asset: asset, STARTERS: STARTERS, starter: starter,
    sanitize: sanitize, build: build, pack: pack, draw: draw, post: post, pick: pick, sdf: sdf, basis: basis, project: project, ray: ray,
    snapshot: snapshot, measure: measure, assetThumb: assetThumb, modelThumb: modelThumb, limbThumb: limbThumb, makeLimb: makeLimb, nearestAnchor: nearestAnchor,
    stampFrame: stampFrame, palTones: palTones, ok: function () { return !!glInit(); },
    v: { add: add, sub: sub, mul: mul, dot: dot, cross: cross, len: len, norm: norm, mir: mir }
  };
})();
