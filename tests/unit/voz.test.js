// Voz en off: ajuste de tiempos entre la animación y la voz, y preparación del texto para que se lea bien.
const test = require('node:test');
const assert = require('node:assert');
const { ajustar } = require('../../marketing/videos/tiempos');
const { normalizarVoz } = require('../../marketing/videos/pronunciacion');

test('si la frase cabe en su hueco no se añade ninguna pausa', () => {
  const a = ajustar([{ id: 'a', en: 1, limite: 5 }], { a: 3 }, 10);
  assert.deepStrictEqual(a.pausas, []);
  assert.strictEqual(a.total, 10);
  assert.strictEqual(a.inicios.a, 1);
  assert.strictEqual(a.fuera(7), 7); assert.strictEqual(a.diseno(7), 7);
});

test('si la frase no cabe, la animación se detiene justo antes del siguiente momento y todo lo posterior se retrasa', () => {
  // la frase empieza en 1 s y dura 6 s: acaba en 7 s (+0,35 de margen) y el siguiente momento era en 5 s → pausa de 2,35 s
  const a = ajustar([{ id: 'a', en: 1, limite: 5 }], { a: 6 }, 10);
  assert.strictEqual(a.pausas.length, 1);
  assert.ok(Math.abs(a.pausas[0].dur - 2.35) < 0.01);
  assert.ok(a.fuera(5) >= 7.35 - 0.01, 'lo siguiente empieza cuando acaba la voz');
  assert.ok(Math.abs(a.total - 12.35) < 0.01);
  // durante la pausa la pantalla está congelada en la hora de diseño anterior al siguiente momento
  assert.ok(Math.abs(a.diseno(6) - 5) < 0.001);
  assert.ok(Math.abs(a.diseno(7) - 5) < 0.001);
  assert.ok(Math.abs(a.diseno(a.fuera(5) + 0.5) - 5.5) < 0.001);
});

test('ir de la hora de diseño a la real y volver da siempre lo mismo', () => {
  const frases = [{ id: 'a', en: 0.3, limite: 3 }, { id: 'b', en: 3.2, limite: 6 }, { id: 'c', en: 6.5, limite: 10 }];
  const a = ajustar(frases, { a: 5, b: 4.5, c: 2 }, 12);
  assert.ok(a.pausas.length >= 2);
  for (let d = 0; d <= 12; d += 0.25){
    const noEnPausa = !a.pausas.some(p => Math.abs(d - p.en) < 1e-3);
    if (noEnPausa) assert.ok(Math.abs(a.diseno(a.fuera(d)) - d) < 1e-3, 'ida y vuelta en ' + d);
  }
  // las frases nunca se pisan: cada una empieza después de acabar la anterior
  let fin = 0;
  for (const f of frases){ assert.ok(a.inicios[f.id] >= fin - 1e-6, f.id + ' no pisa a la anterior'); fin = a.inicios[f.id] + { a: 5, b: 4.5, c: 2 }[f.id]; }
});

test('la última frase puede alargar el final del vídeo', () => {
  const a = ajustar([{ id: 'cta', en: 8, limite: 10 }], { cta: 5 }, 10);
  assert.ok(a.total >= 13.3, 'el vídeo dura hasta que acaba la voz');
});

test('el tiempo real avanza siempre (nunca hacia atrás)', () => {
  const a = ajustar([{ id: 'a', en: 1, limite: 4 }, { id: 'b', en: 4.5, limite: 8 }], { a: 5, b: 6 }, 10);
  let anterior = -1;
  for (let t = 0; t <= a.total; t += 1 / 30){ const d = a.diseno(t); assert.ok(d >= anterior - 1e-9, 'retrocede en ' + t); anterior = d; }
});

test('el texto se prepara para la voz: porcentajes, signos, siglas y números que cuentan hacia arriba', () => {
  assert.strictEqual(normalizarVoz('¿Qué % necesitas?'), '¿Qué por ciento necesitas?');
  assert.strictEqual(normalizarVoz('100 ÷ 400 = *25 %*'), '100 entre 400 igual a 25 por ciento');
  assert.strictEqual(normalizarVoz('Hay 1.326 manos y un 0,45 %'), 'Hay 1326 manos y un 0 coma 45 por ciento');
  assert.strictEqual(normalizarVoz('Ganas el <span class="count" data-to="45" data-at="11.1">0</span>%'), 'Ganas el 45 por ciento');
  assert.strictEqual(normalizarVoz('A) Stack efectivo'), 'A: Stack efectivo');
  assert.strictEqual(normalizarVoz('RÍO dice: PAGA ✅ 👆'), 'Río dice: PAGA');
  assert.match(normalizarVoz('SPR en UTG con all-in'), /ese pe erre en u te ge con ol in/);
  assert.strictEqual(normalizarVoz('Analiza en riopoker.es'), 'Analiza en río poker punto es');
  assert.ok(!/[<>*%÷×=♠♥♦♣]/.test(normalizarVoz('A♥ 7♥ <b>50 %</b> ÷ × =')), 'no quedan símbolos que la voz lea mal');
});

// ---- Guiones hablados de cada formato ----
const { normalizarVoz: hablar } = require('../../marketing/videos/pronunciacion');
function guionOk(frases, nombre){
  assert.ok(frases.length >= 3, nombre + ': al menos 3 frases');
  assert.strictEqual(new Set(frases.map(f => f.id)).size, frases.length, nombre + ': ids únicos');
  let anterior = -1;
  for (const f of frases){
    assert.ok(f.en > anterior, `${nombre}: ${f.id} empieza después de la anterior`);
    assert.ok(f.limite > f.en, `${nombre}: ${f.id} tiene hueco`);
    anterior = f.en;
    const dicho = hablar(f.texto);
    assert.ok(dicho.length > 5 && dicho.length < 450, `${nombre}: ${f.id} longitud razonable (${dicho.length})`);
    assert.ok(!/[<>*%÷×=♠♥♦♣→·]|&nbsp;|undefined|NaN/.test(dicho), `${nombre}: ${f.id} sin símbolos raros: «${dicho}»`);
  }
}

test('los guiones hablados de concurso, mito y lista están bien formados para toda la base de contenido', () => {
  const { narracion: nConcurso } = require('../../marketing/videos/video-concurso');
  const { narracion: nMito } = require('../../marketing/videos/video-mito');
  const { narracion: nLista } = require('../../marketing/videos/video-lista');
  const { BANCO, pregunta } = require('../../marketing/videos/concurso-preguntas');
  const { MITOS, LISTAS } = require('../../marketing/videos/mito-lista-datos');
  BANCO.forEach((q, i) => guionOk(nConcurso(q), 'banco ' + (i + 1)));
  let s = 3; const azar = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
  for (let i = 0; i < 150; i++) guionOk(nConcurso(pregunta(azar)), 'generada ' + i);
  MITOS.forEach((m, i) => guionOk(nMito(m), 'mito ' + (i + 1)));
  LISTAS.forEach((l, i) => guionOk(nLista(l), 'lista ' + (i + 1)));
});

test('el vídeo se puede hacer sin voz: SIN_VOZ desactiva la voz y un clip de fondo que no existe se ignora', () => {
  const voz = require('../../marketing/videos/voz');
  const antes = process.env.SIN_VOZ; process.env.SIN_VOZ = '1';
  assert.strictEqual(voz.activa(), false);
  process.env.SIN_VOZ = '0'; assert.strictEqual(voz.activa(), true);
  if (antes === undefined) delete process.env.SIN_VOZ; else process.env.SIN_VOZ = antes;
  const { elegirFondo } = require('../../marketing/videos/motor');
  const f = process.env.FONDO, s = process.env.SIN_FONDO;
  process.env.FONDO = '/no/existe.mp4'; assert.strictEqual(elegirFondo(), null);
  process.env.SIN_FONDO = '1'; process.env.FONDO = __filename; assert.strictEqual(elegirFondo(), null);
  delete process.env.SIN_FONDO; process.env.FONDO = __filename; assert.strictEqual(elegirFondo(), __filename);
  if (f === undefined) delete process.env.FONDO; else process.env.FONDO = f; if (s !== undefined) process.env.SIN_FONDO = s;
});
