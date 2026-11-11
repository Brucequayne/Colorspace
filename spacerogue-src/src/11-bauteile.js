  // ===== 11-bauteile.js · Bauteile: Definitionen (Masse, HP, Schub …), Kosten, Perk-Haken (PM), Kantenregeln =====
  // ---------- Bauteile ----------
  // kind: armor, cock, thr, gyro, bat, reac, ant, floor, wall, door, win, mg, rg
  // shape: full, ramp1, ramp2, round, half
  var T = {}, CATS = [];
  function def(id, o) { o.id = id; o.mass = Math.round(o.mass * 0.7 * 0.75 * 1000) / 1000; T[id] = o; return o; }   // alle Teile leichter: −30 % (v0.34), nochmals −25 % (v0.46)
  function armor(pre, heavy) {
    var m = heavy ? 3.3 : 0.5, hp = heavy ? 190 : 45, nm = heavy ? L2("schwer", "heavy") : L2("leicht", "light");
    var col = heavy ? "#6A7480" : "#9AA5B1";
    [["blk", "full", 1, 1, L2("Block 1×1", "Block 1×1"), 1],
     ["rmp", "ramp1", 1, 1, L2("Rampe 1×1", "Slope 1×1"), 0.5],
     ["rm2", "ramp2", 1, 2, L2("Rampe 1×2", "Slope 1×2"), 1],
     ["rm3", "ramp3", 1, 3, L2("Rampe 1×3", "Slope 1×3"), 1.5],
     ["cor", "round", 1, 1, L2("Ecke rund 1×1", "Round corner 1×1"), 0.8],
     ["hlf", "half", 1, 1, L2("Halb 1×1", "Half 1×1"), 0.5],
     ["bl2", "full", 1, 2, L2("Block 1×2", "Block 1×2"), 2]].forEach(function (a) {
      def(pre + a[0], { cat: heavy ? "catHA" : "catLA", kind: "armor", shape: a[1], w: a[2], h: a[3], mass: Math.round(m * a[5] * 100) / 100, hp: Math.round(hp * Math.max(0.6, a[5])), col: col, heavy: heavy,
        n: L2(a[4].de + " " + nm.de, a[4].en + " " + nm.en) });
    });
  }
  armor("l", false); armor("h", true);
  // Kosten in Credits (Cr): im Editor ist alles gratis; die Preise stehen in der Bauteilliste und im Infofeld
  var COSTS = { cks: 1200, ckm: 2400, ckl: 4200, ckt: 700, dk3: 2200, dk4: 3400, ths: 450, thf: 650, shs: 1400, shl: 3800, thl: 1600, gyr: 700, col: 300, ant: 400, bat: 350, rea: 2000, flo: 15, wal: 25, dor: 60, hat: 150, win: 40, mgn: 900, msl: 1300, msh: 2400, g25: 1800, g120: 3600, stu: 40, tis: 80, bet: 120, dbt: 180, toi: 150, dus: 200, tgc: 1600, rgn: 2600 };
  function applyCosts() { Object.keys(T).forEach(function (id) { var ty = T[id]; ty.cost = COSTS[id] || (ty.kind === "armor" ? Math.max(5, Math.round(ty.mass * (ty.heavy ? 26 : 57))) : 100); }); }
  function cr(v) { return nf(Math.round(v)) + " Cr"; }
  def("ckt", { cat: "catCo", kind: "cock", w: 1, h: 2, mass: 0.9, hp: 150, n: L2("Cockpit winzig 1×2", "Tiny cockpit 1×2"), col: "#9AA5B1" });
  def("cks", { cat: "catCo", kind: "cock", w: 2, h: 3, mass: 1.8, hp: 220, n: L2("Cockpit klein 2×3", "Small cockpit 2×3"), col: "#9AA5B1" });
  def("ckm", { cat: "catCo", kind: "cock", w: 3, h: 4, mass: 4.2, hp: 320, n: L2("Cockpit 3×4", "Cockpit 3×4"), col: "#9AA5B1" });
  def("ckl", { cat: "catCo", kind: "cock", w: 4, h: 5, mass: 7.5, hp: 440, n: L2("Cockpit groß 4×5", "Large cockpit 4×5"), col: "#9AA5B1" });
  def("ths", { cat: "catTh", kind: "thr", w: 1, h: 2, mass: 1.4, hp: 65, thrust: 421, use: 6, n: L2("Ionenantrieb klein 1×2", "Small ion thruster 1×2"), col: "#7E8995" });
  def("thf", { cat: "catTh", kind: "thr", w: 1, h: 1, mass: 0.9, hp: 45, thrust: 421, use: 9, n: L2("Hochleistungs-Triebwerk 1×1", "High-output thruster 1×1"), col: "#7E8995" });
  def("thl", { cat: "catTh", kind: "thr", w: 2, h: 3, mass: 5.2, hp: 170, thrust: 1615, use: 20, n: L2("Ionenantrieb groß 2×3", "Large ion thruster 2×3"), col: "#7E8995" });
  def("gyr", { cat: "catTh", kind: "gyro", w: 1, h: 1, mass: 1.1, hp: 65, torque: 17500, use: 3, n: L2("Gyroskop 1×1", "Gyroscope 1×1"), col: "#7E8995" });
  def("col", { cat: "catTh", kind: "cool", w: 1, h: 1, mass: 0.8, hp: 50, n: L2("Kühlblock 1×1", "Cooling block 1×1"), col: "#7E8995" });
  def("ant", { cat: "catTh", kind: "ant", w: 1, h: 3, mass: 0.9, hp: 32, n: L2("Antenne 1×3", "Antenna 1×3"), col: "#7E8995" });
  def("dk3", { cat: "catIn", kind: "dock", w: 3, h: 4, mass: 3.2, hp: 260, n: L2("Docking-Block 3×4", "Docking block 3×4"), col: "#8A95A3" });
  def("dk4", { cat: "catIn", kind: "dock", w: 4, h: 5, mass: 4.8, hp: 380, n: L2("Docking-Block 4×5", "Docking block 4×5"), col: "#8A95A3" });
  def("shs", { cat: "catEn", kind: "shield", w: 1, h: 1, mass: 1.3, hp: 60, shk: 5, n: L2("Schildgenerator klein 1×1", "Small shield generator 1×1"), col: "#5B7FA6" });
  def("shl", { cat: "catEn", kind: "shield", w: 2, h: 2, mass: 3.6, hp: 160, shk: 25, n: L2("Schildgenerator groß 2×2", "Large shield generator 2×2"), col: "#5B7FA6" });
  def("bat", { cat: "catEn", kind: "bat", w: 1, h: 1, mass: 1.6, hp: 50, cap: 300, n: L2("Batterie 1×1", "Battery 1×1"), col: "#7E8995" });
  def("rea", { cat: "catEn", kind: "reac", w: 2, h: 2, mass: 4.6, hp: 135, prod: 14, n: L2("Reaktor 2×2", "Reactor 2×2"), col: "#7E8995" });
  def("flo", { cat: "catIn", kind: "floor", w: 1, h: 1, mass: 0.18, hp: 32, n: L2("Boden (Innenraum)", "Floor (interior)"), col: "#9AA5B1" });
  def("wal", { cat: "catIn", kind: "wall", w: 1, h: 1, mass: 0.45, hp: 65, n: L2("Innenwand", "Interior wall"), col: "#9AA5B1" });
  def("dor", { cat: "catIn", kind: "door", w: 1, h: 1, mass: 0.6, hp: 75, n: L2("Schiebetür", "Sliding door"), col: "#9AA5B1" });
  def("hat", { cat: "catIn", kind: "hatch", w: 1, h: 1, mass: 0.9, hp: 90, n: L2("Luke nach außen", "Hatch to outside"), col: "#9AA5B1" });
  def("win", { cat: "catIn", kind: "win", w: 1, h: 1, mass: 0.7, hp: 40, n: L2("Fenster 1×1", "Window 1×1"), col: "#9AA5B1" });
  def("mgn", { cat: "catWe", kind: "mg", w: 1, h: 2, mass: 1.3, hp: 60, n: L2("Minigun 1×2", "Minigun 1×2"), col: "#7E8995" });
  def("msl", { cat: "catWe", kind: "ms", w: 1, h: 2, mass: 1.6, hp: 60, n: L2("Leichte Raketen 1×2", "Light missiles 1×2"), col: "#7E8995" });
  // Schwere Rakete (v0.50.1): rk = Raketen je Werfer, mk = Schadensfaktor gegenüber der leichten Rakete, ek = Energiefaktor je Schuss
  def("msh", { cat: "catWe", kind: "ms", w: 1, h: 2, mass: 2.4, hp: 60, rk: 1, mk: 4, ek: 2, n: L2("Schwere Rakete 1×2", "Heavy missile 1×2"), col: "#7E8995" });
  function msMax(b) { return T[b.t].rk || 2; }   // Magazingröße eines Raketenwerfers
  def("tgc", { cat: "catWe", kind: "tcomp", w: 1, h: 2, mass: 0.8, hp: 45, n: L2("Zielcomputer 1×2", "Targeting computer 1×2"), col: "#7E8995" });
  def("rgn", { cat: "catWe", kind: "rg", w: 1, h: 3, mass: 3.8, hp: 120, n: L2("Railgun 1×3", "Railgun 1×3"), col: "#7E8995" });
  // Geschütze (v0.51): Einzelschuss mit schweren Projektilen, Werte in GUN (12-balance.js)
  def("g25", { cat: "catWe", kind: "gun", w: 1, h: 2, mass: 2.2, hp: 85, n: L2("25-mm-Geschütz 1×2", "25 mm cannon 1×2"), col: "#7E8995" });
  def("g120", { cat: "catWe", kind: "gun", w: 1, h: 3, mass: 5.4, hp: 150, n: L2("120-mm-Geschütz 1×3", "120 mm cannon 1×3"), col: "#7E8995" });
  // Einrichtung (v0.51): rein dekorativ, gehört zum Raum (Luft), lässt sich aber nicht betreten. dk = Art der Zeichnung
  def("stu", { cat: "catDe", kind: "deco", dk: "chair", w: 1, h: 1, mass: 0.12, hp: 20, n: L2("Stuhl 1×1", "Chair 1×1"), col: "#9AA5B1" });
  def("tis", { cat: "catDe", kind: "deco", dk: "table", w: 2, h: 1, mass: 0.3, hp: 30, n: L2("Tisch 2×1", "Table 2×1"), col: "#9AA5B1" });
  def("bet", { cat: "catDe", kind: "deco", dk: "bed", w: 1, h: 2, mass: 0.4, hp: 30, n: L2("Bett 1×2", "Bed 1×2"), col: "#9AA5B1" });
  def("dbt", { cat: "catDe", kind: "deco", dk: "bed2", w: 1, h: 2, mass: 0.55, hp: 35, n: L2("Doppelbett 1×2", "Double bed 1×2"), col: "#9AA5B1" });
  def("toi", { cat: "catDe", kind: "deco", dk: "wc", w: 1, h: 1, mass: 0.25, hp: 25, n: L2("Toilette 1×1", "Toilet 1×1"), col: "#9AA5B1" });
  def("dus", { cat: "catDe", kind: "deco", dk: "shower", w: 1, h: 1, mass: 0.3, hp: 25, n: L2("Dusche 1×1", "Shower 1×1"), col: "#9AA5B1" });
  applyCosts();
  // Panzerung 1×2: so schwer wie zwei einzelne Blöcke, aber 15 % günstiger
  T.lbl2.cost = Math.round(T.lblk.cost * 2 * 0.85); T.hbl2.cost = Math.round(T.hblk.cost * 2 * 0.85);
  // Perks wurden in v0.47 abgeschafft. PM bleibt als neutrales Objekt (alles 0), damit die Werte-Haken im Code nichts verändern.
  var PM = { side: 0, brake: 0, mgRate: 0, batCap: 0, msRl: 0, hp: 0, prod: 0, walk: false, radar: 0, oc: 0, msDmg: 0, cockHp: 0, msTurn: 0, crit: 0, batW: false, heavyW: 0 };
  CATS = ["catLA", "catHA", "catCo", "catTh", "catEn", "catIn", "catDe", "catWe"];
  var MECH = { cock: 1, thr: 1, gyro: 1, ant: 1, bat: 1, reac: 1, door: 1, hatch: 1, mg: 1, rg: 1, gun: 1, cool: 1, ms: 1, tcomp: 1, shield: 1, dock: 1 };
  var ROOMABLE = { bat: 1, reac: 1, gyro: 1, cool: 1, tcomp: 1, shield: 1 };   // Maschinen, die in einem Raum stehen dürfen und dann zum Raum gehören
  function replaceable(newT, o) { return o && T[newT].kind !== "floor" && T[o.b.t].kind === "floor"; }
  var DV = [[0, -1], [1, 0], [0, 1], [-1, 0]];     // N, O, S, W als Zellversatz

  // Welche lokalen Außenkanten verbinden (conn) und dichten (seal)? d: 0 N, 1 O, 2 S, 3 W
  function edgeRule(ty, lx, ly, d) {
    var k = ty.kind, sh = ty.shape, last = ly === ty.h - 1;
    if (k === "armor") {
      if (sh === "ramp1" || sh === "round") return { c: d === 2 || d === 3, s: d === 2 || d === 3 };
      if (sh === "ramp2" || sh === "ramp3") return { c: d === 3 || (d === 2 && last), s: d === 3 || (d === 2 && last) };
      if (sh === "half") return { c: d !== 0, s: d === 2 };
      return { c: true, s: true };
    }
    if (k === "thr") return { c: d !== 2, s: true };                       // Düse hinten verbindet nicht
    if (k === "mg" || k === "rg" || k === "gun" || k === "ant" || k === "ms") return { c: last && d !== 0, s: true };   // nur am hinteren Ende
    if (k === "cock") return { c: true, s: true };                         // auch vorne an der Kanzel lässt sich anbauen
    return { c: true, s: true };
  }

