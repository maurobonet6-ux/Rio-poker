// Publicaciones de texto del canal de Telegram: un dato útil de póker con el enlace a la página de la web que lo explica.
// Las publica api/telegram.js los días que toca texto, en orden; al acabarse la lista no se repite ninguna.
// Los datos salen de las propias páginas de la web (glosario, guías y manos); no hay cifras inventadas.
// `link` es la página de la web (se le añade ?utm_source=telegram al publicar). Límite de Telegram: 4096 caracteres.
module.exports = [
  { texto: '💡 Pot odds en 10 segundos\n\nSi el rival apuesta medio bote, necesitas ganar al menos el 25% de las veces para que pagar sea rentable.\n\nBote 100, apuesta 50: pagas 50 para un bote final de 200 → 50 ÷ 200 = 25%.',
    link: '/glosario/pot-odds/' },
  { texto: '🧮 La regla del 4 y del 2\n\nEn el flop, multiplica tus outs × 4 y tendrás tu probabilidad aproximada de ligar hasta el river. En el turn, × 2.\n\nEscalera abierta (8 outs): 8 × 4 = 32%.',
    link: '/guias/como-calcular-outs/' },
  { texto: '🎰 ¿Cada cuántas manos te tocan ases?\n\nHay 6 combinaciones de AA entre 1.326 manos posibles: 1 de cada 221 (0,45%). Cuando llegan, hay que sacarles todo el valor.',
    link: '/guias/probabilidades-de-poker/' },
  { texto: '📍 La posición vale dinero\n\nEn el botón hablas el último en todas las calles: ves qué hacen los demás antes de decidir. Por eso es la mejor posición de la mesa.',
    link: '/glosario/posicion/' },
  { texto: '📏 SPR: cuánto te queda por jugar\n\nSPR = stack efectivo ÷ bote.\n\nEmpieza el flop con un bote de 20 y 100 detrás: SPR = 5. Con SPR medio, hay que pensar cada calle.',
    link: '/glosario/spr/' },
  { texto: '🎭 ¿Cuántos faroles salen bien?\n\nSi apuestas el bote entero de farol, arriesgas 1 para ganar 1: necesitas que el rival se retire al menos la mitad de las veces para ganar dinero.',
    link: '/glosario/farol/' },
  { texto: '🗑️ 7-2 offsuit: la peor mano\n\nSin palo ni conexión, casi nunca liga. Incluso desde el botón, lo normal es tirarla.',
    link: '/manos/72o/' },
  { texto: '🃏 Parejas pequeñas: la regla del 15 a 1\n\nPara pagar buscando trío, detrás tiene que haber unas 15 veces lo que pagas. Con 4-4 contra una subida de 3 ciegas: 15 × 3 = 45 ciegas, y con 100 detrás compensa.',
    link: '/guias/como-jugar-parejas-pequenas/' },
  { texto: '⚔️ La apuesta de continuación (c-bet)\n\nEs la apuesta en el flop del jugador que subió antes del flop, haya ligado o no. En flops altos y secos, una apuesta pequeña suele ganar mucho.',
    link: '/guias/cuando-hacer-c-bet/' },
  { texto: '📊 Equity: tu % de ganar el bote\n\nEs el porcentaje de veces que tu mano acabaría ganando si la situación se repitiera muchas veces. Ejemplo antes del flop: QQ contra AK es casi una moneda al aire, con QQ algo por delante.',
    link: '/glosario/equity/' },
  { texto: '⬆️ Antes del flop, mejor subir que hacer limp\n\nSubir construye el bote con tu mejor mano y reduce el número de rivales. Con limp entran más jugadores y tus manos fuertes ganan menos veces.',
    link: '/guias/cuanto-subir-preflop/' },
  { texto: '🛡️ Te hacen 3-bet: ¿qué haces?\n\nPagar, hacer 4-bet o retirarte depende de tu mano, tu posición y del jugador que resube. Aquí tienes una guía con ejemplos.',
    link: '/guias/que-hacer-contra-un-3-bet/' },
  { texto: '🏆 Torneo con 20 ciegas y A♠K♦\n\nCon 40 ciegas o menos, AK es casi siempre all-in: el rival empuja también con AQ, parejas medias y faroles.',
    link: '/guias/como-jugar-ak-preflop/' },
  { texto: '🤖 ¿Dudas en una mano?\n\nSúbela a RÍO y te dice si pagar o tirar, con el porcentaje real de ganar y por qué. Gratis y en segundos. Es una herramienta de estudio: analiza después de jugar.',
    link: '/app/' },
];
