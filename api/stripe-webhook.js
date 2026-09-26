// Función serverless de Vercel. Stripe la avisa cuando alguien termina un pago
// y, si ha comprado un pack de créditos de IA, se los suma solo, sin
// tener que pulsar "Ya las compré".
//
// No nos fiamos del contenido que llega: solo cogemos el id del evento y se lo
// volvemos a pedir a Stripe con nuestra clave secreta. Así nadie puede
// inventarse una compra, y no hace falta configurar un "signing secret".
//
// Configuración (una vez): Stripe → Desarrolladores → Webhooks → Añadir
// endpoint → URL https://TU-WEB/api/stripe-webhook, evento
// checkout.session.completed.

const { redisCmd } = require('../lib/redis');
const { creditsForItems } = require('../lib/packs');

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Método no permitido' }); return; }
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) { res.status(500).json({ error: 'Falta STRIPE_SECRET_KEY' }); return; }

  const eventId = req.body && req.body.id;
  if (!eventId || !/^evt_[A-Za-z0-9]+$/.test(eventId)) { res.status(400).json({ error: 'Evento no válido' }); return; }

  try {
    const auth = { headers: { Authorization: `Bearer ${stripeKey}` } };
    const event = await (await fetch(`https://api.stripe.com/v1/events/${eventId}`, auth)).json();
    if (!event || event.type !== 'checkout.session.completed') { res.status(200).json({ ignored: true }); return; }

    const sessionId = event.data && event.data.object && event.data.object.id;
    const session = await (await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${sessionId}?expand[]=line_items`, auth
    )).json();
    if (!session || session.payment_status !== 'paid') { res.status(200).json({ ignored: true }); return; }

    const items = (session.line_items && session.line_items.data) || [];
    const credits = creditsForItems(items);
    const email = String((session.customer_details && session.customer_details.email) || session.customer_email || '').trim().toLowerCase();
    if (!credits || !email) { res.status(200).json({ ignored: true }); return; }

    // Mismo registro que /api/redeem-credits: cada compra se suma una sola vez.
    const isNew = await redisCmd(['SADD', `rio:redeemed:${email}`, session.id]);
    if (isNew === 1) await redisCmd(['INCRBY', `rio:extra:${email}`, credits]);
    res.status(200).json({ ok: true, added: isNew === 1 ? credits : 0 });
  } catch (e) {
    res.status(500).json({ error: 'No se pudo procesar el evento' });
  }
};
