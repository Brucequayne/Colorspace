/* Shizuku – weapons.js
   Alle Waffen mit ihren Werten. Neue Waffen einfach hier ergänzen.
   dmg      Schaden je Treffer (Grundwert)
   reach    Reichweite in Arena-Pixeln
   arc      Bogen eines normalen Hiebs in Grad
   speed    Tempo-Faktor (1 = normal, größer = schneller)
   weight   Gewicht: bremst das Laufen beim Angreifen
   blade    Klingenlänge beim Zeichnen
   style    Zeichenstil des Griffs und der Klinge
   attacks  Angriffsarten (Hieb = Linksklick tippen, Stich = Linksklick halten, Drehhieb = Shift + Linksklick)
   blocks   Zuordnung der drei Blockarten (Rechtsklick, Q + Rechtsklick, E + Rechtsklick)  */
(function () {
  var SZ = window.SZ, L2 = SZ.L2;
  SZ.WEAPONS = {
    katana: {
      name: function () { return L2("Katana", "Katana"); },
      dmg: 10, reach: 21, arc: 130, speed: 1, weight: 1, blade: 14,
      style: { blade: "#DCE3E8", edge: "#8E99A3", shine: "#FFFFFF", guard: "#C9A445", grip: "#1E1A1C", wrap: "#5B4A3A" },
      attacks: ["kesa", "tsuki", "kaiten"],
      blocks: ["kamae", "ukenagashi", "ashisabaki"]
    },
    // Yumi: Linksklick halten zum Spannen, loslassen zum Schießen.
    // Je länger gespannt (bis full Sekunden), desto schneller und stärker der Pfeil.
    yumi: {
      name: function () { return L2("Yumi (Bogen)", "Yumi (bow)"); },
      type: "bow", full: 1.15, minDraw: 0.12,
      speed: [221, 832], dmg: [5, 34], drawMove: 0.45, weight: 1,
      style: { blade: "#DCE3E8", edge: "#8E99A3", shine: "#FFFFFF", guard: "#C9A445", grip: "#1E1A1C", wrap: "#5B4A3A" }, blade: 14,
      attacks: ["shot", "shot", "shot"],
      blocks: ["kamae", "ukenagashi", "ashisabaki"]
    }
  };
  SZ.WEAPON_ORDER = ["katana", "yumi"];

  // Werte des Samurai
  SZ.PLAYER = {
    hp: 100, energy: 100,
    walk: 66, exhaustMul: 0.75,         // Grundtempo (Pixel/s); bei leerer Energie 25 % langsamer
    dashCost: 100 / 3, dashSpeed: 330, dashTime: 0.16,
    regenDelay: 2, regenRate: 45,       // Energie lädt nach 2 s ohne Angriff/Dash, 45 pro Sekunde
    blockCost: 1.4                      // Energieverlust je Schadenspunkt beim Blocken
  };

  // Angriffsarten (zeitlicher Ablauf in Sekunden)
  SZ.ATTACKS = {
    // Linksklick: schneller Diagonalhieb, bis zu 3 Hiebe als Kombo
    kesa:   { name: function () { return L2("Kesa-giri", "Kesa-giri"); }, wind: 0.05, swing: 0.13, rec: 0.14, arcMul: 1, dmgMul: 1, lunge: 34, combo: 3 },
    // Linksklick halten (ab 0,16 s) lädt auf, Loslassen sticht. Voll geladen nach chargeTime:
    // Schaden bis ×(1 + chargeDmg), weiterer Ausfallschritt, mehr Reichweite.
    tsuki:  { name: function () { return L2("Tsuki (aufgeladen)", "Tsuki (charged)"); }, wind: 0.04, swing: 0.17, rec: 0.24, thrust: true, dmgMul: 1.6, lunge: 220, reachBonus: 6,
              chargeTime: 0.6, chargeDmg: 0.7, chargeLunge: 90, chargeReach: 10 },
    // Shift + Linksklick: Drehhieb rundum, langsam und kräftig
    kaiten: { name: function () { return L2("Kaiten", "Kaiten"); }, wind: 0.12, swing: 0.3, rec: 0.2, arcDeg: 380, dmgMul: 1.7, lunge: 0 },
    // Rechtsklick halten + Linksklick: Konter (Kaeshi-waza). Die ersten 0,24 s parieren,
    // ein parierter Angriff macht den Gegenschlag deutlich stärker.
    kaeshi: { name: function () { return L2("Kaeshi-waza (Konter)", "Kaeshi-waza (counter)"); }, wind: 0.24, swing: 0.12, rec: 0.2, arcMul: 1.15, dmgMul: 1, counterMul: 2.6, lunge: 90, counter: true }
  };
  // Blockarten
  SZ.BLOCKS = {
    // Rechtsklick halten: Deckung nach vorn
    kamae:      { name: function () { return L2("Kamae", "Kamae"); }, hold: true, arc: 140, moveMul: 0.45, col: "#E9E2D0" },
    // Q + Rechtsklick: kurzes Abwehrfenster (Parade)
    ukenagashi: { name: function () { return L2("Uke-nagashi", "Uke-nagashi"); }, window: 0.2, rec: 0.3, arc: 170, col: "#7FD6E8" },
    // E + Rechtsklick: Ausweichschritt, kurz unverwundbar
    ashisabaki: { name: function () { return L2("Ashi-sabaki", "Ashi-sabaki"); }, dur: 0.22, rec: 0.18, speed: 230, col: "#B8E0A0" }
  };
})();
