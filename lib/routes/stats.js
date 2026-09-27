// Función serverless de Vercel. Estadísticas de los últimos días (solo administradores).
//   GET /api/stats → { dias: [...], porOrigen: {...}, cuentasTotales }

const { emailFromRequest, isAdmin } = require('../auth');
const { resumen } = require('../stats');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  try {
    const email = await emailFromRequest(req);
    if (!email || !isAdmin(email)) { res.status(403).json({ error: 'Solo para administradores' }); return; }
    res.status(200).json(await resumen(14));
  } catch (e) {
    res.status(500).json({ error: 'No se pudieron cargar las estadísticas' });
  }
};
