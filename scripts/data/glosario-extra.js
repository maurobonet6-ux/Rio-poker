// Contenido ampliado de cada término del glosario (/glosario/…). Lo usa scripts/build-seo.js.
// Para cada término: `more` (HTML que va después de la definición) y `faq` (preguntas y
// respuestas que se ven en la página y van también como datos estructurados FAQPage).
// Las respuestas del FAQ son texto plano: se muestran tal cual y se copian a los datos para Google.
module.exports = {
  'equity': {
    more: `<h2>Cómo se calcula la equity</h2>
    <p>Con dos manos concretas se puede calcular exacto: se repasan todas las mesas posibles y se cuenta cuántas gana cada una (los empates cuentan la mitad). Es lo que hacen las calculadoras como RÍO. A mano, en el flop o el turn, basta con contar tus <a href="/glosario/outs/">outs</a> y aplicar la regla del 4 y del 2.</p>
    <div class="ex"><b>Paso a paso:</b> tienes 9♥8♥ en una mesa K♥5♥2♣ y crees que el rival tiene un rey. Te valen los 9 corazones que quedan: 9 outs × 4 ≈ <b>36% de equity</b> hasta el river. El rival tiene el ~64% restante.</div>
    <h2>Equity de algunas manos famosas antes del flop</h2>
    <table class="tbl"><tr><th>Enfrentamiento</th><th>Equity aproximada</th></tr>
    <tr><td>AA contra KK</td><td>82% – 18%</td></tr>
    <tr><td>Pareja contra dos cartas más altas (QQ contra AK)</td><td>55% – 45% (“moneda al aire”)</td></tr>
    <tr><td>Dos cartas altas contra dos bajas (AK contra 76)</td><td>60% – 40%</td></tr>
    <tr><td>Mano dominada (AK contra AQ)</td><td>74% – 26%</td></tr>
    <tr><td>Pareja contra pareja menor (99 contra 55)</td><td>81% – 19%</td></tr></table>
    <h2>Equity no es lo mismo que ganar el bote</h2>
    <p>La equity supone que llegáis al final sin más apuestas. En la realidad, una mano puede tener un 40% de equity pero ganar menos porque la obligan a retirarse antes (le falta <b>realizar su equity</b>). Las manos fuera de posición y las que ligan poco realizan menos; las que ligan manos muy fuertes y juegan en posición, más.</p>
    <h2>Errores típicos</h2>
    <ul><li>Calcular la equity contra la mano que temes (siempre “tiene el color”) en vez de contra su rango completo.</li>
    <li>Pensar que un 70% “gana siempre”: pierde 3 de cada 10 veces, y eso es normal.</li>
    <li>Olvidar que la equity cambia en cada calle: un proyecto con 36% en el flop baja a ~18% si no liga en el turn.</li></ul>`,
    faq: [
      ['¿Qué significa tener un 50% de equity?', 'Que si la mano se jugara muchas veces hasta el final ganarías la mitad de ellas (o empatarías de forma equivalente). A la larga te corresponde la mitad del bote.'],
      ['¿Cómo calculo mi equity rápido en la mesa?', 'Cuenta tus outs y multiplícalos por 4 en el flop o por 2 en el turn. Con 8 outs en el flop tienes aproximadamente un 32% de ligar hasta el river.'],
      ['¿Qué mano tiene más equity antes del flop?', 'AA. Contra una mano al azar gana alrededor del 85% de las veces y contra KK alrededor del 82%.'],
      ['¿La equity decide si debo pagar?', 'No sola. Hay que compararla con las pot odds: si tu equity es mayor que el porcentaje que necesitas según el precio, pagar es rentable a la larga.']
    ]
  },
  'pot-odds': {
    more: `<h2>Pot odds de las apuestas más habituales</h2>
    <p>No hace falta calcularlas cada vez: dependen solo del tamaño de la apuesta respecto al bote.</p>
    <table class="tbl"><tr><th>El rival apuesta…</th><th>Necesitas ganar al menos</th></tr>
    <tr><td>1/4 del bote</td><td>17%</td></tr><tr><td>1/3 del bote</td><td>20%</td></tr>
    <tr><td>1/2 del bote</td><td>25%</td></tr><tr><td>2/3 del bote</td><td>29%</td></tr>
    <tr><td>3/4 del bote</td><td>30%</td></tr><tr><td>Bote entero</td><td>33%</td></tr>
    <tr><td>El doble del bote</td><td>40%</td></tr></table>
    <h2>Ejemplo completo con un proyecto</h2>
    <div class="ex">En el turn tienes proyecto de color (9 outs). El bote es de 100 y el rival apuesta 50. Pot odds: 50 ÷ (100 + 50 + 50) = <b>25%</b>. Tu equity para el river: 9 × 2 ≈ <b>18%</b>. Como 18% &lt; 25%, <b>pagar pierde dinero</b> a la larga, salvo que esperes cobrar bastante más en el river si ligas (<a href="/glosario/odds-implicitas/">odds implícitas</a>).</div>
    <h2>Pot odds expresadas “a 1”</h2>
    <p>Algunos libros las dan como proporción: “el bote te da 3 a 1” significa que ganas 3 por cada 1 que pagas. Para pasarlo a porcentaje: 1 ÷ (3 + 1) = 25%. Es la misma idea escrita de otra forma.</p>
    <h2>Errores típicos</h2>
    <ul><li>Olvidar sumar la apuesta del rival (y la tuya) al bote antes de dividir.</li>
    <li>Pagar un proyecto en el flop pensando en las dos cartas (36%) cuando el rival volverá a apostar en el turn: si no te deja ver el river gratis, cuenta solo la siguiente carta.</li>
    <li>Usar las pot odds como única regla: también importan las odds implícitas y si el rival puede estar faroleando.</li></ul>`,
    faq: [
      ['¿Cómo se calculan las pot odds?', 'Divide lo que te cuesta pagar entre el bote total después de pagar (bote actual, apuesta del rival y tu pago). Si pagas 20 a un bote de 60, 20 ÷ 80 = 25%.'],
      ['¿Qué porcentaje necesito para pagar una apuesta de medio bote?', 'Un 25%. Contra una apuesta del tamaño del bote necesitas un 33%.'],
      ['¿Qué diferencia hay entre pot odds y odds implícitas?', 'Las pot odds solo cuentan el bote que ya hay. Las odds implícitas añaden lo que esperas ganar en calles posteriores si ligas tu mano.'],
      ['¿Sirven las pot odds antes del flop?', 'Sí. Desde la ciega grande, por ejemplo, ya tienes dinero puesto y el precio para pagar una subida suele ser bueno, por eso se defienden muchas manos.']
    ]
  },
  'ev': {
    more: `<h2>EV de un farol</h2>
    <p>La misma idea sirve para apostar. Un farol gana el bote cuando el rival se retira y pierde la apuesta cuando paga:</p>
    <p class="formula">EV del farol = (% que se retira × bote) − (% que paga × apuesta)</p>
    <div class="ex"><b>Ejemplo:</b> el bote es de 100 y apuestas 50. Si el rival se retira el 40% de las veces: 0,40 × 100 − 0,60 × 50 = 40 − 30 = <b>+10</b>. Aunque pierdas más de la mitad de las veces, el farol gana dinero.</div>
    <h2>Por qué el EV importa más que el resultado</h2>
    <p>En una sola mano manda la suerte; en miles, manda el EV. Pagar un all-in con un 80% de equity es una decisión excelente aunque esa vez pierdas. Quien juzga sus decisiones por el resultado acaba cambiando jugadas buenas por malas.</p>
    <div class="ex"><b>Varianza:</b> es la diferencia entre lo que esperabas ganar (EV) y lo que ganaste de verdad. Con muestras pequeñas puede ser enorme: 1.000 manos no bastan para saber si juegas bien.</div>
    <h2>Errores típicos</h2>
    <ul><li>Retirarse siempre que “puede que vaya perdiendo”, aunque el precio haga que pagar sea +EV.</li>
    <li>Calcular el EV con la equity contra la peor mano posible en lugar de contra el rango del rival.</li>
    <li>Olvidar las calles que quedan: una decisión +EV ahora puede meterte en un bote grande donde juegas mal.</li></ul>`,
    faq: [
      ['¿Qué significa +EV en póker?', 'Que la decisión gana dinero de media si la repites muchas veces, aunque en una mano concreta puedas perder.'],
      ['¿Cómo se calcula el EV de pagar?', 'EV = equity × bote − (1 − equity) × lo que pagas. Si sale positivo, pagar es rentable a largo plazo.'],
      ['¿Una jugada +EV puede perder dinero?', 'Sí, en el corto plazo. Por eso se evalúan las decisiones por su EV y no por el resultado de una mano.'],
      ['¿Qué es la varianza?', 'Las oscilaciones de resultados alrededor del EV. Es la razón por la que un buen jugador puede perder durante semanas.']
    ]
  },
  'outs': {
    more: `<h2>Outs de los proyectos más comunes</h2>
    <table class="tbl"><tr><th>Proyecto</th><th>Outs</th><th>Flop → river</th><th>Turn → river</th></tr>
    <tr><td>Color y escalera abierta</td><td>15</td><td>~54%</td><td>~33%</td></tr>
    <tr><td>Proyecto de color</td><td>9</td><td>~35%</td><td>~20%</td></tr>
    <tr><td>Escalera abierta (dos puntas)</td><td>8</td><td>~32%</td><td>~17%</td></tr>
    <tr><td>Dos cartas altas (overcards)</td><td>6</td><td>~24%</td><td>~13%</td></tr>
    <tr><td>Escalera interna (gutshot)</td><td>4</td><td>~17%</td><td>~9%</td></tr>
    <tr><td>Pareja buscando trío</td><td>2</td><td>~8%</td><td>~4%</td></tr></table>
    <p class="note">Porcentajes exactos redondeados. La regla del 4 y del 2 se pasa un poco con muchos outs (15 × 4 = 60%, cuando la cifra real es ~54%).</p>
    <h2>Cómo contar outs sin engañarte</h2>
    <ul><li><b>No cuentes dos veces</b> la misma carta: en color + escalera, las cartas que te dan las dos cosas cuentan una sola vez.</li>
    <li><b>Descuenta outs sucios:</b> si la carta te da escalera pero pone tres del mismo palo en la mesa y el rival puede tener color, no es un out limpio.</li>
    <li><b>Overcards:</b> con A♣K♦ en una mesa 9-7-2, un as o un rey probablemente te ponen por delante, pero no siempre (el rival puede tener dobles o trío).</li></ul>
    <div class="ex"><b>Ejemplo:</b> J♠T♠ en una mesa Q♠9♥3♠. Tienes color (9 outs: los picas que quedan) y escalera abierta (K y 8: 8 outs, de los que K♠ y 8♠ ya estaban contados). Total: 9 + 6 = <b>15 outs</b>.</div>`,
    faq: [
      ['¿Cuántos outs tiene un proyecto de color?', 'Nueve: hay 13 cartas de cada palo, tú ves 4 entre tu mano y la mesa, y quedan 9 en la baraja.'],
      ['¿Qué es la regla del 4 y del 2?', 'Una forma rápida de pasar outs a porcentaje: en el flop, outs × 4 da la probabilidad de ligar hasta el river; en el turn, outs × 2 la de ligar en el river.'],
      ['¿Cuántos outs tiene una escalera abierta?', 'Ocho: cuatro cartas de cada uno de los dos valores que completan la escalera por arriba o por abajo.'],
      ['¿Qué es un out sucio?', 'Una carta que mejora tu mano pero que probablemente también mejora la del rival a una jugada aún mejor, por ejemplo la que te da escalera pero le da color.']
    ]
  },
  'spr': {
    more: `<h2>Qué manos van bien con cada SPR</h2>
    <table class="tbl"><tr><th>SPR</th><th>Situación típica</th><th>Te basta para ir all-in con…</th></tr>
    <tr><td>Menos de 2</td><td>Bote con 3-bet y stacks cortos, torneo</td><td>Pareja alta, top pair buen kicker, proyectos fuertes</td></tr>
    <tr><td>3 a 6</td><td>Bote con 3-bet en cash con 100 ciegas</td><td>Top pair buen kicker o mejor, overpair</td></tr>
    <tr><td>8 a 15</td><td>Bote con una subida y un pago</td><td>Dobles parejas, tríos o mejor</td></tr>
    <tr><td>Más de 15</td><td>Botes con limp o muy profundos</td><td>Escaleras, colores y mejor</td></tr></table>
    <h2>Por qué importa</h2>
    <p>El SPR te dice, <b>antes de apostar en el flop</b>, lo comprometido que estás. Si el SPR es 2 y ligas top pair, ya sabes que vas a jugarte todo; no tiene sentido apostar poco y retirarte después. Si el SPR es 15, top pair es una mano para ganar un bote pequeño o mediano, no para arruinarte.</p>
    <div class="ex"><b>Ejemplo:</b> haces 3-bet con QQ a 10 ciegas, te pagan y el bote es de ~21 ciegas con 90 detrás: SPR ≈ 4,3. Sale K-7-2: tu pareja de damas es buena pero no invencible; con este SPR puedes apostar y pagar una apuesta, y pensarlo mucho ante un all-in de un jugador prudente.</div>
    <h2>Cómo usarlo antes del flop</h2>
    <p>Las parejas pequeñas y las cartas del mismo palo quieren SPR alto (cuando ligan, cobran mucho). Las parejas altas y AK prefieren SPR bajo (pueden jugarse todo sin miedo con una pareja). Por eso con AA se busca un bote grande antes del flop y con 44 un bote barato.</p>`,
    faq: [
      ['¿Cómo se calcula el SPR?', 'Divide el stack efectivo que queda entre el tamaño del bote al empezar el flop. Con 100 detrás y un bote de 20, el SPR es 5.'],
      ['¿Qué es un SPR bajo?', 'Normalmente menos de 3. Con un SPR así, una pareja alta o top pair suele bastar para jugarse todas las fichas.'],
      ['¿Qué SPR tienen los botes con 3-bet?', 'En cash con 100 ciegas, un bote con 3-bet suele empezar el flop con un SPR entre 3 y 5.'],
      ['¿Para qué sirve el SPR?', 'Para decidir antes de apostar cuánto vale tu mano: si estás comprometido a jugarte todo o si debes controlar el tamaño del bote.']
    ]
  },
  'rango': {
    more: `<h2>Cómo se escribe un rango</h2>
    <ul><li><b>“77+”</b>: 77 y todas las parejas mayores (77, 88, 99… AA).</li>
    <li><b>“ATs+”</b>: AT, AJ, AQ y AK del mismo palo.</li>
    <li><b>“KQo”</b>: rey-dama de distinto palo (12 combinaciones).</li>
    <li><b>“Top 15%”</b>: el 15% de las mejores manos según un ranking.</li></ul>
    <h2>Cómo estrechar el rango del rival mano a mano</h2>
    <div class="ex"><b>Ejemplo:</b> un jugador prudente abre desde UTG: su rango empieza en ~15% (parejas, ases buenos, figuras). Tú pagas en el botón. Flop K♦8♣3♥ y apuesta 1/3 del bote: esa apuesta pequeña la hace con casi todo, así que el rango casi no cambia. Turn 5♠ y apuesta 3/4: ahora lo normal es que tenga un rey o mejor, parejas altas o algún farol. River 2♦ y va all-in: su rango se queda en manos muy fuertes (dobles, tríos, AK) y pocos faroles.</div>
    <h2>Rango lineal y rango polarizado</h2>
    <p>Un rango <b>lineal</b> son las mejores manos hasta cierto punto (por ejemplo, un 3-bet con “las 8% mejores”). Un rango <b>polarizado</b> son manos muy fuertes y faroles, sin nada en medio: suele aparecer en apuestas grandes del river. Contra un rango polarizado, tu mano media o gana a todos los faroles o pierde con todas las buenas.</p>
    <h2>Errores típicos</h2>
    <ul><li>Poner al rival en una sola mano (“tiene AK”) y jugar como si fuera seguro.</li>
    <li>No pensar en tu propio rango: si en una situación nunca tienes manos fuertes, el rival puede apostarte fuerte sin miedo.</li></ul>`,
    faq: [
      ['¿Qué significa jugar por rangos?', 'Pensar en todas las manos que puede tener el rival según su posición y sus apuestas, en lugar de adivinar una mano concreta.'],
      ['¿Qué significa 77+ o ATs+?', '77+ son todas las parejas desde 77 hasta AA. ATs+ son AT, AJ, AQ y AK del mismo palo.'],
      ['¿Qué es un rango polarizado?', 'Un rango con manos muy fuertes y faroles, sin manos intermedias. Es típico de apuestas grandes en el river.'],
      ['¿Qué porcentaje de manos se abre desde cada posición?', 'Como orientación en mesas de 6: UTG en torno al 15%, HJ ~19%, CO ~27% y botón ~45%.']
    ]
  },
  'ventaja-de-rango': {
    more: `<h2>Ventaja de rango y ventaja de nuts</h2>
    <p>Son dos ideas distintas. La <b>ventaja de rango</b> es tener más equity en conjunto. La <b>ventaja de nuts</b> es tener más combinaciones de las manos más fuertes posibles (tríos, dobles altas, escaleras). A veces uno tiene la primera y el otro la segunda.</p>
    <div class="ex"><b>Ejemplo:</b> abres desde el botón y paga la ciega grande. Flop 9♠8♠6♦. Tú tienes más parejas altas (ventaja de rango), pero la ciega grande tiene muchas más manos como 75, T7, 98 o 66 porque las defiende a menudo (ventaja de nuts). Aquí apostar pequeño y a menudo suele ser mala idea.</div>
    <h2>Qué flops favorecen a quién</h2>
    <table class="tbl"><tr><th>Flop</th><th>Suele favorecer a…</th></tr>
    <tr><td>A-K-x, A-Q-x, K-Q-x (altos y secos)</td><td>El que subió antes del flop</td></tr>
    <tr><td>K-8-3 de palos distintos</td><td>El que subió (tiene más reyes)</td></tr>
    <tr><td>7-6-5, 8-7-4 con dos del mismo palo</td><td>El que pagó, sobre todo desde la ciega grande</td></tr>
    <tr><td>Parejas bajas en mesa (4-4-2)</td><td>Bastante neutro: pocas manos ligan</td></tr></table>
    <h2>Cómo usarla</h2>
    <p>Con ventaja de rango clara, apuesta a menudo y con tamaños pequeños (1/3 del bote): el rival no puede defender con todo. Sin ella, pasa más, apuesta menos veces y con manos que de verdad quieren apostar. Es la base de una buena <a href="/glosario/c-bet/">c-bet</a>.</p>`,
    faq: [
      ['¿Qué es la ventaja de rango en póker?', 'Tenerla significa que, en un flop concreto, el conjunto de manos que puedes tener gana más a menudo que el conjunto de manos del rival.'],
      ['¿Quién tiene ventaja de rango en un flop con as?', 'Normalmente el jugador que subió antes del flop, porque tiene más ases fuertes en su rango que quien pagó.'],
      ['¿Qué es la ventaja de nuts?', 'Tener más combinaciones de las manos más fuertes posibles en esa mesa, como tríos o escaleras.'],
      ['¿Cómo afecta al tamaño de apuesta?', 'Con mucha ventaja de rango se puede apostar pequeño y con frecuencia; sin ella, conviene apostar menos veces.']
    ]
  },
  'posicion': {
    more: `<h2>Las posiciones de una mesa de 6 y de 9</h2>
    <table class="tbl"><tr><th>Posición</th><th>Nombre</th><th>Manos que se suelen abrir</th></tr>
    <tr><td>UTG</td><td>Under the gun, primero en hablar</td><td>~15% (6 jug.) · ~10% (9 jug.)</td></tr>
    <tr><td>MP / HJ</td><td>Posición media / hijack</td><td>~19%</td></tr>
    <tr><td>CO</td><td>Cutoff, a la derecha del botón</td><td>~27%</td></tr>
    <tr><td>BTN</td><td>Botón</td><td>~45%</td></tr>
    <tr><td>SB</td><td>Ciega pequeña</td><td>~40% si nadie ha entrado</td></tr>
    <tr><td>BB</td><td>Ciega grande</td><td>Defiende muchas manos contra subidas</td></tr></table>
    <h2>Por qué hablar el último vale tanto</h2>
    <ul><li><b>Información:</b> ves si el rival pasa (debilidad) o apuesta antes de decidir.</li>
    <li><b>Control del bote:</b> con una mano media puedes pasar detrás y ver la carta siguiente gratis.</li>
    <li><b>Faroles más baratos:</b> si el rival pasa dos veces, un farol tiene más posibilidades.</li>
    <li><b>Realizas más equity:</b> fuera de posición te obligan a retirarte más a menudo.</li></ul>
    <div class="ex"><b>Ejemplo:</b> con K♣J♦ pagas una subida desde el botón. En el flop el rival pasa: tú puedes apostar o ver gratis el turn. Con la misma mano desde la ciega pequeña, tendrías que hablar primero en cada calle sin saber qué hará él.</div>
    <h2>Errores típicos</h2>
    <ul><li>Jugar las mismas manos desde UTG que desde el botón.</li>
    <li>Pagar muchas subidas desde la ciega pequeña: es la peor posición después del flop.</li></ul>`,
    faq: [
      ['¿Cuál es la mejor posición en póker?', 'El botón, porque después del flop siempre habla el último y puede decidir con más información.'],
      ['¿Qué significa UTG?', 'Under the gun: el primer jugador en hablar antes del flop, justo a la izquierda de la ciega grande. Es la posición en la que se juegan menos manos.'],
      ['¿Qué es tener posición sobre un rival?', 'Hablar después que él en las rondas de apuestas que quedan. Da información y control sobre el tamaño del bote.'],
      ['¿Cuántas manos se juegan desde el botón?', 'En torno al 45% si nadie ha subido antes, frente a un 15% desde UTG en una mesa de 6.']
    ]
  },
  'farol': {
    more: `<h2>Cuántas veces tiene que funcionar un farol</h2>
    <p class="formula">% necesario = apuesta ÷ (bote + apuesta)</p>
    <table class="tbl"><tr><th>Apuestas…</th><th>El rival debe retirarse al menos</th></tr>
    <tr><td>1/3 del bote</td><td>25%</td></tr><tr><td>1/2 del bote</td><td>33%</td></tr>
    <tr><td>2/3 del bote</td><td>40%</td></tr><tr><td>Bote entero</td><td>50%</td></tr>
    <tr><td>El doble del bote</td><td>67%</td></tr></table>
    <h2>Buenas y malas situaciones para farolear</h2>
    <ul><li><b>Buenas:</b> mesas que favorecen tu rango, pocos rivales en el bote, un rival que se retira mucho, una historia coherente (has apostado como si tuvieras una mano fuerte), cartas que te bloquean las manos buenas del rival.</li>
    <li><b>Malas:</b> varios rivales, jugadores que pagan con todo, mesas que conectan con el rango del que paga, faroles “porque sí” sin haber representado nada antes.</li></ul>
    <div class="ex"><b>Semifarol clásico:</b> tienes 8♥7♥ en una mesa K♥6♥5♣. Apuestas: si el rival se retira, ganas ya; si paga, cualquiera de tus 15 outs (9 corazones más los 4 y 9 de otros palos) te puede dar la mejor mano. Ganas de dos formas.</div>
    <h2>Bloqueadores</h2>
    <p>Una carta en tu mano que hace menos probable que el rival tenga una mano fuerte. Con el A♠ en una mesa de tres picas, el rival no puede tener el color al as: es un buen momento para un farol grande.</p>`,
    faq: [
      ['¿Qué diferencia hay entre farol y semifarol?', 'El farol se hace con una mano que casi no puede mejorar; el semifarol, con un proyecto (color o escalera) que puede ligar si el rival paga.'],
      ['¿Cuántas veces tiene que retirarse el rival para que un farol sea rentable?', 'Depende del tamaño: con una apuesta de medio bote, al menos un 33% de las veces; con una apuesta del bote, al menos el 50%.'],
      ['¿Contra quién no conviene farolear?', 'Contra jugadores que pagan casi siempre y en botes con varios rivales: la probabilidad de que todos se retiren es baja.'],
      ['¿Qué es un bloqueador?', 'Una carta de tu mano que reduce las combinaciones fuertes del rival, por ejemplo tener el as del palo en una mesa con posible color.']
    ]
  },
  'stack-efectivo': {
    more: `<h2>Cómo cambia el juego según el stack efectivo</h2>
    <table class="tbl"><tr><th>Stack efectivo</th><th>Cómo se juega</th></tr>
    <tr><td>Menos de 15 ciegas</td><td>Casi todo es ir all-in o retirarse antes del flop</td></tr>
    <tr><td>15 – 30 ciegas</td><td>Subidas pequeñas, 3-bet all-in, poco juego después del flop</td></tr>
    <tr><td>40 – 100 ciegas</td><td>El juego “normal” de las tablas de manos</td></tr>
    <tr><td>Más de 150 ciegas</td><td>Ganan valor las manos que ligan fuerte (parejas pequeñas, conectadas del mismo palo)</td></tr></table>
    <div class="ex"><b>Ejemplo en torneo:</b> tienes 60 ciegas, el rival que sube tiene 12. Aunque tú seas el líder de la mesa, con él juegas un stack efectivo de <b>12 ciegas</b>: si resubes, él irá all-in o se retirará, así que decide como si tú también tuvieras 12.</div>
    <h2>Por qué importa en cada decisión</h2>
    <ul><li>Fija el máximo que puedes ganar con un proyecto (las <a href="/glosario/odds-implicitas/">odds implícitas</a>).</li>
    <li>Determina el <a href="/glosario/spr/">SPR</a> y cuánto vale tu pareja.</li>
    <li>En botes de varios jugadores, cada rival tiene su propio stack efectivo contigo.</li></ul>`,
    faq: [
      ['¿Qué es el stack efectivo?', 'El menor de los stacks entre tú y tu rival en una mano. Es lo máximo que podéis ganar o perder entre vosotros.'],
      ['¿Cómo se mide el stack efectivo en torneos?', 'En ciegas grandes: si la ciega grande es 1.000 y el stack efectivo es 25.000, tienes 25 ciegas.'],
      ['¿Con cuántas ciegas se juega all-in o fuera?', 'A partir de unas 15 ciegas o menos, la mayoría de decisiones antes del flop se simplifican a ir all-in o retirarse.'],
      ['¿Qué manos mejoran con stacks profundos?', 'Las que pueden ligar manos muy fuertes y escondidas: parejas pequeñas buscando trío y cartas conectadas del mismo palo.']
    ]
  },
  'odds-implicitas': {
    more: `<h2>Cuánto tienes que ganar después</h2>
    <p>Puedes calcular lo mínimo que te tiene que pagar el rival si ligas para que pagar hoy compense:</p>
    <p class="formula">ganancia futura necesaria ≈ (lo que pagas ÷ % de ligar) − (bote + lo que pagas)</p>
    <div class="ex"><b>Ejemplo:</b> set mining con 55. Te cuesta 3 ciegas pagar una subida y el bote total quedaría en ~7,5. Ligas trío en el flop ~12% de las veces: 3 ÷ 0,12 = 25; 25 − 7,5 = <b>17,5 ciegas</b> que tienes que cobrar de media cuando ligas. Por eso se dice que para jugar parejas pequeñas buscando trío hacen falta unos 15–20 veces lo que pagas detrás.</div>
    <h2>Odds implícitas inversas</h2>
    <p>Es lo contrario: lo que <b>pierdes</b> después cuando ligas tu mano pero el rival liga una mejor. Por ejemplo, ligar un color bajo contra un color más alto, o top pair con kicker malo contra top pair con kicker bueno. Las manos que ligan “segundas mejores” (A5 de distinto palo, colores bajos) sufren odds implícitas inversas.</p>
    <h2>Cuándo son altas y cuándo bajas</h2>
    <ul><li><b>Altas:</b> stacks profundos, proyectos escondidos (escalera interna, trío), rivales que pagan mucho.</li>
    <li><b>Bajas:</b> stacks cortos, proyectos evidentes (tercera carta del mismo palo en la mesa), rivales prudentes.</li></ul>`,
    faq: [
      ['¿Qué son las odds implícitas?', 'Lo que esperas ganar en las calles siguientes si ligas tu mano, sumado al bote actual al decidir si pagar.'],
      ['¿Qué son las odds implícitas inversas?', 'Lo que puedes perder después cuando ligas una mano buena pero el rival tiene una todavía mejor.'],
      ['¿Cuántas ciegas hacen falta para jugar parejas pequeñas buscando trío?', 'Como regla, que podáis jugaros entre 15 y 20 veces lo que te cuesta pagar la subida.'],
      ['¿Cuándo no hay que contar con odds implícitas?', 'Con stacks cortos, cuando tu proyecto es muy evidente o contra rivales que dejan de pagar en cuanto sale la carta peligrosa.']
    ]
  },
  'c-bet': {
    more: `<h2>Con qué frecuencia hacer c-bet</h2>
    <table class="tbl"><tr><th>Situación</th><th>Frecuencia orientativa</th><th>Tamaño</th></tr>
    <tr><td>En posición, flop alto y seco (K-7-2)</td><td>Alta (casi siempre)</td><td>1/3 del bote</td></tr>
    <tr><td>En posición, flop conectado (9-8-6 dos palos)</td><td>Baja, solo manos fuertes y proyectos</td><td>2/3 del bote o más</td></tr>
    <tr><td>Fuera de posición</td><td>Menor que en posición</td><td>Según la mesa</td></tr>
    <tr><td>Contra 2 o más rivales</td><td>Mucho menor: solo con mano o buen proyecto</td><td>Mayor</td></tr></table>
    <h2>Qué hacer en el turn (segunda barrel)</h2>
    <p>Si tu c-bet recibe un pago, sigue apostando en el turn cuando la carta te favorece (un as o un rey que el que paga rara vez tiene) o te da proyecto. Si la carta completa proyectos del rival y no te ayuda, suele ser mejor pasar.</p>
    <div class="ex"><b>Ejemplo:</b> abres desde CO con A♦Q♣ y paga el botón. Flop K♠7♦2♣: c-bet de 1/3; muchas manos del rival no han ligado. Te paga. Turn 5♥: carta neutra, puedes pasar. Si en cambio sale un as, apuesta de nuevo: ahora tienes top pair.</div>
    <h2>Errores típicos</h2>
    <ul><li>Hacer c-bet el 100% de las veces: los rivales atentos te suben con cualquier cosa.</li>
    <li>Apostar en flops bajos y conectados contra la ciega grande sin mano ni proyecto.</li>
    <li>Rendirse siempre en el turn: tus c-bets se vuelven fáciles de pagar con poco.</li></ul>`,
    faq: [
      ['¿Qué significa c-bet en póker?', 'Continuation bet o apuesta de continuación: la apuesta en el flop del jugador que subió antes del flop.'],
      ['¿De qué tamaño debe ser una c-bet?', 'En flops secos, pequeña (alrededor de 1/3 del bote); en flops con muchos proyectos, más grande (2/3 o más).'],
      ['¿Hay que hacer c-bet siempre?', 'No. Funciona bien en flops que favorecen tu rango y contra un solo rival; en flops conectados o contra varios rivales conviene hacerla mucho menos.'],
      ['¿Qué es una doble barrel?', 'Volver a apostar en el turn después de una c-bet en el flop que el rival pagó.']
    ]
  },
  '3-bet': {
    more: `<h2>Tamaños de 3-bet recomendados</h2>
    <table class="tbl"><tr><th>Situación</th><th>Tamaño</th><th>Ejemplo (apertura a 2,5 ciegas)</th></tr>
    <tr><td>En posición (CO o botón)</td><td>~3 veces la subida</td><td>7,5 ciegas</td></tr>
    <tr><td>Fuera de posición (ciegas)</td><td>~4 veces la subida</td><td>10 ciegas</td></tr>
    <tr><td>Con jugadores que ya han pagado (squeeze)</td><td>+1 subida por cada uno</td><td>12–13 ciegas</td></tr></table>
    <h2>Qué manos usar</h2>
    <ul><li><b>Por valor:</b> AA, KK, QQ, AK siempre; JJ, TT, AQ y KQ del mismo palo contra aperturas de posiciones tardías.</li>
    <li><b>De farol:</b> A5s–A2s (bloquean ases y ligan escaleras y colores), algunas conectadas del mismo palo (76s, 65s) y figuras del mismo palo (KJs, QJs) desde el botón o las ciegas.</li></ul>
    <h2>Qué hacer si te hacen 3-bet a ti</h2>
    <p>Contra un 3-bet puedes retirarte, pagar o hacer 4-bet. Como orientación: haz 4-bet con AA, KK y a veces QQ y AK; paga con parejas medias y figuras del mismo palo si tienes posición; retírate con el resto. Lo tienes explicado en la guía <a href="/guias/que-hacer-contra-un-3-bet/">qué hacer contra un 3-bet</a>.</p>
    <div class="ex"><b>Por qué hacer 3-bet y no solo pagar:</b> ganas el bote al momento muchas veces, juegas contra un solo rival en lugar de varios y construyes un bote grande con tus mejores manos.</div>`,
    faq: [
      ['¿Qué es un 3-bet en póker?', 'La primera resubida antes del flop: un jugador sube y otro vuelve a subir encima.'],
      ['¿Por qué se llama 3-bet?', 'Porque la ciega grande cuenta como la primera apuesta, la subida inicial como la segunda y la resubida como la tercera.'],
      ['¿Con qué manos hacer 3-bet?', 'Siempre con AA, KK, QQ y AK; contra aperturas tardías también con JJ, TT, AQs o KQs, y de farol con manos como A5s o A4s.'],
      ['¿Qué es un 4-bet?', 'Volver a subir después de un 3-bet. Con muchas ciegas suele indicar manos muy fuertes como AA o KK.']
    ]
  },
  'ciegas': {
    more: `<h2>Cómo afectan las ciegas a tu estrategia</h2>
    <ul><li>Estar en las ciegas <b>cuesta dinero</b>: son las únicas posiciones que pierden a la larga incluso en jugadores ganadores. El objetivo es perder lo menos posible.</li>
    <li>Desde la <b>ciega grande</b> ya tienes una ciega puesta, así que pagar una subida es barato: se defienden muchas manos (mira la <a href="/guias/como-jugar-desde-la-ciega-grande/">guía de la ciega grande</a>).</li>
    <li>Desde la <b>ciega pequeña</b> es mejor subir o retirarse que solo pagar, porque después jugarás fuera de posición.</li></ul>
    <h2>Estructura de ciegas en torneos</h2>
    <p>En los torneos las ciegas suben cada cierto tiempo (niveles). Por eso tu stack “en ciegas” baja aunque no pierdas fichas, y al final el juego se vuelve más agresivo: con 10–15 ciegas se juega casi todo all-in o retirarse.</p>
    <div class="ex"><b>Ejemplo:</b> empiezas con 20.000 fichas y ciegas 100/200: tienes 100 ciegas. Dos horas después, con las mismas 20.000 y ciegas 500/1.000, solo tienes 20 ciegas: el mismo stack ya obliga a jugar de otra forma.</div>
    <h2>El “big blind ante”</h2>
    <p>Muchos torneos cobran el ante de una vez al jugador de la ciega grande (igual a una ciega grande) en lugar de a todos. El efecto es el mismo: el bote empieza con 2,5 ciegas en vez de 1,5, y compensa abrir y defender más manos.</p>`,
    faq: [
      ['¿Qué son la ciega pequeña y la ciega grande?', 'Dos apuestas obligatorias que ponen los jugadores a la izquierda del botón antes de repartir. La pequeña suele ser la mitad de la grande.'],
      ['¿Qué es el ante en póker?', 'Una pequeña apuesta obligatoria que se añade en los torneos para que el bote inicial sea mayor. A menudo la paga entera el jugador de la ciega grande.'],
      ['¿Por qué se mide el stack en ciegas grandes?', 'Porque así se puede comparar cualquier partida: 40 ciegas significan lo mismo en una mesa de 1/2 que en un torneo con ciegas de 1.000.'],
      ['¿Hay que defender siempre la ciega grande?', 'No siempre, pero sí con muchas más manos que desde otras posiciones, porque ya tienes dinero en el bote y pagar sale barato.']
    ]
  }
};
