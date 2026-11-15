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
    ".sz-mq{position:absolute;right:max(26px,env(safe-area-inset-right,0px));bottom:max(72px,env(safe-area-inset-bottom,0px));width:68px;height:108px;padding:0;background:none;border:0;color:#57534D;cursor:pointer;transition:color .3s,transform .3s}" +
    ".sz-mq:hover,.sz-mq:focus-visible{color:#D9D3C7;transform:translateY(-2px);outline:none}.sz-mq svg{width:100%;height:100%;display:block}" +
    ".sz-devbox{position:absolute;left:10px;bottom:10px;display:flex;align-items:center;gap:8px}" +
    ".sz-dev{width:9px;height:9px;padding:0;border:1px solid rgba(255,255,255,.1);background:none;cursor:pointer}.sz-dev:hover{border-color:rgba(255,255,255,.45)}" +
    ".sz-pass input{width:96px;height:24px;background:#121212;border:1px solid #3A3A3A;border-radius:0;color:#E9E6DF;font:13px monospace;padding:0 6px;letter-spacing:.3em;outline:none}" +
    ".sz-pass input:focus{border-color:#777}.sz-no{animation:szNo .35s}" +
    "@keyframes szNo{25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}" +
    // Loadout
    ".sz-lo{position:absolute;inset:0;background:rgba(0,0,0,.72);display:flex;align-items:center;justify-content:center;animation:szIn .3s ease both;z-index:5}.sz-lo[hidden]{display:none}" +
    ".sz-lo-box{width:min(680px,calc(100% - 32px));max-height:calc(100% - 32px);overflow-y:auto;background:#161616;border:1px solid #3A3A3A;padding:20px 22px;color:#E4E0D8}" +
    ".sz-lo-box h2{margin:0 0 14px;font:600 .8rem/1 var(--f-body,system-ui);letter-spacing:.3em;text-transform:uppercase;color:#CFCAC0}" +
    ".sz-lo-box button{font:inherit;color:inherit;background:#1E1E1E;border:1px solid #3A3A3A;border-radius:0;cursor:pointer;text-align:left}" +
    ".sz-lo-box button:hover{border-color:#8A857C}.sz-lo-box img{image-rendering:pixelated;width:39px;height:39px;display:block}" +
    ".sz-lo-box kbd{font:600 .7rem/1 var(--f-body,system-ui);border:1px solid #6A665E;padding:2px 5px;color:#CFCAC0}" +
    ".sz-lo-slots{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px}" +
    ".sz-lo-slots button{display:flex;align-items:center;gap:10px;padding:8px 10px}.sz-lo-slots button[aria-pressed=true]{border-color:#E8A04A;background:#231C14}" +
    ".sz-lo-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:8px}" +
    ".sz-lo-h2{margin-top:16px!important}.sz-lo-elem{display:grid;grid-template-columns:1fr 1fr;gap:8px}" +
    ".sz-lo-elem button{display:grid;grid-template-columns:30px 1fr;gap:2px 10px;padding:10px;align-items:center}.sz-lo-elem button.on{border-color:#6FB8D8;background:#14202A}" +
    ".sz-lo-elem small{grid-column:2;font-size:.72rem;color:#9A968E;line-height:1.35}.sz-wv{grid-row:span 2;width:28px;height:28px;color:#7CC4E4;display:flex;align-items:center;justify-content:center}.sz-wv svg{width:100%;height:100%}" +
    ".sz-lo-list button{display:flex;flex-direction:column;gap:6px;padding:10px}.sz-lo-list button.on{border-color:#6A665E;background:#1C1C1C}" +
    ".sz-lo-list b{font-size:.9rem;display:flex;gap:6px;align-items:center}.sz-lo-list small{font-size:.72rem;color:#9A968E;line-height:1.35}" +
    ".sz-lo-bar{display:grid;grid-template-columns:70px 1fr;align-items:center;gap:6px;font-size:.68rem;color:#9A968E}.sz-lo-bar i{height:4px;background:#2A2A2A;display:block}.sz-lo-bar u{display:block;height:100%;background:#D8C890;text-decoration:none}" +
    ".sz-lo-hint{margin:12px 0 0;font-size:.74rem;color:#8E8A82}.sz-lo-close{margin-top:12px;padding:6px 16px}" +
    ".sz-toast{position:absolute;right:108px;bottom:110px;max-width:260px;background:#151515;border:1px solid #3A3A3A;padding:8px 12px;font-size:.8rem;color:#CFCAC0}" +
    ".sz-toast[hidden]{display:none}" +
    // Arena
    ".sz-wave{position:absolute;left:50%;top:18%;transform:translateX(-50%);font-size:.85rem;letter-spacing:.35em;color:#EDE6D6;text-shadow:0 1px 6px #000;pointer-events:none;animation:szWave 2.6s ease forwards;white-space:nowrap}.sz-wave b{display:block;text-align:center;font:300 2.2rem/1.1 'Hiragino Mincho ProN','Yu Mincho','Noto Serif JP',serif;letter-spacing:0;margin-bottom:4px}" +
    "@keyframes szWave{0%{opacity:0;transform:translate(-50%,6px)}15%,70%{opacity:1;transform:translate(-50%,0)}100%{opacity:0}}" +
    ".sz-top{position:absolute;right:14px;top:10px;text-align:right;pointer-events:none;color:#EDE6D6;text-shadow:0 1px 4px #000}" +
    ".sz-top div{display:flex;align-items:center;justify-content:flex-end;gap:7px;font:600 .95rem/1 var(--f-body,system-ui);font-variant-numeric:tabular-nums}" +
    ".sz-top small{font:500 .62rem/1 var(--f-body,system-ui);letter-spacing:.16em;text-transform:uppercase;color:#BDB6A8;margin-right:2px}" +
    ".sz-top i{width:9px;height:9px;background:#F2C66A;transform:rotate(45deg);box-shadow:0 0 8px rgba(255,200,100,.7)}" +
    ".sz-top span{display:block;margin-top:5px;font-size:.72rem;color:#BDB6A8;letter-spacing:.04em}" +
    ".sz-top em{position:absolute;right:0;top:-2px;font-style:normal;font-size:.8rem;color:#FFD88A;animation:szPop 1.4s ease-out forwards}" +
    "@keyframes szPop{0%{opacity:0;transform:translateY(8px)}15%{opacity:1}100%{opacity:0;transform:translateY(-18px)}}" +
    ".sz-next{position:absolute;left:50%;bottom:52px;transform:translateX(-50%);display:flex;align-items:center;gap:10px;font-size:.85rem;letter-spacing:.12em;color:#EDE6D6;text-shadow:0 1px 4px #000;pointer-events:none;animation:szBreath 2.4s ease-in-out infinite}" +
    ".sz-next[hidden]{display:none}.sz-next kbd{font:600 .8rem/1 var(--f-body,system-ui);border:1px solid rgba(255,255,255,.55);padding:4px 7px;background:rgba(10,10,10,.5)}" +
    ".sz-elq{position:absolute;left:50%;bottom:84px;transform:translateX(-50%);display:flex;align-items:center;gap:9px;font-size:.8rem;letter-spacing:.06em;color:#CFE8F2;text-shadow:0 1px 4px #000;pointer-events:none;white-space:nowrap}" +
    ".sz-elq[hidden]{display:none}.sz-elq .sz-wv{width:22px;height:22px;color:#7CC4E4}.sz-elq kbd{font:600 .8rem/1 var(--f-body,system-ui);border:1px solid rgba(124,196,228,.7);padding:4px 7px;background:rgba(10,20,26,.6)}" +
    ".sz-elq.on kbd{background:#7CC4E4;color:#0A141A}.sz-elq.on{color:#FFFFFF}.sz-elq.poor b{color:#D88A7A}" +
    ".sz-elx{position:absolute;left:14px;bottom:14px;display:flex;align-items:center;gap:8px;font-size:.78rem;letter-spacing:.06em;color:#CFE8F2;text-shadow:0 1px 4px #000;pointer-events:none;white-space:nowrap}" +
    ".sz-elx[hidden]{display:none}.sz-elx .sz-wv{width:20px;height:20px;color:#7CC4E4}.sz-elx kbd{font:600 .78rem/1 var(--f-body,system-ui);border:1px solid rgba(124,196,228,.7);padding:4px 7px;background:rgba(10,20,26,.6)}" +
    ".sz-elx.ready kbd{background:#7CC4E4;color:#0A141A}.sz-elx.used{opacity:.45}.sz-elx.poor b{color:#D88A7A}" +
    ".sz-etoast{position:absolute;left:50%;bottom:118px;transform:translateX(-50%);background:rgba(14,14,14,.85);border:1px solid #3A3A3A;padding:6px 12px;font-size:.78rem;color:#E6DED0;pointer-events:none;white-space:nowrap}.sz-etoast[hidden]{display:none}" +
    ".sz-wave i{display:block;font-style:normal;margin-top:4px;font-size:.72rem;letter-spacing:.15em;color:#D8B58A;text-align:center}" +
    ".sz-mute{position:absolute;right:14px;top:52px;font-size:.75rem;color:#D8D3C8;background:rgba(10,10,10,.62);border:1px solid rgba(255,255,255,.08);padding:4px 10px;pointer-events:none;animation:szHint 2.4s ease forwards}" +
    ".sz-hint{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);max-width:calc(100% - 40px);text-align:center;font-size:.76rem;color:#D8D3C8;background:rgba(10,10,10,.62);border:1px solid rgba(255,255,255,.08);padding:6px 12px;pointer-events:none;animation:szHint 9s ease forwards}" +
    "@keyframes szHint{0%{opacity:0}8%,75%{opacity:1}100%{opacity:0}}";

  var M = SZ.main = {
    root: null, ui: null, cv: null, lo: null, scene: null, name: "", raf: 0, last: 0,
    view: { x: 0, y: 0, w: W, h: H, s: 1, dpr: 1 }, sidebar: 0,
    slowT: 0, slowS: 1,
    // Kurze Zeitlupe (Faktor, Dauer in echten Sekunden)
    slowmo: function (s, dur) { if (M.slowT <= 0 || s <= M.slowS) { M.slowS = s; M.slowT = dur; } },

    mount: function (el, lang) {
      SZ.lang = lang === "en" ? "en" : "de";
      if (!document.getElementById("sz-css")) { var st = document.createElement("style"); st.id = "sz-css"; st.textContent = CSS + (SZ.EDITOR_CSS || ""); document.head.appendChild(st); }
      el.innerHTML = '<div class="sz-root"><canvas class="sz-cv"></canvas><div class="sz-ui"></div></div>';
      M.root = el.firstChild; M.cv = M.root.firstChild; M.ui = M.root.lastChild;
      M.ctx = M.cv.getContext("2d");
      M.lo = SZ.canvas(W, H);
      SZ.input.attach(M.root);
      M.root.addEventListener("pointerdown", function () { SZ.audio.unlock(); });
      M.root.addEventListener("keydown", function () { SZ.audio.unlock(); });
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
      if (SZ.input.hit("m") && M.name !== "editor") {
        var mu = SZ.audio.toggleMute(), el = M.root.querySelector(".sz-mute") || M.root.appendChild(document.createElement("div"));
        el.className = "sz-mute"; el.textContent = mu ? SZ.L2("Ton aus (M)", "Sound off (M)") : SZ.L2("Ton an (M)", "Sound on (M)");
        el.style.animation = "none"; void el.offsetWidth; el.style.animation = "";
      }
      SZ.input.endFrame();
      // Samurai-Sprites im Hintergrund vorbereiten
      SZ.samurai.work(M.name === "arena" ? 2 : 6);
    }
  };
})();
