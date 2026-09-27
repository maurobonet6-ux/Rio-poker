# Solo "whoosh" (al repartir cartas y al cambiar al final) y "ding" (respuesta de RÍO).
import numpy as np, wave, sys
# Uso: python3 audio_mesa.py <cartas_en_mesa> <salida.wav> <duración> <inicio_del_final>
NB, OUT, TOTAL, FIN = int(sys.argv[1]), sys.argv[2], float(sys.argv[3]), float(sys.argv[4])
SR = 44100; total = TOTAL; N = int(total*SR)
L = np.zeros(N+SR); R = np.zeros(N+SR); rng = np.random.default_rng(3)
def lp(x, k): return np.convolve(x, np.ones(k)/k, mode='same') if k > 1 else x
def whoosh(dur, bright=.5):
    n = int(dur*SR); t = np.arange(n)/SR; x = rng.normal(0, 1, n); p = t/dur
    e = np.sin(np.pi*p**0.7)**2; hi = np.diff(np.concatenate([[0], x]))
    return (lp(x, 5)*(1-bright*p) + hi*bright*p)*e*.35
def tone(f, dur, dcy):
    t = np.arange(int(dur*SR))/SR; return np.sin(2*np.pi*f*t)*np.exp(-t/dcy)*np.minimum(1, t/.002)
def add(sig, at, g=1, pan=0):
    i = int(at*SR); L[i:i+len(sig)] += sig*g*(1-pan); R[i:i+len(sig)] += sig*g*(1+pan)
for k, at in enumerate([0.45, 0.6, 0.75, 0.9]): add(whoosh(.28, .7), at - .05, .55, pan=(-.3 if k % 2 == 0 else .3))
for k in range(NB): add(whoosh(.28, .7), 2.0 + k*0.15 - .05, .55, pan=-.2 + .2*k)
add(whoosh(.5), FIN - .3, 1.2)
ding = tone(1318.5, 1.4, .35)*.5 + tone(2637, 1.4, .18)*.18 + tone(1975.5, 1.4, .3)*.25
add(ding, 9.4, 1.0)
mix = np.stack([L, R], 1)[:N]; mix = mix/np.max(np.abs(mix))*0.89
with wave.open(OUT, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix*32767).astype('<i2').tobytes())
