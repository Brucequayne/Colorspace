/* Shizuku – particles.js
   Kleine Partikel: fallende Blätter, Staub, Wassertropfen, Wellenringe, Stroh, Funken, Nachbilder.
   z = Höhe über dem Boden (Pixel), Schatten wird am Boden gezeichnet. */
(function () {
  var SZ = window.SZ;
  var LEAF = ["#8E1F1A", "#A82722", "#D24A2C", "#E07A34", "#F0A040"];

  function Particles() { this.list = []; }
  var P = Particles.prototype;
  P.add = function (o) { if (this.list.length > 900) this.list.shift(); o.age = 0; this.list.push(o); return o; };
  P.leaf = function (x, y, z) {
    return this.add({ type: "leaf", x: x, y: y, z: z, vx: 4 + Math.random() * 6, vy: Math.random() * 3, vz: -9 - Math.random() * 5, life: 9 + Math.random() * 6, col: LEAF[(Math.random() * LEAF.length) | 0], ph: Math.random() * 6.28, ground: 0 });
  };
  P.dust = function (x, y, n, col) {
    for (var i = 0; i < (n || 3); i++) this.add({ type: "dust", x: x + (Math.random() - 0.5) * 4, y: y + (Math.random() - 0.5) * 2, z: 0.5, vx: (Math.random() - 0.5) * 14, vy: (Math.random() - 0.5) * 6, vz: 6 + Math.random() * 8, life: 0.35 + Math.random() * 0.3, col: col || "#A8A096" });
  };
  P.splash = function (x, y, n, power) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * 6.28, s = (20 + Math.random() * 50) * (power || 1);
      this.add({ type: "drop", x: x, y: y, z: 1, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.6, vz: 30 + Math.random() * 60 * (power || 1), life: 1.2, col: Math.random() < 0.5 ? "#CDEFF2" : "#8FCAD6" });
    }
  };
  P.ring = function (x, y, r1, life, col) { this.add({ type: "ring", x: x, y: y, z: 0, r1: r1, life: life || 1, col: col || "rgba(190,235,240," }); };
  P.straw = function (x, y, n) {
    for (var i = 0; i < n; i++) this.add({ type: "straw", x: x, y: y, z: 10 + Math.random() * 8, vx: (Math.random() - 0.5) * 70, vy: (Math.random() - 0.5) * 30, vz: 20 + Math.random() * 40, life: 1.4, col: Math.random() < 0.5 ? "#D8BC6A" : "#B0924A" });
  };
  P.spark = function (x, y, z, n, col) {
    for (var i = 0; i < n; i++) { var a = Math.random() * 6.28, s = 40 + Math.random() * 80; this.add({ type: "spark", x: x, y: y, z: z, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.6, vz: (Math.random() - 0.3) * 60, life: 0.25 + Math.random() * 0.2, col: col || "#FFF4C8" }); }
  };
  P.ghost = function (spr, x, y, col) { this.add({ type: "ghost", spr: spr, x: x, y: y, z: 0, life: 0.28, col: col }); };

  P.update = function (dt, world) {
    var L = this.list, wind = world ? world.wind : 1;
    for (var i = L.length - 1; i >= 0; i--) {
      var p = L[i]; p.age += dt;
      if (p.age > p.life) { L.splice(i, 1); continue; }
      if (p.type === "leaf") {
        if (p.z > 0) {
          p.ph += dt * 3;
          p.x += (p.vx * wind + Math.sin(p.ph) * 10) * dt; p.y += (p.vy + Math.cos(p.ph * 0.7) * 3) * dt;
          p.z += (p.vz + Math.sin(p.ph * 1.3) * 4) * dt;
          if (p.z <= 0) { p.z = 0; p.ground = p.age; if (world && world.arena.tilePx(p.x, p.y) === "w") { p.float = true; } }
        } else if (p.float) { p.x += 3 * wind * dt; }
      } else if (p.type === "ring" || p.type === "ghost") {
        // nur Zeit
      } else {
        p.vz -= 220 * dt;
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        if (p.z < 0) {
          p.z = 0; p.vz *= -0.25; p.vx *= 0.5; p.vy *= 0.5;
          if (p.type === "drop") { p.life = Math.min(p.life, p.age + 0.05); }
        }
        if (p.type === "dust") { p.vx *= 0.9; p.vy *= 0.9; p.vz *= 0.9; }
      }
    }
  };

  // Am Boden liegende Teile und Schatten (vor den Figuren)
  P.drawLow = function (ctx) {
    this.list.forEach(function (p) {
      var k = 1 - p.age / p.life;
      if (p.type === "ring") {
        var r = p.r1 * SZ.m.easeOutCubic(p.age / p.life);
        ctx.strokeStyle = p.col + (0.55 * k) + ")"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(p.x, p.y, r, r * 0.55, 0, 0, 6.283); ctx.stroke();
      } else if (p.type === "leaf" && p.z <= 0) {
        ctx.globalAlpha = Math.min(1, (p.life - p.age) / 1.5);
        ctx.fillStyle = p.col; ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 1);
        ctx.globalAlpha = 1;
      } else if (p.z > 1.5 && p.type !== "ghost") {
        ctx.fillStyle = "rgba(0,0,0,0.22)"; ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
      }
    });
  };
  // Fliegende Teile (über den Figuren)
  P.drawHigh = function (ctx) {
    this.list.forEach(function (p) {
      var k = 1 - p.age / p.life, x = Math.round(p.x), y = Math.round(p.y - p.z);
      if (p.type === "leaf" && p.z > 0) {
        ctx.fillStyle = p.col;
        var f = Math.sin(p.ph * 2) > 0;
        ctx.fillRect(x, y, f ? 2 : 1, f ? 1 : 2);
      } else if (p.type === "dust") { ctx.globalAlpha = k * 0.7; ctx.fillStyle = p.col; ctx.fillRect(x, y, 1, 1); ctx.globalAlpha = 1; }
      else if (p.type === "drop" || p.type === "straw") { ctx.fillStyle = p.col; ctx.fillRect(x, y, 1, p.type === "straw" ? 2 : 1); }
      else if (p.type === "spark") { ctx.globalAlpha = k; ctx.fillStyle = p.col; ctx.fillRect(x, y, 1, 1); ctx.globalAlpha = 1; }
      else if (p.type === "ghost") {
        ctx.globalAlpha = k * 0.45; ctx.drawImage(p.spr.cv, Math.round(p.x - SZ.samurai.AX), Math.round(p.y - SZ.samurai.AY));
        ctx.globalAlpha = 1;
      }
    });
  };
  SZ.Particles = Particles;
})();
