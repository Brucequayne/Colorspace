/* Monsters Arc – character.js
   Figur auf der Map. Modell, Laufen, Kollision, Schritte und Haare sind 1:1 aus Shizukus Samurai (player.js)
   übernommen – ohne Kampf. Grundlage für alle Figuren: Spieler (Steuerung über Tastatur) und später NPCs
   (Steuerung über Skript, z. B. ch.moveTo / ch.face). Aussehen über look ("kid" = Spielfigur seit v0.28, "samurai", "ronin", … aus art-samurai.js).
   Laufen: WASD oder Pfeiltasten. Blickrichtung = Laufrichtung (8 Richtungen). */
(function () {
  var MA = window.MA, m = MA.m, TAU = Math.PI * 2;
  var R = 4;   // Fußkreis (wie Shizuku)
  var WALK = 66;   // Grundtempo in Pixel/s (MA.PLAYER.walk in Shizuku)
  // Katana in der Scheide (Farben aus Shizukus weapons.js)
  var KATANA = { grip: "#1E1A1C", wrap: "#5B4A3A", guard: "#C9A445" };

  function Character(world, x, y, opt) {
    opt = opt || {};
    this.world = world; this.look = opt.look || "kid";
    var LK = MA.samurai.LOOKS[this.look] || {};
    this.x = x; this.y = y; this.vx = 0; this.vy = 0;
    this.face = Math.PI / 2; this.dir = 2; this.bodyAng = this.face;
    this.walkPh = 0; this.stepT = 0; this.idleT = 0;
    this.appear = 1; this.control = true; this.moving = false;
    this.speed = opt.speed || WALK;
    this.sword = LK.kid ? false : opt.sword !== false;   // Katana an der Hüfte zeigen (wie Shizuku; die Spielfigur hat keins)
    this.hair = LK.kid ? null : new MA.samurai.Hair(8, 2.1);   // langer Zopf nur beim Samurai, die Spielfigur hat mittellange Haare im Modell
    this.input = { x: 0, y: 0 };        // gewünschte Richtung (-1..1), von Tastatur oder Skript
  }
  var P = Character.prototype;

  // Tastatur → Richtung (für die Spielfigur)
  P.readKeys = function (I) {
    var ix = 0, iy = 0;
    if (this.control) {
      if (I.down("a") || I.down("ArrowLeft")) ix -= 1;
      if (I.down("d") || I.down("ArrowRight")) ix += 1;
      if (I.down("w") || I.down("ArrowUp")) iy -= 1;
      if (I.down("s") || I.down("ArrowDown")) iy += 1;
    }
    var il = Math.sqrt(ix * ix + iy * iy); if (il) { ix /= il; iy /= il; }
    this.input.x = ix; this.input.y = iy;
  };

  P.update = function (dt) {
    var w = this.world, a = w.arena, ix = this.input.x, iy = this.input.y;
    if (ix || iy) this.face = Math.atan2(iy, ix);
    var sp = this.speed * a.speedAt(this.x, this.y), tx = ix * sp, ty = iy * sp, snap = 14;
    var k = Math.min(1, dt * snap);
    this.vx += (tx - this.vx) * k; this.vy += (ty - this.vy) * k;
    var np = a.move(this.x, this.y, this.vx * dt, this.vy * dt, R, w.solids);
    var moved = m.dist(this.x, this.y, np.x, np.y);
    this.x = np.x; this.y = np.y;
    if (moved > 0.2) {
      this.walkPh += moved / 22;
      // Fußabdrücke (seit v0.19): alle 9 px ein Abdruck, abwechselnd links und rechts der Laufrichtung
      this.printD = (this.printD || 0) + moved;
      if (this.printD > 9) {
        this.printD = 0; this.printSide = -(this.printSide || 1);
        var pt = a.tilePx(this.x, this.y);
        if (MA.TILES[pt] && MA.TILES[pt].prints && w.addPrint) { var ang = Math.atan2(this.vy, this.vx); w.addPrint(this.x - Math.sin(ang) * 1.6 * this.printSide, this.y + Math.cos(ang) * 1.2 * this.printSide, ang, pt); }
      }
      this.stepT -= dt;
      if (this.stepT <= 0) {
        this.stepT = 0.32;
        var tile = a.tilePx(this.x, this.y), sx = this.x - w.cam.x;
        if (tile === "w" || tile === "u") { w.parts.ring(this.x, this.y, 7, 0.7); w.parts.splash(this.x, this.y, 2, 0.4); MA.audio.play("step_water", { x: sx }); }
        else {
          w.parts.dust(this.x, this.y, 2, tile === "a" ? "#D6CCB0" : tile === "q" ? "#DCC294" : tile === "z" ? "#E6D6AE" : tile === "l" ? "#4A3C2A" : tile === "k" ? "#4A3628" : tile === "e" ? "#7A5E44" : tile === "g" ? "#B8B2A4" : "#A8A096");
          // Moos, Erde oder Pflanzen unter den Füßen → weicher Schritt
          var px = this.x, py = this.y, soft = tile === "m" || tile === "e" || tile === "k" || tile === "r" || tile === "l" || a.veg.some(function (v) { return Math.abs(v.x - px) < 6 && Math.abs(v.y - py) < 4 && v.t !== "lotus" && v.t !== "leaves" && v.t !== "petals"; });
          MA.audio.play(soft ? "step_grass" : "step", { x: sx });
        }
      }
    }
    this.moving = moved > 0.2;
    this.idleT += dt;
    this.bodyAng = this.face;
    this.dir = m.dir8(this.bodyAng);
    if (this.hair) this.hair.update(dt, this.hair.anchor(this.bodyAng, this.x, this.y, 0), w.wind + Math.min(2, Math.hypot(this.vx, this.vy) / 80), w.clock);
  };

  P.sprite = function () {
    var an = this.moving ? "walk" : "idle", k = an === "walk" ? Math.floor(this.walkPh * 6) : Math.floor(this.idleT / 0.7);
    return MA.samurai.frame(this.dir, an, k, this.look);
  };

  P.drawShadow = function (sc, sh) {
    var s = this.sprite(), A = MA.samurai;
    MA.light.shadowXf(sc, sh, this.x, this.y, A.AX, A.AY);
    sc.globalAlpha = this.appear;
    sc.drawImage(s.sil, 0, 0);
    sc.globalAlpha = 1;
  };

  // Zeichnen wie Shizukus Samurai mit Katana in der Scheide (Griff schaut vorn heraus)
  P.draw = function (ctx) {
    var s = this.sprite(), A = MA.samurai, x = Math.round(this.x), y = Math.round(this.y);
    ctx.fillStyle = "rgba(10,8,8," + (0.32 * this.appear) + ")";
    ctx.beginPath(); ctx.ellipse(x, y, 6, 2.6, 0, 0, TAU); ctx.fill();
    var hairBehind = this.dir >= 0 && this.dir <= 4;
    ctx.globalAlpha = this.appear;
    if (hairBehind && this.hair) this.hair.draw(ctx, this.appear);
    ctx.drawImage(s.cv, x - A.AX, y - A.AY);
    if (this.sword) {
      var f2 = this.face, fx2 = Math.cos(f2), fy2 = Math.sin(f2), rx2 = -fy2, ry2 = fx2;
      var hb = [-3.7 * rx2 + 2.7 * fx2, -3.7 * ry2 + 2.7 * fy2, 12.2], hd = [0.35 * rx2 + 1 * fx2, 0.35 * ry2 + 1 * fy2, 0.45];
      var p0 = A.proj(hb[0], hb[1], hb[2]), p1 = A.proj(hb[0] + hd[0] * 4.5, hb[1] + hd[1] * 4.5, hb[2] + hd[2] * 4.5);
      var hidden = Math.sin(f2) < -0.3;   // von hinten verdeckt der Körper den Griff
      if (!hidden) { var pen = MA.pen(ctx); pen.line(x + p0.x, y + p0.y, x + p1.x, y + p1.y, KATANA.grip); pen.px(x + (p0.x + p1.x) / 2, y + (p0.y + p1.y) / 2, KATANA.wrap); pen.px(x + p0.x, y + p0.y, KATANA.guard); }
    }
    if (!hairBehind && this.hair) this.hair.draw(ctx, this.appear);
    ctx.globalAlpha = 1;
  };

  MA.Character = Character;
})();
