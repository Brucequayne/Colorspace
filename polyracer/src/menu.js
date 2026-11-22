// ===== menu.js · Hauptmenü (später: Werkstatt mit Statistiken, Tuning, Lackiererei, Rennauswahl) =====
import * as THREE from "three";
import { t, addTexts, L2, el, store, KEYS, DEV_CODE, PR } from "pr/core.js";

addTexts({
  mTest: L2("Testfahrt", "Test drive"), mDev: L2("Developer Tool", "Developer tool"), mShop: L2("Werkstatt", "Workshop"), mSoon: L2("kommt bald", "coming soon"),
  mSet: L2("Einstellungen", "Settings"), mBack: L2("Zurück zu Color Space", "Back to Color Space"),
  mCode: L2("Code für das Developer Tool", "Code for the developer tool"), mWrong: L2("Falscher Code", "Wrong code"), mOk: L2("Öffnen", "Open"),
  sShadow: L2("Schatten", "Shadows"), sScale: L2("Auflösung", "Resolution"), sDrive: L2("Antrieb des Testwagens", "Test car drivetrain"),
  sWind: L2("Wind als Linien zeigen", "Show wind as lines"), sOn: L2("An", "On"), sOff: L2("Aus", "Off"), dRwd: L2("Heck", "RWD"), dFwd: L2("Front", "FWD"), dAwd: L2("Allrad", "AWD"),
  mPad: L2("Controller erkannt", "Controller detected"),
  mFoot: L2("Version {v} · Grundgerüst: Developer Tool mit Gelände, Straße und Vegetation, Testfahrt mit Fahrphysik", "Version {v} · Foundation: developer tool with terrain, road and vegetation, test drive with driving physics")
});

export class Menu {
  constructor(app) {
    this.app = app; this.a = 0;
    const s = app.settings;
    const seg = (k, opts) => '<div class="pr-seg">' + opts.map((o) => '<button data-set="' + k + '" data-v="' + o[0] + '" aria-pressed="' + (String(s[k]) === String(o[0])) + '">' + t(o[1]) + "</button>").join("") + "</div>";
    this.root = el("div", "pr-menu",
      '<div class="pr-mbox"><h1>POLY<span>RACER</span></h1>' +
      '<button class="pr-mb pr-pri" data-m="drive">' + t("mTest") + "</button>" +
      '<button class="pr-mb" data-m="dev">' + t("mDev") + "</button>" +
      '<button class="pr-mb" disabled>' + t("mShop") + " <small>" + t("mSoon") + "</small></button>" +
      '<div class="pr-code" id="pr-code" hidden><label>' + t("mCode") + '</label><div><input type="password" inputmode="numeric" id="pr-codein" autocomplete="off"><button data-m="code">' + t("mOk") + '</button></div><span id="pr-codemsg"></span></div>' +
      '<details class="pr-set"><summary>' + t("mSet") + "</summary>" +
      '<label>' + t("sShadow") + "</label>" + seg("shadows", [[true, "sOn"], [false, "sOff"]]) +
      '<label>' + t("sScale") + "</label>" + seg("scale", [[0.6, "60 %"], [0.8, "80 %"], [1, "100 %"]]) +
      '<label>' + t("sDrive") + "</label>" + seg("drive", [["rwd", "dRwd"], ["fwd", "dFwd"], ["awd", "dAwd"]]) +
      '<label>' + t("sWind") + "</label>" + seg("windLines", [[true, "sOn"], [false, "sOff"]]) + "</details>" +
      '<a class="pr-mlink" href="#">← ' + t("mBack") + "</a></div>" +
      '<div class="pr-mfoot"><span id="pr-pad"></span><span>' + t("mFoot").replace("{v}", PR.VERSION) + "</span></div>");
    app.ui.appendChild(this.root);
    this.root.addEventListener("click", (e) => this.click(e));
    this.root.querySelector("#pr-codein").addEventListener("keydown", (e) => { if (e.key === "Enter") this.tryCode(); });
  }
  click(e) {
    const b = e.target.closest("[data-m],[data-set]"); if (!b) return;
    const s = this.app.settings;
    if (b.hasAttribute("data-set")) {
      const k = b.getAttribute("data-set"), raw = b.getAttribute("data-v"), v = raw === "true" ? true : raw === "false" ? false : isNaN(+raw) ? raw : +raw;
      s[k] = v; store.set(KEYS.settings, s); this.app.engine.quality({ shadows: s.shadows, scale: s.scale }); this.app.world.windFx.visible = s.windLines !== false;
      b.parentNode.querySelectorAll("button").forEach((o) => o.setAttribute("aria-pressed", String(o === b))); return;
    }
    const m = b.getAttribute("data-m");
    if (m === "drive") this.app.go("drive");
    else if (m === "dev") { if (store.raw(KEYS.dev) === DEV_CODE) this.app.go("editor"); else { const c = this.root.querySelector("#pr-code"); c.hidden = false; c.querySelector("input").focus(); } }
    else if (m === "code") this.tryCode();
  }
  tryCode() {
    const v = this.root.querySelector("#pr-codein").value.trim();
    if (v === DEV_CODE) { store.setRaw(KEYS.dev, DEV_CODE); this.app.go("editor"); }
    else this.root.querySelector("#pr-codemsg").textContent = t("mWrong");
  }
  key() { return false; }
  update(dt) {
    // Kamera kreist langsam über der Strecke
    this.a += dt * 0.05;
    const cam = this.app.engine.camera, T = this.app.world.terrain, x = Math.cos(this.a) * 330, z = Math.sin(this.a) * 330;
    cam.position.set(x, Math.max(T.heightAt(x, z) + 60, 95), z); cam.lookAt(0, 0, 0);
    if (cam.fov !== 55) { cam.fov = 55; cam.updateProjectionMatrix(); }
    this.app.engine.focus(new THREE.Vector3(x * 0.5, 0, z * 0.5));
    const p = this.app.input.poll(), pe = this.root.querySelector("#pr-pad"); if (pe) { const txt = p ? t("mPad") + ": " + p.id.slice(0, 40) : ""; if (pe.textContent !== txt) pe.textContent = txt; }
  }
  dispose() { this.root.remove(); }
}
