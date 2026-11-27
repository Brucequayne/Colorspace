/* WeFX-Effekt „Color Blur“: simuliert Bewegungsunschärfe für eine Farbe.
   Alles, was im Bild die gewählte Farbe hat, hinterlässt einen Schweif aus den vorigen Frames.

   Seit v0.12 rechnet der Effekt auf der Grafikkarte (WebGL2), in voller Auflösung:
   1. Maske: Jeder Bildpunkt wird mit der Pipettenfarbe verglichen (Farbabstand in Lab), leicht geglättet.
   2. Bahn: Aus den Schwerpunkten der Farbfläche in den letzten drei Frames entsteht eine weiche Kurve
      (Glättung = wie stark die Kurve dem bisherigen Weg folgt).
   3. Schweif: Für jeden Bildpunkt wird die Bahn zwischen dem vorigen und dem aktuellen Frame dicht abgetastet
      (alle 0,7 px, im Export und beim Baken alle 0,4 px). Die Form geht dabei vom vorigen in den aktuellen Frame über.
      Jeder Punkt merkt sich, wie lange die Farbe zuletzt dort war, daraus folgt seine Deckkraft. So gibt es keine
      Stufen von Frame zu Frame und keine Lücken zwischen Kopien, auch wenn Frames übersprungen werden.
   4. Der alte Schweif wird jeden Frame etwas blasser (Länge), weicher und breiter (Lebendigkeit),
      verwirbelt (Turbulenz) und verschoben (Drift), alles stufenlos.
   5. Ausgabe: Schweif über das Bild, das Objekt selbst bleibt scharf obendrauf.
   Ohne WebGL2 rechnet der Effekt wie in v0.11 mit Canvas 2D. */
(function () {
  "use strict";
  if (!window.WeFX) return;

  // sRGB -> Lab, mit Tabelle für die Linearisierung
  var LIN = (function () { var a = new Float32Array(256); for (var i = 0; i < 256; i++) { var c = i / 255; a[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); } return a; })();
  function lab(r, g, b, o) {
    var R = LIN[r], G = LIN[g], B = LIN[b];
    var X = (0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047, Y = 0.2126 * R + 0.7152 * G + 0.0722 * B, Z = (0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883;
    var fx = X > 0.008856 ? Math.cbrt(X) : 7.787 * X + 0.138, fy = Y > 0.008856 ? Math.cbrt(Y) : 7.787 * Y + 0.138, fz = Z > 0.008856 ? Math.cbrt(Z) : 7.787 * Z + 0.138;
    o[0] = 116 * fy - 16; o[1] = 500 * (fx - fy); o[2] = 200 * (fy - fz); return o;
  }
  function hexRgb(h) { var n = parseInt(String(h || "#000000").slice(1, 7), 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function cv(c, key, w, h) { var s = c.state; if (!s[key] || s[key].width !== w || s[key].height !== h) s[key] = c.util.canvas(w, h); return s[key]; }

  // Schwerpunkt und Ausdehnung der Farbfläche, auf einem kleinen Raster (reicht für die Bahn)
  function locate(c, p) {
    var w = c.w, h = c.h, sw = Math.max(48, Math.min(400, Math.round(w / 4))), sh = Math.max(27, Math.round(sw * h / w));
    var small = cv(c, "small", sw, sh), sx = small.getContext("2d", { willReadFrequently: true });
    sx.imageSmoothingQuality = "medium"; sx.drawImage(c.src, 0, 0, sw, sh);
    var d = sx.getImageData(0, 0, sw, sh).data, kc = hexRgb(p.key), K = lab(kc[0], kc[1], kc[2], [0, 0, 0]), L = [0, 0, 0];
    var e = Math.max(0.5, p.tol * p.soft / 100), lo = p.tol - e, hi = p.tol + e, mx = 0, my = 0, mw = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (var y = 0, i = 0; y < sh; y++) for (var x = 0; x < sw; x++, i += 4) {
      lab(d[i], d[i + 1], d[i + 2], L);
      var dl = L[0] - K[0], da = L[1] - K[1], db = L[2] - K[2], dist = Math.sqrt(dl * dl * 0.5 + da * da + db * db);
      var a = dist <= lo ? 1 : dist >= hi ? 0 : 1 - (dist - lo) / (hi - lo); a = a * a * (3 - 2 * a);
      if (a > 0.05) { mx += x * a; my += y * a; mw += a; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    if (mw <= sw * sh * 0.0004) return null;
    var fx = w / sw, fy = h / sh, cx = (mx / mw + 0.5) * fx, cy = (my / mw + 0.5) * fy, m = 3;
    return { x: cx, y: cy, l: (x0 - m) * fx - cx, t: (y0 - m) * fy - cy, r: (x1 + 1 + m) * fx - cx, b: (y1 + 1 + m) * fy - cy, key: kc };
  }

  // Bahn vom vorigen (f = 1) zum aktuellen Schwerpunkt (f = 0), als Hermite-Kurve. 17 Stützpunkte.
  function path(c0, c1, c2, smooth) {
    var P = new Float32Array(34), len = 0;
    if (!c1) { for (var k = 0; k < 17; k++) { P[k * 2] = c0.x; P[k * 2 + 1] = c0.y; } return { P: P, len: 0 }; }
    var chx = c0.x - c1.x, chy = c0.y - c1.y, s = smooth / 100;
    var m1x = chx, m1y = chy;
    if (c2) { m1x = chx + ((c0.x - c2.x) / 2 - chx) * s; m1y = chy + ((c0.y - c2.y) / 2 - chy) * s; }
    for (var i = 0; i <= 16; i++) {
      var u = 1 - i / 16, u2 = u * u, u3 = u2 * u;
      var h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
      P[i * 2] = h00 * c1.x + h10 * m1x + h01 * c0.x + h11 * chx;
      P[i * 2 + 1] = h00 * c1.y + h10 * m1y + h01 * c0.y + h11 * chy;
      if (i) len += Math.hypot(P[i * 2] - P[i * 2 - 2], P[i * 2 + 1] - P[i * 2 - 1]);
    }
    return { P: P, len: len };
  }

  // ---------- Grafikkarte ----------
  // Ein gemeinsamer WebGL2-Kontext für alle Color-Blur-Instanzen, jede Instanz hat eigene Texturen.
  var VS = "#version 300 es\nvoid main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));gl_Position=vec4(p*2.0-1.0,0.0,1.0);}";
  var HEAD = "#version 300 es\nprecision highp float;\nout vec4 o;\nuniform vec2 uSize;\n" +
    "vec4 tx(sampler2D t,vec2 p){return (p.x<0.0||p.y<0.0||p.x>uSize.x||p.y>uSize.y)?vec4(0.0):texture(t,p/uSize);}\n";
  // Maske: Farbe des Bildes, Deckkraft = Nähe zur Pipettenfarbe (Lab), über 3 × 3 Punkte geglättet
  var FS_MASK = HEAD + [
    "uniform sampler2D uSrc;uniform vec3 uKey;uniform float uLo,uHi,uR;",
    "float lin(float c){return c<=0.04045?c/12.92:pow((c+0.055)/1.055,2.4);}",
    "float fl(float t){return t>0.008856?pow(t,1.0/3.0):7.787*t+0.138;}",
    "vec3 lab(vec3 c){vec3 l=vec3(lin(c.r),lin(c.g),lin(c.b));float X=dot(l,vec3(0.4124,0.3576,0.1805))/0.95047,Y=dot(l,vec3(0.2126,0.7152,0.0722)),Z=dot(l,vec3(0.0193,0.1192,0.9505))/1.08883;",
    "float fx=fl(X),fy=fl(Y),fz=fl(Z);return vec3(116.0*fy-16.0,500.0*(fx-fy),200.0*(fy-fz));}",
    "float key(vec2 p){vec3 d=lab(texture(uSrc,p/uSize).rgb)-uKey;float dist=sqrt(d.x*d.x*0.5+d.y*d.y+d.z*d.z);",
    "float a=1.0-clamp((dist-uLo)/max(uHi-uLo,0.001),0.0,1.0);return a*a*(3.0-2.0*a);}",
    "void main(){vec2 p=gl_FragCoord.xy;float r=uR;",
    "float a=key(p)*4.0+(key(p+vec2(r,0.0))+key(p-vec2(r,0.0))+key(p+vec2(0.0,r))+key(p-vec2(0.0,r)))*2.0",
    "+key(p+vec2(r,r))+key(p+vec2(-r,r))+key(p+vec2(r,-r))+key(p-vec2(r,r));",
    "o=vec4(texture(uSrc,p/uSize).rgb,a/16.0);}"].join("\n");
  // Schweif: alten Schweif weiterbewegen, dann die Bahn seit dem vorigen Frame dicht abtasten (Maximum der Deckkraft)
  var FS_TRAIL = HEAD + [
    "uniform sampler2D uOld,uMc,uMp;uniform float uDecay,uLogKeep,uGap,uEps;uniform int uN,uPrev,uCol;uniform vec2 uPath[17];uniform vec2 uC0,uC1;uniform vec4 uBox;",
    "uniform vec2 uDrift,uGC;uniform float uGrow,uTurb,uPh,uSc,uBlur,uRot,uHue0,uHueF;uniform vec3 uTint;",
    "vec3 hsl(float h){vec3 k=clamp(abs(mod(h*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0,0.0,1.0);return 0.6+0.76*(k-0.5);}",
    "void main(){vec2 px=gl_FragCoord.xy;",
    "vec2 q=uGC+(px-uDrift-uGC)/uGrow;",
    "if(uTurb>0.0){float s=uSc;q+=uTurb*vec2(sin(q.y/(60.0*s)+uPh)+0.6*sin(q.y/(23.0*s)-uPh*1.7)+0.35*sin((q.x+q.y)/(47.0*s)+uPh*0.8),",
    "0.45*sin(q.x/(53.0*s)-uPh*1.3)+0.3*sin((q.x-q.y)/(37.0*s)+uPh*1.1));}",
    "vec4 a=tx(uOld,q);",
    "if(uBlur>0.05){vec4 acc=a*0.28;for(int i=0;i<6;i++){float an=uRot+float(i)*1.0471976;",
    "acc+=tx(uOld,q+vec2(cos(an),sin(an))*uBlur*0.5)*0.07+tx(uOld,q+vec2(cos(an+0.5236),sin(an+0.5236))*uBlur)*0.05;}a=acc;}",
    "a=max(a*uDecay-uEps,vec4(0.0));",
    "if(uN>0&&px.x>=uBox.x&&px.y>=uBox.y&&px.x<=uBox.z&&px.y<=uBox.w){vec4 best=vec4(0.0);",
    "for(int i=0;i<400;i++){if(i>=uN)break;float f=float(i)/float(uN),fi=f*16.0;int k=int(fi);",
    "vec2 P=mix(uPath[k],uPath[min(k+1,16)],fi-float(k)),d=px-P;vec4 m=tx(uMc,uC0+d);float cov=m.a;vec3 pc=m.rgb*m.a;",
    "if(uPrev==1){vec4 m2=tx(uMp,uC1+d);cov=mix(m.a,m2.a,f);pc=mix(pc,m2.rgb*m2.a,f);}",
    "float st=cov*exp(uLogKeep*f*uGap);",
    "if(st>best.a){vec3 col=cov>0.0001?pc/cov:vec3(0.0);if(uCol==1)col=uTint;else if(uCol==2)col=hsl(fract(uHue0-uHueF*f));best=vec4(col*st,st);}}",
    "if(best.a>a.a)a=best;}",
    "o=a;}"].join("\n");
  // Ausgabe auf die Leinwand (y gespiegelt): Schweif über das Bild, Objekt obendrauf
  var FS_OUT = HEAD + [
    "uniform sampler2D uSrc,uT,uMc;uniform float uAmt;uniform int uBlend,uObj;",
    "void main(){vec2 uv=vec2(gl_FragCoord.x,uSize.y-gl_FragCoord.y)/uSize;vec3 s=texture(uSrc,uv).rgb;vec4 T=texture(uT,uv)*uAmt;vec3 r;",
    "if(uBlend==1)r=1.0-(1.0-s)*(1.0-clamp(T.rgb,0.0,1.0));else if(uBlend==2)r=s+T.rgb;else r=T.rgb+s*(1.0-T.a);",
    "if(uObj==1)r=mix(r,s,texture(uMc,uv).a);o=vec4(clamp(r,0.0,1.0),1.0);}"].join("\n");

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
      if (!gl) { G = false; return null; }
      var g = { cv: c, gl: gl, gen: ++GEN, vao: gl.createVertexArray() };
      g.flt = !!gl.getExtension("EXT_color_buffer_float");
      g.pm = compile(gl, FS_MASK); g.pt = compile(gl, FS_TRAIL); g.po = compile(gl, FS_OUT);
      if (g.flt) {   // Prüfen, ob in Gleitkomma-Texturen gezeichnet werden kann, sonst 8 Bit
        var tt = texture(g, 4, 4, true), ff = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, ff); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tt, 0);
        g.flt = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE; gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.deleteFramebuffer(ff); gl.deleteTexture(tt);
      }
      c.addEventListener("webglcontextlost", function (e) { e.preventDefault(); if (G === g) G = null; });
      G = g; return g;
    } catch (e) { console.warn("Color Blur: WebGL2 nicht nutzbar, rechne mit Canvas 2D.", e); G = false; return null; }
  }
  function texture(g, w, h, fl) {
    var gl = g.gl, t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    if (fl) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  function target(g, w, h, fl) { var gl = g.gl, t = texture(g, w, h, fl), f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); return { t: t, f: f }; }
  function free(s) {
    var R = s && s.gpu; if (!R) return; s.gpu = null;
    if (!G || G.gen !== R.gen) return;
    var gl = G.gl; gl.deleteTexture(R.src); [R.M[0], R.M[1], R.T[0], R.T[1]].forEach(function (q) { gl.deleteTexture(q.t); gl.deleteFramebuffer(q.f); });
  }
  function ensure(s, g, w, h) {
    var R = s.gpu;
    if (R && R.gen === g.gen && R.w === w && R.h === h) return R;
    free(s);
    R = s.gpu = { gen: g.gen, w: w, h: h, src: texture(g, w, h, false), srcOk: false,
      M: [target(g, w, h, false), target(g, w, h, false)], T: [target(g, w, h, g.flt), target(g, w, h, g.flt)], mi: 0, ti: 0 };
    s.cur = null; s.hist = [null, null];
    return R;
  }
  function pass(g, pr, fb, w, h) { var gl = g.gl; gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.viewport(0, 0, w, h); gl.useProgram(pr); gl.uniform2f(pr.u("uSize"), w, h); return pr; }
  function bindTex(gl, pr, name, unit, t) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); gl.uniform1i(pr.u(name), unit); }

  function renderGL(c, g) {
    var gl = g.gl, p = c.p, w = c.w, h = c.h, s = c.state, sc = c.scale, R = ensure(s, g, w, h);
    // Videobild hochladen
    gl.bindTexture(gl.TEXTURE_2D, R.src); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    if (R.srcOk) gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, c.src); else { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, c.src); R.srcOk = true; }
    // Neuer Frame: aktueller Schweif und aktuelle Maske werden zu den vorigen
    if (!c.same) {
      if (c.cont) s.hist = [s.cur, s.hist ? s.hist[0] : null];
      else s.hist = [null, null];
      R.ti ^= 1; R.mi ^= 1;
      if (!c.cont) { gl.bindFramebuffer(gl.FRAMEBUFFER, R.T[R.ti ^ 1].f); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); }
    }
    var cur = s.cur = locate(c, p), c1 = s.hist[0], c2 = s.hist[1];
    if (cur && c1 && Math.hypot(cur.x - c1.x, cur.y - c1.y) > w * 0.4) { c1 = null; c2 = null; }   // Sprung (z. B. Schleife im Video): keine Bahn ziehen
    // 1. Maske in voller Auflösung
    var K = lab(cur ? cur.key[0] : hexRgb(p.key)[0], cur ? cur.key[1] : hexRgb(p.key)[1], cur ? cur.key[2] : hexRgb(p.key)[2], [0, 0, 0]);
    var e = Math.max(0.5, p.tol * p.soft / 100), pr = pass(g, g.pm, R.M[R.mi].f, w, h);
    gl.uniform3f(pr.u("uKey"), K[0], K[1], K[2]); gl.uniform1f(pr.u("uLo"), p.tol - e); gl.uniform1f(pr.u("uHi"), p.tol + e); gl.uniform1f(pr.u("uR"), Math.max(0.75, 1.2 * sc));
    bindTex(gl, pr, "uSrc", 0, R.src); gl.bindVertexArray(g.vao); gl.drawArrays(gl.TRIANGLES, 0, 3);
    // 2. Schweif
    var gap = c.cont ? Math.max(1, Math.min(4, c.gap || 1)) : 1, keep = Math.pow(0.03, 1 / Math.max(1, p.len));
    var pt = cur ? path(cur, c1, c2, p.smooth) : null, step = c.export ? 0.4 : 0.7, N = 0;
    if (pt) N = Math.max(1, Math.min(c.export ? 400 : 220, Math.ceil(pt.len / step)));
    if (pt && !c1) N = 1;
    pr = pass(g, g.pt, R.T[R.ti].f, w, h);
    bindTex(gl, pr, "uOld", 0, R.T[R.ti ^ 1].t); bindTex(gl, pr, "uMc", 1, R.M[R.mi].t); bindTex(gl, pr, "uMp", 2, R.M[R.mi ^ 1].t);
    gl.uniform1f(pr.u("uDecay"), Math.pow(keep, gap)); gl.uniform1f(pr.u("uLogKeep"), Math.log(keep)); gl.uniform1f(pr.u("uGap"), gap); gl.uniform1f(pr.u("uEps"), g.flt ? 0 : 1.2 / 255);
    gl.uniform1i(pr.u("uN"), N); gl.uniform1i(pr.u("uPrev"), c1 ? 1 : 0);
    if (pt) {
      gl.uniform2fv(pr.u("uPath[0]"), pt.P); gl.uniform2f(pr.u("uC0"), cur.x, cur.y); gl.uniform2f(pr.u("uC1"), c1 ? c1.x : cur.x, c1 ? c1.y : cur.y);
      var l = cur.l, t = cur.t, r = cur.r, b = cur.b, x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, mg = 6 * sc;
      if (c1) { l = Math.min(l, c1.l); t = Math.min(t, c1.t); r = Math.max(r, c1.r); b = Math.max(b, c1.b); }
      for (var k = 0; k < 17; k++) { x0 = Math.min(x0, pt.P[k * 2]); x1 = Math.max(x1, pt.P[k * 2]); y0 = Math.min(y0, pt.P[k * 2 + 1]); y1 = Math.max(y1, pt.P[k * 2 + 1]); }
      gl.uniform4f(pr.u("uBox"), x0 + l - mg, y0 + t - mg, x1 + r + mg, y1 + b + mg);
    }
    var ang = p.dang * Math.PI / 180, dr = p.drift / 100 * 14 * sc * gap, gc = c1 || cur || { x: w / 2, y: h / 2 };
    gl.uniform2f(pr.u("uDrift"), Math.cos(ang) * dr, Math.sin(ang) * dr); gl.uniform2f(pr.u("uGC"), gc.x, gc.y);
    gl.uniform1f(pr.u("uGrow"), 1 + p.life / 100 * 0.012 * gap);
    gl.uniform1f(pr.u("uTurb"), p.turb / 100 * 4 * sc * gap); gl.uniform1f(pr.u("uPh"), c.t * 1.6); gl.uniform1f(pr.u("uSc"), Math.max(0.2, sc));
    gl.uniform1f(pr.u("uBlur"), p.life / 100 * 6 * sc * Math.sqrt(gap)); gl.uniform1f(pr.u("uRot"), (c.frame * 2.39996) % 6.2832);
    var tc = hexRgb(p.tint); gl.uniform1i(pr.u("uCol"), p.col === "tint" ? 1 : p.col === "rainbow" ? 2 : 0); gl.uniform3f(pr.u("uTint"), tc[0] / 255, tc[1] / 255, tc[2] / 255);
    gl.uniform1f(pr.u("uHue0"), (c.t * 0.25) % 1); gl.uniform1f(pr.u("uHueF"), gap / Math.max(1, c.fps) * 0.25);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    // 3. Ausgabe
    if (g.cv.width !== w || g.cv.height !== h) { g.cv.width = w; g.cv.height = h; }
    pr = pass(g, g.po, null, w, h);
    bindTex(gl, pr, "uSrc", 0, R.src); bindTex(gl, pr, "uT", 1, R.T[R.ti].t); bindTex(gl, pr, "uMc", 2, R.M[R.mi].t);
    gl.uniform1f(pr.u("uAmt"), p.amt / 100); gl.uniform1i(pr.u("uBlend"), p.blend === "screen" ? 1 : p.blend === "glow" ? 2 : 0); gl.uniform1i(pr.u("uObj"), p.obj ? 1 : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
    var o = c.dst.getContext("2d"); o.globalCompositeOperation = "copy"; o.drawImage(g.cv, 0, 0); o.globalCompositeOperation = "source-over";
  }

  // ---------- Ohne WebGL2: Rechenweg aus v0.11 (Canvas 2D) ----------
  function render2d(c) {
    var p = c.p, w = c.w, h = c.h, s = c.state, sc = c.scale;
    var sw = Math.max(48, Math.round(w / 4)), sh = Math.max(27, Math.round(sw * h / w));
    var small = cv(c, "small", sw, sh), sx = small.getContext("2d", { willReadFrequently: true });
    sx.imageSmoothingQuality = "medium"; sx.drawImage(c.src, 0, 0, sw, sh);
    var d = sx.getImageData(0, 0, sw, sh).data, kc = hexRgb(p.key), K = lab(kc[0], kc[1], kc[2], [0, 0, 0]), L = [0, 0, 0];
    var e = Math.max(0.5, p.tol * p.soft / 100), lo = p.tol - e, hi = p.tol + e, mx = 0, my = 0, mw = 0;
    var mk = cv(c, "mk", sw, sh), mkx = mk.getContext("2d"), mimg = s.mimg && s.mimg.width === sw && s.mimg.height === sh ? s.mimg : (s.mimg = mkx.createImageData(sw, sh)), md = mimg.data;
    for (var y = 0, i = 0; y < sh; y++) for (var x = 0; x < sw; x++, i += 4) {
      lab(d[i], d[i + 1], d[i + 2], L);
      var dl = L[0] - K[0], da = L[1] - K[1], db = L[2] - K[2], dist = Math.sqrt(dl * dl * 0.5 + da * da + db * db);
      var a = dist <= lo ? 1 : dist >= hi ? 0 : 1 - (dist - lo) / (hi - lo); a = a * a * (3 - 2 * a);
      md[i] = md[i + 1] = md[i + 2] = 255; md[i + 3] = Math.round(a * 255);
      if (a > 0.05) { mx += x * a; my += y * a; mw += a; }
    }
    mkx.putImageData(mimg, 0, 0);
    var M = cv(c, "M", w, h), Mx = M.getContext("2d");
    Mx.globalCompositeOperation = "copy"; Mx.drawImage(c.src, 0, 0);
    Mx.globalCompositeOperation = "destination-in"; Mx.imageSmoothingEnabled = true; Mx.imageSmoothingQuality = "high"; Mx.drawImage(mk, 0, 0, w, h);
    Mx.globalCompositeOperation = "source-over";
    var cen = mw > sw * sh * 0.0004 ? { x: mx / mw * w / sw, y: my / mw * h / sh } : null, stamp = M;
    if (p.col !== "orig") {
      var Tn = cv(c, "Tn", w, h), tx = Tn.getContext("2d");
      tx.globalCompositeOperation = "copy"; tx.drawImage(M, 0, 0); tx.globalCompositeOperation = "source-in";
      tx.fillStyle = p.col === "tint" ? p.tint : "hsl(" + Math.round((c.t * 90) % 360) + ",95%,60%)";
      tx.fillRect(0, 0, w, h); tx.globalCompositeOperation = "source-over"; stamp = Tn;
    }
    var T = cv(c, "T", w, h), T2 = cv(c, "T2", w, h);
    if (!c.cont && !c.same) { T.getContext("2d").clearRect(0, 0, w, h); s.prev = null; }
    if (!c.same) {
      var gap = Math.max(1, Math.min(4, c.gap || 1)), keep = Math.pow(0.03, gap / Math.max(1, p.len));
      var blur = p.life / 100 * 5 * sc * Math.sqrt(gap), dr = p.drift / 100 * 14 * sc * gap, ang = p.dang * Math.PI / 180;
      var t2 = T2.getContext("2d"); t2.clearRect(0, 0, w, h);
      t2.globalAlpha = keep; t2.filter = blur > 0.2 ? "blur(" + blur.toFixed(2) + "px)" : "none";
      var grow = 1 + p.life / 100 * 0.012 * gap;
      if (grow > 1.0001 && s.prev) { t2.translate(s.prev.x, s.prev.y); t2.scale(grow, grow); t2.translate(-s.prev.x, -s.prev.y); }
      t2.drawImage(T, Math.cos(ang) * dr / grow, Math.sin(ang) * dr / grow);
      t2.setTransform(1, 0, 0, 1, 0, 0); t2.filter = "none"; t2.globalAlpha = 1;
      var cx2 = T2.getContext("2d");
      if (cen && s.prev) {
        var ddx = s.prev.x - cen.x, ddy = s.prev.y - cen.y, dist2 = Math.hypot(ddx, ddy);
        if (dist2 > 1.5 * sc && dist2 < w * 0.4) {
          var n = Math.min(48, Math.ceil(dist2 / (1.5 * sc)));
          for (var j = n; j >= 1; j--) { var f = j / (n + 1); cx2.globalAlpha = Math.pow(keep, f); cx2.drawImage(stamp, ddx * f, ddy * f); }
          cx2.globalAlpha = 1;
        }
      }
      cx2.drawImage(stamp, 0, 0);
      s.T = T2; s.T2 = T; T = T2;
      if (cen) s.prev = cen;
    }
    var o = c.dst.getContext("2d");
    o.globalCompositeOperation = "copy"; o.drawImage(c.src, 0, 0);
    o.globalCompositeOperation = p.blend === "glow" ? "lighter" : p.blend === "screen" ? "screen" : "source-over";
    o.globalAlpha = p.amt / 100; o.drawImage(T, 0, 0); o.globalAlpha = 1;
    o.globalCompositeOperation = "source-over";
    if (p.obj) o.drawImage(M, 0, 0);
  }

  WeFX.register({
    id: "colorblur",
    name: { de: "Color Blur", en: "Color Blur" },
    desc: { de: "Bewegungsunschärfe für eine Farbe: Alles in der Pipettenfarbe zieht einen Schweif aus den vorigen Frames hinter sich her. Der Schweif entsteht beim Abspielen, beim Baken und im Export.", en: "Motion blur for one colour: everything in the picked colour drags a trail from the previous frames behind it. The trail builds up during playback, baking and export." },
    short: { de: "Schweif hinter einer Farbe", en: "Trail behind one colour" },
    icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="17" cy="12" r="4.5" fill="currentColor"/><path d="M2 12h9M4 8h7M4 16h7" stroke="currentColor" stroke-width="2" opacity=".55"/></svg>',
    params: [
      { k: "key", type: "pick", label: { de: "Farbe", en: "Colour" }, def: "#D9442E" },
      { k: "tol", type: "range", label: { de: "Toleranz", en: "Tolerance" }, def: 22, min: 2, max: 80 },
      { k: "soft", type: "range", label: { de: "Weiche Kante der Farbe", en: "Colour edge softness" }, def: 35, min: 0, max: 100, unit: " %" },
      { k: "len", type: "range", label: { de: "Länge", en: "Length" }, def: 18, min: 2, max: 120, unit: " Frames" },
      { k: "amt", type: "range", label: { de: "Intensität", en: "Intensity" }, def: 85, min: 0, max: 100, unit: " %" },
      { k: "life", type: "range", label: { de: "Lebendigkeit", en: "Liveliness" }, def: 25, min: 0, max: 100, unit: " %", hint: { de: "0 = schmale Spur wie ein Kondensstreifen, 100 = breitet sich aus wie Rauch", en: "0 = narrow track like a contrail, 100 = spreads like smoke" } },
      { k: "turb", type: "range", label: { de: "Turbulenz", en: "Turbulence" }, def: 0, min: 0, max: 100, unit: " %" },
      { k: "drift", type: "range", label: { de: "Drift (Wind)", en: "Drift (wind)" }, def: 0, min: 0, max: 100, unit: " %" },
      { k: "dang", type: "range", label: { de: "Drift-Richtung", en: "Drift direction" }, def: 270, min: 0, max: 360, unit: "°" },
      { k: "smooth", type: "range", label: { de: "Kurven glätten", en: "Smooth curves" }, def: 60, min: 0, max: 100, unit: " %", hint: { de: "0 = gerade Stücke von Frame zu Frame, höher = der Schweif folgt Kurven weich", en: "0 = straight pieces from frame to frame, higher = the trail follows curves smoothly" } },
      { k: "col", type: "select", label: { de: "Farbe des Schweifs", en: "Trail colour" }, def: "orig", options: [["orig", { de: "Original", en: "Original" }], ["tint", { de: "Eigene", en: "Custom" }], ["rainbow", { de: "Regenbogen", en: "Rainbow" }]] },
      { k: "tint", type: "color", label: { de: "Eigene Farbe", en: "Custom colour" }, def: "#F87666" },
      { k: "blend", type: "select", label: { de: "Mischung", en: "Blend" }, def: "normal", options: [["normal", { de: "Normal", en: "Normal" }], ["screen", { de: "Aufhellen", en: "Screen" }], ["glow", { de: "Leuchten", en: "Glow" }]] },
      { k: "obj", type: "check", label: { de: "Objekt scharf obendrauf", en: "Keep object sharp on top" }, def: true }
    ],
    render: function (c) {
      var g = gpu();
      if (g) { try { renderGL(c, g); return; } catch (e) { console.warn("Color Blur: WebGL-Fehler, rechne mit Canvas 2D.", e); free(c.state); G = false; } }
      render2d(c);
    },
    dispose: function (state) { free(state); }
  });
})();
