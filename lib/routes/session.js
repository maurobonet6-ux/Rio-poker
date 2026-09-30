// Función serverless de Vercel. Recupera la sesión desde la cookie del servidor cuando el
// navegador ha borrado los datos de la página (por ejemplo, Safari tras unos días sin entrar):
// así no hay que volver a pedir el código por email.

const { emailFromRequest, tokenFromRequest, sessionCookie } = require('../auth');

module.exports = async (req, res) => {
  if (req.method !== 'GET') { res.status(405).json({ error: 'Método no permitido' }); return; }
  try {
    const email = await emailFromRequest(req);
    if (!email) { res.status(401).json({ error: 'Sin sesión' }); return; }
    const token = tokenFromRequest(req);
    res.setHeader('Set-Cookie', sessionCookie(token));
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({ token, email });
  } catch (e) {
    res.status(500).json({ error: 'No se pudo recuperar la sesión' });
  }
};
