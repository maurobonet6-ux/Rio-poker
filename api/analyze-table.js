// Función serverless de Vercel. Recibe una captura de la mesa (imagen en base64)
// y le pide a Claude que extraiga mano, board, bote, stacks y posiciones.
//
// Solo para suscriptores PRO. Además tiene un límite de 150 fotos/mes incluidas
// en la suscripción; a partir de ahí consume créditos extra comprados aparte
// (ver /api/redeem-credits). Todo esto se guarda en Upstash Redis, no en el
// navegador, para que no se pueda falsear.
//
// Variables de entorno necesarias en Vercel:
//   ANTHROPIC_API_KEY, STRIPE_SECRET_KEY, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN

const { hasActiveSubscription } = require('../lib/stripe');
const { redisCmd } = require('../lib/redis');

const FREE_MONTHLY_PHOTOS = 150;
const USED_TTL_SECONDS = 60 * 60 * 24 * 40; // 40 días, se autolimpia pasado el mes

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Método no permitido' }); return; }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) { res.status(500).json({ error: 'ANTHROPIC_API_KEY no configurada en Vercel' }); return; }
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) { res.status(500).json({ error: 'STRIPE_SECRET_KEY no configurada en Vercel' }); return; }

  const { image, mediaType, email } = req.body || {};
  if (!image) { res.status(400).json({ error: 'Falta la imagen' }); return; }
  const cleanEmail = (email || '').trim().toLowerCase();

  try {
    const pro = await hasActiveSubscription(cleanEmail, stripeKey);
    if (!pro) {
      res.status(402).json({ error: 'Esta función es solo para suscriptores de RÍO PRO.' });
      return;
    }
  } catch (e) {
    res.status(500).json({ error: 'No se pudo comprobar la suscripción' }); return;
  }

  // --- Límite de 150 fotos/mes + créditos extra ---
  try {
    const period = new Date().toISOString().slice(0, 7); // "2026-09"
    const usedKey = `rio:used:${cleanEmail}:${period}`;
    const extraKey = `rio:extra:${cleanEmail}`;

    const used = parseInt((await redisCmd(['GET', usedKey])) || '0', 10);

    if (used < FREE_MONTHLY_PHOTOS) {
      await redisCmd(['INCR', usedKey]);
      await redisCmd(['EXPIRE', usedKey, USED_TTL_SECONDS]);
    } else {
      const extra = parseInt((await redisCmd(['GET', extraKey])) || '0', 10);
      if (extra > 0) {
        await redisCmd(['DECR', extraKey]);
      } else {
        res.status(403).json({
          error: 'LIMIT_REACHED',
          message: 'Has usado tus 150 fotos incluidas este mes. Compra más créditos para seguir.'
        });
        return;
      }
    }
  } catch (e) {
    res.status(500).json({ error: 'No se pudo comprobar tu saldo de fotos' }); return;
  }

  const prompt = `Eres un asistente que lee capturas de pantalla de mesas de póker online (PokerStars, GGPoker, partypoker, apps de móvil, etc.).
Analiza la imagen y devuelve ÚNICAMENTE un objeto JSON (sin texto adicional, sin markdown, sin comillas triples) con esta forma exacta:
{
  "hand": "As Kh" o null,
  "board": "Td 9h 2c" o null,
  "pot": 45.5 o null,
  "call": 12 o null,
  "heroStack": 180 o null,
  "villStack": 220 o null,
  "heroPos": "BTN" o null,
  "villPos": "BB" o null,
  "numRivals": 1 o null
}
Reglas:
- Cartas en formato rango+palo: rango en 2-9,T,J,Q,K,A; palo en h,d,c,s (minúscula). Ejemplo: "Td" = 10 de diamantes.
- "hand" son las dos cartas del jugador cuyo punto de vista se ve (normalmente resaltadas o boca arriba en la parte inferior).
- "board" son las cartas comunitarias visibles en el centro (null si es preflop y no hay ninguna).
- "heroPos" y "villPos" solo si puedes identificar el botón (dealer) u otra marca de posición; usa una de: UTG, HJ, CO, BTN, SB, BB. Si no se aprecia, pon null.
- Si algún dato no se ve con claridad, pon null en vez de inventarlo. No adivines cifras de bote o stacks que no estén escritas en la imagen.
- No añadas ningún campo extra ni explicación fuera del JSON.`;

  try {
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType || 'image/png', data: image } },
            { type: 'text', text: prompt }
          ]
        }]
      })
    });

    const data = await aiRes.json();
    if (!aiRes.ok) {
      res.status(502).json({ error: (data && data.error && data.error.message) || 'Error al consultar el modelo' });
      return;
    }

    const text = (data.content || []).map(b => b.text || '').join('').trim();
    const clean = text.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();

    let parsed;
    try { parsed = JSON.parse(clean); }
    catch (e) { res.status(502).json({ error: 'No se pudo interpretar la respuesta del modelo' }); return; }

    res.status(200).json(parsed);
  } catch (e) {
    res.status(500).json({ error: 'No se pudo analizar la imagen' });
  }
};
