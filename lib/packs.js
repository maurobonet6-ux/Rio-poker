// Packs de créditos de IA que se venden en Stripe (pago único).
//
// Un pack se reconoce, por este orden:
//  1. Por su Price ID, si está en CREDIT_PACKS ("priceId:créditos,…") o es el
//     pack antiguo (CREDIT_PACK_PRICE_ID, con CREDITS_PER_PACK créditos, 50).
//  2. Si no, por el importe de un pago único (no suscripción), en céntimos:
//     CREDIT_PACK_AMOUNTS o, por defecto, 2,99 € → 100, 6,99 € → 300 y
//     17,99 € → 1.000 créditos. Así no hace falta configurar nada en Vercel.

function parsePairs(str) {
  const out = {};
  String(str || '').split(',').forEach(entry => {
    const [k, n] = entry.trim().split(':');
    const credits = parseInt(n, 10);
    if (k && credits > 0) out[k.trim()] = credits;
  });
  return out;
}

function creditPacks() {
  const packs = parsePairs(process.env.CREDIT_PACKS);
  const legacy = process.env.CREDIT_PACK_PRICE_ID;
  if (legacy && !packs[legacy]) packs[legacy] = parseInt(process.env.CREDITS_PER_PACK || '50', 10);
  return packs;
}

function packAmounts() {
  return parsePairs(process.env.CREDIT_PACK_AMOUNTS || '299:100,699:300,1799:1000');
}

// Créditos que da una lista de line_items de Stripe (0 si no hay ningún pack).
function creditsForItems(items) {
  const packs = creditPacks(), amounts = packAmounts();
  return (items || []).reduce((total, it) => {
    const price = it.price || {};
    let per = packs[price.id];
    if (!per && price.type === 'one_time' && price.currency === 'eur') per = amounts[String(price.unit_amount)];
    return per ? total + per * (it.quantity || 1) : total;
  }, 0);
}

module.exports = { creditPacks, creditsForItems };
