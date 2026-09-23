// Función serverless de Vercel. Dado un email, dice cuántas fotos ha
// consumido ese mes de las 150 incluidas, y cuántos créditos extra le quedan.
// Solo informa, no descuenta nada.

const { hasActiveSubscription } = require('../lib/stripe');
const { redisCmd } = require('../lib/redis');

const FREE_MONTHLY_PHOTOS = 150;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const email = (req.query.email || '').trim().toLowerCase();
  if (!email) { res.status(400).json({ error: 'Falta el email' }); return; }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) { res.status(500).json({ error: 'STRIPE_SECRET_KEY no configurada' }); return; }

  try {
    const pro = await hasActiveSubscription(email, stripeKey);
    if (!pro) { res.status(200).json({ pro: false }); return; }

    const period = new Date().toISOString().slice(0, 7);
    const used = parseInt((await redisCmd(['GET', `rio:used:${email}:${period}`])) || '0', 10);
    const extra = parseInt((await redisCmd(['GET', `rio:extra:${email}`])) || '0', 10);

    res.status(200).json({ pro: true, used, limit: FREE_MONTHLY_PHOTOS, extra });
  } catch (e) {
    res.status(500).json({ error: 'No se pudo comprobar tu saldo de fotos' });
  }
};
