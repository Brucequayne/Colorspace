/* Rap Streets – art-rapper.js
   Die Rapper: 2D-Figuren von vorn (wie die Crowd, etwas größer), 20 × 34 Pixel, Fußpunkt (10, 31).
   Haltung frei kombinierbar: Mikro-Arm (none, chest, mouth, out, high), freier Arm (down, out, up, high), Beine (s, a, b = Gehen), Wippen.
   Es gibt genau ein Mikro – wer es nicht hat, steht mit Arm "none" da. */
(function () {
  var RS = window.RS, sh = RS.shade, hex = RS.hex;
  RS.RAPPERS = [
    { col: "#D8372C", name: "red", skin: "#7A4E34", top: "#C0302A", top2: "#8E1E1A", pants: "#2E4A7A", shoes: "#C89A50", hat: "cap", hatc: "#141414", chain: "#E8C040" },
    { col: "#3A78E0", name: "blue", skin: "#4A3020", top: "#2E5AB8", top2: "#E8E8E4", pants: "#1E1E22", shoes: "#EDEDEA", hat: "bucket", hatc: "#D8CDB0", stripe: 1 },
    { col: "#3EAA5A", name: "green", skin: "#C08A60", top: "#2E7A3E", top2: "#1A4A26", pants: "#4A4A50", shoes: "#1E1E1E", hat: "beanie", hatc: "#E0A020", chain: "#D8D8DC" },
    { col: "#D8A020", name: "yellow", skin: "#9A6440", top: "#E0A020", top2: "#7A5410", pants: "#2A2A2C", shoes: "#E8E4D8", hat: "durag", hatc: "#1E1E1E", chain: "#E8C040" }
  ];
  var CACHE = {};
  function rgb(c) { return "rgb(" + c.map(Math.round).join(",") + ")"; }
  RS.rapper = function (id, pose, flip) {
    var P = RS.RAPPERS[id % 4], mic = pose.mic || "none", fr = pose.free || "down", legs = pose.legs || "s", bob = pose.bob ? 1 : 0;
    var k = id + ":" + mic + fr + legs + bob + (flip ? 1 : 0); if (CACHE[k]) return CACHE[k];
    var cv = RS.canvas(20, 34), c = cv.ctx;
    function px(x, y, w, h, col) { c.fillStyle = col; c.fillRect(flip ? 20 - x - w : x, y + bob, w, h); }
    var top = P.top, dark = rgb(sh(hex(top), -0.3)), MIC = "#1A1A1A", MICH = "#6A6A70";
    // Beine (Baggy) und Schuhe; beim Gehen wird abwechselnd ein Bein angehoben
    var la = legs === "a" ? 2 : 0, lb = legs === "b" ? 2 : 0;
    px(7, 22, 3, 7 - la, P.pants); px(10, 22, 3, 7 - lb, P.pants); px(6, 24, 1, 5 - la, P.pants); px(13, 24, 1, 5 - lb, P.pants);
    px(6, 29 - la - bob, 4, 2, P.shoes); px(10, 29 - lb - bob, 4, 2, P.shoes);
    // Oberkörper
    px(6, 12, 8, 11, top); px(6, 12, 1, 11, dark); px(8, 18, 4, 2, dark);
    if (P.stripe) { px(6, 12, 1, 11, P.top2); px(13, 12, 1, 11, P.top2); }
    if (P.chain) { px(8, 13, 4, 1, P.chain); px(9, 14, 2, 1, P.chain); px(9, 15, 2, 2, P.chain); }
    // Freier Arm (im Bild rechts)
    if (fr === "out") { px(14, 12, 2, 3, top); px(15, 12, 3, 2, top); px(18, 12, 2, 2, P.skin); }
    else if (fr === "up") { px(14, 10, 2, 4, top); px(15, 7, 2, 4, top); px(16, 5, 2, 2, P.skin); }
    else if (fr === "high") { px(14, 5, 2, 8, top); px(14, 3, 2, 2, P.skin); }
    else { px(14, 12, 2, 8, top); px(14, 20, 2, 2, P.skin); }
    // Kopf
    px(8, 6, 4, 6, P.skin); px(7, 7, 1, 4, P.skin); px(12, 7, 1, 4, P.skin);
    px(8, 8, 1, 1, "#141414"); px(11, 8, 1, 1, "#141414");
    if (P.hat === "cap") { px(7, 4, 6, 2, P.hatc); px(7, 6, 1, 1, P.hatc); px(9, 4, 2, 1, "#C0302A"); }
    else if (P.hat === "bucket") { px(7, 3, 6, 3, P.hatc); px(6, 6, 8, 1, P.hatc); }
    else if (P.hat === "beanie") { px(7, 3, 6, 3, P.hatc); px(7, 5, 6, 1, rgb(sh(hex(P.hatc), -0.3))); }
    else { px(7, 4, 6, 2, P.hatc); px(12, 6, 2, 3, P.hatc); }
    // Mikro-Arm (im Bild links)
    if (mic === "mouth") { px(4, 12, 2, 4, top); px(5, 10, 2, 3, top); px(6, 9, 2, 2, P.skin); px(7, 11, 1, 2, MIC); px(8, 9, 2, 2, MICH); }
    else if (mic === "chest") { px(4, 12, 2, 6, top); px(6, 16, 2, 2, top); px(7, 15, 2, 2, P.skin); px(8, 12, 1, 3, MIC); px(7, 11, 2, 2, MICH); }
    else if (mic === "out") { px(4, 12, 2, 3, top); px(1, 12, 3, 2, top); px(0, 11, 2, 2, P.skin); px(0, 9, 1, 2, MIC); px(0, 7, 2, 2, MICH); }
    else if (mic === "high") { px(4, 5, 2, 8, top); px(4, 3, 2, 2, P.skin); px(4, 1, 2, 2, MICH); }
    else { px(4, 12, 2, 8, top); px(4, 20, 2, 2, P.skin); }
    var res = { cv: cv, ax: 10, ay: 31 }; CACHE[k] = res; return res;
  };
})();
