// Stadtkarte als Boden zeichnen (OSM-Vektoren in der 48°-Perspektive)
import { CFG } from './config.js';

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
