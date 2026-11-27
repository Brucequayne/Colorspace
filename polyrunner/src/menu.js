// ===== menu.js · Hauptmenü: Spielen (noch gesperrt), Map Editor (Code), Einstellungen =====
import * as THREE from "three";
import { t, addTexts, L2, el, store, KEYS, DEV_CODE, PRU } from "pru/core.js";

addTexts({
  mPlay: L2("Spielen", "Play"), mSoon: L2("kommt bald", "coming soon"), mEditor: L2("Map Editor", "Map editor"), mSet: L2("Einstellungen", "Settings"),
  mBack: L2("Zurück zu Color Space", "Back to Color Space"), mCode: L2("Zugangscode", "Access code"), mWrong: L2("Falscher Code", "Wrong code"), mOk: L2("Öffnen", "Open"),
  sShadow: L2("Schatten", "Shadows"), sScale: L2("Auflösung", "Resolution"), sSens: L2("Mausempfindlichkeit", "Mouse sensitivity"), sInv: L2("Maus Y umkehren", "Invert mouse Y"),
  sFov: L2("Sichtfeld", "Field of view"), sDist: L2("Kamera-Abstand", "Camera distance"), sOn: L2("An", "On"), sOff: L2("Aus", "Off"),
  mFoot: L2("Version {v} · Map Editor und erster Testlauf mit dem Platzhalter-Runner", "Version {v} · map editor and a first test run with the placeholder runner")
});

export class Menu {
  constructor(app) {
    this.app = app; this.a = 0.6;
    const s = app.settings;
    const seg = (k, opts) => '<div class="pru-seg">' + opts.map((o) => '<button data-set="' + k + '" data-v="' + o[0] + '" aria-pressed="' + (String(s[k]) === String(o[0])) + '">' + t(o[1]) + "</button>").join("") + "</div>";
    const rng = (k, min, max, step, lab, unit) => '<label>' + t(lab) + ' <em data-out="' + k + '">' + s[k] + (unit || "") + '</em></label><input type="range" data-rng="' + k + '" data-unit="' + (unit || "") + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + s[k] + '">';
    this.root = el("div", "pru-menu",
      '<div class="pru-mbox"><h1>POLY<span>RUNNER</span></h1>' +
      '<button class="pru-mb" disabled>' + t("mPlay") + " <small>" + t("mSoon") + "</small></button>" +
      '<button class="pru-mb pru-pri" data-m="editor">' + t("mEditor") + "</button>" +
      '<div class="pru-code" id="pru-code" hidden><label>' + t("mCode") + '</label><div><input type="password" inputmode="numeric" id="pru-codein" autocomplete="off"><button data-m="code">' + t("mOk") + '</button></div><span id="pru-codemsg"></span></div>' +
      '<details class="pru-set"><summary>' + t("mSet") + "</summary>" +
        "<label>" + t("sShadow") + "</label>" + seg("shadows", [[true, "sOn"], [false, "sOff"]]) +
        "<label>" + t("sScale") + "</label>" + seg("scale", [[0.6, "60 %"], [0.8, "80 %"], [1, "100 %"]]) +
        rng("sens", 0.2, 3, 0.05, "sSens") + rng("fov", 60, 100, 1, "sFov", "°") + rng("camDist", 2.2, 6, 0.1, "sDist", " m") +
        "<label>" + t("sInv") + "</label>" + seg("invert", [[false, "sOff"], [true, "sOn"]]) +
      "</details>" +
      '<a class="pru-mlink" href="#">← ' + t("mBack") + "</a></div>" +
      '<div class="pru-mfoot">' + t("mFoot").replace("{v}", PRU.VERSION) + "</div>");
    app.ui.appendChild(this.root);
    this.root.addEventListener("click", (e) => this.click(e));
    this.root.addEventListener("input", (e) => {
      const r = e.target.closest("[data-rng]"); if (!r) return;
      const k = r.getAttribute("data-rng"); s[k] = +r.value; store.set(KEYS.settings, s);
      this.root.querySelector('[data-out="' + k + '"]').textContent = r.value + r.getAttribute("data-unit");
    });
    this.root.querySelector("#pru-codein").addEventListener("keydown", (e) => { if (e.key === "Enter") this.tryCode(); });
    app.world.setShowTest(false);
  }
  click(e) {
    const b = e.target.closest("[data-m],[data-set]"); if (!b) return;
    const s = this.app.settings;
    if (b.hasAttribute("data-set")) {
      const k = b.getAttribute("data-set"), raw = b.getAttribute("data-v"), v = raw === "true" ? true : raw === "false" ? false : isNaN(+raw) ? raw : +raw;
      s[k] = v; store.set(KEYS.settings, s); this.app.engine.quality({ shadows: s.shadows, scale: s.scale });
      b.parentNode.querySelectorAll("button").forEach((o) => o.setAttribute("aria-pressed", String(o === b))); return;
    }
    const m = b.getAttribute("data-m");
    if (m === "editor") { if (store.raw(KEYS.dev) === DEV_CODE) this.app.go("editor"); else { const c = this.root.querySelector("#pru-code"); c.hidden = false; c.querySelector("input").focus(); } }
    else if (m === "code") this.tryCode();
  }
  tryCode() {
    const v = this.root.querySelector("#pru-codein").value.trim();
    if (v === DEV_CODE) { store.setRaw(KEYS.dev, DEV_CODE); this.app.go("editor"); }
    else this.root.querySelector("#pru-codemsg").textContent = t("mWrong");
  }
  key() { return false; }
  update(dt) {
    // Kamera kreist langsam um die Map
    this.a += dt * 0.04;
    const cam = this.app.engine.camera, b = this.app.world.bounds(), r = Math.max(26, b.r * 1.5);
    cam.position.set(b.c.x + Math.cos(this.a) * r, Math.max(4.5, r * 0.3), b.c.z + Math.sin(this.a) * r); cam.lookAt(b.c.x, b.c.y * 0.6 + 1.5, b.c.z);
    if (cam.fov !== 50) { cam.fov = 50; cam.updateProjectionMatrix(); }
    this.app.engine.focus(new THREE.Vector3(b.c.x, 0, b.c.z));
    this.app.engine.tick(dt);
  }
  dispose() { this.root.remove(); this.app.world.setShowTest(true); }
}
