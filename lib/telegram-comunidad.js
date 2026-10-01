// Piezas del canal de Telegram que hacen que parezca vivo y que la gente vuelva: resultados de ayer, lo más difícil de la
// semana y el mensaje de bienvenida fijado. Las usa api/telegram.js (tipos resumen, semana y bienvenida).
//
// Cómo se sabe cuánta gente acertó: cada vez que se publica una encuesta se guarda en Redis su número de mensaje
// (clave telegram:poll:<día>:<tipo>). Al día siguiente se CIERRA la encuesta con stopPoll de Telegram, que devuelve los
// votos finales, y se publica el resultado junto a la respuesta correcta.

const SITE = 'https://riopoker.es';
const pct = x => Math.round(x * 100);
const recorta = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
const restarDia = (iso, n) => new Date(Date.parse(iso + 'T12:00:00Z') - n * 86400000).toISOString().slice(0, 10);

const CLAVE_POLL = (dia, tipo) => `telegram:poll:${dia}:${tipo}`;
const CLAVE_RESULTADOS = 'telegram:resultados';
const SERIES = [['quiz', '🃏 Mano del día'], ['mito', '🤔 ¿Mito o realidad?'], ['generada', '🧮 Cálculo del día'], ['encuesta', '🗳️ Encuesta']];

// Guarda lo que hace falta de una encuesta recién publicada para poder cerrarla y contar los votos mañana.
async function guardarEncuesta(redisCmd, dia, tipo, poll){
  try { await redisCmd(['SET', CLAVE_POLL(dia, tipo), JSON.stringify(poll), 'EX', 4 * 86400]); } catch(e){ /* sin Redis no hay resultados */ }
}

// Cierra las encuestas de ayer, cuenta los votos y publica los resultados. Devuelve { saltar } si no hay nada que contar.
async function resumenDeAyer({ tg, redisCmd, chat, dia, sitio = SITE }){
  const ayer = restarDia(dia, 1), lineas = [];
  for (const [tipo, etiqueta] of SERIES){
    let meta = null;
    try { const raw = await redisCmd(['GET', CLAVE_POLL(ayer, tipo)]); meta = raw && JSON.parse(raw); } catch(e){ return { saltar: 'sin Redis no se pueden contar los votos' }; }
    if (!meta) continue;
    let res;
    try { res = await tg('stopPoll', { chat_id: chat, message_id: meta.id }); } catch(e){ continue; } // ya cerrada o borrada
    const total = res.total_voter_count || 0;
    if (!total) continue;
    if (tipo === 'encuesta'){
      const ganadora = res.options.reduce((a, b) => (b.voter_count > a.voter_count ? b : a));
      lineas.push(`${etiqueta}: ${meta.q}\n   Ganó «${ganadora.text}» con el ${pct(ganadora.voter_count / total)} % (${total} votos)`);
    } else {
      const acierto = pct((res.options[meta.ok] || {}).voter_count / total || 0);
      lineas.push(`${etiqueta}: acertó el ${acierto} % (${total} votos)\n   ✅ ${meta.correcta}`);
      try {
        await redisCmd(['LPUSH', CLAVE_RESULTADOS, JSON.stringify({ dia: ayer, tipo, q: meta.q, p: acierto, total })]);
        await redisCmd(['LTRIM', CLAVE_RESULTADOS, 0, 99]); await redisCmd(['EXPIRE', CLAVE_RESULTADOS, 21 * 86400]);
      } catch(e){}
    }
  }
  if (!lineas.length) return { saltar: 'ayer nadie votó o no hay encuestas guardadas' };
  await tg('sendMessage', { chat_id: chat, text: `📊 Resultados de ayer\n\n${lineas.join('\n\n')}\n\n👉 ¿Y tú? Las de hoy ya están aquí, y puedes analizar tus manos gratis: ${sitio}/tg`, link_preview_options: { is_disabled: true } });
  return { publicado: lineas.length };
}

// Lo más difícil de los últimos 7 días, a partir de los resultados guardados por resumenDeAyer.
async function resumenSemana({ tg, redisCmd, chat, dia, sitio = SITE }){
  let filas = [];
  try { filas = (await redisCmd(['LRANGE', CLAVE_RESULTADOS, 0, -1]) || []).map(x => JSON.parse(x)); } catch(e){ return { saltar: 'sin Redis' }; }
  const desde = restarDia(dia, 7);
  filas = filas.filter(f => f.dia >= desde && f.total >= 3);
  if (filas.length < 3) return { saltar: 'todavía no hay suficientes resultados esta semana' };
  const dificiles = filas.slice().sort((a, b) => a.p - b.p).slice(0, 3);
  const facil = filas.slice().sort((a, b) => b.p - a.p)[0];
  const num = ['1️⃣', '2️⃣', '3️⃣'];
  const texto = `🏆 Lo más difícil de la semana\n\n${dificiles.map((f, i) => `${num[i]} ${recorta(f.q.replace(/\n/g, ' '), 110)}\n   Solo acertó el ${f.p} %`).join('\n\n')}\n\n🔥 La más fácil: ${recorta(facil.q.replace(/\n/g, ' '), 90)} (${facil.p} % acertó)\n\n💬 ¿Cuál te costó más? Cuéntalo en los comentarios.\n👉 ${sitio}/tg`;
  await tg('sendMessage', { chat_id: chat, text: texto, link_preview_options: { is_disabled: true } });
  return { publicado: dificiles.length };
}

// Mensaje de bienvenida: se publica una vez y se fija arriba del canal (el bot necesita el permiso «Fijar mensajes»).
const BIENVENIDA = `👋 ¡Bienvenido a RÍO Poker!

Aquí aprendes póker decidiendo: cada día preguntas, retos y vídeos para estudiar tus manos con números reales.

🗓️ Qué encontrarás cada día
📊 Por la mañana: los resultados de ayer
🤔 ¿Mito o realidad?
🧮 El cálculo del día (pot odds, outs, SPR…)
🗳️ La encuesta: cuéntanos cómo juegas
🃏 Por la tarde: la mano del día o un dato útil

🎬 Y vídeos de manos: ¿pagas o tiras? Piénsalo antes de ver la respuesta de RÍO.

💬 Responde en los comentarios (botón «Comentar» bajo cada publicación): aquí nadie se ríe de tus dudas.

🤖 Analiza tus propias manos gratis, con porcentajes reales:
${SITE}/tg

Herramienta de estudio · +18`;

async function bienvenida({ tg, chat }){
  const m = await tg('sendMessage', { chat_id: chat, text: BIENVENIDA, link_preview_options: { is_disabled: true } });
  let fijado = true;
  try { await tg('pinChatMessage', { chat_id: chat, message_id: m.message_id, disable_notification: true }); } catch(e){ fijado = e.message; }
  return { publicado: 1, fijado };
}

module.exports = { guardarEncuesta, resumenDeAyer, resumenSemana, bienvenida, BIENVENIDA, restarDia, CLAVE_POLL, CLAVE_RESULTADOS };
