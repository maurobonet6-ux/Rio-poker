// Preguntas frecuentes de cada guía (/guias/…). Las usa scripts/build-seo.js: se muestran al
// final de la guía y van también como datos estructurados FAQPage. Texto plano, sin HTML.
module.exports = {
  'como-jugar-ak-preflop': [
    ['¿AK es mejor que una pareja?', 'Contra parejas menores que AA y KK, AK va ligeramente por detrás antes del flop (alrededor de 45% contra QQ o JJ). Contra una mano al azar es de las mejores, pero no ha ligado nada hasta que sale el flop.'],
    ['¿Hay que ir all-in con AK?', 'Con 40 ciegas o menos, casi siempre es correcto. Con 100 ciegas o más, contra un jugador prudente que hace 4-bet, a veces es mejor pagar o incluso retirarse.'],
    ['¿Qué diferencia hay entre AKs y AKo?', 'AKs (mismo palo) puede ligar color y gana un 2–3% más a menudo. Las dos se juegan casi igual antes del flop: subir y resubir.'],
    ['¿Qué hago con AK si no ligo en el flop?', 'Una apuesta de continuación en flops altos y secos suele funcionar. En flops bajos y conectados, si el rival sigue pagando, no te empeñes: as alto pierde contra cualquier pareja.']
  ],
  'cuando-hacer-3-bet': [
    ['¿Cuánto hay que resubir en un 3-bet?', 'Unas 3 veces la subida si tienes posición y unas 4 veces si estás fuera de posición, por ejemplo desde las ciegas.'],
    ['¿Qué manos son buenas para un 3-bet de farol?', 'A5s, A4s, A3s y A2s: el as quita combinaciones de AA y AK al rival y, si te pagan, pueden ligar escalera o color.'],
    ['¿Hay que hacer 3-bet con JJ?', 'Contra aperturas de posiciones tardías, sí. Contra una subida de UTG de un jugador prudente, pagar suele ser mejor.'],
    ['¿Cada cuánto hay que hacer 3-bet?', 'Como orientación, entre un 6% y un 12% de las manos cuando alguien abre, más contra aperturas del botón que contra UTG.']
  ],
  'como-calcular-outs': [
    ['¿Cómo se calculan los outs?', 'Cuenta las cartas que quedan en la baraja y que te darían la mejor mano. Un proyecto de color tiene 9 y una escalera abierta, 8.'],
    ['¿Qué es la regla del 4 y del 2?', 'En el flop, multiplica tus outs por 4 para saber tu probabilidad aproximada de ligar hasta el river; en el turn, multiplícalos por 2 para el river.'],
    ['¿Cuántos outs son color más escalera abierta?', '15 outs: 9 del color y 6 de la escalera que no son del palo. Ligas alrededor del 54% de las veces desde el flop.'],
    ['¿Las cartas altas cuentan como outs?', 'A veces. Con AK sin ligar en una mesa baja, un as o un rey suelen darte la mejor mano, pero no siempre: descuéntalas si el rival puede tener dobles o trío.']
  ],
  'como-calcular-pot-odds': [
    ['¿Cómo se calculan las pot odds rápido?', 'Divide lo que te cuesta pagar entre el bote total tras tu pago. Si pagas 20 a un bote de 60, 20 ÷ 80 = 25%.'],
    ['¿Qué porcentaje necesito para pagar un all-in?', 'El mismo cálculo: lo que pagas entre el bote final. Si el bote tiene 100 y te cuesta 50 pagar el all-in, necesitas ganar al menos el 33% de las veces.'],
    ['¿Cómo comparo pot odds y equity?', 'Si tu equity (tu probabilidad de ganar) es mayor que el porcentaje que piden las pot odds, pagar gana dinero a la larga.'],
    ['¿Las pot odds sirven en torneos?', 'Sí, aunque en torneos hay que añadir el riesgo de quedarte eliminado: cerca de los premios a veces conviene retirarse aunque las pot odds digan que pagues.']
  ],
  'como-jugar-parejas-pequenas': [
    ['¿Qué es el set mining?', 'Pagar una subida con una pareja pequeña con la idea principal de ligar trío en el flop y ganar un bote grande.'],
    ['¿Cada cuánto se liga trío con una pareja?', 'Un 11,8% de las veces en el flop, aproximadamente 1 de cada 8,5 flops.'],
    ['¿Hay que abrir 22 desde UTG?', 'En mesas de 6 con muchas ciegas se puede; en mesa llena o con stacks cortos, muchos jugadores la tiran desde las primeras posiciones.'],
    ['¿Qué hago con una pareja pequeña si no ligo?', 'Si el flop trae cartas altas y el rival apuesta, lo normal es retirarte. Si la mesa es baja y nadie apuesta, puedes ver otra carta barata.']
  ],
  'como-jugar-desde-la-ciega-grande': [
    ['¿Por qué se defienden tantas manos desde la ciega grande?', 'Porque ya has puesto una ciega: pagar una subida es barato y el precio exige ganar pocas veces, alrededor del 27% contra una subida de 2,5 ciegas.'],
    ['¿Qué manos hay que tirar desde la ciega grande?', 'Las de distinto palo y sin conexión, como J3o o T4o: ligan poco y juegas fuera de posición toda la mano.'],
    ['¿Cuándo resubir desde la ciega grande?', 'Con tus mejores manos (parejas altas, AK, AQ) y algunos ases pequeños del mismo palo como farol, sobre todo contra aperturas del botón.'],
    ['¿Se defiende más en torneo?', 'Sí. Con antes el bote es más grande y el precio aún mejor, así que se pagan todavía más manos.']
  ],
  'cuanto-subir-preflop': [
    ['¿Cuánto se sube antes del flop en cash online?', 'Lo más habitual es 2,5 ciegas grandes si nadie ha entrado antes.'],
    ['¿Cuánto se sube en póker en vivo?', 'Algo más: entre 3 y 4 ciegas, porque en vivo los jugadores pagan más a menudo.'],
    ['¿Cuánto se sube si otros han hecho limp?', 'Tu subida normal más una ciega por cada jugador que haya igualado. Con dos limps, unas 4,5 a 5 ciegas.'],
    ['¿Es malo hacer limp?', 'En general sí: no puedes ganar el bote antes del flop y dejas ver el flop gratis a la ciega grande. Es mejor subir o retirarse.']
  ],
  'como-jugar-proyecto-de-color': [
    ['¿Qué probabilidad hay de ligar un color desde el flop?', 'Con proyecto de color (9 outs) ligas alrededor del 35% de las veces hasta el river y el 19% en la siguiente carta.'],
    ['¿Hay que pagar siempre con proyecto de color?', 'No. Con una carta por ver necesitas pot odds de ~20% o buenas odds implícitas. Contra apuestas grandes, a veces toca retirarse.'],
    ['¿Es mejor apostar o pagar con proyecto de color?', 'Muchas veces apostar o subir (semifarol) es mejor: ganas si el rival se retira y, si paga, aún puedes ligar.'],
    ['¿Qué es el nut flush draw?', 'El proyecto de color con el as del palo: si ligas, tienes el mejor color posible y no puedes perder contra otro color.']
  ],
  'cuando-hacer-un-farol': [
    ['¿Cuántas veces debe funcionar un farol?', 'Depende del tamaño: una apuesta de medio bote necesita que el rival se retire al menos el 33% de las veces; una del bote, el 50%.'],
    ['¿Contra qué jugadores no hay que farolear?', 'Contra los que pagan casi siempre y en botes con muchos rivales. Contra ellos apuesta por valor.'],
    ['¿Cuál es el mejor momento para un farol?', 'Cuando la mesa favorece las manos que tú puedes tener, contra uno o dos rivales, y cuando tus apuestas anteriores cuentan una historia coherente.'],
    ['¿Qué es mejor, farol o semifarol?', 'El semifarol suele ser más rentable porque tiene dos formas de ganar: que el rival se retire o ligar tu proyecto.']
  ],
  'que-hacer-contra-un-3-bet': [
    ['¿Qué manos pagar contra un 3-bet?', 'Parejas medias (TT–77), AQs, AJs, KQs y JTs, sobre todo si tienes posición.'],
    ['¿Con qué manos hacer 4-bet?', 'Con AA y KK siempre; con QQ y AK casi siempre contra jugadores agresivos. De farol, alguna vez A5s o A4s.'],
    ['¿Hay que retirarse con AJo contra un 3-bet?', 'Casi siempre: contra un rango de 3-bet va dominada por AK y AQ y por detrás de las parejas altas.'],
    ['¿Cuánto hacer 4-bet?', 'Unas 2,2 a 2,5 veces el 3-bet si tienes posición y algo más si estás fuera de posición.']
  ],
  'cuando-hacer-c-bet': [
    ['¿En qué flops hacer c-bet?', 'En flops altos y secos como A-7-2 o K-8-3, donde tu rango tiene más cartas altas que el del rival.'],
    ['¿En qué flops no hacer c-bet?', 'En flops bajos y conectados (7-6-5, 8-7-4 con proyectos) y cuando hay varios rivales en el bote, salvo con mano o buen proyecto.'],
    ['¿Qué tamaño de c-bet usar?', 'Alrededor de 1/3 del bote en flops secos y 2/3 o más en flops con muchos proyectos.'],
    ['¿Cuántas veces tiene que retirarse el rival para que una c-bet de farol funcione?', 'Con 1/3 del bote, al menos el 25% de las veces; con 2/3, al menos el 40%.']
  ],
  'probabilidades-de-poker': [
    ['¿Cuál es la probabilidad de recibir AA?', 'Un 0,45%, aproximadamente una vez cada 221 manos.'],
    ['¿Cuál es la probabilidad de recibir una pareja?', 'Un 5,9%, aproximadamente una vez cada 17 manos.'],
    ['¿Qué probabilidad hay de ligar trío con una pareja?', 'Un 11,8% en el flop y un 19% hasta el river.'],
    ['¿Quién gana entre una pareja y dos cartas más altas?', 'La pareja va ligeramente por delante, alrededor de 55% contra 45%. Es lo que se llama una moneda al aire.']
  ]
};
