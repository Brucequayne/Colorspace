  // ===== 44-umgebung.js · Environment (v0.54 "World Building"): Asteroiden und andere starre Umgebungs-Assets =====
  // Nur im Developer Tool platzierbar. Jedes Asset liegt auf einer von drei Ebenen:
  //   l = -1 hinten (Parallaxe ENV_K[-1], abgedunkelt, keine Kollision)
  //   l =  0 Spielebene (Kollision mit Schiffen, Schüsse prallen ab, unzerstörbar und unbeweglich)
  //   l =  1 vorne (Parallaxe ENV_K[1], dunkle Silhouette, keine Kollision, wird durchsichtig, wenn das eigene Schiff darunter ist)
  // Ein platziertes Asset: { a: Asset-ID, x, y (Zellen, Kommazahl), r (Grad), s (Maßstab), l (Ebene) }
  var ENV_K = { "-1": 0.88, "0": 1, "1": 1.13 };            // Parallaxe der Ebenen – nah an der Spielebene, damit es dicht und räumlich wirkt
  var ENV_FOG = { "-1": "rgba(8,11,18,.46)", "1": "rgba(3,4,7,.6)" };
  var ENV_SMIN = 0.2, ENV_SMAX = 4;   // ab v0.54.1 höchstens ×4 (ein ×4-XL ist schon über 200 m groß)
  // Gesteinsfarben (v0.54.1): nur Grautöne, mittel bis dunkel, leicht variiert – Grundton, dunkel, hell
  var ENV_MAT = {
    grau:     { k: ["Grau", "Grey"],          n: ["Grauer", "Grey"],            base: [86, 86, 88], dark: [40, 40, 42], hi: [124, 124, 126] },
    warm:     { k: ["Warmgrau", "Warm grey"], n: ["Warmgrauer", "Warm grey"],   base: [85, 84, 82], dark: [40, 39, 37], hi: [119, 117, 114] },
    graphit:  { k: ["Graphit", "Graphite"],   n: ["Graphit-", "Graphite"],      base: [52, 52, 55], dark: [22, 22, 24], hi: [82, 82, 86] },
    schiefer: { k: ["Schiefer", "Slate"],     n: ["Schiefer-", "Slate"],        base: [70, 74, 80], dark: [32, 34, 38], hi: [104, 109, 117] },
    stahl:    { k: ["Stahlgrau", "Steel"],    n: ["Stahlgrauer", "Steel grey"], base: [77, 81, 86], dark: [36, 38, 42], hi: [112, 117, 124] },
    basalt:   { k: ["Basalt", "Basalt"],      n: ["Basalt-", "Basalt"],         base: [63, 63, 65], dark: [28, 28, 30], hi: [95, 95, 99] }
  };
  var ENV_SIZE = { S: [1.8, ["klein", "small"]], M: [4.6, ["mittel", "medium"]], L: [10.5, ["groß", "large"]], XL: [22, ["riesig", "huge"]] };
  var ENV = {}, ENV_IDS = [];
  (function () {
    // Reihenfolge bleibt wie in v0.54, damit die Asset-IDs (ast01 …) gleich bleiben
    var mats = ["grau", "warm", "graphit", "schiefer", "stahl", "basalt"], sizes = ["S", "M", "L", "XL"], n = 0;
    function add(mat, sz, shape, el) {
      n++; var id = "ast" + (n < 10 ? "0" : "") + n, M = ENV_MAT[mat], Z = ENV_SIZE[sz];
      var nmDe = shape === "lang" ? M.n[0] + " Splitter " + Z[1][0] : shape === "kantig" ? M.n[0] + " Brocken " + Z[1][0] : M.n[0] + " Asteroid " + Z[1][0];
      var nmEn = shape === "lang" ? M.n[1] + " shard " + Z[1][1] : shape === "kantig" ? M.n[1] + " chunk " + Z[1][1] : M.n[1] + " asteroid " + Z[1][1];
      var pre = shape === "lang" ? ["Splitter ", "Shard "] : ["", ""];
      ENV[id] = { id: id, kind: "ast", n: { de: nmDe.replace(/^(\S+)- /, "$1-"), en: nmEn }, sn: { de: pre[0] + M.k[0] + " " + sz, en: pre[1] + M.k[1] + " " + sz }, mat: mat, R: Z[0], shape: shape, el: el || 1, seed: 7919 * n + 13 };
      ENV_IDS.push(id);
    }
    // 24 Grundformen: 6 Grautöne × 4 Größen (Schiefer kantig, der Rest knollig)
    mats.forEach(function (m) { sizes.forEach(function (z) { add(m, z, m === "schiefer" || m === "graphit" && z === "M" ? "kantig" : "rund", 1); }); });
    // 4 längliche Splitter
    add("grau", "M", "lang", 2.1); add("stahl", "L", "lang", 1.8); add("schiefer", "M", "lang", 2.4); add("warm", "XL", "lang", 1.7);
  })();
  function envRng(s) { return function () { s = s + 0x6D2B79F5 | 0; var t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  // Umriss als Radius je Winkel (sternförmig, dadurch schnelle Innen-Prüfung für Kollision und Auswahl)
  function envShape(def) {
    if (def.rr) return def.rr;
    var rnd = envRng(def.seed), kant = def.shape === "kantig", N = kant ? 9 + Math.floor(rnd() * 6) : def.R > 15 ? 72 : 48, rr = [], H = [];
    var rough = kant ? 0.16 : 0.13;
    for (var h = 2; h <= 7; h++) H.push([h, rough * Math.pow(0.62, h - 2) * (0.5 + rnd()), rnd() * 6.283]);
    var ea = def.el, eb = 1 / Math.sqrt(def.el), eaa = ea / Math.sqrt(def.el);   // Fläche ungefähr gleich lassen
    for (var i = 0; i < N; i++) {
      var a = i / N * 6.283, e = 1 / Math.sqrt(Math.pow(Math.cos(a) / eaa, 2) + Math.pow(Math.sin(a) / eb, 2)), v = 1;
      H.forEach(function (q) { v += q[1] * Math.sin(q[0] * a + q[2]); });
      v += (rnd() - 0.5) * (kant ? 0.22 : 0.06);
      rr.push(def.R * e * Math.max(0.5, v));
    }
    def.rr = rr; def.Rmax = Math.max.apply(null, rr); return rr;
  }
  function envRad(def, ang) {   // Radius des Umrisses in Richtung ang (unskaliert, Zellen)
    var rr = envShape(def), N = rr.length, f = ((ang / 6.283185307) % 1 + 1) % 1 * N, i = Math.floor(f) % N, k = f - Math.floor(f);
    return rr[i] + (rr[(i + 1) % N] - rr[i]) * k;
  }
  // Sprite je Asset, Ebene und Auflösungsstufe q (1, 2 oder 4). Einmal gezeichnet, danach nur noch drawImage.
  // v0.54.1: Wird ein Asset groß skaliert oder nah herangezoomt, entsteht eine schärfere Fassung (bis 2048 px) – nur für Stufen, die wirklich gebraucht werden.
  var ENV_PPC = 24, ENV_SPR_MAX = 2048;
  function envSprite(def, l, q) {
    def.spr = def.spr || {}; envShape(def);
    var lk = String(l || 0), ppc = Math.min(ENV_PPC * (q || 1), ENV_SPR_MAX / (2 * def.Rmax + 1)), key2 = lk + "@" + Math.round(ppc);
    if (def.spr[key2]) return def.spr[key2];
    var rr = def.rr, sz = Math.ceil((2 * def.Rmax + 1) * ppc), cv = document.createElement("canvas");
    cv.width = cv.height = sz; var g = cv.getContext("2d"), info = { cv: cv, ppc: ppc, sz: sz };
    if (!g || !g.beginPath) { def.spr[key2] = info; return info; }
    if (lk !== "0") {   // Hintergrund/Vordergrund: Spielebenen-Sprite derselben Stufe abdunkeln
      var base = envSprite(def, 0, q); g.drawImage(base.cv, 0, 0, sz, sz);
      g.globalCompositeOperation = "source-atop"; g.fillStyle = ENV_FOG[lk]; g.fillRect(0, 0, sz, sz); g.globalCompositeOperation = "source-over";
      def.spr[key2] = info; return info;
    }
    var M = ENV_MAT[def.mat], rnd = envRng(def.seed + 99), c0 = sz / 2;
    function col(q, a) { return "rgba(" + q[0] + "," + q[1] + "," + q[2] + "," + a + ")"; }
    function path() { g.beginPath(); rr.forEach(function (r, i) { var a = i / rr.length * 6.283; if (i) g.lineTo(c0 + Math.cos(a) * r * ppc, c0 + Math.sin(a) * r * ppc); else g.moveTo(c0 + Math.cos(a) * r * ppc, c0 + Math.sin(a) * r * ppc); }); g.closePath(); }
    path(); g.fillStyle = col(M.base, 1); g.fill();
    g.save(); path(); g.clip();
    // Flecken in hell und dunkel für eine steinige Oberfläche
    var spots = Math.min(900, Math.round(def.R * def.R * 6 * def.el + 40));
    for (var i = 0; i < spots; i++) {
      var a = rnd() * 6.283, d = Math.sqrt(rnd()) * envRad(def, a) * ppc, x = c0 + Math.cos(a) * d, y = c0 + Math.sin(a) * d, r = (0.15 + rnd() * rnd() * 1.1) * ppc;
      g.fillStyle = rnd() < 0.5 ? col(M.dark, 0.08 + rnd() * 0.12) : col(M.hi, 0.05 + rnd() * 0.1);
      g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill();
    }
    // Krater: dunkle Mulde mit hellem Rand (ohne Lichtrichtung, damit Drehen nichts verrät)
    var kr = def.shape === "kantig" ? Math.round(def.R * 0.6) : Math.round(def.R * 1.3 + 1);
    for (var j = 0; j < kr; j++) {
      var ka = rnd() * 6.283, kd = Math.sqrt(rnd()) * envRad(def, ka) * 0.75 * ppc, kx = c0 + Math.cos(ka) * kd, ky = c0 + Math.sin(ka) * kd, krr = (0.3 + rnd() * rnd() * def.R * 0.22) * ppc;
      var kg2 = g.createRadialGradient(kx, ky, 0, kx, ky, krr);   // weiche Mulde statt harter Scheibe
      kg2.addColorStop(0, col(M.dark, 0.38)); kg2.addColorStop(0.75, col(M.dark, 0.22)); kg2.addColorStop(1, col(M.dark, 0)); g.fillStyle = kg2; g.beginPath(); g.arc(kx, ky, krr, 0, 6.283); g.fill();
      g.strokeStyle = col(M.hi, 0.12); g.lineWidth = Math.max(1, krr * 0.16); g.beginPath(); g.arc(kx, ky, krr * 0.98, 0, 6.283); g.stroke();
    }
    // Kanten: bei kantigen Brocken helle Grate zur Mitte
    if (def.shape === "kantig") rr.forEach(function (r, i) { var a = i / rr.length * 6.283; g.strokeStyle = col(M.hi, 0.14); g.lineWidth = Math.max(1, ppc * 0.25); g.beginPath(); g.moveTo(c0 + Math.cos(a) * r * ppc, c0 + Math.sin(a) * r * ppc); g.lineTo(c0 + Math.cos(a) * r * ppc * 0.3, c0 + Math.sin(a) * r * ppc * 0.3); g.stroke(); });
    // Volumen: Mitte etwas heller, Rand dunkler
    var gr = g.createRadialGradient(c0, c0, 0, c0, c0, def.Rmax * ppc);
    gr.addColorStop(0, col(M.hi, 0.22)); gr.addColorStop(0.55, col(M.hi, 0)); gr.addColorStop(1, col(M.dark, 0.0)); g.fillStyle = gr; g.fillRect(0, 0, sz, sz);
    path(); g.strokeStyle = col(M.dark, 0.55); g.lineWidth = Math.max(2, def.R * ppc * 0.22); g.stroke();
    g.restore();
    path(); g.strokeStyle = col(M.dark, 0.9); g.lineWidth = Math.max(1, ppc * 0.12); g.stroke();
    def.spr[key2] = info; return info;
  }
  // Verkleinerte Fassungen (Mipmaps): wird ein Asset klein gezeichnet, nimmt es eine passende kleinere Kopie – spart viel Rechenzeit beim Herauszoomen
  function envMip(sp, D) {
    var lv = 0; while (lv < 5 && sp.sz / Math.pow(2, lv + 1) >= D * 1.1 && sp.sz / Math.pow(2, lv + 1) >= 16) lv++;
    if (!lv) return sp.cv;
    sp.mip = sp.mip || [sp.cv];
    for (var i = 1; i <= lv; i++) if (!sp.mip[i]) {
      var prev = sp.mip[i - 1], cv = document.createElement("canvas"), n = Math.max(1, Math.round(sp.sz / Math.pow(2, i)));
      cv.width = cv.height = n; var g = cv.getContext("2d"); if (!g || !g.drawImage) return sp.cv;
      g.imageSmoothingQuality = "high"; g.drawImage(prev, 0, 0, n, n); sp.mip[i] = cv;
    }
    return sp.mip[lv];
  }
  function envThumb(id) {
    if (isBD(id)) return bdThumb(id);
    var def = ENV[id], sp = envSprite(def, 0), cv = document.createElement("canvas"); cv.width = cv.height = 44;
    var g = cv.getContext("2d"); if (g && g.drawImage) { var f = 40 / sp.sz; g.drawImage(sp.cv, 2, 2, sp.sz * f, sp.sz * f); }
    try { return cv.toDataURL(); } catch (e) { return ""; }
  }
  // Zeichnen eines Assets mit Bildschirm-Mittelpunkt (sx, sy) und px = Pixel je Zelle (schon mit Parallaxe)
  function envDraw(c, it, sx, sy, px, alpha) {
    var def = ENV[it.a]; if (!def) return;
    var need = px * it.s, sp = envSprite(def, it.l, need <= ENV_PPC * 1.25 ? 1 : need <= ENV_PPC * 2.5 ? 2 : 4), f = need / sp.ppc, D = sp.sz * f, img = envMip(sp, D);
    if (D < 1.5) return;
    c.save(); c.translate(sx, sy); c.rotate((it.r || 0) * Math.PI / 180);
    if (alpha !== undefined && alpha < 1) c.globalAlpha = alpha;
    c.drawImage(img, -D / 2, -D / 2, D, D);
    c.restore();
  }
  // Liegt der Punkt (Zellen, relativ zum Asset-Mittelpunkt) im Asset?
  function envInside(it, dx, dy) {
    var def = ENV[it.a]; if (!def) return false; envShape(def);
    var a = -(it.r || 0) * Math.PI / 180, lx = (dx * Math.cos(a) - dy * Math.sin(a)) / it.s, ly = (dx * Math.sin(a) + dy * Math.cos(a)) / it.s, d = Math.hypot(lx, ly);
    if (d > def.Rmax) return false;
    return d < envRad(def, Math.atan2(ly, lx));
  }
  function envBound(it) { var def = ENV[it.a]; envShape(def); return def.Rmax * it.s; }   // Begrenzungskreis in Zellen
  function envPack(it) { return [it.a, Math.round(it.x * 100) / 100, Math.round(it.y * 100) / 100, Math.round(it.r || 0), Math.round(it.s * 100) / 100, it.l | 0]; }
  function envUnpack(a) { if (!Array.isArray(a) || !ENV[a[0]]) return null; var bd = isBD(a[0]); return { a: a[0], x: +a[1] || 0, y: +a[2] || 0, r: +a[3] || 0, s: Math.max(envSMin(a[0]), Math.min(envSMax(a[0]), +a[4] || 1)), l: bd ? BD_L : Math.max(-1, Math.min(1, a[5] | 0)) }; }   /* Backdrops (v0.56) immer auf Ebene -2 */

  // ---------- Editor ----------
  // Bildschirm ↔ Welt für eine Ebene: Bild = Mitte + (Pos − Kamera) · k · s
  function envEdPos(sx, sy, l) { var s = PX * V.zoom * ENV_K[l]; return { x: V.cam.x + (sx - V.W / 2) / s, y: V.cam.y + (sy - V.H / 2) / s }; }
  function envPickAt(sx, sy, l) {
    for (var i = S.env.length - 1; i >= 0; i--) {
      var it = S.env[i]; if (it.l !== l) continue;
      var p = envEdPos(sx, sy, l); if (envInside(it, p.x - it.x, p.y - it.y)) return i;
    }
    return -1;
  }
  function envNew(p, spray) {
    var bd = isBD(S.envSel), it = { a: S.envSel, x: p.x, y: p.y, r: S.envR, s: S.envS, l: bd ? BD_L : S.envL };
    if (S.envRnd || spray) it.r = Math.floor(Math.random() * 360);
    if (S.envRnd) it.s = Math.max(envSMin(S.envSel), Math.min(envSMax(S.envSel), S.envS * (0.7 + Math.random() * 0.6)));
    return it;
  }
  function envPlace(sx, sy, spray) {
    if (isBD(S.envSel)) { if (spray) return; pushUndo(); S.env.push(envNew(bdEdPos(sx, sy), false)); V.envLast = null; save(); return; }   /* Backdrops einzeln setzen, kein Streuen */
    var p = envEdPos(sx, sy, S.envL), it = envNew(p, spray);
    if (!spray) pushUndo();
    S.env.push(it); V.envLast = { x: p.x, y: p.y, d: envBound(it) * 1.7 }; save();
  }
  function envErase(sx, sy) { var i = isBD(S.envSel) ? bdPickAt(sx, sy) : envPickAt(sx, sy, S.envL); if (i < 0) return false; pushUndo(); S.env.splice(i, 1); save(); return true; }
  // Ebenen im Editor: die gerade bearbeitete voll, die anderen blass (im Block-Tab ist nur die vordere Ebene blass, damit man darunter bauen kann)
  function envEdDraw(c, l) {
    if (S.ed !== "station" || !S.env || !S.env.length) return;
    var s = PX * V.zoom * ENV_K[l], W = V.W, H = V.H, al = S.envTab ? (l === S.envL ? 1 : 0.35) : (l === 1 ? 0.3 : 1);
    S.env.forEach(function (it) {
      if (it.l !== l) return;
      var sx = W / 2 + (it.x - V.cam.x) * s, sy = H / 2 + (it.y - V.cam.y) * s, rb = envBound(it) * s;
      if (sx < -rb || sx > W + rb || sy < -rb || sy > H + rb) return;
      envDraw(c, it, sx, sy, s, al);
    });
  }
  function envEdGhost(c) {
    if (!S.envTab || !V.mouse || V.pan || S.mode !== "edit" || isBD(S.envSel)) return;
    var l = S.envL, s = PX * V.zoom * ENV_K[l];
    if (S.tool === "build") {
      var it = { a: S.envSel, x: 0, y: 0, r: S.envR, s: S.envS, l: l };
      envDraw(c, it, V.mouse.sx, V.mouse.sy, s, 0.55);
      c.strokeStyle = "rgba(87,209,138,.7)"; c.lineWidth = 1.5; c.setLineDash([5, 5]); c.beginPath(); c.arc(V.mouse.sx, V.mouse.sy, envBound(it) * s, 0, 6.283); c.stroke(); c.setLineDash([]);
    } else {
      var i = envPickAt(V.mouse.sx, V.mouse.sy, l); if (i < 0) return;
      var q = S.env[i], qx = V.W / 2 + (q.x - V.cam.x) * s, qy = V.H / 2 + (q.y - V.cam.y) * s;
      c.strokeStyle = "#E0533F"; c.lineWidth = 2.5; c.beginPath(); c.arc(qx, qy, envBound(q) * s, 0, 6.283); c.stroke();
    }
  }

  // ---------- Testflug ----------
  // Weltkoordinaten in Metern: Zelle (0,0) der Szene liegt bei FL.envO
  function envFlightInit(O) {
    FL.envO = O; FL.bd = (S.env || []).filter(function (it) { return it.l === BD_L && isBD(it.a); });
    FL.env = (S.env || []).filter(function (it) { return it.l !== BD_L && !isBD(it.a); }).map(function (it) {
      return { a: it.a, l: it.l, s: it.s, r: it.r, rad: (it.r || 0) * Math.PI / 180, x: O.x + it.x * CELL_M, y: O.y + it.y * CELL_M, R: envBound(it) * CELL_M, fa: 1 };
    });
    FL.envG = FL.env.filter(function (e) { return e.l === 0; });
  }
  function envFlInside(e, x, y) {   // Punkt in Metern
    var dx = x - e.x, dy = y - e.y; if (dx > e.R || dx < -e.R || dy > e.R || dy < -e.R) return false;
    return envInside(e, dx / CELL_M, dy / CELL_M);
  }
  function envHit(x, y) { var G = FL.envG; if (!G) return null; for (var i = 0; i < G.length; i++) if (envFlInside(G[i], x, y)) return G[i]; return null; }
  function envFlDraw(c, W, H, ppm, l) {
    if (!FL.env || !FL.env.length) return;
    var k = ENV_K[l], px = ppm * CELL_M * k, me = FL.out && FL.eva ? FL.eva : FL.me, msx = W / 2 + (me.x - FL.cam.x) * ppm, msy = H / 2 + (me.y - FL.cam.y) * ppm;
    FL.env.forEach(function (e) {
      if (e.l !== l) return;
      var sx = W / 2 + (e.x - FL.cam.x) * ppm * k, sy = H / 2 + (e.y - FL.cam.y) * ppm * k, rb = e.R * ppm * k;
      if (sx < -rb || sx > W + rb || sy < -rb || sy > H + rb) return;
      var al = 1;
      if (l === 1) {   // Vordergrund: durchsichtig, wenn das eigene Schiff darunter liegt
        var under = Math.hypot(msx - sx, msy - sy) < rb + (FL.me.rad || 5) * ppm * 0.6;
        e.fa += ((under ? 0.32 : 1) - e.fa) * 0.12; al = e.fa;
      }
      envDraw(c, e, sx, sy, px, al);
    });
  }
  // Kollision: nur Spielebene. Asset ist starr (unendliche Masse), Schiff prallt ab; bei hartem Aufprall Schaden am Schiff wie beim Rammen
  function envCollide() {
    var G = FL.envG; if (!G || !G.length) return;
    var dmg = [];
    FL.bodies.forEach(function (bd) {
      if (bd.static || bd.dead) return;
      G.forEach(function (e) {
        var dx = bd.x - e.x, dy = bd.y - e.y, rs = bd.rad + e.R; if (dx > rs || dx < -rs || dy > rs || dy < -rs || Math.hypot(dx, dy) > rs) return;
        var ca = Math.cos(bd.a), sa = Math.sin(bd.a), n = 0, px = 0, py = 0, deep = 0, hs = [];
        for (var k = 0; k < bd.cells.length; k++) {
          var cl = bd.cells[k], lx = (cl[0] - bd.com[0]) * CELL_M, ly = (cl[1] - bd.com[1]) * CELL_M, wx = bd.x + lx * ca - ly * sa, wy = bd.y + lx * sa + ly * ca;
          var ex = wx - e.x, ey = wy - e.y; if (ex > e.R + 2 || ex < -e.R - 2 || ey > e.R + 2 || ey < -e.R - 2) continue;
          var cx = ex / CELL_M, cy = ey / CELL_M, a = -e.rad, lx2 = (cx * Math.cos(a) - cy * Math.sin(a)) / e.s, ly2 = (cx * Math.sin(a) + cy * Math.cos(a)) / e.s, d = Math.hypot(lx2, ly2);
          var lim = envRad(ENV[e.a], Math.atan2(ly2, lx2)) + 0.4 / e.s;   // halbe Zelle Puffer, damit Blockkanten nicht eintauchen
          if (d < lim) { n++; px += wx; py += wy; deep = Math.max(deep, (lim - d) * e.s * CELL_M); if (hs.length < 4 && hs.indexOf(cl[2]) < 0) hs.push(cl[2]); }
        }
        if (!n) return;
        px /= n; py /= n;
        var nx = px - e.x, ny = py - e.y, nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;   // Normale vom Asset nach außen
        var rx = px - bd.x, ry = py - bd.y, vx = bd.vx - bd.w * ry, vy = bd.vy + bd.w * rx, vn = vx * nx + vy * ny, sp = Math.hypot(vx, vy);
        if (vn < 0) {
          var rn = rx * ny - ry * nx, jj = -(1 + COL.e) * vn / (1 / bd.mass + rn * rn / bd.I);
          bd.vx += jj * nx / bd.mass; bd.vy += jj * ny / bd.mass; bd.w += rn * jj / bd.I;
          var ck = "env" + bd.id; FL.colCd = FL.colCd || {};
          if (sp > COL.dmgV && !(FL.colCd[ck] > FL.t)) {
            FL.colCd[ck] = FL.t + 0.3;
            var base = (sp - COL.dmgV) * COL.dmgK; hs.forEach(function (b) { dmg.push([bd, b, base * 2]); });
            spark(px, py, 14); FL.parts.push({ x: px, y: py, vx: 0, vy: 0, life: 0, max: 0.2, k: "flash", sz: 2 + sp * 0.05 });
            if (bd === FL.me) FL.shake = Math.max(FL.shake || 0, Math.min(1, sp / 60));
          } else if (sp > 4) spark(px, py, 3);
        }
        var corr = Math.min(1.5, deep * 0.5 + 0.05); bd.x += nx * corr; bd.y += ny * corr;   // herausschieben
      });
    });
    // zu Fuß im Raumanzug: einfach herausschieben und abbremsen
    if (FL.out && FL.eva) {
      var E = FL.eva;
      G.forEach(function (e) {
        if (!envFlInside(e, E.x, E.y)) return;
        var nx = E.x - e.x, ny = E.y - e.y, nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
        for (var i = 0; i < 40 && envFlInside(e, E.x, E.y); i++) { E.x += nx * 0.25; E.y += ny * 0.25; }
        var vn = (E.vx || 0) * nx + (E.vy || 0) * ny; if (vn < 0) { E.vx -= vn * nx * 1.3; E.vy -= vn * ny * 1.3; }
      });
    }
    dmg.forEach(function (d) { if (d[0].blocks.indexOf(d[1]) >= 0) damage(d[0], d[1], d[2], 0, 0, true); });
  }
