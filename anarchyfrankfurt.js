/* Anarchy Frankfurt – Lader.
   Die Startseite lädt nur diese Datei. Das Spiel (bisher der Map-Editor) liegt im Ordner anarchy-frankfurt/
   und läuft dort als eigene Seite (editor.html, bewusst nicht index.html) mit JS-Modulen. Beim Öffnen wird sie als Vollbild eingebettet. Der Cache-Stempel (?v=…) wird übernommen. */
(function () {
  var stamp = "";
  try { var m = /[?&]v=([^&]+)/.exec(document.currentScript.src); if (m) stamp = m[1]; } catch (e) {}
  var frame = null;
  window.AnarchyFrankfurt = {
    mount: function (el, lang) {
      el.innerHTML = "";
      frame = document.createElement("iframe");
      frame.src = "anarchy-frankfurt/editor.html?v=" + (stamp || Date.now()) + "&lang=" + (lang || "de");
      frame.title = "Anarchy Frankfurt";
      frame.setAttribute("allow", "fullscreen");
      frame.style.cssText = "position:fixed;inset:0;width:100%;height:100%;border:0;z-index:30;background:#15171c";
      el.appendChild(frame);
      try { frame.focus(); } catch (e) {}
    },
    unmount: function () { if (frame && frame.parentNode) frame.parentNode.removeChild(frame); frame = null; }
  };
})();
