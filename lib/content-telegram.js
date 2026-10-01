// Aprobación de contenidos por Telegram. Cada pieza llega a tu chat privado como una «tarjeta» con
// ✅ Publicar · ❌ Descartar · ✏️ Editar · 🔄 Regenerar. n8n (que recibe los botones del bot) reenvía
// cada pulsación y cada respuesta a /api/content { accion: 'telegram', update } y aquí se decide qué hacer.
//
//   ✅ en una pieza de Telegram → se publica sola en el canal.  ✅ en TikTok/Instagram/YouTube → queda aprobada y
//      te llega el texto listo para pegar, con «📤 Ya está subido» para marcarla como publicada.
//   ❌ → descartada; si respondes al mensaje con el motivo, el equipo lo tiene en cuenta.
//   ✏️ → respondes con lo que quieres cambiar y la IA reescribe los textos (los números no se tocan).
//   🔄 → la IA escribe otra versión de los textos. (El vídeo no se vuelve a hacer: para otro vídeo, descártalo y el
//      equipo propondrá otro.)
//
// Necesita en Vercel: TELEGRAM_BOT_TOKEN (el mismo bot que manda las tarjetas), TELEGRAM_CHANNEL y, para ✏️ y 🔄,
// ANTHROPIC_API_KEY.

const { redisCmd } = require('./redis');
const C = require('./contenido');

const RED = { tiktok: '🎵 TikTok', instagram: '📸 Instagram', youtube: '▶️ YouTube Shorts', telegram: '💬 Canal de Telegram', seo: '🔎 Web (SEO)', otro: 'Otro' };
const FORMATO = { video: 'vídeo', carrusel: 'carrusel', post: 'post', encuesta: 'encuesta', articulo: 'artículo', otro: '' };
const MODELO = 'claude-sonnet-5'; // el mismo que usa RÍO para entender las manos contadas (api/parse-hand.js)
const ENLAZABLES = ['telegram', 'youtube', 'seo']; // redes donde un enlace en el texto se puede pulsar

const esc = (s) => String(s || '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const enlace = (p) => `https://riopoker.es/v/${p.id}`;

// El texto tal cual se publica: {enlace} se cambia por el enlace propio de la pieza; en las redes con
// enlaces pulsables se añade al final si no está.
function textoPublicar(p){
  let t = String(p.caption || '').replace(/\{enlace\}/g, enlace(p));
  if (ENLAZABLES.includes(p.platform) && !t.includes(enlace(p))) t += `\n\n👉 ${enlace(p)}`;
  return t.trim();
}

function botones(p){
  return { inline_keyboard: [
    [{ text: p.platform === 'telegram' ? '✅ Publicar' : '✅ Aprobar', callback_data: `c:${p.id}:ok` }, { text: '❌ Descartar', callback_data: `c:${p.id}:no` }],
    [{ text: '✏️ Editar', callback_data: `c:${p.id}:edit` }, { text: '🔄 Regenerar', callback_data: `c:${p.id}:regen` }]
  ] };
}

// La tarjeta de revisión de una pieza (HTML de Telegram, < 4096 caracteres).
function tarjeta(p, { nueva = false } = {}){
  const partes = [
    `${RED[p.platform] || p.platform} · ${FORMATO[p.format] || p.format} · <b>#${esc(p.id)}</b>${p.experimento ? ' · 🧪 prueba' : ''}${nueva ? ' · ✨ versión nueva' : ''}`,
    `<b>${esc(p.hook)}</b>`
  ];
  if (p.format === 'encuesta' && p.assets && p.assets.encuesta) partes.push(`📊 ${esc(p.assets.encuesta.pregunta)}\n${p.assets.encuesta.opciones.map((o, i) => `${i === p.assets.encuesta.correcta ? '✔︎' : '•'} ${esc(o)}`).join('\n')}`);
  if (p.caption) partes.push(`<b>Texto para publicar:</b>\n${esc(textoPublicar(p)).slice(0, 2400)}`);
  if (p.script && p.format !== 'video') partes.push(`<b>Guion:</b>\n${esc(p.script).slice(0, 700)}`);
  if (p.seo_keyword) partes.push(`<b>Búsqueda:</b> ${esc(p.seo_keyword)}`);
  if (p.why) partes.push(`<i>Por qué: ${esc(p.why)}</i>`);
  return partes.join('\n\n').slice(0, 4000);
}

async function tg(method, body){
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('Falta TELEGRAM_BOT_TOKEN');
  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const d = await r.json();
  if (!d.ok) throw new Error(d.description || 'Error de Telegram');
  return d.result;
}

// Qué pieza corresponde a un mensaje (para entender las respuestas a las tarjetas y avisos).
const claveMsg = (chat, msg) => `rio:content:msg:${chat}:${msg}`;
async function vincular(chat, msg, id, motivo){ await redisCmd(['SET', claveMsg(chat, msg), JSON.stringify({ id, motivo }), 'EX', 30 * 86400]); }
async function vinculado(chat, msg){ const r = await redisCmd(['GET', claveMsg(chat, msg)]); return r ? JSON.parse(r) : null; }

async function mandarTarjeta(chat, p, opciones = {}){
  const m = await tg('sendMessage', { chat_id: chat, text: tarjeta(p, opciones), parse_mode: 'HTML', link_preview_options: { is_disabled: true }, reply_markup: botones(p),
    ...(p.assets && p.assets.telegram && p.assets.telegram.media && p.assets.telegram.media[0] ? { reply_parameters: { message_id: p.assets.telegram.media[0], allow_sending_without_reply: true } } : {}) });
  await vincular(chat, m.message_id, p.id, 'tarjeta');
  return m;
}

// Publica en el canal de Telegram lo que se mandó a tu chat (vídeo, fotos, texto o encuesta).
async function publicarEnCanal(p){
  const canal = process.env.TELEGRAM_CHANNEL;
  if (!canal) throw new Error('Falta TELEGRAM_CHANNEL');
  const t = (p.assets && p.assets.telegram) || {};
  const texto = textoPublicar(p);
  if (p.format === 'encuesta' && p.assets && p.assets.encuesta){
    const e = p.assets.encuesta;
    await tg('sendPoll', { chat_id: canal, question: e.pregunta.slice(0, 300), options: e.opciones.map(o => ({ text: o })), is_anonymous: true,
      ...(e.correcta !== null && e.correcta !== undefined ? { type: 'quiz', correct_option_id: e.correcta } : {}) });
    if (texto) await tg('sendMessage', { chat_id: canal, text: texto });
    return;
  }
  const media = Array.isArray(t.media) ? t.media : [];
  if (media.length === 1) await tg('copyMessage', { chat_id: canal, from_chat_id: t.chat, message_id: media[0], caption: texto.slice(0, 1024) });
  else if (media.length > 1){
    await tg('copyMessages', { chat_id: canal, from_chat_id: t.chat, message_ids: media });
    if (texto) await tg('sendMessage', { chat_id: canal, text: texto });
  } else await tg('sendMessage', { chat_id: canal, text: texto });
}

// La IA reescribe los textos de una pieza (instrucciones = lo que pediste, o vacío para «otra versión»).
async function reescribir(p, instrucciones){
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('Falta ANTHROPIC_API_KEY en Vercel');
  const pieza = { red: p.platform, formato: p.format, categoria: p.category, gancho: p.hook, texto: p.caption, cta: p.cta, guion: p.script, datos_de_la_mano: p.hand_data };
  const prompt = `Eres el guionista de RÍO, un coach de póker con IA en español (riopoker.es). Reescribe los textos de esta pieza de contenido para ${RED[p.platform] || p.platform}.
${instrucciones ? `Cambios que pide el dueño: «${instrucciones}»` : 'Escribe una versión distinta y mejor: otro gancho y otro enfoque, con la misma idea.'}

Reglas: español natural y directo, nada robótico; gancho fuerte pero sin engañar; NO cambies ni inventes números ni porcentajes (usa solo los que ya están);
no prometas ganar dinero; si el texto llevaba {enlace}, mantenlo. La llamada a la acción suele ser «Analiza tu mano gratis en RÍO» o una variante natural.

Pieza actual (JSON):
${JSON.stringify(pieza)}

Responde SOLO con un JSON: {"hook": "...", "caption": "...", "cta": "...", "script": "..."} (deja "script" igual si es un vídeo ya hecho).`;
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: MODELO, max_tokens: 2000, messages: [{ role: 'user', content: prompt }] })
  });
  const d = await r.json();
  if (!r.ok) throw new Error((d && d.error && d.error.message) || 'Error de la IA');
  const txt = (d.content || []).map(c => c.text || '').join('');
  const m = txt.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('La IA no devolvió el formato esperado');
  const nuevo = JSON.parse(m[0]);
  const cambios = {};
  for (const k of ['hook', 'caption', 'cta']) if (typeof nuevo[k] === 'string' && nuevo[k].trim()) cambios[k] = nuevo[k];
  if (p.format !== 'video' && typeof nuevo.script === 'string' && nuevo.script.trim()) cambios.script = nuevo.script;
  return cambios;
}

const conFeedback = (p, txt) => [p.feedback, txt].filter(Boolean).join(' | ').slice(-600);

// Una actualización de Telegram reenviada por n8n → lo que hay que hacer. Devuelve { ok, texto } (texto = aviso corto).
async function procesar(update){
  const cq = update && update.callback_query;
  if (cq){
    const m = /^c:(\d+):(ok|no|edit|regen|pub)$/.exec(cq.data || '');
    if (!m) return { ok: false, texto: 'Botón desconocido' };
    const [, id, accion] = m;
    const chat = cq.message && cq.message.chat && cq.message.chat.id;
    const responder = (text) => tg('answerCallbackQuery', { callback_query_id: cq.id, text }).catch(() => {});
    let p = await C.obtener(id);
    if (!p){ await responder('Esa pieza ya no existe'); return { ok: false, texto: 'No existe' }; }
    if (p.status === 'PUBLISHED' && accion !== 'pub'){ await responder('Ya estaba publicada'); return { ok: true, texto: 'Ya publicada' }; }

    if (accion === 'ok'){
      if (p.platform === 'telegram'){
        await publicarEnCanal(p);
        await C.actualizar(id, { status: 'PUBLISHED' });
        await responder('✅ Publicado en el canal');
        return { ok: true, texto: 'Publicado' };
      }
      await C.actualizar(id, { status: 'APPROVED' });
      const msg = await tg('sendMessage', { chat_id: chat, parse_mode: 'HTML', link_preview_options: { is_disabled: true },
        text: `✅ <b>#${esc(id)} aprobado para ${esc(RED[p.platform] || p.platform)}.</b> Súbelo hoy: guarda el ${p.format === 'carrusel' ? 'carrusel' : 'vídeo'} de arriba y pega este texto:\n\n${esc(textoPublicar(p))}`,
        reply_markup: { inline_keyboard: [[{ text: '📤 Ya está subido', callback_data: `c:${id}:pub` }]] }, reply_parameters: { message_id: cq.message.message_id, allow_sending_without_reply: true } });
      await vincular(chat, msg.message_id, id, 'aprobada');
      await responder('✅ Aprobado');
      return { ok: true, texto: 'Aprobado' };
    }
    if (accion === 'pub'){
      await C.actualizar(id, { status: 'PUBLISHED' });
      await responder('📤 Marcado como publicado');
      return { ok: true, texto: 'Publicado' };
    }
    if (accion === 'no'){
      await C.actualizar(id, { status: 'REJECTED' });
      const msg = await tg('sendMessage', { chat_id: chat, text: `❌ #${id} descartado. Si quieres, responde a este mensaje con el motivo y el equipo lo tendrá en cuenta.`,
        reply_parameters: { message_id: cq.message.message_id, allow_sending_without_reply: true } });
      await vincular(chat, msg.message_id, id, 'motivo');
      await responder('❌ Descartado');
      return { ok: true, texto: 'Descartado' };
    }
    if (accion === 'edit'){
      const msg = await tg('sendMessage', { chat_id: chat, text: `✏️ Responde a este mensaje con lo que quieres cambiar de #${id} (por ejemplo: «gancho más corto», «menos técnico»).`,
        reply_parameters: { message_id: cq.message.message_id, allow_sending_without_reply: true } });
      await vincular(chat, msg.message_id, id, 'editar');
      await responder('✏️ Dime qué cambiar');
      return { ok: true, texto: 'Esperando cambios' };
    }
    // regen
    await responder('🔄 Escribiendo otra versión…');
    const cambios = await reescribir(p, '');
    p = await C.actualizar(id, { ...cambios, status: 'READY_FOR_REVIEW', feedback: conFeedback(p, 'regenerado') });
    await mandarTarjeta(chat, p, { nueva: true });
    return { ok: true, texto: 'Regenerado' };
  }

  // Respuesta escrita a una tarjeta o a un aviso: motivo de descarte o cambios que pides.
  const msg = update && update.message;
  if (msg && msg.reply_to_message && typeof msg.text === 'string'){
    const v = await vinculado(msg.chat.id, msg.reply_to_message.message_id);
    if (!v) return { ok: false, texto: 'No es una respuesta a una pieza' };
    let p = await C.obtener(v.id);
    if (!p) return { ok: false, texto: 'No existe' };
    if (v.motivo === 'motivo' || p.status === 'REJECTED'){
      await C.actualizar(v.id, { feedback: conFeedback(p, 'descartado: ' + msg.text) });
      await tg('sendMessage', { chat_id: msg.chat.id, text: '📝 Apuntado. El equipo lo tendrá en cuenta en los próximos planes.', reply_parameters: { message_id: msg.message_id } });
      return { ok: true, texto: 'Motivo guardado' };
    }
    const cambios = await reescribir(p, msg.text);
    p = await C.actualizar(v.id, { ...cambios, status: 'READY_FOR_REVIEW', feedback: conFeedback(p, 'editado: ' + msg.text) });
    await mandarTarjeta(msg.chat.id, p, { nueva: true });
    return { ok: true, texto: 'Editado' };
  }
  return { ok: false, texto: 'Nada que hacer' };
}

module.exports = { procesar, tarjeta, botones, textoPublicar, vincular, mandarTarjeta, RED };
