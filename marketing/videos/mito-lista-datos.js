// Contenido de los formatos «¿Mito o realidad?» y «Top 3». Todos los datos salen de las páginas de la web de RÍO
// (glosario, guías y manos) o son cuentas comprobables; no hay cifras inventadas. Para más variedad, se añaden aquí.
// En los textos, *así* resalta en amarillo (afirmación) o en verde/rojo (explicación).

const { MITOS } = require('../../lib/poker-mitos');

// 3 puntos cada lista: t = titular corto, s = explicación en una frase
const LISTAS = [
  { titulo: '3 cosas que debes saber de los *outs*', items: [
    { t: 'Gutshot = 4 outs', s: 'Un solo hueco: solo sirve un valor.' },
    { t: 'Escalera abierta = 8 outs', s: 'Sirven dos valores distintos.' },
    { t: 'Proyecto de color = 9 outs', s: 'Quedan 9 de las 13 cartas del palo.' } ] },
  { titulo: '3 datos de *probabilidad* que cambian tu juego', items: [
    { t: 'Ases: 1 de cada 221', s: '6 combinaciones entre 1.326 manos.' },
    { t: 'A K: 16 combinaciones', s: '4 suited y 12 offsuit.' },
    { t: '1.326 manos iniciales', s: '52 × 51 ÷ 2 combinaciones.' } ] },
  { titulo: '3 errores *preflop* muy comunes', items: [
    { t: 'Hacer limp con manos fuertes', s: 'Entran más rivales y tu mano gana menos.' },
    { t: 'Pagar parejas pequeñas sin stack detrás', s: 'Regla del 15 a 1: sin fichas, no cobras el trío.' },
    { t: 'No sumar una ciega por cada limp', s: 'Tu subida normal más una ciega por cada jugador que igualó.' } ] },
  { titulo: '3 *cálculos rápidos* para decidir en la mesa', items: [
    { t: 'Regla del 4 en el flop', s: 'Outs × 4 = % de ligar hasta el river.' },
    { t: 'Regla del 2 en el turn', s: 'Outs × 2 = % de ligar en el river.' },
    { t: 'Pot odds: apuesta ÷ (bote + 2 × apuesta)', s: 'Es el % que necesitas ganar para pagar.' } ] },
  { titulo: '3 cosas de la *c-bet* que debes saber', items: [
    { t: 'La hace quien subió preflop', s: 'Apuesta en el flop, haya ligado o no.' },
    { t: 'Funciona en flops altos y secos', s: 'Tu rango tiene más reyes y ases.' },
    { t: 'Una apuesta pequeña suele bastar', s: 'Ganas mucho arriesgando poco.' } ] },
  { titulo: '3 números del *farol* que conviene saber', items: [
    { t: 'Media apuesta: se retira 33 %', s: 'Te basta con que se retire 1 de cada 3.' },
    { t: 'Dos tercios: se retira 40 %', s: 'Más apuesta, más retiradas necesarias.' },
    { t: 'Bote entero: se retira 50 %', s: 'Arriesgas 1 para ganar 1.' } ] },
  { titulo: '3 ideas para entender el *SPR*', items: [
    { t: 'SPR = stack ÷ bote', s: 'Cuánto te queda por jugar.' },
    { t: 'SPR bajo (menos de 3): casi comprometido', s: 'Una pareja alta suele bastar para ir all-in.' },
    { t: 'SPR alto (más de 10): hacen falta manos fuertes', s: 'Las parejas solas suelen quedarse cortas.' } ] },
  { titulo: '3 ventajas de jugar en *posición*', items: [
    { t: 'Hablas el último', s: 'Ves la acción antes de decidir.' },
    { t: 'Controlas el tamaño del bote', s: 'Puedes pasar con manos medias.' },
    { t: 'El botón es la mejor posición', s: 'Hablas el último en todas las calles.' } ] },
];

module.exports = { MITOS, LISTAS };
