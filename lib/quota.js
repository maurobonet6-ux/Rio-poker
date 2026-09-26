// Créditos de IA de RÍO PRO: 200 al mes incluidos en la suscripción (no se
// acumulan) y, a partir de ahí, créditos extra comprados en packs (no caducan).
// Cada captura o "Cuéntame tu mano" gasta 1 crédito. Se guarda en Upstash
// Redis, no en el navegador.

const { redisCmd } = require('./redis');

const MONTHLY_CREDITS = 200;
const USED_TTL_SECONDS = 60 * 60 * 24 * 40; // 40 días, se autolimpia pasado el mes

// Descuenta un uso. Primero se descuenta y después se comprueba (INCR/DECR son
// atómicos en Redis), así varias peticiones a la vez no pueden pasarse del
// límite. Devuelve { ok: false } si no quedan usos, o { ok: true, refund } para
// devolver el uso si la IA falla.
async function chargeUse(email) {
  const period = new Date().toISOString().slice(0, 7); // "2026-09"
  const usedKey = `rio:used:${email}:${period}`;
  const extraKey = `rio:extra:${email}`;
  let chargedKey;

  const used = await redisCmd(['INCR', usedKey]);
  await redisCmd(['EXPIRE', usedKey, USED_TTL_SECONDS]);
  if (used <= MONTHLY_CREDITS) {
    chargedKey = usedKey;
  } else {
    await redisCmd(['DECR', usedKey]);
    const extraLeft = await redisCmd(['DECR', extraKey]);
    if (extraLeft < 0) {
      await redisCmd(['INCR', extraKey]);
      return { ok: false };
    }
    chargedKey = extraKey;
  }

  const refund = async () => {
    try { await redisCmd([chargedKey === usedKey ? 'DECR' : 'INCR', chargedKey]); } catch (e) {}
  };
  return { ok: true, refund };
}

module.exports = { chargeUse, MONTHLY_CREDITS };
