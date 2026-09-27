# Pone una voz en off (por ejemplo, de TTSMaker) sobre un vídeo ya hecho.
# Corta la voz por frases (usando los silencios), coloca cada frase en su segundo, la limpia,
# baja un poco los efectos mientras se habla y deja el volumen al nivel de TikTok/Instagram (-14 LUFS).
#
# Uso: python3 mezclar-voz.py <video.mp4> <voz.mp3> <inicio_frase1,inicio_frase2,...> <salida.mp4>
import sys, subprocess, re, wave, os, tempfile
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))

VIDEO, VOZ, TIEMPOS, SALIDA = sys.argv[1], sys.argv[2], [float(x) for x in sys.argv[3].split(',')], sys.argv[4]
FF = os.environ.get('FF') or subprocess.run(['node', '-e', "console.log(require('./comun.js').ffmpeg())"], cwd=os.path.dirname(os.path.abspath(__file__)), capture_output=True, text=True).stdout.strip()
SR = 48000

def leer(ruta, canales):
    tmp = tempfile.mktemp(suffix='.wav')
    subprocess.run([FF, '-y', '-loglevel', 'error', '-i', ruta, '-vn', '-ac', str(canales), '-ar', str(SR), '-acodec', 'pcm_s16le', tmp], check=True)
    with wave.open(tmp) as w: x = np.frombuffer(w.readframes(w.getnframes()), '<i2').astype(np.float32)/32768
    os.remove(tmp)
    return x.reshape(-1, canales)

# 1) Frases: se separan por silencios de más de 0,7 s (las pausas cortas de comas y puntos se quedan dentro).
out = subprocess.run([FF, '-hide_banner', '-i', VOZ, '-af', 'silencedetect=noise=-40dB:d=0.25', '-f', 'null', '-'], capture_output=True, text=True).stderr
ini = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', out)]
fin = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', out)]
voz = leer(VOZ, 1)[:, 0]
dur = len(voz)/SR
frases, desde = [], 0.0
for a, b in zip(ini, fin):
    if b - a >= 0.7:
        if a > desde + 0.05: frases.append((desde, a))
        desde = b
if dur > desde + 0.05: frases.append((desde, dur))
if len(frases) != len(TIEMPOS):
    sys.exit(f'La voz tiene {len(frases)} frases y se han dado {len(TIEMPOS)} tiempos: {[(round(a,2), round(b,2)) for a, b in frases]}')

# 2) Limpieza: quita graves que retumban, sube un poco la claridad e iguala el volumen de cada frase.
def paso_alto(x, fc=90):
    a = np.exp(-2*np.pi*fc/SR); y = np.zeros_like(x); p = 0.0; px = 0.0
    for i, v in enumerate(x): p = a*(p + v - px); px = v; y[i] = p
    return y
def brillo(x, k=0.35):   # realza un poco los agudos (voz más presente)
    return x + k*np.concatenate([[0], np.diff(x)])

video = leer(VIDEO, 2)
pista = np.zeros(len(video), np.float32)
for (a, b), t in zip(frases, TIEMPOS):
    f = voz[int(a*SR):int(b*SR)].copy()
    f = brillo(paso_alto(f))
    f /= max(1e-6, np.sqrt(np.mean(f**2)))*6          # misma intensidad en todas las frases
    rampa = int(0.01*SR); f[:rampa] *= np.linspace(0, 1, rampa); f[-rampa:] *= np.linspace(1, 0, rampa)
    i = int(t*SR); f = f[:max(0, len(pista) - i)]; pista[i:i + len(f)] += f

# 3) Mezcla: los efectos bajan a la mitad mientras suena la voz (con transición suave).
activa = (np.abs(pista) > 1e-4).astype(np.float32)
k = int(0.15*SR); env = np.convolve(activa, np.ones(k)/k, mode='same')
fx = video*(1 - 0.5*np.clip(env*3, 0, 1))[:, None]
mezcla = fx*0.8 + pista[:, None]
mezcla /= max(1.0, np.max(np.abs(mezcla))/0.95)

tmp = tempfile.mktemp(suffix='.wav')
with wave.open(tmp, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mezcla*32767).astype('<i2').tobytes())
# 4) Volumen final como el de las redes (-14 LUFS) y audio AAC de alta calidad; el vídeo no se toca.
subprocess.run([FF, '-y', '-loglevel', 'error', '-i', VIDEO, '-i', tmp, '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
                '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', str(SR), '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', SALIDA], check=True)
os.remove(tmp)
print(SALIDA, [(round(a, 2), round(b, 2)) for a, b in frases])
