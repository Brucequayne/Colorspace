  // ===== 20-schiffslogik.js · Schiffslogik: Geometrie, Verbindungen, Räume/Luftdichtheit, Kühlung, Werte, Schiffscode =====
  // ---------- Geometrie eines Blocks ----------
  function fp(b) { var ty = T[b.t]; return b.r % 2 ? [ty.h, ty.w] : [ty.w, ty.h]; }
  function cellOf(b, lx, ly) {   // lokale Zelle → Schiffszelle
    var ty = T[b.t], w = ty.w, h = ty.h, x = b.f ? w - 1 - lx : lx, y = ly;
    for (var i = 0; i < b.r; i++) { var nx = h - 1 - y, ny = x; x = nx; y = ny; var tw = w; w = h; h = tw; }
    return [b.x + x, b.y + y];
  }
  function dirOut(b, d) { if (b.f && (d === 1 || d === 3)) d = 4 - d; return (d + b.r) % 4; }
  function dirIn(b, d) { d = (d - b.r + 4) % 4; if (b.f && (d === 1 || d === 3)) d = 4 - d; return d; }
  function key(x, y) { return x + "," + y; }
  function buildMap(blocks) {
    var M = new Map();
    blocks.forEach(function (b) { var ty = T[b.t]; for (var ly = 0; ly < ty.h; ly++) for (var lx = 0; lx < ty.w; lx++) { var c = cellOf(b, lx, ly); M.set(key(c[0], c[1]), { b: b, lx: lx, ly: ly }); } });
    return M;
  }
  function cellsOf(b) { var ty = T[b.t], out = []; for (var ly = 0; ly < ty.h; ly++) for (var lx = 0; lx < ty.w; lx++) out.push({ c: cellOf(b, lx, ly), lx: lx, ly: ly }); return out; }
  // Verbindung zwischen zwei Blöcken über eine gemeinsame Kante
  function linked(M, b) {
    var out = [];
    cellsOf(b).forEach(function (q) {
      for (var d = 0; d < 4; d++) {
        var nx = q.c[0] + DV[d][0], ny = q.c[1] + DV[d][1], o = M.get(key(nx, ny));
        if (!o || o.b === b) continue;
        var a = edgeRule(T[b.t], q.lx, q.ly, dirIn(b, d)).c, c = edgeRule(T[o.b.t], o.lx, o.ly, dirIn(o.b, (d + 2) % 4)).c;
        if (a && c && out.indexOf(o.b) < 0) out.push(o.b);
      }
    });
    return out;
  }
  function components(blocks) {
    var M = buildMap(blocks), seen = new Set(), comps = [];
    blocks.forEach(function (b) {
      if (seen.has(b)) return;
      var comp = [], st = [b]; seen.add(b);
      while (st.length) { var x = st.pop(); comp.push(x); linked(M, x).forEach(function (o) { if (!seen.has(o)) { seen.add(o); st.push(o); } }); }
      comps.push(comp);
    });
    return comps;
  }
  // Räume: zusammenhängende Boden-, Tür-, Luken- und Cockpitzellen, dicht wenn jede Außenkante abgedichtet ist.
  // Cockpit und geschlossene Luken dichten selbst nach außen ab; eine offene Luke ist ein Leck.
  var ROOMK = { floor: 1, door: 1, hatch: 1, cock: 1, dock: 1 };
  function rooms(blocks, M) {
    M = M || buildMap(blocks); var seen = new Set(), out = [];
    M.forEach(function (v, k) {
      var kd = T[v.b.t].kind; if (!ROOMK[kd] || seen.has(k)) return;
      var cells = [], leaks = [], st = [k]; seen.add(k);
      while (st.length) {
        var kk = st.pop(), p = kk.split(","), x = +p[0], y = +p[1], me = M.get(kk), mk = T[me.b.t].kind; cells.push([x, y]);
        if (mk === "hatch" && me.b.open) leaks.push([x, y, 0]);   // offene Luke (auch in der Decke) lässt die Luft raus
        for (var d = 0; d < 4; d++) {
          var nx = x + DV[d][0], ny = y + DV[d][1], nk = key(nx, ny), o = M.get(nk);
          if (!o) { if (mk === "cock" || mk === "hatch" || mk === "dock") continue; leaks.push([x, y, d]); continue; }
          var ok = T[o.b.t].kind;
          // Cockpits sind links, rechts und vorne geschlossen; kleine öffnen sich nach hinten, große haben hinten eine Schiebetür (eigener Raum)
          if (mk === "cock" && o.b !== me.b && !(T[me.b.t].h < 4 && d === dirOut(me.b, 2))) continue;
          if (ok === "cock" && o.b !== me.b && !(T[o.b.t].h < 4 && (d + 2) % 4 === dirOut(o.b, 2))) continue;
          // Docks: ringsum geschlossen, hinten eine Schiebetür, die erst nach vollständigem Andocken öffnet
          if (mk === "dock" && o.b !== me.b && !(d === dirOut(me.b, 2) && me.b.dockOpen > 0.5)) continue;
          if (ok === "dock" && o.b !== me.b && !((d + 2) % 4 === dirOut(o.b, 2) && o.b.dockOpen > 0.5)) continue;
          // Maschinen gehören nur zum Raum, wenn sie an Boden stehen; außen ans Cockpit gebaute bleiben draußen
          if (ROOMK[ok] || (ROOMABLE[ok] && mk !== "cock")) { if (!seen.has(nk)) { seen.add(nk); st.push(nk); } continue; }
          if (!edgeRule(T[o.b.t], o.lx, o.ly, dirIn(o.b, (d + 2) % 4)).s) leaks.push([x, y, d]);
        }
      }
      out.push({ cells: cells, leaks: leaks, ok: !leaks.length });
    });
    return out;
  }

  // Kühlung: aneinandergereihte Kühlblöcke bilden ein Netz. Jedes Teil, das irgendwo am Netz anliegt,
  // bekommt die Kühlleistung aller Blöcke dieses Netzes (mehrere Netze zählen zusammen).
  function coolMap(blocks, M) {
    M = M || buildMap(blocks);
    var nets = new Map(), out = new Map(), id = 0;
    blocks.forEach(function (b) {
      if (T[b.t].kind !== "cool" || nets.has(b)) return;
      var net = [], st = [b]; nets.set(b, id);
      while (st.length) { var x = st.pop(); net.push(x); for (var d = 0; d < 4; d++) { var o = M.get(key(x.x + DV[d][0], x.y + DV[d][1])); if (o && T[o.b.t].kind === "cool" && !nets.has(o.b)) { nets.set(o.b, id); st.push(o.b); } } }
      var touched = new Set();
      net.forEach(function (x) { for (var d = 0; d < 4; d++) { var o = M.get(key(x.x + DV[d][0], x.y + DV[d][1])); if (o && T[o.b.t].kind !== "cool") touched.add(o.b); } });
      touched.forEach(function (tb) { out.set(tb, (out.get(tb) || 0) + net.length); });
      id++;
    });
    return out;
  }
  function ocMaxOf(blocks, cm) {   // Overcharge-Dauer: 3 s, jeder Kühlblock an einem Triebwerk verlängert
    var n = 0, seen = new Set(); blocks.forEach(function (b) { if (T[b.t].kind === "thr" && cm.get(b)) { if (!seen.has(cm.get(b) + ":" + b.x)) n = Math.max(n, cm.get(b)); } });
    return 3 + 0.8 * n;
  }
  // ---------- Werte eines Schiffs ----------
  function thrustDir(b) { return dirOut(b, 0); }     // Schub zeigt zur Montageseite, Düse nach hinten
  // Masse eines Blocks; Perks können sie für das eigene Schiff senken (Batterien, schwere Panzerung)
  function massOf(ty, mod) {
    if (!mod) return ty.mass;
    if (ty.kind === "bat" && mod.batW) return 0;
    if (ty.kind === "armor" && ty.heavy && mod.heavyW) return ty.mass * Math.max(0, 1 - mod.heavyW);
    return ty.mass;
  }
  function stats(blocks, mod) {
    var s = { mass: 0, thr: [0, 0, 0, 0], torque: 0, cap: 0, prod: 0, use: 0, n: blocks.length, cock: 0, gyro: 0, com: [0, 0], I: 0, mg: 0, rg: 0, ms: 0 };
    blocks.forEach(function (b) {
      var ty = T[b.t], f = fp(b), cx = b.x + f[0] / 2, cy = b.y + f[1] / 2;
      var ms = massOf(ty, mod); s.mass += ms; s.com[0] += cx * ms; s.com[1] += cy * ms; s.cost = (s.cost || 0) + (ty.cost || 0);
      if (ty.kind === "thr") { s.thr[thrustDir(b)] += ty.thrust; s.use += ty.use; }
      if (ty.kind === "gyro") { s.torque += ty.torque; s.gyro++; s.use += ty.use; }
      if (ty.kind === "bat") s.cap += ty.cap;
      if (ty.kind === "reac") s.prod += ty.prod;
      if (ty.kind === "cock") s.cock++;
      if (ty.kind === "mg") s.mg++;
      if (ty.kind === "rg") s.rg++;
      if (ty.kind === "ms") s.ms++;
    });
    if (s.mass) { s.com[0] /= s.mass; s.com[1] /= s.mass; } else if (blocks.length) { s.com = [blocks[0].x + 0.5, blocks[0].y + 0.5]; }
    blocks.forEach(function (b) {
      var ty = T[b.t], f = fp(b), dx = (b.x + f[0] / 2 - s.com[0]) * CELL_M, dy = (b.y + f[1] / 2 - s.com[1]) * CELL_M;
      s.I += massOf(ty, mod) * (dx * dx + dy * dy + (f[0] * f[0] + f[1] * f[1]) * CELL_M * CELL_M / 12);
    });
    return s;
  }

  function mainScore(cp) { return cp.length + (cp.some(function (b) { return T[b.t].kind === "cock"; }) ? 1e5 : 0); }
  function bounds(bl) {
    if (!bl.length) return null; var o = { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 };
    bl.forEach(function (b) { var f = fp(b); o.x0 = Math.min(o.x0, b.x); o.y0 = Math.min(o.y0, b.y); o.x1 = Math.max(o.x1, b.x + f[0]); o.y1 = Math.max(o.y1, b.y + f[1]); });
    return o;
  }
  // Schiffscode: kompaktes JSON, damit Entwürfe geteilt und später als Gegner-Blaupausen eingebaut werden können.
  function shipCode() { return JSON.stringify({ sr: 1, color: S.color, b: S.blocks.map(function (b) { var a = [b.t, b.x, b.y, b.r, b.f]; if (b.c) a.push(b.c); return a; }) }); }
  function parseShip(txt) {
    try {
      var o = JSON.parse(String(txt).trim()); if (!o || !Array.isArray(o.b)) return null;
      var out = o.b.filter(function (a) { return Array.isArray(a) && T[a[0]]; }).map(function (a) { var b = { t: a[0], x: a[1] | 0, y: a[2] | 0, r: (a[3] | 0) & 3, f: a[4] ? 1 : 0 }; if (a[5]) b.c = String(a[5]); return b; });
      return out.length ? out : null;
    } catch (e) { return null; }
  }
