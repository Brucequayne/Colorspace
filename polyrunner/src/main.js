// ===== main.js · Hülle: Start, Zustände (Menü, Map Editor, Testlauf), Schleife, Gestaltung =====
import { PRU, KEYS, store, el } from "pru/core.js";
import { Engine } from "pru/engine.js";
import { World } from "pru/world.js";
import { Menu } from "pru/menu.js";
import { Editor } from "pru/editor.js";
import { Play } from "pru/play.js";

const CSS = `
.pru-root{position:fixed;inset:0;z-index:30;background:#111214;color:#ECEAE4;font:500 13px var(--f-body,system-ui,sans-serif);overflow:hidden;user-select:none;-webkit-user-select:none}
.pru-root *{box-sizing:border-box;border-radius:0!important;font-style:normal}
.pru-cv{position:absolute;inset:0;width:100%;height:100%;display:block;outline:0}
.pru-ui{position:absolute;inset:0;pointer-events:none}.pru-ui>*{pointer-events:none}.pru-ui>*>*{pointer-events:auto}
.pru-root button{font:600 12px var(--f-body,system-ui,sans-serif);color:#ECEAE4;background:rgba(24,25,28,.86);border:1px solid #3A3D42;padding:7px 11px;cursor:pointer;backdrop-filter:blur(6px)}
.pru-root button:hover{border-color:#8A8E96}.pru-root button[aria-pressed=true]{background:#ECEAE4;color:#141518;border-color:#ECEAE4}
.pru-root button:disabled{opacity:.4;cursor:default}.pru-root .pru-pri{background:#E2621B;border-color:#E2621B;color:#fff}.pru-root .pru-pri:hover{border-color:#fff}
.pru-root input[type=range]{width:100%;accent-color:#E2621B;margin:2px 0 6px}
.pru-root input[type=text],.pru-root input[type=password]{width:100%;background:#1B1C1F;color:#ECEAE4;border:1px solid #3A3D42;padding:7px 8px;font:500 13px var(--f-body,system-ui,sans-serif);user-select:text}
.pru-root svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linejoin:round;stroke-linecap:square;display:block}
.pru-toast{position:absolute;left:50%;top:70px;transform:translateX(-50%);background:rgba(20,21,24,.92);border:1px solid #E2621B;padding:9px 15px;font-weight:600;pointer-events:none!important;z-index:20}
.pru-seg{display:flex;flex-wrap:wrap}.pru-seg button{flex:1 1 auto}.pru-seg button+button{border-left:0}
.pru-chk{display:flex!important;align-items:center;gap:7px;cursor:pointer;margin:8px 0!important}.pru-chk input{accent-color:#E2621B;margin:0}
/* Menü */
.pru-menu{position:absolute;inset:0;display:flex;align-items:center;padding:0 7vw;background:linear-gradient(90deg,rgba(14,15,17,.7),rgba(14,15,17,.2) 40%,rgba(14,15,17,0) 65%)}
.pru-mbox{display:flex;flex-direction:column;gap:8px;width:min(330px,86vw)}
.pru-mbox h1{font:800 56px/0.92 var(--f-display,system-ui,sans-serif);letter-spacing:.01em;margin:0 0 20px;color:#fff;text-shadow:0 2px 24px rgba(0,0,0,.25)}.pru-mbox h1 span{display:block;color:#E2621B}
.pru-mb{font-size:16px!important;padding:13px 16px!important;text-align:left}.pru-mb small{opacity:.7;font-weight:500;margin-left:6px}
.pru-code{display:flex;flex-direction:column;gap:6px;padding:10px;background:rgba(24,25,28,.9);border:1px solid #3A3D42}.pru-code[hidden]{display:none}.pru-code div{display:flex;gap:6px}.pru-code span{color:#ED6A5E;font-weight:600}
.pru-set{background:rgba(24,25,28,.9);border:1px solid #3A3D42;padding:9px 11px}.pru-set summary{cursor:pointer;font-weight:700}.pru-set label{display:flex;justify-content:space-between;margin:10px 0 4px;color:#A9ACB2;font-weight:600}.pru-set em{color:#ECEAE4}
.pru-mlink{color:#ECEAE4;opacity:.75;text-decoration:none;margin-top:6px;font-weight:600;text-shadow:0 1px 6px rgba(0,0,0,.5)}.pru-mlink:hover{opacity:1}
.pru-mfoot{position:absolute;left:7vw;bottom:18px;color:#ECEAE4;opacity:.7;font-size:12px;text-shadow:0 1px 6px rgba(0,0,0,.5)}
/* Map Editor */
.pru-ed{position:absolute;inset:0}
.pru-brand{position:absolute;left:14px;top:12px;font:800 15px var(--f-display,system-ui,sans-serif);letter-spacing:.04em;color:#fff;text-shadow:0 1px 8px rgba(0,0,0,.35);pointer-events:none!important}.pru-brand b{color:#E2621B;font-weight:800}
.pru-brand span{display:block;font:600 12px var(--f-body,system-ui,sans-serif);letter-spacing:0;opacity:.8;margin-top:2px}
.pru-ib{width:40px;height:40px;padding:0!important;display:flex;align-items:center;justify-content:center}
.pru-tools{position:absolute;left:14px;top:62px;display:flex;flex-direction:column;gap:4px}.pru-sep{height:8px;display:block}
.pru-right{position:absolute;right:14px;top:12px;display:flex;gap:4px}
.pru-tb{height:40px;display:flex;align-items:center;gap:7px;padding:0 13px!important;font-size:13px!important}.pru-tb small{font-weight:500;opacity:.8}.pru-tb[hidden]{display:none}
.pru-pop{position:absolute;right:14px;top:58px;width:250px;background:rgba(20,21,24,.94);border:1px solid #3A3D42;padding:12px;backdrop-filter:blur(8px)}
.pru-pop[hidden]{display:none}.pru-pop label{display:flex;justify-content:space-between;color:#A9ACB2;font-weight:600;margin:0 0 5px}.pru-pop em{color:#ECEAE4}.pru-pop p{color:#8A8E96;margin:10px 0 0}
.pru-col{display:flex;flex-direction:column;gap:4px;margin-top:10px}
.pru-ctx{position:absolute;left:50%;top:12px;transform:translateX(-50%);display:flex;gap:4px;align-items:center;padding:4px;background:rgba(20,21,24,.7);border:1px solid #2E3035;backdrop-filter:blur(6px)}
.pru-ctx[hidden]{display:none}
.pru-rot{padding:0 10px 0 8px;color:#C6C5B9;font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap}
.pru-sw{width:30px;height:30px;padding:0!important;border:2px solid rgba(0,0,0,.25)!important;display:block;cursor:pointer}.pru-sw[aria-pressed=true]{outline:2px solid #fff;outline-offset:1px}
.pru-cust{position:relative;background:conic-gradient(#E2621B,#E8C547,#7A9E7E,#5FC2CF,#3F7CAC,#8E6C8A,#C97B84,#E2621B)}.pru-cust input{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%}
.pru-hint{position:absolute;left:14px;bottom:14px;max-width:min(560px,40vw);display:flex;flex-direction:column;gap:3px;color:#ECEAE4;font-size:11.5px;line-height:1.35;text-shadow:0 1px 5px rgba(0,0,0,.6);pointer-events:none!important}
.pru-hint b{font-weight:600}.pru-hint span{opacity:.7}
.pru-dim{position:absolute;background:#141518;color:#fff;border-left:3px solid #E2621B;padding:4px 8px;font-weight:700;font-variant-numeric:tabular-nums;pointer-events:none!important;white-space:pre}
.pru-dim[hidden]{display:none}
/* Testlauf */
.pru-hud{position:absolute;inset:0}.pru-hurt{position:absolute;inset:0;pointer-events:none!important;opacity:0;transition:opacity .15s;background:radial-gradient(ellipse at center,rgba(160,20,10,0) 45%,rgba(160,20,10,.55) 100%)}
.pru-time{position:absolute;left:50%;top:18px;transform:translateX(-50%);font:800 34px/1 var(--f-display,system-ui,sans-serif);color:#fff;font-variant-numeric:tabular-nums;text-shadow:0 2px 12px rgba(0,0,0,.35);pointer-events:none!important}
.pru-sub{position:absolute;left:50%;top:58px;transform:translateX(-50%);color:#fff;opacity:.85;font-weight:600;text-shadow:0 1px 6px rgba(0,0,0,.5);white-space:nowrap;pointer-events:none!important}
.pru-keys{position:absolute;left:14px;top:14px;max-width:min(380px,30vw);line-height:1.4;color:#fff;opacity:.75;font-size:11.5px;text-shadow:0 1px 5px rgba(0,0,0,.6);pointer-events:none!important}
.pru-click{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:rgba(20,21,24,.8);padding:10px 16px;font-weight:700;pointer-events:none!important}.pru-click[hidden]{display:none}
.pru-over{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(10,11,13,.35)}.pru-over[hidden]{display:none}
.pru-box{display:flex;flex-direction:column;gap:6px;width:280px;background:rgba(20,21,24,.94);border:1px solid #3A3D42;padding:18px;backdrop-filter:blur(8px)}
.pru-box h2{margin:0 0 8px;font:800 24px var(--f-display,system-ui,sans-serif)}.pru-box button{padding:10px!important;font-size:14px!important}
.pru-big{font:800 44px/1 var(--f-display,system-ui,sans-serif);font-variant-numeric:tabular-nums;color:#fff}
.pru-res p{margin:2px 0 6px;color:#A9ACB2}.pru-res .pru-new{color:#E2621B;font-weight:800}.pru-res h4{margin:6px 0 0;color:#A9ACB2;font-size:12px}
.pru-res ol{margin:0 0 10px;padding-left:22px;font-variant-numeric:tabular-nums;line-height:1.6}.pru-res .pru-me{color:#E2621B;font-weight:700}
`;

let A = null;
export function mount(host, lang, stamp) {
  if (A) unmount();
  PRU.lang = lang === "en" ? "en" : "de"; PRU.stamp = stamp || "";
  if (!document.getElementById("pru-css")) { const s = document.createElement("style"); s.id = "pru-css"; s.textContent = CSS; document.head.appendChild(s); }
  host.innerHTML = "";
  const root = el("div", "pru-root"); host.appendChild(root);
  const engine = new Engine(root), ui = el("div", "pru-ui"); root.appendChild(ui);
  const settings = Object.assign({ shadows: true, scale: 1, sens: 1, invert: false, fov: 72, camDist: 3.6 }, store.get(KEYS.settings, {}));
  engine.quality({ shadows: settings.shadows, scale: settings.scale });
  const world = new World(engine);
  world.load(store.get(KEYS.map, null));
  const app = A = { engine: engine, world: world, ui: ui, root: root, settings: settings, mode: null, modeName: "", raf: 0, last: performance.now() };
  app.go = (name, opts) => {
    if (app.mode) app.mode.dispose();
    app.modeName = name; ui.setAttribute("data-mode", name);
    app.mode = name === "editor" ? new Editor(app) : name === "test" ? new Play(app, opts) : new Menu(app);
  };
  app.toast = (msg) => { const tEl = el("div", "pru-toast"); tEl.textContent = msg; ui.appendChild(tEl); setTimeout(() => tEl.remove(), 2400); };
  app.onKey = (e) => { if (app.mode && app.mode.key && app.mode.key(e)) e.preventDefault(); };
  app.onResize = () => engine.resize();
  window.addEventListener("keydown", app.onKey); window.addEventListener("resize", app.onResize);
  const loop = (now) => {
    app.raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - app.last) / 1000); app.last = now;
    if (app.mode) app.mode.update(dt);
    engine.render();
  };
  app.go("menu");
  app.raf = requestAnimationFrame(loop);
  window.PRUDBG = app;
}
export function unmount() {
  if (!A) return;
  cancelAnimationFrame(A.raf); window.removeEventListener("keydown", A.onKey); window.removeEventListener("resize", A.onResize);
  if (A.mode) A.mode.dispose();
  A.world.dispose(); A.engine.dispose(); A.root.remove(); A = null; window.PRUDBG = null;
}
