// ===== faecher/kunst.js · Kunst (Klasse 5–10) =====
// Aufbau eines Fachs: siehe faecher/index.js. Themen ohne Aufgaben (geplant: true) erscheinen auf dem Laptop als „bald“.
// Seit v0.11: Farbenlehre als Spiel (art "farbe"): Farbe auf Farbe ziehen und mischen. 5 Durchgänge je Runde.
import { L2 } from "le/core.js";
import { PAINTS, mix, hex, dist } from "le/faecher/farben.js";
import { shuffle } from "le/faecher/werkzeug.js";

// Belohnung für die Farb-Spiele (ab = mindestens so viele richtig)
const LOHN5 = [{ ab: 5, euro: 100 }, { ab: 1, euro: 25 }, { ab: 0, euro: 5 }];
const SEP = 0.13, CHANGE = 0.1;   // Mindestabstand zwischen Antworten, Mindest-Änderung durchs Mischen

// Aufgabe „Farben mischen“: A + ? = Ziel. Drei Farben zur Wahl, genau eine ergibt (mit A gemischt) das Ziel.
// Aufgabe „Mischergebnis“: A + B = ? Drei Ergebnisse zur Wahl.
function aufgabe(modus, R, used) {
  for (let tries = 0; tries < 400; tries++) {
    const pool = R() < 0.55 ? PAINTS.filter((p) => p.g <= 2) : PAINTS;   // gut die Hälfte mit Grund- und Mischfarben
    const A = pool[Math.floor(R() * pool.length)], B = pool[Math.floor(R() * pool.length)];
    if (A === B) continue;
    const key = [A.id, B.id].sort().join("+") + modus; if (used.has(key)) continue;
    const Cp = mix(A.p, B.p);
    if (dist(Cp, A.p) < CHANGE || dist(Cp, B.p) < CHANGE) continue;
    if (modus === "mischen") {
      // Ablenker: andere Farben, deren Mischung mit A deutlich anders aussieht als das Ziel
      const ds = shuffle(PAINTS.filter((d) => d !== A && d !== B && dist(mix(A.p, d.p), Cp) > SEP && dist(d.p, B.p) > SEP), R);
      const pick = []; for (const d of ds) { if (pick.every((x) => dist(x.p, d.p) > SEP)) pick.push(d); if (pick.length === 2) break; }
      if (pick.length < 2) continue;
      used.add(key);
      const opts = shuffle([B].concat(pick), R);
      return { art: "farbe", modus: modus, a: { n: A.n, hex: hex(A.p) }, ziel: hex(Cp),
        optionen: opts.map((o) => ({ n: o.n, hex: hex(o.p), mix: hex(mix(A.p, o.p)) })), richtig: opts.indexOf(B),
        frage: A.n.de + " + ? = …", loesung: B.n };
    }
    // raten: falsche Ergebnisse = Mischungen von A oder B mit einer anderen Farbe
    const cands = shuffle(PAINTS.filter((d) => d !== A && d !== B).map((d) => mix(R() < 0.5 ? A.p : B.p, d.p)).concat(PAINTS.filter((d) => d !== A && d !== B).map((d) => d.p)), R);
    const pick = []; for (const c of cands) { if (dist(c, Cp) > SEP && dist(c, A.p) > 0.05 && dist(c, B.p) > 0.05 && pick.every((x) => dist(x, c) > SEP)) pick.push(c); if (pick.length === 2) break; }
    if (pick.length < 2) continue;
    used.add(key);
    const opts = shuffle([Cp].concat(pick), R);
    return { art: "farbe", modus: modus, a: { n: A.n, hex: hex(A.p) }, b: { n: B.n, hex: hex(B.p) }, ziel: hex(Cp),
      optionen: opts.map((o) => ({ hex: hex(o) })), richtig: opts.indexOf(Cp), frage: A.n.de + " + " + B.n.de + " = ?" };
  }
  return null;
}
function runde(modus, R) { const used = new Set(), out = []; while (out.length < 5) { const a = aufgabe(modus, R, used); if (!a) break; out.push(a); } return out; }

export default {
  id: "kunst", name: L2("Kunst", "Art"), kurz: "Ku", farbe: "#E8A04A",
  // Spielarten, die für dieses Fach geplant sind (neben Multiple Choice und Eingabe)
  spiele: [{ id: "farbkreis", name: L2("Farbkreis mischen", "Colour wheel mixing") }, { id: "epochen", name: L2("Bilder Epochen zuordnen", "Match paintings to periods") }],
  themen: [
    { id: "farbmischen", name: L2("Farbenlehre: Farben mischen", "Colour theory: mixing colours"), klasse: 5, art: "farbe", anzahl: 5, lohn: LOHN5,
      info: L2("Welche Farbe fehlt? Zieh eine der drei Farben auf die erste Farbe, bis das Ziel entsteht.", "Which colour is missing? Drag one of the three colours onto the first colour to get the target."),
      erzeugen(R) { return runde("mischen", R); } },
    { id: "mischergebnis", name: L2("Farbenlehre: Mischergebnis", "Colour theory: mixing result"), klasse: 5, art: "farbe", anzahl: 5, lohn: LOHN5,
      info: L2("Zwei Farben werden gemischt – welche Farbe entsteht? Zieh das richtige Ergebnis ins Feld.", "Two colours are mixed – which colour do you get? Drag the right result into the box."),
      erzeugen(R) { return runde("raten", R); } },
    { id: "perspektive", name: L2("Perspektive", "Perspective"), klasse: 7, geplant: true },
    { id: "kunstepochen", name: L2("Kunstepochen", "Art periods"), klasse: 9, geplant: true }
  ]
};
