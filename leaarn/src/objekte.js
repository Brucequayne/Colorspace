// ===== objekte.js · Objekte auf der Map (seit v0.19): Straßenlaternen und später weitere Assets =====
// Ein Asset in OBJEKTE: n = Name, col = Kollisionsradius (m, 0 = keine), build() = THREE.Group (vorne = +z).
// Später kommen auch FBX-Modelle von Noah dazu (three/addons/loaders/FBXLoader.js liegt in polyracer/lib/addons/):
// dann build() durch ein geladenes, skaliertes und eingefärbtes Modell ersetzen.
// Map-Eintrag: { k: Asset, x, z, y (Bodenhöhe), a (Drehung in Grad) } – gespeichert in der Map (leaarn-scene-v1 → objs).
import * as THREE from "three";
import { L2, tl } from "le/core.js";
import { part, merge, M } from "le/models.js";

const MAT = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
const LIGHT = new THREE.MeshBasicMaterial({ color: 0xFFE6A8 });   // Leuchtfläche (unbeleuchtet hell)

export const OBJEKTE = {
  laterne: {
    n: L2("Straßenlaterne", "Street lamp"), col: 0.16,
    // Mast 5,6 m mit Ausleger nach vorne (+z, zur Straße), Leuchte mit heller Unterseite
    build() {
      const C = "#3A3F44", C2 = "#4A5055", g = new THREE.Group();
      const body = merge([
        part(new THREE.CylinderGeometry(0.2, 0.24, 0.45, 8), C, M(0, 0.225, 0, 1)),
        part(new THREE.CylinderGeometry(0.06, 0.085, 5.4, 8), C2, M(0, 2.9, 0, 1)),
        part(new THREE.CylinderGeometry(0.09, 0.09, 0.22, 8), C, M(0, 1.1, 0, 1)),
        part(new THREE.BoxGeometry(0.07, 0.07, 1.45), C2, M(0, 5.62, 0.68, 1)),
        part(new THREE.BoxGeometry(0.05, 0.05, 0.75), C2, new THREE.Matrix4().makeTranslation(0, 5.35, 0.3).multiply(new THREE.Matrix4().makeRotationX(-0.75))),
        part(new THREE.BoxGeometry(0.34, 0.12, 0.62), C, M(0, 5.6, 1.45, 1)),
        part(new THREE.BoxGeometry(0.3, 0.04, 0.56), C2, M(0, 5.67, 1.45, 1))
      ]);
      const m = new THREE.Mesh(body, MAT); m.castShadow = true; m.receiveShadow = true; g.add(m);
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.02, 0.5), LIGHT); l.position.set(0, 5.535, 1.45); g.add(l);
      return g;
    }
  }
};
export const objName = (k) => (OBJEKTE[k] ? tl(OBJEKTE[k].n) : k);

export class Objekte {
  constructor(world) { this.world = world; this.group = new THREE.Group(); this.list = []; }
  // Objekt in die Welt setzen (e = Map-Eintrag), gibt { e, root } zurück
  add(e) {
    const A = OBJEKTE[e.k]; if (!A) return null;
    const o = { e: e, root: A.build() }; this.place(o); this.group.add(o.root); this.list.push(o); return o;
  }
  place(o) { const e = o.e; o.root.position.set(e.x, e.y, e.z); o.root.rotation.y = (e.a || 0) * Math.PI / 180; o.root.updateMatrixWorld(true); }
  remove(o) { const i = this.list.indexOf(o); if (i < 0) return; this.list.splice(i, 1); this.group.remove(o.root); o.root.traverse((m) => { if (m.geometry) m.geometry.dispose(); }); }
  clear() { this.list.slice().forEach((o) => this.remove(o)); }
  at(x, z, r) { let best = null, bd = r || 1; for (const o of this.list) { const d = Math.hypot(o.e.x - x, o.e.z - z); if (d < bd) { bd = d; best = o; } } return best; }
  // Kollision: Kreise (x, z, Radius) in der Nähe
  near(x, z, R, cb) { for (const o of this.list) { const c = (OBJEKTE[o.e.k] || {}).col; if (!c) continue; if (Math.abs(o.e.x - x) < R && Math.abs(o.e.z - z) < R) cb(o.e.x, o.e.z, c); } }
  // Bodenhöhe eines Objekts: Straße/Gehweg, sonst Gelände
  groundY(x, z) { return this.world.ground(x, z, {}).h; }
  // Drehung, damit der Ausleger zur nächsten Straße zeigt (null = keine Straße in der Nähe)
  faceRoad(x, z, R) {
    let best = null, bd = R || 9;
    for (const r of this.world.roads) { if (r.S.length < 2) continue; const q = r.nearest(x, z); if (!q) continue; const d = Math.abs(q.d); if (d < bd) { bd = d; best = q; } }
    return best ? Math.atan2(best.cx - x, best.cz - z) * 180 / Math.PI : null;
  }
  toJSON() { return this.list.map((o) => ({ k: o.e.k, x: Math.round(o.e.x * 100) / 100, z: Math.round(o.e.z * 100) / 100, y: Math.round(o.e.y * 100) / 100, a: Math.round((o.e.a || 0) * 10) / 10 })); }
  fromJSON(a) { this.clear(); (Array.isArray(a) ? a : []).forEach((e) => { if (OBJEKTE[e.k]) this.add(Object.assign({}, e)); }); }
}
