// ===== main.js · Hülle: Start, Zustände (Menü, Spielen, Map-Editor, Haus-Editor, Auto-Test), Schleife, Gestaltung =====
import { PR, KEYS, store, el } from "le/core.js";
import { Engine } from "le/engine.js";
import { World } from "le/world.js";
import { Input } from "le/input.js";
import { Menu } from "le/menu.js";
import { Editor } from "le/editor.js";
import { Drive } from "le/drive.js";
import { Play } from "le/play.js";
import { HouseEditor } from "le/houseeditor.js";
import { CharEditor } from "le/charedit.js";
import { charakter } from "le/save.js";
import { WindIcon } from "le/wind.js";
import { autosave, savedIsCurrent, loadStandard } from "le/sceneio.js";

const CSS = `
.le-root{position:fixed;inset:0;z-index:30;background:#111214;color:#ECEAE4;font:500 14px var(--f-body,system-ui,sans-serif);overflow:hidden;user-select:none}
.le-root *{box-sizing:border-box;border-radius:0!important;font-style:normal}
.le-cv{position:absolute;inset:0;width:100%;height:100%;display:block;outline:0}
.le-ui{position:absolute;inset:0;pointer-events:none}.le-ui>*{pointer-events:auto}
.le-root button{font:600 13px var(--f-body,system-ui,sans-serif);color:#ECEAE4;background:#2A2C30;border:1px solid #44474D;padding:7px 11px;cursor:pointer}
.le-root button:hover{border-color:#8A8E96}.le-root button[aria-pressed=true]{background:#ECEAE4;color:#141518;border-color:#ECEAE4}
.le-root button:disabled{opacity:.45;cursor:default}.le-root .le-pri{background:#ED6A5E;border-color:#ED6A5E;color:#fff}
.le-root input[type=range]{width:100%;accent-color:#ED6A5E;margin:4px 0 0}
.le-root input[type=text],.le-root input[type=password],.le-root select{width:100%;background:#1B1C1F;color:#ECEAE4;border:1px solid #44474D;padding:6px 8px;font:500 13px var(--f-body,system-ui,sans-serif)}
.le-toast{position:absolute;left:50%;top:64px;transform:translateX(-50%);background:#1B1C1F;border:1px solid #ED6A5E;padding:10px 16px;font-weight:600;pointer-events:none;z-index:20}
/* Menü */
.le-menu{position:absolute;inset:0;display:flex;align-items:center;padding:0 7vw;background:linear-gradient(90deg,rgba(14,15,17,.88),rgba(14,15,17,.35) 45%,rgba(14,15,17,0) 70%)}
.le-mbox{display:flex;flex-direction:column;gap:8px;width:min(340px,86vw)}
.le-mbox h1{font:800 54px/0.95 var(--f-display,system-ui,sans-serif);letter-spacing:.02em;margin:0 0 18px;color:#fff}.le-mbox h1 span{display:block;color:#ED6A5E}
.le-mb{font-size:17px!important;padding:13px 16px!important;text-align:left}.le-mb small{opacity:.7;font-weight:500;margin-left:6px}
.le-code{display:flex;flex-direction:column;gap:6px;padding:10px;background:#1B1C1F;border:1px solid #44474D}.le-code[hidden]{display:none}.le-code div{display:flex;gap:6px}.le-code span{color:#E8503A;font-weight:600}
.le-set{background:#1B1C1F;border:1px solid #44474D;padding:8px 10px}.le-set summary{cursor:pointer;font-weight:700}.le-set label{display:block;margin:10px 0 4px;color:#A9ACB2;font-weight:600}
.le-seg{display:flex;flex-wrap:wrap}.le-seg button{flex:1 1 auto}.le-seg button+button{border-left:0}
.le-mlink{color:#A9ACB2;text-decoration:none;margin-top:6px;font-weight:600}.le-mlink:hover{color:#fff}
.le-mfoot{position:absolute;left:7vw;bottom:18px;max-width:min(560px,60vw);display:flex;flex-direction:column;color:#8A8E96;font-size:12px;gap:4px;pointer-events:none}
/* Developer Tool */
.le-ed{position:absolute;inset:0;pointer-events:none}.le-ed>*{pointer-events:auto}
.le-top{position:absolute;left:0;right:0;top:0;height:46px;display:flex;align-items:center;gap:8px;padding:0 10px;background:#16171A;border-bottom:1px solid #2E3035}
.le-top b{font-size:15px}.le-name{color:#A9ACB2}.le-sp{flex:1}
.le-tools{position:absolute;left:10px;top:58px;display:flex;flex-direction:column;gap:4px;width:150px}
.le-tools button{text-align:left;padding:9px 10px;background:rgba(27,28,31,.92)}.le-tools i{display:inline-block;width:18px;color:#8A8E96}
.le-tools button[aria-pressed=true] i{color:#141518}
.le-panel{position:absolute;right:10px;top:58px;bottom:66px;width:310px;overflow-y:auto;background:rgba(22,23,26,.95);border:1px solid #2E3035;padding:12px;scrollbar-width:thin}
.le-panel h3{margin:0 0 10px;font-size:15px}.le-panel h4{margin:14px 0 6px;font-size:13px;color:#A9ACB2}.le-panel p{color:#A9ACB2;font-size:12px;line-height:1.45;margin:10px 0 0}.le-panel .le-dim{color:#8A8E96}
.le-row{display:block;margin:10px 0 0}.le-row span{display:flex;justify-content:space-between;font-weight:600;font-size:12px}.le-row em{color:#A9ACB2}
.le-chk{display:flex;align-items:center;gap:7px;margin:10px 0 0;font-weight:600;font-size:12px;cursor:pointer}.le-chk input{accent-color:#ED6A5E}
.le-btns{display:flex;flex-wrap:wrap;gap:4px;margin-top:10px}.le-btns.le-col{flex-direction:column}
.le-box{border:1px solid #34363B;padding:10px;margin-top:10px;background:#1B1C1F}
.le-layers,.le-groups{display:grid;grid-template-columns:1fr 1fr;gap:4px}.le-layers button,.le-groups button{text-align:left;display:flex;align-items:center;gap:6px;font-size:12px!important}
.le-layers i{width:14px;height:14px;flex:none;border:1px solid rgba(0,0,0,.3)}
.le-item{display:grid;grid-template-columns:1fr 26px;gap:2px 6px;margin-top:8px;align-items:center}.le-item span{grid-column:1/3;display:flex;justify-content:space-between;font-size:12px;font-weight:600}.le-item em{color:#A9ACB2}.le-item button{padding:2px 0}
.le-box select{margin-top:10px}
.le-status{position:absolute;left:0;right:0;bottom:0;height:30px;display:flex;justify-content:flex-start;padding-right:260px!important;align-items:center;gap:16px;padding:0 12px;background:#16171A;border-top:1px solid #2E3035;color:#8A8E96;font-size:12px}
/* Testfahrt */
.le-hud{position:absolute;inset:0;pointer-events:none!important}
.le-spd{position:absolute;right:28px;bottom:54px;text-align:right}.le-spd b{font:800 64px/1 var(--f-display,system-ui,sans-serif);color:#fff;text-shadow:0 2px 8px rgba(0,0,0,.6)}.le-spd span{display:block;color:#ddd;font-weight:700}
.le-gear{position:absolute;right:28px;bottom:150px;font:800 34px/1 var(--f-display,system-ui,sans-serif);color:#E8A04A;text-shadow:0 2px 6px rgba(0,0,0,.6)}
.le-rpm{position:absolute;right:28px;bottom:40px;width:220px;height:8px;background:rgba(0,0,0,.5)}.le-rpm i{display:block;height:100%;width:0;background:#E8A04A}
.le-cpd{position:absolute;left:50%;top:14px;transform:translateX(-50%);color:#C6C5B9;font-weight:700;font-size:13px;background:rgba(22,23,26,.45);padding:3px 9px;min-width:54px;text-align:center}.le-cpd:empty{display:none}
.le-delta{position:absolute;left:50%;top:44px;transform:translateX(-50%);font:800 22px/1 var(--f-display,system-ui,sans-serif);color:#eee;text-shadow:0 2px 6px rgba(0,0,0,.6);transition:opacity .2s;white-space:pre}.le-delta.le-good{color:#7FC8D4}.le-delta.le-bad{color:#ED6A5E}
.le-timer{position:absolute;left:20px;top:16px;color:#eee;font-weight:700;font-size:15px;line-height:1.5;text-shadow:0 1px 4px rgba(0,0,0,.8);font-variant-numeric:tabular-nums}
.le-info{position:absolute;left:20px;bottom:44px;color:#eee;font-weight:600;text-shadow:0 1px 4px rgba(0,0,0,.8)}
.le-help{position:absolute;left:20px;right:20px;bottom:14px;color:#ccc;font-size:12px;text-shadow:0 1px 4px rgba(0,0,0,.8)}
.le-legend{display:flex;flex-wrap:wrap;gap:4px 10px;margin-top:10px;font-size:11px;color:#A9ACB2}.le-lg{display:flex;align-items:center;gap:5px}.le-lg i{width:12px;height:12px;display:inline-block}
.le-wind{position:absolute;top:14px;right:14px;display:flex;flex-direction:column;align-items:center;gap:2px;pointer-events:none;color:#C6C5B9;font-size:11px;font-weight:700;background:rgba(22,23,26,.55);padding:6px 8px 5px}
.le-wind.le-wed{top:58px;right:332px}
.le-pause{position:absolute;inset:0;background:rgba(10,11,13,.6);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px}
.le-pause h2{margin:0 0 10px;font-size:28px}.le-pause button{width:260px;font-size:15px!important;padding:11px!important}
/* Leaarn: Menü */
.le-mbox h1 span{color:#ED6A5E}.le-msub{margin:-8px 0 14px;color:#C6C5B9;font-weight:600}
.le-macc{display:flex;justify-content:space-between;align-items:baseline;background:rgba(27,28,31,.85);border:1px solid #44474D;padding:9px 12px;margin-bottom:6px}.le-macc span{color:#A9ACB2;font-weight:600}.le-macc b{font:800 20px var(--f-display,system-ui,sans-serif);color:#fff}
/* Spielen */
.le-money{position:absolute;right:16px;top:14px;display:flex;flex-direction:column;align-items:flex-end;background:rgba(22,23,26,.72);border-left:4px solid #ED6A5E;padding:6px 12px 7px;pointer-events:none}
.le-money b{font:800 24px/1.1 var(--f-display,system-ui,sans-serif);color:#fff;font-variant-numeric:tabular-nums}
.le-gain{position:absolute;right:16px;top:60px;font:800 22px var(--f-display,system-ui,sans-serif);color:#7FC8D4;opacity:0;pointer-events:none;text-shadow:0 2px 6px rgba(0,0,0,.6)}
.le-gain.le-show{animation:le-gain 2.4s ease-out}
@keyframes le-gain{0%{opacity:0;transform:translateY(10px)}12%{opacity:1;transform:none}75%{opacity:1}100%{opacity:0;transform:translateY(-14px)}}
.le-prompt:empty{display:none}.le-prompt{position:absolute;left:50%;bottom:22%;transform:translateX(-50%);background:rgba(22,23,26,.82);border:1px solid #ED6A5E;padding:9px 16px;font-weight:700;font-size:15px;pointer-events:none;white-space:pre}
.le-where{position:absolute;left:16px;top:14px;color:#C6C5B9;font-weight:700;font-size:13px;text-shadow:0 1px 4px rgba(0,0,0,.8);pointer-events:none}
.le-hud .le-help{position:absolute;left:16px;right:16px;bottom:12px;color:#ddd;font-size:12px;text-shadow:0 1px 4px rgba(0,0,0,.8);pointer-events:none}
.le-hud{position:absolute;inset:0;pointer-events:none!important}.le-dimhud .le-help,.le-dimhud .le-prompt{display:none}
/* Laptop */
.le-lap{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(12,13,15,.45);z-index:10}
.le-lapf{width:min(900px,94vw);display:flex;flex-direction:column;align-items:center}
.le-scr{width:100%;height:min(560px,76vh);background:#2B3536;border:14px solid #222428;border-bottom-width:18px;box-shadow:0 20px 60px rgba(0,0,0,.55);display:flex;flex-direction:column;overflow:hidden}
.le-lbase{width:108%;height:14px;background:linear-gradient(#5A5F63,#3A3D42);clip-path:polygon(0 0,100% 0,96% 100%,4% 100%)}
.le-lhint{margin-top:8px;color:#A9ACB2;font-size:12px}
.le-bar{display:flex;align-items:center;gap:10px;padding:6px 10px;background:#475657;border-bottom:1px solid #3A4647}.le-bar b{font:800 15px var(--f-display,system-ui,sans-serif);letter-spacing:.08em;color:#fff}
.le-bar .le-acc{font-weight:800;color:#fff;font-variant-numeric:tabular-nums}.le-bar button{padding:2px 10px;font-size:16px!important;background:transparent;border-color:#62929E}.le-sp{flex:1}
.le-lbody{flex:1;overflow-y:auto;padding:16px 18px;scrollbar-width:thin}
.le-lbody h2{margin:0 0 12px;font:700 20px var(--f-display,system-ui,sans-serif);color:#fff}.le-lbody h4{margin:16px 0 6px;color:#C6C5B9}
.le-lbody:has(>.le-subj){display:flex;flex-direction:column}
.le-subj{flex:1;min-height:0;display:grid;grid-template-columns:repeat(4,1fr);grid-auto-rows:minmax(86px,1fr);gap:10px}
.le-subj button{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;text-align:center;padding:10px 8px;background:#33403F;border-color:#4A5A5B}
.le-subj i,.le-lhead i{display:flex;align-items:center;justify-content:center;width:40px;height:40px;font:800 15px var(--f-display,system-ui,sans-serif);color:#1B1C1F}
.le-subj button i{width:52px;height:52px;font-size:20px}
@media (max-width:760px){.le-subj{grid-template-columns:repeat(2,1fr)}}
.le-subj b{font-size:16px}.le-subj small{color:#A9ACB2;font-weight:600}.le-subj .le-off{opacity:.5}.le-subj button:not(.le-off):hover{border-color:#ED6A5E}
.le-lhead{display:flex;align-items:center;gap:10px;margin-bottom:12px}.le-lhead h2{margin:0}.le-lhead i{width:34px;height:34px}.le-dim{color:#A9ACB2;font-size:12px}
.le-topics{display:flex;flex-direction:column;gap:6px}
.le-topic{display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:center;background:#33403F;border:1px solid #4A5A5B;padding:9px 12px}
.le-topic.le-off{opacity:.5}.le-topic b{display:block}.le-topic small{display:block;color:#A9ACB2;font-size:12px;margin-top:2px}.le-topic em{color:#A9ACB2;font-weight:600}
.le-kl{background:#62929E;color:#10191B;font-weight:800;font-size:12px;padding:3px 7px;white-space:nowrap}
.le-dots{display:flex;gap:5px;margin:4px 0 18px}.le-dots i{flex:1;height:8px;background:#3E4B4C}.le-dots i.le-now{background:#C6C5B9}.le-dots i.le-ok{background:#62929E}.le-dots i.le-no{background:#ED6A5E}
.le-q{font:800 54px/1.1 var(--f-display,system-ui,sans-serif);color:#fff;text-align:center;margin:8px 0 18px;font-variant-numeric:tabular-nums}
.le-in{display:flex;gap:8px;justify-content:center}.le-in input{outline:0;width:200px!important;font:800 30px var(--f-display,system-ui,sans-serif)!important;text-align:center;padding:8px!important;background:#1B1C1F!important;border:2px solid #62929E!important}
.le-in input.le-good{border-color:#7FC8D4!important;color:#7FC8D4!important}.le-in input.le-bad{border-color:#ED6A5E!important;color:#ED6A5E!important}.le-in button{font-size:18px!important;padding:0 22px!important}
.le-pad{display:grid;grid-template-columns:repeat(3,64px);gap:6px;justify-content:center;margin-top:14px}.le-pad button{font-size:20px!important;padding:9px 0!important;background:#33403F}
.le-fb{min-height:28px;margin-top:14px;text-align:center;font-weight:800;font-size:18px}.le-fb.le-good,.le-good{color:#7FC8D4}.le-fb.le-bad{color:#ED6A5E}
.le-mc{display:grid;grid-template-columns:1fr 1fr;gap:8px;max-width:640px;margin:0 auto}.le-mc button{text-align:left;font-size:16px!important;padding:12px!important;background:#33403F}.le-mc kbd{display:inline-block;width:22px;color:#A9ACB2;font:700 13px var(--f-body,system-ui)}
.le-mc button.le-good{border-color:#7FC8D4;color:#7FC8D4}.le-mc button.le-bad{border-color:#ED6A5E;color:#ED6A5E}
.le-done{text-align:center}.le-big{font:800 86px/1 var(--f-display,system-ui,sans-serif);color:#fff}.le-big small{font-size:34px;color:#A9ACB2}
.le-earn{display:inline-block;margin:6px 0 4px;background:#ED6A5E;color:#1B1C1F;padding:8px 18px;font-weight:700;font-size:16px}.le-earn b{font-size:22px}
.le-mist{display:flex;flex-wrap:wrap;gap:6px;justify-content:center}.le-mist span{background:#33403F;padding:5px 9px}.le-mist em{color:#ED6A5E;margin-left:6px}
.le-done .le-btns{justify-content:center;margin-top:16px}
/* Haus-Editor */
.le-hparts{position:absolute;left:10px;top:58px;bottom:40px;width:236px;display:flex;flex-direction:column;gap:6px}
.le-cats{display:grid!important;grid-template-columns:1fr 1fr}.le-cats button{text-align:left}.le-cats i{display:inline-block;width:16px;color:#8A8E96}.le-cats button[aria-pressed=true] i{color:#141518}
.le-plist{flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:3px;background:rgba(22,23,26,.9);border:1px solid #2E3035;padding:6px;scrollbar-width:thin}
.le-plist button{display:flex;align-items:center;gap:8px;text-align:left;font-size:12px!important;padding:6px 8px!important}.le-plist i{width:14px;height:14px;flex:none;border:1px solid rgba(0,0,0,.35)}
.le-hl{display:flex;flex-direction:column;gap:3px}.le-hl button{text-align:left}
/* Farb-Spiel (Kunst) */
.le-cg,.le-copts,.le-ccmp{display:flex;justify-content:center;align-items:flex-start;gap:14px}
.le-cbox{display:flex;flex-direction:column;align-items:center;gap:5px;min-width:104px}.le-cbox small{color:#C6C5B9;font-weight:700;font-size:12px;min-height:15px}
.le-sw{position:relative;overflow:hidden;width:104px;height:104px;border:3px solid rgba(236,234,228,.16);display:flex;align-items:center;justify-content:center;font:800 44px var(--f-display,system-ui,sans-serif);color:#C6C5B9;transition:background-color .5s,border-color .2s}
.le-slot{border:3px dashed #62929E;background:#25302F}.le-drop.le-hot{border-color:#ED6A5E;border-style:solid}
.le-op{font:800 38px/104px var(--f-display,system-ui,sans-serif);color:#fff}
.le-fx{position:absolute;inset:-40%;opacity:0;pointer-events:none}
.le-stir{animation:le-stir .9s ease-in-out forwards}
@keyframes le-stir{0%{opacity:0;transform:rotate(0)}15%{opacity:.95}75%{opacity:.95;transform:rotate(520deg)}100%{opacity:0;transform:rotate(620deg)}}
.le-copts{margin-top:20px;gap:26px}.le-copts .le-sw{width:84px;height:84px;cursor:grab;touch-action:none}
.le-copts kbd{position:absolute;left:4px;top:3px;font:700 12px var(--f-body,system-ui);color:rgba(20,21,24,.65);text-shadow:0 0 3px rgba(255,255,255,.6)}
.le-drag:hover{border-color:#ED6A5E}.le-lift{opacity:.35}.le-used{opacity:.3}.le-dim2{opacity:.55}.le-copts .le-right{opacity:1;border-color:#7FC8D4;outline:3px solid #7FC8D4}
.le-ghost{position:fixed;z-index:9999;pointer-events:none;border:3px solid #ECEAE4;box-shadow:0 10px 26px rgba(0,0,0,.5)}
.le-ccmp{margin-top:14px;align-items:flex-start}.le-ccmp .le-sw{width:64px;height:64px}.le-ccmp .le-op{line-height:64px;font-size:30px}.le-ccmp.le-good .le-op{color:#7FC8D4}.le-ccmp.le-bad .le-op{color:#ED6A5E}.le-ccmp .le-cbox{min-width:84px}
.le-chint{text-align:center;margin-top:14px}
.le-msw{display:inline-block;width:18px;height:18px;vertical-align:-4px;border:1px solid rgba(236,234,228,.3)}.le-mcol em{margin:0 4px 0 8px}
/* Zwischenkonto, Einsammeln (v0.12) */
.le-money{z-index:11}.le-money.le-bump{animation:le-bump .25s ease-out}
@keyframes le-bump{0%{transform:scale(1)}40%{transform:scale(1.12);border-left-color:#7FC8D4}100%{transform:scale(1)}}
.le-bill{position:fixed;left:0;top:0;width:58px;height:30px;z-index:9999;pointer-events:none;background:linear-gradient(135deg,#7FB0BA,#62929E 60%,#4A6D7C);border:2px solid #C6C5B9;box-shadow:0 3px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center}
.le-bill span{display:flex;align-items:center;justify-content:center;width:20px;height:20px;border:1px solid rgba(236,234,228,.75);font:800 11px var(--f-body,system-ui);color:#ECEAE4}
.le-pend{color:#C6C5B9;font-size:13px;font-weight:600}.le-pend b{color:#fff;font-size:15px;font-variant-numeric:tabular-nums}.le-pend.le-bump{animation:le-bump .5s ease-out}
.le-bar .le-col{font-size:12px!important;padding:4px 10px!important}.le-bar .le-col:disabled{opacity:.4}
.le-earn small{font-size:12px;font-weight:600}
.le-colbig:not(:disabled){background:#62929E!important;border-color:#62929E!important;color:#10191B!important}
/* Color Guesser */
.le-gshow{position:relative;height:330px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;border:3px solid rgba(236,234,228,.16)}
.le-gshow b{background:rgba(20,21,24,.7);padding:5px 12px;font-size:15px}.le-gshow span{font:800 64px var(--f-display,system-ui,sans-serif);color:#fff;text-shadow:0 2px 10px rgba(0,0,0,.45)}
.le-gbar{position:absolute;left:0;bottom:0;height:8px;width:100%;background:#ECEAE4;transform-origin:left;animation:le-gbar linear forwards}
@keyframes le-gbar{from{transform:scaleX(1)}to{transform:scaleX(0)}}
.le-gmix{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:18px;align-items:stretch}
.le-gprev{min-height:300px;border:3px solid rgba(236,234,228,.16);display:flex;align-items:flex-start;justify-content:flex-start;padding:10px}.le-gprev b{background:rgba(20,21,24,.7);padding:4px 10px;font-size:13px}
.le-gsl{display:flex;flex-direction:column;gap:14px;justify-content:center}
.le-grow span{display:flex;justify-content:space-between;font-weight:700;font-size:13px;margin-bottom:6px}.le-grow em{color:#C6C5B9;font-variant-numeric:tabular-nums}
.le-root input.le-gr{-webkit-appearance:none;appearance:none;width:100%;height:30px;margin:0;border:2px solid rgba(236,234,228,.2);outline:0;cursor:pointer}
.le-gr:focus{border-color:#ECEAE4!important}
.le-gr::-webkit-slider-thumb{-webkit-appearance:none;width:12px;height:34px;background:#fff;border:2px solid #141518;box-shadow:0 0 0 1px #fff}
.le-gr::-moz-range-thumb{width:10px;height:32px;background:#fff;border:2px solid #141518;border-radius:0}
.le-gsub{font-size:16px!important;padding:11px!important;margin-top:4px}
.le-gres{display:grid;grid-template-columns:1fr 1fr;height:220px;border:3px solid rgba(236,234,228,.16)}
.le-gres div{display:flex;flex-direction:column;justify-content:space-between;align-items:flex-start;padding:10px}.le-gres small,.le-gres span{background:rgba(20,21,24,.7);padding:3px 8px;font-weight:700;font-size:12px}
.le-grate{display:flex;align-items:baseline;justify-content:center;gap:10px;margin-top:12px}.le-grate b{font:800 60px var(--f-display,system-ui,sans-serif);color:#fff}.le-grate b.le-good{color:#7FC8D4}.le-grate b.le-bad{color:#ED6A5E}.le-grate small{color:#A9ACB2;font-weight:700}
.le-gnb{justify-content:center}
.le-gsum{display:flex;justify-content:center;gap:8px;margin:10px 0}.le-grow2{display:flex;flex-direction:column;align-items:center;gap:3px;background:#33403F;padding:6px 8px}
.le-grow2 span{color:#A9ACB2;font-size:11px;font-weight:700}.le-grow2 i{display:block;width:44px;height:22px}.le-grow2 b{font-variant-numeric:tabular-nums}.le-grow2 b.le-bad{color:#ED6A5E}
/* v0.13: Bulldozer, Charakter-Editor, Zurücksetzen */
.le-bull{width:100%;text-align:left;margin-bottom:2px}.le-bull i{display:inline-block;width:16px;color:#8A8E96}.le-bull[aria-pressed=true]{background:#ED6A5E!important;border-color:#ED6A5E!important;color:#141518!important}.le-bull[aria-pressed=true] i{color:#141518}
.le-bullon .le-plist{opacity:.45}
.le-char{position:absolute;inset:0;display:flex;align-items:center;padding:0 6vw;background:linear-gradient(90deg,rgba(14,15,17,.9),rgba(14,15,17,.55) 40%,rgba(14,15,17,0) 62%)}
.le-cbox2{width:min(400px,90vw);display:flex;flex-direction:column;gap:10px}.le-cbox2 h2{margin:0;font:800 34px var(--f-display,system-ui,sans-serif);color:#fff}.le-cbox2 p{margin:0;color:#C6C5B9;font-weight:600;line-height:1.4}
.le-cfield{display:grid;grid-template-columns:1fr 90px;gap:8px}.le-cfield label{display:flex;flex-direction:column;gap:4px;color:#A9ACB2;font-weight:700;font-size:12px}
.le-cfield input{width:100%;background:#1B1C1F;color:#ECEAE4;border:1px solid #44474D;padding:8px;font:600 15px var(--f-body,system-ui,sans-serif)}
.le-crow span{display:block;color:#A9ACB2;font-weight:700;font-size:12px;margin-bottom:4px}.le-csw{display:flex;flex-wrap:wrap;gap:5px}
.le-csw button{width:28px;height:28px;padding:0!important;border:2px solid rgba(236,234,228,.18)!important}.le-csw button[aria-pressed=true]{border-color:#fff!important;outline:2px solid #ED6A5E;outline-offset:1px}
.le-cown{position:relative;width:28px;height:28px;display:flex;align-items:center;justify-content:center;border:2px dashed #8A8E96;color:#C6C5B9;font-weight:800;cursor:pointer}.le-cown input{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%}
.le-cmsg{color:#ED6A5E!important;min-height:18px}.le-chint2{position:absolute;right:20px;bottom:14px;color:#A9ACB2;font-size:12px;pointer-events:none}
.le-mb small{opacity:.8;font-weight:600;margin-left:6px}
.le-reset{position:absolute;top:14px;right:16px;background:transparent!important;border:1px solid transparent!important;color:#8A8E96!important;font-size:12px!important;padding:5px 9px!important}.le-reset:hover{border-color:#ED6A5E!important;color:#ED6A5E!important}
.le-dlg{position:absolute;inset:0;background:rgba(10,11,13,.7);display:flex;align-items:center;justify-content:center;z-index:30}
.le-dlg>div{width:min(460px,90vw);background:#1B1C1F;border:1px solid #ED6A5E;padding:20px}.le-dlg h3{margin:0 0 8px;font-size:18px}.le-dlg p{color:#A9ACB2;margin:0 0 12px;font-size:13px;line-height:1.45}
.le-danger{background:#ED6A5E!important;border-color:#ED6A5E!important;color:#141518!important}
.le-money span{display:block;color:#C6C5B9;font-weight:700;font-size:11px}
/* v0.14: Laptop-Menü, Vollbild, Statistiken */
.le-lmain{flex:1;display:flex;min-height:0}
.le-nav{width:150px;flex:none;display:flex;flex-direction:column;gap:4px;padding:12px 8px;background:#26302F;border-right:1px solid #3A4647}
.le-nav button{text-align:left;background:transparent;border-color:transparent;padding:9px 10px!important}.le-nav button[aria-pressed=true]{background:#475657;color:#fff;border-color:#475657}.le-nav button:hover{border-color:#62929E}
.le-lmain .le-lbody{flex:1;min-width:0}
.le-bar .le-fullb{font-size:12px!important;padding:4px 10px!important;background:transparent;border-color:#62929E}
.le-full .le-lapf{width:100vw;height:100%}.le-full .le-scr{height:100%;border-width:0;box-shadow:none}.le-full .le-lbase,.le-full .le-lhint{display:none}.le-full{background:#2B3536;z-index:12!important}
.le-stats{position:relative}.le-stats h4{margin:14px 0 6px;color:#C6C5B9;font-size:13px}.le-stats h4 small{color:#A9ACB2;font-weight:600}
.le-kpis{display:grid;grid-template-columns:1.4fr 1fr 1fr 1fr;gap:8px}.le-kpi{background:#33403F;padding:10px 12px;display:flex;flex-direction:column;gap:2px}
.le-kpi small{color:#A9ACB2;font-weight:700;font-size:11px}.le-kpi b{font:800 22px var(--f-display,system-ui,sans-serif);color:#fff;display:flex;align-items:center;gap:8px;font-variant-numeric:tabular-nums}.le-kpi span{color:#C6C5B9;font-size:12px;font-weight:600}
.le-kpi i{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;font:800 11px var(--f-display,system-ui,sans-serif);color:#1B1C1F}
.le-kpitop{border-left:4px solid #ED6A5E}
.le-per{display:flex;align-items:center;justify-content:center;gap:12px;margin:14px 0 2px}.le-per b{min-width:220px;text-align:center}.le-per button{padding:2px 12px!important;font-size:16px!important}
.le-charts{display:grid;grid-template-columns:1fr;gap:10px}.le-chart{background:#2F3A39;padding:2px 10px 8px}
.le-svg{width:100%;height:auto;display:block}.le-grid{stroke:#4A5A5B;stroke-width:1}.le-ax{fill:#A9ACB2;font:600 10px var(--f-body,system-ui,sans-serif)}.le-val{fill:#ECEAE4;font:700 10px var(--f-body,system-ui,sans-serif)}
.le-svg g:hover rect[fill="transparent"]{fill:rgba(236,234,228,.06)}
.le-hbars{display:flex;flex-direction:column;gap:5px;padding:4px 0}.le-hb{display:grid;grid-template-columns:170px 1fr 40px;gap:10px;align-items:center;font-size:13px}
.le-hb span{display:flex;align-items:center;gap:7px;color:#ECEAE4;font-weight:600}.le-hb span i{width:10px;height:10px;display:inline-block}.le-hb div{height:14px;background:#3E4B4C}.le-hb em{display:block;height:100%;background:#62929E}.le-hb b{text-align:right;font-variant-numeric:tabular-nums}
.le-tip{position:absolute;display:none;pointer-events:none;background:#1B1C1F;border:1px solid #62929E;padding:4px 8px;font-size:12px;font-weight:700;white-space:nowrap;z-index:5}
/* Inventar, Schnellauswahl, Ghettoblaster */
.le-hotbar{position:absolute;left:50%;bottom:34px;transform:translateX(-50%);display:flex;gap:4px;z-index:9}
.le-hotbar::after{content:attr(data-name);position:absolute;left:0;right:0;top:-20px;text-align:center;color:#ECEAE4;font-size:12px;font-weight:700;text-shadow:0 1px 3px rgba(0,0,0,.8);pointer-events:none}
.le-ui:has(.le-lap) .le-hotbar,.le-ui:has(.le-pause) .le-hotbar{display:none}
.le-slot2{position:relative;width:52px;height:52px;background:rgba(22,23,26,.72);border:2px solid #44474D;display:flex;align-items:center;justify-content:center;cursor:pointer;touch-action:none}
.le-slot2 svg{width:36px;height:36px;pointer-events:none}.le-slot2 kbd{position:absolute;left:3px;top:1px;font:700 10px var(--f-body,system-ui);color:#8A8E96}.le-slot2 b{position:absolute;right:3px;bottom:1px;font-size:11px;color:#fff}
.le-slot2.le-on{border-color:#ED6A5E;background:rgba(40,30,29,.85)}.le-slot2.le-hot{border-color:#C6C5B9;background:rgba(98,146,158,.35)}.le-slot2.le-from{opacity:.35}
.le-inv{position:absolute;inset:0;background:rgba(10,11,13,.5);display:flex;align-items:center;justify-content:center;z-index:8}
.le-ibox{background:#1B1C1F;border:1px solid #44474D;padding:14px 16px;margin-bottom:90px}.le-ibox h3{margin:0 0 10px}.le-igrid{display:grid;grid-template-columns:repeat(9,52px);gap:4px}.le-ibox p{margin:10px 0 0}
.le-ighost{position:fixed;width:44px;height:44px;z-index:9999;pointer-events:none}.le-ighost svg{width:44px;height:44px;filter:drop-shadow(0 4px 6px rgba(0,0,0,.5))}
.le-music{position:absolute;left:50%;top:50%;transform:translate(-50%,-55%);z-index:8}.le-mbox2{width:min(420px,90vw);background:#1B1C1F;border:1px solid #ED6A5E;padding:16px}.le-mbox2 h3{margin:0 0 6px}.le-now{color:#C6C5B9;font-weight:700;margin:0 0 10px}
.le-cds{display:flex;flex-direction:column;gap:6px}.le-cd{display:grid;grid-template-columns:36px 1fr auto;gap:10px;align-items:center;background:#26302F;padding:6px}.le-cd svg{width:36px;height:36px}.le-cd small{display:block;color:#A9ACB2}
.le-plotb[aria-pressed=true]{background:#62929E!important;border-color:#62929E!important;color:#141518!important}.le-cats .le-plotb{grid-column:1/3}
.le-plotp{padding:10px!important;gap:8px!important}.le-plotp p{margin:0;color:#C6C5B9;font-size:12px;line-height:1.45}
/* v0.15: Stufen statt Jahrgänge, Vokabeltest Englisch */
.le-kl{min-width:112px;text-align:center}.le-kl1{background:#62929E}.le-kl2{background:#C6C5B9}.le-kl3{background:#ED6A5E}.le-kl0{background:#4A6D7C;color:#ECEAE4}
.le-vset{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(250px,1fr);gap:18px;align-items:start}.le-vset h4:first-child{margin-top:0}
.le-vkat{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:5px}
.le-vkat button{display:flex;flex-direction:column;align-items:flex-start;gap:2px;text-align:left;padding:7px 10px!important}.le-vkat button small{color:#A9ACB2;font-size:11px;font-weight:600}
.le-vkat button[aria-pressed=true]{background:#ED6A5E!important;border-color:#ED6A5E!important;color:#141518!important}.le-vkat button[aria-pressed=true] small{color:#3A2523}
.le-vside{background:#33403F;border:1px solid #4A5A5B;padding:12px 14px}
.le-vlab{display:flex;justify-content:space-between;font-weight:700;font-size:12px;color:#8A8E96;margin-top:2px}.le-vlab .le-vsel{color:#fff}
#le-vlinfo{margin:8px 0 0;line-height:1.5}#le-vlinfo em{font-style:normal;font-weight:700}
.le-vgo{font-size:16px!important;padding:8px 20px!important}
.le-vlist{display:flex;flex-direction:column;gap:6px;max-width:880px;margin:4px auto 0}
.le-vrow{display:grid;grid-template-columns:24px minmax(130px,1fr) minmax(180px,1.4fr) 46px 64px;gap:6px 10px;align-items:center;background:#33403F;border:1px solid #4A5A5B;border-left:4px solid #4A5A5B;padding:8px 10px;transition:border-color .2s}
.le-vnr{color:#8A8E96;font-weight:800}
.le-vq b{display:block;font:800 20px var(--f-display,system-ui,sans-serif);color:#fff;overflow-wrap:anywhere}.le-vq small{color:#A9ACB2;font-size:11px;font-weight:700;letter-spacing:.04em}
.le-root .le-vrow input{width:100%;font:700 18px var(--f-body,system-ui,sans-serif);padding:8px 10px;background:#1B1C1F;border:2px solid #62929E;outline:0}.le-root .le-vrow input:focus{border-color:#ED6A5E}
.le-vok{align-self:stretch;font-size:18px!important;font-weight:800}
.le-vpt{text-align:right}.le-vp{font:800 22px var(--f-display,system-ui,sans-serif);color:#fff;white-space:nowrap}.le-vp i{font-style:normal;color:#ED6A5E;font-size:15px}
.le-vsol{grid-column:2/-1;display:none;font-size:13px;color:#C6C5B9}.le-vdone .le-vsol{display:block}.le-vsol b{color:#fff}
.le-vtypo{font-style:normal;color:#ED6A5E;font-weight:700;margin-left:6px}
.le-vrow.le-vg{border-left-color:#7FC8D4}.le-vrow.le-vh{border-left-color:#C6C5B9}.le-vrow.le-vb{border-left-color:#ED6A5E}
.le-root .le-vg input{border-color:#7FC8D4;color:#7FC8D4}.le-root .le-vh input{border-color:#C6C5B9;color:#C6C5B9}.le-root .le-vb input{border-color:#ED6A5E;color:#ED6A5E}
.le-vg .le-vp{color:#7FC8D4}.le-vb .le-vp{color:#ED6A5E}
.le-vhint{text-align:center;margin-top:10px}.le-vendb{justify-content:center}
#le-vsum{color:#fff;display:inline-block}.le-done .le-dim b,#le-vtiers b{color:#fff}
.le-vresl{display:flex;flex-direction:column;gap:4px;max-width:780px;margin:14px auto 0;text-align:left}
.le-vres{display:grid;grid-template-columns:1fr 1fr 1.5fr 60px;gap:10px;align-items:center;background:#33403F;border-left:4px solid #4A5A5B;padding:6px 10px;font-size:13px;color:#C6C5B9}
.le-vres>b{color:#fff;font-size:15px}.le-vres em{font-style:normal;color:#8A8E96}.le-vres .le-vp{font-size:17px;text-align:right}
.le-vres.le-vg{border-left-color:#7FC8D4}.le-vres.le-vh{border-left-color:#C6C5B9}.le-vres.le-vb{border-left-color:#ED6A5E}
@media (max-width:820px){.le-vset{grid-template-columns:1fr}.le-vrow{grid-template-columns:22px 1fr 46px 54px}.le-vrow input{grid-column:2/3;grid-row:2}.le-vrow .le-vq{grid-column:2/-1}.le-vrow .le-vok{grid-row:2;grid-column:3}.le-vrow .le-vpt{grid-row:2;grid-column:4}.le-vres{grid-template-columns:1fr 1fr 56px}.le-vres>span:nth-of-type(2){grid-column:1/3}}
/* v0.21: Outfit am Kleiderschrank */.le-outfit{left:auto;right:4vw;transform:translate(0,-50%)}.le-outfit .le-mbox2{width:min(470px,92vw);max-height:82vh;overflow-y:auto}.le-orow{display:grid;grid-template-columns:104px 1fr;gap:8px;align-items:center;margin:7px 0}.le-orow>span{font-size:13px;color:#C6C5B9;font-weight:700}.le-osw{display:flex;flex-wrap:wrap;gap:4px;align-items:center}.le-osw button{width:42px;height:42px;padding:4px;background:#26302F;border:1px solid #3A4746}.le-osw button svg{width:32px;height:32px;display:block}.le-osw button[aria-pressed=true]{outline:2px solid #ED6A5E;outline-offset:-1px;background:#33403F}.le-osw .le-ono{width:auto;padding:0 10px;font-size:12px}
/* v0.16: Möbel-Lager (Kleiderschrank, Regal, Kühlschrank) */
.le-sbox{display:grid;grid-template-columns:auto auto;gap:6px 22px;align-items:start}.le-sbox h3 small{font-weight:600;font-size:12px;margin-left:6px}
.le-shint{margin:-4px 0 8px!important}.le-sfoot{grid-column:1/-1}
.le-sgrid{display:grid;grid-template-columns:repeat(8,46px);gap:4px}.le-store .le-igrid{grid-template-columns:repeat(9,46px)}.le-store .le-ibox .le-slot2{width:46px;height:46px}.le-store .le-ibox .le-slot2 svg{width:32px;height:32px}
.le-sgrid .le-slot2{background:rgba(74,109,124,.22);border-color:#4A6D7C}
.le-slot2.le-nope{animation:le-nope .45s ease-out}@keyframes le-nope{0%,60%{border-color:#ED6A5E;background:rgba(237,106,94,.35)}100%{}}
@media (max-width:1000px){.le-sbox{grid-template-columns:auto}}
.le-ui:has(.le-inv) .le-prompt,.le-ui:has(.le-music) .le-prompt{display:none}
/* v0.17: Fokus-Leiste, Fokus im Laptop, Einkaufen */
.le-focus{position:absolute;left:16px;top:14px;display:grid;grid-template-columns:auto 170px auto;align-items:center;gap:9px;background:rgba(22,23,26,.72);border-left:4px solid #62929E;padding:7px 12px;pointer-events:none;z-index:11}
.le-focus span{font-weight:800;font-size:13px;color:#ECEAE4;letter-spacing:.04em}
.le-focus i{display:block;height:10px;background:#2A2C30;border:1px solid #44474D;overflow:hidden}.le-focus i b{display:block;height:100%;width:0;background:#62929E;transition:width .4s linear}
.le-focus em{font-style:normal;font-weight:800;font-size:12px;color:#C6C5B9;min-width:42px;font-variant-numeric:tabular-nums}
.le-focus.le-up i b{background:#7FC8D4}.le-focus.le-full{border-left-color:#ED6A5E}.le-focus.le-full i b{background:#ED6A5E;animation:le-fglow 1.6s ease-in-out infinite}.le-focus.le-full em{color:#ED6A5E}
@keyframes le-fglow{50%{filter:brightness(1.35)}}
.le-where{top:52px!important}
.le-lfok{display:flex;align-items:center;gap:6px;font-size:12px;font-weight:700;color:#C6C5B9;margin-right:6px}.le-lfok i{display:block;width:70px;height:8px;background:#2A2C30;border:1px solid #62929E;overflow:hidden}.le-lfok i b{display:block;height:100%;width:0;background:#62929E}
.le-lfok em{font-style:normal;color:#fff;font-variant-numeric:tabular-nums;min-width:44px}.le-lfok.le-up i b{background:#7FC8D4}.le-lfok.le-full i b{background:#ED6A5E}.le-lfok.le-full em{color:#ED6A5E}
.le-fboost{display:inline-block;margin:4px 0 0;padding:3px 10px;background:rgba(237,106,94,.16);border:1px solid #ED6A5E;color:#ED6A5E;font-weight:800}
.le-shop .le-cds{max-height:min(56vh,520px);overflow-y:auto;padding-right:4px}.le-shop .le-cd button{white-space:nowrap}.le-shop .le-cd small{max-width:220px}
/* v0.19.1: Periodensystem (Chemie) */
.le-phint{margin:-4px 0 8px}
.le-pse{position:relative}
.le-ptab{display:grid;grid-template-columns:repeat(18,minmax(26px,1fr));grid-template-rows:repeat(7,minmax(34px,auto)) 8px repeat(2,minmax(34px,auto));gap:2px}
.le-root .le-pe{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:1px 0!important;min-width:0;background:var(--c)!important;border:1px solid rgba(0,0,0,.25)!important;color:#fff!important;cursor:pointer;transition:transform .12s,opacity .2s;line-height:1}
.le-pe small{font-size:9px;font-weight:700;opacity:.8}.le-pe b{font-size:14px;font-weight:800}
.le-root .le-pe:hover{transform:scale(1.35);z-index:3;outline:2px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,.5)}.le-root .le-pe.le-on{outline:3px solid #ED6A5E;z-index:2}
.le-pe.le-pdim{opacity:.38}.le-pe.le-pdim:hover{opacity:1}
.le-pph{display:flex;align-items:center;justify-content:center;background:var(--c);opacity:.55;font-size:9px;font-weight:800;color:#fff}
.le-plab{display:flex;align-items:center;justify-content:flex-end;padding-right:6px;font-size:11px;font-weight:700;color:#A9ACB2}
.le-pinfo{display:none;position:absolute;z-index:5;width:310px;background:#2E3A39;border:1px solid #62929E;box-shadow:0 10px 28px rgba(0,0,0,.55);padding:12px}.le-pinfo.le-pvis{display:block}.le-pinfo.le-popen{animation:le-popen .2s ease-out}
.le-root .le-px{position:absolute;right:6px;top:6px;padding:0 8px!important;font-size:18px!important;line-height:26px}
@keyframes le-popen{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:none}}
.le-pcard{display:flex;gap:12px;align-items:center;margin-bottom:8px;padding-right:22px}.le-pcard h3{margin:0;font-size:20px}.le-pcard p{margin:2px 0 0}
.le-ptile{display:flex;flex-direction:column;align-items:center;justify-content:center;width:74px;height:74px;flex:none;background:var(--c);color:#fff;border:1px solid rgba(0,0,0,.3)}
.le-ptile small{font-size:12px;font-weight:700;align-self:flex-start;margin-left:6px;opacity:.85}.le-ptile b{font-size:30px;font-weight:800;line-height:1}.le-ptile i{font-style:normal;font-size:11px;opacity:.85}
.le-prad{font-style:normal;color:#ED6A5E;font-weight:700}
.le-prows>div{display:flex;justify-content:space-between;gap:10px;padding:4px 0;border-bottom:1px solid #44514F;font-size:13px}.le-prows span{color:#A9ACB2}.le-prows b{text-align:right}.le-prows b small{display:block;font-weight:500}
.le-pbohr{display:flex;gap:10px;align-items:center;margin-top:8px}.le-pbohr p{margin:0;font-size:13px;line-height:1.45;color:#C6C5B9}.le-pbohr svg{flex:none}
.le-plg{margin:8px 0}
.le-pctl{display:grid;grid-template-columns:minmax(220px,1fr) minmax(0,1.4fr);gap:18px;align-items:start;margin-top:6px}
.le-pq{max-width:560px;margin:0 auto;text-align:center}.le-pq .le-btns{justify-content:center}.le-pq h3{margin:14px 0 12px;font-size:20px}
.le-ptile.le-pbig{width:130px;height:130px;margin:6px auto 0}.le-ptile.le-pbig b{font-size:60px}
.le-pin{display:flex;gap:8px;justify-content:center}.le-root .le-pin input{flex:1;max-width:340px;font:700 20px var(--f-body,system-ui,sans-serif);padding:9px 12px;background:#1B1C1F;border:2px solid #62929E;outline:0}.le-root .le-pin input:focus{border-color:#ED6A5E}
.le-pfb{margin:14px auto 4px;padding:10px 12px;border-left:4px solid #4A5A5B;background:#33403F;display:flex;flex-direction:column;gap:4px;text-align:left}
.le-pfb.le-vg{border-left-color:#7FC8D4}.le-pfb.le-vg>b{color:#7FC8D4}.le-pfb.le-vh{border-left-color:#C6C5B9}.le-pfb.le-vb{border-left-color:#ED6A5E}.le-pfb.le-vb>b{color:#ED6A5E}
.le-dots i.le-half{background:#C6C5B9}
.le-pmini{display:inline-flex;align-items:center;justify-content:center;width:34px;height:28px;background:var(--c);color:#fff;font-weight:800}
@media (max-width:980px){.le-pctl{grid-template-columns:1fr}}
/* v0.19.2: Schalenmodelle bauen (Chemie) */
.le-sset{display:grid;grid-template-columns:220px minmax(0,1fr);gap:18px;align-items:start}.le-slist{margin:4px 0 12px;padding-left:18px;line-height:1.7}
.le-sbuild{position:relative;display:flex;gap:12px;align-items:flex-start}.le-sbig{flex-direction:column;align-items:stretch}.le-sbig .le-swork{width:100%}/* v0.21: großes Periodensystem im Steckbrief */.le-bigpse h4{margin:14px 0 6px}.le-bscroll{overflow-x:auto;padding-bottom:4px}.le-bpt{display:grid;grid-template-columns:20px repeat(18,minmax(50px,1fr));grid-template-rows:auto repeat(7,60px) 10px repeat(2,60px);gap:2px;min-width:960px}.le-bpe{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding:2px 2px 3px;background:var(--c);color:#fff;border:1px solid rgba(0,0,0,.25);line-height:1.1;overflow:hidden;user-select:none}.le-bpe small{position:absolute;left:3px;top:2px;font-size:11px;font-weight:700}.le-bpe b{font-size:19px;font-weight:800}.le-bpe span{font-size:8.5px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;opacity:.95}.le-bpe i{font-style:normal;font-size:9.5px;opacity:.9}.le-bph2{justify-content:center;font-size:11px;font-weight:700}.le-bgh{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;font-size:11px;color:#A9ACB2;padding-bottom:2px}.le-bgh b{color:#E8E6DF;font-size:12px}.le-bph{display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#E8E6DF}.le-blab{display:flex;align-items:center;justify-content:flex-end;padding-right:6px;font-size:11px;color:#A9ACB2}.le-swork{flex:1;min-width:0}.le-swork h3{margin:2px 0 8px}
.le-sarea{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;align-items:start}
.le-ssvg{background:#2A3534;border:1px solid #44514F;display:flex;justify-content:center;padding:6px}
.le-shit{stroke:transparent;cursor:pointer;pointer-events:stroke}.le-shit:hover{stroke:rgba(237,106,94,.18)}
.le-sctl h4{margin:4px 0 4px}.le-srow{display:grid;grid-template-columns:1fr 30px 38px 30px;align-items:center;gap:4px;margin-bottom:4px;font-size:13px}
.le-srow b{text-align:center;font-size:16px}.le-root .le-srow button{padding:2px 0!important;font-size:16px!important;font-weight:800}.le-shelp{font-size:12px;margin:8px 0 4px}
.le-spse{flex:none;width:44px;align-self:stretch}.le-spse.le-sopen{position:absolute;right:0;top:0;z-index:6;width:min(390px,70%);max-height:100%;overflow:auto;background:#2E3A39;border:1px solid #62929E;box-shadow:-10px 0 26px rgba(0,0,0,.5);padding:8px;animation:le-sdraw .2s ease-out}
@keyframes le-sdraw{from{opacity:0;transform:translateX(30px)}to{opacity:1;transform:none}}
.le-root .le-stab{writing-mode:vertical-rl;height:100%;min-height:200px;width:40px;padding:10px 0!important;font-weight:800}
.le-shead{display:flex;justify-content:space-between;align-items:center;gap:6px;margin-bottom:4px}.le-root .le-shead button{padding:2px 9px!important}
.le-smini{grid-template-columns:repeat(18,minmax(0,1fr));grid-template-rows:repeat(7,24px) 4px repeat(2,24px);gap:1px}
.le-smini .le-pe small{display:none}.le-smini .le-pe b{font-size:10px}.le-root .le-smini .le-pe:hover{transform:scale(1.6)}
.le-sfact{font-size:13px;margin-top:8px;line-height:1.45}
.le-sfb{display:grid;grid-template-columns:minmax(0,1fr) 170px;gap:14px;margin-top:10px;background:#33403F;padding:10px;border:1px solid #44514F}
.le-sfl>div{display:grid;grid-template-columns:20px minmax(0,1fr) auto;gap:8px;align-items:center;padding:3px 0;font-size:13px}.le-sfl b{white-space:nowrap}.le-sfl i{font-style:normal;font-weight:800}
.le-sfl .le-vg i{color:#7FC8D4}.le-sfl .le-vb i,.le-sfl .le-vb small{color:#ED6A5E}.le-sgot{margin:6px 0 0;font-weight:800}.le-scmp{text-align:center}.le-scmp small{color:#A9ACB2;font-weight:700}
.le-sdone{display:grid;grid-template-columns:40px 1fr auto 50px;gap:10px;align-items:center;background:#33403F;border-left:4px solid #4A5A5B;padding:6px 10px}
.le-sdone.le-vg{border-left-color:#7FC8D4}.le-sdone.le-vh{border-left-color:#C6C5B9}.le-sdone.le-vb{border-left-color:#ED6A5E}.le-sdone b{color:#fff}
.le-sicons{display:flex;gap:4px}.le-sicons i{font-style:normal;font-weight:800;width:20px;text-align:center}.le-sicons .le-ok{color:#7FC8D4}.le-sicons .le-no{color:#ED6A5E}.le-sdone .le-vp{text-align:right}
@media (max-width:700px){.le-sfb{grid-template-columns:1fr}}
.le-srow.le-slock b{color:#A9ACB2}.le-srow.le-slock button{opacity:.35}
.le-subj button{position:relative}.le-subj button .le-bban em{display:none}.le-subj button .le-bban{position:absolute;top:0;right:0;margin:0!important;padding:2px 7px!important;align-self:auto;display:flex;justify-content:space-between;gap:6px;margin-top:7px;padding:3px 6px;background:#ED6A5E;color:#1B1C1F;font-size:11px;font-weight:800}
.le-subj button .le-bban{flex-wrap:wrap}.le-bban b,.le-bban em{white-space:nowrap}.le-bban b{font-size:11px!important}.le-bban em{font-style:normal;font-variant-numeric:tabular-nums}
.le-bbar{display:flex;flex-wrap:wrap;justify-content:space-between;gap:4px 12px;margin:0 0 10px;padding:7px 10px;background:#ED6A5E;color:#1B1C1F;font-size:13px}
.le-bbar em{font-style:normal;font-weight:800;font-variant-numeric:tabular-nums}
.le-ebon{color:#ED6A5E!important}
.le-tset{max-width:640px}
.le-tgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:8px}
.le-tf{display:flex;flex-direction:column;gap:3px;background:#33403F;border:1px solid #44514F;padding:7px 8px}
.le-tf label{font-size:12px;font-weight:700;color:#C6C5B9}
.le-tf input{width:100%;box-sizing:border-box;font-size:17px;font-weight:800;padding:4px 6px}
.le-tf.le-vg{border-color:#62929E}.le-tf.le-vb{border-color:#ED6A5E}
.le-tfr{min-height:14px;font-size:12px;font-weight:800}.le-tf.le-vg .le-tfr{color:#7FC8D4}.le-tf.le-vb .le-tfr{color:#ED6A5E}
.le-thg{display:grid;grid-template-columns:repeat(4,1fr);gap:3px}
.le-thg button{padding:3px 0!important;font-size:12px!important;font-weight:800}
.le-thg button.le-vsel{background:#62929E;border-color:#62929E;color:#1B1C1F}
.le-tdone{max-width:460px;margin:10px auto;text-align:left}
.le-kmaps{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px;margin-bottom:10px}
.le-kmaps button{display:flex;flex-direction:column;align-items:flex-start;gap:2px;text-align:left;padding:8px 10px}
.le-kmaps button small{color:#A9ACB2;font-weight:600}
.le-kmaps button.le-vsel{border-color:#ED6A5E;background:#3A4746}
.le-khint{margin:2px 0 6px}
.le-kq{display:flex;flex-direction:column;height:100%;min-height:340px}
.le-kq .le-lhead h2{margin-bottom:0}
.le-kwrap{position:relative;flex:1;min-height:240px;background:#26302F;border:1px solid #44514F;user-select:none}
.le-ksvg{position:absolute;inset:0;display:block;width:100%;height:100%}
.le-ksvg path{fill:#3E4C4B;stroke:#62929E;stroke-width:.7px;vector-effect:non-scaling-stroke;stroke-linejoin:round}
.le-ksvg path:not([data-ld]){fill:#323C3C}
.le-ksvg path.le-kt{fill:#ED6A5E;cursor:pointer;animation:le-kpulse 1.1s ease-in-out infinite}
.le-ksvg path.le-kcur{fill:#C6C5B9}
.le-ksvg path.le-kok{fill:#62929E}.le-ksvg path.le-khalf{fill:#8E8C6E}.le-ksvg path.le-kno{fill:#7E3F38}
@keyframes le-kpulse{0%,100%{fill:#ED6A5E}50%{fill:#6B3732}}
.le-kr{fill:none;stroke:#ED6A5E;stroke-width:2px;vector-effect:non-scaling-stroke;transform-box:fill-box;transform-origin:center}
.le-krp{animation:le-kring 1.1s ease-in-out infinite}
@keyframes le-kring{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.6);opacity:.45}}
.le-khit{fill:transparent;cursor:pointer}
.le-kpop{position:absolute;z-index:5;width:250px;background:#2E3A39;border:1px solid #ED6A5E;box-shadow:0 8px 24px rgba(0,0,0,.5)}
.le-kdrag{display:flex;align-items:center;gap:6px;padding:5px 6px 5px 8px;background:#475657;font-size:12px;font-weight:800;cursor:move;touch-action:none}
.le-kdrag span{color:#A9ACB2}.le-kdrag button{margin-left:auto;padding:0 6px!important;font-size:14px!important}
.le-kin{display:flex;gap:4px;padding:8px}
.le-kin input{flex:1;min-width:0;font-size:15px;font-weight:700;padding:5px 7px}
.le-kin input.le-half{border-color:#C6C5B9;color:#C6C5B9}
#le-kfb{padding:0 8px}#le-kfb p{margin:0 0 6px;font-weight:700;font-size:13px}#le-kfb .le-btns{margin:0 0 8px}
.le-khalft{color:#C6C5B9}
.le-kdone{max-width:520px}
.le-lbody{position:relative}
.le-pinfo.le-win{z-index:8}
.le-wbar{display:flex;align-items:center;gap:6px;margin:-12px -12px 10px;padding:4px 5px 4px 9px;background:#475657;font-size:12px;font-weight:800;color:#ECEAE4;cursor:move;touch-action:none;user-select:none}
.le-wbar>span{color:#A9ACB2}.le-wbar button{padding:1px 8px!important;font-size:12px!important}.le-wbar button:last-child{margin-left:auto;font-size:15px!important}
.le-wbar button+button{margin-left:auto}
#le-sfloat{width:300px}
#le-sfloat .le-pcard{padding-right:0}
.le-hunger{position:absolute;left:16px;top:52px;display:grid;grid-template-columns:auto 170px auto;align-items:center;gap:9px;background:rgba(22,23,26,.72);border-left:4px solid #E8C66A;padding:7px 12px;pointer-events:none;z-index:11}
.le-hunger span{font-weight:800;font-size:13px;color:#ECEAE4;letter-spacing:.04em;min-width:42px}
.le-hunger i{display:block;height:10px;background:#2A2C30;border:1px solid #44474D;overflow:hidden}.le-hunger i b{display:block;height:100%;width:0;background:#E8C66A;transition:width .4s linear}
.le-hunger em{font-style:normal;font-weight:800;font-size:12px;color:#C6C5B9;min-width:42px;font-variant-numeric:tabular-nums}
.le-hunger.le-low{border-left-color:#ED6A5E}.le-hunger.le-low i b{background:#ED6A5E;animation:le-fglow 1.2s ease-in-out infinite}.le-hunger.le-low em{color:#ED6A5E}
.le-hud .le-where{top:90px!important}
.le-dimhud .le-hunger{opacity:.9}
.le-faint{position:absolute;inset:0;background:#000;opacity:0;transition:opacity 1.2s ease;z-index:30;display:flex;align-items:center;justify-content:center;pointer-events:none}
.le-faint.le-on{opacity:1;pointer-events:auto}.le-faint p{color:#C6C5B9;font-size:18px;font-weight:700}
.le-makler button[disabled]{opacity:.45;cursor:default}
.le-loadmap{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#111214;color:#C6C5B9;font-size:15px;z-index:40}
`;

let A = null;
export function mount(host, lang, stamp) {
  if (A) unmount();
  PR.lang = lang === "en" ? "en" : "de"; PR.stamp = stamp || "";
  if (!document.getElementById("le-css")) { const s = document.createElement("style"); s.id = "le-css"; s.textContent = CSS; document.head.appendChild(s); }
  host.innerHTML = "";
  const root = el("div", "le-root"); host.appendChild(root);
  const engine = new Engine(root), ui = el("div", "le-ui"); root.appendChild(ui);
  const settings = Object.assign({ shadows: true, scale: 1, drive: "rwd", grass: 200 }, store.get(KEYS.settings, {}));
  engine.quality({ shadows: settings.shadows, scale: settings.scale });
  const world = new World(engine);
  // gespeicherte Szene, wenn sie zur aktuellen Standardkarte gehört; sonst Standardkarte laden (seit v0.20 aus leaarn/maps/hub.txt)
  const cur = savedIsCurrent(), ok = cur && world.fromJSON(cur);
  const app = A = { engine: engine, world: world, ui: ui, root: root, input: new Input(), settings: settings, lang: PR.lang, mode: null, modeName: "", raf: 0, last: performance.now() };
  world.veg.setDist(settings.grass);   // Gras-Sichtweite (seit v0.19)
  app.go = (name, opts) => {
    if (app.mode) app.mode.dispose();
    app.modeName = name; ui.setAttribute("data-mode", name);
    app.mode = name === "editor" ? new Editor(app) : name === "drive" ? new Drive(app, opts) : name === "play" ? new Play(app, opts) : name === "house" ? new HouseEditor(app) : name === "char" ? new CharEditor(app, opts) : new Menu(app);
  };
  app.toast = (msg) => { const tEl = el("div", "le-toast", ""); tEl.textContent = msg; ui.appendChild(tEl); setTimeout(() => tEl.remove(), 2600); };
  app.onKey = (e) => { if (app.mode && app.mode.key && app.mode.key(e)) e.preventDefault(); else if (app.modeName === "drive" && /^(Space|ArrowUp|ArrowDown|ArrowLeft|ArrowRight)$/.test(e.code)) e.preventDefault(); };
  app.onResize = () => engine.resize();
  window.addEventListener("keydown", app.onKey); window.addEventListener("resize", app.onResize);
  const loop = (now) => {
    app.raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - app.last) / 1000); app.last = now;
    world.update(dt); if (app.mode) app.mode.update(dt); app.wind.update(); engine.render();
  };
  app.wind = new WindIcon(app);
  const start = () => { world.veg.setDist(settings.grass); app.go(charakter() ? "menu" : "char", { first: true }); };   // erster Start: Charakter-Editor
  if (ok) { start(); app.ready = Promise.resolve(); }
  else {
    const wait = el("div", "le-loadmap", "<b>" + (PR.lang === "en" ? "Loading map…" : "Karte wird geladen …") + "</b>"); ui.appendChild(wait);
    app.ready = loadStandard(world, stamp).then((good) => { if (A !== app) return; if (!good) world.standard(); autosave(world, true); wait.remove(); start(); });
  }
  app.raf = requestAnimationFrame(loop);
  window.LEDBG = app;
}
export function unmount() {
  if (!A) return;
  cancelAnimationFrame(A.raf); window.removeEventListener("keydown", A.onKey); window.removeEventListener("resize", A.onResize);
  if (A.modeName === "editor") autosave(A.world, true);
  if (A.mode) A.mode.dispose(); A.wind.dispose(); A.input.dispose(); A.engine.dispose(); A.root.remove(); A = null; window.LEDBG = null;
}
