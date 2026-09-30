// Función serverless de Vercel. Estadísticas de los últimos días (solo administradores).
//   GET /api/stats → { dias: [...], porOrigen: {...}, cuentasTotales }
// También se puede leer con la clave de servicio (STATS_KEY) en la cabecera x-api-key,
// pensada para automatizaciones como n8n.

const crypto = require('crypto');

const { emailFromRequest, isAdmin } = require('../auth');
const { resumen } = require('../stats');

function claveValida(req){
  const esperada = process.env.STATS_KEY || '';
  const recibida = String((req.headers && req.headers['x-api-key']) || '');
  if (esperada.length < 16 || !recibida) return false;
  const a = crypto.createHash('sha256').update(recibida).digest();
  const b = crypto.createHash('sha256').update(esperada).digest();
  return crypto.timingSafeEqual(a, b);
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, x-api-key');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  try {
    if (!claveValida(req)) {
      const email = await emailFromRequest(req);
      if (!email || !isAdmin(email)) { res.status(403).json({ error: 'Solo para administradores' }); return; }
    }
    res.status(200).json(await resumen(14));
  } catch (e) {
    res.status(500).json({ error: 'No se pudieron cargar las estadísticas' });
  }
};
