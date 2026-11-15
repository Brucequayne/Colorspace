/* Shizuku – scene-menu.js
   Minimalistisches Menü: schwarzer Bildschirm, in der Mitte 雫. Klick darauf startet den Übergang.
   Unten rechts: Samurai-Gliederpuppe (Loadout, kommt später).
   Unten links, kaum sichtbar: Zugang zum Dev Tool (Code-geschützt). */
(function () {
  var SZ = window.SZ, L2 = SZ.L2;
  var HASH = "3678a3a0";   // FNV-1a von "shizuku:" + Code
  function fnv(s) { var h = 0x811c9dc5; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16); }

  var MANNEQUIN = '<svg viewBox="0 0 48 76" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square">' +
    '<path d="M24 4v4"/><path d="M21 5h6"/><circle cx="24" cy="14" r="6"/><path d="M24 20v4"/>' +
    '<path d="M10 26h28l-3 3H13z"/><path d="M17 29l1 15h12l1-15"/><path d="M15 46h18"/>' +
    '<path d="M13 29l-3 13M35 29l3 13"/><circle cx="9.5" cy="44" r="1.6"/><circle cx="38.5" cy="44" r="1.6"/>' +
    '<path d="M18 46l-4 26h8l2-18 2 18h8l-4-26"/><path d="M24 70v4M16 74h16"/></g></svg>';

  var ui, timer = null, leaving = false;
  SZ.scenes.menu = {
    enter: function (opt) {
      leaving = false;
      SZ.audio.ambience(null);
      ui = SZ.main.ui;
      ui.innerHTML =
        '<div class="sz-menu' + (opt && opt.fromGame ? " sz-slow" : "") + '">' +
        '<a class="sz-back" href="#" title="' + L2("Zurück zu Color Space", "Back to Color Space") + '">← Color Space</a>' +
        '<button type="button" class="sz-kanji" aria-label="' + L2("Shizuku starten", "Start Shizuku") + '"><span>雫</span></button>' +
        '<button type="button" class="sz-mq" title="Loadout">' + MANNEQUIN + '</button>' +
        '<div class="sz-devbox"><button type="button" class="sz-dev" aria-label="Dev"></button>' +
        '<form class="sz-pass" hidden><input type="password" inputmode="numeric" autocomplete="off" maxlength="12" aria-label="Code"></form></div>' +
        '<div class="sz-toast" hidden></div></div>';
      var root = ui.firstChild, kanji = root.querySelector(".sz-kanji");
      kanji.addEventListener("click", function () {
        if (leaving) return; leaving = true;
        root.classList.add("sz-leave");
        SZ.audio.play("start");
        setTimeout(function () { SZ.main.go("intro"); }, 520);
      });
      root.querySelector(".sz-mq").addEventListener("click", function () {
        toast(L2("Loadout kommt in einer späteren Version.", "Loadout is coming in a later version."));
      });
      var form = root.querySelector(".sz-pass"), inp = form.querySelector("input");
      root.querySelector(".sz-dev").addEventListener("click", function () {
        if (sessionStorage.getItem("shizuku.dev") === "1") { SZ.main.go("editor"); return; }
        form.hidden = !form.hidden; if (!form.hidden) inp.focus();
      });
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        if (fnv("shizuku:" + inp.value) === HASH) { try { sessionStorage.setItem("shizuku.dev", "1"); } catch (er) {} SZ.main.go("editor"); }
        else { inp.value = ""; form.classList.remove("sz-no"); void form.offsetWidth; form.classList.add("sz-no"); }
      });
      function toast(t) {
        var el = root.querySelector(".sz-toast"); el.textContent = t; el.hidden = false;
        clearTimeout(timer); timer = setTimeout(function () { el.hidden = true; }, 2600);
      }
    },
    exit: function () { clearTimeout(timer); },
    update: function () {},
    render: function (ctx) { ctx.fillStyle = "#000"; ctx.fillRect(0, 0, SZ.W, SZ.H); }
  };
})();
