/* Colorspin 0.1 – auf einer drehenden Schallplatte malen. Für Soy and Soul.
   Einbindung: colorspin.js per script-Tag laden, dann Colorspin.mount(element, "de" | "en")
   und Colorspin.unmount() beim Verlassen der Seite. */
(function () {
  "use strict";

  var VERSION = "0.1";
  var BUF = 2400;          // Auflösung der Platte und des Exports in Pixeln
  var lang = "de";

  function L2(de, en) { return { de: de, en: en }; }
  var TX = {
    title: L2("Colorspin", "Colorspin"),
    intro: L2("Eine weiße Schallplatte dreht sich, und du malst darauf. Jeder Strich wird zum Kreis, zur Spirale oder zum Muster. Weil die Platte weiß ist, siehst du die Drehung erst, wenn Farbe drauf ist.",
              "A white record spins and you paint on it. Every stroke turns into a circle, a spiral or a pattern. Because the record is white, you only see it spin once there is paint on it."),
    startHint: L2("Klick auf die Platte, um sie zu starten", "Click the record to start it"),
    color: L2("Farbe", "Colour"), alpha: L2("Deckkraft", "Opacity"), size: L2("Pinseldicke", "Brush size"),
    speed: L2("Geschwindigkeit", "Speed"), rpm: L2("{n} U/min", "{n} rpm"),
    start: L2("Platte starten", "Start record"), stop: L2("Platte anhalten", "Stop record"),
    dir: L2("Drehrichtung", "Direction"), cw: L2("Im Uhrzeigersinn", "Clockwise"), ccw: L2("Gegen den Uhrzeigersinn", "Counter-clockwise"),
    undo: L2("Letzten Strich zurück", "Undo last stroke"), clear: L2("Neue Platte", "New record"), sure: L2("Wirklich alles löschen?", "Really clear everything?"),
    export: L2("Als JPEG speichern", "Save as JPEG"), exportNote: L2("{n} × {n} Pixel", "{n} × {n} pixels"),
    exporting: L2("Bild wird erstellt …", "Creating image …"), saved: L2("Bild gespeichert.", "Image saved."),
    howH: L2("So funktioniert’s", "How it works"),
    how1: L2("Wähle Farbe, Deckkraft und Pinseldicke, starte die Platte und halte die Maus oder den Finger gedrückt. Bleibst du an einer Stelle, entsteht ein Ring. Ziehst du langsam nach innen oder außen, entsteht eine Spirale.",
             "Pick a colour, opacity and brush size, start the record and hold down the mouse or your finger. Stay in one place and you get a ring. Move slowly inwards or outwards and you get a spiral."),
    how2: L2("Deckkraft gilt pro Strich: Innerhalb eines Strichs bleibt die Farbe gleichmäßig, übereinander gemalte Striche mischen sich. Der Export speichert die Platte als quadratisches JPEG in hoher Auflösung. Die Zeichnung wird nicht gespeichert, wenn du die Seite verlässt.",
             "Opacity applies per stroke: within one stroke the colour stays even, while strokes painted over each other blend. The export saves the record as a square high-resolution JPEG. The drawing is not kept when you leave the page.")
  };
  function t(k) { return TX[k][lang]; }
  function fmt(s, o) { return s.replace(/\{(\w+)\}/g, function (_, k) { return o[k]; }); }

  // Zustand bleibt erhalten, solange die Seite offen ist (auch beim Wechsel zwischen Anwendungen)
  var D = null;  // { disc, stroke, undo, ang, spinning, started, rpm, dir, color, alpha, size, hasUndo }
  var V = null;

  function canvas(w, h) { var c = document.createElement("canvas"); c.width = w; c.height = h; return c; }
  function initData() {
    D = { disc: canvas(BUF, BUF), stroke: canvas(BUF, BUF), undo: canvas(BUF, BUF), ang: 0, spinning: false, started: false,
      rpm: 33, dir: 1, color: "#E2462F", alpha: 0.85, size: 14, hasUndo: false, drawing: false, last: null };
    var c = D.disc.getContext("2d"); c.fillStyle = "#FFFFFF"; c.fillRect(0, 0, BUF, BUF);
  }

  var CSS = ".cs-ver{display:inline-block;margin-left:10px;padding:1px 8px;border:1px solid var(--line);border-radius:999px;font:600 .75rem var(--f-body);color:var(--soft);vertical-align:middle}" +
    ".cs-wrap{display:grid;grid-template-columns:minmax(0,1fr);gap:24px;margin-top:22px}" +
    "@media (min-width:900px){.cs-wrap{grid-template-columns:minmax(0,1fr) 300px;align-items:start}}" +
    ".cs-stage{position:relative;width:100%;max-width:min(100%,78vh);aspect-ratio:1;margin:0 auto;border-radius:18px;background:#2A2826;overflow:hidden;touch-action:none}" +
    ".cs-stage canvas{display:block;width:100%;height:100%;cursor:crosshair}" +
    ".cs-hint{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);pointer-events:none;background:rgba(21,23,21,.82);color:#F4F1EC;font:600 .95rem/1.3 var(--f-body);padding:10px 16px;border-radius:999px;white-space:nowrap;transition:opacity .3s}" +
    ".cs-hint[hidden]{display:none}" +
    ".cs-side{display:flex;flex-direction:column;gap:18px;min-width:0}" +
    ".cs-row{display:flex;flex-direction:column;gap:8px}" +
    ".cs-row label{display:flex;justify-content:space-between;font-weight:600;font-size:.92rem}" +
    ".cs-row label span{color:var(--soft);font-weight:500;font-variant-numeric:tabular-nums}" +
    ".cs-row input[type=range]{width:100%;accent-color:var(--accent)}" +
    ".cs-color{display:flex;align-items:center;gap:12px}" +
    ".cs-color input{width:56px;height:40px;padding:0;border:1px solid var(--line);border-radius:10px;background:none;cursor:pointer}" +
    ".cs-swatch{flex:1;height:40px;border-radius:10px;border:1px solid var(--line);display:grid;place-items:center;background:#fff;background-image:linear-gradient(45deg,#ddd 25%,transparent 25%,transparent 75%,#ddd 75%),linear-gradient(45deg,#ddd 25%,transparent 25%,transparent 75%,#ddd 75%);background-size:14px 14px;background-position:0 0,7px 7px}" +
    ".cs-swatch i{display:block;border-radius:50%}" +
    ".cs-btns{display:flex;flex-wrap:wrap;gap:8px}" +
    ".cs-btns .navbtn[aria-disabled=true]{opacity:.45;cursor:default}" +
    ".cs-btns .navbtn.armed{background:var(--accent);border-color:var(--accent);color:var(--bg)}" +
    ".cs-main{font:600 1rem var(--f-body);padding:12px 18px;border-radius:999px;border:0;background:var(--ink);color:var(--bg);cursor:pointer}" +
    ".cs-main.on{background:var(--accent)}" +
    ".cs-exp{font:600 1rem var(--f-body);padding:12px 18px;border-radius:999px;border:1px solid var(--ink);background:transparent;color:var(--ink);cursor:pointer}" +
    ".cs-note{margin:0;color:var(--soft);font-size:.88rem;min-height:1.4em}";

  function html() {
    return '<h1 class="ptitle">' + t("title") + '<span class="cs-ver">v' + VERSION + '</span></h1><p class="pintro">' + t("intro") + "</p>" +
      '<div class="cs-wrap"><div><div class="cs-stage" id="cs-stage"><canvas id="cs-cv" aria-label="' + t("title") + '"></canvas><div class="cs-hint" id="cs-hint">' + t("startHint") + "</div></div></div>" +
      '<div class="cs-side">' +
      '<button type="button" class="cs-main" id="cs-spin"></button>' +
      '<div class="cs-row"><label for="cs-speed">' + t("speed") + '<span id="cs-speed-v"></span></label><input type="range" id="cs-speed" min="1" max="120" step="1"></div>' +
      '<div class="cs-row"><label>' + t("dir") + '</label><div class="seg" role="group" aria-label="' + t("dir") + '"><button type="button" data-dir="1" aria-pressed="false">↻ ' + t("cw") + '</button><button type="button" data-dir="-1" aria-pressed="false">↺ ' + t("ccw") + "</button></div></div>" +
      '<div class="cs-row"><label for="cs-color">' + t("color") + '</label><div class="cs-color"><input type="color" id="cs-color"><div class="cs-swatch"><i id="cs-dot"></i></div></div></div>' +
      '<div class="cs-row"><label for="cs-alpha">' + t("alpha") + '<span id="cs-alpha-v"></span></label><input type="range" id="cs-alpha" min="5" max="100" step="1"></div>' +
      '<div class="cs-row"><label for="cs-size">' + t("size") + '<span id="cs-size-v"></span></label><input type="range" id="cs-size" min="1" max="80" step="1"></div>' +
      '<div class="cs-btns"><button type="button" class="navbtn" data-cs="undo">' + t("undo") + '</button><button type="button" class="navbtn" data-cs="clear">' + t("clear") + "</button></div>" +
      '<button type="button" class="cs-exp" data-cs="export">' + t("export") + '</button><p class="cs-note" id="cs-note">' + fmt(t("exportNote"), { n: BUF.toLocaleString(lang === "de" ? "de-DE" : "en-GB") }) + "</p>" +
      "</div></div>" +
      '<section class="phow"><h2>' + t("howH") + "</h2><p>" + t("how1") + "</p><p>" + t("how2") + "</p></section>";
  }

  // ---------- Malen ----------
  function geom() {
    var W = V.cv.clientWidth, R = W * 0.46;
    return { W: W, cx: W / 2, cy: W / 2, R: R };
  }
  // Bildschirmpunkt → Plattenkoordinate (im Puffer) beim aktuellen Winkel
  function toDisc(px, py, ang) {
    var g = geom(), dx = px - g.cx, dy = py - g.cy, c = Math.cos(-ang), s = Math.sin(-ang);
    var k = BUF / (2 * g.R);
    return { x: BUF / 2 + (dx * c - dy * s) * k, y: BUF / 2 + (dx * s + dy * c) * k };
  }
  function brushW() { return D.size * BUF / (2 * geom().R); }
  function paintTo(px, py, ang) {
    var p = toDisc(px, py, ang), c = D.stroke.getContext("2d");
    c.strokeStyle = D.color; c.fillStyle = D.color; c.lineCap = "round"; c.lineJoin = "round"; c.lineWidth = brushW();
    if (!D.last) { c.beginPath(); c.arc(p.x, p.y, brushW() / 2, 0, Math.PI * 2); c.fill(); }
    else { c.beginPath(); c.moveTo(D.last.x, D.last.y); c.lineTo(p.x, p.y); c.stroke(); }
    D.last = p;
  }
  // Zwischen zwei Bildern in kleinen Schritten malen, damit schnelle Drehung runde Bögen ergibt
  function paintSpan(p0, p1, a0, a1) {
    var g = geom(), r = Math.hypot(p1.x - g.cx, p1.y - g.cy);
    var n = Math.max(1, Math.ceil(Math.max(Math.abs(a1 - a0) * r / 2, Math.hypot(p1.x - p0.x, p1.y - p0.y) / 2)));
    n = Math.min(n, 200);
    for (var i = 1; i <= n; i++) {
      var f = i / n;
      paintTo(p0.x + (p1.x - p0.x) * f, p0.y + (p1.y - p0.y) * f, a0 + (a1 - a0) * f);
    }
  }
  function commitStroke() {
    if (!D.drawing) return;
    D.drawing = false; D.last = null;
    var u = D.undo.getContext("2d"); u.globalCompositeOperation = "copy"; u.drawImage(D.disc, 0, 0); u.globalCompositeOperation = "source-over";
    D.hasUndo = true;
    var c = D.disc.getContext("2d");
    c.globalAlpha = D.alpha; c.drawImage(D.stroke, 0, 0); c.globalAlpha = 1;
    D.stroke.getContext("2d").clearRect(0, 0, BUF, BUF);
    updateUI();
  }

  // ---------- Darstellung ----------
  function draw() {
    var cv = V.cv, c = V.ctx, W = cv.clientWidth, dpr = window.devicePixelRatio || 1;
    if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(W * dpr); }
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    var g = geom();
    c.fillStyle = "#2A2826"; c.fillRect(0, 0, W, W);
    // Plattenteller
    c.fillStyle = "#1C1A19"; c.beginPath(); c.arc(g.cx, g.cy, g.R * 1.035, 0, Math.PI * 2); c.fill();
    c.save();
    c.shadowColor = "rgba(0,0,0,.45)"; c.shadowBlur = 18; c.shadowOffsetY = 6;
    c.fillStyle = "#FFFFFF"; c.beginPath(); c.arc(g.cx, g.cy, g.R, 0, Math.PI * 2); c.fill();
    c.restore();
    c.save();
    c.beginPath(); c.arc(g.cx, g.cy, g.R, 0, Math.PI * 2); c.clip();
    c.translate(g.cx, g.cy); c.rotate(D.ang);
    c.drawImage(D.disc, -g.R, -g.R, 2 * g.R, 2 * g.R);
    if (D.drawing) { c.globalAlpha = D.alpha; c.drawImage(D.stroke, -g.R, -g.R, 2 * g.R, 2 * g.R); c.globalAlpha = 1; }
    c.restore();
    // Mittelloch
    c.fillStyle = "#D9D6D0"; c.beginPath(); c.arc(g.cx, g.cy, Math.max(3, g.R * 0.022), 0, Math.PI * 2); c.fill();
    c.fillStyle = "#2A2826"; c.beginPath(); c.arc(g.cx, g.cy, Math.max(1.5, g.R * 0.011), 0, Math.PI * 2); c.fill();
    // Pinselvorschau
    if (V.hover && !V.down) {
      c.strokeStyle = "rgba(21,23,21,.55)"; c.lineWidth = 1; c.beginPath(); c.arc(V.hover.x, V.hover.y, Math.max(1, D.size / 2), 0, Math.PI * 2); c.stroke();
    }
  }

  var raf = 0, lastT = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    var dt = Math.min(0.05, (now - (lastT || now)) / 1000); lastT = now;
    var a0 = D.ang;
    if (D.spinning) D.ang += D.dir * D.rpm / 60 * Math.PI * 2 * dt;
    if (V.down && V.ptr) {
      if (!D.drawing) { D.drawing = true; D.last = null; paintTo(V.ptr.x, V.ptr.y, D.ang); V.prev = { x: V.ptr.x, y: V.ptr.y }; }
      else { paintSpan(V.prev, V.ptr, a0, D.ang); V.prev = { x: V.ptr.x, y: V.ptr.y }; }
    }
    draw();
  }

  // ---------- Bedienung ----------
  function pos(e) { var r = V.cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  function onDown(e) {
    if (e.button && e.button > 0) return;
    e.preventDefault();
    if (!D.started) { D.started = true; D.spinning = true; updateUI(); return; } // erster Klick startet nur die Platte
    V.down = true; V.ptr = pos(e);
    try { V.cv.setPointerCapture(e.pointerId); } catch (er) {}
  }
  function onMove(e) { var p = pos(e); V.hover = p; if (V.down) V.ptr = p; }
  function onUp() { if (!V) return; if (V.down) { V.down = false; V.ptr = null; commitStroke(); } }
  function onLeave() { if (V) V.hover = null; }

  function updateUI() {
    if (!V) return;
    var r = V.root;
    var sp = r.querySelector("#cs-spin");
    sp.textContent = D.spinning ? t("stop") : t("start"); sp.classList.toggle("on", D.spinning);
    r.querySelector("#cs-hint").hidden = D.started;
    r.querySelector("#cs-speed").value = D.rpm; r.querySelector("#cs-speed-v").textContent = fmt(t("rpm"), { n: D.rpm });
    r.querySelector("#cs-alpha").value = Math.round(D.alpha * 100); r.querySelector("#cs-alpha-v").textContent = Math.round(D.alpha * 100) + " %";
    r.querySelector("#cs-size").value = D.size; r.querySelector("#cs-size-v").textContent = D.size + " px";
    r.querySelector("#cs-color").value = D.color;
    var dot = r.querySelector("#cs-dot"), sz = Math.max(4, Math.min(36, D.size));
    dot.style.width = dot.style.height = sz + "px"; dot.style.background = D.color; dot.style.opacity = D.alpha;
    Array.prototype.forEach.call(r.querySelectorAll("[data-dir]"), function (b) { b.setAttribute("aria-pressed", String(+b.dataset.dir === D.dir)); });
    r.querySelector('[data-cs="undo"]').setAttribute("aria-disabled", String(!D.hasUndo));
  }
  function onInput(e) {
    var id = e.target.id;
    if (id === "cs-speed") D.rpm = +e.target.value;
    else if (id === "cs-alpha") D.alpha = +e.target.value / 100;
    else if (id === "cs-size") D.size = +e.target.value;
    else if (id === "cs-color") D.color = e.target.value;
    else return;
    updateUI();
  }
  function note(s) { var n = document.getElementById("cs-note"); if (n) n.textContent = s; }
  function onClick(e) {
    if (e.target.closest("#cs-spin")) { D.started = true; D.spinning = !D.spinning; updateUI(); return; }
    var d = e.target.closest("[data-dir]");
    if (d) { D.dir = +d.dataset.dir; updateUI(); return; }
    var b = e.target.closest("[data-cs]"); if (!b) return;
    var a = b.dataset.cs;
    if (a === "undo") {
      if (!D.hasUndo) return;
      var c = D.disc.getContext("2d"); c.globalCompositeOperation = "copy"; c.drawImage(D.undo, 0, 0); c.globalCompositeOperation = "source-over";
      D.hasUndo = false; updateUI(); return;
    }
    if (a === "clear") {
      if (!b.classList.contains("armed")) {
        b.classList.add("armed"); b.textContent = t("sure");
        setTimeout(function () { if (b.isConnected) { b.classList.remove("armed"); b.textContent = t("clear"); } }, 3500);
        return;
      }
      var keep = { rpm: D.rpm, dir: D.dir, color: D.color, alpha: D.alpha, size: D.size };
      initData(); Object.assign(D, keep);
      b.classList.remove("armed"); b.textContent = t("clear"); updateUI(); return;
    }
    if (a === "export") exportJPEG();
  }
  function exportJPEG() {
    note(t("exporting"));
    var out = canvas(BUF, BUF), c = out.getContext("2d");
    c.fillStyle = "#ECEDE9"; c.fillRect(0, 0, BUF, BUF);
    var R = BUF / 2 - BUF * 0.02;
    c.save(); c.shadowColor = "rgba(0,0,0,.22)"; c.shadowBlur = BUF * 0.02; c.shadowOffsetY = BUF * 0.006;
    c.fillStyle = "#FFFFFF"; c.beginPath(); c.arc(BUF / 2, BUF / 2, R, 0, Math.PI * 2); c.fill(); c.restore();
    c.save(); c.beginPath(); c.arc(BUF / 2, BUF / 2, R, 0, Math.PI * 2); c.clip();
    c.translate(BUF / 2, BUF / 2); c.rotate(D.ang); c.drawImage(D.disc, -R, -R, 2 * R, 2 * R); c.restore();
    c.fillStyle = "#D9D6D0"; c.beginPath(); c.arc(BUF / 2, BUF / 2, R * 0.022, 0, Math.PI * 2); c.fill();
    out.toBlob(function (blob) {
      if (!blob) { note(""); return; }
      var url = URL.createObjectURL(blob), a = document.createElement("a");
      var d = new Date(), pad = function (n) { return (n < 10 ? "0" : "") + n; };
      a.href = url; a.download = "colorspin-" + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + "-" + pad(d.getHours()) + pad(d.getMinutes()) + ".jpg";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      note(t("saved"));
    }, "image/jpeg", 0.93);
  }

  function injectCSS() { var o = document.getElementById("cs-css"); if (o) o.remove(); var s = document.createElement("style"); s.id = "cs-css"; s.textContent = CSS; document.head.appendChild(s); }

  function mount(el, l) {
    unmount();
    lang = l === "en" ? "en" : "de";
    if (!D) initData();
    injectCSS();
    el.innerHTML = html();
    V = { root: el, cv: el.querySelector("#cs-cv"), down: false, ptr: null, hover: null };
    V.ctx = V.cv.getContext("2d");
    V.cv.addEventListener("pointerdown", onDown);
    V.cv.addEventListener("pointermove", onMove);
    V.cv.addEventListener("pointerleave", onLeave);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    el.addEventListener("click", onClick);
    el.addEventListener("input", onInput);
    updateUI();
    lastT = 0; raf = requestAnimationFrame(frame);
  }
  function unmount() {
    if (raf) cancelAnimationFrame(raf); raf = 0;
    if (V) {
      if (V.down) { V.down = false; commitStroke(); }
      window.removeEventListener("pointerup", onUp); window.removeEventListener("pointercancel", onUp);
      V.root.removeEventListener("click", onClick); V.root.removeEventListener("input", onInput);
      V = null;
    }
  }

  window.Colorspin = { mount: mount, unmount: unmount, _debug: function () { return { D: D, V: V }; } };
})();
