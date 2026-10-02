// Formato concurso, versión 3D con el estilo de la mesa v2: ficha de póker gigante que gira en la intro, la pregunta en un panel
// de cristal inclinado, las respuestas son cartas que se dan la vuelta, en la tensión final las incorrectas se tapan una a una
// y la buena se levanta en verde con fichas cayendo. Mismos tiempos, voz y preguntas que video-concurso.js.
// Uso: desde generar.js ("concurso") o a mano: SNAP=1,4,8,12 node video-concurso2.js
const { grabar, FUENTES } = require('./motor.js');
const { pregunta } = require('./concurso-preguntas.js');
const { narracion, T } = require('./video-concurso.js');

const PALOS = { s: '♠', h: '♥', d: '♦', c: '♣' };
const limpio = s => String(s).replace(/[<>&]/g, '');
const resalta = (s, cls) => limpio(s).replace(/\*([^*]+)\*/g, `<span class="${cls}">$1</span>`);
const carta = c => { const r = c[0] === 'T' ? '10' : c[0], s = PALOS[c[1]], rojo = 'hd'.includes(c[1]);
  return `<div class="pc ${rojo ? 'red' : ''}"><div class="rk">${r}<i>${s}</i></div><div class="su">${s}</div></div>`; };

function pagina(p){
  const n = p.opts.length, letras = 'ABCD';
  const cartas = (p.cartas || []).map(carta).join('');
  return `<!doctype html><html><head><meta charset="utf-8">${FUENTES}<style>
*{box-sizing:border-box;margin:0}
html,body{width:1080px;height:1920px;overflow:hidden}
body{background:radial-gradient(1100px 820px at 50% -8%, rgba(232,40,63,.32), transparent 62%), radial-gradient(900px 700px at 50% 78%, rgba(232,40,63,.08), transparent 65%), #0A0A0B;color:#F5F2EC;font-family:'Space Grotesk',sans-serif}
em{font-style:normal;color:#E8283F}.y{color:#F2C14E}.g{color:#3DDC7A}
.beam{position:absolute;top:-260px;width:300px;height:2400px;background:linear-gradient(to bottom, rgba(255,120,130,.16), transparent 72%);transform-origin:50% 0;filter:blur(10px)}
#stage{position:absolute;inset:0;perspective:1800px;perspective-origin:50% 45%}
#cam{position:absolute;inset:0;transform-style:preserve-3d}
.brand{position:absolute;top:96px;left:0;right:0;display:flex;justify-content:center;align-items:center;gap:18px;font-family:'Bricolage Grotesque';font-weight:800;font-size:46px;z-index:10}
.brand i{font-style:normal;font-size:28px;font-weight:700;color:#E8283F;background:rgba(232,40,63,.14);border:2px solid rgba(232,40,63,.5);padding:8px 18px;border-radius:999px;letter-spacing:.06em;text-transform:uppercase}
#ladder{position:absolute;top:186px;left:0;right:0;display:flex;justify-content:center;gap:12px;z-index:10}
.lv{width:44px;height:44px;border-radius:50%;background:repeating-conic-gradient(#2a2a30 0 30deg,#3a3a42 30deg 45deg);box-shadow:inset 0 0 0 7px #1a1a1e;opacity:.55}
.lv.on{background:repeating-conic-gradient(#E8283F 0 30deg,#F5F2EC 30deg 45deg);box-shadow:inset 0 0 0 7px #b3162b,0 0 18px rgba(232,40,63,.6);opacity:1}
.lv.now{transform:scale(1.25)}
#nivel{position:absolute;top:248px;left:0;right:0;text-align:center;font-weight:700;font-size:30px;letter-spacing:.14em;color:rgba(245,242,236,.6);z-index:10}
#titulo{position:absolute;top:310px;left:50px;right:50px;text-align:center;font-family:'Bricolage Grotesque';font-weight:800;font-size:76px;line-height:1.08;z-index:10;text-shadow:0 6px 28px rgba(0,0,0,.9)}
/* Ficha gigante de la intro */
#chip{position:absolute;left:50%;top:620px;width:620px;height:620px;margin-left:-310px;transform-style:preserve-3d;z-index:8}
#chip .cara{position:absolute;inset:0;border-radius:50%;backface-visibility:hidden;background:repeating-conic-gradient(#E8283F 0 22.5deg,#F5F2EC 22.5deg 33.75deg,#E8283F 33.75deg 45deg);box-shadow:0 40px 120px rgba(0,0,0,.7),0 0 120px rgba(232,40,63,.45)}
#chip .cara:before{content:'';position:absolute;inset:62px;border-radius:50%;background:radial-gradient(circle at 50% 35%,#c81f36,#7d0d1d);box-shadow:inset 0 0 0 10px rgba(245,242,236,.85),inset 0 0 60px rgba(0,0,0,.5)}
#chip .cara:after{content:'';position:absolute;inset:96px;border-radius:50%;border:4px dashed rgba(245,242,236,.45)}
#chip .tx{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;z-index:2;font-family:'Bricolage Grotesque';font-weight:800;color:#fff;text-shadow:0 4px 18px rgba(0,0,0,.5)}
#chip .tx small{font-size:40px;letter-spacing:.12em;opacity:.85}#chip .tx b{font-size:84px;line-height:1;margin:8px 0}#chip .tx span{font-size:52px}
#chip .dorso{transform:rotateY(180deg)}
/* Pregunta */
#q{position:absolute;left:60px;right:60px;top:480px;padding:46px 50px;border-radius:40px;background:linear-gradient(160deg,rgba(38,38,44,.92),rgba(18,18,22,.94));border:2px solid rgba(245,242,236,.12);box-shadow:0 40px 100px rgba(0,0,0,.7),inset 0 1px 0 rgba(255,255,255,.08);transform-style:preserve-3d;z-index:6;text-align:center}
#q .tq{font-family:'Bricolage Grotesque';font-weight:700;font-size:62px;line-height:1.16}
#q .cards{display:flex;justify-content:center;gap:16px;margin-top:30px}
#q:before{content:'';position:absolute;left:40px;right:40px;top:0;height:3px;background:linear-gradient(90deg,transparent,#E8283F,transparent)}
.pc{position:relative;width:120px;height:168px;border-radius:16px;background:linear-gradient(180deg,#fff,#F3F2EE);color:#17171B;box-shadow:0 14px 30px rgba(0,0,0,.55)}
.pc.red{color:#D9304A}.pc .rk{position:absolute;top:10px;left:13px;font-family:'Bricolage Grotesque';font-weight:800;font-size:52px;line-height:.9}.pc .rk i{display:block;font-style:normal;font-size:30px;margin-top:4px}.pc .su{position:absolute;right:11px;bottom:6px;font-size:74px;line-height:1}
/* Respuestas: cartas que se dan la vuelta */
#opts{position:absolute;left:50px;right:50px;display:flex;flex-wrap:wrap;justify-content:center;gap:26px;z-index:6;perspective:1600px}
.op{position:relative;width:477px;height:330px;transform-style:preserve-3d}
.op .f,.op .b{position:absolute;inset:0;border-radius:30px;backface-visibility:hidden;overflow:hidden}
.op .f{background:linear-gradient(160deg,#24242a,#141417);border:2px solid rgba(245,242,236,.14);box-shadow:0 26px 60px rgba(0,0,0,.6);display:flex;flex-direction:column;justify-content:center;padding:26px 30px 26px 34px}
.op .f b{position:absolute;top:22px;left:26px;width:64px;height:64px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'Bricolage Grotesque';font-weight:800;font-size:38px;color:#fff;background:repeating-conic-gradient(#E8283F 0 30deg,#b3162b 30deg 45deg);box-shadow:inset 0 0 0 6px rgba(245,242,236,.85)}
.op .f span{font-weight:600;font-size:48px;line-height:1.15;margin-top:62px}
.op.corta .f{align-items:center}.op.corta .f span{font-family:'Bricolage Grotesque';font-weight:800;font-size:110px;margin-top:20px}
.op .b{transform:rotateY(180deg);background:linear-gradient(160deg,#E8283F,#9e1226);border:4px solid rgba(245,242,236,.9);box-shadow:0 26px 60px rgba(0,0,0,.6)}
.op .b:before{content:'';position:absolute;inset:12px;border-radius:20px;border:2px solid rgba(245,242,236,.35)}
.op .b:after{content:'RÍO';position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:'Bricolage Grotesque';font-weight:800;font-size:76px;color:rgba(245,242,236,.92);letter-spacing:.08em}
.op.ok .f{background:linear-gradient(160deg,#1f8f4e,#0f5e30);border-color:#7df0a9;box-shadow:0 0 0 4px rgba(61,220,122,.35),0 30px 90px rgba(61,220,122,.35)}
.op.ok .f b{background:repeating-conic-gradient(#3DDC7A 0 30deg,#1a9a4a 30deg 45deg)}
.op .sh{position:absolute;inset:-40%;background:linear-gradient(115deg,transparent 42%,rgba(255,255,255,.35) 50%,transparent 58%);transform:translateX(-130%);z-index:3}
/* Cuenta atrás */
#ring{position:absolute;left:50%;width:250px;height:250px;margin-left:-125px;z-index:9}
#ring svg{position:absolute;inset:0;transform:rotate(-90deg)}#ring circle{fill:rgba(10,10,11,.85);stroke-width:12}#ring .track{stroke:rgba(255,255,255,.14)}#ring .prog{fill:none;stroke:#E8283F;stroke-linecap:round;stroke-dasharray:553}
#ring .num{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:'Bricolage Grotesque';font-weight:800;font-size:130px;text-shadow:0 0 50px rgba(232,40,63,.8)}
#exp{position:absolute;left:70px;right:70px;z-index:9;border-radius:34px;background:rgba(14,40,26,.92);border:2px solid rgba(61,220,122,.6);padding:34px 40px;text-align:center;font-size:42px;line-height:1.3;box-shadow:0 30px 90px rgba(0,0,0,.7),0 0 60px rgba(61,220,122,.18)}
#exp .k{display:block;font-weight:700;font-size:28px;letter-spacing:.14em;color:#3DDC7A;margin-bottom:12px}
#rain{position:absolute;inset:0;z-index:8;pointer-events:none;perspective:1200px}
.fc{position:absolute;width:70px;height:70px;border-radius:50%;box-shadow:0 0 0 3px rgba(0,0,0,.25)}
#dim{position:absolute;inset:0;background:#000;opacity:0;z-index:5}
#fin{position:absolute;inset:0;z-index:20;background:radial-gradient(1100px 900px at 50% 0%, rgba(232,40,63,.35), transparent 60%),#0d0d10;display:flex;flex-direction:column;align-items:center;justify-content:center}
#fin .t{font-family:'Bricolage Grotesque';font-weight:800;font-size:100px}
#fin .s{font-size:54px;color:#c9c4bb;margin-top:22px}#fin .s b{color:#fff}
#fin .url{margin-top:52px;font-family:'Bricolage Grotesque';font-weight:800;font-size:72px;background:linear-gradient(90deg,#e8283f,#ff6a5a);padding:30px 58px;border-radius:30px;color:#fff;box-shadow:0 20px 70px rgba(232,40,63,.5)}
#fin .a{margin-top:34px;font-size:42px;color:#c9c4bb}#fin .f{position:absolute;bottom:160px;font-size:32px;color:#8f8a82}
#flash{position:absolute;inset:0;background:#fff;opacity:0;z-index:15}
.pbar{position:absolute;left:0;bottom:0;height:14px;background:linear-gradient(90deg,#e8283f,#ff6a5a);z-index:40}
</style></head><body>
${[0, 1, 2].map(i => `<div class="beam" id="be${i}" style="left:${140 + i * 300}px"></div>`).join('')}
<div class="brand">RÍO <i>¿Cuánto sabes?</i></div>
<div id="ladder">${Array.from({ length: 15 }, () => '<div class="lv"></div>').join('')}</div>
<div id="nivel"></div>
<div id="titulo"></div>
<div id="dim"></div>
<div id="stage"><div id="cam">
  <div id="chip"><div class="cara"><div class="tx"><small>RÍO</small><b>¿CUÁNTO<br>SABES?</b><span>de póker</span></div></div><div class="cara dorso"><div class="tx"><small>RÍO</small><b>¿CUÁNTO<br>SABES?</b><span>de póker</span></div></div></div>
  <div id="q"><div class="tq">${resalta(p.q, 'y')}</div>${cartas ? `<div class="cards">${cartas}</div>` : ''}</div>
  <div id="opts">${p.opts.map((o, i) => `<div class="op${String(o).length <= 8 ? ' corta' : ''}" id="o${i}"><div class="f"><b>${letras[i]}</b><span>${limpio(o)}</span><div class="sh"></div></div><div class="b"></div></div>`).join('')}</div>
</div></div>
<div id="ring"><svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="88" class="track"/><circle cx="100" cy="100" r="88" class="prog" id="prog"/></svg><div class="num" id="num">5</div></div>
<div id="exp"><span class="k">POR QUÉ</span>${resalta(p.why, 'g')}</div>
<div id="rain"></div>
<div id="flash"></div>
<div id="fin"><div class="t">¿Lo sabías?</div><div class="s">Aprende póker con <b>RÍO</b></div><div class="url">riopoker.es</div><div class="a">👆 enlace en la bio</div><div class="f">Herramienta de estudio · +18</div></div>
<div class="pbar" id="pbar"></div>
<script>
const P = ${JSON.stringify({ ok: p.ok, n, nivel: p.nivel, T, letra: letras[p.ok] })};
const cl = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x)), lerp = (a, b, k) => a + (b - a)*k;
const out = t => 1 - Math.pow(1 - t, 3), io = t => t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3)/2, back = t => { const a = 1.7, b = a + 1; return 1 + b*Math.pow(t - 1, 3) + a*Math.pow(t - 1, 2); };
const $ = id => document.getElementById(id);
const rnd = k => { const x = Math.sin(k*127.1 + 311.7)*43758.5453; return x - Math.floor(x); };
let G = {};
function setup(){
  // Posiciones: la pregunta arriba, las respuestas debajo, la cuenta atrás y la explicación al final
  const q = $('q'), o = $('opts'), alto = q.offsetHeight + 46 + o.offsetHeight + 50 + 250;
  q.style.top = Math.max(440, 430 + (1720 - 430 - alto)/2) + 'px';
  o.style.top = (q.offsetTop + q.offsetHeight + 46) + 'px';
  const ob = o.offsetTop + o.offsetHeight;
  $('ring').style.top = Math.min(1600, ob + 50) + 'px';
  $('exp').style.top = (ob + 40) + 'px';
  // Hacia dónde se mueve la respuesta buena al revelarla: al centro, encima de la explicación
  const ok = $('o' + P.ok), cx = o.offsetLeft + ok.offsetLeft + ok.offsetWidth/2, cy = o.offsetTop + ok.offsetTop + ok.offsetHeight/2;
  G = { dx: 540 - cx, dy: (o.offsetTop + o.offsetHeight/2) - cy };
  const r = $('rain'), cols = [['#E8283F', '#F5F2EC'], ['#F5F2EC', '#E8283F'], ['#17171B', '#E8283F'], ['#3DDC7A', '#F5F2EC']];
  for (let i = 0; i < 46; i++){ const d = document.createElement('div'), c = cols[i % 4]; d.className = 'fc';
    d.style.background = 'radial-gradient(circle,' + c[0] + ' 0 55%,transparent 56%),repeating-conic-gradient(' + c[0] + ' 0 30deg,' + c[1] + ' 30deg 45deg)'; r.appendChild(d); }
}
function render(t){
  const T = P.T, rev = t >= T.reveal;
  for (let i = 0; i < 3; i++) $('be' + i).style.transform = 'rotate(' + (-18 + i*18 + 8*Math.sin(t*.7 + i*1.9)) + 'deg)';
  // Escalera de niveles
  const nv = rev ? P.nivel + 1 : P.nivel;
  document.querySelectorAll('.lv').forEach((l, i) => { l.classList.toggle('on', i < nv); l.classList.toggle('now', i === nv - 1); });
  $('nivel').textContent = 'NIVEL ' + nv + ' DE 15';
  // Título
  let ti = '', at = 0;
  if (t >= T.q && t < T.cuenta){ ti = 'Pregunta del <em>nivel ' + P.nivel + '</em>'; at = T.q; }
  else if (t >= T.cuenta && t < T.resp){ ti = '¿Tú qué dices? <em>Comenta</em> 👇'; at = T.cuenta; }
  else if (t >= T.resp && t < T.reveal){ ti = 'La correcta es…'; at = T.resp; }
  else if (rev){ ti = '¡Es la <span class="g">' + P.letra + '</span>!'; at = T.reveal; }
  const tt = $('titulo'); tt.innerHTML = ti; const tp = back(cl((t - at)/.4)); tt.style.opacity = ti ? cl(tp*2) : 0; tt.style.transform = 'scale(' + (.8 + .2*tp) + ')';
  // Cámara: se acerca en la intro, empuja despacio durante la cuenta atrás y tiembla al revelar
  let s = 1, sx = 0, sy = 0;
  if (t < T.q) s = 1.06 - .06*io(cl(t/T.q));
  else if (t >= T.cuenta && t < T.reveal) s = 1 + .05*io(cl((t - T.cuenta)/(T.reveal - T.cuenta)));
  else if (rev) s = 1.05 - .05*out(cl((t - T.reveal)/.6));
  if (t >= T.reveal && t < T.reveal + .3){ const k = 1 - (t - T.reveal)/.3; sx = Math.sin(t*95)*12*k; sy = Math.cos(t*80)*8*k; }
  $('cam').style.transform = 'translate(' + sx + 'px,' + sy + 'px) scale(' + s + ')';
  // Ficha gigante: entra girando, se para de frente y sale volando hacia el fondo
  const ci = cl((t - T.intro)/1.1), co = cl((t - (T.introFin - .35))/.45);
  $('chip').style.display = t < T.introFin + .1 ? 'block' : 'none';
  $('chip').style.transform = 'translateZ(' + (-900*io(co)) + 'px) rotateX(' + (14*(1 - out(ci))) + 'deg) rotateY(' + (720*(1 - out(ci)) + 200*io(co)) + 'deg) scale(' + (.3 + .7*back(cl(ci*1.4))) + ')';
  $('chip').style.opacity = 1 - co;
  // Pregunta: panel de cristal que cae desde arriba y flota inclinado
  const pq = out(cl((t - T.q)/.6)), fl = Math.sin(t*1.4)*6;
  $('q').style.opacity = t < T.q ? 0 : cl(pq*1.5);
  $('q').style.transform = 'translateY(' + (-120*(1 - pq) + fl) + 'px) rotateX(' + (8 + 30*(1 - pq)) + 'deg) translateZ(' + (-200*(1 - pq)) + 'px)';
  // Respuestas: llegan boca abajo y se dan la vuelta; en la tensión, las malas se tapan una a una; la buena se levanta en verde
  let k = 0;
  for (let i = 0; i < P.n; i++){
    const el = $('o' + i), a = T.opt + i*.22, p = out(cl((t - a)/.45)), fl = io(cl((t - a - .25)/.4));
    let rotY = 180 - 180*fl, z = 0, sc = .7 + .3*p, op = t < a ? 0 : 1, dx = 0, dy = 0;
    if (i !== P.ok){ const tap = T.resp + .25 + (k++)*.35, m = io(cl((t - tap)/.35)); rotY += 180*m; if (rev){ const f = out(cl((t - T.reveal)/.4)); op = 1 - .85*f; sc *= 1 - .2*f; } }
    else { el.classList.toggle('ok', rev); if (rev){ const f = back(cl((t - T.reveal)/.5)), m = io(cl((t - T.reveal - .2)/.7)); z = 60*f; sc *= 1 + .06*f; dx = G.dx*m; dy = (G.dy - 40)*m; } }
    el.style.opacity = op; el.style.transform = 'translate(' + dx + 'px,' + (dy + 80*(1 - p)) + 'px) translateZ(' + z + 'px) rotateY(' + rotY + 'deg) scale(' + sc + ')';
    el.querySelector('.sh').style.transform = 'translateX(' + (-130 + 260*cl((t - a - .5)/.6)) + '%)';
  }
  // Cuenta atrás
  const cu = t >= T.cuenta && t < T.resp + .6;
  $('ring').style.display = cu ? 'block' : 'none';
  if (cu){ const q = cl((t - T.cuenta)/(T.resp - T.cuenta)), sec = Math.max(1, 5 - Math.floor(q*5));
    $('num').textContent = sec; $('prog').style.strokeDashoffset = 553*q;
    const pu = 1 + .08*Math.max(0, 1 - ((t - T.cuenta) % 1)*4); $('ring').style.transform = 'scale(' + pu*(t >= T.resp ? 1 - out(cl((t - T.resp)/.6)) : 1) + ')'; }
  $('dim').style.opacity = t >= T.resp && t < T.reveal ? .35*out(cl((t - T.resp)/.4)) : 0;
  // Explicación y lluvia de fichas
  const pe = out(cl((t - T.reveal - 1.2)/.5));
  $('exp').style.display = rev && t < T.fin ? 'block' : 'none'; $('exp').style.opacity = pe; $('exp').style.transform = 'translateY(' + (50*(1 - pe)) + 'px)';
  document.querySelectorAll('.fc').forEach((d, i) => { const u = t - T.reveal - rnd(i)*.4;
    if (u < 0 || t >= T.fin){ d.style.display = 'none'; return; } d.style.display = 'block';
    d.style.left = (rnd(i + 1)*1080 - 35 + Math.sin(u*2 + i)*40) + 'px'; d.style.top = (-120 + (500 + rnd(i + 2)*500)*u + 120*u*u) + 'px';
    d.style.transform = 'rotateX(' + (rnd(i + 3)*360 + u*(300 + rnd(i + 4)*500)) + 'deg) rotateY(' + (u*200) + 'deg) scale(' + (.6 + rnd(i + 5)*.7) + ')'; });
  $('flash').style.opacity = t >= T.reveal && t < T.reveal + .25 ? .6*(1 - (t - T.reveal)/.25) : 0;
  // Final
  const fe = out(cl((t - T.fin)/.4));
  $('fin').style.display = t >= T.fin ? 'flex' : 'none'; $('fin').style.opacity = fe;
  if (t >= T.fin) [['.t', .1], ['.s', .4], ['.url', .7], ['.a', 1], ['.f', 1.2]].forEach(([q, a]) => { const e = $('fin').querySelector(q), p = out(cl((t - T.fin - a)/.5)); e.style.opacity = p; e.style.transform = 'translateY(' + (50*(1 - p)) + 'px)'; });
  $('pbar').style.width = (100*t/T.total) + '%';
}
window.setup = setup; window.render = render;
</script></body></html>`;
}

// Sonidos: la ficha entra, las cartas se dan la vuelta, tic de la cuenta atrás, cada carta mala que se tapa, suspense y acierto.
function eventos(p){
  const e = [{ t: T.intro, tipo: 'whoosh' }, { t: T.introFin - .3, tipo: 'whoosh' }, { t: T.q, tipo: 'whoosh' }];
  for (let i = 0; i < p.opts.length; i++) e.push({ t: T.opt + i*.22 + .25, tipo: 'whoosh' });
  for (let i = 0; i < 5; i++) e.push({ t: T.cuenta + i, tipo: 'tick' });
  for (let i = 0; i < p.opts.length - 1; i++) e.push({ t: T.resp + .25 + i*.35, tipo: 'whoosh' });
  e.push({ t: T.resp, tipo: 'riser', dur: T.reveal - T.resp }, { t: T.reveal, tipo: 'ding' }, { t: T.reveal, tipo: 'pop' }, { t: T.fin, tipo: 'whoosh' });
  return e;
}

async function hacerConcurso({ p = pregunta(), id = 'concurso-' + Date.now().toString(36), snap } = {}){
  const f = await grabar({ html: pagina(p), nombre: id, total: T.total, eventos: eventos(p), snap, narracion: narracion(p) });
  if (f) console.log('LISTO ' + f + ' · concurso nivel ' + p.nivel);
  return { ok: true, id, archivo: f };
}

module.exports = { hacerConcurso, pagina };

if (require.main === module){
  const snap = (process.env.SNAP || '').split(',').filter(Boolean);
  hacerConcurso({ snap: snap.length ? snap : undefined }).catch(e => { console.error(e); process.exit(1); });
}
