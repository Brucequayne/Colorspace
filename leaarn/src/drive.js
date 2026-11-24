// ===== drive.js · Testfahrt: Auto auf der Strecke, Verfolgerkamera (3rd Person), Anzeige =====
import * as THREE from "three";
import { t, addTexts, L2, clamp, el } from "le/core.js";
import { Car } from "le/car.js";
import { Race, CheckpointMarkers, fmtTime, fmtDelta } from "le/race.js";

addTexts({
  dHelp: L2("W/↑ Gas · S/↓ Bremse, im Stand rückwärts · A/D lenken · Leertaste Handbremse · C Kamera · R zurück zum Start · Esc Pause", "W/↑ throttle · S/↓ brake, reverse when stopped · A/D steer · Space handbrake · C camera · R back to start · Esc pause"),
  dPause: L2("Pause", "Paused"), dGo: L2("Weiterfahren", "Continue"), dRestart: L2("Zum Start", "Back to start"), dEditor: L2("Zum Map-Editor", "To map editor"), dMenu: L2("Hauptmenü", "Main menu"),
  dNoRoad: L2("Keine Straße in der Szene – im Developer Tool erst eine Strecke bauen.", "No road in the scene – build a track in the developer tool first."),
  dLap: L2("Runde", "Lap"), dBest: L2("Beste", "Best"), dLast: L2("Letzte", "Last"), dGoLine: L2("Über die Startlinie fahren, dann läuft die Zeit", "Cross the start line to start the timer"),
  dNewBest: L2("Neue Bestzeit", "New best lap"), dRaceNo: L2("Für ein Test-Rennen braucht die Hauptstrecke einen Rundkurs – jetzt Testfahrt.", "A test race needs the main road to be a circuit – starting a test drive."), dDrive: L2("Antrieb", "Drive"), dSurf: { de: "Untergrund", en: "Surface" }
});
const DRIVES = { rwd: L2("Heck", "RWD"), fwd: L2("Front", "FWD"), awd: L2("Allrad", "AWD") };

export class Drive {
  constructor(app, opts) {
    this.app = app; this.world = app.world; this.opts = opts || {};
    this.car = new Car(this.world, { drive: app.settings.drive || "rwd" });
    this.camMode = 0; this.camPos = new THREE.Vector3(); this.camLook = new THREE.Vector3(); this.paused = false;
    const race = !!this.opts.race;
    if (race && !(this.world.road && this.world.road.closed && this.world.road.S.length > 1)) { this.app.toast(t("dRaceNo")); this.opts.race = false; }
    this.race = new Race(this.world, this.opts.race); this.cpm = new CheckpointMarkers(this.world, this.opts.race); this.cpm.build();
    this.hud = el("div", "le-hud", '<div class="le-cpd" id="le-cpd"></div><div class="le-delta" id="le-delta"></div>' + (this.opts.race ? '<div class="le-timer" id="le-timer"></div>' : "") + '<div class="le-spd"><b id="le-kmh">0</b><span>km/h</span></div><div class="le-gear" id="le-gear">1</div>' +
      '<div class="le-rpm"><i id="le-rpmb"></i></div><div class="le-info" id="le-info"></div><div class="le-help">' + t("dHelp") + "</div>");
    app.ui.appendChild(this.hud);
    this.reset();
  }
  reset() {
    const s = this.world.road.start(8);
    if (!s) { this.app.toast(t("dNoRoad")); this.car.place(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 1)); }
    else this.car.place(s.p, s.t);
    if (this.race) this.race.reset();
    this.snapCam();
  }
  snapCam() { const c = this.car; this.camPos.copy(c.p).add(new THREE.Vector3(0, 3, -8).applyQuaternion(c.q)); this.camLook.copy(c.p); }
  key(e) {
    if (e.code === "Escape") { this.pause(!this.paused); return true; }
    if (this.paused) return false;
    if (e.code === "KeyC") { this.camMode = (this.camMode + 1) % 3; return true; }
    if (e.code === "KeyR") { this.reset(); return true; }
    return false;
  }
  pause(on) {
    this.paused = on;
    if (this.pm) { this.pm.remove(); this.pm = null; }
    if (!on) return;
    this.pm = el("div", "le-pause", "<h2>" + t("dPause") + '</h2><button data-d="go">' + t("dGo") + '</button><button data-d="restart">' + t("dRestart") + "</button>" +
      (this.opts.fromEditor ? '<button data-d="editor">' + t("dEditor") + "</button>" : "") + '<button data-d="menu">' + t("dMenu") + "</button>");
    this.pm.addEventListener("click", (e) => {
      const b = e.target.closest("[data-d]"); if (!b) return; const a = b.getAttribute("data-d");
      if (a === "go") this.pause(false); else if (a === "restart") { this.reset(); this.pause(false); } else if (a === "editor") this.app.go("editor"); else this.app.go("menu");
    });
    this.app.ui.appendChild(this.pm);
  }
  update(dt) {
    const c = this.car, inp = this.app.input.drive(dt);
    if (inp.pause) this.pause(!this.paused);
    if (!this.paused) c.update(dt, inp);
    // Kamera: 0 = Verfolger, 1 = weit, 2 = Motorhaube
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(c.q); fwd.y = 0; fwd.normalize();
    const vdir = c.v.clone().setY(0); const sp = vdir.length(); if (sp > 3) fwd.lerp(vdir.normalize(), 0.35).normalize();
    const cam = this.app.engine.camera, dist = this.camMode === 1 ? 13 : 7.2, ht = this.camMode === 1 ? 4.6 : 2.5;
    if (this.camMode === 2) {
      cam.position.copy(c.p).add(new THREE.Vector3(0, 0.75, 0.6).applyQuaternion(c.q)); cam.quaternion.copy(c.q).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI));
      this.camPos.copy(cam.position); this.camLook.copy(c.p);
    } else {
      const want = c.p.clone().addScaledVector(fwd, -dist).add(new THREE.Vector3(0, ht, 0)), k = 1 - Math.exp(-dt * 6);
      this.camPos.lerp(want, k);
      const g = this.world.ground(this.camPos.x, this.camPos.z, {}); if (this.camPos.y < g.h + 1) this.camPos.y = g.h + 1;
      this.camLook.lerp(c.p.clone().addScaledVector(fwd, 4).add(new THREE.Vector3(0, 1, 0)), 1 - Math.exp(-dt * 10));
      cam.position.copy(this.camPos); cam.lookAt(this.camLook);
    }
    cam.fov = 55 + clamp(sp * 0.35, 0, 14); cam.updateProjectionMatrix();
    this.app.engine.focus(c.p);
    this.raceHud(dt);
    // Anzeige
    const kmh = Math.round(Math.abs(c.fwdSpeed()) * 3.6);
    this.set("le-kmh", kmh); this.set("le-gear", c.gear === -1 ? "R" : c.gear === 0 ? "N" : c.gear);
    const rb = document.getElementById("le-rpmb"); if (rb) { const r = clamp(c.rpm / c.def.engine.red, 0, 1.05); rb.style.width = r * 100 + "%"; rb.style.background = r > 0.92 ? "#E8503A" : "#E8A04A"; }
    const wk = c.wh.map((w) => (w.contact ? (w.kind === "road" ? "■" : w.kind === "curb" ? "▣" : "□") : "·")).join("");
    this.set("le-info", t("dDrive") + ": " + DRIVES[c.def.drive][this.app.lang] + " · " + Math.round(c.rpm) + " U/min · " + wk);
  }
  raceHud(dt) {
    const r = this.race; if (!this.paused) r.update(dt, this.car.p);
    const tg = r.target(); this.set("le-cpd", tg ? Math.max(0, Math.round(tg.m)) + " m" : "");
    if (tg) { if (this.hl !== tg.d) { this.hl = tg.d; this.cpm.highlight(tg.d); } }
    const de = document.getElementById("le-delta"), m = r.msg;
    if (de) {
      let txt = "", cls = "";
      if (m) { txt = m.lap ? (m.best && m.delta != null ? t("dNewBest") + " " : "") + fmtTime(m.t) + (m.delta != null ? "  " + fmtDelta(m.delta) : "") : fmtTime(m.t) + (m.delta != null ? "  " + fmtDelta(m.delta) : ""); cls = m.delta == null ? "" : m.delta < 0 ? "le-good" : "le-bad"; }
      if (de.textContent !== txt) de.textContent = txt; de.className = "le-delta " + cls; de.style.opacity = m ? String(Math.min(1, (3 - m.age) * 2)) : "0";
    }
    if (this.opts.race) {
      const lines = r.running ? [t("dLap") + " " + r.lap + "  " + fmtTime(r.t)] : [t("dGoLine")];
      lines.push(t("dBest") + " " + fmtTime(r.best && r.best.t)); if (r.last != null) lines.push(t("dLast") + " " + fmtTime(r.last));
      const tx = document.getElementById("le-timer"), h = lines.join("<br>"); if (tx && tx.innerHTML !== h) tx.innerHTML = h;
    }
  }
  set(id, v) { const e = document.getElementById(id); if (e && e.textContent !== String(v)) e.textContent = v; }
  dispose() { this.cpm.dispose(); this.car.dispose(); this.hud.remove(); if (this.pm) this.pm.remove(); }
}
