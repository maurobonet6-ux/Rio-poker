// Ajuste de tiempos entre la animación y la voz en off.
// Cada formato está diseñado con una línea de tiempo fija (la «hora de diseño»). Si una frase de la voz dura más de lo que
// cabe antes del siguiente momento de la animación, se hace una PAUSA: la pantalla se queda quieta unos instantes en el último
// fotograma del tramo, y todo lo que viene después se retrasa lo mismo. Así la voz nunca se pisa con lo siguiente.
//
// frases: [{ id, en, limite }] en orden. en = hora de diseño en la que empieza la frase; limite = hora de diseño del
// siguiente momento de la animación que la frase no debe pisar. dur: { id: segundos de la frase }.

// Devuelve { pausas, fuera(d), diseno(t), inicios, total }:
//  · fuera(d): de hora de diseño a hora real del vídeo (suma las pausas anteriores)
//  · diseno(t): al revés; durante una pausa devuelve la hora de diseño en la que se queda congelada
function ajustar(frases, dur, totalDiseno, margen = 0.35){
  const pausas = [];
  const fuera = d => d + pausas.filter(p => p.en <= d).reduce((a, p) => a + p.dur, 0);
  const inicios = {};
  for (const f of frases){
    const d = dur[f.id];
    if (d == null) continue;
    const inicio = fuera(f.en), fin = inicio + d + margen, tope = fuera(f.limite - 1e-6);
    inicios[f.id] = inicio;
    if (tope < fin) pausas.push({ en: f.limite - 1e-6, dur: +(fin - tope).toFixed(3) });
  }
  const diseno = t => {
    let acumulado = 0;
    for (const p of pausas){
      const desde = p.en + acumulado;
      if (t < desde) break;
      if (t < desde + p.dur) return p.en;
      acumulado += p.dur;
    }
    return t - acumulado;
  };
  return { pausas, fuera, diseno, inicios, total: fuera(totalDiseno) };
}

// Sin voz: la hora real es la de diseño.
const SIN_PAUSAS = { pausas: [], fuera: d => d, diseno: t => t, inicios: {}, get total(){ return null; } };

module.exports = { ajustar, SIN_PAUSAS };
