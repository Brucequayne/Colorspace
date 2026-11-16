  // ===== 74-menue.js · Spielmenü und Einstellungen (v0.57.5) =====
  // Beim Start erscheint das Menü: Story (in Entwicklung), Editor, Einstellungen. Aus dem Editor führt „Menü“ zurück.
  // Einstellungen liegen unter einem eigenen Speicherschlüssel; die HUD-Größe bleibt wie bisher unter spacerogue-ui.
  var SETK = "spacerogue-settings-v1";
  function setLoad() { try { var o = JSON.parse(localStorage.getItem(SETK) || "{}"); ["auto", "air", "tips"].forEach(function (k) { if (typeof o[k] === "boolean") SET[k] = o[k]; }); if (typeof o.sfx === "number") SET.sfx = Math.max(0, Math.min(1, o.sfx)); } catch (e) {} }
  function setSave() { try { localStorage.setItem(SETK, JSON.stringify(SET)); } catch (e) {} }
  function menuHtml() {
    function tg(k) { return '<div class="sr-mrow"><span>' + t(k === "auto" ? "setAuto" : k === "air" ? "setAir" : "setTips") + '</span><span class="sr-seg"><button type="button" data-set="' + k + '" data-v="1">' + t("on") + '</button><button type="button" data-set="' + k + '" data-v="0">' + t("off") + "</button></span></div>"; }
    return '<div class="sr-menu" hidden><div class="sr-mbox">' +
      '<div class="sr-mhead"><b>' + t("title") + '</b><small>v' + VERSION + '</small></div>' +
      '<div class="sr-mmain">' +
      '<button type="button" class="sr-mbtn sr-mdev" data-menu="story"><b>' + t("mStory") + '</b><span class="sr-mtag">' + t("mDev") + '</span></button>' +
      '<button type="button" class="sr-mbtn sr-mgo" data-menu="editor"><b>' + t("mEditor") + '</b><small>' + t("mEdT") + '</small></button>' +
      '<button type="button" class="sr-mbtn" data-menu="set"><b>' + t("mSet") + '</b></button>' +
      '<p class="sr-mmsg"></p></div>' +
      '<div class="sr-mset" hidden><h4>' + t("mSet") + '</h4>' +
      '<div class="sr-mrow"><span>' + t("setHud") + ' <b id="sr-mhud-v"></b></span><input type="range" id="sr-mhud" min="1" max="1.5" step="0.05"></div>' +
      '<div class="sr-mrow"><span>' + t("setSfx") + ' <b id="sr-msfx-v"></b></span><input type="range" id="sr-msfx" min="0" max="1" step="0.05"></div>' +
      tg("auto") + tg("air") + tg("tips") +
      '<button type="button" class="sr-mbtn sr-mback" data-menu="back"><b>← ' + t("mBack") + '</b></button></div>' +
      "</div></div>";
  }
  function menuOpen() {
    if (!V) return; if (S.mode === "fly") stopTest();
    var el = V.root.querySelector(".sr-menu"); if (!el) return;
    V.menu = true; el.hidden = false; el.querySelector(".sr-mmain").hidden = false; el.querySelector(".sr-mset").hidden = true; el.querySelector(".sr-mmsg").textContent = "";
    V.row = null; V.pan = null; V.keys = {};
  }
  function menuClose() { if (!V) return; var el = V.root.querySelector(".sr-menu"); if (el) el.hidden = true; V.menu = false; syncUI(); }
  function menuSync() {
    if (!V) return; var el = V.root.querySelector(".sr-menu"); if (!el) return;
    el.querySelectorAll("[data-set]").forEach(function (b) { b.setAttribute("aria-pressed", String(SET[b.getAttribute("data-set")] === (b.getAttribute("data-v") === "1"))); });
    var hs = el.querySelector("#sr-mhud"); if (hs) { hs.value = V.uis || 1; set("sr-mhud-v", Math.round((V.uis || 1) * 100) + " %"); }
    var fx = el.querySelector("#sr-msfx"); if (fx) { fx.value = SET.sfx; set("sr-msfx-v", Math.round(SET.sfx * 100) + " %"); }
    var ab = V.root.querySelector('[data-act="auto"]'); if (ab) ab.setAttribute("aria-pressed", String(SET.auto));
  }
  function menuClick(e) {
    sndLoad();   // erster Klick: Sounds laden (Browser erlauben Ton erst nach einer Eingabe)
    var m = e.target.closest("[data-menu]"), st = e.target.closest("[data-set]"); if (!m && !st) return false;
    var el = V.root.querySelector(".sr-menu");
    if (st) { SET[st.getAttribute("data-set")] = st.getAttribute("data-v") === "1"; setSave(); menuSync(); return true; }
    var w = m.getAttribute("data-menu");
    if (w === "editor") menuClose();
    else if (w === "story") el.querySelector(".sr-mmsg").textContent = t("mStoryT");
    else if (w === "set") { el.querySelector(".sr-mmain").hidden = true; el.querySelector(".sr-mset").hidden = false; menuSync(); }
    else if (w === "back") { el.querySelector(".sr-mmain").hidden = false; el.querySelector(".sr-mset").hidden = true; }
    return true;
  }
  function menuInput(e) {
    if (e.target.id === "sr-msfx") { sndLoad(); sndVol(+e.target.value); setSave(); menuSync(); snd("pShot"); return true; }   // Probeschuss zum Einstellen
    if (e.target.id !== "sr-mhud") return false;
    hudScale(+e.target.value); try { localStorage.setItem("spacerogue-ui", String(V.uis)); } catch (er) {} menuSync(); return true;
  }
