// ===== faecher/fremdsprache.js · 2. Fremdsprache (Klasse 5–10) =====
// Aufbau eines Fachs: siehe faecher/index.js. Themen ohne Aufgaben (geplant: true) erscheinen auf dem Laptop als „bald“.
import { L2 } from "le/core.js";

export default {
  id: "fremdsprache", name: L2("2. Fremdsprache", "2nd foreign language"), kurz: "F", farbe: "#D95E53",
  // Spielarten, die für dieses Fach geplant sind (neben Multiple Choice und Eingabe)
  spiele: [{ id: "vokabelsprint", name: L2("Vokabel-Sprint", "Vocabulary sprint") }, { id: "konjugation", name: L2("Konjugations-Trainer", "Conjugation trainer") }],
  themen: [
    { id: "franzoesisch-grundwortschatz", name: L2("Französisch: Grundwortschatz", "French: basic vocabulary"), klasse: 6, geplant: true },
    { id: "latein-a-und-o-deklination", name: L2("Latein: a- und o-Deklination", "Latin: a/o declension"), klasse: 6, geplant: true },
    { id: "spanisch-grundwortschatz", name: L2("Spanisch: Grundwortschatz", "Spanish: basic vocabulary"), klasse: 6, geplant: true },
    { id: "franzoesisch-pass-compos", name: L2("Französisch: passé composé", "French: passé composé"), klasse: 7, geplant: true },
    { id: "latein-aci", name: L2("Latein: AcI", "Latin: AcI"), klasse: 8, geplant: true },
    { id: "spanisch-pret-rito-indefinido", name: L2("Spanisch: pretérito indefinido", "Spanish: pretérito indefinido"), klasse: 8, geplant: true }
  ]
};
