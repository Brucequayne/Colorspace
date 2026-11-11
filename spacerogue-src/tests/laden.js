/* Lädt den zusammengebauten Spielcode für Tests und macht interne Funktionen erreichbar.
   Die Test-Öffnung (window.__SRT) wird nur hier eingefügt, nie in die ausgelieferte spacerogue.js. */
"use strict";
const { bundle } = require("../build.js");
const NAMES = ["T", "CATS", "TX", "TIPS", "NPC", "COSTS", "PM", "MG", "MS", "RG", "AISTY", "stats", "rooms", "components", "buildMap", "linked", "coolMap", "ocMaxOf", "cellsOf", "fp", "edgeRule", "mainScore", "bounds", "starter", "starterStation", "parseShip", "npcBlocks", "strip", "massOf", "key"];
const FLIGHT = ["flTick", "weapons", "flDraw", "edDraw", "spawnEnemy", "startTest", "stopTest", "tryPlace", "ghostAt", "eraseAt", "paintAt", "setEd", "toggleSeat", "dockKey", "setShield", "onKey", "onKeyUp", "undo", "openHangar", "openInv", "cycleSym", "info", "shipCode", "damage", "placeRow", "onClick", "save"];
function hooked(code) {
  code = code || bundle();
  const all = NAMES.concat(FLIGHT).map(n => n + ": " + n).join(", ");
  const hook = "  window.__SRT = { " + all + ", st: function () { return { S: S, V: V, FL: FL }; } };\n";
  const i = code.lastIndexOf("  window.SpaceRogue =");
  if (i < 0) throw new Error("Zeile mit window.SpaceRogue nicht gefunden");
  return code.slice(0, i) + hook + code.slice(i);
}
// Ohne Browser: reicht für alle Funktionen, die nur rechnen (Schiffslogik, Daten)
function loadLogic() {
  const win = {};
  new Function("window", hooked())(win);
  return win.__SRT;
}
module.exports = { hooked, loadLogic };
