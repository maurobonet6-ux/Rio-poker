// Convierte una mano sencilla (la que escribe Claude desde n8n) en una mano de vídeo, igual que las de manos.js.
// Entrada (JSON):
//   { id, mano: ['Ah','Kd'], mesa: ['Qs','8c','3h'], bote: 18, pagar: 8, stack?: 100, gancho?, nota0?, nota1? }
//   · bote = lo que había + la apuesta del rival · pagar = la apuesta del rival
//   · stack = fichas del rival antes de apostar (si es <= pagar, es all-in)
//   · gancho, nota0, nota1 = textos opcionales (sin HTML) para el título y las frases del vídeo
// Si algo no cuadra, lanza un Error con un mensaje claro en español.
const PALOS = { s: '♠', h: '♥', d: '♦', c: '♣' };
const VALORES = '23456789TJQKA';
const cnt = (n, at) => `<span class="count" data-to="${n}" data-at="${at}">0</span>%`;

const carta = (c) => [c[0] === 'T' ? '10' : c[0], PALOS[c[1]]];
const rangos = (cs) => cs.map(c => (c[0] === 'T' ? '10' : c[0])).join(' ');
const limpio = (s, max = 70) => String(s || '').replace(/[<>&"`]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);

function validar(d){
  if (!d || typeof d !== 'object') throw new Error('La mano no es un objeto JSON');
  if (!/^[a-z0-9-]{1,30}$/.test(String(d.id || ''))) throw new Error('id no válido (solo minúsculas, números y guiones, máximo 30)');
  const esCarta = (c) => typeof c === 'string' && c.length === 2 && VALORES.includes(c[0]) && 'shdc'.includes(c[1]);
  if (!Array.isArray(d.mano) || d.mano.length !== 2 || !d.mano.every(esCarta)) throw new Error('mano debe tener 2 cartas como "Ah", "Td"');
  const mesa = d.mesa || [];
  if (!Array.isArray(mesa) || ![0, 3, 4, 5].includes(mesa.length) || !mesa.every(esCarta)) throw new Error('mesa debe tener 0, 3, 4 o 5 cartas');
  const todas = [...d.mano, ...mesa];
  if (new Set(todas).size !== todas.length) throw new Error('hay cartas repetidas');
  const bote = Number(d.bote), pagar = Number(d.pagar);
  if (!Number.isInteger(bote) || !Number.isInteger(pagar) || pagar < 1 || bote <= pagar) throw new Error('bote y pagar deben ser enteros, con bote mayor que pagar');
  if (bote > 100000) throw new Error('bote demasiado grande');
  const stack = d.stack == null ? Math.max(100, pagar) : Number(d.stack);
  if (!Number.isInteger(stack) || stack < pagar) throw new Error('stack debe ser un entero mayor o igual que pagar');
  return { id: d.id, mano: d.mano, mesa, bote, pagar, stack, gancho: limpio(d.gancho), nota0: limpio(d.nota0), nota1: limpio(d.nota1) };
}

function frase(pagar, antes, allin){
  if (allin) return 'va <em>ALL-IN</em> 😳';
  const r = pagar / antes;
  if (r < 0.4) return 'una apuesta <em>pequeña</em>';
  if (r < 0.65) return '<em>la mitad del bote</em>';
  if (r < 0.9) return '<em>casi el bote</em>';
  if (r < 1.15) return '<em>todo el bote</em>';
  return '<em>más que el bote</em> 😳';
}

// Devuelve { analisis, guion(G) } como las entradas de manos.js. G.badge es la decisión de RÍO ("🟡 PAGA", "🔴 TIRA"…).
function construir(datos){
  const d = validar(datos);
  const antes = d.bote - d.pagar, allin = d.stack <= d.pagar;
  const calle = ['Antes del flop', 'Flop', 'Turn', 'River'][[0, 3, 4, 5].indexOf(d.mesa.length)];
  return {
    analisis: { mano: d.mano, mesa: d.mesa, bote: d.bote, pagar: d.pagar },
    guion: G => {
      const fold = /TIRA/.test(G.badge || '');
      const cap0 = d.gancho || `Tienes <em>${rangos(d.mano)}</em>${d.mesa.length ? '' : ' y te apuestan 😬'}`;
      const sub0 = d.mesa.length ? `${calle}: <b>${rangos(d.mesa)}</b>` : calle;
      const nota0 = d.nota0 || (fold ? 'Saber soltar también es ganar' : 'Los números dicen que compensa');
      const nota1 = d.nota1 || (fold
        ? 'Quien apuesta así suele llevar <b>manos fuertes</b>'
        : G.fz ? `Pero <b>no subas</b>: contra sus manos fuertes solo ganas el ${G.fz}%` : 'Con estos números, <b>pagar</b> es rentable');
      return {
        hero: d.mano.map(carta), board: d.mesa.map(carta),
        pots: [`Bote ${antes}`, `Bote ${d.bote}`, `Bote ${fold ? d.bote : d.bote + d.pagar}`],
        bet: String(d.pagar), vact: allin ? `ALL-IN ${d.pagar}` : `APUESTA ${d.pagar}`,
        vstack0: `Fichas: ${d.stack}`, vstack: `Fichas: ${d.stack - d.pagar}`, vchips: allin ? 8 : 4,
        call: `PAGAR ${d.pagar}`, fold, badge: fold ? '🔴 TIRA' : '🟡 PAGA',
        rec: fold ? 'RÍO recomienda <b>tirar la mano</b>' : `RÍO recomienda <b>pagar ${d.pagar}</b>`,
        caps: [
          { at: 0.0, to: 3.5, t: cap0, sub: sub0, subAt: 2.4 },
          { at: 3.6, to: 6.1, t: `El rival apuesta ${frase(d.pagar, antes, allin)}`.replace('apuesta va', 'va'), sub: `Había <b>${antes}</b> en el centro · ${allin ? 'all-in de' : 'apuesta'} <b>${d.pagar}</b>`, subAt: 4.3 },
          { at: 6.2, to: 9.15, t: '¿<em>PAGAS</em> o <em>TIRAS</em>?' },
          { at: 9.25, to: 10.8, t: fold ? 'RÍO dice: <em>TIRA ❌</em>' : 'RÍO dice: <span class="y">PAGA ✅</span>', stamp: true, sub: nota0, subAt: 9.55 },
          { at: 10.9, to: 13.4, t: fold
            ? `Ganas solo el <em>${cnt(G.ganas, 11.1)}</em> y necesitas el <span class="y">${cnt(G.nec, 11.1)}</span>`
            : `Ganas el <span class="g">${cnt(G.ganas, 11.1)}</span> y solo necesitas el <span class="y">${cnt(G.nec, 11.1)}</span>`, sub: nota1, subAt: 11.5 },
        ],
      };
    },
  };
}

module.exports = { construir, validar };
