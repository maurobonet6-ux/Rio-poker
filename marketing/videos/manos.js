// Las manos de los vídeos. Para añadir una nueva, copia un bloque y cambia:
//  · analisis: la mano tal cual se mete en RÍO (bote = lo que había + la apuesta; pagar = la apuesta).
//  · guion(G): lo que se ve en el vídeo. G trae los números reales que calcula RÍO (G.ganas, G.nec, G.fz, G.ev).
const cnt = (n, at) => `<span class="count" data-to="${n}" data-at="${at}">0</span>%`;
module.exports = {
  ak: { analisis: { mano: ['Ah', 'Kd'], mesa: ['Qs', '8c', '3h'], bote: 18, pagar: 8 }, guion: G => ({
    hero: [['A', '♥'], ['K', '♦']], board: [['Q', '♠'], ['8', '♣'], ['3', '♥']],
    pots: ['Bote 10', 'Bote 18', 'Bote 26'], bet: '8', vact: 'APUESTA 8', vstack0: 'Fichas: 100', vstack: 'Fichas: 92', vchips: 4,
    call: 'PAGAR 8', fold: false, badge: '🟡 PAGA', rec: 'RÍO recomienda <b>pagar 8</b>',
    caps: [
      { at: 0.0, to: 3.5, t: 'Tienes <em>A K</em> y no has ligado nada 😬', sub: 'Flop: <b>Q 8 3</b>', subAt: 3.0 },
      { at: 3.6, to: 6.1, t: 'El rival apuesta <em>casi el bote</em>', sub: 'Había <b>10</b> en el centro · apuesta <b>8</b>', subAt: 4.3 },
      { at: 6.2, to: 9.15, t: '¿<em>PAGAS</em> o <em>TIRAS</em>?' },
      { at: 9.25, to: 10.8, t: 'RÍO dice: <span class="y">PAGA ✅</span>', stamp: true, sub: 'Aunque solo tengas carta alta', subAt: 9.55 },
      { at: 10.9, to: 13.4, t: `Ganas el <span class="g">${cnt(G.ganas, 11.1)}</span> y solo necesitas el <span class="y">${cnt(G.nec, 11.1)}</span>`, sub: `Pero <b>no subas</b>: contra sus manos fuertes solo ganas el ${G.fz}%`, subAt: 11.5 },
    ] }) },
  '77': { analisis: { mano: ['7s', '7c'], mesa: [], bote: 53, pagar: 50 }, guion: G => ({
    hero: [['7', '♠'], ['7', '♣']], board: [],
    pots: ['Bote 3', 'Bote 53', 'Bote 53'], bet: '50', vact: 'ALL-IN 50', vstack0: 'Fichas: 50', vstack: 'Fichas: 0', vchips: 8,
    call: 'PAGAR 50', fold: true, badge: '🔴 TIRA', rec: 'RÍO recomienda <b>tirar la mano</b>',
    caps: [
      { at: 0.0, to: 3.5, t: 'Pareja de 7 y el rival va <em>ALL-IN</em> 😳', sub: 'Antes del flop', subAt: 1.9 },
      { at: 3.6, to: 6.1, t: 'Pagar <em>50</em> para ganar un bote de 103', sub: 'Había <b>3</b> en el centro · all-in de <b>50</b>', subAt: 4.3 },
      { at: 6.2, to: 9.15, t: '¿<em>PAGAS</em> o <em>TIRAS</em>?' },
      { at: 9.25, to: 10.8, t: 'RÍO dice: <em>TIRA ❌</em>', stamp: true, sub: 'Aunque una pareja parezca mucho', subAt: 9.55 },
      { at: 10.9, to: 13.4, t: `Ganas solo el <em>${cnt(G.ganas, 11.1)}</em> y necesitas el <span class="y">${cnt(G.nec, 11.1)}</span>`, sub: 'Quien va all-in así suele llevar <b>manos fuertes</b>', subAt: 11.5 },
    ] }) },
  fd: { analisis: { mano: ['Ah', '5h'], mesa: ['Kh', '9h', '4c', '2s'], bote: 30, pagar: 10 }, guion: G => ({
    hero: [['A', '♥'], ['5', '♥']], board: [['K', '♥'], ['9', '♥'], ['4', '♣'], ['2', '♠']],
    pots: ['Bote 20', 'Bote 30', 'Bote 40'], bet: '10', vact: 'APUESTA 10', vstack0: 'Fichas: 100', vstack: 'Fichas: 90', vchips: 4,
    call: 'PAGAR 10', fold: false, badge: '🟡 PAGA', rec: 'RÍO recomienda <b>pagar 10</b>',
    caps: [
      { at: 0.0, to: 3.5, t: 'Proyecto de <em>color</em> en el turn 🔥', sub: 'Tienes <b>A♥ 5♥</b> · hay dos ♥ en la mesa', subAt: 3.1 },
      { at: 3.6, to: 6.1, t: 'El rival apuesta <em>la mitad del bote</em>', sub: 'Había <b>20</b> en el centro · apuesta <b>10</b>', subAt: 4.3 },
      { at: 6.2, to: 9.15, t: '¿<em>PAGAS</em> o <em>TIRAS</em>?' },
      { at: 9.25, to: 10.8, t: 'RÍO dice: <span class="y">PAGA ✅</span>', stamp: true, sub: 'Aunque todavía no tengas nada', subAt: 9.55 },
      { at: 10.9, to: 13.4, t: `Ganas el <span class="g">${cnt(G.ganas, 11.1)}</span> y solo necesitas el <span class="y">${cnt(G.nec, 11.1)}</span>`, sub: `Tienes <b>18 cartas</b> que te ayudan. Pero no subas`, subAt: 11.5 },
    ] }) },
};
