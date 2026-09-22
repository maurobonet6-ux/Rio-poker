// Función serverless de Vercel. Comprueba en Stripe si un email tiene
// una suscripción activa a RÍO PRO. No guarda nada: pregunta a Stripe
// en cada llamada, así que si el usuario cancela, deja de ser PRO.

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const email = (req.query.email || '').trim().toLowerCase();
  if (!email) { res.status(400).json({ error: 'Falta el email' }); return; }

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) { res.status(500).json({ error: 'STRIPE_SECRET_KEY no configurada en Vercel' }); return; }

  try {
    // 1) Busca al cliente de Stripe por email
    const custRes = await fetch(
      `https://api.stripe.com/v1/customers?email=${encodeURIComponent(email)}&limit=10`,
      { headers: { Authorization: `Bearer ${key}` } }
    );
    const custData = await custRes.json();
    if (!custData.data || custData.data.length === 0) {
      res.status(200).json({ pro: false, reason: 'no-customer' });
      return;
    }

    // 2) Para cada cliente con ese email, mira si tiene alguna suscripción activa
    for (const customer of custData.data) {
      const subRes = await fetch(
        `https://api.stripe.com/v1/subscriptions?customer=${customer.id}&status=active&limit=5`,
        { headers: { Authorization: `Bearer ${key}` } }
      );
      const subData = await subRes.json();
      if (subData.data && subData.data.length > 0) {
        res.status(200).json({ pro: true });
        return;
      }
    }
    res.status(200).json({ pro: false, reason: 'no-active-subscription' });
  } catch (e) {
    res.status(500).json({ error: 'No se pudo consultar Stripe' });
  }
};
