  // ===== 72-eingabe.js · Eingabe: Maus, Tastatur, Klicks auf Knöpfe, Regler =====
  // ---------- Eingabe ----------
  function worldMouse(e) {
    var r = V.cv.getBoundingClientRect(), s = PX * V.zoom;
    return { sx: e.clientX - r.left, sy: e.clientY - r.top, x: V.cam.x + (e.clientX - r.left - V.W / 2) / s, y: V.cam.y + (e.clientY - r.top - V.H / 2) / s };
  }
  function onDown(e) {
    V.cv.focus && V.cv.focus();
    var m = worldMouse(e); V.mouse = m;
    if (S.mode === "fly") {
      audioInit();
      if (e.button === 0) { FL.fire = true; if (!FL.seated && FL.slot === 2) firePistol(); }
      if (e.button === 2) { var ppm = PX * V.zoom / CELL_M, wx = FL.cam.x + (m.sx - V.W / 2) / ppm, wy = FL.cam.y + (m.sy - V.H / 2) / ppm, h = hitAt(wx, wy, null); if (h) { damage(h.bd, h.b, T[h.b.t].hp * 0.26, wx, wy); spark(wx, wy, 6); } }
      return;
    }
    if (e.button === 1 || (e.button === 0 && V.space)) { V.pan = { x: e.clientX, y: e.clientY, cx: V.cam.x, cy: V.cam.y }; e.preventDefault(); return; }
    var cx = Math.floor(m.x), cy = Math.floor(m.y);
    V.down = e.button;
    if (e.button === 2) { if (eraseAt(cx, cy)) syncUI(); V.lastCell = key(cx, cy); return; }
    if (e.button !== 0) return;
    if (S.tool === "build") { V.row = { sx: cx, sy: cy, ex: cx, ey: cy, area: e.shiftKey }; }
    else if (S.tool === "erase") { if (eraseAt(cx, cy)) syncUI(); }
    else if (S.tool === "paint") { if (paintAt(cx, cy)) syncUI(); }
    V.lastCell = key(cx, cy);
  }
  function onMove(e) {
    if (!V) return;
    var m = worldMouse(e);
    if (S.mode === "fly") { if (e.shiftKey) FL.mdx += e.movementX || 0; V.mouse = m; return; }
    if (V.pan) { var s = PX * V.zoom; V.cam.x = V.pan.cx - (e.clientX - V.pan.x) / s; V.cam.y = V.pan.cy - (e.clientY - V.pan.y) / s; return; }
    V.mouse = m;
    if (V.down === undefined || V.down === null) return;
    if (V.row) V.row.area = e.shiftKey;
    var cx = Math.floor(m.x), cy = Math.floor(m.y), kk = key(cx, cy); if (kk === V.lastCell) return; V.lastCell = kk;
    if (V.down === 2 || S.tool === "erase") { if (eraseAt(cx, cy)) syncUI(); }
    else if (S.tool === "paint") { if (paintAt(cx, cy)) syncUI(); }
    else if (S.tool === "build" && V.row) { V.row.ex = cx; V.row.ey = cy; }
  }
  function onUp(e) { if (!V) return; V.pan = null; V.down = null; if (FL) FL.fire = false; if (V.row) { placeRow(); V.row = null; syncUI(); } }
  function onWheel(e) { e.preventDefault(); var k = e.deltaY < 0 ? 1.12 : 1 / 1.12; V.zoom = Math.max(S.mode === "fly" ? ZMIN_FL : S.ed === "station" ? ZMIN_ST : 0.3, Math.min(3, V.zoom * k)); }
  function finishRename(ok) {
    var ib = V.root.querySelector(".sr-shipn-in"), bb = V.root.querySelector(".sr-shipn"); if (!ib || ib.hidden) return;
    if (ok && FL) { var v = ib.value.trim(); FL.me.name = v || t("shipDef"); S.names.ship = v; save(); }
    ib.hidden = true; bb.hidden = false; bb.classList.remove("edit"); ib.blur();
  }
  function onKey(e) {
    if (V && e.target.classList && e.target.classList.contains("sr-shipn-in")) { if (e.key === "Enter") finishRename(true); else if (e.key === "Escape") finishRename(false); e.stopPropagation(); return; }
    if (!V || e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    var k = e.key.toLowerCase();
    if (S.mode === "fly") {
      if (k === "i") { if (invOpen()) closeInv(); else openInv(); return; }
      if (k === "escape" && invOpen()) { closeInv(); return; }
      if (k === "escape") { stopTest(); return; }
      if (["w", "a", "s", "d", "q", "e"].indexOf(k) >= 0) { FL.keys[k] = true; e.preventDefault(); }
      if (k === "shift") { FL.keys.shift = true; if (!e.repeat && FL.seated && !FL.out) { FL.hiOk = !FL.hiOk; if (FL.hiOk) FL.ca = Math.max(FL.ca || 0, 0.3); floatTxt(t(FL.hiOk ? "hiOn" : "hiOff")); } }
      if (e.repeat) return;
      // zu Fuß und draußen: Zahlentasten wählen das Werkzeug; Schiffstasten wirken nur im Cockpit
      if (!FL.seated && /^[1-9]$/.test(k)) { FL.slot = +k; syncHot(); return; }
      if (k === "f") { toggleSeat(); return; }
      if (k === "v" || k === "tab") { S.view = S.view === "in" ? "out" : "in"; syncUI(); e.preventDefault(); return; }
      if (!FL.seated) return;
      if (k === "z") FL.damp = !FL.damp;
      if (k === "p") { if (!FL.out) dockKey(); return; }
      if (k === "c") { FL.cruise = !FL.cruise; floatTxt(t(FL.cruise ? "crFloatOn" : "crFloatOff")); }
      if (k === "x") { if (FL.oc) { FL.oc = false; floatTxt(t("ocOff"), "201,160,245"); } else if (FL.ocT > 0.3) { FL.oc = true; floatTxt(t("ocOn"), "201,160,245"); } }
      if (k === "r" && FL.groups.length) FL.wsel = (FL.wsel + 1) % FL.groups.length;
      if (k === "f") toggleSeat();
      if (k === "v" || k === "tab") { S.view = S.view === "in" ? "out" : "in"; syncUI(); e.preventDefault(); }
      return;
    }
    if (k === " ") { V.space = true; e.preventDefault(); return; }
    if ((e.ctrlKey || e.metaKey) && k === "z") { undo(); e.preventDefault(); return; }
    if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].indexOf(k) >= 0) { V.keys[k] = true; e.preventDefault(); return; }
    if (e.repeat) return;
    if (k === "r") { S.r = (S.r + (e.shiftKey ? 3 : 1)) % 4; syncUI(); }
    else if (k === "f") { S.f = S.f ? 0 : 1; syncUI(); }
    else if (k === "m") { cycleSym(); syncUI(); }
    else if (k === "v" || k === "tab") { S.view = S.view === "in" ? "out" : "in"; syncUI(); e.preventDefault(); }
    else if (k === "1") { S.tool = "build"; syncUI(); } else if (k === "2") { S.tool = "erase"; syncUI(); } else if (k === "3") { S.tool = "paint"; syncUI(); }
  }
  function onKeyUp(e) {
    if (!V) return; var k = e.key.toLowerCase();
    if (k === " ") V.space = false;
    if (FL) { FL.keys[k] = false; if (k === "shift") FL.keys.shift = false; }
    V.keys[k] = false;
  }
  function undo() { var u = S.undo.pop(); if (!u) return; S.blocks = JSON.parse(u); save(); syncUI(); }
  function onClick(e) {
    var a = e.target.closest("[data-act]"), tl = e.target.closest("[data-tool]"), bk = e.target.closest("[data-blk]"), vw = e.target.closest("[data-view]"), sw = e.target.closest("[data-sw]");
    if (tl) { S.tool = tl.getAttribute("data-tool"); syncUI(); return; }
    if (bk) { S.sel = bk.getAttribute("data-blk"); S.tool = "build"; syncUI(); return; }
    if (vw) { S.view = vw.getAttribute("data-view"); syncUI(); return; }
    if (sw) { S.color = sw.getAttribute("data-sw"); S.tool = "paint"; save(); syncUI(); return; }
    if (e.target.closest(".sr-tip")) { hideTip(e.target.closest(".sr-tip")); return; }
    var spb = e.target.closest("[data-spawn]");
    if (spb) { spawnEnemy(+spb.getAttribute("data-spawn")); spb.blur(); return; }
    var nb = e.target.closest("[data-npc]");
    if (nb) { var sh = NPC.filter(function (q) { return String(q.id) === nb.getAttribute("data-npc"); })[0]; if (sh) { setEd("ship"); pushUndo(); S.blocks = npcBlocks(sh); if (sh.code.color) S.color = sh.code.color; save(); fitCam(); V.root.querySelector(".sr-npc").hidden = true; syncUI(); note(sh.n[lang] + (lang === "de" ? " geladen · Rückgängig holt dein Schiff zurück" : " loaded · Undo brings your ship back")); } return; }
    if (!a) return;
    var act = a.getAttribute("data-act");
    if (act === "rot") S.r = (S.r + 1) % 4;
    else if (act === "flip") S.f = S.f ? 0 : 1;
    else if (act === "sym") S.sym = !S.sym;
    else if (act === "symm") { S.symGap = !S.symGap; S.sym = true; save(); }
    else if (act === "undo") undo();
    else if (act === "clear") { pushUndo(); S.blocks = []; save(); }
    else if (act === "starter") { pushUndo(); S.blocks = S.ed === "station" ? starterStation() : starter(); save(); fitCam(); }
    else if (act === "exp" || act === "imp") { openIO(act); return; }
    else if (act === "npc") { openHangar(); return; }
    else if (act === "ed-ship") { setEd("ship"); return; }
    else if (act === "ed-st") { setEd("station"); return; }
    else if (act === "inv") { openInv(); return; }
    else if (act === "shfill") { if (FL) setShield(FL.shPct); a.blur(); return; }
    else if (act === "inv-x") { closeInv(); return; }
    else if (act === "rename") { var ib = V.root.querySelector(".sr-shipn-in"), bb = V.root.querySelector(".sr-shipn"); bb.classList.add("edit"); bb.hidden = true; ib.hidden = false; ib.value = FL.me.name || ""; ib.focus(); ib.select(); return; }
    else if (act === "ctl") { var cp = V.root.querySelector(".sr-ctl"), cb = V.root.querySelector(".sr-ctlb"); cp.hidden = !cp.hidden; cb.setAttribute("aria-pressed", String(!cp.hidden)); if (!cp.hidden) V.root.querySelector(".sr-hud").scrollTop = 1e5; cb.blur(); return; }
    else if (act === "npc-x") { V.root.querySelector(".sr-npc").hidden = true; return; }
    else if (act === "io-x") { V.root.querySelector(".sr-exio").hidden = true; return; }
    else if (act === "io-copy") { var ta = V.root.querySelector(".sr-exio textarea"); ta.select(); try { navigator.clipboard.writeText(ta.value).then(function () { note(lang === "de" ? "Schiffscode kopiert." : "Ship code copied."); }, function () {}); } catch (er) {} return; }
    else if (act === "dev-x") { V.root.querySelector(".sr-dev").hidden = true; return; }
    else if (act === "dev-lock") { devLock(); return; }
    else if (act === "io-txt") { saveTxt(V.root.querySelector(".sr-exio textarea").value); return; }
    else if (act === "io-open") { V.root.querySelector(".sr-io-file").click(); return; }
    else if (act === "io-load") { var bl = parseShip(V.root.querySelector(".sr-exio textarea").value); if (bl && S.ed !== "station") bl = bl.filter(function (b) { return !T[b.t].dev; });   /* Dev-Bauteile nur im Developer Tool */ if (!bl) { note(lang === "de" ? "Code ungültig." : "Invalid code."); return; } pushUndo(); S.blocks = bl; save(); fitCam(); V.root.querySelector(".sr-exio").hidden = true; note(lang === "de" ? "Schiff geladen (" + bl.length + " Blöcke)." : "Ship loaded (" + bl.length + " blocks)."); }
    else if (act === "test") { startTest(); return; }
    else if (act === "edit") { stopTest(); return; }
    else if (act === "targets") { if (FL) spawnTargets(); return; }
    else if (act === "seat") { if (FL) toggleSeat(); a.blur(); return; }
    syncUI();
  }
  function onInput(e) {
    if (e.target.id === "sr-col") { S.color = e.target.value; S.tool = "paint"; save(); syncUI(); }
    if (e.target.id === "sr-uis") { hudScale(+e.target.value); try { localStorage.setItem("spacerogue-ui", String(V.uis)); } catch (er) {} }
    if (e.target.id === "sr-shp" && FL) setShield(+e.target.value);
    if (e.target.id === "sr-name") { S.names[S.ed] = e.target.value.trim(); save(); }
    if (e.target.classList && e.target.classList.contains("sr-dev-in")) {   // Code: sobald 6 Ziffern drin sind, wird geprüft
      var dv = e.target.value.replace(/\D/g, "").slice(0, 6), dm = V.root.querySelector(".sr-dev-msg"); if (dv !== e.target.value) e.target.value = dv; dm.textContent = "";
      if (dv.length === 6) {
        if (devTry(dv)) { V.root.querySelector(".sr-dev").hidden = true; e.target.value = ""; note(t("devOn")); setEd("station"); }
        else { dm.textContent = t("devBad"); e.target.value = ""; }
      }
    }
  }
  // Infofeld skalieren: CSS-zoom statt Bild-Skalierung, Schrift und Symbole bleiben gestochen scharf (100 bis 150 %)
  function hudScale(k) {
    if (!V) return; k = Math.max(1, Math.min(1.5, k || 1)); V.uis = k;
    var h = V.root.querySelector(".sr-hud"), sl = V.root.querySelector("#sr-uis"), lb = V.root.querySelector("#sr-uis-v");
    if (h) { h.style.zoom = k; h.style.top = (64 / k) + "px"; h.style.left = (12 / k) + "px"; h.style.maxHeight = Math.max(200, ((V.H || 800) - 64 - 52) / k) + "px"; }
    if (sl && +sl.value !== k) sl.value = k; if (lb) lb.textContent = Math.round(k * 100) + " %";
  }
  function fitCam() { var b = bounds(S.blocks); if (!b) { V.cam = { x: 0.5, y: 0 }; return; } V.cam = { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 }; }

