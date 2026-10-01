# Sonido de los vídeos de formato nuevo: efectos sueltos, sin música (así se puede poner una canción de tendencia).
# Uso: python3 audio_eventos.py <salida.wav> <duración> '[{"t":1.2,"tipo":"whoosh"}, ...]'
# Tipos: whoosh (transición), tick (cuenta atrás), ding (acierto), riser (suspense que sube), pop (confeti),
# voz ({"t": 3.2, "tipo": "voz", "archivo": "frase.wav"}: una frase de la voz en off; los efectos bajan de volumen mientras habla).
import numpy as np, wave, sys, json
OUT, TOTAL, EV = sys.argv[1], float(sys.argv[2]), json.loads(sys.argv[3])
SR = 44100; N = int(TOTAL*SR)
L = np.zeros(N+SR*3); R = np.zeros(N+SR*3); rng = np.random.default_rng(7)
def lp(x, k): return np.convolve(x, np.ones(k)/k, mode='same') if k > 1 else x
def whoosh(dur=.4, bright=.5):
    n = int(dur*SR); t = np.arange(n)/SR; x = rng.normal(0, 1, n); p = t/dur
    e = np.sin(np.pi*p**0.7)**2; hi = np.diff(np.concatenate([[0], x]))
    return (lp(x, 5)*(1-bright*p) + hi*bright*p)*e*.35
def tone(f, dur, dcy):
    t = np.arange(int(dur*SR))/SR; return np.sin(2*np.pi*f*t)*np.exp(-t/dcy)*np.minimum(1, t/.002)
def riser(dur):
    n = int(dur*SR); t = np.arange(n)/SR; p = t/dur
    f = 180 + 700*p**2; ph = 2*np.pi*np.cumsum(f)/SR
    return (np.sin(ph)*.25 + lp(rng.normal(0, 1, n), 3)*.12*p)*p**1.5
def add(sig, at, g=1.0):
    i = int(at*SR)
    if i < 0 or i + len(sig) > len(L): return
    L[i:i+len(sig)] += sig*g; R[i:i+len(sig)] += sig*g
for e in EV:
    t, k = float(e['t']), e['tipo']
    if k == 'voz': continue
    if k == 'whoosh': add(whoosh(.45), t - .2, 1.0)
    elif k == 'tick': add(tone(1000, .08, .03)*.5, t, 0.8)
    elif k == 'ding': add(tone(1318.5, 1.4, .35)*.5 + tone(2637, 1.4, .18)*.18 + tone(1975.5, 1.4, .3)*.25, t, 1.0)
    elif k == 'riser': add(riser(float(e.get('dur', 1.4))), t, 1.0)
    elif k == 'pop': add(lp(rng.normal(0, 1, int(.35*SR)), 4)*np.exp(-np.arange(int(.35*SR))/SR/.08)*.8 + tone(110, .35, .1)*.6, t, 1.0)
# Voz en off: se pone cada frase en su sitio y los efectos bajan mientras habla (así no tapan la voz).
V = np.zeros(len(L))
for e in EV:
    if e['tipo'] != 'voz': continue
    with wave.open(e['archivo'], 'rb') as w:
        sr0, nch, datos = w.getframerate(), w.getnchannels(), np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').astype(float)/32768
    if nch > 1: datos = datos.reshape(-1, nch).mean(1)
    if sr0 != SR: datos = np.interp(np.linspace(0, len(datos)-1, int(len(datos)*SR/sr0)), np.arange(len(datos)), datos)  # de 24 kHz a 44,1 kHz
    i = int(float(e['t'])*SR)
    if i >= 0 and i + len(datos) <= len(V): V[i:i+len(datos)] += datos
hay_voz = np.max(np.abs(V)) > 0
if hay_voz:
    def media(x, k):                                                                # media móvil rápida (ventana k, misma longitud)
        c = np.cumsum(np.concatenate([[0], x])); y = np.empty(len(x)); h = k//2
        idx = np.arange(len(x)); a = np.clip(idx-h, 0, len(x)); b = np.clip(idx+k-h, 0, len(x)); return (c[b]-c[a])/np.maximum(b-a, 1)
    actividad = media(np.abs(V), int(.12*SR)) > 0.01                                # dónde se está hablando
    bajada = 1 - 0.7*media(actividad.astype(float), int(.25*SR))                    # los efectos bajan al 30 % con suavidad
    L *= bajada; R *= bajada
    pico = np.max(np.abs(V)); V = V/pico*0.9                                        # voz a buen nivel
    L = L*0.8 + V; R = R*0.8 + V
mix = np.stack([L, R], 1)[:N]; m = np.max(np.abs(mix)); mix = mix/(m if m > 0 else 1)*0.89
with wave.open(OUT, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix*32767).astype('<i2').tobytes())
