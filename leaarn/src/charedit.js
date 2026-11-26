// ===== charedit.js · Charakter-Editor (seit v0.13): Name, Alter, Farben von Oberteil, Hose, Schuhen und Haaren =====
// Startet automatisch beim ersten Spielstart (kein Charakter im Spielstand), später über das Hauptmenü.
import * as THREE from "three";
import { t, addTexts, L2, el, esc, clamp } from "le/core.js";
import { figure, LOOK } from "le/player.js";
import { charakter, setCharakter } from "le/save.js";

addTexts({
  cTitle: L2("Dein Charakter", "Your character"), cFirst: L2("Willkommen bei Leaarn! Bevor es losgeht: Wie siehst du aus?", "Welcome to Leaarn! Before you start: what do you look like?"),
  cName: L2("Name", "Name"), cAge: L2("Alter", "Age"), cTop: L2("Oberteil", "Top"), cPants: L2("Hose", "Trousers"), cShoes: L2("Schuhe", "Shoes"), cHair: L2("Haare", "Hair"),
  cGo: L2("Los geht's", "Let's go"), cSave: L2("Speichern", "Save"), cCancel: L2("Abbrechen", "Cancel"), cNeed: L2("Gib deinem Charakter einen Namen.", "Give your character a name."),
  cOwn: L2("eigene Farbe", "custom colour"), cTurn: L2("Ziehen dreht die Figur", "Drag to turn the figure")
});
// Farbvorschläge (Palette von Color Space + Alltagsfarben)
const SW = {
  top: ["#62929E", "#4A6D7C", "#ED6A5E", "#C6C5B9", "#475657", "#E8A04A", "#7FA36E", "#9A8FA8", "#F2F0EA", "#2B2E30"],
  pants: ["#4A6D7C", "#2E4A66", "#475657", "#2B2E30", "#8E918F", "#C6C5B9", "#6B5440", "#7FA36E"],
  shoes: ["#2B2E30", "#F2F0EA", "#ED6A5E", "#62929E", "#8A6142", "#C6C5B9", "#475657"],
  hair: ["#2A1F18", "#3A2A20", "#6B4A2E", "#A0703E", "#D9B36A", "#B4583F", "#8E918F", "#F2F0EA", "#475657", "#62929E"]
};

export class CharEditor {
  constructor(app, opts) {
    this.app = app; this.first = !!(opts && opts.first);
    const c = charakter() || {};
    this.c = { name: c.name || "", alter: c.alter || 12, top: c.top || LOOK.top, pants: c.pants || LOOK.pants, shoes: c.shoes || LOOK.shoes, hair: c.hair || LOOK.hair, outfit: c.outfit || null };   // Outfit (seit v0.21) bleibt erhalten
    this.yaw = 0.5; this.drag = null;
    // Bühne: Figur vor dem Zuhause (bzw. in der Kartenmitte)
    const h = app.world.home(); this.at = new THREE.Vector3(h ? h.e.x : 0, 0, h ? h.e.z : 0);
    if (h) { const d = h.b.doors[0]; if (d) { const w = h.toWorld(d.cx + d.nx * 2.2, d.cz + d.nz * 2.2), n = h.dirToWorld(d.nx, d.nz); this.at.set(w.x, 0, w.z); this.out = n; } }
    if (!this.out) this.out = { x: 0, z: 1 };
    this.at.y = app.world.ground(this.at.x, this.at.z, {}).h; this.yaw = Math.atan2(this.out.x, this.out.z) - 0.35;
    this.build();
    const row = (k, lab) => '<div class="le-crow"><span>' + lab + '</span><div class="le-csw">' + SW[k].map((col) => '<button data-c="' + k + '" data-v="' + col + '" style="background:' + col + '" aria-label="' + col + '"></button>').join("") +
      '<label class="le-cown" title="' + t("cOwn") + '"><input type="color" data-own="' + k + '" value="' + this.c[k] + '">+</label></div></div>';
    this.root = el("div", "le-char", '<div class="le-cbox2"><h2>' + t("cTitle") + "</h2>" + (this.first ? "<p>" + t("cFirst") + "</p>" : "") +
      '<div class="le-cfield"><label>' + t("cName") + '<input type="text" id="le-cname" maxlength="16" autocomplete="off" value="' + esc(this.c.name) + '"></label>' +
      '<label class="le-cage">' + t("cAge") + '<input type="number" id="le-cage" min="8" max="99" step="1" value="' + this.c.alter + '"></label></div>' +
      row("top", t("cTop")) + row("pants", t("cPants")) + row("shoes", t("cShoes")) + row("hair", t("cHair")) +
      '<p class="le-cmsg" id="le-cmsg"></p><div class="le-btns"><button class="le-pri le-mb" data-cd="ok">' + t(this.first ? "cGo" : "cSave") + "</button>" + (this.first ? "" : '<button data-cd="cancel">' + t("cCancel") + "</button>") + "</div></div>" +
      '<div class="le-chint2">' + t("cTurn") + "</div>");
    app.ui.appendChild(this.root); this.mark();
    this.root.addEventListener("click", (e) => this.click(e));
    this.root.addEventListener("input", (e) => {
      const o = e.target.getAttribute("data-own"); if (o) { this.c[o] = e.target.value; this.build(); this.mark(); }
      if (e.target.id === "le-cname") { this.c.name = e.target.value; this.root.querySelector("#le-cmsg").textContent = ""; }
      if (e.target.id === "le-cage") this.c.alter = e.target.value;
    });
    const cv = app.engine.renderer.domElement;
    this.onDown = (e) => { this.drag = e.clientX; }; this.onMove = (e) => { if (this.drag == null) return; this.yaw += (e.clientX - this.drag) * 0.012; this.drag = e.clientX; }; this.onUp = () => { this.drag = null; };
    cv.addEventListener("pointerdown", this.onDown); window.addEventListener("pointermove", this.onMove); window.addEventListener("pointerup", this.onUp);
    if (this.first) setTimeout(() => { const i = this.root.querySelector("#le-cname"); if (i) i.focus(); }, 50);
  }
  build() {
    if (this.fig) { this.fig.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); this.fig.group.removeFromParent(); }
    this.fig = figure(this.c); this.fig.group.position.copy(this.at); this.app.engine.scene.add(this.fig.group);
  }
  mark() { this.root.querySelectorAll("[data-c]").forEach((b) => b.setAttribute("aria-pressed", String(b.getAttribute("data-v").toLowerCase() === String(this.c[b.getAttribute("data-c")]).toLowerCase()))); this.root.querySelectorAll("[data-own]").forEach((i) => { i.value = this.c[i.getAttribute("data-own")]; }); }
  click(e) {
    const b = e.target.closest("[data-c]"); if (b) { this.c[b.getAttribute("data-c")] = b.getAttribute("data-v"); this.build(); this.mark(); return; }
    const d = e.target.closest("[data-cd]"); if (!d) return;
    if (d.getAttribute("data-cd") === "cancel") { this.app.go("menu"); return; }
    const name = this.c.name.trim(); if (!name) { this.root.querySelector("#le-cmsg").textContent = t("cNeed"); this.root.querySelector("#le-cname").focus(); return; }
    setCharakter({ name: name, alter: clamp(Math.round(+this.c.alter) || 12, 8, 99), top: this.c.top, pants: this.c.pants, shoes: this.c.shoes, hair: this.c.hair, outfit: this.c.outfit || undefined });
    this.app.go(this.first ? "play" : "menu");
  }
  key(e) { if (e.code === "Enter" && e.target.id === "le-cname") { this.click({ target: this.root.querySelector('[data-cd="ok"]') }); return true; } return false; }
  update(dt) {
    if (this.drag == null) this.yaw += dt * 0.35;
    const f = this.fig; f.group.rotation.y = this.yaw;
    // leichtes Atmen / Arme
    const s = Math.sin(performance.now() / 700) * 0.04; f.armL.rotation.z = -0.08 - s; f.armR.rotation.z = 0.08 + s;
    const cam = this.app.engine.camera, o = this.out, side = { x: -o.z, z: o.x };
    cam.position.set(this.at.x + o.x * 4.2 - side.x * 1.1, this.at.y + 1.7, this.at.z + o.z * 4.2 - side.z * 1.1);
    cam.lookAt(this.at.x - side.x * 0.9, this.at.y + 1.05, this.at.z - side.z * 0.9);
    if (cam.fov !== 45) { cam.fov = 45; cam.updateProjectionMatrix(); }
    this.app.engine.focus(this.at);
  }
  dispose() {
    const cv = this.app.engine.renderer.domElement;
    cv.removeEventListener("pointerdown", this.onDown); window.removeEventListener("pointermove", this.onMove); window.removeEventListener("pointerup", this.onUp);
    this.fig.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); this.fig.group.removeFromParent(); this.root.remove();
  }
}
