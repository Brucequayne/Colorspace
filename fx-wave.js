/* WeFX-Effekt „Welle“: verschiebt das Bild zeilen- oder spaltenweise entlang einer Sinuswelle, die durchs Bild läuft.
   Vorlage für neue Effekte: Datei fx-<id>.js anlegen, WeFX.register({...}) aufrufen und die id in FX_FILES in wefx.js eintragen. */
(function () {
  "use strict";
  if (!window.WeFX) return;
  WeFX.register({
    id: "wave",
    name: { de: "Welle", en: "Wave" },
    desc: { de: "Das Bild schwingt in Wellen, wie unter Wasser oder durch heiße Luft.", en: "The image ripples in waves, like under water or through hot air." },
    short: { de: "Bild schwingt in Wellen", en: "Image ripples in waves" },
    icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 8c2.5-3 5-3 7.5 0s5 3 7.5 0 3.5-2 5-1M2 16c2.5-3 5-3 7.5 0s5 3 7.5 0 3.5-2 5-1" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    params: [
      { k: "dir", type: "select", label: { de: "Richtung", en: "Direction" }, def: "h", options: [["h", { de: "Waagerecht", en: "Horizontal" }], ["v", { de: "Senkrecht", en: "Vertical" }], ["both", { de: "Beide", en: "Both" }]] },
      { k: "amp", type: "range", label: { de: "Stärke", en: "Strength" }, def: 30, min: 0, max: 240, unit: " px" },
      { k: "len", type: "range", label: { de: "Wellenlänge", en: "Wavelength" }, def: 260, min: 20, max: 1200, unit: " px" },
      { k: "speed", type: "range", label: { de: "Tempo", en: "Speed" }, def: 1, min: -6, max: 6, step: 0.1, unit: " /s" },
      { k: "edge", type: "select", label: { de: "Rand", en: "Edge" }, def: "wrap", options: [["wrap", { de: "Umlaufen", en: "Wrap" }], ["black", { de: "Schwarz", en: "Black" }]] }
    ],
    // Streifenweise mit drawImage statt Pixel für Pixel: schnell genug für die Vorschau beim Abspielen
    render: function (c) {
      var p = c.p, amp = p.amp * c.scale, len = Math.max(4, p.len * c.scale), ph = c.t * p.speed * Math.PI * 2;
      if (!amp) { c.util.copy(c.src, c.dst); return; }
      var tmp = c.state.tmp && c.state.tmp.width === c.w && c.state.tmp.height === c.h ? c.state.tmp : (c.state.tmp = c.util.canvas(c.w, c.h));
      var hor = p.dir !== "v", ver = p.dir !== "h", src = c.src;
      if (hor) { pass(src, ver ? tmp : c.dst, true); src = tmp; }
      if (ver) pass(src, c.dst, false);
      function pass(from, to, rows) {
        var x = to.getContext("2d"), n = rows ? c.h : c.w, step = Math.max(1, Math.round(2 * c.scale)), W = c.w, H = c.h;
        x.globalCompositeOperation = "source-over"; x.fillStyle = "#000"; x.fillRect(0, 0, W, H);
        for (var i = 0; i < n; i += step) {
          var s = Math.min(step, n - i), off = Math.round(amp * Math.sin((i + s / 2) / len * Math.PI * 2 + ph));
          if (rows) {
            x.drawImage(from, 0, i, W, s, off, i, W, s);
            if (p.edge === "wrap" && off) x.drawImage(from, 0, i, W, s, off > 0 ? off - W : off + W, i, W, s);
          } else {
            x.drawImage(from, i, 0, s, H, i, off, s, H);
            if (p.edge === "wrap" && off) x.drawImage(from, i, 0, s, H, i, off > 0 ? off - H : off + H, s, H);
          }
        }
      }
    }
  });
})();
