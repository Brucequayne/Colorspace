// ===== play.js · Testlauf: Runner steuern, Verfolgerkamera, Zeitfahren von Start bis Ziel, Bestzeiten =====
import * as THREE from "three";
import { t, addTexts, L2, el, esc, store, KEYS, clamp, damp, dampAngle, ftime, lerp } from "pru/core.js";
import { Runner } from "pru/runner.js";
import { Mover } from "pru/move.js";
import { FINISH_R } from "pru/world.js";

addTexts({
  pClick: L2("Klicken zum Steuern", "Click to control"), pReady: L2("Los geht's, sobald du dich bewegst", "Starts as soon as you move"),
  pBest: L2("Bestzeit", "Best"), pPart: L2("Teilstrecke ab Test-Start · zählt nicht als Bestzeit", "Section from test start · does not count as best time"),
  pDone: L2("Ziel!", "Finish!"), pNew: L2("Neue Bestzeit", "New best time"), pTop: L2("Deine besten Zeiten", "Your best times"),
  pNoFinish: L2("Kein Ziel gesetzt – freies Testen", "No finish placed – free testing"),
  pPause: L2("Pause", "Paused"), pCont: L2("Weiter", "Continue"), pRestart: L2("Neu starten (R)", "Restart (R)"), pBack: L2("Zurück zum Editor (Esc)", "Back to the editor (Esc)"),
  pKeys: L2("WASD laufen · Shift sprinten · Leertaste springen / an der Wand abstoßen · Strg/C rutschen, vor der Landung: abrollen · R neu · Esc Pause", "WASD run · Shift sprint · Space jump / kick off walls · Ctrl/C slide, before landing: roll · R restart · Esc pause")
});

export class Play {
  constructor(app, opts) {
    this.app = app; this.world = app.world; this.engine = app.engine; this.cv = app.engine.renderer.domElement;
    const m = this.world.map;
    this.from = opts && opts.from === "test" && m.test ? "test" : "start";
    this.spawnAt = this.from === "test" ? m.test : m.start;
    this.world.setShowTest(false);
    this.runner = new Runner(this.engine.scene);
    this.mover = new Mover(this.world);
    this.keys = {}; this.inp = { wish: new THREE.Vector3(), jump: false, crouch: false, crouchHeld: false, sprint: false };
    const s = app.settings;
    this.sens = s.sens || 1; this.invert = !!s.invert; this.fov = s.fov || 72; this.camDist = s.camDist || 3.6;
    this.ui = el("div", "pru-hud",
      '<div class="pru-time" id="pru-t">0:00.000</div><div class="pru-sub" id="pru-sub"></div>' +
      '<div class="pru-keys">' + esc(t("pKeys")) + "</div>" +
      '<div class="pru-click" id="pru-click">' + t("pClick") + "</div>" +
      '<div class="pru-over" id="pru-over" hidden></div>');
    app.ui.appendChild(this.ui);
    this.$ = (q) => this.ui.querySelector(q);
    this.h = {
      down: (e) => { if (!this.locked() && e.button === 0 && this.$("#pru-over").hidden) this.lock(); },
      move: (e) => { if (!this.locked()) return; this.camYaw -= e.movementX * 0.0024 * this.sens; this.camPitch = clamp(this.camPitch + e.movementY * 0.0022 * this.sens * (this.invert ? -1 : 1), -0.9, 1.25); },
      lock: () => { const L = this.locked(); this.$("#pru-click").hidden = L || this.state === "done"; if (!L && this.state !== "done" && this.wasLocked) this.pause(true); this.wasLocked = L; },
      kup: (e) => { this.keys[e.code] = false; }, blur: () => { this.keys = {}; }
    };
    this.cv.addEventListener("mousedown", this.h.down); document.addEventListener("mousemove", this.h.move);
    document.addEventListener("pointerlockchange", this.h.lock); window.addEventListener("keyup", this.h.kup); window.addEventListener("blur", this.h.blur);
    this.ui.addEventListener("click", (e) => { const b = e.target.closest("[data-p]"); if (!b) return; const a = b.getAttribute("data-p"); if (a === "cont") { this.pause(false); this.lock(); } else if (a === "restart") { this.restart(); this.lock(); } else if (a === "back") this.back(); });
    this.restart();
    this.lock();
  }
  locked() { return document.pointerLockElement === this.cv; }
  lock() { try { const r = this.cv.requestPointerLock && this.cv.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) {} }
  restart() {
    const sp = this.spawnAt;
    this.mover.spawn(sp.p, sp.yaw || 0);
    this.camYaw = (sp.yaw || 0) + Math.PI; this.camPitch = 0.28; this.camD = this.camDist;
    this.camPos = null; this.time = 0; this.state = "ready"; this.paused = false;
    this.$("#pru-over").hidden = true;
    this.best = this.loadBest();
    this.$("#pru-sub").textContent = !this.world.map.finish ? t("pNoFinish") : this.from === "test" ? t("pPart") : (this.best.length ? t("pBest") + " " + ftime(this.best[0]) : t("pReady"));
    this.$("#pru-t").textContent = ftime(0);
  }
  loadBest() { const all = store.get(KEYS.best, {}); return (all[this.world.map.id] || []).slice(); }
  saveBest(tm) {
    const all = store.get(KEYS.best, {}), id = this.world.map.id, L = (all[id] || []).concat([tm]).sort((a, b) => a - b).slice(0, 5);
    all[id] = L; store.set(KEYS.best, all); return L;
  }
  pause(on) {
    this.paused = on; const o = this.$("#pru-over");
    if (on) { o.hidden = false; o.innerHTML = '<div class="pru-box"><h2>' + t("pPause") + '</h2><button class="pru-pri" data-p="cont">' + t("pCont") + '</button><button data-p="restart">' + t("pRestart") + '</button><button data-p="back">' + t("pBack") + "</button></div>"; }
    else o.hidden = true;
  }
  finish() {
    this.state = "done"; const tm = this.time;
    let html = '<div class="pru-box pru-res"><h2>' + t("pDone") + '</h2><div class="pru-big">' + ftime(tm) + "</div>";
    if (this.from === "start") {
      const prev = this.best[0], L = this.saveBest(tm), isNew = prev == null || tm < prev;
      if (isNew) html += '<p class="pru-new">' + t("pNew") + "</p>";
      else html += "<p>" + t("pBest") + " " + ftime(prev) + " · +" + (tm - prev).toFixed(3) + " s</p>";
      html += '<h4>' + t("pTop") + "</h4><ol>" + L.map((x) => "<li" + (x === tm ? ' class="pru-me"' : "") + ">" + ftime(x) + "</li>").join("") + "</ol>";
      this.best = L;
    } else html += "<p>" + t("pPart") + "</p>";
    html += '<button class="pru-pri" data-p="restart">' + t("pRestart") + '</button><button data-p="back">' + t("pBack") + "</button></div>";
    const o = this.$("#pru-over"); o.innerHTML = html; o.hidden = false;
    if (document.exitPointerLock) document.exitPointerLock();
  }
  back() { if (document.exitPointerLock && this.locked()) document.exitPointerLock(); this.app.go("editor"); }
  key(e) {
    const c = e.code;
    if (c === "Escape") { if (this.state === "done" || this.paused) this.back(); else if (!this.locked()) this.pause(true); return true; }
    if (c === "KeyR") { this.restart(); if (!this.locked()) this.lock(); return true; }
    if (this.paused || this.state === "done") return false;
    if (!this.keys[c]) {
      if (c === "Space") this.inp.jump = true;
      if (c === "ControlLeft" || c === "ControlRight" || c === "KeyC") this.inp.crouch = true;
    }
    this.keys[c] = true;
    return /^(Space|KeyW|KeyA|KeyS|KeyD|KeyC|ControlLeft|ControlRight|ShiftLeft|ShiftRight|ArrowUp|ArrowDown|ArrowLeft|ArrowRight)$/.test(c);
  }
  update(dt) {
    const k = this.keys, mv = this.mover;
    if (!this.paused && this.state !== "done") {
      const fx = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0), sx = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0);
      const f = new THREE.Vector3(-Math.sin(this.camYaw), 0, -Math.cos(this.camYaw)), r = new THREE.Vector3(-f.z, 0, f.x);
      const w = this.inp.wish.set(0, 0, 0).addScaledVector(f, fx).addScaledVector(r, sx); if (w.lengthSq() > 1) w.normalize();
      this.inp.sprint = !!(k.ShiftLeft || k.ShiftRight); this.inp.crouchHeld = !!(k.ControlLeft || k.ControlRight || k.KeyC);
      if (this.state === "ready" && (w.lengthSq() > 0.01 || this.inp.jump)) { this.state = "run"; if (this.world.map.finish && this.from === "start") this.$("#pru-sub").textContent = this.best.length ? t("pBest") + " " + ftime(this.best[0]) : ""; }
      const s = mv.update(dt, this.inp);
      this.inp.jump = false; this.inp.crouch = false;
      this.runner.update(dt, s);
      if (this.state === "run") { this.time += dt; this.$("#pru-t").textContent = ftime(this.time); }
      // Ziel erreicht?
      const fin = this.world.map.finish;
      if (fin && this.state === "run") { const p = mv.pos, dx = p.x - fin.p[0], dz = p.z - fin.p[2]; if (dx * dx + dz * dz < FINISH_R * FINISH_R && p.y > fin.p[1] - 0.6 && p.y < fin.p[1] + 4) this.finish(); }
    } else this.runner.update(dt * 0.0001, mv.animState(this.inp));
    this.runner.place(mv.view, mv.yaw);
    this.camera(dt);
    this.engine.tick(dt);
  }
  camera(dt) {
    const mv = this.mover, cam = this.engine.camera;
    const tgt = mv.view.clone(); tgt.y += mv.low ? 1.05 : 1.55;
    if (!this.camTgt) this.camTgt = tgt.clone(); else { this.camTgt.x = damp(this.camTgt.x, tgt.x, 30, dt); this.camTgt.z = damp(this.camTgt.z, tgt.z, 30, dt); this.camTgt.y = damp(this.camTgt.y, tgt.y, 12, dt); }
    const T = this.camTgt, cp = Math.cos(this.camPitch);
    const back = new THREE.Vector3(Math.sin(this.camYaw) * cp, Math.sin(this.camPitch), Math.cos(this.camYaw) * cp);
    // leicht über die rechte Schulter
    const side = new THREE.Vector3(Math.cos(this.camYaw), 0, -Math.sin(this.camYaw)).multiplyScalar(0.32);
    const piv = T.clone().add(side);
    let want = this.camDist;
    const hit = this.world.ray(piv, back, want + 0.3, false);
    if (hit) want = Math.max(0.6, hit.distance - 0.3);
    this.camD = want < this.camD ? want : damp(this.camD, want, 4, dt);
    cam.position.copy(piv).addScaledVector(back, this.camD);
    if (cam.position.y < 0.15) cam.position.y = 0.15;
    cam.lookAt(piv);
    // Sichtfeld weitet sich bei hohem Tempo
    const sp = Math.hypot(mv.vel.x, mv.vel.z), fov = this.fov + clamp((sp - 7) / 4, 0, 1) * 8;
    if (Math.abs(cam.fov - fov) > 0.05) { cam.fov = damp(cam.fov, fov, 5, dt); cam.updateProjectionMatrix(); }
    this.engine.focus(mv.view);
  }
  dispose() {
    this.cv.removeEventListener("mousedown", this.h.down); document.removeEventListener("mousemove", this.h.move);
    document.removeEventListener("pointerlockchange", this.h.lock); window.removeEventListener("keyup", this.h.kup); window.removeEventListener("blur", this.h.blur);
    if (this.locked() && document.exitPointerLock) document.exitPointerLock();
    this.runner.dispose(); this.ui.remove(); this.world.setShowTest(true);
  }
}
