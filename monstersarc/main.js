/* Monsters Arc – main.js
   Hülle der Anwendung: DOM, Stil, Canvas, pixelgenaue Skalierung, Szenenwechsel, Hauptschleife.
   Das Spiel wird in 480 × 272 Pixeln gezeichnet und ohne Glättung auf den Bildschirm vergrößert (wie Shizuku).
   Szenen: menu (Hauptmenü), walk (Testlauf / später Spiel), devkit (Dev-Kit mit den Editoren). */
(function () {
  var MA = window.MA, W = MA.W, H = MA.H;

  var CSS =
    ".ma-root{position:fixed;inset:0;z-index:30;background:#000;overflow:hidden;user-select:none;-webkit-user-select:none;touch-action:none;font-family:var(--f-body,system-ui,sans-serif);color:#E9E6DF}" +
    ".ma-root *{font-style:normal;box-sizing:border-box}" +
    ".ma-cv{position:absolute;inset:0;width:100%;height:100%;display:block}" +
    ".ma-ui{position:absolute;inset:0;pointer-events:none}" +
    ".ma-ui>*{pointer-events:auto}" +
    "@keyframes maIn{from{opacity:0}}" +
    // Hauptmenü (Palette: Stein, Petrol, Stahlblau, Koralle, Schiefer)
    ".ma-menu{position:absolute;inset:0;pointer-events:none;animation:maIn .9s ease both;background:linear-gradient(90deg,rgba(28,34,35,.82) 0,rgba(28,34,35,.55) 38%,rgba(28,34,35,0) 70%)}.ma-menu>*{pointer-events:auto}" +
    ".ma-back{position:absolute;left:18px;top:14px;color:#8E9A9B;font-size:.8rem;text-decoration:none;letter-spacing:.04em}.ma-back:hover{color:#C6C5B9}" +
    ".ma-title{position:absolute;left:clamp(24px,7vw,110px);top:24%}" +
    ".ma-title h1{margin:0;font:800 clamp(40px,7.5vmin,86px)/.95 var(--f-display,system-ui,sans-serif);letter-spacing:.02em;text-transform:uppercase;color:#C6C5B9;text-shadow:0 3px 0 #475657,0 6px 18px rgba(0,0,0,.5)}" +
    ".ma-title p{margin:12px 0 0;font:600 .78rem/1 var(--f-body,system-ui);letter-spacing:.3em;text-transform:uppercase;color:#ED6A5E}" +
    ".ma-mbtns{position:absolute;left:clamp(24px,7vw,110px);top:calc(24% + clamp(130px,20vmin,200px));display:flex;flex-direction:column;gap:8px;width:min(300px,80vw)}" +
    ".ma-mbtns button{font:600 1rem/1.2 var(--f-body,system-ui);color:#E9E6DF;background:rgba(71,86,87,.92);border:1px solid #62929E;border-radius:0;padding:12px 16px;text-align:left;cursor:pointer;transition:background .2s,border-color .2s}" +
    ".ma-mbtns button small{display:block;font-weight:400;font-size:.72rem;color:#C6C5B9;margin-top:3px}" +
    ".ma-mbtns button:hover:not([disabled]){background:#4A6D7C;border-color:#C6C5B9}.ma-mbtns button[disabled]{opacity:.55;cursor:default;border-color:#475657}" +
    ".ma-mute{position:absolute;right:14px;top:14px;font-size:.75rem;color:#D8D3C8;background:rgba(10,10,10,.62);border:1px solid rgba(255,255,255,.08);padding:4px 10px;pointer-events:none;animation:maHint 2.4s ease forwards}" +
    ".ma-hint{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);max-width:calc(100% - 40px);text-align:center;font-size:.76rem;color:#D8D3C8;background:rgba(10,10,10,.62);border:1px solid rgba(255,255,255,.08);padding:6px 12px;pointer-events:none;animation:maHint 9s ease forwards}" +
    ".ma-warn{position:absolute;left:50%;top:14px;transform:translateX(-50%);max-width:calc(100% - 40px);text-align:center;font-size:.8rem;color:#1C1D1C;background:#ED6A5E;padding:6px 12px;pointer-events:none}" +
    ".ma-zone{position:absolute;left:18px;top:16px;min-width:180px;padding:10px 18px;background:#475657;border:2px solid #C6C5B9;box-shadow:0 0 0 2px #2A3233,0 6px 18px rgba(0,0,0,.45);font:700 1.05rem/1.2 var(--f-body,system-ui);color:#F0EEE6;letter-spacing:.04em;pointer-events:none;opacity:0;transform:translateY(-130%)}" +
    ".ma-zone.on{animation:maZone 3.2s ease forwards}" +
    "@keyframes maZone{0%{opacity:0;transform:translateY(-130%)}10%,78%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-130%)}}" +
    "@keyframes maHint{0%{opacity:0}8%,75%{opacity:1}100%{opacity:0}}";

  var M = MA.main = {
    root: null, ui: null, cv: null, lo: null, scene: null, name: "", raf: 0, last: 0,
    view: { x: 0, y: 0, w: W, h: H, s: 1, dpr: 1 }, sidebar: 0,
    slowT: 0, slowS: 1,
    // Kurze Zeitlupe (Faktor, Dauer in echten Sekunden)
    slowmo: function (s, dur) { if (M.slowT <= 0 || s <= M.slowS) { M.slowS = s; M.slowT = dur; } },

    mount: function (el, lang) {
      MA.lang = lang === "en" ? "en" : "de";
      if (!document.getElementById("ma-css")) { var st = document.createElement("style"); st.id = "ma-css"; st.textContent = CSS + (MA.EDITOR_CSS || ""); document.head.appendChild(st); }
      el.innerHTML = '<div class="ma-root"><canvas class="ma-cv"></canvas><div class="ma-ui"></div></div>';
      M.root = el.firstChild; M.cv = M.root.firstChild; M.ui = M.root.lastChild;
      M.ctx = M.cv.getContext("2d");
      M.lo = MA.canvas(W, H);
      MA.input.attach(M.root);
      M.root.addEventListener("pointerdown", function () { MA.audio.unlock(); });
      M.root.addEventListener("keydown", function () { MA.audio.unlock(); });
      MA.samurai.prewarm();
      window.addEventListener("resize", M.layout);
      M.sidebar = 0; M.layout();
      M.go("menu");
      M.last = performance.now();
      M.raf = requestAnimationFrame(M.frame);
    },
    unmount: function () {
      if (!M.root) return;
      cancelAnimationFrame(M.raf);
      if (M.scene && M.scene.exit) M.scene.exit();
      M.scene = null; M.name = "";
      window.removeEventListener("resize", M.layout);
      MA.input.detach();
      MA.audio.stopAll();
      M.root = null;
    },
    go: function (name, opt) {
      if (M.scene && M.scene.exit) M.scene.exit();
      M.name = name; M.scene = MA.scenes[name];
      M.scene.enter(opt);
    },
    // Pixelbild mittig einpassen (Seitenverhältnis bleibt, Rand schwarz). sidebar = Platz links fürs Dev Tool
    layout: function () {
      if (!M.root) return;
      var dpr = Math.min(window.devicePixelRatio || 1, 3), r = M.root.getBoundingClientRect();
      M.cv.width = Math.round(r.width * dpr); M.cv.height = Math.round(r.height * dpr);
      var aw = r.width - M.sidebar, ah = r.height, s = Math.min(aw / W, ah / H);
      var v = M.view;
      v.s = s; v.w = W * s; v.h = H * s; v.x = M.sidebar + (aw - v.w) / 2; v.y = (ah - v.h) / 2; v.dpr = dpr;
      MA.input.setView(v.x + r.left, v.y + r.top, s);
    },
    setSidebar: function (px) { M.sidebar = px; M.layout(); },
    frame: function (now) {
      if (!M.root) return;
      M.raf = requestAnimationFrame(M.frame);
      var dt = Math.min(0.05, (now - M.last) / 1000); M.last = now;
      var ts = 1;
      if (M.slowT > 0) { M.slowT -= dt; ts = M.slowS; }
      M.realDt = dt;
      if (M.scene) {
        M.scene.update(dt * ts);
        var lo = M.lo.ctx;
        lo.setTransform(1, 0, 0, 1, 0, 0); lo.globalAlpha = 1; lo.globalCompositeOperation = "source-over";
        M.scene.render(lo);
        var c = M.ctx, v = M.view, d = v.dpr;
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.fillStyle = "#000"; c.fillRect(0, 0, M.cv.width, M.cv.height);
        c.imageSmoothingEnabled = false;
        c.drawImage(M.lo, Math.round(v.x * d), Math.round(v.y * d), Math.round(v.w * d), Math.round(v.h * d));
        if (M.scene && M.scene.renderTop) M.scene.renderTop(c, v);
      }
      if (MA.input.hit("m") && M.name !== "devkit") {
        var mu = MA.audio.toggleMute(), el = M.root.querySelector(".ma-mute") || M.root.appendChild(document.createElement("div"));
        el.className = "ma-mute"; el.textContent = mu ? MA.L2("Ton aus (M)", "Sound off (M)") : MA.L2("Ton an (M)", "Sound on (M)");
        el.style.animation = "none"; void el.offsetWidth; el.style.animation = "";
      }
      MA.input.endFrame();
      // Samurai-Sprites im Hintergrund vorbereiten
      MA.samurai.work(M.name === "walk" ? 2 : 6);
    }
  };
})();
