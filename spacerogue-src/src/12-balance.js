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
  // Maschinenpistole (Slot 3): Dauerfeuer bei gehaltener Maustaste, etwas Streuung
  var SMG = { dmg: MG.dmg * 0.35, speed: MG.speed, cd: 60 / 660, spread: 0.07 };
  // ===== Geschütze (v0.51): rpm = Schuss pro Minute, Projektile 50 % schneller als die der Minigun, life = Flugzeit (s), e = Energie je Schuss
  //       120 mm: zusätzlich kleine Explosion (splash = Radius in m, sdmg = Schaden am Rand der Explosion)
  var GUN = {
    g25: { rpm: 100, dmg: 38, speed: MG.speed * 1.5, life: 1.25, e: 3 },
    g120: { rpm: 20, dmg: 190, speed: MG.speed * 1.5, life: 1.5, e: 16, splash: 2.2, sdmg: 40 }
  };
  // ===== Turrets (v0.55): KI-gesteuerte Waffentürme. Werte wie die Waffe in tw, aber doppelter Energieverbrauch (eK).
  //       arc = Schwenkbereich je Richtung (20° → 40° gesamt), rate = Schwenktempo (rad/s), tol = Feuerfreigabe, wenn so genau ausgerichtet (rad)
  //       stop/go = Minigun-Turret setzt bei dieser Hitze ab (kurz vor der Überhitzung bei 1) und schießt erst unter go weiter
  //       rk = Anteil der Waffenreichweite, ab dem auf Ziele geschossen wird; head/len = Drehpunkt und Rohrlänge in Zellen ab der Vorderkante
  var TUR = { arc: 20 * Math.PI / 180, rate: 1.3, eK: 2, tol: { mg: 0.06, g25: 0.035, g120: 0.03, rg: 0.02 }, stop: 0.9, go: 0.45, rk: 0.85 };
  function turRange(tw) { return tw === "mg" ? MG.speed * MG.life : tw === "rg" ? RG.range : GUN[tw].speed * GUN[tw].life; }
  // Kennzahlen je Waffenblock für Editor und Infofeld: Schaden je Projektil, Feuerrate (Schuss/min) und DPS (Schaden pro Sekunde)
  // Raketen: Feuerrate über einen ganzen Nachladezyklus (ein Werfer leert sein Magazin und lädt nach). Railgun: Aufladen plus Abklingzeit.
  function wStats(id) {
    var ty = T[id]; if (!ty) return null; var k = ty.kind, dmg, rpm;
    if (k === "tur") { var ws = wStats(ty.tw === "mg" ? "mgn" : ty.tw === "rg" ? "rgn" : ty.tw); return ws ? { dmg: ws.dmg, rpm: ws.rpm, dps: ws.dps, tur: true } : null; }   // Turret: wie die Waffe
    if (k === "mg") { dmg = MG.dmg; rpm = MG.rate * 60; }
    else if (k === "gun") { dmg = GUN[id].dmg; rpm = GUN[id].rpm; }
    else if (k === "ms") { dmg = MS.dmg * (ty.mk || 1); rpm = 60 * (ty.rk || 2) / MS.reload; }
    else if (k === "rg") { dmg = RG.dmg; rpm = 60 / (RG.charge + RG.cd); }
    else return null;
    return { dmg: dmg, rpm: rpm, dps: dmg * rpm / 60 };
  }
  // Waffengruppe eines Blocks (Taste R schaltet durch): Minigun, je Geschütz- und Raketentyp eine eigene Gruppe, Railgun
  var WGROUPS = ["mg", "g25", "g120", "msl", "msh", "rg"];
  function grpOf(b) { var k = T[b.t].kind; return k === "mg" ? "mg" : k === "rg" ? "rg" : (k === "gun" || k === "ms") ? b.t : null; }
  function grpSpeed(g) { return GUN[g] ? GUN[g] : { speed: MG.speed, life: MG.life }; }
  var INV = { w: 8, h: 8 };
  // ===== Andocken: Reichweite, Spalt, Tempo des Autopiloten
  var DOCK = { range: CELL_M * 1.0 + 0.4, gap: CELL_M * 0.1, v: 1.4, w: 0.45 };
  // ===== Spieltipps: alle 60 s, 5 s sichtbar
  var TIP = { every: 60, show: 5 };
