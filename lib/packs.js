// Packs de créditos de IA que se venden en Stripe (pago único).
//
// CREDIT_PACKS (variable de entorno en Vercel): lista "priceId:créditos"
// separada por comas, p. ej.
//   price_AAA:100,price_BBB:300,price_CCC:1000
// También se sigue reconociendo el pack antiguo (CREDIT_PACK_PRICE_ID, con
// CREDITS_PER_PACK créditos, 50 por defecto) para las compras ya hechas.

function creditPacks() {
  const packs = {};
  String(process.env.CREDIT_PACKS || '').split(',').forEach(entry => {
    const [id, n] = entry.trim().split(':');
    const credits = parseInt(n, 10);
    if (id && credits > 0) packs[id.trim()] = credits;
  });
  const legacy = process.env.CREDIT_PACK_PRICE_ID;
  if (legacy && !packs[legacy]) packs[legacy] = parseInt(process.env.CREDITS_PER_PACK || '50', 10);
  return packs;
}

// Créditos que da una lista de line_items de Stripe (0 si no hay packs).
function creditsForItems(items) {
  const packs = creditPacks();
  return (items || []).reduce((total, it) => {
    const per = it.price && packs[it.price.id];
    return per ? total + per * (it.quantity || 1) : total;
  }, 0);
}

module.exports = { creditPacks, creditsForItems };
