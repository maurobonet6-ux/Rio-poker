// Cola de contenidos de RÍO (Content Engine): cada pieza (vídeo, carrusel, post de Telegram, artículo…)
// con su estado, desde la idea hasta que se publica, y lo que consigue. La usan n8n y el equipo de
// marketing automático (con la clave STATS_KEY) y el panel del administrador.
//
// En Redis:
//   rio:content:seq        → contador (el id de cada pieza: 1, 2, 3…; su enlace es riopoker.es/v/<id>)
//   rio:content:<id>       → la pieza en JSON
//   rio:content:all        → ids ordenados por fecha de creación
//   rio:content:st:<ESTADO> → ids en cada estado, ordenados por fecha de creación

const { redisCmd, redisPipeline } = require('./redis');

const ESTADOS = ['IDEA', 'GENERATING', 'READY_FOR_REVIEW', 'APPROVED', 'REJECTED', 'SCHEDULED', 'PUBLISHED', 'FAILED'];
const CATEGORIAS = ['decision', 'error', 'mano', 'educacion', 'rio', 'reto', 'actualidad', 'otro'];
const FUENTES = ['motor', 'errores', 'educacion', 'rio', 'actualidad', 'manual', 'otro'];
const PLATAFORMAS = ['tiktok', 'instagram', 'youtube', 'telegram', 'seo', 'otro'];
const FORMATOS = ['video', 'carrusel', 'post', 'encuesta', 'articulo', 'otro'];
const METRICAS = ['views', 'likes', 'comments', 'shares', 'saves', 'clicks', 'followers'];
// Campos de texto y su longitud máxima.
const TEXTOS = { topic: 120, hook: 200, title: 200, script: 6000, caption: 2400, cta: 200, seo_keyword: 120, notes: 2000, format_name: 60, why: 600, feedback: 600 };

const elegir = (v, lista, defecto) => (lista.includes(v) ? v : defecto);
const texto = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : undefined);
const fecha = (v) => (v && !isNaN(Date.parse(v)) ? new Date(v).toISOString() : undefined);

// Objeto JSON pequeño (datos de la mano, enlaces a los archivos…): se guarda tal cual si cabe.
function jsonPequeno(v, max = 8000){
  if (v === undefined || v === null) return undefined;
  try { const s = JSON.stringify(v); return s.length <= max ? JSON.parse(s) : undefined; } catch (e) { return undefined; }
}

// Lo que se puede poner o cambiar de una pieza, ya limpio.
function limpiar(d){
  const o = {};
  if (d.status !== undefined) o.status = elegir(String(d.status).toUpperCase(), ESTADOS, undefined);
  if (d.category !== undefined) o.category = elegir(d.category, CATEGORIAS, 'otro');
  if (d.source !== undefined) o.source = elegir(d.source, FUENTES, 'otro');
  if (d.platform !== undefined) o.platform = elegir(d.platform, PLATAFORMAS, 'otro');
  if (d.format !== undefined) o.format = elegir(d.format, FORMATOS, 'otro');
  for (const [k, max] of Object.entries(TEXTOS)) if (d[k] !== undefined) o[k] = texto(d[k], max);
  if (d.idea_id !== undefined) o.idea_id = texto(String(d.idea_id), 40);
  if (d.hand_data !== undefined) o.hand_data = jsonPequeno(d.hand_data);
  if (d.assets !== undefined) o.assets = jsonPequeno(d.assets);
  if (d.scheduled_at !== undefined) o.scheduled_at = fecha(d.scheduled_at) || null;
  if (d.experimento !== undefined) o.experimento = d.experimento === true;
  Object.keys(o).forEach(k => o[k] === undefined && delete o[k]);
  return o;
}

async function guardar(p){ await redisCmd(['SET', `rio:content:${p.id}`, JSON.stringify(p)]); }

async function obtener(id){
  const raw = await redisCmd(['GET', `rio:content:${String(id).replace(/[^0-9]/g, '')}`]);
  return raw ? JSON.parse(raw) : null;
}

async function crear(datos){
  const base = limpiar(datos || {});
  const id = String(await redisCmd(['INCR', 'rio:content:seq']));
  const ahora = new Date().toISOString();
  const p = { id, status: base.status || 'IDEA', category: 'otro', source: 'otro', platform: 'otro', format: 'otro', ...base,
    link: `https://riopoker.es/v/${id}`, metrics: {}, created_at: ahora, updated_at: ahora, published_at: null };
  const t = Date.parse(ahora);
  await redisPipeline([['SET', `rio:content:${id}`, JSON.stringify(p)], ['ZADD', 'rio:content:all', t, id], ['ZADD', `rio:content:st:${p.status}`, t, id]]);
  return p;
}

async function actualizar(id, cambios){
  const p = await obtener(id);
  if (!p) return null;
  const c = limpiar(cambios || {});
  const antes = p.status;
  Object.assign(p, c, { updated_at: new Date().toISOString() });
  if (c.status === 'PUBLISHED' && !p.published_at) p.published_at = fecha(cambios.published_at) || p.updated_at;
  if (c.status === 'APPROVED') p.approved_at = p.updated_at;
  const cmds = [['SET', `rio:content:${p.id}`, JSON.stringify(p)]];
  if (c.status && c.status !== antes) cmds.push(['ZREM', `rio:content:st:${antes}`, p.id], ['ZADD', `rio:content:st:${c.status}`, Date.parse(p.created_at), p.id]);
  await redisPipeline(cmds);
  return p;
}

// Métricas de la red (visualizaciones, likes…): se guardan las últimas que se conozcan.
async function metricas(id, m){
  const p = await obtener(id);
  if (!p) return null;
  for (const k of METRICAS) if (m && Number.isFinite(+m[k]) && +m[k] >= 0) p.metrics[k] = Math.round(+m[k]);
  p.metrics.updated_at = new Date().toISOString();
  p.updated_at = p.metrics.updated_at;
  await guardar(p);
  return p;
}

// Lo que hizo en RÍO la gente que llegó por cada pieza (sale de lib/eventos.js, por su enlace /v/<id>).
async function atribucion(ids){
  if (!ids.length) return {};
  const PASOS = ['app_open', 'signup_completed', 'analysis_completed', 'subscription_created'];
  const r = await redisPipeline(ids.flatMap(id => PASOS.map(e => ['PFCOUNT', `rio:cu:${id}:${e}`])));
  return Object.fromEntries(ids.map((id, i) => {
    const [usuarios, cuentas, analizaron, pro] = PASOS.map((_, j) => r[i * PASOS.length + j] || 0);
    return [id, { usuarios, cuentas, analizaron, pro }];
  }));
}

// Lista (las más nuevas primero), con lo que trajo cada una.
async function listar({ status, limit = 30, idea_id } = {}){
  const lim = Math.max(1, Math.min(+limit || 30, 100));
  const clave = status && ESTADOS.includes(String(status).toUpperCase()) ? `rio:content:st:${String(status).toUpperCase()}` : 'rio:content:all';
  const ids = (await redisCmd(['ZRANGE', clave, 0, idea_id ? 499 : lim - 1, 'REV'])) || [];
  if (!ids.length) return [];
  const raws = await redisPipeline(ids.map(id => ['GET', `rio:content:${id}`]));
  let piezas = raws.filter(Boolean).map(x => JSON.parse(x));
  if (idea_id) piezas = piezas.filter(p => p.idea_id === idea_id).slice(0, lim);
  const atr = await atribucion(piezas.map(p => p.id));
  return piezas.map(p => ({ ...p, resultados: atr[p.id] }));
}

// Cuántas hay en cada estado, por categoría y por red, y las de esta semana.
async function resumen(){
  const porEstado = {};
  const r = await redisPipeline(ESTADOS.map(s => ['ZCARD', `rio:content:st:${s}`]));
  ESTADOS.forEach((s, i) => { porEstado[s] = r[i] || 0; });
  const recientes = await listar({ limit: 100 });
  const hace7 = Date.now() - 7 * 86400000;
  const cuenta = (lista, campo) => lista.reduce((o, p) => { o[p[campo]] = (o[p[campo]] || 0) + 1; return o; }, {});
  return {
    porEstado, porCategoria: cuenta(recientes, 'category'), porPlataforma: cuenta(recientes, 'platform'),
    creadasSemana: recientes.filter(p => Date.parse(p.created_at) >= hace7).length,
    publicadasSemana: recientes.filter(p => p.published_at && Date.parse(p.published_at) >= hace7).length,
    mejores: recientes.filter(p => p.resultados && p.resultados.usuarios).sort((a, b) => (b.resultados.analizaron - a.resultados.analizaron) || (b.resultados.usuarios - a.resultados.usuarios)).slice(0, 10)
      .map(p => ({ id: p.id, platform: p.platform, category: p.category, hook: p.hook, resultados: p.resultados, metrics: p.metrics }))
  };
}

module.exports = { ESTADOS, CATEGORIAS, FUENTES, PLATAFORMAS, FORMATOS, METRICAS, crear, actualizar, obtener, listar, metricas, resumen, limpiar };
