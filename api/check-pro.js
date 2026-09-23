// Función serverless de Vercel. Comprueba en Stripe si un email tiene
// una suscripción activa a RÍO PRO. No guarda nada: pregunta a Stripe
// en cada llamada, así que si el usuario cancela, deja de ser PRO.

const { hasActiveSubscription } = require('../lib/stripe');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const email = (req.query.email || '').trim().toLowerCase();
  if (!email) { res.status(400).json({ error: 'Falta el email' }); return; }

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) { res.status(500).json({ error: 'STRIPE_SECRET_KEY no configurada en Vercel' }); return; }

  try {
    const pro = await hasActiveSubscription(email, key);
    res.status(200).json({ pro });
  } catch (e) {
    res.status(500).json({ error: 'No se pudo consultar Stripe' });
  }
};

