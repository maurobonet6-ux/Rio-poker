// Sesiones: duran un año y cada uso vuelve a contar el año desde hoy (así no hay que pedir el código a menudo).
const test = require('node:test');
const assert = require('node:assert');

test('la sesión dura un año y se renueva al usarla', async () => {
  process.env.UPSTASH_REDIS_REST_URL = 'https://redis.test';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'prueba';
  const kv = new Map(), ttl = new Map(), ordenes = [];
  global.fetch = async (url, opts) => {
    const [cmd, ...a] = JSON.parse(opts.body); ordenes.push(cmd);
    const r = cmd === 'SET' ? (kv.set(a[0], a[1]), ttl.set(a[0], Number(a[3])), 'OK')
      : cmd === 'GET' ? (kv.get(a[0]) ?? null)
      : cmd === 'EXPIRE' ? (ttl.set(a[0], Number(a[1])), 1) : null;
    return { ok: true, json: async () => ({ result: r }) };
  };
  const { createSession, emailFromRequest } = require('../../lib/auth');
  const token = await createSession('yo@rio.test');
  const clave = 'rio:session:' + token, ANYO = 60 * 60 * 24 * 365;
  assert.strictEqual(ttl.get(clave), ANYO);
  ttl.set(clave, 10); // casi caducada
  assert.strictEqual(await emailFromRequest({ headers: { authorization: 'Bearer ' + token } }), 'yo@rio.test');
  assert.strictEqual(ttl.get(clave), ANYO);                 // vuelve a durar un año
  ordenes.length = 0;
  assert.strictEqual(await emailFromRequest({ headers: { authorization: 'Bearer ' + 'f'.repeat(64) } }), null);
  assert.ok(!ordenes.includes('EXPIRE'));                    // un token que no existe no se toca
});
