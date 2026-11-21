// Oberfläche: Werkzeugleiste, Seitenleiste, Statuszeile
import { CFG } from './camera.js';
import { ASSET_LIST, ASSETS } from './assets.js';
import { BRUSHES, brushThumb } from './veg.js';
import { PAL_MODES, ROOF_MODES, STYLES } from './blocks.js';
import { GROUNDS } from './paint.js';
import { toLatLon, toWorld, osmTileOf } from './camera.js';
import { PRESETS, layout } from './roads.js';

const $ = id => document.getElementById(id);
const LAYER_NAMES = { roads: 'Straßen', foot: 'Fußwege', bld: 'Gebäude', rail: 'Schienen', green: 'Grünflächen', water: 'Wasser', zones: 'Flächennutzung' };

export class UI {
  constructor(app) { this.app = app; }
  init() {
    const app = this.app, t = app.tools;
    document.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => t.setMode(b.dataset.mode));
    $('playBtn').onclick = e => { e.currentTarget.blur(); if (app.play.active) app.play.stop(); else app.play.start(); };
    $('rotL').onclick = () => t.rotate(-1); $('rotR').onclick = () => t.rotate(1);
    $('undo').onclick = () => app.undo(); $('redo').onclick = () => app.redo();
    $('panelToggle').onclick = () => $('panel').classList.toggle('open');

    // Assets mit Vorschaubildern
    const box = $('assets'); let cat = '', grid;
    for (const a of ASSET_LIST) {
      if (a.cat !== cat) { cat = a.cat; box.insertAdjacentHTML('beforeend', `<div class="cat">${cat}</div>`); grid = document.createElement('div'); grid.className = 'grid'; box.appendChild(grid); }
      const b = document.createElement('button'); b.className = 'asset'; b.dataset.key = a.key; b.title = a.name;
      b.appendChild(app.sprites.thumb(a.key, 52)); b.insertAdjacentHTML('beforeend', `<span>${a.name}</span>`);
      b.onclick = () => t.setAsset(a.key); grid.appendChild(b);
    }

    const range = (id, get, set, fmt) => { const el = $(id), out = $(id + 'o'); el.value = get(); out.textContent = fmt(get()); el.oninput = () => { set(+el.value); out.textContent = fmt(+el.value); app.dirty(); }; };
    // Bodenpinsel
    GROUNDS.forEach((g, i) => { if (!g) return; const b = document.createElement('button'); b.dataset.gc = i; b.innerHTML = `<i style="background:${g.sw}"></i>${g.name}`; b.onclick = () => { t.ground.code = i; t.ground.erase = false; $('gErase').checked = false; t.setMode('ground'); }; $('groundSet').appendChild(b); });
    range('gR', () => t.ground.r, v => t.ground.r = v, v => v.toLocaleString('de-DE') + ' m');
    $('gErase').onchange = e => { t.ground.erase = e.target.checked; t.setMode('ground'); };
    range('mA2', () => Math.round(app.mapAlpha * 100), v => { app.mapAlpha = v / 100; $('mA').value = v; $('mAo').textContent = v + ' %'; }, v => v + ' %');

    // Häuserblock
    $('kSty').innerHTML = Object.entries(STYLES).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join('');
    $('kPal').innerHTML = Object.entries(PAL_MODES).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join('');
    $('kRoof').innerHTML = Object.entries(ROOF_MODES).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join('');
    const kset = (key, val) => {
      const sel = t.selBlock && app.blocks.list.get(t.selBlock), p = { ...(sel ? sel.p : t.block.p), [key]: val };
      if (key === 'fmin' && p.fmax < val) p.fmax = val; if (key === 'fmax' && p.fmin > val) p.fmin = val;
      if (key === 'style') { const S = STYLES[val]; p.fmin = S.fmin; p.fmax = S.fmax; p.width = S.width; }
      if (sel) { clearTimeout(this._kt); this._kt = setTimeout(() => { const B = app.blocks; B.begin(); B.set(sel.id, { p }); B.commit(); sel.pPending = null; this.blockForm(); }, 120); sel.pPending = p; }
      else t.block.p = p;
      this.blockForm(p);
    };
    for (const [id, key, f] of [['kMin', 'fmin', v => v], ['kMax', 'fmax', v => v], ['kDen', 'dens', v => v / 100], ['kWid', 'width', v => v], ['kGat', 'gates', v => v]]) $(id).oninput = e => kset(key, f(+e.target.value));
    $('kSty').onchange = e => kset('style', e.target.value);
    $('kPal').onchange = e => kset('pal', e.target.value); $('kRoof').onchange = e => kset('roof', e.target.value);
    $('kSeed').onclick = () => { const sel = t.selBlock && app.blocks.list.get(t.selBlock); kset('seed', ((sel ? sel.p : t.block.p).seed || 1) + 1); };
    $('kDel').onclick = () => { if (t.selBlock) t.deleteSel(); };
    this.blockForm();

    // Straße
    const rp = () => t.road.p, rset = (k, v) => { t.road.p = { ...t.road.p, [k]: v }; this.roadInfo(); app.dirty(); };
    range('rW', () => rp().w, v => rset('w', v), v => v.toLocaleString('de-DE') + ' m');
    range('rS', () => rp().sw, v => rset('sw', v), v => v.toLocaleString('de-DE') + ' m');
    range('rL', () => rp().lanes, v => rset('lanes', v), v => String(v));
    for (const [id, k] of [['rOne', 'oneway'], ['rBike', 'bike'], ['rBus', 'bus'], ['rZeb', 'zebra']]) $(id).onchange = e => rset(k, e.target.checked);
    for (const [name, p] of PRESETS) { const b = document.createElement('button'); b.textContent = name; b.onclick = () => { t.road.p = { ...p }; this.roadForm(); t.setMode('road'); }; $('roadPresets').appendChild(b); }
    const R = app.roads, applyTo = ids => { R.begin(); R.setProfile(ids, t.road.p); R.commit(); };
    $('rApply').onclick = () => t.selRoad && applyTo([t.selRoad]);
    $('rApplyAll').onclick = () => t.selRoad && applyTo(R.chainOf(t.selRoad));
    $('rTake').onclick = () => { const s = t.selRoad && R.segs.get(t.selRoad); if (s) { t.road.p = { ...s.p }; this.roadForm(); } };
    $('rDel').onclick = () => t.deleteSel();
    this.roadForm();

    // Pinsel
    range('bR', () => t.brush.r, v => t.brush.r = v, v => v.toLocaleString('de-DE') + ' m');
    range('bD', () => t.brush.d, v => t.brush.d = v, v => v + '/10');
    range('eR', () => t.eraser.r, v => t.eraser.r = v, v => v + ' m');
    $('eVeg').checked = t.eraser.vegOnly; $('eVeg').onchange = e => t.eraser.vegOnly = e.target.checked;
    for (const b of BRUSHES) {
      const el = document.createElement('button'); el.className = 'asset vb'; el.dataset.vb = b.id; el.title = b.name;
      el.appendChild(brushThumb(b, ASSETS, app.sprites)); el.insertAdjacentHTML('beforeend', `<span>${b.name}</span>`);
      el.onclick = () => { t.brush.id = b.id; t.setMode('brush'); }; $('vegSet').appendChild(el);
    }

    // Raster
    for (let i = 0; i < 12; i++) $('gA').insertAdjacentHTML('beforeend', `<option value="${i}">${i * 15}°</option>`);
    $('gA').value = app.grid.angle; $('gS').value = app.grid.step; $('gSnap').checked = app.grid.snap; $('gShow').checked = app.grid.show;
    $('gA').onchange = e => { app.grid.angle = +e.target.value; const d = ASSETS[t.asset]; t.rot = Math.round(app.grid.angle / d.rot) * d.rot % 24; this.sync(); app.dirty(); };
    $('gS').onchange = e => { app.grid.step = +e.target.value; app.dirty(); };
    $('gSnap').onchange = e => { app.grid.snap = e.target.checked; };
    $('gShow').onchange = e => { app.grid.show = e.target.checked; app.dirty(); };

    // Stadtkarte
    range('mA', () => Math.round(app.mapAlpha * 100), v => app.mapAlpha = v / 100, v => v + ' %');
    for (const k of Object.keys(LAYER_NAMES)) {
      const l = document.createElement('label'); l.className = 'check';
      l.innerHTML = `<input type="checkbox" ${app.layers[k] ? 'checked' : ''}> ${LAYER_NAMES[k]}`;
      l.querySelector('input').onchange = e => { app.layers[k] = e.target.checked; app.tiles.clearGround(); app.dirty(); };
      $('layers').appendChild(l);
    }
    $('autoLoad').checked = app.autoLoad; $('autoLoad').onchange = e => { app.autoLoad = e.target.checked; app.loadVisible(); };
    $('loadView').onclick = () => app.loadVisible(true);
    $('loadAll').onclick = () => { const [i, j] = osmTileOf(app.cam.x, app.cam.y); app.osm.loadAll(i, j); };
    $('clearOsm').onclick = () => { if (confirm('Gespeicherte Stadtkarten-Daten löschen und neu laden?')) { app.osm.clearCache(); app.tiles.clearGround(); } };

    // Navigation
    $('goto').innerHTML = '<option value="">–</option>' + CFG.PLACES.map((p, i) => `<option value="${i}">${p[0]}</option>`).join('');
    $('goto').onchange = e => { const p = CFG.PLACES[+e.target.value]; if (p) app.goTo(toWorld(p[1], p[2]), 2); e.target.value = ''; };
    $('zIn').onclick = () => app.zoomStep(1); $('zOut').onclick = () => app.zoomStep(-1); $('zFit').onclick = () => app.goTo([0, 0], 1 / 32);

    // Speichern
    $('exp').onclick = () => app.exportMap(); $('imp').onclick = () => app.importMap();
    $('newMap').onclick = () => { if (confirm('Alle platzierten Objekte löschen?')) app.newMap(); };
    this.sync();
  }
  blockForm(pp) {
    const t = this.app.tools, sel = t.selBlock && this.app.blocks.list.get(t.selBlock), p = pp || (sel ? (sel.pPending || sel.p) : t.block.p);
    const set = (id, v, txt) => { $(id).value = v; $(id + 'o').textContent = txt; };
    set('kMin', p.fmin, String(p.fmin)); set('kMax', p.fmax, String(p.fmax)); set('kDen', Math.round(p.dens * 100), Math.round(p.dens * 100) + ' %'); set('kWid', p.width, p.width + ' m'); set('kGat', p.gates || 1, String(p.gates || 1)); $('kSty').value = p.style || 'altbau';
    $('kPal').value = p.pal; $('kRoof').value = p.roof;
    $('kDel').disabled = !sel;
    if (sel) { const g = this.app.blocks.gen(sel); $('kInfo').textContent = `Gewählter Block: ${g.parcels.length} Häuser, Haustiefe ${g.depth.toFixed(1)} m, ${g.parcels.filter(q => q.gate).length} Hofzugang/-zugänge`; }
    else $('kInfo').textContent = 'Kein Block gewählt – Regler gelten für den nächsten Block.';
  }
  roadForm() {
    const p = this.app.tools.road.p, set = (id, v, txt) => { $(id).value = v; $(id + 'o').textContent = txt; };
    set('rW', p.w, p.w.toLocaleString('de-DE') + ' m'); set('rS', p.sw, p.sw.toLocaleString('de-DE') + ' m'); set('rL', p.lanes, String(p.lanes));
    $('rOne').checked = p.oneway; $('rBike').checked = p.bike; $('rBus').checked = p.bus; $('rZeb').checked = p.zebra;
    this.roadInfo();
  }
  roadInfo() {
    const L = layout(this.app.tools.road.p), f = v => v.toLocaleString('de-DE', { maximumFractionDigits: 2 });
    $('rInfo').innerHTML = `Fahrbahn ${f(L.cw)} m · Fahrspur je <b style="color:${L.ok ? 'var(--accent2)' : 'var(--accent)'}">${f(L.carW)} m</b>` + (L.ok ? '' : '<br><span style="color:var(--accent)">Zu schmal – Gesamtbreite erhöhen oder weniger Spuren.</span>');
  }
  sync() {
    const t = this.app.tools;
    if (this._lastSelBlock !== t.selBlock) { this._lastSelBlock = t.selBlock; const sb = t.selBlock && this.app.blocks.list.get(t.selBlock); if (sb) sb.pPending = null; this.blockForm(); }
    const rs = t.selRoad && this.app.roads.segs.get(t.selRoad);
    $('rSel').innerHTML = rs ? `Ausgewählte Straße: ${rs.p.w.toLocaleString('de-DE')} m, ${rs.p.lanes} Spur${rs.p.lanes > 1 ? 'en' : ''}${rs.p.oneway ? ', Einbahn' : ''}${rs.p.bike ? ', Rad' : ''}${rs.p.bus ? ', Bus' : ''} · ${rs.g.L.toFixed(1)} m lang` : 'Straße mit „Auswahl“ anklicken, um sie zu bearbeiten.';
    $('rSelBtns').style.display = rs ? 'flex' : 'none';
    document.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('on', b.dataset.mode === t.mode));
    document.querySelectorAll('.asset[data-key]').forEach(b => b.classList.toggle('on', t.mode === 'place' && b.dataset.key === t.asset));
    document.querySelectorAll('[data-gc]').forEach(b => b.classList.toggle('on', t.mode === 'ground' && +b.dataset.gc === t.ground.code && !t.ground.erase));
    document.querySelectorAll('.asset[data-vb]').forEach(b => b.classList.toggle('on', t.mode === 'brush' && b.dataset.vb === t.brush.id));
    const sel = t.sel && this.app.world.objs.get(t.sel);
    $('rotLabel').textContent = ((sel ? sel.r : t.rot) * 15) + '°';
    const info = $('selInfo');
    if (sel) info.innerHTML = `Ausgewählt: <b>${ASSETS[sel.a].name}</b> · ${sel.r * 15}° · Variante ${sel.v + 1}/${ASSETS[sel.a].variants}<br>Q/E drehen · V Variante · Entf löschen`;
    else if (t.mode === 'place') info.innerHTML = `Platzieren: <b>${ASSETS[t.asset].name}</b> · ${t.rot * 15}° · ${t.randVar ? 'zufällige Variante' : 'Variante ' + (t.variant + 1)}`;
    else info.textContent = 'Asset anklicken, dann auf der Karte platzieren.';
    $('sObj').textContent = this.app.world.size.toLocaleString('de-DE') + ' Objekte · ' + this.app.veg.size.toLocaleString('de-DE') + ' Pflanzen';
  }
  status() {
    const app = this.app, c = app.tools.cursor;
    if (c) { const [la, lo] = toLatLon(c[0], c[1]); $('sPos').textContent = `${la.toFixed(5)}° N  ${lo.toFixed(5)}° O  (x ${Math.round(c[0])} m, y ${Math.round(c[1])} m)`; }
    const z = app.cam.zoom; $('sZoom').textContent = 'Zoom ' + (z >= 1 ? z + '×' : '1/' + Math.round(1 / z));
    $('sOsm').textContent = app.osm.status();
  }
}
