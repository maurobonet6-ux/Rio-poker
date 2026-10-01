// Cola de contenidos: crear piezas, cambiarlas de estado, métricas, lo que trae cada una y quién puede usarla.
const test = require('node:test');
const assert = require('node:assert');
const { entorno, fakeRes } = require('./redis-memoria');

const CLAVE = { 'x-api-key': 'clave-de-servicio-larga' };
const api = async (method, { query = {}, body, headers = CLAVE } = {}) => {
  const res = fakeRes();
  await require('../../lib/routes/content')({ method, query, body, headers }, res);
  return res;
};

test('sin clave ni admin no se puede usar', async () => {
  entorno();
  assert.strictEqual((await api('GET', { headers: {} })).statusCode, 403);
  assert.strictEqual((await api('POST', { body: { accion: 'crear' }, headers: { 'x-api-key': 'otra' } })).statusCode, 403);
});

test('crear una idea con varias piezas, cada una con su enlace /v/<id>; los valores raros se limpian', async () => {
  entorno();
  const r = await api('POST', { body: { accion: 'crear', piezas: [
    { idea_id: 'river-call-1', status: 'READY_FOR_REVIEW', category: 'decision', source: 'motor', platform: 'tiktok', format: 'video', hook: '¿Pagas aquí?', script: 'x'.repeat(9000) },
    { idea_id: 'river-call-1', status: 'hackeado', category: 'inventada', platform: 'instagram', format: 'carrusel', hook: '3 errores en el river' }
  ] } });
  assert.strictEqual(r.statusCode, 200);
  const [a, b] = r.body;
  assert.strictEqual(a.link, `https://riopoker.es/v/${a.id}`);
  assert.notStrictEqual(a.id, b.id);
  assert.strictEqual(a.status, 'READY_FOR_REVIEW');
  assert.strictEqual(a.script.length, 6000);
  assert.strictEqual(b.status, 'IDEA');       // estado no válido → IDEA
  assert.strictEqual(b.category, 'otro');     // categoría no válida → otro
  const idea = await api('GET', { query: { idea_id: 'river-call-1' } });
  assert.strictEqual(idea.body.length, 2);
});

test('aprobar y publicar mueven la pieza de estado y guardan las fechas; las métricas se guardan', async () => {
  entorno();
  const p = (await api('POST', { body: { accion: 'crear', status: 'READY_FOR_REVIEW', platform: 'telegram', hook: 'Hola' } })).body;
  await api('POST', { body: { accion: 'actualizar', id: p.id, status: 'APPROVED' } });
  const pub = (await api('POST', { body: { accion: 'actualizar', id: p.id, status: 'PUBLISHED' } })).body;
  assert.ok(pub.approved_at && pub.published_at);
  assert.strictEqual((await api('GET', { query: { status: 'READY_FOR_REVIEW' } })).body.length, 0);
  assert.strictEqual((await api('GET', { query: { status: 'PUBLISHED' } })).body.length, 1);
  const m = (await api('POST', { body: { accion: 'metricas', id: p.id, views: 1520, likes: 80, hackeo: 5, comments: -3 } })).body;
  assert.deepStrictEqual([m.metrics.views, m.metrics.likes, m.metrics.hackeo, m.metrics.comments], [1520, 80, undefined, undefined]);
  assert.strictEqual((await api('POST', { body: { accion: 'actualizar', id: '999', status: 'APPROVED' } })).statusCode, 404);
});

test('cada pieza muestra lo que hizo en RÍO la gente que llegó por su enlace, y el resumen las ordena', async () => {
  entorno();
  const p = (await api('POST', { body: { accion: 'crear', status: 'PUBLISHED', platform: 'tiktok', category: 'reto', hook: 'RÍO CHALLENGE #001' } })).body;
  await api('POST', { body: { accion: 'crear', status: 'IDEA', platform: 'seo', category: 'educacion' } });
  const track = require('../../lib/routes/track');
  for (const [e, aid] of [['app_open', 'aaaaaaaa1'], ['app_open', 'bbbbbbbb2'], ['analysis_completed', 'aaaaaaaa1']])
    await track({ method: 'POST', query: {}, body: JSON.stringify({ e, aid, c: p.id }), headers: { 'x-forwarded-for': '1.1.1.1' } }, fakeRes());
  const lista = (await api('GET')).body;
  const mia = lista.find(x => x.id === p.id);
  assert.deepStrictEqual(mia.resultados, { usuarios: 2, cuentas: 0, analizaron: 1, pro: 0 });
  const r = (await api('GET', { query: { vista: 'resumen' } })).body;
  assert.strictEqual(r.porEstado.PUBLISHED, 1);
  assert.strictEqual(r.porEstado.IDEA, 1);
  assert.strictEqual(r.porPlataforma.tiktok, 1);
  assert.strictEqual(r.creadasSemana, 2);
  assert.strictEqual(r.mejores[0].id, p.id);
});
