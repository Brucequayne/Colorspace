// ===== engine.js · Renderer, Szene, Kamera, Himmel (Verlauf + Sonne im Shader), Tageszyklus, Licht, Nebel, Schatten, Boden =====
import * as THREE from "three";
import { clamp, lerp, DEG } from "pru/core.js";

const C = (h) => new THREE.Color(h);
// Himmelsfarben je Sonnenhöhe: [Zenit, Horizont]
const SKY = { day: [C("#3C83D4"), C("#BBD7EE")], low: [C("#4A5F96"), C("#F2A970")], dusk: [C("#1A2246"), C("#6B4660")], night: [C("#060A18"), C("#141D33")] };

// Feine, weltfeste Körnung für Beton-Look: nichts wird gestreckt, egal wie hoch eine Struktur gezogen wird
const MATS = new Map();
export function concrete(hex, opts) {
  const key = hex + (opts && opts.grain != null ? "/" + opts.grain : "") + (opts && opts.ao === 0 ? "/n" : "");
  if (MATS.has(key)) return MATS.get(key);
  const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), roughness: 0.94, metalness: 0 });
  // Schatten von den der Sonne zugewandten Flächen werfen: kein heller Lichtsaum am Fuß der Strukturen
  m.shadowSide = THREE.FrontSide;
  const grain = opts && opts.grain != null ? opts.grain : 1, ao = opts && opts.ao != null ? opts.ao : 1;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uGrain = { value: grain }; sh.uniforms.uAO = { value: ao };
    sh.vertexShader = "varying vec3 vPRUw;\nvarying vec3 vPRUn;\n" + sh.vertexShader.replace("#include <project_vertex>", "#include <project_vertex>\n vPRUw = (modelMatrix * vec4(transformed, 1.0)).xyz;\n vPRUn = normalize(mat3(modelMatrix) * objectNormal);");
    sh.fragmentShader = "varying vec3 vPRUw;\nvarying vec3 vPRUn;\nuniform float uGrain;\nuniform float uAO;\n" +
      "float pruH(vec3 p){ p = mod(p, 289.0); return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }\n" +
      "float pruN(vec3 x){ vec3 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f);" +
      " return mix(mix(mix(pruH(i), pruH(i+vec3(1,0,0)), f.x), mix(pruH(i+vec3(0,1,0)), pruH(i+vec3(1,1,0)), f.x), f.y)," +
      " mix(mix(pruH(i+vec3(0,0,1)), pruH(i+vec3(1,0,1)), f.x), mix(pruH(i+vec3(0,1,1)), pruH(i+vec3(1,1,1)), f.x), f.y), f.z); }\n" +
      sh.fragmentShader.replace("#include <color_fragment>", "#include <color_fragment>\n" +
        " float pruD = length(vPRUw - cameraPosition);\n" +
        " float pruG = ((pruN(vPRUw * 0.45) - 0.5) * 0.07 + (pruN(vPRUw * 3.1) - 0.5) * 0.05 * clamp(1.0 - pruD / 40.0, 0.0, 1.0)) * clamp(1.0 - pruD / 160.0, 0.0, 1.0);\n" +
        " diffuseColor.rgb *= 1.0 + pruG * uGrain;\n" +
        // Kontaktschatten: senkrechte Wände werden zum Boden hin dunkler (kein Lichtsaum am Fuß)
        " diffuseColor.rgb *= 1.0 - uAO * (1.0 - smoothstep(0.0, 0.6, vPRUw.y)) * (1.0 - abs(vPRUn.y)) * 0.3;");
  };
  m.customProgramCacheKey = () => "pru-concrete"; m.userData.shared = true;
  MATS.set(key, m);
  return m;
}

export class Engine {
  constructor(host) {
    this.host = host;
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.domElement.className = "pru-cv"; r.domElement.tabIndex = 0; host.appendChild(r.domElement);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.08, 3000);
    this.env = { time: 15, cycle: true, speed: 1 };   // speed 1 = ein Tag in 24 Minuten
    this.q = { shadows: true, scale: 1 };
    // Himmelskuppel: Verlauf, Sonnenscheibe und Schein im Shader
    this.skyU = { uZen: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uSun: { value: new THREE.Vector3(0, 1, 0) }, uSunC: { value: new THREE.Color(1, 1, 1) }, uSunA: { value: 1 }, uMoon: { value: 0 } };
    const sm = new THREE.ShaderMaterial({
      uniforms: this.skyU, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: "varying vec3 vD; void main(){ vD = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }",
      fragmentShader: "uniform vec3 uZen, uHor, uSun, uSunC; uniform float uSunA, uMoon; varying vec3 vD;\n" +
        "void main(){ vec3 d = normalize(vD); float y = d.y;\n" +
        " vec3 c = mix(uHor, uZen, pow(clamp(y, 0.0, 1.0), 0.5));\n" +
        " if (y < 0.0) c = uHor * 0.96;\n" +
        " float s = max(dot(d, uSun), 0.0);\n" +
        " c += uSunC * (pow(s, 6.0) * 0.12 + pow(s, 60.0) * 0.25) * uSunA;\n" +
        " c = mix(c, vec3(1.0, 0.98, 0.92), smoothstep(0.99955, 0.99975, s) * uSunA);\n" +
        " float m = max(dot(d, -uSun), 0.0); c = mix(c, vec3(0.86, 0.9, 1.0), smoothstep(0.99965, 0.9998, m) * uMoon);\n" +
        " gl_FragColor = vec4(c, 1.0);\n #include <colorspace_fragment>\n }"
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), sm);
    this.sky.frustumCulled = false; this.sky.renderOrder = -10; this.scene.add(this.sky);
    this.hemi = new THREE.HemisphereLight(0xC8DDF2, 0x8A8478, 1.0); this.scene.add(this.hemi);
    const s = this.sun = new THREE.DirectionalLight(0xFFFFFF, 2.4);
    s.castShadow = true; s.shadow.mapSize.set(2048, 2048);
    const sc = s.shadow.camera; sc.left = -55; sc.right = 55; sc.top = 55; sc.bottom = -55; sc.near = 1; sc.far = 600;
    s.shadow.bias = -0.0006; s.shadow.normalBias = 0.03;
    this.scene.add(s); this.scene.add(s.target);
    this.scene.fog = new THREE.FogExp2(0xBBD7EE, 0.0036);
    // Boden: eine große, ruhige Fläche
    const g = new THREE.PlaneGeometry(6000, 6000); g.rotateX(-Math.PI / 2);
    this.ground = new THREE.Mesh(g, concrete("#D6D1C6", { grain: 0.8, ao: 0 }));
    this.ground.receiveShadow = true; this.ground.name = "ground"; this.scene.add(this.ground);
    this.focusAt = new THREE.Vector3();
    this.sunDir = new THREE.Vector3(0, 1, 0);
    this.setEnv({});
    this.resize();
  }
  // Uhrzeit 0–24: Sonne geht um 6 im Osten auf, steht mittags im Süden, geht um 18 im Westen unter
  setEnv(o) {
    Object.assign(this.env, o);
    const h = ((this.env.time % 24) + 24) % 24, day = (h - 6) / 12, el = Math.sin(day * Math.PI) * 58 * DEG, az = day * Math.PI;
    const up = Math.sin(el);
    const dir = new THREE.Vector3(Math.cos(az) * Math.cos(el), up, -Math.sin(az) * Math.cos(el) * 0.6 - 0.25).normalize();
    this.sunDir.copy(dir);
    const night = dir.y < -0.06;
    const k = clamp(up / 0.35, 0, 1), kd = clamp((up + 0.14) / 0.17, 0, 1);
    const zen = new THREE.Color(), hor = new THREE.Color();
    if (k > 0) { zen.lerpColors(SKY.low[0], SKY.day[0], k); hor.lerpColors(SKY.low[1], SKY.day[1], k); }
    else { zen.lerpColors(SKY.dusk[0], SKY.low[0], kd); hor.lerpColors(SKY.dusk[1], SKY.low[1], kd); if (up < 0) { const kn = clamp(-up / 0.2, 0, 1); zen.lerp(SKY.night[0], kn); hor.lerp(SKY.night[1], kn); } }
    const warm = new THREE.Color(0xFFFFFF).lerp(new THREE.Color(0xFF9A55), 1 - k);
    this.skyU.uZen.value.copy(zen); this.skyU.uHor.value.copy(hor); this.skyU.uSun.value.copy(dir);
    this.skyU.uSunC.value.copy(warm); this.skyU.uSunA.value = clamp((up + 0.05) / 0.08, 0, 1); this.skyU.uMoon.value = clamp((-up - 0.05) / 0.1, 0, 1);
    // Licht: nachts übernimmt der Mond (gegenüber der Sonne), schwach und bläulich
    if (night) {
      this.lightDir = dir.clone().negate(); if (this.lightDir.y < 0.25) { this.lightDir.y = 0.25; this.lightDir.normalize(); }
      this.sun.color.set(0x9FB4E0); this.sun.intensity = 0.55; this.hemi.intensity = 0.55; this.hemi.color.set(0x4C5C88); this.hemi.groundColor.set(0x2A2C34);
    } else {
      this.lightDir = dir.clone(); if (this.lightDir.y < 0.04) { this.lightDir.y = 0.04; this.lightDir.normalize(); }
      this.sun.color.copy(warm); this.sun.intensity = lerp(0.5, 2.6, kd * (0.3 + 0.7 * k));
      this.hemi.intensity = lerp(0.6, 1.55, kd); this.hemi.color.copy(zen).lerp(new THREE.Color(0xFFFFFF), 0.62); this.hemi.groundColor.set(0xB3AC9F).lerp(new THREE.Color(0x2A2830), 1 - kd);
    }
    this.scene.fog.color.copy(hor);
  }
  // Tageszyklus weiterlaufen lassen (24 min pro Tag bei speed 1)
  tick(dt) { if (this.env.cycle) this.setEnv({ time: (this.env.time + dt * this.env.speed / 60) % 24 }); }
  // Schatten folgen dem Blickpunkt
  focus(v) {
    this.focusAt.copy(v);
    const s = this.sun; s.target.position.copy(v); s.position.copy(v).addScaledVector(this.lightDir, 250);
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
    const c = this.camera; this.sky.position.copy(c.position); this.sky.scale.setScalar(c.far * 0.5);
    this.ground.position.set(Math.round(c.position.x / 100) * 100, 0, Math.round(c.position.z / 100) * 100);
    this.renderer.render(this.scene, c);
  }
  dispose() {
    this.scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) [].concat(o.material).forEach((m) => { if (!m.userData.shared) m.dispose(); }); });
    MATS.forEach((m) => m.dispose()); MATS.clear();
    this.renderer.dispose(); this.renderer.domElement.remove();
  }
}
