/* Shizuku – audio.js
   Platzhalter für Musik und Sounds. Noch keine Dateien eingebunden.
   Später: Dateien in shizuku/audio/ ablegen und unten in FILES eintragen,
   dann im Spiel SZ.audio.play("name") aufrufen. Alle Aufrufe sind schon im Code verteilt. */
(function () {
  var SZ = window.SZ;
  var FILES = {
    // name: "audio/datei.ogg"
  };
  var ctx = null, buffers = {}, music = null, volume = { sfx: 0.8, music: 0.6 };
  function ac() {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; } }
    return ctx;
  }
  SZ.audio = {
    volume: volume,
    // lädt eine Datei einmalig (still, wenn es sie nicht gibt)
    load: function (name) {
      var f = FILES[name]; if (!f || buffers[name] || !ac()) return;
      buffers[name] = "loading";
      fetch("shizuku/" + f).then(function (r) { return r.arrayBuffer(); }).then(function (b) { return ctx.decodeAudioData(b); })
        .then(function (buf) { buffers[name] = buf; }).catch(function () { delete buffers[name]; });
    },
    play: function (name, opt) {
      var b = buffers[name];
      if (!b) { this.load(name); return; }
      if (b === "loading" || !ac()) return;
      opt = opt || {};
      var src = ctx.createBufferSource(), g = ctx.createGain();
      src.buffer = b;
      src.playbackRate.value = opt.rate || 1;
      g.gain.value = (opt.vol == null ? 1 : opt.vol) * volume.sfx;
      src.connect(g); g.connect(ctx.destination); src.start();
    },
    music: function (name) { music = name; /* folgt, sobald es Musik gibt */ },
    stopAll: function () { music = null; }
  };
})();
