// ===== play.js · Spielen: Figur im Hub (3rd Person), Türen, Schreibtisch → Lernmodus, Geld-Anzeige =====
import * as THREE from "three";
import { t, addTexts, L2, clamp, lerp, el, esc, store, KEYS, DEV_CODE, PR } from "le/core.js";
import { Player, camHit } from "le/player.js";
import { Learn } from "le/learn.js";
import { geld, euro, offen, einsammeln, charakter } from "le/save.js";
import { kasse, tick } from "le/sound.js";
import { LH } from "le/houses.js";

addTexts({
  pHelp: L2("WASD/Pfeile laufen · Umschalt rennen · Leertaste springen · E benutzen · Maus ziehen dreht die Kamera · Rad zoomt · Esc Pause", "WASD/arrows walk · Shift run · Space jump · E use · drag the mouse to turn the camera · wheel zooms · Esc pause"),
  pOpen: L2("Tür öffnen", "Open door"), pShut: L2("Tür schließen", "Close door"), pLearn: L2("Am Laptop lernen", "Learn on the laptop"),
  pHome: L2("Zuhause", "Home"), pPause: L2("Pause", "Paused"), pGo: L2("Weiter", "Continue"), pMenu: L2("Hauptmenü", "Main menu"), pEditor: L2("Zum Map-Editor", "To map editor"),
  pNoHome: L2("Kein Haus in der Map – im Map-Editor ein Haus setzen.", "No house in the map – place one in the map editor."), pEarned: L2("+{n}", "+{n}")
});

export class Play {
  constructor(app, opts) {
    this.app = app; this.world = app.world; this.opts = opts || {};
    const ch = charakter(); this.pl = new Player(this.world, ch);
    this.cam = { yaw: 0, pitch: 0.36, dist: 5.2, inside: 0, pos: new THREE.Vector3(), look: new THREE.Vector3(), snap: true };
    this.act = null; this.learn = null; this.paused = false; this.btn = -1;
    this.hud = el("div", "le-hud", '<div class="le-money"><span>' + esc(ch && ch.name ? ch.name : "") + '</span><b id="le-money"></b></div><div class="le-gain" id="le-gain"></div><div class="le-prompt" id="le-prompt"></div><div class="le-where" id="le-where"></div><div class="le-help">' + t("pHelp") + "</div>");
    app.ui.appendChild(this.hud); this.shown = geld(); this.money();
    this.spawn();
    const c = app.engine.renderer.domElement;
    this.onDown = (e) => { if (this.learn || this.paused) return; this.btn = e.button; this.last = [e.clientX, e.clientY]; const ae = document.activeElement; if (ae && ae.blur && ae !== document.body) ae.blur(); };
    this.onMove = (e) => { if (this.btn < 0) return; const dx = e.clientX - this.last[0], dy = e.clientY - this.last[1]; this.last = [e.clientX, e.clientY]; this.cam.yaw -= dx * 0.0055; this.cam.pitch = clamp(this.cam.pitch + dy * 0.004, -0.15, 1.35); };
    this.onUp = () => { this.btn = -1; };
    this.onWheel = (e) => { e.preventDefault(); if (!this.learn) this.cam.dist = clamp(this.cam.dist * Math.exp(e.deltaY * 0.0012), 2.2, 12); };
    this.onCtx = (e) => e.preventDefault();
    c.addEventListener("pointerdown", this.onDown); window.addEventListener("pointermove", this.onMove); window.addEventListener("pointerup", this.onUp);
    c.addEventListener("wheel", this.onWheel, { passive: false }); c.addEventListener("contextmenu", this.onCtx);
  }
  dispose() {
    const c = this.app.engine.renderer.domElement;
    c.removeEventListener("pointerdown", this.onDown); window.removeEventListener("pointermove", this.onMove); window.removeEventListener("pointerup", this.onUp);
    c.removeEventListener("wheel", this.onWheel); c.removeEventListener("contextmenu", this.onCtx);
    if (this.learn) this.learn.dispose(); if (this.pm) this.pm.remove();
    this.world.houses.forEach((h) => h.cutAbove(null));
    this.pl.dispose(); this.hud.remove();
  }
  // Kontostand oben rechts: zeigt "shown" (zählt beim Einsammeln mit den ankommenden Scheinen hoch)
  money() { const m = document.getElementById("le-money"); if (m) m.textContent = euro(this.shown); }
  // Einsammeln (seit v0.12): Kassen-Klingel, Geldscheine fliegen von "from" (Bildschirm-Rechteck) nach oben rechts, Konto zählt hoch
  collect(n, from) {
    if (!n) return; kasse(PR.stamp);
    const box = this.hud.querySelector(".le-money"), to = box.getBoundingClientRect(), fr = from || { left: innerWidth / 2 - 40, top: innerHeight / 2 - 20, width: 80, height: 40 };
    const k = clamp(Math.round(3 + n / 15), 3, 16), share = Math.floor(n / k), target = geld(), start = target - n;
    this.shown = start; this.money(); this.gain(n);
    for (let i = 0; i < k; i++) {
      const b = el("div", "le-bill", "<span>€</span>"); document.body.appendChild(b);
      const x0 = fr.left + fr.width / 2 - 29 + (Math.random() - 0.5) * fr.width * 0.6, y0 = fr.top + fr.height / 2 - 12, x1 = to.left + to.width / 2 - 29, y1 = to.top + to.height / 2 - 15;
      const mx = (x0 + x1) / 2 + (Math.random() - 0.5) * 260, my = Math.min(y0, y1) - 40 - Math.random() * 120, r0 = (Math.random() - 0.5) * 60, r1 = (Math.random() - 0.5) * 720;
      const an = b.animate([
        { transform: "translate(" + x0 + "px," + y0 + "px) rotate(" + r0 + "deg) scale(.6)", opacity: 0 },
        { transform: "translate(" + x0 + "px," + (y0 - 30) + "px) rotate(" + r0 + "deg) scale(1.15)", opacity: 1, offset: 0.15 },
        { transform: "translate(" + mx + "px," + my + "px) rotate(" + (r1 / 2) + "deg) scale(1)", opacity: 1, offset: 0.55 },
        { transform: "translate(" + x1 + "px," + y1 + "px) rotate(" + r1 + "deg) scale(.45)", opacity: 0.9 }
      ], { duration: 850 + Math.random() * 250, delay: 120 + i * 85, easing: "cubic-bezier(.45,.05,.55,.95)", fill: "both" });
      an.onfinish = () => {
        b.remove(); this.shown = i === k - 1 ? target : Math.min(target, this.shown + share); this.money(); tick(i % 6);
        box.classList.remove("le-bump"); void box.offsetWidth; box.classList.add("le-bump");
      };
    }
  }
  // Start vor der Tür des Zuhauses, Blick zum Haus
  spawn() {
    const h = this.world.home();
    if (!h) { this.app.toast(t("pNoHome")); this.pl.place(0, 0, 0); this.cam.yaw = Math.PI; this.cam.snap = true; return; }
    const d = h.b.doors[0];
    if (d) {
      const w = h.toWorld(d.cx + d.nx * 1.6, d.cz + d.nz * 1.6), n = h.dirToWorld(d.nx, d.nz);
      this.pl.place(w.x, w.z, Math.atan2(-n.x, -n.z)); this.cam.yaw = Math.atan2(n.x, n.z);
    } else { const w = h.toWorld(h.ox, h.b.max[1] + 2); this.pl.place(w.x, w.z, Math.PI); this.cam.yaw = 0; }
    this.cam.snap = true;
  }
  // Nächste Interaktion in Reichweite
  findAct() {
    const p = this.pl.p; let best = null, bd = 1e9;
    for (const h of this.world.houses) {
      if (!h.contains(p.x, p.z, 3)) continue;
      for (const a of h.b.acts) {
        if (a.l !== this.pl.level) continue;
        const w = h.toWorld(a.x, a.z), d = Math.hypot(w.x - p.x, w.z - p.z), lim = a.type === "tuer" ? 1.5 : 1.05;
        if (d < lim && d < bd) { bd = d; best = { a: a, h: h }; }
      }
    }
    return best;
  }
  use() {
    const A = this.act; if (!A) return;
    if (A.a.type === "tuer") { const d = A.a.door; d.want = d.want > 0.5 ? 0 : 1; }
    else if (A.a.type === "lernen") this.openLearn(A);
  }
  openLearn(A) {
    const a = A.a, h = A.h, w = h.toWorld(a.x, a.z), f = h.dirToWorld(a.fx, a.fz);
    this.pl.place(w.x, w.z, Math.atan2(-f.x, -f.z)); this.pl.p.y = h.e.y + a.y; this.pl.frozen = true;
    // Kamera hinter die Figur, Blick auf den Laptop
    const c = h.toWorld(a.cx, a.cz), sd = { x: -f.z, z: f.x }; this.learnCam = { look: new THREE.Vector3(c.x, h.e.y + a.y + 0.8, c.z), pos: new THREE.Vector3(c.x + f.x * 2.0 + sd.x * 0.7, h.e.y + a.y + 2.25, c.z + f.z * 2.0 + sd.z * 0.7) };
    this.learn = new Learn(this.app, () => this.closeLearn(), (n, r) => this.collect(n, r));
    this.hud.classList.add("le-dimhud");
  }
  // Aufstehen: was noch auf dem Zwischenkonto liegt, wird automatisch eingesammelt
  closeLearn() {
    if (!this.learn) return;
    const lap = this.learn.root.querySelector(".le-scr"), r = lap ? lap.getBoundingClientRect() : null, n = einsammeln();
    this.learn.dispose(); this.learn = null; this.learnCam = null; this.pl.frozen = false; this.hud.classList.remove("le-dimhud");
    if (n) this.collect(n, r ? { left: r.left + r.width / 2 - 60, top: r.top + r.height / 2 - 30, width: 120, height: 60 } : null); else { this.shown = geld(); this.money(); }
  }
  gain(n) { const g = document.getElementById("le-gain"); if (!g) return; g.textContent = "+" + euro(n); g.classList.remove("le-show"); void g.offsetWidth; g.classList.add("le-show"); }
  key(e) {
    if (this.learn) return this.learn.key(e);
    if (e.code === "Escape") { this.pause(!this.paused); return true; }
    if (this.paused) return false;
    if (e.code === "KeyE" && !e.repeat) { this.use(); return true; }
    if (/^(Space|ArrowUp|ArrowDown|ArrowLeft|ArrowRight)$/.test(e.code)) return true;
    return false;
  }
  pause(on) {
    this.paused = on; if (this.pm) { this.pm.remove(); this.pm = null; } if (!on) return;
    const dev = store.raw(KEYS.dev) === DEV_CODE;
    this.pm = el("div", "le-pause", "<h2>" + t("pPause") + '</h2><button data-d="go">' + t("pGo") + "</button>" + (dev || this.opts.fromEditor ? '<button data-d="editor">' + t("pEditor") + "</button>" : "") + '<button data-d="menu">' + t("pMenu") + "</button>");
    this.pm.addEventListener("click", (e) => { const b = e.target.closest("[data-d]"); if (!b) return; const a = b.getAttribute("data-d"); if (a === "go") this.pause(false); else if (a === "editor") this.app.go("editor"); else this.app.go("menu"); });
    this.app.ui.appendChild(this.pm);
  }
  update(dt) {
    const inp = this.app.input, c = this.cam, p = this.pl, pad = inp.poll();
    // Steuerung relativ zur Kamera
    let f = 0, s = 0, run = inp.k("ShiftLeft", "ShiftRight"), jump = false;
    if (!this.paused && !this.learn) {
      f = (inp.k("KeyW", "ArrowUp") ? 1 : 0) - (inp.k("KeyS", "ArrowDown") ? 1 : 0); s = (inp.k("KeyD", "ArrowRight") ? 1 : 0) - (inp.k("KeyA", "ArrowLeft") ? 1 : 0);
      jump = inp.k("Space");
      if (pad) {
        const ax = pad.axes[0] || 0, ay = pad.axes[1] || 0, rx = pad.axes[2] || 0, ry = pad.axes[3] || 0, dz = (v) => (Math.abs(v) < 0.15 ? 0 : v);
        if (dz(ax) || dz(ay)) { s = dz(ax); f = -dz(ay); run = run || Math.hypot(ax, ay) > 0.92; }
        c.yaw -= dz(rx) * dt * 2.6; c.pitch = clamp(c.pitch + dz(ry) * dt * 1.6, -0.15, 1.35);
        if (pad.buttons[0] && pad.buttons[0].pressed) jump = true;
        const xb = !!(pad.buttons[2] && pad.buttons[2].pressed); if (xb && !this.padX) this.use(); this.padX = xb;
        const st = !!(pad.buttons[9] && pad.buttons[9].pressed); if (st && !this.padSt) this.pause(!this.paused); this.padSt = st;
      }
    }
    const sy = Math.sin(c.yaw), cy = Math.cos(c.yaw), Fx = -sy, Fz = -cy, Rx = cy, Rz = -sy;
    if (!this.paused) p.update(dt, { x: Fx * f + Rx * s, z: Fz * f + Rz * s, run: run, jump: jump });
    // drinnen: höhere Etagen und Dach ausblenden
    this.world.houses.forEach((h) => h.cutAbove(h === p.house ? p.level : null));
    // Interaktion
    if (!this.learn && !this.paused) {
      this.act = this.findAct();
      const pr = document.getElementById("le-prompt");
      const txt = this.act ? "E  " + (this.act.a.type === "tuer" ? t(this.act.a.door.want > 0.5 ? "pShut" : "pOpen") : t("pLearn")) : "";
      if (pr && pr.textContent !== txt) { pr.textContent = txt; pr.style.display = txt ? "" : "none"; }
      const wh = document.getElementById("le-where"), home = this.world.home(), wt = p.house && p.house === home ? t("pHome") : "";
      if (wh && wh.textContent !== wt) wh.textContent = wt;
    }
    this.camera(dt);
  }
  camera(dt) {
    const c = this.cam, p = this.pl, cam = this.app.engine.camera;
    if (this.learnCam) {
      const k = 1 - Math.exp(-dt * 5); c.pos.lerp(this.learnCam.pos, k); c.look.lerp(this.learnCam.look, k);
      cam.position.copy(c.pos); cam.lookAt(c.look); this.app.engine.focus(p.p); return;
    }
    // drinnen: Kamera steiler und näher, damit sie über die Wände ins Zimmer schaut
    c.inside = lerp(c.inside, p.house ? 1 : 0, 1 - Math.exp(-dt * 4));
    const pitch = lerp(c.pitch, Math.max(c.pitch, 0.98), c.inside), dist = lerp(c.dist, clamp(c.dist, 3.6, 6.5), c.inside);
    const tgt = new THREE.Vector3(p.p.x, p.p.y + 1.45, p.p.z), cp = Math.cos(pitch);
    const want = new THREE.Vector3(tgt.x + Math.sin(c.yaw) * cp * dist, tgt.y + Math.sin(pitch) * dist, tgt.z + Math.cos(c.yaw) * cp * dist);
    // Wände zwischen Figur und Kamera: Kamera davor ziehen
    const th = camHit(this.world, tgt, want);
    if (th < 1) want.lerpVectors(tgt, want, Math.max(0.12, th - 0.08));
    const gy = this.world.terrain.heightAt(want.x, want.z) + 0.35; if (want.y < gy) want.y = gy;
    if (c.snap) { c.pos.copy(want); c.look.copy(tgt); c.snap = false; }
    else {
      // heranziehen sofort (nicht durch Wände blicken), wegfahren weich
      const k = 1 - Math.exp(-dt * 10); c.pos.lerp(want, k);
      if (th < 1) c.pos.copy(want);
      c.look.lerp(tgt, 1 - Math.exp(-dt * 14));
    }
    cam.position.copy(c.pos); cam.lookAt(c.look);
    if (cam.fov !== 60) { cam.fov = 60; cam.updateProjectionMatrix(); }
    this.app.engine.focus(p.p);
  }
}
