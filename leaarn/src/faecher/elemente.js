// ===== faecher/elemente.js · Periodensystem für Chemie (seit v0.19.1) =====
// Alle 118 Elemente: Symbol, deutscher Name (Alternativen mit |), Atommasse (u), Kategorie, Zustand bei 20 °C.
// Daraus berechnet: Periode, Gruppe, Platz im Periodensystem, Elektronen pro Schale (Schalenmodell, Klasse 8).
// Spiel „Elemente erkennen“: 5 Runden, Symbol → Name. 2 Punkte richtig, 1 Punkt mit kleinem Tippfehler.
// Belohnung wie beim Vokabeltest: 0 = 5 €, 1–5 = 25 €, 6–9 = 75 €, 10 = 150 €, Schwierigkeit mittel +30 %, schwer +60 %.
import { L2 } from "le/core.js";
import { shuffle } from "le/faecher/werkzeug.js";

// Kategorien: am Alkalimetall · ea Erdalkalimetall · ub Übergangsmetall · mm weiteres Metall · hm Halbmetall · nm Nichtmetall
// ha Halogen · eg Edelgas · la Lanthanoid · ac Actinoid. Zustand: s fest · l flüssig · g gasförmig · u unbekannt (nur künstlich, wenige Atome)
const RAW = `H|Wasserstoff|1.008|nm|g
He|Helium|4.003|eg|g
Li|Lithium|6.94|am|s
Be|Beryllium|9.012|ea|s
B|Bor|10.81|hm|s
C|Kohlenstoff|12.011|nm|s
N|Stickstoff|14.007|nm|g
O|Sauerstoff|15.999|nm|g
F|Fluor|18.998|ha|g
Ne|Neon|20.180|eg|g
Na|Natrium|22.990|am|s
Mg|Magnesium|24.305|ea|s
Al|Aluminium|26.982|mm|s
Si|Silicium,Silizium|28.085|hm|s
P|Phosphor|30.974|nm|s
S|Schwefel|32.06|nm|s
Cl|Chlor|35.45|ha|g
Ar|Argon|39.948|eg|g
K|Kalium|39.098|am|s
Ca|Calcium,Kalzium|40.078|ea|s
Sc|Scandium|44.956|ub|s
Ti|Titan|47.867|ub|s
V|Vanadium|50.942|ub|s
Cr|Chrom|51.996|ub|s
Mn|Mangan|54.938|ub|s
Fe|Eisen|55.845|ub|s
Co|Cobalt,Kobalt|58.933|ub|s
Ni|Nickel|58.693|ub|s
Cu|Kupfer|63.546|ub|s
Zn|Zink|65.38|ub|s
Ga|Gallium|69.723|mm|s
Ge|Germanium|72.630|hm|s
As|Arsen|74.922|hm|s
Se|Selen|78.971|nm|s
Br|Brom|79.904|ha|l
Kr|Krypton|83.798|eg|g
Rb|Rubidium|85.468|am|s
Sr|Strontium|87.62|ea|s
Y|Yttrium|88.906|ub|s
Zr|Zirconium,Zirkonium|91.224|ub|s
Nb|Niob|92.906|ub|s
Mo|Molybdän|95.95|ub|s
Tc|Technetium|98|ub|s
Ru|Ruthenium|101.07|ub|s
Rh|Rhodium|102.91|ub|s
Pd|Palladium|106.42|ub|s
Ag|Silber|107.87|ub|s
Cd|Cadmium,Kadmium|112.41|ub|s
In|Indium|114.82|mm|s
Sn|Zinn|118.71|mm|s
Sb|Antimon|121.76|hm|s
Te|Tellur|127.60|hm|s
I|Iod,Jod|126.90|ha|s
Xe|Xenon|131.29|eg|g
Cs|Caesium,Cäsium|132.91|am|s
Ba|Barium|137.33|ea|s
La|Lanthan|138.91|la|s
Ce|Cer|140.12|la|s
Pr|Praseodym|140.91|la|s
Nd|Neodym|144.24|la|s
Pm|Promethium|145|la|s
Sm|Samarium|150.36|la|s
Eu|Europium|151.96|la|s
Gd|Gadolinium|157.25|la|s
Tb|Terbium|158.93|la|s
Dy|Dysprosium|162.50|la|s
Ho|Holmium|164.93|la|s
Er|Erbium|167.26|la|s
Tm|Thulium|168.93|la|s
Yb|Ytterbium|173.05|la|s
Lu|Lutetium|174.97|la|s
Hf|Hafnium|178.49|ub|s
Ta|Tantal|180.95|ub|s
W|Wolfram|183.84|ub|s
Re|Rhenium|186.21|ub|s
Os|Osmium|190.23|ub|s
Ir|Iridium|192.22|ub|s
Pt|Platin|195.08|ub|s
Au|Gold|196.97|ub|s
Hg|Quecksilber|200.59|ub|l
Tl|Thallium|204.38|mm|s
Pb|Blei|207.2|mm|s
Bi|Bismut,Wismut|208.98|mm|s
Po|Polonium|209|mm|s
At|Astat|210|ha|s
Rn|Radon|222|eg|g
Fr|Francium|223|am|s
Ra|Radium|226|ea|s
Ac|Actinium|227|ac|s
Th|Thorium|232.04|ac|s
Pa|Protactinium|231.04|ac|s
U|Uran|238.03|ac|s
Np|Neptunium|237|ac|s
Pu|Plutonium|244|ac|s
Am|Americium|243|ac|s
Cm|Curium|247|ac|s
Bk|Berkelium|247|ac|s
Cf|Californium|251|ac|s
Es|Einsteinium|252|ac|s
Fm|Fermium|257|ac|s
Md|Mendelevium|258|ac|s
No|Nobelium|259|ac|s
Lr|Lawrencium|266|ac|s
Rf|Rutherfordium|267|ub|u
Db|Dubnium|268|ub|u
Sg|Seaborgium|269|ub|u
Bh|Bohrium|270|ub|u
Hs|Hassium|277|ub|u
Mt|Meitnerium|278|ub|u
Ds|Darmstadtium|281|ub|u
Rg|Roentgenium|282|ub|u
Cn|Copernicium|285|ub|u
Nh|Nihonium|286|mm|u
Fl|Flerovium|289|mm|u
Mc|Moscovium|290|mm|u
Lv|Livermorium|293|mm|u
Ts|Tenness,Tennessin|294|ha|u
Og|Oganesson|294|eg|u`;

export const KATEG = {
  am: { n: L2("Alkalimetall", "Alkali metal"), c: "#B95848" }, ea: { n: L2("Erdalkalimetall", "Alkaline earth metal"), c: "#C0844A" },
  ub: { n: L2("Übergangsmetall", "Transition metal"), c: "#4A6D7C" }, mm: { n: L2("Metall", "Metal"), c: "#6E7F86" },
  hm: { n: L2("Halbmetall", "Metalloid"), c: "#7F8B5A" }, nm: { n: L2("Nichtmetall", "Nonmetal"), c: "#5D8A64" },
  ha: { n: L2("Halogen", "Halogen"), c: "#3F8A93" }, eg: { n: L2("Edelgas", "Noble gas"), c: "#7A6898" },
  la: { n: L2("Lanthanoid", "Lanthanide"), c: "#8E7366" }, ac: { n: L2("Actinoid", "Actinide"), c: "#865E74" }
};
export const ZUSTAND = { s: L2("fest", "solid"), l: L2("flüssig", "liquid"), g: L2("gasförmig", "gas"), u: L2("unbekannt", "unknown") };

// Wissenswertes (Niveau Klasse 8) für die wichtigsten Elemente; die übrigen bekommen einen Satz zu ihrer Kategorie
const FAKT = {
  H: "Leichtestes Element und häufigstes im Weltall. Mit Sauerstoff verbrennt es zu Wasser (Knallgasprobe).",
  He: "Edelgas, leichter als Luft – deshalb steigen Heliumballons auf. Reagiert mit keinem anderen Stoff.",
  Li: "Leichtestes Metall, so weich, dass man es schneiden kann. Steckt in Handy- und Autoakkus.",
  Be: "Leichtes, sehr hartes Metall; Beryllium-Staub ist giftig.",
  B: "Halbmetall; Borax wird für Glas und Waschmittel genutzt.",
  C: "Grundbaustein aller Lebewesen. Kommt als Graphit (Bleistiftmine) und als Diamant vor.",
  N: "Luft besteht zu etwa 78 % aus Stickstoff. Pflanzen brauchen ihn als Dünger.",
  O: "Luft besteht zu etwa 21 % aus Sauerstoff. Wir brauchen ihn zum Atmen, Feuer braucht ihn zum Brennen (Glimmspanprobe).",
  F: "Reaktionsfreudigstes Element überhaupt. Fluorid in Zahnpasta härtet den Zahnschmelz.",
  Ne: "Edelgas, leuchtet in Leuchtreklamen rot-orange.",
  Na: "Weiches Metall, reagiert heftig mit Wasser. Mit Chlor bildet es Kochsalz (NaCl).",
  Mg: "Leichtmetall, verbrennt mit grellweißem Licht (früher Blitzlicht).",
  Al: "Häufigstes Metall der Erdkruste, leicht und rostet nicht – für Alufolie, Dosen und Flugzeuge.",
  Si: "Halbmetall; Sand ist Siliciumdioxid. Computerchips bestehen aus Silicium.",
  P: "Roter Phosphor steckt in der Reibfläche von Streichholzschachteln. Wichtig für Knochen und DNA.",
  S: "Gelber, fester Stoff; riecht verbrannt stechend. Kommt an Vulkanen vor.",
  Cl: "Giftiges, gelbgrünes Gas. Desinfiziert Schwimmbadwasser; mit Natrium bildet es Kochsalz.",
  Ar: "Edelgas, knapp 1 % der Luft. Schutzgas in Glühlampen und beim Schweißen.",
  K: "Weiches Metall, reagiert noch heftiger mit Wasser als Natrium. Wichtig für Nerven und Muskeln.",
  Ca: "Baustein von Knochen, Zähnen, Kalkstein und Eierschalen.",
  Ti: "Fest, leicht und rostfrei – für Brillen, Fahrräder und Implantate.",
  Cr: "Glänzendes Metall; verchromte Oberflächen rosten nicht. Macht Stahl zu Edelstahl.",
  Mn: "Wird Stahl beigemischt, damit er härter wird.",
  Fe: "Wichtigstes Gebrauchsmetall (Stahl). Rostet an feuchter Luft. Im Blut transportiert Eisen den Sauerstoff.",
  Co: "Färbt Glas und Keramik blau (Kobaltblau); steckt in Akkus.",
  Ni: "Magnetisches Metall, steckt in Münzen und Edelstahl.",
  Cu: "Rötliches Metall, leitet Strom sehr gut – für Kabel. Wird an der Luft grün (Patina).",
  Zn: "Schützt Eisen vor Rost (verzinkt). Mit Kupfer bildet es Messing.",
  Ga: "Schmilzt schon bei knapp 30 °C – in der Hand.",
  As: "Bekanntes Gift aus Kriminalgeschichten.",
  Br: "Eines von nur zwei Elementen, die bei Raumtemperatur flüssig sind (rotbraun, giftig).",
  Kr: "Edelgas, wird in besonders hellen Lampen genutzt.",
  Ag: "Leitet Strom und Wärme am besten von allen Metallen. Schmuck, Besteck, Münzen.",
  Sn: "Weiches Metall; Lötzinn, Konservendosen (Weißblech). Mit Kupfer bildet es Bronze.",
  I: "Violette Kristalle; Iod-Tinktur desinfiziert. Steckt in Iodsalz für die Schilddrüse.",
  Xe: "Edelgas für sehr helle Autoscheinwerfer.",
  W: "Höchster Schmelzpunkt aller Metalle (über 3400 °C) – Glühfaden alter Glühbirnen.",
  Pt: "Edelmetall, steckt im Katalysator von Autos.",
  Au: "Edelmetall, das nicht rostet und nicht anläuft. Schmuck, Münzen, Elektronik.",
  Hg: "Einziges Metall, das bei Raumtemperatur flüssig ist. Giftig – früher in Thermometern.",
  Pb: "Schweres, weiches Metall, giftig. Früher in Wasserrohren, heute in Autobatterien.",
  Rn: "Radioaktives Edelgas, das in manchen Kellern aus dem Boden kommt.",
  Ra: "Radioaktiv; von Marie Curie entdeckt.",
  U: "Radioaktives Schwermetall, Brennstoff in Kernkraftwerken.",
  Pu: "Radioaktiv, fast nur künstlich hergestellt (Kernreaktoren).",
  Ds: "Benannt nach Darmstadt, wo es 1994 erstmals hergestellt wurde."
};
const KFAKT = {
  am: "Alkalimetalle sind weich, reagieren heftig mit Wasser und werden unter Öl aufbewahrt.",
  ea: "Erdalkalimetalle reagieren mit Wasser, aber weniger heftig als Alkalimetalle.",
  ub: "Ein Übergangsmetall – glänzt, leitet Strom und Wärme und lässt sich verformen.",
  mm: "Ein Metall – glänzt, leitet Strom und lässt sich verformen.",
  hm: "Halbmetalle haben Eigenschaften von Metallen und Nichtmetallen und leiten Strom nur mäßig.",
  nm: "Ein Nichtmetall – leitet Strom und Wärme schlecht.",
  ha: "Halogene („Salzbildner“) bilden mit Metallen Salze und sind sehr reaktionsfreudig.",
  eg: "Edelgase reagieren so gut wie gar nicht, weil ihre äußerste Schale voll besetzt ist.",
  la: "Lanthanoide („Seltene Erden“) stecken in starken Magneten, Bildschirmen und Akkus.",
  ac: "Actinoide sind alle radioaktiv."
};

// Elektronen pro Schale: Besetzung nach der Energie-Reihenfolge der Unterschalen, mit den bekannten Ausnahmen
const ORDER = [[1, 2], [2, 2], [2, 6], [3, 2], [3, 6], [4, 2], [3, 10], [4, 6], [5, 2], [4, 10], [5, 6], [6, 2], [4, 14], [5, 10], [6, 6], [7, 2], [5, 14], [6, 10], [7, 6]];
const AUSN = { 24: "2,8,13,1", 29: "2,8,18,1", 41: "2,8,18,12,1", 42: "2,8,18,13,1", 44: "2,8,18,15,1", 45: "2,8,18,16,1", 46: "2,8,18,18", 47: "2,8,18,18,1",
  57: "2,8,18,18,9,2", 58: "2,8,18,19,9,2", 64: "2,8,18,25,9,2", 78: "2,8,18,32,17,1", 79: "2,8,18,32,18,1", 89: "2,8,18,32,18,9,2", 90: "2,8,18,32,18,10,2",
  91: "2,8,18,32,20,9,2", 92: "2,8,18,32,21,9,2", 93: "2,8,18,32,22,9,2", 96: "2,8,18,32,25,9,2", 103: "2,8,18,32,32,8,3" };
function schalen(z) {
  if (AUSN[z]) return AUSN[z].split(",").map(Number);
  const s = []; let r = z;
  for (const [n, c] of ORDER) { if (r <= 0) break; const k = Math.min(c, r); s[n - 1] = (s[n - 1] || 0) + k; r -= k; }
  return s.map((x) => x || 0);
}
// Platz im Periodensystem: Periode, Gruppe (1–18, Lanthanoide/Actinoide: null), Zeile/Spalte im Raster (Zeile 9/10 = abgesetzte Reihen)
function platz(z) {
  const ends = [2, 10, 18, 36, 54, 86, 118]; let p = 0; while (z > ends[p]) p++; const per = p + 1, i = z - (p ? ends[p - 1] : 0);
  if (per === 1) return { per: 1, gr: z === 1 ? 1 : 18, row: 1, col: z === 1 ? 1 : 18 };
  if (per <= 3) { const g = i <= 2 ? i : i + 10; return { per: per, gr: g, row: per, col: g }; }
  if (per <= 5) return { per: per, gr: i, row: per, col: i };
  if (i <= 2) return { per: per, gr: i, row: per, col: i };
  if (i <= 17) return { per: per, gr: null, row: per === 6 ? 9 : 10, col: i };   // 57–71 / 89–103 (Spalte 3–17 der abgesetzten Reihe)
  return { per: per, gr: i - 14, row: per, col: i - 14 };
}

export const ELEMENTE = RAW.split("\n").map((l, k) => {
  const [sym, names, m, kat, zu] = l.split("|"), z = k + 1, nm = names.split(","), pl = platz(z);
  const haupt = pl.gr && (pl.gr <= 2 || pl.gr >= 13) ? (pl.gr <= 2 ? pl.gr : pl.gr - 10) : null;
  return { z: z, sym: sym, name: nm[0], alt: nm, m: +m, kat: kat, zu: zu, per: pl.per, gr: pl.gr, row: pl.row, col: pl.col, haupt: haupt,
    sch: schalen(z), radio: z === 43 || z === 61 || z >= 84, fakt: FAKT[sym] || KFAKT[kat] };
});
export const bySym = (s) => ELEMENTE.find((e) => e.sym === s);
// Valenzelektronen (Außenelektronen) für Hauptgruppen: Helium 2, sonst Hauptgruppen-Nummer
export const valenz = (e) => (e.z === 2 ? 2 : e.haupt);

// ---------- Schwierigkeit ----------
const MITTEL = ["Ti", "Cr", "Mn", "Fe", "Co", "Ni", "Cu", "Zn", "Br", "Kr", "Ag", "Sn", "I", "Xe", "W", "Pt", "Au", "Hg", "Pb", "Rn", "Ra", "U"];
export const STUFEN_PSE = [
  { id: 0, name: L2("Leicht", "Easy"), faktor: 1, info: L2("Elemente 1–20 (Wasserstoff bis Calcium)", "Elements 1–20 (hydrogen to calcium)") },
  { id: 1, name: L2("Mittel", "Medium"), faktor: 1.3, info: L2("Elemente 1–20 plus wichtige Metalle, Halogene und Edelgase", "Elements 1–20 plus important metals, halogens and noble gases") },
  { id: 2, name: L2("Schwer", "Hard"), faktor: 1.6, info: L2("Alle 118 Elemente", "All 118 elements") }
];
export function psePool(lvl) {
  if (lvl >= 2) return ELEMENTE;
  const a = ELEMENTE.filter((e) => e.z <= 20);
  return lvl === 1 ? a.concat(MITTEL.map(bySym)) : a;
}
export function pseZiehen(R, opt, n) { return shuffle(psePool((opt && opt.lvl) | 0), R).slice(0, n || 5).map((e) => ({ art: "pse", el: e })); }

// ---------- Prüfen ----------
const UML = { "ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss" };
const base = (s) => String(s).toLowerCase().replace(/[äöüß]/g, (c) => UML[c]).replace(/[^a-z]/g, "");
const ALL = new Set(); ELEMENTE.forEach((e) => e.alt.forEach((a) => ALL.add(base(a))));
function dist(a, b) {
  const m = a.length, n = b.length, d = [];
  for (let i = 0; i <= m; i++) { d[i] = [i]; for (let j = 1; j <= n; j++) d[i][j] = i ? 0 : j; }
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
  }
  return d[m][n];
}
// 2 = richtig, 1 = richtiges Element mit kleinem Tippfehler (bis 6 Buchstaben einer, ab 7 zwei; nicht, wenn die Eingabe ein anderes Element ist), 0 = falsch
export function pseBewerte(el, eingabe) {
  const n = base(eingabe); if (!n) return 0;
  if (el.alt.some((a) => base(a) === n)) return 2;
  if (ALL.has(n)) return 0;
  return el.alt.some((a) => { const t = base(a), d = dist(n, t); return d <= (t.length <= 3 ? 0 : t.length <= 6 ? 1 : 2); }) ? 1 : 0;
}
// ---------- Belohnung ----------
export const PSE_LOHN = [{ ab: 10, euro: 150 }, { ab: 6, euro: 75 }, { ab: 1, euro: 25 }, { ab: 0, euro: 5 }];
export function pseWertung(scores, opt) {
  const summe = scores.reduce((s, x) => s + (x || 0), 0), st = STUFEN_PSE[(opt && opt.lvl) | 0] || STUFEN_PSE[0];
  let basis = 5; for (const l of PSE_LOHN) if (summe >= l.ab) { basis = l.euro; break; }
  return { summe: summe, basis: basis, faktor: st.faktor, euro: Math.ceil(basis * st.faktor - 1e-9) };
}

// ---------- Spiel 2: Schalenmodelle bauen (seit v0.19.2) ----------
// Je Element 5 Punkte: Protonen · Neutronen (gerundete Atommasse − Ordnungszahl) · Anzahl Schalen (= Periode) · Elektronen gesamt (= Protonen)
// · Verteilung auf die Schalen (jede Schale richtig). 2 Elemente je Durchgang = 10 Punkte, Belohnung wie pseWertung.
export const STUFEN_SCHALE = [
  // nfix (seit v0.19.3): Neutronen sind vorgegeben (richtig eingetragen, nicht änderbar) – ihr Punkt zählt automatisch
  { id: 0, name: L2("Leicht", "Easy"), faktor: 1, hilfe: true, nfix: true, info: L2("Elemente 1–10, mit Hilfe (max. Elektronen pro Schale), Neutronen vorgegeben", "Elements 1–10, with help (max electrons per shell), neutrons given") },
  { id: 1, name: L2("Mittel", "Medium"), faktor: 1.3, hilfe: true, nfix: true, info: L2("Elemente 1–20, mit Hilfe, Neutronen vorgegeben", "Elements 1–20, with help, neutrons given") },
  { id: 2, name: L2("Schwer", "Hard"), faktor: 1.6, hilfe: false, nfix: false, info: L2("Elemente 1–20, ohne Hilfe, Neutronen selbst bestimmen", "Elements 1–20, no help, work out the neutrons yourself") }
];
export const SCHALE_MAX = [2, 8, 8, 2];   // Schulregel bis Calcium (M-Schale fasst eigentlich 18)
export const neutronen = (e) => Math.max(0, Math.round(e.m) - e.z);
export function schalePool(lvl) { return ELEMENTE.filter((e) => e.z <= (lvl === 0 ? 10 : 20)); }
export function schaleZiehen(R, opt, n) { return shuffle(schalePool((opt && opt.lvl) | 0), R).slice(0, n || 2).map((e) => ({ art: "schale", el: e })); }
// b = gebautes Modell { p, n, sh: [Elektronen je Schale] } → Teilpunkte [Protonen, Neutronen, Schalen, Elektronen gesamt, Verteilung]
export function schaleBewerte(e, b) {
  const sh = b.sh || [], tot = sh.reduce((s, x) => s + x, 0), soll = e.sch;
  const parts = [b.p === e.z, b.n === neutronen(e), sh.length === soll.length, tot === e.z, sh.length === soll.length && sh.every((x, i) => x === soll[i])];
  return { parts: parts, score: parts.filter(Boolean).length };
}

// ---------- Spiel 3: Element-Steckbrief (seit v0.19.4) ----------
// Ein Element je Durchgang. 9 Angaben je 1 Punkt: Symbol · Hauptgruppe (römisch) · Periode · Ordnungszahl · Elektronen gesamt · Valenzelektronen
// · Protonen · Neutronen · Atommasse (gerundet). Alle 9 richtig = 1 Bonuspunkt → max. 10. Nur Hauptgruppen-Elemente (Gruppe 1, 2, 13–18) bis Radon.
// Belohnung wie die anderen Chemie-Spiele (PSE_LOHN), Stufen-Faktor 1 / 1,3 / 1,6.
export const STUFEN_STECK = [
  { id: 0, name: L2("Leicht", "Easy"), faktor: 1, voll: true, max: 20, info: L2("Elemente 1–20, das Periodensystem hat Gruppen- und Periodennummern", "Elements 1–20, the periodic table has group and period numbers") },
  { id: 1, name: L2("Mittel", "Medium"), faktor: 1.3, voll: true, max: 54, info: L2("Hauptgruppen-Elemente bis Xenon, das Periodensystem hat Gruppen- und Periodennummern", "Main-group elements up to xenon, the periodic table has group and period numbers") },
  { id: 2, name: L2("Schwer", "Hard"), faktor: 1.6, voll: false, max: 86, info: L2("Hauptgruppen-Elemente bis Radon, das Periodensystem hat keine Gruppen- und Periodennummern", "Main-group elements up to radon, the periodic table has no group or period numbers") }
];
export const ROEM = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];
export const STECK_FELDER = ["sym", "hg", "per", "z", "el", "val", "p", "n", "m"];
export function steckPool(lvl) { const st = STUFEN_STECK[lvl] || STUFEN_STECK[0]; return ELEMENTE.filter((e) => e.haupt && e.z <= st.max); }
export function steckZiehen(R, opt) { return shuffle(steckPool((opt && opt.lvl) | 0), R).slice(0, 1).map((e) => ({ art: "steck", el: e })); }
// richtige Werte (Hauptgruppe als Nummer 1–8, Helium = VIII)
export function steckSoll(e) { return { sym: e.sym, hg: e.z === 2 ? 8 : e.haupt, per: e.per, z: e.z, el: e.z, val: valenz(e), p: e.z, n: neutronen(e), m: Math.round(e.m) }; }
// Symbol: Groß-/Kleinschreibung egal; Zahlen: ganze Zahl; Hauptgruppe: 1–8 (gewählt über die römischen Knöpfe)
export function steckBewerte(e, inp) {
  const s = steckSoll(e), parts = STECK_FELDER.map((k) => {
    const v = inp[k];
    if (k === "sym") return String(v || "").trim().toLowerCase() === s.sym.toLowerCase();
    return v !== "" && v != null && +v === s[k];
  });
  const alle = parts.every(Boolean);
  return { parts: parts, alle: alle, score: parts.filter(Boolean).length + (alle ? 1 : 0) };
}
export function steckWertung(scores, opt) {
  const summe = scores.reduce((s, x) => s + (x || 0), 0), st = STUFEN_STECK[(opt && opt.lvl) | 0] || STUFEN_STECK[0];
  let basis = 5; for (const l of PSE_LOHN) if (summe >= l.ab) { basis = l.euro; break; }
  return { summe: summe, basis: basis, faktor: st.faktor, euro: Math.ceil(basis * st.faktor - 1e-9) };
}
