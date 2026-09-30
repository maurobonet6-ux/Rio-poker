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

test('cookie de sesión: se crea al entrar, sirve para recuperar la sesión y se borra al salir', async () => {
  delete require.cache[require.resolve('../../lib/auth')];
  const kv = new Map();
  process.env.UPSTASH_REDIS_REST_URL = 'https://redis.test'; process.env.UPSTASH_REDIS_REST_TOKEN = 'prueba';
  global.fetch = async (url, opts) => {
    const [cmd, ...a] = JSON.parse(opts.body);
    const r = cmd === 'SET' ? (kv.set(a[0], a[1]), 'OK') : cmd === 'GET' ? (kv.get(a[0]) ?? null) : cmd === 'DEL' ? (kv.delete(a[0]) ? 1 : 0) : 1;
    return { ok: true, json: async () => ({ result: r }) };
  };
  const { createSession, emailFromRequest, sessionCookie } = require('../../lib/auth');
  const token = await createSession('yo@rio.test');
  const cookie = sessionCookie(token);
  assert.match(cookie, /^rio_s=[a-f0-9]{64}; Path=\/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax$/);
  // Sin cabecera Authorization, solo con la cookie (lo que pasa cuando el navegador borró los datos de la página)
  const req = { method: 'GET', headers: { cookie: 'otra=1; ' + cookie.split(';')[0] } };
  assert.strictEqual(await emailFromRequest(req), 'yo@rio.test');
  const cabeceras = {}, res = { statusCode: 200, body: null, setHeader: (k, v) => { cabeceras[k] = v; } };
  res.status = (c) => { res.statusCode = c; return res; }; res.json = (b) => { res.body = b; return res; };
  await require('../../lib/routes/session')(req, res);
  assert.deepStrictEqual(res.body, { token, email: 'yo@rio.test' });
  await require('../../lib/routes/logout')({ method: 'POST', headers: req.headers }, res);
  assert.match(cabeceras['Set-Cookie'], /rio_s=; .*Max-Age=0/);
  res.body = null;
  await require('../../lib/routes/session')(req, res);
  assert.strictEqual(res.statusCode, 401);                    // tras salir, la cookie ya no vale
  // Una cookie con un valor raro no se acepta
  assert.strictEqual(await emailFromRequest({ headers: { cookie: 'rio_s=../../etc' } }), null);
});
