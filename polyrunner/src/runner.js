// ===== runner.js · Test-Runner: Low-Poly-Strichmännchen auf einem Skelett, prozedurale Animation =====
// Das Skelett ist das eigentliche Rig: Knochen mit Standardnamen (siehe BONES). Die Körperteile hängen starr an den Knochen.
// Später kommt ein echtes Modell (SkinnedMesh) mit denselben Knochennamen drauf, die Animation bleibt dieselbe.
// Ruhepose: Figur schaut nach +Z, links = +X, Arme und Beine hängen gerade nach unten (-Y).
// Drehung um X: negativ = Glied schwingt nach vorne.
// Bausteine: Gangzyklus mit Bein-IK, Füße passen sich dem Untergrund an (Strahl nach unten je Fuß), Hand-IK an Kanten,
// leichte Ragdoll (Verlet-Punkte mit Stäben) beim Beinbruch.
import * as THREE from "three";
import { damp, clamp, lerp } from "pru/core.js";

// Stellschrauben der Animation (Faktoren, 1 = Standard), im Tweaker des Testlaufs einstellbar
// Standard = Noahs Tweaker-Werte vom 28.11.2026
export const ANIM = { stride: 1.09, lift: 0.37, bob: 1.58, lean: 1, roll: 1.16, arms: 1.61, elbow: 0.71, sway: 2.17, twist: 1.55, spring: 0.68, damp: 0.76 };
export const ANIM_DEF = Object.assign({}, ANIM);
// Haltungen je Animation (seit v0.22, Animations-Editor): zusätzliche Drehung je Körperteil in Grad [vor/zurück, drehen, seitlich],
// Vorneigung des ganzen Körpers (Grad) und Hüfthöhe (cm). Gewichtet damit, wie stark die Animation gerade läuft.
// Paare (Schultern, Arme, Hände, Beine, Füße) gelten für links, rechts gespiegelt. Standard = POSE_DEF, Noahs Werte aus PolyRunner_Animationen.json hier eintragen.
export const POSE_PARTS = [["hips", "Hips"], ["spine", "Spine"], ["chest", "Chest"], ["neck", "Neck"], ["head", "Head"], ["shoulder", "Shoulder", 1], ["uarm", "UpperArm", 1], ["larm", "LowerArm", 1], ["hand", "Hand", 1], ["uleg", "UpperLeg", 1], ["lleg", "LowerLeg", 1], ["foot", "Foot", 1]];
export const ANIM_KEYS = ["idle", "walk", "run", "sprint", "crouch", "rough", "stairsUp", "stairsDown", "hop", "swing", "flank", "jump", "fall", "land", "roll", "slide", "getup", "wallrun", "climb", "hang", "pullup", "pullover", "vaultHands", "vaultStep", "stun"];
export const POSE_DEF = {
  // Sprint: mehr nach vorne (Noah: „beim Sprinten ist der Körper zu gerade“), Kopf bleibt oben
  sprint: { lean: 5, hip: -1, parts: { spine: [5, 0, 0], chest: [4, 0, 0], neck: [-6, 0, 0], head: [-3, 0, 0] } }
};
export function clonePose(o) {
  const r = {}; ANIM_KEYS.forEach((k) => { const a = o && o[k]; if (!a) return; const q = { lean: +a.lean || 0, hip: +a.hip || 0, parts: {} };
    POSE_PARTS.forEach(([p]) => { const v = a.parts && a.parts[p]; if (Array.isArray(v) && v.some((x) => +x)) q.parts[p] = [+v[0] || 0, +v[1] || 0, +v[2] || 0]; });
    if (q.lean || q.hip || Object.keys(q.parts).length) r[k] = q; });
  return r;
}
export const POSE = clonePose(POSE_DEF);
export function setPose(o) { for (const k in POSE) delete POSE[k]; Object.assign(POSE, clonePose(o)); }
const DEG = Math.PI / 180;
export const HIP_H = 0.9, L_THIGH = 0.415, L_SHIN = 0.415, ANKLE = 0.07, L_UARM = 0.28, L_LARM = 0.3;
// [Name, Elternknochen, Position relativ zum Eltern]
export const BONES = [
  ["Hips", null, [0, 0, 0]],
  ["Spine", "Hips", [0, 0.1, 0]], ["Chest", "Spine", [0, 0.2, 0]], ["Neck", "Chest", [0, 0.2, 0]], ["Head", "Neck", [0, 0.09, 0]],
  ["LeftShoulder", "Chest", [0.06, 0.16, 0]], ["LeftUpperArm", "LeftShoulder", [0.12, 0, 0]], ["LeftLowerArm", "LeftUpperArm", [0, -0.28, 0]], ["LeftHand", "LeftLowerArm", [0, -0.26, 0]],
  ["RightShoulder", "Chest", [-0.06, 0.16, 0]], ["RightUpperArm", "RightShoulder", [-0.12, 0, 0]], ["RightLowerArm", "RightUpperArm", [0, -0.28, 0]], ["RightHand", "RightLowerArm", [0, -0.26, 0]],
  ["LeftUpperLeg", "Hips", [0.1, 0, 0]], ["LeftLowerLeg", "LeftUpperLeg", [0, -L_THIGH, 0]], ["LeftFoot", "LeftLowerLeg", [0, -L_SHIN, 0]], ["LeftToes", "LeftFoot", [0, -0.05, 0.13]],
  ["RightUpperLeg", "Hips", [-0.1, 0, 0]], ["RightLowerLeg", "RightUpperLeg", [0, -L_THIGH, 0]], ["RightFoot", "RightLowerLeg", [0, -L_SHIN, 0]], ["RightToes", "RightFoot", [0, -0.05, 0.13]]
];
const REST = new THREE.Vector3(0, -1, 0), UPV = new THREE.Vector3(0, 1, 0), DOWN = new THREE.Vector3(0, -1, 0);
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _v = new THREE.Vector3(), _v2 = new THREE.Vector3();

// Zwei-Knochen-IK in der Seitenebene: Fuß f Meter vor und d Meter unter der Hüfte → [Oberschenkel x, Knie x]
function legIK(f, d) {
  const L1 = L_THIGH, L2 = L_SHIN, D = clamp(Math.hypot(f, d), 0.12, L1 + L2 - 0.002);
  const knee = Math.PI - Math.acos(clamp((L1 * L1 + L2 * L2 - D * D) / (2 * L1 * L2), -1, 1));
  const phi = Math.atan2(f, d), alpha = Math.acos(clamp((L1 * L1 + D * D - L2 * L2) / (2 * L1 * D), -1, 1));
  return [-(phi + alpha), knee];
}
// Knochen so drehen, dass seine Ruherichtung (nach unten) in Weltrichtung dir zeigt
function aimBone(bone, dir, w) {
  bone.parent.getWorldQuaternion(_q); _q.invert();
  const loc = _v2.copy(dir).applyQuaternion(_q).normalize();
  _q2.setFromUnitVectors(REST, loc);
  if (w == null || w >= 1) bone.quaternion.copy(_q2); else bone.quaternion.slerp(_q2, w);
  bone.updateMatrixWorld(true);
}

export class Runner {
  constructor(scene, color) {
    this.root = new THREE.Group(); this.root.name = "runner";
    this.pivot = new THREE.Group(); this.pivot.position.y = HIP_H; this.root.add(this.pivot);   // dreht beim Abrollen, Neigen
    this.b = {};
    BONES.forEach(([n, p, pos]) => { const bone = new THREE.Bone(); bone.name = n; bone.position.set(pos[0], pos[1], pos[2]); this.b[n] = bone; (p ? this.b[p] : this.pivot).add(bone); });
    this.skeleton = new THREE.Skeleton(BONES.map(([n]) => this.b[n]));
    this.buildBody(color || "#E8622C");
    this.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
    scene.add(this.root);
    this.scene = scene; this.world = null; this.ws = 1;   // ws = Weltmaßstab (Runner rechnet in 1,8-m-Einheiten, hängt dann in einer skalierten Gruppe)
    this.cur = {}; this.jv = {}; this.sp = {};    // Gelenkwinkel und -geschwindigkeiten (Federn)
    this.t = 0; this.phase = 0; this.lean = 0; this.roll = 0; this.flip = 0; this.hipY = 0; this.armPh = 0; this.airPh = 0;
    this.pelOff = 0; this.foot = { Left: { o: 0, p: 0, dx: 0, w: 1 }, Right: { o: 0, p: 0, dx: 0, w: 1 } }; this.ikW = 0; this.rag = null;
    this.terr = { up: 0, dn: 0, rough: 0 };   // Gelände: Treppe hoch/runter, Hindernisse (geglättet)
    this.lastMode = "idle"; this.blend = 0; this.jump = null; this.lastJumpId = 0; this.gaitBeta = 0.3; this.pend = null; this.pivZ = 0; this.brushW = 0; this.hipPrev = 0;
  }
  buildBody(hex) {
    const mat = this.mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), roughness: 0.7, metalness: 0, flatShading: true });
    const dark = this.dark = new THREE.MeshStandardMaterial({ color: new THREE.Color("#2A2B2F"), roughness: 0.8, flatShading: true });
    const add = (bone, geo, m, y, z) => { const me = new THREE.Mesh(geo, m || mat); me.position.set(0, y || 0, z || 0); this.b[bone].add(me); return me; };
    const limb = (len, r0, r1) => { const g = new THREE.CylinderGeometry(r1, r0, len, 6); g.translate(0, -len / 2, 0); return g; };
    const up = (len, r0, r1) => { const g = new THREE.CylinderGeometry(r1, r0, len, 6); g.translate(0, len / 2, 0); return g; };
    const ball = (r) => new THREE.IcosahedronGeometry(r, 0);
    add("Hips", up(0.12, 0.095, 0.1), null, -0.04);
    add("Spine", up(0.2, 0.09, 0.115));
    add("Chest", up(0.21, 0.125, 0.085));
    add("Neck", up(0.09, 0.035, 0.035));
    add("Head", new THREE.IcosahedronGeometry(0.118, 1), null, 0.11);
    ["Left", "Right"].forEach((s) => {
      add(s + "Shoulder", (() => { const g = new THREE.CylinderGeometry(0.04, 0.04, 0.12, 6); g.rotateZ(Math.PI / 2); g.translate(s === "Left" ? 0.06 : -0.06, 0, 0); return g; })());
      add(s + "UpperArm", limb(0.28, 0.038, 0.045)); add(s + "UpperArm", ball(0.05), this.dark);
      add(s + "LowerArm", limb(0.26, 0.03, 0.037)); add(s + "LowerArm", ball(0.043), this.dark);
      add(s + "Hand", ball(0.045), null, -0.04);
      add(s + "UpperLeg", limb(L_THIGH, 0.05, 0.065)); add(s + "LowerLeg", limb(L_SHIN, 0.038, 0.05)); add(s + "LowerLeg", ball(0.056), this.dark);
      const fg = new THREE.BoxGeometry(0.09, 0.06, 0.23); fg.translate(0, -0.04, 0.05); add(s + "Foot", fg, this.dark);
    });
  }
  setVisible(v) { this.root.visible = v; }
  // Gelenk als gedämpfte Feder auf den Zielwinkel ziehen: weicher Anlauf, leichtes Nachschwingen (zeta < 1)
  j(name, x, y, z, w, zeta, dt) {
    const c = this.cur[name] || (this.cur[name] = [0, 0, 0]), v = this.jv[name] || (this.jv[name] = [0, 0, 0]), T = [x || 0, y || 0, z || 0];
    const n = Math.max(1, Math.ceil(dt * w / 0.35)), h = dt / n;
    for (let k = 0; k < n; k++) for (let i = 0; i < 3; i++) { v[i] += (w * w * (T[i] - c[i]) - 2 * zeta * w * v[i]) * h; c[i] += v[i] * h; }
    this.b[name].rotation.set(c[0], c[1], c[2]);
  }
  // Feder für einzelne Werte (Neigung, Hüfte, Oberkörper)
  spring(key, target, w, zeta, dt) {
    const S = this.sp[key] || (this.sp[key] = { x: target, v: 0 }), n = Math.max(1, Math.ceil(dt * w / 0.35)), h = dt / n;
    for (let k = 0; k < n; k++) { S.v += (w * w * (target - S.x) - 2 * zeta * w * S.v) * h; S.x += S.v * h; }
    return S.x;
  }
  // Untergrund an einer Stelle (lokal: f vor, lat seitlich vom Hüftgelenk): Höhe relativ zur Figur und Neigung in Laufrichtung
  probeG(side, f, lat) {
    if (!this.world) return { o: 0, p: 0 };
    const y = this.root.rotation.y, px = (side === "Left" ? 0.1 : -0.1) + lat, c = Math.cos(y), s = Math.sin(y);
    const x = this.root.position.x + px * c + f * s, z = this.root.position.z - px * s + f * c, by = this.root.position.y;
    const hit = this.world.ray(_v.set(x, by + 0.62, z), DOWN, 1.25, false);
    let o = -0.5, p = 0;
    if (hit) {
      o = clamp(hit.point.y - by, -0.5, 0.6);
      if (hit.face) { const n = hit.face.normal.clone().transformDirection(hit.object.matrixWorld); p = clamp(Math.atan2(n.x * s + n.z * c, n.y), -0.6, 0.6); }
    }
    return { o: o, p: p };
  }
  // Untergrund unter einem Fuß (für Ducken, Stolpern): Ziel merken, geglättet wird in leg()
  ground(side, f, lat) { const F = this.foot[side], g = this.probeG(side, f, lat); F.tgt = g.o; F.pt = g.p; return F; }
  // Zwei-Knochen-IK (Arm oder Bein): Ende an Weltpunkt, Ellbogen/Knie zeigt Richtung pole
  limbIK(upper, lower, l1, l2, target, pole, w) {
    if (w <= 0.001) return;
    const A = this.b[upper], B = this.b[lower];
    const pA = A.getWorldPosition(new THREE.Vector3()).divideScalar(this.ws), toT = target.clone().sub(pA);
    const dist = clamp(toT.length(), 0.08, l1 + l2 - 0.002), dirT = toT.normalize();
    let n = new THREE.Vector3().crossVectors(dirT, pole); if (n.lengthSq() < 1e-5) n.crossVectors(dirT, UPV); n.normalize();
    const al = Math.acos(clamp((l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist), -1, 1));
    const u = dirT.clone().applyAxisAngle(n, al), elbow = pA.clone().addScaledVector(u, l1);
    aimBone(A, u, w); aimBone(B, pA.clone().addScaledVector(dirT, dist).sub(elbow).normalize(), w);
    [A, B].forEach((bn) => { const c = this.cur[bn.name]; if (c) { c[0] = bn.rotation.x; c[1] = bn.rotation.y; c[2] = bn.rotation.z; } });
  }
  armIK(side, target, pole, w) { this.limbIK(side + "UpperArm", side + "LowerArm", L_UARM, L_LARM, target, pole, w); }
  // lokaler Punkt der Figur (x links, y hoch, z vorne, ab Füßen) → Welt
  local(x, y, z) { const c = Math.cos(this.root.rotation.y), s = Math.sin(this.root.rotation.y), r = this.root.position; return new THREE.Vector3(r.x + x * c + z * s, r.y + y, r.z - x * s + z * c); }
  ldir(x, y, z) { const c = Math.cos(this.root.rotation.y), s = Math.sin(this.root.rotation.y); return new THREE.Vector3(x * c + z * s, y, -x * s + z * c); }
  // s: Zustand aus der Bewegung (move.js). Vorher place() aufrufen (Position und Blickrichtung dieses Bildes).
  update(dt, s) {
    this.t += dt;
    if (s.mode === "broken") { this.ragdoll(dt, s); return; }
    if (this.rag) this.rag = null;
    const sp = s.speed, mode = s.mode, loco = mode === "run" || mode === "idle";
    // Modus gewechselt: kurz weicher überblenden
    if (mode !== this.lastMode) { this.blend = 1; this.lastMode = mode; if (mode === "vault" && s.climb && s.climb.kind === "swing") this.swingSide = -(this.swingSide || -1); }
    this.blend = Math.max(0, this.blend - dt / 0.28);
    // Absprung erkannt: welches Bein steht gerade am Boden bzw. ist vorne?
    if (s.jumpId !== this.lastJumpId) {
      this.lastJumpId = s.jumpId;
      let leg = "Both";
      if (!s.jumpBoth) {
        const pl = this.phase % 1, pr = (this.phase + 0.5) % 1, b = this.gaitBeta;
        if (pl < b && !(pr < b)) leg = "Left"; else if (pr < b && !(pl < b)) leg = "Right"; else leg = pl > pr ? "Left" : "Right";
      }
      this.jump = { leg: leg, t: 0 };
    }
    if (this.jump) { this.jump.t += dt; if (this.jump.t > 1.2 || (mode !== "air" && this.jump.t > 0.05)) this.jump = null; }
    const MP = { run: [32, 0.92], idle: [22, 0.85], crouch: [24, 0.85], air: [20, 0.7], wallrun: [26, 0.75], climb: [28, 0.75], hang: [17, 0.6],
      vault: [22, 0.8], pullup: [19, 0.82], slide: [24, 0.8], getup: [26, 0.78], roll: [34, 1], impact: [28, 0.7], stun: [22, 0.7] }[mode] || [22, 0.8];
    const W = MP[0] * (1 - 0.4 * this.blend) * ANIM.spring, Z = Math.min(1.3, MP[1] * ANIM.damp);
    const P = {};   // Ziel-Pose: Name → [x, y, z]
    // Haltungen aus dem Animations-Editor: wie stark läuft welche Animation gerade?
    const PW = this.pw = this.poseWeights(s, mode, sp); let poseLean = 0, poseHip = 0;
    for (const k in PW) { const A = POSE[k], w = PW[k]; if (!A || w < 0.002) continue; poseLean += A.lean * DEG * w; poseHip += A.hip * 0.01 * w; }
    let lean = 0, roll = 0, hipY = 0, flip = 0, comp = 0, grounded = false, terrain = false, hands = null, spineBend = 0, bob = 0, pivZ = 0;
    let leanW = 13, leanZ = 0.6, rollW = 13, rollZ = 0.65, hipW = 26, hipZ = 0.5, legIKs = null;
    // Bein per IK: Fuß f vor / d unter der Hüfte, lat seitlich (+ = links), wp = Fußneigung in der Welt (+ = Zehen runter).
    // Die Neigung des Körpers wird herausgerechnet, bei Bodenkontakt auch Hüftsenkung und Untergrund.
    const leg = (side, f, d, lat, wp, own) => {
      if (grounded) {
        d += hipY + bob + this.pelOff + poseHip;
        if (own) { const F = this.foot[side]; d -= F.o; if (wp != null) wp += F.p; else wp = F.p; }
        else if (terrain) { const F = this.ground(side, f, lat || 0); F.o = damp(F.o, F.tgt, 22, dt); F.p = damp(F.p, F.pt, 14, dt); d -= F.o; if (wp != null) wp += F.p; else wp = F.p; }
      }
      const c = Math.cos(comp), sn = Math.sin(comp), a = legIK(f * c + d * sn, d * c - f * sn);
      P[side + "UpperLeg"] = [a[0], 0, lat ? Math.atan2(lat, Math.max(0.3, d)) : 0]; P[side + "LowerLeg"] = [a[1], 0, 0];
      P[side + "Foot"] = [wp != null ? clamp(wp - (a[0] + a[1]) - comp, -1.3, 1.3) : clamp(-(a[0] + a[1]) - comp, -0.9, 0.9) * 0.7, 0, 0];
    };
    const arm = (side, sh, el, out) => { const sg = side === "Left" ? 1 : -1; P[side + "UpperArm"] = [sh, 0, sg * (out || 0.12)]; P[side + "LowerArm"] = [el, 0, 0]; };
    const stand = HIP_H - ANKLE;
    const add = (n, x, y, z) => { const p = P[n] || (P[n] = [0, 0, 0]); p[0] += x || 0; p[1] += y || 0; p[2] += z || 0; };

    if (loco) {
      // ---- Gehen, Laufen, Sprinten, Stehen: ein durchgehender Gangzyklus ----
      // Gelände (seit v0.22): Treppe hoch/runter und unruhiger Boden (Korrekturschritte) ändern Schrittlänge, Knieheben, Haltung und Fußsetzen
      const T3 = this.terr;
      T3.up = damp(T3.up, s.up > 0 ? 1 : 0, s.up > 0 ? 6 : 2.2, dt); T3.dn = damp(T3.dn, s.down > 0 && !(s.rough > 0) ? 1 : 0, s.down > 0 ? 6 : 2.2, dt); T3.rough = damp(T3.rough, s.rough > 0 ? 1 : 0, s.rough > 0 ? 5 : 1.5, dt);
      const tU = T3.up * (1 - T3.rough), tD = T3.dn * (1 - T3.rough), tR = T3.rough;
      const v = s.turning ? Math.max(sp, 0.9) : sp;
      const rf = smoothK((v - 1.9) / 1.1), mv = clamp(v / 0.9, 0, 1), kv = clamp(v / 9.6, 0, 1);
      const cad = lerp(0.62 + 0.27 * v, 1.28 + 0.1 * Math.max(0, v - 3), rf) / ANIM.stride * (1 + 0.2 * tR + 0.1 * tU + 0.14 * tD);   // kürzere, schnellere Schritte im Gelände
      const bMax = lerp(0.6, clamp(0.44 - 0.02 * v, 0.26, 0.44), rf), SLmax = lerp(0.72, 0.86, rf);
      const beta = clamp(Math.min(bMax, SLmax * cad / Math.max(v, 0.05)), 0.18, 0.62); this.gaitBeta = beta;
      const SL = s.turning && sp < 0.3 ? 0.14 : v * beta / cad;
      if (v > 0.04) this.phase = (this.phase + dt * cad) % 1;
      const H = (lerp(0.05 + 0.03 * v, 0.03 + 0.012 * v + 0.028 * kv * kv * 9.6, rf) * ANIM.lift + 0.08 * tU + 0.07 * tR + 0.025 * tD) * mv, Lf = SL * 0.4, Lb = SL * 0.6;
      const ga = s.back ? wrapA((s.moveRel || 0) - Math.PI) : (s.moveRel || 0), cg = Math.cos(ga), sg = Math.sin(ga);
      const pL = this.phase, br = Math.sin(this.t * 1.7), still = 1 - mv;
      const bobA = (0.016 * (1 - rf) - (0.018 + 0.0028 * v) * rf) * mv * ANIM.bob * (1 - 0.5 * Math.max(tU, tD, tR));
      bob = bobA * Math.cos(4 * Math.PI * (pL - beta / 2));
      hipY = -(0.012 + 0.0022 * v) * rf * mv - clamp(-s.acc * 0.007, 0, 0.06) * mv - s.land * 0.24 + (br * 0.005 - 0.006) * still - (0.04 * tD + 0.03 * tR) * mv + clamp(s.lag || 0, 0, 0.3) * 0.65 * tU;   // Treppe hoch: Becken folgt schon der nächsten Stufe (sonst hinkt es hinterher)
      lean = ((s.back ? -0.07 : lerp(0.02, 0.06, rf) + 0.12 * kv * kv) * mv + clamp(s.acc * 0.05, -0.34, 0.36)) * ANIM.lean + s.land * 0.2 + (0.12 * tU - 0.08 * tD + 0.05 * tR) * mv;
      // die Neigung verteilt sich: gut die Hälfte kippt das Becken, der Rest biegt die Wirbelsäule (kein steifes Brett)
      grounded = true; terrain = true;
      roll = clamp(-s.lat / 9.81, -0.42, 0.42) * 0.9 * ANIM.roll + Math.sin(this.t * 0.5) * 0.012 * still + Math.sin(this.t * 3.3) * 0.055 * tR * mv;   // Balance über Hindernisse
      const leanNow = this.sp.lean ? this.sp.lean.x : lean; comp = leanNow * 0.6; spineBend = leanNow * 0.4;
      const xs = [];
      ["Left", "Right"].forEach((side, i) => {
        const p = (pL + i * 0.5) % 1, F = this.foot[side], stanceNow = p < beta; let x, h, wp, q = 0, k = 0;
        if (stanceNow) {
          k = p / beta; x = Lf - (Lf + Lb) * k;
          const ho = Math.max(0, -x - 0.06); h = ho * lerp(0.12, 0.3, rf); wp = Math.min(0.9, ho * 2.4);
          if (rf < 1 && k < 0.18) wp -= (1 - rf) * 0.22 * (1 - k / 0.18);
        } else {
          q = (p - beta) / (1 - beta); const sharp = rf * kv;
          const xq = lerp((1 - Math.cos(Math.PI * q)) / 2, 1 - Math.pow(1 - q, 1.9), sharp);
          x = -Lb + (Lf + Lb) * xq;
          h = H * Math.sin(Math.PI * Math.pow(q, lerp(0.85, 0.62, sharp))); wp = (0.7 * Math.pow(1 - q, 1.5) - (1 - rf) * 0.22 * Math.pow(q, 4)) * mv;
        }
        if (s.back) x = -x;
        xs.push(x);
        const out = i === 0 ? 1 : -1;
        // Korrekturschritte: jeder Schritt etwas anders gesetzt (breiter, mal mehr, mal weniger), Fußspitzen leicht nach außen
        if (!stanceNow && F.st) { F.st = false; F.n = (F.n || 0) + 1; F.y0 = F.o; }   // Abheben: neuer Schritt
        if (stanceNow && !F.st) F.st = true;
        F.lo = damp(F.lo || 0, tR * (0.04 + 0.035 * Math.sin((F.n || 0) * 2.7 + i * 1.3)), 9, dt);
        const lat = x * sg + out * (lerp(0.03, -0.01, rf) * mv + 0.035 * still + F.lo);
        const fx = x * cg + still * (i === 0 ? 0.04 : -0.03);
        // Füße im Gelände: Standfuß bleibt auf seinem Untergrund, Schwungfuß hebt über Kanten und landet ganz auf der nächsten Stufe
        if (this.world) {
          if (stanceNow) { const g = this.probeG(side, fx + F.dx, lat); F.o = damp(F.o, g.o, 30, dt); F.p = damp(F.p, g.p, 14, dt); }
          else {
            const xl = Lf * cg;
            if (q > 0.3) { const ga2 = this.probeG(side, xl - 0.07, lat), gb2 = this.probeG(side, xl + 0.07, lat); F.dx = damp(F.dx, Math.abs(ga2.o - gb2.o) > 0.035 ? 0.1 : 0, 9, dt); }
            else F.dx = damp(F.dx, 0, 8, dt);
            const gl = this.probeG(side, xl + F.dx, lat), gn = this.probeG(side, fx + F.dx, lat), y0 = F.y0 == null ? F.o : F.y0;
            F.o = damp(F.o, Math.max(lerp(y0, gl.o, smoothK(q * 1.25)), gn.o), 22, dt); F.p = damp(F.p, gl.p * q, 10, dt);
            if (Math.abs(gl.o - y0) > 0.03) h += Math.min(0.09, Math.abs(gl.o - y0) * 0.4 + 0.03) * Math.sin(Math.PI * q);   // Knie höher über die Kante
          }
        }
        // wie stark dieser Fuß das Becken nach unten zieht: früh im Stand voll, am Ende kaum (Ferse hebt ab, Zehen drücken)
        F.w = stanceNow ? 1 - 0.75 * k * k : 0.15;
        leg(side, fx + F.dx, stand - h, lat, wp, !!this.world);
        if (tR > 0.01) add(side + "Foot", 0, -out * 0.3 * tR, 0);
      });
      // Becken dreht mit dem vorderen Bein, Schultern dagegen, die Wirbelsäule biegt sich mit jedem Schritt etwas zur Standseite
      const pr = -0.22 * (xs[0] - xs[1]) * (0.35 + 0.65 * rf), nR = clamp((xs[1] - xs[0]) / Math.max(Lf + Lb, 0.25), -1, 1);
      const A = lerp(0.24, 0.36 + 0.05 * v, rf) * mv * ANIM.arms * (1 - 0.45 * tR), eb = (lerp(0.3, 1.2 + 0.03 * v, rf) * mv + 0.18 * still) * ANIM.elbow;
      const ao = lerp(0.09, 0.14, rf) + 0.32 * tR + 0.1 * tD;   // Arme zur Balance etwas raus
      arm("Left", -A * nR + 0.05 * still + br * 0.015 * still, -(eb + 0.3 * Math.max(0, nR) * rf), ao);
      arm("Right", A * nR + 0.05 * still + br * 0.015 * still, -(eb + 0.3 * Math.max(0, -nR) * rf), ao);
      const sway = Math.sin(Math.PI * 2 * pL) * 0.045 * mv * (0.4 + 0.6 * rf) * ANIM.sway;
      P.Hips = [0, pr, -sway * 0.4];
      P.Spine = [spineBend * 0.45 + br * 0.012 * still, -pr * 0.55, sway]; P.Chest = [spineBend * 0.55 + 0.03 - br * 0.008 * still, -pr * 0.9, sway * 0.6];
      P.Neck = [-leanNow * 0.75 + 0.1 * tD, -pr * 0.25, -roll * 0.5 - sway * 1.2]; P.Head = [-0.03 + 0.12 * tD + 0.06 * tR, 0, 0];   // runter: auf die Stufen schauen
      // an der Wand entlang: Hand stützt sich ab, Körper lehnt leicht weg
      if (s.brush) {
        this.brushW = damp(this.brushW, 1, 10, dt);
        const sd = s.brush.side > 0 ? "Left" : "Right", n = s.brush.n, fw = this.ldir(0, 0, 1);
        const tgt = this.root.position.clone().addScaledVector(n, -(0.32 - 0.05)).addScaledVector(fw, 0.28); tgt.y += 1.3;
        hands = { only: sd, L: tgt, R: tgt, n: n, right: this.ldir(-1, 0, 0), w: this.brushW * 0.9 };
        roll += s.brush.side * 0.12;
      } else this.brushW = damp(this.brushW, 0, 10, dt);
      leanW = 12; leanZ = 0.55;
    } else if (mode === "wallrun") {
      const cad = 0.75 + sp * 0.15, stride = clamp(0.1 + sp * 0.045, 0.12, 0.5);
      this.phase = (this.phase + dt * cad) % 1;
      const k = clamp(sp / 9, 0, 1), th = this.phase * Math.PI * 2;
      hipY = -0.04 * k; bob = -Math.abs(Math.cos(th)) * 0.05 * (0.3 + k);
      lean = 0.12; comp = lean; roll = s.wallSide * 0.45; rollW = 22; rollZ = 0.7;
      ["Left", "Right"].forEach((side, i) => {
        const a = th + i * Math.PI, f = stride * Math.sin(a), sw = Math.max(0, Math.cos(a));
        leg(side, f + 0.02 + k * 0.04, stand - sw * (0.08 + 0.2 * k) + bob, (side === "Left" ? 1 : -1) * s.wallSide * 0.06);
        const as = -Math.sin(a + Math.PI) * (0.25 + 0.7 * k);
        arm(side, as, -0.35 - 1.05 * k, 0.1 + ((side === "Left") === (s.wallSide > 0) ? 0 : 0.35));
      });
      P.Spine = [0.04, Math.sin(th) * 0.12 * k, -s.wallSide * 0.12]; P.Chest = [0.04, -Math.sin(th) * 0.18 * k, -s.wallSide * 0.1]; P.Neck = [-0.08, 0, -roll * 0.6]; P.Head = [-0.05, 0, 0];
    } else if (mode === "climb") {
      // Wand hochlaufen: abwechselnd ein Fuß an der Wand, der Körper drückt sich hoch, die Arme greifen nach oben
      const C = s.climbUp, k = clamp((C.t - C.step * 0.26) / 0.26, 0, 1), st = C.step % 2 === 0 ? "Right" : "Left", ot = st === "Right" ? "Left" : "Right";
      lean = -0.04; comp = lean; hipY = -0.05;
      leg(st, lerp(0.44, 0.32, k), lerp(0.32, 0.72, smoothK(k)), st === "Left" ? 0.03 : -0.03, -0.9);
      leg(ot, lerp(-0.05, 0.3, smoothK(k)), lerp(0.78, 0.45, smoothK(k)), ot === "Left" ? 0.05 : -0.05, 0.5);
      arm(ot, lerp(-1.6, -2.7, k), -0.4, 0.2); arm(st, lerp(-0.6, -1.4, k), -0.9, 0.2);
      P.Spine = [0.05, (st === "Right" ? 1 : -1) * 0.12, 0]; P.Chest = [0.06, (st === "Right" ? 1 : -1) * 0.1, 0]; P.Neck = [-0.25, 0, 0];
    } else if (mode === "crouch") {
      const th = (this.phase = (this.phase + dt * (0.4 + sp * 0.6)) % 1) * Math.PI * 2, m = clamp(sp / 2, 0, 1);
      lean = 0.5; comp = (this.sp.lean ? this.sp.lean.x : lean) * 0.7; spineBend = comp * 0.43; hipY = -0.38; grounded = true; terrain = true;
      leg("Left", 0.16 + Math.sin(th) * 0.14 * m, stand - Math.max(0, Math.cos(th)) * 0.08 * m, 0.04); leg("Right", 0.02 - Math.sin(th) * 0.14 * m, stand - Math.max(0, -Math.cos(th)) * 0.08 * m, -0.04);
      arm("Left", -0.5, -0.9, 0.2); arm("Right", -0.5, -0.9, 0.2); P.Spine = [spineBend * 0.5, 0, 0]; P.Chest = [spineBend * 0.5, 0, 0]; P.Neck = [-0.45, 0, 0];
    } else if (mode === "slide" || mode === "getup") {
      // Hüft-Slide wie eine Grätsche: auf der Hüftseite, unteres Bein schräg seitlich am Boden schleifend, oberes gestreckt nach vorne,
      // untere Hand stützt hinten, obere Hand vorne zum Ausbalancieren
      const sd = mode === "slide" ? s.slideSide : s.getup.side, L = sd > 0 ? "Left" : "Right", U = sd > 0 ? "Right" : "Left", o = sd > 0 ? 1 : -1;
      const g = mode === "getup" ? smoothK(s.getup.k) : 0, sk = 1 - g;
      lean = lerp(-0.62, 0.42, g); hipY = lerp(-0.62, -0.12, g); roll = -o * 0.55 * sk; leanW = 16; rollW = 16; hipZ = 0.75;
      if (mode === "slide") {
        // Beine per IK an Weltpunkte, damit nichts durch den Boden geht
        legIKs = [
          { side: L, target: this.local(o * 0.36, 0.08, -0.18), pole: this.ldir(o * 1, 0.25, 0.5) },
          { side: U, target: this.local(-o * 0.04, 0.09, 0.82), pole: this.ldir(-o * 0.2, 1, 0.3) }
        ];
        P[L + "Foot"] = [0.2, 0, -o * 0.6]; P[U + "Foot"] = [-0.3, 0, 0];
        P[L + "UpperArm"] = [0.55, 0, o * 0.75]; P[L + "LowerArm"] = [-0.15, 0, 0];
        P[U + "UpperArm"] = [-1.0, 0, -o * 0.45]; P[U + "LowerArm"] = [-0.7, 0, 0];
        P.Spine = [0.22, o * 0.2, o * 0.18]; P.Chest = [0.28, o * 0.15, o * 0.22]; P.Neck = [0.55, -o * 0.2, o * 0.45]; P.Head = [0.1, 0, o * 0.15];
      } else {
        comp = lean;
        leg(U, 0.25, lerp(0.35, stand - 0.1, g), -o * 0.02); leg(L, -0.22, lerp(0.4, stand - 0.05, g), o * 0.04);
        arm(L, lerp(0.4, -0.6, g), -0.6, lerp(0.6, 0.15, g)); arm(U, lerp(-0.9, 0.3, g), -0.9, 0.2);
        const tw = s.getup.fast ? o * 0.45 * (1 - g) : 0;
        P.Spine = [0.15, tw * 0.5, 0]; P.Chest = [0.1, tw * 0.5, 0]; P.Neck = [-lean * 0.5, 0, 0];
      }
    } else if (mode === "hang") {
      // Hängen: Hände auf der Kante, Körper dicht an der Wand; mit Schwung pendelt er nach, Beine schlenkern hinterher
      const H = s.hang, mv = H.move, ph = H.phase * Math.PI * 2, pd = this.pendulum(dt, H);
      lean = -0.06; comp = lean; pivZ = 0.2;
      const lag = clamp(-pd.thv * 0.12, -0.5, 0.5), latLag = clamp(-pd.phv * 0.1, -0.35, 0.35);
      leg("Left", 0.2 + 0.05 * Math.sin(ph) + lag * 0.4, 0.74 - 0.04 * Math.abs(mv) * Math.max(0, Math.sin(ph)) - Math.abs(lag) * 0.1, 0.05 + latLag * 0.4);
      leg("Right", 0.18 - 0.05 * Math.sin(ph) + lag * 0.55, 0.76 - 0.04 * Math.abs(mv) * Math.max(0, -Math.sin(ph)) - Math.abs(lag) * 0.12, -0.05 + latLag * 0.5);
      roll = mv * 0.05 * Math.sin(ph);
      arm("Left", -2.9, -0.1, 0.25); arm("Right", -2.9, -0.1, 0.25);
      P.Neck = [-0.25, 0, 0]; P.Spine = [-0.05 + lag * 0.3, 0, latLag * 0.4]; P.Chest = [lag * 0.2, 0, latLag * 0.3];
      const right = new THREE.Vector3(H.n.z, 0, -H.n.x), base = H.edge.clone().addScaledVector(H.n, -0.04); base.y = H.top + 0.035;
      const sh = mv ? 0.09 * Math.sin(ph) * mv : 0;
      hands = { L: base.clone().addScaledVector(right, -0.21 + sh), R: base.clone().addScaledVector(right, 0.21 + sh), n: H.n, right: right, w: H.grab };
    } else if (mode === "vault" || mode === "pullup") {
      const C = s.climb, k = C.k, right = new THREE.Vector3(C.n.z, 0, -C.n.x), base = C.edge.clone().addScaledVector(C.n, -0.06); base.y = C.top + 0.035;
      let hw = 0;
      if (C.kind === "over" || C.kind === "pullover") {
        // Flanke (seit v0.23): eine Hand stützt auf der Mauer, Oberkörper kippt über den Stützarm, Beine schwingen seitlich drüber.
        // side +1 = rechte Hand (kommt von rechts), Beine schwingen dann nach links (lat +).
        const sdL = C.side || 1, Hs = sdL > 0 ? "Right" : "Left", Fs = sdL > 0 ? "Left" : "Right", p0 = C.pre, cu = C.cu;
        const u = p0 > 0 ? clamp((k - p0) / (1 - p0), 0, 1) : k;
        if (k < p0) {
          // aus dem Hängen (oder dem Sprung) hochstemmen, bis die Brust über der Kante ist
          const q = k / p0, p1 = smoothK(q / 0.6), p2 = smoothK((q - 0.45) / 0.55);
          pivZ = 0.2 * (1 - p2); lean = lerp(lerp(-0.05, 0.4, p1), 0.6, p2); comp = lean;
          leg("Left", lerp(0.18, -0.02, p2), lerp(0.74, 0.62, p1), 0.05); leg("Right", lerp(0.14, 0.05, p2), lerp(0.76, 0.55, p1), -0.05);
          const ah = lerp(C.pull ? -2.6 : -1.7, 0.1, p2), ae = lerp(-0.6, -0.3, p2); arm("Left", ah, ae, 0.3); arm("Right", ah, ae, 0.3);
          P.Neck = [lerp(-0.3, -0.5, p2), 0, 0]; P.Spine = [0.15 * p2, 0, 0];
          hands = { L: base.clone().addScaledVector(right, -0.22), R: base.clone().addScaledVector(right, 0.22), n: C.n, right: right, w: 1 };
        } else {
          const pre = p0 > 0 ? 1 : 0, a0 = pre ? 0 : smoothK(u / Math.max(0.08, cu - 0.12));
          const tk = Math.max(pre * 0.6, smoothK(u / Math.max(0.12, cu * 0.85))) * (1 - smoothK((u - (cu + 0.14)) / 0.4));
          lean = lerp(0.22, 0.32, tk) + (pre ? 0.3 * (1 - smoothK(u / 0.3)) : 0); comp = lean * 0.8; hipY = -0.06 * tk; roll = sdL * 0.85 * tk; rollW = 26; rollZ = 0.8; leanW = 20; hipW = 30;
          // vorderes Bein (Schwungseite) weit raus und vor, hinteres folgt
          leg(Fs, lerp(0.12, 0.55, tk), lerp(stand - 0.04, 0.2, tk), sdL * (0.05 + 0.5 * tk));
          leg(Hs, lerp(-0.04, 0.42, tk), lerp(stand - 0.02, 0.3, tk), sdL * (-0.05 + 0.42 * tk));
          // Stützarm (vor dem IK) nach unten-vorne, freier Arm zum Ausbalancieren hoch und raus
          arm(Hs, lerp(-0.6, -0.4, tk), -0.25, 0.15); arm(Fs, lerp(-0.5, -1.7, tk) * (0.5 + 0.5 * Math.max(a0, tk)), lerp(-0.5, -0.3, tk), 0.25 + 0.7 * tk);
          P.Spine = [0.08 * tk, -sdL * 0.15 * tk, sdL * 0.1 * tk]; P.Chest = [0.06 * tk, -sdL * 0.12 * tk, 0]; P.Neck = [-0.25 * tk, sdL * 0.1 * tk, sdL * 0.25 * tk];
          const hp = C.hand || base, hwk = pre ? 1 - smoothK((u - (cu + 0.15)) / 0.22) : smoothK(u / Math.max(0.1, cu * 0.6)) * (1 - smoothK((u - (cu + 0.16)) / 0.22));
          hands = { only: Hs, L: hp, R: hp, n: C.n, right: right, w: hwk };
        }
      } else if (mode === "pullup") {
        // Hochziehen: Arme ziehen bis zur Brust über die Kante, stützen, ein Knie auf die Kante, aufstehen – weich ineinander
        const p1 = smoothK(k / 0.5), p2 = smoothK((k - 0.35) / 0.4), p3 = smoothK((k - 0.68) / 0.32);
        pivZ = 0.2 * (1 - p2);
        lean = lerp(lerp(-0.05, 0.4, p1), 0.78, p2) * (1 - p3) + 0.1 * p3; comp = lean;
        const kneeUp = p2 * (1 - p3);
        leg("Left", lerp(0.22, 0.05, p2) * (1 - p3), lerp(0.74, 0.6, p1) * (1 - p3) + stand * p3);
        P.RightUpperLeg = [lerp(-0.3, -1.7, kneeUp) * (1 - p3), 0, -0.05]; P.RightLowerLeg = [lerp(0.4, 2.0, kneeUp) * (1 - p3) + 0.05 * p3, 0, 0]; P.RightFoot = [0.3 * (1 - p3), 0, 0];
        const ah = lerp(-2.6, 0.15, p2), ae = lerp(-0.6, -0.25, p2); arm("Left", ah, ae, 0.3); arm("Right", ah, ae, 0.3);
        P.Neck = [lerp(-0.3, -0.6, p2) * (1 - p3), 0, 0]; P.Spine = [0.15 * p2 * (1 - p3), 0, 0]; hipY = lerp(0, -0.12, p2) * (1 - p3);
        hw = k < 0.7 ? 1 : 1 - smoothK((k - 0.7) / 0.25);
      } else if (C.kind === "swing") {
        // Schwung-Klettern (bis Hüfthöhe, linke Maus): Hände kurz auf die Kante, Beine angezogen und leicht zur Seite geschwungen, oben im Lauf weiter
        const sd = this.swingSide || 1, p1 = smoothK(k / 0.35), p2 = smoothK((k - 0.12) / 0.45), p3 = smoothK((k - 0.62) / 0.38), tk = p2 * (1 - p3);
        lean = lerp(0.18, 0.5, p1) * (1 - p3) + 0.12 * p3; comp = lean * 0.8; hipY = -0.08 * tk; roll = -sd * 0.32 * tk; rollW = 18;
        leg("Left", lerp(0.05, 0.4, tk) + 0.1 * p3, lerp(stand - 0.05, 0.3, tk) + 0.05 * p3, 0.04 + sd * 0.2 * tk);
        leg("Right", lerp(-0.12, 0.3, tk) - 0.05 * p3, lerp(stand - 0.02, 0.38, tk), -0.04 + sd * 0.2 * tk);
        const ah = lerp(-1.25, -0.2, p3); arm("Left", ah, -0.35, 0.22 + 0.2 * p3); arm("Right", ah, -0.35, 0.22 + 0.2 * p3);
        P.Spine = [0.15 * tk, sd * 0.18 * tk, 0]; P.Chest = [0.1 * tk, sd * 0.14 * tk, 0]; P.Neck = [-0.35 * (1 - p3), -sd * 0.12 * tk, 0];
        hw = k < 0.5 ? smoothK(k / 0.12) : 1 - smoothK((k - 0.5) / 0.22);
      } else if (C.kind === "hands") {
        const p1 = smoothK(k / 0.5), p2 = smoothK((k - 0.42) / 0.58);
        lean = lerp(0.45, 0.65, p1) * (1 - p2) + 0.12 * p2; comp = lean; hipY = lerp(-0.05, -0.28, p1) * (1 - p2);
        leg("Left", lerp(0.15, 0.32, p1) * (1 - p2), lerp(0.7, 0.4, p1) * (1 - p2) + stand * p2, 0.05);
        leg("Right", lerp(0.0, 0.3, p1) * (1 - p2), lerp(0.75, 0.42, p1) * (1 - p2) + stand * p2, -0.05);
        const ah = lerp(-1.6, 0.1, p2); arm("Left", ah, -0.4, 0.25); arm("Right", ah, -0.4, 0.25); P.Neck = [-0.5 * (1 - p2), 0, 0]; P.Spine = [0.2 * (1 - p2), 0, 0];
        hw = k < 0.55 ? smoothK(k / 0.15) : 1 - smoothK((k - 0.55) / 0.3);
      } else {
        const p = smoothK(k);
        lean = 0.3 * (1 - p) + 0.08; comp = lean;
        leg("Right", lerp(0.4, 0.02, p), lerp(0.42, stand, p)); leg("Left", lerp(-0.25, -0.02, p), lerp(0.7, stand, p));
        arm("Left", -0.7 * (1 - p), -0.6, 0.15); arm("Right", 0.4 * (1 - p), -0.5, 0.15);
      }
      if (!hands) hands = { L: base.clone().addScaledVector(right, -0.22), R: base.clone().addScaledVector(right, 0.22), n: C.n, right: right, w: hw };
    } else if (mode === "roll") {
      const k = s.rollK;
      leg("Left", 0.35, 0.28); leg("Right", 0.3, 0.3); arm("Left", -1.2, -1.5, 0.35); arm("Right", -1.2, -1.5, 0.35);
      P.Spine = [0.5, 0, 0]; P.Chest = [0.4, 0, 0]; P.Neck = [0.5, 0, 0];
      flip = smoothK(k) * Math.PI * 2; hipY = -0.5 + Math.sin(k * Math.PI) * 0.06; hipW = 34; hipZ = 1;
    } else if (mode === "impact" || mode === "stun") {
      lean = mode === "impact" ? 0.6 : 0.45; comp = (this.sp.lean ? this.sp.lean.x : lean) * 0.7; spineBend = comp * 0.43; hipY = mode === "impact" ? -0.5 : -0.34; grounded = true; terrain = true;
      leg("Left", 0.22, stand, 0.08); leg("Right", -0.05, stand, -0.08);
      arm("Left", -0.7, -0.9, 0.45); arm("Right", -0.5, -1.1, 0.45); P.Neck = [-0.35, 0, 0]; P.Spine = [spineBend * 0.5, 0, 0]; P.Chest = [spineBend * 0.5, 0, 0];
    } else { // air
      // Luft: Absprung über ein Bein (das vordere bzw. am Boden stehende) oder beidbeinig; weite Sprünge und tiefe Stürze → Arme kreisen
      const up = clamp(s.vy / 7, -1, 1), tuck = clamp(0.5 + up * 0.5, 0, 1);
      const longJ = clamp((sp - 5) / 4, 0, 1) * clamp((s.airT - 0.35) / 0.3, 0, 1), drop = clamp((-s.vy - 4) / 8, 0, 1) * clamp((s.airT - 0.25) / 0.3, 0, 1);
      const wm = Math.max(longJ * 0.75, drop);
      this.armPh += dt * Math.PI * 2 * (1.3 + drop * 0.8); this.airPh += dt * Math.PI * 2 * 1.3;
      lean = 0.1 + tuck * 0.12 - (up < 0 ? up * 0.08 : 0) - drop * 0.1; comp = lean;
      if (s.wallJump > 0) { leg("Left", 0.3, 0.45); leg("Right", -0.25, 0.55); }
      else {
        const cyc = longJ * (1 - drop), a = this.airPh;
        leg("Left", lerp(0.22 + tuck * 0.1, 0.3 * Math.sin(a), cyc) + drop * 0.05, lerp(stand - 0.1 - tuck * 0.32, stand - 0.15 - 0.2 * Math.max(0, Math.cos(a)), cyc) - drop * 0.05, 0.04 + drop * 0.08);
        leg("Right", lerp(-0.12 + tuck * 0.15, -0.3 * Math.sin(a), cyc) - drop * 0.1, lerp(stand - 0.04 - tuck * 0.18, stand - 0.15 - 0.2 * Math.max(0, -Math.cos(a)), cyc) - drop * 0.1, -0.04 - drop * 0.08);
      }
      const ar = -0.3 - tuck * 0.9, b = this.armPh;
      arm("Left", lerp(ar - 0.4, -1.4 + Math.sin(b) * 1.25, wm), lerp(-0.5, -0.35, wm), lerp(0.35 + (1 - tuck) * 0.4, 0.45 + drop * 0.4 + Math.cos(b) * 0.25, wm));
      arm("Right", lerp(ar + 0.3, -1.4 + Math.sin(b + Math.PI) * 1.25, wm), lerp(-0.7, -0.35, wm), lerp(0.35 + (1 - tuck) * 0.4, 0.45 + drop * 0.4 + Math.cos(b + Math.PI) * 0.25, wm));
      P.Neck = [-0.1 + drop * 0.2, 0, 0];
      // Mini-Hüpfer (linke Maus, bis Kniehöhe): kurzer Hupf, Knie hoch, vorderer Fuß greift nach der Oberkante
      if (s.hop) {
        const hk = clamp(s.hop.t / 0.42, 0, 1), tk = Math.sin(Math.PI * Math.min(1, hk * 1.15)), hh = clamp(s.hop.h / 0.6, 0.3, 1);
        const J = this.jump, Ld = J && J.leg === "Left" ? "Right" : "Left", Tk = Ld === "Left" ? "Right" : "Left", sl = Ld === "Left" ? 1 : -1;
        leg(Ld, 0.18 + 0.12 * tk, stand - (0.12 + 0.36 * hh) * tk, sl * 0.05);
        leg(Tk, -0.12 + 0.2 * tk, stand - (0.06 + 0.26 * hh) * tk, -sl * 0.05);
        arm(Ld, 0.25 - 0.5 * tk, -0.7, 0.22); arm(Tk, -0.55 - 0.45 * tk, -0.9, 0.25);
        lean = 0.14 + 0.1 * tk; comp = lean; P.Neck = [-0.12, 0, 0]; P.Spine = [0.06 * tk, sl * 0.06, 0];
      }
      // Absprung-Pose: Sprungbein streckt nach hinten, Schwungbein zieht das Knie hoch, Gegenarm schwingt nach vorne
      if (this.jump && !s.wallJump && !s.hop) {
        const J = this.jump, jk = (1 - smoothK((J.t - 0.08) / 0.45)) * (s.vy > -3 ? 1 : 0.4);
        const mix = (n, v) => { const p = P[n] || (P[n] = [0, 0, 0]); for (let i = 0; i < 3; i++) p[i] = lerp(p[i], v[i], jk); };
        if (J.leg === "Both") {
          const k2 = smoothK(J.t / 0.25);
          mix("LeftUpperLeg", [-0.95, 0, 0.06]); mix("RightUpperLeg", [-0.95, 0, -0.06]); mix("LeftLowerLeg", [1.35, 0, 0]); mix("RightLowerLeg", [1.35, 0, 0]);
          mix("LeftFoot", [0.3, 0, 0]); mix("RightFoot", [0.3, 0, 0]);
          mix("LeftUpperArm", [lerp(-2.5, -1.2, k2), 0, 0.3]); mix("RightUpperArm", [lerp(-2.5, -1.2, k2), 0, -0.3]); mix("LeftLowerArm", [-0.4, 0, 0]); mix("RightLowerArm", [-0.4, 0, 0]);
          mix("Spine", [0.12, 0, 0]); lean = lerp(lean, 0.15, jk);
        } else {
          const T = J.leg, Ld = T === "Left" ? "Right" : "Left", sg = Ld === "Left" ? 1 : -1;
          mix(T + "UpperLeg", [0.45, 0, -sg * 0.04]); mix(T + "LowerLeg", [0.55, 0, 0]); mix(T + "Foot", [0.65, 0, 0]);
          mix(Ld + "UpperLeg", [-1.25, 0, sg * 0.05]); mix(Ld + "LowerLeg", [1.45, 0, 0]); mix(Ld + "Foot", [-0.05, 0, 0]);
          mix(T + "UpperArm", [-1.35, 0, -sg * 0.18]); mix(T + "LowerArm", [-1.25, 0, 0]);
          mix(Ld + "UpperArm", [0.55, 0, sg * 0.2]); mix(Ld + "LowerArm", [-0.7, 0, 0]);
          mix("Spine", [0.1, sg * 0.14, 0]); mix("Chest", [0.06, sg * 0.12, 0]); lean = lerp(lean, 0.2, jk);
        }
      }
    }
    // Haltungen aus dem Animations-Editor addieren
    lean += poseLean; hipY += poseHip;
    for (const k in PW) {
      const A = POSE[k], w = PW[k]; if (!A || w < 0.002) continue;
      POSE_PARTS.forEach(([pk, bn, pair]) => { const v = A.parts[pk]; if (!v) return; const x = v[0] * DEG * w, y = v[1] * DEG * w, z = v[2] * DEG * w;
        if (pair) { add("Left" + bn, x, y, z); add("Right" + bn, x, -y, -z); } else add(bn, x, y, z); });
    }
    // Oberkörper zur Blickrichtung drehen (Hüfte zeigt in Laufrichtung)
    const tw = (s.twist || 0) * ANIM.twist;
    if (tw) [["Spine", 0.3], ["Chest", 0.35], ["Neck", 0.2], ["Head", 0.15]].forEach(([n, k]) => add(n, 0, tw * k, 0));

    // ---- Federn für den ganzen Körper ----
    this.lean = this.spring("lean", lean, leanW, leanZ, dt);
    this.roll = this.spring("roll", roll, rollW, rollZ, dt);
    this.hipY = this.spring("hip", hipY, hipW, hipZ, dt);
    // Oberkörper schwingt nach: federt bei Landung und Antritt, schwankt in Kurven (Kopf gleicht aus)
    const hv = (this.hipY - this.hipPrev) / Math.max(dt, 1e-4); this.hipPrev = this.hipY;
    const cp = this.spring("chestP", clamp(-hv * 0.07, -0.3, 0.3) + (loco ? clamp(-s.acc * 0.012, -0.08, 0.08) : 0), 15, 0.38, dt);
    const cr = this.spring("chestR", loco ? clamp(s.lat * 0.014, -0.14, 0.14) : 0, 13, 0.42, dt);
    add("Spine", cp * 0.4, 0, cr * 0.5); add("Chest", cp * 0.6, 0, cr * 0.5); add("Neck", -cp * 0.8, 0, -cr * 0.8);

    const ZL = Math.max(Z, 0.88), ZA = Z * 0.82;
    for (const n in this.b) {
      const p = P[n] || [0, 0, 0], z = /Leg|Foot|Toes/.test(n) ? ZL : /Arm|Hand|Spine|Chest|Neck|Head/.test(n) ? ZA : Z;
      this.j(n, p[0], p[1], p[2], /Leg|Foot/.test(n) && loco ? Math.max(W, 30) : W, z, dt);
    }
    this.flip = mode === "roll" ? flip : damp(this.flip, 0, 30, dt);
    if (terrain) { const FL = this.foot.Left, FR = this.foot.Right, lw = loco ? FL.w : 1, rw = loco ? FR.w : 1; this.pelOff = damp(this.pelOff, clamp(Math.min(0, FL.o * lw, FR.o * rw), -0.4, 0), 12, dt); }
    else { this.pelOff = damp(this.pelOff, 0, 10, dt); this.foot.Left.o = damp(this.foot.Left.o, 0, 10, dt); this.foot.Right.o = damp(this.foot.Right.o, 0, 10, dt); }
    this.pivZ = damp(this.pivZ, pivZ, 10, dt);
    const leanPiv = loco || mode === "crouch" || mode === "impact" || mode === "stun" ? comp : this.lean;
    this.pivot.position.set(0, HIP_H + this.hipY + bob + this.pelOff, this.pivZ);
    this.pivot.rotation.set(leanPiv + this.flip, 0, this.roll, "YXZ");
    // Pendeln beim Hängen: der ganze Körper dreht um die Hände
    if (mode === "hang" && this.pend) this.applyPendulum(s.hang);
    // IK: Hände an Kante/Wand, Beine beim Slide an Bodenpunkte
    this.ikW = damp(this.ikW, hands ? hands.w : 0, 14, dt);
    if ((hands && this.ikW > 0.01) || legIKs) this.root.updateMatrixWorld(true);
    if (hands && this.ikW > 0.01) {
      const away = hands.n.clone().multiplyScalar(0.6);
      if (!hands.only || hands.only === "Left") this.armIK("Left", hands.L, away.clone().addScaledVector(hands.right, -0.7).add(_v.set(0, -0.3, 0)), this.ikW);
      if (!hands.only || hands.only === "Right") this.armIK("Right", hands.R, away.clone().addScaledVector(hands.right, 0.7).add(_v.set(0, -0.3, 0)), this.ikW);
    }
    if (legIKs) { this.legW = damp(this.legW || 0, 1, 12, dt); legIKs.forEach((L) => this.limbIK(L.side + "UpperLeg", L.side + "LowerLeg", L_THIGH, L_SHIN, L.target, L.pole, this.legW)); }
    else this.legW = 0;
  }
  // Gewicht je Animation (0…1) für die Haltungen aus dem Animations-Editor
  poseWeights(s, mode, sp) {
    const W = {}, loco = mode === "run" || mode === "idle";
    if (loco) {
      const rf = smoothK((sp - 1.9) / 1.1), mv = clamp(sp / 0.9, 0, 1), sw = smoothK((sp - 6.6) / 2.4), T3 = this.terr, r = T3.rough, g = 1 - Math.max(r, T3.up * (1 - r), T3.dn * (1 - r)) * 0.5;
      W.idle = 1 - mv; W.walk = mv * (1 - rf); W.run = mv * rf * (1 - sw); W.sprint = mv * rf * sw;
      W.rough = r * mv; W.stairsUp = T3.up * (1 - r) * mv; W.stairsDown = T3.dn * (1 - r) * mv; W.land = s.land || 0;
      W.walk *= g; W.run *= g; W.sprint *= g;
    } else if (mode === "air") { if (s.hop) W.hop = 1; else if (s.vy > 0) W.jump = 1; else W.fall = 1; }
    else if (mode === "vault") { const kd = s.climb && s.climb.kind; W[kd === "swing" ? "swing" : kd === "over" ? "flank" : kd === "pullover" ? "pullover" : kd === "hands" ? "vaultHands" : "vaultStep"] = 1; }
    else if (mode === "impact" || mode === "stun") W.stun = 1;
    else if (ANIM_KEYS.indexOf(mode) >= 0) W[mode] = 1;
    return W;
  }
  // Pendel: Winkel th (zur Wand hin/weg) und ph (seitlich) um die Hände; Anfangsschwung aus der Geschwindigkeit beim Greifen
  pendulum(dt, H) {
    const Lp = 1.2, g = 23;
    if (!this.pend || this.pend.id !== H.id) {
      const v = H.v0 || new THREE.Vector3(), n = H.n, right = new THREE.Vector3(n.z, 0, -n.x);
      const toward = -(v.x * n.x + v.z * n.z), side = -(v.x * right.x + v.z * right.z);
      this.pend = { id: H.id, th: 0, thv: H.feetFree ? -clamp(toward, 0, 9) / Lp * 0.9 + clamp(-v.y, 0, 8) * 0.04 : 0, ph: 0, phv: H.feetFree ? clamp(side, -8, 8) / Lp * 0.8 : 0 };
    }
    const Pd = this.pend, n = Math.max(1, Math.ceil(dt / 0.008)), h = dt / n;
    for (let i = 0; i < n; i++) {
      const free = H.feetFree ? 1 : 0;
      Pd.thv += (-(g / Lp) * Math.sin(Pd.th) * free - 0.9 * Pd.thv - (free ? 0 : 30 * Pd.th)) * h; Pd.th += Pd.thv * h;
      Pd.phv += (-(g / Lp) * Math.sin(Pd.ph) * free - 1.1 * Pd.phv - (free ? 0 : 30 * Pd.ph) + H.move * -0.8) * h; Pd.ph += Pd.phv * h;
      // die Füße stoßen an die Wand: abprallen
      if (Pd.th < -0.06) { Pd.th = -0.06; if (Pd.thv < 0) Pd.thv *= -0.35; }
      Pd.th = clamp(Pd.th, -0.06, 1.1); Pd.ph = clamp(Pd.ph, -0.7, 0.7);
    }
    return Pd;
  }
  applyPendulum(H) {
    const Pd = this.pend; if (Math.abs(Pd.th) < 1e-4 && Math.abs(Pd.ph) < 1e-4) return;
    const right = new THREE.Vector3(H.n.z, 0, -H.n.x), hp = H.edge.clone().addScaledVector(H.n, -0.04); hp.y = H.top + 0.035;
    const yaw = this.root.rotation.y, q = new THREE.Quaternion().setFromEuler(new THREE.Euler(Pd.th, yaw, Pd.ph, "YXZ")), qy = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0));
    const off = this.root.position.clone().sub(hp).applyQuaternion(qy.clone().invert()).applyQuaternion(q);
    this.root.position.copy(hp).add(off);
    this.root.quaternion.copy(q);
  }
  place(pos, yaw) { if (this.rag) return; this.root.position.copy(pos); this.root.rotation.set(0, yaw, 0); }

  // ---------- leichte Ragdoll: Punkte an den Gelenken, Stäbe dazwischen, Schwerkraft, Kollision mit der Welt ----------
  startRagdoll(vel) {
    this.root.updateMatrixWorld(true);
    const W = (n, dy) => { const p = this.b[n].getWorldPosition(new THREE.Vector3()).divideScalar(this.ws); if (dy) p.y += dy; return p; };
    const names = ["pelvis", "neck", "head", "lSh", "lEl", "lHa", "rSh", "rEl", "rHa", "lHip", "lKn", "lFt", "rHip", "rKn", "rFt"];
    const pos = [W("Hips"), W("Neck"), W("Head", 0.11), W("LeftUpperArm"), W("LeftLowerArm"), W("LeftHand"), W("RightUpperArm"), W("RightLowerArm"), W("RightHand"),
      W("LeftUpperLeg"), W("LeftLowerLeg"), W("LeftFoot"), W("RightUpperLeg"), W("RightLowerLeg"), W("RightFoot")];
    const I = {}; names.forEach((n, i) => { I[n] = i; });
    const v = (vel || new THREE.Vector3()).clone(); v.y = Math.max(v.y, -14) * 0.35; v.x *= 0.7; v.z *= 0.7;
    const pts = pos.map((p, i) => ({ p: p, o: p.clone().addScaledVector(v, -1 / 120), r: i === 2 ? 0.12 : i === 0 ? 0.1 : 0.06 }));
    // Beinbruch: das rechte Knie knickt seitlich weg, der Körper sackt nach vorne
    const side = new THREE.Vector3(Math.cos(this.root.rotation.y), 0, -Math.sin(this.root.rotation.y));
    pts[I.rKn].o.addScaledVector(side, 0.035); pts[I.rKn].o.y += 0.01;
    const fw = new THREE.Vector3(Math.sin(this.root.rotation.y), 0, Math.cos(this.root.rotation.y));
    [I.neck, I.head, I.lSh, I.rSh].forEach((i) => pts[i].o.addScaledVector(fw, -0.02));
    const S = [];
    const stick = (a, b, stiff) => S.push({ a: I[a], b: I[b], L: pts[I[a]].p.distanceTo(pts[I[b]].p), k: stiff == null ? 1 : stiff });
    stick("pelvis", "neck"); stick("neck", "head"); stick("neck", "lSh"); stick("neck", "rSh"); stick("lSh", "rSh");
    stick("pelvis", "lHip"); stick("pelvis", "rHip"); stick("lHip", "rHip"); stick("lSh", "lHip"); stick("rSh", "rHip"); stick("lSh", "rHip", 0.6); stick("rSh", "lHip", 0.6);
    stick("lSh", "lEl"); stick("lEl", "lHa"); stick("rSh", "rEl"); stick("rEl", "rHa");
    stick("lHip", "lKn"); stick("lKn", "lFt"); stick("rHip", "rKn"); stick("rKn", "rFt");
    this.rag = { pts: pts, S: S, I: I, t: 0, acc: 0, minLeg: { l: [I.lHip, I.lFt, 0.32], r: [I.rHip, I.rFt, 0.12] } };
    this.cur = {}; this.jv = {};
  }
  ragdoll(dt, s) {
    if (!this.rag) this.startRagdoll(s.breakVel);
    const G = this.rag; G.t += dt; G.acc += Math.min(dt, 0.05);
    const h = 1 / 120;
    while (G.acc >= h) {
      G.acc -= h;
      if (G.t > 4) break;
      const damping = G.t > 1.2 ? 0.96 : 0.995;
      for (const q of G.pts) { const vx = (q.p.x - q.o.x) * damping, vy = (q.p.y - q.o.y) * damping, vz = (q.p.z - q.o.z) * damping; q.o.copy(q.p); q.p.x += vx; q.p.y += vy - 23 * h * h; q.p.z += vz; }
      for (let it = 0; it < 8; it++) {
        for (const c of G.S) {
          const A = G.pts[c.a].p, B = G.pts[c.b].p, d = _v.subVectors(B, A), L = d.length() || 1e-6, diff = (L - c.L) / L * 0.5 * c.k;
          A.addScaledVector(d, diff); B.addScaledVector(d, -diff);
        }
        // Beine falten nicht ganz zusammen (außer dem gebrochenen etwas mehr)
        [G.minLeg.l, G.minLeg.r].forEach(([a, b, mn]) => { const A = G.pts[a].p, B = G.pts[b].p, d = _v.subVectors(B, A), L = d.length(); if (L < mn && L > 1e-6) { const k = (L - mn) / L * 0.5; A.addScaledVector(d, k); B.addScaledVector(d, -k); } });
        if (this.world) for (const q of G.pts) {
          const before = _v2.copy(q.p);
          if (this.world.collideSphere(q.p, q.r, null)) { const vx = q.p.x - q.o.x, vz = q.p.z - q.o.z; q.o.x = q.p.x - vx * 0.55; q.o.z = q.p.z - vz * 0.55; if (q.p.y > before.y) q.o.y = Math.max(q.o.y, q.p.y - Math.abs(q.p.y - q.o.y) * 0.2); }
        }
      }
    }
    this.applyRag();
  }
  applyRag() {
    const G = this.rag, P = (n) => G.pts[G.I[n]].p;
    const pelvis = P("pelvis"), up = _v.subVectors(P("neck"), pelvis).normalize(), left = new THREE.Vector3().subVectors(P("lHip"), P("rHip"));
    left.addScaledVector(up, -left.dot(up)).normalize(); const fw = new THREE.Vector3().crossVectors(left, up).normalize();
    const m = new THREE.Matrix4().makeBasis(left, up.clone(), fw);
    this.root.position.set(pelvis.x, pelvis.y - HIP_H, pelvis.z); this.root.rotation.set(0, 0, 0);
    this.pivot.position.set(0, HIP_H, 0); this.pivot.rotation.set(0, 0, 0);
    ["Spine", "Chest", "LeftShoulder", "RightShoulder", "Head", "LeftHand", "RightHand"].forEach((n) => this.b[n].quaternion.identity());
    this.b.Hips.quaternion.setFromRotationMatrix(m);
    this.root.updateMatrixWorld(true);
    const aimTo = (bone, from, to) => { const d = new THREE.Vector3().subVectors(P(to), P(from)); if (d.lengthSq() > 1e-8) aimBone(this.b[bone], d.normalize().multiplyScalar(1), 1); };
    // Hals zeigt nach oben: Ruherichtung umdrehen
    const nd = new THREE.Vector3().subVectors(P("head"), P("neck")).normalize().negate(); aimBone(this.b.Neck, nd, 1); this.b.Neck.quaternion.multiply(_q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), 0)); this.b.Neck.updateMatrixWorld(true);
    aimTo("LeftUpperArm", "lSh", "lEl"); aimTo("LeftLowerArm", "lEl", "lHa"); aimTo("RightUpperArm", "rSh", "rEl"); aimTo("RightLowerArm", "rEl", "rHa");
    aimTo("LeftUpperLeg", "lHip", "lKn"); aimTo("LeftLowerLeg", "lKn", "lFt"); aimTo("RightUpperLeg", "rHip", "rKn"); aimTo("RightLowerLeg", "rKn", "rFt");
    ["LeftFoot", "RightFoot"].forEach((n) => { this.b[n].quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.4); });
  }
  dispose() {
    if (this.root.parent) this.root.parent.remove(this.root);
    this.root.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    this.mat.dispose(); this.dark.dispose();
  }
}
function wrapA(a) { return ((a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; }
function smoothK(k) { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); }
