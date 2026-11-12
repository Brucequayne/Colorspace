  // ===== 41-zeichnen-schiff.js · Zeichnen: ganzes Schiff mit verschmolzener Hülle =====
  // Schiff: erst Innenleben, dann Aufbauten; Panzerung zuletzt, damit Kanten sauber liegen
  var ORDER = { floor: 0, door: 0, hatch: 0, wall: 1, cock: 2, bat: 2, reac: 2, gyro: 2, cool: 2, tcomp: 2, shield: 2, dock: 1, thr: 3, mg: 3, rg: 3, ms: 3, ant: 3, win: 4, armor: 4 };
  // Panzerung (und außen die Dächer) verschmilzt zu einer Hülle: Kanten nur dort, wo die Hülle endet
  function isHull(k, view) { return k === "armor" || k === "win" || (view === "out" && (k === "floor" || k === "wall" || k === "door" || k === "hatch" || k === "deco")); }
  function drawShip(c, blocks, s, view, tm, body, M) {
    M = M || buildMap(blocks);
    var sorted = blocks.slice().sort(function (a, b) { return ORDER[T[a.t].kind] - ORDER[T[b.t].kind]; }), hull = [];
    sorted.forEach(function (b) {
      var ty = T[b.t], hpk = b.hp !== undefined ? b.hp / hpMax(body, b) : 1, o = null;
      if (isHull(ty.kind, view)) { hull.push(b); return; }
      if (body) o = { pilot: ty.kind === "cock" && body.ctrl && FL && FL.seated && b === body.seat, batK: body.cap ? body.energy / body.cap : 1, charge: b.chg ? Math.min(1, b.chg / RG.charge) : 0, ammo: b.ammo === undefined ? (ty.kind === "ms" ? msMax(b) : 2) : b.ammo, open: !!b.open, tw: b.tw || 0, ckOpen: b.ckOpen || 0, dockOpen: b.dockOpen || 0 };
      drawBlock(c, b, s, view, hpk, tm, o);
    });
    hull.forEach(function (b) { hullFill(c, b, s, view, b.hp !== undefined ? b.hp / hpMax(body, b) : 1); });
    hull.forEach(function (b) { hullEdges(c, b, s, M, view); });
  }
  function hullFill(c, b, s, view, hpk) {
    var ty = T[b.t], f = fp(b), w = ty.w * s, h = ty.h * s, k = ty.kind, col = b.c || ty.col, lw = Math.max(1, s / 16);
    c.save(); var m0 = ty.wx && c.getTransform ? c.getTransform() : null; c.translate((b.x + f[0] / 2) * s, (b.y + f[1] / 2) * s); c.rotate(b.r * Math.PI / 2); if (b.f) c.scale(-1, 1); c.translate(-w / 2, -h / 2);
    if (k === "armor") {
      shapePath(c, ty.shape, w, h); c.fillStyle = col; c.fill();
      if (ty.heavy && ty.shape === "full") { c.fillStyle = shade(col, -0.25); [[0.2, 0.2], [0.8, 0.2], [0.2, 0.8], [0.8, 0.8]].forEach(function (q) { c.fillRect(w * q[0] - lw, h * q[1] - lw, lw * 2, lw * 2); }); }
      if (ty.va === "vent") ventArt(c, w, h, s, col, lw, ty.heavy);   // Lüftungsgitter
      if (ty.wx) wxOverlay(c, b, ty, s, w, h, m0);   // Rost / Bewuchs, nahtlos im Schiffsraster
      c.strokeStyle = shade(col, -0.55); c.lineWidth = lw * 1.2; c.beginPath();
      if (ty.shape.indexOf("ramp") === 0) { c.moveTo(0, 0); c.lineTo(w, h); }
      else if (ty.shape === "round") c.arc(0, h, w, -Math.PI / 2, 0);
      else if (ty.shape === "round2") c.ellipse(0, h, w, h, 0, -Math.PI / 2, 0);
      else if (ty.shape === "half") { c.moveTo(0, h / 2); c.lineTo(w, h / 2); c.moveTo(0, h / 2); c.lineTo(0, h); c.moveTo(w, h / 2); c.lineTo(w, h); }
      c.stroke();
      if (ty.shape !== "full") {   // Lichtkante an der schrägen Seite
        c.strokeStyle = shade(col, 0.25); c.lineWidth = lw; c.beginPath();
        if (ty.shape.indexOf("ramp") === 0) { c.moveTo(lw * 1.4, lw * 3); c.lineTo(w - lw * 2.5, h - lw * 1.2); }
        else if (ty.shape === "round") c.arc(0, h, w - lw * 1.6, -Math.PI / 2 + 0.12, -0.12);
        else if (ty.shape === "round2") c.ellipse(0, h, w - lw * 1.6, h - lw * 1.6, 0, -Math.PI / 2 + 0.1, -0.1);
        c.stroke();
      }
      if (hpk <= 0.5) damageMarks(c, w, h, b, s, ty.shape);
    } else if (k === "win") {
      c.fillStyle = shade(col, -0.1); c.fillRect(0, 0, w, h); c.fillStyle = GLASS; c.fillRect(w * 0.18, h * 0.18, w * 0.64, h * 0.64); c.fillStyle = GLASS2; c.fillRect(w * 0.22, h * 0.22, w * 0.2, h * 0.56);
      if (hpk <= 0.5) damageMarks(c, w, h, b, s, "full");
    } else {
      c.fillStyle = shade(col, 0.06); c.fillRect(0, 0, w, h);
      if (k === "door") { c.fillStyle = "#D9A21B"; c.fillRect(w * 0.42, h * 0.12, w * 0.16, h * 0.76); }
      if (k === "hatch") hatchArt(c, w, h, col, lw, "out", b.open);
    }
    c.restore();
  }
  function hullEdges(c, b, s, M, view) {
    var ty = T[b.t], col = b.c || ty.col, lw = Math.max(1, s / 14), dark = shade(col, -0.55), lite = shade(col, 0.24), shd = shade(col, -0.28);
    cellsOf(b).forEach(function (q) {
      var x = q.c[0] * s, y = q.c[1] * s;
      for (var d = 0; d < 4; d++) {
        if (!edgeRule(ty, q.lx, q.ly, dirIn(b, d)).s && ty.kind === "armor") continue;
        var o = M.get(key(q.c[0] + DV[d][0], q.c[1] + DV[d][1]));
        if (o && o.b === b) continue;
        var merged = o && isHull(T[o.b.t].kind, view) && edgeRule(T[o.b.t], o.lx, o.ly, dirIn(o.b, (d + 2) % 4)).s;
        var e = d === 0 ? [x, y, x + s, y, 0, 1] : d === 1 ? [x + s, y, x + s, y + s, -1, 0] : d === 2 ? [x, y + s, x + s, y + s, 0, -1] : [x, y, x, y + s, 1, 0];
        if (merged) {   // Farbwechsel innerhalb der Hülle: feine Naht
          if ((d === 1 || d === 2) && (o.b.c || T[o.b.t].col) !== col) { c.strokeStyle = "rgba(0,0,0,.28)"; c.lineWidth = lw * 0.7; c.beginPath(); c.moveTo(e[0], e[1]); c.lineTo(e[2], e[3]); c.stroke(); }
          continue;
        }
        c.strokeStyle = d === 0 || d === 3 ? lite : shd; c.lineWidth = lw * 1.3; c.beginPath(); c.moveTo(e[0] + e[4] * lw * 1.6, e[1] + e[5] * lw * 1.6); c.lineTo(e[2] + e[4] * lw * 1.6, e[3] + e[5] * lw * 1.6); c.stroke();
        c.strokeStyle = dark; c.lineWidth = lw; c.beginPath(); c.moveTo(e[0] + e[4] * lw * 0.5, e[1] + e[5] * lw * 0.5); c.lineTo(e[2] + e[4] * lw * 0.5, e[3] + e[5] * lw * 0.5); c.stroke();
      }
    });
  }
  function FONTS() { return getComputedStyle(document.documentElement).getPropertyValue("--f-display") || "sans-serif"; }

