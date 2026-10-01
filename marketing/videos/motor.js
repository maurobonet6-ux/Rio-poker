// Motor común de los vídeos: abre una página con una función render(t), saca un fotograma por cada 1/30 s,
// los une con ffmpeg y les pone el sonido (audio_eventos.py). Lo usan los formatos nuevos (concurso, mito, lista…).
// Los formatos con página animada (concurso, mito, lista) usan grabar(); el de la mesa (video-mesa.js) usa solo renderizarMudo().
const { chromium } = require('@playwright/test');
const fs = require('fs'), path = require('path'), { spawn, execFileSync } = require('child_process');
const { SALIDA, ffmpeg, unirAudio, fontRoute } = require('./comun.js');

const os = require('os');
const FPS = 30;
// Cuántos navegadores sacan fotogramas a la vez (por defecto, uno por núcleo; TRABAJADORES=1 para ir de uno en uno).
const TRABAJADORES = Math.max(1, Math.min(+process.env.TRABAJADORES || os.cpus().length, 6));
const FUENTES = '<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">';

// Saca los fotogramas de una página con window.render(t) repartidos entre varios navegadores y los une en un mp4 sin sonido.
// Cada fotograma depende solo de t, así que da igual qué navegador saque cuál. Es 2 a 4 veces más rápido que ir de uno en uno.
async function renderizarMudo({ archivoHtml, total, salida }){
  const frames = Math.round(total * FPS);
  const dir = path.join(SALIDA, 'fotogramas-' + path.basename(salida, '.mp4'));
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const b = await chromium.launch();
  const W = Math.min(TRABAJADORES, frames);
  try {
    await Promise.all(Array.from({ length: W }, async (_, w) => {
      const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
      await p.route('**/*', r => fontRoute(r) || r.continue());
      await p.goto('file://' + archivoHtml);
      await p.evaluate(() => document.fonts.ready);
      await p.evaluate(() => window.setup && window.setup());
      for (let i = w; i < frames; i += W){
        await p.evaluate(x => window.render(x), i / FPS);
        await p.screenshot({ type: 'jpeg', quality: 92, path: path.join(dir, String(i).padStart(5, '0') + '.jpg') });
      }
      await p.close();
    }));
  } finally { await b.close(); }
  execFileSync(ffmpeg(), ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(dir, '%05d.jpg'), '-vf', 'format=yuv420p', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-movflags', '+faststart', salida]);
  fs.rmSync(dir, { recursive: true, force: true });
}

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
  await b.close();
  const mudo = path.join(SALIDA, `${nombre}-mudo.mp4`);
  await renderizarMudo({ archivoHtml: f, total, salida: mudo });
  fs.rmSync(f);
  const wav = path.join(SALIDA, nombre + '.wav'), final = path.join(SALIDA, `rio-${nombre}.mp4`);
  execFileSync('python3', [path.join(__dirname, 'audio_eventos.py'), wav, String(total), JSON.stringify(eventos)]);
  unirAudio(mudo, wav, final);
  return final;
}

module.exports = { grabar, renderizarMudo, FUENTES };
