// ===== sound.js · Klänge: Kassen-Klingel beim Einsammeln, Münz-Tick beim Hochzählen =====
// Eigene Datei möglich: leaarn/sounds/kasse.mp3 (wird bevorzugt). Fehlt sie, klingelt eine synthetische Kasse.
let ctx = null, file = null;
function ac() { if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; } } if (ctx && ctx.state === "suspended") ctx.resume(); return ctx; }
export function kasse(stamp) {
  try {
    if (file !== false) {
      const a = new Audio("leaarn/sounds/kasse.mp3" + (stamp ? "?v=" + stamp : "")); a.volume = 0.9;
      a.play().then(() => { file = true; }).catch(() => { file = false; synth(); });
      return;
    }
  } catch (e) { file = false; }
  synth();
}
// Ka-Tsching: Schublade (Rauschen + tiefer Schlag), dann zwei helle Glocken mit leicht unharmonischen Obertönen
function synth() {
  const c = ac(); if (!c) return; const t0 = c.currentTime + 0.01, out = c.createGain(); out.gain.value = 0.5; out.connect(c.destination);
  const nb = c.createBuffer(1, c.sampleRate * 0.25, c.sampleRate), d = nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
  const ns = c.createBufferSource(), bp = c.createBiquadFilter(), ng = c.createGain(); ns.buffer = nb; bp.type = "bandpass"; bp.frequency.value = 2600; bp.Q.value = 0.8; ng.gain.value = 0.5;
  ns.connect(bp); bp.connect(ng); ng.connect(out); ns.start(t0);
  const thump = c.createOscillator(), tg = c.createGain(); thump.frequency.setValueAtTime(160, t0); thump.frequency.exponentialRampToValueAtTime(60, t0 + 0.12);
  tg.gain.setValueAtTime(0.6, t0); tg.gain.exponentialRampToValueAtTime(0.001, t0 + 0.16); thump.connect(tg); tg.connect(out); thump.start(t0); thump.stop(t0 + 0.2);
  [[0.09, 2093], [0.2, 2637]].forEach((b) => {
    const t = t0 + b[0];
    [[1, 0.35], [2.76, 0.12], [5.4, 0.05], [1.5, 0.06]].forEach((p) => {
      const o = c.createOscillator(), g = c.createGain(); o.type = "sine"; o.frequency.value = b[1] * p[0];
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(p[1], t + 0.004); g.gain.exponentialRampToValueAtTime(0.0008, t + 1.1 / Math.sqrt(p[0]));
      o.connect(g); g.connect(out); o.start(t); o.stop(t + 1.3);
    });
  });
}
export function tick(k) {
  const c = ac(); if (!c) return; const t = c.currentTime + 0.005, o = c.createOscillator(), g = c.createGain();
  o.type = "triangle"; o.frequency.value = 1700 + (k || 0) * 60; g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.0008, t + 0.08);
  o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.1);
}
