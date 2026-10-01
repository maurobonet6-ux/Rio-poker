// Canal de Telegram: las preguntas cumplen los límites de Telegram, sus enlaces existen
// y el bot solo publica cuando lo lanza el cron de Vercel.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const QUIZZES = require('../../lib/telegram-quizzes');
const TEXTOS = require('../../lib/telegram-textos');
const ENCUESTAS = require('../../lib/telegram-encuestas');
const telegram = require('../../api/telegram');

const ROOT = path.join(__dirname, '..', '..');

test('las preguntas cumplen los límites de Telegram y enlazan a páginas que existen', () => {
  assert.ok(QUIZZES.length >= 30);
  QUIZZES.forEach((z, i) => {
    assert.ok(`🃏 Mano del día #${QUIZZES.length}\n${z.q}`.length <= 300, `pregunta ${i + 1} demasiado larga`);
    assert.ok(z.opts.length >= 2 && z.opts.length <= 10, `pregunta ${i + 1}: número de opciones`);
    z.opts.forEach(o => assert.ok(o.length >= 1 && o.length <= 100, `pregunta ${i + 1}: opción demasiado larga`));
    assert.ok(Number.isInteger(z.ok) && z.ok >= 0 && z.ok < z.opts.length, `pregunta ${i + 1}: respuesta correcta`);
    assert.ok(z.why.length <= 200, `pregunta ${i + 1}: explicación de ${z.why.length} caracteres (máximo 200)`);
    assert.ok(fs.existsSync(path.join(ROOT, z.link, 'index.html')), `pregunta ${i + 1}: no existe ${z.link}`);
  });
});

test('una pregunta distinta cada día, en orden, y vuelta a empezar al acabar', () => {
  assert.strictEqual(telegram.quizForDay('2026-10-01').number, 1);
  assert.strictEqual(telegram.quizForDay('2026-10-02').number, 2);
  const d = new Date(Date.UTC(2026, 9, 1 + QUIZZES.length)).toISOString().slice(0, 10);
  assert.strictEqual(telegram.quizForDay(d).q, QUIZZES[0].q);
  assert.strictEqual(telegram.today(new Date('2026-10-01T22:30:00Z')), '2026-10-02'); // ya es día 2 en España
  assert.strictEqual(telegram.quizNumber(1).q, QUIZZES[0].q);
  assert.strictEqual(telegram.quizNumber(QUIZZES.length + 2).q, QUIZZES[1].q);
});

test('sin la clave del cron no publica nada', async () => {
  process.env.CRON_SECRET = 'secreto';
  const res = { statusCode: 200, body: null, status(c){ this.statusCode = c; return this; }, json(b){ this.body = b; return this; } };
  await telegram({ headers: {} }, res);
  assert.strictEqual(res.statusCode, 401);
  delete process.env.CRON_SECRET;
});

test('los textos del canal caben en Telegram y enlazan a páginas que existen', () => {
  assert.ok(TEXTOS.length >= 10);
  TEXTOS.forEach((t, i) => {
    assert.ok(t.texto.length > 0 && t.texto.length <= 1000, `texto ${i + 1}: longitud`);
    const dir = t.link === '/' ? '' : t.link;
    assert.ok(fs.existsSync(path.join(ROOT, dir, 'index.html')), `texto ${i + 1}: no existe ${t.link}`);
  });
  assert.strictEqual(telegram.textoNumber(1).texto, TEXTOS[0].texto);
  assert.strictEqual(telegram.textoNumber(TEXTOS.length + 1).texto, TEXTOS[0].texto);
});

test('el cron diario alterna quiz y texto según el día de la semana', () => {
  // 1 oct 2026 es jueves
  const esperado = { '2026-10-01': 'quiz', '2026-10-02': 'texto', '2026-10-03': 'quiz', '2026-10-04': 'quiz', '2026-10-05': 'texto', '2026-10-06': 'quiz', '2026-10-07': 'texto' };
  for (const [d, t] of Object.entries(esperado)) assert.strictEqual(telegram.tipoDelDia(d), t, d);
});

// Publicación de verdad con Telegram y Redis simulados en memoria: no sale ninguna llamada a internet y
// la prueba no depende de la fecha de hoy (la numeración sale del contador, que empieza en 1).
let contadorMensajes = 100;
async function lanzar(query, memoria = new Map(), extra = {}){
  process.env.CRON_SECRET = 'secreto'; process.env.TELEGRAM_BOT_TOKEN = 'T'; process.env.TELEGRAM_CHANNEL = '@canal';
  process.env.UPSTASH_REDIS_REST_URL = 'http://redis.test'; process.env.UPSTASH_REDIS_REST_TOKEN = 'x';
  const llamadas = [], real = global.fetch;
  global.fetch = async (url, o) => {
    const body = JSON.parse(o.body);
    if (url === 'http://redis.test'){
      const [op, k, a, b] = body; let r = null;
      if (op === 'SET'){ if (b === 'NX' && memoria.has(k)) r = null; else { memoria.set(k, a); r = 'OK'; } }
      else if (op === 'GET') r = memoria.has(k) ? memoria.get(k) : null;
      else if (op === 'INCR'){ r = (Number(memoria.get(k)) || 0) + 1; memoria.set(k, String(r)); }
      else if (op === 'DECR'){ r = (Number(memoria.get(k)) || 0) - 1; memoria.set(k, String(r)); }
      else if (op === 'DEL'){ memoria.delete(k); r = 1; }
      else if (op === 'LPUSH'){ const l = memoria.get(k) || []; l.unshift(a); memoria.set(k, l); r = l.length; }
      else if (op === 'LTRIM'){ memoria.set(k, (memoria.get(k) || []).slice(a, b + 1)); r = 'OK'; }
      else if (op === 'LRANGE'){ const l = memoria.get(k) || []; r = l.slice(a, b === -1 ? undefined : b + 1); }
      else if (op === 'EXPIRE') r = 1;
      return { json: async () => ({ result: r }) };
    }
    const metodo = url.split('/').pop();
    if (extra.falla && extra.falla[metodo]) return { json: async () => ({ ok: false, description: extra.falla[metodo] }) };
    llamadas.push({ metodo, body });
    let result = {};
    if (metodo === 'sendPoll' || metodo === 'sendMessage') result = { message_id: ++contadorMensajes };
    if (metodo === 'stopPoll') result = (extra.votos && extra.votos(body.message_id)) || { options: [], total_voter_count: 0 };
    return { json: async () => ({ ok: true, result }) };
  };
  const res = { statusCode: 200, body: null, status(c){ this.statusCode = c; return this; }, json(b){ this.body = b; return this; } };
  try { await telegram({ headers: { authorization: 'Bearer secreto' }, query }, res); } finally { global.fetch = real; delete process.env.UPSTASH_REDIS_REST_URL; delete process.env.UPSTASH_REDIS_REST_TOKEN; }
  return { res, llamadas, memoria };
}
const LIMITES = (p) => {
  assert.ok(p.question.length <= 300, 'pregunta ' + p.question.length);
  assert.ok(p.options.length >= 2 && p.options.length <= 10);
  p.options.forEach(o => assert.ok(o.text.length >= 1 && o.text.length <= 100, 'opción ' + o.text));
  if (p.explanation) assert.ok(p.explanation.length <= 200, 'explicación ' + p.explanation.length);
  if (p.type === 'quiz'){ assert.ok(Number.isInteger(p.correct_option_id) && p.correct_option_id < p.options.length); }
};

test('cada tipo de publicación del canal funciona y cumple los límites de Telegram', async () => {
  for (const tipo of ['quiz', 'texto', 'mito', 'generada', 'encuesta']){
    const { res, llamadas } = await lanzar({ tipo });
    assert.strictEqual(res.statusCode, 200, `${tipo}: ${JSON.stringify(res.body)}`);
    assert.ok(llamadas.length >= 1, tipo);
    const encuesta = llamadas.find(l => l.metodo === 'sendPoll');
    if (tipo === 'texto') assert.strictEqual(llamadas[0].metodo, 'sendMessage');
    else { assert.ok(encuesta, `${tipo}: debe mandar una encuesta`); LIMITES(encuesta.body); }
    assert.ok(llamadas.every(l => l.body.chat_id === '@canal'));
  }
});

test('las preguntas generadas y los mitos caben siempre en una encuesta de Telegram', async () => {
  for (let i = 0; i < 60; i++){
    const { res, llamadas } = await lanzar({ tipo: 'generada' });
    assert.strictEqual(res.statusCode, 200);
    LIMITES(llamadas[0].body);
    assert.ok(!/\*/.test(JSON.stringify(llamadas[0].body)), 'sin asteriscos de formato');
  }
  const { MITOS } = require('../../lib/poker-mitos');
  MITOS.forEach(m => { assert.ok(`🤔 ¿Mito o realidad?\n${m.dice}`.length <= 300); assert.ok(m.why.length <= 200); });
  ENCUESTAS.forEach((e, i) => { assert.ok(`🗳️ ${e.q}`.length <= 300, 'encuesta ' + i); assert.ok(e.opts.length >= 2 && e.opts.length <= 10); e.opts.forEach(o => assert.ok(o.length <= 100)); });
});

test('un tipo que no existe se rechaza y sin la clave no publica nada', async () => {
  const { res, llamadas } = await lanzar({ tipo: 'inventado' });
  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(llamadas.length, 0);
});

test('no se repite nada: el mismo tipo el mismo día sale una vez, y al acabarse la lista se deja de publicar', async () => {
  const memoria = new Map();
  const a = await lanzar({ tipo: 'mito' }, memoria); assert.strictEqual(a.res.body.number, 1);
  const b = await lanzar({ tipo: 'mito' }, memoria); assert.match(b.res.body.skipped, /ya publicado/); assert.strictEqual(b.llamadas.length, 0);
  // cada día siguiente sale la siguiente; se simula quitando la marca del día
  const { MITOS } = require('../../lib/poker-mitos');
  for (let i = 2; i <= MITOS.length; i++){
    for (const k of [...memoria.keys()]) if (k.startsWith('telegram:publicado:')) memoria.delete(k);
    const r = await lanzar({ tipo: 'mito' }, memoria); assert.strictEqual(r.res.body.number, i);
  }
  for (const k of [...memoria.keys()]) if (k.startsWith('telegram:publicado:')) memoria.delete(k);
  const fin = await lanzar({ tipo: 'mito' }, memoria);
  assert.match(fin.res.body.skipped, /sin ideas nuevas/); assert.strictEqual(fin.llamadas.length, 0);
});

test('al contestar se ve claro cuál era la correcta: la explicación lo dice y las opciones llevan letra', async () => {
  for (const tipo of ['quiz', 'mito', 'generada']){
    for (let i = 0; i < (tipo === 'generada' ? 30 : 1); i++){
      const { llamadas } = await lanzar({ tipo });
      const p = llamadas.find(l => l.metodo === 'sendPoll').body;
      assert.match(p.explanation, /^✅ /, tipo + ': la explicación empieza con ✅');
      assert.ok(p.explanation.length <= 200 && p.explanation.split('\n').length <= 2, tipo + ': límites de la explicación');
      if (tipo === 'mito'){
        assert.deepStrictEqual(p.options.map(o => o.text), ['Es un mito', 'Es realidad']);
        assert.match(p.explanation, p.correct_option_id === 1 ? /^✅ Es REALIDAD\./ : /^✅ Es un MITO\./);
      } else {
        p.options.forEach((o, k) => assert.ok(o.text.startsWith('ABCDEFGHIJ'[k] + ') '), tipo + ': opción con letra'));
        const letra = 'ABCDEFGHIJ'[p.correct_option_id], texto = p.options[p.correct_option_id].text.slice(3);
        assert.ok(p.explanation.startsWith(`✅ La correcta es la ${letra}: ${texto.slice(0, 20)}`), tipo + ': nombra la opción correcta');
      }
    }
  }
});

// ---- Comunidad: resultados de ayer, lo más difícil de la semana y la bienvenida fijada ----
const comunidad = require('../../lib/telegram-comunidad');

test('cada encuesta guarda en Redis lo necesario para contar los votos mañana', async () => {
  const memoria = new Map();
  for (const tipo of ['quiz', 'mito', 'generada', 'encuesta']) await lanzar({ tipo }, memoria);
  const hoy = telegram.today();
  for (const tipo of ['quiz', 'mito', 'generada', 'encuesta']){
    const meta = JSON.parse(memoria.get(comunidad.CLAVE_POLL(hoy, tipo)));
    assert.ok(meta.id > 100, tipo + ': número de mensaje');
    assert.ok(meta.q.length > 0 && meta.q.length <= 100, tipo + ': pregunta corta');
    if (tipo === 'encuesta') assert.strictEqual(meta.ok, null); else { assert.ok(Number.isInteger(meta.ok)); assert.ok(meta.correcta.length > 0); }
  }
});

test('resultados de ayer: cierra las encuestas, cuenta los aciertos y publica una vez', async () => {
  const memoria = new Map(), hoy = telegram.today(), ayer = comunidad.restarDia(hoy, 1);
  for (const tipo of ['quiz', 'mito', 'encuesta']) await lanzar({ tipo }, memoria);
  for (const tipo of ['quiz', 'mito', 'encuesta']){ memoria.set(comunidad.CLAVE_POLL(ayer, tipo), memoria.get(comunidad.CLAVE_POLL(hoy, tipo))); memoria.delete(comunidad.CLAVE_POLL(hoy, tipo)); }
  // 7 de cada 10 aciertan; en la encuesta gana la opción 2 con 6 de 10
  const metas = {}; for (const tipo of ['quiz', 'mito', 'encuesta']){ const m = JSON.parse(memoria.get(comunidad.CLAVE_POLL(ayer, tipo))); metas[m.id] = { tipo, m }; }
  const votos = id => {
    const { tipo, m } = metas[id]; const opciones = [0, 1, 2].map(i => ({ text: 'op' + i, voter_count: 1 }));
    if (tipo === 'encuesta'){ opciones[1].voter_count = 6; return { options: opciones.slice(0, 3), total_voter_count: 8 }; }
    opciones.forEach(o => o.voter_count = 1); opciones[m.ok].voter_count = 7;
    const total = opciones.reduce((a, o) => a + o.voter_count, 0); return { options: opciones, total_voter_count: total };
  };
  const r = await lanzar({ tipo: 'resumen' }, memoria, { votos });
  assert.strictEqual(r.res.statusCode, 200, JSON.stringify(r.res.body));
  assert.strictEqual(r.llamadas.filter(l => l.metodo === 'stopPoll').length, 3, 'cierra las 3 encuestas');
  const msg = r.llamadas.find(l => l.metodo === 'sendMessage').body.text;
  assert.match(msg, /^📊 Resultados de ayer/);
  assert.match(msg, /🃏 Mano del día: acertó el \d+ %/);
  assert.match(msg, /🤔 ¿Mito o realidad\?: acertó el \d+ %/);
  assert.match(msg, /Ganó «op1» con el 75 %/);
  assert.ok(msg.length < 4096);
  assert.strictEqual(memoria.get(comunidad.CLAVE_RESULTADOS).length, 2, 'guarda los resultados de quiz y mito para el resumen semanal');
  const otra = await lanzar({ tipo: 'resumen' }, memoria, { votos });
  assert.match(otra.res.body.skipped, /ya publicado hoy/);
});

test('resultados de ayer: si nadie votó o no hay datos, no publica nada y se puede reintentar', async () => {
  const memoria = new Map();
  const r = await lanzar({ tipo: 'resumen' }, memoria);
  assert.strictEqual(r.res.statusCode, 200); assert.match(r.res.body.skipped, /nadie votó|no hay encuestas/);
  assert.strictEqual(r.llamadas.filter(l => l.metodo === 'sendMessage').length, 0);
  assert.ok(![...memoria.keys()].some(k => k.startsWith('telegram:publicado:')), 'libera la marca del día');
});

test('lo más difícil de la semana: las 3 con menos aciertos y la más fácil', async () => {
  const memoria = new Map(), hoy = telegram.today();
  const f = (dias, tipo, q, p, total = 10) => JSON.stringify({ dia: comunidad.restarDia(hoy, dias), tipo, q, p, total });
  memoria.set(comunidad.CLAVE_RESULTADOS, [f(1, 'quiz', 'Pregunta A', 80), f(2, 'mito', 'Pregunta B', 20), f(3, 'generada', 'Pregunta C', 35), f(4, 'quiz', 'Pregunta D', 90), f(5, 'mito', 'Pregunta E', 55), f(20, 'quiz', 'Pregunta vieja', 1), f(2, 'quiz', 'Pocos votos', 0, 2)]);
  const r = await lanzar({ tipo: 'semana' }, memoria);
  assert.strictEqual(r.res.statusCode, 200, JSON.stringify(r.res.body));
  const msg = r.llamadas[0].body.text;
  assert.ok(msg.indexOf('Pregunta B') < msg.indexOf('Pregunta C') && msg.indexOf('Pregunta C') < msg.indexOf('Pregunta E'), 'de más difícil a menos');
  assert.match(msg, /Solo acertó el 20 %/); assert.match(msg, /La más fácil: Pregunta D \(90 % acertó\)/);
  assert.ok(!msg.includes('Pregunta vieja') && !msg.includes('Pocos votos'), 'ignora lo antiguo y lo de pocos votos');
  const poco = await lanzar({ tipo: 'semana' }, new Map());
  assert.match(poco.res.body.skipped, /suficientes resultados/);
});

test('bienvenida: se publica y se fija una sola vez; si no hay permiso para fijar, avisa pero publica', async () => {
  const memoria = new Map();
  const a = await lanzar({ tipo: 'bienvenida' }, memoria);
  assert.strictEqual(a.res.statusCode, 200);
  assert.deepStrictEqual(a.llamadas.map(l => l.metodo), ['sendMessage', 'pinChatMessage']);
  assert.strictEqual(a.llamadas[1].body.message_id, contadorMensajes, 'fija el mensaje recién enviado');
  assert.strictEqual(a.res.body.fijado, true);
  assert.ok(a.llamadas[0].body.text.length < 4096 && a.llamadas[0].body.text.includes('riopoker.es'));
  const b = await lanzar({ tipo: 'bienvenida' }, memoria);
  assert.match(b.res.body.skipped, /ya publicado/); assert.strictEqual(b.llamadas.length, 0);
  const c = await lanzar({ tipo: 'bienvenida' }, new Map(), { falla: { pinChatMessage: 'not enough rights to pin a message' } });
  assert.strictEqual(c.res.statusCode, 200); assert.match(c.res.body.fijado, /not enough rights/);
});

test('las encuestas generadas llevan número de serie', async () => {
  const memoria = new Map();
  const a = await lanzar({ tipo: 'generada' }, memoria); memoria.delete('telegram:publicado:' + telegram.today() + ':generada');
  const b = await lanzar({ tipo: 'generada' }, memoria);
  assert.match(a.llamadas[0].body.question, /^🧮 Cálculo del día #1\n/);
  assert.match(b.llamadas[0].body.question, /^🧮 Cálculo del día #2\n/);
});
