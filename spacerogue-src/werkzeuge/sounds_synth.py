# Synthese der Space-Rogue-Sounds v0.58.1 (Platzhalter, Noah kann jede Datei durch eigene ersetzen)
import numpy as np, subprocess, os, sys
from scipy import signal
SR = 44100
OUT = sys.argv[1]
rng = np.random.default_rng(58)
def t(d): return np.arange(int(SR * d)) / SR
def norm(x, db): return x / (np.max(np.abs(x)) + 1e-9) * 10 ** (db / 20)
def lp(x, f, o=2): b, a = signal.butter(o, f / (SR / 2), "low"); return signal.lfilter(b, a, x)
def hp(x, f, o=2): b, a = signal.butter(o, f / (SR / 2), "high"); return signal.lfilter(b, a, x)
def bp(x, f1, f2, o=2): b, a = signal.butter(o, [f1 / (SR / 2), f2 / (SR / 2)], "band"); return signal.lfilter(b, a, x)
def env(n, a, d):  # Attack/Decay in s, exponentieller Abfall
    tt = np.arange(n) / SR; e = np.minimum(1, tt / max(a, 1e-4)); return e * np.exp(-np.maximum(0, tt - a) / d)
def noise(n): return rng.standard_normal(n)
def loopify(x, xf=0.08):  # nahtlose Schleife: Ende in den Anfang überblenden
    k = int(SR * xf); y = x[:-k].copy(); r = np.linspace(0, 1, k); y[:k] = y[:k] * r + x[-k:] * (1 - r); return y
def save_mp3(name, x):
    w = os.path.join(OUT, name + ".wav"); write_wav(w, x)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", w, "-c:a", "libmp3lame", "-b:a", "160k", os.path.join(OUT, name + ".mp3")], check=True); os.remove(w)
def write_wav(path, x):
    from scipy.io import wavfile
    wavfile.write(path, SR, (np.clip(x, -1, 1) * 32767).astype(np.int16))
def save_loop(name, x): write_wav(os.path.join(OUT, name + ".wav"), x)
os.makedirs(OUT, exist_ok=True)

# --- Railgun laden: steigendes Sirren mit Pulsen (0,72 s, passt zur Ladezeit 0,7 s)
d = 0.72; tt = t(d); f = 260 * (2400 / 260) ** (tt / d) ** 1.4
ph = 2 * np.pi * np.cumsum(f) / SR
x = 0.6 * np.sin(ph) + 0.25 * np.sin(2 * ph + 0.3) + 0.12 * np.sign(np.sin(3 * ph))
x *= (0.55 + 0.45 * np.sin(2 * np.pi * (8 + 30 * tt / d) * tt)) * np.minimum(1, tt / 0.05) * (0.4 + 0.6 * tt / d)
x += 0.08 * bp(noise(len(tt)), 2000, 7000) * (tt / d)
save_mp3("railgun_laden", norm(lp(x, 9000), -16))

# --- Railgun Schuss: Knall, elektrisches Abwärts-Zappen, tiefer Druck, metallischer Nachklang
d = 1.3; tt = t(d); n = len(tt)
crack = hp(noise(n), 1500) * env(n, 0.0005, 0.03)
zf = 3200 * np.exp(-tt / 0.08) + 120; zap = np.sign(np.sin(2 * np.pi * np.cumsum(zf) / SR)) * env(n, 0.001, 0.12)
boom = np.sin(2 * np.pi * np.cumsum(55 + 50 * np.exp(-tt / 0.05)) / SR) * env(n, 0.003, 0.35)
ring = sum(a * np.sin(2 * np.pi * fr * tt) for fr, a in [(1830, .5), (2710, .35), (4120, .2)]) * env(n, 0.001, 0.25)
x = 0.9 * crack + 0.35 * lp(zap, 6000) + 1.0 * boom + 0.25 * ring
save_mp3("railgun_schuss", norm(x, -10))

# --- Laserstrahl (Schleife 1 s): summender Ton mit Zittern und Knistern
d = 1.0; tt = t(d + 0.08); n = len(tt)
x = 0.5 * signal.sawtooth(2 * np.pi * 220 * tt) + 0.5 * signal.sawtooth(2 * np.pi * 221 * tt)
x = lp(x, 1800) * (0.75 + 0.25 * np.sin(2 * np.pi * 30 * tt))
x += 0.25 * np.sin(2 * np.pi * 1760 * tt) * (0.6 + 0.4 * np.sin(2 * np.pi * 7 * tt))
x += 0.18 * bp(noise(n), 3000, 9000) * (0.5 + 0.5 * (rng.random(n) > 0.995).astype(float).cumsum() % 2)
save_loop("laser_strahl", norm(loopify(x), -14))

# --- Rakete: Zünden (einmal) und Zischen (Schleife)
d = 0.7; tt = t(d); n = len(tt)
x = 1.0 * np.sin(2 * np.pi * np.cumsum(90 + 60 * np.exp(-tt / 0.04)) / SR) * env(n, 0.002, 0.12) + 0.8 * lp(noise(n), 3500) * env(n, 0.01, 0.35)
save_mp3("rakete_start", norm(x, -12))
d = 1.2; tt = t(d + 0.15); n = len(tt)
fl = lp(rng.standard_normal(n), 12) * 4 + 1
x = lp(hp(noise(n), 300), 5000) * (0.7 + 0.3 * np.clip(fl, 0, 2)) + 0.25 * bp(noise(n), 6000, 10000)
save_loop("rakete_zischen", norm(loopify(x, 0.15), -15))

# --- Metall-Treffer (3 Varianten): Klick + unharmonische Teiltöne
for i, base in enumerate([1150, 1370, 990]):
    d = 0.35; tt = t(d); n = len(tt)
    parts = [(1.0, .9, .07), (1.63, .6, .05), (2.31, .45, .04), (3.47, .3, .03), (0.52, .35, .09)]
    x = sum(a * np.sin(2 * np.pi * base * r * tt + rng.random() * 6) * env(n, 0.0004, dc) for r, a, dc in parts)
    x += 0.8 * hp(noise(n), 2500) * env(n, 0.0002, 0.006)
    save_mp3("treffer_metall_%d" % (i + 1), norm(x, -14))

# --- Schild-Treffer: dumpf, weich, absorbierend (kein Metall)
d = 0.45; tt = t(d); n = len(tt)
x = 0.9 * np.sin(2 * np.pi * np.cumsum(140 * np.exp(-tt / 0.12) + 60) / SR) * env(n, 0.006, 0.09)
x += 0.6 * lp(noise(n), 700) * env(n, 0.004, 0.06) + 0.18 * np.sin(2 * np.pi * 420 * tt) * env(n, 0.02, 0.12) * (0.5 + 0.5 * np.sin(2 * np.pi * 18 * tt))
save_mp3("schild_treffer", norm(lp(x, 1800), -13))

# --- Schild laden (Schleife 2 s): magnetisches Summen mit Schwebung
d = 2.0; tt = t(d + 0.1); n = len(tt)
x = 0.6 * np.sin(2 * np.pi * 110 * tt + 0.8 * np.sin(2 * np.pi * 4 * tt)) + 0.35 * np.sin(2 * np.pi * 220.5 * tt) + 0.2 * np.sin(2 * np.pi * 330 * tt)
x += 0.15 * bp(noise(n), 1500, 4000) * (0.5 + 0.5 * np.sin(2 * np.pi * 2 * tt)) + 0.1 * np.sin(2 * np.pi * 1320 * tt) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.5 * tt))
save_loop("schild_laden", norm(loopify(x, 0.1), -16))

# --- Reaktor (Schleife 2 s): Netzbrummen + Hochspannungs-Knistern
d = 2.0; tt = t(d + 0.1); n = len(tt)
x = 0.5 * np.sin(2 * np.pi * 50 * tt) + 0.4 * signal.square(2 * np.pi * 100 * tt) * 0.3 + 0.3 * np.sin(2 * np.pi * 150 * tt) + 0.15 * np.sin(2 * np.pi * 250 * tt)
x = lp(x, 900)
cr = np.zeros(n); idx = rng.integers(0, n, 140); cr[idx] = rng.standard_normal(140) * 3
x += 0.5 * hp(signal.lfilter([1], [1, -0.6], cr), 3000) + 0.06 * np.sin(2 * np.pi * 3150 * tt) + 0.1 * bp(noise(n), 4000, 9000)
save_loop("reaktor_summen", norm(loopify(x, 0.1), -15))

# --- Sonar-Ping: klarer Ton mit Echos
d = 2.2; tt = t(d); n = len(tt)
p = np.sin(2 * np.pi * 1320 * tt) * env(n, 0.004, 0.35) + 0.3 * np.sin(2 * np.pi * 2640 * tt) * env(n, 0.002, 0.12)
x = p.copy()
for k, g in [(0.32, .35), (0.64, .18), (0.96, .09)]: s = int(SR * k); x[s:] += g * lp(p[:-s], 2500)
save_mp3("scanner_ping", norm(x, -16))

# --- Schritte (4 Varianten): weicher Stiefel auf Metallboden, dezent
for i in range(4):
    d = 0.22; tt = t(d); n = len(tt)
    x = 0.9 * lp(noise(n), 600 + 120 * i) * env(n, 0.003, 0.025) + 0.5 * np.sin(2 * np.pi * (110 + 12 * i) * tt) * env(n, 0.002, 0.03)
    x += 0.08 * sum(np.sin(2 * np.pi * f0 * tt) for f0 in [2200 + 90 * i, 3410 + 70 * i]) * env(n, 0.001, 0.04)
    save_mp3("schritt_%d" % (i + 1), norm(x, -20))

# --- Atmen im Helm (Schleife ~4,4 s): Einatmen, Pause, Ausatmen, Pause
d = 4.4; tt = t(d); n = len(tt)
def breath(t0, t1, f1, f2, a):
    m = (tt >= t0) & (tt < t1); e = np.zeros(n); u = (tt[m] - t0) / (t1 - t0); e[m] = np.sin(np.pi * u) ** 1.6 * a
    return bp(noise(n), f1, f2) * e
x = breath(0.1, 1.6, 500, 2600, 1.0) + breath(1.9, 3.7, 250, 1500, 0.8)
x = x + 0.25 * np.concatenate([np.zeros(int(SR * 0.012)), x[:-int(SR * 0.012)]])   # kleiner Helm-Hall
save_loop("atmen_helm", norm(x, -20))
print("fertig")
