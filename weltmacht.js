/* Weltmacht 0.1 – Strategiespiel nach den Grundregeln des klassischen Eroberungsspiels, mit Token-Wirtschaft,
   Elite-Armeen (W8), Provinz-Ausbau und einer KI, die nach denselben Regeln spielt. Für Color Space.
   Einbindung: weltmacht.js per script-Tag laden, dann Weltmacht.mount(element, "de" | "en") und Weltmacht.unmount().
   Der Spielstand liegt nur lokal im Browser (localStorage "weltmacht-v1"). */
(function () {
  "use strict";

  var VERSION = "0.1", KEY = "weltmacht-v1", MW = 1600, MH = 900;
  var lang = "de";
  function L2(de, en) { return { de: de, en: en }; }

  // Landmassen: Umriss + welche Provinzen darauf liegen. Koordinaten in einer 1600 × 900 Karte.
  var LANDS = [
    { pts: [[70,150],[170,95],[300,78],[420,68],[520,88],[562,138],[525,168],[478,170],[462,205],[505,228],[522,282],[478,330],[430,360],[400,398],[372,430],[352,462],[378,505],[412,530],[428,548],[412,556],[372,532],[332,500],[292,478],[262,448],[226,418],[196,378],[166,330],[136,282],[106,240],[66,200]],
      ids: ["ala","yuk","nwt","nun","bc","alb","man","ont","que","cal","roc","pla","eas","tex","flo","mex","cam"] },
    { pts: [[560,40],[650,28],[690,52],[668,110],[630,150],[596,135],[568,90]], ids: ["grn","grs"] },
    { pts: [[436,552],[484,540],[542,568],[602,598],[624,648],[594,720],[544,792],[504,852],[472,862],[460,802],[440,722],[420,650],[412,592]], ids: ["ven","per","amz","neb","bol","sbr","arg","pat"] },
    { pts: [[684,100],[714,94],[720,118],[690,126]], ids: ["ice"] },
    { pts: [[678,148],[704,138],[714,180],[692,204],[676,182]], ids: ["gbr"] },
    { pts: [[724,128],[792,98],[862,88],[900,118],[902,170],[882,230],[862,258],[822,270],[780,282],[742,272],[704,262],[700,232],[724,214],[708,178]], ids: ["nor","fin","bal","pol","ger","fra","ibe","ita","blk","ukr"] },
    { pts: [[700,318],[800,300],[882,308],[930,338],[958,380],[990,420],[972,480],[942,540],[902,620],[862,680],[822,702],[792,652],[772,582],[752,500],[712,442],[690,380]], ids: ["mor","alg","lib","egy","waf","sah","sud","eth","kon","eaf","ang","moz","saf"] },
    { pts: [[958,598],[982,588],[988,640],[966,662]], ids: ["mad"] },
    { pts: [[902,100],[1002,70],[1152,58],[1302,68],[1452,88],[1542,128],[1502,170],[1462,200],[1432,250],[1402,300],[1352,330],[1332,380],[1292,422],[1262,452],[1222,442],[1182,402],[1152,432],[1112,452],[1082,422],[1052,382],[1002,362],[962,342],[932,322],[902,282],[882,230],[902,170]],
      ids: ["ura","wsi","zsi","jak","tsc","kam","irk","amu","kas","mon","man2","kor","wch","nch","sch","tib","afg","per2","tur","lev","ind","ich"] },
    { pts: [[934,334],[1000,352],[1042,392],[1012,442],[962,432],[938,384]], ids: ["ara"] },
    { pts: [[1478,212],[1502,202],[1514,248],[1484,312],[1464,292],[1474,250]], ids: ["jap"] },
    { pts: [[1330,418],[1356,412],[1362,460],[1336,466]], ids: ["phi"] },
    { pts: [[1232,492],[1300,486],[1318,512],[1250,522]], ids: ["inw"] },
    { pts: [[1324,494],[1388,500],[1394,522],[1330,526]], ids: ["ino"] },
    { pts: [[1404,530],[1482,534],[1492,562],[1412,564]], ids: ["ngu"] },
    { pts: [[1300,620],[1382,580],[1462,590],[1522,640],[1522,720],[1462,762],[1382,752],[1322,722],[1290,670]], ids: ["wau","ntr","qld","sau","nsw"] },
    { pts: [[1560,738],[1582,728],[1592,782],[1566,802]], ids: ["nze"] }
  ];
  var PROV = {
    ala: ["Alaska", 140, 145, "na"], yuk: ["Yukon", 225, 118, "na"], nwt: ["Nordwest-Territorien", 320, 108, "na"], nun: ["Nunavut", 425, 100, "na"],
    grn: ["Grönland Nord", 640, 62, "na"], grs: ["Grönland Süd", 622, 118, "na"],
    bc: ["British Columbia", 185, 205, "na"], alb: ["Alberta", 262, 185, "na"], man: ["Manitoba", 345, 178, "na"], ont: ["Ontario", 410, 215, "na"], que: ["Québec", 482, 244, "na"],
    cal: ["Kalifornien", 185, 300, "na"], roc: ["Rocky Mountains", 262, 268, "na"], pla: ["Great Plains", 335, 262, "na"], eas: ["Ostküste", 438, 300, "na"],
    tex: ["Texas", 305, 355, "na"], flo: ["Südstaaten", 395, 345, "na"], mex: ["Mexiko", 300, 432, "na"], cam: ["Mittelamerika", 382, 512, "na"],
    ven: ["Venezuela", 488, 572, "sa"], per: ["Peru", 446, 652, "sa"], amz: ["Amazonas", 528, 615, "sa"], neb: ["Nordost-Brasilien", 590, 640, "sa"],
    bol: ["Bolivien", 498, 694, "sa"], sbr: ["Südbrasilien", 560, 704, "sa"], arg: ["Argentinien", 498, 772, "sa"], pat: ["Patagonien", 486, 836, "sa"],
    ice: ["Island", 702, 111, "eu"], gbr: ["Großbritannien", 696, 172, "eu"], nor: ["Skandinavien", 768, 124, "eu"], fin: ["Finnland", 840, 118, "eu"],
    bal: ["Baltikum", 862, 160, "eu"], pol: ["Polen", 830, 192, "eu"], ger: ["Deutschland", 784, 198, "eu"], fra: ["Frankreich", 742, 222, "eu"],
    ibe: ["Iberien", 722, 252, "eu"], ita: ["Italien", 798, 250, "eu"], blk: ["Balkan", 846, 238, "eu"], ukr: ["Ukraine", 872, 208, "eu"],
    mor: ["Marokko", 730, 345, "af"], alg: ["Algerien", 792, 332, "af"], lib: ["Libyen", 852, 336, "af"], egy: ["Ägypten", 910, 352, "af"],
    waf: ["Westafrika", 742, 422, "af"], sah: ["Sahel", 822, 402, "af"], sud: ["Sudan", 900, 412, "af"], eth: ["Äthiopien", 958, 444, "af"],
    kon: ["Kongo", 842, 502, "af"], eaf: ["Ostafrika", 918, 512, "af"], ang: ["Angola", 818, 582, "af"], moz: ["Mosambik", 898, 592, "af"],
    saf: ["Südafrika", 840, 662, "af"], mad: ["Madagaskar", 972, 626, "af"],
    ura: ["Ural", 942, 140, "as"], wsi: ["Westsibirien", 1020, 118, "as"], zsi: ["Zentralsibirien", 1120, 100, "as"], jak: ["Jakutien", 1230, 96, "as"],
    tsc: ["Tschukotka", 1352, 98, "as"], kam: ["Kamtschatka", 1452, 122, "as"], irk: ["Irkutsk", 1140, 165, "as"], amu: ["Amur", 1320, 165, "as"],
    kas: ["Kasachstan", 1000, 215, "as"], mon: ["Mongolei", 1205, 218, "as"], man2: ["Mandschurei", 1345, 220, "as"], kor: ["Korea", 1396, 264, "as"],
    wch: ["Westchina", 1100, 262, "as"], nch: ["Nordchina", 1252, 268, "as"], sch: ["Südchina", 1252, 335, "as"], tib: ["Tibet", 1162, 322, "as"],
    afg: ["Afghanistan", 1040, 282, "as"], per2: ["Persien", 1010, 325, "as"], tur: ["Türkei", 936, 270, "as"], lev: ["Levante", 950, 318, "as"],
    ind: ["Indien", 1112, 398, "as"], ich: ["Indochina", 1236, 412, "as"], ara: ["Arabien", 978, 396, "as"], jap: ["Japan", 1488, 256, "as"],
    phi: ["Philippinen", 1346, 440, "oc"], inw: ["Sumatra", 1272, 505, "oc"], ino: ["Borneo", 1358, 511, "oc"], ngu: ["Neuguinea", 1446, 548, "oc"],
    wau: ["Westaustralien", 1340, 668, "oc"], ntr: ["Nordterritorium", 1410, 622, "oc"], qld: ["Queensland", 1482, 652, "oc"],
    sau: ["Südaustralien", 1420, 722, "oc"], nsw: ["Neusüdwales", 1486, 718, "oc"], nze: ["Neuseeland", 1576, 766, "oc"]
  };
  var SEA = [["ala","kam"],["grs","ice"],["grn","nun"],["grs","que"],["ice","gbr"],["ice","nor"],["gbr","fra"],["gbr","nor"],["gbr","ger"],["ibe","mor"],["ita","lib"],["ita","alg"],
    ["blk","tur"],["eaf","ara"],["eth","ara"],["mad","moz"],["mad","eaf"],["neb","waf"],["cam","ven"],["ich","inw"],["inw","ino"],["ino","ngu"],["ngu","qld"],["ngu","ntr"],
    ["ino","wau"],["phi","sch"],["phi","ino"],["jap","kor"],["jap","kam"],["jap","man2"],["nze","nsw"],["nze","qld"],["egy","lev"],["ukr","tur"]];
  var CONT = { na: ["Nordamerika", 15], sa: ["Südamerika", 6], eu: ["Europa", 15], af: ["Afrika", 9], as: ["Asien", 21], oc: ["Ozeanien", 6] };

  // ---------- Regeln ----------
  var COST = { n: 5, e: 10, up: 20 }, MAXLVL = 3, CARD_VALUES = [20, 30, 40, 50, 60, 75];
  var START = { 2: 120, 3: 100, 4: 85, 5: 75, 6: 65 };
  var FACT = {
    us: { name: L2("Amerika", "America"), col: "#2F5DA8", em: "star" },
    cn: { name: L2("China", "China"), col: "#C8372D", em: "stars" },
    eu: { name: L2("Europa", "Europe"), col: "#3E8E5A", em: "ring" },
    au: { name: L2("Australien", "Australia"), col: "#D9962B", em: "cross" },
    ru: { name: L2("Russland", "Russia"), col: "#6B4C9A", em: "bars" },
    jp: { name: L2("Japan", "Japan"), col: "#D8577E", em: "sun" }
  };
  var FORDER = ["us", "cn", "eu", "au", "ru", "jp"];
  var IDS = Object.keys(PROV);

  var TX = {
    title: L2("Weltmacht", "Weltmacht"),
    setupH: L2("Neues Spiel", "New game"), players: L2("Spieler", "Players"), human: L2("Mensch", "Human"), ai: L2("KI", "AI"),
    aiSpeed: L2("Tempo der KI", "AI speed"), normal: L2("Normal", "Normal"), fast: L2("Schnell", "Fast"),
    start: L2("Spiel starten", "Start game"), cont: L2("Weiterspielen", "Continue"), newGame: L2("Neues Spiel", "New game"),
    round: L2("Runde {n}", "Round {n}"), setupRound: L2("Aufstellung", "Deployment"),
    ph: { setup: L2("Aufstellung", "Deployment"), buy: L2("Einkaufen", "Spend"), attack: L2("Angriff", "Attack"), move: L2("Verlegen", "Fortify"), over: L2("Spielende", "Game over") },
    next: { setup: L2("Aufstellung beenden", "Finish deployment"), buy: L2("Weiter zum Angriff", "Go to attack"), attack: L2("Weiter zum Verlegen", "Go to fortify"), move: L2("Zug beenden", "End turn") },
    tokens: L2("Token", "Tokens"), income: L2("Einkommen", "Income"), provs: L2("Provinzen", "Provinces"), armies: L2("Armeen", "Armies"), cards: L2("Karten", "Cards"),
    buyN: L2("Armee", "Army"), buyE: L2("Elite", "Elite"), upEco: L2("Wirtschaft", "Economy"), upDef: L2("Verteidigung", "Defence"),
    lvl: L2("Stufe {n}/3", "Level {n}/3"),
    pickOwn: L2("Wähle eine eigene Provinz, um Armeen zu kaufen oder sie auszubauen.", "Pick one of your provinces to buy armies or upgrade it."),
    pickAtt: L2("Wähle eine eigene Provinz mit mindestens 2 Armeen, dann ein benachbartes feindliches Ziel.", "Pick one of your provinces with at least 2 armies, then a neighbouring enemy target."),
    pickTarget: L2("Jetzt ein benachbartes feindliches Ziel wählen.", "Now pick a neighbouring enemy target."),
    pickMove: L2("Einmal pro Zug: Armeen von einer Provinz in eine verbundene eigene Provinz verlegen.", "Once per turn: move armies from one province to a connected province of yours."),
    pickDest: L2("Jetzt das Ziel wählen (über eigene Provinzen verbunden).", "Now pick the destination (connected through your provinces)."),
    moved: L2("Verlegung für diesen Zug erledigt.", "Fortify done for this turn."),
    dice: L2("Würfel", "Dice"), eliteFirst: L2("Elite voran", "Elite first"), showDice: L2("Würfel zeigen", "Show dice"),
    attack: L2("Angreifen", "Attack"), blitz: L2("Bis zum Ende", "Until done"), cancel: L2("Abbrechen", "Cancel"),
    moveIn: L2("Nachrücken", "Move in"), moveOk: L2("Verlegen", "Move"), all: L2("Alle", "All"), min: L2("Minimum", "Minimum"),
    vs: L2("gegen", "vs"), defDice: L2("Verteidigung würfelt {d}", "Defence rolls {d}"), attDice: L2("Angriff würfelt {d}", "Attack rolls {d}"),
    trade: L2("Set einlösen (+{n} Token)", "Trade set (+{n} tokens)"), mustTrade: L2("Du hast 5 Karten und musst ein Set einlösen.", "You hold 5 cards and must trade a set."),
    noSet: L2("Noch kein einlösbares Set", "No set to trade yet"),
    sym: { i: L2("Infanterie", "Infantry"), c: L2("Kavallerie", "Cavalry"), a: L2("Kanone", "Cannon"), w: L2("Joker", "Wild") },
    owner: L2("Besitzer", "Owner"), neutral: L2("niemand", "nobody"),
    ecoInfo: L2("+{n} Token pro Runde", "+{n} tokens per round"), defInfo: L2("verteidigt mit W{a} / Elite W{b}", "defends with d{a} / elite d{b}"),
    thinking: L2("{p} ist am Zug …", "{p} is playing …"), yourTurn: L2("{p} ist am Zug", "{p} to move"),
    won: L2("{p} beherrscht die Welt!", "{p} rules the world!"), out: L2("{p} ist ausgeschieden.", "{p} has been eliminated."),
    lConq: L2("{p} erobert {t}", "{p} takes {t}"), lHold: L2("{t} hält gegen {p}", "{t} holds against {p}"), lBuy: L2("{p} rüstet auf", "{p} builds up"),
    lCard: L2("{p} löst Karten ein (+{n})", "{p} trades cards (+{n})"), lInc: L2("{p} erhält {n} Token", "{p} receives {n} tokens"),
    lUp: L2("{p} baut {t} aus", "{p} upgrades {t}"),
    help: L2("Spielregeln", "Rules"), sound: L2("Ton", "Sound"), on: L2("an", "on"), off: L2("aus", "off"),
    back: L2("← Apps", "← Apps"), close: L2("Schließen", "Close"), sure: L2("Wirklich neu anfangen?", "Really start over?"),
    rules: {
      de: ["Ziel: alle Provinzen erobern. Gespielt wird reihum, jeder Zug hat drei Phasen: Einkaufen, Angreifen, Verlegen.",
        "Wirtschaft: Zu Beginn deines Zuges bekommst du Token: 1 pro Provinz (mindestens 3), dazu den Bonus für jeden ganzen Kontinent und die Wirtschaftsstufen deiner Provinzen. Token kannst du sparen. Eine Armee kostet 5 Token, eine Elite-Armee 10.",
        "Ausbau: Für 20 Token pro Stufe baust du eine Provinz aus, höchstens dreimal und nur in eine Richtung. Wirtschaft bringt +1 Token pro Stufe und Runde. Verteidigung gibt den Verteidigern dort ein Würfelauge mehr pro Stufe: normale Armeen W7 bis W9, Elite W9 bis W11.",
        "Kampf: Der Angreifer würfelt mit bis zu 3 Würfeln (eine Armee muss zurückbleiben), der Verteidiger mit bis zu 2. Normale Armeen würfeln W6, Elite W8. Die höchsten Würfel werden verglichen, bei Gleichstand gewinnt der Verteidiger. Die Armee, deren Würfel verliert, fällt. Verteidiger kämpfen erst mit ihren normalen Armeen, Elite zuletzt; beim Angriff entscheidest du mit „Elite voran“.",
        "Erobern: Fällt die letzte Armee, rückst du mit mindestens so vielen Armeen nach, wie du zuletzt gewürfelt hast. Ausbaustufen bleiben der Provinz erhalten. Wer in einem Zug mindestens eine Provinz erobert, zieht am Ende eine Bonuskarte.",
        "Bonuskarten: Drei gleiche Symbole oder je eine Infanterie, Kavallerie und Kanone (Joker zählen für alles) bringen Token: 20, 30, 40, 50, 60, 75, danach jeweils 25 mehr. Gehört dir eine Provinz auf den eingelösten Karten, stehen dort sofort 2 Armeen mehr. Mit 5 Karten musst du einlösen. Wer einen Spieler auslöscht, übernimmt seine Karten.",
        "Verlegen: Einmal pro Zug darfst du Armeen von einer Provinz in eine andere verlegen, wenn beide über eigene Provinzen verbunden sind. Eine Armee bleibt immer zurück.",
        "Kontinentbonus pro Runde: Nordamerika 15, Europa 15, Asien 21, Afrika 9, Südamerika 6, Ozeanien 6 Token.",
        "Die Würfel laufen im Hintergrund. Mit „Würfel zeigen“ siehst du jeden Wurf."],
      en: ["Goal: conquer every province. Players take turns, each turn has three phases: spend, attack, fortify.",
        "Economy: at the start of your turn you get tokens: 1 per province (at least 3), plus the bonus for every whole continent and the economy levels of your provinces. Tokens can be saved. An army costs 5 tokens, an elite army 10.",
        "Upgrades: for 20 tokens per level you upgrade a province, at most three times and in one direction only. Economy adds +1 token per level and round. Defence gives the defenders there one more pip per level: normal armies d7 to d9, elite d9 to d11.",
        "Combat: the attacker rolls up to 3 dice (one army must stay behind), the defender up to 2. Normal armies roll d6, elite d8. The highest dice are compared, ties go to the defender. The army whose die loses falls. Defenders fight with their normal armies first and elite last; when attacking you decide with “Elite first”.",
        "Conquest: when the last army falls you move in with at least as many armies as you last rolled dice. Upgrades stay with the province. Conquer at least one province in a turn and you draw a bonus card at its end.",
        "Bonus cards: three of a kind or one infantry, cavalry and cannon each (wild cards count as anything) give tokens: 20, 30, 40, 50, 60, 75, then 25 more each time. If you own a province shown on the traded cards, 2 extra armies appear there. With 5 cards you must trade. Eliminate a player and you take their cards.",
        "Fortify: once per turn you may move armies from one province to another if both are connected through your provinces. One army always stays behind.",
        "Continent bonus per round: North America 15, Europe 15, Asia 21, Africa 9, South America 6, Oceania 6 tokens.",
        "Dice are rolled in the background. Turn on “Show dice” to see every roll."]
    }
  };
  function t(k) { return TX[k][lang]; }
  function fmt(s, o) { return s.replace(/\{(\w+)\}/g, function (_, k) { return o[k]; }); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), x = a[i]; a[i] = a[j]; a[j] = x; } return a; }

  // ---------- Karte berechnen ----------
  // Jede Landmasse wird zeilenweise gefüllt; jedes Pixel gehört zur nächsten Provinz dieser Landmasse (mit etwas Rauschen für natürliche Grenzen)
  var LAB = null, ADJ = {}, EDGE = {}, BORDER = null, CEN = {};
  function hash(x, y) { var n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); }
  function vnoise(x, y) { var X = Math.floor(x), Y = Math.floor(y), fx = x - X, fy = y - Y, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy); return (hash(X, Y) * (1 - u) + hash(X + 1, Y) * u) * (1 - v) + (hash(X, Y + 1) * (1 - u) + hash(X + 1, Y + 1) * u) * v; }
  // Küsten: Umriss glätten, fein unterteilen und mit Rauschen leicht ausfransen
  function coast(pts) {
    var p = pts.map(function (q) { return [q[0], q[1]]; });
    for (var it = 0; it < 2; it++) {
      var o = [];
      for (var i = 0; i < p.length; i++) { var a = p[i], b = p[(i + 1) % p.length]; o.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); }
      p = o;
    }
    var out = [];
    for (var k = 0; k < p.length; k++) {
      var A = p[k], B = p[(k + 1) % p.length], L = Math.hypot(B[0] - A[0], B[1] - A[1]), n = Math.max(1, Math.round(L / 7)), nx = -(B[1] - A[1]) / (L || 1), ny = (B[0] - A[0]) / (L || 1);
      for (var j = 0; j < n; j++) {
        var x = A[0] + (B[0] - A[0]) * j / n, y = A[1] + (B[1] - A[1]) * j / n, d = (vnoise(x / 22, y / 22) - 0.5) * 10 + (vnoise(x / 7, y / 7) - 0.5) * 3.5;
        out.push([x + nx * d, y + ny * d]);
      }
    }
    return out;
  }
  function buildMap() {
    if (LAB) return;
    LAB = new Int16Array(MW * MH).fill(-1);
    var idx = {}; IDS.forEach(function (id, i) { idx[id] = i; });
    LANDS.forEach(function (L) {
      var pts = coast(L.pts), seeds = L.ids.map(function (id) { return [idx[id], PROV[id][1], PROV[id][2]]; });
      var y0 = MH, y1 = 0; pts.forEach(function (p) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); });
      for (var y = Math.max(0, Math.floor(y0)); y <= Math.min(MH - 1, Math.ceil(y1)); y++) {
        var xs = [], yc = y + 0.5;
        for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          var a = pts[i], b = pts[j];
          if ((a[1] > yc) !== (b[1] > yc)) xs.push(a[0] + (yc - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
        }
        xs.sort(function (p, q) { return p - q; });
        for (var k = 0; k + 1 < xs.length; k += 2) {
          for (var x = Math.max(0, Math.ceil(xs[k] - 0.5)); x <= Math.min(MW - 1, Math.floor(xs[k + 1] - 0.5)); x++) {
            var o = y * MW + x; if (LAB[o] >= 0) continue;
            var nz = (vnoise(x / 34, y / 34) - 0.5) * 46 + (vnoise(x / 11, y / 11) - 0.5) * 12, best = -1, bd = 1e9;
            for (var s = 0; s < seeds.length; s++) { var dx = x - seeds[s][1], dy = y - seeds[s][2], d = Math.sqrt(dx * dx + dy * dy) + nz; if (d < bd) { bd = d; best = seeds[s][0]; } }
            LAB[o] = best;
          }
        }
      }
    });
    // Nachbarn, Grenzpunkte, Grenzpixel
    BORDER = new Uint8Array(MW * MH);
    var acc = {};
    IDS.forEach(function (id) { ADJ[id] = {}; });
    for (var y2 = 0; y2 < MH; y2++) for (var x2 = 0; x2 < MW; x2++) {
      var o2 = y2 * MW + x2, a2 = LAB[o2]; if (a2 < 0) continue;
      var bt = 0;
      for (var n = 0; n < 4; n++) {
        var nx = x2 + (n === 0 ? 1 : n === 1 ? -1 : 0), ny = y2 + (n === 2 ? 1 : n === 3 ? -1 : 0);
        var b2 = nx < 0 || ny < 0 || nx >= MW || ny >= MH ? -1 : LAB[ny * MW + nx];
        if (b2 === a2) continue;
        if (b2 < 0) { bt = 3; continue; }
        var A = IDS[a2], B = IDS[b2];
        ADJ[A][B] = 1;
        var key = A < B ? A + "|" + B : B + "|" + A, e = acc[key] || (acc[key] = [0, 0, 0]); e[0] += x2; e[1] += y2; e[2]++;
        bt = Math.max(bt, PROV[A][3] !== PROV[B][3] ? 2 : 1);
      }
      BORDER[o2] = bt;
    }
    Object.keys(acc).forEach(function (k) { var e = acc[k]; EDGE[k] = { x: e[0] / e[2], y: e[1] / e[2] }; });
    SEA.forEach(function (s) { ADJ[s[0]][s[1]] = 1; ADJ[s[1]][s[0]] = 1; var k = s[0] < s[1] ? s[0] + "|" + s[1] : s[1] + "|" + s[0]; if (!EDGE[k]) EDGE[k] = { x: (PROV[s[0]][1] + PROV[s[1]][1]) / 2, y: (PROV[s[0]][2] + PROV[s[1]][2]) / 2, sea: 1 }; });
    [["ukr", "ura"], ["bal", "ura"], ["egy", "lev"]].forEach(function (l) { ADJ[l[0]][l[1]] = 1; ADJ[l[1]][l[0]] = 1; });   // Landgrenzen, die das Küstenrauschen sonst trennen könnte
    IDS.forEach(function (id) { CEN[id] = { x: PROV[id][1], y: PROV[id][2] }; ADJ[id] = Object.keys(ADJ[id]); });
  }
  function edgePt(a, b) { return EDGE[a < b ? a + "|" + b : b + "|" + a] || { x: (CEN[a].x + CEN[b].x) / 2, y: (CEN[a].y + CEN[b].y) / 2 }; }

  // ---------- Spielzustand ----------
  var G = null;
  function P(id) { return G.prov[id]; }
  function cur() { return G.players[G.turn]; }
  function units(id) { var p = P(id); return p.n + p.e; }
  function owned(pi) { return IDS.filter(function (id) { return P(id).o === pi; }); }
  function contOwner(c) { var o = -2; for (var i = 0; i < IDS.length; i++) { var id = IDS[i]; if (PROV[id][3] !== c) continue; var ow = P(id).o; if (o === -2) o = ow; else if (o !== ow) return -1; } return o; }
  function income(pi) {
    var mine = owned(pi), inc = Math.max(3, mine.length);
    mine.forEach(function (id) { var p = P(id); if (p.up === "eco") inc += p.lvl; });
    Object.keys(CONT).forEach(function (c) { if (contOwner(c) === pi) inc += CONT[c][1]; });
    return inc;
  }
  function defSides(id, elite) { var p = P(id); return (elite ? 8 : 6) + (p.up === "def" ? p.lvl : 0); }
  function cardValue() { var k = G.sets; return k < CARD_VALUES.length ? CARD_VALUES[k] : 75 + 25 * (k - CARD_VALUES.length + 1); }
  function newGame(seats, speed) {
    buildMap();
    G = { v: 1, players: seats.map(function (s, i) { return { fac: s.fac, human: s.human, tokens: 0, cards: [], alive: true, i: i }; }),
      prov: {}, turn: 0, round: 0, phase: "setup", sets: 0, deck: [], conq: false, moved: false, log: [], speed: speed || "normal", winner: -1, first: true };
    // ausgewogen verteilen: reihum, Rest gleicht ein Token-Ausgleich aus
    var order = shuffle(IDS.slice()), np = seats.length;
    order.forEach(function (id, k) { G.prov[id] = { o: k % np, n: 1, e: 0, up: null, lvl: 0 }; });
    var counts = G.players.map(function (p, i) { return owned(i).length; }), mx = Math.max.apply(null, counts);
    G.players.forEach(function (p, i) { p.tokens = START[np] + 5 * (mx - counts[i]); });
    var syms = ["i", "c", "a"];
    G.deck = shuffle(IDS.map(function (id, k) { return { p: id, s: syms[k % 3] }; }).concat([{ p: null, s: "w" }, { p: null, s: "w" }]));
    G.turn = 0;
    logMsg(fmt(t("setupRound"), {}));
    save();
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(G)); } catch (e) {} }
  function load() { try { var g = JSON.parse(localStorage.getItem(KEY) || "null"); if (g && g.v === 1 && g.prov) return g; } catch (e) {} return null; }
  function pname(pi) { return FACT[G.players[pi].fac].name[lang]; }
  function logMsg(s) { G.log.unshift(s); if (G.log.length > 40) G.log.length = 40; }

  // ---------- Züge ----------
  function startTurn() {
    var p = cur();
    G.conq = false; G.moved = false;
    if (G.round === 0) { G.phase = "setup"; }
    else {
      var inc = income(G.turn); p.tokens += inc; G.phase = "buy";
      logMsg(fmt(t("lInc"), { p: pname(G.turn), n: inc }));
    }
    sel = null; target = null; save(); refresh();
    if (!p.human) runAI();
  }
  function nextPhase() {
    if (G.phase === "setup") return endTurn();
    if (G.phase === "buy") { if (cur().cards.length >= 5) return; G.phase = "attack"; }
    else if (G.phase === "attack") G.phase = "move";
    else if (G.phase === "move") return endTurn();
    sel = null; target = null; save(); refresh();
  }
  function endTurn() {
    var p = cur();
    if (G.conq && G.deck.length) p.cards.push(G.deck.pop());
    var n = G.players.length, i = G.turn;
    do { i = (i + 1) % n; if (i === 0) G.round++; } while (!G.players[i].alive);
    G.turn = i;
    startTurn();
  }
  function canBuy() { return G.phase === "buy" || G.phase === "setup"; }
  function buy(id, kind, k) {
    var p = cur(), pr = P(id), c = COST[kind] * (k || 1);
    if (!canBuy() || pr.o !== G.turn || p.tokens < c) return false;
    p.tokens -= c; pr[kind] += (k || 1); return true;
  }
  function upgrade(id, kind) {
    var p = cur(), pr = P(id);
    if (!canBuy() || pr.o !== G.turn || p.tokens < COST.up || pr.lvl >= MAXLVL || (pr.up && pr.up !== kind)) return false;
    p.tokens -= COST.up; pr.up = kind; pr.lvl++;
    logMsg(fmt(t("lUp"), { p: pname(G.turn), t: PROV[id][0] }));
    return true;
  }
  // Set suchen: drei gleiche oder alle drei verschieden; Joker füllen auf. Bevorzugt Karten mit eigenen Provinzen.
  function findSet(cards, pi) {
    var best = null;
    for (var a = 0; a < cards.length; a++) for (var b = a + 1; b < cards.length; b++) for (var c = b + 1; c < cards.length; c++) {
      var s = [cards[a].s, cards[b].s, cards[c].s], w = s.filter(function (x) { return x === "w"; }).length, r = s.filter(function (x) { return x !== "w"; });
      var ok = w >= 1 || (r[0] === r[1] && r[1] === r[2]) || (r[0] !== r[1] && r[1] !== r[2] && r[0] !== r[2]);
      if (!ok) continue;
      var sc = [a, b, c].filter(function (k) { return cards[k].p && P(cards[k].p).o === pi; }).length * 2 - w;
      if (!best || sc > best.sc) best = { k: [a, b, c], sc: sc };
    }
    return best;
  }
  function tradeCards(pi) {
    var p = G.players[pi], set = findSet(p.cards, pi); if (!set) return 0;
    var val = cardValue(); G.sets++;
    p.tokens += val;
    var bonusDone = false;
    set.k.slice().sort(function (x, y) { return y - x; }).forEach(function (k) {
      var c = p.cards[k];
      if (!bonusDone && c.p && P(c.p).o === pi) { P(c.p).n += 2; bonusDone = true; }
      p.cards.splice(k, 1); G.deck.unshift(c);
    });
    logMsg(fmt(t("lCard"), { p: pname(pi), n: val }));
    return val;
  }

  // ---------- Kampf ----------
  function rollDie(sides) { return 1 + Math.floor(Math.random() * sides); }
  // Eine Würfelrunde. Gibt die Würfe und Verluste zurück.
  function battle(from, to, nd, eliteFirst) {
    var A = P(from), D = P(to), avail = A.n + A.e - 1;
    nd = clamp(nd, 1, Math.min(3, avail));
    var att = [], ae = eliteFirst ? Math.min(A.e, nd) : Math.max(0, nd - A.n);   // ohne „Elite voran“ kommt Elite nur, wenn normale fehlen
    for (var i = 0; i < nd; i++) { var el = i < ae; att.push({ el: el, sides: el ? 8 : 6 }); }
    var dn = Math.min(2, D.n + D.e), def = [];
    var dnN = Math.min(D.n, dn);
    for (var j = 0; j < dn; j++) { var de = j >= dnN; def.push({ el: de, sides: defSides(to, de) }); }
    att.forEach(function (d) { d.v = rollDie(d.sides); }); def.forEach(function (d) { d.v = rollDie(d.sides); });
    att.sort(function (x, y) { return y.v - x.v; }); def.sort(function (x, y) { return y.v - x.v; });
    var lossA = { n: 0, e: 0 }, lossD = { n: 0, e: 0 };
    for (var k = 0; k < Math.min(att.length, def.length); k++) {
      if (att[k].v > def[k].v) { def[k].lost = true; lossD[def[k].el ? "e" : "n"]++; }
      else { att[k].lost = true; lossA[att[k].el ? "e" : "n"]++; }
    }
    A.n -= lossA.n; A.e -= lossA.e; D.n -= lossD.n; D.e -= lossD.e;
    var res = { att: att, def: def, lossA: lossA, lossD: lossD, nd: nd, from: from, to: to, won: D.n + D.e === 0 };
    return res;
  }
  function conquer(from, to, moveN, moveE) {
    var A = P(from), D = P(to), old = D.o;
    D.o = A.o; D.n = moveN; D.e = moveE; A.n -= moveN; A.e -= moveE;
    G.conq = true;
    logMsg(fmt(t("lConq"), { p: pname(A.o), t: PROV[to][0] }));
    if (old >= 0 && !owned(old).length) {
      var vic = G.players[A.o], los = G.players[old];
      los.alive = false; vic.cards = vic.cards.concat(los.cards); los.cards = [];
      logMsg(fmt(t("out"), { p: pname(old) }));
      if (G.players.filter(function (p) { return p.alive; }).length === 1) { G.phase = "over"; G.winner = A.o; logMsg(fmt(t("won"), { p: pname(A.o) })); }
    }
  }
  function connected(from, to) {
    var o = P(from).o, seen = {}, st = [from]; seen[from] = 1;
    while (st.length) { var n = st.pop(); if (n === to) return true; ADJ[n].forEach(function (m) { if (!seen[m] && P(m).o === o) { seen[m] = 1; st.push(m); } }); }
    return false;
  }

  // ---------- Ton: Kanonen und Musketen, leise und synthetisch ----------
  var AC = null, master = null, nbuf = null, soundOn = true;
  function audio() {
    if (!soundOn) return null;
    if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); master = AC.createGain(); master.gain.value = 0.28; master.connect(AC.destination); } catch (e) { return null; } }
    if (AC.state === "suspended") AC.resume();
    if (!nbuf) { nbuf = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate); var d = nbuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    return AC;
  }
  function boom(delay, vol) {
    var a = audio(); if (!a) return; var t0 = a.currentTime + delay;
    var n = a.createBufferSource(); n.buffer = nbuf; var f = a.createBiquadFilter(); f.type = "lowpass"; f.frequency.setValueAtTime(420, t0); f.frequency.exponentialRampToValueAtTime(70, t0 + 0.9);
    var g = a.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.6 * vol, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.1);
    n.connect(f); f.connect(g); g.connect(master); n.start(t0, Math.random()); n.stop(t0 + 1.2);
    var o = a.createOscillator(); o.type = "sine"; o.frequency.setValueAtTime(75, t0); o.frequency.exponentialRampToValueAtTime(32, t0 + 0.5);
    var g2 = a.createGain(); g2.gain.setValueAtTime(0.0001, t0); g2.gain.exponentialRampToValueAtTime(0.5 * vol, t0 + 0.01); g2.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.6);
    o.connect(g2); g2.connect(master); o.start(t0); o.stop(t0 + 0.65);
  }
  function crack(delay, vol) {
    var a = audio(); if (!a) return; var t0 = a.currentTime + delay;
    var n = a.createBufferSource(); n.buffer = nbuf; var f = a.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 1400 + Math.random() * 1400; f.Q.value = 0.9;
    var g = a.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.32 * vol, t0 + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.09 + Math.random() * 0.05);
    n.connect(f); f.connect(g); g.connect(master); n.start(t0, Math.random() * 1.5); n.stop(t0 + 0.16);
  }
  function battleSound(dur) {
    var k = Math.random() < 0.7 ? 1 : 2;
    for (var i = 0; i < k; i++) boom(Math.random() * dur * 0.6, 0.6 + Math.random() * 0.4);
    var m = 4 + Math.floor(Math.random() * 6);
    for (var j = 0; j < m; j++) crack(Math.random() * dur, 0.5 + Math.random() * 0.5);
  }

  // ---------- Darstellung ----------
  var R = null, sel = null, target = null, dlg = null, lastRoll = null, busy = false, aiRun = 0;
  var OPT = { nd: 3, eliteFirst: true, showDice: false };
  var FX = [];
  function hx(c) { return [parseInt(c.substr(1, 2), 16), parseInt(c.substr(3, 2), 16), parseInt(c.substr(5, 2), 16)]; }
  function mixc(a, b, f) { return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]; }
  var PARCH = [234, 223, 200], WHITE = [255, 252, 244];
  function provColor(id) {
    var p = P(id), base = mixc(hx(FACT[G.players[p.o].fac].col), PARCH, 0.42);
    if (id === sel) return mixc(base, WHITE, 0.5);
    if (id === target) return mixc(base, WHITE, 0.32);
    if (isTarget(id)) return mixc(base, WHITE, 0.18);
    return base;
  }
  function isTarget(id) {
    if (!sel || !G || busy) return false;
    if (G.phase === "attack") return ADJ[sel].indexOf(id) >= 0 && P(id).o !== G.turn;
    if (G.phase === "move" && !G.moved) return id !== sel && P(id).o === G.turn && connected(sel, id);
    return false;
  }
  function paintMap() {
    if (!R) return;
    var c = R.mapC, x = c.getContext("2d");
    if (!R.seaImg) {
      var s = document.createElement("canvas"); s.width = MW; s.height = MH; var y = s.getContext("2d");
      var g = y.createLinearGradient(0, 0, 0, MH); g.addColorStop(0, "#9DBAC6"); g.addColorStop(1, "#86A8B6"); y.fillStyle = g; y.fillRect(0, 0, MW, MH);
      y.strokeStyle = "rgba(255,255,255,.14)"; y.lineWidth = 1;
      for (var gx = 0; gx <= MW; gx += 100) { y.beginPath(); y.moveTo(gx, 0); y.lineTo(gx, MH); y.stroke(); }
      for (var gy = 0; gy <= MH; gy += 100) { y.beginPath(); y.moveTo(0, gy); y.lineTo(MW, gy); y.stroke(); }
      y.strokeStyle = "rgba(255,255,255,.08)";
      for (var w = 0; w < 260; w++) { var wx = hash(w, 1) * MW, wy = hash(w, 2) * MH; y.beginPath(); y.arc(wx, wy, 6, Math.PI * 1.1, Math.PI * 1.9); y.stroke(); }
      R.seaImg = s;
    }
    x.drawImage(R.seaImg, 0, 0);
    var img = R.landImg || (R.landImg = x.createImageData(MW, MH)), d = img.data, cols = IDS.map(provColor), dark = cols.map(function (cc) { return mixc(cc, [40, 30, 20], 0.55); });
    for (var o = 0, q = 0; o < LAB.length; o++, q += 4) {
      var l = LAB[o];
      if (l < 0) { d[q + 3] = 0; continue; }
      var b = BORDER[o], cc2 = b === 0 ? cols[l] : b === 1 ? dark[l] : b === 2 ? [58, 44, 30] : [70, 56, 40];
      d[q] = cc2[0]; d[q + 1] = cc2[1]; d[q + 2] = cc2[2]; d[q + 3] = 255;
    }
    if (!R.landC) { R.landC = document.createElement("canvas"); R.landC.width = MW; R.landC.height = MH; }
    R.landC.getContext("2d").putImageData(img, 0, 0);
    x.save(); x.shadowColor = "rgba(40,30,20,.35)"; x.shadowBlur = 6; x.shadowOffsetY = 2; x.drawImage(R.landC, 0, 0); x.restore();
    // Seewege
    x.setLineDash([6, 6]); x.lineWidth = 1.6; x.strokeStyle = "rgba(250,244,228,.75)";
    SEA.forEach(function (s2) {
      var a = CEN[s2[0]], b2 = CEN[s2[1]];
      if (Math.abs(a.x - b2.x) > MW / 2) { // über den Kartenrand (Alaska – Kamtschatka)
        var l2 = a.x < b2.x ? a : b2, r2 = a.x < b2.x ? b2 : a;
        x.beginPath(); x.moveTo(l2.x, l2.y); x.lineTo(0, (l2.y + r2.y) / 2); x.stroke(); x.beginPath(); x.moveTo(r2.x, r2.y); x.lineTo(MW, (l2.y + r2.y) / 2); x.stroke();
      } else { x.beginPath(); x.moveTo(a.x, a.y); x.lineTo(b2.x, b2.y); x.stroke(); }
    });
    x.setLineDash([]);
  }
  function view() {
    var W = R.cv.clientWidth, H = R.cv.clientHeight, side = W > 900 ? R.side.offsetWidth + 24 : 0, top = R.top.offsetHeight, bot = W > 900 ? 70 : R.side.offsetHeight + 60;
    var aw = W - side - 24, ah = H - top - bot, s = Math.min(aw / MW, ah / MH) * R.zoom;
    return { s: s, ox: 12 + (aw - MW * s) / 2 + R.pan.x, oy: top + (ah - MH * s) / 2 + R.pan.y + 6, W: W, H: H };
  }
  function toMap(cx, cy) { var v = view(); return { x: (cx - v.ox) / v.s, y: (cy - v.oy) / v.s }; }
  function provAt(cx, cy) { var m = toMap(cx, cy), x = Math.floor(m.x), y = Math.floor(m.y); if (x < 0 || y < 0 || x >= MW || y >= MH) return null; var l = LAB[y * MW + x]; return l >= 0 ? IDS[l] : null; }
  function emblem(c, em, x, y, r, col) {
    c.fillStyle = col; c.strokeStyle = col;
    if (em === "star" || em === "stars") { star(c, x, y, r, 5); if (em === "stars") { star(c, x + r * 0.9, y - r * 0.7, r * 0.35, 5); star(c, x + r * 1.1, y + r * 0.1, r * 0.35, 5); } }
    else if (em === "ring") { for (var i = 0; i < 12; i++) { var a = i / 12 * Math.PI * 2; c.beginPath(); c.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.18, 0, Math.PI * 2); c.fill(); } }
    else if (em === "cross") { [[0, -1], [0.7, -0.1], [0, 1], [-0.6, 0.2], [0.25, 0.35]].forEach(function (p, k) { star(c, x + p[0] * r, y + p[1] * r, r * (k === 4 ? 0.22 : 0.32), 5); }); }
    else if (em === "bars") { c.fillRect(x - r, y - r * 0.6, r * 2, r * 0.42); c.fillRect(x - r, y + r * 0.18, r * 2, r * 0.42); }
    else if (em === "sun") { c.beginPath(); c.arc(x, y, r * 0.8, 0, Math.PI * 2); c.fill(); }
  }
  function star(c, x, y, r, n) { c.beginPath(); for (var i = 0; i < n * 2; i++) { var a = -Math.PI / 2 + i * Math.PI / n, rr = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); c.fill(); }
  function frame(ts) {
    R.raf = requestAnimationFrame(frame);
    var cv = R.cv, dpr = Math.min(2, window.devicePixelRatio || 1), W = cv.clientWidth, H = cv.clientHeight;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    var c = cv.getContext("2d"); c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.fillStyle = "#2B2620"; c.fillRect(0, 0, W, H);
    if (!G || !LAB) return;
    var v = view(), dt = R.last ? Math.min(0.05, (ts - R.last) / 1000) : 0; R.last = ts;
    c.save(); c.translate(v.ox, v.oy); c.scale(v.s, v.s);
    c.drawImage(R.mapC, 0, 0);
    c.strokeStyle = "#5A4630"; c.lineWidth = 3 / v.s; c.strokeRect(0, 0, MW, MH);
    // Angriffs- oder Verlegungspfeil
    if (sel && target) {
      var a = CEN[sel], b = CEN[target], col = G.phase === "attack" ? "rgba(178,40,30,.9)" : "rgba(30,60,110,.85)";
      c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 5; c.lineCap = "round";
      var dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, e = { x: b.x - ux * 16, y: b.y - uy * 16 };
      c.beginPath(); c.moveTo(a.x + ux * 14, a.y + uy * 14); c.quadraticCurveTo((a.x + e.x) / 2 - uy * L * 0.15, (a.y + e.y) / 2 + ux * L * 0.15, e.x, e.y); c.stroke();
      c.beginPath(); c.moveTo(b.x - ux * 6, b.y - uy * 6); c.lineTo(e.x - uy * 9 - ux * 6, e.y + ux * 9 - uy * 6); c.lineTo(e.x + uy * 9 - ux * 6, e.y - ux * 9 - uy * 6); c.closePath(); c.fill();
    }
    // Rauch
    FX = FX.filter(function (f) { f.t += dt; return f.t < f.life; });
    FX.forEach(function (f) {
      var k = f.t / f.life, r = f.r * (0.5 + k * 1.6);
      if (f.flash && k < 0.25) { c.fillStyle = "rgba(255,210,120," + (0.8 * (1 - k / 0.25)).toFixed(3) + ")"; c.beginPath(); c.arc(f.x, f.y, f.r * 0.6, 0, Math.PI * 2); c.fill(); }
      c.fillStyle = "rgba(" + f.g + "," + f.g + "," + f.g + "," + (0.55 * (1 - k)).toFixed(3) + ")";
      c.beginPath(); c.arc(f.x + f.vx * f.t, f.y + f.vy * f.t, r, 0, Math.PI * 2); c.fill();
    });
    c.restore();
    // Armee-Abzeichen in Bildschirmgröße
    var bs = clamp(v.s * 13, 8.5, 15);
    IDS.forEach(function (id) {
      var p = P(id), x = v.ox + CEN[id].x * v.s, y = v.oy + CEN[id].y * v.s, fac = FACT[G.players[p.o].fac], tot = p.n + p.e;
      c.fillStyle = fac.col; c.strokeStyle = id === sel ? "#FFF6D8" : "rgba(255,250,236,.9)"; c.lineWidth = id === sel ? 3 : 1.6;
      c.beginPath(); c.arc(x, y, bs, 0, Math.PI * 2); c.fill(); c.stroke();
      c.fillStyle = "#FFFFFF"; c.font = "700 " + Math.round(bs * 1.05) + "px " + FONT; c.textAlign = "center"; c.textBaseline = "middle";
      c.fillText(String(tot), x, y + 0.5);
      if (p.e) {
        var sx = x + bs * 0.95, sy = y - bs * 0.85;
        c.fillStyle = "#E8B931"; star(c, sx, sy, bs * 0.62, 5);
        c.fillStyle = "#3A2A10"; c.font = "700 " + Math.round(bs * 0.6) + "px " + FONT; c.fillText(String(p.e), sx, sy + 0.5);
      }
      if (p.lvl) {
        for (var k = 0; k < p.lvl; k++) {
          var px = x - (p.lvl - 1) * bs * 0.36 + k * bs * 0.72, py = y + bs * 1.35;
          if (p.up === "eco") { c.fillStyle = "#E8B931"; c.strokeStyle = "#7A5A10"; c.lineWidth = 1; c.beginPath(); c.arc(px, py, bs * 0.3, 0, Math.PI * 2); c.fill(); c.stroke(); }
          else { c.fillStyle = "#D9DEE4"; c.strokeStyle = "#3A4250"; c.lineWidth = 1; c.beginPath(); c.moveTo(px - bs * 0.28, py - bs * 0.3); c.lineTo(px + bs * 0.28, py - bs * 0.3); c.lineTo(px + bs * 0.28, py); c.lineTo(px, py + bs * 0.34); c.lineTo(px - bs * 0.28, py); c.closePath(); c.fill(); c.stroke(); }
        }
      }
    });
  }
  var FONT = '"Instrument Sans", system-ui, sans-serif';
  function smokeAt(from, to, dur) {
    var e = edgePt(from, to), d = CEN[to], x = e.x * 0.7 + d.x * 0.3, y = e.y * 0.7 + d.y * 0.3;
    var n = 7 + Math.floor(dur * 8);
    for (var i = 0; i < n; i++) {
      var dl = Math.random() * dur * 0.8;
      (function (dl2) {
        setTimeout(function () {
          FX.push({ x: x + (Math.random() - 0.5) * 34, y: y + (Math.random() - 0.5) * 24, r: 6 + Math.random() * 9, vx: (Math.random() - 0.3) * 10, vy: -4 - Math.random() * 8, t: 0, life: 1.4 + Math.random(), g: 200 + Math.floor(Math.random() * 40), flash: Math.random() < 0.4 });
        }, dl2 * 1000);
      })(dl);
    }
  }

  // ---------- Oberfläche ----------
  var CSS = ".wm-full{position:fixed;inset:0;z-index:70;overflow:hidden;background:#2B2620;color:#F4EEDF;font-family:var(--f-body,system-ui,sans-serif);user-select:none;-webkit-user-select:none}" +
    ".wm-full canvas{position:absolute;inset:0;width:100%;height:100%;display:block}" +
    ".wm-full button{font-family:inherit;border-radius:0;cursor:pointer}.wm-full [hidden]{display:none!important}" +
    ".wm-panel{background:rgba(28,24,19,.9);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)}" +
    ".wm-top{position:absolute;left:0;right:0;top:0;display:flex;align-items:center;flex-wrap:wrap;gap:6px 16px;padding:8px max(14px,env(safe-area-inset-right)) 8px max(14px,env(safe-area-inset-left))}" +
    ".wm-top a{color:#F4EEDF;text-decoration:none;font-weight:600;font-size:.9rem}" +
    ".wm-title{font:600 1.2rem var(--f-display,inherit);margin-right:auto;white-space:nowrap}.wm-title span{font:600 .7rem var(--f-body,inherit);border:1px solid rgba(244,238,223,.35);padding:0 6px;margin-left:8px;vertical-align:middle}" +
    ".wm-turn{display:flex;align-items:center;gap:10px;font-weight:600}.wm-turn i{width:14px;height:14px;display:inline-block}" +
    ".wm-tb{display:flex;gap:4px}.wm-tb button{font:600 .82rem inherit;padding:7px 10px;border:1px solid rgba(244,238,223,.3);background:transparent;color:#F4EEDF}.wm-tb button[aria-pressed=true]{background:#F4EEDF;color:#1C1813}" +
    ".wm-side{position:absolute;right:max(12px,env(safe-area-inset-right));top:calc(var(--top,54px) + 10px);bottom:12px;width:330px;display:flex;flex-direction:column;gap:10px;overflow:auto;padding:12px 14px;scrollbar-width:thin}" +
    ".wm-side h3{font:600 .72rem/1 inherit;letter-spacing:.12em;text-transform:uppercase;color:rgba(244,238,223,.6);margin:4px 0 2px}" +
    ".wm-pl{display:grid;grid-template-columns:auto 1fr auto auto auto;gap:4px 10px;align-items:center;font-size:.86rem;font-variant-numeric:tabular-nums}" +
    ".wm-pl .on{font-weight:700}.wm-pl .dead{opacity:.4;text-decoration:line-through}.wm-pl i{width:12px;height:12px;display:block}" +
    ".wm-box{display:flex;flex-direction:column;gap:8px;border-top:1px solid rgba(244,238,223,.15);padding-top:10px}" +
    ".wm-box p{margin:0;font-size:.86rem;line-height:1.45;color:rgba(244,238,223,.8)}.wm-box b{font-weight:600;color:#F4EEDF}" +
    ".wm-row{display:flex;flex-wrap:wrap;gap:6px;align-items:center}" +
    ".wm-btn{font:600 .84rem inherit;padding:7px 11px;border:1px solid rgba(244,238,223,.45);background:transparent;color:#F4EEDF}" +
    ".wm-btn:disabled{opacity:.35;cursor:default}.wm-btn.pri{background:#E8B931;color:#1C1813;border-color:#E8B931}.wm-btn[aria-pressed=true]{background:#F4EEDF;color:#1C1813}" +
    ".wm-big{font:600 1rem inherit;padding:11px 18px;border:0;background:#E8B931;color:#1C1813}" +
    ".wm-next{position:absolute;left:50%;bottom:16px;transform:translateX(calc(-50% - 170px))}" +
    "@media (max-width:900px){.wm-side{left:12px;right:12px;width:auto;top:auto;bottom:12px;max-height:42%}.wm-next{transform:translateX(-50%);bottom:calc(42% + 24px)}}" +
    ".wm-cards{display:flex;flex-wrap:wrap;gap:5px}.wm-card{width:58px;padding:5px 4px;border:1px solid rgba(244,238,223,.35);font-size:.68rem;line-height:1.2;text-align:center;background:rgba(244,238,223,.06)}" +
    ".wm-card b{display:block;font-size:1.1rem;line-height:1.1}" +
    ".wm-log{font-size:.8rem;color:rgba(244,238,223,.7);display:flex;flex-direction:column;gap:3px;max-height:150px;overflow:auto}" +
    ".wm-dice{display:flex;gap:10px;flex-wrap:wrap;align-items:center;font-size:.8rem}.wm-dice span{display:inline-flex;flex-direction:column;align-items:center;min-width:30px;padding:3px 4px;border:1px solid rgba(244,238,223,.4)}" +
    ".wm-dice span b{font-size:1.05rem}.wm-dice span small{font-size:.6rem;opacity:.7}.wm-dice .x{opacity:.4;text-decoration:line-through}.wm-dice .el{border-color:#E8B931;color:#F4D46B}" +
    ".wm-cnt{display:grid;grid-template-columns:1fr auto auto auto;gap:6px;align-items:center;font-size:.86rem}.wm-cnt b{min-width:26px;text-align:center}" +
    ".wm-tip{position:absolute;pointer-events:none;padding:8px 10px;font-size:.8rem;line-height:1.4;max-width:240px;z-index:3}.wm-tip b{font-size:.9rem}" +
    ".wm-modal{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(560px,calc(100% - 32px));max-height:calc(100% - 40px);overflow:auto;padding:20px 22px;z-index:5}" +
    ".wm-modal h2{font:600 1.5rem var(--f-display,inherit);margin:0 0 10px}.wm-modal p{margin:8px 0;font-size:.9rem;line-height:1.5;color:rgba(244,238,223,.85)}" +
    ".wm-seat{display:grid;grid-template-columns:28px 1fr auto;gap:8px;align-items:center;margin:6px 0}.wm-seat select{font:inherit;padding:6px;background:#3A332A;color:#F4EEDF;border:1px solid rgba(244,238,223,.3)}" +
    ".wm-seat i{width:20px;height:20px;display:block}";

  function html() {
    return '<div class="wm-full" id="wm-root" tabindex="0"><canvas id="wm-cv" aria-label="' + t("title") + '"></canvas>' +
      '<div class="wm-top wm-panel" id="wm-top"><a href="#">' + t("back") + '</a><div class="wm-title">' + t("title") + "<span>v" + VERSION + '</span></div>' +
      '<div class="wm-turn" id="wm-turn"></div>' +
      '<div class="wm-tb"><button type="button" data-wm="dice" aria-pressed="false">' + t("showDice") + '</button><button type="button" data-wm="sound" aria-pressed="true">' + t("sound") + '</button>' +
      '<button type="button" data-wm="help">?</button><button type="button" data-wm="new">' + t("newGame") + "</button></div></div>" +
      '<div class="wm-side wm-panel" id="wm-side"></div>' +
      '<button type="button" class="wm-big wm-next" id="wm-next" data-wm="next"></button>' +
      '<div class="wm-tip wm-panel" id="wm-tip" hidden></div>' +
      '<div class="wm-modal wm-panel" id="wm-modal" hidden></div></div>';
  }
  function chip(pi) { return '<i style="background:' + FACT[G.players[pi].fac].col + '"></i>'; }
  function refresh() { if (!R || !G) return; paintMap(); renderUI(); }
  function renderUI() {
    var p = cur(), me = p.human && G.phase !== "over";
    R.root.querySelector("#wm-turn").innerHTML = G.phase === "over" ? chip(G.winner) + fmt(t("won"), { p: pname(G.winner) }) :
      chip(G.turn) + (G.round === 0 ? t("setupRound") : fmt(t("round"), { n: G.round })) + " · " + pname(G.turn) + " · " + TX.ph[G.phase][lang] + " · " + p.tokens + " " + t("tokens");
    R.root.style.setProperty("--top", R.top.offsetHeight + "px");
    var h = '<h3>' + t("players") + '</h3><div class="wm-pl">';
    G.players.forEach(function (pl, i) {
      var mine = owned(i), arm = mine.reduce(function (s, id) { return s + units(id); }, 0);
      h += chip(i) + '<span class="' + (i === G.turn ? "on " : "") + (pl.alive ? "" : "dead") + '">' + pname(i) + (pl.human ? "" : " · " + t("ai")) + "</span><span title=\"" + t("provs") + "\">" + mine.length + "</span><span title=\"" + t("armies") + "\">" + arm + "⚑</span><span title=\"" + t("cards") + "\">" + pl.cards.length + "▭</span>";
    });
    h += "</div>";
    h += '<div class="wm-box">' + actionHTML(me) + "</div>";
    if (me && (G.phase === "buy" || G.phase === "setup")) {
      var set = findSet(p.cards, G.turn);
      h += '<div class="wm-box"><h3>' + t("cards") + '</h3><div class="wm-cards">' + p.cards.map(function (c) { return '<div class="wm-card"><b>' + ({ i: "♟", c: "♞", a: "✹", w: "★" })[c.s] + "</b>" + (c.p ? PROV[c.p][0] : TX.sym.w[lang]) + "</div>"; }).join("") + "</div>" +
        (p.cards.length >= 5 ? "<p><b>" + t("mustTrade") + "</b></p>" : "") +
        '<div class="wm-row"><button type="button" class="wm-btn' + (set ? " pri" : "") + '" data-wm="trade"' + (set && G.phase === "buy" ? "" : " disabled") + ">" + (set ? fmt(t("trade"), { n: cardValue() }) : t("noSet")) + "</button></div></div>";
    }
    if (lastRoll && OPT.showDice) h += '<div class="wm-box"><h3>' + t("dice") + "</h3>" + diceHTML(lastRoll) + "</div>";
    h += '<div class="wm-box"><div class="wm-log">' + G.log.slice(0, 12).map(function (l) { return "<span>" + l + "</span>"; }).join("") + "</div></div>";
    R.side.innerHTML = h;
    var nb = R.root.querySelector("#wm-next");
    nb.hidden = !me || !!dlg || busy;
    nb.textContent = TX.next[G.phase] ? TX.next[G.phase][lang] : "";
    nb.disabled = G.phase === "buy" && p.cards.length >= 5;
  }
  function diceHTML(r) {
    function d(x, side) { return '<span class="' + (x.el ? "el " : "") + (x.lost ? "x" : "") + '"><b>' + x.v + "</b><small>W" + x.sides + "</small></span>"; }
    return '<div class="wm-dice">' + r.att.map(function (x) { return d(x); }).join("") + "<em>" + t("vs") + "</em>" + r.def.map(function (x) { return d(x); }).join("") + "</div>";
  }
  function actionHTML(me) {
    if (G.phase === "over") return "<p><b>" + fmt(t("won"), { p: pname(G.winner) }) + '</b></p><div class="wm-row"><button type="button" class="wm-btn pri" data-wm="new">' + t("newGame") + "</button></div>";
    if (!me) return "<p>" + fmt(t("thinking"), { p: pname(G.turn) }) + "</p>";
    var p = cur();
    if (dlg) return dlgHTML();
    if (G.phase === "buy" || G.phase === "setup") {
      if (!sel) return "<p>" + t("pickOwn") + "</p><p>" + t("income") + ": <b>" + income(G.turn) + "</b> " + t("tokens") + "</p>";
      var pr = P(sel), name = PROV[sel][0];
      var upE = pr.lvl < MAXLVL && pr.up !== "def" && p.tokens >= COST.up, upD = pr.lvl < MAXLVL && pr.up !== "eco" && p.tokens >= COST.up;
      return "<p><b>" + name + "</b> · " + CONT[PROV[sel][3]][0] + "</p>" + provInfo(sel) +
        '<div class="wm-row"><button type="button" class="wm-btn pri" data-buy="n1"' + (p.tokens >= 5 ? "" : " disabled") + ">+1 " + t("buyN") + " · 5</button>" +
        '<button type="button" class="wm-btn" data-buy="n5"' + (p.tokens >= 25 ? "" : " disabled") + ">+5 · 25</button></div>" +
        '<div class="wm-row"><button type="button" class="wm-btn pri" data-buy="e1"' + (p.tokens >= 10 ? "" : " disabled") + ">+1 " + t("buyE") + " ★ · 10</button>" +
        '<button type="button" class="wm-btn" data-buy="e5"' + (p.tokens >= 50 ? "" : " disabled") + ">+5 · 50</button></div>" +
        '<div class="wm-row"><button type="button" class="wm-btn" data-up="eco"' + (upE ? "" : " disabled") + ">" + t("upEco") + " · 20</button>" +
        '<button type="button" class="wm-btn" data-up="def"' + (upD ? "" : " disabled") + ">" + t("upDef") + " · 20</button></div>";
    }
    if (G.phase === "attack") {
      if (!sel) return "<p>" + t("pickAtt") + "</p>";
      if (!target) return "<p><b>" + PROV[sel][0] + "</b> · " + units(sel) + " " + t("armies") + "</p><p>" + t("pickTarget") + "</p>";
      var A = P(sel), D = P(target), mx = Math.min(3, units(sel) - 1), nd = Math.min(OPT.nd, mx);
      var ds = "";
      for (var k = 1; k <= 3; k++) ds += '<button type="button" class="wm-btn" data-nd="' + k + '" aria-pressed="' + (k === nd) + '"' + (k <= mx ? "" : " disabled") + ">" + k + "</button>";
      return "<p><b>" + PROV[sel][0] + "</b> (" + A.n + (A.e ? " + " + A.e + "★" : "") + ") " + t("vs") + " <b>" + PROV[target][0] + "</b> (" + D.n + (D.e ? " + " + D.e + "★" : "") + ", " + pname(D.o) + ")</p>" +
        "<p>" + fmt(t("defDice"), { d: "W" + defSides(target, false) + (D.e ? " / ★W" + defSides(target, true) : "") }) + "</p>" +
        '<div class="wm-row">' + t("dice") + ": " + ds + '<button type="button" class="wm-btn" data-wm="elite" aria-pressed="' + OPT.eliteFirst + '"' + (A.e ? "" : " disabled") + ">★ " + t("eliteFirst") + "</button></div>" +
        '<div class="wm-row"><button type="button" class="wm-btn pri" data-wm="attack"' + (mx >= 1 && !busy ? "" : " disabled") + ">" + t("attack") + '</button><button type="button" class="wm-btn" data-wm="blitz"' + (mx >= 1 && !busy ? "" : " disabled") + ">" + t("blitz") + '</button><button type="button" class="wm-btn" data-wm="cancel">' + t("cancel") + "</button></div>";
    }
    if (G.phase === "move") {
      if (G.moved) return "<p>" + t("moved") + "</p>";
      if (!sel) return "<p>" + t("pickMove") + "</p>";
      return "<p><b>" + PROV[sel][0] + "</b></p><p>" + t("pickDest") + "</p>";
    }
    return "";
  }
  function provInfo(id) {
    var p = P(id), s = "<p>" + p.n + " " + t("buyN") + (p.e ? " · " + p.e + " ★ " + t("buyE") : "") + "</p>";
    if (p.up === "eco") s += "<p>" + t("upEco") + " · " + fmt(t("lvl"), { n: p.lvl }) + " · " + fmt(t("ecoInfo"), { n: 1 + p.lvl }) + "</p>";
    else if (p.up === "def") s += "<p>" + t("upDef") + " · " + fmt(t("lvl"), { n: p.lvl }) + " · " + fmt(t("defInfo"), { a: defSides(id, false), b: defSides(id, true) }) + "</p>";
    return s;
  }
  function dlgHTML() {
    var A = P(dlg.from), totalMax = A.n + A.e - 1;
    return "<p><b>" + (dlg.kind === "in" ? t("moveIn") : t("moveOk")) + ":</b> " + PROV[dlg.from][0] + " → " + PROV[dlg.to][0] + "</p>" +
      '<div class="wm-cnt"><span>' + t("buyN") + '</span><button type="button" class="wm-btn" data-cnt="n-">−</button><b>' + dlg.n + '</b><button type="button" class="wm-btn" data-cnt="n+">+</button>' +
      '<span>★ ' + t("buyE") + '</span><button type="button" class="wm-btn" data-cnt="e-">−</button><b>' + dlg.e + '</b><button type="button" class="wm-btn" data-cnt="e+">+</button></div>' +
      (dlg.kind === "in" ? "<p>" + (lang === "de" ? "Mindestens " : "At least ") + dlg.min + " · " + (lang === "de" ? "höchstens " : "at most ") + totalMax + "</p>" : "") +
      '<div class="wm-row"><button type="button" class="wm-btn" data-cnt="all">' + t("all") + "</button>" + (dlg.kind === "in" ? '<button type="button" class="wm-btn" data-cnt="min">' + t("min") + "</button>" : "") +
      '<button type="button" class="wm-btn pri" data-wm="dlgok"' + (dlg.n + dlg.e >= (dlg.min || 1) ? "" : " disabled") + ">OK</button>" + (dlg.kind === "mv" ? '<button type="button" class="wm-btn" data-wm="cancel">' + t("cancel") + "</button>" : "") + "</div>";
  }
  function cnt(op) {
    var A = P(dlg.from), max = A.n + A.e - 1;
    if (op === "n+" && dlg.n < A.n && dlg.n + dlg.e < max) dlg.n++;
    else if (op === "n-" && dlg.n > 0) dlg.n--;
    else if (op === "e+" && dlg.e < A.e && dlg.n + dlg.e < max) dlg.e++;
    else if (op === "e-" && dlg.e > 0) dlg.e--;
    else if (op === "all") { dlg.e = Math.min(A.e, max); dlg.n = Math.min(A.n, max - dlg.e); }
    else if (op === "min") { dlg.e = Math.min(A.e, dlg.minE || 0); dlg.n = Math.max(0, dlg.min - dlg.e); if (dlg.n > A.n) { dlg.n = A.n; dlg.e = dlg.min - dlg.n; } }
    renderUI();
  }
  function moveDefault(from, need, prefE) {
    var A = P(from), max = A.n + A.e - 1, e = prefE ? Math.min(A.e, need) : Math.max(0, need - Math.min(A.n, max)), n = Math.min(A.n, need - e);
    if (n + e < need) e = Math.min(A.e, need - n);
    if (n + e > max) { n = Math.max(0, max - e); }
    return { n: n, e: e };
  }

  // ---------- Eingabe ----------
  function onClickMap(e) {
    if (!G || busy || dlg || G.phase === "over" || !cur().human) return;
    var r = R.cv.getBoundingClientRect(), id = provAt(e.clientX - r.left, e.clientY - r.top);
    if (!id) { sel = null; target = null; refresh(); return; }
    var mine = P(id).o === G.turn;
    if (G.phase === "buy" || G.phase === "setup") { sel = mine ? id : null; }
    else if (G.phase === "attack") {
      if (mine) { sel = units(id) >= 2 ? id : null; target = null; }
      else if (sel && ADJ[sel].indexOf(id) >= 0) target = id;
      else { sel = null; target = null; }
    } else if (G.phase === "move" && !G.moved) {
      if (sel && mine && id !== sel && connected(sel, id)) { target = id; var d0 = moveDefault(sel, units(sel) - 1, true); dlg = { kind: "mv", from: sel, to: id, n: d0.n, e: d0.e, min: 1 }; }
      else if (mine && units(id) >= 2) { sel = id; target = null; }
      else { sel = null; target = null; }
    }
    refresh();
  }
  function onMove(e) {
    if (!G || R.drag) { if (R.drag) { R.pan.x = R.drag.px + e.clientX - R.drag.x; R.pan.y = R.drag.py + e.clientY - R.drag.y; R.drag.moved = R.drag.moved || Math.abs(e.clientX - R.drag.x) + Math.abs(e.clientY - R.drag.y) > 5; } return; }
    var r = R.cv.getBoundingClientRect(), id = provAt(e.clientX - r.left, e.clientY - r.top), tip = R.root.querySelector("#wm-tip");
    if (!id || e.target !== R.cv) { tip.hidden = true; return; }
    var p = P(id), c = PROV[id][3];
    tip.innerHTML = "<b>" + PROV[id][0] + "</b><br>" + CONT[c][0] + " · " + pname(p.o) + "<br>" + p.n + " " + t("buyN") + (p.e ? " · " + p.e + " ★" : "") + "<br>" + t("defDice").replace("{d}", "W" + defSides(id, false) + (p.e ? " / ★W" + defSides(id, true) : "")) +
      (p.up ? "<br>" + (p.up === "eco" ? t("upEco") : t("upDef")) + " " + fmt(t("lvl"), { n: p.lvl }) : "");
    tip.hidden = false;
    var x = e.clientX - r.left + 16, y = e.clientY - r.top + 16;
    if (x + 240 > r.width) x -= 260;
    tip.style.left = x + "px"; tip.style.top = y + "px";
  }
  function onDown(e) {
    if (e.target !== R.cv) return;
    if (e.button === 2 || e.button === 1) { R.drag = { x: e.clientX, y: e.clientY, px: R.pan.x, py: R.pan.y }; e.preventDefault(); return; }
    R.downAt = { x: e.clientX, y: e.clientY };
    R.drag = { x: e.clientX, y: e.clientY, px: R.pan.x, py: R.pan.y, left: true };
  }
  function onUp(e) {
    var d = R.drag; R.drag = null;
    if (d && d.left && !d.moved && e.target === R.cv) onClickMap(e);
  }
  function onWheel(e) {
    if (e.target !== R.cv) return;
    e.preventDefault();
    var r = R.cv.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top, before = toMap(mx, my);
    R.zoom = clamp(R.zoom * Math.pow(1.0015, -e.deltaY), 1, 4);
    var v = view(); R.pan.x += mx - (v.ox + before.x * v.s); R.pan.y += my - (v.oy + before.y * v.s);
  }
  function onClick(e) {
    var b;
    if ((b = e.target.closest("[data-buy]"))) {
      var k = b.getAttribute("data-buy"), kind = k.charAt(0), n = +k.substr(1);
      if (sel && buy(sel, kind, n)) { save(); refresh(); }
      return;
    }
    if ((b = e.target.closest("[data-up]"))) { if (sel && upgrade(sel, b.getAttribute("data-up"))) { save(); refresh(); } return; }
    if ((b = e.target.closest("[data-nd]"))) { OPT.nd = +b.getAttribute("data-nd"); renderUI(); return; }
    if ((b = e.target.closest("[data-cnt]"))) { cnt(b.getAttribute("data-cnt")); return; }
    if ((b = e.target.closest("[data-fac]"))) return;
    if (!(b = e.target.closest("[data-wm]"))) return;
    var a = b.getAttribute("data-wm");
    if (a === "next") { if (busy || dlg) return; nextPhase(); }
    else if (a === "trade") { if (tradeCards(G.turn)) { save(); refresh(); } }
    else if (a === "elite") { OPT.eliteFirst = !OPT.eliteFirst; renderUI(); }
    else if (a === "attack" || a === "blitz") { if (sel && target && !busy) humanAttack(a === "blitz"); }
    else if (a === "cancel") { dlg = null; target = null; if (G.phase === "move") sel = null; refresh(); }
    else if (a === "dlgok") { finishDlg(); }
    else if (a === "dice") { OPT.showDice = !OPT.showDice; b.setAttribute("aria-pressed", String(OPT.showDice)); renderUI(); }
    else if (a === "sound") { soundOn = !soundOn; b.setAttribute("aria-pressed", String(soundOn)); if (soundOn) audio(); }
    else if (a === "help") { showHelp(); }
    else if (a === "new") { showSetup(); }
    else if (a === "close") { R.modal.hidden = true; }
    else if (a === "go") { startFromSetup(); }
    else if (a === "goon") { R.modal.hidden = true; refresh(); if (!cur().human && G.phase !== "over") runAI(); }
  }
  function finishDlg() {
    if (!dlg) return;
    var d = dlg; dlg = null;
    if (d.kind === "in") conquer(d.from, d.to, d.n, d.e);
    else { var A = P(d.from), B = P(d.to); A.n -= d.n; A.e -= d.e; B.n += d.n; B.e += d.e; G.moved = true; }
    target = null; sel = d.kind === "in" ? (units(d.to) >= 2 ? d.to : null) : null;
    save(); refresh();
  }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  async function fight(from, to, nd, eliteFirst, blitz, stopAt, fast) {
    var run = aiRun, res = null;
    busy = true; renderUI();
    do {
      var dur = fast ? 0.35 : blitz ? 0.55 : 0.9;
      res = battle(from, to, nd, eliteFirst);
      lastRoll = res; battleSound(dur); smokeAt(from, to, dur);
      paintMap(); renderUI();
      await sleep(dur * 1000);
      if (!R || run !== aiRun) { busy = false; return res; }
      nd = Math.min(nd, units(from) - 1);
    } while (blitz && !res.won && units(from) >= 2 && nd >= 1 && (!stopAt || units(from) > stopAt));
    if (!res.won && res.lossD.n + res.lossD.e > 0 && !blitz) {}
    if (!res.won) logMsg(fmt(t("lHold"), { t: PROV[to][0], p: pname(P(from).o) }));
    busy = false;
    return res;
  }
  async function humanAttack(blitz) {
    var from = sel, to = target, nd = Math.min(OPT.nd, units(from) - 1);
    var res = await fight(from, to, nd, OPT.eliteFirst, blitz, 0, G.speed === "fast");
    if (!R) return;
    if (res.won) {
      var need = Math.min(res.nd, units(from) - 1), d0 = moveDefault(from, need, OPT.eliteFirst);
      dlg = { kind: "in", from: from, to: to, n: d0.n, e: d0.e, min: need, minE: d0.e };
      boom(0, 0.5);
    } else if (units(from) < 2) { sel = null; target = null; }
    save(); refresh();
  }

  function showHelp() {
    R.modal.innerHTML = "<h2>" + t("help") + "</h2>" + TX.rules[lang].map(function (r) { return "<p>" + r + "</p>"; }).join("") + '<div class="wm-row"><button type="button" class="wm-btn pri" data-wm="close">' + t("close") + "</button></div>";
    R.modal.hidden = false;
  }
  var SETUP = { n: 4, seats: [{ fac: "eu", human: true }, { fac: "us", human: false }, { fac: "cn", human: false }, { fac: "ru", human: false }, { fac: "jp", human: false }, { fac: "au", human: false }], speed: "normal" };
  function showSetup() {
    var s = SETUP, h = "<h2>" + t("setupH") + '</h2><div class="wm-row">' + t("players") + ": ";
    for (var k = 2; k <= 6; k++) h += '<button type="button" class="wm-btn" data-sn="' + k + '" aria-pressed="' + (s.n === k) + '">' + k + "</button>";
    h += "</div>";
    for (var i = 0; i < s.n; i++) {
      var st = s.seats[i];
      h += '<div class="wm-seat"><i style="background:' + FACT[st.fac].col + '"></i><select data-seat="' + i + '">' + FORDER.map(function (f) {
        var taken = s.seats.slice(0, s.n).some(function (o, j) { return j !== i && o.fac === f; });
        return '<option value="' + f + '"' + (f === st.fac ? " selected" : "") + (taken ? " disabled" : "") + ">" + FACT[f].name[lang] + "</option>";
      }).join("") + '</select><div class="wm-row"><button type="button" class="wm-btn" data-sh="' + i + '" aria-pressed="' + st.human + '">' + t("human") + '</button><button type="button" class="wm-btn" data-sa="' + i + '" aria-pressed="' + !st.human + '">' + t("ai") + "</button></div></div>";
    }
    h += '<div class="wm-row">' + t("aiSpeed") + ': <button type="button" class="wm-btn" data-sp="normal" aria-pressed="' + (s.speed === "normal") + '">' + t("normal") + '</button><button type="button" class="wm-btn" data-sp="fast" aria-pressed="' + (s.speed === "fast") + '">' + t("fast") + "</button></div>" +
      "<p>" + (lang === "de" ? "Die Provinzen werden zufällig und gleichmäßig verteilt. Wer weniger bekommt, erhält Ausgleichs-Token." : "Provinces are dealt randomly and evenly. Whoever gets fewer receives compensation tokens.") + "</p>" +
      '<div class="wm-row"><button type="button" class="wm-big" data-wm="go">' + t("start") + "</button>" + (G ? '<button type="button" class="wm-btn" data-wm="close">' + t("cancel") + "</button>" : "") + "</div>";
    R.modal.innerHTML = h; R.modal.hidden = false;
  }
  function onSetupClick(e) {
    var b = e.target.closest("[data-sn],[data-sh],[data-sa],[data-sp]"); if (!b) return;
    var s = SETUP;
    if (b.hasAttribute("data-sn")) s.n = +b.getAttribute("data-sn");
    if (b.hasAttribute("data-sh")) s.seats[+b.getAttribute("data-sh")].human = true;
    if (b.hasAttribute("data-sa")) s.seats[+b.getAttribute("data-sa")].human = false;
    if (b.hasAttribute("data-sp")) s.speed = b.getAttribute("data-sp");
    // doppelte Fraktionen auflösen
    var used = {};
    s.seats.forEach(function (st, i) { if (i >= s.n) return; if (used[st.fac]) st.fac = FORDER.filter(function (f) { return !used[f]; })[0]; used[st.fac] = 1; });
    showSetup();
  }
  function onChange(e) {
    var sl = e.target.closest("[data-seat]"); if (!sl) return;
    SETUP.seats[+sl.getAttribute("data-seat")].fac = sl.value; showSetup();
  }
  function startFromSetup() {
    aiRun++; busy = false; dlg = null; sel = null; target = null; lastRoll = null; FX = [];
    newGame(SETUP.seats.slice(0, SETUP.n).map(function (s) { return { fac: s.fac, human: s.human }; }), SETUP.speed);
    R.modal.hidden = true;
    startTurn();
  }

  // ---------- KI ----------
  // Spielt nach denselben Regeln: sieht nur, was jeder sieht, hat dieselbe Wirtschaft und würfelt mit denselben Würfeln.
  function str(id) { var p = P(id); return (p.n + 1.6 * p.e) * (1 + (p.up === "def" ? 0.18 * p.lvl : 0)); }
  function enemyN(id) { var o = P(id).o; return ADJ[id].filter(function (m) { return P(m).o !== o; }); }
  function threat(id) { return enemyN(id).reduce(function (s, m) { return s + P(m).n + 1.6 * P(m).e; }, 0); }
  function aiTargetCont(pi) {
    var best = null, bs = -1e9;
    Object.keys(CONT).forEach(function (c) {
      var ids = IDS.filter(function (id) { return PROV[id][3] === c; }), mine = ids.filter(function (id) { return P(id).o === pi; }).length;
      if (mine === ids.length) return;
      var enemy = ids.filter(function (id) { return P(id).o !== pi; }).reduce(function (s, id) { return s + str(id); }, 0);
      var sc = mine / ids.length * 3 + CONT[c][1] / 12 - enemy / (ids.length * 3) - (ids.length - mine) * 0.05;
      if (mine === 0) sc -= 2;
      if (sc > bs) { bs = sc; best = c; }
    });
    return best;
  }
  function aiStage(pi, tc) {
    var best = null, bs = -1e9;
    owned(pi).forEach(function (id) {
      var en = enemyN(id); if (!en.length) return;
      en.forEach(function (m) {
        var sc = str(id) - str(m) * 1.1 + (PROV[m][3] === tc ? 6 : 0) + (PROV[id][3] === tc ? 2 : 0) + (owned(P(m).o).length <= 3 ? 5 : 0);
        if (sc > bs) { bs = sc; best = id; }
      });
    });
    return best;
  }
  function aiSpend(pi) {
    var p = G.players[pi];
    while (findSet(p.cards, pi) && (p.cards.length >= 3)) tradeCards(pi);
    var mine = owned(pi), border = mine.filter(function (id) { return enemyN(id).length; }), interior = mine.filter(function (id) { return !enemyN(id).length; });
    // Ausbau: Wirtschaft im sicheren Hinterland, Verteidigung an bedrohten Kontinentgrenzen
    if (G.round >= 1 && p.tokens >= 45) {
      var eco = interior.filter(function (id) { var q = P(id); return q.up !== "def" && q.lvl < MAXLVL; }).sort(function (a, b) { return P(b).lvl - P(a).lvl; })[0];
      if (eco && G.round < 25) upgrade(eco, "eco");
    }
    var myConts = Object.keys(CONT).filter(function (c) { return contOwner(c) === pi; });
    if (myConts.length && p.tokens >= 40 && Math.random() < 0.5) {
      var gate = border.filter(function (id) { var q = P(id); return myConts.indexOf(PROV[id][3]) >= 0 && q.up !== "eco" && q.lvl < MAXLVL && threat(id) > str(id); })[0];
      if (gate) upgrade(gate, "def");
    }
    // Armeen: erst bedrohte Kontinentgrenzen sichern, dann auf einen Aufmarschpunkt konzentrieren
    var tc = aiTargetCont(pi), stage = aiStage(pi, tc) || border[0] || mine[0];
    var needs = border.filter(function (id) { return myConts.indexOf(PROV[id][3]) >= 0 && threat(id) > str(id) * 1.1; });
    var guard = Math.floor(p.tokens * 0.4);
    needs.forEach(function (id) {
      while (guard >= 5 && threat(id) > str(id) * 1.1) { var el = guard >= 10 && Math.random() < 0.5; if (!buy(id, el ? "e" : "n", 1)) break; guard -= el ? 10 : 5; }
    });
    var spots = [stage];
    if (G.phase === "setup") spots = spots.concat(shuffle(border.slice()).slice(0, 3));
    var k = 0;
    while (p.tokens >= 5) {
      var id = spots[k % spots.length] || stage;
      if (G.phase === "setup" && k % 3 === 0) id = stage;
      var elite = p.tokens >= 10 && Math.random() < 0.33;
      if (!buy(id, elite ? "e" : "n", 1)) break;
      k++;
    }
  }
  function aiPickAttack(pi) {
    var best = null, bs = 0, tc = aiTargetCont(pi);
    owned(pi).forEach(function (id) {
      var A = P(id); if (A.n + A.e < 2) return;
      enemyN(id).forEach(function (m) {
        var D = P(m), r = (A.n + 1.5 * A.e - 1) / (str(m) + 0.5), sc = r;
        if (PROV[m][3] === tc) sc += 0.5;
        if (owned(D.o).length <= 3) sc += 0.6;
        if (contOwner(PROV[m][3]) === D.o) sc += 0.4;
        var need = G.conq ? 1.35 : (A.n + A.e >= 3 ? 0.95 : 1.6);
        if (r >= need && sc > bs) { bs = sc; best = { from: id, to: m, r: r }; }
      });
    });
    return best;
  }
  function aiFortify(pi) {
    var mine = owned(pi), src = mine.filter(function (id) { return !enemyN(id).length && units(id) >= 3; }).sort(function (a, b) { return units(b) - units(a); })[0];
    if (!src) return null;
    var dst = mine.filter(function (id) { return enemyN(id).length && connected(src, id); }).sort(function (a, b) { return (threat(b) - str(b)) - (threat(a) - str(a)); })[0];
    if (!dst) return null;
    return { from: src, to: dst };
  }
  async function runAI() {
    var run = ++aiRun, pi = G.turn, fast = G.speed === "fast", w = function (ms) { return sleep(fast ? ms * 0.3 : ms); };
    function alive() { return R && run === aiRun && G && G.turn === pi && G.phase !== "over"; }
    await w(600); if (!alive()) return;
    aiSpend(pi); paintMap(); renderUI(); save();
    await w(700); if (!alive()) return;
    if (G.phase === "setup") { endTurn(); return; }
    G.phase = "attack"; renderUI();
    for (var n = 0; n < 30; n++) {
      var at = aiPickAttack(pi); if (!at) break;
      sel = at.from; target = at.to; paintMap(); renderUI();
      await w(350); if (!alive()) return;
      var stop = Math.max(1, Math.ceil(str(at.to) * 0.5));
      var res = await fight(at.from, at.to, Math.min(3, units(at.from) - 1), true, true, stop, fast);
      if (!alive()) return;
      if (res.won) {
        var avail = units(at.from) - 1, interior = !enemyN(at.from).some(function (m) { return m !== at.to; });
        var mv = Math.max(Math.min(res.nd, avail), interior ? avail : Math.ceil(avail * 0.6));
        var d0 = moveDefault(at.from, mv, true);
        conquer(at.from, at.to, d0.n, d0.e);
        if (G.phase === "over") { sel = null; target = null; save(); refresh(); return; }
      }
      sel = null; target = null; paintMap(); renderUI(); save();
      await w(250); if (!alive()) return;
    }
    G.phase = "move"; renderUI();
    var f = aiFortify(pi);
    if (f) {
      sel = f.from; target = f.to; paintMap(); renderUI();
      await w(500); if (!alive()) return;
      var d1 = moveDefault(f.from, units(f.from) - 1, true), A = P(f.from), B = P(f.to);
      A.n -= d1.n; A.e -= d1.e; B.n += d1.n; B.e += d1.e; G.moved = true;
    }
    sel = null; target = null;
    await w(400); if (!alive()) return;
    endTurn();
  }

  // ---------- Einbinden ----------
  function injectCSS() { var o = document.getElementById("wm-css"); if (o) o.remove(); var s = document.createElement("style"); s.id = "wm-css"; s.textContent = CSS; document.head.appendChild(s); }
  function mount(el, l) {
    unmount();
    lang = l === "en" ? "en" : "de";
    injectCSS();
    el.innerHTML = html();
    var root = el.querySelector("#wm-root");
    R = { el: el, root: root, cv: root.querySelector("#wm-cv"), top: root.querySelector("#wm-top"), side: root.querySelector("#wm-side"), modal: root.querySelector("#wm-modal"),
      mapC: document.createElement("canvas"), zoom: 1, pan: { x: 0, y: 0 }, ov: document.body.style.overflow };
    R.mapC.width = MW; R.mapC.height = MH;
    document.body.style.overflow = "hidden";
    buildMap();
    root.addEventListener("click", onClick); root.addEventListener("click", onSetupClick); root.addEventListener("change", onChange);
    root.addEventListener("pointermove", onMove); root.addEventListener("pointerdown", onDown); window.addEventListener("pointerup", onUp);
    root.addEventListener("wheel", onWheel, { passive: false }); root.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    root.addEventListener("pointerleave", function () { var tp = root.querySelector("#wm-tip"); if (tp) tp.hidden = true; });
    if (!G) G = load();
    busy = false; dlg = null; sel = null; target = null;
    if (G) {
      refresh();
      if (G.phase !== "over") {
        R.modal.innerHTML = "<h2>" + t("title") + "</h2><p>" + fmt(t("yourTurn"), { p: pname(G.turn) }) + " · " + (G.round === 0 ? t("setupRound") : fmt(t("round"), { n: G.round })) + '</p><div class="wm-row"><button type="button" class="wm-big" data-wm="goon">' + t("cont") + '</button><button type="button" class="wm-btn" data-wm="new">' + t("newGame") + "</button></div>";
        R.modal.hidden = false;
      }
    } else showSetup();
    R.raf = requestAnimationFrame(frame);
  }
  function unmount() {
    aiRun++;
    if (!R) return;
    cancelAnimationFrame(R.raf);
    window.removeEventListener("pointerup", onUp);
    document.body.style.overflow = R.ov || "";
    if (G) save();
    R = null; busy = false;
  }
  window.Weltmacht = { mount: mount, unmount: unmount, _debug: function () { return { G: G, battle: battle, runAI: runAI, IDS: IDS, ADJ: ADJ, income: income, newGame: newGame, startTurn: startTurn, findSet: findSet, CEN: CEN, PROV: PROV }; } };
})();
