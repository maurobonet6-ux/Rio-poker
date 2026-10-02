# Sonido de los vídeos: efectos sueltos, voz en off y una música de fondo suave opcional (tipo «musica»).
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
# Música de fondo («musica»): una base tranquila hecha aquí mismo (sin derechos de autor), a 92 BPM, con acordes La m–Fa–Do–Sol,
# bajo, bombo suave y charles. Va en su propia pista (M) para bajarla cuando habla la voz.
M = np.zeros(len(L))
if any(e['tipo'] == 'musica' for e in EV):
    bpm = 92; beat = 60/bpm; compas = 4*beat; t_all = np.arange(len(M))/SR
    acordes = [[220.0, 261.63, 329.63], [174.61, 220.0, 261.63], [130.81, 164.81, 196.0], [196.0, 246.94, 293.66]]
    nb = int(np.ceil(TOTAL/compas)) + 1
    for b in range(nb):
        i0 = int(b*compas*SR); n = int(compas*SR)
        if i0 >= len(M): break
        n = min(n, len(M) - i0); tt = np.arange(n)/SR; env = np.minimum(1, tt/.4)*np.minimum(1, (compas - tt)/.4)
        ch = acordes[b % 4]; pad = sum(np.sin(2*np.pi*f*tt) + .5*np.sin(2*np.pi*f*1.003*tt) + .25*np.sin(2*np.pi*2*f*tt) for f in ch)
        M[i0:i0+n] += pad*env*.06 + np.sin(2*np.pi*ch[0]/2*tt)*env*.10
        for q in range(4):
            j = i0 + int(q*beat*SR)
            if q in (0, 2):
                k = tone(55, .35, .09)*.5; m = min(len(k), len(M) - j); M[j:j+m] += k[:m] if m > 0 else 0
            h = int((q + .5)*beat*SR) + i0; ruido = lp(rng.normal(0, 1, int(.05*SR)), 1)*np.exp(-np.arange(int(.05*SR))/SR/.012)*.05
            m = min(len(ruido), len(M) - h)
            if m > 0: M[h:h+m] += ruido[:m]
    fade = np.minimum(1, t_all/.6)*np.clip((TOTAL - t_all)/1.2, 0, 1)
    M *= fade
for e in EV:
    t, k = float(e['t']), e['tipo']
    if k in ('voz', 'musica'): continue
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
    M *= 1 - 0.55*media(actividad.astype(float), int(.4*SR))                         # la música baja más despacio, sin cortes
    pico = np.max(np.abs(V)); V = V/pico*0.9                                        # voz a buen nivel
    L = L*0.8 + V; R = R*0.8 + V
L = L + M*0.55; R = R + M*0.55
mix = np.stack([L, R], 1)[:N]; m = np.max(np.abs(mix)); mix = mix/(m if m > 0 else 1)*0.89
with wave.open(OUT, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix*32767).astype('<i2').tobytes())
