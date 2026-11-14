/* Shizuku – input.js
   Tastatur und Maus. Die Maus wird in Arena-Pixel umgerechnet (SZ.input.mx/my).
   Belegung: WASD laufen, Maus = Blickrichtung, Linksklick Angriff, Rechtsklick Block,
   Q bzw. E gedrückt halten wählt Angriff/Block 2 bzw. 3. */
(function () {
  var SZ = window.SZ;
  var I = SZ.input = {
    keys: {}, pressed: {},
    mx: SZ.W / 2, my: SZ.H / 2, sx: 0, sy: 0, inside: false,
    lmb: false, rmb: false, lmbHit: false, rmbHit: false,
    wheel: 0, el: null
  };
  var view = { x: 0, y: 0, s: 1 };
  I.setView = function (x, y, s) { view.x = x; view.y = y; view.s = s; };
  function toArena(cx, cy) {
    I.sx = cx; I.sy = cy;
    I.mx = (cx - view.x) / view.s;
    I.my = (cy - view.y) / view.s;
    I.inside = I.mx >= 0 && I.my >= 0 && I.mx < SZ.W && I.my < SZ.H;
  }
  function typing(e) { var t = e.target; return t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT"); }
  function kd(e) {
    if (typing(e)) return;
    var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (!I.keys[k]) I.pressed[k] = true;
    I.keys[k] = true;
    if (I.el && ["w", "a", "s", "d", "q", "e", " ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(k) >= 0) e.preventDefault();
  }
  function ku(e) { var k = e.key.length === 1 ? e.key.toLowerCase() : e.key; I.keys[k] = false; }
  function mm(e) { toArena(e.clientX, e.clientY); }
  function md(e) {
    if (!I.el || !I.el.contains(e.target) || e.target.tagName !== "CANVAS") return;
    toArena(e.clientX, e.clientY);
    if (e.button === 0) { I.lmb = true; I.lmbHit = true; }
    if (e.button === 2) { I.rmb = true; I.rmbHit = true; }
  }
  function mu(e) { if (e.button === 0) I.lmb = false; if (e.button === 2) I.rmb = false; }
  function cm(e) { if (I.el && I.el.contains(e.target)) e.preventDefault(); }
  function wh(e) { if (I.el && e.target.tagName === "CANVAS") { I.wheel += Math.sign(e.deltaY); e.preventDefault(); } }
  function blur() { I.keys = {}; I.lmb = I.rmb = false; }

  I.attach = function (el) {
    I.el = el;
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    window.addEventListener("pointermove", mm);
    window.addEventListener("pointerdown", md);
    window.addEventListener("pointerup", mu);
    window.addEventListener("contextmenu", cm);
    window.addEventListener("wheel", wh, { passive: false });
    window.addEventListener("blur", blur);
  };
  I.detach = function () {
    window.removeEventListener("keydown", kd);
    window.removeEventListener("keyup", ku);
    window.removeEventListener("pointermove", mm);
    window.removeEventListener("pointerdown", md);
    window.removeEventListener("pointerup", mu);
    window.removeEventListener("contextmenu", cm);
    window.removeEventListener("wheel", wh);
    window.removeEventListener("blur", blur);
    I.el = null; blur();
  };
  // Am Ende jedes Bilds: einmalige Ereignisse zurücksetzen
  I.endFrame = function () { I.pressed = {}; I.lmbHit = false; I.rmbHit = false; I.wheel = 0; };
  I.down = function (k) { return !!I.keys[k]; };
  I.hit = function (k) { return !!I.pressed[k]; };
})();
