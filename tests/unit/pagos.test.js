// Pagos: un pago con otro email (p. ej. Apple Pay) se asocia igualmente a la cuenta de RÍO.
const test = require('node:test');
const assert = require('node:assert');
const { accountRef, accountFromRef } = require('../../lib/stripe');

test('el identificador de cuenta del enlace de pago va y vuelve', () => {
  const ref = accountRef('jugador.uno+rio@gmail.com');
  assert.match(ref, /^rio_[A-Za-z0-9_-]+$/); // Stripe solo admite letras, números, - y _
  assert.strictEqual(accountFromRef(ref), 'jugador.uno+rio@gmail.com');
  assert.strictEqual(accountFromRef('otra-cosa'), null);
  assert.strictEqual(accountFromRef('rio_' + Buffer.from('no es un email').toString('base64url')), null);
});

// Simula Stripe y Upstash (Redis) y devuelve las órdenes que se mandan a Redis.
function simular(session){
  process.env.STRIPE_SECRET_KEY = 'sk_prueba';
  process.env.UPSTASH_REDIS_REST_URL = 'https://redis.test';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'prueba';
  const redis = [];
  global.fetch = async (url, opts) => {
    const u = String(url);
    const json = (data) => ({ ok: true, json: async () => data });
    if (u.startsWith('https://redis.test')){ redis.push(JSON.parse(opts.body)); return json({ result: 1 }); }
    if (u.includes('/v1/events/')) return json({ type: 'checkout.session.completed', data: { object: { id: session.id } } });
    if (u.includes('/v1/checkout/sessions/')) return json(session);
    throw new Error('URL inesperada ' + u);
  };
  return redis;
}
function fakeRes(){
  const res = { statusCode: 200, body: null };
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  return res;
}

test('webhook: la suscripción pagada con otro email se asocia a la cuenta del enlace', async () => {
  const redis = simular({ id: 'cs_1', payment_status: 'paid', customer: 'cus_ABC123', client_reference_id: accountRef('cuenta@gmail.com'),
    customer_details: { email: 'otro@icloud.com' }, line_items: { data: [{ quantity: 1, price: { type: 'recurring', currency: 'eur', unit_amount: 999 } }] } });
  const handler = require('../../api/stripe-webhook');
  const res = fakeRes();
  await handler({ method: 'POST', body: { id: 'evt_1' } }, res);
  assert.strictEqual(res.statusCode, 200);
  assert.deepStrictEqual(redis, [['SADD', 'rio:customers:cuenta@gmail.com', 'cus_ABC123']]);
});

test('webhook: un pack pagado con otro email suma los créditos a la cuenta del enlace', async () => {
  const redis = simular({ id: 'cs_2', payment_status: 'paid', customer: null, client_reference_id: accountRef('cuenta@gmail.com'),
    customer_details: { email: 'otro@icloud.com' }, line_items: { data: [{ quantity: 1, price: { type: 'one_time', currency: 'eur', unit_amount: 299 } }] } });
  const handler = require('../../api/stripe-webhook');
  const res = fakeRes();
  await handler({ method: 'POST', body: { id: 'evt_2' } }, res);
  assert.deepStrictEqual(redis, [['SADD', 'rio:redeemed:cuenta@gmail.com', 'cs_2'], ['INCRBY', 'rio:extra:cuenta@gmail.com', 100]]);
});
