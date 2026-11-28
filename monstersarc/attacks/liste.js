/* Monsters Arc – attacks/liste.js (seit v0.28.2)
   Feste Attackenliste des Spiels. Solange hier null steht, gilt nur die Liste im Browser (Dev-Kit → Attacken).
   Aus dem „Gesamten Arbeitsstand“ (Dev-Kit → Map-Editor) kommt deren Feld `attacks` hierhin:
   window.MA.ATTACK_LIST = [ … ]; – dann sieht jeder Spieler diese Attacken, auch ohne eigenen Browser-Stand. */
window.MA = window.MA || {};
window.MA.ATTACK_LIST = null;
