// Kartenobjekte: Speicherung, räumliche Suche, Rückgängig/Wiederholen, Speichern/Laden, Browser-Speicher
const C = 16;
const ck = (x, y) => Math.floor(x / C) + ',' + Math.floor(y / C);

export class World {
  constructor() { this.objs = new Map(); this.cells = new Map(); this.next = 1; this.ls = new Set(); this.U = []; this.R = []; this.tx = null; this._replay = false; }
  on(fn) { this.ls.add(fn); }
  emit(o) { if (!this._mute) for (const f of this.ls) f(o); }
  _ins(o) { const k = ck(o.x, o.y); let c = this.cells.get(k); if (!c) this.cells.set(k, c = new Set()); c.add(o); }
  _rem(o) { const k = ck(o.x, o.y), c = this.cells.get(k); if (c) { c.delete(o); if (!c.size) this.cells.delete(k); } }
  get size() { return this.objs.size; }

  add(d) { const o = { id: this.next++, a: d.a, x: d.x, y: d.y, r: d.r || 0, v: d.v || 0 }; this._addRaw(o); this.log({ t: 'add', o: { ...o } }); return o; }
  del(id) { const o = this.objs.get(id); if (!o) return; this.log({ t: 'del', o: { ...o } }); this._delRaw(id); }
  set(id, p) { const o = this.objs.get(id); if (!o) return; const b = { ...o }; this._setRaw({ ...o, ...p }); this.log({ t: 'mod', b, a: { ...this.objs.get(id) } }); }
  // Verschieben während Ziehen ohne Undo-Eintrag; danach logMod()
  move(id, p) { const o = this.objs.get(id); if (o) this._setRaw({ ...o, ...p }); }
  logMod(b) { const o = this.objs.get(b.id); if (o && (o.x !== b.x || o.y !== b.y || o.r !== b.r)) this.log({ t: 'mod', b, a: { ...o } }); }

  _addRaw(o) { const n = { ...o }; this.objs.set(n.id, n); this._ins(n); this.next = Math.max(this.next, n.id + 1); this.emit(n); }
  _delRaw(id) { const o = this.objs.get(id); if (!o) return; this._rem(o); this.objs.delete(id); this.emit(o); }
  _setRaw(s) { const o = this.objs.get(s.id); if (!o) return; this.emit(o); this._rem(o); Object.assign(o, s); this._ins(o); this.emit(o); }

  begin() { this.tx = []; }
  commit() { if (this.tx && this.tx.length) { this.U.push(this.tx); if (this.U.length > 300) this.U.shift(); this.R = []; this.onLog && this.onLog(); } this.tx = null; }
  log(e) { if (this._replay) return; if (this.tx) this.tx.push(e); else { this.U.push([e]); this.R = []; this.onLog && this.onLog(); } }
  undo() { const tx = this.U.pop(); if (!tx) return false; this._replay = true; for (const e of tx.slice().reverse()) { if (e.t === 'add') this._delRaw(e.o.id); else if (e.t === 'del') this._addRaw(e.o); else this._setRaw(e.b); } this._replay = false; this.R.push(tx); return true; }
  redo() { const tx = this.R.pop(); if (!tx) return false; this._replay = true; for (const e of tx) { if (e.t === 'add') this._addRaw(e.o); else if (e.t === 'del') this._delRaw(e.o.id); else this._setRaw(e.a); } this._replay = false; this.U.push(tx); return true; }

  query(x0, y0, x1, y1) {
    const out = [];
    for (let cx = Math.floor(x0 / C); cx <= Math.floor(x1 / C); cx++)
      for (let cy = Math.floor(y0 / C); cy <= Math.floor(y1 / C); cy++) {
        const c = this.cells.get(cx + ',' + cy); if (c) for (const o of c) out.push(o);
      }
    return out;
  }
  near(x, y, r) { return this.query(x - r, y - r, x + r, y + r).filter(o => Math.hypot(o.x - x, o.y - y) <= r); }

  serialize() { return { game: 'anarchy-frankfurt', format: 1, objects: [...this.objs.values()].map(o => [o.a, Math.round(o.x * 100) / 100, Math.round(o.y * 100) / 100, o.r, o.v]) }; }
  load(d, known) {
    this._mute = true;
    this.objs.clear(); this.cells.clear(); this.next = 1; this.U = []; this.R = [];
    const k = d && d.format >= 6 ? 1 : 3; // ab Format 6 Drehung in 5°-Schritten (vorher 15°)
    for (const [a, x, y, r, v] of (d && d.objects) || []) if (!known || known[a]) this._addRaw({ id: this.next, a, x, y, r: r * k, v });
    this._mute = false;
  }
}

// ---------- Begehbare Türen ----------
// Nur hier markierte Türen führen später in einen Innenraum. Häuser der Blöcke sind sonst nur Bild + Kollision.
export class Doors {
  constructor() { this.list = []; this.U = []; this.R = []; this.onLog = null; this.onChange = null; }
  get size() { return this.list.length; }
  near(x, y, r) { return this.list.filter(d => Math.hypot(d.x - x, d.y - y) <= r); }
  at(x, y, r = 1.2) { let best = null, bd = r; for (const d of this.list) { const k = Math.hypot(d.x - x, d.y - y); if (k < bd) { bd = k; best = d; } } return best; }
  _snap() { return JSON.stringify(this.list); }
  _do(fn) { const b = this._snap(); fn(); this.U.push(b); if (this.U.length > 200) this.U.shift(); this.R = []; this.onLog && this.onLog(); this.onChange && this.onChange(); }
  // Tür markieren oder (wenn schon markiert) wieder entfernen
  toggle(c) { const ex = this.at(c.x, c.y, 0.6); this._do(() => { if (ex) this.list.splice(this.list.indexOf(ex), 1); else this.list.push({ x: Math.round(c.x * 100) / 100, y: Math.round(c.y * 100) / 100, F: c.F, style: c.style, w: Math.round(c.w * 10) / 10, d: Math.round(c.d * 10) / 10 }); }); return !ex; }
  undo() { const s = this.U.pop(); if (!s) return false; this.R.push(this._snap()); this.list = JSON.parse(s); this.onChange && this.onChange(); return true; }
  redo() { const s = this.R.pop(); if (!s) return false; this.U.push(this._snap()); this.list = JSON.parse(s); this.onChange && this.onChange(); return true; }
  serialize() { return this.list.map(d => [d.x, d.y, d.F, d.style, d.w, d.d]); }
  load(a) { this.list = (Array.isArray(a) ? a : []).map(([x, y, F, style, w, d]) => ({ x, y, F, style, w, d })); this.U = []; this.R = []; this.onChange && this.onChange(); }
}

// ---------- IndexedDB (OSM-Cache + Karten) und Datei-Export/-Import ----------
let dbp = null;
function db() {
  if (!dbp) dbp = new Promise((res, rej) => {
    const r = indexedDB.open('anarchy-frankfurt', 2);
    r.onupgradeneeded = () => { const d = r.result; for (const n of ['osm', 'maps', 'bake']) if (!d.objectStoreNames.contains(n)) d.createObjectStore(n); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
  return dbp;
}
function req(store, mode, fn) {
  return db().then(d => new Promise((res, rej) => {
    const q = fn(d.transaction(store, mode).objectStore(store));
    q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error);
  }));
}
export const dbGet = (s, k) => req(s, 'readonly', o => o.get(k));
export const dbSet = (s, k, v) => req(s, 'readwrite', o => o.put(v, k));
export const dbCount = s => req(s, 'readonly', o => o.count());
export const dbClear = s => req(s, 'readwrite', o => o.clear());

export function downloadJSON(obj, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(obj)], { type: 'application/json' }));
  a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 3000);
}
export function pickFile(accept) {
  return new Promise(res => {
    const i = document.createElement('input'); i.type = 'file'; i.accept = accept;
    i.onchange = () => res(i.files[0] || null); i.click();
  });
}
