// Función serverless de Vercel que agrupa las operaciones de cuenta (inicio de
// sesión, estado PRO y contadores de uso). Están juntas porque el plan
// gratuito de Vercel permite como máximo 12 funciones por proyecto.
//
// Las direcciones de siempre (/api/send-code, /api/check-pro, …) siguen
// funcionando: vercel.json las redirige aquí con ?action=…

const routes = {
  'send-code': require('../lib/routes/send-code'),
  'verify-code': require('../lib/routes/verify-code'),
  'logout': require('../lib/routes/logout'),
  'session': require('../lib/routes/session'),
  'check-pro': require('../lib/routes/check-pro'),
  'free-use': require('../lib/routes/free-use'),
  'photo-usage': require('../lib/routes/photo-usage'),
  'track': require('../lib/routes/track'),
  'stats': require('../lib/routes/stats')
};

module.exports = async (req, res) => {
  const handler = routes[(req.query && req.query.action) || ''];
  if (!handler) { res.status(404).json({ error: 'Operación no encontrada' }); return; }
  return handler(req, res);
};
