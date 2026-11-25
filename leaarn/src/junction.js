// ===== junction.js · Kreuzungen, Einmündungen und Übergänge zwischen Straßen (seit v0.19.8) =====
// Ein Knoten entsteht, wo eine Straße auf einer anderen endet (T/Y), zwei Straßen sich auf gleicher Höhe kreuzen (X)
// oder zwei Straßen verschiedenen Typs Ende an Ende stoßen. Jede Straße, die vom Knoten wegführt, ist ein Arm.
// Die Straßen selbst werden im Knotenbereich weggelassen (Road.jz) und enden mit einem exakten Querschnitt; die Kreuzung
// ist eine eigene Fläche, die genau an diese Querschnitte anschließt: Asphalt als Fächer um die Mitte, abgerundete
// Bordsteinecken zwischen den Armen (beliebige Winkel), Gehwege laufen bündig um die Ecken, Randlinien laufen mit.
// Dieselbe Fläche liefert Physik (query), Gelände (carve: darunter versteckt, Ränder bündig) und Pflanzenabstand (dist).
import * as THREE from "three";
import { lerp, smooth } from "le/core.js";
import { TYPEN, GW, KH, KB, CW, RCOL, walkTex } from "le/road.js";

const TAU = Math.PI * 2;
const ccw = (u) => ({ x: -u.z, z: u.x });   // 90° gegen den Uhrzeiger (passt zu Road: r = ccw(t))
const ang = (u) => Math.atan2(u.z, u.x);
const nrm = (x, z) => { const l = Math.hypot(x, z) || 1; return { x: x / l, z: z / l }; };
function lineX(p, u, q, v) { const den = u.x * v.z - u.z * v.x; if (Math.abs(den) < 1e-9) return null; const s = ((q.x - p.x) * v.z - (q.z - p.z) * v.x) / den; return { x: p.x + u.x * s, z: p.z + u.z * s, s: s }; }
function proj(o, p, u) { const s = (o.x - p.x) * u.x + (o.z - p.z) * u.z; return { x: p.x + u.x * s, z: p.z + u.z * s }; }
const isEnd = (r, pos) => !r.closed && (pos < 0.5 || pos > r.len - 0.5);

// ---------- Knoten finden ----------
export function findNodes(roads) {
  const R = roads.filter((r) => r.S.length > 1), nodes = [];
  const add = (x, z, ents) => nodes.push({ x: x, z: z, ents: ents });
  // 1. Straßenenden auf einer anderen Straße (Einmündung) oder an deren Ende (Übergang)
  for (const r of R) {
    if (r.closed) continue;
    for (const k of [0, 1]) {
      const s = k ? r.S[r.S.length - 1] : r.S[0], pos = k ? r.len : 0; if (s.br) continue;
      for (const o of R) {
        if (o === r) continue; const q = o.nearest(s.p.x, s.p.z); if (!q || q.br || Math.abs(q.y - s.p.y) > 1.5) continue;
        if (q.over > 0.01) { if (q.over < 1.5 && Math.abs(q.d) < q.w / 2 + 0.6) add((q.cx + s.p.x) / 2, (q.cz + s.p.z) / 2, [{ r: r, pos: pos }, { r: o, pos: q.dist }]); continue; }
        if (Math.abs(q.d) > q.w / 2 + 0.6) continue;
        add(q.cx, q.cz, [{ r: r, pos: pos }, { r: o, pos: q.dist }]);
      }
    }
  }
  // 2. Kreuzungen auf gleicher Höhe (Mittellinien schneiden sich, keine Brücke)
  for (let ai = 0; ai < R.length; ai++) for (let bi = ai + 1; bi < R.length; bi++) {
    const A = R[ai], B = R[bi], SA = A.S, SB = B.S, mA = SA.length, mB = SB.length;
    for (let i = 0; i < A.segCount(); i++) {
      const a0 = SA[i], a1 = SA[(i + 1) % mA], l = B.grid.get(Math.floor(a0.p.x / 16) + "," + Math.floor(a0.p.z / 16)); if (!l) continue;
      const rx = a1.p.x - a0.p.x, rz = a1.p.z - a0.p.z;
      for (const j of l) {
        const b0 = SB[j], b1 = SB[(j + 1) % mB], sx = b1.p.x - b0.p.x, sz = b1.p.z - b0.p.z, den = rx * sz - rz * sx; if (Math.abs(den) < 1e-9) continue;
        const qx = b0.p.x - a0.p.x, qz = b0.p.z - a0.p.z, u = (qx * sz - qz * sx) / den, v = (qx * rz - qz * rx) / den;
        if (u < -1e-6 || u > 1 + 1e-6 || v < -1e-6 || v > 1 + 1e-6) continue;
        if (a0.br || a1.br || b0.br || b1.br) continue;
        if (Math.abs(lerp(a0.p.y, a1.p.y, u) - lerp(b0.p.y, b1.p.y, v)) > 1.5) continue;
        add(a0.p.x + rx * u, a0.p.z + rz * u, [{ r: A, pos: a0.d + u * a0.p.distanceTo(a1.p) }, { r: B, pos: b0.d + v * b0.p.distanceTo(b1.p) }]);
      }
    }
  }
  // Doppelte zusammenfassen (Einmündung wird oft auch als Kreuzung gefunden), nahe Knoten verschmelzen
  const out = [];
  for (const n of nodes) {
    const m = out.find((o) => Math.hypot(o.x - n.x, o.z - n.z) < 6);
    if (!m) out.push({ x: n.x, z: n.z, k: 1, ents: n.ents.slice() }); else mergeNode(m, n, 8);
  }
  return out;
}
// Knoten n in m übernehmen: gleiche Straße innerhalb tol Meter = ein Eintrag (Enden haben Vorrang, sonst Mitte)
function mergeNode(m, n, tol) {
  const k = n.k || 1; m.x = (m.x * m.k + n.x * k) / (m.k + k); m.z = (m.z * m.k + n.z * k) / (m.k + k); m.k += k;
  n.ents.forEach((e) => {
    const f = m.ents.find((g) => { if (g.r !== e.r) return false; let d = Math.abs(g.pos - e.pos); if (e.r.closed) d = Math.min(d, e.r.len - d); return d < tol; });
    if (!f) m.ents.push(e); else if (isEnd(e.r, e.pos)) f.pos = e.pos; else if (!isEnd(f.r, f.pos) && !e.r.closed) f.pos = (f.pos + e.pos) / 2;
  });
}

// ---------- Eine Kreuzung bauen ----------
// Gibt das Kreuzungs-Objekt zurück (oder null, wenn es keine sinnvolle Kreuzung ist). Schreibt Geometrie in G.
function buildOne(node, G) {
  const ents = node.ents; if (ents.length < 2) return null;
  ents.forEach((e) => { if (!e.r.closed) { if (e.pos < 0.5) e.pos = 0; else if (e.pos > e.r.len - 0.5) e.pos = e.r.len; } });   // Enden genau aufs Ende
  // Mitte: Straße, die durchläuft und Vorrang hat; sonst Mittelwert
  const pass = ents.filter((e) => e.r.closed || (e.pos > 1.5 && e.pos < e.r.len - 1.5)).sort((a, b) => b.r.prio() - a.r.prio());
  let C, yC;
  if (pass.length) { const s = pass[0].r.secAt(pass[0].pos); C = { x: s.p.x, z: s.p.z }; yC = s.p.y; }
  else { C = { x: node.x, z: node.z }; yC = ents.reduce((a, e) => a + e.r.secAt(e.pos).p.y, 0) / ents.length; }
  // Arme
  let arms = [];
  for (const e of ents) for (const sg of [1, -1]) {
    const r = e.r, avail = r.closed ? 1e9 : sg > 0 ? r.len - e.pos : e.pos; if (avail < 1.5) continue;
    const s = r.secAt(e.pos), u = nrm(s.t.x * sg, s.t.z * sg), TY = r.typ ? TYPEN[r.typ] : null;
    arms.push({ r: r, pos: e.pos, sg: sg, avail: avail, u: u, bike: !!(TY && TY.bike), lines: !!(TY && !TY.bike), cut: 1.0 });
  }
  if (arms.length < 2) return null;
  if (arms.length === 2) arms.forEach((A) => { A.cut = 3.0; });   // Übergang zwischen zwei Straßen: 6 m lang, damit Breitenwechsel sanft wirken
  arms.sort((a, b) => ang(a.u) - ang(b.u));
  const N = arms.length;
  for (let k = 0; k < N; k++) { let ph = ang(arms[(k + 1) % N].u) - ang(arms[k].u); while (ph <= 1e-6) ph += TAU; if (ph < 15 * Math.PI / 180) return null; }   // zu spitz: lieber keine Kreuzung
  // Seiten eines Arms aus einem Querschnitt: ccw-Seite (links vom Arm gesehen von der Mitte) = Straßenseite sg
  const sides = (A, s) => {
    const rc = A.sg > 0, kc = rc ? s.cr : s.cl, kw = rc ? s.cl : s.cr;
    A.eC = s.w / 2 + (kc ? CW : 0); A.eW = s.w / 2 + (kw ? CW : 0); A.swC = !!(rc ? s.sr : s.sl); A.swW = !!(rc ? s.sl : s.sr);
  };
  arms.forEach((A) => { A.sec = A.r.secAt(A.pos); sides(A, A.sec); });   // erst mit dem Querschnitt an der Kreuzung rechnen (echte Lage, auch wenn die Straße nicht durch die Mitte läuft)
  // Ecke zwischen Arm k und dem nächsten Arm (gegen den Uhrzeiger)
  const corner = (k) => {
    const A = arms[k], B = arms[(k + 1) % N], uA = A.u, uB = B.u, nA = ccw(uA), nB = ccw(uB), mA = nA, mB = { x: -nB.x, z: -nB.z };
    let phi = ang(uB) - ang(uA); while (phi <= 1e-6) phi += TAU;
    const swA = A.swC, swB = B.swW, any = swA || swB;
    const P1 = (o) => { const v = A.r.at(A.sec, A.sg * (A.eC + o), 0); return { x: v.x, z: v.z }; };
    const P2 = (o) => { const v = B.r.at(B.sec, -B.sg * (B.eW + o), 0); return { x: v.x, z: v.z }; };
    const c = { A: A, B: B, phi: phi, swA: swA, swB: swB, any: any, P1: P1, P2: P2, uA: uA, uB: uB };
    // durchgehende Seite einer Straße (beide Arme gehören zur selben Straße): Rand folgt genau der Straße, auch in Kurven
    if (A.r === B.r && A.sg === -B.sg && Math.abs(A.pos - B.pos) < 0.01) {
      if (A.dc === undefined || B.dc === undefined) { c.kind = "straight"; c.path = (o) => [P1(o), P2(o)]; c.iT1 = 0; c.iT2 = 1; return c; }
      const d0 = A.dc, d1 = B.dc, n = Math.max(1, Math.ceil(Math.abs(d1 - d0) / 2)), secs = [];
      for (let i = 0; i <= n; i++) secs.push(i === 0 ? A.sec : i === n ? B.sec : A.r.secAt(lerp(d0, d1, i / n)));
      c.kind = "along"; c.iT1 = 0; c.iT2 = n;
      c.path = (o) => secs.map((sc, i) => { const e = lerp(A.eC, B.eW, i / n), v = A.r.at(sc, A.sg * (e + o), 0); return { x: v.x, z: v.z }; });
      return c;
    }
    if (Math.abs(phi - Math.PI) < 0.03) { c.kind = "straight"; c.path = (o) => [P1(o), P2(o)]; c.iT1 = 0; c.iT2 = 1; return c; }
    if (phi > Math.PI) {   // stumpfe Außenseite (Knick): scharfe Ecke, wo sich die Ränder treffen
      const X = lineX(P1(0), uA, P2(0), uB);
      if (!X || X.s > 0 || X.s < -40) { c.kind = "straight"; c.path = (o) => [P1(o), P2(o)]; c.iT1 = 0; c.iT2 = 1; return c; }
      c.kind = "reflex"; c.path = (o) => { const p1 = P1(o), p2 = P2(o), Xo = lineX(p1, uA, p2, uB) || p1; return [p1, Xo, p2]; }; c.iT1 = 1; c.iT2 = 1; return c;
    }
    // Innenecke: Bordstein als Bogen mit Radius R (mit Gehweg 4 m, ohne 3 m, Radweg 1,2 m), bei spitzen Winkeln kleiner
    let R = any ? GW + 1.8 : (A.bike || B.bike) ? 1.2 : 3.0; const t2 = Math.tan(phi / 2); if (R / t2 > 14) R = 14 * t2;
    const X = lineX(P1(0), uA, P2(0), uB); if (!X) { c.kind = "straight"; c.path = (o) => [P1(o), P2(o)]; c.iT1 = 0; c.iT2 = 1; return c; }
    const bis = nrm(uA.x + uB.x, uA.z + uB.z), Oc = { x: X.x + bis.x * R / Math.sin(phi / 2), z: X.z + bis.z * R / Math.sin(phi / 2) };
    const T1 = proj(Oc, P1(0), uA), T2 = proj(Oc, P2(0), uB), a1 = Math.atan2(T1.z - Oc.z, T1.x - Oc.x);
    let da = Math.atan2(T2.z - Oc.z, T2.x - Oc.x) - a1; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
    const n = Math.max(3, Math.ceil(Math.abs(da) / 0.14));
    c.kind = "fillet"; c.R = R; c.Oc = Oc; c.iT1 = 1; c.iT2 = n + 1;
    c.path = (o) => {
      const p1 = P1(o), p2 = P2(o), out = [p1];
      if (R - o < 0.05) { const Xo = lineX(p1, uA, p2, uB) || p1; for (let i = 0; i <= n; i++) out.push(Xo); }
      else { const t1 = proj(Oc, p1, uA), tt2 = proj(Oc, p2, uB); out.push(t1); for (let i = 1; i < n; i++) { const a = a1 + da * i / n; out.push({ x: Oc.x + Math.cos(a) * (R - o), z: Oc.z + Math.sin(a) * (R - o) }); } out.push(tt2); }
      out.push(p2); return out;
    };
    return c;
  };
  // Schnittlänge je Arm: Querschnitt hinter den Bogenanfang (Bordstein und Gehweg-Außenkante) + 0,6 m.
  // Gemessen entlang des Arms ab seinem Kreuzungspunkt; nachrechnen, bis die Bögen mit den echten Querschnitten vor dem Schnitt liegen
  let CS = null;
  for (let it = 0; it < 4; it++) {
    let grow = false;
    for (let k = 0; k < N; k++) {
      const c = corner(k); if (c.kind === "straight" || c.kind === "along") continue;
      for (const o of (c.any ? [0, GW] : [0])) {
        const p = c.path(o), tA = p[c.iT1], tB = p[c.iT2], s0A = c.A.r.secAt(c.A.pos).p, s0B = c.B.r.secAt(c.B.pos).p;
        const nA = (tA.x - s0A.x) * c.uA.x + (tA.z - s0A.z) * c.uA.z + 0.6, nB = (tB.x - s0B.x) * c.uB.x + (tB.z - s0B.z) * c.uB.z + 0.6;
        if (nA > c.A.cut + 0.05) { c.A.cut = nA; grow = true; } if (nB > c.B.cut + 0.05) { c.B.cut = nB; grow = true; }
      }
    }
    for (const A of arms) {
      A.cut = Math.min(A.cut, A.avail - 0.3); if (A.cut < 0.5) return null;
      A.dc = A.pos + A.sg * A.cut; A.sec = A.r.secAt(A.dc); A.u = nrm(A.sec.t.x * A.sg, A.sec.t.z * A.sg); sides(A, A.sec);
    }
    if (it > 0 && !grow) break;
  }
  CS = []; for (let k = 0; k < N; k++) CS.push(corner(k));
  // Höhen: Punkte auf einem Armrand bekommen die Höhe ihrer Straße, Bögen dazwischen werden gemischt
  const hR = (r, p) => { const q = r.nearest(p.x, p.z); return q ? q.y - q.d * q.tan : yC; };
  const J = { CS: CS, C: C, yC: yC, arms: arms, tris: [], walk: [], outer: [], open: [], fall: Math.max(4, Math.min(...arms.map((a) => a.r.fall || 8))) };
  const P = G.P, Co = G.Co, V = (x, y, z) => new THREE.Vector3(x, y, z);
  const tri = (a, b, c, col) => { P.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z); for (let i = 0; i < 3; i++) Co.push(col.r, col.g, col.b); };
  const quad = (a, b, c, d, col) => { tri(a, b, d, col); tri(b, c, d, col); };
  const loop = [];
  CS.forEach((c) => {
    const p0 = c.path(0), last = p0.length - 1, h = p0.map((p, i) => {
      if (i === 0) return c.A.r.at(c.A.sec, c.A.sg * c.A.eC, 0).y; if (i === last) return c.B.r.at(c.B.sec, -c.B.sg * c.B.eW, 0).y;
      if (c.kind === "along" || i <= c.iT1) return hR(c.A.r, p); if (i >= c.iT2) return hR(c.B.r, p);
      return null;
    });
    if (c.kind === "fillet") { const ha = h[c.iT1], hb = h[c.iT2]; for (let i = c.iT1 + 1; i < c.iT2; i++) h[i] = lerp(ha, hb, (i - c.iT1) / (c.iT2 - c.iT1)); }
    c.p0 = p0; c.h = h; c.last = last;
    // Punkt i auf dem Pfad mit Abstand o (positiv = nach außen), Höhe y über der Fahrbahn; Enden exakt wie die Arm-Querschnitte
    c.pt = (pathO, i, o, y) => { if (i === 0) return c.A.r.at(c.A.sec, c.A.sg * (c.A.eC + o), y); if (i === last) return c.B.r.at(c.B.sec, -c.B.sg * (c.B.eW + o), y); const q = pathO[i]; return V(q.x, h[i] + y, q.z); };
    for (let i = 0; i <= last; i++) loop.push(c.pt(p0, i, 0, 0));
  });
  // Asphalt: Fächer um die Mitte
  const cy = V(C.x, yC, C.z), col = RCOL.asphalt.clone().multiplyScalar(0.97);
  for (let i = 0; i < loop.length; i++) {
    const a = loop[i], b = loop[(i + 1) % loop.length]; if (Math.hypot(a.x - b.x, a.z - b.z) < 1e-4) continue;
    tri(cy, b, a, col); J.tris.push([cy.x, cy.y, cy.z, b.x, b.y, b.z, a.x, a.y, a.z]);
  }
  // Ecken: Randlinien, Gehwege, Seitenwände, Außenrand
  CS.forEach((c, k) => {
    const last = c.last, sk = 1.3;
    if (c.A.lines && c.B.lines) {   // Randlinie 0,2–0,32 m innen, läuft um die Ecke; Höhe genau auf der gezeichneten Asphaltfläche
      const pa = c.path(-0.2), pb = c.path(-0.32), on = (v) => { if (v.x === undefined) return v; const h = fanH(J, v.x, v.z); if (h != null) v.y = h + 0.015; return v; };
      for (let i = 0; i < last; i++) quad(on(c.pt(pa, i, -0.2, 0.015)), on(c.pt(pb, i, -0.32, 0.015)), on(c.pt(pb, i + 1, -0.32, 0.015)), on(c.pt(pa, i + 1, -0.2, 0.015)), RCOL.line);
    }
    let i0 = 0, i1 = last; const both = c.swA && c.swB;
    if (c.any && !both) { if (c.swA) i1 = c.iT2; else i0 = c.iT1; }
    const o0 = [];   // Außenrand dieser Ecke: [x, z, Oberkante]
    if (c.any) {
      const pk = c.path(KB), pg = c.path(GW), WP = G.WP, WU = G.WU, L = 1.5;
      // Fugen-Raster: am Arm mit Gehweg anschließen
      const len = [0]; for (let i = 1; i <= last; i++) len.push(len[i - 1] + Math.hypot(pk[i].x - pk[i - 1].x, pk[i].z - pk[i - 1].z));
      const uu = (i) => c.swA ? (c.A.sec.d - c.A.sg * len[i]) / L : (c.B.sec.d - c.B.sg * (len[last] - len[i])) / L;
      for (let i = i0; i < i1; i++) {
        const c0 = c.pt(c.p0, i, 0, 0.01), c1 = c.pt(c.p0, i + 1, 0, 0.01), k0 = c.pt(c.p0, i, 0, KH), k1 = c.pt(c.p0, i + 1, 0, KH);
        const b0 = c.pt(pk, i, KB, KH), b1 = c.pt(pk, i + 1, KB, KH), g0 = c.pt(pg, i, GW, KH), g1 = c.pt(pg, i + 1, GW, KH);
        quad(c0, k0, k1, c1, RCOL.curb);                       // Bordstein-Kante
        quad(k0, b0, b1, k1, RCOL.curb2);                      // Bordstein oben
        quad(g0, g1, V(g1.x, g1.y - sk, g1.z), V(g0.x, g0.y - sk, g0.z), RCOL.skirt);   // Seitenwand außen
        const ua = uu(i), ub = uu(i + 1), vtx = (v, a, b) => { WP.push(v.x, v.y, v.z); WU.push(a, b); };
        vtx(b0, ua, 0); vtx(g0, ua, 1); vtx(b1, ub, 0); vtx(g0, ua, 1); vtx(g1, ub, 1); vtx(b1, ub, 0);
        J.walk.push([k0.x, k0.y, k0.z, g0.x, g0.y, g0.z, g1.x, g1.y, g1.z], [k0.x, k0.y, k0.z, g1.x, g1.y, g1.z, k1.x, k1.y, k1.z]);
      }
      const cap = (i) => quad(c.pt(c.p0, i, 0, 0.01), c.pt(pg, i, GW, -0.2), c.pt(pg, i, GW, KH), c.pt(c.p0, i, 0, KH), RCOL.curb);   // Stirnseite, wo der Gehweg endet
      if (!both) cap(c.swA ? i1 : i0);
      for (let i = i0; i <= i1; i++) { const g = c.pt(pg, i, GW, KH); o0.push([g.x, g.z, g.y, i]); }
    }
    // Asphalt-Rand ohne Gehweg: Seitenwand nach unten und Außenrand
    const edge = (a, b) => { for (let i = a; i < b; i++) { const p = c.pt(c.p0, i, 0, 0), q = c.pt(c.p0, i + 1, 0, 0); quad(p, V(p.x, p.y - sk, p.z), V(q.x, q.y - sk, q.z), q, RCOL.skirt); } };
    const eo = (a, b) => { const r = []; for (let i = a; i <= b; i++) { const p = c.pt(c.p0, i, 0, 0); r.push([p.x, p.z, p.y, i]); } return r; };
    let outer;
    if (!c.any) { edge(0, last); outer = eo(0, last); }
    else if (both) outer = o0;
    else if (c.swA) { edge(i1, last); outer = o0.concat(eo(i1, last)); }
    else { edge(0, i0); outer = eo(0, i0).concat(o0); }
    J.outer.push(outer);
  });
  // Außenrand als Polygon (für innen/außen) und Kantenliste ohne die Schnittlinien zu den Armen
  J.poly = []; J.segs = [];
  J.outer.forEach((o) => { o.forEach((p) => J.poly.push(p)); for (let i = 0; i + 1 < o.length; i++) J.segs.push([o[i][0], o[i][1], o[i][2], o[i + 1][0], o[i + 1][1], o[i + 1][2]]); });
  let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; J.poly.forEach((p) => { x0 = Math.min(x0, p[0]); z0 = Math.min(z0, p[1]); x1 = Math.max(x1, p[0]); z1 = Math.max(z1, p[1]); }); loop.forEach((p) => { x0 = Math.min(x0, p.x); z0 = Math.min(z0, p.z); x1 = Math.max(x1, p.x); z1 = Math.max(z1, p.z); });
  J.box = [x0, z0, x1, z1];
  // Schnittlinien der Arme (für carve: dahinter gilt die Straße)
  J.cuts = arms.map((A) => { const s = A.sec, n = ccw(A.u); return { x: s.p.x, z: s.p.z, u: A.u, n: n, half: Math.max(A.eC + (A.swC ? GW : 0), A.eW + (A.swW ? GW : 0)) }; });
  return J;
}

// ---------- Abfragen ----------
// Höhe der gezeichneten Asphaltfläche (Fächer) unter (x, z)
function fanH(J, x, z) { for (const t of J.tris) { const h = inTri(t, x, z, 0.02); if (h != null) return h; } return null; }
function inTri(t, x, z, tol) {
  const ax = t[0], az = t[2], bx = t[3], bz = t[5], cx = t[6], cz = t[8], d = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz); if (Math.abs(d) < 1e-12) return null;
  const l1 = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / d, l2 = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / d, l3 = 1 - l1 - l2;
  const e = -(tol || 2e-3); if (l1 < e || l2 < e || l3 < e) return null;
  return l1 * t[1] + l2 * t[4] + l3 * t[7];
}
function triN(t) { const n = new THREE.Vector3(t[3] - t[0], t[4] - t[1], t[5] - t[2]).cross(new THREE.Vector3(t[6] - t[0], t[7] - t[1], t[8] - t[2])).normalize(); if (n.y < 0) n.negate(); return n; }
function inPoly(P, x, z) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const a = P[i], b = P[j]; if ((a[1] > z) !== (b[1] > z) && x < (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
const inBox = (J, x, z, m) => x > J.box[0] - m && x < J.box[2] + m && z > J.box[1] - m && z < J.box[3] + m;
// Physik: { h, n, kind } oder null
export function jQuery(J, x, z) {
  if (!inBox(J, x, z, 0)) return null;
  for (const t of J.walk) { const h = inTri(t, x, z); if (h != null) return { h: h, n: triN(t), kind: "walk", dist: 0, d: 0, br: false }; }
  for (const t of J.tris) { const h = inTri(t, x, z); if (h != null) return { h: h, n: triN(t), kind: "road", dist: 0, d: 0, br: false }; }
  return null;
}
// Abstand zum Außenrand (negativ = drinnen) mit Oberkante des nächsten Randstücks
function edgeDist(J, x, z) {
  let bd = 1e9, top = J.yC;
  for (const s of J.segs) {
    const ex = s[3] - s[0], ez = s[4] - s[1], L2 = ex * ex + ez * ez || 1, u = Math.max(0, Math.min(1, ((x - s[0]) * ex + (z - s[1]) * ez) / L2)), d = Math.hypot(x - s[0] - ex * u, z - s[1] - ez * u);
    if (d < bd) { bd = d; top = lerp(s[2], s[5], u); }
  }
  return { d: bd, top: top };
}
export function jDist(J, x, z) { if (!inBox(J, x, z, 3)) return Infinity; if (inPoly(J.poly, x, z)) return -1; return edgeDist(J, x, z).d; }
// Gelände: drinnen 15 cm unter der Fläche, außen 2,5 m bündig mit der Kante, dann Böschung. Hinter den Schnittlinien gilt die Straße (null)
export function jCarve(J, x, z) {
  const M = 2.5 + J.fall; if (!inBox(J, x, z, M)) return null;
  for (const c of J.cuts) { const vx = x - c.x, vz = z - c.z; if (vx * c.u.x + vz * c.u.z > 0 && Math.abs(vx * c.n.x + vz * c.n.z) < c.half + M) return null; }
  if (inPoly(J.poly, x, z)) { const q = jQuery(J, x, z); return { h: (q ? q.h - (q.kind === "walk" ? KH : 0) : J.yC) - 0.15, w: 1, inside: true }; }
  const e = edgeDist(J, x, z); if (e.d > M) return null;
  return { h: e.top - 0.03, w: e.d <= 2.5 ? 1 : 1 - smooth((e.d - 2.5) / J.fall), inside: false };
}

// ---------- Alle Kreuzungen bauen (World.buildRoads) ----------
export function buildJunctions(roads, mesh, wmesh) {
  roads.forEach((r) => { r.jz = []; r.jEnd = [false, false]; });
  // Kreuzungen, deren Bereiche sich auf einer Straße überschneiden (z. B. versetzte Einmündungen), werden eine Kreuzung
  let nodes = findNodes(roads);
  const zones = (J) => J.arms.map((A) => [A.r, Math.min(A.pos, A.dc), Math.max(A.pos, A.dc)]);
  for (let it = 0; it < 4; it++) {
    const T = nodes.map((n) => { const J = buildOne(n, { P: [], Co: [], WP: [], WU: [] }); return J ? zones(J) : null; });
    let hit = false;
    for (let a = 0; a < nodes.length && !hit; a++) for (let b = a + 1; b < nodes.length && !hit; b++) {
      if (!T[a] || !T[b]) continue;
      if (T[a].some((x) => T[b].some((y) => x[0] === y[0] && x[1] < y[2] + 0.5 && y[1] < x[2] + 0.5))) { mergeNode(nodes[a], nodes[b], 30); nodes.splice(b, 1); hit = true; }
    }
    if (!hit) break;
  }
  const G = { P: [], Co: [], WP: [], WU: [] }, list = [];
  for (const n of nodes) {
    const J = buildOne(n, G); if (!J) continue; list.push(J);
    // Bereiche auf den Straßen, in denen die Straße selbst nicht gezeichnet wird, und Enden, die in der Kreuzung liegen
    J.arms.forEach((A) => {
      let a = Math.min(A.pos, A.dc), b = Math.max(A.pos, A.dc);
      if (!A.r.closed) { if (a <= 0.5) { a = 0; A.r.jEnd[0] = true; } if (b >= A.r.len - 0.5) { b = A.r.len; A.r.jEnd[1] = true; } }
      A.r.jz.push([a, b]);
    });
  }
  const g = mesh.geometry; g.setAttribute("position", new THREE.Float32BufferAttribute(G.P, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(G.Co, 3));
  if (g.attributes.normal) g.deleteAttribute("normal"); if (G.P.length) g.computeVertexNormals(); g.computeBoundingSphere(); mesh.visible = G.P.length > 0;
  const w = wmesh.geometry; w.clearGroups(); w.setAttribute("position", new THREE.Float32BufferAttribute(G.WP, 3)); w.setAttribute("uv", new THREE.Float32BufferAttribute(G.WU, 2));
  if (w.attributes.normal) w.deleteAttribute("normal"); if (G.WP.length) { w.addGroup(0, G.WP.length / 3, 1); w.computeVertexNormals(); } w.computeBoundingSphere(); wmesh.visible = G.WP.length > 0;
  return list;
}
export function junctionMeshes() {
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const m = new THREE.Mesh(new THREE.BufferGeometry(), mat); m.receiveShadow = true; m.userData.road = true;
  const w = new THREE.Mesh(new THREE.BufferGeometry(), typeof document !== "undefined" ? walkTex() : []); w.receiveShadow = true;
  return [m, w];
}
