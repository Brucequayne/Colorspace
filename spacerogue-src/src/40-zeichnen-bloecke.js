  // ===== 40-zeichnen-bloecke.js · Zeichnen: einzelne Blöcke, Luke, Astronaut, Schadensspuren =====
  // ---------- Zeichnen der Blöcke ----------
  var GLASS = "#5FB4D9", GLASS2 = "#9FD8EE", DARK = "#2A2F36", MID = "#4A525C", LIGHT = "#C9D1D9", FLOOR = "#B9BEC4", FLOOR2 = "#A9AFB6", ACC = "#E3B83F";
  function shade(hex, k) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    function f(v) { return Math.max(0, Math.min(255, Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k)))); }
    return "rgb(" + f(r) + "," + f(g) + "," + f(b) + ")";
  }
  function shapePath(c, sh, w, h) {
    c.beginPath();
    if (sh === "ramp1" || sh === "ramp2" || sh === "ramp3") { c.moveTo(0, 0); c.lineTo(0, h); c.lineTo(w, h); c.closePath(); }
    else if (sh === "round") { c.moveTo(0, 0); c.arc(0, h, w, -Math.PI / 2, 0); c.lineTo(0, h); c.closePath(); }
    else if (sh === "round2") { c.moveTo(0, 0); c.ellipse(0, h, w, h, 0, -Math.PI / 2, 0); c.lineTo(0, h); c.closePath(); }
    else if (sh === "half") c.rect(0, h / 2, w, h / 2);
    else c.rect(0, 0, w, h);
  }
  // b: Block, s: Pixel je Zelle, view: "in"/"out", dmg: Anteil Leben (0…1)
  function drawBlock(c, b, s, view, hpk, tm, opts) {
    var ty = T[b.t], f = fp(b), w = ty.w * s, h = ty.h * s, k = ty.kind;
    c.save(); var m0 = ty.wx && c.getTransform ? c.getTransform() : null;
    c.translate((b.x + f[0] / 2) * s, (b.y + f[1] / 2) * s);
    c.rotate(b.r * Math.PI / 2); if (b.f) c.scale(-1, 1);
    if (opts && opts.tw) { c.translate(0, h / 2); c.rotate(b.f ? -opts.tw : opts.tw); c.translate(0, -h / 2); }   // Geschütz schwenkt um sein hinteres Ende
    c.translate(-w / 2, -h / 2);
    var col = b.c || ty.col, lw = Math.max(1, s / 16), dam = hpk !== undefined && hpk <= 0.5;
    c.lineJoin = "miter";
    if (k === "armor" || k === "win") {
      if (k === "win") { c.fillStyle = shade(col, -0.15); c.fillRect(0, 0, w, h); c.fillStyle = GLASS; c.fillRect(w * 0.18, h * 0.18, w * 0.64, h * 0.64); c.fillStyle = GLASS2; c.fillRect(w * 0.22, h * 0.22, w * 0.2, h * 0.56); }
      else {
        shapePath(c, ty.shape, w, h); c.fillStyle = col; c.fill();
        c.save(); c.clip();
        c.fillStyle = shade(col, 0.22); c.fillRect(0, 0, w, lw * 2); c.fillRect(0, 0, lw * 2, h);
        c.fillStyle = shade(col, -0.25); c.fillRect(0, h - lw * 2, w, lw * 2); c.fillRect(w - lw * 2, 0, lw * 2, h);
        if (ty.heavy) { c.fillStyle = shade(col, -0.18); c.fillRect(w * 0.3, h * 0.3, w * 0.4, h * 0.4); c.fillStyle = shade(col, 0.1); c.fillRect(w * 0.34, h * 0.34, w * 0.32, h * 0.32); }
        c.restore();
        if (ty.va === "vent") ventArt(c, w, h, s, col, lw, ty.heavy);
        if (ty.wx) wxOverlay(c, b, ty, s, w, h, m0);
      }
      shapePath(c, k === "win" ? "full" : ty.shape, w, h); c.strokeStyle = shade(col, -0.5); c.lineWidth = lw; c.stroke();
      if (dam) damageMarks(c, w, h, b, s, ty.shape);
    } else if (k === "floor" || k === "wall" || k === "door") {
      if (view === "out") { roof(c, w, h, col, lw); }
      else if (k === "floor" && ty.va === "grid") gridFloorArt(c, w, h, s, lw);
      else if (k === "floor") { c.fillStyle = FLOOR; c.fillRect(0, 0, w, h); c.strokeStyle = FLOOR2; c.lineWidth = lw; c.strokeRect(lw / 2, lw / 2, w - lw, h - lw); c.fillStyle = FLOOR2; c.fillRect(w * 0.45, h * 0.45, w * 0.1, h * 0.1); }
      else if (k === "wall") { c.fillStyle = shade(col, -0.35); c.fillRect(0, 0, w, h); c.fillStyle = shade(col, -0.15); c.fillRect(w * 0.15, 0, w * 0.7, h); if (ty.va === "pipes") pipeArt(c, w, h, s, lw, b.c); c.strokeStyle = shade(col, -0.55); c.lineWidth = lw; c.strokeRect(lw / 2, lw / 2, w - lw, h - lw); }
      else { c.fillStyle = FLOOR; c.fillRect(0, 0, w, h); c.fillStyle = shade(col, -0.3); c.fillRect(0, 0, w * 0.12, h); c.fillRect(w * 0.88, 0, w * 0.12, h); c.fillStyle = "#D9A21B"; c.fillRect(w * 0.12, h * 0.38, w * 0.37, h * 0.24); c.fillRect(w * 0.51, h * 0.38, w * 0.37, h * 0.24); c.fillStyle = DARK; c.fillRect(w * 0.49, h * 0.38, w * 0.02, h * 0.24); }
      if (k === "door" && view === "out") { c.fillStyle = "#D9A21B"; c.fillRect(w * 0.42, h * 0.1, w * 0.16, h * 0.8); }
    } else if (k === "hatch") {
      hatchArt(c, w, h, col, lw, view, opts && opts.open);
    } else if (k === "cock") {
      c.fillStyle = col; c.fillRect(0, 0, w, h);
      c.fillStyle = shade(col, -0.3); c.fillRect(0, h - lw * 2, w, lw * 2); c.fillRect(0, 0, lw * 2, h); c.fillRect(w - lw * 2, 0, lw * 2, h);
      var tiny = ty.w === 1, cw = w - s * 0.5, ch = s * (tiny ? 0.95 : ty.h > 3 ? 1.6 : 1.2);
      if (tiny) {   // 1×2: Kanzel füllt die vordere Zelle, dahinter ein schmaler Sitz
        c.fillStyle = GLASS; c.beginPath(); c.moveTo(s * 0.16, ch); c.lineTo(s * 0.16, s * 0.4); c.lineTo(w / 2, s * 0.08); c.lineTo(w - s * 0.16, s * 0.4); c.lineTo(w - s * 0.16, ch); c.closePath(); c.fill();
        c.fillStyle = GLASS2; c.beginPath(); c.moveTo(s * 0.26, ch * 0.88); c.lineTo(s * 0.26, s * 0.44); c.lineTo(w / 2 - s * 0.06, s * 0.22); c.lineTo(w / 2 - s * 0.06, ch * 0.88); c.closePath(); c.fill();
        if (view === "in") {
          c.fillStyle = FLOOR; c.fillRect(s * 0.16, ch + lw, w - s * 0.32, h - ch - s * 0.16);
          var tx2 = w / 2, ty2 = s * 1.45; c.fillStyle = "#5A3E2B"; c.fillRect(tx2 - s * 0.26, ty2 - s * 0.26, s * 0.52, s * 0.52); c.fillStyle = "#7A5A40"; c.fillRect(tx2 - s * 0.19, ty2 - s * 0.18, s * 0.38, s * 0.36);
          if (opts && opts.pilot) drawAstronaut(c, tx2, ty2 - s * 0.05, -Math.PI / 2, 0, s / 24, false);
        } else { c.fillStyle = shade(col, -0.12); c.fillRect(s * 0.16, ch + lw, w - s * 0.32, h - ch - s * 0.2); }
        c.strokeStyle = shade(col, -0.55); c.lineWidth = lw; c.strokeRect(lw / 2, lw / 2, w - lw, h - lw);
        if (dam) damageMarks(c, w, h, b, s, "full");
        c.restore(); return;
      }
      var bigCk = ty.h >= 4;
      c.fillStyle = GLASS; c.beginPath(); c.moveTo(s * 0.25, ch); c.lineTo(s * 0.25, s * 0.45); c.lineTo(w / 2, s * 0.08); c.lineTo(w - s * 0.25, s * 0.45); c.lineTo(w - s * 0.25, ch); c.closePath(); c.fill();
      c.fillStyle = GLASS2; c.beginPath(); c.moveTo(s * 0.4, ch * 0.9); c.lineTo(s * 0.4, s * 0.5); c.lineTo(w / 2 - s * 0.1, s * 0.25); c.lineTo(w / 2 - s * 0.1, ch * 0.9); c.closePath(); c.fill();
      if (view === "in") {
        c.fillStyle = FLOOR; c.fillRect(s * 0.25, ch + lw, cw, h - ch - s * 0.35);
        c.fillStyle = MID; c.fillRect(s * 0.4, ch + lw, cw - s * 0.3, s * 0.28);
        c.fillStyle = "#57D18A"; c.fillRect(s * 0.6, ch + lw * 2, s * 0.3, s * 0.12); c.fillStyle = ACC; c.fillRect(w - s * 0.9, ch + lw * 2, s * 0.3, s * 0.12);
        var sx = w / 2, sy = ch + s * 0.95; c.fillStyle = "#5A3E2B"; c.fillRect(sx - s * 0.32, sy - s * 0.3, s * 0.64, s * 0.62); c.fillStyle = "#7A5A40"; c.fillRect(sx - s * 0.24, sy - s * 0.2, s * 0.48, s * 0.4);
        if (opts && opts.pilot) drawAstronaut(c, sx, sy - s * 0.05, -Math.PI / 2, 0, s / 24, false);
      } else { c.fillStyle = shade(col, -0.12); c.fillRect(s * 0.25, ch + lw, cw, h - ch - s * 0.35); c.strokeStyle = shade(col, -0.35); c.lineWidth = lw; for (var gy = ch + s * 0.6; gy < h - s * 0.4; gy += s * 0.7) { c.beginPath(); c.moveTo(s * 0.25, gy); c.lineTo(w - s * 0.25, gy); c.stroke(); } }
      c.strokeStyle = shade(col, -0.55); c.lineWidth = lw; c.strokeRect(lw / 2, lw / 2, w - lw, h - lw);
      if (dam) damageMarks(c, w, h, b, s, "full");
    } else if (k === "thr") {
      c.fillStyle = shade(col, -0.1); c.fillRect(w * 0.08, 0, w * 0.84, h * 0.62);
      c.fillStyle = shade(col, 0.2); c.fillRect(w * 0.08, 0, w * 0.84, lw * 2);
      c.fillStyle = MID; c.beginPath(); c.moveTo(w * 0.16, h * 0.6); c.lineTo(w * 0.84, h * 0.6); c.lineTo(w * 0.96, h); c.lineTo(w * 0.04, h); c.closePath(); c.fill();
      c.fillStyle = DARK; c.beginPath(); c.moveTo(w * 0.24, h * 0.66); c.lineTo(w * 0.76, h * 0.66); c.lineTo(w * 0.86, h * 0.97); c.lineTo(w * 0.14, h * 0.97); c.closePath(); c.fill();
      c.fillStyle = "rgba(120,200,255,.9)"; c.fillRect(w * 0.3, h * 0.9, w * 0.4, h * 0.05);
      c.fillStyle = b.c ? b.c : ACC; c.fillRect(w * 0.2, h * 0.2, w * 0.6, h * 0.08);
      c.strokeStyle = shade(col, -0.55); c.lineWidth = lw; c.strokeRect(w * 0.08, 0, w * 0.84, h * 0.62);
    } else if (k === "gyro") {
      c.fillStyle = shade(col, -0.15); c.fillRect(0, 0, w, h);
      c.strokeStyle = LIGHT; c.lineWidth = lw * 1.4; c.beginPath(); c.arc(w / 2, h / 2, w * 0.32, 0, Math.PI * 2); c.stroke();
      var ga = tm * 3; c.strokeStyle = b.c || ACC; c.beginPath(); c.moveTo(w / 2 + Math.cos(ga) * w * 0.3, h / 2 + Math.sin(ga) * h * 0.3); c.lineTo(w / 2 - Math.cos(ga) * w * 0.3, h / 2 - Math.sin(ga) * h * 0.3); c.stroke();
      c.fillStyle = DARK; c.fillRect(w * 0.44, h * 0.44, w * 0.12, h * 0.12);
      c.strokeStyle = shade(col, -0.55); c.lineWidth = lw; c.strokeRect(lw / 2, lw / 2, w - lw, h - lw);
    } else if (k === "bat" && ty.w > 1) {
      bigBatArt(c, w, h, s, col, lw, opts && opts.batK !== undefined ? opts.batK : 1, b.c, tm);
    } else if (k === "bat") {
      c.fillStyle = shade(col, -0.1); c.fillRect(0, 0, w, h);
      c.fillStyle = DARK; c.fillRect(w * 0.2, h * 0.15, w * 0.6, h * 0.7);
      var lv = opts && opts.batK !== undefined ? opts.batK : 1; c.fillStyle = lv < 0.2 ? "#E0533F" : "#57D18A"; c.fillRect(w * 0.26, h * 0.21 + h * 0.58 * (1 - lv), w * 0.48, h * 0.58 * lv);
      c.fillStyle = b.c || ACC; c.fillRect(w * 0.38, h * 0.06, w * 0.24, h * 0.09);
      c.strokeStyle = shade(col, -0.55); c.lineWidth = lw; c.strokeRect(lw / 2, lw / 2, w - lw, h - lw);
    } else if (k === "reac") {
      c.fillStyle = shade(col, -0.2); c.fillRect(0, 0, w, h);
      c.fillStyle = shade(col, 0.05); c.fillRect(w * 0.08, h * 0.08, w * 0.84, h * 0.84);
      var pulse = 0.6 + 0.4 * Math.sin(tm * 4);
      c.fillStyle = DARK; c.beginPath(); c.arc(w / 2, h / 2, w * 0.3, 0, Math.PI * 2); c.fill();
      c.fillStyle = "rgba(90,220,255," + (0.55 + 0.35 * pulse) + ")"; c.beginPath(); c.arc(w / 2, h / 2, w * 0.18, 0, Math.PI * 2); c.fill();
      c.fillStyle = b.c || ACC; [[0.12, 0.12], [0.8, 0.12], [0.12, 0.8], [0.8, 0.8]].forEach(function (q) { c.fillRect(w * q[0], h * q[1], w * 0.08, h * 0.08); });
      c.strokeStyle = shade(col, -0.55); c.lineWidth = lw; c.strokeRect(lw / 2, lw / 2, w - lw, h - lw);
    } else if (k === "cool") {
      c.fillStyle = shade(col, -0.2); c.fillRect(0, 0, w, h);
      c.fillStyle = "#2E4A5E"; c.fillRect(w * 0.12, h * 0.12, w * 0.76, h * 0.76);
      c.fillStyle = "#8FD3F2"; for (var fi = 0; fi < 4; fi++) c.fillRect(w * 0.18, h * (0.2 + fi * 0.17), w * 0.64, h * 0.07);
      c.fillStyle = b.c || "#5FB4D9"; c.fillRect(w * 0.44, 0, w * 0.12, h * 0.12); c.fillRect(w * 0.44, h * 0.88, w * 0.12, h * 0.12); c.fillRect(0, h * 0.44, w * 0.12, h * 0.12); c.fillRect(w * 0.88, h * 0.44, w * 0.12, h * 0.12);
      c.strokeStyle = shade(col, -0.55); c.lineWidth = lw; c.strokeRect(lw / 2, lw / 2, w - lw, h - lw);
    } else if (k === "dock") {
      // Docking-Block: vorne der Andockring mit Klammern, innen eine Schleuse, hinten eine Schiebetür
      var op2 = opts && opts.dockOpen ? opts.dockOpen : 0, cr = s * 0.55;
      if (view === "in") { c.fillStyle = FLOOR; c.fillRect(s * 0.14, cr, w - s * 0.28, h - cr - s * 0.16); }
      else roof(c, w, h, col, lw);
      c.fillStyle = shade(col, -0.18); c.fillRect(0, 0, s * 0.14, h); c.fillRect(w - s * 0.14, 0, s * 0.14, h);
      // Andockring
      c.fillStyle = "#3A414B"; c.fillRect(0, 0, w, cr);
      c.save(); c.beginPath(); c.rect(s * 0.1, s * 0.08, w - s * 0.2, cr - s * 0.16); c.clip(); c.fillStyle = "#E3B83F";
      for (var di = -2; di < w / (s * 0.3) + 2; di++) { c.beginPath(); c.moveTo(di * s * 0.3, s * 0.08); c.lineTo(di * s * 0.3 + s * 0.15, s * 0.08); c.lineTo(di * s * 0.3 + s * 0.15 + cr, cr); c.lineTo(di * s * 0.3 + cr, cr); c.closePath(); c.fill(); }
      c.restore();
      c.fillStyle = "#1C2027"; c.fillRect(w * 0.25, s * 0.16, w * 0.5, cr - s * 0.32);   // Durchgang
      c.fillStyle = shade(col, 0.15); [0.08, 0.92].forEach(function (q) { c.fillRect(w * q - s * 0.09, s * 0.02, s * 0.18, cr - s * 0.04); });   // Klammern
      if (view === "in") {
        var wy2 = h - s * 0.16, dw2 = w * 0.36, dx2 = (w - dw2) / 2;
        c.fillStyle = shade(col, -0.25); c.fillRect(0, wy2, dx2, s * 0.16); c.fillRect(dx2 + dw2, wy2, w - dx2 - dw2, s * 0.16);
        c.fillStyle = "#D9A21B"; c.fillRect(dx2 - dw2 * 0.5 * op2, wy2 + s * 0.04, dw2 / 2, s * 0.08); c.fillRect(dx2 + dw2 / 2 + dw2 * 0.5 * op2, wy2 + s * 0.04, dw2 / 2, s * 0.08);
        c.fillStyle = op2 > 0.8 ? "#57D18A" : "#E0533F"; c.fillRect(w - s * 0.34, h - s * 0.48, s * 0.12, s * 0.12);   // Statuslampe
      }
      c.strokeStyle = shade(col, -0.55); c.lineWidth = lw; c.strokeRect(lw / 2, lw / 2, w - lw, h - lw);
    } else if (k === "shield") {
      // Schildgenerator: Gehäuse mit Emitterring, der sanft blau pulsiert
      c.fillStyle = shade(col, -0.2); c.fillRect(0, 0, w, h);
      var sr2 = Math.min(w, h) * 0.34, scx = w / 2, scy = h / 2, pu = 0.55 + 0.45 * Math.sin(tm * 2.4 + b.x);
      var sg = c.createRadialGradient(scx, scy, 0, scx, scy, sr2 * 1.25); sg.addColorStop(0, "rgba(120,190,255," + (0.55 * pu) + ")"); sg.addColorStop(1, "rgba(120,190,255,0)");
      c.fillStyle = sg; c.fillRect(0, 0, w, h);
      c.strokeStyle = "#8EC5FF"; c.lineWidth = lw * 1.5; c.beginPath(); c.arc(scx, scy, sr2, 0, Math.PI * 2); c.stroke();
      c.strokeStyle = shade(col, 0.25); c.lineWidth = lw; c.beginPath(); c.arc(scx, scy, sr2 * 0.55, 0, Math.PI * 2); c.stroke();
      c.fillStyle = "#DDEEFF"; c.beginPath(); c.arc(scx, scy, sr2 * 0.18, 0, Math.PI * 2); c.fill();
      c.fillStyle = shade(col, -0.45); [[0.12, 0.12], [0.88, 0.12], [0.12, 0.88], [0.88, 0.88]].forEach(function (q) { c.fillRect(w * q[0] - lw, h * q[1] - lw, lw * 2, lw * 2); });
      c.strokeStyle = shade(col, -0.55); c.lineWidth = lw; c.strokeRect(lw / 2, lw / 2, w - lw, h - lw);
    } else if (k === "tcomp") {
      // Zielcomputer: Gehäuse mit Bildschirm, Fadenkreuz und kreisendem Suchstrich
      c.fillStyle = col; c.fillRect(0, 0, w, h);
      c.fillStyle = shade(col, -0.35); c.fillRect(w * 0.12, h * 0.08, w * 0.76, h * 0.5);
      var cx2 = w / 2, cy2 = h * 0.33, rr = Math.min(w * 0.3, h * 0.2);
      c.fillStyle = "#0F2A1E"; c.beginPath(); c.arc(cx2, cy2, rr, 0, Math.PI * 2); c.fill();
      c.strokeStyle = "#57D18A"; c.lineWidth = lw; c.beginPath(); c.arc(cx2, cy2, rr * 0.6, 0, Math.PI * 2); c.moveTo(cx2 - rr, cy2); c.lineTo(cx2 + rr, cy2); c.moveTo(cx2, cy2 - rr); c.lineTo(cx2, cy2 + rr); c.stroke();
      c.strokeStyle = "rgba(87,209,138,.8)"; c.beginPath(); c.moveTo(cx2, cy2); c.lineTo(cx2 + Math.cos(tm * 3) * rr, cy2 + Math.sin(tm * 3) * rr); c.stroke();
      c.fillStyle = shade(col, -0.2); for (var ti = 0; ti < 3; ti++) c.fillRect(w * 0.2, h * (0.68 + ti * 0.09), w * 0.6, lw * 1.4);
      c.fillStyle = Math.sin(tm * 4) > 0 ? "#E3B83F" : "#6E5A20"; c.fillRect(w * 0.72, h * 0.66, w * 0.12, w * 0.12);
      c.strokeStyle = shade(col, -0.55); c.lineWidth = lw; c.strokeRect(lw / 2, lw / 2, w - lw, h - lw);
    } else if (k === "ant") {
      c.fillStyle = shade(col, -0.1); c.fillRect(w * 0.1, h - s, w * 0.8, s);
      c.fillStyle = LIGHT; c.fillRect(w * 0.44, h * 0.08, w * 0.12, h - s);
      c.fillRect(w * 0.2, h * 0.3, w * 0.6, lw * 1.5); c.fillRect(w * 0.28, h * 0.5, w * 0.44, lw * 1.5);
      c.fillStyle = Math.sin(tm * 5) > 0 ? "#E0533F" : "#7A2A20"; c.fillRect(w * 0.42, h * 0.04, w * 0.16, w * 0.16);
      c.strokeStyle = shade(col, -0.55); c.lineWidth = lw; c.strokeRect(w * 0.1, h - s, w * 0.8, s);
    } else if (k === "mg") {
      c.fillStyle = shade(col, -0.1); c.fillRect(w * 0.12, h - s, w * 0.76, s);
      c.fillStyle = b.c || "#8C4A3A"; c.fillRect(w * 0.2, h - s * 0.85, w * 0.6, s * 0.5);
      c.fillStyle = DARK; [0.3, 0.5, 0.7].forEach(function (q) { c.fillRect(w * q - w * 0.06, h * 0.06, w * 0.12, h - s * 0.9); });
      c.fillStyle = MID; c.fillRect(w * 0.18, h * 0.42, w * 0.64, s * 0.14);
      c.strokeStyle = shade(col, -0.55); c.lineWidth = lw; c.strokeRect(w * 0.12, h - s, w * 0.76, s);
    } else if (k === "ms") {
      c.fillStyle = shade(col, -0.12); c.fillRect(w * 0.08, h * 0.3, w * 0.84, h * 0.7);
      c.fillStyle = b.c || "#8C4A3A"; c.fillRect(w * 0.14, h - s * 0.55, w * 0.72, s * 0.35);
      if (ty.rk === 1) {   // Schwere Rakete: ein dickes Rohr in der Mitte
        c.fillStyle = DARK; c.fillRect(w * 0.24, h * 0.03, w * 0.52, h * 0.6);
        var rdy = (opts && opts.ammo !== undefined ? opts.ammo : 1) > 0; c.fillStyle = rdy ? "#E9ECEE" : "#4A525C";
        c.beginPath(); c.moveTo(w * 0.5, h * 0.05); c.lineTo(w * 0.68, h * 0.24); c.lineTo(w * 0.32, h * 0.24); c.closePath(); c.fill();
        if (rdy) { c.fillStyle = "#E3B83F"; c.fillRect(w * 0.32, h * 0.24, w * 0.36, h * 0.07); c.fillStyle = "#C8473A"; c.fillRect(w * 0.32, h * 0.31, w * 0.36, h * 0.05); }
      } else
      [0.3, 0.7].forEach(function (q) { c.fillStyle = DARK; c.fillRect(w * q - w * 0.15, h * 0.06, w * 0.3, h * 0.55); var ready = (opts && opts.ammo !== undefined ? opts.ammo : 2) > (q < 0.5 ? 1 : 0); c.fillStyle = ready ? "#E9ECEE" : "#4A525C"; c.beginPath(); c.moveTo(w * q, h * 0.08); c.lineTo(w * q + w * 0.09, h * 0.2); c.lineTo(w * q - w * 0.09, h * 0.2); c.closePath(); c.fill(); if (ready) { c.fillStyle = "#C8473A"; c.fillRect(w * q - w * 0.09, h * 0.2, w * 0.18, h * 0.06); } });
      c.strokeStyle = shade(col, -0.55); c.lineWidth = lw; c.strokeRect(w * 0.08, h * 0.3, w * 0.84, h * 0.7);
    } else if (k === "gun") {
      if (ty.h === 2) {   // 25 mm: kompakter Sockel, ein dickes Rohr mit Mündungsbremse
        c.fillStyle = shade(col, -0.12); c.fillRect(w * 0.1, h - s, w * 0.8, s);
        c.fillStyle = b.c || "#8C4A3A"; c.fillRect(w * 0.2, h - s * 0.8, w * 0.6, s * 0.4);
        c.fillStyle = MID; c.beginPath(); c.arc(w / 2, h - s * 0.55, s * 0.24, 0, Math.PI * 2); c.fill();
        c.fillStyle = DARK; c.fillRect(w * 0.38, h * 0.1, w * 0.24, h - s * 0.75);
        c.fillStyle = MID; c.fillRect(w * 0.32, h * 0.04, w * 0.36, s * 0.22);
        c.strokeStyle = shade(col, -0.55); c.lineWidth = lw; c.strokeRect(w * 0.1, h - s, w * 0.8, s);
      } else {            // 120 mm: breiter Turm mit Panzerplatten, langes schweres Rohr
        c.fillStyle = shade(col, -0.1); c.fillRect(w * 0.04, h - s * 1.3, w * 0.92, s * 1.3);
        c.fillStyle = shade(col, -0.28); c.fillRect(w * 0.04, h - s * 1.3, w * 0.92, s * 0.12);
        c.fillStyle = b.c || "#8C4A3A"; c.fillRect(w * 0.14, h - s * 0.62, w * 0.72, s * 0.36);
        c.fillStyle = MID; c.beginPath(); c.arc(w / 2, h - s * 0.85, s * 0.34, 0, Math.PI * 2); c.fill();
        c.fillStyle = DARK; c.fillRect(w * 0.33, h * 0.06, w * 0.34, h - s * 1.25);
        c.fillStyle = shade(col, -0.35); c.fillRect(w * 0.3, h * 0.42, w * 0.4, s * 0.2);
        c.fillStyle = MID; c.fillRect(w * 0.27, h * 0.02, w * 0.46, s * 0.26);
        c.strokeStyle = shade(col, -0.55); c.lineWidth = lw; c.strokeRect(w * 0.04, h - s * 1.3, w * 0.92, s * 1.3);
      }
    } else if (k === "deco") {
      decoArt(c, ty.dk, w, h, s, lw, b.c);
    } else if (k === "rg") {
      c.fillStyle = shade(col, -0.15); c.fillRect(w * 0.08, h - s * 1.2, w * 0.84, s * 1.2);
      c.fillStyle = b.c || "#3E6F96"; c.fillRect(w * 0.16, h - s * 1.05, w * 0.68, s * 0.5);
      c.fillStyle = DARK; c.fillRect(w * 0.22, h * 0.04, w * 0.18, h - s * 1.1); c.fillRect(w * 0.6, h * 0.04, w * 0.18, h - s * 1.1);
      var chg = opts && opts.charge ? opts.charge : 0;
      c.fillStyle = "rgba(120,220,255," + (0.25 + chg * 0.75) + ")"; c.fillRect(w * 0.42, h * 0.08, w * 0.16, h - s * 1.15);
      c.strokeStyle = shade(col, -0.55); c.lineWidth = lw; c.strokeRect(w * 0.08, h - s * 1.2, w * 0.84, s * 1.2);
    }
    if (k === "cock" && ty.h >= 4 && view === "in") {
      // große Cockpits: hinten eine Wand mit Schiebetür, dadurch ein eigener, abgeschlossener Raum
      var wy = h - s * 0.16, dw = w * 0.34, dx0 = (w - dw) / 2, op = opts && opts.ckOpen ? Math.min(1, opts.ckOpen) : 0;
      c.fillStyle = shade(col, -0.25); c.fillRect(0, wy, dx0, s * 0.16); c.fillRect(dx0 + dw, wy, w - dx0 - dw, s * 0.16);
      c.fillStyle = "#D9A21B"; c.fillRect(dx0 - dw * 0.5 * op, wy + s * 0.04, dw / 2, s * 0.08); c.fillRect(dx0 + dw / 2 + dw * 0.5 * op, wy + s * 0.04, dw / 2, s * 0.08);
      c.strokeStyle = shade(col, -0.55); c.lineWidth = lw; c.strokeRect(0, wy, w, s * 0.16);
    }
    if (dam && MECH[k] && k !== "cock") damageMarks(c, w, h, b, s, "full");
    c.restore();
  }
  // Einrichtung von oben: Boden darunter, dann das Möbelstück. acc = Akzentfarbe (Pinsel), sonst eigene Standardfarbe
  function decoArt(c, dk, w, h, s, lw, acc) {
    c.fillStyle = FLOOR; c.fillRect(0, 0, w, h); c.strokeStyle = FLOOR2; c.lineWidth = lw; c.strokeRect(lw / 2, lw / 2, w - lw, h - lw);
    var ol = "rgba(30,34,40,.55)";
    function box(x, y, bw, bh, f) { c.fillStyle = f; c.fillRect(x, y, bw, bh); c.strokeStyle = ol; c.lineWidth = lw; c.strokeRect(x, y, bw, bh); }
    if (dk === "chair") {
      var cc = acc || "#3E6F96";
      box(w * 0.24, h * 0.3, w * 0.52, h * 0.5, cc); box(w * 0.22, h * 0.16, w * 0.56, h * 0.14, shade(cc, -0.3));
      c.fillStyle = shade(cc, 0.2); c.fillRect(w * 0.3, h * 0.36, w * 0.4, h * 0.08);
    } else if (dk === "table") {
      var tc = acc || "#8A6A4A";
      box(w * 0.06, h * 0.14, w * 0.88, h * 0.72, tc);
      c.fillStyle = shade(tc, 0.14); c.fillRect(w * 0.1, h * 0.2, w * 0.8, h * 0.08);
      c.fillStyle = "#E9ECEE"; c.beginPath(); c.arc(w * 0.3, h * 0.55, s * 0.13, 0, Math.PI * 2); c.fill(); c.beginPath(); c.arc(w * 0.68, h * 0.5, s * 0.1, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#5FB4D9"; c.beginPath(); c.arc(w * 0.68, h * 0.5, s * 0.06, 0, Math.PI * 2); c.fill();
    } else if (dk === "bed" || dk === "bed2") {
      var bc = acc || (dk === "bed" ? "#3E6F96" : "#7B4BA8"), dbl = dk === "bed2";
      box(w * 0.08, h * 0.04, w * 0.84, h * 0.92, "#6A7480");
      box(w * 0.12, h * 0.07, w * 0.76, h * 0.86, "#E4E8EC");
      if (dbl) { box(w * 0.15, h * 0.1, w * 0.33, h * 0.13, "#FFFFFF"); box(w * 0.52, h * 0.1, w * 0.33, h * 0.13, "#FFFFFF"); }
      else box(w * 0.2, h * 0.1, w * 0.6, h * 0.13, "#FFFFFF");
      box(w * 0.12, h * 0.32, w * 0.76, h * 0.61, bc);
      c.fillStyle = shade(bc, 0.18); c.fillRect(w * 0.12, h * 0.32, w * 0.76, h * 0.06);
      if (dbl) { c.strokeStyle = shade(bc, -0.3); c.lineWidth = lw; c.beginPath(); c.moveTo(w / 2, h * 0.4); c.lineTo(w / 2, h * 0.9); c.stroke(); }
    } else if (dk === "wc") {
      box(w * 0.26, h * 0.1, w * 0.48, h * 0.2, "#E9ECEE");
      c.fillStyle = "#F4F6F8"; c.beginPath(); c.ellipse(w / 2, h * 0.58, w * 0.24, h * 0.3, 0, 0, Math.PI * 2); c.fill(); c.strokeStyle = ol; c.lineWidth = lw; c.stroke();
      c.fillStyle = "#9FC7D9"; c.beginPath(); c.ellipse(w / 2, h * 0.6, w * 0.13, h * 0.17, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#9AA5B1"; c.fillRect(w * 0.44, h * 0.15, w * 0.12, h * 0.05);
    } else if (dk === "crate") {
      crateArt(c, w, h, s, lw, acc, ol);
    } else if (dk === "cryo") {
      cryoArt(c, w, h, s, lw, acc, ol);
    } else if (dk === "console") {
      consoleArt(c, w, h, s, lw, acc, ol);
    } else if (dk === "shower") {
      c.fillStyle = "#CFE3EC"; c.fillRect(w * 0.08, h * 0.08, w * 0.84, h * 0.84);
      c.strokeStyle = "rgba(120,150,170,.6)"; c.lineWidth = lw * 0.7; c.beginPath();
      for (var i = 1; i < 4; i++) { c.moveTo(w * 0.08 + w * 0.21 * i, h * 0.08); c.lineTo(w * 0.08 + w * 0.21 * i, h * 0.92); c.moveTo(w * 0.08, h * 0.08 + h * 0.21 * i); c.lineTo(w * 0.92, h * 0.08 + h * 0.21 * i); }
      c.stroke();
      c.fillStyle = "#6A7480"; c.beginPath(); c.arc(w / 2, h / 2, s * 0.08, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#9AA5B1"; c.beginPath(); c.arc(w * 0.22, h * 0.22, s * 0.11, 0, Math.PI * 2); c.fill();
      c.strokeStyle = "rgba(140,200,230,.9)"; c.lineWidth = lw * 2; c.beginPath(); c.moveTo(w * 0.92, h * 0.08); c.lineTo(w * 0.92, h * 0.92); c.stroke();
      c.strokeStyle = ol; c.lineWidth = lw; c.strokeRect(w * 0.08, h * 0.08, w * 0.84, h * 0.84);
    }
  }
  // ---------- v0.54.4: Varianten und neue Einrichtung ----------
  // Lüftungsgitter in der Panzerung (wie ein Büro-Lüftungsauslass): Rahmen, dunkler Schacht, schräge Lamellen, vier Schrauben
  function ventArt(c, w, h, s, col, lw, heavy) {
    var m = s * (heavy ? 0.2 : 0.16), gx = m, gy = m, gw = w - m * 2, gh = h - m * 2;
    c.fillStyle = shade(col, -0.3); c.fillRect(gx - lw, gy - lw, gw + lw * 2, gh + lw * 2);   // Rahmen
    c.fillStyle = shade(col, 0.18); c.fillRect(gx - lw, gy - lw, gw + lw * 2, lw);
    c.fillStyle = "#15191E"; c.fillRect(gx, gy, gw, gh);                                       // Schacht
    var n = Math.max(3, Math.round(gh / (s * 0.17))), st = gh / n;
    for (var i = 0; i < n; i++) {
      var y = gy + i * st;
      c.fillStyle = shade(col, 0.05); c.fillRect(gx, y + st * 0.12, gw, st * 0.5);            // Lamelle
      c.fillStyle = shade(col, 0.32); c.fillRect(gx, y + st * 0.12, gw, Math.max(0.6, lw * 0.7));
      c.fillStyle = "rgba(0,0,0,.45)"; c.fillRect(gx, y + st * 0.62, gw, st * 0.16);           // Schatten unter der Lamelle
    }
    if (gw > s * 0.9) { c.fillStyle = shade(col, -0.35); c.fillRect(gx + gw / 2 - lw * 0.6, gy, lw * 1.2, gh); }   // Mittelsteg bei breiten Gittern
    c.fillStyle = shade(col, -0.5); var sr = Math.max(1, s * 0.045);
    [[m * 0.5, m * 0.5], [w - m * 0.5, m * 0.5], [m * 0.5, h - m * 0.5], [w - m * 0.5, h - m * 0.5]].forEach(function (q) { c.beginPath(); c.arc(q[0], q[1], sr, 0, Math.PI * 2); c.fill(); });
  }
  // Gitterboden: Gitterrost über einem dunklen Unterboden mit Leitungen
  function gridFloorArt(c, w, h, s, lw) {
    c.fillStyle = "#2A3038"; c.fillRect(0, 0, w, h);
    c.fillStyle = "#3C4652"; c.fillRect(0, h * 0.3, w, s * 0.1); c.fillStyle = "#5A4630"; c.fillRect(0, h * 0.66, w, s * 0.07);   // Leitungen darunter
    var n = 6, st = w / n, bw = Math.max(1, st * 0.3);
    c.fillStyle = "#8D949C";
    for (var i = 0; i <= n; i++) { c.fillRect(i * st - bw / 2, 0, bw, h); }
    for (var j = 0; j <= Math.round(h / st); j++) { c.fillRect(0, j * st - bw / 2, w, bw); }
    c.fillStyle = "rgba(255,255,255,.18)"; for (var k = 0; k <= n; k++) c.fillRect(k * st - bw / 2, 0, Math.max(0.6, bw * 0.3), h);
    c.strokeStyle = FLOOR2; c.lineWidth = lw * 1.4; c.strokeRect(lw * 0.7, lw * 0.7, w - lw * 1.4, h - lw * 1.4);
  }
  // Rohre auf der Innenwand, laufen in Wandrichtung durch (verbinden sich mit dem nächsten Rohrblock)
  function pipeArt(c, w, h, s, lw, acc) {
    var P = [[0.3, 0.13, acc || "#B87333"], [0.62, 0.09, "#7E8995"], [0.82, 0.06, "#5B7FA6"]];
    P.forEach(function (p) {
      var x = w * p[0], r = s * p[1];
      c.fillStyle = shade(p[2], -0.35); c.fillRect(x - r, 0, r * 2, h);
      c.fillStyle = p[2]; c.fillRect(x - r * 0.75, 0, r * 1.5, h);
      c.fillStyle = shade(p[2], 0.35); c.fillRect(x - r * 0.45, 0, r * 0.35, h);
    });
    c.fillStyle = "#3A414B"; c.fillRect(w * 0.12, h * 0.42, w * 0.8, s * 0.12);   // Halteschelle
    c.fillStyle = "#9AA5B1"; c.fillRect(w * 0.12, h * 0.42, w * 0.8, Math.max(0.6, lw * 0.6));
  }
  // Große Batterie 2×3: Gehäuse mit sechs Zellen, gemeinsamer Ladestand, Polen und Lüftung
  function bigBatArt(c, w, h, s, col, lw, lv, acc, tm) {
    c.fillStyle = shade(col, -0.1); c.fillRect(0, 0, w, h);
    c.fillStyle = shade(col, -0.3); c.fillRect(s * 0.08, s * 0.08, w - s * 0.16, s * 0.34);
    c.fillStyle = acc || ACC; c.fillRect(s * 0.3, s * 0.14, s * 0.3, s * 0.2); c.fillRect(w - s * 0.6, s * 0.14, s * 0.3, s * 0.2);   // Pole
    c.fillStyle = "#E0533F"; c.fillRect(w - s * 0.52, s * 0.21, s * 0.14, s * 0.06);
    var col2 = lv < 0.2 ? "#E0533F" : "#57D18A";
    for (var i = 0; i < 2; i++) for (var j = 0; j < 3; j++) {
      var x = s * (0.16 + i * 0.92), y = s * (0.52 + j * 0.8), cw = s * 0.76, ch = s * 0.66;
      c.fillStyle = DARK; c.fillRect(x, y, cw, ch);
      c.fillStyle = col2; c.fillRect(x + s * 0.06, y + s * 0.06 + (ch - s * 0.12) * (1 - lv), cw - s * 0.12, (ch - s * 0.12) * lv);
      c.fillStyle = "rgba(255,255,255,.12)"; c.fillRect(x + s * 0.06, y + s * 0.06, s * 0.08, ch - s * 0.12);
    }
    c.fillStyle = Math.sin(tm * 3) > 0 && lv < 1 ? "#57D18A" : "#2C5A3E"; c.fillRect(w / 2 - s * 0.06, s * 0.2, s * 0.12, s * 0.12);   // Ladelampe
    c.strokeStyle = shade(col, -0.55); c.lineWidth = lw; c.strokeRect(lw / 2, lw / 2, w - lw, h - lw);
  }
  // Frachtkiste: Container mit Rippen, verstärkten Ecken und Warnstreifen
  function crateArt(c, w, h, s, lw, acc, ol) {
    var cc = acc || "#7A6A3A", m = s * 0.06;
    c.fillStyle = shade(cc, -0.3); c.fillRect(m, m, w - m * 2, h - m * 2);
    c.fillStyle = cc; c.fillRect(m * 2, m * 2, w - m * 4, h - m * 4);
    var long = h >= w, n = Math.max(3, Math.round((long ? h : w) / (s * 0.22)));
    c.fillStyle = shade(cc, -0.18);
    for (var i = 1; i < n; i++) { if (long) c.fillRect(m * 2, m * 2 + (h - m * 4) * i / n - lw * 0.6, w - m * 4, lw * 1.2); else c.fillRect(m * 2 + (w - m * 4) * i / n - lw * 0.6, m * 2, lw * 1.2, h - m * 4); }
    c.fillStyle = shade(cc, 0.22); c.fillRect(m * 2, m * 2, w - m * 4, lw);
    var cs = s * 0.2; c.fillStyle = "#4A525C";
    [[m, m], [w - m - cs, m], [m, h - m - cs], [w - m - cs, h - m - cs]].forEach(function (q) { c.fillRect(q[0], q[1], cs, cs); });
    c.fillStyle = "#8D949C"; [[m, m], [w - m - cs, m], [m, h - m - cs], [w - m - cs, h - m - cs]].forEach(function (q) { c.fillRect(q[0] + cs * 0.35, q[1] + cs * 0.35, cs * 0.3, cs * 0.3); });
    // Warnstreifen und Kennzeichnung
    var sx = w / 2 - Math.min(w, h) * 0.22, sy = h / 2 - s * 0.08, sw = Math.min(w, h) * 0.44;
    c.save(); c.beginPath(); c.rect(sx, sy, sw, s * 0.16); c.clip(); c.fillStyle = "#1E2228"; c.fillRect(sx, sy, sw, s * 0.16); c.fillStyle = "#E3B83F";
    for (var k = -2; k < sw / (s * 0.08) + 2; k++) { c.beginPath(); c.moveTo(sx + k * s * 0.08, sy); c.lineTo(sx + k * s * 0.08 + s * 0.04, sy); c.lineTo(sx + k * s * 0.08 + s * 0.2, sy + s * 0.16); c.lineTo(sx + k * s * 0.08 + s * 0.16, sy + s * 0.16); c.closePath(); c.fill(); }
    c.restore();
    c.strokeStyle = ol; c.lineWidth = lw; c.strokeRect(m, m, w - m * 2, h - m * 2);
  }
  // Kryokapsel (liegend): Kapsel mit Glashaube, gefrorener Insasse, Bedienfeld am Fußende
  function cryoArt(c, w, h, s, lw, acc, ol) {
    var cc = acc || "#C9D1D9", x = w * 0.1, y = h * 0.04, cw = w * 0.8, ch = h * 0.92, r = cw / 2;
    function capsule(x0, y0, ww, hh) { var rr = ww / 2; c.beginPath(); c.moveTo(x0, y0 + rr); c.arc(x0 + rr, y0 + rr, rr, Math.PI, 0); c.lineTo(x0 + ww, y0 + hh - rr * 0.6); c.quadraticCurveTo(x0 + ww, y0 + hh, x0 + ww - rr * 0.6, y0 + hh); c.lineTo(x0 + rr * 0.6, y0 + hh); c.quadraticCurveTo(x0, y0 + hh, x0, y0 + hh - rr * 0.6); c.closePath(); }
    capsule(x, y, cw, ch); c.fillStyle = shade(cc, -0.25); c.fill(); c.strokeStyle = ol; c.lineWidth = lw; c.stroke();
    var gx = x + cw * 0.14, gy = y + cw * 0.12, gw = cw * 0.72, gh = ch * 0.68;
    capsule(gx, gy, gw, gh);
    var g = c.createLinearGradient(gx, gy, gx + gw, gy); g.addColorStop(0, "#7FC8E8"); g.addColorStop(0.5, "#B9E6F5"); g.addColorStop(1, "#6AB4D6"); c.fillStyle = g; c.fill();
    c.save(); c.clip();
    c.fillStyle = "rgba(60,90,120,.55)";   // Insasse als Schemen
    c.beginPath(); c.arc(gx + gw / 2, gy + gw * 0.55, gw * 0.24, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(gx + gw / 2, gy + gh * 0.58, gw * 0.3, gh * 0.33, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = "rgba(255,255,255,.55)"; for (var i = 0; i < 9; i++) c.fillRect(gx + gw * ((i * 37) % 10) / 10, gy + gh * ((i * 53) % 10) / 10, lw * 1.2, lw * 1.2);   // Frost
    c.fillStyle = "rgba(255,255,255,.35)"; c.fillRect(gx + gw * 0.14, gy, gw * 0.1, gh);
    c.restore();
    c.strokeStyle = shade(cc, -0.45); c.lineWidth = lw; capsule(gx, gy, gw, gh); c.stroke();
    c.fillStyle = "#2A2F36"; c.fillRect(x + cw * 0.2, y + ch * 0.84, cw * 0.6, ch * 0.08);   // Bedienfeld
    c.fillStyle = "#57D18A"; c.fillRect(x + cw * 0.26, y + ch * 0.86, cw * 0.1, ch * 0.04); c.fillStyle = "#5FB4D9"; c.fillRect(x + cw * 0.42, y + ch * 0.86, cw * 0.3, ch * 0.04);
  }
  // Bedienmodul 1×2: Pult mit Bildschirmen, Tasten und Schiebereglern, davor ein Hocker
  function consoleArt(c, w, h, s, lw, acc, ol) {
    var dc = "#4A525C";
    c.fillStyle = dc; c.fillRect(w * 0.06, h * 0.04, w * 0.6, h * 0.92); c.strokeStyle = ol; c.lineWidth = lw; c.strokeRect(w * 0.06, h * 0.04, w * 0.6, h * 0.92);
    c.fillStyle = "#3A414B"; c.fillRect(w * 0.06, h * 0.04, w * 0.16, h * 0.92);   // hinterer Aufbau
    [[0.08, 0.34], [0.54, 0.34]].forEach(function (q) { c.fillStyle = "#0E1A22"; c.fillRect(w * 0.08, h * q[0], w * 0.12, h * q[1]); c.fillStyle = "rgba(95,180,217,.85)"; c.fillRect(w * 0.1, h * (q[0] + 0.02), w * 0.08, h * (q[1] - 0.04)); });
    var keys = ["#E0533F", "#E3B83F", "#57D18A", "#5FB4D9"];
    for (var i = 0; i < 4; i++) for (var j = 0; j < 3; j++) { c.fillStyle = keys[(i + j) % 4]; c.fillRect(w * (0.27 + j * 0.11), h * (0.08 + i * 0.05), w * 0.07, h * 0.03); }
    c.fillStyle = "#24282E"; for (var k = 0; k < 3; k++) c.fillRect(w * 0.28, h * (0.4 + k * 0.07), w * 0.3, h * 0.012);   // Schieberegler
    c.fillStyle = "#C9D1D9"; [0.35, 0.5, 0.42].forEach(function (p, k) { c.fillRect(w * p, h * (0.39 + k * 0.07), w * 0.05, h * 0.03); });
    c.fillStyle = "#2A2F36"; c.beginPath(); c.arc(w * 0.42, h * 0.74, w * 0.1, 0, Math.PI * 2); c.fill();   // Drehregler
    c.strokeStyle = "#C9D1D9"; c.lineWidth = lw; c.beginPath(); c.moveTo(w * 0.42, h * 0.74); c.lineTo(w * 0.48, h * 0.7); c.stroke();
    c.fillStyle = "#57D18A"; c.fillRect(w * 0.3, h * 0.86, w * 0.05, h * 0.025); c.fillStyle = "#E0533F"; c.fillRect(w * 0.4, h * 0.86, w * 0.05, h * 0.025);
    var sc = acc || "#3E6F96"; c.fillStyle = sc; c.beginPath(); c.arc(w * 0.82, h * 0.5, w * 0.13, 0, Math.PI * 2); c.fill(); c.strokeStyle = ol; c.stroke();   // Hocker
  }
  // Luke: gelb-schwarzer Warnrahmen, geschlossen mit Schott, offen sieht man ins All
  function hatchArt(c, w, h, col, lw, view, open) {
    if (view === "out") roof(c, w, h, col, lw); else { c.fillStyle = FLOOR; c.fillRect(0, 0, w, h); }
    var b = w * 0.16;
    c.save(); c.beginPath(); c.rect(0, 0, w, h); c.rect(b, b, w - b * 2, h - b * 2); c.clip("evenodd");
    c.fillStyle = "#24282E"; c.fillRect(0, 0, w, h); c.fillStyle = "#E3B83F";
    for (var i = -2; i < 6; i++) { c.beginPath(); c.moveTo(i * w * 0.25, 0); c.lineTo(i * w * 0.25 + w * 0.125, 0); c.lineTo(i * w * 0.25 + w * 0.125 + h, h); c.lineTo(i * w * 0.25 + h, h); c.closePath(); c.fill(); }
    c.restore();
    if (open) { c.fillStyle = "#06080C"; c.fillRect(b, b, w - b * 2, h - b * 2); c.fillStyle = "rgba(255,255,255,.7)"; c.fillRect(w * 0.3, h * 0.4, lw, lw); c.fillRect(w * 0.62, h * 0.66, lw, lw); }
    else { c.fillStyle = shade(col, -0.12); c.fillRect(b, b, w - b * 2, h - b * 2); c.strokeStyle = shade(col, -0.45); c.lineWidth = lw; c.beginPath(); c.moveTo(b, h / 2); c.lineTo(w - b, h / 2); c.stroke(); c.fillStyle = shade(col, -0.35); c.fillRect(w * 0.42, h * 0.3, w * 0.16, h * 0.4); }
  }
  // Astronaut von oben: Helm mit Visier, Schultern, Rucksack, Arme und Füße bewegen sich beim Laufen
  function drawAstronaut(c, x, y, face, ph, sc, weld, gun) {
    var sw = Math.sin(ph), cw = Math.cos(ph);
    c.save(); c.translate(x, y); c.rotate(face); c.scale(sc, sc);
    c.fillStyle = "rgba(0,0,0,.25)"; c.beginPath(); c.ellipse(1, 1.5, 7, 9.5, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#3A3F46"; c.beginPath(); c.ellipse(sw * 4.2, -3.6, 3.2, 2.1, 0, 0, Math.PI * 2); c.fill(); c.beginPath(); c.ellipse(-sw * 4.2, 3.6, 3.2, 2.1, 0, 0, Math.PI * 2); c.fill();
    c.save(); c.rotate(sw * 0.18);
    c.fillStyle = "#8C96A0"; c.fillRect(-8.5, -4.5, 4, 9);
    c.fillStyle = "#E3E7EA"; c.beginPath(); c.ellipse(0, 0, 4.6, 8.2, 0, 0, Math.PI * 2); c.fill(); c.strokeStyle = "#9AA3AD"; c.lineWidth = 0.8; c.stroke();
    c.fillStyle = "#E0743A"; c.beginPath(); c.arc(-0.5, -7.2, 2.2, 0, Math.PI * 2); c.fill(); c.beginPath(); c.arc(-0.5, 7.2, 2.2, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#D5DADF"; c.beginPath(); c.arc(1.5 - sw * 3.2, -8.8, 1.8, 0, Math.PI * 2); c.fill();
    var hx = weld || gun ? 6.5 : 1.5 + sw * 3.2, hy = weld || gun ? 4.5 : 8.8; c.beginPath(); c.arc(hx, hy, 1.8, 0, Math.PI * 2); c.fill();
    if (gun) { c.fillStyle = "#2A2F36"; c.fillRect(6.5, 3.6, gun === 2 ? 8.6 : 6, 1.8); c.fillRect(6.8, 4.6, 1.6, 2.4); if (gun === 2) { c.fillRect(9.2, 4.6, 1.3, 3.2); c.fillStyle = "#4A525C"; c.fillRect(4.2, 3.8, 2.6, 1.4); } }   // 1 Pistole, 2 Maschinenpistole: längerer Lauf, Magazin, Schulterstütze
    if (weld) { c.fillStyle = "#3A3F46"; c.fillRect(6, 3.4, 5, 2.2); var g = 0.6 + 0.4 * Math.random(); c.fillStyle = "rgba(150,220,255," + g + ")"; c.beginPath(); c.arc(11.8, 4.5, 1.6 + Math.random(), 0, Math.PI * 2); c.fill(); }
    c.restore();
    c.fillStyle = "#F4F6F8"; c.beginPath(); c.arc(0.6, 0, 4.4, 0, Math.PI * 2); c.fill(); c.strokeStyle = "#9AA3AD"; c.lineWidth = 0.7; c.stroke();
    c.fillStyle = "#3E6F96"; c.beginPath(); c.ellipse(2.6, 0, 2, 3.2, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = "rgba(255,255,255,.55)"; c.fillRect(2.4, -2, 0.9, 1.6);
    void cw;
    c.restore();
  }
  function roof(c, w, h, col, lw) {
    c.fillStyle = shade(col, 0.08); c.fillRect(0, 0, w, h);
    c.strokeStyle = shade(col, -0.2); c.lineWidth = lw; c.strokeRect(lw / 2, lw / 2, w - lw, h - lw);
    c.fillStyle = shade(col, -0.12); c.fillRect(w * 0.2, h * 0.2, lw * 1.5, lw * 1.5); c.fillRect(w * 0.75, h * 0.75, lw * 1.5, lw * 1.5);
  }
  // Beschädigt: leichte Beulen und Risse (Zufall aus der Blockposition, damit es stabil bleibt)
  function damageMarks(c, w, h, b, s, sh) {
    var sd = (Math.abs(b.x * 73856093 ^ b.y * 19349663 ^ b.t.length * 83492791) % 997) / 997, v = Math.floor(sd * 4);
    c.save(); shapePath(c, sh || "full", w, h); c.clip();
    c.translate(w / 2, h / 2); c.rotate(v * Math.PI / 2); if (sd > 0.5) c.scale(-1, 1); c.translate(-w / 2, -h / 2);
    // Beule: leicht abgedunkelte, eingedrückte Ecke mit heller Kante
    c.fillStyle = "rgba(10,12,16,.22)"; c.beginPath(); c.moveTo(w * 0.55, 0); c.lineTo(w, 0); c.lineTo(w, h * 0.42); c.quadraticCurveTo(w * 0.72, h * 0.28, w * 0.55, 0); c.fill();
    c.strokeStyle = "rgba(255,255,255,.22)"; c.lineWidth = Math.max(0.6, s / 30); c.beginPath(); c.moveTo(w * 0.55, 0); c.quadraticCurveTo(w * 0.72, h * 0.28, w, h * 0.42); c.stroke();
    // zwei feine Risse
    c.strokeStyle = "rgba(14,15,18,.6)"; c.lineWidth = Math.max(0.6, s / 28);
    c.beginPath(); c.moveTo(w * (0.2 + sd * 0.15), h * 0.62); c.lineTo(w * 0.36, h * 0.5); c.lineTo(w * 0.44, h * 0.56); c.lineTo(w * 0.58, h * 0.44);
    c.moveTo(w * 0.36, h * 0.5); c.lineTo(w * 0.33, h * 0.36);
    c.stroke();
    c.restore();
  }

