# Voz en off con Edge TTS (voces neuronales de Microsoft, gratis y sin clave). Mismo formato de entrada y salida que voz.py.
# Es un servicio no oficial: si falla, voz.js usa Kokoro.
import asyncio, json, os, subprocess, sys, wave
import edge_tts, imageio_ffmpeg
datos = json.loads(sys.argv[1])
os.makedirs(datos['dir'], exist_ok=True)
FF = imageio_ffmpeg.get_ffmpeg_exe()
rate = '%+d%%' % round((float(datos.get('velocidad', 1.0)) - 1) * 100)
async def una(fr):
    mp3 = os.path.join(datos['dir'], fr['id'] + '.mp3'); wav = os.path.join(datos['dir'], fr['id'] + '.wav')
    await asyncio.wait_for(edge_tts.Communicate(fr['texto'], datos['voz'], rate=rate).save(mp3), 30)
    subprocess.run([FF, '-y', '-loglevel', 'error', '-i', mp3, '-ar', '24000', '-ac', '1', '-c:a', 'pcm_s16le', wav], check=True)
    with wave.open(wav) as w: return round(w.getnframes() / w.getframerate(), 3)
async def todo():
    dur = {}
    for fr in datos['frases']: dur[fr['id']] = await una(fr)
    return dur
print(json.dumps(asyncio.run(todo())))
