# Sintetiza voz en off en español con Kokoro (código abierto, licencia Apache; sin claves ni servicios de pago).
# Uso: python3 voz.py '{"dir": "...", "voz": "ef_dora", "velocidad": 1.05, "frases": [{"id": "p1", "texto": "..."}]}'
# Escribe <dir>/<id>.wav por cada frase y imprime en la última línea un JSON {"id": duración_en_segundos, ...}.
# El modelo (325 MB) se descarga una vez de GitHub en KOKORO_DIR (por defecto marketing/videos/modelos) y se reutiliza.
import json, os, sys, urllib.request
datos = json.loads(sys.argv[1])
DIR_MODELO = os.environ.get('KOKORO_DIR') or os.path.join(os.path.dirname(os.path.abspath(__file__)), 'modelos')
BASE = 'https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/'
os.makedirs(DIR_MODELO, exist_ok=True)
for f in ('kokoro-v1.0.onnx', 'voices-v1.0.bin'):
    ruta = os.path.join(DIR_MODELO, f)
    if not os.path.exists(ruta) or os.path.getsize(ruta) < 1_000_000:
        print('Descargando ' + f + '…', file=sys.stderr)
        urllib.request.urlretrieve(BASE + f, ruta + '.tmp'); os.replace(ruta + '.tmp', ruta)
import soundfile as sf
from kokoro_onnx import Kokoro
k = Kokoro(os.path.join(DIR_MODELO, 'kokoro-v1.0.onnx'), os.path.join(DIR_MODELO, 'voices-v1.0.bin'))
os.makedirs(datos['dir'], exist_ok=True)
dur = {}
for fr in datos['frases']:
    muestras, sr = k.create(fr['texto'], voice=datos.get('voz', 'ef_dora'), speed=float(datos.get('velocidad', 1.05)), lang='es')
    sf.write(os.path.join(datos['dir'], fr['id'] + '.wav'), muestras, sr, subtype='PCM_16')
    dur[fr['id']] = round(len(muestras) / sr, 3)
print(json.dumps(dur))
