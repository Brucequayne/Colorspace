// ===== input.js · Tastatur und Controller =====
// Fahren: W/↑ Gas, S/↓ Bremse (im Stand: rückwärts), A/D bzw. ←/→ lenken, Leertaste Handbremse.
// Controller (Standard-Belegung): rechter Trigger Gas, linker Trigger Bremse, linker Stick lenken, A Handbremse, Start Pause.
import { clamp } from "pr/core.js";

export class Input {
  constructor() {
    this.keys = {}; this.pad = null; this.steer = 0; this.prevStart = false;
    this.down = (e) => { const tg = e.target; if (/TEXTAREA|SELECT/.test(tg.tagName) || (tg.tagName === "INPUT" && tg.type !== "range" && tg.type !== "checkbox")) return; this.keys[e.code] = true; };
    this.up = (e) => { this.keys[e.code] = false; };
    this.blur = () => { this.keys = {}; };
    window.addEventListener("keydown", this.down); window.addEventListener("keyup", this.up); window.addEventListener("blur", this.blur);
  }
  dispose() { window.removeEventListener("keydown", this.down); window.removeEventListener("keyup", this.up); window.removeEventListener("blur", this.blur); }
  k(...codes) { return codes.some((c) => this.keys[c]); }
  poll() { const ps = navigator.getGamepads ? navigator.getGamepads() : []; this.pad = null; for (const p of ps) if (p && p.connected) { this.pad = p; break; } return this.pad; }
  // Fahrbefehle (0 … 1, Lenkung -1 … 1, + = rechts)
  drive(dt) {
    const p = this.poll(), o = { throttle: 0, brake: 0, steer: 0, hand: false, pause: false };
    let ks = (this.k("KeyD", "ArrowRight") ? 1 : 0) - (this.k("KeyA", "ArrowLeft") ? 1 : 0);
    // Tastatur-Lenkung weich ein- und ausblenden (zurück zur Mitte schneller)
    const rate = ks === 0 || Math.sign(ks) !== Math.sign(this.steer) ? 5 : 2.6;
    this.steer += clamp(ks - this.steer, -rate * dt, rate * dt);
    o.steer = this.steer; o.throttle = this.k("KeyW", "ArrowUp") ? 1 : 0; o.brake = this.k("KeyS", "ArrowDown") ? 1 : 0; o.hand = this.k("Space");
    if (p) {
      const ax = p.axes[0] || 0, dz = Math.abs(ax) < 0.08 ? 0 : (ax - Math.sign(ax) * 0.08) / 0.92;
      if (Math.abs(dz) > 0.01) { o.steer = Math.sign(dz) * Math.pow(Math.abs(dz), 1.4); this.steer = o.steer; }
      const rt = p.buttons[7] ? p.buttons[7].value : 0, lt = p.buttons[6] ? p.buttons[6].value : 0;
      o.throttle = Math.max(o.throttle, rt); o.brake = Math.max(o.brake, lt);
      if (p.buttons[0] && p.buttons[0].pressed) o.hand = true;
      const st = !!(p.buttons[9] && p.buttons[9].pressed); if (st && !this.prevStart) o.pause = true; this.prevStart = st;
    }
    return o;
  }
}
