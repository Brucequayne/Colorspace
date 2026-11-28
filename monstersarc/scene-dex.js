/* Monsters Arc – scene-dex.js (seit v0.25)
   Monsterliste im Spiel (Hauptmenü → Monsterliste): alle Monster aus der Liste nach Nummer, links als Raster,
   rechts die Karte des gewählten Monsters mit Vorder- und Rückansicht, Elementen, Größe, Gewicht, Entwicklung,
   Kampfwerten (Lv 1 / Lv 50 / Lv 100) und Schrei. Daten aus monsters.js (Browser-Liste bzw. monsters/liste.js). */
(function () {
  var MA = window.MA, L2 = MA.L2, MO = MA.monsters;
  var S = { sel: null, el: null };

  MA.EDITOR_CSS = (MA.EDITOR_CSS || "") +
    ".ma-dex{position:absolute;inset:0;display:grid;grid-template-columns:minmax(0,1fr) minmax(280px,38%);background:#1C1D1C;color:#E4E0D8;font:13px/1.4 var(--f-body,system-ui)}" +
    ".ma-dex .l{display:flex;flex-direction:column;min-height:0;border-right:1px solid #3A3C3A}.ma-dex .hd{display:flex;align-items:center;gap:12px;padding:12px 14px;border-bottom:1px solid #3A3C3A}" +
    ".ma-dex .hd h2{margin:0;font:600 1.05rem/1 var(--f-body,system-ui)}.ma-dex .hd span{color:#ACA89F;font-size:.8rem}.ma-dex .hd button{margin-left:auto}" +
    ".ma-dex button{font:inherit;color:#E4E0D8;background:#2A2C2B;border:1px solid #434543;border-radius:0;padding:6px 10px;cursor:pointer}.ma-dex button:hover{border-color:#C6C5B9}" +
    ".ma-dex .grid{flex:1;overflow-y:auto;padding:10px;display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:6px;align-content:start;scrollbar-width:thin}" +
    ".ma-dex .grid button{display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px 4px;background:#232524}.ma-dex .grid button[aria-pressed=true]{border-color:#ED6A5E;background:#2A2221}" +
    ".ma-dex .grid img{width:64px;height:64px;image-rendering:pixelated;object-fit:contain}.ma-dex .grid small{color:#ACA89F;font-size:.68rem}.ma-dex .grid b{font-weight:600;font-size:.78rem;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
    ".ma-dex .r{overflow-y:auto;padding:14px 16px;scrollbar-width:thin}.ma-dex .pics{display:flex;gap:10px;justify-content:center;background:linear-gradient(#C8DCC8,#98B888);padding:10px;margin:8px 0}" +
    ".ma-dex .pics div{display:flex;flex-direction:column;align-items:center;gap:4px;color:#2A3A2A;font-size:.7rem;min-width:0;flex:1 1 0}.ma-dex .pics img{image-rendering:pixelated;width:100%;max-width:176px;height:auto;aspect-ratio:1}" +
    ".ma-dex .cmp{background:linear-gradient(#C8DCC8,#98B888);margin:0 0 8px;padding:4px 0 0}.ma-dex .cmp img{display:block;width:100%;max-width:400px;margin:0 auto;aspect-ratio:200/110;image-rendering:pixelated}.ma-dex .cmp small{display:block;text-align:center;color:#2A3A2A;font-size:.68rem;padding:0 0 4px}" +
    ".ma-dex h3{margin:0;font:600 1.2rem/1.2 var(--f-body,system-ui)}.ma-dex .no{color:#ACA89F}.ma-dex .els{display:flex;gap:4px;margin:6px 0}.ma-dex .els span{padding:2px 8px;font-size:.72rem;font-weight:600;color:#1C1D1C}" +
    ".ma-dex dl{display:grid;grid-template-columns:auto 1fr;gap:3px 12px;margin:8px 0;font-size:.8rem}.ma-dex dt{color:#ACA89F}.ma-dex dd{margin:0}" +
    ".ma-dex .bar{display:grid;grid-template-columns:86px 1fr 96px;gap:8px;align-items:center;font-size:.76rem;margin:3px 0}.ma-dex .bar i{display:block;height:8px;background:#2E302E;position:relative}" +
    ".ma-dex .bar i em{position:absolute;left:0;top:0;bottom:0;background:#62929E}.ma-dex .bar i u{position:absolute;left:0;top:0;bottom:0;background:#ED6A5E}.ma-dex .bar span{color:#C6C5B9;text-align:right;font-variant-numeric:tabular-nums}" +
    ".ma-dex .empty{padding:24px;color:#ACA89F;line-height:1.6}";

  function pad(n) { return ("00" + n).slice(-3); }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function img(m, view, sc) {
    if (m.img && m.img[view]) return '<img alt="" src="' + m.img[view] + '" width="' + m.img.w * sc + '" height="' + m.img.w * sc + '">';   // Bild aus dem 3D-Editor (seit v0.26)
    var c = MO.render(m, view); return '<img alt="" src="' + c.toDataURL() + '" width="' + c.width * sc + '" height="' + c.height * sc + '">'; }

  function detail() {
    var m = MO.byId(S.sel), r = S.el.querySelector(".r");
    if (!m) { r.innerHTML = '<div class="empty">' + L2("Wähle links ein Monster.", "Pick a monster on the left.") + '</div>'; return; }
    var sc = 1, pre = m.pre && MO.byId(m.pre), evo = m.evo && MO.byId(m.evo);
    var h = '<div class="no">#' + pad(m.no) + '</div><h3>' + esc(m.name || "?") + '</h3><div class="els">' +
      [m.el[0], m.el[1]].filter(function (e) { return e >= 0; }).map(function (e) { return '<span style="background:' + MO.EL_COL[e] + '">' + MO.elName(e) + '</span>'; }).join("") + '</div>' +
      '<div class="pics"><div>' + img(m, "front", sc) + L2("vorne", "front") + '</div><div>' + img(m, "back", sc) + L2("hinten", "back") + '</div></div>' +
      '<div class="cmp"><img alt="" data-o="cmp"><small>' + L2("Größenvergleich mit einem 1,50 m großen Menschen", "Size compared with a 1.50 m tall person") + '</small></div>' +
      '<button type="button" data-a="cry">' + L2("Schrei abspielen", "Play cry") + '</button>' +
      '<dl><dt>' + L2("Größe", "Height") + '</dt><dd>' + m.h.toLocaleString("de-DE") + ' m</dd><dt>' + L2("Gewicht", "Weight") + '</dt><dd>' + m.kg.toLocaleString("de-DE") + ' kg</dd>' +
      '<dt>' + L2("Entwicklung", "Evolution") + '</dt><dd>' + ([pre ? L2("aus ", "from ") + esc(pre.name) + " (Lv " + pre.evoLvl + ")" : "", evo ? L2("zu ", "into ") + esc(evo.name) + " (Lv " + m.evoLvl + ")" : ""].filter(Boolean).join(" · ") || "–") + '</dd></dl>';
    var mx = 1; MO.STATS.forEach(function (s) { mx = Math.max(mx, MO.statAt(m.stats[s.k], 100)); });
    MO.STATS.forEach(function (s) {
      var v = m.stats[s.k], a = MO.statAt(v, 1), c = MO.statAt(v, 100);
      h += '<div class="bar"><b style="font-weight:500">' + L2(s.de, s.en) + '</b><i><u style="width:' + (c / mx * 100) + '%"></u><em style="width:' + (a / mx * 100) + '%"></em></i><span>' + a + ' → ' + c + '</span></div>';
    });
    h += '<div style="font-size:.7rem;color:#8E8A82;margin-top:4px">' + L2("blau = Level 1, rot = Level 100", "blue = level 1, red = level 100") + '</div>';
    r.innerHTML = h;
    // Größenvergleich: Bild laden, dann neben die Silhouette zeichnen (seit v0.28)
    var ci = r.querySelector("img[data-o=cmp]"), id = m.id, src = m.img ? m.img.side || m.img.front : MO.render(m, "front").toDataURL(), im = new Image();
    im.onload = function () { if (S.sel === id && ci.isConnected) ci.src = MO.compareCanvas(im, m.h, 200, 110).toDataURL(); };
    im.src = src;
  }
  function build() {
    var list = MO.sorted();
    if (!S.sel && list.length) S.sel = list[0].id;
    var h = '<div class="ma-dex"><div class="l"><div class="hd"><h2>' + L2("Monsterliste", "Monster list") + '</h2><span>' + list.length + ' Monster</span><button type="button" data-a="back">← ' + (MA.dexFrom === "devkit" ? L2("Zurück zum Editor", "Back to the editor") : L2("Hauptmenü", "Main menu")) + '</button></div><div class="grid">';
    if (!list.length) h += '<div class="empty">' + L2("Noch keine Monster. Im Dev-Kit → Monster-Editor ein Monster bauen und „In Liste speichern“ drücken.", "No monsters yet. Build one in the dev kit → monster editor and press “Save to list”.") + '</div>';
    list.forEach(function (m) { h += '<button type="button" data-id="' + m.id + '" aria-pressed="' + (m.id === S.sel) + '">' + img(m, "front", 1).replace(/width="\d+" height="\d+"/, "") + '<small>#' + pad(m.no) + '</small><b>' + esc(m.name || "?") + '</b></button>'; });
    h += '</div></div><div class="r"></div></div>';
    MA.main.ui.innerHTML = h; S.el = MA.main.ui.firstChild;
    S.el.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      if (b.dataset.a === "back") { back(); return; }
      if (b.dataset.a === "cry") { var m = MO.byId(S.sel); if (m) MO.playCry(m); return; }
      if (b.dataset.id) { S.sel = b.dataset.id; Array.prototype.forEach.call(S.el.querySelectorAll(".grid button"), function (q) { q.setAttribute("aria-pressed", q.dataset.id === S.sel); }); detail(); var mm = MO.byId(S.sel); if (mm) MO.playCry(mm); }
    });
    detail();
  }
  function back() { var to = MA.dexFrom || "menu"; MA.dexFrom = null; MA.main.go(to); }   // aus dem Monster-Editor (Taste L) geht es dorthin zurück (seit v0.26.4)
  MA.scenes.dex = {
    enter: function () { build(); },
    exit: function () { MA.main.ui.innerHTML = ""; },
    update: function () { if (MA.input.hit("Escape") || (MA.dexFrom && MA.input.hit("l"))) back(); },
    render: function (ctx) { ctx.fillStyle = "#1C1D1C"; ctx.fillRect(0, 0, MA.W, MA.H); }
  };
})();
