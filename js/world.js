// Kartenobjekte: Speicherung, räumliche Suche, Rückgängig/Wiederholen, Speichern/Laden
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
    for (const [a, x, y, r, v] of (d && d.objects) || []) if (!known || known[a]) this._addRaw({ id: this.next, a, x, y, r, v });
    this._mute = false;
  }
}
