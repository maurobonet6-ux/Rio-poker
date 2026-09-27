# Solo "whoosh" en los cambios y "ding" al mostrar el resultado.
import numpy as np, wave, sys
# Uso: python3 audio_que_es_rio.py <salida.wav>
SR = 44100; total = 22.9; N = int(total*SR)
L = np.zeros(N+SR); R = np.zeros(N+SR); rng = np.random.default_rng(5)
def lp(x, k): return np.convolve(x, np.ones(k)/k, mode='same')
def whoosh(dur):
    n = int(dur*SR); t = np.arange(n)/SR; x = rng.normal(0, 1, n); p = t/dur
    e = np.sin(np.pi*p**0.7)**2; hi = np.diff(np.concatenate([[0], x]))
    return (lp(x, 5)*(1-.5*p) + hi*.5*p)*e*.35
def tone(f, dur, dcy):
    t = np.arange(int(dur*SR))/SR; return np.sin(2*np.pi*f*t)*np.exp(-t/dcy)*np.minimum(1, t/.002)
def add(sig, at, g=1):
    i = int(at*SR); L[i:i+len(sig)] += sig*g; R[i:i+len(sig)] += sig*g
for at in (2.1, 4.0, 5.5, 8.0, 10.4, 15.7, 19.2): add(whoosh(.5), at - .3, 1.0)
for at in (11.8,): add(whoosh(.3), at - .15, .5)
add(tone(1318.5, 1.4, .35)*.5 + tone(2637, 1.4, .18)*.18 + tone(1975.5, 1.4, .3)*.25, 12.6)
mix = np.stack([L, R], 1)[:N]; mix = mix/np.max(np.abs(mix))*0.89
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix*32767).astype('<i2').tobytes())
