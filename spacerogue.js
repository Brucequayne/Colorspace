/* Space Rogue 0.1 – Schiffseditor und Testflug. Für Color Space.
   Top-down wie FTL, modulare Bauteile wie Space Engineers. Alles läuft im Browser.
   Raster: 1 Zelle = 2,5 m. Vorne ist oben (−y). Drehung r: 0…3 im Uhrzeigersinn, f: gespiegelt. */
(function () {
  "use strict";

  var VERSION = "0.46";
  var CELL_M = 2.5, PX = 24;              // Meter je Zelle, Pixel je Zelle bei Zoom 1
  var lang = "de";
  function L2(de, en) { return { de: de, en: en }; }
  function t(k) { var v = TX[k]; return v ? v[lang] : k; }
  function fmt(s, o) { return s.replace(/\{(\w+)\}/g, function (m, k) { return o[k] !== undefined ? o[k] : m; }); }
  function nf(v, d) { return Number(v).toLocaleString(lang === "de" ? "de-DE" : "en-GB", { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }

  var TX = {
    back: L2("Apps", "Apps"), title: L2("Space Rogue", "Space Rogue"),
    catLA: L2("Panzerung leicht", "Light armour"), catHA: L2("Panzerung schwer", "Heavy armour"), catCo: L2("Cockpit", "Cockpit"),
    catTh: L2("Antrieb und Steuerung", "Propulsion"), catEn: L2("Energie", "Power"), catIn: L2("Innenraum", "Interior"), catWe: L2("Waffen", "Weapons"),
    tBuild: L2("Bauen", "Build"), tErase: L2("Abreißen", "Remove"), tPaint: L2("Malen", "Paint"),
    rot: L2("Drehen (R)", "Rotate (R)"), flip: L2("Spiegeln (F)", "Flip (F)"), sym: L2("Symmetrie (M)", "Symmetry (M)"), axis: L2("Achse", "Axis"), symIn: L2("im Block", "through block"), symGap: L2("zwischen Blöcken", "between blocks"),
    vIn: L2("Innen", "Interior"), vOut: L2("Außen", "Exterior"), view: L2("Ansicht (V)", "View (V)"),
    undo: L2("Rückgängig", "Undo"), clear: L2("Leeren", "Clear"), starter: L2("Beispielschiff", "Sample ship"),
    test: L2("Schiff testen", "Test ship"), toEd: L2("Zurück zum Editor", "Back to editor"),
    dir: L2("FLUGRICHTUNG", "FORWARD"),
    sMass: L2("Masse", "Mass"), sThr: L2("Schub und Beschleunigung", "Thrust and acceleration"),
    dF: L2("Vorwärts", "Forward"), dB: L2("Rückwärts", "Backward"), dL: L2("Links", "Left"), dR: L2("Rechts", "Right"),
    sGyro: L2("Drehung", "Rotation"), sEn: L2("Energie", "Power"), sProd: L2("Erzeugung", "Generation"), sStore: L2("Speicher", "Storage"), sUse: L2("Verbrauch bei Volllast", "Use at full load"),
    sRooms: L2("Räume", "Rooms"), sBlocks: L2("Blöcke", "Blocks"),
    wNoCock: L2("Kein Cockpit: ohne Cockpit kann niemand fliegen.", "No cockpit: nobody can fly without one."),
    wNoGyro: L2("Kein Gyroskop: das Schiff kann sich nicht drehen.", "No gyroscope: the ship cannot rotate."),
    wNoThr: L2("Keine Triebwerke für: {d}", "No thrusters for: {d}"),
    wLeak: L2("{n} Raum/Räume undicht: dort kann man nicht atmen.", "{n} room(s) leaking: no air to breathe."),
    wLoose: L2("{n} Block/Blöcke nicht verbunden (rot markiert).", "{n} block(s) not connected (marked red)."),
    wNoPow: L2("Keine Energiequelle: Batterie oder Reaktor einbauen.", "No power source: add a battery or reactor."),
    okRooms: L2("{n} Raum/Räume luftdicht", "{n} room(s) airtight"), noRooms: L2("Keine Innenräume", "No interior rooms"),
    hintEd: L2("Linksklick bauen, Ziehen baut Reihen · Rechtsklick abreißen · R drehen · F spiegeln · M Symmetrie (aus, im Block, zwischen Blöcken) · V Innen/Außen · Mausrad zoomt · Mitte/Leertaste + Ziehen verschiebt", "Left click build, drag for rows · right click remove · R rotate · F flip · M symmetry · V interior/exterior · wheel zooms · middle/space + drag pans"),
    hintFl: L2("Im Sitz: WASD fliegen · Q/E drehen · Umschalt gibt Hochgeschwindigkeit über 120 m/s frei (erlischt unter 120 m/s) · Linksklick feuern · R Waffe · Z Trägheitsdämpfer · C Cruise (kein Selbstbremsen) · X Overcharge · Raketen lenken leicht zum Mauszeiger · Zu Fuß: WASD laufen · Linksklick schweißen und Hologramme neu aufbauen · F aussteigen/hinsetzen · Durch eine Luke ins All: WASD Jetpack (kostet Anzugluft), Umschalt gleicht ans Schiff an · Gegner spawnen links im Feld, Antennen zeigen sie als rote Dreiecke am Rand · V Innen/Außen · Rechtsklick: Block beschädigen (Test) · Esc Editor", "Seated: WASD fly · Q/E rotate · Shift unlocks high speed above 120 m/s (expires below 120 m/s) · left click fire · R weapon · Z inertia dampers · C cruise (no auto-braking) · X overcharge · missiles steer gently toward the cursor · On foot: WASD walk · left click weld and rebuild holograms · F get up/sit down · Through a hatch into space: WASD jetpack (uses suit air), Shift matches the ship · Spawn enemies in the panel on the left, antennas show them as red triangles at the edge · V interior/exterior · right click: damage block (test) · Esc editor"),
    noCockTest: L2("Zum Testen braucht das Schiff ein Cockpit.", "The ship needs a cockpit to be tested."),
    cruise: L2("Cruise-Modus", "Cruise mode"), cruiseOn: L2("Cruise an: Das Schiff bremst nicht mehr von selbst, seitlich bleibt der Kurs stabil", "Cruise on: the ship no longer brakes by itself, sideways the course stays stable"), cruiseOff: L2("Cruise aus: Die Dämpfer bremsen wieder in alle Richtungen", "Cruise off: dampers brake in all directions again"),
    hiSpeed: L2("Hohe Geschwindigkeit", "High speed"),
    hiOn: L2("Hochgeschwindigkeit frei", "High speed unlocked"), hiOff: L2("Hochgeschwindigkeit gesperrt", "High speed locked"),
    invT: L2("Inventar · Perks", "Inventory · Perks"), invSub: L2("Spiel pausiert · Klick aktiviert oder deaktiviert einen Perk · I oder Esc schließt", "Game paused · click to activate or deactivate a perk · I or Esc closes"),
    invActive: L2("{n} von {m} aktiv", "{n} of {m} active"), perksBtn: L2("Perks (I)", "Perks (I)"), sCost: L2("Kosten", "Cost"), costFree: L2("im Editor kostenlos", "free in the editor"),
    ocOn: L2("Overcharge aktiv", "Overcharge active"), ocOff: L2("Overcharge aus", "Overcharge off"), controls: L2("Steuerung", "Controls"),
    crFloatOn: L2("Cruise Control an", "Cruise control on"), crFloatOff: L2("Cruise Control aus", "Cruise control off"),
    hSeat: L2("Im Cockpit", "In cockpit"), hWalk: L2("Zu Fuß", "On foot"), hOut: L2("Draußen · Jetpack", "Outside · jetpack"), hGone: L2("Cockpit zerstört", "Cockpit destroyed"),
    hWeldIdle: L2("Linksklick: reparieren", "Left click: repair"), hiBadge: L2("Hoch", "High"), limBadge: L2("⇧ Limit", "⇧ limit"),
    hiLbl: L2("Hochgeschwindigkeit", "High speed"), hiFree: L2("frei", "unlocked"), hiLock: L2("gesperrt (120 m/s)", "locked (120 m/s)"),
    damp: L2("Trägheitsdämpfer", "Inertia dampers"), on: L2("an", "on"), off: L2("aus", "off"),
    speed: L2("Tempo", "Speed"), energy: L2("Energie", "Power"), weapon: L2("Waffe", "Weapon"), none: L2("keine", "none"),
    seated: L2("Im Cockpit", "In cockpit"), unseated: L2("Nicht im Cockpit · F zum Hinsetzen", "Not in cockpit · F to sit down"),
    cockGone: L2("Cockpit zerstört · Steuerung verloren", "Cockpit destroyed · control lost"),
    noPower: L2("Keine Energie", "No power"), mg: L2("Minigun", "Minigun"), rg: L2("Railgun", "Railgun"), ms: L2("Leichte Raketen", "Light missiles"),
    targets: L2("Ziele neu", "Reset targets"), exitSeat: L2("Aussteigen (F)", "Get up (F)"), sitDown: L2("Hinsetzen (F)", "Sit down (F)"),
    walking: L2("Zu Fuß · F am Sitz zum Hinsetzen", "On foot · F at the seat to sit down"), tooFar: L2("Zu weit vom Sitz entfernt", "Too far from the seat"),
    air: L2("Luft", "Air"), airRoom: L2("Raumluft", "Cabin air"), airSuit: L2("Anzug", "Suit"), airJet: L2("Anzug · Jetpack", "Suit · jetpack"),
    airOut: L2("Die Anzugluft ist ausgegangen: Neustart im Cockpit.", "Suit air ran out: restarting in the cockpit."),
    evaOn: L2("Draußen · Jetpack · Umschalt gleicht ans Schiff an", "Outside · jetpack · Shift matches the ship"), outside: L2("Über einer Luke F drücken, um einzusteigen", "Press F above a hatch to get in"),
    weldBuild: L2("baut {n} wieder auf", "rebuilding {n}"), weldWait: L2("{n}: erst den Nachbarblock aufbauen", "{n}: rebuild the neighbouring block first"),
    hangar: L2("NPC-Schiffe", "NPC ships"), hangarH: L2("Baupläne für spätere KI-Gegner. Noch ohne KI: hier lassen sie sich ansehen und in den Editor laden.", "Blueprints for future AI enemies. No AI yet: view them here and load them into the editor."),
    load: L2("In den Editor laden", "Load into editor"), clsS: L2("Klein", "Small"), clsM: L2("Mittel", "Medium"), clsL: L2("Groß", "Large"),
    fleeT: L2("Der Feind versucht zu entkommen", "The enemy is trying to escape"),
    shield: L2("Schild", "Shield"), shNoGen: L2("Kein Schildgenerator verbaut: die Reserve fängt nichts ab", "No shield generator installed: the reserve absorbs nothing"), shFill: L2("Schild mit dem eingestellten Anteil neu aufladen", "Recharge the shield to the set share"),
    destroyed: L2("Zerstört", "Destroyed"), kills: L2("Abschüsse", "Kills"), shCharged: L2("Schilde aufgeladen", "Shields charged"),
    spawn: L2("Gegner spawnen", "Spawn enemy"), spawned: L2("{n} patrouilliert irgendwo vor dir", "{n} is patrolling somewhere ahead of you"), ko: L2("Kampfunfähig", "Disabled"),
    weld: L2("Schweißgerät", "Welder"), weldOn: L2("repariert {n}: {p} %", "repairing {n}: {p} %"), weldIdle: L2("Linksklick vor einem Block repariert ihn, vor einem Hologramm baut er ihn neu", "Left click facing a block repairs it, facing a hologram rebuilds it"),
    sDim: L2("Abmessungen", "Dimensions"), sCool: L2("Kühlung", "Cooling"), sCoolW: L2("Gekühlt", "Cooled"), weap: L2("Waffen", "weapons"), thrs: L2("Triebwerke", "thrusters"), sCom: L2("Schwerpunkt", "Centre of mass"), comHint: L2("gelb-schwarzer Kreis", "yellow-black circle"),
    roomCells: L2("{n} Felder", "{n} cells"), color: L2("Farbe", "Colour"), placeHint: L2("Erster Block: frei platzieren", "First block: place anywhere")
  };

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
     ["hlf", "half", 1, 1, L2("Halb 1×1", "Half 1×1"), 0.5]].forEach(function (a) {
      def(pre + a[0], { cat: heavy ? "catHA" : "catLA", kind: "armor", shape: a[1], w: a[2], h: a[3], mass: Math.round(m * a[5] * 100) / 100, hp: Math.round(hp * Math.max(0.6, a[5])), col: col, heavy: heavy,
        n: L2(a[4].de + " " + nm.de, a[4].en + " " + nm.en) });
    });
  }
  armor("l", false); armor("h", true);
  // Kosten in Credits (Cr): im Editor ist alles gratis, im späteren Rogue-like-Modus bezahlt man damit Bau-Upgrades zwischen den Stages
  var COSTS = { cks: 1200, ckm: 2400, ckl: 4200, ckt: 700, ths: 450, thf: 650, shs: 1400, shl: 3800, thl: 1600, gyr: 700, col: 300, ant: 400, bat: 350, rea: 2000, flo: 15, wal: 25, dor: 60, hat: 150, win: 40, mgn: 900, msl: 1300, tgc: 1600, rgn: 2600 };
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
  def("tgc", { cat: "catWe", kind: "tcomp", w: 1, h: 2, mass: 0.8, hp: 45, n: L2("Zielcomputer 1×2", "Targeting computer 1×2"), col: "#7E8995" });
  def("rgn", { cat: "catWe", kind: "rg", w: 1, h: 3, mass: 3.8, hp: 120, n: L2("Railgun 1×3", "Railgun 1×3"), col: "#7E8995" });
  applyCosts();
  // ---------- Perks ----------
  // Seltenheit: gewöhnlich (silber) bekommt den kleinsten Wert der Spanne, legendär (gold) den größten, selten und episch liegen bei 1/3 und 2/3
  var RAR = [
    { n: L2("Gewöhnlich", "Common"), col: "#C3CAD3", rgb: "195,202,211", w: 60 },
    { n: L2("Selten", "Rare"), col: "#4EA3FF", rgb: "78,163,255", w: 27 },
    { n: L2("Episch", "Epic"), col: "#B26BFF", rgb: "178,107,255", w: 10 },
    { n: L2("Legendär", "Legendary"), col: "#F2C14E", rgb: "242,193,78", w: 3 }
  ];
  var PERKS = [
    { id: "side", lo: 20, hi: 100, n: L2("Seitenschub", "Side thrust"), d: L2("Seitliche Triebwerke: +{v} Schub", "Side thrusters: +{v} thrust") },
    { id: "brake", lo: 20, hi: 100, n: L2("Bremskraft", "Braking power"), d: L2("Bremsschub in jede Richtung: +{v}", "Braking thrust in every direction: +{v}") },
    { id: "mgRate", lo: 20, hi: 50, n: L2("Minigun-Feuerrate", "Minigun fire rate"), d: L2("Minigun feuert {v} schneller", "Minigun fires {v} faster") },
    { id: "batCap", lo: 10, hi: 50, n: L2("Batteriespeicher", "Battery storage"), d: L2("Batterien speichern {v} mehr Energie", "Batteries store {v} more energy") },
    { id: "luck", lo: 10, hi: 25, n: L2("Glücksfund", "Lucky find"), d: L2("Chance auf legendäre Perks: +{v}", "Chance of legendary perks: +{v}") },
    { id: "msRl", lo: 20, hi: 75, n: L2("Raketen-Nachladen", "Missile reload"), d: L2("Raketen laden {v} schneller nach", "Missiles reload {v} faster") },
    { id: "hp", lo: 10, hi: 40, n: L2("Verstärkte Struktur", "Reinforced structure"), d: L2("Alle Blöcke: +{v} HP", "All blocks: +{v} HP") },
    { id: "prod", lo: 10, hi: 50, n: L2("Reaktor-Tuning", "Reactor tuning"), d: L2("Reaktor-Output: +{v}", "Reactor output: +{v}") },
    { id: "walk", fixed: 1, n: L2("Flinke Füße", "Quick feet"), d: L2("Dein Charakter läuft im Schiff doppelt so schnell", "Your character moves twice as fast inside ships"), tag: "2×" },
    { id: "radar", lo: 25, hi: 100, n: L2("Radarreichweite", "Radar range"), d: L2("Antennenreichweite: +{v}", "Antenna range: +{v}") },
    { id: "oc", lo: 25, hi: 100, n: L2("Overcharge-Dauer", "Overcharge duration"), d: L2("Overcharge hält {v} länger", "Overcharge lasts {v} longer") },
    { id: "msDmg", lo: 10, hi: 50, n: L2("Raketenschaden", "Missile damage"), d: L2("Leichte Raketen: +{v} Schaden", "Light missiles: +{v} damage") },
    { id: "cockHp", lo: 10, hi: 50, n: L2("Gepanzertes Cockpit", "Armoured cockpit"), d: L2("Cockpit: +{v} HP", "Cockpit: +{v} HP") },
    { id: "msTurn", lo: 10, hi: 100, n: L2("Raketenlenkung", "Missile steering"), d: L2("Leichte Raketen: +{v} Kurvenleistung", "Light missiles: +{v} turning") },
    { id: "crit", lo: 1, hi: 10, n: L2("Kritische Treffer", "Critical hits"), d: L2("Minigun: {v} Chance auf kritische Treffer (doppelter Schaden)", "Minigun: {v} chance of critical hits (double damage)") },
    { id: "batW", fixed: 1, legOnly: true, n: L2("Schwerelose Zellen", "Weightless cells"), d: L2("Deine Batterien wiegen nichts mehr", "Your batteries weigh nothing"), tag: "0 kg" },
    { id: "heavyW", lo: 20, hi: 50, n: L2("Leichtbau-Panzerung", "Lightweight plating"), d: L2("Schwere Panzerung wiegt {v} weniger", "Heavy armour weighs {v} less") }
  ];
  var PM = {};   // Summe der aktiven Perk-Werte (als Anteil, 0,2 = 20 %)
  function perkVal(p, r) { return p.fixed ? p.fixed : Math.round(p.lo + (p.hi - p.lo) * r / 3); }
  function perkTxt(p, r) { return p.d[lang].replace("{v}", perkVal(p, r) + " %"); }
  function perkTag(p, r) { return p.tag || "+" + perkVal(p, r) + " %"; }
  function calcPM(inv) {
    var m = {}; PERKS.forEach(function (p) { m[p.id] = 0; });
    (inv || []).forEach(function (it) { if (!it.on) return; var p = PERKS[it.p]; m[p.id] += p.fixed ? 1 : perkVal(p, it.r) / 100; });
    m.walk = m.walk > 0; m.batW = m.batW > 0; m.heavyW = Math.min(0.9, m.heavyW);
    return m;
  }
  PM = calcPM([]);
  CATS = ["catLA", "catHA", "catCo", "catTh", "catEn", "catIn", "catWe"];
  var MECH = { cock: 1, thr: 1, gyro: 1, ant: 1, bat: 1, reac: 1, door: 1, hatch: 1, mg: 1, rg: 1, cool: 1, ms: 1, tcomp: 1, shield: 1 };
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
    if (k === "mg" || k === "rg" || k === "ant" || k === "ms") return { c: last && d !== 0, s: true };   // nur am hinteren Ende
    if (k === "cock") return { c: true, s: true };                         // auch vorne an der Kanzel lässt sich anbauen
    return { c: true, s: true };
  }

  // ---------- Geometrie eines Blocks ----------
  function fp(b) { var ty = T[b.t]; return b.r % 2 ? [ty.h, ty.w] : [ty.w, ty.h]; }
  function cellOf(b, lx, ly) {   // lokale Zelle → Schiffszelle
    var ty = T[b.t], w = ty.w, h = ty.h, x = b.f ? w - 1 - lx : lx, y = ly;
    for (var i = 0; i < b.r; i++) { var nx = h - 1 - y, ny = x; x = nx; y = ny; var tw = w; w = h; h = tw; }
    return [b.x + x, b.y + y];
  }
  function dirOut(b, d) { if (b.f && (d === 1 || d === 3)) d = 4 - d; return (d + b.r) % 4; }
  function dirIn(b, d) { d = (d - b.r + 4) % 4; if (b.f && (d === 1 || d === 3)) d = 4 - d; return d; }
  function key(x, y) { return x + "," + y; }
  function buildMap(blocks) {
    var M = new Map();
    blocks.forEach(function (b) { var ty = T[b.t]; for (var ly = 0; ly < ty.h; ly++) for (var lx = 0; lx < ty.w; lx++) { var c = cellOf(b, lx, ly); M.set(key(c[0], c[1]), { b: b, lx: lx, ly: ly }); } });
    return M;
  }
  function cellsOf(b) { var ty = T[b.t], out = []; for (var ly = 0; ly < ty.h; ly++) for (var lx = 0; lx < ty.w; lx++) out.push({ c: cellOf(b, lx, ly), lx: lx, ly: ly }); return out; }
  // Verbindung zwischen zwei Blöcken über eine gemeinsame Kante
  function linked(M, b) {
    var out = [];
    cellsOf(b).forEach(function (q) {
      for (var d = 0; d < 4; d++) {
        var nx = q.c[0] + DV[d][0], ny = q.c[1] + DV[d][1], o = M.get(key(nx, ny));
        if (!o || o.b === b) continue;
        var a = edgeRule(T[b.t], q.lx, q.ly, dirIn(b, d)).c, c = edgeRule(T[o.b.t], o.lx, o.ly, dirIn(o.b, (d + 2) % 4)).c;
        if (a && c && out.indexOf(o.b) < 0) out.push(o.b);
      }
    });
    return out;
  }
  function components(blocks) {
    var M = buildMap(blocks), seen = new Set(), comps = [];
    blocks.forEach(function (b) {
      if (seen.has(b)) return;
      var comp = [], st = [b]; seen.add(b);
      while (st.length) { var x = st.pop(); comp.push(x); linked(M, x).forEach(function (o) { if (!seen.has(o)) { seen.add(o); st.push(o); } }); }
      comps.push(comp);
    });
    return comps;
  }
  // Räume: zusammenhängende Boden-, Tür-, Luken- und Cockpitzellen, dicht wenn jede Außenkante abgedichtet ist.
  // Cockpit und geschlossene Luken dichten selbst nach außen ab; eine offene Luke ist ein Leck.
  var ROOMK = { floor: 1, door: 1, hatch: 1, cock: 1 };
  function rooms(blocks, M) {
    M = M || buildMap(blocks); var seen = new Set(), out = [];
    M.forEach(function (v, k) {
      var kd = T[v.b.t].kind; if (!ROOMK[kd] || seen.has(k)) return;
      var cells = [], leaks = [], st = [k]; seen.add(k);
      while (st.length) {
        var kk = st.pop(), p = kk.split(","), x = +p[0], y = +p[1], me = M.get(kk), mk = T[me.b.t].kind; cells.push([x, y]);
        if (mk === "hatch" && me.b.open) leaks.push([x, y, 0]);   // offene Luke (auch in der Decke) lässt die Luft raus
        for (var d = 0; d < 4; d++) {
          var nx = x + DV[d][0], ny = y + DV[d][1], nk = key(nx, ny), o = M.get(nk);
          if (!o) { if (mk === "cock" || mk === "hatch") continue; leaks.push([x, y, d]); continue; }
          var ok = T[o.b.t].kind;
          // Cockpits sind links, rechts und vorne geschlossen; kleine öffnen sich nach hinten, große haben hinten eine Schiebetür (eigener Raum)
          if (mk === "cock" && o.b !== me.b && !(T[me.b.t].h < 4 && d === dirOut(me.b, 2))) continue;
          if (ok === "cock" && o.b !== me.b && !(T[o.b.t].h < 4 && (d + 2) % 4 === dirOut(o.b, 2))) continue;
          // Maschinen gehören nur zum Raum, wenn sie an Boden stehen; außen ans Cockpit gebaute bleiben draußen
          if (ROOMK[ok] || (ROOMABLE[ok] && mk !== "cock")) { if (!seen.has(nk)) { seen.add(nk); st.push(nk); } continue; }
          if (!edgeRule(T[o.b.t], o.lx, o.ly, dirIn(o.b, (d + 2) % 4)).s) leaks.push([x, y, d]);
        }
      }
      out.push({ cells: cells, leaks: leaks, ok: !leaks.length });
    });
    return out;
  }

  // Kühlung: aneinandergereihte Kühlblöcke bilden ein Netz. Jedes Teil, das irgendwo am Netz anliegt,
  // bekommt die Kühlleistung aller Blöcke dieses Netzes (mehrere Netze zählen zusammen).
  function coolMap(blocks, M) {
    M = M || buildMap(blocks);
    var nets = new Map(), out = new Map(), id = 0;
    blocks.forEach(function (b) {
      if (T[b.t].kind !== "cool" || nets.has(b)) return;
      var net = [], st = [b]; nets.set(b, id);
      while (st.length) { var x = st.pop(); net.push(x); for (var d = 0; d < 4; d++) { var o = M.get(key(x.x + DV[d][0], x.y + DV[d][1])); if (o && T[o.b.t].kind === "cool" && !nets.has(o.b)) { nets.set(o.b, id); st.push(o.b); } } }
      var touched = new Set();
      net.forEach(function (x) { for (var d = 0; d < 4; d++) { var o = M.get(key(x.x + DV[d][0], x.y + DV[d][1])); if (o && T[o.b.t].kind !== "cool") touched.add(o.b); } });
      touched.forEach(function (tb) { out.set(tb, (out.get(tb) || 0) + net.length); });
      id++;
    });
    return out;
  }
  function ocMaxOf(blocks, cm) {   // Overcharge-Dauer: 3 s, jeder Kühlblock an einem Triebwerk verlängert
    var n = 0, seen = new Set(); blocks.forEach(function (b) { if (T[b.t].kind === "thr" && cm.get(b)) { if (!seen.has(cm.get(b) + ":" + b.x)) n = Math.max(n, cm.get(b)); } });
    return 3 + 0.8 * n;
  }
  // ---------- Werte eines Schiffs ----------
  function thrustDir(b) { return dirOut(b, 0); }     // Schub zeigt zur Montageseite, Düse nach hinten
  // Masse eines Blocks; Perks können sie für das eigene Schiff senken (Batterien, schwere Panzerung)
  function massOf(ty, mod) {
    if (!mod) return ty.mass;
    if (ty.kind === "bat" && mod.batW) return 0;
    if (ty.kind === "armor" && ty.heavy && mod.heavyW) return ty.mass * Math.max(0, 1 - mod.heavyW);
    return ty.mass;
  }
  function stats(blocks, mod) {
    var s = { mass: 0, thr: [0, 0, 0, 0], torque: 0, cap: 0, prod: 0, use: 0, n: blocks.length, cock: 0, gyro: 0, com: [0, 0], I: 0, mg: 0, rg: 0, ms: 0 };
    blocks.forEach(function (b) {
      var ty = T[b.t], f = fp(b), cx = b.x + f[0] / 2, cy = b.y + f[1] / 2;
      var ms = massOf(ty, mod); s.mass += ms; s.com[0] += cx * ms; s.com[1] += cy * ms; s.cost = (s.cost || 0) + (ty.cost || 0);
      if (ty.kind === "thr") { s.thr[thrustDir(b)] += ty.thrust; s.use += ty.use; }
      if (ty.kind === "gyro") { s.torque += ty.torque; s.gyro++; s.use += ty.use; }
      if (ty.kind === "bat") s.cap += ty.cap;
      if (ty.kind === "reac") s.prod += ty.prod;
      if (ty.kind === "cock") s.cock++;
      if (ty.kind === "mg") s.mg++;
      if (ty.kind === "rg") s.rg++;
      if (ty.kind === "ms") s.ms++;
    });
    if (s.mass) { s.com[0] /= s.mass; s.com[1] /= s.mass; } else if (blocks.length) { s.com = [blocks[0].x + 0.5, blocks[0].y + 0.5]; }
    blocks.forEach(function (b) {
      var ty = T[b.t], f = fp(b), dx = (b.x + f[0] / 2 - s.com[0]) * CELL_M, dy = (b.y + f[1] / 2 - s.com[1]) * CELL_M;
      s.I += massOf(ty, mod) * (dx * dx + dy * dy + (f[0] * f[0] + f[1] * f[1]) * CELL_M * CELL_M / 12);
    });
    return s;
  }

  // ---------- Zustand ----------
  var S = null, V = null, raf = 0, last = 0;
  var SAVE = "spacerogue-ship-v1";
  function freshState() {
    return { blocks: [], tool: "build", sel: "lblk", r: 0, f: 0, sym: false, symGap: false, view: "in", color: "#C8473A", undo: [], mode: "edit" };
  }
  function load() {
    S = freshState();
    try { var j = JSON.parse(localStorage.getItem(SAVE) || "null"); if (j && j.blocks) { S.blocks = j.blocks.filter(function (b) { return T[b.t]; }); if (j.color) S.color = j.color; if (j.symGap) S.symGap = true; } } catch (e) {}
    if (!S.blocks.length) S.blocks = starter();
  }
  function save() { try { localStorage.setItem(SAVE, JSON.stringify({ blocks: S.blocks.map(strip), color: S.color, symGap: !!S.symGap })); } catch (e) {} }
  function strip(b) { var o = { t: b.t, x: b.x, y: b.y, r: b.r, f: b.f }; if (b.c) o.c = b.c; return o; }
  function pushUndo() { S.undo.push(JSON.stringify(S.blocks.map(strip))); if (S.undo.length > 60) S.undo.shift(); }

  // Beispielschiff: Cockpit vorn, luftdichter Raum, Triebwerke in alle Richtungen, Gyroskop, Energie, Waffen
  function starter() {
    var B = [];
    function a(t, x, y, r, f, c) { B.push({ t: t, x: x, y: y, r: r || 0, f: f || 0, c: c }); }
    function m(t, x, y, r, c) { var ty = T[t], w = (r % 2 ? ty.h : ty.w); a(t, x, y, r, 0, c); a(t, 1 - x - w, y, (4 - r) % 4, 1, c); }
    a("ckm", -1, -6, 0);
    for (var y = -6; y <= 3; y++) m(y === -1 ? "win" : (y <= -4 ? "hblk" : "lblk"), -2, y, 0);
    for (var x = -1; x <= 1; x++) { a("flo", x, -2); a("flo", x, -1); a("lblk", x, 1); }
    a("gyr", -1, 0); a("bat", 0, 0); a("bat", 1, 0);
    a("rea", -1, 2); a("lblk", 1, 2); a("lblk", 1, 3);
    m("thl", -2, 4, 0); a("ths", 0, 4, 0);
    m("ths", -2, -8, 2);
    for (y = -4; y <= 1; y++) m("lblk", -3, y, 0, y % 2 ? "#C8473A" : undefined);
    for (y = -2; y <= 0; y++) m("lblk", -4, y, 0, "#C8473A");
    m("mgn", -3, -6, 0); m("rgn", -4, -5, 0);
    m("ths", -6, 0, 1);
    m("lrmp", -3, 2, 2); m("lrmp", -4, 1, 2);
    m("col", -3, 4, 0); m("col", -3, 5, 0);
    m("msl", -1, -8, 0);
    // Luken nach außen: an der Stelle der Fenster, davor bleibt eine Lücke in der Seitenpanzerung
    B = B.filter(function (b) { return !(b.y === -1 && (b.x === -3 || b.x === 3 || b.x === -4 || b.x === 4)); });
    B.forEach(function (b) { if (b.t === "win") b.t = "hat"; });
    return B;
  }

  // ---------- Editor: Platzieren ----------
  function ghostAt(cx, cy, tid, r, f) {
    var ty = T[tid], w = r % 2 ? ty.h : ty.w, h = r % 2 ? ty.w : ty.h;
    return { t: tid, x: cx - Math.floor((w - 1) / 2), y: cy - Math.floor((h - 1) / 2), r: r, f: f };
  }
  // Zwei Achsen: im Block (Mitte von Spalte 0, für ungerade Breiten wie das 3er-Cockpit) oder zwischen Blöcken (zwischen Spalte −1 und 0, für gerade Breiten wie 2er-Blöcke)
  function symAx() { return S.symGap ? 0 : 0.5; }
  function mirrorOf(b) { var f = fp(b); return { t: b.t, x: 2 * symAx() - b.x - f[0], y: b.y, r: (4 - b.r) % 4, f: 1 - b.f, c: b.c }; }
  function canPlace(b, M, extra) {
    var cs = cellsOf(b);
    for (var i = 0; i < cs.length; i++) { var k = key(cs[i].c[0], cs[i].c[1]); if (M.has(k) && !replaceable(b.t, M.get(k))) return false; if (extra && extra.has(k)) return false; }
    if (!S.blocks.length && !extra) return true;
    return linked(M, b).length > 0 || (extra && extra.size > 0 && linkedTo(M, b, extra));
  }
  function linkedTo(M, b, extraMap) { var M2 = new Map(M); extraMap.forEach(function (v, k) { M2.set(k, v); }); return linked(M2, b).length > 0; }
  function placeList(g) {
    var list = [g];
    if (S.sym) { var mg = mirrorOf(g); if (mg.x !== g.x || mg.r !== g.r || mg.f !== g.f) list.push(mg); }
    // Spiegelbild deckt sich mit dem Original: nur einmal setzen
    if (list.length === 2) { var a = new Set(cellsOf(list[0]).map(function (q) { return key(q.c[0], q.c[1]); })); if (cellsOf(list[1]).some(function (q) { return a.has(key(q.c[0], q.c[1])); })) list.pop(); }
    return list;
  }
  function tryPlace(g, noUndo) {
    var M = buildMap(S.blocks), list = placeList(g), first = S.blocks.length === 0;
    var okA = first || canPlace(list[0], M);
    if (!okA) return false;
    var extra = new Map(); cellsOf(list[0]).forEach(function (q) { extra.set(key(q.c[0], q.c[1]), { b: list[0], lx: q.lx, ly: q.ly }); });
    var okB = list[1] ? canPlaceWith(list[1], M, extra) : false;
    if (!noUndo) pushUndo();
    var put = [list[0]]; if (list[1] && okB) put.push(list[1]);
    // Böden unter dem neuen Teil werden ersetzt
    var under = new Set(); put.forEach(function (q) { cellsOf(q).forEach(function (c) { under.add(key(c.c[0], c.c[1])); }); });
    if (T[g.t].kind !== "floor") S.blocks = S.blocks.filter(function (q) { return !(T[q.t].kind === "floor" && under.has(key(q.x, q.y))); });
    put.forEach(function (q) { S.blocks.push(clean(q)); });
    save(); return true;
  }
  // Reihe: vom Startfeld in Zugrichtung (waagerecht oder senkrecht), Abstand = Größe des Teils
  function rowList() {
    var R0 = V.row; if (!R0) return [];
    var ty = T[S.sel], fw = S.r % 2 ? ty.h : ty.w, fh = S.r % 2 ? ty.w : ty.h, dx = R0.ex - R0.sx, dy = R0.ey - R0.sy, out = [];
    var horiz = Math.abs(dx) >= Math.abs(dy), step = horiz ? fw : fh, n = Math.floor(Math.abs(horiz ? dx : dy) / step) + 1, sg = (horiz ? dx : dy) < 0 ? -1 : 1;
    for (var i = 0; i < Math.min(n, 60); i++) out.push(ghostAt(R0.sx + (horiz ? sg * step * i : 0), R0.sy + (horiz ? 0 : sg * step * i), S.sel, S.r, S.f));
    return out;
  }
  function placeRow() {
    var L = rowList(), n = 0; if (!L.length) return;
    pushUndo();
    for (var pass = 0; pass < 2; pass++) L.forEach(function (g) { if (!g.done && tryPlace(g, true)) { g.done = true; n++; } });   // zweiter Durchgang für Teile, die erst über Nachbarn Anschluss finden
    if (!n) { S.undo.pop(); if (S.blocks.length) note(lang === "de" ? "Hier passt der Block nicht oder hat keinen Anschluss." : "The block does not fit here or has no connection."); }
  }
  function canPlaceWith(b, M, extra) {
    var cs = cellsOf(b);
    for (var i = 0; i < cs.length; i++) { var k = key(cs[i].c[0], cs[i].c[1]); if ((M.has(k) && !replaceable(b.t, M.get(k))) || extra.has(k)) return false; }
    return linkedTo(M, b, extra);
  }
  function clean(b) { return { t: b.t, x: b.x, y: b.y, r: b.r, f: b.f }; }
  function blockAt(cx, cy, M) { var o = (M || buildMap(S.blocks)).get(key(cx, cy)); return o ? o.b : null; }
  // M schaltet durch: aus → im Block → zwischen Blöcken → aus
  function cycleSym() { if (!S.sym) { S.sym = true; S.symGap = false; } else if (!S.symGap) S.symGap = true; else S.sym = false; save(); }
  function mirrorCell(cx) { return S.symGap ? -1 - cx : -cx; }
  function eraseAt(cx, cy) {
    var M = buildMap(S.blocks), b = blockAt(cx, cy, M); if (!b) return false;
    pushUndo();
    var kill = [b]; if (S.sym) { var o = blockAt(mirrorCell(cx), cy, M); if (o && o !== b) kill.push(o); }
    S.blocks = S.blocks.filter(function (q) { return kill.indexOf(q) < 0; }); save(); return true;
  }
  function paintAt(cx, cy) {
    var M = buildMap(S.blocks), b = blockAt(cx, cy, M); if (!b) return false;
    var list = [b]; if (S.sym) { var o = blockAt(mirrorCell(cx), cy, M); if (o && o !== b) list.push(o); }
    if (list.every(function (q) { return q.c === S.color; })) return false;
    pushUndo(); list.forEach(function (q) { q.c = S.color; }); save(); return true;
  }

  // ---------- Zeichnen der Blöcke ----------
  var GLASS = "#5FB4D9", GLASS2 = "#9FD8EE", DARK = "#2A2F36", MID = "#4A525C", LIGHT = "#C9D1D9", FLOOR = "#B9BEC4", FLOOR2 = "#A9AFB6", ACC = "#E3B83F";
  function shade(hex, k) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    function f(v) { return Math.max(0, Math.min(255, Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k)))); }
    return "rgb(" + f(r) + "," + f(g) + "," + f(b) + ")";
  }
  function shapePath(c, sh, w, h) {
    c.beginPath();
    if (sh === "ramp1" || sh === "ramp2" || sh === "ramp3") { c.moveTo(0, 0); c.lineTo(0, h); c.lineTo(w, h); c.closePath(); }
    else if (sh === "round") { c.moveTo(0, 0); c.arc(0, h, w, -Math.PI / 2, 0); c.lineTo(0, h); c.closePath(); }
    else if (sh === "half") c.rect(0, h / 2, w, h / 2);
    else c.rect(0, 0, w, h);
  }
  // b: Block, s: Pixel je Zelle, view: "in"/"out", dmg: Anteil Leben (0…1)
  function drawBlock(c, b, s, view, hpk, tm, opts) {
    var ty = T[b.t], f = fp(b), w = ty.w * s, h = ty.h * s, k = ty.kind;
    c.save();
    c.translate((b.x + f[0] / 2) * s, (b.y + f[1] / 2) * s);
    c.rotate(b.r * Math.PI / 2); if (b.f) c.scale(-1, 1);
    if (opts && opts.tw) { c.translate(0, h / 2); c.rotate(b.f ? -opts.tw : opts.tw); c.translate(0, -h / 2); }   // Geschütz schwenkt um sein hinteres Ende
    c.translate(-w / 2, -h / 2);
    var col = b.c || ty.col, lw = Math.max(1, s / 16), dam = hpk !== undefined && hpk <= 0.5;
    c.lineJoin = "miter";
    if (k === "armor" || k === "win") {
      if (k === "win") { c.fillStyle = shade(col, -0.15); c.fillRect(0, 0, w, h); c.fillStyle = GLASS; c.fillRect(w * 0.18, h * 0.18, w * 0.64, h * 0.64); c.fillStyle = GLASS2; c.fillRect(w * 0.22, h * 0.22, w * 0.2, h * 0.56); }
      else {
        shapePath(c, ty.shape, w, h); c.fillStyle = col; c.fill();
        c.save(); c.clip();
        c.fillStyle = shade(col, 0.22); c.fillRect(0, 0, w, lw * 2); c.fillRect(0, 0, lw * 2, h);
        c.fillStyle = shade(col, -0.25); c.fillRect(0, h - lw * 2, w, lw * 2); c.fillRect(w - lw * 2, 0, lw * 2, h);
        if (ty.heavy) { c.fillStyle = shade(col, -0.18); c.fillRect(w * 0.3, h * 0.3, w * 0.4, h * 0.4); c.fillStyle = shade(col, 0.1); c.fillRect(w * 0.34, h * 0.34, w * 0.32, h * 0.32); }
        c.restore();
      }
      shapePath(c, k === "win" ? "full" : ty.shape, w, h); c.strokeStyle = shade(col, -0.5); c.lineWidth = lw; c.stroke();
      if (dam) damageMarks(c, w, h, b, s, ty.shape);
    } else if (k === "floor" || k === "wall" || k === "door") {
      if (view === "out") { roof(c, w, h, col, lw); }
      else if (k === "floor") { c.fillStyle = FLOOR; c.fillRect(0, 0, w, h); c.strokeStyle = FLOOR2; c.lineWidth = lw; c.strokeRect(lw / 2, lw / 2, w - lw, h - lw); c.fillStyle = FLOOR2; c.fillRect(w * 0.45, h * 0.45, w * 0.1, h * 0.1); }
      else if (k === "wall") { c.fillStyle = shade(col, -0.35); c.fillRect(0, 0, w, h); c.fillStyle = shade(col, -0.15); c.fillRect(w * 0.15, 0, w * 0.7, h); c.strokeStyle = shade(col, -0.55); c.lineWidth = lw; c.strokeRect(lw / 2, lw / 2, w - lw, h - lw); }
      else { c.fillStyle = FLOOR; c.fillRect(0, 0, w, h); c.fillStyle = shade(col, -0.3); c.fillRect(0, 0, w * 0.12, h); c.fillRect(w * 0.88, 0, w * 0.12, h); c.fillStyle = "#D9A21B"; c.fillRect(w * 0.12, h * 0.38, w * 0.37, h * 0.24); c.fillRect(w * 0.51, h * 0.38, w * 0.37, h * 0.24); c.fillStyle = DARK; c.fillRect(w * 0.49, h * 0.38, w * 0.02, h * 0.24); }
      if (k === "door" && view === "out") { c.fillStyle = "#D9A21B"; c.fillRect(w * 0.42, h * 0.1, w * 0.16, h * 0.8); }
    } else if (k === "hatch") {
      hatchArt(c, w, h, col, lw, view, opts && opts.open);
    } else if (k === "cock") {
      c.fillStyle = col; c.fillRect(0, 0, w, h);
      c.fillStyle = shade(col, -0.3); c.fillRect(0, h - lw * 2, w, lw * 2); c.fillRect(0, 0, lw * 2, h); c.fillRect(w - lw * 2, 0, lw * 2, h);
      var tiny = ty.w === 1, cw = w - s * 0.5, ch = s * (tiny ? 0.95 : ty.h > 3 ? 1.6 : 1.2);
      if (tiny) {   // 1×2: Kanzel füllt die vordere Zelle, dahinter ein schmaler Sitz
        c.fillStyle = GLASS; c.beginPath(); c.moveTo(s * 0.16, ch); c.lineTo(s * 0.16, s * 0.4); c.lineTo(w / 2, s * 0.08); c.lineTo(w - s * 0.16, s * 0.4); c.lineTo(w - s * 0.16, ch); c.closePath(); c.fill();
        c.fillStyle = GLASS2; c.beginPath(); c.moveTo(s * 0.26, ch * 0.88); c.lineTo(s * 0.26, s * 0.44); c.lineTo(w / 2 - s * 0.06, s * 0.22); c.lineTo(w / 2 - s * 0.06, ch * 0.88); c.closePath(); c.fill();
        if (view === "in") {
          c.fillStyle = FLOOR; c.fillRect(s * 0.16, ch + lw, w - s * 0.32, h - ch - s * 0.16);
          var tx2 = w / 2, ty2 = s * 1.45; c.fillStyle = "#5A3E2B"; c.fillRect(tx2 - s * 0.26, ty2 - s * 0.26, s * 0.52, s * 0.52); c.fillStyle = "#7A5A40"; c.fillRect(tx2 - s * 0.19, ty2 - s * 0.18, s * 0.38, s * 0.36);
          if (opts && opts.pilot) drawAstronaut(c, tx2, ty2 - s * 0.05, -Math.PI / 2, 0, s / 24, false);
        } else { c.fillStyle = shade(col, -0.12); c.fillRect(s * 0.16, ch + lw, w - s * 0.32, h - ch - s * 0.2); }
        c.strokeStyle = shade(col, -0.55); c.lineWidth = lw; c.strokeRect(lw / 2, lw / 2, w - lw, h - lw);
        if (dam) damageMarks(c, w, h, b, s, "full");
        c.restore(); return;
      }
      var bigCk = ty.h >= 4;
      c.fillStyle = GLASS; c.beginPath(); c.moveTo(s * 0.25, ch); c.lineTo(s * 0.25, s * 0.45); c.lineTo(w / 2, s * 0.08); c.lineTo(w - s * 0.25, s * 0.45); c.lineTo(w - s * 0.25, ch); c.closePath(); c.fill();
      c.fillStyle = GLASS2; c.beginPath(); c.moveTo(s * 0.4, ch * 0.9); c.lineTo(s * 0.4, s * 0.5); c.lineTo(w / 2 - s * 0.1, s * 0.25); c.lineTo(w / 2 - s * 0.1, ch * 0.9); c.closePath(); c.fill();
      if (view === "in") {
        c.fillStyle = FLOOR; c.fillRect(s * 0.25, ch + lw, cw, h - ch - s * 0.35);
        c.fillStyle = MID; c.fillRect(s * 0.4, ch + lw, cw - s * 0.3, s * 0.28);
        c.fillStyle = "#57D18A"; c.fillRect(s * 0.6, ch + lw * 2, s * 0.3, s * 0.12); c.fillStyle = ACC; c.fillRect(w - s * 0.9, ch + lw * 2, s * 0.3, s * 0.12);
        var sx = w / 2, sy = ch + s * 0.95; c.fillStyle = "#5A3E2B"; c.fillRect(sx - s * 0.32, sy - s * 0.3, s * 0.64, s * 0.62); c.fillStyle = "#7A5A40"; c.fillRect(sx - s * 0.24, sy - s * 0.2, s * 0.48, s * 0.4);
        if (opts && opts.pilot) drawAstronaut(c, sx, sy - s * 0.05, -Math.PI / 2, 0, s / 24, false);
      } else { c.fillStyle = shade(col, -0.12); c.fillRect(s * 0.25, ch + lw, cw, h - ch - s * 0.35); c.strokeStyle = shade(col, -0.35); c.lineWidth = lw; for (var gy = ch + s * 0.6; gy < h - s * 0.4; gy += s * 0.7) { c.beginPath(); c.moveTo(s * 0.25, gy); c.lineTo(w - s * 0.25, gy); c.stroke(); } }
      c.strokeStyle = shade(col, -0.55); c.lineWidth = lw; c.strokeRect(lw / 2, lw / 2, w - lw, h - lw);
      if (dam) damageMarks(c, w, h, b, s, "full");
    } else if (k === "thr") {
      c.fillStyle = shade(col, -0.1); c.fillRect(w * 0.08, 0, w * 0.84, h * 0.62);
      c.fillStyle = shade(col, 0.2); c.fillRect(w * 0.08, 0, w * 0.84, lw * 2);
      c.fillStyle = MID; c.beginPath(); c.moveTo(w * 0.16, h * 0.6); c.lineTo(w * 0.84, h * 0.6); c.lineTo(w * 0.96, h); c.lineTo(w * 0.04, h); c.closePath(); c.fill();
      c.fillStyle = DARK; c.beginPath(); c.moveTo(w * 0.24, h * 0.66); c.lineTo(w * 0.76, h * 0.66); c.lineTo(w * 0.86, h * 0.97); c.lineTo(w * 0.14, h * 0.97); c.closePath(); c.fill();
      c.fillStyle = "rgba(120,200,255,.9)"; c.fillRect(w * 0.3, h * 0.9, w * 0.4, h * 0.05);
      c.fillStyle = b.c ? b.c : ACC; c.fillRect(w * 0.2, h * 0.2, w * 0.6, h * 0.08);
      c.strokeStyle = shade(col, -0.55); c.lineWidth = lw; c.strokeRect(w * 0.08, 0, w * 0.84, h * 0.62);
    } else if (k === "gyro") {
      c.fillStyle = shade(col, -0.15); c.fillRect(0, 0, w, h);
      c.strokeStyle = LIGHT; c.lineWidth = lw * 1.4; c.beginPath(); c.arc(w / 2, h / 2, w * 0.32, 0, Math.PI * 2); c.stroke();
      var ga = tm * 3; c.strokeStyle = b.c || ACC; c.beginPath(); c.moveTo(w / 2 + Math.cos(ga) * w * 0.3, h / 2 + Math.sin(ga) * h * 0.3); c.lineTo(w / 2 - Math.cos(ga) * w * 0.3, h / 2 - Math.sin(ga) * h * 0.3); c.stroke();
      c.fillStyle = DARK; c.fillRect(w * 0.44, h * 0.44, w * 0.12, h * 0.12);
      c.strokeStyle = shade(col, -0.55); c.lineWidth = lw; c.strokeRect(lw / 2, lw / 2, w - lw, h - lw);
    } else if (k === "bat") {
      c.fillStyle = shade(col, -0.1); c.fillRect(0, 0, w, h);
      c.fillStyle = DARK; c.fillRect(w * 0.2, h * 0.15, w * 0.6, h * 0.7);
      var lv = opts && opts.batK !== undefined ? opts.batK : 1; c.fillStyle = lv < 0.2 ? "#E0533F" : "#57D18A"; c.fillRect(w * 0.26, h * 0.21 + h * 0.58 * (1 - lv), w * 0.48, h * 0.58 * lv);
      c.fillStyle = b.c || ACC; c.fillRect(w * 0.38, h * 0.06, w * 0.24, h * 0.09);
      c.strokeStyle = shade(col, -0.55); c.lineWidth = lw; c.strokeRect(lw / 2, lw / 2, w - lw, h - lw);
    } else if (k === "reac") {
      c.fillStyle = shade(col, -0.2); c.fillRect(0, 0, w, h);
      c.fillStyle = shade(col, 0.05); c.fillRect(w * 0.08, h * 0.08, w * 0.84, h * 0.84);
      var pulse = 0.6 + 0.4 * Math.sin(tm * 4);
      c.fillStyle = DARK; c.beginPath(); c.arc(w / 2, h / 2, w * 0.3, 0, Math.PI * 2); c.fill();
      c.fillStyle = "rgba(90,220,255," + (0.55 + 0.35 * pulse) + ")"; c.beginPath(); c.arc(w / 2, h / 2, w * 0.18, 0, Math.PI * 2); c.fill();
      c.fillStyle = b.c || ACC; [[0.12, 0.12], [0.8, 0.12], [0.12, 0.8], [0.8, 0.8]].forEach(function (q) { c.fillRect(w * q[0], h * q[1], w * 0.08, h * 0.08); });
      c.strokeStyle = shade(col, -0.55); c.lineWidth = lw; c.strokeRect(lw / 2, lw / 2, w - lw, h - lw);
    } else if (k === "cool") {
      c.fillStyle = shade(col, -0.2); c.fillRect(0, 0, w, h);
      c.fillStyle = "#2E4A5E"; c.fillRect(w * 0.12, h * 0.12, w * 0.76, h * 0.76);
      c.fillStyle = "#8FD3F2"; for (var fi = 0; fi < 4; fi++) c.fillRect(w * 0.18, h * (0.2 + fi * 0.17), w * 0.64, h * 0.07);
      c.fillStyle = b.c || "#5FB4D9"; c.fillRect(w * 0.44, 0, w * 0.12, h * 0.12); c.fillRect(w * 0.44, h * 0.88, w * 0.12, h * 0.12); c.fillRect(0, h * 0.44, w * 0.12, h * 0.12); c.fillRect(w * 0.88, h * 0.44, w * 0.12, h * 0.12);
      c.strokeStyle = shade(col, -0.55); c.lineWidth = lw; c.strokeRect(lw / 2, lw / 2, w - lw, h - lw);
    } else if (k === "shield") {
      // Schildgenerator: Gehäuse mit Emitterring, der sanft blau pulsiert
      c.fillStyle = shade(col, -0.2); c.fillRect(0, 0, w, h);
      var sr2 = Math.min(w, h) * 0.34, scx = w / 2, scy = h / 2, pu = 0.55 + 0.45 * Math.sin(tm * 2.4 + b.x);
      var sg = c.createRadialGradient(scx, scy, 0, scx, scy, sr2 * 1.25); sg.addColorStop(0, "rgba(120,190,255," + (0.55 * pu) + ")"); sg.addColorStop(1, "rgba(120,190,255,0)");
      c.fillStyle = sg; c.fillRect(0, 0, w, h);
      c.strokeStyle = "#8EC5FF"; c.lineWidth = lw * 1.5; c.beginPath(); c.arc(scx, scy, sr2, 0, Math.PI * 2); c.stroke();
      c.strokeStyle = shade(col, 0.25); c.lineWidth = lw; c.beginPath(); c.arc(scx, scy, sr2 * 0.55, 0, Math.PI * 2); c.stroke();
      c.fillStyle = "#DDEEFF"; c.beginPath(); c.arc(scx, scy, sr2 * 0.18, 0, Math.PI * 2); c.fill();
      c.fillStyle = shade(col, -0.45); [[0.12, 0.12], [0.88, 0.12], [0.12, 0.88], [0.88, 0.88]].forEach(function (q) { c.fillRect(w * q[0] - lw, h * q[1] - lw, lw * 2, lw * 2); });
      c.strokeStyle = shade(col, -0.55); c.lineWidth = lw; c.strokeRect(lw / 2, lw / 2, w - lw, h - lw);
    } else if (k === "tcomp") {
      // Zielcomputer: Gehäuse mit Bildschirm, Fadenkreuz und kreisendem Suchstrich
      c.fillStyle = col; c.fillRect(0, 0, w, h);
      c.fillStyle = shade(col, -0.35); c.fillRect(w * 0.12, h * 0.08, w * 0.76, h * 0.5);
      var cx2 = w / 2, cy2 = h * 0.33, rr = Math.min(w * 0.3, h * 0.2);
      c.fillStyle = "#0F2A1E"; c.beginPath(); c.arc(cx2, cy2, rr, 0, Math.PI * 2); c.fill();
      c.strokeStyle = "#57D18A"; c.lineWidth = lw; c.beginPath(); c.arc(cx2, cy2, rr * 0.6, 0, Math.PI * 2); c.moveTo(cx2 - rr, cy2); c.lineTo(cx2 + rr, cy2); c.moveTo(cx2, cy2 - rr); c.lineTo(cx2, cy2 + rr); c.stroke();
      c.strokeStyle = "rgba(87,209,138,.8)"; c.beginPath(); c.moveTo(cx2, cy2); c.lineTo(cx2 + Math.cos(tm * 3) * rr, cy2 + Math.sin(tm * 3) * rr); c.stroke();
      c.fillStyle = shade(col, -0.2); for (var ti = 0; ti < 3; ti++) c.fillRect(w * 0.2, h * (0.68 + ti * 0.09), w * 0.6, lw * 1.4);
      c.fillStyle = Math.sin(tm * 4) > 0 ? "#E3B83F" : "#6E5A20"; c.fillRect(w * 0.72, h * 0.66, w * 0.12, w * 0.12);
      c.strokeStyle = shade(col, -0.55); c.lineWidth = lw; c.strokeRect(lw / 2, lw / 2, w - lw, h - lw);
    } else if (k === "ant") {
      c.fillStyle = shade(col, -0.1); c.fillRect(w * 0.1, h - s, w * 0.8, s);
      c.fillStyle = LIGHT; c.fillRect(w * 0.44, h * 0.08, w * 0.12, h - s);
      c.fillRect(w * 0.2, h * 0.3, w * 0.6, lw * 1.5); c.fillRect(w * 0.28, h * 0.5, w * 0.44, lw * 1.5);
      c.fillStyle = Math.sin(tm * 5) > 0 ? "#E0533F" : "#7A2A20"; c.fillRect(w * 0.42, h * 0.04, w * 0.16, w * 0.16);
      c.strokeStyle = shade(col, -0.55); c.lineWidth = lw; c.strokeRect(w * 0.1, h - s, w * 0.8, s);
    } else if (k === "mg") {
      c.fillStyle = shade(col, -0.1); c.fillRect(w * 0.12, h - s, w * 0.76, s);
      c.fillStyle = b.c || "#8C4A3A"; c.fillRect(w * 0.2, h - s * 0.85, w * 0.6, s * 0.5);
      c.fillStyle = DARK; [0.3, 0.5, 0.7].forEach(function (q) { c.fillRect(w * q - w * 0.06, h * 0.06, w * 0.12, h - s * 0.9); });
      c.fillStyle = MID; c.fillRect(w * 0.18, h * 0.42, w * 0.64, s * 0.14);
      c.strokeStyle = shade(col, -0.55); c.lineWidth = lw; c.strokeRect(w * 0.12, h - s, w * 0.76, s);
    } else if (k === "ms") {
      c.fillStyle = shade(col, -0.12); c.fillRect(w * 0.08, h * 0.3, w * 0.84, h * 0.7);
      c.fillStyle = b.c || "#8C4A3A"; c.fillRect(w * 0.14, h - s * 0.55, w * 0.72, s * 0.35);
      [0.3, 0.7].forEach(function (q) { c.fillStyle = DARK; c.fillRect(w * q - w * 0.15, h * 0.06, w * 0.3, h * 0.55); var ready = (opts && opts.ammo !== undefined ? opts.ammo : 2) > (q < 0.5 ? 1 : 0); c.fillStyle = ready ? "#E9ECEE" : "#4A525C"; c.beginPath(); c.moveTo(w * q, h * 0.08); c.lineTo(w * q + w * 0.09, h * 0.2); c.lineTo(w * q - w * 0.09, h * 0.2); c.closePath(); c.fill(); if (ready) { c.fillStyle = "#C8473A"; c.fillRect(w * q - w * 0.09, h * 0.2, w * 0.18, h * 0.06); } });
      c.strokeStyle = shade(col, -0.55); c.lineWidth = lw; c.strokeRect(w * 0.08, h * 0.3, w * 0.84, h * 0.7);
    } else if (k === "rg") {
      c.fillStyle = shade(col, -0.15); c.fillRect(w * 0.08, h - s * 1.2, w * 0.84, s * 1.2);
      c.fillStyle = b.c || "#3E6F96"; c.fillRect(w * 0.16, h - s * 1.05, w * 0.68, s * 0.5);
      c.fillStyle = DARK; c.fillRect(w * 0.22, h * 0.04, w * 0.18, h - s * 1.1); c.fillRect(w * 0.6, h * 0.04, w * 0.18, h - s * 1.1);
      var chg = opts && opts.charge ? opts.charge : 0;
      c.fillStyle = "rgba(120,220,255," + (0.25 + chg * 0.75) + ")"; c.fillRect(w * 0.42, h * 0.08, w * 0.16, h - s * 1.15);
      c.strokeStyle = shade(col, -0.55); c.lineWidth = lw; c.strokeRect(w * 0.08, h - s * 1.2, w * 0.84, s * 1.2);
    }
    if (k === "cock" && ty.h >= 4 && view === "in") {
      // große Cockpits: hinten eine Wand mit Schiebetür, dadurch ein eigener, abgeschlossener Raum
      var wy = h - s * 0.16, dw = w * 0.34, dx0 = (w - dw) / 2, op = opts && opts.ckOpen ? Math.min(1, opts.ckOpen) : 0;
      c.fillStyle = shade(col, -0.25); c.fillRect(0, wy, dx0, s * 0.16); c.fillRect(dx0 + dw, wy, w - dx0 - dw, s * 0.16);
      c.fillStyle = "#D9A21B"; c.fillRect(dx0 - dw * 0.5 * op, wy + s * 0.04, dw / 2, s * 0.08); c.fillRect(dx0 + dw / 2 + dw * 0.5 * op, wy + s * 0.04, dw / 2, s * 0.08);
      c.strokeStyle = shade(col, -0.55); c.lineWidth = lw; c.strokeRect(0, wy, w, s * 0.16);
    }
    if (dam && MECH[k] && k !== "cock") damageMarks(c, w, h, b, s, "full");
    c.restore();
  }
  // Luke: gelb-schwarzer Warnrahmen, geschlossen mit Schott, offen sieht man ins All
  function hatchArt(c, w, h, col, lw, view, open) {
    if (view === "out") roof(c, w, h, col, lw); else { c.fillStyle = FLOOR; c.fillRect(0, 0, w, h); }
    var b = w * 0.16;
    c.save(); c.beginPath(); c.rect(0, 0, w, h); c.rect(b, b, w - b * 2, h - b * 2); c.clip("evenodd");
    c.fillStyle = "#24282E"; c.fillRect(0, 0, w, h); c.fillStyle = "#E3B83F";
    for (var i = -2; i < 6; i++) { c.beginPath(); c.moveTo(i * w * 0.25, 0); c.lineTo(i * w * 0.25 + w * 0.125, 0); c.lineTo(i * w * 0.25 + w * 0.125 + h, h); c.lineTo(i * w * 0.25 + h, h); c.closePath(); c.fill(); }
    c.restore();
    if (open) { c.fillStyle = "#06080C"; c.fillRect(b, b, w - b * 2, h - b * 2); c.fillStyle = "rgba(255,255,255,.7)"; c.fillRect(w * 0.3, h * 0.4, lw, lw); c.fillRect(w * 0.62, h * 0.66, lw, lw); }
    else { c.fillStyle = shade(col, -0.12); c.fillRect(b, b, w - b * 2, h - b * 2); c.strokeStyle = shade(col, -0.45); c.lineWidth = lw; c.beginPath(); c.moveTo(b, h / 2); c.lineTo(w - b, h / 2); c.stroke(); c.fillStyle = shade(col, -0.35); c.fillRect(w * 0.42, h * 0.3, w * 0.16, h * 0.4); }
  }
  // Astronaut von oben: Helm mit Visier, Schultern, Rucksack, Arme und Füße bewegen sich beim Laufen
  function drawAstronaut(c, x, y, face, ph, sc, weld) {
    var sw = Math.sin(ph), cw = Math.cos(ph);
    c.save(); c.translate(x, y); c.rotate(face); c.scale(sc, sc);
    c.fillStyle = "rgba(0,0,0,.25)"; c.beginPath(); c.ellipse(1, 1.5, 7, 9.5, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#3A3F46"; c.beginPath(); c.ellipse(sw * 4.2, -3.6, 3.2, 2.1, 0, 0, Math.PI * 2); c.fill(); c.beginPath(); c.ellipse(-sw * 4.2, 3.6, 3.2, 2.1, 0, 0, Math.PI * 2); c.fill();
    c.save(); c.rotate(sw * 0.18);
    c.fillStyle = "#8C96A0"; c.fillRect(-8.5, -4.5, 4, 9);
    c.fillStyle = "#E3E7EA"; c.beginPath(); c.ellipse(0, 0, 4.6, 8.2, 0, 0, Math.PI * 2); c.fill(); c.strokeStyle = "#9AA3AD"; c.lineWidth = 0.8; c.stroke();
    c.fillStyle = "#E0743A"; c.beginPath(); c.arc(-0.5, -7.2, 2.2, 0, Math.PI * 2); c.fill(); c.beginPath(); c.arc(-0.5, 7.2, 2.2, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#D5DADF"; c.beginPath(); c.arc(1.5 - sw * 3.2, -8.8, 1.8, 0, Math.PI * 2); c.fill();
    var hx = weld ? 6.5 : 1.5 + sw * 3.2, hy = weld ? 4.5 : 8.8; c.beginPath(); c.arc(hx, hy, 1.8, 0, Math.PI * 2); c.fill();
    if (weld) { c.fillStyle = "#3A3F46"; c.fillRect(6, 3.4, 5, 2.2); var g = 0.6 + 0.4 * Math.random(); c.fillStyle = "rgba(150,220,255," + g + ")"; c.beginPath(); c.arc(11.8, 4.5, 1.6 + Math.random(), 0, Math.PI * 2); c.fill(); }
    c.restore();
    c.fillStyle = "#F4F6F8"; c.beginPath(); c.arc(0.6, 0, 4.4, 0, Math.PI * 2); c.fill(); c.strokeStyle = "#9AA3AD"; c.lineWidth = 0.7; c.stroke();
    c.fillStyle = "#3E6F96"; c.beginPath(); c.ellipse(2.6, 0, 2, 3.2, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = "rgba(255,255,255,.55)"; c.fillRect(2.4, -2, 0.9, 1.6);
    void cw;
    c.restore();
  }
  function roof(c, w, h, col, lw) {
    c.fillStyle = shade(col, 0.08); c.fillRect(0, 0, w, h);
    c.strokeStyle = shade(col, -0.2); c.lineWidth = lw; c.strokeRect(lw / 2, lw / 2, w - lw, h - lw);
    c.fillStyle = shade(col, -0.12); c.fillRect(w * 0.2, h * 0.2, lw * 1.5, lw * 1.5); c.fillRect(w * 0.75, h * 0.75, lw * 1.5, lw * 1.5);
  }
  // Beschädigt: leichte Beulen und Risse (Zufall aus der Blockposition, damit es stabil bleibt)
  function damageMarks(c, w, h, b, s, sh) {
    var sd = (Math.abs(b.x * 73856093 ^ b.y * 19349663 ^ b.t.length * 83492791) % 997) / 997, v = Math.floor(sd * 4);
    c.save(); shapePath(c, sh || "full", w, h); c.clip();
    c.translate(w / 2, h / 2); c.rotate(v * Math.PI / 2); if (sd > 0.5) c.scale(-1, 1); c.translate(-w / 2, -h / 2);
    // Beule: leicht abgedunkelte, eingedrückte Ecke mit heller Kante
    c.fillStyle = "rgba(10,12,16,.22)"; c.beginPath(); c.moveTo(w * 0.55, 0); c.lineTo(w, 0); c.lineTo(w, h * 0.42); c.quadraticCurveTo(w * 0.72, h * 0.28, w * 0.55, 0); c.fill();
    c.strokeStyle = "rgba(255,255,255,.22)"; c.lineWidth = Math.max(0.6, s / 30); c.beginPath(); c.moveTo(w * 0.55, 0); c.quadraticCurveTo(w * 0.72, h * 0.28, w, h * 0.42); c.stroke();
    // zwei feine Risse
    c.strokeStyle = "rgba(14,15,18,.6)"; c.lineWidth = Math.max(0.6, s / 28);
    c.beginPath(); c.moveTo(w * (0.2 + sd * 0.15), h * 0.62); c.lineTo(w * 0.36, h * 0.5); c.lineTo(w * 0.44, h * 0.56); c.lineTo(w * 0.58, h * 0.44);
    c.moveTo(w * 0.36, h * 0.5); c.lineTo(w * 0.33, h * 0.36);
    c.stroke();
    c.restore();
  }

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

  // ---------- Editor zeichnen ----------
  function edDraw() {
    var c = V.ctx, W = V.W, H = V.H, z = V.zoom, s = PX * z;
    drawSpace(c, W, H, V.cam.x * s, V.cam.y * s);
    c.save(); c.translate(W / 2 - V.cam.x * s, H / 2 - V.cam.y * s);
    // Raster
    var x0 = Math.floor(V.cam.x - W / 2 / s) - 1, x1 = Math.ceil(V.cam.x + W / 2 / s) + 1, y0 = Math.floor(V.cam.y - H / 2 / s) - 1, y1 = Math.ceil(V.cam.y + H / 2 / s) + 1;
    c.strokeStyle = "rgba(120,150,190,.10)"; c.lineWidth = 1; c.beginPath();
    for (var gx = x0; gx <= x1; gx++) { c.moveTo(gx * s + 0.5, y0 * s); c.lineTo(gx * s + 0.5, y1 * s); }
    for (var gy = y0; gy <= y1; gy++) { c.moveTo(x0 * s, gy * s + 0.5); c.lineTo(x1 * s, gy * s + 0.5); }
    c.stroke();
    if (S.sym) { c.strokeStyle = "rgba(227,184,63,.6)"; c.setLineDash([6, 6]); c.lineWidth = 2; c.beginPath(); c.moveTo(symAx() * s, y0 * s); c.lineTo(symAx() * s, y1 * s); c.stroke(); c.setLineDash([]); }
    var tm = performance.now() / 1000, M = buildMap(S.blocks);
    // Räume einfärben (Innenansicht)
    var R = rooms(S.blocks);
    drawShip(c, S.blocks, s, S.view, tm, null, M);
    if (S.view === "in") R.forEach(function (rm) {
      c.fillStyle = rm.ok ? "rgba(90,190,255,.16)" : "rgba(224,83,63,.22)";
      rm.cells.forEach(function (q) { c.fillRect(q[0] * s, q[1] * s, s, s); });
      c.strokeStyle = "#E0533F"; c.lineWidth = Math.max(2, s / 8);
      rm.leaks.forEach(function (q) { var x = q[0] * s, y = q[1] * s; c.beginPath(); if (q[2] === 0) { c.moveTo(x, y); c.lineTo(x + s, y); } else if (q[2] === 1) { c.moveTo(x + s, y); c.lineTo(x + s, y + s); } else if (q[2] === 2) { c.moveTo(x, y + s); c.lineTo(x + s, y + s); } else { c.moveTo(x, y); c.lineTo(x, y + s); } c.stroke(); });
    });
    // lose Blöcke rot markieren
    var comps = components(S.blocks); if (comps.length > 1) {
      var main = comps.reduce(function (a, b) { return mainScore(b) > mainScore(a) ? b : a; });
      c.strokeStyle = "#E0533F"; c.lineWidth = 2;
      comps.forEach(function (cp) { if (cp === main) return; cp.forEach(function (b) { var f = fp(b); c.strokeRect(b.x * s + 1, b.y * s + 1, f[0] * s - 2, f[1] * s - 2); }); });
    }
    // Schwerpunkt
    if (S.blocks.length) {
      var stc = stats(S.blocks), mx = stc.com[0] * s, my = stc.com[1] * s, rr = Math.max(7, s * 0.38);
      c.fillStyle = "#151715"; c.beginPath(); c.arc(mx, my, rr, 0, Math.PI * 2); c.fill();
      c.fillStyle = "#E3B83F"; c.beginPath(); c.moveTo(mx, my); c.arc(mx, my, rr, -Math.PI / 2, 0); c.closePath(); c.fill(); c.beginPath(); c.moveTo(mx, my); c.arc(mx, my, rr, Math.PI / 2, Math.PI); c.closePath(); c.fill();
      c.strokeStyle = "#E3B83F"; c.lineWidth = 1.5; c.beginPath(); c.arc(mx, my, rr, 0, Math.PI * 2); c.stroke();
    }
    // Flugrichtung
    var bb = bounds(S.blocks), ax = bb ? (bb.x0 + bb.x1) / 2 : 0.5, ay = bb ? bb.y0 - 1.6 : -3;
    c.fillStyle = "rgba(227,184,63,.9)"; c.beginPath(); c.moveTo(ax * s, (ay - 1.2) * s); c.lineTo((ax - 0.7) * s, ay * s); c.lineTo((ax + 0.7) * s, ay * s); c.closePath(); c.fill();
    c.fillStyle = "rgba(227,184,63,.9)"; c.font = "700 " + Math.max(10, 0.45 * s) + "px " + FONTS(); c.textAlign = "center"; c.fillText(t("dir"), ax * s, (ay + 0.7) * s);
    // Vorschau
    if (V.mouse && !V.pan) {
      var cx = Math.floor(V.mouse.x), cy = Math.floor(V.mouse.y);
      if (S.tool === "build") {
        var ghosts = V.row ? rowList() : [ghostAt(cx, cy, S.sel, S.r, S.f)];
        ghosts.forEach(function (g, gi) {
          var list = placeList(g), ok = !S.blocks.length || canPlace(g, M) || (V.row && gi > 0);
          list.forEach(function (q, i) {
            c.globalAlpha = 0.6; drawBlock(c, q, s, S.view, 1, tm); c.globalAlpha = 1;
            var f = fp(q); c.strokeStyle = ok ? "#57D18A" : "#E0533F"; c.lineWidth = 2; c.strokeRect(q.x * s, q.y * s, f[0] * s, f[1] * s);
            if (i === 0 && gi === 0) arrowFor(c, q, s);
          });
        });
        if (V.row && ghosts.length > 1) { c.fillStyle = "#57D18A"; c.font = "700 13px " + FONTS(); c.textAlign = "left"; c.fillText("× " + ghosts.length, (ghosts[ghosts.length - 1].x + 1.4) * s, (ghosts[ghosts.length - 1].y + 0.7) * s); }
      } else {
        var hb = blockAt(cx, cy, M), list2 = hb ? [hb] : [];
        if (hb && S.sym) { var o = blockAt(mirrorCell(cx), cy, M); if (o && o !== hb) list2.push(o); }
        list2.forEach(function (q) { var f = fp(q); c.strokeStyle = S.tool === "erase" ? "#E0533F" : S.color; c.lineWidth = 3; c.strokeRect(q.x * s, q.y * s, f[0] * s, f[1] * s); });
        if (!hb) { c.strokeStyle = "rgba(255,255,255,.3)"; c.lineWidth = 1; c.strokeRect(cx * s, cy * s, s, s); }
      }
    }
    c.restore();
    // Infokasten zum Block unter dem Mauszeiger: Name, Gewicht, Leben
    if (V.mouse && !V.pan && !V.row) {
      var hb2 = blockAt(Math.floor(V.mouse.x), Math.floor(V.mouse.y), M);
      if (hb2) {
        var ty2 = T[hb2.t], txt = ty2.n[lang] + " · " + kg(ty2.mass) + " · " + ty2.hp + " HP · " + cr(ty2.cost);
        c.font = "600 12px " + FONTS(); var tw = c.measureText(txt).width + 16, tx = Math.min(V.W - tw - 6, V.mouse.sx + 16), ty3 = Math.min(V.H - 30, V.mouse.sy + 18);
        c.fillStyle = "rgba(14,19,28,.94)"; c.fillRect(tx, ty3, tw, 24); c.strokeStyle = "#33415A"; c.lineWidth = 1; c.strokeRect(tx + 0.5, ty3 + 0.5, tw - 1, 23);
        c.fillStyle = "#E6EAF0"; c.textAlign = "left"; c.textBaseline = "middle"; c.fillText(txt, tx + 8, ty3 + 12.5); c.textBaseline = "alphabetic";
      }
    }
  }
  function kg(t) { return nf(Math.round(t * 1000)) + " kg"; }
  function arrowFor(c, b, s) {   // zeigt bei Triebwerken die Schubrichtung, bei Waffen die Schussrichtung
    var ty = T[b.t]; if (ty.kind !== "thr" && ty.kind !== "mg" && ty.kind !== "rg" && ty.kind !== "ms") return;
    var d = dirOut(b, 0), f = fp(b), cx = (b.x + f[0] / 2) * s, cy = (b.y + f[1] / 2) * s, L = Math.max(f[0], f[1]) * s * 0.5 + s * 0.8;
    var dx = DV[d][0], dy = DV[d][1], ex = cx + dx * L, ey = cy + dy * L;
    c.strokeStyle = ty.kind === "thr" ? "#57D18A" : "#E0533F"; c.fillStyle = c.strokeStyle; c.lineWidth = 2;
    c.beginPath(); c.moveTo(cx, cy); c.lineTo(ex, ey); c.stroke();
    c.beginPath(); c.moveTo(ex + dx * 8, ey + dy * 8); c.lineTo(ex - dy * 6, ey + dx * 6); c.lineTo(ex + dy * 6, ey - dx * 6); c.closePath(); c.fill();
  }
  function mainScore(cp) { return cp.length + (cp.some(function (b) { return T[b.t].kind === "cock"; }) ? 1e5 : 0); }
  function bounds(bl) {
    if (!bl.length) return null; var o = { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 };
    bl.forEach(function (b) { var f = fp(b); o.x0 = Math.min(o.x0, b.x); o.y0 = Math.min(o.y0, b.y); o.x1 = Math.max(o.x1, b.x + f[0]); o.y1 = Math.max(o.y1, b.y + f[1]); });
    return o;
  }
  // Schiff: erst Innenleben, dann Aufbauten; Panzerung zuletzt, damit Kanten sauber liegen
  var ORDER = { floor: 0, door: 0, hatch: 0, wall: 1, cock: 2, bat: 2, reac: 2, gyro: 2, cool: 2, tcomp: 2, shield: 2, thr: 3, mg: 3, rg: 3, ms: 3, ant: 3, win: 4, armor: 4 };
  // Panzerung (und außen die Dächer) verschmilzt zu einer Hülle: Kanten nur dort, wo die Hülle endet
  function isHull(k, view) { return k === "armor" || k === "win" || (view === "out" && (k === "floor" || k === "wall" || k === "door" || k === "hatch")); }
  function drawShip(c, blocks, s, view, tm, body, M) {
    M = M || buildMap(blocks);
    var sorted = blocks.slice().sort(function (a, b) { return ORDER[T[a.t].kind] - ORDER[T[b.t].kind]; }), hull = [];
    sorted.forEach(function (b) {
      var ty = T[b.t], hpk = b.hp !== undefined ? b.hp / hpMax(body, b) : 1, o = null;
      if (isHull(ty.kind, view)) { hull.push(b); return; }
      if (body) o = { pilot: ty.kind === "cock" && body.ctrl && FL && FL.seated && b === body.seat, batK: body.cap ? body.energy / body.cap : 1, charge: b.chg ? Math.min(1, b.chg / RG.charge) : 0, ammo: b.ammo === undefined ? 2 : b.ammo, open: !!b.open, tw: b.tw || 0, ckOpen: b.ckOpen || 0 };
      drawBlock(c, b, s, view, hpk, tm, o);
    });
    hull.forEach(function (b) { hullFill(c, b, s, view, b.hp !== undefined ? b.hp / hpMax(body, b) : 1); });
    hull.forEach(function (b) { hullEdges(c, b, s, M, view); });
  }
  function hullFill(c, b, s, view, hpk) {
    var ty = T[b.t], f = fp(b), w = ty.w * s, h = ty.h * s, k = ty.kind, col = b.c || ty.col, lw = Math.max(1, s / 16);
    c.save(); c.translate((b.x + f[0] / 2) * s, (b.y + f[1] / 2) * s); c.rotate(b.r * Math.PI / 2); if (b.f) c.scale(-1, 1); c.translate(-w / 2, -h / 2);
    if (k === "armor") {
      shapePath(c, ty.shape, w, h); c.fillStyle = col; c.fill();
      if (ty.heavy && ty.shape === "full") { c.fillStyle = shade(col, -0.25); [[0.2, 0.2], [0.8, 0.2], [0.2, 0.8], [0.8, 0.8]].forEach(function (q) { c.fillRect(w * q[0] - lw, h * q[1] - lw, lw * 2, lw * 2); }); }
      c.strokeStyle = shade(col, -0.55); c.lineWidth = lw * 1.2; c.beginPath();
      if (ty.shape.indexOf("ramp") === 0) { c.moveTo(0, 0); c.lineTo(w, h); }
      else if (ty.shape === "round") c.arc(0, h, w, -Math.PI / 2, 0);
      else if (ty.shape === "half") { c.moveTo(0, h / 2); c.lineTo(w, h / 2); c.moveTo(0, h / 2); c.lineTo(0, h); c.moveTo(w, h / 2); c.lineTo(w, h); }
      c.stroke();
      if (ty.shape !== "full") {   // Lichtkante an der schrägen Seite
        c.strokeStyle = shade(col, 0.25); c.lineWidth = lw; c.beginPath();
        if (ty.shape.indexOf("ramp") === 0) { c.moveTo(lw * 1.4, lw * 3); c.lineTo(w - lw * 2.5, h - lw * 1.2); }
        else if (ty.shape === "round") c.arc(0, h, w - lw * 1.6, -Math.PI / 2 + 0.12, -0.12);
        c.stroke();
      }
      if (hpk <= 0.5) damageMarks(c, w, h, b, s, ty.shape);
    } else if (k === "win") {
      c.fillStyle = shade(col, -0.1); c.fillRect(0, 0, w, h); c.fillStyle = GLASS; c.fillRect(w * 0.18, h * 0.18, w * 0.64, h * 0.64); c.fillStyle = GLASS2; c.fillRect(w * 0.22, h * 0.22, w * 0.2, h * 0.56);
      if (hpk <= 0.5) damageMarks(c, w, h, b, s, "full");
    } else {
      c.fillStyle = shade(col, 0.06); c.fillRect(0, 0, w, h);
      if (k === "door") { c.fillStyle = "#D9A21B"; c.fillRect(w * 0.42, h * 0.12, w * 0.16, h * 0.76); }
      if (k === "hatch") hatchArt(c, w, h, col, lw, "out", b.open);
    }
    c.restore();
  }
  function hullEdges(c, b, s, M, view) {
    var ty = T[b.t], col = b.c || ty.col, lw = Math.max(1, s / 14), dark = shade(col, -0.55), lite = shade(col, 0.24), shd = shade(col, -0.28);
    cellsOf(b).forEach(function (q) {
      var x = q.c[0] * s, y = q.c[1] * s;
      for (var d = 0; d < 4; d++) {
        if (!edgeRule(ty, q.lx, q.ly, dirIn(b, d)).s && ty.kind === "armor") continue;
        var o = M.get(key(q.c[0] + DV[d][0], q.c[1] + DV[d][1]));
        if (o && o.b === b) continue;
        var merged = o && isHull(T[o.b.t].kind, view) && edgeRule(T[o.b.t], o.lx, o.ly, dirIn(o.b, (d + 2) % 4)).s;
        var e = d === 0 ? [x, y, x + s, y, 0, 1] : d === 1 ? [x + s, y, x + s, y + s, -1, 0] : d === 2 ? [x, y + s, x + s, y + s, 0, -1] : [x, y, x, y + s, 1, 0];
        if (merged) {   // Farbwechsel innerhalb der Hülle: feine Naht
          if ((d === 1 || d === 2) && (o.b.c || T[o.b.t].col) !== col) { c.strokeStyle = "rgba(0,0,0,.28)"; c.lineWidth = lw * 0.7; c.beginPath(); c.moveTo(e[0], e[1]); c.lineTo(e[2], e[3]); c.stroke(); }
          continue;
        }
        c.strokeStyle = d === 0 || d === 3 ? lite : shd; c.lineWidth = lw * 1.3; c.beginPath(); c.moveTo(e[0] + e[4] * lw * 1.6, e[1] + e[5] * lw * 1.6); c.lineTo(e[2] + e[4] * lw * 1.6, e[3] + e[5] * lw * 1.6); c.stroke();
        c.strokeStyle = dark; c.lineWidth = lw; c.beginPath(); c.moveTo(e[0] + e[4] * lw * 0.5, e[1] + e[5] * lw * 0.5); c.lineTo(e[2] + e[4] * lw * 0.5, e[3] + e[5] * lw * 0.5); c.stroke();
      }
    });
  }
  function FONTS() { return getComputedStyle(document.documentElement).getPropertyValue("--f-display") || "sans-serif"; }

  // ---------- Testflug ----------
  var FL = null, BID = 0, ZMIN_FL = 0.2, VMAX = 500, VHI = 120;
  var MG = { rate: 12, speed: 462, life: 1.48, dmg: 7, heat: 0.042, cool: 0.42, warn: 0.78, lock: 3.2, e: 0.4 };
  var MS = { v0: 30, acc: 420, vmax: 340, turn: 0.45, life: 4, dmg: 55, splash: 2.6, sdmg: 28, reload: 2.5, gap: 0.18, e: 6 };
  var RG = { charge: 0.7, cd: 2.2, dmg: 150, range: 700, e: 67.5 };   // v0.39: +50 % Energie pro Schuss
  // Anzugluft in Sekunden; Raumluft füllt sich in dichten Räumen auf und entweicht durch Lecks
  var SUIT = { max: 180, refill: 20, jet: 3, acc: 5, breathe: 0.35 }, AIR = { fill: 0.22, vent: 0.9 }, WELD = 15;
  // Maximale HP eines Blocks; Perks erhöhen sie für das eigene Schiff
  function hpMax(bd, b) { var h = T[b.t].hp; if (bd && bd.player) { h *= 1 + PM.hp; if (T[b.t].kind === "cock") h *= 1 + PM.cockHp; } return h; }
  function makeBody(blocks, ctrl) {
    var bd = { blocks: blocks, x: 0, y: 0, a: 0, vx: 0, vy: 0, w: 0, ctrl: !!ctrl, energy: 0, cap: 0, flames: {} };
    blocks.forEach(function (b) { if (b.hp === undefined) b.hp = T[b.t].hp; });
    recalc(bd, true);
    bd.energy = bd.cap;
    return bd;
  }
  function recalc(bd, first) {
    var pm = bd.player ? PM : null, st = stats(bd.blocks, pm), old = bd.com;
    bd.com = st.com; bd.mass = Math.max(0.5, st.mass); bd.I = Math.max(1, st.I); bd.thr = st.thr; bd.torque = st.torque; bd.prod = st.prod * (pm ? 1 + pm.prod : 1);
    bd.cap = st.cap * (pm ? 1 + pm.batCap : 1) + (st.cock ? 30 : 0);
    var shk = 0; bd.blocks.forEach(function (b) { if (T[b.t].kind === "shield") shk += T[b.t].shk; });
    bd.shGen = shk; bd.shEff = 1;   // Ladetempo in % der Kapazität pro Sekunde (klein 5, groß 25, addiert sich); 1 Energie je abgefangenem Schadenspunkt
    bd.shE = Math.min(bd.shE || 0, bd.cap); bd.energy = Math.min(bd.energy, bd.cap - bd.shE);
    bd.map = buildMap(bd.blocks); bd.roomsDirty = true;
    bd.cool = coolMap(bd.blocks, bd.map); bd.ocMax = ocMaxOf(bd.blocks, bd.cool) * (pm ? 1 + pm.oc : 1);
    bd.seat = bd.blocks.filter(function (b) { return T[b.t].kind === "cock"; })[0] || null;
    bd.cock = st.cock; bd.thrSum = st.thr[0] + st.thr[1] + st.thr[2] + st.thr[3]; bd.nAnt = bd.blocks.filter(function (b) { return T[b.t].kind === "ant"; }).length; bd.tcomp = bd.blocks.some(function (b) { return T[b.t].kind === "tcomp"; });
    bd.cells = []; bd.map.forEach(function (v, k) { var q = k.split(","); bd.cells.push([+q[0] + 0.5, +q[1] + 0.5, v.b]); });
    if (!bd.id) bd.id = ++BID;
    var r = 0; bd.blocks.forEach(function (b) { var f = fp(b); [[b.x, b.y], [b.x + f[0], b.y + f[1]]].forEach(function (p) { r = Math.max(r, Math.hypot(p[0] - bd.com[0], p[1] - bd.com[1])); }); }); bd.rad = r * CELL_M + 2;
    if (!first && old) { var dx = (bd.com[0] - old[0]) * CELL_M, dy = (bd.com[1] - old[1]) * CELL_M, ca = Math.cos(bd.a), sa = Math.sin(bd.a); bd.x += dx * ca - dy * sa; bd.y += dx * sa + dy * ca; }
  }
  function toWorld(bd, cx, cy) { var lx = (cx - bd.com[0]) * CELL_M, ly = (cy - bd.com[1]) * CELL_M, ca = Math.cos(bd.a), sa = Math.sin(bd.a); return { x: bd.x + lx * ca - ly * sa, y: bd.y + lx * sa + ly * ca }; }
  function toLocal(bd, x, y) { var dx = x - bd.x, dy = y - bd.y, ca = Math.cos(bd.a), sa = Math.sin(bd.a); return { x: (dx * ca + dy * sa) / CELL_M + bd.com[0], y: (-dx * sa + dy * ca) / CELL_M + bd.com[1] }; }
  function dirWorld(bd, d) { var v = DV[d], ca = Math.cos(bd.a), sa = Math.sin(bd.a); return { x: v[0] * ca - v[1] * sa, y: v[0] * sa + v[1] * ca }; }
  function blockCenter(bd, b) { var f = fp(b); return toWorld(bd, b.x + f[0] / 2, b.y + f[1] / 2); }

  function startTest() {
    var st = stats(S.blocks);
    if (!st.cock) { note(t("noCockTest")); return; }
    var comps = components(S.blocks), main = comps.reduce(function (a, b) { return mainScore(b) > mainScore(a) ? b : a; });
    var copy = main.map(function (b) { return { t: b.t, x: b.x, y: b.y, r: b.r, f: b.f, c: b.c }; });
    var me = makeBody(copy, true);
    FL = { bodies: [me], me: me, shots: [], beams: [], parts: [], seated: true, damp: true, wsel: 0, groups: [], keys: {}, mdx: 0, cam: { x: 0, y: 0 }, zoom: 1, t: 0 };
    var sp0 = seatPos(me); FL.pilot = { x: sp0.x, y: sp0.y, face: -Math.PI / 2, ph: 0 };
    FL.oc = false; FL.ocT = me.ocMax;
    FL.groups = []; if (st.mg) FL.groups.push("mg"); if (st.ms) FL.groups.push("ms"); if (st.rg) FL.groups.push("rg");
    FL.missiles = []; FL.hits = []; FL.sig = 0; FL.banner = 0; me.id = ++BID;
    // Sandbox: im Editor-Testflug liegen alle Perks in allen Seltenheiten im Inventar, aber inaktiv
    FL.drops = []; FL.inv = []; FL.uid = 0; FL.shHits = []; FL.shPct = 0; me.shE = 0; FL.kills = 0; FL.shTarget = 0; FL.shAcc = 0;
    var kcb = V.root.querySelector(".sr-kc b"); if (kcb) kcb.textContent = "0";
    PERKS.forEach(function (p, pi) { for (var r = p.legOnly ? 3 : 0; r < 4; r++) FL.inv.push({ uid: ++FL.uid, p: pi, r: r, on: false }); });
    PM = calcPM(FL.inv); me.player = true; recalc(me); me.energy = me.cap;
    FL.suit = SUIT.max; FL.out = false; FL.eva = null; FL.enterCd = 0; FL.ko = 0; me.lost = []; me.air = new Map();
    spawnTargets();
    S.mode = "fly"; V.zoomEd = V.zoom; V.zoom = Math.min(1.1, Math.max(0.6, V.zoom));
    syncUI();
  }
  function stopTest() { FL = null; S.mode = "edit"; if (V.zoomEd) V.zoom = V.zoomEd; syncUI(); }
  // Zielschiffe: Panzerung mit ein paar Maschinenteilen, damit Rauch und Feuer sichtbar werden
  function targetShip() {
    var B = [];
    for (var y = 0; y < 5; y++) for (var x = -3; x <= 3; x++) {
      var edge = x === -3 || x === 3 || y === 0 || y === 4;
      B.push({ t: edge ? (y === 0 ? "hblk" : "lblk") : (x === 0 && y === 2 ? "rea" : "flo"), x: x, y: y, r: 0, f: 0, c: edge && y === 0 ? "#B9573E" : undefined });
    }
    B = B.filter(function (b) { return !(b.x >= 0 && b.x <= 1 && b.y >= 2 && b.y <= 3 && !(b.x === 0 && b.y === 2)); });
    B = B.filter(function (b) { return b.t !== "flo" || !(b.x === 0 && b.y === 2); });
    B.push({ t: "gyr", x: -1, y: 2, r: 0, f: 0 }); B.push({ t: "bat", x: 2, y: 2, r: 0, f: 0 });
    B = B.filter(function (b) { return !(b.t === "flo" && ((b.x === -1 && b.y === 2) || (b.x === 2 && b.y === 2))); });
    B.push({ t: "ths", x: -2, y: 5, r: 0, f: 0 }); B.push({ t: "ths", x: 2, y: 5, r: 0, f: 0 });
    return B;
  }
  function spawnTargets() {
    FL.bodies = FL.bodies.filter(function (b) { return b === FL.me || b.enemy; });
    [[0, -110, 0.2], [85, -70, -0.6], [-95, -55, 0.9]].forEach(function (p) {
      var bd = makeBody(targetShip(), false); bd.x = FL.me.x + p[0]; bd.y = FL.me.y + p[1]; bd.a = p[2]; bd.w = (Math.random() - 0.5) * 0.15; bd.target = true;
      FL.bodies.push(bd);
    });
  }

  function flTick(dt) {
    FL.t += dt;
    if (FL.oc) { FL.ocT -= dt; if (FL.ocT <= 0) { FL.ocT = 0; FL.oc = false; } }
    else FL.ocT = Math.min(FL.me.ocMax || 3, FL.ocT + dt * 0.5);
    var me = FL.me, k = FL.keys;
    airTick(me, dt);
    // Schiebetür großer Cockpits öffnet, wenn man zu Fuß in ihre Nähe kommt
    if (me.seat && T[me.seat.t].h >= 4) { var sb = me.seat, sf = fp(sb), bdir = dirOut(sb, 2), dcx = sb.x + sf[0] / 2 + DV[bdir][0] * (sf[0] / 2 - 0.2), dcy = sb.y + sf[1] / 2 + DV[bdir][1] * (sf[1] / 2 - 0.2);
      var near = !FL.seated && !FL.out && Math.hypot(FL.pilot.x - dcx, FL.pilot.y - dcy) < 1.3; sb.ckOpen = Math.max(0, Math.min(1, (sb.ckOpen || 0) + (near ? dt : -dt) * 4)); }
    if (FL.out) evaTick(me, dt);
    FL.bodies.slice().forEach(function (bd) {
      if (bd.msRl > 0) { bd.msRl -= dt; if (bd.msRl <= 0) { bd.msRl = 0; bd.blocks.forEach(function (b) { if (T[b.t].kind === "ms") b.ammo = 2; }); } }
      // Energie: Reaktoren laden, Verbraucher ziehen
      bd.energy = Math.min(bd.cap - (bd.shE || 0), bd.energy + bd.prod * dt);   // der Schildanteil ist reserviert
      bd.flames = {};
      if (bd === me) turretTick(bd, dt, FL.seated && !FL.out ? mouseWorld() : null);
      if (bd === me && bd.ctrl && bd.seat) control(bd, dt, FL.seated);   // ohne Pilot halten nur die Dämpfer das Schiff
      if (bd === me) { var fm = 0; for (var fk in bd.flames) fm = Math.max(fm, bd.flames[fk]); if (FL.fire && FL.seated && FL.groups.length) fm = Math.max(fm, 0.6); FL.sig = Math.max(FL.sig * Math.exp(-dt / 1.2), fm); }
      if (bd.ai) aiTick(bd, dt);
      if (bd === me && !FL.seated && !FL.out) walk(bd, dt);
      var vlim = bd.enemy ? VMAX * AI.vk : VMAX;   // Tempolimit 500 m/s, KI-Schiffe 10 % weniger
      var vv = Math.hypot(bd.vx, bd.vy); if (vv > vlim) { bd.vx *= vlim / vv; bd.vy *= vlim / vv; vv = vlim; }
      if (bd === me) {
        // Sperre bei 120 m/s: verhindert nur weiteres Beschleunigen, bremst nie ab. Umschalt gibt den Bereich 120–500 m/s frei.
        var pv = bd.pv || 0;
        if (!FL.hiOk && vv > VHI && vv > pv) { var lim = Math.max(pv, VHI); bd.vx *= lim / vv; bd.vy *= lim / vv; vv = lim; }
        if (FL.hiOk && pv <= VHI && vv > VHI) { FL.shake = 0.7; FL.ca = Math.max(FL.ca || 0, 0.5); }   // Eintritt in hohe Geschwindigkeit
        if (FL.hiOk && pv >= VHI && vv < VHI) FL.hiOk = false;   // wieder unter 120 m/s: Freigabe erlischt, beim nächsten Mal erneut Umschalt
        bd.pv = vv;
      }
      bd.x += bd.vx * dt; bd.y += bd.vy * dt; bd.a += bd.w * dt;
      bd.blocks.forEach(function (b) {
        var ty = T[b.t];
        if (ty.kind === "mg") { var cn = (bd.cool && bd.cool.get(b)) || 0; if (b.oh > 0) { b.oh -= dt; if (b.oh <= 0) { b.oh = 0; b.heat = 0; } } else if (!b.firing) b.heat = Math.max(0, (b.heat || 0) - MG.cool * (1 + 0.6 * cn) * dt); b.firing = false; }
        if (ty.kind === "ms" && b.ammo === undefined) b.ammo = 2;
        if (ty.kind === "rg") { if (b.cd > 0) b.cd -= dt; if (!b.holding) b.chg = 0; b.holding = false; }
        var hk = b.hp / hpMax(bd, b);
        if (MECH[ty.kind] && hk < 0.5 && Math.random() < dt * (hk < 0.25 ? 5 : 2.5)) { var p = blockCenter(bd, b); FL.parts.push({ x: p.x + (Math.random() - 0.5) * 2, y: p.y + (Math.random() - 0.5) * 2, vx: bd.vx + (Math.random() - 0.5) * 3, vy: bd.vy - 1.5 - Math.random() * 2, life: 0, max: 1.4 + Math.random() * 0.8, k: "smoke", sz: 0.5 + Math.random() * 0.5 }); }
        if (MECH[ty.kind] && hk < 0.25 && Math.random() < dt * 9) { var q = blockCenter(bd, b); FL.parts.push({ x: q.x + (Math.random() - 0.5) * 1.6, y: q.y + (Math.random() - 0.5) * 1.6, vx: bd.vx + (Math.random() - 0.5) * 4, vy: bd.vy + (Math.random() - 0.5) * 4, life: 0, max: 0.4 + Math.random() * 0.3, k: "fire", sz: 0.45 + Math.random() * 0.45 }); }
      });
    });
    collide();
    enemyBook(dt);
    trailTick();
    tipTick(dt);
    shieldTick(dt);
    FL.hits = FL.hits.filter(function (h) { h.life += dt; return h.life < 0.35; });
    dropTick(dt);
    if (FL.banner > 0) FL.banner -= dt;
    // Geschosse
    FL.shots = FL.shots.filter(function (p) {
      p.life += dt; if (p.life > MG.life) return false;
      var steps = Math.ceil(Math.hypot(p.vx, p.vy) * dt / 1.0);
      for (var i = 0; i < steps; i++) {
        p.x += p.vx * dt / steps; p.y += p.vy * dt / steps;
        var hit = hitAt(p.x, p.y, p.own); if (hit) { var crit = p.own.player && Math.random() < PM.crit; if (p.own === FL.me) hitMark(p.x, p.y, hit.bd, crit); damage(hit.bd, hit.b, MG.dmg * (crit ? 2 : 1), p.x, p.y); spark(p.x, p.y, crit ? 10 : 5); return false; }
      }
      return true;
    });
    FL.beams = FL.beams.filter(function (b) { b.life += dt; return b.life < 0.3; });
    // Leichte Raketen: starke Beschleunigung, lenken nur ganz leicht zum Mauszeiger
    var mw = mouseWorld();
    FL.missiles = (FL.missiles || []).filter(function (m) {
      var mk = m.own && m.own.player ? 1 + PM.msDmg : 1;
      m.life += dt; if (m.life > MS.life) { blast(m.x, m.y, MS.splash, MS.sdmg * mk, m.own); return false; }
      var tg = m.own === FL.me ? mw : (m.own.ai && !m.own.dead ? { x: FL.me.x, y: FL.me.y } : null);
      if (tg) { var want = Math.atan2(tg.y - m.y, tg.x - m.x), dh = Math.atan2(Math.sin(want - m.h), Math.cos(want - m.h)); var trn = MS.turn * (m.own && m.own.player ? 1 + PM.msTurn : 1); m.h += Math.max(-trn * dt, Math.min(trn * dt, dh)); }
      var sp = Math.hypot(m.vx, m.vy), ns = Math.min(MS.vmax, sp + MS.acc * dt);
      // Geschwindigkeit dreht mit der Nase mit
      m.vx = Math.cos(m.h) * ns; m.vy = Math.sin(m.h) * ns;
      if (Math.random() < 0.9) FL.parts.push({ x: m.x, y: m.y, vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2, life: 0, max: 0.7 + Math.random() * 0.4, k: "smoke", sz: 0.35 + Math.random() * 0.25 });
      var steps = Math.ceil(ns * dt / 1.0);
      for (var i = 0; i < steps; i++) {
        m.x += m.vx * dt / steps; m.y += m.vy * dt / steps;
        var hit = hitAt(m.x, m.y, m.own); if (hit) { if (m.own === FL.me) hitMark(m.x, m.y, hit.bd); damage(hit.bd, hit.b, MS.dmg * mk, m.x, m.y); blast(m.x, m.y, MS.splash, MS.sdmg * mk, null); return false; }
      }
      return true;
    });
    FL.parts = FL.parts.filter(function (q) { q.life += dt; q.x += q.vx * dt; q.y += q.vy * dt; if (q.k === "debris") { q.a += q.w * dt; } return q.life < q.max; });
    if (FL.parts.length > 900) FL.parts.splice(0, FL.parts.length - 900);
    // Dynamische Kamera: schaut ein Stück in Richtung Maus, das Schiff rückt dabei Richtung Bildrand (höchstens 30 % des halben Bildes)
    var tox = 0, toy = 0, ppm = PX * V.zoom / CELL_M;
    if (V.mouse && (FL.seated || FL.out)) {
      tox = Math.max(-0.3 * V.W / 2, Math.min(0.3 * V.W / 2, (V.mouse.sx - V.W / 2) * 0.35)) / ppm;
      toy = Math.max(-0.3 * V.H / 2, Math.min(0.3 * V.H / 2, (V.mouse.sy - V.H / 2) * 0.35)) / ppm;
    }
    FL.camOff = FL.camOff || { x: 0, y: 0 }; var ck = 1 - Math.exp(-dt * 3.5);
    FL.camOff.x += (tox - FL.camOff.x) * ck; FL.camOff.y += (toy - FL.camOff.y) * ck;
    var fx = FL.out && FL.eva ? FL.eva.x : me.x, fy = FL.out && FL.eva ? FL.eva.y : me.y;
    FL.cam.x = fx + FL.camOff.x; FL.cam.y = fy + FL.camOff.y;
  }
  // ---------- Luft, Luken und Raumanzug ----------
  // Eine Luke öffnet nur kurz beim Durchgehen und wenn man draußen direkt davor schwebt
  // Luken öffnen nur kurz beim Benutzen mit F
  function hatchNear(bd, b) { return b.openT > 0; }
  function pulseHatch(bd, x, y) { var o = bd.map.get(key(Math.floor(x), Math.floor(y))); if (o && T[o.b.t].kind === "hatch") o.b.openT = 0.6; }
  function airRooms(bd) {
    if (bd.rooms) bd.rooms.forEach(function (r) { r.cells.forEach(function (c) { bd.air.set(key(c[0], c[1]), r.air); }); });
    bd.rooms = rooms(bd.blocks, bd.map); bd.roomOf = new Map();
    bd.rooms.forEach(function (r, i) {
      var sum = 0, n = 0;
      r.cells.forEach(function (c) { var kk = key(c[0], c[1]), a = bd.air.get(kk); bd.roomOf.set(kk, r); if (a !== undefined) { sum += a; n++; } });
      r.air = n ? sum / r.cells.length : (bd.airInit ? 0 : 1);
    });
    bd.airInit = true; bd.roomsDirty = false;
  }
  function pilotRoom(bd) {
    if (FL.out) return null;
    var p = FL.seated ? seatPos(bd) : FL.pilot;
    return bd.roomOf ? bd.roomOf.get(key(Math.floor(p.x), Math.floor(p.y))) || null : null;
  }
  function airTick(bd, dt) {
    if (!bd.air) bd.air = new Map();
    bd.blocks.forEach(function (b) { if (T[b.t].kind !== "hatch") return; if (b.openT > 0) b.openT -= dt; var o = hatchNear(bd, b); if (o !== !!b.open) { b.open = o; bd.roomsDirty = true; } });
    if (bd.roomsDirty || !bd.rooms) airRooms(bd);
    bd.rooms.forEach(function (r) { r.air = Math.max(0, Math.min(1, r.air + (r.ok ? AIR.fill : -AIR.vent) * dt)); });
    // Atmen: Raumluft, sobald genug da ist, sonst zieht der Anzug
    var r = pilotRoom(bd); FL.breath = r && r.air > SUIT.breathe ? "room" : FL.out ? "jet" : "suit";
    if (FL.breath === "room") FL.suit = Math.min(SUIT.max, FL.suit + SUIT.refill * dt);
    else FL.suit = Math.max(0, FL.suit - dt * (1 + (FL.out && FL.eva && FL.eva.thr ? SUIT.jet : 0)));
    if (FL.suit <= 0) {
      FL.ko += dt;
      if (FL.ko > 2.5) { FL.ko = 0; FL.suit = SUIT.max; FL.out = false; FL.eva = null; if (bd.seat) { FL.seated = true; var sp = seatPos(bd); FL.pilot.x = sp.x; FL.pilot.y = sp.y; } note(t("airOut")); }
    } else FL.ko = 0;
  }
  // Aussteigen durch eine Luke: ab jetzt fliegt die Figur frei im Raum, mit dem Tempo des Schiffs an dieser Stelle
  function openEdgeKind(k) { return k === "floor" || k === "door"; }
  function exitShip(bd, lx, ly, push) {
    pulseHatch(bd, FL.pilot.x, FL.pilot.y);
    var w = toWorld(bd, lx, ly), rx = w.x - bd.x, ry = w.y - bd.y, P = FL.pilot, fa = P.face + bd.a, pk = push ? 1.2 : 0.3;
    FL.eva = { x: w.x, y: w.y, vx: bd.vx - bd.w * ry + Math.cos(fa) * pk, vy: bd.vy + bd.w * rx + Math.sin(fa) * pk, face: fa, ph: 0, thr: false };
    FL.out = true; FL.enterCd = 0.8; FL.seated = false;
  }
  function enterAt(bd, cx, cy) {
    var E = FL.eva; FL.out = false; FL.pilot.x = cx + 0.5; FL.pilot.y = cy + 0.5; FL.pilot.face = E ? E.face - bd.a : 0; FL.eva = null; FL.enterCd = 0.5;
  }
  function evaTick(bd, dt) {
    var E = FL.eva, k = FL.keys, dx = (k.d ? 1 : 0) - (k.a ? 1 : 0), dy = (k.s ? 1 : 0) - (k.w ? 1 : 0), ax = 0, ay = 0;
    E.thr = false;
    if (FL.suit > 0) {
      if (dx || dy) { var l = Math.hypot(dx, dy); ax = dx / l * SUIT.acc; ay = dy / l * SUIT.acc; E.thr = true; }
      if (k.shift) {   // Tempo an das eigene Schiff angleichen
        var rvx = bd.vx - E.vx, rvy = bd.vy - E.vy, rl = Math.hypot(rvx, rvy);
        if (rl > 0.05) { var a = Math.min(SUIT.acc, rl / dt); ax += rvx / rl * a; ay += rvy / rl * a; E.thr = true; }
      }
    }
    E.vx += ax * dt; E.vy += ay * dt; E.x += E.vx * dt; E.y += E.vy * dt;
    if (E.thr && Math.random() < dt * 30) { var al = Math.hypot(ax, ay) || 1; FL.parts.push({ x: E.x - ax / al * 0.5, y: E.y - ay / al * 0.5, vx: E.vx - ax / al * 6 + (Math.random() - 0.5), vy: E.vy - ay / al * 6 + (Math.random() - 0.5), life: 0, max: 0.35, k: "jet", sz: 0.22 }); }
    var mw = mouseWorld();
    if (mw) { var want = Math.atan2(mw.y - E.y, mw.x - E.x), d = Math.atan2(Math.sin(want - E.face), Math.cos(want - E.face)); E.face += d * Math.min(1, dt * 10); }
    E.ph += E.thr ? dt * 4 : 0;
    // Schweißen draußen: Punkt vor der Figur im Schiffsraster
    FL.welding = false; FL.weldB = null; FL.weldG = null;
    if (FL.fire) { FL.welding = true; var tp = toLocal(bd, E.x + Math.cos(E.face) * 1.6, E.y + Math.sin(E.face) * 1.6); weldAt(bd, tp.x, tp.y, dt); }
    // Zurück ins Schiff über eine Luke
    FL.enterCd = Math.max(0, FL.enterCd - dt);
    var lp = toLocal(bd, E.x, E.y), o = bd.map.get(key(Math.floor(lp.x), Math.floor(lp.y)));
    // Offenes Schiff: über eine Bodenzelle am offenen Rand schweben, dann steigt man direkt wieder ein
    if (o && openEdgeKind(T[o.b.t].kind) && FL.enterCd <= 0) {
      var cx0 = Math.floor(lp.x), cy0 = Math.floor(lp.y), edge = false;
      for (var dd = 0; dd < 4; dd++) if (!bd.map.has(key(cx0 + DV[dd][0], cy0 + DV[dd][1]))) edge = true;
      if (edge) enterAt(bd, cx0, cy0);
    }
  }
  // Schweißgerät: repariert Blöcke (15 HP/s) und baut zerstörte Blöcke an ihrer alten Stelle wieder auf
  function lostAt(bd, x, y) {
    var cx = Math.floor(x), cy = Math.floor(y);
    for (var i = 0; i < bd.lost.length; i++) { var g = bd.lost[i]; if (cellsOf(g).some(function (q) { return q.c[0] === cx && q.c[1] === cy; })) return g; }
    return null;
  }
  function canRebuild(bd, g) { return cellsOf(g).every(function (q) { return !bd.map.has(key(q.c[0], q.c[1])); }) && linked(bd.map, g).length > 0; }
  function weldAt(bd, lx, ly, dt) {
    var o = bd.map.get(key(Math.floor(lx), Math.floor(ly))), spark = false;
    if (o) { var mx = hpMax(bd, o.b); FL.weldB = o.b; if (o.b.hp < mx) { o.b.hp = Math.min(mx, o.b.hp + WELD * dt); spark = true; } }
    else if (bd.lost) {
      var g = lostAt(bd, lx, ly);
      if (g) {
        FL.weldG = g; FL.weldOk = canRebuild(bd, g);
        if (FL.weldOk) {
          var nb = { t: g.t, x: g.x, y: g.y, r: g.r, f: g.f, c: g.c, hp: WELD * dt };
          bd.lost.splice(bd.lost.indexOf(g), 1); bd.blocks.push(nb); recalc(bd); FL.weldB = nb; FL.weldG = null; spark = true;
        }
      }
    }
    if (spark && Math.random() < dt * 40) { var wp = toWorld(bd, lx, ly), a = Math.random() * 6.28, v = 3 + Math.random() * 6; FL.parts.push({ x: wp.x, y: wp.y, vx: bd.vx + Math.cos(a) * v, vy: bd.vy + Math.sin(a) * v, life: 0, max: 0.15 + Math.random() * 0.2, k: "weld", sz: 0.25 }); }
  }
  // ---------- Gegner (Kampf-KI) ----------
  // Erkennung: im Gleitflug erst auf 20 m, mit Schub (oder beim Feuern) bis 260 m; zeigt die Nase genau auf mich, doppelt so weit
  var AI = { glide: 20, loud: 240, patrolV: 15, lose: 950, vk: 0.9 };
  function angTo(vx, vy) { return Math.atan2(vx, -vy); }   // Schiffswinkel, dessen Vorderseite (−y) in Richtung (vx, vy) zeigt
  function angDiff(a, b) { return Math.atan2(Math.sin(a - b), Math.cos(a - b)); }
  function minView() { var ppm = PX * ZMIN_FL / CELL_M; return { hw: V.W / 2 / ppm, hh: V.H / 2 / ppm }; }
  function spawnEnemy(id) {
    var sh = NPC.filter(function (q) { return q.id === id; })[0]; if (!sh || !FL) return;
    var bl = npcBlocks(sh), bd = makeBody(bl, false), me = FL.me, mv = minView();
    var dist = Math.max(320, Math.min(700, Math.max(mv.hw, mv.hh) * 1.25)), dir = me.a + (Math.random() - 0.5) * 1.4;
    bd.x = me.x + Math.sin(dir) * dist; bd.y = me.y - Math.cos(dir) * dist; bd.a = Math.random() * Math.PI * 2;
    bd.enemy = true; bd.npc = sh; bd.offT = 0; bd.seen = false;
    var sty = AISTY[Math.floor(Math.random() * AISTY.length)];
    bd.ai = { state: "patrol", home: { x: bd.x, y: bd.y }, r: 70 + Math.random() * 50, ang: Math.random() * 6.28, dir: Math.random() < 0.5 ? 1 : -1, strafe: 1, st: 3, alert: 0,
      sty: sty, mor: Math.min(1, sty.mor + (Math.random() - 0.5) * 0.2), n0: bd.blocks.length, fleeRoll: false };
    if (bd.shGen) bd.shE = Math.min(bd.cap * 0.5, bd.energy), bd.energy -= bd.shE;   // Gegner mit Generator reservieren die Hälfte fürs Schild
    FL.bodies.push(bd);
    note(fmt(t("spawned"), { n: sh.n[lang] }) + " · " + sty.n[lang]);
  }
  // Kampfstile: Draufgänger kommen nah heran, Umkreiser halten Abstand und kreisen, Taktiker liegen dazwischen
  var AISTY = [
    { id: "aggro", n: L2("Draufgänger", "Brawler"), rk: 0.45, strafe: 4, orbit: 0, push: 55, mor: 0.9, man: { chase: 0.4, pass: 0.35, attack: 0.2, brk: 0.05 } },
    { id: "tact", n: L2("Taktiker", "Tactician"), rk: 1, strafe: 9, orbit: 0, push: 40, mor: 0.75, man: { chase: 0.2, pass: 0.25, attack: 0.35, brk: 0.2 } },
    { id: "orbit", n: L2("Umkreiser", "Circler"), rk: 1.45, strafe: 0, orbit: 30, push: 35, mor: 0.65, man: { chase: 0.05, pass: 0.2, attack: 0.55, brk: 0.2 } }
  ];
  // Moral (0–1): sinkt mit jedem Treffer und mit verlorenen Blöcken, erholt sich langsam. Niedrige Moral hält mehr Abstand und flieht eher
  function aiMorale(bd, dt) {
    var A = bd.ai, loss = 1 - bd.blocks.length / A.n0, cap = Math.max(0.05, A.sty.mor * (1 - loss * 1.2));
    A.mor = Math.min(cap, A.mor + dt * 0.01);
    if (A.hitN) { A.mor = Math.max(0, A.mor - A.hitN * 0.006); A.hitN = 0; }
    A.mor = Math.min(A.mor, cap);
  }
  function aiFleeCheck(bd) {
    var A = bd.ai, ck = bd.seat; if (!ck || A.fleeRoll || A.state === "flee") return;
    if (ck.hp / hpMax(bd, ck) < 0.3) {   // Cockpit kurz vor der Zerstörung: im Schnitt 25 % Fluchtversuche, bei schlechter Moral öfter
      A.fleeRoll = true;
      var pf = Math.max(0.1, Math.min(0.45, 0.25 + (0.5 - A.mor) * 0.3));
      if (Math.random() < pf) { A.state = "flee"; FL.bannerN = bd.npc.n[lang]; showBanner(t("fleeT"), "flee"); }
    }
  }
  // Manöver im Kampf: Verfolgen (seitlich versetzt), Vorbeiflug (Angriff von der anderen Seite), Angriff (Abstand halten, kreisen) und Ausbrechen.
  // Nur beim Angriff zielt die Nase dauerhaft auf dich; bei Vorbeiflug und Ausbrechen fliegt sie in Bewegungsrichtung.
  var MANT = { chase: [3, 5], pass: [6, 9], attack: [3, 6], brk: [1.8, 3] };
  function pickMan(A) {
    var w = A.sty.man, x = Math.random(), k;
    for (k in w) { x -= w[k]; if (x <= 0) break; }
    if (k === A.man && Math.random() < 0.6) return pickMan(A);   // selten zweimal dasselbe
    A.man = k; A.side = Math.random() < 0.5 ? -1 : 1; A.passed = false; A.passU = null;
    A.manT = MANT[k][0] + Math.random() * (MANT[k][1] - MANT[k][0]);
  }
  // Kollisionsvermeidung, jeden Frame mit deinem echten Tempo (nicht der verzögerten Schätzung):
  // Annäherung nur so schnell, dass die KI vor dir noch bremsen kann; ab etwa 45 m Abstand zur Hülle kein weiteres Aufschließen mehr
  // und ein kräftiger Schwenk zur Seite.
  var AVOID = 50;
  function aiAvoid(bd, A, vDes, me) {
    var dx = me.x - bd.x, dy = me.y - bd.y, dist = Math.hypot(dx, dy) || 1, ux = dx / dist, uy = dy / dist;
    var ds = Math.max(0, dist - 0.5 * (me.rad + bd.rad)); if (ds > AVOID + 120) return vDes;
    var v = { x: vDes.x, y: vDes.y }, rel = (v.x - me.vx) * ux + (v.y - me.vy) * uy;   // gewünschte Annäherung relativ zu dir
    var aB = Math.max(2, bd.thrSum / 4 / bd.mass * 0.5);   // vorsichtig angesetzte Bremsverzögerung
    var maxC = ds > AVOID ? Math.sqrt(2 * aB * (ds - AVOID)) : (ds - AVOID) * 0.5;
    if (rel > maxC) { v.x -= ux * (rel - maxC); v.y -= uy * (rel - maxC); }
    if (ds < AVOID) { var sd = A.side || 1, k = 1 - ds / AVOID; v.x += -uy * sd * 35 * k; v.y += ux * sd * 35 * k; }
    // Vorausschau: Bleibt der aktuelle Kurs so, wie nah kommen wir uns in den nächsten 3 s? Zu nah: kräftig seitlich und abbremsen
    var rx = bd.x - me.x, ry = bd.y - me.y, wx = bd.vx - me.vx, wy = bd.vy - me.vy, w2 = wx * wx + wy * wy;
    if (w2 > 1) {
      var tca = -(rx * wx + ry * wy) / w2;
      if (tca > 0 && tca < 3) {
        var mx = rx + wx * tca, my = ry + wy * tca, miss = Math.hypot(mx, my), safe = 0.5 * (me.rad + bd.rad) + 20;
        if (miss < safe) {
          var ml = miss || 1, ex = miss > 0.5 ? mx / ml : -uy * (A.side || 1), ey = miss > 0.5 ? my / ml : ux * (A.side || 1), urg = (1 - miss / safe) * (1 - tca / 3);
          v.x += ex * 45 * urg - wx * 0.6 * urg; v.y += ey * 45 * urg - wy * 0.6 * urg;
        }
      }
    }
    return v;
  }
  function aiTick(bd, dt) {
    var A = bd.ai, me = FL.me; if (bd.dead) return;
    var alive = FL.bodies.indexOf(me) >= 0 && me.blocks.length;
    var dx = me.x - bd.x, dy = me.y - bd.y, dist = Math.hypot(dx, dy) || 1, ds = Math.max(0, dist - 0.5 * (me.rad + bd.rad));
    var fw = dirWorld(bd, 0), cosA = (fw.x * dx + fw.y * dy) / dist, al = Math.acos(Math.max(-1, Math.min(1, cosA)));
    var range = (AI.glide + AI.loud * FL.sig) * (al < 0.14 ? 2 : al < 0.35 ? 2 - (al - 0.14) / 0.21 : 1);
    A.range = range; A.alert = Math.max(0, A.alert - dt);
    if (A.state === "patrol" && alive && (ds < range || A.hurt)) { A.state = "combat"; A.alert = 1.6; }
    if (A.state === "combat" && (!alive || dist > AI.lose)) { A.state = "patrol"; A.home = { x: bd.x, y: bd.y }; }
    A.hurt = false;
    aiMorale(bd, dt); aiFleeCheck(bd);
    // Wahrnehmung mit Verzögerung: Die KI sieht deine Position, schätzt dein Tempo aber nur geglättet (~0,8 s),
    // und plant ihre Wunschbewegung nur alle 0,35–0,6 s neu. So reagiert sie träger auf deine Manöver.
    var pk = 1 - Math.exp(-dt / 0.8);
    if (A.pvx === undefined) { A.pvx = me.vx; A.pvy = me.vy; }
    A.pvx += (me.vx - A.pvx) * pk; A.pvy += (me.vy - A.pvy) * pk;
    var PV = { x: A.pvx, y: A.pvy };
    A.plan = (A.plan || 0) - dt; var replan = A.plan <= 0; if (replan) A.plan = 0.35 + Math.random() * 0.25;
    var vDes, head, fire = false, aim = null, Y = A.sty;
    if (A.state === "flee") {
      // Flucht: Nase weg vom Spieler, volle Fahrt, kein Feuer
      var fx = -dx / dist, fy = -dy / dist; head = angTo(fx, fy);
      A.fleeT = (A.fleeT || 0) + dt;
      vDes = { x: bd.vx + fx * 60, y: bd.vy + fy * 60 };
      var vcap = (A.fleeT < 5 ? VHI - 1 : VMAX) * AI.vk, vm = Math.hypot(vDes.x, vDes.y);   // erst bis 120 m/s, frühestens nach 5 s Hochgeschwindigkeit
      if (vm > vcap) { vDes.x *= vcap / vm; vDes.y *= vcap / vm; }
    } else if (A.state === "combat") {
      var R = bd.blocks.some(function (b) { return T[b.t].kind === "mg"; }) ? 75 : bd.blocks.some(function (b) { return T[b.t].kind === "ms"; }) ? 130 : 170;
      R *= Y.rk * (1 + Math.max(0, 0.6 - A.mor) * 1.2);   // Stil und Moral bestimmen den Wunschabstand
      var tl = dist / MG.speed; aim = { x: me.x + (PV.x - bd.vx) * tl, y: me.y + (PV.y - bd.vy) * tl };
      var aimHead = angTo(aim.x - bd.x, aim.y - bd.y);
      if (!A.man) pickMan(A); A.manT -= dt; if (A.manT <= 0) pickMan(A);
      var ux = dx / dist, uy = dy / dist, qx = -uy * A.side, qy = ux * A.side, gap = Math.max(22, (me.rad + bd.rad) * 0.7), m = A.man;
      head = aimHead;
      if (m === "chase") {
        // Verfolgen: Zielpunkt hinter dir, aber seitlich versetzt, damit ein Bremsmanöver nicht zum Rammen führt
        var tx = me.x - ux * R * 0.6 + qx * gap, ty = me.y - uy * R * 0.6 + qy * gap, ex = tx - bd.x, ey = ty - bd.y, el = Math.hypot(ex, ey) || 1, sp = Math.min(Y.push, el * 0.5);
        vDes = { x: PV.x + ex / el * sp, y: PV.y + ey / el * sp };
      } else if (m === "pass") {
        // Vorbeiflug: schräg an dir vorbei auf die andere Seite, dort umdrehen und angreifen
        if (!A.passU) A.passU = { x: ux, y: uy };
        var beyond = (A.passU.x * ux + A.passU.y * uy) < 0;
        if (beyond && !A.passed) { A.passed = true; A.manT = Math.min(A.manT, 1.2); }
        var px2 = me.x + A.passU.x * (R * 0.9 + 40) + qx * gap * 1.3, py2 = me.y + A.passU.y * (R * 0.9 + 40) + qy * gap * 1.3;
        var ex2 = px2 - bd.x, ey2 = py2 - bd.y, el2 = Math.hypot(ex2, ey2) || 1, sp2 = Y.push + 15;
        vDes = { x: PV.x + ex2 / el2 * sp2, y: PV.y + ey2 / el2 * sp2 };
        if (dist < R * 1.3 || A.passed) head = angTo(vDes.x - PV.x, vDes.y - PV.y);   // im Vorbeiflug zeigt die Nase in Flugrichtung
        if (A.passed && A.manT < 0.2) { A.man = "attack"; A.manT = 3 + Math.random() * 2; }
      } else if (m === "brk") {
        // Ausbrechen: schräg weg, Abstand gewinnen, Nase in Flugrichtung
        var ang = A.side * (0.9 + Math.random() * 0.01), bx = -ux * Math.cos(ang) + uy * Math.sin(ang), by = -uy * Math.cos(ang) - ux * Math.sin(ang);
        vDes = { x: PV.x + bx * Y.push, y: PV.y + by * Y.push };
        head = angTo(bx, by);
      } else {
        // Angriff: Wunschabstand halten, seitlich ausweichen oder kreisen
        A.st -= dt; if (A.st <= 0) { A.st = 2.5 + Math.random() * 3; A.strafe = Math.random() < 0.5 ? -1 : 1; if (Y.orbit && Math.random() < 0.25) A.dir = -A.dir; }
        var cl = Math.max(-25, Math.min(Y.push, (dist - R) * 0.6)), side = Y.orbit ? Y.orbit * A.dir : Y.strafe * A.strafe;
        vDes = { x: PV.x + ux * cl - uy * side, y: PV.y + uy * cl + ux * side };
      }
      // Feuern nur, wenn die Nase zufällig oder gewollt passt
      // Feuern, sobald die Geschütze wirklich auf dich zeigen: Toleranz nach deiner Größe in der Entfernung, unabhängig vom Manöver und vom Wunschabstand
      var tol = Math.max(0.05, Math.atan2(me.rad * 0.55, dist)) + (bd.tcomp ? TURRET.max : 0);
      fire = Math.abs(angDiff(aimHead, bd.a)) < tol;
    } else {
      A.ang += A.dir * dt * AI.patrolV / A.r;
      var px = A.home.x + Math.cos(A.ang) * A.r, py = A.home.y + Math.sin(A.ang) * A.r, tx = -Math.sin(A.ang) * A.dir, ty = Math.cos(A.ang) * A.dir;
      vDes = { x: tx * AI.patrolV + (px - bd.x) * 0.3, y: ty * AI.patrolV + (py - bd.y) * 0.3 };
      head = angTo(vDes.x, vDes.y);
    }
    if (replan || !A.vDes || A.state === "flee") A.vDes = vDes; else vDes = A.vDes;
    if (A.state === "combat") vDes = aiAvoid(bd, A, vDes, me);
    aiDrive(bd, dt, vDes, head);
    if (A.state === "flee" && A.fleeT < 5) { var fv = Math.hypot(bd.vx, bd.vy), pv0 = A.pv || 0, vh = VHI * AI.vk; if (fv > vh && fv > pv0) { var lm = Math.max(pv0, vh); bd.vx *= lm / fv; bd.vy *= lm / fv; fv = lm; } A.pv = fv; }
    else A.pv = Math.hypot(bd.vx, bd.vy);
    turretTick(bd, dt, aim);
    // jede Waffe in ihrer eigenen Reichweite: Minigun bis ~85 % ihrer Flugweite, Raketen bis 300 m, Railgun bis 90 % ihrer Reichweite
    // Feuerstöße: kurz vor dem Überhitzen absetzen und erst nach dem Abkühlen weiterschießen, damit die Miniguns nicht sperren
    var hmax = 0; bd.blocks.forEach(function (b) { if (T[b.t].kind === "mg") hmax = Math.max(hmax, b.oh > 0 ? 1 : b.heat || 0); });
    if (hmax > MG.warn) A.mgRest = true; else if (hmax < 0.35) A.mgRest = false;
    if (fire) { if (dist < MG.speed * MG.life * 0.85 && !A.mgRest) weapons(bd, dt, "mg", true, aim); if (dist < 300) weapons(bd, dt, "ms", true, aim); if (dist < RG.range * 0.9) weapons(bd, dt, "rg", true, aim); }
  }
  function aiDrive(bd, dt, vDes, head) {
    if (bd.torque > 0 && bd.energy > 0) {
      var wT = Math.max(-1.5, Math.min(1.5, angDiff(head, bd.a) * 1.5)), al = bd.torque / bd.I, dw = wT - bd.w, step = Math.sign(dw) * Math.min(Math.abs(dw), al * dt);
      bd.w += step; if (Math.abs(step) > 1e-4) bd.energy = Math.max(0, bd.energy - 3 * dt * Math.min(1, Math.abs(dw)));
    }
    var ca = Math.cos(bd.a), sa = Math.sin(bd.a), dvx = vDes.x - bd.vx, dvy = vDes.y - bd.vy, lx = dvx * ca + dvy * sa, ly = -dvx * sa + dvy * ca, acc = { x: 0, y: 0 }, use = 0;
    // Triebwerke laufen wie beim Spieler an: 50 % nach 0,2 s, voller Schub nach 1 s
    var sp = bd.spool || (bd.spool = [0, 0, 0, 0]), cmd = [0, 0, 0, 0];
    function spK(x) { return x < 0.2 ? x * 2.5 : 0.5 + 0.5 * Math.min(1, (x - 0.2) / 0.8); }
    [[lx, 1, 3, "x"], [ly, 2, 0, "y"]].forEach(function (q) {
      var v = q[0]; if (Math.abs(v) < 0.08) return;
      var d = v > 0 ? q[1] : q[2], th = bd.thr[d]; if (!th) return;
      cmd[d] = 1;
      var amax = th / bd.mass, a = Math.min(Math.abs(v) * 1.2, amax) * spK(sp[d]), eff = a / amax;
      acc[q[3]] += (v > 0 ? 1 : -1) * a; use += eff * useOf(bd, d) * dt; bd.flames[d] = Math.max(bd.flames[d] || 0, eff);
    });
    for (var di = 0; di < 4; di++) sp[di] = cmd[di] ? Math.min(1, sp[di] + dt) : Math.max(0, sp[di] - dt * 2.5);
    var sc = use > bd.energy ? (bd.energy > 0 ? bd.energy / use : 0) : 1;
    bd.energy = Math.max(0, bd.energy - use * sc); for (var fk in bd.flames) bd.flames[fk] *= sc;
    var axw = acc.x * sc, ayw = acc.y * sc;
    bd.vx += (axw * ca - ayw * sa) * dt; bd.vy += (axw * sa + ayw * ca) * dt;
  }
  // Kampfunfähig: Cockpit weg, oder keine Energie mehr und kein Reaktor, oder ohne Gyroskop oder ohne Triebwerke
  function enemyBook(dt) {
    var mv = minView();
    FL.bodies.slice().forEach(function (bd) {
      if (!bd.enemy) return;
      // Zerstört: Cockpit weg, nicht mehr manövrierfähig (kein Gyroskop oder keine Triebwerke) oder keine Energie mehr
      if (!bd.dead && (!bd.cock || (bd.energy <= 0.5 && !bd.prod) || !bd.torque || !bd.thrSum)) {
        bd.dead = true; bd.ai = null; bd.flames = {}; FL.bannerN = bd.npc.n[lang]; showBanner(t("destroyed"), "dead");
        scoreKill(bd);
      }
      // Kampfunfähig: keine funktionierenden Waffen mehr; das Schiff versucht weiter zu fliehen
      else if (!bd.dead && !bd.disarmed && !bd.blocks.some(function (b) { var k = T[b.t].kind; return k === "mg" || k === "rg" || k === "ms"; })) {
        bd.disarmed = true; if (bd.ai) { bd.ai.state = "flee"; bd.ai.fleeT = 0; } FL.bannerN = bd.npc.n[lang]; showBanner(t("ko"), "ko");
        scoreKill(bd);
      }
      var inView = Math.abs(bd.x - FL.cam.x) < mv.hw + bd.rad && Math.abs(bd.y - FL.cam.y) < mv.hh + bd.rad;
      if (inView) { bd.seen = true; bd.offT = 0; } else if (bd.seen) bd.offT += dt;
      var far = Math.hypot(bd.x - FL.cam.x, bd.y - FL.cam.y) > 3000;
      if (bd.offT > 30 || far) FL.bodies.splice(FL.bodies.indexOf(bd), 1);
    });
  }
  // Abschuss: zählt einmal pro Schiff, egal ob erst kampfunfähig und später zerstört
  function scoreKill(bd) {
    if (bd.killed) return; bd.killed = true; FL.kills = (FL.kills || 0) + 1; dropPerks(bd);
    var k = V.root.querySelector(".sr-kc b"); if (k) { k.textContent = FL.kills; var el = k.parentNode; el.classList.remove("pop"); void el.offsetWidth; el.classList.add("pop"); }
  }
  function showBanner(label, kind) {
    var el = V.root.querySelector(".sr-kill"); if (!el) return;
    el.querySelector("small").textContent = label || t("ko"); el.classList.toggle("flee", kind === "flee"); el.classList.toggle("dead", kind === "dead");
    el.querySelector("span").textContent = FL.bannerN; el.hidden = false; el.classList.remove("go"); void el.offsetWidth; el.classList.add("go");
    clearTimeout(V.killT); V.killT = setTimeout(function () { if (V) el.hidden = true; }, 3200);
  }
  // Treffer an fremden Schiffen: kleines x an der Stelle und ein leiser, weicher Klick
  var AC = null, lastHitS = 0;
  function audioInit() { try { if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === "suspended") AC.resume(); } catch (e) {} }
  function hitMark(x, y, bd, crit) {
    if (bd === FL.me) return;
    if (bd.ai) { bd.ai.hurt = true; bd.ai.hitN = (bd.ai.hitN || 0) + 1; }
    FL.hits.push({ x: x, y: y, life: 0, crit: !!crit }); if (FL.hits.length > 40) FL.hits.shift();
    if (!AC || AC.state !== "running") return;
    var t0 = AC.currentTime; if (t0 - lastHitS < 0.07) return; lastHitS = t0;
    try {
      var o = AC.createOscillator(), g = AC.createGain(), f = AC.createBiquadFilter();
      o.type = "triangle"; o.frequency.setValueAtTime(560, t0); o.frequency.exponentialRampToValueAtTime(330, t0 + 0.07);
      f.type = "lowpass"; f.frequency.value = 1800;
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.045, t0 + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.09);
      o.connect(f); f.connect(g); g.connect(AC.destination); o.start(t0); o.stop(t0 + 0.11);
    } catch (e) {}
  }
  // ---------- Kollisionen ----------
  // Zellen des kleineren Körpers gegen das Raster des größeren; Stoß mit Masse und Trägheit (schwere Schiffe werden weniger abgelenkt).
  // Über 20 m/s Aufprall gehen an der Stelle Blöcke kaputt.
  var COL = { e: 0.3, dmgV: 20, dmgK: 7 };
  function collide() {
    var B = FL.bodies, dmg = [];
    FL.colCd = FL.colCd || {};
    for (var i = 0; i < B.length; i++) for (var j = i + 1; j < B.length; j++) {
      var A = B[i], C = B[j], dx = C.x - A.x, dy = C.y - A.y;
      if (Math.abs(dx) > A.rad + C.rad || Math.abs(dy) > A.rad + C.rad || Math.hypot(dx, dy) > A.rad + C.rad) continue;
      var sm = A.cells.length <= C.cells.length ? A : C, bg = sm === A ? C : A;
      var px = 0, py = 0, n = 0, hs = [], hb = [], ca = Math.cos(sm.a), sa = Math.sin(sm.a);
      for (var k = 0; k < sm.cells.length; k++) {
        var cl = sm.cells[k], lx = (cl[0] - sm.com[0]) * CELL_M, ly = (cl[1] - sm.com[1]) * CELL_M, wx = sm.x + lx * ca - ly * sa, wy = sm.y + lx * sa + ly * ca;
        if (Math.abs(wx - bg.x) > bg.rad || Math.abs(wy - bg.y) > bg.rad) continue;
        var l = toLocal(bg, wx, wy), q = bg.map.get(key(Math.floor(l.x), Math.floor(l.y)));
        if (q) { px += wx; py += wy; n++; if (hs.indexOf(cl[2]) < 0) hs.push(cl[2]); if (hb.indexOf(q.b) < 0) hb.push(q.b); }
      }
      if (!n) continue;
      px /= n; py /= n;
      var nx = sm.x - bg.x, ny = sm.y - bg.y, nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;   // Normale vom großen zum kleinen Körper
      var rsx = px - sm.x, rsy = py - sm.y, rbx = px - bg.x, rby = py - bg.y;
      var vsx = sm.vx - sm.w * rsy, vsy = sm.vy + sm.w * rsx, vbx = bg.vx - bg.w * rby, vby = bg.vy + bg.w * rbx;
      var rvx = vsx - vbx, rvy = vsy - vby, vn = rvx * nx + rvy * ny, sp = Math.hypot(rvx, rvy);
      var ims = 1 / sm.mass, imb = 1 / bg.mass, rsn = rsx * ny - rsy * nx, rbn = rbx * ny - rby * nx;
      if (vn < 0) {
        var jj = -(1 + COL.e) * vn / (ims + imb + rsn * rsn / sm.I + rbn * rbn / bg.I);
        sm.vx += jj * nx * ims; sm.vy += jj * ny * ims; sm.w += rsn * jj / sm.I;
        bg.vx -= jj * nx * imb; bg.vy -= jj * ny * imb; bg.w -= rbn * jj / bg.I;
        var pk = Math.min(A.id, C.id) + ":" + Math.max(A.id, C.id);
        if (sp > COL.dmgV && !(FL.colCd[pk] > FL.t)) {
          FL.colCd[pk] = FL.t + 0.3;
          var base = (sp - COL.dmgV) * COL.dmgK, tot = sm.mass + bg.mass;
          hs.slice(0, 4).forEach(function (b) { dmg.push([sm, b, base * 2 * bg.mass / tot]); });
          hb.slice(0, 4).forEach(function (b) { dmg.push([bg, b, base * 2 * sm.mass / tot]); });
          spark(px, py, 14); FL.parts.push({ x: px, y: py, vx: 0, vy: 0, life: 0, max: 0.2, k: "flash", sz: 2 + sp * 0.05 });
        } else if (sp > 4) spark(px, py, 3);
      }
      // auseinanderschieben, damit nichts ineinander stecken bleibt
      var corr = Math.min(0.6, 0.06 * n), ws = ims / (ims + imb);
      sm.x += nx * corr * ws; sm.y += ny * corr * ws; bg.x -= nx * corr * (1 - ws); bg.y -= ny * corr * (1 - ws);
    }
    dmg.forEach(function (d) { damage(d[0], d[1], d[2], 0, 0, true); });   // Rammen geht am Schild vorbei
  }
  // ---------- zu Fuß im Schiff ----------
  function localPt(b, lx, ly) {
    var ty = T[b.t], w = ty.w, h = ty.h, x = b.f ? w - lx : lx, y = ly;
    for (var i = 0; i < b.r; i++) { var nx = h - y, ny = x; x = nx; y = ny; var tw = w; w = h; h = tw; }
    return { x: b.x + x, y: b.y + y };
  }
  function seatPos(bd) { var b = bd.seat; if (!b) return { x: bd.com[0], y: bd.com[1] }; var ty = T[b.t]; return ty.w === 1 ? localPt(b, 0.5, 1.45) : localPt(b, ty.w / 2, (ty.h > 3 ? 1.6 : 1.2) + 0.95); }
  function walkable(bd, x, y) {
    var o = bd.map.get(key(Math.floor(x), Math.floor(y))); if (!o) return false;
    var k = T[o.b.t].kind; return k === "floor" || k === "door" || k === "hatch" || (k === "cock" && o.ly >= 1);
  }
  function canStand(bd, x, y) { var r = 0.24; return walkable(bd, x - r, y - r) && walkable(bd, x + r, y - r) && walkable(bd, x - r, y + r) && walkable(bd, x + r, y + r); }
  function walk(bd, dt) {
    var P = FL.pilot, k = FL.keys, dx = (k.d ? 1 : 0) - (k.a ? 1 : 0), dy = (k.s ? 1 : 0) - (k.w ? 1 : 0);
    if (dx || dy) {   // Bildschirmrichtung → Schiffsrahmen
      var l = Math.hypot(dx, dy), ca = Math.cos(bd.a), sa = Math.sin(bd.a), lx = (dx * ca + dy * sa) / l, ly = (-dx * sa + dy * ca) / l, sp = 2.2 * dt * (PM.walk ? 2 : 1);
      if (canStand(bd, P.x + lx * sp, P.y)) P.x += lx * sp;
      if (canStand(bd, P.x, P.y + ly * sp)) P.y += ly * sp;
      var want = Math.atan2(ly, lx), d = Math.atan2(Math.sin(want - P.face), Math.cos(want - P.face)); P.face += d * Math.min(1, dt * 14);
      P.ph += dt * 10;
      // Offenes Schiff: Boden oder Tür ohne Wand zum All, dort direkt hinaustreten (Luken nur mit F)
      var cur = bd.map.get(key(Math.floor(P.x), Math.floor(P.y)));
      if (cur && openEdgeKind(T[cur.b.t].kind)) { var nx = P.x + lx * 0.75, ny = P.y + ly * 0.75; if (!bd.map.get(key(Math.floor(nx), Math.floor(ny)))) { exitShip(bd, nx, ny, true); return; } }
    } else P.ph *= Math.pow(0.001, dt);
    // Boden unter den Füßen weggeschossen: die Figur treibt ins All
    if (!walkable(bd, P.x, P.y)) { exitShip(bd, P.x, P.y); FL.eva.vx -= Math.cos(P.face + bd.a) * 1.2; FL.eva.vy -= Math.sin(P.face + bd.a) * 1.2; return; }
    // Schweißgerät: repariert oder baut den Block direkt vor der Figur
    FL.welding = false; FL.weldB = null; FL.weldG = null;
    if (FL.fire) { FL.welding = true; weldAt(bd, P.x + Math.cos(P.face) * 0.8, P.y + Math.sin(P.face) * 0.8, dt); }
  }
  function toggleSeat() {
    var me = FL.me;
    if (FL.out) {   // draußen: über einer Luke mit F wieder hinein
      var lp = toLocal(me, FL.eva.x, FL.eva.y), o = me.map.get(key(Math.floor(lp.x), Math.floor(lp.y)));
      if (o && T[o.b.t].kind === "hatch") { o.b.openT = 0.6; enterAt(me, Math.floor(lp.x), Math.floor(lp.y)); } else note(t("outside"));
      return;
    }
    if (!FL.seated) {   // zu Fuß auf einer Luke: mit F hinaus (auch durch die Decke, wenn die Luke mitten im Raum liegt)
      var hc = me.map.get(key(Math.floor(FL.pilot.x), Math.floor(FL.pilot.y)));
      if (hc && T[hc.b.t].kind === "hatch") { exitShip(me, FL.pilot.x, FL.pilot.y, false); return; }
    }
    if (FL.seated) { FL.seated = false; var sp = seatPos(me); FL.pilot.x = sp.x; FL.pilot.y = sp.y; FL.pilot.face = me.seat ? dirAngle(me.seat) : 0; if (S.view !== "in") { S.view = "in"; syncUI(); } return; }
    if (!me.seat) return;
    var p = seatPos(me); if (Math.hypot(p.x - FL.pilot.x, p.y - FL.pilot.y) > 1.5) { note(t("tooFar")); return; }
    FL.seated = true;
  }
  function dirAngle(b) { var d = dirOut(b, 2); return Math.atan2(DV[d][1], DV[d][0]); }
  function control(bd, dt, input) {
    var k = FL.keys, ca = Math.cos(bd.a), sa = Math.sin(bd.a);
    var vl = { x: bd.vx * ca + bd.vy * sa, y: -bd.vx * sa + bd.vy * ca };    // Tempo im Schiffsrahmen (−y = vorne)
    var inX = input ? (k.d ? 1 : 0) - (k.a ? 1 : 0) : 0, inY = input ? (k.s ? 1 : 0) - (k.w ? 1 : 0) : 0;
    var acc = { x: 0, y: 0 }, use = 0, thr = bd.thr, m = bd.mass;
    // Triebwerke sind träge: nach 0,2 s halbe, nach 1 s volle Leistung; Overcharge +50 % Schub und Verbrauch
    var sp = bd.spool || (bd.spool = [0, 0, 0, 0]), cmd = [0, 0, 0, 0], oc = FL.oc ? 1.5 : 1;
    function spoolK(x) { return x < 0.2 ? x * 2.5 : 0.5 + 0.5 * Math.min(1, (x - 0.2) / 0.8); }
    function axis(inp, v, posD, negD, comp) {   // posD: Richtung mit Schub in +Achse
      var want = 0, d = -1;
      if (inp > 0) { d = posD; want = 1; }
      else if (inp < 0) { d = negD; want = 1; }
      else if (FL.damp && Math.abs(v) > 0.02 && !(FL.cruise && comp === "y")) {   // Dämpfer: gegensteuern bis Stillstand; im Cruise-Modus nur noch seitlich
        d = v > 0 ? negD : posD; var need = Math.abs(v) * m / dt; want = thr[d] ? Math.min(1, need / (thr[d] * oc * (bd.player ? 1 + PM.brake + (d === 1 || d === 3 ? PM.side : 0) : 1))) : 0;
      }
      if (d < 0 || !thr[d] || !want) return;
      cmd[d] = want;
      var sign = (d === posD) ? 1 : -1, pk = 1;
      if (bd.player) { if (d === 1 || d === 3) pk += PM.side; if (sign * v < 0) pk += PM.brake; }   // Perks: Seitenschub, Bremsschub
      var eff = want * spoolK(sp[d]), F = thr[d] * oc * eff * pk, a = F / m;
      if (inp === 0) a = Math.min(a, Math.abs(v) / dt);
      acc[comp] += sign * a; use += eff * oc * useOf(bd, d) * dt; bd.flames[d] = Math.max(bd.flames[d] || 0, eff);
    }
    axis(inX, vl.x, 1, 3, "x"); axis(inY, vl.y, 2, 0, "y");
    for (var di = 0; di < 4; di++) sp[di] = cmd[di] ? Math.min(1, sp[di] + dt) : Math.max(0, sp[di] - dt * 2.5);
    // Energie reicht nicht: Schub anteilig kürzen
    var scale = 1; if (use > bd.energy) { scale = bd.energy > 0 ? bd.energy / use : 0; }
    bd.energy = Math.max(0, bd.energy - use * scale);
    acc.x *= scale; acc.y *= scale; for (var fk in bd.flames) bd.flames[fk] *= scale;
    vl.x += acc.x * dt; vl.y += acc.y * dt;
    bd.vx = vl.x * ca - vl.y * sa; bd.vy = vl.x * sa + vl.y * ca;
    // Drehen nur mit Gyroskop; ohne Eingabe stabilisiert es die Drehung
    if (bd.torque > 0 && bd.energy > 0) {
      var target = input ? ((k.e ? 1 : 0) - (k.q ? 1 : 0)) * 2.4 : 0;
      var al = bd.torque / bd.I, dw = target - bd.w, step = Math.sign(dw) * Math.min(Math.abs(dw), al * dt);
      bd.w += step; if (Math.abs(step) > 1e-4) bd.energy = Math.max(0, bd.energy - 3 * dt * Math.min(1, Math.abs(dw)));
    }
    FL.mdx *= Math.pow(0.0005, dt);
    // Waffen
    weapons(bd, dt, input ? FL.groups[FL.wsel] : null, FL.fire, null);
  }
  // Waffen einer Gruppe abfeuern (Spieler und KI nutzen dieselben Regeln)
  function weapons(bd, dt, g, firing, aim) {
    // Mehrere Miniguns setzen versetzt ein: zu Beginn einer Salve bekommt jede einen eigenen Takt-Versatz
    if (firing && g === "mg" && !bd.mgWas) {
      var mgs = bd.blocks.filter(function (b) { return T[b.t].kind === "mg"; }), per = 1 / (MG.rate * (bd.player ? 1 + PM.mgRate : 1));
      mgs.forEach(function (b, i) { b.cool2 = Math.max(b.cool2 || 0, (i / mgs.length) * per + Math.random() * per * 0.15); });
    }
    if (g === "mg" || !firing) bd.mgWas = firing && g === "mg";
    if (firing && g === "mg") bd.blocks.forEach(function (b) {
      if (T[b.t].kind !== "mg" || b.oh > 0) return;
      b.firing = true; b.cool2 = (b.cool2 || 0) - dt;
      if (b.cool2 > 0) return;
      if (bd.energy < MG.e) return;
      b.cool2 = 1 / (MG.rate * (bd.player ? 1 + PM.mgRate : 1)); bd.energy -= MG.e;
      var d = gunDir(bd, b), f = fp(b), tip = gunTip(bd, b);
      FL.shots.push({ x: tip.x, y: tip.y, vx: bd.vx + d.x * MG.speed + (Math.random() - 0.5) * 6, vy: bd.vy + d.y * MG.speed + (Math.random() - 0.5) * 6, life: 0, own: bd });
      FL.parts.push({ x: tip.x, y: tip.y, vx: bd.vx, vy: bd.vy, life: 0, max: 0.06, k: "flash", sz: 1.4 });
      var cn2 = (bd.cool && bd.cool.get(b)) || 0;
      b.heat = (b.heat || 0) + MG.heat / (1 + 0.35 * cn2) * (bd === FL.me && FL.oc ? 0.75 : 1);   // Overcharge: 25 % langsamer heiß
      if (b.heat >= 1) { b.heat = 1; b.oh = b.ohMax = MG.lock / (1 + 0.3 * cn2); for (var i = 0; i < 10; i++) FL.parts.push({ x: tip.x, y: tip.y, vx: bd.vx + (Math.random() - 0.5) * 6, vy: bd.vy + (Math.random() - 0.5) * 6, life: 0, max: 1 + Math.random(), k: "smoke", sz: 1 + Math.random() }); }
    });
    // Raketen: je Werfer 2 Schuss, abgefeuert wird nacheinander aus irgendeinem Werfer mit Munition.
    // Erst wenn alle leer sind, laden alle gemeinsam nach: 2,5 s je Werfer.
    bd.msCd = Math.max(0, (bd.msCd || 0) - dt);
    if (firing && g === "ms" && !(bd.msRl > 0) && bd.msCd <= 0 && bd.energy >= MS.e) {
      var ls = bd.blocks.filter(function (b) { return T[b.t].kind === "ms" && b.ammo > 0; });
      if (ls.length) {
        var lb = ls[(bd.msTurn = ((bd.msTurn || 0) + 1)) % ls.length];
        lb.ammo--; bd.energy -= MS.e; bd.msCd = MS.gap;
        var d = dirWorld(bd, dirOut(lb, 0)), tip = muzzle(bd, lb), side = lb.ammo === 1 ? 0.22 : -0.22, nx = -d.y * side * CELL_M, ny = d.x * side * CELL_M;
        FL.missiles.push({ x: tip.x + nx, y: tip.y + ny, vx: bd.vx + d.x * MS.v0, vy: bd.vy + d.y * MS.v0, h: Math.atan2(d.y, d.x), life: 0, own: bd, aim: aim || null });
        var left = bd.blocks.reduce(function (a, b) { return a + (T[b.t].kind === "ms" ? b.ammo : 0); }, 0);
        if (!left) bd.msRl = bd.msRlMax = MS.reload * bd.blocks.filter(function (b) { return T[b.t].kind === "ms"; }).length / (bd.player ? 1 + PM.msRl : 1);
      }
    }
    if (firing && g === "rg") bd.blocks.forEach(function (b) {
      if (T[b.t].kind !== "rg" || b.cd > 0) return;
      b.holding = true;
      if (bd.energy < RG.e && !b.chg) return;
      b.chg = (b.chg || 0) + dt;
      if (b.chg >= RG.charge) { b.chg = 0; b.cd = RG.cd; bd.energy = Math.max(0, bd.energy - RG.e); fireRail(bd, b); }
    });
    }
  function useOf(bd, d) { var u = 0; bd.blocks.forEach(function (b) { var ty = T[b.t]; if (ty.kind === "thr" && thrustDir(b) === d) u += ty.use; }); return u; }
  // Zielcomputer: Minigun und Railgun schwenken bis 15° zur Zielrichtung (Maus beim Spieler, Vorhaltepunkt bei der KI)
  var TURRET = { max: 15 * Math.PI / 180, rate: 2.6 };
  function gunMount(bd, b) { var d = dirOut(b, 0), f = fp(b), h = T[b.t].h; return { lx: b.x + f[0] / 2 - DV[d][0] * h / 2, ly: b.y + f[1] / 2 - DV[d][1] * h / 2 }; }
  function turretTick(bd, dt, aim) {
    bd.blocks.forEach(function (b) {
      var k = T[b.t].kind; if (k !== "mg" && k !== "rg") return;
      var want = 0;
      if (bd.tcomp && aim) {
        var m = gunMount(bd, b), mw = toWorld(bd, m.lx, m.ly), d = dirWorld(bd, dirOut(b, 0));
        want = Math.max(-TURRET.max, Math.min(TURRET.max, angDiff(Math.atan2(aim.y - mw.y, aim.x - mw.x), Math.atan2(d.y, d.x))));
      }
      var cur = b.tw || 0, st = TURRET.rate * dt; b.tw = cur + Math.max(-st, Math.min(st, want - cur));
    });
  }
  function gunDir(bd, b) { var d = dirWorld(bd, dirOut(b, 0)), a = b.tw || 0; if (!a) return d; var ca = Math.cos(a), sa = Math.sin(a); return { x: d.x * ca - d.y * sa, y: d.x * sa + d.y * ca }; }
  function gunTip(bd, b) {
    if (!b.tw) return muzzle(bd, b);
    var m = gunMount(bd, b), mw = toWorld(bd, m.lx, m.ly), d = gunDir(bd, b), L = (T[b.t].h + 0.1) * CELL_M;
    return { x: mw.x + d.x * L, y: mw.y + d.y * L };
  }
  function muzzle(bd, b) {
    var ty = T[b.t], d = dirOut(b, 0), f = fp(b), cx = b.x + f[0] / 2 + DV[d][0] * (ty.h / 2 + 0.1), cy = b.y + f[1] / 2 + DV[d][1] * (ty.h / 2 + 0.1);
    return toWorld(bd, cx, cy);
  }
  function fireRail(bd, b) {
    var d = gunDir(bd, b), p = gunTip(bd, b), left = RG.dmg, end = { x: p.x + d.x * RG.range, y: p.y + d.y * RG.range }, hits = 0, lastB = null;
    for (var s = 0; s < RG.range; s += 0.8) {
      var x = p.x + d.x * s, y = p.y + d.y * s, h = hitAt(x, y, bd);
      if (h && h.b !== lastB) { lastB = h.b; if (bd === FL.me) hitMark(x, y, h.bd); damage(h.bd, h.b, left, x, y); spark(x, y, 10); left *= 0.55; hits++; if (hits >= 3) { end = { x: x, y: y }; break; } }
    }
    FL.beams.push({ x0: p.x, y0: p.y, x1: end.x, y1: end.y, life: 0 });
  }
  function mouseWorld() {
    if (!V.mouse) return null; var ppm = PX * V.zoom / CELL_M;
    return { x: FL.cam.x + (V.mouse.sx - V.W / 2) / ppm, y: FL.cam.y + (V.mouse.sy - V.H / 2) / ppm };
  }
  // Flächenschaden um einen Punkt (Raketen, explodierende Triebwerke und Reaktoren)
  function blast(x, y, r, dmg, skip, ns) {
    FL.parts.push({ x: x, y: y, vx: 0, vy: 0, life: 0, max: 0.22, k: "flash", sz: r * 1.3 });
    for (var i = 0; i < 10; i++) FL.parts.push({ x: x, y: y, vx: (Math.random() - 0.5) * 14, vy: (Math.random() - 0.5) * 14, life: 0, max: 0.35 + Math.random() * 0.35, k: "fire", sz: 0.8 + Math.random() * r * 0.4 });
    var hits = [];
    FL.bodies.forEach(function (bd) {
      if (bd === skip || Math.abs(x - bd.x) > bd.rad + r || Math.abs(y - bd.y) > bd.rad + r) return;
      bd.blocks.forEach(function (b) { var p = blockCenter(bd, b), d = Math.hypot(p.x - x, p.y - y); if (d < r) hits.push({ bd: bd, b: b, dmg: dmg * (1 - d / r * 0.7) }); });
    });
    hits.forEach(function (h) { var hp2 = blockCenter(h.bd, h.b); damage(h.bd, h.b, h.dmg, hp2.x, hp2.y, ns); });
  }
  function hitAt(x, y, own) {
    for (var i = 0; i < FL.bodies.length; i++) {
      var bd = FL.bodies[i]; if (bd === own) continue;
      if (Math.abs(x - bd.x) > bd.rad || Math.abs(y - bd.y) > bd.rad) continue;
      var l = toLocal(bd, x, y), o = bd.map.get(key(Math.floor(l.x), Math.floor(l.y)));
      if (o) return { bd: bd, b: o.b };
    }
    return null;
  }
  function spark(x, y, n) { for (var i = 0; i < n; i++) { var a = Math.random() * 6.28, v = 8 + Math.random() * 18; FL.parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: 0.2 + Math.random() * 0.25, k: "spark", sz: 0.4 }); } }
  // Schaden: bei 0 Leben fällt der Block weg, lose Teile treiben als eigene Trümmer davon
  // Schild: fängt Treffer ab, solange Schildenergie da ist und mindestens ein Generator arbeitet. Kosten je Schadenspunkt sinken mit mehr Generatoren.
  function shieldAbsorb(bd, b, dmg, x, y) {
    if (!(bd.shE > 0) || !bd.shGen) return dmg;
    var cost = dmg * bd.shEff, p = (x || y) ? { x: x, y: y } : blockCenter(bd, b);
    if (bd.shE >= cost) { bd.shE -= cost; shieldHit(bd, p.x, p.y); return 0; }
    var left = dmg - bd.shE / bd.shEff; bd.shE = 0; shieldHit(bd, p.x, p.y); return left;
  }
  function shieldHit(bd, x, y) {
    var l = toLocal(bd, x, y); FL.shHits.push({ bd: bd, lx: l.x, ly: l.y, x: x, y: y, t: FL.t });
    if (FL.shHits.length > 50) FL.shHits.shift();
  }
  function damage(bd, b, dmg, x, y, ns) {
    if (FL.bodies.indexOf(bd) < 0 || bd.blocks.indexOf(b) < 0) return;   // schon zerstört (Kettenreaktion)
    if (!ns) { dmg = shieldAbsorb(bd, b, dmg, x, y); if (dmg <= 0) return; }
    b.hp -= dmg;
    if (b.hp > 0) return;
    var p = blockCenter(bd, b), col = b.c || T[b.t].col;
    for (var i = 0; i < 8; i++) { var a = Math.random() * 6.28, v = 4 + Math.random() * 10; FL.parts.push({ x: p.x, y: p.y, vx: bd.vx + Math.cos(a) * v, vy: bd.vy + Math.sin(a) * v, life: 0, max: 1.5 + Math.random(), k: "debris", sz: 0.5 + Math.random() * 0.7, col: col, a: Math.random() * 6, w: (Math.random() - 0.5) * 10 }); }
    for (i = 0; i < 6; i++) FL.parts.push({ x: p.x, y: p.y, vx: bd.vx + (Math.random() - 0.5) * 8, vy: bd.vy + (Math.random() - 0.5) * 8, life: 0, max: 0.35 + Math.random() * 0.3, k: "fire", sz: 1.2 + Math.random() });
    FL.parts.push({ x: p.x, y: p.y, vx: bd.vx, vy: bd.vy, life: 0, max: 0.18, k: "flash", sz: 4 });
    bd.blocks.splice(bd.blocks.indexOf(b), 1);
    if (bd === FL.me && bd.lost) bd.lost.push(strip(b));
    if (!bd.blocks.length) FL.bodies.splice(FL.bodies.indexOf(bd), 1); else splitBody(bd);
    // Triebwerke und Reaktoren explodieren und beschädigen, was direkt drumherum liegt
    var kd = T[b.t].kind;
    if (kd === "reac") blast(p.x, p.y, 3.2 * CELL_M, 85, null, true);
    else if (kd === "thr") blast(p.x, p.y, (T[b.t].w > 1 ? 2.4 : 1.8) * CELL_M, T[b.t].w > 1 ? 60 : 40, null, true);
  }
  function splitBody(bd) {
    var comps = components(bd.blocks);
    if (comps.length <= 1) { recalc(bd); return; }
    var keep = comps.reduce(function (a, c) { return mainScore(c) > mainScore(a) ? c : a; });
    comps.forEach(function (cp) {
      if (cp === keep) return;
      if (bd === FL.me && bd.lost) cp.forEach(function (b) { bd.lost.push(strip(b)); });
      var nb = { blocks: cp, x: 0, y: 0, a: bd.a, vx: bd.vx, vy: bd.vy, w: bd.w + (Math.random() - 0.5) * 0.8, ctrl: false, energy: 0, cap: 0, flames: {} };
      var st = stats(cp), c = toWorld(bd, st.com[0], st.com[1]);
      recalc(nb, true); nb.x = c.x; nb.y = c.y;
      var rx = c.x - bd.x, ry = c.y - bd.y, l = Math.hypot(rx, ry) || 1;
      nb.vx += -bd.w * ry + rx / l * (2 + Math.random() * 3); nb.vy += bd.w * rx + ry / l * (2 + Math.random() * 3);
      FL.bodies.push(nb);
    });
    bd.blocks = keep; recalc(bd);
    if (bd === FL.me && !bd.seat && FL.seated) { FL.seated = false; var sp = seatPos(bd); FL.pilot.x = sp.x; FL.pilot.y = sp.y; }
  }

  // Schweif der Vortriebsdüsen (Schub nach vorne): Punkte bleiben im Raum stehen und verblassen, so sieht man die eigene Bahn
  var TRAIL = { life: 1.8, step: 0.04, alpha: 0.17 };
  function trailTick() {
    FL.bodies.forEach(function (bd) {
      bd.blocks.forEach(function (b) {
        var ty = T[b.t]; if (ty.kind !== "thr" || thrustDir(b) !== 0) return;
        // Schweif auch im Gleitflug, solange das Schiff fliegt; mit Schub heller
        var tr = b.trail || (b.trail = []), sp = Math.hypot(bd.vx, bd.vy), fk = Math.max(bd.flames[0] || 0, sp > 2 ? Math.min(0.45, sp / 40) : 0);
        while (tr.length && (tr[0] === null || FL.t - tr[0].t > TRAIL.life)) tr.shift();
        if (fk < 0.05) { if (tr.length && tr[tr.length - 1] !== null) tr.push(null); return; }
        var last = tr[tr.length - 1]; if (last && FL.t - last.t < TRAIL.step) return;
        var f = fp(b), p = toWorld(bd, b.x + f[0] / 2 + DV[2][0] * ty.h / 2, b.y + f[1] / 2 + DV[2][1] * ty.h / 2);
        tr.push({ x: p.x, y: p.y, t: FL.t, k: fk, w: ty.w * CELL_M * 0.32 });
      });
    });
  }
  function drawTrails(c) {
    c.lineCap = "butt";
    FL.bodies.forEach(function (bd) {
      bd.blocks.forEach(function (b) {
        var tr = b.trail; if (!tr || tr.length < 2) return;
        for (var i = 1; i < tr.length; i++) {
          var a = tr[i - 1], q = tr[i]; if (!a || !q) continue;
          var age = (FL.t - q.t) / TRAIL.life; if (age >= 1) continue;
          c.strokeStyle = "rgba(150,200,255," + (TRAIL.alpha * (1 - age) * Math.min(1, q.k * 1.4)) + ")"; c.lineWidth = q.w * (1 - age * 0.6);
          c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(q.x, q.y); c.stroke();
        }
      });
    });
    c.lineCap = "butt";
  }
  // Staub für das Tempogefühl: eine Schicht auf Höhe der Schiffe (Parallaxe 1) und sehr wenige große, weiche Körner
  // zwischen Schiff und Kamera (Parallaxe 2,2), die am schnellsten vorbeiziehen. Mit Tempo werden sie zu kurzen Bewegungsstreifen.
  var DUST = {
    near: { f: 1, tile: 60, n: 6, prob: 1, size: 0.22, minPx: 1, maxPx: 2.2, alpha: 0.32, col: "205,212,226", seed: 11 },
    front: { f: 2.2, tile: 55, n: 1, prob: 0.45, size: 0.5, minPx: 2, maxPx: 5, alpha: 0.16, col: "220,226,236", seed: 37 }
  };
  function dHash(x, y, i, sd) { var v = Math.sin(x * 127.1 + y * 311.7 + i * 74.7 + sd * 19.3) * 43758.5453; return v - Math.floor(v); }
  function drawDust(c, W, H, ppm, L) {
    var sc = ppm * L.f, cx = FL.cam.x, cy = FL.cam.y, hw = W / 2 / sc, hh = H / 2 / sc;
    var src = FL.out && FL.eva ? FL.eva : FL.me, vx = src.vx || 0, vy = src.vy || 0, vs = Math.hypot(vx, vy);
    var fade = L.f === 1 ? Math.min(1, ppm / 4) : 1; if (fade <= 0.05) return;
    // Streifen: Belichtungszeit 35 ms, begrenzt auf 140 px, erst ab spürbarem Tempo
    var sl = Math.min(140, vs * sc * 0.035), sx = vs > 0 ? -vx / vs * sl : 0, sy = vs > 0 ? -vy / vs * sl : 0, streak = sl > 1.5;
    var px = Math.max(L.minPx, Math.min(L.maxPx, L.size * sc)), x0 = Math.floor((cx - hw) / L.tile) - 1, x1 = Math.floor((cx + hw) / L.tile) + 1, y0 = Math.floor((cy - hh) / L.tile) - 1, y1 = Math.floor((cy + hh) / L.tile) + 1;
    if ((x1 - x0) * (y1 - y0) > 900) return;
    var a = L.alpha * fade * (streak ? Math.max(0.55, 1 - sl / 300) : 1);
    c.save();
    c.strokeStyle = "rgba(" + L.col + "," + a + ")"; c.fillStyle = c.strokeStyle; c.lineWidth = px; c.lineCap = "round";
    if (streak) c.beginPath();
    for (var ix = x0; ix <= x1; ix++) for (var iy = y0; iy <= y1; iy++) for (var i = 0; i < L.n; i++) {
      if (L.prob < 1 && dHash(ix, iy, i + 7, L.seed) > L.prob) continue;
      var ux = (ix + dHash(ix, iy, i, L.seed)) * L.tile, uy = (iy + dHash(ix, iy, i + 3, L.seed)) * L.tile;
      var X = W / 2 + (ux - cx) * sc, Y = H / 2 + (uy - cy) * sc;
      if (X < -sl - 10 || X > W + sl + 10 || Y < -sl - 10 || Y > H + sl + 10) continue;
      if (streak) { c.moveTo(X, Y); c.lineTo(X + sx, Y + sy); } else c.fillRect(X - px / 2, Y - px / 2, px, px);
    }
    if (streak) c.stroke();
    c.restore();
  }
  // Eintritt in hohe Geschwindigkeit: kaum spürbares Wackeln (max. 2 px) und kurze chromatische Aberration (SVG-Filter auf dem Canvas)
  function fxPre(ppm, tm) {
    var dt = FL.fxT ? Math.min(0.05, tm - FL.fxT) : 0; FL.fxT = tm;
    var off = { x: 0, y: 0 };
    if (FL.shake > 0) { FL.shake -= dt; var a = 2 * Math.max(0, FL.shake / 0.7); off.x = (Math.sin(tm * 53) + Math.sin(tm * 31.7)) * 0.5 * a / ppm; off.y = (Math.sin(tm * 47.3) + Math.cos(tm * 29.1)) * 0.5 * a / ppm; }
    var f = V.root.querySelector("#srCAo1");
    if (FL.ca > 0 && f) {
      FL.ca -= dt; var k = Math.max(0, FL.ca / 0.5), me = FL.me, sp = Math.hypot(me.vx, me.vy) || 1, d = 3.2 * k;
      var dx = (me.vx / sp) * d, dy = (me.vy / sp) * d;
      f.setAttribute("dx", dx.toFixed(2)); f.setAttribute("dy", dy.toFixed(2));
      var f2 = V.root.querySelector("#srCAo2"); f2.setAttribute("dx", (-dx).toFixed(2)); f2.setAttribute("dy", (-dy).toFixed(2));
      if (!V.caOn) { V.cv.style.filter = "url(#srCA)"; V.caOn = true; }
    } else if (V.caOn) { V.cv.style.filter = ""; V.caOn = false; }
    return off;
  }
  // ---------- Perk-Drops und Inventar ----------
  // Besiegte Schiffe lassen Perks fallen (kleine Schiffe 1, mittlere 2). Drüberfliegen sammelt sie ein, dann öffnet sich das Inventar und das Spiel pausiert.
  function rollRarity() {
    var w = RAR.map(function (r, i) { return r.w * (i === 3 ? 1 + PM.luck : 1); }), sum = w.reduce(function (a, b) { return a + b; }, 0), x = Math.random() * sum;
    for (var i = 0; i < 4; i++) { x -= w[i]; if (x <= 0) return i; } return 0;
  }
  function dropPerks(bd) {
    var n = bd.npc && bd.npc.cls === "M" ? 2 : 1;
    for (var i = 0; i < n; i++) {
      var r = rollRarity(), pool = []; PERKS.forEach(function (p, pi) { if (!p.legOnly || r === 3) pool.push(pi); });
      var a = Math.random() * 6.28, v = 2 + Math.random() * 3;
      FL.drops.push({ x: bd.x, y: bd.y, vx: bd.vx * 0.6 + Math.cos(a) * v, vy: bd.vy * 0.6 + Math.sin(a) * v, p: pool[Math.floor(Math.random() * pool.length)], r: r, ph: Math.random() * 6 });
    }
  }
  function dropTick(dt) {
    var me = FL.me, alive = FL.bodies.indexOf(me) >= 0;
    FL.drops = FL.drops.filter(function (d) {
      var dmp = Math.pow(0.85, dt); d.vx *= dmp; d.vy *= dmp; d.x += d.vx * dt; d.y += d.vy * dt; d.ph += dt;
      if (Math.hypot(d.x - FL.cam.x, d.y - FL.cam.y) > 4000) return false;
      var got = false;
      if (alive && Math.hypot(d.x - me.x, d.y - me.y) < me.rad + 3) {
        var l = toLocal(me, d.x, d.y), cx = Math.floor(l.x), cy = Math.floor(l.y);
        for (var ox = -1; ox <= 1 && !got; ox++) for (var oy = -1; oy <= 1 && !got; oy++) if (me.map.has(key(cx + ox, cy + oy))) got = true;
      }
      if (!got && FL.out && FL.eva && Math.hypot(d.x - FL.eva.x, d.y - FL.eva.y) < 3) got = true;
      if (got) pickPerk(d);
      return !got;
    });
  }
  function pickPerk(d) {
    var it = { uid: ++FL.uid, p: d.p, r: d.r, on: false, isNew: true };
    FL.inv.push(it); spark(d.x, d.y, 12);
    floatTxt(PERKS[d.p].n[lang] + " · " + RAR[d.r].n[lang], RAR[d.r].rgb);
    openInv(it.uid);
  }
  function drawDrops(c, ppm, tm) {
    FL.drops.forEach(function (d) {
      var R = RAR[d.r], pulse = 0.75 + 0.25 * Math.sin(d.ph * 4), rr = Math.max(3.2, 9 / ppm) * pulse;
      var g = c.createRadialGradient(d.x, d.y, 0, d.x, d.y, rr * 2.4); g.addColorStop(0, "rgba(" + R.rgb + ",.55)"); g.addColorStop(1, "rgba(" + R.rgb + ",0)");
      c.fillStyle = g; c.beginPath(); c.arc(d.x, d.y, rr * 2.4, 0, Math.PI * 2); c.fill();
      var k = Math.max(1.1, 4 / ppm);
      c.save(); c.translate(d.x, d.y); c.rotate(d.ph * 0.8);
      c.fillStyle = R.col; c.beginPath(); c.moveTo(0, -k * 1.4); c.lineTo(k, 0); c.lineTo(0, k * 1.4); c.lineTo(-k, 0); c.closePath(); c.fill();
      c.fillStyle = "rgba(255,255,255,.85)"; c.beginPath(); c.moveTo(0, -k * 0.6); c.lineTo(k * 0.4, 0); c.lineTo(0, k * 0.6); c.lineTo(-k * 0.4, 0); c.closePath(); c.fill();
      c.restore();
    });
  }
  // Perk-Wechsel: Werte neu berechnen; HP bleiben anteilig erhalten
  function applyPerks() {
    var me = FL.me, old = me.blocks.map(function (b) { return hpMax(me, b); });
    PM = calcPM(FL.inv); recalc(me);
    me.blocks.forEach(function (b, i) { b.hp = b.hp * hpMax(me, b) / old[i]; });
    syncInv();
  }
  function openInv(hl) {
    if (!FL) return; FL.paused = true; FL.fire = false; FL.keys = {};
    var el = V.root.querySelector(".sr-inv"); el.hidden = false; FL.invHl = hl || 0; renderInv();
  }
  function closeInv() { if (!FL) return; FL.paused = false; V.root.querySelector(".sr-inv").hidden = true; FL.inv.forEach(function (it) { it.isNew = false; }); last = 0; }
  function renderInv() {
    var list = V.root.querySelector(".sr-inv-list"), rows = [];
    PERKS.forEach(function (p, pi) {
      var its = FL.inv.filter(function (it) { return it.p === pi; }); if (!its.length) return;
      its.sort(function (a, b) { return a.r - b.r || a.uid - b.uid; });
      rows.push('<div class="sr-inv-row"><div class="sr-inv-n"><b>' + p.n[lang] + "</b><span>" + (p.fixed ? p.d[lang] : p.d[lang].replace("{v}", p.lo + "–" + p.hi + " %")) + '</span></div><div class="sr-inv-chips">' + its.map(function (it) {
        return '<button type="button" class="sr-chip' + (it.on ? " on" : "") + (it.uid === FL.invHl ? " new" : "") + '" data-perk="' + it.uid + '" style="--rc:' + RAR[it.r].col + ";--rr:" + RAR[it.r].rgb + '" title="' + RAR[it.r].n[lang] + ": " + perkTxt(p, it.r) + '">' + perkTag(p, it.r) + "</button>";
      }).join("") + "</div></div>");
    });
    list.innerHTML = rows.join("");
    var nw = list.querySelector(".sr-chip.new"); if (nw && nw.scrollIntoView) nw.scrollIntoView({ block: "center" }); else list.parentNode.scrollTop = 0;
    syncInv();
  }
  function syncInv() {
    var n = FL.inv.filter(function (it) { return it.on; }).length, el = V.root.querySelector(".sr-inv-cnt");
    if (el) el.textContent = fmt(t("invActive"), { n: n, m: FL.inv.length });
    var hb = V.root.querySelector('[data-act="inv"]'); if (hb) hb.textContent = t("perksBtn") + (n ? " · " + n : "");
  }
  function togglePerk(uid) {
    var it = FL.inv.filter(function (q) { return q.uid === uid; })[0]; if (!it) return;
    it.on = !it.on; applyPerks();
    var b = V.root.querySelector('[data-perk="' + uid + '"]'); if (b) b.classList.toggle("on", it.on);
  }
  // Spieltipps: außerhalb von Kämpfen alle 60 s ein zufälliger Tipp für 5 s, unten in der Mitte, per Klick wegklickbar
  var TIPS = {
    de: ["Seitliche Triebwerke können die Wendigkeit deines Schiffs stark verbessern.", "Overcharge (X) erhöht kurzzeitig deine Triebwerksleistung und die Kühlleistung der Miniguns.", "Mehrere Batterien erhöhen deine Energiekapazität, aber Batterien sind auch sehr schwer.", "Baue einen Zielcomputer ein, damit sich deine Waffen beim Zielen auf den Feind ausrichten können.", "Antennen warnen dich vor feindlichen Schiffen.", "Behalte deine Geschwindigkeit im Auge.", "Ordentliche Bremstriebwerke können dir das Leben retten.", "Die Beschleunigungstriebwerke sind im Kampf am unwichtigsten.", "Wenn du deine Triebwerke benutzt, wirst du von gegnerischen Schiffen schneller entdeckt."],
    en: ["Side thrusters can greatly improve your ship's agility.", "Overcharge (X) briefly boosts your thruster output and the cooling of your miniguns.", "More batteries raise your energy capacity, but batteries are also very heavy.", "Install a targeting computer so your weapons can swivel towards the enemy as you aim.", "Antennas warn you about enemy ships.", "Keep an eye on your speed.", "Good braking thrusters can save your life.", "Forward thrusters matter least in combat.", "Using your thrusters makes enemy ships spot you sooner."]
  };
  var TIP = { every: 60, show: 5 };
  function inCombat() {
    var me = FL.me, rg = antRange(me), mv = minView();
    return FL.bodies.some(function (bd) {
      if (!bd.enemy || bd.dead || bd.disarmed) return false;
      if (Math.abs(bd.x - me.x) < mv.hw + bd.rad && Math.abs(bd.y - me.y) < mv.hh + bd.rad) return true;   // im ganz herausgezoomten Bild
      return rg > 0 && Math.hypot(bd.x - me.x, bd.y - me.y) < rg;   // im Antennenradar
    });
  }
  function tipTick(dt) {
    var el = V.root.querySelector(".sr-tip"); if (!el) return;
    if (inCombat()) { FL.tipT = 0; if (!el.hidden) hideTip(el); return; }
    FL.tipT = (FL.tipT || 0) + dt;
    if (FL.tipT >= TIP.every) {
      FL.tipT = 0; var L = TIPS[lang], i; do { i = Math.floor(Math.random() * L.length); } while (L.length > 1 && i === FL.tipLast); FL.tipLast = i;
      el.textContent = L[i]; el.hidden = false; el.classList.remove("out"); void el.offsetWidth; el.classList.add("in");
      clearTimeout(V.tipTo); V.tipTo = setTimeout(function () { if (V) hideTip(el); }, TIP.show * 1000);
    }
  }
  function hideTip(el) { clearTimeout(V.tipTo); el.classList.remove("in"); el.classList.add("out"); setTimeout(function () { if (V && el.classList.contains("out")) el.hidden = true; }, 400); }
  // Kurzer Schriftzug über dem Schiff: 0,5 s sichtbar, bis 1 s ausgeblendet
  function floatTxt(txt, rgb) { if (FL) FL.flt = { txt: txt, t0: FL.t, rgb: rgb || "232,236,239" }; }
  function drawFloat(c, W, H, ppm) {
    var f = FL.flt; if (!f) return;
    var age = FL.t - f.t0; if (age >= 1) { FL.flt = null; return; }
    var a = age < 0.5 ? 1 : 1 - (age - 0.5) / 0.5, me = FL.me;
    var x = W / 2 + (me.x - FL.cam.x) * ppm, y = H / 2 + (me.y - FL.cam.y) * ppm - Math.max(40, me.rad * ppm * 0.85) - 14 - age * 10;
    c.save(); c.font = "600 13px " + FONTS(); c.textAlign = "center"; c.textBaseline = "middle";
    c.fillStyle = "rgba(0,0,0," + 0.5 * a + ")"; c.fillText(f.txt, x + 1, y + 1);
    c.fillStyle = "rgba(" + f.rgb + "," + a + ")"; c.fillText(f.txt, x, y); c.restore();
  }
  function flDraw() {
    var c = V.ctx, W = V.W, H = V.H, z = V.zoom, s = PX * z, ppm = s / CELL_M, tm = performance.now() / 1000;
    var shk = fxPre(ppm, tm); FL.cam.x += shk.x; FL.cam.y += shk.y;
    drawSpace(c, W, H, FL.cam.x * ppm, FL.cam.y * ppm);
    drawDust(c, W, H, ppm, DUST.near);
    c.save(); c.translate(W / 2, H / 2); c.scale(ppm, ppm); c.translate(-FL.cam.x, -FL.cam.y);
    drawTrails(c);
    drawDrops(c, ppm, tm);
    // Triebwerksflammen unter den Schiffen
    FL.bodies.forEach(function (bd) {
      bd.blocks.forEach(function (b) {
        var ty = T[b.t]; if (ty.kind !== "thr") return;
        var d = thrustDir(b), fk = bd.flames[d] || 0; if (fk < 0.02) return;
        var ex = dirWorld(bd, (d + 2) % 4), f = fp(b), base = toWorld(bd, b.x + f[0] / 2 + DV[(d + 2) % 4][0] * ty.h / 2, b.y + f[1] / 2 + DV[(d + 2) % 4][1] * ty.h / 2);
        var ocx = bd === FL.me && FL.oc, L = (ty.w + 1) * CELL_M * (0.2 + 1.1 * fk) * (ocx ? 1.45 : 1) * (0.88 + Math.random() * 0.24), wd = ty.w * CELL_M * (0.18 + 0.16 * fk) * (ocx ? 1.2 : 1);
        var gr = c.createLinearGradient(base.x, base.y, base.x + ex.x * L, base.y + ex.y * L);
        if (ocx) { gr.addColorStop(0, "rgba(255,255,255,.98)"); gr.addColorStop(0.3, "rgba(200,140,255,.85)"); gr.addColorStop(1, "rgba(150,80,255,0)"); }
        else { gr.addColorStop(0, "rgba(190,240,255,.95)"); gr.addColorStop(0.35, "rgba(90,170,255,.7)"); gr.addColorStop(1, "rgba(60,100,255,0)"); }
        if (ocx) {   // Overcharge: wilder, ausfransender Strahl statt spitzer Flamme
          var ang = Math.atan2(ex.y, ex.x);
          c.save(); c.translate(base.x, base.y); c.rotate(ang);
          for (var lb = 0; lb < 7; lb++) {
            var la = (Math.random() - 0.5) * 0.7, ll = L * (0.45 + Math.random() * 0.7), lwd = wd * (0.45 + Math.random() * 0.8);
            var g2 = c.createLinearGradient(0, 0, ll, 0); g2.addColorStop(0, "rgba(255,255,255,.9)"); g2.addColorStop(0.35, "rgba(205,150,255,.6)"); g2.addColorStop(1, "rgba(140,70,255,0)");
            c.save(); c.rotate(la); c.fillStyle = g2; c.beginPath(); c.moveTo(0, -wd * 0.8);
            c.quadraticCurveTo(ll * 0.45, -lwd * 1.3, ll, -lwd * (0.3 + Math.random() * 0.5)); c.lineTo(ll * (0.85 + Math.random() * 0.2), 0); c.lineTo(ll, lwd * (0.3 + Math.random() * 0.5));
            c.quadraticCurveTo(ll * 0.45, lwd * 1.3, 0, wd * 0.8); c.closePath(); c.fill(); c.restore();
          }
          c.fillStyle = "rgba(255,255,255,.85)"; c.beginPath(); c.ellipse(wd * 0.3, 0, wd * 0.8, wd * 0.6, 0, 0, Math.PI * 2); c.fill();
          c.restore();
          if (Math.random() < 0.6) { var sa = ang + (Math.random() - 0.5) * 0.9, sv = 25 + Math.random() * 30; FL.parts.push({ x: base.x, y: base.y, vx: bd.vx + Math.cos(sa) * sv, vy: bd.vy + Math.sin(sa) * sv, life: 0, max: 0.25 + Math.random() * 0.3, k: "ocs", sz: 0.4 }); }
        } else { c.fillStyle = gr; c.beginPath(); c.moveTo(base.x - ex.y * wd, base.y + ex.x * wd); c.lineTo(base.x + ex.x * L, base.y + ex.y * L); c.lineTo(base.x + ex.y * wd, base.y - ex.x * wd); c.closePath(); c.fill(); }
      });
    });
    FL.bodies.forEach(function (bd) {
      c.save(); c.translate(bd.x, bd.y); c.rotate(bd.a); c.scale(CELL_M / PX, CELL_M / PX); c.translate(-bd.com[0] * PX, -bd.com[1] * PX);
      drawShip(c, bd.blocks, PX, bd.enemy ? "out" : S.view, tm, bd, bd.map);
      if (bd === FL.me && !FL.seated) drawGhosts(c, bd, tm);
      if (bd === FL.me && !FL.seated && !FL.out) drawAstronaut(c, FL.pilot.x * PX, FL.pilot.y * PX, FL.pilot.face, FL.pilot.ph, PX / 24 * 1.25, FL.welding);
      // Überhitzung und Ladung an den Waffen
      bd.blocks.forEach(function (b) {
        var ty = T[b.t], f = fp(b), cx = (b.x + f[0] / 2) * PX, cy = (b.y + f[1] / 2) * PX;
        if (ty.kind === "mg" && (b.oh > 0 || (b.heat || 0) >= MG.warn)) {
          c.save(); c.translate(cx, cy); c.rotate(-bd.a);
          if (b.oh > 0) {
            c.strokeStyle = "rgba(255,255,255,.25)"; c.lineWidth = 3; c.beginPath(); c.arc(0, -PX * 1.4, PX * 0.55, 0, Math.PI * 2); c.stroke();
            c.strokeStyle = "#E0533F"; c.beginPath(); c.arc(0, -PX * 1.4, PX * 0.55, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (b.oh / (b.ohMax || MG.lock))); c.stroke();
            c.fillStyle = "#E0533F"; c.font = "800 12px " + FONTS(); c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("!!!", 0, -PX * 1.4);
          } else { c.fillStyle = "#E3B83F"; c.fillRect(-7, -PX * 1.4 - 9, 14, 18); c.fillStyle = "#151715"; c.font = "800 13px " + FONTS(); c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("!", 0, -PX * 1.4 + 1); }
          c.restore();
        }
      });
      c.restore();
    });
    if (FL.out && FL.eva) { c.save(); c.translate(FL.eva.x, FL.eva.y); c.scale(CELL_M / PX, CELL_M / PX); drawAstronaut(c, 0, 0, FL.eva.face, FL.eva.ph, 1.25, FL.welding); c.restore(); }
    (FL.missiles || []).forEach(function (m) {
      c.save(); c.translate(m.x, m.y); c.rotate(m.h);
      c.fillStyle = "rgba(255,190,90,.85)"; c.beginPath(); c.moveTo(-0.9, -0.28); c.lineTo(-2.4 - Math.random() * 0.8, 0); c.lineTo(-0.9, 0.28); c.closePath(); c.fill();
      c.fillStyle = "#E9ECEE"; c.fillRect(-0.9, -0.22, 1.6, 0.44); c.fillStyle = "#C8473A"; c.beginPath(); c.moveTo(0.7, -0.22); c.lineTo(1.1, 0); c.lineTo(0.7, 0.22); c.closePath(); c.fill();
      c.restore();
    });
    // Gegner: rotes ! beim Entdecken, Schild „Kampfunfähig“ über besiegten Schiffen
    FL.bodies.forEach(function (bd) {
      if (!bd.enemy) return;
      var yy = bd.y - bd.rad * 0.8 - 14 / ppm;
      if (bd.ai && bd.ai.alert > 0) { c.fillStyle = "rgba(224,83,63," + Math.min(1, bd.ai.alert * 2) + ")"; c.font = "800 " + (20 / ppm) + "px " + FONTS(); c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("!", bd.x, yy); }
      if (bd.dead || bd.disarmed) { var lb = t(bd.dead ? "destroyed" : "ko"); c.font = "700 " + (11 / ppm) + "px " + FONTS(); c.textAlign = "center"; c.textBaseline = "middle"; var tw = c.measureText(lb).width; c.fillStyle = "rgba(20,24,30,.8)"; c.fillRect(bd.x - tw / 2 - 5 / ppm, yy - 8 / ppm, tw + 10 / ppm, 16 / ppm); c.fillStyle = bd.dead ? "#F08A78" : "#C9D1D9"; c.fillText(lb, bd.x, yy); }
    });
    // Schildtreffer: dünne blaue Schicht direkt über der Panzerung, nur rund um die Einschlagstelle, blendet in 0,5 s aus
    if (FL.shHits.length) {
      c.save(); c.globalCompositeOperation = "lighter";
      FL.shHits = FL.shHits.filter(function (h) {
        var age = FL.t - h.t, bd = h.bd; if (age > 0.5 || FL.bodies.indexOf(bd) < 0) return false;
        var a = 1 - age / 0.5, R2 = 2.3, ca = Math.cos(bd.a), sa = Math.sin(bd.a), half = CELL_M * 0.5 + 0.35;
        c.save(); c.translate(bd.x, bd.y); c.rotate(bd.a);
        bd.cells.forEach(function (q) {
          var d = Math.hypot(q[0] - h.lx, q[1] - h.ly); if (d > R2) return;
          var k = Math.pow(1 - d / R2, 1.6) * a, lx = (q[0] - bd.com[0]) * CELL_M, ly = (q[1] - bd.com[1]) * CELL_M;
          c.fillStyle = "rgba(80,160,255," + (0.32 * k) + ")"; c.fillRect(lx - half, ly - half, half * 2, half * 2);
        });
        var hx = (h.lx - bd.com[0]) * CELL_M, hy = (h.ly - bd.com[1]) * CELL_M, rr = 0.6 + (1 - a) * 1.6;
        c.strokeStyle = "rgba(170,215,255," + (0.85 * a) + ")"; c.lineWidth = 0.25; c.beginPath(); c.arc(hx, hy, rr, 0, Math.PI * 2); c.stroke();
        c.fillStyle = "rgba(210,235,255," + (0.7 * a) + ")"; c.beginPath(); c.arc(hx, hy, 0.35 * a + 0.1, 0, Math.PI * 2); c.fill();
        c.restore();
        return true;
      });
      c.restore();
    }
    // Treffermarker: kleines x
    FL.hits.forEach(function (h) {
      var a = 1 - h.life / 0.35, r = (h.crit ? 7 + h.life * 10 : 4 + h.life * 6) / ppm;
      c.strokeStyle = "rgba(0,0,0," + 0.5 * a + ")"; c.lineWidth = 3 / ppm; c.beginPath(); c.moveTo(h.x - r, h.y - r); c.lineTo(h.x + r, h.y + r); c.moveTo(h.x + r, h.y - r); c.lineTo(h.x - r, h.y + r); c.stroke();
      c.strokeStyle = h.crit ? "rgba(255,210,80," + a + ")" : "rgba(255,255,255," + a + ")"; c.lineWidth = (h.crit ? 2 : 1.4) / ppm; c.stroke();
    });
    // Zielcomputer: roter Ziellaser der Railgun, solange sie lädt
    FL.bodies.forEach(function (bd) {
      if (!bd.tcomp) return;
      bd.blocks.forEach(function (b) {
        if (T[b.t].kind !== "rg" || !(b.chg > 0)) return;
        var d = gunDir(bd, b), p = gunTip(bd, b), L = RG.range;
        for (var q = 2; q < RG.range; q += 2) { var h = hitAt(p.x + d.x * q, p.y + d.y * q, bd); if (h) { L = q; break; } }
        var k = Math.min(1, b.chg / RG.charge);
        c.strokeStyle = "rgba(255,60,50," + (0.25 + 0.45 * k) + ")"; c.lineWidth = (0.6 + 0.8 * k) / ppm * 2;
        c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x + d.x * L, p.y + d.y * L); c.stroke();
        if (L < RG.range) { c.fillStyle = "rgba(255,90,70," + (0.5 + 0.5 * k) + ")"; c.beginPath(); c.arc(p.x + d.x * L, p.y + d.y * L, 3 / ppm, 0, Math.PI * 2); c.fill(); }
      });
    });
    // Geschosse, Strahlen, Partikel
    c.strokeStyle = "#FFD27A"; c.lineWidth = 0.5;
    FL.shots.forEach(function (p) { var l = Math.hypot(p.vx, p.vy) || 1; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - p.vx / l * 2.4, p.y - p.vy / l * 2.4); c.stroke(); });
    FL.beams.forEach(function (b) { var a = 1 - b.life / 0.3; c.strokeStyle = "rgba(140,230,255," + a + ")"; c.lineWidth = 1.4 * a + 0.2; c.beginPath(); c.moveTo(b.x0, b.y0); c.lineTo(b.x1, b.y1); c.stroke(); c.strokeStyle = "rgba(255,255,255," + a + ")"; c.lineWidth = 0.4; c.stroke(); });
    FL.parts.forEach(function (q) {
      var k = q.life / q.max;
      if (q.k === "smoke") { c.fillStyle = "rgba(70,70,74," + (0.38 * (1 - k)) + ")"; c.beginPath(); c.arc(q.x, q.y, q.sz * (1 + k * 1.6), 0, Math.PI * 2); c.fill(); }
      else if (q.k === "fire") { c.fillStyle = "rgba(255," + Math.round(200 - k * 140) + ",60," + (0.9 * (1 - k)) + ")"; c.beginPath(); c.arc(q.x, q.y, q.sz * (1 - k * 0.5), 0, Math.PI * 2); c.fill(); }
      else if (q.k === "ocs") { c.fillStyle = "rgba(220,180,255," + (1 - k) + ")"; c.fillRect(q.x, q.y, 0.45, 0.45); }
      else if (q.k === "suck") { c.fillStyle = "rgba(110,180,255," + (0.45 * Math.sin(Math.PI * k)) + ")"; c.beginPath(); c.arc(q.x, q.y, q.sz * (1.4 - k), 0, Math.PI * 2); c.fill(); }
      else if (q.k === "jet") { c.fillStyle = "rgba(220,235,255," + (0.8 * (1 - k)) + ")"; c.beginPath(); c.arc(q.x, q.y, q.sz * (1 + k), 0, Math.PI * 2); c.fill(); }
      else if (q.k === "weld") { c.fillStyle = "rgba(170,230,255," + (1 - k) + ")"; c.fillRect(q.x, q.y, 0.35, 0.35); }
      else if (q.k === "spark") { c.fillStyle = "rgba(255,230,160," + (1 - k) + ")"; c.fillRect(q.x, q.y, 0.4, 0.4); }
      else if (q.k === "flash") { c.fillStyle = "rgba(255,240,200," + (1 - k) + ")"; c.beginPath(); c.arc(q.x, q.y, q.sz, 0, Math.PI * 2); c.fill(); }
      else if (q.k === "debris") { c.save(); c.translate(q.x, q.y); c.rotate(q.a); c.globalAlpha = 1 - k * k; c.fillStyle = q.col; c.fillRect(-q.sz / 2, -q.sz / 2, q.sz, q.sz * 0.6); c.restore(); c.globalAlpha = 1; }
    });
    c.restore();
    drawDust(c, W, H, ppm, DUST.front);
    radarEdges(c, W, H, ppm);
    drawFloat(c, W, H, ppm);
    FL.cam.x -= shk.x; FL.cam.y -= shk.y;
    flHud();
  }
  // Antennen: Gegner außerhalb des Bildes, aber in Antennenreichweite, als rotes Dreieck am Bildschirmrand
  function antRange(bd) { return bd.nAnt ? Math.min(1800, 600 + 300 * (bd.nAnt - 1)) * (bd.player ? 1 + PM.radar : 1) : 0; }
  function radarEdges(c, W, H, ppm) {
    var me = FL.me, rg = antRange(me); if (!rg || FL.bodies.indexOf(me) < 0) return;
    FL.bodies.forEach(function (bd) {
      if (!bd.enemy || bd.dead) return;
      var d = Math.hypot(bd.x - me.x, bd.y - me.y); if (d > rg) return;
      var sx = W / 2 + (bd.x - FL.cam.x) * ppm, sy = H / 2 + (bd.y - FL.cam.y) * ppm, m = 26;
      if (sx > -10 && sx < W + 10 && sy > -10 && sy < H + 10) return;
      var vx = sx - W / 2, vy = sy - H / 2, L = m, R = W - m, Tp = 84, Bt = H - m;   // oben unter der Werkzeugleiste bleiben
      var k = Math.min(vx > 0 ? (R - W / 2) / vx : vx < 0 ? (L - W / 2) / vx : 1e9, vy > 0 ? (Bt - H / 2) / vy : vy < 0 ? (Tp - H / 2) / vy : 1e9), ex = W / 2 + vx * k, ey = H / 2 + vy * k, an = Math.atan2(vy, vx);
      c.save(); c.translate(ex, ey); c.rotate(an); c.globalAlpha = 0.55 + 0.35 * (1 - d / rg);
      c.fillStyle = "#E0533F"; c.beginPath(); c.moveTo(11, 0); c.lineTo(-5, -6.5); c.lineTo(-1.5, 0); c.lineTo(-5, 6.5); c.closePath(); c.fill();
      c.restore();
      c.fillStyle = "rgba(240,138,120,.75)"; c.font = "600 10px " + FONTS(); c.textAlign = "center"; c.textBaseline = "middle";
      c.fillText(nf(d) + " m", ex - Math.cos(an) * 20, ey - Math.sin(an) * 20);
    });
  }
  // Hologramme zerstörter Blöcke in der Nähe der Figur: blau = lässt sich aufbauen, rot = erst Nachbarblock aufbauen
  function drawGhosts(c, bd, tm) {
    if (!bd.lost || !bd.lost.length) return;
    var p = FL.out && FL.eva ? toLocal(bd, FL.eva.x, FL.eva.y) : FL.pilot;
    bd.lost.forEach(function (g) {
      var f = fp(g); if (Math.hypot(g.x + f[0] / 2 - p.x, g.y + f[1] / 2 - p.y) > 6) return;
      var ok = canRebuild(bd, g), on = FL.weldG === g, pulse = 0.5 + 0.5 * Math.sin(tm * 5);
      c.save(); c.globalAlpha = on ? 0.55 : 0.32; drawBlock(c, g, PX, S.view, 1, tm, null); c.restore();
      c.fillStyle = ok ? "rgba(90,200,255," + (0.16 + (on ? 0.14 * pulse : 0)) + ")" : "rgba(240,90,70,.2)";
      c.strokeStyle = ok ? "rgba(140,225,255,.85)" : "rgba(240,110,90,.8)"; c.lineWidth = 1.2; c.setLineDash([4, 3]);
      cellsOf(g).forEach(function (q) { c.fillRect(q.c[0] * PX, q.c[1] * PX, PX, PX); });
      c.strokeRect(g.x * PX + 0.6, g.y * PX + 0.6, f[0] * PX - 1.2, f[1] * PX - 1.2); c.setLineDash([]);
    });
  }
  function mmss(sec) { sec = Math.max(0, Math.ceil(sec)); return Math.floor(sec / 60) + ":" + ("0" + sec % 60).slice(-2); }
  function flHud() {
    var me = FL.me, sp = Math.hypot(me.vx, me.vy), g = FL.groups[FL.wsel];
    set("sr-h-sp", nf(sp, 1) + " m/s");
    // Tempo: rotes „Hoch“ über 120 m/s, an der Sperre ein ruhiger Hinweis „⇧ Limit“ (feste Breite, nichts springt)
    var hiNow = sp > VHI + 0.3, atLim = !FL.hiOk && sp >= VHI - 1;
    set("sr-h-spb", hiNow ? t("hiBadge") + (sp >= VMAX - 0.5 ? " · max" : "") : atLim ? t("limBadge") : "");
    var spb = V.root.querySelector("#sr-h-spb"); if (spb) spb.className = hiNow ? "hi" : atLim ? "lim" : "";
    var spEl = V.root.querySelector("#sr-h-sp"); if (spEl) spEl.className = hiNow ? "hi" : "";
    function lit(id, on) { var e = V.root.querySelector(id); if (e && e.classList.contains("lit") !== !!on) e.classList.toggle("lit", !!on); }
    lit("#sr-ic-z", FL.damp); lit("#sr-ic-c", FL.cruise); lit("#sr-ic-h", FL.hiOk); lit("#sr-ic-x", FL.oc);
    var ek = me.cap ? me.energy / me.cap : 0, sk = me.cap ? (me.shE || 0) / me.cap : 0, eb = V.root.querySelector("#sr-h-ebar"); if (eb) { eb.style.width = (ek * 100).toFixed(1) + "%"; eb.style.background = ek < 0.2 ? "#E0533F" : "#57D18A"; }
    var sbh = V.root.querySelector("#sr-h-sbar"); if (sbh) sbh.style.width = (sk * 100).toFixed(1) + "%";
    set("sr-shp-v", FL.shPct + " %"); set("sr-shp-n", me.shGen ? "" : t("shNoGen"));
    // Energieanzeige unten in der Mitte
    var be = V.root.querySelector("#sr-be-e"), bs = V.root.querySelector("#sr-be-s");
    if (be) { be.style.width = (ek * 100).toFixed(1) + "%"; be.style.background = ek < 0.2 ? "#E0533F" : "#57D18A"; bs.style.width = (sk * 100).toFixed(1) + "%"; }
    set("sr-be-t", t("shield") + " " + Math.floor((me.shE || 0) / me.cap * 100 + 1e-6) + " %  ·  " + nf(me.energy) + "  /  " + nf(me.cap));
    set("sr-h-en", nf(me.energy) + " / " + nf(me.cap));
    var ob = V.root.querySelector("#sr-h-ocbar"); if (ob) { ob.style.width = Math.round(FL.ocT / (me.ocMax || 3) * 100) + "%"; ob.style.background = FL.oc ? "#B98AE0" : "#6B7FA0"; }
    var wtxt = g ? t(g) : t("none");
    if (g === "mg") { var h = 0, oh = 0; me.blocks.forEach(function (b) { if (T[b.t].kind === "mg") { h = Math.max(h, b.heat || 0); oh = Math.max(oh, b.oh || 0); } }); wtxt += oh > 0 ? " · !!! " + nf(oh, 1) + " s" : " · " + Math.round(h * 100) + " %"; }
    if (g === "ms") { var am = 0, mx = 0; me.blocks.forEach(function (b) { if (T[b.t].kind === "ms") { am += b.ammo === undefined ? 2 : b.ammo; mx += 2; } }); wtxt += me.msRl > 0 ? (lang === "de" ? " · lädt " : " · reloading ") + nf(me.msRl, 1) + " s" : " · " + am + " / " + mx; }
    if (g === "rg") { var cd = 0; me.blocks.forEach(function (b) { if (T[b.t].kind === "rg") cd = Math.max(cd, b.cd || 0); }); wtxt += cd > 0 ? " · " + nf(cd, 1) + " s" : " · bereit".replace("bereit", lang === "de" ? "bereit" : "ready"); }
    set("sr-h-w", wtxt);
    set("sr-h-seat", FL.out ? t("hOut") : !me.seat ? t("hGone") : FL.seated ? t("hSeat") : t("hWalk"));
    var ak = FL.suit / SUIT.max, ab = V.root.querySelector("#sr-h-airbar"); if (ab) { ab.style.width = Math.round(ak * 100) + "%"; ab.style.background = FL.breath === "room" ? "#57D18A" : ak < 0.25 ? "#E0533F" : "#E3B83F"; }
    set("sr-h-air", (FL.breath === "room" ? "" : t(FL.breath === "jet" ? "airJet" : "airSuit") + " · ") + mmss(FL.suit));
    var ae = V.root.querySelector("#sr-h-air"); if (ae) ae.className = FL.breath === "room" ? "on" : ak < 0.25 ? "warn" : "off";
    var sb = V.root.querySelector('[data-act="seat"]'); if (sb) { set("sr-h-seatb", FL.seated ? t("exitSeat") : t("sitDown")); }
    var wb = V.root.querySelector("#sr-h-weld"); if (wb) { wb.parentNode.hidden = FL.seated; set("sr-h-weld", FL.weldG ? fmt(t(FL.weldOk ? "weldBuild" : "weldWait"), { n: T[FL.weldG.t].n[lang] }) : FL.weldB ? fmt(t("weldOn"), { n: T[FL.weldB.t].n[lang], p: Math.round(FL.weldB.hp / hpMax(FL.me, FL.weldB) * 100) }) : t("hWeldIdle")); }
    var se = V.root.querySelector("#sr-h-seat"); if (se) se.className = !me.seat ? "warn" : "";
  }

  // ---------- UI ----------
  function set(id, txt) { var e = document.getElementById(id); if (e && e.textContent !== txt) e.textContent = txt; }
  function note(txt) { var n = V.root.querySelector(".sr-note"); n.textContent = txt; n.hidden = false; clearTimeout(V.noteT); V.noteT = setTimeout(function () { if (V) n.hidden = true; }, 3200); }
  function icon(id) {
    var ty = T[id], cv = document.createElement("canvas"), s = 14, w = ty.w, h = ty.h, sc = Math.min(40 / (w * s), 40 / (h * s), 1.4);
    cv.width = 44; cv.height = 44; var c = cv.getContext("2d");
    c.translate(22 - w * s * sc / 2, 22 - h * s * sc / 2); c.scale(sc, sc);
    drawBlock(c, { t: id, x: 0, y: 0, r: 0, f: 0 }, s, "in", 1, 0);
    return cv.toDataURL();
  }
  // Kompakte Steuerungsliste (Taste · Aktion) für das Infofeld
  function ctlHtml() {
    var de = lang === "de", G = [
      [de ? "Im Sitz" : "Seated", [["WASD", de ? "Fliegen" : "Fly"], ["Q / E", de ? "Drehen" : "Rotate"], [de ? "Linksklick" : "Left click", de ? "Feuern" : "Fire"], ["R", de ? "Waffe wechseln" : "Switch weapon"], ["Z", de ? "Trägheitsdämpfer" : "Inertia dampers"], ["C", "Cruise Control"], ["X", "Overcharge"], [de ? "Umschalt" : "Shift", de ? "Hochgeschw. freigeben" : "Unlock high speed"], ["F", de ? "Aufstehen / Hinsetzen" : "Get up / sit down"], ["V", de ? "Innen / Außen" : "Inside / outside"], ["I", de ? "Inventar und Perks (pausiert)" : "Inventory and perks (pauses)"]]],
      [de ? "Zu Fuß" : "On foot", [["WASD", de ? "Laufen" : "Walk"], [de ? "Linksklick" : "Left click", de ? "Schweißen, Hologramm aufbauen" : "Weld, rebuild hologram"], [de ? "F auf Luke" : "F on hatch", de ? "Aussteigen (auch durch die Decke)" : "Exit (also through the ceiling)"], [de ? "Offener Rand" : "Open edge", de ? "Direkt hinaus und hinein" : "Step straight out and in"]]],
      [de ? "Draußen" : "Outside", [["WASD", "Jetpack"], [de ? "Umschalt" : "Shift", de ? "Tempo ans Schiff" : "Match ship speed"], [de ? "F über Luke" : "F above hatch", de ? "Einsteigen" : "Get in"]]],
      ["Test", [[de ? "Rechtsklick" : "Right click", de ? "Block beschädigen" : "Damage block"], [de ? "Mausrad" : "Wheel", "Zoom"], ["Esc", de ? "Zurück zum Editor" : "Back to editor"]]]
    ];
    return '<div class="sr-ctl" hidden>' + G.map(function (g) { return "<small>" + g[0] + "</small><dl>" + g[1].map(function (r) { return "<dt>" + r[0] + "</dt><dd>" + r[1] + "</dd>"; }).join("") + "</dl>"; }).join("") + "</div>";
  }
  function html() {
    var pal = CATS.map(function (cat) {
      return '<div class="sr-cat"><h4>' + t(cat) + '</h4><div class="sr-grid">' + Object.keys(T).filter(function (id) { return T[id].cat === cat; }).map(function (id) {
        return '<button type="button" class="sr-blk" data-blk="' + id + '" title="' + T[id].n[lang] + " · " + kg(T[id].mass) + " · " + T[id].hp + " HP · " + cr(T[id].cost) + '"><img alt="" src="' + icon(id) + '"><span>' + T[id].n[lang] + "</span><small>" + kg(T[id].mass) + "</small></button>";
      }).join("") + "</div></div>";
    }).join("");
    var sw = ["#C8473A", "#E3B83F", "#57A06A", "#3E6F96", "#7B4BA8", "#E9ECEE", "#9AA5B1", "#6A7480", "#2A2F36"].map(function (c) { return '<button type="button" class="sr-sw" data-sw="' + c + '" style="background:' + c + '" aria-label="' + c + '"></button>'; }).join("");
    return '<div class="sr-root">' +
      '<canvas id="sr-cv"></canvas>' +
      '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="srCA" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">' +
      '<feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0" result="r"/><feOffset id="srCAo1" in="r" dx="0" dy="0" result="ro"/>' +
      '<feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0" result="g"/>' +
      '<feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0" result="b"/><feOffset id="srCAo2" in="b" dx="0" dy="0" result="bo"/>' +
      '<feBlend in="ro" in2="g" mode="screen" result="rg"/><feBlend in="rg" in2="bo" mode="screen"/></filter></svg>' +
      '<div class="sr-top"><a class="sr-back" href="#">← ' + t("back") + '</a><b class="sr-ttl">' + t("title") + ' <small>v' + VERSION + '</small></b>' +
      '<div class="sr-ed-only sr-tbar"><button type="button" data-act="undo">' + t("undo") + '</button><button type="button" data-act="starter">' + t("starter") + '</button><button type="button" data-act="clear">' + t("clear") + '</button><button type="button" data-act="exp">Export</button><button type="button" data-act="imp">Import</button><button type="button" data-act="npc">' + t("hangar") + '</button></div>' +
      '<div class="sr-sp"></div><div class="sr-seg"><button type="button" data-view="in">' + t("vIn") + '</button><button type="button" data-view="out">' + t("vOut") + '</button></div>' +
      '<button type="button" class="sr-go sr-ed-only" data-act="test">' + t("test") + ' ▸</button><button type="button" class="sr-go sr-fl-only" data-act="edit">◂ ' + t("toEd") + '</button></div>' +
      '<aside class="sr-pal sr-ed-only"><div class="sr-tools"><button type="button" data-tool="build">' + t("tBuild") + '</button><button type="button" data-tool="erase">' + t("tErase") + '</button><button type="button" data-tool="paint">' + t("tPaint") + '</button></div>' +
      '<div class="sr-paint"><label>' + t("color") + ' <input type="color" id="sr-col"></label><div class="sr-sws">' + sw + '</div></div>' +
      '<div class="sr-opts"><button type="button" data-act="rot">' + t("rot") + '</button><button type="button" data-act="flip">' + t("flip") + '</button><button type="button" data-act="sym">' + t("sym") + '</button><button type="button" data-act="symm" class="sr-symm"></button></div>' +
      '<div class="sr-list">' + pal + '</div></aside>' +
      '<aside class="sr-info sr-ed-only" id="sr-info"></aside>' +
      '<div class="sr-hud sr-fl-only"><div class="sr-hr"><small>' + t("speed") + '</small><span><b id="sr-h-sp"></b><em id="sr-h-spb"></em></span></div>' +
      '<div><small>' + t("energy") + ' <span id="sr-h-en"></span></small><i class="sr-eb sr-eb2"><i id="sr-h-sbar"></i><i id="sr-h-ebar"></i></i></div>' +
      '<div><small>' + t("weapon") + ' (R)</small><b id="sr-h-w"></b></div>' +
      '<div class="sr-ics"><i id="sr-ic-z" title="Z · ' + t("damp") + '"><svg viewBox="0 0 20 20"><path d="M2 10h5M13 10h5M5 7l3 3-3 3M15 7l-3 3 3 3" fill="none" stroke="currentColor" stroke-width="1.8"/></svg><u>Z</u></i><i id="sr-ic-c" title="C · ' + t("cruise") + '"><svg viewBox="0 0 20 20"><path d="M3 14a7 7 0 0 1 14 0" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M10 14l4-5" stroke="currentColor" stroke-width="2"/><circle cx="10" cy="14" r="1.6" fill="currentColor"/></svg><u>C</u></i><i id="sr-ic-h" title="' + (lang === "de" ? "Umschalt" : "Shift") + ' · ' + t("hiLbl") + '"><svg viewBox="0 0 20 20"><path d="M5 11l5-5 5 5M5 16l5-5 5 5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg><u>⇧</u></i><i id="sr-ic-x" title="X · Overcharge"><svg viewBox="0 0 20 20"><path d="M11 2L5 11h4l-1 7 6-9h-4z" fill="currentColor"/></svg><u>X</u><s><s id="sr-h-ocbar"></s></s></i></div>' +
      '<div><small>' + t("air") + ' <span id="sr-h-air"></span></small><i class="sr-eb"><i id="sr-h-airbar"></i></i></div>' +
      '<div><small>F <span id="sr-h-seat"></span></small></div><div hidden><small>' + t("weld") + '</small><b id="sr-h-weld"></b></div>' +
      '<button type="button" data-act="seat" id="sr-h-seatb"></button><button type="button" data-act="targets">' + t("targets") + '</button><button type="button" data-act="inv" class="sr-invb">' + t("perksBtn") + '</button>' +
      '<div class="sr-spawn"><small>' + t("spawn") + '</small><span>' + NPC.map(function (q) { return '<button type="button" data-spawn="' + q.id + '">' + q.n[lang] + '</button>'; }).join("") + '</span></div>' + ctlHtml() + '</div>' +
      '<div class="sr-kill" hidden><svg viewBox="0 0 40 40" width="34" height="34"><path d="M20 5l6 12v12l-6 5-6-5V17z" fill="#6A7480" stroke="#C9D1D9" stroke-width="1.5"/><path d="M11 13l18 18M29 13L11 31" stroke="#E0533F" stroke-width="3"/></svg><div><small>' + t("ko") + '</small><span></span></div></div>' +
      '<label class="sr-uis sr-fl-only" title="' + (lang === "de" ? "Größe des Infofelds" : "Info panel size") + '"><svg viewBox="0 0 20 20" width="14" height="14"><rect x="2" y="3" width="7" height="14" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 7h6M12 10h6M12 13h4" stroke="currentColor" stroke-width="1.6"/></svg><input type="range" id="sr-uis" min="1" max="1.5" step="0.05" value="1"><span id="sr-uis-v">100 %</span></label>' +
      '<button type="button" class="sr-ctlb sr-fl-only" data-act="ctl" aria-pressed="false">' + t("controls") + '</button>' +
      '<div class="sr-inv" hidden><div class="sr-inv-box"><div class="sr-inv-h"><div><b>' + t("invT") + '</b><small>' + t("invSub") + '</small></div><button type="button" data-act="inv-x">' + (lang === "de" ? "Schließen (I)" : "Close (I)") + '</button></div>' +
      '<div class="sr-inv-leg">' + RAR.map(function (r) { return '<span style="--rc:' + r.col + '">' + r.n[lang] + "</span>"; }).join("") + '<em class="sr-inv-cnt"></em></div><div class="sr-inv-list"></div></div></div>' +
      '<div class="sr-kc sr-fl-only"><small>' + t("kills") + '</small><b>0</b></div>' +
      '<div class="sr-ebot sr-fl-only"><div class="sr-ebot-bar"><i id="sr-be-s"></i><i id="sr-be-e"></i></div><span id="sr-be-t"></span>' +
      '<label class="sr-shs"><small>' + t("shield") + '</small><input type="range" id="sr-shp" min="0" max="100" step="5" value="0"><b id="sr-shp-v">0 %</b><button type="button" data-act="shfill" title="' + t("shFill") + '">↻</button></label><em id="sr-shp-n"></em></div>' +
      '<div class="sr-tip sr-fl-only" hidden title="' + (lang === "de" ? "Klicken zum Ausblenden" : "Click to dismiss") + '"></div>' +
      '<div class="sr-hint" id="sr-hint"></div><div class="sr-note" hidden></div>' +
      '<div class="sr-io sr-npc" hidden><div class="sr-io-box sr-npc-box"><div class="sr-tbar"><b class="sr-npc-t">' + t("hangar") + '</b><span class="sr-sp"></span><button type="button" data-act="npc-x">' + (lang === "de" ? "Schließen" : "Close") + '</button></div><div class="sr-io-h">' + t("hangarH") + '</div><div class="sr-npc-list"></div></div></div>' +
      '<div class="sr-io sr-exio" hidden><div class="sr-io-box"><div class="sr-io-h"></div><textarea spellcheck="false"></textarea><div class="sr-tbar"><button type="button" data-act="io-copy">' + (lang === "de" ? "Kopieren" : "Copy") + '</button><button type="button" data-act="io-load">' + (lang === "de" ? "Laden" : "Load") + '</button><span class="sr-sp"></span><button type="button" data-act="io-x">' + (lang === "de" ? "Schließen" : "Close") + '</button></div></div></div></div>';
  }
  function syncUI() {
    if (!V) return;
    var r = V.root, fly = S.mode === "fly";
    r.querySelector(".sr-root").classList.toggle("fly", fly);
    r.querySelectorAll("[data-tool]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-tool") === S.tool)); });
    r.querySelectorAll("[data-blk]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-blk") === S.sel && S.tool === "build")); });
    r.querySelectorAll("[data-view]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-view") === S.view)); });
    var sb = r.querySelector('[data-act="sym"]'); if (sb) sb.setAttribute("aria-pressed", String(S.sym));
    var sm = r.querySelector('[data-act="symm"]'); if (sm) { sm.textContent = t("axis") + ": " + t(S.symGap ? "symGap" : "symIn"); sm.disabled = !S.sym; }
    var fb = r.querySelector('[data-act="flip"]'); if (fb) fb.setAttribute("aria-pressed", String(!!S.f));
    r.querySelector(".sr-paint").hidden = S.tool !== "paint";
    var ci = r.querySelector("#sr-col"); if (ci && ci.value !== S.color) ci.value = S.color;
    r.querySelectorAll("[data-sw]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-sw").toLowerCase() === S.color.toLowerCase())); });
    set("sr-hint", fly ? "" : t("hintEd")); var hn = V.root.querySelector("#sr-hint"); if (hn) hn.hidden = fly;
    if (!fly) info();
  }
  function coolTxt() { var cm = coolMap(S.blocks), w = 0, th = 0; cm.forEach(function (n, b) { var k = T[b.t].kind; if (k === "mg" || k === "rg") w++; if (k === "thr") th++; }); return w + " " + t("weap") + " · " + th + " " + t("thrs"); }
  function dimTxt() { var b = bounds(S.blocks); if (!b) return "–"; var w = b.x1 - b.x0, h = b.y1 - b.y0; return w + " × " + h + " (" + nf(w * CELL_M, 1) + " × " + nf(h * CELL_M, 1) + " m)"; }
  function info() {
    var st = stats(S.blocks), R = rooms(S.blocks), comps = components(S.blocks), main = comps.length ? comps.reduce(function (a, b) { return mainScore(b) > mainScore(a) ? b : a; }) : [];
    var loose = S.blocks.length - main.length, m = st.mass || 1;
    function row(l, v) { return "<div><span>" + l + "</span><b>" + v + "</b></div>"; }
    function acc(i) { return st.thr[i] ? nf(st.thr[i]) + " kN · " + nf(st.thr[i] / m, 1) + " m/s²" : "–"; }
    var warn = [];
    if (!st.cock) warn.push(t("wNoCock"));
    if (!st.gyro) warn.push(t("wNoGyro"));
    var miss = [[0, "dF"], [2, "dB"], [3, "dL"], [1, "dR"]].filter(function (q) { return !st.thr[q[0]]; }).map(function (q) { return t(q[1]); });
    if (miss.length) warn.push(fmt(t("wNoThr"), { d: miss.join(", ") }));
    var leaks = R.filter(function (x) { return !x.ok; }).length; if (leaks) warn.push(fmt(t("wLeak"), { n: leaks }));
    if (loose > 0) warn.push(fmt(t("wLoose"), { n: loose }));
    if (!st.cap && !st.prod) warn.push(t("wNoPow"));
    var wdeg = st.torque ? nf(st.torque / Math.max(1, st.I) * 57.3) + " °/s²" : "–";
    document.getElementById("sr-info").innerHTML =
      "<h4>" + t("sBlocks") + "</h4>" + row(t("sBlocks"), nf(st.n)) + row(t("sMass"), nf(st.mass * 1000) + " kg") + row(t("sCost"), cr(st.cost || 0) + '<br><small style="color:#7FD3A4;font-weight:400">' + t("costFree") + "</small>") +
      row(t("sDim"), dimTxt()) + row(t("sCom"), t("comHint")) +
      "<h4>" + t("sThr") + "</h4>" + row("↑ " + t("dF"), acc(0)) + row("↓ " + t("dB"), acc(2)) + row("← " + t("dL"), acc(3)) + row("→ " + t("dR"), acc(1)) +
      "<h4>" + t("sGyro") + "</h4>" + row("Gyro", st.gyro ? st.gyro + " × · " + wdeg : "–") +
      "<h4>" + t("sCool") + "</h4>" + row(t("sCoolW"), coolTxt()) + row("Overcharge", nf(ocMaxOf(S.blocks, coolMap(S.blocks)), 1) + " s") +
      "<h4>" + t("sEn") + "</h4>" + row(t("sProd"), nf(st.prod) + " E/s") + row(t("sStore"), nf(st.cap) + " E") + row(t("sUse"), nf(st.use) + " E/s") +
      "<h4>" + t("sRooms") + "</h4><p class='" + (leaks ? "bad" : "ok") + "'>" + (R.length ? fmt(t("okRooms"), { n: R.length - leaks }) + (leaks ? " · " + leaks + " ✕" : "") + " · " + fmt(t("roomCells"), { n: R.reduce(function (a, r) { return a + r.cells.length; }, 0) }) : t("noRooms")) + "</p>" +
      (warn.length ? "<ul class='sr-warn'>" + warn.map(function (w) { return "<li>" + w + "</li>"; }).join("") + "</ul>" : "");
  }

  var CSS = ".sr-root{position:fixed;inset:0;z-index:30;background:#080B12;color:#E6EAF0;font-family:var(--f-body,system-ui);user-select:none;-webkit-user-select:none;overflow:hidden}" +
    ".sr-root canvas#sr-cv{position:absolute;inset:0;width:100%;height:100%;display:block;cursor:crosshair}" +
    ".sr-top{position:absolute;left:0;right:0;top:0;display:flex;align-items:center;gap:10px;padding:10px 14px;background:linear-gradient(#0E131C,rgba(14,19,28,.92));border-bottom:1px solid #263142;z-index:3;flex-wrap:wrap}" +
    ".sr-back{color:#E6EAF0;text-decoration:none;font-weight:600;font-size:.9rem;padding:6px 10px;border:1px solid #33415A}.sr-back:hover{border-color:#E3B83F}" +
    ".sr-ttl{font:600 1.15rem var(--f-display,inherit);letter-spacing:.02em}.sr-ttl small{font:600 .7rem inherit;color:#8FA0B8;border:1px solid #33415A;padding:1px 5px;margin-left:4px}.sr-sp{flex:1}" +
    ".sr-root button{font:600 .82rem var(--f-body,inherit);color:#E6EAF0;background:#141B27;border:1px solid #33415A;padding:6px 10px;cursor:pointer;border-radius:0}.sr-root button:hover{border-color:#5B7194}" +
    ".sr-root button[aria-pressed=true]{background:#E3B83F;color:#141414;border-color:#E3B83F}.sr-tbar{display:flex;gap:6px}.sr-seg{display:flex}.sr-seg button+button{border-left:0}" +
    ".sr-root .sr-go{background:#2E7D5B;border-color:#3FA076;font-size:.9rem;padding:7px 14px}.sr-root .sr-go:hover{background:#3A946D}" +
    ".sr-pal{position:absolute;left:10px;top:64px;bottom:44px;width:248px;background:rgba(14,19,28,.94);border:1px solid #263142;z-index:2;display:flex;flex-direction:column}" +
    ".sr-tools{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;padding:8px}.sr-opts{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;padding:0 8px 8px}.sr-opts button{font-size:.72rem;padding:5px 2px}" +
    ".sr-paint{padding:0 8px 8px;display:flex;flex-direction:column;gap:6px;font-size:.78rem}.sr-paint label{display:flex;align-items:center;gap:8px}.sr-paint input{width:44px;height:26px;border:1px solid #33415A;background:none;padding:0}" +
    ".sr-sws{display:flex;flex-wrap:wrap;gap:4px}.sr-root .sr-sw{width:22px;height:22px;padding:0;border:2px solid #263142}.sr-root .sr-sw[aria-pressed=true]{border-color:#fff;outline:1px solid #000}" +
    ".sr-list{overflow:auto;padding:0 8px 8px;flex:1;min-height:0}.sr-cat h4{margin:10px 0 6px;font:600 .72rem var(--f-body,inherit);letter-spacing:.08em;text-transform:uppercase;color:#8FA0B8}" +
    ".sr-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}.sr-root .sr-blk{display:flex;flex-direction:column;align-items:center;gap:3px;padding:5px 3px;background:#101620;min-width:0}" +
    ".sr-blk img{width:44px;height:44px;image-rendering:auto}.sr-blk span{font-size:.62rem;line-height:1.2;text-align:center;color:#B9C4D4;font-weight:500;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}" +
    ".sr-blk small{font-size:.58rem;color:#8FA0B8;font-variant-numeric:tabular-nums}" +
    ".sr-root .sr-blk[aria-pressed=true]{background:#2A3550;border-color:#E3B83F;color:#E6EAF0}.sr-blk[aria-pressed=true] span{color:#fff}" +
    ".sr-info{position:absolute;right:10px;top:64px;width:250px;max-height:calc(100% - 110px);overflow:auto;background:rgba(14,19,28,.94);border:1px solid #263142;padding:10px 12px;z-index:2;font-size:.8rem}" +
    ".sr-info h4{margin:10px 0 4px;font:600 .7rem var(--f-body,inherit);letter-spacing:.08em;text-transform:uppercase;color:#8FA0B8}.sr-info h4:first-child{margin-top:0}" +
    ".sr-info div{display:flex;justify-content:space-between;gap:8px;padding:2px 0}.sr-info div span{color:#B9C4D4}.sr-info b{font-weight:600;font-variant-numeric:tabular-nums;text-align:right}" +
    ".sr-info p{margin:2px 0}.sr-info .ok{color:#7FD3A4}.sr-info .bad{color:#F08A78}.sr-warn{margin:10px 0 0;padding:8px 8px 8px 22px;background:rgba(224,83,63,.12);border-left:3px solid #E0533F;color:#F3C2B8}.sr-warn li{margin:2px 0}" +
    ".sr-hint{position:absolute;left:50%;bottom:10px;transform:translateX(-50%);max-width:calc(100% - 540px);min-width:280px;text-align:center;font-size:.74rem;color:#B9C4D4;background:rgba(14,19,28,.85);border:1px solid #263142;padding:6px 10px;z-index:2}" +
    ".sr-io{position:absolute;inset:0;background:rgba(10,10,10,.72);display:flex;align-items:center;justify-content:center;z-index:6;padding:16px}.sr-io[hidden]{display:none}.sr-io-box{background:#1E1E1E;border:1px solid #3A3A3A;padding:14px;width:min(560px,100%);display:flex;flex-direction:column;gap:10px}.sr-io-h{color:#DDD;font-size:.88rem;line-height:1.45}.sr-io textarea{height:180px;background:#141414;color:#E8E8E8;border:1px solid #3A3A3A;font:12px ui-monospace,Menlo,Consolas,monospace;padding:8px;resize:vertical;border-radius:0}.sr-io .sr-sp{flex:1}" +
    ".sr-npc-box{width:min(760px,100%);max-height:calc(100% - 32px);overflow:auto}.sr-npc-t{font-size:1rem;color:#EEE}.sr-npc-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:10px}" +
    ".sr-npc-card{display:flex;gap:12px;background:#141414;border:1px solid #333;padding:10px;align-items:center}.sr-npc-card canvas{background:#0E131C;flex:none}.sr-npc-tx{display:flex;flex-direction:column;gap:4px;min-width:0}" +
    ".sr-npc-tx small{font-size:.7rem;letter-spacing:.08em;text-transform:uppercase;color:#8FA0B8}.sr-npc-tx b{font-size:1.05rem;color:#EEE}.sr-npc-tx span{font-size:.8rem;color:#B5BCC4}.sr-npc-tx button{align-self:flex-start;margin-top:4px}" +
    ".sr-spawn span{display:flex;gap:4px;flex-wrap:wrap}.sr-spawn button{flex:1;padding:5px 6px;font-size:.78rem}" +
    ".sr-kill{position:absolute;left:50%;top:76px;transform:translateX(-50%);display:flex;align-items:center;gap:10px;background:rgba(14,19,28,.92);border:1px solid #3A4658;padding:8px 16px 8px 10px;z-index:5;pointer-events:none}" +
    ".sr-kill[hidden]{display:none}.sr-kill div{display:flex;flex-direction:column}.sr-kill small{font-size:.68rem;letter-spacing:.1em;text-transform:uppercase;color:#F08A78;font-weight:700}.sr-kill span{font-weight:600;color:#E8ECEF}" +
    ".sr-kill.flee small{color:#F0B860}.sr-kill.flee path:last-child{stroke:#F0B860}" +
    ".sr-kill.dead small{color:#FF6A55}" +
    ".sr-kc{position:absolute;right:12px;top:64px;z-index:3;display:flex!important;align-items:baseline;gap:8px;background:rgba(14,19,28,.6);border:1px solid rgba(38,49,66,.8);padding:6px 12px;pointer-events:none}" +
    ".sr-kc small{font-size:.66rem;letter-spacing:.1em;text-transform:uppercase;color:#8FA0B8}.sr-kc b{font-size:1.15rem;color:#EEF2F5;font-variant-numeric:tabular-nums;min-width:1ch;text-align:right}" +
    ".sr-kc.pop b{animation:srKc .6s ease}@keyframes srKc{0%{color:#F2C14E;transform:scale(1.5)}100%{color:#EEF2F5;transform:scale(1)}}" +
    ".sr-kill.go{animation:srKill 3.2s ease both}@keyframes srKill{0%{opacity:0;transform:translate(-50%,-8px)}8%{opacity:1;transform:translate(-50%,0)}85%{opacity:1}100%{opacity:0}}" +
    ".sr-note{position:absolute;left:50%;top:72px;transform:translateX(-50%);background:#E0533F;color:#fff;font-weight:600;padding:8px 14px;z-index:4;font-size:.86rem}" +
    ".sr-ctlb{position:absolute;left:206px;bottom:10px;z-index:3;padding:5px 10px;font-size:.72rem;background:rgba(14,19,28,.6);border:1px solid rgba(38,49,66,.8);color:#B9C4D4}.sr-ctlb[aria-pressed=true]{color:#9FE3BD;border-color:rgba(127,211,164,.55)}" +
    ".sr-ctl{border-top:1px solid rgba(38,49,66,.9);padding-top:6px;gap:3px!important}.sr-ctl[hidden]{display:none!important}.sr-ctl small{margin-top:3px}" +
    ".sr-ctl dl{display:grid;grid-template-columns:66px 1fr;gap:2px 7px;margin:0;font-size:.7rem;line-height:1.3}.sr-ctl dt{color:#E8ECEF;font-weight:600;white-space:nowrap}.sr-ctl dd{margin:0;color:#B9C4D4}" +
    ".sr-eb2{display:flex!important}.sr-eb2 i{display:block;height:100%}#sr-h-sbar{background:#4EA3FF;box-shadow:0 0 6px rgba(78,163,255,.6)}" +
    ".sr-shs{display:flex;align-items:center;gap:7px;width:100%;pointer-events:auto;background:rgba(14,19,28,.55);border:1px solid rgba(38,49,66,.8);padding:3px 8px;box-sizing:border-box}.sr-shs small{flex:none;font-size:.66rem;letter-spacing:.08em;text-transform:uppercase;color:#8FB8E8}" +
    ".sr-shs input{flex:1;min-width:0;accent-color:#4EA3FF;margin:0;cursor:pointer}.sr-shs b{font-size:.72rem;min-width:34px;text-align:right;font-variant-numeric:tabular-nums;color:#DDEBFA}.sr-shs button{padding:0 6px;font-size:.78rem;line-height:1.4}" +
    ".sr-ebot em{font-style:normal;font-size:.64rem;color:rgba(240,184,96,.85);text-shadow:0 1px 2px rgba(0,0,0,.8)}" +
    ".sr-ebot{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);width:min(340px,calc(100% - 520px));min-width:180px;display:flex!important;flex-direction:column;align-items:center;gap:4px;z-index:2;pointer-events:none}" +
    ".sr-ebot-bar{width:100%;height:7px;background:rgba(20,26,36,.75);border:1px solid rgba(60,75,95,.8);display:flex}.sr-ebot-bar i{display:block;height:100%}#sr-be-s{background:#4EA3FF;box-shadow:0 0 8px rgba(78,163,255,.7)}" +
    ".sr-ebot span{font-size:.7rem;color:rgba(222,230,238,.85);font-variant-numeric:tabular-nums;text-shadow:0 1px 2px rgba(0,0,0,.8);white-space:pre}" +
    ".sr-tip{position:absolute;left:50%;bottom:92px;transform:translateX(-50%);max-width:min(620px,calc(100% - 480px));text-align:center;font-size:.86rem;line-height:1.4;color:rgba(222,230,238,.86);text-shadow:0 1px 3px rgba(0,0,0,.8);z-index:3;cursor:pointer;opacity:0;transition:opacity .4s ease}" +
    ".sr-tip[hidden]{display:none!important}.sr-tip.in{opacity:1}.sr-tip.out{opacity:0}" +
    ".sr-inv{position:absolute;inset:0;background:rgba(6,9,14,.55);display:flex;align-items:center;justify-content:center;z-index:7;padding:16px}.sr-inv[hidden]{display:none}" +
    ".sr-inv-box{width:min(820px,100%);max-height:calc(100% - 40px);overflow:auto;background:rgba(18,23,32,.97);border:1px solid #33405A;padding:14px 16px;display:flex;flex-direction:column;gap:10px}" +
    ".sr-inv-h{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}.sr-inv-h>div{display:flex;flex-direction:column;gap:3px}.sr-inv-h b{font-size:1.05rem;color:#EEF2F5}.sr-inv-h small{font-size:.76rem;color:#8FA0B8}" +
    ".sr-inv-leg{display:flex;flex-wrap:wrap;gap:12px;align-items:center;font-size:.72rem;color:#B9C4D4;border-bottom:1px solid #263142;padding-bottom:8px}.sr-inv-leg span::before{content:'';display:inline-block;width:9px;height:9px;background:var(--rc);margin-right:5px;box-shadow:0 0 6px var(--rc)}.sr-inv-leg em{margin-left:auto;font-style:normal;color:#E8ECEF}" +
    ".sr-inv-list{display:flex;flex-direction:column;gap:2px}.sr-inv-row{display:flex;align-items:center;gap:12px;padding:5px 0;border-bottom:1px solid rgba(38,49,66,.6)}" +
    ".sr-inv-n{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}.sr-inv-n b{font-size:.86rem;color:#E8ECEF}.sr-inv-n span{font-size:.72rem;color:#8FA0B8}.sr-inv-chips{display:flex;flex-wrap:wrap;gap:5px;justify-content:flex-end;max-width:55%}" +
    ".sr-inv .sr-chip{min-width:62px;padding:5px 8px;font-size:.76rem;font-weight:700;font-variant-numeric:tabular-nums;background:rgba(var(--rr),.07);border:1px solid rgba(var(--rr),.35);color:rgba(var(--rr),.6);cursor:pointer}" +
    ".sr-inv .sr-chip:hover{border-color:rgba(var(--rr),.7);color:rgba(var(--rr),.9)}.sr-inv .sr-chip.on{background:rgba(var(--rr),.28);border-color:var(--rc);color:#fff;box-shadow:0 0 10px rgba(var(--rr),.55),inset 0 0 8px rgba(var(--rr),.35)}" +
    ".sr-inv .sr-chip.new{outline:2px dashed rgba(var(--rr),.9);outline-offset:2px}" +
    ".sr-uis{position:absolute;left:12px;bottom:10px;z-index:3;align-items:center;gap:7px;background:rgba(14,19,28,.6);border:1px solid rgba(38,49,66,.8);padding:5px 9px;color:#8FA0B8;font-size:.72rem;font-variant-numeric:tabular-nums;cursor:pointer}" +
    ".sr-uis input{width:96px;accent-color:#7FD3A4;margin:0}.sr-uis span{min-width:36px;text-align:right}" +
    ".sr-hud{overflow-y:auto;scrollbar-width:thin;position:absolute;left:12px;top:64px;display:flex;flex-direction:column;gap:7px;background:rgba(14,19,28,.6);border:1px solid rgba(38,49,66,.8);padding:8px 10px;z-index:2;width:176px;box-sizing:border-box;font-size:.84rem}" +
    ".sr-hud .sr-hr span{display:flex;align-items:baseline;justify-content:space-between;gap:6px;white-space:nowrap}.sr-hud em{font-style:normal;font-size:.62rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:1px 5px;min-width:0}" +
    ".sr-hud em.lim{color:#F0B860;background:rgba(240,184,96,.12)}.sr-hud em.hi{color:#FF8A78;background:rgba(255,80,60,.16);animation:srHi 1s ease-in-out infinite}.sr-hud b.hi{color:#FF6A55}" +
    ".sr-ics{flex-direction:row!important;gap:5px!important}.sr-ics>i{flex:1;position:relative;display:flex;flex-direction:column;align-items:center;gap:1px;padding:4px 0 3px;background:rgba(38,49,66,.55);color:#6E7D93;border:1px solid transparent}" +
    ".sr-ics svg{width:16px;height:16px}.sr-ics u{text-decoration:none;font-size:.6rem;font-weight:700}.sr-ics>i.lit{color:#9FE3BD;border-color:rgba(127,211,164,.55);box-shadow:0 0 8px rgba(127,211,164,.35);background:rgba(40,80,60,.45)}" +
    "#sr-ic-x.lit{color:#D4B0F5;border-color:rgba(185,138,224,.6);box-shadow:0 0 8px rgba(185,138,224,.4);background:rgba(70,45,95,.45)}#sr-ic-h.lit{color:#FFB09F;border-color:rgba(255,120,95,.55);box-shadow:0 0 8px rgba(255,100,80,.35);background:rgba(90,40,35,.45)}" +
    ".sr-ics s{position:absolute;left:3px;right:3px;bottom:1px;height:2px;background:rgba(0,0,0,.35);text-decoration:none}.sr-ics s s{left:0;right:auto;bottom:0;width:0;height:100%}" +
    ".sr-hud small span{text-transform:none;letter-spacing:0;color:#C9D1D9;font-variant-numeric:tabular-nums;float:right}.sr-hud small span.warn{color:#F08A78}.sr-hud small span.on{color:#7FD3A4}.sr-hud small span.off{color:#F0B860}" +
    ".sr-hud div{display:flex;flex-direction:column;gap:2px}.sr-hud small{font-size:.66rem;letter-spacing:.08em;text-transform:uppercase;color:#8FA0B8}.sr-hud b{font-weight:600;font-variant-numeric:tabular-nums}" +
        ".sr-hud div.hiBox{animation:srHiBox 1s ease-in-out infinite}@keyframes srHi{0%,100%{text-shadow:0 0 0 rgba(255,80,60,0)}50%{text-shadow:0 0 10px rgba(255,80,60,.9)}}@keyframes srHiBox{0%,100%{box-shadow:inset 3px 0 0 rgba(255,80,60,.35)}50%{box-shadow:inset 3px 0 0 rgba(255,80,60,1)}}" +
    ".sr-hud b.on{color:#7FD3A4}.sr-hud b.off{color:#F0B860}.sr-hud b.warn{color:#F08A78}.sr-hud div[hidden]{display:none}.sr-eb{display:block;height:4px;background:rgba(38,49,66,.9)}.sr-eb i{display:block;height:100%;width:0}" +
    ".sr-root .sr-fl-only{display:none}.sr-root.fly .sr-fl-only{display:flex}.sr-root.fly .sr-ed-only{display:none}.sr-root.fly .sr-hud{display:flex}.sr-root.fly .sr-hint{max-width:calc(100% - 40px)}" +
    ".sr-root [hidden]{display:none!important}" +
    "@media (max-width:900px){.sr-info{display:none}.sr-hint{max-width:calc(100% - 280px)}}";

  // ---------- Eingabe ----------
  function worldMouse(e) {
    var r = V.cv.getBoundingClientRect(), s = PX * V.zoom;
    return { sx: e.clientX - r.left, sy: e.clientY - r.top, x: V.cam.x + (e.clientX - r.left - V.W / 2) / s, y: V.cam.y + (e.clientY - r.top - V.H / 2) / s };
  }
  function onDown(e) {
    V.cv.focus && V.cv.focus();
    var m = worldMouse(e); V.mouse = m;
    if (S.mode === "fly") {
      audioInit();
      if (e.button === 0) FL.fire = true;
      if (e.button === 2) { var ppm = PX * V.zoom / CELL_M, wx = FL.cam.x + (m.sx - V.W / 2) / ppm, wy = FL.cam.y + (m.sy - V.H / 2) / ppm, h = hitAt(wx, wy, null); if (h) { damage(h.bd, h.b, T[h.b.t].hp * 0.26, wx, wy); spark(wx, wy, 6); } }
      return;
    }
    if (e.button === 1 || (e.button === 0 && V.space)) { V.pan = { x: e.clientX, y: e.clientY, cx: V.cam.x, cy: V.cam.y }; e.preventDefault(); return; }
    var cx = Math.floor(m.x), cy = Math.floor(m.y);
    V.down = e.button;
    if (e.button === 2) { if (eraseAt(cx, cy)) syncUI(); V.lastCell = key(cx, cy); return; }
    if (e.button !== 0) return;
    if (S.tool === "build") { V.row = { sx: cx, sy: cy, ex: cx, ey: cy }; }
    else if (S.tool === "erase") { if (eraseAt(cx, cy)) syncUI(); }
    else if (S.tool === "paint") { if (paintAt(cx, cy)) syncUI(); }
    V.lastCell = key(cx, cy);
  }
  function onMove(e) {
    if (!V) return;
    var m = worldMouse(e);
    if (S.mode === "fly") { if (e.shiftKey) FL.mdx += e.movementX || 0; V.mouse = m; return; }
    if (V.pan) { var s = PX * V.zoom; V.cam.x = V.pan.cx - (e.clientX - V.pan.x) / s; V.cam.y = V.pan.cy - (e.clientY - V.pan.y) / s; return; }
    V.mouse = m;
    if (V.down === undefined || V.down === null) return;
    var cx = Math.floor(m.x), cy = Math.floor(m.y), kk = key(cx, cy); if (kk === V.lastCell) return; V.lastCell = kk;
    if (V.down === 2 || S.tool === "erase") { if (eraseAt(cx, cy)) syncUI(); }
    else if (S.tool === "paint") { if (paintAt(cx, cy)) syncUI(); }
    else if (S.tool === "build" && V.row) { V.row.ex = cx; V.row.ey = cy; }
  }
  function onUp(e) { if (!V) return; V.pan = null; V.down = null; if (FL) FL.fire = false; if (V.row) { placeRow(); V.row = null; syncUI(); } }
  function onWheel(e) { e.preventDefault(); var k = e.deltaY < 0 ? 1.12 : 1 / 1.12; V.zoom = Math.max(S.mode === "fly" ? ZMIN_FL : 0.3, Math.min(3, V.zoom * k)); }
  function onKey(e) {
    if (!V || e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    var k = e.key.toLowerCase();
    if (S.mode === "fly") {
      if (FL && FL.paused) { if (k === "escape" || k === "i") closeInv(); e.preventDefault(); return; }
      if (k === "i") { openInv(); return; }
      if (k === "escape") { stopTest(); return; }
      if (["w", "a", "s", "d", "q", "e"].indexOf(k) >= 0) { FL.keys[k] = true; e.preventDefault(); }
      if (k === "shift") { FL.keys.shift = true; if (!e.repeat && !FL.out) { FL.hiOk = !FL.hiOk; if (FL.hiOk) FL.ca = Math.max(FL.ca || 0, 0.3); floatTxt(t(FL.hiOk ? "hiOn" : "hiOff")); } }
      if (e.repeat) return;
      if (k === "z") FL.damp = !FL.damp;
      if (k === "c") { FL.cruise = !FL.cruise; floatTxt(t(FL.cruise ? "crFloatOn" : "crFloatOff")); }
      if (k === "x") { if (FL.oc) { FL.oc = false; floatTxt(t("ocOff"), "201,160,245"); } else if (FL.ocT > 0.3) { FL.oc = true; floatTxt(t("ocOn"), "201,160,245"); } }
      if (k === "r" && FL.groups.length) FL.wsel = (FL.wsel + 1) % FL.groups.length;
      if (k === "f") toggleSeat();
      if (k === "v" || k === "tab") { S.view = S.view === "in" ? "out" : "in"; syncUI(); e.preventDefault(); }
      return;
    }
    if (k === " ") { V.space = true; e.preventDefault(); return; }
    if ((e.ctrlKey || e.metaKey) && k === "z") { undo(); e.preventDefault(); return; }
    if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].indexOf(k) >= 0) { V.keys[k] = true; e.preventDefault(); return; }
    if (e.repeat) return;
    if (k === "r") { S.r = (S.r + (e.shiftKey ? 3 : 1)) % 4; syncUI(); }
    else if (k === "f") { S.f = S.f ? 0 : 1; syncUI(); }
    else if (k === "m") { cycleSym(); syncUI(); }
    else if (k === "v" || k === "tab") { S.view = S.view === "in" ? "out" : "in"; syncUI(); e.preventDefault(); }
    else if (k === "1") { S.tool = "build"; syncUI(); } else if (k === "2") { S.tool = "erase"; syncUI(); } else if (k === "3") { S.tool = "paint"; syncUI(); }
  }
  function onKeyUp(e) {
    if (!V) return; var k = e.key.toLowerCase();
    if (k === " ") V.space = false;
    if (FL) { FL.keys[k] = false; if (k === "shift") FL.keys.shift = false; }
    V.keys[k] = false;
  }
  // ---------- NPC-Schiffe: Baupläne aus dem Editor-Export, später als KI-Gegner ----------
  var NPC = [
    { id: 1, n: L2("Jäger", "Jaeger"), cls: "S", code: {"sr":1,"color":"#6A7480","b":[["ckm",-1,-6,0,0,"#C8473A"],["hblk",-2,-6,0,0,"#6A7480"],["hblk",2,-6,0,1,"#6A7480"],["hblk",-2,-5,0,0,"#6A7480"],["hblk",2,-5,0,1,"#6A7480"],["hblk",-2,-4,0,0,"#6A7480"],["hblk",2,-4,0,1,"#6A7480"],["lblk",-2,-3,0,0,"#6A7480"],["lblk",2,-3,0,1,"#6A7480"],["lblk",-2,-2,0,0,"#E3B83F"],["lblk",2,-2,0,1,"#E3B83F"],["win",-2,-1,0,0,"#E3B83F"],["win",2,-1,0,1,"#E3B83F"],["lblk",-2,0,0,0,"#E3B83F"],["lblk",2,0,0,1,"#E3B83F"],["lblk",-2,1,0,0,"#E3B83F"],["lblk",2,1,0,1,"#E3B83F"],["flo",-1,-2,0,0,"#6A7480"],["lblk",-1,1,0,0,"#6A7480"],["flo",0,-2,0,0,"#C8473A"],["flo",0,-1,0,0,"#C8473A"],["lblk",0,1,0,0,"#C8473A"],["flo",1,-2,0,0,"#6A7480"],["lblk",1,1,0,0,"#6A7480"],["gyr",-1,0,0,0,"#6A7480"],["bat",0,0,0,0,"#C8473A"],["bat",1,0,0,0,"#6A7480"],["rea",-1,2,0,0,"#C8473A"],["lblk",1,2,0,0,"#C8473A"],["lblk",1,3,0,0,"#C8473A"],["thl",-2,4,0,0,"#6A7480"],["thl",1,4,0,1,"#6A7480"],["ths",0,4,0,0,"#C8473A"],["ths",-2,-8,2,0,"#E3B83F"],["ths",2,-8,2,1,"#E3B83F"],["lblk",-3,-4,0,0,"#E3B83F"],["lblk",3,-4,0,1,"#E3B83F"],["lblk",-3,-3,0,0,"#E3B83F"],["lblk",3,-3,0,1,"#E3B83F"],["mgn",-3,-6,0,0,"#E3B83F"],["mgn",3,-6,0,1,"#E3B83F"],["hrm2",4,-4,0,0,"#E3B83F"],["hrm2",-4,-4,0,1,"#E3B83F"],["bat",1,-1,0,0,"#6A7480"],["bat",-1,-1,0,1,"#6A7480"],["hrm2",-4,-2,2,0,"#E3B83F"],["hrm2",4,-2,2,1,"#E3B83F"],["ths",-3,-2,0,0,"#E3B83F"],["ths",3,-2,0,1,"#E3B83F"],["ths",-3,2,1,0,"#E3B83F"],["ths",2,2,3,1,"#E3B83F"],["ths",-3,3,1,0,"#E3B83F"],["ths",2,3,3,1,"#E3B83F"]]} },
    { id: 2, n: L2("Falcon", "Falcon"), cls: "M", code: {"sr":1,"color":"#3E6F96","b":[["ckm",-1,-2,0,0],["flo",-1,2,0,0,"#C8473A"],["flo",1,2,0,1,"#C8473A"],["flo",-1,3,0,0,"#C8473A"],["flo",1,3,0,1,"#C8473A"],["flo",-1,4,0,0,"#c0746d"],["flo",1,4,0,1,"#c0746d"],["flo",-1,5,0,0,"#c0746d"],["flo",1,5,0,1,"#c0746d"],["flo",-1,6,0,0,"#c0746d"],["flo",1,6,0,1,"#c0746d"],["flo",-1,7,0,0,"#C8473A"],["flo",1,7,0,1,"#C8473A"],["flo",-1,8,0,0,"#C8473A"],["flo",1,8,0,1,"#C8473A"],["flo",-1,9,0,0,"#C8473A"],["flo",1,9,0,1,"#C8473A"],["flo",-1,10,0,0,"#C8473A"],["flo",1,10,0,1,"#C8473A"],["flo",-1,11,0,0,"#C8473A"],["flo",1,11,0,1,"#C8473A"],["flo",0,11,0,0,"#c0746d"],["flo",0,10,0,0,"#c0746d"],["flo",0,9,0,0,"#c0746d"],["flo",0,8,0,0,"#c0746d"],["flo",0,7,0,0,"#c0746d"],["flo",0,6,0,0,"#c0746d"],["flo",0,5,0,0],["flo",0,4,0,0,"#c0746d"],["flo",0,3,0,0,"#c0746d"],["flo",0,2,0,0,"#c0746d"],["flo",0,12,0,0,"#c0746d"],["flo",0,13,0,0,"#c0746d"],["hrm2",-3,1,0,1,"#3E6F96"],["hrm2",3,1,0,0,"#3E6F96"],["hblk",-2,1,0,1,"#3E6F96"],["hblk",2,1,0,0,"#3E6F96"],["lblk",-3,3,0,1,"#3E6F96"],["lblk",3,3,0,0,"#3E6F96"],["lblk",-3,4,0,1,"#3E6F96"],["lblk",3,4,0,0,"#3E6F96"],["lblk",-3,5,0,1,"#3E6F96"],["lblk",3,5,0,0,"#3E6F96"],["lblk",-3,6,0,1,"#3E6F96"],["lblk",3,6,0,0,"#3E6F96"],["lblk",-3,7,0,1,"#3E6F96"],["lblk",3,7,0,0,"#3E6F96"],["lblk",-3,8,0,1,"#3E6F96"],["lblk",3,8,0,0,"#3E6F96"],["lblk",-3,9,0,1,"#3E6F96"],["lblk",3,9,0,0,"#3E6F96"],["lblk",-3,10,0,1,"#3E6F96"],["lblk",3,10,0,0,"#3E6F96"],["lblk",-3,11,0,1,"#3E6F96"],["lblk",3,11,0,0,"#3E6F96"],["lblk",-3,12,0,1,"#3E6F96"],["lblk",3,12,0,0,"#3E6F96"],["lblk",-3,13,0,1,"#3E6F96"],["lblk",3,13,0,0,"#3E6F96"],["lblk",-3,14,0,1,"#c0746d"],["lblk",3,14,0,0,"#c0746d"],["col",-4,13,0,1,"#3E6F96"],["col",4,13,0,0,"#3E6F96"],["col",-4,12,0,1,"#3E6F96"],["col",4,12,0,0,"#3E6F96"],["col",-4,11,0,1,"#3E6F96"],["col",4,11,0,0,"#3E6F96"],["col",-4,10,0,1,"#3E6F96"],["col",4,10,0,0,"#3E6F96"],["col",-4,9,0,1,"#3E6F96"],["col",4,9,0,0,"#3E6F96"],["thl",-5,14,0,1,"#3E6F96"],["thl",4,14,0,0,"#3E6F96"],["thl",-5,6,2,1,"#3E6F96"],["thl",4,6,2,0,"#3E6F96"],["col",-5,9,2,1,"#3E6F96"],["col",5,9,2,0,"#3E6F96"],["col",-5,10,2,1,"#3E6F96"],["col",5,10,2,0,"#3E6F96"],["col",-5,11,2,1,"#3E6F96"],["col",5,11,2,0,"#3E6F96"],["col",-5,12,2,1,"#3E6F96"],["col",5,12,2,0,"#3E6F96"],["col",-5,13,2,1,"#3E6F96"],["col",5,13,2,0,"#3E6F96"],["lblk",-2,14,2,1,"#c0746d"],["lblk",2,14,2,0,"#c0746d"],["lblk",-1,14,2,1,"#c0746d"],["lblk",1,14,2,0,"#c0746d"],["lblk",0,14,2,1,"#c0746d"],["ths",-7,11,1,1,"#3E6F96"],["ths",6,11,3,0,"#3E6F96"],["ths",-7,12,1,1,"#3E6F96"],["ths",6,12,3,0,"#3E6F96"],["ths",-7,13,1,1,"#3E6F96"],["ths",6,13,3,0,"#3E6F96"],["ths",-6,14,0,1,"#3E6F96"],["ths",6,14,0,0,"#3E6F96"],["col",-2,0,0,1],["col",2,0,0,0],["col",-2,-1,0,1],["col",2,-1,0,0],["mgn",-2,-3,0,1],["mgn",2,-3,0,0],["rea",-2,12,0,1],["rea",1,12,0,0],["bat",-2,11,0,1],["bat",2,11,0,0],["bat",-2,10,0,1],["bat",2,10,0,0],["bat",-2,9,0,1],["bat",2,9,0,0],["bat",-2,8,0,1],["bat",2,8,0,0],["bat",-2,7,0,1],["bat",2,7,0,0],["bat",-2,6,0,1],["bat",2,6,0,0],["gyr",-2,2,0,1],["gyr",2,2,0,0],["ant",-2,15,2,1],["ant",2,15,2,0],["bat",2,5,0,0],["bat",-2,5,0,0],["bat",-2,4,0,0],["bat",-2,3,0,0],["bat",2,3,0,0],["bat",2,4,0,0],["lcor",1,-3,0,0],["lcor",-1,-3,0,1],["lblk",0,-3,0,0],["msl",-6,8,0,0],["msl",6,8,0,1],["msl",-7,8,0,0],["msl",7,8,0,1],["ths",-7,10,1,0],["ths",6,10,3,1]]} },
    { id: 3, n: L2("Mosquito", "Mosquito"), cls: "S", code: {"sr":1,"color":"#6A7480","b":[["cks",-1,-4,0,0],["lrm3",1,-4,0,0],["lrm3",-2,-4,0,1],["rea",-1,-1,0,1],["bat",-1,1,0,1],["bat",0,1,0,1],["lblk",1,-1,2,1],["lblk",-2,-1,2,1],["lblk",-2,1,2,1],["lblk",-2,2,2,1],["lblk",1,1,2,1],["lblk",1,2,2,1],["ths",-3,0,1,1],["ths",1,0,3,1],["ths",-1,2,0,1],["ths",0,2,0,1],["ths",-3,-2,2,1],["ths",2,-2,2,1],["lrm2",-3,1,2,0],["lrm2",2,1,2,1],["gyr",-2,3,2,1],["gyr",1,3,2,1],["mgn",-1,-6,0,1],["mgn",0,-6,0,1]]} },
    { id: 4, n: L2("Dot", "Dot"), cls: "S", code: {"sr":1,"color":"#5E6B5A","b":[["ckt",0,0,0,0,"#E3B83F"],["mgn",0,-2,0,0,"#5E6B5A"],["lblk",-1,0,0,0,"#5E6B5A"],["lblk",-1,1,0,0,"#5E6B5A"],["ths",1,0,2,0,"#5E6B5A"],["lblk",-1,2,0,0,"#5E6B5A"],["gyr",0,2,0,0,"#5E6B5A"],["lblk",1,2,0,0,"#5E6B5A"],["rea",-1,3,0,0,"#5E6B5A"],["bat",1,3,0,0,"#5E6B5A"],["lblk",1,4,0,0,"#5E6B5A"],["ths",0,5,0,0,"#5E6B5A"],["ths",-3,3,1,0,"#5E6B5A"],["ths",2,3,3,0,"#5E6B5A"]]} }
  ];
  function npcBlocks(sh) { return parseShip(JSON.stringify(sh.code)) || []; }
  function shipThumb(blocks, size) {
    var cv = document.createElement("canvas"), dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = cv.height = size * dpr; cv.style.width = cv.style.height = size + "px";
    var c = cv.getContext("2d"), bb = bounds(blocks); if (!bb) return cv;
    var bw = bb.x1 - bb.x0, bh = bb.y1 - bb.y0, cs = Math.min((size - 16) / bw, (size - 16) / bh);
    c.scale(dpr, dpr); c.translate(size / 2 - (bb.x0 + bw / 2) * cs, size / 2 - (bb.y0 + bh / 2) * cs);
    drawShip(c, blocks, cs, "out", 0, null);
    return cv;
  }
  function openHangar() {
    var box = V.root.querySelector(".sr-npc"), list = box.querySelector(".sr-npc-list"); box.hidden = false;
    if (list.childElementCount) return;   // Vorschaubilder nur einmal zeichnen
    NPC.forEach(function (sh) {
      var bl = npcBlocks(sh), st = stats(bl), bb = bounds(bl), wp = [];
      if (st.mg) wp.push(st.mg + "× " + t("mg")); if (st.ms) wp.push(st.ms + "× " + t("ms")); if (st.rg) wp.push(st.rg + "× " + t("rg"));
      var card = document.createElement("div"); card.className = "sr-npc-card";
      card.appendChild(shipThumb(bl, 132));
      var tx = document.createElement("div"); tx.className = "sr-npc-tx";
      tx.innerHTML = "<small>#" + sh.id + " · " + t("cls" + sh.cls) + "</small><b>" + sh.n[lang] + "</b><span>" + nf(st.n) + " " + t("sBlocks") + " · " + nf(st.mass * 1000) + " kg · " + nf((bb.x1 - bb.x0) * CELL_M, 1) + " × " + nf((bb.y1 - bb.y0) * CELL_M, 1) + "\u00a0m</span><span>" + (wp.join(", ") || t("none")) + '</span><button type="button" data-npc="' + sh.id + '">' + t("load") + "</button>";
      card.appendChild(tx); list.appendChild(card);
    });
  }
  // Schiffscode: kompaktes JSON, damit Entwürfe geteilt und später als Gegner-Blaupausen eingebaut werden können.
  function shipCode() { return JSON.stringify({ sr: 1, color: S.color, b: S.blocks.map(function (b) { var a = [b.t, b.x, b.y, b.r, b.f]; if (b.c) a.push(b.c); return a; }) }); }
  function parseShip(txt) {
    try {
      var o = JSON.parse(String(txt).trim()); if (!o || !Array.isArray(o.b)) return null;
      var out = o.b.filter(function (a) { return Array.isArray(a) && T[a[0]]; }).map(function (a) { var b = { t: a[0], x: a[1] | 0, y: a[2] | 0, r: (a[3] | 0) & 3, f: a[4] ? 1 : 0 }; if (a[5]) b.c = String(a[5]); return b; });
      return out.length ? out : null;
    } catch (e) { return null; }
  }
  function openIO(mode) {
    var io = V.root.querySelector(".sr-exio"), ta = io.querySelector("textarea"), h = io.querySelector(".sr-io-h");
    io.hidden = false;
    io.querySelector('[data-act="io-copy"]').hidden = mode !== "exp"; io.querySelector('[data-act="io-load"]').hidden = mode !== "imp";
    if (mode === "exp") { h.textContent = lang === "de" ? "Schiffscode deines Entwurfs. Kopieren und teilen oder speichern." : "Ship code of your design. Copy and share or keep it."; ta.value = shipCode(); ta.readOnly = true; ta.select(); }
    else { h.textContent = lang === "de" ? "Schiffscode einfügen und laden. Der aktuelle Entwurf lässt sich mit Rückgängig zurückholen." : "Paste a ship code and load it. Undo brings back the current design."; ta.value = ""; ta.readOnly = false; ta.focus(); }
  }
  function undo() { var u = S.undo.pop(); if (!u) return; S.blocks = JSON.parse(u); save(); syncUI(); }
  function onClick(e) {
    var a = e.target.closest("[data-act]"), tl = e.target.closest("[data-tool]"), bk = e.target.closest("[data-blk]"), vw = e.target.closest("[data-view]"), sw = e.target.closest("[data-sw]");
    if (tl) { S.tool = tl.getAttribute("data-tool"); syncUI(); return; }
    if (bk) { S.sel = bk.getAttribute("data-blk"); S.tool = "build"; syncUI(); return; }
    if (vw) { S.view = vw.getAttribute("data-view"); syncUI(); return; }
    if (sw) { S.color = sw.getAttribute("data-sw"); S.tool = "paint"; save(); syncUI(); return; }
    if (e.target.closest(".sr-tip")) { hideTip(e.target.closest(".sr-tip")); return; }
    var pc = e.target.closest("[data-perk]"); if (pc) { togglePerk(+pc.getAttribute("data-perk")); return; }
    var spb = e.target.closest("[data-spawn]");
    if (spb) { spawnEnemy(+spb.getAttribute("data-spawn")); spb.blur(); return; }
    var nb = e.target.closest("[data-npc]");
    if (nb) { var sh = NPC.filter(function (q) { return String(q.id) === nb.getAttribute("data-npc"); })[0]; if (sh) { pushUndo(); S.blocks = npcBlocks(sh); if (sh.code.color) S.color = sh.code.color; save(); fitCam(); V.root.querySelector(".sr-npc").hidden = true; syncUI(); note(sh.n[lang] + (lang === "de" ? " geladen · Rückgängig holt dein Schiff zurück" : " loaded · Undo brings your ship back")); } return; }
    if (!a) return;
    var act = a.getAttribute("data-act");
    if (act === "rot") S.r = (S.r + 1) % 4;
    else if (act === "flip") S.f = S.f ? 0 : 1;
    else if (act === "sym") S.sym = !S.sym;
    else if (act === "symm") { S.symGap = !S.symGap; S.sym = true; save(); }
    else if (act === "undo") undo();
    else if (act === "clear") { pushUndo(); S.blocks = []; save(); }
    else if (act === "starter") { pushUndo(); S.blocks = starter(); save(); fitCam(); }
    else if (act === "exp" || act === "imp") { openIO(act); return; }
    else if (act === "npc") { openHangar(); return; }
    else if (act === "inv") { openInv(); return; }
    else if (act === "shfill") { if (FL) setShield(FL.shPct); a.blur(); return; }
    else if (act === "inv-x") { closeInv(); return; }
    else if (act === "ctl") { var cp = V.root.querySelector(".sr-ctl"), cb = V.root.querySelector(".sr-ctlb"); cp.hidden = !cp.hidden; cb.setAttribute("aria-pressed", String(!cp.hidden)); if (!cp.hidden) V.root.querySelector(".sr-hud").scrollTop = 1e5; cb.blur(); return; }
    else if (act === "npc-x") { V.root.querySelector(".sr-npc").hidden = true; return; }
    else if (act === "io-x") { V.root.querySelector(".sr-exio").hidden = true; return; }
    else if (act === "io-copy") { var ta = V.root.querySelector(".sr-exio textarea"); ta.select(); try { navigator.clipboard.writeText(ta.value).then(function () { note(lang === "de" ? "Schiffscode kopiert." : "Ship code copied."); }, function () {}); } catch (er) {} return; }
    else if (act === "io-load") { var bl = parseShip(V.root.querySelector(".sr-exio textarea").value); if (!bl) { note(lang === "de" ? "Code ungültig." : "Invalid code."); return; } pushUndo(); S.blocks = bl; save(); fitCam(); V.root.querySelector(".sr-exio").hidden = true; note(lang === "de" ? "Schiff geladen (" + bl.length + " Blöcke)." : "Ship loaded (" + bl.length + " blocks)."); }
    else if (act === "test") { startTest(); return; }
    else if (act === "edit") { stopTest(); return; }
    else if (act === "targets") { if (FL) spawnTargets(); return; }
    else if (act === "seat") { if (FL) toggleSeat(); a.blur(); return; }
    syncUI();
  }
  function onInput(e) {
    if (e.target.id === "sr-col") { S.color = e.target.value; S.tool = "paint"; save(); syncUI(); }
    if (e.target.id === "sr-uis") { hudScale(+e.target.value); try { localStorage.setItem("spacerogue-ui", String(V.uis)); } catch (er) {} }
    if (e.target.id === "sr-shp" && FL) setShield(+e.target.value);
  }
  // Schild-Zuweisung: Anteil der Gesamtkapazität wird aus der Schiffsenergie ins Schild umgebucht.
  // Leergeschossene Schilde füllen sich nicht von selbst, erst wenn der Regler neu gesetzt wird (oder ↻).
  // Setzt das Ziel; aufgeladen wird danach fließend in 1-%-Schritten mit dem Tempo der Generatoren. Weniger Anteil gibt Energie sofort zurück.
  function setShield(pct) {
    var me = FL.me; FL.shPct = pct; FL.shTarget = pct / 100 * me.cap;
    if ((me.shE || 0) > FL.shTarget) { var back = me.shE - FL.shTarget; me.shE = FL.shTarget; me.energy = Math.min(me.cap - me.shE, me.energy + back); FL.shCharging = false; }
    else FL.shCharging = FL.shTarget - (me.shE || 0) > 0.5;
  }
  function shieldTick(dt) {
    var me = FL.me; if (!FL.shCharging) return;
    if (!me.shGen) return;   // ohne Generator lädt nichts
    var step = me.cap / 100; FL.shAcc += dt * me.shGen;   // shGen = Prozent pro Sekunde
    while (FL.shAcc >= 1 && FL.shCharging) {
      FL.shAcc -= 1;
      var need = Math.min(step, FL.shTarget - me.shE); if (need <= 0.01 || me.energy < need) { if (me.energy < need) FL.shAcc = 0; break; }
      me.energy -= need; me.shE += need;
    }
    if (FL.shTarget - me.shE <= 0.5) { FL.shCharging = false; FL.shAcc = 0; floatTxt(t("shCharged"), "120,190,255"); }
    else if (Math.random() < dt * 40) {   // Sog-Effekt: blaue Partikel ziehen von außen an die Hülle
      var a = Math.random() * 6.28, r = me.rad * 0.9 + 6;
      FL.parts.push({ x: me.x + Math.cos(a) * r, y: me.y + Math.sin(a) * r, vx: me.vx - Math.cos(a) * r * 1.6, vy: me.vy - Math.sin(a) * r * 1.6, life: 0, max: 0.55, k: "suck", sz: 0.35 + Math.random() * 0.3 });
    }
  }
  // Infofeld skalieren: CSS-zoom statt Bild-Skalierung, Schrift und Symbole bleiben gestochen scharf (100 bis 150 %)
  function hudScale(k) {
    if (!V) return; k = Math.max(1, Math.min(1.5, k || 1)); V.uis = k;
    var h = V.root.querySelector(".sr-hud"), sl = V.root.querySelector("#sr-uis"), lb = V.root.querySelector("#sr-uis-v");
    if (h) { h.style.zoom = k; h.style.top = (64 / k) + "px"; h.style.left = (12 / k) + "px"; h.style.maxHeight = Math.max(200, ((V.H || 800) - 64 - 52) / k) + "px"; }
    if (sl && +sl.value !== k) sl.value = k; if (lb) lb.textContent = Math.round(k * 100) + " %";
  }
  function fitCam() { var b = bounds(S.blocks); if (!b) { V.cam = { x: 0.5, y: 0 }; return; } V.cam = { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 }; }

  function layout() {
    if (!V) return;
    var dpr = window.devicePixelRatio || 1, r = V.cv.getBoundingClientRect();
    V.W = r.width; V.H = r.height; V.cv.width = Math.round(r.width * dpr); V.cv.height = Math.round(r.height * dpr);
    V.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    hudScale(V.uis);
  }
  function loop(now) {
    if (!V) return;
    raf = requestAnimationFrame(loop);
    var dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    var dpr = window.devicePixelRatio || 1; V.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (S.mode === "fly" && FL) { var g = FL.paused ? 0 : dt; while (g > 0) { var d = Math.min(1 / 120, g); flTick(d); g -= d; } flDraw(); }
    else {
      var k = V.keys, sp = 14 / V.zoom * dt;
      if (k.w || k.arrowup) V.cam.y -= sp; if (k.s || k.arrowdown) V.cam.y += sp; if (k.a || k.arrowleft) V.cam.x -= sp; if (k.d || k.arrowright) V.cam.x += sp;
      edDraw();
    }
  }

  function mount(el, l) {
    unmount();
    lang = l === "en" ? "en" : "de";
    var o = document.getElementById("sr-css"); if (o) o.remove();
    var st = document.createElement("style"); st.id = "sr-css"; st.textContent = CSS; document.head.appendChild(st);
    load();
    el.innerHTML = html();
    V = { root: el, cv: el.querySelector("#sr-cv"), zoom: 1.25, cam: { x: 0.5, y: 0 }, keys: {}, ovOld: document.body.style.overflow };
    V.ctx = V.cv.getContext("2d");
    document.body.style.overflow = "hidden";
    fitCam(); layout(); syncUI();
    var us = 1; try { us = parseFloat(localStorage.getItem("spacerogue-ui")) || 1; } catch (e) {} hudScale(us);
    V.cv.addEventListener("pointerdown", onDown); window.addEventListener("pointermove", onMove); window.addEventListener("pointerup", onUp); window.addEventListener("pointercancel", onUp);
    V.cv.addEventListener("wheel", onWheel, { passive: false }); V.cv.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    V.cv.addEventListener("pointerleave", function () { if (V && S.mode !== "fly") V.mouse = null; });
    el.addEventListener("click", onClick); el.addEventListener("input", onInput);
    el.addEventListener("change", function (e) { if (e.target.type === "range") e.target.blur(); });   // Regler loslassen gibt WASD wieder frei
    window.addEventListener("keydown", onKey); window.addEventListener("keyup", onKeyUp); window.addEventListener("resize", layout);
    window.addEventListener("blur", releaseKeys);
    last = 0; raf = requestAnimationFrame(loop);
  }
  function releaseKeys() { if (V) V.keys = {}; if (FL) { FL.keys = {}; FL.fire = false; } }
  function unmount() {
    if (raf) cancelAnimationFrame(raf); raf = 0;
    if (!V) return;
    window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); window.removeEventListener("pointercancel", onUp);
    window.removeEventListener("keydown", onKey); window.removeEventListener("keyup", onKeyUp); window.removeEventListener("resize", layout); window.removeEventListener("blur", releaseKeys);
    document.body.style.overflow = V.ovOld || "";
    FL = null; if (S) S.mode = "edit"; V = null;
  }
  window.SpaceRogue = { mount: mount, unmount: unmount, _debug: function () { return { S: S, V: V, FL: FL, T: T, stats: stats, rooms: rooms, components: components, starter: starter, startTest: startTest, damage: damage }; } };
})();
