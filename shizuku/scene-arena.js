/* Shizuku – scene-arena.js
   Die Kampf-Arena. Kamera fest, die Arena füllt das Bild.
   Wellen: Zusammensetzung aus waveSpec(), die nächste Welle startet erst mit Taste E (Ruhe dazwischen,
   später: Arena mit Elementen umgestalten). Manche Wellen bekommen Verstärkung.
   Gleichgewicht: jeder besiegte Gegner gibt so viel Gleichgewicht wie sein maximales Leben (Konto pro Lauf).
   Es wird für Element-Fähigkeiten ausgegeben (Wasser: Q zwischen den Wellen, 300 je Kachel).
   Esc führt zurück. Tod → zurück ins Menü. */
(function () {
  var SZ = window.SZ, L2 = SZ.L2;
  var S = null, NUM = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];

  function cursor(c, x, y) {
    x = Math.round(x); y = Math.round(y);
    c.fillStyle = "rgba(10,8,8,0.7)";
    c.fillRect(x - 4, y - 1, 3, 3); c.fillRect(x + 2, y - 1, 3, 3); c.fillRect(x - 1, y - 4, 3, 3); c.fillRect(x - 1, y + 2, 3, 3);
    c.fillStyle = "#F2ECDA";
    c.fillRect(x - 3, y, 2, 1); c.fillRect(x + 2, y, 2, 1); c.fillRect(x, y - 3, 1, 2); c.fillRect(x, y + 2, 1, 2);
    c.fillStyle = "#E2462F"; c.fillRect(x, y, 1, 1);
  }
  // Freier Spawnpunkt; mit Ziel (gx, gy) wird der passende Punkt gewählt, der dem Ziel am nächsten liegt
  function spawnPoint(w, pl, gx, gy) {
    var a = w.arena, best = null, bd = 1e9, found = 0, F = w.flowTo(pl.x, pl.y);
    for (var i = 0; i < 260 && found < (gx == null ? 1 : 30); i++) {
      var x = 24 + Math.random() * (SZ.W - 48), y = 34 + Math.random() * (SZ.H - 64);
      if (!a.walkable(x, y, 7) || a.tilePx(x, y) === "w" || w.blockedAt(x, y)) continue;
      if (F.dist[Math.floor(y / 8) * (SZ.W / 8) + Math.floor(x / 8)] < 0) continue;   // muss den Spieler erreichen können
      if (SZ.m.dist(x, y, pl.x, pl.y) < 95) continue;
      if (w.solids.some(function (c) { return SZ.m.dist(x, y, c[0], c[1]) < c[2] + 8; })) continue;
      if (w.enemies.some(function (e) { return SZ.m.dist(x, y, e.x, e.y) < 24; })) continue;
      found++;
      var d = gx == null ? 0 : SZ.m.dist(x, y, gx, gy);
      if (d < bd) { bd = d; best = [x, y]; }
    }
    return best;
  }
  function banner(n, sub) {
    var old = SZ.main.ui.querySelector(".sz-wave"); if (old) old.remove();
    var d = document.createElement("div"); d.className = "sz-wave";
    d.innerHTML = "<b>" + (NUM[n - 1] || n) + "</b>" + L2("Welle ", "Wave ") + n + (sub ? "<i>" + sub + "</i>" : "");
    SZ.main.ui.appendChild(d);
  }

  // ---------- Wellen ----------
  // Eine Welle: a = sofort (ronin / heavy / yumi), re = Verstärkung (kommt, wenn höchstens einer übrig ist oder nach 8 s),
  // form = Aufstellung beim Erscheinen:
  //   ring  – verteilt rundherum
  //   wall  – Nahkämpfer vorne, Bogenschützen dahinter (alle von einer Seite)
  //   pincer – Nahkämpfer von einer Seite, Bogenschützen von der Gegenseite
  //   flank – zwei Gruppen von links und rechts
  //   ambush – Bogenschützen in den Ecken, Nahkämpfer nah dran
  function sub(de, en) { return function () { return L2(de, en); }; }
  var WAVES = [
    { a: { ronin: 1 } },
    { a: { ronin: 2 } },
    { a: { yumi: 1 }, sub: sub("Ein Bogenschütze", "An archer") },
    { a: { ronin: 2, yumi: 1 }, form: "wall", sub: sub("Schütze hinter der Linie", "Archer behind the line") },
    { a: { heavy: 1 }, sub: sub("Ein Schwerer, allein", "A heavy one, alone") },
    { a: { ronin: 3 }, re: { yumi: 2 }, sub: sub("Bögen als Verstärkung", "Bows as reinforcements") },
    { a: { heavy: 1, yumi: 2 }, form: "wall", sub: sub("Schild und Bogen", "Shield and bow") },
    { a: { yumi: 3 }, form: "ring", sub: sub("Aus allen Richtungen", "From every direction") },
    { a: { ronin: 4 }, re: { heavy: 1 }, form: "flank", sub: sub("Von beiden Seiten", "From both sides") },
    { a: { monkey: 1 }, boss: true, sub: sub("Der Monkey Lord", "The Monkey Lord") },   // erster Boss
    { a: { ronin: 2, yumi: 3 }, re: { ronin: 2 }, form: "ambush", sub: sub("Hinterhalt", "Ambush") },
    { a: { heavy: 1, ronin: 3, yumi: 3 }, form: "wall", sub: sub("Schlachtreihe", "Battle line") }
  ];
  // Ab Welle 13: wechselnde Vorlagen, wachsend bis 10 Gegner (höchstens 4 Bogenschützen gleichzeitig)
  function waveSpec(n) {
    if (n <= WAVES.length) return WAVES[n - 1];
    var k = n - WAVES.length, total = Math.min(10, 6 + Math.floor(k / 2)), roll = Math.random(), ri = function (a, b) { return a + Math.floor(Math.random() * (b - a + 1)); };
    var y = Math.min(4, ri(1, 2 + Math.floor(k / 4)));
    if (roll < 0.14) return { a: { heavy: Math.min(4, 2 + Math.floor(k / 3)), yumi: ri(1, 2) }, form: "wall", sub: sub("Eiserne Mauer", "Iron wall") };
    if (roll < 0.28) return { a: { ronin: Math.min(8, total), yumi: 1 }, form: "ring", sub: sub("Ein Schwarm Ronin", "A swarm of ronin") };
    if (roll < 0.42) return { a: { yumi: y, ronin: 2 }, re: { ronin: Math.max(1, total - y - 2) }, form: "ambush", sub: sub("Hinterhalt", "Ambush") };
    if (roll < 0.56) return { a: { ronin: Math.ceil((total - y) / 2), yumi: y }, re: { heavy: 1, ronin: Math.max(0, Math.floor((total - y) / 2) - 1) }, form: "pincer", sub: sub("Die Zange", "The pincer") };
    if (roll < 0.7) return { a: { ronin: Math.ceil(total / 2) }, re: { ronin: Math.floor(total / 2) - 1, yumi: 1 }, form: "flank", sub: sub("Von beiden Seiten", "From both sides") };
    if (roll < 0.8) return { a: { yumi: Math.min(4, y + 1) }, re: { heavy: 1, ronin: Math.max(1, total - y - 2) }, form: "ring", sub: sub("Pfeilhagel", "Arrow rain") };
    var h = Math.max(1, Math.round(total * (0.15 + Math.random() * 0.15))), r = Math.max(1, total - h - y);
    return { a: { ronin: Math.ceil(r / 2), heavy: Math.ceil(h / 2), yumi: y }, re: { ronin: Math.floor(r / 2), heavy: Math.floor(h / 2) }, form: ["wall", "pincer", "flank", "ring"][ri(0, 3)] };
  }
  SZ.waveSpec = waveSpec;   // für Tests und den Dev-Tool-Einblick
  // ---------- Fundstücke (Heilkugel vom Boss) ----------
  // Schwebt über dem Boden; kommt man nah, fliegt sie zum Samurai und heilt 50 % des maximalen Lebens
  var HEAL = 0.5;
  function dropsUpdate(dt, w, p) {
    if (!w.drops) return;
    w.drops = w.drops.filter(function (d) {
      d.t += dt;
      if (d.t < 0.6 || p.dead) return true;   // erst kurz liegen lassen
      var dx = p.x - d.x, dy = p.y - d.y, dd = Math.hypot(dx, dy);
      if (dd < 36) { var v = Math.min(dd, (60 + (36 - dd) * 6) * dt); d.x += dx / dd * v; d.y += dy / dd * v; }
      if (dd < 7) {
        var add = Math.round(p.hpMax * HEAL);
        p.hp = Math.min(p.hpMax, p.hp + add);
        w.parts.spark(p.x, p.y - 12, 14, 16, "#FFD0C0"); w.parts.swirl(p.x, p.y, 12, 1, 0.8); w.parts.ring(p.x, p.y - 2, 20, 0.5, "rgba(255,160,140,");
        SZ.audio.play("parry_hit", { x: p.x, rate: 1.35, vol: 0.7 }); SZ.audio.play("water_absorb", { x: p.x, vol: 0.5, rate: 1.2 });
        pop(L2("+50 % Leben", "+50 % health")); toast(L2("Heilkugel: +50 % Leben", "Healing orb: +50 % health"));
        return false;
      }
      return true;
    });
  }
  function dropsDraw(ctx, w) {
    if (!w.drops) return;
    var t = w.clock;
    w.drops.forEach(function (d) {
      var x = Math.round(d.x), z = 9 + Math.sin(d.t * 3.2) * 2, y = Math.round(d.y - z), pu = 0.5 + 0.5 * Math.sin(t * 5);
      ctx.fillStyle = "rgba(10,8,8,0.35)"; ctx.fillRect(x - 3, Math.round(d.y), 7, 1); ctx.fillRect(x - 2, Math.round(d.y) - 1, 5, 1);
      var g = ctx.createRadialGradient(x + 0.5, y + 0.5, 1, x + 0.5, y + 0.5, 14);
      g.addColorStop(0, "rgba(255,130,100," + (0.35 + pu * 0.2) + ")"); g.addColorStop(1, "rgba(255,90,60,0)");
      ctx.fillStyle = g; ctx.fillRect(x - 14, y - 14, 29, 29);
      var P = SZ.pen(ctx);
      P.rect(x - 2, y - 4, 5, 9, "#5A1410"); P.rect(x - 4, y - 2, 9, 5, "#5A1410"); P.rect(x - 3, y - 3, 7, 7, "#5A1410");
      P.rect(x - 2, y - 3, 5, 7, "#C83C2A"); P.rect(x - 3, y - 2, 7, 5, "#C83C2A");
      P.rect(x - 1, y - 2, 3, 4, "#E8664A"); P.rect(x - 2, y - 1, 2, 2, "#F49A80");
      P.px(x - 1, y - 2, "#FFE6DC"); P.px(x, y - 2, "#FFFFFF");
      for (var i = 0; i < 3; i++) { var ph = (t * 0.8 + i / 3) % 1; P.px(x - 5 + i * 5 + Math.round(Math.sin(t * 3 + i) ), Math.round(y + 4 - ph * 16), ph < 0.7 ? "#FFC0B0" : "#E8664A"); }
    });
  }
  function count(o) { var n = 0; for (var k in o) n += o[k] || 0; return n; }
  // Gegner nach Aufstellung erscheinen lassen
  function spawnGroup(w, p, group, hpMul, form) {
    var list = [];
    ["monkey", "heavy", "ronin", "yumi"].forEach(function (t) { for (var i = 0; i < (group[t] || 0); i++) list.push(t); });
    var base = Math.random() * Math.PI * 2, W = SZ.W, H = SZ.H, cx = W / 2, cy = H / 2;
    // Zielpunkt je Gegner (null = irgendwo)
    function goal(t, i, n) {
      var archer = t === "yumi", ang, d;
      switch (form) {
        case "wall": ang = base + (i - (n - 1) / 2) * 0.28; d = archer ? 175 : 105; break;
        case "pincer": ang = base + (archer ? Math.PI : 0) + (Math.random() - 0.5) * 0.7; d = archer ? 160 : 110; break;
        case "flank": ang = base + (i % 2 ? Math.PI : 0) + (Math.random() - 0.5) * 0.5; d = archer ? 165 : 120; break;
        case "ambush":
          if (archer) { var c = [[30, 40], [W - 30, 40], [30, H - 30], [W - 30, H - 30]][(i + Math.floor(base * 2)) % 4]; return c; }
          ang = base + i * 1.7; d = 100; break;
        case "ring": ang = base + i / Math.max(1, n) * Math.PI * 2; d = archer ? 160 : 120; break;
        default: return null;
      }
      return [SZ.m.clamp(p.x + Math.cos(ang) * d, 24, W - 24), SZ.m.clamp(p.y + Math.sin(ang) * d * 0.75, 34, H - 30)];
    }
    list.forEach(function (t, i) {
      var g = goal(t, i, list.length), sp = g ? spawnPoint(w, p, g[0], g[1]) : spawnPoint(w, p);
      if (sp) w.enemies.push(new SZ.Enemy(w, t, sp[0], sp[1], { hpMul: hpMul }));
    });
  }
  function startWave() {
    var w = S.world, p = S.player, n = ++S.wave, spec = waveSpec(n), hpMul = n > 12 ? 1 + (n - 12) * 0.06 : 1;
    S.between = false; S.waveClock = 0; S.specialReady = true;   // Spezialangriff jede Welle wieder bereit
    S.reinf = spec.re && count(spec.re) ? { g: spec.re, hpMul: hpMul } : null;
    var all = {}; [spec.a, spec.re || {}].forEach(function (o) { for (var k in o) all[k] = (all[k] || 0) + o[k]; });
    var sub2 = spec.sub ? spec.sub() : all.heavy && all.yumi ? L2("Heavy Ronin und Bogenschützen", "Heavy ronin and archers") : all.yumi ? L2("Bogenschützen dabei", "Archers among them") : all.heavy ? L2("Heavy Ronin dabei", "Heavy Ronin among them") : "";
    banner(n, sub2);
    spawnGroup(w, p, spec.a, hpMul, spec.form);
  }
  // ---------- Elemente ----------
  // Wasser zwischen den Wellen (Q): Kachel anklicken = fluten (100, beliebig viele), Wasser anklicken = absorbieren (200, heilt 7 %).
  // Jeder Klick startet sofort eine eigene Animation, mehrere laufen parallel.
  // X (alle Elemente): Spezialangriff, einmal pro Welle, füllt sich mit jeder neuen Welle von selbst wieder auf.
  //   Wasser: Wasserfessel · Luft: Sturmklinge (5 s Windstöße bei jedem Nahkampfangriff)
  function tileAt(tx, ty) { return (tx < 0 || ty < 0 || tx >= SZ.COLS || ty >= SZ.ROWS) ? "v" : S.world.arena.tile(tx, ty); }
  function reserved() { var C = SZ.ELEMENT_COST; return S.jobs.reduce(function (n, q) { return n + (q.paid ? 0 : C[q.kind]); }, 0); }
  function drainsPending() { return S.jobs.filter(function (q) { return q.kind === "drain" && !q.healed; }).length; }
  // Was ein Klick auf (tx, ty) täte: { kind, ok, why }
  function tileAction(tx, ty) {
    var c = tileAt(tx, ty), C = SZ.ELEMENT_COST, free = S.points - reserved(), p = S.player;
    if (S.jobs.some(function (q) { return q.tx === tx && q.ty === ty; })) return { kind: "busy", ok: false };
    if (c === "w") {
      if (free < C.drain) return { kind: "drain", ok: false, why: "poor" };
      if (p.hp + drainsPending() * p.hpMax * SZ.WATER.healPct >= p.hpMax - 0.5) return { kind: "drain", ok: false, why: "full" };
      return { kind: "drain", ok: true };
    }
    if (c === "v" || c === "#") return { kind: "flood", ok: false, why: "tile" };
    if (free < C.flood) return { kind: "flood", ok: false, why: "poor" };
    return { kind: "flood", ok: true };
  }
  function drawWaterSel(ctx) {
    var I = SZ.input, T = SZ.TILE, t = S.world.clock;
    if (!S.waterMode || !I.inside) return;
    var tx = Math.floor(I.mx / T), ty = Math.floor(I.my / T), A = tileAction(tx, ty);
    if (A.kind === "busy") return;
    var pulse = 0.6 + 0.4 * Math.sin(t * 7), x0 = tx * T, y0 = ty * T;
    ctx.strokeStyle = !A.ok ? "rgba(230,90,70," + pulse + ")" : A.kind === "drain" ? "rgba(180,240,215," + pulse + ")" : "rgba(170,210,204," + pulse + ")";
    ctx.strokeRect(x0 + 0.5, y0 + 0.5, T - 1, T - 1);
    if (!A.ok) return;
    if (A.kind === "flood") {   // kleine Wellen
      ctx.fillStyle = "rgba(200,228,222,0.8)";
      for (var k = 0; k < 3; k++) { var yy = y0 + 4 + k * 4; for (var x = 2; x < 14; x++) if (Math.sin(x * 0.9 + t * 6 + k) > 0.3) ctx.fillRect(x0 + x, yy + Math.round(Math.sin(x * 0.9 + t * 6 + k)), 1, 1); }
    } else {                    // aufsteigende Tropfen
      ctx.fillStyle = "rgba(200,255,235,0.85)";
      for (var j = 0; j < 4; j++) { var ph = (t * 1.4 + j / 4) % 1; ctx.fillRect(x0 + 3 + j * 3, Math.round(y0 + 13 - ph * 11), 1, 2); }
    }
  }
  function toast(txt) {
    var el = SZ.main.ui.querySelector(".sz-etoast"); if (!el) return;
    el.textContent = txt; el.hidden = false; clearTimeout(S.toastT);
    S.toastT = setTimeout(function () { el.hidden = true; }, 1800);
  }
  function elementUpdate(I, p) {
    var w = S.world, C = SZ.ELEMENT_COST;
    // laufende Wasser-Aufträge aufräumen
    S.jobs = S.jobs.filter(function (q) { return !q.fx.done; });
    if (p.element === "water") {
      // Q: Wasser-Modus (nur zwischen den Wellen)
      if (S.between && !p.dead && I.hit("q")) S.waterMode = !S.waterMode;
      if (!S.between || p.dead) S.waterMode = false;
      p.inputLock = S.waterMode;
      if (S.waterMode && I.inside && I.lmbHit && !p.dead) {
        var tx = Math.floor(I.mx / SZ.TILE), ty = Math.floor(I.my / SZ.TILE), A = tileAction(tx, ty);
        if (A.ok) {
          var q = { tx: tx, ty: ty, kind: A.kind };
          if (A.kind === "flood") {
            q.fx = new SZ.WaterCast(w, p, tx, ty, S.castN++);
            q.fx.onConvert = function () { q.paid = true; S.points -= C.flood; };
          } else {
            q.fx = new SZ.WaterDrain(w, p, tx, ty);
            q.fx.onConvert = function () { q.paid = true; S.points -= C.drain; };
            q.fx.onHeal = function () { q.healed = true; };
          }
          S.jobs.push(q);
          p.startCast(q.fx);   // Pose folgt der neuesten Beschwörung, ältere laufen weiter
        } else if (A.kind !== "busy") {
          SZ.audio.play("block", { vol: 0.25, rate: 1.6 });
          if (A.why === "poor") toast(L2("Nicht genug Gleichgewicht.", "Not enough balance."));
          else if (A.why === "full") toast(L2("Leben ist schon voll.", "Health is already full."));
        }
      }
    } else { S.waterMode = false; p.inputLock = false; }
    // X: Spezialangriff, einmal pro Welle
    if (I.hit("x") && !p.dead && p.element !== "none") {
      if (!S.specialReady) { SZ.audio.play("block", { vol: 0.2, rate: 1.8 }); toast(L2("Erst in der nächsten Welle wieder bereit.", "Ready again next wave.")); }
      else if (p.element === "water") {
        var tg = SZ.water.targets(w);
        if (!tg.length) { SZ.audio.play("block", { vol: 0.25, rate: 1.6 }); toast(S.between ? L2("Keine Gegner da.", "No enemies here.") : SZ.water.hasWater(w.arena) ? L2("Kein Gegner in Wassernähe (bis 4 Kacheln).", "No enemy near water (up to 4 tiles).") : L2("Es gibt kein Wasser auf der Map.", "There is no water on the map.")); }
        else if (!p.act || p.act.type === "throw" || p.act.type === "loose") { S.specialReady = false; p.startCast(new SZ.WaterBind(w, p, tg), 0.5); }
      } else if (p.element === "air") {
        if (S.between) { SZ.audio.play("block", { vol: 0.25, rate: 1.6 }); toast(L2("Die Sturmklinge gibt es nur im Kampf.", "The storm blade only works in combat.")); }
        else {
          S.specialReady = false; p.airBuff = SZ.AIR_ART.gust.dur;
          SZ.airArts(w); w.parts.swirl(p.x, p.y, 12, 1, 0.7); w.parts.swirl(p.x, p.y, 8, -1, 0.6); w.push(p.x, p.y, 40, 4, 0.8, { spin: 1 });
          SZ.audio.play("dash", { x: p.x, rate: 0.7 }); SZ.audio.play("swing_e", { x: p.x, rate: 0.8, vol: 0.7 });
        }
      }
    }
  }
  function hudDom() {
    var ui = SZ.main.ui, top = ui.querySelector(".sz-top");
    var boss = S.world.enemies.filter(function (e) { return e.D.boss && !e.dead && !e.falling; })[0], bb = ui.querySelector(".sz-boss");
    if (bb.hidden === !!boss) bb.hidden = !boss;
    if (boss) {
      var bn = boss.D.name(); if (bb.dataset.n !== bn) { bb.querySelector("b").textContent = bn; bb.dataset.n = bn; }
      var pc = Math.max(0, boss.hp / boss.hpMax * 100).toFixed(1) + "%"; if (bb.dataset.p !== pc) { bb.querySelector("i").style.width = pc; bb.dataset.p = pc; }
      bb.classList.toggle("p2", !!boss.phase2);
    }
    var alive = S.world.enemies.filter(function (e) { return !e.dead; }).length + (S.reinf ? count(S.reinf.g) : 0);
    var pts = String(S.points), wv = S.wave ? L2("Welle ", "Wave ") + S.wave + (S.between ? "" : " · " + alive + L2(" übrig", " left")) : "";
    if (top.dataset.p !== pts) { top.querySelector("b").textContent = pts; top.dataset.p = pts; }
    if (top.dataset.w !== wv) { top.querySelector("span").textContent = wv; top.dataset.w = wv; }
    var pl = SZ.perk.list(S.player).join(" · ");
    if (top.dataset.pl !== pl) { top.querySelector(".sz-pl").textContent = pl; top.dataset.pl = pl; }
    var nx = ui.querySelector(".sz-next"), show = S.between && !S.player.dead && !S.out && !S.waterMode;
    if (nx.hidden === show) nx.hidden = !show;
    var el = S.player.element, water = el === "water", C = SZ.ELEMENT_COST, free = S.points - reserved();
    // Element-Hinweis zwischen den Wellen: Q (nur Wasser)
    var eq = ui.querySelector(".sz-elq"), es = water && S.between && !S.player.dead && !S.out;
    if (eq.hidden === es) eq.hidden = !es;
    if (es) {
      var txt = S.waterMode
        ? L2("Kachel: Fluten " + C.flood + " · Wasser: Absorbieren " + C.drain + " (+7 % Leben) · mehrere gleichzeitig möglich · Q beenden",
             "Tile: flood " + C.flood + " · Water: absorb " + C.drain + " (+7 % health) · several at once · Q ends")
        : L2("Wasser · Fluten " + C.flood + " · Absorbieren " + C.drain, "Water · flood " + C.flood + " · absorb " + C.drain);
      if (eq.dataset.t !== txt) { eq.querySelector("b").textContent = txt; eq.dataset.t = txt; }
      eq.classList.toggle("on", S.waterMode); eq.classList.toggle("poor", free < C.flood);
    }
    // Spezialangriff (X)
    var ex = ui.querySelector(".sz-elx"), xs = el !== "none" && !S.player.dead && !S.out;
    if (ex.hidden === xs) ex.hidden = !xs;
    if (xs) {
      if (ex.dataset.el !== el) { ex.querySelector(".sz-wv").innerHTML = el === "air" ? SZ.WIND_SVG : SZ.WAVE_SVG; ex.dataset.el = el; }
      var nm = el === "air" ? L2("Sturmklinge", "Storm blade") : L2("Wasserfessel", "Water bind");
      var on = el === "air" && S.player.airBuff > 0, st = on ? "ready" : S.specialReady ? "ready" : "used";
      var xt = on ? nm + " · " + Math.ceil(S.player.airBuff) + " s" : S.specialReady ? nm : nm + L2(" · nächste Welle", " · next wave");
      if (ex.dataset.t !== xt) { ex.querySelector("b").textContent = xt; ex.dataset.t = xt; }
      ex.className = "sz-elx " + st;
    }
  }
  // ---------- Perk-Auswahl ----------
  function showOffer(ids) {
    S.offer = ids;
    var p = S.player, box = SZ.main.ui.querySelector(".sz-perk");
    box.innerHTML = '<h2>' + L2("Wähle einen Perk", "Choose a perk") + '</h2><small>' + L2("Der andere verfällt. Perks gelten für den ganzen Lauf und stapeln sich.", "The other one is lost. Perks last the whole run and stack.") + '</small><div>' +
      ids.map(function (id) {
        var have = SZ.perk.n(p, id), once = SZ.perk.def(id).once;
        return '<button type="button" data-perk="' + id + '"><b>' + SZ.perk.name(id) + '</b><span>' + SZ.perk.desc(id) + '</span>' +
          (have ? '<i>' + L2("Schon ×", "Owned ×") + have + '</i>' : once ? '<i>' + L2("Einmalig", "Once per run") + '</i>' : '') + '</button>';
      }).join("") + '</div>';
    box.hidden = false;
    SZ.audio.play("unsheathe", { rate: 0.8, vol: 0.6 });
  }
  function takeOffer(id) {
    if (!S.offer || S.offer.indexOf(id) < 0) return;
    SZ.perk.take(S.player, id);
    S.offer = null; SZ.main.ui.querySelector(".sz-perk").hidden = true;
    var p = S.player; S.world.parts.swirl(p.x, p.y, 10, 1, 0.7); S.world.parts.spark(p.x, p.y - 12, 14, 10, "#FFE6A0");
    SZ.audio.play("parry_hit", { x: p.x, rate: 0.8, vol: 0.6 });
    toast(SZ.perk.name(id) + " – " + SZ.perk.desc(id));
  }
  function pop(amount) {
    var top = SZ.main.ui.querySelector(".sz-top"), e = document.createElement("em");
    e.textContent = typeof amount === "string" ? amount : "+" + amount; top.appendChild(e);
    setTimeout(function () { e.remove(); }, 1400);
  }

  SZ.scenes.arena = {
    enter: function (opt) {
      var world = opt && opt.world, pl = opt && opt.player;
      if (!world) {
        world = new SZ.World(SZ.arena.active());
        pl = new SZ.Player(world, world.arena.spawn[0], world.arena.spawn[1]);
      }
      pl.control = true; pl.appear = 1;
      S = { world: world, player: pl, out: 0, back: opt && opt.back, wave: 0, between: true, points: 0, reinf: null, waveClock: 0,
            waterMode: false, jobs: [], castN: 0, specialReady: true, offer: null, offerLock: 0 };
      SZ.hud.reset();
      if (!opt || !opt.world) SZ.audio.musicStart();
      SZ.main.root.classList.add("sz-play");
      SZ.main.ui.innerHTML = '<div class="sz-top" title="' + L2("Gleichgewicht", "Balance") + '"><div><small>' + L2("Gleichgewicht", "Balance") + '</small><i></i><b>0</b></div><span></span><p class="sz-pl"></p></div>' +
        '<div class="sz-next"><kbd>E</kbd>' + L2("nächste Welle", "next wave") + '</div>' +
        '<div class="sz-perk" hidden></div>' +
        '<div class="sz-elq" hidden><span class="sz-wv">' + SZ.WAVE_SVG + '</span><kbd>Q</kbd><b></b></div>' +
        '<div class="sz-elx" hidden><span class="sz-wv">' + SZ.WAVE_SVG + '</span><kbd>X</kbd><b></b></div>' +
        '<div class="sz-etoast" hidden></div>' +
        '<div class="sz-boss" hidden><b></b><div><i></i></div></div>' +
        '<div class="sz-hint">' +
        L2("WASD laufen · Maus zielen · Leertaste Dash · Linksklick Katana ziehen, dann Hieb · Linksklick halten: Stich · Shift + Linksklick: Drehhieb · Rechtsklick Block · Block halten + Linksklick: Konter · Q / E + Rechtsklick: Parade / Ausweichen · Wurfwaffen: Linksklick halten · 1 / 2 / 3: Waffe wechseln (3 = Element) · X Spezialangriff (einmal pro Welle) · Wasser zwischen den Wellen: Q · E nächste Welle · M Ton · Esc Menü",
           "WASD move · mouse aim · space dash · left click draw katana, then slash · hold left click: thrust · shift + left click: spin · right click block · hold block + left click: counter · Q / E + right click: parry / dodge · throwing weapons: hold left click · 1 / 2 / 3: switch weapon (3 = element) · X special (once per wave) · water between waves: Q · E next wave · M sound · Esc menu") + '</div>';
      SZ.main.ui.querySelector(".sz-perk").addEventListener("click", function (e) { var b = e.target.closest("[data-perk]"); if (b) takeOffer(b.dataset.perk); });
    },
    exit: function () { SZ.main.root.classList.remove("sz-play"); },
    state: function () { return S; },   // für Tests
    update: function (dt) {
      var I = SZ.input, w = S.world, p = S.player;
      if (S.out > 0) { SZ.audio.ambience(null); SZ.audio.musicStop(); S.out += SZ.main.realDt; if (S.out > 0.7) { if (S.back === "editor") { SZ.scenes.editor.resume(); SZ.main.go("editor"); } else SZ.main.go("menu", { fromGame: true }); } return; }
      if (I.hit("Escape")) { S.out = 0.0001; p.control = false; return; }
      if (p.dead && p.deadT > 2.4) { S.out = 0.0001; return; }
      if (p.hitstop > 0) { p.hitstop -= dt; return; }
      w.update(dt);
      p.update(dt, I);
      SZ.audio.ambience(w.ambience(p.x, p.y));
      // Musik: in der Welle voll, dazwischen leiser, nach dem Tod fast weg
      SZ.audio.musicLevel(p.dead ? 0.12 : S.between ? 0.4 : 1, S.between ? 1.6 : 0.8);
      for (var i = w.enemies.length - 1; i >= 0; i--) { w.enemies[i].update(dt, p); if (w.enemies[i].gone) w.enemies.splice(i, 1); }
      w.tickObjects(dt);
      dropsUpdate(dt, w, p);
      // Monkey Lord blockt: die ersten Male erklären, warum
      if (w.bossBlock) { S.blockTips = (S.blockTips || 0) + 1; if (S.blockTips <= 3) toast(L2("Geblockt! Er wehrt jede Wiederholung ab – wechsle die Attacke.", "Blocked! He stops any repeated attack – switch it up.")); w.bossBlock = 0; }
      // Gleichgewicht für besiegte Gegner
      w.enemies.forEach(function (e) {
        if (e.dead && !e.counted) {
          var gain = Math.round(e.hpMax * SZ.perk.onKill(p));   // Dankbarkeit, Gastfreundschaft, Ehre
          e.counted = true; S.points += gain; pop(gain);
          for (var o = 0; o < Math.min(14, 4 + e.hpMax / 15); o++) w.parts.orb(e.x, e.y - 10 * e.sc, SZ.W - 18, 10);
        }
      });
      // Wellen: Verstärkung, Ende, nächste Welle mit E
      var alive = w.enemies.filter(function (e) { return !e.dead; }).length;
      S.waveClock += dt;
      if (S.reinf && (alive <= 1 || S.waveClock > 8)) { var R = S.reinf; S.reinf = null; spawnGroup(w, p, R.g, R.hpMul, "ring"); alive = 1; }
      if (!S.between && alive === 0 && !S.reinf) {
        S.between = true; SZ.perk.onWaveEnd(p);
        if (S.wave % 3 === 0 && !p.dead) showOffer(SZ.perk.offer(p));   // nach jeder 3. Welle: Perk wählen
      }
      if (S.offer) S.offerLock = 0.25; else if (S.offerLock > 0) S.offerLock -= dt;
      elementUpdate(I, p);
      if (S.offer || S.offerLock > 0) { p.inputLock = true; S.waterMode = false; }
      if (S.between && !p.dead && I.hit("e")) {
        if (S.offer) toast(L2("Erst einen Perk wählen.", "Pick a perk first."));
        else if (S.jobs.length) toast(L2("Erst die Wasser-Beschwörungen abwarten.", "Wait for the water casts to finish."));
        else { S.waterMode = false; p.inputLock = false; startWave(); }
      }
    },
    render: function (ctx) {
      var w = S.world;
      w.render(ctx, { ents: [S.player], player: S.player });
      dropsDraw(ctx, w);
      w.enemies.forEach(function (e) { e.drawUI(ctx); });
      if (S.waterMode) drawWaterSel(ctx);
      SZ.hud.draw(ctx, S.player, SZ.main.realDt || 0.016);
      hudDom();
      if (SZ.input.inside && !S.out) cursor(ctx, SZ.input.mx, SZ.input.my);
    },
    renderTop: function (c) {
      var p = S.player;
      if (p.dead) { c.fillStyle = "rgba(60,0,0," + Math.min(0.35, p.deadT * 0.25) + ")"; c.fillRect(0, 0, c.canvas.width, c.canvas.height); }
      if (S.out > 0) { c.fillStyle = "rgba(0,0,0," + Math.min(1, S.out / 0.6) + ")"; c.fillRect(0, 0, c.canvas.width, c.canvas.height); }
    }
  };
})();
