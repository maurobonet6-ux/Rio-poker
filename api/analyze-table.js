// Función serverless de Vercel. Recibe una captura de la mesa (imagen en base64)
// y le pide a Claude que extraiga mano, board, bote, stacks y posiciones.
// Solo para suscriptores: comprueba con Stripe que el email enviado tiene una
// suscripción activa ANTES de llamar a la IA, para no pagar por usos no pagados.
// Requiere las variables de entorno ANTHROPIC_API_KEY y STRIPE_SECRET_KEY en Vercel
// (Project Settings → Environment Variables).

async function hasActiveSubscription(email, stripeKey){
  if (!email) return false;
  const custRes = await fetch(
    `https://api.stripe.com/v1/customers?email=${encodeURIComponent(email)}&limit=10`,
    { headers: { Authorization: `Bearer ${stripeKey}` } }
  );
  const custData = await custRes.json();
  if (!custData.data || custData.data.length === 0) return false;
  for (const customer of custData.data) {
    const subRes = await fetch(
      `https://api.stripe.com/v1/subscriptions?customer=${customer.id}&status=active&limit=5`,
      { headers: { Authorization: `Bearer ${stripeKey}` } }
    );
    const subData = await subRes.json();
    if (subData.data && subData.data.length > 0) return true;
  }
  return false;
}

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

  try {
    const pro = await hasActiveSubscription((email || '').trim().toLowerCase(), stripeKey);
    if (!pro) {
      res.status(402).json({ error: 'Esta función es solo para suscriptores de RÍO PRO.' });
      return;
    }
  } catch (e) {
    res.status(500).json({ error: 'No se pudo comprobar la suscripción' });
    return;
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
