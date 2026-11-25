// Software-Pixel-Renderer: rendert jedes Asset (pro Drehung/Variante) einmal als Sprite mit Tiefe, Schatten und Umriss
import { CFG } from './camera.js';
import { proj, unprojGround, VIEW } from './camera.js';
import { Mesh, nrm, cross, dot, mul } from './geometry.js';
import { M } from './materials.js';
import { ASSETS } from './assets.js';

const L = nrm(CFG.SUN), LU = nrm(cross(L, [0, 0, 1])), LV = cross(LU, L);
export const SHADOW_RGBA = [16, 22, 46, 92];

export function raster(W, H, zb, a, b, c, cb) {
  const mnx = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0]))), mxx = Math.min(W - 1, Math.ceil(Math.max(a[0], b[0], c[0])));
  const mny = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1]))), mxy = Math.min(H - 1, Math.ceil(Math.max(a[1], b[1], c[1])));
  const ar = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  if (Math.abs(ar) < 1e-9) return;
  for (let y = mny; y <= mxy; y++) {
    const py = y + 0.5;
    for (let x = mnx; x <= mxx; x++) {
      const px = x + 0.5;
      const w0 = ((b[0] - px) * (c[1] - py) - (b[1] - py) * (c[0] - px)) / ar;
      const w1 = ((c[0] - px) * (a[1] - py) - (c[1] - py) * (a[0] - px)) / ar;
      const w2 = 1 - w0 - w1;
      if (w0 < -1e-6 || w1 < -1e-6 || w2 < -1e-6) continue;
      const d = w0 * a[2] + w1 * b[2] + w2 * c[2], i = y * W + x;
      if (d <= zb[i]) continue;
      if (cb(i, w0, w1, w2)) zb[i] = d;
    }
  }
}
const lerp3 = (p, w0, w1, w2) => [p[0][0] * w0 + p[1][0] * w1 + p[2][0] * w2, p[0][1] * w0 + p[1][1] * w1 + p[2][1] * w2, p[0][2] * w0 + p[1][2] * w1 + p[2][2] * w2];
const lerpUV = (t, w0, w1, w2) => [t.uv[0][0] * w0 + t.uv[1][0] * w1 + t.uv[2][0] * w2, t.uv[0][1] * w0 + t.uv[1][1] * w1 + t.uv[2][1] * w2];

export function renderSprite(mesh, ang, opt = {}) {
  const c = Math.cos(ang), s = Math.sin(ang), R = p => [p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]];
  const tris = mesh.tris.map(t => ({ t, pr: t.p.map(R), n: R(t.n) }));
  // Bildgrenzen inkl. Schattenwurf auf den Boden
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, u0 = 1e9, v0 = 1e9, u1 = -1e9, v1 = -1e9;
  const ext = q => { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); };
  for (const T of tris) for (const p of T.pr) {
    ext(proj(p[0], p[1], p[2]));
    ext(proj(p[0] - L[0] * p[2] / L[2], p[1] - L[1] * p[2] / L[2], 0));
    const u = dot(p, LU), v = dot(p, LV);
    u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v);
  }
  const ox = Math.floor(-x0) + 2, oy = Math.floor(-y0) + 2, W = Math.ceil(x1) + ox + 3, H = Math.ceil(y1) + oy + 3;
  // Schattenkarte (aus Sonnenrichtung)
  const se = Math.max(u1 - u0, v1 - v0, 0.1), SMS = Math.min(1024, Math.ceil(se / (opt.sres || 0.035)) + 4), sc = (SMS - 2) / se;
  const SM = new Float32Array(SMS * SMS).fill(-1e9);
  const lp = p => [(dot(p, LU) - u0) * sc + 1, (dot(p, LV) - v0) * sc + 1, dot(p, L)];
  for (const T of tris) {
    const mt = M[T.t.m], sp = T.pr.map(lp);
    raster(SMS, SMS, SM, sp[0], sp[1], sp[2], mt.alpha ? (i, w0, w1, w2) => { const uv = lerpUV(T.t, w0, w1, w2); return !!mt.f(uv[0], uv[1], lerp3(T.t.p, w0, w1, w2), T.t.x); } : () => true);
  }
  const occ = P => { const x = Math.floor((dot(P, LU) - u0) * sc + 1), y = Math.floor((dot(P, LV) - v0) * sc + 1); return (x < 0 || y < 0 || x >= SMS || y >= SMS) ? -1e9 : SM[y * SMS + x]; };
  // Hauptbild
  const N = W * H, zb = new Float32Array(N).fill(-1e9), col = new Float32Array(N * 3), idb = new Int32Array(N);
  for (const T of tris) {
    const mt = M[T.t.m], sp = T.pr.map(p => { const q = proj(p[0], p[1], p[2]); return [q[0] + ox, q[1] + oy, q[2]]; });
    let n = T.n; if (dot(n, VIEW) < 0) n = n.map(q => -q);
    const ndl = Math.max(0, dot(n, L));
    const shade = (i, w0, w1, w2) => {
      const uv = lerpUV(T.t, w0, w1, w2);
      let cl = mt.f(uv[0], uv[1], lerp3(T.t.p, w0, w1, w2), T.t.x);
      if (!cl) return false;
      if (!mt.emit) {
        const Pw = lerp3(T.pr, w0, w1, w2), lit = ndl > 0 && dot(Pw, L) >= occ(Pw) - 0.07;
        cl = mul(cl, 0.6 + 0.52 * ndl * (lit ? 1 : 0));
        if (!lit) cl = [cl[0] * 0.86, cl[1] * 0.9, cl[2] * 1.04];
      }
      col[i * 3] = cl[0]; col[i * 3 + 1] = cl[1]; col[i * 3 + 2] = cl[2]; idb[i] = T.t.id; return true;
    };
    raster(W, H, zb, sp[0], sp[1], sp[2], shade);
    // dünne Teile (Masten, Rohre, Gerüststangen) schmaler als 1 px: längste Kante als 1-px-Linie nachziehen
    if (opt.thin) {
      const e = [[0, 1], [1, 2], [2, 0]].map(([p, q]) => [p, q, Math.hypot(sp[q][0] - sp[p][0], sp[q][1] - sp[p][1])]).sort((x, y) => y[2] - x[2])[0];
      const ar = Math.abs((sp[1][0] - sp[0][0]) * (sp[2][1] - sp[0][1]) - (sp[1][1] - sp[0][1]) * (sp[2][0] - sp[0][0]));
      if (e[2] > 1 && ar / e[2] < 1.1) {
        const A = sp[e[0]], B = sp[e[1]], st = Math.ceil(e[2] * 2);
        for (let k = 0; k <= st; k++) {
          const t = k / st, x = Math.floor(A[0] + (B[0] - A[0]) * t), y = Math.floor(A[1] + (B[1] - A[1]) * t);
          if (x < 0 || y < 0 || x >= W || y >= H) continue;
          const i = y * W + x, d = A[2] + (B[2] - A[2]) * t + 0.02;
          if (d <= zb[i]) continue;
          const w = [0, 0, 0]; w[e[0]] = 1 - t; w[e[1]] = t;
          if (shade(i, w[0], w[1], w[2])) zb[i] = d;
        }
      }
    }
  }
  const rgba = new Uint8ClampedArray(N * 4), sh = new Uint8Array(N);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (zb[i] < -1e8) {
      const g = unprojGround(x + 0.5 - ox, y + 0.5 - oy), G = [g[0], g[1], 0];
      if (occ(G) > dot(G, L) + 0.05) sh[i] = 1;
      continue;
    }
    let k = 1;
    if (x === 0 || zb[i - 1] < -1e8 || (idb[i - 1] !== idb[i] && zb[i] - zb[i - 1] > 0.35)) k = 0.55;
    else if (x === W - 1 || zb[i + 1] < -1e8 || (idb[i + 1] !== idb[i] && zb[i] - zb[i + 1] > 0.35)) k = 0.55;
    else if (y === 0 || zb[i - W] < -1e8 || (idb[i - W] !== idb[i] && zb[i] - zb[i - W] > 0.35)) k = 0.55;
    else if (y === H - 1 || zb[i + W] < -1e8 || (idb[i + W] !== idb[i] && zb[i] - zb[i + W] > 0.35)) k = 0.55;
    for (let ch = 0; ch < 3; ch++) rgba[i * 4 + ch] = Math.round(col[i * 3 + ch] * k / 6) * 6;
    rgba[i * 4 + 3] = 255;
  }
  return { w: W, h: H, ox, oy, rgba, depth: zb, sh, canvas: opt.noCanvas ? null : spriteCanvas(W, H, rgba, sh) };
}
// Vorschau-Canvas (Schatten + Farbe)
function spriteCanvas(W, H, rgba, sh) {
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const img = new ImageData(W, H);
  for (let i = 0; i < W * H; i++) {
    if (rgba[i * 4 + 3]) { img.data.set(rgba.subarray(i * 4, i * 4 + 4), i * 4); }
    else if (sh[i]) img.data.set(SHADOW_RGBA, i * 4);
  }
  cv.getContext('2d').putImageData(img, 0, 0);
  return cv;
}

// ---------- Fertig gerenderte Modelle (models/<datei>.png + .json, aus dem Low-Poly-Pack konvertiert) ----------
// PNG: obere Hälfte Farbe (Alpha 0/255), untere Hälfte Daten (R,G = Tiefe 16 bit, B = Bodenschatten)
// JSON: { n: Drehungen, H: Höhe einer Hälfte, f: [[x, y, w, h, ox, oy, dmin, dmax], ...] }
const MODELS = new Map(), LOADING = new Set();
async function loadModel(file) {
  const base = 'models/' + file, q = '?v=' + CFG.MODEL_V;
  const [m, blob] = await Promise.all([fetch(base + '.json' + q).then(r => r.json()), fetch(base + '.png' + q).then(r => r.blob())]);
  const bmp = await createImageBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
  const cv = document.createElement('canvas'); cv.width = bmp.width; cv.height = bmp.height;
  const cx = cv.getContext('2d'); cx.drawImage(bmp, 0, 0);
  const D = cx.getImageData(0, 0, bmp.width, bmp.height).data, AW = bmp.width;
  return m.f.map(fr => decodeSprite(D, AW, m.H, fr));
}
function decodeSprite(D, AW, H, [x, y, w, h, ox, oy, d0, d1]) {
  const n = w * h, rgba = new Uint8ClampedArray(n * 4), depth = new Float32Array(n).fill(-1e9), sh = new Uint8Array(n);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const k = j * w + i, a = ((y + j) * AW + x + i) * 4, b = ((y + j + H) * AW + x + i) * 4;
    if (D[a + 3] > 127) { rgba[k * 4] = D[a]; rgba[k * 4 + 1] = D[a + 1]; rgba[k * 4 + 2] = D[a + 2]; rgba[k * 4 + 3] = 255; }
    const q = D[b] * 256 + D[b + 1];
    if (q) depth[k] = d0 + (q - 1) / 65534 * (d1 - d0);
    if (D[b + 2] > 127) sh[k] = 1;
  }
  return { w, h, ox, oy, rgba, depth, sh, canvas: spriteCanvas(w, h, rgba, sh) };
}
// Eingebrannte Häuser: Sprite <-> PNG-Blob (gleiches Format wie die Modelle, ein Bild pro Haus)
export function spriteToBlob(s) {
  const e = encodeSprite(s), cv = document.createElement('canvas'); cv.width = s.w; cv.height = s.h * 2;
  const cx = cv.getContext('2d'); cx.putImageData(new ImageData(e.col, s.w, s.h), 0, 0); cx.putImageData(new ImageData(e.dat, s.w, s.h), 0, s.h);
  return new Promise(res => cv.toBlob(blob => res({ f: [0, 0, s.w, s.h, s.ox, s.oy, e.d0, e.d1], blob }), 'image/png'));
}
export async function blobToSprite(r) {
  const bmp = await createImageBitmap(r.blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
  const cv = document.createElement('canvas'); cv.width = bmp.width; cv.height = bmp.height;
  const cx = cv.getContext('2d'); cx.drawImage(bmp, 0, 0);
  return decodeSprite(cx.getImageData(0, 0, bmp.width, bmp.height).data, bmp.width, r.f[3], r.f);
}
// Für den Modell-Bauer: Sprite -> Atlas-Teile
export function encodeSprite(s) {
  let d0 = 1e9, d1 = -1e9;
  for (const d of s.depth) if (d > -1e8) { d0 = Math.min(d0, d); d1 = Math.max(d1, d); }
  if (d1 <= d0) d1 = d0 + 1e-3;
  const n = s.w * s.h, col = new Uint8ClampedArray(n * 4), dat = new Uint8ClampedArray(n * 4);
  for (let k = 0; k < n; k++) {
    if (s.rgba[k * 4 + 3]) col.set(s.rgba.subarray(k * 4, k * 4 + 4), k * 4);
    const d = s.depth[k], q = d > -1e8 ? 1 + Math.round((d - d0) / (d1 - d0) * 65534) : 0;
    dat[k * 4] = q >> 8; dat[k * 4 + 1] = q & 255; dat[k * 4 + 2] = s.sh[k] ? 255 : 0; dat[k * 4 + 3] = 255;
  }
  return { col, dat, d0, d1 };
}

export class Sprites {
  constructor() { this.mesh = new Map(); this.spr = new Map(); }
  // Modelle erst laden, wenn sie gebraucht werden (auf der Karte oder als sichtbares Vorschaubild)
  need(a) {
    const d = ASSETS[a]; if (!d || !d.model || MODELS.has(a) || LOADING.has(a)) return;
    LOADING.add(a);
    loadModel(d.model).then(f => MODELS.set(a, f), e => { MODELS.set(a, null); console.warn('Modell fehlt:', d.model, e); })
      .finally(() => { LOADING.delete(a); this.onModel && this.onModel(a); });
  }
  loading(a) { return LOADING.has(a); }
  norm(a, r, v) { const d = ASSETS[a]; return [((Math.round(r / d.rot) * d.rot) % 72 + 72) % 72, v % d.variants]; }
  get(a, r, v) {
    const def = ASSETS[a]; if (!def) return null;
    [r, v] = this.norm(a, r, v);
    if (def.model) { const f = MODELS.get(a); if (f === undefined) this.need(a); return f ? f[Math.round(r / 72 * f.length) % f.length] : null; }
    const k = a + '|' + r + '|' + v;
    let s = this.spr.get(k);
    if (!s) {
      const mk = a + '|' + v;
      let me = this.mesh.get(mk);
      if (!me) { me = new Mesh(); def.build(me, v); this.mesh.set(mk, me); }
      s = renderSprite(me, r * Math.PI / 36); this.spr.set(k, s);
    }
    return s;
  }
  thumb(a, size) {
    const s = this.get(a, ASSETS[a].thumbR || 0, 0), cv = document.createElement('canvas'); cv.width = cv.height = size;
    if (!s) return cv;
    const ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false;
    const k = Math.min(size / s.w, size / s.h), w = s.w * k, h = s.h * k;
    ctx.drawImage(s.canvas, (size - w) / 2, (size - h) / 2, w, h);
    return cv;
  }
}
