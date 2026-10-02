// Motor común de los vídeos: abre una página con una función render(t), saca un fotograma por cada 1/30 s,
// los une con ffmpeg y les pone el sonido (audio_eventos.py), con voz en off y vídeo de fondo si los hay.
// Los formatos con página animada (concurso, mito, lista) y el de la mesa usan grabar().
const { chromium } = require('@playwright/test');
const fs = require('fs'), path = require('path'), os = require('os'), { execFileSync } = require('child_process');
const { SALIDA, ffmpeg, unirAudio, fontRoute } = require('./comun.js');
const { ajustar } = require('./tiempos.js');
const voz = require('./voz.js');

const FPS = 30;
// Cuántos navegadores sacan fotogramas a la vez (por defecto, uno por núcleo; TRABAJADORES=1 para ir de uno en uno).
const TRABAJADORES = Math.max(1, Math.min(+process.env.TRABAJADORES || os.cpus().length, 6));
const FUENTES = '<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">';

// Con un vídeo de fondo, el fotograma del clip va detrás de la página (una imagen a pantalla completa) y encima queda un tinte
// oscuro con el rojo de la marca, para que se lea todo. (Sacar la página con transparencia era 7 veces más lento.)
const CSS_FONDO = `html{background:#000!important}body{background:radial-gradient(900px 700px at 50% 0, rgba(232,40,63,.20), transparent 60%), rgba(8,8,14,.58)!important}#bg{opacity:.32!important}`;

// Clip de fondo: FONDO=ruta, o uno al azar de marketing/videos/fondos (si hay). SIN_FONDO=1 lo desactiva.
function elegirFondo(){
  if (process.env.SIN_FONDO === '1') return null;
  if (process.env.FONDO) return fs.existsSync(process.env.FONDO) ? process.env.FONDO : null;
  const dir = path.join(__dirname, 'fondos');
  if (!fs.existsSync(dir)) return null;
  const clips = fs.readdirSync(dir).filter(f => /\.(mp4|mov|webm|m4v)$/i.test(f));
  return clips.length ? path.join(dir, clips[Math.floor(Math.random() * clips.length)]) : null;
}

// Saca los fotogramas de una página con window.render(t) repartidos entre varios navegadores y los une en un mp4 sin sonido.
// Cada fotograma depende solo de t, así que da igual qué navegador saque cuál. Es 2 a 4 veces más rápido que ir de uno en uno.
// tiempo(t): de la hora real del vídeo a la hora de diseño (las pausas de la voz congelan la animación). fondo: clip de fondo.
async function renderizarMudo({ archivoHtml, total, salida, tiempo = t => t, fondo = null }){
  const frames = Math.round(total * FPS);
  const base = path.basename(salida, '.mp4');
  const dir = path.join(SALIDA, 'fotogramas-' + base), dirFondo = path.join(SALIDA, 'fondo-' + base);
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const FF = ffmpeg(), t0 = Date.now();
  if (fondo){
    // El clip se repite en bucle desde un punto al azar, se recorta a vertical y se pasa a fotogramas (el fondo sigue en movimiento aunque la voz haga una pausa).
    fs.rmSync(dirFondo, { recursive: true, force: true }); fs.mkdirSync(dirFondo, { recursive: true });
    execFileSync(FF, ['-y', '-loglevel', 'error', '-stream_loop', '-1', '-ss', (Math.random() * 3).toFixed(2), '-i', fondo, '-t', String(total + 0.5),
      '-vf', `fps=${FPS},scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,eq=saturation=0.9`, '-q:v', '5', path.join(dirFondo, '%05d.jpg')]);
  }
  const b = await chromium.launch();
  const W = Math.min(TRABAJADORES, frames);
  try {
    await Promise.all(Array.from({ length: W }, async (_, w) => {
      const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
      await p.route('**/*', r => fontRoute(r) || r.continue());
      await p.goto('file://' + archivoHtml);
      if (fondo){
        await p.addStyleTag({ content: CSS_FONDO });
        await p.evaluate(() => { const im = document.createElement('img'); im.id = '__fondo'; im.style.cssText = 'position:fixed;left:0;top:0;width:1080px;height:1920px;object-fit:cover;z-index:-1'; document.body.appendChild(im); });
      }
      await p.evaluate(() => document.fonts.ready);
      await p.evaluate(() => window.setup && window.setup());
      for (let i = w; i < frames; i += W){
        if (fondo) await p.evaluate(src => { const im = document.getElementById('__fondo'); im.src = src; return im.decode(); }, 'file://' + path.join(dirFondo, String(i + 1).padStart(5, '0') + '.jpg'));
        // render(hora de diseño, hora real): la hora real sirve para seguir la voz aunque la animación esté en pausa
        await p.evaluate(([x, r]) => window.render(x, r), [tiempo(i / FPS), i / FPS]);
        await p.screenshot({ type: 'jpeg', quality: 92, path: path.join(dir, String(i).padStart(5, '0') + '.jpg') });
      }
      await p.close();
    }));
  } finally { await b.close(); }
  if (process.env.DEBUG_TIEMPOS) console.log(`[tiempos] capturas: ${((Date.now() - t0) / 1000).toFixed(1)} s (${frames} fotogramas, ${W} navegadores${fondo ? ', con fondo' : ''})`);
  const t1 = Date.now();
  execFileSync(FF, ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(dir, '%05d.jpg'), '-vf', 'format=yuv420p', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-movflags', '+faststart', salida]);
  if (process.env.DEBUG_TIEMPOS) console.log(`[tiempos] ffmpeg: ${((Date.now() - t1) / 1000).toFixed(1)} s`);
  fs.rmSync(dir, { recursive: true, force: true }); fs.rmSync(dirFondo, { recursive: true, force: true });
}

// html: página completa con window.setup() (opcional) y window.render(t).
// eventos: sonidos [{ t, tipo }] (whoosh, tick, ding, riser, pop). snap: segundos de los que sacar una captura en vez del vídeo.
// narracion: [{ id, texto, en, limite }] frases de la voz en off (en = cuándo empieza, limite = el siguiente momento que no debe pisar).
// Acabado común de la versión 2 para todos los formatos: grano de película, viñeta y polvo en el aire, que se mueven con el
// tiempo del vídeo (los formatos que ya lo traen, como video-mesa2.js, se dejan como están).
const ACABADO = `<style>#__grain{position:fixed;inset:0;width:1080px;height:1920px;z-index:9998;opacity:.07;mix-blend-mode:overlay;pointer-events:none}
#__vig{position:fixed;inset:0;z-index:9997;pointer-events:none;background:radial-gradient(ellipse 75% 60% at 50% 50%,transparent 55%,rgba(0,0,0,.5) 100%)}
#__dust{position:fixed;inset:0;z-index:1;pointer-events:none}#__dust i{position:absolute;border-radius:50%;background:#ffd9c2;filter:blur(3px)}</style>
<script>(() => {
  const rnd = k => { const x = Math.sin(k*127.1 + 311.7)*43758.5453; return x - Math.floor(x); }, G = [];
  addEventListener('DOMContentLoaded', () => {
    const d = document.createElement('div'); d.id = '__dust'; d.innerHTML = '<i></i>'.repeat(22); document.body.appendChild(d);
    const v = document.createElement('div'); v.id = '__vig'; document.body.appendChild(v);
    const c = document.createElement('canvas'); c.id = '__grain'; c.width = 360; c.height = 640; document.body.appendChild(c);
    const cx = c.getContext('2d');
    for (let g = 0; g < 6; g++){ const im = cx.createImageData(360, 640);
      for (let i = 0; i < im.data.length; i += 4){ const x = rnd(g*1e6 + i)*255; im.data[i] = im.data[i+1] = im.data[i+2] = x; im.data[i+3] = 255; } G.push(im); }
    const r0 = window.render;
    window.render = (t, real) => { r0(t, real);
      document.querySelectorAll('#__dust i').forEach((d, i) => { const sz = 4 + rnd(i)*12, sp = 18 + rnd(i + 50)*40;
        d.style.width = d.style.height = sz + 'px'; d.style.opacity = (0.1 + rnd(i + 9)*0.22)*(0.6 + 0.4*Math.sin(t*1.3 + i));
        d.style.left = (rnd(i + 3)*1080 + Math.sin(t*0.4 + i)*40) + 'px'; d.style.top = (((rnd(i + 7)*1920 - t*sp) % 1920) + 1920) % 1920 + 'px'; });
      cx.putImageData(G[Math.floor(t*30) % G.length], 0, 0); };
  });
})();</script>`;

async function grabar({ html, nombre, total, eventos = [], snap, narracion = null }){
  // Enlace propio de la pieza (ENLACE=riopoker.es/v/17) en la pantalla final, en lugar de riopoker.es
  if (process.env.ENLACE) html = html.replace(/(<div class="url[^"]*"[^>]*>)riopoker\.es(<\/div>)/g, '$1' + process.env.ENLACE + '$2').replace('👆 enlace en la bio', '✍️ escríbelo en tu navegador');
  if (!html.includes('id="grain"') && process.env.SIN_ACABADO !== '1') html = html.replace('</head>', ACABADO + '</head>');
  // Música de fondo (generada, sin derechos de autor); baja sola cuando habla la voz. SIN_MUSICA=1 la quita.
  if (process.env.SIN_MUSICA !== '1') eventos = [...eventos, { t: 0, tipo: 'musica' }];
  const f = path.join(SALIDA, nombre + '.html');
  fs.writeFileSync(f, html);
  if (snap){
    const b = await chromium.launch();
    const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
    await p.route('**/*', r => fontRoute(r) || r.continue());
    await p.goto('file://' + f); await p.evaluate(() => document.fonts.ready); await p.evaluate(() => window.setup && window.setup());
    fs.mkdirSync(path.join(SALIDA, 'snap'), { recursive: true });
    for (const t of snap){ await p.evaluate(x => window.render(x), +t); await p.screenshot({ path: path.join(SALIDA, 'snap', `${nombre}-${t}.png`) }); }
    await b.close(); fs.rmSync(f); return null;
  }

  // 1. Voz en off (si falla o no está instalada, el vídeo sale igualmente, sin voz)
  let ajuste = { fuera: d => d, diseno: t => t, inicios: {}, total }, sintesis = null;
  if (narracion && voz.activa()){
    try {
      // Duración máxima del vídeo: si con la voz sale más largo, se acelera un poco la voz (hasta VELOCIDAD_MAX) y se vuelve a calcular
      const MAX = +process.env.DURACION_MAX || 25;
      let vel = +process.env.VELOCIDAD || voz.VELOCIDAD_BASE;
      for (;;){
        sintesis = voz.sintetizar(narracion, nombre, vel);
        ajuste = ajustar(narracion, sintesis.dur, total);
        if (ajuste.total <= MAX || vel >= voz.VELOCIDAD_MAX) break;
        console.log(`Voz en off: ${ajuste.total.toFixed(1)} s con velocidad ${vel.toFixed(2)}; pruebo más rápido`);
        vel = Math.min(voz.VELOCIDAD_MAX, +(vel + 0.1).toFixed(2));
      }
      if (process.env.DEBUG_VOZ) for (const fr of narracion) console.log(`[voz] ${fr.id}: empieza en ${ajuste.inicios[fr.id].toFixed(2)} s, dura ${sintesis.dur[fr.id]} s → termina ${(ajuste.inicios[fr.id] + sintesis.dur[fr.id]).toFixed(2)} s`);
      console.log(`Voz en off: ${narracion.length} frases, ${ajuste.pausas.length} pausa(s) añadida(s), el vídeo dura ${ajuste.total.toFixed(1)} s`);
    } catch (e){ console.warn('Sin voz en off: ' + e.message); sintesis = null; }
  }

  // La página recibe cuándo empieza y cuánto dura cada frase de la voz (hora real), para resaltar la palabra que se dice.
  if (sintesis){
    const VOZ = Object.fromEntries(narracion.filter(fr => sintesis.dur[fr.id] != null).map(fr => [fr.id, { i: ajuste.inicios[fr.id], d: sintesis.dur[fr.id] }]));
    fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace('<body>', '<body><script>window.__VOZ = ' + JSON.stringify(VOZ) + ';</script>'));
  }
  // 2. Fotogramas y vídeo mudo
  const fondo = elegirFondo();
  if (fondo) console.log('Fondo: ' + path.basename(fondo));
  const mudo = path.join(SALIDA, `${nombre}-mudo.mp4`);
  await renderizarMudo({ archivoHtml: f, total: ajuste.total, salida: mudo, tiempo: ajuste.diseno, fondo });
  fs.rmSync(f);

  // 3. Sonido: efectos en su sitio (ya con las pausas) y la voz encima
  const sonidos = eventos.map(e => ({ ...e, t: ajuste.fuera(e.t) }));
  if (sintesis) for (const fr of narracion) sonidos.push({ t: ajuste.inicios[fr.id], tipo: 'voz', archivo: sintesis.archivo(fr.id) });
  const wav = path.join(SALIDA, nombre + '.wav'), final = path.join(SALIDA, `rio-${nombre}.mp4`);
  execFileSync('python3', [path.join(__dirname, 'audio_eventos.py'), wav, String(ajuste.total), JSON.stringify(sonidos)]);
  unirAudio(mudo, wav, final, !!sintesis);
  if (sintesis) fs.rmSync(sintesis.dir, { recursive: true, force: true });
  return final;
}

module.exports = { grabar, renderizarMudo, elegirFondo, FUENTES };
