/* Monsters Arc – monsters/liste.js (seit v0.25)
   Feste Monsterliste des Spiels. Solange hier null steht, gilt nur die Liste im Browser (Dev-Kit → Monster-Editor).
   Schickt Noah eine exportierte Datei „MonstersArc_Monsterliste.json“, kommt deren Feld `list` hier hinein:
   window.MA.MONSTER_LIST = [ … ]; – dann sieht jeder Spieler diese Monster, auch ohne eigenen Browser-Stand. */
window.MA = window.MA || {};
window.MA.MONSTER_LIST = null;
