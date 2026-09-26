// Función serverless de Vercel. Dado el token de sesión (cabecera
// Authorization), dice si ese usuario sigue siendo RÍO PRO. No guarda nada:
// pregunta a Stripe en cada llamada, así que si el usuario cancela, deja de
// ser PRO.
//
// Si el email está en ADMIN_EMAILS (variable de entorno en Vercel, separada
// por comas), se le da acceso PRO sin consultar Stripe — pensado para que el
// dueño de la app entre gratis a probarla (también tiene que iniciar sesión
// con el código que le llega por email).

const { emailFromRequest, isPro, isAdmin } = require('../auth');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) { res.status(500).json({ error: 'STRIPE_SECRET_KEY no configurada en Vercel' }); return; }

  try {
    const email = await emailFromRequest(req);
    if (!email) { res.status(401).json({ error: 'Sesión no válida' }); return; }
    res.status(200).json({ pro: await isPro(email, key), email, admin: isAdmin(email) });
  } catch (e) {
    res.status(500).json({ error: 'No se pudo consultar Stripe' });
  }
};
