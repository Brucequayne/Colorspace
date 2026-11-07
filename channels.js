/* Channel Exporter 0.1 – Bilder im Browser in Kanäle zerlegen und exportieren. Für Color Space.
   Einbindung: channels.js per script-Tag laden, dann Channels.mount(element, "de" | "en") und Channels.unmount().
   Bilder verlassen nie das Gerät.

   Werkzeuge: Jedes Werkzeug in TOOLS liefert eine Liste von Ebenen. Jede Ebene rechnet aus den Pixeln des
   Originals ihr eigenes Bild (render). Bühne, Ziehen, Ein/Aus und Export funktionieren für jedes Werkzeug gleich.
   Ein neues Werkzeug (z. B. Tiefenkarte, Schwarzweiß, Alphakanal) ist nur ein weiterer Eintrag in TOOLS. */
(function () {
  "use strict";

  var VERSION = "0.1", PREVIEW = 2000, MAX_PIX = 40e6;
  var lang = "de";
  function L2(de, en) { return { de: de, en: en }; }
  function tr(o) { return o[lang]; }

  var TX = {
    title: L2("Channel Exporter", "Channel Exporter"),
    intro: L2("Zieh ein Bild auf die Fläche. Das gewählte Werkzeug zerlegt es in Ebenen, zum Beispiel in die drei Lichtkanäle Rot, Grün und Blau. Du kannst die Ebenen verschieben, ausblenden und einzeln oder zusammen exportieren. Das Bild verlässt dein Gerät nicht.",
              "Drop an image onto the area. The selected tool splits it into layers, for example the three channels of light: red, green and blue. You can move and hide the layers and export them one by one or together. The image never leaves your device."),
    drop: L2("Bild hierher ziehen", "Drop an image here"), or: L2("oder", "or"), pick: L2("Bild auswählen", "Choose image"),
    dropNote: L2("JPEG, PNG oder WebP · bleibt auf deinem Gerät", "JPEG, PNG or WebP · stays on your device"),
    other: L2("Anderes Bild", "Other image"), tools: L2("Werkzeuge", "Tools"), more: L2("Weitere Werkzeuge folgen.", "More tools are coming."),
    layers: L2("Ebenen", "Layers"), on: L2("An", "On"), off: L2("Aus", "Off"),
    reset: L2("Zurücksetzen", "Reset"), spread: L2("Verteilen", "Spread"), snap: L2("Einrasten", "Snap to origin"),
    start: L2("Zieh eine Ebene mit Maus oder Finger weg.", "Drag a layer away with mouse or finger."),
    hint: L2("Bring alle Ebenen wieder in Deckung, dann ist das Bild komplett.", "Bring all layers back into line to complete the picture."),
    ok: L2("Deckungsgleich: das Originalbild ist wieder da.", "Perfectly aligned: the original picture is back."),
    exportH: L2("Export", "Export"), look: L2("Kanäle als", "Channels as"),
    tinted: L2("Farbig", "Coloured"), gray: L2("Graustufen", "Greyscale"),
    one: L2("{n} als PNG", "{n} as PNG"), all: L2("Alle Ebenen", "All layers"), comp: L2("Komposition als PNG", "Composite as PNG"),
    compNote: L2("Die Komposition übernimmt Verschiebungen und ausgeblendete Ebenen. Alle Exporte in voller Auflösung: {w} × {h} px.", "The composite keeps offsets and hidden layers. All exports at full resolution: {w} × {h} px."),
    working: L2("Wird berechnet …", "Working …"), saved: L2("Gespeichert: {f}", "Saved: {f}"),
    shrunk: L2("Das Bild war sehr groß und wurde auf {w} × {h} px verkleinert.", "The image was very large and was reduced to {w} × {h} px."),
    bad: L2("Diese Datei konnte nicht als Bild geöffnet werden.", "This file could not be opened as an image."),
    howH: L2("So funktioniert’s", "How it works"),
    how1: L2("Jede Ebene wird pixelgenau aus deinem Bild herausgerechnet. Beim RGB-Split enthält jede Ebene nur einen Farbkanal. Übereinander addieren sich die Lichter wieder: Liegen alle drei deckungsgleich, siehst du das Original. Schon wenige Pixel Versatz erzeugen Farbsäume.",
             "Each layer is computed pixel-exactly from your image. In RGB split, each layer holds just one colour channel. Stacked, the lights add up again: when all three line up, you see the original. A few pixels of offset create colour fringes."),
    how2: L2("Bedienung: Ebene mit Maus oder Finger ziehen. Die Tasten 1, 2, 3 wählen eine Ebene, die Pfeiltasten verschieben sie um 1 Pixel (mit Umschalt um 10). „Einrasten“ zieht eine Ebene in ihre Ausgangsposition, sobald sie nah genug ist. Beim Export kannst du die Kanäle farbig oder als Graustufen speichern, Graustufen sind praktisch als Masken in der Bildbearbeitung.",
             "Controls: drag a layer with mouse or finger. Keys 1, 2, 3 pick a layer, arrow keys move it by 1 pixel (10 with Shift). “Snap to origin” pulls a layer back into place once it is close enough. When exporting you can save the channels in colour or as greyscale, which is handy as masks in image editing.")
  };
  function t(k) { return tr(TX[k]); }
  function fmt(s, o) { return s.replace(/\{(\w+)\}/g, function (_, k) { return o[k]; }); }

  // ---------- Werkzeuge ----------
  function channel(idx) {
    return function (s, o, mode) {
      var n = s.length;
      if (mode === "gray") { for (var i = 0; i < n; i += 4) { var v = s[i + idx]; o[i] = v; o[i + 1] = v; o[i + 2] = v; o[i + 3] = 255; } }
      else { for (var j = 0; j < n; j += 4) { o[j] = idx === 0 ? s[j] : 0; o[j + 1] = idx === 1 ? s[j + 1] : 0; o[j + 2] = idx === 2 ? s[j + 2] : 0; o[j + 3] = 255; } }
    };
  }
  var TOOLS = [
    { id: "rgb", name: L2("RGB-Split", "RGB split"), short: "rgb",
      desc: L2("Trennt das Bild in die Lichtkanäle Rot, Grün und Blau.", "Splits the image into the red, green and blue channels of light."),
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="9" r="6" fill="#E5484D"/><circle cx="15" cy="9" r="6" fill="#30A46C" style="mix-blend-mode:screen"/><circle cx="12" cy="15" r="6" fill="#3E63DD" style="mix-blend-mode:screen"/></svg>',
      modes: ["tinted", "gray"], blend: "screen",
      spread: [[-0.17, -0.09], [0.15, -0.05], [0.01, 0.13]],
      layers: [
        { k: "r", name: L2("Rot", "Red"), file: L2("rot", "red"), color: "#E5484D", render: channel(0) },
        { k: "g", name: L2("Grün", "Green"), file: L2("gruen", "green"), color: "#30A46C", render: channel(1) },
        { k: "b", name: L2("Blau", "Blue"), file: L2("blau", "blue"), color: "#3E63DD", render: channel(2) }
      ] }
  ];
  function tool() { return TOOLS.filter(function (x) { return x.id === S.tool; })[0] || TOOLS[0]; }

  // ---------- Zustand ----------
  var S = { tool: "rgb", mode: "tinted", snap: true };
  var IMG = null;   // { name, full (canvas), w, h, prev (canvas), pw, ph }
  var L = null;     // { x:{}, y:{}, on:{}, z:[], active, touched }
  var V = null;     // UI

  function resetLayers() {
    var T = tool(); L = { x: {}, y: {}, on: {}, z: [], active: T.layers[0].k, touched: false };
    T.layers.forEach(function (l) { L.x[l.k] = 0; L.y[l.k] = 0; L.on[l.k] = true; L.z.push(l.k); });
  }

  // ---------- Laden ----------
  function loadFile(file) {
    if (!file || !/^image\//.test(file.type || "") && !/\.(jpe?g|png|webp|gif|bmp|avif)$/i.test(file.name || "")) { note(t("bad")); return; }
    var url = URL.createObjectURL(file), im = new Image();
    im.onload = function () {
      var w = im.naturalWidth, h = im.naturalHeight, f = Math.min(1, Math.sqrt(MAX_PIX / (w * h)));
      w = Math.max(1, Math.round(w * f)); h = Math.max(1, Math.round(h * f));
      var full = document.createElement("canvas"); full.width = w; full.height = h;
      full.getContext("2d").drawImage(im, 0, 0, w, h);
      var pf = Math.min(1, PREVIEW / Math.max(w, h)), pw = Math.max(1, Math.round(w * pf)), ph = Math.max(1, Math.round(h * pf));
      var prev = document.createElement("canvas"); prev.width = pw; prev.height = ph;
      var px = prev.getContext("2d"); px.imageSmoothingQuality = "high"; px.drawImage(full, 0, 0, pw, ph);
      URL.revokeObjectURL(url);
      IMG = { name: (file.name || "bild").replace(/\.[^.]+$/, ""), full: full, w: w, h: h, prev: prev, pw: pw, ph: ph, shrunk: f < 1 };
      resetLayers();
      if (V) build();
    };
    im.onerror = function () { URL.revokeObjectURL(url); note(t("bad")); };
    im.src = url;
  }

  // Ebene aus einer Quelle (Vorschau oder volle Auflösung) rechnen
  function renderLayer(src, layer, mode) {
    var w = src.width, h = src.height, sx = src.getContext("2d"), sd = sx.getImageData(0, 0, w, h);
    var c = document.createElement("canvas"); c.width = w; c.height = h;
    var cx = c.getContext("2d"), od = cx.createImageData(w, h);
    layer.render(sd.data, od.data, mode);
    cx.putImageData(od, 0, 0);
    return c;
  }

  // ---------- Bühne ----------
  var ds = 1, org = { x: 0, y: 0 }, drag = null, animT = 0;
  function stage() { return V && V.root.querySelector("#ch-stage"); }
  function layout() {
    var st = stage(); if (!st || !IMG) return;
    var sw = st.clientWidth, sh = st.clientHeight, m = 18;
    ds = Math.min((sw - 2 * m) / IMG.w, (sh - 2 * m) / IMG.h, IMG.pw / IMG.w * 1.5);
    var dw = IMG.w * ds, dh = IMG.h * ds;
    org = { x: (sw - dw) / 2, y: (sh - dh) / 2 };
    Array.prototype.forEach.call(st.querySelectorAll(".ch-lyr"), function (c) {
      var k = c.getAttribute("data-k");
      c.style.width = dw + "px"; c.style.height = dh + "px";
      c.style.left = (org.x + L.x[k] * ds) + "px"; c.style.top = (org.y + L.y[k] * ds) + "px";
    });
    var side = V.root.querySelector("#ch-side");
    if (side) side.style.maxHeight = window.innerWidth >= 1100 ? V.root.querySelector(".ch-deskbox").offsetHeight + "px" : "";
    status();
  }
  function clampPos(nx, ny) {
    var st = stage(), sw = st.clientWidth, sh = st.clientHeight, dw = IMG.w * ds, dh = IMG.h * ds;
    var l = Math.min(Math.max(org.x + nx * ds, -dw * 0.8), sw - dw * 0.2);
    var tp = Math.min(Math.max(org.y + ny * ds, -dh * 0.8), sh - dh * 0.2);
    return { x: (l - org.x) / ds, y: (tp - org.y) / ds };
  }
  function setPos(k, nx, ny) {
    var p = clampPos(nx, ny);
    if (S.snap && Math.sqrt(p.x * p.x + p.y * p.y) * ds < 7) { p.x = 0; p.y = 0; }
    L.x[k] = p.x; L.y[k] = p.y;
  }
  function animate() {
    var st = stage(); if (!st) return;
    st.classList.add("anim"); clearTimeout(animT);
    animT = setTimeout(function () { if (st.isConnected) st.classList.remove("anim"); }, 450);
  }
  function select(k) {
    L.active = k; L.z = L.z.filter(function (x) { return x !== k; }).concat(k);
    L.z.forEach(function (key, i) { var c = V.root.querySelector('.ch-lyr[data-k="' + key + '"]'); if (c) c.style.zIndex = i + 1; });
    Array.prototype.forEach.call(V.root.querySelectorAll("[data-sel]"), function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-sel") === k)); });
  }
  function sg(n) { return (n > 0 ? "+" : n < 0 ? "−" : "±") + Math.abs(n); }
  function status() {
    if (!V || !IMG) return;
    var al = true;
    tool().layers.forEach(function (l) {
      var x = L.x[l.k], y = L.y[l.k], el = V.root.querySelector("#ch-o-" + l.k);
      if (el) el.textContent = "x " + sg(Math.round(x)) + "  y " + sg(Math.round(y));
      if (!L.on[l.k] || Math.abs(x) >= 0.5 || Math.abs(y) >= 0.5) al = false;
    });
    var s = V.root.querySelector("#ch-stat");
    if (s) { s.textContent = al ? (L.touched ? t("ok") : t("start")) : t("hint"); s.classList.toggle("ok", al && L.touched); }
  }
  function eyes() {
    tool().layers.forEach(function (l) {
      var b = V.root.querySelector('[data-vis="' + l.k + '"]'), c = V.root.querySelector('.ch-lyr[data-k="' + l.k + '"]');
      if (b) { b.setAttribute("aria-pressed", String(L.on[l.k])); b.textContent = L.on[l.k] ? t("on") : t("off"); }
      if (c) c.classList.toggle("off", !L.on[l.k]);
    });
  }

  // ---------- Export ----------
  function download(canvas, fname) {
    return new Promise(function (res) {
      canvas.toBlob(function (b) {
        var url = URL.createObjectURL(b), a = document.createElement("a");
        a.href = url; a.download = fname; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
        res();
      }, "image/png");
    });
  }
  function later() { return new Promise(function (r) { setTimeout(r, 30); }); }
  var busy = false;
  async function exportLayers(keys) {
    if (busy || !IMG) return; busy = true; note(t("working")); await later();
    try {
      var T = tool(), names = [];
      for (var i = 0; i < keys.length; i++) {
        var l = T.layers.filter(function (q) { return q.k === keys[i]; })[0];
        var f = IMG.name + "-" + tr(l.file) + (S.mode === "gray" ? "-grau" : "") + ".png";
        await download(renderLayer(IMG.full, l, S.mode), f); names.push(f);
        if (i < keys.length - 1) await new Promise(function (r) { setTimeout(r, 400); });
      }
      note(fmt(t("saved"), { f: names.join(", ") }));
    } finally { busy = false; }
  }
  async function exportComp() {
    if (busy || !IMG) return; busy = true; note(t("working")); await later();
    try {
      var T = tool(), c = document.createElement("canvas"); c.width = IMG.w; c.height = IMG.h;
      var x = c.getContext("2d"); x.fillStyle = "#000"; x.fillRect(0, 0, IMG.w, IMG.h);
      x.globalCompositeOperation = T.blend === "screen" ? "screen" : "source-over";
      T.layers.forEach(function (l) { if (L.on[l.k]) x.drawImage(renderLayer(IMG.full, l, "tinted"), Math.round(L.x[l.k]), Math.round(L.y[l.k])); });
      var f = IMG.name + "-" + T.short + "-komposition.png";
      await download(c, f); note(fmt(t("saved"), { f: f }));
    } finally { busy = false; }
  }

  // ---------- Oberfläche ----------
  var CSS = ".ch-ver{display:inline-block;margin-left:10px;padding:1px 8px;border:1px solid var(--line);font:600 .75rem var(--f-body);color:var(--soft);vertical-align:middle}" +
    ".ch-wrap{display:grid;grid-template-columns:minmax(0,1fr);gap:20px;margin-top:22px}" +
    ".ch-stage{position:relative;width:100%;aspect-ratio:4/5;max-height:80vh;min-height:320px;background:#000;overflow:hidden;isolation:isolate;user-select:none;-webkit-user-select:none;touch-action:none}" +
    ".ch-stage.empty{display:grid;place-items:center;background:#1E1F22}" +
    ".ch-stage.over{outline:3px dashed #E3B83F;outline-offset:-10px}" +
    ".ch-stage:focus-visible{outline:2px solid var(--accent);outline-offset:3px}" +
    ".ch-lyr{position:absolute;display:block;max-width:none;cursor:grab;touch-action:none}" +
    ".ch-lyr.grab{cursor:grabbing}.ch-lyr.off{display:none}.ch-stage.anim .ch-lyr{transition:left .4s ease,top .4s ease}" +
    ".ch-drop{text-align:center;color:#F1EFEA;display:flex;flex-direction:column;align-items:center;gap:10px;padding:20px}" +
    ".ch-drop b{font:600 1.4rem/1.2 var(--f-display)}.ch-drop span{color:rgba(241,239,234,.7)}" +
    ".ch-pick{font:600 1rem var(--f-body);padding:12px 20px;border:0;background:#F1EFEA;color:#151715;cursor:pointer}" +
    ".ch-side{display:flex;flex-direction:column;gap:14px;min-width:0}" +
    ".ch-box{border:1px solid var(--line);background:var(--card,transparent);padding:14px 16px;display:flex;flex-direction:column;gap:12px}" +
    ".ch-box h3{font:600 .78rem/1 var(--f-body);letter-spacing:.12em;text-transform:uppercase;color:var(--soft);margin:0}" +
    ".ch-desc{margin:0;color:var(--soft);font-size:.88rem;line-height:1.45}" +
    ".ch-tools{display:flex;flex-wrap:wrap;gap:8px}" +
    ".ch-tool{display:flex;align-items:center;gap:8px;font:600 .9rem var(--f-body);padding:8px 12px;border:1px solid var(--line);background:transparent;color:var(--ink);cursor:pointer}" +
    ".ch-tool svg{width:20px;height:20px;display:block}" +
    ".ch-tool[aria-pressed=true]{background:var(--ink);color:var(--bg);border-color:var(--ink)}" +
    ".ch-chip{display:flex;align-items:stretch;border:1px solid var(--line);overflow:hidden}" +
    ".ch-chip button{font:inherit;color:var(--ink);background:transparent;border:0;cursor:pointer}" +
    ".ch-chip .sel{flex:1;display:grid;grid-template-columns:auto 1fr;column-gap:10px;align-items:center;text-align:left;padding:8px 14px 8px 12px}" +
    ".ch-chip .sel i{width:14px;height:14px;border-radius:50%;grid-row:1/3}" +
    ".ch-chip .sel b{font-weight:600;line-height:1.2}" +
    ".ch-chip .sel span{font:500 .78rem/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--soft);white-space:pre}" +
    ".ch-chip .sel[aria-pressed=true]{background:var(--ink);color:var(--bg)}.ch-chip .sel[aria-pressed=true] span{color:inherit;opacity:.8}" +
    ".ch-chip .eye{padding:0 14px;border-left:1px solid var(--line);font-weight:600;font-size:.85rem;min-width:56px;color:var(--soft)}" +
    ".ch-chip .eye[aria-pressed=true]{color:var(--ink)}" +
    ".ch-btns{display:flex;flex-wrap:wrap;gap:8px;align-items:center}" +
    ".ch-snap{display:inline-flex;align-items:center;gap:8px;font-weight:500;cursor:pointer;font-size:.92rem}.ch-snap input{width:18px;height:18px;accent-color:var(--accent)}" +
    ".ch-stat{margin:0;color:var(--soft);font-size:.88rem;min-height:1.3em}.ch-stat.ok{color:var(--accent);font-weight:600}" +
    ".ch-seg{display:flex}.ch-seg button{flex:1;font:600 .88rem var(--f-body);padding:8px 10px;border:1px solid var(--line);background:transparent;color:var(--ink);cursor:pointer}" +
    ".ch-seg button+button{border-left:0}.ch-seg button[aria-pressed=true]{background:var(--ink);color:var(--bg);border-color:var(--ink)}" +
    ".ch-save{font:600 1rem var(--f-body);padding:12px 18px;border:0;background:var(--ink);color:var(--bg);cursor:pointer}" +
    ".ch-note{margin:0;color:var(--soft);font-size:.88rem;min-height:1.3em;overflow-wrap:anywhere}" +
    "@media (min-width:1100px){" +
      ".ch-wrap{width:min(calc(100vw - 48px),2200px);margin-left:calc((100% - min(calc(100vw - 48px),2200px)) / 2);grid-template-columns:minmax(0,3fr) minmax(300px,1fr);align-items:start}" +
      ".ch-stage{aspect-ratio:16/9;max-height:calc(100vh - 40px)}.ch-deskbox{position:sticky;top:20px}" +
      ".ch-side{position:sticky;top:20px;overflow-y:auto;padding-right:4px;scrollbar-width:thin}" +
    "}";

  function html() {
    return '<h1 class="ptitle">' + t("title") + '<span class="ch-ver">v' + VERSION + '</span></h1><p class="pintro">' + t("intro") + "</p>" +
      '<div class="ch-wrap"><div class="ch-deskbox"><div class="ch-stage" id="ch-stage" tabindex="0"></div><input type="file" id="ch-file" accept="image/*" hidden></div>' +
      '<div class="ch-side" id="ch-side"></div></div>' +
      '<section class="phow"><h2>' + t("howH") + "</h2><p>" + t("how1") + "</p><p>" + t("how2") + "</p></section>";
  }
  function toolsBox() {
    return '<div class="ch-box"><h3>' + t("tools") + '</h3><div class="ch-tools">' +
      TOOLS.map(function (T) { return '<button type="button" class="ch-tool" data-tool="' + T.id + '" aria-pressed="' + (T.id === S.tool) + '" title="' + tr(T.desc) + '">' + T.icon + tr(T.name) + "</button>"; }).join("") +
      '</div><p class="ch-desc">' + tr(tool().desc) + " " + t("more") + "</p></div>";
  }
  function build() {
    var st = stage(), side = V.root.querySelector("#ch-side");
    if (!IMG) {
      st.classList.add("empty");
      st.innerHTML = '<div class="ch-drop"><b>' + t("drop") + "</b><span>" + t("or") + '</span><button type="button" class="ch-pick" data-act="pick">' + t("pick") + '</button><span id="ch-dn">' + t("dropNote") + "</span></div>";
      side.innerHTML = toolsBox();
      return;
    }
    var T = tool();
    st.classList.remove("empty");
    st.innerHTML = "";
    L.z.forEach(function (k, i) {
      var l = T.layers.filter(function (q) { return q.k === k; })[0], c = renderLayer(IMG.prev, l, "tinted");
      c.className = "ch-lyr" + (L.on[k] ? "" : " off"); c.setAttribute("data-k", k);
      c.setAttribute("aria-label", tr(l.name)); c.style.zIndex = i + 1; c.style.mixBlendMode = T.blend;
      st.appendChild(c);
    });
    var chips = T.layers.map(function (l) {
      return '<div class="ch-chip"><button type="button" class="sel" data-sel="' + l.k + '" aria-pressed="' + (L.active === l.k) + '"><i style="background:' + l.color + '"></i><b>' + tr(l.name) + '</b><span id="ch-o-' + l.k + '"></span></button>' +
        '<button type="button" class="eye" data-vis="' + l.k + '" aria-pressed="' + L.on[l.k] + '">' + (L.on[l.k] ? t("on") : t("off")) + "</button></div>";
    }).join("");
    var seg = T.modes.length > 1 ? '<div class="ch-desc">' + t("look") + '</div><div class="ch-seg">' + T.modes.map(function (m) { return '<button type="button" data-mode="' + m + '" aria-pressed="' + (S.mode === m) + '">' + t(m) + "</button>"; }).join("") + "</div>" : "";
    side.innerHTML = '<div class="ch-btns"><button type="button" class="navbtn" data-act="pick">' + t("other") + "</button></div>" + toolsBox() +
      '<div class="ch-box"><h3>' + t("layers") + "</h3>" + chips +
      '<div class="ch-btns"><button type="button" class="navbtn" data-act="reset">' + t("reset") + '</button><button type="button" class="navbtn" data-act="spread">' + t("spread") + '</button><label class="ch-snap"><input type="checkbox" data-snap' + (S.snap ? " checked" : "") + "> " + t("snap") + "</label></div>" +
      '<p class="ch-stat" id="ch-stat" aria-live="polite"></p></div>' +
      '<div class="ch-box"><h3>' + t("exportH") + "</h3>" + seg +
      '<div class="ch-btns">' + T.layers.map(function (l) { return '<button type="button" class="navbtn" data-one="' + l.k + '">' + fmt(t("one"), { n: tr(l.name) }) + "</button>"; }).join("") +
      '<button type="button" class="navbtn" data-act="all">' + t("all") + "</button></div>" +
      '<button type="button" class="ch-save" data-act="comp">' + t("comp") + "</button>" +
      '<p class="ch-desc">' + fmt(t("compNote"), { w: IMG.w, h: IMG.h }) + '</p><p class="ch-note" id="ch-note">' + (IMG.shrunk ? fmt(t("shrunk"), { w: IMG.w, h: IMG.h }) : "") + "</p></div>";
    requestAnimationFrame(layout);
  }
  function note(s) { if (!V) return; var n = V.root.querySelector("#ch-note") || V.root.querySelector("#ch-dn"); if (n) n.textContent = s; }

  // ---------- Eingabe ----------
  function onDown(e) {
    var c = e.target.closest && e.target.closest(".ch-lyr");
    if (!c || (e.button && e.button > 0)) return;
    e.preventDefault();
    var k = c.getAttribute("data-k"); select(k); L.touched = true;
    stage().classList.remove("anim");
    drag = { k: k, id: e.pointerId, sx: e.clientX, sy: e.clientY, x0: L.x[k], y0: L.y[k], el: c };
    try { c.setPointerCapture(e.pointerId); } catch (er) {}
    c.classList.add("grab");
  }
  function onMove(e) {
    if (!drag || e.pointerId !== drag.id) return;
    setPos(drag.k, drag.x0 + (e.clientX - drag.sx) / ds, drag.y0 + (e.clientY - drag.sy) / ds);
    layout();
  }
  function onUp(e) { if (!drag || e.pointerId !== drag.id) return; drag.el.classList.remove("grab"); drag = null; }
  function onKey(e) {
    if (!IMG || !e.target.closest || !e.target.closest("#ch-stage")) return;
    var T = tool(), n = parseInt(e.key, 10);
    if (n >= 1 && n <= T.layers.length) { select(T.layers[n - 1].k); return; }
    var step = e.shiftKey ? 10 : 1, dx = 0, dy = 0;
    if (e.key === "ArrowLeft") dx = -step; else if (e.key === "ArrowRight") dx = step;
    else if (e.key === "ArrowUp") dy = -step; else if (e.key === "ArrowDown") dy = step; else return;
    e.preventDefault(); L.touched = true;
    var k = L.active, p = clampPos(Math.round(L.x[k]) + dx, Math.round(L.y[k]) + dy);   // Pfeiltasten bewegen in Bildpixeln
    L.x[k] = Math.round(p.x); L.y[k] = Math.round(p.y); layout();
  }
  function onClick(e) {
    var b;
    if ((b = e.target.closest("[data-act]"))) {
      var a = b.getAttribute("data-act");
      if (a === "pick") V.root.querySelector("#ch-file").click();
      else if (a === "reset") { animate(); tool().layers.forEach(function (l) { L.x[l.k] = 0; L.y[l.k] = 0; L.on[l.k] = true; }); eyes(); layout(); }
      else if (a === "spread") {
        L.touched = true; animate();
        var T = tool(), m = Math.max(IMG.w, IMG.h);
        T.layers.forEach(function (l, i) { var d = T.spread[i] || [0, 0], p = clampPos(d[0] * m, d[1] * m); L.x[l.k] = p.x; L.y[l.k] = p.y; });
        layout();
      }
      else if (a === "all") exportLayers(tool().layers.map(function (l) { return l.k; }));
      else if (a === "comp") exportComp();
      return;
    }
    if ((b = e.target.closest("[data-tool]"))) { S.tool = b.getAttribute("data-tool"); if (tool().modes.indexOf(S.mode) < 0) S.mode = tool().modes[0]; if (IMG) resetLayers(); build(); return; }
    if ((b = e.target.closest("[data-sel]"))) { select(b.getAttribute("data-sel")); return; }
    if ((b = e.target.closest("[data-vis]"))) { var k = b.getAttribute("data-vis"); L.on[k] = !L.on[k]; L.touched = true; eyes(); status(); return; }
    if ((b = e.target.closest("[data-mode]"))) { S.mode = b.getAttribute("data-mode"); Array.prototype.forEach.call(V.root.querySelectorAll("[data-mode]"), function (q) { q.setAttribute("aria-pressed", String(q === b)); }); return; }
    if ((b = e.target.closest("[data-one]"))) { exportLayers([b.getAttribute("data-one")]); return; }
  }
  function onChange(e) {
    if (e.target.matches("[data-snap]")) S.snap = e.target.checked;
    if (e.target.id === "ch-file" && e.target.files[0]) { loadFile(e.target.files[0]); e.target.value = ""; }
  }
  function onDragOver(e) { if (!e.dataTransfer || Array.prototype.indexOf.call(e.dataTransfer.types || [], "Files") < 0) return; e.preventDefault(); stage().classList.add("over"); }
  function onDragLeave(e) { if (e.target.id === "ch-stage") stage().classList.remove("over"); }
  function onDrop(e) { if (!e.dataTransfer || !e.dataTransfer.files.length) return; e.preventDefault(); stage().classList.remove("over"); loadFile(e.dataTransfer.files[0]); }
  var rsT = 0;
  function onResize() { clearTimeout(rsT); rsT = setTimeout(layout, 100); }

  function mount(el, l) {
    unmount();
    lang = l === "en" ? "en" : "de";
    var o = document.getElementById("ch-css"); if (o) o.remove();
    var s = document.createElement("style"); s.id = "ch-css"; s.textContent = CSS; document.head.appendChild(s);
    el.innerHTML = html();
    V = { root: el };
    el.addEventListener("pointerdown", onDown); window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp); window.addEventListener("pointercancel", onUp);
    el.addEventListener("keydown", onKey); el.addEventListener("click", onClick); el.addEventListener("change", onChange);
    window.addEventListener("resize", onResize);
    var st = stage();
    st.addEventListener("dragover", onDragOver); st.addEventListener("dragleave", onDragLeave); st.addEventListener("drop", onDrop);
    build();
  }
  function unmount() {
    if (!V) return;
    window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp); window.removeEventListener("resize", onResize);
    V.root.removeEventListener("pointerdown", onDown); V.root.removeEventListener("keydown", onKey);
    V.root.removeEventListener("click", onClick); V.root.removeEventListener("change", onChange);
    drag = null; V = null;
  }

  window.Channels = { mount: mount, unmount: unmount, tools: TOOLS };
})();
