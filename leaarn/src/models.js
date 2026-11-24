// ===== models.js · Prozedurale Low-Poly-Platzhalter =====
// Solange noch keine FBX-Assets im Repo liegen, baut das Spiel seine Bäume, Büsche, Steine, das Gras und das Testauto selbst.
// Alle Teile werden zu einem Netz mit Eckfarben zusammengefügt (eine Zeichnung pro Typ, ideal für Instanzen).
import * as THREE from "three";
import { hash2 } from "le/core.js";

export function part(geo, color, m, jit, seed) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  if (m) g.applyMatrix4(m);
  const p = g.attributes.position;
  if (jit) {   // Ecken leicht verschieben (gleiche Ecke = gleicher Versatz, damit keine Risse entstehen)
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = Math.round(x * 50) * 7 + Math.round(y * 50) * 13 + Math.round(z * 50) * 17;
      p.setXYZ(i, x + (hash2(k, 1, seed) - 0.5) * jit, y + (hash2(k, 2, seed) - 0.5) * jit, z + (hash2(k, 3, seed) - 0.5) * jit);
    }
  }
  const c = new THREE.Color(color), col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i += 3) { const v = 0.9 + hash2(i, 9, seed) * 0.16; for (let q = 0; q < 3; q++) { col[(i + q) * 3] = c.r * v; col[(i + q) * 3 + 1] = c.g * v; col[(i + q) * 3 + 2] = c.b * v; } }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  g.deleteAttribute("uv"); g.deleteAttribute("normal");
  return g;
}
export function merge(parts) {
  let n = 0; parts.forEach((g) => { n += g.attributes.position.count; });
  const P = new Float32Array(n * 3), C = new Float32Array(n * 3); let o = 0;
  parts.forEach((g) => { P.set(g.attributes.position.array, o * 3); C.set(g.attributes.color.array, o * 3); o += g.attributes.position.count; });
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(P, 3)); g.setAttribute("color", new THREE.BufferAttribute(C, 3));
  g.computeVertexNormals(); g.computeBoundingSphere(); g.computeBoundingBox(); return g;
}
export const M = (x, y, z, sx, sy, sz, ry) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry || 0), new THREE.Vector3(sx, sy == null ? sx : sy, sz == null ? sx : sz));

// Gras aus Halmen (seit v0.11): jeder Halm eine schmale, leicht gebogene Fläche, die oben spitz zuläuft (3 Dreiecke).
// Unten dunkler, oben heller. Normalen zeigen nach oben, damit das Gras von allen Seiten gleich hell wirkt.
function blades(o) {
  const P = [], C = [], N = [], c0 = new THREE.Color(o.c0), c1 = new THREE.Color(o.c1), seed = o.seed;
  let k = 0; const R = () => hash2(k++, 5, seed);
  for (let b = 0; b < o.n; b++) {
    const a = R() * Math.PI * 2, rr = Math.sqrt(R()) * o.spread, bx = Math.cos(a) * rr, bz = Math.sin(a) * rr;
    const h = o.h0 + R() * (o.h1 - o.h0), w = o.w * (0.7 + R() * 0.6), ang = R() * Math.PI, ca = Math.cos(ang), sa = Math.sin(ang);
    const la = a + (R() - 0.5) * 1.2, lean = (0.15 + R() * 0.35) * h, lx = Math.cos(la) * lean, lz = Math.sin(la) * lean;
    const v = (f, y, s2) => [bx + ca * f * w * s2 + lx * y * y, y * h, bz + sa * f * w * s2 + lz * y * y];
    const b1 = v(-0.5, 0, 1), b2 = v(0.5, 0, 1), m1 = v(-0.5, 0.55, 0.62), m2 = v(0.5, 0.55, 0.62), tp = v(0, 1, 0);
    const shade = 0.85 + R() * 0.3, col = (y) => { const c = c0.clone().lerp(c1, y).multiplyScalar(shade); return [c.r, c.g, c.b]; };
    const tri = (A, ya, B, yb, Cc, yc) => { P.push(...A, ...B, ...Cc); C.push(...col(ya), ...col(yb), ...col(yc)); for (let q = 0; q < 3; q++) N.push(0, 1, 0); };
    tri(b1, 0, b2, 0, m2, 0.55); tri(b1, 0, m2, 0.55, m1, 0.55); tri(m1, 0.55, m2, 0.55, tp, 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(P, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(C, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(N, 3));
  g.computeBoundingSphere(); g.computeBoundingBox(); return g;
}
// Steine: unregelmäßige Grundkörper, mehrere Formen je Größe
function stone(r, col, sx, sy, sz, seed, detail) { return part(new THREE.IcosahedronGeometry(r, detail || 0), col, M(0, r * sy * 0.55, 0, sx, sy, sz), r * 0.35, seed); }

export const MODELS = {
  pine: () => merge([part(new THREE.CylinderGeometry(0.18, 0.28, 2, 5), "#5A3E28", M(0, 1, 0, 1)),
    part(new THREE.ConeGeometry(2.3, 3, 7), "#2F5A32", M(0, 2.9, 0, 1), 0.25, 1), part(new THREE.ConeGeometry(1.8, 2.6, 7), "#356538", M(0, 4.4, 0, 1, 1, 1, 0.4), 0.2, 2),
    part(new THREE.ConeGeometry(1.2, 2.2, 6), "#3C703E", M(0, 5.8, 0, 1, 1, 1, 0.9), 0.15, 3)]),
  fir: () => merge([part(new THREE.CylinderGeometry(0.15, 0.24, 2.5, 5), "#4E3624", M(0, 1.2, 0, 1)),
    part(new THREE.ConeGeometry(1.6, 6.5, 6), "#284E2E", M(0, 5, 0, 1), 0.3, 4), part(new THREE.ConeGeometry(1.1, 3.5, 6), "#2E5833", M(0, 7.6, 0, 1, 1, 1, 0.5), 0.2, 5)]),
  oak: () => merge([part(new THREE.CylinderGeometry(0.28, 0.42, 3, 6), "#5E4330", M(0, 1.5, 0, 1)),
    part(new THREE.IcosahedronGeometry(2.4, 0), "#4E7A35", M(0, 4.6, 0, 1, 0.85, 1), 0.5, 6), part(new THREE.IcosahedronGeometry(1.7, 0), "#5A8A3C", M(1.4, 4.0, 0.6, 1), 0.4, 7),
    part(new THREE.IcosahedronGeometry(1.6, 0), "#46703A", M(-1.2, 4.2, -0.7, 1), 0.4, 8)]),
  birch: () => merge([part(new THREE.CylinderGeometry(0.14, 0.2, 5, 5), "#D9D4C8", M(0, 2.5, 0, 1)),
    part(new THREE.IcosahedronGeometry(1.5, 0), "#8CB252", M(0, 5.4, 0, 0.9, 1.3, 0.9), 0.35, 9), part(new THREE.IcosahedronGeometry(1.0, 0), "#98BE5A", M(0.6, 4.4, 0.3, 1), 0.25, 10)]),
  bush: () => merge([part(new THREE.IcosahedronGeometry(0.9, 0), "#3F6A30", M(0, 0.6, 0, 1, 0.8, 1), 0.25, 11), part(new THREE.IcosahedronGeometry(0.7, 0), "#4A7A36", M(0.6, 0.5, 0.2, 1), 0.2, 12),
    part(new THREE.IcosahedronGeometry(0.6, 0), "#37602B", M(-0.5, 0.45, -0.3, 1), 0.2, 13)]),
  rock: () => merge([part(new THREE.DodecahedronGeometry(1.2, 0), "#8A867E", M(0, 0.55, 0, 1, 0.7, 1.1), 0.4, 14)]),
  slab: () => merge([part(new THREE.DodecahedronGeometry(1.6, 0), "#77736C", M(0, 0.35, 0, 1.3, 0.35, 1), 0.35, 15), part(new THREE.DodecahedronGeometry(0.6, 0), "#8C887F", M(1.1, 0.3, 0.6, 1, 0.8, 1), 0.2, 16)]),
  grass: () => blades({ n: 16, h0: 0.35, h1: 0.62, w: 0.06, spread: 0.32, c0: "#4E8A34", c1: "#8DC459", seed: 21 }),
  grasslong: () => blades({ n: 18, h0: 0.6, h1: 1.1, w: 0.065, spread: 0.38, c0: "#4A8432", c1: "#97C660", seed: 22 }),
  grassdry: () => blades({ n: 14, h0: 0.4, h1: 0.78, w: 0.06, spread: 0.34, c0: "#5E8A36", c1: "#A9C463", seed: 23 }),
  grassshort: () => blades({ n: 20, h0: 0.14, h1: 0.3, w: 0.055, spread: 0.3, c0: "#569638", c1: "#A0D466", seed: 24 }),
  grassdark: () => blades({ n: 16, h0: 0.4, h1: 0.72, w: 0.065, spread: 0.34, c0: "#2F6B2C", c1: "#5E9E47", seed: 25 }),
  flowers: () => { const g = blades({ n: 10, h0: 0.3, h1: 0.5, w: 0.05, spread: 0.3, c0: "#447E2C", c1: "#86BC55", seed: 26 }), L = [], cols = ["#E8D24A", "#E07AA0", "#F1F0EA", "#8A7CE0"];
    for (let i = 0; i < 5; i++) { const a = i * 1.3, r = 0.08 + (i % 3) * 0.08; L.push(part(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 3), "#5E8A3A", M(Math.cos(a) * r, 0.25, Math.sin(a) * r, 1))); L.push(part(new THREE.OctahedronGeometry(0.06, 0), cols[i % 4], M(Math.cos(a) * r, 0.52, Math.sin(a) * r, 1))); }
    const f = merge(L), out = new THREE.BufferGeometry();
    ["position", "color", "normal"].forEach((k) => { const a = g.attributes[k].array, b = f.attributes[k].array, c = new Float32Array(a.length + b.length); c.set(a); c.set(b, a.length); out.setAttribute(k, new THREE.BufferAttribute(c, 3)); });
    out.computeBoundingSphere(); out.computeBoundingBox(); return out; },
  // Steine vom Kiesel (Fußballgröße) bis zum Felsen größer als ein Auto
  pebbles: () => { const L = []; for (let i = 0; i < 7; i++) { const a = i * 2.4, r = 0.1 + (i % 3) * 0.16, sz = 0.09 + hash2(i, 1, 30) * 0.13; L.push(part(new THREE.DodecahedronGeometry(sz, 0), i % 2 ? "#8E8A82" : "#76726B", M(Math.cos(a) * r, sz * 0.45, Math.sin(a) * r, 1, 0.65, 1), sz * 0.3, 31 + i)); } return merge(L); },
  stones: () => merge([stone(0.26, "#85817A", 1.2, 0.7, 1, 32), stone(0.16, "#6F6B65", 1, 0.8, 1.1, 33).translate(0.38, 0, 0.15), stone(0.12, "#918C84", 1, 0.7, 1, 34).translate(-0.3, 0, -0.22)]),
  stonem: () => merge([stone(0.65, "#7E7A73", 1.2, 0.75, 1, 35), stone(0.3, "#8B877F", 1, 0.8, 1, 36).translate(0.8, 0, 0.3)]),
  boulder: () => merge([stone(1.5, "#77736C", 1.15, 0.8, 1, 37), stone(0.7, "#827E77", 1, 0.9, 1.1, 38).translate(1.5, 0, -0.6)]),
  cliff: () => merge([stone(2.6, "#6E6A64", 1.1, 1.25, 0.95, 39), stone(1.8, "#7A766F", 1, 1.4, 1.1, 40).translate(1.9, 0, 1.0), stone(1.4, "#66625C", 1.2, 0.9, 1, 41).translate(-2.1, 0, -0.8)])
};

// Testauto: Karosserie (ein Netz) + 4 Räder (eigene Netze, drehen sich). Vorne = +z, Mitte der Karosserie im Ursprung.
export function carModel(color) {
  const body = merge([
    part(new THREE.BoxGeometry(1.8, 0.5, 4.2), color, M(0, 0, 0, 1)),
    part(new THREE.BoxGeometry(1.7, 0.18, 1.3), color, M(0, 0.32, 1.35, 1)),                 // Motorhaube
    part(new THREE.CylinderGeometry(0.62, 0.86, 0.55, 4, 1), "#1E2A33", M(0, 0.52, -0.25, 1.25, 1, 1.7, Math.PI / 4)),   // Kabine
    part(new THREE.BoxGeometry(1.85, 0.12, 0.35), "#151515", M(0, 0.5, -2.0, 1)),             // Heckflügel
    part(new THREE.BoxGeometry(0.1, 0.3, 0.1), "#151515", M(0.6, 0.35, -2.0, 1)), part(new THREE.BoxGeometry(0.1, 0.3, 0.1), "#151515", M(-0.6, 0.35, -2.0, 1)),
    part(new THREE.BoxGeometry(0.35, 0.12, 0.05), "#FFF2C0", M(0.6, 0.08, 2.11, 1)), part(new THREE.BoxGeometry(0.35, 0.12, 0.05), "#FFF2C0", M(-0.6, 0.08, 2.11, 1)),
    part(new THREE.BoxGeometry(0.35, 0.1, 0.05), "#C02020", M(0.65, 0.1, -2.11, 1)), part(new THREE.BoxGeometry(0.35, 0.1, 0.05), "#C02020", M(-0.65, 0.1, -2.11, 1)),
    part(new THREE.BoxGeometry(1.9, 0.12, 4.3), "#1A1A1A", M(0, -0.28, 0, 1))
  ]);
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const g = new THREE.Group(), b = new THREE.Mesh(body, mat); b.castShadow = true; b.receiveShadow = true; g.add(b);
  const wg = merge([part(new THREE.CylinderGeometry(0.33, 0.33, 0.26, 10), "#1B1B1B", new THREE.Matrix4().makeRotationZ(Math.PI / 2)),
    part(new THREE.CylinderGeometry(0.2, 0.2, 0.28, 6), "#B8B8B0", new THREE.Matrix4().makeRotationZ(Math.PI / 2))]);
  const wheels = [];
  for (let i = 0; i < 4; i++) { const w = new THREE.Mesh(wg, mat); w.castShadow = true; const pivot = new THREE.Group(); pivot.add(w); g.add(pivot); wheels.push({ pivot: pivot, mesh: w }); }
  return { group: g, wheels: wheels };
}
