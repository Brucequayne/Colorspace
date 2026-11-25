// ===== faecher/boni.js · zeitlich begrenzte Fach-Boni (seit v0.19.4) =====
// Ein Eintrag: Fach-ID, Prozent extra auf die Belohnung, Ende (deutsche Zeit mit Zeitzone). Abgelaufene Einträge wirken nicht mehr
// und dürfen stehen bleiben oder gelöscht werden. Der Bonus kommt auf die Belohnung nach der Schwierigkeit, vor dem Fokus-Bonus.
export const BONI = [
  { fach: "chemie", pct: 50, bis: "2026-11-26T23:59:59+01:00" }
];
// aktiver Bonus für ein Fach (oder null); bei mehreren gilt der höchste
export function fachBonus(fachId, now) {
  const t = now == null ? Date.now() : now; let best = null;
  for (const b of BONI) { const end = Date.parse(b.bis); if (b.fach === fachId && t < end && (!best || b.pct > best.pct)) best = { pct: b.pct, end: end }; }
  return best;
}
// Restzeit als Text: „1 T 04:12:09“ bzw. „04:12:09“
export function restzeit(end, now) {
  let s = Math.max(0, Math.floor((end - (now == null ? Date.now() : now)) / 1000)); const d = Math.floor(s / 86400); s -= d * 86400;
  const p = (x) => String(x).padStart(2, "0"), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return (d ? d + " T " : "") + p(h) + ":" + p(m) + ":" + p(s % 60);
}
