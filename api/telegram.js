// Función serverless de Vercel: publica en el canal de Telegram. Tipos de publicación:
//   quiz     → pregunta del día (encuesta en modo cuestionario + enlace a la página que la explica), en orden
//   texto    → un dato útil de lib/telegram-textos.js con el enlace a la web, en orden
//   mito     → «¿Mito o realidad?» como cuestionario de 2 opciones, en orden (lib/poker-mitos.js)
//   generada → cuestionario con una pregunta de cuentas generada y CALCULADA (lib/poker-preguntas.js): nunca se repite
//   encuesta → encuesta de opinión sin respuesta correcta (lib/telegram-encuestas.js), en orden
// Sin parámetro, lo lanza el cron de vercel.json (cada día) y publica quiz o texto según el día de la semana.
// Con ?tipo=mito (o generada, encuesta, quiz, texto) lo lanza a otras horas GitHub Actions (.github/workflows/canal.yml),
// porque el plan de Vercel solo permite un horario al día.
//
// Variables de entorno necesarias en Vercel:
//   TELEGRAM_AVISO_CHAT (opcional) tu chat privado con el bot, para avisarte si se acaban las ideas nuevas
//   TELEGRAM_BOT_TOKEN  el token que da @BotFather (el bot tiene que ser administrador del canal)
//   TELEGRAM_CHANNEL    el canal, por ejemplo @riopoker
//   CRON_SECRET         cualquier clave larga; Vercel la manda al lanzar el cron (la misma va en GitHub para canal.yml)
// Opcional: UPSTASH_REDIS_REST_URL / _TOKEN, para no publicar dos veces lo mismo y llevar la cuenta en orden.

const QUIZZES = require('../lib/telegram-quizzes');
const TEXTOS = require('../lib/telegram-textos');
const ENCUESTAS = require('../lib/telegram-encuestas');
const { MITOS } = require('../lib/poker-mitos');
const { pregunta } = require('../lib/poker-preguntas');
const { redisCmd } = require('../lib/redis');

const SITE = 'https://riopoker.es';
const START = Date.UTC(2026, 9, 1); // sin Redis, la numeración cuenta días desde el 1 de octubre de 2026

// Fecha de hoy en España (AAAA-MM-DD).
function today(now = new Date()){
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
const diasDesdeInicio = day => Math.max(1, Math.floor((Date.parse(day + 'T00:00:00Z') - START) / 86400000) + 1);

// La publicación nº 1 es la primera de la lista, la nº 2 la segunda… Si el número pasa del final, `agotado` (no se repite nada).
const enLista = (lista, number) => ({ number, ...lista[(((number - 1) % lista.length) + lista.length) % lista.length] });
const quizNumber = number => enLista(QUIZZES, number);
const textoNumber = number => enLista(TEXTOS, number);
const quizForDay = day => quizNumber(diasDesdeInicio(day));

// Qué toca cada día de la semana (0 = domingo … 6 = sábado) cuando el cron diario no trae tipo.
const TIPOS = ['quiz', 'texto', 'quiz', 'texto', 'quiz', 'texto', 'quiz'];
const tipoDelDia = day => TIPOS[new Date(day + 'T12:00:00Z').getUTCDay()];

// Cada tipo: qué lista usa, cómo se numera en Redis y cómo se publica.
const sinMarcas = s => String(s).replace(/\*/g, '');
const recorta = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
// Telegram marca en verde o rojo lo que eliges y enseña la explicación (la misma para todos, el canal es anónimo).
// Por eso la explicación empieza diciendo cuál era la correcta, y las opciones llevan letra para poder nombrarla.
const LETRAS = 'ABCDEFGHIJ';
const conLetras = opts => opts.map((o, i) => `${LETRAS[i]}) ${o}`);
const explicacion = (ok, opts, why) => recorta(`✅ La correcta es la ${LETRAS[ok]}: ${opts[ok]}\n${why}`, 200);

const TIPOS_VALIDOS = {
  quiz: { lista: QUIZZES, clave: 'telegram:numero', publicar: async (tg, chat, q) => {
    await tg('sendPoll', { chat_id: chat, question: `🃏 Mano del día #${q.number}\n${q.q}`, options: conLetras(q.opts).map(text => ({ text })), type: 'quiz', correct_option_id: q.ok, explanation: explicacion(q.ok, q.opts, q.why), is_anonymous: true });
    await tg('sendMessage', { chat_id: chat, text: `📖 ¿Has votado? Aquí lo tienes explicado a fondo:\n${SITE}${q.link}?utm_source=telegram`, link_preview_options: { is_disabled: true } });
  } },
  texto: { lista: TEXTOS, clave: 'telegram:textos', publicar: async (tg, chat, t) => {
    await tg('sendMessage', { chat_id: chat, text: `${t.texto}\n\n👉 ${SITE}${t.link}?utm_source=telegram` });
  } },
  mito: { lista: MITOS, clave: 'telegram:mitos', publicar: async (tg, chat, m) => {
    await tg('sendPoll', { chat_id: chat, question: recorta(`🤔 ¿Mito o realidad?\n${sinMarcas(m.dice)}`, 300), options: [{ text: 'Es un mito' }, { text: 'Es realidad' }], type: 'quiz', correct_option_id: m.verdad ? 1 : 0, explanation: recorta(`✅ Es ${m.verdad ? 'REALIDAD' : 'un MITO'}.\n${sinMarcas(m.why)}`, 200), is_anonymous: true });
  } },
  encuesta: { lista: ENCUESTAS, clave: 'telegram:encuestas', publicar: async (tg, chat, e) => {
    await tg('sendPoll', { chat_id: chat, question: `🗳️ ${e.q}`, options: e.opts.map(text => ({ text })), type: 'regular', is_anonymous: true });
  } },
  // Pregunta nueva cada vez: no lleva cuenta ni se agota, porque la respuesta se calcula.
  generada: { lista: null, publicar: async (tg, chat) => {
    const q = pregunta();
    await tg('sendPoll', { chat_id: chat, question: recorta(`🧮 ${sinMarcas(q.q)}`, 300), options: conLetras(q.opts.map(o => recorta(sinMarcas(o), 90))).map(text => ({ text })), type: 'quiz', correct_option_id: q.ok, explanation: explicacion(q.ok, q.opts.map(sinMarcas), sinMarcas(q.why)), is_anonymous: true });
  } },
};

// Si se acaba una lista, NO se repite ninguna: no se publica y (si hay TELEGRAM_AVISO_CHAT, tu chat privado
// con el bot) se te avisa de que hay que añadir ideas nuevas.
async function agotado(res, que){
  const aviso = process.env.TELEGRAM_AVISO_CHAT;
  try {
    const primera = await redisCmd(['SET', `telegram:aviso:${que}`, '1', 'NX', 'EX', 604800]);
    if (aviso && primera !== null) await tg('sendMessage', { chat_id: aviso, text: `⚠️ Se han acabado las ideas nuevas de tipo "${que}" del canal. No se repite ninguna: añade más y vuelve a publicarlas.` });
  } catch(e){ /* el aviso es opcional */ }
  res.status(200).json({ ok: true, skipped: `sin ideas nuevas de tipo ${que}` });
}

async function tg(method, body){
  const r = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });
  const data = await r.json();
  if (!data.ok) throw new Error(`Telegram ${method}: ${data.description || r.status}`);
  return data.result;
}

async function handler(req, res){
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`){ res.status(401).json({ error: 'No autorizado' }); return; }
  const chat = process.env.TELEGRAM_CHANNEL;
  if (!process.env.TELEGRAM_BOT_TOKEN || !chat){ res.status(500).json({ error: 'Faltan TELEGRAM_BOT_TOKEN o TELEGRAM_CHANNEL en Vercel' }); return; }

  const day = today();
  const pedido = String((req.query && req.query.tipo) || '');
  if (pedido && !TIPOS_VALIDOS[pedido]){ res.status(400).json({ error: 'Tipo no válido', validos: Object.keys(TIPOS_VALIDOS) }); return; }
  const tipo = pedido || tipoDelDia(day);
  const def = TIPOS_VALIDOS[tipo];

  // Vercel o GitHub pueden lanzar lo mismo dos veces: con Redis, solo se publica la primera de cada día y tipo.
  const marca = `telegram:publicado:${day}:${tipo}`;
  try {
    const first = await redisCmd(['SET', marca, '1', 'NX', 'EX', 172800]);
    if (first === null){ res.status(200).json({ ok: true, skipped: `ya publicado hoy (${tipo})` }); return; }
  } catch(e){ /* sin Redis: publica igualmente */ }
  const soltar = async n => { try { await redisCmd(['DEL', marca]); if (n && def.clave) await redisCmd(['DECR', def.clave]); } catch(_){} }; // así se puede reintentar

  // Con Redis, la numeración empieza en #1 el primer día que publica el bot; sin Redis, cuenta días.
  let n = null, item = null;
  if (def.lista){
    try { n = await redisCmd(['INCR', def.clave]); } catch(e){}
    const number = n || diasDesdeInicio(day);
    if (number > def.lista.length){ await soltar(n); await agotado(res, tipo); return; }
    item = enLista(def.lista, number);
  }
  try {
    await def.publicar(tg, chat, item);
  } catch(e){
    await soltar(n);
    console.error('No se pudo publicar en Telegram:', e.message); // se ve en Vercel → Logs
    res.status(502).json({ error: e.message }); return;
  }
  res.status(200).json({ ok: true, day, tipo, number: item ? item.number : undefined });
}

module.exports = handler;
module.exports.quizForDay = quizForDay;
module.exports.quizNumber = quizNumber;
module.exports.tipoDelDia = tipoDelDia;
module.exports.textoNumber = textoNumber;
module.exports.today = today;
module.exports.TIPOS_VALIDOS = TIPOS_VALIDOS;
