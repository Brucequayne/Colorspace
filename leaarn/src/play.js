// ===== play.js · Spielen: Figur im Hub (3rd Person), Türen, Schreibtisch → Lernmodus, Geld-Anzeige =====
import * as THREE from "three";
import { t, addTexts, L2, tl, clamp, lerp, el, esc, store, KEYS, DEV_CODE, PR } from "le/core.js";
import { Player, camHit, SCALE } from "le/player.js";
import { Learn } from "le/learn.js";
import { Inventory } from "le/inventory.js";
import { Musik } from "le/musik.js";
import { geld, euro, offen, einsammeln, charakter, setCharakter, fokus, setFokus, FOKUS, hunger, setHunger, HUNGER } from "le/save.js";
import { Makler, kaufbar, frei, hausName, abrechnen, gemietet } from "le/besitz.js";
import { Shop, LADEN } from "le/shop.js";
import { kasse, tick } from "le/sound.js";
import { laden, schritt, untergrund } from "le/schritt.js";
import { Outfit } from "le/outfit.js";
import { outfitPruefen } from "le/kleidung.js";
import { LH } from "le/houses.js";
import { LAGER, ITEMS, inv, sel, take } from "le/items.js";

addTexts({
  pHelp: L2("WASD/Pfeile laufen · Umschalt rennen · Leertaste springen · E benutzen · F essen/trinken (am Kleiderschrank: Outfit) · I Inventar · 1–9 Schnellauswahl · Maus bewegen dreht die Kamera · Rad zoomt · Esc Pause", "WASD/arrows walk · Shift run · Space jump · E use · F eat/drink (at the wardrobe: outfit) · I inventory · 1–9 hotbar · move the mouse to turn the camera · wheel zooms · Esc pause"),
  pHunger: L2("Hunger", "Hunger"), pEat: L2("{n} essen (+{p} %)", "Eat {n} (+{p} %)"), pAte: L2("{n} gegessen · Hunger {p} %", "Ate {n} · hunger {p} %"), pFull: L2("Du bist satt.", "You're full."), pDrink: L2("{n} trinken (+{p} %)", "Drink {n} (+{p} %)"), pDrank: L2("{n} getrunken · Hunger {p} %", "Drank {n} · hunger {p} %"), pFullD: L2("Du magst nichts mehr trinken.", "You can't drink any more."),
  pHungry: L2("Du hast Hunger! Iss etwas (Essen in die Schnellauswahl legen, dann F).", "You're hungry! Eat something (put food in the hotbar, then press F)."),
  pFaint: L2("Du bist vor Hunger ohnmächtig geworden …", "You fainted from hunger …"), pWake: L2("Du bist in deinem Bett aufgewacht. Iss etwas!", "You woke up in your bed. Eat something!"),
  pOpen: L2("Tür öffnen", "Open door"), pShut: L2("Tür schließen", "Close door"), pLearn: L2("Am Laptop lernen", "Learn on the laptop"), pMusic: L2("Ghettoblaster benutzen", "Use the boombox"),
  pHome: L2("Zuhause", "Home"), pPause: L2("Pause", "Paused"), pGo: L2("Weiter", "Continue"), pMenu: L2("Hauptmenü", "Main menu"), pEditor: L2("Zum Map-Editor", "To map editor"),
  pNoHome: L2("Kein Haus in der Map – im Map-Editor ein Haus setzen.", "No house in the map – place one in the map editor."), pEarned: L2("+{n}", "+{n}"),
  pShop: L2("Einkaufen: {n}", "Shop: {n}"), pFocus: L2("Fokus", "Focus"), pFocusFull: L2("+15 % Belohnung", "+15 % reward"),
  pSit: L2("Hinsetzen", "Sit down"), pStand: L2("Aufstehen (E oder Laufen)", "Stand up (E or walk)"), pStore: L2("{n} öffnen", "Open {n}")
});

export class Play {
  constructor(app, opts) {
    this.app = app; this.world = app.world; this.opts = opts || {};
    const ch = charakter(); if (ch && ch.outfit) ch.outfit = outfitPruefen(ch.outfit);   // Outfit nur mit Kleidung, die man noch besitzt (seit v0.21)
    this.pl = new Player(this.world, ch); this.world.sensor = this.pl.p; laden(); this.pl.onStep = (v) => schritt(untergrund(this.world, this.pl.p, this.pl.g), v);   // Automatiktüren reagieren auf den Spieler (seit v0.19.7)
    this.cam = { yaw: 0, pitch: 0.36, dist: 5.2, inside: 0, pos: new THREE.Vector3(), look: new THREE.Vector3(), snap: true };
    this.act = null; this.learn = null; this.paused = false; this.btn = -1;
    this.hud = el("div", "le-hud", '<div class="le-money"><span>' + esc(ch && ch.name ? ch.name : "") + '</span><b id="le-money"></b></div><div class="le-gain" id="le-gain"></div><div class="le-prompt" id="le-prompt"></div><div class="le-focus" id="le-focus"><span>' + t("pFocus") + '</span><i><b id="le-fbar"></b></i><em id="le-fpct"></em></div><div class="le-hunger" id="le-hunger"><span>' + t("pHunger") + '</span><i><b id="le-hbar"></b></i><em id="le-hpct"></em></div><div class="le-where" id="le-where"></div><div class="le-help">' + t("pHelp") + "</div>");
    app.ui.appendChild(this.hud); this.shown = geld(); this.money();
    this.inv = new Inventory(app); this.musik = new Musik(app);
    this.shop = new Shop(app, () => { this.inv.draw(); this.shown = geld(); this.money(); const box = this.hud.querySelector(".le-money"); box.classList.remove("le-bump"); void box.offsetWidth; box.classList.add("le-bump"); });
    this.fk = fokus(); this.fkSave = 0; this.focusUi(true);
    // Hunger und Häuser (seit v0.20)
    this.hu = hunger(); this.huSave = 0; this.huUi(true); this.rentT = 0;
    this.outfit = new Outfit(app, (o) => this.wear(o));   // Kleiderschrank: F (seit v0.21)
    this.mk = new Makler(app, (k, a) => { this.shown = geld(); this.money(); if (a === "cancel") this.lockDoors(k); });
    this.rent();
    this.spawn();
    const c = app.engine.renderer.domElement;
    this.onDown = (e) => { if (this.learn || this.paused) return; this.btn = e.button; this.last = [e.clientX, e.clientY]; const ae = document.activeElement; if (ae && ae.blur && ae !== document.body) ae.blur(); };
    this.onMove = (e) => { if (document.pointerLockElement === c) { this.cam.yaw -= e.movementX * 0.0028; this.cam.pitch = clamp(this.cam.pitch + e.movementY * 0.0022, -0.15, 1.35); return; }   // Maus gefangen: Kamera wie im Shooter (seit v0.20.2)
      if (this.btn < 0) return; const dx = e.clientX - this.last[0], dy = e.clientY - this.last[1]; this.last = [e.clientX, e.clientY]; this.cam.yaw -= dx * 0.0055; this.cam.pitch = clamp(this.cam.pitch + dy * 0.004, -0.15, 1.35); };
    this.onUp = () => { this.btn = -1; };
    this.onWheel = (e) => { e.preventDefault(); if (!this.learn) this.cam.dist = clamp(this.cam.dist * Math.exp(e.deltaY * 0.0012), 2.2, 12); };
    this.onCtx = (e) => e.preventDefault();
    this.gest = 0; this.lockAt = 0; this.lockLost = 0; this.wasLocked = false;
    this.onGest = () => { this.gest = performance.now(); };   // Mausfang geht nur nach Klick oder Taste
    this.onLock = () => { const on = document.pointerLockElement === c; if (this.wasLocked && !on) { if (this.selfUnlock) this.selfUnlock = false; /* selbst freigegeben (Fenster offen): keine Pause */ else { this.lockLost = performance.now(); if (!this.paused && !this.learn && !this.faint) this.pause(true); } } this.wasLocked = on; };
    window.addEventListener("pointerdown", this.onGest, true); window.addEventListener("keydown", this.onGest, true); document.addEventListener("pointerlockchange", this.onLock);
    c.addEventListener("pointerdown", this.onDown); window.addEventListener("pointermove", this.onMove); window.addEventListener("pointerup", this.onUp);
    c.addEventListener("wheel", this.onWheel, { passive: false }); c.addEventListener("contextmenu", this.onCtx);
  }
  dispose() {
    this.inv.dispose(); this.musik.dispose(); this.shop.dispose(); this.mk.dispose(); this.outfit.dispose(); setFokus(this.fk); setHunger(this.hu); if (this.fadeEl) this.fadeEl.remove();
    const c = this.app.engine.renderer.domElement;
    window.removeEventListener("pointerdown", this.onGest, true); window.removeEventListener("keydown", this.onGest, true); document.removeEventListener("pointerlockchange", this.onLock); if (document.pointerLockElement) document.exitPointerLock();
    c.removeEventListener("pointerdown", this.onDown); window.removeEventListener("pointermove", this.onMove); window.removeEventListener("pointerup", this.onUp);
    c.removeEventListener("wheel", this.onWheel); c.removeEventListener("contextmenu", this.onCtx);
    if (this.learn) this.learn.dispose(); if (this.pm) this.pm.remove();
    this.world.houses.forEach((h) => h.cutAbove(null)); this.world.sensor = null;
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
        if (a.l !== this.pl.level || a.desk) continue;   // Stuhl am Schreibtisch: nur über den Laptop
        const w = h.toWorld(a.x, a.z), d = Math.hypot(w.x - p.x, w.z - p.z), lim = a.type === "tuer" ? 1.5 : a.type === "musik" ? 1.25 : a.type === "lager" ? 1.2 : a.type === "sitzen" ? 0.95 : 1.05;
        if (d < lim && d < bd) { bd = d; best = { a: a, h: h }; }
      }
    }
    // abgeschlossenes Haus (seit v0.20): von außen öffnet die Tür den Makler-Dialog (von innen geht sie immer auf)
    if (best && best.a.type === "tuer" && !frei(best.h.e.k) && !this.inSide(best.h, best.a.door) && best.a.door.want < 0.5) best = { a: { type: "kauf", k: best.h.e.k }, h: best.h };
    return best;
  }
  // steht die Figur auf der Innenseite der Tür? (Seite mit Boden auf derselben Etage; unter einem Balkon zählt als draußen)
  inSide(h, d) { const q = h.toLocal(this.pl.p.x, this.pl.p.z), sd = (q.x - d.cx) * d.nx + (q.z - d.cz) * d.nz < 0 ? -1 : 1; return h.b.cells.has(Math.floor(d.cx + d.nx * 0.5 * sd) + "," + Math.floor(d.cz + d.nz * 0.5 * sd) + "," + d.l); }
  // Kleiderschrank in Reichweite? (seit v0.21)
  wardrobe() { const A = this.act; return !this.seat && A && A.a.type === "lager" && A.a.lager === "kleidung" ? A : null; }
  openOutfit() {
    const A = this.wardrobe(); if (!A) return; const ch = charakter() || {};
    this.outfit.show(this.storeKey(A.h, A.a), ch.outfit); this.cam.yaw = this.pl.face;   // Kamera vor die Figur, damit man das Outfit sieht
  }
  wear(o) { const ch = charakter() || {}; ch.outfit = o; setCharakter(ch); this.pl.relook(ch); }
  use() {
    if (this.seat) { this.stand(); return; }
    const A = this.act; if (!A) return;
    if (A.a.type === "tuer") { const d = A.a.door; d.want = d.want > 0.5 ? 0 : 1; }
    else if (A.a.type === "kauf") this.mk.show(A.a.k);
    else if (A.a.type === "lernen") this.openLearn(A);
    else if (A.a.type === "musik") { const w = A.h.toWorld(A.a.cx, A.a.cz); this.musik.show({ x: w.x, z: w.z }); }
    else if (A.a.type === "sitzen") this.sit(A.h, A.a, "rest");
    else if (A.a.type === "lager") this.inv.openStore(this.storeKey(A.h, A.a), A.a.lager);
    else if (A.a.type === "laden") this.shop.show(A.a.laden);
  }
  // Speicherplatz eines Möbel-Lagers: Zuhause (bleibt erhalten, wenn das Haus verschoben wird) oder Haus nach Art und Lage + Bauteil-Nummer
  storeKey(h, a) { const e = h.e; return (e.home ? "home" : e.k + "@" + Math.round(e.x) + "," + Math.round(e.z)) + ":" + a.pi; }
  // ---------- Sitzen (seit v0.16) ----------
  sit(h, a, pose) {
    const k = pose === "lap" ? 0.12 : 0, w = h.toWorld(a.sx + a.fx * k, a.sz + a.fz * k), f = h.dirToWorld(a.fx, a.fz);   // am Laptop etwas an den Tisch gerückt
    this.pl.sitDown(w.x, w.z, h.e.y + a.y, Math.atan2(f.x, f.z), a.h - a.y, pose); this.seat = { h: h, a: a };
  }
  // Aufstehen: freie Stelle vor, neben oder hinter dem Sitz (die mit der wenigsten Kollision)
  stand() {
    const S = this.seat; if (!S) return; this.seat = null;
    const h = S.h, a = S.a, y = h.e.y + a.y, sx = -a.fz, sz = a.fx;
    const cand = [[a.fx * 0.62, a.fz * 0.62], [0, 0], [sx * 0.62, sz * 0.62], [-sx * 0.62, -sz * 0.62], [-a.fx * 0.6, -a.fz * 0.6]];
    let best = null, bd = 1e9;
    for (const c of cand) {
      const w = h.toWorld(a.sx + c[0], a.sz + c[1]), q = new THREE.Vector3(w.x, y, w.z); this.pl.collide(q);
      const d = Math.hypot(q.x - w.x, q.z - w.z); if (d < bd - 1e-3) { bd = d; best = q; } if (d < 0.04) break;
    }
    this.pl.standUp(best.x, best.z, y);
  }
  openLearn(A) {
    const a = A.a, h = A.h, w = h.toWorld(a.x, a.z), f = h.dirToWorld(a.fx, a.fz);
    if (a.seat) this.sit(h, a.seat, "lap");   // Stuhl am Schreibtisch: automatisch hinsetzen
    else { this.pl.place(w.x, w.z, Math.atan2(-f.x, -f.z)); this.pl.p.y = h.e.y + a.y; }
    this.pl.frozen = true;
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
    if (this.seat) this.stand();   // Laptop zu: wieder aufstehen
    if (n) this.collect(n, r ? { left: r.left + r.width / 2 - 60, top: r.top + r.height / 2 - 30, width: 120, height: 60 } : null); else { this.shown = geld(); this.money(); }
  }
  gain(n) { const g = document.getElementById("le-gain"); if (!g) return; g.textContent = "+" + euro(n); g.classList.remove("le-show"); void g.offsetWidth; g.classList.add("le-show"); }
  key(e) {
    if (this.inv.open) { if (e.code === "KeyI" || e.code === "Escape" || (e.code === "KeyE" && this.inv.store && !e.repeat)) { this.inv.toggle(false); return true; } return false; }
    if (this.outfit.open) { if ((e.code === "KeyF" && !e.repeat) || (e.code === "KeyE" && !e.repeat) || e.code === "Escape") { this.outfit.hide(); return true; } return false; }
    if (this.shop.open) { if ((e.code === "KeyE" && !e.repeat) || e.code === "Escape") { this.shop.hide(); return true; } return false; }
    if (this.mk.open) { if ((e.code === "KeyE" && !e.repeat) || e.code === "Escape") { this.mk.hide(); return true; } return false; }
    if (this.faint) return true;
    if (this.musik.open && !this.learn) { if (e.code === "KeyE" || e.code === "Escape") { this.musik.hide(); return true; } return false; }
    if (this.learn) return this.learn.key(e);
    if (e.code === "Escape") { if (performance.now() - this.lockLost < 300) return true; this.pause(!this.paused); return true; }   // Esc hat die Maus schon freigegeben und pausiert
    if (this.paused) return false;
    if (e.code === "KeyE" && !e.repeat) { this.use(); return true; }
    if (e.code === "KeyI" && !e.repeat) { this.inv.toggle(true); return true; }
    if (e.code === "KeyF" && !e.repeat) { if (this.wardrobe()) this.openOutfit(); else this.eat(); return true; }   // am Kleiderschrank: Outfit (seit v0.21)
    if (/^Digit[1-9]$/.test(e.code)) { this.inv.select(+e.code.slice(5) - 1); return true; }
    if (/^(Space|ArrowUp|ArrowDown|ArrowLeft|ArrowRight)$/.test(e.code)) return true;
    return false;
  }
  pause(on) {
    this.paused = on; if (this.pm) { this.pm.remove(); this.pm = null; } if (!on) return;
    const dev = store.raw(KEYS.dev) === DEV_CODE;
    this.pm = el("div", "le-pause", "<h2>" + t("pPause") + '</h2><button data-d="go">' + t("pGo") + "</button>" + gemietet().map((k) => '<button data-d="lease" data-k="' + k + '">' + t("bLease").replace("{n}", esc(hausName(k))) + "</button>").join("") + (dev || this.opts.fromEditor ? '<button data-d="editor">' + t("pEditor") + "</button>" : "") + '<button data-d="menu">' + t("pMenu") + "</button>");
    this.pm.addEventListener("click", (e) => { const b = e.target.closest("[data-d]"); if (!b) return; const a = b.getAttribute("data-d"); if (a === "go") this.pause(false); else if (a === "lease") { this.pause(false); this.mk.show(b.getAttribute("data-k")); } else if (a === "editor") this.app.go("editor"); else this.app.go("menu"); });
    this.app.ui.appendChild(this.pm);
  }
  update(dt) {
    const inp = this.app.input, c = this.cam, p = this.pl, pad = inp.poll();
    // Steuerung relativ zur Kamera
    let f = 0, s = 0, run = inp.k("ShiftLeft", "ShiftRight"), jump = false;
    const busy = this.inv.open || this.musik.open || this.shop.open || this.mk.open || this.outfit.open || this.faint;
    { const cv = this.app.engine.renderer.domElement, want = !this.paused && !this.learn && !busy, on = document.pointerLockElement === cv, now = performance.now();
      if (!want && on) { this.selfUnlock = true; document.exitPointerLock(); }
      else if (want && !on && now - this.gest < 4000 && now - this.lockAt > 600 && document.hasFocus()) { this.lockAt = now; try { const r = cv.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) { } } }   // Maus fangen, solange man herumläuft
    if (!this.paused && !this.learn && !busy) {
      f = (inp.k("KeyW", "ArrowUp") ? 1 : 0) - (inp.k("KeyS", "ArrowDown") ? 1 : 0); s = (inp.k("KeyD", "ArrowRight") ? 1 : 0) - (inp.k("KeyA", "ArrowLeft") ? 1 : 0);
      jump = inp.k("Space");
      if (this.seat && (f || s || jump)) { this.stand(); jump = false; }   // Laufen oder Springen: aufstehen
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
      const A = this.act ? this.act.a : null;
      const it = this.food(), txt = this.seat ? "E  " + t("pStand") : A ? "E  " + (A.type === "kauf" ? t("bPrompt").replace("{n}", hausName(A.k)) : A.type === "tuer" ? t(A.door.want > 0.5 ? "pShut" : "pOpen") : A.type === "musik" ? t("pMusic") : A.type === "sitzen" ? t("pSit") : A.type === "lager" ? fmtN(t("pStore"), tl(LAGER[A.lager].n)) + (A.lager === "kleidung" ? "   F  " + t("pOutfit") : "") : A.type === "laden" ? fmtN(t("pShop"), tl((LADEN[A.laden] || LADEN.allg).n)) : t("pLearn")) : it ? "F  " + t(it.trink ? "pDrink" : "pEat").replace("{n}", tl(it.n)).replace("{p}", Math.round(it.satt * 100)) : "";
      if (pr && pr.textContent !== txt) { pr.textContent = txt; pr.style.display = txt ? "" : "none"; }
      const wh = document.getElementById("le-where"), home = this.world.home(), wt = p.house && p.house === home ? t("pHome") : "";
      if (wh && wh.textContent !== wt) wh.textContent = wt;
    }
    this.musik.update(this.pl.p);
    this.focusTick(dt);
    this.hungerTick(dt);
    if ((this.rentT += dt) > 30) { this.rentT = 0; this.rent(); }
    this.camera(dt);
  }
  // ---------- Hunger (seit v0.20) ----------
  hungerTick(dt) {
    if (this.paused || this.faint) return;
    const h0 = this.hu; this.hu = Math.max(0, this.hu - dt / HUNGER.leer);
    if (h0 > HUNGER.warn && this.hu <= HUNGER.warn) this.app.toast(t("pHungry"));
    setHunger(this.hu, true); if ((this.huSave += dt) > 5) { this.huSave = 0; setHunger(this.hu); }
    this.huUi(false);
    if (this.hu <= 0) this.faintNow();
  }
  huUi(force) {
    const pct = Math.ceil(this.hu * 100 - 1e-6); if (!force && pct === this.huKey) return; this.huKey = pct;
    const b = document.getElementById("le-hbar"), p = document.getElementById("le-hpct"), box = document.getElementById("le-hunger"); if (!b) return;
    b.style.width = (this.hu * 100).toFixed(1) + "%"; p.textContent = pct + " %"; box.classList.toggle("le-low", this.hu <= HUNGER.warn);
  }
  // Essen in der Schnellauswahl (gewählter Platz)
  food() { const s = inv()[sel()], it = s && ITEMS[s.id]; return it && it.satt ? it : null; }
  eat() {
    const it = this.food(); if (!it) return;
    if (this.hu >= 0.995) { this.app.toast(t(it.trink ? "pFullD" : "pFull")); return; }
    if (!take(sel(), 1)) return;
    this.hu = Math.min(1, this.hu + it.satt); setHunger(this.hu); this.huUi(true); this.inv.draw(); tick(1);
    this.app.toast(t(it.trink ? "pDrank" : "pAte").replace("{n}", tl(it.n)).replace("{p}", Math.ceil(this.hu * 100 - 1e-6)));
  }
  // Ohnmacht: Bild wird schwarz, alles schließt, man wacht im Bett des Zuhauses sitzend auf (25 % Hunger)
  faintNow() {
    if (this.faint) return; this.faint = true;
    if (this.learn) this.closeLearn(); this.shop.hide(); this.mk.hide(); if (this.inv.open) this.inv.toggle(false); this.musik.hide(); if (this.seat) this.stand();
    const f = this.fadeEl = el("div", "le-faint", "<p>" + t("pFaint") + "</p>"); this.app.ui.appendChild(f);
    requestAnimationFrame(() => f.classList.add("le-on"));
    setTimeout(() => {
      if (!this.fadeEl) return;
      this.hu = HUNGER.wach; setHunger(this.hu); this.huUi(true);
      const bed = this.bed(); if (bed) this.sit(bed.h, bed.a, "rest"); else this.spawn();
      this.cam.snap = true; f.querySelector("p").textContent = t("pWake");
      setTimeout(() => { f.classList.remove("le-on"); setTimeout(() => { f.remove(); if (this.fadeEl === f) this.fadeEl = null; this.faint = false; }, 1300); }, 1400);
    }, 2200);
  }
  // Bett im Zuhause (sonst in einem Haus, das einem gehört)
  bed() {
    const hs = this.world.houses, home = this.world.home(), list = [home].concat(hs.filter((h) => h !== home && kaufbar(h.e.k) && frei(h.e.k))).filter(Boolean);
    for (const h of list) { const a = h.b.acts.find((x) => x.type === "sitzen" && x.id === "bett"); if (a) return { h: h, a: a }; }
    return null;
  }
  // ---------- Miete (seit v0.20) ----------
  rent() { const r = abrechnen(); r.msg.forEach((m) => this.app.toast(m)); r.ended.forEach((k) => this.lockDoors(k)); if (r.msg.length) { this.shown = geld(); this.money(); } }
  lockDoors(k) { this.world.houses.forEach((h) => { if (h.e.k === k && this.pl.house !== h) h.b.doors.forEach((d) => { if (!d.auto) d.want = 0; }); }); }   // wer drin ist, kommt über die Innenseite raus
  // ---------- Fokus (seit v0.17) ----------
  // lädt nur während einer Lern-Challenge (nicht im Laptop-Menü), sinkt in der offenen Welt, steht in Pause und Laptop-Menü
  focusTick(dt) {
    const L = this.learn, active = !!(L && L.view === "quiz"), roam = !L && !this.paused, f0 = this.fk;
    if (active) this.fk = Math.min(1, this.fk + dt / FOKUS.laden); else if (roam) this.fk = Math.max(0, this.fk - dt / FOKUS.entladen);
    if (this.fk !== f0) { setFokus(this.fk, true); this.fkSave += dt; if (this.fkSave > 5 || (this.fk >= 1) !== (f0 >= 1) || this.fk === 0) { this.fkSave = 0; setFokus(this.fk); } }
    this.focusUi(false, active);
    if (L && L.setFokus) L.setFokus(this.fk, active);
  }
  focusUi(force, up) {
    const pct = Math.floor(this.fk * 100 + 1e-6), key = pct + (up ? "u" : "");
    if (!force && key === this.fkKey) return; this.fkKey = key;
    const b = document.getElementById("le-fbar"), p = document.getElementById("le-fpct"), box = document.getElementById("le-focus"); if (!b) return;
    b.style.width = (this.fk * 100).toFixed(1) + "%"; const full = this.fk >= 0.999;
    p.textContent = full ? t("pFocusFull") : pct + " %"; box.classList.toggle("le-full", full); box.classList.toggle("le-up", !!up);
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
    const tgt = new THREE.Vector3(p.p.x, p.p.y + 1.45 * SCALE + (p.sit ? p.sit.dy : 0), p.p.z), cp = Math.cos(pitch);
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
function fmtN(s, n) { return s.replace("{n}", n); }
