// Analítica de producto: eventos, usuarios únicos, recorridos, embudo, retención, contenidos y errores anónimos.
const test = require('node:test');
const assert = require('node:assert');

// Redis en memoria con /pipeline (los HyperLogLog se simulan con conjuntos exactos).
function entorno(){
  process.env.UPSTASH_REDIS_REST_URL = 'https://redis.test';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'prueba';
  process.env.ADMIN_EMAILS = 'admin@rio.test';
  process.env.STATS_KEY = 'clave-de-servicio-larga';
  const kv = new Map();
  const set = (k) => { if (!kv.has(k)) kv.set(k, new Set()); return kv.get(k); };
  const hash = (k) => { if (!kv.has(k)) kv.set(k, new Map()); return kv.get(k); };
  const list = (k) => { if (!kv.has(k)) kv.set(k, []); return kv.get(k); };
  const ops = {
    EXPIRE: () => 1,
    INCR: (k) => { const n = (parseInt(kv.get(k), 10) || 0) + 1; kv.set(k, String(n)); return n; },
    HINCRBY: (k, f, n) => { const h = hash(k); h.set(f, (h.get(f) || 0) + n); return h.get(f); },
    HGETALL: (k) => kv.has(k) ? [...kv.get(k)].flatMap(([f, v]) => [f, String(v)]) : [],
    PFADD: (k, v) => { const s = set(k); const n = s.has(v) ? 0 : 1; s.add(v); return n; },
    PFCOUNT: (...ks) => new Set(ks.flatMap(k => kv.has(k) ? [...kv.get(k)] : [])).size,
    SADD: (k, v) => { const s = set(k); const n = s.has(v) ? 0 : 1; s.add(v); return n; },
    SMEMBERS: (k) => kv.has(k) ? [...kv.get(k)] : [],
    SRANDMEMBER: (k, n) => kv.has(k) ? [...kv.get(k)].slice(0, n) : [],
    SCARD: (k) => kv.has(k) ? kv.get(k).size : 0,
    RPUSH: (k, v) => list(k).push(v),
    LTRIM: (k, a, b) => { kv.set(k, list(k).slice(a, b + 1)); return 'OK'; },
    LRANGE: (k, a, b) => list(k).slice(a, b + 1),
    GET: (k) => kv.has(k) ? kv.get(k) : null,
  };
  global.fetch = async (url, opts) => {
    const u = String(url), body = JSON.parse(opts.body);
    const json = (data) => ({ ok: true, json: async () => data });
    if (u === 'https://redis.test/pipeline') return json(body.map(([cmd, ...args]) => ({ result: ops[cmd](...args) })));
    if (u.startsWith('https://redis.test')){ const [cmd, ...args] = body; return json({ result: ops[cmd](...args) }); }
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
const { dia } = require('../../lib/stats');
const hoy = dia();
let ip = 0;
const enviar = (cuerpo, query) => require('../../lib/routes/track')(
  { method: 'POST', query: query || {}, body: typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo), headers: { 'x-forwarded-for': '9.9.9.' + (ip++ % 3) } }, fakeRes());

test('un evento se guarda con su usuario anónimo, su recorrido y su contenido; los no válidos no', async () => {
  const kv = entorno();
  await enviar({ e: 'app_open', aid: 'abc123def456', fd: hoy, c: 'v17', p: { route: 'analizar', email: 'no@debe.guardarse' } });
  await enviar({ e: 'analysis_completed', aid: 'abc123def456', fd: hoy, c: 'v17', p: { via: 'manual', n: 1 } });
  await enviar({ e: 'hackeo', aid: 'abc123def456' });
  assert.strictEqual(kv.get(`rio:ev:${hoy}`).get('app_open'), 1);
  assert.strictEqual(kv.get(`rio:ev:${hoy}`).has('hackeo'), false);
  assert.strictEqual(kv.get(`rio:stats:${hoy}`).get('analisis'), 1); // también en las estadísticas de siempre
  assert.ok(kv.get(`rio:u:analysis_completed:${hoy}`).has('abc123def456'));
  assert.ok(kv.get(`rio:nuevos:${hoy}`).has('abc123def456'));
  const recorrido = kv.get('rio:j:abc123def456');
  assert.strictEqual(recorrido.length, 2);
  assert.doesNotMatch(recorrido.join(), /no@debe/); // solo se guardan los datos permitidos
  assert.strictEqual(kv.get('rio:cm:v17').get('analysis_completed'), 1);
});

test('la forma antigua (/api/track?e=analisis) sigue contando', async () => {
  const kv = entorno();
  await enviar('', { e: 'analisis' });
  await enviar('', { e: 'pago' });
  assert.strictEqual(kv.get(`rio:stats:${hoy}`).get('analisis'), 1);
  assert.strictEqual(kv.get(`rio:stats:${hoy}`).get('pago'), 1);
  assert.strictEqual(kv.get(`rio:ev:${hoy}`).get('checkout_started'), 1);
});

test('los errores se agregan de forma anónima por calle, posición y tipo; los aciertos no', async () => {
  const kv = entorno();
  const { semana } = require('../../lib/eventos');
  await enviar({ e: 'user_action_recorded', aid: 'aaaaaaaa1', p: { s: 3, pos: 'BB', rec: 'FOLD', act: 'CALL', g: 'bad' } });
  await enviar({ e: 'user_action_recorded', aid: 'bbbbbbbb2', p: { s: 3, pos: 'BB', rec: 'FOLD', act: 'CALL', g: 'bad' } });
  await enviar({ e: 'user_action_recorded', aid: 'cccccccc3', p: { s: 1, pos: 'BTN', rec: 'CALL', act: 'CALL', g: 'ok' } });
  const leaks = kv.get(`rio:leaks:${semana(hoy)}`);
  assert.strictEqual(leaks.get('3|BB|CALL>FOLD'), 2);
  assert.strictEqual(leaks.size, 1);
});

test('el recorrido guarda solo los primeros 60 eventos', async () => {
  const kv = entorno();
  for (let i = 0; i < 65; i++) await enviar({ e: 'training_completed', aid: 'largo12345' });
  assert.strictEqual(kv.get('rio:j:largo12345').length, 60);
});

test('resumen de producto: embudo, activos, retención, contenidos y errores (solo con clave o admin)', async () => {
  entorno();
  const ayer = new Date(Date.parse(hoy + 'T12:00:00Z') - 86400000).toISOString().slice(0, 10);
  await enviar({ e: 'app_open', aid: 'usuario001', fd: hoy, c: 'v1' });
  await enviar({ e: 'app_open', aid: 'usuario002', fd: hoy });
  await enviar({ e: 'analysis_completed', aid: 'usuario001', fd: hoy, c: 'v1', p: { n: 1 } });
  await enviar({ e: 'analysis_completed', aid: 'usuario001', fd: hoy, c: 'v1', p: { n: 2 } });
  await enviar({ e: 'app_open', aid: 'usuario003', fd: ayer }); // llegó ayer y hoy ha vuelto
  const stats = require('../../lib/routes/stats');
  const sinPermiso = fakeRes();
  await stats({ method: 'GET', query: { vista: 'producto' }, headers: {} }, sinPermiso);
  assert.strictEqual(sinPermiso.statusCode, 403);
  const res = fakeRes();
  await stats({ method: 'GET', query: { vista: 'producto' }, headers: { 'x-api-key': 'clave-de-servicio-larga' } }, res);
  assert.strictEqual(res.statusCode, 200);
  const r = res.body;
  const paso = (e) => r.embudo7.find(x => x.evento === e).usuarios;
  assert.strictEqual(paso('app_open'), 3);
  assert.strictEqual(paso('analysis_completed'), 1);
  assert.strictEqual(paso('analysis_repeat'), 1);
  assert.strictEqual(r.activos.hoy, 3);
  assert.strictEqual(r.retencion.find(x => x.dia === ayer).d1, 1);
  assert.strictEqual(r.contenidos[0].id, 'v1');
  assert.strictEqual(r.contenidos[0].analizaron, 1);

  const rec = fakeRes();
  await stats({ method: 'GET', query: { vista: 'recorridos', tipo: 'nuevos' }, headers: { 'x-api-key': 'clave-de-servicio-larga' } }, rec);
  assert.ok(rec.body.length >= 2);
  assert.ok(rec.body.every(u => /^u\d+$/.test(u.usuario))); // sin identificadores reales
});
