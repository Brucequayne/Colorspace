/* WeFX-Effekt „Color Blur“: simuliert Bewegungsunschärfe für eine Farbe.
   Alles, was im Bild die gewählte Farbe hat, hinterlässt einen Schweif aus den vorigen Frames.

   So funktioniert es, Frame für Frame:
   1. Maske: Jeder Bildpunkt wird mit der Pipettenfarbe verglichen (Farbabstand in Lab). Gerechnet wird auf einem
      kleinen Raster, beim Hochskalieren wird die Maske von selbst weich.
   2. Schweif: Ein eigenes Bild (state.T) merkt sich alles, was vorher maskiert war. Es wird jeden Frame etwas
      blasser (Länge), etwas unschärfer und breiter (Lebendigkeit), verwirbelt (Turbulenz) und verschoben (Drift).
   3. Glättung: Zwischen der alten und der neuen Lage der Farbfläche werden Zwischenbilder gestempelt. So entsteht
      auch bei schnellen Bewegungen ein durchgehender Streifen statt einzelner Kopien.
   4. Ausgabe: Schweif über das Bild, das Objekt selbst bleibt scharf obendrauf. */
(function () {
  "use strict";
  if (!window.WeFX) return;

  // sRGB -> Lab, mit Tabelle für die Linearisierung
  var LIN = (function () { var a = new Float32Array(256); for (var i = 0; i < 256; i++) { var c = i / 255; a[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); } return a; })();
  function lab(r, g, b, o) {
    var R = LIN[r], G = LIN[g], B = LIN[b];
    var X = (0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047, Y = 0.2126 * R + 0.7152 * G + 0.0722 * B, Z = (0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883;
    var fx = X > 0.008856 ? Math.cbrt(X) : 7.787 * X + 0.138, fy = Y > 0.008856 ? Math.cbrt(Y) : 7.787 * Y + 0.138, fz = Z > 0.008856 ? Math.cbrt(Z) : 7.787 * Z + 0.138;
    o[0] = 116 * fy - 16; o[1] = 500 * (fx - fy); o[2] = 200 * (fy - fz); return o;
  }
  function hexRgb(h) { var n = parseInt(String(h || "#000000").slice(1, 7), 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function cv(c, key, w, h) { var s = c.state; if (!s[key] || s[key].width !== w || s[key].height !== h) s[key] = c.util.canvas(w, h); return s[key]; }

  WeFX.register({
    id: "colorblur",
    name: { de: "Color Blur", en: "Color Blur" },
    desc: { de: "Bewegungsunschärfe für eine Farbe: Alles in der Pipettenfarbe zieht einen Schweif aus den vorigen Frames hinter sich her. Der Schweif entsteht beim Abspielen und im Export.", en: "Motion blur for one colour: everything in the picked colour drags a trail from the previous frames behind it. The trail builds up during playback and in the export." },
    short: { de: "Schweif hinter einer Farbe", en: "Trail behind one colour" },
    icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="17" cy="12" r="4.5" fill="currentColor"/><path d="M2 12h9M4 8h7M4 16h7" stroke="currentColor" stroke-width="2" opacity=".55"/></svg>',
    params: [
      { k: "key", type: "pick", label: { de: "Farbe", en: "Colour" }, def: "#D9442E" },
      { k: "tol", type: "range", label: { de: "Toleranz", en: "Tolerance" }, def: 22, min: 2, max: 80 },
      { k: "soft", type: "range", label: { de: "Weiche Kante der Farbe", en: "Colour edge softness" }, def: 35, min: 0, max: 100, unit: " %" },
      { k: "len", type: "range", label: { de: "Länge", en: "Length" }, def: 18, min: 2, max: 120, unit: " Frames" },
      { k: "amt", type: "range", label: { de: "Intensität", en: "Intensity" }, def: 85, min: 0, max: 100, unit: " %" },
      { k: "life", type: "range", label: { de: "Lebendigkeit", en: "Liveliness" }, def: 25, min: 0, max: 100, unit: " %", hint: { de: "0 = schmale Spur wie ein Kondensstreifen, 100 = breitet sich aus wie Rauch", en: "0 = narrow track like a contrail, 100 = spreads like smoke" } },
      { k: "turb", type: "range", label: { de: "Turbulenz", en: "Turbulence" }, def: 0, min: 0, max: 100, unit: " %" },
      { k: "drift", type: "range", label: { de: "Drift (Wind)", en: "Drift (wind)" }, def: 0, min: 0, max: 100, unit: " %" },
      { k: "dang", type: "range", label: { de: "Drift-Richtung", en: "Drift direction" }, def: 270, min: 0, max: 360, unit: "°" },
      { k: "smooth", type: "range", label: { de: "Glättung (Zwischenbilder)", en: "Smoothing (in-betweens)" }, def: 8, min: 0, max: 24 },
      { k: "col", type: "select", label: { de: "Farbe des Schweifs", en: "Trail colour" }, def: "orig", options: [["orig", { de: "Original", en: "Original" }], ["tint", { de: "Eigene", en: "Custom" }], ["rainbow", { de: "Regenbogen", en: "Rainbow" }]] },
      { k: "tint", type: "color", label: { de: "Eigene Farbe", en: "Custom colour" }, def: "#F87666" },
      { k: "blend", type: "select", label: { de: "Mischung", en: "Blend" }, def: "normal", options: [["normal", { de: "Normal", en: "Normal" }], ["screen", { de: "Aufhellen", en: "Screen" }], ["glow", { de: "Leuchten", en: "Glow" }]] },
      { k: "obj", type: "check", label: { de: "Objekt scharf obendrauf", en: "Keep object sharp on top" }, def: true }
    ],
    render: function (c) {
      var p = c.p, w = c.w, h = c.h, s = c.state, sc = c.scale, U = c.util;
      // ---- 1. Maske auf kleinem Raster ----
      var sw = Math.max(48, Math.round(w / 4)), sh = Math.max(27, Math.round(sw * h / w));
      var small = cv(c, "small", sw, sh), sx = small.getContext("2d", { willReadFrequently: true });
      sx.imageSmoothingQuality = "medium"; sx.drawImage(c.src, 0, 0, sw, sh);
      var img = sx.getImageData(0, 0, sw, sh), d = img.data, kc = hexRgb(p.key), K = lab(kc[0], kc[1], kc[2], [0, 0, 0]), L = [0, 0, 0];
      var t0 = p.tol, e = Math.max(0.5, p.tol * p.soft / 100), lo = t0 - e, hi = t0 + e, mx = 0, my = 0, mw = 0;
      var mk = cv(c, "mk", sw, sh), mkx = mk.getContext("2d"), mimg = s.mimg && s.mimg.width === sw && s.mimg.height === sh ? s.mimg : (s.mimg = mkx.createImageData(sw, sh)), md = mimg.data;
      for (var y = 0, i = 0; y < sh; y++) for (var x = 0; x < sw; x++, i += 4) {
        lab(d[i], d[i + 1], d[i + 2], L);
        var dl = L[0] - K[0], da = L[1] - K[1], db = L[2] - K[2], dist = Math.sqrt(dl * dl * 0.5 + da * da + db * db);
        var a = dist <= lo ? 1 : dist >= hi ? 0 : 1 - (dist - lo) / (hi - lo); a = a * a * (3 - 2 * a);
        md[i] = md[i + 1] = md[i + 2] = 255; md[i + 3] = Math.round(a * 255);
        if (a > 0.05) { mx += x * a; my += y * a; mw += a; }
      }
      mkx.putImageData(mimg, 0, 0);
      // maskiertes aktuelles Bild in voller Größe
      var M = cv(c, "M", w, h), Mx = M.getContext("2d");
      Mx.globalCompositeOperation = "copy"; Mx.drawImage(c.src, 0, 0);
      Mx.globalCompositeOperation = "destination-in"; Mx.imageSmoothingEnabled = true; Mx.imageSmoothingQuality = "high"; Mx.drawImage(mk, 0, 0, w, h);
      Mx.globalCompositeOperation = "source-over";
      var cen = mw > sw * sh * 0.0004 ? { x: mx / mw * w / sw, y: my / mw * h / sh } : null;

      // Schweif einfärben (nur für die Stempel, das Objekt bleibt im Original)
      var stamp = M;
      if (p.col !== "orig") {
        var Tn = cv(c, "Tn", w, h), tx = Tn.getContext("2d");
        tx.globalCompositeOperation = "copy"; tx.drawImage(M, 0, 0);
        tx.globalCompositeOperation = "source-in";
        tx.fillStyle = p.col === "tint" ? p.tint : "hsl(" + Math.round((c.t * 90) % 360) + ",95%,60%)";
        tx.fillRect(0, 0, w, h); tx.globalCompositeOperation = "source-over"; stamp = Tn;
      }

      // ---- 2. Schweif fortschreiben ----
      var T = cv(c, "T", w, h), T2 = cv(c, "T2", w, h);
      if (!c.cont && !c.same) { T.getContext("2d").clearRect(0, 0, w, h); s.prev = null; }
      if (!c.same) {
        var gap = Math.max(1, Math.min(4, c.gap || 1)), keep = Math.pow(0.03, gap / Math.max(1, p.len));
        var blur = p.life / 100 * 5 * sc * Math.sqrt(gap), dr = p.drift / 100 * 14 * sc * gap, ang = p.dang * Math.PI / 180;
        var t2 = T2.getContext("2d"); t2.clearRect(0, 0, w, h);
        t2.globalAlpha = keep; t2.filter = blur > 0.2 ? "blur(" + blur.toFixed(2) + "px)" : "none";
        // Rauch wird mit dem Alter breiter: leicht vom eigenen Schwerpunkt weg skalieren
        var grow = 1 + p.life / 100 * 0.012 * gap;
        if (grow > 1.0001 && s.prev) { t2.translate(s.prev.x, s.prev.y); t2.scale(grow, grow); t2.translate(-s.prev.x, -s.prev.y); }
        t2.drawImage(T, Math.cos(ang) * dr / grow, Math.sin(ang) * dr / grow);
        t2.setTransform(1, 0, 0, 1, 0, 0); t2.filter = "none"; t2.globalAlpha = 1;
        var cur = T2, other = T;
        if (p.turb > 0) {   // Turbulenz: Streifen wellig gegeneinander versetzen, wirkt sich mit jedem Frame stärker aus
          var ox = other.getContext("2d"); ox.clearRect(0, 0, w, h);
          var amp = p.turb / 100 * 6 * sc * gap, st = Math.max(2, Math.round(6 * sc)), ph = c.frame * 0.37;
          for (var yy = 0; yy < h; yy += st) {
            var off = amp * (Math.sin(yy / (60 * sc) + ph) + 0.6 * Math.sin(yy / (23 * sc) - ph * 1.7));
            ox.drawImage(cur, 0, yy, w, st, off, yy - amp * 0.3 * Math.cos(yy / (41 * sc) + ph), w, st);
          }
          cur = other; other = T2;
        }
        // Zwischenbilder zwischen alter und neuer Lage der Farbfläche
        var cx2 = cur.getContext("2d");
        if (cen && s.prev && p.smooth > 0) {
          var ddx = s.prev.x - cen.x, ddy = s.prev.y - cen.y, dist2 = Math.hypot(ddx, ddy);
          if (dist2 > 1.5 * sc && dist2 < w * 0.4) {
            var n = Math.min(p.smooth, Math.ceil(dist2 / (2.5 * sc)));
            for (var j = n; j >= 1; j--) { var f = j / (n + 1); cx2.globalAlpha = 0.35 + 0.65 * Math.pow(keep, f); cx2.drawImage(stamp, ddx * f, ddy * f); }
            cx2.globalAlpha = 1;
          }
        }
        cx2.drawImage(stamp, 0, 0);
        if (cur !== T) { s.T = cur; s.T2 = T; T = cur; }
        if (cen) s.prev = cen;
      }
      // ---- 3. Ausgabe ----
      var o = c.dst.getContext("2d");
      o.globalCompositeOperation = "copy"; o.drawImage(c.src, 0, 0);
      o.globalCompositeOperation = p.blend === "glow" ? "lighter" : p.blend === "screen" ? "screen" : "source-over";
      o.globalAlpha = p.amt / 100; o.drawImage(T, 0, 0); o.globalAlpha = 1;
      o.globalCompositeOperation = "source-over";
      if (p.obj) o.drawImage(M, 0, 0);
    }
  });
})();
