// Pruebas rápidas (sin navegador) de la parte del servidor.
const test = require('node:test');
const assert = require('node:assert');
const { extractJson } = require('../../lib/json');
const { creditsForItems } = require('../../lib/packs');

test('extractJson saca el JSON aunque la IA lo envuelva en texto o en ```json', () => {
  assert.deepStrictEqual(extractJson('{"a":1}'), { a: 1 });
  assert.deepStrictEqual(extractJson('Aquí tienes:\n```json\n{"hand":"As Kh"}\n```'), { hand: 'As Kh' });
  assert.throws(() => extractJson('no hay nada'));
});

test('los packs de créditos se reconocen por su importe en euros', () => {
  const item = (cents, quantity = 1) => ({ quantity, price: { id: 'price_x', type: 'one_time', currency: 'eur', unit_amount: cents } });
  assert.strictEqual(creditsForItems([item(299)]), 100);
  assert.strictEqual(creditsForItems([item(699)]), 300);
  assert.strictEqual(creditsForItems([item(1799)]), 1000);
  assert.strictEqual(creditsForItems([item(699, 2)]), 600);
  // La suscripción (recurrente) o un importe desconocido no dan créditos.
  assert.strictEqual(creditsForItems([{ quantity: 1, price: { type: 'recurring', currency: 'eur', unit_amount: 999 } }]), 0);
  assert.strictEqual(creditsForItems([item(500)]), 0);
});

// Respuesta falsa al estilo de Vercel para llamar a las funciones de /api.
function fakeRes(){
  const res = { statusCode: 200, body: null, headers: {} };
  res.setHeader = (k, v) => { res.headers[k] = v; };
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  res.end = () => res;
  return res;
}

test('"Cuéntame tu mano" rechaza un relato demasiado corto sin gastar nada', async () => {
  process.env.ANTHROPIC_API_KEY = 'prueba'; process.env.STRIPE_SECRET_KEY = 'prueba';
  const handler = require('../../api/parse-hand');
  const res = fakeRes();
  await handler({ method: 'POST', headers: {}, body: { text: 'AK' } }, res);
  assert.strictEqual(res.statusCode, 400);
});

test('la captura sin imagen devuelve un error claro', async () => {
  process.env.ANTHROPIC_API_KEY = 'prueba'; process.env.STRIPE_SECRET_KEY = 'prueba';
  const handler = require('../../api/analyze-table');
  const res = fakeRes();
  await handler({ method: 'POST', headers: {}, body: {} }, res);
  assert.strictEqual(res.statusCode, 400);
  assert.match(res.body.error, /imagen/i);
});
