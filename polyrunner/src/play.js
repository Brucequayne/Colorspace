// ===== play.js · Testlauf: Runner steuern, Verfolgerkamera, Zeitfahren von Start bis Ziel, Bestzeiten =====
import * as THREE from "three";
import { t, addTexts, L2, el, esc, store, KEYS, clamp, damp, dampAngle, ftime, lerp } from "pru/core.js";
import { Runner } from "pru/runner.js";
import { Mover, ScaledWorld } from "pru/move.js";
import { Tweak, loadTune, kOf, TW } from "pru/tweak.js";
import { Figur, loadFigur, cloneLook } from "pru/figur.js";
import { FINISH_R } from "pru/world.js";

addTexts({
  pClick: L2("Klicken zum Steuern", "Click to control"), pReady: L2("Los geht's, sobald du dich bewegst", "Starts as soon as you move"),
  pBest: L2("Bestzeit", "Best"), pPart: L2("Teilstrecke ab Test-Start · zählt nicht als Bestzeit", "Section from test start · does not count as best time"),
  pDone: L2("Ziel!", "Finish!"), pNew: L2("Neue Bestzeit", "New best time"), pTop: L2("Deine besten Zeiten", "Your best times"),
  pNoFinish: L2("Kein Ziel gesetzt – freies Testen", "No finish placed – free testing"),
  pPause: L2("Pause", "Paused"), pCont: L2("Weiter", "Continue"), pRestart: L2("Neu starten (R)", "Restart (R)"), pBack: L2("Zurück zum Editor (Esc)", "Back to the editor (Esc)"),
  pKeys: L2("WASD laufen (Blick = Maus) · Shift sprinten · Leertaste springen, an der Wand abstoßen, an der Kante hochziehen, beim Aufkommen abrollen · Linke Maustaste halten: Hindernisse bis Hüfthöhe automatisch (Mini-Hüpfer, Schwung-Klettern), kurz vor dem Sprung: beidbeinig · Q/E Slide auf linker/rechter Hüfte · Strg/C ducken, Kante loslassen · R neu · Esc Pause · T Tweaker · F Dummy/Charakter",
    "WASD run (look = mouse) · Shift sprint · Space jump, kick off walls, pull up on a ledge, roll on landing · hold left mouse button: obstacles up to hip height automatically (mini hop, swing vault), just before a jump: two-footed · Q/E slide on left/right hip · Ctrl/C crouch, let go of a ledge · R restart · Esc pause · T tweaker · F dummy/character"),
  pBroken: L2("Beine gebrochen", "Broken legs"), pBrokenSub: L2("Zu tief gefallen. Ab 3 m: Leertaste beim Aufkommen zum Abrollen, ab 10 m hilft auch das nicht mehr.", "Fell too far. From 3 m: press Space on landing to roll; from 10 m even that won't help.")
});

const _up = new THREE.Vector3(0, 0.5, 0);
export class Play {
  constructor(app, opts) {
    this.app = app; this.world = app.world; this.engine = app.engine; this.cv = app.engine.renderer.domElement;
    const m = this.world.map;
    this.from = opts && opts.from === "test" && m.test ? "test" : "start";
    this.spawnAt = this.from === "test" ? m.test : m.start;
    this.world.setShowTest(false);
    // Größe: Bewegung und Runner rechnen in 1,8-m-Einheiten, alles hängt in einer auf die Figurgröße skalierten Gruppe (Tweaker: Körpergröße)
    loadTune(); this.k = kOf(); this.sw = new ScaledWorld(this.world, this.k);
    this.rg = new THREE.Group(); this.rg.scale.setScalar(this.k); this.engine.scene.add(this.rg);
    this.runner = new Runner(this.engine.scene); this.runner.world = this.sw; this.runner.ws = this.k; this.rg.add(this.runner.root);
    this.mover = new Mover(this.sw);
    this.figMode = store.get(KEYS.ui, {}).fig === "char" ? "char" : "dummy"; this.fig = null; this.wind = new THREE.Vector3();
    this.m = { speed: 0, jh: null, jw: null, fall: null, air: false, p0: new THREE.Vector3(), top: 0 };
    this.keys = {}; this.inp = { wish: new THREE.Vector3(), jump: false, crouch: false, crouchHeld: false, sprint: false, slide: null, slideHeld: false };
    const s = app.settings;
    this.sens = s.sens || 1; this.invert = !!s.invert; this.fov = s.fov || 72; this.camDist = s.camDist || 3.6;
    this.ui = el("div", "pru-hud",
      '<div class="pru-time" id="pru-t">0:00.000</div><div class="pru-sub" id="pru-sub"></div>' +
      '<div class="pru-keys">' + esc(t("pKeys")) + "</div>" +
      '<div class="pru-click" id="pru-click">' + t("pClick") + "</div>" +
      '<div class="pru-over" id="pru-over" hidden></div><div class="pru-hurt" id="pru-hurt"></div>');
    app.ui.appendChild(this.ui);
    this.$ = (q) => this.ui.querySelector(q);
    this.h = {
      down: (e) => { if (!this.locked() && e.button === 0 && this.$("#pru-over").hidden) this.lock(); else if (this.locked() && e.button === 0) { this.inp.both = true; this.lmb = true; } },
      up: (e) => { if (e.button === 0) this.lmb = false; },
      move: (e) => { if (!this.locked()) return; this.camYaw -= e.movementX * 0.0024 * this.sens; this.camPitch = clamp(this.camPitch + e.movementY * 0.0022 * this.sens * (this.invert ? -1 : 1), -0.9, 1.25); },
      lock: () => { const L = this.locked(), end = this.state === "done" || (this.state === "fail" && !this.$("#pru-over").hidden); this.$("#pru-click").hidden = L || end; if (!L && !end && this.wasLocked && !(this.tw && this.tw.open)) this.pause(true); this.wasLocked = L; },
      kup: (e) => { this.keys[e.code] = false; }, blur: () => { this.keys = {}; this.lmb = false; }
    };
    this.cv.addEventListener("mousedown", this.h.down); document.addEventListener("mousemove", this.h.move); window.addEventListener("mouseup", this.h.up);
    document.addEventListener("pointerlockchange", this.h.lock); window.addEventListener("keyup", this.h.kup); window.addEventListener("blur", this.h.blur);
    this.ui.addEventListener("click", (e) => { const b = e.target.closest("[data-p]"); if (!b) return; const a = b.getAttribute("data-p"); if (a === "cont") { this.pause(false); this.lock(); } else if (a === "restart") { this.restart(); this.lock(); } else if (a === "back") this.back(); });
    this.tw = new Tweak(this);
    this.setFigure(this.figMode);
    this.restart();
    this.lock();
  }
  // Dummy oder echter Charakter (mit Frisur und Kleidung aus dem Charakter-Editor)
  setFigure(m) {
    this.figMode = m; const u = store.get(KEYS.ui, {}); u.fig = m; store.set(KEYS.ui, u);
    if (m === "char" && !this.fig && !this.figLoading) {
      this.figLoading = true;
      loadFigur().then((d) => { if (this.dead) return; this.fig = new Figur(this.engine.scene, d, cloneLook(store.get(KEYS.char, null))); this.figLoading = false; this.rescale(); this.syncFig(); }).catch(() => { this.figLoading = false; this.figMode = "dummy"; this.syncFig(); });
    }
    this.syncFig();
  }
  syncFig() { const c = this.figMode === "char" && !!this.fig; this.runner.setVisible(!c); if (this.fig) this.fig.setVisible(c); }
  // Körpergröße geändert: Maßstab überall nachziehen
  rescale() {
    this.k = kOf(); this.sw.k = this.k; this.runner.ws = this.k; this.rg.scale.setScalar(this.k);
    if (this.fig) this.fig.root.scale.setScalar(TW.size / 1.4);
  }
  locked() { return document.pointerLockElement === this.cv; }
  lock() { try { const r = this.cv.requestPointerLock && this.cv.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) {} }
  restart() {
    const sp = this.spawnAt;
    this.mover.spawn([sp.p[0] / this.k, sp.p[1] / this.k, sp.p[2] / this.k], sp.yaw || 0); this.runner.rag = null; this.brokenT = 0; this.shake = 0; this.$("#pru-hurt").style.opacity = 0;
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
  showBroken() {
    const o = this.$("#pru-over");
    o.innerHTML = '<div class="pru-box pru-res"><h2>' + t("pBroken") + "</h2><p>" + t("pBrokenSub") + '</p><button class="pru-pri" data-p="restart">' + t("pRestart") + '</button><button data-p="back">' + t("pBack") + "</button></div>";
    o.hidden = false; if (document.exitPointerLock && this.locked()) document.exitPointerLock();
  }
  back() { if (document.exitPointerLock && this.locked()) document.exitPointerLock(); this.app.go("editor"); }
  key(e) {
    const c = e.code;
    if (c === "Escape") { if (this.state === "done" || this.paused || (this.state === "fail" && !this.$("#pru-over").hidden)) this.back(); else if (!this.locked()) this.pause(true); return true; }
    if (c === "KeyR") { this.restart(); if (!this.locked()) this.lock(); return true; }
    if (c === "KeyT" && !e.repeat) { this.tw.toggle(); if (this.paused) this.pause(false); if (this.tw.open && this.locked() && document.exitPointerLock) document.exitPointerLock(); return true; }
    if (c === "KeyF" && !e.repeat) { this.setFigure(this.figMode === "char" ? "dummy" : "char"); if (this.tw.open) this.tw.render(); return true; }
    if (this.paused || this.state === "done") return false;
    if (!this.keys[c]) {
      if (c === "Space") this.inp.jump = true;
      if (c === "ControlLeft" || c === "ControlRight" || c === "KeyC") this.inp.crouch = true;
      if (c === "KeyQ") this.inp.slide = "L"; if (c === "KeyE") this.inp.slide = "R";
    }
    this.keys[c] = true;
    return /^(Space|KeyW|KeyA|KeyS|KeyD|KeyC|KeyQ|KeyE|ControlLeft|ControlRight|ShiftLeft|ShiftRight|ArrowUp|ArrowDown|ArrowLeft|ArrowRight)$/.test(c);
  }
  update(dt) {
    dt *= this.tw.slow;
    const k = this.keys, mv = this.mover, K = this.k;
    if (!this.paused && this.state !== "done") {
      const fx = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0), sx = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0);
      const f = new THREE.Vector3(-Math.sin(this.camYaw), 0, -Math.cos(this.camYaw)), r = new THREE.Vector3(-f.z, 0, f.x);
      const w = this.inp.wish.set(0, 0, 0).addScaledVector(f, fx).addScaledVector(r, sx); if (w.lengthSq() > 1) w.normalize();
      this.inp.sprint = !!(k.ShiftLeft || k.ShiftRight); this.inp.lmb = !!this.lmb || !!this.botLmb; this.inp.aim = this.camYaw + Math.PI; this.inp.crouchHeld = !!(k.ControlLeft || k.ControlRight || k.KeyC); this.inp.slideHeld = !!(k.KeyQ || k.KeyE);
      if (this.state === "ready" && (w.lengthSq() > 0.01 || this.inp.jump)) { this.state = "run"; if (this.world.map.finish && this.from === "start") this.$("#pru-sub").textContent = this.best.length ? t("pBest") + " " + ftime(this.best[0]) : ""; }
      const s = mv.update(dt, this.inp);
      this.inp.jump = false; this.inp.crouch = false; this.inp.slide = null; this.inp.both = false;
      this.runner.place(mv.view, mv.yaw);
      this.runner.update(dt, s);
      if (mv.mode === "broken" && this.state !== "fail") { this.state = "fail"; this.shake = 1; this.$("#pru-hurt").style.opacity = 1; }
      if (this.state === "run") { this.time += dt; this.$("#pru-t").textContent = ftime(this.time); }
      // Ziel erreicht?
      const fin = this.world.map.finish;
      if (fin && this.state === "run") { const p = mv.pos.clone().multiplyScalar(K), dx = p.x - fin.p[0], dz = p.z - fin.p[2]; if (dx * dx + dz * dz < FINISH_R * FINISH_R && p.y > fin.p[1] - 0.6 && p.y < fin.p[1] + 4) this.finish(); }
    } else { this.runner.place(mv.view, mv.yaw); this.runner.update(dt * 0.0001, mv.animState(this.inp)); }
    // Charakter übernimmt die Pose, Haare und Stoff spüren die echte Bewegung + Fahrtwind
    if (this.fig && this.figMode === "char") { this.fig.follow(this.runner, K); this.wind.copy(mv.vel).multiplyScalar(-K); this.fig.simulate(Math.max(dt, 1e-4), this.wind); }
    this.measure(dt);
    if (this.state === "fail") {
      // Beinbruch: Ragdoll fällt, kurz rot, dann die Auswahl
      this.brokenT += dt; this.shake = Math.max(0, this.shake - dt * 2.5); this.$("#pru-hurt").style.opacity = Math.max(0.25, 1 - this.brokenT * 1.5);
      if (this.brokenT > 1.6 && this.$("#pru-over").hidden && !this.paused) this.showBroken();
    }
    this.camera(dt);
    this.engine.tick(dt);
  }
  camera(dt) {
    const mv = this.mover, cam = this.engine.camera;
    const K = this.k, tgt = (mv.mode === "broken" && this.runner.rag ? this.runner.rag.pts[0].p.clone().add(_up) : mv.view.clone()).multiplyScalar(K);
    if (mv.mode !== "broken") tgt.y += (mv.low ? 1.05 : mv.mode === "hang" ? 1.75 : 1.55) * K;
    if (!this.camTgt) this.camTgt = tgt.clone(); else { this.camTgt.x = damp(this.camTgt.x, tgt.x, 30, dt); this.camTgt.z = damp(this.camTgt.z, tgt.z, 30, dt); this.camTgt.y = damp(this.camTgt.y, tgt.y, 12, dt); }
    const T = this.camTgt, cp = Math.cos(this.camPitch);
    const back = new THREE.Vector3(Math.sin(this.camYaw) * cp, Math.sin(this.camPitch), Math.cos(this.camYaw) * cp);
    // leicht über die rechte Schulter
    const side = new THREE.Vector3(Math.cos(this.camYaw), 0, -Math.sin(this.camYaw)).multiplyScalar(0.32 * K);
    const piv = T.clone().add(side);
    let want = this.camDist * K;   // Kameraabstand wächst mit der Figurgröße
    const hit = this.world.ray(piv, back, want + 0.3, false);
    if (hit) want = Math.max(0.6, hit.distance - 0.3);
    this.camD = want < this.camD ? want : damp(this.camD, want, 4, dt);
    cam.position.copy(piv).addScaledVector(back, this.camD);
    if (cam.position.y < 0.15) cam.position.y = 0.15;
    cam.lookAt(piv);
    if (this.shake > 0) { const a = this.shake * this.shake * 0.12; cam.position.x += (Math.random() - 0.5) * a; cam.position.y += (Math.random() - 0.5) * a; }
    // Sichtfeld weitet sich bei hohem Tempo
    const sp = Math.hypot(mv.vel.x, mv.vel.z) * K, fov = this.fov + clamp((sp - 7) / 4, 0, 1) * 8;
    if (Math.abs(cam.fov - fov) > 0.05) { cam.fov = damp(cam.fov, fov, 5, dt); cam.updateProjectionMatrix(); }
    this.engine.focus(mv.view.clone().multiplyScalar(K));
  }
  // Messung in echten Metern: Tempo, letzter Sprung (Höhe über dem Absprung, Weite bis zur Landung), letzter Fall
  measure(dt) {
    const mv = this.mover, K = this.k, M = this.m, p = mv.pos;
    M.speed = Math.hypot(mv.vel.x, mv.vel.z) * K;
    const air = !mv.grounded && mv.mode === "normal";
    if (air && !M.air) { M.air = true; M.p0.copy(p).multiplyScalar(K); M.top = M.p0.y; }
    if (M.air) M.top = Math.max(M.top, p.y * K);
    if (!air && M.air) { M.air = false; const y = p.y * K; M.jh = M.top - M.p0.y; M.jw = Math.hypot(p.x * K - M.p0.x, p.z * K - M.p0.z); M.fall = M.top - y; }
    this.mt = (this.mt || 0) + dt; if (this.mt > 0.1) { this.mt = 0; this.tw.measure(M); }
  }
  dispose() {
    this.cv.removeEventListener("mousedown", this.h.down); document.removeEventListener("mousemove", this.h.move); window.removeEventListener("mouseup", this.h.up);
    document.removeEventListener("pointerlockchange", this.h.lock); window.removeEventListener("keyup", this.h.kup); window.removeEventListener("blur", this.h.blur);
    if (this.locked() && document.exitPointerLock) document.exitPointerLock();
    this.dead = true; this.tw.dispose(); if (this.fig) this.fig.dispose();
    this.runner.dispose(); this.engine.scene.remove(this.rg); this.ui.remove(); this.world.setShowTest(true);
  }
}
