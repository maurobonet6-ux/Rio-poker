// Sesiones de usuario. Al iniciar sesión, el usuario recibe un código de 6
// dígitos en su email (ver /api/send-code y /api/verify-code). Si lo acierta,
// le damos un token de sesión aleatorio que se guarda en Redis apuntando a su
// email. Las demás funciones reciben ese token (cabecera Authorization) en vez
// del email, así nadie puede hacerse pasar por otro solo sabiendo su email.

const crypto = require('crypto');
const { redisCmd } = require('./redis');
const { hasActiveSubscription } = require('./stripe');

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 90; // 90 días

async function createSession(email) {
  const token = crypto.randomBytes(32).toString('hex');
  await redisCmd(['SET', `rio:session:${token}`, email, 'EX', SESSION_TTL_SECONDS]);
  return token;
}

function tokenFromRequest(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  return /^[a-f0-9]{64}$/.test(token) ? token : null;
}

// Devuelve el email de la sesión, o null si el token falta o no es válido.
async function emailFromRequest(req) {
  const token = tokenFromRequest(req);
  if (!token) return null;
  return (await redisCmd(['GET', `rio:session:${token}`])) || null;
}

async function destroySession(req) {
  const token = tokenFromRequest(req);
  if (token) await redisCmd(['DEL', `rio:session:${token}`]);
}

function isAdmin(email) {
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  return adminEmails.includes(email);
}

// PRO = email en ADMIN_EMAILS o con suscripción activa en Stripe.
async function isPro(email, stripeKey) {
  if (isAdmin(email)) return true;
  return hasActiveSubscription(email, stripeKey);
}

// Límite simple por IP (p. ej. para que nadie use el formulario para enviar
// códigos a muchos emails). Devuelve true si todavía está permitido.
async function allowByIp(req, name, limit, windowSeconds) {
  const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const ip = fwd || (req.socket && req.socket.remoteAddress) || 'unknown';
  const key = `rio:rl:${name}:${ip}`;
  const n = await redisCmd(['INCR', key]);
  if (n === 1) await redisCmd(['EXPIRE', key, windowSeconds]);
  return n <= limit;
}

module.exports = { createSession, emailFromRequest, destroySession, isAdmin, isPro, allowByIp };
