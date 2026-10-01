// Plan del día del equipo de marketing: lo comprueba y lo deja listo para producirlo.
// Lo usan la rutina diaria (para comprobarlo antes de mandarlo) y .github/workflows/equipo.yml.
//
//   node marketing/equipo/plan.js comprobar plan.json   → dice si está bien o qué falla
//   PLAN='{…}' node marketing/equipo/plan.js normalizar → el plan limpio (JSON) en la salida
//
// Formato del plan (ver GUIA.md): { fecha, resumen, fuentes[], piezas[] }. Cada pieza:
//   platform: tiktok | instagram | youtube | telegram | seo
//   format:   video | carrusel | post | encuesta | articulo
//   category, source, idea_id, topic, hook, title, script, caption, cta, seo_keyword, why, experimento
//   video:    { pedido }   (lo que entiende marketing/videos/generar.js: «concurso», «mito», «river», «Ah Kd | Qs 8c 3h | 18 8» o un JSON de mano)
//   carrusel: { diapositivas: [{ titulo, texto }] }   (de 3 a 8)
//   encuesta: { pregunta, opciones: [], correcta? }  (solo Telegram)

const { CATEGORIAS, FUENTES, PLATAFORMAS, FORMATOS } = require('../../lib/contenido');

const MAX_PIEZAS = 8;
const MAX = { hook: 200, title: 200, script: 6000, caption: 2400, cta: 200, topic: 120, seo_keyword: 120, why: 600, idea_id: 40 };
// Qué formatos tiene sentido publicar en cada red.
const FORMATOS_RED = {
  tiktok: ['video'], youtube: ['video'], instagram: ['video', 'carrusel'],
  telegram: ['video', 'carrusel', 'post', 'encuesta'], seo: ['articulo']
};

function texto(v, max){ return typeof v === 'string' ? v.trim().slice(0, max) : ''; }

// Devuelve { plan, errores }. Las piezas con errores se quitan; si no queda ninguna, el plan no vale.
function normalizar(entrada){
  const errores = [];
  let p = entrada;
  if (typeof p === 'string'){ try { p = JSON.parse(p); } catch (e) { return { plan: null, errores: ['El plan no es un JSON válido: ' + e.message] }; } }
  if (!p || typeof p !== 'object' || !Array.isArray(p.piezas)) return { plan: null, errores: ['Falta la lista «piezas».'] };
  if (p.piezas.length > MAX_PIEZAS) errores.push(`Hay ${p.piezas.length} piezas: se usan las ${MAX_PIEZAS} primeras.`);
  const piezas = [];
  p.piezas.slice(0, MAX_PIEZAS).forEach((x, i) => {
    const n = i + 1, fallos = [];
    const platform = PLATAFORMAS.includes(x.platform) ? x.platform : null;
    const format = FORMATOS.includes(x.format) ? x.format : null;
    if (!platform) fallos.push(`red «${x.platform}» no válida`);
    if (!format) fallos.push(`formato «${x.format}» no válido`);
    if (platform && format && FORMATOS_RED[platform] && !FORMATOS_RED[platform].includes(format)) fallos.push(`${format} no se publica en ${platform}`);
    const pieza = {
      n, platform, format,
      category: CATEGORIAS.includes(x.category) ? x.category : 'otro',
      source: FUENTES.includes(x.source) ? x.source : 'otro',
      experimento: x.experimento === true
    };
    for (const [k, max] of Object.entries(MAX)) pieza[k] = texto(x[k], max);
    if (!pieza.hook) fallos.push('falta el gancho (hook)');
    if (format !== 'encuesta' && !pieza.caption) fallos.push('falta el texto de la publicación (caption)');
    if (format === 'video'){
      const pedido = x.video && x.video.pedido;
      if (!pedido) fallos.push('falta video.pedido');
      else pieza.video = { pedido: typeof pedido === 'string' ? pedido.trim().slice(0, 2000) : JSON.stringify(pedido).slice(0, 2000) };
    }
    if (format === 'carrusel'){
      const d = (x.carrusel && Array.isArray(x.carrusel.diapositivas) ? x.carrusel.diapositivas : [])
        .map(s => ({ titulo: texto(s && s.titulo, 90), texto: texto(s && s.texto, 320) })).filter(s => s.titulo || s.texto);
      if (d.length < 3 || d.length > 8) fallos.push('el carrusel necesita de 3 a 8 diapositivas');
      pieza.carrusel = { diapositivas: d.slice(0, 8) };
    }
    if (format === 'encuesta'){
      const e = x.encuesta || {};
      const opciones = (Array.isArray(e.opciones) ? e.opciones : []).map(o => texto(o, 100)).filter(Boolean).slice(0, 10);
      if (!texto(e.pregunta, 300) || opciones.length < 2) fallos.push('la encuesta necesita pregunta y 2 o más opciones');
      pieza.encuesta = { pregunta: texto(e.pregunta, 300), opciones, correcta: Number.isInteger(e.correcta) && e.correcta >= 0 && e.correcta < opciones.length ? e.correcta : null };
    }
    if (fallos.length) errores.push(`Pieza ${n}: ${fallos.join('; ')}.`);
    else piezas.push(pieza);
  });
  if (!piezas.length) return { plan: null, errores: errores.length ? errores : ['El plan no tiene piezas.'] };
  const plan = {
    fecha: /^\d{4}-\d{2}-\d{2}$/.test(p.fecha || '') ? p.fecha : new Date().toISOString().slice(0, 10),
    resumen: texto(p.resumen, 800),
    fuentes: (Array.isArray(p.fuentes) ? p.fuentes : []).filter(u => typeof u === 'string' && /^https?:\/\//.test(u)).slice(0, 15),
    piezas
  };
  return { plan, errores };
}

module.exports = { normalizar, FORMATOS_RED, MAX_PIEZAS };

if (require.main === module){
  const [orden, archivo] = process.argv.slice(2);
  const entrada = archivo ? require('fs').readFileSync(archivo, 'utf8') : (process.env.PLAN || '');
  const { plan, errores } = normalizar(entrada);
  if (orden === 'normalizar'){
    errores.forEach(e => console.error('⚠️ ' + e));
    if (!plan) process.exit(2);
    process.stdout.write(JSON.stringify(plan));
  } else {
    if (!errores.length) console.log(`✅ Plan correcto: ${plan.piezas.length} piezas.`);
    errores.forEach(e => console.log('⚠️ ' + e));
    process.exit(plan ? 0 : 2);
  }
}
