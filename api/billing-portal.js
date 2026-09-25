// Función serverless de Vercel. Abre el portal de cliente de Stripe para que el
// suscriptor cancele, cambie la tarjeta o descargue sus facturas él mismo.
//
// Requisito: activar el portal en Stripe → Configuración → Facturación →
// Portal de clientes (una sola vez).

const { findCustomers } = require('../lib/stripe');
const { emailFromRequest } = require('../lib/auth');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Método no permitido' }); return; }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) { res.status(500).json({ error: 'STRIPE_SECRET_KEY no configurada en Vercel' }); return; }

  try {
    const email = await emailFromRequest(req);
    if (!email) { res.status(401).json({ error: 'Inicia sesión para gestionar tu suscripción.' }); return; }

    const customers = await findCustomers(email, stripeKey);
    if (customers.length === 0) {
      res.status(404).json({ error: 'No hay ninguna suscripción de Stripe con este email.' });
      return;
    }

    // Cada compra por Payment Link puede crear un cliente distinto en Stripe
    // (p. ej. el de los paquetes de fotos), así que elegimos el que tiene la
    // suscripción.
    let customerId = customers[0].id;
    for (const customer of customers) {
      const s = await fetch(
        `https://api.stripe.com/v1/subscriptions?customer=${customer.id}&status=all&limit=1`,
        { headers: { Authorization: `Bearer ${stripeKey}` } }
      );
      const subs = await s.json();
      if (subs.data && subs.data.length > 0) { customerId = customer.id; break; }
    }

    const returnUrl = `https://${req.headers.host}/`;
    const r = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${stripeKey}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ customer: customerId, return_url: returnUrl }).toString()
    });
    const data = await r.json();
    if (!r.ok || !data.url) {
      res.status(502).json({ error: 'No se pudo abrir el portal de Stripe. ¿Está activado el portal de clientes en Stripe?' });
      return;
    }
    res.status(200).json({ url: data.url });
  } catch (e) {
    res.status(500).json({ error: 'No se pudo abrir el portal de Stripe' });
  }
};
