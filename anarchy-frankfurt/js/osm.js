// OpenStreetMap-Daten über Overpass laden, umwandeln, cachen und räumlich abfragen
import { CFG } from './camera.js';
import { toWorld, osmTileBBox, worldBBox, OSM_N } from './camera.js';
import { dbGet, dbSet, dbClear } from './world.js';

const CELL = 250;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const ROADW = { motorway: 16, trunk: 13, primary: 11, secondary: 9, tertiary: 8, motorway_link: 7, trunk_link: 7, primary_link: 7, secondary_link: 6, tertiary_link: 6, residential: 6.5, unclassified: 6, living_street: 5.5, service: 4, pedestrian: 6, road: 5 };
const ROADK = { motorway: 'hw', trunk: 'hw', motorway_link: 'hw', trunk_link: 'hw', primary: 'major', secondary: 'major', primary_link: 'major', secondary_link: 'major', tertiary: 'tert', tertiary_link: 'tert', service: 'svc', pedestrian: 'ped' };
const FOOT = { footway: 1.8, path: 1.6, cycleway: 2, steps: 1.8, bridleway: 2, corridor: 1.8, track: 3 };
const RIVER = { river: 20, canal: 12, stream: 2.5, ditch: 1.2, drain: 1.2 };
const has = (v, list) => list.includes(v);

export function classify(t, closed) {
  const tunnel = (t.tunnel && t.tunnel !== 'no') || t.location === 'underground';
  if (t.building && t.building !== 'no') return { k: 'bld', area: 1 };
  if (t.highway) {
    if (tunnel) return null;
    const h = t.highway;
    if (t.area === 'yes' && closed && has(h, ['pedestrian', 'footway', 'service'])) return { k: 'plaza', area: 1 };
    if (ROADW[h]) return { k: ROADK[h] || 'minor', w: ROADW[h] };
    if (FOOT[h]) return { k: h === 'track' ? 'track' : 'foot', w: FOOT[h] };
    return null;
  }
  if (t.railway) {
    if (tunnel) return null;
    if (t.railway === 'tram') return { k: 'tram', w: 1.5 };
    if (has(t.railway, ['rail', 'light_rail', 'narrow_gauge', 'subway'])) return { k: 'rail', w: 1.5 };
    if (t.railway === 'platform' && closed) return { k: 'plaza', area: 1 };
    return null;
  }
  if (t.natural === 'water' || t.waterway === 'riverbank' || has(t.landuse, ['reservoir', 'basin']) || t.leisure === 'swimming_pool') return { k: 'water', area: 1 };
  if (t.waterway) { if (tunnel || t.tunnel === 'culvert') return null; return RIVER[t.waterway] ? { k: 'river', w: RIVER[t.waterway] } : null; }
  if (t.landuse === 'forest' || t.natural === 'wood') return { k: 'forest', area: 1 };
  if (has(t.landuse, ['cemetery', 'allotments']) || t.amenity === 'grave_yard') return { k: 'green2', area: 1 };
  if (has(t.landuse, ['grass', 'meadow', 'village_green', 'recreation_ground', 'greenfield', 'flowerbed']) ||
      has(t.leisure, ['park', 'garden', 'playground', 'recreation_ground', 'common', 'golf_course', 'dog_park']) ||
      has(t.natural, ['scrub', 'grassland', 'heath'])) return { k: 'green', area: 1 };
  if (has(t.leisure, ['pitch', 'sports_centre', 'track', 'stadium'])) return { k: 'pitch', area: 1 };
  if (has(t.landuse, ['farmland', 'orchard', 'vineyard', 'farmyard', 'plant_nursery'])) return { k: 'farm', area: 1 };
  if (t.amenity === 'parking') return { k: 'park', area: 1 };
  if (has(t.landuse, ['industrial', 'railway', 'commercial', 'retail', 'construction', 'brownfield', 'garages'])) return { k: 'ind', area: 1 };
  if (t.landuse === 'residential') return { k: 'res', area: 1 };
  return null;
}

const same = (a, b) => Math.abs(a[0] - b[0]) < 0.01 && Math.abs(a[1] - b[1]) < 0.01;
// Multipolygon-Teilstücke zu Ringen zusammensetzen
export function assemble(parts) {
  const segs = parts.filter(s => s.length > 1).map(s => s.slice()), rings = [];
  while (segs.length) {
    let ring = segs.pop();
    for (let guard = 0; !same(ring[0], ring[ring.length - 1]) && guard < 5000; guard++) {
      let found = false;
      for (let i = 0; i < segs.length && !found; i++) {
        const s = segs[i], e = ring[ring.length - 1];
        if (same(s[0], e)) ring = ring.concat(s.slice(1));
        else if (same(s[s.length - 1], e)) ring = ring.concat(s.slice(0, -1).reverse());
        else if (same(s[s.length - 1], ring[0])) ring = s.concat(ring.slice(1));
        else if (same(s[0], ring[0])) ring = s.slice().reverse().concat(ring.slice(1));
        else continue;
        segs.splice(i, 1); found = true;
      }
      if (!found) break;
    }
    rings.push(ring);
  }
  return rings;
}

function feature(id, c, rings) {
  let a = 1e9, b = 1e9, d = -1e9, e = -1e9;
  for (const r of rings) for (let i = 0; i < r.length; i += 2) {
    a = Math.min(a, r[i]); d = Math.max(d, r[i]); b = Math.min(b, r[i + 1]); e = Math.max(e, r[i + 1]);
  }
  return { id, k: c.k, w: c.w || 0, a: c.area ? 1 : 0, r: rings, bb: [a, b, d, e] };
}

export function parse(js) {
  const out = [];
  for (const el of js.elements || []) {
    const t = el.tags || {};
    if (el.type === 'way' && el.geometry) {
      const g = el.geometry.filter(Boolean);
      if (g.length < 2) continue;
      const closed = el.nodes ? el.nodes[0] === el.nodes[el.nodes.length - 1] : (g[0].lat === g[g.length - 1].lat && g[0].lon === g[g.length - 1].lon);
      const c = classify(t, closed);
      if (!c || (c.area && !closed)) continue;
      out.push(feature('w' + el.id, c, [Float32Array.from(g.flatMap(p => toWorld(p.lat, p.lon)))]));
    } else if (el.type === 'relation' && el.members && t.type === 'multipolygon') {
      const c = classify(t, true);
      if (!c || !c.area) continue;
      const parts = el.members.filter(m => m.type === 'way' && m.geometry).map(m => m.geometry.filter(Boolean).map(p => toWorld(p.lat, p.lon)));
      const rings = assemble(parts).filter(r => r.length > 2);
      if (rings.length) out.push(feature('r' + el.id, c, rings.map(r => Float32Array.from(r.flat()))));
    }
  }
  return out;
}

function ql(key) {
  if (key === 'base') {
    const b = worldBBox();
    return `[out:json][timeout:180][maxsize:268435456][bbox:${b}];(
relation["type"="multipolygon"]["natural"~"^(water|wood|scrub|grassland)$"];
relation["type"="multipolygon"]["waterway"="riverbank"];
relation["type"="multipolygon"]["landuse"~"^(forest|reservoir|basin|grass|meadow|recreation_ground|cemetery|allotments|farmland)$"];
relation["type"="multipolygon"]["leisure"~"^(park|garden|golf_course)$"];
way["natural"~"^(water|wood)$"];way["waterway"~"^(river|canal|stream)$"];way["landuse"="forest"];way["leisure"="park"];
way["railway"~"^(rail|light_rail|tram)$"];
way["highway"~"^(motorway|trunk|primary|secondary|tertiary|motorway_link|trunk_link|primary_link)$"];
);out geom qt;`;
  }
  const [i, j] = key.split('_').map(Number), b = osmTileBBox(i, j);
  return `[out:json][timeout:120][bbox:${b}];(
way["highway"];way["building"];relation["building"]["type"="multipolygon"];
way["railway"];way["landuse"];way["natural"];way["waterway"];way["amenity"="parking"];
way["leisure"~"^(park|garden|playground|pitch|recreation_ground|sports_centre|track|stadium|common|golf_course|swimming_pool|dog_park)$"];
relation["type"="multipolygon"]["landuse"];relation["type"="multipolygon"]["leisure"];relation["type"="multipolygon"]["natural"];
);out geom qt;`;
}

export class OSM {
  constructor(onChange) {
    this.f = new Map(); this.grid = new Map(); this.state = new Map();
    this.queue = []; this.busy = false; this.onChange = onChange || (() => {});
    this.ep = 0; this.stamp = 0; this.err = ''; this.errAt = new Map(); this.all = false;
  }
  status() {
    const q = this.queue.length + (this.busy ? 1 : 0);
    const done = [...this.state].filter(([k, v]) => k !== 'base' && v === 'done').length;
    if (q) return `Stadtkarte lädt … ${done}/${OSM_N * OSM_N} km² fertig, ${q} offen`;
    return this.err || `Stadtkarte: ${this.f.size.toLocaleString('de-DE')} Objekte`;
  }
  init() { return this.ensure('base'); }
  async ensure(key) {
    const st = this.state.get(key);
    if (st === 'error' && Date.now() - (this.errAt.get(key) || 0) > 30000) this.state.delete(key); // Fehler nach 30 s erneut versuchen
    if (this.state.has(key)) return;
    this.state.set(key, 'check');
    let cached = null;
    try { cached = await dbGet('osm', key); } catch (e) { /* kein Cache */ }
    if (cached) { this.add(cached); this.state.set(key, 'done'); this.onChange(cached); return; }
    this.state.set(key, 'queued');
    const job = { key, tries: 0 };
    if (key === 'base') this.queue.unshift(job); else this.queue.push(job);
    this.run();
  }
  // Wunschliste (nah -> fern) laden und Warteschlange danach sortieren
  want(keys) {
    for (const k of keys) {
      const [i, j] = k.split('_').map(Number);
      if (i >= 0 && j >= 0 && i < OSM_N && j < OSM_N) this.ensure(k);
    }
    const pr = new Map(keys.map((k, n) => [k, n]));
    this.queue.sort((a, b) => (a.key === 'base' ? -1 : pr.has(a.key) ? pr.get(a.key) : 1e6) - (b.key === 'base' ? -1 : pr.has(b.key) ? pr.get(b.key) : 1e6));
  }
  async run() {
    if (this.busy) return;
    const job = this.queue.shift();
    if (!job) return;
    this.busy = true; this.onChange();
    try {
      const feats = parse(await this.fetch(ql(job.key)));
      try { await dbSet('osm', job.key, feats); } catch (e) { /* Speicher voll */ }
      this.add(feats); this.state.set(job.key, 'done'); this.err = '';
      this.onChange(feats);
      await sleep(400); // Overpass schonen
    } catch (e) {
      job.tries++;
      const busy = /429|504/.test(String(e && e.message));
      this.err = busy ? 'Stadtkarte: Server ausgelastet, warte kurz …' : 'Stadtkarte: Server nicht erreichbar, neuer Versuch …';
      if (job.tries < 5) { await sleep((busy ? 8000 : 2500) * job.tries); this.queue.push(job); }
      else { this.state.set(job.key, 'error'); this.errAt.set(job.key, Date.now()); this.err = 'Stadtkarte: Ein Bereich konnte nicht geladen werden (wird später erneut versucht)'; }
    }
    this.busy = false; this.onChange(); this.run();
  }
  async fetch(q) {
    let last;
    for (let k = 0; k < CFG.OVERPASS.length; k++) {
      const n = (this.ep + k) % CFG.OVERPASS.length;
      try {
        const r = await fetch(CFG.OVERPASS[n], { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'data=' + encodeURIComponent(q) });
        if (r.ok) { this.ep = n; return await r.json(); }
        last = new Error('HTTP ' + r.status);
      } catch (e) { last = e; }
    }
    throw last;
  }
  // ganze Karte im Hintergrund laden (von der Mitte nach außen), bleibt danach im Browser gespeichert
  loadAll(ci, cj) {
    const keys = [];
    for (let i = 0; i < OSM_N; i++) for (let j = 0; j < OSM_N; j++) keys.push([i, j]);
    keys.sort((a, b) => Math.hypot(a[0] - ci, a[1] - cj) - Math.hypot(b[0] - ci, b[1] - cj));
    this.all = true;
    for (const [i, j] of keys) this.ensure(i + '_' + j);
  }
  add(feats) {
    for (const f of feats) {
      if (this.f.has(f.id)) continue;
      this.f.set(f.id, f);
      const [a, b, c, d] = f.bb;
      for (let cx = Math.floor(a / CELL); cx <= Math.floor(c / CELL); cx++)
        for (let cy = Math.floor(b / CELL); cy <= Math.floor(d / CELL); cy++) {
          const k = cx + ',' + cy; let l = this.grid.get(k);
          if (!l) this.grid.set(k, l = []); l.push(f);
        }
    }
  }
  query(bb) {
    const st = ++this.stamp, out = [];
    for (let cx = Math.floor(bb[0] / CELL); cx <= Math.floor(bb[2] / CELL); cx++)
      for (let cy = Math.floor(bb[1] / CELL); cy <= Math.floor(bb[3] / CELL); cy++) {
        const l = this.grid.get(cx + ',' + cy); if (!l) continue;
        for (const f of l) {
          if (f._s === st) continue; f._s = st;
          if (f.bb[2] < bb[0] || f.bb[0] > bb[2] || f.bb[3] < bb[1] || f.bb[1] > bb[3]) continue;
          out.push(f);
        }
      }
    return out;
  }
  async clearCache() {
    try { await dbClear('osm'); } catch (e) { /* egal */ }
    this.f.clear(); this.grid.clear(); this.state.clear(); this.queue = []; this.err = '';
    this.onChange(); this.init();
  }
}

// ---------- Stadtkarte als Boden zeichnen (OSM-Vektoren in der 48°-Perspektive) ----------

export const COL = {
  bg: '#e3ddcf', res: '#ddd5c5', ind: '#d8d0d6', farm: '#e9e3bf', park: '#d3cec5', plaza: '#ece7dd',
  green: '#b8d49a', green2: '#a9c793', pitch: '#9fd09a', forest: '#88b874', water: '#86b6de',
  bld: '#c8ae96', bldLine: '#957c66', casing: '#9a9488', foot: '#d07462', track: '#a88a5c',
  rail: '#55575e', tram: '#7a568a', outside: '#3b4a33'
};
const ROADS = ['svc', 'minor', 'ped', 'tert', 'major', 'hw'];
const ROADFILL = { hw: '#eea766', major: '#f5d385', tert: '#faeaa4', minor: '#fdfcf7', svc: '#f4f2ea', ped: '#e8e1d3' };

export const LAYERS = { zones: true, green: true, water: true, roads: true, foot: true, rail: true, bld: true };

function path(ctx, f, close) {
  for (const r of f.r) {
    ctx.moveTo(r[0], r[1]);
    for (let i = 2; i < r.length; i += 2) ctx.lineTo(r[i], r[i + 1]);
    if (close) ctx.closePath();
  }
}

// M = Matrix Boden -> Ziel-Pixel, mpp = Meter pro Ziel-Pixel (für Mindestbreiten)
export function drawRef(ctx, osm, bb, M, mpp, L = LAYERS) {
  const H = CFG.WORLD_HALF;
  ctx.save();
  ctx.setTransform(M[0], M[1], M[2], M[3], M[4], M[5]);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const x0 = Math.max(bb[0], -H), y0 = Math.max(bb[1], -H), x1 = Math.min(bb[2], H), y1 = Math.min(bb[3], H);
  if (x1 <= x0 || y1 <= y0) { ctx.restore(); return; }
  ctx.fillStyle = COL.bg; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  ctx.beginPath(); ctx.rect(x0, y0, x1 - x0, y1 - y0); ctx.clip();

  const by = {};
  for (const f of osm.query(bb)) (by[f.k] || (by[f.k] = [])).push(f);
  const area = (k, fill, stroke, lw) => {
    const a = by[k]; if (!a) return;
    ctx.fillStyle = fill;
    ctx.beginPath();
    for (const f of a) if (f.r.length === 1) path(ctx, f, true);
    ctx.fill();
    for (const f of a) if (f.r.length > 1) { ctx.beginPath(); path(ctx, f, true); ctx.fill('evenodd'); }
    if (stroke) {
      ctx.strokeStyle = stroke; ctx.lineWidth = Math.max(lw, mpp * 0.8);
      ctx.beginPath(); for (const f of a) path(ctx, f, true); ctx.stroke();
    }
  };
  const lines = (k, col, extra, minPx, dash) => {
    const a = by[k]; if (!a) return;
    ctx.strokeStyle = col; ctx.setLineDash(dash || []);
    const groups = new Map();
    for (const f of a) { const w = Math.max(f.w + extra, minPx * mpp); (groups.get(w) || groups.set(w, []).get(w)).push(f); }
    for (const [w, fs] of groups) { ctx.lineWidth = w; ctx.beginPath(); for (const f of fs) path(ctx, f, false); ctx.stroke(); }
    ctx.setLineDash([]);
  };

  if (L.zones) { area('res', COL.res); area('ind', COL.ind); area('farm', COL.farm); area('park', COL.park); area('plaza', COL.plaza); }
  if (L.green) { area('green', COL.green); area('green2', COL.green2); area('pitch', COL.pitch); area('forest', COL.forest); }
  if (L.water) { lines('river', COL.water, 0, 1); area('water', COL.water); }
  if (L.foot && mpp < 1.6) { lines('track', COL.track, 0, 0.8, [2, 1.5]); lines('foot', COL.foot, -0.6, 0.8, [1.6, 1.2]); }
  if (L.roads) {
    const show = k => !(mpp > 4 && (k === 'svc' || k === 'minor' || k === 'ped'));
    for (const k of ROADS) if (show(k)) lines(k, COL.casing, 1.6, 2.2);
    for (const k of ROADS) if (show(k)) lines(k, ROADFILL[k], 0, 1.2);
  }
  if (L.rail) {
    lines('rail', COL.rail, 1.2, 1.6); lines('rail', '#f2f0ea', -0.4, 0.6, [4, 4]);
    lines('tram', COL.tram, 0, 1);
  }
  if (L.bld && mpp < 3) area('bld', COL.bld, mpp < 0.5 ? COL.bldLine : null, 0.25);
  ctx.restore();
}
