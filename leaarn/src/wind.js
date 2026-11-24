// ===== wind.js · Wind-Anzeige: Symbol oben rechts (seit v0.13 statt animierter Linien) =====
// Der Pfeil zeigt, wohin der Wind weht, gedreht zur aktuellen Blickrichtung der Kamera. Darunter die Windstärke.
import * as THREE from "three";
import { t, addTexts, L2, el, DEG } from "le/core.js";

addTexts({ wWind: L2("Wind", "Wind") });

export class WindIcon {
  constructor(app) {
    this.app = app;
    this.el = el("div", "le-wind", '<svg viewBox="0 0 40 40" width="40" height="40"><circle cx="20" cy="20" r="18" fill="none" stroke="rgba(198,197,185,.35)" stroke-width="1.5"/>' +
      '<g id="le-warr"><path d="M20 6 L27 17 L22 17 L22 33 L18 33 L18 17 L13 17 Z" fill="#C6C5B9"/></g></svg><span id="le-wtxt"></span>');
    app.ui.appendChild(this.el); this.v = new THREE.Vector3(); this.last = "";
  }
  update() {
    const m = this.app.modeName, on = m === "drive" || m === "editor"; this.el.style.display = on ? "" : "none"; if (!on) return;
    const env = this.app.world.env, cam = this.app.engine.camera, a = env.windDir * DEG;
    cam.getWorldDirection(this.v); const cy = Math.atan2(this.v.x, this.v.z);    // Blickrichtung in der Ebene
    const rot = -(a - cy) / DEG;                                                  // Bildschirm: oben = Blickrichtung
    const key = Math.round(rot) + "|" + Math.round(env.wind) + "|" + m;
    if (key === this.last) return; this.last = key;
    this.el.querySelector("#le-warr").setAttribute("transform", "rotate(" + rot.toFixed(0) + " 20 20)");
    this.el.querySelector("#le-wtxt").textContent = t("wWind") + " " + Math.round(env.wind) + " %";
    this.el.classList.toggle("le-wed", m === "editor"); this.el.style.opacity = env.wind < 1 ? 0.45 : 1;
  }
  dispose() { this.el.remove(); }
}
