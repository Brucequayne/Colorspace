// ===== race.js · Checkpoints, Rundenzeit, Zwischenzeiten (seit v0.14) =====
// Checkpoints sind Straßenpunkte mit cp = 1 auf der Hauptstrecke. Angezeigt werden sie dezent: zwei durchsichtige
// Pfosten links und rechts am Fahrbahnrand. Das Test-Rennen misst Runden auf einem Rundkurs und vergleicht jede
// Zwischenzeit mit der besten Runde (im Browser gespeichert je Strecke).
import * as THREE from "three";
import { store } from "le/core.js";

const BEST_KEY = "leaarn-best-v1";
const POST = new THREE.BoxGeometry(0.22, 4.2, 0.22); POST.translate(0, 2.1, 0);
const COLS = { cp: new THREE.Color("#C6C5B9"), next: new THREE.Color("#62929E"), line: new THREE.Color("#ED6A5E") };

// Checkpoints der Straße R, nach Lage sortiert: [{ d, s }] (d = Meter ab Start, s = Querschnitt)
export function checkpoints(R) {
  if (!R || R.S.length < 2) return [];
  const out = [];
  R.pts.forEach((p, i) => {
    if (!p.cp) return;
    const s = R.S.find((q) => q.seg === i); if (!s) return;
    if (R.closed && (s.d < 5 || s.d > R.len - 5)) return;   // fällt mit Start/Ziel zusammen
    out.push({ d: s.d, s: s, i: i });
  });
  return out.sort((a, b) => a.d - b.d);
}

// Pfosten-Paare für alle Checkpoints (und im Rennen Start/Ziel)
export class CheckpointMarkers {
  constructor(world, withLine) {
    this.world = world; this.withLine = withLine; this.group = new THREE.Group(); this.items = [];
    world.engine.scene.add(this.group);
  }
  build() {
    this.group.children.slice().forEach((m) => { this.group.remove(m); m.material.dispose(); });
    this.items = [];
    const R = this.world.road, cps = checkpoints(R);
    const pair = (s, kind) => {
      const ms = [];
      [-1, 1].forEach((sd) => {
        const off = sd * (s.w / 2 + (sd < 0 ? (s.cl ? 1.3 : 0) : (s.cr ? 1.3 : 0)) + 0.9);
        const m = new THREE.Mesh(POST, new THREE.MeshBasicMaterial({ color: COLS[kind], transparent: true, opacity: 0.28, depthWrite: false }));
        m.position.set(s.p.x + s.r.x * off, s.p.y - off * s.tan - 0.2, s.p.z + s.r.z * off); m.renderOrder = 4; this.group.add(m); ms.push(m);
      });
      return ms;
    };
    cps.forEach((c) => this.items.push({ d: c.d, ms: pair(c.s, "cp") }));
    if (this.withLine && R && R.closed && R.S.length > 1) this.items.push({ d: R.len, line: true, ms: pair(R.S[0], "line") });
  }
  // nächsten Checkpoint hervorheben (Lage d), die anderen bleiben ganz leicht sichtbar
  highlight(d) {
    this.items.forEach((it) => { const on = Math.abs(it.d - d) < 0.5; it.ms.forEach((m) => { m.material.color.copy(it.line ? COLS.line : on ? COLS.next : COLS.cp); m.material.opacity = on ? 0.5 : 0.2; }); });
  }
  dispose() { this.group.children.slice().forEach((m) => m.material.dispose()); this.world.engine.scene.remove(this.group); }
}

// Fortschritt entlang der Hauptstrecke: Meter seit der Startlinie (über Runden hinweg stetig)
export class Race {
  constructor(world, timed) {
    this.world = world; this.R = world.road; this.timed = timed && this.R && this.R.closed;
    this.cps = checkpoints(this.R); this.reset();
    this.key = (world.name || "") + "|" + Math.round(this.R ? this.R.len : 0) + "|" + this.cps.length;
    const all = store.get(BEST_KEY, {}); this.best = all[this.key] || null;   // { t, splits: [...] }
  }
  reset() { this.prev = null; this.P = null; this.lap = 0; this.t = 0; this.running = false; this.next = 0; this.splits = []; this.last = null; this.msg = null; }
  // Meter bis zum nächsten Checkpoint (bzw. Ziel) und dessen Lage
  target() {
    const R = this.R; if (!R || R.S.length < 2) return null;
    if (this.timed) {
      if (this.P == null) return null;
      if (!this.running || this.P < 0) return { d: R.len, m: -this.P };
      const c = this.cps[this.next], d = c ? c.d : R.len; return { d: d, m: d - this.P };
    }
    // Testfahrt: einfach der nächste Checkpoint vor dem Auto
    if (this.cur == null || !this.cps.length) return null;
    const c = this.cps.find((q) => q.d > this.cur + 1) || (R.closed ? this.cps[0] : null); if (!c) return null;
    return { d: c.d, m: c.d > this.cur ? c.d - this.cur : c.d + R.len - this.cur };
  }
  update(dt, pos) {
    const R = this.R; if (!R || R.S.length < 2) return;
    if (this.running) this.t += dt;
    if (this.msg) { this.msg.age += dt; if (this.msg.age > 3) this.msg = null; }
    const q = R.nearest(pos.x, pos.z); if (!q || Math.abs(q.d) > q.w / 2 + 25) return;
    this.cur = q.dist; if (!this.timed) return;
    const L = R.len, d = q.dist;
    if (this.prev == null) { this.prev = d; this.P = d > L / 2 ? d - L : d; return; }
    let dd = d - this.prev; if (dd < -L / 2) dd += L; else if (dd > L / 2) dd -= L;
    this.prev = d; if (Math.abs(dd) > 40) return;   // Sprung (Abkürzung/Neuplatzierung) zählt nicht
    const before = this.P; this.P += dd;
    if (!this.running) { if (before < 0 && this.P >= 0) { this.running = true; this.t = 0; this.lap = 1; this.next = 0; this.splits = []; } return; }
    const c = this.cps[this.next];
    if (c && this.P >= c.d) { this.splits.push(this.t); this.note(this.next, this.t); this.next++; }
    else if (!c && this.P >= L) {   // Runde fertig
      this.splits.push(this.t); const lt = this.t, b = this.best, better = !b || lt < b.t;
      this.msg = { lap: true, t: lt, delta: b ? lt - b.t : null, best: better, age: 0 };
      this.last = lt;
      if (better) { this.best = { t: lt, splits: this.splits.slice() }; const all = store.get(BEST_KEY, {}); all[this.key] = this.best; store.set(BEST_KEY, all); }
      this.P -= L; this.t = 0; this.lap++; this.next = 0; this.splits = [];
    }
  }
  note(k, t) { const b = this.best; this.msg = { k: k, t: t, delta: b && b.splits[k] != null ? t - b.splits[k] : null, age: 0 }; }
}

export function fmtTime(t) { if (t == null) return "–"; const m = Math.floor(t / 60), s = t - m * 60; return m + ":" + (s < 10 ? "0" : "") + s.toFixed(2); }
export function fmtDelta(d) { return (d < 0 ? "−" : "+") + Math.abs(d).toFixed(2); }
