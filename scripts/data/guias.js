// Guías para búsquedas concretas (/guias/…). Las usa scripts/build-seo.js.
// Cada guía: slug, título (h1), descripción (meta y entradilla), cuerpo en HTML,
// manos relacionadas (códigos del ranking) y términos del glosario relacionados.
// Las cifras de equity salen de simulaciones con el evaluador de scripts/equity-preflop.js.
module.exports = [
  {
    slug: 'como-jugar-ak-preflop',
    title: 'Cómo jugar AK preflop',
    desc: 'AK (as-rey) es una de las mejores manos del póker, pero no es una pareja. Qué hacer con AK antes del flop: abrir, resubir, pagar o ir all-in, con cifras.',
    body: `<p><b>AK</b> (as-rey) está entre las 10 mejores manos iniciales, pero tiene una trampa: <b>antes del flop no ha ligado nada</b>. Es la mejor mano sin pareja, no una mano hecha.</p>
  <h2>Si nadie ha subido: abre siempre</h2>
  <p>Con AK del mismo palo (AKs) o de distinto palo (AKo), <b>sube desde cualquier posición</b>, también desde UTG. No hagas limp (solo igualar la ciega): quieres un bote más grande y quitarte rivales.</p>
  <h2>Si alguien ha subido: resube (3-bet)</h2>
  <p>AK es una mano clarísima para <a href="/glosario/3-bet/">3-bet</a> por valor: domina a las manos que suelen pagarte (AQ, AJ, KQ, KJ) y bloquea AA y KK, porque tienes un as y un rey.</p>
  <div class="ex"><b>Cifras:</b> AK de distinto palo gana ~74% contra AQ y contra KQ, pero solo ~43% contra QQ y ~7,5% contra AA.</div>
  <h2>Si te hacen 4-bet o te empujan all-in</h2>
  <ul><li><b>Con muchas ciegas (100 o más)</b> contra un jugador prudente, su rango de 4-bet suele ser AA, KK y alguna vez QQ o AK. Ahí AK va mal: pagar o retirarte a veces es lo correcto.</li>
  <li><b>Con 40 ciegas o menos</b>, sobre todo en torneo, ir all-in con AK es casi siempre bueno: el rival también empuja con AQ, parejas medias y faroles.</li></ul>
  <h2>Después del flop</h2>
  <p>AK liga pareja o mejor en el flop solo un <b>32%</b> de las veces. Si no liga, tienes dos cartas altas (6 <a href="/glosario/outs/">outs</a>): una <a href="/glosario/c-bet/">apuesta de continuación</a> en flops altos y secos suele funcionar, pero no te empeñes en ganar el bote cuando el rival sigue pagando en flops bajos y conectados.</p>
  <div class="ex"><b>Error típico:</b> ir all-in en el flop con “as alto” porque AK “es muy buena mano”. Sin ligar, pierde contra cualquier pareja.</div>`,
    hands: ['AKs', 'AKo', 'AQs', 'QQ'],
    gloss: ['3-bet', 'c-bet', 'outs']
  },
  {
    slug: 'cuando-hacer-3-bet',
    title: 'Cuándo hacer 3-bet en póker (y con qué manos)',
    desc: 'Cuándo resubir antes del flop: 3-bet por valor con las mejores manos, 3-bet de farol con manos que bloquean, y el tamaño correcto según tu posición.',
    body: `<p>Un <a href="/glosario/3-bet/">3-bet</a> es la primera resubida antes del flop. Se hace por dos motivos: <b>por valor</b> (tu mano es mejor que las que te pagan) o <b>de farol</b> (quieres que el rival se retire y tu mano tiene recursos si te pagan).</p>
  <h2>3-bet por valor</h2>
  <p>La base es sencilla: <b>AA, KK, QQ y AK</b> siempre. Contra aperturas de posiciones tardías (CO, botón), que abren muchas más manos, añade <b>JJ, TT, AQ y KQ del mismo palo</b>.</p>
  <h2>3-bet de farol</h2>
  <p>Las mejores manos para resubir de farol son <b>A5s, A4s, A3s y A2s</b>: el as quita combinaciones de AA y AK al rival, y si te paga puedes ligar color o escalera. También sirven algunas cartas conectadas del mismo palo (76s, 65s) desde el botón o las ciegas.</p>
  <div class="ex"><b>Regla práctica:</b> por cada 2 manos de valor, como mucho 1 de farol. Contra jugadores que nunca se retiran, quita los faroles.</div>
  <h2>Cuánto subir</h2>
  <ul><li><b>En posición</b> (hablas después en el flop): unas <b>3 veces</b> la subida. Si abren a 2,5 ciegas, sube a 7,5.</li>
  <li><b>Fuera de posición</b> (desde las ciegas): unas <b>4 veces</b>. Si abren a 2,5, sube a 10.</li>
  <li>Si ya han pagado otros jugadores, añade una subida más por cada uno.</li></ul>
  <h2>Cuándo no hacer 3-bet</h2>
  <p>Contra un jugador de UTG muy prudente, manos como AJ o KQ de distinto palo están <b>dominadas</b> por su rango: resubir te mete en botes grandes con la peor mano. Ahí es mejor pagar en posición o retirarte.</p>`,
    hands: ['AKo', 'A5s', 'QQ', 'KQs'],
    gloss: ['3-bet', 'posicion', 'rango']
  },
  {
    slug: 'como-calcular-outs',
    title: 'Cómo calcular outs y la probabilidad de ligar',
    desc: 'Cómo contar tus outs y convertirlos en probabilidad con la regla del 4 y el 2. Tabla con los proyectos más comunes: color, escalera, gutshot y más.',
    body: `<p>Los <a href="/glosario/outs/">outs</a> son las cartas que te dan la mano ganadora. Contarlos es el primer paso para saber si pagar una apuesta compensa.</p>
  <h2>Cómo contarlos</h2>
  <ol><li>Piensa qué mano necesitas para ganar (no solo para mejorar).</li>
  <li>Cuenta cuántas cartas que quedan te la dan.</li>
  <li>Descuenta las que te dan la mano pero también se la mejoran al rival.</li></ol>
  <div class="ex"><b>Ejemplo:</b> tienes 8♥7♥ y el flop es K♥9♥2♠. Hay 13 corazones y ves 4: quedan <b>9 outs</b> para color.</div>
  <h2>La regla del 4 y del 2</h2>
  <p class="formula">En el flop: outs × 4 ≈ % de ligar hasta el river<br>En el turn: outs × 2 ≈ % de ligar en el river</p>
  <p>Con más de 8 outs la regla del 4 exagera un poco: resta (outs − 8). Con 15 outs: 15 × 4 − 7 = 53%.</p>
  <h2>Tabla de proyectos comunes</h2>
  <table class="tbl"><tr><th>Proyecto</th><th>Outs</th><th>Flop → river</th><th>Turn → river</th></tr>
  <tr><td>Color + escalera abierta</td><td>15</td><td>54%</td><td>33%</td></tr>
  <tr><td>Color</td><td>9</td><td>35%</td><td>20%</td></tr>
  <tr><td>Escalera abierta (dos puntas)</td><td>8</td><td>31,5%</td><td>17%</td></tr>
  <tr><td>Dos cartas por encima</td><td>6</td><td>24%</td><td>13%</td></tr>
  <tr><td>Escalera por dentro (gutshot)</td><td>4</td><td>16,5%</td><td>9%</td></tr>
  <tr><td>Pareja a trío</td><td>2</td><td>8,4%</td><td>4%</td></tr></table>
  <p>Ojo: el porcentaje “flop → river” solo vale si vas a ver las dos cartas. Si el rival va a volver a apostar en el turn, usa el de una sola carta (el de la derecha, aproximadamente) para comparar con las <a href="/guias/como-calcular-pot-odds/">pot odds</a>.</p>`,
    hands: ['T9s', 'JTs', '76s'],
    gloss: ['outs', 'pot-odds', 'equity']
  },
  {
    slug: 'como-calcular-pot-odds',
    title: 'Cómo calcular las pot odds y saber si pagar',
    desc: 'La fórmula de las pot odds, una tabla según el tamaño de la apuesta y cómo compararlas con tu equity para decidir si pagar es rentable.',
    body: `<p>Las <a href="/glosario/pot-odds/">pot odds</a> te dicen <b>cuántas veces necesitas ganar</b> para que pagar no pierda dinero.</p>
  <p class="formula">pot odds = lo que pagas ÷ (bote final si pagas)</p>
  <div class="ex"><b>Ejemplo:</b> el bote es 100 y el rival apuesta 50. Si pagas 50, el bote final es 100 + 50 + 50 = 200. Pot odds = 50 ÷ 200 = <b>25%</b>.</div>
  <h2>Tabla rápida según la apuesta</h2>
  <table class="tbl"><tr><th>El rival apuesta</th><th>Necesitas ganar</th></tr>
  <tr><td>1/3 del bote</td><td>20%</td></tr>
  <tr><td>1/2 del bote</td><td>25%</td></tr>
  <tr><td>2/3 del bote</td><td>28,6%</td></tr>
  <tr><td>El bote entero</td><td>33,3%</td></tr>
  <tr><td>El doble del bote</td><td>40%</td></tr></table>
  <h2>Cómo decidir</h2>
  <p>Compara las pot odds con tu <a href="/glosario/equity/">equity</a>: si ganas más veces de las que necesitas, <b>paga</b>; si menos, <b>retírate</b> (salvo que tengas <a href="/glosario/odds-implicitas/">odds implícitas</a>).</p>
  <div class="ex"><b>Ejemplo:</b> en el turn tienes proyecto de color (9 outs, ~20%) y el rival apuesta medio bote (necesitas 25%). Por pot odds no llega: solo compensa si esperas cobrar bastante más en el river cuando ligues.</div>
  <p>Para sacar tu equity con proyectos, cuenta tus outs: <a href="/guias/como-calcular-outs/">cómo calcular outs</a>.</p>`,
    hands: [],
    gloss: ['pot-odds', 'equity', 'ev', 'odds-implicitas']
  },
  {
    slug: 'como-jugar-parejas-pequenas',
    title: 'Cómo jugar parejas pequeñas (set mining)',
    desc: 'Cómo jugar 22, 33, 44 y 55: cuándo pagar para buscar trío (set mining), la regla del 15 a 1 y qué hacer si no ligas en el flop.',
    body: `<p>Las parejas pequeñas (22 a 55) casi nunca ganan sin mejorar. Su valor está en <b>ligar trío</b>, que sí suele ganar botes grandes.</p>
  <h2>Cuántas veces ligas trío</h2>
  <p>Con una pareja en la mano ligas trío o mejor en el flop un <b>11,8%</b> de las veces: aproximadamente <b>1 de cada 8,5</b>. Hasta el river, un 19%.</p>
  <h2>La regla del 15 a 1</h2>
  <p>Como fallas unas 7,5 veces por cada vez que ligas, pagar una subida solo para buscar trío compensa si, cuando ligas, puedes ganar <b>unas 15 veces lo que pagas</b> (contando lo que ganarás después).</p>
  <div class="ex"><b>Ejemplo:</b> te suben a 3 ciegas y os quedan 100 ciegas a cada uno: 15 × 3 = 45, así que pagar para buscar trío va bien. Si te resuben a 12 ciegas con 100 de stack, 15 × 12 = 180: no llega, retírate.</div>
  <h2>Si no ligas en el flop</h2>
  <p>Si el flop trae cartas altas y el rival apuesta, lo normal es <b>retirarse</b>. No te enamores de 44 en un flop K-Q-8.</p>
  <h2>Cuándo abrir con ellas</h2>
  <p>Si nadie ha entrado, las parejas pequeñas se abren desde posiciones medias y tardías. Desde UTG en mesa llena, muchos jugadores las tiran. Mira cada mano: <a href="/manos/22/">22</a>, <a href="/manos/33/">33</a>, <a href="/manos/44/">44</a>, <a href="/manos/55/">55</a>.</p>
  <p>En torneo con pocas ciegas (15 o menos), dejan de valer para buscar trío: se juegan con all-in o se tiran.</p>`,
    hands: ['22', '33', '44', '55', '66'],
    gloss: ['odds-implicitas', 'stack-efectivo']
  },
  {
    slug: 'como-jugar-desde-la-ciega-grande',
    title: 'Cómo jugar desde la ciega grande',
    desc: 'Qué manos defender desde la ciega grande (BB) cuando te suben: por qué puedes pagar con más manos, cuándo resubir y cuándo retirarte.',
    body: `<p>Desde la <b>ciega grande</b> ya has puesto 1 ciega. Cuando alguien sube, pagas menos para ver el flop que cualquier otro jugador, así que <b>puedes defender muchas más manos</b>.</p>
  <div class="ex"><b>Ejemplo:</b> el botón sube a 2,5 ciegas y la pequeña se retira. En el bote hay 2,5 + 0,5 + 1 = 4 ciegas y te cuesta 1,5 pagar: necesitas ganar solo un 1,5 ÷ 5,5 ≈ <b>27%</b> de las veces.</div>
  <h2>Cuánto defender</h2>
  <ul><li>Contra el <b>botón</b> o la ciega pequeña: más de la mitad de las manos (en torneo con antes, aún más).</li>
  <li>Contra <b>UTG</b>: bastantes menos, porque su rango es más fuerte.</li></ul>
  <p>Consulta la tabla: <a href="/tablas/6-max-cash/bb/">qué manos defender desde BB en 6 jugadores</a>.</p>
  <h2>Pagar o resubir</h2>
  <p>Resube (3-bet) con las manos más fuertes y con algunos ases pequeños del mismo palo. Paga con las manos que juegan bien después del flop: cartas del mismo palo, conectadas y parejas.</p>
  <h2>El problema: juegas fuera de posición</h2>
  <p>Después del flop hablarás primero en todas las calles. Por eso las manos de distinto palo y sin conexión (como J3o o T4o) se tiran aunque el precio sea bueno: ligan poco y cuesta jugarlas.</p>`,
    hands: ['K9s', '76s', 'Q8o', 'A5o'],
    gloss: ['ciegas', 'posicion', 'pot-odds']
  },
  {
    slug: 'cuanto-subir-preflop',
    title: 'Cuánto subir preflop: el tamaño de apertura',
    desc: 'Cuántas ciegas subir antes del flop en cash y en torneo, cuánto añadir si ya han entrado otros jugadores y por qué no conviene hacer limp.',
    body: `<p>El tamaño de la subida inicial (<i>open</i>) no tiene que ser perfecto, pero sí coherente. Estas son las referencias más usadas:</p>
  <table class="tbl"><tr><th>Situación</th><th>Subida</th></tr>
  <tr><td>Cash online, nadie ha entrado</td><td>2,5 ciegas</td></tr>
  <tr><td>Cash en vivo</td><td>3 a 4 ciegas</td></tr>
  <tr><td>Torneo con antes</td><td>2 a 2,2 ciegas</td></tr>
  <tr><td>Desde la ciega pequeña</td><td>3 ciegas</td></tr>
  <tr><td>Por cada jugador que ha igualado (limp)</td><td>+1 ciega</td></tr></table>
  <h2>Usa siempre el mismo tamaño</h2>
  <p>Sube lo mismo con AA que con 76s. Si subes más con tus mejores manos, los rivales atentos lo notan.</p>
  <h2>¿Y el limp?</h2>
  <p>Igualar la ciega grande sin subir (<i>limp</i>) suele ser peor que subir o tirar: no puedes ganar el bote antes del flop y dejas entrar a la ciega grande gratis. La excepción es la ciega pequeña en algunas estrategias avanzadas.</p>
  <p>Qué manos abrir según tu sitio en la mesa: <a href="/tablas/">tablas de manos por posición</a>.</p>`,
    hands: ['AA', '76s'],
    gloss: ['ciegas', 'posicion']
  },
  {
    slug: 'como-jugar-proyecto-de-color',
    title: 'Cómo jugar un proyecto de color',
    desc: 'Qué hacer con proyecto de color en el flop y el turn: cuándo pagar según las pot odds, cuándo apostar de semifarol y cuándo tu color no basta.',
    body: `<p>Tienes <b>proyecto de color</b> cuando te falta una carta del mismo palo para completar color. Te quedan <b>9 outs</b>.</p>
  <table class="tbl"><tr><th>Momento</th><th>Probabilidad de ligar</th></tr>
  <tr><td>En el flop, hasta el river</td><td>35%</td></tr>
  <tr><td>En el flop, solo el turn</td><td>19%</td></tr>
  <tr><td>En el turn, en el river</td><td>19,6%</td></tr></table>
  <h2>Pagar</h2>
  <p>Con una carta por venir necesitas unas pot odds de ~20%: pagar una apuesta de <b>1/3 del bote</b> es rentable por sí solo; contra <b>medio bote o más</b>, necesitas <a href="/glosario/odds-implicitas/">odds implícitas</a>.</p>
  <h2>Apostar de semifarol</h2>
  <p>Muchas veces es mejor <b>apostar o subir</b> tú: ganas si el rival se retira y, si paga, aún puedes ligar. Es un <a href="/glosario/farol/">semifarol</a>. Funciona mejor si tu proyecto tiene extras (escalera, cartas por encima) o un as del palo.</p>
  <h2>Cuidado con el color bajo</h2>
  <p>Con 6♥5♥ en una mesa de tres corazones, un rival con A♥ o K♥ te gana. Por eso el color al as (<i>nut flush draw</i>) vale mucho más que un color bajo.</p>`,
    hands: ['A5s', 'KQs', 'T9s', '65s'],
    gloss: ['outs', 'farol', 'odds-implicitas']
  },
  {
    slug: 'cuando-hacer-un-farol',
    title: 'Cuándo hacer un farol en póker',
    desc: 'Cuándo compensa farolear: cuántas veces tiene que retirarse el rival según tu apuesta, contra quién funciona y qué cartas de la mesa te ayudan.',
    body: `<p>Un <a href="/glosario/farol/">farol</a> gana dinero si el rival se retira <b>suficientes veces</b>. Cuántas depende del tamaño de tu apuesta:</p>
  <p class="formula">% de retiradas necesario = tu apuesta ÷ (bote + tu apuesta)</p>
  <table class="tbl"><tr><th>Apuestas</th><th>El rival debe retirarse</th></tr>
  <tr><td>1/3 del bote</td><td>25%</td></tr>
  <tr><td>1/2 del bote</td><td>33%</td></tr>
  <tr><td>2/3 del bote</td><td>40%</td></tr>
  <tr><td>El bote entero</td><td>50%</td></tr></table>
  <h2>Cuándo funciona mejor</h2>
  <ul><li><b>Contra uno o dos rivales</b>, no contra cuatro.</li>
  <li>Cuando la mesa <b>favorece tu rango</b>: si subiste preflop y sale A-K-x, puedes tener mucho más que el rival (<a href="/glosario/ventaja-de-rango/">ventaja de rango</a>).</li>
  <li>Cuando tu historia tiene sentido: apostaste en cada calle como lo harías con una mano fuerte.</li>
  <li>Con <b>proyectos</b> (semifarol): si te pagan, aún puedes ligar.</li></ul>
  <h2>Cuándo no</h2>
  <p>Contra jugadores que pagan con todo, en partidas pequeñas con muchos rivales, o cuando el rival ya ha mostrado mucha fuerza (resubió o apostó grande). Contra esos, apuesta por valor y olvídate del farol.</p>`,
    hands: ['A5s', '76s'],
    gloss: ['farol', 'ventaja-de-rango', 'c-bet']
  },
  {
    slug: 'que-hacer-contra-un-3-bet',
    title: 'Qué hacer cuando te hacen 3-bet',
    desc: 'Subes preflop y te resuben: cuándo pagar, cuándo hacer 4-bet y cuándo retirarte, según tu mano, tu posición y el jugador que resube.',
    body: `<p>Has abierto y un rival te resube (<a href="/glosario/3-bet/">3-bet</a>). Tienes tres opciones: <b>retirarte, pagar o volver a subir (4-bet)</b>.</p>
  <h2>4-bet</h2>
  <p>Con <b>AA y KK</b>, siempre. Con <b>QQ y AK</b>, casi siempre contra jugadores agresivos; contra uno muy prudente, pagar es razonable. Algún farol de 4-bet con A5s o A4s solo si el rival resube mucho.</p>
  <h2>Pagar</h2>
  <p>Paga con manos que juegan bien después del flop y no están dominadas: <b>parejas medias (TT–77)</b>, <b>AQ y AJ del mismo palo</b>, <b>KQs</b>, <b>JTs</b>. Es mucho más cómodo si tienes posición.</p>
  <h2>Retirarte</h2>
  <p>Con el resto de tu rango de apertura, sobre todo con manos de distinto palo como <b>AJo, KQo o KJo</b>: contra un 3-bet suelen ir por detrás de AK, AQ y parejas altas.</p>
  <div class="ex"><b>Regla práctica:</b> contra un 3-bet, sigue en el bote con una parte de tu rango de apertura, no con todo. Si abriste desde UTG con manos fuertes, puedes continuar con más; si abriste desde el botón con el 45%, retírate con la mayoría.</div>
  <p>¿Cuánto hacer 4-bet? Unas 2,2 a 2,5 veces el 3-bet si tienes posición, algo más si no.</p>`,
    hands: ['QQ', 'AKo', 'AJo', 'TT'],
    gloss: ['3-bet', 'posicion', 'rango']
  },
  {
    slug: 'cuando-hacer-c-bet',
    title: 'Cuándo hacer una apuesta de continuación (c-bet)',
    desc: 'En qué flops apostar después de subir preflop, con qué tamaño y cuándo es mejor pasar: guía práctica de la c-bet con ejemplos.',
    body: `<p>Subiste antes del flop y te han pagado. La <a href="/glosario/c-bet/">c-bet</a> es volver a apostar en el flop. No hay que hacerla siempre: depende del flop.</p>
  <h2>Flops buenos para apostar</h2>
  <ul><li><b>Secos y altos</b> (A-7-2, K-8-3 de palos distintos): tu rango tiene muchos ases y reyes; el del rival, menos. Apuesta pequeño (1/3 del bote) con casi todo.</li>
  <li><b>Con una carta alta y proyectos</b> (K♥9♥4♣): apuesta más grande (2/3) con tus manos fuertes y tus proyectos.</li></ul>
  <h2>Flops malos para apostar</h2>
  <ul><li><b>Bajos y conectados</b> (7-6-5, 8-7-4 con proyectos): favorecen a quien pagó, sobre todo desde la ciega grande. Pasa con muchas manos.</li>
  <li><b>Contra varios rivales</b>: alguno habrá ligado algo. Apuesta solo con manos buenas.</li></ul>
  <div class="ex"><b>Ejemplo:</b> abres con A♠Q♦ en el botón, paga la ciega grande y sale K♣7♦2♥. No has ligado, pero es un flop muy bueno para ti: apuesta 1/3 del bote.</div>
  <p>Una apuesta de 1/3 del bote solo necesita que el rival se retire un 25% de las veces para ganar dinero aunque no tengas nada: <a href="/guias/cuando-hacer-un-farol/">cuándo hacer un farol</a>.</p>`,
    hands: ['AQo', 'AKo'],
    gloss: ['c-bet', 'ventaja-de-rango', 'farol']
  },
  {
    slug: 'probabilidades-de-poker',
    title: 'Probabilidades de póker que debes saber',
    desc: 'Las probabilidades más útiles del Texas Hold’em: recibir parejas o AK, ligar en el flop, completar proyectos y enfrentamientos típicos antes del flop.',
    body: `<h2>Al repartir</h2>
  <table class="tbl"><tr><th>Recibir…</th><th>Probabilidad</th></tr>
  <tr><td>Una pareja cualquiera</td><td>5,9% (1 de cada 17)</td></tr>
  <tr><td>AA</td><td>0,45% (1 de cada 221)</td></tr>
  <tr><td>AK (cualquiera)</td><td>1,2% (1 de cada 83)</td></tr>
  <tr><td>Dos cartas del mismo palo</td><td>23,5%</td></tr></table>
  <h2>En el flop</h2>
  <table class="tbl"><tr><th>Con…</th><th>Ligas…</th><th>Probabilidad</th></tr>
  <tr><td>Una pareja</td><td>trío o mejor</td><td>11,8%</td></tr>
  <tr><td>Dos cartas distintas</td><td>al menos pareja con una de ellas</td><td>32,4%</td></tr>
  <tr><td>Dos del mismo palo</td><td>color hecho</td><td>0,8%</td></tr>
  <tr><td>Dos del mismo palo</td><td>proyecto de color</td><td>10,9%</td></tr></table>
  <h2>Enfrentamientos antes del flop</h2>
  <table class="tbl"><tr><th>Enfrentamiento</th><th>Gana la primera</th></tr>
  <tr><td>Pareja contra pareja menor (QQ vs JJ)</td><td>81%</td></tr>
  <tr><td>Pareja contra dos cartas mayores (77 vs AK)</td><td>55%</td></tr>
  <tr><td>Dos mayores contra dos menores (AK vs JT)</td><td>62%</td></tr>
  <tr><td>Mano dominada (AJ vs AK)</td><td>26%</td></tr>
  <tr><td>AK contra AA</td><td>7,5%</td></tr></table>
  <p>Para los proyectos después del flop, mira <a href="/guias/como-calcular-outs/">cómo calcular outs</a>. Y la equity de cada mano contra una mano al azar está en su página: <a href="/manos/">todas las manos iniciales</a>.</p>`,
    hands: ['AA', 'AKo', '77', 'QQ'],
    gloss: ['equity', 'outs']
  }
];
