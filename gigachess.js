/* Gigachess 0.1 – Schach auf 10×10 mit dem Räuber. Für Soy and Soul.
   Einbindung: gigachess.js per script-Tag laden, dann Gigachess.mount(element, "de" | "en")
   und Gigachess.unmount() beim Verlassen der Seite. Die Partie wird nur lokal im Browser gespeichert. */
(function () {
  "use strict";

  var KEY = "gigachess-v1", VERSION = "0.11", N = 10;
  var FILES = "abcdefghij";

  // ---------- Texte ----------
  function L2(de, en) { return { de: de, en: en }; }
  var TX = {
    title: L2("Gigachess", "Gigachess"),
    intro: L2("Schach auf 10 × 10 Feldern mit einer neuen Figur: dem Räuber. Er zieht wie der König, schlägt aber nicht, sondern schiebt. Schlagen kann er nur, indem er eine Figur über den Brettrand schiebt.",
              "Chess on a 10 × 10 board with a new piece: the robber. It moves like a king but pushes instead of capturing. It can only capture by pushing a piece off the edge of the board."),
    white: L2("Weiß", "White"), black: L2("Schwarz", "Black"),
    toMove: L2("{c} ist am Zug", "{c} to move"), check: L2("Schach!", "Check!"),
    mate: L2("Schachmatt. {c} gewinnt.", "Checkmate. {c} wins."), stale: L2("Patt. Unentschieden.", "Stalemate. Draw."),
    flag: L2("Zeit abgelaufen. {c} gewinnt.", "Time is up. {c} wins."), resign: L2("{l} gibt auf. {c} gewinnt.", "{l} resigns. {c} wins."),
    draw: L2("Remis vereinbart.", "Draw agreed."),
    clockWait: L2("Die Uhr startet mit dem ersten Zug von Weiß.", "The clock starts with White's first move."),
    paused: L2("Uhr pausiert", "Clock paused"),
    newGame: L2("Neues Spiel", "New game"), start: L2("Spiel starten", "Start game"), cancel: L2("Abbrechen", "Cancel"),
    time: L2("Bedenkzeit pro Spieler", "Time per player"), inc: L2("Zeitgutschrift pro Zug", "Increment per move"),
    noClock: L2("Ohne Uhr", "No clock"), min: L2("{n} Min.", "{n} min"), sec: L2("+{n} s", "+{n} s"),
    undo: L2("Zug zurück", "Take back"), flip: L2("Brett drehen", "Flip board"),
    offerDraw: L2("Remis", "Draw"), giveUp: L2("Aufgeben", "Resign"), sure: L2("Sicher?", "Sure?"),
    pause: L2("Uhr anhalten", "Pause clock"), resume: L2("Uhr weiter", "Resume clock"),
    moves: L2("Züge", "Moves"), noMoves: L2("Noch keine Züge.", "No moves yet."),
    promo: L2("Umwandeln in", "Promote to"),
    names: { K: L2("König", "King"), Q: L2("Dame", "Queen"), R: L2("Turm", "Rook"), B: L2("Läufer", "Bishop"), N: L2("Springer", "Knight"), P: L2("Bauer", "Pawn"), X: L2("Räuber", "Robber") },
    letters: { de: { K: "K", Q: "D", R: "T", B: "L", N: "S", P: "", X: "R" }, en: { K: "K", Q: "Q", R: "R", B: "B", N: "N", P: "", X: "X" } },
    rulesH: L2("Regeln", "Rules"),
    rules: {
      de: [
        "Es gelten die normalen Schachregeln, nur auf 10 × 10 Feldern. Grundreihe von a bis j: Räuber, Turm, Springer, Läufer, Dame, König, Läufer, Springer, Turm, Räuber.",
        "Der Räuber zieht ein Feld in jede Richtung, gerade und diagonal. Steht dort eine Figur, rückt er auf ihr Feld und schiebt sie ein Feld weiter in dieselbe Richtung. Steht dahinter schon eine Figur, geht der Zug nicht.",
        "Schlagen kann der Räuber nur, indem er eine Figur über den Brettrand schiebt. Das geht auch mit eigenen Figuren, nur den eigenen König darf er nicht vom Brett schieben.",
        "Den gegnerischen König darf der Räuber schieben, auch ins Schach. Steht ein König am Rand und ein Räuber könnte ihn im nächsten Zug vom Brett schieben, ist das Schach. Kann der König weder ausweichen noch den Räuber loswerden, ist er matt.",
        "Bauern dürfen von ihrer Startreihe 1, 2 oder 3 Felder ziehen. En passant gibt es nur, wenn der Bauer direkt neben einem gegnerischen Bauern landet. Geschlagen wird auf das Feld direkt hinter ihm.",
        "Wird ein Bauer auf die letzte Reihe geschoben, wird er automatisch zur Dame. Zieht er selbst hin, wählt ihr die Figur.",
        "Rochade: Der König zieht 2 Felder Richtung Turm, der Turm springt auf die andere Seite neben ihn."
      ],
      en: [
        "Normal chess rules apply, just on a 10 × 10 board. Back rank from a to j: robber, rook, knight, bishop, queen, king, bishop, knight, rook, robber.",
        "The robber moves one square in any direction, straight or diagonal. If a piece is there, the robber takes its square and pushes it one square further in the same direction. If another piece stands behind it, the move is not allowed.",
        "The robber can only capture by pushing a piece off the edge. That works with your own pieces too, except your own king.",
        "The robber may push the enemy king, even into check. If a king stands on the edge and a robber could push it off next move, that is check. If the king can neither step away nor get rid of the robber, it is mate.",
        "Pawns may move 1, 2 or 3 squares from their starting rank. En passant only applies when the pawn lands directly beside an enemy pawn, which then captures onto the square right behind it.",
        "A pawn pushed onto the last rank becomes a queen automatically. If it moves there itself, you choose the piece.",
        "Castling: the king moves 2 squares towards the rook, and the rook jumps over to stand beside it."
      ]
    }
  };
  function t(k) { return TX[k][lang]; }
  function fmt(s, o) { return s.replace(/\{(\w+)\}/g, function (_, k) { return o[k]; }); }

  // ---------- Regeln ----------
  function sq(f, r) { return r * N + f; }
  function col(i) { return i % N; }
  function row(i) { return Math.floor(i / N); }
  function on(f, r) { return f >= 0 && f < N && r >= 0 && r < N; }
  function alg(i) { return FILES[col(i)] + (row(i) + 1); }
  function opp(c) { return c === "w" ? "b" : "w"; }
  var KING8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  var KNIGHT = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];
  var ROOKD = KING8.slice(0, 4), BISHD = KING8.slice(4);

  function initial() {
    var b = new Array(N * N).fill(null), id = 0;
    var back = ["X", "R", "N", "B", "Q", "K", "B", "N", "R", "X"];
    for (var f = 0; f < N; f++) {
      b[sq(f, 0)] = { id: ++id, t: back[f], c: "w", mv: false };
      b[sq(f, 1)] = { id: ++id, t: "P", c: "w", mv: false };
      b[sq(f, 8)] = { id: ++id, t: "P", c: "b", mv: false };
      b[sq(f, 9)] = { id: ++id, t: back[f], c: "b", mv: false };
    }
    return { b: b, turn: "w", ep: null };
  }
  function lastRank(c) { return c === "w" ? N - 1 : 0; }
  function startRank(c) { return c === "w" ? 1 : N - 2; }

  // Alle Züge ohne Rücksicht auf das eigene Schach. attackOnly: ohne Rochade
  function pseudo(S, c, attackOnly) {
    var out = [], b = S.b;
    for (var i = 0; i < N * N; i++) {
      var p = b[i];
      if (!p || p.c !== c) continue;
      var f = col(i), r = row(i);
      if (p.t === "P") {
        var d = c === "w" ? 1 : -1;
        if (!attackOnly) {
          for (var k = 1; k <= (r === startRank(c) ? 3 : 1); k++) {
            if (!on(f, r + d * k) || b[sq(f, r + d * k)]) break;
            addPawn(out, i, sq(f, r + d * k), "move", c);
          }
        }
        [-1, 1].forEach(function (df) {
          if (!on(f + df, r + d)) return;
          var to = sq(f + df, r + d), q = b[to];
          if (q && q.c !== c) addPawn(out, i, to, "cap", c);
          var ep = S.ep;
          if (ep && ep.c !== c && row(ep.land) === r && col(ep.land) === f + df && !b[to]) out.push({ from: i, to: to, kind: "ep", epCap: ep.land });
        });
      } else if (p.t === "N" || p.t === "K") {
        (p.t === "N" ? KNIGHT : KING8).forEach(function (d) {
          if (!on(f + d[0], r + d[1])) return;
          var to = sq(f + d[0], r + d[1]), q = b[to];
          if (!q) out.push({ from: i, to: to, kind: "move" });
          else if (q.c !== c) out.push({ from: i, to: to, kind: "cap" });
        });
        if (p.t === "K" && !attackOnly) castles(S, i, c, out);
      } else if (p.t === "X") {
        KING8.forEach(function (d) {
          if (!on(f + d[0], r + d[1])) return;
          var to = sq(f + d[0], r + d[1]), q = b[to];
          if (!q) { out.push({ from: i, to: to, kind: "move" }); return; }
          var f2 = f + 2 * d[0], r2 = r + 2 * d[1];
          if (!on(f2, r2)) {
            if (q.t === "K" && q.c === c) return; // den eigenen König nie vom Brett
            out.push({ from: i, to: to, kind: "pushoff" });
          } else if (!b[sq(f2, r2)]) out.push({ from: i, to: to, kind: "push", push: sq(f2, r2) });
        });
      } else {
        var dirs = p.t === "R" ? ROOKD : p.t === "B" ? BISHD : KING8;
        dirs.forEach(function (d) {
          var ff = f + d[0], rr = r + d[1];
          while (on(ff, rr)) {
            var to = sq(ff, rr), q = b[to];
            if (!q) out.push({ from: i, to: to, kind: "move" });
            else { if (q.c !== c) out.push({ from: i, to: to, kind: "cap" }); break; }
            ff += d[0]; rr += d[1];
          }
        });
      }
    }
    return out;
  }
  function addPawn(out, from, to, kind, c) {
    if (row(to) === lastRank(c)) ["Q", "R", "B", "N", "X"].forEach(function (pp) { out.push({ from: from, to: to, kind: kind, promo: pp }); });
    else out.push({ from: from, to: to, kind: kind });
  }
  function castles(S, k, c, out) {
    var b = S.b, K = b[k], r = row(k);
    if (K.mv || col(k) !== 5 || inCheck(S, c)) return;
    // kurz: Turm auf i, König f→h, Turm i→g
    var R1 = b[sq(8, r)];
    if (R1 && R1.t === "R" && R1.c === c && !R1.mv && !b[sq(6, r)] && !b[sq(7, r)] &&
        safeAt(S, k, sq(6, r), c) && safeAt(S, k, sq(7, r), c))
      out.push({ from: k, to: sq(7, r), kind: "castle", rf: sq(8, r), rt: sq(6, r) });
    // lang: Turm auf b, König f→d, Turm b→e
    var R2 = b[sq(1, r)];
    if (R2 && R2.t === "R" && R2.c === c && !R2.mv && !b[sq(2, r)] && !b[sq(3, r)] && !b[sq(4, r)] &&
        safeAt(S, k, sq(4, r), c) && safeAt(S, k, sq(3, r), c))
      out.push({ from: k, to: sq(3, r), kind: "castle", rf: sq(1, r), rt: sq(4, r) });
  }
  function safeAt(S, from, to, c) {
    var b = S.b.slice(); b[to] = b[from]; b[from] = null;
    return !kingTakeable({ b: b, turn: opp(c), ep: null }, c);
  }
  function kingSq(b, c) { for (var i = 0; i < N * N; i++) if (b[i] && b[i].t === "K" && b[i].c === c) return i; return -1; }
  // Kann die Gegenseite den König von c schlagen oder vom Brett schieben?
  function kingTakeable(S, c) {
    var k = kingSq(S.b, c);
    if (k < 0) return true;
    return pseudo(S, opp(c), true).some(function (m) { return m.to === k && (m.kind === "cap" || m.kind === "pushoff"); });
  }
  function inCheck(S, c) { return kingTakeable(S, c); }

  function apply(S, m) {
    var b = S.b.slice(), p = b[m.from], c = p.c, cap = null, pushed = null;
    b[m.from] = null;
    if (m.kind === "cap") cap = b[m.to];
    if (m.kind === "ep") { cap = b[m.epCap]; b[m.epCap] = null; }
    if (m.kind === "pushoff") cap = b[m.to];
    if (m.kind === "push") {
      var y = Object.assign({}, b[m.to], { mv: true });
      if (y.t === "P" && row(m.push) === lastRank(y.c)) { y.t = "Q"; y.auto = true; }
      b[m.push] = y; pushed = y;
    }
    var np = Object.assign({}, p, { mv: true });
    if (m.promo) np.t = m.promo;
    b[m.to] = np;
    if (m.kind === "castle") { b[m.rt] = Object.assign({}, b[m.rf], { mv: true }); b[m.rf] = null; }
    var ep = null;
    if (p.t === "P" && Math.abs(row(m.to) - row(m.from)) >= 2) ep = { land: m.to, c: c };
    return { b: b, turn: opp(c), ep: ep, cap: cap, pushed: pushed };
  }
  function legal(S) {
    return pseudo(S, S.turn, false).filter(function (m) { return !kingTakeable(apply(S, m), S.turn); });
  }

  function notation(S, m, after) {
    var p = S.b[m.from], L = TX.letters[lang], s;
    if (m.kind === "castle") s = col(m.rf) === 8 ? "0-0" : "0-0-0";
    else {
      s = L[p.t] + alg(m.from) + (m.kind === "cap" || m.kind === "ep" ? "×" : "–") + alg(m.to);
      if (m.kind === "ep") s += " e.p.";
      if (m.promo) s += "=" + L[m.promo];
      var q = S.b[m.to];
      if (m.kind === "push") s += " (" + (L[q.t] || (lang === "de" ? "B" : "P")) + "→" + alg(m.push) + (after.pushed && after.pushed.auto ? "=" + L.Q : "") + ")";
      if (m.kind === "pushoff") s += " (×" + (L[q.t] || (lang === "de" ? "B" : "P")) + alg(m.to) + ")";
    }
    var lm = legal(after);
    if (inCheck(after, after.turn)) s += lm.length ? "+" : "#";
    return s;
  }

  // ---------- Spielzustand ----------
  var G = null, V = null, lang = "de";
  function fresh(base, inc) {
    var s = initial();
    return { v: 1, S: s, hist: [], log: [], over: null, base: base, inc: inc,
      clock: { w: base, b: base }, started: false, paused: false, flip: false, lastMove: null, lost: { w: [], b: [] } };
  }
  function load() { try { var g = JSON.parse(localStorage.getItem(KEY) || "null"); if (g && g.v === 1) { g.paused = true; return g; } } catch (e) {} return null; }
  function save() { try { if (G) localStorage.setItem(KEY, JSON.stringify(G)); } catch (e) {} }

  function snapshot() { return JSON.stringify({ S: G.S, log: G.log, clock: G.clock, started: G.started, lastMove: G.lastMove, lost: G.lost, over: G.over }); }
  function play(m) {
    var S = G.S, mover = S.turn, p = S.b[m.from];
    var after = apply(S, m);
    var note = notation(S, m, after);
    G.hist.push(snapshot());
    if (G.hist.length > 400) G.hist.shift();
    if (after.cap) G.lost[after.cap.c].push(after.cap.t);
    var anim = { id: p.id, kind: m.kind };
    if (m.kind === "pushoff") { anim.offId = S.b[m.to].id; anim.dir = [col(m.to) - col(m.from), row(m.to) - row(m.from)]; anim.offFrom = m.to; }
    G.S = { b: after.b, turn: after.turn, ep: after.ep };
    G.lastMove = { from: m.from, to: m.to, push: m.push, kind: m.kind };
    if (mover === "w") G.log.push([note]); else if (G.log.length) G.log[G.log.length - 1].push(note); else G.log.push(["…", note]);
    if (G.base) {
      if (G.started) G.clock[mover] += G.inc;
      if (mover === "w") G.started = true;
    }
    G.paused = false;
    var lm = legal(G.S);
    if (!lm.length) G.over = inCheck(G.S, G.S.turn) ? { type: "mate", winner: mover } : { type: "stale" };
    save();
    render(anim);
  }

  // ---------- Grafik ----------
  var SHAPES = {
    P: '<circle cx="50" cy="30" r="13"/><path d="M30 82 Q31 58 44 49 L56 49 Q69 58 70 82 Z"/><rect x="24" y="80" width="52" height="10" rx="3"/>',
    R: '<path d="M27 44 L27 22 L37 22 L37 29 L45 29 L45 22 L55 22 L55 29 L63 29 L63 22 L73 22 L73 44 Z"/><path d="M33 44 L67 44 L69 80 L31 80 Z"/><rect x="24" y="80" width="52" height="10" rx="3"/>',
    N: '<path d="M30 88 L72 88 L69 76 Q65 58 70 44 Q73 28 58 19 L55 10 L49 19 Q35 23 29 39 L21 52 Q19 59 26 61 L35 56 Q41 54 47 50 Q41 64 31 76 Z"/><circle class="d" cx="52" cy="31" r="3.4"/>',
    B: '<circle cx="50" cy="13" r="5.5"/><path d="M50 18 Q67 32 64 50 Q62 60 58 64 L42 64 Q38 60 36 50 Q33 32 50 18 Z"/><path class="dl" d="M54 30 L45 46"/><path d="M41 64 L59 64 L65 80 L35 80 Z"/><rect x="25" y="80" width="50" height="10" rx="3"/>',
    Q: '<circle cx="23" cy="40" r="5"/><circle cx="37" cy="30" r="5"/><circle cx="50" cy="24" r="5"/><circle cx="63" cy="30" r="5"/><circle cx="77" cy="40" r="5"/><path d="M24 44 L37 35 L42 53 L50 29 L58 53 L63 35 L76 44 L67 68 L33 68 Z"/><path d="M33 68 L67 68 L71 80 L29 80 Z"/><rect x="24" y="80" width="52" height="10" rx="3"/>',
    K: '<rect x="46.5" y="6" width="7" height="22" rx="1.5"/><rect x="40" y="11" width="20" height="7" rx="1.5"/><path d="M27 48 Q50 26 73 48 L66 68 L34 68 Z"/><path d="M33 68 L67 68 L71 80 L29 80 Z"/><rect x="24" y="80" width="52" height="10" rx="3"/>',
    X: '<path d="M33 31 Q35 9 50 9 Q65 9 67 31 Z"/><circle cx="50" cy="35" r="15"/><rect class="d" x="34" y="29" width="32" height="9" rx="4"/><circle cx="44" cy="33.5" r="2.4"/><circle cx="56" cy="33.5" r="2.4"/><path d="M27 82 Q29 56 50 51 Q71 56 73 82 Z"/><path class="dl" d="M38 62 L62 74"/><rect x="24" y="80" width="52" height="10" rx="3"/>'
  };
  function pieceSVG(p) {
    return '<svg viewBox="0 0 100 100" class="gc-p ' + p.c + '" aria-hidden="true">' + SHAPES[p.t] + "</svg>";
  }

  var CSS = ".gc-ver{display:inline-block;margin-left:10px;padding:1px 8px;border:1px solid var(--line);border-radius:999px;font:600 .75rem var(--f-body);color:var(--soft);vertical-align:middle;letter-spacing:0}" +
    ".gc-wrap{display:grid;grid-template-columns:minmax(0,1fr);gap:20px;margin-top:22px}" +
    "@media (min-width:900px){.gc-wrap{grid-template-columns:minmax(0,660px) minmax(260px,1fr);align-items:start}}" +
    ".gc-boardbox{position:relative;width:100%;max-width:660px}" +
    ".gc-board{position:relative;width:100%;aspect-ratio:1;border-radius:4px;overflow:hidden;box-shadow:0 14px 40px rgba(0,0,0,.18);user-select:none;-webkit-user-select:none;touch-action:manipulation}" +
    ".gc-grid{position:absolute;inset:0;display:grid;grid-template-columns:repeat(10,1fr);grid-template-rows:repeat(10,1fr)}" +
    ".gc-sq{position:relative;border:0;padding:0;margin:0;background:#E9E2D3;cursor:pointer;font:inherit}" +
    ".gc-sq.dk{background:#A08F80}" +
    ".gc-sq.last::after{content:'';position:absolute;inset:0;background:rgba(227,184,63,.42)}" +
    ".gc-sq.sel::after{content:'';position:absolute;inset:0;background:rgba(46,125,91,.5)}" +
    ".gc-sq.chk::after{content:'';position:absolute;inset:0;background:radial-gradient(circle,rgba(194,65,45,.85) 0,rgba(194,65,45,.4) 45%,transparent 72%)}" +
    ".gc-sq:focus-visible{outline:3px solid #2E7D5B;outline-offset:-3px;z-index:2}" +
    ".gc-sq .co{position:absolute;font:600 .62rem/1 var(--f-body);color:rgba(21,23,21,.55);pointer-events:none}" +
    ".gc-sq.dk .co{color:rgba(247,244,238,.8)}" +
    ".gc-sq .co.f{right:3px;bottom:2px}.gc-sq .co.r{left:3px;top:3px}" +
    ".gc-mk{position:absolute;inset:0;pointer-events:none;z-index:3;display:grid;place-items:center}" +
    ".gc-mk i{display:block;width:28%;height:28%;border-radius:50%;background:rgba(21,23,21,.28)}" +
    ".gc-mk.cap i{width:86%;height:86%;background:transparent;border:4px solid rgba(21,23,21,.32);box-sizing:border-box}" +
    ".gc-mk.push i,.gc-mk.off i{width:86%;height:86%;background:transparent;border-radius:50%;box-sizing:border-box}" +
    ".gc-mk.push i{border:4px dashed rgba(46,125,91,.9)}.gc-mk.off i{border:4px solid rgba(194,65,45,.9)}" +
    ".gc-mk b{position:absolute;font:700 .9rem/1 var(--f-body);color:#fff;background:rgba(46,125,91,.95);border-radius:999px;padding:2px 5px}" +
    ".gc-mk.off b{background:rgba(194,65,45,.95)}" +
    ".gc-pcs{position:absolute;inset:0;pointer-events:none;z-index:2}" +
    ".gc-pc{position:absolute;left:0;top:0;width:10%;height:10%;transition:transform .2s ease,opacity .25s ease}" +
    ".gc-pc.gone{opacity:0}" +
    "@media (prefers-reduced-motion:reduce){.gc-pc{transition:none}}" +
    ".gc-p{display:block;width:100%;height:100%;filter:drop-shadow(0 2px 1.5px rgba(0,0,0,.28))}" +
    ".gc-p.w{fill:#F7F4EE;stroke:#1E1C1A;stroke-width:3;stroke-linejoin:round}.gc-p.w .d{fill:#1E1C1A}.gc-p.w .dl{fill:none;stroke:#1E1C1A}" +
    ".gc-p.b{fill:#2B2725;stroke:#0E0D0C;stroke-width:3;stroke-linejoin:round}.gc-p.b .d{fill:#F7F4EE;stroke:#F7F4EE}.gc-p.b .dl{fill:none;stroke:#F7F4EE}" +
    ".gc-p.w .d+circle,.gc-p.w .d~circle{fill:#F7F4EE;stroke:none}.gc-p.b .d~circle{fill:#2B2725;stroke:none}" +
    ".gc-side{display:flex;flex-direction:column;gap:14px;min-width:0}" +
    ".gc-clock{display:flex;justify-content:space-between;align-items:baseline;gap:12px;border:1px solid var(--line);border-radius:14px;padding:12px 16px}" +
    ".gc-clock b{font-weight:600}.gc-clock span{font:600 2rem/1 var(--f-display);font-variant-numeric:tabular-nums}" +
    ".gc-clock.on{background:var(--ink);color:var(--bg);border-color:var(--ink)}.gc-clock.low span{color:#C2412D}.gc-clock.on.low span{color:#F0A08F}" +
    ".gc-lost{display:flex;flex-wrap:wrap;gap:2px;min-height:22px}.gc-lost svg{width:22px;height:22px}" +
    ".gc-status{margin:0;font-weight:600;color:var(--accent);min-height:1.6em}" +
    ".gc-btns{display:flex;flex-wrap:wrap;gap:8px}" +
    ".gc-btns .navbtn[aria-disabled=true]{opacity:.45;cursor:default}.gc-btns .navbtn.armed{background:var(--accent);border-color:var(--accent);color:var(--bg)}" +
    ".gc-moves{border-top:1px solid var(--line);padding-top:10px}" +
    ".gc-moves h3{font:600 1.2rem/1.2 var(--f-display);color:var(--accent);margin:0 0 6px}" +
    ".gc-moves ol{margin:0;padding:0 0 0 2.2em;max-height:260px;overflow:auto;font-variant-numeric:tabular-nums;font-size:.92rem}" +
    ".gc-moves li{padding:2px 0}.gc-moves li span{display:inline-block;min-width:9.5em}" +
    ".gc-moves p{margin:0;color:var(--soft)}" +
    ".gc-dlg{position:absolute;inset:0;z-index:10;display:grid;place-items:center;background:rgba(21,23,21,.45);border-radius:4px}" +
    ".gc-dlg>div{background:var(--bg);color:var(--ink);border-radius:14px;padding:18px 20px;max-width:min(92%,420px);box-shadow:0 18px 50px rgba(0,0,0,.3)}" +
    ".gc-dlg h3{font:600 1.5rem/1.1 var(--f-display);margin:0 0 12px}" +
    ".gc-dlg .lbl{display:block;margin:10px 0 6px}" +
    ".gc-opts{display:flex;flex-wrap:wrap;gap:6px}" +
    ".gc-opts button{font:600 .88rem var(--f-body);padding:7px 12px;border-radius:999px;border:1px solid var(--line);background:transparent;color:var(--ink);cursor:pointer}" +
    ".gc-opts button[aria-pressed=true]{background:var(--ink);color:var(--bg);border-color:var(--ink)}" +
    ".gc-promo{display:flex;gap:8px}.gc-promo button{width:60px;height:60px;border-radius:12px;border:1px solid var(--line);background:#E9E2D3;cursor:pointer;padding:4px}" +
    ".gc-promo button:hover,.gc-promo button:focus-visible{background:#D9CDB7}" +
    ".gc-dlg .row{display:flex;gap:8px;margin-top:16px;flex-wrap:wrap}";

  function injectCSS() { var o = document.getElementById("gc-css"); if (o) o.remove(); var s = document.createElement("style"); s.id = "gc-css"; s.textContent = CSS; document.head.appendChild(s); }

  function html() {
    var rules = TX.rules[lang].map(function (r) { return "<p>" + r + "</p>"; }).join("");
    return '<h1 class="ptitle">' + t("title") + '<span class="gc-ver">v' + VERSION + '</span></h1><p class="pintro">' + t("intro") + "</p>" +
      '<div class="gc-wrap"><div class="gc-boardbox"><div class="gc-board" id="gc-board"><div class="gc-grid" id="gc-grid"></div><div class="gc-pcs" id="gc-pcs"></div></div><div id="gc-dlgwrap"></div></div>' +
      '<div class="gc-side"><div><div class="gc-clock" id="gc-ck-top"></div><div class="gc-lost" id="gc-lost-top"></div></div>' +
      '<p class="gc-status" id="gc-status" aria-live="polite"></p>' +
      '<div><div class="gc-lost" id="gc-lost-bot"></div><div class="gc-clock" id="gc-ck-bot"></div></div>' +
      '<div class="gc-btns">' +
      '<button type="button" class="navbtn" data-gc="new">' + t("newGame") + '</button>' +
      '<button type="button" class="navbtn" data-gc="undo">' + t("undo") + '</button>' +
      '<button type="button" class="navbtn" data-gc="flip">' + t("flip") + '</button>' +
      '<button type="button" class="navbtn" data-gc="pause" id="gc-pause"></button>' +
      '<button type="button" class="navbtn" data-gc="draw" id="gc-draw">' + t("offerDraw") + '</button>' +
      '<button type="button" class="navbtn" data-gc="resign" id="gc-resign">' + t("giveUp") + "</button></div>" +
      '<div class="gc-moves"><h3>' + t("moves") + '</h3><div id="gc-moves"></div></div></div></div>' +
      '<section class="phow"><h2>' + t("rulesH") + "</h2>" + rules + "</section>";
  }

  // Bildschirmposition: Weiß unten, außer das Brett ist gedreht
  function scr(i) { var f = col(i), r = row(i); return G.flip ? { x: N - 1 - f, y: r } : { x: f, y: N - 1 - r }; }
  function sqAt(x, y) { return G.flip ? sq(N - 1 - x, y) : sq(x, N - 1 - y); }

  var sel = -1, moves = [], els = {};
  function buildGrid() {
    var g = document.getElementById("gc-grid"), h = "";
    for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
      var i = sqAt(x, y), dk = (col(i) + row(i)) % 2 === 0;
      h += '<button type="button" class="gc-sq' + (dk ? " dk" : "") + '" data-sq="' + i + '" aria-label="' + alg(i) + '">' +
        (y === N - 1 ? '<span class="co f">' + FILES[col(i)] + "</span>" : "") + (x === 0 ? '<span class="co r">' + (row(i) + 1) + "</span>" : "") + "</button>";
    }
    g.innerHTML = h;
  }

  function render(anim) {
    if (!V) return;
    var S = G.S, b = S.b, layer = document.getElementById("gc-pcs"), seen = {};
    // Figuren: per id wiederverwenden, damit Züge und Schübe gleiten
    for (var i = 0; i < N * N; i++) {
      var p = b[i]; if (!p) continue;
      seen[p.id] = 1;
      var el = els[p.id];
      if (!el) { el = document.createElement("div"); el.className = "gc-pc"; layer.appendChild(el); els[p.id] = el; el.dataset.t = ""; }
      if (el.dataset.t !== p.t + p.c) { el.innerHTML = pieceSVG(p); el.dataset.t = p.t + p.c; }
      var s = scr(i); el.style.transform = "translate(" + s.x * 100 + "%," + s.y * 100 + "%)"; el.classList.remove("gone");
    }
    Object.keys(els).forEach(function (id) {
      if (seen[id]) return;
      var el = els[id]; delete els[id];
      if (anim && anim.offId === +id) { // über den Rand schieben
        var s0 = scr(anim.offFrom), dx = anim.dir[0] * (G.flip ? -1 : 1), dy = -anim.dir[1] * (G.flip ? -1 : 1);
        el.style.transform = "translate(" + (s0.x + dx) * 100 + "%," + (s0.y + dy) * 100 + "%)";
        setTimeout(function () { el.classList.add("gone"); }, 150);
        setTimeout(function () { el.remove(); }, 450);
      } else { el.classList.add("gone"); setTimeout(function () { el.remove(); }, 260); }
    });
    // Markierungen
    var chk = !G.over || G.over.type === "mate" ? (inCheck(S, S.turn) ? kingSq(b, S.turn) : -1) : -1;
    Array.prototype.forEach.call(document.querySelectorAll("#gc-grid .gc-sq"), function (el) {
      var i = +el.dataset.sq, lm = G.lastMove;
      el.classList.toggle("last", !!lm && (lm.from === i || lm.to === i || lm.push === i));
      el.classList.toggle("sel", i === sel);
      el.classList.toggle("chk", i === chk);
      var old = el.querySelector(".gc-mk"); if (old) old.remove();
      var ms = moves.filter(function (m) { return m.to === i; });
      if (ms.length) {
        var m = ms[0], k = m.kind === "push" ? "push" : m.kind === "pushoff" ? "off" : m.kind === "cap" || m.kind === "ep" ? "cap" : "";
        var mk = document.createElement("span"); mk.className = "gc-mk " + k;
        var arrow = "";
        if (k === "push" || k === "off") {
          var d = [col(m.to) - col(m.from), row(m.to) - row(m.from)];
          if (G.flip) { d[0] = -d[0]; d[1] = -d[1]; }
          arrow = "<b>" + "↖↑↗←·→↙↓↘".charAt((1 - d[1]) * 3 + (d[0] + 1)) + "</b>";
        }
        mk.innerHTML = "<i></i>" + arrow; el.appendChild(mk);
      }
    });
    renderSide();
  }

  function fmtClock(ms) {
    if (ms <= 0) return "0:00";
    var s = ms / 1000;
    if (s < 10) return "0:0" + s.toFixed(1);
    var m = Math.floor(s / 60), r = Math.floor(s % 60);
    return m + ":" + (r < 10 ? "0" : "") + r;
  }
  function lostHTML(arr, c) { return arr.map(function (tt) { return pieceSVG({ t: tt, c: c }); }).join(""); }
  function renderSide() {
    var top = G.flip ? "w" : "b", bot = opp(top), running = !G.over && G.base && G.started && !G.paused;
    [["top", top], ["bot", bot]].forEach(function (z) {
      var el = document.getElementById("gc-ck-" + z[0]), c = z[1];
      var active = !G.over && G.S.turn === c;
      el.className = "gc-clock" + (active ? " on" : "") + (G.base && G.clock[c] < 20000 ? " low" : "");
      el.innerHTML = "<b>" + t(c === "w" ? "white" : "black") + "</b><span>" + (G.base ? fmtClock(G.clock[c]) : "–") + "</span>";
      document.getElementById("gc-lost-" + z[0]).innerHTML = lostHTML(G.lost[c], c);
    });
    var st = "", cn = function (c) { return t(c === "w" ? "white" : "black"); };
    if (G.over) {
      var o = G.over;
      st = o.type === "mate" ? fmt(t("mate"), { c: cn(o.winner) }) : o.type === "stale" ? t("stale") : o.type === "flag" ? fmt(t("flag"), { c: cn(o.winner) }) :
        o.type === "resign" ? fmt(t("resign"), { l: cn(opp(o.winner)), c: cn(o.winner) }) : t("draw");
    } else {
      st = fmt(t("toMove"), { c: cn(G.S.turn) }) + (inCheck(G.S, G.S.turn) ? " · " + t("check") : "");
      if (G.base && !G.started) st += " · " + t("clockWait");
      else if (G.base && G.paused) st += " · " + t("paused");
    }
    document.getElementById("gc-status").textContent = st;
    var pb = document.getElementById("gc-pause");
    pb.hidden = !G.base || G.over || !G.started;
    pb.textContent = G.paused ? t("resume") : t("pause");
    ["undo", "draw", "resign"].forEach(function (k) {
      var b = V.root.querySelector('[data-gc="' + k + '"]');
      var dis = k === "undo" ? !G.hist.length : !!G.over;
      b.setAttribute("aria-disabled", String(dis));
    });
    var mv = document.getElementById("gc-moves");
    mv.innerHTML = G.log.length ? "<ol>" + G.log.map(function (p) { return "<li><span>" + p[0] + "</span>" + (p[1] || "") + "</li>"; }).join("") + "</ol>" : "<p>" + t("noMoves") + "</p>";
    var ol = mv.querySelector("ol"); if (ol) ol.scrollTop = ol.scrollHeight;
  }

  // ---------- Bedienung ----------
  function clickSq(i) {
    if (!G || G.over) return;
    var S = G.S, p = S.b[i];
    var hit = moves.filter(function (m) { return m.to === i; });
    if (sel >= 0 && hit.length) {
      if (hit.length > 1 && hit[0].promo) { promoDialog(hit); return; }
      sel = -1; moves = []; play(hit[0]); return;
    }
    if (p && p.c === S.turn) {
      sel = i; moves = legal(S).filter(function (m) { return m.from === i; });
    } else { sel = -1; moves = []; }
    render();
  }
  function promoDialog(opts) {
    var w = document.getElementById("gc-dlgwrap"), c = G.S.turn;
    w.innerHTML = '<div class="gc-dlg"><div><h3>' + t("promo") + '</h3><div class="gc-promo">' +
      opts.map(function (m) { return '<button type="button" data-promo="' + m.promo + '" title="' + TX.names[m.promo][lang] + '" aria-label="' + TX.names[m.promo][lang] + '">' + pieceSVG({ t: m.promo, c: c }) + "</button>"; }).join("") +
      '</div><div class="row"><button type="button" class="navbtn" data-promo="">' + t("cancel") + "</button></div></div></div>";
    var first = w.querySelector("[data-promo]"); if (first) first.focus();
    V.promo = opts;
  }
  var TIMES = [0, 1, 3, 5, 10, 15, 30], INCS = [0, 2, 5, 10];
  function setupDialog() {
    var w = document.getElementById("gc-dlgwrap"), cur = V.setup || { base: G ? G.base / 60000 : 10, inc: G ? G.inc / 1000 : 0 };
    V.setup = cur;
    w.innerHTML = '<div class="gc-dlg"><div><h3>' + t("newGame") + '</h3><span class="lbl">' + t("time") + '</span><div class="gc-opts">' +
      TIMES.map(function (m) { return '<button type="button" data-time="' + m + '" aria-pressed="' + (cur.base === m) + '">' + (m ? fmt(t("min"), { n: m }) : t("noClock")) + "</button>"; }).join("") +
      '</div><span class="lbl">' + t("inc") + '</span><div class="gc-opts">' +
      INCS.map(function (s) { return '<button type="button" data-inc="' + s + '" aria-pressed="' + (cur.inc === s) + '">' + fmt(t("sec"), { n: s }) + "</button>"; }).join("") +
      '</div><div class="row"><button type="button" class="navbtn" data-gc="start">' + t("start") + "</button>" +
      (G ? '<button type="button" class="navbtn" data-gc="close">' + t("cancel") + "</button>" : "") + "</div></div></div>";
  }
  function closeDlg() { var w = document.getElementById("gc-dlgwrap"); if (w) w.innerHTML = ""; V.promo = null; }

  function onClick(e) {
    var s = e.target.closest("[data-sq]");
    if (s) { clickSq(+s.dataset.sq); return; }
    var pr = e.target.closest("[data-promo]");
    if (pr) {
      var k = pr.dataset.promo, m = k && V.promo && V.promo.filter(function (x) { return x.promo === k; })[0];
      closeDlg(); sel = -1; moves = [];
      if (m) play(m); else render();
      return;
    }
    var tb = e.target.closest("[data-time]");
    if (tb) { V.setup.base = +tb.dataset.time; setupDialog(); return; }
    var ib = e.target.closest("[data-inc]");
    if (ib) { V.setup.inc = +ib.dataset.inc; setupDialog(); return; }
    var b = e.target.closest("[data-gc]"); if (!b) return;
    var a = b.dataset.gc;
    if (b.getAttribute("aria-disabled") === "true") return;
    if (a === "new") { setupDialog(); return; }
    if (a === "close") { closeDlg(); return; }
    if (a === "start") {
      G = fresh(V.setup.base * 60000, V.setup.inc * 1000);
      closeDlg(); sel = -1; moves = []; clearPieces(); buildGrid(); save(); render(); return;
    }
    if (a === "flip") { G.flip = !G.flip; save(); clearPieces(); buildGrid(); render(); return; }
    if (a === "pause") { G.paused = !G.paused; save(); renderSide(); return; }
    if (a === "undo") {
      var last = G.hist.pop(); if (!last) return;
      var o = JSON.parse(last);
      G.S = o.S; G.log = o.log; G.clock = o.clock; G.started = o.started; G.lastMove = o.lastMove; G.lost = o.lost; G.over = o.over;
      sel = -1; moves = []; save(); render(); return;
    }
    if (a === "draw" || a === "resign") {
      if (!b.classList.contains("armed")) {
        b.classList.add("armed"); b.textContent = t("sure");
        setTimeout(function () { if (b.isConnected) { b.classList.remove("armed"); b.textContent = t(a === "draw" ? "offerDraw" : "giveUp"); } }, 3500);
        return;
      }
      b.classList.remove("armed"); b.textContent = t(a === "draw" ? "offerDraw" : "giveUp");
      G.over = a === "draw" ? { type: "draw" } : { type: "resign", winner: opp(G.S.turn) };
      sel = -1; moves = []; save(); render();
    }
  }
  function onKey(e) { if (e.key === "Escape" && V) { closeDlg(); sel = -1; moves = []; render(); } }
  function clearPieces() { var l = document.getElementById("gc-pcs"); if (l) l.innerHTML = ""; els = {}; }

  var timer = 0, lastT = 0;
  function tickClock() {
    var now = performance.now(), dt = now - lastT; lastT = now;
    if (!G || !V || G.over || !G.base || !G.started || G.paused) return;
    var c = G.S.turn;
    G.clock[c] -= dt;
    if (G.clock[c] <= 0) { G.clock[c] = 0; G.over = { type: "flag", winner: opp(c) }; sel = -1; moves = []; save(); render(); return; }
    renderSide();
    if (Math.random() < 0.05) save();
  }

  function mount(el, l) {
    unmount();
    lang = l === "en" ? "en" : "de";
    injectCSS();
    el.innerHTML = html();
    V = { root: el };
    if (!G) G = load();
    var firstRun = !G;
    if (!G) G = fresh(600000, 0);
    els = {}; sel = -1; moves = [];
    buildGrid(); render();
    el.addEventListener("click", onClick);
    window.addEventListener("keydown", onKey);
    lastT = performance.now();
    timer = setInterval(tickClock, 100);
    if (firstRun) setupDialog();
  }
  function unmount() {
    if (timer) clearInterval(timer); timer = 0;
    if (V) { V.root.removeEventListener("click", onClick); window.removeEventListener("keydown", onKey); V = null; }
    if (G && G.started && !G.over) G.paused = true;
    save();
  }
  window.addEventListener("pagehide", save);

  window.Gigachess = { mount: mount, unmount: unmount,
    _rules: { initial: initial, legal: legal, apply: apply, inCheck: inCheck, sq: sq, alg: alg, notation: function (S, m) { return notation(S, m, apply(S, m)); } },
    _debug: function () { return { G: G, play: play, legal: legal }; } };
})();
