/* Shizuku – main.js
   Hülle der Anwendung: DOM, Stil, Canvas, pixelgenaue Skalierung, Szenenwechsel, Hauptschleife.
   Das Spiel wird in 480 × 272 Pixeln gezeichnet und ohne Glättung auf den Bildschirm vergrößert.
   Szenen: menu → intro → arena, dazu editor (Dev Tool). */
(function () {
  var SZ = window.SZ, W = SZ.W, H = SZ.H;

  var CSS =
    ".sz-root{position:fixed;inset:0;z-index:30;background:#000;overflow:hidden;user-select:none;-webkit-user-select:none;touch-action:none;font-family:var(--f-body,system-ui,sans-serif);color:#E9E6DF}" +
    ".sz-root *{font-style:normal;box-sizing:border-box}" +
    ".sz-cv{position:absolute;inset:0;width:100%;height:100%;display:block}" +
    ".sz-play .sz-cv{cursor:none}" +
    ".sz-ui{position:absolute;inset:0;pointer-events:none}" +
    ".sz-ui>*{pointer-events:auto}" +
    // Menü
    ".sz-menu{position:absolute;inset:0;pointer-events:none;animation:szIn .9s ease both}.sz-menu.sz-slow{animation-duration:1.8s}.sz-menu>*{pointer-events:auto}" +
    "@keyframes szIn{from{opacity:0}}" +
    ".sz-kanji{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:none;border:0;padding:24px 40px;cursor:pointer;color:#ECE8E0;" +
    "font:300 clamp(84px,19vmin,230px)/1 'Hiragino Mincho ProN','Yu Mincho','YuMincho','Noto Serif JP','Noto Serif CJK JP','MS Mincho',serif;transition:color .6s,text-shadow .6s,filter .6s}" +
    ".sz-kanji span{display:block;animation:szBreath 6s ease-in-out infinite}" +
    "@keyframes szBreath{0%,100%{opacity:.86}50%{opacity:1}}" +
    ".sz-kanji:hover,.sz-kanji:focus-visible{color:#fff;text-shadow:0 0 28px rgba(170,220,255,.35);outline:none}" +
    ".sz-leave .sz-kanji{transition:opacity .5s ease,filter .5s ease,transform .5s ease;opacity:0;filter:blur(10px);transform:translate(-50%,-46%) scale(.96)}" +
    ".sz-leave .sz-mq,.sz-leave .sz-back,.sz-leave .sz-devbox{transition:opacity .4s;opacity:0}" +
    ".sz-back{position:absolute;left:18px;top:14px;color:#6E6A64;font-size:.8rem;text-decoration:none;letter-spacing:.04em}.sz-back:hover{color:#CFCAC0}" +
    ".sz-mq{position:absolute;right:max(26px,env(safe-area-inset-right,0px));bottom:max(72px,env(safe-area-inset-bottom,0px));width:44px;height:70px;padding:0;background:none;border:0;color:#57534D;cursor:pointer;transition:color .3s,transform .3s}" +
    ".sz-mq:hover,.sz-mq:focus-visible{color:#D9D3C7;transform:translateY(-2px);outline:none}.sz-mq svg{width:100%;height:100%;display:block}" +
    ".sz-devbox{position:absolute;left:10px;bottom:10px;display:flex;align-items:center;gap:8px}" +
    ".sz-dev{width:9px;height:9px;padding:0;border:1px solid rgba(255,255,255,.1);background:none;cursor:pointer}.sz-dev:hover{border-color:rgba(255,255,255,.45)}" +
    ".sz-pass input{width:96px;height:24px;background:#121212;border:1px solid #3A3A3A;border-radius:0;color:#E9E6DF;font:13px monospace;padding:0 6px;letter-spacing:.3em;outline:none}" +
    ".sz-pass input:focus{border-color:#777}.sz-no{animation:szNo .35s}" +
    "@keyframes szNo{25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}" +
    ".sz-toast{position:absolute;right:84px;bottom:92px;max-width:260px;background:#151515;border:1px solid #3A3A3A;padding:8px 12px;font-size:.8rem;color:#CFCAC0}" +
    ".sz-toast[hidden]{display:none}" +
    // Arena
    ".sz-hint{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);max-width:calc(100% - 40px);text-align:center;font-size:.76rem;color:#D8D3C8;background:rgba(10,10,10,.62);border:1px solid rgba(255,255,255,.08);padding:6px 12px;pointer-events:none;animation:szHint 9s ease forwards}" +
    "@keyframes szHint{0%{opacity:0}8%,75%{opacity:1}100%{opacity:0}}";

  var M = SZ.main = {
    root: null, ui: null, cv: null, lo: null, scene: null, name: "", raf: 0, last: 0,
    view: { x: 0, y: 0, w: W, h: H, s: 1, dpr: 1 }, sidebar: 0,

    mount: function (el, lang) {
      SZ.lang = lang === "en" ? "en" : "de";
      if (!document.getElementById("sz-css")) { var st = document.createElement("style"); st.id = "sz-css"; st.textContent = CSS + (SZ.EDITOR_CSS || ""); document.head.appendChild(st); }
      el.innerHTML = '<div class="sz-root"><canvas class="sz-cv"></canvas><div class="sz-ui"></div></div>';
      M.root = el.firstChild; M.cv = M.root.firstChild; M.ui = M.root.lastChild;
      M.ctx = M.cv.getContext("2d");
      M.lo = SZ.canvas(W, H);
      SZ.input.attach(M.root);
      SZ.samurai.prewarm();
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
      SZ.input.detach();
      SZ.audio.stopAll();
      M.root = null;
    },
    go: function (name, opt) {
      if (M.scene && M.scene.exit) M.scene.exit();
      M.name = name; M.scene = SZ.scenes[name];
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
      SZ.input.setView(v.x + r.left, v.y + r.top, s);
    },
    setSidebar: function (px) { M.sidebar = px; M.layout(); },
    frame: function (now) {
      if (!M.root) return;
      M.raf = requestAnimationFrame(M.frame);
      var dt = Math.min(0.05, (now - M.last) / 1000); M.last = now;
      if (M.scene) {
        M.scene.update(dt);
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
      SZ.input.endFrame();
      // Samurai-Sprites im Hintergrund vorbereiten
      SZ.samurai.work(M.name === "arena" ? 2 : 6);
    }
  };
})();
