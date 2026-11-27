// ===== engine.js · Renderer, Szene, Kamera, Himmel, Sonne/Mond nach Uhrzeit, Nebel, Schatten, Qualität =====
import * as THREE from "three";
import { clamp, lerp, DEG } from "le/core.js";

const C = (h) => new THREE.Color(h);
// weicher Lichtschein und Ring für Sonne und Linsenreflex (Canvas-Texturen, seit v0.21.1)
function glowTexture() {
  const cv = document.createElement("canvas"); cv.width = cv.height = 128; const g = cv.getContext("2d"), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.18, "rgba(255,250,235,0.75)"); gr.addColorStop(0.5, "rgba(255,240,210,0.18)"); gr.addColorStop(1, "rgba(255,240,210,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function ringTexture() {
  const cv = document.createElement("canvas"); cv.width = cv.height = 128; const g = cv.getContext("2d"), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(255,255,255,0.08)"); gr.addColorStop(0.62, "rgba(255,255,255,0.12)"); gr.addColorStop(0.78, "rgba(255,255,255,0.6)"); gr.addColorStop(0.88, "rgba(255,255,255,0.1)"); gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// Himmelsfarben je Sonnenhöhe: [Zenit, Horizont]
const SKY = { day: [C("#4F8FD0"), C("#C4DCEC")], low: [C("#3E5C8E"), C("#F2B27A")], dusk: [C("#1E2648"), C("#7A4E5E")], night: [C("#05070F"), C("#121A2C")] };

export class Engine {
  constructor(host) {
    this.host = host;
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance", stencil: true });   // Stencil: Pool-Becken (seit v0.21.1)
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.domElement.className = "le-cv"; host.appendChild(r.domElement);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.3, 4000);
    this.env = { time: 14, fog: 35, view: 1400 };
    this.q = { shadows: true, scale: 1 };
    // Himmelskugel mit Farbverlauf (Eckfarben)
    const sg = new THREE.SphereGeometry(1, 24, 12);
    sg.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(sg.attributes.position.count * 3), 3));
    this.sky = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
    this.sky.renderOrder = -1; this.scene.add(this.sky);
    // Sonne (seit v0.21.1): Low-Poly-Kugel mit Strahlenkranz und weichem Schein; Linsenreflex siehe flare()
    this.sunDisc = new THREE.Group();
    const sunM = new THREE.MeshBasicMaterial({ color: 0xFFF4D6, fog: false });
    this.sunCore = new THREE.Mesh(new THREE.IcosahedronGeometry(0.016, 1), sunM); this.sunDisc.add(this.sunCore);
    const rays = new THREE.Group(); for (let i = 0; i < 12; i++) { const m = new THREE.Mesh(new THREE.ConeGeometry(0.0035, 0.012, 3), sunM); const a = i / 12 * Math.PI * 2; m.position.set(Math.cos(a) * 0.022, Math.sin(a) * 0.022, 0); m.rotation.z = a - Math.PI / 2; rays.add(m); }
    this.sunRays = rays; this.sunDisc.add(rays);
    this.glowTex = glowTexture(); this.ringTex = ringTexture();
    this.sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, color: 0xFFE7B0, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    this.sunGlow.scale.setScalar(0.16); this.sunDisc.add(this.sunGlow);
    this.sunDisc.traverse((o) => { o.renderOrder = -0.5; });
    this.scene.add(this.sunDisc);
    // Linsenreflex: eigene Szene über dem Bild (Bildschirm-Koordinaten), additiv
    this.flareScene = new THREE.Scene(); this.flareCam = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1); this.flareVis = 0; this.occluder = null; this.occT = 0; this.occ = false;
    this.flares = [[0, 0.5, 0, "#FFF2CF", 0.55], [0.32, 0.05, 0, "#ED6A5E", 0.35], [0.5, 0.11, 1, "#62929E", 0.35], [0.72, 0.035, 0, "#F2E6A0", 0.45], [1.0, 0.16, 1, "#C6C5B9", 0.22], [1.25, 0.07, 0, "#62929E", 0.3], [1.55, 0.24, 1, "#ED6A5E", 0.16], [1.8, 0.05, 0, "#FFF2CF", 0.25]]
      .map((f) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: f[2] ? this.ringTex : this.glowTex, color: f[3], transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false })); this.flareScene.add(m); return { m: m, t: f[0], s: f[1], o: f[4] }; });
    this.hemi = new THREE.HemisphereLight(0xBFD8F0, 0x4A4636, 1.0); this.scene.add(this.hemi);
    const s = this.sun = new THREE.DirectionalLight(0xFFFFFF, 2.4);
    s.castShadow = true; s.shadow.mapSize.set(2048, 2048);
    const sc = s.shadow.camera; sc.left = -90; sc.right = 90; sc.top = 90; sc.bottom = -90; sc.near = 1; sc.far = 700;
    s.shadow.bias = -0.0003; s.shadow.normalBias = 0.5;
    this.scene.add(s); this.scene.add(s.target);
    this.scene.fog = new THREE.Fog(0xC4DCEC, 200, 1400);
    this.focusAt = new THREE.Vector3();
    this.sunDir = new THREE.Vector3(0, 1, 0);
    this.setEnv({});
    this.resize();
  }
  // Uhrzeit 0–24: Sonne geht um 6 im Osten auf, um 18 im Westen unter; nachts leuchtet der Mond schwach bläulich
  setEnv(o) {
    Object.assign(this.env, o);
    const h = this.env.time, day = (h - 6) / 12, el = Math.sin(day * Math.PI) * 62 * DEG, az = (day * 180 - 90) * DEG;
    const up = Math.sin(el), night = up < -0.08;
    let dir;
    if (!night) dir = new THREE.Vector3(Math.cos(az) * Math.cos(el), Math.max(0.03, up), Math.sin(az) * Math.cos(el) * 0.5 + 0.35);
    else { const md = (((h + 12) % 24) - 6) / 12, mel = Math.sin(md * Math.PI) * 50 * DEG; dir = new THREE.Vector3(Math.cos((md * 180 - 90) * DEG), Math.max(0.2, Math.sin(mel)), 0.3); }
    this.sunDir.copy(dir.normalize());
    const k = clamp(up / 0.35, 0, 1), kd = clamp((up + 0.12) / 0.15, 0, 1);   // k: Tag (1) bis tief, kd: Dämmerung
    const zen = new THREE.Color(), hor = new THREE.Color();
    if (k > 0) { zen.lerpColors(SKY.low[0], SKY.day[0], k); hor.lerpColors(SKY.low[1], SKY.day[1], k); }
    else { zen.lerpColors(SKY.dusk[0], SKY.low[0], kd); hor.lerpColors(SKY.dusk[1], SKY.low[1], kd); if (kd <= 0) { zen.copy(SKY.night[0]); hor.copy(SKY.night[1]); } else if (up < 0) { zen.lerpColors(SKY.night[0], zen, kd); hor.lerpColors(SKY.night[1], hor, kd); } }
    const pos = this.sky.geometry.attributes.position, col = this.sky.geometry.attributes.color, c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); c.lerpColors(hor, zen, clamp(Math.pow(Math.max(0, y), 0.6), 0, 1)); if (y < 0) c.copy(hor).multiplyScalar(0.85); col.setXYZ(i, c.r, c.g, c.b); }
    col.needsUpdate = true;
    // Licht
    const warm = new THREE.Color(0xFFFFFF).lerp(new THREE.Color(0xFF9A50), 1 - k);
    if (night) { this.sun.color.set(0x8FA6D8); this.sun.intensity = 0.35; this.hemi.intensity = 0.35; this.hemi.color.set(0x41507A); this.hemi.groundColor.set(0x14161C); }
    else { this.sun.color.copy(warm); this.sun.intensity = lerp(0.6, 2.9, kd * (0.3 + 0.7 * k)); this.hemi.intensity = lerp(0.42, 0.85, kd); /* seit v0.21.1: mehr Sonne, weniger Umgebungslicht → deutlichere Schatten */ this.hemi.color.copy(zen).lerp(new THREE.Color(0xFFFFFF), 0.45); this.hemi.groundColor.set(0x4A4636).lerp(new THREE.Color(0x1A1814), 1 - kd); }
    this.sunDisc.visible = !night && up > -0.05; this.sunCore.material.color.copy(warm).lerp(new THREE.Color(0xFFFFFF), 0.4); this.sunGlow.material.color.copy(warm).lerp(new THREE.Color(0xFFE7B0), 0.5); this.night = night || up < -0.02;
    const dens = this.env.fog / 100, far = this.env.view;
    this.scene.fog.color.copy(hor); this.scene.fog.near = lerp(far * 0.9, 40, dens); this.scene.fog.far = lerp(far * 1.2, far * 0.35 + 150, dens);
    this.camera.far = Math.max(600, far * 1.3); this.camera.updateProjectionMatrix();
  }
  // Schatten folgen dem Blickpunkt (Kamera-Ziel bzw. Auto)
  focus(v) {
    this.focusAt.copy(v);
    const s = this.sun; s.target.position.copy(v); s.position.copy(v).addScaledVector(this.sunDir, 300);
    this.place();
  }
  // Himmel und Sonnenscheibe immer knapp innerhalb der Sichtweite um die Kamera
  place() {
    const c = this.camera, r = c.far * 0.9;
    this.sky.position.copy(c.position); this.sky.scale.setScalar(r);
    this.sunDisc.position.copy(c.position).addScaledVector(this.sunDir, r * 0.95); this.sunDisc.scale.setScalar(r); this.sunDisc.lookAt(c.position);
    this.sunRays.rotation.z = performance.now() * 0.00004;
  }
  // Linsenreflex (seit v0.21.1): Sonne im Bild und nicht verdeckt → Lichtflecken entlang der Linie Sonne → Bildmitte
  flare() {
    const c = this.camera, v = this.sunDisc.position.clone().project(c), front = c.getWorldDirection(new THREE.Vector3()).dot(this.sunDir) > 0;
    let want = 0;
    if (front && !this.night && this.sunDisc.visible && Math.abs(v.x) < 1.15 && Math.abs(v.y) < 1.15) {
      const now = performance.now(); if (now - this.occT > 120) { this.occT = now; this.occ = this.occluder ? !!this.occluder(c.position, this.sunDir) : false; }
      if (!this.occ) want = Math.max(0, 1 - Math.max(Math.abs(v.x), Math.abs(v.y)) / 1.15) * clamp(this.sunDir.y * 6, 0, 1);
    }
    this.flareVis = lerp(this.flareVis, want, want > this.flareVis ? 0.18 : 0.4);
    if (this.flareVis < 0.01) return false;
    const asp = c.aspect; this.flareCam.left = -asp; this.flareCam.right = asp; this.flareCam.updateProjectionMatrix();
    const sx = v.x * asp, sy = v.y;
    this.flares.forEach((f) => { const k = 1 - f.t; f.m.position.set(sx * k, sy * k, 0); f.m.scale.setScalar(f.s); f.m.material.opacity = f.o * this.flareVis; });
    return true;
  }
  quality(q) {
    Object.assign(this.q, q);
    this.renderer.shadowMap.enabled = !!this.q.shadows; this.sun.castShadow = !!this.q.shadows;
    this.scene.traverse((o) => { if (o.material) [].concat(o.material).forEach((m) => { m.needsUpdate = true; }); });
    this.resize();
  }
  resize() {
    const w = this.host.clientWidth || window.innerWidth, h = this.host.clientHeight || window.innerHeight;
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1) * this.q.scale);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / Math.max(1, h); this.camera.updateProjectionMatrix();
  }
  render() {
    this.place(); const r = this.renderer; r.render(this.scene, this.camera);
    if (this.flare()) { r.autoClear = false; r.clearDepth(); r.render(this.flareScene, this.flareCam); r.autoClear = true; }
  }
  dispose() {
    this.scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) [].concat(o.material).forEach((m) => m.dispose()); });
    this.renderer.dispose(); this.renderer.domElement.remove();
  }
}
