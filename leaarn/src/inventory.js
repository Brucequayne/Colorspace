// ===== inventory.js · Schnellauswahl (Tasten 1–9) und Rucksack (Taste I) mit Ziehen und Ablegen (seit v0.14) =====
// Seit v0.16: Möbel-Lager (Kleiderschrank, Regal, Kühlschrank) – links das Lager (8 × 8), rechts der Rucksack, unten die Schnellauswahl.
// Gegenstände zwischen allen Plätzen ziehen, Umschalt + Klick schiebt einen ganzen Stapel hinüber. Was nicht passt, wird abgewiesen.
import { t, addTexts, L2, tl, el, esc } from "le/core.js";
import { ITEMS, SLOTS, HOT, inv, sel, itemName, lager, LAGER, LAGER_SLOTS, moveX, quickX } from "le/items.js";

addTexts({
  iTitle: L2("Inventar", "Inventory"), iHint: L2("Gegenstände mit der Maus zwischen Rucksack und Schnellauswahl ziehen · I oder Esc schließt", "Drag items between backpack and hotbar · I or Esc closes"), iHot: L2("Schnellauswahl", "Hotbar"),
  iBag: L2("Rucksack", "Backpack"), iStoreHint: L2("Ziehen zum Ein- und Auslagern · Umschalt + Klick schiebt den ganzen Stapel hinüber · E oder Esc schließt", "Drag to store and take out · Shift + click moves the whole stack · E or Esc closes"),
  iFree: L2("{n} von {m} Plätzen frei", "{n} of {m} slots free")
});

export class Inventory {
  constructor(app) {
    this.app = app; inv();
    this.bar = el("div", "le-hotbar"); app.ui.appendChild(this.bar);
    this.panel = null; this.drag = null; this.store = null;
    this.onDown = (e) => this.down(e); this.bar.addEventListener("pointerdown", this.onDown);
    this.draw();
  }
  dispose() { this.bar.remove(); if (this.panel) this.panel.remove(); if (this.ghost) this.ghost.remove(); }
  get open() { return !!this.panel; }
  // Behälter: Inventar (Rucksack + Schnellauswahl) oder das offene Möbel-Lager
  box(kind) { return kind === "s" ? { a: lager(this.store.key), art: this.store.art } : { a: inv(), art: null }; }
  slot(i, kind) {
    const S = kind === "s" ? lager(this.store.key) : inv(), s = S[i], it = s && ITEMS[s.id], attr = kind === "s" ? 'data-ss="' + i + '"' : 'data-slot="' + i + '"';
    return '<div class="le-slot2' + (kind !== "s" && i < HOT && i === sel() ? " le-on" : "") + '" ' + attr + (it ? ' title="' + esc(tl(it.n)) + (it.d ? " – " + esc(tl(it.d)) : "") + '"' : "") + ">" +
      (kind !== "s" && i < HOT ? "<kbd>" + (i + 1) + "</kbd>" : "") + (it ? it.ico + (s.n > 1 ? "<b>" + s.n + "</b>" : "") : "") + "</div>";
  }
  draw() {
    let h = ""; for (let i = 0; i < HOT; i++) h += this.slot(i); this.bar.innerHTML = h;
    if (this.panel) {
      let g = ""; for (let i = HOT; i < SLOTS; i++) g += this.slot(i); this.panel.querySelector(".le-igrid").innerHTML = g;
      if (this.store) {
        const A = lager(this.store.key); let s = ""; for (let i = 0; i < LAGER_SLOTS; i++) s += this.slot(i, "s");
        this.panel.querySelector(".le-sgrid").innerHTML = s;
        const f = this.panel.querySelector("#le-sfree"); if (f) f.textContent = t("iFree").replace("{n}", A.filter((x) => !x).length).replace("{m}", LAGER_SLOTS);
      }
    }
    const s = inv()[sel()]; this.bar.setAttribute("data-name", s ? itemName(s.id) : "");
  }
  toggle(on) {
    on = on == null ? !this.panel : on;
    if (!on && this.panel) { this.panel.remove(); this.panel = null; this.store = null; this.bar.classList.remove("le-up"); return; }
    if (on && !this.panel) {
      this.panel = el("div", "le-inv", '<div class="le-ibox"><h3>' + t("iTitle") + '</h3><div class="le-igrid"></div><p class="le-dim">' + t("iHint") + "</p></div>");
      this.app.ui.appendChild(this.panel); this.panel.addEventListener("pointerdown", this.onDown); this.bar.classList.add("le-up"); this.draw();
    }
  }
  // Möbel-Lager öffnen (key = Speicherplatz, art = Kleidung / Regal / Essen)
  openStore(key, art) {
    if (this.panel) this.toggle(false);
    const L = LAGER[art] || LAGER.regal; this.store = { key: key, art: art };
    this.panel = el("div", "le-inv le-store", '<div class="le-ibox le-sbox"><div><h3>' + esc(tl(L.n)) + ' <small class="le-dim" id="le-sfree"></small></h3><p class="le-dim le-shint">' + esc(tl(L.hint)) + '</p><div class="le-sgrid"></div></div>' +
      '<div><h3>' + t("iBag") + '</h3><div class="le-igrid"></div></div><p class="le-dim le-sfoot">' + t("iStoreHint") + "</p></div>");
    this.app.ui.appendChild(this.panel); this.panel.addEventListener("pointerdown", this.onDown); this.bar.classList.add("le-up"); this.draw();
  }
  select(i) { sel(i); this.draw(); const s = inv()[i]; if (s) this.app.toast(itemName(s.id)); }
  // abgewiesen: Platz kurz rot, Hinweis
  refuse(node) {
    const L = this.store && LAGER[this.store.art]; this.app.toast(L ? tl(L.no) : "");
    if (node) { node.classList.remove("le-nope"); void node.offsetWidth; node.classList.add("le-nope"); }
  }
  // Ziehen: Geist folgt der Maus, Ablegen auf einem Platz in Lager, Rucksack oder Schnellauswahl
  down(e) {
    const sl = e.target.closest("[data-slot],[data-ss]"); if (!sl || e.button !== 0) return;
    const kind = sl.hasAttribute("data-ss") ? "s" : "i", i = +sl.getAttribute(kind === "s" ? "data-ss" : "data-slot"), src = this.box(kind), s = src.a[i];
    if (!s) { if (kind === "i" && i < HOT) this.select(i); return; }
    e.preventDefault();
    // Umschalt + Klick: ganzer Stapel ins andere Fach (Lager ↔ Rucksack, ohne Lager: Rucksack ↔ Schnellauswahl)
    if (e.shiftKey) {
      let ok;
      if (this.store) { if (kind === "s") { ok = quickX(src, i, this.box("i"), HOT, SLOTS); if (src.a[i]) quickX(src, i, this.box("i"), 0, HOT); } else ok = quickX(src, i, this.box("s")); }
      else ok = i < HOT ? quickX(src, i, src, HOT, SLOTS) : quickX(src, i, src, 0, HOT);
      if (!ok) this.refuse(sl); this.draw(); return;
    }
    const g = this.ghost = el("div", "le-ighost", ITEMS[s.id].ico); document.body.appendChild(g); sl.classList.add("le-from");
    const x0 = e.clientX, y0 = e.clientY, pos = (x, y) => { g.style.left = x - 22 + "px"; g.style.top = y - 22 + "px"; }; pos(x0, y0);
    const mv = (ev) => { pos(ev.clientX, ev.clientY); document.querySelectorAll(".le-slot2.le-hot").forEach((q) => q.classList.remove("le-hot")); const tg = slotAt(ev.clientX, ev.clientY); if (tg) tg.classList.add("le-hot"); };
    const up = (ev) => {
      window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); g.remove(); this.ghost = null; sl.classList.remove("le-from");
      const tg = slotAt(ev.clientX, ev.clientY);
      if (tg) {
        const k2 = tg.hasAttribute("data-ss") ? "s" : "i", j = +tg.getAttribute(k2 === "s" ? "data-ss" : "data-slot");
        if (k2 === kind && j === i) { if (kind === "i" && i < HOT) this.select(i); }
        else if (!(k2 === "s" && !this.store) && !moveX(src, i, this.box(k2), j)) { this.draw(); this.refuse(slotAt(ev.clientX, ev.clientY)); return; }
      }
      this.draw();
    };
    window.addEventListener("pointermove", mv); window.addEventListener("pointerup", up);
    function slotAt(x, y) { const n = document.elementsFromPoint(x, y).find((q) => q.classList && q.classList.contains("le-slot2")); return n || null; }
  }
}
