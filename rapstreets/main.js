/* Rap Streets – main.js
   Hülle: DOM, Stil, pixelgenaue Skalierung (480 × 272 wie Shizuku), Szenen (menu, editor), Hauptschleife.
   Menü: Brooklyn bei Nacht im Hintergrund, Titel, "Battle" (in Entwicklung), unten links versteckter Zugang zum Level-Editor (Code). */
(function () {
  var RS = window.RS, W = RS.W, H = RS.H, L2 = RS.L2, m = RS.m;
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
    ".rs-stage{position:absolute;pointer-events:none;overflow:hidden}" +
    ".rs-map{display:block;margin-top:10px;font:500 .72rem/1 var(--f-body,system-ui);letter-spacing:.2em;text-transform:uppercase;color:#BEB8AC;text-shadow:0 1px 3px #000}" +
    // Battle-Vorbereitung
    ".rs-setup{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.6);animation:rsIn .25s ease both}.rs-setup[hidden]{display:none}" +
    ".rs-setup-box{width:min(460px,calc(100% - 32px));max-height:calc(100% - 32px);overflow-y:auto;background:#161616;border:1px solid #3A3A3A;padding:20px 22px;color:#E4E0D8}" +
    ".rs-setup-box h2{margin:0 0 16px;font:900 1.6rem/1 Impact,'Arial Black',sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#F2C230}" +
    ".rs-setup-box label{display:block;margin:12px 0 5px;font:600 .68rem/1 var(--f-body,system-ui);letter-spacing:.14em;text-transform:uppercase;color:#8E8A84}" +
    ".rs-setup-box input,.rs-setup-box select{width:100%;font:inherit;font-size:.95rem;color:#ECE8E0;background:#222224;border:1px solid #434346;border-radius:0;padding:8px 10px}" +
    ".rs-setup-box input:focus,.rs-setup-box select:focus{outline:none;border-color:#9A968E}" +
    ".rs-names{display:grid;grid-template-columns:1fr 1fr;gap:10px}.rs-names input{border-left:6px solid #D8372C}.rs-names div+div input{border-left-color:#3A78E0}" +
    ".rs-mic{display:flex;align-items:center;gap:10px}.rs-mic i{flex:1;height:10px;background:#2A2A2C}.rs-mic u{display:block;height:100%;width:0;background:#57D18A;text-decoration:none}" +
    ".rs-mic span{font-size:.8rem;color:#BEB8AC;white-space:nowrap}.rs-mic.no span{color:#E8806A}" +
    ".rs-note{margin:12px 0 0;font-size:.76rem;line-height:1.45;color:#8E8A84}" +
    ".rs-setup-btns{display:flex;gap:8px;margin-top:18px}.rs-setup-btns button{flex:1;font:700 .9rem/1 var(--f-body,system-ui);letter-spacing:.18em;text-transform:uppercase;padding:13px;border:0;border-radius:0;cursor:pointer;background:#3A3A3C;color:#ECE8E0}" +
    ".rs-setup-btns .go{background:#F2C230;color:#141414}.rs-setup-btns button:hover{filter:brightness(1.12)}" +
    ".rs-toast{position:absolute;left:50%;bottom:8%;transform:translateX(-50%);background:#151515;border:1px solid #3A3A3A;padding:8px 12px;font-size:.8rem;color:#D8D2C6}.rs-toast[hidden]{display:none}";

  RS.scenes = RS.scenes || {};
  var M = RS.main = {
    root: null, ui: null, cv: null, lo: null, scene: null, name: "", raf: 0, last: 0,
    view: { x: 0, y: 0, w: W, h: H, s: 1, dpr: 1 }, sidebar: 0,
    mount: function (el, lang) {
      RS.lang = lang === "en" ? "en" : "de";
      if (!document.getElementById("rs-css")) { var st = document.createElement("style"); st.id = "rs-css"; st.textContent = CSS + (RS.EDITOR_CSS || "") + (RS.BATTLE_CSS || ""); document.head.appendChild(st); }
      el.innerHTML = '<div class="rs-root"><canvas class="rs-cv"></canvas><div class="rs-stage"></div><div class="rs-ui"></div></div>';
      M.root = el.firstChild; M.cv = M.root.firstChild; M.stage = M.root.children[1]; M.ui = M.root.lastChild; M.ctx = M.cv.getContext("2d");
      M.newMap();
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
      RS.input.detach(); RS.audio.stop(); RS.audio.micClose(); M.root = null;
    },
    // Neue zufällige Map aus dem Pool (beim Start und nach einem Battle) – nicht zweimal hintereinander dieselbe
    newMap: function () {
      var L = RS.POOL, c = L.filter(function (p) { return p !== M.mapDef; }); if (!c.length) c = L;
      M.mapDef = c[Math.floor(Math.random() * c.length)];
      M.world = new RS.World(M.mapDef.data || M.mapDef.make());
    },
    go: function (name, opt) { if (M.scene && M.scene.exit) M.scene.exit(); M.ui.innerHTML = ""; M.name = name; M.scene = RS.scenes[name]; M.scene.enter(opt); },
    layout: function () {
      if (!M.root) return;
      var dpr = Math.min(window.devicePixelRatio || 1, 3), r = M.root.getBoundingClientRect();
      M.cv.width = Math.round(r.width * dpr); M.cv.height = Math.round(r.height * dpr);
      var aw = r.width - M.sidebar, ah = r.height, s = Math.min(aw / W, ah / H), v = M.view;
      // Ganzzahlige Vergrößerung, wenn sie fast passt (gleichmäßigere Pixel)
      var si = Math.floor(s * dpr) / dpr; if (si >= 1 && si / s > 0.9) s = si;
      v.s = s; v.w = W * s; v.h = H * s; v.x = M.sidebar + (aw - v.w) / 2; v.y = (ah - v.h) / 2; v.dpr = dpr;
      RS.input.setView(v.x, v.y, s);
      if (M.stage) { var st = M.stage.style; st.left = v.x + "px"; st.top = v.y + "px"; st.width = v.w + "px"; st.height = v.h + "px"; st.fontSize = Math.max(9, v.w / 480 * 4.2).toFixed(2) + "px"; }
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

  // ---------- Menü (zeigt schon die Map des nächsten Battles) ----------
  var NAMES = "rapstreets-names-v1", toastT = 0, setupOpen = false, floorMin = 0;
  function names() { try { var n = JSON.parse(RS.store.get(NAMES) || "null"); if (n && n.length === 2) return n; } catch (e) {} return [L2("Spieler 1", "Player 1"), L2("Spieler 2", "Player 2")]; }
  RS.scenes.menu = {
    enter: function () {
      var W0 = M.world; W0.cheer = false; W0.hype = 0; W0.beat = null; W0.actors = []; W0.dirty();
      var nm = names();
      M.ui.innerHTML = '<div class="rs-menu">' +
        '<a class="rs-back" href="#" title="' + L2("Zurück zu Color Space", "Back to Color Space") + '">← Color Space</a>' +
        '<div class="rs-title"><h1>Rap Streets</h1><p>Brooklyn · Freestyle Battle</p><span class="rs-map">Map: ' + String(W0.map.name).replace(/</g, "&lt;") + '</span></div>' +
        '<div class="rs-btns"><button type="button" class="rs-btn" data-a="battle">Battle</button></div>' +
        '<div class="rs-devbox"><button type="button" class="rs-dev" aria-label="Editor"></button><form class="rs-pass" hidden><input type="password" inputmode="numeric" autocomplete="off" maxlength="12" aria-label="Code"></form></div>' +
        '<div class="rs-setup" hidden><div class="rs-setup-box" role="dialog" aria-label="Battle"><h2>Battle</h2>' +
        '<label>' + L2("Rapper", "Rappers") + '</label><div class="rs-names"><div><input type="text" maxlength="18" data-n="0" aria-label="P1"></div><div><input type="text" maxlength="18" data-n="1" aria-label="P2"></div></div>' +
        '<label>Instrumental</label><select data-k="beat"><option value="">' + L2("Zufällig", "Random") + '</option>' + RS.BEATS.map(function (b, i) { return '<option value="' + i + '">' + b.file.replace(/\.mp3$/i, "").replace(/_/g, " ") + ' · ' + Math.round(b.bpm) + ' BPM · ' + Math.floor(b.dur / 60) + ':' + ("0" + Math.floor(b.dur % 60)).slice(-2) + '</option>'; }).join("") + '</select>' +
        '<label>' + L2("Mikrofon", "Microphone") + '</label><div class="rs-mic"><i><u></u></i><span></span></div>' +
        '<p class="rs-note">' + L2("Ein Mikro für beide – ihr gebt es in echt weiter. Der Song wird geviertelt: Rot, Blau, Rot, Blau, dazwischen 2 Takte „Pass the mic“. Je mehr ihr rappt, desto lauter die Crowd. Am besten mit Kopfhörern oder leisen Boxen, sonst hört das Mikro den Beat mit.", "One mic for both – pass it on for real. The song is split in quarters: red, blue, red, blue, with 2 bars of “Pass the mic” in between. The more you rap, the louder the crowd. Headphones or quiet speakers work best, otherwise the mic hears the beat too.") + '</p>' +
        '<div class="rs-setup-btns"><button type="button" data-a="back">' + L2("Zurück", "Back") + '</button><button type="button" class="go" data-a="start">' + L2("Los", "Go") + '</button></div></div></div>' +
        '<div class="rs-toast" hidden></div></div>';
      var root = M.ui.firstChild, form = root.querySelector(".rs-pass"), inp = form.querySelector("input"), setup = root.querySelector(".rs-setup");
      root.querySelectorAll("[data-n]").forEach(function (el) { el.value = nm[+el.dataset.n]; });
      setupOpen = false;
      function micState() {
        var box = root.querySelector(".rs-mic"), ok = !!RS.audio.an;
        box.classList.toggle("no", !ok); box.querySelector("span").textContent = ok ? L2("bereit", "ready") : L2("kein Zugriff – Battle geht trotzdem, die Crowd reagiert dann nicht", "no access – the battle still works, but the crowd won't react");
      }
      root.addEventListener("click", function (e) {
        var b = e.target.closest("[data-a]"); if (!b) return; var a = b.dataset.a;
        if (a === "battle") {
          setup.hidden = false; setupOpen = true; floorMin = 0; RS.audio.context();
          root.querySelector(".rs-mic span").textContent = L2("Zugriff wird angefragt …", "Requesting access …");
          RS.audio.micOpen().then(function () { if (setupOpen) micState(); });
        } else if (a === "back") { setup.hidden = true; setupOpen = false; }
        else if (a === "start") {
          var n = [0, 1].map(function (i) { var v = root.querySelector('[data-n="' + i + '"]').value.trim(); return v || names()[i]; });
          RS.store.set(NAMES, JSON.stringify(n));
          var bi = root.querySelector("[data-k=beat]").value, beat = bi === "" ? RS.pickBeat() : RS.BEATS[+bi]; RS.lastBeat = beat;
          M.go("battle", { names: n, beat: beat });
        }
      });
      setup.addEventListener("click", function (e) { if (e.target === setup) { setup.hidden = true; setupOpen = false; } });
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
    exit: function () { clearTimeout(toastT); setupOpen = false; },
    update: function (dt) {
      M.world.update(dt);
      if (setupOpen && RS.audio.an) {   // Pegelanzeige; der leiseste Wert ist der Grundpegel des Raums
        var db = RS.audio.micDb(), u = M.ui.querySelector(".rs-mic u");
        RS.micFloor = RS.micFloor == null ? db : Math.min(db, RS.micFloor + dt * 2);
        if (u) u.style.width = m.clamp((db + 70) / 60, 0, 1) * 100 + "%";
      }
    },
    render: function (c) {
      M.world.render(c);
      // leichte Abdunklung oben, damit der Titel steht
      var g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "rgba(0,0,0,.55)"); g.addColorStop(0.55, "rgba(0,0,0,.15)"); g.addColorStop(1, "rgba(0,0,0,.35)");
      c.fillStyle = g; c.fillRect(0, 0, W, H);
    }
  };
})();
