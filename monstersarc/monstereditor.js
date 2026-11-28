/* Monsters Arc – monstereditor.js (seit v0.25, 3D-Baukasten seit v0.26)
   Monster-Editor im Dev-Kit. Reiter: Bauen (3D), Allgemein, Farben, Werte, Klang, Attacken (folgt später).
   Bauen (Prinzip „Spore“, 3D-Rechnung in monster3d.js):
   - Formen: Wirbel und Schädelknoten ziehen, Mausrad auf einem Punkt = dicker/dünner, Shift + Mausrad = breiter/schmaler,
     „+“ an Schwanz, Hals und Schnauze verlängert, Rechtsklick entfernt einen Punkt.
   - Glieder: Vorlage wählen (nach Zahl der Gelenke), auf den Körper klicken. Gelenke ziehen (die folgenden Gelenke
     ziehen mit), Mausrad auf einem Gelenk = Dicke bis zum nächsten Gelenk. Rechtsklick entfernt das Glied.
   - Stempel: Augen, Münder, Zacken/Flügel, Füße, Hände aufsetzen; vor dem Bestätigen verschieben (ziehen),
     skalieren (Mausrad), drehen (Q/E), neigen (R/T). Füße und Hände rasten an Gliedenden ein.
   - Pinsel: Oberfläche (Haut, Fell, Stein, Feder) oder Farbe aufmalen, oder für den ganzen Körper setzen.
   Kamera: Mausrad gedrückt + ziehen (oder Alt + linke Maustaste, oder Ziehen auf leerer Fläche) dreht, Shift + Mausrad
   gedrückt verschiebt, Mausrad auf leerer Fläche zoomt, Pfeiltasten drehen, F zentriert. Symmetrie an/aus.
   „Zur Liste hinzufügen“: Foto vorne → Foto hinten (jeweils frei drehen) → Nachzeichnen mit Stift/Pipette → speichern.
   Danach kann man aus demselben Modell direkt die Entwicklung formen und ebenfalls hinzufügen.
   Arbeitsstand: localStorage `monstersarc.monster.draft.v2`. Eingebunden von devkit.js (Reiter „monsters“). */
(function () {
  var MA = window.MA, L2 = MA.L2, MO = MA.monsters, D = MA.m3d, V = D.v, DKEY = "monstersarc.monster.draft.v2";
  var BW = 240, BH = 136, K = 2, S = null;   // 3D-Ansicht: Pufferpixel BW × BH, ×K auf 480 × 272. Auflösung einstellbar 16–256 px Monsterhöhe (seit v0.26.3), siehe setRes

  MA.EDITOR_CSS = (MA.EDITOR_CSS || "") +
    ".ma-me .seg{display:grid;gap:3px;margin:3px 0 6px}.ma-me .seg.c2{grid-template-columns:repeat(2,1fr)}.ma-me .seg.c3{grid-template-columns:repeat(3,1fr)}.ma-me .seg.c4{grid-template-columns:repeat(4,1fr)}.ma-me .seg.c5{grid-template-columns:repeat(5,1fr)}" +
    ".ma-me .seg button{padding:5px 2px;font-size:.72rem;min-width:0}.ma-ed .ma-me button[disabled]{opacity:.38;cursor:default}" +
    ".ma-me .tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:3px;margin:10px 0 8px}.ma-me .tabs button{padding:6px 2px;font-size:.74rem}" +
    ".ma-me h4{margin:10px 0 3px;font:600 .72rem/1.2 var(--f-body,system-ui);color:#ACA89F}" +
    ".ma-me .ma-ed-row label{flex:0 0 86px}.ma-me .ma-ed-row output{flex:0 0 40px;text-align:right;font-variant-numeric:tabular-nums}" +
    ".ma-me input[type=text],.ma-me input[type=number],.ma-me select{flex:1;min-width:0;background:#141514;color:#E4E0D8;border:1px solid #434543;padding:4px 6px;font:inherit;font-size:.8rem;border-radius:0}" +
    ".ma-me .big{width:100%;padding:8px;margin:6px 0;background:#ED6A5E;color:#1C1D1C;border-color:#ED6A5E;font-weight:600}.ma-ed .ma-me .big:hover{background:#F08478}" +
    ".ma-me .row3{display:grid;grid-template-columns:repeat(3,1fr);gap:3px;margin:3px 0}.ma-me .row2{display:grid;grid-template-columns:1fr 1fr;gap:3px;margin:3px 0}.ma-me .row3 button,.ma-me .row2 button{padding:5px 2px;font-size:.74rem}" +
    ".ma-me .msg{font-size:.74rem;line-height:1.4;color:#9BC78B;min-height:1.2em;margin:2px 0}.ma-me .msg.bad{color:#ED9A8E}.ma-me .hint{color:#8E8A82;font-size:.72rem;line-height:1.45;margin:3px 0}" +
    ".ma-me .grid{display:grid;grid-template-columns:repeat(5,1fr);gap:3px;margin:4px 0}.ma-me .grid.c4{grid-template-columns:repeat(4,1fr)}" +
    ".ma-me .grid button{height:52px;padding:1px;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;font-size:.54rem;line-height:1.05;overflow:hidden;gap:1px}" +
    ".ma-me .grid img{image-rendering:pixelated;width:38px;height:38px;object-fit:contain}.ma-me .grid.c4 button{height:62px}.ma-me .grid.c4 img{width:46px;height:46px}" +
    ".ma-me .colr{display:grid;grid-template-columns:34px 1fr 70px;gap:6px;align-items:center;margin:3px 0;font-size:.78rem}.ma-me .colr input[type=color]{width:34px;height:26px;padding:0;border:1px solid #434543;background:none;cursor:pointer}.ma-me .colr code{color:#8E8A82;font-size:.7rem}" +
    ".ma-me .pals{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin:6px 0}.ma-me .pals button{height:22px;padding:0;display:flex;border:1px solid #434543}.ma-me .pals span{flex:1;height:100%}" +
    ".ma-me .st{margin:6px 0 8px;padding-bottom:6px;border-bottom:1px solid #2E302E}.ma-me .st b{display:flex;justify-content:space-between;font-size:.76rem;color:#E4E0D8;font-weight:600}.ma-me .st b i{font-style:normal;color:#ACA89F;font-weight:400;font-variant-numeric:tabular-nums}" +
    ".ma-me .st .ma-ed-row label{flex:0 0 70px;font-size:.72rem}.ma-me .tot{font-size:.76rem;color:#C6C5B9;margin:4px 0}" +
    ".ma-me img.cmp{display:block;width:100%;aspect-ratio:200/110;image-rendering:pixelated;background:linear-gradient(#C8DCC8,#98B888);margin:4px 0}" +
    ".ma-me .box{border:1px solid #62929E;background:#1E2A2C;padding:8px;margin:8px 0;font-size:.76rem;line-height:1.45;color:#C6D8DA}.ma-me .box b{color:#E4E0D8}" +
    ".ma-me .sw{display:grid;grid-template-columns:repeat(8,1fr);gap:2px;margin:4px 0}.ma-me .sw button{height:18px;padding:0;border:1px solid #434543}.ma-me .sw button[aria-pressed=true]{outline:2px solid #ED6A5E;outline-offset:-1px}" +
    ".ma-me kbd{font:inherit;font-size:.68rem;border:1px solid #434543;padding:0 3px;color:#C6C5B9}";

  var PALS = [
    ["#E07A3C", "#F4D8A8", "#F2C040", "#3A2418", "#FFE08A"], ["#4A8EC8", "#BEE0F0", "#2E5E9A", "#1A2A40", "#8ACBE8"], ["#6E9A4A", "#C8D8A0", "#3E6A2C", "#2A3018", "#A8C860"],
    ["#E8C840", "#F8ECB0", "#C84A2A", "#2A1E14", "#FFF6C0"], ["#8A847A", "#A8A296", "#5E5850", "#2A2622", "#C8C2B4"], ["#3E3A48", "#6A6478", "#C83A4A", "#E8D040", "#D8D0C0"],
    ["#BEE4F0", "#F4FAFC", "#6AB0D0", "#1A2A40", "#F07090"], ["#8A5AA8", "#D8C0E8", "#E8C048", "#2A1A30", "#C8E060"], ["#E8A0C8", "#F8E0F0", "#A84888", "#3A1A50", "#F8F0A0"],
    ["#C84A3A", "#F0E8D8", "#F8F4EC", "#2A1810", "#E8D8B8"], ["#4A6AC8", "#E8E0C8", "#C8C8E8", "#E8C040", "#F0F0F8"], ["#62929E", "#C6C5B9", "#ED6A5E", "#1C1D1C", "#4A6D7C"]
  ];
  var TABS = [["build", "Bauen", "Build"], ["gen", "Allgemein", "General"], ["col", "Farben", "Colours"], ["stats", "Werte", "Stats"], ["cry", "Klang", "Cry"], ["atk", "Attacken", "Attacks"]];
  var MATS = [["Haut", "Skin"], ["Fell", "Fur"], ["Stein", "Stone"], ["Feder", "Feather"]];
  var SLOTS = [["Körper", "Body", "main"], ["Zweitfarbe", "Second", "sec"], ["Akzent", "Accent", "acc"], ["Extra", "Extra", "extra"]];

  // ---------- Zustand ----------
  function fresh(starterIdx) { var m = MO.sanitize(MO.blank()); m.no = MO.nextNo(); m.model = D.starter(starterIdx == null ? 1 : starterIdx); m.pal = { main: "#C8A060", sec: "#F0E0B8", acc: "#8A5A3A", eye: "#3A2A20", extra: "#E8C048" }; return m; }
  function ensure() {
    if (S) return;
    S = { tab: "build", tool: "shape", limbPre: "leg3", cat: "eyes", aIdx: 0, pend: -1, brush: { k: 0, v: 1, r: 0.1, erase: false }, flow: null, snap: {},
      pix: { tool: "pen", col: "#1A1420", undo: [] }, undo: [], msg: "", bad: false, starters: false, lastSaved: null, evoLvl: 16, cam: { yaw: 0.55, pitch: 0.25, zoom: 30, t: [0, -0.2, 0] },
      needBuild: true, needView: true, vc: MA.canvas(BW, BH), pmx: 0, pmy: 0, uT: 0 };
    var d = null; try { d = JSON.parse(localStorage.getItem(DKEY) || "null"); } catch (e) {}
    setRes(d && d.res || 128);
    if (d && d.m) { S.m = MO.sanitize(d.m); if (!S.m.model) S.m.model = D.starter(1); if (d.cam) { S.cam.yaw = d.cam.yaw; S.cam.pitch = d.cam.pitch; } fit(); } else { S.m = fresh(1); fit(); }
  }
  function M() { return S.m.model; }
  var keepT = 0;
  function keep() { clearTimeout(keepT); keepT = setTimeout(function () { try { localStorage.setItem(DKEY, JSON.stringify({ m: S.m, cam: S.cam, res: S.res })); } catch (e) {} }, 300); }
  function say(t, bad) { S.msg = t; S.bad = !!bad; var el = S.host && S.host.querySelector(".ma-me .msg"); if (el) { el.textContent = t; el.className = "msg" + (bad ? " bad" : ""); } }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function pad(n) { return ("00" + n).slice(-3); }
  function px() { return Math.round(64 * S.m.size); }
  function changed(panel) { S.needBuild = true; S.needView = true; keep(); if (panel) renderPanel(); }
  function pushUndo() { S.undo.push(JSON.stringify(M())); if (S.undo.length > 50) S.undo.shift(); }
  function undo() { if (!S.undo.length) { say(L2("Nichts rückgängig zu machen.", "Nothing to undo.")); return; } S.m.model = D.sanitize(JSON.parse(S.undo.pop())); S.pend = -1; changed(true); }
  // Editor-Auflösung: res = Monsterhöhe in Pixeln (16–256). Der Bildausschnitt bleibt gleich, nur die Pixelzahl ändert sich.
  function setRes(r) {
    r = Math.max(16, Math.min(256, Math.round(+r || 128)));
    var nbh = Math.max(17, Math.min(272, Math.round(r / 0.94)));
    if (S.cam && BH) S.cam.zoom *= nbh / BH;
    BH = nbh; K = MA.H / BH; BW = Math.max(30, Math.round(MA.W / K)); S.res = r;
    S.vc = MA.canvas(BW, BH); S.vhit = null; S.needView = true;
  }
  function measured() {   // Größe und Gewicht aus dem Modell (seit v0.26.2), mal Gesamtgröße (seit v0.28), zwischengespeichert
    var key = JSON.stringify(M());
    if (!S.meas || S.meas.key !== key) S.meas = { key: key, r: D.measure(M(), 1) };
    var r = S.meas.r, sc = S.m.scale || 1, h = r.h1 * sc, kg = r.kg1 * sc * sc * sc;
    S.m.h = h < 0.5 ? Math.max(0.05, Math.round(h * 100) / 100) : Math.round(h * 10) / 10;
    S.m.kg = kg < 10 ? Math.max(0.1, Math.round(kg * 10) / 10) : Math.round(kg);
    return { h: S.m.h, kg: S.m.kg };
  }
  function sclFmt(v) { var sc = Math.pow(2, +v), r = S.meas && S.meas.r, h = r ? r.h1 * sc : 0; return "×" + dec(Math.round(sc * 100) / 100) + (r ? " · " + dec(h < 0.5 ? Math.round(h * 100) / 100 : Math.round(h * 10) / 10) + " m" : ""); }
  function dec(v) { return String(v).replace(".", MA.lang === "en" ? "." : ","); }
  // Größenvergleich mit der Spielfigur (1,50 m) als Bild für die Seitenleiste
  function compareImg() {
    var m = S.m, me = measured(), key = JSON.stringify(M()) + JSON.stringify(m.pal) + me.h + (m.img ? m.img.front.length : 0);
    if (S.cmp && S.cmp.key === key) return S.cmp.url;
    var src = m.img ? m.img.front : D.modelThumb(M(), palObj(), "cmp");
    S.cmp = { key: key, url: "" };
    var im = new Image();
    im.onload = function () { if (!S.cmp || S.cmp.key !== key) return; S.cmp.url = MO.compareCanvas(im, me.h, 200, 110).toDataURL(); var el = S.host && S.host.querySelector("img[data-o=cmp]"); if (el) el.src = S.cmp.url; };
    im.src = src; return "";
  }
  function fit() {
    var B = D.build(M()); S.cam.t = [B.bs[0], B.bs[1], B.bs[2]]; S.cam.zoom = BH * 0.94 / (2 * B.bs[3]); S.needView = true;
  }

  // ---------- Seitenleiste ----------
  function slider(key, label, min, max, step, val, fmt) {
    return '<div class="ma-ed-row"><label>' + label + '</label><input type="range" min="' + min + '" max="' + max + '" step="' + step + '" data-k="' + key + '" value="' + val + '"><output data-o="' + key + '">' + (fmt ? fmt(val) : val) + '</output></div>';
  }
  function pct(v) { return Math.round(v * 100); }
  function palObj() { return S.m.pal; }
  function renderPanel() {
    if (!S.host) return;
    var sc = S.host.scrollTop, m = S.m, list = MO.sorted(), h = '<div class="ma-me">';
    if (!D.ok()) h += '<div class="box">' + L2("Dein Browser kann kein WebGL2 – der 3D-Baukasten braucht es. Bitte einen aktuellen Chrome, Edge oder Firefox nutzen.", "Your browser has no WebGL2 – the 3D builder needs it. Please use a current Chrome, Edge or Firefox.") + '</div>';
    if (S.flow) { h += flowPanel() + '</div>'; S.host.innerHTML = h; S.host.scrollTop = 0; return; }
    h += '<h3>' + L2("Monsterliste", "Monster list") + ' <span class="ma-ed-cnt">' + list.length + '</span></h3>';
    h += '<div class="ma-ed-row"><select data-k="pick"><option value="">' + L2("– Monster aus der Liste laden –", "– load monster from the list –") + '</option>' +
      list.map(function (q) { return '<option value="' + q.id + '"' + (q.id === m.id ? " selected" : "") + '>#' + pad(q.no) + ' ' + esc(q.name || "?") + '</option>'; }).join("") + '</select></div>';
    h += '<div class="row3"><button type="button" data-a="new" aria-pressed="' + S.starters + '">' + L2("Neu", "New") + '</button><button type="button" data-a="copy">' + L2("Kopie", "Copy") + '</button><button type="button" data-a="del">' + L2("Löschen", "Delete") + '</button></div>';
    if (S.starters) h += '<div class="hint">' + L2("Grundkörper wählen – daraus formst du dein Monster:", "Pick a base body – you shape your monster from it:") + '</div><div class="grid c4">' +
      D.STARTERS.map(function (s, i) { return '<button type="button" data-start="' + i + '"><img alt="" src="' + D.modelThumb(D.starter(i), palObj(), "st" + i) + '">' + L2(s.n[0], s.n[1]) + '</button>'; }).join("") + '</div>';
    if (m.pre && !MO.byId(m.id)) { var pa = MO.byId(m.pre); if (pa) h += '<div class="box">' + L2("Du formst gerade die <b>Entwicklung von ", "You are shaping the <b>evolution of ") + esc(pa.name) + '</b>. ' + L2("Name eingeben, Modell verändern, dann hinzufügen.", "Enter a name, change the model, then add it.") + '<div class="ma-ed-row"><label>' + L2("ab Level", "at level") + '</label><input type="number" min="2" max="100" data-k="evoLvlP" value="' + S.evoLvl + '"></div></div>'; }
    h += '<button type="button" class="big" data-a="save">' + (MO.byId(m.id) ? L2("Änderungen speichern (neue Fotos)", "Save changes (new snapshots)") : L2("Zur Liste hinzufügen", "Add to list")) + '</button>';
    if (MO.byId(m.id) && m.img) h += '<button type="button" data-a="saveinfo" style="width:100%;margin-bottom:4px">' + L2("Nur Daten speichern (Bilder behalten)", "Save data only (keep images)") + '</button>';
    if (S.lastSaved && S.lastSaved === m.id) h += '<div class="box">' + L2("Gespeichert. Willst du aus demselben Modell die <b>Entwicklung</b> formen?", "Saved. Do you want to shape the <b>evolution</b> from the same model?") + '<button type="button" data-a="evo" style="width:100%;margin-top:6px">' + L2("Entwicklung bauen", "Build evolution") + '</button></div>';
    h += '<div class="row2"><button type="button" data-a="exp">' + L2("Liste exportieren", "Export list") + '</button><button type="button" data-a="imp">' + L2("Liste importieren", "Import list") + '</button></div><input type="file" accept=".json,application/json" hidden data-k="file">';
    h += '<div class="msg' + (S.bad ? " bad" : "") + '">' + esc(S.msg) + '</div>';
    h += '<div class="tabs">' + TABS.map(function (t) { return '<button type="button" data-tab="' + t[0] + '" aria-pressed="' + (S.tab === t[0]) + '">' + L2(t[1], t[2]) + '</button>'; }).join("") + '</div>';
    if (S.tab === "build") h += buildPanel();
    else if (S.tab === "gen") h += genPanel(list);
    else if (S.tab === "col") h += colPanel();
    else if (S.tab === "stats") h += statsPanel();
    else if (S.tab === "cry") h += cryPanel();
    else h += '<div class="ma-ed-soon">' + L2("Attacken kommen in einem späteren Update. Hier wird man dann festlegen, welche Attacken das Monster auf welchem Level lernt.", "Attacks come in a later update. Here you will set which attacks the monster learns at which level.") + '</div>';
    h += '</div>';
    S.host.innerHTML = h; S.host.scrollTop = sc;
  }
  function buildPanel() {
    var Mo = M(), h = '<div class="seg c5">' + [["shape", "Formen", "Shape"], ["limb", "Glieder", "Limbs"], ["stamp", "Stempel", "Stamps"], ["paint", "Pinsel", "Brush"], ["move", "Bewegen", "Move"]].map(function (t) { return '<button type="button" data-tool="' + t[0] + '" aria-pressed="' + (S.tool === t[0]) + '">' + L2(t[1], t[2]) + '</button>'; }).join("") + '</div>';
    h += '<div class="hint" style="margin-top:0">' + L2("Symmetrie aus: vorhandene Paare werden zu zwei einzelnen Teilen (nichts verschwindet). Symmetrie an: gilt nur für das, was du danach setzt oder veränderst.", "Symmetry off: existing pairs become two separate parts (nothing disappears). Symmetry on: only applies to what you place or change afterwards.") + '</div>';
    h += '<div class="row2"><button type="button" data-a="sym" aria-pressed="' + Mo.sym + '">' + L2("Symmetrie ", "Symmetry ") + (Mo.sym ? L2("an", "on") : L2("aus", "off")) + '</button><button type="button" data-a="undo">' + L2("Rückgängig", "Undo") + ' <kbd>Strg+Z</kbd></button></div>';
    h += '<div class="row2"><button type="button" data-a="smooth">' + L2("Körper glätten", "Smooth body") + '</button><button type="button" data-a="dex">' + L2("Monsterliste", "Monster list") + ' <kbd>L</kbd></button></div>';
    if (S.tool === "move") {
      h += '<div class="hint"><b>' + L2("Ganzes Monster bewegen", "Move the whole monster") + '</b><br>' + L2("Im Bild ziehen verschiebt das ganze Monster, ohne etwas an der Form zu ändern (bei Symmetrie nur hoch/runter und vor/zurück).", "Dragging in the view moves the whole monster without changing its shape (with symmetry only up/down and forward/back).") + '</div>' +
        '<div class="row3"><button type="button" data-a="mv_up">↑ ' + L2("hoch", "up") + '</button><button type="button" data-a="mv_ground">' + L2("Auf den Boden", "Onto the ground") + '</button><button type="button" data-a="mv_down">↓ ' + L2("runter", "down") + '</button></div>';
    } else if (S.tool === "shape") {
      h += '<div class="hint"><b>' + L2("Wirbelsäule und Schädel", "Spine and skull") + '</b><br>' + L2("Gelbe Punkte = Wirbel, orange = Schädel, blau = Gelenke. Ziehen = verschieben. Mausrad auf einem Punkt = dicker/dünner, <kbd>Shift</kbd> + Mausrad = breiter/schmaler, Mausrad zwischen zwei Gelenken eines Glieds = nur dieser Abschnitt. Grüne <b>+</b> an Schwanz, Hals und Schnauze verlängern. Rechtsklick entfernt einen Punkt.", "Yellow = vertebrae, orange = skull, blue = joints. Drag to move. Wheel on a point = thicker/thinner, <kbd>Shift</kbd> + wheel = wider/narrower. Green <b>+</b> at tail, neck and snout extend. Right click removes a point.") + '</div>';
      h += '<div class="hint">' + Mo.spine.length + L2(" Wirbel · ", " vertebrae · ") + Mo.head.length + L2(" Schädelknoten · ", " skull nodes · ") + Mo.limbs.length + L2(" Glieder · ", " limbs · ") + Mo.stamps.length + L2(" Stempel", " stamps") + '</div>';
    } else if (S.tool === "limb") {
      h += '<h4>' + L2("Glied-Vorlage (Zahl der Gelenke)", "Limb preset (number of joints)") + '</h4><div class="grid c4">' + D.PRESETS.map(function (p) { return '<button type="button" data-pre="' + p.id + '" aria-pressed="' + (S.limbPre === p.id) + '"><img alt="" src="' + D.limbThumb(p.id) + '">' + L2(p.n[0], p.n[1]) + ' · ' + p.j.length + '</button>'; }).join("") + '</div>';
      h += '<div class="hint">' + L2("Auf den Körper klicken = Glied ansetzen (bei Symmetrie auf beiden Seiten). Gelenke ziehen, Mausrad auf einem Gelenk = Dicke bis zum nächsten Gelenk, Mausrad zwischen zwei Gelenken = nur dieser Abschnitt dicker/dünner. Rechtsklick auf ein Gelenk entfernt das Glied. Beine reichen automatisch bis zum Boden.", "Click the body = attach a limb (both sides with symmetry). Drag joints, wheel on a joint = thickness up to the next joint, wheel between two joints = only that segment thicker/thinner. Right click a joint removes the limb. Legs reach the ground automatically.") + '</div>';
    } else if (S.tool === "stamp") {
      h += '<div class="seg c5">' + D.CATS.map(function (c) { return '<button type="button" data-cat="' + c[0] + '" aria-pressed="' + (S.cat === c[0]) + '">' + L2(c[1], c[2]) + '</button>'; }).join("") + '</div>';
      h += '<div class="grid">' + D.A[S.cat].map(function (a, i) { return '<button type="button" data-asset="' + i + '" aria-pressed="' + (S.aIdx === i) + '" title="' + esc(L2(a.n[0], a.n[1])) + '"><img alt="" src="' + D.assetThumb(a.id, palObj()) + '">' + esc(L2(a.n[0], a.n[1])) + '</button>'; }).join("") + '</div>';
      var s = S.pend >= 0 ? Mo.stamps[S.pend] : null;
      if (s) {
        h += '<div class="box"><b>' + L2("Stempel bearbeiten", "Edit stamp") + '</b> – ' + esc(L2(D.asset(s.a).n[0], D.asset(s.a).n[1])) +
          slider("st_s", L2("Größe", "Size"), 0.2, 5, 0.05, s.s, function (v) { return Math.round(v * 100) + "%"; }) +
          slider("st_rot", L2("Drehung", "Rotation"), -3.14, 3.14, 0.02, s.rot, function (v) { return Math.round(v * 57.3) + "°"; }) +
          slider("st_tilt", L2("Neigung", "Tilt"), -1.5, 1.5, 0.02, s.tilt, function (v) { return Math.round(v * 57.3) + "°"; }) +
          '<div class="row2"><button type="button" data-a="stok" class="">' + L2("Bestätigen", "Confirm") + ' <kbd>Enter</kbd></button><button type="button" data-a="stdel">' + L2("Entfernen", "Remove") + ' <kbd>Entf</kbd></button></div>' +
          '<div class="hint">' + L2("Ziehen = auf der Oberfläche verschieben, Mausrad = Größe, <kbd>Q</kbd>/<kbd>E</kbd> drehen, <kbd>R</kbd>/<kbd>T</kbd> neigen.", "Drag = move on the surface, wheel = size, <kbd>Q</kbd>/<kbd>E</kbd> rotate, <kbd>R</kbd>/<kbd>T</kbd> tilt.") + '</div></div>';
      } else h += '<div class="hint">' + L2("Stempel wählen und auf das Monster klicken. Füße und Hände rasten an den Enden der Glieder ein. Rauten anklicken = gesetzten Stempel wieder bearbeiten, Rechtsklick = entfernen.", "Pick a stamp and click on the monster. Feet and hands snap to the ends of limbs. Click a diamond = edit a placed stamp again, right click = remove.") + '</div>';
    } else {
      var b = S.brush;
      h += '<h4>' + L2("Oberfläche", "Surface") + '</h4><div class="seg c4">' + MATS.map(function (t, i) { return '<button type="button" data-brush="0:' + i + '" aria-pressed="' + (b.k === 0 && b.v === i) + '">' + L2(t[0], t[1]) + '</button>'; }).join("") + '</div>';
      h += '<h4>' + L2("Farbe", "Colour") + '</h4><div class="seg c4">' + SLOTS.map(function (t, i) { return '<button type="button" data-brush="1:' + i + '" aria-pressed="' + (b.k === 1 && b.v === i) + '" style="box-shadow:inset 0 -4px 0 ' + S.m.pal[t[2]] + '">' + L2(t[0], t[1]) + '</button>'; }).join("") + '</div>';
      h += slider("br_r", L2("Pinselgröße", "Brush size"), 0.03, 0.4, 0.01, b.r, function (v) { return Math.round(v * 100); });
      h += '<div class="row2"><button type="button" data-a="erase" aria-pressed="' + b.erase + '">' + L2("Radierer", "Eraser") + '</button><button type="button" data-a="whole">' + L2("Ganzer Körper", "Whole body") + '</button></div>';
      h += '<button type="button" data-a="clearpaint" style="width:100%;margin-top:3px">' + L2("Alle Pinselstriche löschen", "Clear all brush strokes") + '</button>';
      h += '<div class="hint">' + L2("Grund-Oberfläche: ", "Base surface: ") + '<b>' + L2(MATS[M().mat][0], MATS[M().mat][1]) + '</b>. ' + L2("Mit gedrückter Maustaste auf den Körper malen. „Ganzer Körper“ setzt die gewählte Oberfläche bzw. Farbe überall.", "Paint on the body with the mouse held down. “Whole body” applies the chosen surface or colour everywhere.") + '</div>';
    }
    h += '<h4>' + L2("Pixel beim Bearbeiten", "Pixels while editing") + '</h4>' + slider("res", L2("Auflösung", "Resolution"), 16, 256, 1, S.res, function (v) { return v + " px"; });
    h += '<div class="hint">' + L2("So viele Pixel hoch ist das Monster in der 3D-Ansicht (16 = sehr grob, 256 = sehr fein). Ändert nur die Ansicht, nicht das Spielbild. Hohe Werte brauchen mehr Rechenleistung.", "How many pixels tall the monster is in the 3D view (16 = very coarse, 256 = very fine). Only changes the view, not the game sprite. High values need more computing power.") + '</div>';
    h += '<h4>' + L2("Kamera", "Camera") + '</h4><div class="row3"><button type="button" data-a="v_front">' + L2("Vorne", "Front") + '</button><button type="button" data-a="v_side">' + L2("Seite", "Side") + '</button><button type="button" data-a="v_back">' + L2("Hinten", "Back") + '</button></div>';
    h += '<div class="hint">' + L2("Mausrad gedrückt + ziehen (oder Ziehen auf leerer Fläche, oder <kbd>Alt</kbd> + linke Maustaste) = drehen · <kbd>Shift</kbd> + Mausrad gedrückt = verschieben · Mausrad auf leerer Fläche = Zoom · Pfeiltasten drehen · <kbd>F</kbd> zentrieren.", "Hold wheel + drag (or drag on empty space, or <kbd>Alt</kbd> + left mouse) = rotate · <kbd>Shift</kbd> + held wheel = pan · wheel on empty space = zoom · arrow keys rotate · <kbd>F</kbd> centre.") + '</div>';
    measured();
    h += '<h4>' + L2("Gesamtgröße", "Overall size") + '</h4>' + slider("scl", L2("Größe", "Size"), -3.3, 4.3, 0.01, Math.log(S.m.scale || 1) / Math.LN2, sclFmt);
    h += '<img alt="" data-o="cmp" class="cmp" src="' + compareImg() + '">';
    h += '<div class="hint">' + L2("Skaliert das ganze Monster im Verhältnis: Größe in Metern und Gewicht (Gewicht wächst mit dem Volumen). Zum Vergleich die Spielfigur mit 1,50 m. Die Form und die Pixel bleiben gleich.", "Scales the whole monster proportionally: height in metres and weight (weight grows with volume). For comparison the player character at 1.50 m. Shape and pixels stay the same.") + '</div>';
    h += '<h4>' + L2("Bildgröße im Spiel", "Sprite size in game") + '</h4>' + slider("size", L2("Pixel", "Pixels"), 0.5, 4, 0.05, S.m.size, function (v) { return Math.round(64 * v) + " px"; });
    h += '<div class="hint">' + L2("Nur die Pixelzahl des Spielbilds (mehr Pixel = mehr Details). In der Monsterliste und im Kampf werden alle Monster ähnlich groß gezeigt, die echte Größe kommt von der Gesamtgröße.", "Only the pixel count of the game sprite (more pixels = more detail). In the monster list and in battle all monsters are shown at a similar size; the real size comes from the overall size.") + '</div>';
    return h;
  }
  function genPanel(list) {
    var m = S.m, h = "", dup = list.some(function (q) { return q.no === m.no && q.id !== m.id; });
    h += '<div class="ma-ed-row"><label>Name</label><input type="text" maxlength="24" data-k="name" value="' + esc(m.name) + '"></div>';
    h += '<div class="ma-ed-row"><label>' + L2("Nr. (Liste)", "No. (list)") + '</label><input type="number" min="0" max="9999" data-k="no" value="' + m.no + '"></div>';
    if (dup) h += '<div class="hint" style="color:#ED9A8E">' + L2("Diese Nummer hat schon ein anderes Monster.", "Another monster already has this number.") + '</div>';
    var elOpts = function (cur, none) { return (none ? '<option value="-1"' + (cur < 0 ? " selected" : "") + '>–</option>' : "") + MO.ELEMENTS.map(function (e, i) { return '<option value="' + i + '"' + (i === cur ? " selected" : "") + '>' + MO.elName(i) + '</option>'; }).join(""); };
    h += '<div class="ma-ed-row"><label>Element</label><select data-k="el0">' + elOpts(m.el[0]) + '</select></div>';
    h += '<div class="ma-ed-row"><label>' + L2("2. Element", "2nd element") + '</label><select data-k="el1">' + elOpts(m.el[1], 1) + '</select></div>';
    var others = list.filter(function (q) { return q.id !== m.id; }), mOpt = function (cur) { return '<option value="">–</option>' + others.map(function (q) { return '<option value="' + q.id + '"' + (q.id === cur ? " selected" : "") + '>#' + pad(q.no) + ' ' + esc(q.name || "?") + '</option>'; }).join(""); };
    h += '<h4>' + L2("Entwicklung", "Evolution") + '</h4>';
    h += '<div class="ma-ed-row"><label>' + L2("Vorentwicklung", "Evolves from") + '</label><select data-k="pre">' + mOpt(m.pre) + '</select></div>';
    h += '<div class="ma-ed-row"><label>' + L2("Entwickelt zu", "Evolves into") + '</label><select data-k="evo">' + mOpt(m.evo) + '</select></div>';
    h += '<div class="ma-ed-row"><label>' + L2("ab Level", "at level") + '</label><input type="number" min="2" max="100" data-k="evoLvl" value="' + m.evoLvl + '"></div>';
    h += '<div class="hint">' + L2("Zur Auswahl stehen Monster, die schon in der Liste gespeichert sind. Beim Speichern wird die Verknüpfung auf beiden Seiten eingetragen. Schneller: nach dem Hinzufügen „Entwicklung bauen“.", "You can pick monsters already saved in the list. Saving links both sides. Faster: after adding, use “Build evolution”.") + '</div>';
    var me = measured(), dec = function (v) { return String(v).replace(".", MA.lang === "en" ? "." : ","); };
    h += '<h4>' + L2("Größe und Gewicht (automatisch)", "Height and weight (automatic)") + '</h4>';
    h += '<div class="ma-ed-row"><label>' + L2("Größe", "Height") + '</label><b style="flex:1">' + dec(me.h) + ' m</b></div>';
    h += '<div class="ma-ed-row"><label>' + L2("Gewicht", "Weight") + '</label><b style="flex:1">' + dec(me.kg) + ' kg</b></div>';
    h += '<div class="hint">' + L2("Größe aus der Höhe des Modells mal Gesamtgröße (Reiter Bauen), Gewicht aus dem Volumen. Stein wiegt doppelt, Feder nur die Hälfte (Vögel sind leicht), Haut und Fell normal.", "Height from the model's height times the overall size (Build tab), weight from the volume. Stone weighs double, feathers only half (birds are light), skin and fur normal.") + '</div>';
    return h;
  }
  function colPanel() {
    var m = S.m, h = "", LB = [["main", "Körper", "Body"], ["sec", "Zweitfarbe (Pinsel, Flossen, Flügel)", "Secondary (brush, fins, wings)"], ["acc", "Akzent (Pinsel, Ohren innen)", "Accent (brush, inner ears)"], ["eye", "Augen (Iris)", "Eyes (iris)"], ["extra", "Extra (Hörner, Krallen, Schnabel)", "Extra (horns, claws, beak)"]];
    h += '<h4>' + L2("Palette des Monsters", "Monster palette") + '</h4>';
    LB.forEach(function (r) { h += '<label class="colr"><input type="color" data-col="' + r[0] + '" value="' + m.pal[r[0]] + '"><span>' + L2(r[1], r[2]) + '</span><code>' + m.pal[r[0]] + '</code></label>'; });
    h += '<div class="hint">' + L2("Licht, Schatten und Umriss entstehen automatisch aus jeder Farbe (3D-Licht schräg von oben, auf 4 Tonstufen heruntergerechnet).", "Light, shadow and outline come from each colour automatically (3D light from above, reduced to 4 tones).") + '</div>';
    h += '<h4>' + L2("Vorlagen", "Presets") + '</h4><div class="pals">' + PALS.map(function (p, i) { return '<button type="button" data-pal="' + i + '">' + p.slice(0, 3).map(function (c) { return '<span style="background:' + c + '"></span>'; }).join("") + '</button>'; }).join("") + '</div>';
    h += '<button type="button" data-a="rndpal" style="width:100%">' + L2("Farben würfeln", "Random colours") + '</button>';
    return h;
  }
  function statsPanel() {
    var m = S.m, h = '<div class="hint">' + L2("Grundwert = Wert auf Level 1. Potenzial = wie stark der Wert bis Level 100 wächst.", "Base = value at level 1. Potential = how much it grows until level 100.") + '</div>', tot1 = 0, tot100 = 0;
    h += '<button type="button" class="big" data-a="rndstats">' + L2("Werte vorschlagen (Element + Größe)", "Suggest stats (element + size)") + '</button>';
    h += '<div class="hint">' + L2("Grob wie bei Pokémon: Gestein und Stahl verteidigen gut, Flug und Elektro sind schnell, Kampf ist stark im Nahkampf und in der Abwehr, Psycho im Fernkampf. Große Monster haben mehr KP und Verteidigung, sind aber langsamer. Entwicklungen bekommen mehr Gesamtwerte. Jeder Klick würfelt eine leichte Abweichung. Neue Monster bekommen beim ersten Speichern automatisch einen Vorschlag.", "Roughly like Pokémon: Rock and Steel defend well, Flying and Electric are fast, Fighting is strong in melee and defence, Psychic at range. Big monsters have more HP and defence but are slower. Evolutions get higher totals. Every click rolls a slight variation. New monsters get a suggestion automatically on their first save.") + '</div>';
    MO.STATS.forEach(function (s) {
      var v = m.stats[s.k]; tot1 += v[0]; tot100 += MO.statAt(v, 100);
      h += '<div class="st"><b>' + L2(s.de, s.en) + '<i data-o="sv_' + s.k + '">Lv1 ' + v[0] + ' · Lv50 ' + MO.statAt(v, 50) + ' · Lv100 ' + MO.statAt(v, 100) + '</i></b>' +
        slider("sb_" + s.k, L2("Grundwert", "Base"), 1, 60, 1, v[0]) + slider("sp_" + s.k, L2("Potenzial", "Potential"), 0, 100, 1, v[1]) + '</div>';
    });
    return h + '<div class="tot" data-o="tot">' + L2("Summe", "Total") + ': Lv1 ' + tot1 + ' · Lv100 ' + tot100 + '</div>';
  }
  function cryPanel() {
    var m = S.m;
    return '<div class="hint">' + L2("Der Schrei entsteht aus dem Seed (8-bit, wie auf dem Game Boy). Tonhöhe und Länge verändern ihn.", "The cry comes from the seed (8-bit, like on the Game Boy). Pitch and length change it.") + '</div>' +
      '<div class="ma-ed-row"><label>Seed</label><input type="number" min="1" max="99999" data-k="cseed" value="' + m.cry.seed + '"><button type="button" data-a="cseed">' + L2("Zufall", "Random") + '</button></div>' +
      slider("pitch", L2("Tonhöhe", "Pitch"), 0.5, 2, 0.01, m.cry.pitch, function (v) { return (+v).toFixed(2); }) +
      slider("stretch", L2("Länge", "Stretch"), 0.5, 2, 0.01, m.cry.stretch, function (v) { return (+v).toFixed(2); }) +
      '<button type="button" class="big" data-a="play">' + L2("Schrei abspielen", "Play cry") + '</button>';
  }
  function flowPanel() {
    var h = '<h3>' + L2("Zur Liste hinzufügen", "Add to list") + ' – ' + esc(S.m.name || "?") + '</h3>';
    if (S.flow === "front" || S.flow === "back") {
      var fr = S.flow === "front";
      h += '<div class="box"><b>' + (fr ? L2("Schritt 1 von 3: Foto von vorne", "Step 1 of 3: front snapshot") : L2("Schritt 2 von 3: Foto von hinten", "Step 2 of 3: back snapshot")) + '</b><br>' +
        L2("Dreh das Monster so, wie es im Spiel zu sehen sein soll (Ziehen mit linker oder mittlerer Maustaste, Pfeiltasten). Rechts siehst du das fertige Spielbild.", "Rotate the monster the way it should look in the game (drag with left or middle mouse, arrow keys). On the right you see the final game sprite.") +
        (fr ? "" : L2(" Das Foto von hinten nutzt den gleichen Maßstab wie vorne.", " The back snapshot uses the same scale as the front.")) + '</div>';
      h += slider("size", L2("Bildgröße", "Sprite size"), 0.5, 4, 0.05, S.m.size, function (v) { return Math.round(64 * v) + " px"; });
      h += '<div class="row3"><button type="button" data-a="f_l">⟲ 15°</button><button type="button" data-a="f_reset">' + L2("Standard", "Default") + '</button><button type="button" data-a="f_r">15° ⟳</button></div>';
      h += '<button type="button" class="big" data-a="shot">' + L2("Foto aufnehmen", "Take snapshot") + '</button>';
      h += '<div class="row2"><button type="button" data-a="f_back">' + (fr ? L2("Abbrechen", "Cancel") : L2("Zurück zu vorne", "Back to front")) + '</button><span></span></div>';
    } else {
      var P = S.pix, T = D.palTones(S.m.pal), sw = [];
      for (var s = 0; s < 5; s++) for (var t = 0; t < 4; t++) sw.push(T[s][t]);
      sw.push([26, 20, 30], [255, 255, 255], [14, 10, 18], [200, 70, 84]);
      h += '<div class="box"><b>' + L2("Schritt 3 von 3: Nachzeichnen", "Step 3 of 3: touch up") + '</b><br>' + L2("Mit Stift und Pipette Pixel für Pixel nachbessern – links vorne, rechts hinten. Rechtsklick = Pipette.", "Touch up pixel by pixel with pen and picker – front left, back right. Right click = picker.") + '</div>';
      h += '<div class="seg c4">' + [["pen", "Stift", "Pen"], ["erase", "Radierer", "Eraser"], ["pick", "Pipette", "Picker"], ["fill", "Füllen", "Fill"]].map(function (q) { return '<button type="button" data-ptool="' + q[0] + '" aria-pressed="' + (P.tool === q[0]) + '">' + L2(q[1], q[2]) + '</button>'; }).join("") + '</div>';
      if (S.pix.img && S.pix.img.front.width > 225) h += '<div class="seg c2">' + [["front", "Vorne", "Front"], ["back", "Hinten", "Back"]].map(function (q) { return '<button type="button" data-pview="' + q[0] + '" aria-pressed="' + ((S.pix.cur || "front") === q[0]) + '">' + L2(q[1], q[2]) + '</button>'; }).join("") + '</div>';
      h += '<label class="colr"><input type="color" data-k="pcol" value="' + P.col + '"><span>' + L2("Aktuelle Farbe", "Current colour") + '</span><code>' + P.col + '</code></label>';
      h += '<div class="sw">' + sw.map(function (c) { var hx = toHex(c); return '<button type="button" data-sw="' + hx + '" aria-pressed="' + (hx === P.col) + '" style="background:' + hx + '"></button>'; }).join("") + '</div>';
      h += '<div class="row2"><button type="button" data-a="pundo">' + L2("Rückgängig", "Undo") + ' <kbd>Strg+Z</kbd></button><button type="button" data-a="preshoot">' + L2("Fotos neu machen", "Retake snapshots") + '</button></div>';
      h += '<button type="button" class="big" data-a="finish">' + L2("Fertig – in Liste speichern", "Done – save to list") + '</button>';
      h += '<button type="button" data-a="f_cancel" style="width:100%">' + L2("Abbrechen", "Cancel") + '</button>';
    }
    return h + '<div class="msg' + (S.bad ? " bad" : "") + '">' + esc(S.msg) + '</div>';
  }
  function toHex(c) { return "#" + c.map(function (v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? "0" : "") + v.toString(16); }).join("").toUpperCase(); }

  // ---------- Modell-Operationen ----------
  function allAnchored(fn) {   // fn(item, typ) für alles mit Anker
    var Mo = M();
    Mo.limbs.forEach(function (L) { fn(L, "limb"); }); Mo.stamps.forEach(function (s) { fn(s, "stamp"); }); Mo.paint.forEach(function (d) { fn(d, "paint"); });
  }
  function shiftItem(it, typ, d) {
    if (typ === "limb") it.j.forEach(function (q) { q.p = V.add(q.p, d); });
    else if (typ === "stamp") { if (!it.anc || it.anc.k !== "e") it.p = V.add(it.p, d); }
    else it.p = V.add(it.p, d);
  }
  function moveAnchored(match, d) {
    var Mo = M(), moved = [];
    allAnchored(function (it, typ) { if (it.anc && match(it.anc)) { shiftItem(it, typ, d); if (typ === "limb") moved.push(Mo.limbs.indexOf(it)); } });
    if (moved.length) allAnchored(function (it, typ) { if (typ !== "limb" && it.anc && it.anc.k === "l" && moved.indexOf(it.anc.i) >= 0) shiftItem(it, typ, d); });
  }
  function scaleAnchored(match, center, f) {
    allAnchored(function (it, typ) { if (typ === "limb" || !it.anc || !match(it.anc) || it.anc.k === "e") return; it.p = V.add(center, V.mul(V.sub(it.p, center), f)); });
  }
  function translateModel(d) {   // ganzes Monster verschieben, Form bleibt (seit v0.26.4)
    var Mo = M(), sh = function (q) { q.p = V.add(q.p, d); };
    Mo.spine.forEach(sh); Mo.head.forEach(sh); Mo.limbs.forEach(function (L) { L.j.forEach(sh); }); Mo.stamps.forEach(sh); Mo.paint.forEach(sh);
  }
  function smoothModel() {   // Körper glätten: Dicken an die Nachbarn angleichen (seit v0.26.4)
    var Mo = M(), f = 0.5;
    function chain(arr, keys) {
      keys.forEach(function (k) {
        var v = arr.map(function (n) { return n[k]; });
        arr.forEach(function (n, i) { if (arr.length < 2) return; var a = v[Math.max(0, i - 1)], b = v[Math.min(v.length - 1, i + 1)], avg = (a + v[i] + b) / 3; n[k] = v[i] + (avg - v[i]) * f; });
      });
    }
    var body = Mo.head.length ? Mo.spine.slice().reverse().concat(Mo.head) : Mo.spine.slice();
    chain(body, ["r", "w"]);
    Mo.limbs.forEach(function (L) { chain(L.j, ["r"]); L.j.forEach(function (q) { if (q.s) { q.s = 1 + (q.s - 1) * f; if (Math.abs(q.s - 1) < 0.03) delete q.s; } }); });
  }
  function bakeSym() {   // gespiegelte Glieder, Stempel und Pinselstriche in eigenständige Kopien umwandeln
    var Mo = M(), map = {}, n = 0, cp = function (o) { return JSON.parse(JSON.stringify(o)); }, li, k;
    var nl = Mo.limbs.length;
    for (li = 0; li < nl; li++) { var L = Mo.limbs[li]; if (!L.sym) continue; L.sym = false; var c = cp(L); c.j.forEach(function (q) { q.p = V.mir(q.p); }); Mo.limbs.push(c); map[li] = Mo.limbs.length - 1; n++; }
    Mo.limbs.forEach(function (L, i) { if (i >= nl && L.anc && L.anc.k === "l" && map[L.anc.i] != null) L.anc = { k: "l", i: map[L.anc.i], j: L.anc.j }; });
    var ns = Mo.stamps.length;
    for (k = 0; k < ns; k++) {
      var st = Mo.stamps[k], e = st.anc && st.anc.k === "e" && map[st.anc.i] != null;
      if (e) { st.sym = false; var c2 = cp(st); c2.anc = { k: "e", i: map[st.anc.i], j: 0 }; c2.rot = -st.rot; Mo.stamps.push(c2); n++; }
      else if (st.sym) { st.sym = false; var c3 = cp(st); c3.mir = !st.mir; if (st.anc && st.anc.k === "l" && map[st.anc.i] != null) c3.anc = { k: "l", i: map[st.anc.i], j: st.anc.j }; Mo.stamps.push(c3); n++; }
    }
    var np = Mo.paint.length;
    for (k = 0; k < np; k++) { var d = Mo.paint[k]; if (!d.sym) continue; d.sym = false; var c4 = cp(d); c4.p = V.mir(d.p); if (d.anc && d.anc.k === "l" && map[d.anc.i] != null) c4.anc = { k: "l", i: map[d.anc.i], j: d.anc.j }; Mo.paint.push(c4); }
    return n;
  }
  function moveNode(kind, i, np) {
    var Mo = M(), arr = kind === "s" ? Mo.spine : Mo.head, n = arr[i]; if (Mo.sym) np[0] = 0;
    var d = V.sub(np, n.p); n.p = np; moveAnchored(function (a) { return a.k === kind && a.i === i; }, d);
  }
  function moveJoint(li, j, np, mirrored) {
    var L = M().limbs[li], q = L.j[j], tgt = mirrored ? V.mir(np) : np, d = V.sub(tgt, q.p), j0 = j === 0 ? 0 : j;
    for (var k = j0; k < L.j.length; k++) L.j[k].p = V.add(L.j[k].p, d);
    allAnchored(function (it, typ) { if (typ !== "limb" && it.anc && it.anc.k === "l" && it.anc.i === li && it.anc.j >= j0) shiftItem(it, typ, d); });
  }
  function reanchor(fix) {   // Anker nach Löschen/Einfügen anpassen; fix(anc) → neuer Anker oder null (dann neu suchen)
    allAnchored(function (it, typ) {
      if (!it.anc) return; var a = fix(it.anc);
      if (a === false) { it.__del = 1; return; }
      if (a === null) { var p = typ === "limb" ? it.j[0].p : it.p; it.anc = D.nearestAnchor(M(), p); if (it.anc.k === "l" && typ === "limb") it.anc = { k: "s", i: 0 }; }
      else it.anc = a;
    });
    var Mo = M(); Mo.stamps = Mo.stamps.filter(function (s) { return !s.__del; }); Mo.limbs = Mo.limbs.filter(function (s) { return !s.__del; });
  }
  function extend(w) {
    var Mo = M(), sp = Mo.spine, hd = Mo.head;
    if (w === "tail") {
      if (sp.length >= 16) { say(L2("Höchstens 16 Wirbel.", "At most 16 vertebrae."), true); return; }
      var l = sp[sp.length - 1], pr = sp[sp.length - 2], dir = pr ? V.norm(V.sub(l.p, pr.p)) : [0, 0, -1], seg = pr ? Math.max(0.12, Math.min(0.35, V.len(V.sub(l.p, pr.p)))) : 0.25;
      sp.push({ p: V.add(l.p, V.mul(dir, seg)), r: Math.max(0.03, l.r * 0.82), w: l.w });
    } else if (w === "neck") {
      if (sp.length >= 16) { say(L2("Höchstens 16 Wirbel.", "At most 16 vertebrae."), true); return; }
      var f0 = sp[0], f1 = sp[1], dirF = f1 ? V.norm(V.sub(f0.p, f1.p)) : [0, 0, 1], sg = f1 ? Math.max(0.12, Math.min(0.35, V.len(V.sub(f0.p, f1.p)))) : 0.25, off = V.mul(dirF, sg);
      reanchor(function (a) { return a.k === "s" ? { k: "s", i: a.i + 1, j: a.j } : a; });
      sp.unshift({ p: V.add(f0.p, off), r: f0.r * 0.9, w: f0.w });
      hd.forEach(function (n) { n.p = V.add(n.p, off); });
      moveAnchored(function (a) { return a.k === "h"; }, off);
    } else {
      if (hd.length >= 8) { say(L2("Höchstens 8 Schädelknoten.", "At most 8 skull nodes."), true); return; }
      var base = hd.length ? hd[hd.length - 1] : sp[0], prev = hd.length > 1 ? hd[hd.length - 2] : (hd.length ? sp[0] : sp[1]);
      var dh = prev ? V.norm(V.sub(base.p, prev.p)) : [0, 0, 1], sgh = hd.length ? Math.max(0.1, base.r * 0.9) : Math.max(0.15, base.r * 1.2);
      hd.push({ p: V.add(base.p, V.mul(dh, sgh)), r: Math.max(0.04, base.r * (hd.length ? 0.72 : 0.9)), w: base.w });
    }
    changed(true);
  }
  function removeNode(h) {
    var Mo = M();
    if (h.k === "s") {
      if (Mo.spine.length <= 2) { say(L2("Mindestens 2 Wirbel.", "At least 2 vertebrae."), true); return; }
      pushUndo(); Mo.spine.splice(h.i, 1);
      reanchor(function (a) { if (a.k !== "s") return a; if (a.i === h.i) return null; return a.i > h.i ? { k: "s", i: a.i - 1, j: a.j } : a; });
    } else if (h.k === "h") {
      pushUndo(); Mo.head.splice(h.i, 1);
      reanchor(function (a) { if (a.k !== "h") return a; if (a.i === h.i) return null; return a.i > h.i ? { k: "h", i: a.i - 1, j: a.j } : a; });
    } else if (h.k === "l") {
      pushUndo(); var li = h.i; Mo.limbs.splice(li, 1);
      reanchor(function (a) { if (a.k === "e") return a.i === li ? false : (a.i > li ? { k: "e", i: a.i - 1, j: 0 } : a); if (a.k !== "l") return a; if (a.i === li) return null; return a.i > li ? { k: "l", i: a.i - 1, j: a.j } : a; });
    } else if (h.k === "st") {
      pushUndo(); Mo.stamps.splice(h.i, 1); S.pend = -1;
    }
    changed(true);
  }
  function srcAnchor(prim, p) {
    if (prim && prim.src) { var s = prim.src; if (s.k === "s" || s.k === "h") return { k: s.k, i: s.i, j: 0 }; if (s.k === "l") return { k: "l", i: s.i, j: s.j }; }
    return D.nearestAnchor(M(), p);
  }

  // ---------- Griffe (Punkte im Bild) ----------
  function handles() {
    var Mo = M(), H = [], B = D.basis(S.cam), t = S.tool;
    if (t === "move") return H;
    function P(o, p) { var s = D.project(S.cam, BW, BH, p, B); o.p = p; o.x = s[0] * K; o.y = s[1] * K; o.z = s[2]; H.push(o); }
    if (t === "shape" || t === "limb") {
      if (t === "shape") {
        Mo.spine.forEach(function (n, i) { P({ k: "s", i: i, col: "#F2D04A" }, n.p); });
        Mo.head.forEach(function (n, i) { P({ k: "h", i: i, col: "#F0904A" }, n.p); });
        var sp = Mo.spine, l = sp[sp.length - 1], pr = sp[sp.length - 2] || { p: V.add(l.p, [0, 0, 1]) }, dl = V.norm(V.sub(l.p, pr.p));
        P({ k: "x", w: "tail", col: "#7ED67E" }, V.add(l.p, V.mul(dl, l.r + 0.12)));
        var f1 = sp[1] || { p: V.add(sp[0].p, [0, 0, -1]) }, df = V.norm(V.sub(sp[0].p, f1.p)), side = V.norm(V.cross(df, [1, 0, 0])); if (V.len(side) < 0.1) side = [0, 1, 0];
        P({ k: "x", w: "neck", col: "#7ED67E" }, V.add(sp[0].p, V.mul(side, sp[0].r + 0.1)));
        var hb = Mo.head.length ? Mo.head[Mo.head.length - 1] : sp[0], hp = Mo.head.length > 1 ? Mo.head[Mo.head.length - 2] : (Mo.head.length ? sp[0] : f1), dh = V.norm(V.sub(hb.p, hp.p));
        P({ k: "x", w: "snout", col: "#7ED67E" }, V.add(hb.p, V.mul(dh, hb.r + 0.1)));
      }
      Mo.limbs.forEach(function (L, li) { L.j.forEach(function (q, j) { P({ k: "l", i: li, j: j, col: "#6EC8E8" }, q.p); if (L.sym) P({ k: "l", i: li, j: j, m: 1, col: "#5AA0B8" }, V.mir(q.p)); }); });
    }
    if (t === "stamp") Mo.stamps.forEach(function (s, i) {
      var F = D.stampFrame(Mo, s), fo = s.mir ? V.mir(F.o) : F.o; P({ k: "st", i: i, col: i === S.pend ? "#ED6A5E" : "#E8E0FF" }, fo);
      var lsym = s.anc && s.anc.k === "e" && Mo.limbs[s.anc.i] && Mo.limbs[s.anc.i].sym; if (s.sym || lsym) P({ k: "st", i: i, m: 1, col: "#B8B0D0" }, V.mir(fo));
    });
    // verdeckte Griffe markieren
    H.forEach(function (o) {
      var bx = Math.floor(o.x / K), by = Math.floor(o.y / K); o.hid = false;
      if (S.vhit && bx >= 0 && by >= 0 && bx < BW && by < BH) { var k = by * BW + bx, dz = 0.5 + o.z / (4 * S.built.bs[3]); if (S.vhit[k] && S.vdep[k] < dz - 0.03) o.hid = true; }
    });
    return H;
  }
  function hoverHandle(H, mx, my) {
    var best = null, bd = 64;
    H.forEach(function (o) { var d = (o.x - mx) * (o.x - mx) + (o.y - my) * (o.y - my) + (o.hid ? 30 : 0); if (d < bd) { bd = d; best = o; } });
    return best;
  }
  function hoverSeg(H, mx, my) {   // Maus über einem Abschnitt zwischen zwei Gelenken (seit v0.26.2)
    var Mo = M(), best = null, bd = 1e9;
    H.forEach(function (a) {
      if (a.k !== "l") return;
      var b = null; H.forEach(function (o) { if (o.k === "l" && o.i === a.i && o.j === a.j + 1 && !!o.m === !!a.m) b = o; });
      if (!b) return;
      var dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy || 1, t = ((mx - a.x) * dx + (my - a.y) * dy) / l2;
      if (t < 0.12 || t > 0.88) return;
      var px2 = a.x + dx * t - mx, py2 = a.y + dy * t - my, d = Math.sqrt(px2 * px2 + py2 * py2), q = Mo.limbs[a.i].j[a.j], rad = Math.max(6, q.r * (q.s || 1) * S.cam.zoom * K + 2);
      if (d < rad && d < bd) { bd = d; best = { k: "g", i: a.i, j: a.j, m: a.m, x: a.x + dx * 0.5, y: a.y + dy * 0.5, ax: a.x, ay: a.y, bx: b.x, by: b.y }; }
    });
    return best;
  }
  function pickAt(mx, my, P) {
    if (!S.built) return null; var r = D.ray(S.cam, BW, BH, mx / K, my / K);
    return D.pick(P || S.built.P, r.o, r.d, S.built.bs);
  }
  function planePoint(mx, my, p0) { var r = D.ray(S.cam, BW, BH, mx / K, my / K); return V.add(r.o, V.mul(r.d, V.dot(V.sub(p0, r.o), r.d))); }

  // ---------- Bedienung im Bild ----------
  function onCanvas(I) { return I.mx >= 0 && I.my >= 0 && I.mx < MA.W && I.my < MA.H; }
  function buildUpdate(I, dx, dy) {
    var Mo = M(), mx = I.mx, my = I.my, inC = onCanvas(I), shift = I.down("Shift"), alt = I.down("Alt"), now = performance.now();
    if (S.tool === "move") {   // ganzes Monster ziehen
      if (I.mmb && !shift && (dx || dy)) { S.cam.yaw -= dx * 0.012; S.cam.pitch = Math.max(-1.45, Math.min(1.45, S.cam.pitch + dy * 0.012)); S.needView = true; }
      if (I.wheel && inC) { S.cam.zoom = Math.max(8, Math.min(600, S.cam.zoom * Math.pow(1.08, -I.wheel))); S.needView = true; }
      if (I.lmbHit && inC) { pushUndo(); S.drag = { k: "move" }; }
      if (S.drag && S.drag.k === "move" && I.lmb && (dx || dy)) {
        var Bm = D.basis(S.cam), dm = V.add(V.mul(Bm.R, dx / K / S.cam.zoom), V.mul(Bm.U, -dy / K / S.cam.zoom)); if (Mo.sym) dm[0] = 0;
        translateModel(dm); changed(false);
      }
      if (S.drag && !I.lmb) { S.drag = null; keep(); }
      S.lastH = []; S.hov = null; return;
    }
    var H = S.needView ? (S.lastH || []) : handles(); S.lastH = H;
    var hov = inC && !S.drag ? (hoverHandle(H, mx, my) || hoverSeg(H, mx, my)) : S.hov; if (!S.drag) S.hov = hov;
    // Kamera
    if ((I.mmb && !shift) || (S.drag && S.drag.k === "orbit")) { if (dx || dy) { S.cam.yaw -= dx * 0.012; S.cam.pitch = Math.max(-1.45, Math.min(1.45, S.cam.pitch + dy * 0.012)); S.needView = true; } }
    if (I.mmb && shift && (dx || dy)) { var B = D.basis(S.cam); S.cam.t = V.add(S.cam.t, V.add(V.mul(B.R, -dx / K / S.cam.zoom), V.mul(B.U, dy / K / S.cam.zoom))); S.needView = true; }
    // Mausrad
    if (I.wheel && inC) {
      var f = Math.pow(1.08, -I.wheel), pend = S.pend >= 0 ? Mo.stamps[S.pend] : null;
      if (hov && (hov.k === "s" || hov.k === "h")) {
        if (now - S.uT > 700) pushUndo(); S.uT = now;
        var n = (hov.k === "s" ? Mo.spine : Mo.head)[hov.i];
        if (shift) n.w = Math.max(0.35, Math.min(2.5, n.w * f)); else { var nr = Math.max(0.02, Math.min(1, n.r * f)); scaleAnchored(function (a) { return a.k === hov.k && a.i === hov.i; }, n.p, nr / n.r); n.r = nr; }
        changed(false);
      } else if (hov && hov.k === "g") {
        if (now - S.uT > 700) pushUndo(); S.uT = now;
        var sq = Mo.limbs[hov.i].j[hov.j]; sq.s = Math.max(0.3, Math.min(3, (sq.s || 1) * f)); if (Math.abs(sq.s - 1) < 0.02) delete sq.s; changed(false);
      } else if (hov && hov.k === "l") {
        if (now - S.uT > 700) pushUndo(); S.uT = now;
        var q = Mo.limbs[hov.i].j[hov.j], qr = Math.max(0.008, Math.min(0.6, q.r * f)); scaleAnchored(function (a) { return a.k === "l" && a.i === hov.i && a.j === hov.j; }, q.p, qr / q.r); q.r = qr; changed(false);
      } else if (pend && S.tool === "stamp") {
        if (now - S.uT > 700) pushUndo(); S.uT = now; pend.s = Math.max(0.2, Math.min(5, pend.s * f)); changed(false); syncStampSliders();
      } else { S.cam.zoom = Math.max(8, Math.min(600, S.cam.zoom * f)); S.needView = true; }
    }
    // Rechtsklick: entfernen
    if (I.rmbHit && inC && hov && hov.k !== "x" && hov.k !== "g") removeNode(hov);
    // Linksklick
    if (I.lmbHit && inC && !I.mmb) {
      if (alt) S.drag = { k: "orbit" };
      else if (hov && hov.k === "x") { pushUndo(); extend(hov.w); }
      else if (hov && hov.k === "g") { /* Abschnitt: nur Mausrad */ }
      else if (hov && (hov.k === "s" || hov.k === "h" || hov.k === "l")) { pushUndo(); S.drag = { k: "node", h: hov }; }
      else if (hov && hov.k === "st") { S.pend = hov.i; pushUndo(); S.drag = { k: "stmove", P: D.build(Mo, { exclude: hov.i }).P }; renderPanel(); }
      else {
        var hit = pickAt(mx, my);
        if (!hit) S.drag = { k: "orbit" };
        else if (S.tool === "limb") addLimb(hit);
        else if (S.tool === "stamp") { if (S.pend < 0) addStamp(hit, mx, my); else { pushUndo(); S.drag = { k: "stmove", P: D.build(Mo, { exclude: S.pend }).P }; } }
        else if (S.tool === "paint") { pushUndo(); S.drag = { k: "paint", last: null }; }
        else S.drag = { k: "orbit" };
      }
    }
    // Ziehen
    if (S.drag && I.lmb) {
      var dr = S.drag;
      if (dr.k === "node") {
        var h = dr.h, p0 = h.k === "l" ? (h.m ? V.mir(Mo.limbs[h.i].j[h.j].p) : Mo.limbs[h.i].j[h.j].p) : (h.k === "s" ? Mo.spine : Mo.head)[h.i].p;
        var np = planePoint(mx, my, p0);
        if (V.len(V.sub(np, p0)) > 1e-4) { if (h.k === "l") moveJoint(h.i, h.j, np, h.m); else moveNode(h.k, h.i, np); changed(false); }
      } else if (dr.k === "stmove" && S.pend >= 0 && (dx || dy || !dr.moved)) {
        dr.moved = 1; var hh = pickAt(mx, my, dr.P), s = Mo.stamps[S.pend];
        if (hh && s) placeStampAt(s, hh, mx, my), changed(false);
      } else if (dr.k === "paint") {
        var ph = pickAt(mx, my);
        if (ph) paintAt(ph, dr);
      }
    }
    if (S.drag && !I.lmb) { var wasPaint = S.drag.k === "paint"; S.drag = null; keep(); if (wasPaint) renderPanel(); }
    // Pinselvorschau
    S.brushHit = S.tool === "paint" && inC && !S.drag ? pickAt(mx, my) : (S.drag && S.drag.k === "paint" ? S.brushHit : null);
    if (S.drag && S.drag.k === "paint") S.brushHit = pickAt(mx, my);
    // Tasten
    if (S.tool === "stamp" && S.pend >= 0) {
      var sp2 = Mo.stamps[S.pend], kc = false;
      if (I.hit("q")) { sp2.rot -= 0.15; kc = true; } if (I.hit("e")) { sp2.rot += 0.15; kc = true; }
      if (I.hit("r")) { sp2.tilt = Math.max(-1.5, sp2.tilt - 0.1); kc = true; } if (I.hit("t")) { sp2.tilt = Math.min(1.5, sp2.tilt + 0.1); kc = true; }
      if (kc) { changed(false); syncStampSliders(); }
      if (I.hit("Enter")) { S.pend = -1; renderPanel(); }
      if (I.hit("Delete") || I.hit("Backspace")) removeNode({ k: "st", i: S.pend });
    }
  }
  function addLimb(hit) {
    var Mo = M(); if (Mo.limbs.length >= 12) { say(L2("Höchstens 12 Glieder.", "At most 12 limbs."), true); return; }
    pushUndo();
    var root = V.sub(hit.p, V.mul(hit.n, 0.03)), anc = srcAnchor(hit.prim, root), rr = hit.prim ? (hit.prim.t === 1 ? Math.max(hit.prim.r1, hit.prim.r2) : Math.max.apply(null, hit.prim.r)) : 0.28;
    if (hit.prim && hit.prim.src && hit.prim.src.m) { root = V.mir(root); hit = { p: V.mir(hit.p), n: V.mir(hit.n), prim: hit.prim }; }
    var sym = Mo.sym && Math.abs(root[0]) > 0.06, L = D.makeLimb(S.limbPre, root, hit.n, { sym: sym, anc: anc, rs: Math.max(0.5, Math.min(1.6, rr / 0.28)) });
    Mo.limbs.push(L); changed(true); say(L2("Glied angesetzt", "Limb attached") + (sym ? L2(" (beidseitig)", " (both sides)") : "") + ".");
  }
  function nearLimbEnd(mx, my) {
    var Mo = M(), B = D.basis(S.cam), best = null, bd = 26 * 26;
    Mo.limbs.forEach(function (L, li) {
      var e = L.j[L.j.length - 1].p;[e].concat(L.sym ? [V.mir(e)] : []).forEach(function (p) { var s = D.project(S.cam, BW, BH, p, B), d = Math.pow(s[0] * K - mx, 2) + Math.pow(s[1] * K - my, 2); if (d < bd) { bd = d; best = li; } });
    });
    return best;
  }
  function placeStampAt(s, hit, mx, my) {
    var a = D.asset(s.a), Mo = M();
    if (a && (a.cat === "feet" || a.cat === "hands")) { var li = nearLimbEnd(mx, my); if (li != null) { s.anc = { k: "e", i: li, j: 0 }; s.sym = !!Mo.limbs[li].sym; s.mir = false; s.p = Mo.limbs[li].j[Mo.limbs[li].j.length - 1].p; return; } }
    var p = hit.p, n = hit.n; if (hit.prim && hit.prim.src && hit.prim.src.m) { p = V.mir(p); n = V.mir(n); }
    if (s.mir && !Mo.sym) { s.p = V.mir(p); s.n = V.mir(n); s.anc = srcAnchor(hit.prim, p); s.sym = false; return; }   // eigenständige Spiegel-Kopie bleibt gespiegelt gespeichert
    s.mir = false; s.p = p; s.n = n; s.anc = srcAnchor(hit.prim, p); s.sym = Mo.sym && Math.abs(p[0]) > 0.04;
  }
  function addStamp(hit, mx, my) {
    var Mo = M(); if (Mo.stamps.length >= 60) { say(L2("Höchstens 60 Stempel.", "At most 60 stamps."), true); return; }
    pushUndo();
    var s = { a: D.A[S.cat][S.aIdx].id, p: hit.p, n: hit.n, rot: 0, tilt: 0, s: 1, sym: false, anc: null };
    placeStampAt(s, hit, mx, my); Mo.stamps.push(s); S.pend = Mo.stamps.length - 1;
    S.drag = { k: "stmove", P: D.build(Mo, { exclude: S.pend }).P, moved: 1 };
    changed(true);
  }
  function paintAt(hit, dr) {
    var Mo = M(), b = S.brush, p = hit.p; if (hit.prim && hit.prim.src && hit.prim.src.m) p = V.mir(p);
    if (!hit.prim || !(hit.prim.f & 1)) return;
    if (b.erase) {
      var n0 = Mo.paint.length; Mo.paint = Mo.paint.filter(function (d) { return V.len(V.sub(d.p, p)) > b.r && !(d.sym && V.len(V.sub(V.mir(d.p), p)) <= b.r); });
      if (Mo.paint.length !== n0) changed(false); return;
    }
    if (dr.last && V.len(V.sub(dr.last, p)) < b.r * 0.45) return;
    if (Mo.paint.length >= 600) { if (!dr.warn) say(L2("Zu viele Pinselstriche (600). Nutze „Ganzer Körper“ oder einen größeren Pinsel.", "Too many brush strokes (600). Use “Whole body” or a bigger brush."), true); dr.warn = 1; return; }
    Mo.paint.push({ p: p, r: b.r, k: b.k, v: b.v, sym: Mo.sym && Math.abs(p[0]) > b.r * 0.2, anc: srcAnchor(hit.prim, p) });
    dr.last = p; changed(false);
  }
  function syncStampSliders() {
    var s = S.pend >= 0 ? M().stamps[S.pend] : null; if (!s || !S.host) return;
    [["st_s", s.s, function (v) { return Math.round(v * 100) + "%"; }], ["st_rot", s.rot, function (v) { return Math.round(v * 57.3) + "°"; }], ["st_tilt", s.tilt, function (v) { return Math.round(v * 57.3) + "°"; }]].forEach(function (q) {
      var i = S.host.querySelector('[data-k="' + q[0] + '"]'), o = S.host.querySelector('[data-o="' + q[0] + '"]'); if (i) i.value = q[1]; if (o) o.textContent = q[2](q[1]);
    });
  }

  // ---------- Fotos und Nachzeichnen ----------
  function startFlow() {
    var m = S.m;
    if (!m.name.trim()) { say(L2("Bitte zuerst einen Namen eingeben (Reiter Allgemein).", "Please enter a name first (General tab)."), true); S.tab = "gen"; renderPanel(); return; }
    if (!D.ok()) { say(L2("Ohne WebGL2 keine Fotos möglich.", "No snapshots without WebGL2."), true); return; }
    S.pend = -1; S.flow = "front"; S.snap = {};
    var sn = m.snap && m.snap.f; S.fcam = { yaw: sn ? sn[0] : 0.55, pitch: sn ? sn[1] : 0.22 }; S.fprev = null; say(""); renderPanel();
  }
  function shot() {
    var r = D.snapshot(M(), S.m.pal, S.fcam.yaw, S.fcam.pitch, px(), S.flow === "back" && S.snap.front ? S.snap.front.zoom : 0);
    if (!r) return;
    if (S.flow === "front") {
      S.snap.front = { cv: r.cv, yaw: S.fcam.yaw, pitch: S.fcam.pitch, zoom: r.zoom }; S.flow = "back";
      var sb = S.m.snap && S.m.snap.b; S.fcam = { yaw: sb ? sb[0] : S.fcam.yaw + Math.PI, pitch: sb ? sb[1] : S.fcam.pitch }; S.fprev = null;
    } else {
      S.snap.back = { cv: r.cv, yaw: S.fcam.yaw, pitch: S.fcam.pitch, zoom: r.zoom }; S.flow = "pixel";
      S.pix.img = { front: S.snap.front.cv.ctx.getImageData(0, 0, S.snap.front.cv.width, S.snap.front.cv.height), back: r.cv.ctx.getImageData(0, 0, r.cv.width, r.cv.height) };
      S.pix.undo = []; S.pix.cv = { front: MA.canvas(r.cv.width, r.cv.height), back: MA.canvas(r.cv.width, r.cv.height) }; pixSync();
    }
    renderPanel();
  }
  function pixSync() { ["front", "back"].forEach(function (v) { S.pix.cv[v].ctx.putImageData(S.pix.img[v], 0, 0); }); }
  function pixLayout() {
    var W = S.pix.img.front.width;
    if (W > 225) {   // große Bilder (seit v0.26.4): nur eine Ansicht, umschaltbar
      var k1 = Math.max(1, Math.floor(270 / W)), o = {}, cur = S.pix.cur || "front"; o[cur] = [Math.round(MA.W / 2 - W * k1 / 2), Math.max(0, Math.round((MA.H - W * k1) / 2))];
      return Object.assign({ k: k1, W: W, single: true }, o);
    }
    var k = Math.max(1, Math.floor(Math.min(210 / W, 230 / W))), y = Math.round((MA.H - W * k) / 2) + 6;
    return { k: k, W: W, front: [Math.round(MA.W / 4 - W * k / 2), y], back: [Math.round(MA.W * 3 / 4 - W * k / 2), y] };
  }
  function pixUpdate(I) {
    var P = S.pix, Lo = pixLayout(), mx = I.mx, my = I.my, hit = null;
    ["front", "back"].forEach(function (v) { var o = Lo[v]; if (!o) return; var x = Math.floor((mx - o[0]) / Lo.k), y = Math.floor((my - o[1]) / Lo.k); if (x >= 0 && y >= 0 && x < Lo.W && y < Lo.W) hit = { v: v, x: x, y: y }; });
    P.hov = hit;
    if (S.ctrlZ) { S.ctrlZ = 0; pixUndo(); }
    if (!hit) { if (!I.lmb) P.stroke = false; return; }
    var img = P.img[hit.v], o = (hit.y * Lo.W + hit.x) * 4;
    if (I.rmbHit || (I.lmbHit && P.tool === "pick")) {
      if (img.data[o + 3] > 0) { P.col = toHex([img.data[o], img.data[o + 1], img.data[o + 2]]); if (P.tool === "pick") P.tool = "pen"; } else P.tool = "erase";
      renderPanel(); return;
    }
    if (I.lmbHit && P.tool === "fill") { pixPush(); flood(img, hit.x, hit.y, P.col); pixSync(); return; }
    if (I.lmb && (P.tool === "pen" || P.tool === "erase")) {
      if (!P.stroke) { pixPush(); P.stroke = true; P.last = null; }
      var c = P.tool === "pen" ? hexRgb(P.col) : null, x0 = hit.x, y0 = hit.y, L0 = P.last && P.last.v === hit.v ? P.last : hit;
      var n = Math.max(Math.abs(x0 - L0.x), Math.abs(y0 - L0.y));   // Linie zum letzten Punkt, damit keine Lücken entstehen
      for (var t = 0; t <= n; t++) {
        var xx = Math.round(L0.x + (x0 - L0.x) * (n ? t / n : 0)), yy = Math.round(L0.y + (y0 - L0.y) * (n ? t / n : 0)), oo = (yy * Lo.W + xx) * 4;
        if (c) { img.data[oo] = c[0]; img.data[oo + 1] = c[1]; img.data[oo + 2] = c[2]; img.data[oo + 3] = 255; } else img.data[oo + 3] = 0;
      }
      P.last = hit; pixSync();
    }
    if (!I.lmb) P.stroke = false;
  }
  function hexRgb(h) { var n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function pixPush() { var P = S.pix; P.undo.push({ front: new ImageData(new Uint8ClampedArray(P.img.front.data), P.img.front.width), back: new ImageData(new Uint8ClampedArray(P.img.back.data), P.img.back.width) }); if (P.undo.length > 40) P.undo.shift(); }
  function pixUndo() { var P = S.pix; if (!P.undo.length) return; P.img = P.undo.pop(); pixSync(); }
  function flood(img, x, y, col) {
    var W = img.width, H = img.height, d = img.data, i0 = (y * W + x) * 4, t = [d[i0], d[i0 + 1], d[i0 + 2], d[i0 + 3]], c = hexRgb(col);
    if (t[3] === 255 && t[0] === c[0] && t[1] === c[1] && t[2] === c[2]) return;
    var st = [[x, y]], seen = new Uint8Array(W * H);
    while (st.length) {
      var q = st.pop(), xx = q[0], yy = q[1]; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; var k = yy * W + xx; if (seen[k]) continue; seen[k] = 1;
      var o = k * 4; if (d[o] !== t[0] || d[o + 1] !== t[1] || d[o + 2] !== t[2] || d[o + 3] !== t[3]) continue;
      d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255; st.push([xx + 1, yy], [xx - 1, yy], [xx, yy + 1], [xx, yy - 1]);
    }
  }
  function finish() {
    var m = S.m, P = S.pix;
    pixSync();
    m.img = { front: P.cv.front.toDataURL(), back: P.cv.back.toDataURL(), w: P.cv.front.width };
    m.snap = { f: [S.snap.front.yaw, S.snap.front.pitch], b: [S.snap.back.yaw, S.snap.back.pitch] };
    measured();
    var isNew = !MO.byId(m.id), parent = m.pre && isNew ? MO.byId(m.pre) : null;
    if (isNew && MO.isBlankStats(m.stats)) m.stats = MO.suggestStats(m);   // seit v0.28: Werte nach Element und Größe
    S.m = MO.put(m);
    if (parent) { parent = MO.byId(parent.id); if (parent) { parent.evoLvl = Math.max(2, Math.min(100, Math.round(S.evoLvl || 16))); parent.evo = S.m.id; MO.put(parent); S.m = MO.byId(S.m.id); } }
    if (!S.m.model) S.m.model = D.sanitize(m.model);
    S.flow = null; S.lastSaved = S.m.id; keep();
    say(L2("Gespeichert: #", "Saved: #") + pad(S.m.no) + " " + S.m.name + L2(" – im Spiel unter Hauptmenü → Monsterliste.", " – in the game under main menu → Monster list."));
    changed(true);
  }

  // ---------- Seitenleiste: Ereignisse ----------
  function onClick(e) {
    var b = e.target.closest("button"); if (!b || !S.host.contains(b) || b.disabled) return;
    var d = b.dataset, m = S.m, Mo = M();
    if (d.tab) { S.tab = d.tab; renderPanel(); return; }
    if (d.tool) { S.tool = d.tool; if (d.tool !== "stamp") S.pend = -1; renderPanel(); return; }
    if (d.start != null) { pushUndo(); m.model = D.starter(+d.start); S.starters = false; S.pend = -1; fit(); say(L2("Grundkörper geladen – jetzt formen.", "Base body loaded – now shape it.")); changed(true); return; }
    if (d.pre) { S.limbPre = d.pre; renderPanel(); return; }
    if (d.cat) { S.cat = d.cat; S.aIdx = 0; renderPanel(); return; }
    if (d.asset != null) { S.aIdx = +d.asset; S.pend = -1; renderPanel(); return; }
    if (d.brush) { var q = d.brush.split(":"); S.brush.k = +q[0]; S.brush.v = +q[1]; S.brush.erase = false; renderPanel(); return; }
    if (d.pal != null) { var p = PALS[+d.pal]; ["main", "sec", "acc", "eye", "extra"].forEach(function (k, i) { m.pal[k] = p[i]; }); changed(true); return; }
    if (d.ptool) { S.pix.tool = d.ptool; renderPanel(); return; }
    if (d.pview) { S.pix.cur = d.pview; renderPanel(); return; }
    if (d.sw) { S.pix.col = d.sw; if (S.pix.tool !== "fill") S.pix.tool = "pen"; renderPanel(); return; }
    var a = d.a;
    if (a === "new") { S.starters = !S.starters; if (S.starters && MO.byId(m.id)) { S.m = fresh(1); S.lastSaved = null; S.undo = []; fit(); say(L2("Neues Monster – Grundkörper wählen.", "New monster – pick a base body.")); changed(false); } renderPanel(); return; }
    if (a === "copy") { var c = MO.sanitize(JSON.parse(JSON.stringify(m))); c.id = MO.blank().id; c.no = MO.nextNo(); c.pre = null; c.evo = null; c.img = null; c.name = (m.name + " 2").slice(0, 24); c.model = D.sanitize(JSON.parse(JSON.stringify(Mo))); S.m = c; say(L2("Kopie erstellt – noch nicht gespeichert.", "Copy created – not saved yet.")); changed(true); return; }
    if (a === "del") {
      if (!MO.byId(m.id)) { say(L2("Dieses Monster ist noch nicht in der Liste.", "This monster is not in the list yet."), true); return; }
      if (S.delArm !== m.id) { S.delArm = m.id; say(L2("Zum Löschen noch einmal auf „Löschen“ klicken.", "Click “Delete” again to delete."), true); return; }
      MO.remove(m.id); S.delArm = null; S.lastSaved = null; say(L2("Gelöscht: ", "Deleted: ") + (m.name || "?") + L2(" – das Modell bleibt im Editor.", " – the model stays in the editor.")); changed(true); return;
    }
    if (a === "save") { startFlow(); return; }
    if (a === "rndstats") { measured(); m.stats = MO.suggestStats(m); keep(); say(L2("Werte vorgeschlagen – nach Element, Größe und Entwicklungsstufe.", "Stats suggested – by element, size and evolution stage.")); renderPanel(); return; }
    if (a === "saveinfo") { measured(); S.m = MO.put(m); if (!S.m.model) S.m.model = Mo; say(L2("Daten gespeichert (Bilder unverändert).", "Data saved (images unchanged).")); changed(true); return; }
    if (a === "evo") {
      var par = MO.byId(m.id); if (!par) return;
      var ch = MO.sanitize(JSON.parse(JSON.stringify(m))); ch.id = MO.blank().id; ch.no = MO.nextNo(); ch.name = ""; ch.pre = par.id; ch.evo = null; ch.img = null; ch.snap = m.snap;
      ch.model = D.sanitize(JSON.parse(JSON.stringify(Mo))); S.m = ch; S.evoLvl = par.evoLvl || 16; S.lastSaved = null; S.undo = [];
      say(L2("Entwicklung von ", "Evolution of ") + par.name + L2(": Modell weiterformen, Namen eingeben, dann hinzufügen.", ": keep shaping the model, enter a name, then add it.")); changed(true); return;
    }
    if (a === "exp") { if (!MO.list().length) { say(L2("Die Liste ist noch leer.", "The list is still empty."), true); return; } MO.exportList(); say(L2("Liste exportiert (", "List exported (") + MO.list().length + L2(" Monster).", " monsters).")); return; }
    if (a === "imp") { S.host.querySelector("[data-k=file]").click(); return; }
    if (a === "cseed") { m.cry.seed = 1 + Math.floor(Math.random() * 99998); keep(); renderPanel(); MO.playCry(m); return; }
    if (a === "play") { MO.playCry(m); return; }
    if (a === "rndpal") { m.pal = randomPal(); changed(true); return; }
    if (a === "sym") {   // aus: Paare werden zu zwei einzelnen Teilen; an: gilt nur für neue Teile und Änderungen, nichts wird zurückgesetzt (seit v0.26.5)
      pushUndo();
      if (Mo.sym) { var nb = bakeSym(); Mo.sym = false; say(nb ? L2("Symmetrie aus – ", "Symmetry off – ") + nb + L2(" Paare sind jetzt einzelne Teile und lassen sich getrennt bearbeiten.", " pairs are now separate parts you can edit individually.") : L2("Symmetrie aus.", "Symmetry off.")); }
      else { Mo.sym = true; say(L2("Symmetrie an – gilt für alles, was du ab jetzt setzt oder veränderst.", "Symmetry on – applies to everything you place or change from now on.")); }
      S.pend = -1; changed(true); return;
    }
    if (a === "undo") { undo(); return; }
    if (a === "smooth") { pushUndo(); smoothModel(); say(L2("Körper geglättet – mehrmals klicken für mehr.", "Body smoothed – click several times for more.")); changed(true); return; }
    if (a === "dex") { MA.dexFrom = "devkit"; MA.main.go("dex"); return; }
    if (a === "mv_up" || a === "mv_down") { pushUndo(); translateModel([0, a === "mv_up" ? 0.05 : -0.05, 0]); changed(false); return; }
    if (a === "mv_ground") { pushUndo(); var me = D.measure(M(), 1); translateModel([0, D.GND - me.y0, 0]); say(L2("Monster steht jetzt auf dem Boden.", "The monster now stands on the ground.")); changed(false); return; }
    if (a === "stok") { S.pend = -1; renderPanel(); return; }
    if (a === "stdel") { if (S.pend >= 0) removeNode({ k: "st", i: S.pend }); return; }
    if (a === "erase") { S.brush.erase = !S.brush.erase; renderPanel(); return; }
    if (a === "whole") { pushUndo(); if (S.brush.k === 0) { Mo.mat = S.brush.v; Mo.paint = Mo.paint.filter(function (q) { return q.k !== 0; }); } else { Mo.slot = S.brush.v; Mo.paint = Mo.paint.filter(function (q) { return q.k !== 1; }); } changed(true); return; }
    if (a === "clearpaint") { pushUndo(); Mo.paint = []; changed(true); return; }
    if (a === "v_front" || a === "v_side" || a === "v_back") { S.cam.yaw = a === "v_front" ? 0.55 : a === "v_side" ? Math.PI / 2 : Math.PI + 0.55; S.cam.pitch = 0.22; S.needView = true; keep(); return; }
    // Fotos
    if (a === "shot") { shot(); return; }
    if (a === "f_l" || a === "f_r") { S.fcam.yaw += a === "f_l" ? -0.26 : 0.26; S.fprev = null; return; }
    if (a === "f_reset") { S.fcam = { yaw: (S.flow === "back" ? Math.PI : 0) + 0.55, pitch: 0.22 }; S.fprev = null; return; }
    if (a === "f_back") { if (S.flow === "front") { S.flow = null; renderPanel(); } else { S.flow = "front"; S.fcam = { yaw: S.snap.front.yaw, pitch: S.snap.front.pitch }; S.fprev = null; renderPanel(); } return; }
    if (a === "preshoot") { S.flow = "front"; S.fcam = { yaw: S.snap.front.yaw, pitch: S.snap.front.pitch }; S.fprev = null; renderPanel(); return; }
    if (a === "pundo") { pixUndo(); return; }
    if (a === "finish") { finish(); return; }
    if (a === "f_cancel") { S.flow = null; renderPanel(); return; }
  }
  function onInput(e) {
    var t = e.target, k = t.dataset.k, m = S.m; if (!k) return;
    if (t.dataset.col) return;
    var v = t.value, o = S.host.querySelector('[data-o="' + k + '"]');
    if (k === "name") { m.name = v.slice(0, 24); keep(); return; }
    if (k === "no") { m.no = Math.max(0, Math.min(9999, Math.round(+v || 0))); keep(); return; }
    if (k === "h" || k === "kg" || k === "evoLvl") { m[k] = +v; keep(); return; }
    if (k === "evoLvlP") { S.evoLvl = Math.max(2, Math.min(100, Math.round(+v || 16))); return; }
    if (k === "cseed") { m.cry.seed = Math.max(1, Math.min(99999, Math.round(+v || 1))); keep(); return; }
    if (k === "pitch" || k === "stretch") { m.cry[k] = +v; if (o) o.textContent = (+v).toFixed(2); keep(); return; }
    if (k === "size") { m.size = +v; if (o) o.textContent = Math.round(64 * v) + " px"; S.fprev = null; keep(); return; }
    if (k === "scl") { m.scale = Math.round(Math.pow(2, +v) * 1000) / 1000; measured(); if (o) o.textContent = sclFmt(v); keep(); return; }
    if (k === "res") { setRes(v); if (o) o.textContent = S.res + " px"; keep(); return; }
    if (k === "br_r") { S.brush.r = +v; if (o) o.textContent = Math.round(v * 100); return; }
    if (k === "st_s" || k === "st_rot" || k === "st_tilt") {
      var s = S.pend >= 0 ? M().stamps[S.pend] : null; if (!s) return;
      if (performance.now() - S.uT > 700) pushUndo(); S.uT = performance.now();
      s[k.slice(3)] = +v; syncStampSliders(); changed(false); return;
    }
    if (k.indexOf("sb_") === 0 || k.indexOf("sp_") === 0) {
      var sk = k.slice(3), st = m.stats[sk]; st[k[1] === "b" ? 0 : 1] = +v; if (o) o.textContent = v;
      var so = S.host.querySelector('[data-o="sv_' + sk + '"]'); if (so) so.textContent = "Lv1 " + st[0] + " · Lv50 " + MO.statAt(st, 50) + " · Lv100 " + MO.statAt(st, 100);
      var t1 = 0, t100 = 0; MO.STATS.forEach(function (s2) { t1 += m.stats[s2.k][0]; t100 += MO.statAt(m.stats[s2.k], 100); });
      var to = S.host.querySelector('[data-o="tot"]'); if (to) to.textContent = L2("Summe", "Total") + ": Lv1 " + t1 + " · Lv100 " + t100;
      keep(); return;
    }
  }
  function onChange(e) {
    var t = e.target, k = t.dataset.k, m = S.m;
    if (t.dataset.col) { m.pal[t.dataset.col] = t.value; changed(true); return; }
    if (k === "pcol") { S.pix.col = t.value.toUpperCase(); S.pix.tool = "pen"; renderPanel(); return; }
    if (k === "pick") {
      var q = MO.byId(t.value); if (!q) return;
      S.m = MO.sanitize(JSON.parse(JSON.stringify(q))); S.starters = false; S.lastSaved = null; S.undo = []; S.pend = -1;
      if (!S.m.model) { S.m.model = D.starter(1); say(L2("Geladen: ", "Loaded: ") + q.name + L2(" – altes 2D-Monster ohne 3D-Modell, bitte neu formen.", " – old 2D monster without a 3D model, please reshape."), true); }
      else say(L2("Geladen: #", "Loaded: #") + pad(q.no) + " " + q.name);
      fit(); changed(true); return;
    }
    if (k === "el0" || k === "el1") { m.el[k === "el0" ? 0 : 1] = +t.value; keep(); return; }
    if (k === "pre" || k === "evo") { m[k] = t.value || null; keep(); return; }
    if (k === "no") { renderPanel(); return; }
    if (k === "cseed" || k === "evoLvl" || k === "h" || k === "kg") { var mdl = m.model, im = m.img, sn = m.snap; S.m = MO.sanitize(m); S.m.model = mdl; S.m.img = im; S.m.snap = sn; keep(); renderPanel(); return; }
    if (k === "size" || k === "scl") { renderPanel(); return; }
    if (k === "file") {
      var f = t.files && t.files[0]; if (!f) return;
      var rd = new FileReader();
      rd.onload = function () {
        try { var n = MO.importList(rd.result); say(L2("Liste importiert: ", "List imported: ") + n + L2(" Monster. Die vorige Liste ist als Sicherung im Browser.", " monsters. The previous list is kept as a backup in the browser.")); renderPanel(); }
        catch (err) { say(L2("Das ist keine Monsterliste.", "This is not a monster list."), true); }
      };
      rd.readAsText(f); t.value = "";
    }
  }
  function hsl(h, s, l) {
    s /= 100; l /= 100; var k = function (n) { return (n + h / 30) % 12; }, a = s * Math.min(l, 1 - l), f = function (n) { return l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); };
    return "#" + [f(0), f(8), f(4)].map(function (x) { return ("0" + Math.round(x * 255).toString(16)).slice(-2); }).join("");
  }
  function randomPal() {
    var h = Math.random() * 360, h2 = (h + 150 + Math.random() * 60) % 360;
    return { main: hsl(h, 40 + Math.random() * 35, 45 + Math.random() * 18), sec: hsl(h + 20, 30 + Math.random() * 30, 78 + Math.random() * 12), acc: hsl(h2, 50 + Math.random() * 30, 45 + Math.random() * 20),
      eye: hsl(Math.random() * 360, 50, 22 + Math.random() * 20), extra: hsl(h2 + 30, 40 + Math.random() * 40, 70 + Math.random() * 15) };
  }

  // ---------- Zeichnen ----------
  var BG = null;
  function background() {
    if (BG) return BG;
    var c = MA.canvas(MA.W, MA.H), g = c.ctx, gr = g.createLinearGradient(0, 0, 0, MA.H);
    gr.addColorStop(0, "#AFC4B4"); gr.addColorStop(1, "#7E9682"); g.fillStyle = gr; g.fillRect(0, 0, MA.W, MA.H);
    return (BG = c);
  }
  function drawGround(ctx) {
    var B = D.basis(S.cam), bs = S.built.bs, R = Math.max(0.6, bs[3] * 1.1), c = [bs[0], D.GND, bs[2]];
    function ring(r, fill, stroke) {
      ctx.beginPath();
      for (var i = 0; i <= 40; i++) { var a = i / 40 * 6.283, p = D.project(S.cam, BW, BH, [c[0] + Math.cos(a) * r, c[1], c[2] + Math.sin(a) * r], B); if (i) ctx.lineTo(p[0] * K, p[1] * K); else ctx.moveTo(p[0] * K, p[1] * K); }
      if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
    }
    ring(R, "rgba(70,96,74,.35)", "rgba(220,235,220,.25)"); ring(R * 0.5, null, "rgba(220,235,220,.18)");
    ring(Math.max(0.25, bs[3] * 0.5), "rgba(30,40,30,.28)");
  }
  function drawHandles(ctx) {
    var H = S.lastH || [];
    H.forEach(function (o) {
      var hv = S.hov && S.hov.k === o.k && S.hov.i === o.i && S.hov.j === o.j && !!S.hov.m === !!o.m && S.hov.w === o.w, r = hv ? 5 : 3.5;
      if (o.hid && !hv) { ctx.globalAlpha = 0.55; ctx.fillStyle = o.col; ctx.fillRect(Math.round(o.x) - 1, Math.round(o.y) - 1, 3, 3); ctx.globalAlpha = 1; return; }   // verdeckt: nur ein kleiner Punkt
      ctx.globalAlpha = 1;
      if (o.k === "x") { ctx.fillStyle = "#1C1D1C"; ctx.fillRect(o.x - 6, o.y - 6, 12, 12); ctx.fillStyle = o.col; ctx.fillRect(o.x - 4, o.y - 1, 8, 2); ctx.fillRect(o.x - 1, o.y - 4, 2, 8); }
      else if (o.k === "st") { ctx.fillStyle = "#1C1D1C"; ctx.beginPath(); ctx.moveTo(o.x, o.y - r - 2); ctx.lineTo(o.x + r + 2, o.y); ctx.lineTo(o.x, o.y + r + 2); ctx.lineTo(o.x - r - 2, o.y); ctx.fill(); ctx.fillStyle = o.col; ctx.beginPath(); ctx.moveTo(o.x, o.y - r); ctx.lineTo(o.x + r, o.y); ctx.lineTo(o.x, o.y + r); ctx.lineTo(o.x - r, o.y); ctx.fill(); }
      else { ctx.fillStyle = "#1C1D1C"; ctx.beginPath(); ctx.arc(o.x, o.y, r + 1.5, 0, 6.283); ctx.fill(); ctx.fillStyle = o.col; ctx.beginPath(); ctx.arc(o.x, o.y, r, 0, 6.283); ctx.fill(); }
    });
    ctx.globalAlpha = 1;
    if (S.hov && S.hov.k === "g") {   // Abschnitt hervorheben
      var g = S.hov, q = M().limbs[g.i] && M().limbs[g.i].j[g.j];
      if (q) { ctx.strokeStyle = "rgba(110,200,232,.85)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(g.ax, g.ay); ctx.lineTo(g.bx, g.by); ctx.stroke(); txt(ctx, L2("Abschnitt ", "Segment ") + Math.round((q.s || 1) * 100) + " %", g.x + 8, g.y - 6, "#BDE8F6"); }
    }
    // Linien der Wirbelsäule und Glieder
    ctx.strokeStyle = "rgba(28,29,28,.28)"; ctx.lineWidth = 1;
    function chain(f) { var pts = H.filter(f); if (pts.length < 2) return; ctx.beginPath(); pts.forEach(function (o, i) { if (i) ctx.lineTo(o.x, o.y); else ctx.moveTo(o.x, o.y); }); ctx.stroke(); }
    if (S.tool === "shape") { chain(function (o) { return o.k === "s"; }); chain(function (o) { return o.k === "h"; }); }
    M().limbs.forEach(function (L, li) { chain(function (o) { return o.k === "l" && o.i === li && !o.m; }); chain(function (o) { return o.k === "l" && o.i === li && o.m; }); });
  }
  function txt(ctx, t, x, y, col) { ctx.font = "600 9px system-ui, sans-serif"; ctx.textBaseline = "top"; ctx.fillStyle = "rgba(28,29,28,.7)"; var w = ctx.measureText(t).width; ctx.fillRect(x - 3, y - 2, w + 6, 13); ctx.fillStyle = col || "#F2EEE6"; ctx.fillText(t, x, y); }
  function renderBuild(ctx) {
    if (S.needBuild) { S.built = D.build(M()); S.pk = D.pack(S.built); S.needBuild = false; S.needView = true; }
    if (S.needView) {
      var raw = D.draw(S.pk, S.cam, BW, BH);
      if (raw) { var pp = D.post(raw, BW, BH, S.m.pal, { thr: 3 / (S.cam.zoom * 4 * S.built.bs[3]) }); S.vc.ctx.putImageData(pp.img, 0, 0); S.vhit = pp.hit; S.vdep = pp.dep; }
      S.needView = false; S.lastH = handles();
    }
    ctx.drawImage(background(), 0, 0);
    drawGround(ctx);
    ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(S.vc, 0, 0, BW * K, BH * K); ctx.restore();
    drawHandles(ctx);
    if (S.brushHit && S.tool === "paint") {
      var B = D.basis(S.cam), p = D.project(S.cam, BW, BH, S.brushHit.p, B);
      ctx.strokeStyle = S.brush.erase ? "#ED6A5E" : "#F2EEE6"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(p[0] * K, p[1] * K, S.brush.r * S.cam.zoom * K, 0, 6.283); ctx.stroke();
    }
    var tn = { shape: L2("Formen", "Shape"), limb: L2("Glieder", "Limbs"), stamp: L2("Stempel", "Stamps"), paint: L2("Pinsel", "Brush"), move: L2("Bewegen", "Move") }[S.tool];
    txt(ctx, tn + (M().sym ? L2(" · Symmetrie an", " · symmetry on") : L2(" · Symmetrie aus", " · symmetry off")), 8, 8);
    if (S.tool === "stamp" && S.pend >= 0) txt(ctx, L2("Stempel: ziehen · Mausrad Größe · Q/E drehen · R/T neigen · Enter bestätigen", "Stamp: drag · wheel size · Q/E rotate · R/T tilt · Enter confirm"), 8, MA.H - 18, "#F4D6CE");
  }
  function renderFlow(ctx) {
    ctx.drawImage(background(), 0, 0);
    if (!S.fprev) S.fprev = D.snapshot(M(), S.m.pal, S.fcam.yaw, S.fcam.pitch, px(), S.flow === "back" && S.snap.front ? S.snap.front.zoom : 0);
    var cv = S.fprev && S.fprev.cv; if (!cv) return;
    var k = Math.max(1, Math.floor(Math.min(240 / cv.width, 240 / cv.height))), x = Math.round(MA.W / 2 - cv.width * k / 2), y = Math.max(0, Math.round(MA.H / 2 - cv.height * k / 2) + (cv.height * k > 240 ? 0 : 8));
    ctx.fillStyle = "rgba(28,29,28,.18)"; ctx.fillRect(x - 4, y - 4, cv.width * k + 8, cv.height * k + 8);
    ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(cv, x, y, cv.width * k, cv.height * k); ctx.restore();
    txt(ctx, (S.flow === "front" ? L2("VORNE", "FRONT") : L2("HINTEN", "BACK")) + " · " + px() + " px · ×" + k + L2(" · ziehen zum Drehen", " · drag to rotate"), 8, 8);
    if (S.flow === "back" && S.snap.front) { var f = S.snap.front.cv; ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(f, MA.W - f.width - 10, MA.H - f.height - 10); ctx.restore(); txt(ctx, L2("vorne", "front"), MA.W - f.width - 10, MA.H - f.height - 24); }
  }
  function renderPix(ctx) {
    ctx.fillStyle = "#2A2C2B"; ctx.fillRect(0, 0, MA.W, MA.H);
    var Lo = pixLayout(), P = S.pix;
    ["front", "back"].forEach(function (v) {
      var o = Lo[v]; if (!o) return; var W = Lo.W * Lo.k;
      for (var y = 0; y < Lo.W; y += 2) for (var x = 0; x < Lo.W; x += 2) { ctx.fillStyle = ((x + y) / 2) % 2 ? "#9AAE9E" : "#A8BCAC"; ctx.fillRect(o[0] + x * Lo.k, o[1] + y * Lo.k, Lo.k * 2, Lo.k * 2); }
      ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(P.cv[v], o[0], o[1], W, W); ctx.restore();
      txt(ctx, v === "front" ? L2("vorne", "front") : L2("hinten", "back"), o[0], o[1] - 16);
      if (P.hov && P.hov.v === v) { ctx.strokeStyle = "#ED6A5E"; ctx.lineWidth = 1; ctx.strokeRect(o[0] + P.hov.x * Lo.k + 0.5, o[1] + P.hov.y * Lo.k + 0.5, Lo.k - 1, Lo.k - 1); }
    });
    ctx.fillStyle = P.col; ctx.fillRect(8, MA.H - 22, 14, 14); txt(ctx, { pen: L2("Stift", "Pen"), erase: L2("Radierer", "Eraser"), pick: L2("Pipette", "Picker"), fill: L2("Füllen", "Fill") }[P.tool] + " · " + L2("Rechtsklick = Pipette", "Right click = picker"), 28, MA.H - 20);
  }

  MA.monsterEditor = {
    mount: function (host, api) {
      ensure(); S.host = host; S.api = api; S.needView = true;
      if (!window.__maMeKeys) { window.__maMeKeys = 1; window.addEventListener("keydown", function (e) { var t = e.target; if ((e.ctrlKey || e.metaKey) && (e.key === "z" || e.key === "Z") && !(t && /INPUT|TEXTAREA|SELECT/.test(t.tagName))) { if (S) S.ctrlZ = 1; } }); }
      if (!host.__me) {
        host.__me = 1;
        ["click", "input", "change"].forEach(function (ev) {
          host.addEventListener(ev, function (e) {
            if (S.host !== host || !e.target.closest(".ma-me")) return;
            e.stopPropagation(); (ev === "click" ? onClick : ev === "input" ? onInput : onChange)(e);
          });
        });
      }
      renderPanel();
    },
    update: function () {
      if (!S) return;
      var I = MA.input, dx = I.mx - S.pmx, dy = I.my - S.pmy; S.pmx = I.mx; S.pmy = I.my;
      var typing = document.activeElement && /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName) && document.activeElement.type !== "range";
      if (!D.ok()) return;
      if (S.flow === "front" || S.flow === "back") {
        var ch = false;
        if ((I.lmb || I.mmb) && onCanvas(I) && (dx || dy)) { S.fcam.yaw -= dx * 0.012; S.fcam.pitch = Math.max(-1.2, Math.min(1.2, S.fcam.pitch + dy * 0.012)); ch = true; }
        if (!typing) { if (I.down("ArrowLeft")) { S.fcam.yaw += 0.03; ch = true; } if (I.down("ArrowRight")) { S.fcam.yaw -= 0.03; ch = true; } if (I.down("ArrowUp")) { S.fcam.pitch = Math.min(1.2, S.fcam.pitch + 0.03); ch = true; } if (I.down("ArrowDown")) { S.fcam.pitch = Math.max(-1.2, S.fcam.pitch - 0.03); ch = true; } }
        if (ch) S.fprev = null;
        if (!typing && I.hit("Enter")) shot();
        return;
      }
      if (S.flow === "pixel") { pixUpdate(I); return; }
      if (!typing && I.hit("l")) { MA.dexFrom = "devkit"; MA.main.go("dex"); return; }
      if (S.tab !== "build") { if (I.lmb && onCanvas(I) && (dx || dy)) { S.cam.yaw -= dx * 0.012; S.cam.pitch = Math.max(-1.45, Math.min(1.45, S.cam.pitch + dy * 0.012)); S.needView = true; } if (I.wheel && onCanvas(I)) { S.cam.zoom = Math.max(8, Math.min(600, S.cam.zoom * Math.pow(1.08, -I.wheel))); S.needView = true; } return; }
      if (!typing) {
        if (S.ctrlZ) { S.ctrlZ = 0; undo(); }
        if (I.down("ArrowLeft")) { S.cam.yaw += 0.03; S.needView = true; } if (I.down("ArrowRight")) { S.cam.yaw -= 0.03; S.needView = true; }
        if (I.down("ArrowUp")) { S.cam.pitch = Math.min(1.45, S.cam.pitch + 0.03); S.needView = true; } if (I.down("ArrowDown")) { S.cam.pitch = Math.max(-1.45, S.cam.pitch - 0.03); S.needView = true; }
        if (I.hit("f") && !(S.tool === "stamp" && S.pend >= 0)) fit();
        if (I.hit("l")) { MA.dexFrom = "devkit"; MA.main.go("dex"); return; }
      }
      buildUpdate(I, dx, dy);
    },
    _dbg: function () { return S; },   // für Tests
    render: function (ctx) {
      ensure();
      if (!D.ok()) { ctx.fillStyle = "#1C1D1C"; ctx.fillRect(0, 0, MA.W, MA.H); ctx.fillStyle = "#ED9A8E"; ctx.font = "600 11px system-ui"; ctx.fillText(L2("WebGL2 nicht verfügbar – der 3D-Baukasten braucht es.", "WebGL2 not available – the 3D builder needs it."), 20, 130); return; }
      if (S.flow === "front" || S.flow === "back") renderFlow(ctx);
      else if (S.flow === "pixel") renderPix(ctx);
      else renderBuild(ctx);
    }
  };
})();
