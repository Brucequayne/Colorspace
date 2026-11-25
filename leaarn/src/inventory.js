// ===== inventory.js · Schnellauswahl (Tasten 1–9) und Rucksack (Taste I) mit Ziehen und Ablegen (seit v0.14) =====
import { t, addTexts, L2, tl, el, esc } from "le/core.js";
import { ITEMS, SLOTS, HOT, inv, move, sel, itemName } from "le/items.js";

addTexts({ iTitle: L2("Inventar", "Inventory"), iHint: L2("Gegenstände mit der Maus zwischen Rucksack und Schnellauswahl ziehen · I oder Esc schließt", "Drag items between backpack and hotbar · I or Esc closes"), iHot: L2("Schnellauswahl", "Hotbar") });

export class Inventory {
  constructor(app) {
    this.app = app; inv();
    this.bar = el("div", "le-hotbar"); app.ui.appendChild(this.bar);
    this.panel = null; this.drag = null;
    this.onDown = (e) => this.down(e); this.bar.addEventListener("pointerdown", this.onDown);
    this.draw();
  }
  dispose() { this.bar.remove(); if (this.panel) this.panel.remove(); if (this.ghost) this.ghost.remove(); }
  get open() { return !!this.panel; }
  slot(i) {
    const s = inv()[i], it = s && ITEMS[s.id];
    return '<div class="le-slot2' + (i < HOT && i === sel() ? " le-on" : "") + '" data-slot="' + i + '"' + (it ? ' title="' + esc(tl(it.n)) + (it.d ? " – " + esc(tl(it.d)) : "") + '"' : "") + ">" +
      (i < HOT ? "<kbd>" + (i + 1) + "</kbd>" : "") + (it ? it.ico + (s.n > 1 ? "<b>" + s.n + "</b>" : "") : "") + "</div>";
  }
  draw() {
    let h = ""; for (let i = 0; i < HOT; i++) h += this.slot(i); this.bar.innerHTML = h;
    if (this.panel) { let g = ""; for (let i = HOT; i < SLOTS; i++) g += this.slot(i); this.panel.querySelector(".le-igrid").innerHTML = g; }
    const s = inv()[sel()]; this.bar.setAttribute("data-name", s ? itemName(s.id) : "");
  }
  toggle(on) {
    on = on == null ? !this.panel : on;
    if (!on && this.panel) { this.panel.remove(); this.panel = null; this.bar.classList.remove("le-up"); return; }
    if (on && !this.panel) {
      this.panel = el("div", "le-inv", '<div class="le-ibox"><h3>' + t("iTitle") + '</h3><div class="le-igrid"></div><p class="le-dim">' + t("iHint") + "</p></div>");
      this.app.ui.appendChild(this.panel); this.panel.addEventListener("pointerdown", this.onDown); this.bar.classList.add("le-up"); this.draw();
    }
  }
  select(i) { sel(i); this.draw(); const s = inv()[i]; if (s) this.app.toast(itemName(s.id)); }
  // Ziehen: Geist folgt der Maus, Ablegen auf einem Platz in Rucksack oder Schnellauswahl
  down(e) {
    const sl = e.target.closest("[data-slot]"); if (!sl || e.button !== 0) return;
    const i = +sl.getAttribute("data-slot"), s = inv()[i];
    if (!s) { if (i < HOT) this.select(i); return; }
    e.preventDefault();
    const g = this.ghost = el("div", "le-ighost", ITEMS[s.id].ico); document.body.appendChild(g); sl.classList.add("le-from");
    const x0 = e.clientX, y0 = e.clientY, pos = (x, y) => { g.style.left = x - 22 + "px"; g.style.top = y - 22 + "px"; }; pos(x0, y0);
    const mv = (ev) => { pos(ev.clientX, ev.clientY); document.querySelectorAll(".le-slot2.le-hot").forEach((q) => q.classList.remove("le-hot")); const tg = slotAt(ev.clientX, ev.clientY); if (tg) tg.classList.add("le-hot"); };
    const up = (ev) => {
      window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); g.remove(); this.ghost = null; sl.classList.remove("le-from");
      const tg = slotAt(ev.clientX, ev.clientY);
      if (tg) { const j = +tg.getAttribute("data-slot"); if (j !== i) move(i, j); else if (i < HOT) this.select(i); }
      this.draw();
    };
    window.addEventListener("pointermove", mv); window.addEventListener("pointerup", up);
    function slotAt(x, y) { const n = document.elementsFromPoint(x, y).find((q) => q.classList && q.classList.contains("le-slot2")); return n || null; }
  }
}
