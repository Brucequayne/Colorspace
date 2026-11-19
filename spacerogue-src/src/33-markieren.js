  // ===== 33-markieren.js · Markieren, Kopieren, Einfügen (seit v0.59.1) =====
  // Werkzeug "Markieren" (Taste 4): Rahmen über Blöcke ziehen (Umschalt fügt hinzu). Strg+C kopiert, Strg+X schneidet aus,
  // Entf löscht. Strg+V hängt die Kopie als Hologramm an die Maus: R dreht (Umschalt+R andersherum), F spiegelt,
  // Linksklick setzt (mit Umschalt bleibt das Hologramm für weitere Kopien), Rechtsklick oder Esc bricht ab.
  // Gesetzt wird frei, ohne Anschlusspflicht – aber erst, wenn kein Teil auf einem belegten Feld liegt (Böden werden ersetzt).
  Object.assign(TX, {
    tSel: L2("Markieren", "Select"), selN: L2("{n} Blöcke markiert · Strg+C kopieren · Strg+X ausschneiden · Entf löschen", "{n} blocks selected · Ctrl+C copy · Ctrl+X cut · Del delete"),
    selCopy: L2("{n} Blöcke kopiert · Strg+V einfügen", "{n} blocks copied · Ctrl+V paste"), selCut: L2("{n} Blöcke ausgeschnitten · Strg+V einfügen", "{n} blocks cut · Ctrl+V paste"),
    selDel: L2("{n} Blöcke gelöscht", "{n} blocks deleted"), selNone: L2("Nichts markiert – mit Markieren (4) einen Rahmen ziehen", "Nothing selected – drag a frame with Select (4)"),
    selClipNone: L2("Nichts kopiert", "Nothing copied"), holoHint: L2("Hologramm: Maus bewegt · R drehen · F spiegeln · Klick setzt (Umschalt: weitere) · Rechtsklick/Esc abbrechen", "Hologram: mouse moves · R rotate · F mirror · click places (Shift: more) · right-click/Esc cancel"),
    holoPut: L2("{n} Blöcke gesetzt", "{n} blocks placed"), holoBlock: L2("{k} Blöcke überlappen (rot) – Hologramm verschieben oder drehen", "{k} blocks overlap (red) – move or rotate the hologram")
  });
  // Rechteck eines Blocks in Zellen
  function bRect(b) { var f = fp(b); return [b.x, b.y, b.x + f[0], b.y + f[1]]; }
  function selList() { if (!V.selSet) return []; return S.blocks.filter(function (b) { return V.selSet.has(b); }); }
  function selClear() { V.selSet = null; V.selBox = null; }
  function selBoxDown(m, add) { V.selBox = { x0: m.x, y0: m.y, x1: m.x, y1: m.y, add: add }; }
  function selBoxUp() {
    var bx = V.selBox; V.selBox = null; if (!bx) return;
    var x0 = Math.floor(Math.min(bx.x0, bx.x1)), y0 = Math.floor(Math.min(bx.y0, bx.y1)), x1 = Math.floor(Math.max(bx.x0, bx.x1)) + 1, y1 = Math.floor(Math.max(bx.y0, bx.y1)) + 1;
    var set = bx.add && V.selSet ? V.selSet : new Set();
    S.blocks.forEach(function (b) { var r = bRect(b); if (r[0] < x1 && r[2] > x0 && r[1] < y1 && r[3] > y0) set.add(b); });
    V.selSet = set.size ? set : null;
    if (V.selSet) note(fmt(t("selN"), { n: nf(V.selSet.size) }));
  }
  // Kopie: Blöcke relativ zur Mitte ihres Rahmens (ganze Zellen)
  function selCopy(cut) {
    var L = selList(); if (!L.length) { note(t("selNone")); return; }
    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; L.forEach(function (b) { var r = bRect(b); x0 = Math.min(x0, r[0]); y0 = Math.min(y0, r[1]); x1 = Math.max(x1, r[2]); y1 = Math.max(y1, r[3]); });
    var cx = Math.floor((x0 + x1) / 2), cy = Math.floor((y0 + y1) / 2);
    V.clip = L.map(function (b) { var o = { t: b.t, x: b.x - cx, y: b.y - cy, r: b.r, f: b.f }; if (b.c) o.c = b.c; return o; });
    if (cut) { pushUndo(); S.blocks = S.blocks.filter(function (b) { return !V.selSet.has(b); }); selClear(); save(); syncUI(); note(fmt(t("selCut"), { n: nf(L.length) })); }
    else note(fmt(t("selCopy"), { n: nf(L.length) }));
  }
  function selDelete() { var L = selList(); if (!L.length) return false; pushUndo(); S.blocks = S.blocks.filter(function (b) { return !V.selSet.has(b); }); selClear(); save(); syncUI(); note(fmt(t("selDel"), { n: nf(L.length) })); return true; }
  // Hologramm
  function holoStart() {
    if (!V.clip || !V.clip.length) { note(t("selClipNone")); return; }
    var L = V.clip; if (S.ed !== "station") L = L.filter(function (b) { return !T[b.t].dev; });   // Dev-Bauteile gibt es im Schiffsbau nicht
    if (!L.length) return;
    S.envTab = false; S.evTab = false; V.row = null;
    V.holo = L.map(function (b) { return Object.assign({}, b); }); note(t("holoHint")); syncUI();
  }
  // ganze Struktur um die Mitte drehen: Zelle (x, y) → (−y−1, x), jeder Block eine Stufe weiter (wie cellOf)
  function holoRot(dir) {
    var n = dir < 0 ? 3 : 1;
    for (var k = 0; k < n; k++) V.holo = V.holo.map(function (b) { var r = bRect(b), o = Object.assign({}, b); o.r = (b.r + 1) % 4; o.x = -r[3]; o.y = r[0]; return o; });
  }
  function holoFlip() { V.holo = V.holo.map(function (b) { var f = fp(b), o = Object.assign({}, b); o.x = -b.x - f[0]; o.r = (4 - b.r) % 4; o.f = b.f ? 0 : 1; return o; }); }
  function holoAt() { var cx = Math.floor(V.mouse ? V.mouse.x : 0), cy = Math.floor(V.mouse ? V.mouse.y : 0); return V.holo.map(function (b) { var o = Object.assign({}, b); o.x += cx; o.y += cy; return o; }); }
  // welche Teile passen? Belegt = schon ein Block da (Böden darf alles ersetzen, was kein Boden ist)
  function holoCheck(list, M) {
    var mine = new Map();
    return list.map(function (b) {
      var ok = true, cs = cellsOf(b);
      cs.forEach(function (q) { var k = key(q.c[0], q.c[1]); if ((M.has(k) && !replaceable(b.t, M.get(k))) || mine.has(k)) ok = false; });
      if (ok) cs.forEach(function (q) { mine.set(key(q.c[0], q.c[1]), 1); });
      return ok;
    });
  }
  function holoPlace(keep) {
    var list = holoAt(), M = buildMap(S.blocks), ok = holoCheck(list, M), put = list.filter(function (b, i) { return ok[i]; });
    if (put.length < list.length) { note(fmt(t("holoBlock"), { k: nf(list.length - put.length) })); return; }   // erst setzen, wenn alles frei ist
    pushUndo();
    var under = new Set(); put.forEach(function (q) { if (T[q.t].kind === "floor" && !T[q.t].loot) return; cellsOf(q).forEach(function (c) { under.add(key(c.c[0], c.c[1])); }); });
    if (under.size) S.blocks = S.blocks.filter(function (q) { return !(T[q.t].kind === "floor" && under.has(key(q.x, q.y))); });
    put.forEach(function (q) { var o = { t: q.t, x: q.x, y: q.y, r: q.r, f: q.f }; if (q.c) o.c = q.c; S.blocks.push(o); });
    save(); if (!keep) V.holo = null; syncUI();
    note(fmt(t("holoPut"), { n: nf(put.length) }));
  }
  // Zeichnen (im Zellen-Raster, c ist schon verschoben, s = Pixel je Zelle)
  function selDraw(c, s, tm) {
    if (V.selSet) { c.strokeStyle = "#5FD0D8"; c.lineWidth = 2; c.fillStyle = "rgba(95,208,216,.14)"; selList().forEach(function (b) { var r = bRect(b); c.fillRect(r[0] * s, r[1] * s, (r[2] - r[0]) * s, (r[3] - r[1]) * s); c.strokeRect(r[0] * s + 1, r[1] * s + 1, (r[2] - r[0]) * s - 2, (r[3] - r[1]) * s - 2); }); }
    if (V.selBox) {
      var bx = V.selBox, x0 = Math.floor(Math.min(bx.x0, bx.x1)), y0 = Math.floor(Math.min(bx.y0, bx.y1)), x1 = Math.floor(Math.max(bx.x0, bx.x1)) + 1, y1 = Math.floor(Math.max(bx.y0, bx.y1)) + 1;
      c.fillStyle = "rgba(95,208,216,.08)"; c.fillRect(x0 * s, y0 * s, (x1 - x0) * s, (y1 - y0) * s);
      c.setLineDash([6, 4]); c.strokeStyle = "#5FD0D8"; c.lineWidth = 1.5; c.strokeRect(x0 * s + 0.5, y0 * s + 0.5, (x1 - x0) * s, (y1 - y0) * s); c.setLineDash([]);
      c.fillStyle = "#5FD0D8"; c.font = "700 12px " + FONTS(); c.textAlign = "left"; c.fillText((x1 - x0) + " × " + (y1 - y0), x1 * s + 6, y1 * s);
    }
    if (V.holo && V.mouse) {
      var list = holoAt(), ok = holoCheck(list, buildMap(S.blocks)), pulse = 0.45 + 0.15 * Math.sin(tm * 5);
      list.forEach(function (b, i) {
        c.globalAlpha = pulse; drawBlock(c, b, s, S.view, 1, tm); c.globalAlpha = 1;
        var r = bRect(b); c.fillStyle = ok[i] ? "rgba(95,208,216,.18)" : "rgba(224,83,63,.35)"; c.fillRect(r[0] * s, r[1] * s, (r[2] - r[0]) * s, (r[3] - r[1]) * s);
      });
      var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; list.forEach(function (b) { var r = bRect(b); x0 = Math.min(x0, r[0]); y0 = Math.min(y0, r[1]); x1 = Math.max(x1, r[2]); y1 = Math.max(y1, r[3]); });
      c.setLineDash([8, 5]); c.strokeStyle = "#5FD0D8"; c.lineWidth = 2; c.strokeRect(x0 * s, y0 * s, (x1 - x0) * s, (y1 - y0) * s); c.setLineDash([]);
    }
  }
