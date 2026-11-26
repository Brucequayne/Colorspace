// ===== outfit.js · Outfit ändern am Kleiderschrank (seit v0.21, Taste F) =====
// Zeigt die Kleidung aus diesem Schrank und aus dem Rucksack, nach Körperstelle sortiert. Klick zieht an, nochmal Klick zieht aus.
// Die Figur ändert sich sofort (Play.wear → Player.relook). Getragenes bleibt im Schrank liegen.
import { t, addTexts, tl, el, esc } from "le/core.js";
import { ITEMS } from "le/items.js";
import { KL_SLOTS, KL_SLOT_N, kleidungBei, kleidSlot } from "le/kleidung.js";
import { tick } from "le/sound.js";

addTexts({
  oTitle: { de: "Outfit", en: "Outfit" },
  oHint: { de: "Kleidung aus diesem Schrank und deinem Rucksack. Klick zieht an, nochmal klicken zieht aus.", en: "Clothes from this wardrobe and your backpack. Click to put on, click again to take off." },
  oNone: { de: "ohne", en: "none" }, oDone: { de: "Fertig (F)", en: "Done (F)" },
  oEmpty: { de: "Noch keine Kleidung. Kauf welche im Klamottenladen und leg sie in den Kleiderschrank.", en: "No clothes yet. Buy some at the clothes shop and put them in the wardrobe." },
  oSlotEmpty: { de: "nichts da", en: "nothing here" }, pOutfit: { de: "Outfit ändern", en: "Change outfit" }
});

export class Outfit {
  constructor(app, onWear) { this.app = app; this.onWear = onWear; this.panel = null; this.key = null; this.cur = {}; }
  get open() { return !!this.panel; }
  show(key, cur) {
    this.hide(); this.key = key; this.cur = Object.assign({}, cur || {});
    this.panel = el("div", "le-music le-outfit", ""); this.app.ui.appendChild(this.panel); this.draw();
    this.panel.addEventListener("click", (e) => {
      const b = e.target.closest("[data-os]"); if (b) { this.pick(b.getAttribute("data-os"), b.getAttribute("data-ov")); return; }
      if (e.target.closest("[data-ox]")) this.hide();
    });
  }
  draw() {
    const ids = kleidungBei(this.key), by = {}; KL_SLOTS.forEach((k) => { by[k] = []; });
    ids.forEach((id) => { const s = kleidSlot(id); if (s) by[s].push(id); });
    const row = (k) => '<div class="le-orow"><span>' + esc(tl(KL_SLOT_N[k])) + '</span><div class="le-osw"><button class="le-ono" data-os="' + k + '" data-ov="" aria-pressed="' + !this.cur[k] + '">' + t("oNone") + "</button>" +
      (by[k].length ? by[k].map((id) => '<button data-os="' + k + '" data-ov="' + id + '" title="' + esc(tl(ITEMS[id].n)) + '" aria-pressed="' + (this.cur[k] === id) + '">' + ITEMS[id].ico + "</button>").join("") : '<small class="le-dim">' + t("oSlotEmpty") + "</small>") + "</div></div>";
    this.panel.innerHTML = '<div class="le-mbox2"><h3>' + t("oTitle") + '</h3><p class="le-dim">' + t(ids.length ? "oHint" : "oEmpty") + "</p>" + KL_SLOTS.map(row).join("") +
      '<div class="le-btns"><button data-ox="1">' + t("oDone") + "</button></div></div>";
  }
  pick(slot, id) {
    if (id && this.cur[slot] === id) id = "";   // nochmal klicken = ausziehen
    if (id) this.cur[slot] = id; else delete this.cur[slot];
    tick(1); this.draw(); if (this.onWear) this.onWear(Object.assign({}, this.cur));
  }
  hide() { if (this.panel) { this.panel.remove(); this.panel = null; } }
  dispose() { this.hide(); }
}
