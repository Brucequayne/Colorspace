  // ===== 49-effekte.js · Effekte im Environment (Developer Tool, seit v0.59.1) =====
  // Eigene Kategorie "Effekte" im Tab Environmental: Funken (kaputtes Kabel), Licht, rotes Licht, Sirene, Blinklicht,
  // Blinklichter (Lauflicht) und Rauch. Platziert, gedreht, skaliert und exportiert wie Asteroiden ([id, x, y, grad, maßstab, ebene]).
  // Effekte haben keine Kollision. Auf der Spielebene werden sie über den Blöcken gezeichnet, damit Lampen an Wänden sichtbar sind.
  // Alles wird aus der Uhrzeit berechnet (kein Math.random), jedes Exemplar läuft durch seine Lage etwas versetzt.
  var FX_IDS = [], FXPASS = false;
  (function () {
    function add(id, de, en, sde, sen, R) { ENV[id] = { id: id, kind: "fx", n: { de: de, en: en }, sn: { de: sde, en: sen }, R: R, rr: [R, R, R, R, R, R, R, R], Rmax: R }; FX_IDS.push(id); }
    add("fxspark", "Funken (kaputtes Kabel)", "Sparks (broken cable)", "Funken", "Sparks", 1.6);
    add("fxlight", "Licht", "Light", "Licht", "Light", 3);
    add("fxred", "Rotes Licht", "Red light", "Rotes Licht", "Red light", 3);
    add("fxsiren", "Sirene (Rundumlicht)", "Siren (rotating beacon)", "Sirene", "Siren", 3.5);
    add("fxblink", "Blinklicht", "Blinking light", "Blinklicht", "Blinker", 2);
    add("fxchase", "Blinklichter (Lauflicht)", "Chasing lights", "Blinklichter", "Chase lights", 2.6);
    add("fxsmoke", "Rauch", "Smoke", "Rauch", "Smoke", 3.5);
  })();
  Object.assign(TX, { envFx: L2("Effekte", "Effects"), envFxH: L2("Ohne Kollision. Drehen bestimmt die Richtung (Rauch, Funken, Lauflicht), Größe die Reichweite.", "No collision. Rotation sets the direction (smoke, sparks, chase lights), size sets the reach.") });
  function fxH(a, b) { var h = Math.imul((a * 73856093) ^ (b * 19349663), 2654435761) >>> 0; h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h ^= h >>> 13; return (h >>> 0) / 4294967296; }
  function fxGlow(c, x, y, r, col, a) {
    if (r < 0.5 || a <= 0) return;
    var g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, "rgba(" + col + "," + a + ")"); g.addColorStop(0.25, "rgba(" + col + "," + (a * 0.45) + ")"); g.addColorStop(1, "rgba(" + col + ",0)");
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 6.283); c.fill();
  }
  function fxCore(c, x, y, r, col) { c.fillStyle = col; c.beginPath(); c.arc(x, y, Math.max(1, r), 0, 6.283); c.fill(); }
  // it: { a, s, r(Grad) }, (sx, sy) Bildpunkt der Mitte, px = Pixel je Zelle, al = Deckkraft, tm = Zeit in s
  function fxDraw(c, it, sx, sy, px, al, tm) {
    var def = ENV[it.a]; if (!def) return;
    if (tm == null) tm = performance.now() / 1000;
    var u = px * it.s, ph = fxH(Math.round(it.x * 10), Math.round(it.y * 10)) * 10, t = tm + ph, rot = (it.r || 0) * Math.PI / 180;
    c.save(); c.translate(sx, sy); c.rotate(rot); if (al !== undefined && al < 1) c.globalAlpha = al;
    var add = function () { c.globalCompositeOperation = "lighter"; };
    if (def.id === "fxlight") { add(); fxGlow(c, 0, 0, 3 * u, "255,236,200", 0.55); fxCore(c, 0, 0, 0.12 * u, "#FFF8E8"); }
    else if (def.id === "fxred") { add(); var fr = 0.9 + 0.1 * Math.sin(t * 2.1); fxGlow(c, 0, 0, 3 * u, "255,50,40", 0.6 * fr); fxCore(c, 0, 0, 0.12 * u, "#FFB0A8"); }
    else if (def.id === "fxblink") {
      var bp = (t % 1.3) / 1.3, on = bp < 0.12 ? 1 : bp < 0.2 ? 1 - (bp - 0.12) / 0.08 : 0;
      c.fillStyle = "#4A2020"; c.beginPath(); c.arc(0, 0, 0.14 * u, 0, 6.283); c.fill();
      if (on > 0) { add(); fxGlow(c, 0, 0, 2 * u, "255,70,50", 0.8 * on); fxCore(c, 0, 0, 0.14 * u, "rgba(255,220,210," + on + ")"); }
    } else if (def.id === "fxchase") {   // Lauflicht: 5 Lampen in Drehrichtung (nach oben = 0°), das Licht wandert
      var n = 5, Lh = 2.2 * u;
      for (var i = 0; i < n; i++) {
        var y = Lh - i * Lh / (n - 1) * 2, k = ((t * 6 - i) % n + n) % n, lv = k < 1 ? 1 - k : 0;
        c.globalCompositeOperation = "source-over"; c.fillStyle = "#3A2E14"; c.beginPath(); c.arc(0, y, 0.11 * u, 0, 6.283); c.fill();
        if (lv > 0.02) { add(); fxGlow(c, 0, y, 0.9 * u, "255,190,60", 0.8 * lv); fxCore(c, 0, y, 0.11 * u, "rgba(255,240,200," + lv + ")"); }
      }
    } else if (def.id === "fxsiren") {   // Rundumlicht: Gehäuse, zwei Lichtkegel drehen sich
      var a = t * 4.2;
      c.fillStyle = "#3A1A10"; c.beginPath(); c.arc(0, 0, 0.3 * u, 0, 6.283); c.fill();
      add();
      for (var s2 = 0; s2 < 2; s2++) {
        var aa = a + s2 * Math.PI, L = 3.4 * u, wdt = 0.42, gr = c.createRadialGradient(0, 0, 0, 0, 0, L);
        gr.addColorStop(0, "rgba(255,120,40,.55)"); gr.addColorStop(1, "rgba(255,60,20,0)");
        c.fillStyle = gr; c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, L, aa - wdt, aa + wdt); c.closePath(); c.fill();
      }
      fxGlow(c, 0, 0, 1.2 * u, "255,110,40", 0.5 + 0.3 * Math.abs(Math.sin(a))); fxCore(c, 0, 0, 0.16 * u, "#FFE0C0");
    } else if (def.id === "fxspark") {   // Kabelstück, ab und zu ein Funkenschauer in Drehrichtung (nach oben = 0°)
      c.strokeStyle = "#1A1A1A"; c.lineWidth = Math.max(1, 0.16 * u); c.beginPath(); c.moveTo(0, 0.9 * u); c.quadraticCurveTo(0.3 * u, 0.4 * u, 0, 0); c.stroke();
      c.strokeStyle = "#C87A3A"; c.lineWidth = Math.max(1, 0.06 * u); c.beginPath(); c.moveTo(-0.05 * u, 0); c.lineTo(0.08 * u, -0.08 * u); c.stroke();
      var slot = Math.floor(t * 3), st = t * 3 - slot, burst = fxH(slot, Math.round(ph * 100)) < 0.32;   // etwa jede dritte Drittelsekunde
      if (burst && st < 0.75) {
        add(); var bk = st / 0.75;
        fxGlow(c, 0, 0, (1.4 - bk) * u, "160,200,255", 0.7 * (1 - bk));
        for (var j = 0; j < 14; j++) {
          var ang = -Math.PI / 2 + (fxH(slot * 31 + j, 7) - 0.5) * 2.2, sp = (1.2 + fxH(j, slot) * 2.4) * u, d = sp * bk, gy = 1.2 * u * bk * bk;
          var x = Math.cos(ang) * d, y2 = Math.sin(ang) * d + gy, x0 = Math.cos(ang) * d * 0.8, y0 = Math.sin(ang) * d * 0.8 + gy * 0.64;
          c.strokeStyle = "rgba(255," + (220 - j * 6) + ",150," + (1 - bk) + ")"; c.lineWidth = Math.max(1, 0.06 * u); c.beginPath(); c.moveTo(x0, y0); c.lineTo(x, y2); c.stroke();
        }
      }
    } else if (def.id === "fxsmoke") {   // Rauchschwaden steigen in Drehrichtung (nach oben = 0°), werden größer und blasser
      for (var q = 0; q < 12; q++) {
        var life = 3.2, k2 = ((t + q * life / 12) % life) / life, seed = Math.floor((t + q * life / 12) / life) * 12 + q, dx = (fxH(seed, 3) - 0.5) * 1.2 * u * k2;
        var py = -k2 * 3.2 * u, pr = (0.35 + k2 * 1.2) * u, pa = 0.5 * Math.sin(Math.PI * Math.min(1, k2 * 1.15)) * (1 - k2 * 0.4);
        var gs = c.createRadialGradient(dx, py, 0, dx, py, pr); gs.addColorStop(0, "rgba(170,172,178," + pa + ")"); gs.addColorStop(0.6, "rgba(140,142,148," + (pa * 0.5) + ")"); gs.addColorStop(1, "rgba(120,122,128,0)");
        c.fillStyle = gs; c.beginPath(); c.arc(dx, py, pr, 0, 6.283); c.fill();
      }
    }
    c.restore();
  }
  function fxThumb(id) {
    var cv = document.createElement("canvas"); cv.width = cv.height = 44; var g = cv.getContext("2d"); if (!g || !g.fillRect) return "";
    g.fillStyle = "#0B1018"; g.fillRect(0, 0, 44, 44);
    var it = { a: id, x: 0.3, y: 0.7, r: 0, s: 1 }, R = ENV[id].R, px = 18 / R;
    var tt = id === "fxspark" ? 0.1 : id === "fxblink" ? 0.05 : 1.7;
    if (id === "fxspark") { for (var k = 0; k < 200; k++) { var tm = k / 30, slot = Math.floor(tm * 3); if (fxH(slot, Math.round(fxH(3, 7) * 1000)) < 0.32 && tm * 3 - slot < 0.3) { tt = tm; break; } } it.x = 0.3; it.y = 0.7; }
    fxDraw(g, it, 22, id === "fxsmoke" ? 32 : id === "fxspark" ? 28 : 22, px, 1, tt - fxH(Math.round(it.x * 10), Math.round(it.y * 10)) * 10);
    try { return cv.toDataURL(); } catch (e) { return ""; }
  }
