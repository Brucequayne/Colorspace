#!/usr/bin/env node
/* Space Rogue – Build.
   Setzt alle Dateien aus src/ in Namensreihenfolge zu einer einzigen spacerogue.js zusammen.
   Aufruf:  node spacerogue-src/build.js
   Ergebnis: ../spacerogue.js (die Datei, die index.html lädt). Diese Datei nie von Hand ändern. */
"use strict";
const fs = require("fs"), path = require("path");
const SRC = path.join(__dirname, "src");
function sources() { return fs.readdirSync(SRC).filter(f => f.endsWith(".js")).sort(); }
function bundle() { return sources().map(f => fs.readFileSync(path.join(SRC, f), "utf8")).join(""); }
module.exports = { bundle, sources, SRC };
if (require.main === module) {
  const out = process.argv[2] || path.join(__dirname, "..", "spacerogue.js"), code = bundle();
  try { new Function(code); } catch (e) { console.error("Syntaxfehler im Zusammenbau: " + e.message); process.exit(1); }
  fs.writeFileSync(out, code);
  const v = (code.match(/var VERSION = "([^"]+)"/) || [])[1];
  console.log("spacerogue.js gebaut · Version " + v + " · " + sources().length + " Quelldateien · " + code.length + " Zeichen → " + out);
}
