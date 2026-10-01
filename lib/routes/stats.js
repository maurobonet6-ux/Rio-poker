// Estadísticas (solo administradores, o con la clave de servicio STATS_KEY en la cabecera
// x-api-key, pensada para n8n y para el equipo de marketing automático).
//   GET /api/stats                          → { dias, porOrigen, cuentasTotales }   (lo de siempre)
//   GET /api/stats?vista=producto           → embudo, usuarios activos, retención, usos, contenidos y errores comunes
//   GET /api/stats?vista=recorridos&tipo=nuevos|pagaron → qué hicieron (sin datos personales)

const { accesoServicio, cabecerasServicio } = require('../servicio');
const { resumen } = require('../stats');
const { producto, recorridos } = require('../eventos');

module.exports = async (req, res) => {
  cabecerasServicio(res, 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  try {
    if (!(await accesoServicio(req))) { res.status(403).json({ error: 'Solo para administradores' }); return; }
    const q = req.query || {};
    if (q.vista === 'producto') { res.status(200).json(await producto(14)); return; }
    if (q.vista === 'recorridos') { res.status(200).json(await recorridos(q.tipo === 'pagaron' ? 'pagaron' : 'nuevos', q.n)); return; }
    res.status(200).json(await resumen(14));
  } catch (e) {
    res.status(500).json({ error: 'No se pudieron cargar las estadísticas' });
  }
};
