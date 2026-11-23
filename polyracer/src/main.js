// ===== main.js · Hülle: Start, Zustände (Menü, Developer Tool, Testfahrt), Schleife, Gestaltung =====
import { PR, KEYS, store, el } from "pr/core.js";
import { Engine } from "pr/engine.js";
import { World } from "pr/world.js";
import { Input } from "pr/input.js";
import { Menu } from "pr/menu.js";
import { Editor } from "pr/editor.js";
import { Drive } from "pr/drive.js";
import { WindIcon } from "pr/wind.js";
import { loadSaved, autosave } from "pr/sceneio.js";

const CSS = `
.pr-root{position:fixed;inset:0;z-index:30;background:#111214;color:#ECEAE4;font:500 14px var(--f-body,system-ui,sans-serif);overflow:hidden;user-select:none}
.pr-root *{box-sizing:border-box;border-radius:0!important;font-style:normal}
.pr-cv{position:absolute;inset:0;width:100%;height:100%;display:block;outline:0}
.pr-ui{position:absolute;inset:0;pointer-events:none}.pr-ui>*{pointer-events:auto}
.pr-root button{font:600 13px var(--f-body,system-ui,sans-serif);color:#ECEAE4;background:#2A2C30;border:1px solid #44474D;padding:7px 11px;cursor:pointer}
.pr-root button:hover{border-color:#8A8E96}.pr-root button[aria-pressed=true]{background:#ECEAE4;color:#141518;border-color:#ECEAE4}
.pr-root button:disabled{opacity:.45;cursor:default}.pr-root .pr-pri{background:#E2621B;border-color:#E2621B;color:#fff}
.pr-root input[type=range]{width:100%;accent-color:#E2621B;margin:4px 0 0}
.pr-root input[type=text],.pr-root input[type=password],.pr-root select{width:100%;background:#1B1C1F;color:#ECEAE4;border:1px solid #44474D;padding:6px 8px;font:500 13px var(--f-body,system-ui,sans-serif)}
.pr-toast{position:absolute;left:50%;top:64px;transform:translateX(-50%);background:#1B1C1F;border:1px solid #E2621B;padding:10px 16px;font-weight:600;pointer-events:none;z-index:20}
/* Menü */
.pr-menu{position:absolute;inset:0;display:flex;align-items:center;padding:0 7vw;background:linear-gradient(90deg,rgba(14,15,17,.88),rgba(14,15,17,.35) 45%,rgba(14,15,17,0) 70%)}
.pr-mbox{display:flex;flex-direction:column;gap:8px;width:min(340px,86vw)}
.pr-mbox h1{font:800 54px/0.95 var(--f-display,system-ui,sans-serif);letter-spacing:.02em;margin:0 0 18px;color:#fff}.pr-mbox h1 span{display:block;color:#E2621B}
.pr-mb{font-size:17px!important;padding:13px 16px!important;text-align:left}.pr-mb small{opacity:.7;font-weight:500;margin-left:6px}
.pr-code{display:flex;flex-direction:column;gap:6px;padding:10px;background:#1B1C1F;border:1px solid #44474D}.pr-code[hidden]{display:none}.pr-code div{display:flex;gap:6px}.pr-code span{color:#E8503A;font-weight:600}
.pr-set{background:#1B1C1F;border:1px solid #44474D;padding:8px 10px}.pr-set summary{cursor:pointer;font-weight:700}.pr-set label{display:block;margin:10px 0 4px;color:#A9ACB2;font-weight:600}
.pr-seg{display:flex;flex-wrap:wrap}.pr-seg button{flex:1 1 auto}.pr-seg button+button{border-left:0}
.pr-mlink{color:#A9ACB2;text-decoration:none;margin-top:6px;font-weight:600}.pr-mlink:hover{color:#fff}
.pr-mfoot{position:absolute;left:7vw;bottom:18px;max-width:min(560px,60vw);display:flex;flex-direction:column;color:#8A8E96;font-size:12px;gap:4px;pointer-events:none}
/* Developer Tool */
.pr-ed{position:absolute;inset:0;pointer-events:none}.pr-ed>*{pointer-events:auto}
.pr-top{position:absolute;left:0;right:0;top:0;height:46px;display:flex;align-items:center;gap:8px;padding:0 10px;background:#16171A;border-bottom:1px solid #2E3035}
.pr-top b{font-size:15px}.pr-name{color:#A9ACB2}.pr-sp{flex:1}
.pr-tools{position:absolute;left:10px;top:58px;display:flex;flex-direction:column;gap:4px;width:150px}
.pr-tools button{text-align:left;padding:9px 10px;background:rgba(27,28,31,.92)}.pr-tools i{display:inline-block;width:18px;color:#8A8E96}
.pr-tools button[aria-pressed=true] i{color:#141518}
.pr-panel{position:absolute;right:10px;top:58px;bottom:66px;width:310px;overflow-y:auto;background:rgba(22,23,26,.95);border:1px solid #2E3035;padding:12px;scrollbar-width:thin}
.pr-panel h3{margin:0 0 10px;font-size:15px}.pr-panel h4{margin:14px 0 6px;font-size:13px;color:#A9ACB2}.pr-panel p{color:#A9ACB2;font-size:12px;line-height:1.45;margin:10px 0 0}.pr-panel .pr-dim{color:#8A8E96}
.pr-row{display:block;margin:10px 0 0}.pr-row span{display:flex;justify-content:space-between;font-weight:600;font-size:12px}.pr-row em{color:#A9ACB2}
.pr-chk{display:flex;align-items:center;gap:7px;margin:10px 0 0;font-weight:600;font-size:12px;cursor:pointer}.pr-chk input{accent-color:#E2621B}
.pr-btns{display:flex;flex-wrap:wrap;gap:4px;margin-top:10px}.pr-btns.pr-col{flex-direction:column}
.pr-box{border:1px solid #34363B;padding:10px;margin-top:10px;background:#1B1C1F}
.pr-layers,.pr-groups{display:grid;grid-template-columns:1fr 1fr;gap:4px}.pr-layers button,.pr-groups button{text-align:left;display:flex;align-items:center;gap:6px;font-size:12px!important}
.pr-layers i{width:14px;height:14px;flex:none;border:1px solid rgba(0,0,0,.3)}
.pr-item{display:grid;grid-template-columns:1fr 26px;gap:2px 6px;margin-top:8px;align-items:center}.pr-item span{grid-column:1/3;display:flex;justify-content:space-between;font-size:12px;font-weight:600}.pr-item em{color:#A9ACB2}.pr-item button{padding:2px 0}
.pr-box select{margin-top:10px}
.pr-status{position:absolute;left:0;right:0;bottom:0;height:30px;display:flex;justify-content:flex-start;padding-right:260px!important;align-items:center;gap:16px;padding:0 12px;background:#16171A;border-top:1px solid #2E3035;color:#8A8E96;font-size:12px}
/* Testfahrt */
.pr-hud{position:absolute;inset:0;pointer-events:none!important}
.pr-spd{position:absolute;right:28px;bottom:54px;text-align:right}.pr-spd b{font:800 64px/1 var(--f-display,system-ui,sans-serif);color:#fff;text-shadow:0 2px 8px rgba(0,0,0,.6)}.pr-spd span{display:block;color:#ddd;font-weight:700}
.pr-gear{position:absolute;right:28px;bottom:150px;font:800 34px/1 var(--f-display,system-ui,sans-serif);color:#E8A04A;text-shadow:0 2px 6px rgba(0,0,0,.6)}
.pr-rpm{position:absolute;right:28px;bottom:40px;width:220px;height:8px;background:rgba(0,0,0,.5)}.pr-rpm i{display:block;height:100%;width:0;background:#E8A04A}
.pr-info{position:absolute;left:20px;bottom:44px;color:#eee;font-weight:600;text-shadow:0 1px 4px rgba(0,0,0,.8)}
.pr-help{position:absolute;left:20px;right:20px;bottom:14px;color:#ccc;font-size:12px;text-shadow:0 1px 4px rgba(0,0,0,.8)}
.pr-legend{display:flex;flex-wrap:wrap;gap:4px 10px;margin-top:10px;font-size:11px;color:#A9ACB2}.pr-lg{display:flex;align-items:center;gap:5px}.pr-lg i{width:12px;height:12px;display:inline-block}
.pr-wind{position:absolute;top:14px;right:14px;display:flex;flex-direction:column;align-items:center;gap:2px;pointer-events:none;color:#C6C5B9;font-size:11px;font-weight:700;background:rgba(22,23,26,.55);padding:6px 8px 5px}
.pr-wind.pr-wed{top:58px;right:332px}
.pr-pause{position:absolute;inset:0;background:rgba(10,11,13,.6);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px}
.pr-pause h2{margin:0 0 10px;font-size:28px}.pr-pause button{width:260px;font-size:15px!important;padding:11px!important}
`;

let A = null;
export function mount(host, lang, stamp) {
  if (A) unmount();
  PR.lang = lang === "en" ? "en" : "de"; PR.stamp = stamp || "";
  if (!document.getElementById("pr-css")) { const s = document.createElement("style"); s.id = "pr-css"; s.textContent = CSS; document.head.appendChild(s); }
  host.innerHTML = "";
  const root = el("div", "pr-root"); host.appendChild(root);
  const engine = new Engine(root), ui = el("div", "pr-ui"); root.appendChild(ui);
  const settings = Object.assign({ shadows: true, scale: 1, drive: "rwd" }, store.get(KEYS.settings, {}));
  engine.quality({ shadows: settings.shadows, scale: settings.scale });
  const world = new World(engine);
  if (!loadSaved(world)) { world.standard(); autosave(world, true); }
  const app = A = { engine: engine, world: world, ui: ui, root: root, input: new Input(), settings: settings, lang: PR.lang, mode: null, modeName: "", raf: 0, last: performance.now() };
  app.go = (name, opts) => {
    if (app.mode) app.mode.dispose();
    app.modeName = name; ui.setAttribute("data-mode", name);
    app.mode = name === "editor" ? new Editor(app) : name === "drive" ? new Drive(app, opts) : new Menu(app);
  };
  app.toast = (msg) => { const tEl = el("div", "pr-toast", ""); tEl.textContent = msg; ui.appendChild(tEl); setTimeout(() => tEl.remove(), 2600); };
  app.onKey = (e) => { if (app.mode && app.mode.key && app.mode.key(e)) e.preventDefault(); else if (app.modeName === "drive" && /^(Space|ArrowUp|ArrowDown|ArrowLeft|ArrowRight)$/.test(e.code)) e.preventDefault(); };
  app.onResize = () => engine.resize();
  window.addEventListener("keydown", app.onKey); window.addEventListener("resize", app.onResize);
  const loop = (now) => {
    app.raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - app.last) / 1000); app.last = now;
    world.update(dt); if (app.mode) app.mode.update(dt); app.wind.update(); engine.render();
  };
  app.wind = new WindIcon(app);
  app.go("menu");
  app.raf = requestAnimationFrame(loop);
  window.PRDBG = app;
}
export function unmount() {
  if (!A) return;
  cancelAnimationFrame(A.raf); window.removeEventListener("keydown", A.onKey); window.removeEventListener("resize", A.onResize);
  if (A.modeName === "editor") autosave(A.world, true);
  if (A.mode) A.mode.dispose(); A.wind.dispose(); A.input.dispose(); A.engine.dispose(); A.root.remove(); A = null; window.PRDBG = null;
}
