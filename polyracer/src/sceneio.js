// ===== sceneio.js · Szenen als .txt exportieren/importieren, automatisch speichern =====
// Format: eine Textdatei mit JSON (Gelände, Straße, Vegetation, Umgebung). Noah exportiert z. B. "PolyRacer_Strecke_1.txt",
// die Datei kommt nach polyracer/strecken/ und wird dort vom Spiel geladen.
import { KEYS, store } from "pr/core.js";

export function sceneText(world) { return JSON.stringify(world.toJSON()); }
export function loadText(world, txt) {
  let o; try { o = JSON.parse(txt); } catch (e) { return false; }
  return world.fromJSON(o);
}
export function download(world, name) {
  const fn = (name || world.name || "Strecke").replace(/[^\wäöüÄÖÜß\- ]+/g, "").replace(/\s+/g, "_");
  const blob = new Blob([sceneText(world)], { type: "text/plain" }), url = URL.createObjectURL(blob), a = document.createElement("a");
  a.href = url; a.download = "PolyRacer_" + fn + ".txt"; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 15000);
  return a.download;
}
let tmr = 0;
export function autosave(world, now) {
  clearTimeout(tmr);
  const go = () => store.setRaw(KEYS.scene, sceneText(world));
  if (now) return go();
  tmr = setTimeout(go, 1200);
}
export function loadSaved(world) { const s = store.raw(KEYS.scene); return s ? loadText(world, s) : false; }
// Strecke aus dem Repo laden (polyracer/strecken/<datei>)
export function fetchTrack(world, file, stamp) {
  return fetch("polyracer/strecken/" + file + (stamp ? "?v=" + stamp : "")).then((r) => { if (!r.ok) throw new Error(r.status); return r.text(); }).then((t) => loadText(world, t));
}
