// Canal de Telegram: las preguntas cumplen los límites de Telegram, sus enlaces existen
// y el bot solo publica cuando lo lanza el cron de Vercel.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const QUIZZES = require('../../lib/telegram-quizzes');
const TEXTOS = require('../../lib/telegram-textos');
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

test('el canal alterna quiz, texto y vídeo según el día de la semana', () => {
  // 1 oct 2026 es jueves
  assert.strictEqual(telegram.tipoDelDia('2026-10-01'), 'video');
  assert.strictEqual(telegram.tipoDelDia('2026-10-02'), 'texto');
  assert.strictEqual(telegram.tipoDelDia('2026-10-03'), 'video');
  assert.strictEqual(telegram.tipoDelDia('2026-10-04'), 'quiz');
  assert.strictEqual(telegram.tipoDelDia('2026-10-05'), 'quiz');
  assert.strictEqual(telegram.tipoDelDia('2026-10-06'), 'texto');
  assert.strictEqual(telegram.tipoDelDia('2026-10-07'), 'quiz');
});
