// Estadísticas propias de RÍO (solo las ve el administrador): cuentas nuevas, manos
// analizadas, clics en pagar y nuevos PRO por día, y de qué red social vino cada uno.
// Vercel Analytics cuenta visitas; esto cuenta lo que pasa después de entrar.
//
// En Redis:
//   rio:stats:AAAA-MM-DD  → hash { cuentas, analisis, pago, pro, packs } (se borra a los 120 días)
//   rio:stats:src         → hash { "instagram:cuentas": 3, "instagram:pro": 1, … }
//   rio:src:<email>       → de dónde vino esa cuenta (para saber de dónde vienen los PRO)
//   rio:users             → conjunto con todas las cuentas

const { redisCmd } = require('./redis');

const EVENTOS = ['cuentas', 'analisis', 'pago', 'pro', 'packs'];
const DIAS_GUARDADOS = 120;
const dia = (d = new Date()) => d.toISOString().slice(0, 10);

// Origen legible y seguro: "instagram", "youtube", "directo"…
function limpiarOrigen(src){
  const s = String(src || '').toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 40);
  return s || 'directo';
}

async function contar(evento, origen){
  if (!EVENTOS.includes(evento)) return;
  const key = `rio:stats:${dia()}`;
  await redisCmd(['HINCRBY', key, evento, 1]);
  await redisCmd(['EXPIRE', key, DIAS_GUARDADOS * 86400]);
  if (origen) await redisCmd(['HINCRBY', 'rio:stats:src', `${limpiarOrigen(origen)}:${evento}`, 1]);
}

// Upstash devuelve HGETALL como lista plana [campo, valor, campo, valor…].
function aObjeto(lista){
  const o = {};
  for (let i = 0; i + 1 < (lista || []).length; i += 2) o[lista[i]] = parseInt(lista[i + 1], 10) || 0;
  return o;
}

async function resumen(numDias = 14){
  const dias = [];
  for (let i = 0; i < numDias; i++){
    const d = dia(new Date(Date.now() - i * 86400000));
    const v = aObjeto(await redisCmd(['HGETALL', `rio:stats:${d}`]));
    dias.push({ dia: d, ...Object.fromEntries(EVENTOS.map(e => [e, v[e] || 0])) });
  }
  const porOrigen = {};
  for (const [campo, n] of Object.entries(aObjeto(await redisCmd(['HGETALL', 'rio:stats:src'])))){
    const i = campo.lastIndexOf(':');
    const origen = campo.slice(0, i), evento = campo.slice(i + 1);
    (porOrigen[origen] = porOrigen[origen] || {})[evento] = n;
  }
  const cuentasTotales = parseInt(await redisCmd(['SCARD', 'rio:users']), 10) || 0;
  return { dias, porOrigen, cuentasTotales };
}

module.exports = { contar, resumen, limpiarOrigen, EVENTOS };
