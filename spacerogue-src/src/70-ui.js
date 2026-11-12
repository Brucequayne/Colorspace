  // ===== 70-ui.js · UI: HTML-Aufbau, Infofeld, Spieltipps-Anzeige =====
  // ---------- UI ----------
  function set(id, txt) { var e = document.getElementById(id); if (e && e.textContent !== txt) e.textContent = txt; }
  function note(txt) { var n = V.root.querySelector(".sr-note"); n.textContent = txt; n.hidden = false; clearTimeout(V.noteT); V.noteT = setTimeout(function () { if (V) n.hidden = true; }, 3200); }
  function icon(id) {
    var ty = T[id], cv = document.createElement("canvas"), s = 14, w = ty.w, h = ty.h, sc = Math.min(40 / (w * s), 40 / (h * s), 1.4);
    cv.width = 44; cv.height = 44; var c = cv.getContext("2d");
    c.translate(22 - w * s * sc / 2, 22 - h * s * sc / 2); c.scale(sc, sc);
    WX_ICON = true; try { drawBlock(c, { t: id, x: 0, y: 0, r: 0, f: 0 }, s, "in", 1, 0); } finally { WX_ICON = false; }
    return cv.toDataURL();
  }
  // Kompakte Steuerungsliste (Taste · Aktion) für das Infofeld
  function ctlHtml() {
    var de = lang === "de", G = [
      [de ? "Im Sitz" : "Seated", [["WASD", de ? "Fliegen" : "Fly"], ["Q / E", de ? "Drehen" : "Rotate"], [de ? "Linksklick" : "Left click", de ? "Feuern" : "Fire"], ["R", de ? "Waffe wechseln" : "Switch weapon"], ["Z", de ? "Trägheitsdämpfer" : "Inertia dampers"], ["C", "Cruise Control"], ["X", "Overcharge"], [de ? "Umschalt" : "Shift", de ? "Hochgeschw. freigeben" : "Unlock high speed"], ["F", de ? "Aufstehen / Hinsetzen" : "Get up / sit down"], ["V", de ? "Innen / Außen" : "Inside / outside"], ["I", de ? "Inventar" : "Inventory"], ["P", de ? "Andocken / Abdocken" : "Dock / undock"]]],
      [de ? "Zu Fuß" : "On foot", [["WASD", de ? "Laufen" : "Walk"], [de ? "Umschalt" : "Shift", de ? "Sprinten" : "Sprint"], ["1–9", de ? "Werkzeug wählen" : "Select tool"], [de ? "Linksklick" : "Left click", de ? "1 Schweißen · 2 Pistole · 3 MP (halten)" : "1 weld · 2 pistol · 3 SMG (hold)"], [de ? "F auf Luke" : "F on hatch", de ? "Aussteigen (auch durch die Decke)" : "Exit (also through the ceiling)"], [de ? "Offener Rand" : "Open edge", de ? "Direkt hinaus und hinein" : "Step straight out and in"]]],
      [de ? "Draußen" : "Outside", [["WASD", "Jetpack"], [de ? "Umschalt" : "Shift", de ? "Tempo ans Schiff" : "Match ship speed"], [de ? "F über Luke" : "F above hatch", de ? "Einsteigen" : "Get in"]]],
      ["Test", [[de ? "Rechtsklick" : "Right click", de ? "Block beschädigen" : "Damage block"], [de ? "Mausrad" : "Wheel", "Zoom"], ["Esc", de ? "Zurück zum Editor" : "Back to editor"]]]
    ];
    return '<div class="sr-ctl" hidden>' + G.map(function (g) { return "<small>" + g[0] + "</small><dl>" + g[1].map(function (r) { return "<dt>" + r[0] + "</dt><dd>" + r[1] + "</dd>"; }).join("") + "</dl>"; }).join("") + "</div>";
  }
  // ---------- Block-Varianten (v0.54.4) ----------
  // Eine Kachel je Gruppe; sie zeigt die zuletzt gewählte Variante. Gewählte Varianten bleiben auf dem Gerät gespeichert.
  var VAR_SAVE = "spacerogue-var", VSEL = null, ICONS = {};
  function vGroup(g) { return Object.keys(T).filter(function (id) { return T[id].vg === g && !T[id].wx; }); }
  function vShown(g) {
    if (!VSEL) { VSEL = {}; try { VSEL = JSON.parse(localStorage.getItem(VAR_SAVE) || "{}") || {}; } catch (e) {} }
    var id = VSEL[g]; return id && T[id] && T[id].vg === g ? id : g;
  }
  function vSave() { try { localStorage.setItem(VAR_SAVE, JSON.stringify(VSEL || {})); } catch (e) {} }
  function iconC(id) { return ICONS[id] || (ICONS[id] = icon(id)); }
  function tileHTML(id) {
    var ty = T[id], g = ty.vg, n = g ? vGroup(g).length : 0;
    return '<button type="button" class="sr-blk" data-blk="' + id + '" data-kind="' + ty.kind + '"' + (g ? ' data-vg="' + g + '"' : "") + (ty.dev ? " data-dev" : "") + ' title="' + ty.n[lang] + " · " + kg(ty.mass) + " · " + ty.hp + " HP · " + cr(ty.cost) + wTip(id) + '">' +
      (n > 1 ? '<i class="sr-vf" data-vf="' + g + '" title="' + t("vars") + " (" + n + ')"></i>' : "") +
      '<img alt="" src="' + iconC(id) + '"><span>' + ty.n[lang] + "</span><small>" + kg(ty.mass) + "</small><small class=\"sr-pr\">" + cr(ty.cost) + "</small></button>";
  }
  // Fenster mit allen Varianten direkt an der Falte öffnen
  function openVar(f) {
    var g = f.getAttribute("data-vf"), pop = V.root.querySelector(".sr-vpop"), pal = V.root.querySelector(".sr-pal");
    if (!pop.hidden && pop.getAttribute("data-g") === g) { closeVar(); return; }
    var cur = f.closest("[data-blk]").getAttribute("data-blk");
    pop.innerHTML = "<h5>" + t("vars") + "</h5><div>" + vGroup(g).map(function (id) {
      return '<button type="button" class="sr-vo" data-vopt="' + id + '" aria-pressed="' + (id === cur) + '" title="' + T[id].n[lang] + '"><img alt="" src="' + iconC(id) + '"><span>' + (T[id].vn ? T[id].vn[lang] : t("varStd")) + "</span></button>";
    }).join("") + "</div>";
    pop.setAttribute("data-g", g); pop.hidden = false;
    var fr = f.getBoundingClientRect(), pr = pal.getBoundingClientRect();
    pop.style.right = "auto"; pop.style.left = Math.max(4, Math.min(pr.width - pop.offsetWidth - 4, fr.right - pr.left - pop.offsetWidth)) + "px";   // an der Falte, aber nie aus der Leiste heraus
    pop.style.top = Math.max(4, Math.min(pr.height - pop.offsetHeight - 4, fr.top - pr.top)) + "px";
  }
  function closeVar() { var pop = V && V.root && V.root.querySelector(".sr-vpop"); if (pop && !pop.hidden) { pop.hidden = true; pop.innerHTML = ""; } }
  function pickVar(id) {
    var g = T[id].vg; VSEL = VSEL || {}; VSEL[g] = id; vSave();
    var old = V.root.querySelector('.sr-list [data-vg="' + g + '"]'); if (old) old.outerHTML = tileHTML(id);
    S.sel = id; S.tool = "build"; closeVar(); syncUI();
  }
  function html() {
    var pal = CATS.map(function (cat) {
      var ids = Object.keys(T).filter(function (id) { return T[id].cat === cat && (!T[id].vg || T[id].vg === id); }), onlyDev = ids.length && ids.every(function (id) { return T[id].dev; });
      return '<div class="sr-cat"' + (onlyDev ? " data-dev" : "") + '><h4>' + t(cat) + '</h4><div class="sr-grid">' + ids.map(function (id) { return tileHTML(T[id].vg ? vShown(id) : id); }).join("") + "</div></div>";
    }).join("");
    var sw = ["#C8473A", "#E3B83F", "#57A06A", "#3E6F96", "#7B4BA8", "#E9ECEE", "#9AA5B1", "#6A7480", "#2A2F36"].map(function (c) { return '<button type="button" class="sr-sw" data-sw="' + c + '" style="background:' + c + '" aria-label="' + c + '"></button>'; }).join("");
    return '<div class="sr-root">' +
      '<canvas id="sr-cv"></canvas>' +
      '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="srCA" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">' +
      '<feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0" result="r"/><feOffset id="srCAo1" in="r" dx="0" dy="0" result="ro"/>' +
      '<feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0" result="g"/>' +
      '<feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0" result="b"/><feOffset id="srCAo2" in="b" dx="0" dy="0" result="bo"/>' +
      '<feBlend in="ro" in2="g" mode="screen" result="rg"/><feBlend in="rg" in2="bo" mode="screen"/></filter></svg>' +
      '<div class="sr-top"><a class="sr-back" href="#">← ' + t("back") + '</a><b class="sr-ttl">' + t("title") + ' <small>v' + VERSION + '</small></b>' +
      '<div class="sr-ed-only sr-tbar"><span class="sr-seg"><button type="button" data-act="ed-ship">' + t("edShip") + '</button><button type="button" data-act="ed-st">' + t("edSt") + '</button></span><input id="sr-name" class="sr-name" maxlength="28" spellcheck="false" placeholder="' + t("namePh") + '"><button type="button" data-act="undo">' + t("undo") + '</button><button type="button" data-act="starter">' + t("starter") + '</button><button type="button" data-act="clear">' + t("clear") + '</button><button type="button" data-act="exp">Export</button><button type="button" data-act="imp">Import</button><button type="button" data-act="npc">' + t("hangar") + '</button><button type="button" class="sr-dev-only" data-act="dev-lock">' + t("devLock") + '</button></div>' +
      '<div class="sr-sp"></div><div class="sr-seg"><button type="button" data-view="in">' + t("vIn") + '</button><button type="button" data-view="out">' + t("vOut") + '</button></div>' +
      '<button type="button" class="sr-go sr-ed-only" data-act="test">' + t("test") + ' ▸</button><button type="button" class="sr-go sr-fl-only" data-act="edit">◂ ' + t("toEd") + '</button></div>' +
      '<aside class="sr-pal sr-ed-only"><div class="sr-tools"><button type="button" data-tool="build">' + t("tBuild") + '</button><button type="button" data-tool="erase">' + t("tErase") + '</button><button type="button" data-tool="paint">' + t("tPaint") + '</button></div>' +
      '<div class="sr-envtabs sr-dev-only"><span class="sr-seg"><button type="button" data-act="tab-blk">' + t("tabBlk") + '</button><button type="button" data-act="tab-env">' + t("tabEnv") + '</button></span></div>' +
      '<div class="sr-envp sr-dev-only"><small>' + t("envLayer") + '</small><span class="sr-seg sr-envl"><button type="button" data-envl="-1">' + t("envBack") + '</button><button type="button" data-envl="0">' + t("envGame") + '</button><button type="button" data-envl="1">' + t("envFront") + '</button></span>' +
      '<label class="sr-envr"><small>' + t("envScale") + ' <b id="sr-env-sv"></b></small><input type="range" id="sr-env-s" min="-232" max="200" step="1"></label>' +
      '<label class="sr-envr"><small>' + t("envRot") + ' <b id="sr-env-rv"></b></small><input type="range" id="sr-env-r" min="0" max="355" step="5"></label>' +
      '<button type="button" data-act="env-rnd" class="sr-envrnd"></button><p class="sr-envh">' + t("envHelp") + '</p><small class="sr-envcat">' + t("envAst") + '</small><div class="sr-grid sr-envlist"></div></div>' +
      '<div class="sr-paint"><label>' + t("color") + ' <input type="color" id="sr-col"></label><div class="sr-sws">' + sw + '</div></div>' +
      '<div class="sr-opts"><button type="button" data-act="rot">' + t("rot") + '</button><button type="button" data-act="flip">' + t("flip") + '</button><button type="button" data-act="sym">' + t("sym") + '</button><button type="button" data-act="symm" class="sr-symm"></button></div>' +
      '<div class="sr-list">' + pal + '</div><div class="sr-vpop" hidden></div></aside>' +
      '<aside class="sr-info sr-ed-only" id="sr-info"></aside>' +
      '<div class="sr-hud sr-fl-only"><div class="sr-hr"><small>' + t("speed") + '</small><span><b id="sr-h-sp"></b><em id="sr-h-spb"></em></span></div>' +
      '<div><small>' + t("energy") + ' <span id="sr-h-en"></span></small><i class="sr-eb sr-eb2"><i id="sr-h-sbar"></i><i id="sr-h-ebar"></i></i></div>' +
      '<div><small>' + t("weapon") + ' (R)</small><b id="sr-h-w"></b></div>' +
      '<div class="sr-ics"><i id="sr-ic-z" title="Z · ' + t("damp") + '"><svg viewBox="0 0 20 20"><path d="M2 10h5M13 10h5M5 7l3 3-3 3M15 7l-3 3 3 3" fill="none" stroke="currentColor" stroke-width="1.8"/></svg><u>Z</u></i><i id="sr-ic-c" title="C · ' + t("cruise") + '"><svg viewBox="0 0 20 20"><path d="M3 14a7 7 0 0 1 14 0" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M10 14l4-5" stroke="currentColor" stroke-width="2"/><circle cx="10" cy="14" r="1.6" fill="currentColor"/></svg><u>C</u></i><i id="sr-ic-h" title="' + (lang === "de" ? "Umschalt" : "Shift") + ' · ' + t("hiLbl") + '"><svg viewBox="0 0 20 20"><path d="M5 11l5-5 5 5M5 16l5-5 5 5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg><u>⇧</u></i><i id="sr-ic-x" title="X · Overcharge"><svg viewBox="0 0 20 20"><path d="M11 2L5 11h4l-1 7 6-9h-4z" fill="currentColor"/></svg><u>X</u><s><s id="sr-h-ocbar"></s></s></i></div>' +
      '<div><small>' + t("air") + ' <span id="sr-h-air"></span></small><i class="sr-eb"><i id="sr-h-airbar"></i></i></div>' +
      '<div><small>F <span id="sr-h-seat"></span></small></div><div hidden><small>' + t("weld") + '</small><b id="sr-h-weld"></b></div>' +
      '<button type="button" data-act="seat" id="sr-h-seatb"></button><button type="button" data-act="targets">' + t("targets") + '</button><button type="button" data-act="inv" class="sr-invb">' + t("perksBtn") + '</button>' +
      '<div class="sr-spawn"><small>' + t("spawn") + '</small><span>' + NPC.map(function (q) { return '<button type="button" data-spawn="' + q.id + '">' + q.n[lang] + '</button>'; }).join("") + '</span></div>' + ctlHtml() + '</div>' +
      '<div class="sr-kill" hidden><svg viewBox="0 0 40 40" width="34" height="34"><path d="M20 5l6 12v12l-6 5-6-5V17z" fill="#6A7480" stroke="#C9D1D9" stroke-width="1.5"/><path d="M11 13l18 18M29 13L11 31" stroke="#E0533F" stroke-width="3"/></svg><div><small>' + t("ko") + '</small><span></span></div></div>' +
      '<label class="sr-uis sr-fl-only" title="' + (lang === "de" ? "Größe des Infofelds" : "Info panel size") + '"><svg viewBox="0 0 20 20" width="14" height="14"><rect x="2" y="3" width="7" height="14" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 7h6M12 10h6M12 13h4" stroke="currentColor" stroke-width="1.6"/></svg><input type="range" id="sr-uis" min="1" max="1.5" step="0.05" value="1"><span id="sr-uis-v">100 %</span></label>' +
      '<button type="button" class="sr-ctlb sr-fl-only" data-act="ctl" aria-pressed="false">' + t("controls") + '</button>' +
      '<button type="button" class="sr-shipn" data-act="rename" title="' + t("renameT") + '"></button><input class="sr-shipn-in" maxlength="28" spellcheck="false" hidden>' +
      '<div class="sr-inv" hidden><div class="sr-inv-box"><div class="sr-inv-h"><div><b>' + t("invT") + '</b><small>' + t("invSub") + '</small></div><span class="sr-inv-cnt"></span><button type="button" data-act="inv-x">' + (lang === "de" ? "Schließen (I)" : "Close (I)") + '</button></div><div class="sr-inv-grid"></div></div></div>' +
      hotHtml() + '<div class="sr-place"></div>' +
      '<div class="sr-kc sr-fl-only"><small>' + t("kills") + '</small><b>0</b></div>' +
      '<div class="sr-ebot sr-fl-only"><div class="sr-ebot-bar"><i id="sr-be-s"></i><i id="sr-be-e"></i></div><span id="sr-be-t"></span>' +
      '<label class="sr-shs"><small>' + t("shield") + '</small><input type="range" id="sr-shp" min="0" max="100" step="5" value="0"><b id="sr-shp-v">0 %</b><button type="button" data-act="shfill" title="' + t("shFill") + '">↻</button></label><em id="sr-shp-n"></em></div>' +
      '<div class="sr-tip sr-fl-only" hidden title="' + (lang === "de" ? "Klicken zum Ausblenden" : "Click to dismiss") + '"></div>' +
      '<div class="sr-hint" id="sr-hint"></div><div class="sr-note" hidden></div>' +
      '<div class="sr-io sr-npc" hidden><div class="sr-io-box sr-npc-box"><div class="sr-tbar"><b class="sr-npc-t">' + t("hangar") + '</b><span class="sr-sp"></span><button type="button" data-act="npc-x">' + (lang === "de" ? "Schließen" : "Close") + '</button></div><div class="sr-io-h">' + t("hangarH") + '</div><div class="sr-npc-list"></div></div></div>' +
      '<div class="sr-io sr-dev" hidden><div class="sr-io-box sr-dev-box"><div class="sr-io-h">' + t("devH") + '</div><input class="sr-dev-in" type="password" inputmode="numeric" autocomplete="off" maxlength="6" spellcheck="false" aria-label="Code"><div class="sr-tbar"><span class="sr-dev-msg"></span><span class="sr-sp"></span><button type="button" data-act="dev-x">' + t("cancel") + '</button></div></div></div>' +
      '<div class="sr-io sr-exio" hidden><div class="sr-io-box"><div class="sr-io-h"></div><span class="sr-seg sr-io-mode"><button type="button" data-act="io-scene">' + t("expScene") + '</button><button type="button" data-act="io-struct">' + t("expStruct") + '</button></span><textarea spellcheck="false"></textarea><div class="sr-tbar"><button type="button" data-act="io-copy">' + (lang === "de" ? "Kopieren" : "Copy") + '</button><button type="button" data-act="io-load">' + (lang === "de" ? "Laden" : "Load") + '</button><button type="button" data-act="io-txt">' + t("txtSave") + '</button><button type="button" data-act="io-open">' + t("txtOpen") + '</button><input type="file" class="sr-io-file" accept=".txt,text/plain" hidden><span class="sr-sp"></span><button type="button" data-act="io-x">' + (lang === "de" ? "Schließen" : "Close") + '</button></div></div></div></div>';
  }
  function syncUI() {
    if (!V) return;
    var r = V.root, fly = S.mode === "fly";
    r.querySelector(".sr-root").classList.toggle("fly", fly);
    r.querySelectorAll("[data-tool]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-tool") === S.tool)); });
    r.querySelectorAll("[data-blk]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-blk") === S.sel && S.tool === "build")); });
    r.querySelectorAll("[data-view]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-view") === S.view)); });
    r.querySelector(".sr-root").classList.toggle("st", S.ed === "station");
    var envt = S.ed === "station" && S.envTab; r.querySelector(".sr-root").classList.toggle("envt", envt);
    var tb1 = r.querySelector('[data-act="tab-blk"]'), tb2 = r.querySelector('[data-act="tab-env"]'); if (tb1) { tb1.setAttribute("aria-pressed", String(!S.envTab)); tb2.setAttribute("aria-pressed", String(!!S.envTab)); }
    if (envt) envSync(r);
    if (S.ed !== "station" && T[S.sel] && T[S.sel].dev) S.sel = "lblk";   // Dev-Bauteile gibt es im Schiffsbau nicht
    r.querySelector(".sr-root").classList.toggle("foot", !!(FL && !FL.seated)); if (FL) syncHot();
    var ni = r.querySelector("#sr-name"); if (ni && document.activeElement !== ni) ni.value = S.names[S.ed] || "";
    var tb = r.querySelector('[data-act="test"]'); if (tb) tb.textContent = t(S.ed === "station" ? "testSt" : "test") + " ▸";
    var es = r.querySelector('[data-act="ed-ship"]'), et = r.querySelector('[data-act="ed-st"]'); if (es) { es.setAttribute("aria-pressed", String(S.ed !== "station")); et.setAttribute("aria-pressed", String(S.ed === "station")); }
    var sb = r.querySelector('[data-act="sym"]'); if (sb) sb.setAttribute("aria-pressed", String(S.sym));
    var sm = r.querySelector('[data-act="symm"]'); if (sm) { sm.textContent = t("axis") + ": " + t(S.symGap ? "symGap" : "symIn"); sm.disabled = !S.sym; }
    var fb = r.querySelector('[data-act="flip"]'); if (fb) fb.setAttribute("aria-pressed", String(!!S.f));
    r.querySelector(".sr-paint").hidden = S.tool !== "paint";
    var ci = r.querySelector("#sr-col"); if (ci && ci.value !== S.color) ci.value = S.color;
    r.querySelectorAll("[data-sw]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-sw").toLowerCase() === S.color.toLowerCase())); });
    set("sr-hint", fly ? "" : t("hintEd")); var hn = V.root.querySelector("#sr-hint"); if (hn) hn.hidden = fly;
    if (!fly) info();
  }
  // Waffenwerte: im Tooltip der Bauteilliste und als eigener Abschnitt im Infofeld (je Typ Anzahl, Schaden, Feuerrate, DPS)
  function wTip(id) { var w = wStats(id); return w ? " · " + t("wDmg") + " " + nf(w.dmg) + " · " + nf(w.rpm) + " RPM · " + nf(w.dps, 1) + " DPS" : ""; }
  function weapTxt() {
    var cnt = {}, ord = []; S.blocks.forEach(function (b) { if (!wStats(b.t)) return; if (!cnt[b.t]) { cnt[b.t] = 0; ord.push(b.t); } cnt[b.t]++; });
    if (!ord.length) return "<h4>" + t("sWeap") + "</h4><p>" + t("wNone") + "</p>";
    var tot = 0, h = "<h4>" + t("sWeap") + "</h4>";
    ord.forEach(function (id) {
      var w = wStats(id), n = cnt[id]; tot += w.dps * n;
      h += "<div><span>" + n + "× " + T[id].n[lang].replace(/ \d+×\d+$/, "") + "</span><b>" + nf(w.dps * n, 1) + " DPS</b></div>" +
        "<p class='sr-ws'>" + t("wDmg") + " " + nf(w.dmg) + " · " + nf(w.rpm) + " RPM · " + nf(w.dps, 1) + " DPS " + t("wEach") + "</p>";
    });
    return h + "<div><span>" + t("wTotal") + "</span><b>" + nf(tot, 1) + " DPS</b></div>";
  }
  function coolTxt() { var cm = coolMap(S.blocks), w = 0, th = 0; cm.forEach(function (n, b) { var k = T[b.t].kind; if (k === "mg" || k === "rg") w++; if (k === "thr") th++; }); return w + " " + t("weap") + " · " + th + " " + t("thrs"); }
  function dimTxt() { var b = bounds(S.blocks); if (!b) return "–"; var w = b.x1 - b.x0, h = b.y1 - b.y0; return w + " × " + h + " (" + nf(w * CELL_M, 1) + " × " + nf(h * CELL_M, 1) + " m)"; }
  // Environment-Panel: Liste erst beim ersten Öffnen zeichnen (Vorschaubilder kosten etwas), danach nur Zustand abgleichen
  function envSync(r) {
    var list = r.querySelector(".sr-envlist");
    if (list && !list.childElementCount) list.innerHTML = ENV_IDS.map(function (id) { return '<button type="button" class="sr-blk sr-envb" data-env="' + id + '" title="' + ENV[id].n[lang] + '"><img alt="" src="' + envThumb(id) + '"><span>' + ENV[id].sn[lang] + "</span></button>"; }).join("");
    r.querySelectorAll("[data-env]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-env") === S.envSel && S.tool === "build")); });
    r.querySelectorAll("[data-envl]").forEach(function (b) { b.setAttribute("aria-pressed", String(+b.getAttribute("data-envl") === S.envL)); });
    var si = r.querySelector("#sr-env-s"), ri = r.querySelector("#sr-env-r");
    if (si && document.activeElement !== si) si.value = Math.round(Math.log2(S.envS) * 100); if (ri && document.activeElement !== ri) ri.value = S.envR;
    set("sr-env-sv", "× " + nf(S.envS, 2)); set("sr-env-rv", S.envR + "°");
    var rb = r.querySelector('[data-act="env-rnd"]'); if (rb) { rb.textContent = t("envRnd") + ": " + t(S.envRnd ? "envOn" : "envOff"); rb.setAttribute("aria-pressed", String(!!S.envRnd)); }
  }
  function info() {
    var st = stats(S.blocks), R = rooms(S.blocks), comps = components(S.blocks), main = comps.length ? comps.reduce(function (a, b) { return mainScore(b) > mainScore(a) ? b : a; }) : [];
    var loose = S.blocks.length - main.length, m = st.mass || 1;
    function row(l, v) { return "<div><span>" + l + "</span><b>" + v + "</b></div>"; }
    function acc(i) { return st.thr[i] ? nf(st.thr[i]) + " kN · " + nf(st.thr[i] / m, 1) + " m/s²" : "–"; }
    var warn = [];
    var isSt = S.ed === "station" && !st.cock;   // Strukturen ohne Cockpit brauchen weder Gyroskop noch Triebwerke; mit Cockpit (Missionsschiff) volle Werte
    if (!st.cock && !isSt) warn.push(t("wNoCock"));
    if (!st.gyro && !isSt) warn.push(t("wNoGyro"));
    var miss = [[0, "dF"], [2, "dB"], [3, "dL"], [1, "dR"]].filter(function (q) { return !st.thr[q[0]]; }).map(function (q) { return t(q[1]); });
    if (miss.length && !isSt) warn.push(fmt(t("wNoThr"), { d: miss.join(", ") }));
    var leaks = R.filter(function (x) { return !x.ok; }).length; if (leaks) warn.push(fmt(t("wLeak"), { n: leaks }));
    if (loose > 0) warn.push(fmt(t("wLoose"), { n: loose }));
    if (!st.cap && !st.prod) warn.push(t("wNoPow"));
    var wdeg = st.torque ? nf(st.torque / Math.max(1, st.I) * 57.3) + " °/s²" : "–";
    document.getElementById("sr-info").innerHTML =
      "<h4>" + t("sBlocks") + "</h4>" + row(t("sBlocks"), nf(st.n)) + row(t("sMass"), nf(st.mass * 1000) + " kg") + row(t("sCost"), cr(st.cost || 0) + '<br><small style="color:#7FD3A4;font-weight:400">' + t("costFree") + "</small>") +
      row(t("sDim"), dimTxt()) + row(t("sCom"), t("comHint")) +
      (S.ed === "station" ? "<h4>" + t("envCount") + "</h4>" + row(t("envBack"), nf(S.env.filter(function (e) { return e.l === -1; }).length)) + row(t("envGame"), nf(S.env.filter(function (e) { return e.l === 0; }).length)) + row(t("envFront"), nf(S.env.filter(function (e) { return e.l === 1; }).length)) : "") +
      (isSt ? "" : "<h4>" + t("sThr") + "</h4>" + row("↑ " + t("dF"), acc(0)) + row("↓ " + t("dB"), acc(2)) + row("← " + t("dL"), acc(3)) + row("→ " + t("dR"), acc(1)) +
      "<h4>" + t("sGyro") + "</h4>" + row("Gyro", st.gyro ? st.gyro + " × · " + wdeg : "–")) +
      (isSt && !st.mg && !st.ms && !st.rg && !st.gun ? "" : weapTxt()) +
      "<h4>" + t("sCool") + "</h4>" + row(t("sCoolW"), coolTxt()) + row("Overcharge", nf(ocMaxOf(S.blocks, coolMap(S.blocks)), 1) + " s") +
      "<h4>" + t("sEn") + "</h4>" + row(t("sProd"), nf(st.prod) + " E/s") + row(t("sStore"), nf(st.cap) + " E") + row(t("sUse"), nf(st.use) + " E/s") +
      "<h4>" + t("sRooms") + "</h4><p class='" + (leaks ? "bad" : "ok") + "'>" + (R.length ? fmt(t("okRooms"), { n: R.length - leaks }) + (leaks ? " · " + leaks + " ✕" : "") + " · " + fmt(t("roomCells"), { n: R.reduce(function (a, r) { return a + r.cells.length; }, 0) }) : t("noRooms")) + "</p>" +
      (warn.length ? "<ul class='sr-warn'>" + warn.map(function (w) { return "<li>" + w + "</li>"; }).join("") + "</ul>" : "");
  }

  function inCombat() {
    var me = FL.me, rg = antRange(me), mv = minView();
    return FL.bodies.some(function (bd) {
      if (!bd.enemy || bd.dead || bd.disarmed) return false;
      if (Math.abs(bd.x - me.x) < mv.hw + bd.rad && Math.abs(bd.y - me.y) < mv.hh + bd.rad) return true;   // im ganz herausgezoomten Bild
      return rg > 0 && Math.hypot(bd.x - me.x, bd.y - me.y) < rg;   // im Antennenradar
    });
  }
  function tipTick(dt) {
    var el = V.root.querySelector(".sr-tip"); if (!el) return;
    if (inCombat()) { FL.tipT = 0; if (!el.hidden) hideTip(el); return; }
    FL.tipT = (FL.tipT || 0) + dt;
    if (FL.tipT >= TIP.every) {
      FL.tipT = 0; var L = TIPS[lang], i; do { i = Math.floor(Math.random() * L.length); } while (L.length > 1 && i === FL.tipLast); FL.tipLast = i;
      el.textContent = L[i]; el.hidden = false; el.classList.remove("out"); void el.offsetWidth; el.classList.add("in");
      clearTimeout(V.tipTo); V.tipTo = setTimeout(function () { if (V) hideTip(el); }, TIP.show * 1000);
    }
  }
  function hideTip(el) { clearTimeout(V.tipTo); el.classList.remove("in"); el.classList.add("out"); setTimeout(function () { if (V && el.classList.contains("out")) el.hidden = true; }, 400); }
