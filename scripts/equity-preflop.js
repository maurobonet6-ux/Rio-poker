// Calcula la equity preflop de cada una de las 169 manos contra una mano al azar
// (heads-up, hasta el river) y la guarda en scripts/data/equity-preflop.json.
// Es una simulación con semilla fija: el resultado es siempre el mismo.
// Solo hace falta ejecutarlo si se cambia el método:  node scripts/equity-preflop.js
const fs = require('fs');
const path = require('path');

const TRIALS = 60000;
const RANKS = 'AKQJT98765432';

// Generador pseudoaleatorio con semilla (mulberry32).
function rng(seed){
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Carta = rango (0 = 2 … 12 = A) * 4 + palo. Devuelve un número: más alto, mejor mano.
function straightHigh(mask){
  for (let hi = 12; hi >= 4; hi--) if (((mask >> (hi - 4)) & 31) === 31) return hi;
  return (mask & 0x100F) === 0x100F ? 3 : -1; // A-2-3-4-5
}
function score(cat, ranks){
  let s = cat;
  for (let i = 0; i < 5; i++) s = s * 13 + (ranks[i] || 0);
  return s;
}
function eval7(cards){
  const cnt = new Array(13).fill(0), suitMask = [0, 0, 0, 0], suitCnt = [0, 0, 0, 0];
  let mask = 0;
  for (const c of cards){
    const r = c >> 2, s = c & 3;
    cnt[r]++; mask |= 1 << r; suitMask[s] |= 1 << r; suitCnt[s]++;
  }
  for (let s = 0; s < 4; s++) if (suitCnt[s] >= 5){
    const sh = straightHigh(suitMask[s]);
    if (sh >= 0) return score(8, [sh]);
    const top = [];
    for (let r = 12; r >= 0 && top.length < 5; r--) if (suitMask[s] >> r & 1) top.push(r);
    return score(5, top);
  }
  const quads = [], trips = [], pairs = [], singles = [];
  for (let r = 12; r >= 0; r--){
    if (cnt[r] === 4) quads.push(r); else if (cnt[r] === 3) trips.push(r);
    else if (cnt[r] === 2) pairs.push(r); else if (cnt[r] === 1) singles.push(r);
  }
  if (quads.length){
    const k = Math.max(...trips, ...pairs, ...singles);
    return score(7, [quads[0], k]);
  }
  if (trips.length && (trips.length > 1 || pairs.length)){
    const p = Math.max(trips[1] ?? -1, pairs[0] ?? -1);
    return score(6, [trips[0], p]);
  }
  const sh = straightHigh(mask);
  if (sh >= 0) return score(4, [sh]);
  if (trips.length) return score(3, [trips[0], ...singles.slice(0, 2)]);
  if (pairs.length >= 2){
    const k = Math.max(pairs[2] ?? -1, singles[0] ?? -1);
    return score(2, [pairs[0], pairs[1], k]);
  }
  if (pairs.length) return score(1, [pairs[0], ...singles.slice(0, 3)]);
  return score(0, singles.slice(0, 5));
}

function handCards(name){
  const r1 = 12 - RANKS.indexOf(name[0]), r2 = 12 - RANKS.indexOf(name[1]);
  if (name.length === 2) return [r1 * 4, r2 * 4 + 1];
  return name[2] === 's' ? [r1 * 4, r2 * 4] : [r1 * 4, r2 * 4 + 1];
}

function equity(name, rand){
  const hero = handCards(name);
  const deck = [];
  for (let c = 0; c < 52; c++) if (!hero.includes(c)) deck.push(c);
  let won = 0;
  for (let t = 0; t < TRIALS; t++){
    // Barajado parcial: 2 cartas del rival + 5 de la mesa.
    for (let i = 0; i < 7; i++){
      const j = i + Math.floor(rand() * (deck.length - i));
      const tmp = deck[i]; deck[i] = deck[j]; deck[j] = tmp;
    }
    const board = deck.slice(2, 7);
    const a = eval7([...hero, ...board]), b = eval7([deck[0], deck[1], ...board]);
    won += a > b ? 1 : a === b ? 0.5 : 0;
  }
  return won / TRIALS;
}

if (require.main === module){
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const hands = html.match(/const HAND_RANKING = '([^']+)'/)[1].split(' ');
  const rand = rng(20260927);
  const out = {};
  for (const h of hands) out[h] = Math.round(equity(h, rand) * 1000) / 10;
  fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, 'data', 'equity-preflop.json'), JSON.stringify(out, null, 0).replace(/,/g, ',\n') + '\n');
  console.log(`${hands.length} manos calculadas`);
}
module.exports = { eval7, handCards };
