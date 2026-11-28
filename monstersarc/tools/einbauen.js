// Monsters Arc – Arbeitsstand einbauen (seit v0.28.2)
// Aufruf (im Ordner monstersarc/):  node tools/einbauen.js <monstersarc-arbeitsstand-….json>
// Schreibt Karte, Monsterliste und Attackenliste aus der exportierten Datei in die festen Spieldateien:
//   maps/start.js → MA.MAP_START, monsters/liste.js → MA.MONSTER_LIST, attacks/liste.js → MA.ATTACK_LIST
// Das Gebäude (Arbeitsstand des Gebäude-Editors) hat noch keine feste Spieldatei und wird nur gemeldet.
var fs = require("fs"), path = require("path");
var f = process.argv[2]; if (!f) { console.error("Datei angeben: node tools/einbauen.js <arbeitsstand.json>"); process.exit(1); }
var d = JSON.parse(fs.readFileSync(f, "utf8"));
if (d.format !== "monstersarc-workstate") { console.error("Das ist keine Arbeitsstand-Datei (format ≠ monstersarc-workstate)."); process.exit(1); }
var root = path.join(__dirname, "..");
function w(rel, head, name, val) {
  if (val == null) { console.log("übersprungen (nicht in der Datei): " + rel); return; }
  var js = head + "\nwindow.MA = window.MA || {};\nwindow.MA." + name + " = " + JSON.stringify(val) + ";\n";
  fs.writeFileSync(path.join(root, rel), js); console.log("geschrieben: " + rel + " (" + Math.round(js.length / 1024) + " KB)");
}
w("maps/start.js", "/* Monsters Arc – Start-Map. Aus dem Gesamten Arbeitsstand eingebaut (" + (d.saved || "?") + "). null = leeres Meer. */", "MAP_START", d.map);
w("monsters/liste.js", "/* Monsters Arc – monsters/liste.js: feste Monsterliste des Spiels (" + (d.saved || "?") + "). null = nur Browser-Liste. */", "MONSTER_LIST", d.monsters);
w("attacks/liste.js", "/* Monsters Arc – attacks/liste.js: feste Attackenliste des Spiels (" + (d.saved || "?") + "). null = nur Browser-Liste. */", "ATTACK_LIST", d.attacks);
console.log(d.building ? "Gebäude-Arbeitsstand ist in der Datei, hat aber noch keine feste Spieldatei." : "kein Gebäude in der Datei.");
