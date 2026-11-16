/* Shizuku – perks.js
   Perks (Tugenden): Nach jeder 3. Welle wählt man einen von zwei zufälligen Perks, der andere verfällt.
   Perks gelten für den ganzen Lauf und stapeln sich (zweimal genommen = doppelte Wirkung).
   Einige sind einmalig (once): sie werden nicht noch einmal angeboten.
   Gezählt wird in player.perks = { id: Anzahl }. Alle Werte stehen hier in PERKS, die Wirkung holt sich
   der Rest des Spiels über SZ.perk (Schaden, Tempo, Kosten …). */
(function () {
  var SZ = window.SZ, L2 = SZ.L2;
  var PERKS = [
    { id: "gelassenheit", de: "Gelassenheit", en: "Serenity", d: ["Dash verbraucht 15 % weniger Energie.", "Dashing uses 15 % less energy."] },
    { id: "selbstbeherrschung", de: "Selbstbeherrschung", en: "Self-control", d: ["15 % weniger Mana-Verbrauch.", "15 % less mana use."], req: function (p) { return p.element !== "none"; } },
    { id: "dankbarkeit", de: "Dankbarkeit", en: "Gratitude", d: ["+10 % Gleichgewicht für jede Eliminierung.", "+10 % balance for every kill."] },
    { id: "tapferkeit", de: "Tapferkeit", en: "Bravery", d: ["+15 % Schaden mit Nahkampfwaffen.", "+15 % melee weapon damage."] },
    { id: "pflichtbewusstsein", de: "Pflichtbewusstsein", en: "Sense of duty", d: ["Jede Welle ohne erlittenen Schaden gibt dauerhaft +2 % Schaden.", "Every wave without taking damage gives a permanent +2 % damage."] },
    { id: "entschlossenheit", de: "Entschlossenheit", en: "Determination", d: ["+15 % Bewegungstempo.", "+15 % movement speed."] },
    { id: "zurueckhaltung", de: "Zurückhaltung", en: "Restraint", once: true, d: ["+50 % Mana, aber −50 % Energie.", "+50 % mana, but −50 % energy."], req: function (p) { return p.element !== "none"; } },
    { id: "harmonie", de: "Harmoniebedürfnis", en: "Need for harmony", d: ["20 % Chance auf einen kritischen Treffer (+50 % Schaden).", "20 % chance for a critical hit (+50 % damage)."] },
    { id: "gastfreundschaft", de: "Gastfreundschaft", en: "Hospitality", d: ["Jede Eliminierung heilt 1 Leben.", "Every kill heals 1 health."], req: function (p) { return !has(p, "ehre"); } },
    { id: "opfer", de: "Opferbereitschaft", en: "Self-sacrifice", d: ["Nach erlittenem Schaden 5 s lang +50 % Schaden.", "After taking damage, +50 % damage for 5 s."] },
    { id: "praezision", de: "Präzision", en: "Precision", once: true, d: ["Voll gespannte Pfeile korrigieren leicht ihren Kurs zum Gegner.", "Fully drawn arrows slightly correct their course toward enemies."] },
    { id: "standhaftigkeit", de: "Standhaftigkeit", en: "Steadfastness", d: ["Jeder geblockte Angriff fügt dem Angreifer 30 % des Schadens zu.", "Every blocked attack deals 30 % of its damage back to the attacker."] },
    { id: "weisheit", de: "Weisheit", en: "Wisdom", once: true, d: ["Nur noch die Waffe aus Slot 1 – dafür +50 % Tempo, +50 % Schaden, +15 % Angriffstempo.", "Only the slot 1 weapon from now on – but +50 % speed, +50 % damage, +15 % attack speed."], req: function (p) { return !has(p, "selbstachtung"); } },
    { id: "selbstachtung", de: "Selbstachtung", en: "Self-respect", once: true, d: ["Nur noch Element-Angriffe – dafür kosten sie 50 % weniger Mana.", "Only element attacks from now on – but they cost 50 % less mana."], req: function (p) { return p.element !== "none" && !has(p, "weisheit"); } },
    { id: "ehre", de: "Ehre", en: "Honor", once: true, d: ["Nur noch 1 Leben – dafür +25 % Schaden mit jeder Eliminierung.", "Only 1 health left – but +25 % damage with every kill."] },
    { id: "demut", de: "Demut", en: "Humility", d: ["Blocken kostet 50 % weniger Energie.", "Blocking costs 50 % less energy."] },
    { id: "hoeflichkeit", de: "Höflichkeit", en: "Courtesy", once: true, d: ["Eine gelungene Parade tötet einen Ronin sofort.", "A successful parry kills a ronin instantly."] },
    // eigene Ergänzungen
    { id: "achtsamkeit", de: "Achtsamkeit", en: "Mindfulness", d: ["Energie lädt 25 % schneller.", "Energy recharges 25 % faster."] },
    { id: "geduld", de: "Geduld", en: "Patience", d: ["Mana lädt 25 % schneller.", "Mana recharges 25 % faster."], req: function (p) { return p.element !== "none"; } },
    { id: "bescheidenheit", de: "Bescheidenheit", en: "Modesty", d: ["+20 maximales Leben (und sofort geheilt).", "+20 max health (and healed right away)."], req: function (p) { return !has(p, "ehre"); } },
    { id: "beharrlichkeit", de: "Beharrlichkeit", en: "Perseverance", d: ["10 % weniger erlittener Schaden.", "10 % less damage taken."] },
    { id: "aufrichtigkeit", de: "Aufrichtigkeit", en: "Sincerity", d: ["Kritische Treffer machen +25 % mehr Schaden.", "Critical hits deal +25 % more damage."], req: function (p) { return has(p, "harmonie"); } }
  ];
  function has(p, id) { return !!(p.perks && p.perks[id]); }
  function n(p, id) { return (p && p.perks && p.perks[id]) || 0; }
  var BY = {}; PERKS.forEach(function (k) { BY[k.id] = k; });

  SZ.PERKS = PERKS;
  SZ.perk = {
    n: n, def: function (id) { return BY[id]; },
    name: function (id) { return L2(BY[id].de, BY[id].en); },
    desc: function (id) { return L2(BY[id].d[0], BY[id].d[1]); },
    // Zwei verschiedene, zufällige Perks zur Wahl
    offer: function (p) {
      var pool = PERKS.filter(function (k) { return !(k.once && has(p, k.id)) && (!k.req || k.req(p)); });
      var a = pool.splice((Math.random() * pool.length) | 0, 1)[0], b = pool.splice((Math.random() * pool.length) | 0, 1)[0];
      return [a.id, b.id];
    },
    // Perk nehmen: zählen und Sofort-Wirkungen anwenden
    take: function (p, id) {
      p.perks = p.perks || {}; p.perks[id] = (p.perks[id] || 0) + 1;
      if (id === "zurueckhaltung") { p.manaMax *= 1.5; p.mana = p.manaMax; p.enMax *= 0.5; p.en = Math.min(p.en, p.enMax); }
      if (id === "bescheidenheit") { p.hpMax += 20; p.hp += 20; }
      if (id === "ehre") { p.hpMax = 1; p.hp = 1; p.honor = 0; }
      if (id === "weisheit") { p.slots = [p.slots[0]]; p.wi = 0; p.act = null; p.weapon = SZ.WEAPONS[p.slots[0]]; }
      if (id === "selbstachtung") { var el = "el_" + p.element; p.slots = [el]; p.wi = 0; p.weapon = SZ.WEAPONS[el]; p.act = null; }
    },
    // Schaden, den der Samurai austeilt (src: sword, arrow, water, beam, wind …). Rückgabe { dmg, crit }
    outgoing: function (p, dmg, src) {
      if (!p || !p.perks) return { dmg: dmg, crit: false };
      var k = 1;
      if (src === "sword") k *= 1 + 0.15 * n(p, "tapferkeit");
      if (n(p, "weisheit")) k *= 1.5;
      k *= 1 + 0.02 * (p.duty || 0);
      if (p.rageT > 0) k *= 1 + 0.5 * n(p, "opfer");
      if (p.honor) k *= 1 + p.honor;
      var crit = Math.random() < Math.min(1, 0.2 * n(p, "harmonie"));
      if (crit) k *= 1.5 + 0.25 * n(p, "aufrichtigkeit");
      return { dmg: dmg * k, crit: crit };
    },
    move: function (p) { return (1 + 0.15 * n(p, "entschlossenheit")) * (n(p, "weisheit") ? 1.5 : 1); },
    atkSpeed: function (p) { return n(p, "weisheit") ? 1.15 : 1; },
    dashCost: function (p) { return SZ.PLAYER.dashCost * Math.pow(0.85, n(p, "gelassenheit")); },
    mana: function (p) { return Math.pow(0.85, n(p, "selbstbeherrschung")) * (n(p, "selbstachtung") ? 0.5 : 1); },
    block: function (p) { return Math.pow(0.5, n(p, "demut")); },
    taken: function (p) { return Math.pow(0.9, n(p, "beharrlichkeit")); },
    enRegen: function (p) { return 1 + 0.25 * n(p, "achtsamkeit"); },
    manaRegen: function (p) { return 1 + 0.25 * n(p, "geduld"); },
    // Eliminierung: Rückgabe = Gleichgewicht-Faktor; heilt und stärkt nebenbei
    onKill: function (p) {
      if (!p || p.dead) return 1;
      if (n(p, "gastfreundschaft")) p.hp = Math.min(p.hpMax, p.hp + n(p, "gastfreundschaft"));
      if (n(p, "ehre")) p.honor = (p.honor || 0) + 0.25;
      return 1 + 0.1 * n(p, "dankbarkeit");
    },
    // Wellenende: ohne Schaden durchgekommen?
    onWaveEnd: function (p) { if (!p.hitWave && n(p, "pflichtbewusstsein")) p.duty = (p.duty || 0) + n(p, "pflichtbewusstsein"); p.hitWave = false; },
    // kurze Liste für das HUD
    list: function (p) { return Object.keys(p.perks || {}).map(function (id) { return SZ.perk.name(id) + (p.perks[id] > 1 ? " ×" + p.perks[id] : ""); }); }
  };
})();
