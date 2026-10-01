// Afirmaciones de «¿Mito o realidad?»: las usan los vídeos (marketing/videos) y el bot del canal de Telegram.
// Todos los datos salen de las páginas de la web de RÍO (glosario, guías y manos) o son cuentas comprobables.
// En los textos, *así* resalta una palabra (en el canal se quitan los asteriscos).

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

module.exports = { MITOS };
