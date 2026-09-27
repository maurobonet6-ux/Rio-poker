// Función serverless de Vercel. Stripe la avisa cuando alguien termina un pago
// y, si ha comprado un pack de créditos de IA, se los suma solo, sin
// tener que pulsar "Ya las compré". Además asocia el cliente de Stripe a la
// cuenta de RÍO que pagó (client_reference_id), por si pagó con otro email.
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
const { accountFromRef, linkCustomer } = require('../lib/stripe');
const { contar } = require('../lib/stats');

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

    // La cuenta de RÍO que pagó (va en el enlace de pago), aunque el email del pago sea otro.
    const account = accountFromRef(session.client_reference_id);
    if (account && session.customer) await linkCustomer(account, session.customer);

    const items = (session.line_items && session.line_items.data) || [];
    const credits = creditsForItems(items);
    const payEmail = String((session.customer_details && session.customer_details.email) || session.customer_email || '').trim().toLowerCase();
    const email = account || payEmail;

    // Estadísticas (una sola vez por pago, aunque Stripe repita el aviso): nuevo PRO o pack,
    // y de qué red social vino esa cuenta.
    try {
      const esSuscripcion = session.mode === 'subscription' || items.some(it => it.price && it.price.type === 'recurring');
      if ((esSuscripcion || credits) && await redisCmd(['SADD', 'rio:stats:pagos', session.id]) === 1){
        const origen = email ? await redisCmd(['GET', `rio:src:${email}`]) : null;
        await contar(esSuscripcion ? 'pro' : 'packs', origen || 'directo');
      }
    } catch (e) { /* las estadísticas nunca deben romper el cobro */ }
    if (!credits || !email) { res.status(200).json({ ok: true, linked: !!account }); return; }

    // Mismo registro que /api/redeem-credits: cada compra se suma una sola vez.
    const isNew = await redisCmd(['SADD', `rio:redeemed:${email}`, session.id]);
    if (isNew === 1) await redisCmd(['INCRBY', `rio:extra:${email}`, credits]);
    res.status(200).json({ ok: true, added: isNew === 1 ? credits : 0 });
  } catch (e) {
    res.status(500).json({ error: 'No se pudo procesar el evento' });
  }
};
