// ===== menu.js · Hauptmenü: Spielen, Map-Editor, Haus-Editor (beide mit Code), Einstellungen =====
import * as THREE from "three";
import { t, addTexts, L2, el, esc, store, KEYS, DEV_CODE, PR } from "le/core.js";
import { geld, euro, offen, charakter, reset } from "le/save.js";

addTexts({
  mPlay: L2("Spielen", "Play"), mMap: L2("Map-Editor", "Map editor"), mHouse: L2("Haus-Editor", "House editor"),
  mChar: L2("Charakter", "Character"), mReset: L2("Spielstand zurücksetzen", "Reset progress"),
  mSure: L2("Bist du dir sicher? Dein gesamter Spielfortschritt geht verloren.", "Are you sure? All your progress will be lost."),
  mSureSub: L2("Geld, Lernstatistik und Charakter werden gelöscht. Maps und Häuser aus den Editoren bleiben erhalten.", "Money, learning stats and character are deleted. Maps and houses from the editors are kept."),
  mYes: L2("Ja, zurücksetzen", "Yes, reset"), mNo: L2("Abbrechen", "Cancel"), mHi: L2("Hallo {n}!", "Hi {n}!"),
  mPend: L2("warten im Laptop aufs Einsammeln", "waiting in the laptop to be collected"), mSet: L2("Einstellungen", "Settings"), mBack: L2("Zurück zu Color Space", "Back to Color Space"), mAcc: L2("Kontostand", "Balance"),
  mCode: L2("Code für die Editoren", "Code for the editors"), mWrong: L2("Falscher Code", "Wrong code"), mOk: L2("Öffnen", "Open"),
  sShadow: L2("Schatten", "Shadows"), sScale: L2("Auflösung", "Resolution"), sOn: L2("An", "On"), sOff: L2("Aus", "Off"),
  mSub: L2("Lernen. Geld verdienen. Dein Zuhause ausbauen.", "Learn. Earn money. Build up your home."),
  mFoot: L2("Version {v} · Hub mit Zuhause, Lernmodus am Schreibtisch (Mathe: kleines 1×1, Kunst: Farbenlehre und Color Guesser), Map- und Haus-Editor", "Version {v} · hub with home, learning mode at the desk (maths: times tables, art: colour theory and Color Guesser), map and house editor")
});

export class Menu {
  constructor(app) {
    this.app = app; this.a = 0;
    const s = app.settings;
    const seg = (k, opts) => '<div class="le-seg">' + opts.map((o) => '<button data-set="' + k + '" data-v="' + o[0] + '" aria-pressed="' + (String(s[k]) === String(o[0])) + '">' + t(o[1]) + "</button>").join("") + "</div>";
    this.root = el("div", "le-menu",
      '<div class="le-mbox"><h1>LEA<span>ARN</span></h1><p class="le-msub">' + t("mSub") + '</p>' +
      '<div class="le-macc"><span>' + t("mAcc") + "</span><b>" + euro(geld()) + "</b></div>" +
      '<button class="le-mb le-pri" data-m="play">' + t("mPlay") + (charakter() ? " <small>" + esc(t("mHi").replace("{n}", charakter().name)) + "</small>" : "") + "</button>" +
      '<button class="le-mb" data-m="char">' + t("mChar") + "</button>" +
      '<button class="le-mb" data-m="map">' + t("mMap") + "</button>" +
      '<button class="le-mb" data-m="house">' + t("mHouse") + "</button>" +
      '<div class="le-code" id="le-code" hidden><label>' + t("mCode") + '</label><div><input type="password" inputmode="numeric" id="le-codein" autocomplete="off"><button data-m="code">' + t("mOk") + '</button></div><span id="le-codemsg"></span></div>' +
      '<details class="le-set"><summary>' + t("mSet") + "</summary>" +
      '<label>' + t("sShadow") + "</label>" + seg("shadows", [[true, "sOn"], [false, "sOff"]]) +
      '<label>' + t("sScale") + "</label>" + seg("scale", [[0.6, "60 %"], [0.8, "80 %"], [1, "100 %"]]) +
      "</details>" +
      '<a class="le-mlink" href="#">← ' + t("mBack") + "</a></div>" +
      '<button class="le-reset" data-m="reset">' + t("mReset") + "</button>" +
      '<div class="le-mfoot"><span>' + t("mFoot").replace("{v}", PR.VERSION) + "</span></div>");
    app.ui.appendChild(this.root);
    this.root.addEventListener("click", (e) => this.click(e));
    this.root.querySelector("#le-codein").addEventListener("keydown", (e) => { if (e.key === "Enter") this.tryCode(); });
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
    if (m === "play") this.app.go(charakter() ? "play" : "char", { first: true });
    else if (m === "char") this.app.go("char");
    else if (m === "reset") this.askReset();
    else if (m === "resetyes") { reset(); this.app.go("char", { first: true }); }
    else if (m === "resetno") { const d = this.root.querySelector(".le-dlg"); if (d) d.remove(); }
    else if (m === "map" || m === "house") { this.want = m === "map" ? "editor" : "house"; if (store.raw(KEYS.dev) === DEV_CODE) this.app.go(this.want); else { const c = this.root.querySelector("#le-code"); c.hidden = false; c.querySelector("input").focus(); } }
    else if (m === "code") this.tryCode();
  }
  // Spielstand löschen: eigene Nachfrage (kein Browser-Dialog)
  askReset() {
    if (this.root.querySelector(".le-dlg")) return;
    this.root.appendChild(el("div", "le-dlg", '<div><h3>' + t("mSure") + "</h3><p>" + t("mSureSub") + '</p><div class="le-btns"><button class="le-danger" data-m="resetyes">' + t("mYes") + '</button><button data-m="resetno">' + t("mNo") + "</button></div></div>"));
  }
  tryCode() {
    const v = this.root.querySelector("#le-codein").value.trim();
    if (v === DEV_CODE) { store.setRaw(KEYS.dev, DEV_CODE); this.app.go(this.want || "editor"); }
    else this.root.querySelector("#le-codemsg").textContent = t("mWrong");
  }
  key() { return false; }
  update(dt) {
    // Kamera kreist langsam um das Zuhause
    this.a += dt * 0.07;
    const h = this.app.world.home(), cx = h ? h.e.x : 0, cz = h ? h.e.z : 0, cy = h ? h.e.y : 0;
    const cam = this.app.engine.camera, x = cx + Math.cos(this.a) * 22, z = cz + Math.sin(this.a) * 22;
    cam.position.set(x, Math.max(this.app.world.terrain.heightAt(x, z) + 4, cy + 9), z); cam.lookAt(cx, cy + 1.5, cz);
    if (cam.fov !== 55) { cam.fov = 55; cam.updateProjectionMatrix(); }
    this.app.engine.focus(new THREE.Vector3(cx, cy, cz));
  }
  dispose() { this.root.remove(); }
}
