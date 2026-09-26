// Funciones compartidas para hablar con Stripe desde varias funciones serverless.
//
// Un pago se asocia a una cuenta de RÍO de dos formas:
//  1. Por el email con el que se paga (clientes de Stripe con ese email).
//  2. Por el identificador de cuenta que el enlace de pago lleva en
//     client_reference_id (ver accountRef). Al confirmarse el pago, el webhook
//     apunta en Redis que ese cliente de Stripe es de esa cuenta. Así PRO y los
//     packs funcionan aunque se pague con otro email (p. ej. con Apple Pay).

const { redisCmd } = require('./redis');

const linkKey = (email) => `rio:customers:${email}`;

// client_reference_id solo admite letras, números, "-" y "_": el email va en base64url.
function accountRef(email) {
  return 'rio_' + Buffer.from(String(email)).toString('base64url');
}
function accountFromRef(ref) {
  if (typeof ref !== 'string' || !/^rio_[A-Za-z0-9_-]{4,190}$/.test(ref)) return null;
  const email = Buffer.from(ref.slice(4), 'base64url').toString('utf8').trim().toLowerCase();
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? email : null;
}

async function linkCustomer(email, customerId) {
  if (!email || !/^cus_[A-Za-z0-9]+$/.test(String(customerId || ''))) return;
  await redisCmd(['SADD', linkKey(email), customerId]);
}

async function findCustomers(email, stripeKey) {
  const r = await fetch(
    `https://api.stripe.com/v1/customers?email=${encodeURIComponent(email)}&limit=10`,
    { headers: { Authorization: `Bearer ${stripeKey}` } }
  );
  const data = await r.json();
  return data.data || [];
}

// Clientes de Stripe de una cuenta: los de su email y los asociados por el webhook.
async function customersFor(email, stripeKey) {
  const out = await findCustomers(email, stripeKey);
  const seen = new Set(out.map(c => c.id));
  let linked = [];
  try { linked = (await redisCmd(['SMEMBERS', linkKey(email)])) || []; } catch (e) { /* sin Redis: solo por email */ }
  for (const id of linked) if (!seen.has(id)) { seen.add(id); out.push({ id }); }
  return out;
}

async function hasActiveSubscription(email, stripeKey) {
  if (!email) return false;
  const customers = await customersFor(email, stripeKey);
  for (const customer of customers) {
    const r = await fetch(
      `https://api.stripe.com/v1/subscriptions?customer=${customer.id}&status=all&limit=10`,
      { headers: { Authorization: `Bearer ${stripeKey}` } }
    );
    const data = await r.json();
    if ((data.data || []).some(s => s.status === 'active' || s.status === 'trialing')) return true;
  }
  return false;
}

// Por si el aviso de Stripe (webhook) no llegó: busca entre los últimos pagos los hechos
// desde el enlace de esta cuenta (client_reference_id) y los asocia. Solo se llama cuando
// el usuario pulsa "Ya he pagado, comprobar". Devuelve cuántos pagos ha encontrado.
async function claimPayments(email, stripeKey) {
  const ref = accountRef(email);
  const r = await fetch('https://api.stripe.com/v1/checkout/sessions?limit=100',
    { headers: { Authorization: `Bearer ${stripeKey}` } });
  const data = await r.json();
  let found = 0;
  for (const s of (data.data || [])) {
    if (s.client_reference_id !== ref || s.payment_status !== 'paid') continue;
    found++;
    if (s.customer) await linkCustomer(email, s.customer);
  }
  return found;
}

module.exports = { findCustomers, customersFor, hasActiveSubscription, accountRef, accountFromRef, linkCustomer, claimPayments };
