// Función serverless de Vercel. Segundo paso del inicio de sesión: comprueba
// el código enviado por /api/send-code y, si es correcto, devuelve un token
// de sesión que la página guarda y envía en las siguientes peticiones.

const crypto = require('crypto');
const { redisCmd } = require('../redis');
const { createSession, isPro } = require('../auth');

const MAX_TRIES = 5;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Método no permitido' }); return; }

  const email = ((req.body && req.body.email) || '').trim().toLowerCase();
  const code = String((req.body && req.body.code) || '').trim();
  if (!email || !/^\d{6}$/.test(code)) { res.status(400).json({ error: 'Escribe el código de 6 dígitos.' }); return; }

  try {
    const triesKey = `rio:codetries:${email}`;
    const tries = await redisCmd(['INCR', triesKey]);
    await redisCmd(['EXPIRE', triesKey, 10 * 60]);
    if (tries > MAX_TRIES) {
      await redisCmd(['DEL', `rio:code:${email}`]);
      res.status(429).json({ error: 'Demasiados intentos. Pide un código nuevo.' });
      return;
    }

    const expected = await redisCmd(['GET', `rio:code:${email}`]);
    const ok = expected && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(code));
    if (!ok) {
      res.status(401).json({ error: 'Código incorrecto o caducado.' });
      return;
    }

    await redisCmd(['DEL', `rio:code:${email}`, triesKey]);
    const token = await createSession(email);
    let pro = false;
    try { pro = !!process.env.STRIPE_SECRET_KEY && await isPro(email, process.env.STRIPE_SECRET_KEY); } catch (e) {}
    res.status(200).json({ token, email, pro });
  } catch (e) {
    res.status(500).json({ error: 'No se pudo comprobar el código' });
  }
};
