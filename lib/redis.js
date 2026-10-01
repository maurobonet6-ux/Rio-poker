// Helper minimalista para Upstash Redis (API REST, sin dependencias npm).
// Requiere UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN en Vercel.

function config(){
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error('UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN no configuradas');
  return { url, token };
}

async function redisCmd(cmd) {
  const { url, token } = config();
  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd)
  });
  const data = await r.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

// Varios comandos en una sola petición (Upstash /pipeline). Devuelve los resultados en orden
// (null en el que falle, sin cortar los demás).
async function redisPipeline(cmds) {
  if (!cmds.length) return [];
  const { url, token } = config();
  const r = await fetch(url.replace(/\/$/, '') + '/pipeline', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmds)
  });
  const data = await r.json();
  if (!Array.isArray(data)) throw new Error((data && data.error) || 'Respuesta de Redis no válida');
  return data.map(x => (x && !x.error ? x.result : null));
}

module.exports = { redisCmd, redisPipeline };
