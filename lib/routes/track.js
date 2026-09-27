// Función serverless de Vercel. La página avisa aquí (con navigator.sendBeacon) cuando
// alguien analiza una mano o pulsa pagar, para las estadísticas del administrador.
// No guarda nada personal. Límite por IP para que nadie infle los números.
//   POST /api/track?e=analisis|pago

const { contar } = require('../stats');
const { allowByIp } = require('../auth');

const PERMITIDOS = ['analisis', 'pago'];

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Método no permitido' }); return; }
  const evento = String((req.query && req.query.e) || '');
  if (!PERMITIDOS.includes(evento)) { res.status(400).json({ error: 'Evento no válido' }); return; }
  try {
    if (await allowByIp(req, 'track', 300, 24 * 60 * 60)) await contar(evento);
  } catch (e) { /* las estadísticas nunca deben romper la web */ }
  res.status(204).end();
};
