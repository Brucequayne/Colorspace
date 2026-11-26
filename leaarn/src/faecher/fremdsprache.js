// ===== faecher/fremdsprache.js · Spanisch (2. Fremdsprache, Klasse 5–10; bis v0.20.2 „2. Fremdsprache“) =====
// Aufbau eines Fachs: siehe faecher/index.js. Themen ohne Aufgaben (geplant: true) erscheinen auf dem Laptop als „bald“.
// Die Fach-ID bleibt „fremdsprache“, damit Statistik und Boni im Spielstand weiterpassen.
import { L2 } from "le/core.js";
import { VOK_ES, vokWertung } from "le/faecher/vokabeln.js";

// Vokabeltest Spanisch (seit v0.20.3): aufgebaut wie Englisch – 5 Wörter, Themengebiet und Schwierigkeit vor dem Start, gleiche Punkte und Belohnung.
// Regeln: faecher/vokabeln.js, Wörter: faecher/wortliste_es.js
const REGELN = L2("5 Wörter, jedes einzeln bestätigen (Enter oder ✓). Richtig geschrieben = 2 Punkte, richtiges Wort mit kleinem Tippfehler = 1 Punkt. Synonym-Bonus: Schreib ein zweites richtiges Wort mit Komma dahinter (z. B. „empezar, comenzar“) – bis zu 2 Extrapunkte. Groß/klein und Artikel (el, la, los, las) sind egal. Akzente (á, é, í, ó, ú) und ñ darfst du ohne Zeichen schreiben, Umlaute als ae/oe/ue.",
  "5 words, confirm each one (Enter or ✓). Correct spelling = 2 points, right word with a small typo = 1 point. Synonym bonus: write a second correct word after a comma (e.g. “empezar, comenzar”) – up to 2 extra points. Case and articles (el, la, los, las) don't matter. You may type accents (á, é, í, ó, ú) and ñ without the marks, umlauts as ae/oe/ue.");
function vokabeln(richtung, name, info) {
  return {
    id: "vokabeln-es-" + richtung, name: name, klasse: 5, stufe: "alle", art: "vokabel", richtung: richtung, anzahl: 5, maxPunkte: 10, setup: true, info: info,
    vok: VOK_ES, optKey: "vokEs", regeln: REGELN,
    erzeugen(R, opt) { return VOK_ES.ziehen(R, opt || { kat: "alle", lvl: 0 }, richtung, 5); },
    wertung(scores, opt) { return vokWertung(scores, opt); }
  };
}

export default {
  id: "fremdsprache", name: L2("Spanisch", "Spanish"), kurz: "Es", farbe: "#D95E53",
  // Spielarten, die für dieses Fach geplant sind (neben Multiple Choice und Eingabe)
  spiele: [{ id: "vokabelsprint", name: L2("Vokabel-Sprint", "Vocabulary sprint") }, { id: "konjugation", name: L2("Konjugations-Trainer", "Conjugation trainer") }],
  themen: [
    vokabeln("de", L2("Vokabeln: Deutsch → Spanisch", "Vocabulary: German → Spanish"), L2("Du siehst 5 deutsche Wörter und schreibst sie auf Spanisch.", "You see 5 German words and write them in Spanish.")),
    vokabeln("es", L2("Vokabeln: Spanisch → Deutsch", "Vocabulary: Spanish → German"), L2("Du siehst 5 spanische Wörter und schreibst sie auf Deutsch.", "You see 5 Spanish words and write them in German.")),
    { id: "spanisch-ser-estar", name: L2("ser und estar", "ser and estar"), klasse: 6, geplant: true },
    { id: "spanisch-presente", name: L2("Presente (regelmäßige Verben)", "Present tense (regular verbs)"), klasse: 6, geplant: true },
    { id: "spanisch-preterito-indefinido", name: L2("Pretérito indefinido", "Pretérito indefinido"), klasse: 8, geplant: true },
    { id: "spanisch-subjuntivo", name: L2("Subjuntivo", "Subjunctive"), klasse: 10, geplant: true }
  ]
};
