// ===== schritt.js · Schrittgeräusche (seit v0.20.1) =====
// Dateien (aus Shizuku): leaarn/sounds/step_hart_1–7.mp3 (fester Untergrund), step_gras_1–7.mp3 (Gras/Moos).
// Stein und Straße = hart, Gras = Gras, Erde = beide gemischt, dumpf gefiltert und eine Terz tiefer.
import { PR } from "le/core.js";
const N = 7; let ctx = null, buf = null, last = -1, lastKind = "";
function ac() { if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; } } if (ctx && ctx.state === "suspended") ctx.resume(); return ctx; }
export function laden() {
  if (buf) return; const c = ac(); if (!c) return; buf = { hart: [], gras: [] };
  ["hart", "gras"].forEach((k) => { for (let i = 1; i <= N; i++) {
    fetch("leaarn/sounds/step_" + k + "_" + i + ".mp3" + (PR.stamp ? "?v=" + PR.stamp : "")).then((r) => r.arrayBuffer()).then((a) => new Promise((ok, no) => c.decodeAudioData(a, ok, no))).then((b) => { buf[k].push(b); }).catch(() => {});
  } });
}
// art: "hart" | "gras" | "erde"; lauf: Tempo (m/s)
export function schritt(art, lauf) {
  const c = ac(); if (!c || !buf) return; const erde = art === "erde";
  const set = erde ? (Math.random() < 0.5 ? buf.hart : buf.gras) : buf[art]; if (!set || !set.length) return;
  let i = Math.floor(Math.random() * set.length); if (set.length > 1 && i === last && art === lastKind) i = (i + 1) % set.length; last = i; lastKind = art;
  const s = c.createBufferSource(), g = c.createGain(); s.buffer = set[i];
  s.playbackRate.value = (erde ? 0.8 : 1) * (0.94 + Math.random() * 0.12);   // Erde: transponiert nach unten
  g.gain.value = Math.min(0.9, (erde ? 0.75 : 0.5) * (0.65 + 0.35 * Math.min(1.6, lauf / 3.6)));
  let n = s; if (erde) { const f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 750; f.Q.value = 0.5; s.connect(f); n = f; }   // deutlich dumpfer
  n.connect(g); g.connect(c.destination); s.start();
}
export function untergrund(world, p, g) {
  if (g.kind !== "terrain" || p.y > g.h + 0.08) return "hart";   // Straße, Gehweg, Hausboden
  const L = world.terrain.layerAt(p.x, p.z);
  return L === 3 ? "erde" : (L === 4 || L === 6) ? "hart" : "gras";   // Erde / Kies, Fels / übrige (Gras, Wald, Sand, Schnee)
}
