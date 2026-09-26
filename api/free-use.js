// Función serverless de Vercel. Controla los análisis gratis de las cuentas sin
// suscripción: 5 en total por cuenta, guardados en Redis (no en el navegador,
// así no se reinician abriendo la web en incógnito).
//   GET  → cuántos quedan, sin gastar ninguno.
//   POST → gasta uno (si es PRO no gasta nada).

const { emailFromRequest, isPro } = require('../lib/auth');
const { redisCmd } = require('../lib/redis');

const FREE_ANALYSES = 5;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) { res.status(500).json({ error: 'STRIPE_SECRET_KEY no configurada en Vercel' }); return; }

  try {
    const email = await emailFromRequest(req);
    if (!email) { res.status(401).json({ error: 'Crea tu cuenta gratis o inicia sesión para analizar manos.' }); return; }
    if (await isPro(email, stripeKey)) { res.status(200).json({ pro: true, left: null }); return; }

    const key = `rio:freeuses:${email}`;
    if (req.method === 'POST') {
      const n = await redisCmd(['INCR', key]);
      if (n > FREE_ANALYSES) {
        await redisCmd(['DECR', key]);
        res.status(402).json({ pro: false, left: 0, error: 'Has usado tus análisis gratis.' });
        return;
      }
      res.status(200).json({ pro: false, left: FREE_ANALYSES - n });
      return;
    }
    const used = parseInt((await redisCmd(['GET', key])) || '0', 10);
    res.status(200).json({ pro: false, left: Math.max(0, FREE_ANALYSES - used) });
  } catch (e) {
    res.status(500).json({ error: 'No se pudo comprobar tus análisis gratis' });
  }
};
