  // ===== 42-zeichnen-hintergrund.js · Zeichnen: Sterne und Nebel =====
  // ---------- Hintergrund ----------
  var STARS = null, NEB = null;
  function stars() {
    if (STARS) return STARS;
    STARS = [];
    for (var l = 0; l < 3; l++) { var a = []; for (var i = 0; i < 220; i++) a.push([Math.random(), Math.random(), Math.random() * 0.8 + 0.3]); STARS.push(a); }
    // Nebel als nahtlos kachelbare Textur: jede Wolke wird mit Umbruch an allen Rändern gezeichnet, so gibt es nirgends eine Kante
    var N = 1024, cv = document.createElement("canvas"); cv.width = cv.height = N; var g = cv.getContext("2d");
    [[0.30, 0.34, 0.36, "90,60,140", 0.30], [0.72, 0.68, 0.30, "40,110,150", 0.24], [0.82, 0.18, 0.22, "70,50,120", 0.16], [0.15, 0.82, 0.26, "35,80,130", 0.16], [0.55, 0.45, 0.18, "110,70,150", 0.10]].forEach(function (q) {
      for (var ox = -1; ox <= 1; ox++) for (var oy = -1; oy <= 1; oy++) {
        var x = (q[0] + ox) * N, y = (q[1] + oy) * N, r = q[2] * N, gr = g.createRadialGradient(x, y, 0, x, y, r);
        gr.addColorStop(0, "rgba(" + q[3] + "," + q[4] + ")"); gr.addColorStop(1, "rgba(" + q[3] + ",0)"); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
      }
    });
    NEB = cv; return STARS;
  }
  function drawSpace(c, W, H, ox, oy) {
    c.fillStyle = "#080B12"; c.fillRect(0, 0, W, H);
    stars();
    var nw = Math.max(W, H) * 1.6, nx = -(((ox * 0.02) % nw) + nw) % nw, ny = -(((oy * 0.02) % nw) + nw) % nw;   // Kacheln lückenlos, in jede Richtung endlos
    c.globalAlpha = 0.9;
    for (var tx = nx; tx < W; tx += nw) for (var ty = ny; ty < H; ty += nw) c.drawImage(NEB, tx, ty, nw + 1, nw + 1);
    c.globalAlpha = 1;
    STARS.forEach(function (layer, li) {
      var par = [0.05, 0.12, 0.25][li], sz = [1, 1.4, 2][li];
      c.fillStyle = ["rgba(200,210,230,.5)", "rgba(220,228,245,.7)", "rgba(255,255,255,.9)"][li];
      layer.forEach(function (st) {
        var x = ((st[0] * W * 1.5 - ox * par) % (W * 1.5) + W * 1.5) % (W * 1.5) - W * 0.25, y = ((st[1] * H * 1.5 - oy * par) % (H * 1.5) + H * 1.5) % (H * 1.5) - H * 0.25;
        c.fillRect(x, y, sz * st[2], sz * st[2]);
      });
    });
  }

