// Función serverless de Vercel. "Cuéntame tu mano": recibe el relato de una
// mano en español (escrito o dictado por voz) y le pide a Claude que lo
// convierta en cartas, posiciones y secuencia de apuestas.
//
// Solo para suscriptores PRO. Cada relato gasta un uso del mismo cupo que las
// fotos (150 al mes + créditos extra, ver lib/quota.js).
//
// Variables de entorno necesarias en Vercel:
//   ANTHROPIC_API_KEY, STRIPE_SECRET_KEY, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN

const { emailFromRequest, isPro } = require('../lib/auth');
const { chargeUse } = require('../lib/quota');

const MAX_TEXT = 3000;

const PROMPT = `Eres un asistente que convierte el relato de una mano de Texas Hold'em No Limit, contado en español por el jugador ("héroe"), en datos estructurados.

Devuelve ÚNICAMENTE un objeto JSON (sin texto adicional, sin markdown) con esta forma exacta:
{
  "heroCards": "As Kh" o null,
  "board": "Kd 7c 2h 4s Qd" o null,
  "heroPos": "BTN" o null,
  "villPos": "BB" o null,
  "bigBlind": 2 o null,
  "rivals": 1 o null,
  "heroStack": 200 o null,
  "villStack": 180 o null,
  "tournament": true, false o null,
  "actions": [
    { "street": "preflop", "who": "hero", "type": "raise", "amount": 6 }
  ],
  "notes": ["frases cortas en español sobre lo que has tenido que suponer"]
}

Reglas:
- Cartas en formato rango+palo: rango en 2-9,T,J,Q,K,A (T = diez); palo en h,d,c,s (corazones, diamantes, tréboles, picas). Nunca repitas una carta.
- Palabras de las cartas en español: "as"/"ases" = A, "rey"/"reyes" = K, "reina"/"dama"/"reinas" = Q, "jota"/"jotas"/"J" = J, "diez"/"dieces" = T, y "dos" a "nueve" = 2-9. "Pareja de X" o "doble X" = dos cartas de ese rango. "AK", "A-K", "as-rey" = as y rey; "suited"/"del mismo palo" = mismo palo; "offsuit"/"de distinto palo" = palos distintos.
- El texto puede venir de un dictado por voz con errores: "as" puede aparecer como "has", "hace" o "az". Si el propio relato se contradice sobre una carta (por ejemplo, dice "as-rey" y luego nombra otra carta), usa la interpretación más lógica y explícalo en "notes". Si no hay contradicción, respeta lo que dice.
- "board" son las comunitarias en orden: 3 del flop, luego turn, luego river (solo las que se mencionen).
- Si el jugador no dice los palos, elige palos distintos entre sí salvo que diga "del mismo palo", "suited", "dos corazones", "proyecto de color", etc., y añade en "notes" que has supuesto los palos.
- Posiciones posibles: UTG, HJ, CO, BTN, SB, BB. "botón" = BTN, "ciega pequeña" = SB, "ciega grande" = BB, "cutoff" = CO, "hijack" = HJ, "UTG" o "primero en hablar" = UTG. Si no se sabe, null.
- "villPos" y todas las acciones de "villain" se refieren al rival principal (el que sigue en la mano con el héroe hasta el final, o el que más apuesta). "rivals" = cuántos rivales siguen en la mano al final.
- "actions" en orden cronológico, solo del héroe ("hero") y del rival principal ("villain"). "street": preflop, flop, turn o river.
- "type": "check" (pasar), "bet" (apostar cuando nadie ha apostado en esa calle), "call" (pagar/igualar), "raise" (subir/resubir/3-bet/all-in por encima de una apuesta), "fold" (retirarse/tirar/foldear).
- "amount": para "bet" la cantidad apostada; para "raise" el TOTAL al que sube en esa calle ("subí a 6" = 6); para check, call y fold pon null. Preflop, abrir subiendo es "raise" (ya hay una ciega grande puesta).
- Si el jugador habla en ciegas grandes ("subí a 3 ciegas"), pon "bigBlind": 1 y todas las cantidades en ciegas. Si dice las ciegas ("jugábamos 1/2"), "bigBlind" es la grande.
- "tournament": true si habla de torneo, false si de cash/partida de dinero, null si no se sabe.
- No inventes datos que no se deduzcan del relato: usa null o déjalos fuera, y explícalo en "notes".`;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Método no permitido' }); return; }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) { res.status(500).json({ error: 'ANTHROPIC_API_KEY no configurada en Vercel' }); return; }
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) { res.status(500).json({ error: 'STRIPE_SECRET_KEY no configurada en Vercel' }); return; }

  const text = String((req.body && req.body.text) || '').trim();
  if (text.length < 15) { res.status(400).json({ error: 'Cuéntame un poco más de la mano: tus cartas, las de la mesa y qué apostó cada uno.' }); return; }
  if (text.length > MAX_TEXT) { res.status(400).json({ error: 'El relato es demasiado largo. Cuenta solo una mano.' }); return; }

  let email;
  try {
    email = await emailFromRequest(req);
    if (!email) { res.status(401).json({ error: 'Inicia sesión con tu email de RÍO PRO para usar esta función.' }); return; }
    if (!(await isPro(email, stripeKey))) { res.status(402).json({ error: 'Esta función es solo para suscriptores de RÍO PRO.' }); return; }
  } catch (e) {
    res.status(500).json({ error: 'No se pudo comprobar la suscripción' }); return;
  }

  let refund = async () => {};
  try {
    const charge = await chargeUse(email);
    if (!charge.ok) {
      res.status(403).json({ error: 'LIMIT_REACHED', message: 'Has usado tus 150 usos incluidos este mes. Compra más créditos para seguir.' });
      return;
    }
    refund = charge.refund;
  } catch (e) {
    res.status(500).json({ error: 'No se pudo comprobar tu saldo' }); return;
  }

  try {
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 1500,
        // Pasar un relato a datos es una tarea directa: sin "pensar" es más rápido y más barato.
        thinking: { type: 'disabled' },
        system: PROMPT,
        messages: [{ role: 'user', content: `Relato de la mano:\n"""\n${text}\n"""` }]
      })
    });
    const data = await aiRes.json();
    if (!aiRes.ok) {
      await refund();
      res.status(502).json({ error: (data && data.error && data.error.message) || 'Error al consultar el modelo' });
      return;
    }
    const out = (data.content || []).map(b => b.text || '').join('').trim();
    const clean = out.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
    let parsed;
    try { parsed = JSON.parse(clean); }
    catch (e) { await refund(); res.status(502).json({ error: 'No se pudo entender el relato. Prueba a contarlo con más detalle.' }); return; }
    res.status(200).json(parsed);
  } catch (e) {
    await refund();
    res.status(500).json({ error: 'No se pudo analizar el relato' });
  }
};
