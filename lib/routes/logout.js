// Función serverless de Vercel. Cierra la sesión: borra el token de Redis para
// que deje de valer, aunque alguien lo hubiera copiado de ese navegador.

const { destroySession } = require('../auth');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Método no permitido' }); return; }

  try {
    await destroySession(req);
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'No se pudo cerrar la sesión' });
  }
};
