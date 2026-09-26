// Función serverless de Vercel. Guarda en la cuenta del usuario (Redis) su
// historial de manos, estadísticas, entrenamiento y ajustes, para que no los
// pierda al cambiar de móvil o de navegador.
//   GET  → devuelve lo guardado.
//   POST → guarda { data } (un objeto JSON de hasta ~200 KB).

const { emailFromRequest } = require('../lib/auth');
const { redisCmd } = require('../lib/redis');

const MAX_BYTES = 200 * 1024;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  try {
    const email = await emailFromRequest(req);
    if (!email) { res.status(401).json({ error: 'Sesión no válida' }); return; }
    const key = `rio:data:${email}`;

    if (req.method === 'POST') {
      const data = req.body && req.body.data;
      if (!data || typeof data !== 'object' || Array.isArray(data)) { res.status(400).json({ error: 'Datos no válidos' }); return; }
      const json = JSON.stringify({ ...data, savedAt: Date.now() });
      if (Buffer.byteLength(json) > MAX_BYTES) { res.status(413).json({ error: 'Demasiados datos' }); return; }
      await redisCmd(['SET', key, json]);
      res.status(200).json({ ok: true });
      return;
    }
    const raw = await redisCmd(['GET', key]);
    res.status(200).json({ data: raw ? JSON.parse(raw) : null });
  } catch (e) {
    res.status(500).json({ error: 'No se pudieron sincronizar tus datos' });
  }
};
