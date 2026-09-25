// Función serverless de Vercel. Comprueba en Stripe si un email tiene
// una suscripción activa a RÍO PRO. No guarda nada: pregunta a Stripe
// en cada llamada, así que si el usuario cancela, deja de ser PRO.
//
// Además, si el email está en ADMIN_EMAILS (variable de entorno en Vercel,
// separada por comas), se le da acceso PRO sin consultar Stripe — pensado
// para que el dueño de la app entre gratis a probarla.

const { hasActiveSubscription } = require('../lib/stripe');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const email = (req.query.email || '').trim().toLowerCase();
  if (!email) { res.status(400).json({ error: 'Falta el email' }); return; }

  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  if (adminEmails.includes(email)) {
    res.status(200).json({ pro: true, reason: 'admin' });
    return;
  }

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) { res.status(500).json({ error: 'STRIPE_SECRET_KEY no configurada en Vercel' }); return; }

  try {
    const pro = await hasActiveSubscription(email, key);
    res.status(200).json(pro ? { pro: true } : { pro: false, reason: 'no-active-subscription' });
  } catch (e) {
    res.status(500).json({ error: 'No se pudo consultar Stripe' });
  }
};
