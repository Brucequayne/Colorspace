// ===== learn.js · Lernmodus am Laptop: Fächer → Themen → 10 Aufgaben → Ergebnis mit Belohnung =====
import { t, addTexts, L2, tl, el, esc, fmt, rng, PR, store, KEYS } from "le/core.js";
import { Stats } from "le/stats.js";
import { FAECHER, fach, spielbar, fachAktiv, belohnung, runde, pruefe, STANDARD_LOHN } from "le/faecher/index.js";
import { addOffen, offen, einsammeln, addRunde, stat, euro, save, persist } from "le/save.js";
import { hsb, rgbHex, de2000, rating } from "le/faecher/farben.js";

addTexts({
  lHello: L2("Fächer", "Subjects"), nSubj: L2("Fächer", "Subjects"), nStats: L2("Statistiken", "Statistics"), nClose: L2("Schließen", "Close"), lFull: L2("Vollbild", "Fullscreen"), lWin: L2("Fenster", "Window"), lSoon: L2("bald", "soon"), lBack: L2("Zurück", "Back"), lClose: L2("Laptop zuklappen", "Close laptop"),
  lClass: L2("Klasse", "Grade"), lStart: L2("Starten", "Start"), lBest: L2("Bestes: {b}/{m} · {n}× gespielt", "Best: {b}/{m} · played {n}×"),
  cDrop: L2("Zieh eine Farbe auf die erste Farbe (oder klick sie an, Tasten 1–3)", "Drag a colour onto the first colour (or click it, keys 1–3)"),
  cDrop2: L2("Zieh das Ergebnis in das Feld mit dem Fragezeichen (oder klick es an, Tasten 1–3)", "Drag the result into the box with the question mark (or click it, keys 1–3)"),
  cTarget: L2("Ziel", "Target"), cYours: L2("Deine Mischung", "Your mix"), cReal: L2("Echte Mischung", "Real mix"), cGuess: L2("Dein Tipp", "Your guess"),
  cWrongMix: L2("Leider falsch – so sieht die echte Mischung aus", "Wrong – this is what the real mix looks like"),
  lPlanned: L2("Geplante Spiele", "Planned games"), lQ: L2("Aufgabe {i} von {n}", "Question {i} of {n}"), lOk: L2("OK", "OK"),
  lRight: L2("Richtig!", "Correct!"), lWrong: L2("Leider falsch – richtig ist {a}", "Wrong – the answer is {a}"), lTrue: L2("Stimmt", "True"), lFalse: L2("Stimmt nicht", "False"),
  lDone: L2("Geschafft!", "Done!"), lScore: L2("{r} von {n} richtig", "{r} of {n} correct"), lEarn: L2("Belohnung", "Reward"), lAgain: L2("Nochmal", "Again"), lTopics: L2("Zu den Themen", "To the topics"),
  lMist: L2("Deine Fehler", "Your mistakes"), lNoMist: L2("Keine Fehler – perfekt!", "No mistakes – perfect!"), lYour: L2("du: {e}", "you: {e}"),
  lTiers: L2("10/10 → 150 € · 5–9 → 75 € · 1–4 → 25 € · 0 → 5 €", "10/10 → €150 · 5–9 → €75 · 1–4 → €25 · 0 → €5"),
  lEsc: L2("Esc schließt den Laptop", "Esc closes the laptop"), lQuit: L2("Runde abbrechen? Es gibt dann kein Geld.", "Quit this round? You won't get any money."),
  lTopicsN: L2("{n} Themen", "{n} topics"), lReady: L2("{n} bereit", "{n} ready"),
  pPend: L2("Zwischenkonto", "Pending"), pCollect: L2("Belohnungen einsammeln", "Collect rewards"), pToPend: L2("aufs Zwischenkonto", "to your pending balance"),
  pBestPts: L2("Bestes: {b} Punkte · {n}× gespielt", "Best: {b} points · played {n}×"),
  gLook: L2("Merk dir diese Farbe", "Remember this colour"), gMix: L2("Misch die Farbe nach", "Recreate the colour"), gH: L2("Farbton", "Hue"), gS: L2("Sättigung", "Saturation"), gB: L2("Helligkeit", "Brightness"),
  gGo: L2("Abgeben", "Submit"), gNext: L2("Nächste Farbe", "Next colour"), gEnd: L2("Zur Auswertung", "See results"), gTarget: L2("Ziel", "Target"), gYours: L2("Deine Farbe", "Your colour"),
  gRound: L2("Farbe {i} von {n}", "Colour {i} of {n}"), gRating: L2("Bewertung", "Rating"), gSum: L2("Summe {s} → {e}", "Total {s} → {e}"), gBonus: L2("Bonus: alle Runden über {x}", "Bonus: every round above {x}"), gNoBonus: L2("Kein Bonus – dafür müssen alle Runden über 5 liegen", "No bonus – every round has to be above 5"),
  gRules: L2("Summe der 5 Bewertungen = Euro (aufgerundet). Bonus, wenn alle Runden über 5 (+25 €), 7,5 (+50 €) oder 9 (+125 €) liegen.", "Sum of the 5 ratings = euros (rounded up). Bonus if every round is above 5 (+€25), 7.5 (+€50) or 9 (+€125)."),
  gKeys: L2("Enter = abgeben · Pfeiltasten verschieben den gewählten Regler", "Enter = submit · arrow keys move the selected slider")
});

export class Learn {
  constructor(app, onClose, onCollect) {
    this.app = app; this.onClose = onClose; this.onCollect = onCollect; this.view = "home"; this.f = null; this.th = null; this.q = null;
    this.root = el("div", "le-lap", '<div class="le-lapf"><div class="le-scr"><div class="le-bar"><b>LEAARN</b><span class="le-sp"></span><span class="le-pend" id="le-lpend"></span><button class="le-col" data-l="collect" id="le-lcol"></button><button class="le-fullb" data-l="full" id="le-lfull"></button><button data-l="close" title="Esc">×</button></div>' +
      '<div class="le-lmain"><nav class="le-nav"><button data-nav="home">' + t("nSubj") + '</button><button data-nav="stats">' + t("nStats") + '</button><span class="le-sp"></span><button data-nav="close">' + t("nClose") + '</button></nav><div class="le-lbody" id="le-lbody"></div></div></div><div class="le-lbase"></div><div class="le-lhint">' + t("lEsc") + "</div></div>");
    app.ui.appendChild(this.root); this.stats = new Stats();
    this.full(!!(store.get(KEYS.ui, {}).lapFull));
    this.root.addEventListener("click", (e) => this.click(e));
    this.root.addEventListener("keydown", (e) => { if (e.target.id === "le-ans" && e.key === "Enter") { e.preventDefault(); this.submit(e.target.value); } });
    this.root.addEventListener("input", (e) => { if (e.target.hasAttribute("data-g")) this.gInput(); });
    this.render();
  }
  dispose() { clearTimeout(this.tm); clearInterval(this.gi); this.root.remove(); }
  // Vollbild: der Bildschirm des Laptops füllt das ganze Fenster (Einstellung wird gemerkt)
  full(on) {
    this.isFull = on; this.root.classList.toggle("le-full", on);
    const b = this.root.querySelector("#le-lfull"); if (b) { b.textContent = on ? "⤡ " + t("lWin") : "⤢ " + t("lFull"); b.setAttribute("aria-pressed", String(on)); }
    const u = store.get(KEYS.ui, {}); u.lapFull = on; store.set(KEYS.ui, u);
  }
  // Menü links: Fächer / Statistiken / Schließen (läuft eine Runde, wird vorher nachgefragt)
  nav(to) {
    if (to === "close") { this.close(); return; }
    if (this.view === "quiz" && this.q && this.q.res.length && !confirmLite(t("lQuit"))) return;
    clearTimeout(this.tm); clearInterval(this.gi); this.view = to; this.render();
  }
  // Zwischenkonto oben in der Leiste + Knopf „Belohnungen einsammeln“
  acc(pulse) {
    const a = this.root.querySelector("#le-lpend"), b = this.root.querySelector("#le-lcol"), n = offen(); if (!a) return;
    a.innerHTML = t("pPend") + " <b>" + euro(n) + "</b>"; b.textContent = t("pCollect"); b.disabled = !n; b.classList.toggle("le-pri", n > 0);
    if (pulse) { a.classList.remove("le-bump"); void a.offsetWidth; a.classList.add("le-bump"); }
  }
  collect(btn) {
    const n = einsammeln(); if (!n) return;
    const r = (btn || this.root.querySelector("#le-lcol")).getBoundingClientRect();
    this.acc(); this.root.querySelectorAll("[data-l=collect2]").forEach((x) => { x.disabled = true; x.textContent = "✓ " + euro(n); });
    if (this.onCollect) this.onCollect(n, r);
  }
  body(h) { this.root.querySelector("#le-lbody").innerHTML = h; this.acc(); }
  render() {
    const sec = this.view === "stats" ? "stats" : "home";
    this.root.querySelectorAll("[data-nav]").forEach((b) => b.setAttribute("aria-pressed", String(b.getAttribute("data-nav") === sec)));
    if (this.view === "stats") { this.body(this.stats.html()); this.stats.bind(this.root); return; }
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
          return '<div class="le-topic' + (ok ? "" : " le-off") + '"><span class="le-kl">' + t("lClass") + " " + th.klasse + "</span><div><b>" + esc(tl(th.name)) + "</b>" + (th.info ? "<small>" + esc(tl(th.info)) + "</small>" : "") + (st ? "<small>" + (th.art === "guess" ? fmt(t("pBestPts"), { b: num(st.best), n: st.n }) : fmt(t("lBest"), { b: st.best, m: th.anzahl || 10, n: st.n })) + "</small>" : "") + "</div>" +
            (ok ? '<button class="le-pri" data-t="' + th.id + '">' + t("lStart") + "</button>" : '<em>' + t("lSoon") + "</em>") + "</div>";
        }).join("") + "</div>" + (f.spiele && f.spiele.length ? '<p class="le-dim">' + t("lPlanned") + ": " + f.spiele.map((s) => esc(tl(s.name))).join(" · ") + "</p>" : ""));
    } else if (this.view === "quiz") this.renderQ();
    else if (this.view === "done") this.renderDone();
  }
  start(th) {
    this.th = th; const R = rng((Date.now() ^ (Math.random() * 1e9)) >>> 0);
    this.q = { list: runde(th, R), i: 0, res: [], lock: false, ph: "show", t0: performance.now() }; this.view = "quiz"; this.render();
  }
  renderQ() {
    const q = this.q, a = q.list[q.i], n = q.list.length, f = this.f;
    if (a.art === "farbe") { this.renderFarbe(); return; }
    if (a.art === "guess") { this.renderGuess(); return; }
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
    const fb = this.root.querySelector("#le-fb"), right = a.art === "mc" ? a.optionen[a.richtig] : a.art === "wahrfalsch" ? t(a.richtig ? "lTrue" : "lFalse") : a.art === "farbe" ? (a.loesung ? tl(a.loesung) : "") : [].concat(a.antwort)[0];
    if (fb) { fb.className = "le-fb " + (ok ? "le-good" : "le-bad"); fb.textContent = ok ? t("lRight") : a.art === "farbe" && !a.loesung ? t("cWrongMix") : fmt(t("lWrong"), { a: right }); }
    const ip = this.root.querySelector("#le-ans"); if (ip) { ip.disabled = true; ip.classList.add(ok ? "le-good" : "le-bad"); }
    this.root.querySelectorAll("[data-mc]").forEach((b) => { const i = a.art === "wahrfalsch" ? b.getAttribute("data-mc") === "1" : +b.getAttribute("data-mc"); if (i === (a.art === "wahrfalsch" ? a.richtig : a.richtig)) b.classList.add("le-good"); else if (i === v) b.classList.add("le-bad"); b.disabled = true; });
    const wait = a.art === "farbe" ? (ok ? 1500 : 2600) : ok ? 650 : 1500;
    this.tm = setTimeout(() => { q.lock = false; q.i++; if (q.i >= q.list.length) this.finish(); else this.renderQ(); }, wait);
  }
  // Belohnung kommt aufs Zwischenkonto (erst beim Einsammeln aufs Spielerkonto)
  finish() {
    const q = this.q, n = q.list.length, th = this.th;
    let r, lohn;
    if (th.wertung) { q.w = th.wertung(q.res.map((x) => x.score)); r = q.w.summe; lohn = q.w.euro; }
    else { r = q.res.filter((x) => x.ok).length; lohn = belohnung(r, n, th); }
    addOffen(lohn); addRunde(this.f.id, th.id, r, th.wertung ? n * 10 : n, lohn); q.r = r; q.lohn = lohn;
    // Lern-Protokoll für die Statistik: Zeitpunkt, Fach, Thema, Dauer (max. 30 Min. je Runde), Euro
    const S = save(); S.log = S.log || []; S.log.push({ t: Date.now(), f: this.f.id, th: th.id, s: Math.round(Math.min(1800, (performance.now() - (q.t0 || performance.now())) / 1000)), e: lohn });
    if (S.log.length > 6000) S.log.splice(0, S.log.length - 6000); persist();
    this.view = "done"; this.render(); this.acc(true);
  }
  // Knöpfe unter dem Ergebnis
  doneBtns() {
    const n = offen();
    return '<div class="le-btns"><button class="le-pri" data-l="again">' + t("lAgain") + '</button><button data-l="fach">' + t("lTopics") + "</button>" +
      '<button class="le-colbig" data-l="collect2"' + (n ? "" : " disabled") + ">" + t("pCollect") + (n ? " (" + euro(n) + ")" : "") + '</button><button data-l="close">' + t("lClose") + "</button></div>";
  }
  renderDone() {
    if (this.th.wertung) { this.renderGuessDone(); return; }
    const q = this.q, n = q.list.length, wr = q.res.filter((x) => !x.ok), sw = (h) => '<i class="le-msw" style="background:' + h + '"></i>';
    this.body('<div class="le-done"><h2>' + t("lDone") + '</h2><div class="le-big">' + q.r + "<small>/" + n + '</small></div><p>' + fmt(t("lScore"), { r: q.r, n: n }) + '</p><div class="le-earn">' + t("lEarn") + " <b>+" + euro(q.lohn) + "</b> <small>" + t("pToPend") + '</small></div><p class="le-dim">' + tiers(this.th.lohn || STANDARD_LOHN, n) + "</p>" +
      "<h4>" + t("lMist") + "</h4>" + (wr.length ? '<div class="le-mist">' + wr.map((x) => {
        const a = x.a;
        if (a.art === "farbe") {
          const ch = a.optionen[x.e] || {}, B = a.modus === "mischen" ? a.optionen[a.richtig].hex : a.b.hex, C = a.modus === "mischen" ? a.ziel : a.optionen[a.richtig].hex;
          return '<span class="le-mcol">' + sw(a.a.hex) + " + " + sw(B) + " = " + sw(C) + " <em>" + fmt(t("lYour"), { e: "" }) + "</em>" + sw(a.modus === "mischen" ? ch.hex : ch.hex) + "</span>";
        }
        const right = a.art === "mc" ? a.optionen[a.richtig] : a.art === "wahrfalsch" ? t(a.richtig ? "lTrue" : "lFalse") : [].concat(a.antwort)[0];
        const your = a.art === "mc" ? a.optionen[x.e] : a.art === "wahrfalsch" ? t(x.e ? "lTrue" : "lFalse") : x.e;
        return "<span>" + esc(a.frage) + " = <b>" + esc(right) + "</b> <em>" + fmt(t("lYour"), { e: esc(your) }) + "</em></span>";
      }).join("") + "</div>" : '<p class="le-good">' + t("lNoMist") + "</p>") + this.doneBtns() + "</div>");
  }
  // ---------- Farb-Spiel (Kunst: Farbenlehre) ----------
  // mischen: A + ? = Ziel – eine der drei Farben auf A ziehen, A wird zur Mischung, dann Vergleich mit dem Ziel
  // raten:   A + B = ? – eines der drei Ergebnisse ins Feld ziehen, dann erscheint die echte Mischung zum Vergleich
  renderFarbe() {
    const q = this.q, a = q.list[q.i], n = q.list.length, f = this.f, mis = a.modus === "mischen";
    const dots = q.list.map((x, i) => '<i class="' + (i < q.res.length ? (q.res[i].ok ? "le-ok" : "le-no") : i === q.i ? "le-now" : "") + '"></i>').join("");
    const box = (inner, lab, id, cls, bg) => '<div class="le-cbox"><div class="le-sw' + (cls ? " " + cls : "") + '"' + (id ? ' id="' + id + '"' : "") + (bg ? ' style="background:' + bg + '"' : "") + ">" + (inner || "") + "</div><small" + (id ? ' id="' + id + 'l"' : "") + ">" + lab + "</small></div>";
    let h = '<div class="le-lhead"><i style="background:' + f.farbe + '">' + esc(f.kurz) + "</i><h2>" + esc(tl(f.name)) + " · " + esc(tl(this.th.name)) + '</h2><span class="le-sp"></span><span class="le-dim">' + fmt(t("lQ"), { i: q.i + 1, n: n }) + "</span></div>" +
      '<div class="le-dots">' + dots + '</div><div class="le-cg">';
    if (mis) h += box('<span class="le-fx" id="le-fx"></span>', esc(tl(a.a.n)), "le-ca", "le-drop", a.a.hex) + '<b class="le-op">+</b>' + box("?", "&nbsp;", "le-cb", "le-slot") + '<b class="le-op">=</b>' + box("", t("cTarget"), "le-cz", "", a.ziel);
    else h += box("", esc(tl(a.a.n)), "le-ca", "", a.a.hex) + '<b class="le-op">+</b>' + box("", esc(tl(a.b.n)), "le-cb", "", a.b.hex) + '<b class="le-op">=</b>' + box('?<span class="le-fx" id="le-fx"></span>', "&nbsp;", "le-cz", "le-slot le-drop");
    h += '</div><div class="le-copts">' + a.optionen.map((o, i) => '<div class="le-cbox"><div class="le-sw le-drag" data-co="' + i + '" style="background:' + o.hex + '"><kbd>' + (i + 1) + "</kbd></div><small>" + (o.n ? esc(tl(o.n)) : "&nbsp;") + "</small></div>").join("") + "</div>" +
      '<div class="le-fb" id="le-fb"></div><p class="le-dim le-chint">' + t(mis ? "cDrop" : "cDrop2") + "</p>";
    this.body(h);
    this.root.querySelectorAll(".le-drag").forEach((d) => d.addEventListener("pointerdown", (e) => this.dragStart(e, d)));
  }
  dragStart(e, d) {
    if (this.q.lock) return; e.preventDefault();
    const i = +d.getAttribute("data-co"), r = d.getBoundingClientRect(), g = el("div", "le-ghost"); g.style.background = d.style.background;
    g.style.width = r.width * 0.8 + "px"; g.style.height = r.height * 0.8 + "px"; document.body.appendChild(g);
    const x0 = e.clientX, y0 = e.clientY, pos = (x, y) => { g.style.left = x - r.width * 0.4 + "px"; g.style.top = y - r.height * 0.4 + "px"; };
    pos(x0, y0); d.classList.add("le-lift");
    const tg = this.root.querySelector(".le-drop");
    const mv = (ev) => { pos(ev.clientX, ev.clientY); if (tg) tg.classList.toggle("le-hot", inside(tg, ev.clientX, ev.clientY)); };
    const up = (ev) => {
      window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); g.remove(); d.classList.remove("le-lift"); if (tg) tg.classList.remove("le-hot");
      if ((tg && inside(tg, ev.clientX, ev.clientY)) || Math.hypot(ev.clientX - x0, ev.clientY - y0) < 6) this.choose(i);
    };
    window.addEventListener("pointermove", mv); window.addEventListener("pointerup", up);
    function inside(t2, x, y) { const b = t2.getBoundingClientRect(); return x > b.left - 24 && x < b.right + 24 && y > b.top - 24 && y < b.bottom + 24; }
  }
  choose(i) {
    const q = this.q; if (!q || q.lock || this.view !== "quiz") return;
    const a = q.list[q.i], o = a.optionen[i]; if (!o) return; q.lock = true;
    const $ = (id) => this.root.querySelector("#" + id), fx = $("le-fx");
    this.root.querySelectorAll(".le-drag").forEach((d) => { d.classList.add(+d.getAttribute("data-co") === i ? "le-used" : "le-dim2"); });
    if (a.modus === "mischen") {
      const B = $("le-cb"); B.textContent = ""; B.style.background = o.hex; B.classList.remove("le-slot"); $("le-cbl").textContent = tl(o.n);
      fx.style.background = "conic-gradient(" + [a.a.hex, o.hex, a.a.hex, o.hex, a.a.hex].join(",") + ")"; fx.classList.add("le-stir");
      this.tm = setTimeout(() => { const A = $("le-ca"); A.style.background = o.mix; fx.classList.remove("le-stir"); $("le-cal").textContent = tl(a.a.n) + " + " + tl(o.n); this.compare(o.mix, a.ziel, i); }, 900);
    } else {
      const Z = $("le-cz"); Z.firstChild.textContent = ""; Z.style.background = o.hex; Z.classList.remove("le-slot"); $("le-czl").textContent = t("cGuess");
      fx.style.background = "conic-gradient(" + [a.a.hex, a.b.hex, a.a.hex, a.b.hex, a.a.hex].join(",") + ")"; fx.classList.add("le-stir");
      this.tm = setTimeout(() => { fx.classList.remove("le-stir"); this.compare(o.hex, a.ziel, i, true); }, 900);
    }
  }
  // Ergebnis neben das Ziel stellen, richtig/falsch markieren, dann weiter wie bei den anderen Aufgaben
  compare(mine, ziel, i, raten) {
    const a = this.q.list[this.q.i], ok = i === a.richtig, cg = this.root.querySelector(".le-cg");
    const row = el("div", "le-ccmp " + (ok ? "le-good" : "le-bad"), '<div class="le-cbox"><div class="le-sw" style="background:' + mine + '"></div><small>' + t(raten ? "cGuess" : "cYours") + '</small></div><b class="le-op">' + (ok ? "=" : "≠") + '</b><div class="le-cbox"><div class="le-sw" style="background:' + ziel + '"></div><small>' + t(raten ? "cReal" : "cTarget") + "</small></div>");
    cg.after(row);
    this.root.querySelectorAll(".le-drag").forEach((d) => { if (+d.getAttribute("data-co") === a.richtig) d.classList.add("le-right"); });
    const h = this.root.querySelector(".le-chint"); if (h) h.remove();
    this.q.lock = false; this.submit(i);
  }
  // ---------- Color Guesser (Kunst) ----------
  // Phasen: show (Farbe 4 s sehen) → mix (mit Reglern nachstellen, Vorschau live) → res (Ziel neben deiner Farbe, Bewertung 0–10)
  renderGuess() {
    const q = this.q, a = q.list[q.i], n = q.list.length, f = this.f;
    clearInterval(this.gi); clearTimeout(this.tm);
    const dots = q.list.map((x, i) => '<i class="' + (i < q.res.length ? (q.res[i].score > 5 ? "le-ok" : "le-no") : i === q.i ? "le-now" : "") + '"></i>').join("");
    let h = '<div class="le-lhead"><i style="background:' + f.farbe + '">' + esc(f.kurz) + "</i><h2>" + esc(tl(f.name)) + " · " + esc(tl(this.th.name)) + '</h2><span class="le-sp"></span><span class="le-dim">' + fmt(t("gRound"), { i: q.i + 1, n: n }) + "</span></div>" +
      '<div class="le-dots">' + dots + "</div>";
    if (q.ph === "show") {
      const sec = this.th.zeigen || 4;
      h += '<div class="le-gshow" style="background:' + a.hex + '"><b>' + t("gLook") + '</b><span id="le-gcnt">' + sec + '</span><i class="le-gbar" style="animation-duration:' + sec + 's"></i></div>';
      this.body(h);
      const t0 = performance.now(), cnt = this.root.querySelector("#le-gcnt");
      this.gi = setInterval(() => { const left = sec - (performance.now() - t0) / 1000; if (cnt) cnt.textContent = Math.max(1, Math.ceil(left)); if (left <= 0) { clearInterval(this.gi); q.ph = "mix"; this.renderGuess(); } }, 100);
      return;
    }
    if (q.ph === "mix") {
      if (!q.g) q.g = { h: Math.floor(Math.random() * 360), s: 50, b: 50 };
      const sl = (k, max, lab, unit) => '<label class="le-grow"><span>' + lab + ' <em id="le-gv' + k + '">' + q.g[k] + unit + '</em></span><input type="range" class="le-gr" data-g="' + k + '" min="0" max="' + max + '" step="1" value="' + q.g[k] + '"></label>';
      h += '<div class="le-gmix"><div class="le-gprev" id="le-gprev"><b>' + t("gMix") + '</b></div><div class="le-gsl">' + sl("h", 359, t("gH"), "°") + sl("s", 100, t("gS"), " %") + sl("b", 100, t("gB"), " %") +
        '<button class="le-pri le-gsub" data-l="gsub">' + t("gGo") + '</button><p class="le-dim">' + t("gKeys") + "</p></div></div>";
      this.body(h); this.gInput(); const r0 = this.root.querySelector(".le-gr"); if (r0) r0.focus();
      return;
    }
    // Ergebnis
    const r = q.res[q.res.length - 1], last = q.i >= n - 1, hx = (c) => c.h + "° · " + c.s + " % · " + c.b + " %";
    h += '<div class="le-gres"><div style="background:' + a.hex + '"><small>' + t("gTarget") + "</small><span>" + hx(a) + '</span></div><div style="background:' + r.hex + '"><small>' + t("gYours") + "</small><span>" + hx(r.g) + "</span></div></div>" +
      '<div class="le-grate"><small>' + t("gRating") + "</small><b class=\"" + (r.score > 7.5 ? "le-good" : r.score > 5 ? "" : "le-bad") + '">' + num(r.score) + '</b><small>/ 10</small></div>' +
      '<div class="le-btns le-gnb"><button class="le-pri" data-l="gnext">' + t(last ? "gEnd" : "gNext") + " ↵</button></div>";
    this.body(h);
  }
  // Regler bewegt: Vorschau und Farbverläufe der Regler neu
  gInput() {
    const q = this.q; if (!q || q.ph !== "mix") return;
    this.root.querySelectorAll("[data-g]").forEach((r) => { q.g[r.getAttribute("data-g")] = +r.value; });
    const g = q.g, c = (h, s, b) => rgbHex(hsb(h, s, b)), set = (k, bg, v) => { const r = this.root.querySelector('[data-g="' + k + '"]'); if (r) r.style.background = bg; const e = this.root.querySelector("#le-gv" + k); if (e) e.textContent = v; };
    const hues = []; for (let i = 0; i <= 12; i++) hues.push(c(i * 30, g.s, g.b));
    set("h", "linear-gradient(90deg," + hues.join(",") + ")", g.h + "°");
    set("s", "linear-gradient(90deg," + c(g.h, 0, g.b) + "," + c(g.h, 100, g.b) + ")", g.s + " %");
    set("b", "linear-gradient(90deg,#000," + c(g.h, g.s, 100) + ")", g.b + " %");
    const p = this.root.querySelector("#le-gprev"); if (p) p.style.background = c(g.h, g.s, g.b);
  }
  gSubmit() {
    const q = this.q; if (!q || q.ph !== "mix") return;
    const a = q.list[q.i], g = q.g, mine = hsb(g.h, g.s, g.b), dE = de2000(hsb(a.h, a.s, a.b), mine), sc = rating(dE);
    q.res.push({ ok: sc > 5, score: sc, dE: dE, g: { h: g.h, s: g.s, b: g.b }, hex: rgbHex(mine), a: a });
    q.ph = "res"; q.g = null; this.renderGuess();
  }
  gNext() {
    const q = this.q; if (!q || q.ph !== "res") return;
    q.i++; if (q.i >= q.list.length) { this.finish(); return; } q.ph = "show"; this.renderGuess();
  }
  renderGuessDone() {
    const q = this.q, w = q.w, rows = q.res.map((r, i) => '<div class="le-grow2"><span>' + (i + 1) + '</span><i style="background:' + r.a.hex + '"></i><i style="background:' + r.hex + '"></i><b class="' + (r.score > 7.5 ? "le-good" : r.score > 5 ? "" : "le-bad") + '">' + num(r.score) + "</b></div>").join("");
    this.body('<div class="le-done"><h2>' + t("lDone") + '</h2><div class="le-big">' + num(w.summe) + '<small>/50</small></div>' +
      '<div class="le-gsum">' + rows + "</div><p>" + fmt(t("gSum"), { s: num(w.summe), e: euro(w.basis) }) + "</p>" +
      (w.bonus ? '<p class="le-good"><b>' + fmt(t("gBonus"), { x: num(w.bonus.ueber, 1) }) + ": +" + euro(w.bonus.euro) + "</b></p>" : '<p class="le-dim">' + t("gNoBonus") + "</p>") +
      '<div class="le-earn">' + t("lEarn") + " <b>+" + euro(q.lohn) + "</b> <small>" + t("pToPend") + '</small></div><p class="le-dim">' + t("gRules") + "</p>" + this.doneBtns() + "</div>");
  }
  click(e) {
    const nv = e.target.closest("[data-nav]"); if (nv) { this.nav(nv.getAttribute("data-nav")); return; }
    const st = e.target.closest("[data-st]"); if (st) { if (this.stats.click(st)) this.render(); return; }
    const fb = e.target.closest("[data-f]"); if (fb) { const f = fach(fb.getAttribute("data-f")); if (f) { this.f = f; this.view = "fach"; this.render(); } return; }
    const tb = e.target.closest("[data-t]"); if (tb) { const th = this.f.themen.find((x) => x.id === tb.getAttribute("data-t")); if (th) this.start(th); return; }
    const mc = e.target.closest("[data-mc]"); if (mc && this.view === "quiz") { const a = this.q.list[this.q.i]; this.submit(a.art === "wahrfalsch" ? mc.getAttribute("data-mc") === "1" : +mc.getAttribute("data-mc")); return; }
    const kb = e.target.closest("[data-k]"); if (kb) { this.padKey(kb.getAttribute("data-k")); return; }
    const b = e.target.closest("[data-l]"); if (!b) return; const a = b.getAttribute("data-l");
    if (a === "close") this.close();
    else if (a === "full") this.full(!this.isFull);
    else if (a === "collect" || a === "collect2") this.collect(b);
    else if (a === "gsub") this.gSubmit();
    else if (a === "gnext") this.gNext();
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
    if (e.code === "Escape") { if (this.view === "stats") { this.view = "home"; this.render(); } else if (this.view === "fach") { this.view = "home"; this.render(); } else this.close(); return true; }
    if (this.view === "quiz") {
      const a = this.q.list[this.q.i];
      if (a.art === "guess") { if (e.code === "Enter" || e.code === "NumpadEnter") { if (this.q.ph === "mix") this.gSubmit(); else if (this.q.ph === "res") this.gNext(); return true; } return false; }
      if (a.art === "farbe" && /^Digit[1-3]$/.test(e.code)) { this.choose(+e.code.slice(5) - 1); return true; }
      if ((a.art === "mc" || a.art === "wahrfalsch") && /^Digit[1-9]$/.test(e.code)) { const i = +e.code.slice(5) - 1; if (a.art === "wahrfalsch") { if (i < 2) this.submit(i === 0); } else if (i < a.optionen.length) this.submit(i); return true; }
      if (a.art === "eingabe" && e.target.id !== "le-ans") { const ip = this.root.querySelector("#le-ans"); if (ip && !ip.disabled) { ip.focus(); } }
    }
    if (this.view === "done" && (e.code === "Enter" || e.code === "Space") && e.target.tagName !== "BUTTON") { this.start(this.th); return true; }
    return false;
  }
}
function confirmLite(msg) { try { return window.confirm(msg); } catch (e) { return true; } }
// Belohnungs-Stufen als Text, z. B. "5/5 → 100 € · 1–4 → 25 € · 0 → 5 €"
function tiers(L, n) {
  const l = L.slice().sort((a, b) => b.ab - a.ab);
  return l.map((x, i) => { const hi = i === 0 ? n : l[i - 1].ab - 1, lo = Math.min(x.ab, hi); return (lo === n ? n + "/" + n : lo === hi ? String(lo) : lo + "–" + hi) + " → " + euro(x.euro); }).join(" · ");
}
// Zahl mit Komma (deutsch) bzw. Punkt (englisch), 2 Nachkommastellen
function num(v, d) { const k = d == null ? 2 : d; return (+v).toLocaleString(PR.lang === "en" ? "en-US" : "de-DE", { minimumFractionDigits: k, maximumFractionDigits: k }); }
