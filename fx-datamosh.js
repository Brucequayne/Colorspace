/* WeFX-Effekt „Datamosh“: I-Frame-Removal / P-Frame-Datamoshing.

   Bei echtem Datamoshing wird aus dem komprimierten Video ein I-Frame (Vollbild) entfernt. Der Decoder wendet dann die
   Bewegungsvektoren der folgenden P-Frames auf das alte Bild an: Das alte Bild wird von der Bewegung der neuen Szene
   verschmiert und gemorpht, bis wieder ein I-Frame kommt.

   Dieser Effekt macht genau das, nur ohne kaputte Datei, auf der Grafikkarte (WebGL2):
   1. Bewegungssuche wie ein Encoder: Für jeden Makroblock (8, 16 oder 32 px) wird gesucht, wo sein Inhalt im vorigen
      Frame lag (Helligkeit, grob und dann fein). Ruhige Flächen bekommen bevorzugt den Nullvektor, wie bei echten Encodern.
   2. Auslöser = das I-Frame fällt weg: bei Schnitten, an gesetzten Markern, im Intervall oder ab Start.
      Ab dann wird nicht mehr das neue Bild gezeigt, sondern das alte mit den neuen Vektoren weitergeschoben (P-Frame).
   3. Restbild (Residual): wie im echten P-Frame kommen die Änderungen der neuen Szene als Kanten dazu.
   4. Nachlauf (Bloom): Vektoren laufen weiter, wie wenn ein P-Frame mehrfach abgespielt wird.
   5. Farbbluten: Farbe wird stärker verschoben als die Helligkeit. Fehlerblöcke: einzelne Blöcke bekommen falsche Vektoren.
   6. Dauer und Auflösen: Nach der Dauer kehrt das echte Bild weich zurück (wie ein neues I-Frame).
   Das Moshen baut sich Frame für Frame auf: beim Abspielen, beim Weiterschalten, beim Baken und im Export. */
(function () {
  "use strict";
  if (!window.WeFX) return;

  var VS = "#version 300 es\nvoid main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));gl_Position=vec4(p*2.0-1.0,0.0,1.0);}";
  var HEAD = "#version 300 es\nprecision highp float;\nout vec4 o;\nuniform vec2 uSize;\n";
  // Helligkeit auf ein Viertel verkleinert (4 × 4 gemittelt)
  var FS_LUMA = HEAD + [
    "uniform sampler2D uSrc;uniform vec2 uSrcSize;const vec3 W=vec3(0.299,0.587,0.114);",
    "void main(){vec2 p=gl_FragCoord.xy*4.0;float s=dot(texture(uSrc,(p+vec2(-1.0,-1.0))/uSrcSize).rgb,W)+dot(texture(uSrc,(p+vec2(1.0,-1.0))/uSrcSize).rgb,W)",
    "+dot(texture(uSrc,(p+vec2(-1.0,1.0))/uSrcSize).rgb,W)+dot(texture(uSrc,(p+vec2(1.0,1.0))/uSrcSize).rgb,W);o=vec4(s*0.25,0.0,0.0,1.0);}"].join("\n");
  // Bewegungssuche je Block: wo lag der Inhalt im vorigen Frame? Ergebnis in vollen Pixeln, mit Nachlauf und Fehlerblöcken
  var FS_ME = HEAD + [
    "uniform sampler2D uCur,uPrev,uOld;uniform vec2 uL;uniform float uB,uR,uLam,uStr,uBloom,uGlitch,uSeed,uGx;",
    "float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}",
    "float sad(vec2 c,vec2 off){float s=0.0;for(int j=0;j<4;j++)for(int i=0;i<4;i++){vec2 q=c+(vec2(float(i),float(j))-1.5)*uB*0.3;",
    "s+=abs(texture(uCur,q/uL).r-texture(uPrev,(q+off)/uL).r);}return s*0.0625;}",
    "float cost(vec2 c,vec2 off){return sad(c,off)+(dot(off,off)>0.0?uLam*(0.006+0.012*length(off)/uR):0.0);}",
    "void main(){vec2 bc=gl_FragCoord.xy*uB;float st=uR/8.0;vec2 bv=vec2(0.0);float best=cost(bc,bv);",
    "for(int y=-8;y<=8;y++)for(int x=-8;x<=8;x++){vec2 off=vec2(float(x),float(y))*st;float c=cost(bc,off);if(c<best){best=c;bv=off;}}",
    "vec2 b0=bv;for(int y=-2;y<=2;y++)for(int x=-2;x<=2;x++){vec2 off=b0+vec2(float(x),float(y))*st*0.5;float c=cost(bc,off);if(c<best){best=c;bv=off;}}",
    "b0=bv;for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 off=b0+vec2(float(x),float(y))*st*0.25;float c=cost(bc,off);if(c<best){best=c;bv=off;}}",
    "vec2 v=bv*uGx*uStr;",
    "float h=hash(gl_FragCoord.xy+uSeed);if(h<uGlitch){float k=hash(gl_FragCoord.yx*1.7+uSeed*0.37);v=k<0.35?vec2(0.0):(vec2(hash(gl_FragCoord.xy*3.1+uSeed),hash(gl_FragCoord.xy*5.3-uSeed))-0.5)*uR*uGx*2.5;}",
    "vec2 old=texture(uOld,gl_FragCoord.xy/uSize).rg;v=mix(v,old,uBloom);o=vec4(v,best,1.0);}"].join("\n");
  // Moshen: altes Bild mit den Blockvektoren weiterschieben, Farbe getrennt, Restbild und Heilen dazu
  var FS_MOSH = HEAD + [
    "uniform sampler2D uHeld,uSrc,uPrev,uMV;uniform vec2 uGrid;uniform float uBpx,uBlocky,uBleed,uRes,uHeal;uniform int uMode;const vec3 W=vec3(0.299,0.587,0.114);",
    "void main(){vec2 px=gl_FragCoord.xy;vec3 s=texture(uSrc,px/uSize).rgb;",
    "if(uMode==0){o=vec4(s,1.0);return;}",
    "if(uMode==1){o=vec4(texture(uHeld,px/uSize).rgb,1.0);return;}",
    "vec2 gc=px/uBpx;vec2 vn=texture(uMV,(floor(gc)+0.5)/uGrid).rg;vec2 vs=texture(uMV,gc/uGrid).rg;",
    "vec2 v=mix(vs,vn,uBlocky);v=mix(v,floor(v+0.5),uBlocky);",
    "vec3 hl=texture(uHeld,(px+v)/uSize).rgb;vec3 hc=uBleed>0.0?texture(uHeld,(px+v*(1.0+uBleed))/uSize).rgb:hl;",
    "vec3 pred=vec3(dot(hl,W))+(hc-vec3(dot(hc,W)));",
    "if(uRes>0.0){vec3 ps=texture(uPrev,(px+v)/uSize).rgb;pred+=uRes*(s-ps);}",
    "o=vec4(clamp(mix(pred,s,uHeal),0.0,1.0),1.0);}"].join("\n");
  var FS_OUT = HEAD + "uniform sampler2D uT;void main(){o=vec4(texture(uT,vec2(gl_FragCoord.x,uSize.y-gl_FragCoord.y)/uSize).rgb,1.0);}";

  var G = null, GEN = 0;
  function compile(gl, fs) {
    function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
    var pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
    var loc = {}; pr.u = function (n) { return n in loc ? loc[n] : (loc[n] = gl.getUniformLocation(pr, n)); };
    return pr;
  }
  function gpu() {
    if (G === false) return null;
    if (G && !G.gl.isContextLost()) return G;
    try {
      var c = document.createElement("canvas"); c.width = c.height = 4;
      var gl = c.getContext("webgl2", { alpha: false, premultipliedAlpha: false, preserveDrawingBuffer: true, antialias: false, depth: false, stencil: false });
      if (!gl || !gl.getExtension("EXT_color_buffer_float")) { G = false; return null; }
      var g = { cv: c, gl: gl, gen: ++GEN, vao: gl.createVertexArray() };
      g.pl = compile(gl, FS_LUMA); g.pe = compile(gl, FS_ME); g.pm = compile(gl, FS_MOSH); g.po = compile(gl, FS_OUT);
      c.addEventListener("webglcontextlost", function (e) { e.preventDefault(); if (G === g) G = null; });
      G = g; return g;
    } catch (e) { console.warn("Datamosh: WebGL2 nicht nutzbar.", e); G = false; return null; }
  }
  function texture(g, w, h, kind) {
    var gl = g.gl, t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    if (kind === "f") gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  function target(g, w, h, kind) { var gl = g.gl, t = texture(g, w, h, kind), f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); return { t: t, f: f }; }
  function freeT(gl, q) { gl.deleteTexture(q.t); gl.deleteFramebuffer(q.f); }
  function freeMV(R) { if (R.MV && G && G.gen === R.gen) R.MV.forEach(function (q) { freeT(G.gl, q); }); R.MV = null; }
  function free(s) {
    var R = s && s.gpu; if (!R) return; s.gpu = null;
    if (!G || G.gen !== R.gen) return;
    var gl = G.gl; freeMV(R); R.S.forEach(function (t) { gl.deleteTexture(t); }); R.L.concat(R.H).forEach(function (q) { freeT(gl, q); });
  }
  function ensure(s, g, w, h) {
    var R = s.gpu;
    if (R && R.gen === g.gen && R.w === w && R.h === h) return R;
    free(s);
    var lw = Math.max(8, Math.round(w / 4)), lh = Math.max(8, Math.round(h / 4));
    R = s.gpu = { gen: g.gen, w: w, h: h, lw: lw, lh: lh, k: 0, S: [texture(g, w, h), texture(g, w, h)], sOk: [false, false],
      L: [target(g, lw, lh), target(g, lw, lh)], H: [target(g, w, h), target(g, w, h)], MV: null, bpx: 0 };
    return R;
  }
  function ensureMV(R, g, bpx) {
    if (R.MV && R.bpx === bpx) return false;
    freeMV(R); R.bpx = bpx; R.gw = Math.ceil(R.w / bpx); R.gh = Math.ceil(R.h / bpx);
    R.MV = [target(g, R.gw, R.gh, "f"), target(g, R.gw, R.gh, "f")];
    return true;
  }
  function clearT(gl, q) { gl.bindFramebuffer(gl.FRAMEBUFFER, q.f); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); }
  function pass(g, pr, fb, w, h) { var gl = g.gl; gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.viewport(0, 0, w, h); gl.useProgram(pr); gl.uniform2f(pr.u("uSize"), w, h); return pr; }
  function bindTex(gl, pr, name, unit, t) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); gl.uniform1i(pr.u(name), unit); }

  // Kleines Graubild für die Schnitterkennung (mittlerer Helligkeitsunterschied zum vorigen Frame, 0 bis 255)
  function thumb(c) {
    var s = c.state, cv = s.th || (s.th = c.util.canvas(32, 18)), x = cv.getContext("2d", { willReadFrequently: true });
    x.drawImage(c.src, 0, 0, 32, 18);
    var d = x.getImageData(0, 0, 32, 18).data, o = new Float32Array(576);
    for (var i = 0; i < 576; i++) o[i] = d[i * 4] * 0.299 + d[i * 4 + 1] * 0.587 + d[i * 4 + 2] * 0.114;
    return o;
  }
  function diff(a, b) { if (!a || !b) return 0; var s = 0; for (var i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / a.length; }
  function markFrames(p, fps) { return (Array.isArray(p.marks) ? p.marks : []).map(function (t) { return Math.floor(t * fps); }); }

  // Ablauf je Frame: Wird ein I-Frame entfernt (Auslöser), läuft das Moshen. Gibt Modus (0 Bild, 1 Standbild, 2 Moshen) und Heilen zurück.
  function advance(s, c, p, cutHit) {
    var marks = markFrames(p, c.fps), f = c.frame;
    if (!c.cont) {
      s.active = p.trig === "start" || p.trig === "marks" && marks.indexOf(f) >= 0; s.age = 0;
      return { mode: 0, heal: 0, clear: true };
    }
    var gap = Math.max(1, Math.min(4, c.gap || 1)), trig = false;
    if (p.trig === "cut" && cutHit) trig = true;
    else if (p.trig === "marks") trig = marks.some(function (m) { return m > f - gap && m <= f; });
    else if (p.trig === "interval") { var ev = Math.max(2, p.every); trig = Math.floor(f / ev) > Math.floor((f - gap) / ev); }
    if (trig) { var was = s.active; s.active = true; s.age = 0; return { mode: 1, heal: 0, clear: !was }; }   // I-Frame fällt weg: das alte Bild bleibt stehen
    if (!s.active) return { mode: 0, heal: 0 };
    s.age += gap;
    var heal = p.heal / 100;
    if (p.dur > 0 && s.age > p.dur) {
      var k = (s.age - p.dur) / Math.max(1, p.fade);
      if (k >= 1) { s.active = false; return { mode: 0, heal: 0 }; }
      heal = Math.max(heal, k * k * (3 - 2 * k));
    }
    return { mode: 2, heal: heal };
  }

  function render(c, g) {
    var gl = g.gl, p = c.p, w = c.w, h = c.h, s = c.state, sc = c.scale, R = ensure(s, g, w, h);
    var bpx = Math.max(4, Math.round((+p.block || 16) * sc)), mvNew = ensureMV(R, g, bpx);
    // Neuer Frame: aktuelle Puffer werden zu den vorigen, Ablauf-Zustand sichern (für erneutes Rechnen desselben Frames)
    if (!c.same) {
      R.k ^= 1;
      s.base = { active: !!s.active, age: s.age || 0 };
      s.thPrev = c.cont ? s.thCur : null;
    } else if (s.base) { s.active = s.base.active; s.age = s.base.age; }
    var k = R.k, j = k ^ 1;
    s.thCur = thumb(c);
    var st = advance(s, c, p, diff(s.thCur, s.thPrev) > 8 + (100 - p.sens) * 0.6);
    // Videobild hochladen und Helligkeit verkleinern
    gl.bindTexture(gl.TEXTURE_2D, R.S[k]); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    if (R.sOk[k]) gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, c.src); else { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, c.src); R.sOk[k] = true; }
    gl.bindVertexArray(g.vao);
    var pr = pass(g, g.pl, R.L[k].f, R.lw, R.lh); gl.uniform2f(pr.u("uSrcSize"), w, h); bindTex(gl, pr, "uSrc", 0, R.S[k]); gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (st.clear || mvNew) clearT(gl, R.MV[j]);
    // Bewegungssuche (nur beim Moshen nötig)
    if (st.mode === 2) {
      var gx = R.w / R.lw;   // Luma-Pixel -> volle Pixel
      pr = pass(g, g.pe, R.MV[k].f, R.gw, R.gh);
      bindTex(gl, pr, "uCur", 0, R.L[k].t); bindTex(gl, pr, "uPrev", 1, R.L[j].t); bindTex(gl, pr, "uOld", 2, R.MV[j].t);
      gl.uniform2f(pr.u("uL"), R.lw, R.lh); gl.uniform1f(pr.u("uB"), bpx / gx); gl.uniform1f(pr.u("uR"), Math.max(4, 26 * sc)); gl.uniform1f(pr.u("uGx"), gx);
      gl.uniform1f(pr.u("uLam"), p.still / 100 * 3); gl.uniform1f(pr.u("uStr"), p.str / 100);
      gl.uniform1f(pr.u("uBloom"), Math.min(0.97, p.bloom / 100)); gl.uniform1f(pr.u("uGlitch"), p.glitch / 100 * 0.12); gl.uniform1f(pr.u("uSeed"), (c.frame * 7.31) % 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    } else clearT(gl, R.MV[k]);
    // Moshen in den aktuellen Bildpuffer
    pr = pass(g, g.pm, R.H[k].f, w, h);
    bindTex(gl, pr, "uHeld", 0, R.H[j].t); bindTex(gl, pr, "uSrc", 1, R.S[k]); bindTex(gl, pr, "uPrev", 2, R.S[j]); bindTex(gl, pr, "uMV", 3, R.MV[k].t);
    gl.uniform1i(pr.u("uMode"), st.mode); gl.uniform2f(pr.u("uGrid"), R.gw, R.gh); gl.uniform1f(pr.u("uBpx"), bpx);
    gl.uniform1f(pr.u("uBlocky"), p.blocky / 100); gl.uniform1f(pr.u("uBleed"), p.bleed / 100 * 0.6); gl.uniform1f(pr.u("uRes"), p.res / 100); gl.uniform1f(pr.u("uHeal"), st.heal);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    // Ausgabe
    if (g.cv.width !== w || g.cv.height !== h) { g.cv.width = w; g.cv.height = h; }
    pr = pass(g, g.po, null, w, h); bindTex(gl, pr, "uT", 0, R.H[k].t); gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
    var o = c.dst.getContext("2d"); o.globalCompositeOperation = "copy"; o.drawImage(g.cv, 0, 0); o.globalCompositeOperation = "source-over";
  }

  WeFX.register({
    id: "datamosh",
    name: { de: "Datamosh", en: "Datamosh" },
    desc: { de: "I-Frame-Removal: Ab einem Auslöser fehlt das Vollbild, das alte Bild wird von der Bewegung der neuen Szene weitergeschoben und gemorpht. Auslöser bei Schnitten (Szene A zerfließt in Szene B), an Markern, im Intervall oder ab Start. Baut sich beim Abspielen, Baken und im Export auf.",
          en: "I-frame removal: from a trigger on the full frame is missing, the old image is pushed along and morphed by the motion of the new scene. Trigger at cuts (scene A melts into scene B), at markers, at intervals or from the start. Builds up during playback, baking and export." },
    short: { de: "Bild zerfließt in Bewegung", en: "Image melts into motion" },
    icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h8v8H3z" fill="currentColor"/><path d="M13 4h8v8h-8zM3 14h8v6H3z" fill="currentColor" opacity=".45"/><path d="M13 15c3 0 4 2 8 1v4h-8z" fill="currentColor" opacity=".8"/></svg>',
    params: [
      { k: "trig", type: "select", label: { de: "Auslöser (I-Frame fällt weg)", en: "Trigger (I-frame removed)" }, def: "start",
        options: [["start", { de: "Ab Start", en: "From start" }], ["cut", { de: "Bei Schnitten", en: "At cuts" }], ["marks", { de: "Marker", en: "Markers" }], ["interval", { de: "Intervall", en: "Interval" }]] },
      { k: "marks", type: "marks", label: { de: "Marker", en: "Markers" }, def: [], hint: { de: "Für Auslöser „Marker“: An jedem Marker fällt das I-Frame weg. Taste M setzt oder entfernt einen Marker am aktuellen Frame.", en: "For trigger “Markers”: the I-frame is dropped at every marker. Key M sets or removes a marker at the current frame." } },
      { k: "sens", type: "range", label: { de: "Schnitt-Empfindlichkeit", en: "Cut sensitivity" }, def: 50, min: 0, max: 100, unit: " %", hint: { de: "Für „Bei Schnitten“: höher = auch weichere Szenenwechsel lösen aus", en: "For “At cuts”: higher = softer scene changes trigger too" } },
      { k: "every", type: "range", label: { de: "Intervall", en: "Interval" }, def: 48, min: 4, max: 240, unit: " Frames" },
      { k: "dur", type: "range", label: { de: "Dauer", en: "Duration" }, def: 0, min: 0, max: 300, unit: " Frames", hint: { de: "0 = bis zum nächsten Auslöser, sonst kehrt danach das echte Bild zurück", en: "0 = until the next trigger, otherwise the real image returns afterwards" } },
      { k: "fade", type: "range", label: { de: "Auflösen", en: "Resolve" }, def: 24, min: 1, max: 120, unit: " Frames" },
      { k: "str", type: "range", label: { de: "Bewegung", en: "Motion" }, def: 100, min: 0, max: 300, unit: " %", hint: { de: "Wie stark die Vektoren das alte Bild schieben, über 100 % übertreibt", en: "How strongly the vectors push the old image, above 100% exaggerates" } },
      { k: "bloom", type: "range", label: { de: "Nachlauf (Bloom)", en: "Carry-over (bloom)" }, def: 0, min: 0, max: 100, unit: " %", hint: { de: "Bewegung läuft weiter, als würde ein P-Frame wiederholt: Bild quillt und fließt", en: "Motion keeps going as if a P-frame repeats: the image swells and flows" } },
      { k: "res", type: "range", label: { de: "Restbild", en: "Residual" }, def: 30, min: 0, max: 100, unit: " %", hint: { de: "Wie viel von den Änderungen der neuen Szene durchkommt (Kanten, Umrisse)", en: "How much of the new scene's changes come through (edges, outlines)" } },
      { k: "heal", type: "range", label: { de: "Heilen", en: "Heal" }, def: 0, min: 0, max: 30, unit: " %", hint: { de: "Je Frame ein Stück zurück zum echten Bild", en: "Back towards the real image a little each frame" } },
      { k: "block", type: "select", label: { de: "Makroblock", en: "Macroblock" }, def: "16", options: [["8", { de: "8 px", en: "8 px" }], ["16", { de: "16 px", en: "16 px" }], ["32", { de: "32 px", en: "32 px" }]] },
      { k: "blocky", type: "range", label: { de: "Blockig", en: "Blocky" }, def: 70, min: 0, max: 100, unit: " %", hint: { de: "0 = weiches Fließen, 100 = harte Blockkanten wie im echten Codec", en: "0 = smooth flow, 100 = hard block edges like a real codec" } },
      { k: "still", type: "range", label: { de: "Ruhige Flächen einfrieren", en: "Freeze calm areas" }, def: 30, min: 0, max: 100, unit: " %" },
      { k: "bleed", type: "range", label: { de: "Farbbluten", en: "Colour bleed" }, def: 0, min: 0, max: 100, unit: " %" },
      { k: "glitch", type: "range", label: { de: "Fehlerblöcke", en: "Error blocks" }, def: 0, min: 0, max: 100, unit: " %" }
    ],
    render: function (c) {
      var g = gpu();
      if (g) { try { render(c, g); return; } catch (e) { console.warn("Datamosh: WebGL-Fehler.", e); free(c.state); G = false; } }
      c.util.copy(c.src, c.dst);   // ohne WebGL2 bleibt das Bild unverändert
    },
    dispose: function (state) { free(state); }
  });
})();
