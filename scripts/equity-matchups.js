// Calcula la equity de cada una de las 169 manos contra unas manos de referencia
// (heads-up, antes del flop, hasta el river) y la guarda en scripts/data/equity-matchups.json.
// Cada prueba elige palos al azar para las dos manos (sin repetir cartas), así que la cifra
// es la media de todas las combinaciones. Semilla fija: el resultado es siempre el mismo.
// Solo hace falta ejecutarlo si se cambian las manos de referencia:  node scripts/equity-matchups.js
const fs = require('fs');
const path = require('path');
const { eval7 } = require('./equity-preflop.js');

const TRIALS = 40000;
const RANKS = 'AKQJT98765432';
const OPPONENTS = ['AA', 'KK', 'QQ', 'TT', '55', 'AKo', 'AQo', 'KQs', 'JTs', '76s'];

function rng(seed){
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
// Todas las combinaciones concretas (carta = rango * 4 + palo) de una mano como AKs, AKo o 77.
function combosOf(name){
  const r1 = 12 - RANKS.indexOf(name[0]), r2 = 12 - RANKS.indexOf(name[1]), out = [];
  for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++){
    if (name.length === 2){ if (a < b) out.push([r1 * 4 + a, r2 * 4 + b]); }
    else if (name[2] === 's' ? a === b : a !== b) out.push([r1 * 4 + a, r2 * 4 + b]);
  }
  return out;
}
function matchup(h, v, rand){
  const hc = combosOf(h), vc = combosOf(v);
  let won = 0, n = 0;
  while (n < TRIALS){
    const a = hc[Math.floor(rand() * hc.length)], b = vc[Math.floor(rand() * vc.length)];
    if (a.includes(b[0]) || a.includes(b[1])) continue;
    const used = new Set([...a, ...b]), board = [];
    while (board.length < 5){
      const c = Math.floor(rand() * 52);
      if (!used.has(c)){ used.add(c); board.push(c); }
    }
    const x = eval7([...a, ...board]), y = eval7([...b, ...board]);
    won += x > y ? 1 : x === y ? 0.5 : 0; n++;
  }
  return Math.round(won / TRIALS * 1000) / 10;
}

if (require.main === module){
  const html = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
  const hands = html.match(/const HAND_RANKING = '([^']+)'/)[1].split(' ');
  const rand = rng(20260930);
  const out = {};
  for (const h of hands){
    out[h] = {};
    for (const v of OPPONENTS) if (v !== h) out[h][v] = matchup(h, v, rand);
  }
  fs.writeFileSync(path.join(__dirname, 'data', 'equity-matchups.json'),
    '{\n' + hands.map(h => JSON.stringify(h) + ':' + JSON.stringify(out[h])).join(',\n') + '\n}\n');
  console.log(`${hands.length} manos × ${OPPONENTS.length} rivales calculadas`);
}
module.exports = { OPPONENTS };
