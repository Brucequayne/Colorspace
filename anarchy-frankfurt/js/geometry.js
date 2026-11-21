// Mathe-Helfer und 3D-Bausteine (Dreiecke, Quader, Voxel-Kugeln) für Assets
export const fr = x => x - Math.floor(x);
export function hash(x, y, z) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1440662683);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
export const tx = (P, s, k) => hash(Math.floor(P[0] / s), Math.floor(P[1] / s), Math.floor(P[2] / s) + k * 977);
export const jit = (c, h, a) => { const k = (h - 0.5) * a; return [c[0] + k, c[1] + k, c[2] + k]; };
export const mul = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const len = a => Math.hypot(a[0], a[1], a[2]);
export const nrm = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };

export function rng(seed) {
  let s = (seed * 2654435761 >>> 0) || 1;
  return () => { s = (s ^ (s << 13)) >>> 0; s = (s ^ (s >>> 17)) >>> 0; s = (s ^ (s << 5)) >>> 0; return s / 4294967296; };
}

export class Mesh {
  constructor() { this.tris = []; this._id = 1; }
  part() { return ++this._id; }
  tri(a, b, c, ua, ub, uc, m, n, id, x) { this.tris.push({ p: [a, b, c], uv: [ua, ub, uc], m, n, id, x }); }
  tri3(a, b, c, m, id, out, x) {
    let n = nrm(cross(sub(b, a), sub(c, a)));
    if (out && dot(n, out) < 0) n = n.map(q => -q);
    this.tri(a, b, c, [0, 0], [0, 0], [0, 0], m, n, id, x);
  }
  // a-b = untere Kante, d = oben links (u entlang a->b, v entlang a->d)
  quad(a, b, c, d, m, id, out, x) {
    const ab = sub(b, a), ad = sub(d, a);
    let n = nrm(cross(ab, ad));
    if (out && dot(n, out) < 0) n = n.map(q => -q);
    const L1 = len(ab), L2 = len(ad);
    this.tri(a, b, c, [0, 0], [L1, 0], [L1, L2], m, n, id, x);
    this.tri(a, c, d, [0, 0], [L1, L2], [0, L2], m, n, id, x);
  }
  box(x0, y0, z0, x1, y1, z1, mt, id, x) {
    const t = typeof mt === 'string' ? { top: mt, side: mt } : mt;
    this.quad([x0, y1, z1], [x1, y1, z1], [x1, y0, z1], [x0, y0, z1], t.top, id, [0, 0, 1], x);
    this.quad([x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1], t.side, id, [0, 1, 0], x);
    this.quad([x1, y1, z0], [x1, y0, z0], [x1, y0, z1], [x1, y1, z1], t.side, id, [1, 0, 0], x);
    this.quad([x1, y0, z0], [x0, y0, z0], [x0, y0, z1], [x1, y0, z1], t.side, id, [0, -1, 0], x);
    this.quad([x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1], t.side, id, [-1, 0, 0], x);
  }
  // Voxel-Blob (Baumkronen, Büsche)
  blob(cx, cy, cz, rx, rz, s, m, seed, x) {
    const id = this.part(), S = new Set(), N = Math.ceil(rx / s) + 1, NZ = Math.ceil(rz / s) + 1, K = (i, j, k) => i + ',' + j + ',' + k;
    for (let i = -N; i <= N; i++) for (let j = -N; j <= N; j++) for (let k = -NZ; k <= NZ; k++) {
      const X = i * s, Y = j * s, Z = k * s, d = (X * X + Y * Y) / (rx * rx) + Z * Z / (rz * rz);
      if (d < 0.72 + 0.38 * hash(i + seed, j - seed, k)) S.add(K(i, j, k));
    }
    for (const key of S) {
      const [i, j, k] = key.split(',').map(Number);
      if (S.has(K(i + 1, j, k)) && S.has(K(i - 1, j, k)) && S.has(K(i, j + 1, k)) && S.has(K(i, j - 1, k)) && S.has(K(i, j, k + 1))) continue;
      const X = cx + i * s, Y = cy + j * s, Z = cz + k * s;
      this.box(X - s / 2, Y - s / 2, Math.max(0, Z - s / 2), X + s / 2, Y + s / 2, Z + s / 2, m, id, x);
    }
  }
}
