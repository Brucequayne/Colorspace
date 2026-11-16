  // ===== 32-autodrehen.js · Auto-Drehen beim Bauen (v0.57.5) =====
  // Das Bausystem probiert alle vier Drehungen und nimmt die, die am besten passt:
  //  + Seiten, die an Nachbarblöcke anschließen (z. B. Montageseite eines Triebwerks, Schrägen der Rampen)
  //  + Seiten ohne Anschluss (Düse, Mündung), die ins Freie zeigen
  //  − Seiten ohne Anschluss, die gegen einen Block stoßen (Düse gegen die Hülle)
  //  Triebwerke: Düse lieber vom Schiff weg; Waffen und Laser: Mündung lieber nach vorn (Flugrichtung).
  // Gleichstand: die zuletzt gewählte Drehung (S.r). Spiegeln (S.f) bleibt, wie man es eingestellt hat.
  var SET = { auto: true, air: true, tips: true, sfx: 1 };   // Einstellungen (74-menue.js lädt und speichert sie)
  var AR_C = { ref: null, n: -1, M: null, cx: 0, cy: 0 };
  function arMap() {   // Karte der Blöcke, nur neu bei Änderungen (neue Liste oder andere Länge)
    if (AR_C.ref !== S.blocks || AR_C.n !== S.blocks.length) { var bb = S.blocks.length ? bounds(S.blocks) : null; AR_C = { ref: S.blocks, n: S.blocks.length, M: buildMap(S.blocks), cx: bb ? (bb.x0 + bb.x1) / 2 : 0, cy: bb ? (bb.y0 + bb.y1) / 2 : 0 }; }
    return AR_C;
  }
  function edRot(cx, cy) {
    if (!SET.auto || !S.sel || !T[S.sel] || !S.blocks.length) return [S.r, S.f];
    var A = arMap(), M = A.M, ty = T[S.sel], best = null, bs = -1e9;
    for (var r = 0; r < 4; r++) {
      var g = ghostAt(cx, cy, S.sel, r, S.f);
      if (!canPlace(g, M)) continue;
      var sc = r === S.r ? 0.6 : 0, conn = 0, own = new Set(cellsOf(g).map(function (q) { return key(q.c[0], q.c[1]); }));
      cellsOf(g).forEach(function (q) {
        for (var d = 0; d < 4; d++) {
          var nk = key(q.c[0] + DV[d][0], q.c[1] + DV[d][1]); if (own.has(nk)) continue;
          var o = M.get(nk), mine = edgeRule(ty, q.lx, q.ly, dirIn(g, d)).c;
          if (o) { var his = edgeRule(T[o.b.t], o.lx, o.ly, dirIn(o.b, (d + 2) % 4)).c; if (mine && his) { sc += 2; conn++; } else if (!mine) sc -= 3; }
          else if (!mine) sc += 0.4;
        }
      });
      if (!conn) continue;   // ohne Anschluss nicht wählbar
      var f = fp(g), bx = g.x + f[0] / 2 - A.cx, by = g.y + f[1] / 2 - A.cy, L = Math.hypot(bx, by) || 1;
      if (ty.kind === "thr") { var nd = DV[dirOut(g, 2)]; sc += 1.5 * (nd[0] * bx + nd[1] * by) / L; }
      if (ty.kind === "mg" || ty.kind === "rg" || ty.kind === "gun" || ty.kind === "ms" || ty.kind === "lsr") sc += dirOut(g, 0) === 0 ? 1.2 : 0;
      if (sc > bs) { bs = sc; best = r; }
    }
    return [best === null ? S.r : best, S.f];
  }
