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
    const sp = s.speed, mode = s.mode, loco = mode === "run" || mode === "idle";
    const K = loco ? 30 : mode === "roll" ? 30 : mode === "mantle" ? 24 : 16;
    const P = {};   // Ziel-Pose: Name → [x, y, z]
    let lean = 0, roll = 0, hipY = 0, flip = 0, comp = 0, grounded = false;
    // Bein per IK: Fuß f vor / d unter der Hüfte, lat seitlich (+ = links), wp = Fußneigung in der Welt (+ = Zehen runter).
    // Die Neigung des Körpers wird herausgerechnet, bei Bodenkontakt auch die Hüftsenkung.
    const leg = (side, f, d, lat, wp) => {
      if (grounded) d += hipY;
      const c = Math.cos(comp), sn = Math.sin(comp), a = legIK(f * c + d * sn, d * c - f * sn);
      P[side + "UpperLeg"] = [a[0], 0, lat ? Math.atan2(lat, Math.max(0.3, d)) : 0]; P[side + "LowerLeg"] = [a[1], 0, 0];
      P[side + "Foot"] = [wp != null ? clamp(wp - (a[0] + a[1]) - comp, -1.3, 1.3) : clamp(-(a[0] + a[1]) - comp, -0.9, 0.9) * 0.7, 0, 0];
    };
    const arm = (side, sh, el, out) => { const sg = side === "Left" ? 1 : -1; P[side + "UpperArm"] = [sh, 0, sg * (out || 0.12)]; P[side + "LowerArm"] = [el, 0, 0]; };
    const stand = HIP_H - ANKLE;

    if (loco) {
      // ---- Gehen, Laufen, Sprinten, Stehen: ein durchgehender Gangzyklus ----
      // Schrittfrequenz und Bodenkontakt-Anteil hängen vom Tempo ab; die Schrittlänge folgt daraus,
      // damit der Standfuß auf dem Boden stehen bleibt (kein Rutschen). Unter ~2 m/s Gehen (Doppelstand), darüber Laufen (Flugphase).
      const v = s.turning ? Math.max(sp, 0.9) : sp;
      const rf = smoothK((v - 1.9) / 1.1), mv = clamp(v / 0.9, 0, 1), kv = clamp(v / 9.6, 0, 1);
      const cad = lerp(0.62 + 0.27 * v, 1.25 + 0.115 * Math.max(0, v - 3), rf);
      const bMax = lerp(0.6, clamp(0.42 - 0.02 * v, 0.24, 0.42), rf), SLmax = lerp(0.72, 0.84, rf);
      const beta = clamp(Math.min(bMax, SLmax * cad / Math.max(v, 0.05)), 0.17, 0.62);
      const SL = s.turning && sp < 0.3 ? 0.14 : v * beta / cad;
      if (v > 0.04) this.phase = (this.phase + dt * cad) % 1;
      const H = lerp(0.06 + 0.035 * v, 0.14 + 0.045 * v, rf) * mv, Lf = SL * 0.42, Lb = SL * 0.58;
      const ga = s.back ? wrapA((s.moveRel || 0) - Math.PI) : (s.moveRel || 0), cg = Math.cos(ga), sg = Math.sin(ga);
      const pL = this.phase, br = Math.sin(this.t * 1.7), still = 1 - mv;
      // Körper: beim Gehen am höchsten über dem Standbein, beim Laufen am tiefsten (federt ein); Bremsen senkt die Hüfte
      const bobA = (0.016 * (1 - rf) - (0.022 + 0.0035 * v) * rf) * mv;
      hipY = bobA * Math.cos(4 * Math.PI * (pL - beta / 2)) - (0.03 + 0.004 * v) * rf * mv - clamp(-s.acc * 0.007, 0, 0.06) * mv - s.land * 0.22 + (br * 0.005 - 0.006) * still;
      // Neigung: Grundhaltung nach Tempo, Antritt drückt nach vorne, Bremsen nach hinten; Kurven: in die Kurve legen
      const leanT = (s.back ? -0.07 : lerp(0.02, 0.07, rf) + 0.13 * kv * kv) * mv + clamp(s.acc * 0.05, -0.34, 0.36) + s.land * 0.2;
      this.lean = damp(this.lean, leanT, 10, dt); lean = this.lean; comp = lean; grounded = true;
      roll = clamp(-s.lat / 9.81, -0.42, 0.42) * 0.9 + Math.sin(this.t * 0.5) * 0.012 * still;
      const xs = [];
      ["Left", "Right"].forEach((side, i) => {
        const p = (pL + i * 0.5) % 1; let x, h, wp;
        if (p < beta) {
          // Standphase: Fuß wandert unter dem Körper nach hinten, am Ende hebt die Ferse ab (Abdruck über die Zehen)
          const k = p / beta; x = Lf - (Lf + Lb) * k;
          const ho = Math.max(0, -x - 0.06); h = ho * lerp(0.12, 0.34, rf); wp = Math.min(0.95, ho * 2.6);
          if (rf < 1 && k < 0.18) wp -= (1 - rf) * 0.22 * (1 - k / 0.18);   // Gehen: Fersenaufsatz
        } else {
          // Schwungphase: Ferse zieht hoch (beim Sprint bis zum Po), Knie nach vorne, Fuß setzt wieder auf
          // Laufen: Oberschenkel schwingt früh nach vorne, Unterschenkel klappt ein (Ferse unter den Po), dann Knie vor und Fuß greift
          const q = (p - beta) / (1 - beta), xq = lerp((1 - Math.cos(Math.PI * q)) / 2, 1 - Math.pow(1 - q, 2.2), rf);
          x = -Lb + (Lf + Lb + 0.05 * rf * mv) * xq - 0.05 * rf * mv * smoothK((q - 0.75) / 0.25);
          h = H * Math.sin(Math.PI * Math.pow(q, lerp(0.8, 0.62, rf))); wp = (0.8 * Math.pow(1 - q, 1.5) - (1 - rf) * 0.22 * Math.pow(q, 4)) * mv;
        }
        if (s.back) x = -x;
        xs.push(x);
        const out = i === 0 ? 1 : -1;
        const lat = x * sg + out * (lerp(0.03, -0.012, rf) * mv + 0.035 * still);
        leg(side, x * cg + still * (i === 0 ? 0.04 : -0.03), stand - h, lat, wp);
      });
      // Becken dreht mit dem vorderen Bein, Schultern dagegen; Arme schwingen gegengleich zu den Beinen
      const pr = -0.24 * (xs[0] - xs[1]) * (0.35 + 0.65 * rf), nR = clamp((xs[1] - xs[0]) / Math.max(Lf + Lb, 0.25), -1, 1);
      const A = lerp(0.26, 0.48 + 0.05 * v, rf) * mv, eb = lerp(0.3, 1.15 + 0.04 * v, rf) * mv + 0.18 * still;
      arm("Left", -A * nR + 0.05 * still + br * 0.015 * still, -(eb + 0.35 * Math.max(0, nR) * rf), lerp(0.09, 0.15, rf));
      arm("Right", A * nR + 0.05 * still + br * 0.015 * still, -(eb + 0.35 * Math.max(0, -nR) * rf), lerp(0.09, 0.15, rf));
      P.Hips = [0, pr, 0];
      P.Spine = [lean * 0.22 + br * 0.012 * still, -pr * 0.5, 0]; P.Chest = [0.03 - br * 0.008 * still, -pr * 0.8, 0];
      P.Neck = [-lean * 0.7, -pr * 0.2, -roll * 0.5]; P.Head = [-0.03, 0, 0];
    } else if (mode === "wallrun" || mode === "climb") {
      // Laufzyklus an der Wand
      const cad = mode === "climb" ? 2.6 : 0.75 + sp * 0.15, stride = mode === "climb" ? 0.16 : clamp(0.1 + sp * 0.045, 0.12, 0.5);
      this.phase = (this.phase + dt * cad) % 1;
      const k = clamp(sp / 9, 0, 1), th = this.phase * Math.PI * 2;
      hipY = -Math.abs(Math.cos(th)) * 0.05 * (0.3 + k) - 0.04 * k;
      lean = mode === "climb" ? -0.1 : 0.12; comp = lean;
      if (mode === "wallrun") roll = s.wallSide * 0.42;
      ["Left", "Right"].forEach((side, i) => {
        const a = th + i * Math.PI, f = stride * Math.sin(a), sw = Math.max(0, Math.cos(a));
        const lift = sw * (0.08 + 0.22 * k) + (mode === "climb" ? sw * 0.28 : 0);
        leg(side, f + 0.02 + k * 0.04, stand - lift);
        const as = -Math.sin(a + Math.PI) * (0.25 + 0.8 * k);
        arm(side, mode === "climb" ? -2.3 + as * 0.4 : as, -0.35 - 1.05 * k - (mode === "climb" ? 0.3 : 0), 0.1);
      });
      P.Spine = [lean * 0.3, Math.sin(th) * 0.12 * k, 0]; P.Chest = [0.04, -Math.sin(th) * 0.18 * k, 0]; P.Neck = [-lean * 0.6, 0, -roll * 0.6]; P.Head = [-0.05, 0, 0];
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
    // Oberkörper zur Blickrichtung drehen (Hüfte zeigt in Laufrichtung)
    const tw = s.twist || 0;
    if (tw) [["Spine", 0.3], ["Chest", 0.35], ["Neck", 0.2], ["Head", 0.15]].forEach(([n, k]) => { const p = P[n] || (P[n] = [0, 0, 0]); p[1] += tw * k; });

    for (const n in this.b) { const p = P[n] || [0, 0, 0]; this.j(n, p[0], p[1], p[2], K, dt); }
    if (!loco) this.lean = damp(this.lean, lean, mode === "mantle" ? 20 : 12, dt);
    this.roll = damp(this.roll, roll, 7, dt);
    this.hipY = damp(this.hipY, hipY, loco ? 40 : mode === "roll" || mode === "slide" ? 22 : 16, dt);
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
function wrapA(a) { return ((a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; }
function smoothK(k) { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); }
