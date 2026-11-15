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

  var ui, timer = null, leaving = false, MENU_KEYS = null;
  SZ.scenes.menu = {
    enter: function (opt) {
      leaving = false;
      SZ.audio.ambience(null);
      SZ.audio.musicStop();
      ui = SZ.main.ui;
      ui.innerHTML =
        '<div class="sz-menu' + (opt && opt.fromGame ? " sz-slow" : "") + '">' +
        '<a class="sz-back" href="#" title="' + L2("Zurück zu Color Space", "Back to Color Space") + '">← Color Space</a>' +
        '<button type="button" class="sz-kanji" aria-label="' + L2("Shizuku starten", "Start Shizuku") + '"><span>雫</span></button>' +
        '<button type="button" class="sz-mq" title="Loadout">' + MANNEQUIN + '</button>' +
        '<div class="sz-devbox"><button type="button" class="sz-dev" aria-label="Dev"></button>' +
        '<form class="sz-pass" hidden><input type="password" inputmode="numeric" autocomplete="off" maxlength="12" aria-label="Code"></form></div>' +
        '<div class="sz-toast" hidden></div>' +
        '<div class="sz-lo" hidden><div class="sz-lo-box" role="dialog" aria-label="Loadout"><h2>Loadout</h2>' +
        '<div class="sz-lo-slots"></div><div class="sz-lo-list"></div>' +
        '<h2 class="sz-lo-h2">' + L2("Element", "Element") + '</h2><div class="sz-lo-elem"></div>' +
        '<p class="sz-lo-hint">' + L2("Slot wählen, dann Waffe. Im Kampf wechseln die Tasten 1 und 2.", "Pick a slot, then a weapon. In combat, keys 1 and 2 switch.") + '</p>' +
        '<button type="button" class="sz-lo-close">' + L2("Fertig", "Done") + '</button></div></div></div>';
      var root = ui.firstChild, kanji = root.querySelector(".sz-kanji");
      kanji.addEventListener("click", function () {
        if (leaving) return; leaving = true;
        root.classList.add("sz-leave");
        SZ.audio.play("start");
        setTimeout(function () { SZ.main.go("intro"); }, 520);
      });
      // ---------- Loadout: zwei Waffen-Slots ----------
      var lo = root.querySelector(".sz-lo"), slots = SZ.loadout.get(), active = 0;
      var INFO = {
        katana: { d: L2("Ausgewogen. Muss zu Beginn gezogen werden.", "Balanced. Must be drawn at the start."), r: 0.52, s: 0.83, k: 0.45 },
        yari: { d: L2("Große Reichweite, weniger Schaden, starker Rückstoß.", "Long reach, less damage, strong knockback."), r: 0.78, s: 0.58, k: 0.85 },
        yumi: { d: L2("Fernkampf. Je länger gespannt, desto stärker.", "Ranged. The longer the draw, the stronger."), r: 1, s: 0.7, k: 0.3 },
        shuriken: { d: L2("Hohe Feuerrate (3 pro Sekunde), kurze Reichweite, kein Durchschlagen.", "High rate of fire (3 per second), short range, no piercing."), r: 0.6, s: 0.35, k: 0.15 },
        kunai: { d: L2("Mehr Schaden und Reichweite als Shuriken, 1 Wurf pro Sekunde.", "More damage and range than shuriken, 1 throw per second."), r: 0.82, s: 0.8, k: 0.3 }
      };
      var ELEM = {
        water: { n: L2("Wasser", "Water"), d: L2("Q zwischen den Wellen: Kacheln in Wasser verwandeln (300 Gleichgewicht je Kachel). Im Wasser kein Tempoverlust.", "Q between waves: turn tiles into water (300 balance per tile). No slowdown in water.") },
        none: { n: L2("Kein Element", "No element"), d: L2("Ohne Element-Fähigkeit.", "No element ability.") }
      };
      function iconURL(id) { var c = SZ.canvas(13, 13); SZ.weaponIcon(c.ctx, 1, 1, id); return c.toDataURL(); }
      function bar(lbl, v) { return '<div class="sz-lo-bar"><span>' + lbl + '</span><i><u style="width:' + Math.round(v * 100) + '%"></u></i></div>'; }
      function renderLo() {
        var el = SZ.loadout.element();
        lo.querySelector(".sz-lo-elem").innerHTML = Object.keys(ELEM).map(function (k) {
          return '<button type="button" data-el="' + k + '" class="' + (k === el ? "on" : "") + '">' + (k === "water" ? '<span class="sz-wv">' + SZ.WAVE_SVG + '</span>' : '<span class="sz-wv">·</span>') + '<b>' + ELEM[k].n + '</b><small>' + ELEM[k].d + '</small></button>';
        }).join("");
        lo.querySelector(".sz-lo-slots").innerHTML = slots.map(function (id, i) {
          return '<button type="button" data-slot="' + i + '" aria-pressed="' + (i === active) + '"><kbd>' + (i + 1) + '</kbd><img alt="" src="' + iconURL(id) + '"><b>' + SZ.WEAPONS[id].name() + '</b></button>';
        }).join("");
        lo.querySelector(".sz-lo-list").innerHTML = SZ.loadout.all.map(function (id) {
          var I = INFO[id] || { d: "", r: 0.5, s: 0.5, k: 0.5 }, inSlot = slots.indexOf(id);
          return '<button type="button" data-w="' + id + '" class="' + (inSlot >= 0 ? "on" : "") + '"><img alt="" src="' + iconURL(id) + '"><b>' + SZ.WEAPONS[id].name() + (inSlot >= 0 ? " <kbd>" + (inSlot + 1) + "</kbd>" : "") + '</b>' +
            bar(L2("Reichweite", "Reach"), I.r) + bar(L2("Schaden", "Damage"), I.s) + bar(L2("Rückstoß", "Knockback"), I.k) + '<small>' + I.d + '</small></button>';
        }).join("");
      }
      lo.addEventListener("click", function (e) {
        if (e.target === lo || e.target.closest(".sz-lo-close")) { lo.hidden = true; return; }
        var sb = e.target.closest("[data-slot]"), wb = e.target.closest("[data-w]"), eb = e.target.closest("[data-el]");
        if (eb) { SZ.loadout.setElement(eb.dataset.el); renderLo(); return; }
        if (sb) { active = +sb.dataset.slot; renderLo(); }
        if (wb) {
          var id = wb.dataset.w, other = 1 - active;
          if (slots[other] === id) slots[other] = slots[active];   // schon im anderen Slot → tauschen
          slots[active] = id; SZ.loadout.set(slots);
          active = other; renderLo();
        }
      });
      root.querySelector(".sz-mq").addEventListener("click", function () { slots = SZ.loadout.get(); active = 0; renderLo(); lo.hidden = false; });
      MENU_KEYS = function (e) { if (e.key === "Escape" && !lo.hidden) { lo.hidden = true; e.stopPropagation(); } };
      window.addEventListener("keydown", MENU_KEYS, true);
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
    exit: function () { clearTimeout(timer); if (MENU_KEYS) window.removeEventListener("keydown", MENU_KEYS, true); MENU_KEYS = null; },
    update: function () {},
    render: function (ctx) { ctx.fillStyle = "#000"; ctx.fillRect(0, 0, SZ.W, SZ.H); }
  };
})();
