  // ===== 00-kopf.js · Kopf: Version, Rastermaße, Sprache, kleine Helfer =====
/* Space Rogue 0.1 – Schiffseditor und Testflug. Für Color Space.
   Top-down wie FTL, modulare Bauteile wie Space Engineers. Alles läuft im Browser.
   Raster: 1 Zelle = 2,5 m. Vorne ist oben (−y). Drehung r: 0…3 im Uhrzeigersinn, f: gespiegelt. */
(function () {
  "use strict";

  var VERSION = "0.55";
  var CELL_M = 2.5, PX = 24;              // Meter je Zelle, Pixel je Zelle bei Zoom 1
  var lang = "de";
  function L2(de, en) { return { de: de, en: en }; }
  function t(k) { var v = TX[k]; return v ? v[lang] : k; }
  function fmt(s, o) { return s.replace(/\{(\w+)\}/g, function (m, k) { return o[k] !== undefined ? o[k] : m; }); }
  function nf(v, d) { return Number(v).toLocaleString(lang === "de" ? "de-DE" : "en-GB", { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }

