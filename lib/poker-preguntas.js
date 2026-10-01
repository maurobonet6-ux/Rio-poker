// (Este archivo lo usan los vídeos de marketing/videos y el bot del canal de Telegram.)
// Preguntas del vídeo «¿Quién sabe más de póker?» (formato concurso, con niveles del 1 al 15).
// Hay dos fuentes:
//  · BANCO: preguntas fijas, todas con datos comprobados (combinaciones, outs, equity de las páginas de la web).
//  · GENERADORES: preguntas con números al azar cuya respuesta se CALCULA, así nunca se repiten y nunca se equivocan.
// Formato: { q, opts: [3 o 4 textos], ok: índice correcto, why, cartas?: ['Ah','7h'], mesa?: [...], nivel: 1..15 }
// En q y why, *así* se resalta en amarillo (q) o en verde (why).

const C = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return Math.round(r); };
const fmt = n => String(n).replace('.', ',');
const pct = x => Math.round(x * 100);

const BANCO = [
  { nivel: 4, cartas: ['Ah', '7h'], mesa: ['Kh', '9h', '2c'],
    q: 'Tienes *proyecto de color* en el flop. ¿Cuántas veces lo ligas si ves *turn y river*?',
    opts: ['35 %', '19 %', '50 %', '65 %'], ok: 0,
    why: 'Un *35 %*: 9 cartas te sirven. Ojo: solo un *19 %* si ves una sola carta 👀' },
  { nivel: 2, q: '¿Cada cuántas manos te tocan *ases* (AA)?', opts: ['1 de cada 50', '1 de cada 221', '1 de cada 1.000', '1 de cada 10'], ok: 1,
    why: '6 combinaciones entre 1.326 manos: *1 de cada 221* (0,45 %).' },
  { nivel: 5, q: '¿Cuántas combinaciones hay de *A K* (suited y offsuit)?', opts: ['8', '12', '16', '24'], ok: 2,
    why: '4 ases × 4 reyes = *16*: 4 suited y 12 offsuit.' },
  { nivel: 3, q: '¿Cuántas combinaciones hay de una *pareja* concreta, por ejemplo KK?', opts: ['4', '6', '12', '16'], ok: 1,
    why: 'Hay 4 reyes y se eligen 2: *6 combinaciones*.' },
  { nivel: 6, q: '¿Cuántas combinaciones de dos cartas hay en una *baraja de 52*?', opts: ['1.326', '2.652', '169', '52'], ok: 0,
    why: '52 × 51 ÷ 2 = *1.326* manos iniciales posibles.' },
  { nivel: 1, q: 'Tienes una escalera de *gutshot* (un solo hueco). ¿Cuántos *outs* tienes?', opts: ['4', '8', '9', '12'], ok: 0,
    why: 'Solo sirve un valor, y hay 4 cartas de cada valor: *4 outs*.' },
  { nivel: 4, q: 'Escalera abierta (8 outs) en el flop. Con la *regla del 4*, ¿qué probabilidad aproximada tienes hasta el river?', opts: ['16 %', '32 %', '24 %', '40 %'], ok: 1,
    why: 'En el flop: outs × 4. 8 × 4 = *32 %*.' },
  { nivel: 2, q: 'Tienes 4 cartas del mismo palo en el flop (2 tuyas y 2 en la mesa). ¿Cuántos *outs* de color tienes?', opts: ['8', '9', '11', '13'], ok: 1,
    why: 'Hay 13 de cada palo y ya ves 4: quedan *9*.' },
  { nivel: 1, q: '¿Cuál es la *mejor posición* de la mesa para jugar después del flop?', opts: ['Botón', 'UTG', 'Ciega pequeña', 'Ciega grande'], ok: 0,
    why: 'En el botón hablas el *último* en todas las calles: ves qué hacen los demás.' },
  { nivel: 3, q: '¿Cómo se calcula el *SPR*?', opts: ['Stack efectivo ÷ bote', 'Bote ÷ stack efectivo', 'Stack × bote', 'Apuesta ÷ bote'], ok: 0,
    why: 'SPR = *stack efectivo ÷ bote*: cuánto te queda por jugar.' },
  { nivel: 7, cartas: ['Qh', 'Qs'], q: '*QQ* contra *AK* all-in antes del flop. ¿Quién es favorito?', opts: ['QQ, ~56 %', 'AK, ~56 %', '50-50 exacto', 'AK, ~65 %'], ok: 0,
    why: 'Es la «moneda al aire», pero *QQ* va algo por delante: ~56 %.' },
  { nivel: 6, cartas: ['Ah', 'As'], q: '*AA* contra *KK* all-in antes del flop. ¿Cuánto gana AA aproximadamente?', opts: ['60 %', '70 %', '82 %', '95 %'], ok: 2,
    why: 'AA gana alrededor del *82 %* y KK solo el 18 %.' },
  { nivel: 5, q: 'Apuestas el *bote entero* de farol. ¿Cuántas veces tiene que retirarse el rival para ganar dinero?', opts: ['33 %', '50 %', '67 %', '25 %'], ok: 1,
    why: 'Arriesgas 1 para ganar 1: al menos *la mitad* de las veces.' },
  { nivel: 2, q: '¿Qué es una *c-bet*?', opts: ['Apuesta en el flop del que subió antes del flop', 'Apuesta de la ciega grande', 'Un all-in preflop', 'Apuesta en el river'], ok: 0,
    why: 'Es la apuesta de *continuación*: la hace en el flop quien subió preflop, haya ligado o no.' },
  { nivel: 3, q: '¿Qué es un *3-bet*?', opts: ['Resubir una subida antes del flop', 'Apostar tres ciegas', 'Subir tres veces el bote', 'Pagar tres veces'], ok: 0,
    why: 'Las ciegas son la 1.ª apuesta, la subida la 2.ª y la resubida el *3-bet*.' },
];

// --- Generadores: cada uno devuelve una pregunta con la respuesta calculada ---
const baraja = (azar, xs) => xs[Math.floor(azar() * xs.length)];
const mezcla = (azar, xs) => { const a = xs.slice(); for (let i = a.length - 1; i > 0; i--){ const j = Math.floor(azar() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// Pone la respuesta correcta en una posición al azar entre distractores únicos.
function montar(azar, correcta, distractores, extra){
  const unicos = [...new Set(distractores.filter(d => d !== correcta))].slice(0, 3);
  const opts = mezcla(azar, [correcta, ...unicos]);
  return { ...extra, opts, ok: opts.indexOf(correcta) };
}

const GENERADORES = [
  // Pot odds: pagas B para un bote final de P + 2B  →  B ÷ (P + 2B)
  azar => {
    const P = baraja(azar, [40, 60, 80, 100, 120, 150, 200]);
    const frac = baraja(azar, [[1, 4], [1, 3], [1, 2], [2, 3], [3, 4], [1, 1]]);
    const B = P * frac[0] / frac[1];
    if (!Number.isInteger(B)) return null;
    const bien = pct(B / (P + 2 * B));
    return montar(azar, bien + ' %', [pct(B / (P + B)) + ' %', pct(B / P) + ' %', pct(B / (2 * P)) + ' %', (bien + 8) + ' %', Math.max(5, bien - 7) + ' %'], {
      nivel: 3 + Math.min(5, frac[0] === frac[1] ? 4 : frac[1] - 1), q: `El bote es de *${P}* y el rival apuesta *${B}*. ¿Qué % necesitas ganar para que *pagar* sea rentable?`,
      why: `Pagas ${B} para ganar un bote de ${P + 2 * B}: ${B} ÷ ${P + 2 * B} = *${bien} %*.` });
  },
  // Regla del 4 y del 2
  azar => {
    const outs = baraja(azar, [4, 6, 8, 9, 12, 15]);
    const flop = azar() < 0.5, mult = flop ? 4 : 2, bien = outs * mult;
    return montar(azar, bien + ' %', [outs * (flop ? 2 : 4) + ' %', (bien + 8) + ' %', Math.max(4, bien - 8) + ' %', (outs * 3) + ' %', (bien + 16) + ' %'], {
      nivel: 4 + (outs > 9 ? 2 : 0), q: `Tienes *${outs} outs* en el ${flop ? 'flop' : 'turn'}. Con la *regla del ${mult}*, ¿qué probabilidad aproximada tienes de ligar hasta el river?`,
      why: `En el ${flop ? 'flop' : 'turn'}: outs × ${mult}. ${outs} × ${mult} = *${bien} %*.` });
  },
  // SPR = stack ÷ bote
  azar => {
    const P = baraja(azar, [10, 20, 25, 40, 50]);
    const S = baraja(azar, [50, 100, 150, 200, 250, 300]);
    const spr = S / P;
    if (!Number.isInteger(spr * 2)) return null;
    const bien = fmt(spr);
    return montar(azar, bien, [fmt(P / S), fmt(spr + 2), fmt(Math.max(1, spr - 2)), fmt(spr * 2), fmt(S - P)], {
      nivel: 5 + (spr > 6 ? 1 : 0), q: `Empieza el flop con un bote de *${P}* y os quedan *${S}* a cada uno. ¿Cuál es el *SPR*?`,
      why: `SPR = stack ÷ bote = ${S} ÷ ${P} = *${bien}*.` });
  },
  // Frecuencia de retirada necesaria para que un farol sea rentable: B ÷ (P + B)
  azar => {
    const P = 100, frac = baraja(azar, [[1, 3], [1, 2], [2, 3], [1, 1], [2, 1]]);
    const B = Math.round(P * frac[0] / frac[1]), bien = pct(B / (P + B));
    return montar(azar, bien + ' %', [pct(B / P) + ' %', pct(B / (P + 2 * B)) + ' %', Math.min(95, bien + 12) + ' %', Math.max(5, bien - 12) + ' %'], {
      nivel: frac[0] >= frac[1] ? 8 : 7, q: `Haces un farol de *${B}* en un bote de *${P}*. ¿Cuántas veces tiene que *retirarse* el rival para ganar dinero?`,
      why: `Arriesgas ${B} para ganar ${P}: ${B} ÷ ${P + B} = *${bien} %*.` });
  },
  // Combinaciones: pares y manos sin pareja
  azar => {
    const tipo = baraja(azar, ['AA', 'KK', '77', 'AK', 'QJ']);
    const par = tipo[0] === tipo[1];
    const bien = par ? C(4, 2) : 16;
    return montar(azar, String(bien), par ? ['4', '8', '12', '16'] : ['4', '8', '12', '24'], {
      nivel: par ? 3 : 5, q: par ? `¿Cuántas *combinaciones* hay de ${tipo} (la pareja)?` : `¿Cuántas *combinaciones* hay de ${tipo[0]} ${tipo[1]} (suited y offsuit)?`,
      why: par ? `Hay 4 cartas de ese valor y se eligen 2: C(4,2) = *6*.` : `4 × 4 = *16* combinaciones: 4 suited y 12 offsuit.` });
  },
];

// Devuelve una pregunta al azar (banco o generada). azar: función que devuelve un número en [0, 1).
function pregunta(azar = Math.random){
  for (let i = 0; i < 50; i++){
    const q = azar() < 0.4 ? { ...baraja(azar, BANCO) } : GENERADORES[Math.floor(azar() * GENERADORES.length)](azar);
    if (q) return { ...q, nivel: Math.max(1, Math.min(15, Math.round(q.nivel))) };
  }
  return { ...BANCO[0] };
}

module.exports = { BANCO, GENERADORES, pregunta, C };
