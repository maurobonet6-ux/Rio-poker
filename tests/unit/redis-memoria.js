// Redis en memoria para las pruebas (órdenes sueltas y /pipeline). Los HyperLogLog se simulan con conjuntos exactos.
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
    SET: (k, v) => { kv.set(k, v); return 'OK'; },
    ZADD: (k, score, v) => { const z = hash(k); const n = z.has(v) ? 0 : 1; z.set(v, +score); return n; },
    ZREM: (k, v) => (kv.has(k) && kv.get(k).delete(v)) ? 1 : 0,
    ZCARD: (k) => kv.has(k) ? kv.get(k).size : 0,
    ZRANGE: (k, a, b, rev) => { const ids = kv.has(k) ? [...kv.get(k)].sort((x, y) => x[1] - y[1]).map(x => x[0]) : []; if (rev === 'REV') ids.reverse(); return ids.slice(a, b + 1); },
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

module.exports = { entorno, fakeRes };
