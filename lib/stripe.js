// Funciones compartidas para hablar con Stripe desde varias funciones serverless.

async function findCustomers(email, stripeKey) {
  const r = await fetch(
    `https://api.stripe.com/v1/customers?email=${encodeURIComponent(email)}&limit=10`,
    { headers: { Authorization: `Bearer ${stripeKey}` } }
  );
  const data = await r.json();
  return data.data || [];
}

async function hasActiveSubscription(email, stripeKey) {
  if (!email) return false;
  const customers = await findCustomers(email, stripeKey);
  for (const customer of customers) {
    const r = await fetch(
      `https://api.stripe.com/v1/subscriptions?customer=${customer.id}&status=active&limit=5`,
      { headers: { Authorization: `Bearer ${stripeKey}` } }
    );
    const data = await r.json();
    if (data.data && data.data.length > 0) return true;
  }
  return false;
}

module.exports = { findCustomers, hasActiveSubscription };
