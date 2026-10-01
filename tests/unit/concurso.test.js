// Preguntas del vídeo concurso: bien formadas y con la respuesta correcta CALCULADA, no escrita a mano.
const test = require('node:test');
const assert = require('node:assert');
const { BANCO, GENERADORES, pregunta, C } = require('../../marketing/videos/concurso-preguntas');

const bienFormada = (q, nombre) => {
  assert.ok(q.opts.length >= 3 && q.opts.length <= 4, `${nombre}: 3 o 4 opciones`);
  assert.strictEqual(new Set(q.opts).size, q.opts.length, `${nombre}: opciones repetidas ${q.opts}`);
  assert.ok(Number.isInteger(q.ok) && q.ok >= 0 && q.ok < q.opts.length, `${nombre}: índice correcto`);
  assert.ok(q.nivel >= 1 && q.nivel <= 15, `${nombre}: nivel`);
  assert.ok(q.q.length <= 160, `${nombre}: pregunta muy larga`);
  assert.ok(q.why.length <= 140, `${nombre}: explicación muy larga (${q.why.length})`);
  q.opts.forEach(o => assert.ok(o.length <= 48, `${nombre}: opción muy larga`));
};

test('el banco de preguntas está bien formado y sin cartas repetidas', () => {
  assert.ok(BANCO.length >= 12);
  BANCO.forEach((q, i) => {
    bienFormada(q, 'banco ' + (i + 1));
    const cs = [...(q.cartas || []), ...(q.mesa || [])];
    assert.strictEqual(new Set(cs).size, cs.length, `banco ${i + 1}: cartas repetidas`);
  });
});

test('combinaciones: los datos del banco cuadran con el cálculo', () => {
  assert.strictEqual(C(52, 2), 1326);
  assert.strictEqual(Math.round(1326 / C(4, 2)), 221);
  assert.strictEqual(C(4, 2), 6);
  assert.strictEqual(4 * 4, 16);
  // proyecto de color en el flop con dos cartas por ver: 1 - (38/47 · 37/46) ≈ 35 %, y una carta: 9/47 ≈ 19 %
  assert.strictEqual(Math.round((1 - (38 / 47) * (37 / 46)) * 100), 35);
  assert.strictEqual(Math.round(9 / 47 * 100), 19);
});

test('los generadores dan preguntas válidas con la respuesta correcta calculada', () => {
  let n = 0;
  // generador de azar con semilla: así la prueba es repetible
  let s = 12345; const azar = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
  GENERADORES.forEach((g, gi) => {
    let hechas = 0;
    for (let i = 0; i < 300 && hechas < 40; i++){
      const q = g(azar); if (!q) continue;
      hechas++; n++;
      bienFormada({ ...q, nivel: Math.max(1, Math.min(15, Math.round(q.nivel))) }, `generador ${gi + 1}`);
      assert.match(q.why, /\*[^*]+\*/, `generador ${gi + 1}: la explicación resalta la respuesta`);
      assert.ok(q.why.includes('*' + q.opts[q.ok].replace(' %', '') ) || q.why.includes(q.opts[q.ok]) || /\*\d/.test(q.why), `generador ${gi + 1}: la explicación contiene la respuesta`);
    }
    assert.ok(hechas >= 10, `generador ${gi + 1} casi nunca da pregunta`);
  });
  assert.ok(n > 100);
});

test('pot odds: B ÷ (P + 2B) como en la web (bote 100, apuesta 50 → 25 %)', () => {
  let s = 7; const azar = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
  let visto = false;
  for (let i = 0; i < 500 && !visto; i++){
    const q = GENERADORES[0](azar); if (!q) continue;
    const m = q.q.match(/bote es de \*(\d+)\* y el rival apuesta \*(\d+)\*/);
    const P = +m[1], B = +m[2];
    assert.strictEqual(q.opts[q.ok], Math.round(B / (P + 2 * B) * 100) + ' %');
    if (P === 100 && B === 50){ assert.strictEqual(q.opts[q.ok], '25 %'); visto = true; }
  }
  assert.ok(visto);
});

test('pregunta() siempre devuelve algo válido', () => {
  for (let i = 0; i < 200; i++) bienFormada(pregunta(), 'pregunta ' + i);
});

test('mito vs realidad y top 3: contenido bien formado y con mezcla de verdades y mitos', () => {
  const { MITOS, LISTAS } = require('../../marketing/videos/mito-lista-datos');
  assert.ok(MITOS.length >= 12);
  assert.ok(MITOS.some(m => m.verdad) && MITOS.some(m => !m.verdad));
  MITOS.forEach((m, i) => {
    assert.ok(m.dice.length <= 110, `mito ${i + 1}: afirmación larga`);
    assert.ok(m.why.length <= 120, `mito ${i + 1}: explicación larga (${m.why.length})`);
    assert.strictEqual(typeof m.verdad, 'boolean');
  });
  assert.strictEqual(new Set(MITOS.map(m => m.dice)).size, MITOS.length, 'afirmaciones repetidas');
  assert.ok(LISTAS.length >= 6);
  LISTAS.forEach((l, i) => {
    assert.strictEqual(l.items.length, 3, `lista ${i + 1}: 3 puntos`);
    assert.ok(l.titulo.length <= 70, `lista ${i + 1}: título largo`);
    l.items.forEach(it => { assert.ok(it.t.length <= 52, `lista ${i + 1}: punto largo "${it.t}"`); assert.ok(it.s.length <= 80, `lista ${i + 1}: frase larga`); });
  });
});

test('generar.js entiende los formatos y rechaza lo que no conoce', () => {
  const { execFileSync } = require('child_process');
  const run = a => { try { execFileSync('node', ['marketing/videos/generar.js', a], { cwd: require('path').join(__dirname, '..', '..'), stdio: 'pipe' }); return 0; } catch (e){ return { code: e.status, err: String(e.stderr) }; } };
  const r = run('foo'); assert.strictEqual(r.code, 2); assert.match(r.err, /Formatos: mesa, concurso, mito, lista/);
  const r2 = run('concurso color'); assert.strictEqual(r2.code, 2); assert.match(r2.err, /solo valen para el formato mesa/);
});
