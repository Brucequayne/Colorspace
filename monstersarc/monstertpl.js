/* Monsters Arc – monstertpl.js (seit v0.25)
   25 Grundmonster als Vorlagen für den Monster-Editor („Neu aus Vorlage“). Eigene Namen und Formen –
   keine Pokémon. Jede Vorlage: Name, Elemente, Aussehen, Farben, Kampfwerte [Grundwert Lv 1, Potenzial 0–100],
   Größe (Bild), Größe in m, Gewicht in kg, Schrei. Werte, die fehlen, kommen aus MA.monsters.blank(). */
(function () {
  var MA = window.MA, E = function (n) { return ["Normal", "Feuer", "Wasser", "Pflanze", "Elektro", "Eis", "Kampf", "Gift", "Boden", "Flug", "Psycho", "Käfer", "Gestein", "Geist", "Drache", "Unlicht", "Stahl"].indexOf(n); };
  function T(name, el, look, pal, st, size, h, kg, cry) {
    return { name: name, el: [E(el[0]), el[1] ? E(el[1]) : -1], look: look, pal: { main: pal[0], sec: pal[1], acc: pal[2], eye: pal[3], extra: pal[4] },
      stats: { hp: st[0], atk: st[1], def: st[2], spa: st[3], spd: st[4], ini: st[5] }, size: size, h: h, kg: kg, cry: { seed: cry[0], pitch: cry[1], stretch: cry[2] } };
  }
  MA.MONSTER_TEMPLATES = [
    T("Glutpfote", ["Feuer"], { body: "quad", bw: 0.35, bh: 0.45, head: 0.6, legs: 4, legL: 0.35, legT: 0.45, ear: "point", earS: 0.55, tail: "flame", tailS: 0.5, eyes: "big", eyeS: 0.5, mouth: "smile", pattern: "belly", seed: 11 },
      ["#E07A3C", "#F4D8A8", "#F2C040", "#3A2418", "#FFE08A"], [[11, 42], [8, 52], [6, 38], [8, 55], [7, 42], [9, 60]], 0.9, 0.4, 7.5, [101, 1.2, 0.9]),
    T("Tropfling", ["Wasser"], { body: "blob", bw: 0.45, bh: 0.6, ear: "fin", earS: 0.45, legs: 0, eyes: "round", eyeS: 0.6, mouth: "open", pattern: "belly", cheeks: 1, seed: 12 },
      ["#4A8EC8", "#BEE0F0", "#2E5E9A", "#1A2A40", "#8ACBE8"], [[13, 50], [6, 35], [8, 48], [8, 50], [9, 50], [6, 40]], 0.85, 0.4, 9, [102, 1.3, 1]),
    T("Moosling", ["Pflanze"], { body: "round", bw: 0.55, bh: 0.45, legs: 4, legL: 0.15, legT: 0.6, tail: "leaf", tailS: 0.6, eyes: "sleepy", eyeS: 0.5, mouth: "smile", pattern: "spots", seed: 13 },
      ["#6E9A4A", "#C8D8A0", "#3E6A2C", "#2A3018", "#A8C860"], [[12, 48], [7, 44], [8, 50], [8, 52], [8, 50], [6, 38]], 0.9, 0.5, 8, [103, 0.9, 1.1]),
    T("Funkfell", ["Elektro"], { body: "tall", bw: 0.3, bh: 0.35, head: 0.65, legs: 2, legL: 0.3, arms: "stub", ear: "long", earS: 0.6, tail: "flame", tailS: 0.4, eyes: "round", eyeS: 0.55, mouth: "smile", cheeks: 1, seed: 14 },
      ["#E8C840", "#F8ECB0", "#C84A2A", "#2A1E14", "#FFF6C0"], [[10, 38], [9, 55], [6, 36], [9, 58], [7, 44], [11, 70]], 0.85, 0.4, 6, [104, 1.5, 0.8]),
    T("Kieselkopf", ["Gestein"], { body: "round", bw: 0.6, bh: 0.5, legs: 0, arms: "long", eyes: "angry", eyeS: 0.45, mouth: "none", spikes: 1, pattern: "spots", seed: 15 },
      ["#8A847A", "#A8A296", "#5E5850", "#2A2622", "#C8C2B4"], [[11, 40], [10, 56], [12, 70], [5, 25], [6, 35], [4, 22]], 0.9, 0.4, 20, [105, 0.7, 1.2]),
    T("Flatterling", ["Normal", "Flug"], { body: "bird", bw: 0.4, bh: 0.4, head: 0.55, legL: 0.3, legT: 0.4, wing: "small", tail: "short", tailS: 0.5, eyes: "dot", eyeS: 0.5, mouth: "beak", pattern: "belly", seed: 16 },
      ["#A87850", "#F0E0C8", "#6A4A30", "#1A1410", "#F0B040"], [[10, 40], [8, 46], [6, 36], [6, 34], [6, 36], [10, 62]], 0.75, 0.3, 1.8, [106, 1.6, 0.7]),
    T("Nachtohr", ["Unlicht"], { body: "tall", bw: 0.35, bh: 0.45, head: 0.55, legs: 2, legL: 0.4, arms: "claw", ear: "long", earS: 0.7, tail: "long", tailS: 0.6, eyes: "angry", eyeS: 0.45, mouth: "fang", pattern: "mask", seed: 17 },
      ["#3E3A48", "#6A6478", "#C83A4A", "#E8D040", "#D8D0C0"], [[11, 46], [11, 62], [7, 40], [8, 50], [7, 42], [10, 66]], 1, 0.7, 14, [107, 0.9, 1]),
    T("Frostbeere", ["Eis"], { body: "blob", bw: 0.4, bh: 0.5, horn: "antenna", eyes: "dot", eyeS: 0.6, mouth: "smile", cheeks: 1, pattern: "spots", seed: 18 },
      ["#BEE4F0", "#F4FAFC", "#6AB0D0", "#1A2A40", "#F07090"], [[11, 44], [6, 34], [8, 46], [9, 56], [9, 54], [7, 40]], 0.75, 0.3, 4, [108, 1.7, 0.8]),
    T("Panzerkäfer", ["Käfer", "Stahl"], { body: "quad", bw: 0.55, bh: 0.55, head: 0.4, legs: 4, legL: 0.2, legT: 0.35, horn: "antenna", eyes: "dot", eyeS: 0.5, mouth: "none", pattern: "stripes", seed: 19 },
      ["#4A6A8A", "#8AA6C0", "#2A3A4E", "#101820", "#C8D0D8"], [[10, 40], [9, 50], [13, 68], [5, 28], [8, 46], [5, 30]], 0.9, 0.5, 18, [109, 0.8, 1.1]),
    T("Giftmolch", ["Gift", "Wasser"], { body: "quad", bw: 0.5, bh: 0.3, head: 0.5, legs: 4, legL: 0.15, legT: 0.4, tail: "long", tailS: 0.7, eyes: "slit", eyeS: 0.55, mouth: "smile", pattern: "spots", seed: 20 },
      ["#8A5AA8", "#D8C0E8", "#E8C048", "#2A1A30", "#C8E060"], [[12, 46], [8, 48], [8, 46], [9, 56], [8, 48], [8, 50]], 1, 0.6, 9, [110, 1.1, 1.2]),
    T("Schlammi", ["Boden"], { body: "blob", bw: 0.6, bh: 0.4, eyes: "sleepy", eyeS: 0.5, mouth: "open", pattern: "spots", seed: 21 },
      ["#8A6A4A", "#B8946A", "#5E4430", "#1E140C", "#D8B888"], [[15, 60], [8, 44], [9, 52], [6, 36], [8, 46], [3, 18]], 1, 0.5, 30, [111, 0.6, 1.4]),
    T("Geisterhauch", ["Geist"], { body: "blob", bw: 0.35, bh: 0.65, legs: 0, arms: "stub", eyes: "cyclops", eyeS: 0.55, mouth: "open", tail: "curl", tailS: 0.4, seed: 22 },
      ["#8A7AC8", "#C8C0F0", "#4A3A88", "#E04060", "#F0E8FF"], [[8, 36], [6, 34], [6, 38], [12, 66], [10, 58], [10, 60]], 0.9, 0.9, 0.2, [112, 1.2, 1.6]),
    T("Faustling", ["Kampf"], { body: "tall", bw: 0.55, bh: 0.5, head: 0.45, legs: 2, legL: 0.45, legT: 0.7, arms: "long", eyes: "angry", eyeS: 0.4, mouth: "fang", seed: 23 },
      ["#C86A4A", "#E8B898", "#3A3A48", "#2A1A10", "#F0E8D8"], [[13, 52], [12, 72], [9, 50], [4, 24], [7, 40], [8, 48]], 1.05, 0.9, 32, [113, 0.8, 0.9]),
    T("Wirbelwurm", ["Drache"], { body: "serpent", bw: 0.5, bh: 0.5, head: 0.5, horn: "two", ear: "fin", earS: 0.4, eyes: "slit", eyeS: 0.5, mouth: "fang", pattern: "belly", spikes: 1, seed: 24 },
      ["#4A6AC8", "#E8E0C8", "#C8C8E8", "#E8C040", "#F0F0F8"], [[12, 52], [11, 64], [9, 50], [10, 62], [9, 50], [9, 58]], 1.15, 2.2, 22, [114, 0.7, 1.3]),
    T("Stahlzahn", ["Stahl"], { body: "quad", bw: 0.6, bh: 0.5, head: 0.65, legs: 4, legL: 0.3, legT: 0.7, horn: "one", ear: "round", earS: 0.4, eyes: "angry", eyeS: 0.4, mouth: "fang", seed: 25 },
      ["#8A929A", "#C0C8D0", "#4A525A", "#C83A3A", "#E8E0B0"], [[12, 50], [11, 64], [13, 72], [5, 30], [9, 50], [5, 32]], 1.1, 0.8, 60, [115, 0.6, 1]),
    T("Traumauge", ["Psycho"], { body: "round", bw: 0.4, bh: 0.55, legs: 2, legL: 0.2, horn: "antenna", eyes: "big", eyeS: 0.65, mouth: "smile", cheeks: 1, seed: 26 },
      ["#E8A0C8", "#F8E0F0", "#A84888", "#3A1A50", "#F8F0A0"], [[11, 44], [5, 28], [7, 40], [12, 70], [11, 62], [9, 54]], 0.85, 0.5, 5, [116, 1.4, 1.2]),
    T("Pilzling", ["Pflanze", "Gift"], { body: "round", bw: 0.5, bh: 0.6, legs: 2, legL: 0.25, legT: 0.6, eyes: "dot", eyeS: 0.5, mouth: "smile", pattern: "spots", seed: 27 },
      ["#C84A3A", "#F0E8D8", "#F8F4EC", "#2A1810", "#E8D8B8"], [[12, 50], [8, 44], [9, 48], [8, 50], [9, 50], [4, 24]], 0.8, 0.3, 4, [117, 1.1, 1]),
    T("Muschelbub", ["Wasser"], { body: "round", bw: 0.6, bh: 0.45, legs: 4, legL: 0.1, legT: 0.5, eyes: "round", eyeS: 0.45, mouth: "smile", spikes: 1, pattern: "stripes", seed: 28 },
      ["#E8B8A8", "#F8E8E0", "#C87868", "#2A1A20", "#F8F0E8"], [[11, 44], [7, 40], [12, 66], [7, 42], [9, 54], [4, 24]], 0.85, 0.4, 12, [118, 1, 0.9]),
    T("Wolkenschaf", ["Normal"], { body: "blob", bw: 0.7, bh: 0.5, legs: 4, legL: 0.25, legT: 0.4, ear: "round", earS: 0.45, horn: "two", eyes: "sleepy", eyeS: 0.45, mouth: "smile", seed: 29 },
      ["#F0ECE4", "#C8C0B8", "#8A8078", "#2A2420", "#D8C8A8"], [[14, 56], [6, 36], [9, 50], [7, 42], [9, 54], [5, 30]], 0.95, 0.6, 22, [119, 0.9, 1.3]),
    T("Felsenfaust", ["Gestein", "Kampf"], { body: "tall", bw: 0.7, bh: 0.6, head: 0.35, legs: 2, legL: 0.3, legT: 0.8, arms: "long", eyes: "angry", eyeS: 0.35, mouth: "none", spikes: 1, seed: 30 },
      ["#7A6E60", "#A89A88", "#4E4438", "#E8A040", "#C8BCA8"], [[14, 56], [13, 74], [13, 72], [4, 22], [7, 40], [4, 20]], 1.3, 1.6, 140, [120, 0.55, 1.2]),
    T("Lavaschnecke", ["Feuer", "Gestein"], { body: "serpent", bw: 0.4, bh: 0.3, head: 0.4, horn: "antenna", eyes: "sleepy", eyeS: 0.45, mouth: "smile", tail: "flame", tailS: 0.4, pattern: "spots", seed: 31 },
      ["#C84A2A", "#F0A040", "#F8D048", "#2A1008", "#FFF0A0"], [[11, 44], [7, 42], [11, 60], [10, 58], [8, 48], [3, 16]], 0.95, 0.5, 26, [121, 0.8, 1.5]),
    T("Sumpfquak", ["Wasser", "Boden"], { body: "round", bw: 0.65, bh: 0.35, legs: 4, legL: 0.15, legT: 0.6, eyes: "big", eyeS: 0.55, eyeGap: 0.75, mouth: "smile", pattern: "belly", seed: 32 },
      ["#5E8A5A", "#D8D8A0", "#3E5E3A", "#2A2010", "#E8C048"], [[13, 54], [9, 50], [9, 50], [7, 44], [8, 46], [6, 38]], 0.95, 0.5, 14, [122, 0.85, 1]),
    T("Dornhase", ["Pflanze"], { body: "tall", bw: 0.35, bh: 0.35, head: 0.55, legs: 2, legL: 0.35, legT: 0.55, arms: "stub", ear: "long", earS: 0.75, tail: "leaf", tailS: 0.4, eyes: "round", eyeS: 0.5, mouth: "fang", pattern: "belly", seed: 33 },
      ["#8AAE5A", "#E8F0C8", "#5E8A3A", "#3A2818", "#E87090"], [[11, 44], [9, 52], [7, 40], [8, 48], [8, 44], [11, 66]], 0.9, 0.5, 6, [123, 1.3, 0.9]),
    T("Blitzvogel", ["Elektro", "Flug"], { body: "bird", bw: 0.45, bh: 0.5, head: 0.5, legL: 0.3, legT: 0.4, wing: "big", horn: "antenna", tail: "fluff", tailS: 0.5, eyes: "angry", eyeS: 0.45, mouth: "beak", seed: 34 },
      ["#F0C840", "#F8F0C0", "#3A4A8A", "#1A1A2A", "#E87A2A"], [[11, 46], [10, 58], [7, 40], [11, 64], [8, 46], [12, 72]], 1.1, 1, 12, [124, 1.4, 0.8]),
    T("Schattenkatz", ["Geist", "Unlicht"], { body: "quad", bw: 0.45, bh: 0.4, head: 0.55, legs: 4, legL: 0.4, legT: 0.4, ear: "point", earS: 0.6, tail: "long", tailS: 0.8, eyes: "slit", eyeS: 0.5, mouth: "fang", pattern: "stripes", seed: 35 },
      ["#4A4258", "#7A7090", "#8A6AE0", "#E8E040", "#E0D8F0"], [[10, 42], [11, 62], [7, 40], [10, 60], [8, 46], [12, 72]], 1, 0.6, 9, [125, 1, 1.1])
  ];
  MA.MONSTER_TEMPLATES.forEach(function (t, i) { t.look.seed = t.look.seed || i + 1; });
})();
