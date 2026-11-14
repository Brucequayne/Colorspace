  // ===== 57-gegenstaende.js · Gegenstände (v0.57): aufheben, ablegen, Inventar mit Ziehen und Ablegen, Credits, Bankautomat, Kontostand =====
  // Spieler: FL.hot (Schnellleiste 1–9) und FL.inv (Inventar 8×8). Ein Platz ist leer (null) oder { id, n }.
  // In der Welt: bd.items = [{ id, n, x, y, a }] liegen im Raster eines Körpers (Schiff/Station) und fahren mit,
  // FL.loose = [{ id, n, x, y, vx, vy, a, w }] treiben frei im All (Weltkoordinaten in m).
  // Credits liegen im Developer Tool als Boden-Bauteil mit loot/amt bereit (11-bauteile.js); beim Testflug wird daraus Boden plus Gegenstand.
  var ITEMS = {
    welder: { n: L2("Schweißgerät", "Welder"), fix: true },
    pistol: { n: L2("Pistole", "Pistol"), fix: true, gun: 1 },
    smg: { n: L2("Maschinenpistole", "Submachine gun"), gun: 2 },
    credits: { n: L2("Credits", "Credits"), stack: true }
  };
  ITEMS.welder.ic = HOT[0].ic; ITEMS.pistol.ic = HOT[1].ic; ITEMS.smg.ic = HOT[2].ic;
  // Geldbündel: zwei Packen Scheine mit Banderole
  ITEMS.credits.ic = '<svg viewBox="0 0 24 24"><path d="M5 12h15v7H5z" fill="#3F7A55"/><path d="M5 12h15v2H5z" fill="#6FAE80"/><path d="M5 16h15M5 17.6h15" stroke="#2E5C40" stroke-width=".6"/><path d="M11 12h3v7h-3z" fill="#E8DFC8"/>' +
    '<path d="M3 6h15v7H3z" fill="#4A8A62"/><path d="M3 6h15v2H3z" fill="#86C496"/><path d="M3 10h15M3 11.6h15" stroke="#2E5C40" stroke-width=".6"/><path d="M9 6h3v7H9z" fill="#F2EBD8"/><circle cx="5.6" cy="7" r=".7" fill="#2E5C40"/><circle cx="15.4" cy="7" r=".7" fill="#2E5C40"/></svg>';
  var KONTO = "spacerogue-konto-v1", PICK_R = 0.95, PICK_EVA = 1.6, ATM_R = 1.35;
  function itemName(it) { var d = ITEMS[it.id]; return d.stack ? d.n[lang] + " × " + nf(it.n) : d.n[lang]; }
  // ---------- Kontostand (bleibt auf dem Gerät gespeichert) ----------
  function balGet() { try { return Math.max(0, parseInt(localStorage.getItem(KONTO), 10) || 0); } catch (e) { return 0; } }
  function balAdd(n) { var v = balGet() + n; try { localStorage.setItem(KONTO, String(v)); } catch (e) {} balSync(); return v; }
  function balSync() { if (V) set("sr-bal-v", cr(balGet())); }
  // ---------- Spieler-Inventar ----------
  function itemsInit() {
    FL.hot = [{ id: "welder", n: 1 }, { id: "pistol", n: 1 }, { id: "smg", n: 1 }, null, null, null, null, null, null];
    FL.inv = []; for (var i = 0; i < INV.w * INV.h; i++) FL.inv.push(null);
    FL.loose = []; FL.useT = null;
  }
  function held() { var it = FL && FL.hot ? FL.hot[FL.slot - 1] : null; return it ? it.id : null; }
  function heldGun() { var h = held(); return h && ITEMS[h].gun ? ITEMS[h].gun : 0; }
  function slotArr(s) { return s.charAt(0) === "h" ? FL.hot : FL.inv; }
  function slotGet(s) { return slotArr(s)[+s.slice(1)]; }
  function slotSet(s, v) { slotArr(s)[+s.slice(1)] = v; }
  function slotFixed(s) { return s.charAt(0) === "h" && +s.slice(1) < 2; }   // Schweißgerät und Pistole bleiben fest auf 1 und 2
  // Aufnehmen: Stapel zuerst zusammenlegen; Waffen bevorzugt in die Schnellleiste, Credits ins Inventar
  function invAdd(it) {
    var d = ITEMS[it.id], all = FL.hot.concat(FL.inv), i;
    if (d.stack) for (i = 0; i < all.length; i++) if (all[i] && all[i].id === it.id) { all[i].n += it.n; return true; }
    var order = d.stack ? ["inv", "hot"] : ["hot", "inv"];
    for (var o = 0; o < 2; o++) { var arr = FL[order[o]]; for (i = arr === FL.hot ? 2 : 0; i < arr.length; i++) if (!arr[i]) { arr[i] = { id: it.id, n: it.n }; return true; } }
    return false;
  }
  function invCount() { return FL.inv.filter(Boolean).length; }
  function creditsHeld() { var n = 0; FL.hot.concat(FL.inv).forEach(function (q) { if (q && q.id === "credits") n += q.n; }); return n; }
  function creditsTake() { var n = 0; [FL.hot, FL.inv].forEach(function (arr) { arr.forEach(function (q, i) { if (q && q.id === "credits") { n += q.n; arr[i] = null; } }); }); return n; }
  function itemsChanged() { syncHot(); if (invOpen()) invRender(); }
  // ---------- Welt: ablegen, aufheben, Boden weg ----------
  function dropItem(it) {
    if (!it) return;
    if (FL.out && FL.eva) {   // draußen: der Gegenstand treibt mit dem Tempo der Figur weiter
      var E = FL.eva; FL.loose.push({ id: it.id, n: it.n, x: E.x + Math.cos(E.face) * 0.6, y: E.y + Math.sin(E.face) * 0.6, vx: E.vx + Math.cos(E.face) * 0.6, vy: E.vy + Math.sin(E.face) * 0.6, a: E.face, w: (Math.random() - 0.5) * 2 });
    } else {
      var pb = FL.pb || FL.me, P = FL.pilot, fx = P.x + Math.cos(P.face) * 0.55, fy = P.y + Math.sin(P.face) * 0.55;
      if (!walkable(pb, fx, fy)) { fx = P.x; fy = P.y; }
      (pb.items || (pb.items = [])).push({ id: it.id, n: it.n, x: fx, y: fy, a: P.face + (Math.random() - 0.5) * 0.8 });
    }
    floatTxt(fmt(t("itDropped"), { n: itemName(it) }));
  }
  function dropHeld() {
    var s = "h" + (FL.slot - 1), it = slotGet(s);
    if (!it) { note(t("itNone")); return; }
    if (slotFixed(s)) { note(t("itFixed")); return; }
    slotSet(s, null); dropItem(it); itemsChanged();
  }
  // Was liegt in Reichweite? Gegenstände zuerst, sonst ein Bankautomat
  function findUse() {
    if (!FL || FL.seated) return null;
    var best = null, bd2 = Infinity;
    if (FL.out && FL.eva) {
      var E = FL.eva;
      FL.loose.forEach(function (q) { var d = Math.hypot(q.x - E.x, q.y - E.y); if (d < PICK_EVA && d < bd2) { bd2 = d; best = { k: "loose", q: q }; } });
      FL.bodies.forEach(function (b) { (b.items || []).forEach(function (q) { var w = toWorld(b, q.x, q.y), d = Math.hypot(w.x - E.x, w.y - E.y); if (d < PICK_EVA && d < bd2) { bd2 = d; best = { k: "body", q: q, bd: b }; } }); });
      return best;
    }
    var pb = FL.pb || FL.me, P = FL.pilot;
    (pb.items || []).forEach(function (q) { var d = Math.hypot(q.x - P.x, q.y - P.y); if (d < PICK_R && d < bd2) { bd2 = d; best = { k: "body", q: q, bd: pb }; } });
    if (best) return best;
    pb.blocks.forEach(function (b) {
      if (T[b.t].dk !== "atm") return; var f = fp(b), cx = Math.max(b.x, Math.min(b.x + f[0], P.x)), cy = Math.max(b.y, Math.min(b.y + f[1], P.y)), d = Math.hypot(cx - P.x, cy - P.y);
      if (d < ATM_R && d < bd2) { bd2 = d; best = { k: "atm", b: b }; }
    });
    return best;
  }
  function useKey() {
    var u = findUse(); if (!u) { note(t("itNothing")); return; }
    if (u.k === "atm") {
      var n = creditsTake(); if (!n) { note(t("atmEmpty")); return; }
      balAdd(n); floatTxt(fmt(t("atmIn"), { n: cr(n) }), "242,193,78"); itemsChanged(); return;
    }
    var q = u.q;
    if (!invAdd({ id: q.id, n: q.n })) { note(t("itFull")); return; }
    if (u.k === "loose") FL.loose.splice(FL.loose.indexOf(q), 1); else u.bd.items.splice(u.bd.items.indexOf(q), 1);
    floatTxt(fmt(t("itTaken"), { n: itemName(q) }), q.id === "credits" ? "242,193,78" : undefined); itemsChanged();
  }
  function itemsTick(dt) {
    if (!FL.loose) return;
    FL.loose.forEach(function (q) { q.x += q.vx * dt; q.y += q.vy * dt; q.a += q.w * dt; });
    // Boden unter einem Gegenstand zerstört oder Körper zerbrochen: er treibt ins All
    FL.bodies.forEach(function (b) {
      if (!b.items || !b.items.length) return;
      for (var i = b.items.length - 1; i >= 0; i--) {
        var q = b.items[i]; if (walkable(b, q.x, q.y)) continue;
        var w = toWorld(b, q.x, q.y), rx = w.x - b.x, ry = w.y - b.y;
        FL.loose.push({ id: q.id, n: q.n, x: w.x, y: w.y, vx: b.vx - b.w * ry + (Math.random() - 0.5), vy: b.vy + b.w * rx + (Math.random() - 0.5), a: q.a + b.a, w: (Math.random() - 0.5) * 3 });
        b.items.splice(i, 1);
      }
    });
    FL.useT = findUse(); FL.spT = FL.seated ? null : FL.out ? edgeLand() : edgeOff();
  }
  function useHint() {
    var u = FL && FL.useT, h = "";
    if (u) h = u.k === "atm" ? (creditsHeld() ? fmt(t("atmHint"), { n: cr(creditsHeld()) }) : t("atmHint0")) : fmt(t("itHint"), { n: itemName(u.q) });
    var sp = FL && FL.spT ? t(FL.spT.k === "off" ? "spOff" : "spLand") : "";
    return h && sp ? h + "   ·   " + sp : h || sp;
  }
  // Gegenstand im Editor auf einen Boden gesetzt: im Flug bekommt die Zelle den Boden des Raums (häufigster Nachbarboden)
  function lootFloor(blocks, b) {
    var M = {}, best = "flo", bn = 0;
    blocks.forEach(function (q) { if (Math.abs(q.x - b.x) + Math.abs(q.y - b.y) === 1 && T[q.t].kind === "floor" && !T[q.t].loot) { M[q.t] = (M[q.t] || 0) + 1; if (M[q.t] > bn) { bn = M[q.t]; best = q.t; } } });
    return best;
  }
  // ---------- Leertaste (v0.57.1): am offenen Rand vom Boden lösen, draußen am Rand landen ----------
  function edgeOff() {   // zu Fuß: steht die Figur auf Boden/Tür mit offener Seite zum All? Richtung = die offene Seite, die am ehesten in Blickrichtung liegt
    if (!FL || FL.seated || FL.out) return null;
    var bd = FL.pb || FL.me, P = FL.pilot, cx = Math.floor(P.x), cy = Math.floor(P.y), o = bd.map.get(key(cx, cy)), best = null, bs = -9;
    if (!o || !openEdgeKind(T[o.b.t].kind)) return null;
    for (var d = 0; d < 4; d++) {
      if (bd.map.has(key(cx + DV[d][0], cy + DV[d][1]))) continue;
      var sc = Math.cos(Math.atan2(DV[d][1], DV[d][0]) - P.face); if (sc > bs) { bs = sc; best = d; }
    }
    return best === null ? null : { k: "off", bd: bd, d: best, cx: cx, cy: cy };
  }
  function edgeLand() {   // draußen: nächste Boden-/Türzelle mit offener Seite in Reichweite
    if (!FL || !FL.out || !FL.eva) return null;
    var best = null, bd2 = 2.2;   // Reichweite in Zellen (2,2 Zellen = 5,5 m)
    FL.bodies.forEach(function (bd) {
      if (bd.enemy || bd.dead) return;
      var lp = toLocal(bd, FL.eva.x, FL.eva.y), x0 = Math.floor(lp.x), y0 = Math.floor(lp.y);
      for (var yy = y0 - 2; yy <= y0 + 2; yy++) for (var xx = x0 - 2; xx <= x0 + 2; xx++) {
        var o = bd.map.get(key(xx, yy)); if (!o || !openEdgeKind(T[o.b.t].kind) || !canStand(bd, xx + 0.5, yy + 0.5)) continue;
        var open = false; for (var d = 0; d < 4; d++) if (!bd.map.has(key(xx + DV[d][0], yy + DV[d][1]))) open = true;
        if (!open) continue;
        var dist = Math.hypot(lp.x - xx - 0.5, lp.y - yy - 0.5); if (dist < bd2) { bd2 = dist; best = { k: "land", bd: bd, cx: xx, cy: yy }; }
      }
    });
    return best;
  }
  function spaceAct() {
    var s = FL.out ? edgeLand() : edgeOff();
    if (!s) { note(t("spNone")); return; }
    if (s.k === "land") { enterAt(s.bd, s.cx, s.cy); return; }
    var dx = DV[s.d][0], dy = DV[s.d][1], P = FL.pilot;
    exitShip(s.bd, s.cx + 0.5 + dx * 0.85, s.cy + 0.5 + dy * 0.85, false, Math.atan2(dy, dx));   // sanft abstoßen (0,3 m/s nach außen)
  }
  // Hinweis direkt am Ziel in der Welt (Bankautomat, Gegenstand)
  function drawUsePrompt(c, ppm) {
    var u = FL && FL.useT; if (!u) return;
    var w, txt = t(u.k === "atm" ? "atmLbl" : "itLbl");
    if (u.k === "atm") { var f = fp(u.b), pb = FL.pb || FL.me; w = toWorld(pb, u.b.x + f[0] / 2, u.b.y + f[1] / 2); }
    else if (u.k === "loose") w = { x: u.q.x, y: u.q.y };
    else w = toWorld(u.bd, u.q.x, u.q.y);
    var fs = 12 / ppm, y = w.y - 26 / ppm;
    c.save(); c.font = "700 " + fs + "px " + FONTS(); c.textBaseline = "middle"; c.textAlign = "left";
    var tw = c.measureText(txt).width, kw = 16 / ppm, pad = 6 / ppm, W = kw + pad * 3 + tw, H = 22 / ppm, x = w.x - W / 2;
    c.fillStyle = "rgba(14,18,26,.86)"; c.fillRect(x, y - H / 2, W, H); c.strokeStyle = "rgba(242,193,78,.75)"; c.lineWidth = 1 / ppm; c.strokeRect(x, y - H / 2, W, H);
    c.fillStyle = "#F2C14E"; c.fillRect(x + pad, y - kw / 2, kw, kw); c.fillStyle = "#14181F"; c.textAlign = "center"; c.fillText("E", x + pad + kw / 2, y + 0.5 / ppm);
    c.fillStyle = "#EEF2F6"; c.textAlign = "left"; c.fillText(txt, x + pad * 2 + kw, y + 0.5 / ppm);
    c.restore();
  }
  // ---------- Zeichnen in der Welt ----------
  // Gegenstand auf dem Boden: c im Schiffsmaßstab (1 Zelle = s Pixel), Mitte cx/cy
  function itemArt(c, id, cx, cy, s, a) {
    c.save(); c.translate(cx, cy); c.rotate(a || 0); var u = s / 24;
    c.fillStyle = "rgba(0,0,0,.35)"; c.fillRect(-9 * u, -6 * u + 1.5 * u, 18 * u, 12 * u);
    if (id === "credits") {   // zwei Geldbündel, leicht versetzt, mit Banderole
      [[2.2, 2.6, "#3F7A55", "#6FAE80"], [-2.2, -2.2, "#4A8A62", "#86C496"]].forEach(function (p) {
        var bx = p[0] * u, by = p[1] * u, w = 13 * u, h = 7 * u;
        c.fillStyle = "#2E5C40"; c.fillRect(bx - w / 2 + 0.6 * u, by - h / 2 + 0.9 * u, w, h);   // Kante des Packens
        c.fillStyle = p[2]; c.fillRect(bx - w / 2, by - h / 2, w, h);
        c.fillStyle = p[3]; c.fillRect(bx - w / 2 + 0.7 * u, by - h / 2 + 0.7 * u, w - 1.4 * u, h - 1.4 * u);   // oberster Schein
        c.strokeStyle = "#2E5C40"; c.lineWidth = 0.5 * u; c.strokeRect(bx - w / 2 + 1.5 * u, by - h / 2 + 1.5 * u, w - 3 * u, h - 3 * u);
        c.fillStyle = "#2E5C40"; c.beginPath(); c.arc(bx, by, 1.3 * u, 0, Math.PI * 2); c.fill();
        c.fillStyle = "#EFE7D2"; c.fillRect(bx - 4.6 * u, by - h / 2 - 0.2 * u, 2.4 * u, h + 0.4 * u);   // Banderole
      });
    } else if (id === "smg") {
      c.fillStyle = "#9AA5B1"; c.fillRect(-9 * u, -2 * u, 15 * u, 3.4 * u); c.fillRect(-9 * u, -3 * u, 3 * u, 5 * u);
      c.fillStyle = "#6A7480"; c.fillRect(-1 * u, 1.4 * u, 2.4 * u, 5 * u); c.fillRect(-5 * u, 1.4 * u, 2 * u, 3 * u);
      c.fillStyle = "#D5DADF"; c.fillRect(6 * u, -1.2 * u, 3 * u, 1.6 * u);
    } else if (id === "pistol") {
      c.fillStyle = "#9AA5B1"; c.fillRect(-6 * u, -2 * u, 11 * u, 3 * u); c.fillRect(-6 * u, 1 * u, 3 * u, 4.5 * u);
      c.fillStyle = "#D5DADF"; c.fillRect(5 * u, -1.4 * u, 2 * u, 1.6 * u);
    } else {   // Schweißgerät
      c.fillStyle = "#9AA5B1"; c.fillRect(-7 * u, -1.8 * u, 10 * u, 3.6 * u);
      c.fillStyle = "#8EE0FF"; c.fillRect(3 * u, -1 * u, 4 * u, 2 * u);
    }
    c.restore();
  }
  // Leichtes Glimmen, damit man liegende Dinge im dunklen Schiff findet
  function itemGlow(c, cx, cy, s, tm, hot) {
    var k = 0.5 + 0.5 * Math.sin(tm * 3 + cx * 0.01), r = s * (0.42 + k * 0.06);
    c.strokeStyle = hot ? "rgba(242,193,78,.85)" : "rgba(242,193,78," + (0.18 + k * 0.2) + ")"; c.lineWidth = Math.max(1, s * 0.035);
    c.strokeRect(cx - r, cy - r, r * 2, r * 2);
  }
  function drawBodyItems(c, bd, tm) {
    if (!bd.items || !bd.items.length) return;
    var hu = FL.useT && FL.useT.k === "body" ? FL.useT.q : null;
    bd.items.forEach(function (q) { itemGlow(c, q.x * PX, q.y * PX, PX, tm, q === hu); itemArt(c, q.id, q.x * PX, q.y * PX, PX * 0.9, q.a); });
  }
  function drawLoose(c, tm) {
    if (!FL.loose || !FL.loose.length) return;
    var hu = FL.useT && FL.useT.k === "loose" ? FL.useT.q : null;
    FL.loose.forEach(function (q) { c.save(); c.translate(q.x, q.y); c.scale(CELL_M / PX, CELL_M / PX); itemGlow(c, 0, 0, PX, tm, q === hu); itemArt(c, q.id, 0, 0, PX * 0.9, q.a); c.restore(); });
  }
  // ---------- Inventar-Fenster: Schnellleiste + 8×8, Ziehen und Ablegen ----------
  function slotHtml(s, it) {
    var fx = slotFixed(s), lb = s.charAt(0) === "h" ? "<u>" + (+s.slice(1) + 1) + "</u>" : "";
    return '<i class="sr-slot' + (it ? " full" : "") + (fx ? " fix" : "") + (s === "h" + (FL.slot - 1) ? " on" : "") + '" data-s="' + s + '"' + (it ? ' title="' + itemName(it) + (fx ? " · " + t("itFixedS") : "") + '"' : "") + ">" + lb +
      (it ? ITEMS[it.id].ic + (ITEMS[it.id].stack ? "<b>" + nf(it.n) + "</b>" : "") : "") + "</i>";
  }
  function invRender() {
    var el = V.root.querySelector(".sr-inv"); if (!el || !FL || !FL.inv) return;
    var g = el.querySelector(".sr-inv-grid"), hb = el.querySelector(".sr-inv-hot"), h = "", i;
    for (i = 0; i < FL.inv.length; i++) h += slotHtml("i" + i, FL.inv[i]);
    g.innerHTML = h; h = "";
    for (i = 0; i < 9; i++) h += slotHtml("h" + i, FL.hot[i]);
    hb.innerHTML = h;
    el.querySelector(".sr-inv-cnt").textContent = invCount() + " / " + (INV.w * INV.h);
  }
  // Ziehen: Gegenstand an der Maus; über einem Platz loslassen = verschieben, tauschen oder Stapel zusammenlegen;
  // außerhalb des Fensters loslassen = vor der Figur auf den Boden legen
  function invDown(e) {
    var sl = e.target.closest(".sr-inv [data-s]"); if (!sl || !FL || e.button !== 0) return;
    var s = sl.getAttribute("data-s"), it = slotGet(s); if (!it) return;
    e.preventDefault(); e.stopPropagation();
    if (slotFixed(s)) { note(t("itFixed")); return; }
    var gh = document.createElement("div"); gh.className = "sr-drag"; gh.innerHTML = ITEMS[it.id].ic + (ITEMS[it.id].stack ? "<b>" + nf(it.n) + "</b>" : "");
    V.root.appendChild(gh); V.drag = { s: s, el: gh }; sl.classList.add("lift"); invDragMove(e);
  }
  function invDragMove(e) {
    if (!V || !V.drag) return; var r = V.root.getBoundingClientRect();
    V.drag.el.style.left = (e.clientX - r.left - 23) + "px"; V.drag.el.style.top = (e.clientY - r.top - 23) + "px";
  }
  function invDragEnd(e) {
    if (!V || !V.drag) return; var d = V.drag; V.drag = null; d.el.remove();
    if (!FL || !FL.inv) return;
    var hit = document.elementFromPoint(e.clientX, e.clientY), tg = hit && hit.closest ? hit.closest(".sr-inv [data-s]") : null, it = slotGet(d.s);
    if (!it) { invRender(); return; }
    if (tg) {
      var s2 = tg.getAttribute("data-s");
      if (s2 !== d.s && !slotFixed(s2)) {
        var o = slotGet(s2);
        if (o && o.id === it.id && ITEMS[it.id].stack) { o.n += it.n; slotSet(d.s, null); }
        else { slotSet(s2, it); slotSet(d.s, o); }
      }
    } else if (!(hit && hit.closest && hit.closest(".sr-inv-box"))) { slotSet(d.s, null); dropItem(it); }
    itemsChanged();
  }
