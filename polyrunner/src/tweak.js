// ===== tweak.js · Tweaker im Testlauf (seit v0.18): Bewegung, Größe und Animation live einstellen, Presets, Export für Claude =====
// Die Bewegung (move.js) rechnet intern in 1,8-m-Einheiten. Die Figur ist size groß (Standard 1,40 m) → Maßstab k = size / 1,8.
// Längen, Tempi und Beschleunigungen werden im Tweaker in echten Metern angezeigt (intern × k), alles andere unverändert.
// Gespeichert (roh, intern) unter KEYS.tune; Presets unter KEYS.tunePre. Export: polyrunner-tune (echte Werte + roh).
import { t, addTexts, L2, el, esc, store, KEYS, download, PRU } from "pru/core.js";
import { TUNE, TUNE_DEF } from "pru/move.js";
import { ANIM, ANIM_DEF } from "pru/runner.js";

export const SIZE_DEF = 1.4;
export const TW = { size: SIZE_DEF };
// [Gruppe, Schlüssel, Quelle (T = Bewegung, A = Animation, S = Größe), Einheit, min, max, Schritt, Name DE, Name EN, Erklärung DE, Erklärung EN]
// Einheiten: m, m/s, m/s² (werden mit k umgerechnet), s, x (Faktor), "" (Zahl)
const P = [
  ["size", "size", "S", "m", 1.1, 1.95, 0.01, "Körpergröße", "Body height", "Skaliert Figur, Skelett und alle Bewegungen gemeinsam.", "Scales the character, skeleton and all movement together."],
  ["run", "run", "T", "m/s", 2, 14, 0.05, "Lauftempo", "Run speed", "Höchsttempo beim normalen Laufen.", "Top speed when running normally."],
  ["run", "push", "T", "", 1, 20, 0.1, "Antritt", "Acceleration", "Wie schnell er auf Tempo kommt (lässt mit dem Tempo nach).", "How quickly he gets up to speed (fades with speed)."],
  ["run", "friction", "T", "", 1, 25, 0.1, "Auslaufen", "Coast-down", "Wie schnell er ohne Eingabe stehen bleibt.", "How quickly he stops without input."],
  ["run", "brake", "T", "", 1, 30, 0.1, "Bremsen", "Braking", "Abbremsen bei Gegenrichtung.", "Braking when pressing the opposite direction."],
  ["run", "bleed", "T", "", 0, 20, 0.1, "Tempoverlust in Kurven", "Speed loss in turns", "Wie viel Tempo enge Kurven kosten.", "How much speed tight turns cost."],
  ["run", "gripLow", "T", "", 2, 40, 0.1, "Grip langsam", "Grip slow", "Wendigkeit bei geringem Tempo.", "Agility at low speed."],
  ["run", "gripMin", "T", "", 1, 30, 0.1, "Grip schnell", "Grip fast", "Wendigkeit bei hohem Tempo (Mindestwert).", "Agility at high speed (minimum)."],
  ["run", "gripLoss", "T", "", 0, 3, 0.01, "Grip-Abnahme", "Grip falloff", "Wie stark der Grip mit dem Tempo sinkt.", "How strongly grip drops with speed."],
  ["run", "side", "T", "x", 0.3, 1, 0.01, "Seitwärts-Tempo", "Sideways speed", "Anteil des Tempos beim Seitwärtslaufen.", "Share of speed when strafing."],
  ["run", "crouch", "T", "m/s", 0.5, 6, 0.05, "Ducken-Tempo", "Crouch speed", "Tempo geduckt.", "Speed while crouching."],
  ["sprint", "sprint", "T", "m/s", 4, 18, 0.05, "Sprinttempo", "Sprint speed", "Höchsttempo mit Shift.", "Top speed with Shift."],
  ["sprint", "sprintCone", "T", "", 0.2, 1.6, 0.01, "Sprint-Kegel", "Sprint cone", "Wie weit die Laufrichtung vom Blick abweichen darf, um zu sprinten.", "How far the run direction may differ from the view to sprint."],
  ["jump", "jump", "T", "m/s", 2, 12, 0.05, "Sprungkraft", "Jump power", "Absprung-Tempo nach oben (Sprunghöhe ≈ Tempo² / 2·Schwerkraft).", "Take-off speed upwards (height ≈ speed² / 2·gravity)."],
  ["jump", "gravity", "T", "m/s²", 8, 40, 0.1, "Schwerkraft", "Gravity", "Wie schnell er fällt. Höher = schwerer, knackigere Sprünge.", "How fast he falls. Higher = heavier, snappier jumps."],
  ["jump", "air", "T", "m/s", 2, 20, 0.1, "Luftkontrolle", "Air control", "Wie stark man in der Luft lenken kann.", "How much you can steer in the air."],
  ["jump", "coyote", "T", "s", 0, 0.4, 0.005, "Kantenspielraum", "Coyote time", "Nach dem Verlassen einer Kante darf man noch so lange springen.", "After leaving an edge you may still jump for this long."],
  ["jump", "buffer", "T", "s", 0, 0.4, 0.005, "Sprungpuffer", "Jump buffer", "Zu früh gedrückte Sprünge werden so lange gemerkt.", "Jumps pressed too early are remembered this long."],
  ["slide", "slideMin", "T", "m/s", 1, 12, 0.05, "Slide ab Tempo", "Slide from speed", "Mindesttempo für den Hüft-Slide.", "Minimum speed for the hip slide."],
  ["slide", "slideBoost", "T", "m/s", 0, 5, 0.05, "Slide-Schub", "Slide boost", "Tempo-Schub beim Ansetzen.", "Speed boost when starting."],
  ["slide", "slideFric", "T", "", 0.2, 10, 0.05, "Slide-Reibung", "Slide friction", "Wie schnell der Slide ausläuft.", "How quickly the slide slows down."],
  ["slide", "slideMax", "T", "s", 0.3, 3, 0.05, "Slide-Dauer", "Slide duration", "Längste Dauer.", "Longest duration."],
  ["wall", "wallMin", "T", "m/s", 1, 10, 0.05, "Wallrun ab Tempo", "Wallrun from speed", "Mindesttempo für den Wallrun.", "Minimum speed for wallrunning."],
  ["wall", "wallTime", "T", "s", 0.3, 3, 0.05, "Wallrun-Dauer", "Wallrun duration", "Wie lange er an der Wand laufen kann.", "How long he can run along a wall."],
  ["wall", "wallGrav", "T", "x", 0, 1, 0.01, "Wallrun-Schwerkraft", "Wallrun gravity", "Anteil der Schwerkraft beim Wallrun (0 = hält die Höhe).", "Share of gravity while wallrunning (0 = keeps height)."],
  ["wall", "wallKick", "T", "m/s", 1, 12, 0.05, "Absprung von der Wand", "Wall kick-off", "Seitlicher Schwung beim Abspringen vom Wallrun.", "Sideways push when jumping off a wallrun."],
  ["wall", "wallUp", "T", "m/s", 1, 12, 0.05, "Wallrun-Sprung hoch", "Wallrun jump up", "Tempo nach oben beim Absprung vom Wallrun.", "Upward speed when jumping off a wallrun."],
  ["wall", "kick", "T", "m/s", 1, 12, 0.05, "Wandsprung", "Wall jump", "Schwung beim Wandsprung (frontal).", "Push of the wall jump (head-on)."],
  ["wall", "wallStep1", "T", "m/s", 0, 12, 0.05, "Wand hoch: 1 Schritt ab", "Wall climb: 1 step from", "Ab diesem Anlauf ein Schritt die Wand hoch.", "From this run-up speed one step up the wall."],
  ["wall", "wallStep2", "T", "m/s", 0, 14, 0.05, "Wand hoch: 2 Schritte ab", "Wall climb: 2 steps from", "Ab diesem Anlauf zwei Schritte.", "From this run-up speed two steps."],
  ["wall", "wallStepV", "T", "m/s", 1, 10, 0.05, "Schub je Wandschritt", "Push per wall step", "Grund-Schub nach oben je Schritt.", "Base upward push per step."],
  ["wall", "wallStepK", "T", "x", 0, 1, 0.01, "Schub aus Anlauf", "Push from run-up", "Zusätzlicher Schub je m/s Anlauf.", "Extra push per m/s of run-up."],
  ["wall", "wallStepT", "T", "s", 0.1, 0.6, 0.01, "Dauer je Wandschritt", "Time per wall step", "Takt der Schritte an der Wand.", "Rhythm of the steps on the wall."],
  ["ledge", "step", "T", "m", 0.1, 0.9, 0.01, "Stufenhöhe", "Step height", "So hohe Stufen nimmt er im Lauf.", "Steps up to this height are taken in stride."],
  ["ledge", "vaultHands", "T", "m", 0.6, 2, 0.01, "Überklettern bis", "Vault up to", "Kanten bis zu dieser Höhe überklettert er mit den Händen, darüber hängt er.", "Edges up to this height are vaulted with the hands, above that he hangs."],
  ["ledge", "reach", "T", "m", 1.5, 3.5, 0.01, "Greifhöhe", "Reach", "Höchste Kante, die er im Sprung noch greift.", "Highest edge he can still grab in a jump."],
  ["ledge", "hangDrop", "T", "m", 1, 2.4, 0.01, "Hängetiefe", "Hang depth", "Wie tief der Körper beim Hängen unter der Kante hängt.", "How far the body hangs below the edge."],
  ["ledge", "shimmy", "T", "m/s", 0.3, 3, 0.05, "Hangeln", "Shimmy speed", "Tempo beim seitlichen Hangeln.", "Speed when shimmying sideways."],
  ["fall", "safe", "T", "m", 1, 10, 0.05, "Fall ohne Folgen bis", "Safe fall up to", "Bis zu dieser Höhe passiert nichts.", "Nothing happens up to this height."],
  ["fall", "stumble", "T", "m", 2, 14, 0.05, "Stolpern bis", "Stumble up to", "Bis hier nur Stolpern ohne Abrollen, darüber Beinbruch.", "Up to here only stumbling without a roll, above that broken legs."],
  ["fall", "deadly", "T", "m", 4, 30, 0.1, "Tödlich ab", "Deadly from", "Ab hier hilft auch Abrollen nicht mehr.", "From here even rolling doesn't help."],
  ["fall", "rollWin", "T", "s", 0.05, 1, 0.01, "Abroll-Fenster", "Roll window", "Wie früh vor der Landung Leertaste zählt.", "How early before landing Space counts."],
  ["fall", "lateRoll", "T", "s", 0, 0.5, 0.01, "Abrollen verspätet", "Late roll", "Wie spät nach der Landung Leertaste noch zählt.", "How late after landing Space still counts."],
  ["anim", "stride", "A", "x", 0.6, 1.6, 0.01, "Schrittlänge", "Stride length", "Längere Schritte bei gleichem Tempo (dafür langsamerer Takt).", "Longer strides at the same speed (slower cadence)."],
  ["anim", "lift", "A", "x", 0, 2.5, 0.01, "Fuß anheben", "Foot lift", "Wie hoch der Schwungfuß kommt.", "How high the swinging foot comes up."],
  ["anim", "bob", "A", "x", 0, 3, 0.01, "Auf und Ab", "Bounce", "Hüpfen des Körpers bei jedem Schritt.", "Up-and-down bounce of the body with each step."],
  ["anim", "lean", "A", "x", 0, 3, 0.01, "Vorneigung", "Forward lean", "Neigung beim Laufen und Beschleunigen.", "Lean when running and accelerating."],
  ["anim", "roll", "A", "x", 0, 2.5, 0.01, "Kurvenlage", "Banking", "Seitliche Neigung in Kurven.", "Sideways lean in turns."],
  ["anim", "arms", "A", "x", 0, 2.5, 0.01, "Armschwung", "Arm swing", "Wie weit die Arme schwingen.", "How far the arms swing."],
  ["anim", "elbow", "A", "x", 0, 2, 0.01, "Ellbogen beugen", "Elbow bend", "Wie stark die Arme angewinkelt sind.", "How bent the arms are."],
  ["anim", "sway", "A", "x", 0, 3, 0.01, "Hüftschwung", "Hip sway", "Seitliches Mitschwingen von Becken und Oberkörper.", "Sideways sway of pelvis and upper body."],
  ["anim", "twist", "A", "x", 0, 2, 0.01, "Oberkörper zum Blick", "Torso to view", "Wie stark sich der Oberkörper zur Blickrichtung dreht.", "How much the upper body turns towards the view."],
  ["anim", "spring", "A", "x", 0.3, 2, 0.01, "Gelenk-Tempo", "Joint speed", "Wie schnell die Gelenke ihrer Pose folgen (höher = zackiger).", "How fast the joints follow their pose (higher = snappier)."],
  ["anim", "damp", "A", "x", 0.3, 1.5, 0.01, "Gelenk-Dämpfung", "Joint damping", "Weniger = mehr Nachschwingen, mehr = ruhiger.", "Less = more overshoot, more = calmer."]
];
const GROUPS = ["size", "run", "sprint", "jump", "slide", "wall", "ledge", "fall", "anim"];
addTexts({
  twTitle: L2("Tweaker", "Tweaker"), twHint: L2("T: schließen · Werte wirken sofort · Klick ins Bild: weiterspielen", "T: close · values apply instantly · click the view: keep playing"),
  g_size: L2("Größe", "Size"), g_run: L2("Laufen", "Running"), g_sprint: L2("Sprint", "Sprint"), g_jump: L2("Sprung", "Jump"), g_slide: L2("Slide", "Slide"), g_wall: L2("Wand", "Walls"), g_ledge: L2("Kanten", "Ledges"), g_fall: L2("Fallen", "Falling"), g_anim: L2("Animation", "Animation"),
  twSlow: L2("Zeitlupe", "Slow motion"), twFig: L2("Figur", "Character"), twDummy: L2("Test-Dummy", "Test dummy"), twChar: L2("Charakter", "Character"),
  twReset: L2("Alles auf Standard", "Everything to default"), twResetQ: L2("Alle Werte auf Standard zurücksetzen?", "Reset all values to default?"), twDef: L2("Standard", "Default"),
  twPresets: L2("Presets", "Presets"), twSave: L2("Speichern als …", "Save as …"), twSaveQ: L2("Name für das Preset:", "Name for the preset:"), twDel: L2("löschen", "delete"),
  twExport: L2("Exportieren", "Export"), twImport: L2("Importieren …", "Import …"), twBad: L2("Das ist keine PolyRunner-Einstellung.", "This is not a PolyRunner setting."),
  twExpNote: L2("Exportierte Einstellungen (.json) schickst du an Claude, dann werden sie der Standard im Spiel.", "Send exported settings (.json) to Claude, then they become the game's default."),
  twMeas: L2("Messung", "Measurements"), twSpeed: L2("Tempo", "Speed"), twJump: L2("Letzter Sprung", "Last jump"), twFall: L2("Letzter Fall", "Last fall"), twHigh: L2("hoch", "high"), twFar: L2("weit", "far"),
  twChanged: L2("{n} Werte geändert", "{n} values changed")
});

export function kOf() { return TW.size / 1.8; }
const sc = (u) => u === "m" || u === "m/s" || u === "m/s²";
function srcObj(s) { return s === "T" ? TUNE : s === "A" ? ANIM : TW; }
function defOf(p) { return p[2] === "T" ? TUNE_DEF[p[1]] : p[2] === "A" ? ANIM_DEF[p[1]] : SIZE_DEF; }
// angezeigter Wert (echte Einheiten) ↔ intern
function shown(p) { const v = srcObj(p[2])[p[1]]; return p[2] === "T" && sc(p[3]) ? v * kOf() : v; }
function setShown(p, v) { srcObj(p[2])[p[1]] = p[2] === "T" && sc(p[3]) ? v / kOf() : v; }
export function loadTune() {
  const o = store.get(KEYS.tune, null);
  Object.assign(TUNE, TUNE_DEF); Object.assign(ANIM, ANIM_DEF); TW.size = SIZE_DEF;
  if (o) { if (o.T) Object.keys(o.T).forEach((k) => { if (k in TUNE && isFinite(o.T[k])) TUNE[k] = o.T[k]; }); if (o.A) Object.keys(o.A).forEach((k) => { if (k in ANIM && isFinite(o.A[k])) ANIM[k] = o.A[k]; }); if (isFinite(o.size)) TW.size = o.size; }
}
function saveTune() { store.set(KEYS.tune, { size: TW.size, T: Object.assign({}, TUNE), A: Object.assign({}, ANIM) }); }
function snapshot(name) {
  const real = {}; P.forEach((p) => { real[p[1]] = Math.round(shown(p) * 10000) / 10000; });
  return { format: "polyrunner-tune", v: 1, name: name || "", size: TW.size, werte: real, raw: { T: Object.assign({}, TUNE), A: Object.assign({}, ANIM) } };
}
function applySnap(o) { if (!o || o.format !== "polyrunner-tune") return false; if (isFinite(o.size)) TW.size = o.size; const r = o.raw || {}; if (r.T) Object.keys(r.T).forEach((k) => { if (k in TUNE) TUNE[k] = r.T[k]; }); if (r.A) Object.keys(r.A).forEach((k) => { if (k in ANIM) ANIM[k] = r.A[k]; }); saveTune(); return true; }
const fmt = (p, v) => { const d = p[6] >= 1 ? 0 : p[6] >= 0.1 ? 1 : p[6] >= 0.01 ? 2 : 3; return (p[3] === "x" ? "×" : "") + v.toFixed(d).replace(".", ",") + (p[3] && p[3] !== "x" ? " " + p[3] : ""); };

const CSS = `
.pru-tw{position:absolute;right:14px;top:14px;bottom:14px;width:330px;display:flex;flex-direction:column;background:rgba(20,21,24,.94);border:1px solid #3A3D42;backdrop-filter:blur(8px);z-index:8}
.pru-tw[hidden]{display:none}
.pru-tw header{padding:10px 12px;border-bottom:1px solid #3A3D42;display:flex;flex-direction:column;gap:7px}.pru-tw header b{font:800 15px var(--f-display,system-ui,sans-serif)}.pru-tw header small{color:#8A8E96}
.pru-tw .pru-twb{flex:1;overflow:auto;padding:6px 12px 14px}
.pru-tw details{border-bottom:1px solid #2E3035;padding:6px 0}.pru-tw summary{cursor:pointer;font-weight:700;padding:3px 0;list-style:none}.pru-tw summary::before{content:"+ ";color:#E2621B}.pru-tw details[open] summary::before{content:"− "}
.pru-twp{margin:8px 0 2px}.pru-twp label{display:flex;justify-content:space-between;align-items:center;gap:6px;color:#C6C5B9;font-weight:600}.pru-twp label em{color:#ECEAE4;font-variant-numeric:tabular-nums}.pru-twp label em.pru-ch{color:#E2621B}
.pru-twp p{margin:0 0 2px;color:#8A8E96;font-size:11px;line-height:1.35}.pru-twp .pru-twd{padding:1px 6px!important;font-size:10.5px!important;margin-left:auto}
.pru-twrow{display:flex;gap:4px;flex-wrap:wrap}.pru-twrow button{flex:1}
.pru-twm{font-variant-numeric:tabular-nums;color:#ECEAE4;line-height:1.5}.pru-twm span{color:#8A8E96}
.pru-twpre{display:flex;flex-direction:column;gap:3px;margin-top:6px}.pru-twpre div{display:flex;gap:3px}.pru-twpre div button:first-child{flex:1;text-align:left}
.pru-meas{position:absolute;left:14px;bottom:14px;background:rgba(20,21,24,.75);padding:6px 10px;font-variant-numeric:tabular-nums;color:#ECEAE4;font-size:12px;line-height:1.45;pointer-events:none!important}.pru-meas span{color:#A9ACB2}
`;
export class Tweak {
  constructor(play) {
    this.play = play; this.open = false; this.slow = 1;
    if (!document.getElementById("pru-css-tw")) { const s = document.createElement("style"); s.id = "pru-css-tw"; s.textContent = CSS; document.head.appendChild(s); }
    this.root = el("div", "pru-tw"); this.root.hidden = true; play.ui.appendChild(this.root);
    this.meas = el("div", "pru-meas"); play.ui.appendChild(this.meas);
    this.render();
    this.root.addEventListener("input", (e) => {
      const i = e.target; if (!i.dataset.tw) return; const p = P.find((x) => x[1] === i.dataset.tw); setShown(p, +i.value); saveTune(); this.out(p);
      if (p[1] === "size") { this.play.rescale(); this.render(); }
    });
    this.root.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return; const a = b.dataset.twa;
      if (b.dataset.twd) { const p = P.find((x) => x[1] === b.dataset.twd); srcObj(p[2])[p[1]] = defOf(p); saveTune(); if (p[1] === "size") this.play.rescale(); this.render(); }
      else if (b.dataset.slow) { this.slow = +b.dataset.slow; this.render(); }
      else if (b.dataset.fig) { this.play.setFigure(b.dataset.fig); this.render(); }
      else if (a === "reset") { if (confirm(t("twResetQ"))) { Object.assign(TUNE, TUNE_DEF); Object.assign(ANIM, ANIM_DEF); TW.size = SIZE_DEF; saveTune(); this.play.rescale(); this.render(); } }
      else if (a === "save") { const n = prompt(t("twSaveQ"), ""); if (n) { const L = store.get(KEYS.tunePre, []); L.push(snapshot(n)); store.set(KEYS.tunePre, L); this.render(); } }
      else if (a === "load") { const L = store.get(KEYS.tunePre, []); if (applySnap(L[+b.dataset.i])) { this.play.rescale(); this.render(); } }
      else if (a === "delpre") { const L = store.get(KEYS.tunePre, []); L.splice(+b.dataset.i, 1); store.set(KEYS.tunePre, L); this.render(); }
      else if (a === "export") download("PolyRunner_Einstellungen.json", JSON.stringify(snapshot("export"), null, 1));
      else if (a === "import") this.root.querySelector("#pru-twf").click();
    });
    this.root.addEventListener("change", (e) => {
      if (e.target.id !== "pru-twf") return; const f = e.target.files[0]; if (!f) return;
      f.text().then((s) => { let o = null; try { o = JSON.parse(s); } catch (x) {} if (applySnap(o)) { this.play.rescale(); this.render(); } else this.play.app.toast(t("twBad")); }); e.target.value = "";
    });
    this.root.addEventListener("toggle", (e) => { if (e.target.tagName === "DETAILS") { this.openG = this.openG || {}; this.openG[e.target.dataset.g] = e.target.open; } }, true);
  }
  render() {
    const L = PRU.lang, changed = P.filter((p) => Math.abs(srcObj(p[2])[p[1]] - defOf(p)) > 1e-9).length, pre = store.get(KEYS.tunePre, []), og = this.openG || { size: true, run: true };
    let h = "<header><b>" + t("twTitle") + "</b><small>" + t("twHint") + "</small>" +
      '<div class="pru-twrow"><span style="color:#A9ACB2;font-weight:700;align-self:center">' + t("twFig") + '</span><button data-fig="dummy" aria-pressed="' + (this.play.figMode !== "char") + '">' + t("twDummy") + '</button><button data-fig="char" aria-pressed="' + (this.play.figMode === "char") + '">' + t("twChar") + "</button></div>" +
      '<div class="pru-twrow"><span style="color:#A9ACB2;font-weight:700;align-self:center">' + t("twSlow") + "</span>" + [[1, "1×"], [0.5, "½×"], [0.25, "¼×"], [0.1, "⅒×"]].map(([v, l]) => '<button data-slow="' + v + '" aria-pressed="' + (this.slow === v) + '">' + l + "</button>").join("") + "</div></header>" +
      '<div class="pru-twb">';
    GROUPS.forEach((g) => {
      h += '<details data-g="' + g + '"' + (og[g] ? " open" : "") + "><summary>" + t("g_" + g) + "</summary>";
      P.filter((p) => p[0] === g).forEach((p) => {
        const v = shown(p), d = defOf(p) * (p[2] === "T" && sc(p[3]) ? kOf() : 1), ch = Math.abs(srcObj(p[2])[p[1]] - defOf(p)) > 1e-9;
        const mn = p[2] === "T" && sc(p[3]) ? p[4] * kOf() : p[4], mx = p[2] === "T" && sc(p[3]) ? p[5] * kOf() : p[5];
        h += '<div class="pru-twp"><label>' + esc(L === "en" ? p[8] : p[7]) + '<button class="pru-twd" data-twd="' + p[1] + '" title="' + t("twDef") + ": " + fmt(p, d) + '"' + (ch ? "" : " disabled") + '>↺</button><em data-two="' + p[1] + '"' + (ch ? ' class="pru-ch"' : "") + ">" + fmt(p, v) + "</em></label>" +
          '<input type="range" data-tw="' + p[1] + '" min="' + mn + '" max="' + mx + '" step="' + p[6] + '" value="' + v + '"><p>' + esc(L === "en" ? p[10] : p[9]) + "</p></div>";
      });
      h += "</details>";
    });
    h += '<details data-g="pre"' + (og.pre ? " open" : "") + "><summary>" + t("twPresets") + "</summary>" + '<div class="pru-twpre">' + pre.map((x, i) => '<div><button data-twa="load" data-i="' + i + '">' + esc(x.name) + '</button><button data-twa="delpre" data-i="' + i + '">' + t("twDel") + "</button></div>").join("") +
      '<button data-twa="save">' + t("twSave") + "</button></div></details>" +
      '<p style="color:#8A8E96;margin:10px 0 6px">' + t("twChanged").replace("{n}", changed) + "</p>" +
      '<div class="pru-twrow"><button data-twa="export" class="pru-pri">' + t("twExport") + '</button><button data-twa="import">' + t("twImport") + '</button></div><div class="pru-twrow" style="margin-top:4px"><button data-twa="reset">' + t("twReset") + "</button></div>" +
      '<p style="color:#8A8E96;line-height:1.4">' + t("twExpNote") + '</p><input type="file" id="pru-twf" accept=".json,application/json" hidden></div>';
    this.root.innerHTML = h;
  }
  out(p) { const o = this.root.querySelector('[data-two="' + p[1] + '"]'); if (o) { o.textContent = fmt(p, shown(p)); o.classList.toggle("pru-ch", Math.abs(srcObj(p[2])[p[1]] - defOf(p)) > 1e-9); } const d = this.root.querySelector('[data-twd="' + p[1] + '"]'); if (d) d.disabled = !o.classList.contains("pru-ch"); }
  toggle(on) { this.open = on == null ? !this.open : on; this.root.hidden = !this.open; if (this.open) this.render(); }
  // Messanzeige (echte Meter)
  measure(m) {
    const f = (v) => (v == null ? "–" : v.toFixed(2).replace(".", ","));
    this.meas.innerHTML = "<span>" + t("twSpeed") + "</span> " + f(m.speed) + " m/s · <span>" + t("twJump") + "</span> " + f(m.jh) + " m " + t("twHigh") + ", " + f(m.jw) + " m " + t("twFar") + " · <span>" + t("twFall") + "</span> " + f(m.fall) + " m";
  }
  dispose() { this.root.remove(); this.meas.remove(); }
}
