// Acceso de servicio: el administrador con sesión iniciada, o una automatización (n8n, el equipo de
// marketing) con la clave STATS_KEY en la cabecera x-api-key.

const crypto = require('crypto');
const { emailFromRequest, isAdmin } = require('./auth');

function claveValida(req){
  const esperada = process.env.STATS_KEY || '';
  const recibida = String((req.headers && req.headers['x-api-key']) || '');
  if (esperada.length < 16 || !recibida) return false;
  const a = crypto.createHash('sha256').update(recibida).digest();
  const b = crypto.createHash('sha256').update(esperada).digest();
  return crypto.timingSafeEqual(a, b);
}

async function accesoServicio(req){
  if (claveValida(req)) return true;
  const email = await emailFromRequest(req);
  return !!(email && isAdmin(email));
}

function cabecerasServicio(res, metodos){
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', metodos);
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, x-api-key, Content-Type');
}

module.exports = { accesoServicio, cabecerasServicio, claveValida };
