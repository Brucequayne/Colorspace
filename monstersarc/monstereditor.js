/* Monsters Arc – monstereditor.js (seit v0.25)
   Monster-Editor: eigener Reiter im Dev-Kit. Links die Einstellungen in Reitern (Allgemein, Aussehen, Farben, Werte,
   Klang, Attacken – Letzteres folgt später), rechts die Vorschau wie im Kampf: vorne auf dem Gegnerpodest, hinten
   auf dem eigenen Podest. Daten, Bild und Schrei kommen aus monsters.js, die 25 Vorlagen aus monstertpl.js.
   „In Liste speichern“ legt das Monster in der Monsterliste ab (Browser-Speicher). Die Liste sieht man im Spiel
   unter Hauptmenü → Monsterliste. Export/Import immer die ganze Liste als eine Datei.
   Der Arbeitsstand (aktuelles Monster) bleibt im Browser erhalten (localStorage `monstersarc.monster.draft.v1`).
   Eingebunden von devkit.js: MA.monsterEditor.mount / update / render (Reiter „monsters“). */
(function () {
  var MA = window.MA, L2 = MA.L2, MO = MA.monsters, DKEY = "monstersarc.monster.draft.v1";
  var S = null;

  MA.EDITOR_CSS = (MA.EDITOR_CSS || "") +
    ".ma-me .seg{display:grid;gap:3px;margin:3px 0 6px}.ma-me .seg.c2{grid-template-columns:repeat(2,1fr)}.ma-me .seg.c3{grid-template-columns:repeat(3,1fr)}.ma-me .seg.c4{grid-template-columns:repeat(4,1fr)}.ma-me .seg.c6{grid-template-columns:repeat(6,1fr)}" +
    ".ma-me .seg button{padding:5px 2px;font-size:.72rem;min-width:0}.ma-ed .ma-me button[disabled]{opacity:.38;cursor:default}" +
    ".ma-me .tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:3px;margin:10px 0 8px}.ma-me .tabs button{padding:6px 2px;font-size:.74rem}" +
    ".ma-me h4{margin:10px 0 3px;font:600 .72rem/1.2 var(--f-body,system-ui);color:#ACA89F}" +
    ".ma-me .ma-ed-row label{flex:0 0 86px}.ma-me .ma-ed-row output{flex:0 0 40px;text-align:right;font-variant-numeric:tabular-nums}" +
    ".ma-me input[type=text],.ma-me input[type=number],.ma-me select{flex:1;min-width:0;background:#141514;color:#E4E0D8;border:1px solid #434543;padding:4px 6px;font:inherit;font-size:.8rem;border-radius:0}" +
    ".ma-me .big{width:100%;padding:8px;margin:6px 0;background:#ED6A5E;color:#1C1D1C;border-color:#ED6A5E;font-weight:600}.ma-ed .ma-me .big:hover{background:#F08478}" +
    ".ma-me .row3{display:grid;grid-template-columns:repeat(3,1fr);gap:3px;margin:3px 0}.ma-me .row2{display:grid;grid-template-columns:1fr 1fr;gap:3px;margin:3px 0}.ma-me .row3 button,.ma-me .row2 button{padding:5px 2px;font-size:.74rem}" +
    ".ma-me .msg{font-size:.74rem;line-height:1.4;color:#9BC78B;min-height:1.2em;margin:2px 0}.ma-me .msg.bad{color:#ED9A8E}.ma-me .hint{color:#8E8A82;font-size:.72rem;line-height:1.4;margin:3px 0}" +
    ".ma-me .tpl{display:grid;grid-template-columns:repeat(5,1fr);gap:3px;margin:6px 0}.ma-me .tpl button{height:58px;padding:1px;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;font-size:.56rem;line-height:1.1;overflow:hidden}" +
    ".ma-me .tpl img{image-rendering:pixelated;width:44px;height:44px;object-fit:contain}" +
    ".ma-me .colr{display:grid;grid-template-columns:34px 1fr 70px;gap:6px;align-items:center;margin:3px 0;font-size:.78rem}.ma-me .colr input[type=color]{width:34px;height:26px;padding:0;border:1px solid #434543;background:none;cursor:pointer}.ma-me .colr code{color:#8E8A82;font-size:.7rem}" +
    ".ma-me .pals{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin:6px 0}.ma-me .pals button{height:22px;padding:0;display:flex;border:1px solid #434543}.ma-me .pals span{flex:1;height:100%}" +
    ".ma-me .st{margin:6px 0 8px;padding-bottom:6px;border-bottom:1px solid #2E302E}.ma-me .st b{display:flex;justify-content:space-between;font-size:.76rem;color:#E4E0D8;font-weight:600}.ma-me .st b i{font-style:normal;color:#ACA89F;font-weight:400;font-variant-numeric:tabular-nums}" +
    ".ma-me .st .ma-ed-row label{flex:0 0 70px;font-size:.72rem}.ma-me .tot{font-size:.76rem;color:#C6C5B9;margin:4px 0}";

  // Farbpaletten zum schnellen Wechseln [Körper, Zweitfarbe, Akzent, Augen, Extra]
  var PALS = [
    ["#E07A3C", "#F4D8A8", "#F2C040", "#3A2418", "#FFE08A"], ["#4A8EC8", "#BEE0F0", "#2E5E9A", "#1A2A40", "#8ACBE8"], ["#6E9A4A", "#C8D8A0", "#3E6A2C", "#2A3018", "#A8C860"],
    ["#E8C840", "#F8ECB0", "#C84A2A", "#2A1E14", "#FFF6C0"], ["#8A847A", "#A8A296", "#5E5850", "#2A2622", "#C8C2B4"], ["#3E3A48", "#6A6478", "#C83A4A", "#E8D040", "#D8D0C0"],
    ["#BEE4F0", "#F4FAFC", "#6AB0D0", "#1A2A40", "#F07090"], ["#8A5AA8", "#D8C0E8", "#E8C048", "#2A1A30", "#C8E060"], ["#E8A0C8", "#F8E0F0", "#A84888", "#3A1A50", "#F8F0A0"],
    ["#C84A3A", "#F0E8D8", "#F8F4EC", "#2A1810", "#E8D8B8"], ["#4A6AC8", "#E8E0C8", "#C8C8E8", "#E8C040", "#F0F0F8"], ["#62929E", "#C6C5B9", "#ED6A5E", "#1C1D1C", "#4A6D7C"]
  ];
  var TABS = [["gen", "Allgemein", "General"], ["look", "Aussehen", "Look"], ["col", "Farben", "Colours"], ["stats", "Werte", "Stats"], ["cry", "Klang", "Cry"], ["atk", "Attacken", "Attacks"]];
  var NAMES = {
    body: { round: ["Rund", "Round"], tall: ["Aufrecht", "Upright"], quad: ["Vierbeiner", "Quadruped"], serpent: ["Schlange", "Serpent"], blob: ["Blob", "Blob"], bird: ["Vogel", "Bird"] },
    arms: { none: ["Keine", "None"], stub: ["Stummel", "Stubs"], long: ["Lang", "Long"], claw: ["Krallen", "Claws"] },
    ear: { none: ["Keine", "None"], point: ["Spitz", "Pointed"], round: ["Rund", "Round"], long: ["Lang", "Long"], fin: ["Flossen", "Fins"] },
    horn: { none: ["Keine", "None"], one: ["Eins", "One"], two: ["Zwei", "Two"], antenna: ["Fühler", "Antennae"] },
    tail: { none: ["Keiner", "None"], short: ["Kurz", "Short"], long: ["Lang", "Long"], curl: ["Locke", "Curl"], flame: ["Flamme", "Flame"], leaf: ["Blatt", "Leaf"], fluff: ["Puschel", "Fluff"] },
    wing: { none: ["Keine", "None"], small: ["Klein", "Small"], big: ["Groß", "Big"], bat: ["Fledermaus", "Bat"] },
    eyes: { round: ["Rund", "Round"], big: ["Groß", "Big"], angry: ["Böse", "Angry"], sleepy: ["Müde", "Sleepy"], dot: ["Punkte", "Dots"], cyclops: ["Zyklop", "Cyclops"], slit: ["Schlitz", "Slit"] },
    mouth: { none: ["Keiner", "None"], smile: ["Lächeln", "Smile"], open: ["Offen", "Open"], fang: ["Zähne", "Fangs"], beak: ["Schnabel", "Beak"] },
    pattern: { none: ["Keins", "None"], belly: ["Bauch", "Belly"], spots: ["Punkte", "Spots"], stripes: ["Streifen", "Stripes"], mask: ["Maske", "Mask"] }
  };
  function nm(g, v) { var a = NAMES[g][v]; return L2(a[0], a[1]); }

  function ensure() {
    if (S) return;
    S = { tab: "gen", pick: false, view: "battle2", msg: "", bad: false, m: null, bg: null };
    var d = null; try { d = JSON.parse(localStorage.getItem(DKEY) || "null"); } catch (e) {}
    S.m = d ? MO.sanitize(d) : fromTpl(0);
  }
  function fromTpl(i) {
    var t = MA.MONSTER_TEMPLATES[i], m = MO.sanitize(JSON.parse(JSON.stringify(t)));
    m.id = MO.blank().id; m.no = MO.nextNo(); m.pre = null; m.evo = null; return m;
  }
  function keep() { try { localStorage.setItem(DKEY, JSON.stringify(S.m)); } catch (e) {} }
  function say(t, bad) { S.msg = t; S.bad = !!bad; var el = S.host && S.host.querySelector(".ma-me .msg"); if (el) { el.textContent = t; el.className = "msg" + (bad ? " bad" : ""); } }
  function thumb(m) { var c = MO.render(m, "front"); return c.toDataURL(); }
  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function pad(n) { return ("00" + n).slice(-3); }

  // ---------- Seitenleiste ----------
  function seg(group, key, vals, cols, cur) {
    return '<div class="seg c' + cols + '">' + vals.map(function (v) { return '<button type="button" data-set="' + key + '" data-v="' + v + '" aria-pressed="' + (cur === v) + '">' + (NAMES[group] ? nm(group, v) : v) + '</button>'; }).join("") + '</div>';
  }
  function slider(key, label, min, max, step, val, fmt) {
    return '<div class="ma-ed-row"><label>' + label + '</label><input type="range" min="' + min + '" max="' + max + '" step="' + step + '" data-k="' + key + '" value="' + val + '"><output data-o="' + key + '">' + (fmt ? fmt(val) : val) + '</output></div>';
  }
  function pct(v) { return Math.round(v * 100); }
  function renderPanel() {
    var m = S.m, L = m.look, list = MO.sorted(), h = '<div class="ma-me">';
    h += '<h3>' + L2("Monsterliste", "Monster list") + ' <span class="ma-ed-cnt">' + list.length + '</span></h3>';
    h += '<div class="ma-ed-row"><select data-k="pick"><option value="">' + L2("– Monster aus der Liste laden –", "– load monster from the list –") + '</option>' +
      list.map(function (q) { return '<option value="' + q.id + '"' + (q.id === m.id ? " selected" : "") + '>#' + pad(q.no) + ' ' + esc(q.name || "?") + '</option>'; }).join("") + '</select></div>';
    h += '<div class="row3"><button type="button" data-a="new" aria-pressed="' + S.pick + '">' + L2("Neu", "New") + '</button><button type="button" data-a="copy">' + L2("Kopie", "Copy") + '</button><button type="button" data-a="del">' + L2("Löschen", "Delete") + '</button></div>';
    if (S.pick) {
      h += '<div class="hint">' + L2("Vorlage wählen – daraus entsteht ein neues Monster, das du frei verändern kannst:", "Pick a template – it becomes a new monster you can change freely:") + '</div><div class="tpl">' +
        MA.MONSTER_TEMPLATES.map(function (t, i) { return '<button type="button" data-tpl="' + i + '" title="' + esc(t.name) + '"><img alt="" src="' + thumb(MO.sanitize(t)) + '">' + esc(t.name) + '</button>'; }).join("") + '</div>';
    }
    h += '<button type="button" class="big" data-a="save">' + (MO.byId(m.id) ? L2("Änderungen in Liste speichern", "Save changes to list") : L2("In Liste speichern", "Save to list")) + '</button>';
    h += '<div class="row2"><button type="button" data-a="exp">' + L2("Liste exportieren", "Export list") + '</button><button type="button" data-a="imp">' + L2("Liste importieren", "Import list") + '</button></div><input type="file" accept=".json,application/json" hidden data-k="file">';
    h += '<div class="msg' + (S.bad ? " bad" : "") + '">' + esc(S.msg) + '</div>';
    h += '<div class="seg c3"><button type="button" data-view="battle2" aria-pressed="' + (S.view === "battle2") + '">' + L2("Kampf ×2", "Battle ×2") + '</button><button type="button" data-view="battle" aria-pressed="' + (S.view === "battle") + '">' + L2("Kampf ×1", "Battle ×1") + '</button><button type="button" data-view="side" aria-pressed="' + (S.view === "side") + '">' + L2("Nebeneinander", "Side by side") + '</button></div>';
    h += '<div class="tabs">' + TABS.map(function (t) { return '<button type="button" data-tab="' + t[0] + '" aria-pressed="' + (S.tab === t[0]) + '"' + (t[0] === "atk" ? ' title="' + L2("kommt später", "coming later") + '"' : "") + '>' + L2(t[1], t[2]) + '</button>'; }).join("") + '</div>';

    if (S.tab === "gen") {
      var dup = list.some(function (q) { return q.no === m.no && q.id !== m.id; });
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
      h += '<div class="hint">' + L2("Zur Auswahl stehen Monster, die schon in der Liste gespeichert sind. Beim Speichern wird die Verknüpfung auf beiden Seiten eingetragen.", "You can pick monsters already saved in the list. Saving links both sides.") + '</div>';
      h += '<h4>' + L2("Größe und Gewicht", "Height and weight") + '</h4>';
      h += '<div class="ma-ed-row"><label>' + L2("Größe (m)", "Height (m)") + '</label><input type="number" min="0.1" max="30" step="0.1" data-k="h" value="' + m.h + '"></div>';
      h += '<div class="ma-ed-row"><label>' + L2("Gewicht (kg)", "Weight (kg)") + '</label><input type="number" min="0.1" max="999" step="0.1" data-k="kg" value="' + m.kg + '"></div>';
    } else if (S.tab === "look") {
      var noHead = L.body === "round" || L.body === "blob";
      h += '<h4>' + L2("Körperbau", "Body") + '</h4>' + seg("body", "body", MO.CH.body, 3, L.body);
      h += slider("bw", L2("Breite", "Width"), 0, 1, 0.01, L.bw, pct) + slider("bh", L2("Höhe", "Height"), 0, 1, 0.01, L.bh, pct);
      h += noHead ? "" : slider("head", L2("Kopf", "Head"), 0, 1, 0.01, L.head, pct);
      if (L.body !== "serpent") {
        if (L.body !== "bird") h += '<h4>' + L2("Beine", "Legs") + '</h4>' + seg("", "legs", [0, 2, 4], 3, L.legs);
        h += slider("legL", L2("Beinlänge", "Leg length"), 0, 1, 0.01, L.legL, pct) + slider("legT", L2("Beindicke", "Leg width"), 0, 1, 0.01, L.legT, pct);
      }
      h += '<h4>' + L2("Arme", "Arms") + '</h4>' + seg("arms", "arms", MO.CH.arms, 4, L.arms);
      h += '<h4>' + L2("Ohren", "Ears") + '</h4>' + seg("ear", "ear", MO.CH.ear, 3, L.ear) + slider("earS", L2("Ohrgröße", "Ear size"), 0, 1, 0.01, L.earS, pct);
      h += '<h4>' + L2("Hörner", "Horns") + '</h4>' + seg("horn", "horn", MO.CH.horn, 4, L.horn);
      h += '<h4>' + L2("Schwanz", "Tail") + '</h4>' + seg("tail", "tail", MO.CH.tail, 4, L.tail) + slider("tailS", L2("Länge", "Length"), 0, 1, 0.01, L.tailS, pct);
      h += '<h4>' + L2("Flügel und Stacheln", "Wings and spikes") + '</h4>' + seg("wing", "wing", MO.CH.wing, 4, L.wing);
      h += '<div class="seg c2"><button type="button" data-set="spikes" data-v="0" aria-pressed="' + !L.spikes + '">' + L2("Keine Stacheln", "No spikes") + '</button><button type="button" data-set="spikes" data-v="1" aria-pressed="' + !!L.spikes + '">' + L2("Stacheln", "Spikes") + '</button></div>';
      h += '<h4>' + L2("Augen", "Eyes") + '</h4>' + seg("eyes", "eyes", MO.CH.eyes, 4, L.eyes) + slider("eyeS", L2("Augengröße", "Eye size"), 0, 1, 0.01, L.eyeS, pct) + slider("eyeGap", L2("Abstand", "Spacing"), 0, 1, 0.01, L.eyeGap, pct);
      h += '<h4>' + L2("Mund", "Mouth") + '</h4>' + seg("mouth", "mouth", MO.CH.mouth, 3, L.mouth);
      h += '<h4>' + L2("Muster", "Pattern") + '</h4>' + seg("pattern", "pattern", MO.CH.pattern, 3, L.pattern);
      h += '<div class="seg c2"><button type="button" data-set="cheeks" data-v="0" aria-pressed="' + !L.cheeks + '">' + L2("Ohne Wangen", "No cheeks") + '</button><button type="button" data-set="cheeks" data-v="1" aria-pressed="' + !!L.cheeks + '">' + L2("Wangen", "Cheeks") + '</button></div>';
      h += '<h4>Seed</h4><div class="ma-ed-row"><label>Seed</label><input type="number" min="1" max="99999" data-k="seed" value="' + L.seed + '"><button type="button" data-a="seed">' + L2("Zufall", "Random") + '</button></div>';
      h += '<div class="hint">' + L2("Der Seed verteilt Punkte, Wellen und kleine Unterschiede.", "The seed places spots, wobble and small differences.") + '</div>';
      h += '<h4>' + L2("Bildgröße", "Sprite size") + '</h4>' + slider("size", L2("Größe", "Size"), 0.5, 1.6, 0.05, m.size, function (v) { return Math.round(64 * v) + " px"; });
      h += '<div class="hint">' + L2("Größere Monster werden mit mehr Pixeln gezeichnet, die Pixel bleiben gleich groß.", "Bigger monsters are drawn with more pixels; pixels stay the same size.") + '</div>';
      h += '<button type="button" data-a="rndlook" style="width:100%;margin-top:6px">' + L2("Zufälliges Aussehen", "Random look") + '</button>';
    } else if (S.tab === "col") {
      var LB = [["main", "Körper", "Body"], ["sec", "Zweitfarbe (Bauch, Flügel)", "Secondary (belly, wings)"], ["acc", "Akzent (Muster, Ohren innen)", "Accent (pattern, inner ears)"], ["eye", "Augen", "Eyes"], ["extra", "Extra (Hörner, Krallen, Schnabel)", "Extra (horns, claws, beak)"]];
      h += '<h4>' + L2("Palette des Monsters", "Monster palette") + '</h4>';
      LB.forEach(function (r) { h += '<label class="colr"><input type="color" data-col="' + r[0] + '" value="' + m.pal[r[0]] + '"><span>' + L2(r[1], r[2]) + '</span><code>' + m.pal[r[0]] + '</code></label>'; });
      h += '<div class="hint">' + L2("Schatten, Licht und Umriss werden aus jeder Farbe automatisch abgeleitet.", "Shadow, light and outline are derived from each colour automatically.") + '</div>';
      h += '<h4>' + L2("Vorlagen", "Presets") + '</h4><div class="pals">' + PALS.map(function (p, i) { return '<button type="button" data-pal="' + i + '">' + p.slice(0, 3).map(function (c) { return '<span style="background:' + c + '"></span>'; }).join("") + '</button>'; }).join("") + '</div>';
      h += '<button type="button" data-a="rndpal" style="width:100%">' + L2("Farben würfeln", "Random colours") + '</button>';
    } else if (S.tab === "stats") {
      h += '<div class="hint">' + L2("Grundwert = Wert auf Level 1. Potenzial = wie stark der Wert bis Level 100 wächst.", "Base = value at level 1. Potential = how much it grows until level 100.") + '</div>';
      var tot1 = 0, tot100 = 0;
      MO.STATS.forEach(function (s) {
        var v = m.stats[s.k]; tot1 += v[0]; tot100 += MO.statAt(v, 100);
        h += '<div class="st"><b>' + L2(s.de, s.en) + '<i data-o="sv_' + s.k + '">Lv1 ' + v[0] + ' · Lv50 ' + MO.statAt(v, 50) + ' · Lv100 ' + MO.statAt(v, 100) + '</i></b>' +
          slider("sb_" + s.k, L2("Grundwert", "Base"), 1, 60, 1, v[0]) + slider("sp_" + s.k, L2("Potenzial", "Potential"), 0, 100, 1, v[1]) + '</div>';
      });
      h += '<div class="tot" data-o="tot">' + L2("Summe", "Total") + ': Lv1 ' + tot1 + ' · Lv100 ' + tot100 + '</div>';
    } else if (S.tab === "cry") {
      h += '<div class="hint">' + L2("Der Schrei entsteht aus dem Seed (8-bit, wie auf dem Game Boy). Tonhöhe und Länge verändern ihn.", "The cry comes from the seed (8-bit, like on the Game Boy). Pitch and length change it.") + '</div>';
      h += '<div class="ma-ed-row"><label>Seed</label><input type="number" min="1" max="99999" data-k="cseed" value="' + m.cry.seed + '"><button type="button" data-a="cseed">' + L2("Zufall", "Random") + '</button></div>';
      h += slider("pitch", L2("Tonhöhe", "Pitch"), 0.5, 2, 0.01, m.cry.pitch, function (v) { return (+v).toFixed(2); });
      h += slider("stretch", L2("Länge", "Stretch"), 0.5, 2, 0.01, m.cry.stretch, function (v) { return (+v).toFixed(2); });
      h += '<button type="button" class="big" data-a="play">' + L2("Schrei abspielen", "Play cry") + '</button>';
    } else {
      h += '<div class="ma-ed-soon">' + L2("Attacken kommen in einem späteren Update. Hier wird man dann festlegen, welche Attacken das Monster auf welchem Level lernt.", "Attacks come in a later update. Here you will set which attacks the monster learns at which level.") + '</div>';
    }
    h += '</div>';
    S.host.innerHTML = h;
  }

  // ---------- Bedienung ----------
  function changed(rerender) { keep(); if (rerender) renderPanel(); }
  function onClick(e) {
    var b = e.target.closest("button"); if (!b || !S.host.contains(b) || b.disabled) return;
    var d = b.dataset, m = S.m;
    if (d.tab) { S.tab = d.tab; renderPanel(); return; }
    if (d.view) { S.view = d.view; renderPanel(); return; }
    if (d.tpl != null) { S.m = fromTpl(+d.tpl); S.pick = false; say(L2("Neues Monster aus Vorlage „", "New monster from template “") + S.m.name + L2("“ – noch nicht gespeichert.", "” – not saved yet.")); changed(true); return; }
    if (d.set) { var v = d.v; if (d.set === "legs" || d.set === "spikes" || d.set === "cheeks") v = +v; m.look[d.set] = v; changed(true); return; }
    if (d.pal != null) { var p = PALS[+d.pal]; ["main", "sec", "acc", "eye", "extra"].forEach(function (k, i) { m.pal[k] = p[i]; }); changed(true); return; }
    var a = d.a;
    if (a === "new") { S.pick = !S.pick; renderPanel(); return; }
    if (a === "copy") { var c = MO.sanitize(JSON.parse(JSON.stringify(m))); c.id = MO.blank().id; c.no = MO.nextNo(); c.pre = null; c.evo = null; c.name = (m.name + " 2").slice(0, 24); S.m = c; say(L2("Kopie erstellt – noch nicht gespeichert.", "Copy created – not saved yet.")); changed(true); return; }
    if (a === "del") {
      if (!MO.byId(m.id)) { say(L2("Dieses Monster ist noch nicht in der Liste.", "This monster is not in the list yet."), true); return; }
      if (S.delArm !== m.id) { S.delArm = m.id; say(L2("Zum Löschen noch einmal auf „Löschen“ klicken.", "Click “Delete” again to delete."), true); return; }
      MO.remove(m.id); S.delArm = null; say(L2("Gelöscht: ", "Deleted: ") + (m.name || "?")); changed(true); return;
    }
    if (a === "save") {
      if (!m.name.trim()) { say(L2("Bitte zuerst einen Namen eingeben.", "Please enter a name first."), true); S.tab = "gen"; renderPanel(); return; }
      S.m = MO.put(m); say(L2("Gespeichert: #", "Saved: #") + pad(S.m.no) + " " + S.m.name + L2(" – im Spiel unter Hauptmenü → Monsterliste.", " – in the game under main menu → Monster list.")); changed(true); return;
    }
    if (a === "exp") { if (!MO.list().length) { say(L2("Die Liste ist noch leer.", "The list is still empty."), true); return; } MO.exportList(); say(L2("Liste exportiert (", "List exported (") + MO.list().length + L2(" Monster).", " monsters).")); return; }
    if (a === "imp") { S.host.querySelector("[data-k=file]").click(); return; }
    if (a === "seed") { m.look.seed = 1 + Math.floor(Math.random() * 99998); changed(true); return; }
    if (a === "cseed") { m.cry.seed = 1 + Math.floor(Math.random() * 99998); changed(true); MO.playCry(m); return; }
    if (a === "play") { MO.playCry(m); return; }
    if (a === "rndpal") { m.pal = randomPal(); changed(true); return; }
    if (a === "rndlook") { randomLook(m); changed(true); return; }
  }
  function onInput(e) {
    var t = e.target, k = t.dataset.k, m = S.m; if (!k) return;
    if (t.dataset.col) return;
    var v = t.value, o = S.host.querySelector('[data-o="' + k + '"]');
    if (k === "name") { m.name = v.slice(0, 24); keep(); return; }
    if (k === "no") { m.no = Math.max(0, Math.min(9999, Math.round(+v || 0))); keep(); return; }
    if (k === "h" || k === "kg" || k === "evoLvl") { m[k] = +v; keep(); return; }
    if (k === "seed") { m.look.seed = Math.max(1, Math.min(99999, Math.round(+v || 1))); keep(); return; }
    if (k === "cseed") { m.cry.seed = Math.max(1, Math.min(99999, Math.round(+v || 1))); keep(); return; }
    if (k === "pitch" || k === "stretch") { m.cry[k] = +v; if (o) o.textContent = (+v).toFixed(2); keep(); return; }
    if (k === "size") { m.size = +v; if (o) o.textContent = Math.round(64 * v) + " px"; keep(); return; }
    if (k.indexOf("sb_") === 0 || k.indexOf("sp_") === 0) {
      var sk = k.slice(3), st = m.stats[sk]; st[k[1] === "b" ? 0 : 1] = +v; if (o) o.textContent = v;
      var so = S.host.querySelector('[data-o="sv_' + sk + '"]'); if (so) so.textContent = "Lv1 " + st[0] + " · Lv50 " + MO.statAt(st, 50) + " · Lv100 " + MO.statAt(st, 100);
      var t1 = 0, t100 = 0; MO.STATS.forEach(function (s) { t1 += m.stats[s.k][0]; t100 += MO.statAt(m.stats[s.k], 100); });
      var to = S.host.querySelector('[data-o="tot"]'); if (to) to.textContent = L2("Summe", "Total") + ": Lv1 " + t1 + " · Lv100 " + t100;
      keep(); return;
    }
    if (k in m.look) { m.look[k] = +v; if (o) o.textContent = pct(+v); keep(); return; }
  }
  function onChange(e) {
    var t = e.target, k = t.dataset.k, m = S.m;
    if (t.dataset.col) { m.pal[t.dataset.col] = t.value; changed(true); return; }
    if (k === "pick") { var q = MO.byId(t.value); if (q) { S.m = MO.sanitize(JSON.parse(JSON.stringify(q))); S.pick = false; say(L2("Geladen: #", "Loaded: #") + pad(q.no) + " " + q.name); changed(true); } return; }
    if (k === "el0" || k === "el1") { m.el[k === "el0" ? 0 : 1] = +t.value; changed(false); return; }
    if (k === "pre" || k === "evo") { m[k] = t.value || null; changed(false); return; }
    if (k === "no") { changed(true); return; }
    if (k === "seed" || k === "cseed" || k === "evoLvl" || k === "h" || k === "kg") { S.m = MO.sanitize(m); changed(true); return; }
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

  // ---------- Zufall ----------
  function hsl(h, s, l) {
    s /= 100; l /= 100; var k = function (n) { return (n + h / 30) % 12; }, a = s * Math.min(l, 1 - l), f = function (n) { return l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))); };
    return "#" + [f(0), f(8), f(4)].map(function (x) { return ("0" + Math.round(x * 255).toString(16)).slice(-2); }).join("");
  }
  function randomPal() {
    var h = Math.random() * 360, h2 = (h + 150 + Math.random() * 60) % 360;
    return { main: hsl(h, 40 + Math.random() * 35, 45 + Math.random() * 18), sec: hsl(h + 20, 30 + Math.random() * 30, 78 + Math.random() * 12), acc: hsl(h2, 50 + Math.random() * 30, 45 + Math.random() * 20),
      eye: hsl(Math.random() * 360, 50, 22 + Math.random() * 20), extra: hsl(h2 + 30, 40 + Math.random() * 40, 70 + Math.random() * 15) };
  }
  function randomLook(m) {
    var L = m.look, C = MO.CH, r = function (a) { return a[Math.floor(Math.random() * a.length)]; };
    L.body = r(C.body); L.bw = Math.random(); L.bh = Math.random(); L.head = Math.random(); L.legs = r([0, 2, 2, 4, 4]); L.legL = Math.random(); L.legT = Math.random();
    L.arms = r(C.arms); L.ear = r(C.ear); L.earS = Math.random(); L.horn = r(["none", "none", "one", "two", "antenna"]); L.tail = r(C.tail); L.tailS = Math.random();
    L.wing = r(["none", "none", "none", "small", "big", "bat"]); L.spikes = Math.random() < 0.25 ? 1 : 0; L.eyes = r(C.eyes); L.eyeS = Math.random(); L.eyeGap = Math.random();
    L.mouth = r(["none", "smile", "smile", "open", "fang"]); L.pattern = r(C.pattern); L.cheeks = Math.random() < 0.3 ? 1 : 0; L.seed = 1 + Math.floor(Math.random() * 99998);
  }

  // ---------- Vorschau ----------
  function background() {
    var c = MA.canvas(MA.W, MA.H), g = c.ctx, W = MA.W, H = MA.H;
    var gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "#C8DCC8"); gr.addColorStop(0.55, "#B8D0A8"); gr.addColorStop(1, "#98B888");
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    for (var i = 0; i < 900; i++) { var x = (i * 97) % W, y = 40 + ((i * 53) % (H - 40)); g.fillStyle = i % 3 ? "rgba(70,110,60,0.18)" : "rgba(240,250,220,0.18)"; g.fillRect(x, y, 2, 1); }
    function plat(cx, cy, rx, ry) {
      g.fillStyle = "#6E8E58"; g.beginPath(); g.ellipse(cx, cy + 3, rx, ry, 0, 0, 6.283); g.fill();
      g.fillStyle = "#9EBE7A"; g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, 6.283); g.fill();
      g.fillStyle = "#B4D08E"; g.beginPath(); g.ellipse(cx - rx * 0.12, cy - ry * 0.18, rx * 0.72, ry * 0.55, 0, 0, 6.283); g.fill();
    }
    plat(352, 128, 92, 20); plat(128, 258, 112, 24);
    return c;
  }
  function infoBox(ctx, x, y, w, m, lvl) {
    ctx.fillStyle = "rgba(28,29,28,0.86)"; ctx.fillRect(x, y, w, 30); ctx.fillStyle = "#ED6A5E"; ctx.fillRect(x, y, 3, 30);
    ctx.fillStyle = "#F2EEE6"; ctx.font = "600 10px system-ui, sans-serif"; ctx.textBaseline = "top";
    ctx.fillText((m.name || "?").slice(0, 16), x + 8, y + 4);
    ctx.fillStyle = "#C6C5B9"; ctx.font = "9px system-ui, sans-serif"; ctx.fillText("#" + pad(m.no) + "  Lv" + lvl, x + 8, y + 17);
    [m.el[0], m.el[1]].forEach(function (e, i) { if (e < 0) return; ctx.fillStyle = MO.EL_COL[e]; ctx.fillRect(x + w - 50 + i * 24, y + 18, 22, 7); });
  }
  function draw(ctx, cv, cx, by, sc) { ctx.drawImage(cv, Math.round(cx - cv.width * sc / 2), Math.round(by - cv.height * sc), cv.width * sc, cv.height * sc); }

  MA.monsterEditor = {
    mount: function (host, api) {
      ensure(); S.host = host; S.api = api;
      // eigene Ereignisse nicht an das Dev-Kit weiterreichen (gleiche data-Namen wie im Map-Editor)
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
      var I = MA.input;
      if (I.hit("p") && document.activeElement && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) MO.playCry(S.m);
    },
    render: function (ctx) {
      ensure();
      if (!S.bg) S.bg = background();
      ctx.drawImage(S.bg, 0, 0);
      var m = S.m, f = MO.render(m, "front"), b = MO.render(m, "back");
      ctx.save(); ctx.imageSmoothingEnabled = false;
      if (S.view !== "side") {
        // Kampf wie in Gen 3: ×2 entspricht dem Game-Boy-Maßstab (64-px-Bild = 128 px hoch). Pixelgröße bleibt fest.
        var z = S.view === "battle2" ? 2 : 1;
        ctx.fillStyle = "rgba(40,60,30,0.22)"; ctx.beginPath(); ctx.ellipse(352, 126, f.width * 0.3 * z, 5, 0, 0, 6.283); ctx.fill();
        draw(ctx, f, 352, 128 + Math.round(f.height * 0.03 * z), z);
        draw(ctx, b, 128, 272 + Math.round(b.height * 0.14 * z), z);   // eigenes Monster: unten abgeschnitten wie im Kampf
        infoBox(ctx, 16, 16, 150, m, 5); infoBox(ctx, MA.W - 166, MA.H - 46, 150, m, 5);
      } else {
        var sc = f.width <= 100 ? 2 : 1;
        ctx.fillStyle = "rgba(28,29,28,0.35)"; ctx.fillRect(0, 0, MA.W, MA.H);
        draw(ctx, f, 128, 220, sc); draw(ctx, b, 352, 220, sc);
        ctx.fillStyle = "#F2EEE6"; ctx.font = "600 10px system-ui, sans-serif"; ctx.textBaseline = "top";
        ctx.fillText(L2("vorne", "front") + " · " + f.width + " px" + (sc > 1 ? " · ×2" : ""), 96, 236); ctx.fillText(L2("hinten", "back"), 336, 236);
      }
      ctx.restore();
    }
  };
})();
