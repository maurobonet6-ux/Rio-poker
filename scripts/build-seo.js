// Genera las páginas estáticas para buscadores: /glosario/…, /tablas/…, /guias/…
// y /manos/… (una por cada una de las 169 manos iniciales), más sitemap.xml,
// robots.txt y las etiquetas SEO de la portada (index.html).
// Usa el mismo ranking de manos que app.js. La dirección de la web está en sitio.json.
// Ejecutar después de cambiar textos o rangos:  node scripts/build-seo.js
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE = JSON.parse(fs.readFileSync(path.join(ROOT, 'sitio.json'), 'utf8')).url.replace(/\/+$/, '');
const appJs = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
const HAND_RANKING = appJs.match(/const HAND_RANKING = '([^']+)'/)[1].split(' ');
const RANK_CHARS = 'AKQJT98765432';
const EQUITY = require('./data/equity-preflop.json');
const GUIDES = require('./data/guias.js');
const GLOSS_EXTRA = require('./data/glosario-extra.js');
const GUIDE_FAQ = require('./data/guias-faq.js');
const MATCHUPS = require('./data/equity-matchups.json');
const HAND_EXTRA = require('./data/manos-extra.js');
const combos = n => n.length === 2 ? 6 : (n[2] === 's' ? 4 : 12);
function topRange(pct){
  if (pct >= 100) return new Set(HAND_RANKING);
  const target = pct / 100 * 1326, set = new Set();
  let sum = 0;
  for (const n of HAND_RANKING){ if (sum >= target) break; set.add(n); sum += combos(n); }
  return set;
}

// Mismas tablas que CHART_SETS en app.js.
const CHART_SETS = {
  '6-max-cash':   { name: '6 jugadores · cash', list: [['UTG',15],['HJ',19],['CO',27],['BTN',45],['SB',40],['BB',60]] },
  '6-max-torneo': { name: '6 jugadores · torneo', list: [['UTG',14],['HJ',18],['CO',26],['BTN',45],['SB',42],['BB',65]] },
  '9-max-cash':   { name: '9 jugadores · cash', list: [['UTG',10],['UTG+1',12],['MP',14],['HJ',18],['CO',26],['BTN',43],['SB',38],['BB',55]] },
  '9-max-torneo': { name: '9 jugadores · torneo', list: [['UTG',9],['UTG+1',11],['MP',13],['HJ',17],['CO',25],['BTN',43],['SB',40],['BB',60]] }
};
const POS_NAME = { UTG: 'UTG (primero en hablar)', 'UTG+1': 'UTG+1', MP: 'MP (posición media)', HJ: 'HJ (hijack)', CO: 'CO (cutoff)', BTN: 'BTN (botón)', SB: 'SB (ciega pequeña)', BB: 'BB (ciega grande)' };
const slugPos = p => p.toLowerCase().replace('+', '-mas-');

const GLOSSARY = [
  ['equity', 'Equity', 'Qué es la equity en póker',
   'La equity es el porcentaje de veces que tu mano acabaría ganando el bote si la situación se repitiera muchas veces.',
   `<p>La <b>equity</b> es tu parte del bote según tus probabilidades de ganar. Si tienes un 40% de equity en un bote de 100, “te corresponden” 40 a la larga.</p>
    <p>No se calcula contra una mano concreta, porque no ves las cartas del rival, sino contra su <a href="/glosario/rango/">rango</a>: todas las manos que podría tener según cómo ha jugado.</p>
    <div class="ex"><b>Ejemplo:</b> con A♠K♠ contra una pareja de 8 antes del flop, ganas aproximadamente el 45–50% de las veces: es casi una moneda al aire.</div>
    <p>La equity sola no te dice qué hacer: hay que compararla con las <a href="/glosario/pot-odds/">pot odds</a>, lo que necesitas ganar para que pagar compense.</p>`],
  ['pot-odds', 'Pot odds', 'Qué son las pot odds (odds del bote)',
   'Las pot odds son el mínimo de veces que tienes que ganar para que pagar una apuesta sea rentable a largo plazo.',
   `<p>Las <b>pot odds</b> comparan lo que te cuesta pagar con lo que puedes ganar. Se calculan así:</p>
    <p class="formula">lo que pagas ÷ (bote + lo que pagas)</p>
    <div class="ex"><b>Ejemplo:</b> el bote es de 60 (con la apuesta del rival incluida) y te cuesta 20 pagar. 20 ÷ (60 + 20) = <b>25%</b>. Si ganas más del 25% de las veces, pagar es rentable.</div>
    <p>La regla es sencilla: si tu <a href="/glosario/equity/">equity</a> es mayor que las pot odds, pagar gana dinero a la larga; si es menor, lo pierde.</p>`],
  ['ev', 'EV (valor esperado)', 'Qué es el EV (valor esperado) en póker',
   'El EV es lo que ganas o pierdes de media con una decisión si la repitieras muchas veces.',
   `<p>El <b>EV</b> (valor esperado) mide cuánto gana o pierde una decisión <b>de media</b>. Una jugada con EV positivo (+EV) gana dinero a la larga aunque a veces pierdas; una con EV negativo (−EV) lo pierde aunque a veces ganes.</p>
    <p class="formula">EV de pagar = (equity × bote) − ((1 − equity) × lo que pagas)</p>
    <div class="ex"><b>Ejemplo:</b> pagas 20 para ganar un bote de 60 y ganas el 40% de las veces: 0,40 × 60 − 0,60 × 20 = <b>+12</b>. Cada vez que pagas en esta situación ganas 12 de media.</div>
    <p>En póker no se juzga una decisión por si ganaste esa mano, sino por su EV.</p>`],
  ['outs', 'Outs', 'Qué son los outs en póker',
   'Los outs son las cartas que, si salen, mejoran tu mano hasta la jugada que probablemente gana.',
   `<p>Los <b>outs</b> son las cartas que quedan en la baraja y que te darían la mejor mano.</p>
    <div class="ex"><b>Ejemplo:</b> tienes cuatro cartas a color. Quedan 13 − 4 = <b>9 outs</b> del mismo palo.</div>
    <p><b>Regla del 4 y del 2:</b> en el flop, outs × 4 ≈ % de ligar hasta el river; en el turn, outs × 2 ≈ % de ligar en el river. Con 9 outs en el flop, unas 36%.</p>
    <p>Cuidado con los outs “sucios”: una carta que te da color pero también le da full al rival no cuenta como out limpio.</p>`],
  ['spr', 'SPR', 'Qué es el SPR en póker (stack to pot ratio)',
   'El SPR es el stack efectivo dividido entre el bote: indica cuánto te queda por jugar en relación con lo que ya hay en el centro.',
   `<p>El <b>SPR</b> (stack to pot ratio) se calcula dividiendo el <a href="/glosario/stack-efectivo/">stack efectivo</a> entre el bote al empezar el flop.</p>
    <div class="ex"><b>Ejemplo:</b> el bote es de 20 y os quedan 100 a cada uno: SPR = 100 ÷ 20 = <b>5</b>.</div>
    <ul><li><b>SPR bajo (menos de 3):</b> estás casi comprometido; una pareja alta suele bastar para ir all-in.</li>
    <li><b>SPR medio (3–10):</b> hay que pensar cada calle.</li>
    <li><b>SPR alto (más de 10):</b> para jugarte todo necesitas manos muy fuertes; las parejas solas suelen quedarse cortas.</li></ul>`],
  ['rango', 'Rango', 'Qué es un rango en póker',
   'Un rango es el conjunto de manos que un jugador puede tener según su posición y cómo ha apostado.',
   `<p>No sabes las cartas de tu rival, pero sí <b>qué manos podría tener</b>. Ese conjunto es su <b>rango</b>.</p>
    <p>Un jugador que solo entra con manos buenas tiene un rango estrecho (por ejemplo, el 15% mejor); uno que juega casi todo, uno amplio. Cada apuesta estrecha el rango: quien sube tres veces rara vez tiene una mano floja.</p>
    <div class="ex"><b>Ejemplo:</b> un jugador prudente abre desde UTG. Su rango suele ser parejas medias y altas, ases fuertes y cartas altas del mismo palo: no esperes 7-2.</div>
    <p>Pensar en rangos, y no en una mano concreta, es la base para calcular tu <a href="/glosario/equity/">equity</a> de verdad. Mira las <a href="/tablas/">tablas de manos iniciales</a> para ver rangos típicos por posición.</p>`],
  ['ventaja-de-rango', 'Ventaja de rango', 'Qué es la ventaja de rango (range advantage)',
   'Tienes ventaja de rango cuando, en un flop concreto, tu rango en conjunto tiene más equity que el del rival.',
   `<p>La <b>ventaja de rango</b> (range advantage) no va de tu mano concreta, sino de <b>todas las manos que puedes tener</b> frente a todas las del rival en un flop determinado.</p>
    <div class="ex"><b>Ejemplo:</b> subes desde UTG y te paga la ciega grande. Sale A♠K♦7♣. Tú tienes muchos ases y reyes fuertes; la ciega grande muchas veces habría resubido con ellos. Tu rango tiene ventaja en este flop.</div>
    <p>Con ventaja de rango se puede apostar con más frecuencia (incluso con manos que no han ligado), porque el rival tiene menos manos buenas para defenderse. En flops bajos y conectados (7-6-5) la ventaja suele pasar al que paga.</p>`],
  ['posicion', 'Posición', 'Qué es la posición en póker',
   'La posición es el orden en que hablas en cada ronda: hablar después que tu rival es una ventaja porque ves lo que hace antes de decidir.',
   `<p>En una mesa de 6: <b>UTG</b>, <b>HJ</b>, <b>CO</b>, <b>BTN</b> (botón), <b>SB</b> y <b>BB</b> (ciegas). Antes del flop habla primero UTG; después del flop, las ciegas.</p>
    <p>El <b>botón</b> es la mejor posición: después del flop siempre habla el último. Por eso desde el botón se pueden jugar muchas más manos que desde UTG.</p>
    <div class="ex"><b>Ejemplo:</b> desde UTG se suele abrir un 15% de manos; desde el botón, en torno al 45%.</div>
    <p>“Tener posición” sobre un rival significa hablar después que él en las calles siguientes. Consulta las <a href="/tablas/">tablas por posición</a>.</p>`],
  ['farol', 'Farol y semifarol', 'Qué es un farol y un semifarol en póker',
   'Un farol es apostar con una mano floja para que el rival se retire; un semifarol, hacerlo con un proyecto que aún puede ligar.',
   `<p>Un <b>farol</b> es apostar o subir con una mano que probablemente pierde si llegáis al final, para que el rival <b>se retire</b> con una mano mejor.</p>
    <p>Un <b>semifarol</b> es un farol con un proyecto (de color o escalera): si el rival paga, aún puedes ligar. Por eso suele ser más rentable que el farol puro.</p>
    <div class="ex"><b>Cuándo compensa:</b> si apuestas 2/3 del bote, necesitas que el rival se retire algo más del 40% de las veces para que un farol puro gane dinero.</div>
    <p>Los faroles funcionan peor contra jugadores que pagan con todo, y mejor en cartas que favorecen <a href="/glosario/ventaja-de-rango/">tu rango</a>.</p>`],
  ['stack-efectivo', 'Stack efectivo', 'Qué es el stack efectivo en póker',
   'El stack efectivo es el menor de los stacks entre tú y tu rival: lo máximo que podéis jugaros en la mano.',
   `<p>Si tú tienes 200 fichas y tu rival 80, el <b>stack efectivo</b> es <b>80</b>: aunque tengas más, no puedes perder ni ganar más de 80 contra él en esa mano.</p>
    <p>El stack efectivo es lo que se usa para calcular el <a href="/glosario/spr/">SPR</a> y para decidir si una mano vale para jugarse todo.</p>
    <div class="ex"><b>En torneo</b> se suele medir en ciegas grandes: con 15 ciegas o menos, el juego se simplifica a ir all-in o retirarse.</div>`],
  ['odds-implicitas', 'Odds implícitas', 'Qué son las odds implícitas (implied odds)',
   'Las odds implícitas cuentan también lo que puedes ganar en calles futuras si ligas tu proyecto.',
   `<p>Las <a href="/glosario/pot-odds/">pot odds</a> solo miran el bote actual. Las <b>odds implícitas</b> suman lo que esperas ganar <b>después</b> si ligas tu mano.</p>
    <div class="ex"><b>Ejemplo:</b> tienes proyecto de escalera escondido y te cuesta 20 pagar un bote de 60: por pot odds necesitas un 25% y solo ligas un ~17% en la siguiente carta. Pero si cuando ligas tu rival te paga 100 más, pagar puede compensar.</div>
    <p>Funcionan mejor con stacks profundos, proyectos disimulados y rivales que pagan mucho. Con proyectos obvios o poco stack detrás, cuentan poco.</p>`],
  ['c-bet', 'Apuesta de continuación (c-bet)', 'Qué es una apuesta de continuación (c-bet)',
   'La c-bet es la apuesta que hace en el flop el jugador que subió antes del flop, haya ligado o no.',
   `<p>Quien sube preflop tiene la “iniciativa”. Si vuelve a apostar en el flop, eso es una <b>apuesta de continuación</b> o <b>c-bet</b>.</p>
    <p>Funciona porque, muchas veces, el rival no ha ligado nada y se retira. Es más rentable en flops que favorecen al que subió (con cartas altas, por ejemplo A-K-7) y menos en flops bajos y conectados.</p>
    <div class="ex"><b>Tamaño:</b> en flops secos se usan apuestas pequeñas (1/3 del bote); en flops con muchos proyectos, más grandes (2/3 o más).</div>`],
  ['3-bet', '3-bet', 'Qué es un 3-bet en póker',
   'Un 3-bet es la primera resubida antes del flop: alguien sube y otro jugador vuelve a subir.',
   `<p>Antes del flop, la ciega grande cuenta como la primera apuesta, la primera subida es la segunda (<i>open</i>) y la <b>resubida</b> es el <b>3-bet</b>. Si alguien vuelve a subir, es un 4-bet.</p>
    <p>Se hace 3-bet por valor (AA, KK, QQ, AK) y, a veces, de farol con manos que juegan bien si te pagan (A5 del mismo palo, por ejemplo).</p>
    <div class="ex"><b>Tamaño típico:</b> unas 3 veces la subida si tienes posición, y unas 4 veces si estás fuera de posición.</div>`],
  ['ciegas', 'Ciegas y antes', 'Qué son las ciegas y los antes en póker',
   'Las ciegas son apuestas obligatorias que ponen dos jugadores antes de repartir; los antes, una pequeña apuesta de todos en los torneos.',
   `<p>La <b>ciega pequeña (SB)</b> y la <b>ciega grande (BB)</b> se ponen antes de ver las cartas, para que siempre haya algo en el bote. En una partida 1/2, la pequeña es 1 y la grande 2.</p>
    <p>En torneos se añaden los <b>antes</b>: una pequeña apuesta obligatoria (o una sola de la ciega grande por toda la mesa). Con antes, el bote inicial es mayor y compensa jugar algo más de manos, sobre todo desde la <a href="/glosario/posicion/">ciega grande</a>.</p>
    <div class="ex">Las cantidades se suelen medir en <b>ciegas grandes (BB)</b>: “tengo 40 ciegas” = 40 veces la ciega grande.</div>`]
];

const CSS = `:root{--bg:#0A0A0B;--panel:#141416;--panel-2:#1C1C1F;--line:rgba(255,255,255,0.10);--cream:#F5F2EC;--dim:rgba(245,242,236,0.66);--gold:#E8283F;--ok:#3DDC7A}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--cream);font-family:'Space Grotesk',-apple-system,'Segoe UI',Roboto,Arial,sans-serif;line-height:1.6}
.wrap{max-width:760px;margin:0 auto;padding:22px 16px 60px}a{color:var(--gold)}
.top{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:18px}
.logo{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:1.8rem;color:var(--gold);text-decoration:none}
.top .go{background:var(--gold);color:#fff;text-decoration:none;font-weight:700;border-radius:999px;padding:9px 16px;font-size:.88rem}
.crumbs{font-size:.8rem;color:var(--dim);margin-bottom:8px}.crumbs a{color:var(--dim)}
h1{font-family:'Bricolage Grotesque',sans-serif;font-size:1.9rem;line-height:1.2;margin:0 0 10px}
h2{font-size:1.15rem;margin:28px 0 8px}
.faq h3{font-size:1rem;margin:18px 0 4px;color:var(--cream)}.faq p{margin:0}
p,li{color:var(--dim)}b{color:var(--cream)}.lead{font-size:1.08rem;color:var(--cream)}
.ex{background:var(--panel-2);border-left:3px solid var(--gold);border-radius:10px;padding:12px 14px;margin:14px 0;color:var(--dim)}
.formula{font-family:ui-monospace,Menlo,monospace;background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:10px 12px;color:var(--cream)}
.cta{margin:30px 0;padding:20px;border-radius:16px;border:1px solid var(--gold);background:linear-gradient(180deg,rgba(232,40,63,.14),rgba(232,40,63,.04));text-align:center}
.cta p{margin:0 0 12px;color:var(--cream)}.cta a{display:inline-block;background:var(--gold);color:#fff;text-decoration:none;font-weight:800;border-radius:999px;padding:12px 24px;text-transform:uppercase;letter-spacing:.03em}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px;padding:0;list-style:none}
.cards a{display:block;background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:12px 14px;text-decoration:none;color:var(--cream);font-weight:700;height:100%}
.cards a small{display:block;color:var(--dim);font-weight:400;font-size:.8rem;margin-top:3px}
.pills{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0}.pills a{border:1px solid var(--line);border-radius:999px;padding:5px 11px;font-size:.8rem;text-decoration:none;color:var(--dim)}.pills a.on{border-color:var(--gold);color:var(--cream);background:rgba(232,40,63,.14)}
.grid{display:grid;grid-template-columns:repeat(13,1fr);gap:2px;max-width:520px}
.grid a{aspect-ratio:1;display:flex;align-items:center;justify-content:center;border-radius:4px;background:var(--panel-2);color:var(--dim);font-size:clamp(.5rem,2.1vw,.68rem);font-weight:700;text-decoration:none}
.grid a.in{background:var(--gold);color:#fff}.grid a.pair:not(.in){background:#232327}.grid a.cur{outline:2px solid var(--cream);outline-offset:-2px}
.tbl{width:100%;border-collapse:collapse;margin:12px 0;font-size:.9rem}.tbl th,.tbl td{border-bottom:1px solid var(--line);padding:7px 8px;text-align:left;color:var(--dim)}.tbl th{color:var(--cream)}.tbl td.si{color:var(--ok);font-weight:700}
.stats{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin:14px 0}.stats div{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:10px 12px;color:var(--dim);font-size:.8rem}.stats b{display:block;font-size:1.3rem}
.note{font-size:.82rem}footer{margin-top:40px;padding-top:16px;border-top:1px solid var(--line);font-size:.78rem;color:var(--dim)}footer a{color:var(--dim)}`;

// Guarda de dónde llegó la persona si entra por una guía o página de manos (misma lógica que
// el script de index.html): así una cuenta creada tras leer una guía cuenta para su red o foro.
// También carga las estadísticas de Vercel, salvo en los dispositivos marcados con ?sinestadisticas=1.
const ORIGEN_JS = `<script>(function(){try{if(localStorage.getItem('rio_sin_estadisticas')==='1')return}catch(e){}window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments)};var s=document.createElement('script');s.defer=true;s.src='/_vercel/insights/script.js';document.head.appendChild(s)})();try{if(!localStorage.getItem('rio_src')){var q=new URLSearchParams(location.search),src=q.get('utm_source')||'',ref='';try{ref=document.referrer?new URL(document.referrer).hostname:''}catch(e){}if(!src&&ref&&ref!==location.hostname){var r={instagram:'instagram',youtube:'youtube',youtu:'youtube',tiktok:'tiktok',facebook:'facebook',google:'google',chatgpt:'chatgpt',reddit:'reddit',t:'telegram',telegram:'telegram',discord:'discord',x:'x',twitter:'x'},p=ref.replace(/^(www|m|l|lm)\\./,'').split('.');src=r[p[0]]||p[0]}localStorage.setItem('rio_src',(src||'directo').toLowerCase().slice(0,40))}}catch(e){}</script>`;

const esc = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
// Preguntas frecuentes: se ven en la página y van también como datos estructurados FAQPage,
// así lo que lee Google y lo que lee la gente es lo mismo. Preguntas y respuestas en texto plano.
const faqHTML = faq => faq && faq.length ? `\n  <h2>Preguntas frecuentes</h2>\n  <div class="faq">${faq.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join('')}</div>` : '';
const faqLD = (faq, url) => faq && faq.length ? `\n<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', '@id': `${SITE}${url}#faq`, inLanguage: 'es', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) })}</script>` : '';
function page({ url, title, desc, crumbs, body, related, faq }){
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}${url}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="RÍO">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${SITE}${url}">
<meta property="og:image" content="${SITE}/og-image.png">
<meta property="og:locale" content="es_ES">
<meta name="theme-color" content="#0A0A0B">
<link rel="icon" href="/icons/icon-192.png" type="image/png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&family=Space+Grotesk:wght@400;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/seo.css">
${ORIGEN_JS}
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: crumbs.map(([n, u], i) => ({ '@type': 'ListItem', position: i + 1, name: n, item: SITE + (u || url) })) })}</script>${faqLD(faq, url)}
</head>
<body>
<div class="wrap">
  <div class="top"><a class="logo" href="/">RÍO</a><a class="go" href="/">Analizar una mano</a></div>
  <div class="crumbs">${crumbs.map(([n, u]) => u ? `<a href="${u}">${n}</a>` : n).join(' › ')}</div>
${body}${faqHTML(faq)}
  <div class="cta"><p><b>¿Tienes una mano que no sabes si jugaste bien?</b><br>RÍO te dice si pagar, subir o tirar, explicado fácil.</p><a href="/">Analiza tu mano gratis →</a></div>
${related || ''}
  <footer>RÍO es una herramienta de estudio para repasar tus manos. No la uses mientras juegas una mano: la mayoría de salas prohíben las ayudas en tiempo real. <b>+18</b> · Juega con responsabilidad · <a href="https://www.jugarbien.es" rel="noopener">jugarbien.es</a><br>
  <a href="/guias/">Guías</a> · <a href="/manos/">Manos iniciales</a> · <a href="/glosario/">Glosario</a> · <a href="/tablas/">Tablas de manos</a> · <a href="/legal.html#aviso-legal">Aviso legal</a> · <a href="/legal.html#privacidad">Privacidad</a></footer>
</div>
</body>
</html>
`;
}
function write(rel, content){
  const file = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}
const urls = ['/'];
const guidesFor = (gloss) => {
  const list = GUIDES.filter(g => g.gloss.includes(gloss));
  return list.length ? `  <h2>Guías relacionadas</h2><ul class="cards">${list.map(g => `<li><a href="/guias/${g.slug}/">${g.title}</a></li>`).join('')}</ul>\n` : '';
};

// --- Manos iniciales: nombres y datos ---
const RANK_NAME = { A: 'As', K: 'Rey', Q: 'Reina', J: 'Jota', T: '10' };
const RANK_PLURAL = { A: 'ases', K: 'reyes', Q: 'reinas', J: 'jotas', T: 'dieces', 9: 'nueves', 8: 'ochos', 7: 'sietes', 6: 'seises', 5: 'cincos', 4: 'cuatros', 3: 'treses', 2: 'doses' };
const shown = r => r === 'T' ? '10' : r;
const handSlug = n => n.toLowerCase();
const isPair = n => n.length === 2;
const suited = n => n[2] === 's';
function handName(n){
  if (isPair(n)) return `pareja de ${RANK_PLURAL[n[0]]}`;
  return `${shown(n[0])}${shown(n[1])} ${suited(n) ? 'del mismo palo' : 'de distinto palo'}`;
}
const handLabel = n => isPair(n) ? `${n} (${handName(n)})` : `${handName(n)} (${n})`;
const handCodeList = [];
for (let i = 0; i < 13; i++) for (let j = 0; j < 13; j++)
  handCodeList.push(i === j ? RANK_CHARS[i] + RANK_CHARS[j] : i < j ? RANK_CHARS[i] + RANK_CHARS[j] + 's' : RANK_CHARS[j] + RANK_CHARS[i] + 'o');

// --- Glosario ---
const glossCards = GLOSSARY.map(([slug, name, , short]) => `<li><a href="/glosario/${slug}/">${name}<small>${short}</small></a></li>`).join('');
write('glosario/index.html', page({
  url: '/glosario/', title: 'Glosario de póker en español: equity, pot odds, EV, SPR… | RÍO',
  desc: 'Qué significan equity, pot odds, EV, outs, SPR, rango, ventaja de rango, c-bet y más términos de póker, explicados fácil y con ejemplos.',
  crumbs: [['RÍO', '/'], ['Glosario']],
  body: `  <h1>Glosario de póker</h1>
  <p class="lead">Los términos que más se usan al estudiar póker, explicados en palabras sencillas y con ejemplos.</p>
  <ul class="cards">${glossCards}</ul>`
}));
urls.push('/glosario/');
GLOSSARY.forEach(([slug, name, title, short, body]) => {
  const others = GLOSSARY.filter(g => g[0] !== slug).map(([s2, n2]) => `<a href="/glosario/${s2}/">${n2}</a>`).join('');
  write(`glosario/${slug}/index.html`, page({
    url: `/glosario/${slug}/`, title: `${title} | RÍO`, desc: short,
    crumbs: [['RÍO', '/'], ['Glosario', '/glosario/'], [name]],
    body: `  <h1>${title}</h1>
  <p class="lead">${short}</p>
  ${body}
  ${GLOSS_EXTRA[slug].more}`,
    faq: GLOSS_EXTRA[slug].faq,
    related: guidesFor(slug) + `  <h2>Más términos</h2><div class="pills">${others}</div>`
  }));
  urls.push(`/glosario/${slug}/`);
});

// --- Tablas ---
function gridHTML(set, cur){
  let g = '';
  for (let i = 0; i < 13; i++) for (let j = 0; j < 13; j++){
    const n = i === j ? RANK_CHARS[i] + RANK_CHARS[j] : i < j ? RANK_CHARS[i] + RANK_CHARS[j] + 's' : RANK_CHARS[j] + RANK_CHARS[i] + 'o';
    g += `<a href="/manos/${handSlug(n)}/" class="${set.has(n) ? 'in' : ''}${i === j ? ' pair' : ''}${n === cur ? ' cur' : ''}">${n}</a>`;
  }
  return `<div class="grid">${g}</div>`;
}
const variantPills = (cur, pos) => Object.entries(CHART_SETS).map(([k, v]) => {
  const has = v.list.some(([p]) => p === pos);
  return `<a class="${k === cur ? 'on' : ''}" href="/tablas/${k}/${has ? slugPos(pos) + '/' : ''}">${v.name}</a>`;
}).join('');
const WARN = (v) => `<p class="note">⚠️ Son <b>tablas orientativas</b> para ${v.startsWith('9') ? '9' : '6'} jugadores${v.endsWith('torneo') ? ' en torneo con unas 40 ciegas o más' : ' en cash con unas 100 ciegas'}, no una solución para todas las mesas: con stacks cortos, antes grandes o rivales muy agresivos, los rangos cambian.</p>`;
const tIndex = Object.entries(CHART_SETS).map(([k, v]) => `<h2>${v.name}</h2><ul class="cards">${v.list.map(([p, pct]) =>
  `<li><a href="/tablas/${k}/${slugPos(p)}/">${p}<small>${p === 'BB' ? 'Defender' : 'Abrir'} ~${pct}% de las manos</small></a></li>`).join('')}</ul>`).join('');
write('tablas/index.html', page({
  url: '/tablas/', title: 'Tablas de manos iniciales de póker por posición | RÍO',
  desc: 'Qué manos abrir desde UTG, HJ, CO, botón, ciegas: tablas de rangos de apertura para 6 y 9 jugadores, cash y torneo, con la matriz 13×13.',
  crumbs: [['RÍO', '/'], ['Tablas de manos']],
  body: `  <h1>Tablas de manos iniciales</h1>
  <p class="lead">Qué manos abrir según tu posición cuando nadie ha entrado antes que tú (y cuáles defender desde la ciega grande).</p>
  ${tIndex}
  ${WARN('6-max-cash').replace('para 6 jugadores en cash con unas 100 ciegas', 'según el número de jugadores y el tipo de partida')}`
}));
urls.push('/tablas/');
Object.entries(CHART_SETS).forEach(([k, v]) => {
  write(`tablas/${k}/index.html`, page({
    url: `/tablas/${k}/`, title: `Tablas de manos iniciales · ${v.name} | RÍO`,
    desc: `Rangos de apertura por posición para ${v.name}: qué manos subir desde cada posición.`,
    crumbs: [['RÍO', '/'], ['Tablas', '/tablas/'], [v.name]],
    body: `  <h1>Tablas de manos · ${v.name}</h1>
  <div class="pills">${variantPills(k, 'BTN').replace(/\/btn\//g, '/')}</div>
  <ul class="cards">${v.list.map(([p, pct]) => `<li><a href="/tablas/${k}/${slugPos(p)}/">${POS_NAME[p]}<small>${p === 'BB' ? 'Defender' : 'Abrir'} ~${pct}%</small></a></li>`).join('')}</ul>
  ${WARN(k)}`
  }));
  urls.push(`/tablas/${k}/`);
  v.list.forEach(([p, pct]) => {
    const set = topRange(pct);
    const what = p === 'BB'
      ? `Desde la <b>ciega grande</b>, si alguien sube, puedes <b>defender</b> (pagar o resubir) con las manos en rojo: unas ${pct}% del total.`
      : `Desde <b>${POS_NAME[p]}</b>, si nadie ha entrado antes que tú, <b>sube</b> con las manos en rojo (~${pct}% de las manos) y <b>tira</b> el resto.`;
    write(`tablas/${k}/${slugPos(p)}/index.html`, page({
      url: `/tablas/${k}/${slugPos(p)}/`,
      title: `Qué manos jugar desde ${p} · ${v.name} | RÍO`,
      desc: p === 'BB' ? `Rango de defensa desde la ciega grande (${v.name}): ~${pct}% de las manos, en una tabla 13×13.` : `Rango de apertura desde ${p} (${v.name}): ~${pct}% de las manos, en una tabla 13×13.`,
      crumbs: [['RÍO', '/'], ['Tablas', '/tablas/'], [v.name, `/tablas/${k}/`], [p]],
      body: `  <h1>Qué manos jugar desde ${p}</h1>
  <div class="pills">${variantPills(k, p)}</div>
  <div class="pills">${v.list.map(([p2]) => `<a class="${p2 === p ? 'on' : ''}" href="/tablas/${k}/${slugPos(p2)}/">${p2}</a>`).join('')}</div>
  <p class="lead"><b>Tu rango recomendado</b> · ${what}</p>
  ${gridHTML(set)}
  <p class="note">Diagonal = parejas · arriba a la derecha = mismo palo (s) · abajo a la izquierda = distinto palo (o).</p>
  ${WARN(k)}
  <p>¿No sabes qué es un rango o la posición? Mira el <a href="/glosario/rango/">glosario</a>.</p>`
    }));
    urls.push(`/tablas/${k}/${slugPos(p)}/`);
  });
});

// --- Guías ---
write('guias/index.html', page({
  url: '/guias/', title: 'Guías de póker en español: 3-bet, outs, pot odds, AK… | RÍO',
  desc: 'Guías prácticas de póker: cómo jugar AK preflop, cuándo hacer 3-bet, cómo calcular outs y pot odds, set mining, ciega grande, faroles y más.',
  crumbs: [['RÍO', '/'], ['Guías']],
  body: `  <h1>Guías de póker</h1>
  <p class="lead">Respuestas cortas y con números a las dudas más buscadas al empezar a estudiar póker.</p>
  <ul class="cards">${GUIDES.map(g => `<li><a href="/guias/${g.slug}/">${g.title}</a></li>`).join('')}</ul>`
}));
urls.push('/guias/');
GUIDES.forEach(g => {
  const hands = g.hands.length ? `  <h2>Manos relacionadas</h2><div class="pills">${g.hands.map(h => `<a href="/manos/${handSlug(h)}/">${handLabel(h)}</a>`).join('')}</div>\n` : '';
  const gloss = g.gloss.map(s => GLOSSARY.find(x => x[0] === s)).map(([s, n]) => `<a href="/glosario/${s}/">${n}</a>`).join('');
  const others = GUIDES.filter(o => o !== g).map(o => `<li><a href="/guias/${o.slug}/">${o.title}</a></li>`).join('');
  write(`guias/${g.slug}/index.html`, page({
    url: `/guias/${g.slug}/`, title: `${g.title} | RÍO`, desc: g.desc,
    crumbs: [['RÍO', '/'], ['Guías', '/guias/'], [g.title]],
    body: `  <h1>${g.title}</h1>
  <p class="lead">${g.desc}</p>
  ${g.body}`,
    faq: GUIDE_FAQ[g.slug],
    related: hands + `  <h2>Términos del glosario</h2><div class="pills">${gloss}</div>
  <h2>Más guías</h2><ul class="cards">${others}</ul>`
  }));
  urls.push(`/guias/${g.slug}/`);
});

// --- Manos: una página por cada una de las 169 manos ---
const VAL = r => 12 - RANK_CHARS.indexOf(r); // A = 12 … 2 = 0
const cumCombos = {};
{ let sum = 0; for (const n of HAND_RANKING){ sum += combos(n); cumCombos[n] = sum; } }
const RANGES = Object.fromEntries(Object.entries(CHART_SETS).map(([k, v]) => [k, v.list.map(([p, pct]) => [p, topRange(pct)])]));
const VALUE_3BET = new Set(['AA', 'KK', 'QQ', 'AKs', 'AKo']);
const LATE_3BET = new Set(['JJ', 'TT', 'AQs', 'AQo', 'AJs', 'KQs']);
const BLUFF_3BET = new Set(['A5s', 'A4s', 'A3s', 'A2s', '76s', '65s', 'K9s', 'QJs', 'JTs', 'T9s']);
const GUIDE_BY_CAT = {
  ases: ['que-hacer-contra-un-3-bet', 'cuanto-subir-preflop'], parejaAlta: ['cuando-hacer-3-bet', 'que-hacer-contra-un-3-bet'],
  parejaMedia: ['como-jugar-parejas-pequenas', 'que-hacer-contra-un-3-bet'], parejaBaja: ['como-jugar-parejas-pequenas', 'probabilidades-de-poker'],
  ak: ['como-jugar-ak-preflop', 'cuando-hacer-3-bet'], broadway: ['cuando-hacer-3-bet', 'que-hacer-contra-un-3-bet'],
  axS: ['cuando-hacer-3-bet', 'como-jugar-proyecto-de-color'], axO: ['que-hacer-contra-un-3-bet', 'como-jugar-desde-la-ciega-grande'],
  conectadas: ['como-jugar-proyecto-de-color', 'como-calcular-outs'], mismoPalo: ['como-jugar-desde-la-ciega-grande', 'como-jugar-proyecto-de-color'],
  floja: ['como-jugar-desde-la-ciega-grande', 'cuanto-subir-preflop']
};
function category(n){
  if (isPair(n)) return n === 'AA' ? 'ases' : VAL(n[0]) >= 10 ? 'ases' : VAL(n[0]) >= 8 ? 'parejaAlta' : VAL(n[0]) >= 4 ? 'parejaMedia' : 'parejaBaja';
  if (n.startsWith('AK')) return 'ak';
  const hi = VAL(n[0]), lo = VAL(n[1]), gap = hi - lo;
  if (lo >= 8) return 'broadway';
  if (n[0] === 'A') return suited(n) ? 'axS' : 'axO';
  if (gap <= 2 && lo >= 1 && (suited(n) || (gap === 1 && lo >= 5))) return 'conectadas';
  if (suited(n)) return 'mismoPalo';
  return 'floja';
}
// Las tablas usan el ranking de index.html, que ordena por fuerza en un all-in; algunas
// manos especulativas quedan fuera aunque muchos jugadores las abran desde el botón.
function outsideTables(n){
  const { opens } = openWhere(n, '6-max-cash');
  return opens.length ? '' : ' Ojo: las tablas de RÍO la dejan fuera de los rangos de apertura porque ordenan las manos por su fuerza si llegáis al all-in. Con 100 ciegas o más, algunos jugadores la abren desde el botón porque gana mucho cuando liga.';
}
function categoryText(n){
  const c = category(n), name = handName(n);
  switch (c){
    case 'ases': return `Es una de las mejores manos del póker. Con ${name} quieres <b>meter dinero en el bote antes del flop</b>: sube si nadie ha entrado y resube si alguien ha subido. El riesgo no está antes del flop, sino después: una pareja alta no gana siempre si la mesa trae proyectos o el rival muestra mucha fuerza.`;
    case 'parejaAlta': return `Una pareja alta que gana a la mayoría de manos antes del flop, pero que sufre cuando salen cartas por encima (${n[0] === 'J' ? 'Q, K o A' : 'J, Q, K o A'}). Ábrela siempre y resube contra aperturas de posiciones tardías. Contra mucha acción (4-bet) con muchas ciegas, cuidado: te enfrentas a AA, KK, QQ o AK.`;
    case 'parejaMedia': return `Una pareja media: suele ir por delante antes del flop, pero muchas veces salen cartas más altas en la mesa. Su mejor escenario es ligar <b>trío</b> (≈12% en el flop) y cobrar un bote grande. Ábrela desde casi cualquier posición; contra una subida, paga más que resubir.`;
    case 'parejaBaja': return `Una pareja pequeña casi nunca gana sin mejorar. Se juega para ligar <b>trío</b> (1 de cada 8,5 flops): paga subidas solo si podéis jugaros unas 15 veces lo que te cuesta. Sin trío, en mesas con cartas altas, lo normal es retirarse.`;
    case 'ak': return `La mejor mano sin pareja. Domina a AQ, AJ y KQ, que suelen pagarte, y bloquea AA y KK. Sube siempre y resube (3-bet) cuando alguien suba. Recuerda que antes del flop <b>no ha ligado nada</b>: liga pareja o mejor en el flop solo un 32% de las veces.`;
    case 'broadway': return `Dos cartas altas${suited(n) ? ' del mismo palo, que además pueden ligar color' : ''}. Ligan parejas altas y escaleras altas, pero pueden estar <b>dominadas</b>: contra ${n[0] === 'A' ? 'AK' : 'A' + shown(n[0])} comparten una carta y la otra del rival es mejor. ${suited(n) ? 'Ábrela desde casi todas las posiciones.' : 'Juégala con más cuidado desde las primeras posiciones y contra subidas de jugadores prudentes.'}`;
    case 'axS': return `Un as con otra carta del mismo palo: si liga color, es el <b>color al as</b>, el mejor posible. ${VAL(n[1]) <= 3 ? `Además, con ${n[1] === '5' ? '5' : shown(n[1])} puedes ligar la escalera A-2-3-4-5, y es una de las mejores manos para un <b>3-bet de farol</b>: el as quita combinaciones de AA y AK al rival.` : 'La segunda carta es floja: si ligas solo el as, cuidado con kickers mejores.'}`;
    case 'axO': return `Un as de distinto palo con una segunda carta baja. Parece mejor de lo que es: cuando ligas el as, un rival con AK, AQ o AJ te gana con mejor <b>kicker</b>. Juégala desde posiciones tardías si nadie ha entrado y tírala contra subidas de jugadores prudentes.`;
    case 'conectadas': return `Cartas ${VAL(n[0]) - VAL(n[1]) === 1 ? 'seguidas' : 'casi seguidas'}${suited(n) ? ' y del mismo palo' : ''}: pocas veces ganan con pareja, pero ligan <b>escaleras${suited(n) ? ' y colores' : ''}</b> escondidos que cobran botes grandes. Rinden más con muchas ciegas detrás y pocos rivales en el bote, y peor en torneo con stacks cortos.${outsideTables(n)}`;
    case 'mismoPalo': return `El palo compartido le da algo de valor (color en ~6% de las manos hasta el river), pero la carta baja hace que, cuando ligues pareja, a menudo ganes poco o pierdas contra un kicker mejor. Rinde más en posición y defendiendo la ciega grande a buen precio.${outsideTables(n)}`;
    default: return `Una mano floja: sin palo compartido ni cartas seguidas, liga poco y, cuando liga, suele ser con kicker malo. Lo normal es <b>tirarla</b>, salvo desde el botón o las ciegas si nadie ha entrado o el precio es muy bueno.`;
  }
}
function openWhere(n, set){
  const opens = RANGES[set].filter(([p, r]) => p !== 'BB' && r.has(n)).map(([p]) => p);
  const bb = RANGES[set].find(([p]) => p === 'BB')[1].has(n);
  return { opens, bb };
}
function verdict(n){
  const { opens, bb } = openWhere(n, '6-max-cash');
  if (opens.includes('UTG')) return 'Ábrela desde cualquier posición.';
  if (opens.length) return `Ábrela desde ${opens.join(', ')} si nadie ha entrado antes; tírala desde posiciones anteriores.`;
  if (bb) return 'No la abras; solo defiéndela desde la ciega grande cuando te suban.';
  return 'Tírala casi siempre.';
}
function threeBetText(n){
  if (VALUE_3BET.has(n)) return `<b>Resube siempre (3-bet) por valor.</b> Si te vuelven a subir (4-bet), ${n === 'AA' || n === 'KK' ? 've all-in sin dudarlo.' : 'con muchas ciegas y contra un jugador prudente plantéate pagar o incluso retirarte; con 40 ciegas o menos, all-in.'}`;
  if (LATE_3BET.has(n)) return `<b>Resube (3-bet) contra aperturas de CO, botón o ciega pequeña</b>; contra UTG, pagar suele ser mejor. Si te hacen 4-bet con muchas ciegas, normalmente retírate.`;
  if (BLUFF_3BET.has(n)) return `<b>Puedes usarla de 3-bet de farol</b> de vez en cuando (desde el botón o las ciegas contra aperturas tardías), porque juega bien si te pagan. El resto de veces, paga en posición o retírate.`;
  const { opens } = openWhere(n, '6-max-cash');
  if (opens.length) return `No es mano para resubir. Contra una subida, <b>paga</b> si tienes posición y el que sube abre muchas manos; si no, <b>retírate</b>.`;
  return `Contra una subida, <b>retírate</b>, salvo a veces desde la ciega grande si el precio es muy bueno.`;
}
function postflopFacts(n){
  if (isPair(n)) return [['Trío o mejor en el flop', '11,8%'], ['Trío o mejor hasta el river', '19,2%']];
  const f = [['Pareja o mejor en el flop (con alguna de tus cartas)', '32,4%'], ['Pareja con alguna de tus cartas hasta el river', '48,7%']];
  if (suited(n)) f.push(['Proyecto de color en el flop', '10,9%'], ['Color hecho hasta el river', '6,4%']);
  return f;
}
const topPct = n => Math.round(cumCombos[n] / 1326 * 1000) / 10;
const pctES = x => String(x).replace('.', ',');
// Equity contra manos de referencia (scripts/data/equity-matchups.json).
const OPP_NOTE = { AA: 'la mejor mano', KK: 'segunda mejor', QQ: 'pareja alta', TT: 'pareja media-alta', '55': 'pareja pequeña', AKo: 'as-rey', AQo: 'as-dama', KQs: 'figuras del mismo palo', JTs: 'conectadas altas', '76s': 'conectadas bajas' };
function matchupHTML(n){
  const m = MATCHUPS[n], rows = ['AA', 'KK', 'QQ', 'TT', '55', 'AKo', 'AQo', 'KQs', 'JTs', '76s'].filter(v => m[v] !== undefined).map(v => [v, m[v]]);
  const best = rows.reduce((a, b) => b[1] > a[1] ? b : a), worst = rows.reduce((a, b) => b[1] < a[1] ? b : a);
  const fav = rows.filter(([, e]) => e > 50).length;
  return `<p>Cuánto gana ${n} si llegáis al all-in antes del flop contra algunas manos típicas (palos al azar, hasta el river):</p>
  <table class="tbl"><tr><th>Contra</th><th>${n} gana</th></tr>${rows.map(([v, e]) => `<tr><td><a href="/manos/${handSlug(v)}/">${v}</a> <small>(${OPP_NOTE[v]})</small></td><td class="${e > 50 ? 'si' : ''}">${pctES(e)}%</td></tr>`).join('')}</table>
  <p>${n} es favorita en ${fav} de estos ${rows.length} enfrentamientos. Su mejor caso es contra ${best[0]} (${pctES(best[1])}%) y el peor, contra ${worst[0]} (${pctES(worst[1])}%).${m.AKo !== undefined && m['55'] !== undefined && !isPair(n) && m.AKo < 50 && m['55'] < 50 ? ` Como casi todas las manos sin pareja, va por detrás de una pareja pequeña como 55 (${pctES(m['55'])}%).` : ''}</p>`;
}
// Cartas de ejemplo para un flop: valores que no están en la mano.
const lowFlop = n => ['8', '5', '2', '9', '4', '3', '7', '6'].filter(r => !n.includes(r)).slice(0, 3);
// Flop que da escalera abierta a una mano conectada: los dos valores que faltan para 4 seguidas, más un rey.
function drawFlop(n){
  const hv = VAL(n[0]), start = Math.max(0, Math.min(hv - 3, 8));
  const miss = [0, 1, 2, 3].map(k => start + k).filter(v => v !== hv && v !== VAL(n[1]));
  return [...miss.reverse().map(v => shown(RANK_CHARS[12 - v])), 'K'].join('-');
}
function postflopHTML(n){
  const c = category(n), hi = shown(n[0]), lo = shown(n[1]);
  const [a, b, d] = lowFlop(n);
  switch (c){
    case 'ases': return `<p>Con ${n} tendrás casi siempre una <b>overpair</b> (una pareja mayor que cualquier carta de la mesa)${n === 'AA' ? '' : ', salvo cuando salga una carta más alta'}. En mesas bajas y secas como ${a}-${b}-${d} de palos distintos, apuesta en cada calle para cobrar a las parejas menores y a las manos que ligaron algo.</p>
  <ul><li><b>Mesa seca:</b> apuesta 1/3 – 1/2 del bote; quieres que te paguen.</li><li><b>Mesa con proyectos</b> (por ejemplo 9-8-6 con dos del mismo palo): apuesta más grande, 2/3 o más, para que los proyectos paguen caro.</li>${n === 'AA' ? '' : `<li><b>Sale ${n[0] === 'K' ? 'un as' : 'un as o un rey'}:</b> frena. Apuesta pequeño o pasa, y no metas todo el stack si el rival sube.</li>`}<li><b>El rival sube dos veces o va all-in</b> en una mesa con cuatro cartas a escalera o color: es de las pocas situaciones en que una overpair puede ir por detrás.</li></ul>`;
    case 'parejaAlta': return `<p>La clave con ${n} es cuántas cartas más altas trae el flop. En mesas como ${a}-${b}-${d} tienes una overpair: apuesta por valor. Cuando sale una sola figura, sigue siendo buena mano pero ya no quieres un bote enorme. Con dos cartas por encima en la mesa, suele ser mejor pasar y retirarte ante apuestas grandes.</p>
  <ul><li><b>Ligas trío</b> (≈12%): tienes una mano casi imbatible; construye el bote.</li><li><b>SPR bajo</b> (bote con 3-bet): con overpair puedes jugarte todo.</li><li><b>SPR alto</b> y mucha acción: una pareja sola rara vez vale 100 ciegas.</li></ul>`;
    case 'parejaMedia': return `<p>Con ${n} el flop traerá al menos una carta más alta la mayoría de las veces. Tu plan es sencillo: <b>ligas trío o juegas un bote pequeño</b>.</p>
  <ul><li><b>Ligas trío:</b> apuesta y sube; los rivales con top pair te pagarán mucho.</li><li><b>Flop bajo</b> (por debajo de ${hi}): tienes overpair; apuesta una vez por valor y control.</li><li><b>Flop con cartas altas</b> (por ejemplo K-Q-4): si el rival apuesta, lo normal es retirarse.</li></ul>`;
    case 'parejaBaja': return `<p>${n} casi nunca gana sin trío. Juega el flop con una pregunta: ¿he ligado? Si ligas trío (${hi}-${hi}-${hi}), busca el bote más grande posible, porque es una mano escondida y los rivales con top pair no te creerán. Si no ligas, retírate ante apuestas salvo que la mesa sea muy baja y nadie muestre interés.</p>
  <div class="ex"><b>Ejemplo:</b> pagas una subida con ${n} desde el botón y sale K-${hi}-7. Tienes trío; el que subió seguramente tiene un rey. Deja que apueste y sube en el turn o el river.</div>`;
    case 'ak': return `<p>Si ligas un as o un rey, tienes top pair con el mejor kicker: apuesta por valor en las tres calles contra rivales que pagan. Si no ligas (68% de las veces), tienes “as alto”: una c-bet en flops altos y secos funciona bien; en flops bajos y conectados como 8-7-6, pasa a menudo y retírate si el rival apuesta fuerte.</p>
  <ul><li><b>Outs sin ligar:</b> 6 (tres ases y tres reyes).</li><li><b>Con ${suited(n) ? 'proyecto de color al as' : 'proyecto de escalera (Q-J-x o J-T-x)'}:</b> es un buen momento para un semifarol.</li></ul>`;
    case 'broadway': return `<p>Con ${n} ligarás muchas veces top pair${n[0] === 'A' ? ' con buen kicker' : ''}. El reto es saber cuánto vale: contra una apuesta de un rival prudente en varias calles, top pair con kicker ${lo} puede estar perdiendo contra ${n[0] === 'A' ? 'AK' : 'A' + hi + ' o ' + hi + hi}.</p>
  <ul><li><b>Ligas top pair en mesa seca</b> (${hi}-${a}-${d}): apuesta para cobrar a peores parejas y proyectos.</li><li><b>Ligas la segunda carta</b> (${lo}-${a}-${d}): buena mano, pero con cartas altas por encima en juego; bote mediano.</li><li><b>Proyecto de escalera</b>: con dos figuras las escaleras que ligas son altas, así que puedes apostar de semifarol.</li>${suited(n) ? '<li><b>Proyecto de color</b>: 9 outs; con mano tan alta, un proyecto de color suele ser el mejor del palo o casi.</li>' : ''}</ul>`;
    case 'axS': return `<p>Con ${n} tienes dos formas de ganar: ligar el as (top pair con kicker ${lo}) o ligar el color al as. Cuando liga solo el as, cuidado: contra rivales que pagan subidas de forma prudente, su as suele tener mejor kicker. El gran valor está en el proyecto de color al as (nut flush draw), que puedes jugar agresivo.</p>
  <ul><li><b>Proyecto de color al as:</b> apuesta o sube de semifarol; si ligas, tienes el mejor color.</li><li><b>Top pair kicker ${lo}:</b> bote pequeño o mediano.</li>${VAL(n[1]) <= 3 ? `<li><b>Rueda:</b> con ${lo} puedes ligar la escalera A-2-3-4-5 en mesas bajas.</li>` : ''}</ul>`;
    case 'axO': return `<p>${n} es una mano de “top pair con kicker malo”. Cuando sale un as, ganas a los rivales que no tienen as, pero pierdes contra los que tienen un as con mejor carta acompañante, y son justo los que pagan tus apuestas. Juega botes pequeños con top pair y retírate ante mucha acción.</p>
  <ul><li><b>Ligas el ${lo}</b> y no el as: pareja media sin garantías; bote pequeño.</li><li><b>Dobles parejas</b> (A-${lo}-x): mano fuerte, apuesta por valor.</li>${VAL(n[1]) <= 3 ? `<li><b>Rueda:</b> puedes ligar A-2-3-4-5 en mesas bajas.</li>` : ''}</ul>`;
    case 'conectadas': return `<p>${n} gana dinero con escaleras${suited(n) ? ', colores' : ''} y dobles parejas, no con una pareja. En el flop, busca proyectos: escalera abierta (8 outs)${suited(n) ? ', proyecto de color (9 outs) o las dos cosas a la vez (15 outs)' : ''}. Con proyectos fuertes, apuesta o sube de semifarol; sin nada, retírate sin miedo.</p>
  <div class="ex"><b>Ejemplo:</b> con ${n}, un flop ${drawFlop(n)} te da proyecto de escalera abierta: puedes apostar o pagar a buen precio. En un flop A-K-K sin nada, retírate a la primera apuesta.</div>
  <p>Cuando ligas pareja con la carta alta (${hi}) sin más, tienes una mano débil: bote pequeño.</p>`;
    case 'mismoPalo': return `<p>Con ${n} buscas color o dobles parejas. Top pair con kicker ${lo} gana botes pequeños pero pierde los grandes. Juega el flop según el proyecto: con cuatro cartas del palo (10,9% de los flops) tienes 9 outs y puedes apostar de semifarol; sin proyecto ni pareja, retírate.</p>
  <ul><li><b>Color hecho:</b> ${n[0] === 'K' || n[0] === 'Q' ? 'suele ser el mejor o casi' : `cuidado con colores más altos si la mesa trae cuatro del palo`}.</li><li><b>Pareja de ${hi}</b>: mano media; no la juegues por todo el stack.</li></ul>`;
    default: return `<p>${n} liga poco y, cuando liga, suele ser una pareja con kicker malo. Si la juegas (desde la ciega grande gratis o por un buen precio), busca <b>dobles parejas o trío</b>. Con top pair sola, juega un bote pequeño; si el rival apuesta en dos calles, retírate.</p>`;
  }
}
function mistakesHTML(n){
  const c = category(n);
  const M = {
    ases: ['Hacer limp o subir poco “para disimular”: entran más rivales y ganas menos veces.', 'No retirarse nunca: en una mesa con cuatro cartas a color y mucha acción, una pareja alta puede ir perdiendo.', 'Hacer slowplay en mesas con muchos proyectos: dejas ver cartas gratis que te ganan.'],
    parejaAlta: [`Ir all-in con ${n} en el flop con dos cartas más altas en la mesa.`, 'Pagar un 4-bet con 100 ciegas contra un jugador muy prudente: su rango es AA, KK, QQ y AK.', 'Pasar por miedo en mesas bajas: con overpair hay que apostar.'],
    parejaMedia: [`Pagar apuestas en tres calles con ${n} en mesas con cartas altas.`, 'Resubir contra aperturas de UTG con muchas ciegas: suele ser mejor pagar y buscar trío.', 'No apostar cuando ligas trío por miedo a que el rival se retire.'],
    parejaBaja: ['Pagar subidas grandes sin ciegas suficientes detrás para cobrar el trío (regla del 15 a 1).', 'Seguir con la pareja en el flop cuando no ha ligado y el rival apuesta.', 'Jugarla en torneo con pocas ciegas como si hubiera 100 ciegas.'],
    ak: ['Ir all-in en el flop con as alto sin haber ligado nada.', 'Pagar en lugar de resubir antes del flop: pierdes el valor de la mano.', 'Enamorarte de top pair en mesas con mucha acción en el turn y el river.'],
    broadway: [`Pagar un 3-bet con ${n}${suited(n) ? '' : ' de distinto palo'} contra un rival prudente: muchas veces estás dominada.`, 'Jugar top pair por todo el stack sin tener el mejor kicker.', 'Abrirla desde UTG en mesa llena con jugadores agresivos detrás.'],
    axS: ['Pensar que cualquier as es buena mano: con kicker bajo, ligar el as no basta.', 'Olvidar el potencial de color: con proyecto al as, sé agresivo.', 'Pagar subidas de jugadores prudentes fuera de posición.'],
    axO: ['Pagar subidas de jugadores prudentes “porque tengo un as”.', `Pagar tres calles con top pair y kicker ${shown(n[1])}.`, 'Abrirla desde las primeras posiciones.'],
    conectadas: ['Jugarla fuera de posición contra varias subidas.', 'Pagar con proyectos sin mirar el precio (pot odds).', 'Seguir con una pareja baja sin proyecto cuando el rival apuesta fuerte.'],
    mismoPalo: ['Jugarla solo porque es del mismo palo: el palo solo añade unos pocos puntos de equity.', 'Pagar con un proyecto de color bajo contra mucha acción.', 'Jugarla fuera de posición contra subidas.'],
    floja: ['Jugarla por aburrimiento: la paciencia gana más dinero que estas manos.', 'Pagar subidas desde la ciega pequeña.', 'Seguir con una pareja con kicker malo contra apuestas en varias calles.']
  };
  return `<ul>${M[c].map(t => `<li>${t}</li>`).join('')}</ul>`;
}
function handFaq(n, idx){
  const name = handName(n), eq = EQUITY[n], m = MATCHUPS[n], c = combos(n), vsAK = m.AKo !== undefined && !n.startsWith('AK');
  const vsTop = m.AA !== undefined ? ['AA', m.AA] : ['KK', m.KK];
  const every = Math.round(1326 / c * 10) / 10;
  const f = [
    [`¿Es buena mano ${n}?`, `${n} es la mano nº ${idx + 1} de las 169 manos iniciales y está en el ${pctES(topPct(n))}% de las mejores. Contra una mano al azar gana el ${pctES(eq)}% de las veces. ${verdict(n)}`],
    [`¿Cuánto gana ${n} contra ${vsTop[0]}?`, `Alrededor del ${pctES(vsTop[1])}% si llegáis al all-in antes del flop.`],
    [vsAK ? `¿${n} gana a AK?` : `¿Cuánto gana ${n} contra QQ?`, vsAK ? `Contra AK de distinto palo, ${n} gana el ${pctES(m.AKo)}% de las veces antes del flop, así que ${m.AKo > 52 ? 'es favorita' : m.AKo >= 48 ? 'es prácticamente una moneda al aire' : 'va por detrás'}.` : `Contra QQ gana alrededor del ${pctES(m.QQ)}% de las veces antes del flop.`],
    [`¿Cada cuántas manos te sale ${n}?`, `Hay ${c} combinaciones de ${name}, así que la recibes aproximadamente una vez cada ${pctES(every)} manos (${pctES(Math.round(c / 1326 * 10000) / 100)}%).`]
  ];
  return f;
}
function handPage(n, idx){
  const name = handName(n), eq = EQUITY[n], c = combos(n), cat = category(n);
  const rows = '<tr><th>Partida</th><th>Abrir desde</th><th>Ciega grande</th></tr>' + Object.entries(CHART_SETS).map(([k, v]) => {
    const { opens, bb } = openWhere(n, k);
    const where = opens.length ? opens.map(p => `<a href="/tablas/${k}/${slugPos(p)}/">${p}</a>`).join(', ') : 'Ninguna: tirar';
    return `<tr><td><a href="/tablas/${k}/">${v.name}</a></td><td class="${opens.length ? 'si' : ''}">${where}</td><td class="${bb ? 'si' : ''}"><a href="/tablas/${k}/bb/">${bb ? 'Defender' : 'Tirar'}</a></td></tr>`;
  }).join('');
  const prev = HAND_RANKING[idx - 1], next = HAND_RANKING[idx + 1];
  const twin = isPair(n) ? null : n.slice(0, 2) + (suited(n) ? 'o' : 's');
  const similar = HAND_RANKING.filter(h => h !== n && category(h) === cat).sort((a, b) => Math.abs(HAND_RANKING.indexOf(a) - idx) - Math.abs(HAND_RANKING.indexOf(b) - idx)).slice(0, 6);
  const pills = [prev && [prev, `← ${prev} (nº ${idx})`], next && [next, `${next} (nº ${idx + 2}) →`], twin && [twin, handLabel(twin)]].filter(Boolean)
    .concat(similar.filter(h => h !== prev && h !== next && h !== twin).map(h => [h, handLabel(h)]));
  const guides = GUIDE_BY_CAT[cat].map(s => GUIDES.find(g => g.slug === s));
  const title = isPair(n) ? `Cómo jugar ${n} (${name}) en póker` : `Cómo jugar ${shown(n[0])}${shown(n[1])} ${suited(n) ? 'del mismo palo' : 'de distinto palo'} (${n}) en póker`;
  return page({
    url: `/manos/${handSlug(n)}/`, title: `${title} | RÍO`,
    desc: `${n} es la mano nº ${idx + 1} de 169 y gana el ${pctES(eq)}% de las veces contra una mano al azar. ${verdict(n)} Desde qué posición jugarla, qué hacer si te suben y con qué frecuencia liga.`,
    crumbs: [['RÍO', '/'], ['Manos iniciales', '/manos/'], [n]],
    body: `  <h1>${title}</h1>
  <p class="lead"><b>Resumen:</b> ${verdict(n)}</p>
  <div class="stats"><div><b>nº ${idx + 1}</b>de 169 manos</div><div><b>top ${pctES(topPct(n))}%</b>de todas las manos</div><div><b>${pctES(eq)}%</b>gana contra una mano al azar</div><div><b>${c}</b>combinaciones (${pctES(Math.round(c / 1326 * 10000) / 100)}% de los repartos)</div></div>
  <h2>¿Es buena mano ${n}?</h2>
  <p>${categoryText(n)}</p>
  <p>Si juntas las mejores manos hasta ${n} incluida, suman el ${pctES(topPct(n))}% de todas las manos posibles: ${topPct(n) <= 9 ? 'entra en el rango de apertura de todas las posiciones.' : topPct(n) <= 19 ? 'entra en el rango de apertura de casi todas las posiciones.' : topPct(n) <= 45 ? 'entra en los rangos de las posiciones tardías, no en los de las primeras.' : 'queda fuera de los rangos de apertura normales.'}</p>
  <h2>¿Desde qué posición abrir ${n}?</h2>
  <p>Con ${name}, si nadie ha subido antes que tú:</p>
  <table class="tbl">${rows}</table>
  <p class="note">UTG = primero en hablar · BTN = botón · SB = ciega pequeña. En la ciega grande, “Defender” significa pagar o resubir cuando alguien sube. Tablas orientativas: con stacks cortos o rivales muy agresivos, los rangos cambian.</p>
  <h2>¿Qué hacer con ${n} si alguien sube antes?</h2>
  <p>${threeBetText(n)}</p>
  <h2>¿Cuántas veces liga ${n}?</h2>
  <table class="tbl">${postflopFacts(n).map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join('')}</table>
  <h2>${n} contra otras manos</h2>
  ${matchupHTML(n)}${HAND_EXTRA[n] ? `
  <h2>Lo que tienes que saber de ${n}</h2>
  ${HAND_EXTRA[n]}` : ''}
  <h2>Cómo jugar ${n} después del flop</h2>
  ${postflopHTML(n)}
  <h2>Errores típicos con ${n}</h2>
  ${mistakesHTML(n)}
  <h2>${n} en la tabla de manos</h2>
  ${gridHTML(new Set([n]), n)}
  <p class="note">Toca cualquier mano de la tabla para ver su página.</p>`,
    faq: handFaq(n, idx),
    related: `  <h2>Manos parecidas</h2><div class="pills">${pills.map(([h, l]) => `<a href="/manos/${handSlug(h)}/">${l}</a>`).join('')}</div>
  <h2>Guías útiles</h2><ul class="cards">${guides.map(g => `<li><a href="/guias/${g.slug}/">${g.title}</a></li>`).join('')}</ul>`
  });
}
{
  const top20 = HAND_RANKING.slice(0, 20).map(h => `<a href="/manos/${handSlug(h)}/">${h}</a>`).join('');
  write('manos/index.html', page({
    url: '/manos/', title: 'Las 169 manos iniciales del póker: cómo jugar cada una | RÍO',
    desc: 'Ranking de las 169 manos iniciales de Texas Hold’em con una página para cada una: equity, desde qué posición abrirla y qué hacer si te suben.',
    crumbs: [['RÍO', '/'], ['Manos iniciales']],
    body: `  <h1>Las 169 manos iniciales</h1>
  <p class="lead">Toca una mano para ver cómo jugarla: su puesto en el ranking, cuántas veces gana contra una mano al azar, desde qué posición abrirla y qué hacer si alguien sube.</p>
  ${gridHTML(new Set(HAND_RANKING.slice(0, 20)))}
  <p class="note">Diagonal = parejas · arriba a la derecha = mismo palo (s) · abajo a la izquierda = distinto palo (o). En rojo, las 20 mejores.</p>
  <h2>Las 20 mejores manos</h2><div class="pills">${top20}</div>
  <p>¿Buscas qué manos jugar según tu sitio en la mesa? Mira las <a href="/tablas/">tablas por posición</a>.</p>`
  }));
  urls.push('/manos/');
  HAND_RANKING.forEach((n, i) => { write(`manos/${handSlug(n)}/index.html`, handPage(n, i)); urls.push(`/manos/${handSlug(n)}/`); });
}

write('seo.css', CSS + '\n');
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${SITE}${u}</loc></url>`).join('\n')}
</urlset>
`);
write('robots.txt', `User-agent: *
Allow: /
Disallow: /api/

Sitemap: ${SITE}/sitemap.xml
`);

// Portada: canonical, og:url, imágenes y datos estructurados (SoftwareApplication + FAQ).
// Las preguntas del FAQ se leen del bloque visible «Preguntas frecuentes» de index.html,
// así lo que ve Google y lo que ve la gente es siempre lo mismo.
const indexFile = path.join(ROOT, 'index.html');
const indexHtml = fs.readFileSync(indexFile, 'utf8');
const text = h => h.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const faq = [...indexHtml.matchAll(/<details class="faq-item"><summary>([\s\S]*?)<\/summary><p>([\s\S]*?)<\/p><\/details>/g)]
  .map(([, q, a]) => ({ '@type': 'Question', name: text(q), acceptedAnswer: { '@type': 'Answer', text: text(a) } }));
if (faq.length < 3) throw new Error('No encuentro las preguntas frecuentes en index.html');
const desc = indexHtml.match(/<meta name="description" content="([^"]+)">/)[1];
const ld = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'SoftwareApplication', '@id': `${SITE}/#app`, name: 'RÍO', alternateName: 'RÍO · Calculadora y entrenador de póker',
      url: `${SITE}/`, description: desc, applicationCategory: 'GameApplication', applicationSubCategory: 'Calculadora de póker',
      operatingSystem: 'Web, Android, iOS', inLanguage: 'es', image: `${SITE}/og-image.png`,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' } },
    { '@type': 'FAQPage', '@id': `${SITE}/#faq`, inLanguage: 'es', mainEntity: faq }
  ]
};
const seoBlock = `<!-- SEO: lo escribe scripts/build-seo.js con la dirección de sitio.json. No lo edites a mano. -->
<link rel="canonical" href="${SITE}/">
<meta property="og:url" content="${SITE}/">
<meta property="og:image" content="${SITE}/og-image.png">
<meta name="twitter:image" content="${SITE}/og-image.png">
<script type="application/ld+json">
${JSON.stringify(ld).replace(/</g, '\\u003c')}
</script>
<!-- /SEO -->`;
const re = /<!-- SEO: [\s\S]*?<!-- \/SEO -->/;
if (!re.test(indexHtml)) throw new Error('Falta el bloque <!-- SEO: … <!-- /SEO --> en index.html');
fs.writeFileSync(indexFile, indexHtml.replace(re, seoBlock));

console.log(`${urls.length} URLs generadas`);
