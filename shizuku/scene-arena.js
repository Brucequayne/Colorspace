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
  function spawnPoint(w, pl) {
    var a = w.arena;
    for (var i = 0; i < 200; i++) {
      var x = 24 + Math.random() * (SZ.W - 48), y = 34 + Math.random() * (SZ.H - 64);
      if (!a.walkable(x, y, 7) || a.tilePx(x, y) === "w" || w.blockedAt(x, y)) continue;
      var F = w.flowTo(pl.x, pl.y); if (F.dist[Math.floor(y / 8) * (SZ.W / 8) + Math.floor(x / 8)] < 0) continue;   // muss den Spieler erreichen können
      if (SZ.m.dist(x, y, pl.x, pl.y) < 95) continue;
      if (w.solids.some(function (c) { return SZ.m.dist(x, y, c[0], c[1]) < c[2] + 8; })) continue;
      if (w.enemies.some(function (e) { return SZ.m.dist(x, y, e.x, e.y) < 24; })) continue;
      return [x, y];
    }
    return null;
  }
  function banner(n, sub) {
    var old = SZ.main.ui.querySelector(".sz-wave"); if (old) old.remove();
    var d = document.createElement("div"); d.className = "sz-wave";
    d.innerHTML = "<b>" + (NUM[n - 1] || n) + "</b>" + L2("Welle ", "Wave ") + n + (sub ? "<i>" + sub + "</i>" : "");
    SZ.main.ui.appendChild(d);
  }

  // ---------- Wellen ----------
  // r = Ronin, h = Heavy Ronin, rr/hh = Verstärkung (kommt, wenn höchstens einer übrig ist oder nach 8 s)
  var WAVES = [
    { r: 1 },
    { r: 2 },
    { h: 1, sub: function () { return L2("Ein Schwerer, allein", "A heavy one, alone"); } },
    { r: 3 },
    { h: 1, r: 2 },
    { r: 2, rr: 2, sub: function () { return L2("Mit Verstärkung", "With reinforcements"); } },
    { h: 2, sub: function () { return L2("Zwei Schwere", "Two heavies"); } },
    { r: 4, hh: 1, sub: function () { return L2("Mit Verstärkung", "With reinforcements"); } },
    { r: 6 },
    { h: 2, r: 2, rr: 2 }
  ];
  function waveSpec(n) {
    if (n <= WAVES.length) return WAVES[n - 1];
    // Danach: wachsend bis 9 Gegner gleichzeitig, ab und zu Sonderwellen
    var k = n - WAVES.length, total = Math.min(9, 5 + Math.floor(k / 2)), roll = Math.random();
    if (roll < 0.15) return { h: Math.min(4, 2 + Math.floor(k / 3)), sub: function () { return L2("Nur Schwere", "Heavies only"); } };
    if (roll < 0.3) return { r: Math.min(9, total + 2), sub: function () { return L2("Ein Schwarm Ronin", "A swarm of ronin"); } };
    var h = Math.max(1, Math.round(total * (0.2 + Math.random() * 0.2))), r = total - h;
    return { r: Math.ceil(r / 2), h: Math.ceil(h / 2), rr: Math.floor(r / 2), hh: Math.floor(h / 2) };
  }
  function spawnGroup(w, p, r, h, hpMul) {
    var list = [];
    for (var i = 0; i < (h || 0); i++) list.push("heavy");
    for (var j = 0; j < (r || 0); j++) list.push("ronin");
    list.forEach(function (t) { var sp = spawnPoint(w, p); if (sp) w.enemies.push(new SZ.Enemy(w, t, sp[0], sp[1], { hpMul: hpMul })); });
  }
  function startWave() {
    var w = S.world, p = S.player, n = ++S.wave, spec = waveSpec(n), hpMul = n > 10 ? 1 + (n - 10) * 0.06 : 1;
    S.between = false; S.waveClock = 0;
    S.reinf = (spec.rr || spec.hh) ? { r: spec.rr || 0, h: spec.hh || 0, hpMul: hpMul } : null;
    var sub = spec.sub ? spec.sub() : (spec.h || spec.hh) ? L2("Heavy Ronin dabei", "Heavy Ronin among them") : "";
    banner(n, sub);
    spawnGroup(w, p, spec.r, spec.h, hpMul);
  }
  function validTile(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= SZ.COLS || ty >= SZ.ROWS) return false;
    var c = S.world.arena.tile(tx, ty);
    return c !== "w" && c !== "v" && c !== "#";
  }
  // Auswahl im Wasser-Modus zeichnen (Kachel unter der Maus, gewählte Kacheln)
  function drawWaterSel(ctx) {
    var I = SZ.input, T = SZ.TILE, t = S.world.clock, cost = SZ.ELEMENT_COST.water;
    S.queue.forEach(function (q, i) {
      var a = 0.25 + 0.15 * Math.sin(t * 5 + i);
      ctx.fillStyle = "rgba(110,190,230," + a + ")"; ctx.fillRect(q[0] * T, q[1] * T, T, T);
      ctx.strokeStyle = i === 0 && S.casting ? "rgba(230,250,255,0.95)" : "rgba(140,210,240,0.85)"; ctx.lineWidth = 1; ctx.strokeRect(q[0] * T + 0.5, q[1] * T + 0.5, T - 1, T - 1);
    });
    if (!S.waterMode || !I.inside) return;
    var tx = Math.floor(I.mx / T), ty = Math.floor(I.my / T), ok = validTile(tx, ty) && S.points - S.queue.length * cost >= cost;
    var pulse = 0.6 + 0.4 * Math.sin(t * 7);
    ctx.strokeStyle = ok ? "rgba(170,230,255," + pulse + ")" : "rgba(230,90,70," + pulse + ")";
    ctx.strokeRect(tx * T + 0.5, ty * T + 0.5, T - 1, T - 1);
    // kleine Wellen in der Kachel
    if (ok) { ctx.fillStyle = "rgba(200,240,255,0.7)"; for (var k = 0; k < 3; k++) { var yy = ty * T + 4 + k * 4; for (var x = 2; x < 14; x++) if (Math.sin(x * 0.9 + t * 6 + k) > 0.3) ctx.fillRect(tx * T + x, yy + Math.round(Math.sin(x * 0.9 + t * 6 + k)), 1, 1); } }
  }
  function hudDom() {
    var ui = SZ.main.ui, top = ui.querySelector(".sz-top");
    var alive = S.world.enemies.filter(function (e) { return !e.dead; }).length + (S.reinf ? S.reinf.r + S.reinf.h : 0);
    var pts = String(S.points), wv = S.wave ? L2("Welle ", "Wave ") + S.wave + (S.between ? "" : " · " + alive + L2(" übrig", " left")) : "";
    if (top.dataset.p !== pts) { top.querySelector("b").textContent = pts; top.dataset.p = pts; }
    if (top.dataset.w !== wv) { top.querySelector("span").textContent = wv; top.dataset.w = wv; }
    var nx = ui.querySelector(".sz-next"), show = S.between && !S.player.dead && !S.out && !S.waterMode;
    if (nx.hidden === show) nx.hidden = !show;
    // Element-Hinweis: Wasser mit Q
    var eq = ui.querySelector(".sz-elq"), es = S.player.element === "water" && S.between && !S.player.dead && !S.out;
    if (eq.hidden === es) eq.hidden = !es;
    if (es) {
      var cost = SZ.ELEMENT_COST.water, txt = S.waterMode
        ? L2("Wasser: Kachel anklicken (" + cost + " Gleichgewicht) · Rechtsklick entfernen · Q beenden", "Water: click a tile (" + cost + " balance) · right click removes · Q ends")
        : L2("Wasser (" + cost + " Gleichgewicht je Kachel)", "Water (" + cost + " balance per tile)");
      if (eq.dataset.t !== txt) { eq.querySelector("b").textContent = txt; eq.dataset.t = txt; }
      eq.classList.toggle("on", S.waterMode); eq.classList.toggle("poor", S.points - S.queue.length * cost < cost);
    }
  }
  function pop(amount) {
    var top = SZ.main.ui.querySelector(".sz-top"), e = document.createElement("em");
    e.textContent = "+" + amount; top.appendChild(e);
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
            waterMode: false, queue: [], casting: null, castN: 0 };
      SZ.hud.reset();
      if (!opt || !opt.world) SZ.audio.musicStart();
      SZ.main.root.classList.add("sz-play");
      SZ.main.ui.innerHTML = '<div class="sz-top" title="' + L2("Gleichgewicht", "Balance") + '"><div><small>' + L2("Gleichgewicht", "Balance") + '</small><i></i><b>0</b></div><span></span></div>' +
        '<div class="sz-next"><kbd>E</kbd>' + L2("nächste Welle", "next wave") + '</div>' +
        '<div class="sz-elq" hidden><span class="sz-wv">' + SZ.WAVE_SVG + '</span><kbd>Q</kbd><b></b></div>' +
        '<div class="sz-hint">' +
        L2("WASD laufen · Maus zielen · Leertaste Dash · Linksklick Katana ziehen, dann Hieb · Linksklick halten: Stich · Shift + Linksklick: Drehhieb · Rechtsklick Block · Block halten + Linksklick: Konter · Q / E + Rechtsklick: Parade / Ausweichen · Wurfwaffen: Linksklick halten · 1 / 2: Waffe wechseln · zwischen den Wellen: Q Wasser, E nächste Welle · M Ton · Esc Menü",
           "WASD move · mouse aim · space dash · left click draw katana, then slash · hold left click: thrust · shift + left click: spin · right click block · hold block + left click: counter · Q / E + right click: parry / dodge · throwing weapons: hold left click · 1 / 2: switch weapon · between waves: Q water, E next wave · M sound · Esc menu") + '</div>';
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
      if (S.reinf && (alive <= 1 || S.waveClock > 8)) { var R = S.reinf; S.reinf = null; spawnGroup(w, p, R.r, R.h, R.hpMul); alive = 1; }
      if (!S.between && alive === 0 && !S.reinf) S.between = true;
      // Wasser-Element zwischen den Wellen: Q schaltet den Modus, Klick wählt Kacheln
      var cost = SZ.ELEMENT_COST.water;
      if (S.between && !p.dead && p.element === "water" && I.hit("q")) { S.waterMode = !S.waterMode; if (!S.waterMode) S.queue = S.casting ? S.queue.slice(0, 1) : []; }
      p.inputLock = S.waterMode;
      if (S.waterMode && I.inside) {
        var tx = Math.floor(I.mx / SZ.TILE), ty = Math.floor(I.my / SZ.TILE), qi = S.queue.findIndex(function (q) { return q[0] === tx && q[1] === ty; });
        if (I.lmbHit && qi < 0 && validTile(tx, ty) && S.points - S.queue.length * cost >= cost) S.queue.push([tx, ty]);
        else if (I.lmbHit && qi < 0) SZ.audio.play("block", { vol: 0.25, rate: 1.6 });
        if (I.rmbHit && qi > 0) S.queue.splice(qi, 1);
        if (I.rmbHit && qi === 0 && !S.casting) S.queue.splice(0, 1);
      }
      if (!S.casting && S.queue.length && !p.act && !p.dead) {
        var q = S.queue[0];
        S.casting = p.startCast(q[0], q[1], S.castN++, function () { S.points -= cost; });
      }
      if (S.casting && S.casting.done) { S.casting = null; S.queue.shift(); }
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
