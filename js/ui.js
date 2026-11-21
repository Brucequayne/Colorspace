// Oberfläche: Werkzeugleiste, Seitenleiste, Statuszeile
import { CFG } from './config.js';
import { ASSET_LIST, ASSETS, VEG } from './assets.js';
import { toLatLon, toWorld } from './geo.js';

const $ = id => document.getElementById(id);
const LAYER_NAMES = { roads: 'Straßen', foot: 'Fußwege', bld: 'Gebäude', rail: 'Schienen', green: 'Grünflächen', water: 'Wasser', zones: 'Flächennutzung' };

export class UI {
  constructor(app) { this.app = app; }
  init() {
    const app = this.app, t = app.tools;
    document.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => t.setMode(b.dataset.mode));
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

    // Pinsel
    const range = (id, get, set, fmt) => { const el = $(id), out = $(id + 'o'); el.value = get(); out.textContent = fmt(get()); el.oninput = () => { set(+el.value); out.textContent = fmt(+el.value); app.dirty(); }; };
    range('bR', () => t.brush.r, v => t.brush.r = v, v => v + ' m');
    range('bD', () => t.brush.d, v => t.brush.d = v, v => v + '/10');
    range('eR', () => t.eraser.r, v => t.eraser.r = v, v => v + ' m');
    $('eVeg').checked = t.eraser.vegOnly; $('eVeg').onchange = e => t.eraser.vegOnly = e.target.checked;
    for (const k of VEG) {
      const l = document.createElement('label'); l.className = 'check';
      l.innerHTML = `<input type="checkbox" ${t.brush.set[k] ? 'checked' : ''}> ${ASSETS[k].name}`;
      l.querySelector('input').onchange = e => { t.brush.set[k] = e.target.checked; };
      $('vegSet').appendChild(l);
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
  sync() {
    const t = this.app.tools;
    document.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('on', b.dataset.mode === t.mode));
    document.querySelectorAll('.asset').forEach(b => b.classList.toggle('on', t.mode === 'place' && b.dataset.key === t.asset));
    const sel = t.sel && this.app.world.objs.get(t.sel);
    $('rotLabel').textContent = ((sel ? sel.r : t.rot) * 15) + '°';
    const info = $('selInfo');
    if (sel) info.innerHTML = `Ausgewählt: <b>${ASSETS[sel.a].name}</b> · ${sel.r * 15}° · Variante ${sel.v + 1}/${ASSETS[sel.a].variants}<br>Q/E drehen · V Variante · Entf löschen`;
    else if (t.mode === 'place') info.innerHTML = `Platzieren: <b>${ASSETS[t.asset].name}</b> · ${t.rot * 15}° · ${t.randVar ? 'zufällige Variante' : 'Variante ' + (t.variant + 1)}`;
    else info.textContent = 'Asset anklicken, dann auf der Karte platzieren.';
    $('sObj').textContent = this.app.world.size.toLocaleString('de-DE') + ' Objekte';
  }
  status() {
    const app = this.app, c = app.tools.cursor;
    if (c) { const [la, lo] = toLatLon(c[0], c[1]); $('sPos').textContent = `${la.toFixed(5)}° N  ${lo.toFixed(5)}° O  (x ${Math.round(c[0])} m, y ${Math.round(c[1])} m)`; }
    const z = app.cam.zoom; $('sZoom').textContent = 'Zoom ' + (z >= 1 ? z + '×' : '1/' + Math.round(1 / z));
    $('sOsm').textContent = app.osm.status();
  }
}
