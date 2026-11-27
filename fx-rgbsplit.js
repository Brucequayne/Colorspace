/* WeFX-Effekt „RGB-Split“: zieht Rot, Grün und Blau auseinander, wie eine verrutschte Röhre oder ein Glitch. */
(function () {
  "use strict";
  if (!window.WeFX) return;
  function chan(c, key, col, src) {   // ein Farbkanal als eigenes Bild: Original mal reine Kanalfarbe
    var cv = c.state[key] && c.state[key].width === c.w && c.state[key].height === c.h ? c.state[key] : (c.state[key] = c.util.canvas(c.w, c.h)), x = cv.getContext("2d");
    x.globalCompositeOperation = "copy"; x.drawImage(src, 0, 0);
    x.globalCompositeOperation = "multiply"; x.fillStyle = col; x.fillRect(0, 0, c.w, c.h);
    x.globalCompositeOperation = "source-over"; return cv;
  }
  WeFX.register({
    id: "rgbsplit",
    name: { de: "RGB-Split", en: "RGB split" },
    desc: { de: "Rot, Grün und Blau rutschen auseinander. Mit „Zittern“ wird daraus ein lebendiger Glitch.", en: "Red, green and blue slide apart. With “Jitter” it becomes a lively glitch." },
    short: { de: "Farbkanäle verschoben", en: "Colour channels shifted" },
    icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="10" r="5.5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="15" cy="10" r="5.5" fill="none" stroke="currentColor" stroke-width="2" opacity=".7"/><circle cx="12" cy="15" r="5.5" fill="none" stroke="currentColor" stroke-width="2" opacity=".45"/></svg>',
    params: [
      { k: "dist", type: "range", label: { de: "Abstand", en: "Distance" }, def: 14, min: 0, max: 120, unit: " px" },
      { k: "angle", type: "range", label: { de: "Winkel", en: "Angle" }, def: 0, min: 0, max: 360, unit: "°" },
      { k: "jitter", type: "range", label: { de: "Zittern", en: "Jitter" }, def: 0, min: 0, max: 100, unit: " %" },
      { k: "mode", type: "select", label: { de: "Kanäle", en: "Channels" }, def: "rgb", options: [["rgb", { de: "Rot · Blau", en: "Red · blue" }], ["rg", { de: "Rot · Grün", en: "Red · green" }], ["gb", { de: "Grün · Blau", en: "Green · blue" }]] }
    ],
    render: function (c) {
      var p = c.p, d = p.dist * c.scale, a = p.angle * Math.PI / 180;
      if (p.jitter > 0) {   // Zittern: fester Zufall je Frame, damit Vorschau und Export gleich aussehen
        var r = Math.sin(c.frame * 12.9898 + 78.233) * 43758.5453; r -= Math.floor(r);
        var r2 = Math.sin(c.frame * 39.3468 + 11.135) * 43758.5453; r2 -= Math.floor(r2);
        d *= 1 + (r - 0.5) * 2 * p.jitter / 100 * 1.6; a += (r2 - 0.5) * p.jitter / 100 * 1.2;
      }
      var dx = Math.round(Math.cos(a) * d), dy = Math.round(Math.sin(a) * d);
      var R = chan(c, "r", "#ff0000", c.src), G = chan(c, "g", "#00ff00", c.src), B = chan(c, "b", "#0000ff", c.src), x = c.dst.getContext("2d");
      var move = { rgb: [R, B], rg: [R, G], gb: [G, B] }[p.mode] || [R, B];
      x.fillStyle = "#000"; x.fillRect(0, 0, c.w, c.h); x.globalCompositeOperation = "lighter";
      [R, G, B].forEach(function (cv) { var k = cv === move[0] ? 1 : cv === move[1] ? -1 : 0; x.drawImage(cv, dx * k, dy * k); });
      x.globalCompositeOperation = "source-over";
    }
  });
})();
