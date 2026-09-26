// Función serverless de Vercel. Botón "¿Consejo raro?": los usuarios pueden
// avisar de una recomendación que les parece mala, con la mano y un
// comentario. El dueño (emails en ADMIN_EMAILS) los lee desde el menú.
//   POST → guarda un aviso (cualquiera, con límite por IP).
//   GET  → lista los últimos avisos (solo admins).

const { emailFromRequest, isAdmin, allowByIp } = require('../lib/auth');
const { redisCmd } = require('../lib/redis');

const KEY = 'rio:feedback';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  try {
    const email = await emailFromRequest(req);
    if (req.method === 'POST') {
      if (!(await allowByIp(req, 'feedback', 20, 60 * 60))) { res.status(429).json({ error: 'Demasiados avisos. Inténtalo más tarde.' }); return; }
      const b = req.body || {};
      const item = {
        t: Date.now(),
        email: email || null,
        comment: String(b.comment || '').slice(0, 1000),
        summary: String(b.summary || '').slice(0, 3000),
        mode: String(b.mode || '').slice(0, 10)
      };
      if (!item.summary) { res.status(400).json({ error: 'Falta la mano' }); return; }
      await redisCmd(['LPUSH', KEY, JSON.stringify(item)]);
      await redisCmd(['LTRIM', KEY, 0, 499]);
      res.status(200).json({ ok: true });
      return;
    }
    if (!email || !isAdmin(email)) { res.status(403).json({ error: 'Solo para el administrador' }); return; }
    const list = (await redisCmd(['LRANGE', KEY, 0, 99])) || [];
    res.status(200).json({ items: list.map(x => { try { return JSON.parse(x); } catch (e) { return null; } }).filter(Boolean) });
  } catch (e) {
    res.status(500).json({ error: 'No se pudo guardar el aviso' });
  }
};
