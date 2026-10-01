// Cola de contenidos (ver lib/contenido.js). Solo el administrador o una automatización con la clave
// STATS_KEY (cabecera x-api-key): n8n y el equipo de marketing automático.
//   GET  /api/content                         → últimas piezas (?status=READY_FOR_REVIEW, ?idea_id=…, ?limit=)
//   GET  /api/content?id=17                   → una pieza
//   GET  /api/content?vista=resumen           → cuántas hay por estado, categoría y red, y las que más usuarios traen
//   POST /api/content  { accion: 'crear', ...pieza }            (o { accion: 'crear', piezas: [...] }, hasta 20)
//   POST /api/content  { accion: 'actualizar', id, ...cambios } (estado, textos, archivos, fecha…)
//   POST /api/content  { accion: 'metricas', id, views, likes, comments, shares, saves, clicks }

const { accesoServicio, cabecerasServicio } = require('../servicio');
const C = require('../contenido');

function cuerpo(req){
  let b = req.body;
  if (typeof b === 'string'){ try { b = JSON.parse(b); } catch (e) { b = null; } }
  return b && typeof b === 'object' ? b : {};
}

module.exports = async (req, res) => {
  cabecerasServicio(res, 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  try {
    if (!(await accesoServicio(req))) { res.status(403).json({ error: 'Solo para administradores' }); return; }
    const q = req.query || {};
    if (req.method === 'GET'){
      if (q.vista === 'resumen') { res.status(200).json(await C.resumen()); return; }
      if (q.id){
        const p = await C.obtener(q.id);
        if (!p) { res.status(404).json({ error: 'No existe esa pieza' }); return; }
        res.status(200).json(p); return;
      }
      res.status(200).json(await C.listar({ status: q.status, limit: q.limit, idea_id: q.idea_id }));
      return;
    }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Método no permitido' }); return; }
    const b = cuerpo(req);
    if (b.accion === 'crear'){
      const lista = Array.isArray(b.piezas) ? b.piezas.slice(0, 20) : [b];
      const creadas = [];
      for (const p of lista) creadas.push(await C.crear(p));
      res.status(200).json(Array.isArray(b.piezas) ? creadas : creadas[0]);
      return;
    }
    if (b.accion === 'actualizar' || b.accion === 'metricas'){
      const p = b.accion === 'actualizar' ? await C.actualizar(b.id, b) : await C.metricas(b.id, b);
      if (!p) { res.status(404).json({ error: 'No existe esa pieza' }); return; }
      res.status(200).json(p);
      return;
    }
    res.status(400).json({ error: 'Acción no válida (crear, actualizar o metricas)' });
  } catch (e) {
    res.status(500).json({ error: 'No se pudo completar la operación de contenidos' });
  }
};
