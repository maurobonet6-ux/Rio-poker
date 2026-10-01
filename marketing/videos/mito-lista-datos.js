// Contenido de los formatos «¿Mito o realidad?» y «Top 3». Todos los datos salen de las páginas de la web de RÍO
// (glosario, guías y manos) o son cuentas comprobables; no hay cifras inventadas. Para más variedad, se añaden aquí.
// En los textos, *así* resalta en amarillo (afirmación) o en verde/rojo (explicación).

// verdad: true → REALIDAD, false → MITO
const MITOS = [
  { dice: 'Con 7-2 desde el botón, lo normal es *subir para robar las ciegas*', verdad: false,
    why: '7-2 offsuit es la peor mano: sin palo ni conexión casi nunca liga. Lo normal es *tirarla*.' },
  { dice: 'En el botón hablas *el último* en todas las calles', verdad: true,
    why: 'Por eso es la *mejor posición*: ves qué hacen los demás antes de decidir.' },
  { dice: 'Con ases es mejor *hacer limp* para disimular', verdad: false,
    why: 'Con limp entran más jugadores y los ases ganan menos veces. *Sube siempre*.' },
  { dice: '*QQ* contra *AK* all-in es un 50-50 exacto', verdad: false,
    why: 'QQ va algo por delante: gana alrededor del *56 %*.' },
  { dice: 'Si apuestas el bote entero de farol, el rival debe retirarse *al menos la mitad* de las veces', verdad: true,
    why: 'Arriesgas 1 para ganar 1: necesitas *50 %* de retiradas para no perder dinero.' },
  { dice: 'Con proyecto de color en el flop *ligas más de la mitad* de las veces hasta el river', verdad: false,
    why: 'Con 9 outs ligas un *35 %* viendo turn y river. Solo un 19 % si ves una carta.' },
  { dice: 'Te tocan *ases* de media una vez cada 221 manos', verdad: true,
    why: '6 combinaciones entre 1.326 manos: *1 de cada 221* (0,45 %).' },
  { dice: 'Para pagar *media apuesta* de bote necesitas ganar un 50 %', verdad: false,
    why: 'Bote 100, apuesta 50: pagas 50 para ganar 200. Necesitas solo un *25 %*.' },
  { dice: 'Una escalera de *gutshot* tiene 4 outs', verdad: true,
    why: 'Solo sirve un valor y hay 4 cartas de cada uno: *4 outs*.' },
  { dice: 'Con 4 cartas de un palo en el flop te quedan *13 outs* de color', verdad: false,
    why: 'Hay 13 de cada palo y ya ves 4: te quedan *9 outs*.' },
  { dice: 'La *c-bet* solo se hace cuando has ligado el flop', verdad: false,
    why: 'Es la apuesta del que subió preflop en el flop, *haya ligado o no*.' },
  { dice: 'En un flop alto y seco, una *apuesta pequeña* suele ganar mucho', verdad: true,
    why: 'Tu rango tiene más reyes y ases que el de la ciega grande: apostar poco *funciona*.' },
  { dice: '*AK* es favorito contra cualquier pareja antes del flop', verdad: false,
    why: 'Contra una pareja como QQ, AK es el que va por detrás: ~*45 %*.' },
  { dice: 'En torneo, con 40 ciegas o menos, *AK* es casi siempre all-in', verdad: true,
    why: 'El rival empuja también con AQ, parejas medias y faroles: *AK paga*.' },
  { dice: 'Un *SPR alto* significa que te queda poco por jugar', verdad: false,
    why: 'SPR = stack ÷ bote. Si es alto, queda *mucho* por jugar.' },
];

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
