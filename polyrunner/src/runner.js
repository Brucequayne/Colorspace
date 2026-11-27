// ===== runner.js · Test-Runner: Low-Poly-Strichmännchen auf einem Skelett, prozedurale Animation =====
// Das Skelett ist das eigentliche Rig: Knochen mit Standardnamen (siehe BONES). Die Körperteile hängen starr an den Knochen.
// Später kommt ein echtes Modell (SkinnedMesh) mit denselben Knochennamen drauf, die Animation bleibt dieselbe.
// Ruhepose: Figur schaut nach +Z, links = +X, Arme und Beine hängen gerade nach unten (-Y).
// Drehung um X: negativ = Glied schwingt nach vorne.
// Bausteine: Gangzyklus mit Bein-IK, Füße passen sich dem Untergrund an (Strahl nach unten je Fuß), Hand-IK an Kanten,
// leichte Ragdoll (Verlet-Punkte mit Stäben) beim Beinbruch.
import * as THREE from "three";
import { damp, clamp, lerp } from "pru/core.js";

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
    this.scene = scene; this.world = null;
    this.cur = {};    // aktuelle Gelenkwinkel (gedämpft)
    this.t = 0; this.phase = 0; this.lean = 0; this.roll = 0; this.flip = 0; this.hipY = 0; this.armPh = 0; this.airPh = 0;
    this.pelOff = 0; this.foot = { Left: { o: 0, p: 0 }, Right: { o: 0, p: 0 } }; this.ikW = 0; this.rag = null;
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
  // Untergrund unter einem Fuß: Höhenunterschied zur Figur und Neigung in Laufrichtung
  ground(side, f, lat) {
    const F = this.foot[side];
    if (!this.world) return F;
    const y = this.root.rotation.y, px = (side === "Left" ? 0.1 : -0.1) + lat, c = Math.cos(y), s = Math.sin(y);
    const x = this.root.position.x + px * c + f * s, z = this.root.position.z - px * s + f * c, by = this.root.position.y;
    const hit = this.world.ray(_v.set(x, by + 0.62, z), DOWN, 1.25, false);
    let o = -0.5, p = 0;
    if (hit) {
      o = clamp(hit.point.y - by, -0.5, 0.48);
      if (hit.face) { const n = hit.face.normal.clone().transformDirection(hit.object.matrixWorld); p = clamp(Math.atan2(n.x * s + n.z * c, n.y), -0.6, 0.6); }
    }
    F.tgt = o; F.pt = p;
    return F;
  }
  // Zwei-Knochen-IK für einen Arm: Hand an Weltpunkt, Ellbogen zeigt Richtung pole
  armIK(side, target, pole, w) {
    if (w <= 0.001) return;
    const A = this.b[side + "UpperArm"], B = this.b[side + "LowerArm"];
    const pA = A.getWorldPosition(new THREE.Vector3()), toT = target.clone().sub(pA);
    const dist = clamp(toT.length(), 0.08, L_UARM + L_LARM - 0.002), dirT = toT.normalize();
    let n = new THREE.Vector3().crossVectors(dirT, pole); if (n.lengthSq() < 1e-5) n.crossVectors(dirT, UPV); n.normalize();
    const al = Math.acos(clamp((L_UARM * L_UARM + dist * dist - L_LARM * L_LARM) / (2 * L_UARM * dist), -1, 1));
    const u = dirT.clone().applyAxisAngle(n, al), elbow = pA.clone().addScaledVector(u, L_UARM);
    aimBone(A, u, w); aimBone(B, target.clone().sub(elbow).normalize(), w);
    [A, B].forEach((bn) => { const c = this.cur[bn.name]; if (c) { c[0] = bn.rotation.x; c[1] = bn.rotation.y; c[2] = bn.rotation.z; } });
  }
  // s: Zustand aus der Bewegung (move.js). Vorher place() aufrufen (Position und Blickrichtung dieses Bildes).
  update(dt, s) {
    this.t += dt;
    if (s.mode === "broken") { this.ragdoll(dt, s); return; }
    if (this.rag) this.rag = null;
    const sp = s.speed, mode = s.mode, loco = mode === "run" || mode === "idle";
    const K = loco ? 30 : mode === "roll" ? 30 : mode === "vault" || mode === "pullup" || mode === "hang" ? 22 : mode === "slide" || mode === "getup" ? 18 : 16;
    const P = {};   // Ziel-Pose: Name → [x, y, z]
    let lean = 0, roll = 0, hipY = 0, flip = 0, comp = 0, grounded = false, terrain = false, hands = null;
    // Bein per IK: Fuß f vor / d unter der Hüfte, lat seitlich (+ = links), wp = Fußneigung in der Welt (+ = Zehen runter).
    // Die Neigung des Körpers wird herausgerechnet, bei Bodenkontakt auch Hüftsenkung und Untergrund.
    const leg = (side, f, d, lat, wp) => {
      if (grounded) {
        d += hipY + this.pelOff;
        if (terrain) { const F = this.ground(side, f, lat || 0); F.o = damp(F.o, F.tgt, 22, dt); F.p = damp(F.p, F.pt, 14, dt); d -= F.o; if (wp != null) wp += F.p; else wp = F.p; }
      }
      const c = Math.cos(comp), sn = Math.sin(comp), a = legIK(f * c + d * sn, d * c - f * sn);
      P[side + "UpperLeg"] = [a[0], 0, lat ? Math.atan2(lat, Math.max(0.3, d)) : 0]; P[side + "LowerLeg"] = [a[1], 0, 0];
      P[side + "Foot"] = [wp != null ? clamp(wp - (a[0] + a[1]) - comp, -1.3, 1.3) : clamp(-(a[0] + a[1]) - comp, -0.9, 0.9) * 0.7, 0, 0];
    };
    const arm = (side, sh, el, out) => { const sg = side === "Left" ? 1 : -1; P[side + "UpperArm"] = [sh, 0, sg * (out || 0.12)]; P[side + "LowerArm"] = [el, 0, 0]; };
    const stand = HIP_H - ANKLE;

    if (loco) {
      // ---- Gehen, Laufen, Sprinten, Stehen: ein durchgehender Gangzyklus ----
      // Schrittfrequenz und Bodenkontakt-Anteil hängen vom Tempo ab; die Schrittlänge folgt daraus,
      // damit der Standfuß auf dem Boden stehen bleibt. Unter ~2 m/s Gehen (Doppelstand), darüber Laufen (Flugphase).
      const v = s.turning ? Math.max(sp, 0.9) : sp;
      const rf = smoothK((v - 1.9) / 1.1), mv = clamp(v / 0.9, 0, 1), kv = clamp(v / 9.6, 0, 1);
      const cad = lerp(0.62 + 0.27 * v, 1.28 + 0.1 * Math.max(0, v - 3), rf);
      const bMax = lerp(0.6, clamp(0.44 - 0.02 * v, 0.26, 0.44), rf), SLmax = lerp(0.72, 0.86, rf);
      const beta = clamp(Math.min(bMax, SLmax * cad / Math.max(v, 0.05)), 0.18, 0.62);
      const SL = s.turning && sp < 0.3 ? 0.14 : v * beta / cad;
      if (v > 0.04) this.phase = (this.phase + dt * cad) % 1;
      // Schwunghöhe: Joggen flach, erst im Sprint klappt die Ferse weit hoch
      const H = lerp(0.05 + 0.03 * v, 0.03 + 0.012 * v + 0.028 * kv * kv * 9.6, rf) * mv, Lf = SL * 0.4, Lb = SL * 0.6;
      const ga = s.back ? wrapA((s.moveRel || 0) - Math.PI) : (s.moveRel || 0), cg = Math.cos(ga), sg = Math.sin(ga);
      const pL = this.phase, br = Math.sin(this.t * 1.7), still = 1 - mv;
      const bobA = (0.016 * (1 - rf) - (0.018 + 0.0028 * v) * rf) * mv;
      hipY = bobA * Math.cos(4 * Math.PI * (pL - beta / 2)) - (0.012 + 0.0022 * v) * rf * mv - clamp(-s.acc * 0.007, 0, 0.06) * mv - s.land * 0.24 + (br * 0.005 - 0.006) * still;
      const leanT = (s.back ? -0.07 : lerp(0.02, 0.06, rf) + 0.12 * kv * kv) * mv + clamp(s.acc * 0.05, -0.34, 0.36) + s.land * 0.2;
      this.lean = damp(this.lean, leanT, 10, dt); lean = this.lean; comp = lean; grounded = true; terrain = true;
      roll = clamp(-s.lat / 9.81, -0.42, 0.42) * 0.9 + Math.sin(this.t * 0.5) * 0.012 * still;
      const xs = [];
      ["Left", "Right"].forEach((side, i) => {
        const p = (pL + i * 0.5) % 1; let x, h, wp;
        if (p < beta) {
          // Standphase: Fuß wandert unter dem Körper nach hinten, am Ende hebt die Ferse ab (Abdruck über die Zehen)
          const k = p / beta; x = Lf - (Lf + Lb) * k;
          const ho = Math.max(0, -x - 0.06); h = ho * lerp(0.12, 0.3, rf); wp = Math.min(0.9, ho * 2.4);
          if (rf < 1 && k < 0.18) wp -= (1 - rf) * 0.22 * (1 - k / 0.18);   // Gehen: Fersenaufsatz
        } else {
          // Schwungphase: Unterschenkel klappt ein, Oberschenkel pendelt nach vorne, Fuß setzt unter dem Körper wieder auf.
          // Beim Joggen bleibt das Knie niedrig, nur im Sprint wird der Kniehub deutlich.
          const q = (p - beta) / (1 - beta), sharp = rf * kv;
          const xq = lerp((1 - Math.cos(Math.PI * q)) / 2, 1 - Math.pow(1 - q, 1.9), sharp);
          x = -Lb + (Lf + Lb) * xq;
          h = H * Math.sin(Math.PI * Math.pow(q, lerp(0.85, 0.62, sharp))); wp = (0.7 * Math.pow(1 - q, 1.5) - (1 - rf) * 0.22 * Math.pow(q, 4)) * mv;
        }
        if (s.back) x = -x;
        xs.push(x);
        const out = i === 0 ? 1 : -1;
        const lat = x * sg + out * (lerp(0.03, -0.01, rf) * mv + 0.035 * still);
        leg(side, x * cg + still * (i === 0 ? 0.04 : -0.03), stand - h, lat, wp);
      });
      // Becken dreht mit dem vorderen Bein, Schultern dagegen; Arme schwingen gegengleich zu den Beinen
      const pr = -0.22 * (xs[0] - xs[1]) * (0.35 + 0.65 * rf), nR = clamp((xs[1] - xs[0]) / Math.max(Lf + Lb, 0.25), -1, 1);
      const A = lerp(0.24, 0.36 + 0.05 * v, rf) * mv, eb = lerp(0.3, 1.2 + 0.03 * v, rf) * mv + 0.18 * still;
      arm("Left", -A * nR + 0.05 * still + br * 0.015 * still, -(eb + 0.3 * Math.max(0, nR) * rf), lerp(0.09, 0.14, rf));
      arm("Right", A * nR + 0.05 * still + br * 0.015 * still, -(eb + 0.3 * Math.max(0, -nR) * rf), lerp(0.09, 0.14, rf));
      P.Hips = [0, pr, 0];
      P.Spine = [lean * 0.22 + br * 0.012 * still, -pr * 0.5, 0]; P.Chest = [0.03 - br * 0.008 * still, -pr * 0.8, 0];
      P.Neck = [-lean * 0.7, -pr * 0.2, -roll * 0.5]; P.Head = [-0.03, 0, 0];
    } else if (mode === "wallrun" || mode === "climb") {
      const cad = mode === "climb" ? 2.6 : 0.75 + sp * 0.15, stride = mode === "climb" ? 0.16 : clamp(0.1 + sp * 0.045, 0.12, 0.5);
      this.phase = (this.phase + dt * cad) % 1;
      const k = clamp(sp / 9, 0, 1), th = this.phase * Math.PI * 2;
      hipY = -Math.abs(Math.cos(th)) * 0.05 * (0.3 + k) - 0.04 * k;
      lean = mode === "climb" ? -0.1 : 0.12; comp = lean;
      if (mode === "wallrun") roll = s.wallSide * 0.42;
      ["Left", "Right"].forEach((side, i) => {
        const a = th + i * Math.PI, f = stride * Math.sin(a), sw = Math.max(0, Math.cos(a));
        const lift = sw * (0.08 + 0.2 * k) + (mode === "climb" ? sw * 0.28 : 0);
        leg(side, f + 0.02 + k * 0.04, stand - lift);
        const as = -Math.sin(a + Math.PI) * (0.25 + 0.7 * k);
        arm(side, mode === "climb" ? -2.3 + as * 0.4 : as, -0.35 - 1.05 * k - (mode === "climb" ? 0.3 : 0), 0.1);
      });
      P.Spine = [lean * 0.3, Math.sin(th) * 0.12 * k, 0]; P.Chest = [0.04, -Math.sin(th) * 0.18 * k, 0]; P.Neck = [-lean * 0.6, 0, -roll * 0.6]; P.Head = [-0.05, 0, 0];
    } else if (mode === "crouch") {
      const th = (this.phase = (this.phase + dt * (0.4 + sp * 0.6)) % 1) * Math.PI * 2, m = clamp(sp / 2, 0, 1);
      lean = 0.5; comp = lean; hipY = -0.38; grounded = true; terrain = true;
      leg("Left", 0.16 + Math.sin(th) * 0.14 * m, stand - Math.max(0, Math.cos(th)) * 0.08 * m, 0.04); leg("Right", 0.02 - Math.sin(th) * 0.14 * m, stand - Math.max(0, -Math.cos(th)) * 0.08 * m, -0.04);
      arm("Left", -0.5, -0.9, 0.2); arm("Right", -0.5, -0.9, 0.2); P.Neck = [-0.45, 0, 0];
    } else if (mode === "slide" || mode === "getup") {
      // Hüft-Slide wie eine Grätsche: auf der Hüftseite liegend, unteres Bein angewinkelt, oberes gestreckt nach vorne,
      // untere Hand stützt hinten am Boden, obere Hand vorne zum Ausbalancieren
      const sd = mode === "slide" ? s.slideSide : s.getup.side, L = sd > 0 ? "Left" : "Right", U = sd > 0 ? "Right" : "Left", o = sd > 0 ? 1 : -1;
      const g = mode === "getup" ? smoothK(s.getup.k) : 0, sk = 1 - g;
      lean = lerp(-0.62, 0.42, g); hipY = lerp(-0.64, -0.12, g); roll = -o * 0.62 * sk;
      if (mode === "slide") {
        P[U + "UpperLeg"] = [-0.88, 0, -o * 0.08]; P[U + "LowerLeg"] = [0.15, 0, 0]; P[U + "Foot"] = [-0.3, 0, 0];
        P[L + "UpperLeg"] = [-0.3, 0, -o * 0.5]; P[L + "LowerLeg"] = [1.95, 0, 0]; P[L + "Foot"] = [0.35, 0, 0];
        P[L + "UpperArm"] = [0.55, 0, o * 0.75]; P[L + "LowerArm"] = [-0.15, 0, 0];
        P[U + "UpperArm"] = [-1.0, 0, -o * 0.45]; P[U + "LowerArm"] = [-0.7, 0, 0];
        P.Spine = [0.2, o * 0.2, o * 0.15]; P.Chest = [0.25, o * 0.15, o * 0.2]; P.Neck = [0.55, -o * 0.2, o * 0.45]; P.Head = [0.1, 0, o * 0.15];
      } else {
        // Aufstehen: unteres Bein stößt ab, oberes kommt nach vorne; schnell zur Hüftseite dreht der Oberkörper mit
        comp = lean;
        leg(U, 0.25, lerp(0.35, stand - 0.1, g), -o * 0.02); leg(L, -0.22, lerp(0.4, stand - 0.05, g), o * 0.04);
        arm(L, lerp(0.4, -0.6, g), -0.6, lerp(0.6, 0.15, g)); arm(U, lerp(-0.9, 0.3, g), -0.9, 0.2);
        const tw = s.getup.fast ? o * 0.45 * (1 - g) : 0;
        P.Spine = [0.15, tw * 0.5, 0]; P.Chest = [0.1, tw * 0.5, 0]; P.Neck = [-lean * 0.5, 0, 0];
      }
    } else if (mode === "hang") {
      // Hängen: Hände auf der Kante, Körper hängt, Füße an der Wand; beim Hangeln greifen die Hände abwechselnd um
      const H = s.hang, mv = H.move, ph = H.phase * Math.PI * 2;
      lean = -0.08 + H.swing * 0.22 * Math.sin(H.t * 5.5); comp = lean;
      leg("Left", 0.24 + 0.05 * Math.sin(ph), 0.74 - 0.04 * Math.abs(mv) * Math.max(0, Math.sin(ph)), 0.04);
      leg("Right", 0.22 - 0.05 * Math.sin(ph), 0.76 - 0.04 * Math.abs(mv) * Math.max(0, -Math.sin(ph)), -0.04);
      roll = mv * 0.05 * Math.sin(ph);
      arm("Left", -2.9, -0.1, 0.25); arm("Right", -2.9, -0.1, 0.25);
      P.Neck = [-0.25, 0, 0]; P.Spine = [-0.05, 0, 0];
      const right = new THREE.Vector3(H.n.z, 0, -H.n.x), base = H.edge.clone().addScaledVector(H.n, -0.04); base.y = H.top + 0.035;
      const sh = mv ? 0.09 * Math.sin(ph) * mv : 0;
      hands = { L: base.clone().addScaledVector(right, -0.21 + sh), R: base.clone().addScaledVector(right, 0.21 + sh), n: H.n, right: right, w: H.grab };
    } else if (mode === "vault" || mode === "pullup") {
      const C = s.climb, k = C.k, right = new THREE.Vector3(C.n.z, 0, -C.n.x), base = C.edge.clone().addScaledVector(C.n, -0.06); base.y = C.top + 0.035;
      let hw = 0;
      if (mode === "pullup") {
        // Hochziehen: Arme ziehen den Körper bis zur Brust über die Kante, dann stützen, ein Knie auf die Kante, aufstehen
        const p1 = smoothK(k / 0.45), p2 = smoothK((k - 0.4) / 0.35), p3 = smoothK((k - 0.72) / 0.28);
        lean = lerp(lerp(-0.05, 0.35, p1), 0.75, p2) * (1 - p3) + 0.1 * p3; comp = lean;
        leg("Left", lerp(0.22, 0.05, p2), lerp(0.74, 0.62, p1) * (1 - p3) + (stand) * p3);
        if (p2 < 1 || p3 < 1) { P.RightUpperLeg = [lerp(-0.3, -1.75, p2) * (1 - p3), 0, -0.05]; P.RightLowerLeg = [lerp(0.4, 2.0, p2) * (1 - p3), 0, 0]; P.RightFoot = [0.3, 0, 0]; }
        else leg("Right", 0, stand);
        if (p3 >= 1) leg("Right", 0, stand);
        arm("Left", -2.6, -0.6, 0.3); arm("Right", -2.6, -0.6, 0.3);
        P.Neck = [lerp(-0.3, -0.6, p2) * (1 - p3), 0, 0]; hipY = lerp(0, -0.12, p2) * (1 - p3);
        hw = k < 0.72 ? 1 : 1 - smoothK((k - 0.72) / 0.2);
      } else if (C.kind === "hands") {
        // mit Händen hoch (Hüft- bis Brusthöhe): aufstützen, Beine anziehen und auf die Kante setzen
        const p1 = smoothK(k / 0.5), p2 = smoothK((k - 0.45) / 0.55);
        lean = lerp(0.45, 0.65, p1) * (1 - p2) + 0.12 * p2; comp = lean; hipY = lerp(-0.05, -0.28, p1) * (1 - p2);
        leg("Left", lerp(0.15, 0.32, p1) * (1 - p2), lerp(0.7, 0.4, p1) * (1 - p2) + stand * p2, 0.05);
        leg("Right", lerp(0.0, 0.3, p1) * (1 - p2), lerp(0.75, 0.42, p1) * (1 - p2) + stand * p2, -0.05);
        arm("Left", -1.6, -0.4, 0.25); arm("Right", -1.6, -0.4, 0.25); P.Neck = [-0.5 * (1 - p2), 0, 0];
        hw = k < 0.55 ? smoothK(k / 0.12) : 1 - smoothK((k - 0.55) / 0.3);
      } else {
        // kleine Kante: mit einem großen Schritt drauf
        const p = smoothK(k);
        lean = 0.3 * (1 - p) + 0.08; comp = lean;
        leg("Right", lerp(0.4, 0.02, p), lerp(0.42, stand, p)); leg("Left", lerp(-0.25, -0.02, p), lerp(0.7, stand, p));
        arm("Left", -0.7 * (1 - p), -0.6, 0.15); arm("Right", 0.4 * (1 - p), -0.5, 0.15);
      }
      hands = { L: base.clone().addScaledVector(right, -0.22), R: base.clone().addScaledVector(right, 0.22), n: C.n, right: right, w: hw };
    } else if (mode === "roll") {
      // Abrollen: eingerollt, einmal ganz um die Hüftachse
      const k = s.rollK;
      leg("Left", 0.35, 0.28); leg("Right", 0.3, 0.3); arm("Left", -1.2, -1.5, 0.35); arm("Right", -1.2, -1.5, 0.35);
      P.Spine = [0.5, 0, 0]; P.Chest = [0.4, 0, 0]; P.Neck = [0.5, 0, 0];
      flip = smoothK(k) * Math.PI * 2; hipY = -0.5 + Math.sin(k * Math.PI) * 0.06;
    } else if (mode === "impact" || mode === "stun") {
      // harter Aufprall: tief in die Knie, Hände nach vorne; Stolpern: zwei schwere Schritte
      lean = mode === "impact" ? 0.6 : 0.45; comp = lean; hipY = mode === "impact" ? -0.5 : -0.34; grounded = true; terrain = true;
      leg("Left", 0.22, stand, 0.08); leg("Right", -0.05, stand, -0.08);
      arm("Left", -0.7, -0.9, 0.45); arm("Right", -0.5, -1.1, 0.45); P.Neck = [-0.35, 0, 0];
    } else { // air
      // Luft: kurz gesprungen → angezogen; weite Sprünge und tiefe Stürze → Arme kreisen zum Ausbalancieren, Beine laufen weiter
      const up = clamp(s.vy / 7, -1, 1), tuck = clamp(0.5 + up * 0.5, 0, 1);
      const longJ = clamp((sp - 5) / 4, 0, 1) * clamp((s.airT - 0.2) / 0.3, 0, 1), drop = clamp((-s.vy - 4) / 8, 0, 1) * clamp((s.airT - 0.25) / 0.3, 0, 1);
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
    }
    // Oberkörper zur Blickrichtung drehen (Hüfte zeigt in Laufrichtung)
    const tw = s.twist || 0;
    if (tw) [["Spine", 0.3], ["Chest", 0.35], ["Neck", 0.2], ["Head", 0.15]].forEach(([n, k]) => { const p = P[n] || (P[n] = [0, 0, 0]); p[1] += tw * k; });

    for (const n in this.b) { const p = P[n] || [0, 0, 0]; this.j(n, p[0], p[1], p[2], K, dt); }
    if (!loco) this.lean = damp(this.lean, lean, mode === "vault" || mode === "pullup" ? 16 : 12, dt);
    this.roll = damp(this.roll, roll, mode === "slide" ? 12 : 7, dt);
    this.hipY = damp(this.hipY, hipY, loco ? 40 : mode === "roll" || mode === "slide" ? 22 : 16, dt);
    this.flip = mode === "roll" ? flip : damp(this.flip, 0, 30, dt);
    // Becken senkt sich, wenn ein Fuß tiefer stehen muss (Kante, Stufe)
    if (terrain) this.pelOff = damp(this.pelOff, clamp(Math.min(0, this.foot.Left.o, this.foot.Right.o), -0.4, 0), 12, dt);
    else { this.pelOff = damp(this.pelOff, 0, 10, dt); this.foot.Left.o = damp(this.foot.Left.o, 0, 10, dt); this.foot.Right.o = damp(this.foot.Right.o, 0, 10, dt); }
    this.pivot.position.y = HIP_H + this.hipY + this.pelOff;
    this.pivot.rotation.set(this.lean + this.flip, 0, this.roll, "YXZ");
    // Hände an die Kante (IK), weich ein- und ausgeblendet
    this.ikW = damp(this.ikW, hands ? hands.w : 0, 18, dt);
    if (hands && this.ikW > 0.01) {
      this.root.updateMatrixWorld(true);
      const away = hands.n.clone().multiplyScalar(0.6);
      this.armIK("Left", hands.L, away.clone().addScaledVector(hands.right, -0.7).add(_v.set(0, -0.3, 0)), this.ikW);
      this.armIK("Right", hands.R, away.clone().addScaledVector(hands.right, 0.7).add(_v.set(0, -0.3, 0)), this.ikW);
    }
  }
  place(pos, yaw) { if (this.rag) return; this.root.position.copy(pos); this.root.rotation.y = yaw; }

  // ---------- leichte Ragdoll: Punkte an den Gelenken, Stäbe dazwischen, Schwerkraft, Kollision mit der Welt ----------
  startRagdoll(vel) {
    this.root.updateMatrixWorld(true);
    const W = (n, dy) => { const p = this.b[n].getWorldPosition(new THREE.Vector3()); if (dy) p.y += dy; return p; };
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
    this.cur = {};
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
    this.scene.remove(this.root);
    this.root.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    this.mat.dispose(); this.dark.dispose();
  }
}
function wrapA(a) { return ((a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; }
function smoothK(k) { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); }
