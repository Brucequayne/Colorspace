// ===== shop.js · Supermarkt-Regale (seit v0.17): an Gefriertruhe, Obst-/Gemüseregal und Warenregal mit E einkaufen =====
// Welche Ware wo liegt, steht beim Gegenstand in items.js: laden ("tiefkuehl" | "obst" | "allg") und preis (€).
// Bezahlt wird vom Spielerkonto (geld), die Ware kommt ins Inventar. Umschalt + Klick kauft 5 Stück.
import { t, addTexts, L2, tl, el, esc, PR } from "le/core.js";
import { ITEMS, give } from "le/items.js";
import { geld, addGeld, euro } from "le/save.js";
import { tick } from "le/sound.js";

export const LADEN = {
  tiefkuehl: { n: L2("Gefriertruhe", "Chest freezer"), leer: L2("Die Truhe ist noch leer – Tiefkühlware kommt in einem der nächsten Updates.", "The freezer is still empty – frozen food is coming in a future update.") },
  obst: { n: L2("Obst & Gemüse", "Fruit & vegetables"), leer: L2("Noch kein Obst und Gemüse – kommt bald.", "No fruit and vegetables yet – coming soon.") },
  allg: { n: L2("Supermarktregal", "Supermarket shelf"), leer: L2("Das Regal ist noch leer – weitere Waren kommen bald.", "The shelf is still empty – more goods are coming soon.") }
};
addTexts({
  sMoney: L2("Dein Geld: {e}", "Your money: {e}"), sBuy: L2("Kaufen", "Buy"), sClose: L2("Schließen (E)", "Close (E)"), sBought: L2("Gekauft: {n}", "Bought: {n}"),
  sPoor: L2("Dafür reicht dein Geld nicht.", "You can't afford that."), sFull: L2("Dein Inventar ist voll.", "Your inventory is full."),
  sHint: L2("Umschalt + Klick kauft 5 Stück · E oder Esc schließt", "Shift + click buys 5 · E or Esc closes")
});
export const waren = (tag) => Object.keys(ITEMS).filter((k) => ITEMS[k].laden === tag && ITEMS[k].preis > 0);

export class Shop {
  constructor(app, onBuy) { this.app = app; this.onBuy = onBuy; this.panel = null; this.tag = null; }
  get open() { return !!this.panel; }
  show(tag) {
    this.hide(); this.tag = LADEN[tag] ? tag : "allg";
    this.panel = el("div", "le-music le-shop", ""); this.app.ui.appendChild(this.panel); this.draw();
    this.panel.addEventListener("click", (e) => {
      const b = e.target.closest("[data-buy]"); if (b) { this.buy(b.getAttribute("data-buy"), e.shiftKey ? 5 : 1); return; }
      if (e.target.closest("[data-sx]")) this.hide();
    });
  }
  draw() {
    const L = LADEN[this.tag], W = waren(this.tag), g = geld();
    this.panel.innerHTML = '<div class="le-mbox2"><h3>' + esc(tl(L.n)) + '</h3><p class="le-now">' + t("sMoney").replace("{e}", euro(g)) + "</p>" +
      (W.length ? '<div class="le-cds">' + W.map((k) => { const it = ITEMS[k]; return '<div class="le-cd">' + it.ico + "<span><b>" + esc(tl(it.n)) + "</b><small>" + esc(it.d ? tl(it.d) : "") + (it.satt ? " · " + (PR.lang === "en" ? "+" + Math.round(it.satt * 100) + " % against hunger" : "+" + Math.round(it.satt * 100) + " % gegen Hunger") : "") + '</small></span><button class="le-pri" data-buy="' + k + '"' + (g < it.preis ? " disabled" : "") + ">" + t("sBuy") + " · " + euro(it.preis) + "</button></div>"; }).join("") + '</div><p class="le-dim">' + t("sHint") + "</p>" : '<p class="le-dim">' + esc(tl(L.leer)) + "</p>") +
      '<div class="le-btns"><button data-sx="1">' + t("sClose") + "</button></div></div>";
  }
  buy(id, n) {
    const it = ITEMS[id]; if (!it) return;
    const k = Math.min(n, Math.floor(geld() / it.preis)); if (k < 1) { this.app.toast(t("sPoor")); return; }
    const got = give(id, k); if (!got) { this.app.toast(t("sFull")); return; }
    addGeld(-got * it.preis); tick(2); this.app.toast(t("sBought").replace("{n}", (got > 1 ? got + " × " : "") + tl(it.n)));
    this.draw(); if (this.onBuy) this.onBuy(got * it.preis);
  }
  hide() { if (this.panel) { this.panel.remove(); this.panel = null; } }
  dispose() { this.hide(); }
}
