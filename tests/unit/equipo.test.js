// Equipo de marketing: el plan del día se comprueba, y los botones de Telegram aprueban, publican, descartan y editan.
const test = require('node:test');
const assert = require('node:assert');
const { entorno, fakeRes } = require('./redis-memoria');
const { normalizar } = require('../../marketing/equipo/plan');

const pieza = (x = {}) => ({ platform: 'tiktok', format: 'video', hook: '¿Pagas aquí?', caption: 'Mira qué dice RÍO', video: { pedido: 'river' }, ...x });

test('plan del día: se aceptan las piezas buenas y se quitan las que no cuadran', () => {
  const { plan, errores } = normalizar({ fecha: '2026-10-02', resumen: 'Hoy river', fuentes: ['https://a.com', 'javascript:alert(1)'], piezas: [
    pieza(),
    pieza({ platform: 'tiktok', format: 'carrusel' }),                     // en TikTok no hay carruseles
    pieza({ format: 'video', video: undefined }),                          // falta qué vídeo
    { platform: 'instagram', format: 'carrusel', hook: 'Errores', caption: 'x', carrusel: { diapositivas: [{ titulo: 'a' }, { titulo: 'b' }, { titulo: 'c' }] } },
    { platform: 'telegram', format: 'encuesta', hook: '¿Qué harías?', encuesta: { pregunta: '¿Pagas?', opciones: ['Sí', 'No'], correcta: 1 } }
  ] });
  assert.strictEqual(plan.piezas.length, 3);
  assert.strictEqual(errores.length, 2);
  assert.deepStrictEqual(plan.fuentes, ['https://a.com']);
  assert.strictEqual(plan.piezas[2].encuesta.correcta, 1);
  assert.strictEqual(normalizar('{roto').plan, null);
  assert.strictEqual(normalizar({ piezas: [pieza({ platform: 'myspace' })] }).plan, null);
});

test('el plan de ejemplo de la guía del equipo es válido', () => {
  const guia = require('fs').readFileSync(require('path').join(__dirname, '..', '..', 'marketing', 'equipo', 'GUIA.md'), 'utf8');
  const ejemplo = guia.match(/## Formato del plan\n\n```json\n([\s\S]*?)```/)[1];
  const { plan, errores } = normalizar(ejemplo);
  assert.deepStrictEqual(errores, []);
  assert.strictEqual(plan.piezas.length, 3);
});

// Telegram y la IA simulados: se apunta cada llamada.
function conTelegram(kv){
  process.env.TELEGRAM_BOT_TOKEN = 'bot-prueba';
  process.env.TELEGRAM_CHANNEL = '@riopoker_test';
  process.env.ANTHROPIC_API_KEY = 'ia-prueba';
  const llamadas = [];
  const redis = global.fetch;
  let msg = 100;
  global.fetch = async (url, opts) => {
    const u = String(url);
    if (u.startsWith('https://api.telegram.org/')){
      const metodo = u.split('/').pop(), body = JSON.parse(opts.body);
      llamadas.push({ metodo, body });
      return { ok: true, json: async () => ({ ok: true, result: metodo === 'sendMessage' || metodo === 'copyMessage' ? { message_id: ++msg } : true }) };
    }
    if (u === 'https://api.anthropic.com/v1/messages'){
      llamadas.push({ metodo: 'ia', body: JSON.parse(opts.body) });
      return { ok: true, json: async () => ({ content: [{ type: 'text', text: '{"hook":"Gancho nuevo","caption":"Texto nuevo {enlace}","cta":"Analiza tu mano gratis en RÍO"}' }] }) };
    }
    return redis(url, opts);
  };
  return llamadas;
}
const api = async (body) => { const res = fakeRes(); await require('../../lib/routes/content')({ method: 'POST', query: {}, body, headers: { 'x-api-key': 'clave-de-servicio-larga' } }, res); return res; };
const boton = (id, accion) => api({ accion: 'telegram', update: { callback_query: { id: 'q1', data: `c:${id}:${accion}`, message: { message_id: 50, chat: { id: 777 } } } } });

test('✅ en una pieza de Telegram la publica en el canal (copiando el vídeo) con su enlace propio', async () => {
  const llamadas = conTelegram(entorno());
  const p = (await api({ accion: 'crear', status: 'READY_FOR_REVIEW', platform: 'telegram', format: 'video', hook: 'Hola', caption: 'Mira esto' })).body;
  await api({ accion: 'actualizar', id: p.id, assets: { telegram: { chat: 777, media: [40] } } });
  const tarj = await api({ accion: 'tarjeta', id: p.id });
  assert.strictEqual(tarj.statusCode, 200);
  assert.match(llamadas.at(-1).body.text, /Mira esto[\s\S]*riopoker\.es\/v\//);
  assert.deepStrictEqual(llamadas.at(-1).body.reply_markup.inline_keyboard.flat().map(b => b.callback_data), [`c:${p.id}:ok`, `c:${p.id}:no`, `c:${p.id}:edit`, `c:${p.id}:regen`]);
  await boton(p.id, 'ok');
  const copia = llamadas.find(l => l.metodo === 'copyMessage');
  assert.strictEqual(copia.body.chat_id, '@riopoker_test');
  assert.strictEqual(copia.body.message_id, 40);
  assert.match(copia.body.caption, /riopoker\.es\/v\//);
  const final = (await require('../../lib/contenido').obtener(p.id));
  assert.strictEqual(final.status, 'PUBLISHED');
});

test('✅ en TikTok la deja aprobada (no publica nada) y «Ya está subido» la marca como publicada', async () => {
  const llamadas = conTelegram(entorno());
  const p = (await api({ accion: 'crear', status: 'READY_FOR_REVIEW', platform: 'tiktok', format: 'video', hook: 'Hola', caption: 'Texto TikTok' })).body;
  await boton(p.id, 'ok');
  assert.ok(!llamadas.some(l => l.metodo === 'copyMessage'));
  assert.match(llamadas.find(l => l.metodo === 'sendMessage').body.text, /Texto TikTok/);
  const C = require('../../lib/contenido');
  assert.strictEqual((await C.obtener(p.id)).status, 'APPROVED');
  await boton(p.id, 'pub');
  assert.strictEqual((await C.obtener(p.id)).status, 'PUBLISHED');
});

test('❌ descarta y guarda el motivo si respondes; ✏️ reescribe los textos con lo que pides', async () => {
  const llamadas = conTelegram(entorno());
  const C = require('../../lib/contenido');
  const p = (await api({ accion: 'crear', status: 'READY_FOR_REVIEW', platform: 'instagram', format: 'carrusel', hook: 'Viejo', caption: 'Viejo' })).body;
  await boton(p.id, 'no');
  const aviso = llamadas.filter(l => l.metodo === 'sendMessage').at(-1);
  assert.strictEqual((await C.obtener(p.id)).status, 'REJECTED');
  await api({ accion: 'telegram', update: { message: { message_id: 90, chat: { id: 777 }, text: 'Demasiado técnico', reply_to_message: { message_id: 101 } } } });
  assert.match((await C.obtener(p.id)).feedback, /Demasiado técnico/);
  assert.ok(aviso);

  const q = (await api({ accion: 'crear', status: 'READY_FOR_REVIEW', platform: 'telegram', format: 'post', hook: 'Viejo', caption: 'Viejo' })).body;
  await boton(q.id, 'edit');
  const pregunta = llamadas.filter(l => l.metodo === 'sendMessage').length + 100; // message_id del aviso «Responde a este mensaje…»
  await api({ accion: 'telegram', update: { message: { message_id: 91, chat: { id: 777 }, text: 'gancho más corto', reply_to_message: { message_id: pregunta } } } });
  const ia = llamadas.find(l => l.metodo === 'ia');
  assert.match(ia.body.messages[0].content, /gancho más corto/);
  const nueva = await C.obtener(q.id);
  assert.strictEqual(nueva.hook, 'Gancho nuevo');
  assert.strictEqual(nueva.status, 'READY_FOR_REVIEW');
  assert.match(llamadas.filter(l => l.metodo === 'sendMessage').at(-1).body.text, /versión nueva/);
});
