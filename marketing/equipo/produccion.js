// Producción del plan del día (lo ejecuta .github/workflows/equipo.yml):
//
//   PLAN='{…}' node marketing/equipo/produccion.js registrar   → apunta las piezas en la cola de RÍO (/api/content)
//        y deja en la salida { plan, videos } (el plan con el id de cada pieza y los vídeos que hay que hacer)
//   node marketing/equipo/produccion.js enviar plan.json carpeta → espera a las 12:00 (hora de España), hace los
//        carruseles y manda cada pieza a tu chat de Telegram con su tarjeta de revisión (✅ ❌ ✏️ 🔄)
//
// Variables: RIO_URL (por defecto https://riopoker.es), STATS_KEY (la clave de servicio de RÍO),
// TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID (tu chat privado con el bot). SIN_ESPERA=1 no espera a las 12:00.
const fs = require('fs'), path = require('path');
const { normalizar } = require('./plan');

const RIO = (process.env.RIO_URL || 'https://riopoker.es').replace(/\/$/, '');
const HORA_ENVIO = 12; // 12:00 en España

async function rio(body){
  const r = await fetch(RIO + '/api/content', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.STATS_KEY || '' }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`RÍO /api/content (${r.status}): ${d.error || 'error'}`);
  return d;
}

async function tg(metodo, campos, archivos = {}){
  const fd = new FormData();
  for (const [k, v] of Object.entries(campos)) fd.append(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
  for (const [k, f] of Object.entries(archivos)) fd.append(k, await fs.openAsBlob(f), path.basename(f));
  const r = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${metodo}`, { method: 'POST', body: fd });
  const d = await r.json();
  if (!d.ok) throw new Error(`Telegram ${metodo}: ${d.description}`);
  return d.result;
}

// Lo que se guarda de cada pieza en la cola (los datos de producción van aparte).
function aCola(p, plan){
  const { n, video, carrusel, encuesta, ...resto } = p;
  return { ...resto, status: 'GENERATING', idea_id: p.idea_id || `${plan.fecha}-${n}`, hand_data: video ? { pedido: video.pedido } : undefined,
    assets: encuesta ? { encuesta } : undefined, notes: plan.resumen ? `Plan ${plan.fecha}: ${plan.resumen}`.slice(0, 2000) : undefined };
}

async function registrar(){
  const { plan, errores } = normalizar(process.env.PLAN || '');
  errores.forEach(e => console.error('⚠️ ' + e));
  if (!plan) process.exit(2);
  const creadas = await rio({ accion: 'crear', piezas: plan.piezas.map(p => aCola(p, plan)) });
  plan.piezas.forEach((p, i) => { p.id = creadas[i].id; });
  plan.errores = errores;
  const videos = plan.piezas.filter(p => p.format === 'video').map(p => ({ id: p.id, pedido: p.video.pedido }));
  process.stdout.write(JSON.stringify({ plan, videos: { include: videos } }));
}

// Hora actual en España (0-23,999).
function horaEspana(d = new Date()){
  const [h, m] = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit', hour12: false }).format(d).split(':').map(Number);
  return h + m / 60;
}

async function esperarALas12(){
  if (process.env.SIN_ESPERA === '1') return;
  const falta = HORA_ENVIO - horaEspana();
  if (falta > 0 && falta < 3){
    console.log(`Esperando ${Math.round(falta * 60)} minutos hasta las ${HORA_ENVIO}:00…`);
    await new Promise(r => setTimeout(r, falta * 3600 * 1000));
  }
}

const RED = { tiktok: '🎵 TikTok', instagram: '📸 Instagram', youtube: '▶️ YouTube', telegram: '💬 Telegram', seo: '🔎 Web' };

async function enviar(archivoPlan, carpeta){
  const plan = JSON.parse(fs.readFileSync(archivoPlan, 'utf8'));
  const chat = process.env.TELEGRAM_CHAT_ID;
  const { hacerCarrusel } = require('./carrusel');
  // Los carruseles se hacen antes de esperar, así a las 12:00 sale todo seguido.
  const imagenes = {};
  for (const p of plan.piezas.filter(x => x.format === 'carrusel')){
    try { imagenes[p.id] = await hacerCarrusel(p, path.join(carpeta, 'carruseles')); } catch (e) { console.error(`Carrusel #${p.id}: ${e.message}`); }
  }
  await esperarALas12();
  const lista = plan.piezas.map(p => `${RED[p.platform] || p.platform} · ${p.hook}`).join('\n');
  await tg('sendMessage', { chat_id: chat, text: `📅 Plan de hoy (${plan.fecha}) · ${plan.piezas.length} piezas\n\n${plan.resumen || ''}\n\n${lista}`.slice(0, 4000), link_preview_options: { is_disabled: true } });
  let listas = 0;
  const fallos = [];
  for (const p of plan.piezas){
    try {
      let media = [];
      if (p.format === 'video'){
        const f = path.join(carpeta, `pieza-${p.id}.mp4`);
        if (!fs.existsSync(f)) throw new Error('no se pudo hacer el vídeo' + (fs.existsSync(f + '.error') ? ': ' + fs.readFileSync(f + '.error', 'utf8').trim() : ''));
        media = [(await tg('sendVideo', { chat_id: chat, supports_streaming: true, caption: `#${p.id}` }, { video: f })).message_id];
      } else if (p.format === 'carrusel'){
        const fotos = imagenes[p.id];
        if (!fotos || !fotos.length) throw new Error('no se pudo hacer el carrusel');
        const adj = Object.fromEntries(fotos.map((f, i) => [`f${i}`, f]));
        const grupo = await tg('sendMediaGroup', { chat_id: chat, media: fotos.map((_, i) => ({ type: 'photo', media: `attach://f${i}` })) }, adj);
        media = grupo.map(m => m.message_id);
      }
      await rio({ accion: 'actualizar', id: p.id, status: 'READY_FOR_REVIEW', assets: { telegram: { chat, media }, ...(p.encuesta ? { encuesta: p.encuesta } : {}) } });
      await rio({ accion: 'tarjeta', id: p.id });
      listas++;
    } catch (e) {
      fallos.push(`#${p.id}: ${e.message}`);
      await rio({ accion: 'actualizar', id: p.id, status: 'FAILED', notes: e.message }).catch(() => {});
    }
  }
  const pie = fallos.length ? `\n\n⚠️ No se pudieron preparar:\n${fallos.join('\n')}` : '';
  await tg('sendMessage', { chat_id: chat, text: `✅ ${listas} piezas listas para revisar. Pulsa ✅, ❌, ✏️ o 🔄 en cada una.${pie}`.slice(0, 4000) });
  if (!listas) process.exit(1);
}

module.exports = { aCola, horaEspana, enviar, registrar };

if (require.main === module){
  const [orden, a, b] = process.argv.slice(2);
  const hacer = orden === 'registrar' ? registrar() : orden === 'enviar' ? enviar(a, b || 'salida') : Promise.reject(new Error('Uso: registrar | enviar plan.json carpeta'));
  hacer.catch(e => { console.error(e.message); process.exit(1); });
}
