// Formato «¿Quién sabe más de póker?»: concurso con niveles, 4 respuestas, cuenta atrás de 5 s, acierto con confeti y
// explicación. Se puede usar desde generar.js ("concurso") o a mano: node video-concurso.js [snap=1,5,9]
const { grabar, FUENTES } = require('./motor.js');
const { pregunta } = require('./concurso-preguntas.js');

const PALOS = { s: '♠', h: '♥', d: '♦', c: '♣' };
const limpio = s => String(s).replace(/[<>&]/g, '');
const resalta = (s, cls) => limpio(s).replace(/\*([^*]+)\*/g, `<span class="${cls}">$1</span>`);
const carta = c => { const r = c[0] === 'T' ? '10' : c[0], s = PALOS[c[1]], rojo = 'hd'.includes(c[1]); return `<div class="card ${rojo ? 'red' : ''}"><div class="rk">${r}<i>${s}</i></div><div class="su">${s}</div></div>`; };

// Tiempos del vídeo (segundos)
const T = { intro: 0.2, introFin: 2.2, q: 2.4, opt: 3.0, cuenta: 5.0, resp: 10.0, reveal: 11.4, fin: 15.6, total: 19.4 };

function pagina(p){
  const hayCartas = (p.cartas || []).length > 0;
  const n = p.opts.length, letras = 'ABCD';
  const alto = n === 4 ? 112 : 124, hueco = n === 4 ? 22 : 26;
  const yQ = hayCartas ? 930 : 800, hQ = 300;
  const yO = yQ + hQ + 60;
  const sel = (p.mesa || []).map(carta).join('');
  const html = `<!doctype html><html><head><meta charset="utf-8">${FUENTES}<style>
*{box-sizing:border-box;margin:0}
html,body{width:1080px;height:1920px;overflow:hidden}
body{background:#0b0a2a;color:#F5F2EC;font-family:'Space Grotesk',sans-serif;position:relative}
#bg{position:absolute;inset:0;background:radial-gradient(1000px 900px at 50% 28%, #5442d6 0%, #2a2090 38%, #0d0b34 80%)}
.beam{position:absolute;top:-200px;width:260px;height:2300px;background:linear-gradient(to bottom, rgba(190,170,255,.34), rgba(190,170,255,0) 78%);transform-origin:50% 0;filter:blur(6px)}
#tint{position:absolute;inset:0;background:radial-gradient(900px 900px at 50% 40%, rgba(255,60,80,.55), transparent 70%);opacity:0}
.top{position:absolute;top:70px;left:56px;right:56px;display:flex;justify-content:space-between;align-items:center;z-index:5}
#nivel{font-weight:700;font-size:34px;color:#e8c26a;letter-spacing:.04em}
#segs{display:flex;gap:7px}.seg{width:17px;height:36px;border-radius:5px;background:rgba(255,255,255,.14)}.seg.on{background:#e8c26a;box-shadow:0 0 14px rgba(232,194,106,.7)}
.titulo{position:absolute;top:175px;left:40px;right:40px;text-align:center;font-family:'Bricolage Grotesque';font-weight:800;font-size:68px;line-height:1.1;z-index:5}
.y{color:#ffd45e}.g{color:#4be08a}
#circ{position:absolute;left:50%;top:620px;width:640px;height:640px;margin:-0px 0 0 -320px;border-radius:50%;background:radial-gradient(circle at 50% 35%, #2b2a7a, #12104a);border:10px solid #f0c75a;box-shadow:0 0 90px rgba(255,208,90,.85), inset 0 0 70px rgba(0,0,0,.6);z-index:6}
#circ .txt{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;transform:rotate(-20deg);font-family:'Bricolage Grotesque';font-weight:800;font-size:66px;line-height:1.08;color:#ffd45e;padding:90px}
#circ .ic{position:absolute;left:50%;top:70px;margin-left:-70px;font-size:130px;transform:rotate(-14deg)}
#cards{position:absolute;left:0;right:0;top:700px;display:flex;justify-content:center;gap:20px;z-index:5}
.card{position:relative;width:150px;height:212px;border-radius:18px;background:#F5F2EC;color:#0A0A0B;box-shadow:0 12px 30px rgba(0,0,0,.55)}
.card.red{color:#E8283F}
.rk{position:absolute;top:12px;left:16px;font-family:'Bricolage Grotesque';font-weight:800;font-size:62px;line-height:.9}.rk i{display:block;font-style:normal;font-size:36px;margin-top:4px}
.su{position:absolute;right:14px;bottom:8px;font-size:90px;line-height:1}
.hex{position:absolute;left:70px;right:70px;clip-path:polygon(3.5% 0,96.5% 0,100% 50%,96.5% 100%,3.5% 100%,0 50%);background:linear-gradient(90deg,#f6d36e,#c58c1f 50%,#f6d36e)}
.hex .in{position:absolute;inset:5px;clip-path:polygon(3.5% 0,96.5% 0,100% 50%,96.5% 100%,3.5% 100%,0 50%);background:linear-gradient(180deg,#26258a,#0e0d45);display:flex;align-items:center}
#q{top:${yQ}px;height:${hQ}px;z-index:5}
#q .in{justify-content:center;text-align:center;padding:0 90px;font-weight:600;font-size:48px;line-height:1.22}
.opt{height:${alto}px;z-index:5}
.opt .in{padding:0 70px;font-weight:600;font-size:54px;gap:24px}
.opt b{color:#ffd45e;font-family:'Bricolage Grotesque';font-weight:800;min-width:60px}
.opt.ok{background:linear-gradient(90deg,#7df0a9,#1c9d55 50%,#7df0a9)}
.opt.ok .in{background:linear-gradient(180deg,#34d77a,#0f8a45)}.opt.ok b{color:#fff}
.opt.dim{opacity:.32}.opt.dim .in span{text-decoration:line-through}
.shine{position:absolute;inset:0;background:linear-gradient(115deg,transparent 40%,rgba(255,255,255,.55) 50%,transparent 60%);transform:translateX(-130%)}
#ring{position:absolute;left:50%;top:380px;width:300px;height:300px;margin-left:-150px;z-index:6}
#ring svg{position:absolute;inset:0;transform:rotate(-90deg)}#ring circle{fill:rgba(8,6,40,.8);stroke-width:12}#ring .track{stroke:rgba(255,255,255,.18)}#ring .prog{fill:none;stroke-linecap:round;stroke-dasharray:553}
#ring .num{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:'Bricolage Grotesque';font-weight:800;font-size:150px}
#exp{position:absolute;left:70px;right:70px;top:360px;z-index:6;border:3px solid #4be08a;border-radius:34px;background:rgba(10,40,40,.82);padding:34px 38px;text-align:center;font-size:44px;line-height:1.28;box-shadow:0 0 50px rgba(75,224,138,.25)}
#conf{position:absolute;inset:0;z-index:7;pointer-events:none;overflow:hidden}
.cf{position:absolute;width:16px;height:26px;border-radius:3px}
#fin{position:absolute;inset:0;z-index:20;background:radial-gradient(1000px 800px at 50% 0%, rgba(232,40,63,.4), transparent 60%),#0d0d10;display:flex;flex-direction:column;align-items:center;justify-content:center}
#fin .t{font-family:'Bricolage Grotesque';font-weight:800;font-size:110px}
#fin .s{font-size:56px;color:#c9c4bb;margin-top:24px}#fin .s b{color:#fff}
#fin .url{margin-top:56px;font-family:'Bricolage Grotesque';font-weight:800;font-size:76px;background:linear-gradient(90deg,#e8283f,#ff6a5a);padding:32px 62px;border-radius:30px;color:#fff;box-shadow:0 20px 70px rgba(232,40,63,.5)}
#fin .a{margin-top:36px;font-size:44px;color:#c9c4bb}#fin .f{position:absolute;bottom:150px;font-size:32px;color:#8f8a82}
.pbar{position:absolute;left:0;bottom:0;height:14px;background:linear-gradient(90deg,#e8283f,#ff6a5a);z-index:40}
</style></head><body>
<div id="bg"></div>
${[0, 1, 2, 3, 4].map(i => `<div class="beam" id="b${i}" style="left:${70 + i * 200}px"></div>`).join('')}
<div id="tint"></div>
<div class="top"><div id="nivel"></div><div id="segs">${Array.from({ length: 15 }, () => '<div class="seg"></div>').join('')}</div></div>
<div class="titulo" id="titulo"></div>
<div id="circ"><div class="ic">🃏</div><div class="txt">¿QUIÉN SABE MÁS DE POKER?</div></div>
<div id="ring"><svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="88" class="track"/><circle cx="100" cy="100" r="88" class="prog" id="prog"/></svg><div class="num" id="num">5</div></div>
<div id="exp">${resalta(p.why, 'g')}</div>
<div id="cards">${(p.cartas || []).map(carta).join('')}</div>
<div class="hex" id="q"><div class="in"><div>${resalta(p.q, 'y')}</div></div><div class="shine"></div></div>
${p.opts.map((o, i) => `<div class="hex opt" id="o${i}" style="top:${yO + i * (alto + hueco)}px"><div class="in"><b>${letras[i]}:</b><span>${limpio(o)}</span></div><div class="shine"></div></div>`).join('')}
<div id="conf"></div>
<div id="fin"><div class="t">¿Lo sabías? 🤔</div><div class="s">Aprende poker con <b>RÍO</b></div><div class="url">riopoker.es</div><div class="a">👆 enlace en la bio</div><div class="f">Herramienta de estudio · +18</div></div>
<div class="pbar" id="pbar"></div>
<script>
const P = ${JSON.stringify({ ok: p.ok, n, nivel: p.nivel, T, letra: letras[p.ok] })};
const cl = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x)), lerp = (a, b, k) => a + (b - a) * k;
const out = t => 1 - Math.pow(1 - t, 3), back = t => { const a = 1.8, b = a + 1; return 1 + b * Math.pow(t - 1, 3) + a * Math.pow(t - 1, 2); };
const $ = id => document.getElementById(id);
function rng(seed){ return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const CF = (() => { const r = rng(42), cols = ['#ff4d6d', '#ffd45e', '#4be08a', '#59c3ff', '#ffffff', '#c084fc']; return Array.from({ length: 90 }, () => ({ x: r() * 1080, y0: -80 - r() * 500, v: 380 + r() * 380, w: (r() - .5) * 240, rot: r() * 360, vr: (r() - .5) * 900, c: cols[Math.floor(r() * cols.length)], d: r() * .5 })); })();
function setup(){
  const c = $('conf'); CF.forEach(p => { const d = document.createElement('div'); d.className = 'cf'; d.style.background = p.c; c.appendChild(d); p.el = d; });
  document.querySelectorAll('.seg').forEach((s, i) => s.classList.toggle('on', i < P.nivel));
}
function render(t){
  const T = P.T, ok = t >= T.reveal && t < T.fin;
  // focos de luz que se mueven despacio
  for (let i = 0; i < 5; i++) $('b' + i).style.transform = 'rotate(' + (-26 + i * 13 + 9 * Math.sin(t * .8 + i * 1.7)) + 'deg)';
  // cabecera
  $('nivel').textContent = 'NIVEL ' + (t >= T.reveal ? P.nivel + 1 : P.nivel) + ' / 15' + (t >= T.reveal ? ' ✅' : '');
  document.querySelectorAll('.seg').forEach((s, i) => s.classList.toggle('on', i < (t >= T.reveal ? P.nivel + 1 : P.nivel)));
  // título
  let titulo = 'Pregunta para el <span class="y">nivel ' + P.nivel + '</span>…';
  if (t >= T.cuenta && t < T.resp) titulo = '¿Tú qué dices? <span class="y">Comenta</span> 👇';
  else if (t >= T.resp && t < T.reveal) titulo = 'La respuesta correcta es… 😬';
  else if (t >= T.reveal) titulo = '¡Es la <span class="y">' + P.letra + '</span>! 🎉';
  $('titulo').innerHTML = titulo;
  const ti = back(cl((t - (t >= T.reveal ? T.reveal : t >= T.resp ? T.resp : t >= T.cuenta ? T.cuenta : 0.1)) / .4));
  $('titulo').style.opacity = cl(ti * 2); $('titulo').style.transform = 'scale(' + (0.85 + 0.15 * ti) + ')';
  // círculo de introducción
  const ci = back(cl((t - T.intro) / .6)), co = cl((t - (T.introFin - .4)) / .4);
  $('circ').style.display = t >= T.intro && t < T.introFin ? 'block' : 'none';
  $('circ').style.transform = 'scale(' + ((.2 + .8 * ci) * (1 - .92 * out(co))) + ')'; $('circ').style.opacity = 1 - co * .6;
  // pregunta, cartas y opciones
  const pq = out(cl((t - T.q) / .5));
  $('q').style.opacity = pq; $('q').style.transform = 'translateY(' + (60 * (1 - pq)) + 'px)';
  $('cards').style.opacity = pq; $('cards').style.transform = 'translateY(' + (40 * (1 - pq)) + 'px)';
  for (let i = 0; i < P.n; i++){
    const el = $('o' + i), a = T.opt + i * .2, p = out(cl((t - a) / .45));
    el.style.opacity = t < a ? 0 : (ok && i !== P.ok ? .32 : 1);
    el.style.transform = 'translateX(' + (-120 * (1 - p)) + 'px)';
    el.classList.toggle('ok', ok && i === P.ok); el.classList.toggle('dim', ok && i !== P.ok);
    const sh = el.querySelector('.shine'); const k = cl((t - a - .3) / .7); sh.style.transform = 'translateX(' + (-130 + 260 * k) + '%)';
  }
  const sh = $('q').querySelector('.shine'); sh.style.transform = 'translateX(' + (-130 + 260 * cl((t - T.q - .3) / .8)) + '%)';
  // cuenta atrás
  const cu = t >= T.cuenta && t < T.resp + 1.0;
  $('ring').style.display = cu && t < T.reveal ? 'block' : 'none';
  if (cu){
    const k = cl((t - T.cuenta) / (T.resp - T.cuenta)), sec = Math.max(1, 5 - Math.floor(k * 5));
    $('num').textContent = t >= T.resp ? '1' : sec; $('prog').style.strokeDashoffset = 553 * cl(k);
    const rojo = sec <= 3; $('prog').style.stroke = rojo ? '#ff4d6d' : '#ffd45e'; $('num').style.color = rojo ? '#ff6b81' : '#ffd45e';
    const pulso = 1 + .06 * Math.max(0, 1 - ((t - T.cuenta) % 1) * 4); $('ring').style.transform = 'scale(' + pulso + ')';
  }
  $('tint').style.opacity = t >= T.cuenta + 2 && t < T.reveal ? .35 + .15 * Math.sin(t * 6) : 0;
  // explicación y confeti
  const pe = out(cl((t - T.reveal - .3) / .5));
  $('exp').style.display = ok ? 'block' : 'none'; $('exp').style.opacity = pe; $('exp').style.transform = 'translateY(' + (40 * (1 - pe)) + 'px)';
  CF.forEach(c => { const u = t - T.reveal - c.d; if (u < 0 || t >= T.fin){ c.el.style.display = 'none'; return; }
    c.el.style.display = 'block'; c.el.style.left = (c.x + c.w * u) + 'px'; c.el.style.top = (c.y0 + 700 + c.v * u * .8 + 90 * u * u) + 'px'; c.el.style.transform = 'rotate(' + (c.rot + c.vr * u) + 'deg)'; });
  // pantalla final
  const fe = out(cl((t - T.fin) / .4));
  $('fin').style.display = t >= T.fin ? 'flex' : 'none'; $('fin').style.opacity = fe;
  if (t >= T.fin){ [['.t', .1], ['.s', .4], ['.url', .7], ['.a', 1], ['.f', 1.2]].forEach(([q, a]) => { const e = $('fin').querySelector(q), p = out(cl((t - T.fin - a) / .5)); e.style.opacity = p; e.style.transform = 'translateY(' + (50 * (1 - p)) + 'px)'; }); }
  $('pbar').style.width = (100 * t / T.total) + '%';
}
window.setup = setup; window.render = render;
</script></body></html>`;
  return html;
}

// Lo que dice la voz y cuándo (ver video-lista.js). Las opciones se leen con su letra y la cuenta atrás va sin voz.
// Si la pregunta con sus 4 opciones es muy larga, la voz solo lee la pregunta (las opciones se ven en pantalla): así no hay pausas largas.
// La voz es corta para que el vídeo no se pare: lee solo la pregunta (las opciones se ven en pantalla; sigue hablando mientras
// corre la cuenta atrás) y da el resultado con una explicación de una frase breve, o sin ella si no cabe.
const corta = s => { const f = (s.match(/^.+?[.!?](\s|$)/) || [s])[0].trim(); return f.length <= 60 ? f : ''; };
function narracion(p){
  const L = 'ABCD';
  return [
    { id: 'intro', texto: `${require('./voz.js').gancho('concurso')} Nivel ${p.nivel}.`, en: T.intro + 0.1, limite: T.q },
    { id: 'pregunta', texto: p.q, en: T.q + 0.25, limite: T.resp },
    { id: 'revelacion', texto: `¡Es la ${L[p.ok]}! ${corta(p.why)}`.trim(), en: T.reveal + 0.2, limite: T.fin },
    { id: 'cta', texto: require('./voz.js').CTA, en: T.fin + 0.4, limite: T.total },
  ];
}

// Sonidos: whoosh de entrada, tic de la cuenta atrás, suspense, ding + pop al acertar.
function eventos(){
  const e = [{ t: T.intro, tipo: 'whoosh' }, { t: T.q, tipo: 'whoosh' }];
  for (let i = 0; i < 4; i++) e.push({ t: T.opt + i * .2, tipo: 'whoosh' });
  for (let i = 0; i < 5; i++) e.push({ t: T.cuenta + i, tipo: 'tick' });
  e.push({ t: T.resp, tipo: 'riser', dur: T.reveal - T.resp }, { t: T.reveal, tipo: 'ding' }, { t: T.reveal, tipo: 'pop' }, { t: T.fin, tipo: 'whoosh' });
  return e;
}

// Hace un vídeo concurso. p: pregunta (si no se da, al azar). snap: instantes de los que sacar captura (para revisar el diseño).
async function hacerConcurso({ p = pregunta(), id = 'concurso-' + Date.now().toString(36), snap } = {}){
  const f = await grabar({ html: pagina(p), nombre: id, total: T.total, eventos: eventos(), snap, narracion: narracion(p) });
  if (f) console.log('LISTO ' + f + ' · concurso nivel ' + p.nivel);
  return { ok: true, id, archivo: f };
}

module.exports = { hacerConcurso, pagina, narracion, T };

if (require.main === module){
  const snap = (process.env.SNAP || '').split(',').filter(Boolean);
  hacerConcurso({ snap: snap.length ? snap : undefined }).catch(e => { console.error(e); process.exit(1); });
}
