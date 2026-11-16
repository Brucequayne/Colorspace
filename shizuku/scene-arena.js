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
    { a: { heavy: 2, yumi: 2 }, form: "pincer", sub: sub("Die Zange", "The pincer") },
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
  function count(o) { var n = 0; for (var k in o) n += o[k] || 0; return n; }
  // Gegner nach Aufstellung erscheinen lassen
  function spawnGroup(w, p, group, hpMul, form) {
    var list = [];
    ["heavy", "ronin", "yumi"].forEach(function (t) { for (var i = 0; i < (group[t] || 0); i++) list.push(t); });
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
    S.between = false; S.waveClock = 0;
    S.reinf = spec.re && count(spec.re) ? { g: spec.re, hpMul: hpMul } : null;
    var all = {}; [spec.a, spec.re || {}].forEach(function (o) { for (var k in o) all[k] = (all[k] || 0) + o[k]; });
    var sub2 = spec.sub ? spec.sub() : all.heavy && all.yumi ? L2("Heavy Ronin und Bogenschützen", "Heavy ronin and archers") : all.yumi ? L2("Bogenschützen dabei", "Archers among them") : all.heavy ? L2("Heavy Ronin dabei", "Heavy Ronin among them") : "";
    banner(n, sub2);
    spawnGroup(w, p, spec.a, hpMul, spec.form);
  }
  // ---------- Wasser-Element ----------
  // Zwischen den Wellen (Q): Kachel anklicken = fluten (100, eine pro Pause), Wasser anklicken = absorbieren (200, heilt 7 %).
  // Jederzeit (X): Wasserfessel, einmal pro Welle; verbraucht kann sie zwischen den Wellen für 150 neu gekauft werden.
  function tileAt(tx, ty) { return (tx < 0 || ty < 0 || tx >= SZ.COLS || ty >= SZ.ROWS) ? "v" : S.world.arena.tile(tx, ty); }
  function reserved() { var C = SZ.ELEMENT_COST; return S.queue.reduce(function (n, q) { return n + (q.paid ? 0 : C[q.kind]); }, 0); }
  function floodsQueued() { return S.queue.filter(function (q) { return q.kind === "flood" && !q.paid; }).length; }
  function drainsQueued() { return S.queue.filter(function (q) { return q.kind === "drain" && !q.healed; }).length; }
  // Was ein Klick auf (tx, ty) täte: { kind, ok, why }
  function tileAction(tx, ty) {
    var c = tileAt(tx, ty), C = SZ.ELEMENT_COST, free = S.points - reserved(), p = S.player;
    if (S.queue.some(function (q) { return q.tx === tx && q.ty === ty; })) return { kind: "queued", ok: false };
    if (c === "w") {
      if (free < C.drain) return { kind: "drain", ok: false, why: "poor" };
      if (p.hp + drainsQueued() * p.hpMax * SZ.WATER.healPct >= p.hpMax - 0.5) return { kind: "drain", ok: false, why: "full" };
      return { kind: "drain", ok: true };
    }
    if (c === "v" || c === "#") return { kind: "flood", ok: false, why: "tile" };
    if (S.floodLeft - floodsQueued() <= 0) return { kind: "flood", ok: false, why: "used" };
    if (free < C.flood) return { kind: "flood", ok: false, why: "poor" };
    return { kind: "flood", ok: true };
  }
  function drawWaterSel(ctx) {
    var I = SZ.input, T = SZ.TILE, t = S.world.clock;
    S.queue.forEach(function (q, i) {
      if (q.fx) return;   // läuft gerade: die Animation zeigt sich selbst
      var a = 0.22 + 0.12 * Math.sin(t * 5 + i), dr = q.kind === "drain";
      ctx.fillStyle = (dr ? "rgba(150,220,190," : "rgba(110,156,150,") + a + ")"; ctx.fillRect(q.tx * T, q.ty * T, T, T);
      ctx.strokeStyle = dr ? "rgba(180,240,215,0.9)" : "rgba(150,196,190,0.9)"; ctx.lineWidth = 1; ctx.strokeRect(q.tx * T + 0.5, q.ty * T + 0.5, T - 1, T - 1);
    });
    if (!S.waterMode || !I.inside) return;
    var tx = Math.floor(I.mx / T), ty = Math.floor(I.my / T), A = tileAction(tx, ty);
    if (A.kind === "queued") return;
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
  function waterUpdate(I, p) {
    var w = S.world, C = SZ.ELEMENT_COST;
    if (p.element !== "water") { p.inputLock = false; return; }
    // Q: Wasser-Modus (nur zwischen den Wellen)
    if (S.between && !p.dead && I.hit("q")) { S.waterMode = !S.waterMode; if (!S.waterMode) S.queue = S.queue.filter(function (q) { return q.fx; }); }
    if (!S.between || p.dead) S.waterMode = false;
    p.inputLock = S.waterMode;
    if (S.waterMode && I.inside) {
      var tx = Math.floor(I.mx / SZ.TILE), ty = Math.floor(I.my / SZ.TILE), qi = S.queue.findIndex(function (q) { return q.tx === tx && q.ty === ty; });
      if (I.lmbHit && qi < 0) {
        var A = tileAction(tx, ty);
        if (A.ok) S.queue.push({ tx: tx, ty: ty, kind: A.kind });
        else {
          SZ.audio.play("block", { vol: 0.25, rate: 1.6 });
          if (A.why === "used") toast(L2("Pro Pause kann nur eine Kachel geflutet werden.", "Only one tile can be flooded per break."));
          else if (A.why === "poor") toast(L2("Nicht genug Gleichgewicht.", "Not enough balance."));
          else if (A.why === "full") toast(L2("Leben ist schon voll.", "Health is already full."));
        }
      }
      if (I.rmbHit && qi >= 0 && !S.queue[qi].fx) S.queue.splice(qi, 1);
    }
    // Warteschlange abarbeiten
    if (!S.casting && S.queue.length && !p.act && !p.dead) {
      var q = S.queue[0];
      if (q.kind === "flood") {
        q.fx = new SZ.WaterCast(w, p, q.tx, q.ty, S.castN++);
        q.fx.onConvert = function () { q.paid = true; S.points -= C.flood; S.floodLeft--; };
      } else {
        q.fx = new SZ.WaterDrain(w, p, q.tx, q.ty);
        q.fx.onConvert = function () { q.paid = true; S.points -= C.drain; };
        q.fx.onHeal = function () { q.healed = true; };
      }
      S.casting = p.startCast(q.fx);
    }
    if (S.casting && S.casting.done) { S.casting = null; S.queue.shift(); }
    // X: Wasserfessel
    if (I.hit("x") && !p.dead) {
      if (S.bindReady) {
        var tg = SZ.water.targets(w);
        if (!tg.length) { SZ.audio.play("block", { vol: 0.25, rate: 1.6 }); toast(S.between ? L2("Keine Gegner da.", "No enemies here.") : SZ.water.hasWater(w.arena) ? L2("Kein Gegner in Wassernähe (bis 4 Kacheln).", "No enemy near water (up to 4 tiles).") : L2("Es gibt kein Wasser auf der Map.", "There is no water on the map.")); }
        else if (!p.act || p.act.type === "throw" || p.act.type === "loose") { S.bindReady = false; p.startCast(new SZ.WaterBind(w, p, tg), 0.5); }
      } else if (S.between && !S.waterMode) {
        if (S.points - reserved() >= C.bind) { S.points -= C.bind; S.bindReady = true; pop("−" + C.bind); SZ.audio.play("step_water", { x: p.x, vol: 1.2, rate: 1.2 }); }
        else { SZ.audio.play("block", { vol: 0.25, rate: 1.6 }); toast(L2("Nicht genug Gleichgewicht.", "Not enough balance.")); }
      } else SZ.audio.play("block", { vol: 0.2, rate: 1.8 });
    }
  }
  function hudDom() {
    var ui = SZ.main.ui, top = ui.querySelector(".sz-top");
    var alive = S.world.enemies.filter(function (e) { return !e.dead; }).length + (S.reinf ? count(S.reinf.g) : 0);
    var pts = String(S.points), wv = S.wave ? L2("Welle ", "Wave ") + S.wave + (S.between ? "" : " · " + alive + L2(" übrig", " left")) : "";
    if (top.dataset.p !== pts) { top.querySelector("b").textContent = pts; top.dataset.p = pts; }
    if (top.dataset.w !== wv) { top.querySelector("span").textContent = wv; top.dataset.w = wv; }
    var nx = ui.querySelector(".sz-next"), show = S.between && !S.player.dead && !S.out && !S.waterMode;
    if (nx.hidden === show) nx.hidden = !show;
    var water = S.player.element === "water", C = SZ.ELEMENT_COST, free = S.points - reserved();
    // Element-Hinweis zwischen den Wellen: Q
    var eq = ui.querySelector(".sz-elq"), es = water && S.between && !S.player.dead && !S.out;
    if (eq.hidden === es) eq.hidden = !es;
    if (es) {
      var left = Math.max(0, S.floodLeft - floodsQueued()), txt = S.waterMode
        ? L2("Kachel: Fluten " + C.flood + " (noch " + left + ") · Wasser: Absorbieren " + C.drain + " (+7 % Leben) · Rechtsklick entfernen · Q beenden",
             "Tile: flood " + C.flood + " (" + left + " left) · Water: absorb " + C.drain + " (+7 % health) · right click removes · Q ends")
        : L2("Wasser · Fluten " + C.flood + " · Absorbieren " + C.drain, "Water · flood " + C.flood + " · absorb " + C.drain);
      if (eq.dataset.t !== txt) { eq.querySelector("b").textContent = txt; eq.dataset.t = txt; }
      eq.classList.toggle("on", S.waterMode); eq.classList.toggle("poor", free < C.flood);
    }
    // Wasserfessel (X)
    var ex = ui.querySelector(".sz-elx"), xs = water && !S.player.dead && !S.out;
    if (ex.hidden === xs) ex.hidden = !xs;
    if (xs) {
      var st = S.bindReady ? "ready" : S.between ? "buy" : "used";
      var xt = st === "ready" ? L2("Wasserfessel", "Water bind") : st === "buy" ? L2("Wasserfessel kaufen · " + C.bind, "Buy water bind · " + C.bind) : L2("Wasserfessel verbraucht", "Water bind used");
      if (ex.dataset.t !== xt) { ex.querySelector("b").textContent = xt; ex.dataset.t = xt; }
      ex.className = "sz-elx " + st + (st === "buy" && free < C.bind ? " poor" : "");
    }
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
            waterMode: false, queue: [], casting: null, castN: 0, floodLeft: 1, bindReady: true };
      SZ.hud.reset();
      if (!opt || !opt.world) SZ.audio.musicStart();
      SZ.main.root.classList.add("sz-play");
      SZ.main.ui.innerHTML = '<div class="sz-top" title="' + L2("Gleichgewicht", "Balance") + '"><div><small>' + L2("Gleichgewicht", "Balance") + '</small><i></i><b>0</b></div><span></span></div>' +
        '<div class="sz-next"><kbd>E</kbd>' + L2("nächste Welle", "next wave") + '</div>' +
        '<div class="sz-elq" hidden><span class="sz-wv">' + SZ.WAVE_SVG + '</span><kbd>Q</kbd><b></b></div>' +
        '<div class="sz-elx" hidden><span class="sz-wv">' + SZ.WAVE_SVG + '</span><kbd>X</kbd><b></b></div>' +
        '<div class="sz-etoast" hidden></div>' +
        '<div class="sz-hint">' +
        L2("WASD laufen · Maus zielen · Leertaste Dash · Linksklick Katana ziehen, dann Hieb · Linksklick halten: Stich · Shift + Linksklick: Drehhieb · Rechtsklick Block · Block halten + Linksklick: Konter · Q / E + Rechtsklick: Parade / Ausweichen · Wurfwaffen: Linksklick halten · 1 / 2 / 3: Waffe wechseln (3 = Element: Klick Faust, Shift + Klick Geschosse, halten und loslassen Strahl) · X Wasserfessel · zwischen den Wellen: Q Wasser, E nächste Welle · M Ton · Esc Menü",
           "WASD move · mouse aim · space dash · left click draw katana, then slash · hold left click: thrust · shift + left click: spin · right click block · hold block + left click: counter · Q / E + right click: parry / dodge · throwing weapons: hold left click · 1 / 2 / 3: switch weapon (3 = element: click fist, Shift + click bolts, hold and release beam) · X water bind · between waves: Q water, E next wave · M sound · Esc menu") + '</div>';
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
      // Gleichgewicht für besiegte Gegner
      w.enemies.forEach(function (e) {
        if (e.dead && !e.counted) {
          e.counted = true; S.points += e.hpMax; pop(e.hpMax);
          for (var o = 0; o < Math.min(14, 4 + e.hpMax / 15); o++) w.parts.orb(e.x, e.y - 10 * e.sc, SZ.W - 18, 10);
        }
      });
      // Wellen: Verstärkung, Ende, nächste Welle mit E
      var alive = w.enemies.filter(function (e) { return !e.dead; }).length;
      S.waveClock += dt;
      if (S.reinf && (alive <= 1 || S.waveClock > 8)) { var R = S.reinf; S.reinf = null; spawnGroup(w, p, R.g, R.hpMul, "ring"); alive = 1; }
      if (!S.between && alive === 0 && !S.reinf) { S.between = true; S.floodLeft = 1; }
      waterUpdate(I, p);
      if (S.between && !p.dead && I.hit("e") && !S.casting && !S.queue.length) { S.waterMode = false; p.inputLock = false; startWave(); }
    },
    render: function (ctx) {
      var w = S.world;
      w.render(ctx, { ents: [S.player], player: S.player });
      w.enemies.forEach(function (e) { e.drawUI(ctx); });
      if (S.waterMode || S.queue.length) drawWaterSel(ctx);
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
