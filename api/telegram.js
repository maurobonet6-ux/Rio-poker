// Función serverless de Vercel: publica en el canal de Telegram según el día de la semana (hora de España):
//   quiz  → pregunta del día (encuesta en modo cuestionario + enlace a la página que la explica)
//   texto → un dato útil de lib/telegram-textos.js con el enlace a la web
//   video → no publica nada aquí: el vídeo lo manda GitHub Actions (.github/workflows/video.yml)
// La lanza cada día el cron de vercel.json; también se puede lanzar a mano desde
// Vercel → Settings → Cron Jobs → Run.
//
// Variables de entorno necesarias en Vercel:
//   TELEGRAM_AVISO_CHAT (opcional) tu chat privado con el bot, para avisarte si se acaban las ideas nuevas
//   TELEGRAM_BOT_TOKEN  el token que da @BotFather (el bot tiene que ser administrador del canal)
//   TELEGRAM_CHANNEL    el canal, por ejemplo @riopoker
//   CRON_SECRET         cualquier clave larga; Vercel la manda al lanzar el cron
// Opcional: UPSTASH_REDIS_REST_URL / _TOKEN, para no publicar dos veces el mismo día.

const QUIZZES = require('../lib/telegram-quizzes');
const TEXTOS = require('../lib/telegram-textos');
const { redisCmd } = require('../lib/redis');

const SITE = 'https://riopoker.es';
const START = Date.UTC(2026, 9, 1); // sin Redis, la numeración cuenta días desde el 1 de octubre de 2026

// Fecha de hoy en España (AAAA-MM-DD).
function today(now = new Date()){
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
// La publicación nº 1 es la primera pregunta de la lista, la nº 2 la segunda… y al acabar vuelve a empezar.
function quizNumber(number){
  const i = (((number - 1) % QUIZZES.length) + QUIZZES.length) % QUIZZES.length;
  return { number, ...QUIZZES[i] };
}
const quizForDay = day => quizNumber(Math.max(1, Math.floor((Date.parse(day + 'T00:00:00Z') - START) / 86400000) + 1));

// Qué toca cada día de la semana (0 = domingo … 6 = sábado). Los jueves y sábados toca vídeo.
const TIPOS = ['quiz', 'quiz', 'texto', 'quiz', 'video', 'texto', 'video'];
const tipoDelDia = day => TIPOS[new Date(day + 'T12:00:00Z').getUTCDay()];
// Mismo reparto en orden y vuelta a empezar, como las preguntas.
function textoNumber(number){
  const i = (((number - 1) % TEXTOS.length) + TEXTOS.length) % TEXTOS.length;
  return { number, ...TEXTOS[i] };
}
const textoForDay = day => textoNumber(Math.max(1, Math.floor((Date.parse(day + 'T00:00:00Z') - START) / 86400000) + 1));

// Si se acaba la lista de preguntas o de textos, NO se repite ninguna: no se publica y (si hay
// TELEGRAM_AVISO_CHAT, tu chat privado con el bot) se te avisa de que hay que añadir ideas nuevas.
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
  const tipo = tipoDelDia(day);
  if (tipo === 'video'){ res.status(200).json({ ok: true, skipped: 'hoy toca vídeo: lo publica GitHub Actions' }); return; }
  // Vercel puede lanzar el cron dos veces: si hay Redis, solo publica la primera.
  try {
    const first = await redisCmd(['SET', `telegram:publicado:${day}`, '1', 'NX', 'EX', 172800]);
    if (first === null){ res.status(200).json({ ok: true, skipped: 'ya publicado hoy' }); return; }
  } catch(e){ /* sin Redis: publica igualmente */ }

  if (tipo === 'texto'){
    let n = null;
    try { n = await redisCmd(['INCR', 'telegram:textos']); } catch(e){}
    const t = n ? textoNumber(n) : textoForDay(day);
    if (t.number > TEXTOS.length){
      try { await redisCmd(['DEL', `telegram:publicado:${day}`]); if (n) await redisCmd(['DECR', 'telegram:textos']); } catch(_){}
      await agotado(res, 'texto'); return;
    }
    try {
      await tg('sendMessage', { chat_id: chat, text: `${t.texto}\n\n👉 ${SITE}${t.link}?utm_source=telegram` });
    } catch(e){
      try { await redisCmd(['DEL', `telegram:publicado:${day}`]); if (n) await redisCmd(['DECR', 'telegram:textos']); } catch(_){}
      console.error('No se pudo publicar en Telegram:', e.message);
      res.status(502).json({ error: e.message }); return;
    }
    res.status(200).json({ ok: true, day, tipo, number: t.number });
    return;
  }

  // Con Redis, la numeración empieza en #1 el primer día que publica el bot; sin Redis, cuenta días.
  let number = null;
  try { number = await redisCmd(['INCR', 'telegram:numero']); } catch(e){}
  const quiz = number ? quizNumber(number) : quizForDay(day);
  if (quiz.number > QUIZZES.length){
    try { await redisCmd(['DEL', `telegram:publicado:${day}`]); if (number) await redisCmd(['DECR', 'telegram:numero']); } catch(_){}
    await agotado(res, 'quiz'); return;
  }
  try {
    await tg('sendPoll', {
      chat_id: chat, question: `🃏 Mano del día #${quiz.number}\n${quiz.q}`,
      options: quiz.opts.map(text => ({ text })), type: 'quiz', correct_option_id: quiz.ok,
      explanation: quiz.why, is_anonymous: true
    });
    await tg('sendMessage', {
      chat_id: chat, text: `📖 ¿Has votado? Aquí lo tienes explicado a fondo:\n${SITE}${quiz.link}?utm_source=telegram`,
      link_preview_options: { is_disabled: true }
    });
  } catch(e){
    try { await redisCmd(['DEL', `telegram:publicado:${day}`]); if (number) await redisCmd(['DECR', 'telegram:numero']); } catch(_){} // así se puede reintentar
    console.error('No se pudo publicar en Telegram:', e.message); // se ve en Vercel → Logs
    res.status(502).json({ error: e.message }); return;
  }
  res.status(200).json({ ok: true, day, tipo, number: quiz.number });
}

module.exports = handler;
module.exports.quizForDay = quizForDay;
module.exports.quizNumber = quizNumber;
module.exports.tipoDelDia = tipoDelDia;
module.exports.textoNumber = textoNumber;
module.exports.today = today;
