// ===== engine.js · Renderer, Szene, Kamera, Himmel, Sonne/Mond nach Uhrzeit, Nebel, Schatten, Qualität =====
import * as THREE from "three";
import { clamp, lerp, DEG } from "pr/core.js";

const C = (h) => new THREE.Color(h);
// Himmelsfarben je Sonnenhöhe: [Zenit, Horizont]
const SKY = { day: [C("#4F8FD0"), C("#C4DCEC")], low: [C("#3E5C8E"), C("#F2B27A")], dusk: [C("#1E2648"), C("#7A4E5E")], night: [C("#05070F"), C("#121A2C")] };

export class Engine {
  constructor(host) {
    this.host = host;
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.domElement.className = "pr-cv"; host.appendChild(r.domElement);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.3, 4000);
    this.env = { time: 14, fog: 35, view: 1400 };
    this.q = { shadows: true, scale: 1 };
    // Himmelskugel mit Farbverlauf (Eckfarben)
    const sg = new THREE.SphereGeometry(1, 24, 12);
    sg.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(sg.attributes.position.count * 3), 3));
    this.sky = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
    this.sky.renderOrder = -1; this.scene.add(this.sky);
    this.sunDisc = new THREE.Mesh(new THREE.CircleGeometry(0.025, 20), new THREE.MeshBasicMaterial({ color: 0xFFF4D6, fog: false }));
    this.scene.add(this.sunDisc);
    this.hemi = new THREE.HemisphereLight(0xBFD8F0, 0x4A4636, 1.0); this.scene.add(this.hemi);
    const s = this.sun = new THREE.DirectionalLight(0xFFFFFF, 2.4);
    s.castShadow = true; s.shadow.mapSize.set(2048, 2048);
    const sc = s.shadow.camera; sc.left = -90; sc.right = 90; sc.top = 90; sc.bottom = -90; sc.near = 1; sc.far = 700;
    s.shadow.bias = -0.0004; s.shadow.normalBias = 0.6;
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
    else { this.sun.color.copy(warm); this.sun.intensity = lerp(0.6, 2.5, kd * (0.3 + 0.7 * k)); this.hemi.intensity = lerp(0.45, 1.05, kd); this.hemi.color.copy(zen).lerp(new THREE.Color(0xFFFFFF), 0.45); this.hemi.groundColor.set(0x4A4636).lerp(new THREE.Color(0x1A1814), 1 - kd); }
    this.sunDisc.visible = !night && up > -0.05; this.sunDisc.material.color.copy(warm).lerp(new THREE.Color(0xFFFFFF), 0.4);
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
  render() { this.place(); this.renderer.render(this.scene, this.camera); }
  dispose() {
    this.scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) [].concat(o.material).forEach((m) => m.dispose()); });
    this.renderer.dispose(); this.renderer.domElement.remove();
  }
}
