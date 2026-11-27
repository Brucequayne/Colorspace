/* WeFX-Effekt „Pixel“: setzt das Bild aus groben Blöcken oder Rasterpunkten zusammen. */
(function () {
  "use strict";
  if (!window.WeFX) return;
  WeFX.register({
    id: "pixelate",
    name: { de: "Pixel", en: "Pixel" },
    desc: { de: "Grobe Pixelblöcke oder ein Punktraster wie im Zeitungsdruck.", en: "Coarse pixel blocks or a dot grid like newspaper print." },
    short: { de: "Blöcke oder Punktraster", en: "Blocks or dot grid" },
    icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="currentColor"><rect x="3" y="3" width="8" height="8"/><rect x="13" y="13" width="8" height="8"/><rect x="13" y="3" width="8" height="8" opacity=".5"/><rect x="3" y="13" width="8" height="8" opacity=".5"/></g></svg>',
    params: [
      { k: "shape", type: "select", label: { de: "Form", en: "Shape" }, def: "block", options: [["block", { de: "Blöcke", en: "Blocks" }], ["dot", { de: "Punkte", en: "Dots" }]] },
      { k: "size", type: "range", label: { de: "Größe", en: "Size" }, def: 16, min: 2, max: 160, unit: " px" },
      { k: "gap", type: "range", label: { de: "Punktgröße nach Helligkeit", en: "Dot size by brightness" }, def: 60, min: 0, max: 100, unit: " %" }
    ],
    render: function (c) {
      var p = c.p, bs = Math.max(1, p.size * c.scale), sw = Math.max(1, Math.round(c.w / bs)), sh = Math.max(1, Math.round(c.h / bs));
      var sm = c.state.sm && c.state.sm.width === sw && c.state.sm.height === sh ? c.state.sm : (c.state.sm = c.util.canvas(sw, sh)), sx = sm.getContext("2d", { willReadFrequently: true });
      sx.imageSmoothingEnabled = true; sx.imageSmoothingQuality = "medium"; sx.drawImage(c.src, 0, 0, sw, sh);
      var x = c.dst.getContext("2d");
      if (p.shape === "block") { x.imageSmoothingEnabled = false; x.drawImage(sm, 0, 0, c.w, c.h); x.imageSmoothingEnabled = true; return; }
      // Punkte: je Zelle ein Kreis in ihrer Farbe, auf Wunsch größer, je heller die Zelle
      var d = sx.getImageData(0, 0, sw, sh).data, cw = c.w / sw, ch = c.h / sh, r0 = Math.min(cw, ch) / 2, k = p.gap / 100;
      x.fillStyle = "#000"; x.fillRect(0, 0, c.w, c.h);
      for (var y = 0; y < sh; y++) for (var xx = 0; xx < sw; xx++) {
        var i = (y * sw + xx) * 4, lum = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255, r = r0 * (1 - k + k * Math.sqrt(lum)) * 1.04;
        if (r < 0.4) continue;
        x.fillStyle = "rgb(" + d[i] + "," + d[i + 1] + "," + d[i + 2] + ")"; x.beginPath(); x.arc((xx + 0.5) * cw, (y + 0.5) * ch, r, 0, Math.PI * 2); x.fill();
      }
    }
  });
})();
