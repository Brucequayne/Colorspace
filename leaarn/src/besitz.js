// ===== besitz.js · Häuser kaufen und mieten (seit v0.20) =====
// Ein fertiges Haus mit preis/miete (haeuser.js) ist abgeschlossen, bis man es kauft oder mietet. An seiner Tür öffnet E den Makler-Dialog.
// Gespeichert im Spielstand: save.besitz[Haus-Art] = { art: "kauf" } oder { art: "miete", bis: Zeitpunkt (ms) }.
// Miete: Bezahlt wird sofort für einen echten Tag (24 h), danach verlängert sich der Vertrag automatisch um je einen Tag,
// solange das Geld reicht (auch für Tage, an denen man nicht gespielt hat). Reicht es nicht, endet der Mietvertrag.
import { t, addTexts, L2, tl, el, esc } from "le/core.js";
import { HOUSES } from "le/haeuser.js";
import { save, persist, geld, addGeld, euro } from "le/save.js";
import { tick, kasse } from "le/sound.js";
import { PR } from "le/core.js";

const TAG = 24 * 3600 * 1000;
addTexts({
  bTitle: L2("{n}", "{n}"), bMoney: L2("Dein Geld: {e}", "Your money: {e}"), bBuy: L2("Kaufen · {e}", "Buy · {e}"), bRent: L2("Mieten · {e} pro Tag", "Rent · {e} per day"),
  bClose: L2("Schließen (E)", "Close (E)"), bInfo: L2("Dieses Haus ist abgeschlossen. Kaufe es oder miete es, dann gehören dir die Türen und alles darin.", "This house is locked. Buy it or rent it, then the doors and everything inside are yours."),
  bRentInfo: L2("Miete läuft pro echtem Tag (24 Stunden) und verlängert sich automatisch, solange dein Geld reicht – auch wenn du nicht spielst.", "Rent runs per real day (24 hours) and renews automatically as long as you have the money – even when you're not playing."),
  bRented: L2("Gemietet · nächste Miete ({e}) in {h}", "Rented · next rent ({e}) in {h}"), bCancel: L2("Mietvertrag kündigen", "Cancel the lease"),
  bOwned: L2("Gehört dir.", "It's yours."), bPoor: L2("Dafür reicht dein Geld nicht.", "You can't afford that."),
  bBought: L2("Gekauft: {n}! Das Haus gehört jetzt dir.", "Bought: {n}! The house is yours now."), bRentOk: L2("Gemietet: {n} – die Türen sind offen.", "Rented: {n} – the doors are open."),
  bCancelled: L2("Mietvertrag für {n} gekündigt.", "Lease for {n} cancelled."), bPaid: L2("Miete für {n} bezahlt: {e}", "Rent for {n} paid: {e}"),
  bEnded: L2("Mietvertrag für {n} beendet – dein Geld hat für die Miete nicht gereicht.", "Lease for {n} ended – you couldn't afford the rent."),
  bPrompt: L2("{n}: kaufen oder mieten", "{n}: buy or rent"), bLease: L2("Mietvertrag: {n}", "Lease: {n}")
});
const fm = (s, o) => s.replace(/\{(\w+)\}/g, (m, k) => (o[k] != null ? o[k] : m));
export const kaufbar = (k) => !!(HOUSES[k] && HOUSES[k].preis);
export const hausName = (k) => (HOUSES[k] ? tl(HOUSES[k].n) : k);
export function besitz(k) { const b = save().besitz; return (b && b[k]) || null; }
// darf man hinein? (nicht kaufbare Häuser immer)
export const frei = (k) => !kaufbar(k) || !!besitz(k);
function setB(k, v) { const s = save(); s.besitz = s.besitz || {}; if (v) s.besitz[k] = v; else delete s.besitz[k]; persist(); }
export function kaufen(k) { const p = HOUSES[k].preis; if (geld() < p) return false; addGeld(-p); setB(k, { art: "kauf", seit: Date.now() }); return true; }
export function mieten(k) { const m = HOUSES[k].miete; if (geld() < m) return false; addGeld(-m); setB(k, { art: "miete", bis: Date.now() + TAG }); return true; }
export function kuendigen(k) { setB(k, null); }
export const gemietet = () => Object.keys(save().besitz || {}).filter((k) => save().besitz[k].art === "miete" && HOUSES[k]);
// Miete abrechnen: gibt Meldungen zurück, ended = Häuser, deren Vertrag geendet hat
export function abrechnen() {
  const out = { msg: [], ended: [] }, now = Date.now();
  gemietet().forEach((k) => {
    const b = besitz(k), m = HOUSES[k].miete; let paid = 0;
    while (now >= b.bis) { if (geld() < m) { setB(k, null); out.ended.push(k); out.msg.push(fm(t("bEnded"), { n: hausName(k) })); return; } addGeld(-m); b.bis += TAG; paid++; }
    if (paid) { persist(); out.msg.push(fm(t("bPaid"), { n: hausName(k), e: euro(paid * m) })); }
  });
  return out;
}
const dauer = (ms) => { const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000); return h + " h " + m + " min"; };

// Makler-Dialog
export class Makler {
  constructor(app, onChange) { this.app = app; this.onChange = onChange; this.panel = null; this.k = null; }
  get open() { return !!this.panel; }
  show(k) {
    this.hide(); this.k = k; this.panel = el("div", "le-music le-shop le-makler", ""); this.app.ui.appendChild(this.panel); this.draw();
    this.panel.addEventListener("click", (e) => {
      const b = e.target.closest("[data-mk]"); if (!b) return; const a = b.getAttribute("data-mk"), n = hausName(this.k);
      if (a === "x") { this.hide(); return; }
      if (a === "buy") { if (!kaufen(this.k)) { this.app.toast(t("bPoor")); return; } kasse(PR.stamp); this.app.toast(fm(t("bBought"), { n: n })); }
      else if (a === "rent") { if (!mieten(this.k)) { this.app.toast(t("bPoor")); return; } tick(2); this.app.toast(fm(t("bRentOk"), { n: n })); }
      else if (a === "cancel") { kuendigen(this.k); this.app.toast(fm(t("bCancelled"), { n: n })); }
      if (this.onChange) this.onChange(this.k, a); this.draw();
    });
  }
  draw() {
    const k = this.k, H = HOUSES[k], b = besitz(k), g = geld();
    let body;
    if (b && b.art === "kauf") body = "<p>" + t("bOwned") + "</p>";
    else if (b) body = "<p>" + fm(t("bRented"), { e: euro(H.miete), h: dauer(Math.max(0, b.bis - Date.now())) }) + '</p><div class="le-btns le-col"><button class="le-pri" data-mk="buy"' + (g < H.preis ? " disabled" : "") + ">" + fm(t("bBuy"), { e: euro(H.preis) }) + '</button><button data-mk="cancel">' + t("bCancel") + "</button></div>";
    else body = "<p>" + t("bInfo") + '</p><div class="le-btns le-col"><button class="le-pri" data-mk="buy"' + (g < H.preis ? " disabled" : "") + ">" + fm(t("bBuy"), { e: euro(H.preis) }) + '</button><button class="le-pri" data-mk="rent"' + (g < H.miete ? " disabled" : "") + ">" + fm(t("bRent"), { e: euro(H.miete) }) + '</button></div><p class="le-dim">' + t("bRentInfo") + "</p>";
    this.panel.innerHTML = '<div class="le-mbox2"><h3>' + esc(hausName(k)) + '</h3><p class="le-now">' + fm(t("bMoney"), { e: euro(g) }) + "</p>" + body + '<div class="le-btns"><button data-mk="x">' + t("bClose") + "</button></div></div>";
  }
  hide() { if (this.panel) { this.panel.remove(); this.panel = null; } }
  dispose() { this.hide(); }
}
