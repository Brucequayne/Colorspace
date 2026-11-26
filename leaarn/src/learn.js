// ===== learn.js · Lernmodus am Laptop: Fächer → Themen → 10 Aufgaben → Ergebnis mit Belohnung =====
import { t, addTexts, L2, tl, el, esc, fmt, rng, PR, store, KEYS } from "le/core.js";
import { Stats } from "le/stats.js";
import { tick } from "le/sound.js";
import { FAECHER, fach, spielbar, fachAktiv, belohnung, runde, pruefe, STANDARD_LOHN } from "le/faecher/index.js";
import { addOffen, offen, einsammeln, addRunde, stat, euro, save, persist, fokusVoll, FOKUS } from "le/save.js";
import { hsb, rgbHex, de2000, rating } from "le/faecher/farben.js";
import { KAT, WORTARTEN, ART_KURZ, STUFEN, VOK_LOHN, VOK_EN, stufenPool } from "le/faecher/vokabeln.js";
import { ELEMENTE, KATEG, ZUSTAND, STUFEN_PSE, PSE_LOHN, psePool, pseBewerte, valenz, STUFEN_SCHALE, SCHALE_MAX, neutronen, schalePool, schaleBewerte, STUFEN_STECK, ROEM, STECK_FELDER, steckSoll, steckBewerte } from "le/faecher/elemente.js";
import { fachBonus, restzeit } from "le/faecher/boni.js";
import { KARTEN, STUFEN_KARTE, karte, ladeKarte, landName, anzahl, landBewerte } from "le/faecher/laenderraten.js";

addTexts({
  // Länder raten (Erdkunde, v0.19.5)
  kIntro: L2("Auf der Karte leuchtet ein Land auf. Klick es an, dann öffnet sich ein Fenster: Namen eintippen und mit Enter bestätigen. Das Fenster lässt sich an der Kopfzeile verschieben. 10 Länder pro Durchgang.", "A country lights up on the map. Click it and a small window opens: type the name and confirm with Enter. You can move the window by its title bar. 10 countries per round."),
  kMap: L2("Karte", "Map"), kPts: L2("Richtig = 1 Punkt, kleiner Tippfehler = ½ Punkt (max. 10). Deutsche und englische Namen zählen.", "Correct = 1 point, small typo = ½ point (max 10). German and English names both count."),
  kNoLvl: L2("Hier gibt es keine Stufen: alle {n} Länder sind dabei, 10 davon kommen dran.", "No levels here: all {n} countries are in, 10 of them come up."),
  kNoLvlDe: L2("Keine Stufen: 10 der {n} Bundesländer kommen dran.", "No levels: 10 of the {n} states come up."),
  kLoad: L2("Karte wird geladen …", "Loading map …"), kErr: L2("Die Karte konnte nicht geladen werden.", "The map could not be loaded."),
  kRound: L2("Land {i} von {n}", "Country {i} of {n}"), kClick: L2("Klick auf das leuchtende Land (Enter öffnet das Fenster auch)", "Click the glowing country (Enter opens the window too)"),
  kClickDe: L2("Klick auf das leuchtende Bundesland (Enter öffnet das Fenster auch)", "Click the glowing state (Enter opens the window too)"),
  kAsk: L2("Welches Land ist das?", "Which country is this?"), kAskDe: L2("Welches Bundesland ist das?", "Which state is this?"),
  kRight: L2("Richtig: {n}", "Correct: {n}"), kTypo: L2("Fast – richtig geschrieben: {n} (½ Punkt)", "Almost – correct spelling: {n} (½ point)"), kWrong: L2("Leider falsch – das ist {n}", "Wrong – this is {n}"),
  kNext: L2("Weiter", "Next"), kEnd: L2("Zur Auswertung", "See results"),
  // Element-Steckbrief (Chemie, v0.19.4) und Fach-Bonus
  stIntro: L2("Du bekommst ein Element und füllst seinen Steckbrief aus. Alles steht im Periodensystem, das du rechts ausklappen kannst – oder lässt sich daraus ausrechnen.", "You get one element and fill in its profile. Everything can be found in the periodic table, which you can unfold on the right, or worked out from it."),
  stPts: L2("Je 1 Punkt (max. 10)", "1 point each (max 10)"), stBonus: L2("Alles richtig: +1 Bonuspunkt", "All correct: +1 bonus point"),
  st_sym: L2("Symbol", "Symbol"), st_hg: L2("Hauptgruppe", "Main group"), st_per: L2("Periode", "Period"), st_z: L2("Ordnungszahl", "Atomic number"), st_el: L2("Elektronen gesamt", "Total electrons"),
  st_val: L2("Valenzelektronen", "Valence electrons"), st_p: L2("Protonen", "Protons"), st_n: L2("Neutronen", "Neutrons"), st_m: L2("Atommasse (gerundet)", "Atomic mass (rounded)"),
  stx_sym: L2("z. B. Na", "e.g. Na"), stx_hg: L2("römisch I–VIII (Edelgase VIII)", "Roman I–VIII (noble gases VIII)"), stx_per: L2("Zeile im Periodensystem", "row in the periodic table"),
  stx_z: L2("steht über dem Symbol", "shown above the symbol"), stx_el: L2("= Ordnungszahl", "= atomic number"), stx_val: L2("Elektronen auf der äußersten Schale", "electrons on the outer shell"),
  stx_p: L2("= Ordnungszahl", "= atomic number"), stx_n: L2("= gerundete Atommasse − Ordnungszahl", "= rounded atomic mass − atomic number"), stx_m: L2("auf ganze Zahl runden", "round to a whole number"),
  stTask: L2("Steckbrief von {n}", "Profile of {n}"), stCheck: L2("Prüfen", "Check"), stGot: L2("{p} von 10 Punkten", "{p} of 10 points"), stAll: L2("Alles richtig – Bonuspunkt!", "All correct – bonus point!"),
  stHow: L2("Enter springt zum nächsten Feld, im letzten Feld prüft Enter", "Enter jumps to the next field, in the last field Enter checks"), stEnd: L2("Zur Auswertung", "See results"),
  bBanner: L2("+{p} % Bonus", "+{p} % bonus"), bLeft: L2("noch {t}", "{t} left"), bBar: L2("{f}-Bonus: +{p} % Geld auf alle Aufgaben", "{f} bonus: +{p} % money on every task"),
  bUntil: L2("bis {d}", "until {d}"), bEarn: L2("{f}-Bonus +{p} %: +{e}", "{f} bonus +{p} %: +{e}"),
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
  gKeys: L2("Enter = abgeben · Pfeiltasten verschieben den gewählten Regler", "Enter = submit · arrow keys move the selected slider"),
  // Stufen statt Jahrgänge (v0.15)
  // Periodensystem (Chemie, v0.19.1)
  peHint: L2("Fahr mit der Maus über die Elemente, klick eins an für alle Infos. Wenn du bereit bist: Schwierigkeit wählen und Start.", "Hover over the elements, click one for all details. When you're ready: pick a difficulty and start."),
  peZ: L2("Ordnungszahl", "Atomic number"), peZs: L2("= Anzahl Protonen = Anzahl Elektronen", "= number of protons = number of electrons"), peM: L2("Atommasse", "Atomic mass"),
  peN: L2("Neutronen (häufigstes Atom)", "Neutrons (most common atom)"), pePer: L2("Periode", "Period"), peGr: L2("Gruppe", "Group"), peHG: L2("{n}. Hauptgruppe", "main group {n}"),
  peNG: L2("Nebengruppe (Gruppe {n})", "transition group (group {n})"), peKat: L2("Art", "Type"), peZu: L2("bei 20 °C", "at 20 °C"), peVal: L2("Außenelektronen", "Outer electrons"),
  peSch: L2("Elektronen pro Schale", "Electrons per shell"), peRad: L2("radioaktiv", "radioactive"), peLa: L2("Lanthanoide", "Lanthanides"), peAc: L2("Actinoide", "Actinides"),
  peQ: L2("Welches Element hat das Symbol {s}?", "Which element has the symbol {s}?"), peRound: L2("Element {i} von {n}", "Element {i} of {n}"), peCheck: L2("Prüfen", "Check"),
  peNext: L2("Weiter", "Next"), peEnd: L2("Zur Auswertung", "See results"), peRight: L2("Richtig! +2", "Correct! +2"), peTypo: L2("Fast – kleiner Tippfehler. +1", "Almost – small typo. +1"),
  peWrong: L2("Leider falsch. 0 Punkte", "Wrong. 0 points"), peIs: L2("{s} ist {n}", "{s} is {n}"), pePool: L2("Hell markiert: Elemente, die auf dieser Stufe abgefragt werden", "Highlighted: elements asked at this level"),
  peRules: L2("5 Elemente, eins nach dem anderen: Symbol sehen, Namen auf Deutsch schreiben. Richtig = 2 Punkte, kleiner Tippfehler = 1 Punkt. Umlaute darfst du als ae/oe/ue schreiben.", "5 elements, one after another: see the symbol, write the German name. Correct = 2 points, small typo = 1 point."),
  // Schalenmodelle bauen (Chemie, v0.19.2)
  scIntro: L2("Du bekommst nacheinander 2 Elemente und baust jeweils ihr Schalenmodell: Kern mit Protonen und Neutronen, die Schalen und die Elektronen darauf. Daneben kannst du das Periodensystem ausklappen.", "You get 2 elements, one after another, and build each one's shell model: nucleus with protons and neutrons, the shells and the electrons on them. You can unfold the periodic table next to it."),
  scPts: L2("Punkte je Element (max. 5)", "Points per element (max 5)"), scP: L2("Protonen", "Protons"), scN: L2("Neutronen", "Neutrons"), scSh: L2("Anzahl Schalen", "Number of shells"),
  scTot: L2("Elektronen gesamt", "Total electrons"), scDist: L2("Verteilung auf die Schalen", "Distribution over the shells"),
  scPx: L2("= Ordnungszahl", "= atomic number"), scNx: L2("= gerundete Atommasse − Ordnungszahl (auf Leicht und Mittel vorgegeben, der Punkt zählt automatisch)", "= rounded atomic mass − atomic number (given on easy and medium, the point counts automatically)"), scNfix: L2("vorgegeben", "given"), scShx: L2("= Periode", "= period"),
  scTotx: L2("= Protonen (Atom ist neutral)", "= protons (atom is neutral)"), scDistx: L2("jede Schale richtig besetzt", "every shell filled correctly"),
  scTask: L2("Baue das Schalenmodell von {n}", "Build the shell model of {n}"), scRound: L2("Element {i} von {n}", "Element {i} of {n}"), scCore: L2("Kern", "Nucleus"),
  scShells: L2("Schalen", "Shells"), scAdd: L2("+ Schale", "+ shell"), scDel: L2("− Schale", "− shell"), scEl: L2("Elektronen", "Electrons"), scMax: L2("max. {n}", "max {n}"),
  scHow: L2("Klick auf eine Schale setzt ein Elektron, Rechtsklick nimmt eins weg · Umschalt + Klick bei Protonen/Neutronen: ±5 · Enter prüft", "Click a shell to add an electron, right click removes one · Shift + click on protons/neutrons: ±5 · Enter checks"),
  scCheck: L2("Prüfen", "Check"), scYours: L2("Dein Modell", "Your model"), scRight: L2("Richtig", "Correct"), scGot: L2("{p} von 5 Punkten", "{p} of 5 points"), scNoSh: L2("Noch keine Schale – füge eine hinzu.", "No shell yet – add one."),
  spOpen: L2("Periodensystem", "Periodic table"), spBack: L2("← Periodensystem", "← Periodic table"), spHint: L2("Element anklicken für die Infos", "Click an element for details"),
  fLap: L2("Fokus", "Focus"), fBoost: L2("Fokus-Bonus +15 %: +{e}", "Focus bonus +15 %: +{e}"), fCharge: L2("lädt", "charging"),
  sBas: L2("Basics", "Basics"), sAdv: L2("Fortgeschritten", "Advanced"), sExp: L2("Experte", "Expert"), sAll: L2("Alle Stufen", "All levels"),
  // Vokabeltest (v0.15)
  vArea: L2("Themengebiet", "Topic area"), vAll: L2("Alle Wörter", "All words"), vTypes: L2("Wortarten", "Word types"), vLevel: L2("Schwierigkeit", "Difficulty"),
  vN: L2("{n} Wörter", "{n} words"), vRange: L2("Wörter {a}–{b} von {n} nach Häufigkeit", "Words {a}–{b} of {n} by frequency"),
  vLvl0: L2("die häufigsten Wörter", "the most common words"), vLvl1: L2("mittel häufige Wörter", "medium-frequency words"), vLvl2: L2("seltenere Wörter", "less common words"),
  vBonusPct: L2("Belohnung +{p} %", "Reward +{p} %"), vBase: L2("normale Belohnung", "normal reward"), vGo: L2("Los geht's", "Let's go"), vRewards: L2("Belohnung", "Reward"),
  vRules: L2("5 Wörter, jedes einzeln bestätigen (Enter oder ✓). Richtig geschrieben = 2 Punkte, richtiges Wort mit kleinem Tippfehler = 1 Punkt. Synonym-Bonus: Schreib ein zweites richtiges Wort mit Komma dahinter (z. B. „floor, ground“) – bis zu 2 Extrapunkte. Groß/klein, Artikel und „to“ sind egal, Umlaute darfst du als ae/oe/ue schreiben.",
    "5 words, confirm each one (Enter or ✓). Correct spelling = 2 points, right word with a small typo = 1 point. Synonym bonus: write a second correct word after a comma (e.g. “floor, ground”) – up to 2 extra points. Capitals, articles and “to” don't matter."),
  vPts: L2("{p} Punkte", "{p} points"), vPt1: L2("1 Punkt", "1 point"), vEnd: L2("Zur Auswertung", "See results"), vSettings: L2("Einstellungen", "Settings"),
  vHint: L2("Enter bestätigt das Wort und springt zum nächsten · zweites Wort mit Komma = Synonym-Bonus", "Enter confirms the word and jumps to the next · second word after a comma = synonym bonus"),
  vSkip: L2("weiß nicht", "don't know"), vTypo: L2("Tippfehler", "typo"), vSyn: L2("Synonym", "synonym"), vSol: L2("Lösung", "Answer"),
  vOver: L2("über 10", "over 10"), vYour: L2("Deine Antwort", "Your answer"), vMult: L2("{s}: {b} × {f} = {e}", "{s}: {b} × {f} = {e}")
});
// Stufe eines Themas: Klasse 5–6 Basics, 7–8 Fortgeschritten, 9–10 Experte
function stufe(th) {
  if (th.stufe === "alle") return ['<span class="le-kl le-kl0">', t("sAll"), "</span>"].join("");
  const k = th.klasse || 5, i = k <= 6 ? 1 : k <= 8 ? 2 : 3;
  return '<span class="le-kl le-kl' + i + '">' + t(["", "sBas", "sAdv", "sExp"][i]) + "</span>";
}

export class Learn {
  constructor(app, onClose, onCollect) {
    this.app = app; this.onClose = onClose; this.onCollect = onCollect; this.view = "home"; this.f = null; this.th = null; this.q = null;
    this.root = el("div", "le-lap", '<div class="le-lapf"><div class="le-scr"><div class="le-bar"><b>LEAARN</b><span class="le-sp"></span><span class="le-lfok" id="le-lfok" title="' + t("fLap") + '"><span>' + t("fLap") + '</span><i><b></b></i><em></em></span><span class="le-pend" id="le-lpend"></span><button class="le-col" data-l="collect" id="le-lcol"></button><button class="le-fullb" data-l="full" id="le-lfull"></button><button data-l="close" title="Esc">×</button></div>' +
      '<div class="le-lmain"><nav class="le-nav"><button data-nav="home">' + t("nSubj") + '</button><button data-nav="stats">' + t("nStats") + '</button><span class="le-sp"></span><button data-nav="close">' + t("nClose") + '</button></nav><div class="le-lbody" id="le-lbody"></div></div></div><div class="le-lbase"></div><div class="le-lhint">' + t("lEsc") + "</div></div>");
    app.ui.appendChild(this.root); this.stats = new Stats();
    this.full(!!(store.get(KEYS.ui, {}).lapFull));
    this.root.addEventListener("click", (e) => this.click(e));
    this.root.addEventListener("keydown", (e) => {
      if (e.target.id === "le-ans" && e.key === "Enter") { e.preventDefault(); this.submit(e.target.value); }
      else if (e.target.id === "le-pans" && e.key === "Enter") { e.preventDefault(); e.stopPropagation(); this.pCheck(false); }
      else if (e.target.id === "le-kans" && e.key === "Enter") { e.preventDefault(); e.stopPropagation(); this.kCheck(); }
      else if (e.target.hasAttribute && e.target.hasAttribute("data-si") && e.key === "Enter") { e.preventDefault(); e.stopPropagation(); this.tNextField(e.target.getAttribute("data-si")); }
      else if (e.target.hasAttribute && e.target.hasAttribute("data-vi") && e.key === "Enter") { e.preventDefault(); e.stopPropagation(); this.vConfirm(+e.target.getAttribute("data-vi"), false); }
    });
    this.root.addEventListener("input", (e) => { if (e.target.hasAttribute("data-si")) { if (this.q && this.q.inp) this.q.inp[e.target.getAttribute("data-si")] = e.target.value.trim(); return; } if (e.target.hasAttribute("data-kl")) { this.kopt({ lvl: +e.target.value }); this.kLvlInfo(); return; } if (e.target.hasAttribute("data-tl")) { this.topt({ lvl: +e.target.value }); this.tLvlInfo(); return; } if (e.target.hasAttribute("data-g")) this.gInput(); else if (e.target.hasAttribute("data-vl")) { this.vopt({ lvl: +e.target.value }); this.vLvlInfo(); } else if (e.target.hasAttribute("data-pl")) { this.popt({ lvl: +e.target.value }); this.pLvlInfo(); } else if (e.target.hasAttribute("data-sl")) { this.sopt({ lvl: +e.target.value }); this.sLvlInfo(); } });
    // Schalenmodell: Rechtsklick auf eine Schale nimmt ein Elektron weg
    this.root.addEventListener("contextmenu", (e) => { const r = e.target.closest && e.target.closest("[data-ring]"); if (r) { e.preventDefault(); this.sEl(+r.getAttribute("data-ring"), -1); } });
    this.bi = setInterval(() => this.bTick(), 1000);
    this.render();
  }
  dispose() { clearTimeout(this.tm); clearInterval(this.gi); clearInterval(this.bi); this.root.remove(); }
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
        return '<button data-f="' + f.id + '"' + (on ? "" : ' class="le-off"') + '><i style="background:' + f.farbe + '">' + esc(f.kurz) + "</i><b>" + esc(tl(f.name)) + "</b><small>" + (on ? fmt(t("lReady"), { n: nr }) : t("lSoon")) + "</small>" + (on ? this.bonusTag(f) : "") + "</button>";
      }).join("") + "</div>");
    } else if (this.view === "fach") {
      const f = this.f;
      this.body('<div class="le-lhead"><button data-l="home">← ' + t("lBack") + '</button><i style="background:' + f.farbe + '">' + esc(f.kurz) + "</i><h2>" + esc(tl(f.name)) + "</h2></div>" + this.bonusBar(f) + '<div class="le-topics">' +
        f.themen.slice().sort((a, b) => (spielbar(b) - spielbar(a)) || a.klasse - b.klasse).map((th) => {
          const ok = spielbar(th), st = stat(f.id, th.id);
          return '<div class="le-topic' + (ok ? "" : " le-off") + '">' + stufe(th) + "<div><b>" + esc(tl(th.name)) + "</b>" + (th.info ? "<small>" + esc(tl(th.info)) + "</small>" : "") + (st ? "<small>" + (th.art === "guess" ? fmt(t("pBestPts"), { b: num(st.best), n: st.n }) : th.wertung ? fmt(t("pBestPts"), { b: st.best, n: st.n }) : fmt(t("lBest"), { b: st.best, m: th.anzahl || 10, n: st.n })) + "</small>" : "") + "</div>" +
            (ok ? '<button class="le-pri" data-t="' + th.id + '">' + t("lStart") + "</button>" : '<em>' + t("lSoon") + "</em>") + "</div>";
        }).join("") + "</div>" + (f.spiele && f.spiele.length ? '<p class="le-dim">' + t("lPlanned") + ": " + f.spiele.map((s) => esc(tl(s.name))).join(" · ") + "</p>" : ""));
    } else if (this.view === "setup") { if (this.th && this.th.art === "pse") this.renderPseSetup(); else if (this.th && this.th.art === "schale") this.renderSchaleSetup(); else if (this.th && this.th.art === "steck") this.renderSteckSetup(); else if (this.th && this.th.art === "karte") this.renderKarteSetup(); else this.renderSetup(); }
    else if (this.view === "quiz") this.renderQ();
    else if (this.view === "done") this.renderDone();
  }
  start(th) {
    this.th = th; const R = rng((Date.now() ^ (Math.random() * 1e9)) >>> 0);
    const opt = th.setup ? Object.assign({}, th.art === "pse" ? this.popt() : th.art === "schale" ? this.sopt() : th.art === "steck" ? this.topt() : th.art === "karte" ? this.kopt() : this.vopt()) : null;
    this.q = { list: runde(th, R, opt), i: 0, res: [], lock: false, ph: "show", t0: performance.now(), opt: opt }; this.view = "quiz"; this.render();
  }
  renderQ() {
    const q = this.q, a = q.list[q.i], n = q.list.length, f = this.f;
    if (a.art === "farbe") { this.renderFarbe(); return; }
    if (a.art === "guess") { this.renderGuess(); return; }
    if (a.art === "vokabel") { this.renderVok(); return; }
    if (a.art === "pse") { this.renderPseQ(); return; }
    if (a.art === "schale") { this.renderSchaleQ(); return; }
    if (a.art === "steck") { this.renderSteckQ(); return; }
    if (a.art === "karte") { this.renderKarteQ(); return; }
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
  // Fokus-Anzeige oben in der Laptop-Leiste (kommt jedes Bild aus play.js)
  setFokus(f, up) {
    const k = Math.floor(f * 100) + (up ? "u" : ""); if (k === this.fkKey) return; this.fkKey = k;
    const e = this.root.querySelector("#le-lfok"); if (!e) return;
    e.querySelector("b").style.width = (f * 100).toFixed(1) + "%"; e.querySelector("em").textContent = f >= 0.999 ? "+15 %" : Math.floor(f * 100) + " %" + (up ? " ▲" : "");
    e.classList.toggle("le-full", f >= 0.999); e.classList.toggle("le-up", !!up);
  }
  // Fokus-Bonus auf dem Ergebnis-Bildschirm
  boostHtml() {
    const q = this.q; if (!q) return "";
    return (q.ebon && q.ebon.e ? '<p class="le-fboost le-ebon">' + fmt(t("bEarn"), { f: esc(tl(this.f.name)), p: q.ebon.pct, e: euro(q.ebon.e) }) + "</p>" : "") + (q.boost ? '<p class="le-fboost">' + fmt(t("fBoost"), { e: euro(q.boost) }) + "</p>" : "");
  }
  // Fach-Bonus: Banner auf der Fach-Kachel, Leiste in der Themenliste, Timer läuft jede Sekunde (seit v0.19.4)
  bonusTag(f) { const b = fachBonus(f.id); return b ? '<span class="le-bban"><b>' + fmt(t("bBanner"), { p: b.pct }) + '</b><em data-bcd="' + b.end + '">' + fmt(t("bLeft"), { t: restzeit(b.end) }) + "</em></span>" : ""; }
  bonusBar(f) {
    const b = fachBonus(f.id); if (!b) return "";
    let d = ""; try { d = new Date(b.end).toLocaleString(PR.lang === "en" ? "en-GB" : "de-DE", { timeZone: "Europe/Berlin", weekday: "short", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" }); } catch (e) { d = ""; }
    return '<div class="le-bbar"><b>' + fmt(t("bBar"), { f: esc(tl(f.name)), p: b.pct }) + "</b><span>" + (d ? fmt(t("bUntil"), { d: d }) + " · " : "") + '<em data-bcd="' + b.end + '">' + fmt(t("bLeft"), { t: restzeit(b.end) }) + "</em></span></div>";
  }
  bTick() {
    const els = this.root.querySelectorAll("[data-bcd]"); if (!els.length) return; const now = Date.now(); let over = false;
    els.forEach((x) => { const end = +x.getAttribute("data-bcd"); if (now >= end) over = true; else x.textContent = fmt(t("bLeft"), { t: restzeit(end, now) }); });
    if (over && (this.view === "home" || this.view === "fach")) this.render();   // abgelaufen: Banner verschwindet
  }
  // Belohnung kommt aufs Zwischenkonto (erst beim Einsammeln aufs Spielerkonto)
  finish() {
    const q = this.q, n = q.list.length, th = this.th;
    let r, lohn;
    if (th.wertung) { q.w = th.wertung(q.res.map((x) => x.score), q.opt); r = q.w.summe; lohn = q.w.euro; }
    else { r = q.res.filter((x) => x.ok).length; lohn = belohnung(r, n, th); }
    // Fach-Bonus (seit v0.19.4, faecher/boni.js): auf die Belohnung nach der Schwierigkeit, vor dem Fokus-Bonus
    q.ebon = null; const fbo = fachBonus(this.f.id); if (fbo) { const b = Math.ceil(lohn * (1 + fbo.pct / 100) - 1e-9); q.ebon = { pct: fbo.pct, e: b - lohn }; lohn = b; }
    // voller Fokus (seit v0.17): +15 % auf die Belohnung (aufgerundet)
    q.boost = 0; if (fokusVoll()) { const b = Math.ceil(lohn * (1 + FOKUS.bonus) - 1e-9); q.boost = b - lohn; lohn = b; }
    addOffen(lohn); addRunde(this.f.id, th.id, r, th.wertung ? (th.maxPunkte || n * 10) : n, lohn); q.r = r; q.lohn = lohn;
    // Lern-Protokoll für die Statistik: Zeitpunkt, Fach, Thema, Dauer (max. 30 Min. je Runde), Euro
    const S = save(); S.log = S.log || []; S.log.push({ t: Date.now(), f: this.f.id, th: th.id, s: Math.round(Math.min(1800, (performance.now() - (q.t0 || performance.now())) / 1000)), e: lohn });
    if (S.log.length > 6000) S.log.splice(0, S.log.length - 6000); persist();
    this.view = "done"; this.render(); this.acc(true);
  }
  // Knöpfe unter dem Ergebnis
  doneBtns() {
    const n = offen();
    return '<div class="le-btns"><button class="le-pri" data-l="again">' + t("lAgain") + "</button>" + (this.th && this.th.setup ? '<button data-l="vset">' + t("vSettings") + "</button>" : "") + '<button data-l="fach">' + t("lTopics") + "</button>" +
      '<button class="le-colbig" data-l="collect2"' + (n ? "" : " disabled") + ">" + t("pCollect") + (n ? " (" + euro(n) + ")" : "") + '</button><button data-l="close">' + t("lClose") + "</button></div>";
  }
  renderDone() {
    if (this.th.art === "vokabel") { this.renderVokDone(); return; }
    if (this.th.art === "pse") { this.renderPseDone(); return; }
    if (this.th.art === "schale") { this.renderSchaleDone(); return; }
    if (this.th.art === "steck") { this.renderSteckDone(); return; }
    if (this.th.art === "karte") { this.renderKarteDone(); return; }
    if (this.th.wertung) { this.renderGuessDone(); return; }
    const q = this.q, n = q.list.length, wr = q.res.filter((x) => !x.ok), sw = (h) => '<i class="le-msw" style="background:' + h + '"></i>';
    this.body('<div class="le-done"><h2>' + t("lDone") + '</h2><div class="le-big">' + q.r + "<small>/" + n + '</small></div><p>' + fmt(t("lScore"), { r: q.r, n: n }) + '</p><div class="le-earn">' + t("lEarn") + " <b>+" + euro(q.lohn) + "</b> <small>" + t("pToPend") + '</small></div>' + this.boostHtml() + '<p class="le-dim">' + tiers(this.th.lohn || STANDARD_LOHN, n) + "</p>" +
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
      '<div class="le-earn">' + t("lEarn") + " <b>+" + euro(q.lohn) + "</b> <small>" + t("pToPend") + '</small></div>' + this.boostHtml() + '<p class="le-dim">' + t("gRules") + "</p>" + this.doneBtns() + "</div>");
  }
  // ---------- Schalenmodelle bauen (Chemie, seit v0.19.2) ----------
  sopt(set) {
    const u = store.get(KEYS.ui, {}), o = Object.assign({ lvl: 0 }, u.schale || {});
    if (set) { Object.assign(o, set); u.schale = o; store.set(KEYS.ui, u); }
    if (!(o.lvl >= 0 && o.lvl <= 2)) o.lvl = 0; return o;
  }
  renderSchaleSetup() {
    const f = this.f, th = this.th, o = this.sopt(), demo = { p: 6, n: 6, sh: [2, 4] };
    const row = (k, x) => "<li><b>" + t(k) + "</b> <span class=\"le-dim\">" + t(x) + "</span></li>";
    this.body('<div class="le-lhead"><button data-l="fach">← ' + t("lBack") + '</button><i style="background:' + f.farbe + '">' + esc(f.kurz) + "</i><h2>" + esc(tl(th.name)) + "</h2></div>" +
      '<div class="le-sset"><div>' + schaleSvg(demo, { help: true, small: true }) + '</div><div><p>' + t("scIntro") + "</p><h4>" + t("scPts") + '</h4><ul class="le-slist">' +
      row("scP", "scPx") + row("scN", "scNx") + row("scSh", "scShx") + row("scTot", "scTotx") + row("scDist", "scDistx") + "</ul>" +
      '<div class="le-vlvl"><b>' + t("vLevel") + '</b><input type="range" data-sl min="0" max="2" step="1" value="' + o.lvl + '"><div class="le-vlab">' + STUFEN_SCHALE.map((x) => '<span data-sls="' + x.id + '">' + esc(tl(x.name)) + "</span>").join("") + '</div><p id="le-slinfo"></p></div>' +
      '<p class="le-dim" id="le-stiers"></p><div class="le-btns"><button class="le-pri le-vgo" data-l="vgo">Start ↵</button></div></div></div>');
    this.sLvlInfo();
  }
  sLvlInfo() {
    const o = this.sopt(), st = STUFEN_SCHALE[o.lvl];
    this.root.querySelectorAll("[data-sls]").forEach((x) => x.classList.toggle("le-vsel", +x.getAttribute("data-sls") === o.lvl));
    const inf = this.root.querySelector("#le-slinfo"); if (inf) inf.innerHTML = "<b>" + esc(tl(st.info)) + "</b> · " + (st.faktor > 1 ? '<em class="le-good">' + fmt(t("vBonusPct"), { p: Math.round((st.faktor - 1) * 100) }) + "</em>" : t("vBase"));
    const ti = this.root.querySelector("#le-stiers"); if (ti) ti.innerHTML = "<b>" + t("vRewards") + ":</b> " + pseTiers(st.faktor);
  }
  renderSchaleQ() {
    const q = this.q, f = this.f, a = q.list[q.i], e = a.el, st = STUFEN_SCHALE[(q.opt && q.opt.lvl) | 0]; clearTimeout(this.tm);
    if (!q.b) q.b = { p: 0, n: st.nfix ? neutronen(e) : 0, sh: [] };   // v0.19.3: Leicht/Mittel Neutronen vorgegeben
    if (!this.spse) this.spse = { open: false, el: null };
    const sum = q.res.reduce((s, x) => s + x.score, 0), dots = q.list.map((x, k) => '<i class="' + (k < q.res.length ? (q.res[k].score === 5 ? "le-ok" : q.res[k].score ? "le-half" : "le-no") : k === q.i ? "le-now" : "") + '"></i>').join("");
    this.body('<div class="le-lhead"><i style="background:' + f.farbe + '">' + esc(f.kurz) + "</i><h2>" + esc(tl(this.th.name)) + '</h2><span class="le-sp"></span><span class="le-dim">' + esc(tl(st.name)) + " · <b>" + sum + "</b> / 10</span></div>" +
      '<div class="le-dots">' + dots + '</div><div class="le-sbuild"><div class="le-swork"><p class="le-dim">' + fmt(t("scRound"), { i: q.i + 1, n: q.list.length }) + "</p><h3>" + fmt(t("scTask"), { n: "<b>" + esc(e.name) + " (" + e.sym + ")</b>" }) + "</h3>" +
      '<div class="le-sarea"><div class="le-ssvg" id="le-ssvg"></div><div class="le-sctl" id="le-sctl"></div></div><div id="le-sres"></div></div><div class="le-spse" id="le-spse"></div></div>');
    this.sDraw(); this.sPanel();
  }
  // Baukasten neu zeichnen (Modell + Regler), ohne das Periodensystem anzufassen
  sDraw() {
    const q = this.q, b = q.b, st = STUFEN_SCHALE[(q.opt && q.opt.lvl) | 0], shown = q.ph === "shown", sv = this.root.querySelector("#le-ssvg"), ct = this.root.querySelector("#le-sctl"); if (!sv || !ct) return;
    sv.innerHTML = schaleSvg(b, { help: st.hilfe, edit: !shown });
    const pm = (k, v, lab, lock) => '<div class="le-srow' + (lock ? " le-slock" : "") + '"><span>' + lab + '</span><button data-sb="' + k + '-"' + (shown || lock ? " disabled" : "") + ">−</button><b>" + v + '</b><button data-sb="' + k + '+"' + (shown || lock ? " disabled" : "") + ">+</button></div>";
    const names = ["K", "L", "M", "N"];
    let h = "<h4>" + t("scCore") + "</h4>" + pm("p", b.p, "p⁺ " + t("scP")) + pm("n", b.n, "n " + t("scN") + (st.nfix ? ' <small class="le-dim">' + t("scNfix") + "</small>" : ""), st.nfix) + "<h4>" + t("scShells") + '</h4><div class="le-btns"><button data-sb="s+"' + (shown || b.sh.length >= 4 ? " disabled" : "") + ">" + t("scAdd") + '</button><button data-sb="s-"' + (shown || !b.sh.length ? " disabled" : "") + ">" + t("scDel") + "</button></div>";
    h += b.sh.length ? b.sh.map((x, k) => pm("e" + k, x, names[k] + "-" + t("scEl") + (st.hilfe ? ' <small class="le-dim">' + fmt(t("scMax"), { n: SCHALE_MAX[k] }) + "</small>" : ""))).join("") : '<p class="le-dim">' + t("scNoSh") + "</p>";
    if (!shown) h += '<p class="le-dim le-shelp">' + t("scHow") + '</p><div class="le-btns"><button class="le-pri le-vgo" data-l="scheck">' + t("scCheck") + " ↵</button></div>";
    ct.innerHTML = h;
  }
  sBtn(k, big) {
    const q = this.q; if (!q || q.ph === "shown" || !q.b) return; const b = q.b, d = (k.slice(-1) === "+" ? 1 : -1) * (big ? 5 : 1), w = k.slice(0, -1);
    if (w === "p") b.p = Math.max(0, Math.min(60, b.p + d)); else if (w === "n") { if (STUFEN_SCHALE[(q.opt && q.opt.lvl) | 0].nfix) return; b.n = Math.max(0, Math.min(80, b.n + d)); }
    else if (w === "s") { if (d > 0 && b.sh.length < 4) b.sh.push(0); else if (d < 0) b.sh.pop(); }
    else if (w[0] === "e") return this.sEl(+w.slice(1), d > 0 ? 1 : -1);
    tick(1); this.sDraw();
  }
  sEl(k, d) { const q = this.q; if (!q || q.ph === "shown" || !q.b || k >= q.b.sh.length) return; q.b.sh[k] = Math.max(0, Math.min(18, q.b.sh[k] + d)); tick(d > 0 ? 2 : 0); this.sDraw(); }
  sCheck() {
    const q = this.q; if (!q || this.view !== "quiz" || q.ph === "shown") return;
    const e = q.list[q.i].el, r = schaleBewerte(e, q.b); q.res.push({ ok: r.score === 5, score: r.score, parts: r.parts, el: e, b: { p: q.b.p, n: q.b.n, sh: q.b.sh.slice() } }); q.ph = "shown";
    const L = ["scP", "scN", "scSh", "scTot", "scDist"], soll = [e.z, neutronen(e), e.sch.length, e.z, e.sch.join(" · ")], ist = [q.b.p, q.b.n, q.b.sh.length, q.b.sh.reduce((s, x) => s + x, 0), q.b.sh.join(" · ") || "–"];
    const box = this.root.querySelector("#le-sres");
    box.innerHTML = '<div class="le-sfb"><div class="le-sfl">' + L.map((k, i) => '<div class="' + (r.parts[i] ? "le-vg" : "le-vb") + '"><i>' + (r.parts[i] ? "✓" : "✗") + "</i><span>" + t(k) + (i === 1 && STUFEN_SCHALE[(q.opt && q.opt.lvl) | 0].nfix ? ' <small class="le-dim">(' + t("scNfix") + ")</small>" : "") + "</span><b>" + ist[i] + (r.parts[i] ? "" : ' <small>→ ' + soll[i] + "</small>") + "</b></div>").join("") +
      '<p class="le-sgot">' + fmt(t("scGot"), { p: r.score }) + '</p></div><div class="le-scmp"><small>' + t("scRight") + "</small>" + schaleSvg({ p: e.z, n: neutronen(e), sh: e.sch }, { small: true }) + "</div></div>" +
      '<div class="le-btns"><button class="le-pri le-vgo" data-l="snext">' + t(q.i + 1 >= q.list.length ? "peEnd" : "peNext") + " ↵</button></div>";
    this.sDraw(); const sm = this.root.querySelector(".le-lhead b"); if (sm) sm.textContent = q.res.reduce((s, x) => s + x.score, 0);
    const bt = box.querySelector("button"); if (bt) { bt.focus(); bt.scrollIntoView({ block: "nearest" }); }
  }
  sNext() { const q = this.q; if (!q || q.ph !== "shown") return; q.i++; q.ph = "build"; q.b = null; if (q.i >= q.list.length) this.finish(); else this.renderSchaleQ(); }
  // ausklappbares Periodensystem: zu → Leiste; offen → ganzes System; Element gewählt → nur dessen Infos (ohne die Lösung)
  sPanel() {
    const P = this.root.querySelector("#le-spse"), S = this.spse; if (!P || !S) return;
    P.classList.toggle("le-sopen", S.open);
    if (!S.open) { P.innerHTML = '<button class="le-stab" data-l="spopen">▸ ' + t("spOpen") + "</button>"; return; }
    {
      P.innerHTML = '<div class="le-shead"><b>' + t("spOpen") + '</b><button data-l="spclose">×</button></div><p class="le-dim">' + t("spHint") + '</p><div class="le-ptab le-smini">' +
        ELEMENTE.map((e) => '<button class="le-pe" data-sp="' + e.z + '" style="grid-row:' + e.row + ";grid-column:" + e.col + ";--c:" + KATEG[e.kat].c + '" title="' + esc(e.name) + '"><small>' + e.z + "</small><b>" + e.sym + "</b></button>").join("") + "</div>";
      return;
    }
  }
  // Element gewählt (seit v0.19.6): Periodensystem klappt zu, die Infos kommen in ein verschiebbares Fenster an einer freien Stelle
  sPick(z) { const S = this.spse; if (!S) return; S.el = z; S.open = false; this.sPanel(); this.sFloat(); }
  sFloatClose() { const w = this.root.querySelector("#le-sfloat"); if (w) w.remove(); }
  sFloat() {
    const S = this.spse, host = this.root.querySelector("#le-lbody"); if (!S || !S.el || !host) return; this.sFloatClose();
    const e = ELEMENTE[S.el - 1], K = KATEG[e.kat], row = (k, v) => "<div><span>" + k + "</span><b>" + v + "</b></div>", mass = e.m % 1 ? String(e.m).replace(".", PR.lang === "en" ? "." : ",") : e.m;
    const gr = e.gr ? (e.haupt ? fmt(t("peHG"), { n: e.haupt }) : fmt(t("peNG"), { n: e.gr })) : tl(K.n);
    const bar = '<div class="le-wbar" data-wdrag><span>⠿</span><button data-l="spback">' + t("spBack") + '</button><button data-l="sfclose" title="Esc">×</button></div>';
    let h;
    if (S.lite) {   // Steckbrief auf Schwer: nur was auf einem gedruckten Periodensystem steht
      h = bar + '<div class="le-pcard"><div class="le-ptile" style="--c:' + K.c + '"><small>' + e.z + "</small><b>" + e.sym + "</b><i>" + mass + "</i></div><div><h3>" + esc(e.name) + '</h3><p class="le-dim">' + esc(tl(K.n)) + "</p></div></div>" +
        '<div class="le-prows">' + row(t("peZ"), e.z) + row(t("peM"), mass + " u") + "</div>";
    } else h = bar + '<div class="le-pcard"><div class="le-ptile" style="--c:' + K.c + '"><small>' + e.z + "</small><b>" + e.sym + "</b><i>" + mass + "</i></div><div><h3>" + esc(e.name) + '</h3><p class="le-dim">' + esc(tl(K.n)) + " · " + tl(ZUSTAND[e.zu]) + " " + t("peZu") + "</p></div></div>" +
      '<div class="le-prows">' + row(t("peZ"), e.z) + row(t("peM"), mass + " u") + row(t("pePer"), e.per) + row(t("peGr"), esc(gr)) + "</div>";   // ohne Wissens-Satz: das Fenster bleibt klein und verdeckt weniger
    host.insertAdjacentHTML("beforeend", '<div class="le-pinfo le-win le-pvis le-popen" id="le-sfloat">' + h + "</div>");
    const w = host.querySelector("#le-sfloat");
    // Gewichte: Bedienelemente und Eingabefelder am wichtigsten, die Modell-Grafik darf eher verdeckt werden
    this.winPlace(w, this.q && this.q.list[0] && this.q.list[0].art === "steck" ? "steck" : "schale",
      [[".le-sctl > *,.le-tf,#le-tbtn,#le-sres > *,#le-tres > *", 4], [".le-lhead,.le-dots,.le-swork > h3,.le-spse", 1.5], [".le-swork > p,#le-thow", 1], [".le-ssvg svg", 0.5]]);
  }
  // Fenster (Element-Infos) an die freieste Stelle im sichtbaren Bereich setzen und verschiebbar machen (seit v0.19.6).
  // avoid = [[Selektor, Gewicht], …] – was möglichst nicht verdeckt werden soll; keep = wird besonders geschont (z. B. das angeklickte Element). Einmal verschoben → bleibt dort.
  winPlace(w, kind, avoid, keep) {
    const host = this.root.querySelector("#le-lbody"); if (!w || !host) return; this.wpos = this.wpos || {};
    const W = host.clientWidth, H = host.clientHeight, st = host.scrollTop, bw = w.offsetWidth, bh = w.offsetHeight, hr = host.getBoundingClientRect();
    const clampX = (x) => Math.max(0, Math.min(W - bw, x)), clampY = (y) => Math.max(st, Math.min(st + Math.max(0, H - bh), y));
    let pos = this.wpos[kind];
    if (pos) pos = { x: clampX(pos.x), y: clampY(pos.y) };
    else {
      const A = [];
      avoid.forEach(([sel, k]) => host.querySelectorAll(sel).forEach((el) => { if (w.contains(el) || el.offsetParent === null) return; const r = el.getBoundingClientRect(); if (r.width && r.height) A.push({ r: r, k: el === keep ? 25 : k }); }));
      let best = null;
      for (let y = 0; y <= Math.max(0, H - bh); y += 10) for (let x = 0; x <= Math.max(0, W - bw); x += 10) {
        const ax = hr.left + x, ay = hr.top + y; let c = (x * 0.02 + y * 0.01);
        for (const a of A) { const ox = Math.min(ax + bw, a.r.right) - Math.max(ax, a.r.left); if (ox <= 0) continue; const oy = Math.min(ay + bh, a.r.bottom) - Math.max(ay, a.r.top); if (oy > 0) c += ox * oy * a.k; }
        if (!best || c < best.c) best = { c: c, x: x, y: y + st };
      }
      pos = best || { x: clampX(W - bw), y: st };
    }
    w.style.left = pos.x + "px"; w.style.top = pos.y + "px"; w.style.transformOrigin = "center top";
    const bar = w.querySelector("[data-wdrag]"); if (!bar) return;
    bar.addEventListener("pointerdown", (e) => {
      if (e.target.closest("button")) return; e.preventDefault(); bar.setPointerCapture(e.pointerId);
      const sx = e.clientX - w.offsetLeft, sy = e.clientY - w.offsetTop, W2 = host.clientWidth, H2 = host.clientHeight, st2 = host.scrollTop;
      const mv = (ev) => { const x = Math.max(0, Math.min(W2 - w.offsetWidth, ev.clientX - sx)), y = Math.max(st2, Math.min(st2 + Math.max(0, H2 - w.offsetHeight), ev.clientY - sy)); w.style.left = x + "px"; w.style.top = y + "px"; this.wpos[kind] = { x: x, y: y }; };
      const up = () => { bar.removeEventListener("pointermove", mv); bar.removeEventListener("pointerup", up); };
      bar.addEventListener("pointermove", mv); bar.addEventListener("pointerup", up);
    });
  }
  renderSchaleDone() {
    const q = this.q, w = q.w, st = STUFEN_SCHALE[(q.opt && q.opt.lvl) | 0], L = ["scP", "scN", "scSh", "scTot", "scDist"];
    const rows = q.res.map((r) => '<div class="le-sdone ' + (r.score === 5 ? "le-vg" : r.score ? "le-vh" : "le-vb") + '"><span class="le-pmini" style="--c:' + KATEG[r.el.kat].c + '">' + r.el.sym + "</span><b>" + esc(r.el.name) + '</b><span class="le-sicons">' + r.parts.map((ok, i) => '<i class="' + (ok ? "le-ok" : "le-no") + '" title="' + t(L[i]) + '">' + (ok ? "✓" : "✗") + "</i>").join("") + '</span><span class="le-vp">+' + r.score + "</span></div>").join("");
    this.body('<div class="le-done"><h2>' + t("lDone") + '</h2><div class="le-big">' + w.summe + "<small>/10</small></div>" +
      "<p>" + fmt(t("vPts"), { p: w.summe }) + (st.faktor > 1 ? ' · <span class="le-dim">' + fmt(t("vMult"), { s: tl(st.name), b: euro(w.basis), f: String(st.faktor).replace(".", PR.lang === "en" ? "." : ","), e: euro(w.euro) }) + "</span>" : "") + "</p>" +
      '<div class="le-earn">' + t("lEarn") + " <b>+" + euro(q.lohn) + "</b> <small>" + t("pToPend") + "</small></div>" + this.boostHtml() + '<p class="le-dim">' + pseTiers(st.faktor, w.summe) + "</p>" +
      '<div class="le-vresl">' + rows + '</div><p class="le-dim">' + L.map((k) => t(k)).join(" · ") + "</p>" + this.doneBtns() + "</div>");
  }
  // ---------- Länder raten (Erdkunde, seit v0.19.5) ----------
  kopt(set) {
    const u = store.get(KEYS.ui, {}), o = Object.assign({ karte: "europa", lvl: 0 }, u.karte || {});
    if (set) { Object.assign(o, set); u.karte = o; store.set(KEYS.ui, u); }
    if (!KARTEN.some((k) => k.id === o.karte)) o.karte = "europa"; if (!(o.lvl >= 0 && o.lvl <= 2)) o.lvl = 0; return o;
  }
  renderKarteSetup() {
    const f = this.f, th = this.th, o = this.kopt();
    this.body('<div class="le-lhead"><button data-l="fach">← ' + t("lBack") + '</button><i style="background:' + f.farbe + '">' + esc(f.kurz) + "</i><h2>" + esc(tl(th.name)) + "</h2></div>" + this.bonusBar(f) +
      '<div class="le-tset"><p>' + t("kIntro") + "</p><h4>" + t("kMap") + '</h4><div class="le-kmaps">' +
      KARTEN.map((k) => '<button data-km="' + k.id + '"' + (k.id === o.karte ? ' class="le-vsel"' : "") + "><b>" + esc(tl(k.name)) + "</b><small>" + anzahl(k.id) + " " + esc(tl(k.was)) + "</small></button>").join("") + "</div>" +
      '<div class="le-vlvl" id="le-klvl"></div><p class="le-dim">' + t("kPts") + '</p><p class="le-dim" id="le-ktiers"></p><div class="le-btns"><button class="le-pri le-vgo" data-l="vgo">Start ↵</button></div></div>');
    this.kLvlInfo();
  }
  kLvlInfo() {
    const o = this.kopt(), k = karte(o.karte), box = this.root.querySelector("#le-klvl"); if (!box) return;
    this.root.querySelectorAll("[data-km]").forEach((x) => x.classList.toggle("le-vsel", x.getAttribute("data-km") === o.karte));
    const st = k.stufen ? STUFEN_KARTE[o.lvl] : STUFEN_KARTE[0];
    box.innerHTML = k.stufen
      ? "<b>" + t("vLevel") + '</b><input type="range" data-kl min="0" max="2" step="1" value="' + o.lvl + '"><div class="le-vlab">' + STUFEN_KARTE.map((x) => '<span class="' + (x.id === o.lvl ? "le-vsel" : "") + '">' + esc(tl(x.name)) + "</span>").join("") + "</div><p><b>" + esc(tl(st.info)) + "</b> · " + (st.faktor > 1 ? '<em class="le-good">' + fmt(t("vBonusPct"), { p: Math.round((st.faktor - 1) * 100) }) + "</em>" : t("vBase")) + "</p>"
      : '<p class="le-dim">' + fmt(t(k.id === "deutschland" ? "kNoLvlDe" : "kNoLvl"), { n: anzahl(k.id) }) + "</p>";
    const ti = this.root.querySelector("#le-ktiers"); if (ti) ti.innerHTML = "<b>" + t("vRewards") + ":</b> " + pseTiers(st.faktor);
  }
  kName(id) { return landName(id, PR.lang); }
  renderKarteQ() {
    const q = this.q, f = this.f, k = karte(q.opt.karte); clearTimeout(this.tm);
    if (!q.map) {
      this.body('<p class="le-dim">' + t("kLoad") + "</p>");
      if (!q.loading) { q.loading = true; ladeKarte(k.id).then((m) => { q.map = m; if (this.q === q && this.view === "quiz") this.renderKarteQ(); }).catch(() => { this.body('<p class="le-bad">' + t("kErr") + "</p>"); }); }
      return;
    }
    const m = q.map, lvl = k.stufen ? esc(tl(STUFEN_KARTE[q.opt.lvl | 0].name)) + " · " : "";
    q.ph = q.ph === "shown" ? "shown" : "ask";
    const svg = '<svg class="le-ksvg" viewBox="0 0 ' + m.w + " " + m.h + '" preserveAspectRatio="xMidYMid meet">' + m.f.map((x) => '<path d="' + x.d + '"' + (x.id ? ' data-ld="' + x.id + '"' : "") + "/>").join("") + '<g id="le-kring"></g></svg>';
    this.body('<div class="le-kq"><div class="le-lhead"><i style="background:' + f.farbe + '">' + esc(f.kurz) + "</i><h2>" + esc(tl(this.th.name)) + " · " + esc(tl(k.name)) + '</h2><span class="le-sp"></span><span class="le-dim">' + lvl + '<b id="le-ksum"></b> / 10</span></div>' +
      '<div class="le-dots" id="le-kdots"></div><p class="le-dim le-khint" id="le-khint"></p><div class="le-kwrap" id="le-kwrap">' + svg + '<div class="le-kpop" id="le-kpop" hidden></div></div></div>');
    const wrap = this.root.querySelector("#le-kwrap");
    // Fenster verschieben (an der Kopfzeile ziehen)
    wrap.addEventListener("pointerdown", (e) => {
      const h = e.target.closest(".le-kdrag"); if (!h) return; const pop = this.root.querySelector("#le-kpop"), r0 = wrap.getBoundingClientRect(), sx = e.clientX - pop.offsetLeft, sy = e.clientY - pop.offsetTop;
      h.setPointerCapture(e.pointerId); e.preventDefault();
      const mv = (ev) => { const x = Math.max(0, Math.min(r0.width - pop.offsetWidth, ev.clientX - sx)), y = Math.max(0, Math.min(r0.height - pop.offsetHeight, ev.clientY - sy)); pop.style.left = x + "px"; pop.style.top = y + "px"; q.kpos = { x: x, y: y }; };
      const up = () => { h.removeEventListener("pointermove", mv); h.removeEventListener("pointerup", up); };
      h.addEventListener("pointermove", mv); h.addEventListener("pointerup", up);
    });
    this.kMark();
  }
  // Ziel pulsieren lassen, beantwortete Länder einfärben, Punkte/Fortschritt oben
  kMark() {
    const q = this.q, sv = this.root.querySelector(".le-ksvg"); if (!sv) return; const cur = q.list[q.i] && q.list[q.i].id, m = q.map;
    const done = {}; q.res.forEach((r) => { done[r.id] = r.score >= 1 ? "le-kok" : r.score > 0 ? "le-khalf" : "le-kno"; });
    sv.querySelectorAll("[data-ld]").forEach((p) => { const id = p.getAttribute("data-ld"); p.setAttribute("class", id === cur && q.ph !== "shown" ? "le-kt" : done[id] || (id === cur ? "le-kcur" : "")); });
    const ring = sv.querySelector("#le-kring"); ring.innerHTML = "";
    const tp = cur && sv.querySelector('[data-ld="' + cur + '"]');
    if (tp) {
      const fx = m.f.find((x) => x.id === cur), bb = tp.getBBox(), small = fx.s || Math.max(bb.width, bb.height) < m.w * 0.014, r = m.w * 0.016;
      if (small) ring.innerHTML = '<circle class="le-kr' + (q.ph === "shown" ? "" : " le-krp") + '" cx="' + fx.x + '" cy="' + fx.y + '" r="' + r + '"/><circle class="le-khit" data-ld="' + cur + '" cx="' + fx.x + '" cy="' + fx.y + '" r="' + r * 1.6 + '"/>';
    }
    const sum = q.res.reduce((s, x) => s + x.score, 0), S = this.root.querySelector("#le-ksum"); if (S) S.textContent = num(sum, sum % 1 ? 1 : 0);
    const D = this.root.querySelector("#le-kdots"); if (D) D.innerHTML = q.list.map((x, k) => '<i class="' + (k < q.res.length ? (q.res[k].score >= 1 ? "le-ok" : q.res[k].score ? "le-half" : "le-no") : k === q.i ? "le-now" : "") + '"></i>').join("");
    const H = this.root.querySelector("#le-khint"); if (H) H.textContent = fmt(t("kRound"), { i: Math.min(q.i + 1, q.list.length), n: q.list.length }) + " · " + t(q.opt.karte === "deutschland" ? "kClickDe" : "kClick");
  }
  kClick(id, e) {
    const q = this.q; if (!q || this.view !== "quiz" || q.ph === "shown" || id !== q.list[q.i].id) return;
    const wrap = this.root.querySelector("#le-kwrap").getBoundingClientRect(); this.kOpen(e.clientX - wrap.left + 14, e.clientY - wrap.top - 20);
  }
  // Fenster zum Eintippen öffnen (an der Klickstelle bzw. dort, wohin es zuletzt geschoben wurde)
  kOpen(x, y) {
    const q = this.q, pop = this.root.querySelector("#le-kpop"), wrap = this.root.querySelector("#le-kwrap"); if (!pop || !wrap) return;
    if (x == null) { const sv = this.root.querySelector(".le-ksvg"), fx = q.map.f.find((f) => f.id === q.list[q.i].id), pt = sv.createSVGPoint(); pt.x = fx.x; pt.y = fx.y; const s = pt.matrixTransform(sv.getScreenCTM()), r = wrap.getBoundingClientRect(); x = s.x - r.left + 14; y = s.y - r.top - 20; }
    if (q.kpos) { x = q.kpos.x; y = q.kpos.y; }
    pop.hidden = false;
    pop.innerHTML = '<div class="le-kdrag"><span>⠿</span> ' + t(q.opt.karte === "deutschland" ? "kAskDe" : "kAsk") + '<button data-l="kclose" title="Esc">×</button></div><div class="le-kin"><input id="le-kans" type="text" autocomplete="off" spellcheck="false" maxlength="40"><button class="le-pri" data-l="kok">' + t("lOk") + ' ↵</button></div><div id="le-kfb"></div>';
    const r = wrap.getBoundingClientRect(); pop.style.left = Math.max(0, Math.min(r.width - pop.offsetWidth, x)) + "px"; pop.style.top = Math.max(0, Math.min(r.height - pop.offsetHeight, y)) + "px";
    const ip = pop.querySelector("#le-kans"); setTimeout(() => ip.focus(), 0);
  }
  kClose() { const pop = this.root.querySelector("#le-kpop"); if (pop) pop.hidden = true; }
  kCheck() {
    const q = this.q, ip = this.root.querySelector("#le-kans"); if (!q || q.ph === "shown" || !ip) return; const v = ip.value.trim(); if (!v) return;
    const id = q.list[q.i].id, p = landBewerte(id, v), score = p === 2 ? 1 : p === 1 ? 0.5 : 0; q.res.push({ id: id, e: v, score: score }); q.ph = "shown"; tick(score ? 2 : 0);
    ip.disabled = true; ip.classList.add(score >= 1 ? "le-good" : score ? "le-half" : "le-bad");
    const nm = esc(this.kName(id)), fb = this.root.querySelector("#le-kfb");
    fb.innerHTML = '<p class="' + (score >= 1 ? "le-good" : score ? "le-khalft" : "le-bad") + '">' + (score >= 1 ? "✓ " + fmt(t("kRight"), { n: nm }) : score ? "≈ " + fmt(t("kTypo"), { n: nm }) : "✗ " + fmt(t("kWrong"), { n: nm })) + '</p><div class="le-btns"><button class="le-pri le-vgo" data-l="knext">' + t(q.i + 1 >= q.list.length ? "kEnd" : "kNext") + " ↵</button></div>";
    const kok = this.root.querySelector("[data-l=kok]"); if (kok) kok.disabled = true;
    this.kMark(); const bt = fb.querySelector("button"); if (bt) bt.focus();
  }
  kNext() { const q = this.q; if (!q || q.ph !== "shown") return; q.i++; q.ph = "ask"; this.kClose(); if (q.i >= q.list.length) this.finish(); else this.kMark(); }
  renderKarteDone() {
    const q = this.q, w = q.w, k = karte(q.opt.karte), st = k.stufen ? STUFEN_KARTE[q.opt.lvl | 0] : STUFEN_KARTE[0], pts = (s) => (s >= 1 ? "+1" : s ? "+½" : "0");
    const rows = q.res.map((r) => '<div class="' + (r.score >= 1 ? "le-vg" : r.score ? "le-vh" : "le-vb") + '"><i>' + (r.score >= 1 ? "✓" : r.score ? "≈" : "✗") + "</i><span>" + esc(this.kName(r.id)) + "</span><b>" + (r.score >= 1 ? "" : esc(r.e) + " ") + '<small>' + pts(r.score) + "</small></b></div>").join("");
    const sum = num(w.summe, w.summe % 1 ? 1 : 0);
    this.body('<div class="le-done"><h2>' + t("lDone") + '</h2><div class="le-big">' + sum + "<small>/10</small></div>" +
      "<p>" + esc(tl(k.name)) + " · " + fmt(t("vPts"), { p: sum }) + (st.faktor > 1 ? ' · <span class="le-dim">' + fmt(t("vMult"), { s: tl(st.name), b: euro(w.basis), f: String(st.faktor).replace(".", PR.lang === "en" ? "." : ","), e: euro(w.euro) }) + "</span>" : "") + "</p>" +
      '<div class="le-earn">' + t("lEarn") + " <b>+" + euro(q.lohn) + "</b> <small>" + t("pToPend") + "</small></div>" + this.boostHtml() + '<p class="le-dim">' + pseTiers(st.faktor, w.summe) + "</p>" +
      '<div class="le-sfl le-tdone le-kdone">' + rows + "</div>" + this.doneBtns() + "</div>");
  }
  // ---------- Element-Steckbrief (Chemie, seit v0.19.4) ----------
  topt(set) {
    const u = store.get(KEYS.ui, {}), o = Object.assign({ lvl: 0 }, u.steck || {});
    if (set) { Object.assign(o, set); u.steck = o; store.set(KEYS.ui, u); }
    if (!(o.lvl >= 0 && o.lvl <= 2)) o.lvl = 0; return o;
  }
  renderSteckSetup() {
    const f = this.f, th = this.th, o = this.topt();
    this.body('<div class="le-lhead"><button data-l="fach">← ' + t("lBack") + '</button><i style="background:' + f.farbe + '">' + esc(f.kurz) + "</i><h2>" + esc(tl(th.name)) + "</h2></div>" + this.bonusBar(f) +
      '<div class="le-tset"><p>' + t("stIntro") + "</p><h4>" + t("stPts") + '</h4><ul class="le-slist">' + STECK_FELDER.map((k) => "<li><b>" + t("st_" + k) + '</b> <span class="le-dim">' + t("stx_" + k) + "</span></li>").join("") +
      '<li><b class="le-good">' + t("stBonus") + "</b></li></ul>" +
      '<div class="le-vlvl"><b>' + t("vLevel") + '</b><input type="range" data-tl min="0" max="2" step="1" value="' + o.lvl + '"><div class="le-vlab">' + STUFEN_STECK.map((x) => '<span data-tls="' + x.id + '">' + esc(tl(x.name)) + "</span>").join("") + '</div><p id="le-tlinfo"></p></div>' +
      '<p class="le-dim" id="le-ttiers"></p><div class="le-btns"><button class="le-pri le-vgo" data-l="vgo">Start ↵</button></div></div>');
    this.tLvlInfo();
  }
  tLvlInfo() {
    const o = this.topt(), st = STUFEN_STECK[o.lvl];
    this.root.querySelectorAll("[data-tls]").forEach((x) => x.classList.toggle("le-vsel", +x.getAttribute("data-tls") === o.lvl));
    const inf = this.root.querySelector("#le-tlinfo"); if (inf) inf.innerHTML = "<b>" + esc(tl(st.info)) + "</b> · " + (st.faktor > 1 ? '<em class="le-good">' + fmt(t("vBonusPct"), { p: Math.round((st.faktor - 1) * 100) }) + "</em>" : t("vBase"));
    const ti = this.root.querySelector("#le-ttiers"); if (ti) ti.innerHTML = "<b>" + t("vRewards") + ":</b> " + pseTiers(st.faktor);
  }
  renderSteckQ() {
    const q = this.q, f = this.f, e = q.list[q.i].el, st = STUFEN_STECK[(q.opt && q.opt.lvl) | 0]; clearTimeout(this.tm);
    if (!q.inp) { q.inp = {}; STECK_FELDER.forEach((k) => { q.inp[k] = ""; }); q.ph = "ask"; }
    this.spse = { open: false, el: null, lite: !st.voll };
    const fld = (k) => '<div class="le-tf" data-tfk="' + k + '"><label for="le-si-' + k + '">' + t("st_" + k) + "</label>" + (k === "hg"
      ? '<div class="le-thg">' + ROEM.map((r, i) => '<button data-hg="' + (i + 1) + '"' + (+q.inp.hg === i + 1 ? ' class="le-vsel"' : "") + ">" + r + "</button>").join("") + "</div>"
      : '<input id="le-si-' + k + '" data-si="' + k + '" type="text" autocomplete="off" spellcheck="false" maxlength="' + (k === "sym" ? 3 : 4) + '"' + (k === "sym" ? "" : ' inputmode="numeric"') + ' value="' + esc(q.inp[k]) + '">') + '<small class="le-tfr"></small></div>';
    this.body('<div class="le-lhead"><i style="background:' + f.farbe + '">' + esc(f.kurz) + "</i><h2>" + esc(tl(this.th.name)) + '</h2><span class="le-sp"></span><span class="le-dim">' + esc(tl(st.name)) + " · max. 10</span></div>" +
      '<div class="le-sbuild"><div class="le-swork"><h3>' + fmt(t("stTask"), { n: "<b>" + esc(e.name) + "</b>" }) + '</h3><div class="le-tgrid">' + STECK_FELDER.map(fld).join("") + "</div>" +
      '<div id="le-tres"></div><p class="le-dim le-shelp" id="le-thow">' + t("stHow") + '</p><div class="le-btns" id="le-tbtn"><button class="le-pri le-vgo" data-l="tcheck">' + t("stCheck") + " ↵</button></div></div>" +
      '<div class="le-spse" id="le-spse"></div></div>');
    this.sPanel(); const ip = this.root.querySelector("[data-si=sym]"); if (ip) setTimeout(() => ip.focus(), 0);
  }
  tHg(n) {
    const q = this.q; if (!q || !q.inp || q.ph === "shown") return; q.inp.hg = +q.inp.hg === n ? "" : n; tick(1);
    this.root.querySelectorAll("[data-hg]").forEach((b) => b.classList.toggle("le-vsel", +b.getAttribute("data-hg") === +q.inp.hg));
    if (q.inp.hg) this.tNextField("hg");
  }
  // Enter / Hauptgruppe gewählt → nächstes Eingabefeld; nach dem letzten wird geprüft
  tNextField(k) {
    const i = STECK_FELDER.indexOf(k), nx = STECK_FELDER.slice(i + 1).find((x) => x !== "hg");
    if (!nx) { this.tCheck(); return; }
    const ip = this.root.querySelector('[data-si="' + nx + '"]'); if (ip) ip.focus();
  }
  tCheck() {
    const q = this.q; if (!q || this.view !== "quiz" || !q.inp || q.ph === "shown") return;
    this.root.querySelectorAll("[data-si]").forEach((x) => { q.inp[x.getAttribute("data-si")] = x.value.trim(); });
    const e = q.list[q.i].el, r = steckBewerte(e, q.inp), soll = steckSoll(e); q.ph = "shown";
    if (r.parts[0]) q.inp.sym = soll.sym;   // richtiges Symbol in richtiger Schreibweise anzeigen
    q.res.push({ ok: r.alle, score: r.score, parts: r.parts, alle: r.alle, el: e, inp: Object.assign({}, q.inp) });
    STECK_FELDER.forEach((k, i) => {
      const box = this.root.querySelector('[data-tfk="' + k + '"]'); if (!box) return; box.classList.add(r.parts[i] ? "le-vg" : "le-vb");
      box.querySelectorAll("input,button").forEach((x) => { x.disabled = true; });
      if (k === "sym" && r.parts[i]) { const ip = box.querySelector("input"); if (ip) ip.value = soll.sym; }
      const sv = k === "hg" ? ROEM[soll.hg - 1] : soll[k]; box.querySelector(".le-tfr").textContent = r.parts[i] ? "✓" : "✗ → " + sv;
    });
    this.root.querySelector("#le-tres").innerHTML = '<p class="le-sgot">' + fmt(t("stGot"), { p: r.score }) + (r.alle ? ' · <span class="le-good">' + t("stAll") + "</span>" : "") + "</p>";
    const how = this.root.querySelector("#le-thow"); if (how) how.remove();
    this.root.querySelector("#le-tbtn").innerHTML = '<button class="le-pri le-vgo" data-l="tend">' + t("stEnd") + " ↵</button>";
    const bt = this.root.querySelector("[data-l=tend]"); if (bt) { bt.focus(); bt.scrollIntoView({ block: "nearest" }); }
  }
  renderSteckDone() {
    const q = this.q, w = q.w, st = STUFEN_STECK[(q.opt && q.opt.lvl) | 0], r = q.res[0], soll = steckSoll(r.el);
    const rows = STECK_FELDER.map((k, i) => { const ist = k === "hg" ? (r.inp.hg ? ROEM[r.inp.hg - 1] : "–") : (r.inp[k] || "–"), sv = k === "hg" ? ROEM[soll.hg - 1] : soll[k];
      return '<div class="' + (r.parts[i] ? "le-vg" : "le-vb") + '"><i>' + (r.parts[i] ? "✓" : "✗") + "</i><span>" + t("st_" + k) + "</span><b>" + esc(String(ist)) + (r.parts[i] ? "" : " <small>→ " + sv + "</small>") + "</b></div>"; }).join("") +
      '<div class="' + (r.alle ? "le-vg" : "le-vb") + '"><i>' + (r.alle ? "✓" : "✗") + "</i><span>" + t("stBonus") + "</span><b>" + (r.alle ? "+1" : "0") + "</b></div>";
    this.body('<div class="le-done"><h2>' + t("lDone") + '</h2><div class="le-big">' + w.summe + "<small>/10</small></div>" +
      '<p><span class="le-pmini" style="--c:' + KATEG[r.el.kat].c + '">' + r.el.sym + "</span> <b>" + esc(r.el.name) + "</b> · " + fmt(t("vPts"), { p: w.summe }) + (st.faktor > 1 ? ' · <span class="le-dim">' + fmt(t("vMult"), { s: tl(st.name), b: euro(w.basis), f: String(st.faktor).replace(".", PR.lang === "en" ? "." : ","), e: euro(w.euro) }) + "</span>" : "") + "</p>" +
      '<div class="le-earn">' + t("lEarn") + " <b>+" + euro(q.lohn) + "</b> <small>" + t("pToPend") + "</small></div>" + this.boostHtml() + '<p class="le-dim">' + pseTiers(st.faktor, w.summe) + "</p>" +
      '<div class="le-sfl le-tdone">' + rows + "</div>" + this.doneBtns() + "</div>");
  }
  // ---------- Periodensystem (Chemie, seit v0.19.1) ----------
  popt(set) {
    const u = store.get(KEYS.ui, {}), o = Object.assign({ lvl: 0, el: 1 }, u.pse || {});
    if (set) { Object.assign(o, set); u.pse = o; store.set(KEYS.ui, u); }
    if (!(o.lvl >= 0 && o.lvl <= 2)) o.lvl = 0; return o;
  }
  renderPseSetup() {
    const f = this.f, th = this.th, o = this.popt();
    const tiles = ELEMENTE.map((e) => '<button class="le-pe" data-pe="' + e.z + '" style="grid-row:' + e.row + ";grid-column:" + e.col + ";--c:" + KATEG[e.kat].c + '" title="' + esc(e.name) + '"><small>' + e.z + "</small><b>" + e.sym + "</b></button>").join("") +
      '<div class="le-pph" style="grid-row:6;grid-column:3;--c:' + KATEG.la.c + '">57–71</div><div class="le-pph" style="grid-row:7;grid-column:3;--c:' + KATEG.ac.c + '">89–103</div>' +
      '<div class="le-plab" style="grid-row:9;grid-column:1/3">' + t("peLa") + '</div><div class="le-plab" style="grid-row:10;grid-column:1/3">' + t("peAc") + "</div>";
    const legend = Object.keys(KATEG).map((k) => '<span class="le-lg"><i style="background:' + KATEG[k].c + '"></i>' + esc(tl(KATEG[k].n)) + "</span>").join("");
    this.body('<div class="le-lhead"><button data-l="fach">← ' + t("lBack") + '</button><i style="background:' + f.farbe + '">' + esc(f.kurz) + "</i><h2>" + esc(tl(th.name)) + "</h2></div>" +
      '<p class="le-dim le-phint">' + t("peHint") + '</p><div class="le-pse"><div class="le-ptab">' + tiles + '</div></div><div class="le-legend le-plg">' + legend + "</div>" +
      '<div class="le-pctl"><div class="le-vlvl"><b>' + t("vLevel") + '</b><input type="range" data-pl min="0" max="2" step="1" value="' + o.lvl + '"><div class="le-vlab">' + STUFEN_PSE.map((x) => '<span data-pls="' + x.id + '">' + esc(tl(x.name)) + "</span>").join("") + '</div><p id="le-plinfo"></p></div>' +
      '<div><p class="le-dim" id="le-ptiers"></p><p class="le-dim">' + t("peRules") + '</p><div class="le-btns"><button class="le-pri le-vgo" data-l="vgo">Start ↵</button></div></div></div><div class="le-pinfo le-win" id="le-pinfo"></div>');
    this.pLvlInfo();
  }
  pLvlInfo() {
    const o = this.popt(), st = STUFEN_PSE[o.lvl], pool = new Set(psePool(o.lvl).map((e) => e.z));
    this.root.querySelectorAll("[data-pls]").forEach((x) => x.classList.toggle("le-vsel", +x.getAttribute("data-pls") === o.lvl));
    this.root.querySelectorAll("[data-pe]").forEach((x) => x.classList.toggle("le-pdim", !pool.has(+x.getAttribute("data-pe"))));
    const inf = this.root.querySelector("#le-plinfo"); if (inf) inf.innerHTML = "<b>" + esc(tl(st.info)) + "</b> · " + (st.faktor > 1 ? '<em class="le-good">' + fmt(t("vBonusPct"), { p: Math.round((st.faktor - 1) * 100) }) + "</em>" : t("vBase")) + '<br><small class="le-dim">' + t("pePool") + "</small>";
    const ti = this.root.querySelector("#le-ptiers"); if (ti) ti.innerHTML = "<b>" + t("vRewards") + ":</b> " + pseTiers(st.faktor);
  }
  // Element aufklappen: alle wichtigen Infos (Niveau Klasse 8)
  pShow(z) {
    const e = ELEMENTE[z - 1], box = this.root.querySelector("#le-pinfo"); if (!e || !box) return;
    const tl2 = this.root.querySelector('[data-pe="' + z + '"]');
    if (tl2 && tl2.classList.contains("le-on") && box.classList.contains("le-pvis")) { this.pClose(); return; }   // gleiches Element nochmal: zuklappen
    this.root.querySelectorAll(".le-pe.le-on").forEach((x) => x.classList.remove("le-on")); if (tl2) tl2.classList.add("le-on");
    const K = KATEG[e.kat], row = (k, v) => "<div><span>" + k + "</span><b>" + v + "</b></div>", mass = e.m % 1 ? String(e.m).replace(".", PR.lang === "en" ? "." : ",") : e.m;
    const gr = e.gr ? (e.haupt ? fmt(t("peHG"), { n: e.haupt }) : fmt(t("peNG"), { n: e.gr })) : tl(K.n);
    box.innerHTML = '<div class="le-wbar" data-wdrag><span>⠿</span>' + esc(e.name) + '<button data-l="pclose" title="Esc">×</button></div><div class="le-pcard"><div class="le-ptile" style="--c:' + K.c + '"><small>' + e.z + "</small><b>" + e.sym + "</b><i>" + mass + "</i></div><div><h3>" + esc(e.name) + "</h3>" +
      '<p class="le-dim">' + esc(tl(K.n)) + " · " + tl(ZUSTAND[e.zu]) + " " + t("peZu") + (e.radio ? ' · <em class="le-prad">' + t("peRad") + "</em>" : "") + "</p></div></div>" +
      '<div class="le-prows">' + row(t("peZ"), e.z + ' <small class="le-dim">' + t("peZs") + "</small>") + row(t("peM"), mass + " u") + row(t("peN"), "ca. " + Math.max(0, Math.round(e.m) - e.z)) +
      row(t("pePer") + " / " + t("peGr"), e.per + " / " + esc(gr)) + (valenz(e) ? row(t("peVal"), valenz(e)) : "") + row(t("peSch"), e.sch.join(" · ")) + "</div>" +
      '<div class="le-pbohr">' + bohr(e) + '<p>' + esc(e.fakt) + "</p></div>";
    // seit v0.19.6: verschiebbar; öffnet an der freiesten Stelle (das angeklickte Element bleibt sichtbar) oder dort, wohin es zuletzt geschoben wurde
    box.classList.add("le-pvis"); box.classList.remove("le-popen"); void box.offsetWidth; box.classList.add("le-popen");
    this.winPlace(box, "pse", [[".le-pe,.le-pph,.le-plab", 1], [".le-lhead,.le-phint,.le-plg", 1.5], [".le-pctl > *", 2]], tl2);
  }
  pClose() { const box = this.root.querySelector("#le-pinfo"); if (box) box.classList.remove("le-pvis", "le-popen"); this.root.querySelectorAll(".le-pe.le-on").forEach((x) => x.classList.remove("le-on")); }
  renderPseQ() {
    const q = this.q, f = this.f, a = q.list[q.i], e = a.el, K = KATEG[e.kat], r = q.ph === "shown" ? q.res[q.res.length - 1] : null; clearTimeout(this.tm);
    const sum = q.res.reduce((s, x) => s + x.score, 0), dots = q.list.map((x, k) => '<i class="' + (k < q.res.length ? (q.res[k].score === 2 ? "le-ok" : q.res[k].score ? "le-half" : "le-no") : k === q.i ? "le-now" : "") + '"></i>').join("");
    const st = STUFEN_PSE[(q.opt && q.opt.lvl) | 0];
    let fb = "";
    if (r) fb = '<div class="le-pfb ' + (r.score === 2 ? "le-vg" : r.score ? "le-vh" : "le-vb") + '"><b>' + t(r.score === 2 ? "peRight" : r.score ? "peTypo" : "peWrong") + "</b><span>" + fmt(t("peIs"), { s: e.sym, n: "<b>" + esc(e.name) + "</b>" }) + (e.alt.length > 1 ? ' <small class="le-dim">(' + esc(e.alt.slice(1).join(", ")) + ")</small>" : "") +
      ' · <span class="le-dim">' + t("peZ") + " " + e.z + " · " + esc(tl(K.n)) + "</span></span></div>" +
      '<div class="le-btns"><button class="le-pri le-vgo" data-l="pnext">' + t(q.i + 1 >= q.list.length ? "peEnd" : "peNext") + " ↵</button></div>";
    this.body('<div class="le-lhead"><i style="background:' + f.farbe + '">' + esc(f.kurz) + "</i><h2>" + esc(tl(this.th.name)) + '</h2><span class="le-sp"></span><span class="le-dim">' + esc(tl(st.name)) + " · <b>" + sum + "</b> / 10</span></div>" +
      '<div class="le-pq"><div class="le-dots">' + dots + '</div><p class="le-dim">' + fmt(t("peRound"), { i: q.i + 1, n: q.list.length }) + '</p><div class="le-ptile le-pbig" style="--c:' + K.c + '"><b>' + e.sym + "</b></div>" +
      "<h3>" + fmt(t("peQ"), { s: "<b>" + e.sym + "</b>" }) + "</h3>" +
      '<div class="le-pin"><input type="text" id="le-pans" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="40"' + (r ? ' disabled value="' + esc(r.e) + '"' : "") + ">" + (r ? "" : '<button class="le-pri" data-l="pchk">' + t("peCheck") + " ↵</button>") + "</div>" + fb + "</div>");
    if (!r) { const ip = this.root.querySelector("#le-pans"); if (ip) setTimeout(() => ip.focus(), 0); }
    else { const b = this.root.querySelector('[data-l="pnext"]'); if (b) setTimeout(() => b.focus(), 0); }
  }
  pCheck(viaBtn) {
    const q = this.q; if (!q || this.view !== "quiz" || q.ph === "shown") return;
    const ip = this.root.querySelector("#le-pans"), v = ip ? ip.value.trim() : ""; if (!v && !viaBtn) return;
    const e = q.list[q.i].el, sc = pseBewerte(e, v); q.res.push({ ok: sc === 2, score: sc, el: e, e: v || "–" }); q.ph = "shown"; this.renderPseQ();
  }
  pNext() { const q = this.q; if (!q || q.ph !== "shown") return; q.i++; q.ph = "ask"; if (q.i >= q.list.length) this.finish(); else this.renderPseQ(); }
  renderPseDone() {
    const q = this.q, w = q.w, st = STUFEN_PSE[(q.opt && q.opt.lvl) | 0];
    const rows = q.res.map((r) => '<div class="le-vres ' + (r.score === 2 ? "le-vg" : r.score ? "le-vh" : "le-vb") + '"><b><span class="le-pmini" style="--c:' + KATEG[r.el.kat].c + '">' + r.el.sym + "</span></b><span>" + esc(r.e) + "</span><span>" + esc(r.el.name) + '</span><span class="le-vp">' + (r.score ? "+" + r.score : "0") + "</span></div>").join("");
    this.body('<div class="le-done"><h2>' + t("lDone") + '</h2><div class="le-big">' + w.summe + "<small>/10</small></div>" +
      "<p>" + fmt(t("vPts"), { p: w.summe }) + (st.faktor > 1 ? ' · <span class="le-dim">' + fmt(t("vMult"), { s: tl(st.name), b: euro(w.basis), f: String(st.faktor).replace(".", PR.lang === "en" ? "." : ","), e: euro(w.euro) }) + "</span>" : "") + "</p>" +
      '<div class="le-earn">' + t("lEarn") + " <b>+" + euro(q.lohn) + "</b> <small>" + t("pToPend") + "</small></div>" + this.boostHtml() + '<p class="le-dim">' + pseTiers(st.faktor, w.summe) + "</p>" +
      '<div class="le-vresl">' + rows + "</div>" + this.doneBtns() + "</div>");
  }
  // ---------- Vokabeltest (Englisch seit v0.15, Spanisch seit v0.20.3) ----------
  // Sprache des Themas (th.vok), Englisch wenn nicht angegeben
  vk() { return (this.th && this.th.vok) || VOK_EN; }
  // Einstellungen (Themengebiet, Schwierigkeit) – gemerkt in leaarn-ui-v1 → vok (Englisch) bzw. th.optKey (z. B. vokEs)
  vopt(set) {
    const key = (this.th && this.th.optKey) || "vok", u = store.get(KEYS.ui, {}), o = Object.assign({ kat: "alle", lvl: 0 }, u[key] || {});
    if (set) { Object.assign(o, set); u[key] = o; store.set(KEYS.ui, u); }
    if (!(o.lvl >= 0 && o.lvl <= 2)) o.lvl = 0;
    return o;
  }
  renderSetup() {
    const f = this.f, th = this.th, o = this.vopt(), V = this.vk(), cnt = (id) => V.bereich(id).length;
    const btn = (id, name) => '<button data-vk="' + id + '" aria-pressed="' + (o.kat === id) + '"><b>' + esc(name) + "</b><small>" + fmt(t("vN"), { n: cnt(id) }) + "</small></button>";
    const tiersTxt = '<p class="le-dim" id="le-vtiers"></p>';
    this.body('<div class="le-lhead"><button data-l="fach">← ' + t("lBack") + '</button><i style="background:' + f.farbe + '">' + esc(f.kurz) + "</i><h2>" + esc(tl(th.name)) + "</h2></div>" +
      '<div class="le-vset"><div class="le-vcol"><h4>' + t("vArea") + '</h4><div class="le-vkat">' + btn("alle", t("vAll")) + KAT.map((k) => btn("k:" + k.id, tl(k.name))).join("") + "</div>" +
      "<h4>" + t("vTypes") + '</h4><div class="le-vkat">' + WORTARTEN.map((w) => btn("w:" + w.id, tl(w.name))).join("") + "</div></div>" +
      '<div class="le-vcol le-vside"><h4>' + t("vLevel") + '</h4><div class="le-vlvl"><input type="range" data-vl min="0" max="2" step="1" value="' + o.lvl + '"><div class="le-vlab">' +
      STUFEN.map((s) => '<span data-vls="' + s.id + '">' + esc(tl(s.name)) + "</span>").join("") + '</div><p id="le-vlinfo"></p></div>' +
      "<h4>" + t("vRewards") + "</h4>" + tiersTxt + '<p class="le-dim">' + (th.regeln ? tl(th.regeln) : t("vRules")) + '</p><div class="le-btns"><button class="le-pri le-vgo" data-l="vgo">' + t("vGo") + " ↵</button></div></div></div>");
    this.vLvlInfo();
  }
  vLvlInfo() {
    const o = this.vopt(), list = this.vk().bereich(o.kat), p = stufenPool(list, o.lvl), st = STUFEN[o.lvl];
    this.root.querySelectorAll("[data-vls]").forEach((x) => x.classList.toggle("le-vsel", +x.getAttribute("data-vls") === o.lvl));
    const inf = this.root.querySelector("#le-vlinfo");
    if (inf) inf.innerHTML = "<b>" + t("vLvl" + o.lvl) + "</b> · " + (st.faktor > 1 ? '<em class="le-good">' + fmt(t("vBonusPct"), { p: Math.round((st.faktor - 1) * 100) }) + "</em>" : t("vBase")) + '<br><small class="le-dim">' + fmt(t("vRange"), { a: p.von, b: p.bis, n: list.length }) + "</small>";
    const ti = this.root.querySelector("#le-vtiers"); if (ti) ti.innerHTML = vokTiers(st.faktor);
  }
  renderVok() {
    const q = this.q, f = this.f; clearTimeout(this.tm);
    if (!q.vr) q.vr = q.list.map(() => null);
    const tag = (a) => { const k = ART_KURZ[a.p]; return k ? "<small>" + esc(tl(k)) + "</small>" : ""; };
    const rows = q.list.map((a, i) => '<div class="le-vrow" data-vrow="' + i + '"><span class="le-vnr">' + (i + 1) + '</span><div class="le-vq"><b>' + esc(a.frage) + "</b>" + tag(a) + "</div>" +
      '<input type="text" data-vi="' + i + '" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" maxlength="60" lang="' + (a.lang || "de") + '">' +
      '<button class="le-vok" data-vok="' + i + '" title="Enter">✓</button><span class="le-vpt"></span><div class="le-vsol"></div></div>').join("");
    const st = STUFEN[(q.opt && q.opt.lvl) | 0];
    this.body('<div class="le-lhead"><i style="background:' + f.farbe + '">' + esc(f.kurz) + "</i><h2>" + esc(tl(this.th.name)) + '</h2><span class="le-sp"></span><span class="le-dim">' + esc(tl(st.name)) + ' · <b id="le-vsum">0</b> / 10</span></div>' +
      '<div class="le-vlist">' + rows + '</div><p class="le-dim le-vhint">' + t("vHint") + '</p><div class="le-btns le-vendb" id="le-vend"></div>');
    const ip = this.root.querySelector('[data-vi="0"]'); if (ip) setTimeout(() => ip.focus(), 0);
  }
  // ein Wort bestätigen (per Knopf auch leer = „weiß nicht“), dann zum nächsten offenen Feld
  vConfirm(i, viaBtn) {
    const q = this.q; if (!q || this.view !== "quiz" || !q.vr || q.vr[i]) return;
    const a = q.list[i], ip = this.root.querySelector('[data-vi="' + i + '"]'), v = ip ? ip.value : "";
    if (!v.trim() && !viaBtn) return;
    const b = this.vk().bewerte(a, v); q.vr[i] = Object.assign({ e: v, a: a }, b);
    q.res.push({ ok: b.punkte >= 2, score: b.punkte, i: i });
    const row = this.root.querySelector('[data-vrow="' + i + '"]');
    if (row) {
      const cls = b.haupt ? (b.haupt.p === 2 ? "le-vg" : "le-vh") : "le-vb";
      row.classList.add("le-vdone", cls); ip.disabled = true; if (!v.trim()) ip.value = "– " + t("vSkip") + " –";
      row.querySelector(".le-vok").disabled = true;
      row.querySelector(".le-vpt").innerHTML = vPts(b);
      row.querySelector(".le-vsol").innerHTML = vSol(a, b);
    }
    const sum = q.res.reduce((s, x) => s + x.score, 0), se = this.root.querySelector("#le-vsum");
    if (se) { se.textContent = sum; se.classList.remove("le-bump"); void se.offsetWidth; se.classList.add("le-bump"); }
    const next = q.vr.findIndex((x, k) => !x && k > i), any = q.vr.findIndex((x) => !x), j = next >= 0 ? next : any;
    if (j >= 0) { const n = this.root.querySelector('[data-vi="' + j + '"]'); if (n) n.focus(); }
    else {
      const end = this.root.querySelector("#le-vend");
      if (end) { end.innerHTML = '<button class="le-pri le-vgo" data-l="vend">' + t("vEnd") + " ↵</button>"; const bt = end.querySelector("button"); if (bt) bt.focus(); }
    }
  }
  vEnd() { const q = this.q; if (!q || this.view !== "quiz" || !q.vr || !q.vr.every(Boolean)) return; this.finish(); }
  renderVokDone() {
    const q = this.q, w = q.w, st = STUFEN[(q.opt && q.opt.lvl) | 0];
    const rows = q.vr.map((r) => '<div class="le-vres ' + (r.haupt ? (r.haupt.p === 2 ? "le-vg" : "le-vh") : "le-vb") + '"><b>' + esc(r.a.frage) + "</b><span>" + (r.teile.length ? esc(r.teile.join(", ")) : "<em>" + t("vSkip") + "</em>") + "</span><span>" + vSol(r.a, r) + "</span>" + vPts(r) + "</div>").join("");
    this.body('<div class="le-done"><h2>' + t("lDone") + '</h2><div class="le-big">' + w.summe + '<small>/10</small></div>' +
      '<p>' + fmt(t("vPts"), { p: w.summe }) + (st.faktor > 1 ? ' · <span class="le-dim">' + fmt(t("vMult"), { s: tl(st.name), b: euro(w.basis), f: String(st.faktor).replace(".", PR.lang === "en" ? "." : ","), e: euro(w.euro) }) + "</span>" : "") + "</p>" +
      '<div class="le-earn">' + t("lEarn") + " <b>+" + euro(q.lohn) + "</b> <small>" + t("pToPend") + '</small></div>' + this.boostHtml() + '<p class="le-dim">' + vokTiers(st.faktor, w.summe) + "</p>" +
      '<div class="le-vresl">' + rows + "</div>" + this.doneBtns() + "</div>");
  }
  click(e) {
    const nv = e.target.closest("[data-nav]"); if (nv) { this.nav(nv.getAttribute("data-nav")); return; }
    const st = e.target.closest("[data-st]"); if (st) { if (this.stats.click(st)) this.render(); return; }
    const fb = e.target.closest("[data-f]"); if (fb) { const f = fach(fb.getAttribute("data-f")); if (f) { this.f = f; this.view = "fach"; this.render(); } return; }
    const tb = e.target.closest("[data-t]"); if (tb) { const th = this.f.themen.find((x) => x.id === tb.getAttribute("data-t")); if (th) { if (th.setup) { this.th = th; this.view = "setup"; this.render(); } else this.start(th); } return; }
    const sb = e.target.closest("[data-sb]"); if (sb) { this.sBtn(sb.getAttribute("data-sb"), e.shiftKey); return; }
    const rg = e.target.closest("[data-ring]"); if (rg) { this.sEl(+rg.getAttribute("data-ring"), 1); return; }
    const km = e.target.closest("[data-km]"); if (km) { this.kopt({ karte: km.getAttribute("data-km") }); this.kLvlInfo(); return; }
    const ld = e.target.closest("[data-ld]"); if (ld) { this.kClick(ld.getAttribute("data-ld"), e); return; }
    const hg = e.target.closest("[data-hg]"); if (hg) { this.tHg(+hg.getAttribute("data-hg")); return; }
    const spe = e.target.closest("[data-sp]"); if (spe) { this.sPick(+spe.getAttribute("data-sp")); return; }
    const pe = e.target.closest("[data-pe]"); if (pe) { const z = +pe.getAttribute("data-pe"); this.popt({ el: z }); this.pShow(z); return; }
    const vk = e.target.closest("[data-vk]"); if (vk) { this.vopt({ kat: vk.getAttribute("data-vk") }); this.renderSetup(); return; }
    const vb = e.target.closest("[data-vok]"); if (vb) { this.vConfirm(+vb.getAttribute("data-vok"), true); return; }
    const mc = e.target.closest("[data-mc]"); if (mc && this.view === "quiz") { const a = this.q.list[this.q.i]; this.submit(a.art === "wahrfalsch" ? mc.getAttribute("data-mc") === "1" : +mc.getAttribute("data-mc")); return; }
    const kb = e.target.closest("[data-k]"); if (kb) { this.padKey(kb.getAttribute("data-k")); return; }
    const b = e.target.closest("[data-l]"); if (!b) return; const a = b.getAttribute("data-l");
    if (a === "close") this.close();
    else if (a === "full") this.full(!this.isFull);
    else if (a === "collect" || a === "collect2") this.collect(b);
    else if (a === "gsub") this.gSubmit();
    else if (a === "gnext") this.gNext();
    else if (a === "vgo") this.start(this.th);
    else if (a === "vend") this.vEnd();
    else if (a === "pchk") this.pCheck(true);
    else if (a === "pnext") this.pNext();
    else if (a === "pclose") this.pClose();
    else if (a === "scheck") this.sCheck();
    else if (a === "tcheck") this.tCheck();
    else if (a === "kok") this.kCheck();
    else if (a === "knext") this.kNext();
    else if (a === "kclose") this.kClose();
    else if (a === "tend") this.finish();
    else if (a === "snext") this.sNext();
    else if (a === "spopen") { this.spse.open = true; this.spse.el = null; this.sPanel(); this.sFloatClose(); }
    else if (a === "spclose") { this.spse.open = false; this.sPanel(); }
    else if (a === "spback") { this.spse.open = true; this.spse.el = null; this.sPanel(); this.sFloatClose(); }
    else if (a === "sfclose") this.sFloatClose();
    else if (a === "vset") { this.view = "setup"; this.render(); }
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
    if (e.code === "Escape" && this.view === "quiz" && this.root.querySelector("#le-sfloat")) { this.sFloatClose(); return true; }
    if (e.code === "Escape" && this.view === "quiz") { const pop = this.root.querySelector("#le-kpop"); if (pop && !pop.hidden && this.q.ph !== "shown") { this.kClose(); return true; } }
    if (e.code === "Escape") { if (this.view === "stats") { this.view = "home"; this.render(); } else if (this.view === "fach") { this.view = "home"; this.render(); } else if (this.view === "setup") { const pc = this.root.querySelector("#le-pinfo.le-pvis"); if (pc) this.pClose(); else { this.view = "fach"; this.render(); } } else this.close(); return true; }
    if (this.view === "setup") { if ((e.code === "Enter" || e.code === "NumpadEnter") && e.target.tagName !== "BUTTON") { this.start(this.th); return true; } return false; }
    if (this.view === "quiz") {
      const a = this.q.list[this.q.i];
      if (a.art === "karte") {
        const pop = this.root.querySelector("#le-kpop"), open = pop && !pop.hidden;
        if (e.code === "Escape" && open && this.q.ph !== "shown") { this.kClose(); return true; }
        if ((e.code === "Enter" || e.code === "NumpadEnter") && e.target.tagName !== "BUTTON" && e.target.tagName !== "INPUT") { if (this.q.ph === "shown") this.kNext(); else if (!open && this.q.map) this.kOpen(); return true; }
        return false;
      }
      if (a.art === "steck") { if ((e.code === "Enter" || e.code === "NumpadEnter") && e.target.tagName !== "BUTTON" && e.target.tagName !== "INPUT") { if (this.q.ph === "shown") this.finish(); else this.tCheck(); return true; } return false; }
      if (a.art === "schale") { if ((e.code === "Enter" || e.code === "NumpadEnter") && e.target.tagName !== "BUTTON") { if (this.q.ph === "shown") this.sNext(); else this.sCheck(); return true; } return false; }
      if (a.art === "pse") { if ((e.code === "Enter" || e.code === "NumpadEnter") && this.q.ph === "shown" && e.target.tagName !== "BUTTON") { this.pNext(); return true; } return false; }
      if (a.art === "vokabel") { if ((e.code === "Enter" || e.code === "NumpadEnter") && this.q.vr && this.q.vr.every(Boolean) && e.target.tagName !== "BUTTON") { this.vEnd(); return true; } return false; }
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
// Vokabeltest: Belohnungsstufen als Text (mit Faktor der Schwierigkeit), die erreichte Stufe hervorgehoben
function vokTiers(faktor, punkte) {
  const L = VOK_LOHN, lab = (x, i) => (i === 0 ? t("vOver") : x.ab === 10 ? "10" : x.ab === 0 ? "0" : x.ab + "–" + (L[i - 1].ab - 1)), hit = punkte == null ? -1 : L.findIndex((x) => punkte >= x.ab);
  return L.map((x, i) => { const s = lab(x, i) + " → " + euro(Math.ceil(x.euro * faktor - 1e-9)); return i === hit ? "<b>" + s + "</b>" : s; }).join(" · ");
}
// Punkte eines Wortes als kleine Marke: +2, +1, 0 und Synonym-Bonus
function vPts(b) {
  const p = (b.haupt ? b.haupt.p : 0), x = b.bonus ? b.bonus.p : 0;
  return '<span class="le-vp">' + (p ? "+" + p : "0") + (x ? ' <i title="' + t("vSyn") + '">+' + x + "</i>" : "") + "</span>";
}
// Lösung: alle richtigen Wörter (Schreibvarianten mit /), getroffene markiert, Tippfehler-Hinweis
function vSol(a, b) {
  const hit = (gi) => (b.haupt && b.haupt.g === gi) || (b.bonus && b.bonus.g === gi);
  const all = a.gruppen.map((g, gi) => (hit(gi) ? "<b>" : "") + esc(g.join(" / ")) + (hit(gi) ? "</b>" : "")).join(" · ");
  const typo = [b.haupt, b.bonus].filter((x) => x && x.p === 1).length ? ' <em class="le-vtypo">' + t("vTypo") + "</em>" : "";
  return all + typo;
}
// Periodensystem: Belohnungsstufen als Text (mit Faktor), erreichte Stufe fett
function pseTiers(faktor, punkte) {
  const L = PSE_LOHN, hit = punkte == null ? -1 : L.findIndex((x) => punkte >= x.ab);
  return L.map((x, i) => { const lab = x.ab === 10 ? "10" : x.ab === 0 ? "0" : x.ab + "–" + (L[i - 1].ab - 1), s = lab + " → " + euro(Math.ceil(x.euro * faktor - 1e-9)); return i === hit ? "<b>" + s + "</b>" : s; }).join(" · ");
}
// Schalenmodell als kleine Grafik: Kern mit Ordnungszahl, Elektronen als Punkte auf den Schalen
function bohr(e) {
  const S = e.sch, n = S.length, R0 = 16, dr = n > 5 ? 9 : 12, size = 2 * (R0 + dr * (n - 1)) + 16, c = size / 2;
  let g = '<svg viewBox="0 0 ' + size + " " + size + '" width="' + Math.min(170, size) + '" height="' + Math.min(170, size) + '"><circle cx="' + c + '" cy="' + c + '" r="9" fill="#ED6A5E"/><text x="' + c + '" y="' + (c + 3.5) + '" text-anchor="middle" font-size="9" font-weight="800" fill="#141518">' + e.z + "</text>";
  S.forEach((k, i) => {
    const r = R0 + dr * i; g += '<circle cx="' + c + '" cy="' + c + '" r="' + r + '" fill="none" stroke="#62929E" stroke-width="1"/>';
    for (let j = 0; j < k; j++) { const a = -Math.PI / 2 + (j / k) * Math.PI * 2; g += '<circle cx="' + (c + Math.cos(a) * r).toFixed(1) + '" cy="' + (c + Math.sin(a) * r).toFixed(1) + '" r="' + (k > 18 ? 1.5 : 2.3) + '" fill="#ECEAE4"/>'; }
  });
  return g + "</svg>";
}
// Schalenmodell als Grafik: Kern (p⁺ / n), Schalen K–N als Ringe, Elektronen gleichmäßig verteilt. edit = Ringe anklickbar, help = max. Elektronen
function schaleSvg(b, o) {
  o = o || {}; const sh = b.sh || [], size = o.small ? 200 : 320, c = size / 2, R0 = o.small ? 34 : 54, dr = o.small ? 20 : 30, names = ["K", "L", "M", "N"];
  const nr = Math.min(o.small ? 22 : 34, 18 + Math.sqrt(b.p + b.n) * (o.small ? 1.4 : 2));
  let g = '<svg class="le-schsvg" viewBox="0 0 ' + size + " " + size + '" width="100%" style="max-width:' + size + 'px">';
  sh.forEach((k, i) => {
    const r = R0 + dr * i;
    g += '<circle cx="' + c + '" cy="' + c + '" r="' + r + '" fill="none" stroke="#62929E" stroke-width="1.6"/>';
    if (o.edit) g += '<circle class="le-shit" data-ring="' + i + '" cx="' + c + '" cy="' + c + '" r="' + r + '" fill="none" stroke-width="' + (dr - 4) + '"/>';
    g += '<text x="' + (c + r * 0.72 + 4) + '" y="' + (c - r * 0.72 - 2) + '" font-size="' + (o.small ? 10 : 12) + '" font-weight="800" fill="#7FC8D4" pointer-events="none">' + names[i] + (o.help ? " " + k + "/" + SCHALE_MAX[i] : "") + "</text>";
    for (let j = 0; j < k; j++) { const a = -Math.PI / 2 + (j / k) * Math.PI * 2; g += '<circle cx="' + (c + Math.cos(a) * r).toFixed(1) + '" cy="' + (c + Math.sin(a) * r).toFixed(1) + '" r="' + (o.small ? 3.4 : 5.5) + '" fill="#ECEAE4" stroke="#141518" stroke-width="1" pointer-events="none"/>'; }
  });
  g += '<circle cx="' + c + '" cy="' + c + '" r="' + nr + '" fill="#ED6A5E"/><text x="' + c + '" y="' + (c - 2) + '" text-anchor="middle" font-size="' + (o.small ? 10 : 13) + '" font-weight="800" fill="#141518">' + b.p + ' p⁺</text><text x="' + c + '" y="' + (c + (o.small ? 10 : 13)) + '" text-anchor="middle" font-size="' + (o.small ? 10 : 13) + '" font-weight="700" fill="#141518">' + b.n + " n</text>";
  return g + "</svg>";
}
