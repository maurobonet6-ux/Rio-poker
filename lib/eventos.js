// Analítica de producto de RÍO: qué hacen los usuarios dentro de la web, sin datos personales.
// La página manda cada evento a /api/track con un identificador anónimo y aleatorio del navegador
// (rio_aid), nunca el email. Complementa a lib/stats.js (totales por día y origen de las cuentas).
//
// En Redis (todo caduca solo):
//   rio:ev:<día>                → hash { evento: veces }                         (120 días)
//   rio:u:<día> · rio:u:<evento>:<día> → usuarios únicos (HyperLogLog)          (120 días)
//   rio:coh:<primer día>:<día>  → usuarios de esa «cohorte» activos ese día (retención) (120 días)
//   rio:nuevos:<día>            → identificadores que llegaron por primera vez ese día (30 días)
//   rio:j:<aid>                 → sus primeros 60 eventos «ms|evento|props» (30 días): el recorrido
//   rio:pagaron                 → identificadores que se hicieron PRO (para ver qué hicieron antes)
//   rio:cm:<contenido>          → hash { evento: veces } de quien llegó por ese contenido (/v/<id>)
//   rio:cu:<contenido>:<evento> → usuarios únicos de ese contenido por evento
//   rio:cids                    → contenidos con visitas
//   rio:leaks:<semana>          → errores anónimos «calle|posición|hizo>recomendado»: veces (400 días)

const { redisPipeline } = require('./redis');
const { dia } = require('./stats');

const EVENTOS = [
  'app_open', 'landing_view', 'signup_started', 'signup_completed',
  'analysis_started', 'analysis_completed', 'manual_analysis', 'screenshot_analysis', 'voice_analysis', 'history_import',
  'user_action_recorded', 'training_started', 'training_completed', 'practice_started', 'practice_completed',
  'progress_viewed', 'history_viewed', 'pro_clicked', 'checkout_started', 'subscription_created',
  'credit_pack_viewed', 'credit_pack_purchased', 'share_clicked'
];
// Eventos que también suman en las estadísticas de siempre (lib/stats.js).
const LEGADO = { analysis_completed: 'analisis', checkout_started: 'pago' };
// Nombres antiguos (/api/track?e=analisis) → evento nuevo.
const ANTIGUOS = { analisis: 'analysis_completed', pago: 'checkout_started' };

const DIA = 86400;
const TTL = 120 * DIA, TTL_CORTO = 30 * DIA, TTL_LEAKS = 400 * DIA;
const MAX_RECORRIDO = 60;
// Datos que puede llevar un evento: cortos y sin nada personal.
const PROPS = ['s', 'pos', 'rec', 'act', 'g', 'loss', 'via', 'topic', 'n', 'ok', 'plan', 'credits', 'route'];

const restarDias = (iso, n) => new Date(Date.parse(iso + 'T12:00:00Z') - n * DIA * 1000).toISOString().slice(0, 10);
const esDia = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s + 'T12:00:00Z'));
const aidValido = (s) => typeof s === 'string' && /^[a-z0-9]{8,32}$/.test(s);
const contenidoValido = (s) => typeof s === 'string' && /^[a-z0-9-]{1,24}$/.test(s);

// Semana ISO «AAAA-Www» de un día «AAAA-MM-DD».
function semana(iso){
  const d = new Date(Date.parse(iso + 'T12:00:00Z'));
  const jueves = new Date(d); jueves.setUTCDate(d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7));
  const enero4 = new Date(Date.UTC(jueves.getUTCFullYear(), 0, 4));
  const n = 1 + Math.round(((jueves - enero4) / (DIA * 1000) - 3 + ((enero4.getUTCDay() + 6) % 7)) / 7);
  return `${jueves.getUTCFullYear()}-W${String(n).padStart(2, '0')}`;
}

function limpiarProps(p){
  const o = {};
  if (!p || typeof p !== 'object') return o;
  for (const k of PROPS){
    const v = p[k];
    if (typeof v === 'number' && isFinite(v)) o[k] = Math.round(v * 10) / 10;
    else if (typeof v === 'boolean') o[k] = v;
    else if (typeof v === 'string' && v) o[k] = v.replace(/[^\w.+\-> ]/g, '').slice(0, 16);
  }
  return o;
}

// Los datos que llegan de la página → { e, aid, fd, c, p } limpios (o null si el evento no vale).
function normalizar(entrada){
  const x = entrada || {};
  const e = ANTIGUOS[x.e] || x.e;
  if (!EVENTOS.includes(e)) return null;
  const hoy = dia();
  const fd = esDia(x.fd) && x.fd <= hoy && x.fd >= restarDias(hoy, 400) ? x.fd : null;
  return { e, aid: aidValido(x.aid) ? x.aid : null, fd, c: contenidoValido(x.c) ? x.c : null, p: limpiarProps(x.p) };
}

// Las órdenes de Redis que guardan un evento (todas en una sola petición).
function ordenes({ e, aid, fd, c, p }, hoy = dia(), ahora = Date.now()){
  const cmds = [['HINCRBY', `rio:ev:${hoy}`, e, 1], ['EXPIRE', `rio:ev:${hoy}`, TTL]];
  if (aid){
    const u = `rio:u:${hoy}`, ue = `rio:u:${e}:${hoy}`, j = `rio:j:${aid}`;
    cmds.push(['PFADD', u, aid], ['EXPIRE', u, TTL], ['PFADD', ue, aid], ['EXPIRE', ue, TTL]);
    cmds.push(['RPUSH', j, `${ahora}|${e}|${JSON.stringify(p)}`], ['LTRIM', j, 0, MAX_RECORRIDO - 1], ['EXPIRE', j, TTL_CORTO]);
    if (fd){
      const coh = `rio:coh:${fd}:${hoy}`;
      cmds.push(['PFADD', coh, aid], ['EXPIRE', coh, TTL]);
      if (fd === hoy) cmds.push(['SADD', `rio:nuevos:${hoy}`, aid], ['EXPIRE', `rio:nuevos:${hoy}`, TTL_CORTO]);
    }
    if (e === 'analysis_completed' && p.n >= 2){
      const k = `rio:u:analysis_repeat:${hoy}`;
      cmds.push(['PFADD', k, aid], ['EXPIRE', k, TTL]);
    }
    if (e === 'subscription_created') cmds.push(['SADD', 'rio:pagaron', aid]);
    if (c) cmds.push(['PFADD', `rio:cu:${c}:${e}`, aid]);
  }
  if (c) cmds.push(['HINCRBY', `rio:cm:${c}`, e, 1], ['SADD', 'rio:cids', c]);
  if (e === 'user_action_recorded' && p.g && p.g !== 'ok' && p.act && p.rec){
    const k = `rio:leaks:${semana(hoy)}`;
    cmds.push(['HINCRBY', k, `${p.s ?? '-'}|${p.pos || '-'}|${p.act}>${p.rec}`, 1], ['EXPIRE', k, TTL_LEAKS]);
  }
  return cmds;
}

async function registrar(evento){
  const cmds = ordenes(evento);
  await redisPipeline(cmds);
}

// Upstash devuelve HGETALL como lista plana [campo, valor, campo, valor…].
function aObjeto(lista){
  const o = {};
  for (let i = 0; i + 1 < (lista || []).length; i += 2) o[lista[i]] = parseInt(lista[i + 1], 10) || 0;
  return o;
}

// Pasos del embudo (usuarios únicos que hicieron cada cosa en el periodo).
const EMBUDO = [['app_open', 'Abrieron RÍO'], ['signup_completed', 'Crearon cuenta o entraron'], ['analysis_completed', 'Analizaron una mano'],
  ['analysis_repeat', 'Analizaron 2 o más'], ['user_action_recorded', 'Dijeron qué hicieron'], ['training_completed', 'Entrenaron'],
  ['pro_clicked', 'Miraron PRO'], ['checkout_started', 'Fueron a pagar'], ['subscription_created', 'Se hicieron PRO']];
const USOS = ['manual_analysis', 'screenshot_analysis', 'voice_analysis', 'history_import', 'practice_completed', 'progress_viewed', 'history_viewed', 'credit_pack_viewed', 'share_clicked'];

// Resumen para el panel del administrador y para el equipo de marketing.
async function producto(numDias = 14, hoy = dia()){
  const dias = Array.from({ length: numDias }, (_, i) => restarDias(hoy, i));
  const d7 = dias.slice(0, 7), d30 = Array.from({ length: 30 }, (_, i) => restarDias(hoy, i));
  const sem = semana(hoy), semAnt = semana(restarDias(hoy, 7));
  const cmds = [], lee = [];
  const pedir = (cmd, fn) => { cmds.push(cmd); lee.push(fn); };
  const out = { dias: [], embudo7: [], embudo30: [], usos7: {}, activos: {}, retencion: [], contenidos: [], errores: {} };

  dias.forEach((d, i) => {
    out.dias[i] = { dia: d };
    pedir(['HGETALL', `rio:ev:${d}`], r => { out.dias[i].eventos = aObjeto(r); });
    pedir(['PFCOUNT', `rio:u:${d}`], r => { out.dias[i].usuarios = r || 0; });
  });
  for (const [periodo, lista] of [['embudo7', d7], ['embudo30', d30]]){
    EMBUDO.forEach(([e, nombre], i) => pedir(['PFCOUNT', ...lista.map(d => `rio:u:${e}:${d}`)], r => { out[periodo][i] = { evento: e, nombre, usuarios: r || 0 }; }));
  }
  USOS.forEach(e => pedir(['PFCOUNT', ...d7.map(d => `rio:u:${e}:${d}`)], r => { out.usos7[e] = r || 0; }));
  pedir(['PFCOUNT', `rio:u:${hoy}`], r => { out.activos.hoy = r || 0; });
  pedir(['PFCOUNT', ...d7.map(d => `rio:u:${d}`)], r => { out.activos.semana = r || 0; });
  pedir(['PFCOUNT', ...d30.map(d => `rio:u:${d}`)], r => { out.activos.mes = r || 0; });
  dias.forEach((fd, i) => {
    const fila = out.retencion[i] = { dia: fd };
    pedir(['PFCOUNT', `rio:coh:${fd}:${fd}`], r => { fila.nuevos = r || 0; });
    for (const [k, n] of [['d1', 1], ['d7', 7]]){
      const d = restarDias(fd, -n);
      if (d <= hoy) pedir(['PFCOUNT', `rio:coh:${fd}:${d}`], r => { fila[k] = r || 0; });
    }
  });
  pedir(['HGETALL', `rio:leaks:${sem}`], r => { out.errores.semana = aObjeto(r); });
  pedir(['HGETALL', `rio:leaks:${semAnt}`], r => { out.errores.anterior = aObjeto(r); });
  pedir(['SMEMBERS', 'rio:cids'], r => { out._cids = (r || []).slice(0, 200); });

  const res = await redisPipeline(cmds);
  res.forEach((r, i) => lee[i](r));

  // Contenidos: lo que hizo la gente que llegó por cada uno.
  const cids = out._cids; delete out._cids;
  if (cids.length){
    const r2 = await redisPipeline(cids.flatMap(c => [['HGETALL', `rio:cm:${c}`], ['PFCOUNT', `rio:cu:${c}:app_open`], ['PFCOUNT', `rio:cu:${c}:signup_completed`],
      ['PFCOUNT', `rio:cu:${c}:analysis_completed`], ['PFCOUNT', `rio:cu:${c}:subscription_created`]]));
    out.contenidos = cids.map((c, i) => ({ id: c, eventos: aObjeto(r2[i * 5]), usuarios: r2[i * 5 + 1] || 0, cuentas: r2[i * 5 + 2] || 0,
      analizaron: r2[i * 5 + 3] || 0, pro: r2[i * 5 + 4] || 0 })).sort((a, b) => b.usuarios - a.usuarios);
  }
  return out;
}

// Recorridos: qué hicieron los nuevos de hoy/ayer o los que pagaron (sin datos personales).
async function recorridos(tipo = 'nuevos', n = 10, hoy = dia()){
  const lim = Math.max(1, Math.min(+n || 10, 30));
  let aids = [];
  if (tipo === 'pagaron') aids = ((await redisPipeline([['SMEMBERS', 'rio:pagaron']]))[0] || []).slice(-lim);
  else {
    const r = await redisPipeline([['SRANDMEMBER', `rio:nuevos:${hoy}`, lim], ['SRANDMEMBER', `rio:nuevos:${restarDias(hoy, 1)}`, lim]]);
    aids = [...(r[0] || []), ...(r[1] || [])].slice(0, lim);
  }
  if (!aids.length) return [];
  const listas = await redisPipeline(aids.map(a => ['LRANGE', `rio:j:${a}`, 0, MAX_RECORRIDO - 1]));
  return aids.map((a, i) => {
    const filas = (listas[i] || []).map(x => { const [t, e, ...p] = String(x).split('|'); let props = {}; try { props = JSON.parse(p.join('|')); } catch (err) {} return { t: +t, e, p: props }; });
    const t0 = filas.length ? filas[0].t : 0;
    return { usuario: 'u' + (i + 1), eventos: filas.map(f => ({ seg: Math.round((f.t - t0) / 1000), e: f.e, p: f.p })) };
  });
}

module.exports = { EVENTOS, LEGADO, normalizar, ordenes, registrar, producto, recorridos, semana, limpiarProps };
