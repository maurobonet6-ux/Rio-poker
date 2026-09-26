// Función serverless de Vercel. Dado el token de sesión, dice cuántas fotos ha
// consumido ese mes de las 150 incluidas, y cuántos créditos extra le quedan.
// Solo informa, no descuenta nada.

const { emailFromRequest, isPro } = require('../auth');
const { redisCmd } = require('../redis');

const FREE_MONTHLY_PHOTOS = 150;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) { res.status(500).json({ error: 'STRIPE_SECRET_KEY no configurada' }); return; }

  try {
    const email = await emailFromRequest(req);
    if (!email) { res.status(401).json({ error: 'Sesión no válida' }); return; }
    const pro = await isPro(email, stripeKey);
    if (!pro) { res.status(200).json({ pro: false }); return; }

    const period = new Date().toISOString().slice(0, 7);
    const used = parseInt((await redisCmd(['GET', `rio:used:${email}:${period}`])) || '0', 10);
    const extra = parseInt((await redisCmd(['GET', `rio:extra:${email}`])) || '0', 10);

    res.status(200).json({ pro: true, used, limit: FREE_MONTHLY_PHOTOS, extra });
  } catch (e) {
    res.status(500).json({ error: 'No se pudo comprobar tu saldo de fotos' });
  }
};
