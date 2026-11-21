// IndexedDB (OSM-Cache + Karten) und Datei-Export/-Import
let dbp = null;
function db() {
  if (!dbp) dbp = new Promise((res, rej) => {
    const r = indexedDB.open('anarchy-frankfurt', 1);
    r.onupgradeneeded = () => { const d = r.result; for (const n of ['osm', 'maps']) if (!d.objectStoreNames.contains(n)) d.createObjectStore(n); };
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
