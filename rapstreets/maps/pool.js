/* Rap Streets – maps/pool.js
   Mitgelieferte Maps. "Brooklyn Corner": Kreuzung mit der Spitze zum Betrachter, vorn ein Parkplatz mit Crowd um einen Ghettoblaster
   (vorn offen – dort stehen später die Rapper). Eigene Maps aus dem Editor (Export) können hier als Daten dazukommen:
   RS.POOL.push({ id: "…", name: "…", data: { …exportierte Map… } }) */
(function () {
  var RS = window.RS, G = RS.G;
  function corner() {
    var t = [], x, y;
    for (y = 0; y < G; y++) for (x = 0; x < G; x++) {
      var c = "s", sx = x >= 13 && x <= 17, sy = y >= 13 && y <= 17;
      if (sy) c = x === 11 || x === 12 || x === 18 || x === 19 ? "e" : y === 15 && !sx ? "x" : "a";
      if (sx) c = sy ? "a" : (y === 11 || y === 12 || y === 18 || y === 19 ? "c" : x === 15 ? "y" : "a");
      if (x >= 20 && y >= 20) {   // Parkplatz vorn
        c = RS.hash2(x, y, 4) > 0.55 ? "r" : "a";
        if (y >= 20 && y <= 22 && x >= 27 && x % 2 === 1) c = "k";
        if (x >= 20 && x <= 22 && y >= 27 && y % 2 === 1) c = "l";
        if ((x === 26 || x === 27) && y === 24 || x === 21 && y === 25) c = "w";
        if (x >= 34 || y >= 34) c = "d";
      }
      if (x <= 1 && y >= 21) c = "d"; if (x <= 1 && y >= 24 && y <= 26) c = "g";
      if ((x === 16 && y === 6) || (x === 14 && y === 24)) c = "r";
      if ((x === 16 && y === 15) || (x === 10 && y === 14)) c = "w";
      t.push(c);
    }
    var obj = [], O = function (id, x, y, v, r) { obj.push({ t: id, v: v || 0, r: r || 0, x: x, y: y }); };
    // Hinten: Bodega an der Ecke, Brownstones, Backsteinblock
    O("bodega", 7, 7, 0); O("brown", 3, 8, 0); O("brick", 0, 2, 0); O("brown", 8, 3, 1, 1);
    // Rechts: Häuserzeile an der Straße
    O("brown", 20, 8, 1); O("brown", 24, 8, 0); O("brick", 28, 7, 1); O("garage", 20, 2, 1); O("brick", 25, 1, 0);
    // Links: Garage mit Graffiti zur Straße, dahinter Backstein und noch eine Bodega
    O("garage", 7, 20, 2, 1); O("brick", 7, 25, 0, 1); O("bodega", 3, 20, 2);
    // Straßen
    O("taxi", 20.5, 13.4, 0); O("sedan", 23.6, 16.6, 0); O("sedan", 4.5, 16.8, 1); O("van", 0.2, 13.2, 2);
    O("sedan", 13.3, 22, 3, 1); O("taxi", 16.6, 4.5, 0, 1);
    O("manhole", 14.7, 14.6); O("manhole", 25, 14.7);
    // Gehwege
    O("lamp", 11.3, 11.3); O("lamp", 19.4, 11.3); O("lamp", 11.3, 19.4); O("lamp", 19.5, 18.4); O("lamp", 4, 11.4); O("lamp", 27, 11.4);
    O("hydrant", 10.6, 12.4); O("trash", 12, 10.2, 0); O("crates", 11.2, 9.4, 2); O("crates", 11.25, 8.7, 0);
    O("pot", 4.1, 11.1, 0); O("pot", 6.3, 11.1, 1); O("pot", 21.1, 11.1, 2); O("pot", 23.3, 11.1, 0);
    O("bench", 24.8, 11.9, 0); O("trash", 30, 11.9, 1); O("dumpster", 11.3, 25.2, 0, 1); O("hydrant", 18.4, 19.5);
    // Parkplatz
    O("sedan", 27.5, 20.1, 2, 1); O("van", 29.45, 20, 1, 1); O("sedan", 31.5, 20.1, 0, 1);
    O("sedan", 20.1, 27.5, 1); O("taxi", 20.1, 29.5, 0);
    O("fence", 33.4, 20, 0, 1); O("fence", 33.4, 22, 0, 1); O("fence", 33.4, 24, 0, 1);
    O("crates", 32.6, 25.6, 1); O("trash", 32.4, 26.4, 0); O("bench", 25.6, 19.2, 1);
    O("boombox", 20.9, 20.95, 0);
    // Crowd: Bogen um den Platz vor dem Ghettoblaster, nach vorn offen
    var ppl = [], r = RS.rng(1990), cx = 21.7, cy = 21.7, N = 42;
    for (var i = 0; i < N; i++) {
      var a = Math.PI * 0.25 + Math.PI * 0.32 + (i / (N - 1)) * Math.PI * 1.36 + (r() - 0.5) * 0.1, d = 2.5 + r() * 1.2;
      ppl.push({ v: Math.floor(r() * RS.PEOPLE_N), x: Math.round((cx + Math.cos(a) * d) * 100) / 100, y: Math.round((cy + Math.sin(a) * d) * 100) / 100, f: r() < 0.5 ? 1 : 0 });
    }
    [[12, 10.6], [12.4, 10.9], [21.6, 12], [5.3, 12.1], [30.5, 19.2]].forEach(function (q, k) { ppl.push({ v: (k * 11 + 5) % RS.PEOPLE_N, x: q[0], y: q[1], f: k % 2 }); });
    return { name: "Brooklyn Corner", time: 18.4, tiles: t.join(""), obj: obj, ppl: ppl, stage: { x: 22.1, y: 22.1 } };
  }
  RS.POOL = [{ id: "corner", name: "Brooklyn Corner", make: corner }];
})();
