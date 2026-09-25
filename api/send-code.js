// Función serverless de Vercel. Primer paso del inicio de sesión: si el email
// es de un suscriptor PRO (o admin), le envía un código de 6 dígitos que
// caduca en 10 minutos. El segundo paso es /api/verify-code.
//
// Variables de entorno necesarias:
//   STRIPE_SECRET_KEY, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN,
//   y las del envío de emails (ver lib/mail.js): GMAIL_USER y GMAIL_APP_PASSWORD

const crypto = require('crypto');
const { redisCmd } = require('../lib/redis');
const { isPro } = require('../lib/auth');
const { mailConfigured, sendMail } = require('../lib/mail');

const CODE_TTL_SECONDS = 10 * 60;
const RESEND_WAIT_SECONDS = 60;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Método no permitido' }); return; }

  const email = ((req.body && req.body.email) || '').trim().toLowerCase();
  if (!email || !email.includes('@')) { res.status(400).json({ error: 'Escribe un email válido.' }); return; }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) { res.status(500).json({ error: 'STRIPE_SECRET_KEY no configurada en Vercel' }); return; }
  if (!mailConfigured()) { res.status(500).json({ error: 'GMAIL_USER / GMAIL_APP_PASSWORD no configuradas en Vercel' }); return; }

  try {
    if (!(await isPro(email, stripeKey))) {
      res.status(200).json({ pro: false });
      return;
    }

    // Como mucho un código por minuto para el mismo email.
    const allowed = await redisCmd(['SET', `rio:codewait:${email}`, '1', 'NX', 'EX', RESEND_WAIT_SECONDS]);
    if (allowed !== 'OK') {
      res.status(429).json({ error: 'Ya te enviamos un código. Espera un minuto antes de pedir otro.' });
      return;
    }

    const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    await redisCmd(['SET', `rio:code:${email}`, code, 'EX', CODE_TTL_SECONDS]);
    await redisCmd(['DEL', `rio:codetries:${email}`]);

    try {
      await sendMail({
        to: email,
        subject: `Tu código de RÍO: ${code}`,
        text: `Tu código para iniciar sesión en RÍO PRO es: ${code}\n\nCaduca en 10 minutos. Si no lo has pedido tú, ignora este email.`
      });
    } catch (e) {
      await redisCmd(['DEL', `rio:codewait:${email}`]);
      res.status(502).json({ error: 'No se pudo enviar el email. Inténtalo de nuevo.' });
      return;
    }

    res.status(200).json({ pro: true, sent: true });
  } catch (e) {
    res.status(500).json({ error: 'No se pudo enviar el código' });
  }
};
