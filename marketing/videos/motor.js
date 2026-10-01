// Motor común de los vídeos: abre una página con una función render(t), saca un fotograma por cada 1/30 s,
// los une con ffmpeg y les pone el sonido (audio_eventos.py). Lo usan los formatos nuevos (concurso, mito, lista…).
// El vídeo de la mesa (video-mesa.js) tiene su propia copia por historia; los demás usan este.
const { chromium } = require('@playwright/test');
const fs = require('fs'), path = require('path'), { spawn, execFileSync } = require('child_process');
const { SALIDA, ffmpeg, unirAudio, fontRoute } = require('./comun.js');

const FPS = 30;
const FUENTES = '<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">';

// html: página completa con window.setup() (opcional) y window.render(t).
// eventos: sonidos [{ t, tipo }] (whoosh, tick, ding, riser, pop). snap: segundos de los que sacar una captura en vez del vídeo.
async function grabar({ html, nombre, total, eventos = [], snap }){
  const FF = ffmpeg();
  const f = path.join(SALIDA, nombre + '.html');
  fs.writeFileSync(f, html);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.route('**/*', r => fontRoute(r) || r.continue());
  await p.goto('file://' + f);
  await p.evaluate(() => document.fonts.ready);
  await p.evaluate(() => window.setup && window.setup());
  if (snap){
    fs.mkdirSync(path.join(SALIDA, 'snap'), { recursive: true });
    for (const t of snap){ await p.evaluate(x => window.render(x), +t); await p.screenshot({ path: path.join(SALIDA, 'snap', `${nombre}-${t}.png`) }); }
    await b.close(); fs.rmSync(f); return null;
  }
  const mudo = path.join(SALIDA, `${nombre}-mudo.mp4`);
  const ff = spawn(FF, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-', '-vf', 'format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-movflags', '+faststart', mudo], { stdio: ['pipe', 'inherit', 'inherit'] });
  const frames = Math.round(total * FPS);
  for (let i = 0; i < frames; i++){
    await p.evaluate(x => window.render(x), i / FPS);
    const buf = await p.screenshot({ type: 'jpeg', quality: 94 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await b.close();
  fs.rmSync(f);
  const wav = path.join(SALIDA, nombre + '.wav'), final = path.join(SALIDA, `rio-${nombre}.mp4`);
  execFileSync('python3', [path.join(__dirname, 'audio_eventos.py'), wav, String(total), JSON.stringify(eventos)]);
  unirAudio(mudo, wav, final);
  return final;
}

module.exports = { grabar, FUENTES };
