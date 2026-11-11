/* Frame Painter: Video laden, Bild für Bild darübermalen, als MP4 (H.264, Full HD) exportieren.
   Alles läuft im Browser, das Video verlässt das Gerät nicht. */
(function () {
  "use strict";

  var VERSION = "0.52", RATES = [5, 15, 30];
  var lang = "de";
  function L2(de, en) { return { de: de, en: en }; }

  var TX = {
    title: L2("Frame Painter", "Frame Painter"),
    intro: L2("Zieh ein Video auf die Fläche und mal Bild für Bild darüber. Farben nimmst du mit der Pipette direkt aus dem Video. Am Ende exportierst du deine Animation als MP4, auf Wunsch über dem Video. Das Video verlässt dein Gerät nicht.",
              "Drop a video onto the area and paint over it frame by frame. You take colours straight from the video with the picker. Finally export your animation as MP4, over the video if you like. The video never leaves your device."),
    drop: L2("Video hierher ziehen", "Drop a video here"), or: L2("oder", "or"), pick: L2("Video auswählen", "Choose video"),
    dropNote: L2("MP4, MOV oder WebM · bleibt auf deinem Gerät", "MP4, MOV or WebM · stays on your device"),
    other: L2("Anderes Video", "Other video"),
    sure: L2("Neues Video verwirft die ganze Bemalung.", "A new video discards all painting."), sureYes: L2("Trotzdem laden", "Load anyway"), sureNo: L2("Abbrechen", "Cancel"),
    prev: L2("Frame zurück", "Previous frame"), next: L2("Frame vor", "Next frame"),
    frame: L2("Frame {i} / {n}", "Frame {i} / {n}"),
    play: L2("Abspielen", "Play"), pause: L2("Pause", "Pause"),
    copyPrev: L2("Framepaint vom letzten Frame übernehmen", "Copy paint from previous frame"),
    clearF: L2("Frame leeren", "Clear frame"), undo: L2("Rückgängig", "Undo"), redo: L2("Wiederholen", "Redo"),
    onion: L2("Zwiebelhaut (letzter Frame blass)", "Onion skin (previous frame faint)"), hideVid: L2("Video ausblenden", "Hide video"),
    color: L2("Farbe", "Colour"), picker: L2("Pipette (C)", "Picker (C)"), pickOn: L2("Klick ins Bild nimmt die Farbe", "Click the image to take the colour"),
    colorNote: L2("Farben gibt es nur über die Pipette: C drücken, dann mit Linksklick ins Bild. Sie nimmt immer die Farbe aus dem Video unter der Bemalung. Danach malst du sofort mit dieser Farbe.", "Colours come only from the picker: press C, then left-click the image. It always takes the colour from the video beneath the painting. You paint with that colour right away."),
    recent: L2("Zuletzt genommen", "Recently picked"),
    tool: L2("Werkzeug", "Tool"),
    pen: L2("Stift", "Pen"), brush: L2("Pinsel", "Brush"), hair: L2("Haarpinsel", "Hair brush"), hairS: L2("Haar", "Hair"), pressure: L2("Druck", "Pressure"),
    hairNote: L2("Weicher, langhaariger Pinsel: buschig und etwas träge, mit Streifen und Schlieren in der Farbe. Je mehr Druck, desto breiter fächern die Haare auf.", "Soft, long-haired brush: bushy and a little sluggish, with streaks and smears in the paint. The more pressure, the wider the hairs fan out."),
    frameH: L2("Einzelbild", "Single frame"), frameSave: L2("Aktuellen Frame als PNG", "Current frame as PNG"),
    frameInfo: L2("PNG · {w} × {h} (native Auflösung des Videos) · nimmt die Einstellung oben (Video + Painting oder nur Painting)", "PNG · {w} × {h} (the video's native resolution) · uses the setting above (video + painting or painting only)"),
    frameDone: L2("Frame {i} als PNG gespeichert ({w} × {h}).", "Frame {i} saved as PNG ({w} × {h})."), spray: L2("Spraydose", "Spray can"), eraser: L2("Radierer", "Eraser"),
    size: L2("Größe", "Size"), opacity: L2("Deckkraft", "Opacity"), smooth: L2("Glättung", "Smoothing"), hard: L2("Härte", "Hardness"),
    crayon: L2("Wachsmalkreide", "Wax crayon"), crayonS: L2("Kreide", "Crayon"), grain: L2("Körnung", "Grain"),
    ptype: L2("Pinseltyp", "Brush type"), tStroke: L2("Pinsel", "Brush"), tSpray: L2("Spray", "Spray"), tCrayon: L2("Wachsmalkreide", "Wax crayon"),
    mpBatchDone: L2("Magic Paint in {n} Frames übernommen.", "Magic Paint applied to {n} frames."),
    mpNext: L2("Für alle folgenden Frames übernehmen", "Apply to all following frames"), mpAll: L2("Auf alle Frames anwenden", "Apply to all frames"),
    mpBatchNote: L2("Zeichnet jeden Frame mit dieser festen Palette nach, ohne einzeln zu bestätigen. Rechne mit etwa einer bis zwei Sekunden pro Frame. Schon damit bemalte Frames werden übersprungen.", "Redraws every frame with this fixed palette without confirming each one. Expect about one to two seconds per frame. Frames already painted with it are skipped."),
    density: L2("Dichte", "Density"), drop2: L2("Tropfengröße", "Droplet size"),
    smoothNote: L2("Glättung zieht den Strich weich hinter der Maus her, Zittern verschwindet.", "Smoothing lets the stroke trail softly behind the mouse, so jitter disappears."),
    fps: L2("Bildrate", "Frame rate"), fpsLock: L2("Die Bildrate lässt sich nur ändern, solange noch nichts gemalt ist.", "The frame rate can only be changed while nothing is painted yet."),
    fpsInfo: L2("{n} Frames bei {f} Bildern/s", "{n} frames at {f} fps"),
    exportH: L2("Export", "Export"), withVid: L2("Video + Painting", "Video + painting"), onlyPaint: L2("Nur Painting", "Painting only"),
    onlyNote: L2("Nur die Bemalung auf weißem Hintergrund.", "Only the painting on a white background."),
    withNote: L2("Die Bemalung liegt als Overlay über dem Video.", "The painting sits as an overlay on the video."),
    bitrate: L2("Bitrate (variabel)", "Bitrate (variable)"), audio: L2("Ton des Videos mitnehmen", "Keep the video's sound"),
    exportInfo: L2("MP4 · H.264 · {w} × {h} (Full HD) · {f} Bilder/s · variable Bitrate um {br} Mbit/s", "MP4 · H.264 · {w} × {h} (Full HD) · {f} fps · variable bitrate around {br} Mbps"),
    save: L2("Als MP4 exportieren", "Export as MP4"), cancel: L2("Abbrechen", "Cancel"),
    working: L2("Frame {i} von {n} · {p} %", "Frame {i} of {n} · {p}%"), audioW: L2("Ton wird kodiert …", "Encoding sound …"),
    done: L2("Fertig: {mb} MB gespeichert.", "Done: {mb} MB saved."), cancelled: L2("Export abgebrochen.", "Export cancelled."),
    noAudio: L2("Ohne Ton, das Video hat keinen lesbaren Ton oder der Browser kann ihn nicht kodieren.", "Without sound: the video has no readable sound or the browser cannot encode it."),
    noSupport: L2("Dieser Browser kann kein H.264 kodieren. Bitte einen aktuellen Chrome, Edge oder Safari nutzen.", "This browser cannot encode H.264. Please use a current Chrome, Edge or Safari."),
    failed: L2("Export fehlgeschlagen: {e}", "Export failed: {e}"),
    bad: L2("Diese Datei konnte nicht als Video geöffnet werden.", "This file could not be opened as a video."),
    loading: L2("Frame wird geladen …", "Loading frame …"),
    qpApplied: L2("Übernommen. Im nächsten Frame wird dieselbe Farbfläche mit denselben Einstellungen vorbereitet.", "Applied. On the next frame the same colour area is prepared with the same settings."),
    qpRepick: L2("Neue Farbe", "New colour"),
    qpNext: L2("Für alle folgenden Frames übernehmen", "Apply to all following frames"), qpAll: L2("Auf alle Frames anwenden", "Apply to all frames"),
    qpBatchNote: L2("Malt diese Einstellung automatisch in jeden Frame bis zum Ende (oder in alle). Frames, die damit schon bemalt sind, werden übersprungen. Bestehende Bemalung bleibt, Quickpaint kommt darüber.", "Paints this setting automatically into every frame up to the end (or into all). Frames already painted with it are skipped. Existing painting stays, Quickpaint goes on top."),
    qpBatchRun: L2("Frame {i} von {n} wird gemalt …", "Painting frame {i} of {n} …"), qpStop: L2("Stopp", "Stop"),
    qpBatchDone: L2("Quickpaint in {n} Frames übernommen.", "Quickpaint applied to {n} frames."), qpBatchStop: L2("Gestoppt nach {n} Frames.", "Stopped after {n} frames."),
    qpAllDone: L2("Alle Frames haben diese Einstellung schon.", "All frames already have this setting."),
    qpH: L2("Quickpaint", "Quickpaint"), qpStart: L2("Quickpaint starten (Q)", "Start Quickpaint (Q)"),
    qpNote: L2("Q drücken, mit der Pipette eine Farbe im Video wählen: das Bild zeigt live, wo sie vorkommt. Linksklick legt die Farbe fest, dann Härte einstellen (auch per Mausrad) und mit einem zweiten Linksklick ins Bild übernehmen. Gemalt wird in deiner aktuellen Farbe, als Skizze mit Strichen. Esc bricht ab.",
               "Press Q and pick a colour in the video with the picker: the image shows live where it appears. A left click fixes the colour, then set the hardness (mouse wheel works too) and apply with a second left click on the image. It paints in your current colour, as a sketch made of strokes. Esc cancels."),
    qpPick: L2("Farbe im Video wählen · Linksklick legt sie fest", "Pick a colour in the video · left click fixes it"),
    qpTune: L2("Härte einstellen · Linksklick ins Bild übernimmt", "Set the hardness · left click on the image applies"),
    qpHard: L2("Härte", "Hardness"), qpHardNote: L2("Niedrig erfasst auch ähnliche Farben, hoch nur fast genau diese.", "Low also catches similar colours, high only almost exactly this one."),
    qpHuman: L2("Humanize", "Humanize"), qpAngle: L2("Winkel", "Angle"), qpWidth: L2("Strichstärke", "Stroke width"),
    qpOk: L2("Übernehmen", "Apply"), qpNo: L2("Abbrechen", "Cancel"), qpSeed: L2("Andere Variante", "Other variant"),
    qpKey: L2("Farbe", "Colour"),
    mpH: L2("Magic Paint", "Magic Paint"), mpStart: L2("Magic Paint starten (M)", "Start Magic Paint (M)"),
    mpNote: L2("Zeichnet den ganzen Frame automatisch nach: Das Bild wird in Farbbereiche zerlegt und jeder Bereich als eigene Quickpaint-Schicht in seiner Farbe gemalt, große Flächen zuerst mit dicken Strichen, Details zuletzt mit feinen. Jede Schicht bekommt eigene Strichstärke, Härte und einen leicht anderen Winkel. Danach kannst du von Hand nacharbeiten.",
               "Redraws the whole frame automatically: the image is split into colour areas and each area is painted as its own Quickpaint layer in its colour, large areas first with thick strokes, details last with fine ones. Each layer gets its own stroke width, hardness and a slightly different angle. Afterwards you can refine by hand."),
    mpLayers: L2("Qualität (Schichten)", "Quality (layers)"), mpWork: L2("Schicht {i} von {n} wird gemalt …", "Painting layer {i} of {n} …"),
    mpDone: L2("{n} Schichten fertig · Linksklick ins Bild oder Enter übernimmt", "{n} layers done · left click on the image or Enter applies"),
    close: L2("Schließen", "Close"), mpApplied: L2("Übernommen. Geh zum nächsten Frame, dort wird mit derselben Palette und demselben Strichmuster neu gezeichnet.", "Applied. Go to the next frame, it is redrawn there with the same palette and stroke pattern."),
    mpLocked: L2("Palette und Strichmuster sind fixiert und bleiben auf allen Frames gleich. Schichtzahl oder „Neue Palette“ erzeugt eine neue.", "Palette and stroke pattern are locked and stay the same on every frame. Changing the layer count or “New palette” creates a new one."),
    mpNew: L2("Die Palette wird aus diesem Frame berechnet.", "The palette is computed from this frame."),
    mpNewPal: L2("Neue Palette", "New palette"), mpCover: L2("Deckung", "Coverage"),
    mpSlot: L2("Slot {n}", "Slot {n}"), mpEmpty: L2("leer", "empty"), mpLoad: L2("Laden", "Load"), mpSave: L2("Speichern", "Save"),
    mpSaved: L2("Magic-Paint-Palette in Slot {n} gespeichert.", "Magic Paint palette saved to slot {n}."),
    mpSlotsNote: L2("Slots merken sich Palette, Strichmuster und Regler für diese Sitzung. „Speichern“ geht, solange Magic Paint offen ist.", "Slots keep palette, stroke pattern and sliders for this session. “Save” works while Magic Paint is open."),
    mpWidth: L2("Strichstärke (Basis)", "Stroke width (base)"), mpAngle: L2("Winkel (Basis)", "Angle (base)"),
    keys: L2("Tasten: C Pipette · Q Quickpaint · M Magic Paint · D halten: Bemalung ausblenden · P Stift · B Pinsel · H Haarpinsel · S Spray · W Wachsmalkreide · E Radierer · ← → Frame · Leertaste Abspielen · [ ] Größe · Strg+Z Rückgängig", "Keys: C picker · Q Quickpaint · M Magic Paint · hold D: hide painting · P pen · B brush · H hair brush · S spray · W wax crayon · E eraser · ← → frame · Space play · [ ] size · Ctrl+Z undo"),
    howH: L2("So funktioniert’s", "How it works"),
    how1: L2("Das Video wird in Frames zerlegt, je nach Bildrate 5, 15 oder 30 pro Sekunde. Jeder Frame hat seine eigene Malebene. Mit den Pfeilen springst du von Frame zu Frame, und in jedem Frame siehst du genau das, was du dort gemalt hast. Mit „Framepaint vom letzten Frame übernehmen“ holst du die Zeichnung des vorherigen Frames, um sie für die Animation nur leicht anzupassen. Die Zwiebelhaut zeigt den letzten Frame blass darunter.",
              "The video is split into frames, 5, 15 or 30 per second depending on the frame rate. Each frame has its own paint layer. The arrows jump from frame to frame, and each frame shows exactly what you painted there. “Copy paint from previous frame” brings over the drawing of the frame before, so you only adjust it slightly for the animation. Onion skin shows the previous frame faintly underneath."),
    how2: L2("Farben gibt es bewusst nur über die Pipette: C drücken und ins Bild klicken. Stift malt harte Linien, Pinsel weiche, die Spraydose sprüht Punkte und sprüht weiter, solange du die Maustaste hältst. Deckkraft gilt für den ganzen Strich, er wird also nicht fleckig, wo er sich überlappt. Glättung zieht den Strich etwas hinter der Maus her, so werden Linien ruhig. Mit Grafiktablett reagieren Stift und Pinsel auf Druck.",
              "Colours come only from the picker, on purpose: press C and click the image. The pen paints hard lines, the brush soft ones, the spray can sprays dots and keeps spraying while you hold the button. Opacity applies to the whole stroke, so it does not get blotchy where it overlaps. Smoothing lets the stroke trail a little behind the mouse, which calms lines. With a graphics tablet, pen and brush respond to pressure."),
    how4: L2("Quickpaint malt eine Farbfläche automatisch aus, wie ein Chroma Key. Die Härte bestimmt, wie streng die Maske auf die gewählte Farbe reagiert. Gefüllt wird mit Schraffur-Strichen im eingestellten Winkel. Humanize macht daraus eine Handskizze: Striche werden ungleich lang, leicht gebogen, verschieden kräftig, es kommen Kreuzschraffur und skizzierte Umrisse dazu, und die Striche dürfen ein kleines Stück über den Rand laufen, aber nie weit. Solange du D gedrückt hältst, ist die ganze Bemalung ausgeblendet und du siehst das Original.",
               "Quickpaint fills a colour area automatically, like a chroma key. Hardness sets how strictly the mask reacts to the chosen colour. It fills with hatching strokes at the set angle. Humanize turns that into a hand sketch: strokes get uneven lengths, slight curves and varying weight, cross-hatching and sketched outlines are added, and strokes may run slightly past the edge, but never far. While you hold D, all painting is hidden and you see the original."),
    how5: L2("Magic Paint nimmt dir die Schichtarbeit ab: Es sucht die wichtigsten Farben im Frame (4 bis 16, je nach Qualität), sortiert sie nach Fläche und malt jede als Quickpaint-Schicht in genau dieser Farbe. Frühe Schichten sind großzügig und dick und überlappen, spätere werden feiner und genauer. So ist am Ende fast das ganze Bild gezeichnet. Weil jeder Frame neu gezeichnet wird, wirken die Striche im Video lebendig, wie bei echter Handanimation.",
               "Magic Paint takes the layer work off your hands: it finds the main colours in the frame (4 to 16 depending on quality), sorts them by area and paints each as a Quickpaint layer in exactly that colour. Early layers are generous, thick and overlapping, later ones get finer and more precise. In the end almost the whole image is drawn. Because each frame is drawn anew, the strokes look alive in the video, like real hand animation."),
    how3: L2("Der Export rechnet jeden Frame neu und kodiert ihn als H.264 in Full HD, 1920 × 1080, bei Hochkant-Videos 1080 × 1920. Die Bitrate ist variabel, der Regler gibt den Mittelwert vor. Du kannst die Bemalung über dem Video exportieren oder nur die Bemalung auf Weiß.",
              "The export renders every frame again and encodes it as H.264 in Full HD, 1920 × 1080, or 1080 × 1920 for portrait videos. The bitrate is variable, the slider sets the average. You can export the painting over the video, or only the painting on white.")
  };
  function t(k) { return TX[k][lang]; }
  function fmt(s, o) { return s.replace(/\{(\w+)\}/g, function (_, k) { return o[k]; }); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function canvas(w, h) { var c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
  function dec(v, n) { var s = v.toFixed(n); return lang === "de" ? s.replace(".", ",") : s; }

  // ---------- Werkzeuge ----------
  var TOOLS = {
    pen:    { key: "p", set: { size: 4, opacity: 100, smooth: 40 } },
    brush:  { key: "b", set: { size: 26, opacity: 80, smooth: 40, hard: 35 } },
    hair:   { key: "h", set: { size: 34, opacity: 100, smooth: 35, pressure: 50 } },   // Haarpinsel aus Draw Space (v0.55)
    spray:  { key: "s", set: { size: 50, opacity: 100, smooth: 20, density: 45, drop: 2 } },
    crayon: { key: "w", set: { size: 22, opacity: 100, smooth: 30, grain: 55 } },
    eraser: { key: "e", set: { size: 30, opacity: 100, smooth: 30, hard: 70 } }
  };
  var RANGES = { size: [1, 200, "px"], opacity: [1, 100, " %"], smooth: [0, 95, " %"], hard: [0, 100, " %"], density: [1, 100, " %"], drop: [1, 8, "px"], grain: [0, 100, " %"], pressure: [0, 100, " %"] };
  var ICONS = {
    hair: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 2 L20 7 L15.5 11.5 L10.5 6.5 Z" fill="currentColor"/><path d="M10.5 9 C8 11 6 13 3 21 M12 10.5 C9.5 13 7.5 16 5 21.5 M9.5 7.5 C7 9.5 4.5 13 2 19 M13.5 12 C11 14.5 9.5 17.5 7.5 22" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    pen: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20 L6 14 L16 4 L20 8 L10 18 Z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 20 L6 14 L10 18 Z" fill="currentColor"/></svg>',
    brush: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3 L21 10 L13 14 L10 11 Z" fill="currentColor"/><path d="M10 12 C6 12 6 17 3 21 C8 21 12 19 12 15" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    spray: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="8" height="12" fill="none" stroke="currentColor" stroke-width="2"/><rect x="11" y="5" width="4" height="4" fill="currentColor"/><rect x="3" y="4" width="2" height="2" fill="currentColor"/><rect x="5" y="8" width="2" height="2" fill="currentColor"/><rect x="2" y="10" width="2" height="2" fill="currentColor"/><rect x="6" y="3" width="2" height="2" fill="currentColor"/></svg>',
    crayon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19 L4 15 L14 5 L19 10 L9 20 Z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M5 19 L4 15 L7 12 L12 17 L9 20 Z" fill="currentColor"/><path d="M14 5 L16 3 L21 8 L19 10" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    eraser: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 15 L12 6 L19 13 L12 20 L8 20 Z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 15 L7.5 10.5 L14.5 17.5 L12 20 L8 20 Z" fill="currentColor"/><path d="M12 20 H21" stroke="currentColor" stroke-width="2"/></svg>',
    pick: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4 L20 10 L17 13 L11 7 Z" fill="currentColor"/><path d="M12.5 8.5 L5 16 L4 20 L8 19 L15.5 11.5" fill="none" stroke="currentColor" stroke-width="2"/></svg>'
  };

  // ---------- Zustand ----------
  // F: Projekt { file, url, name, dur, vw, vh, fps, n, ow, oh, idx, paints: { i: {cv}|{blob} } }
  var F = null, V = null;
  var S = { qp: { hard: 55, human: 55, angle: 35, width: 9, seed: 7, type: "stroke" }, mp: { layers: 10, human: 55, angle: 35, width: 10, seed: 3, type: "stroke" }, tool: "brush", sets: {}, color: "#1A1A1A", recent: [], onion: false, hideVid: false, mode: "video", mbit: 12, audio: true, fpsI: 1 };
  Object.keys(TOOLS).forEach(function (k) { S.sets[k] = Object.assign({}, TOOLS[k].set); });
  function set() { return S.sets[S.tool]; }
  function painted() { return Object.keys(F ? F.paints : {}).length + (V && V.dirty ? 1 : 0); }
  function tFrame(i) { return Math.min((i + 0.5) / F.fps, Math.max(0, F.dur - 0.001)); }

  // ---------- Laden ----------
  function askLoad(file) {
    storeCurrent();
    if (F && painted()) { V.pendingFile = file; noteSure(); return; }
    loadFile(file);
  }
  function loadFile(file) {
    if (!file || !/^video\//.test(file.type || "") && !/\.(mp4|mov|m4v|webm|mkv)$/i.test(file.name || "")) { note(t("bad")); return; }
    stopPlay();
    if (F && F.url) URL.revokeObjectURL(F.url);
    F = { file: file, url: URL.createObjectURL(file), name: (file.name || "video").replace(/\.[^.]+$/, ""), dur: 0, vw: 0, vh: 0, fps: RATES[S.fpsI], n: 1, ow: 1920, oh: 1080, idx: 0, paints: {} };
    buildUI();
  }
  function onMeta() {
    var v = V.vid;
    F.dur = v.duration || 0; F.vw = v.videoWidth; F.vh = v.videoHeight;
    if (!F.vw || !isFinite(F.dur)) { note(t("bad")); return; }
    if (F.vh > F.vw) { F.ow = 1080; F.oh = 1920; } else { F.ow = 1920; F.oh = 1080; }
    F.n = Math.max(1, Math.floor(F.dur * F.fps));
    V.layer = canvas(F.ow, F.oh); V.stroke = canvas(F.ow, F.oh); V.tmp = canvas(F.ow, F.oh); V.frameCv = canvas(F.ow, F.oh);
    V.lx = V.layer.getContext("2d"); V.sx = V.stroke.getContext("2d");
    layout(); updateSide(); goFrame(F.idx || 0);
  }

  // Videobild "contain" auf Schwarz in die Full-HD-Fläche
  function drawVideo(ctx, vid, W, H) {
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
    var s = Math.min(W / vid.videoWidth, H / vid.videoHeight), w = vid.videoWidth * s, h = vid.videoHeight * s;
    ctx.imageSmoothingQuality = "high"; ctx.drawImage(vid, (W - w) / 2, (H - h) / 2, w, h);
  }
  function seek(v, tm) {
    return new Promise(function (res) {
      if (Math.abs(v.currentTime - tm) < 1e-4 && v.readyState >= 2) { res(); return; }
      var done = function () { v.removeEventListener("seeked", done); res(); };
      v.addEventListener("seeked", done); v.currentTime = tm;
    });
  }

  // ---------- Frames speichern und laden ----------
  function hasInk(cv) {
    var d = cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data;
    for (var i = 3; i < d.length; i += 16) if (d[i]) return true;
    return false;
  }
  function storeCurrent() {
    if (!F || !V || !V.layer || !V.dirty) return;
    V.dirty = false;
    var i = F.idx;
    if (!hasInk(V.layer)) { delete F.paints[i]; drawStrip(); return; }
    var copy = canvas(F.ow, F.oh); copy.getContext("2d").drawImage(V.layer, 0, 0);
    var rec = { cv: copy }; F.paints[i] = rec;
    copy.toBlob(function (b) { if (F && F.paints[i] === rec && b) { delete rec.cv; rec.blob = b; } }, "image/png");
    drawStrip();
  }
  function paintSource(i) {
    var r = F && F.paints[i];
    if (!r) return Promise.resolve(null);
    if (r.cv) return Promise.resolve(r.cv);
    return createImageBitmap(r.blob);
  }
  var loadTok = 0;
  async function goFrame(i) {
    if (!F || !V || !V.layer) return;
    i = clamp(i, 0, F.n - 1);
    if (V.qp) { V.qp.gen = 0; V.qp.mask = null; V.qp.applied = true; }
    if (V.mp) { mpTok++; V.mp.result = null; V.mp.preview = null; }
    storeCurrent();
    var tok = ++loadTok;
    F.idx = i; V.loading = true; V.undo = []; V.redo = [];
    updateBar();
    var res = await Promise.all([paintSource(i), S.onion && i > 0 ? paintSource(i - 1) : null, seek(V.vid, tFrame(i))]);
    if (tok !== loadTok || !V) { [res[0], res[1]].forEach(function (b) { if (b && b.close) b.close(); }); return; }
    V.lx.globalCompositeOperation = "source-over"; V.lx.globalAlpha = 1;
    V.lx.clearRect(0, 0, F.ow, F.oh);
    if (res[0]) { V.lx.drawImage(res[0], 0, 0); if (res[0].close) res[0].close(); }
    if (V.onionBmp && V.onionBmp.close) V.onionBmp.close();
    V.onionBmp = res[1] || null;
    drawVideo(V.frameCv.getContext("2d"), V.vid, F.ow, F.oh);
    V.loading = false; V.dirty = false;
    updateBar(); need();
    if (V.mp) mpRefresh();
    if (V.qp) qpRefresh();
  }
  async function reloadOnion() {
    if (!F || !V) return;
    if (V.onionBmp && V.onionBmp.close) V.onionBmp.close();
    V.onionBmp = S.onion && F.idx > 0 ? await paintSource(F.idx - 1) : null;
    need();
  }

  // ---------- Rückgängig ----------
  function snap() { var c = canvas(F.ow, F.oh); c.getContext("2d").drawImage(V.layer, 0, 0); return c; }
  function pushUndo() { V.undo.push(snap()); if (V.undo.length > 12) V.undo.shift(); V.redo = []; updateBar(); }
  function restore(c) { V.lx.globalCompositeOperation = "source-over"; V.lx.globalAlpha = 1; V.lx.clearRect(0, 0, F.ow, F.oh); V.lx.drawImage(c, 0, 0); V.dirty = true; need(); updateBar(); }
  function undo() { if (!V.undo.length || V.loading) return; V.redo.push(snap()); restore(V.undo.pop()); }
  function redo() { if (!V.redo.length || V.loading) return; V.undo.push(snap()); restore(V.redo.pop()); }
  async function copyPrev() {
    if (!F || F.idx === 0 || V.loading) return;
    var src = await paintSource(F.idx - 1);
    pushUndo();
    V.lx.globalCompositeOperation = "source-over"; V.lx.globalAlpha = 1; V.lx.clearRect(0, 0, F.ow, F.oh);
    if (src) { V.lx.drawImage(src, 0, 0); if (src.close) src.close(); }
    V.dirty = true; need();
  }
  function clearFrame() { if (V.loading) return; pushUndo(); V.lx.clearRect(0, 0, F.ow, F.oh); V.dirty = true; need(); }

  // ---------- Malen ----------
  var dabCache = { key: "", c: null };
  function dab(size, hard, color) {
    var key = size + "|" + hard + "|" + color;
    if (dabCache.key === key) return dabCache.c;
    var r = Math.max(1, size / 2), d = Math.ceil(r * 2) + 2, c = canvas(d, d), x = c.getContext("2d");
    var g = x.createRadialGradient(d / 2, d / 2, 0, d / 2, d / 2, r), h = clamp(hard / 100, 0, 0.98);
    g.addColorStop(0, color); g.addColorStop(h, color); g.addColorStop(1, color.length === 7 ? color + "00" : "rgba(0,0,0,0)");
    x.fillStyle = g; x.beginPath(); x.arc(d / 2, d / 2, r, 0, Math.PI * 2); x.fill();
    dabCache = { key: key, c: c };
    return c;
  }
  // Papierkörnung für Wachsmalkreide: kachelbares Rauschen, die Schwelle steuert, wie viel Papier durchscheint
  var GRAIN = null, grainCache = {};
  function grainTile() {
    if (GRAIN) return GRAIN;
    var N = 256, out = new Float32Array(N * N), R = rng(4242);
    [[32, 0.22], [64, 0.3], [128, 0.28], [256, 0.2]].forEach(function (o) {
      var g = o[0], v = new Float32Array(g * g); for (var i = 0; i < v.length; i++) v[i] = R();
      for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
        var fx = x / N * g, fy = y / N * g, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0, x1 = (x0 + 1) % g, y1 = (y0 + 1) % g;
        tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
        var a = v[y0 * g + x0] * (1 - tx) + v[y0 * g + x1] * tx, b = v[y1 * g + x0] * (1 - tx) + v[y1 * g + x1] * tx;
        out[y * N + x] += (a * (1 - ty) + b * ty) * o[1];
      }
    });
    GRAIN = out; return out;
  }
  function grainCanvas(amount) {   // amount 0..100
    var key = Math.round(amount); if (grainCache[key]) return grainCache[key];
    var g = grainTile(), N = 256, c = canvas(N, N), x = c.getContext("2d"), id = x.createImageData(N, N), th = 0.3 + key / 100 * 0.28;
    for (var i = 0; i < N * N; i++) { var a = clamp((g[i] - th) / 0.07, 0, 1); id.data[i * 4 + 3] = Math.round(a * 255); }
    x.putImageData(id, 0, 0); grainCache[key] = c; return c;
  }
  function applyGrain(ctx, W, H, amount, ox, oy) {
    var pat = ctx.createPattern(grainCanvas(amount), "repeat");
    ctx.save(); ctx.globalCompositeOperation = "destination-in"; ctx.globalAlpha = 1;
    ctx.translate(ox || 0, oy || 0); ctx.fillStyle = pat; ctx.fillRect(-(ox || 0), -(oy || 0), W, H); ctx.restore();
  }
  function grainedStroke() {   // Strichebene mit Körnung in V.tmp
    var tx = V.tmp.getContext("2d"); tx.globalCompositeOperation = "source-over"; tx.globalAlpha = 1; tx.clearRect(0, 0, F.ow, F.oh); tx.drawImage(V.stroke, 0, 0);
    applyGrain(tx, F.ow, F.oh, set().grain, 0, 0); return V.tmp;
  }
  function inkColor() { return S.tool === "eraser" ? "#000000" : S.color; }
  function pressureSize(st, p) { return Math.max(1, st.size * (V.pen ? 0.25 + 0.75 * p : 1)); }
  // ---------- Haarpinsel (übernommen aus Draw Space) ----------
  // Viele feine Haare, jedes folgt der Spitze leicht verzögert (träge), mit eigener Farbnuance und Farbmenge.
  // Die Farbe geht im Strich langsam aus, trockene Haare setzen aus: so entstehen Streifen und Schlieren.
  function hexRgb(h) { var n = parseInt(String(h).slice(1, 7), 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function shade(rgb, f) { return "rgb(" + rgb.map(function (v) { return clamp(Math.round(f > 0 ? v + (255 - v) * f : v * (1 + f)), 0, 255); }).join(",") + ")"; }
  var HAIR = {
    begin: function (E, p) {
      var o = E.o, n = clamp(Math.round(o.size * 0.8), 10, 70), R = E.R; E.h = [];
      for (var i = 0; i < n; i++) { var r = Math.sqrt(R()) * 0.5, a = R() * Math.PI * 2, sh = (R() - 0.5) * 0.32; E.h.push({ ox: Math.cos(a) * r, oy: Math.sin(a) * r, w: 0.035 + 0.065 * R(), al: 0.35 + 0.5 * R(), c: shade(E.rgb, sh), k: 0.22 + 0.45 * R(), load: 0.8 + 0.2 * R(), dry: 0.6 + 0.8 * R(), x: null, y: null }); }
      E.last = p; this.at(E, p, 0);
    },
    step: function (E, p) {   // Wegstück in gleich lange Schritte teilen
      var a = E.last, dx = p.x - a.x, dy = p.y - a.y, L = Math.hypot(dx, dy), n = Math.max(1, Math.ceil(L / Math.max(1, E.o.size * 0.1)));
      for (var i = 1; i <= n; i++) this.at(E, { x: a.x + dx * i / n, y: a.y + dy * i / n, p: a.p + (p.p - a.p) * i / n }, L / n);
      E.last = p;
    },
    at: function (E, q, d) {
      var o = E.o, pr = o.pressure / 100, splay = o.size * (0.5 + 0.75 * pr) * (E.pen ? 0.4 + 0.6 * q.p : 1), wm = o.size * (0.6 + 0.9 * pr), segs = [], R = E.R;
      E.h.forEach(function (h) {
        var tx = q.x + h.ox * splay, ty = q.y + h.oy * splay;
        if (h.x === null) { h.x = tx; h.y = ty; }
        var nx = h.x + (tx - h.x) * h.k, ny = h.y + (ty - h.y) * h.k;
        h.load = Math.max(0.18, h.load - d / (o.size * 55) * h.dry * (1 - 0.4 * pr));
        if (R() > 0.08 + (1 - h.load) * 0.5 || d === 0) segs.push([h.x, h.y, nx, ny, Math.max(0.4, h.w * wm), h.al * (0.35 + 0.65 * h.load), h.c]);
        h.x = nx; h.y = ny;
      });
      if (!segs.length) return;
      var x = V.sx; x.lineCap = "round";
      segs.forEach(function (sg) { x.globalAlpha = sg[5]; x.strokeStyle = sg[6]; x.lineWidth = sg[4]; x.beginPath(); x.moveTo(sg[0], sg[1]); x.lineTo(sg[2] === sg[0] && sg[3] === sg[1] ? sg[2] + 0.01 : sg[2], sg[3]); x.stroke(); });
      x.globalAlpha = 1;
    }
  };
  // Ein Wegstück von a nach b auf die Strichebene
  function segment(a, b) {
    var st = set(), x = V.sx, col = inkColor();
    if (S.tool === "hair") {
      if (V.first) { V.hb = { o: st, pen: V.pen, R: rng((Math.random() * 2147483647) | 0), rgb: hexRgb(S.color) }; HAIR.begin(V.hb, a); V.first = false; }
      if (b.x !== a.x || b.y !== a.y || b.p !== a.p) HAIR.step(V.hb, b);
      return;
    }
    if (S.tool === "pen") {
      x.strokeStyle = col; x.lineCap = "round"; x.lineJoin = "round"; x.lineWidth = pressureSize(st, b.p);
      x.beginPath(); x.moveTo(a.x, a.y); x.lineTo(b.x, b.y); x.stroke();
      return;
    }
    if (S.tool === "spray") { sprayAt(b, Math.hypot(b.x - a.x, b.y - a.y)); return; }
    if (S.tool === "crayon") {   // Grundform: harte Linie mit leicht ausgefransten Rändern, die Körnung kommt beim Zeichnen dazu
      var cw = pressureSize(st, b.p), cl = Math.hypot(b.x - a.x, b.y - a.y);
      x.strokeStyle = col; x.fillStyle = col; x.lineCap = "round"; x.lineJoin = "round"; x.lineWidth = cw * 0.86;
      x.beginPath(); x.moveTo(a.x, a.y); x.lineTo(b.x, b.y); x.stroke();
      var nn = Math.max(1, Math.round(cl / Math.max(2, cw * 0.15)));
      for (var ci = 0; ci < nn; ci++) {
        var tt2 = Math.random(), an2 = Math.random() * Math.PI * 2, rr = cw * (0.36 + Math.random() * 0.16);
        x.beginPath(); x.arc(a.x + (b.x - a.x) * tt2 + Math.cos(an2) * rr, a.y + (b.y - a.y) * tt2 + Math.sin(an2) * rr, cw * (0.04 + Math.random() * 0.07), 0, Math.PI * 2); x.fill();
      }
      return;
    }
    var sz = pressureSize(st, b.p), img = dab(Math.round(sz), st.hard, col), gap = Math.max(1, sz * 0.12);
    var dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy), acc = V.rest || 0;
    if (len === 0 && !V.first) return;
    if (V.first) { x.drawImage(img, a.x - img.width / 2, a.y - img.height / 2); V.first = false; }
    var d = gap - acc;
    while (d <= len) { var px = a.x + dx * d / len, py = a.y + dy * d / len; x.drawImage(img, px - img.width / 2, py - img.height / 2); d += gap; }
    V.rest = len - (d - gap);
  }
  function sprayAt(p, moved) {
    var st = set(), x = V.sx, r = st.size / 2, n = Math.max(1, Math.round(st.density / 100 * (r * r) / 40 * (0.6 + Math.min(1, moved / Math.max(4, r)) * 0.8)));
    x.fillStyle = inkColor();
    for (var k = 0; k < n; k++) {
      var a = Math.random() * Math.PI * 2, d = r * Math.sqrt(Math.random()), s = st.drop * (0.6 + Math.random() * 0.8);
      x.beginPath(); x.arc(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, s / 2, 0, Math.PI * 2); x.fill();
    }
  }
  function toFrame(e) {
    var r = V.cv.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * F.ow, y: (e.clientY - r.top) / r.height * F.oh, p: e.pressure || 0.5 };
  }
  function smoothStep(raw) {
    var k = 1 - set().smooth / 100 * 0.94, s = V.sm;
    var nx = { x: s.x + (raw.x - s.x) * k, y: s.y + (raw.y - s.y) * k, p: s.p + (raw.p - s.p) * k };
    segment(s, nx); V.sm = nx;
  }
  function commitStroke() {
    var st = set();
    V.lx.globalAlpha = st.opacity / 100;
    V.lx.globalCompositeOperation = S.tool === "eraser" ? "destination-out" : "source-over";
    V.lx.drawImage(S.tool === "crayon" ? grainedStroke() : V.stroke, 0, 0);
    V.lx.globalAlpha = 1; V.lx.globalCompositeOperation = "source-over";
    V.sx.clearRect(0, 0, F.ow, F.oh);
    V.dirty = true;
  }

  // ---------- Pipette ----------
  // Pipette nimmt immer die Farbe aus dem Video-Frame, nie aus der Bemalung darüber
  function sample(p) { return sampleVideo(p); }
  function setPick(on) { V.picking = on; V.cv && V.cv.classList.toggle("pick", on); var b = V.root.querySelector('[data-fp="pick"]'); if (b) b.setAttribute("aria-pressed", String(on)); need(); }
  function takeColor(c) {
    S.color = c;
    S.recent = [c].concat(S.recent.filter(function (q) { return q !== c; })).slice(0, 10);
    if (S.tool === "eraser") S.tool = V.lastPaintTool || "brush";
    updateSide();
  }

  // ---------- Quickpaint (Chroma Key + Skizze) ----------
  // V.qp = { stage: "pick" | "tune", key: [L,a,b], hover: [L,a,b] }
  var LIN = (function () { var a = new Float32Array(256); for (var i = 0; i < 256; i++) { var c = i / 255; a[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); } return a; })();
  function labOf(r, g, b, out, o) {
    var R = LIN[r], G = LIN[g], B = LIN[b];
    var X = (0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047, Y = 0.2126 * R + 0.7152 * G + 0.0722 * B, Z = (0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883;
    var fx = X > 0.008856 ? Math.cbrt(X) : 7.787 * X + 0.138, fy = Y > 0.008856 ? Math.cbrt(Y) : 7.787 * Y + 0.138, fz = Z > 0.008856 ? Math.cbrt(Z) : 7.787 * Z + 0.138;
    out[o] = 116 * fy - 16; out[o + 1] = 500 * (fx - fy); out[o + 2] = 200 * (fy - fz);
  }
  function labGrid(w) {
    var h = Math.max(1, Math.round(w * F.oh / F.ow)), c = canvas(w, h), x = c.getContext("2d");
    x.imageSmoothingQuality = "high"; x.drawImage(V.frameCv, 0, 0, w, h);
    var d = x.getImageData(0, 0, w, h).data, L = new Float32Array(w * h * 3);
    for (var i = 0, j = 0; i < d.length; i += 4, j += 3) labOf(d[i], d[i + 1], d[i + 2], L, j);
    return { w: w, h: h, L: L, rgb: d };
  }
  function qpGrids() {
    if (!V.qg || V.qg.idx !== F.idx) V.qg = { idx: F.idx, s: labGrid(480), m: labGrid(960) };
    return V.qg;
  }
  // Maske 0..1: weich um den Schwellwert, Härte 100 = nur fast exakt die Farbe
  function maskOf(G, key, hard) {
    var n = G.w * G.h, m = new Float32Array(n), T = 3 + (100 - hard) / 100 * 45, e = Math.max(1.5, T * 0.3), L = G.L;
    for (var i = 0, j = 0; i < n; i++, j += 3) {
      var dl = (L[j] - key[0]) * 0.6, da = L[j + 1] - key[1], db = L[j + 2] - key[2], d = Math.sqrt(dl * dl + da * da + db * db);
      m[i] = d <= T - e ? 1 : d >= T + e ? 0 : (T + e - d) / (2 * e);
    }
    return m;
  }
  function labAt(G, p) { var x = clamp(Math.floor(p.x / F.ow * G.w), 0, G.w - 1), y = clamp(Math.floor(p.y / F.oh * G.h), 0, G.h - 1), j = (y * G.w + x) * 3; return [G.L[j], G.L[j + 1], G.L[j + 2]]; }
  // Sichtbare Maske: diagonale Schwarz-Weiß-Streifen, auf jeder Farbe gut zu erkennen
  function maskView(m, G, alpha) {
    var c = V.qView && V.qView.width === G.w ? V.qView : (V.qView = canvas(G.w, G.h)), x = c.getContext("2d"), id = x.createImageData(G.w, G.h), d = id.data;
    for (var y = 0, i = 0; y < G.h; y++) for (var xx = 0; xx < G.w; xx++, i++) {
      var v = ((xx + y) >> 2) & 1 ? 255 : 20, a = m[i] * alpha * 255, o = i * 4;
      d[o] = v; d[o + 1] = v; d[o + 2] = v; d[o + 3] = a;
    }
    x.putImageData(id, 0, 0);
    return c;
  }
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t2 = Math.imul(seed ^ seed >>> 15, 1 | seed); t2 = t2 + Math.imul(t2 ^ t2 >>> 7, 61 | t2) ^ t2; return ((t2 ^ t2 >>> 14) >>> 0) / 4294967296; }; }
  function startQP() {
    if (!F || !V.layer || V.loading || V.playing || V.down) return;
    if (V.mp) endMP();
    setPick(false); qpGrids();
    V.qp = { stage: "pick", key: null, hover: null, mask: null, sketch: null, gen: 0, done: {} };
    qpPanel(); need();
  }
  function endQP() { V.qp = null; V.qView = null; var pn = V.root.querySelector("#fp-qp"); if (pn) pn.hidden = true; need(); }
  function qpFix(p) {
    var G = qpGrids(); V.qp.key = labAt(G.m, p); V.qp.keyHex = sampleVideo(p); V.qp.stage = "tune";
    qpMask(); qpGenSoon(0); qpPanel();
  }
  function qpMask() { var G = qpGrids(), k = V.qp.stage === "tune" ? V.qp.key : V.qp.hover; V.qp.mask = k ? maskView(maskOf(G.s, k, S.qp.hard), G.s, V.qp.stage === "tune" ? 0.16 : 0.85) : null; need(); }
  function qpGenSoon(ms) { if (V.qp.applied) { V.qp.applied = false; qpPanel(); } V.qp.gen = performance.now() + (ms === undefined ? 90 : ms); }
  function qpApply() {
    if (!V.qp || V.qp.stage !== "tune" || V.qp.applied) return;
    if (V.qp.gen) { buildSketch(); V.qp.gen = 0; }
    pushUndo();
    V.lx.globalAlpha = 1; V.lx.globalCompositeOperation = "source-over"; V.lx.drawImage(V.qp.sketch, 0, 0);
    V.dirty = true; V.qp.applied = true; V.qp.done[F.idx] = true;   // Fenster bleibt offen, Einstellung gilt im nächsten Frame weiter
    qpPanel(); need(); updateBar();
  }
  // Stapel: dieselbe Quickpaint-Einstellung Frame für Frame anwenden, ohne jedes Mal zu bestätigen.
  // Frames, die in dieser Sitzung schon damit bemalt wurden, werden übersprungen.
  async function qpBatch(all) {
    if (!V.qp || V.qp.stage !== "tune" || V.batch) return;
    var q = V.qp, from = all ? 0 : F.idx, to = F.n - 1, start = F.idx, list = [];
    for (var i = from; i <= to; i++) if (!q.done[i]) list.push(i);
    if (!list.length) { note(t("qpAllDone")); return; }
    V.batch = { stop: false, i: 0, n: list.length }; qpPanel();
    try {
      for (var k = 0; k < list.length; k++) {
        if (V.batch.stop || !V || V.qp !== q) break;
        V.batch.i = k + 1; qpBatchNote();
        if (F.idx !== list[k]) await goFrame(list[k]);
        if (!V || V.qp !== q || F.idx !== list[k]) break;
        q.gen = 0; buildSketch();
        V.lx.globalAlpha = 1; V.lx.globalCompositeOperation = "source-over"; V.lx.drawImage(q.sketch, 0, 0);
        V.dirty = true; q.done[F.idx] = true; q.applied = true; need();
        await new Promise(function (r) { setTimeout(r, 0); });
      }
    } finally {
      var stopped = V && V.batch && V.batch.stop, cnt = V && V.batch ? V.batch.i : 0;
      if (V) {
        V.batch = null;
        if (V.qp === q) { await goFrame(start); q.applied = !!q.done[F.idx]; q.mask = q.applied ? null : q.mask; qpPanel(); need(); }
        note(fmt(t(stopped ? "qpBatchStop" : "qpBatchDone"), { n: cnt }));
        updateSide();
      }
    }
  }
  function qpBatchNote() { var el = V.root.querySelector("#fp-qbat"); if (el && V.batch) el.textContent = fmt(t("qpBatchRun"), { i: V.batch.i, n: V.batch.n }); }
  function qpRefresh() {   // nach Frame-Wechsel: gleiche Farbe und Einstellungen auf das neue Bild
    if (!V.qp) return;
    V.qp.hover = null; V.qp.mask = null;
    if (V.batch) { V.qp.applied = true; return; }   // Stapel malt selbst
    V.qp.applied = !!V.qp.done[F.idx] && V.qp.stage === "tune";
    if (V.qp.stage === "tune" && !V.qp.applied) { qpMask(); V.qp.gen = performance.now() + 60; }
    qpPanel();
  }
  function sampleVideo(p) {
    var c = V.pick1 || (V.pick1 = canvas(1, 1)), x = c.getContext("2d", { willReadFrequently: true });
    x.drawImage(V.frameCv, clamp(Math.floor(p.x), 0, F.ow - 1), clamp(Math.floor(p.y), 0, F.oh - 1), 1, 1, 0, 0, 1, 1);
    var d = x.getImageData(0, 0, 1, 1).data;
    return "#" + [d[0], d[1], d[2]].map(function (v) { return (v < 16 ? "0" : "") + v.toString(16); }).join("").toUpperCase();
  }
  // Skizze bauen. Die Lage der Striche ist ein fester, gerüttelter Raster über der Maske, unabhängig vom Winkel.
  // Der Winkel dreht nur jeden einzelnen Strich um seine eigene Mitte. Jeder Strich wird entlang seiner Richtung
  // auf die Farbfläche gekürzt und darf nur ein kleines Stück überstehen, am Ende beschneidet die leicht erweiterte Maske alles.
  function buildSketch() {
    var G = qpGrids().m;
    V.qp.sketch = V.qp.sketch && V.qp.sketch.width === F.ow ? V.qp.sketch : canvas(F.ow, F.oh);
    sketch(maskOf(G, V.qp.key, S.qp.hard), { color: S.color, width: S.qp.width, human: S.qp.human, angle: S.qp.angle, seed: S.qp.seed * 7919, type: S.qp.type }, V.qp.sketch);
    need();
  }
  function sketch(raw, o, out) {
    var G = qpGrids().m, mw = G.w, mh = G.h, n = mw * mh, i;
    var bl = new Float32Array(n);
    for (var y = 0; y < mh; y++) for (var x = 0; x < mw; x++) {
      var sum = 0, cnt = 0;
      for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) { var yy = y + dy, xx = x + dx; if (yy >= 0 && yy < mh && xx >= 0 && xx < mw) { sum += raw[yy * mw + xx]; cnt++; } }
      bl[y * mw + x] = sum / cnt;
    }
    var M = new Uint8Array(n); for (i = 0; i < n; i++) M[i] = bl[i] >= 0.5 ? 1 : 0;
    var f = mw / F.ow, h = o.human / 100, sc = F.oh / 1080, w = o.width * sc, R = rng(o.seed), keep = o.keep == null ? 1 : o.keep, am = 1, type = o.type || "stroke";
    function inside(px, py) { var mx = Math.floor(px * f), my = Math.floor(py * f); return mx >= 0 && my >= 0 && mx < mw && my < mh && M[my * mw + mx] === 1; }
    var g2 = out.getContext("2d");
    g2.globalCompositeOperation = "source-over"; g2.globalAlpha = 1; g2.clearRect(0, 0, F.ow, F.oh);
    g2.fillStyle = o.color;
    // Spray: einige Sprühstempel in der Farbe, entlang des Strichs gesetzt
    var sprays = null;
    if (type === "spray") {
      sprays = [];
      for (var sv = 0; sv < 4; sv++) {
        var S0 = Math.max(16, Math.round(w * 2.4)), sc0 = canvas(S0, S0), sx0 = sc0.getContext("2d"); sx0.fillStyle = o.color;
        for (var d0 = 0, dn = Math.round(S0 * S0 * 0.07); d0 < dn; d0++) { var ra = Math.sqrt(-2 * Math.log(Math.max(1e-6, R()))) * 0.36, aa = R() * Math.PI * 2; if (ra > 1) continue; var ds = (1 + R() * 2.2 * (1 - ra * 0.6)) * Math.max(1, sc); sx0.fillRect(S0 / 2 + Math.cos(aa) * ra * S0 / 2 - ds / 2, S0 / 2 + Math.sin(aa) * ra * S0 / 2 - ds / 2, ds, ds); }
        sprays.push(sc0);
      }
    }
    // Strich als gefülltes Band mit schräg abgeschnittenen Enden, wie ein leicht schräg gehaltener flacher Pinsel.
    // Beide Enden haben meist denselben Schnittwinkel (parallel), manchmal einen eigenen; nie abgerundet.
    var nib = (R() - 0.5) * 1.2;   // Grundneigung des "Pinsels" für diese Schicht
    function ribbon(x0, y0, qx, qy, x1, y1, lw, al) {
      var L = Math.hypot(x1 - x0, y1 - y0) + Math.hypot(qx - (x0 + x1) / 2, qy - (y0 + y1) / 2);
      var seg = Math.max(2, Math.min(14, Math.ceil(L / Math.max(4, lw * 1.2)))), hw = lw / 2, lft = [], rgt = [], k;
      var sk0 = clamp(nib + (R() - 0.5) * (0.5 + 1.2 * h), -1.15, 1.15), sk1 = R() < 0.7 ? sk0 : clamp(nib + (R() - 0.5) * (0.6 + 1.2 * h), -1.15, 1.15);
      var t0 = Math.tan(sk0), t1 = Math.tan(sk1), sw = 1 + (R() - 0.5) * 0.25 * h;
      for (k = 0; k <= seg; k++) {
        var tt = k / seg, it = 1 - tt;
        var px = it * it * x0 + 2 * it * tt * qx + tt * tt * x1, py = it * it * y0 + 2 * it * tt * qy + tt * tt * y1;
        var dx = 2 * it * (qx - x0) + 2 * tt * (x1 - qx), dy = 2 * it * (qy - y0) + 2 * tt * (y1 - qy), dl = Math.hypot(dx, dy) || 1;
        var ux = dx / dl, uy = dy / dl, nx = -uy, ny = ux, ww = hw * (1 + (sw - 1) * tt);
        var sh = k === 0 ? t0 * ww : k === seg ? t1 * ww : 0;   // Schrägschnitt an den Enden
        lft.push(px + nx * ww + ux * sh, py + ny * ww + uy * sh); rgt.push(px - nx * ww - ux * sh, py - ny * ww - uy * sh);
      }
      if (type === "spray") {   // statt Fläche: Sprühstempel entlang der Mittellinie
        var stp = Math.max(2, lw * 0.55), sz0 = lw * 1.7;
        g2.globalAlpha = 1;
        for (var dd = 0; dd <= L; dd += stp) {
          var tt3 = L ? dd / L : 0, it3 = 1 - tt3;
          var sxp = it3 * it3 * x0 + 2 * it3 * tt3 * qx + tt3 * tt3 * x1, syp = it3 * it3 * y0 + 2 * it3 * tt3 * qy + tt3 * tt3 * y1;
          g2.drawImage(sprays[Math.floor(R() * 4)], sxp - sz0 / 2, syp - sz0 / 2, sz0, sz0);
        }
        return;
      }
      if (type === "crayon") {   // ausgefranste Ränder
        for (k = 0; k < lft.length; k += 2) { var jj = (R() - 0.5) * hw * 0.35; lft[k] += (rgt[k] - lft[k]) * jj / lw; lft[k + 1] += (rgt[k + 1] - lft[k + 1]) * jj / lw; }
      }
      g2.globalAlpha = 1; g2.beginPath(); g2.moveTo(lft[0], lft[1]);
      for (k = 2; k < lft.length; k += 2) g2.lineTo(lft[k], lft[k + 1]);
      for (k = rgt.length - 2; k >= 0; k -= 2) g2.lineTo(rgt[k], rgt[k + 1]);
      g2.closePath(); g2.fill();
    }
    // Strich von der Mitte aus in beide Richtungen bis zur Kante der Fläche, plus kleiner Überstand
    function reach(cx, cy, ux, uy, max) { var st = Math.max(1, 1 / f), d = 0; while (d + st <= max && inside(cx + ux * (d + st), cy + uy * (d + st))) d += st; return d; }
    function mark(cx, cy, ang, len, lw, al) {
      if (keep < 1 && R() > keep) return;   // obere Schichten lassen mehr von darunter durch
      var ux = Math.cos(ang), uy = Math.sin(ang), over = w * (0.2 + 0.8 * h) * R();
      var a = reach(cx, cy, -ux, -uy, len / 2), b = reach(cx, cy, ux, uy, len / 2);
      if (a + b < w * 0.8) return;
      a = Math.min(len / 2, a + over * (a < len / 2 - 1 ? 1 : 0.4)); b = Math.min(len / 2, b + over * (b < len / 2 - 1 ? 1 : 0.4));
      var x0 = cx - ux * a, y0 = cy - uy * a, x1 = cx + ux * b, y1 = cy + uy * b, L = a + b, bend = (R() - 0.5) * L * 0.22 * h;
      ribbon(x0, y0, (x0 + x1) / 2 - uy * bend, (y0 + y1) / 2 + ux * bend, x1, y1, lw, al * am);
    }
    // Rasterpunkte innerhalb der Fläche sammeln, gemischt, damit sich die Striche natürlich überlagern
    function points(cell) {
      if (type === "spray") cell *= 1.6;   // Spray: weniger Stempel, damit die Sprühpunkte sichtbar bleiben
      var pts = [];
      for (var gy = cell / 2; gy < F.oh; gy += cell) for (var gx = cell / 2; gx < F.ow; gx += cell) {
        var px = gx + (R() - 0.5) * cell * (0.4 + 0.9 * h), py = gy + (R() - 0.5) * cell * (0.4 + 0.9 * h);
        if (inside(px, py)) pts.push(px, py);
      }
      for (var k = pts.length / 2 - 1; k > 0; k--) { var r = Math.floor(R() * (k + 1)), ax = pts[2 * k], ay = pts[2 * k + 1]; pts[2 * k] = pts[2 * r]; pts[2 * k + 1] = pts[2 * r + 1]; pts[2 * r] = ax; pts[2 * r + 1] = ay; }
      return pts;
    }
    var th = o.angle * Math.PI / 180, jit = (0.04 + 0.32 * h), P;
    // 1. breite, blasse Grundstriche: geben Deckung und das schmutzige Kreide-Gefühl
    P = points(w * 3.6);
    if (o.base !== false) for (i = 0; i < P.length; i += 2) mark(P[i], P[i + 1], th + (R() - 0.5) * jit, w * (5 + 7 * R()), w * (1.4 + 0.8 * R()), 0.14 + 0.18 * R());
    // 2. Hauptstriche: dicht, deutlich, ungleich lang und kräftig, überlappend
    P = points(w * (1.75 + 0.35 * h));
    for (i = 0; i < P.length; i += 2) {
      var big = R() < 0.15 + 0.25 * h;
      mark(P[i], P[i + 1], th + (R() - 0.5) * jit, w * (big ? 9 + 9 * R() : 4 + 5 * R() * (0.5 + h)), w * (0.75 + R() * (0.3 + 0.7 * h)), (0.6 + 0.4 * R()) * (1 - 0.3 * h * R()));
    }
    // 3. Kreuzschraffur in Teilen der Fläche (Humanize)
    if (h > 0.25) {
      P = points(w * 3.2); var th2 = th + (55 + (R() - 0.5) * 30) * Math.PI / 180;
      for (i = 0; i < P.length; i += 2) if (R() < (h - 0.25) * 0.9) mark(P[i], P[i + 1], th2 + (R() - 0.5) * jit, w * (4 + 6 * R()), w * (0.6 + 0.5 * R()), 0.55 + 0.3 * R());
    }
    // 4. skizzierte Umrisse entlang der Kante, Richtung folgt der Kante
    var gstep = Math.max(2, Math.round(w * 1.2 * f));
    for (var yy2 = 1; yy2 < mh - 1; yy2 += gstep) for (var xx2 = 1; xx2 < mw - 1; xx2 += gstep) {
      var k2 = yy2 * mw + xx2, gx2 = bl[k2 + 1] - bl[k2 - 1], gy2 = bl[k2 + mw] - bl[k2 - mw], gm = Math.hypot(gx2, gy2);
      if (gm < 0.2 || bl[k2] < 0.15 || bl[k2] > 0.85) continue;
      if (R() > (0.55 + 0.45 * h) * Math.min(1, keep + 0.2)) continue;
      var tx = -gy2 / gm, ty = gx2 / gm, len = w * (3 + R() * 5 * (0.4 + h)), rot = (R() - 0.5) * 0.45 * h, cr = Math.cos(rot), sr = Math.sin(rot);
      var ex = (tx * cr - ty * sr) * len / 2, ey = (tx * sr + ty * cr) * len / 2, px2 = xx2 / f - gx2 / gm * w * 0.4, py2 = yy2 / f - gy2 / gm * w * 0.4;
      var ca = (0.75 + 0.25 * R()) * am, cw = w * (0.6 + 0.5 * R());
      ribbon(px2 - ex, py2 - ey, px2, py2, px2 + ex, py2 + ey, cw, ca);
    }
    if (type === "crayon") applyGrain(g2, F.ow, F.oh, o.grain == null ? 45 : o.grain, Math.floor(R() * 256), Math.floor(R() * 256));
    // auf die leicht erweiterte Maske beschneiden
    var mc = canvas(mw, mh), mx2 = mc.getContext("2d"), id = mx2.createImageData(mw, mh);
    for (i = 0; i < n; i++) id.data[i * 4 + 3] = Math.round(Math.min(1, bl[i] * 1.6) * 255);
    mx2.putImageData(id, 0, 0);
    var big2 = V.tmp, bx2 = big2.getContext("2d"), grow = (1.5 + h * 5) * sc;
    bx2.globalCompositeOperation = "source-over"; bx2.globalAlpha = 1; bx2.clearRect(0, 0, F.ow, F.oh); bx2.imageSmoothingEnabled = true;
    for (var q = 0; q < 9; q++) { var an = q * Math.PI / 4; bx2.drawImage(mc, q === 8 ? 0 : Math.cos(an) * grow, q === 8 ? 0 : Math.sin(an) * grow, F.ow, F.oh); }
    g2.globalAlpha = 1; g2.globalCompositeOperation = "destination-in"; g2.drawImage(big2, 0, 0);
    g2.globalCompositeOperation = "source-over";
  }
  // ---------- Magic Paint: viele Quickpaint-Schichten automatisch ----------
  // V.mp = { pal, result, preview, gen, busy, layers, applied }
  // pal = feste Palette { N, C (Lab-Zentren), list: [{ k, col, wf, mf, ao, seed }] }: bleibt über Frames gleich,
  // damit Farben und Strichmuster konstant sind. Neue Palette nur bei neuer Schichtzahl, neuer Variante oder neuem Öffnen.
  var mpTok = 0, MPSLOTS = [null, null];
  function startMP(fromSlot) {
    if (!F || !V.layer || V.loading || V.playing || V.down) return;
    setPick(false); if (V.qp) endQP(); qpGrids();
    if (fromSlot) { S.mp = Object.assign({}, fromSlot.set); }
    V.mp = { pal: fromSlot ? fromSlot.pal : null, result: null, preview: null, gen: performance.now(), prog: 0, n: 0, layers: [], applied: false, busy: true, done: {} };
    mpPanel(true); need();
  }
  function endMP() { mpTok++; V.mp = null; var pn = V.root.querySelector("#fp-qp"); if (pn) { pn.hidden = true; pn.dataset.kind = ""; } need(); updateSide(); }
  function mpApply() {
    if (!V.mp || !V.mp.result || V.mp.gen || V.mp.busy) return;
    pushUndo();
    V.lx.globalAlpha = 1; V.lx.globalCompositeOperation = "source-over"; V.lx.drawImage(V.mp.result, 0, 0);
    V.dirty = true; V.mp.result = null; V.mp.preview = null; V.mp.applied = true; V.mp.done[F.idx] = true;   // Fenster bleibt offen
    mpPanel(); need(); updateBar(); updateSide();
  }
  function mpRefresh() {   // nach Frame-Wechsel: gleiche Palette, neues Bild
    if (!V.mp || V.batch) return;
    if (V.mp.done[F.idx]) { mpTok++; V.mp.applied = true; V.mp.busy = false; V.mp.gen = 0; V.mp.result = null; V.mp.preview = null; mpPanel(); return; }
    mpTok++; V.mp.result = null; V.mp.preview = null; V.mp.applied = false; V.mp.busy = true; V.mp.gen = performance.now() + 60; mpPanel();
  }
  async function mpBatch(all) {
    if (!V.mp || !V.mp.pal || V.batch) return;
    var mp = V.mp, start = F.idx, list = [];
    for (var i = all ? 0 : F.idx; i < F.n; i++) if (!mp.done[i]) list.push(i);
    if (!list.length) { note(t("qpAllDone")); return; }
    mpTok++; mp.gen = 0;
    V.batch = { stop: false, i: 0, n: list.length }; mpPanel(true);
    try {
      for (var k = 0; k < list.length; k++) {
        if (V.batch.stop || V.mp !== mp) break;
        V.batch.i = k + 1; qpBatchNote();
        if (F.idx !== list[k]) await goFrame(list[k]);
        if (!V || V.mp !== mp || F.idx !== list[k]) break;
        mp.gen = 0; await buildMagic();
        if (!V || V.mp !== mp || !mp.result) break;
        V.lx.globalAlpha = 1; V.lx.globalCompositeOperation = "source-over"; V.lx.drawImage(mp.result, 0, 0);
        V.dirty = true; mp.done[F.idx] = true; mp.result = null; mp.preview = null; mp.applied = true; need();
        await new Promise(function (r) { setTimeout(r, 0); });
      }
    } finally {
      var stopped = V && V.batch && V.batch.stop, cnt = V && V.batch ? V.batch.i : 0;
      if (V) {
        V.batch = null;
        if (V.mp === mp) { await goFrame(start); mpPanel(true); }
        note(fmt(t(stopped ? "qpBatchStop" : "mpBatchDone"), { n: cnt }));
        updateSide();
      }
    }
  }
  function hex(r, g, b) { return "#" + [r, g, b].map(function (v) { v = clamp(Math.round(v), 0, 255); return (v < 16 ? "0" : "") + v.toString(16); }).join("").toUpperCase(); }
  function vidBox() { var vs = Math.min(F.ow / F.vw, F.oh / F.vh); return { x: (F.ow - F.vw * vs) / 2 / F.ow, y: (F.oh - F.vh * vs) / 2 / F.oh }; }
  function inVid(gx, gy, G2, vb) { var u = (gx + 0.5) / G2.w, v = (gy + 0.5) / G2.h; return u >= vb.x && u <= 1 - vb.x && v >= vb.y && v <= 1 - vb.y; }
  // Palette: Hauptfarben per k-means (Lab), sortiert nach Fläche, mit festen Eigenschaften je Schicht
  function makePalette() {
    var G = qpGrids(), Gs = G.s, N = S.mp.layers, R = rng(S.mp.seed * 31 + 1), vb = vidBox(), k, i;
    var ns = Gs.w * Gs.h, sm = Math.min(6000, ns), smp = new Float32Array(sm * 3);
    for (i = 0; i < sm; i++) { var q0, guard = 0; do { q0 = Math.floor(R() * ns); } while (!inVid(q0 % Gs.w, Math.floor(q0 / Gs.w), Gs, vb) && ++guard < 50); smp[i * 3] = Gs.L[q0 * 3]; smp[i * 3 + 1] = Gs.L[q0 * 3 + 1]; smp[i * 3 + 2] = Gs.L[q0 * 3 + 2]; }
    var C = new Float32Array(N * 3), dd = new Float32Array(sm).fill(1e9), first = Math.floor(R() * sm);
    C[0] = smp[first * 3]; C[1] = smp[first * 3 + 1]; C[2] = smp[first * 3 + 2];
    for (k = 1; k < N; k++) {
      var tot = 0;
      for (i = 0; i < sm; i++) { var a0 = smp[i * 3] - C[(k - 1) * 3], a1 = smp[i * 3 + 1] - C[(k - 1) * 3 + 1], a2 = smp[i * 3 + 2] - C[(k - 1) * 3 + 2], dv = a0 * a0 + a1 * a1 + a2 * a2; if (dv < dd[i]) dd[i] = dv; tot += dd[i]; }
      var r = R() * tot, pick = 0; for (i = 0; i < sm; i++) { r -= dd[i]; if (r <= 0) { pick = i; break; } }
      C[k * 3] = smp[pick * 3]; C[k * 3 + 1] = smp[pick * 3 + 1]; C[k * 3 + 2] = smp[pick * 3 + 2];
    }
    var cnt = new Float64Array(N);
    for (var it = 0; it < 12; it++) {
      var acc = new Float64Array(N * 3); cnt = new Float64Array(N);
      for (i = 0; i < sm; i++) {
        var best = 0, bd = 1e18;
        for (k = 0; k < N; k++) { var b0 = smp[i * 3] - C[k * 3], b1 = smp[i * 3 + 1] - C[k * 3 + 1], b2 = smp[i * 3 + 2] - C[k * 3 + 2], dv2 = b0 * b0 + b1 * b1 + b2 * b2; if (dv2 < bd) { bd = dv2; best = k; } }
        acc[best * 3] += smp[i * 3]; acc[best * 3 + 1] += smp[i * 3 + 1]; acc[best * 3 + 2] += smp[i * 3 + 2]; cnt[best]++;
      }
      for (k = 0; k < N; k++) if (cnt[k]) { C[k * 3] = acc[k * 3] / cnt[k]; C[k * 3 + 1] = acc[k * 3 + 1] / cnt[k]; C[k * 3 + 2] = acc[k * 3 + 2] / cnt[k]; }
    }
    // Durchschnittsfarbe je Bereich aus dem mittleren Raster
    var Gm = G.m, n = Gm.w * Gm.h, sum = new Float64Array(N * 4), j;
    for (i = 0, j = 0; i < n; i++, j += 3) {
      if (!inVid(i % Gm.w, Math.floor(i / Gm.w), Gm, vb)) continue;
      var bk = 0, bdd = 1e18;
      for (k = 0; k < N; k++) { var c0 = Gm.L[j] - C[k * 3], c1 = Gm.L[j + 1] - C[k * 3 + 1], c2 = Gm.L[j + 2] - C[k * 3 + 2], dv3 = c0 * c0 + c1 * c1 + c2 * c2; if (dv3 < bdd) { bdd = dv3; bk = k; } }
      sum[bk * 4] += Gm.rgb[i * 4]; sum[bk * 4 + 1] += Gm.rgb[i * 4 + 1]; sum[bk * 4 + 2] += Gm.rgb[i * 4 + 2]; sum[bk * 4 + 3]++;
    }
    var list = [];
    for (k = 0; k < N; k++) if (sum[k * 4 + 3] > n * 0.0015) list.push({ k: k, area: sum[k * 4 + 3], col: hex(sum[k * 4] / sum[k * 4 + 3], sum[k * 4 + 1] / sum[k * 4 + 3], sum[k * 4 + 2] / sum[k * 4 + 3]) });
    list.sort(function (a, b) { return b.area - a.area; });
    list.forEach(function (l, li) { l.wf = 0.85 + 0.3 * R(); l.mf = 0.7 + 0.6 * R(); l.ao = (R() - 0.5) * 50; l.seed = S.mp.seed * 101 + li * 13; delete l.area; });
    return { N: N, C: C, list: list };
  }
  async function buildMagic() {
    var mp = V.mp, tok = ++mpTok;
    mp.busy = true; mp.result = null; mp.prog = 0; mp.layers = [];
    if (!mp.pal || mp.pal.N !== S.mp.layers) mp.pal = makePalette();
    var pal = mp.pal, C = pal.C, N = pal.N, G = qpGrids(), Gm = G.m, vb = vidBox(), n = Gm.w * Gm.h, i, j, k;
    mp.n = pal.list.length; mpPanel(); need();
    // Pixel den festen Palettenfarben zuordnen
    var dmin = new Float32Array(n), own = new Uint8Array(n), vin = new Uint8Array(n);
    for (i = 0, j = 0; i < n; i++, j += 3) {
      vin[i] = inVid(i % Gm.w, Math.floor(i / Gm.w), Gm, vb) ? 1 : 0;
      if (!vin[i]) { own[i] = 255; continue; }
      var bk = 0, bdd = 1e18;
      for (k = 0; k < N; k++) { var c0 = Gm.L[j] - C[k * 3], c1 = Gm.L[j + 1] - C[k * 3 + 1], c2 = Gm.L[j + 2] - C[k * 3 + 2], dv = c0 * c0 + c1 * c1 + c2 * c2; if (dv < bdd) { bdd = dv; bk = k; } }
      dmin[i] = Math.sqrt(bdd); own[i] = bk;
    }
    await new Promise(function (r2) { setTimeout(r2, 0); });
    if (tok !== mpTok || !V || V.mp !== mp) return;
    var res = mp.canvas && mp.canvas.width === F.ow ? mp.canvas : (mp.canvas = canvas(F.ow, F.oh)), rx = res.getContext("2d");
    var lay = mp.lay && mp.lay.width === F.ow ? mp.lay : (mp.lay = canvas(F.ow, F.oh));
    rx.globalCompositeOperation = "source-over"; rx.globalAlpha = 1; rx.clearRect(0, 0, F.ow, F.oh);
    var L = pal.list.length, raw = new Float32Array(n);
    // Eigene Fläche schützen: Rang jeder Farbe in der Malreihenfolge. Eine Schicht darf nur dort über ihren Bereich hinaus,
    // wo später noch eine andere Schicht malt. Auf schon gemalte Schichten nur in einem schmalen Randstreifen (Toleranz),
    // damit Übergänge natürlich bleiben und keine Lücken entstehen.
    var rank = new Int16Array(256).fill(9999); pal.list.forEach(function (P0, r0) { rank[P0.k] = r0; }); rank[255] = -1;
    var TOL = Math.max(1, Math.round(3 * Gm.w / 960)), Om = new Uint8Array(n), Dm = new Uint8Array(n), Tm = new Uint8Array(n);
    function dilate(src, dst, tmp, W2, H2, r) {
      var x2, y2, c2, last;
      for (y2 = 0; y2 < H2; y2++) { last = -1e9; for (x2 = 0; x2 < W2; x2++) { if (src[y2 * W2 + x2]) last = x2; tmp[y2 * W2 + x2] = x2 - last <= r ? 1 : 0; }
        last = 1e9; for (x2 = W2 - 1; x2 >= 0; x2--) { if (src[y2 * W2 + x2]) last = x2; if (last - x2 <= r) tmp[y2 * W2 + x2] = 1; } }
      for (x2 = 0; x2 < W2; x2++) { last = -1e9; for (y2 = 0; y2 < H2; y2++) { if (tmp[y2 * W2 + x2]) last = y2; dst[y2 * W2 + x2] = y2 - last <= r ? 1 : 0; }
        last = 1e9; for (y2 = H2 - 1; y2 >= 0; y2--) { if (tmp[y2 * W2 + x2]) last = y2; if (last - y2 <= r) dst[y2 * W2 + x2] = 1; } }
    }
    for (var li = 0; li < L; li++) {
      var P = pal.list[li], t2 = L > 1 ? li / (L - 1) : 0, kk = P.k;
      // Untere Schichten: großzügige Maske, dicke Striche, volle Deckung. Obere: enger, feiner und lichter, damit darunter durchscheint.
      var width = Math.max(2, S.mp.width * (1.9 - 1.35 * t2) * P.wf);
      // Härte: nur die Grundschicht ist großzügig (gegen Lücken), alle weiteren Schichten bleiben eng an ihrem Farbton (Härte etwa 75 bis 95 %),
      // damit Abstufungen als eigene Schichten sichtbar werden statt von einer weichen Maske verschluckt zu werden
      var margin = li === 0 ? 30 * P.mf : (2 + 6 * Math.pow(1 - t2, 1.3)) * (0.85 + 0.3 * (P.mf - 0.7) / 0.6);
      var keep = 1 - 0.5 * Math.pow(t2, 0.8), alpha = 1 - 0.32 * t2;
      var hardness = Math.round(clamp(100 - margin * 3, 5, 95)), area = 0;
      var cx0 = C[kk * 3], cx1 = C[kk * 3 + 1], cx2 = C[kk * 3 + 2];
      if (li > 0) { for (i = 0; i < n; i++) Om[i] = own[i] === kk ? 1 : 0; dilate(Om, Dm, Tm, Gm.w, Gm.h, TOL); }
      for (i = 0, j = 0; i < n; i++, j += 3) {
        if (!vin[i]) { raw[i] = 0; continue; }
        if (own[i] === kk) { raw[i] = 1; area++; continue; }
        if (li > 0 && rank[own[i]] < li && !Dm[i]) { raw[i] = 0; continue; }   // Fläche einer früheren Schicht: nur im Randstreifen
        var e0 = Gm.L[j] - cx0, e1 = Gm.L[j + 1] - cx1, e2 = Gm.L[j + 2] - cx2, dk = Math.sqrt(e0 * e0 + e1 * e1 + e2 * e2) - dmin[i];
        raw[i] = dk <= margin ? 1 : dk >= margin * 1.6 ? 0 : 1 - (dk - margin) / (margin * 0.6);
      }
      mp.layers.push({ col: P.col, w: Math.round(width), hard: hardness, keep: Math.round(keep * 100) });
      if (area > n * 0.0008 || li === 0) {
        sketch(raw, { color: P.col, width: width, human: S.mp.human, angle: S.mp.angle + P.ao, seed: P.seed, keep: keep, base: t2 < 0.5, type: S.mp.type }, lay);
        rx.drawImage(lay, 0, 0);
      }
      mp.prog = li + 1; mp.preview = res; mpPanel(); need();
      await new Promise(function (r3) { setTimeout(r3, 0); });
      if (tok !== mpTok || !V || V.mp !== mp) return;
    }
    mp.result = res; mp.busy = false; mpPanel(); need(); updateSide();
  }
  function slotSave(i) { if (!V.mp || !V.mp.pal) return; MPSLOTS[i] = { pal: V.mp.pal, set: Object.assign({}, S.mp) }; updateSide(); note(fmt(t("mpSaved"), { n: i + 1 })); }
  function slotLoad(i) { var sl = MPSLOTS[i]; if (!sl) return; if (V.mp) endMP(); startMP(sl); updateSide(); }
  function slotsHTML() {
    return '<div class="fp-slots">' + MPSLOTS.map(function (sl, i) {
      return '<div class="fp-slot"><b>' + fmt(t("mpSlot"), { n: i + 1 }) + '</b><span class="fp-mpl">' + (sl ? sl.pal.list.map(function (l) { return '<span style="background:' + l.col + '"></span>'; }).join("") : '<em class="fp-desc">' + t("mpEmpty") + "</em>") + "</span>" +
        '<span class="fp-slb"><button type="button" class="navbtn" data-slot-load="' + i + '"' + (sl ? "" : " disabled") + ">" + t("mpLoad") + '</button><button type="button" class="navbtn" data-slot-save="' + i + '"' + (V && V.mp && V.mp.pal ? "" : " disabled") + ">" + t("mpSave") + "</button></span></div>";
    }).join("") + "</div>";
  }
  function mpPanel(fresh) {
    var pn = V.root.querySelector("#fp-qp"); if (!pn || !V.mp) return;
    var mp = V.mp;
    function sl(k, lab, min, max, u) { return '<div class="fp-row"><label for="fp-m-' + k + '">' + lab + '<span id="fp-m-' + k + '-v">' + S.mp[k] + u + '</span></label><input type="range" id="fp-m-' + k + '" data-mp="' + k + '" min="' + min + '" max="' + max + '" step="1" value="' + S.mp[k] + '"></div>'; }
    var st = mp.applied ? t("mpApplied") : mp.busy || mp.gen ? fmt(t("mpWork"), { i: Math.min(mp.prog + 1, mp.n || S.mp.layers), n: mp.n || S.mp.layers }) : fmt(t("mpDone"), { n: mp.layers.length });
    var html2 = '<div class="fp-qph"><b>' + t("mpH") + '</b><span class="fp-qs" id="fp-mp-st">' + st + '</span><button type="button" class="fp-x" data-fp="mpNo" aria-label="' + t("close") + '" title="' + t("close") + ' (Esc)">×</button></div>' +
      sl("layers", t("mpLayers"), 4, 16, "") + typeSeg("data-mtype", S.mp.type) + sl("human", t("qpHuman"), 0, 100, " %") + sl("angle", t("mpAngle"), 0, 180, "°") + sl("width", t("mpWidth"), 3, 30, "px") +
      '<div class="fp-mpl">' + mp.layers.map(function (l, i) { return '<span title="' + (i + 1) + " · " + l.col + " · " + l.w + "px · " + t("qpHard") + " " + l.hard + " % · " + t("mpCover") + " " + l.keep + ' %" style="background:' + l.col + '"></span>'; }).join("") + "</div>" +
      '<p class="fp-desc">' + t(mp.pal ? "mpLocked" : "mpNew") + "</p>" +
      '<div class="fp-qb"><button type="button" class="fp-save" data-fp="mpOk"' + (mp.result && !mp.gen ? "" : " disabled") + ">" + t("qpOk") + '</button><button type="button" class="navbtn" data-fp="mpSeed">' + t("mpNewPal") + "</button></div>" +
      '<div class="fp-qbatch fp-mbatch">' + (V.batch ? '<p class="fp-note2" id="fp-qbat">' + fmt(t("qpBatchRun"), { i: V.batch.i, n: V.batch.n }) + '</p><button type="button" class="fp-save" data-fp="batchStop">' + t("qpStop") + "</button>"
        : '<button type="button" class="fp-qpbtn" data-fp="mpNext"' + (mp.pal ? "" : " disabled") + ">" + t("mpNext") + '</button><button type="button" class="navbtn" data-fp="mpAll"' + (mp.pal ? "" : " disabled") + ">" + t("mpAll") + '</button><p class="fp-note2">' + t("mpBatchNote") + "</p>") + "</div>";
    if (!fresh && pn.dataset.kind === "mp" && !pn.hidden && pn.querySelector("[data-mp]")) {
      var tmp = document.createElement("div"); tmp.innerHTML = html2;
      pn.querySelector("#fp-mp-st").textContent = st;
      [".fp-mpl", ".fp-qb", ".fp-desc", ".fp-mbatch"].forEach(function (sel) { var a = pn.querySelector(sel), b = tmp.querySelector(sel); if (a && b) a.innerHTML = b.innerHTML; });
      return;
    }
    pn.dataset.kind = "mp"; pn.innerHTML = html2;
    if (V.qpPos) { pn.style.left = V.qpPos.l + "px"; pn.style.top = V.qpPos.t + "px"; pn.style.right = "auto"; }
    pn.hidden = false;
  }
  function typeSeg(attr, cur) {
    return '<div class="fp-row"><label>' + t("ptype") + '</label><div class="fp-seg">' + [["stroke", "tStroke"], ["spray", "tSpray"], ["crayon", "tCrayon"]].map(function (o) {
      return '<button type="button" ' + attr + '="' + o[0] + '" aria-pressed="' + (cur === o[0]) + '">' + t(o[1]) + "</button>"; }).join("") + "</div></div>";
  }
  function qpPanel() {
    var pn = V.root.querySelector("#fp-qp"); if (!pn) return;
    var q = V.qp; if (!q) { pn.hidden = true; return; }
    function sl(k, lab, min, max, u) { return '<div class="fp-row"><label for="fp-q-' + k + '">' + lab + '<span id="fp-q-' + k + '-v">' + S.qp[k] + u + '</span></label><input type="range" id="fp-q-' + k + '" data-qp="' + k + '" min="' + min + '" max="' + max + '" step="1" value="' + S.qp[k] + '"></div>'; }
    pn.dataset.kind = "qp";
    pn.innerHTML = '<div class="fp-qph"><b>' + t("qpH") + "</b>" + (q.keyHex ? '<span class="fp-qk" style="background:' + q.keyHex + '" title="' + t("qpKey") + '"></span>' : "") + '<span class="fp-qs">' + t(q.applied ? "qpApplied" : q.stage === "pick" ? "qpPick" : "qpTune") + '</span><button type="button" class="fp-x" data-fp="qpNo" aria-label="' + t("close") + '" title="' + t("close") + ' (Esc)">×</button></div>' +
      sl("hard", t("qpHard"), 0, 100, " %") + (q.stage === "tune" ? typeSeg("data-qtype", S.qp.type) + sl("human", t("qpHuman"), 0, 100, " %") + sl("angle", t("qpAngle"), 0, 180, "°") + sl("width", t("qpWidth"), 2, 40, "px") : '<p class="fp-desc">' + t("qpHardNote") + "</p>") +
      '<div class="fp-qb">' + (q.stage === "tune" ? '<button type="button" class="fp-save" data-fp="qpOk"' + (q.applied ? " disabled" : "") + ">" + t("qpOk") + '</button><button type="button" class="navbtn" data-fp="qpSeed">' + t("qpSeed") + '</button><button type="button" class="navbtn" data-fp="qpRepick">' + t("qpRepick") + "</button>" : "") + "</div>" +
      (q.stage === "tune" ? '<div class="fp-qbatch">' + (V.batch ? '<p class="fp-desc" id="fp-qbat">' + fmt(t("qpBatchRun"), { i: V.batch.i, n: V.batch.n }) + '</p><button type="button" class="fp-save" data-fp="batchStop">' + t("qpStop") + "</button>"
        : '<button type="button" class="fp-qpbtn" data-fp="qpNext">' + t("qpNext") + '</button><button type="button" class="navbtn" data-fp="qpAll">' + t("qpAll") + '</button><p class="fp-desc">' + t("qpBatchNote") + "</p>") + "</div>" : "");
    if (V.qpPos) { pn.style.left = V.qpPos.l + "px"; pn.style.top = V.qpPos.t + "px"; pn.style.right = "auto"; }
    pn.hidden = false;
  }

  // ---------- Darstellung ----------
  function layout() {
    if (!V || !F || !F.vw || !V.cv) return;
    var desk = V.root.querySelector("#fp-desk"), aw = desk.clientWidth - 24, ah = desk.clientHeight - 24, sc = Math.min(aw / F.ow, ah / F.oh);
    var cw = Math.max(50, Math.floor(F.ow * sc)), ch = Math.max(50, Math.floor(F.oh * sc)), dpr = window.devicePixelRatio || 1;
    V.cv.style.width = cw + "px"; V.cv.style.height = ch + "px";
    V.cv.width = Math.round(cw * dpr); V.cv.height = Math.round(ch * dpr);
    var side = V.root.querySelector("#fp-side");
    if (side) side.style.maxHeight = window.innerWidth >= 1100 ? V.root.querySelector(".fp-deskbox").offsetHeight + "px" : "";
    drawStrip(); need();
  }
  function need() { if (V) V.need = true; }
  var raf = 0;
  function loop() {
    raf = requestAnimationFrame(loop);
    if (!V || !F || !V.layer) return;
    if (V.playing) { playFrame(); return; }
    if (V.down && !V.picking) {
      if (S.tool === "spray") { sprayAt(V.sm, 0); V.need = true; }
      if (V.raw && set().smooth > 0 && Math.hypot(V.raw.x - V.sm.x, V.raw.y - V.sm.y) > 0.5) { smoothStep(V.raw); V.need = true; }
    }
    if (V.mp && V.mp.gen && performance.now() >= V.mp.gen) { V.mp.gen = 0; buildMagic(); }
    if (V.qp) {
      if (V.qp.stage === "pick" && V.qp.dirty) { V.qp.dirty = false; qpMask(); }
      if (V.qp.stage === "tune" && V.qp.gen && performance.now() >= V.qp.gen) { V.qp.gen = 0; buildSketch(); }
    }
    if (V.need) { V.need = false; render(); }
  }
  function render() {
    var x = V.cv.getContext("2d"), W = V.cv.width, H = V.cv.height;
    x.globalAlpha = 1; x.globalCompositeOperation = "source-over"; x.imageSmoothingQuality = "high";
    if (S.hideVid) { x.fillStyle = "#fff"; x.fillRect(0, 0, W, H); } else x.drawImage(V.frameCv, 0, 0, W, H);
    if (V.peek) return;   // D gehalten: nur das Original
    if (S.onion && V.onionBmp) { x.globalAlpha = 0.3; x.drawImage(V.onionBmp, 0, 0, W, H); x.globalAlpha = 1; }
    var st = set();
    if (V.down && S.tool === "eraser") {
      var tx = V.tmp.getContext("2d"); tx.globalCompositeOperation = "source-over"; tx.clearRect(0, 0, F.ow, F.oh); tx.drawImage(V.layer, 0, 0);
      tx.globalCompositeOperation = "destination-out"; tx.globalAlpha = st.opacity / 100; tx.drawImage(V.stroke, 0, 0); tx.globalAlpha = 1; tx.globalCompositeOperation = "source-over";
      x.drawImage(V.tmp, 0, 0, W, H);
    } else {
      x.drawImage(V.layer, 0, 0, W, H);
      if (V.down) { x.globalAlpha = st.opacity / 100; x.drawImage(S.tool === "crayon" ? grainedStroke() : V.stroke, 0, 0, W, H); x.globalAlpha = 1; }
    }
    if (V.mp && V.mp.preview) x.drawImage(V.mp.preview, 0, 0, W, H);
    if (V.qp) {
      if (!V.qp.applied) {
        if (V.qp.mask) x.drawImage(V.qp.mask, 0, 0, W, H);
        if (V.qp.stage === "tune" && V.qp.sketch) x.drawImage(V.qp.sketch, 0, 0, W, H);
      }
    }
    // Zeiger
    if (V.hover) {
      var k = W / F.ow, hx = V.hover.x * k, hy = V.hover.y * k, dpr = window.devicePixelRatio || 1;
      if (V.mp && (V.mp.preview || V.mp.busy)) { /* kein Pinselzeiger während der Vorschau */ }
      else if (V.qp && !V.qp.applied) {
        if (V.qp.stage === "pick") {
          x.fillStyle = sampleVideo(V.hover); x.strokeStyle = "#fff"; x.lineWidth = 2 * dpr;
          x.fillRect(hx + 14 * dpr, hy - 48 * dpr, 34 * dpr, 34 * dpr); x.strokeRect(hx + 14 * dpr, hy - 48 * dpr, 34 * dpr, 34 * dpr);
          x.strokeStyle = "#000"; x.lineWidth = 1 * dpr; x.strokeRect(hx + 12 * dpr, hy - 50 * dpr, 38 * dpr, 38 * dpr);
        }
      } else if (V.picking) {
        var c = sample(V.hover);
        x.fillStyle = c; x.strokeStyle = "#fff"; x.lineWidth = 2 * dpr;
        x.fillRect(hx + 14 * dpr, hy - 48 * dpr, 34 * dpr, 34 * dpr); x.strokeRect(hx + 14 * dpr, hy - 48 * dpr, 34 * dpr, 34 * dpr);
        x.strokeStyle = "#000"; x.lineWidth = 1 * dpr; x.strokeRect(hx + 12 * dpr, hy - 50 * dpr, 38 * dpr, 38 * dpr);
      } else {
        var r = Math.max(2 * dpr, st.size / 2 * k);
        x.lineWidth = 1 * dpr; x.strokeStyle = "rgba(0,0,0,.7)"; x.beginPath(); x.arc(hx, hy, r + dpr, 0, Math.PI * 2); x.stroke();
        x.strokeStyle = "rgba(255,255,255,.9)"; x.beginPath(); x.arc(hx, hy, r, 0, Math.PI * 2); x.stroke();
      }
    }
  }
  function drawStrip() {
    if (!V || !F) return;
    var c = V.root.querySelector("#fp-strip"); if (!c) return;
    var w = c.clientWidth, dpr = window.devicePixelRatio || 1;
    c.width = Math.max(1, Math.round(w * dpr)); c.height = Math.round(10 * dpr);
    var x = c.getContext("2d"); x.clearRect(0, 0, c.width, c.height);
    var fw = c.width / F.n;
    x.fillStyle = "#E2621B";
    Object.keys(F.paints).forEach(function (k) { x.fillRect(Math.floor(+k * fw), 0, Math.max(Math.ceil(fw), Math.round(dpr)), c.height); });
    if (V.dirty || (V.layer && F.paints[F.idx])) { /* aktueller Frame wird beim Wechsel gespeichert */ }
  }

  // ---------- Abspielen (Vorschau mit der Bemalung) ----------
  function startPlay() {
    if (!F || !V.layer || V.playing) return;
    storeCurrent(); setPick(false);
    V.playing = true; V.cache = {}; V.lastShown = null;
    if (F.idx >= F.n - 1) F.idx = 0;
    V.vid.currentTime = F.idx / F.fps; V.vid.muted = false;
    var p = V.vid.play(); if (p && p.catch) p.catch(function () { V.vid.muted = true; V.vid.play().catch(function () {}); });
    updateBar();
  }
  function stopPlay() {
    if (!V || !V.playing) return;
    V.playing = false; V.vid.pause(); V.vid.muted = true;
    Object.keys(V.cache || {}).forEach(function (k) { var b = V.cache[k]; if (b && b.close) b.close(); });
    V.cache = {};
    goFrame(Math.min(F.n - 1, Math.floor(V.vid.currentTime * F.fps)));
  }
  function playFrame() {
    var v = V.vid, k = Math.min(F.n - 1, Math.floor(v.currentTime * F.fps));
    if (v.ended || k >= F.n - 1 && v.currentTime >= F.dur - 0.05) { stopPlay(); return; }
    for (var j = k; j < Math.min(F.n, k + 8); j++) {
      if (F.paints[j] && !(j in V.cache)) {
        V.cache[j] = null;
        (function (jj) { paintSource(jj).then(function (b) { if (V && V.playing && V.cache && jj in V.cache) V.cache[jj] = b; else if (b && b.close) b.close(); }); })(j);
      }
    }
    Object.keys(V.cache).forEach(function (q) { if (+q < k - 1) { var b = V.cache[q]; if (b && b.close) b.close(); delete V.cache[q]; } });
    var x = V.cv.getContext("2d"), W = V.cv.width, H = V.cv.height;
    if (S.hideVid) { x.fillStyle = "#fff"; x.fillRect(0, 0, W, H); }
    else { x.fillStyle = "#000"; x.fillRect(0, 0, W, H); var s = Math.min(W / v.videoWidth, H / v.videoHeight); x.drawImage(v, (W - v.videoWidth * s) / 2, (H - v.videoHeight * s) / 2, v.videoWidth * s, v.videoHeight * s); }
    var img = F.paints[k] ? V.cache[k] : null;
    if (img) x.drawImage(img, 0, 0, W, H);
    if (V.shownIdx !== k) { V.shownIdx = k; F.idx = k; updateBar(true); }
  }

  // ---------- Export ----------
  var busy = false, cancelReq = false;
  // Einzelbild-Export (v0.55): aktueller Frame als PNG in der nativen Auflösung des Videos.
  // Die Malebene ist Full HD mit dem Video "contain" darin; für den Export wird genau die Videofläche herausgeschnitten und auf die native Größe gebracht.
  async function exportFrame() {
    if (!F || !V.layer || V.loading || busy || !F.vw) return;
    if (V.playing) stopPlay();
    var W = F.vw, H = F.vh, i = F.idx, cv = canvas(W, H), x = cv.getContext("2d");
    var sc = Math.min(F.ow / W, F.oh / H), w = W * sc, h = H * sc, ox = (F.ow - w) / 2, oy = (F.oh - h) / 2;
    try {
      if (S.mode === "video") {
        var ev = document.createElement("video"); ev.muted = true; ev.playsInline = true; ev.preload = "auto"; ev.src = F.url;
        await new Promise(function (res, rej) { ev.onloadeddata = res; ev.onerror = function () { rej(new Error("video")); }; });
        await seek(ev, tFrame(i)); x.drawImage(ev, 0, 0, W, H); ev.removeAttribute("src"); ev.load();
      } else { x.fillStyle = "#fff"; x.fillRect(0, 0, W, H); }
      x.imageSmoothingQuality = "high"; x.drawImage(V.layer, ox, oy, w, h, 0, 0, W, H);
      var blob = await new Promise(function (res) { cv.toBlob(res, "image/png"); });
      if (!blob) throw new Error("PNG");
      var url = URL.createObjectURL(blob), a = document.createElement("a"), num = String(i + 1); while (num.length < String(F.n).length) num = "0" + num;
      a.href = url; a.download = F.name + "-frame-" + num + (S.mode === "video" ? "" : "-nur-painting") + ".png"; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      note(fmt(t("frameDone"), { i: i + 1, w: W, h: H }));
    } catch (e) { note(fmt(t("failed"), { e: e && e.message || e })); }
  }
  function loadMuxer() {
    if (window.Mp4Muxer) return Promise.resolve();
    return new Promise(function (res, rej) { var s = document.createElement("script"); s.src = "mp4-muxer.js"; s.onload = res; s.onerror = function () { rej(new Error("mp4-muxer.js")); }; document.head.appendChild(s); });
  }
  async function pickVideoCodec(w, h, br, fps) {
    var list = ["avc1.640028", "avc1.4d0028", "avc1.42e028"];
    for (var i = 0; i < list.length; i++) {
      var cfg = { codec: list[i], width: w, height: h, bitrate: br, bitrateMode: "variable", framerate: fps, latencyMode: "quality", avc: { format: "avc" } };
      try { var r = await VideoEncoder.isConfigSupported(cfg); if (r.supported) return cfg; } catch (e) {}
    }
    return null;
  }
  async function readAudio() {
    try { var ab = await F.file.arrayBuffer(), ctx = new OfflineAudioContext(2, 48000, 48000); return await new Promise(function (res, rej) { ctx.decodeAudioData(ab, res, rej); }); }
    catch (e) { return null; }
  }
  async function pickAudio(ch) {
    var opts = [["mp4a.40.2", "aac", 192000], ["opus", "opus", 160000]];
    for (var i = 0; i < opts.length; i++) {
      var cfg = { codec: opts[i][0], sampleRate: 48000, numberOfChannels: ch, bitrate: opts[i][2] };
      try { if (typeof AudioEncoder !== "undefined" && (await AudioEncoder.isConfigSupported(cfg)).supported) return { cfg: cfg, mux: opts[i][1] }; } catch (e) {}
    }
    return null;
  }
  async function doExport() {
    if (busy || !F || !V.layer) return;
    if (typeof VideoEncoder === "undefined" || typeof VideoFrame === "undefined") { note(t("noSupport")); return; }
    stopPlay(); storeCurrent();
    busy = true; cancelReq = false; updateSide();
    var notes = [];
    try {
      await loadMuxer();
      var OW = F.ow, OH = F.oh, FPS = F.fps, br = S.mbit * 1e6, n = F.n, us = 1e6 / FPS;
      var vcfg = await pickVideoCodec(OW, OH, br, FPS);
      if (!vcfg) { note(t("noSupport")); return; }
      var audio = null, acfg = null, ach = 0;
      if (S.audio) {
        audio = await readAudio(); ach = audio ? Math.min(2, audio.numberOfChannels) : 0; acfg = audio ? await pickAudio(ach) : null;
        if (!audio || !acfg) { notes.push(t("noAudio")); audio = null; }
      }
      var target = new Mp4Muxer.ArrayBufferTarget();
      var muxer = new Mp4Muxer.Muxer({ target: target, video: { codec: "avc", width: OW, height: OH, frameRate: FPS },
        audio: audio ? { codec: acfg.mux, sampleRate: 48000, numberOfChannels: ach } : undefined, fastStart: "in-memory", firstTimestampBehavior: "offset" });
      var encErr = null;
      var venc = new VideoEncoder({ output: function (c, m) { muxer.addVideoChunk(c, m); }, error: function (e) { encErr = e; } });
      venc.configure(vcfg);
      var ev = null;
      if (S.mode === "video") {
        ev = document.createElement("video"); ev.muted = true; ev.playsInline = true; ev.preload = "auto"; ev.src = F.url;
        await new Promise(function (res, rej) { ev.onloadeddata = res; ev.onerror = function () { rej(new Error("video")); }; });
      }
      var cv = canvas(OW, OH), x = cv.getContext("2d");
      for (var i = 0; i < n; i++) {
        if (cancelReq || encErr) break;
        if (ev) { await seek(ev, tFrame(i)); drawVideo(x, ev, OW, OH); }
        else { x.fillStyle = "#fff"; x.fillRect(0, 0, OW, OH); }
        var p = await paintSource(i);
        if (p) { x.drawImage(p, 0, 0); if (p.close) p.close(); }
        var vf = new VideoFrame(cv, { timestamp: Math.round(i * us), duration: Math.round(us) });
        venc.encode(vf, { keyFrame: i % (FPS * 2) === 0 }); vf.close();
        while (venc.encodeQueueSize > 6) await new Promise(function (r2) { setTimeout(r2, 4); });
        if (i % 3 === 0) note(fmt(t("working"), { i: i + 1, n: n, p: Math.round(i / n * (audio ? 94 : 100)) }));
      }
      if (encErr) throw encErr;
      if (cancelReq) { venc.close(); note(t("cancelled")); return; }
      await venc.flush(); venc.close();
      if (audio) {
        note(t("audioW"));
        var aenc = new AudioEncoder({ output: function (c, m) { muxer.addAudioChunk(c, m); }, error: function (e) { encErr = e; } });
        aenc.configure(acfg.cfg);
        var total = Math.min(audio.length, Math.round(n / FPS * 48000)), step = 1024, chans = [];
        for (var c2 = 0; c2 < ach; c2++) chans.push(audio.getChannelData(c2));
        for (var s = 0; s < total; s += step) {
          var len = Math.min(step, total - s), buf = new Float32Array(len * ach);
          for (var c3 = 0; c3 < ach; c3++) buf.set(chans[c3].subarray(s, s + len), c3 * len);
          var ad = new AudioData({ format: "f32-planar", sampleRate: 48000, numberOfFrames: len, numberOfChannels: ach, timestamp: Math.round(s / 48000 * 1e6), data: buf });
          aenc.encode(ad); ad.close();
          if (aenc.encodeQueueSize > 50) await new Promise(function (r3) { setTimeout(r3, 2); });
        }
        await aenc.flush(); aenc.close();
        if (encErr) throw encErr;
      }
      muxer.finalize();
      var blob = new Blob([target.buffer], { type: "video/mp4" }), url = URL.createObjectURL(blob), a = document.createElement("a");
      a.href = url; a.download = F.name + "-framepaint" + (S.mode === "video" ? "" : "-nur-painting") + ".mp4"; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
      note([fmt(t("done"), { mb: dec(blob.size / 1048576, 1) })].concat(notes).join(" "));
    } catch (e) {
      note(fmt(t("failed"), { e: (e && e.message) || e }));
    } finally { busy = false; updateSide(); }
  }

  // ---------- Oberfläche ----------
  var CSS = ".fp-ver{display:inline-block;margin-left:10px;padding:1px 8px;border:1px solid var(--line);font:600 .75rem var(--f-body);color:var(--soft);vertical-align:middle}" +
    ".fp-wrap{display:grid;grid-template-columns:minmax(0,1fr);gap:20px;margin-top:22px}" +
    ".fp-desk{position:relative;width:100%;aspect-ratio:16/9;min-height:300px;display:grid;place-items:center;padding:12px;overflow:hidden;background:#24221F;touch-action:none}" +
    ".fp-desk.tall{aspect-ratio:4/5}" +
    ".fp-desk.over{outline:3px dashed #E3B83F;outline-offset:-10px}" +
    ".fp-desk canvas{display:block;cursor:none;touch-action:none}.fp-desk canvas.pick,.fp-desk canvas.qp{cursor:crosshair}" +
    ".fp-qp{position:absolute;right:12px;top:12px;width:min(300px,calc(100% - 24px));max-height:calc(100% - 24px);overflow-y:auto;z-index:5;background:var(--bg);color:var(--ink);border:2px solid var(--ink);box-shadow:5px 5px 0 rgba(0,0,0,.45);padding:12px 14px;display:flex;flex-direction:column;gap:10px}" +
    ".fp-x{order:1;margin-left:auto;width:30px;height:30px;border:1px solid var(--ink);background:transparent;color:var(--ink);font:600 1.2rem/1 var(--f-body);cursor:pointer}.fp-x:hover{background:var(--ink);color:var(--bg)}" +
    ".fp-note2{margin:0;color:var(--soft);font-size:.86rem;line-height:1.45}.fp-qpbtn[disabled]{opacity:.4;cursor:default}.fp-qph::after{display:none!important}.fp-qbatch{display:flex;flex-direction:column;gap:8px;border-top:1px solid var(--line);padding-top:10px}" +
    ".fp-slots{display:flex;flex-direction:column;gap:8px}.fp-slot{display:grid;grid-template-columns:auto 1fr;gap:6px 10px;align-items:center;border:1px solid var(--line);padding:8px 10px}" +
    ".fp-slot b{font-size:.88rem}.fp-slot .fp-mpl span{width:14px;height:14px}.fp-slb{grid-column:1/3;display:flex;gap:6px}.fp-slb .navbtn{flex:1}.fp-slb .navbtn[disabled]{opacity:.4;cursor:default}" +
    ".fp-qp[hidden]{display:none}.fp-mpl{display:flex;flex-wrap:wrap;gap:4px}.fp-mpl span{width:18px;height:18px;border:1px solid var(--line)}.fp-qb .fp-save[disabled]{opacity:.4;cursor:default}" +
    ".fp-qph{display:flex;flex-wrap:wrap;align-items:center;gap:8px;cursor:move;user-select:none;-webkit-user-select:none;touch-action:none;margin:-12px -14px 0;padding:10px 14px 8px;border-bottom:1px solid var(--line)}.fp-qph::after{content:'';order:1;margin-left:auto;width:16px;height:8px;border-top:2px solid var(--soft);border-bottom:2px solid var(--soft)}.fp-qph b{font:600 1rem var(--f-display)}.fp-qk{width:20px;height:20px;border:1px solid var(--ink)}" +
    ".fp-qs{order:2;flex-basis:100%;font-size:.84rem;color:var(--soft)}.fp-qb{display:flex;flex-wrap:wrap;gap:8px}.fp-qb .fp-save{padding:9px 14px;font-size:.92rem}" +
    ".fp-qpbtn{font:600 .95rem var(--f-body);padding:10px 14px;border:2px solid var(--ink);background:transparent;color:var(--ink);cursor:pointer}.fp-qpbtn:hover{background:var(--ink);color:var(--bg)}" +
    ".fp-drop{text-align:center;color:#F1EFEA;display:flex;flex-direction:column;align-items:center;gap:10px;padding:20px}" +
    ".fp-drop b{font:600 1.4rem/1.2 var(--f-display)}.fp-drop span{color:rgba(241,239,234,.7)}" +
    ".fp-pick{font:600 1rem var(--f-body);padding:12px 20px;border:0;background:#F1EFEA;color:#151715;cursor:pointer}" +
    ".fp-load{position:absolute;left:12px;top:12px;padding:4px 10px;background:rgba(0,0,0,.6);color:#F1EFEA;font:600 .8rem var(--f-body)}" +
    ".fp-bar{display:flex;align-items:center;gap:8px;margin-top:10px;flex-wrap:wrap}" +
    ".fp-bar .fp-nav{font:600 .92rem var(--f-body);padding:9px 14px;border:0;background:var(--ink);color:var(--bg);cursor:pointer}" +
    ".fp-bar .fp-nav[disabled]{opacity:.35;cursor:default}" +
    ".fp-fr{font:600 .95rem var(--f-body);font-variant-numeric:tabular-nums;min-width:132px;text-align:center}" +
    ".fp-tl{flex:1;min-width:200px;display:flex;flex-direction:column;gap:3px}" +
    ".fp-tl input{width:100%;accent-color:#E2621B;margin:0}.fp-tl canvas{display:block;width:100%;height:10px;background:var(--line)}" +
    ".fp-time{font:600 .88rem var(--f-body);font-variant-numeric:tabular-nums;color:var(--soft);min-width:96px;text-align:right}" +
    ".fp-bar2{display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;margin-top:10px}" +
    ".fp-copy{font:600 .95rem var(--f-body);padding:10px 16px;border:2px solid var(--ink);background:var(--card,transparent);color:var(--ink);cursor:pointer}" +
    ".fp-copy:hover{background:var(--ink);color:var(--bg)}.fp-copy[disabled]{opacity:.35;cursor:default;background:transparent;color:var(--ink)}" +
    ".fp-chk{display:inline-flex;align-items:center;gap:8px;font-weight:500;font-size:.92rem;cursor:pointer}.fp-chk input{width:18px;height:18px;accent-color:var(--accent)}" +
    ".fp-keys{margin:10px 0 0;color:var(--soft);font-size:.84rem}" +
    ".fp-side{display:flex;flex-direction:column;gap:14px;min-width:0}" +
    ".fp-box{border:1px solid var(--line);background:var(--card,transparent);padding:14px 16px;display:flex;flex-direction:column;gap:12px}" +
    ".fp-box h3{font:600 .78rem/1 var(--f-body);letter-spacing:.12em;text-transform:uppercase;color:var(--soft);margin:0}" +
    ".fp-col{display:flex;align-items:center;gap:12px}" +
    ".fp-sw{width:56px;height:56px;flex:none;border:2px solid var(--ink);box-shadow:inset 0 0 0 3px var(--bg)}" +
    ".fp-col b{font:600 1rem ui-monospace,SFMono-Regular,Menlo,monospace}" +
    ".fp-pk{display:flex;align-items:center;gap:8px;font:600 .92rem var(--f-body);padding:10px 14px;border:1px solid var(--ink);background:transparent;color:var(--ink);cursor:pointer;margin-left:auto}" +
    ".fp-pk svg{width:18px;height:18px}.fp-pk[aria-pressed=true]{background:#E2621B;border-color:#E2621B;color:#fff}" +
    ".fp-rec{display:flex;flex-wrap:wrap;gap:6px}.fp-rec button{width:26px;height:26px;border:1px solid var(--line);cursor:pointer;padding:0}" +
    ".fp-tools{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}" +
    ".fp-tools button{display:flex;flex-direction:column;align-items:center;gap:4px;font:600 .78rem var(--f-body);padding:8px 2px;border:1px solid var(--line);background:transparent;color:var(--ink);cursor:pointer}" +
    ".fp-tools button svg{width:22px;height:22px}.fp-tools button[aria-pressed=true]{background:var(--ink);color:var(--bg);border-color:var(--ink)}" +
    ".fp-row{display:flex;flex-direction:column;gap:6px}" +
    ".fp-row label{display:flex;justify-content:space-between;font-weight:600;font-size:.9rem}" +
    ".fp-row label span{color:var(--soft);font-weight:500;font-variant-numeric:tabular-nums}" +
    ".fp-row input{width:100%;accent-color:var(--accent)}.fp-row input:disabled{opacity:.4}" +
    ".fp-ticks{display:flex;justify-content:space-between;font-size:.78rem;color:var(--soft)}" +
    ".fp-desc{margin:0;color:var(--soft);font-size:.86rem;line-height:1.45}" +
    ".fp-seg{display:flex}.fp-seg button{flex:1;font:600 .88rem var(--f-body);padding:8px 10px;border:1px solid var(--line);background:transparent;color:var(--ink);cursor:pointer}" +
    ".fp-seg button+button{border-left:0}.fp-seg button[aria-pressed=true]{background:var(--ink);color:var(--bg);border-color:var(--ink)}" +
    ".fp-save{font:600 1rem var(--f-body);padding:12px 18px;border:0;background:var(--ink);color:var(--bg);cursor:pointer}" +
    ".fp-note{margin:0;color:var(--soft);font-size:.88rem;min-height:1.3em;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}" +
    ".fp-sure{display:flex;flex-wrap:wrap;gap:8px;align-items:center;color:var(--ink)}" +
    "@media (min-width:1100px){" +
      ".fp-wrap{width:min(calc(100vw - 48px),2200px);margin-left:calc((100% - min(calc(100vw - 48px),2200px)) / 2);grid-template-columns:minmax(0,3fr) minmax(300px,1fr);align-items:start}" +
      ".fp-desk{max-height:calc(100vh - 190px)}.fp-desk.tall{aspect-ratio:auto;height:calc(100vh - 190px)}.fp-deskbox{position:sticky;top:20px}" +
      ".fp-side{position:sticky;top:20px;overflow-y:auto;padding-right:4px;scrollbar-width:thin}" +
    "}";

  function html() {
    return '<h1 class="ptitle">' + t("title") + '<span class="fp-ver">v' + VERSION + '</span></h1><p class="pintro">' + t("intro") + "</p>" +
      '<div class="fp-wrap"><div class="fp-deskbox"><div class="fp-desk" id="fp-desk"></div><div id="fp-bar"></div><input type="file" id="fp-file" accept="video/*,.mp4,.mov,.m4v,.webm" hidden></div>' +
      '<div class="fp-side" id="fp-side"></div></div>' +
      '<section class="phow"><h2>' + t("howH") + "</h2><p>" + t("how1") + "</p><p>" + t("how2") + "</p><p>" + t("how4") + "</p><p>" + t("how5") + "</p><p>" + t("how3") + "</p></section>";
  }
  function buildUI() {
    var desk = V.root.querySelector("#fp-desk"), bar = V.root.querySelector("#fp-bar");
    if (V.vid) { V.vid.pause(); V.vid.removeAttribute("src"); V.vid.load(); V.vid = null; }
    V.layer = null; V.cv = null; V.undo = []; V.redo = []; V.dirty = false;
    if (!F) {
      desk.classList.remove("tall");
      desk.innerHTML = '<div class="fp-drop"><b>' + t("drop") + "</b><span>" + t("or") + '</span><button type="button" class="fp-pick" data-fp="file">' + t("pick") + '</button><span id="fp-dn">' + t("dropNote") + "</span></div>";
      bar.innerHTML = "";
      updateSide();
      return;
    }
    desk.innerHTML = '<canvas id="fp-cv" aria-label="' + F.name + '"></canvas><div class="fp-qp" id="fp-qp" hidden></div><span class="fp-load" id="fp-load" hidden>' + t("loading") + "</span>";
    V.cv = desk.querySelector("#fp-cv");
    bar.innerHTML = '<div class="fp-bar"><button type="button" class="fp-nav" data-fp="prev" aria-label="' + t("prev") + '" title="' + t("prev") + ' (←)">◀ ' + t("prev") + '</button>' +
      '<span class="fp-fr" id="fp-fr"></span>' +
      '<button type="button" class="fp-nav" data-fp="next" aria-label="' + t("next") + '" title="' + t("next") + ' (→)">' + t("next") + ' ▶</button>' +
      '<button type="button" class="fp-nav" data-fp="play" id="fp-play"></button>' +
      '<div class="fp-tl"><input type="range" id="fp-pos" min="0" max="0" step="1" value="0" aria-label="Frame"><canvas id="fp-strip"></canvas></div>' +
      '<span class="fp-time" id="fp-time"></span></div>' +
      '<div class="fp-bar2"><button type="button" class="fp-copy" data-fp="copy" id="fp-copy">⧉ ' + t("copyPrev") + '</button>' +
      '<button type="button" class="navbtn" data-fp="undo" id="fp-undo">' + t("undo") + '</button><button type="button" class="navbtn" data-fp="redo" id="fp-redo">' + t("redo") + '</button>' +
      '<button type="button" class="navbtn" data-fp="clear">' + t("clearF") + "</button>" +
      '<label class="fp-chk"><input type="checkbox" data-opt="onion"' + (S.onion ? " checked" : "") + "> " + t("onion") + "</label>" +
      '<label class="fp-chk"><input type="checkbox" data-opt="hideVid"' + (S.hideVid ? " checked" : "") + "> " + t("hideVid") + "</label></div>" +
      '<p class="fp-keys">' + t("keys") + "</p>";
    var v = document.createElement("video");
    v.muted = true; v.playsInline = true; v.preload = "auto"; v.src = F.url;
    v.addEventListener("loadedmetadata", function () { if (V && V.vid === v) { desk.classList.toggle("tall", v.videoHeight > v.videoWidth); } });
    v.addEventListener("loadeddata", function () { if (V && V.vid === v && !V.layer) onMeta(); }, { once: true });
    v.addEventListener("error", function () { note(t("bad")); });
    V.vid = v;
    updateSide();
  }
  function sliders() {
    var st = set();
    return Object.keys(st).map(function (k) {
      var r = RANGES[k], max = k === "size" && S.tool === "pen" ? 60 : r[1];
      return '<div class="fp-row"><label for="fp-s-' + k + '">' + t(k === "drop" ? "drop2" : k) + '<span id="fp-s-' + k + '-v">' + st[k] + r[2] + '</span></label><input type="range" id="fp-s-' + k + '" data-set="' + k + '" min="' + r[0] + '" max="' + max + '" step="1" value="' + st[k] + '"></div>';
    }).join("") + (S.tool === "hair" ? '<p class="fp-desc">' + t("hairNote") + "</p>" : "") + '<p class="fp-desc">' + t("smoothNote") + "</p>";
  }
  function updateSide() {
    if (!V) return;
    var side = V.root.querySelector("#fp-side"), ready = F && V.layer;
    var top = F ? '<div class="ez-btns" style="display:flex;gap:8px"><button type="button" class="navbtn" data-fp="file">' + t("other") + "</button></div>" : "";
    var color = '<div class="fp-box"><h3>' + t("color") + '</h3><div class="fp-col"><span class="fp-sw" style="background:' + S.color + '"></span><b>' + S.color + "</b>" +
      '<button type="button" class="fp-pk" data-fp="pick" aria-pressed="' + !!(V.picking) + '"' + (ready ? "" : " disabled") + ">" + ICONS.pick + t("picker") + "</button></div>" +
      (S.recent.length ? '<div class="fp-desc">' + t("recent") + '</div><div class="fp-rec">' + S.recent.map(function (c) { return '<button type="button" data-col="' + c + '" style="background:' + c + '" title="' + c + '" aria-label="' + c + '"></button>'; }).join("") + "</div>" : "") +
      '<p class="fp-desc">' + t("colorNote") + "</p></div>";
    var tools = '<div class="fp-box"><h3>' + t("tool") + '</h3><div class="fp-tools">' + Object.keys(TOOLS).map(function (k) {
      return '<button type="button" data-tool="' + k + '" aria-pressed="' + (S.tool === k) + '" title="' + t(k) + " (" + TOOLS[k].key.toUpperCase() + ')">' + ICONS[k] + t(k === "crayon" ? "crayonS" : k === "hair" ? "hairS" : k) + "</button>";
    }).join("") + '</div><div id="fp-sl" style="display:flex;flex-direction:column;gap:12px">' + sliders() + "</div></div>";
    var locked = !!(F && painted()) || busy;
    var fps = '<div class="fp-box"><h3>' + t("fps") + '</h3><div class="fp-row"><label for="fp-fps">' + t("fps") + '<span id="fp-fps-v">' + RATES[S.fpsI] + ' fps</span></label>' +
      '<input type="range" id="fp-fps" min="0" max="2" step="1" value="' + S.fpsI + '"' + (locked ? " disabled" : "") + '><div class="fp-ticks"><span>5</span><span>15</span><span>30</span></div></div>' +
      '<p class="fp-desc">' + (F && F.vw ? fmt(t("fpsInfo"), { n: F.n.toLocaleString(lang === "de" ? "de-DE" : "en-GB"), f: F.fps }) + ". " : "") + (locked ? t("fpsLock") : "") + "</p></div>";
    var ow = F ? F.ow : 1920, oh = F ? F.oh : 1080;
    var exp = '<div class="fp-box"><h3>' + t("exportH") + '</h3><div class="fp-seg"><button type="button" data-mode="video" aria-pressed="' + (S.mode === "video") + '">' + t("withVid") + '</button><button type="button" data-mode="paint" aria-pressed="' + (S.mode === "paint") + '">' + t("onlyPaint") + "</button></div>" +
      '<p class="fp-desc">' + t(S.mode === "video" ? "withNote" : "onlyNote") + "</p>" +
      '<div class="fp-row"><label for="fp-br">' + t("bitrate") + '<span id="fp-br-v">' + S.mbit + ' Mbit/s</span></label><input type="range" id="fp-br" min="2" max="40" step="1" value="' + S.mbit + '"></div>' +
      '<label class="fp-chk"><input type="checkbox" data-opt="audio"' + (S.audio ? " checked" : "") + "> " + t("audio") + "</label>" +
      '<p class="fp-desc" id="fp-info">' + fmt(t("exportInfo"), { w: ow, h: oh, f: RATES[S.fpsI], br: S.mbit }) + "</p>" +
      (busy ? '<button type="button" class="fp-save" data-fp="cancel">' + t("cancel") + "</button>" : '<button type="button" class="fp-save" data-fp="export"' + (ready ? "" : " disabled") + ">" + t("save") + "</button>") +
      '<p class="fp-note" id="fp-note" aria-live="polite">' + (V.lastNote || "") + "</p></div>";
    var vw0 = F && F.vw ? F.vw : 1920, vh0 = F && F.vh ? F.vh : 1080;
    exp += '<div class="fp-box"><h3>' + t("frameH") + '</h3><p class="fp-desc">' + fmt(t("frameInfo"), { w: vw0, h: vh0 }) + '</p><button type="button" class="fp-qpbtn" data-fp="frame"' + (ready && !busy ? "" : " disabled") + ">" + t("frameSave") + "</button></div>";
    var qpb = '<div class="fp-box"><h3>' + t("qpH") + '</h3><button type="button" class="fp-qpbtn" data-fp="qp"' + (ready ? "" : " disabled") + ">" + t("qpStart") + '</button><p class="fp-desc">' + t("qpNote") + "</p></div>";
    var mpb = '<div class="fp-box"><h3>' + t("mpH") + '</h3><button type="button" class="fp-qpbtn" data-fp="mp"' + (ready ? "" : " disabled") + ">" + t("mpStart") + '</button><p class="fp-desc">' + t("mpNote") + "</p>" + slotsHTML() + '<p class="fp-desc">' + t("mpSlotsNote") + "</p></div>";
    side.innerHTML = top + color + tools + qpb + mpb + fps + exp;
    if (V.pendingFile) noteSure();
  }
  function updateBar(light) {
    if (!V || !F) return;
    var fr = V.root.querySelector("#fp-fr"); if (!fr) return;
    fr.textContent = fmt(t("frame"), { i: F.idx + 1, n: F.n });
    var pos = V.root.querySelector("#fp-pos"); pos.max = F.n - 1; pos.value = F.idx;
    V.root.querySelector("#fp-time").textContent = tc(F.idx / F.fps) + " / " + tc(F.dur);
    if (light) return;
    var pb = V.root.querySelector("#fp-play"); pb.textContent = V.playing ? "❚❚ " + t("pause") : "▶ " + t("play");
    V.root.querySelector('[data-fp="prev"]').disabled = F.idx === 0 || V.playing;
    V.root.querySelector('[data-fp="next"]').disabled = F.idx >= F.n - 1 || V.playing;
    V.root.querySelector("#fp-copy").disabled = F.idx === 0 || V.playing || !F.paints[F.idx - 1];
    V.root.querySelector("#fp-undo").disabled = !V.undo.length; V.root.querySelector("#fp-redo").disabled = !V.redo.length;
    var ld = V.root.querySelector("#fp-load"); if (ld) ld.hidden = !V.loading;
    drawStrip();
    var fl = V.root.querySelector("#fp-fps");
    if (fl && !fl.disabled && painted()) updateSide();
  }
  function tc(s) { s = Math.max(0, s || 0); var m = Math.floor(s / 60), r = s - m * 60; return m + ":" + (r < 10 ? "0" : "") + r.toFixed(1).replace(".", lang === "de" ? "," : "."); }
  function note(s) { if (!V) return; V.lastNote = s; var n = V.root.querySelector("#fp-note") || V.root.querySelector("#fp-dn"); if (n) n.textContent = s; }
  function noteSure() {
    var n = V.root.querySelector("#fp-note"); if (!n) return;
    n.innerHTML = '<span class="fp-sure">' + t("sure") + ' <button type="button" class="navbtn" data-fp="sureYes">' + t("sureYes") + '</button><button type="button" class="navbtn" data-fp="sureNo">' + t("sureNo") + "</button></span>";
  }

  // ---------- Eingabe ----------
  function onDown(e) {
    if (V && V.batch) return;
    if (!F || !V.layer || e.target !== V.cv || V.playing) return;
    if (e.button !== undefined && e.button > 0) return;
    e.preventDefault();
    var p = toFrame(e);
    if (V.mp && (V.mp.result || V.mp.busy)) { mpApply(); return; }
    if (V.qp && !V.qp.applied) { if (V.qp.stage === "pick") qpFix(p); else qpApply(); return; }
    if (V.picking) { takeColor(sample(p)); setPick(false); return; }
    if (V.loading) return;
    pushUndo();
    try { V.cv.setPointerCapture(e.pointerId); } catch (er) {}
    V.down = true; V.pid = e.pointerId; V.pen = e.pointerType === "pen"; if (!V.pen) p.p = 0.5;
    V.sm = p; V.raw = p; V.rest = 0; V.first = true; V.hover = p;
    V.sx.clearRect(0, 0, F.ow, F.oh);
    segment(p, p); need();
  }
  function onMove(e) {
    if (!F || !V || !V.layer) return;
    if (V.down && e.pointerId === V.pid) {
      var evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e]; if (!evs.length) evs = [e];
      evs.forEach(function (ce) { var p = toFrame(ce); if (!V.pen) p.p = 0.5; V.raw = p; smoothStep(p); });
      V.hover = V.raw; need(); return;
    }
    if (e.target === V.cv) {
      V.hover = toFrame(e); need();
      if (V.qp && V.qp.stage === "pick") { var hv = labAt(qpGrids().s, V.hover), o = V.qp.hover; if (!o || Math.abs(o[0] - hv[0]) + Math.abs(o[1] - hv[1]) + Math.abs(o[2] - hv[2]) > 0.8) { V.qp.hover = hv; V.qp.dirty = true; } }
    }
    else if (V.hover) { V.hover = null; need(); }
  }
  function onUp(e) {
    if (!V || !V.down || e.pointerId !== V.pid) return;
    // Am Ende holt der geglättete Strich weich zur Loslass-Stelle auf
    if (V.raw && S.tool !== "spray") for (var g = 0; g < 40 && Math.hypot(V.raw.x - V.sm.x, V.raw.y - V.sm.y) > 1; g++) smoothStep(V.raw);
    V.down = false; commitStroke(); need(); updateBar();
  }
  function onLeave() { if (V && !V.down) { V.hover = null; need(); } }
  function setTool(k) { if (!TOOLS[k]) return; if (k !== "eraser") V.lastPaintTool = k; S.tool = k; updateSide(); need(); }
  function onKey(e) {
    if (!V || !F || !V.layer) return;
    if (V.batch) { if (e.key === "Escape") V.batch.stop = true; e.preventDefault(); return; }
    var tg = e.target, tag = tg && tg.tagName;
    if (tag === "INPUT" && tg.type !== "range" && tg.type !== "checkbox" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (e.ctrlKey || e.metaKey) {
      var k0 = e.key.toLowerCase();
      if (k0 === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      else if (k0 === "y") { e.preventDefault(); redo(); }
      return;
    }
    if (e.altKey) return;
    var k = e.key.toLowerCase();
    if (k === "d") { e.preventDefault(); if (!V.peek) { V.peek = true; need(); } return; }
    if (k === "m") { e.preventDefault(); if (V.mp) endMP(); else startMP(); return; }
    if (V.mp && k === "escape") { endMP(); return; }
    if (V.mp && k === "enter" && V.mp.result) { e.preventDefault(); mpApply(); return; }
    if (k === "q") { e.preventDefault(); if (V.qp) endQP(); else startQP(); return; }
    if (k === "escape" && V.qp) { endQP(); return; }
    if (k === "enter" && V.qp && V.qp.stage === "tune" && !V.qp.applied) { e.preventDefault(); qpApply(); return; }
    if (V.qp && V.qp.stage === "pick") return;
    if (k === "c") { e.preventDefault(); setPick(!V.picking); return; }
    if (k === "escape" && V.picking) { setPick(false); return; }
    for (var id in TOOLS) if (TOOLS[id].key === k) { e.preventDefault(); setTool(id); return; }
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") { if (tag === "INPUT" && tg.type === "range") return; e.preventDefault(); if (!V.playing && !V.down) goFrame(F.idx + (e.key === "ArrowLeft" ? -1 : 1)); return; }
    if (e.key === " ") { if (tag === "BUTTON") return; e.preventDefault(); if (V.playing) stopPlay(); else startPlay(); return; }
    if (e.key === "[" || e.key === "]") {
      var st = set(); st.size = clamp(st.size + (e.key === "]" ? 1 : -1) * Math.max(1, Math.round(st.size * 0.12)), 1, S.tool === "pen" ? 60 : 200);
      var sl = V.root.querySelector("#fp-s-size"); if (sl) { sl.value = st.size; V.root.querySelector("#fp-s-size-v").textContent = st.size + "px"; }
      need();
    }
  }
  // Quickpaint-Fenster am Kopf verschieben
  var qpDrag = null;
  function onQPDown(e) {
    var hd = e.target.closest && e.target.closest(".fp-qph"); if (!hd) return;
    var pn = hd.parentNode, desk = V.root.querySelector("#fp-desk"), pr = pn.getBoundingClientRect(), dr = desk.getBoundingClientRect();
    qpDrag = { id: e.pointerId, ox: e.clientX - pr.left, oy: e.clientY - pr.top, pn: pn, dr: dr };
    e.preventDefault(); e.stopPropagation();
  }
  function onQPMove(e) {
    if (!qpDrag || e.pointerId !== qpDrag.id) return;
    var d = qpDrag, pn = d.pn, dr = V.root.querySelector("#fp-desk").getBoundingClientRect();
    var l = clamp(e.clientX - d.ox - dr.left, 0, dr.width - pn.offsetWidth), tp = clamp(e.clientY - d.oy - dr.top, 0, dr.height - Math.min(pn.offsetHeight, dr.height));
    pn.style.left = l + "px"; pn.style.top = tp + "px"; pn.style.right = "auto"; V.qpPos = { l: l, t: tp };
  }
  function onQPUp(e) { if (qpDrag && e.pointerId === qpDrag.id) qpDrag = null; }
  function onKeyUp(e) { if (V && (e.key === "d" || e.key === "D") && V.peek) { V.peek = false; need(); } }
  function onBlurWin() { if (V && V.peek) { V.peek = false; need(); } }
  function onWheel(e) {
    if (!V || !V.qp || e.target !== V.cv) return;
    e.preventDefault();
    S.qp.hard = clamp(S.qp.hard + (e.deltaY < 0 ? 2 : -2), 0, 100);
    var sl = V.root.querySelector("#fp-q-hard"); if (sl) { sl.value = S.qp.hard; V.root.querySelector("#fp-q-hard-v").textContent = S.qp.hard + " %"; }
    if (V.qp.stage === "tune") { qpMask(); qpGenSoon(); } else V.qp.dirty = true;
  }
  function onClick(e) {
    var b = e.target.closest("[data-fp],[data-tool],[data-mode],[data-col],[data-slot-load],[data-slot-save],[data-qtype],[data-mtype]"); if (!b) return;
    if (V.batch) { if (b.dataset.fp === "batchStop") V.batch.stop = true; return; }
    if (b.dataset.qtype && !V.batch) { S.qp.type = b.dataset.qtype; if (V.qp) { V.qp.done = {}; qpPanel(); qpGenSoon(0); } return; }
    if (b.dataset.mtype && !V.batch) { S.mp.type = b.dataset.mtype; if (V.mp) { V.mp.done = {}; mpTok++; V.mp.busy = true; V.mp.applied = false; V.mp.result = null; V.mp.gen = performance.now(); mpPanel(true); } return; }
    if (b.dataset.slotLoad !== undefined) { if (F && V.layer) slotLoad(+b.dataset.slotLoad); return; }
    if (b.dataset.slotSave !== undefined) { slotSave(+b.dataset.slotSave); return; }
    if (b.dataset.tool) { setTool(b.dataset.tool); return; }
    if (b.dataset.mode) { S.mode = b.dataset.mode; updateSide(); return; }
    if (b.dataset.col) { takeColor(b.dataset.col); return; }
    var a = b.dataset.fp;
    if (a === "file") { if (busy) return; storeCurrent(); if (F && painted() && !V.pendingFile) { V.pendingFile = "pick"; noteSure(); return; } V.root.querySelector("#fp-file").click(); return; }
    if (a === "sureYes") { var pf = V.pendingFile; V.pendingFile = null; if (pf === "pick") V.root.querySelector("#fp-file").click(); else if (pf) loadFile(pf); return; }
    if (a === "sureNo") { V.pendingFile = null; note(""); return; }
    if (!F || !V.layer) return;
    if (a === "prev") goFrame(F.idx - 1);
    else if (a === "next") goFrame(F.idx + 1);
    else if (a === "play") { if (V.playing) stopPlay(); else startPlay(); }
    else if (a === "copy") copyPrev();
    else if (a === "undo") undo();
    else if (a === "redo") redo();
    else if (a === "clear") clearFrame();
    else if (a === "pick") { if (V.qp) endQP(); setPick(!V.picking); }
    else if (a === "qp") { if (V.mp) endMP(); if (V.qp) endQP(); else startQP(); }
    else if (a === "qpOk") qpApply();
    else if (a === "qpNo") endQP();
    else if (a === "mp") { if (V.mp) endMP(); else startMP(); }
    else if (a === "mpOk") mpApply();
    else if (a === "mpNext") mpBatch(false);
    else if (a === "mpAll") mpBatch(true);
    else if (a === "mpNo") endMP();
    else if (a === "mpSeed") { S.mp.seed = 1 + Math.floor(Math.random() * 9999); mpTok++; V.mp.pal = null; V.mp.done = {}; V.mp.applied = false; V.mp.gen = performance.now(); V.mp.busy = true; mpPanel(); }
    else if (a === "qpRepick") { if (V.qp) { V.qp.stage = "pick"; V.qp.done = {}; V.qp.key = null; V.qp.keyHex = null; V.qp.applied = false; V.qp.mask = null; V.qp.sketch = null; qpPanel(); need(); } }
    else if (a === "qpNext") qpBatch(false);
    else if (a === "qpAll") qpBatch(true);
    else if (a === "qpSeed") { if (V.qp) V.qp.done = {}; S.qp.seed = 1 + Math.floor(Math.random() * 9999); qpGenSoon(0); }
    else if (a === "export") doExport();
    else if (a === "frame") exportFrame();
    else if (a === "cancel") cancelReq = true;
  }
  function onInput(e) {
    var el = e.target;
    if (V.batch) return;
    if (el.dataset.mp) {
      var mk = el.dataset.mp; S.mp[mk] = +el.value;
      V.root.querySelector("#fp-m-" + mk + "-v").textContent = el.value + (mk === "angle" ? "°" : mk === "width" ? "px" : mk === "layers" ? "" : " %");
      if (V.mp) { if (mk === "layers") V.mp.pal = null; V.mp.done = {}; mpTok++; V.mp.busy = true; V.mp.applied = false; V.mp.result = null; V.mp.gen = performance.now() + 350; mpPanel(); }
      return;
    }
    if (el.dataset.qp) {
      var qk = el.dataset.qp; S.qp[qk] = +el.value;
      V.root.querySelector("#fp-q-" + qk + "-v").textContent = el.value + (qk === "angle" ? "°" : qk === "width" ? "px" : " %");
      if (V.qp) V.qp.done = {};   // neue Einstellung: alle Frames gelten wieder als offen
      if (V.qp && V.qp.applied && V.qp.stage === "tune") { V.qp.applied = false; qpPanel(); }
      if (V.qp) { if (qk === "hard") { if (V.qp.stage === "tune") qpMask(); else V.qp.dirty = true; } if (V.qp.stage === "tune") qpGenSoon(); }
      return;
    }
    if (el.dataset.set) {
      var k = el.dataset.set, r = RANGES[k]; set()[k] = +el.value;
      V.root.querySelector("#fp-s-" + k + "-v").textContent = el.value + r[2]; need(); return;
    }
    if (el.id === "fp-br") { S.mbit = +el.value; V.root.querySelector("#fp-br-v").textContent = S.mbit + " Mbit/s"; V.root.querySelector("#fp-info").textContent = fmt(t("exportInfo"), { w: F ? F.ow : 1920, h: F ? F.oh : 1080, f: RATES[S.fpsI], br: S.mbit }); return; }
    if (el.id === "fp-fps") {
      if (F && painted()) { el.value = S.fpsI; return; }
      S.fpsI = +el.value; V.root.querySelector("#fp-fps-v").textContent = RATES[S.fpsI] + " fps";
      if (F && V.layer) { var tm = F.idx / F.fps; F.fps = RATES[S.fpsI]; F.n = Math.max(1, Math.floor(F.dur * F.fps)); V.dirty = false; F.idx = clamp(Math.floor(tm * F.fps), 0, F.n - 1); goFrame(F.idx); }
      return;
    }
    if (el.id === "fp-pos" && F && V.layer && !V.playing) goFrame(+el.value);
  }
  function onChange(e) {
    var el = e.target;
    if (el.id === "fp-file" && el.files[0]) { loadFile(el.files[0]); el.value = ""; return; }
    if (el.id === "fp-fps") { updateSide(); return; }
    if (el.dataset.opt) {
      S[el.dataset.opt] = el.checked;
      if (el.dataset.opt === "onion") reloadOnion(); else need();
      el.blur();
    }
  }
  function onDragOver(e) { if (!e.dataTransfer || Array.prototype.indexOf.call(e.dataTransfer.types || [], "Files") < 0) return; e.preventDefault(); V.root.querySelector("#fp-desk").classList.add("over"); }
  function onDragLeave(e) { if (e.target.id === "fp-desk") V.root.querySelector("#fp-desk").classList.remove("over"); }
  function onDrop(e) { if (!e.dataTransfer || !e.dataTransfer.files.length) return; e.preventDefault(); V.root.querySelector("#fp-desk").classList.remove("over"); if (!busy) askLoad(e.dataTransfer.files[0]); }
  var rsT = 0;
  function onResize() { clearTimeout(rsT); rsT = setTimeout(layout, 120); }

  function injectCSS() { var o = document.getElementById("fp-css"); if (o) o.remove(); var s = document.createElement("style"); s.id = "fp-css"; s.textContent = CSS; document.head.appendChild(s); }
  function mount(el, l) {
    unmount();
    lang = l === "en" ? "en" : "de";
    injectCSS();
    el.innerHTML = html();
    V = { root: el, undo: [], redo: [], need: true };
    el.addEventListener("pointerdown", onDown); window.addEventListener("pointermove", onMove); window.addEventListener("pointerup", onUp); window.addEventListener("pointercancel", onUp);
    el.addEventListener("pointerleave", onLeave, true);
    el.addEventListener("input", onInput); el.addEventListener("change", onChange); el.addEventListener("click", onClick);
    window.addEventListener("keydown", onKey); window.addEventListener("keyup", onKeyUp); window.addEventListener("blur", onBlurWin); window.addEventListener("resize", onResize);
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("pointerdown", onQPDown, true); window.addEventListener("pointermove", onQPMove); window.addEventListener("pointerup", onQPUp);
    var desk = el.querySelector("#fp-desk");
    desk.addEventListener("dragover", onDragOver); desk.addEventListener("dragleave", onDragLeave); desk.addEventListener("drop", onDrop);
    buildUI();
    raf = requestAnimationFrame(loop);
  }
  // Beim erneuten Öffnen (z. B. Sprachwechsel) bleibt die Bemalung erhalten, das Video wird neu geladen
  function unmount() {
    if (raf) cancelAnimationFrame(raf); raf = 0;
    if (!V) return;
    cancelReq = true;
    storeCurrent();
    if (V.vid) { V.vid.pause(); }
    window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); window.removeEventListener("pointercancel", onUp);
    window.removeEventListener("keydown", onKey); window.removeEventListener("keyup", onKeyUp); window.removeEventListener("blur", onBlurWin); window.removeEventListener("resize", onResize);
    V.root.removeEventListener("wheel", onWheel); V.root.removeEventListener("pointerdown", onQPDown, true);
    window.removeEventListener("pointermove", onQPMove); window.removeEventListener("pointerup", onQPUp); qpDrag = null;
    V.root.removeEventListener("pointerdown", onDown); V.root.removeEventListener("pointerleave", onLeave, true);
    V.root.removeEventListener("input", onInput); V.root.removeEventListener("change", onChange); V.root.removeEventListener("click", onClick);
    V = null;
  }

  window.FramePainter = { mount: mount, unmount: unmount, _debug: function () { return { F: F, V: V, S: S, goFrame: goFrame, exportMP4: doExport }; } };
})();
