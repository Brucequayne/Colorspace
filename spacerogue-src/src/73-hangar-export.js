  // ===== 73-hangar-export.js · Hangar und Export/Import-Fenster =====
  function npcBlocks(sh) { return parseShip(JSON.stringify(sh.code)) || []; }
  function shipThumb(blocks, size) {
    var cv = document.createElement("canvas"), dpr = Math.min(2, window.devicePixelRatio || 1); cv.width = cv.height = size * dpr; cv.style.width = cv.style.height = size + "px";
    var c = cv.getContext("2d"), bb = bounds(blocks); if (!bb) return cv;
    var bw = bb.x1 - bb.x0, bh = bb.y1 - bb.y0, cs = Math.min((size - 16) / bw, (size - 16) / bh);
    c.scale(dpr, dpr); c.translate(size / 2 - (bb.x0 + bw / 2) * cs, size / 2 - (bb.y0 + bh / 2) * cs);
    drawShip(c, blocks, cs, "out", 0, null);
    return cv;
  }
  function openHangar() {
    var box = V.root.querySelector(".sr-npc"), list = box.querySelector(".sr-npc-list"); box.hidden = false;
    if (list.childElementCount) return;   // Vorschaubilder nur einmal zeichnen
    NPC.forEach(function (sh) {
      var bl = npcBlocks(sh), st = stats(bl), bb = bounds(bl), wp = [];
      if (st.mg) wp.push(st.mg + "× " + t("mg")); if (st.ms) wp.push(st.ms + "× " + t("ms")); if (st.rg) wp.push(st.rg + "× " + t("rg")); if (st.gun) wp.push(st.gun + "× " + t("gunsN"));
      var card = document.createElement("div"); card.className = "sr-npc-card";
      card.appendChild(shipThumb(bl, 132));
      var tx = document.createElement("div"); tx.className = "sr-npc-tx";
      tx.innerHTML = "<small>#" + sh.id + " · " + t("cls" + sh.cls) + "</small><b>" + sh.n[lang] + "</b><span>" + nf(st.n) + " " + t("sBlocks") + " · " + nf(st.mass * 1000) + " kg · " + nf((bb.x1 - bb.x0) * CELL_M, 1) + " × " + nf((bb.y1 - bb.y0) * CELL_M, 1) + "\u00a0m</span><span>" + (wp.join(", ") || t("none")) + '</span><button type="button" data-npc="' + sh.id + '">' + t("load") + "</button>";
      card.appendChild(tx); list.appendChild(card);
    });
  }
  // .txt speichern: Dateiname = Name im Namensfeld (z. B. Mission_1_Ship_1), sonst Schiff/Struktur
  function saveTxt(code) {
    var nm = (S.names[S.ed] || (S.ed === "station" ? "Struktur" : "Schiff")).replace(/[^\w\-. ]+/g, "_").replace(/\s+/g, "_") || "Schiff";
    try {
      var a = document.createElement("a"), url = URL.createObjectURL(new Blob([code], { type: "text/plain" }));
      a.href = url; a.download = nm + ".txt"; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      note((lang === "de" ? "Gespeichert: " : "Saved: ") + nm + ".txt");
    } catch (e) { note(lang === "de" ? "Speichern nicht möglich." : "Could not save."); }
  }
  // .txt öffnen: Inhalt landet im Importfeld, der Dateiname wird zum Namen
  function openTxt(f) {
    if (!f) return; var rd = new FileReader();
    rd.onload = function () { var ta = V.root.querySelector(".sr-exio textarea"); ta.readOnly = false; ta.value = String(rd.result || ""); var nm = f.name.replace(/\.txt$/i, "").slice(0, 28); S.names[S.ed] = nm; save(); syncUI(); };
    rd.readAsText(f);
  }
  function openIO(mode) {
    var io = V.root.querySelector(".sr-exio"), ta = io.querySelector("textarea"), h = io.querySelector(".sr-io-h");
    io.hidden = false;
    io.querySelector('[data-act="io-copy"]').hidden = mode !== "exp"; io.querySelector('[data-act="io-load"]').hidden = mode !== "imp"; io.querySelector('[data-act="io-txt"]').hidden = mode !== "exp"; io.querySelector('[data-act="io-open"]').hidden = mode !== "imp";
    var sc = mode === "exp" && S.ed === "station";   // im Developer Tool: ganze Szene oder nur die Struktur
    io.querySelector(".sr-io-mode").hidden = !sc;
    if (sc) { if (V.ioScene === undefined) V.ioScene = true; io.querySelectorAll(".sr-io-mode button").forEach(function (b) { b.setAttribute("aria-pressed", String((b.getAttribute("data-act") === "io-scene") === V.ioScene)); }); }
    if (mode === "exp") { h.textContent = sc && V.ioScene ? (lang === "de" ? "Szenencode: alle Blöcke und das ganze Environment mit Ebenen, Größe und Drehung." : "Scene code: all blocks and the whole environment with layers, size and rotation.") : (lang === "de" ? "Schiffscode deines Entwurfs. Kopieren und teilen oder speichern." : "Ship code of your design. Copy and share or keep it."); ta.value = sc && V.ioScene ? sceneCode() : shipCode(); ta.readOnly = true; ta.select(); }
    else { h.textContent = lang === "de" ? "Schiffscode einfügen und laden. Der aktuelle Entwurf lässt sich mit Rückgängig zurückholen." : "Paste a ship code and load it. Undo brings back the current design."; ta.value = ""; ta.readOnly = false; ta.focus(); }
  }
