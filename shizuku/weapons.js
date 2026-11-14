/* Shizuku – weapons.js
   Alle Waffen mit ihren Werten. Neue Waffen einfach hier ergänzen.
   dmg      Schaden je Treffer (Grundwert)
   reach    Reichweite in Arena-Pixeln
   arc      Bogen eines normalen Hiebs in Grad
   speed    Tempo-Faktor (1 = normal, größer = schneller)
   weight   Gewicht: bremst das Laufen beim Angreifen
   blade    Klingenlänge beim Zeichnen
   style    Zeichenstil des Griffs und der Klinge
   attacks  Zuordnung der drei Angriffsarten (Linksklick, Q + Linksklick, E + Linksklick)
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
    }
  };

  // Angriffsarten (zeitlicher Ablauf in Sekunden)
  SZ.ATTACKS = {
    // Linksklick: schneller Diagonalhieb, bis zu 3 Hiebe als Kombo
    kesa:   { name: function () { return L2("Kesa-giri", "Kesa-giri"); }, wind: 0.05, swing: 0.13, rec: 0.14, arcMul: 1, dmgMul: 1, lunge: 34, combo: 3 },
    // Q + Linksklick: Stich mit Ausfallschritt nach vorn
    tsuki:  { name: function () { return L2("Tsuki", "Tsuki"); }, wind: 0.09, swing: 0.16, rec: 0.22, thrust: true, dmgMul: 1.4, lunge: 190 },
    // E + Linksklick: Drehhieb rundum, langsam und kräftig
    kaiten: { name: function () { return L2("Kaiten", "Kaiten"); }, wind: 0.12, swing: 0.3, rec: 0.2, arcDeg: 380, dmgMul: 1.7, lunge: 0 }
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
