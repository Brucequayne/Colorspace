// ===== terrain.js · Gelände: Höhenraster, Low-Poly-Netz in Kacheln, Formen, Malen, Abfragen =====
// Raster RES × RES Zellen über SIZE Meter (seit v0.11: 360 × 360 Zellen à 4 m = 1440 m, doppelte Fläche), Mitte bei (0, 0). Jede Zelle = 2 Dreiecke mit abwechselnder Diagonale (Low-Poly-Look).
// h = Grundhöhe (was du formst), hr = gezeichnete Höhe = Grundhöhe mit eingebetteter Straße (die Straße drückt das Gelände weg).
// Gezeichnet wird in 10 × 10 Kacheln, damit beim Pinseln nur die betroffenen Kacheln neu gebaut werden.
import * as THREE from "three";
import { clamp, lerp, hash2, b64, unb64, L2, tl } from "le/core.js";

export const LAYERS = [
  { id: "grass", n: L2("Gras", "Grass"), c: "#6E9A45" },
  { id: "dry", n: L2("Trockenes Gras", "Dry grass"), c: "#A7A353" },
  { id: "forest", n: L2("Waldboden", "Forest floor"), c: "#4F6B34" },
  { id: "dirt", n: L2("Erde", "Dirt"), c: "#8A6A44" },
  { id: "gravel", n: L2("Kies", "Gravel"), c: "#9A948A" },
  { id: "sand", n: L2("Sand", "Sand"), c: "#D2BD88" },
  { id: "rock", n: L2("Fels", "Rock"), c: "#7D7A73" },
  { id: "snow", n: L2("Schnee", "Snow"), c: "#ECEFF2" }
];
export const LAYER_COL = LAYERS.map((l) => new THREE.Color(l.c));
const ROCK = new THREE.Color("#7D7A73");

export class Terrain {
  constructor(size = 1440, res = 360) {
    this.size = size; this.res = res; this.cell = size / res; this.n = res + 1; this.org = -size / 2;
    this.h = new Float32Array(this.n * this.n); this.hr = new Float32Array(this.n * this.n); this.paint = new Uint8Array(this.n * this.n);
    this.CH = 36; this.nch = res / this.CH;
    this.group = new THREE.Group(); this.chunks = [];
    this.mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
    this.carve = null;   // (x, z, grundhöhe) => gezeichnete Höhe (von der Welt, alle Straßen)
    for (let cz = 0; cz < this.nch; cz++) for (let cx = 0; cx < this.nch; cx++) {
      const g = new THREE.BufferGeometry(), nv = this.CH * this.CH * 6;
      g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(nv * 3), 3));
      g.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(nv * 3), 3));
      g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(nv * 3), 3));
      const m = new THREE.Mesh(g, this.mat); m.receiveShadow = true; m.castShadow = true; m.userData.terrain = true;   // seit v0.21.1: Hügel werfen Schatten
      this.group.add(m); this.chunks.push({ m: m, cx: cx, cz: cz });
    }
  }
  idx(i, j) { return j * this.n + i; }
  // Gezeichnete Höhe aus Grundhöhe + Straße neu rechnen (Bereich in Rasterpunkten)
  recalc(i0 = 0, j0 = 0, i1 = this.res, j1 = this.res) {
    i0 = clamp(i0, 0, this.res); j0 = clamp(j0, 0, this.res); i1 = clamp(i1, 0, this.res); j1 = clamp(j1, 0, this.res);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const k = this.idx(i, j), b = this.h[k];
      this.hr[k] = this.carve ? this.carve(this.org + i * this.cell, this.org + j * this.cell, b) : b;   // seit v0.13 rechnet die Welt alle Straßen zusammen
    }
  }
  // Kacheln neu bauen (alle oder Bereich in Zellen)
  rebuild(i0 = 0, j0 = 0, i1 = this.res, j1 = this.res) {
    const CH = this.CH;
    this.chunks.forEach((ch) => {
      const a0 = ch.cx * CH, b0 = ch.cz * CH;
      if (a0 > i1 || a0 + CH < i0 || b0 > j1 || b0 + CH < j0) return;
      this.buildChunk(ch);
    });
  }
  buildChunk(ch) {
    const CH = this.CH, g = ch.m.geometry, P = g.attributes.position.array, N = g.attributes.normal.array, Co = g.attributes.color.array;
    const hr = this.hr, cell = this.cell, org = this.org, n = this.n;
    let v = 0;
    const va = new THREE.Vector3(), vb = new THREE.Vector3(), vc = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), nn = new THREE.Vector3(), col = new THREE.Color();
    const tri = (i, j, a, b, c, ti) => {
      const pts = [a, b, c];
      for (let q = 0; q < 3; q++) { const pi = pts[q][0], pj = pts[q][1]; P[v * 3 + q * 3] = org + pi * cell; P[v * 3 + q * 3 + 1] = hr[pj * n + pi]; P[v * 3 + q * 3 + 2] = org + pj * cell; }
      va.fromArray(P, v * 3); vb.fromArray(P, v * 3 + 3); vc.fromArray(P, v * 3 + 6);
      nn.crossVectors(e1.subVectors(vb, va), e2.subVectors(vc, va)).normalize();
      // Farbe: häufigste Bodenart der drei Ecken, steile Hänge werden zu Fels, leichte Helligkeitsvariation je Dreieck
      const L0 = this.paint[a[1] * n + a[0]], L1 = this.paint[b[1] * n + b[0]], L2_ = this.paint[c[1] * n + c[0]];
      const L = L1 === L2_ ? L1 : L0;
      col.copy(LAYER_COL[L]);
      if (L !== 7 && nn.y < 0.82) col.lerp(ROCK, clamp((0.82 - nn.y) / 0.22, 0, 1));
      const br = 0.9 + hash2(i * 2 + ti, j, 7) * 0.14; col.multiplyScalar(br);
      for (let q = 0; q < 3; q++) { N[v * 3 + q * 3] = nn.x; N[v * 3 + q * 3 + 1] = nn.y; N[v * 3 + q * 3 + 2] = nn.z; Co[v * 3 + q * 3] = col.r; Co[v * 3 + q * 3 + 1] = col.g; Co[v * 3 + q * 3 + 2] = col.b; }
      v += 3;
    };
    for (let jj = 0; jj < CH; jj++) for (let ii = 0; ii < CH; ii++) {
      const i = ch.cx * CH + ii, j = ch.cz * CH + jj, A = [i, j], B = [i + 1, j], Cc = [i, j + 1], D = [i + 1, j + 1];
      if ((i + j) & 1) { tri(i, j, A, Cc, B, 0); tri(i, j, B, Cc, D, 1); } else { tri(i, j, A, Cc, D, 0); tri(i, j, A, D, B, 1); }
    }
    g.attributes.position.needsUpdate = true; g.attributes.normal.needsUpdate = true; g.attributes.color.needsUpdate = true;
    g.computeBoundingSphere(); g.computeBoundingBox();
  }
  // Höhe genau auf dem Dreiecksnetz (wie gezeichnet). base = true: Grundhöhe ohne Straße
  heightAt(x, z, base) {
    const H = base ? this.h : this.hr, gx = clamp((x - this.org) / this.cell, 0, this.res - 1e-4), gz = clamp((z - this.org) / this.cell, 0, this.res - 1e-4);
    const i = Math.floor(gx), j = Math.floor(gz), fx = gx - i, fz = gz - j, n = this.n;
    const a = H[j * n + i], b = H[j * n + i + 1], c = H[(j + 1) * n + i], d = H[(j + 1) * n + i + 1];
    if ((i + j) & 1) return fx + fz <= 1 ? a + (b - a) * fx + (c - a) * fz : d + (c - d) * (1 - fx) + (b - d) * (1 - fz);
    return fx >= fz ? a + (b - a) * fx + (d - b) * fz : a + (c - a) * fz + (d - c) * fx;
  }
  normalAt(x, z, out) {
    const e = 0.6, hl = this.heightAt(x - e, z), hR = this.heightAt(x + e, z), hd = this.heightAt(x, z - e), hu = this.heightAt(x, z + e);
    return (out || new THREE.Vector3()).set(hl - hR, 2 * e, hd - hu).normalize();
  }
  layerAt(x, z) { const i = clamp(Math.round((x - this.org) / this.cell), 0, this.res), j = clamp(Math.round((z - this.org) / this.cell), 0, this.res); return this.paint[j * this.n + i]; }
  inside(x, z) { return Math.abs(x) < this.size / 2 && Math.abs(z) < this.size / 2; }
  // Strahl gegen Gelände (Editor-Maus): in Schritten vorwärts, dann fein eingrenzen
  raycast(o, d, maxD = 3000) {
    let prev = 0, step = 2;
    for (let s = step; s < maxD; s += step) {
      const x = o.x + d.x * s, z = o.z + d.z * s, y = o.y + d.y * s;
      if (!this.inside(x, z)) { if (d.y >= 0) continue; }
      if (y <= this.heightAt(x, z)) {
        let lo = prev, hi = s;
        for (let k = 0; k < 18; k++) { const m = (lo + hi) / 2; if (o.y + d.y * m <= this.heightAt(o.x + d.x * m, o.z + d.z * m)) hi = m; else lo = m; }
        return new THREE.Vector3(o.x + d.x * hi, o.y + d.y * hi, o.z + d.z * hi);
      }
      prev = s; if (s > 200) step = 4;
    }
    return null;
  }
  // Pinsel: mode raise | lower | smooth | flatten | noise. Rückgabe: betroffener Bereich in Rasterpunkten
  sculpt(mode, x, z, r, str, dt, target) {
    const c = this.cell, i0 = Math.floor((x - r - this.org) / c), i1 = Math.ceil((x + r - this.org) / c), j0 = Math.floor((z - r - this.org) / c), j1 = Math.ceil((z + r - this.org) / c);
    const H = this.h, n = this.n, src = mode === "smooth" ? H.slice() : null;
    for (let j = Math.max(0, j0); j <= Math.min(this.res, j1); j++) for (let i = Math.max(0, i0); i <= Math.min(this.res, i1); i++) {
      const dx = this.org + i * c - x, dz = this.org + j * c - z, d = Math.sqrt(dx * dx + dz * dz) / r;
      if (d >= 1) continue;
      const w = (1 - d * d) * (1 - d * d), k = j * n + i;
      if (mode === "raise") H[k] += str * 14 * dt * w;
      else if (mode === "lower") H[k] -= str * 14 * dt * w;
      else if (mode === "flatten") H[k] = lerp(H[k], target, clamp(str * 8 * dt * w, 0, 1));
      else if (mode === "smooth") {
        let s = 0, q = 0;
        for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) { const ii = i + a, jj = j + b; if (ii < 0 || jj < 0 || ii > this.res || jj > this.res) continue; s += src[jj * n + ii]; q++; }
        H[k] = lerp(H[k], s / q, clamp(str * 10 * dt * w, 0, 1));
      } else if (mode === "noise") H[k] += (hash2(i, j, Math.floor(performance.now() / 120)) - 0.5) * str * 30 * dt * w;
      H[k] = clamp(H[k], -300, 300);
    }
    return [i0 - 1, j0 - 1, i1 + 1, j1 + 1];
  }
  // Regen-Erosion (seit v0.14): Tropfen starten im Pinsel an Hängen (ab ~18°), laufen bergab, tragen Material ab,
  // solange sie schnell sind, und lagern es ab, wo es flacher wird. So entstehen Rinnen und Schwemmfächer.
  // R = Zufallsfunktion (0…1). Gibt den geänderten Bereich zurück (Rasterpunkte) oder null.
  erode(x, z, r, str, dt, R) {
    const H = this.h, n = this.n, res = this.res, c = this.cell, rc = r / c, cx = (x - this.org) / c, cz = (z - this.org) / c;
    const drops = Math.min(300, Math.ceil(str * 260 * dt * Math.max(0.3, (rc / 6) * (rc / 6))));
    let i0 = 1e9, j0 = 1e9, i1 = -1e9, j1 = -1e9, any = false;
    const hgt = (px, pz, o) => {   // Höhe und Gefälle (m pro Zelle) bilinear
      const ix = Math.floor(px), iz = Math.floor(pz), u = px - ix, v = pz - iz, k = iz * n + ix;
      const a = H[k], b = H[k + 1], cc = H[k + n], d = H[k + n + 1];
      o.h = a * (1 - u) * (1 - v) + b * u * (1 - v) + cc * (1 - u) * v + d * u * v;
      o.gx = (b - a) * (1 - v) + (d - cc) * v; o.gz = (cc - a) * (1 - u) + (d - b) * u; return o;
    };
    const add = (px, pz, amt) => {   // auf die 4 Nachbarpunkte verteilen
      const ix = Math.floor(px), iz = Math.floor(pz), u = px - ix, v = pz - iz, k = iz * n + ix;
      H[k] += amt * (1 - u) * (1 - v); H[k + 1] += amt * u * (1 - v); H[k + n] += amt * (1 - u) * v; H[k + n + 1] += amt * u * v;
      if (ix < i0) i0 = ix; if (iz < j0) j0 = iz; if (ix + 1 > i1) i1 = ix + 1; if (iz + 1 > j1) j1 = iz + 1; any = true;
    };
    const o = {}, o2 = {}, slopeMin = 0.32 * c;   // tan(~18°) × Zellgröße
    for (let q = 0; q < drops; q++) {
      const an = R() * Math.PI * 2, rr = Math.sqrt(R()) * rc;
      let px = cx + Math.cos(an) * rr, pz = cz + Math.sin(an) * rr;
      if (px < 1 || pz < 1 || px >= res - 1 || pz >= res - 1) continue;
      hgt(px, pz, o); if (Math.hypot(o.gx, o.gz) < slopeMin) continue;   // flaches Gelände bleibt, wie es ist
      let dx = 0, dz = 0, sp = 1, water = 1, sed = 0;
      for (let st = 0; st < 60; st++) {
        hgt(px, pz, o);
        dx = dx * 0.1 - o.gx * 0.9; dz = dz * 0.1 - o.gz * 0.9;
        const L = Math.hypot(dx, dz); if (L < 1e-6) break; dx /= L; dz /= L;
        const nx = px + dx, nz = pz + dz;
        if (nx < 1 || nz < 1 || nx >= res - 1 || nz >= res - 1) break;
        const fall = Math.max(0, 1 - Math.hypot(px - cx, pz - cz) / (rc * 1.6)); if (fall <= 0) break;   // nur im (erweiterten) Pinsel
        const dh = hgt(nx, nz, o2).h - o.h, cap = Math.max(-dh, 0.05) * sp * water * 0.6;
        if (sed > cap || dh > 0) {   // ablagern (bergauf: Senke auffüllen)
          const amt = dh > 0 ? Math.min(dh, sed) : (sed - cap) * 0.25; sed -= amt; add(px, pz, amt);
        } else {                     // abtragen, über 3×3 Punkte verteilt, damit keine Spitzen entstehen
          const amt = Math.min((cap - sed) * 0.12 * (0.4 + str) * fall, -dh * 0.5, 0.12); sed += amt;
          for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) { const w = (a === 0 && b === 0 ? 0.36 : (a && b ? 0.06 : 0.1)); add(px + a, pz + b, -amt * w); }
        }
        sp = Math.min(4, Math.sqrt(Math.max(0, sp * sp - dh * 0.5))); water *= 0.97;
        px = nx; pz = nz;
      }
      if (sed > 0) add(px, pz, sed * 0.8);
    }
    return any ? [i0 - 1, j0 - 1, i1 + 1, j1 + 1] : null;
  }
  // Bodenart malen; smin/smax: nur wo die Hangneigung (Grad) dazwischen liegt
  paintAt(layer, x, z, r, smin = 0, smax = 90) {
    const c = this.cell, cmin = Math.cos(smax * Math.PI / 180) - 1e-6, cmax = Math.cos(smin * Math.PI / 180) + 1e-6, nv = new THREE.Vector3(), filt = smin > 0 || smax < 90, i0 = Math.floor((x - r - this.org) / c), i1 = Math.ceil((x + r - this.org) / c), j0 = Math.floor((z - r - this.org) / c), j1 = Math.ceil((z + r - this.org) / c);
    for (let j = Math.max(0, j0); j <= Math.min(this.res, j1); j++) for (let i = Math.max(0, i0); i <= Math.min(this.res, i1); i++) {
      const dx = this.org + i * c - x, dz = this.org + j * c - z, d = Math.sqrt(dx * dx + dz * dz) / r;
      if (d >= 0.75 + hash2(i, j, 3) * 0.25) continue;
      if (filt) { this.normalAt(this.org + i * c, this.org + j * c, nv); if (nv.y < cmin || nv.y > cmax) continue; }
      this.paint[j * this.n + i] = layer;
    }
    return [i0 - 1, j0 - 1, i1 + 1, j1 + 1];
  }
  // Speichern: Höhen in Zentimetern als Int16, Bodenarten als Bytes
  toJSON() {
    const q = new Int16Array(this.h.length); for (let i = 0; i < q.length; i++) q[i] = Math.round(clamp(this.h[i], -327, 327) * 100);
    return { size: this.size, res: this.res, h: b64(new Uint8Array(q.buffer)), p: b64(this.paint) };
  }
  fromJSON(o) {
    if (!o || !o.res || !o.size) return false;
    const u = unb64(o.h), q = new Int16Array(u.buffer, u.byteOffset, u.byteLength >> 1), pp = unb64(o.p);
    if (o.res === this.res && o.size === this.size) {
      for (let i = 0; i < this.h.length; i++) this.h[i] = (q[i] || 0) / 100;
      this.paint.set(pp.subarray(0, this.paint.length)); return true;
    }
    // Ältere, kleinere Szene (z. B. 1024 m aus v0.1): gleiche Zellgröße → mittig einsetzen, Rand nach außen fortsetzen
    const off = (this.res - o.res) / 2, sn = o.res + 1;
    if (Math.abs(o.size / o.res - this.cell) > 1e-6 || off < 0 || off !== Math.floor(off)) return false;
    for (let j = 0; j < this.n; j++) for (let i = 0; i < this.n; i++) {
      const si = clamp(i - off, 0, o.res), sj = clamp(j - off, 0, o.res), k = sj * sn + si;
      this.h[j * this.n + i] = (q[k] || 0) / 100; this.paint[j * this.n + i] = pp[k] || 0;
    }
    return true;
  }
  layerName(i) { return tl(LAYERS[i].n); }
}
