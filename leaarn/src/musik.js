// ===== musik.js · Ghettoblaster (seit v0.14): mit E öffnen, CDs aus dem Inventar abspielen =====
// Musik gibt es später als CDs im Supermarkt (Gegenstände mit kind "cd" in items.js). Die Lautstärke sinkt mit dem Abstand.
import { t, addTexts, L2, tl, el, esc } from "le/core.js";
import { ITEMS, has } from "le/items.js";

addTexts({
  mTitle: L2("Ghettoblaster", "Boombox"), mNone: L2("Keine CDs im Inventar. Musik kannst du bald als CD im Supermarkt kaufen.", "No CDs in your inventory. You will soon be able to buy music as CDs at the supermarket."),
  mPlay: L2("Abspielen", "Play"), mStop: L2("Stopp", "Stop"), mNow: L2("Läuft: {t}", "Playing: {t}"), mOff: L2("Aus", "Off"), mClose: L2("Schließen (E)", "Close (E)")
});

export class Musik {
  constructor(app) { this.app = app; this.audio = null; this.cur = null; this.at = null; this.panel = null; }
  get open() { return !!this.panel; }
  show(at) {
    this.at = this.at || at; if (this.panel) { this.hide(); return; }
    const cds = has("cd");
    this.panel = el("div", "le-music", '<div class="le-mbox2"><h3>' + t("mTitle") + '</h3><p class="le-now">' + (this.cur ? t("mNow").replace("{t}", esc(tl(ITEMS[this.cur].n))) : t("mOff")) + "</p>" +
      (cds.length ? '<div class="le-cds">' + cds.map((s) => { const it = ITEMS[s.id]; return '<div class="le-cd">' + it.ico + "<span><b>" + esc(tl(it.n)) + "</b><small>" + esc(it.artist || "") + '</small></span><button data-mu="' + s.id + '">' + t("mPlay") + "</button></div>"; }).join("") + "</div>" : '<p class="le-dim">' + t("mNone") + "</p>") +
      '<div class="le-btns"><button data-mu="stop"' + (this.cur ? "" : " disabled") + ">" + t("mStop") + '</button><button data-mu="close">' + t("mClose") + "</button></div></div>");
    this.app.ui.appendChild(this.panel);
    this.panel.addEventListener("click", (e) => { const b = e.target.closest("[data-mu]"); if (!b) return; const a = b.getAttribute("data-mu"); if (a === "close") this.hide(); else if (a === "stop") { this.stop(); this.hide(); this.show(at); } else { this.play(a, at); this.hide(); this.show(at); } });
  }
  hide() { if (this.panel) { this.panel.remove(); this.panel = null; } }
  play(id, at) { this.stop(); const it = ITEMS[id]; if (!it || !it.src) return; this.audio = new Audio(it.src); this.audio.loop = true; this.audio.volume = 0.8; this.audio.play().catch(() => {}); this.cur = id; this.at = at; }
  stop() { if (this.audio) { this.audio.pause(); this.audio = null; } this.cur = null; }
  // Lautstärke nach Abstand der Figur zum Ghettoblaster (voll bis 3 m, aus ab 25 m)
  update(p) { if (!this.audio || !this.at) return; const d = Math.hypot(p.x - this.at.x, p.z - this.at.z), k = Math.max(0, Math.min(1, 1 - (d - 3) / 22)); this.audio.volume = 0.8 * k * k; }
  dispose() { this.stop(); this.hide(); }
}
