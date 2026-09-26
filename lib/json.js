// Saca el objeto JSON de la respuesta de la IA aunque venga con texto o
// bloques ```json alrededor. Si no hay JSON válido, lanza un error.
function extractJson(text) {
  const s = String(text || '');
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('La respuesta no contiene JSON');
  return JSON.parse(s.slice(start, end + 1));
}

module.exports = { extractJson };
