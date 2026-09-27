// Estadísticas del administrador: cuentas nuevas con su origen, manos, clics en pagar y nuevos PRO.
const test = require('node:test');
const assert = require('node:assert');

// Redis en memoria (solo las órdenes que usamos) + Stripe simulado.
function entorno({ session } = {}){
  process.env.STRIPE_SECRET_KEY = 'sk_prueba';
  process.env.UPSTASH_REDIS_REST_URL = 'https://redis.test';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'prueba';
  process.env.ADMIN_EMAILS = 'admin@rio.test';
  const kv = new Map();
  const set = (k) => { if (!kv.has(k)) kv.set(k, new Set()); return kv.get(k); };
  const hash = (k) => { if (!kv.has(k)) kv.set(k, new Map()); return kv.get(k); };
  const ops = {
    GET: (k) => kv.has(k) ? kv.get(k) : null, SET: (k, v) => { kv.set(k, v); return 'OK'; },
    DEL: (...ks) => ks.filter(k => kv.delete(k)).length, EXPIRE: () => 1,
    INCR: (k) => { const n = (parseInt(kv.get(k), 10) || 0) + 1; kv.set(k, String(n)); return n; },
    EXISTS: (...ks) => ks.filter(k => kv.has(k)).length,
    SADD: (k, v) => { const s = set(k); if (s.has(v)) return 0; s.add(v); return 1; }, SCARD: (k) => kv.has(k) ? kv.get(k).size : 0,
    HINCRBY: (k, f, n) => { const h = hash(k); h.set(f, (h.get(f) || 0) + n); return h.get(f); },
    HGETALL: (k) => kv.has(k) ? [...kv.get(k)].flatMap(([f, v]) => [f, String(v)]) : [],
  };
  global.fetch = async (url, opts) => {
    const u = String(url);
    const json = (data) => ({ ok: true, json: async () => data });
    if (u.startsWith('https://redis.test')){ const [cmd, ...args] = JSON.parse(opts.body); return json({ result: ops[cmd](...args) }); }
    if (u.includes('/v1/events/')) return json({ type: 'checkout.session.completed', data: { object: { id: session.id } } });
    if (u.includes('/v1/checkout/sessions/')) return json(session);
    if (u.includes('/v1/customers') || u.includes('/v1/subscriptions')) return json({ data: [] });
    throw new Error('URL inesperada ' + u);
  };
  return kv;
}
function fakeRes(){
  const res = { statusCode: 200, body: null };
  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (b) => { res.body = b; return res; };
  res.end = () => res;
  res.setHeader = () => {};
  return res;
}
const hoy = new Date().toISOString().slice(0, 10);
const cuenta = async (email, src) => {
  await global.fetch('https://redis.test', { body: JSON.stringify(['SET', `rio:code:${email}`, '123456']) });
  const res = fakeRes();
  await require('../../lib/routes/verify-code')({ method: 'POST', body: { email, code: '123456', src }, headers: {} }, res);
  return res;
};

test('una cuenta nueva cuenta una vez, con su origen; las cuentas de antes no cuentan', async () => {
  const kv = entorno();
  kv.set('rio:data:veterano@rio.test', '{}'); // cuenta anterior a las estadísticas
  assert.strictEqual((await cuenta('nuevo@rio.test', 'Instagram')).statusCode, 200);
  await cuenta('nuevo@rio.test', 'instagram'); // vuelve a entrar: no es nueva
  await cuenta('veterano@rio.test', 'youtube');
  assert.strictEqual(kv.get(`rio:stats:${hoy}`).get('cuentas'), 1);
  assert.strictEqual(kv.get('rio:stats:src').get('instagram:cuentas'), 1);
  assert.strictEqual(kv.get('rio:src:nuevo@rio.test'), 'instagram');
});

test('manos y clics en pagar se cuentan; otros eventos no', async () => {
  const kv = entorno();
  const track = require('../../lib/routes/track');
  for (const e of ['analisis', 'analisis', 'pago', 'hackeo']) await track({ method: 'POST', query: { e }, headers: { 'x-forwarded-for': '1.2.3.4' } }, fakeRes());
  const h = kv.get(`rio:stats:${hoy}`);
  assert.strictEqual(h.get('analisis'), 2);
  assert.strictEqual(h.get('pago'), 1);
  assert.strictEqual(h.has('hackeo'), false);
});

test('un nuevo PRO se cuenta una sola vez (aunque Stripe repita el aviso) con el origen de la cuenta', async () => {
  const { accountRef } = require('../../lib/stripe');
  const kv = entorno({ session: { id: 'cs_9', payment_status: 'paid', customer: 'cus_9', client_reference_id: accountRef('nuevo@rio.test'),
    line_items: { data: [{ quantity: 1, price: { type: 'recurring', currency: 'eur', unit_amount: 999 } }] } } });
  kv.set('rio:src:nuevo@rio.test', 'youtube');
  const webhook = require('../../api/stripe-webhook');
  await webhook({ method: 'POST', body: { id: 'evt_9' } }, fakeRes());
  await webhook({ method: 'POST', body: { id: 'evt_9' } }, fakeRes());
  assert.strictEqual(kv.get(`rio:stats:${hoy}`).get('pro'), 1);
  assert.strictEqual(kv.get('rio:stats:src').get('youtube:pro'), 1);
});

test('solo el administrador puede ver las estadísticas', async () => {
  const kv = entorno();
  kv.set('rio:session:' + 'a'.repeat(64), 'admin@rio.test');
  kv.set('rio:session:' + 'b'.repeat(64), 'jugador@rio.test');
  kv.set(`rio:stats:${hoy}`, new Map([['cuentas', 3], ['analisis', 10]]));
  kv.set('rio:stats:src', new Map([['instagram:cuentas', 2], ['instagram:pro', 1]]));
  const stats = require('../../lib/routes/stats');
  const no = fakeRes();
  await stats({ method: 'GET', headers: { authorization: 'Bearer ' + 'b'.repeat(64) } }, no);
  assert.strictEqual(no.statusCode, 403);
  const si = fakeRes();
  await stats({ method: 'GET', headers: { authorization: 'Bearer ' + 'a'.repeat(64) } }, si);
  assert.strictEqual(si.statusCode, 200);
  assert.strictEqual(si.body.dias.length, 14);
  assert.deepStrictEqual(si.body.dias[0], { dia: hoy, cuentas: 3, analisis: 10, pago: 0, pro: 0, packs: 0 });
  assert.deepStrictEqual(si.body.porOrigen.instagram, { cuentas: 2, pro: 1 });
});
