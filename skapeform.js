/* SkapeForm – Vollbild-Videoeditor im TikTok-Stil (9:16, dazu 16:9, 4:5 und 1:1 seit v0.21).
   Clips schneiden, Drop-Animationen (Turbulenz, Judder Shake, Zoom Punch, Wackeln) und Live-Schnitt über die Zahlentasten:
   bis zu 10 Clips liegen auf 1–9 und 0. Beim Abspielen schneidet jede Zahl live auf ihren Clip, und zwar dort weiter,
   wo von diesem Clip noch nichts benutzt wurde. Ist ein Clip aufgebraucht, rückt automatisch der nächste Clip aus der
   Bibliothek nach, der noch nie auf einer Taste lag.
   Die Timeline ist magnetisch (keine Lücken). Zeitbasis beim Abspielen ist die Audio-Uhr, damit Live-Schnitte genau
   auf der Musik liegen. Export als MP4 über WebCodecs + mp4-muxer.js. Videos verlassen nie das Gerät.
   Das Projekt bleibt erhalten, solange die Seite offen ist (auch beim Wechsel zu anderen Apps). */
(function () {
  "use strict";

  var VERSION = "0.3", OW = 1080, OH = 1920, MIN = 0.1, JF = 12;
  var KEYC = ["#D9D6D0", "#E2621B", "#E3B83F", "#8DBF45", "#23A06A", "#2BB0B8", "#3B7FE0", "#8A6CF0", "#C452C8", "#E0457A"];
  var KEY_ORDER = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0], PAD_ORDER = [7, 8, 9, 4, 5, 6, 1, 2, 3, 0];
  var ANIMS = ["none", "turb", "judder", "punch", "shake"];
  var lang = "de";
  function L2(de, en) { return { de: de, en: en }; }
  var TX = {
    back: L2("← Apps", "← Apps"), imp: L2("Clips importieren", "Import clips"), full: L2("Vollbild", "Full screen"),
    exp: L2("Exportieren", "Export"), help: L2("Hilfe", "Help"),
    lib: L2("Bibliothek", "Library"),
    libEmpty: L2("Videos hierher ziehen oder oben importieren. Die Reihenfolge hier bestimmt, welcher Clip als Nächstes auf eine frei gewordene Taste rückt. Ziehen sortiert um.", "Drag videos here or import them above. The order here decides which clip moves onto a freed key next. Drag to reorder."),
    loading: L2("lädt …", "loading …"), usedUp: L2("aufgebraucht", "used up"), wasKey: L2("war auf Taste", "was on a key"),
    remove: L2("Aus der Bibliothek entfernen", "Remove from library"),
    keys: L2("Live-Tasten", "Live keys"),
    keysNote: L2("Zahl drücken schneidet live auf den Clip, dort weiter, wo noch nichts benutzt wurde. Belegen: Clip auf eine Taste ziehen oder anklicken und Umschalt + Zahl.", "A number cuts live to its clip, continuing where nothing has been used yet. Assign: drag a clip onto a key, or click it and press Shift + number."),
    empty: L2("leer", "empty"), clear: L2("Taste leeren", "Clear key"),
    fxH: L2("Effekte (Buchstaben halten)", "Effects (hold letters)"),
    fxReset: L2("Regler zurücksetzen", "Reset sliders"),
    fxNote: L2("Buchstaben halten, während das Video läuft: Solange du hältst, liegt der Effekt auf dem Bild und landet als eigene Ebene in der Timeline. Dort kannst du ihn verschieben, an den Kanten kürzen oder verlängern, mit S teilen und mit Entf löschen. Im Stillstand zeigt Halten nur eine Vorschau. Auf den Buchstaben klicken, um die Taste zu ändern.", "Hold letters while the video plays: as long as you hold, the effect is on the picture and lands as its own layer in the timeline. There you can move it, shorten or extend it at the edges, split it with S and delete it with Delete. While stopped, holding only shows a preview. Click the letter to change the key."),
    fxKeyT: L2("Taste ändern", "Change key"), fxPress: L2("Taste …", "Key …"),
    fxLearn: L2("Jetzt einen Buchstaben drücken (Esc bricht ab).", "Now press a letter (Esc cancels)."),
    fxBadKey: L2("Nur Buchstaben A–Z, außer S (Teilen).", "Only letters A–Z, except S (split)."),
    fxSel: L2("Effekt „{n}“ ausgewählt ({d}): ziehen verschiebt, Kanten kürzen, S teilt am Abspielkopf, Entf löscht.", "Effect “{n}” selected ({d}): drag to move, edges to trim, S splits at the playhead, Delete removes."),
    modeH: L2("Wiedergabe der Tasten", "Key playback"), modeCont: L2("Weiterspielen", "Continue"), modeRand: L2("Random Time", "Random Time"),
    modeContD: L2("Jede Taste spielt ihren Clip dort weiter, wo sie zuletzt aufgehört hat.", "Each key continues its clip where it last stopped."),
    modeRandD: L2("Jeder Tastendruck springt an eine zufällige, noch unbenutzte Stelle im Clip. Die Lücken dazwischen bleiben verfügbar, bis der ganze Clip gezeigt wurde, erst dann rückt der nächste nach.", "Every key press jumps to a random, still unused spot in the clip. The gaps in between stay available until the whole clip has been shown; only then does the next one move in."),
    fill: L2("Freie Tasten füllen", "Fill free keys"), reset: L2("Zähler zurücksetzen", "Reset counters"),
    liveAnim: L2("Animation bei Live-Schnitten", "Animation on live cuts"),
    str: L2("Stärke", "Strength"), dur: L2("Dauer", "Duration"),
    a_none: L2("Keine", "None"), a_turb: L2("Turbulenz", "Turbulence"), a_judder: L2("Judder Shake", "Judder Shake"),
    a_punch: L2("Zoom Punch", "Zoom Punch"), a_shake: L2("Wackeln", "Wobble"), a_rand: L2("Zufall: Turbulenz / Judder", "Random: turbulence / judder"),
    sound: L2("Ton", "Sound"), clipVol: L2("Originalton der Clips", "Original clip sound"),
    music: L2("Musik", "Music"), musicLoad: L2("Musik laden", "Load music"), musicDel: L2("Entfernen", "Remove"), musicVol: L2("Lautstärke Musik", "Music volume"),
    musicNote: L2("Die Musik startet am Anfang der Timeline. Beim Live-Schneiden ist sie die Uhr, die Schnitte landen genau dort, wo du sie gehört hast.", "The music starts at the beginning of the timeline. While cutting live it is the clock, so cuts land exactly where you heard them."),
    musicBad: L2("Die Musikdatei konnte nicht gelesen werden.", "The music file could not be read."),
    play: L2("▶ Abspielen", "▶ Play"), stop: L2("■ Stopp", "■ Stop"),
    split: L2("Teilen", "Split"), del: L2("Löschen", "Delete"), undo: L2("Rückgängig", "Undo"), redo: L2("Wiederholen", "Redo"),
    anim: L2("Animation", "Animation"), pic: L2("Bild", "Picture"), pFill: L2("Füllen", "Fill"), pFit: L2("Ganz", "Whole"),
    toAll: L2("Auf alle Schnitte", "Apply to all cuts"),
    noSel: L2("Clip in der Timeline anklicken: Animation, Stärke und Bild einstellen.", "Click a clip in the timeline to set animation, strength and picture."),
    stageEmpty: L2("Clips importieren · auf die Zahlentasten legen · Play und Zahlen drücken", "Import clips · put them on the number keys · press play and numbers"),
    rec: L2("LIVE-SCHNITT", "LIVE CUT"),
    keyEmpty: L2("Taste {k} ist leer.", "Key {k} is empty."),
    noMore: L2("Keine unbenutzten Clips mehr in der Bibliothek, Live-Schnitt gestoppt.", "No unused clips left in the library, live cut stopped."),
    swapped: L2("Taste {k}: „{a}“ ist aufgebraucht, jetzt „{b}“.", "Key {k}: “{a}” is used up, now “{b}”."),
    keyFreed: L2("Taste {k}: „{a}“ ist aufgebraucht, kein unbenutzter Clip mehr übrig.", "Key {k}: “{a}” is used up, no unused clip left."),
    inUse: L2("Der Clip wird in der Timeline benutzt und kann nicht entfernt werden.", "The clip is used in the timeline and cannot be removed."),
    assigned: L2("„{n}“ liegt jetzt auf Taste {k}.", "“{n}” is now on key {k}."),
    pickFirst: L2("Erst einen Clip in der Bibliothek anklicken, dann Umschalt + Zahl.", "First click a clip in the library, then Shift + number."),
    filled: L2("{n} Tasten belegt.", "{n} keys assigned."), noFree: L2("Kein unbenutzter Clip für freie Tasten.", "No unused clip for free keys."),
    resetDone: L2("Zähler zurückgesetzt: alle Clips starten wieder von vorn.", "Counters reset: all clips start from the beginning again."),
    takeDone: L2("Live-Schnitt übernommen: {n} Schnitte, {d}.", "Live cut applied: {n} cuts, {d}."),
    bad: L2("„{n}“ konnte nicht gelesen werden.", "“{n}” could not be read."),
    expH: L2("Video exportieren", "Export video"),
    expInfo: L2("MP4 in {w} × {h} ({r}), H.264, Ton als AAC. Alles wird in deinem Browser berechnet, das dauert je nach Länge ein paar Minuten.", "MP4 at {w} × {h} ({r}), H.264, sound as AAC. Everything is computed in your browser, depending on length this takes a few minutes."),
    ratioT: L2("Bildformat: 9:16 Hochkant (TikTok, Reels), 16:9 Querformat (YouTube), 4:5 (Instagram-Feed), 1:1 Quadrat. Gilt für Vorschau und Export.", "Aspect ratio: 9:16 portrait (TikTok, Reels), 16:9 landscape (YouTube), 4:5 (Instagram feed), 1:1 square. Applies to preview and export."),
    fps: L2("Bilder pro Sekunde", "Frames per second"),
    expGo: L2("Export starten", "Start export"), cancel: L2("Abbrechen", "Cancel"), close: L2("Schließen", "Close"),
    working: L2("Bild {i} von {n} · {p} %", "Frame {i} of {n} · {p} %"), audio: L2("Ton wird gemischt …", "Mixing sound …"),
    done: L2("Fertig: {mb} MB, Download gestartet.", "Done: {mb} MB, download started."), failed: L2("Export fehlgeschlagen: {e}", "Export failed: {e}"),
    cancelled: L2("Export abgebrochen.", "Export cancelled."),
    noSupport: L2("Dein Browser kann keine Videos kodieren (WebCodecs fehlt). Bitte aktuelles Chrome oder Edge nutzen.", "Your browser cannot encode video (WebCodecs missing). Please use a current Chrome or Edge."),
    nothing: L2("Die Timeline ist noch leer.", "The timeline is still empty."),
    opusNote: L2("Ton als Opus, weil dein Browser kein AAC kodieren kann. Für TikTok im Schnittprogramm noch einmal rendern.", "Sound as Opus because your browser cannot encode AAC. Render once more in your editing tool for TikTok."),
    noAudio: L2("Ohne Ton exportiert (kein lesbarer Ton gefunden).", "Exported without sound (no readable sound found)."),
    helpH: L2("So funktioniert SkapeForm", "How SkapeForm works"),
    help1: L2("Clips importieren oder in die Bibliothek ziehen. Die ersten zehn landen automatisch auf den Tasten 1–9 und 0, umlegen per Ziehen auf eine Taste oder Umschalt + Zahl.", "Import clips or drag them into the library. The first ten land on keys 1–9 and 0 automatically; reassign by dragging onto a key or with Shift + number."),
    help2: L2("Live-Schnitt: Leertaste (oder Enter am Ziffernblock) startet die Wiedergabe. Jede Zahl schneidet sofort auf ihren Clip und spielt ihn dort weiter, wo von ihm noch nichts benutzt wurde. Gehst du von 5 auf 7 und zurück auf 5, läuft 5 an der Stelle weiter, an der du es verlassen hast. Dieselbe Zahl noch mal drücken setzt einen neuen Schnitt mit Animation, ohne Sprung im Bild. Eine Zahl im Stillstand startet Wiedergabe und Live-Schnitt zugleich.", "Live cut: Space (or Enter on the numpad) starts playback. Each number instantly cuts to its clip and continues it where nothing of it has been used yet. Going from 5 to 7 and back to 5 continues 5 where you left it. Pressing the same number again adds a new cut with animation, without a jump in the picture. A number while stopped starts playback and the live cut at once."),
    help3b: L2("Random Time (rechts unter den Tasten): Jeder Tastendruck, auch dieselbe Zahl noch mal, springt an eine zufällige Stelle im Clip, die noch nicht benutzt wurde. Läuft eine Stelle in schon benutztes Material, springt der Clip von selbst an die nächste freie Stelle. Aufgebraucht ist ein Clip erst, wenn alles von ihm gezeigt wurde (Reste unter einer Zehntelsekunde zählen nicht).", "Random Time (on the right below the keys): every key press, including the same number again, jumps to a random spot in the clip that has not been used yet. If a spot runs into already used material, the clip jumps to the next free spot by itself. A clip is only used up once all of it has been shown (leftovers under a tenth of a second do not count)."),
    help3: L2("Ist ein Clip aufgebraucht, holt sich die Taste automatisch den nächsten Clip aus der Bibliothek (von oben nach unten), der noch nie auf einer Taste lag. Der Live-Schnitt überschreibt die Timeline ab der Stelle, an der du die erste Zahl gedrückt hast, bis zum Stopp. Strg+Z macht den ganzen Take rückgängig, auch die Zähler.", "When a clip is used up, the key automatically takes the next clip from the library (top to bottom) that has never been on a key. The live cut overwrites the timeline from where you pressed the first number until you stop. Ctrl+Z undoes the whole take, including the counters."),
    help4: L2("Timeline: Clip anklicken zum Auswählen, ziehen zum Umsortieren, an den Kanten ziehen zum Kürzen oder Verlängern. S teilt am Abspielkopf, Entf löscht. Mausrad scrollt, Strg + Mausrad oder + / − zoomt. ← / → einzelne Bilder, mit Umschalt eine Sekunde.", "Timeline: click a clip to select it, drag to reorder, drag its edges to shorten or extend. S splits at the playhead, Delete removes. Mouse wheel scrolls, Ctrl + wheel or + / − zooms. ← / → single frames, with Shift one second."),
    help5b: L2("Effekte: Buchstaben halten, während das Video läuft (zum Start Negativ auf Q). Das geht beim normalen Abspielen und beim Live-Schnitt gleichzeitig mit den Zahlen. Effekte liegen als eigene Spuren unter den Clips, unabhängig vom Schnitt: Verschiebst du Clips, bleibt der Effekt an seiner Zeit. Ebenen rasten an Schnitten und am Abspielkopf ein.", "Effects: hold letters while the video plays (to start: Negative on Q). This works during normal playback and during a live cut together with the numbers. Effects sit on their own tracks below the clips, independent of the cut: if you move clips, the effect stays at its time. Layers snap to cuts and the playhead."),
    help5: L2("Animationen spielen am Anfang eines Schnitts: Turbulenz (wilde, weiche Kamerabewegung mit Bewegungsunschärfe), Judder Shake (ruckelnde Stöße, das Bild stottert), Zoom Punch und Wackeln. Für Live-Schnitte rechts einstellen, für einzelne Clips über der Timeline.", "Animations play at the start of a cut: Turbulence (wild, smooth camera motion with motion blur), Judder Shake (jerky hits, the picture stutters), Zoom Punch and Wobble. Set them on the right for live cuts, above the timeline for single clips."),
    help6: L2("Alles bleibt auf deinem Gerät. Das Projekt bleibt erhalten, solange diese Seite offen ist.", "Everything stays on your device. The project is kept as long as this page is open."),
    leave: L2("SkapeForm-Projekt geht beim Schließen verloren.", "The SkapeForm project is lost when closing.")
  };
  function t(k) { return TX[k][lang]; }
  function fmt(s, o) { return s.replace(/\{(\w+)\}/g, function (_, k) { return o[k]; }); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function canvasEl(w, h) { var c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
  function tc(s, fine) {
    s = Math.max(0, s); var m = Math.floor(s / 60), r = s - m * 60;
    if (fine) { var f = Math.floor((r - Math.floor(r)) * 100); return m + ":" + String(Math.floor(r)).padStart(2, "0") + "." + String(f).padStart(2, "0"); }
    return m + ":" + String(Math.floor(r)).padStart(2, "0");
  }
  function sec(s) { var v = s.toFixed(s < 10 ? 1 : 0); return (lang === "de" ? v.replace(".", ",") : v) + " s"; }
  function rnd(seed, k, j) { var x = Math.sin(seed * 12.9898 + k * 78.233 + j * 37.719) * 43758.5453; return x - Math.floor(x); }
  function newSeed() { return Math.floor(Math.random() * 100000) + 1; }
  function noop() {}

  // ---------- Projekt (bleibt erhalten, solange die Seite offen ist) ----------
  var P = {
    clips: [], segs: [], slots: [null, null, null, null, null, null, null, null, null, null],
    sel: 0, selClip: 0, T: 0, nextId: 1, undo: [], redo: [],
    live: { anim: "turb", as: 1, ad: 0.45, mode: "cont" }, clipVol: 1, musicVol: 0.9, music: null,
    pps: 60, scroll: 0, ratio: "9:16",
    fx: [], selFx: 0, fxKeys: {}, fxSet: {}           // Effekt-Ebenen: { id, type, start, dur, seed } in Timeline-Zeit; fxSet: Regler je Effekt
  };
  var V = null, raf = 0;
  // Bildformate (Breite × Höhe des Exports). Clips werden wie bisher mit „Füllen“ oder „Einpassen“ hineingesetzt.
  var RATIOS = { "9:16": [1080, 1920], "16:9": [1920, 1080], "4:5": [1080, 1350], "1:1": [1080, 1080] }, RATIO_ORDER = ["9:16", "16:9", "4:5", "1:1"];
  function applyRatio() { var r = RATIOS[P.ratio] || RATIOS["9:16"]; OW = r[0]; OH = r[1]; }
  function setRatio(k) {
    if (!RATIOS[k] || (V && V.exporting)) return;
    P.ratio = k; applyRatio();
    if (!V) return;
    V.hold.key = ""; V.pvOk = false;
    V.root.querySelectorAll("[data-ratio]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-ratio") === k)); });
    layoutStage(); if (V.modal === "export") renderModal(true);
  }
  var REC = null;                                     // laufender Live-Schnitt
  var PL = { on: false, T0: 0, wall: 0, ac: false, acT: 0, seg: null, el: null, msrc: null };
  var AC = null;

  function clipById(id) { for (var i = 0; i < P.clips.length; i++) if (P.clips[i].id === id) return P.clips[i]; return null; }
  function segById(id) { for (var i = 0; i < P.segs.length; i++) if (P.segs[i].id === id) return P.segs[i]; return null; }
  function slotOf(id) { return P.slots.indexOf(id); }
  function layoutList(list) { var s = 0; list.forEach(function (g) { g.start = s; s += g.dur; }); return s; }
  function layout() { layoutList(P.segs); }
  function total() { var n = P.segs.length; return n ? P.segs[n - 1].start + P.segs[n - 1].dur : 0; }
  function segAt(T, list) {
    list = list || P.segs;
    for (var i = 0; i < list.length; i++) if (T >= list[i].start && T < list[i].start + list[i].dur) return list[i];
    return null;
  }
  function mkSeg(clip, inp, dur, anim, key, seed) {
    return { id: P.nextId++, clip: clip, in: inp, dur: dur, anim: anim || "none", as: P.live.as, ad: P.live.ad, fit: "fill", key: key == null ? -1 : key, seed: seed || newSeed(), start: 0 };
  }
  function copySeg(g) { var o = {}; for (var k in g) o[k] = g[k]; return o; }

  // ---------- Rückgängig ----------
  function snap() { return JSON.stringify({ s: P.segs, f: P.fx, k: P.slots, c: P.clips.map(function (c) { return [c.id, c.pos, c.bound, c.done, c.used]; }) }); }
  function pushUndo() { P.undo.push(snap()); if (P.undo.length > 120) P.undo.shift(); P.redo = []; }
  function restore(str) {
    var o = JSON.parse(str);
    o.c.forEach(function (a) { var c = clipById(a[0]); if (c) { c.pos = a[1]; c.bound = a[2]; c.done = a[3]; c.used = a[4] || []; c.pre = null; } });
    P.segs = o.s.filter(function (g) { return clipById(g.clip); });
    P.fx = o.f || []; if (P.selFx && !fxById(P.selFx)) P.selFx = 0;
    var old = P.slots.slice();
    P.slots = o.k.map(function (id) { return id && clipById(id) ? id : null; });
    old.forEach(function (id) { if (id && P.slots.indexOf(id) < 0) releaseS(clipById(id)); });
    P.slots.forEach(function (id) { if (id) prepS(clipById(id)); });
    layout(); if (P.sel && !segById(P.sel)) P.sel = 0;
    P.T = Math.min(P.T, total());
    renderAll();
  }
  function undo() { if (REC || !P.undo.length) return; stopPlay(); P.redo.push(snap()); restore(P.undo.pop()); }
  function redo() { if (REC || !P.redo.length) return; stopPlay(); P.undo.push(snap()); restore(P.redo.pop()); }

  // ---------- Video-Elemente ----------
  function mkVid(url) { var v = document.createElement("video"); v.src = url; v.preload = "auto"; v.playsInline = true; v.muted = true; return v; }
  function setVol(el) { el.volume = clamp(P.clipVol, 0, 1); el.muted = P.clipVol <= 0; }
  var tLRU = [];
  function vT(c) {                                   // Element für die Timeline-Wiedergabe
    if (!c.vT) {
      c.vT = mkVid(c.url); tLRU.push(c);
      while (tLRU.length > 8) {
        var o = tLRU.find(function (x) { return x !== c && x.vT !== PL.el; }); if (!o) break;
        tLRU.splice(tLRU.indexOf(o), 1); o.vT.pause(); o.vT.removeAttribute("src"); o.vT.load(); o.vT = null;
      }
    }
    return c.vT;
  }
  function vS(c) {                                   // Element für die Live-Taste, wartet pausiert an der Zählerstelle
    if (!c.vS) {
      var el = mkVid(c.url); c.vS = el;
      el.addEventListener("loadedmetadata", function () {
        if (c.vS !== el) return;
        var p = REC && REC.cur && REC.cur.clip === c.id ? REC.cur.in + (P.T - REC.cur.t) : c.pre ? c.pre.s : c.pos;
        el.currentTime = Math.min(p, Math.max(0, c.dur - 0.05));
      }, { once: true });
    }
    return c.vS;
  }
  function prepS(c) {
    if (!c) return; var el = vS(c);
    if (REC && REC.cur && REC.cur.clip === c.id) return;
    if (!c.pre || !gapAt(c, c.pre.s)) prepick(c);
    var p = c.pre ? c.pre.s : c.pos;
    if (el.readyState >= 1 && Math.abs(el.currentTime - p) > 0.04) el.currentTime = Math.min(p, Math.max(0, c.dur - 0.05));
  }

  // ---------- Benutztes Material je Clip ----------
  // c.used: sortierte, zusammengeführte Bereiche [von, bis], die schon in einem Live-Schnitt waren.
  // Lücken unter MINGAP zählen als benutzt, sonst bleiben winzige Reste übrig, die nur noch Mini-Schnitte erzeugen.
  var MINGAP = 0.1, SNAP = 0.35;
  function addUsed(c, a, b) {
    if (b - a <= 0.0005) return;
    var u = c.used.concat([[a, b]]).sort(function (x, y) { return x[0] - y[0]; }), out = [];
    u.forEach(function (r) { var l = out[out.length - 1]; if (l && r[0] <= l[1] + 0.002) l[1] = Math.max(l[1], r[1]); else out.push([r[0], r[1]]); });
    c.used = out;
  }
  function gaps(c) {
    var g = [], p = 0;
    c.used.forEach(function (r) { if (r[0] - p >= MINGAP) g.push([p, r[0]]); p = Math.max(p, r[1]); });
    if (c.dur - p >= MINGAP) g.push([p, c.dur]);
    return g;
  }
  function freeTime(c) { return gaps(c).reduce(function (s, g) { return s + g[1] - g[0]; }, 0); }
  function gapAt(c, s) { var g = gaps(c); for (var i = 0; i < g.length; i++) if (s >= g[i][0] - 1e-3 && s < g[i][1] - 0.05) return g[i]; return null; }
  function pickStart(c) {
    var g = gaps(c), i; if (!g.length) return null;
    if (P.live.mode !== "rand") {                     // Weiterspielen: dort, wo zuletzt aufgehört wurde, sonst nächste Lücke
      for (i = 0; i < g.length; i++) if (c.pos >= g[i][0] - 1e-3 && c.pos < g[i][1] - 0.05) return { s: Math.max(c.pos, g[i][0]), e: g[i][1] };
      for (i = 0; i < g.length; i++) if (g[i][0] >= c.pos) return { s: g[i][0], e: g[i][1] };
      return { s: g[0][0], e: g[0][1] };
    }
    var r = Math.random() * freeTime(c);              // Random Time: zufällige Stelle, gewichtet nach Länge der Lücken
    for (i = 0; i < g.length; i++) {
      var L = g[i][1] - g[i][0];
      if (r <= L || i === g.length - 1) {
        var s = g[i][0] + Math.min(r, L), keep = Math.min(0.5, L);
        if (g[i][1] - s < keep) s = g[i][1] - keep;                // mindestens ein kurzes Stück abspielen
        if (s - g[i][0] < SNAP) s = g[i][0];                       // und keinen zu kleinen Rest vorne liegen lassen
        return { s: s, e: g[i][1] };
      }
      r -= L;
    }
    return null;
  }
  function prepick(c) { c.pre = pickStart(c); }
  function releaseS(c) { if (c && c.vS) { c.vS.pause(); c.vS.removeAttribute("src"); c.vS.load(); c.vS = null; } }
  function seekEl(v, tm) {
    return new Promise(function (res) {
      var done = false, fin = function () { if (done) return; done = true; v.removeEventListener("seeked", fin); clearTimeout(to); res(); };
      var to = setTimeout(fin, 3000);
      v.addEventListener("seeked", fin); v.currentTime = tm;
    });
  }

  // ---------- Bibliothek: Import, Vorschaubilder ----------
  function isVideo(f) { return /^video\//.test(f.type) || /\.(mp4|mov|m4v|webm|mkv)$/i.test(f.name); }
  function isAudio(f) { return /^audio\//.test(f.type) || /\.(mp3|wav|ogg|m4a|aac|flac|opus)$/i.test(f.name); }
  function importFiles(files) {
    files = Array.prototype.slice.call(files || []);
    var aud = files.filter(function (f) { return isAudio(f) && !isVideo(f); });
    if (aud.length) loadMusic(aud[0]);
    var vids = files.filter(isVideo).sort(function (a, b) { return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }); });
    vids.forEach(function (f) {
      var c = { id: P.nextId++, name: f.name.replace(/\.[^.]+$/, ""), file: f, url: URL.createObjectURL(f), dur: 0, w: 0, h: 0, pos: 0, used: [], pre: null, bound: false, done: false, tiles: [], poster: "", bad: false, vT: null, vS: null };
      P.clips.push(c);
      var m = document.createElement("video"); m.preload = "metadata"; m.muted = true; m.src = c.url;
      m.onloadedmetadata = function () {
        c.dur = isFinite(m.duration) ? m.duration : 0; c.w = m.videoWidth; c.h = m.videoHeight;
        m.removeAttribute("src"); m.load();
        if (!c.dur || !c.w) { c.bad = true; note(fmt(t("bad"), { n: c.name })); renderLib(); return; }
        autoFill(true); renderAll(); TQ.push(c); runTQ();
      };
      m.onerror = function () { c.bad = true; note(fmt(t("bad"), { n: c.name })); renderLib(); };
    });
    renderLib();
  }
  var TQ = [], tqBusy = false;
  async function runTQ() {
    if (tqBusy) return; tqBusy = true;
    while (TQ.length) { var c = TQ.shift(); try { await makeThumbs(c); } catch (e) {} if (V) { renderLib(); renderPads(); } }
    tqBusy = false;
  }
  function coverDraw(x, src, sw, sh, w, h) { var k = Math.max(w / sw, h / sh), dw = sw * k, dh = sh * k; x.drawImage(src, (w - dw) / 2, (h - dh) / 2, dw, dh); }
  async function makeThumbs(c) {
    if (!clipById(c.id)) return;
    var v = mkVid(c.url);
    await new Promise(function (res) { v.onloadeddata = res; v.onerror = res; setTimeout(res, 15000); });
    if (!v.videoWidth) return;
    var pc = canvasEl(96, 128); await seekEl(v, Math.min(c.dur * 0.1, 0.6)); coverDraw(pc.getContext("2d"), v, v.videoWidth, v.videoHeight, 96, 128);
    c.poster = pc.toDataURL("image/jpeg", 0.8);
    if (V) { renderLib(); renderPads(); }
    var n = clamp(Math.ceil(c.dur / 2), 4, 24), tiles = [];
    for (var i = 0; i < n; i++) {
      if (!clipById(c.id)) break;
      var tm = Math.min(c.dur - 0.05, (i + 0.5) / n * c.dur);
      await seekEl(v, tm);
      var cv = canvasEl(54, 72); coverDraw(cv.getContext("2d"), v, v.videoWidth, v.videoHeight, 54, 72);
      tiles.push({ t: tm, cv: cv });
    }
    c.tiles = tiles;
    v.removeAttribute("src"); v.load();
  }
  function removeClip(id) {
    if (P.segs.some(function (g) { return g.clip === id; })) { note(t("inUse")); return; }
    var c = clipById(id); if (!c) return;
    var k = slotOf(id); if (k >= 0) P.slots[k] = null;
    releaseS(c); if (c.vT) { c.vT.pause(); c.vT.removeAttribute("src"); c.vT.load(); c.vT = null; }
    var li = tLRU.indexOf(c); if (li >= 0) tLRU.splice(li, 1);
    P.clips.splice(P.clips.indexOf(c), 1); URL.revokeObjectURL(c.url);
    if (P.selClip === id) P.selClip = 0;
    renderAll();
  }

  // ---------- Live-Tasten ----------
  function nextFree(inOrder) {
    for (var i = 0; i < P.clips.length; i++) {
      var c = P.clips[i];
      if (inOrder && !c.dur && !c.bad) return null;            // beim Import auf ältere Clips warten, damit die Reihenfolge stimmt
      if (c.dur && !c.bad && !c.bound && !c.done && slotOf(c.id) < 0) return c;
    }
    return null;
  }
  function assign(k, id) {
    var c = clipById(id); if (!c || !c.dur) return false;
    if (REC && REC.cur && (REC.cur.slot === k || REC.cur.clip === id)) return false;   // laufenden Clip nicht umlegen
    var old = slotOf(id); if (old >= 0 && old !== k) P.slots[old] = null;
    var prev = P.slots[k]; if (prev && prev !== id) releaseS(clipById(prev));
    P.slots[k] = id; c.bound = true;
    if (c.done || !gaps(c).length) { c.pos = 0; c.used = []; c.done = false; }
    c.pre = null; prepS(c); return true;
  }
  function autoFill(quiet) {
    var n = 0;
    KEY_ORDER.forEach(function (k) { if (P.slots[k]) return; var c = nextFree(quiet); if (c && assign(k, c.id)) n++; });
    if (!quiet) note(n ? fmt(t("filled"), { n: n }) : t("noFree"));
    return n;
  }
  function resetCounters() {
    if (REC) return; pushUndo();
    P.clips.forEach(function (c) { c.pos = 0; c.used = []; c.pre = null; c.done = false; c.bound = slotOf(c.id) >= 0; });
    P.slots.forEach(function (id) { if (id) prepS(clipById(id)); });
    note(t("resetDone")); renderAll();
  }

  function setMode(m) {
    P.live.mode = m;
    P.slots.forEach(function (id) { var c = id && clipById(id); if (c) { c.pre = null; prepS(c); } });
    renderSide();
  }
  function liveHit(k) {
    if (V && V.exporting) return;
    var id = P.slots[k];
    if (!id) { flashPad(k, true); note(fmt(t("keyEmpty"), { k: k })); return; }
    if (!PL.on) startPlay(true);
    var now = performance.now(), T = clock(now);
    if (!REC) {
      pushUndo();
      if (PL.el) PL.el.pause();
      PL.seg = null; PL.el = null;
      REC = { t0: T, segs: [], cur: null, pre: 0 };
      P.sel = 0;
    } else closeCur(T);
    openCur(k, T);
    renderPads(); flashPad(k, false); updateBar();
  }
  function openCur(k, T) {
    var c = clipById(P.slots[k]), el = vS(c), g0 = c.pre && gapAt(c, c.pre.s);
    var pk = g0 ? { s: c.pre.s, e: g0[1] } : pickStart(c);
    if (!pk) pk = { s: Math.max(0, c.dur - MINGAP), e: c.dur };
    c.pre = null;
    if (el.readyState >= 1 && Math.abs(el.currentTime - pk.s) > 0.12) el.currentTime = pk.s;
    setVol(el); var pr = el.play(); if (pr) pr.catch(noop);
    var an = P.live.anim === "rand" ? (Math.random() < 0.5 ? "turb" : "judder") : P.live.anim;
    REC.cur = { slot: k, clip: c.id, in: pk.s, end: pk.e, t: T, anim: an, seed: newSeed() };
    REC.pre = 0;
  }
  function closeCur(T) {
    var cur = REC && REC.cur; if (!cur) return;
    var c = clipById(cur.clip), d = Math.min(T - cur.t, cur.end - cur.in);
    if (d > 0.001) { var g = mkSeg(c.id, cur.in, d, cur.anim, cur.slot, cur.seed); REC.segs.push(g); }
    addUsed(c, cur.in, cur.in + Math.max(0, d));
    c.pos = Math.min(c.dur, cur.in + Math.max(0, d));
    REC.cur = null;
    if (c.vS) { c.vS.pause(); prepS(c); }              // schon an die nächste Startstelle spulen
  }
  function curSeg(T) {
    var cur = REC.cur; if (!cur) return null;
    return { id: -1, clip: cur.clip, in: cur.in, dur: Math.max(0.001, T - cur.t), anim: cur.anim, as: P.live.as, ad: P.live.ad, fit: "fill", key: cur.slot, seed: cur.seed, start: 0, live: true };
  }
  function liveTick(T) {
    var cur = REC.cur; if (!cur) return;
    var c = clipById(cur.clip), el = c.vS, rest = cur.end - (cur.in + (T - cur.t));
    if (freeTime(c) - (T - cur.t) < 3 && !REC.pre) { var nf = nextFree(); if (nf) vS(nf); REC.pre = 1; }   // Nachrücker schon mal laden
    if (rest <= 0.03) {
      var tEnd = cur.t + (cur.end - cur.in), k = cur.slot, name = c.name;
      closeCur(tEnd);
      if (gaps(c).length) { openCur(k, tEnd); renderPads(); return; }   // Lücke zu Ende, Clip hat noch Material: dorthin springen
      c.done = true; c.pos = c.dur;
      P.slots[k] = null; releaseS(c);
      var nc = nextFree();
      if (!nc) { note(fmt(t("keyFreed"), { k: k, a: name }) + " " + t("noMore")); stopPlay(tEnd); return; }
      assign(k, nc.id); note(fmt(t("swapped"), { k: k, a: name, b: nc.name }));
      openCur(k, tEnd); renderAll();
      return;
    }
    if (el && el.readyState >= 2 && !el.seeking && !el.paused) {   // Bild an die Uhr binden
      var want = cur.in + (T - cur.t);
      if (Math.abs(el.currentTime - want) > 0.3) el.currentTime = want;
    }
  }
  function cutBefore(list, t0) {
    var out = [];
    list.forEach(function (g) {
      if (g.start + g.dur <= t0 + 1e-6) out.push(copySeg(g));
      else if (g.start < t0 - 1e-6) { var a = copySeg(g); a.dur = t0 - g.start; out.push(a); }
    });
    return out;
  }
  function cutAfter(list, t1) {
    var out = [];
    list.forEach(function (g) {
      if (g.start >= t1 - 1e-6) out.push(copySeg(g));
      else if (g.start + g.dur > t1 + 1e-6) { var b = copySeg(g), cut = t1 - g.start; b.in += cut; b.dur -= cut; b.anim = "none"; b.id = P.nextId++; b.seed = newSeed(); out.push(b); }
    });
    return out;
  }
  function finishRec(T) {
    if (!REC) return;
    closeCur(T);
    var D = REC.segs.reduce(function (s, g) { return s + g.dur; }, 0);
    P.segs = cutBefore(P.segs, REC.t0).concat(REC.segs, cutAfter(P.segs, REC.t0 + D));
    layout();
    var n = REC.segs.length;
    P.T = Math.min(REC.t0 + D, total());
    REC = null;
    P.slots.forEach(function (id) { if (id) prepS(clipById(id)); });
    if (n) note(fmt(t("takeDone"), { n: n, d: sec(D) }));
    renderAll();
  }
  function displaySegs() {
    if (!REC) return P.segs;
    var list = cutBefore(P.segs, REC.t0).concat(REC.segs);
    var cs = curSeg(P.T); if (cs) list.push(cs);
    var D = REC.segs.reduce(function (s, g) { return s + g.dur; }, 0) + (cs ? cs.dur : 0);
    list = list.concat(cutAfter(P.segs, REC.t0 + D).map(function (g) { g.ghost = true; return g; }));
    layoutList(list); return list;
  }

  // ---------- Uhr und Wiedergabe ----------
  function ac() {
    if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; } }
    if (AC && AC.state === "suspended") AC.resume().catch(noop);
    return AC;
  }
  function lat() { return AC ? (AC.outputLatency || 0) + (AC.baseLatency || 0) : 0; }
  function clock(now) {
    if (!PL.on) return P.T;
    if (PL.ac && AC && AC.state === "running") return PL.T0 + Math.max(0, AC.currentTime - PL.acT - lat());
    return PL.T0 + (now - PL.wall) / 1000;
  }
  function startClock(T) {
    PL.T0 = T; PL.wall = performance.now(); PL.seg = null;
    stopMusicSrc();
    var a = ac();
    PL.ac = !!(a && a.state === "running");
    if (a) {
      PL.acT = a.currentTime + 0.03;
      var m = P.music;
      if (m && m.buf && T < m.buf.duration) {
        var s = a.createBufferSource(), g = a.createGain(); s.buffer = m.buf; g.gain.value = P.musicVol;
        s.connect(g); g.connect(a.destination); s.start(PL.acT, T); PL.msrc = s; PL.mgain = g;
      }
      if (!PL.ac) { var tries = 0, chk = function () { if (!PL.on) return; if (a.state === "running") PL.ac = true; else if (tries++ < 40) setTimeout(chk, 25); }; setTimeout(chk, 25); }
    }
  }
  function stopMusicSrc() { if (PL.msrc) { try { PL.msrc.stop(); } catch (e) {} PL.msrc.disconnect(); PL.msrc = null; } }
  function startPlay(live) {
    if (PL.on) return;
    if (!live && P.segs.length && P.T >= total() - 0.02) P.T = 0;
    PL.on = true; PL.el = null;
    startClock(P.T);
    updateBar();
  }
  function pauseAll() {
    P.clips.forEach(function (c) { if (c.vT && !c.vT.paused) c.vT.pause(); if (c.vS && !c.vS.paused) c.vS.pause(); });
  }
  function stopPlay(Tend) {
    if (!PL.on) return;
    var T = Tend != null ? Tend : clock(performance.now());
    fxReleaseAll(T);
    PL.on = false; stopMusicSrc(); pauseAll();
    if (REC) finishRec(T); else P.T = clamp(T, 0, total());
    PL.seg = null; PL.el = null;
    updateBar(); renderPads();
  }
  function togglePlay() { if (PL.on) stopPlay(); else if (P.segs.length) startPlay(); else note(t("stageEmpty")); }
  function seekTo(T) {
    if (REC) return;
    P.T = clamp(T, 0, total());
    if (PL.on) { pauseAll(); startClock(P.T); }
  }
  function timelineTick(T) {
    var s = segAt(T); if (!s) return;
    var c = clipById(s.clip), el = vT(c), want = s.in + (T - s.start);
    if (PL.seg !== s.id) {
      if (PL.el && PL.el !== el) PL.el.pause();
      PL.seg = s.id; PL.el = el;
      if (Math.abs(el.currentTime - want) > 0.06) el.currentTime = want;
      setVol(el); var pr = el.play(); if (pr) pr.catch(noop);
    } else if (el.readyState >= 2 && !el.seeking && Math.abs(el.currentTime - want) > 0.3) el.currentTime = want;
    var i = P.segs.indexOf(s), nx = P.segs[i + 1];
    if (nx && nx.clip !== s.clip && T > nx.start - 1) {                // nächsten Clip vorspulen
      var ne = vT(clipById(nx.clip));
      if (ne.paused && !ne.seeking && ne.readyState >= 1 && Math.abs(ne.currentTime - nx.in) > 0.05) ne.currentTime = nx.in;
    }
  }
  function srcTimeFor(g, tt) { return g.in + (g.anim === "judder" && tt < g.ad ? Math.floor(tt * JF) / JF : tt); }
  function stillTick() {
    var s = segAt(P.T) || (P.segs.length && P.T >= total() - 1e-6 ? P.segs[P.segs.length - 1] : null);
    if (!s) return;
    var el = vT(clipById(s.clip)), want = Math.min(srcTimeFor(s, P.T - s.start), s.in + s.dur - 0.02);
    if (el.readyState >= 1 && !el.seeking && Math.abs(el.currentTime - want) > 0.015) el.currentTime = want;
  }

  // ---------- Animationen ----------
  var NONE = { dx: 0, dy: 0, r: 0, s: 1, g: 0 };
  function animAt(g, tt, W, H) {
    if (!g || g.anim === "none" || tt < 0 || tt >= g.ad) return NONE;
    var p = tt / g.ad, e = (1 - p) * (1 - p), A = g.as, sd = g.seed % 1000, o = { dx: 0, dy: 0, r: 0, s: 1, g: 0 };
    if (g.anim === "turb") {               // weiche, chaotische Kamerabewegung mit Zoom und Bewegungsunschärfe
      o.dx = W * 0.06 * A * e * (Math.sin(tt * 31 + sd) * 0.6 + Math.sin(tt * 53 + sd * 1.7) * 0.4);
      o.dy = H * 0.032 * A * e * (Math.sin(tt * 37 + sd * 2.3) * 0.6 + Math.sin(tt * 61 + sd * 0.9) * 0.4);
      o.r = 0.055 * A * e * Math.sin(tt * 27 + sd * 3.1);
      o.s = 1 + 0.16 * A * e; o.g = Math.min(1, e * A);
    } else if (g.anim === "judder") {      // harte Stöße im 15er-Takt, das Bild stottert dazu im 12er-Takt
      var k = Math.floor(tt * 15);
      o.dx = W * 0.065 * A * e * (rnd(sd, k, 1) * 2 - 1);
      o.dy = H * 0.036 * A * e * (rnd(sd, k, 2) * 2 - 1);
      o.r = 0.04 * A * e * (rnd(sd, k, 3) * 2 - 1);
      o.s = 1 + 0.1 * A * e;
    } else if (g.anim === "punch") {
      o.s = 1 + 0.32 * A * Math.pow(1 - p, 3);
    } else if (g.anim === "shake") {
      o.dx = W * 0.045 * A * e * Math.sin(tt * 70 + sd);
      o.dy = H * 0.012 * A * e * Math.sin(tt * 93 + sd);
    }
    return o;
  }
  function placeImg(x, W, H, src, sw, sh, fit, o) {
    var cover = fit !== "fit";
    var ov = cover ? 1 + Math.max(2 * Math.abs(o.dx) / W, 2 * Math.abs(o.dy) / H) + 1.9 * Math.abs(o.r) : 1;
    var k = cover ? Math.max(W / sw, H / sh) : Math.min(W / sw, H / sh), dw = sw * k, dh = sh * k, sc = o.s * ov;
    x.save(); x.translate(W / 2 + o.dx, H / 2 + o.dy); if (o.r) x.rotate(o.r); x.scale(sc, sc);
    x.drawImage(src, -dw / 2, -dh / 2, dw, dh); x.restore();
  }
  function drawSeg(x, W, H, src, sw, sh, g, tt, hold) {
    var fit = g.fit || "fill";
    if (hold && g.anim === "judder" && tt >= 0 && tt < g.ad) {        // Vorschau: Bild im 12er-Takt festhalten
      var key = g.id + ":" + g.seed + ":" + Math.floor(tt * JF);
      if (hold.cv.width !== W || hold.cv.height !== H) { hold.cv.width = W; hold.cv.height = H; hold.key = ""; }
      if (hold.key !== key) { var hx = hold.cv.getContext("2d"); hx.fillStyle = "#000"; hx.fillRect(0, 0, W, H); placeImg(hx, W, H, src, sw, sh, fit, NONE); hold.key = key; }
      src = hold.cv; sw = W; sh = H; fit = "fill";
    }
    var o = animAt(g, tt, W, H);
    placeImg(x, W, H, src, sw, sh, fit, o);
    if (o.g > 0.02) {
      x.globalAlpha = 0.32 * o.g; placeImg(x, W, H, src, sw, sh, fit, animAt(g, tt - 1 / 60, W, H));
      x.globalAlpha = 0.18 * o.g; placeImg(x, W, H, src, sw, sh, fit, animAt(g, tt - 2 / 60, W, H));
      x.globalAlpha = 1;
    }
  }


  // ---------- GPU-Effekte (WebGL, seit v0.3) ----------
  // Dimension und Splitter rechnen als Shader: Jeder Bildpunkt des fertigen Bildes holt sich seine Farbe genau einmal aus dem
  // aktuellen Bild. Es wird nichts verkleinert kopiert, die Kosten hängen nur von der Bildschirm- bzw. Export-Auflösung ab.
  // Eine gemeinsame WebGL-Leinwand, die nur wächst (Vorschau und Export wechseln sich so nicht ständig mit Neuanlegen ab).
  var GLX = null;
  var GLSL_HEAD = "precision highp float;uniform sampler2D u_tex;uniform vec2 u_res;uniform float u_t;uniform float u_seed;" +
    "float hash(vec2 p,float s){vec3 p3=fract(vec3(p.xyx+s*0.61803)*vec3(.1031,.1030,.0973));p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}" +
    "float vnoise(vec2 p,float s){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i,s),hash(i+vec2(1.,0.),s),f.x),mix(hash(i+vec2(0.,1.),s),hash(i+vec2(1.,1.),s),f.x),f.y);}" +
    "float fbm(vec2 p,float s,int oct){float t=0.,a=.5,n=0.;for(int i=0;i<4;i++){if(i>=oct)break;t+=a*vnoise(p,s+float(i)*17.);n+=a;p*=2.;a*=.5;}return t/n;}" +
    "vec2 mr(vec2 u){return 1.-abs(1.-mod(u,2.));}" +
    "vec4 px(vec2 q){return texture2D(u_tex,mr(q/u_res));}" +
    "vec2 P0(){return vec2(gl_FragCoord.x,u_res.y-gl_FragCoord.y);}";
  // Dimension = Polymerge aus Pixellab (Form aus Collage-Teilen), zusätzlich bewegen und verformen sich Form und Teile organisch
  var GLSL_DIM = GLSL_HEAD + "uniform float u_mode,u_p,u_Rs,u_cs,u_src,u_ell,u_n,u_swirl,u_warp,u_wf,u_vein,u_ns,u_cseed,u_mv;uniform vec2 u_C,u_rot,u_fxy;" +
    "float sdTri(vec2 p,float r){float k=sqrt(3.);p.y=-p.y;p.x=abs(p.x)-r;p.y=p.y+r/k;if(p.x+k*p.y>0.)p=vec2(p.x-k*p.y,-k*p.x-p.y)/2.;p.x-=clamp(p.x,-2.*r,0.);return -length(p)*sign(p.y);}" +
    "void main(){vec2 P=P0();vec4 base=texture2D(u_tex,P/u_res);float tm=u_t*(.35+u_mv*1.1),mv=u_mv;" +
    "float Rs=u_Rs*(1.+.07*mv*sin(tm*1.3));vec2 e=P-u_C-vec2(sin(tm*.41),cos(tm*.37))*Rs*.06*mv;" +
    "float dx=e.x*u_rot.x+e.y*u_rot.y,dy=(-e.x*u_rot.y+e.y*u_rot.x)*u_ell;vec2 w=vec2(dx,dy),dr=vec2(tm*.23,-tm*.19)*mv;" +
    "float wp=u_warp+.12*mv;if(wp>0.){w.x+=wp*Rs*(fbm(vec2(dx,dy)/Rs*u_wf+vec2(3.1,0.)+dr,u_ns,3)-.5)*2.;w.y+=wp*Rs*(fbm(vec2(dx,dy)/Rs*u_wf+vec2(0.,7.7)-dr,u_ns+3.,3)-.5)*2.;}" +
    "float sd;vec2 q=w;" +
    "if(u_mode<.5)sd=length(w)-Rs;else if(u_mode<1.5)sd=sdTri(w,Rs*.86);" +
    "else if(u_mode<2.5){vec2 uv=w/Rs+dr*.5;float r1=1.-abs(2.*fbm(vec2(uv.x*u_fxy.x*(1.+u_p)+11.,uv.y*u_fxy.y*(1.+u_p)),u_ns+21.,4)-1.);" +
    "float r2=1.-abs(2.*fbm(vec2(uv.x*u_fxy.x*2.3+5.,uv.y*u_fxy.y*2.3+2.),u_ns+37.,3)-1.);float val=max(r1,r2*(.86+u_p*.08))-length(vec2(w.x,w.y*.8))/Rs*.3;sd=(u_vein-val)*Rs*.35;}" +
    "else{float nv=fbm(w/Rs*(1.4+u_p*1.6)+dr*.5,u_ns,4)-length(w)/Rs*.5;sd=(.16-nv)*Rs*.6;}" +
    "if(sd>1.2){gl_FragColor=base;return;}" +
    "if(u_mode<1.5){float r=length(w),sec=6.2831853/(u_mode<.5?u_n:3.),a=atan(w.y,w.x)+(u_swirl+.5*mv*sin(tm*.7))*r/Rs;a=mod(a,sec);a=abs(a-sec/2.);q=r*vec2(cos(a),sin(a));}" +
    "vec2 gc=floor(q/u_cs);float d1=1e30;vec2 b=vec2(0.),bi=vec2(0.);" +
    "for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){vec2 g=gc+vec2(float(i),float(j));float h1=hash(g,u_cseed),h2=hash(g,u_cseed+1.);" +
    "vec2 sp=(g+.5+(vec2(h1,h2)-.5)*.85+.28*mv*vec2(sin(tm*1.3+h1*6.28),cos(tm*1.1+h2*6.28)))*u_cs;vec2 dd=q-sp;float d=dot(dd,dd);if(d<d1){d1=d;b=sp;bi=g;}}" +
    "float an=(hash(bi,u_cseed+3.)*2.-1.)*3.14159*(.4+u_p*.6)+.25*mv*sin(tm*.9+hash(bi,u_cseed+8.)*6.28),cA=cos(an),sA=sin(an);" +
    "float mir=hash(bi,u_cseed+4.)<.5?-1.:1.,scl=1.+(hash(bi,u_cseed+7.)-.5)*u_p*1.4;vec2 l=q-b;vec2 uv2=vec2((l.x*cA-l.y*sA)*mir,l.x*sA+l.y*cA)*scl;" +
    "vec2 of=(vec2(hash(bi,u_cseed+5.),hash(bi,u_cseed+6.))-.5)*u_src*(.3+u_p);vec4 col=px(u_res*.5+of+uv2*(u_src/u_cs));" +
    "gl_FragColor=mix(base,col,clamp(.5-sd/1.2,0.,1.));}";
  // Splitter = Fragments aus Pixellab, aber mit Dynamik: ein Quadtree teilt große Zellen zufällig in immer kleinere,
  // darin Voronoi-Splitter. Viele kleine, wenige große. Jedes Teil zeigt eine gedrehte, gespiegelte Kopie des Bildausschnitts.
  // Splitter = Fragments aus Pixellab, aber mit Dynamik: grobe Voronoi-Splitter, von denen ein Teil zufällig in feinere zerfällt
  // (bis zu vier Stufen). Alle Kanten bleiben Scherbenkanten, viele kleine, wenige große. Jedes Teil zeigt eine gedrehte,
  // gespiegelte Kopie des Bildausschnitts.
  var GLSL_SPL = GLSL_HEAD + "uniform float u_S0,u_split,u_src,u_rot,u_sc,u_seam,u_mir,u_mv;" +
    "void vor(vec2 P,float s,float ks,out vec2 b,out vec2 bi,out float e){vec2 gc=floor(P/s);float d1=1e30,d2=1e30;b=vec2(0.);bi=vec2(0.);" +
    "for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){vec2 g=gc+vec2(float(i),float(j));vec2 sp=(g+.5+(vec2(hash(g,ks),hash(g,ks+1.))-.5)*.9)*s;vec2 dd=P-sp;float d=dot(dd,dd);" +
    "if(d<d1){d2=d1;d1=d;b=sp;bi=g;}else if(d<d2)d2=d;}e=sqrt(d2)-sqrt(d1);}" +
    "void main(){vec2 P=P0();float s=u_S0,ks=u_seed,em=1e30,e;vec2 b,bi;" +
    "for(int L=0;L<4;L++){ks=u_seed+float(L)*31.;vor(P,s,ks,b,bi,e);em=min(em,e);if(L<3&&hash(bi,ks+11.)<u_split*(L==0?.9:1.)){s*=.42;}else break;}" +
    "float tm=u_t*(.4+u_mv),a=(hash(bi,ks+3.)*2.-1.)*3.14159*u_rot+.3*u_mv*sin(tm+hash(bi,ks+9.)*6.28),cA=cos(a),sA=sin(a);" +
    "float m=(u_mir>.5&&hash(bi,ks+4.)<.5)?-1.:1.;vec2 l=P-b;vec2 uv=vec2((l.x*cA-l.y*sA)*m,l.x*sA+l.y*cA);" +
    "vec2 of=(vec2(hash(bi,ks+5.),hash(bi,ks+6.))-.5)*u_sc*u_src*1.5+u_mv*u_src*.12*vec2(sin(tm*.8+hash(bi,ks+7.)*6.28),cos(tm*.7+hash(bi,ks+8.)*6.28));" +
    "vec4 col=px(u_res*.5+of+uv*(u_src/s));" +
    "if(u_seam>0.&&em<u_seam){float k=1.-em/u_seam;col.rgb*=1.-k*k*.85;}" +
    "gl_FragColor=vec4(col.rgb,1.);}";
  function glGet() {
    if (GLX) return GLX.ok ? GLX : null;
    GLX = { ok: false, prog: {} };
    try {
      var cv = document.createElement("canvas"); cv.width = cv.height = 2;
      var gl = cv.getContext("webgl", { premultipliedAlpha: false, alpha: false, antialias: false, preserveDrawingBuffer: true });
      if (!gl) return null;
      var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      var tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      GLX = { ok: true, cv: cv, gl: gl, tex: tex, buf: buf, prog: {} };
      cv.addEventListener("webglcontextlost", function (e) { e.preventDefault(); GLX = null; });
      return GLX;
    } catch (e) { return null; }
  }
  function glProg(G, key, fsrc) {
    if (G.prog[key]) return G.prog[key];
    var gl = G.gl, sh = function (type, src) { var o = gl.createShader(type); gl.shaderSource(o, src); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
    var pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}")); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fsrc));
    gl.linkProgram(pr); if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
    var o = { pr: pr, a: gl.getAttribLocation(pr, "a"), u: {} };
    G.prog[key] = o; return o;
  }
  // Bild von x durch den Shader schicken und das Ergebnis zurück auf x zeichnen
  function glFx(x, W, H, key, fsrc, uni) {
    var G = glGet(); if (!G) return;
    var gl = G.gl, P2;
    try { P2 = glProg(G, key, fsrc); } catch (e) { if (window.console) console.warn("SkapeForm-Effekt", key, e); G.prog[key] = null; return; }
    if (G.cv.width < W || G.cv.height < H) { G.cv.width = Math.max(G.cv.width, W); G.cv.height = Math.max(G.cv.height, H); }
    gl.viewport(0, 0, W, H); gl.useProgram(P2.pr);
    gl.bindTexture(gl.TEXTURE_2D, G.tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, x.canvas);
    var U = function (n) { if (!(n in P2.u)) P2.u[n] = gl.getUniformLocation(P2.pr, n); return P2.u[n]; };
    gl.uniform1i(U("u_tex"), 0); gl.uniform2f(U("u_res"), W, H);
    Object.keys(uni).forEach(function (n) { var v = uni[n], l = U(n); if (!l) return; if (v.length === 2) gl.uniform2f(l, v[0], v[1]); else gl.uniform1f(l, v); });
    gl.bindBuffer(gl.ARRAY_BUFFER, G.buf);
    gl.enableVertexAttribArray(P2.a); gl.vertexAttribPointer(P2.a, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = "source-over";
    x.drawImage(G.cv, 0, G.cv.height - H, W, H, 0, 0, W, H); x.restore();
  }
  function rngS(seed) { var a = seed >>> 0 || 1; return function () { a = (a + 0x6D2B79F5) >>> 0; var t2 = a; t2 = Math.imul(t2 ^ (t2 >>> 15), t2 | 1); t2 ^= t2 + Math.imul(t2 ^ (t2 >>> 7), t2 | 61); return ((t2 ^ (t2 >>> 14)) >>> 0) / 4294967296; }; }

  // ---------- Effekte (Buchstaben halten) ----------
  // Ein neuer Effekt = ein Eintrag in FXDEF und seine Kennung in FX_ORDER (Reihenfolge der Spuren und der Anwendung).
  // draw(x, W, H, o) malt über das fertige Bild; o = { t: Sekunden seit Effektbeginn, d: Effektlänge, T: Timeline-Zeit }.
  // Alles andere (Taste, Aufnahme beim Halten, eigene Spur, Schneiden/Verschieben, Vorschau, Export, Rückgängig) läuft automatisch.
  // set: Regler rechts im Panel (k, l, min, max, u; type "seg" mit opts, type "check"), Werte in P.fxSet[typ]. o.seed: Zufall je Tastendruck.
  var FXDEF = {
    neg: {
      name: L2("Negativ", "Negative"), color: "#9B86F2", key: "KeyQ",
      draw: function (x, W, H) { x.save(); x.globalCompositeOperation = "difference"; x.fillStyle = "#fff"; x.fillRect(0, 0, W, H); x.restore(); }
    },
    dim: {
      name: L2("Dimension", "Dimension"), color: "#4FC3A1", key: "KeyW",
      set: [{ k: "mode", type: "seg", l: L2("Form", "Shape"), opts: [["circle", L2("Kreis", "Circle")], ["tri", L2("Dreieck", "Triangle")], ["roots", L2("Wurzeln", "Roots")], ["noise", L2("Fleck", "Blot")]] },
        { k: "punch", l: L2("Punch", "Punch"), min: 0, max: 100, u: " %" }, { k: "shape", l: L2("Größe der Form", "Shape size"), min: 10, max: 100, u: " %" },
        { k: "cell", l: L2("Größe der Teile", "Piece size"), min: 3, max: 40, u: " %" }, { k: "src", l: L2("Größe des Ausschnitts", "Section size"), min: 5, max: 100, u: " %" },
        { k: "move", l: L2("Bewegung", "Motion"), min: 0, max: 100, u: " %" }],
      def: { mode: "circle", punch: 35, shape: 70, cell: 14, src: 25, move: 50 },
      draw: function (x, W, H, o) {
        var S2 = fxSet("dim"), p = S2.punch / 100, mn = Math.min(W, H), Rs = mn / 2 * S2.shape / 100, R = rngS((o.seed || 1) * 977 + 13);
        var C = [W / 2 + (R() - 0.5) * p * 0.5 * Rs, H / 2 + (R() - 0.5) * p * 0.5 * Rs], rot = (R() - 0.5) * 2 * Math.PI * p, ell = 1 + (R() - 0.5) * p * 0.9;
        var n = Math.max(3, Math.round(5 + R() * (1 + p * 14))), swirl = (R() - 0.5) * 2 * p * 2.6, wf = 1.2 + R() * 1.6, fx = 1.2 + R() * 1.4, fy = 0.5 + R() * 0.6;
        glFx(x, W, H, "dim", GLSL_DIM, { u_t: o.t, u_seed: o.seed % 9973, u_mode: ["circle", "tri", "roots", "noise"].indexOf(S2.mode), u_p: p, u_Rs: Rs, u_cs: Rs * S2.cell / 100 * 1.4,
          u_src: mn * S2.src / 100, u_C: C, u_rot: [Math.cos(rot), Math.sin(rot)], u_ell: ell, u_n: n, u_swirl: swirl, u_warp: p * 0.55, u_wf: wf, u_fxy: [fx, fy],
          u_vein: 0.76 - p * 0.12, u_ns: ((o.seed || 1) * 101 + 7) % 9973, u_cseed: ((o.seed || 1) * 31 + 5) % 9973, u_mv: S2.move / 100 });
      }
    },
    split: {
      name: L2("Splitter", "Splitter"), color: "#E8A04A", key: "KeyE",
      set: [{ k: "size", l: L2("Größte Splitter", "Largest shards"), min: 10, max: 80, u: " %" }, { k: "dyn", l: L2("Dynamik (viele kleine)", "Dynamics (many small)"), min: 0, max: 100, u: " %" },
        { k: "src", l: L2("Größe des Ausschnitts", "Section size"), min: 10, max: 100, u: " %" }, { k: "rot", l: L2("Drehung", "Rotation"), min: 0, max: 100, u: " %" },
        { k: "scatter", l: L2("Streuung", "Scatter"), min: 0, max: 100, u: " %" }, { k: "seam", l: L2("Fugen", "Seams"), min: 0, max: 20, u: "" },
        { k: "move", l: L2("Bewegung", "Motion"), min: 0, max: 100, u: " %" }, { k: "mirror", type: "check", l: L2("Spiegeln wie im Kaleidoskop", "Mirror like a kaleidoscope") }],
      def: { size: 40, dyn: 70, src: 60, rot: 100, scatter: 40, seam: 2, move: 25, mirror: true },
      draw: function (x, W, H, o) {
        var S2 = fxSet("split"), mx = Math.max(W, H);
        glFx(x, W, H, "split", GLSL_SPL, { u_t: o.t, u_seed: (o.seed || 1) % 9973, u_S0: mx * S2.size / 100, u_split: S2.dyn / 100 * 0.8, u_src: Math.min(W, H) * S2.src / 100,
          u_rot: S2.rot / 100, u_sc: S2.scatter / 100, u_seam: S2.seam * mx / 1000, u_mir: S2.mirror ? 1 : 0, u_mv: S2.move / 100 });
      }
    }
  };
  function fxSet(ty) { var d = FXDEF[ty]; if (!P.fxSet[ty]) P.fxSet[ty] = Object.assign({}, d.def || {}); return P.fxSet[ty]; }
  var FX_ORDER = ["neg", "dim", "split"], FX_RESERVED = ["KeyS"], FX_MIN = 1 / 30;
  FX_ORDER.forEach(function (ty) { if (!P.fxKeys[ty]) P.fxKeys[ty] = FXDEF[ty].key; });
  function fxById(id) { for (var i = 0; i < P.fx.length; i++) if (P.fx[i].id === id) return P.fx[i]; return null; }
  function keyLabel(code) { return code ? code.replace(/^Key/, "") : "–"; }
  function fxTypeForCode(code) { for (var i = 0; i < FX_ORDER.length; i++) if (P.fxKeys[FX_ORDER[i]] === code) return FX_ORDER[i]; return null; }
  function fxActive(T, noPeek) {
    var out = [];
    FX_ORDER.forEach(function (ty) {
      // gehaltener Effekt gilt immer als aktiv (sonst flackert er, weil seine Länge erst nach dem Zeichnen nachwächst)
      var held = !noPeek && V && V.fxHeld[ty] ? fxById(V.fxHeld[ty]) : null;
      if (held) { out.push({ type: ty, t: Math.max(0, T - held.start), d: held.dur, seed: held.seed || held.id }); return; }
      for (var i = 0; i < P.fx.length; i++) { var f = P.fx[i]; if (f.type === ty && T >= f.start && T < f.start + f.dur) { out.push({ type: ty, t: T - f.start, d: f.dur, seed: f.seed || f.id }); return; } }
      if (!noPeek && V && V.fxPeek[ty]) out.push({ type: ty, t: (performance.now() - V.fxPeek[ty]) / 1000, d: 0, seed: V.fxPeekSeed[ty] || 1 });
    });
    return out;
  }
  function drawFx(x, W, H, list, T) { list.forEach(function (a) { FXDEF[a.type].draw(x, W, H, { t: a.t, d: a.d, T: T, seed: a.seed || 1 }); }); }
  function mergeFx(ty) {                              // gleiche Effekte, die sich überlappen oder berühren, zu einem Stück zusammenfassen
    var mine = P.fx.filter(function (f) { return f.type === ty; }).sort(function (a, b) { return a.start - b.start; }), keep = [];
    mine.forEach(function (f) {
      var l = keep[keep.length - 1];
      if (l && f.start <= l.start + l.dur + 0.01) { var e = Math.max(l.start + l.dur, f.start + f.dur); l.dur = e - l.start; if (P.selFx === f.id) P.selFx = l.id; }
      else keep.push(f);
    });
    P.fx = P.fx.filter(function (f) { return f.type !== ty; }).concat(keep);
  }
  function fxPress(ty) {
    if (V.fxHeld[ty] || V.fxPeek[ty]) return;
    if (!PL.on) { V.fxPeek[ty] = performance.now(); V.fxPeekSeed[ty] = newSeed(); renderFx(); return; }   // im Stillstand nur Vorschau, keine Aufnahme
    if (!REC) pushUndo();                             // im Live-Schnitt gehört der Effekt zum Take (ein Rückgängig für alles)
    var f = { id: P.nextId++, type: ty, start: clock(performance.now()), dur: FX_MIN, seed: newSeed() };   // jeder Druck: neue Zufallsanordnung
    P.fx.push(f); V.fxHeld[ty] = f.id; renderFx(); updateBar();
  }
  function fxEnd(ty, T) {
    var id = V.fxHeld[ty]; delete V.fxHeld[ty];
    var f = id && fxById(id); if (f) { f.dur = Math.max(FX_MIN, T - f.start); mergeFx(ty); }
  }
  function fxRelease(ty) {
    if (!V) return;
    if (V.fxPeek[ty]) delete V.fxPeek[ty];
    if (V.fxHeld[ty]) fxEnd(ty, PL.on ? clock(performance.now()) : P.T);
    renderFx(); updateBar();
  }
  function fxReleaseAll(T) {
    if (!V) return;
    Object.keys(V.fxHeld).forEach(function (ty) { fxEnd(ty, T); });
    V.fxPeek = {}; renderFx();
  }
  function fxTick(T) { Object.keys(V.fxHeld).forEach(function (ty) { var f = fxById(V.fxHeld[ty]); if (f) f.dur = Math.max(FX_MIN, T - f.start); }); }
  function fxSetKey(ty, code) {
    FX_ORDER.forEach(function (o) { if (o !== ty && P.fxKeys[o] === code) P.fxKeys[o] = ""; });   // Buchstabe kann nur einen Effekt haben
    P.fxKeys[ty] = code;
  }

  // ---------- Timeline-Bearbeitung ----------
  function selSeg() { return P.sel ? segById(P.sel) : null; }
  function splitAt() {
    if (REC) return;
    var ef = P.selFx && fxById(P.selFx);
    if (ef) {                                          // ausgewählten Effekt am Abspielkopf teilen
      if (P.T - ef.start < FX_MIN || ef.start + ef.dur - P.T < FX_MIN) return;
      pushUndo(); var nf = { id: P.nextId++, type: ef.type, start: P.T, dur: ef.start + ef.dur - P.T, seed: ef.seed || ef.id };
      ef.dur = P.T - ef.start; P.fx.push(nf); P.selFx = nf.id; updateBar(); return;
    }
    var s = segAt(P.T); if (!s) return;
    var d1 = P.T - s.start; if (d1 < MIN / 2 || s.dur - d1 < MIN / 2) return;
    pushUndo();
    var b = copySeg(s); b.id = P.nextId++; b.in = s.in + d1; b.dur = s.dur - d1; b.anim = "none"; b.seed = newSeed();
    s.dur = d1; P.segs.splice(P.segs.indexOf(s) + 1, 0, b); layout(); P.sel = b.id; renderAll();
  }
  function delSel() {
    if (REC) return;
    var ef = P.selFx && fxById(P.selFx);
    if (ef) { pushUndo(); P.fx.splice(P.fx.indexOf(ef), 1); P.selFx = 0; updateBar(); return; }
    var s = selSeg(); if (!s) return;
    pushUndo(); P.segs.splice(P.segs.indexOf(s), 1); layout(); P.sel = 0; P.T = Math.min(P.T, total()); renderAll();
  }
  function insertClip(id, idx) {
    var c = clipById(id); if (!c || !c.dur || REC) return;
    pushUndo();
    var g = mkSeg(id, 0, c.dur, "none", -1); idx = idx == null ? P.segs.length : clamp(idx, 0, P.segs.length);
    P.segs.splice(idx, 0, g); layout(); P.sel = g.id; renderAll();
  }
  function setSelProp(k, v, all) {
    var s = selSeg(); if (!s && !all) return;
    (all ? P.segs : [s]).forEach(function (g) { g[k] = v; });
    updateBar();
  }

  // ---------- Export ----------
  var cancelReq = false;
  function loadMuxer() {
    if (window.Mp4Muxer) return Promise.resolve();
    return new Promise(function (res, rej) { var s = document.createElement("script"); s.src = "mp4-muxer.js"; s.onload = res; s.onerror = function () { rej(new Error("mp4-muxer.js")); }; document.head.appendChild(s); });
  }
  async function pickVideoCodec(fps) {
    var br = fps > 30 ? 30e6 : 20e6;
    var list = [["avc1.64002a", 62.5e6], ["avc1.4d002a", 50e6], ["avc1.42e02a", 50e6], ["avc1.640028", 25e6], ["avc1.4d0028", 20e6], ["avc1.42e028", 20e6]];
    for (var i = 0; i < list.length; i++) {
      var cfg = { codec: list[i][0], width: OW, height: OH, bitrate: Math.min(br, list[i][1]), bitrateMode: "variable", framerate: fps, latencyMode: "quality", avc: { format: "avc" } };
      try { var r = await VideoEncoder.isConfigSupported(cfg); if (r.supported) return cfg; } catch (e) {}
    }
    return null;
  }
  async function pickAudio() {
    var opts = [["mp4a.40.2", "aac", 192000], ["opus", "opus", 160000]];
    for (var i = 0; i < opts.length; i++) {
      var cfg = { codec: opts[i][0], sampleRate: 48000, numberOfChannels: 2, bitrate: opts[i][2] };
      try { if (typeof AudioEncoder !== "undefined" && (await AudioEncoder.isConfigSupported(cfg)).supported) return { cfg: cfg, mux: opts[i][1] }; } catch (e) {}
    }
    return null;
  }
  async function mixAudio(D) {
    var SR = 48000, ctx = new OfflineAudioContext(2, Math.max(1, Math.ceil(D * SR)), SR), any = false, bufs = {};
    if (P.clipVol > 0) {
      for (var i = 0; i < P.segs.length; i++) {
        var g = P.segs[i], c = clipById(g.clip);
        if (!(c.id in bufs)) { try { bufs[c.id] = await ctx.decodeAudioData(await c.file.arrayBuffer()); } catch (e) { bufs[c.id] = null; } }
        var b = bufs[c.id]; if (!b || g.in >= b.duration) continue;
        var s = ctx.createBufferSource(), gn = ctx.createGain(), a = g.start, e2 = g.start + g.dur, f = Math.min(0.004, g.dur / 4);
        s.buffer = b; gn.gain.setValueAtTime(0, a); gn.gain.linearRampToValueAtTime(P.clipVol, a + f);
        gn.gain.setValueAtTime(P.clipVol, Math.max(a + f, e2 - f)); gn.gain.linearRampToValueAtTime(0, e2);
        s.connect(gn); gn.connect(ctx.destination); s.start(a, g.in, g.dur); any = true;
      }
    }
    var m = P.music;
    if (m && m.buf && P.musicVol > 0) {
      var ms = ctx.createBufferSource(), mg = ctx.createGain(); ms.buffer = m.buf; mg.gain.value = P.musicVol;
      ms.connect(mg); mg.connect(ctx.destination); ms.start(0, 0, Math.min(D, m.buf.duration)); any = true;
    }
    return any ? await ctx.startRendering() : null;
  }
  async function doExport(fps) {
    if (!V || V.exporting) return;
    var D = total(); if (!D) { expNote(t("nothing")); return; }
    if (typeof VideoEncoder === "undefined" || typeof VideoFrame === "undefined") { expNote(t("noSupport")); return; }
    stopPlay(); V.exporting = true; cancelReq = false; renderModal();
    var extra = [], evs = {};
    try {
      await loadMuxer();
      var vcfg = await pickVideoCodec(fps); if (!vcfg) { expNote(t("noSupport")); return; }
      expNote(t("audio"));
      var audio = await mixAudio(D), acfg = audio ? await pickAudio() : null;
      if (!audio || !acfg) { audio = null; if (P.clipVol > 0 || P.music) extra.push(t("noAudio")); }
      else if (acfg.mux === "opus") extra.push(t("opusNote"));
      var target = new Mp4Muxer.ArrayBufferTarget();
      var muxer = new Mp4Muxer.Muxer({ target: target, video: { codec: "avc", width: OW, height: OH, frameRate: fps },
        audio: audio ? { codec: acfg.mux, sampleRate: 48000, numberOfChannels: 2 } : undefined, fastStart: "in-memory", firstTimestampBehavior: "offset" });
      var encErr = null;
      var venc = new VideoEncoder({ output: function (c, m) { muxer.addVideoChunk(c, m); }, error: function (e) { encErr = e; } });
      venc.configure(vcfg);
      var cv = canvasEl(OW, OH), x = cv.getContext("2d"); x.imageSmoothingQuality = "high";
      var n = Math.max(1, Math.round(D * fps)), us = 1e6 / fps, order = [];
      for (var i = 0; i < n; i++) {
        if (cancelReq || encErr || !V) break;
        var T = Math.min(i / fps, D - 1e-4), g = segAt(T) || P.segs[P.segs.length - 1], c = clipById(g.clip), tt = T - g.start;
        var ev = evs[c.id];
        if (!ev) {
          ev = mkVid(c.url); evs[c.id] = ev; order.push(c.id);
          await new Promise(function (res) { ev.onloadeddata = res; ev.onerror = res; setTimeout(res, 15000); });
          while (order.length > 4) { var oid = order.shift(); evs[oid].removeAttribute("src"); evs[oid].load(); delete evs[oid]; }
        }
        var st = Math.min(srcTimeFor(g, tt) + 0.5 / fps, Math.max(0, c.dur - 0.01));
        if (Math.abs(ev.currentTime - st) > 1e-4 || ev.readyState < 2) await seekEl(ev, st);
        x.fillStyle = "#000"; x.fillRect(0, 0, OW, OH);
        if (ev.videoWidth) drawSeg(x, OW, OH, ev, ev.videoWidth, ev.videoHeight, g, tt, null);
        drawFx(x, OW, OH, fxActive(T, true), T);
        var vf = new VideoFrame(cv, { timestamp: Math.round(i * us), duration: Math.round(us) });
        venc.encode(vf, { keyFrame: i % fps === 0 }); vf.close();
        while (venc.encodeQueueSize > 6) await new Promise(function (r2) { setTimeout(r2, 4); });
        if (i % 5 === 0) expNote(fmt(t("working"), { i: i + 1, n: n, p: Math.round(i / n * 100) }));
      }
      if (encErr) throw encErr;
      if (cancelReq || !V) { venc.close(); expNote(t("cancelled")); return; }
      await venc.flush(); venc.close();
      if (audio) {
        var aenc = new AudioEncoder({ output: function (c2, m2) { muxer.addAudioChunk(c2, m2); }, error: function (e) { encErr = e; } });
        aenc.configure(acfg.cfg);
        var len = Math.min(audio.length, Math.round(D * 48000)), L = audio.getChannelData(0), R = audio.getChannelData(1);
        for (var s = 0; s < len; s += 1024) {
          var k = Math.min(1024, len - s), buf = new Float32Array(k * 2); buf.set(L.subarray(s, s + k), 0); buf.set(R.subarray(s, s + k), k);
          var ad = new AudioData({ format: "f32-planar", sampleRate: 48000, numberOfFrames: k, numberOfChannels: 2, timestamp: Math.round(s / 48000 * 1e6), data: buf });
          aenc.encode(ad); ad.close();
          if (aenc.encodeQueueSize > 50) await new Promise(function (r3) { setTimeout(r3, 2); });
        }
        await aenc.flush(); aenc.close();
        if (encErr) throw encErr;
      }
      muxer.finalize();
      var blob = new Blob([target.buffer], { type: "video/mp4" }), url = URL.createObjectURL(blob), a = document.createElement("a");
      var d = new Date(), p2 = function (v) { return String(v).padStart(2, "0"); };
      a.href = url; a.download = "skapeform-" + d.getFullYear() + p2(d.getMonth() + 1) + p2(d.getDate()) + "-" + p2(d.getHours()) + p2(d.getMinutes()) + ".mp4";
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 20000);
      if (V) V.lastExport = blob.size;
      expNote([fmt(t("done"), { mb: (blob.size / 1048576).toFixed(1).replace(".", lang === "de" ? "," : ".") })].concat(extra).join(" "));
    } catch (e) {
      expNote(fmt(t("failed"), { e: (e && e.message) || e }));
    } finally {
      Object.keys(evs).forEach(function (k2) { evs[k2].removeAttribute("src"); evs[k2].load(); });
      if (V) { V.exporting = false; renderModal(true); }
    }
  }

  // ---------- Musik ----------
  async function loadMusic(f) {
    var m = { name: f.name.replace(/\.[^.]+$/, ""), file: f, buf: null, peaks: null };
    try {
      var a = ac() || new OfflineAudioContext(2, 48000, 48000);
      m.buf = await a.decodeAudioData(await f.arrayBuffer());
    } catch (e) { note(t("musicBad")); return; }
    var ch = m.buf.getChannelData(0), per = Math.max(1, Math.floor(m.buf.sampleRate / 100)), n = Math.ceil(ch.length / per), pk = new Float32Array(n);
    for (var i = 0; i < n; i++) { var mx = 0, e = Math.min(ch.length, (i + 1) * per); for (var j = i * per; j < e; j += 4) { var v = Math.abs(ch[j]); if (v > mx) mx = v; } pk[i] = mx; }
    m.peaks = pk;
    if (PL.on) stopPlay();
    P.music = m; renderSide(); drawTL();
  }

  // ---------- Oberfläche ----------
  var CSS = ".sf{--sfbg:#1C1D1C;--sfp:#242524;--sfl:#3A3C3A;--sfi:#ECEAE5;--sfs:#9C9E99;--sfa:#E2621B;--sfr:#E0412F;position:fixed;inset:0;z-index:75;background:var(--sfbg);color:var(--sfi);font-family:var(--f-body,system-ui,sans-serif);font-size:14px;display:grid;" +
      "grid-template-columns:250px minmax(0,1fr) 300px;grid-template-rows:46px minmax(0,1fr) auto;grid-template-areas:'top top top' 'lib stage side' 'bot bot side';-webkit-user-select:none;user-select:none;font-style:normal}" +
    ".sf *{box-sizing:border-box;border-radius:0;font-style:normal}.sf [hidden]{display:none!important}.sf-sc{display:contents}" +
    ".sf button,.sf select{font:600 13px var(--f-body,system-ui,sans-serif);color:var(--sfi);background:#2E302E;border:1px solid var(--sfl);padding:6px 11px;cursor:pointer}" +
    ".sf button:hover,.sf select:hover{background:#383A38}.sf button:disabled{opacity:.4;cursor:default}" +
    ".sf button.pri{background:var(--sfa);border-color:var(--sfa);color:#fff}.sf button.pri:hover{background:#F07230}" +
    ".sf h3{margin:0 0 8px;font:600 11px/1 var(--f-body,system-ui,sans-serif);letter-spacing:.14em;text-transform:uppercase;color:var(--sfs)}" +
    ".sf-top{grid-area:top;display:flex;align-items:center;gap:14px;padding:0 12px;border-bottom:1px solid var(--sfl);background:#191A19}" +
    ".sf-back{color:var(--sfs);text-decoration:none;font-weight:600}.sf-back:hover{color:var(--sfi)}" +
    ".sf-title{font:700 16px var(--f-display,var(--f-body,sans-serif));letter-spacing:.02em}.sf-title span{margin-left:8px;padding:1px 6px;border:1px solid var(--sfl);font:600 11px var(--f-body,sans-serif);color:var(--sfs)}" +
    ".sf-note{flex:1;min-width:0;color:#E3B83F;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:13px}" +
    ".sf-tb{display:flex;gap:6px}.sf-rat{display:flex;margin-right:6px}.sf-rat button+button{border-left:0}" +
    ".sf-lib{grid-area:lib;border-right:1px solid var(--sfl);display:flex;flex-direction:column;min-height:0;padding:12px 0 0}" +
    ".sf-lib h3{padding:0 12px}.sf-list{flex:1;overflow-y:auto;padding:0 8px 12px;scrollbar-width:thin}" +
    ".sf-lib.over{outline:2px dashed #E3B83F;outline-offset:-6px}" +
    ".sf-le{color:var(--sfs);font-size:13px;line-height:1.45;padding:4px 4px}" +
    ".sf-clip{position:relative;display:flex;gap:9px;padding:6px;border:1px solid transparent;cursor:grab;margin-bottom:2px}" +
    ".sf-clip:hover{background:#262826}.sf-clip.sel{border-color:var(--sfa);background:#2A2522}.sf-clip.done{opacity:.45}.sf-clip.dropb{box-shadow:0 -2px 0 #E3B83F}" +
    ".sf-ct{width:42px;height:56px;flex:none;background:#000 center/cover no-repeat}" +
    ".sf-cb{min-width:0;flex:1;display:flex;flex-direction:column;gap:3px;justify-content:center}" +
    ".sf-cb b{font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sf-cb span{color:var(--sfs);font-size:12px;font-variant-numeric:tabular-nums}" +
    ".sf-cu{display:block;position:relative;height:3px;background:#383A38}.sf-cu i{position:absolute;top:0;height:100%;background:#E3B83F}" +
    ".sf-ck{position:absolute;left:4px;top:4px;min-width:18px;height:18px;padding:0 4px;font:700 12px/18px var(--f-body,sans-serif);text-align:center;color:#111}" +
    ".sf-cx{position:absolute;right:4px;top:4px;padding:0 6px!important;line-height:18px;opacity:0;background:transparent!important;border:0!important;color:var(--sfs)!important}.sf-clip:hover .sf-cx{opacity:1}" +
    ".sf-stage{grid-area:stage;position:relative;display:grid;place-items:center;min-height:0;min-width:0;background:#141514;overflow:hidden}" +
    ".sf-stage canvas{display:block;background:#000;box-shadow:0 0 0 1px #2C2E2C}" +
    ".sf-ph{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(80%,320px);text-align:center;color:var(--sfs);font-size:14px;line-height:1.5;pointer-events:none}" +
    ".sf-side{grid-area:side;border-left:1px solid var(--sfl);overflow-y:auto;padding:12px 12px 64px;display:flex;flex-direction:column;gap:18px;scrollbar-width:thin}" +
    ".sf-pads{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}" +
    ".sf-pad{position:relative;aspect-ratio:1/1;background:#2A2C2A center/cover no-repeat;border:2px solid #3A3C3A;cursor:pointer;overflow:hidden;display:flex;flex-direction:column;justify-content:flex-end;transition:transform .06s}" +
    ".sf-pad.wide{grid-column:span 2;aspect-ratio:auto;min-height:72px}.sf-pad::before{content:'';position:absolute;inset:0;background:linear-gradient(rgba(0,0,0,.05),rgba(0,0,0,.75))}" +
    ".sf-pad>*{position:relative}.sf-pad.on{border-color:var(--kc);box-shadow:0 0 0 2px var(--kc),0 0 18px var(--kc)}.sf-pad.hit{transform:scale(.94)}.sf-pad.bad{border-color:var(--sfr)}.sf-pad.over{border-color:#E3B83F;border-style:dashed}" +
    ".sf-pk{position:absolute;left:5px;top:3px;font:700 20px/1 var(--f-display,var(--f-body,sans-serif));color:var(--kc);text-shadow:0 1px 3px #000}" +
    ".sf-pn{padding:0 5px;font-size:11px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
    ".sf-pt{padding:0 5px 3px;font-size:11px;color:#C9CBC6;font-variant-numeric:tabular-nums}.sf-pe{padding:0 5px 6px;color:#6F716C;font-size:12px}" +
    ".sf-pr{display:block;height:4px;background:rgba(0,0,0,.6)}.sf-pr i{display:block;height:100%;background:var(--kc)}" +
    ".sf-px{position:absolute!important;right:2px;top:1px;padding:0 5px;font:700 14px/18px var(--f-body,sans-serif);color:#C9CBC6;opacity:0;cursor:pointer}.sf-pad:hover .sf-px{opacity:.9}" +
    ".sf-fx{display:flex;align-items:center;gap:9px;padding:5px 6px;border:1px solid #333533;margin-bottom:4px}.sf-fx i{width:14px;height:14px;background:var(--fc)}.sf-fx b{flex:1;font-size:13px}" +
    ".sf-fx button{min-width:44px;padding:3px 8px!important;font:700 13px var(--f-body,sans-serif)!important}.sf-fx button.learn{background:#E3B83F!important;color:#151515!important;border-color:#E3B83F!important}" +
    ".sf-fx.on{border-color:var(--fc);box-shadow:0 0 12px var(--fc)}.sf-fx.on i{box-shadow:0 0 8px var(--fc)}" +
    ".sf-fxset{border-left:3px solid var(--fc);padding:2px 0 8px 10px;margin-top:12px}.sf-fxset h4{margin:0 0 2px;font-size:13px;display:flex;align-items:center;gap:7px}.sf-fxset h4 i{width:10px;height:10px;background:var(--fc)}" +
    ".sf-fxset .sf-sw button{flex:1;padding:4px 6px!important;font-size:12px!important}.sf-fxset .sf-sw button+button{border-left:0}" +
    ".sf-chk{display:flex;align-items:center;gap:7px;margin-top:8px;font-weight:600;font-size:12px;cursor:pointer}.sf-chk input{accent-color:var(--sfa)}" +
    ".sf-fxr{margin-top:8px;font-size:12px!important;padding:4px 9px!important}" +
    ".sf-desc{margin:0;color:var(--sfs);font-size:12px;line-height:1.5}" +
    ".sf-btns{display:flex;flex-wrap:wrap;gap:6px}" +
    ".sf-row{display:flex;flex-direction:column;gap:5px;margin-top:8px}.sf-row label{display:flex;justify-content:space-between;font-weight:600;font-size:12px}.sf-row label span{color:var(--sfs);font-variant-numeric:tabular-nums}" +
    ".sf input[type=range]{width:100%;accent-color:var(--sfa);margin:0}.sf select{width:100%}" +
    ".sf-bot{grid-area:bot;border-top:1px solid var(--sfl);display:flex;flex-direction:column;min-width:0}" +
    ".sf-bar{display:flex;align-items:center;gap:6px;padding:6px 10px;flex-wrap:wrap;border-bottom:1px solid #2C2E2C;min-height:44px}" +
    ".sf-bar .sp{flex:1}.sf-bar select{width:auto}.sf-bar input[type=range]{width:90px}.sf-bar label{color:var(--sfs);font-size:12px;font-weight:600;display:flex;align-items:center;gap:6px;white-space:nowrap}" +
    ".sf-time{font:600 13px var(--f-body,sans-serif);font-variant-numeric:tabular-nums;color:var(--sfs);min-width:118px}.sf-time b{color:var(--sfi)}" +
    ".sf-play{min-width:104px}.sf-play.on{background:var(--sfr)!important;border-color:var(--sfr)!important}" +
    ".sf-seg{display:flex;align-items:center;gap:6px;padding-left:10px;border-left:1px solid var(--sfl)}.sf-ns{color:#6F716C;font-size:12px}" +
    ".sf-sw button[aria-pressed=true]{background:var(--sfi);color:#151515;border-color:var(--sfi)}" +
    ".sf-tlw{position:relative;height:156px}.sf-tlw canvas{display:block;width:100%;height:100%;touch-action:none}" +
    ".sf-ghost{position:fixed;z-index:400;pointer-events:none;display:flex;gap:6px;align-items:center;padding:4px 8px 4px 4px;background:rgba(36,37,36,.92);border:1px solid #E3B83F;color:#ECEAE5;font:600 12px var(--f-body,sans-serif)}" +
    ".sf-ghost i{width:24px;height:32px;background:#000 center/cover}" +
    ".sf-modal{position:absolute;inset:0;z-index:300;background:rgba(10,10,10,.72);display:grid;place-items:center}" +
    ".sf-box{width:min(560px,calc(100% - 32px));max-height:calc(100% - 40px);overflow-y:auto;background:#242524;border:1px solid var(--sfl);padding:20px 22px;display:flex;flex-direction:column;gap:12px}" +
    ".sf-box h2{margin:0;font:700 20px var(--f-display,var(--f-body,sans-serif))}.sf-box p{margin:0;color:#C9CBC6;line-height:1.55;font-size:14px}" +
    ".sf-pg{font-variant-numeric:tabular-nums;color:#E3B83F!important;font-weight:600;min-height:1.4em}" +
    ".sf.drop .sf-stage{outline:3px dashed #E3B83F;outline-offset:-10px}" +
    "@media (max-width:1000px){.sf{grid-template-columns:190px minmax(0,1fr) 240px}.sf-tb button{padding:6px 8px}}";

  function html() {
    var opts = function (list, all) { return list.map(function (a) { return '<option value="' + a + '">' + t("a_" + a) + "</option>"; }).join("") + (all ? '<option value="rand">' + t("a_rand") + "</option>" : ""); };
    return '<div class="sf" id="sf-root">' +
      '<header class="sf-top"><a class="sf-back" href="#">' + t("back") + '</a><b class="sf-title">SkapeForm<span>v' + VERSION + '</span></b>' +
        '<span class="sf-note" id="sf-note"></span><div class="sf-tb"><span class="sf-sw sf-rat" title="' + t("ratioT") + '">' + RATIO_ORDER.map(function (k) { return '<button type="button" data-ratio="' + k + '" aria-pressed="' + (P.ratio === k) + '">' + k + "</button>"; }).join("") + "</span>" +
        '<button type="button" data-a="import">' + t("imp") + '</button><button type="button" data-a="full">' + t("full") + '</button>' +
        '<button type="button" class="pri" data-a="export">' + t("exp") + '</button><button type="button" data-a="help" title="' + t("help") + '">?</button></div>' +
        '<input type="file" id="sf-file" multiple accept="video/*,.mp4,.mov,.m4v,.webm,.mkv" hidden><input type="file" id="sf-mfile" accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac" hidden></header>' +
      '<aside class="sf-lib" id="sf-lib"><h3>' + t("lib") + ' <span id="sf-libn"></span></h3><div class="sf-list" id="sf-list"></div></aside>' +
      '<section class="sf-stage" id="sf-stage"><canvas id="sf-pv"></canvas><div class="sf-ph" id="sf-ph">' + t("stageEmpty") + "</div></section>" +
      '<aside class="sf-side" id="sf-side">' +
        '<div><h3>' + t("keys") + '</h3><div class="sf-pads" id="sf-pads"></div></div>' +
        '<p class="sf-desc">' + t("keysNote") + '</p>' +
        '<div><h3>' + t("fxH") + '</h3><div id="sf-fxl"></div><p class="sf-desc" style="margin-top:8px">' + t("fxNote") + '</p><div id="sf-fxs"></div></div>' +
        '<div><h3>' + t("modeH") + '</h3><div class="sf-sw" style="display:flex"><button type="button" data-a="mode-cont" id="sf-mc">' + t("modeCont") + '</button><button type="button" data-a="mode-rand" id="sf-mr">' + t("modeRand") + '</button></div><p class="sf-desc" id="sf-md" style="margin-top:8px"></p></div>' +
        '<div class="sf-btns"><button type="button" data-a="fill">' + t("fill") + '</button><button type="button" data-a="reset">' + t("reset") + "</button></div>" +
        '<div><h3>' + t("liveAnim") + '</h3><select id="sf-lanim">' + opts(ANIMS, true) + "</select>" +
          '<div class="sf-row"><label for="sf-lstr">' + t("str") + ' <span id="sf-lstr-v"></span></label><input type="range" id="sf-lstr" min="20" max="200" step="5"></div>' +
          '<div class="sf-row"><label for="sf-ldur">' + t("dur") + ' <span id="sf-ldur-v"></span></label><input type="range" id="sf-ldur" min="15" max="150" step="5"></div></div>' +
        '<div><h3>' + t("sound") + '</h3><div class="sf-row"><label for="sf-cvol">' + t("clipVol") + ' <span id="sf-cvol-v"></span></label><input type="range" id="sf-cvol" min="0" max="100" step="1"></div>' +
          '<div id="sf-mus"></div></div>' +
      "</aside>" +
      '<section class="sf-bot"><div class="sf-bar" id="sf-bar">' +
        '<button type="button" class="sf-play" data-a="play" id="sf-play"></button><span class="sf-time" id="sf-time"></span>' +
        '<button type="button" data-a="split" title="S">' + t("split") + '</button><button type="button" data-a="del" title="Entf / Del">' + t("del") + "</button>" +
        '<button type="button" data-a="undo" id="sf-undo" title="Strg+Z">↶</button><button type="button" data-a="redo" id="sf-redo" title="Strg+Y">↷</button>' +
        '<div class="sf-seg" id="sf-seg"><span class="sf-ns" id="sf-ns">' + t("noSel") + '</span><span id="sf-sc" class="sf-sc" hidden>' +
          '<label>' + t("anim") + ' <select id="sf-anim">' + opts(ANIMS, false) + "</select></label>" +
          '<label>' + t("str") + ' <input type="range" id="sf-astr" min="20" max="200" step="5"></label>' +
          '<label>' + t("dur") + ' <input type="range" id="sf-adur" min="15" max="150" step="5"></label>' +
          '<span class="sf-sw" style="display:flex;gap:0"><button type="button" data-a="fill-p" id="sf-pf">' + t("pFill") + '</button><button type="button" data-a="fit-p" id="sf-pw">' + t("pFit") + "</button></span>" +
          '<button type="button" data-a="toall">' + t("toAll") + "</button></span></div>" +
        '<span class="sp"></span><button type="button" data-a="zout" title="−">−</button><button type="button" data-a="zin" title="+">+</button></div>' +
        '<div class="sf-tlw" id="sf-tlw" style="height:' + TLH + 'px"><canvas id="sf-tl"></canvas></div></section>' +
      '<div class="sf-modal" id="sf-modal" hidden></div></div>';
  }

  var noteT = 0;
  function note(s) { if (!V) return; var n = V.root.querySelector("#sf-note"); n.textContent = s; clearTimeout(noteT); noteT = setTimeout(function () { if (V) n.textContent = ""; }, 6000); }

  function renderAll() { renderLib(); renderPads(); renderSide(); renderFx(); renderFxSet(); updateBar(); }
  function renderFx() {
    if (!V) return;
    V.root.querySelector("#sf-fxl").innerHTML = FX_ORDER.map(function (ty) {
      var d = FXDEF[ty], on = V.fxHeld[ty] || V.fxPeek[ty], learn = V.fxLearn === ty;
      return '<div class="sf-fx' + (on ? " on" : "") + '" style="--fc:' + d.color + '"><i></i><b>' + d.name[lang] + '</b>' +
        '<button type="button" data-a="fxkey" data-fx="' + ty + '" class="' + (learn ? "learn" : "") + '" title="' + t("fxKeyT") + '">' + (learn ? t("fxPress") : keyLabel(P.fxKeys[ty])) + "</button></div>";
    }).join("");
  }
  // Regler der Effekte (einmal aufbauen, beim Ziehen nur die Zahl aktualisieren)
  function fxVal(c, v) { return c.type === "check" ? "" : v + (c.u || ""); }
  function renderFxSet() {
    if (!V) return;
    V.root.querySelector("#sf-fxs").innerHTML = FX_ORDER.filter(function (ty) { return FXDEF[ty].set; }).map(function (ty) {
      var d = FXDEF[ty], S2 = fxSet(ty);
      return '<div class="sf-fxset" style="--fc:' + d.color + '"><h4><i></i>' + d.name[lang] + " · " + keyLabel(P.fxKeys[ty]) + "</h4>" + d.set.map(function (c) {
        var id = "sf-fx-" + ty + "-" + c.k;
        if (c.type === "seg") return '<div class="sf-row"><label>' + c.l[lang] + '</label><div class="sf-btns sf-sw" style="gap:0">' + c.opts.map(function (o) { return '<button type="button" data-fxseg="' + ty + ":" + c.k + ":" + o[0] + '" aria-pressed="' + (S2[c.k] === o[0]) + '">' + o[1][lang] + "</button>"; }).join("") + "</div></div>";
        if (c.type === "check") return '<label class="sf-chk"><input type="checkbox" id="' + id + '" data-fxs="' + ty + ":" + c.k + '"' + (S2[c.k] ? " checked" : "") + "> " + c.l[lang] + "</label>";
        return '<div class="sf-row"><label for="' + id + '">' + c.l[lang] + ' <span id="' + id + '-v">' + fxVal(c, S2[c.k]) + '</span></label><input type="range" id="' + id + '" data-fxs="' + ty + ":" + c.k + '" min="' + c.min + '" max="' + c.max + '" step="1" value="' + S2[c.k] + '"></div>';
      }).join("") + '<button type="button" data-fxreset="' + ty + '" class="sf-fxr">' + t("fxReset") + "</button></div>";
    }).join("");
  }
  function fxCtl(ty, k) { var l = FXDEF[ty].set; for (var i = 0; i < l.length; i++) if (l[i].k === k) return l[i]; return null; }
  function renderLib() {
    if (!V) return;
    var box = V.root.querySelector("#sf-list");
    V.root.querySelector("#sf-libn").textContent = P.clips.length ? "· " + P.clips.length : "";
    if (!P.clips.length) { box.innerHTML = '<p class="sf-le">' + t("libEmpty") + "</p>"; return; }
    box.innerHTML = P.clips.map(function (c) {
      var k = slotOf(c.id), bars = c.dur ? c.used.map(function (r) { return '<i style="left:' + (r[0] / c.dur * 100).toFixed(2) + "%;width:" + Math.max(0.4, (r[1] - r[0]) / c.dur * 100).toFixed(2) + '%"></i>'; }).join("") : "";
      var info = c.bad ? "✕" : !c.dur ? t("loading") : tc(c.dur) + (c.done ? " · " + t("usedUp") : c.used.length ? " · " + tc(freeTime(c)) + " " + (lang === "de" ? "übrig" : "left") : "") + (c.bound && k < 0 && !c.done ? " · " + t("wasKey") : "");
      return '<div class="sf-clip' + (P.selClip === c.id ? " sel" : "") + (c.done ? " done" : "") + '" data-c="' + c.id + '">' +
        '<div class="sf-ct" style="background-image:' + (c.poster ? "url(" + c.poster + ")" : "none") + '"></div>' +
        '<div class="sf-cb"><b title="' + esc(c.name) + '">' + esc(c.name) + "</b><span>" + info + '</span><span class="sf-cu">' + bars + '</span></div>' +
        (k >= 0 ? '<span class="sf-ck" style="background:' + KEYC[k] + '">' + k + "</span>" : "") +
        '<button type="button" class="sf-cx" data-cx="' + c.id + '" title="' + t("remove") + '">×</button></div>';
    }).join("");
  }
  function padRest(c, k) {
    var f = freeTime(c);
    if (REC && REC.cur && REC.cur.slot === k) f -= Math.min(P.T - REC.cur.t, REC.cur.end - REC.cur.in);
    return Math.max(0, f);
  }
  function renderPads() {
    if (!V) return;
    V.root.querySelector("#sf-pads").innerHTML = PAD_ORDER.map(function (k) {
      var c = P.slots[k] ? clipById(P.slots[k]) : null, on = REC && REC.cur && REC.cur.slot === k;
      var st = "--kc:" + KEYC[k] + (c && c.poster ? ";background-image:url(" + c.poster + ")" : "");
      var inner = '<span class="sf-pk">' + k + "</span>";
      if (c) { var r = padRest(c, k); inner += '<span class="sf-px" data-px="' + k + '" title="' + t("clear") + '">×</span><span class="sf-pn">' + esc(c.name) + '</span><span class="sf-pt" id="sf-pt' + k + '">' + tc(r, false) + '</span><span class="sf-pr"><i id="sf-pr' + k + '" style="width:' + (c.dur ? r / c.dur * 100 : 0).toFixed(1) + '%"></i></span>'; }
      else inner += '<span class="sf-pe">' + t("empty") + "</span>";
      return '<div class="sf-pad' + (k === 0 ? " wide" : "") + (on ? " on" : "") + '" data-k="' + k + '" style="' + st + '" role="button" tabindex="-1">' + inner + "</div>";
    }).join("");
  }
  function flashPad(k, bad) {
    if (!V) return; var el = V.root.querySelector('.sf-pad[data-k="' + k + '"]'); if (!el) return;
    var cl = bad ? "bad" : "hit"; el.classList.add(cl); setTimeout(function () { el.classList.remove(cl); }, bad ? 300 : 90);
  }
  function renderSide() {
    if (!V) return; var r = V.root;
    r.querySelector("#sf-lanim").value = P.live.anim;
    var rm = P.live.mode === "rand";
    r.querySelector("#sf-mc").setAttribute("aria-pressed", String(!rm)); r.querySelector("#sf-mr").setAttribute("aria-pressed", String(rm));
    r.querySelector("#sf-md").textContent = t(rm ? "modeRandD" : "modeContD");
    r.querySelector("#sf-lstr").value = Math.round(P.live.as * 100); r.querySelector("#sf-lstr-v").textContent = Math.round(P.live.as * 100) + " %";
    r.querySelector("#sf-ldur").value = Math.round(P.live.ad * 100); r.querySelector("#sf-ldur-v").textContent = sec(P.live.ad);
    r.querySelector("#sf-cvol").value = Math.round(P.clipVol * 100); r.querySelector("#sf-cvol-v").textContent = Math.round(P.clipVol * 100) + " %";
    var m = P.music;
    r.querySelector("#sf-mus").innerHTML = '<div class="sf-row"><label>' + t("music") + " <span>" + (m ? esc(m.name) + " · " + tc(m.buf.duration) : "") + '</span></label><div class="sf-btns"><button type="button" data-a="music">' + t("musicLoad") + "</button>" + (m ? '<button type="button" data-a="music-del">' + t("musicDel") + "</button>" : "") + "</div></div>" +
      (m ? '<div class="sf-row"><label for="sf-mvol">' + t("musicVol") + ' <span id="sf-mvol-v">' + Math.round(P.musicVol * 100) + ' %</span></label><input type="range" id="sf-mvol" min="0" max="100" step="1" value="' + Math.round(P.musicVol * 100) + '"></div>' : "") +
      '<p class="sf-desc" style="margin-top:8px">' + t("musicNote") + "</p>";
  }
  function updateBar() {
    if (!V) return; var r = V.root;
    var pb = r.querySelector("#sf-play"); pb.textContent = PL.on ? t("stop") : t("play"); pb.classList.toggle("on", PL.on);
    r.querySelector("#sf-undo").disabled = !P.undo.length || !!REC; r.querySelector("#sf-redo").disabled = !P.redo.length || !!REC;
    var s = REC ? null : selSeg();
    r.querySelector("#sf-ns").hidden = !!s; r.querySelector("#sf-sc").hidden = !s;
    var ef = !s && !REC && P.selFx ? fxById(P.selFx) : null;
    r.querySelector("#sf-ns").textContent = ef ? fmt(t("fxSel"), { n: FXDEF[ef.type].name[lang], d: sec(ef.dur) }) : t("noSel");
    if (s) {
      r.querySelector("#sf-anim").value = s.anim; r.querySelector("#sf-astr").value = Math.round(s.as * 100); r.querySelector("#sf-adur").value = Math.round(s.ad * 100);
      r.querySelector("#sf-pf").setAttribute("aria-pressed", String(s.fit !== "fit")); r.querySelector("#sf-pw").setAttribute("aria-pressed", String(s.fit === "fit"));
    }
  }
  var lastTime = "";
  function updateTime() {
    var s = "<b>" + tc(P.T, true) + "</b> / " + tc(REC ? Math.max(P.T, total()) : total(), true);
    if (s !== lastTime) { V.root.querySelector("#sf-time").innerHTML = s; lastTime = s; }
  }

  // ---------- Vorschau ----------
  function layoutStage() {
    if (!V) return;
    var st = V.root.querySelector("#sf-stage"), r = st.getBoundingClientRect(), pad = 16;
    var h = Math.max(100, r.height - pad * 2), w = h * OW / OH;
    if (w > r.width - pad * 2) { w = Math.max(60, r.width - pad * 2); h = w * OH / OW; }
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    V.pcv.style.width = Math.round(w) + "px"; V.pcv.style.height = Math.round(h) + "px";
    V.pcv.width = Math.round(w * dpr); V.pcv.height = Math.round(h * dpr);
    var tl = V.root.querySelector("#sf-tlw").getBoundingClientRect();
    V.tw = tl.width; V.th = tl.height; V.tcv.width = Math.round(tl.width * dpr); V.tcv.height = Math.round(tl.height * dpr); V.dpr = dpr;
  }
  function drawPreview() {
    var x = V.px, W = V.pcv.width, H = V.pcv.height;
    var src = null, g = null, tt = 0, c;
    if (REC && REC.cur) { c = clipById(REC.cur.clip); src = c.vS; g = curSeg(P.T); tt = P.T - REC.cur.t; }
    else if (!REC) {
      var s = segAt(P.T) || (P.segs.length && P.T >= total() - 1e-6 ? P.segs[P.segs.length - 1] : null);
      if (s) { c = clipById(s.clip); src = PL.on && PL.el ? PL.el : c.vT; g = s; tt = Math.min(P.T - s.start, s.dur - 0.001); }
    }
    if (src && src.readyState >= 2 && src.videoWidth && !src.seeking) { x.fillStyle = "#000"; x.fillRect(0, 0, W, H); drawSeg(x, W, H, src, src.videoWidth, src.videoHeight, g, tt, V.hold); drawFx(x, W, H, fxActive(P.T), P.T); V.pvOk = true; }
    else if (!g || !V.pvOk) { x.fillStyle = "#000"; x.fillRect(0, 0, W, H); }   // sonst letztes Bild stehen lassen, kein Schwarzblitz beim Suchen
    if (REC) {
      var f = Math.max(12, W * 0.045);
      x.fillStyle = "rgba(224,65,47,.92)"; x.fillRect(W * 0.04, W * 0.04, f * 7.2, f * 1.6);
      x.fillStyle = "#fff"; x.font = "700 " + f + "px system-ui,sans-serif"; x.textBaseline = "middle";
      x.fillText("● " + t("rec"), W * 0.04 + f * 0.4, W * 0.04 + f * 0.82);
      if (REC.cur) { x.fillStyle = KEYC[REC.cur.slot]; x.font = "700 " + f * 2.4 + "px system-ui,sans-serif"; x.textAlign = "right"; x.fillText(String(REC.cur.slot), W * 0.95, W * 0.04 + f * 1.2); x.textAlign = "left"; }
    }
    V.root.querySelector("#sf-ph").hidden = !!(P.segs.length || REC);
  }

  // ---------- Timeline zeichnen ----------
  var RUL = 22, TY = 30, TH = 74, FXY = TY + TH + 6, FXH = 22, MY = FXY + FX_ORDER.length * (FXH + 3) + 3, MH = 30, TLH = MY + MH + 8, PADL = 12;
  function laneY(i) { return FXY + i * (FXH + 3); }
  function tToX(T) { return PADL + (T - P.scroll) * P.pps; }
  function xToT(x) { return P.scroll + (x - PADL) / P.pps; }
  function tileAt(c, st) {
    var a = c.tiles; if (!a.length) return null; var best = a[0];
    for (var i = 1; i < a.length; i++) if (Math.abs(a[i].t - st) < Math.abs(best.t - st)) best = a[i];
    return best.cv;
  }
  function drawTL() {
    if (!V) return;
    var x = V.tx, d = V.dpr, W = V.tw, H = V.th;
    x.setTransform(d, 0, 0, d, 0, 0);
    x.fillStyle = "#181918"; x.fillRect(0, 0, W, H);
    // Lineal
    x.fillStyle = "#1F201F"; x.fillRect(0, 0, W, RUL);
    var steps = [0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120], st = steps[steps.length - 1];
    for (var i = 0; i < steps.length; i++) if (steps[i] * P.pps >= 70) { st = steps[i]; break; }
    var t0 = Math.floor(P.scroll / st) * st;
    x.font = "600 11px system-ui,sans-serif"; x.textBaseline = "middle";
    for (var tt = t0; tt < xToT(W) + st; tt += st) {
      var px = Math.round(tToX(tt)) + 0.5; if (px < 0) continue;
      x.fillStyle = "#4A4C4A"; x.fillRect(px, RUL - 8, 1, 8);
      x.fillStyle = "#8E908B"; x.fillText(st < 1 ? tc(tt, true).replace(/0$/, "") : tc(tt), px + 4, RUL / 2 - 1);
      for (var q = 1; q < 4; q++) { var qx = Math.round(tToX(tt + st * q / 4)) + 0.5; x.fillStyle = "#333533"; x.fillRect(qx, RUL - 4, 1, 4); }
    }
    // Spur
    x.fillStyle = "#1E1F1E"; x.fillRect(0, TY, W, TH);
    var list = displaySegs(), mv = V.drag && V.drag.mode === "move" && V.drag.moved ? V.drag : null;
    list.forEach(function (g) {
      var gx = tToX(g.start), gw = g.dur * P.pps; if (gx > W || gx + gw < 0) return;
      var c = clipById(g.clip); if (!c) return;
      x.save(); x.beginPath(); x.rect(gx, TY, Math.max(1, gw - 1), TH); x.clip();
      x.fillStyle = "#2A2C2A"; x.fillRect(gx, TY, gw, TH);
      if (c.tiles.length) {
        var tw = 54 * (TH - 18) / 72, start = Math.max(gx, gx + Math.floor((0 - gx) / tw) * tw);
        for (var bx = start; bx < Math.min(W, gx + gw); bx += tw) { var cv = tileAt(c, g.in + (bx - gx + tw / 2) / P.pps); if (cv) x.drawImage(cv, bx, TY + 18, tw, TH - 18); }
      }
      x.fillStyle = g.ghost ? "rgba(24,25,24,.55)" : "rgba(0,0,0,.2)"; x.fillRect(gx, TY + 18, gw, TH - 18);
      x.fillStyle = g.live ? "#4A2A26" : "#262826"; x.fillRect(gx, TY, gw, 18);
      if (g.anim !== "none") {                                  // Animationsdauer als Band
        var aw = Math.min(gw, g.ad * P.pps);
        var gr = x.createLinearGradient(gx, 0, gx + aw, 0); gr.addColorStop(0, "rgba(227,184,63,.85)"); gr.addColorStop(1, "rgba(227,184,63,0)");
        x.fillStyle = gr; x.fillRect(gx, TY + TH - 5, aw, 5);
        x.fillStyle = "#E3B83F"; x.beginPath(); x.moveTo(gx + 3, TY + 22); x.lineTo(gx + 11, TY + 22); x.lineTo(gx + 7, TY + 30); x.lineTo(gx + 12, TY + 30); x.lineTo(gx + 4, TY + 40); x.lineTo(gx + 6, TY + 32); x.lineTo(gx + 2, TY + 32); x.closePath(); x.fill();
      }
      var lx = gx + 4;
      if (g.key >= 0) { x.fillStyle = KEYC[g.key]; x.fillRect(lx, TY + 3, 14, 12); x.fillStyle = "#111"; x.font = "700 10px system-ui,sans-serif"; x.fillText(String(g.key), lx + 4, TY + 9.5); lx += 18; }
      x.fillStyle = "#D8D6D1"; x.font = "600 11px system-ui,sans-serif"; x.fillText(c.name, lx, TY + 9.5);
      x.restore();
      var sel = !REC && P.sel === g.id;
      x.strokeStyle = sel ? "#E2621B" : g.key >= 0 ? KEYC[g.key] : "#4A4C4A"; x.lineWidth = sel ? 2 : 1;
      x.globalAlpha = sel ? 1 : 0.7; x.strokeRect(gx + (sel ? 1 : 0.5), TY + (sel ? 1 : 0.5), Math.max(1, gw - (sel ? 3 : 2)), TH - (sel ? 2 : 1)); x.globalAlpha = 1;
      if (mv && mv.id === g.id) { x.fillStyle = "rgba(24,25,24,.6)"; x.fillRect(gx, TY, gw, TH); }
    });
    if (mv) {
      var ix = mv.idx >= P.segs.length ? tToX(total()) : tToX(P.segs[mv.idx].start);
      x.fillStyle = "#E3B83F"; x.fillRect(ix - 2, TY - 4, 4, TH + 8);
    }
    if (V.ldrop != null) { var lx2 = V.ldrop >= P.segs.length ? tToX(total()) : tToX(P.segs[V.ldrop].start); x.fillStyle = "#E3B83F"; x.fillRect(lx2 - 2, TY - 4, 4, TH + 8); }
    if (!list.length) { x.fillStyle = "#6F716C"; x.font = "600 12px system-ui,sans-serif"; x.fillText(lang === "de" ? "Timeline leer: Clip hierher ziehen, doppelklicken oder live mit den Zahlen schneiden" : "Timeline empty: drag a clip here, double-click one, or cut live with the numbers", PADL + 4, TY + TH / 2); }
    // Effekt-Spuren
    FX_ORDER.forEach(function (ty, li) {
      var y = laneY(li), def = FXDEF[ty], held = V.fxHeld[ty];
      x.fillStyle = "#1C1D1C"; x.fillRect(0, y, W, FXH);
      x.fillStyle = "#4F514E"; x.font = "600 10px system-ui,sans-serif"; x.fillText(keyLabel(P.fxKeys[ty]) + " · " + def.name[lang], 4, y + FXH / 2);
      P.fx.forEach(function (f) {
        if (f.type !== ty) return;
        var fx0 = tToX(f.start), fw = Math.max(2, f.dur * P.pps); if (fx0 > W || fx0 + fw < 0) return;
        x.save(); x.beginPath(); x.rect(fx0, y, fw, FXH); x.clip();
        x.fillStyle = def.color; x.globalAlpha = held === f.id ? 1 : 0.82; x.fillRect(fx0, y, fw, FXH); x.globalAlpha = 1;
        x.fillStyle = "#141414"; x.font = "700 10px system-ui,sans-serif"; x.fillText(keyLabel(P.fxKeys[ty]) + "  " + def.name[lang], fx0 + 5, y + FXH / 2);
        x.restore();
        if (!REC && P.selFx === f.id) { x.strokeStyle = "#E2621B"; x.lineWidth = 2; x.strokeRect(fx0 + 1, y + 1, Math.max(1, fw - 2), FXH - 2); }
      });
    });
    // Musik
    var m = P.music;
    x.fillStyle = "#1A1B1A"; x.fillRect(0, MY, W, MH);
    if (m) {
      var mx0 = tToX(0), mx1 = tToX(m.buf.duration);
      x.fillStyle = "#1D3A2A"; x.fillRect(Math.max(0, mx0), MY, Math.min(W, mx1) - Math.max(0, mx0), MH);
      x.fillStyle = "#3FA86A";
      var a0 = Math.max(0, Math.floor(xToT(0) * 100)), a1 = Math.min(m.peaks.length, Math.ceil(xToT(W) * 100)), stp = Math.max(1, Math.floor(100 / P.pps));
      for (var p = a0; p < a1; p += stp) {
        var mx = 0; for (var j = p; j < p + stp && j < m.peaks.length; j++) if (m.peaks[j] > mx) mx = m.peaks[j];
        var hh = Math.max(1, mx * (MH - 6)); x.fillRect(tToX(p / 100), MY + MH / 2 - hh / 2, Math.max(1, stp / 100 * P.pps - 0.5), hh);
      }
      x.fillStyle = "#CDEBD7"; x.font = "600 11px system-ui,sans-serif"; x.fillText("♪ " + m.name, Math.max(4, mx0 + 4), MY + 9);
    }
    // Abspielkopf
    var hx = Math.round(tToX(P.T)) + 0.5;
    x.fillStyle = REC ? "#E0412F" : "#E2621B"; x.fillRect(hx - 0.5, 0, 2, H);
    x.beginPath(); x.moveTo(hx - 6, 0); x.lineTo(hx + 7, 0); x.lineTo(hx + 0.5, 9); x.closePath(); x.fill();
    if (REC) { var rx = tToX(REC.t0); x.fillStyle = "rgba(224,65,47,.18)"; x.fillRect(rx, TY, hx - rx, TH); }
  }
  function follow() {
    var hx = tToX(P.T);
    if (hx > V.tw - 60) P.scroll = P.T - (V.tw * 0.25 - PADL) / P.pps;
    else if (hx < PADL) P.scroll = Math.max(0, P.T - 1);
  }
  function zoom(f, atX) {
    var ax = atX == null ? tToX(P.T) : atX, at = xToT(ax);
    P.pps = clamp(P.pps * f, 4, 600); P.scroll = Math.max(0, at - (ax - PADL) / P.pps);
  }

  // ---------- Zeiger: Timeline ----------
  function tlPos(e) { var r = V.tcv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  function hitSeg(p) {
    if (p.y < TY || p.y > TY + TH) return null;
    var T = xToT(p.x);
    for (var i = 0; i < P.segs.length; i++) {
      var g = P.segs[i], x0 = tToX(g.start), x1 = tToX(g.start + g.dur);
      if (p.x >= x0 - 4 && p.x <= x1 + 4) {
        var edge = x1 - p.x < 8 ? "R" : p.x - x0 < 8 ? "L" : null;
        if (T >= g.start - 4 / P.pps && T <= g.start + g.dur + 4 / P.pps) return { g: g, edge: edge };
      }
    }
    return null;
  }
  function hitFx(p) {
    for (var li = 0; li < FX_ORDER.length; li++) {
      var y = laneY(li); if (p.y < y || p.y > y + FXH) continue;
      var ty = FX_ORDER[li], best = null;
      P.fx.forEach(function (f) {
        if (f.type !== ty) return;
        var x0 = tToX(f.start), x1 = tToX(f.start + f.dur);
        if (p.x >= x0 - 4 && p.x <= x1 + 4) best = { f: f, edge: x1 - p.x < 7 ? "R" : p.x - x0 < 7 ? "L" : null };
      });
      return best || { lane: ty };
    }
    return null;
  }
  function snapT(T, ex) {                              // an Schnitte und Abspielkopf einrasten (7 px)
    var best = T, bd = 7 / P.pps;
    var cand = [P.T]; P.segs.forEach(function (g) { cand.push(g.start, g.start + g.dur); });
    P.fx.forEach(function (f) { if (f.id !== ex) cand.push(f.start, f.start + f.dur); });
    cand.forEach(function (c) { if (Math.abs(c - T) < bd) { bd = Math.abs(c - T); best = c; } });
    return best;
  }
  function onTLDown(e) {
    if (e.button > 0 || V.exporting) return;
    e.preventDefault(); V.tcv.setPointerCapture(e.pointerId);
    var p = tlPos(e);
    if (REC) return;
    var hf = p.y >= RUL ? hitFx(p) : null;
    if (hf && hf.f) { P.selFx = hf.f.id; P.sel = 0; V.drag = { mode: hf.edge ? "fxtrim" + hf.edge : "fxmove", id: hf.f.id, x0: p.x, s0: hf.f.start, d0: hf.f.dur, undo: false }; updateBar(); return; }
    if (hf) { P.selFx = 0; P.sel = 0; updateBar(); }
    var h = p.y >= RUL ? hitSeg(p) : null;
    if (h && h.edge) { V.drag = { mode: "trim" + h.edge, id: h.g.id, x0: p.x, in0: h.g.in, dur0: h.g.dur, undo: false }; P.sel = h.g.id; P.selFx = 0; updateBar(); return; }
    if (h) { V.drag = { mode: "move", id: h.g.id, x0: p.x, moved: false, idx: 0 }; P.sel = h.g.id; P.selFx = 0; updateBar(); return; }
    if (p.y >= RUL && p.y >= TY && p.y <= TY + TH) { P.sel = 0; P.selFx = 0; updateBar(); }
    V.drag = { mode: "scrub" }; seekTo(xToT(p.x));
  }
  function onTLMove(e) {
    if (!V) return;
    var p = tlPos(e), dg = V.drag;
    if (!dg) {
      if (REC) { V.tcv.style.cursor = "default"; return; }
      var hf = p.y >= RUL ? hitFx(p) : null;
      if (hf && hf.f) { V.tcv.style.cursor = hf.edge ? "ew-resize" : "grab"; return; }
      var h = p.y >= RUL ? hitSeg(p) : null; V.tcv.style.cursor = h && h.edge ? "ew-resize" : h ? "grab" : "default"; return;
    }
    if (dg.mode === "scrub") { seekTo(xToT(p.x)); return; }
    if (dg.mode.indexOf("fx") === 0) {
      var f = fxById(dg.id); if (!f) return;
      if (!dg.undo && Math.abs(p.x - dg.x0) > 2) { pushUndo(); dg.undo = true; V.tcv.style.cursor = dg.mode === "fxmove" ? "grabbing" : "ew-resize"; }
      if (!dg.undo) return;
      var fdt = (p.x - dg.x0) / P.pps, end0 = dg.s0 + dg.d0;
      if (dg.mode === "fxmove") {
        var ns = Math.max(0, dg.s0 + fdt), sn = snapT(ns, f.id);
        if (sn === ns) { var se = snapT(ns + f.dur, f.id); ns = se - f.dur; } else ns = sn;
        f.start = Math.max(0, ns);
      } else if (dg.mode === "fxtrimL") { var st2 = snapT(clamp(dg.s0 + fdt, 0, end0 - FX_MIN), f.id); f.start = Math.min(st2, end0 - FX_MIN); f.dur = end0 - f.start; }
      else { var e2 = snapT(Math.max(dg.s0 + FX_MIN, end0 + fdt), f.id); f.dur = Math.max(FX_MIN, e2 - f.start); }
      return;
    }
    var g = segById(dg.id); if (!g) return;
    var c = clipById(g.clip), dt = (p.x - dg.x0) / P.pps;
    if (dg.mode === "trimL" || dg.mode === "trimR") {
      if (!dg.undo && Math.abs(p.x - dg.x0) > 1) { pushUndo(); dg.undo = true; }
      if (!dg.undo) return;
      if (dg.mode === "trimL") { var ni = clamp(dg.in0 + dt, 0, dg.in0 + dg.dur0 - MIN); g.in = ni; g.dur = dg.dur0 - (ni - dg.in0); }
      else g.dur = clamp(dg.dur0 + dt, MIN, c.dur - g.in);
      layout(); P.T = Math.min(P.T, total()); updateBar();
      return;
    }
    if (dg.mode === "move") {
      if (!dg.moved && Math.abs(p.x - dg.x0) > 5) { dg.moved = true; V.tcv.style.cursor = "grabbing"; }
      if (dg.moved) dg.idx = insertIdx(xToT(p.x));
    }
  }
  function insertIdx(T) { for (var i = 0; i < P.segs.length; i++) if (T < P.segs[i].start + P.segs[i].dur / 2) return i; return P.segs.length; }
  function onTLUp() {
    if (!V || !V.drag) return; var dg = V.drag; V.drag = null;
    if (dg.mode.indexOf("fx") === 0) { var f = fxById(dg.id); if (f && dg.undo) mergeFx(f.type); V.tcv.style.cursor = "default"; updateBar(); return; }
    if (dg.mode === "move" && dg.moved) {
      var g = segById(dg.id), from = P.segs.indexOf(g), to = dg.idx;
      if (g && to !== from && to !== from + 1) { pushUndo(); P.segs.splice(from, 1); if (to > from) to--; P.segs.splice(to, 0, g); layout(); }
    }
    V.tcv.style.cursor = "default"; updateBar();
  }
  function onTLWheel(e) {
    e.preventDefault();
    if (e.ctrlKey || e.altKey || e.metaKey) { zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15, tlPos(e).x); return; }
    var d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    P.scroll = Math.max(0, P.scroll + d / P.pps * 0.8);
  }

  // ---------- Zeiger: Bibliothek ziehen (auf Timeline, Tasten oder umsortieren) ----------
  function onDown(e) {
    if (!V || e.button > 0) return;
    ac();
    var x = e.target.closest("[data-cx]"); if (x) return;
    var item = e.target.closest(".sf-clip");
    if (item) { V.ld = { id: +item.dataset.c, x0: e.clientX, y0: e.clientY, on: false }; return; }
  }
  function overTarget(e) {
    var el = document.elementFromPoint(e.clientX, e.clientY); if (!el) return {};
    var pad = el.closest && el.closest(".sf-pad"); if (pad) return { pad: +pad.dataset.k };
    if (el === V.tcv) return { tl: true };
    var it = el.closest && el.closest(".sf-clip"); if (it) return { item: +it.dataset.c };
    if (el.closest && el.closest("#sf-lib")) return { libEnd: true };
    return {};
  }
  function onMove(e) {
    if (!V) return;
    if (V.drag) { onTLMove(e); return; }
    var ld = V.ld; if (!ld) return;
    if (!ld.on && Math.hypot(e.clientX - ld.x0, e.clientY - ld.y0) > 5) {
      var c = clipById(ld.id); if (!c || !c.dur) { V.ld = null; return; }
      ld.on = true; var gh = document.createElement("div"); gh.className = "sf-ghost";
      gh.innerHTML = '<i style="background-image:' + (c.poster ? "url(" + c.poster + ")" : "none") + '"></i>' + esc(c.name); document.body.appendChild(gh); ld.gh = gh;
    }
    if (!ld.on) return;
    ld.gh.style.left = e.clientX + 12 + "px"; ld.gh.style.top = e.clientY + 8 + "px";
    var o = overTarget(e);
    V.root.querySelectorAll(".sf-pad.over,.sf-clip.dropb").forEach(function (el) { el.classList.remove("over", "dropb"); });
    if (o.pad != null) { var pe = V.root.querySelector('.sf-pad[data-k="' + o.pad + '"]'); if (pe) pe.classList.add("over"); }
    if (o.item != null && o.item !== ld.id) { var ie = V.root.querySelector('.sf-clip[data-c="' + o.item + '"]'); if (ie) ie.classList.add("dropb"); }
    V.ldrop = o.tl && !REC ? insertIdx(xToT(e.clientX - V.tcv.getBoundingClientRect().left)) : null;
  }
  function onUp(e) {
    if (!V) return;
    if (V.drag) { onTLUp(e); return; }
    var ld = V.ld; V.ld = null; if (!ld) return;
    if (!ld.on) { P.selClip = ld.id; V.root.querySelectorAll(".sf-clip").forEach(function (el) { el.classList.toggle("sel", +el.dataset.c === ld.id); }); return; }
    ld.gh.remove(); V.ldrop = null;
    V.root.querySelectorAll(".sf-pad.over,.sf-clip.dropb").forEach(function (el) { el.classList.remove("over", "dropb"); });
    var o = overTarget(e), c = clipById(ld.id); if (!c) return;
    if (o.pad != null) { if (!REC || (REC.cur && REC.cur.slot !== o.pad)) { pushUndo(); assign(o.pad, c.id); note(fmt(t("assigned"), { n: c.name, k: o.pad })); renderAll(); } return; }
    if (o.tl) { insertClip(c.id, insertIdx(xToT(e.clientX - V.tcv.getBoundingClientRect().left))); return; }
    if (o.item != null && o.item !== c.id) { var a = P.clips.indexOf(c); P.clips.splice(a, 1); P.clips.splice(P.clips.indexOf(clipById(o.item)), 0, c); renderLib(); return; }
    if (o.libEnd) { P.clips.splice(P.clips.indexOf(c), 1); P.clips.push(c); renderLib(); }
  }

  // ---------- Klicks, Regler, Tasten ----------
  function onClick(e) {
    if (!V) return;
    var cx = e.target.closest("[data-cx]"); if (cx) { removeClip(+cx.dataset.cx); return; }
    var px = e.target.closest("[data-px]"); if (px) { var k = +px.dataset.px; if (REC && REC.cur && REC.cur.slot === k) return; pushUndo(); releaseS(clipById(P.slots[k])); P.slots[k] = null; renderAll(); return; }
    var pad = e.target.closest(".sf-pad"); if (pad) { liveHit(+pad.dataset.k); return; }
    var rt = e.target.closest("[data-ratio]"); if (rt) { setRatio(rt.getAttribute("data-ratio")); rt.blur(); return; }
    var fsg = e.target.closest("[data-fxseg]");
    if (fsg) { var q = fsg.getAttribute("data-fxseg").split(":"); fxSet(q[0])[q[1]] = q[2]; fsg.parentNode.querySelectorAll("button").forEach(function (o) { o.setAttribute("aria-pressed", String(o === fsg)); }); fsg.blur(); return; }
    var frs = e.target.closest("[data-fxreset]");
    if (frs) { var ty0 = frs.getAttribute("data-fxreset"); P.fxSet[ty0] = Object.assign({}, FXDEF[ty0].def); renderFxSet(); return; }
    var b = e.target.closest("[data-a]"); if (!b) return;
    var a = b.dataset.a; if (b.blur) b.blur();
    if (V.exporting && a !== "exp-cancel") return;
    if (a === "import") V.root.querySelector("#sf-file").click();
    else if (a === "music") V.root.querySelector("#sf-mfile").click();
    else if (a === "music-del") { if (PL.on) stopPlay(); P.music = null; renderSide(); }
    else if (a === "full") { var r = V.root; if (document.fullscreenElement) document.exitFullscreen().catch(noop); else if (r.requestFullscreen) r.requestFullscreen().catch(noop); }
    else if (a === "export") openModal("export");
    else if (a === "help") openModal("help");
    else if (a === "play") togglePlay();
    else if (a === "split") splitAt();
    else if (a === "del") delSel();
    else if (a === "undo") undo();
    else if (a === "redo") redo();
    else if (a === "zin") zoom(1.4);
    else if (a === "zout") zoom(1 / 1.4);
    else if (a === "fill") { if (!REC) { pushUndo(); autoFill(false); renderAll(); } }
    else if (a === "reset") resetCounters();
    else if (a === "fxkey") { V.fxLearn = V.fxLearn === b.dataset.fx ? null : b.dataset.fx; renderFx(); if (V.fxLearn) note(t("fxLearn")); }
    else if (a === "mode-cont" || a === "mode-rand") setMode(a === "mode-rand" ? "rand" : "cont");
    else if (a === "fill-p" || a === "fit-p") { if (selSeg()) { pushUndo(); setSelProp("fit", a === "fit-p" ? "fit" : "fill"); } }
    else if (a === "toall") { var s = selSeg(); if (s) { pushUndo(); P.segs.forEach(function (g) { g.anim = s.anim; g.as = s.as; g.ad = s.ad; g.fit = s.fit; }); } }
    else if (a === "exp-go") { var f = V.root.querySelector('input[name="sf-fps"]:checked'); doExport(f ? +f.value : 30); }
    else if (a === "exp-cancel") { if (V.exporting) cancelReq = true; else closeModal(); }
    else if (a === "close") closeModal();
  }
  function onDbl(e) { var it = e.target.closest(".sf-clip"); if (it && !e.target.closest("[data-cx]")) insertClip(+it.dataset.c); }
  function onInput(e) {
    var id = e.target.id, v = +e.target.value, r = V.root;
    var fs = e.target.getAttribute && e.target.getAttribute("data-fxs");
    if (fs) { var pr = fs.split(":"), c = fxCtl(pr[0], pr[1]); fxSet(pr[0])[pr[1]] = c.type === "check" ? e.target.checked : v; if (c.type !== "check") r.querySelector("#" + id + "-v").textContent = fxVal(c, v); return; }
    if (id === "sf-lstr") { P.live.as = v / 100; r.querySelector("#sf-lstr-v").textContent = v + " %"; }
    else if (id === "sf-ldur") { P.live.ad = v / 100; r.querySelector("#sf-ldur-v").textContent = sec(v / 100); }
    else if (id === "sf-cvol") { P.clipVol = v / 100; r.querySelector("#sf-cvol-v").textContent = v + " %"; P.clips.forEach(function (c) { if (c.vT) setVol(c.vT); if (c.vS) setVol(c.vS); }); }
    else if (id === "sf-mvol") { P.musicVol = v / 100; r.querySelector("#sf-mvol-v").textContent = v + " %"; if (PL.mgain) PL.mgain.gain.value = P.musicVol; }
    else if (id === "sf-astr" || id === "sf-adur") {
      if (!V.sliderUndo) { pushUndo(); V.sliderUndo = true; }
      setSelProp(id === "sf-astr" ? "as" : "ad", v / 100);
    }
  }
  function onChange(e) {
    var id = e.target.id;
    if (id === "sf-file" && e.target.files.length) { importFiles(e.target.files); e.target.value = ""; }
    else if (id === "sf-mfile" && e.target.files[0]) { loadMusic(e.target.files[0]); e.target.value = ""; }
    else if (id === "sf-lanim") P.live.anim = e.target.value;
    else if (id === "sf-anim") { if (selSeg()) { pushUndo(); setSelProp("anim", e.target.value); } }
    else if (id === "sf-astr" || id === "sf-adur") V.sliderUndo = false;
    if (e.target.tagName === "SELECT" || e.target.type === "range") e.target.blur();
  }
  function digitOf(code) { var m = /^(?:Digit|Numpad)(\d)$/.exec(code); return m ? +m[1] : -1; }
  function onKey(e) {
    if (!V) return;
    ac();
    var tg = e.target, tag = (tg && tg.tagName) || "";
    if (tag === "TEXTAREA" || (tag === "INPUT" && tg.type !== "range")) return;
    if (!V.root.querySelector("#sf-modal").hidden) { if (e.code === "Escape" && !V.exporting) closeModal(); return; }
    if (V.fxLearn) {                                   // Buchstabe für einen Effekt festlegen
      e.preventDefault();
      if (e.code === "Escape") { V.fxLearn = null; renderFx(); return; }
      if (!/^Key[A-Z]$/.test(e.code) || FX_RESERVED.indexOf(e.code) >= 0) { note(t("fxBadKey")); return; }
      fxSetKey(V.fxLearn, e.code); V.fxLearn = null; renderFx(); renderFxSet(); note(""); return;
    }
    var mod0 = e.ctrlKey || e.metaKey || e.altKey, fty = mod0 ? null : fxTypeForCode(e.code);
    if (fty) { e.preventDefault(); if (!e.repeat) fxPress(fty); return; }
    var d = digitOf(e.code);
    if (d >= 0) {
      if (e.ctrlKey || e.metaKey) return;
      e.preventDefault(); if (e.repeat) return;
      if (e.shiftKey) {
        if (!P.selClip || !clipById(P.selClip)) { note(t("pickFirst")); return; }
        if (REC && REC.cur && REC.cur.slot === d) return;
        pushUndo(); assign(d, P.selClip); note(fmt(t("assigned"), { n: clipById(P.selClip).name, k: d })); renderAll(); return;
      }
      liveHit(d); return;
    }
    var mod = e.ctrlKey || e.metaKey;
    switch (e.code) {
      case "Space": case "NumpadEnter": e.preventDefault(); if (!e.repeat) togglePlay(); break;
      case "Escape": if (PL.on) stopPlay(); else { P.sel = 0; P.selFx = 0; updateBar(); } break;
      case "KeyS": if (!mod) { e.preventDefault(); splitAt(); } break;
      case "Delete": case "Backspace": e.preventDefault(); delSel(); break;
      case "KeyZ": if (mod) { e.preventDefault(); if (e.shiftKey) redo(); else undo(); } break;
      case "KeyY": if (mod) { e.preventDefault(); redo(); } break;
      case "Home": e.preventDefault(); seekTo(0); break;
      case "End": e.preventDefault(); seekTo(total()); break;
      case "ArrowLeft": case "ArrowRight":
        if (tag === "INPUT") return;
        e.preventDefault(); if (!PL.on) seekTo(P.T + (e.code === "ArrowLeft" ? -1 : 1) * (e.shiftKey ? 1 : 1 / 30)); break;
      case "NumpadAdd": case "Equal": case "BracketRight": e.preventDefault(); zoom(1.4); break;
      case "NumpadSubtract": case "Minus": case "Slash": e.preventDefault(); zoom(1 / 1.4); break;
    }
  }
  function onKeyUp(e) { if (!V) return; var ty = fxTypeForCode(e.code); if (ty) { e.preventDefault(); fxRelease(ty); } }
  function onBlur() { if (!V) return; Object.keys(V.fxHeld).concat(Object.keys(V.fxPeek)).forEach(function (ty) { fxRelease(ty); }); }
  function onDragOver(e) { if (!e.dataTransfer || Array.prototype.indexOf.call(e.dataTransfer.types || [], "Files") < 0) return; e.preventDefault(); V.root.classList.add("drop"); }
  function onDragLeave(e) { if (!e.relatedTarget || !V.root.contains(e.relatedTarget)) V.root.classList.remove("drop"); }
  function onDrop(e) { if (!e.dataTransfer || !e.dataTransfer.files.length) return; e.preventDefault(); V.root.classList.remove("drop"); importFiles(e.dataTransfer.files); }
  function onBeforeUnload(e) { if (P.segs.length) { e.preventDefault(); e.returnValue = t("leave"); return t("leave"); } }
  var rsT = 0;
  function onResize() { clearTimeout(rsT); rsT = setTimeout(layoutStage, 60); }

  // ---------- Dialoge ----------
  function openModal(kind) { if (!V) return; stopPlay(); V.modal = kind; renderModal(); }
  function closeModal() { if (!V || V.exporting) return; V.modal = null; V.root.querySelector("#sf-modal").hidden = true; }
  function expNote(s) { if (!V) return; var n = V.root.querySelector("#sf-pg"); if (n) n.textContent = s; else note(s); }
  function renderModal(keepNote) {
    if (!V || !V.modal) return;
    var m = V.root.querySelector("#sf-modal"), old = keepNote && m.querySelector("#sf-pg") ? m.querySelector("#sf-pg").textContent : "";
    m.hidden = false;
    if (V.modal === "help") {
      m.innerHTML = '<div class="sf-box"><h2>' + t("helpH") + "</h2><p>" + t("help1") + "</p><p>" + t("help2") + "</p><p>" + t("help3") + "</p><p>" + t("help3b") + "</p><p>" + t("help4") + "</p><p>" + t("help5") + "</p><p>" + t("help5b") + "</p><p>" + t("help6") + '</p><div class="sf-btns"><button type="button" data-a="close">' + t("close") + "</button></div></div>";
      return;
    }
    var D = total(), ex = V.exporting;
    m.innerHTML = '<div class="sf-box"><h2>' + t("expH") + "</h2><p>" + fmt(t("expInfo"), { w: OW, h: OH, r: P.ratio }) + "</p>" +
      '<p>' + (lang === "de" ? "Länge" : "Length") + ": <b>" + tc(D, true) + "</b> · " + P.segs.length + " " + (lang === "de" ? "Schnitte" : "cuts") + "</p>" +
      '<div class="sf-btns sf-sw" style="align-items:center"><span style="color:#9C9E99;font-weight:600;font-size:13px;margin-right:6px">' + t("fps") + "</span>" +
      [30, 60].map(function (f) { return '<label style="display:flex;align-items:center;gap:4px;margin-right:10px;font-weight:600"><input type="radio" name="sf-fps" value="' + f + '"' + ((V.fps || 30) === f ? " checked" : "") + (ex ? " disabled" : "") + "> " + f + "</label>"; }).join("") + "</div>" +
      '<p class="sf-pg" id="sf-pg">' + esc(old) + "</p>" +
      '<div class="sf-btns">' + (ex ? "" : '<button type="button" class="pri" data-a="exp-go"' + (D ? "" : " disabled") + ">" + t("expGo") + "</button>") +
      '<button type="button" data-a="exp-cancel">' + (ex ? t("cancel") : t("close")) + "</button></div></div>";
    m.querySelectorAll('input[name="sf-fps"]').forEach(function (r) { r.addEventListener("change", function () { V.fps = +r.value; }); });
    if (!D && !ex) expNote(t("nothing"));
  }

  // ---------- Hauptschleife ----------
  var padT = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!V) return;
    if (PL.on) {
      var T = clock(now);
      if (REC) { P.T = T; liveTick(T); }
      else if (T >= total()) { stopPlay(total()); }
      else { P.T = T; timelineTick(T); }
      if (PL.on) fxTick(P.T);
      if (PL.on || REC) follow();
    } else stillTick();
    drawPreview(); drawTL(); updateTime();
    if (REC && REC.cur && now - padT > 80) {
      padT = now; var k = REC.cur.slot, c = clipById(REC.cur.clip), el = V.root.querySelector("#sf-pr" + k), tx = V.root.querySelector("#sf-pt" + k);
      if (c && el) { var r = padRest(c, k); el.style.width = (r / c.dur * 100).toFixed(1) + "%"; tx.textContent = tc(r); }
    }
  }

  function injectCSS() { var o = document.getElementById("sf-css"); if (o) o.remove(); var s = document.createElement("style"); s.id = "sf-css"; s.textContent = CSS; document.head.appendChild(s); }
  function mount(el, l) {
    unmount();
    lang = l === "en" ? "en" : "de";
    injectCSS();
    el.innerHTML = html();
    var root = el.querySelector("#sf-root");
    V = { root: root, host: el, pcv: root.querySelector("#sf-pv"), tcv: root.querySelector("#sf-tl"), hold: { cv: canvasEl(2, 2), key: "" }, drag: null, ld: null, ldrop: null, exporting: false, modal: null, fps: 30, fxHeld: {}, fxPeek: {}, fxPeekSeed: {}, fxLearn: null }; applyRatio();
    V.px = V.pcv.getContext("2d"); V.tx = V.tcv.getContext("2d");
    root.addEventListener("click", onClick); root.addEventListener("dblclick", onDbl);
    root.addEventListener("input", onInput); root.addEventListener("change", onChange);
    root.addEventListener("pointerdown", onDown);
    V.tcv.addEventListener("pointerdown", onTLDown); V.tcv.addEventListener("wheel", onTLWheel, { passive: false });
    window.addEventListener("pointermove", onMove); window.addEventListener("pointerup", onUp);
    window.addEventListener("keydown", onKey); window.addEventListener("resize", onResize);
    window.addEventListener("keyup", onKeyUp); window.addEventListener("blur", onBlur);
    window.addEventListener("beforeunload", onBeforeUnload);
    root.addEventListener("dragover", onDragOver); root.addEventListener("dragleave", onDragLeave); root.addEventListener("drop", onDrop);
    renderAll(); layoutStage();
    P.slots.forEach(function (id) { if (id) prepS(clipById(id)); });
    raf = requestAnimationFrame(frame);
  }
  function unmount() {
    if (raf) cancelAnimationFrame(raf); raf = 0;
    if (V) {
      cancelReq = true;
      if (PL.on) stopPlay();
      pauseAll();
      if (V.ld && V.ld.gh) V.ld.gh.remove();
      window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp);
      window.removeEventListener("keydown", onKey); window.removeEventListener("resize", onResize);
      window.removeEventListener("keyup", onKeyUp); window.removeEventListener("blur", onBlur);
      window.removeEventListener("beforeunload", onBeforeUnload);
      if (document.fullscreenElement && V.root.contains(document.fullscreenElement)) document.exitFullscreen().catch(noop);
      V = null;
    }
  }

  window.SkapeForm = { mount: mount, unmount: unmount, _debug: function () { return { P: P, REC: REC, PL: PL, liveHit: liveHit, stopPlay: stopPlay, startPlay: startPlay, insertClip: insertClip, splitAt: splitAt, doExport: doExport, fxActive: fxActive, total: total, clock: clock, assign: assign }; } };
})();
