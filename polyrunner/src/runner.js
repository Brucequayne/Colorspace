// ===== runner.js · Test-Runner: Low-Poly-Strichmännchen auf einem Skelett, prozedurale Animation =====
// Das Skelett ist das eigentliche Rig: Knochen mit Standardnamen (siehe BONES). Die Körperteile hängen starr an den Knochen.
// Später kommt ein echtes Modell (SkinnedMesh) mit denselben Knochennamen drauf, die Animation bleibt dieselbe.
// Ruhepose: Figur schaut nach +Z, links = +X, Arme und Beine hängen gerade nach unten (-Y).
// Drehung um X: negativ = Glied schwingt nach vorne.
import * as THREE from "three";
import { damp, clamp, lerp } from "pru/core.js";

export const HIP_H = 0.9, L_THIGH = 0.415, L_SHIN = 0.415, ANKLE = 0.07;
// [Name, Elternknochen, Position relativ zum Eltern]
export const BONES = [
  ["Hips", null, [0, 0, 0]],
  ["Spine", "Hips", [0, 0.1, 0]], ["Chest", "Spine", [0, 0.2, 0]], ["Neck", "Chest", [0, 0.2, 0]], ["Head", "Neck", [0, 0.09, 0]],
  ["LeftShoulder", "Chest", [0.06, 0.16, 0]], ["LeftUpperArm", "LeftShoulder", [0.12, 0, 0]], ["LeftLowerArm", "LeftUpperArm", [0, -0.28, 0]], ["LeftHand", "LeftLowerArm", [0, -0.26, 0]],
  ["RightShoulder", "Chest", [-0.06, 0.16, 0]], ["RightUpperArm", "RightShoulder", [-0.12, 0, 0]], ["RightLowerArm", "RightUpperArm", [0, -0.28, 0]], ["RightHand", "RightLowerArm", [0, -0.26, 0]],
  ["LeftUpperLeg", "Hips", [0.1, 0, 0]], ["LeftLowerLeg", "LeftUpperLeg", [0, -L_THIGH, 0]], ["LeftFoot", "LeftLowerLeg", [0, -L_SHIN, 0]], ["LeftToes", "LeftFoot", [0, -0.05, 0.13]],
  ["RightUpperLeg", "Hips", [-0.1, 0, 0]], ["RightLowerLeg", "RightUpperLeg", [0, -L_THIGH, 0]], ["RightFoot", "RightLowerLeg", [0, -L_SHIN, 0]], ["RightToes", "RightFoot", [0, -0.05, 0.13]]
];

// Zwei-Knochen-IK in der Seitenebene: Fuß f Meter vor und d Meter unter der Hüfte → [Oberschenkel x, Knie x]
function legIK(f, d) {
  const L1 = L_THIGH, L2 = L_SHIN, D = clamp(Math.hypot(f, d), 0.12, L1 + L2 - 0.002);
  const knee = Math.PI - Math.acos(clamp((L1 * L1 + L2 * L2 - D * D) / (2 * L1 * L2), -1, 1));
  const phi = Math.atan2(f, d), alpha = Math.acos(clamp((L1 * L1 + D * D - L2 * L2) / (2 * L1 * D), -1, 1));
  return [-(phi + alpha), knee];
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
    this.scene = scene;
    this.cur = {};    // aktuelle Gelenkwinkel (gedämpft)
    this.t = 0; this.phase = 0; this.lean = 0; this.roll = 0; this.flip = 0; this.hipY = 0;
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
  // Gelenk weich auf Zielwinkel ziehen
  j(name, x, y, z, k, dt) {
    const c = this.cur[name] || (this.cur[name] = [0, 0, 0]);
    c[0] = damp(c[0], x || 0, k, dt); c[1] = damp(c[1], y || 0, k, dt); c[2] = damp(c[2], z || 0, k, dt);
    this.b[name].rotation.set(c[0], c[1], c[2]);
  }
  // s: Zustand aus der Bewegung (move.js)
  update(dt, s) {
    this.t += dt;
    const sp = s.speed, mode = s.mode, K = mode === "roll" ? 30 : mode === "mantle" ? 24 : 16;
    const P = {};   // Ziel-Pose: Name → [x, y, z]
    let lean = 0, roll = 0, hipY = 0, flip = 0, comp = 0, grounded = false;
    // Bein per IK: Fuß f vor / d unter der Hüfte (Weltlage); Neigung des Körpers wird herausgerechnet, Hüftsenkung bei Bodenkontakt
    const leg = (side, f, d) => {
      if (grounded) d += hipY;
      const c = Math.cos(comp), sn = Math.sin(comp), a = legIK(f * c + d * sn, d * c - f * sn);
      P[side + "UpperLeg"] = [a[0], 0, 0]; P[side + "LowerLeg"] = [a[1], 0, 0]; P[side + "Foot"] = [clamp(-(a[0] + a[1]) - comp, -0.9, 0.9) * 0.7, 0, 0];
    };
    const arm = (side, sh, el, out) => { const sg = side === "Left" ? 1 : -1; P[side + "UpperArm"] = [sh, 0, sg * (out || 0.12)]; P[side + "LowerArm"] = [el, 0, 0]; };
    const stand = HIP_H - ANKLE;

    if (mode === "run" || mode === "wallrun" || mode === "climb") {
      // Laufzyklus: Frequenz und Schrittlänge steigen mit dem Tempo
      const cad = mode === "climb" ? 2.6 : 0.75 + sp * 0.15, stride = mode === "climb" ? 0.16 : clamp(0.1 + sp * 0.045, 0.12, 0.5);
      this.phase = (this.phase + dt * cad) % 1;
      const k = clamp(sp / 9, 0, 1), th = this.phase * Math.PI * 2;
      hipY = -Math.abs(Math.cos(th)) * 0.05 * (0.3 + k) - 0.04 * k;
      lean = mode === "climb" ? -0.1 : 0.06 + 0.22 * k; comp = lean; grounded = mode === "run";
      if (mode === "wallrun") { roll = s.wallSide * 0.42; lean = 0.12; comp = lean; }
      ["Left", "Right"].forEach((side, i) => {
        const a = th + i * Math.PI, f = stride * Math.sin(a), sw = Math.max(0, Math.cos(a));
        const lift = sw * (0.08 + 0.22 * k) + (mode === "climb" ? sw * 0.28 : 0);
        leg(side, f + 0.02 + k * 0.04, stand - lift);
        const as = -Math.sin(a + Math.PI) * (0.25 + 0.8 * k);
        arm(side, mode === "climb" ? -2.3 + as * 0.4 : as, -0.35 - 1.05 * k - (mode === "climb" ? 0.3 : 0), 0.1);
      });
      P.Spine = [lean * 0.3, Math.sin(th) * 0.12 * k, 0]; P.Chest = [0.04, -Math.sin(th) * 0.18 * k, 0]; P.Neck = [-lean * 0.6, 0, -roll * 0.6]; P.Head = [-0.05, 0, 0];
    } else if (mode === "idle") {
      const br = Math.sin(this.t * 1.7); grounded = true; hipY = -0.006 + br * 0.006;
      leg("Left", 0.03, stand - 0.004); leg("Right", -0.02, stand - 0.004);
      P.LeftUpperLeg[2] = 0.05; P.RightUpperLeg[2] = -0.05;
      arm("Left", 0.05 + br * 0.02, -0.18, 0.1); arm("Right", 0.05 + br * 0.02, -0.18, 0.1);
      P.Spine = [0.02 + br * 0.015, 0, 0]; P.Chest = [-0.02, 0, 0]; P.Head = [0.02, Math.sin(this.t * 0.4) * 0.15, 0];
    } else if (mode === "crouch") {
      const th = (this.phase = (this.phase + dt * (0.4 + sp * 0.6)) % 1) * Math.PI * 2, m = clamp(sp / 2, 0, 1);
      lean = 0.5; comp = lean; hipY = -0.38; grounded = true;
      leg("Left", 0.16 + Math.sin(th) * 0.14 * m, stand - Math.max(0, Math.cos(th)) * 0.08 * m); leg("Right", 0.02 - Math.sin(th) * 0.14 * m, stand - Math.max(0, -Math.cos(th)) * 0.08 * m);
      arm("Left", -0.5, -0.9, 0.2); arm("Right", -0.5, -0.9, 0.2); P.Neck = [-0.45, 0, 0];
    } else if (mode === "slide") {
      // Rutschen: nach hinten gelehnt, vorderes Bein gestreckt, hinteres untergeschlagen, eine Hand am Boden
      lean = -0.5; hipY = -0.5; roll = 0.06;
      leg("Left", 0.55, 0.3); P.RightUpperLeg = [-0.2, 0, -0.3]; P.RightLowerLeg = [2.2, 0, 0]; P.RightFoot = [0.5, 0, 0];
      arm("Left", -0.7, -0.6, 0.25); arm("Right", 0.35, -0.05, 0.6);
      P.Spine = [0.15, 0.15, 0]; P.Chest = [0.22, 0.1, 0]; P.Neck = [0.25, 0, 0];
    } else if (mode === "mantle") {
      const k = s.mantleK;   // 0 → 1
      lean = lerp(0.55, 0.12, k); comp = lean; hipY = lerp(-0.2, 0, k);
      leg("Left", 0.28, lerp(0.38, stand, smoothK(k))); leg("Right", 0.05, lerp(0.5, stand, smoothK(k)));
      const ah = lerp(-2.6, -0.4, clamp(k * 1.4, 0, 1)); arm("Left", ah, -0.15, 0.2); arm("Right", ah, -0.15, 0.2);
      P.Neck = [-0.3, 0, 0];
    } else if (mode === "roll") {
      // Abrollen: eingerollt, einmal ganz um die Hüftachse
      const k = s.rollK;
      leg("Left", 0.35, 0.28); leg("Right", 0.3, 0.3); arm("Left", -1.2, -1.5, 0.35); arm("Right", -1.2, -1.5, 0.35);
      P.Spine = [0.5, 0, 0]; P.Chest = [0.4, 0, 0]; P.Neck = [0.5, 0, 0];
      flip = smoothK(k) * Math.PI * 2; hipY = -0.5 + Math.sin(k * Math.PI) * 0.06;
    } else if (mode === "stun") {
      lean = 0.5; comp = lean; hipY = -0.38; grounded = true;
      leg("Left", 0.2, stand); leg("Right", -0.08, stand); arm("Left", -0.5, -1.0, 0.4); arm("Right", -0.3, -1.2, 0.4);
      P.Neck = [-0.3, 0, 0];
    } else { // air
      const up = clamp(s.vy / 7, -1, 1), tuck = clamp(0.5 + up * 0.5, 0, 1);
      lean = 0.1 + tuck * 0.12 - (up < 0 ? up * 0.08 : 0); comp = lean;
      if (s.wallJump > 0) { leg("Left", 0.3, 0.45); leg("Right", -0.25, 0.55); }
      else { leg("Left", 0.22 + tuck * 0.1, stand - 0.1 - tuck * 0.32); leg("Right", -0.12 + tuck * 0.15, stand - 0.04 - tuck * 0.18); }
      const ar = -0.3 - tuck * 0.9; arm("Left", ar - 0.4, -0.5, 0.35 + (1 - tuck) * 0.4); arm("Right", ar + 0.3, -0.7, 0.35 + (1 - tuck) * 0.4);
      P.Neck = [-0.1, 0, 0];
    }
    // Landestoß: kurz einfedern
    if (s.land > 0 && (mode === "run" || mode === "idle")) {
      const L = s.land; hipY -= L * 0.24; lean += L * 0.22; comp = lean; grounded = true;
      leg("Left", 0.08, stand); leg("Right", -0.04, stand);
    }

    for (const n in this.b) { const p = P[n] || [0, 0, 0]; this.j(n, p[0], p[1], p[2], K, dt); }
    this.lean = damp(this.lean, lean, mode === "mantle" ? 20 : 12, dt); this.roll = damp(this.roll, roll, 9, dt);
    this.hipY = damp(this.hipY, hipY, mode === "roll" || mode === "slide" ? 22 : 16, dt);
    this.flip = mode === "roll" ? flip : damp(this.flip, 0, 30, dt);
    this.pivot.position.y = HIP_H + this.hipY;
    this.pivot.rotation.set(this.lean + this.flip, 0, this.roll, "YXZ");
  }
  place(pos, yaw) { this.root.position.copy(pos); this.root.rotation.y = yaw; }
  dispose() {
    this.scene.remove(this.root);
    this.root.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    this.mat.dispose(); this.dark.dispose();
  }
}
function smoothK(k) { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); }
