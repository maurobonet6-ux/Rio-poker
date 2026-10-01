// Prepara un texto para que la voz lo lea bien: quita etiquetas y emojis y escribe como se pronuncia lo que una voz
// automática lee mal (porcentajes, signos, siglas y palabras en inglés del póker). Si algo suena raro, se corrige aquí.
const SIGLAS = [
  [/\bSPR\b/g, 'ese pe erre'], [/\bUTG\b/g, 'u te ge'], [/\bEV\b/g, 'e uve'], [/\bBB\b/g, 'ciega grande'],
  [/\ball-in\b/gi, 'ol in'], [/\bc-bet\b/gi, 'ce bet'], [/\b3-bet\b/gi, 'tri bet'], [/\b4-bet\b/gi, 'cuatro bet'],
  [/\bpot odds\b/gi, 'pot ods'], [/\boffsuit\b/gi, 'ofsut'], [/\bsuited\b/gi, 'sutid'], [/\bgutshot\b/gi, 'gatshot'],
  [/\bouts\b/gi, 'auts'], [/\bout\b/gi, 'aut'], [/\bflop\b/gi, 'flop'], [/\bturn\b/gi, 'tern'], [/\briver\b/gi, 'ríver'],
  [/\blimp\b/gi, 'limp'], [/\bfarol\b/gi, 'farol'], [/\bRÍO\b/g, 'Río'], [/riopoker\.es/gi, 'río poker punto es'],
];

function normalizarVoz(t){
  let s = String(t);
  // los números que cuentan hacia arriba en pantalla: <span class="count" data-to="45">0</span>%  →  45 por ciento
  s = s.replace(/<span[^>]*data-to="(\d+)"[^>]*>[^<]*<\/span>\s*%?/g, '$1 por ciento');
  s = s.replace(/<[^>]+>/g, '').replace(/\*/g, '');
  s = s.replace(/([A-Z0-9])\)\s+/g, '$1: ');                         // «A) 25 %» → «A: 25 %»
  s = s.replace(/(\d)\.(\d{3})(?!\d)/g, '$1$2');                      // 1.326 → 1326
  s = s.replace(/(\d),(\d)/g, '$1 coma $2');                          // 8,1 → 8 coma 1
  s = s.replace(/\s*%/g, ' por ciento').replace(/\s*÷\s*/g, ' entre ').replace(/\s*×\s*/g, ' por ').replace(/\s*=\s*/g, ' igual a ');
  s = s.replace(/\s*→\s*/g, ', ').replace(/\s*[·•]\s*/g, ', ').replace(/\s[-–—]\s/g, ', ');
  const V = { A: 'as', K: 'rey', Q: 'reina', J: 'jota', 10: 'diez', 9: 'nueve', 8: 'ocho', 7: 'siete', 6: 'seis', 5: 'cinco', 4: 'cuatro', 3: 'tres', 2: 'dos' };
  const P = { '♠': 'picas', '♥': 'corazones', '♦': 'diamantes', '♣': 'tréboles' };
  s = s.replace(/(?<![\w])([AKQJ]|10|[2-9])([♠♥♦♣])/g, (_, v, p) => `${V[v]} de ${P[p]}`);   // «A♥» → «as de corazones»
  s = s.replace(/♠/g, ' de picas').replace(/♥/g, ' de corazones').replace(/♦/g, ' de diamantes').replace(/♣/g, ' de tréboles');
  for (const [re, ok] of SIGLAS) s = s.replace(re, ok);
  s = s.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE0F}…]/gu, ' ');  // emojis y puntos suspensivos
  // Cartas dichas como un jugador: «A K» → «as rey», «Q 8 3» → «reina 8 3» (solo secuencias de 2 o más cartas seguidas)
  const R = '(?:[AKQJ]|10|[2-9])', NOMBRE = { A: 'as', K: 'rey', Q: 'reina', J: 'jota' };
  s = s.replace(new RegExp(`(?<![\\w:])${R}(?:\\s+${R})+(?![\\w:])`, 'g'), m => m.replace(/[AKQJ]/g, c => NOMBRE[c]));
  s = s.replace(/([?!])\s*\./g, '$1');                               // «?.» → «?»
  return s.replace(/\s+/g, ' ').replace(/\s+([.,;:!?])/g, '$1').trim();
}

// «Ah» → «as de corazones», «Td» → «diez de diamantes» (para decir las cartas de la mano)
const VALOR = { A: 'as', K: 'rey', Q: 'reina', J: 'jota', T: 'diez', 9: 'nueve', 8: 'ocho', 7: 'siete', 6: 'seis', 5: 'cinco', 4: 'cuatro', 3: 'tres', 2: 'dos' };
const PALO = { h: 'corazones', s: 'picas', d: 'diamantes', c: 'tréboles' };
const nombreCarta = c => `${VALOR[c[0]]} de ${PALO[c[1]]}`;

module.exports = { normalizarVoz, nombreCarta, SIGLAS };
