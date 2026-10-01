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
async function lanzar(query, memoria = new Map()){
  process.env.CRON_SECRET = 'secreto'; process.env.TELEGRAM_BOT_TOKEN = 'T'; process.env.TELEGRAM_CHANNEL = '@canal';
  process.env.UPSTASH_REDIS_REST_URL = 'http://redis.test'; process.env.UPSTASH_REDIS_REST_TOKEN = 'x';
  const llamadas = [], real = global.fetch;
  global.fetch = async (url, o) => {
    const body = JSON.parse(o.body);
    if (url === 'http://redis.test'){
      const [op, k, , nx] = body; let r = null;
      if (op === 'SET'){ if (nx === 'NX' && memoria.has(k)) r = null; else { memoria.set(k, '1'); r = 'OK'; } }
      else if (op === 'INCR'){ r = (Number(memoria.get(k)) || 0) + 1; memoria.set(k, String(r)); }
      else if (op === 'DECR'){ r = (Number(memoria.get(k)) || 0) - 1; memoria.set(k, String(r)); }
      else if (op === 'DEL'){ memoria.delete(k); r = 1; }
      return { json: async () => ({ result: r }) };
    }
    llamadas.push({ metodo: url.split('/').pop(), body });
    return { json: async () => ({ ok: true, result: {} }) };
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
