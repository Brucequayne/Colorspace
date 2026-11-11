  // ===== 90-start.js · Start: Layout, Bildschleife, mount/unmount – muss die letzte Datei bleiben =====
  function layout() {
    if (!V) return;
    var dpr = window.devicePixelRatio || 1, r = V.cv.getBoundingClientRect();
    V.W = r.width; V.H = r.height; V.cv.width = Math.round(r.width * dpr); V.cv.height = Math.round(r.height * dpr);
    V.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    hudScale(V.uis);
  }
  function loop(now) {
    if (!V) return;
    raf = requestAnimationFrame(loop);
    var dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    var dpr = window.devicePixelRatio || 1; V.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (S.mode === "fly" && FL) { var g = FL.paused ? 0 : dt; while (g > 0 && FL) { var d = Math.min(1 / 120, g); flTick(d); g -= d; } if (FL) flDraw(); }
    else {
      var k = V.keys, sp = 14 / V.zoom * dt;
      if (k.w || k.arrowup) V.cam.y -= sp; if (k.s || k.arrowdown) V.cam.y += sp; if (k.a || k.arrowleft) V.cam.x -= sp; if (k.d || k.arrowright) V.cam.x += sp;
      edDraw();
    }
  }

  function mount(el, l) {
    unmount();
    lang = l === "en" ? "en" : "de";
    var o = document.getElementById("sr-css"); if (o) o.remove();
    var st = document.createElement("style"); st.id = "sr-css"; st.textContent = CSS; document.head.appendChild(st);
    load();
    el.innerHTML = html();
    V = { root: el, cv: el.querySelector("#sr-cv"), zoom: 1.25, cam: { x: 0.5, y: 0 }, keys: {}, ovOld: document.body.style.overflow };
    V.ctx = V.cv.getContext("2d");
    document.body.style.overflow = "hidden";
    fitCam(); layout(); syncUI();
    var us = 1; try { us = parseFloat(localStorage.getItem("spacerogue-ui")) || 1; } catch (e) {} hudScale(us);
    V.cv.addEventListener("pointerdown", onDown); window.addEventListener("pointermove", onMove); window.addEventListener("pointerup", onUp); window.addEventListener("pointercancel", onUp);
    V.cv.addEventListener("wheel", onWheel, { passive: false }); V.cv.addEventListener("contextmenu", function (e) { e.preventDefault(); });
    V.cv.addEventListener("pointerleave", function () { if (V && S.mode !== "fly") V.mouse = null; });
    el.addEventListener("click", onClick); el.addEventListener("input", onInput);
    el.addEventListener("change", function (e) { if (e.target.type === "range") e.target.blur(); if (e.target.classList && e.target.classList.contains("sr-io-file")) { openTxt(e.target.files && e.target.files[0]); e.target.value = ""; } });
    el.addEventListener("focusout", function (e) { if (e.target.classList && e.target.classList.contains("sr-shipn-in")) finishRename(true); });   // Regler loslassen gibt WASD wieder frei
    window.addEventListener("keydown", onKey); window.addEventListener("keyup", onKeyUp); window.addEventListener("resize", layout);
    window.addEventListener("blur", releaseKeys);
    last = 0; raf = requestAnimationFrame(loop);
  }
  function releaseKeys() { if (V) V.keys = {}; if (FL) { FL.keys = {}; FL.fire = false; } }
  function unmount() {
    if (raf) cancelAnimationFrame(raf); raf = 0;
    if (!V) return;
    window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); window.removeEventListener("pointercancel", onUp);
    window.removeEventListener("keydown", onKey); window.removeEventListener("keyup", onKeyUp); window.removeEventListener("resize", layout); window.removeEventListener("blur", releaseKeys);
    document.body.style.overflow = V.ovOld || "";
    FL = null; if (S) S.mode = "edit"; V = null;
  }
  window.SpaceRogue = { mount: mount, unmount: unmount, _debug: function () { return { S: S, V: V, FL: FL, T: T, stats: stats, rooms: rooms, components: components, starter: starter, startTest: startTest, damage: damage, dockFace: dockFace, wx: WX_TEX }; } };
})();
