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
      if (st.mg) wp.push(st.mg + "× " + t("mg")); if (st.ms) wp.push(st.ms + "× " + t("ms")); if (st.rg) wp.push(st.rg + "× " + t("rg"));
      var card = document.createElement("div"); card.className = "sr-npc-card";
      card.appendChild(shipThumb(bl, 132));
      var tx = document.createElement("div"); tx.className = "sr-npc-tx";
      tx.innerHTML = "<small>#" + sh.id + " · " + t("cls" + sh.cls) + "</small><b>" + sh.n[lang] + "</b><span>" + nf(st.n) + " " + t("sBlocks") + " · " + nf(st.mass * 1000) + " kg · " + nf((bb.x1 - bb.x0) * CELL_M, 1) + " × " + nf((bb.y1 - bb.y0) * CELL_M, 1) + "\u00a0m</span><span>" + (wp.join(", ") || t("none")) + '</span><button type="button" data-npc="' + sh.id + '">' + t("load") + "</button>";
      card.appendChild(tx); list.appendChild(card);
    });
  }
  function openIO(mode) {
    var io = V.root.querySelector(".sr-exio"), ta = io.querySelector("textarea"), h = io.querySelector(".sr-io-h");
    io.hidden = false;
    io.querySelector('[data-act="io-copy"]').hidden = mode !== "exp"; io.querySelector('[data-act="io-load"]').hidden = mode !== "imp";
    if (mode === "exp") { h.textContent = lang === "de" ? "Schiffscode deines Entwurfs. Kopieren und teilen oder speichern." : "Ship code of your design. Copy and share or keep it."; ta.value = shipCode(); ta.readOnly = true; ta.select(); }
    else { h.textContent = lang === "de" ? "Schiffscode einfügen und laden. Der aktuelle Entwurf lässt sich mit Rückgängig zurückholen." : "Paste a ship code and load it. Undo brings back the current design."; ta.value = ""; ta.readOnly = false; ta.focus(); }
  }
