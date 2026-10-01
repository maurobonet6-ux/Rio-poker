// La página avisa aquí (con navigator.sendBeacon) de lo que hace el usuario, para las
// estadísticas del administrador y del equipo de marketing. No guarda nada personal: solo el
// evento, un identificador anónimo del navegador y datos cortos de la jugada (ver lib/eventos.js).
// Límite por IP para que nadie infle los números.
//   POST /api/track  { e, aid, fd, c, p }      (texto JSON)
//   POST /api/track?e=analisis|pago            (forma antigua; sigue funcionando)

const { contar } = require('../stats');
const { allowByIp } = require('../auth');
const { normalizar, registrar, LEGADO } = require('../eventos');

function leerCuerpo(req){
  let b = req.body;
  if (typeof b === 'string'){ try { b = JSON.parse(b); } catch (e) { b = null; } }
  if (Buffer.isBuffer(b)){ try { b = JSON.parse(b.toString('utf8')); } catch (e) { b = null; } }
  return b && typeof b === 'object' ? b : {};
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Método no permitido' }); return; }
  const cuerpo = leerCuerpo(req);
  const evento = normalizar({ ...cuerpo, e: (req.query && req.query.e) || cuerpo.e });
  if (!evento) { res.status(400).json({ error: 'Evento no válido' }); return; }
  try {
    if (await allowByIp(req, 'track', 600, 24 * 60 * 60)) {
      if (LEGADO[evento.e]) await contar(LEGADO[evento.e]);
      try { await registrar(evento); } catch (e) { /* sin Redis /pipeline: al menos queda lo de siempre */ }
    }
  } catch (e) { /* las estadísticas nunca deben romper la web */ }
  res.status(204).end();
};
