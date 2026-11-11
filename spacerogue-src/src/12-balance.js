  // ===== 12-balance.js · Balance-Werte: Waffen, Anzug, KI, Kollision, Geschütze, Docking – hier wird am Spielgefühl gedreht =====
  // ===== Waffen: Minigun (MG), Raketen (MS), Railgun (RG). dmg = Schaden, e = Energie je Schuss. Die Schwere Rakete nutzt MS mit den Faktoren aus 11-bauteile.js (mk, ek)
  var MG = { rate: 12, speed: 462, life: 1.48, dmg: 7, heat: 0.042, cool: 0.42, warn: 0.78, lock: 3.2, e: 0.4 };
  var MS = { v0: 30, acc: 420, vmax: 340, turn: 0.45, life: 4, dmg: 55, splash: 2.6, sdmg: 28, reload: 2.5, gap: 0.18, e: 6 };
  var RG = { charge: 0.7, cd: 2.2, dmg: 150, range: 700, e: 67.5 };   // v0.39: +50 % Energie pro Schuss
  // Anzugluft in Sekunden; Raumluft füllt sich in dichten Räumen auf und entweicht durch Lecks
  var SUIT = { max: 180, refill: 20, jet: 3, acc: 5, breathe: 0.35 }, AIR = { fill: 0.22, vent: 0.9 }, WELD = 15;
  // Erkennung: im Gleitflug erst auf 20 m, mit Schub (oder beim Feuern) bis 260 m; zeigt die Nase genau auf mich, doppelt so weit
  var AI = { glide: 20, loud: 240, patrolV: 15, lose: 950, vk: 0.9 };
  // Kampfstile: Draufgänger kommen nah heran, Umkreiser halten Abstand und kreisen, Taktiker liegen dazwischen
  var AISTY = [
    { id: "aggro", n: L2("Draufgänger", "Brawler"), rk: 0.45, strafe: 4, orbit: 0, push: 55, mor: 0.9, man: { chase: 0.4, pass: 0.35, attack: 0.2, brk: 0.05 } },
    { id: "tact", n: L2("Taktiker", "Tactician"), rk: 1, strafe: 9, orbit: 0, push: 40, mor: 0.75, man: { chase: 0.2, pass: 0.25, attack: 0.35, brk: 0.2 } },
    { id: "orbit", n: L2("Umkreiser", "Circler"), rk: 1.45, strafe: 0, orbit: 30, push: 35, mor: 0.65, man: { chase: 0.05, pass: 0.2, attack: 0.55, brk: 0.2 } }
  ];
  // ===== KI: Dauer der Manöver in Sekunden [von, bis]
  var MANT = { chase: [3, 5], pass: [6, 9], attack: [3, 6], brk: [1.8, 3] };
  // ===== KI: Abstand in Metern, ab dem Gegner dir ausweichen
  var AVOID = 50;
  // ===== Kollision: e = Rückprall, dmgV = ab diesem Tempo (m/s) entsteht Schaden, dmgK = Schaden je m/s darüber
  var COL = { e: 0.3, dmgV: 20, dmgK: 7 };
  // ===== Geschütze mit Zielcomputer: max = Schwenkwinkel, rate = Schwenktempo
  var TURRET = { max: 15 * Math.PI / 180, rate: 2.6 };
  // ===== Optik: Triebwerksschweif und Staub
  var TRAIL = { life: 1.8, step: 0.04, alpha: 0.17 };
  var DUST = {
    near: { f: 1, tile: 60, n: 6, prob: 1, size: 0.22, minPx: 1, maxPx: 2.2, alpha: 0.32, col: "205,212,226", seed: 11 },
    front: { f: 2.2, tile: 55, n: 1, prob: 0.45, size: 0.5, minPx: 2, maxPx: 5, alpha: 0.16, col: "220,226,236", seed: 37 }
  };
  // ===== Zu Fuß: Pistole und Inventargröße
  var PISTOL = { dmg: MG.dmg * 0.5, speed: MG.speed, cd: 0.22 };
  var INV = { w: 8, h: 8 };
  // ===== Andocken: Reichweite, Spalt, Tempo des Autopiloten
  var DOCK = { range: CELL_M * 1.0 + 0.4, gap: CELL_M * 0.1, v: 1.4, w: 0.45 };
  // ===== Spieltipps: alle 60 s, 5 s sichtbar
  var TIP = { every: 60, show: 5 };
