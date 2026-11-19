  // ===== 48-events.js · Eventmarker (Developer Tool, seit v0.59) =====
  // Tab "Events" im Developer Tool: Noah setzt nummerierte Marker in die Szene. Die Nummer ist die Reihenfolge der Mission
  // (der erste gesetzte ist Event 1). Jeder Marker hat einen Auslöser aus einer festen Liste, einen Radius (Meter), bei
  // "Zeit" Sekunden nach dem vorigen Event, optional ein Ziel (Block der Struktur oder eine aufgenommene Spur) und einen
  // freien Text, was passieren soll. Die Missionslogik daraus entsteht später (v0.6); hier wird nur gesetzt, gezeigt und exportiert.
  // Koordinaten wie das Environment: Zellen der Szene (Ebene 0). Im Testflug liegt Zelle (0,0) bei FL.O.
  Object.assign(TX, {
    tabEv: L2("Events", "Events"), evH: L2("Eventmarker", "Event markers"),
    evHelp: L2("Klick setzt den nächsten Marker, die Nummer ist die Reihenfolge. Ziehen verschiebt, am Ring ziehen ändert den Radius, Rechtsklick löscht.", "Click places the next marker, its number is the order. Drag to move, drag the ring to change the radius, right-click deletes."),
    evNone: L2("Noch keine Marker.", "No markers yet."), evNr: L2("Nummer", "Number"), evK: L2("Auslöser", "Trigger"), evR: L2("Radius (m)", "Radius (m)"), evS: L2("Sekunden nach dem vorigen Event", "Seconds after the previous event"),
    evTgt: L2("Ziel", "Target"), evTxt: L2("Was passiert?", "What happens?"), evDel: L2("Marker löschen", "Delete marker"),
    evTxtPh: L2("z. B. Funkspruch: „Alarm! Alle auf die Stationen!“ · danach Spur „Pirat Anflug“ · Musik wechselt auf Kampf", "e.g. radio: “Alert! Everyone to their stations!” · then track “Pirate approach” · music switches to combat"),
    evBlk: L2("Block", "Block"), evNoBlk: L2("Marker auf einen Block der Struktur ziehen oder eine Spur wählen", "Drag the marker onto a block of the structure or pick a track"), evTrk: L2("oder Spur", "or track"), evTrk0: L2("– keine –", "– none –"),
    ev_start: L2("Missionsstart", "Mission start"), ev_ort: L2("Ort erreichen", "Reach area"), ev_zeit: L2("Zeit", "Time"), ev_zerst: L2("Ziel zerstören", "Destroy target"), ev_repar: L2("Block reparieren", "Repair block"),
    ev_dock: L2("Andocken", "Dock"), ev_raum: L2("Raum betreten", "Enter room"), ev_wrack: L2("Wrack finden", "Find wreck"), ev_frei: L2("Sonstiges (im Text)", "Other (in the text)")
  });
  var EVK = ["start", "ort", "zeit", "zerst", "repar", "dock", "raum", "wrack", "frei"];
  var EV_COL = { start: "#57D18A", ort: "#7FB2E0", zeit: "#C9A0F5", zerst: "#E0533F", repar: "#E3B83F", dock: "#5FD0D8", raum: "#8FD06A", wrack: "#D89A5A", frei: "#B9C4D4" };
  var EV_BOUND = { zerst: 1, repar: 1, dock: 1, raum: 1, wrack: 1 };   // Auslöser, die sich auf ein Objekt beziehen
  function evL() { return S.ev || (S.ev = []); }
  function evRenum() { evL().forEach(function (m, i) { m.n = i + 1; }); }
  function r2(v) { return Math.round(v * 100) / 100; }
  function evPack(m) { var o = { n: m.n, k: m.k, x: r2(m.x), y: r2(m.y), r: r2(m.r), txt: m.txt || "" }; if (m.k === "zeit") o.s = m.s || 0; if (m.b) o.b = m.b; if (m.trk) o.trk = m.trk; return o; }
  function evUnpack(o) {
    if (!o || !isFinite(+o.x) || !isFinite(+o.y)) return null;
    var m = { n: +o.n || 0, k: EVK.indexOf(o.k) >= 0 ? o.k : "ort", x: +o.x, y: +o.y, r: Math.max(1, Math.min(5000, +o.r || 10)), txt: String(o.txt || "").slice(0, 4000) };
    if (m.k === "zeit") m.s = Math.max(0, Math.min(3600, +o.s || 0));
    if (Array.isArray(o.b) && o.b.length === 2) m.b = [o.b[0] | 0, o.b[1] | 0]; if (o.trk) m.trk = +o.trk || 0;
    return m;
  }
  function parseEv(txt) { try { var o = JSON.parse(String(txt).trim()); return o && Array.isArray(o.ev) ? o.ev.map(evUnpack).filter(Boolean).sort(function (a, b) { return a.n - b.n; }) : null; } catch (e) { return null; } }
  // Bildschirm ↔ Szene (wie Environment-Ebene 0)
  function evScr(m) { var s = PX * V.zoom; return { x: V.W / 2 + (m.x - V.cam.x) * s, y: V.H / 2 + (m.y - V.cam.y) * s, r: m.r / CELL_M * s }; }
  function evPick(sx, sy) {
    var L = evL();
    for (var i = L.length - 1; i >= 0; i--) { var p = evScr(L[i]); if (Math.hypot(sx - p.x, sy - p.y) < 15) return { i: i, part: "c" }; }
    for (i = L.length - 1; i >= 0; i--) { var q = evScr(L[i]), d = Math.hypot(sx - q.x, sy - q.y); if (Math.abs(d - q.r) < 7) return { i: i, part: "r" }; }
    return null;
  }
  // Marker an den Block darunter hängen (nur bei Auslösern, die ein Objekt brauchen)
  function evAttach(m) {
    if (!EV_BOUND[m.k]) { delete m.b; return; }
    var hb = blockAt(Math.floor(m.x), Math.floor(m.y), buildMap(S.blocks)); if (hb) m.b = [hb.x, hb.y];
  }
  function evBlock(m) { if (!m.b) return null; for (var i = 0; i < S.blocks.length; i++) if (S.blocks[i].x === m.b[0] && S.blocks[i].y === m.b[1]) return S.blocks[i]; return null; }
  // ---------- Eingabe im Editor ----------
  function evDown(e, m) {
    var h = evPick(m.sx, m.sy), L = evL();
    if (e.button === 2) { if (h) { pushUndo(); L.splice(h.i, 1); evRenum(); if (V.evSel >= L.length) V.evSel = L.length - 1; save(); syncUI(); } return; }
    if (e.button !== 0) return;
    if (h) { V.evSel = h.i; pushUndo(); V.evDrag = { i: h.i, part: h.part, dx: L[h.i].x - m.x, dy: L[h.i].y - m.y }; syncUI(); return; }
    pushUndo();
    var nm = { n: L.length + 1, k: L.length ? "ort" : "start", x: m.x, y: m.y, r: 10, txt: "" };
    L.push(nm); V.evSel = L.length - 1; V.evDrag = { i: V.evSel, part: "c", dx: 0, dy: 0 }; save(); syncUI();
  }
  function evMove(m) {
    var d = V.evDrag, mk = evL()[d.i]; if (!mk) return;
    if (d.part === "c") { mk.x = m.x + d.dx; mk.y = m.y + d.dy; }
    else mk.r = Math.max(1, Math.min(5000, Math.round(Math.hypot(m.x - mk.x, m.y - mk.y) * CELL_M)));
  }
  function evUp() { var d = V.evDrag; V.evDrag = null; var mk = d && evL()[d.i]; if (mk) evAttach(mk); save(); syncUI(); }
  function evDelSel() { var L = evL(); if (V.evSel == null || V.evSel < 0 || !L[V.evSel]) return; pushUndo(); L.splice(V.evSel, 1); evRenum(); V.evSel = Math.min(V.evSel, L.length - 1); save(); syncUI(); }
  // Feld im Panel geändert
  function evField(f, v) {
    var L = evL(), m = L[V.evSel]; if (!m) return;
    if (f === "n") { var to = Math.max(1, Math.min(L.length, Math.round(+v) || 1)) - 1; if (to !== V.evSel) { pushUndo(); L.splice(V.evSel, 1); L.splice(to, 0, m); evRenum(); V.evSel = to; } save(); evSync(V.root, true); return; }
    if (f === "k") { pushUndo(); m.k = EVK.indexOf(v) >= 0 ? v : "ort"; if (m.k === "zeit" && m.s == null) m.s = 5; evAttach(m); save(); evSync(V.root, true); return; }
    if (f === "r") m.r = Math.max(1, Math.min(5000, +v || 1));
    else if (f === "s") m.s = Math.max(0, Math.min(3600, +v || 0));
    else if (f === "trk") { m.trk = +v || 0; if (!m.trk) delete m.trk; }
    else if (f === "txt") m.txt = String(v).slice(0, 4000);
    save(); evSync(V.root, false);
  }
  // ---------- Panel ----------
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function evSync(r, force) {
    var box = r.querySelector(".sr-evp"); if (!box) return;
    var L = evL(); if (V.evSel == null || V.evSel >= L.length) V.evSel = L.length - 1;
    var list = L.length ? L.map(function (m, i) {
      return '<button type="button" class="sr-evrow" data-evsel="' + i + '" aria-pressed="' + (i === V.evSel) + '"><b style="background:' + EV_COL[m.k] + '">' + m.n + '</b><span>' + t("ev_" + m.k) + (m.k === "zeit" ? " · " + nf(m.s || 0) + " s" : "") + "<small>" + esc((m.txt || "").slice(0, 60) || "–") + "</small></span></button>";
    }).join("") : '<p class="sr-envh">' + t("evNone") + "</p>";
    var lb = box.querySelector(".sr-evlist"); if (lb.innerHTML !== list) lb.innerHTML = list;
    var m = L[V.evSel], key = m ? [V.evSel, m.n, m.k, L.length, (REC.tracks || []).length].join(":") : "none", ed = box.querySelector(".sr-eved");
    if (!force && ed.getAttribute("data-k") === key) { if (m) { var bi = ed.querySelector(".sr-evb"); if (bi) bi.textContent = evTgtTxt(m); } return; }
    ed.setAttribute("data-k", key);
    if (!m) { ed.innerHTML = ""; return; }
    ed.innerHTML = '<div class="sr-evrw"><label><small>' + t("evNr") + '</small><input type="number" data-evf="n" min="1" max="' + L.length + '" value="' + m.n + '"></label>' +
      '<label class="sr-evk"><small>' + t("evK") + '</small><select data-evf="k">' + EVK.map(function (k) { return '<option value="' + k + '"' + (k === m.k ? " selected" : "") + ">" + t("ev_" + k) + "</option>"; }).join("") + "</select></label></div>" +
      (m.k === "zeit" ? '<label><small>' + t("evS") + '</small><input type="number" data-evf="s" min="0" max="3600" step="0.5" value="' + (m.s || 0) + '"></label>'
        : '<label><small>' + t("evR") + '</small><input type="number" data-evf="r" min="1" max="5000" value="' + m.r + '"></label>') +
      (EV_BOUND[m.k] ? '<label><small>' + t("evTgt") + '</small><span class="sr-evb">' + evTgtTxt(m) + '</span></label><label><small>' + t("evTrk") + '</small><select data-evf="trk"><option value="0">' + t("evTrk0") + "</option>" +
        (REC.tracks || []).map(function (q) { return '<option value="' + q.id + '"' + (q.id === m.trk ? " selected" : "") + ">" + esc(q.name) + "</option>"; }).join("") + "</select></label>" : "") +
      '<label><small>' + t("evTxt") + '</small><textarea data-evf="txt" rows="6" spellcheck="false" placeholder="' + esc(t("evTxtPh")) + '">' + esc(m.txt || "") + "</textarea></label>" +
      '<button type="button" data-act="ev-del" class="sr-evdel">' + t("evDel") + "</button>";
  }
  function evTgtTxt(m) { var b = evBlock(m); return b ? t("evBlk") + ": " + T[b.t].n[lang] + " (" + b.x + ", " + b.y + ")" : t("evNoBlk"); }
  // ---------- Zeichnen ----------
  function evMark(c, x, y, rr, m, al, sel, ppx) {   // ppx: Pixelgröße (1 im Editor, 1/ppm im Flug)
    var col = EV_COL[m.k];
    c.save(); c.globalAlpha = al;
    if (m.k !== "zeit" && m.k !== "start") {
      c.fillStyle = col + "18"; c.beginPath(); c.arc(x, y, rr, 0, 6.283); c.fill();
      c.strokeStyle = col; c.lineWidth = (sel ? 2.5 : 1.5) * ppx; c.setLineDash([7 * ppx, 5 * ppx]); c.beginPath(); c.arc(x, y, rr, 0, 6.283); c.stroke(); c.setLineDash([]);
      if (sel) { c.fillStyle = "#fff"; c.beginPath(); c.arc(x + rr, y, 4 * ppx, 0, 6.283); c.fill(); }
    }
    var R = 11 * ppx; c.fillStyle = "#0B1018"; c.beginPath(); c.arc(x, y, R + 2 * ppx, 0, 6.283); c.fill();
    c.fillStyle = col; c.beginPath(); c.arc(x, y, R, 0, 6.283); c.fill();
    if (sel) { c.strokeStyle = "#fff"; c.lineWidth = 2 * ppx; c.beginPath(); c.arc(x, y, R + 3.5 * ppx, 0, 6.283); c.stroke(); }
    c.fillStyle = "#0B1018"; c.font = "800 " + (12 * ppx) + "px " + FONTS(); c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(String(m.n), x, y + 0.5 * ppx);
    c.textAlign = "left"; c.font = "700 " + (11 * ppx) + "px " + FONTS(); c.fillStyle = "rgba(0,0,0,.6)";
    var lbl = t("ev_" + m.k) + (m.k === "zeit" ? " +" + (m.s || 0) + " s" : "");
    c.fillText(lbl, x + R + 6 * ppx + ppx, y + ppx); c.fillStyle = col; c.fillText(lbl, x + R + 6 * ppx, y);
    c.textBaseline = "alphabetic"; c.restore();
  }
  function evEdDraw(c) {
    if (S.ed !== "station" || !S.ev || !S.ev.length) return;
    var on = S.evTab, s = PX * V.zoom;
    S.ev.forEach(function (m, i) {
      var p = evScr(m);
      var b = on && evBlock(m); if (b) { var f = fp(b), bx = V.W / 2 + (b.x + f[0] / 2 - V.cam.x) * s, by = V.H / 2 + (b.y + f[1] / 2 - V.cam.y) * s; c.strokeStyle = EV_COL[m.k]; c.lineWidth = 1.5; c.setLineDash([3, 4]); c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(bx, by); c.stroke(); c.setLineDash([]); c.strokeRect(bx - f[0] * s / 2, by - f[1] * s / 2, f[0] * s, f[1] * s); }
      evMark(c, p.x, p.y, p.r, m, on ? 1 : 0.35, on && i === V.evSel, 1);
    });
    // Reihenfolge als dünne Linie
    if (on && S.ev.length > 1) { c.strokeStyle = "rgba(185,196,212,.25)"; c.lineWidth = 1; c.beginPath(); S.ev.forEach(function (m, i) { var p = evScr(m); if (i) c.lineTo(p.x, p.y); else c.moveTo(p.x, p.y); }); c.stroke(); }
  }
  // Im Testflug (nur Developer Tool) blass in der Welt; c ist in Metern
  function evFlDraw(c, ppm) {
    if (S.ed !== "station" || !S.ev || !S.ev.length || !FL.O) return;
    S.ev.forEach(function (m) { evMark(c, FL.O.x + m.x * CELL_M, FL.O.y + m.y * CELL_M, m.r, m, 0.45, false, 1 / ppm); });
  }
