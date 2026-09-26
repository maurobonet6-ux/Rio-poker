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

test('"Ya he pagado, comprobar": encuentra el pago aunque el aviso de Stripe no llegara', async () => {
  const { accountRef } = require('../../lib/stripe');
  process.env.STRIPE_SECRET_KEY = 'sk_prueba';
  process.env.UPSTASH_REDIS_REST_URL = 'https://redis.test';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'prueba';
  const sets = {};   // Redis en memoria
  const token = 'a'.repeat(64);
  global.fetch = async (url, opts) => {
    const u = String(url);
    const json = (data) => ({ ok: true, json: async () => data });
    if (u.startsWith('https://redis.test')){
      const [cmd, key, val] = JSON.parse(opts.body);
      if (cmd === 'GET') return json({ result: key === `rio:session:${token}` ? 'cuenta@gmail.com' : null });
      if (cmd === 'SADD'){ (sets[key] = sets[key] || new Set()).add(val); return json({ result: 1 }); }
      if (cmd === 'SMEMBERS') return json({ result: [...(sets[key] || [])] });
      return json({ result: null });
    }
    if (u.includes('/v1/customers?email=')) return json({ data: [] }); // pagó con otro email
    if (u.includes('/v1/checkout/sessions?limit=100')) return json({ data: [
      { id: 'cs_otro', payment_status: 'paid', customer: 'cus_OTRO', client_reference_id: accountRef('otra@gmail.com') },
      { id: 'cs_mio', payment_status: 'paid', customer: 'cus_MIO', client_reference_id: accountRef('cuenta@gmail.com') }] });
    if (u.includes('/v1/subscriptions?customer=cus_MIO')) return json({ data: [{ status: 'active' }] });
    if (u.includes('/v1/subscriptions?customer=')) return json({ data: [] });
    throw new Error('URL inesperada ' + u);
  };
  const handler = require('../../lib/routes/check-pro');
  const res = { statusCode: 200, body: null, setHeader(){}, status(c){ this.statusCode = c; return this; }, json(b){ this.body = b; return this; } };
  await handler({ method: 'GET', headers: { authorization: `Bearer ${token}` }, query: { deep: '1' } }, res);
  assert.strictEqual(res.body.pro, true);
  assert.deepStrictEqual([...sets['rio:customers:cuenta@gmail.com']], ['cus_MIO']); // solo su pago, no el de otra cuenta
});
