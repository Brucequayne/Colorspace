  // ===== 14-run-daten.js · Rogue-like-Run: Stellschrauben und Perks – hier wird der Run ausbalanciert =====
  // startShip/bossId: Nummer (id) eines Bauplans aus 13-npc-schiffe.js. budget0: Gegnerwert in Stage 1, growth: Faktor je Stage.
  // rewardK: Anteil des Gegnerwerts als Credits je Abschuss. repairK: Werftpreis für Reparatur als Anteil des Bauteilpreises.
  // repairTime: Sekunden freie Reparaturzeit nach der Stage. escape: ab dieser Entfernung (m) gilt ein fliehender Gegner als entkommen.
  var RUNCFG = { startShip: 3, startCredits: 0, bossId: 2, bossEvery: 4, budget0: 7000, growth: 1.22, over: 1.1, maxEnemies: 6,
    rewardK: 0.4, repairK: 0.5, repairTime: 30, escape: 1200, deadDelay: 2.5, perkChoices: 3 };
  // Perks: k = Feld im Perk-Haken PM (siehe 11-bauteile.js), v = Wert je Wahl. Zahlen addieren sich bei mehrfacher Wahl, true gibt es nur einmal.
  var PERKS = [
    { id: "side", k: "side", v: 0.25, n: L2("Seitendüsen-Tuning", "Side thruster tuning"), d: L2("+25 % Schub nach links und rechts", "+25 % thrust to the left and right") },
    { id: "brake", k: "brake", v: 0.25, n: L2("Bremsverstärker", "Brake booster"), d: L2("+25 % Schub beim Abbremsen", "+25 % thrust while braking") },
    { id: "mgRate", k: "mgRate", v: 0.15, n: L2("Schnellfeuer", "Rapid fire"), d: L2("Miniguns feuern 15 % schneller", "Miniguns fire 15 % faster") },
    { id: "batCap", k: "batCap", v: 0.25, n: L2("Dichte Zellen", "Dense cells"), d: L2("+25 % Batteriekapazität", "+25 % battery capacity") },
    { id: "msRl", k: "msRl", v: 0.25, n: L2("Ladeautomatik", "Autoloader"), d: L2("Raketen laden 25 % schneller nach", "Missiles reload 25 % faster") },
    { id: "hp", k: "hp", v: 0.1, n: L2("Verstärkte Struktur", "Reinforced structure"), d: L2("+10 % HP für alle Blöcke", "+10 % HP for all blocks") },
    { id: "prod", k: "prod", v: 0.2, n: L2("Reaktor-Feinabstimmung", "Reactor tuning"), d: L2("+20 % Energieerzeugung", "+20 % power generation") },
    { id: "walk", k: "walk", v: true, n: L2("Magnetstiefel", "Mag boots"), d: L2("Doppeltes Lauftempo zu Fuß", "Double walking speed on foot") },
    { id: "radar", k: "radar", v: 0.5, n: L2("Fernsensoren", "Long-range sensors"), d: L2("+50 % Antennenreichweite", "+50 % antenna range") },
    { id: "oc", k: "oc", v: 0.3, n: L2("Hitzeschild", "Heat shield"), d: L2("Overcharge hält 30 % länger", "Overcharge lasts 30 % longer") },
    { id: "msDmg", k: "msDmg", v: 0.2, n: L2("Hohlladung", "Shaped charge"), d: L2("+20 % Raketenschaden", "+20 % missile damage") },
    { id: "cockHp", k: "cockHp", v: 0.5, n: L2("Panzerkanzel", "Armoured canopy"), d: L2("+50 % HP für das Cockpit", "+50 % HP for the cockpit") },
    { id: "msTurn", k: "msTurn", v: 0.5, n: L2("Lenkflossen", "Steering fins"), d: L2("Raketen lenken 50 % stärker zum Mauszeiger", "Missiles steer 50 % harder toward the cursor") },
    { id: "crit", k: "crit", v: 0.1, n: L2("Schwachstellen-Scanner", "Weak-point scanner"), d: L2("+10 % Chance auf doppelten Minigun-Schaden", "+10 % chance for double minigun damage") },
    { id: "batW", k: "batW", v: true, n: L2("Leichtbau-Batterien", "Featherweight batteries"), d: L2("Batterien wiegen nichts mehr", "Batteries weigh nothing") },
    { id: "heavyW", k: "heavyW", v: 0.25, n: L2("Leichtlegierung", "Light alloy"), d: L2("Schwere Panzerung wiegt 25 % weniger", "Heavy armour weighs 25 % less") }
  ];
