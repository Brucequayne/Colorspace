/* Rap Streets – main.js
   Hülle: DOM, Stil, pixelgenaue Skalierung (480 × 272 wie Shizuku), Szenen (menu, editor), Hauptschleife.
   Menü: Brooklyn bei Nacht im Hintergrund, Titel, "Battle" (in Entwicklung), unten links versteckter Zugang zum Level-Editor (Code). */
(function () {
  var RS = window.RS, W = RS.W, H = RS.H, L2 = RS.L2;
  var HASH = "bc554094";   // FNV-1a von "rapstreets:" + Code
  function fnv(s) { var h = 0x811c9dc5; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16); }

  var CSS =
    ".rs-root{position:fixed;inset:0;z-index:30;background:#000;overflow:hidden;user-select:none;-webkit-user-select:none;touch-action:none;font-family:var(--f-body,system-ui,sans-serif);color:#ECE8E0}" +
    ".rs-root *{font-style:normal;box-sizing:border-box}" +
    ".rs-cv{position:absolute;inset:0;width:100%;height:100%;display:block}" +
    ".rs-ui{position:absolute;inset:0;pointer-events:none}.rs-ui>*{pointer-events:auto}" +
    ".rs-menu{position:absolute;inset:0;pointer-events:none;animation:rsIn .8s ease both}.rs-menu>*{pointer-events:auto}@keyframes rsIn{from{opacity:0}}" +
    ".rs-back{position:absolute;left:18px;top:14px;color:#8A867E;font-size:.8rem;text-decoration:none;letter-spacing:.04em;text-shadow:0 1px 3px #000}.rs-back:hover{color:#ECE8E0}" +
    ".rs-title{position:absolute;left:50%;top:22%;transform:translateX(-50%);text-align:center;pointer-events:none;white-space:nowrap}" +
    ".rs-title h1{margin:0;font:900 clamp(44px,10vmin,120px)/.9 Impact,'Arial Black','Helvetica Neue',sans-serif;letter-spacing:.04em;color:#F2C230;text-transform:uppercase;" +
    "text-shadow:4px 4px 0 #B03028,8px 8px 0 #111}" +
    ".rs-title p{margin:14px 0 0;font:600 .78rem/1 var(--f-body,system-ui);letter-spacing:.42em;text-transform:uppercase;color:#E8E4D8;text-shadow:0 1px 4px #000}" +
    ".rs-btns{position:absolute;left:50%;bottom:16%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:10px}" +
    ".rs-btn{min-width:220px;font:700 1rem/1 var(--f-body,system-ui);letter-spacing:.24em;text-transform:uppercase;color:#141414;background:#F2C230;border:0;border-radius:0;padding:14px 22px;cursor:pointer;box-shadow:4px 4px 0 #111}" +
    ".rs-btn:hover{background:#FFD44A}.rs-btn[disabled]{background:#3A3A3C;color:#9A968E;cursor:default;box-shadow:4px 4px 0 #111}" +
    ".rs-btn small{display:block;margin-top:6px;font:600 .62rem/1 var(--f-body,system-ui);letter-spacing:.16em;color:#C8C2B6}" +
    ".rs-devbox{position:absolute;left:10px;bottom:10px;display:flex;align-items:center;gap:8px}" +
    ".rs-dev{width:9px;height:9px;padding:0;border:1px solid rgba(255,255,255,.12);background:none;cursor:pointer}.rs-dev:hover{border-color:rgba(255,255,255,.5)}" +
    ".rs-pass input{width:96px;height:24px;background:#121212;border:1px solid #3A3A3A;border-radius:0;color:#ECE8E0;font:13px monospace;padding:0 6px;letter-spacing:.3em;outline:none}" +
    ".rs-pass input:focus{border-color:#777}.rs-no{animation:rsNo .35s}@keyframes rsNo{25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}" +
    ".rs-toast{position:absolute;left:50%;bottom:8%;transform:translateX(-50%);background:#151515;border:1px solid #3A3A3A;padding:8px 12px;font-size:.8rem;color:#D8D2C6}.rs-toast[hidden]{display:none}";

  RS.scenes = RS.scenes || {};
  var M = RS.main = {
    root: null, ui: null, cv: null, lo: null, scene: null, name: "", raf: 0, last: 0,
    view: { x: 0, y: 0, w: W, h: H, s: 1, dpr: 1 }, sidebar: 0,
    mount: function (el, lang) {
      RS.lang = lang === "en" ? "en" : "de";
      if (!document.getElementById("rs-css")) { var st = document.createElement("style"); st.id = "rs-css"; st.textContent = CSS + (RS.EDITOR_CSS || ""); document.head.appendChild(st); }
      el.innerHTML = '<div class="rs-root"><canvas class="rs-cv"></canvas><div class="rs-ui"></div></div>';
      M.root = el.firstChild; M.cv = M.root.firstChild; M.ui = M.root.lastChild; M.ctx = M.cv.getContext("2d");
      M.lo = RS.canvas(W, H);
      RS.input.attach(M.root);
      window.addEventListener("resize", M.layout);
      M.sidebar = 0; M.layout(); M.go("menu");
      M.last = performance.now(); M.raf = requestAnimationFrame(M.frame);
    },
    unmount: function () {
      if (!M.root) return;
      cancelAnimationFrame(M.raf);
      if (M.scene && M.scene.exit) M.scene.exit();
      M.scene = null; M.name = "";
      window.removeEventListener("resize", M.layout);
      RS.input.detach(); M.root = null;
    },
    go: function (name, opt) { if (M.scene && M.scene.exit) M.scene.exit(); M.name = name; M.scene = RS.scenes[name]; M.scene.enter(opt); },
    layout: function () {
      if (!M.root) return;
      var dpr = Math.min(window.devicePixelRatio || 1, 3), r = M.root.getBoundingClientRect();
      M.cv.width = Math.round(r.width * dpr); M.cv.height = Math.round(r.height * dpr);
      var aw = r.width - M.sidebar, ah = r.height, s = Math.min(aw / W, ah / H), v = M.view;
      // Ganzzahlige Vergrößerung, wenn sie fast passt (gleichmäßigere Pixel)
      var si = Math.floor(s * dpr) / dpr; if (si >= 1 && si / s > 0.9) s = si;
      v.s = s; v.w = W * s; v.h = H * s; v.x = M.sidebar + (aw - v.w) / 2; v.y = (ah - v.h) / 2; v.dpr = dpr;
      RS.input.setView(v.x, v.y, s);
    },
    setSidebar: function (px) { M.sidebar = px; M.layout(); },
    frame: function (now) {
      if (!M.root) return;
      M.raf = requestAnimationFrame(M.frame);
      var dt = Math.min(0.05, (now - M.last) / 1000); M.last = now;
      if (M.scene) {
        M.scene.update(dt);
        var lo = M.lo.ctx; lo.setTransform(1, 0, 0, 1, 0, 0); lo.globalAlpha = 1; lo.globalCompositeOperation = "source-over";
        M.scene.render(lo);
        var c = M.ctx, v = M.view, d = v.dpr;
        c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = "#000"; c.fillRect(0, 0, M.cv.width, M.cv.height);
        c.imageSmoothingEnabled = false;
        c.drawImage(M.lo, Math.round(v.x * d), Math.round(v.y * d), Math.round(v.w * d), Math.round(v.h * d));
      }
      RS.input.endFrame();
    }
  };

  // ---------- Menü ----------
  var menuWorld = null, toastT = 0;
  RS.scenes.menu = {
    enter: function () {
      if (!menuWorld) { menuWorld = new RS.World(RS.POOL[0].make()); menuWorld.time = 22.3; menuWorld.cheer = true; }
      M.ui.innerHTML = '<div class="rs-menu">' +
        '<a class="rs-back" href="#" title="' + L2("Zurück zu Color Space", "Back to Color Space") + '">← Color Space</a>' +
        '<div class="rs-title"><h1>Rap Streets</h1><p>Brooklyn · Freestyle Battle</p></div>' +
        '<div class="rs-btns"><button type="button" class="rs-btn" disabled>Battle<small>' + L2("In Entwicklung", "In development") + '</small></button></div>' +
        '<div class="rs-devbox"><button type="button" class="rs-dev" aria-label="Editor"></button><form class="rs-pass" hidden><input type="password" inputmode="numeric" autocomplete="off" maxlength="12" aria-label="Code"></form></div>' +
        '<div class="rs-toast" hidden></div></div>';
      var root = M.ui.firstChild, form = root.querySelector(".rs-pass"), inp = form.querySelector("input");
      root.querySelector(".rs-dev").addEventListener("click", function () {
        var ok = false; try { ok = sessionStorage.getItem("rapstreets.dev") === "1"; } catch (e) {}
        if (ok) { M.go("editor"); return; }
        form.hidden = !form.hidden; if (!form.hidden) inp.focus();
      });
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        if (fnv("rapstreets:" + inp.value) === HASH) { try { sessionStorage.setItem("rapstreets.dev", "1"); } catch (er) {} M.go("editor"); }
        else { inp.value = ""; form.classList.remove("rs-no"); void form.offsetWidth; form.classList.add("rs-no"); }
      });
    },
    exit: function () { clearTimeout(toastT); },
    update: function (dt) { menuWorld.update(dt); },
    render: function (c) {
      menuWorld.render(c);
      // leichte Abdunklung oben, damit der Titel steht
      var g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "rgba(0,0,0,.55)"); g.addColorStop(0.55, "rgba(0,0,0,.15)"); g.addColorStop(1, "rgba(0,0,0,.35)");
      c.fillStyle = g; c.fillRect(0, 0, W, H);
    }
  };
})();
