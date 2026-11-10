  // ===== 70-ui.js · UI: HTML-Aufbau, Infofeld, Spieltipps-Anzeige =====
  // ---------- UI ----------
  function set(id, txt) { var e = document.getElementById(id); if (e && e.textContent !== txt) e.textContent = txt; }
  function note(txt) { var n = V.root.querySelector(".sr-note"); n.textContent = txt; n.hidden = false; clearTimeout(V.noteT); V.noteT = setTimeout(function () { if (V) n.hidden = true; }, 3200); }
  function icon(id) {
    var ty = T[id], cv = document.createElement("canvas"), s = 14, w = ty.w, h = ty.h, sc = Math.min(40 / (w * s), 40 / (h * s), 1.4);
    cv.width = 44; cv.height = 44; var c = cv.getContext("2d");
    c.translate(22 - w * s * sc / 2, 22 - h * s * sc / 2); c.scale(sc, sc);
    drawBlock(c, { t: id, x: 0, y: 0, r: 0, f: 0 }, s, "in", 1, 0);
    return cv.toDataURL();
  }
  // Kompakte Steuerungsliste (Taste · Aktion) für das Infofeld
  function ctlHtml() {
    var de = lang === "de", G = [
      [de ? "Im Sitz" : "Seated", [["WASD", de ? "Fliegen" : "Fly"], ["Q / E", de ? "Drehen" : "Rotate"], [de ? "Linksklick" : "Left click", de ? "Feuern" : "Fire"], ["R", de ? "Waffe wechseln" : "Switch weapon"], ["Z", de ? "Trägheitsdämpfer" : "Inertia dampers"], ["C", "Cruise Control"], ["X", "Overcharge"], [de ? "Umschalt" : "Shift", de ? "Hochgeschw. freigeben" : "Unlock high speed"], ["F", de ? "Aufstehen / Hinsetzen" : "Get up / sit down"], ["V", de ? "Innen / Außen" : "Inside / outside"], ["I", de ? "Inventar" : "Inventory"], ["P", de ? "Andocken / Abdocken" : "Dock / undock"]]],
      [de ? "Zu Fuß" : "On foot", [["WASD", de ? "Laufen" : "Walk"], [de ? "Umschalt" : "Shift", de ? "Sprinten" : "Sprint"], ["1–9", de ? "Werkzeug wählen" : "Select tool"], [de ? "Linksklick" : "Left click", de ? "1 Schweißen · 2 Pistole" : "1 weld · 2 pistol"], [de ? "F auf Luke" : "F on hatch", de ? "Aussteigen (auch durch die Decke)" : "Exit (also through the ceiling)"], [de ? "Offener Rand" : "Open edge", de ? "Direkt hinaus und hinein" : "Step straight out and in"]]],
      [de ? "Draußen" : "Outside", [["WASD", "Jetpack"], [de ? "Umschalt" : "Shift", de ? "Tempo ans Schiff" : "Match ship speed"], [de ? "F über Luke" : "F above hatch", de ? "Einsteigen" : "Get in"]]],
      ["Test", [[de ? "Rechtsklick" : "Right click", de ? "Block beschädigen" : "Damage block"], [de ? "Mausrad" : "Wheel", "Zoom"], ["Esc", de ? "Zurück zum Editor" : "Back to editor"]]]
    ];
    return '<div class="sr-ctl" hidden>' + G.map(function (g) { return "<small>" + g[0] + "</small><dl>" + g[1].map(function (r) { return "<dt>" + r[0] + "</dt><dd>" + r[1] + "</dd>"; }).join("") + "</dl>"; }).join("") + "</div>";
  }
  function html() {
    var pal = CATS.map(function (cat) {
      return '<div class="sr-cat"><h4>' + t(cat) + '</h4><div class="sr-grid">' + Object.keys(T).filter(function (id) { return T[id].cat === cat; }).map(function (id) {
        return '<button type="button" class="sr-blk" data-blk="' + id + '" data-kind="' + T[id].kind + '" title="' + T[id].n[lang] + " · " + kg(T[id].mass) + " · " + T[id].hp + " HP · " + cr(T[id].cost) + '"><img alt="" src="' + icon(id) + '"><span>' + T[id].n[lang] + "</span><small>" + kg(T[id].mass) + "</small></button>";
      }).join("") + "</div></div>";
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
      '<div class="sr-ed-only sr-tbar"><span class="sr-seg"><button type="button" data-act="ed-ship">' + t("edShip") + '</button><button type="button" data-act="ed-st">' + t("edSt") + '</button></span><input id="sr-name" class="sr-name" maxlength="28" spellcheck="false" placeholder="' + t("namePh") + '"><button type="button" data-act="undo">' + t("undo") + '</button><button type="button" data-act="starter">' + t("starter") + '</button><button type="button" data-act="clear">' + t("clear") + '</button><button type="button" data-act="exp">Export</button><button type="button" data-act="imp">Import</button><button type="button" data-act="npc">' + t("hangar") + '</button></div>' +
      '<div class="sr-sp"></div><div class="sr-seg"><button type="button" data-view="in">' + t("vIn") + '</button><button type="button" data-view="out">' + t("vOut") + '</button></div>' +
      '<button type="button" class="sr-go sr-ed-only" data-act="test">' + t("test") + ' ▸</button><button type="button" class="sr-go sr-fl-only" data-act="edit">◂ ' + t("toEd") + '</button></div>' +
      '<aside class="sr-pal sr-ed-only"><div class="sr-tools"><button type="button" data-tool="build">' + t("tBuild") + '</button><button type="button" data-tool="erase">' + t("tErase") + '</button><button type="button" data-tool="paint">' + t("tPaint") + '</button></div>' +
      '<div class="sr-paint"><label>' + t("color") + ' <input type="color" id="sr-col"></label><div class="sr-sws">' + sw + '</div></div>' +
      '<div class="sr-opts"><button type="button" data-act="rot">' + t("rot") + '</button><button type="button" data-act="flip">' + t("flip") + '</button><button type="button" data-act="sym">' + t("sym") + '</button><button type="button" data-act="symm" class="sr-symm"></button></div>' +
      '<div class="sr-list">' + pal + '</div></aside>' +
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
      '<div class="sr-io sr-exio" hidden><div class="sr-io-box"><div class="sr-io-h"></div><textarea spellcheck="false"></textarea><div class="sr-tbar"><button type="button" data-act="io-copy">' + (lang === "de" ? "Kopieren" : "Copy") + '</button><button type="button" data-act="io-load">' + (lang === "de" ? "Laden" : "Load") + '</button><span class="sr-sp"></span><button type="button" data-act="io-x">' + (lang === "de" ? "Schließen" : "Close") + '</button></div></div></div></div>';
  }
  function syncUI() {
    if (!V) return;
    var r = V.root, fly = S.mode === "fly";
    r.querySelector(".sr-root").classList.toggle("fly", fly);
    r.querySelectorAll("[data-tool]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-tool") === S.tool)); });
    r.querySelectorAll("[data-blk]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-blk") === S.sel && S.tool === "build")); });
    r.querySelectorAll("[data-view]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-view") === S.view)); });
    r.querySelector(".sr-root").classList.toggle("st", S.ed === "station");
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
  function coolTxt() { var cm = coolMap(S.blocks), w = 0, th = 0; cm.forEach(function (n, b) { var k = T[b.t].kind; if (k === "mg" || k === "rg") w++; if (k === "thr") th++; }); return w + " " + t("weap") + " · " + th + " " + t("thrs"); }
  function dimTxt() { var b = bounds(S.blocks); if (!b) return "–"; var w = b.x1 - b.x0, h = b.y1 - b.y0; return w + " × " + h + " (" + nf(w * CELL_M, 1) + " × " + nf(h * CELL_M, 1) + " m)"; }
  function info() {
    var st = stats(S.blocks), R = rooms(S.blocks), comps = components(S.blocks), main = comps.length ? comps.reduce(function (a, b) { return mainScore(b) > mainScore(a) ? b : a; }) : [];
    var loose = S.blocks.length - main.length, m = st.mass || 1;
    function row(l, v) { return "<div><span>" + l + "</span><b>" + v + "</b></div>"; }
    function acc(i) { return st.thr[i] ? nf(st.thr[i]) + " kN · " + nf(st.thr[i] / m, 1) + " m/s²" : "–"; }
    var warn = [];
    var isSt = S.ed === "station";   // Stationen brauchen weder Cockpit noch Gyroskop noch Triebwerke
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
      (isSt ? "" : "<h4>" + t("sThr") + "</h4>" + row("↑ " + t("dF"), acc(0)) + row("↓ " + t("dB"), acc(2)) + row("← " + t("dL"), acc(3)) + row("→ " + t("dR"), acc(1)) +
      "<h4>" + t("sGyro") + "</h4>" + row("Gyro", st.gyro ? st.gyro + " × · " + wdeg : "–")) +
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
