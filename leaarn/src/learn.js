// ===== learn.js · Lernmodus am Laptop: Fächer → Themen → 10 Aufgaben → Ergebnis mit Belohnung =====
import { t, addTexts, L2, tl, el, esc, fmt, rng } from "le/core.js";
import { FAECHER, fach, spielbar, fachAktiv, belohnung, runde, pruefe } from "le/faecher/index.js";
import { geld, addGeld, addRunde, stat, euro } from "le/save.js";

addTexts({
  lHello: L2("Was lernst du heute?", "What are you learning today?"), lSoon: L2("bald", "soon"), lBack: L2("Zurück", "Back"), lClose: L2("Laptop zuklappen", "Close laptop"),
  lClass: L2("Klasse", "Grade"), lStart: L2("Starten", "Start"), lBest: L2("Bestes: {b}/10 · {n}× gespielt", "Best: {b}/10 · played {n}×"),
  lPlanned: L2("Geplante Spiele", "Planned games"), lQ: L2("Aufgabe {i} von {n}", "Question {i} of {n}"), lOk: L2("OK", "OK"),
  lRight: L2("Richtig!", "Correct!"), lWrong: L2("Leider falsch – richtig ist {a}", "Wrong – the answer is {a}"), lTrue: L2("Stimmt", "True"), lFalse: L2("Stimmt nicht", "False"),
  lDone: L2("Geschafft!", "Done!"), lScore: L2("{r} von {n} richtig", "{r} of {n} correct"), lEarn: L2("Belohnung", "Reward"), lAgain: L2("Nochmal", "Again"), lTopics: L2("Zu den Themen", "To the topics"),
  lMist: L2("Deine Fehler", "Your mistakes"), lNoMist: L2("Keine Fehler – perfekt!", "No mistakes – perfect!"), lYour: L2("du: {e}", "you: {e}"),
  lTiers: L2("10/10 → 150 € · 5–9 → 75 € · 1–4 → 25 € · 0 → 5 €", "10/10 → €150 · 5–9 → €75 · 1–4 → €25 · 0 → €5"),
  lEsc: L2("Esc schließt den Laptop", "Esc closes the laptop"), lQuit: L2("Runde abbrechen? Es gibt dann kein Geld.", "Quit this round? You won't get any money."),
  lTopicsN: L2("{n} Themen", "{n} topics"), lReady: L2("{n} bereit", "{n} ready")
});

export class Learn {
  constructor(app, onClose, onMoney) {
    this.app = app; this.onClose = onClose; this.onMoney = onMoney; this.view = "home"; this.f = null; this.th = null; this.q = null;
    this.root = el("div", "le-lap", '<div class="le-lapf"><div class="le-scr"><div class="le-bar"><b>LEAARN</b><span class="le-sp"></span><span class="le-acc" id="le-lacc"></span><button data-l="close" title="Esc">×</button></div><div class="le-lbody" id="le-lbody"></div></div><div class="le-lbase"></div><div class="le-lhint">' + t("lEsc") + "</div></div>");
    app.ui.appendChild(this.root);
    this.root.addEventListener("click", (e) => this.click(e));
    this.root.addEventListener("keydown", (e) => { if (e.target.id === "le-ans" && e.key === "Enter") { e.preventDefault(); this.submit(e.target.value); } });
    this.render();
  }
  dispose() { clearTimeout(this.tm); this.root.remove(); }
  acc() { const a = this.root.querySelector("#le-lacc"); if (a) a.textContent = euro(geld()); }
  body(h) { this.root.querySelector("#le-lbody").innerHTML = h; this.acc(); }
  render() {
    if (this.view === "home") {
      this.body('<h2>' + t("lHello") + '</h2><div class="le-subj">' + FAECHER.map((f) => {
        const on = fachAktiv(f), nr = f.themen.filter(spielbar).length;
        return '<button data-f="' + f.id + '"' + (on ? "" : ' class="le-off"') + '><i style="background:' + f.farbe + '">' + esc(f.kurz) + "</i><b>" + esc(tl(f.name)) + "</b><small>" + (on ? fmt(t("lReady"), { n: nr }) : t("lSoon")) + "</small></button>";
      }).join("") + "</div>");
    } else if (this.view === "fach") {
      const f = this.f;
      this.body('<div class="le-lhead"><button data-l="home">← ' + t("lBack") + '</button><i style="background:' + f.farbe + '">' + esc(f.kurz) + "</i><h2>" + esc(tl(f.name)) + '</h2></div><div class="le-topics">' +
        f.themen.slice().sort((a, b) => (spielbar(b) - spielbar(a)) || a.klasse - b.klasse).map((th) => {
          const ok = spielbar(th), st = stat(f.id, th.id);
          return '<div class="le-topic' + (ok ? "" : " le-off") + '"><span class="le-kl">' + t("lClass") + " " + th.klasse + "</span><div><b>" + esc(tl(th.name)) + "</b>" + (th.info ? "<small>" + esc(tl(th.info)) + "</small>" : "") + (st ? "<small>" + fmt(t("lBest"), { b: st.best, n: st.n }) + "</small>" : "") + "</div>" +
            (ok ? '<button class="le-pri" data-t="' + th.id + '">' + t("lStart") + "</button>" : '<em>' + t("lSoon") + "</em>") + "</div>";
        }).join("") + "</div>" + (f.spiele && f.spiele.length ? '<p class="le-dim">' + t("lPlanned") + ": " + f.spiele.map((s) => esc(tl(s.name))).join(" · ") + "</p>" : ""));
    } else if (this.view === "quiz") this.renderQ();
    else if (this.view === "done") this.renderDone();
  }
  start(th) {
    this.th = th; const R = rng((Date.now() ^ (Math.random() * 1e9)) >>> 0);
    this.q = { list: runde(th, R), i: 0, res: [], lock: false }; this.view = "quiz"; this.render();
  }
  renderQ() {
    const q = this.q, a = q.list[q.i], n = q.list.length, f = this.f;
    const dots = q.list.map((x, i) => '<i class="' + (i < q.res.length ? (q.res[i].ok ? "le-ok" : "le-no") : i === q.i ? "le-now" : "") + '"></i>').join("");
    let inp = "";
    if (a.art === "mc") inp = '<div class="le-mc">' + a.optionen.map((o, i) => '<button data-mc="' + i + '"><kbd>' + (i + 1) + "</kbd>" + esc(o) + "</button>").join("") + "</div>";
    else if (a.art === "wahrfalsch") inp = '<div class="le-mc le-wf"><button data-mc="1"><kbd>1</kbd>' + t("lTrue") + '</button><button data-mc="0"><kbd>2</kbd>' + t("lFalse") + "</button></div>";
    else inp = '<div class="le-in"><input id="le-ans" type="text" inputmode="numeric" autocomplete="off" spellcheck="false" maxlength="12"><button class="le-pri" data-l="ok">' + t("lOk") + '</button></div><div class="le-pad">' +
      ["7", "8", "9", "4", "5", "6", "1", "2", "3", "⌫", "0", "↵"].map((k) => '<button data-k="' + k + '">' + k + "</button>").join("") + "</div>";
    this.body('<div class="le-lhead"><i style="background:' + f.farbe + '">' + esc(f.kurz) + "</i><h2>" + esc(tl(f.name)) + " · " + esc(tl(this.th.name)) + '</h2><span class="le-sp"></span><span class="le-dim">' + fmt(t("lQ"), { i: q.i + 1, n: n }) + "</span></div>" +
      '<div class="le-dots">' + dots + '</div><div class="le-q">' + esc(a.frage) + (a.art === "eingabe" ? " = ?" : "") + '</div>' + inp + '<div class="le-fb" id="le-fb"></div>');
    const ip = this.root.querySelector("#le-ans"); if (ip) setTimeout(() => ip.focus(), 0);
  }
  submit(v) {
    const q = this.q; if (!q || q.lock) return;
    const a = q.list[q.i]; if (a.art === "eingabe" && String(v).trim() === "") return;
    const ok = pruefe(a, v); q.res.push({ ok: ok, e: v, a: a }); q.lock = true;
    const fb = this.root.querySelector("#le-fb"), right = a.art === "mc" ? a.optionen[a.richtig] : a.art === "wahrfalsch" ? t(a.richtig ? "lTrue" : "lFalse") : [].concat(a.antwort)[0];
    if (fb) { fb.className = "le-fb " + (ok ? "le-good" : "le-bad"); fb.textContent = ok ? t("lRight") : fmt(t("lWrong"), { a: right }); }
    const ip = this.root.querySelector("#le-ans"); if (ip) { ip.disabled = true; ip.classList.add(ok ? "le-good" : "le-bad"); }
    this.root.querySelectorAll("[data-mc]").forEach((b) => { const i = a.art === "wahrfalsch" ? b.getAttribute("data-mc") === "1" : +b.getAttribute("data-mc"); if (i === (a.art === "wahrfalsch" ? a.richtig : a.richtig)) b.classList.add("le-good"); else if (i === v) b.classList.add("le-bad"); b.disabled = true; });
    this.tm = setTimeout(() => { q.lock = false; q.i++; if (q.i >= q.list.length) this.finish(); else this.renderQ(); }, ok ? 650 : 1500);
  }
  finish() {
    const q = this.q, r = q.res.filter((x) => x.ok).length, n = q.list.length, lohn = belohnung(r, n);
    addGeld(lohn); addRunde(this.f.id, this.th.id, r, n, lohn); q.r = r; q.lohn = lohn;
    this.view = "done"; this.render(); if (this.onMoney) this.onMoney(lohn);
  }
  renderDone() {
    const q = this.q, n = q.list.length, wr = q.res.filter((x) => !x.ok);
    this.body('<div class="le-done"><h2>' + t("lDone") + '</h2><div class="le-big">' + q.r + "<small>/" + n + '</small></div><p>' + fmt(t("lScore"), { r: q.r, n: n }) + '</p><div class="le-earn">' + t("lEarn") + " <b>+" + euro(q.lohn) + '</b></div><p class="le-dim">' + t("lTiers") + "</p>" +
      "<h4>" + t("lMist") + "</h4>" + (wr.length ? '<div class="le-mist">' + wr.map((x) => {
        const a = x.a, right = a.art === "mc" ? a.optionen[a.richtig] : a.art === "wahrfalsch" ? t(a.richtig ? "lTrue" : "lFalse") : [].concat(a.antwort)[0];
        const your = a.art === "mc" ? a.optionen[x.e] : a.art === "wahrfalsch" ? t(x.e ? "lTrue" : "lFalse") : x.e;
        return "<span>" + esc(a.frage) + " = <b>" + esc(right) + "</b> <em>" + fmt(t("lYour"), { e: esc(your) }) + "</em></span>";
      }).join("") + "</div>" : '<p class="le-good">' + t("lNoMist") + "</p>") +
      '<div class="le-btns"><button class="le-pri" data-l="again">' + t("lAgain") + '</button><button data-l="fach">' + t("lTopics") + '</button><button data-l="close">' + t("lClose") + "</button></div></div>");
  }
  click(e) {
    const fb = e.target.closest("[data-f]"); if (fb) { const f = fach(fb.getAttribute("data-f")); if (f) { this.f = f; this.view = "fach"; this.render(); } return; }
    const tb = e.target.closest("[data-t]"); if (tb) { const th = this.f.themen.find((x) => x.id === tb.getAttribute("data-t")); if (th) this.start(th); return; }
    const mc = e.target.closest("[data-mc]"); if (mc && this.view === "quiz") { const a = this.q.list[this.q.i]; this.submit(a.art === "wahrfalsch" ? mc.getAttribute("data-mc") === "1" : +mc.getAttribute("data-mc")); return; }
    const kb = e.target.closest("[data-k]"); if (kb) { this.padKey(kb.getAttribute("data-k")); return; }
    const b = e.target.closest("[data-l]"); if (!b) return; const a = b.getAttribute("data-l");
    if (a === "close") this.close();
    else if (a === "home") { this.view = "home"; this.render(); }
    else if (a === "fach") { this.view = "fach"; this.render(); }
    else if (a === "again") this.start(this.th);
    else if (a === "ok") { const ip = this.root.querySelector("#le-ans"); if (ip) this.submit(ip.value); }
  }
  padKey(k) {
    const ip = this.root.querySelector("#le-ans"); if (!ip || ip.disabled) return;
    if (k === "⌫") ip.value = ip.value.slice(0, -1); else if (k === "↵") { this.submit(ip.value); return; } else if (ip.value.length < 12) ip.value += k;
    ip.focus();
  }
  close() {
    if (this.view === "quiz" && this.q && this.q.res.length && !confirmLite(t("lQuit"))) return;
    if (this.onClose) this.onClose();
  }
  // Tasten (aus dem Spiel weitergereicht). true = verbraucht
  key(e) {
    if (e.code === "Escape") { if (this.view === "fach") { this.view = "home"; this.render(); } else this.close(); return true; }
    if (this.view === "quiz") {
      const a = this.q.list[this.q.i];
      if ((a.art === "mc" || a.art === "wahrfalsch") && /^Digit[1-9]$/.test(e.code)) { const i = +e.code.slice(5) - 1; if (a.art === "wahrfalsch") { if (i < 2) this.submit(i === 0); } else if (i < a.optionen.length) this.submit(i); return true; }
      if (a.art === "eingabe" && e.target.id !== "le-ans") { const ip = this.root.querySelector("#le-ans"); if (ip && !ip.disabled) { ip.focus(); } }
    }
    if (this.view === "done" && (e.code === "Enter" || e.code === "Space") && e.target.tagName !== "BUTTON") { this.start(this.th); return true; }
    return false;
  }
}
function confirmLite(msg) { try { return window.confirm(msg); } catch (e) { return true; } }
