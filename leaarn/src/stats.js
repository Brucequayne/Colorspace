// ===== stats.js · Statistiken im Laptop (seit v0.14) =====
// Grundlage: save.log = [{ t: Zeitpunkt (ms), f: Fach, th: Thema, s: Sekunden gelernt, e: Euro }] – ein Eintrag je fertiger Runde.
// Runden je Fach zählen zusätzlich die älteren Runden aus save.lern (vor v0.14 gab es noch keine Zeiten).
import { t, addTexts, L2, tl, esc, PR } from "le/core.js";
import { save, euro } from "le/save.js";
import { FAECHER } from "le/faecher/index.js";

addTexts({
  sTitle: L2("Statistiken", "Statistics"), sWeek: L2("Woche", "Week"), sMonth: L2("Monat", "Month"), sTime: L2("Zeit gelernt", "Time learned"), sMoney: L2("Geld verdient", "Money earned"),
  sRounds: L2("Runden je Fach", "Rounds per subject"), sTop: L2("Am meisten gelernt", "Learned most"), sNone: L2("Noch keine Lernzeit – spiel eine Runde, dann erscheint hier deine Statistik.", "No learning time yet – play a round and your statistics appear here."),
  sNoRounds: L2("Noch keine Runden gespielt.", "No rounds played yet."), sTotalT: L2("Lernzeit gesamt", "Total learning time"), sTotalE: L2("Verdient gesamt", "Total earned"), sTotalR: L2("Runden gesamt", "Total rounds"),
  sKW: L2("KW", "Week"), sMin: L2("Min.", "min"), sStd: L2("Std.", "h"), sPrev: L2("früher", "earlier"), sNext: L2("später", "later")
});
const WD = { de: ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"], en: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] };
const MO = { de: ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"], en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] };
const day0 = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const dkey = (d) => d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate();
export const hm = (sec) => { const m = Math.round(sec / 60); return Math.floor(m / 60) + ":" + ("0" + (m % 60)).slice(-2); };
function kw(d) { const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())), n = x.getUTCDay() || 7; x.setUTCDate(x.getUTCDate() + 4 - n); const y0 = new Date(Date.UTC(x.getUTCFullYear(), 0, 1)); return Math.ceil(((x - y0) / 864e5 + 1) / 7); }

export class Stats {
  constructor() { this.mode = "week"; this.off = 0; }
  // Tage des gewählten Zeitraums (echtes Datum): Woche Mo–So oder Kalendermonat; off = wie viele Zeiträume zurück
  days() {
    const now = day0(new Date()), out = [];
    if (this.mode === "week") { const mo = new Date(now); mo.setDate(now.getDate() - ((now.getDay() + 6) % 7) + this.off * 7); for (let i = 0; i < 7; i++) { const d = new Date(mo); d.setDate(mo.getDate() + i); out.push(d); } }
    else { const m = new Date(now.getFullYear(), now.getMonth() + this.off, 1); for (let d = new Date(m); d.getMonth() === m.getMonth(); d.setDate(d.getDate() + 1)) out.push(new Date(d)); }
    return out;
  }
  title(ds) {
    const L = PR.lang === "en" ? "en" : "de", a = ds[0], b = ds[ds.length - 1], f = (d) => d.getDate() + "." + (d.getMonth() + 1) + ".";
    return this.mode === "week" ? t("sKW") + " " + kw(a) + " · " + f(a) + "–" + f(b) + b.getFullYear() : MO[L][a.getMonth()] + " " + a.getFullYear();
  }
  html() {
    const S = save(), log = S.log || [], L = PR.lang === "en" ? "en" : "de";
    let h = '<div class="le-stats"><div class="le-lhead"><h2>' + t("sTitle") + '</h2><span class="le-sp"></span>' +
      '<div class="le-seg"><button data-st="week" aria-pressed="' + (this.mode === "week") + '">' + t("sWeek") + '</button><button data-st="month" aria-pressed="' + (this.mode === "month") + '">' + t("sMonth") + "</button></div></div>";
    // Kennzahlen
    const totS = log.reduce((a, x) => a + (x.s || 0), 0), totE = log.reduce((a, x) => a + (x.e || 0), 0), totR = Object.keys(S.lern || {}).reduce((a, k) => a + (S.lern[k].n || 0), 0);
    const perF = {}; log.forEach((x) => { perF[x.f] = (perF[x.f] || 0) + (x.s || 0); });
    const top = Object.keys(perF).sort((a, b) => perF[b] - perF[a])[0], tf = top && FAECHER.find((f) => f.id === top);
    h += '<div class="le-kpis"><div class="le-kpi le-kpitop">' + (tf ? "<small>" + t("sTop") + '</small><b><i style="background:' + tf.farbe + '">' + esc(tf.kurz) + "</i>" + esc(tl(tf.name)) + "</b><span>" + hm(perF[top]) + " " + t("sStd") + "</span>" : "<small>" + t("sTop") + "</small><b>–</b><span>0:00 " + t("sStd") + "</span>") + "</div>" +
      '<div class="le-kpi"><small>' + t("sTotalT") + "</small><b>" + hm(totS) + "</b><span>" + t("sStd") + '</span></div><div class="le-kpi"><small>' + t("sTotalE") + "</small><b>" + euro(totE) + '</b><span>&nbsp;</span></div><div class="le-kpi"><small>' + t("sTotalR") + "</small><b>" + totR + "</b><span>&nbsp;</span></div></div>";
    // Zeitraum
    const ds = this.days(), idx = {}; ds.forEach((d, i) => { idx[dkey(d)] = i; });
    const tm = ds.map(() => 0), mn = ds.map(() => 0);
    log.forEach((x) => { const i = idx[dkey(new Date(x.t))]; if (i != null) { tm[i] += (x.s || 0) / 60; mn[i] += x.e || 0; } });
    const lab = ds.map((d, i) => this.mode === "week" ? WD[L][i] + " " + d.getDate() + "." : (d.getDate() === 1 || d.getDate() % 5 === 0 ? String(d.getDate()) : ""));
    const tip = ds.map((d) => WD[L][(d.getDay() + 6) % 7] + " " + d.getDate() + "." + (d.getMonth() + 1) + ".");
    h += '<div class="le-per"><button data-st="prev" title="' + t("sPrev") + '">‹</button><b>' + this.title(ds) + '</b><button data-st="next"' + (this.off >= 0 ? " disabled" : "") + ' title="' + t("sNext") + '">›</button></div>';
    h += '<div class="le-charts"><div class="le-chart"><h4>' + t("sTime") + " <small>(" + t("sMin") + ")</small></h4>" + bars(tm, lab, tip.map((s, i) => s + " · " + Math.round(tm[i]) + " " + t("sMin")), "#62929E", (v) => Math.round(v)) + "</div>" +
      '<div class="le-chart"><h4>' + t("sMoney") + " <small>(€)</small></h4>" + bars(mn, lab, tip.map((s, i) => s + " · " + euro(mn[i])), "#ED6A5E", (v) => Math.round(v)) + "</div></div>";
    // Runden je Fach (waagrechte Balken)
    const rc = {}; Object.keys(S.lern || {}).forEach((k) => { const f = k.split("/")[0]; rc[f] = (rc[f] || 0) + (S.lern[k].n || 0); });
    const rows = FAECHER.filter((f) => rc[f.id]).sort((a, b) => rc[b.id] - rc[a.id]), mx = Math.max(1, ...rows.map((f) => rc[f.id]));
    h += '<div class="le-chart"><h4>' + t("sRounds") + "</h4>" + (rows.length ? '<div class="le-hbars">' + rows.map((f) => '<div class="le-hb" data-tip="' + esc(tl(f.name)) + ": " + rc[f.id] + '"><span><i style="background:' + f.farbe + '"></i>' + esc(tl(f.name)) + '</span><div><em style="width:' + (rc[f.id] / mx * 100) + '%"></em></div><b>' + rc[f.id] + "</b></div>").join("") + "</div>" : '<p class="le-dim">' + t("sNoRounds") + "</p>") + "</div>";
    if (!log.length) h += '<p class="le-dim">' + t("sNone") + "</p>";
    return h + '<div class="le-tip" id="le-tip"></div></div>';
  }
  // Knöpfe (Woche/Monat, vor/zurück) und Hover-Tooltip; gibt true zurück, wenn neu gezeichnet werden soll
  click(b) {
    const a = b.getAttribute("data-st");
    if (a === "week" || a === "month") { if (this.mode !== a) { this.mode = a; this.off = 0; } }
    else if (a === "prev") this.off--; else if (a === "next") this.off = Math.min(0, this.off + 1);
    return true;
  }
  bind(root) {
    const tip = root.querySelector("#le-tip"), box = root.querySelector(".le-stats"); if (!tip || !box) return;
    box.addEventListener("pointermove", (e) => {
      const g = e.target.closest("[data-tip]"); if (!g) { tip.style.display = "none"; return; }
      const r = box.getBoundingClientRect(); tip.textContent = g.getAttribute("data-tip"); tip.style.display = "block";
      tip.style.left = Math.min(r.width - tip.offsetWidth - 4, e.clientX - r.left + 12) + "px"; tip.style.top = (e.clientY - r.top + box.scrollTop - 30) + "px";
    });
    box.addEventListener("pointerleave", () => { tip.style.display = "none"; });
  }
}
// Säulendiagramm als SVG: eine Reihe, eine Farbe, dezentes Raster, Wert-Beschriftung nur am Maximum, Hover über die ganze Spalte
function bars(v, lab, tips, col, fmtv) {
  const W = 640, H = 130, pl = 34, pb = 20, pt = 8, n = v.length, mx = nice(Math.max(...v, 1)), cw = (W - pl) / n, bw = Math.max(2, Math.min(34, cw - 2));
  let s = '<svg class="le-svg" viewBox="0 0 ' + W + " " + H + '" role="img">';
  [0, 0.5, 1].forEach((k) => { const y = pt + (H - pb - pt) * (1 - k); s += '<line x1="' + pl + '" x2="' + W + '" y1="' + y + '" y2="' + y + '" class="le-grid"/><text x="' + (pl - 5) + '" y="' + (y + 3) + '" class="le-ax" text-anchor="end">' + fmtv(mx * k) + "</text>"; });
  const im = v.indexOf(Math.max(...v));
  v.forEach((x, i) => {
    const hgt = (H - pb - pt) * x / mx, cx = pl + cw * i + cw / 2;
    s += '<g data-tip="' + esc(tips[i]) + '"><rect x="' + (pl + cw * i) + '" y="' + pt + '" width="' + cw + '" height="' + (H - pb - pt) + '" fill="transparent"/>';
    if (x > 0) s += '<rect x="' + (cx - bw / 2) + '" y="' + (H - pb - hgt) + '" width="' + bw + '" height="' + hgt + '" fill="' + col + '"/>';
    if (i === im && x > 0) s += '<text x="' + cx + '" y="' + (H - pb - hgt - 3) + '" class="le-val" text-anchor="middle">' + fmtv(x) + "</text>";
    if (lab[i]) s += '<text x="' + cx + '" y="' + (H - 6) + '" class="le-ax" text-anchor="middle">' + lab[i] + "</text>";
    s += "</g>";
  });
  return s + "</svg>";
}
function nice(m) { const p = Math.pow(10, Math.floor(Math.log10(m))), f = m / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; }
