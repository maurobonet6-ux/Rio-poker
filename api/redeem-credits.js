// Función serverless de Vercel. Cuando alguien compra un "paquete de fotos extra"
// en Stripe (pago único), esta función busca esa compra y añade los créditos
// a su saldo en Redis. Se llama al pulsar "Ya compré, actualizar créditos".
//
// Variables de entorno necesarias:
//   STRIPE_SECRET_KEY, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN,
//   CREDIT_PACK_PRICE_ID (el Price ID de Stripe del paquete de fotos extra),
//   CREDITS_PER_PACK (opcional, por defecto 50)

const { findCustomers, hasActiveSubscription } = require('../lib/stripe');
const { redisCmd } = require('../lib/redis');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const email = (req.query.email || '').trim().toLowerCase();
  if (!email) { res.status(400).json({ error: 'Falta el email' }); return; }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) { res.status(500).json({ error: 'STRIPE_SECRET_KEY no configurada' }); return; }
  const priceId = process.env.CREDIT_PACK_PRICE_ID;
  if (!priceId) { res.status(500).json({ error: 'CREDIT_PACK_PRICE_ID no configurada' }); return; }
  const creditsPerPack = parseInt(process.env.CREDITS_PER_PACK || '50', 10);

  try {
    const pro = await hasActiveSubscription(email, stripeKey);
    if (!pro) { res.status(402).json({ error: 'Necesitas ser suscriptor PRO para comprar fotos extra.' }); return; }

    const customers = await findCustomers(email, stripeKey);
    let added = 0;

    for (const customer of customers) {
      const r = await fetch(
        `https://api.stripe.com/v1/checkout/sessions?customer=${customer.id}&limit=50&expand[]=data.line_items`,
        { headers: { Authorization: `Bearer ${stripeKey}` } }
      );
      const data = await r.json();
      for (const session of (data.data || [])) {
        if (session.payment_status !== 'paid') continue;
        const items = (session.line_items && session.line_items.data) || [];
        const matching = items.filter(it => it.price && it.price.id === priceId);
        if (matching.length === 0) continue;

        const already = await redisCmd(['SISMEMBER', `rio:redeemed:${email}`, session.id]);
        if (already === 1) continue;

        const qty = matching.reduce((sum, it) => sum + (it.quantity || 1), 0);
        await redisCmd(['SADD', `rio:redeemed:${email}`, session.id]);
        await redisCmd(['INCRBY', `rio:extra:${email}`, qty * creditsPerPack]);
        added += qty * creditsPerPack;
      }
    }

    const balance = parseInt((await redisCmd(['GET', `rio:extra:${email}`])) || '0', 10);
    res.status(200).json({ added, balance });
  } catch (e) {
    res.status(500).json({ error: 'No se pudo comprobar tus compras de créditos' });
  }
};
