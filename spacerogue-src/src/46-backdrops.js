  // ===== 46-backdrops.js · Backdrops (v0.56): Planeten und Sonnen ganz hinten in der Skybox =====
  // Backdrops liegen auf einer eigenen Ebene l = -2 hinter allem (hinter den Sternen-Nebeln nur die Sterne selbst).
  // Sie sind hunderttausende Kilometer entfernt: Größe hängt nicht vom Zoom ab, und sie wandern beim Fliegen kaum (Parallaxe BD_K).
  // Lage eines Backdrops: x, y in Bildpunkten relativ zur Bildmitte, wenn die Kamera auf Zelle (0,0) der Szene steht.
  // Planeten werden prozedural als Kugel gerendert (Oberfläche als Rauschen auf der Kugel, keine Nähte), in Auflösungsstufen bis 1600 px Radius.
  // Ihre Tagseite zeigt automatisch zur nächsten Sonne; ohne Sonne bestimmt die Drehung die Lichtrichtung.
  // Sonnen werfen Gegenlicht: Alles, was vor einer Sonne liegt (Schiffe, Stationen, Asteroiden, Staub), bekommt einen Lichtsaum an den Kanten.
  var BD_K = 0.004, BD_R0 = 110, BD_SMIN = 0.1, BD_SMAX = 10, BD_L = -2;
  var BD_IDS = [];
  (function () {
    function P(id, de, en, sde, sen, tex, o) { o = o || {}; ENV[id] = { id: id, kind: "bd", bt: "planet", n: { de: de, en: en }, sn: { de: sde, en: sen }, tex: tex, seed: 1000 + BD_IDS.length * 977, atm: o.atm || null, ring: o.ring || null, tilt: o.tilt || 0, gas: !!o.gas, R: 1 }; BD_IDS.push(id); }
    P("pl01", "Erdähnlicher Planet", "Earth-like planet", "Terra", "Terra", "terra", { atm: [110, 170, 255, 0.9], tilt: 0.4 });
    P("pl02", "Ozeanwelt", "Ocean world", "Ozean", "Ocean", "ocean", { atm: [100, 165, 255, 1] });
    P("pl03", "Dschungelwelt", "Jungle world", "Dschungel", "Jungle", "jungle", { atm: [130, 200, 210, 0.9], tilt: -0.3 });
    P("pl04", "Wüstenplanet", "Desert planet", "Wüste", "Desert", "desert", { atm: [230, 180, 120, 0.5] });
    P("pl05", "Roter Felsplanet", "Red rock planet", "Rot", "Red", "mars", { atm: [230, 140, 110, 0.35] });
    P("pl06", "Eisplanet", "Ice planet", "Eis", "Ice", "ice", { atm: [190, 220, 255, 0.5] });
    P("pl07", "Lavaplanet", "Lava planet", "Lava", "Lava", "lava", { atm: [255, 120, 60, 0.45] });
    P("pl08", "Tundrawelt", "Tundra world", "Tundra", "Tundra", "tundra", { atm: [160, 200, 240, 0.6], tilt: 0.2 });
    P("pl09", "Gasriese, Bänder", "Gas giant, banded", "Gasriese", "Gas giant", "jup", { atm: [240, 210, 170, 0.35], gas: true, tilt: 0.12 });
    P("pl10", "Ringplanet", "Ringed planet", "Ringplanet", "Ringed", "sat", { atm: [240, 225, 180, 0.3], gas: true, tilt: -0.35, ring: { i: 1.3, o: 2.25, col: [218, 200, 160], fl: 0.3 } });
    P("pl11", "Blauer Eisriese", "Blue ice giant", "Eisriese blau", "Ice giant blue", "nep", { atm: [110, 160, 255, 0.8], gas: true });
    P("pl12", "Türkiser Eisriese", "Teal ice giant", "Eisriese türkis", "Ice giant teal", "ura", { atm: [150, 230, 230, 0.7], gas: true, tilt: 1.1, ring: { i: 1.5, o: 1.75, col: [180, 200, 205], fl: 0.22, thin: true } });
    P("pl13", "Violetter Gasriese", "Violet gas giant", "Gasriese violett", "Gas giant violet", "vio", { atm: [190, 140, 255, 0.6], gas: true, tilt: -0.2 });
    P("pl14", "Roter Gasriese mit Ringen", "Red ringed gas giant", "Gasriese rot", "Gas giant red", "redg", { atm: [255, 150, 110, 0.4], gas: true, tilt: 0.3, ring: { i: 1.35, o: 2.0, col: [200, 160, 140], fl: 0.38 } });
    P("pl15", "Giftige Welt", "Toxic world", "Giftig", "Toxic", "toxic", { atm: [190, 230, 90, 0.9], gas: true });
    P("pl16", "Grauer Mond", "Grey moon", "Mond grau", "Moon grey", "moon");
    P("pl17", "Brauner Mond", "Brown moon", "Mond braun", "Moon brown", "moonb");
    P("pl18", "Vulkanmond", "Volcanic moon", "Vulkanmond", "Volcanic moon", "io");
    P("pl19", "Eismond mit Linien", "Lined ice moon", "Eismond", "Ice moon", "crystal");
    P("pl20", "Dunkler Basaltplanet", "Dark basalt planet", "Basalt", "Basalt", "basalt");
    P("pl21", "Sturmwelt", "Storm world", "Sturm", "Storm", "storm", { atm: [170, 190, 230, 0.8], gas: true, tilt: 0.5 });
    function Sn(id, de, en, sde, sen, core, glow, size) { ENV[id] = { id: id, kind: "bd", bt: "sun", n: { de: de, en: en }, sn: { de: sde, en: sen }, core: core, glow: glow, size: size, seed: 5000 + BD_IDS.length * 31, R: 1 }; BD_IDS.push(id); }
    Sn("sun1", "Gelbe Sonne", "Yellow sun", "Sonne gelb", "Sun yellow", [255, 246, 220], [255, 214, 140], 1);
    Sn("sun2", "Weißblaue Sonne", "Blue-white sun", "Sonne weiß", "Sun white", [245, 250, 255], [190, 215, 255], 1.1);
    Sn("sun3", "Roter Zwerg", "Red dwarf", "Roter Zwerg", "Red dwarf", [255, 200, 170], [255, 110, 70], 0.7);
    Sn("sun4", "Orange Sonne", "Orange sun", "Sonne orange", "Sun orange", [255, 236, 200], [255, 170, 90], 0.9);
    Sn("sun5", "Blauer Riese", "Blue giant", "Blauer Riese", "Blue giant", [235, 242, 255], [130, 170, 255], 1.6);
  })();
  function isBD(id) { return !!(ENV[id] && ENV[id].kind === "bd"); }
  function envSMin(id) { return isBD(id) ? BD_SMIN : ENV_SMIN; }
  function envSMax(id) { return isBD(id) ? BD_SMAX : ENV_SMAX; }

  // ---------- Rauschen auf der Kugel ----------
  function bdHash(x, y, z, s) { var h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 1274126177) + Math.imul(s, 1442695041)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; }
  function bdNoise(x, y, z, s) {
    var xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi;
    var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
    var a = bdHash(xi, yi, zi, s), b = bdHash(xi + 1, yi, zi, s), c = bdHash(xi, yi + 1, zi, s), d = bdHash(xi + 1, yi + 1, zi, s);
    var e = bdHash(xi, yi, zi + 1, s), f = bdHash(xi + 1, yi, zi + 1, s), g = bdHash(xi, yi + 1, zi + 1, s), h = bdHash(xi + 1, yi + 1, zi + 1, s);
    var x1 = a + (b - a) * u, x2 = c + (d - c) * u, x3 = e + (f - e) * u, x4 = g + (h - g) * u, y1 = x1 + (x2 - x1) * v, y2 = x3 + (x4 - x3) * v;
    return y1 + (y2 - y1) * w;
  }
  function bdFbm(x, y, z, s, oct) { var a = 0.5, f = 1, t = 0, n = 0; for (var o = 0; o < oct; o++) { n += a * bdNoise(x * f, y * f, z * f, s + o * 17); t += a; a *= 0.5; f *= 2.03; } return n / t; }
  function bdSm(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  function bdMix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function bdRamp(st, t) { if (t <= st[0][0]) return st[0][1]; for (var i = 1; i < st.length; i++) if (t <= st[i][0]) return bdMix(st[i - 1][1], st[i][1], (t - st[i - 1][0]) / (st[i][0] - st[i - 1][0])); return st[st.length - 1][1]; }
  // Krater als Punkte auf der Kugel
  function bdCraters(def, n, rmax) { var R = envRng(def.seed + 3), out = []; for (var i = 0; i < n; i++) { var z = R() * 2 - 1, a = R() * 6.283, q = Math.sqrt(1 - z * z); out.push([q * Math.cos(a), z, q * Math.sin(a), 0.015 + Math.pow(R(), 3) * rmax]); } return out; }
  function bdCrater(cr, x, y, z) {   // >0 in der Mulde (dunkel), <0 auf dem Wall (hell)
    var v = 0; for (var i = 0; i < cr.length; i++) { var c = cr[i], dx = x - c[0], dy = y - c[1], dz = z - c[2], d2 = dx * dx + dy * dy + dz * dz, r = c[3]; if (d2 > r * r * 1.7) continue; var d = Math.sqrt(d2) / r; v += d < 1 ? (1 - d * d) * 0.6 : -(1 - Math.abs(d - 1.15) / 0.15) * 0.35; }
    return v;
  }

  // Oberfläche: Farbe, Wolken, Leuchten (Lava), Glanz (Wasser) für eine Richtung (x, y, z) auf der Einheitskugel; y = Achse (Breite)
  function bdSurf(def, x, y, z, o) {
    var s = def.seed, T = def.tex, lat = y, h, k, c, cl = 0, em = 0, sp = 0;
    function clouds(f, th) { var w = bdFbm(x * 2 + 5, y * 2, z * 2, s + 7, 3); return bdSm(th, th + 0.18, bdFbm(x * f + w, y * f * 1.6 + w, z * f, s + 9, 5)); }
    if (T === "terra" || T === "ocean" || T === "jungle" || T === "tundra") {
      var sea = T === "ocean" ? 0.64 : T === "jungle" ? 0.43 : T === "tundra" ? 0.47 : 0.53;
      h = bdFbm(x * 1.9, y * 1.9, z * 1.9, s, 6);
      if (h < sea) { c = bdRamp([[sea - 0.25, [12, 34, 78]], [sea - 0.05, [22, 66, 130]], [sea, [44, 118, 168]]], h); sp = 1; if (T === "tundra") c = bdMix(c, [40, 60, 80], 0.4); }
      else {
        var hl = (h - sea) / (1 - sea);
        c = T === "jungle" ? bdRamp([[0, [70, 110, 50]], [0.15, [34, 92, 38]], [0.5, [22, 70, 30]], [0.8, [80, 90, 60]]], hl)
          : T === "tundra" ? bdRamp([[0, [110, 118, 100]], [0.3, [140, 146, 130]], [0.6, [200, 205, 205]], [1, [240, 244, 248]]], hl)
          : bdRamp([[0, [196, 180, 132]], [0.06, [96, 128, 62]], [0.3, [70, 104, 48]], [0.55, [126, 104, 70]], [0.8, [150, 140, 128]]], hl);
        if (T === "terra") c = bdMix(c, [176, 150, 98], bdSm(0.5, 0.7, bdFbm(x * 3 + 9, y * 3, z * 3, s + 4, 3)) * bdSm(0.5, 0.15, Math.abs(lat)));   // Wüstengürtel
      }
      var ice = T === "tundra" ? 0.55 : 0.8; k = bdSm(ice, ice + 0.06, Math.abs(lat) + (bdFbm(x * 4, y * 4, z * 4, s + 5, 3) - 0.5) * 0.25); c = bdMix(c, [236, 242, 248], k); if (k > 0.5) sp = 0;
      cl = clouds(T === "ocean" ? 3.2 : 2.6, T === "ocean" ? 0.48 : T === "tundra" ? 0.5 : 0.52) * 0.95;
      if (T === "terra" && h >= sea && bdNoise(x * 60, y * 60, z * 60, s + 11) > 0.8) em = 0.5;   // Stadtlichter auf der Nachtseite
    } else if (T === "desert") {
      h = bdFbm(x * 2.2, y * 2.2, z * 2.2, s, 5); var dn = 0.5 + 0.5 * Math.sin((x * 30 + z * 22 + h * 8));
      c = bdRamp([[0.3, [150, 104, 64]], [0.5, [206, 160, 104]], [0.65, [228, 196, 140]], [0.8, [170, 120, 80]]], h + dn * 0.04);
      c = bdMix(c, [240, 236, 228], bdSm(0.88, 0.94, Math.abs(lat)));
    } else if (T === "mars") {
      h = bdFbm(x * 2, y * 2, z * 2, s, 6);
      c = bdRamp([[0.3, [90, 46, 32]], [0.48, [160, 80, 50]], [0.62, [196, 110, 70]], [0.75, [150, 90, 70]]], h);
      var cm = bdCrater(def.cr || (def.cr = bdCraters(def, 70, 0.09)), x, y, z); c = bdMix(c, cm > 0 ? [70, 36, 26] : [210, 140, 100], Math.min(1, Math.abs(cm)));
      c = bdMix(c, [240, 236, 232], bdSm(0.9, 0.95, Math.abs(lat)));
    } else if (T === "ice" || T === "crystal") {
      h = bdFbm(x * 2.5, y * 2.5, z * 2.5, s, 5); var cr = Math.abs(bdFbm(x * 3, y * 3, z * 3, s + 2, 5) - 0.5);
      c = T === "ice" ? bdRamp([[0.3, [150, 180, 210]], [0.5, [206, 224, 240]], [0.7, [240, 246, 252]]], h) : bdRamp([[0.3, [200, 196, 186]], [0.6, [232, 228, 220]]], h);
      c = bdMix(c, T === "ice" ? [70, 110, 160] : [140, 84, 56], bdSm(0.03, 0.0, cr) * 0.85);
      sp = T === "ice" ? 0.4 : 0;
    } else if (T === "lava") {
      h = bdFbm(x * 2.4, y * 2.4, z * 2.4, s, 6); var rd = 1 - Math.abs(bdFbm(x * 3.4, y * 3.4, z * 3.4, s + 3, 5) - 0.5) * 2;
      c = bdRamp([[0.3, [26, 22, 22]], [0.6, [52, 44, 40]], [0.8, [74, 62, 54]]], h);
      em = bdSm(0.86, 0.97, rd) + bdSm(0.36, 0.3, h) * 0.8; c = bdMix(c, [255, 120, 40], Math.min(1, em) * 0.8);
    } else if (T === "moon" || T === "moonb" || T === "basalt") {
      h = bdFbm(x * 2.6, y * 2.6, z * 2.6, s, 6);
      var pal = T === "moon" ? [[0.3, [80, 80, 82]], [0.5, [140, 140, 142]], [0.7, [176, 176, 178]]] : T === "moonb" ? [[0.3, [84, 70, 58]], [0.5, [138, 118, 98]], [0.7, [172, 152, 130]]] : [[0.3, [30, 28, 28]], [0.5, [58, 54, 52]], [0.7, [86, 80, 76]]];
      c = bdRamp(pal, h);
      var cm2 = bdCrater(def.cr || (def.cr = bdCraters(def, T === "basalt" ? 60 : 160, 0.14)), x, y, z); c = bdMix(c, cm2 > 0 ? bdMix(c, [20, 20, 20], 0.5) : bdMix(c, [235, 235, 230], 0.45), Math.min(1, Math.abs(cm2)));
    } else if (T === "io") {
      h = bdFbm(x * 2.4, y * 2.4, z * 2.4, s, 5); var b2 = bdFbm(x * 5, y * 5, z * 5, s + 8, 4);
      c = bdRamp([[0.3, [190, 150, 60]], [0.45, [226, 200, 100]], [0.6, [240, 230, 170]], [0.75, [200, 120, 50]]], h);
      if (b2 > 0.7) c = bdMix(c, [40, 30, 24], bdSm(0.7, 0.76, b2)); if (b2 < 0.26) c = bdMix(c, [180, 60, 30], bdSm(0.26, 0.2, b2));
    } else {
      // Gasriesen: Bänder nach Breite, verwirbelt
      // Bänder: mehrere Frequenzen mit Zufallsphasen, Verwirbelung entlang der Länge, feine Schlieren
      var R9 = def.bph || (def.bph = (function () { var q = envRng(s + 21), a = []; for (var i = 0; i < 4; i++) a.push(q() * 6.283); return a; })());
      var calm = T === "ura" || T === "nep", tb = bdFbm(x * 2.2, y * 4, z * 2.2, s, 5), tw = (tb - 0.5) * (T === "storm" ? 0.5 : 0.16);
      var la = lat + tw, bd = 0.5 + 0.22 * Math.sin(la * (calm ? 9 : 17) + R9[0]) + 0.16 * Math.sin(la * (calm ? 4 : 7.3) + R9[1]) + 0.1 * Math.sin(la * (calm ? 15 : 31) + R9[2]);
      var fine = bdFbm(x * 2, y * 40, z * 2, s + 3, 4), t9 = Math.max(0, Math.min(1, bd * (calm ? 0.55 : 0.8) + (fine - 0.5) * 0.5 + (calm ? 0.2 : 0.05)));
      var PAL = { jup: [[0, [150, 100, 70]], [0.35, [196, 150, 110]], [0.6, [232, 214, 186]], [1, [246, 236, 220]]], sat: [[0, [196, 170, 120]], [0.5, [226, 206, 160]], [1, [244, 232, 200]]],
        nep: [[0, [40, 70, 170]], [0.5, [60, 110, 210]], [1, [120, 170, 240]]], ura: [[0, [120, 196, 200]], [0.5, [150, 216, 220]], [1, [190, 236, 236]]],
        vio: [[0, [80, 50, 120]], [0.4, [130, 90, 170]], [0.7, [190, 150, 220]], [1, [230, 210, 240]]], redg: [[0, [120, 50, 40]], [0.4, [180, 90, 60]], [0.7, [220, 150, 110]], [1, [240, 210, 180]]],
        toxic: [[0, [120, 130, 40]], [0.4, [170, 180, 60]], [0.7, [210, 214, 110]], [1, [236, 236, 170]]], storm: [[0, [60, 70, 90]], [0.4, [110, 124, 150]], [0.7, [170, 182, 204]], [1, [226, 232, 240]]] };
      c = bdRamp(PAL[T] || PAL.jup, t9);
      if (T === "jup") {   // großer Sturm
        var sx = x - 0.62, sy = (y + 0.32) * 2.2, sz = z - 0.68, sd = Math.sqrt(sx * sx + sy * sy + sz * sz);
        if (sd < 0.26) c = bdMix(c, bdMix([190, 90, 60], [220, 140, 100], sd / 0.26), bdSm(0.26, 0.12, sd));
      }
      if (T === "storm") { cl = bdSm(0.55, 0.75, bdFbm(x * 3 + tw * 3, y * 6, z * 3, s + 6, 5)) * 0.8; }
    }
    o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; o[3] = cl; o[4] = em; o[5] = sp;
  }
  // Oberflächenkarte (Länge × Breite) einmal je Planet und Auflösung; Sprites lesen sie mit bilinearer Filterung
  function bdMap(def, MW, until) {
    def.maps = def.maps || {}; var M = def.maps[MW];
    if (!M) M = def.maps[MW] = { A: new Float32Array(MW * MW / 2 * 6), W: MW, H: MW / 2, j: 0 };
    if (M.j >= M.H) return M;
    var MH = M.H, A = M.A, o = [0, 0, 0, 0, 0, 0];
    for (var j = M.j; j < MH; j++) {
      if (until && (j & 7) === 0 && performance.now() > until) { M.j = j; return null; }
      var lat = ((j + 0.5) / MH - 0.5) * Math.PI, cy = Math.sin(lat), cr = Math.cos(lat);
      for (var i = 0; i < MW; i++) { var lon = (i + 0.5) / MW * 2 * Math.PI; bdSurf(def, cr * Math.sin(lon), cy, cr * Math.cos(lon), o); var k = (j * MW + i) * 6; for (var q = 0; q < 6; q++) A[k + q] = o[q]; }
    }
    M.j = MH; return M;
  }
  // Planet als Bild: Radius rp (px), Licht kommt von +x (leicht von vorn). Rückgabe: Leinwand, Mittelpunkt
  function bdPlanetJob(def, rp) {
    var ring = def.ring, m = ring ? ring.o + 0.08 : 1.14, sz = Math.ceil(2 * rp * m) + 4, c0 = sz / 2;
    var cv = document.createElement("canvas"); cv.width = cv.height = sz; var g = cv.getContext("2d"); if (!g || !g.createImageData) return { step: function () { return { cv: cv, c: c0 }; } };
    var MW = rp <= 60 ? 128 : rp <= 160 ? 256 : rp <= 640 ? 512 : 1024, fineD = rp >= 600, map = null, A = null, MH = 0, yRow = 0;
    var pc = document.createElement("canvas"); pc.width = pc.height = sz; var pg = pc.getContext("2d"), img = pg.createImageData(sz, sz), D = img.data;
    var L = [0.9, -0.12, 0.42], ll = Math.hypot(L[0], L[1], L[2]); L = [L[0] / ll, L[1] / ll, L[2] / ll];
    var ct = Math.cos(def.tilt), st = Math.sin(def.tilt), atm = def.atm, aS = atm ? atm[3] : 0, ha = atm ? 0.09 : 0;
    var px = [0, 0, 0, 0, 0, 0];
    function samp(lon, lat) {
      var fx = (lon / (2 * Math.PI) + 1) % 1 * map.W - 0.5, fy = (lat / Math.PI + 0.5) * MH - 0.5, i0 = Math.floor(fx), j0 = Math.max(0, Math.min(MH - 2, Math.floor(fy))), tx = fx - i0, ty = Math.max(0, Math.min(1, fy - j0)), i1 = ((i0 + 1) % map.W + map.W) % map.W; i0 = (i0 % map.W + map.W) % map.W;
      for (var q = 0; q < 6; q++) { var a = A[(j0 * map.W + i0) * 6 + q], b = A[(j0 * map.W + i1) * 6 + q], c = A[((j0 + 1) * map.W + i0) * 6 + q], d = A[((j0 + 1) * map.W + i1) * 6 + q]; px[q] = (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty; }
    }
    // step(bis): arbeitet bis zur Uhrzeit "bis" (oder ganz, ohne Angabe); gibt das fertige Bild zurück oder null
    function step(until) {
    if (!map) { map = bdMap(def, MW, until); if (!map) return null; A = map.A; MH = map.H; }
    for (var y = yRow; y < sz; y++) {
      if (until && (y & 3) === 0 && performance.now() > until) { yRow = y; return null; }
      var yy = (y + 0.5 - c0) / rp; if (Math.abs(yy) > 1 + ha) continue;
      for (var x = 0; x < sz; x++) {
        var xx = (x + 0.5 - c0) / rp, r2 = xx * xx + yy * yy, o = (y * sz + x) * 4; if (r2 > (1 + ha) * (1 + ha)) continue;
        if (r2 <= 1) {
          var nz = Math.sqrt(1 - r2), d = xx * L[0] + yy * L[1] + nz * L[2];
          // Achsneigung: Normale in der Bildebene drehen, dann Länge/Breite
          var qx = xx * ct - yy * st, qy = xx * st + yy * ct;
          samp(Math.atan2(qx, nz), Math.asin(Math.max(-1, Math.min(1, qy))));
          var term = bdSm(-0.1, 0.18, d), dif = term * (0.18 + 0.82 * Math.pow(Math.max(0, d), 0.75)) + 0.03;
          var r = px[0], gg = px[1], b = px[2];
          if (fineD) { var dn = 0.94 + (bdNoise(qx * 70, qy * 70, nz * 70, def.seed + 5) - 0.5) * (def.gas ? 0.06 : 0.16); r *= dn; gg *= dn; b *= dn; }   // feine Struktur bei großen Bildern
          if (def.gas) { var ld = 0.55 + 0.45 * Math.sqrt(nz); r *= ld; gg *= ld; b *= ld; }
          r *= dif; gg *= dif; b *= dif;
          if (px[5] > 0) { var hz = 2 * d * nz - L[2], spc = Math.pow(Math.max(0, hz), 40) * px[5] * term * 160; r += spc; gg += spc; b += spc * 0.95; }
          var cl = px[3]; if (cl > 0) { var cv2 = 245 * (dif + 0.02); r += (cv2 - r) * cl; gg += (cv2 - gg) * cl; b += (cv2 - b) * cl; }
          var em = px[4] * (1 - term) * (1 - cl); if (def.tex === "terra" && em > 0 && bdHash(x, y, 7, def.seed) < 0.8) em = 0;   // Stadtlichter als einzelne Lichtpunkte if (em > 0) { r += 255 * em; gg += 130 * em; b += 50 * em; }
          if (atm) { var rim = Math.pow(1 - nz, 2.6) * aS * (0.08 + term * 0.9); r += (atm[0] - r) * Math.min(1, rim); gg += (atm[1] - gg) * Math.min(1, rim); b += (atm[2] - b) * Math.min(1, rim); }
          // weiche Kante (1 px Kantenglättung)
          var edge = Math.max(0, Math.min(1, (1 - Math.sqrt(r2)) * rp + 0.5));
          D[o] = r; D[o + 1] = gg; D[o + 2] = b; D[o + 3] = 255 * edge;
          if (edge < 1 && atm) { var hl2 = aS * 0.6 * bdSm(-0.4, 0.6, (xx * L[0] + yy * L[1]) / Math.sqrt(r2)); D[o] = D[o] * edge + atm[0] * (1 - edge); D[o + 1] = D[o + 1] * edge + atm[1] * (1 - edge); D[o + 2] = D[o + 2] * edge + atm[2] * (1 - edge); D[o + 3] = Math.max(D[o + 3], 255 * hl2); }
        } else {
          // Atmosphärensaum außerhalb der Scheibe, auf der Tagseite heller
          var rr = Math.sqrt(r2), f = 1 - (rr - 1) / ha, lit = bdSm(-0.4, 0.6, (xx * L[0] + yy * L[1]) / rr), al = f * f * f * aS * 0.6 * lit;
          if (al <= 0.004) continue;
          D[o] = atm[0]; D[o + 1] = atm[1]; D[o + 2] = atm[2]; D[o + 3] = 255 * Math.min(1, al);
        }
      }
    }
    yRow = sz;
    pg.putImageData(img, 0, 0);
    if (!ring) { g.drawImage(pc, 0, 0); return { cv: cv, c: c0 }; }
    // Ringe: hinterer Teil, Planet, vorderer Teil; Planetenschatten auf dem Ring
    var rc = document.createElement("canvas"); rc.width = rc.height = sz; var rg = rc.getContext("2d"), R = envRng(def.seed + 17);
    rg.save(); rg.translate(c0, c0); rg.rotate(def.tilt); rg.scale(1, ring.fl);
    var gr = rg.createRadialGradient(0, 0, ring.i * rp, 0, 0, ring.o * rp), n = ring.thin ? 4 : 14;
    for (var k = 0; k <= n; k++) { var tt = k / n, a = ring.thin ? (k === 0 || k === n ? 0 : 0.55) : (k === 0 || k === n ? 0 : 0.25 + R() * 0.6) * (Math.abs(tt - 0.62) < 0.03 ? 0.1 : 1); gr.addColorStop(tt, "rgba(" + Math.round(ring.col[0] * (0.8 + R() * 0.3)) + "," + Math.round(ring.col[1] * (0.8 + R() * 0.3)) + "," + Math.round(ring.col[2] * (0.8 + R() * 0.3)) + "," + a.toFixed(2) + ")"); }
    rg.fillStyle = gr; rg.beginPath(); rg.arc(0, 0, ring.o * rp, 0, 6.283); rg.arc(0, 0, ring.i * rp, 0, 6.283, true); rg.fill("evenodd");
    rg.restore();
    // Schatten: hinter dem Planeten (Seite ohne Licht)
    rg.save(); rg.globalCompositeOperation = "destination-out"; rg.translate(c0, c0); rg.rotate(Math.atan2(L[1], L[0]));
    for (var fq = 0; fq < 5; fq++) {   // weiche Schattenkante
      var hh = rp * (1.06 - fq * 0.05), sg = rg.createLinearGradient(0, 0, -rp * ring.o, 0); sg.addColorStop(0, "rgba(0,0,0,.3)"); sg.addColorStop(1, "rgba(0,0,0,.2)"); rg.fillStyle = sg; rg.fillRect(-rp * ring.o * 1.1, -hh, rp * ring.o * 1.1, hh * 2);
    }
    rg.restore();
    function half(top) { g.save(); g.translate(c0, c0); g.rotate(def.tilt); g.beginPath(); if (top) g.rect(-sz, -sz, 2 * sz, sz); else g.rect(-sz, 0, 2 * sz, sz); g.rotate(-def.tilt); g.translate(-c0, -c0); g.clip(); g.drawImage(rc, 0, 0); g.restore(); }
    half(true); g.drawImage(pc, 0, 0); half(false);
    return { cv: cv, c: c0 };
    }
    return { step: step };
  }
  // Sonnenscheibe mit Randverdunkelung und Granulation (ohne Strahlenkranz, der wird live gezeichnet)
  function bdSunCanvas(def, rc) {
    var sz = Math.ceil(rc * 2) + 4, c0 = sz / 2, cv = document.createElement("canvas"); cv.width = cv.height = sz; var g = cv.getContext("2d"); if (!g || !g.createImageData) return { cv: cv, c: c0 };
    var img = g.createImageData(sz, sz), D = img.data, C = def.core, G = def.glow;
    for (var y = 0; y < sz; y++) for (var x = 0; x < sz; x++) {
      var xx = (x + 0.5 - c0) / rc, yy = (y + 0.5 - c0) / rc, r2 = xx * xx + yy * yy; if (r2 > 1) continue;
      var nz = Math.sqrt(1 - r2), gran = bdNoise(xx * 14, yy * 14, nz * 14, def.seed) * 0.5 + bdNoise(xx * 40, yy * 40, nz * 40, def.seed + 1) * 0.5, ld = 0.55 + 0.45 * Math.pow(nz, 0.5), t = ld * (0.92 + gran * 0.12);
      var o = (y * sz + x) * 4, cm = 1 - Math.pow(1 - nz, 1.5);
      D[o] = Math.min(255, (G[0] + (C[0] - G[0]) * cm) * t + 10); D[o + 1] = Math.min(255, (G[1] + (C[1] - G[1]) * cm) * t + 6); D[o + 2] = Math.min(255, (G[2] + (C[2] - G[2]) * cm) * t);
      D[o + 3] = 255 * Math.max(0, Math.min(1, (1 - Math.sqrt(r2)) * rc + 0.5));
    }
    g.putImageData(img, 0, 0); return { cv: cv, c: c0 };
  }
  // Auflösungsstufen: das Bild wird nur in der Stufe erzeugt, die gebraucht wird
  var BD_TIER = [40, 80, 160, 320, 640, 1100, 1600];
  // Bis 160 px Radius sofort; größere Stufen entstehen stückweise (höchstens ~8 ms je Bild), bis dahin wird die nächstkleinere gezeigt
  var BD_BUD = 0;
  function bdSprite(def, rpx) {
    var t = BD_TIER[BD_TIER.length - 1]; for (var i = 0; i < BD_TIER.length; i++) if (BD_TIER[i] >= rpx * 0.92) { t = BD_TIER[i]; break; }
    def.spr = def.spr || {}; if (def.spr[t]) return def.spr[t];
    if (def.bt === "sun") { var ss = bdSunCanvas(def, t); ss.r = t; return (def.spr[t] = ss); }
    def.jobs = def.jobs || {};
    var job = def.jobs[t] || (def.jobs[t] = bdPlanetJob(def, t)), now = performance.now();
    if (t <= 160) { var sp = job.step(0); sp.r = t; delete def.jobs[t]; return (def.spr[t] = sp); }
    if (now < BD_BUD) { var sp2 = job.step(BD_BUD); if (sp2) { sp2.r = t; delete def.jobs[t]; return (def.spr[t] = sp2); } }
    for (var k = BD_TIER.indexOf(t) - 1; k >= 0; k--) if (def.spr[BD_TIER[k]]) return def.spr[BD_TIER[k]];
    return bdSprite(def, 160);
  }
  function bdRadius(it) { var def = ENV[it.a]; return def.bt === "sun" ? BD_R0 * 0.5 * def.size * it.s : BD_R0 * it.s; }   // Bildpunkte
  function bdThumb(id) {
    var def = ENV[id], cv = document.createElement("canvas"); cv.width = cv.height = 44; var g = cv.getContext("2d"); if (!g || !g.drawImage) return "";
    if (def.bt === "sun") { bdSunGlow(g, def, 22, 22, 8, 1); var sp = bdSprite(def, 8); g.drawImage(sp.cv, 22 - sp.c * 8 / sp.r, 22 - sp.c * 8 / sp.r, sp.cv.width * 8 / sp.r, sp.cv.height * 8 / sp.r); }
    else { var rp = def.ring ? 9.5 : 17, sp2 = bdSprite(def, rp), f = rp / sp2.r; g.translate(22, 22); g.rotate(-0.5); g.drawImage(sp2.cv, -sp2.c * f, -sp2.c * f, sp2.cv.width * f, sp2.cv.height * f); }
    try { return cv.toDataURL(); } catch (e) { return ""; }
  }
  // Strahlenkranz einer Sonne (additiv): weiter Schein, enger Hof, ein paar feine Strahlen
  function bdSunGlow(c, def, x, y, rc, al) {
    var G = def.glow, gs = "rgba(" + G[0] + "," + G[1] + "," + G[2] + ",";
    c.save(); c.globalCompositeOperation = "lighter";
    var R1 = rc * 9, g1 = c.createRadialGradient(x, y, rc * 0.8, x, y, R1); g1.addColorStop(0, gs + (0.42 * al) + ")"); g1.addColorStop(0.25, gs + (0.14 * al) + ")"); g1.addColorStop(1, gs + "0)");
    c.fillStyle = g1; c.fillRect(x - R1, y - R1, R1 * 2, R1 * 2);
    var R2 = rc * 2.1, g2 = c.createRadialGradient(x, y, rc * 0.9, x, y, R2); g2.addColorStop(0, "rgba(255,255,255," + (0.7 * al) + ")"); g2.addColorStop(0.4, gs + (0.35 * al) + ")"); g2.addColorStop(1, gs + "0)");
    c.fillStyle = g2; c.beginPath(); c.arc(x, y, R2, 0, 6.283); c.fill();
    if (rc > 6) for (var i = 0; i < 6; i++) {
      var a = i / 6 * Math.PI + 0.3 + (def.seed % 7) * 0.1, L = rc * (i % 2 ? 2.6 : 4.6), w = Math.max(1, rc * 0.035);
      c.save(); c.translate(x, y); c.rotate(a); var lg = c.createLinearGradient(-L, 0, L, 0); lg.addColorStop(0, gs + "0)"); lg.addColorStop(0.5, gs + (0.12 * al) + ")"); lg.addColorStop(1, gs + "0)");
      c.fillStyle = lg; c.fillRect(-L, -w / 2, 2 * L, w); c.restore();
    }
    c.restore();
  }
  // Bildschirmlage eines Backdrops; cam = Kamera in Zellen der Szene
  function bdScr(it, W, H, camX, camY) { return { x: W / 2 + it.x - camX * PX * BD_K, y: H / 2 + it.y - camY * PX * BD_K }; }
  // Alle Backdrops zeichnen (Sonnen zuerst, Planeten davor). Rückgabe: sichtbare Sonnen für das Gegenlicht
  function bdDraw(c, list, W, H, camX, camY, alphaOf) {
    BD_BUD = performance.now() + 8;
    var suns = [], pl = [];
    list.forEach(function (it) { if (it.l !== BD_L || !isBD(it.a)) return; (ENV[it.a].bt === "sun" ? suns : pl).push(it); });
    if (!suns.length && !pl.length) return [];
    var vis = [], sunPos = suns.map(function (it) { var p = bdScr(it, W, H, camX, camY); return { it: it, x: p.x, y: p.y, r: bdRadius(it) }; });
    sunPos.forEach(function (S2) {
      var def = ENV[S2.it.a], rc = S2.r, al = alphaOf ? alphaOf(S2.it) : 1;
      if (S2.x < -rc * 9 || S2.x > W + rc * 9 || S2.y < -rc * 9 || S2.y > H + rc * 9) return;
      bdSunGlow(c, def, S2.x, S2.y, rc, al);
      var sp = bdSprite(def, rc), f = rc / sp.r; c.save(); if (al < 1) c.globalAlpha = al; c.drawImage(sp.cv, S2.x - sp.c * f, S2.y - sp.c * f, sp.cv.width * f, sp.cv.height * f); c.restore();
      vis.push({ x: S2.x, y: S2.y, rc: rc, col: def.glow });
    });
    pl.forEach(function (it) {
      var def = ENV[it.a], p = bdScr(it, W, H, camX, camY), rp = bdRadius(it), m = def.ring ? def.ring.o + 0.1 : 1.15;
      if (p.x < -rp * m || p.x > W + rp * m || p.y < -rp * m || p.y > H + rp * m) return;
      // Lichtrichtung: zur nächsten Sonne, sonst die eingestellte Drehung
      var ang = (it.r || 0) * Math.PI / 180, bd = 1e18; sunPos.forEach(function (s3) { var d = Math.hypot(s3.x - p.x, s3.y - p.y); if (d < bd) { bd = d; ang = Math.atan2(s3.y - p.y, s3.x - p.x); } });
      var sp = bdSprite(def, rp), f = rp / sp.r, al = alphaOf ? alphaOf(it) : 1;
      c.save(); c.translate(p.x, p.y); c.rotate(ang); if (al < 1) c.globalAlpha = al; c.drawImage(sp.cv, -sp.c * f, -sp.c * f, sp.cv.width * f, sp.cv.height * f); c.restore();
    });
    return vis;
  }

  // ---------- Gegenlicht: Lichtsaum an allem, was vor einer Sonne liegt ----------
  // Der Vordergrund wird in eine eigene Leinwand gezeichnet. Je sichtbarer Sonne: Umriss weichzeichnen (Schatten-Trick), innen ausstanzen
  // = Saum außen; dazu ein schmaler Saum innen an der Kante. Beides in Sonnenfarbe, zur Sonne hin stärker, additiv aufs Bild.
  var BDFX = {};
  function bdFxCanvas(k, w, h) { var o = BDFX[k]; if (!o) { o = BDFX[k] = { cv: document.createElement("canvas") }; o.g = o.cv.getContext("2d"); } if (o.cv.width !== w || o.cv.height !== h) { o.cv.width = w; o.cv.height = h; } return o; }
  function bdFxBegin(W, H) {
    var dpr = window.devicePixelRatio || 1, o = bdFxCanvas("fg", Math.round(W * dpr), Math.round(H * dpr));
    if (!o.g || !o.g.setTransform) return null;
    o.g.setTransform(1, 0, 0, 1, 0, 0); o.g.clearRect(0, 0, o.cv.width, o.cv.height); o.g.setTransform(dpr, 0, 0, dpr, 0, 0);
    o.g.globalAlpha = 1; o.g.globalCompositeOperation = "source-over";
    return o.g;
  }
  function bdFxEnd(main, W, H, suns) {
    var o = BDFX.fg, dpr = window.devicePixelRatio || 1; if (!o) return;
    main.drawImage(o.cv, 0, 0, W, H);
    suns.forEach(function (sn) {
      var R = sn.rc * 4.5, x0 = Math.max(0, sn.x - R), y0 = Math.max(0, sn.y - R), x1 = Math.min(W, sn.x + R), y1 = Math.min(H, sn.y + R);
      if (x1 - x0 < 4 || y1 - y0 < 4) return;
      var sc = 0.34, gw = Math.max(2, Math.ceil((x1 - x0) * sc)), gh = Math.max(2, Math.ceil((y1 - y0) * sc)), OFF = gw + gh + 50;
      var sx = x0 * dpr, sy = y0 * dpr, sw = (x1 - x0) * dpr, sh = (y1 - y0) * dpr;
      var G = bdFxCanvas("g", gw, gh), I = bdFxCanvas("i", gw, gh), g = G.g, ig = I.g, col = "rgb(" + sn.col[0] + "," + sn.col[1] + "," + sn.col[2] + ")";
      // äußerer Saum: weichgezeichneter Umriss minus Umriss
      g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "source-over"; g.globalAlpha = 1; g.clearRect(0, 0, gw, gh);
      g.save(); g.shadowColor = col; g.shadowOffsetX = OFF; g.shadowOffsetY = 0;
      g.shadowBlur = Math.max(5, sn.rc * 0.14); g.drawImage(o.cv, sx, sy, sw, sh, -OFF, 0, gw, gh);
      g.restore();
      g.globalCompositeOperation = "destination-out"; g.drawImage(o.cv, sx, sy, sw, sh, 0, 0, gw, gh);
      // innerer Saum: Umriss in Sonnenfarbe, minus leicht weichgezeichneter Umriss → nur die Kante
      ig.setTransform(1, 0, 0, 1, 0, 0); ig.globalCompositeOperation = "source-over"; ig.globalAlpha = 1; ig.clearRect(0, 0, gw, gh);
      ig.drawImage(o.cv, sx, sy, sw, sh, 0, 0, gw, gh);
      ig.globalCompositeOperation = "source-in"; ig.fillStyle = col; ig.fillRect(0, 0, gw, gh);
      ig.globalCompositeOperation = "destination-out"; ig.save(); ig.shadowColor = "#000"; ig.shadowOffsetX = OFF; ig.shadowBlur = 2.5; ig.drawImage(o.cv, sx, sy, sw, sh, -OFF, 0, gw, gh); ig.restore();
      g.globalCompositeOperation = "lighter"; g.drawImage(I.cv, 0, 0);
      // zur Sonne hin stark, nach außen auslaufend
      var cx = (sn.x - x0) * sc, cy = (sn.y - y0) * sc, mg = g.createRadialGradient(cx, cy, sn.rc * 0.5 * sc, cx, cy, R * sc);
      mg.addColorStop(0, "rgba(0,0,0,1)"); mg.addColorStop(0.28, "rgba(0,0,0,.9)"); mg.addColorStop(0.55, "rgba(0,0,0,.35)"); mg.addColorStop(1, "rgba(0,0,0,0)");
      g.globalCompositeOperation = "destination-in"; g.fillStyle = mg; g.fillRect(0, 0, gw, gh);
      main.save(); main.globalCompositeOperation = "lighter"; main.drawImage(G.cv, 0, 0, gw, gh, x0, y0, x1 - x0, y1 - y0); main.drawImage(G.cv, 0, 0, gw, gh, x0, y0, x1 - x0, y1 - y0); main.restore();
    });
  }

  // ---------- Editor ----------
  function bdEdCam() { return { x: V.cam.x, y: V.cam.y }; }
  function bdEdPos(sx, sy) { return { x: sx - V.W / 2 + V.cam.x * PX * BD_K, y: sy - V.H / 2 + V.cam.y * PX * BD_K }; }
  function bdPickAt(sx, sy) {
    for (var i = S.env.length - 1; i >= 0; i--) { var it = S.env[i]; if (it.l !== BD_L || !isBD(it.a)) continue; var p = bdScr(it, V.W, V.H, V.cam.x, V.cam.y); if (Math.hypot(sx - p.x, sy - p.y) < bdRadius(it)) return i; }
    return -1;
  }
  function bdEdDraw(c) {
    if (S.ed !== "station" || !S.env || !S.env.length) return [];
    var al = S.envTab && !isBD(S.envSel) ? 0.6 : 1;
    return bdDraw(c, S.env, V.W, V.H, V.cam.x, V.cam.y, function () { return al; });
  }
  function bdEdGhost(c) {
    if (!S.envTab || !V.mouse || V.pan || S.mode !== "edit" || !isBD(S.envSel)) return;
    if (S.tool === "build") {
      var it = { a: S.envSel, x: 0, y: 0, r: S.envR, s: S.envS, l: BD_L }, def = ENV[S.envSel], r = bdRadius(it), sp = bdSprite(def, r), f = r / sp.r;
      c.save(); c.globalAlpha = 0.55; c.translate(V.mouse.sx, V.mouse.sy); c.rotate(S.envR * Math.PI / 180); c.drawImage(sp.cv, -sp.c * f, -sp.c * f, sp.cv.width * f, sp.cv.height * f); c.restore();
      c.strokeStyle = "rgba(87,209,138,.7)"; c.lineWidth = 1.5; c.setLineDash([5, 5]); c.beginPath(); c.arc(V.mouse.sx, V.mouse.sy, r, 0, 6.283); c.stroke(); c.setLineDash([]);
    } else {
      var i = bdPickAt(V.mouse.sx, V.mouse.sy); if (i < 0) return;
      var q = S.env[i], p = bdScr(q, V.W, V.H, V.cam.x, V.cam.y);
      c.strokeStyle = "#E0533F"; c.lineWidth = 2.5; c.beginPath(); c.arc(p.x, p.y, bdRadius(q), 0, 6.283); c.stroke();
    }
  }
