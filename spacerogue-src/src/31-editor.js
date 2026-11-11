  // ===== 31-editor.js · Editor: Platzieren, Symmetrie, Reihen, Abreißen, Malen =====
  // ---------- Editor: Platzieren ----------
  function ghostAt(cx, cy, tid, r, f) {
    var ty = T[tid], w = r % 2 ? ty.h : ty.w, h = r % 2 ? ty.w : ty.h;
    return { t: tid, x: cx - Math.floor((w - 1) / 2), y: cy - Math.floor((h - 1) / 2), r: r, f: f };
  }
  // Zwei Achsen: im Block (Mitte von Spalte 0, für ungerade Breiten wie das 3er-Cockpit) oder zwischen Blöcken (zwischen Spalte −1 und 0, für gerade Breiten wie 2er-Blöcke)
  function symAx() { return S.symGap ? 0 : 0.5; }
  function mirrorOf(b) { var f = fp(b); return { t: b.t, x: 2 * symAx() - b.x - f[0], y: b.y, r: (4 - b.r) % 4, f: 1 - b.f, c: b.c }; }
  function canPlace(b, M, extra) {
    var cs = cellsOf(b);
    for (var i = 0; i < cs.length; i++) { var k = key(cs[i].c[0], cs[i].c[1]); if (M.has(k) && !replaceable(b.t, M.get(k))) return false; if (extra && extra.has(k)) return false; }
    if (!S.blocks.length && !extra) return true;
    return linked(M, b).length > 0 || (extra && extra.size > 0 && linkedTo(M, b, extra));
  }
  function linkedTo(M, b, extraMap) { var M2 = new Map(M); extraMap.forEach(function (v, k) { M2.set(k, v); }); return linked(M2, b).length > 0; }
  function placeList(g) {
    var list = [g];
    if (S.sym) { var mg = mirrorOf(g); if (mg.x !== g.x || mg.r !== g.r || mg.f !== g.f) list.push(mg); }
    // Spiegelbild deckt sich mit dem Original: nur einmal setzen
    if (list.length === 2) { var a = new Set(cellsOf(list[0]).map(function (q) { return key(q.c[0], q.c[1]); })); if (cellsOf(list[1]).some(function (q) { return a.has(key(q.c[0], q.c[1])); })) list.pop(); }
    return list;
  }
  function tryPlace(g, noUndo) {
    var M = buildMap(S.blocks), list = placeList(g), first = S.blocks.length === 0;
    var okA = first || canPlace(list[0], M);
    if (!okA) return false;
    var extra = new Map(); cellsOf(list[0]).forEach(function (q) { extra.set(key(q.c[0], q.c[1]), { b: list[0], lx: q.lx, ly: q.ly }); });
    var okB = list[1] ? canPlaceWith(list[1], M, extra) : false;
    var price = RUN ? runPrice(list, okB) : 0; if (RUN && price > RUN.credits) { runPoor(); return false; }   // Werft: Bauteile kosten Credits
    if (!noUndo) pushUndo();
    if (RUN) RUN.credits -= price;
    var put = [list[0]]; if (list[1] && okB) put.push(list[1]);
    // Böden unter dem neuen Teil werden ersetzt
    var under = new Set(); put.forEach(function (q) { cellsOf(q).forEach(function (c) { under.add(key(c.c[0], c.c[1])); }); });
    if (T[g.t].kind !== "floor") S.blocks = S.blocks.filter(function (q) { return !(T[q.t].kind === "floor" && under.has(key(q.x, q.y))); });
    put.forEach(function (q) { S.blocks.push(clean(q)); });
    save(); return true;
  }
  // Reihe: vom Startfeld in Zugrichtung (waagerecht oder senkrecht), Abstand = Größe des Teils
  function rowList() {
    var R0 = V.row; if (!R0) return [];
    var ty = T[S.sel], fw = S.r % 2 ? ty.h : ty.w, fh = S.r % 2 ? ty.w : ty.h, dx = R0.ex - R0.sx, dy = R0.ey - R0.sy, out = [];
    if (R0.area && S.ed === "station") {   // Stations-Editor: mit Umschalt eine ganze Fläche ziehen
      var nx = Math.floor(Math.abs(dx) / fw) + 1, ny = Math.floor(Math.abs(dy) / fh) + 1, gx = dx < 0 ? -1 : 1, gy = dy < 0 ? -1 : 1;
      for (var j = 0; j < Math.min(ny, 40); j++) for (var i2 = 0; i2 < Math.min(nx, 40); i2++) out.push(ghostAt(R0.sx + gx * fw * i2, R0.sy + gy * fh * j, S.sel, S.r, S.f));
      return out;
    }
    var horiz = Math.abs(dx) >= Math.abs(dy), step = horiz ? fw : fh, n = Math.floor(Math.abs(horiz ? dx : dy) / step) + 1, sg = (horiz ? dx : dy) < 0 ? -1 : 1;
    for (var i = 0; i < Math.min(n, 60); i++) out.push(ghostAt(R0.sx + (horiz ? sg * step * i : 0), R0.sy + (horiz ? 0 : sg * step * i), S.sel, S.r, S.f));
    return out;
  }
  function placeRow() {
    var L = rowList(), n = 0; if (!L.length) return;
    pushUndo();
    for (var pass = 0; pass < (L.length > 60 ? 6 : 2); pass++) L.forEach(function (g) { if (!g.done && tryPlace(g, true)) { g.done = true; n++; } });   // zweiter Durchgang für Teile, die erst über Nachbarn Anschluss finden
    if (!n) { S.undo.pop(); if (S.blocks.length) note(RUN && performance.now() - (RUN.poorT || -1e9) < 250 ? t("runPoor") : lang === "de" ? "Hier passt der Block nicht oder hat keinen Anschluss." : "The block does not fit here or has no connection."); }
  }
  function canPlaceWith(b, M, extra) {
    var cs = cellsOf(b);
    for (var i = 0; i < cs.length; i++) { var k = key(cs[i].c[0], cs[i].c[1]); if ((M.has(k) && !replaceable(b.t, M.get(k))) || extra.has(k)) return false; }
    return linkedTo(M, b, extra);
  }
  function clean(b) { return { t: b.t, x: b.x, y: b.y, r: b.r, f: b.f }; }
  function blockAt(cx, cy, M) { var o = (M || buildMap(S.blocks)).get(key(cx, cy)); return o ? o.b : null; }
  // M schaltet durch: aus → im Block → zwischen Blöcken → aus
  function cycleSym() { if (!S.sym) { S.sym = true; S.symGap = false; } else if (!S.symGap) S.symGap = true; else S.sym = false; save(); }
  function mirrorCell(cx) { return S.symGap ? -1 - cx : -cx; }
  function eraseAt(cx, cy) {
    var M = buildMap(S.blocks), b = blockAt(cx, cy, M); if (!b) return false;
    pushUndo();
    var kill = [b]; if (S.sym) { var o = blockAt(mirrorCell(cx), cy, M); if (o && o !== b) kill.push(o); }
    if (RUN) kill.forEach(function (q) { RUN.credits += runRefund(q); });   // Werft: Erstattung nach Zustand des Blocks
    S.blocks = S.blocks.filter(function (q) { return kill.indexOf(q) < 0; }); save(); return true;
  }
  function paintAt(cx, cy) {
    var M = buildMap(S.blocks), b = blockAt(cx, cy, M); if (!b) return false;
    var list = [b]; if (S.sym) { var o = blockAt(mirrorCell(cx), cy, M); if (o && o !== b) list.push(o); }
    if (list.every(function (q) { return q.c === S.color; })) return false;
    pushUndo(); list.forEach(function (q) { q.c = S.color; }); save(); return true;
  }

